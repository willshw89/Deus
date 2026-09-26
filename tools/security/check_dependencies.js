#!/usr/bin/env node
"use strict";

/**
 * tools/security/check_dependencies.js
 *
 * OPS.70.02 (Lane Z): dependency checker for docs/DEPENDENCY_POLICY.md.
 *
 * It checks the committed state (the HEAD tree, read with git ls-tree + git cat-file) of the
 * repository that holds the current directory, plus the working-tree status of game/js/libs/:
 *   1. NPM_ARTIFACT (policy 2C, line 35): no tracked node_modules/, no package.json with
 *      dependencies / devDependencies (optional and peer too), no lockfile under game/. The same
 *      things elsewhere in the repository (the root included) are reported as NOTE lines.
 *   2. Every require() / import / export-from in tracked tools/**\/*.js and game/js/**\/*.js resolves
 *      to a Node built-in (policy 2C, line 34) or to a tracked project file. A bare npm package name
 *      is NPM_REQUIRE; a relative or absolute path that resolves to no tracked file is
 *      MISSING_RELATIVE / ABSOLUTE_REQUIRE. Built-ins outside the policy list are reported, not
 *      failed. A require whose argument is not a literal (after folding path.join/resolve of
 *      __dirname and literals) is UNRESOLVED_DYNAMIC, reported and never guessed. .mjs / .cjs files
 *      in the same folders are outside that *.js scope: their results are NOTE lines only.
 *   3. game/js/libs/ is frozen (policy 2B, line 23): every file's sha256 must equal
 *      tools/security/libs_baseline.json (made at 425b594c146d5f353c10faa11f4b5d47f499b45f); an
 *      added, removed or changed file is LIBS_CHANGED, and a working-tree change there is
 *      LIBS_WORKTREE_CHANGED.
 *   4. node -v >= 18 (policy 2A, line 20; 4 line 70). Reported; NODE_TOO_OLD only below 18.
 *
 * Usage:
 *   node tools/security/check_dependencies.js [--json] [--libs-baseline <file>]
 *   node tools/security/check_dependencies.js --make-libs-baseline <commit>   print a baseline for game/js/libs at <commit>
 *
 * Exit: 0 clean, 1 findings, 2 usage or git error.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Module = require("module");
const { spawnSync } = require("child_process");

const DEFAULT_LIBS_BASELINE = "tools/security/libs_baseline.json";
const LIBS_BASELINE_SCHEMA = "deus.libs_baseline.v1";
const DEFAULT_DEP_BASELINE = "tools/security/dependency_baseline.json";
const DEP_BASELINE_SCHEMA = "deus.dependency_baseline.v1";
const BASELINE_KINDS = new Set(["MISSING_RELATIVE", "NPM_REQUIRE", "ABSOLUTE_REQUIRE"]);
const LIBS_DIR = "game/js/libs/";
const GAME_DIR = "game/";                 // the NW.js app root (game/package.json)
const MIN_NODE_MAJOR = 18;
const MAX_BUFFER = 1024 * 1024 * 1024;

// Policy 2C, line 34: the built-in modules the tooling may use. A subpath ("fs/promises") counts as
// its parent module.
const POLICY_BUILTINS = new Set(["fs", "path", "v8", "perf_hooks", "child_process", "crypto"]);
// Modules the NW.js runtime provides to game code (not npm packages, not Node built-ins).
const NWJS_MODULES = new Set(["nw.gui"]);
const DEP_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
const LOCKFILES = new Set(["package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"]);
const RESOLVE_EXTENSIONS = ["", ".js", ".json", ".mjs", ".cjs", ".node"];

class UsageError extends Error {}

// ---------------------------------------------------------------------------------------------
// Git access (tracked content only)
// ---------------------------------------------------------------------------------------------

function git(cwd, args, input) {
    const r = spawnSync("git", ["-c", "core.quotePath=false"].concat(args), { cwd, input, maxBuffer: MAX_BUFFER, windowsHide: true });
    if (r.error) throw new UsageError("git " + args[0] + ": " + r.error.message);
    if (r.status !== 0) {
        const msg = (r.stderr || Buffer.alloc(0)).toString("utf8").trim().split("\n")[0];
        throw new UsageError("git " + args.join(" ") + " exited " + r.status + (msg ? ": " + msg : ""));
    }
    return r.stdout;
}

function treeEntries(root, rev) {
    const out = git(root, ["ls-tree", "-r", "-z", "--full-tree", "--end-of-options", rev]).toString("utf8");
    const entries = [];
    for (const rec of out.split("\0")) {
        if (!rec) continue;
        const tab = rec.indexOf("\t");
        const [mode, type, sha] = rec.slice(0, tab).split(" ");
        if (type === "blob") entries.push({ mode, sha, path: rec.slice(tab + 1) });
    }
    return entries;
}

function readBlobs(root, shas) {
    const map = new Map();
    const list = [...new Set(shas)];
    if (list.length === 0) return map;
    const out = git(root, ["cat-file", "--batch"], list.join("\n") + "\n");
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

function sha256(buf) {
    return crypto.createHash("sha256").update(buf).digest("hex");
}

// ---------------------------------------------------------------------------------------------
// A small JavaScript lexer: identifiers, punctuators, string and template literals (with their
// value), numbers and regular expressions, with line numbers. Comments and whitespace are dropped.
// It exists so that require( and import inside strings, comments and regexes are not read as code.
// ---------------------------------------------------------------------------------------------

// Space, tab, CR, form feed, vertical tab, no-break space, byte-order mark, line and paragraph
// separators (by code, so this source stays ASCII).
const WHITESPACE = new Set([0x20, 0x09, 0x0d, 0x0c, 0x0b, 0xa0, 0xfeff, 0x2028, 0x2029]);

const REGEX_AFTER_WORD = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw",
                                  "case", "do", "else", "yield", "await"]);

function isIdStart(c) { return /[A-Za-z_$]/.test(c) || c > "\x7f"; }
function isIdPart(c) { return /[\w$]/.test(c) || c > "\x7f"; }

function lex(src) {
    const toks = [];
    const n = src.length;
    let i = 0, line = 1;
    const stack = [];                         // "{" for a brace, "`" for a template substitution
    const prevSig = () => toks[toks.length - 1];
    const regexAllowed = () => {
        const p = prevSig();
        if (!p) return true;
        if (p.t === "id") return REGEX_AFTER_WORD.has(p.v);
        if (p.t === "num" || p.t === "str" || p.t === "tpl" || p.t === "re") return false;
        return !(p.v === ")" || p.v === "]");
    };
    // Reads template text from i (just after ` or a substitution's closing }) to the closing ` or
    // the next ${. Returns true when it stopped at ${.
    const readTemplate = tok => {
        while (i < n) {
            const c = src[i];
            if (c === "\\") { tok.v += src[i + 1] === undefined ? "" : src[i + 1]; if (src[i + 1] === "\n") line++; i += 2; continue; }
            if (c === "`") { i++; return false; }
            if (c === "$" && src[i + 1] === "{") { i += 2; tok.dynamic = true; stack.push("`"); return true; }
            if (c === "\n") line++;
            tok.v += c;
            i++;
        }
        return false;
    };
    while (i < n) {
        const c = src[i];
        if (c === "\n") { line++; i++; continue; }
        if (WHITESPACE.has(c.charCodeAt(0))) { i++; continue; }
        if (c === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; continue; }
        if (c === "/" && src[i + 1] === "*") {
            const e = src.indexOf("*/", i + 2);
            const end = e < 0 ? n : e + 2;
            for (let k = i; k < end; k++) if (src[k] === "\n") line++;
            i = end;
            continue;
        }
        if (c === "#" && i === 0 && src[1] === "!") { while (i < n && src[i] !== "\n") i++; continue; }
        if (c === "'" || c === '"') {
            const tok = { t: "str", v: "", line };
            i++;
            while (i < n && src[i] !== c && src[i] !== "\n") {
                if (src[i] === "\\") {
                    const e = src[i + 1];
                    if (e === "\n") { line++; i += 2; continue; }
                    if (e === "\r") { i += src[i + 2] === "\n" ? 3 : 2; line++; continue; }
                    const simple = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", "0": "\0" }[e];
                    if (e === "x" && /^[0-9a-fA-F]{2}$/.test(src.substr(i + 2, 2))) { tok.v += String.fromCharCode(parseInt(src.substr(i + 2, 2), 16)); i += 4; continue; }
                    if (e === "u" && /^[0-9a-fA-F]{4}$/.test(src.substr(i + 2, 4))) { tok.v += String.fromCharCode(parseInt(src.substr(i + 2, 4), 16)); i += 6; continue; }
                    tok.v += simple !== undefined ? simple : (e === undefined ? "" : e);
                    i += 2;
                    continue;
                }
                tok.v += src[i++];
            }
            i++;
            toks.push(tok);
            continue;
        }
        if (c === "`") {
            const tok = { t: "tpl", v: "", dynamic: false, line };
            i++;
            toks.push(tok);
            readTemplate(tok);
            continue;
        }
        if (c === "}" && stack.length && stack[stack.length - 1] === "`") {
            stack.pop();
            i++;
            const cont = { t: "tpl", v: "", dynamic: true, line, continuation: true };
            toks.push(cont);
            readTemplate(cont);
            continue;
        }
        if (c === "/" && regexAllowed()) {
            const start = i, startLine = line;
            let k = i + 1, inClass = false, ok = false;
            while (k < n) {
                const d = src[k];
                if (d === "\n") break;
                if (d === "\\") { k += 2; continue; }
                if (d === "[") inClass = true;
                else if (d === "]") inClass = false;
                else if (d === "/" && !inClass) { ok = true; break; }
                k++;
            }
            if (ok) {
                k++;
                while (k < n && /[a-z]/i.test(src[k])) k++;
                toks.push({ t: "re", v: src.slice(start, k), line: startLine });
                i = k;
                continue;
            }
        }
        if (isIdStart(c)) {
            let k = i + 1;
            while (k < n && isIdPart(src[k])) k++;
            toks.push({ t: "id", v: src.slice(i, k), line });
            i = k;
            continue;
        }
        if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] || ""))) {
            let k = i + 1;
            while (k < n && /[\w.]/.test(src[k])) k++;
            toks.push({ t: "num", v: src.slice(i, k), line });
            i = k;
            continue;
        }
        if (c === "{") stack.push("{");
        else if (c === "}") stack.pop();
        if (c === "." && src[i + 1] === "." && src[i + 2] === ".") { toks.push({ t: "p", v: "...", line }); i += 3; continue; }
        if (c === "?" && src[i + 1] === ".") { toks.push({ t: "p", v: "?.", line }); i += 2; continue; }
        toks.push({ t: "p", v: c, line });
        i++;
    }
    return toks;
}

