#!/usr/bin/env node
"use strict";

/**
 * tools/security/scan_secrets.js
 *
 * OPS.70.02 (Lane Z): secrets scanner for docs/SECURITY_AND_SECRETS.md sections 2 and 5.
 *
 * It reads only content git tracks: blobs of the HEAD tree (git ls-tree + git cat-file), the staged
 * diff (git diff --cached), the patches of a commit range (git log -p), or one tracked file inside
 * the repository (--path). It never opens anything outside the repository.
 *
 * A matched value is never printed, logged or stored. Output shows file:line, the rule id, the first
 * REDACT_KEEP characters of the match and its length ("AIza... (39 chars)"). The allowlist and the
 * --json output carry a sha256 of the matched line, never the line.
 *
 * Usage:
 *   node tools/security/scan_secrets.js                   every file tracked at HEAD
 *   node tools/security/scan_secrets.js --staged          added lines of git diff --cached (for a
 *                                                          future pre-commit hook, OPS.30.03)
 *   node tools/security/scan_secrets.js --range <a>..<b>  added lines of every commit in a..b, plus
 *                                                          their commit messages; for a merge commit,
 *                                                          the lines that are new against every parent
 *   node tools/security/scan_secrets.js --path <file>     one tracked file, as it is in the working tree
 *   options: --json               one JSON document on stdout instead of text lines
 *            --allowlist <file>   default tools/security/secrets_allowlist.json under the repository
 *                                 root (a missing default file is an empty allowlist)
 *
 * Binary files (extension list, or a NUL byte in the first NUL_SNIFF_BYTES bytes or in an added
 * line) are skipped and counted. Allowlist entries are { path, rule, lineSha256, reason }; a finding
 * that matches one is reported as ALLOWED. An entry that matches nothing in a scan that read its
 * whole file (default mode: every entry; --path: entries for that path) is STALE and fails the run.
 *
 * Exit: 0 clean, 1 findings or stale allowlist entries, 2 usage or git error.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const DEFAULT_ALLOWLIST = "tools/security/secrets_allowlist.json";
const ALLOWLIST_SCHEMA = "deus.secrets_allowlist.v1";
const REDACT_KEEP = 4;
const NUL_SNIFF_BYTES = 8000;           // git's own "is this binary" window
const MAX_BUFFER = 1024 * 1024 * 1024;
const COMMIT_MESSAGE_PATH = "<commit-message>";

// High-entropy detector (policy section 5, line 52). A candidate is a run of base64 / base64url
// characters of ENTROPY_MIN_LEN..ENTROPY_MAX_LEN (longer runs are data blobs, not credentials).
// Mixed runs (upper, lower and digit all present) are a finding at ENTROPY_MIN_BITS bits per
// character or more. Pure hex runs (commit hashes, sha256 sums, colours) are only a finding when
// they are the value of a credential-named assignment (ENTROPY_HEX_CONTEXT) and reach
// ENTROPY_HEX_MIN_BITS.
const ENTROPY_MIN_LEN = 32;
const ENTROPY_MAX_LEN = 256;
const ENTROPY_MIN_BITS = 4.5;
const ENTROPY_HEX_MIN_BITS = 3.0;
const ENTROPY_TOKEN_RE = new RegExp("[A-Za-z0-9+/_-]{" + ENTROPY_MIN_LEN + ",}={0,2}", "g");
const ENTROPY_HEX_CONTEXT = /(?:secret|passw(?:or)?d|pwd|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|credential|auth)[\w.-]*["']?\s*[:=]\s*["']?$/i;

// Skipped without reading (their bytes are image, audio, font, archive or engine binary formats).
const BINARY_EXTENSIONS = new Set([
    "png", "jpg", "jpeg", "gif", "bmp", "webp", "ico", "tga", "psd", "ogg", "m4a", "mp3", "wav",
    "mp4", "webm", "wasm", "woff", "woff2", "ttf", "otf", "eot", "exe", "dll", "zip", "7z", "gz",
    "rar", "pdf", "efkefc", "efkmodel", "efkmat", "rmmzsave", "rpgsave"
]);

function hasUpper(s) { return /[A-Z]/.test(s); }
function hasLower(s) { return /[a-z]/.test(s); }
function hasDigit(s) { return /[0-9]/.test(s); }
function hasLetter(s) { return /[A-Za-z]/.test(s); }
// A provider-key body counts only when it looks generated: upper, lower and digit all present.
// Policy text such as "sk-..." or a kebab-case identifier after "sk-" does not.
function generatedBody(s) { return hasUpper(s) && hasLower(s) && hasDigit(s); }
function notPlaceholder(v) { return !/^[<$%{*.\[(]/.test(v) && !/^x+$/i.test(v); }

// Content rules, in priority order: a later rule never reports a span an earlier rule already took.
// Each rule's `value` is the part that is redacted; `source` is the policy line it implements.
const RULES = [
    {
        id: "PRIVATE_KEY_PEM", source: "docs/SECURITY_AND_SECRETS.md:23 (private SSH keys)",
        re: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/dg, group: 0
    },
    {
        id: "ANTHROPIC_KEY", source: "docs/SECURITY_AND_SECRETS.md:21 (Anthropic sk-ant-...)",
        re: /\bsk-ant-[A-Za-z0-9]{2,12}-([A-Za-z0-9_-]{32,})/dg, group: 0, body: 1, ok: generatedBody
    },
    {
        id: "OPENAI_KEY", source: "docs/SECURITY_AND_SECRETS.md:21,53 (OpenAI sk-...)",
        re: /\bsk-(?!ant-)(?:[a-z]{2,10}-)?([A-Za-z0-9_-]{32,})/dg, group: 0, body: 1, ok: generatedBody
    },
    {
        id: "GOOGLE_API_KEY", source: "docs/SECURITY_AND_SECRETS.md:21,53 (Google AI AIza...)",
        re: /\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])/dg, group: 0
    },
    {
        id: "GOOGLE_OAUTH_TOKEN", source: "docs/SECURITY_AND_SECRETS.md:22,34 (OAuth access/refresh tokens; Gemini auth)",
        re: /(?:\bya29\.|(?<![A-Za-z0-9_\/-])1\/\/0)([0-9A-Za-z_-]{30,})/dg, group: 0, body: 1, ok: generatedBody
    },
    {
        id: "XAI_KEY", source: "docs/SECURITY_AND_SECRETS.md:21,53 (xAI xai-...)",
        re: /\bxai-([A-Za-z0-9_-]{32,})/dg, group: 0, body: 1, ok: generatedBody
    },
    {
        id: "GITHUB_TOKEN", source: "git-host token (REPORT.md: rule justification)",
        re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,251}|github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59})(?![A-Za-z0-9_])/dg, group: 0
    },
    {
        id: "GITLAB_TOKEN", source: "git-host token (REPORT.md: rule justification)",
        re: /\bglpat-[A-Za-z0-9_-]{20,}(?![A-Za-z0-9_-])/dg, group: 0
    },
    {
        id: "JWT", source: "docs/SECURITY_AND_SECRETS.md:22 (JWT tokens)",
        re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/dg, group: 0
    },
    {
        id: "NETRC_PASSWORD", source: "docs/SECURITY_AND_SECRETS.md:23 (.netrc entries)",
        re: /\b(?:machine\s+\S+|default)\s+(?:login\s+\S+\s+)?(?:account\s+\S+\s+)?password\s+([^\s"'`]{4,})/dg, group: 1,
        ok: notPlaceholder
    },
    {
        id: "SESSION_COOKIE", source: "docs/SECURITY_AND_SECRETS.md:24 (session cookies)",
        re: /\b(?:set-)?cookie\s*[:=]\s*["']?[^\r\n]*?\b[\w.-]*(?:sess|sid|token|auth|jwt|login)[\w.-]*=([A-Za-z0-9%._~+\/-]{16,})/dgi, group: 1,
        ok: v => hasDigit(v) && hasLetter(v)
    },
    {
        id: "BEARER_TOKEN", source: "docs/SECURITY_AND_SECRETS.md:22,53 (Bearer tokens, 'bearer')",
        re: /\bbearer\s+([A-Za-z0-9._~+\/-]{20,}=*)/dgi, group: 1,
        ok: v => hasDigit(v) && hasLetter(v)
    }
];
const ENTROPY_RULE = { id: "HIGH_ENTROPY", source: "docs/SECURITY_AND_SECRETS.md:52 (high-entropy strings)" };
const CREDENTIAL_FILE_RULE = { id: "CREDENTIAL_FILE", source: "docs/SECURITY_AND_SECRETS.md:36,54 (.env and credential files stay untracked)" };
// Tracked file names that hold credentials (basename, case-insensitive).
const CREDENTIAL_FILE_RE = /^(?:\.env(?:\..+)?|.+\.pem|id_(?:rsa|dsa|ecdsa|ed25519)(?:[._-].*)?|[._]netrc|credentials\.json|\.claude\.json|\.git-credentials|oauth_creds\.json|.+\.p12|.+\.pfx)$/i;
const RULE_IDS = new Set(RULES.map(r => r.id).concat([ENTROPY_RULE.id, CREDENTIAL_FILE_RULE.id]));

class UsageError extends Error {}

// ---------------------------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------------------------

function shannonBits(s) {
    const counts = new Map();
    for (const ch of s) counts.set(ch, (counts.get(ch) || 0) + 1);
    let h = 0;
    for (const n of counts.values()) { const p = n / s.length; h -= p * Math.log2(p); }
    return h;
}

function overlaps(taken, a, b) {
    for (const [s, e] of taken) if (a < e && s < b) return true;
    return false;
}

function entropyHits(line, taken) {
    const hits = [];
    ENTROPY_TOKEN_RE.lastIndex = 0;
    let m;
    while ((m = ENTROPY_TOKEN_RE.exec(line)) !== null) {
        const tok = m[0].replace(/=+$/, "");
        const start = m.index, end = m.index + tok.length;
        if (tok.length < ENTROPY_MIN_LEN || tok.length > ENTROPY_MAX_LEN) continue;
        if (overlaps(taken, start, end)) continue;
        const bits = shannonBits(tok);
        if (/^[0-9a-fA-F]+$/.test(tok)) {
            if (bits < ENTROPY_HEX_MIN_BITS) continue;
            if (!ENTROPY_HEX_CONTEXT.test(line.slice(Math.max(0, start - 60), start))) continue;
        } else if (!(hasUpper(tok) && hasLower(tok) && hasDigit(tok)) || bits < ENTROPY_MIN_BITS) {
            continue;
        }
        hits.push({ rule: ENTROPY_RULE.id, start, end, value: tok, bits: Math.round(bits * 100) / 100 });
    }
    return hits;
}

// Every secret on one line. Returns [{ rule, start, end, value, bits? }].
function scanLine(line) {
    const hits = [];
    const taken = [];
    for (const rule of RULES) {
        rule.re.lastIndex = 0;
        let m;
        while ((m = rule.re.exec(line)) !== null) {
            if (m[0].length === 0) { rule.re.lastIndex++; continue; }
            const [start, end] = m.indices[rule.group];
            const value = m[rule.group];
            const checked = rule.body !== undefined ? m[rule.body] : value;
            if (rule.ok && !rule.ok(checked)) continue;
            if (overlaps(taken, start, end)) continue;
            taken.push([start, end]);
            hits.push({ rule: rule.id, start, end, value });
        }
    }
    for (const h of entropyHits(line, taken)) { taken.push([h.start, h.end]); hits.push(h); }
    return hits;
}

function credentialFileHit(p) {
    return CREDENTIAL_FILE_RE.test(p.split("/").pop());
}

function redact(value) {
    return value.slice(0, REDACT_KEEP) + "... (" + value.length + " chars)";
}

function sha256(s) {
    return crypto.createHash("sha256").update(Buffer.from(s, "latin1")).digest("hex");
}

function isBinaryPath(p) {
    const base = p.split("/").pop();
    const dot = base.lastIndexOf(".");
    return dot > 0 && BINARY_EXTENSIONS.has(base.slice(dot + 1).toLowerCase());
}

function hasNul(buf) {
    return buf.subarray(0, NUL_SNIFF_BYTES).includes(0);
}

// ---------------------------------------------------------------------------------------------
// Git access (tracked content only)
// ---------------------------------------------------------------------------------------------

function git(cwd, args, input) {
    const r = spawnSync("git", ["-c", "core.quotePath=true"].concat(args), {
        cwd, input, maxBuffer: MAX_BUFFER, windowsHide: true
    });
    if (r.error) throw new UsageError("git " + args[0] + ": " + r.error.message);
    if (r.status !== 0) {
        const msg = (r.stderr || Buffer.alloc(0)).toString("utf8").trim().split("\n")[0];
        throw new UsageError("git " + args.join(" ") + " exited " + r.status + (msg ? ": " + msg : ""));
    }
    return r.stdout;
}

function repoRoot(cwd) {
    return git(cwd, ["rev-parse", "--show-toplevel"]).toString("utf8").trim();
}

// Entries of the HEAD tree: [{ mode, type, sha, path }].
function headTree(root) {
    const out = git(root, ["ls-tree", "-r", "-z", "--full-tree", "HEAD"]).toString("utf8");
    const entries = [];
    for (const rec of out.split("\0")) {
        if (!rec) continue;
        const tab = rec.indexOf("\t");
        const [mode, type, sha] = rec.slice(0, tab).split(" ");
        entries.push({ mode, type, sha, path: rec.slice(tab + 1) });
    }
    return entries;
}

// Blob contents by sha, one git cat-file --batch process.
function readBlobs(root, shas) {
    const map = new Map();
    if (shas.length === 0) return map;
    const out = git(root, ["cat-file", "--batch"], shas.join("\n") + "\n");
    let pos = 0;
    while (pos < out.length) {
        const nl = out.indexOf(10, pos);
        if (nl < 0) break;
        const header = out.subarray(pos, nl).toString("utf8").split(" ");
        pos = nl + 1;
        if (header[1] === "missing" || header.length < 3) throw new UsageError("git cat-file: object " + header[0] + " missing");
        const size = Number(header[2]);
        map.set(header[0], out.subarray(pos, pos + size));
        pos += size + 1;
    }
    return map;
}

// C-style quoted path as git prints it with core.quotePath=true.
function unquoteC(s) {
    const bytes = [];
    for (let i = 1; i < s.length - 1; i++) {
        const c = s[i];
        if (c !== "\\") { bytes.push(c.charCodeAt(0) & 0xff); continue; }
        const n = s[++i];
        if (/[0-7]/.test(n)) { bytes.push(parseInt(s.substr(i, 3), 8)); i += 2; continue; }
        const esc = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, "\\": 92 }[n];
        bytes.push(esc === undefined ? n.charCodeAt(0) : esc);
    }
    return Buffer.from(bytes).toString("utf8");
}

function readQuoted(s, from) {
    let i = from + 1;
    while (i < s.length && s[i] !== '"') i += s[i] === "\\" ? 2 : 1;
    return { text: s.slice(from, i + 1), next: i + 1 };
}

// Path from "diff --git a/X b/X" (renames are off, so both sides are the same path).
function gitHeaderPath(rest) {
    if (rest.startsWith('"')) {
        const second = rest.slice(readQuoted(rest, 0).next + 1);
        const p = second.startsWith('"') ? unquoteC(second) : second;
        return p.replace(/^b\//, "");
    }
    const half = (rest.length - 5) / 2;
    if (Number.isInteger(half) && rest.startsWith("a/") && rest.slice(2 + half, 5 + half) === " b/") return rest.slice(5 + half);
    return rest.slice(rest.lastIndexOf(" b/") + 3);
}

// Parse git diff / git log -p output (with --text, -U0, --no-renames) into files with added lines.
// A commit marker line "\x01<sha>" precedes each commit's patch in range mode.
function parsePatch(buf) {
    const files = [];
    let commit = null, cur = null, hunk = null;
    for (const raw of buf.toString("latin1").split("\n")) {
        if (raw.startsWith("\x01")) { commit = raw.slice(1).trim(); cur = null; hunk = null; continue; }
        if (raw.startsWith("diff --git ") || raw.startsWith("diff --cc ") || raw.startsWith("diff --combined ")) {
            let p;
            if (raw.startsWith("diff --git ")) p = gitHeaderPath(raw.slice(11));
            else { const rest = raw.slice(raw.indexOf(" ", 5) + 1); p = rest.startsWith('"') ? unquoteC(rest) : rest; }
            cur = { commit, path: p, deleted: false, added: [], nul: false };
            files.push(cur);
            hunk = null;
            continue;
        }
        if (!cur) continue;
        const hm = /^(@{2,}) (.*?) \1/.exec(raw);
        if (hm) {
            const plus = /\+(\d+)/.exec(hm[2]);
            hunk = { parents: hm[1].length - 1, next: plus ? Number(plus[1]) : 1 };
            continue;
        }
        if (!hunk) {
            if (raw.startsWith("deleted file mode")) cur.deleted = true;
            continue;
        }
        const prefix = raw.slice(0, hunk.parents);
        if (prefix.length < hunk.parents || /[^ +-]/.test(prefix)) {
            if (!raw.startsWith("\\")) hunk = null;       // "\ No newline at end of file" stays in the hunk
            continue;
        }
        if (prefix.includes("-")) continue;               // removed line: not in the result
        const text = raw.slice(hunk.parents).replace(/\r$/, "");
        if (/^\++$/.test(prefix)) {
            if (text.includes("\0")) cur.nul = true;
            cur.added.push({ no: hunk.next, text });
        }
        hunk.next++;
    }
    return files;
}

// ---------------------------------------------------------------------------------------------
// Scan modes. Each returns { units: [{ commit, path, lines: [{no, text}] | null, binary }], full }
// where lines === null marks a file whose content was not read, and `full` lists paths whose whole
// content was scanned (for allowlist staleness).
// ---------------------------------------------------------------------------------------------

function splitLines(text) {
    return text.split("\n").map((t, i) => ({ no: i + 1, text: t.replace(/\r$/, "") }));
}

function collectHead(root) {
    const entries = headTree(root).filter(e => e.type === "blob");
    const units = [];
    const wanted = entries.filter(e => !isBinaryPath(e.path));
    const blobs = readBlobs(root, [...new Set(wanted.map(e => e.sha))]);
    for (const e of entries) {
        if (isBinaryPath(e.path)) { units.push({ path: e.path, binary: "extension", lines: null }); continue; }
        const buf = blobs.get(e.sha);
        if (hasNul(buf)) { units.push({ path: e.path, binary: "nul", lines: null }); continue; }
        units.push({ path: e.path, binary: null, lines: splitLines(buf.toString("latin1")) });
    }
    return { units, full: "all" };
}

const DIFF_FLAGS = ["--no-color", "--no-ext-diff", "--no-textconv", "--no-renames", "--text", "-U0",
                    "--src-prefix=a/", "--dst-prefix=b/"];

function unitsFromPatch(files) {
    const units = [];
    for (const f of files) {
        if (f.deleted) continue;
        if (isBinaryPath(f.path)) units.push({ commit: f.commit, path: f.path, binary: "extension", lines: null });
        else if (f.nul) units.push({ commit: f.commit, path: f.path, binary: "nul", lines: null });
        else units.push({ commit: f.commit, path: f.path, binary: null, lines: f.added });
    }
    return units;
}

function collectStaged(root) {
    return { units: unitsFromPatch(parsePatch(git(root, ["diff", "--cached"].concat(DIFF_FLAGS, ["--"])))), full: [] };
}

function collectRange(root, range) {
    const m = /^([^.\s][^\s]*?)\.\.(\.?)([^.\s][^\s]*)$/.exec(range || "");
    if (!m || range.startsWith("-")) throw new UsageError("--range needs <a>..<b>");
    for (const rev of [m[1], m[3]]) git(root, ["rev-parse", "--verify", "--quiet", "--end-of-options", rev + "^{commit}"]);
    const patch = git(root, ["log", "-p", "--cc", "--format=%x01%H"].concat(DIFF_FLAGS, ["--end-of-options", range, "--"]));
    const units = unitsFromPatch(parsePatch(patch));
    // Commit messages are history too (policy section 1): scan them as a pseudo-file per commit.
    const msgs = git(root, ["log", "--format=%x01%H%x02%B%x03", "--end-of-options", range, "--"]).toString("latin1");
    for (const rec of msgs.split("\x03")) {
        const s = rec.indexOf("\x01"), t = rec.indexOf("\x02");
        if (s < 0 || t < 0) continue;
        units.push({ commit: rec.slice(s + 1, t), path: COMMIT_MESSAGE_PATH, binary: null, lines: splitLines(rec.slice(t + 1)) });
    }
    return { units, full: [] };
}

function collectPath(root, cwd, p) {
    if (!p) throw new UsageError("--path needs a file");
    const abs = path.resolve(cwd, p);
    let real, realRoot;
    try { real = fs.realpathSync(abs); realRoot = fs.realpathSync(root); } catch (e) { throw new UsageError("--path: cannot resolve " + p); }
    const rel = path.relative(realRoot, real);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) throw new UsageError("--path: " + p + " is outside the repository");
    const relPosix = rel.split(path.sep).join("/");
    const tracked = git(root, ["ls-files", "-z", "--full-name", "--", ":(literal)" + relPosix]).toString("utf8").split("\0").filter(Boolean);
    if (!tracked.includes(relPosix)) throw new UsageError("--path: " + relPosix + " is not tracked by git");
    if (!fs.statSync(real).isFile()) throw new UsageError("--path: " + relPosix + " is not a file");
    if (isBinaryPath(relPosix)) return { units: [{ path: relPosix, binary: "extension", lines: null }], full: [relPosix] };
    const buf = fs.readFileSync(real);
    if (hasNul(buf)) return { units: [{ path: relPosix, binary: "nul", lines: null }], full: [relPosix] };
    return { units: [{ path: relPosix, binary: null, lines: splitLines(buf.toString("latin1")) }], full: [relPosix] };
}

// ---------------------------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------------------------

function loadAllowlist(file, explicit) {
    if (!fs.existsSync(file)) {
        if (explicit) throw new UsageError("allowlist not found: " + file);
        return [];
    }
    let doc;
    try { doc = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, "")); } catch (e) { throw new UsageError("allowlist " + file + ": " + e.message); }
    if (!doc || doc.schema !== ALLOWLIST_SCHEMA || !Array.isArray(doc.entries)) {
        throw new UsageError("allowlist " + file + ": expected { \"schema\": \"" + ALLOWLIST_SCHEMA + "\", \"entries\": [...] }");
    }
    const seen = new Set();
    doc.entries.forEach((e, i) => {
        const where = "allowlist entry " + i + ": ";
        if (!e || typeof e !== "object" || Array.isArray(e)) throw new UsageError(where + "not an object");
        const keys = Object.keys(e).sort().join(",");
        if (keys !== "lineSha256,path,reason,rule") throw new UsageError(where + "needs exactly path, rule, lineSha256, reason");
        if (typeof e.path !== "string" || !e.path) throw new UsageError(where + "path must be a non-empty string");
        if (!RULE_IDS.has(e.rule)) throw new UsageError(where + "unknown rule " + JSON.stringify(e.rule));
        if (typeof e.lineSha256 !== "string" || !/^[0-9a-f]{64}$/.test(e.lineSha256)) throw new UsageError(where + "lineSha256 must be 64 lowercase hex characters");
        if (typeof e.reason !== "string" || e.reason.trim().length < 10) throw new UsageError(where + "reason must say why (10+ characters)");
        const key = e.path + "\0" + e.rule + "\0" + e.lineSha256;
        if (seen.has(key)) throw new UsageError(where + "duplicate of an earlier entry");
        seen.add(key);
    });
    return doc.entries;
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

function parseArgs(argv) {
    const o = { mode: "head", json: false, allowlist: null, range: null, path: null };
    const setMode = m => { if (o.mode !== "head") throw new UsageError("choose one of --staged, --range, --path"); o.mode = m; };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--json") o.json = true;
        else if (a === "--staged") setMode("staged");
        else if (a === "--range") { setMode("range"); o.range = argv[++i]; if (o.range === undefined) throw new UsageError("--range needs <a>..<b>"); }
        else if (a === "--path") { setMode("path"); o.path = argv[++i]; if (o.path === undefined) throw new UsageError("--path needs a file"); }
        else if (a === "--allowlist") { o.allowlist = argv[++i]; if (o.allowlist === undefined) throw new UsageError("--allowlist needs a file"); }
        else if (a === "-h" || a === "--help") o.help = true;
        else throw new UsageError("unknown argument " + JSON.stringify(a));
    }
    return o;
}

function scan(collected, allowEntries) {
    const findings = [], allowed = [], skipped = [];
    let scanned = 0;
    for (const u of collected.units) {
        if (u.lines === null) { skipped.push({ path: u.path, commit: u.commit || null, reason: u.binary }); continue; }
        scanned++;
        const hits = [];
        if (u.path !== COMMIT_MESSAGE_PATH && credentialFileHit(u.path)) {
            hits.push({ line: 0, rule: CREDENTIAL_FILE_RULE.id, value: null, lineSha256: sha256(u.path) });
        }
        for (const ln of u.lines) {
            for (const h of scanLine(ln.text)) {
                hits.push({ line: ln.no, rule: h.rule, value: h.value, bits: h.bits, lineSha256: sha256(ln.text) });
            }
        }
        for (const h of hits) {
            const rec = {
                commit: u.commit || null, path: u.path, line: h.line, rule: h.rule,
                redacted: h.value === null ? "(tracked credential file name)" : redact(h.value),
                length: h.value === null ? 0 : h.value.length, lineSha256: h.lineSha256
            };
            if (h.bits !== undefined) rec.bits = h.bits;
            const entry = allowEntries.find(e => e.path === rec.path && e.rule === rec.rule && e.lineSha256 === rec.lineSha256);
            if (entry) { entry.used = true; rec.reason = entry.reason; allowed.push(rec); } else findings.push(rec);
        }
    }
    // A (wrapped) unit binary-skipped for a NUL byte in a text-looking file is listed by name.
    const fullSet = collected.full === "all" ? null : new Set(collected.full);
    const stale = allowEntries.filter(e => !e.used && (fullSet === null || fullSet.has(e.path)))
        .map(e => ({ path: e.path, rule: e.rule, lineSha256: e.lineSha256, reason: e.reason }));
    const order = (a, b) => (a.commit || "").localeCompare(b.commit || "") || a.path.localeCompare(b.path) || a.line - b.line || a.rule.localeCompare(b.rule);
    findings.sort(order); allowed.sort(order);
    return { scanned, skipped, findings, allowed, stale };
}

function where(r) {
    return (r.commit ? r.commit.slice(0, 12) + " " : "") + r.path + ":" + r.line;
}

function main(argv, cwd = process.cwd()) {
    const out = s => process.stdout.write(s + "\n");
    let o;
    try {
        o = parseArgs(argv);
        if (o.help) { out("usage: node tools/security/scan_secrets.js [--staged | --range <a>..<b> | --path <file>] [--json] [--allowlist <file>]"); return 0; }
        const root = repoRoot(cwd);
        const allowFile = o.allowlist ? path.resolve(cwd, o.allowlist) : path.join(root, DEFAULT_ALLOWLIST);
        const entries = loadAllowlist(allowFile, !!o.allowlist).map(e => Object.assign({}, e, { used: false }));
        const collected = o.mode === "staged" ? collectStaged(root)
            : o.mode === "range" ? collectRange(root, o.range)
            : o.mode === "path" ? collectPath(root, cwd, o.path)
            : collectHead(root);
        const r = scan(collected, entries);
        const code = r.findings.length || r.stale.length ? 1 : 0;
        if (o.json) {
            out(JSON.stringify({
                tool: "scan_secrets", schema: "deus.scan_secrets.v1", mode: o.mode, range: o.range, filesScanned: r.scanned,
                binarySkipped: r.skipped.length, skipped: r.skipped, findings: r.findings, allowed: r.allowed,
                staleAllowlist: r.stale, exitCode: code
            }, null, 2));
            return code;
        }
        for (const f of r.findings) out("FINDING " + where(f) + " " + f.rule + " " + f.redacted + (f.bits !== undefined ? " entropy=" + f.bits : ""));
        for (const a of r.allowed) out("ALLOWED " + where(a) + " " + a.rule + " " + a.redacted + " reason: " + a.reason);
        for (const s of r.stale) out("STALE_ALLOWLIST " + s.path + " " + s.rule + " lineSha256=" + s.lineSha256.slice(0, 12) + " (matches nothing) reason: " + s.reason);
        for (const s of r.skipped) if (s.reason === "nul") out("SKIPPED_BINARY " + (s.commit ? s.commit.slice(0, 12) + " " : "") + s.path + " (NUL byte)");
        out("RESULT: " + r.scanned + " files scanned, " + r.skipped.length + " binary skipped, " + r.findings.length + " findings, " +
            r.allowed.length + " allowed, " + r.stale.length + " stale allowlist entries");
        return code;
    } catch (e) {
        if (!(e instanceof UsageError)) throw e;
        process.stderr.write("scan_secrets: " + e.message + "\n");
        if (o && o.json) out(JSON.stringify({ tool: "scan_secrets", error: e.message, exitCode: 2 }));
        return 2;
    }
}

module.exports = { main, scanLine, shannonBits, redact, credentialFileHit, isBinaryPath, parsePatch, RULES, ENTROPY_RULE, CREDENTIAL_FILE_RULE,
                   ENTROPY_MIN_LEN, ENTROPY_MAX_LEN, ENTROPY_MIN_BITS, ENTROPY_HEX_MIN_BITS, REDACT_KEEP };

if (require.main === module) {
    try { process.exitCode = main(process.argv.slice(2)); } catch (e) { process.stderr.write("scan_secrets: internal error: " + (e && e.stack || e) + "\n"); process.exitCode = 2; }
}
