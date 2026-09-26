#!/usr/bin/env node
"use strict";

/**
 * tools/security/test_check_dependencies.js
 *
 * OPS.70.02 (Lane Z): tests and mutation checks for tools/security/check_dependencies.js.
 *
 * Fixtures are throwaway git repositories under os.tmpdir() (test_support.js), deleted at the end:
 * a clean tree (every resolution path the checker accepts, plus require text inside strings,
 * comments, templates and regexes that must not count), a tree with one of each defect, and a
 * frozen-libs tree changed after its baseline (committed and in the working tree). Two checks read
 * this repository itself: the committed libs baseline is remade from 425b594c, and the real tree
 * passes. Mutants are in-memory copies of the tool's source.
 *
 * Output: one "PASS <name>" / "FAIL <name>" line per check, then "RESULT: <n> passed, <m> failed".
 * Exit 0 only if every check passes.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const H = require("./test_support.js");

const TOOL = path.join(__dirname, "check_dependencies.js");
const SRC = fs.readFileSync(TOOL, "utf8");
const REAL = H.compileTool(SRC, TOOL);
const REPO = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: __dirname, windowsHide: true }).stdout.toString("utf8").trim();
const LIBS_BASE_COMMIT = "425b594c146d5f353c10faa11f4b5d47f499b45f";

const F = new H.Fixtures("check-deps");
const X = {};
const sha = b => crypto.createHash("sha256").update(b).digest("hex");

// Require text that is not code: it must never be read as a module reference.
const NOT_CODE = [
    "// require(\"left-pad\") in a line comment",
    "/* import pad from \"left-pad\"; require('left-pad') in a block comment */",
    "const s1 = 'require(\"left-pad\")';",
    "const s2 = \"import x from 'left-pad'\";",
    "const s3 = `require(\"left-pad\") in a template ${1 + 1} and ${\"}\"} more`;",
    "const r1 = /require\\(\"left-pad\"\\)/;",
    "const r2 = /[\"'`]/g.test(s1) ? 1 : 2;",
    "const o = { import: 1, require: 2 }; o.require(\"left-pad\"); obj?.require(\"left-pad\");",
    "function require2() {} function localRequire(x) { return x; } localRequire(\"left-pad\");",
    "const u = import.meta && 0;"
].join("\n");

function writeLibs(dir, files) {
    F.write(dir, files);
    const out = {};
    for (const [p, c] of Object.entries(files)) if (c !== null) out[p] = sha(Buffer.from(c));
    return out;
}

function libsBaselineFile(name, files, commit) {
    const f = path.join(F.root, name);
    fs.writeFileSync(f, JSON.stringify({ schema: "deus.libs_baseline.v1", commit: commit || null, files }, null, 2));
    return f;
}

function depBaselineFile(name, entries) {
    const f = path.join(F.root, name);
    fs.writeFileSync(f, JSON.stringify({ schema: "deus.dependency_baseline.v1", entries }, null, 2));
    return f;
}

const LIBS = {
    "game/js/libs/pixi.js": "/* TEST_ frozen lib one */\nvar TEST_pixi = 1;\n",
    "game/js/libs/pako.min.js": "/* TEST_ frozen lib two */\n",
    "game/js/libs/localforage.min.js": "/* TEST_ frozen lib three */\n"
};