// ---------------------------------------------------------------------------------------------
// Import extraction
// ---------------------------------------------------------------------------------------------

const isP = (tok, v) => tok && tok.t === "p" && tok.v === v;
const isId = (tok, v) => tok && tok.t === "id" && (v === undefined || tok.v === v);
const staticStr = tok => tok && (tok.t === "str" || (tok.t === "tpl" && !tok.dynamic));

// path.join(__dirname, "a", "b") / path.resolve(__dirname, ...) / __dirname + "/a" folded to "./a/b".
// Returns { spec, end } or null.
function foldDirname(toks, k) {
    const a = toks[k];
    if (isId(a, "path") && isP(toks[k + 1], ".") && (isId(toks[k + 2], "join") || isId(toks[k + 2], "resolve")) && isP(toks[k + 3], "(") &&
        isId(toks[k + 4], "__dirname")) {
        const parts = [];
        let j = k + 5;
        while (isP(toks[j], ",") && staticStr(toks[j + 1])) { parts.push(toks[j + 1].v); j += 2; }
        if (isP(toks[j], ",")) j++;               // trailing comma
        if (!isP(toks[j], ")")) return null;
        if (parts.some(p => path.posix.isAbsolute(p.replace(/\\/g, "/")) || /^[A-Za-z]:/.test(p))) return null;
        const joined = path.posix.join(".", ...parts.map(p => p.replace(/\\/g, "/")));
        return { spec: joined === ".." || joined.startsWith("../") ? joined : "./" + joined, end: j + 1, folded: true };
    }
    if (isId(a, "__dirname") && isP(toks[k + 1], "+") && staticStr(toks[k + 2])) {
        const s = toks[k + 2].v.replace(/\\/g, "/");
        if (!s.startsWith("/")) return null;
        return { spec: "." + s, end: k + 3, folded: true };
    }
    return null;
}

