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
 * per exit path through a child process. Mutants are in-memory copies of the tool's source. Each
 * (tool, arguments) result is computed once and shared by the checks that read it.
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
const UPPER = H.charRange("A", "Z"), LOWER = H.charRange("a", "z"), DIGIT = H.charRange("0", "9");
const ALNUM = UPPER + LOWER + DIGIT;
const HEX = DIGIT + H.charRange("a", "f");
const BOM = String.fromCharCode(0xFEFF);
const CTRL = String.fromCharCode(3);

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

// A generated-looking value: every character class of the alphabet among upper / lower / digit is
// present, no ascending run, and (32+ characters from ALNUM) at least 4.8 bits per character unless
// a bit window [lo, hi) is asked for. Every value is remembered: it is the secret part of a fake
// credential (the fixed prefixes such as "ya29." are public format text).
const GENERATED = [];
function fake(n, alphabet = ALNUM, lo, hi) {
    for (let tries = 0; tries < 500000; tries++) {
        let s = "";
        for (let i = 0; i < n; i++) s += alphabet[Math.floor(rand() * alphabet.length)];
        if (/[A-Z]/.test(alphabet) && !/[A-Z]/.test(s)) continue;
        if (/[a-z]/.test(alphabet) && !/[a-z]/.test(s)) continue;
        if (/[0-9]/.test(alphabet) && !/[0-9]/.test(s)) continue;
        if (ascendingRun(s)) continue;
        const b = bitsOf(s);
        if (lo !== undefined ? (b < lo || b >= hi) : (n >= 32 && alphabet === ALNUM && b < 4.8)) continue;
        GENERATED.push(s);
        return s;
    }
    throw new Error("no fake value of " + n + " characters in the bit window");
}

// One fake value per content rule. `line` is the fixture line, `value` the part the scanner redacts.
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
    const asg = fake(20, LOWER + DIGIT);
    add("CREDENTIAL_ASSIGNMENT", "db_pass" + "word = \"" + asg + "\"", asg);
    return set;
}

const PLANT = plantSet();
const CONTENT_RULES = REAL.RULES.map(r => r.id).concat([REAL.ENTROPY_RULE.id, REAL.ASSIGN_RULE.id]);
const sha = s => crypto.createHash("sha256").update(Buffer.from(s, "latin1")).digest("hex");
const utf16 = s => Buffer.from(BOM + s, "utf16le");

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

const allowCfg = (name, entries) => { const f = path.join(F.root, name); fs.writeFileSync(f, JSON.stringify({ schema: "deus.secrets_allowlist.v1", entries }, null, 2)); return f; };
const allowEntry = (p, rule, line, reason) => ({ path: p, rule, lineSha256: sha(line), reason });

