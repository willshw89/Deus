"use strict";

/**
 * tools/security/test_support.js
 *
 * OPS.70.02 (Lane Z): shared by test_scan_secrets.js and test_check_dependencies.js.
 *   - Throwaway git repositories under os.tmpdir() with hermetic git settings: no system or user
 *     config (so no hooks, no autocrlf, no signing), a fixed identity and fixed dates. They are
 *     deleted when the suite ends.
 *   - In-memory copies of a tool for mutation checks. A mutant is the tool's source text with exact
 *     replacements applied, compiled with Module#_compile; the file on disk is never written.
 *   - Output capture for in-process main() calls, and the PASS / FAIL / RESULT lines.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const Module = require("module");
const { spawnSync } = require("child_process");

// Deterministic generator (mulberry32) for run-time fixture values.
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function charRange(from, to) {
    let s = "";
    for (let c = from.charCodeAt(0); c <= to.charCodeAt(0); c++) s += String.fromCharCode(c);
    return s;
}

function rmrf(p) {
    try { fs.rmSync(p, { recursive: true, force: true, maxRetries: 3 }); return; } catch (_) { /* read-only git objects: chmod and retry */ }
    const walk = q => {
        let st;
        try { st = fs.lstatSync(q); } catch (_) { return; }
        try { fs.chmodSync(q, 0o777); } catch (_) { /* best effort */ }
        if (st.isDirectory()) for (const n of fs.readdirSync(q)) walk(path.join(q, n));
    };
    walk(p);
    fs.rmSync(p, { recursive: true, force: true, maxRetries: 3 });
}

class Fixtures {
    constructor(tag) {
        this.root = fs.mkdtempSync(path.join(os.tmpdir(), "deus-" + tag + "-"));
        this.noHooks = path.join(this.root, "no-hooks");
        fs.mkdirSync(this.noHooks);
        const cfg = path.join(this.root, "empty.gitconfig");
        fs.writeFileSync(cfg, "");
        Object.assign(process.env, {
            GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: cfg, GIT_TERMINAL_PROMPT: "0",
            GIT_AUTHOR_NAME: "TEST_author", GIT_AUTHOR_EMAIL: "test_author@example.invalid",
            GIT_COMMITTER_NAME: "TEST_author", GIT_COMMITTER_EMAIL: "test_author@example.invalid",
            GIT_AUTHOR_DATE: "2026-09-26T12:00:00Z", GIT_COMMITTER_DATE: "2026-09-26T12:00:00Z"
        });
        delete process.env.GIT_DIR;
        delete process.env.GIT_WORK_TREE;
        delete process.env.GIT_INDEX_FILE;
    }

    git(cwd, args, input) {
        const r = spawnSync("git", args, { cwd, input, maxBuffer: 256 * 1024 * 1024, windowsHide: true });
        if (r.error || r.status !== 0) {
            throw new Error("fixture git " + args.join(" ") + " failed: " + (r.error ? r.error.message : String(r.stderr).trim()));
        }
        return r.stdout.toString("utf8").trim();
    }

    repo(name) {
        const dir = path.join(this.root, name);
        fs.mkdirSync(dir, { recursive: true });
        this.git(dir, ["-c", "init.defaultBranch=main", "init", "-q"]);
        for (const [k, v] of [["core.autocrlf", "false"], ["core.safecrlf", "false"], ["commit.gpgsign", "false"],
                              ["core.hooksPath", this.noHooks], ["core.quotePath", "true"]]) {
            this.git(dir, ["config", k, v]);
        }
        return dir;
    }

    // files: { relPath: string | Buffer | null (delete) }. Returns the new commit sha.
    write(dir, files) {
        for (const [rel, content] of Object.entries(files)) {
            const abs = path.join(dir, rel);
            if (content === null) { fs.rmSync(abs, { force: true }); continue; }
            fs.mkdirSync(path.dirname(abs), { recursive: true });
            fs.writeFileSync(abs, content);
        }
    }