// Every module reference in a file: [{ line, kind: "require"|"import"|"export"|"dynamic-import", spec | null }].
function extractImports(src) {
    const toks = lex(src);
    const refs = [];
    for (let k = 0; k < toks.length; k++) {
        const tok = toks[k];
        if (tok.t !== "id") continue;
        const before = toks[k - 1];
        if (isP(before, ".") || isP(before, "?.")) continue;               // obj.require(...), import.meta
        if (tok.v === "require") {
            if (isId(before, "function") || !isP(toks[k + 1], "(")) continue;
            const arg = toks[k + 2];
            if (staticStr(arg) && isP(toks[k + 3], ")")) { refs.push({ line: tok.line, kind: "require", spec: arg.v }); continue; }
            const folded = arg ? foldDirname(toks, k + 2) : null;
            if (folded && isP(toks[folded.end], ")")) { refs.push({ line: tok.line, kind: "require", spec: folded.spec, folded: true }); continue; }
            refs.push({ line: tok.line, kind: "require", spec: null });
            continue;
        }
        if (tok.v === "import") {
            if (isP(toks[k + 1], ":")) continue;                             // { import: ... }
            if (isP(toks[k + 1], "(")) {
                const arg = toks[k + 2];
                if (staticStr(arg) && (isP(toks[k + 3], ")") || isP(toks[k + 3], ","))) refs.push({ line: tok.line, kind: "dynamic-import", spec: arg.v });
                else refs.push({ line: tok.line, kind: "dynamic-import", spec: null });
                continue;
            }
            if (staticStr(toks[k + 1])) { refs.push({ line: tok.line, kind: "import", spec: toks[k + 1].v }); continue; }
            for (let j = k + 1; j < Math.min(toks.length, k + 400); j++) {
                if (isP(toks[j], ";") || isId(toks[j], "import")) break;
                if (isId(toks[j], "from") && staticStr(toks[j + 1])) { refs.push({ line: tok.line, kind: "import", spec: toks[j + 1].v }); break; }
            }
            continue;
        }
        if (tok.v === "export") {
            for (let j = k + 1; j < Math.min(toks.length, k + 400); j++) {
                const t = toks[j];
                if (isP(t, ";") || isP(t, "=") || isP(t, "(") || (t.t === "id" && /^(?:function|class|const|let|var|default|async|export|import)$/.test(t.v))) break;
                if (isId(t, "from") && staticStr(toks[j + 1])) { refs.push({ line: tok.line, kind: "export", spec: toks[j + 1].v }); break; }
            }
        }
    }
    return refs;
}

