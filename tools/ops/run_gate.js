#!/usr/bin/env node
"use strict";

/**
 * tools/ops/run_gate.js
 *
 * OPS.30.01 (Lane Y): the GATE suite runner and the measured quarantine census. It replaces the file-name
 * heuristic of tools/classify_tests.js with exit codes measured on a checkout. No npm dependencies.
 *
 * Modes
 *   (default)       node tools/ops/run_gate.js [--root <dir>] [--gate-list <file>] [--timeout <sec>] [--log-dir <dir>]
 *                   Runs every suite in the "gate" array of tools/ops/gate_tests.json (the gate list the merge
 *                   gate reads), one after another, as `node <suite>` with no shell, cwd = the root, each with its
 *                   own timeout. Prints "GATE <suite> EXIT=<n> <ms>ms" per suite, then "RESULT: <n> passed, <m> failed".
 *                   --suite <path> (repeatable) runs the named suites instead of the gate list.
 *   --census        node tools/ops/run_gate.js --census --out <file> [--root <dir>] [--timeout <sec>]
 *                   [--concurrency <1-3>] [--log-dir <dir>] [--budget-sec <sec>] [--suite <path> ...]
 *                   Measures every tracked suite (git ls-files: tools/test_*.js and test_*.js in any folder under
 *                   tools/, plus the gate entries) and writes one row per suite to --out (JSON): category, the line
 *                   that decided it, exit code, duration. With --budget-sec it starts no suite after that many
 *                   seconds and writes a partial census (exit 3); running the same command again resumes it.
 *   --check-lists   node tools/ops/run_gate.js --check-lists [--root <dir>] [--gate-list <file>] [--quarantine <file>]
 *                   Runs no suite. Validates gate_tests.json and quarantine.json (schema, duplicates, paths, overlap,
 *                   every tracked suite listed exactly once, NEEDS_NWJS consistency); exit 1 on any violation.
 *   --merge-census  node tools/ops/run_gate.js --merge-census <census.json>... --write-quarantine <file> --base <sha>
 *                   [--runs <n>]
 *                   Builds tools/ops/quarantine.json from complete census runs (each suite measured --runs times,
 *                   default 3) and reports where the runs disagree.
 *   --screen        node tools/ops/run_gate.js --screen [--root <dir>] [--suite <path> ...]
 *                   Runs no suite: prints the NEEDS_NWJS static screen verdict and evidence for every suite.
 *
 * Categories (each suite gets exactly one; the deciding line is stored with it)
 *   NEEDS_NWJS               the static screen below found the NW.js harness: the suite is never run. Also given when
 *                            the runtime guard blocked a harness launch the screen could not see.
 *   KILLED_TIMEOUT           still running at the timeout; killed together with its whole process tree.
 *   PASS                     exit code 0.
 *   Any other exit: the deciding line is the first candidate line of stderr that matches a rule below (rules tried in
 *   this order on each line, lines in the order printed). When stderr has no candidate line at all, stdout is used
 *   the same way. The first matching rule gives the category:
 *   FAIL_MISSING_REFERENCE   "Cannot find module '<...>/js/plugins/<...>'" (a missing plugin)
 *   FAIL_MISSING_DEPENDENCY  "Cannot find module", MODULE_NOT_FOUND, ERR_MODULE_NOT_FOUND (a module or local file the
 *                            suite requires); "spawn <program> ENOENT" (a missing program)
 *   FAIL_MISSING_REFERENCE   ENOENT or "no such file or directory" (a data, fixture or asset path); "plugin ...
 *                            missing / not found / not registered", "missing plugin", "unknown plugin"
 *   FAIL_API_DRIFT           TypeError, "is not a function", "is not a constructor", "Cannot read/set properties of
 *                            undefined/null", "is not iterable". The census cannot tell whether the undefined value
 *                            came from a project module or from the suite's own code; OPS.30.04 triage decides.
 *   FAIL_OTHER               no rule matched. The deciding line is the first candidate stderr line, else the first
 *                            stdout line containing FAIL or error, else the last stdout line.
 *   Candidate lines leave out blank lines, stack frames ("at ...:<line>:<col>"), node's error-location header (the
 *   file:line line, the source line and the caret line), "(node:<pid>)" warnings, the "Node.js v<n>" footer and lines
 *   starting with PASS or ok. Paths of the root and of the run's scratch folder are shown as <root> and <tmp>.
 *
 * NEEDS_NWJS static screen (before anything is spawned; another lane may be running NW.js on this machine)
 *   Harness names: nw.exe, nwjs, run_tests, test_snapshot, Game.exe; case-insensitive, and not preceded by a letter,
 *   digit or underscore (so "NEEDS_NWJS" and "Utils.isNwjs" do not count).
 *   From the suite the screen follows, transitively:
 *     - literal require()/import() of a relative or absolute path (as is, .js, .cjs, .mjs, /index.js), from any file;
 *     - path-like tokens ending in .js/.cjs/.mjs/.bat/.cmd/.ps1/.sh anywhere in the text (a helper spawned as
 *       `node tools/x.js`, or required through path.join), matched by file name against every tracked script, from
 *       the suite itself, files under tools/, shell scripts and any file that uses child_process. Other files
 *       (game plugins) can start nothing, so only their literal requires are followed.
 *   The suite is NEEDS_NWJS when a harness name appears in:
 *     - the suite's own path or text (code or comment);
 *     - the path or text of a reached file under tools/, or of a reached .bat/.cmd/.ps1/.sh script;
 *     - the text of any other reached file that also uses child_process (at 425b594c no game/ file does; the
 *       plugins name the harness in comments only).
 *   Not followed (SCREEN_NOT_FOLLOWED): this runner, which names the harness in these tables and never starts it,
 *   and tools/ops/fixtures/run_gate/, whose sources run only inside synthetic repos built by test_run_gate.js, where
 *   each is screened again as a suite.
 *   Paths built at run time ("tools/" + name + ".js") are invisible to a text screen, hence the second line:
 * Runtime guard
 *   Every suite runs with NODE_OPTIONS=--require <guard>, a preload that wraps child_process (spawn, spawnSync, exec,
 *   execSync, execFile, execFileSync, fork) and throws instead of starting the process when the command or its
 *   arguments name the harness, or the program is nw / nw.exe / Game.exe. git commands are let through (they read
 *   files; they start nothing). Node processes the suite starts inherit the guard through NODE_OPTIONS unless the
 *   suite drops that variable. A blocked launch makes the suite NEEDS_NWJS, deciding line from the guard log.
 *
 * Suite environment and processes
 *   The runner's environment minus GIT_DIR-style variables (as merge_gate.js), NODE_PATH and NODE_OPTIONS, plus:
 *   TEMP/TMP/TMPDIR = a fresh folder per suite (suites never share or delete each other's temp files, nor another
 *   lane's; removed afterwards), NODE_OPTIONS = the guard, GIT_TERMINAL_PROMPT=0, GCM_INTERACTIVE=never.
 *   Suites run with child_process.spawn and file stdio, not spawnSync: on Windows spawnSync's timeout ends only the
 *   direct child. At the timeout the runner kills the whole tree (taskkill /T /F; POSIX: the process group). After a
 *   run it lists processes and kills leftovers it started: children of a suite created while that suite ran, their
 *   descendants, and any process whose command line names the run's scratch folder. Processes that only name the
 *   root are reported, never killed. At most 3 suites run at once.
 *
 * quarantine.json (schemaVersion 1)
 *   { schemaVersion, baseCommit (40 hex), measuredAt ("YYYY-MM-DD", US Central date, no clock), timeoutSec,
 *     concurrency, runs?, suites: [{ path, category (not PASS), firstErrorLine, exitCode (integer or null), ms (or
 *     null), owner (null or a name), flaky?, runCategories?, measuredOn? }], passingNotGated: [{ path, ms,
 *     measuredOn? }] }
 *   suites is the quarantine: every tracked suite that is not in the gate list and did not pass in every run.
 *   passingNotGated holds the suites that passed in every run and are not in the gate list. measuredOn names the
 *   commit a suite was measured on when that is not baseCommit (a suite added after it).
 *
 * Exit codes
 *   gate          0 every suite exited 0; 1 a suite failed or timed out; 2 usage or list error, or a NEEDS_NWJS suite
 *                 was named (nothing is run) or tried to start the harness.
 *   --census      0 complete; 3 partial (budget reached); 2 usage error, or --suite named a NEEDS_NWJS suite.
 *   --check-lists 0 no violation; 1 violations; 2 usage error.
 *   --merge-census 0 written; 2 usage error or inconsistent runs.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const IS_WIN = process.platform === "win32";
const SYSROOT = process.env.SystemRoot || process.env.SYSTEMROOT || "C:\\Windows";
const GATE_LIST = "tools/ops/gate_tests.json";
const QUARANTINE_LIST = "tools/ops/quarantine.json";
const SUITE_PATHSPECS = [":(glob)tools/test_*.js", ":(glob)tools/**/test_*.js"];
const DEFAULT_TIMEOUT_SEC = 180;
const MAX_CONCURRENCY = 3;
const KILL_WAIT_MS = 15000;
const READ_HEAD = 512 * 1024, READ_TAIL = 64 * 1024;   // how much of a stream the classifier reads
const SAVE_HEAD = 48 * 1024, SAVE_TAIL = 16 * 1024;    // how much of a stream --log-dir keeps
const QUARANTINE_SCHEMA_VERSION = 1;
const CENSUS_KIND = "run_gate census";
const CENSUS_SCHEMA_VERSION = 1;