function setup() {
    // clean: every accepted resolution path.
    X.clean = F.repo("clean");
    const libs = writeLibs(X.clean, LIBS);
    X.cleanLibs = libsBaselineFile("libs_clean.json", libs);
    F.commit(X.clean, {
        "package.json": JSON.stringify({ name: "TEST_root", private: true, devDependencies: { "TEST_devtool": "1.0.0" } }, null, 2),
        "game/package.json": JSON.stringify({ name: "rmmz-game", main: "index.html" }, null, 2),
        "game/js/plugins/A.js": [
            "const fs = require(\"fs\");",
            "const p = require(\"node:path\");",
            "const fsp = require(\"fs/promises\");",
            "const b = require(\"./B.js\");",
            "try { require(\"./js/plugins/B.js\"); } catch (_) {}",
            "const gui = require(\"nw.gui\");",
            "const os = require(\"os\");",
            "const name = \"B\"; const dyn = require(\"./\" + name + \".js\");",
            NOT_CODE
        ].join("\n") + "\n",
        "game/js/plugins/B.js": "module.exports = 1;\n",
        "tools/t.js": [
            "const path = require('path');",
            "const u = require(path.join(__dirname, 'lib', 'u.js'));",
            "const u2 = require(__dirname + '/lib/u.js');",
            "const b = require('../game/js/plugins/B.js');",
            "const idx = require('./lib');",
            "const pkg = require('./pkg');",
            "const data = require('./data.json');",
            "const cp = require('child_process'), c = require('crypto'), v8 = require('v8'), ph = require('perf_hooks');",
            "const vm = require('vm');"
        ].join("\n") + "\n",
        "tools/esm.js": "import { a } from \"./lib/u.js\";\nimport \"./lib/index.js\";\nexport * from \"./lib/u.js\";\nexport { b } from './lib/u.js';\nconst m = await import(\"./lib/u.js\");\nconst d = await import(someName);\n",
        "tools/lib/u.js": "module.exports = 2;\n",
        "tools/lib/index.js": "module.exports = 3;\n",
        "tools/pkg/package.json": JSON.stringify({ name: "TEST_pkg", main: "main.js" }),
        "tools/pkg/main.js": "module.exports = 4;\n",
        "tools/data.json": "{}\n",
        "tools/opt/render.mjs": "import { createRequire } from \"node:module\";\nconst require = createRequire(import.meta.url);\nconst canvas = require(\"TEST_canvas_pkg\");\n"
    }, "TEST_ clean dependency fixture");

    // bad: one of each defect (libs unchanged).
    X.bad = F.repo("bad");
    const libs2 = writeLibs(X.bad, LIBS);
    X.badLibs = libsBaselineFile("libs_bad.json", libs2);
    F.commit(X.bad, {
        "game/package.json": JSON.stringify({ name: "rmmz-game", main: "index.html", dependencies: { "left-pad": "1.3.0" } }, null, 2),
        "game/package-lock.json": "{}\n",
        "game/node_modules/left-pad/index.js": "module.exports = 0;\n",
        "game/js/plugins/npm.js": "const pad = require(\"left-pad\");\nconst sub = require(\"@TEST_scope/pkg/sub\");\n",
        "tools/missing.js": "const path = require('path');\nconst a = require('./nope.js');\nconst b = require(path.join(__dirname, 'nope2.js'));\n",
        "tools/abs.js": "const a = require('C:/TEST_outside/x.js');\n",
        "tools/nw.js": "const gui = require('nw.gui');\n",
        "tools/esm_bad.js": "import pad from \"left-pad\";\n"
    }, "TEST_ bad dependency fixture");
    X.badBaseline = depBaselineFile("dep_bad_known.json", [{ path: "tools/missing.js", kind: "MISSING_RELATIVE", spec: "./nope.js", reason: "TEST_ known pre-existing defect" }]);
    X.staleBaseline = depBaselineFile("dep_stale.json", [{ path: "tools/gone.js", kind: "MISSING_RELATIVE", spec: "./x.js", reason: "TEST_ entry that matches nothing" }]);
    X.libsKindBaseline = depBaselineFile("dep_libs_kind.json", [{ path: "game/js/libs/pixi.js", kind: "LIBS_CHANGED", spec: "x", reason: "TEST_ cannot hide a frozen lib" }]);

    // libs: a baseline commit, then a commit that changes, removes and adds, then working-tree edits.
    X.libs = F.repo("libs");
    writeLibs(X.libs, LIBS);
    X.libsBase = F.commit(X.libs, { "game/package.json": "{\"name\": \"rmmz-game\"}\n" }, "TEST_ libs base");
    X.libsFile = libsBaselineFile("libs_libs.json", Object.fromEntries(Object.entries(LIBS).map(([p, c]) => [p, sha(Buffer.from(c))])), X.libsBase);
    F.commit(X.libs, {
        "game/js/libs/pixi.js": LIBS["game/js/libs/pixi.js"] + "var TEST_patched = 2;\n",
        "game/js/libs/pako.min.js": null,
        "game/js/libs/extra.js": "/* TEST_ new lib */\n"
    }, "TEST_ libs changed");
    F.write(X.libs, { "game/js/libs/localforage.min.js": "/* TEST_ edited in the working tree */\n", "game/js/libs/untracked.js": "/* TEST_ */\n" });
}