// ---------------------------------------------------------------------------------------------
// Resolution against tracked files
// ---------------------------------------------------------------------------------------------

function builtinName(spec) {
    const bare = spec.startsWith("node:") ? spec.slice(5) : spec;
    const isBuiltin = typeof Module.isBuiltin === "function" ? Module.isBuiltin(spec) : Module.builtinModules.includes(bare);
    return isBuiltin ? bare.split("/")[0] : null;
}

// Does `rel` (a normalised repository-relative posix path) name a tracked file the way Node would
// load it (exact, with an extension, or as a folder with index.* or package.json main)?
function resolvesTracked(rel, tracked, blobText) {
    if (rel === "" || rel.startsWith("../") || rel === "..") return false;
    for (const ext of RESOLVE_EXTENSIONS) if (tracked.has(rel + ext)) return true;
    const pkg = rel + "/package.json";
    if (tracked.has(pkg)) {
        try {
            const main = JSON.parse(blobText(pkg)).main;
            if (typeof main === "string" && main && resolvesTracked(path.posix.normalize(rel + "/" + main), tracked, blobText)) return true;
        } catch (_) { /* unreadable package.json: fall through to index.* */ }
    }
    for (const ext of [".js", ".json", ".node"]) if (tracked.has(rel + "/index" + ext)) return true;
    return false;
}

