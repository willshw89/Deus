#!/usr/bin/env node
"use strict";

/**
 * tools/security/test_scan_secrets.js
 *
 * OPS.70.02 (Lane Z): tests and mutation checks for tools/security/scan_secrets.js.
 *
 * Fixtures are throwaway git repositories under os.tmpdir() (test_support.js), deleted at the end.
 * Every fake credential is built at run time from harmless fragments and a seeded generator: this
 * file holds no literal that matches a provider format (the scanner run over it is clean).
 * The tool is called in-process (main(argv, cwd)) with output captured, and the command line once
 * per exit path through a child process. Mutants are in-memory copies of the tool's source.
 *
 * Output: one "PASS <name>" / "FAIL <name>" line per check, then "RESULT: <n> passed, <m> failed".
 * Exit 0 only if every check passes.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const H = require("./test_support.js");

const TOOL = path.join(__dirname, "scan_secrets.js");
const SRC = fs.readFileSync(TOOL, "utf8");
const REAL = H.compileTool(SRC, TOOL);
const REPO = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: __dirname, windowsHide: true }).stdout.toString("utf8").trim();

// ---------------------------------------------------------------------------------------------
// Run-time fake values
// ---------------------------------------------------------------------------------------------

const rand = H.rng(20260926);
const ALNUM = H.charRange("A", "Z") + H.charRange("a", "z") + H.charRange("0", "9");
const HEX = H.charRange("0", "9") + H.charRange("a", "f");

function bitsOf(s) {
    const n = new Map();
    for (const c of s) n.set(c, (n.get(c) || 0) + 1);
    let h = 0;
    for (const k of n.values()) { const p = k / s.length; h -= p * Math.log2(p); }
    return h;
}

function ascendingRun(s) {
    let run = 1;
    for (let i = 1; i < s.length; i++) { run = s.charCodeAt(i) === s.charCodeAt(i - 1) + 1 ? run + 1 : 1; if (run >= 4) return true; }
    return false;
}

// A generated-looking body: upper, lower and digit present, no ascending run, and (32+ chars) at
// least 4.8 bits per character. Every body is remembered: it is the secret part of a fake value
// (the fixed prefixes such as "ya29." are public format text).
const GENERATED = [];
function fake(n, alphabet = ALNUM) {
    for (;;) {
        let s = "";
        for (let i = 0; i < n; i++) s += alphabet[Math.floor(rand() * alphabet.length)];
        if (alphabet === ALNUM && !(/[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s))) continue;
        if (ascendingRun(s) || (n >= 32 && alphabet === ALNUM && bitsOf(s) < 4.8)) continue;
        GENERATED.push(s);
        return s;
    }
}

// One fake value per rule. `line` is the fixture line, `value` the part the scanner redacts.
function plantSet() {
    const set = [];
    const add = (rule, line, value) => set.push({ rule, line, value });
    const pem = "-----BEGIN " + "OPENSSH PRIVATE" + " KEY-----";
    add("PRIVATE_KEY_PEM", pem, pem);
    const ant = "sk-" + "ant-" + "api03-" + fake(64);
    add("ANTHROPIC_KEY", "const a = \"" + ant + "\";", ant);
    const oai = "sk-" + "proj-" + fake(48);
    add("OPENAI_KEY", "openai: " + oai, oai);
    const goo = "AI" + "za" + fake(35);
    add("GOOGLE_API_KEY", "key='" + goo + "'", goo);
    const oauth = "ya" + "29." + fake(64);
    add("GOOGLE_OAUTH_TOKEN", "oauth " + oauth, oauth);
    const xai = "xa" + "i-" + fake(80);
    add("XAI_KEY", "grok: " + xai, xai);
    const gh = "gh" + "p_" + fake(36);
    add("GITHUB_TOKEN", "remote " + gh, gh);
    const gl = "gl" + "pat-" + fake(20);
    add("GITLAB_TOKEN", "lab " + gl, gl);
    const jwt = "ey" + "J" + fake(20) + "." + "ey" + "J" + fake(30) + "." + fake(43);
    add("JWT", "jwt " + jwt, jwt);
    const pw = fake(16);
    add("NETRC_PASSWORD", "machine api.example.invalid login TEST_user password " + pw, pw);
    const sess = fake(32);
    add("SESSION_COOKIE", "Cookie: " + "sessionid=" + sess + "; Path=/", sess);
    const bearer = fake(40);
    add("BEARER_TOKEN", "Authorization: " + "Bearer " + bearer, bearer);
    const he = fake(48);
    add("HIGH_ENTROPY", "value " + he, he);
    return set;
}

const PLANT = plantSet();
const CONTENT_RULES = REAL.RULES.map(r => r.id).concat([REAL.ENTROPY_RULE.id]);
const sha = s => crypto.createHash("sha256").update(Buffer.from(s, "latin1")).digest("hex");

// ---------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------

const F = new H.Fixtures("scan-secrets");
const X = {};                                        // fixture facts the checks read

function tracked(rel) {
    const r = spawnSync("git", ["show", "HEAD:" + rel], { cwd: REPO, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
    if (r.status !== 0) throw new Error("cannot read tracked " + rel);
    return r.stdout.toString("utf8");
}

function setup() {
    // plant: one fake value per rule at HEAD, a tracked .env, binaries, a CRLF file, an untracked file.
    X.plant = F.repo("plant");
    const lines = ["TEST_ fixture: every value below is fake and built at run time"].concat(PLANT.map(p => p.line));
    X.plantLine = new Map(PLANT.map((p, i) => [p.rule, i + 2]));
    X.crlfToken = "gh" + "o_" + fake(36);
    X.nulKey = "sk-" + "proj-" + fake(48);
    X.pngKey = "AI" + "za" + fake(35);
    X.untrackedKey = "xa" + "i-" + fake(60);
    F.commit(X.plant, {
        "README.md": "TEST_ plant fixture\n",
        "planted.txt": lines.join("\n") + "\n",
        ".env": "TEST_MODE=1\n",
        "crlf.txt": "header\r\nremote " + X.crlfToken + "\r\n",
        "blob.dat": Buffer.concat([Buffer.from([0, 1, 2, 0, 10]), Buffer.from(X.nulKey + "\n", "latin1")]),
        "image.png": Buffer.from("\n" + X.pngKey + "\n", "latin1")
    }, "TEST_ plant");
    F.write(X.plant, { "untracked.txt": "grok " + X.untrackedKey + "\n" });
    X.outside = path.join(F.root, "outside.txt");
    fs.writeFileSync(X.outside, "outside the fixture repository\n");

    // clean: the real policy texts plus look-alikes that must not be findings.
    X.clean = F.repo("clean");
    const alphabet = ALNUM + "+/";
    const falsePositives = [
        "TEST_ look-alikes that are not credentials",
        "Provider keys look like sk-..., AIza..., sk-ant-..., xai-...; bearer tokens and JWT tokens never go in git.",
        "sk-some-kebab-case-identifier-that-is-long-enough-to-match-a-body",
        "Use a Bearer token from the vault; see the bearer header section.",
        "machine example.invalid login TEST_user password <PASSWORD>",
        "Cookie: sessionid=<redacted>",
        "/Users/TEST_user/OneDrive/Desktop/UF/docs/systems/UF_History_and_Chronicle_Notes2.md",
        "C:/Users/TEST_user/OneDrive/Desktop/UF/tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate1_provoke_layers_flat.log",
        "docs/migration/onedrive_links_inventory.md -> docs/packets/generation/DEUS_GENERATION_PACKETS_MANIFEST.md",
        "file:///c:/Users/TEST_user/OneDrive/Desktop/UF/docs/Z_COMPATIBILITY_AUDIT_Rev4/WG_00_09b/fix2_c2184c94.md",
        "evidence: tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/Gate2_Provoke_Depth_Layer7.log",
        "see docs/packets/DEUS_Bootstrap_Packet_07/Q3_2026/README.md",
        "https://github.com/pixijs/pixijs/blob/v5.3.12/packages/core/src/renderers/AbstractRenderer2D.js",
        "var lookup = \"" + alphabet + "\";",
        "sha256 " + crypto.createHash("sha256").update("TEST_").digest("hex") + " commit " + crypto.createHash("sha1").update("TEST_").digest("hex"),
        "id 3f2b8c1e-9d4a-4e6b-8f7c-2a1d0e9b5c4f"
    ];
    F.commit(X.clean, {
        "docs/SECURITY_AND_SECRETS.md": tracked("docs/SECURITY_AND_SECRETS.md"),
        "docs/DEPENDENCY_POLICY.md": tracked("docs/DEPENDENCY_POLICY.md"),
        "notes.md": falsePositives.join("\n") + "\n",
        "tools/security/secrets_baseline.json": fs.readFileSync(path.join(__dirname, "secrets_baseline.json")),
        "tools/security/libs_baseline.json": fs.readFileSync(path.join(__dirname, "libs_baseline.json"))
    }, "TEST_ clean");
    X.falsePositives = falsePositives;

    // staged: a committed value, a removed value and an added value in the index.
    X.staged = F.repo("staged");
    X.k1 = "sk-" + "proj-" + fake(48);
    X.k0 = "gh" + "p_" + fake(36);
    X.k2 = "xa" + "i-" + fake(64);
    F.commit(X.staged, { "a.txt": "keep " + X.k1 + "\nremove " + X.k0 + "\n" }, "TEST_ staged base");
    F.write(X.staged, { "a.txt": "keep " + X.k1 + "\nplain\ngrok " + X.k2 + "\n" });
    F.git(X.staged, ["add", "a.txt"]);
    X.staged2 = F.repo("staged2");
    F.commit(X.staged2, { "a.txt": "keep " + X.k1 + "\n" }, "TEST_ staged2 base");
    F.write(X.staged2, { "a.txt": "keep " + X.k1 + "\nplain added line\n" });
    F.git(X.staged2, ["add", "a.txt"]);

    // range: added lines per commit, a commit message, a quoted path and an evil merge.
    X.range = F.repo("range");
    X.r = {};
    X.rk = { k1: "AI" + "za" + fake(35), k2: "gl" + "pat-" + fake(24), k3: "xa" + "i-" + fake(48), k4: "sk-" + "proj-" + fake(48),
             k5: "ey" + "J" + fake(16) + "." + "ey" + "J" + fake(24) + "." + fake(40), k6: "gh" + "s_" + fake(36) };
    X.quoted = "sp ace/\u00fcn\u00ef.txt";
    X.r.r0 = F.commit(X.range, { "README.md": "TEST_ range fixture\n" }, "TEST_ r0");
    X.r.r1 = F.commit(X.range, { "f.txt": "one\nk1 '" + X.rk.k1 + "'\n" }, "TEST_ r1");
    X.r.r2 = F.commit(X.range, { "g.txt": "lab " + X.rk.k2 + "\n", [X.quoted]: "remote " + X.rk.k6 + "\n" },
                      "TEST_ r2\n\nthe message carries " + X.rk.k3 + "\n");
    F.git(X.range, ["checkout", "-q", "-b", "side"]);
    X.r.side = F.commit(X.range, { "s.txt": "openai " + X.rk.k4 + "\n" }, "TEST_ side");
    F.git(X.range, ["checkout", "-q", "main"]);
    X.r.r3 = F.commit(X.range, { "h.txt": "clean\n" }, "TEST_ r3");
    F.git(X.range, ["merge", "-q", "--no-ff", "--no-commit", "side"]);
    F.write(X.range, { "m.txt": "jwt " + X.rk.k5 + "\n" });
    F.git(X.range, ["add", "m.txt"]);
    F.git(X.range, ["commit", "-q", "-m", "TEST_ merge side with an extra line"]);
    X.r.merge = F.git(X.range, ["rev-parse", "HEAD"]);

    // allow: two findings and allowlists around them.
    X.allow = F.repo("allow");
    X.a1 = "x " + "sk-" + "proj-" + fake(48);
    X.a2 = "y " + fake(48);
    F.commit(X.allow, { "a.txt": X.a1 + "\n" + X.a2 + "\n", "other.txt": "clean\n" }, "TEST_ allow");
    const entry = (p, rule, line, reason) => ({ path: p, rule, lineSha256: sha(line), reason });
    const cfg = (name, entries) => { const f = path.join(F.root, name); fs.writeFileSync(f, JSON.stringify({ schema: "deus.secrets_allowlist.v1", entries }, null, 2)); return f; };
    const e1 = entry("a.txt", "OPENAI_KEY", X.a1, "TEST_ fake key used as a fixture");
    const e2 = entry("a.txt", "HIGH_ENTROPY", X.a2, "TEST_ fake value used as a fixture");
    X.allowOk = cfg("allow_ok.json", [e1, e2]);
    X.allowPartial = cfg("allow_partial.json", [e1]);
    X.allowStale = cfg("allow_stale.json", [e1, e2, entry("a.txt", "OPENAI_KEY", "a line that is not there", "TEST_ stale entry")]);
    X.allowBad = cfg("allow_bad.json", [{ path: "a.txt", rule: "OPENAI_KEY", lineSha256: sha(X.a1) }]);

    // base: a value added, removed by a fix commit, then added again; and a different value.
    X.base = F.repo("base");
    X.T = fake(48);
    X.V = fake(48);
    X.W = fake(48);
    X.b = {};
    X.b.e0 = F.commit(X.base, { "README.md": "TEST_ baseline fixture\n" }, "TEST_ e0");
    X.b.e1 = F.commit(X.base, { "f.txt": "token " + X.T + "\n" }, "TEST_ e1 adds the value");
    X.b.e1v = F.commit(X.base, { "v.txt": "token " + X.V + "\n" }, "TEST_ e1v adds a different value");
    X.b.e2 = F.commit(X.base, { "f.txt": null, "v.txt": null }, "TEST_ e2 fix removes both");
    X.b.e3 = F.commit(X.base, { "h.txt": "again " + X.T + "\n" }, "TEST_ e3 adds the value again");
    F.write(X.base, { "s.txt": "staged " + X.T + "\n" });
    F.git(X.base, ["add", "s.txt"]);
    const bentry = (value, addedIn) => ({ fingerprint: sha(value), rule: "HIGH_ENTROPY", incident: "TEST_INCIDENT", onlyInHistoryBefore: X.b.e2, addedIn, reason: "TEST_ known historical value" });
    const bcfg = (name, entries) => { const f = path.join(F.root, name); fs.writeFileSync(f, JSON.stringify({ schema: "deus.secrets_baseline.v1", entries }, null, 2)); return f; };
    X.baseOk = bcfg("base_ok.json", [bentry(X.T, [X.b.e1])]);
    X.baseStale = bcfg("base_stale.json", [bentry(X.T, [X.b.e1]), bentry(X.W, [X.b.e1])]);
    X.baseBadAnc = bcfg("base_bad_ancestry.json", [bentry(X.T, [X.b.e3])]);
    X.baseBadShape = bcfg("base_bad_shape.json", [Object.assign(bentry(X.T, [X.b.e1]), { fingerprint: "abc" })]);
}

// ---------------------------------------------------------------------------------------------
// Helpers for checks
// ---------------------------------------------------------------------------------------------

function run(T, argv, cwd) {
    return H.capture(() => T.main(argv, cwd));
}

function json(T, argv, cwd) {
    const r = run(T, argv.concat(["--json"]), cwd);
    let doc;
    try { doc = JSON.parse(r.out); } catch (e) { throw new Error("--json output does not parse (exit " + r.code + ")"); }
    return Object.assign(doc, { code: r.code, text: r.out });
}

function expect(cond, why) { if (!cond) throw new Error(why); return true; }

// No 5-character window of the generated part of any given value may appear in the output (the
// redaction shows at most REDACT_KEEP = 4 characters). The exact redacted form is checked apart.
function leaks(output, values) {
    const k = REAL.REDACT_KEEP + 1;
    const parts = GENERATED.filter(g => values.some(v => v.includes(g)));
    if (parts.length === 0) return "no generated part found in the values checked";
    for (const v of parts) {
        for (let i = 0; i + k <= v.length; i++) {
            if (output.includes(v.slice(i, i + k))) return "a " + k + "-character piece of a " + v.length + "-character generated value is in the output";
        }
    }
    return null;
}

// ---------------------------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------------------------

const S = new H.Suite();

S.add("fixture_values_built_at_run_time", () => expect(PLANT.length === CONTENT_RULES.length && CONTENT_RULES.every(r => PLANT.some(p => p.rule === r)),
    "PLANT covers " + PLANT.length + " of " + CONTENT_RULES.length + " content rules"));

for (const p of PLANT) {
    S.add("detects_" + p.rule, T => {
        const d = json(T, [], X.plant);
        const at = d.findings.filter(f => f.path === "planted.txt" && f.line === X.plantLine.get(p.rule));
        expect(at.length === 1, "expected 1 finding on planted.txt:" + X.plantLine.get(p.rule) + ", got " + at.length);
        expect(at[0].rule === p.rule, "rule " + at[0].rule);
        return expect(at[0].length === p.value.length, "length " + at[0].length + " != " + p.value.length);
    });
}

S.add("detects_CREDENTIAL_FILE_tracked_env", T => {
    const d = json(T, [], X.plant);
    return expect(d.findings.some(f => f.path === ".env" && f.rule === "CREDENTIAL_FILE" && f.line === 0), "no CREDENTIAL_FILE finding for .env");
});

S.add("credential_file_names", T => {
    const yes = [".env", ".env.local", "config/server.pem", "id_rsa", "id_ed25519.pub", ".netrc", "_netrc", "credentials.json", "a/.claude.json", ".git-credentials"];
    const no = ["environment.js", "docs/env.md", "pem_notes.txt", "rsa_id.txt", "credentials.md", "claude.json.md"];
    const bad = yes.filter(n => !T.credentialFileHit(n)).concat(no.filter(n => T.credentialFileHit(n)));
    return expect(bad.length === 0, "misclassified: " + bad.join(", "));
});

S.add("head_findings_exit_1_and_counts", T => {
    const d = json(T, [], X.plant);
    expect(d.code === 1 && d.exitCode === 1, "exit " + d.code);
    const expected = PLANT.length + 2;                  // + .env + crlf.txt
    return expect(d.findings.length === expected, "findings " + d.findings.length + " != " + expected);
});

S.add("crlf_line_detected_without_cr", T => {
    const d = json(T, [], X.plant);
    const f = d.findings.find(x => x.path === "crlf.txt");
    expect(f && f.line === 2 && f.rule === "GITHUB_TOKEN", "crlf.txt finding " + JSON.stringify(f && [f.line, f.rule]));
    return expect(f.length === X.crlfToken.length, "length " + f.length + " != " + X.crlfToken.length);
});

S.add("binary_nul_and_extension_skipped_and_counted", T => {
    const d = json(T, [], X.plant);
    expect(!d.findings.some(f => f.path === "blob.dat" || f.path === "image.png"), "a binary file was scanned");
    const reasons = d.skipped.map(s => s.path + ":" + s.reason).sort().join(",");
    expect(reasons === "blob.dat:nul,image.png:extension", "skipped " + reasons);
    const t = run(T, [], X.plant);
    expect(/^SKIPPED_BINARY blob\.dat \(NUL byte\)$/m.test(t.out), "no SKIPPED_BINARY line");
    return expect(/RESULT: 4 files scanned, 2 binary skipped, 15 findings, 0 allowed, 0 baselined/.test(t.out), "RESULT line: " + t.out.split("\n").filter(Boolean).pop());
});

S.add("head_ignores_untracked_files", T => {
    const d = json(T, [], X.plant);
    return expect(!d.findings.some(f => f.path === "untracked.txt") && !leaks(d.text, [X.untrackedKey]), "untracked file was read");
});

S.add("redaction_text_output_keeps_4_chars", T => {
    const r = run(T, [], X.plant);
    const why = leaks(r.out + r.err, PLANT.map(p => p.value).concat([X.crlfToken]));
    if (why) return why;
    for (const p of PLANT) {
        const want = p.value.slice(0, 4) + "... (" + p.value.length + " chars)";
        if (!r.out.includes(" " + p.rule + " " + want)) return "no redacted line for " + p.rule;
    }
    return true;
});

S.add("redaction_json_output_keeps_4_chars", T => {
    const d = json(T, [], X.plant);
    const why = leaks(d.text, PLANT.map(p => p.value).concat([X.crlfToken]));
    if (why) return why;
    return expect(d.findings.every(f => f.lineSha256 && /^[0-9a-f]{64}$/.test(f.lineSha256) && f.fingerprint === undefined), "a finding lacks lineSha256 or carries a fingerprint");
});

S.add("redact_function_contract", T => expect(T.redact("abcdefgh") === "abcd... (8 chars)" && T.REDACT_KEEP === 4, "redact() " + T.redact("abcdefgh")));

S.add("clean_tree_exit_0", T => {
    const r = run(T, [], X.clean);
    expect(r.code === 0, "exit " + r.code + ": " + r.out.split("\n").filter(l => l.startsWith("FINDING")).length + " findings");
    return expect(/RESULT: 5 files scanned, 0 binary skipped, 0 findings/.test(r.out), "RESULT line");
});

S.add("policy_text_is_not_a_finding", T => {
    const hits = [];
    for (const rel of ["docs/SECURITY_AND_SECRETS.md", "docs/DEPENDENCY_POLICY.md"]) {
        tracked(rel).split("\n").forEach((l, i) => { for (const h of T.scanLine(l)) hits.push(rel + ":" + (i + 1) + " " + h.rule); });
    }
    return expect(hits.length === 0, "hits: " + hits.join(", "));
});

S.add("look_alikes_are_not_findings", T => {
    const hits = [];
    X.falsePositives.forEach((l, i) => { for (const h of T.scanLine(l)) hits.push("line " + (i + 1) + " " + h.rule); });
    return expect(hits.length === 0, "hits: " + hits.join(", "));
});

S.add("entropy_slash_run_judged_whole_with_plus_or_context", T => {
    const a = fake(20), b = fake(20);
    const plus = T.scanLine("blob " + a + "/" + b + "+x");
    const ctx = T.scanLine("secret_key = \"" + a + "/" + b + "\"");
    const bare = T.scanLine("see " + a + "/" + b);
    expect(plus.length === 1 && plus[0].rule === "HIGH_ENTROPY", "'+' run: " + plus.length + " hits");
    expect(ctx.length === 1 && ctx[0].rule === "HIGH_ENTROPY", "credential-context run: " + ctx.length + " hits");
    return expect(bare.length === 0, "a path-like run of two 20-char segments was judged whole");
});

S.add("entropy_long_segment_in_path_detected", T => {
    const v = fake(40);
    const hits = T.scanLine("docs/archive/" + v + "/notes.md");
    return expect(hits.length === 1 && hits[0].value === v, "a 40-char generated segment inside a path was missed");
});

S.add("entropy_hex_needs_credential_context", T => {
    const hex = fake(64, HEX);
    const ctx = T.scanLine("api_key: \"" + hex + "\"");
    const bare = T.scanLine("sha256 " + hex);
    expect(ctx.length === 1 && ctx[0].rule === "HIGH_ENTROPY", "hex in api_key context: " + ctx.length + " hits");
    return expect(bare.length === 0, "bare hex was a finding");
});

S.add("entropy_alphabet_table_skipped", T => {
    const t = T.scanLine("const B64 = \"" + ALNUM + "+/\";");
    return expect(t.length === 0, "alphabet table was a finding");
});

S.add("staged_sees_only_added_lines", T => {
    const d = json(T, ["--staged"], X.staged);
    const got = d.findings.map(f => f.path + ":" + f.line + " " + f.rule).join(", ");
    expect(d.code === 1, "exit " + d.code);
    return expect(got === "a.txt:3 XAI_KEY", "findings: " + got);
});

S.add("staged_clean_change_exit_0", T => {
    const r = run(T, ["--staged"], X.staged2);
    return expect(r.code === 0 && /0 findings/.test(r.out), "exit " + r.code);
});

S.add("range_sees_only_added_lines", T => {
    const d = json(T, ["--range", X.r.r1 + ".." + X.r.r2], X.range);
    const got = d.findings.map(f => f.path + ":" + f.line + " " + f.rule).sort().join(", ");
    const want = ["<commit-message>:3 XAI_KEY", "g.txt:1 GITLAB_TOKEN", X.quoted + ":1 GITHUB_TOKEN"].sort().join(", ");
    expect(d.code === 1, "exit " + d.code);
    return expect(got === want, "findings: " + got);
});

S.add("range_commit_message_scanned", T => {
    const d = json(T, ["--range", X.r.r1 + ".." + X.r.r2], X.range);
    return expect(d.findings.some(f => f.path === "<commit-message>" && f.commit === X.r.r2 && f.rule === "XAI_KEY"), "commit message value missed");
});

S.add("range_quoted_path_decoded", T => {
    const d = json(T, ["--range", X.r.r1 + ".." + X.r.r2], X.range);
    return expect(d.findings.some(f => f.path === X.quoted), "paths: " + d.findings.map(f => f.path).join(", "));
});

S.add("range_merge_new_lines_detected", T => {
    const d = json(T, ["--range", X.r.r3 + ".." + X.r.merge], X.range);
    const got = d.findings.filter(f => f.path !== "<commit-message>").map(f => f.commit.slice(0, 7) + " " + f.path + ":" + f.line + " " + f.rule).sort().join(", ");
    const want = [X.r.merge.slice(0, 7) + " m.txt:1 JWT", X.r.side.slice(0, 7) + " s.txt:1 OPENAI_KEY"].sort().join(", ");
    return expect(got === want, "findings: " + got);
});

S.add("range_usage_errors_exit_2", T => {
    const bad = [["--range", "nope"], ["--range", X.r.r1 + "..nosuchrev"], ["--range"], ["--range", "-x..y"]].map(a => run(T, a, X.range).code);
    return expect(bad.every(c => c === 2), "exits " + bad.join(","));
});

S.add("path_mode_one_file", T => {
    const d = json(T, ["--path", "planted.txt"], X.plant);
    expect(d.findings.length === PLANT.length && d.findings.every(f => f.path === "planted.txt"), "findings " + d.findings.length);
    return expect(d.filesScanned === 1, "files " + d.filesScanned);
});

S.add("path_outside_or_untracked_exit_2", T => {
    const codes = [run(T, ["--path", X.outside], X.plant).code, run(T, ["--path", "untracked.txt"], X.plant).code, run(T, ["--path", "nosuch.txt"], X.plant).code];
    return expect(codes.every(c => c === 2), "exits " + codes.join(","));
});

S.add("allowlist_matching_entries_allowed", T => {
    const r = run(T, ["--allowlist", X.allowOk], X.allow);
    expect(r.code === 0, "exit " + r.code);
    expect((r.out.match(/^ALLOWED a\.txt:\d /gm) || []).length === 2, "ALLOWED lines");
    return expect(/0 findings, 2 allowed/.test(r.out) && r.out.includes("reason: TEST_ fake key used as a fixture"), "RESULT or reason");
});

S.add("allowlist_partial_still_fails", T => {
    const d = json(T, ["--allowlist", X.allowPartial], X.allow);
    return expect(d.code === 1 && d.findings.length === 1 && d.allowed.length === 1 && d.findings[0].rule === "HIGH_ENTROPY", "exit " + d.code + " findings " + d.findings.length);
});

S.add("allowlist_stale_entry_fails", T => {
    const r = run(T, ["--allowlist", X.allowStale], X.allow);
    expect(r.code === 1, "exit " + r.code);
    return expect(/^STALE_ALLOWLIST a\.txt OPENAI_KEY /m.test(r.out) && /0 findings, 2 allowed, 0 baselined, 1 stale allowlist entries/.test(r.out), "no STALE_ALLOWLIST line");
});

S.add("allowlist_staleness_only_in_scope", T => {
    const r = run(T, ["--path", "other.txt", "--allowlist", X.allowStale], X.allow);
    return expect(r.code === 0 && !/STALE_ALLOWLIST/.test(r.out), "entries for a.txt judged in a --path other.txt scan (exit " + r.code + ")");
});

S.add("allowlist_malformed_exit_2", T => {
    const r = run(T, ["--allowlist", X.allowBad], X.allow);
    return expect(r.code === 2 && /reason|exactly/.test(r.err), "exit " + r.code);
});

S.add("committed_allowlist_is_valid_and_reasoned", T => {
    const f = path.join(__dirname, "secrets_allowlist.json");
    const doc = JSON.parse(fs.readFileSync(f, "utf8"));
    expect(doc.schema === "deus.secrets_allowlist.v1" && Array.isArray(doc.entries), "schema");
    expect(doc.entries.every(e => typeof e.reason === "string" && e.reason.trim().length >= 10), "an entry has no reason");
    const r = run(T, ["--allowlist", f, "--path", "other.txt"], X.allow);
    return expect(r.code === 0, "the committed allowlist does not load (exit " + r.code + ")");
});

S.add("baseline_historical_finding_passes", T => {
    const d = json(T, ["--range", X.b.e0 + ".." + X.b.e1, "--baseline", X.baseOk], X.base);
    expect(d.code === 0, "exit " + d.code + ", findings " + d.findings.length);
    const b = d.baselined[0];
    expect(d.baselined.length === 1 && b.path === "f.txt" && b.incident === "TEST_INCIDENT" && b.fingerprint === sha(X.T), "baselined " + d.baselined.length);
    const t = run(T, ["--range", X.b.e0 + ".." + X.b.e1, "--baseline", X.baseOk], X.base);
    if (leaks(t.out, [X.T])) return "BASELINED output leaks the value";
    return expect(/^BASELINED [0-9a-f]{12} f\.txt:1 HIGH_ENTROPY .{4}\.\.\. \(48 chars\) fingerprint=[0-9a-f]{12} incident: TEST_INCIDENT$/m.test(t.out), "no BASELINED line");
});

S.add("baseline_readded_later_commit_fails", T => {
    const r = run(T, ["--range", X.b.e2 + ".." + X.b.e3, "--baseline", X.baseOk], X.base);
    expect(r.code === 1, "exit " + r.code);
    return expect(/^FINDING [0-9a-f]{12} h\.txt:1 HIGH_ENTROPY .*is baselined for TEST_INCIDENT only in the history before/m.test(r.out), "no out-of-scope FINDING line");
});

S.add("baseline_whole_history_fails_on_readd_only", T => {
    const d = json(T, ["--range", X.b.e0 + ".." + X.b.e3, "--baseline", X.baseOk], X.base);
    const f = d.findings.map(x => x.path).sort().join(",");
    return expect(d.code === 1 && d.baselined.length === 1 && f === "h.txt,v.txt", "baselined " + d.baselined.length + ", findings " + f);
});

S.add("baseline_different_value_fails", T => {
    const d = json(T, ["--range", X.b.e1 + ".." + X.b.e1v, "--baseline", X.baseOk], X.base);
    return expect(d.code === 1 && d.findings.length === 1 && d.findings[0].path === "v.txt" && d.baselined.length === 0, "exit " + d.code);
});

S.add("baseline_head_occurrence_fails", T => {
    const d = json(T, ["--baseline", X.baseOk], X.base);
    return expect(d.code === 1 && d.findings.some(f => f.path === "h.txt") && d.baselined.length === 0, "exit " + d.code);
});

S.add("baseline_staged_occurrence_fails", T => {
    const d = json(T, ["--staged", "--baseline", X.baseOk], X.base);
    return expect(d.code === 1 && d.findings.some(f => f.path === "s.txt") && d.baselined.length === 0, "exit " + d.code);
});

S.add("baseline_path_occurrence_fails", T => {
    const d = json(T, ["--path", "h.txt", "--baseline", X.baseOk], X.base);
    return expect(d.code === 1 && d.findings.length === 1 && d.baselined.length === 0, "exit " + d.code);
});

S.add("baseline_stale_entry_fails", T => {
    const r = run(T, ["--range", X.b.e0 + ".." + X.b.e1, "--baseline", X.baseStale], X.base);
    expect(r.code === 1, "exit " + r.code);
    return expect(/^STALE_BASELINE fingerprint=[0-9a-f]{12} HIGH_ENTROPY incident: TEST_INCIDENT \(not found in addedIn commit [0-9a-f]{12}\)$/m.test(r.out) &&
                  /0 findings, 0 allowed, 1 baselined, 0 stale allowlist entries, 1 stale baseline entries/.test(r.out), "no STALE_BASELINE line");
});

S.add("baseline_staleness_only_when_addedIn_scanned", T => {
    const d = json(T, ["--range", X.b.e1v + ".." + X.b.e2, "--baseline", X.baseStale], X.base);
    return expect(d.code === 0 && d.staleBaseline.length === 0, "exit " + d.code + ", stale " + d.staleBaseline.length);
});

S.add("baseline_bad_ancestry_or_shape_exit_2", T => {
    const a = run(T, ["--range", X.b.e0 + ".." + X.b.e1, "--baseline", X.baseBadAnc], X.base);
    const b = run(T, ["--baseline", X.baseBadShape], X.base);
    return expect(a.code === 2 && /not in the history before/.test(a.err) && b.code === 2 && /fingerprint/.test(b.err), "exits " + a.code + "," + b.code);
});

S.add("baseline_file_has_no_rule_match", T => {
    const lines = fs.readFileSync(path.join(__dirname, "secrets_baseline.json"), "utf8").split("\n");
    const hits = [];
    lines.forEach((l, i) => { for (const h of T.scanLine(l.replace(/\r$/, ""))) hits.push("line " + (i + 1) + " " + h.rule); });
    return expect(hits.length === 0, "hits: " + hits.join(", "));
});

S.add("baseline_real_history_224b1b36_baselined", T => {
    const d = json(T, ["--range", "224b1b36^..224b1b36"], REPO);
    return expect(d.code === 0 && d.findings.length === 0 && d.baselined.length === 2 &&
                  d.baselined.every(b => b.incident === "SEC-2026-09-26-01"), "exit " + d.code + ", findings " + d.findings.length + ", baselined " + d.baselined.length);
});

S.add("usage_errors_exit_2", T => {
    const codes = [["--bogus"], ["--staged", "--path", "a.txt"], ["--allowlist"], ["--baseline", path.join(F.root, "missing.json")]].map(a => run(T, a, X.plant).code);
    return expect(codes.every(c => c === 2), "exits " + codes.join(","));
});

S.add("cli_exit_codes", () => {
    const cli = (args, cwd) => spawnSync(process.execPath, [TOOL].concat(args), { cwd, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    const codes = [cli([], X.plant).status, cli([], X.clean).status, cli(["--bogus"], X.clean).status, cli(["--help"], X.clean).status];
    const j = cli(["--json"], X.plant);
    const doc = JSON.parse(j.stdout.toString("utf8"));
    expect(codes.join(",") === "1,0,2,0", "exits " + codes.join(","));
    return expect(j.status === 1 && doc.exitCode === 1 && doc.findings.length === PLANT.length + 2, "--json exit " + j.status);
});

// ---------------------------------------------------------------------------------------------
// Mutants
// ---------------------------------------------------------------------------------------------

const MUTANTS = [];
for (const id of REAL.RULES.map(r => r.id)) {
    MUTANTS.push({
        name: "rule_" + id + "_off",
        pairs: [["const ENTROPY_RULE = {", "RULES.splice(RULES.findIndex(r => r.id === \"" + id + "\"), 1);\nconst ENTROPY_RULE = {"]],
        hints: ["detects_" + id]
    });
}
MUTANTS.push(
    { name: "entropy_off", pairs: [["for (const h of entropyHits(line, taken))", "for (const h of [])"]], hints: ["detects_HIGH_ENTROPY"] },
    { name: "credential_file_off", pairs: [["return CREDENTIAL_FILE_RE.test(p.split(\"/\").pop());", "return false;"]], hints: ["detects_CREDENTIAL_FILE_tracked_env"] },
    { name: "redaction_off", pairs: [["return value.slice(0, REDACT_KEEP) + \"... (\"", "return value + \"... (\""]], hints: ["redaction_text_output_keeps_4_chars"] },
    { name: "allowlist_staleness_off", pairs: [["const stale = allowEntries.filter(e => !e.used && ", "const stale = [].filter(e => !e.used && "]], hints: ["allowlist_stale_entry_fails"] },
    { name: "allowlist_off", pairs: [["const entry = allowEntries.find(", "const entry = undefined && allowEntries.find("]], hints: ["allowlist_matching_entries_allowed"] },
    {
        name: "baseline_ignores_scope",
        pairs: [["if (base && baseline.isBefore(rec.commit, base.onlyInHistoryBefore)) {", "if (base) {"],
                ["let baseline = null;\n        if (o.mode === \"range\") {", "let baseline = null;\n        if (true) {"]],
        hints: ["baseline_readded_later_commit_fails", "baseline_head_occurrence_fails"]
    },
    { name: "baseline_ignores_ancestry", pairs: [["if (base && baseline.isBefore(rec.commit, base.onlyInHistoryBefore)) {", "if (base) {"]], hints: ["baseline_readded_later_commit_fails"] },
    { name: "baseline_off", pairs: [["const base = fp === null ? undefined : baseEntries.find(", "const base = undefined && baseEntries.find("]], hints: ["baseline_historical_finding_passes"] },
    { name: "baseline_staleness_off", pairs: [["if (missed.length) staleBaseline.push(", "if (false) staleBaseline.push("]], hints: ["baseline_stale_entry_fails"] },
    { name: "binary_nul_skip_off", pairs: [["if (hasNul(buf)) { units.push({ path: e.path, binary: \"nul\", lines: null }); continue; }", ""]], hints: ["binary_nul_and_extension_skipped_and_counted"] },
    { name: "entropy_slash_split_off", pairs: [["if (!tok.includes(\"/\") || padded || tok.includes(\"+\") || context) candidates.push", "if (true) candidates.push"]], hints: ["clean_tree_exit_0"] },
    { name: "entropy_sequence_skip_off", pairs: [["if (hasSequentialRun(value, ENTROPY_SEQ_RUN)) continue;", ""]], hints: ["entropy_alphabet_table_skipped"] },
    { name: "staged_scans_whole_tree", pairs: [["function collectStaged(root) {\n", "function collectStaged(root) {\n    return collectHead(root);\n"]], hints: ["staged_sees_only_added_lines"] },
    { name: "patch_removed_lines_scanned", pairs: [["if (prefix.includes(\"-\")) continue;", ""], ["if (/^\\++$/.test(prefix)) {", "if (true) {"]], hints: ["staged_sees_only_added_lines"] },
    { name: "range_messages_off", pairs: [["yield { commit: rec.slice(s + 1, t), path: COMMIT_MESSAGE_PATH", "if (false) yield { commit: rec.slice(s + 1, t), path: COMMIT_MESSAGE_PATH"]], hints: ["range_commit_message_scanned"] }
);

// ---------------------------------------------------------------------------------------------

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