    commit(dir, files, message) {
        this.write(dir, files);
        this.git(dir, ["add", "-A"]);
        this.git(dir, ["commit", "-q", "--allow-empty", "-F", "-"], message);
        return this.git(dir, ["rev-parse", "HEAD"]);
    }

    cleanup() { rmrf(this.root); }
}

function compileTool(src, filename) {
    const m = new Module(filename, module);
    m.filename = filename;
    m.paths = Module._nodeModulePaths(path.dirname(filename));
    m._compile(src, filename);
    return m.exports;
}

// Applies [from, to] pairs; each `from` must occur exactly once, or the mutant did not apply.
function mutate(src, pairs) {
    let out = src;
    for (const [from, to] of pairs) {
        const n = out.split(from).length - 1;
        if (n !== 1) throw new Error("mutation target found " + n + " times: " + JSON.stringify(from.slice(0, 60)));
        out = out.split(from).join(to);
    }
    return out;
}

// Runs fn with process.stdout / stderr captured. Returns { code, out, err }.
function capture(fn) {
    const out = [], err = [];
    const ow = process.stdout.write, ew = process.stderr.write;
    process.stdout.write = s => { out.push(String(s)); return true; };
    process.stderr.write = s => { err.push(String(s)); return true; };
    let code;
    try { code = fn(); } catch (e) { code = "threw: " + (e && e.message); } finally { process.stdout.write = ow; process.stderr.write = ew; }
    return { code, out: out.join(""), err: err.join("") };
}

class Suite {
    constructor() { this.checks = []; this.passed = 0; this.failed = 0; }

    add(name, fn) {
        if (this.checks.some(c => c.name === name)) throw new Error("duplicate check " + name);
        this.checks.push({ name, fn });
    }

    // A check passes when fn returns true; a string return or a throw is the failure reason.
    evaluate(check, tool) {
        try {
            const r = check.fn(tool);
            return r === true ? { ok: true } : { ok: false, why: typeof r === "string" ? r : "returned " + JSON.stringify(r) };
        } catch (e) {
            return { ok: false, why: "threw: " + (e && e.message) };
        }
    }

    line(ok, name, why) {
        if (ok) this.passed++; else this.failed++;
        process.stdout.write((ok ? "PASS " : "FAIL ") + name + (why ? " (" + why + ")" : "") + "\n");
    }

    runAll(tool) {
        for (const c of this.checks) { const r = this.evaluate(c, tool); this.line(r.ok, c.name, r.why); }
    }

    // A mutant is killed when any check of the suite fails against it. The hinted checks run first
    // (only an ordering: the whole suite runs when none of them fails).
    runMutants(src, filename, mutants) {
        for (const m of mutants) {
            const name = "mutant_" + m.name + "_killed";
            let tool;
            try { tool = compileTool(mutate(src, m.pairs), filename + "#" + m.name); } catch (e) { this.line(false, name, "mutation did not apply: " + e.message); continue; }
            const order = m.hints.map(h => {
                const c = this.checks.find(x => x.name === h);
                if (!c) throw new Error("mutant " + m.name + " hints unknown check " + h);
                return c;
            }).concat(this.checks.filter(c => !m.hints.includes(c.name)));
            let killer = null;
            for (const c of order) { if (!this.evaluate(c, tool).ok) { killer = c.name; break; } }
            this.line(killer !== null, name, killer ? "killed by " + killer : "survived all " + order.length + " checks");
        }
    }

    finish(fixtures) {
        if (fixtures) fixtures.cleanup();
        process.stdout.write("RESULT: " + this.passed + " passed, " + this.failed + " failed\n");
        return this.failed === 0 && this.passed > 0 ? 0 : 1;
    }
}

module.exports = { rng, charRange, Fixtures, compileTool, mutate, capture, Suite, rmrf };
