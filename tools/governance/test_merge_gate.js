#!/usr/bin/env node
"use strict";

/**
 * tools/governance/test_merge_gate.js
 *
 * WG.00.12 Lane I: tests for tools/governance/merge_gate.js. WG.00.12b Lane G1: [pm] manifest trust.
 * Builds a throwaway repository in the OS temp folder: a bare "origin" and a clone ("work") with
 * main checked out and pushed. Each case builds its own lane branch task/lane-<name> with plumbing
 * (a [gemini] or [pm] manifest commit, writer commits, a review commit), pushes it or not, and runs
 * the gate on it from the work tree. Refusal cases run without --dry-run, so a gate that wrongly passed
 * would really merge; every case checks that main did not move unless a merge was expected.
 * Each case must produce exactly its listed reason codes and exit code, and the passing cases
 * must print GATE: PASS. Then each --mutant of the gate (one check switched off, or one rule made
 * stricter) is run on the case that targets it: on a refusal case it must make the case's reason code
 * disappear, on a passing case it must make the gate refuse. That shows each check can fail
 * (AGENTS.md rule 4, ENGINE_RULES §6).
 *
 * Usage: node tools/governance/test_merge_gate.js [--keep] [--only=<substring>]
 *   --keep   leave the temp repository     --only  run matching cases only (no mutants)
 * Output: PASS <name> / FAIL <name>: <detail>, then RESULT: <n> passed, <m> failed. Exit 1 on any failure.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const GATE = path.join(__dirname, "merge_gate.js");
const KEEP = process.argv.includes("--keep");
const ONLY = (process.argv.find(a => a.startsWith("--only=")) || "").slice(7) || null;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "deus-merge-gate-test-"));
const ORIGIN = path.join(TMP, "origin.git");
const WORK = path.join(TMP, "work");
const SELFTEST = { DEUS_MERGE_GATE_SELFTEST: "1" };

let passed = 0, failed = 0;
function check(name, ok, detail) {
    if (ok) { passed++; console.log(`PASS ${name}`); }
    else { failed++; console.log(`FAIL ${name}: ${detail}`); }
}

function cleanEnv(extra) {
    const env = Object.assign({}, process.env);
    for (const k of Object.keys(env)) {
        if (/^(GIT_(DIR|WORK_TREE|INDEX_FILE|PREFIX|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|NAMESPACE)|DEUS_MERGE_GATE_SELFTEST)$/i.test(k)) delete env[k];
    }
    return Object.assign(env, extra || {});
}

function git(cwd, args, opts = {}) {
    const r = spawnSync("git", args, { cwd, encoding: "utf8", env: cleanEnv(opts.env), input: opts.input });
    if (opts.allowFail) return r;
    if (r.status !== 0) throw new Error(`git ${args.join(" ")} (in ${cwd}): ${r.stderr}`);
    return r.stdout.trim();
}
const w = (args, opts) => git(WORK, args, opts);
const mainSha = () => w(["rev-parse", "refs/heads/main"]);
const originMain = () => git(ORIGIN, ["rev-parse", "refs/heads/main"]);

// ---------------------------------------------------------------- fixture

// Temporary global config for the LF regression. Never the real user or system gitconfig.
const AUTOCRLF_TRUE_CONFIG = path.join(TMP, "autocrlf-true.gitconfig");
const AUTOCRLF_TRUE_ENV = { GIT_CONFIG_GLOBAL: AUTOCRLF_TRUE_CONFIG };

function setupFixture() {
    fs.writeFileSync(AUTOCRLF_TRUE_CONFIG, "[core]\n\tautocrlf = true\n\teol = crlf\n\tsafecrlf = true\n");
    git(TMP, ["init", "-q", "--bare", "-b", "main", ORIGIN]);
    fs.mkdirSync(WORK);
    w(["init", "-q", "-b", "main"]);
    for (const [k, v] of [["user.name", "DEUS Test"], ["user.email", "test@deus.invalid"], ["commit.gpgsign", "false"],
        ["core.autocrlf", "false"], ["advice.detachedHead", "false"]]) w(["config", k, v]);
    w(["remote", "add", "origin", ORIGIN]);
    const files = {
        "README.md": "# TEST_ repository\n",
        "src/app.js": "module.exports = {};\n",
        "tools/ops/gate_tests.json": JSON.stringify({ gate: [], quarantine: [{ path: "tests/flaky.js", reason: "TEST_ flaky" }] }, null, 2) + "\n"
    };
    for (const [p, c] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(WORK, p)), { recursive: true });
        fs.writeFileSync(path.join(WORK, p), c);
    }
    w(["add", "-A"]);
    w(["commit", "-q", "-m", "[gemini] TEST_ base"]);
    w(["push", "-q", "-u", "origin", "main"]);
}

// A commit built with a private index, so main stays checked out and clean in the work tree.
function commitTree(parents, files, message) {
    const idx = path.join(TMP, "build.index");
    fs.rmSync(idx, { force: true });
    const env = { GIT_INDEX_FILE: idx };
    w(["read-tree", parents[0]], { env });
    for (const [p, content] of Object.entries(files)) {
        if (content === null) w(["update-index", "--force-remove", "--", p], { env });
        else {
            const blob = w(["hash-object", "-w", "--stdin"], { input: content });
            w(["update-index", "--add", "--cacheinfo", `100644,${blob},${p}`], { env });
        }
    }
    const tree = w(["write-tree"], { env });
    return w(["commit-tree", tree, ...parents.flatMap(p => ["-p", p]), "-m", message]);
}

const FEATURE = {
    "src/feature.js": "module.exports = { add: (a, b) => a + b };\n",
    "tests/test_feature.js": "const f = require(\"../src/feature.js\");\nif (f.add(2, 2) !== 4) { console.log(\"FAIL TEST_ add\"); process.exit(1); }\nconsole.log(\"PASS TEST_ add\");\n"
};
const FAILING_TEST = { "tests/test_feature.js": "console.log(\"FAIL TEST_ deliberate\");\nprocess.exit(1);\n" };
// Reads the committed feature bytes back. A CRLF smudge makes disk differ from the LF blob.
const LF_BYTE_TEST = {
    "tests/test_feature.js":
        "const fs = require(\"fs\");\n" +
        "const disk = fs.readFileSync(\"src/feature.js\");\n" +
        "const expected = " + JSON.stringify(FEATURE["src/feature.js"]) + ";\n" +
        "if (!disk.equals(Buffer.from(expected))) {\n" +
        "    let cr = 0;\n" +
        "    for (const b of disk) if (b === 13) cr++;\n" +
        "    console.log(\"FAIL TEST_ bytes len=\" + disk.length + \" cr=\" + cr);\n" +
        "    process.exit(1);\n" +
        "}\n" +
        "console.log(\"PASS TEST_ bytes\");\n"
};

class Lane {
    constructor(name, manifest) {
        this.name = name;
        this.lane = `lane-${name}`;
        this.branch = `task/lane-${name}`;
        this.dir = `tasks/TEST.01/lane-${name}`;
        this.manifestPath = `${this.dir}/lane.json`;
        this.manifest = Object.assign({
            lane: this.lane, taskId: "TEST.01", branch: this.branch, writer: "claude", reviewer: "grok",
            allowedPaths: ["src/feature.js", "tests/test_feature.js", `${this.dir}/**`],
            gateTests: [{ cmd: "node", args: ["tests/test_feature.js"], timeoutSec: 60 }]
        }, manifest || {});
        for (const k of Object.keys(this.manifest)) if (this.manifest[k] === undefined) delete this.manifest[k];
        this.head = mainSha();
        this.commits = {};
    }
    commit(message, files, extraParents = []) {
        this.head = commitTree([this.head, ...extraParents], files, message);
        w(["update-ref", `refs/heads/${this.branch}`, this.head]);
        return this.head;
    }
    manifestText(m) { return JSON.stringify(m || this.manifest, null, 2) + "\n"; }
    manifestCommit(text, tag = "gemini") {
        return this.commits.manifest = this.commit(`[${tag}] TEST_ brief + manifest`,
            { [this.manifestPath]: text !== undefined ? text : this.manifestText(), [`${this.dir}/BRIEF.md`]: "# TEST_ brief\n" });
    }
    // Opens the lane as the PM does since 0028-AC A0.
    pmOpen() { return this.manifestCommit(undefined, "pm"); }
    // A later manifest change by <subject>: allowedPaths gains src/extra.js, and gateTests gains a test that
    // writes MARK_TAMPER, so a run of the tampered manifest's tests would be seen.
    tamper(subject) {
        const widened = JSON.parse(this.manifestText());
        widened.allowedPaths.push("src/extra.js");
        widened.gateTests.push({ cmd: "node", args: ["-e", `require("fs").writeFileSync(${JSON.stringify(MARK_TAMPER)}, "ran")`], timeoutSec: 30 });
        return this.commit(subject, { [this.manifestPath]: this.manifestText(widened), "src/extra.js": "module.exports = 2;\n" });
    }
    writer(files, message) {
        return this.commits.writer = this.commit(message || "[claude] TEST_ feature", Object.assign({}, FEATURE, files || {}));
    }
    reviewText(target, verdict) { return `# TEST_ review\n\nReviewed commit: ${target}\n\n${verdict}\n`; }
    review(o = {}) {
        const tag = o.tag || "grok", target = o.target || this.head;
        const file = o.file || `${this.dir}/review_${tag}_${target.slice(0, 8)}.md`;
        const body = o.body !== undefined ? o.body : this.reviewText(target, o.verdict || "VERDICT: PASS");
        return this.commits.review = this.commit(o.subject || `[${tag}] TEST_ review of ${target.slice(0, 8)}`,
            Object.assign({ [file]: body }, o.extra || {}));
    }
    push() { w(["push", "-q", "origin", this.branch]); return this; }
    standard() { this.manifestCommit(); this.writer(); this.review(); return this.push(); }
    args(extra) { return ["--lane", this.lane, "--manifest", this.manifestPath, ...(extra || [])]; }
}

function built(name, manifest, steps) {
    const l = new Lane(name, manifest);
    steps(l);
    return l;
}

function addWorktree(l, files) {
    l.wt = path.join(TMP, `wt-${l.name}`);
    w(["worktree", "add", "-q", l.wt, l.branch]);
    for (const [p, c] of Object.entries(files || {})) fs.writeFileSync(path.join(l.wt, p), c);
}
function removeWorktree(l) { w(["worktree", "remove", "--force", l.wt]); }

const MARK_TAMPER = path.join(TMP, "marker_tampered_manifest_test_ran.txt");
const MARK_QUARANTINE = path.join(TMP, "marker_quarantined_test_ran.txt");

// ---------------------------------------------------------------- gate runner

function runGate(args, cwd, env, gate) {
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [gate || GATE, ...args], { cwd, encoding: "utf8", env: cleanEnv(env), maxBuffer: 64 * 1024 * 1024 });
    const out = r.stdout || "";
    const codes = [...new Set([...out.matchAll(/^REFUSED ([A-Z_]+):/gm)].map(m => m[1]))].sort();
    const gm = /^GATE: (PASS|REFUSED) \(exit (\d+)\)$/m.exec(out);
    return { status: r.status, out, err: r.stderr || "", codes, gate: gm ? gm[1] : null, gateExit: gm ? Number(gm[2]) : null, ms: Date.now() - t0 };
}

const PASS = { exit: 0, codes: [] };
const REFUSE = (...codes) => ({ exit: 1, codes });
const DRY = l => l.args(["--dry-run"]);

function runCase(c, extraArgs = [], env, gate) {
    if (!c.lane && c.build) c.lane = c.build();
    const l = c.lane;
    if (c.setup) c.setup(l, c);
    const problems = [];
    let r;
    try {
        const before = mainSha();
        const args = (c.args ? c.args(l) : l.args()).concat(extraArgs);
        r = runGate(args, c.cwd ? c.cwd(l) : WORK, Object.assign({}, c.env || {}, env || {}), gate);
        const after = mainSha();
        const e = c.expect;
        if (r.status !== e.exit) problems.push(`exit ${r.status}, expected ${e.exit}`);
        const want = [...e.codes].sort();
        if (r.codes.join(",") !== want.join(",")) problems.push(`codes [${r.codes.join(", ")}], expected [${want.join(", ")}]`);
        if (r.gate !== (e.exit === 0 ? "PASS" : "REFUSED") || r.gateExit !== r.status) problems.push(`final line GATE: ${r.gate} (exit ${r.gateExit})`);
        if (!e.merged && after !== before) {
            problems.push(`main moved ${before} -> ${after}`);
            w(["reset", "-q", "--hard", before]);
        }
        if (c.verify) { const v = c.verify(r, l, before, after); if (v) problems.push(v); }
    } finally {
        if (c.teardown) c.teardown(l, c);
    }
    const tail = problems.length ? ` | output tail: ${r.out.split("\n").filter(x => /^(REFUSED|GATE|\| \(|NOTE|\.\.)/.test(x)).join(" / ")} ${r.err.slice(-400)}` : "";
    return { ok: problems.length === 0, detail: problems.join("; ") + tail, r };
}

// ---------------------------------------------------------------- verifiers

function verifySummary(r, l, before) {
    const tip = w(["rev-parse", `refs/heads/${l.branch}`]);
    const need = [
        `| local branch | git rev-parse refs/heads/${l.branch} | ${tip} |`,
        `| tracking ref | git rev-parse refs/remotes/origin/${l.branch} | ${tip} |`,
        `| remote branch | git ls-remote origin refs/heads/${l.branch} | ${tip} |`,
        `| local main | git rev-parse refs/heads/main | ${before} |`,
        `| tracking main | git rev-parse refs/remotes/origin/main | ${before} |`,
        `| remote main | git ls-remote origin refs/heads/main | ${before} |`,
        `| checked sha | (local branch tip; every check reads this commit) | ${tip} |`,
        "| A | src/feature.js | yes |", "| A | tests/test_feature.js | yes |", `| A | ${l.manifestPath} | yes |`,
        `| reviewer file | ${l.dir}/review_grok_${l.commits.writer.slice(0, 8)}.md |`,
        `| last non-review commit | ${l.commits.writer} [claude] TEST_ feature |`,
        "| verdict | VERDICT: PASS |",
        "| (f) execution | SKIPPED (dry-run) | - |"
    ];
    const missing = need.filter(s => !r.out.includes(s));
    if (!/^\| 1 \| node tests\/test_feature\.js \| 60 s \| 0 \| \d+\.\d\d s \| PASS \|$/m.test(r.out)) missing.push("test row with command, exit 0 and duration");
    return missing.length ? `summary lacks: ${missing.join(" ; ")}` : null;
}

// An untrusted manifest stops the gate: scope, review and tests are skipped and no test runs.
function verifyManifestStopsGate(r) {
    const missing = ["(a) scope", "(b) review", "(c) tests"].map(c => `| ${c} | SKIPPED (manifest not trusted) | - |`).filter(s => !r.out.includes(s));
    if (/^\.\. test \d+\//m.test(r.out)) missing.push("no gate test may run");
    if (fs.existsSync(MARK_TAMPER)) missing.push("the tampered manifest's test ran");
    return missing.length ? `the gate did not stop at the manifest: ${missing.join(" ; ")}` : null;
}

// The manifest is changed only by the lane-opening commit, tagged tag.
const openedBy = tag => r => (new RegExp(`^\\| changed by \\| [0-9a-f]{40} \\[${tag}\\] TEST_ brief \\+ manifest \\|$`, "m").test(r.out) ? null : `the Manifest table does not list the [${tag}] commit`);

function verifyRealMerge(r, l, before, after) {
    const tip = w(["rev-parse", `refs/heads/${l.branch}`]);
    const parents = w(["rev-list", "--parents", "-n", "1", after]).split(" ").slice(1);
    const errs = [];
    if (parents.join(" ") !== `${before} ${tip}`) errs.push(`main ${after} parents [${parents.join(" ")}], expected [${before} ${tip}]`);
    if (originMain() !== before) errs.push(`origin main moved to ${originMain()}: the gate pushed`);
    if (w(["status", "--porcelain"])) errs.push("work tree not clean after merge");
    if (!r.out.includes(`| (f) execution | MERGED ${after} `)) errs.push("execution row lacks MERGED <sha>");
    return errs.join("; ") || null;
}

// A real merge on a fresh lane. Teardown puts local main (and origin main, should a broken gate
// have pushed) back where they were.
function realMergeCase(name, laneName) {
    return {
        name, build: () => new Lane(laneName).standard(), expect: Object.assign({ merged: true }, PASS), verify: verifyRealMerge,
        setup: (l, c) => { c.originBefore = originMain(); },
        teardown: (l, c) => {
            if (originMain() !== c.originBefore) w(["push", "-q", "-f", "origin", `${c.originBefore}:refs/heads/main`]);
            w(["reset", "-q", "--hard", c.originBefore]);
        }
    };
}

// ---------------------------------------------------------------- cases

const CASES = [
    // passing cases
    { name: "pass_valid_lane_dry_run_prints_summary", build: () => new Lane("ok").standard(), args: DRY, expect: PASS, verify: verifySummary },
    { name: "pass_clean_pass_bold_verdict", build: () => built("bold", null, l => { l.manifestCommit(); l.writer(); l.review({ verdict: "**VERDICT:** CLEAN PASS" }); l.push(); }), args: DRY, expect: PASS },
    {
        name: "pass_failed_review_then_fix_then_pass_review", args: DRY, expect: PASS,
        build: () => built("refail", null, l => {
            l.manifestCommit(); l.writer(); l.review({ verdict: "VERDICT: FAIL" });
            l.writer({ "src/feature.js": "module.exports = { add: (a, b) => b + a };\n" }, "[claude] TEST_ fix"); l.review(); l.push();
        })
    },
    {
        name: "pass_review_names_gemini_commit_after_writer", args: DRY, expect: PASS,
        build: () => built("gem", null, l => {
            l.manifestCommit(); l.writer(); l.commit("[gemini] TEST_ launch prompt", { [`${l.dir}/launches/p.txt`]: "TEST_ prompt\n" }); l.review(); l.push();
        })
    },
    { name: "pass_no_designated_reviewer_grok_review", build: () => new Lane("anyrev", { reviewer: undefined }).standard(), args: DRY, expect: PASS },
    {
        name: "pass_gemini_updates_manifest_later", args: DRY, expect: PASS,
        build: () => built("upd", null, l => {
            l.manifestCommit(); l.writer();
            l.manifest.allowedPaths.push("docs/feature.md");
            l.commit("[gemini] TEST_ widen scope", { [l.manifestPath]: l.manifestText() });
            l.writer({ "docs/feature.md": "TEST_ doc\n" }, "[claude] TEST_ doc"); l.review(); l.push();
        })
    },
    {
        name: "pass_run_from_lane_worktree", build: () => new Lane("wt").standard(), args: DRY, expect: PASS,
        setup: l => addWorktree(l), teardown: removeWorktree, cwd: l => l.wt
    },
    // OPS.10.04. The gate process sees only the temp global config (autocrlf=true, eol=crlf, safecrlf=true).
    {
        name: "pass_clone_lf_under_autocrlf_true",
        build: () => built("lf", null, l => { l.manifestCommit(); l.writer(LF_BYTE_TEST); l.review(); l.push(); }),
        args: DRY, env: AUTOCRLF_TRUE_ENV, expect: PASS,
        verify: r => (/^\| 1 \| node tests\/test_feature\.js \| 60 s \| 0 \| \d+\.\d\d s \| PASS \|$/m.test(r.out) ? null : "LF byte test did not pass through the gate")
    },

    // (b) review
    { name: "fail_same_tag_review_claude_reviews_claude", build: () => built("self", { reviewer: undefined }, l => { l.manifestCommit(); l.writer(); l.review({ tag: "claude" }); l.push(); }), expect: REFUSE("REVIEW_SAME_FAMILY") },
    { name: "fail_same_tag_review_with_designated_reviewer", build: () => built("self2", null, l => { l.manifestCommit(); l.writer(); l.review({ tag: "claude" }); l.push(); }), expect: REFUSE("REVIEW_SAME_FAMILY", "REVIEWER_NOT_DESIGNATED") },
    { name: "fail_fable_reviews_claude", build: () => built("fable1", { reviewer: undefined }, l => { l.manifestCommit(); l.writer(); l.review({ tag: "fable" }); l.push(); }), expect: REFUSE("REVIEW_SAME_FAMILY") },
    { name: "fail_claude_reviews_fable", build: () => built("fable2", { writer: "fable", reviewer: undefined }, l => { l.manifestCommit(); l.writer(null, "[fable] TEST_ feature"); l.review({ tag: "claude" }); l.push(); }), expect: REFUSE("REVIEW_SAME_FAMILY") },
    { name: "fail_review_names_other_commit", build: () => built("other", null, l => { l.manifestCommit(); l.writer(); l.review({ target: l.commits.manifest }); l.push(); }), expect: REFUSE("REVIEW_FILE_NAME", "REVIEW_WRONG_COMMIT") },
    { name: "fail_review_hash_wrong_content", build: () => built("wronghash", null, l => { l.manifestCommit(); l.writer(); l.review({ body: l.reviewText(l.commits.manifest, "VERDICT: PASS") }); l.push(); }), expect: REFUSE("REVIEW_WRONG_COMMIT") },
    { name: "fail_review_hash_abbreviated", build: () => built("abbrev", null, l => { l.manifestCommit(); l.writer(); l.review({ body: l.reviewText(l.head.slice(0, 12), "VERDICT: PASS") }); l.push(); }), expect: REFUSE("REVIEW_HASH_MISSING") },
    { name: "fail_writer_commit_after_review", build: () => built("after", null, l => { l.manifestCommit(); l.writer(); l.review(); l.writer({ "src/feature.js": "module.exports = { add: () => 4 };\n" }, "[claude] TEST_ after review"); l.push(); }), expect: REFUSE("REVIEW_NOT_LAST") },
    { name: "fail_gemini_commit_after_review", build: () => built("after2", null, l => { l.manifestCommit(); l.writer(); l.review(); l.commit("[gemini] TEST_ launch prompt", { [`${l.dir}/launches/p.txt`]: "x\n" }); l.push(); }), expect: REFUSE("REVIEW_NOT_LAST") },
    { name: "fail_verdict_missing", build: () => built("vmiss", null, l => { l.manifestCommit(); l.writer(); l.review({ verdict: "Looks fine to me." }); l.push(); }), expect: REFUSE("REVIEW_VERDICT_MISSING") },
    { name: "fail_verdict_fail", build: () => built("vfail", null, l => { l.manifestCommit(); l.writer(); l.review({ verdict: "VERDICT: FAIL" }); l.push(); }), expect: REFUSE("REVIEW_VERDICT_NOT_PASS") },
    { name: "fail_verdict_incomplete", build: () => built("vinc", null, l => { l.manifestCommit(); l.writer(); l.review({ verdict: "VERDICT: PASS (pending re-run of test 2)" }); l.push(); }), expect: REFUSE("REVIEW_VERDICT_NOT_PASS") },
    { name: "fail_verdict_empty", build: () => built("vempty", null, l => { l.manifestCommit(); l.writer(); l.review({ verdict: "VERDICT:" }); l.push(); }), expect: REFUSE("REVIEW_VERDICT_NOT_PASS") },
    { name: "fail_verdict_conflicting_lines", build: () => built("vboth", null, l => { l.manifestCommit(); l.writer(); l.review({ verdict: "VERDICT: PASS\n\nVerdict: FAIL (see F1)" }); l.push(); }), expect: REFUSE("REVIEW_VERDICT_NOT_PASS") },
    { name: "fail_review_commit_touches_code", build: () => built("rcode", null, l => { l.manifestCommit(); l.writer(); l.review({ extra: { "src/feature.js": "module.exports = { add: () => 4 };\n" } }); l.push(); }), expect: REFUSE("REVIEW_COMMIT_FILES") },
    { name: "fail_review_file_misnamed", build: () => built("rname", null, l => { l.manifestCommit(); l.writer(); l.review({ file: `${l.dir}/review_codex_${l.head.slice(0, 8)}.md` }); l.push(); }), expect: REFUSE("REVIEW_FILE_NAME") },
    { name: "fail_reviewer_not_designated", build: () => built("codex", null, l => { l.manifestCommit(); l.writer(); l.review({ tag: "codex" }); l.push(); }), expect: REFUSE("REVIEWER_NOT_DESIGNATED") },
    { name: "fail_review_tag_unknown", build: () => built("bob", null, l => { l.manifestCommit(); l.writer(); l.review({ tag: "bob" }); l.push(); }), expect: REFUSE("REVIEW_TAG_UNKNOWN") },
    { name: "fail_review_missing", build: () => built("norev", null, l => { l.manifestCommit(); l.writer(); l.push(); }), expect: REFUSE("REVIEW_MISSING") },

    // (c) tests
    {
        name: "fail_test_exits_nonzero", build: () => built("tfail", null, l => { l.manifestCommit(); l.writer(FAILING_TEST); l.review(); l.push(); }), expect: REFUSE("TEST_FAILED"),
        verify: r => (/^\| 1 \| node tests\/test_feature\.js \| 60 s \| 1 \| \d+\.\d\d s \| FAIL \|$/m.test(r.out) && r.out.includes("FAIL TEST_ deliberate") ? null : "test row with exit 1 or the captured output is missing")
    },
    {
        name: "fail_test_timeout",
        build: () => built("tslow", { gateTests: [{ cmd: "node", args: ["tests/test_feature.js"], timeoutSec: 1 }] }, l => {
            l.manifestCommit(); l.writer({ "tests/test_feature.js": "setTimeout(() => { console.log(\"TEST_ slept\"); process.exit(0); }, 15000);\n" }); l.review(); l.push();
        }),
        expect: REFUSE("TEST_TIMEOUT"),
        verify: r => (r.ms < 12000 && /\| 1 s \| [^|]+ \| \d+\.\d\d s \| TIMEOUT \|/.test(r.out) ? null : `gate took ${r.ms} ms or no TIMEOUT row: the 15 s test was not stopped at 1 s`)
    },
    { name: "fail_test_spawn_error", build: () => new Lane("tspawn", { gateTests: [{ cmd: "deus-no-such-command-xyz", args: [], timeoutSec: 30 }] }).standard(), expect: REFUSE("TEST_SPAWN_ERROR") },
    { name: "fail_no_gate_tests", build: () => new Lane("tnone", { gateTests: [] }).standard(), expect: REFUSE("TESTS_NONE") },
    {
        name: "fail_quarantined_test",
        build: () => built("quar", {
            allowedPaths: ["src/feature.js", "tests/test_feature.js", "tests/flaky.js", "tasks/TEST.01/lane-quar/**"],
            gateTests: [{ cmd: "node", args: ["tests/test_feature.js"], timeoutSec: 60 }, { cmd: "node", args: ["tests\\Flaky.js"], timeoutSec: 60 }]
        }, l => {
            l.manifestCommit(); l.writer({ "tests/flaky.js": `require("fs").writeFileSync(${JSON.stringify(MARK_QUARANTINE)}, "ran");\n` }); l.review(); l.push();
        }),
        setup: () => fs.rmSync(MARK_QUARANTINE, { force: true }),
        expect: REFUSE("TEST_QUARANTINED"),
        verify: () => (fs.existsSync(MARK_QUARANTINE) ? "the quarantined test was run" : null)
    },
    {
        name: "fail_quarantine_list_invalid_on_branch",
        build: () => built("qbad", { allowedPaths: ["src/feature.js", "tests/test_feature.js", "tools/ops/gate_tests.json", "tasks/TEST.01/lane-qbad/**"] }, l => {
            l.manifestCommit(); l.writer({ "tools/ops/gate_tests.json": "{ not json" }); l.review(); l.push();
        }),
        expect: REFUSE("QUARANTINE_LIST_INVALID")
    },
    {
        name: "fail_uncommitted_fix_not_counted", build: () => built("dirtyfix", null, l => { l.manifestCommit(); l.writer(FAILING_TEST); l.review(); l.push(); }),
        setup: l => addWorktree(l, { "tests/test_feature.js": FEATURE["tests/test_feature.js"] }), teardown: removeWorktree, cwd: l => l.wt,
        expect: REFUSE("TEST_FAILED")
    },

    // (a) scope and manifest
    { name: "fail_out_of_scope_file", build: () => built("scope", null, l => { l.manifestCommit(); l.writer({ "src/other.js": "module.exports = 1;\n" }); l.review(); l.push(); }), expect: REFUSE("SCOPE_VIOLATION") },
    { name: "fail_out_of_scope_deletion", build: () => built("scopedel", null, l => { l.manifestCommit(); l.writer({ "README.md": null }); l.review(); l.push(); }), expect: REFUSE("SCOPE_VIOLATION") },
    { name: "fail_sibling_lane_dir_prefix", build: () => built("pre", null, l => { l.manifestCommit(); l.writer({ "tasks/TEST.01/lane-pre-x/notes.md": "TEST_\n" }); l.review(); l.push(); }), expect: REFUSE("SCOPE_VIOLATION") },
    {
        name: "fail_writer_edits_lane_json",
        build: () => built("tamper", null, l => {
            l.manifestCommit(); l.writer();
            const widened = JSON.parse(l.manifestText());
            widened.allowedPaths.push("src/extra.js");
            widened.gateTests.push({ cmd: "node", args: ["-e", `require("fs").writeFileSync(${JSON.stringify(MARK_TAMPER)}, "ran")`], timeoutSec: 30 });
            l.commit("[claude] TEST_ widen my own scope", { [l.manifestPath]: l.manifestText(widened), "src/extra.js": "module.exports = 2;\n" });
            l.review(); l.push();
        }),
        setup: () => fs.rmSync(MARK_TAMPER, { force: true }),
        expect: REFUSE("MANIFEST_TAMPERED"),
        verify: () => (fs.existsSync(MARK_TAMPER) ? "a gateTests entry from the tampered manifest was run" : null)
    },
    {
        name: "fail_lane_json_edited_by_grok",
        build: () => built("tgrok", null, l => {
            l.manifestCommit(); l.writer();
            l.commit("[grok] TEST_ tweak manifest", { [l.manifestPath]: l.manifestText(Object.assign({}, l.manifest, { reviewer: "codex" })) });
            l.review(); l.push();
        }),
        expect: REFUSE("MANIFEST_TAMPERED")
    },
    {
        name: "fail_lane_json_changed_by_merge_commit",
        build: () => built("evil", null, l => {
            l.manifestCommit(); l.writer();
            const side = commitTree([l.head], { [`${l.dir}/launches/p.txt`]: "x\n" }, "[gemini] TEST_ side");
            const widened = Object.assign({}, l.manifest, { allowedPaths: l.manifest.allowedPaths.concat("**") });
            l.commit("Merge TEST_ side", { [`${l.dir}/launches/p.txt`]: "x\n", [l.manifestPath]: l.manifestText(widened) }, [side]);
            l.review(); l.push();
        }),
        expect: REFUSE("MANIFEST_TAMPERED")
    },

    // (a) manifest provenance for PM-opened lanes (0028-AC A0): [gemini] and [pm] single-parent commits only
    { name: "pass_pm_opened_lane", build: () => built("pmopen", null, l => { l.pmOpen(); l.writer(); l.review(); l.push(); }), args: DRY, expect: PASS, verify: openedBy("pm") },
    {
        name: "pass_pm_opened_lane_widened_by_pm_then_gemini", args: DRY, expect: PASS,
        build: () => built("pmupd", null, l => {
            l.pmOpen(); l.writer();
            l.manifest.allowedPaths.push("docs/feature.md");
            l.commit("[pm] TEST_ widen scope", { [l.manifestPath]: l.manifestText() });
            l.manifest.allowedPaths.push("docs/feature2.md");
            l.commit("[gemini] TEST_ widen scope again", { [l.manifestPath]: l.manifestText() });
            l.writer({ "docs/feature.md": "TEST_ doc\n", "docs/feature2.md": "TEST_ doc 2\n" }, "[claude] TEST_ docs"); l.review(); l.push();
        }),
        verify: r => ((r.out.match(/^\| (?:changed by)? \| [0-9a-f]{40} \[(?:pm|gemini)\] TEST_ (?:widen scope|brief \+ manifest)/gm) || []).length === 3 ? null : "the Manifest table does not list the three [pm] / [gemini] commits")
    },
    {
        name: "fail_claude_edits_pm_opened_lane_json", expect: REFUSE("MANIFEST_TAMPERED"),
        build: () => built("pmtamper", null, l => { l.pmOpen(); l.writer(); l.tamper("[claude] TEST_ widen my own scope"); l.review(); l.push(); }),
        setup: () => fs.rmSync(MARK_TAMPER, { force: true }), verify: verifyManifestStopsGate
    },
    { name: "fail_lane_json_edited_by_ops", build: () => built("tops", null, l => { l.pmOpen(); l.writer(); l.tamper("[ops] TEST_ tweak manifest"); l.review(); l.push(); }), expect: REFUSE("MANIFEST_TAMPERED"), setup: () => fs.rmSync(MARK_TAMPER, { force: true }), verify: verifyManifestStopsGate },
    { name: "fail_lane_json_edited_by_codex", build: () => built("tcodex", null, l => { l.pmOpen(); l.writer(); l.tamper("[codex] TEST_ tweak manifest"); l.review(); l.push(); }), expect: REFUSE("MANIFEST_TAMPERED"), setup: () => fs.rmSync(MARK_TAMPER, { force: true }), verify: verifyManifestStopsGate },
    { name: "fail_lane_json_edited_by_untagged_commit", build: () => built("tnotag", null, l => { l.pmOpen(); l.writer(); l.tamper("TEST_ tweak manifest"); l.review(); l.push(); }), expect: REFUSE("MANIFEST_TAMPERED"), setup: () => fs.rmSync(MARK_TAMPER, { force: true }), verify: verifyManifestStopsGate },
    { name: "fail_lane_json_edited_by_grok_pm_tag", build: () => built("tgrokpm", null, l => { l.pmOpen(); l.writer(); l.tamper("[grok_pm] TEST_ tweak manifest"); l.review(); l.push(); }), expect: REFUSE("MANIFEST_TAMPERED"), setup: () => fs.rmSync(MARK_TAMPER, { force: true }), verify: verifyManifestStopsGate },
    {
        name: "fail_lane_json_changed_by_pm_merge_commit",
        build: () => built("pmmerge", null, l => {
            l.pmOpen(); l.writer();
            const side = commitTree([l.head], { [`${l.dir}/launches/p.txt`]: "x\n" }, "[pm] TEST_ side");
            const widened = Object.assign({}, l.manifest, { allowedPaths: l.manifest.allowedPaths.concat("**") });
            l.commit("[pm] Merge TEST_ side", { [`${l.dir}/launches/p.txt`]: "x\n", [l.manifestPath]: l.manifestText(widened) }, [side]);
            l.review(); l.push();
        }),
        expect: REFUSE("MANIFEST_TAMPERED"), verify: verifyManifestStopsGate
    },
    {
        name: "fail_pm_review_commit_is_not_a_review", expect: REFUSE("REVIEW_TAG_UNKNOWN"),
        build: () => built("pmrev", { reviewer: undefined }, l => { l.pmOpen(); l.writer(); l.review({ tag: "pm" }); l.push(); }),
        verify: r => (/^REFUSED REVIEW_TAG_UNKNOWN: .*\[pm\] may write lane\.json but never reviews$/m.test(r.out) ? null : "the refusal does not say [pm] never reviews")
    },
    { name: "fail_pm_commit_after_review", build: () => built("pmafter", null, l => { l.pmOpen(); l.writer(); l.review(); l.commit("[pm] TEST_ brief update", { [`${l.dir}/BRIEF.md`]: "# TEST_ brief v2\n" }); l.push(); }), expect: REFUSE("REVIEW_NOT_LAST") },

    { name: "fail_manifest_missing", build: () => built("nomani", null, l => { l.writer(); l.review(); l.push(); }), expect: REFUSE("MANIFEST_MISSING") },
    { name: "fail_manifest_invalid_json", build: () => built("badjson", null, l => { l.manifestCommit("{ \"lane\": "); l.writer(); l.review(); l.push(); }), expect: REFUSE("MANIFEST_INVALID") },
    { name: "fail_manifest_branch_mismatch", build: () => new Lane("mism", { branch: "task/lane-elsewhere" }).standard(), expect: REFUSE("MANIFEST_MISMATCH") },
    { name: "fail_manifest_path_of_other_lane", build: () => new Lane("mpath").standard(), args: l => ["--lane", l.lane, "--manifest", "tasks/TEST.01/lane-ok/lane.json"], expect: REFUSE("MANIFEST_MISMATCH") },

    // (d) pushed
    { name: "fail_branch_unpushed_local_ahead", build: () => built("ahead", null, l => { l.manifestCommit(); l.writer(); l.push(); l.review(); }), expect: REFUSE("BRANCH_UNPUSHED") },
    {
        name: "fail_branch_diverged",
        build: () => built("div", null, l => {
            l.standard();
            const alt = commitTree([l.commits.writer], { [`${l.dir}/review_grok_${l.commits.writer.slice(0, 8)}.md`]: l.reviewText(l.commits.writer, "VERDICT: CLEAN PASS") },
                `[grok] TEST_ review of ${l.commits.writer.slice(0, 8)} (rewritten)`);
            w(["update-ref", `refs/heads/${l.branch}`, alt]);
        }),
        expect: REFUSE("BRANCH_DIVERGED")
    },
    { name: "fail_branch_never_pushed", build: () => built("nopush", null, l => { l.manifestCommit(); l.writer(); l.review(); }), expect: REFUSE("BRANCH_NOT_ON_REMOTE") },
    {
        name: "fail_local_behind_remote",
        build: () => built("behind", null, l => {
            l.standard();
            const extra = commitTree([l.head], { [`${l.dir}/notes.md`]: "TEST_ pushed from another clone\n" }, "[claude] TEST_ remote-only commit");
            w(["push", "-q", "origin", `${extra}:refs/heads/${l.branch}`]);
        }),
        expect: REFUSE("BRANCH_BEHIND_REMOTE")
    },
    {
        name: "fail_tracking_ref_stale", build: () => new Lane("track").standard(),
        setup: l => {
            w(["config", "--replace-all", "remote.origin.fetch", "+refs/heads/main:refs/remotes/origin/main"]);
            w(["update-ref", `refs/remotes/origin/${l.branch}`, l.commits.writer]);
        },
        teardown: l => {
            w(["config", "--replace-all", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"]);
            w(["update-ref", `refs/remotes/origin/${l.branch}`, l.head]);
        },
        expect: REFUSE("TRACKING_REF_STALE")
    },
    { name: "fail_branch_missing", args: () => ["--lane", "lane-ghost", "--manifest", "tasks/TEST.01/lane-ghost/lane.json"], expect: REFUSE("BRANCH_MISSING", "BRANCH_NOT_ON_REMOTE") },

    // (e) main
    {
        name: "fail_main_dirty", build: () => new Lane("mdirty").standard(),
        setup: () => fs.appendFileSync(path.join(WORK, "README.md"), "TEST_ uncommitted edit\n"), teardown: () => w(["checkout", "-q", "--", "README.md"]),
        expect: REFUSE("MAIN_DIRTY")
    },
    {
        name: "fail_main_merge_in_progress", build: () => new Lane("mmerge").standard(),
        setup: l => fs.writeFileSync(path.join(WORK, ".git", "MERGE_HEAD"), l.head + "\n"), teardown: () => fs.rmSync(path.join(WORK, ".git", "MERGE_HEAD"), { force: true }),
        expect: REFUSE("MAIN_DIRTY")
    },
    {
        name: "fail_main_not_synced", build: () => new Lane("msync").standard(),
        setup: (l, c) => {
            c.saved = mainSha();
            fs.writeFileSync(path.join(WORK, "local.md"), "TEST_ local only\n");
            w(["add", "local.md"]); w(["commit", "-q", "-m", "[gemini] TEST_ local-only commit"]);
        },
        teardown: (l, c) => w(["reset", "-q", "--hard", c.saved]),
        expect: REFUSE("MAIN_NOT_SYNCED")
    },
    {
        name: "fail_main_not_checked_out", build: () => new Lane("mdetach").standard(),
        setup: () => w(["checkout", "-q", "--detach"]), teardown: () => w(["checkout", "-q", "main"]),
        expect: REFUSE("MAIN_NOT_CHECKED_OUT")
    },

    // usage and mutant guard
    { name: "fail_usage_without_manifest", args: () => ["--lane", "lane-ok"], expect: { exit: 2, codes: ["USAGE"] } },
    { name: "fail_mutant_flag_without_selftest_env", build: () => new Lane("mutenv").standard(), args: l => l.args(["--dry-run", "--mutant=scope_off"]), expect: { exit: 2, codes: ["MUTANT_NOT_ALLOWED"] } },
    { name: "fail_unknown_mutant", build: () => new Lane("mutname").standard(), args: l => l.args(["--mutant=no_such_check"]), env: SELFTEST, expect: { exit: 2, codes: ["USAGE"] } },
    {
        name: "mutant_run_is_forced_dry_run_and_never_merges", build: () => new Lane("mutdry").standard(), args: l => l.args(["--mutant=scope_off"]), env: SELFTEST, expect: PASS,
        verify: r => (r.out.includes("| mode | dry-run (forced: mutants active) |") && r.out.includes("| (f) execution | SKIPPED (dry-run (forced: mutants active)) | - |") ? null : "mode or execution row does not show the forced dry-run")
    },

    // (f) execution; these change main, so they run last
    realMergeCase("pass_real_merge_no_ff_never_pushes", "merge"),
    {
        name: "fail_merge_conflict_is_aborted", build: () => new Lane("conflict").standard(),
        setup: (l, c) => {
            if (c.moved) return;
            fs.mkdirSync(path.join(WORK, "src"), { recursive: true });
            fs.writeFileSync(path.join(WORK, "src", "feature.js"), "module.exports = { add: () => 5 };\n");
            w(["add", "src/feature.js"]); w(["commit", "-q", "-m", "[gemini] TEST_ main moves under the lane"]); w(["push", "-q", "origin", "main"]);
            c.moved = true;
        },
        expect: REFUSE("MERGE_FAILED"),
        verify: () => {
            const errs = [];
            if (w(["status", "--porcelain"])) errs.push("work tree not clean after the aborted merge");
            if (w(["rev-parse", "-q", "--verify", "MERGE_HEAD"], { allowFail: true }).status === 0) errs.push("MERGE_HEAD left behind");
            return errs.join("; ") || null;
        }
    },
    {
        name: "fail_nothing_to_merge", build: () => new Lane("done").standard(),
        setup: (l, c) => {
            if (c.merged) return;
            w(["merge", "-q", "--no-ff", "-m", "[gemini] TEST_ merge lane-done by hand", l.branch]); w(["push", "-q", "origin", "main"]);
            c.merged = true;
        },
        expect: REFUSE("NOTHING_TO_MERGE")
    }
];

// Mutant -> the case it must break: a refusal case must lose a reason code, a passing case must be refused.
const KILLS = {
    manifest_provenance_off: "fail_writer_edits_lane_json",
    manifest_trust_any_tag: "fail_lane_json_edited_by_ops",
    manifest_trust_pm_merge: "fail_lane_json_changed_by_pm_merge_commit",
    manifest_gemini_untrusted: "pass_valid_lane_dry_run_prints_summary",
    manifest_pm_untrusted: "pass_pm_opened_lane",
    pm_review_family: "fail_pm_review_commit_is_not_a_review",
    scope_off: "fail_out_of_scope_file",
    review_required_off: "fail_review_missing",
    review_order_off: "fail_writer_commit_after_review",
    review_family_off: "fail_same_tag_review_claude_reviews_claude",
    fable_alias_off: "fail_fable_reviews_claude",
    reviewer_designation_off: "fail_reviewer_not_designated",
    review_files_off: "fail_review_commit_touches_code",
    review_name_off: "fail_review_file_misnamed",
    review_hash_off: "fail_review_hash_wrong_content",
    verdict_off: "fail_verdict_fail",
    test_exit_off: "fail_test_exits_nonzero",
    test_timeout_off: "fail_test_timeout",
    quarantine_off: "fail_quarantined_test",
    fresh_clone_off: "fail_uncommitted_fix_not_counted",
    clone_autocrlf_off: "pass_clone_lf_under_autocrlf_true",
    push_off: "fail_branch_unpushed_local_ahead",
    tracking_off: "fail_tracking_ref_stale",
    main_clean_off: "fail_main_dirty",
    main_sync_off: "fail_main_not_synced"
};

// Source mutants of the execution step, which has no --mutant flag: each copy of the gate must
// fail a fresh case that the real gate passes. They run last because a broken gate may merge or push.
// kill(suffix) builds a new lane each call, so the control run and the mutant run never share a branch.
const SOURCE_MUTANTS = [
    { name: "dry_run_merges", from: "else if (dryRun) R.execution", to: "else if (false) R.execution",
        kill: sfx => ({ name: "src_dry_run", build: () => new Lane(`srcdry${sfx}`).standard(), args: DRY, expect: PASS }) },
    { name: "fast_forward_merge", from: "[\"merge\", \"--no-ff\", \"--no-edit\"", to: "[\"merge\", \"--ff\", \"--no-edit\"",
        kill: sfx => realMergeCase("src_ff", `srcff${sfx}`) },
    { name: "push_after_merge", from: "R.execution = `MERGED ${head}", to: "git([\"push\", \"-q\", REMOTE, MAIN]); R.execution = `MERGED ${head}",
        kill: sfx => realMergeCase("src_push", `srcpush${sfx}`) }
];

// ---------------------------------------------------------------- unit checks

function unitChecks(G) {
    const g1 = G.globToRegExp("tasks/WG.00.12/lane-i/**");
    const g2 = G.globToRegExp("tools/governance/merge_gate.js");
    const g3 = G.globToRegExp("src/*.js");
    const g4 = G.globToRegExp("docs/**/x.md");
    check("unit_glob", g1.test("tasks/WG.00.12/lane-i/review_grok_0123abcd.md") && g1.test("tasks/WG.00.12/lane-i/a/b.txt") &&
        !g1.test("tasks/WG.00.12/lane-ij/x") && !g1.test("tasks/WGx00.12/lane-i/x") && !g1.test("tasks/WG.00.12/lane-i") &&
        g2.test("tools/governance/merge_gate.js") && !g2.test("tools/governance/merge_gate.jsx") && !g2.test("Tools/governance/merge_gate.js") &&
        !g2.test("x/tools/governance/merge_gate.js") && g3.test("src/a.js") && !g3.test("src/a/b.js") &&
        g4.test("docs/x.md") && g4.test("docs/a/b/x.md") && !g4.test("docsx.md") &&
        [null, "", "/abs/x", "C:/x", "a/../b", "./a", "a\\b"].every(g => G.globToRegExp(g) === null),
        "globToRegExp matched wrongly");
    const passes = ["VERDICT: PASS", "VERDICT: CLEAN PASS", "**VERDICT: PASS**", "**VERDICT:** CLEAN PASS", "## VERDICT: PASS", "- VERDICT: PASS", "text\n\nVERDICT: PASS\r\n"];
    const fails = ["VERDICT: FAIL", "VERDICT: PASS WITH FINDINGS", "VERDICT: pass", "Verdict: PASS", "VERDICT:", "VERDICT: PASSED", "VERDICT: PASS\nVERDICT: FAIL", "no verdict here", ""];
    const badP = passes.filter(t => !G.parseVerdict(t).pass), badF = fails.filter(t => G.parseVerdict(t).pass);
    check("unit_verdict", !badP.length && !badF.length && G.parseVerdict("").lines.length === 0 && G.parseVerdict("VERDICT: FAIL").lines.length === 1,
        `rejected ${JSON.stringify(badP)}; accepted ${JSON.stringify(badF)}`);
    check("unit_tags_and_families", G.subjectTag("[grok] x") === "grok" && G.subjectTag("[Fable] y") === "fable" && G.subjectTag("Merge branch 'main'") === null &&
        G.subjectTag(" [grok] x") === null && G.family("fable") === "claude" && G.family("Claude") === "claude" && G.family("antigravity") === "gemini" &&
        G.family("grok") === "grok" && G.family("bob") === null && G.family(null) === null && G.PM_TAG === "pm" && G.family("pm") === null &&
        G.family("PM") === null && G.subjectTag("[PM] Open lane-x") === "pm", "subjectTag / family table");
    const hc = (tag, parents = 1) => ({ sha: "0".repeat(40), tag, parents: Array.from({ length: parents }, (_, i) => String(i)) });
    const trusted = [hc("gemini"), hc("antigravity"), hc("pm")];
    const untrusted = [hc("claude"), hc("fable"), hc("grok"), hc("codex"), hc("ops"), hc("owner"), hc(null), hc("grok_pm"), hc("pm_bot"), hc("pmx"),
        hc("gemini", 2), hc("pm", 2), hc("pm", 3)];
    const wrongT = trusted.filter(h => !G.trustedManifestCommit(h)), wrongU = untrusted.filter(h => G.trustedManifestCommit(h));
    check("unit_manifest_trust", !wrongT.length && !wrongU.length,
        `refused ${JSON.stringify(wrongT.map(h => [h.tag, h.parents.length]))}; trusted ${JSON.stringify(wrongU.map(h => [h.tag, h.parents.length]))}`);
    const h40 = "0123456789abcdef0123456789abcdef01234567", h64 = "f".repeat(64);
    check("unit_full_hashes", G.fullHashes(`a ${h40} b ${h64} ${h40.toUpperCase()} ${h40.slice(0, 12)}`).join() === h40, "fullHashes must keep exact 40-hex tokens only");
    check("unit_quarantine_path_normalisation", G.normPath(".\\tests\\Flaky.js") === "tests/flaky.js" && G.normPath("./tests/flaky.js") === "tests/flaky.js", "normPath");
    check("unit_manifest_validation", G.validateManifest({ lane: "l", taskId: "T", branch: "task/l", writer: "claude", reviewer: "fable", allowedPaths: ["a"], gateTests: [] }).some(e => e.includes("writer's family")) &&
        G.validateManifest({ lane: "l", taskId: "T", branch: "task/l", writer: "claude", allowedPaths: ["a"], gateTests: [{ cmd: "node", timeoutSec: 0 }] }).some(e => e.includes("timeoutSec")) &&
        G.validateManifest({ lane: "l", taskId: "T", branch: "task/l", writer: "claude", allowedPaths: ["a"], gateTests: [{ cmd: "node", args: ["x"], timeoutSec: 5 }] }).length === 0 &&
        G.validateManifest({ lane: "l", taskId: "T", branch: "task/l", writer: "pm", allowedPaths: ["a"], gateTests: [] }).some(e => e.includes("writer \"pm\" is not a known agent")) &&
        G.validateManifest({ lane: "l", taskId: "T", branch: "task/l", writer: "claude", reviewer: "pm", allowedPaths: ["a"], gateTests: [] }).some(e => e.includes("reviewer \"pm\" is not a known agent")) &&
        G.validateManifest({ lane: "l", taskId: "T", branch: "task/l", writer: "claude", push: true, allowedPaths: ["a"], gateTests: [] }).length === 0 &&
        G.validateManifest({ lane: "l", taskId: "T", branch: "task/l", writer: "claude", push: false, allowedPaths: ["a"], gateTests: [] }).length === 0 &&
        ["yes", 1, null].every(p => G.validateManifest({ lane: "l", taskId: "T", branch: "task/l", writer: "claude", push: p, allowedPaths: ["a"], gateTests: [] }).some(e => e.includes("\"push\" must be true or false"))),
        "validateManifest");
    const mk = Object.keys(G.MUTANTS).sort().join(), kk = Object.keys(KILLS).sort().join();
    check("unit_every_mutant_has_a_kill_case", mk === kk && Object.values(KILLS).every(n => CASES.some(c => c.name === n)), `gate mutants [${mk}] vs kill table [${kk}]`);
}

