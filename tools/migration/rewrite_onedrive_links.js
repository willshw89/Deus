#!/usr/bin/env node
"use strict";

/**
 * tools/migration/rewrite_onedrive_links.js
 *
 * LANE-F (DEUS Directive 001 / 001-C): prepares the removal of hardcoded absolute
 * OneDrive paths (file:///c:/Users/snewt/OneDrive/Desktop/UF/... and the Windows
 * path variants) before the repository moves off OneDrive.
 *
 * Usage:
 *   node tools/migration/rewrite_onedrive_links.js --dry-run [--root <dir>] [--out-dir <dir>]
 *       Scans tracked .md/.js/.json files and writes, without touching any scanned file:
 *         <out-dir>/onedrive_links_inventory.md   every occurrence and its disposition
 *         <out-dir>/onedrive_links_rewrite.diff   git patch with the REWRITE dispositions
 *       <out-dir> defaults to <root>/docs/migration.
 *   node tools/migration/rewrite_onedrive_links.js --check [--root <dir>]
 *       Writes nothing. Exits 1 if any occurrence that should have been rewritten remains.
 *
 * There is deliberately no in-place write mode. At the migration freeze point, re-run
 * --dry-run on the frozen tree, review the diff, then `git apply` it.
 *
 * Dispositions:
 *   REWRITE  A link or repo sub-path in live markdown: becomes a portable relative path.
 *            file:/// links -> relative to the linking document (so the link resolves);
 *            Windows paths  -> relative to the repository root (the docs' `docs/X.md` convention).
 *   MANUAL   Needs a human decision: bare repo-root declarations ("canonical working copy is ..."),
 *            paths in code or data, autolinks, links in generators whose output is unknown.
 *   KEEP     Verbatim material that must not be edited: fenced code blocks and pasted
 *            transcript blocks (captured output, stack traces, prompt text), docs/archive/,
 *            and paths to tool state outside the repo.
 *   INFO     The word "OneDrive" in prose, not a path.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const IN_SCOPE_EXT = new Set([".md", ".js", ".json"]);
const BINARY_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".ogg", ".m4a", ".wav", ".efkefc", ".efkmodel",
    ".woff", ".woff2", ".ttf", ".otf", ".rmmzsave", ".exe", ".dll", ".zip", ".wasm", ".pdf"]);
// This tool's source, outputs and task notes contain the pattern on purpose.
const EXCLUDED_PREFIXES = ["docs/migration/", "tools/migration/", "tasks/lane-f/"];
// Historical records: their paths describe where work happened at the time.
const HISTORICAL_PREFIXES = ["docs/archive/"];
// Markdown emitted by a generator: links in the template resolve from the generated doc.
const GENERATED_DOCS = {
    "tools/build_srd_character_presentation.js": "docs/art/SRD_CHARACTER_PRESENTATION_CROSSWALK.md",
};
const CONTEXT_LINES = 3;

// \\ (JSON-escaped), \ or / between segments.
const SEP = String.raw`(?:\\\\|\\|/)`;
const ROOT_END = String.raw`(?![A-Za-z0-9_-]|\.[A-Za-z0-9])`;
const SUBPATH = String.raw`((?:${SEP}[^\s)\]>"'\`|<]*)?)`;
const FILE_URI_RE = new RegExp(String.raw`file:///[a-z]:/Users/snewt/OneDrive/Desktop/UF${ROOT_END}((?:/[^\s)\]>"'\`|<]*)?)`, "gi");
const WIN_PATH_RE = new RegExp(String.raw`(?<![A-Za-z0-9_/\\])[a-z]:${SEP}Users${SEP}snewt${SEP}OneDrive${SEP}Desktop${SEP}UF${ROOT_END}${SUBPATH}`, "gi");
// Directory names other tools derive from the old working path (Claude/Grok session stores).
const SLUG_RE = /c--Users-snewt-OneDrive-Desktop-UF|C%3A%5CUsers%5Csnewt%5COneDrive%5CDesktop%5CUF/gi;
const WORD_RE = /onedrive/gi;

function parseArgs(argv) {
    const opts = { dryRun: false, check: false, root: path.resolve(__dirname, "..", ".."), outDir: null };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--dry-run") opts.dryRun = true;
        else if (a === "--check") opts.check = true;
        else if (a === "--root") opts.root = path.resolve(argv[++i]);
        else if (a === "--out-dir") opts.outDir = path.resolve(argv[++i]);
        else if (a === "--help" || a === "-h") opts.help = true;
        else throw new Error(`Unknown argument: ${a}`);
    }
    if (!opts.outDir) opts.outDir = path.join(opts.root, "docs", "migration");
    return opts;
}

function git(root, args) {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}

function trackedFiles(root) {
    const modes = new Map();
    for (const rec of git(root, ["ls-files", "-s", "-z"]).split("\0")) {
        const m = rec.match(/^(\d+) [0-9a-f]+ \d+\t(.+)$/);
        if (m) modes.set(m[2], m[1]);
    }
    return modes;
}

function blobSha(buf) {
    return crypto.createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
}

// Lines inside fenced code blocks or pasted transcript blocks (<USER_REQUEST> ... </USER_REQUEST>).
function verbatimLines(lines) {
    const verbatim = new Array(lines.length).fill(false);
    let fence = null;
    const tags = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (fence) {
            verbatim[i] = true;
            const close = line.match(/^\s*(`{3,}|~{3,})\s*$/);
            if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null;
            continue;
        }
        const open = line.match(/^\s*(`{3,}|~{3,})/);
        if (open) { fence = open[1]; verbatim[i] = true; continue; }
        const tagOpen = line.match(/^\s*<([A-Z][A-Z0-9_]+)>\s*$/);
        const tagClose = line.match(/^\s*<\/([A-Z][A-Z0-9_]+)>\s*$/);
        if (tagOpen) tags.push(tagOpen[1]);
        verbatim[i] = tags.length > 0;
        if (tagClose && tags[tags.length - 1] === tagClose[1]) tags.pop();
    }
    return { verbatim, unclosedFence: fence !== null, unclosedTags: tags.slice() };
}

function toRepoPath(subpath) {
    return subpath.replace(/\\\\/g, "/").replace(/\\/g, "/").replace(/^\/+/, "");
}

function globToRegExp(glob) {
    return new RegExp("^" + glob.split("*").map(s => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*") + "$");
}

function targetStatus(target, tracked) {
    if (!target) return "root";
    const clean = target.replace(/\/+$/, "");
    if (clean.includes("*")) {
        const re = globToRegExp(clean);
        for (const f of tracked.keys()) if (re.test(f)) return "glob";
        return "MISSING";
    }
    if (tracked.has(clean)) return "file";
    for (const f of tracked.keys()) if (f.startsWith(clean + "/")) return "dir";
    return "MISSING";
}

// Finds every occurrence in one line. Returns [{kind, start, end, text, subpath, suffix}].
function findInLine(line) {
    const found = [];
    const covered = (s, e) => found.some(f => s < f.end && e > f.start);
    for (const m of line.matchAll(FILE_URI_RE)) {
        const { subpath, suffix, text } = trimSubpath(m[0], m[1] || "");
        found.push({ kind: "FILE_URI", start: m.index, end: m.index + text.length, text, subpath, suffix });
    }
    for (const m of line.matchAll(WIN_PATH_RE)) {
        if (covered(m.index, m.index + m[0].length)) continue;
        const { subpath, suffix, text } = trimSubpath(m[0], m[1] || "");
        found.push({ kind: "WIN_PATH", start: m.index, end: m.index + text.length, text, subpath, suffix });
    }
    for (const m of line.matchAll(SLUG_RE)) {
        if (covered(m.index, m.index + m[0].length)) continue;
        found.push({ kind: "TOOL_SLUG", start: m.index, end: m.index + m[0].length, text: m[0], subpath: "", suffix: "" });
    }
    for (const m of line.matchAll(WORD_RE)) {
        if (covered(m.index, m.index + m[0].length)) continue;
        found.push({ kind: "WORD", start: m.index, end: m.index + m[0].length, text: m[0], subpath: "", suffix: "" });
    }
    return found.sort((a, b) => a.start - b.start);
}

// Splits ":line:col" off a stack-trace path and drops sentence punctuation from the match.
function trimSubpath(full, subpath) {
    let text = full;
    const punct = subpath.match(/[.,;:]+$/);
    if (punct && !/(:\d+)+[.,;:]*$/.test(subpath)) {
        subpath = subpath.slice(0, -punct[0].length);
        text = text.slice(0, -punct[0].length);
    }
    let suffix = "";
    const lc = subpath.match(/(?::\d+)+([.,;:]*)$/);
    if (lc) {
        suffix = lc[0].slice(0, lc[0].length - lc[1].length);
        text = text.slice(0, text.length - lc[1].length);
        subpath = subpath.slice(0, -lc[0].length);
    }
    return { subpath, suffix, text };
}

function classify(occ, ctx) {
    const { rel, ext, verbatim, line } = ctx;
    const inScope = IN_SCOPE_EXT.has(ext);
    if (!inScope) return { disposition: "OUT_OF_SCOPE", reason: `${ext || "(no extension)"} file: outside the .md/.js/.json scope of LANE-F` };
    if (occ.kind === "WORD") return { disposition: "INFO", reason: "prose mention, not a path" };
    if (occ.kind === "TOOL_SLUG") {
        return ext === ".js"
            ? { disposition: "MANUAL", reason: "code derives an external session-store directory from the old working path; derive it from the current path instead" }
            : { disposition: "KEEP", reason: "path to tool state outside the repository; not a repo path" };
    }
    const historical = HISTORICAL_PREFIXES.some(p => rel.startsWith(p));
    const target = occ.kind === "FILE_URI" ? occ.subpath.replace(/^\/+/, "").replace(/[#?].*$/, "") : toRepoPath(occ.subpath);
    const isRoot = target === "";
    if (historical) return { disposition: "KEEP", reason: "historical record (docs/archive/)" };
    if (isRoot) {
        const mentionsNew = /C:[\\/]Dev[\\/]DEUS/i.test(line);
        return {
            disposition: "MANUAL",
            reason: mentionsNew
                ? "repo-root path on a line that also names C:\\Dev\\DEUS: keep if it describes the move itself; drop the OneDrive root if it lists both as valid"
                : "repo-root declaration (where the canonical copy lives): no relative form; needs new wording or the post-migration root",
        };
    }
    if (ext === ".md" && verbatim) {
        return { disposition: "KEEP", reason: "inside a fenced code block or pasted transcript block (captured output or quoted text)" };
    }
    if (occ.kind === "FILE_URI") {
        const before = line.slice(0, occ.start);
        if (before.endsWith("<")) return { disposition: "MANUAL", reason: "autolink <file:///...>: a relative path is not an autolink; rewrite as [text](path)" };
        if (ext === ".md") return { disposition: "REWRITE", target, base: rel };
        if (ext === ".js" && GENERATED_DOCS[rel]) {
            const out = GENERATED_DOCS[rel];
            if (ctx.source.includes(path.posix.basename(out))) return { disposition: "REWRITE", target, base: out };
            return { disposition: "MANUAL", reason: `generator no longer names ${out}; check where its markdown is written` };
        }
        return { disposition: "MANUAL", reason: `${ext} file: link target resolution depends on how the file is used` };
    }
    // WIN_PATH with a sub-path
    if (ext === ".md") return { disposition: "REWRITE", target, base: null };
    return { disposition: "MANUAL", reason: ext === ".json"
        ? "JSON data: change it at the producer or regenerate after the move"
        : "code path: needs a code change (derive from __dirname / repo root) and a test" };
}

function replacementFor(occ, cls) {
    if (occ.kind === "FILE_URI") {
        const tail = occ.subpath.replace(/^\/+/, "");
        const hashAt = tail.search(/[#?]/);
        const frag = hashAt >= 0 ? tail.slice(hashAt) : "";
        // Anchored at "/" so the result never depends on process.cwd().
        let rel = path.posix.relative("/" + path.posix.dirname(cls.base), "/" + cls.target.replace(/\/+$/, "")) || ".";
        if (/\/$/.test(cls.target) && rel !== ".") rel += "/";
        return rel + frag + occ.suffix;
    }
    return cls.target + occ.suffix;
}

function scan(root) {
    const tracked = trackedFiles(root);
    const files = [];
    for (const rel of [...tracked.keys()].sort()) {
        if (EXCLUDED_PREFIXES.some(p => rel.startsWith(p))) continue;
        const ext = path.posix.extname(rel).toLowerCase();
        if (BINARY_EXT.has(ext)) continue;
        const abs = path.join(root, rel);
        let buf;
        try { buf = fs.readFileSync(abs); } catch (e) { continue; } // deleted in the working tree
        if (buf.includes(0)) continue;
        const source = buf.toString("utf8");
        if (!/onedrive/i.test(source)) continue;
        const endsWithNewline = source.endsWith("\n");
        const lines = source.split("\n");
        if (endsWithNewline) lines.pop();
        const regions = ext === ".md" ? verbatimLines(lines) : { verbatim: [], unclosedFence: false, unclosedTags: [] };
        const occurrences = [];
        lines.forEach((line, i) => {
            for (const occ of findInLine(line)) {
                const cls = classify(occ, { rel, ext, verbatim: !!regions.verbatim[i], line, source });
                const o = { ...occ, file: rel, ext, line: i + 1, ...cls };
                if (cls.disposition === "REWRITE") {
                    o.replacement = replacementFor(occ, cls);
                    o.exists = targetStatus(cls.target, tracked);
                } else if (occ.kind === "FILE_URI" || occ.kind === "WIN_PATH") {
                    const t = occ.kind === "FILE_URI" ? occ.subpath.replace(/^\/+/, "").replace(/[#?].*$/, "") : toRepoPath(occ.subpath);
                    o.target = t;
                    o.exists = targetStatus(t, tracked);
                }
                occurrences.push(o);
            }
        });
        files.push({ rel, ext, buf, lines, endsWithNewline, mode: tracked.get(rel), occurrences,
            unclosedFence: regions.unclosedFence, unclosedTags: regions.unclosedTags });
    }
    return { tracked, files };
}

function rewriteFile(file) {
    const newLines = file.lines.slice();
    const changed = [];
    const byLine = new Map();
    for (const o of file.occurrences) {
        if (o.disposition !== "REWRITE") continue;
        if (!byLine.has(o.line)) byLine.set(o.line, []);
        byLine.get(o.line).push(o);
    }
    for (const [lineNo, occs] of byLine) {
        let text = file.lines[lineNo - 1];
        // Right to left so earlier offsets stay valid.
        for (const o of occs.sort((a, b) => b.start - a.start)) {
            if (text.slice(o.start, o.end) !== o.text) throw new Error(`offset drift at ${file.rel}:${lineNo}`);
            text = text.slice(0, o.start) + o.replacement + text.slice(o.end);
        }
        newLines[lineNo - 1] = text;
        changed.push(lineNo - 1);
    }
    changed.sort((a, b) => a - b);
    const newText = newLines.join("\n") + (file.endsWithNewline ? "\n" : "");
    return { newLines, changed, newBuf: Buffer.from(newText, "utf8") };
}

function unifiedDiff(file, rw) {
    const n = file.lines.length;
    const hunks = [];
    for (const i of rw.changed) {
        const lo = Math.max(0, i - CONTEXT_LINES), hi = Math.min(n - 1, i + CONTEXT_LINES);
        const last = hunks[hunks.length - 1];
        if (last && lo <= last.hi + 1) last.hi = Math.max(last.hi, hi);
        else hunks.push({ lo, hi });
    }
    const changedSet = new Set(rw.changed);
    const noEol = "\\ No newline at end of file";
    const isLast = j => j === n - 1 && !file.endsWithNewline;
    const out = [
        `diff --git a/${file.rel} b/${file.rel}`,
        `index ${blobSha(file.buf)}..${blobSha(rw.newBuf)} ${file.mode}`,
        `--- a/${file.rel}`,
        `+++ b/${file.rel}`,
    ];
    for (const h of hunks) {
        const len = h.hi - h.lo + 1;
        const range = len === 1 ? `${h.lo + 1}` : `${h.lo + 1},${len}`;
        out.push(`@@ -${range} +${range} @@`);
        let j = h.lo;
        while (j <= h.hi) {
            if (!changedSet.has(j)) {
                out.push(" " + file.lines[j]);
                if (isLast(j)) out.push(noEol);
                j++;
                continue;
            }
            let k = j;
            while (k + 1 <= h.hi && changedSet.has(k + 1)) k++;
            for (let x = j; x <= k; x++) out.push("-" + file.lines[x]);
            if (isLast(k)) out.push(noEol);
            for (let x = j; x <= k; x++) out.push("+" + rw.newLines[x]);
            if (isLast(k)) out.push(noEol);
            j = k + 1;
        }
    }
    return out.join("\n") + "\n";
}

// Post-conditions on the rewritten text, checked in memory before anything is written.
function verifyRewrite(file, rw) {
    const problems = [];
    const before = count(file.occurrences);
    const regions = file.ext === ".md" ? verbatimLines(rw.newLines).verbatim : [];
    const after = {};
    rw.newLines.forEach((line, i) => {
        for (const occ of findInLine(line)) {
            const cls = classify(occ, { rel: file.rel, ext: file.ext, verbatim: !!regions[i], line, source: rw.newBuf.toString("utf8") });
            after[cls.disposition] = (after[cls.disposition] || 0) + 1;
            if (cls.disposition === "REWRITE") problems.push(`${file.rel}:${i + 1} still has a rewritable occurrence`);
        }
    });
    for (const d of ["MANUAL", "KEEP", "INFO"]) {
        if ((before[d] || 0) !== (after[d] || 0)) problems.push(`${file.rel}: ${d} count changed ${before[d] || 0} -> ${after[d] || 0}`);
    }
    for (const o of file.occurrences) {
        if (o.disposition !== "REWRITE") continue;
        const resolved = o.kind === "FILE_URI"
            ? path.posix.normalize(path.posix.join(path.posix.dirname(o.base), o.replacement.replace(/[#?].*$/, "")))
            : o.replacement.replace(/(?::\d+)+$/, "");
        const want = path.posix.normalize(o.target.replace(/\/+$/, "") || ".");
        if (resolved.replace(/\/+$/, "") !== want) problems.push(`${o.file}:${o.line} ${o.replacement} resolves to ${resolved}, expected ${want}`);
    }
    return problems;
}

function count(occs) {
    const c = {};
    for (const o of occs) c[o.disposition] = (c[o.disposition] || 0) + 1;
    return c;
}

function code(s) {
    const runs = (s.match(/`+/g) || []).map(r => r.length);
    const fence = "`".repeat((runs.length ? Math.max(...runs) : 0) + 1);
    const pad = fence.length > 1 ? " " : "";
    return `${fence}${pad}${s.replace(/\|/g, "\\|")}${pad}${fence}`;
}

function excerpt(line, o, width = 70) {
    const from = Math.max(0, o.start - 30);
    const s = line.slice(from, from + width).trim();
    return (from > 0 ? "…" : "") + s + (from + width < line.length ? "…" : "");
}

function baseInfo(root) {
    try {
        const [sha, date, subject] = git(root, ["log", "-1", "--format=%H%n%cs%n%s"]).trim().split("\n");
        return { sha, date, subject };
    } catch (e) {
        return { sha: "(no commit)", date: "(unknown)", subject: "" };
    }
}

function dirtyFiles(root, rels) {
    if (!rels.length) return [];
    const out = git(root, ["status", "--porcelain", "-z", "--", ...rels]);
    return out.split("\0").filter(Boolean).map(r => r.slice(3));
}

function renderInventory(result, base, dirty, diffRel) {
    const all = result.files.flatMap(f => f.occurrences);
    const totals = count(all);
    const kinds = {};
    for (const o of all) {
        kinds[o.kind] = kinds[o.kind] || {};
        kinds[o.kind][o.disposition] = (kinds[o.kind][o.disposition] || 0) + 1;
    }
    const dispositions = ["REWRITE", "MANUAL", "KEEP", "INFO", "OUT_OF_SCOPE"];
    const L = [];
    L.push("# OneDrive absolute-path inventory (LANE-F)");
    L.push("");
    L.push("Generated by `node tools/migration/rewrite_onedrive_links.js --dry-run`. Do not edit by hand; re-run the tool.");
    L.push("");
    L.push(`- Base commit: \`${base.sha.slice(0, 7)}\` (${base.date}) ${base.subject}`);
    L.push(`- Working tree: ${dirty.length ? `**differs from the base commit** in ${dirty.length} scanned file(s): ${dirty.map(d => code(d)).join(", ")}` : "matches the base commit for every file listed here"}`);
    L.push(`- Scope: tracked \`.md\`, \`.js\`, \`.json\` files. Other tracked text files are listed under OUT_OF_SCOPE and are not rewritten. Excluded: ${EXCLUDED_PREFIXES.map(p => code(p)).join(", ")} (this tool, its outputs and its task notes).`);
    L.push(`- Patch: ${code(diffRel)} (REWRITE rows only). It is **not applied**; apply it only at the migration freeze point, after re-running the tool on the frozen tree.`);
    L.push("");
    L.push("## Summary");
    L.push("");
    L.push("| Kind | " + dispositions.join(" | ") + " | Total |");
    L.push("|---|" + dispositions.map(() => "---:").join("|") + "|---:|");
    for (const k of ["FILE_URI", "WIN_PATH", "TOOL_SLUG", "WORD"]) {
        if (!kinds[k]) continue;
        const row = dispositions.map(d => kinds[k][d] || 0);
        L.push(`| ${k} | ${row.join(" | ")} | ${row.reduce((a, b) => a + b, 0)} |`);
    }
    const tot = dispositions.map(d => totals[d] || 0);
    L.push(`| **Total** | ${tot.map(t => `**${t}**`).join(" | ")} | **${tot.reduce((a, b) => a + b, 0)}** |`);
    L.push("");
    const inScopeFiles = result.files.filter(f => IN_SCOPE_EXT.has(f.ext));
    const pathFiles = inScopeFiles.filter(f => f.occurrences.some(o => o.kind !== "WORD"));
    L.push(`Files: ${result.files.length} tracked text files mention OneDrive; ${pathFiles.length} in-scope files hold a path or slug; ${result.files.filter(f => f.occurrences.some(o => o.disposition === "REWRITE")).length} files change in the patch.`);
    L.push("");
    L.push("Kinds: `FILE_URI` = `file:///c:/Users/snewt/OneDrive/Desktop/UF/...`; `WIN_PATH` = `C:\\Users\\snewt\\OneDrive\\Desktop\\UF[\\...]` in any case, with `\\`, `\\\\` or `/` separators; `TOOL_SLUG` = the old path encoded into another tool's directory name; `WORD` = the word alone.");
    L.push("");
    L.push("Dispositions:");
    L.push("- **REWRITE**: in the patch. `file:///` links become paths relative to the linking document, so they still resolve. Windows paths with a sub-path become repository-root-relative (`docs/X.md`), the convention the docs already use in prose.");
    L.push("- **MANUAL**: needs a decision by the file's owner; the reason column says why. Not in the patch.");
    L.push("- **KEEP**: verbatim or historical text; editing it would falsify a record. Not in the patch.");
    L.push("- **INFO**: prose mention of OneDrive. Not a path; may go stale after the move.");
    L.push("- **OUT_OF_SCOPE**: occurrence in a file type LANE-F does not cover. Listed so the migration can plan for it.");
    const warn = result.files.filter(f => f.unclosedFence || f.unclosedTags.length);
    if (warn.length) {
        L.push("");
        L.push("Region warnings (a fence or transcript block never closes, so the rest of the file counts as verbatim):");
        for (const f of warn) L.push(`- ${code(f.rel)}${f.unclosedFence ? " unclosed code fence" : ""}${f.unclosedTags.length ? ` unclosed <${f.unclosedTags.join(">, <")}>` : ""}`);
    }

    const rows = d => result.files.flatMap(f => f.occurrences.filter(o => o.disposition === d).map(o => ({ o, f })));

    L.push("");
    L.push("## By file");
    L.push("");
    L.push("| File | " + dispositions.join(" | ") + " |");
    L.push("|---|" + dispositions.map(() => "---:").join("|") + "|");
    for (const f of result.files) {
        const c = count(f.occurrences);
        L.push(`| ${code(f.rel)} | ${dispositions.map(d => c[d] || "").join(" | ")} |`);
    }

    const rewrite = rows("REWRITE");
    L.push("");
    L.push(`## REWRITE (${rewrite.length})`);
    L.push("");
    L.push("Target = the repository path the original pointed at. Exists = `file`/`dir`/`glob` if the target is tracked, `MISSING` if not (the rewrite keeps the same target either way).");
    L.push("");
    L.push("| # | Location | Kind | Target | Replacement | Exists |");
    L.push("|---:|---|---|---|---|---|");
    rewrite.forEach(({ o }, i) => {
        L.push(`| ${i + 1} | ${code(`${o.file}:${o.line}`)} | ${o.kind}${o.base !== o.file && o.kind === "FILE_URI" ? ` (resolved from ${code(o.base)})` : ""} | ${code(o.target)} | ${code(o.replacement)} | ${o.exists} |`);
    });

    for (const d of ["MANUAL", "KEEP"]) {
        const r = rows(d);
        L.push("");
        L.push(`## ${d} (${r.length})`);
        L.push("");
        L.push("| # | Location | Kind | Matched text | Reason |");
        L.push("|---:|---|---|---|---|");
        r.forEach(({ o }, i) => {
            L.push(`| ${i + 1} | ${code(`${o.file}:${o.line}`)} | ${o.kind} | ${code(o.text)} | ${o.reason} |`);
        });
    }

    for (const d of ["INFO", "OUT_OF_SCOPE"]) {
        const r = rows(d);
        L.push("");
        L.push(`## ${d} (${r.length})`);
        L.push("");
        L.push("| # | Location | Kind | Excerpt |");
        L.push("|---:|---|---|---|");
        r.forEach(({ o, f }, i) => {
            L.push(`| ${i + 1} | ${code(`${o.file}:${o.line}`)} | ${o.kind} | ${code(o.kind === "WORD" ? excerpt(f.lines[o.line - 1], o) : o.text)} |`);
        });
    }
    return L.join("\n") + "\n";
}

function main() {
    let opts;
    try { opts = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
    if (opts.help || (!opts.dryRun && !opts.check)) {
        console.log("Usage: node tools/migration/rewrite_onedrive_links.js --dry-run [--root <dir>] [--out-dir <dir>]");
        console.log("       node tools/migration/rewrite_onedrive_links.js --check [--root <dir>]");
        console.log("There is no in-place write mode: apply the generated diff with `git apply` at the freeze point.");
        process.exit(opts.help ? 0 : 2);
    }

    const result = scan(opts.root);
    const all = result.files.flatMap(f => f.occurrences);
    const totals = count(all);
    const rewritable = all.filter(o => o.disposition === "REWRITE");
    const summary = ["REWRITE", "MANUAL", "KEEP", "INFO", "OUT_OF_SCOPE"].map(d => `${d}=${totals[d] || 0}`).join(" ");

    if (opts.check) {
        console.log(`Scanned ${opts.root}: ${summary}`);
        if (rewritable.length) {
            for (const o of rewritable) console.log(`FAIL ${o.file}:${o.line} ${o.text}`);
            console.log(`FAIL: ${rewritable.length} rewritable OneDrive path(s) remain`);
            process.exit(1);
        }
        console.log("PASS: no rewritable OneDrive paths remain");
        return;
    }

    const patches = [];
    const problems = [];
    for (const f of result.files) {
        if (!f.occurrences.some(o => o.disposition === "REWRITE")) continue;
        const rw = rewriteFile(f);
        problems.push(...verifyRewrite(f, rw));
        patches.push(unifiedDiff(f, rw));
    }
    if (problems.length) {
        for (const p of problems) console.error(`FAIL ${p}`);
        console.error(`FAIL: ${problems.length} post-condition(s) failed; nothing written`);
        process.exit(1);
    }

    const base = baseInfo(opts.root);
    const dirty = dirtyFiles(opts.root, result.files.map(f => f.rel));
    const diffPath = path.join(opts.outDir, "onedrive_links_rewrite.diff");
    const invPath = path.join(opts.outDir, "onedrive_links_inventory.md");
    const rel = p => path.relative(opts.root, p).split(path.sep).join("/");
    const header = [
        "# OneDrive absolute-path rewrite (LANE-F). Generated by:",
        "#   node tools/migration/rewrite_onedrive_links.js --dry-run",
        `# Base commit: ${base.sha} (${base.date})`,
        `# Files: ${patches.length}  Rewrites: ${rewritable.length}`,
        "# NOT APPLIED. At the migration freeze point: re-run the tool on the frozen tree, review, then",
        "#   git apply --check docs/migration/onedrive_links_rewrite.diff && git apply docs/migration/onedrive_links_rewrite.diff",
        "# See docs/migration/onedrive_links_inventory.md for MANUAL/KEEP items that the patch leaves alone.",
        "",
    ].join("\n");
    fs.mkdirSync(opts.outDir, { recursive: true });
    fs.writeFileSync(diffPath, header + patches.join(""), "utf8");
    fs.writeFileSync(invPath, renderInventory(result, base, dirty, rel(diffPath)), "utf8");
    console.log(`Scanned ${opts.root}: ${summary}`);
    console.log(`Patch: ${rel(diffPath)} (${patches.length} files, ${rewritable.length} rewrites; not applied)`);
    console.log(`Inventory: ${rel(invPath)}`);
    if (dirty.length) console.log(`WARNING: working tree differs from ${base.sha.slice(0, 7)} in ${dirty.length} scanned file(s)`);
}

main();