function setup() {
    // plant: one fake value per rule at HEAD, a tracked .env, binaries, NUL files, a CRLF file, a
    // value as a file name, an untracked file.
    X.plant = F.repo("plant");
    const lines = ["TEST_ fixture: every value below is fake and built at run time"].concat(PLANT.map(p => p.line));
    X.plantLine = new Map(PLANT.map((p, i) => [p.rule, i + 2]));
    X.crlfToken = "gh" + "o_" + fake(36);
    X.nulKey = "sk-" + "proj-" + fake(48);
    X.pngKey = "AI" + "za" + fake(35);
    X.utf16Key = "xa" + "i-" + fake(48);
    X.nameTok = fake(44);
    X.untrackedKey = "xa" + "i-" + fake(60);
    F.commit(X.plant, {
        "README.md": "TEST_ plant fixture\n",
        "planted.txt": lines.join("\n") + "\n",
        ".env": "TEST_MODE=1\n",
        "crlf.txt": "header\r\nremote " + X.crlfToken + "\r\n",
        "blob.dat": Buffer.concat([Buffer.from([0, 1, 2, 0, 10]), Buffer.from(X.nulKey + "\n", "latin1")]),
        "utf16.txt": utf16("grok " + X.utf16Key + "\n"),
        "certs/client.p12": Buffer.from([0x30, 0x82, 0x00, 0x10, 0x02, 0x01, 0x03, 0x00]),
        "image.png": Buffer.from("\n" + X.pngKey + "\n", "latin1"),
        ["img/" + X.nameTok + ".png"]: Buffer.from([0x89, 0x50, 0x4e, 0x47])
    }, "TEST_ plant");
    F.write(X.plant, { "untracked.txt": "grok " + X.untrackedKey + "\n" });
    X.outside = path.join(F.root, "outside.txt");
    fs.writeFileSync(X.outside, "outside the fixture repository\n");

    // short: values shorter than the redaction prefix limit.
    X.short = F.repo("short");
    X.p4 = fake(4);
    X.p6 = fake(6);
    F.commit(X.short, { "netrc.txt": "machine a.example.invalid login TEST_user password " + X.p4 + "\nmachine b.example.invalid login TEST_user password " + X.p6 + "\n" }, "TEST_ short");

    // clean: the real policy texts plus look-alikes that must not be findings.
    X.clean = F.repo("clean");
    const alphabet = ALNUM + "+/";
    const blobSegs = [];
    for (let i = 0; i < 8; i++) blobSegs.push(fake(40));
    const falsePositives = [
        "TEST_ look-alikes that are not credentials",
        "Provider keys look like sk-..., AIza..., sk-ant-..., xai-...; bearer tokens and JWT tokens never go in git.",
        "sk-some-kebab-case-identifier-that-is-long-enough-to-match-a-body",
        "Use a Bearer token from the vault; see the bearer header section.",
        "machine example.invalid login TEST_user password <PASSWORD>",
        "Cookie: sessionid=<redacted>",
        "password: <PASSWORD>, api_key = process.env.TEST_API_KEY, cache_key: \"layer_depth_2026_v3\", author: \"TEST_author_2026_team\"",
        "/Users/TEST_user/OneDrive/Desktop/UF/docs/systems/UF_History_and_Chronicle_Notes2.md",
        "C:/Users/TEST_user/OneDrive/Desktop/UF/tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate1_provoke_layers_flat.log",
        "docs/migration/onedrive_links_inventory.md -> docs/packets/generation/DEUS_GENERATION_PACKETS_MANIFEST.md",
        "file:///c:/Users/TEST_user/OneDrive/Desktop/UF/docs/Z_COMPATIBILITY_AUDIT_Rev4/WG_00_09b/fix2_c2184c94.md",
        "evidence: tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/Gate2_Provoke_Depth_Layer7.log",
        "see docs/packets/DEUS_Bootstrap_Packet_07/Q3_2026/README.md",
        "https://github.com/pixijs/pixijs/blob/v5.3.12/packages/core/src/renderers/AbstractRenderer2D.js",
        "var lookup = \"" + alphabet + "\";",
        "<img src=\"data:image/png;base64," + blobSegs.join("/") + "\">",
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

    // range: added lines per commit, a commit message, a quoted path, a merge whose result differs
    // from both parents, and then a commit with the odd cases (no final newline before, CRLF, " b/"
    // in a name, a value as a file name, a binary extension, UTF-16, a control byte in the message).
    X.range = F.repo("range");
    X.r = {};
    X.rk = { k1: "AI" + "za" + fake(35), k2: "gl" + "pat-" + fake(24), k3: "xa" + "i-" + fake(48), k4: "sk-" + "proj-" + fake(48),
             k5: "ey" + "J" + fake(16) + "." + "ey" + "J" + fake(24) + "." + fake(40), k6: "gh" + "s_" + fake(36), k8: "gl" + "pat-" + fake(22),
             k9: "gl" + "pat-" + fake(26), k10: "gh" + "u_" + fake(36), k11: "sk-" + "proj-" + fake(40), k12: "AI" + "za" + fake(35),
             k13: "xa" + "i-" + fake(40), k14: "xa" + "i-" + fake(44), name: fake(40) };
    X.quoted = "sp ace/" + String.fromCharCode(0xfc) + "n" + String.fromCharCode(0xef) + ".txt";
    X.bslash = "x b/y b/z.txt";
    X.r.r0 = F.commit(X.range, { "README.md": "TEST_ range fixture\n", "both.txt": "a\nb\nc\nd\n" }, "TEST_ r0");
    X.r.r1 = F.commit(X.range, { "f.txt": "one\nk1 '" + X.rk.k1 + "'\n" }, "TEST_ r1");
    X.r.r2 = F.commit(X.range, { "g.txt": "lab " + X.rk.k2 + "\n", [X.quoted]: "remote " + X.rk.k6 + "\n" },
                      "TEST_ r2\n\nthe message carries " + X.rk.k3 + "\n");
    F.git(X.range, ["checkout", "-q", "-b", "side"]);
    X.r.side = F.commit(X.range, { "s.txt": "openai " + X.rk.k4 + "\n", "both.txt": "a\nside " + X.rk.k8 + "\nb\nc\nd\n" }, "TEST_ side");
    F.git(X.range, ["checkout", "-q", "main"]);
    X.r.r3 = F.commit(X.range, { "h.txt": "clean\n", "both.txt": "a\nb main\nc\nd\n" }, "TEST_ r3");
    F.git(X.range, ["merge", "-q", "--no-ff", "--no-commit", "-s", "ours", "side"]);
    F.write(X.range, { "s.txt": "openai " + X.rk.k4 + "\n", "both.txt": "a\nside " + X.rk.k8 + "\nb main\nc\nd\n", "m.txt": "jwt " + X.rk.k5 + "\n" });
    F.git(X.range, ["add", "s.txt", "both.txt", "m.txt"]);
    F.git(X.range, ["commit", "-q", "-m", "TEST_ merge side; the result differs from both parents"]);
    X.r.merge = F.git(X.range, ["rev-parse", "HEAD"]);
    X.r.r4a = F.commit(X.range, { "nonl.txt": "first" }, "TEST_ r4a");
    X.r.r4 = F.commit(X.range, {
        "nonl.txt": "first\nsecond " + X.rk.k9 + "\n",
        "crlfr.txt": "x\r\nremote " + X.rk.k10 + "\r\n",
        [X.bslash]: "openai " + X.rk.k11 + "\n",
        "pic.png": Buffer.from("\n" + X.rk.k12 + "\n", "latin1"),
        ["keys/" + X.rk.name + ".txt"]: "clean\n",
        "utf16r.txt": utf16("grok " + X.rk.k13 + "\n")
    }, "TEST_ r4 " + CTRL + " control byte\n\nafter the control byte " + X.rk.k14 + "\n");
    X.allowMsg = allowCfg("allow_msg.json", [allowEntry("<commit-message>", "XAI_KEY", "the message carries " + X.rk.k3, "TEST_ fake value in a commit message")]);

    // allow: two findings and allowlists around them.
    X.allow = F.repo("allow");
    X.a1 = "x " + "sk-" + "proj-" + fake(48);
    X.a2 = "y " + fake(48);
    F.commit(X.allow, { "a.txt": X.a1 + "\n" + X.a2 + "\n", "other.txt": "clean\n" }, "TEST_ allow");
    const e1 = allowEntry("a.txt", "OPENAI_KEY", X.a1, "TEST_ fake key used as a fixture");
    const e2 = allowEntry("a.txt", "HIGH_ENTROPY", X.a2, "TEST_ fake value used as a fixture");
    X.allowOk = allowCfg("allow_ok.json", [e1, e2]);
    X.allowPartial = allowCfg("allow_partial.json", [e1]);
    X.allowStale = allowCfg("allow_stale.json", [e1, e2, allowEntry("a.txt", "OPENAI_KEY", "a line that is not there", "TEST_ stale entry")]);
    X.allowWrongPath = allowCfg("allow_wrong_path.json", [allowEntry("other.txt", "OPENAI_KEY", X.a1, "TEST_ right line, wrong file"), e2]);
    X.allowBad = allowCfg("allow_bad.json", [{ path: "a.txt", rule: "OPENAI_KEY", lineSha256: sha(X.a1) }]);

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
    const bentry = (value, addedIn, fix) => ({ fingerprint: sha(value), rule: "HIGH_ENTROPY", incident: "TEST_INCIDENT", onlyInHistoryBefore: fix || X.b.e2, addedIn, reason: "TEST_ known historical value" });
    const bcfg = (name, entries) => { const f = path.join(F.root, name); fs.writeFileSync(f, JSON.stringify({ schema: "deus.secrets_baseline.v1", entries }, null, 2)); return f; };
    X.baseOk = bcfg("base_ok.json", [bentry(X.T, [X.b.e1])]);
    X.baseStale = bcfg("base_stale.json", [bentry(X.T, [X.b.e1]), bentry(X.W, [X.b.e1])]);
    X.baseBadAnc = bcfg("base_bad_ancestry.json", [bentry(X.T, [X.b.e3])]);
    X.baseBadShape = bcfg("base_bad_shape.json", [Object.assign(bentry(X.T, [X.b.e1]), { fingerprint: "abc" })]);
    X.baseNotRemoved = bcfg("base_not_removed.json", [bentry(X.T, [X.b.e1], X.b.e1v)]);
    X.missingSha = crypto.createHash("sha1").update("TEST_ no such commit").digest("hex");
    X.baseMissing = bcfg("base_missing.json", [bentry(X.T, [X.b.e1], X.missingSha)]);
    X.allowBase = allowCfg("allow_base.json", [allowEntry("f.txt", "HIGH_ENTROPY", "token " + X.T, "TEST_ also allowlisted")]);
}

// ---------------------------------------------------------------------------------------------
// Helpers for checks
// ---------------------------------------------------------------------------------------------

// Each (tool, cwd, arguments) run happens once; the checks only read the result.
const MEMO = new WeakMap();
function run(T, argv, cwd) {
    let m = MEMO.get(T);
    if (!m) MEMO.set(T, m = new Map());
    const key = cwd + "\0" + argv.join("\0");
    if (!m.has(key)) m.set(key, H.capture(() => T.main(argv, cwd)));
    return m.get(key);
}

function json(T, argv, cwd) {
    const r = run(T, argv.concat(["--json"]), cwd);
    let doc;
    try { doc = JSON.parse(r.out); } catch (e) { throw new Error("--json output does not parse (exit " + r.code + ")"); }
    return Object.assign(doc, { code: r.code, text: r.out });
}

function expect(cond, why) { if (!cond) throw new Error(why); return true; }
const list = fs2 => fs2.map(f => (f.commit ? f.commit.slice(0, 7) + " " : "") + f.path + ":" + f.line + " " + f.rule).sort().join(", ");

// No 5-character window of the generated part of any given value may appear in the output (the
// redaction shows at most REDACT_KEEP = 4 characters). The exact redacted form is checked apart.
function leaks(output, values) {
    const k = REAL.REDACT_KEEP + 1;
    const parts = GENERATED.filter(g => g.length >= k && values.some(v => v.includes(g)));
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
const PLANT_FINDINGS = PLANT.length + 6;      // + .env, crlf.txt, blob.dat, utf16.txt, certs/client.p12, img/<value>.png

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

S.add("credential_file_binary_p12_detected", T => {
    const d = json(T, [], X.plant);
    return expect(d.findings.some(f => f.path === "certs/client.p12" && f.rule === "CREDENTIAL_FILE"), "a binary .p12 file was not reported");
});

const shownName = v => "[" + v.slice(0, 4) + "... (" + v.length + " chars)]";

S.add("file_name_scanned_even_when_unread", T => {
    const d = json(T, [], X.plant);
    const f = d.findings.filter(x => x.path === "img/" + shownName(X.nameTok) + ".png");
    return expect(f.length === 1 && f[0].line === 0 && f[0].rule === "HIGH_ENTROPY" && f[0].length === X.nameTok.length, "value in a binary file name: " + list(d.findings.filter(x => x.line === 0)));
});

S.add("credential_file_names", T => {
    const yes = [".env", ".env.local", "config/server.pem", "id_rsa", "id_ed25519.pub", ".netrc", "_netrc", "credentials.json", "a/.claude.json", ".git-credentials", "c/x.p12", "c/y.pfx"];
    const no = ["environment.js", "docs/env.md", "pem_notes.txt", "rsa_id.txt", "credentials.md", "claude.json.md"];
    const bad = yes.filter(n => !T.credentialFileHit(n)).concat(no.filter(n => T.credentialFileHit(n)));
    return expect(bad.length === 0, "misclassified: " + bad.join(", "));
});

S.add("head_findings_exit_1_and_counts", T => {
    const d = json(T, [], X.plant);
    expect(d.code === 1 && d.exitCode === 1, "exit " + d.code);
    return expect(d.findings.length === PLANT_FINDINGS, "findings " + d.findings.length + " != " + PLANT_FINDINGS + ": " + list(d.findings));
});

S.add("crlf_line_detected_without_cr", T => {
    const d = json(T, [], X.plant);
    const f = d.findings.find(x => x.path === "crlf.txt");
    expect(f && f.line === 2 && f.rule === "GITHUB_TOKEN", "crlf.txt finding " + JSON.stringify(f && [f.line, f.rule]));
    return expect(f.length === X.crlfToken.length && f.lineSha256 === sha("remote " + X.crlfToken), "length or line sha256 includes the CR");
});

S.add("nul_files_scanned_without_nul_bytes", T => {
    const d = json(T, [], X.plant);
    const blob = d.findings.find(x => x.path === "blob.dat"), u16 = d.findings.find(x => x.path === "utf16.txt");
    expect(blob && blob.rule === "OPENAI_KEY" && blob.line === 2, "blob.dat value missed");
    expect(u16 && u16.rule === "XAI_KEY" && u16.line === 1 && u16.length === X.utf16Key.length, "UTF-16 value missed");
    const nul = d.nulFiles.map(s => s.path).sort().join(",");
    return expect(nul === "blob.dat,certs/client.p12,utf16.txt", "NUL files " + nul);
});

S.add("binary_extension_skipped_and_counted", T => {
    const d = json(T, [], X.plant);
    expect(!d.findings.some(f => f.path === "image.png"), "image.png content was scanned");
    const reasons = d.skipped.map(s => s.path + ":" + s.reason).sort().join(",");
    expect(reasons === "image.png:extension,img/" + shownName(X.nameTok) + ".png:extension", "skipped " + reasons);
    const t = run(T, [], X.plant);
    expect(/^NUL_FILE utf16\.txt \(NUL bytes removed before scanning\)$/m.test(t.out), "no NUL_FILE line");
    return expect(new RegExp("RESULT: 7 files scanned \\(3 with NUL bytes\\), 2 binary skipped, " + PLANT_FINDINGS + " findings, 0 allowed, 0 baselined").test(t.out),
                  "RESULT line: " + t.out.split("\n").filter(Boolean).pop());
});

S.add("head_ignores_untracked_files", T => {
    const d = json(T, [], X.plant);
    return expect(!d.findings.some(f => f.path === "untracked.txt") && !leaks(d.text, [X.untrackedKey]), "untracked file was read");
});

S.add("redaction_text_output_keeps_4_chars", T => {
    const r = run(T, [], X.plant);
    const why = leaks(r.out + r.err, PLANT.map(p => p.value).concat([X.crlfToken, X.nulKey, X.utf16Key, X.nameTok]));
    if (why) return why;
    for (const p of PLANT) {
        const want = p.value.slice(0, 4) + "... (" + p.value.length + " chars)";
        if (!r.out.includes(" " + p.rule + " " + want)) return "no redacted line for " + p.rule;
    }
    return true;
});

S.add("redaction_json_output_keeps_4_chars", T => {
    const d = json(T, [], X.plant);
    const why = leaks(d.text, PLANT.map(p => p.value).concat([X.crlfToken, X.nulKey, X.utf16Key, X.nameTok]));
    if (why) return why;
    return expect(d.findings.every(f => f.lineSha256 && /^[0-9a-f]{64}$/.test(f.lineSha256) && f.fingerprint === undefined), "a finding lacks lineSha256 or carries a fingerprint");
});

S.add("redaction_short_values_show_length_only", T => {
    const d = json(T, [], X.short);
    const r = run(T, [], X.short);
    expect(d.findings.length === 2 && d.findings.every(f => f.rule === "NETRC_PASSWORD"), "findings " + list(d.findings));
    expect(d.findings.map(f => f.redacted).join(",") === "... (4 chars),... (6 chars)", "redacted " + d.findings.map(f => f.redacted).join(","));
    expect(d.findings.every(f => f.lineSha256 === null), "the line sha256 of a short value is in the output");
    return expect(!r.out.includes(X.p4) && !r.out.includes(X.p6) && !d.text.includes(X.p4) && !d.text.includes(X.p6), "a short value is in the output");
});

S.add("redact_function_contract", T => {
    const long = "abcdefghijklmnopq", short = "abcdefgh";
    return expect(T.redact(long) === "abcd... (17 chars)" && T.redact(short) === "... (8 chars)" && T.REDACT_KEEP === 4 && T.REDACT_MIN_LEN_FOR_PREFIX === 16,
                  "redact() " + T.redact(long) + " / " + T.redact(short));
});

S.add("clean_tree_exit_0", T => {
    const r = run(T, [], X.clean);
    expect(r.code === 0, "exit " + r.code + ": " + r.out.split("\n").filter(l => l.startsWith("FINDING")).length + " findings");
    return expect(/RESULT: 5 files scanned \(0 with NUL bytes\), 0 binary skipped, 0 findings/.test(r.out), "RESULT line");
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

S.add("entropy_data_blob_over_256_skipped", T => {
    const segs = [];
    for (let i = 0; i < 7; i++) segs.push(fake(40));
    return expect(T.scanLine("url(data:font/woff2;base64," + segs.join("/") + ")").length === 0, "a data blob over 256 characters was judged by segment");
});

S.add("entropy_hex_needs_credential_context", T => {
    const hex = fake(64, HEX, 3.5, 4.1);
    const ctx = T.scanLine("api_key: \"" + hex + "\"");
    const bare = T.scanLine("sha256 " + hex);
    expect(ctx.length === 1 && (ctx[0].rule === "HIGH_ENTROPY" || ctx[0].rule === "CREDENTIAL_ASSIGNMENT"), "hex in api_key context: " + ctx.length + " hits");
    return expect(bare.length === 0, "bare hex was a finding");
});

S.add("entropy_alphabet_table_skipped", T => {
    const t = T.scanLine("const B64 = \"" + ALNUM + "+/\";");
    return expect(t.length === 0, "alphabet table was a finding");
});

// Boundary values (made once): each sits just inside or just outside one threshold.
const BOUNDARY = (() => {
    const pick = (make, lo, hi) => { for (let i = 0; i < 200000; i++) { const s = make(); const b = bitsOf(s); if (b >= lo && b < hi && !ascendingRun(s)) { GENERATED.push(s); return s; } } throw new Error("no boundary value"); };
    const raw = (n, alphabet) => { let s = ""; for (let i = 0; i < n; i++) s += alphabet[Math.floor(rand() * alphabet.length)]; return s; };
    const mixed = s => /[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s);
    const small = UPPER.slice(0, 9) + LOWER.slice(0, 9) + DIGIT.slice(0, 8);
    return {
        short32: pick(() => { const s = raw(32, ALNUM); return mixed(s) ? s : "x"; }, 4.25, 4.45),                  // alnum only: short threshold 4.2
        under33: pick(() => { const s = raw(16, small) + "_" + raw(16, small); return mixed(s) ? s : "x"; }, 4.25, 4.45), // has "_": needs 4.5
        mid48: pick(() => { const s = raw(48, small); return mixed(s) ? s : "x"; }, 4.55, 4.7),                        // between 4.5 and 4.75
        at31: fake(31), at32: fake(32)
    };
})();

S.add("entropy_thresholds_at_the_boundaries", T => {
    const hit = s => T.scanLine("v " + s).some(h => h.rule === "HIGH_ENTROPY" && h.value === s);
    const B = BOUNDARY;
    expect(hit(B.short32), "32-char alnum value at " + bitsOf(B.short32).toFixed(2) + " bits missed");
    expect(!hit(B.under33), "33-char value with \"_\" at " + bitsOf(B.under33).toFixed(2) + " bits used the short threshold");
    expect(hit(B.mid48), "48-char value at " + bitsOf(B.mid48).toFixed(2) + " bits missed");
    return expect(hit(B.at32) && !hit(B.at31), "length boundary: 32 " + hit(B.at32) + ", 31 " + hit(B.at31));
});

S.add("credential_assignment_names", T => {
    const v = fake(20, LOWER + DIGIT);
    const yes = ["api_key = \"" + v + "\"", "GEMINI_KEY=" + v, "\"client_secret\": \"" + v + "\"", "export ACCESS_TOKEN=" + v, "db_password: '" + v + "'"];
    const no = ["cache_key: \"" + v + "\"", "author: \"" + v + "\"", "password: <PASSWORD>", "api_key = process.env.TEST_KEY", "token_count: 123456789012345678"];
    const bad = yes.filter(l => !T.scanLine(l).some(h => h.rule === "CREDENTIAL_ASSIGNMENT")).map(l => "missed: " + l.split(/[=:]/)[0])
        .concat(no.filter(l => T.scanLine(l).length > 0).map(l => "flagged: " + l.split(/[=:]/)[0]));
    return expect(bad.length === 0, bad.join("; "));
});

S.add("staged_sees_only_added_lines", T => {
    const d = json(T, ["--staged"], X.staged);
    expect(d.code === 1, "exit " + d.code);
    return expect(list(d.findings) === "a.txt:3 XAI_KEY", "findings: " + list(d.findings));
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

S.add("range_merge_lines_new_against_every_parent_only", T => {
    const d = json(T, ["--range", X.r.r3 + ".." + X.r.merge], X.range);
    const got = list(d.findings.filter(f => f.path !== "<commit-message>"));
    const want = [X.r.merge.slice(0, 7) + " m.txt:1 JWT", X.r.side.slice(0, 7) + " both.txt:2 GITLAB_TOKEN", X.r.side.slice(0, 7) + " s.txt:1 OPENAI_KEY"].sort().join(", ");
    return expect(got === want, "findings: " + got);
});

S.add("range_odd_cases_all_found", T => {
    const d = json(T, ["--range", X.r.r4a + ".." + X.r.r4], X.range);
    const got = d.findings.map(f => f.path + ":" + f.line + " " + f.rule).sort().join(", ");
    const want = ["<commit-message>:3 XAI_KEY", "crlfr.txt:2 GITHUB_TOKEN", "keys/" + shownName(X.rk.name) + ".txt:0 HIGH_ENTROPY", "nonl.txt:2 GITLAB_TOKEN",
                  "utf16r.txt:1 XAI_KEY", X.bslash + ":1 OPENAI_KEY"].sort().join(", ");
    return expect(got === want, "findings: " + got);
});

S.add("range_line_after_no_newline_marker", T => {
    const d = json(T, ["--range", X.r.r4a + ".." + X.r.r4], X.range);
    return expect(d.findings.some(f => f.path === "nonl.txt" && f.line === 2), "the line after a no-newline marker was dropped");
});

S.add("range_name_with_space_b_slash", T => {
    const d = json(T, ["--range", X.r.r4a + ".." + X.r.r4], X.range);
    return expect(d.findings.some(f => f.path === X.bslash), "paths: " + d.findings.map(f => f.path).join(", "));
});

S.add("range_crlf_line_sha_matches_head_form", T => {
    const d = json(T, ["--range", X.r.r4a + ".." + X.r.r4], X.range);
    const f = d.findings.find(x => x.path === "crlfr.txt");
    return expect(f && f.lineSha256 === sha("remote " + X.rk.k10), "CR kept in the line sha256");
});

S.add("range_binary_extension_skipped", T => {
    const d = json(T, ["--range", X.r.r4a + ".." + X.r.r4], X.range);
    return expect(!d.findings.some(f => f.path === "pic.png") && d.skipped.some(s => s.path === "pic.png" && s.reason === "extension"), "pic.png was scanned");
});

S.add("range_utf16_file_scanned", T => {
    const d = json(T, ["--range", X.r.r4a + ".." + X.r.r4], X.range);
    return expect(d.findings.some(f => f.path === "utf16r.txt") && d.nulFiles.some(s => s.path === "utf16r.txt"), "UTF-16 value missed in range mode");
});

S.add("range_message_control_byte_not_a_separator", T => {
    const d = json(T, ["--range", X.r.r4a + ".." + X.r.r4], X.range);
    return expect(d.findings.some(f => f.path === "<commit-message>" && f.commit === X.r.r4), "value after a control byte in a message missed");
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

S.add("path_mode_utf16_file", T => {
    const d = json(T, ["--path", "utf16.txt"], X.plant);
    return expect(d.findings.length === 1 && d.findings[0].rule === "XAI_KEY", "findings " + list(d.findings));
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

S.add("allowlist_entry_needs_the_right_path", T => {
    const d = json(T, ["--allowlist", X.allowWrongPath], X.allow);
    return expect(d.code === 1 && d.findings.length === 1 && d.findings[0].rule === "OPENAI_KEY" && d.staleAllowlist.length === 1, "an entry for other.txt allowed a.txt");
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

S.add("allowlist_stale_in_path_mode_for_that_file", T => {
    const d = json(T, ["--path", "a.txt", "--allowlist", X.allowStale], X.allow);
    return expect(d.code === 1 && d.staleAllowlist.length === 1 && d.findings.length === 0, "exit " + d.code + ", stale " + d.staleAllowlist.length);
});

S.add("allowlist_commit_message_entry", T => {
    const inRange = json(T, ["--range", X.r.r1 + ".." + X.r.r2, "--allowlist", X.allowMsg], X.range);
    const atHead = json(T, ["--allowlist", X.allowMsg], X.range);
    expect(inRange.allowed.length === 1 && inRange.allowed[0].path === "<commit-message>" && inRange.findings.length === 2, "range: allowed " + inRange.allowed.length);
    return expect(atHead.staleAllowlist.length === 0, "a <commit-message> entry was judged stale by a HEAD scan");
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

S.add("baseline_wins_over_allowlist_in_history", T => {
    const d = json(T, ["--range", X.b.e0 + ".." + X.b.e1, "--baseline", X.baseOk, "--allowlist", X.allowBase], X.base);
    return expect(d.code === 0 && d.baselined.length === 1 && d.allowed.length === 0 && d.staleBaseline.length === 0, "baselined " + d.baselined.length + ", allowed " + d.allowed.length);
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

S.add("baseline_fix_commit_must_remove_the_value", T => {
    const r = run(T, ["--range", X.b.e0 + ".." + X.b.e1, "--baseline", X.baseNotRemoved], X.base);
    return expect(r.code === 2 && /still holds the value/.test(r.err), "exit " + r.code);
});

S.add("baseline_missing_commits_make_the_entry_inactive", T => {
    const hit = json(T, ["--range", X.b.e0 + ".." + X.b.e1, "--baseline", X.baseMissing], X.base);
    const other = run(T, ["--range", X.b.e1v + ".." + X.b.e2, "--baseline", X.baseMissing], X.base);
    expect(hit.code === 1 && hit.findings.length === 1 && hit.baselined.length === 0 && hit.baselineInactive.length === 1, "value scan: exit " + hit.code);
    return expect(other.code === 0 && /^BASELINE_INACTIVE fingerprint=[0-9a-f]{12} HIGH_ENTROPY incident: TEST_INCIDENT \(commit [0-9a-f]{12} not in this clone/m.test(other.out),
                  "unrelated scan: exit " + other.code);
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
    return expect(j.status === 1 && doc.exitCode === 1 && doc.findings.length === PLANT_FINDINGS, "--json exit " + j.status);
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
    { name: "rule_CREDENTIAL_ASSIGNMENT_off", pairs: [["for (const h of assignmentHits(line, taken))", "for (const h of [])"]], hints: ["detects_CREDENTIAL_ASSIGNMENT"] },
    { name: "assignment_key_case_off", pairs: [["if (/^[a-z0-9]_key$/i.test(m[1]) && !/^[A-Z0-9]_KEY$/.test(m[1])) continue;", ""]], hints: ["credential_assignment_names"] },
    { name: "assignment_author_excluded_off", pairs: [["auth(?!or)|[a-z0-9]_key", "auth|[a-z0-9]_key"]], hints: ["credential_assignment_names"] },
    { name: "credential_file_off", pairs: [["return CREDENTIAL_FILE_RE.test(p.split(\"/\").pop());", "return false;"]], hints: ["detects_CREDENTIAL_FILE_tracked_env"] },
    { name: "name_checks_skip_unread_files", pairs: [["if (u.path !== COMMIT_MESSAGE_PATH) {", "if (u.path !== COMMIT_MESSAGE_PATH && u.lines !== null) {"]], hints: ["file_name_scanned_even_when_unread"] },
    { name: "file_names_off", pairs: [["for (const h of nameHits) hits.push(", "for (const h of []) hits.push("]], hints: ["file_name_scanned_even_when_unread"] },
    { name: "display_path_off", pairs: [["const shown = displayPath(u.path, nameHits);", "const shown = u.path;"]], hints: ["redaction_text_output_keeps_4_chars"] },
    { name: "redaction_off", pairs: [["return value.slice(0, REDACT_KEEP) + \"... (\"", "return value + \"... (\""]], hints: ["redaction_text_output_keeps_4_chars"] },
    { name: "short_value_prefix_shown", pairs: [["if (value.length < REDACT_MIN_LEN_FOR_PREFIX) return \"... (\" + value.length + \" chars)\";", ""]], hints: ["redaction_short_values_show_length_only"] },
    { name: "short_value_line_sha_shown", pairs: [["lineSha256: short ? null : h.lineSha256", "lineSha256: h.lineSha256"]], hints: ["redaction_short_values_show_length_only"] },
    { name: "allowlist_staleness_off", pairs: [["const stale = allowEntries.filter(e => !e.used && ", "const stale = [].filter(e => !e.used && "]], hints: ["allowlist_stale_entry_fails"] },
    { name: "allowlist_off", pairs: [["const entry = allowEntries.find(", "const entry = undefined && allowEntries.find("]], hints: ["allowlist_matching_entries_allowed"] },
    { name: "allowlist_ignores_path", pairs: [["e.path === u.path && e.rule === rec.rule && e.lineSha256 === h.lineSha256", "e.rule === rec.rule && e.lineSha256 === h.lineSha256"]], hints: ["allowlist_entry_needs_the_right_path"] },
    { name: "commit_message_entries_judged_at_head", pairs: [["fullSet === null ? e.path !== COMMIT_MESSAGE_PATH : fullSet.has(e.path)", "fullSet === null ? true : fullSet.has(e.path)"]], hints: ["allowlist_commit_message_entry"] },
    { name: "path_mode_staleness_off", pairs: [["return { units: [textUnit({ path: relPosix }, fs.readFileSync(real))], full: [relPosix] };", "return { units: [textUnit({ path: relPosix }, fs.readFileSync(real))], full: [] };"]], hints: ["allowlist_stale_in_path_mode_for_that_file"] },
    {
        name: "baseline_ignores_scope",
        pairs: [["if (base && baseline.isBefore(rec.commit, base.onlyInHistoryBefore)) {", "if (base) {"],
                ["let baseline = null, inactive = [];\n        if (o.mode === \"range\") {", "let baseline = null, inactive = [];\n        if (true) {"]],
        hints: ["baseline_readded_later_commit_fails", "baseline_head_occurrence_fails"]
    },
    { name: "baseline_ignores_ancestry", pairs: [["if (base && baseline.isBefore(rec.commit, base.onlyInHistoryBefore)) {", "if (base) {"]], hints: ["baseline_readded_later_commit_fails"] },
    { name: "baseline_off", pairs: [["const base = fp === null ? undefined : baseEntries.find(", "const base = undefined && baseEntries.find("]], hints: ["baseline_historical_finding_passes"] },
    { name: "baseline_staleness_off", pairs: [["if (missed.length) staleBaseline.push(", "if (false) staleBaseline.push("]], hints: ["baseline_stale_entry_fails"] },
    { name: "baseline_fix_tree_check_off", pairs: [["for (const u of collectHead(root, fix).units) {", "for (const u of []) {"]], hints: ["baseline_fix_commit_must_remove_the_value"] },
    { name: "baseline_missing_commits_not_inactive", pairs: [["if (missing.length) { inactive.push(Object.assign(e, { missing })); return; }", "if (missing.length) { inactive.push(Object.assign(e, { missing })); }"]], hints: ["baseline_missing_commits_make_the_entry_inactive"] },
    { name: "nul_files_not_scanned", pairs: [["return Object.assign(base, { binary: \"nul\", lines: splitLines(text.replace(/\\0/g, \"\")) });", "return Object.assign(base, { binary: \"extension\", lines: null });"]], hints: ["nul_files_scanned_without_nul_bytes"] },
    { name: "range_nul_files_not_scanned", pairs: [["binary: \"nul\", lines: f.added.map(", "binary: \"nul\", lines: null, x: f.added.map("]], hints: ["range_utf16_file_scanned"] },
    { name: "entropy_slash_split_off", pairs: [["if (!tok.includes(\"/\") || padded || tok.includes(\"+\") || context) candidates.push", "if (true) candidates.push"]], hints: ["clean_tree_exit_0"] },
    { name: "entropy_sequence_skip_off", pairs: [["if (hasSequentialRun(value, ENTROPY_SEQ_RUN)) continue;", ""]], hints: ["entropy_alphabet_table_skipped"] },
    { name: "entropy_long_run_skip_off", pairs: [["if (tok.length > ENTROPY_MAX_LEN) continue;", ""]], hints: ["entropy_data_blob_over_256_skipped"] },
    { name: "entropy_min_bits_raised", pairs: [["const ENTROPY_MIN_BITS = 4.5;", "const ENTROPY_MIN_BITS = 4.75;"]], hints: ["entropy_thresholds_at_the_boundaries"] },
    { name: "entropy_min_len_raised", pairs: [["const ENTROPY_MIN_LEN = 32;", "const ENTROPY_MIN_LEN = 40;"]], hints: ["entropy_thresholds_at_the_boundaries"] },
    { name: "entropy_short_threshold_off", pairs: [["const ENTROPY_SHORT_MIN_BITS = 4.2;", "const ENTROPY_SHORT_MIN_BITS = 4.5;"]], hints: ["entropy_thresholds_at_the_boundaries"] },
    { name: "entropy_short_threshold_for_all", pairs: [["const short = value.length <= ENTROPY_SHORT_MAX_LEN && /^[A-Za-z0-9]+$/.test(value);", "const short = value.length <= ENTROPY_SHORT_MAX_LEN;"]], hints: ["entropy_thresholds_at_the_boundaries"] },
    { name: "staged_scans_whole_tree", pairs: [["function collectStaged(root) {\n", "function collectStaged(root) {\n    return collectHead(root);\n"]], hints: ["staged_sees_only_added_lines"] },
    { name: "patch_removed_lines_scanned", pairs: [["if (prefix.includes(\"-\")) continue;", ""], ["if (/^\\++$/.test(prefix)) {", "if (true) {"]], hints: ["staged_sees_only_added_lines"] },
    { name: "merge_single_parent_lines_scanned", pairs: [["if (/^\\++$/.test(prefix)) {", "if (/\\+/.test(prefix)) {"]], hints: ["range_merge_lines_new_against_every_parent_only"] },
    { name: "no_newline_marker_ends_hunk", pairs: [["if (!raw.startsWith(\"\\\\\")) hunk = null;", "hunk = null;"]], hints: ["range_line_after_no_newline_marker"] },
    { name: "header_symmetric_split_off", pairs: [["if (Number.isInteger(half) && rest.startsWith(\"a/\") && rest.slice(2 + half, 5 + half) === \" b/\") return rest.slice(5 + half);", ""]], hints: ["range_name_with_space_b_slash"] },
    { name: "patch_cr_not_stripped", pairs: [["const text = raw.slice(hunk.parents).replace(/\\r$/, \"\");", "const text = raw.slice(hunk.parents);"]], hints: ["range_crlf_line_sha_matches_head_form"] },
    { name: "range_extension_skip_off", pairs: [["if (isBinaryPath(f.path)) units.push({ commit: f.commit, path: f.path, binary: \"extension\", lines: null });", "if (false) units.push({ commit: f.commit, path: f.path, binary: \"extension\", lines: null });"]], hints: ["range_binary_extension_skipped"] },
    { name: "range_messages_off", pairs: [["yield { commit: rec.slice(0, 40), path: COMMIT_MESSAGE_PATH", "if (false) yield { commit: rec.slice(0, 40), path: COMMIT_MESSAGE_PATH"]], hints: ["range_commit_message_scanned"] },
    { name: "message_control_byte_separator", pairs: [["for (const rec of msgs.split(\"\\0\")) {", "for (const rec of msgs.split(\"\\0\").map(x => x.split(\"\\x03\")[0])) {"]], hints: ["range_message_control_byte_not_a_separator"] }
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