// Classifies one reference. Returns { kind, severity: "finding"|"note"|"ok", detail }.
function classify(ref, file, tracked, blobText) {
    if (ref.spec === null) return { kind: "UNRESOLVED_DYNAMIC", severity: "note", detail: ref.kind + " with a computed argument (not guessed)" };
    const spec = ref.spec;
    const b = builtinName(spec);
    if (b !== null) {
        if (POLICY_BUILTINS.has(b)) return { kind: "BUILTIN", severity: "ok", detail: b };
        return { kind: "BUILTIN_OUTSIDE_POLICY", severity: "note", detail: spec + " (built-in, not in policy 2C's list)" };
    }
    if (NWJS_MODULES.has(spec)) {
        if (file.startsWith(GAME_DIR)) return { kind: "NWJS_MODULE", severity: "ok", detail: spec };
        return { kind: "NPM_REQUIRE", severity: "finding", detail: spec + " (an NW.js runtime module, outside the game)" };
    }
    const norm = spec.replace(/\\/g, "/");
    if (norm.startsWith("./") || norm.startsWith("../") || norm === "." || norm === "..") {
        // Node resolves against the file's folder. Game code also runs inside NW.js, which resolves
        // a page script's relative require against the app root game/ (where index.html is).
        const bases = [path.posix.dirname(file)];
        if (file.startsWith(GAME_DIR)) bases.push(GAME_DIR.slice(0, -1));
        for (const base of bases) {
            const rel = path.posix.normalize(path.posix.join(base, norm));
            if (resolvesTracked(rel === "." ? "" : rel, tracked, blobText)) return { kind: "RELATIVE", severity: "ok", detail: rel };
        }
        return { kind: "MISSING_RELATIVE", severity: "finding", detail: spec + " (no tracked file at " + bases.map(b0 => path.posix.normalize(path.posix.join(b0, norm))).join(" or ") + ")" };
    }
    if (path.posix.isAbsolute(norm) || /^[A-Za-z]:\//.test(norm) || norm.startsWith("file:")) {
        return { kind: "ABSOLUTE_REQUIRE", severity: "finding", detail: "absolute path (not portable, points outside the tracked tree)" };
    }
    return { kind: "NPM_REQUIRE", severity: "finding", detail: spec.split("/").slice(0, spec.startsWith("@") ? 2 : 1).join("/") + " (bare package name: not a built-in, not a project file)" };
}

// ---------------------------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------------------------

function inScope(p) {
    return (p.startsWith("tools/") || p.startsWith("game/js/")) && /\.(?:js|mjs|cjs)$/.test(p);
}

function checkNpmArtifacts(entries, blobText) {
    const out = [];
    for (const e of entries) {
        const parts = e.path.split("/");
        const base = parts[parts.length - 1];
        const inGame = e.path.startsWith(GAME_DIR);
        const sev = inGame ? "finding" : "note";
        if (parts.includes("node_modules")) {
            out.push({ kind: "NPM_ARTIFACT", severity: sev, path: e.path, line: 0, detail: "tracked node_modules/ content" });
        } else if (LOCKFILES.has(base)) {
            out.push({ kind: "NPM_ARTIFACT", severity: sev, path: e.path, line: 0, detail: "npm lockfile" });
        } else if (base === "package.json") {
            let doc;
            try { doc = JSON.parse(blobText(e.path)); } catch (err) {
                out.push({ kind: "NPM_ARTIFACT", severity: sev, path: e.path, line: 0, detail: "package.json does not parse, so its dependencies cannot be checked" });
                continue;
            }
            for (const f of DEP_FIELDS) {
                const v = doc && doc[f];
                if (v && typeof v === "object" && Object.keys(v).length) {
                    out.push({ kind: "NPM_ARTIFACT", severity: sev, path: e.path, line: 0, detail: "package.json " + f + ": " + Object.keys(v).sort().join(", ") });
                }
            }
        }
    }
    return out;
}

function checkRequires(entries, blobText, tracked) {
    const out = [];
    const stats = { files: 0, references: 0, builtins: {}, outsidePolicy: {} };
    for (const e of entries) {
        if (!inScope(e.path)) continue;
        const outOfScope = !e.path.endsWith(".js");
        stats.files++;
        for (const ref of extractImports(blobText(e.path))) {
            stats.references++;
            const c = classify(ref, e.path, tracked, blobText);
            if (c.kind === "BUILTIN") stats.builtins[c.detail] = (stats.builtins[c.detail] || 0) + 1;
            if (c.kind === "BUILTIN_OUTSIDE_POLICY") { const m = builtinName(ref.spec); stats.outsidePolicy[m] = (stats.outsidePolicy[m] || 0) + 1; }
            if (c.severity === "ok") continue;
            const sev = outOfScope ? "note" : c.severity;
            out.push({ kind: c.kind, severity: sev, path: e.path, line: ref.line, spec: ref.spec,
                       detail: c.detail + (ref.folded ? " [folded from a __dirname path]" : "") + (outOfScope && c.severity === "finding" ? " [outside the *.js scope: reported only]" : "") });
        }
    }
    return { items: out, stats };
}