// ---------------------------------------------------------------------------------------------

function run(T, argv, cwd, env) { return H.capture(() => T.main(argv, cwd, env || {})); }
function json(T, argv, cwd, env) {
    const r = run(T, argv.concat(["--json"]), cwd, env);
    let doc;
    try { doc = JSON.parse(r.out); } catch (e) { throw new Error("--json output does not parse (exit " + r.code + "): " + r.err.trim()); }
    return Object.assign(doc, { code: r.code });
}
function expect(cond, why) { if (!cond) throw new Error(why); return true; }
const keys = list => list.map(f => f.kind + " " + f.path + (f.line ? ":" + f.line : "")).sort();

const S = new H.Suite();

S.add("lexer_ignores_strings_comments_templates_regexes", T => {
    const refs = T.extractImports(NOT_CODE);
    return expect(refs.length === 0, "read " + refs.length + " references from non-code text: " + JSON.stringify(refs.map(r => r.spec)));
});

S.add("lexer_reads_every_import_form", T => {
    const src = "const a = require(\"a1\");\nimport b from 'b1';\nimport 'c1';\nimport { d } from \"d1\";\nimport * as e from 'e1';\nexport * from 'f1';\n" +
                "export { g } from \"g1\";\nconst h = await import('h1');\nconst i = require(`i1`);\nconst j = require(x);\nconst k = require(`k${1}`);\n";
    const got = T.extractImports(src).map(r => r.kind + ":" + (r.spec === null ? "null" : r.spec) + "@" + r.line).join(" ");
    const want = "require:a1@1 import:b1@2 import:c1@3 import:d1@4 import:e1@5 export:f1@6 export:g1@7 dynamic-import:h1@8 require:i1@9 require:null@10 require:null@11";
    return expect(got === want, "got " + got);
});

S.add("clean_repo_exit_0", T => {
    const d = json(T, ["--libs-baseline", X.cleanLibs], X.clean);
    return expect(d.code === 0 && d.findings.length === 0, "exit " + d.code + ": " + keys(d.findings).join(", "));
});

S.add("clean_repo_notes_reported_not_failed", T => {
    const d = json(T, ["--libs-baseline", X.cleanLibs], X.clean);
    const n = keys(d.notes).join(", ");
    const want = ["BUILTIN_OUTSIDE_POLICY game/js/plugins/A.js:7", "BUILTIN_OUTSIDE_POLICY tools/opt/render.mjs:1", "BUILTIN_OUTSIDE_POLICY tools/t.js:9", "NPM_ARTIFACT package.json",
                  "NPM_REQUIRE tools/opt/render.mjs:3", "UNRESOLVED_DYNAMIC game/js/plugins/A.js:8", "UNRESOLVED_DYNAMIC tools/esm.js:6"].sort().join(", ");
    return expect(n === want, "notes: " + n);
});

S.add("policy_builtins_counted", T => {
    const d = json(T, ["--libs-baseline", X.cleanLibs], X.clean);
    const b = d.policyBuiltins;
    return expect(b.fs === 2 && b.path === 2 && b.child_process === 1 && b.crypto === 1 && b.v8 === 1 && b.perf_hooks === 1 && d.builtinsOutsidePolicy.os === 1 && d.builtinsOutsidePolicy.vm === 1,
        "counts " + JSON.stringify(b) + " / " + JSON.stringify(d.builtinsOutsidePolicy));
});