const CATEGORIES = ["PASS", "FAIL_MISSING_DEPENDENCY", "FAIL_API_DRIFT", "FAIL_MISSING_REFERENCE", "FAIL_OTHER", "KILLED_TIMEOUT", "NEEDS_NWJS"];

// Failure rules, tried in this order on each candidate line (see the header).
const RULES = [
    { id: "missing_plugin_module", category: "FAIL_MISSING_REFERENCE", re: /Cannot find module ['"][^'"]*[\\/]js[\\/]plugins[\\/]/i },
    { id: "module_not_found", category: "FAIL_MISSING_DEPENDENCY", re: /\bCannot find module\b|\bMODULE_NOT_FOUND\b|\bERR_MODULE_NOT_FOUND\b/ },
    { id: "missing_program", category: "FAIL_MISSING_DEPENDENCY", re: /\bspawn(?:Sync)? \S+ ENOENT\b/ },
    { id: "enoent", category: "FAIL_MISSING_REFERENCE", re: /\bENOENT\b|no such file or directory/i },
    { id: "missing_plugin", category: "FAIL_MISSING_REFERENCE", re: /\bplugin\b[^.]{0,80}\b(?:missing|not found|not registered)\b|\b(?:missing|unknown) plugin\b/i },
    { id: "api_drift", category: "FAIL_API_DRIFT", re: /\bTypeError\b|\bis not a function\b|\bis not a constructor\b|\bCannot (?:read|set) propert(?:y|ies) of (?:undefined|null)\b|\bis not iterable\b/ }
];

// The NW.js harness (see the header). Shared with the runtime guard.
const HARNESS_RE = /(?<![A-Za-z0-9_])(?:nw\.exe|nwjs|run_tests|test_snapshot|game\.exe)/i;
const HARNESS_PROGRAMS = ["nw", "nw.exe", "nwjs", "game.exe"];
const SPAWNS_RE = /child_process|process\.binding\s*\(|internalBinding\s*\(/;
const SCRIPT_RE = /\.(?:c?js|mjs|bat|cmd|ps1|sh)$/i;
const SHELL_SCRIPT_RE = /\.(?:bat|cmd|ps1|sh)$/i;
const REQUIRE_RE = /\b(?:require|import)\s*\(\s*(["'`])([^"'`\r\n]+)\1|\bfrom\s+(["'])([^"'\r\n]+)\3/g;
const SCREEN_NOT_FOLLOWED = [/^tools\/ops\/run_gate\.js$/i, /^tools\/ops\/fixtures\/run_gate\//i];

const GUARD_SOURCE = `"use strict";
// Written by tools/ops/run_gate.js and preloaded into every suite it runs (NODE_OPTIONS=--require).
// It refuses to start the NW.js harness: see "Runtime guard" in run_gate.js.
(function () {
    const cp = require("child_process");
    const fs = require("fs");
    const path = require("path");
    const NAMES = new RegExp(${JSON.stringify(HARNESS_RE.source)}, "i");
    const PROGRAMS = ${JSON.stringify(HARNESS_PROGRAMS)};
    const log = process.env.RUN_GATE_GUARD_LOG;
    function refuse(fn, text) {
        const msg = "RUN_GATE_GUARD: blocked " + fn + "(" + text.slice(0, 200) + "): run_gate.js never starts the NW.js harness";
        try { if (log) fs.appendFileSync(log, msg + "\\n"); } catch (_) { /* the throw still stops it */ }
        const e = new Error(msg);
        e.code = "RUN_GATE_GUARD";
        throw e;
    }
    function check(fn, file, args) {
        const f = String(file == null ? "" : file);
        if (fn === "exec" || fn === "execSync") { if (NAMES.test(f)) refuse(fn, f); return; }
        const program = path.basename(f.replace(/^"+|"+$/g, "")).toLowerCase();
        if (program === "git" || program === "git.exe") return;
        const text = [f].concat(Array.isArray(args) ? args.map(String) : []).join(" ");
        if (PROGRAMS.indexOf(program) >= 0 || NAMES.test(text)) refuse(fn, text);
    }
    ["spawn", "spawnSync", "execFile", "execFileSync", "exec", "execSync", "fork"].forEach(function (fn) {
        const orig = cp[fn];
        if (typeof orig !== "function") return;
        const wrapped = function (file, args) { check(fn, file, args); return orig.apply(this, arguments); };
        for (const key of Reflect.ownKeys(orig)) {
            if (key === "length" || key === "name" || key === "prototype" || key === "arguments" || key === "caller") continue;
            try { Object.defineProperty(wrapped, key, Object.getOwnPropertyDescriptor(orig, key)); } catch (_) { /* keep going */ }
        }
        cp[fn] = wrapped;
    });
    try { require("module").syncBuiltinESMExports(); } catch (_) { /* older node */ }
})();
`;

class UsageError extends Error {}

const USAGE = `usage:
  node tools/ops/run_gate.js [--root <dir>] [--gate-list <file> | --suite <path> ...] [--timeout <sec>] [--log-dir <dir>]
  node tools/ops/run_gate.js --census --out <file> [--root <dir>] [--timeout <sec>] [--concurrency <1-3>]
                             [--log-dir <dir>] [--budget-sec <sec>] [--suite <path> ...]
  node tools/ops/run_gate.js --check-lists [--root <dir>] [--gate-list <file>] [--quarantine <file>]
  node tools/ops/run_gate.js --merge-census <census.json>... --write-quarantine <file> --base <sha> [--runs <n>]
  node tools/ops/run_gate.js --screen [--root <dir>] [--suite <path> ...]`;

// ---------------------------------------------------------------- small helpers

const GIT_ENV = (() => {
    const env = Object.assign({}, process.env);
    for (const k of Object.keys(env)) {
        if (/^GIT_(DIR|WORK_TREE|INDEX_FILE|PREFIX|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|NAMESPACE|QUARANTINE_PATH)$/i.test(k)) delete env[k];
    }
    env.GIT_TERMINAL_PROMPT = "0";
    env.GCM_INTERACTIVE = "never";
    return env;
})();

function git(root, args) {
    const r = spawnSync("git", ["-c", "core.quotepath=off", ...args], { cwd: root, encoding: "utf8", env: GIT_ENV, maxBuffer: 256 * 1024 * 1024, windowsHide: true });
    return r.status === 0 && !r.error ? r.stdout : null;
}

function gitHead(root) {
    const out = git(root, ["rev-parse", "--verify", "HEAD"]);
    return out ? out.trim() : null;
}

function gitFiles(root, pathspecs) {
    const out = git(root, ["ls-files", "-z", "--", ...pathspecs]);
    return out === null ? null : out.split("\0").filter(Boolean);
}

function walkFiles(root) {
    const out = [];
    const walk = rel => {
        let entries;
        try { entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch (_) { return; }
        for (const e of entries) {
            if (e.name === ".git" || e.name === "node_modules") continue;
            const r = rel ? `${rel}/${e.name}` : e.name;
            if (e.isDirectory()) walk(r); else if (e.isFile()) out.push(r);
        }
    };
    walk("");
    return out;
}

function isFile(p) { try { return fs.statSync(p).isFile(); } catch (_) { return false; } }
function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch (_) { return false; } }
function stripBom(s) { return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s; }
function keyOf(p) { return String(p).toLowerCase(); }

// A repo-relative path with forward slashes, or null when it is absolute or leaves the repo.
function normRel(p) {
    let s = String(p).trim().replace(/\\/g, "/");
    while (s.startsWith("./")) s = s.slice(2);
    if (!s || s.startsWith("/") || /^[A-Za-z]:/.test(s) || s.split("/").some(seg => seg === ".." || seg === "" || seg === ".")) return null;
    return s;
}

function duplicates(list) {
    const seen = new Set(), dup = new Set();
    for (const p of list) { const k = keyOf(p); if (seen.has(k)) dup.add(p); else seen.add(k); }
    return [...dup];
}

function uniq(list) {
    const seen = new Set(), out = [];
    for (const p of list) { const k = keyOf(p); if (!seen.has(k)) { seen.add(k); out.push(p); } }
    return out;
}

// US Central calendar date (quarantine.json measuredAt: date only, no clock).
function ctDate(d) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function readCapped(file, head, tail) {
    let fd;
    try {
        fd = fs.openSync(file, "r");
        const size = fs.fstatSync(fd).size;
        if (size <= head + tail) {
            const b = Buffer.alloc(size);
            fs.readSync(fd, b, 0, size, 0);
            return b.toString("utf8");
        }
        const h = Buffer.alloc(head), t = Buffer.alloc(tail);
        fs.readSync(fd, h, 0, head, 0);
        fs.readSync(fd, t, 0, tail, size - tail);
        return `${h.toString("utf8")}\n... [${size - head - tail} bytes not shown by run_gate.js] ...\n${t.toString("utf8")}`;
    } catch (_) {
        return "";
    } finally {
        if (fd !== undefined) fs.closeSync(fd);
    }
}

function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    const tmp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n");
    fs.renameSync(tmp, file);
}

function readJsonFile(file) {
    return JSON.parse(stripBom(fs.readFileSync(file, "utf8")));
}

function pathPattern(p) {
    const parts = path.resolve(p).split(/[\\/]+/).filter(Boolean).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(parts.join("[\\\\/]+"), "gi");
}

function namesPath(text, p) {
    return pathPattern(p).test(String(text || ""));
}

// ---------------------------------------------------------------- NEEDS_NWJS static screen

function harnessHits(text, max) {
    const hits = [];
    const re = new RegExp(HARNESS_RE.source, "gi");
    let m;
    while ((m = re.exec(text)) && hits.length < (max || 3)) {
        const start = text.lastIndexOf("\n", m.index) + 1;
        let end = text.indexOf("\n", m.index);
        if (end < 0) end = text.length;
        let line = 1;
        for (let i = text.indexOf("\n"); i >= 0 && i < m.index; i = text.indexOf("\n", i + 1)) line++;
        hits.push({ token: m[0], line, text: text.slice(start, end).trim().slice(0, 160) });
    }
    return hits;
}

// Path-like tokens ending in a script extension, found by scanning back from each extension (linear time).
function refTokens(text) {
    const out = new Set();
    const re = /\.(?:c?js|mjs|bat|cmd|ps1|sh)(?![A-Za-z0-9_])/gi;
    let m;
    while ((m = re.exec(text))) {
        let s = m.index;
        const stop = Math.max(0, m.index - 260);
        while (s > stop && /[A-Za-z0-9_.\-/\\]/.test(text[s - 1])) s--;
        const tok = text.slice(s, m.index + m[0].length).replace(/\\+/g, "/");
        if (/[A-Za-z0-9_-]\.[A-Za-z0-9]+$/.test(tok)) out.add(tok);
    }
    return out;
}

function relInside(root, dir, spec) {
    const s = String(spec).replace(/\\+/g, "/");
    const abs = /^[A-Za-z]:\//.test(s) || s.startsWith("/") ? path.resolve(s) : path.resolve(root, dir, s);
    const rel = path.relative(root, abs);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
    return rel.split(path.sep).join("/");
}

function makeScreen(root, files) {
    const byKey = new Map(), byBase = new Map();
    for (const rel of files) {
        if (!SCRIPT_RE.test(rel)) continue;
        byKey.set(keyOf(rel), rel);
        const b = keyOf(path.posix.basename(rel));
        if (!byBase.has(b)) byBase.set(b, []);
        byBase.get(b).push(rel);
    }
    const cache = new Map();
    const notFollowed = rel => SCREEN_NOT_FOLLOWED.some(re => re.test(rel));

    function info(rel) {
        const k = keyOf(rel);
        if (cache.has(k)) return cache.get(k);
        let text = "";
        try { text = fs.readFileSync(path.join(root, rel), "latin1"); } catch (_) { /* unreadable: nothing to follow */ }
        const i = { rel, hits: harnessHits(text), pathHits: harnessHits(rel), spawns: SPAWNS_RE.test(text), text, refs: {} };
        cache.set(k, i);
        return i;
    }

    // Files a suite can reach from rel; tokens only from files that can start or dynamically load a script.
    function refs(i, isSuite) {
        const tokens = isSuite || keyOf(i.rel).startsWith("tools/") || SHELL_SCRIPT_RE.test(i.rel) || i.spawns;
        if (i.refs[tokens]) return i.refs[tokens];
        const out = new Set();
        const self = keyOf(i.rel);
        const dir = path.posix.dirname(i.rel);
        const add = cand => {
            if (!cand) return;
            const hit = byKey.get(keyOf(cand));
            if (hit && keyOf(hit) !== self) out.add(hit);
        };
        for (const m of i.text.matchAll(REQUIRE_RE)) {
            const spec = m[2] || m[4];
            if (!/^(?:\.{1,2}[\\/]|[\\/]|[A-Za-z]:[\\/])/.test(spec)) continue;
            const base = relInside(root, dir, spec);
            if (base) for (const ext of ["", ".js", ".cjs", ".mjs", "/index.js"]) add(base + ext);
        }
        if (tokens) {
            for (const tok of refTokens(i.text)) {
                add(relInside(root, dir, tok));
                for (const r of byBase.get(keyOf(path.posix.basename(tok))) || []) if (keyOf(r) !== self) out.add(r);
            }
        }
        i.refs[tokens] = [...out].sort();
        return i.refs[tokens];
    }

    function flag(i, isSuite) {
        if (isSuite || keyOf(i.rel).startsWith("tools/") || SHELL_SCRIPT_RE.test(i.rel)) {
            if (i.pathHits.length) return Object.assign({}, i.pathHits[0], { line: 0, text: "(the file's own path)" });
            if (i.hits.length) return i.hits[0];
        } else if (i.spawns && i.hits.length) {
            return i.hits[0];
        }
        return null;
    }

    function screen(rel) {
        const start = normRel(rel) || String(rel);
        const seen = new Set([keyOf(start)]);
        const queue = [[start]];
        while (queue.length) {
            const chain = queue.shift();
            const i = info(chain[chain.length - 1]);
            const isSuite = chain.length === 1;
            const hit = flag(i, isSuite);
            if (hit) return { needsNwjs: true, chain, hit };
            for (const r of refs(i, isSuite)) {
                if (seen.has(keyOf(r)) || notFollowed(r)) continue;
                seen.add(keyOf(r));
                queue.push(chain.concat(r));
            }
        }
        return { needsNwjs: false, chain: [start], reached: seen.size };
    }

    return { screen };
}

function screenLine(sc) {
    const h = sc.hit;
    return `static screen: ${sc.chain.join(" -> ")}${h.line ? `:${h.line}` : ""} names "${h.token}": ${h.text}`;
}

function screenFiles(root) {
    const tracked = gitFiles(root, []);
    return tracked || walkFiles(root);
}

// ---------------------------------------------------------------- lists

function readGateList(file) {
    const r = { file, gate: [], quarantine: [], errors: [] };
    let j;
    try { j = readJsonFile(file); } catch (e) {
        r.errors.push(`${file}: ${e.code === "ENOENT" ? "missing" : `not valid JSON: ${e.message}`}`);
        return r;
    }
    if (!j || typeof j !== "object" || Array.isArray(j)) { r.errors.push(`${file}: must be a JSON object`); return r; }
    if (!Array.isArray(j.gate)) r.errors.push(`${file}: "gate" must be an array of suite paths`);
    else j.gate.forEach((g, n) => {
        const p = typeof g === "string" ? normRel(g) : null;
        if (!p) r.errors.push(`${file}: gate[${n}] must be a relative path inside the repo (got ${JSON.stringify(g)})`);
        else r.gate.push(p);
    });
    if (j.quarantine !== undefined) {
        if (!Array.isArray(j.quarantine)) r.errors.push(`${file}: "quarantine" must be an array`);
        else j.quarantine.forEach((q, n) => {
            const raw = typeof q === "string" ? q : q && typeof q === "object" ? q.path : undefined;
            const p = typeof raw === "string" ? normRel(raw) : null;
            if (!p) r.errors.push(`${file}: quarantine[${n}] must be a path string or {"path": ...} (got ${JSON.stringify(q)})`);
            else r.quarantine.push({ path: p, reason: q && typeof q === "object" ? q.reason : undefined });
            if (q && typeof q === "object" && q.reason !== undefined && typeof q.reason !== "string") r.errors.push(`${file}: quarantine[${n}].reason must be a string`);
        });
    }
    return r;
}

const Q_KEYS = ["schemaVersion", "baseCommit", "measuredAt", "timeoutSec", "concurrency", "runs", "suites", "passingNotGated"];
const Q_SUITE_KEYS = ["path", "category", "firstErrorLine", "exitCode", "ms", "owner", "flaky", "runCategories", "measuredOn"];
const Q_PASS_KEYS = ["path", "ms", "measuredOn"];

function readQuarantine(file) {
    const r = { file, suites: [], passing: [], errors: [] };
    let j;
    try { j = readJsonFile(file); } catch (e) {
        r.errors.push(`${file}: ${e.code === "ENOENT" ? "missing" : `not valid JSON: ${e.message}`}`);
        return r;
    }
    const err = m => r.errors.push(`${file}: ${m}`);
    if (!j || typeof j !== "object" || Array.isArray(j)) { err("must be a JSON object"); return r; }
    for (const k of Object.keys(j)) if (!Q_KEYS.includes(k)) err(`unknown key "${k}"`);
    if (j.schemaVersion !== QUARANTINE_SCHEMA_VERSION) err(`schemaVersion must be ${QUARANTINE_SCHEMA_VERSION}`);
    if (typeof j.baseCommit !== "string" || !/^[0-9a-f]{40}$/.test(j.baseCommit)) err("baseCommit must be a 40-character commit hash");
    if (typeof j.measuredAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(j.measuredAt) || isNaN(Date.parse(j.measuredAt))) err("measuredAt must be a date YYYY-MM-DD (no clock)");
    if (typeof j.timeoutSec !== "number" || !(j.timeoutSec > 0)) err("timeoutSec must be a positive number");
    if (!Number.isInteger(j.concurrency) || j.concurrency < 1 || j.concurrency > MAX_CONCURRENCY) err(`concurrency must be an integer 1..${MAX_CONCURRENCY}`);
    if (j.runs !== undefined && !(Number.isInteger(j.runs) && j.runs >= 1)) err("runs must be a positive integer");
    const sha = v => typeof v === "string" && /^[0-9a-f]{40}$/.test(v);
    if (!Array.isArray(j.suites)) err('"suites" must be an array');
    else j.suites.forEach((s, n) => {
        const at = `suites[${n}]`;
        if (!s || typeof s !== "object" || Array.isArray(s)) return err(`${at} must be an object`);
        for (const k of Object.keys(s)) if (!Q_SUITE_KEYS.includes(k)) err(`${at}: unknown key "${k}"`);
        const p = typeof s.path === "string" ? normRel(s.path) : null;
        if (!p) err(`${at}.path must be a relative path inside the repo`);
        if (!CATEGORIES.includes(s.category) || s.category === "PASS") err(`${at}.category must be one of ${CATEGORIES.filter(c => c !== "PASS").join(", ")} (got ${JSON.stringify(s.category)})`);
        if (typeof s.firstErrorLine !== "string" || !s.firstErrorLine.trim()) err(`${at}.firstErrorLine must be a non-empty string`);
        if (!("exitCode" in s) || !(s.exitCode === null || Number.isInteger(s.exitCode))) err(`${at}.exitCode must be an integer or null`);
        if (!("ms" in s) || !(s.ms === null || (typeof s.ms === "number" && s.ms >= 0))) err(`${at}.ms must be a number or null`);
        if (!("owner" in s) || !(s.owner === null || (typeof s.owner === "string" && s.owner.trim()))) err(`${at}.owner must be null or a name`);
        if (s.flaky !== undefined && typeof s.flaky !== "boolean") err(`${at}.flaky must be a boolean`);
        if (s.flaky && s.category !== "FAIL_OTHER") err(`${at}: a flaky suite is FAIL_OTHER`);
        if (s.runCategories !== undefined && !(Array.isArray(s.runCategories) && s.runCategories.every(c => CATEGORIES.includes(c)))) err(`${at}.runCategories must be an array of categories`);
        if (s.measuredOn !== undefined && !sha(s.measuredOn)) err(`${at}.measuredOn must be a 40-character commit hash`);
        if (!s.flaky && s.category === "KILLED_TIMEOUT" && s.exitCode !== null) err(`${at}: KILLED_TIMEOUT has exitCode null (the suite never exited)`);
        if (!s.flaky && /^FAIL_/.test(String(s.category)) && s.exitCode === 0) err(`${at}: a ${s.category} suite cannot have exit code 0`);
        if (p) r.suites.push({ path: p, category: s.category, firstErrorLine: String(s.firstErrorLine || "") });
    });
    if (!Array.isArray(j.passingNotGated)) err('"passingNotGated" must be an array');
    else j.passingNotGated.forEach((s, n) => {
        const at = `passingNotGated[${n}]`;
        if (!s || typeof s !== "object" || Array.isArray(s)) return err(`${at} must be an object {"path", "ms"}`);
        for (const k of Object.keys(s)) if (!Q_PASS_KEYS.includes(k)) err(`${at}: unknown key "${k}"`);
        const p = typeof s.path === "string" ? normRel(s.path) : null;
        if (!p) err(`${at}.path must be a relative path inside the repo`);
        if (!(typeof s.ms === "number" && s.ms >= 0)) err(`${at}.ms must be a number`);
        if (s.measuredOn !== undefined && !sha(s.measuredOn)) err(`${at}.measuredOn must be a 40-character commit hash`);
        if (p) r.passing.push({ path: p });
    });
    return r;
}

// ---------------------------------------------------------------- processes

function killTree(pid) {
    if (!pid) return;
    if (IS_WIN) {
        spawnSync(path.join(SYSROOT, "System32", "taskkill.exe"), ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else {
        try { process.kill(-pid, "SIGKILL"); } catch (_) { try { process.kill(pid, "SIGKILL"); } catch (_) { /* gone */ } }
    }
}

function alive(pid) {
    try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}

function listProcesses() {
    if (IS_WIN) {
        const ps = "Get-CimInstance Win32_Process | ForEach-Object { '{0}|{1}|{2}|{3}' -f $_.ProcessId, $_.ParentProcessId, "
            + "$(if ($_.CreationDate) { $_.CreationDate.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fff') } else { '' }), "
            + "($_.CommandLine -replace '[\\r\\n]+', ' ') }";
        const r = spawnSync(path.join(SYSROOT, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
            ["-NoProfile", "-NonInteractive", "-Command", ps], { encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024, timeout: 120000 });
        if (r.status !== 0 || !r.stdout) return null;
        return r.stdout.split(/\r?\n/).map(l => {
            const m = /^(\d+)\|(\d+)\|([^|]*)\|(.*)$/.exec(l);
            return m && { pid: +m[1], ppid: +m[2], created: m[3] ? Date.parse(`${m[3]}Z`) : NaN, cmd: m[4] };
        }).filter(Boolean);
    }
    const r = spawnSync("ps", ["-eo", "pid=,ppid=,etimes=,args="], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0 || !r.stdout) return null;
    const now = Date.now();
    return r.stdout.split("\n").map(l => {
        const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s(.*)$/.exec(l);
        return m && { pid: +m[1], ppid: +m[2], created: now - Number(m[3]) * 1000, cmd: m[4] };
    }).filter(Boolean);
}

// Kills what this run left behind (see the header); reports processes that only name the root.
function sweep(ctx) {
    const procs = listProcesses();
    if (!procs) return { error: "could not list processes", killed: [], named: [] };
    const byPid = new Map(procs.map(p => [p.pid, p]));
    const protect = new Set([process.pid]);
    for (let cur = byPid.get(process.pid); cur && !protect.has(cur.ppid);) { protect.add(cur.ppid); cur = byPid.get(cur.ppid); }
    const found = new Map();
    for (const p of procs) {
        if (protect.has(p.pid)) continue;
        const s = ctx.started.find(x => x.pid === p.ppid && p.created >= x.t0 - 2000 && p.created <= (x.t1 || Date.now()) + 2000);
        if (s) found.set(p.pid, { p, suite: s.path, why: `child of ${s.path} (pid ${s.pid})` });
    }
    for (let grew = true; grew;) {
        grew = false;
        for (const p of procs) {
            if (protect.has(p.pid) || found.has(p.pid) || !found.has(p.ppid) || !(p.created >= found.get(p.ppid).p.created - 1000)) continue;
            const parent = found.get(p.ppid);
            found.set(p.pid, { p, suite: parent.suite, why: `descendant of ${parent.suite}` });
            grew = true;
        }
    }
    for (const p of procs) {
        if (!protect.has(p.pid) && !found.has(p.pid) && namesPath(p.cmd, ctx.scratch)) found.set(p.pid, { p, suite: null, why: "command line names the run's scratch folder" });
    }
    const killed = [];
    for (const { p, suite, why } of found.values()) {
        killTree(p.pid);
        killed.push({ pid: p.pid, suite, why, cmd: p.cmd.slice(0, 300) });
    }
    for (const k of killed) k.gone = !alive(k.pid);
    const named = ctx.rootIsTemp
        ? procs.filter(p => !protect.has(p.pid) && !found.has(p.pid) && namesPath(p.cmd, ctx.root)).map(p => ({ pid: p.pid, cmd: p.cmd.slice(0, 300) }))
        : [];
    return { killed, named };
}

function printSweep(sw) {
    if (sw.error) console.log(`LEFTOVER CHECK FAILED: ${sw.error}`);
    for (const k of sw.killed) console.log(`LEFTOVER pid=${k.pid} ${k.gone ? "killed" : "STILL RUNNING"} (${k.why}): ${k.cmd}`);
    for (const n of sw.named) console.log(`LEFTOVER? pid=${n.pid} names the root, not started by this run as far as the runner can tell, not killed: ${n.cmd}`);
    if (!sw.error && !sw.killed.length && !sw.named.length) console.log("LEFTOVERS: none");
}

// ---------------------------------------------------------------- running one suite

function makeRunContext(o, root) {
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "deus-run-gate-"));
    const guardFile = path.join(scratch, "run_gate_guard.js");
    fs.writeFileSync(guardFile, GUARD_SOURCE);
    const tmpRoot = path.resolve(os.tmpdir());
    const rel = path.relative(tmpRoot, path.resolve(root));
    return {
        root, scratch, guardFile, timeoutSec: o.timeoutSec, timeoutMs: Math.round(o.timeoutSec * 1000),
        logDir: o.logDir ? path.resolve(o.logDir) : null, started: [], active: new Set(),
        rootIsTemp: !!rel && !rel.startsWith("..") && !path.isAbsolute(rel)
    };
}

function suiteEnv(ctx, tmp, guardLog) {
    const env = {};
    for (const [k, v] of Object.entries(process.env)) {
        if (/^GIT_(DIR|WORK_TREE|INDEX_FILE|PREFIX|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|NAMESPACE|QUARANTINE_PATH)$/i.test(k)) continue;
        if (/^(NODE_OPTIONS|NODE_PATH|TEMP|TMP|TMPDIR|RUN_GATE_GUARD_LOG)$/i.test(k)) continue;
        env[k] = v;
    }
    env.TEMP = env.TMP = env.TMPDIR = tmp;
    env.NODE_OPTIONS = `--require "${ctx.guardFile.replace(/\\/g, "/")}"`;
    env.RUN_GATE_GUARD_LOG = guardLog;
    env.GIT_TERMINAL_PROMPT = "0";
    env.GCM_INTERACTIVE = "never";
    return env;
}

function runOne(ctx, rel, idx) {
    return new Promise(resolve => {
        const dir = path.join(ctx.scratch, `s${idx}`);
        const tmp = path.join(dir, "tmp");
        fs.mkdirSync(tmp, { recursive: true });
        const outFile = path.join(dir, "stdout.txt"), errFile = path.join(dir, "stderr.txt"), guardLog = path.join(dir, "guard.txt");
        const outFd = fs.openSync(outFile, "w"), errFd = fs.openSync(errFile, "w");
        const rec = { path: rel, pid: null, t0: Date.now(), t1: null };
        const h0 = process.hrtime.bigint();
        let child = null, timedOut = false, timer = null, killTimer = null, settled = false;
        const finish = (code, signal, spawnError) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            clearTimeout(killTimer);
            rec.t1 = Date.now();
            if (child) ctx.active.delete(child);
            const ms = Math.round(Number(process.hrtime.bigint() - h0) / 1e6);
            resolve({ rel, pid: rec.pid, code, signal, spawnError, timedOut, ms, dir, outFile, errFile, guardLog });
        };
        try {
            child = spawn(process.execPath, [rel], {
                cwd: ctx.root, env: suiteEnv(ctx, tmp, guardLog), stdio: ["ignore", outFd, errFd],
                shell: false, windowsHide: true, detached: !IS_WIN
            });
        } catch (e) {
            fs.closeSync(outFd); fs.closeSync(errFd);
            finish(null, null, e.message);
            return;
        }
        fs.closeSync(outFd); fs.closeSync(errFd);
        rec.pid = child.pid || null;
        ctx.started.push(rec);
        ctx.active.add(child);
        child.on("error", e => finish(null, null, e.message));
        child.on("exit", (code, signal) => finish(code, signal, null));
        const onTimeout = () => {
            timedOut = true; killTree(child.pid);
            killTimer = setTimeout(() => finish(null, "SIGKILL", null), KILL_WAIT_MS);
        };
        timer = setTimeout(onTimeout, ctx.timeoutMs);
    });
}

function candidateLines(text) {
    const lines = String(text || "").split(/\r?\n/);
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (/^\S.*:\d+$/.test(l) && i + 2 < lines.length && /^\s*\^+\s*$/.test(lines[i + 2])) { i += 2; continue; }
        const t = l.trim();
        if (!t) continue;
        if (/^at\s.*(?::\d+:\d+\)?|\(native\)|<anonymous>\)?)$/.test(t)) continue;
        if (/^Node\.js v\d/.test(t) || /^\(node:\d+\)/.test(t) || /^\(Use `node --trace-/.test(t)) continue;
        if (/^(?:PASS|ok)\b/.test(t)) continue;
        out.push(t.length > 300 ? `${t.slice(0, 297)}...` : t);
    }
    return out;
}

function decideFailure(errText, outText, code, signal) {
    const pick = (lines, stream) => {
        for (const l of lines) for (const rule of RULES) if (rule.re.test(l)) return { category: rule.category, line: l, stream, rule: rule.id };
        return null;
    };
    const errLines = candidateLines(errText);
    if (errLines.length) return pick(errLines, "stderr") || { category: "FAIL_OTHER", line: errLines[0], stream: "stderr", rule: "other" };
    const outLines = candidateLines(outText);
    const hit = pick(outLines, "stdout");
    if (hit) return hit;
    const f = outLines.find(l => /\bFAIL|\berror\b/i.test(l)) || outLines[outLines.length - 1];
    if (f) return { category: "FAIL_OTHER", line: f, stream: "stdout", rule: "other" };
    return { category: "FAIL_OTHER", line: `(no output; exit ${code}${signal ? `, signal ${signal}` : ""})`, stream: "runner", rule: "other" };
}

function normalizeLine(ctx, line) {
    if (line == null) return null;
    return String(line).replace(pathPattern(ctx.scratch), "<tmp>").replace(pathPattern(ctx.root), "<root>");
}

function classifyRun(ctx, r) {
    const guard = readCapped(r.guardLog, 8192, 0).split(/\r?\n/).find(l => l.trim());
    let c;
    if (guard) c = { category: "NEEDS_NWJS", line: guard.trim(), stream: "guard", rule: "runtime_guard" };
    else if (r.timedOut) c = { category: "KILLED_TIMEOUT", line: `killed after ${ctx.timeoutSec} s (timeout) with its whole process tree`, stream: "runner", rule: "timeout" };
    else if (r.spawnError) c = { category: "FAIL_OTHER", line: `could not start: ${r.spawnError}`, stream: "runner", rule: "spawn_error" };
    else if (r.code === 0) c = { category: "PASS", line: null, stream: null, rule: "exit_0" };
    else c = decideFailure(readCapped(r.errFile, READ_HEAD, READ_TAIL), readCapped(r.outFile, READ_HEAD, READ_TAIL), r.code, r.signal);
    c.line = normalizeLine(ctx, c.line);
    return c;
}

function saveLog(ctx, r, c) {
    if (!ctx.logDir) return;
    fs.mkdirSync(ctx.logDir, { recursive: true });
    const name = r.rel.replace(/[\\/]/g, "__");
    const body = [
        `# ${r.rel}  category=${c.category}  exit=${r.timedOut ? "TIMEOUT" : r.code}  ms=${r.ms}  decided by ${c.rule} (${c.stream || "-"})`,
        "== stdout ==", readCapped(r.outFile, SAVE_HEAD, SAVE_TAIL).replace(/\s+$/, ""),
        "== stderr ==", readCapped(r.errFile, SAVE_HEAD, SAVE_TAIL).replace(/\s+$/, ""), ""
    ].join("\n");
    fs.writeFileSync(path.join(ctx.logDir, `${name}.log`), body);
}

function removeQuietly(p) {
    try { fs.rmSync(p, { recursive: true, force: true, maxRetries: 3 }); } catch (_) { /* a leftover may hold it; swept later */ }
}

function tailLines(ctx, r, n) {
    const text = [readCapped(r.outFile, 0, 4096), readCapped(r.errFile, 0, 4096)].join("\n");
    return text.split(/\r?\n/).filter(l => l.trim()).slice(-n).map(l => normalizeLine(ctx, l));
}

async function pool(items, concurrency, work, mayStart) {
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            if (mayStart && !mayStart()) return;
            const i = next++;
            await work(items[i], i);
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

let CURRENT = null;
function onSignal(sig) {
    if (CURRENT) for (const c of CURRENT.active) killTree(c.pid);
    console.error(`run_gate: ${sig}: killed the running suites`);
    process.exit(130);
}

// ---------------------------------------------------------------- gate mode

async function gateMode(o) {
    const root = o.root;
    if (!isDir(root)) throw new UsageError(`--root ${root} is not a folder`);
    let suites, label;
    const errors = [];
    if (o.suites.length) {
        suites = o.suites.map(s => normRel(s) || (errors.push(`--suite ${s} must be a relative path inside the repo`), null)).filter(Boolean);
        label = "--suite";
    } else {
        const file = o.gateList ? path.resolve(o.gateList) : path.join(root, GATE_LIST);
        const gl = readGateList(file);
        errors.push(...gl.errors);
        suites = gl.gate;
        label = file;
    }
    if (!errors.length && !suites.length) errors.push(`no suite to run (${label} lists none)`);
    for (const d of duplicates(suites)) errors.push(`${d} is listed more than once`);
    for (const s of uniq(suites)) if (!isFile(path.join(root, s))) errors.push(`${s} does not exist in ${root}`);
    if (errors.length) {
        for (const e of errors) console.log(`LIST ERROR: ${e}`);
        console.log("RESULT: list error, no suite was run");
        return 2;
    }
    const screen = makeScreen(root, screenFiles(root));
    const refused = suites.map(s => [s, screen.screen(s)]).filter(([, sc]) => sc.needsNwjs);
    if (refused.length) {
        for (const [s, sc] of refused) console.log(`REFUSED ${s} NEEDS_NWJS: ${screenLine(sc)}`);
        console.log(`RESULT: refused, no suite was run (${refused.length} NEEDS_NWJS)`);
        return 2;
    }
    const head = gitHead(root);
    console.log(`run_gate: gate mode, ${suites.length} suites from ${label}, root ${root}, HEAD ${head || "(not a git checkout)"}, timeout ${o.timeoutSec} s each, one at a time`);
    const ctx = CURRENT = makeRunContext(o, root);
    let passed = 0, failed = 0, guarded = 0;
    for (let i = 0; i < suites.length; i++) {
        const r = await runOne(ctx, suites[i], i);
        const c = classifyRun(ctx, r);
        const ok = r.code === 0 && !r.timedOut && c.category === "PASS";
        const exitText = r.timedOut ? "TIMEOUT" : r.spawnError ? "SPAWN_ERROR" : r.code === null ? `SIGNAL_${r.signal}` : r.code;
        console.log(`GATE ${suites[i]} EXIT=${exitText} ${r.ms}ms${ok ? "" : ` ${c.category}`}`);
        if (ok) passed++;
        else {
            failed++;
            if (c.category === "NEEDS_NWJS") guarded++;
            console.log(`    | decided by ${c.rule}: ${c.line}`);
            for (const l of tailLines(ctx, r, 10)) console.log(`    | ${l}`);
        }
        saveLog(ctx, r, c);
        removeQuietly(r.dir);
    }
    const sw = sweep(ctx);
    printSweep(sw);
    removeQuietly(ctx.scratch);
    console.log(`RESULT: ${passed} passed, ${failed} failed`);
    if (guarded) { console.log(`REFUSED: ${guarded} suite(s) tried to start the NW.js harness (runtime guard)`); return 2; }
    return failed ? 1 : 0;
}

// ---------------------------------------------------------------- census

function censusRow(ctx, s, isGate, r, c, invocation) {
    return {
        path: s, gate: isGate, category: c.category, firstErrorLine: c.line, errorStream: c.stream, rule: c.rule,
        exitCode: r.timedOut || r.spawnError ? null : r.code, signal: r.signal || null, ms: r.ms, invocation
    };
}

function nwRow(s, isGate, sc) {
    return {
        path: s, gate: isGate, category: "NEEDS_NWJS", firstErrorLine: screenLine(sc), errorStream: "screen", rule: "static_screen",
        exitCode: null, signal: null, ms: null, invocation: null, chain: sc.chain
    };
}

function printRow(row, n, total) {
    const exit = row.exitCode === null ? "-" : row.exitCode;
    const ms = row.ms === null ? "-" : `${row.ms}ms`;
    const tag = row.category === "NEEDS_NWJS" && row.rule === "static_screen" ? " (not run)" : "";
    console.log(`CENSUS ${n}/${total} ${row.path} ${row.category}${tag} EXIT=${exit} ${ms}${row.firstErrorLine ? ` | ${row.firstErrorLine}` : ""}`);
}

async function censusMode(o) {
    const root = o.root;
    if (!o.out) throw new UsageError("--census needs --out <file>");
    if (!isDir(root)) throw new UsageError(`--root ${root} is not a folder`);
    const head = gitHead(root);
    const files = gitFiles(root, []);
    if (!head || !files) throw new UsageError(`${root} is not a git checkout (the census enumerates suites with git ls-files)`);
    const gl = readGateList(o.gateList ? path.resolve(o.gateList) : path.join(root, GATE_LIST));
    for (const e of gl.errors) console.log(`WARNING: gate list: ${e}`);
    const gateKeys = new Set(gl.gate.map(keyOf));
    let suites;
    if (o.suites.length) {
        suites = o.suites.map(s => { const n = normRel(s); if (!n) throw new UsageError(`--suite ${s} must be a relative path inside the repo`); return n; });
        for (const s of suites) if (!isFile(path.join(root, s))) throw new UsageError(`--suite ${s} does not exist in ${root}`);
    } else {
        suites = [...gitFiles(root, SUITE_PATHSPECS), ...gl.gate.filter(g => isFile(path.join(root, g)))];
    }
    suites = uniq(suites).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const screen = makeScreen(root, files);
    const screened = new Map(suites.map(s => [s, screen.screen(s)]));
    if (o.suites.length) {
        const refused = suites.filter(s => screened.get(s).needsNwjs);
        if (refused.length) {
            for (const s of refused) console.log(`REFUSED ${s} NEEDS_NWJS: ${screenLine(screened.get(s))}`);
            console.log("RESULT: refused, no suite was run");
            return 2;
        }
    }

    const out = path.resolve(o.out);
    let doc = null;
    if (fs.existsSync(out)) {
        try { doc = readJsonFile(out); } catch (e) { throw new UsageError(`${out} exists and is not valid JSON: ${e.message}`); }
        if (doc.kind !== CENSUS_KIND) throw new UsageError(`${out} exists and is not a census file`);
        if (!doc.partial) throw new UsageError(`${out} holds a complete census; choose another --out`);
        const same = doc.head === head && doc.timeoutSec === o.timeoutSec && doc.concurrency === o.concurrency
            && Array.isArray(doc.suiteList) && doc.suiteList.join("\n") === suites.join("\n") && path.resolve(doc.root) === path.resolve(root);
        if (!same) throw new UsageError(`${out} is a partial census of another root, HEAD, suite list, timeout or concurrency; choose another --out`);
    }
    if (!doc) {
        doc = {
            schemaVersion: CENSUS_SCHEMA_VERSION, kind: CENSUS_KIND, root, head, node: process.version, platform: `${process.platform} ${os.release()}`,
            timeoutSec: o.timeoutSec, concurrency: o.concurrency, partial: true, suiteList: suites, invocations: [], suites: [], leftovers: []
        };
    }
    const done = new Map(doc.suites.map(r => [r.path, r]));
    const invocation = doc.invocations.length;
    const inv = { startedAt: new Date().toISOString(), endedAt: null, ran: 0, budgetSec: o.budgetSec || null };
    doc.invocations.push(inv);
    const total = suites.length;
    let n = done.size;
    console.log(`run_gate: census of ${total} suites, root ${root}, HEAD ${head}, timeout ${o.timeoutSec} s, up to ${o.concurrency} at once${o.budgetSec ? `, budget ${o.budgetSec} s` : ""}${done.size ? `, resuming (${done.size} already measured)` : ""}`);
    for (const s of suites) {
        const sc = screened.get(s);
        if (!sc.needsNwjs || done.has(s)) continue;
        const row = nwRow(s, gateKeys.has(keyOf(s)), sc);
        done.set(s, row);
        printRow(row, ++n, total);
    }
    const save = () => {
        doc.suites = suites.filter(s => done.has(s)).map(s => done.get(s));
        doc.partial = doc.suites.length < total;
        writeJsonAtomic(out, doc);
    };
    save();

    const ctx = CURRENT = makeRunContext(o, root);
    const deadline = o.budgetSec ? Date.now() + o.budgetSec * 1000 : Infinity;
    const todo = suites.filter(s => !done.has(s));
    await pool(todo, o.concurrency, async (s, i) => {
        const r = await runOne(ctx, s, i);
        const c = classifyRun(ctx, r);
        const row = censusRow(ctx, s, gateKeys.has(keyOf(s)), r, c, invocation);
        done.set(s, row);
        inv.ran++;
        printRow(row, ++n, total);
        saveLog(ctx, r, c);
        removeQuietly(r.dir);
        save();
    }, () => Date.now() < deadline);

    const sw = sweep(ctx);
    printSweep(sw);
    for (const k of sw.killed) doc.leftovers.push(Object.assign({ invocation }, k));
    for (const k of sw.named) doc.leftovers.push(Object.assign({ invocation, notKilled: true }, k));
    if (sw.error) doc.leftovers.push({ invocation, error: sw.error });
    inv.endedAt = new Date().toISOString();
    save();
    removeQuietly(ctx.scratch);

    const counts = {};
    for (const c of CATEGORIES) counts[c] = 0;
    for (const row of doc.suites) counts[row.category]++;
    console.log(`CENSUS COUNTS ${CATEGORIES.map(c => `${c}=${counts[c]}`).join(" ")}`);
    const gateBad = doc.suites.filter(r => r.gate && r.category !== "PASS");
    for (const r of gateBad) console.log(`GATE SUITE NOT PASSING: ${r.path} ${r.category}`);
    if (doc.partial) {
        console.log(`CENSUS PARTIAL: ${doc.suites.length}/${total} measured -> ${out}; run the same command again to continue`);
        return 3;
    }
    console.log(`CENSUS COMPLETE: ${total}/${total} measured -> ${out}`);
    return 0;
}

// ---------------------------------------------------------------- merge

function mergeMode(o) {
    if (!o.mergeFiles.length) throw new UsageError("--merge-census needs census files");
    if (!o.writeQuarantine) throw new UsageError("--merge-census needs --write-quarantine <file>");
    if (!/^[0-9a-f]{40}$/.test(o.base || "")) throw new UsageError("--merge-census needs --base <40-character commit hash>");
    const runs = o.mergeFiles.map(f => {
        let doc;
        try { doc = readJsonFile(f); } catch (e) { throw new UsageError(`${f}: ${e.message}`); }
        if (doc.kind !== CENSUS_KIND || !Array.isArray(doc.suites)) throw new UsageError(`${f} is not a census file`);
        if (doc.partial !== false) throw new UsageError(`${f} is a partial census`);
        return { file: f, doc };
    });
    const t = runs[0].doc;
    for (const r of runs) {
        if (r.doc.timeoutSec !== t.timeoutSec || r.doc.concurrency !== t.concurrency) throw new UsageError(`${r.file}: timeoutSec/concurrency differ from ${runs[0].file}`);
    }
    const per = new Map();
    runs.forEach((r, ri) => {
        const seen = new Set();
        for (const row of r.doc.suites) {
            const k = keyOf(row.path);
            if (seen.has(k)) throw new UsageError(`${r.file} lists ${row.path} twice`);
            seen.add(k);
            if (!per.has(k)) per.set(k, { path: row.path, rows: [] });
            per.get(k).rows.push({ run: ri, head: r.doc.head, row });
        }
    });
    const problems = [];
    for (const e of per.values()) {
        if (e.rows.length !== o.runs) problems.push(`${e.path} was measured ${e.rows.length} times, expected ${o.runs}`);
        if (new Set(e.rows.map(x => x.head)).size !== 1) problems.push(`${e.path} was measured on different commits`);
    }
    if (problems.length) throw new UsageError(`inconsistent runs:\n  ${problems.join("\n  ")}`);
    const starts = runs.map(r => Date.parse((r.doc.invocations[0] || {}).startedAt)).filter(x => !isNaN(x));
    const q = {
        schemaVersion: QUARANTINE_SCHEMA_VERSION, baseCommit: o.base, measuredAt: ctDate(new Date(starts.length ? Math.min(...starts) : Date.now())),
        timeoutSec: t.timeoutSec, concurrency: t.concurrency, runs: o.runs, suites: [], passingNotGated: []
    };
    const counts = {}, flaky = [], gateRows = [];
    for (const c of CATEGORIES) counts[c] = 0;
    let agree = 0;
    for (const e of [...per.values()].sort((a, b) => (a.path < b.path ? -1 : 1))) {
        const cats = e.rows.map(x => x.row.category);
        const same = cats.every(c => c === cats[0]);
        if (same) agree++;
        const head = e.rows[0].head;
        const extra = head !== o.base ? { measuredOn: head } : {};
        const msVals = e.rows.map(x => x.row.ms).filter(v => typeof v === "number");
        const ms = msVals.length ? Math.max(...msVals) : null;
        if (e.rows.some(x => x.row.gate)) { gateRows.push({ path: e.path, cats }); continue; }
        if (same && cats[0] === "PASS") {
            q.passingNotGated.push(Object.assign({ path: e.path, ms }, extra));
            counts.PASS++;
            continue;
        }
        const first = e.rows[0].row;
        if (same) {
            q.suites.push(Object.assign({ path: e.path, category: cats[0], firstErrorLine: first.firstErrorLine, exitCode: first.exitCode, ms, owner: null }, extra));
            counts[cats[0]]++;
        } else {
            const failing = e.rows.find(x => x.row.category !== "PASS").row;
            q.suites.push(Object.assign({
                path: e.path, category: "FAIL_OTHER", firstErrorLine: `flaky (${cats.join(" / ")}): ${failing.firstErrorLine}`,
                exitCode: failing.exitCode, ms, owner: null, flaky: true, runCategories: cats
            }, extra));
            counts.FAIL_OTHER++;
            flaky.push(`${e.path} ${cats.join(" / ")}`);
        }
    }
    writeJsonAtomic(path.resolve(o.writeQuarantine), q);
    console.log(`MERGE ${runs.length} census files: ${runs.map(r => `${r.file} (HEAD ${r.doc.head})`).join(", ")}`);
    console.log(`MERGE suites=${per.size} agree=${agree} disagree=${per.size - agree} gate=${gateRows.length} quarantine=${q.suites.length} passingNotGated=${q.passingNotGated.length}`);
    console.log(`MERGE COUNTS (non-gate) ${CATEGORIES.map(c => `${c}=${counts[c]}`).join(" ")}`);
    for (const f of flaky) console.log(`FLAKY ${f}`);
    for (const g of gateRows) console.log(`GATE ${g.path} ${g.cats.join(" / ")}`);
    console.log(`WROTE ${path.resolve(o.writeQuarantine)}`);
    return 0;
}

// ---------------------------------------------------------------- check-lists

function checkListsMode(o) {
    const root = o.root;
    if (!isDir(root)) throw new UsageError(`--root ${root} is not a folder`);
    const tracked = gitFiles(root, []);
    const suites = gitFiles(root, SUITE_PATHSPECS);
    if (!tracked || !suites) throw new UsageError(`${root} is not a git checkout (--check-lists compares the lists with git ls-files)`);
    const V = [], notes = [];
    const add = (code, msg) => V.push({ code, msg });
    const gateFile = o.gateList ? path.resolve(o.gateList) : path.join(root, GATE_LIST);
    const qFile = o.quarantine ? path.resolve(o.quarantine) : path.join(root, QUARANTINE_LIST);
    const gl = readGateList(gateFile);
    for (const e of gl.errors) add("GATE_LIST_INVALID", e);
    const ql = readQuarantine(qFile);
    for (const e of ql.errors) add("QUARANTINE_INVALID", e);
    const trackedKeys = new Set(tracked.map(keyOf));
    const exists = p => trackedKeys.has(keyOf(p)) && isFile(path.join(root, p));
    const lists = [
        ["gate_tests.json gate", gl.gate],
        ["gate_tests.json quarantine", gl.quarantine.map(q => q.path)],
        ["quarantine.json suites", ql.suites.map(s => s.path)],
        ["quarantine.json passingNotGated", ql.passing.map(s => s.path)]
    ];
    // A path listed twice in one list.
    for (const [label, list] of lists) for (const d of duplicates(list)) add("DUPLICATE", `${label} lists ${d} more than once`);
    // Every listed path is a tracked file.
    for (const [label, list] of lists) for (const p of uniq(list)) if (!exists(p)) add("MISSING_PATH", `${label}: ${p} is not a tracked file in ${root}`);
    // quarantine.json lists suites only (tracked test_*.js files or gate entries).
    const universe = new Set([...suites, ...gl.gate].map(keyOf));
    for (const [label, list] of lists.slice(2)) for (const p of uniq(list)) if (exists(p) && !universe.has(keyOf(p))) add("NOT_A_SUITE", `${label}: ${p} is not a suite (tools/test_*.js or tools/<folder>/test_*.js) nor a gate entry`);
    const G = new Set(gl.gate.map(keyOf)), GQ = new Set(gl.quarantine.map(q => keyOf(q.path)));
    const Q = new Set(ql.suites.map(s => keyOf(s.path))), P = new Set(ql.passing.map(s => keyOf(s.path)));
    // No suite in the gate list and a quarantine list; no suite both quarantined and passing.
    for (const p of uniq(gl.gate)) {
        if (GQ.has(keyOf(p))) add("IN_GATE_AND_QUARANTINE", `${p} is in the gate list and in the gate_tests.json quarantine list`);
        if (Q.has(keyOf(p))) add("IN_GATE_AND_QUARANTINE", `${p} is in the gate list and in quarantine.json suites`);
        if (P.has(keyOf(p))) add("IN_TWO_LISTS", `${p} is in the gate list and in quarantine.json passingNotGated`);
    }
    for (const p of uniq(ql.suites.map(s => s.path))) if (P.has(keyOf(p))) add("IN_TWO_LISTS", `${p} is in quarantine.json suites and in passingNotGated`);
    // Every tracked suite is in the gate list, the quarantine or passingNotGated.
    for (const s of suites) if (!G.has(keyOf(s)) && !Q.has(keyOf(s)) && !P.has(keyOf(s))) add("UNLISTED", `${s} is a tracked suite in none of: gate list, quarantine.json suites, quarantine.json passingNotGated`);
    // NEEDS_NWJS consistency with the static screen (nothing is run).
    const screen = makeScreen(root, tracked);
    for (const p of uniq(gl.gate)) if (exists(p)) {
        const sc = screen.screen(p);
        if (sc.needsNwjs) add("NEEDS_NWJS_IN_GATE", `${p} is in the gate list but is NEEDS_NWJS: ${screenLine(sc)}`);
    }
    for (const s of uniq(ql.suites.map(x => x.path)).map(p => ql.suites.find(x => keyOf(x.path) === keyOf(p)))) if (exists(s.path)) {
        const sc = screen.screen(s.path);
        if (s.category !== "NEEDS_NWJS" && sc.needsNwjs) add("NEEDS_NWJS_UNRECORDED", `${s.path} is recorded ${s.category} but the screen finds the NW.js harness: ${screenLine(sc)}`);
        if (s.category === "NEEDS_NWJS" && !sc.needsNwjs && /^static screen:/.test(s.firstErrorLine)) add("NEEDS_NWJS_STALE", `${s.path} is recorded NEEDS_NWJS by the static screen, which no longer finds the harness`);
    }
    for (const p of uniq(ql.passing.map(x => x.path))) if (exists(p)) {
        const sc = screen.screen(p);
        if (sc.needsNwjs) add("NEEDS_NWJS_UNRECORDED", `${p} is recorded as passing but the screen finds the NW.js harness: ${screenLine(sc)}`);
    }
    for (const q of gl.quarantine) if (P.has(keyOf(q.path))) notes.push(`${q.path} is on the gate_tests.json quarantine list but quarantine.json records it passing in every run`);

    console.log(`run_gate: check-lists, root ${root}, gate list ${gateFile}, quarantine ${qFile}`);
    for (const v of V) console.log(`VIOLATION ${v.code}: ${v.msg}`);
    for (const n of notes) console.log(`NOTE: ${n}`);
    if (V.length) {
        console.log(`CHECK-LISTS: ${V.length} violation(s)`);
        return 1;
    }
    console.log(`CHECK-LISTS: OK (${uniq(gl.gate).length} gate, ${Q.size} quarantined, ${P.size} passingNotGated, ${suites.length} tracked suites)`);
    return 0;
}

// ---------------------------------------------------------------- screen only

function screenMode(o) {
    const root = o.root;
    const files = gitFiles(root, []);
    if (!files) throw new UsageError(`${root} is not a git checkout`);
    const gl = readGateList(o.gateList ? path.resolve(o.gateList) : path.join(root, GATE_LIST));
    const suites = o.suites.length ? o.suites.map(s => normRel(s) || s) : uniq([...gitFiles(root, SUITE_PATHSPECS), ...gl.gate]).sort();
    const screen = makeScreen(root, files);
    let nw = 0;
    for (const s of suites) {
        const sc = screen.screen(s);
        if (sc.needsNwjs) nw++;
        console.log(`SCREEN ${s} ${sc.needsNwjs ? `NEEDS_NWJS | ${screenLine(sc)}` : `clean (${sc.reached} files reached)`}`);
    }
    console.log(`SCREEN RESULT: ${nw} NEEDS_NWJS, ${suites.length - nw} clean, ${suites.length} suites (nothing was run)`);
    return 0;
}

// ---------------------------------------------------------------- main

function parseArgs(argv) {
    const o = {
        mode: "gate", root: null, gateList: null, quarantine: null, suites: [], timeoutSec: DEFAULT_TIMEOUT_SEC, concurrency: MAX_CONCURRENCY,
        out: null, logDir: null, budgetSec: null, mergeFiles: [], writeQuarantine: null, base: null, runs: 3, help: false
    };
    const modes = new Set();
    const num = (v, name, min, max, int) => {
        const x = Number(v);
        if (!isFinite(x) || x < min || x > max || (int && !Number.isInteger(x))) throw new UsageError(`${name} must be ${int ? "an integer" : "a number"} from ${min} to ${max} (got ${v})`);
        return x;
    };
    for (let i = 0; i < argv.length; i++) {
        let a = argv[i], v = null;
        const eq = a.indexOf("=");
        if (a.startsWith("--") && eq > 0) { v = a.slice(eq + 1); a = a.slice(0, eq); }
        const val = () => {
            if (v !== null) return v;
            if (i + 1 >= argv.length || argv[i + 1].startsWith("--")) throw new UsageError(`${a} needs a value`);
            return argv[++i];
        };
        switch (a) {
            case "--census": modes.add("census"); break;
            case "--check-lists": modes.add("check"); break;
            case "--screen": modes.add("screen"); break;
            case "--merge-census":
                modes.add("merge");
                if (v !== null) o.mergeFiles.push(v);
                while (i + 1 < argv.length && !argv[i + 1].startsWith("--")) o.mergeFiles.push(argv[++i]);
                break;
            case "--root": o.root = val(); break;
            case "--gate-list": o.gateList = val(); break;
            case "--quarantine": o.quarantine = val(); break;
            case "--suite": o.suites.push(val()); break;
            case "--timeout": o.timeoutSec = num(val(), a, 0.5, 86400, false); break;
            case "--concurrency": o.concurrency = num(val(), a, 1, MAX_CONCURRENCY, true); break;
            case "--out": o.out = val(); break;
            case "--log-dir": o.logDir = val(); break;
            case "--budget-sec": o.budgetSec = num(val(), a, 1, 1e7, false); break;
            case "--write-quarantine": o.writeQuarantine = val(); break;
            case "--base": o.base = val(); break;
            case "--runs": o.runs = num(val(), a, 1, 100, true); break;
            case "--help": case "-h": o.help = true; break;
            default: throw new UsageError(`unknown argument: ${argv[i]}`);
        }
    }
    if (modes.size > 1) throw new UsageError("choose one of --census, --check-lists, --merge-census, --screen");
    o.mode = [...modes][0] || "gate";
    o.root = path.resolve(o.root || path.join(__dirname, "..", ".."));
    return o;
}

async function main() {
    let o;
    try { o = parseArgs(process.argv.slice(2)); } catch (e) {
        if (!(e instanceof UsageError)) throw e;
        console.error(`run_gate: ${e.message}\n${USAGE}`);
        return 2;
    }
    if (o.help) { console.log(USAGE); return 0; }
    process.on("SIGINT", () => onSignal("SIGINT"));
    process.on("SIGTERM", () => onSignal("SIGTERM"));
    try {
        if (o.mode === "census") return await censusMode(o);
        if (o.mode === "check") return checkListsMode(o);
        if (o.mode === "merge") return mergeMode(o);
        if (o.mode === "screen") return screenMode(o);
        return await gateMode(o);
    } catch (e) {
        if (!(e instanceof UsageError)) throw e;
        console.error(`run_gate: ${e.message}`);
        return 2;
    }
}

main().then(code => {
    process.exitCode = code;
    setTimeout(() => process.exit(code), 2000).unref();
}, e => {
    console.error(`run_gate: internal error: ${e && e.stack || e}`);
    if (CURRENT) for (const c of CURRENT.active) killTree(c.pid);
    process.exitCode = 2;
});