// Known pre-existing require findings, keyed by path + kind + spec (line numbers move). A finding
// that matches an entry is BASELINED; an entry that matches nothing is STALE_BASELINE and fails
// (the checker always reads every in-scope file). Frozen-lib, npm-artifact and Node findings are
// never baselined.
function loadDepBaseline(file, explicit) {
    if (!fs.existsSync(file)) {
        if (explicit) throw new UsageError("dependency baseline not found: " + file);
        return [];
    }
    let doc;
    try { doc = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\s+/, "")); } catch (e) { throw new UsageError("dependency baseline " + file + ": " + e.message); }
    if (!doc || doc.schema !== DEP_BASELINE_SCHEMA || !Array.isArray(doc.entries)) {
        throw new UsageError("dependency baseline " + file + ": expected { \"schema\": \"" + DEP_BASELINE_SCHEMA + "\", \"entries\": [...] }");
    }
    const seen = new Set();
    doc.entries.forEach((e, i) => {
        const where = "dependency baseline entry " + i + ": ";
        if (!e || typeof e !== "object" || Array.isArray(e)) throw new UsageError(where + "not an object");
        if (Object.keys(e).sort().join(",") !== "kind,path,reason,spec") throw new UsageError(where + "needs exactly path, kind, spec, reason");
        if (!BASELINE_KINDS.has(e.kind)) throw new UsageError(where + "kind must be one of " + [...BASELINE_KINDS].join(", "));
        if (typeof e.path !== "string" || !e.path || typeof e.spec !== "string" || !e.spec) throw new UsageError(where + "path and spec must be non-empty strings");
        if (typeof e.reason !== "string" || e.reason.trim().length < 10) throw new UsageError(where + "reason must say why (10+ characters)");
        const key = e.path + "\0" + e.kind + "\0" + e.spec;
        if (seen.has(key)) throw new UsageError(where + "duplicate of an earlier entry");
        seen.add(key);
    });
    return doc.entries;
}

function applyDepBaseline(items, entries) {
    const used = new Set();
    for (const it of items) {
        if (it.severity !== "finding" || !BASELINE_KINDS.has(it.kind)) continue;
        const i = entries.findIndex(e => e.path === it.path && e.kind === it.kind && e.spec === it.spec);
        if (i < 0) continue;
        used.add(i);
        it.severity = "baselined";
        it.reason = entries[i].reason;
    }
    return entries.filter((e, i) => !used.has(i)).map(e => ({
        kind: "STALE_BASELINE", severity: "finding", path: e.path, line: 0, spec: e.spec,
        detail: "dependency baseline entry " + e.kind + " " + JSON.stringify(e.spec) + " matches nothing (reason: " + e.reason + ")"
    }));
}

function loadLibsBaseline(file, explicit) {
    if (!fs.existsSync(file)) throw new UsageError("libs baseline not found: " + file + (explicit ? "" : " (make one with --make-libs-baseline <commit>)"));
    let doc;
    try { doc = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\s+/, "")); } catch (e) { throw new UsageError("libs baseline " + file + ": " + e.message); }
    if (!doc || doc.schema !== LIBS_BASELINE_SCHEMA || typeof doc.files !== "object" || doc.files === null || Array.isArray(doc.files)) {
        throw new UsageError("libs baseline " + file + ": expected { \"schema\": \"" + LIBS_BASELINE_SCHEMA + "\", \"files\": { <path>: <sha256> } }");
    }
    for (const [p, h] of Object.entries(doc.files)) {
        if (!p.startsWith(LIBS_DIR)) throw new UsageError("libs baseline: " + p + " is not under " + LIBS_DIR);
        if (typeof h !== "string" || !/^[0-9a-f]{64}$/.test(h)) throw new UsageError("libs baseline: " + p + " needs a 64-hex sha256");
    }
    if (Object.keys(doc.files).length === 0) throw new UsageError("libs baseline " + file + ": no files listed");
    return doc;
}