S.add("npm_require_detected", T => {
    const d = json(T, ["--libs-baseline", X.badLibs], X.bad);
    const f = d.findings.filter(x => x.kind === "NPM_REQUIRE").map(x => x.path + ":" + x.line + " " + x.detail.split(" ")[0]).sort().join(", ");
    expect(d.code === 1, "exit " + d.code);
    return expect(f === "game/js/plugins/npm.js:1 left-pad, game/js/plugins/npm.js:2 @TEST_scope/pkg, tools/esm_bad.js:1 left-pad, tools/nw.js:1 nw.gui", "NPM_REQUIRE: " + f);
});

S.add("missing_relative_detected_literal_and_folded", T => {
    const d = json(T, ["--libs-baseline", X.badLibs], X.bad);
    const f = keys(d.findings.filter(x => x.kind === "MISSING_RELATIVE")).join(", ");
    return expect(f === "MISSING_RELATIVE tools/missing.js:2, MISSING_RELATIVE tools/missing.js:3", "MISSING_RELATIVE: " + f);
});

S.add("absolute_require_detected", T => {
    const d = json(T, ["--libs-baseline", X.badLibs], X.bad);
    return expect(keys(d.findings.filter(x => x.kind === "ABSOLUTE_REQUIRE")).join(",") === "ABSOLUTE_REQUIRE tools/abs.js:1", "ABSOLUTE_REQUIRE missing");
});

S.add("npm_artifacts_under_game_detected", T => {
    const d = json(T, ["--libs-baseline", X.badLibs], X.bad);
    const f = keys(d.findings.filter(x => x.kind === "NPM_ARTIFACT")).join(", ");
    return expect(f === "NPM_ARTIFACT game/node_modules/left-pad/index.js, NPM_ARTIFACT game/package-lock.json, NPM_ARTIFACT game/package.json", "NPM_ARTIFACT: " + f);
});

S.add("bad_repo_finding_total", T => {
    const d = json(T, ["--libs-baseline", X.badLibs], X.bad);
    return expect(d.findings.length === 10, "findings " + d.findings.length + ": " + keys(d.findings).join(", "));
});

S.add("libs_changed_removed_added_detected", T => {
    const d = json(T, ["--libs-baseline", X.libsFile], X.libs);
    const f = d.findings.filter(x => x.kind === "LIBS_CHANGED").map(x => x.path + " " + x.detail.split(" ").slice(0, 3).join(" ")).sort().join(", ");
    expect(d.code === 1, "exit " + d.code);
    return expect(f === "game/js/libs/extra.js file added to, game/js/libs/pako.min.js frozen lib removed, game/js/libs/pixi.js frozen lib changed", "LIBS_CHANGED: " + f);
});

S.add("libs_worktree_change_detected", T => {
    const d = json(T, ["--libs-baseline", X.libsFile], X.libs);
    const f = keys(d.findings.filter(x => x.kind === "LIBS_WORKTREE_CHANGED")).join(", ");
    return expect(f === "LIBS_WORKTREE_CHANGED game/js/libs/localforage.min.js, LIBS_WORKTREE_CHANGED game/js/libs/untracked.js", "worktree: " + f);
});

S.add("make_libs_baseline_roundtrip", T => {
    const r = run(T, ["--make-libs-baseline", X.libsBase], X.libs);
    const doc = JSON.parse(r.out);
    const want = JSON.parse(fs.readFileSync(X.libsFile, "utf8"));
    const sorted = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));
    return expect(r.code === 0 && doc.commit === X.libsBase && sorted(doc.files) === sorted(want.files), "baseline made at the base commit differs");
});

S.add("committed_libs_baseline_matches_425b594c", T => {
    const committed = JSON.parse(fs.readFileSync(path.join(__dirname, "libs_baseline.json"), "utf8"));
    const r = run(T, ["--make-libs-baseline", LIBS_BASE_COMMIT], REPO);
    const made = JSON.parse(r.out);
    expect(committed.commit === LIBS_BASE_COMMIT && made.commit === LIBS_BASE_COMMIT, "commit");
    return expect(JSON.stringify(committed.files) === JSON.stringify(made.files) && Object.keys(made.files).length >= 6, "committed baseline differs from one made at 425b594c");
});

