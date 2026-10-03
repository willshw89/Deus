// Negative proof of the runner's retain mode without NW.js: a disposable fake game folder whose plugins.js registers
// DEUS_Test and whose test_output already holds a stale "RESULT: 999 passed, 0 failed (exit 0)" and a stale PNG.
// Expected: tools/run_tests.js with DEUS_TEST_RETAIN=1 exits 2 before launching anything, names the refusal on stderr,
// and leaves both stale files byte-identical. Also checked: the same fixture with --retain on the command line, and that
// no nw.exe appeared. Nothing is deleted or moved by this script; the fixture folder is unique per invocation.
// Usage: node retain_proof.js <lane root> <evidence dir>
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { spawnSync } = require("child_process");
const [root, evidenceDir] = process.argv.slice(2).map(p => path.resolve(p));
const stamp = `${Date.now()}_${process.pid}`;
const fixture = path.join(root, "scratchpad", "org-0.2", `retain_fixture_${stamp}`, "game");
fs.mkdirSync(path.join(fixture, "js"), { recursive: true });
fs.mkdirSync(path.join(fixture, "test_output"), { recursive: true });
fs.writeFileSync(path.join(fixture, "js", "plugins.js"), '// fixture\nvar $plugins = [\n{"name": "DEUS_Test", "status": true, "description": "fixture", "parameters": {}}\n];\n');
const staleResults = path.join(fixture, "test_output", "results.txt");
const stalePng = path.join(fixture, "test_output", "smoke.map.png");
fs.writeFileSync(staleResults, "UF_Test run 2026-01-01T00:00:00.000Z args=[]\nSUITE smoke\nPASS smoke.fake\nRESULT: 999 passed, 0 failed (exit 0)\n");
fs.writeFileSync(stalePng, Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"));
const sha = f => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const before = { results: sha(staleResults), png: sha(stalePng) };
const nwCount = () => { const r = spawnSync("tasklist", [], { encoding: "utf8" }); return (r.stdout.match(/^nw\.exe/gim) || []).length; };
const lines = [];
const log = s => { lines.push(s); console.log(s); };
log(`retain proof ${new Date().toISOString()} fixture ${fixture}`);
log(`stale results sha256 ${before.results}; stale png sha256 ${before.png}; nw.exe before: ${nwCount()}`);
const runner = path.join(root, "tools", "run_tests.js");
const cases = [
    { name: "env DEUS_TEST_RETAIN=1", args: [runner, "--game", fixture], env: Object.assign({}, process.env, { DEUS_TEST_RETAIN: "1" }) },
    { name: "cli --retain", args: [runner, "--retain", "--game", fixture], env: Object.assign({}, process.env, { DEUS_TEST_RETAIN: "" }) }
];
let ok = true;
for (const c of cases) {
    const r = spawnSync(process.execPath, c.args, { encoding: "utf8", env: c.env, cwd: root, timeout: 60000 });
    const after = { results: sha(staleResults), png: sha(stalePng) };
    const refused = /retain mode refuses/.test(r.stderr);
    const untouched = after.results === before.results && after.png === before.png && fs.existsSync(staleResults) && fs.existsSync(stalePng);
    const pass = r.status === 2 && refused && untouched && !/^Running /m.test(r.stdout);
    ok = ok && pass;
    log(`${pass ? "PASS" : "FAIL"} ${c.name}: exit ${r.status} (want 2); refused ${refused}; stale files untouched ${untouched}; launched ${/^Running /m.test(r.stdout)} (want false); nw.exe now ${nwCount()}`);
    log(`  stderr: ${r.stderr.trim().split(/\r?\n/).join(" | ")}`);
    log(`  stdout: ${JSON.stringify(r.stdout.trim())}`);
}
// Control: the legacy default mode would delete the stale results file, so it is NOT run here (no deletes).
log(`control not run: default mode (no DEUS_TEST_RETAIN) would remove the stale results.txt, which the no-delete rule forbids`);
log(ok ? "RETAIN PROOF: PASS (both forms refused the reused output, exit 2, nothing deleted, nothing launched)" : "RETAIN PROOF: FAIL");
fs.mkdirSync(evidenceDir, { recursive: true });
fs.writeFileSync(path.join(evidenceDir, "R1_retain_proof.txt"), lines.join("\n") + "\n");
process.exit(ok ? 0 : 1);