function checkLibs(root, entries, blobs, baseline) {
    const out = [];
    const now = new Map(entries.filter(e => e.path.startsWith(LIBS_DIR)).map(e => [e.path, sha256(blobs.get(e.sha))]));
    for (const [p, h] of Object.entries(baseline.files)) {
        if (!now.has(p)) out.push({ kind: "LIBS_CHANGED", severity: "finding", path: p, line: 0, detail: "frozen lib removed (baseline " + h.slice(0, 12) + ")" });
        else if (now.get(p) !== h) out.push({ kind: "LIBS_CHANGED", severity: "finding", path: p, line: 0, detail: "frozen lib changed (sha256 " + now.get(p).slice(0, 12) + ", baseline " + h.slice(0, 12) + ")" });
    }
    for (const p of now.keys()) {
        if (!(p in baseline.files)) out.push({ kind: "LIBS_CHANGED", severity: "finding", path: p, line: 0, detail: "file added to the frozen libs folder" });
    }
    // Uncommitted edits, deletions and new files in the frozen folder (git's own view, so line-ending
    // conversion is not a change).
    const st = git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--", LIBS_DIR]).toString("utf8").split("\0").filter(Boolean);
    for (const rec of st) {
        out.push({ kind: "LIBS_WORKTREE_CHANGED", severity: "finding", path: rec.slice(3), line: 0, detail: "working tree differs from HEAD (git status " + JSON.stringify(rec.slice(0, 2)) + ")" });
    }
    return { items: out, count: now.size };
}

function checkNodeVersion(version) {
    const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(version));
    if (!m) return { kind: "NODE_TOO_OLD", severity: "finding", path: "(node)", line: 0, detail: "cannot read the Node version " + JSON.stringify(version) };
    if (Number(m[1]) < MIN_NODE_MAJOR) return { kind: "NODE_TOO_OLD", severity: "finding", path: "(node)", line: 0, detail: "node v" + m[0].replace(/^v/, "") + " is below the policy minimum v" + MIN_NODE_MAJOR + ".0.0" };
    return null;
}

function makeLibsBaseline(root, rev) {
    const commit = git(root, ["rev-parse", "--verify", "--quiet", "--end-of-options", rev + "^{commit}"]).toString("utf8").trim();
    const entries = treeEntries(root, commit).filter(e => e.path.startsWith(LIBS_DIR));
    if (entries.length === 0) throw new UsageError("no files under " + LIBS_DIR + " at " + commit);
    const blobs = readBlobs(root, entries.map(e => e.sha));
    const files = {};
    for (const e of entries.sort((a, b) => (a.path < b.path ? -1 : 1))) files[e.path] = sha256(blobs.get(e.sha));
    return {
        schema: LIBS_BASELINE_SCHEMA,
        about: "sha256 of every tracked file under " + LIBS_DIR + " at the baseline commit (docs/DEPENDENCY_POLICY.md 2B: frozen). Made by node tools/security/check_dependencies.js --make-libs-baseline " + commit + ".",
        commit,
        files
    };
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

function parseArgs(argv) {
    const o = { json: false, libsBaseline: null, depBaseline: null, make: null };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--json") o.json = true;
        else if (a === "--libs-baseline") { o.libsBaseline = argv[++i]; if (o.libsBaseline === undefined) throw new UsageError("--libs-baseline needs a file"); }
        else if (a === "--baseline") { o.depBaseline = argv[++i]; if (o.depBaseline === undefined) throw new UsageError("--baseline needs a file"); }
        else if (a === "--make-libs-baseline") { o.make = argv[++i]; if (o.make === undefined || o.make.startsWith("-")) throw new UsageError("--make-libs-baseline needs a commit"); }
        else if (a === "-h" || a === "--help") o.help = true;
        else throw new UsageError("unknown argument " + JSON.stringify(a));
    }
    return o;
}