S.add("real_repo_exit_0", T => {
    const d = json(T, [], REPO);
    return expect(d.code === 0 && d.findings.length === 0 && d.libsChecked >= 6, "exit " + d.code + ": " + keys(d.findings).slice(0, 5).join(", "));
});

S.add("node_version_policy", T => {
    const below = T.checkNodeVersion("v17.9.1"), at = T.checkNodeVersion("v18.0.0"), now = T.checkNodeVersion(process.version), junk = T.checkNodeVersion("banana");
    expect(below && below.kind === "NODE_TOO_OLD" && at === null && now === null && junk && junk.kind === "NODE_TOO_OLD", "checkNodeVersion");
    const d = json(T, ["--libs-baseline", X.cleanLibs], X.clean, { nodeVersion: "v16.20.2" });
    return expect(d.code === 1 && keys(d.findings).join(",") === "NODE_TOO_OLD (node)", "main with node v16: exit " + d.code);
});

S.add("dep_baseline_hides_only_its_entry", T => {
    const d = json(T, ["--libs-baseline", X.badLibs, "--baseline", X.badBaseline], X.bad);
    expect(d.baselined.length === 1 && d.baselined[0].path === "tools/missing.js" && d.baselined[0].line === 2, "baselined " + keys(d.baselined).join(","));
    return expect(d.code === 1 && d.findings.length === 9, "exit " + d.code + ", findings " + d.findings.length);
});

S.add("dep_baseline_stale_entry_fails", T => {
    const d = json(T, ["--libs-baseline", X.cleanLibs, "--baseline", X.staleBaseline], X.clean);
    return expect(d.code === 1 && keys(d.findings).join(",") === "STALE_BASELINE tools/gone.js", "exit " + d.code + ": " + keys(d.findings).join(","));
});

S.add("dep_baseline_cannot_hide_frozen_libs", T => {
    const r = run(T, ["--libs-baseline", X.libsFile, "--baseline", X.libsKindBaseline], X.libs);
    return expect(r.code === 2 && /kind must be one of/.test(r.err), "exit " + r.code);
});

S.add("committed_dep_baseline_valid_and_reasoned", () => {
    const doc = JSON.parse(fs.readFileSync(path.join(__dirname, "dependency_baseline.json"), "utf8"));
    expect(doc.schema === "deus.dependency_baseline.v1" && Array.isArray(doc.entries), "schema");
    return expect(doc.entries.every(e => e.kind === "MISSING_RELATIVE" && typeof e.reason === "string" && e.reason.length >= 10), "an entry lacks a reason or has another kind");
});

S.add("usage_errors_exit_2", T => {
    const codes = [
        run(T, ["--bogus"], X.clean).code,
        run(T, ["--libs-baseline", path.join(F.root, "missing.json")], X.clean).code,
        run(T, ["--make-libs-baseline"], X.clean).code,
        run(T, ["--libs-baseline", X.staleBaseline], X.clean).code,
        run(T, ["--libs-baseline", X.cleanLibs, "--baseline", path.join(F.root, "missing.json")], X.clean).code,
        run(T, [], X.clean).code                                   // no default libs baseline in the fixture
    ];
    return expect(codes.every(c => c === 2), "exits " + codes.join(","));
});