// ---------------------------------------------------------------- main

function main() {
    console.log("=== merge_gate.js tests (WG.00.12 Lane I) ===");
    console.log(`temp repository: ${TMP}`);
    const G = require(GATE);
    unitChecks(G);
    try {
        setupFixture();
    } catch (e) {
        check("fixture_setup", false, e.message);
        return finish();
    }
    const results = new Map();
    for (const c of CASES) {
        if (ONLY && !c.name.includes(ONLY)) continue;
        let res;
        try { res = runCase(c); } catch (e) { res = { ok: false, detail: `harness error: ${e.stack}` }; }
        results.set(c.name, res);
        check(c.name, res.ok, res.detail);
    }
    if (ONLY) return finish();

    // Mutants run after every case; the cases that move main (the last three) are not kill cases.
    for (const [mutant, caseName] of Object.entries(KILLS)) {
        const c = CASES.find(x => x.name === caseName);
        const base = results.get(caseName);
        if (!c || !base || !base.ok) { check(`mutant_${mutant}_killed`, false, `kill case ${caseName} did not pass on the real gate`); continue; }
        let res;
        try { res = runCase(c, [`--mutant=${mutant}`], SELFTEST); } catch (e) { res = { ok: false, r: null, detail: e.stack }; }
        const r = res.r;
        const applied = r && r.out.includes(`| mutants | ${mutant} (self-test only; merge disabled) |`) && !r.codes.includes("USAGE") && !r.codes.includes("MUTANT_NOT_ALLOWED");
        const lost = r ? c.expect.codes.filter(code => !r.codes.includes(code)) : [];
        // A mutant that makes a rule stricter is killed on a passing case, which it must make the gate refuse.
        const broke = c.expect.codes.length ? lost.length > 0 : Boolean(r && r.codes.length > 0);
        check(`mutant_${mutant}_killed`, applied && !res.ok && broke,
            !applied ? `mutant not applied: ${res.detail}` : `mutant survived: ${caseName} still reported [${r.codes.join(", ")}]`);
    }

    const src = fs.readFileSync(GATE, "utf8");
    const mdir = path.join(TMP, "source_mutants");
    fs.mkdirSync(mdir, { recursive: true });
    for (const mu of SOURCE_MUTANTS) {
        const count = src.split(mu.from).length - 1;
        if (count !== 1) { check(`source_mutant_${mu.name}_killed`, false, `mutation target found ${count} times, expected once`); continue; }
        const file = path.join(mdir, `merge_gate.${mu.name}.js`);
        fs.writeFileSync(file, src.replace(mu.from, mu.to));
        const control = runCase(mu.kill("c"));
        let res;
        try { res = runCase(mu.kill("m"), [], null, file); } catch (e) { res = { ok: true, detail: e.stack }; }
        check(`source_mutant_${mu.name}_killed`, control.ok && !res.ok, control.ok ? `mutant survived: ${res.detail}` : `control case failed on the real gate: ${control.detail}`);
    }
    return finish();
}

function finish() {
    if (!KEEP) {
        try { fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 3 }); } catch (e) { console.log(`NOTE temp repository not removed: ${e.message}`); }
    } else console.log(`kept ${TMP}`);
    console.log(`RESULT: ${passed} passed, ${failed} failed`);
    return failed ? 1 : 0;
}

process.exitCode = main();