function main(argv, cwd = process.cwd(), env = {}) {
    const out = s => process.stdout.write(s + "\n");
    let o;
    try {
        o = parseArgs(argv);
        if (o.help) { out("usage: node tools/security/check_dependencies.js [--json] [--libs-baseline <file>] [--baseline <file>] | --make-libs-baseline <commit>"); return 0; }
        const root = git(cwd, ["rev-parse", "--show-toplevel"]).toString("utf8").trim();
        if (o.make) { out(JSON.stringify(makeLibsBaseline(root, o.make), null, 2)); return 0; }
        const baseFile = o.libsBaseline ? path.resolve(cwd, o.libsBaseline) : path.join(root, DEFAULT_LIBS_BASELINE);
        const baseline = loadLibsBaseline(baseFile, !!o.libsBaseline);
        const depFile = o.depBaseline ? path.resolve(cwd, o.depBaseline) : path.join(root, DEFAULT_DEP_BASELINE);
        const depEntries = loadDepBaseline(depFile, !!o.depBaseline);
        const head = git(root, ["rev-parse", "--verify", "HEAD^{commit}"]).toString("utf8").trim();
        const entries = treeEntries(root, head);
        const tracked = new Set(entries.map(e => e.path));
        const wanted = entries.filter(e => inScope(e.path) || e.path.startsWith(LIBS_DIR) || /(?:^|\/)(?:package\.json)$/.test(e.path));
        const blobs = readBlobs(root, wanted.map(e => e.sha));
        const byPath = new Map(entries.map(e => [e.path, e.sha]));
        const blobText = p => { const b = blobs.get(byPath.get(p)); return b ? b.toString("utf8") : ""; };

        const items = [];
        items.push(...checkNpmArtifacts(entries, blobText));
        const req = checkRequires(entries, blobText, tracked);
        items.push(...req.items);
        const libs = checkLibs(root, entries, blobs, baseline);
        items.push(...libs.items);
        const nodeVersion = env.nodeVersion || process.version;
        const nodeItem = checkNodeVersion(nodeVersion);
        if (nodeItem) items.push(nodeItem);
        items.push(...applyDepBaseline(items, depEntries));

        const order = (a, b) => a.kind.localeCompare(b.kind) || a.path.localeCompare(b.path) || a.line - b.line;
        const findings = items.filter(x => x.severity === "finding").sort(order);
        const baselined = items.filter(x => x.severity === "baselined").sort(order);
        const notes = items.filter(x => x.severity === "note").sort(order);
        const code = findings.length ? 1 : 0;
        const byKind = list => list.reduce((m, x) => { m[x.kind] = (m[x.kind] || 0) + 1; return m; }, {});
        if (o.json) {
            out(JSON.stringify({
                tool: "check_dependencies", schema: "deus.check_dependencies.v1", head, node: nodeVersion,
                jsFilesChecked: req.stats.files, references: req.stats.references, policyBuiltins: req.stats.builtins,
                builtinsOutsidePolicy: req.stats.outsidePolicy, libsChecked: libs.count, libsBaselineCommit: baseline.commit || null,
                findingsByKind: byKind(findings), baselinedByKind: byKind(baselined), notesByKind: byKind(notes), findings, baselined, notes, exitCode: code
            }, null, 2));
            return code;
        }
        for (const f of findings) out("FINDING " + f.kind + " " + f.path + (f.line ? ":" + f.line : "") + " " + f.detail);
        for (const f of baselined) out("BASELINED " + f.kind + " " + f.path + (f.line ? ":" + f.line : "") + " " + f.detail + " reason: " + f.reason);
        for (const f of notes) out("NOTE " + f.kind + " " + f.path + (f.line ? ":" + f.line : "") + " " + f.detail);
        const kv = obj => Object.keys(obj).sort().map(k => k + "=" + obj[k]).join(" ") || "none";
        out("NODE " + nodeVersion + " (policy minimum v" + MIN_NODE_MAJOR + ".0.0)");
        out("BUILTINS in policy: " + kv(req.stats.builtins));
        out("BUILTINS outside policy (reported, not failed): " + kv(req.stats.outsidePolicy));
        out("LIBS " + libs.count + " files under " + LIBS_DIR + " checked against " + path.relative(root, baseFile).split(path.sep).join("/") +
            (baseline.commit ? " (" + baseline.commit.slice(0, 12) + ")" : ""));
        out("RESULT: HEAD " + head.slice(0, 12) + ", " + req.stats.files + " script files, " + req.stats.references + " module references, " +
            findings.length + " findings (" + kv(byKind(findings)) + "), " + baselined.length + " baselined (" + kv(byKind(baselined)) + "), " +
            notes.length + " notes (" + kv(byKind(notes)) + ")");
        return code;
    } catch (e) {
        if (!(e instanceof UsageError)) throw e;
        process.stderr.write("check_dependencies: " + e.message + "\n");
        if (o && o.json) out(JSON.stringify({ tool: "check_dependencies", error: e.message, exitCode: 2 }));
        return 2;
    }
}

module.exports = { main, lex, extractImports, classify, builtinName, checkNodeVersion, makeLibsBaseline, POLICY_BUILTINS, MIN_NODE_MAJOR };

if (require.main === module) {
    try { process.exitCode = main(process.argv.slice(2)); } catch (e) { process.stderr.write("check_dependencies: internal error: " + (e && e.stack || e) + "\n"); process.exitCode = 2; }
}