S.add("text_output_result_line", T => {
    const r = run(T, ["--libs-baseline", X.badLibs], X.bad);
    expect(/^FINDING NPM_REQUIRE game\/js\/plugins\/npm\.js:1 left-pad /m.test(r.out), "no FINDING line");
    return expect(/^RESULT: HEAD [0-9a-f]{12}, 8 script files, \d+ module references, 10 findings \(/m.test(r.out), "RESULT line: " + r.out.split("\n").filter(Boolean).pop());
});

S.add("cli_exit_codes", () => {
    const cli = (args, cwd) => spawnSync(process.execPath, [TOOL].concat(args), { cwd, windowsHide: true, maxBuffer: 64 * 1024 * 1024 }).status;
    const codes = [cli(["--libs-baseline", X.cleanLibs], X.clean), cli(["--libs-baseline", X.badLibs], X.bad), cli(["--bogus"], X.clean), cli(["--help"], X.clean)];
    return expect(codes.join(",") === "0,1,2,0", "exits " + codes.join(","));
});

// ---------------------------------------------------------------------------------------------

const MUTANTS = [
    { name: "npm_require_off", pairs: [["return { kind: \"NPM_REQUIRE\", severity: \"finding\", detail: spec.split(", "return { kind: \"NPM_REQUIRE\", severity: \"ok\", detail: spec.split("]], hints: ["npm_require_detected"] },
    { name: "missing_relative_off", pairs: [["return { kind: \"MISSING_RELATIVE\", severity: \"finding\"", "return { kind: \"MISSING_RELATIVE\", severity: \"ok\""]], hints: ["missing_relative_detected_literal_and_folded"] },
    { name: "absolute_require_off", pairs: [["return { kind: \"ABSOLUTE_REQUIRE\", severity: \"finding\"", "return { kind: \"ABSOLUTE_REQUIRE\", severity: \"ok\""]], hints: ["absolute_require_detected"] },
    { name: "libs_baseline_off", pairs: [["items.push(...libs.items);", ""]], hints: ["libs_changed_removed_added_detected"] },
    { name: "libs_added_file_off", pairs: [["if (!(p in baseline.files)) out.push(", "if (false) out.push("]], hints: ["libs_changed_removed_added_detected"] },
    { name: "libs_worktree_off", pairs: [["for (const rec of st) {", "for (const rec of []) {"]], hints: ["libs_worktree_change_detected"] },
    { name: "npm_artifact_off", pairs: [["items.push(...checkNpmArtifacts(entries, blobText));", ""]], hints: ["npm_artifacts_under_game_detected"] },
    { name: "node_version_off", pairs: [["if (Number(m[1]) < MIN_NODE_MAJOR)", "if (false)"]], hints: ["node_version_policy"] },
    { name: "builtins_treated_as_npm", pairs: [["return isBuiltin ? bare.split(\"/\")[0] : null;", "return null;"]], hints: ["clean_repo_exit_0"] },
    { name: "dynamic_not_reported", pairs: [["if (ref.spec === null) return { kind: \"UNRESOLVED_DYNAMIC\", severity: \"note\"", "if (ref.spec === null) return { kind: \"UNRESOLVED_DYNAMIC\", severity: \"ok\""]], hints: ["clean_repo_notes_reported_not_failed"] },
    { name: "lexer_reads_comments", pairs: [["if (c === \"/\" && src[i + 1] === \"/\") { while (i < n && src[i] !== \"\\n\") i++; continue; }", ""]], hints: ["lexer_ignores_strings_comments_templates_regexes"] },
    { name: "dirname_fold_off", pairs: [["const folded = arg ? foldDirname(toks, k + 2) : null;", "const folded = null;"]], hints: ["missing_relative_detected_literal_and_folded"] },
    { name: "nw_app_root_base_off", pairs: [["if (file.startsWith(GAME_DIR)) bases.push(GAME_DIR.slice(0, -1));", ""]], hints: ["clean_repo_exit_0"] },
    { name: "dep_baseline_off", pairs: [["const i = entries.findIndex(e => e.path === it.path && e.kind === it.kind && e.spec === it.spec);", "const i = -1;"]], hints: ["dep_baseline_hides_only_its_entry"] },
    { name: "dep_baseline_staleness_off", pairs: [["return entries.filter((e, i) => !used.has(i)).map(", "return [].filter((e, i) => !used.has(i)).map("]], hints: ["dep_baseline_stale_entry_fails"] }
];

let code = 1;
try {
    setup();
    S.runAll(REAL);
    S.runMutants(SRC, TOOL, MUTANTS);
    code = S.finish(F);
} catch (e) {
    process.stdout.write("FAIL suite_setup (" + (e && e.message) + ")\n");
    S.failed++;
    code = S.finish(F);
}
process.exitCode = code;
