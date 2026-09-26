// test_layer_render_flat.js - WG.00.09b Lane K: flat 1:1 layers (DEC-011) and the layer-switch lag fixes.
//
// Runs the in-engine suite "layers_flat" (registered by game/js/plugins/DEUS_Depth.js) on a disposable snapshot copy of
// game/ through tools/test_snapshot.js (the NW harness pattern), then reads the results file itself: every required check
// must be present and PASS, and the run must exit 0. A check that never ran counts as a failure.
//
// Every run gets its own snapshot folder (%TEMP%\uf_snapshots\lanek_<suite>_<pid>_<time>[_p_<check>]), printed and deleted
// afterwards (Fix 1, P2: two runs at the same time never share a snapshot or a results file). --keep leaves it in place.
//
// --provoke   also proves every required check can fail: for each one, a fresh snapshot run with
//             UF_TEST_PROVOKE=depth.<check>, which must FAIL that named check (a crash or a timeout does not count).
// --jobs n    run up to n provocations at the same time (default 1).
// --suite s   run another DEUS_Depth suite with the same machinery ("depth"); --provoke then uses that suite's list.
// --only a,b  limit the required checks (and provocations) to these names.
// --keep      keep the snapshot folders (screenshots, results.txt) for evidence.
//
// Usage: node tools/test_layer_render_flat.js [--provoke] [--jobs n] [--suite layers_flat|depth] [--only a,b] [--keep]
// Exit: 0 all required checks passed (and, with --provoke, every provocation failed its check); 1 a check failed or a
//       provocation was not caught; 2 harness problem (no results, no RESULT line, or the suite stopped on a HARNESS line:
//       a fixture that could not be built or a condition that timed out).
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };
const suite = opt("--suite", "layers_flat");
const provoke = args.includes("--provoke");
const keep = args.includes("--keep");
const jobs = Math.max(1, parseInt(opt("--jobs", "1"), 10) || 1);
const only = (opt("--only", "") || "").split(",").map(s => s.trim()).filter(Boolean);

// The checks each suite must pass, and the ones that have a provocation (UF_TEST_PROVOKE=depth.<name>) in DEUS_Depth.js.
const SUITES = {
    layers_flat: {
        required: ["preconditions", "fixtures", "flat_position", "flat_crisp", "unit_step_same_frame", "scan_candidates_only", "item_change_scoped", "every_view_sees_through", "flat_no_filters", "switch_same_frame", "screenshots_written", "no_errors"],
        provocable: ["flat_no_filters", "flat_position", "flat_crisp", "switch_same_frame", "unit_step_same_frame", "every_view_sees_through", "scan_candidates_only", "item_change_scoped"]
    },
    depth: {
        required: ["preconditions", "proof_scene", "planes_present", "repaint_cost", "projection_origin", "exposure_by_upper_geometry", "mask_order",
            "depth2_through_depth1", "entities_drawn", "crisp_nearest", "parallax_bounded", "tunables_take_effect", "no_filters_any_state", "one_level_below",
            "void_beyond", "no_blends", "flat_transform", "entities_inherit_treatment", "visual_settings_no_physics", "config_deterministic", "planes_cost",
            "screenshots_written", "ground_draws_through_openings", "entities_at_seam", "canvases_freed", "hotkey_free", "no_errors"],
        provocable: ["planes_present", "projection_origin", "exposure_by_upper_geometry", "mask_order", "depth2_through_depth1", "entities_drawn", "crisp_nearest",
            "parallax_bounded", "no_filters_any_state", "void_beyond", "no_blends", "flat_transform", "entities_inherit_treatment", "ground_draws_through_openings",
            "entities_at_seam", "canvases_freed"]
    }
};
const spec = SUITES[suite];
if (!spec) { console.error(`HARNESS: unknown suite "${suite}" (known: ${Object.keys(SUITES).join(", ")})`); process.exit(2); }
const required = only.length ? spec.required.filter(n => only.includes(n) || n === "preconditions") : spec.required;
const provocable = only.length ? spec.provocable.filter(n => only.includes(n)) : spec.provocable;
const runId = `${process.pid}_${Date.now()}`;

/** Delete a snapshot folder. Its asset folders are junctions to the real game/ folders: unlink them, never recurse into them. */
function removeSnapshot(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isSymbolicLink() || fs.lstatSync(p).isSymbolicLink()) fs.unlinkSync(p);
        else fs.rmSync(p, { recursive: true, force: true });
    }
    fs.rmdirSync(dir);
}

/** One snapshot run of the suite; resolves { status, lines: Map(check -> { pass, detail }), result, harness: [..], dir, ms }. */
function runOnce(label, provocation) {
    const env = Object.assign({}, process.env);
    if (provocation) env.UF_TEST_PROVOKE = `depth.${provocation}`; else delete env.UF_TEST_PROVOKE;
    const dir = path.join(os.tmpdir(), "uf_snapshots", `lanek_${suite}_${runId}${label}`);
    const t0 = Date.now();
    return new Promise(resolve => {
        const child = spawn(process.execPath, [path.join(__dirname, "test_snapshot.js"), "--name", path.basename(dir), "--plugins", "DEUS_Depth", "--suite", suite, "--dir", dir],
            { env, stdio: ["ignore", "pipe", "pipe"] });
        let stderr = "";
        child.stdout.on("data", () => {});
        child.stderr.on("data", d => { stderr += d; if (stderr.length > 1e6) stderr = stderr.slice(-1e5); });
        child.on("exit", status => {
            const ms = Date.now() - t0;
            const file = path.join(dir, "test_output", "results.txt");
            const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
            const lines = new Map();
            for (const m of text.matchAll(new RegExp(`^(PASS|FAIL) ${suite}\\.(\\w+)(?: - (.*))?$`, "gm"))) lines.set(m[2], { pass: m[1] === "PASS", detail: m[3] || "" });
            const res = text.match(/^RESULT: (\d+) passed, (\d+) failed \(exit (\d)\)$/m);
            // A HARNESS line or a suite that stopped (DEUS_Test's suite_completed FAIL) is a harness problem, not a check result.
            const harness = [...text.matchAll(/^HARNESS (.*)$/gm)].map(m => m[1]);
            const stopped = lines.get("suite_completed");
            if (stopped && !stopped.pass && !harness.length) harness.push(`the suite stopped: ${stopped.detail}`);
            let removed = false;
            if (!keep) { try { removeSnapshot(dir); removed = true; } catch (e) { stderr += `\ncould not remove ${dir}: ${e.message}`; } }
            resolve({ status, lines, result: res ? res[0] : null, exit: res ? Number(res[3]) : null, harness, dir, removed, ms, text, stderr });
        });
    });
}

(async () => {
    let bad = 0, harness = 0;
    console.log(`=== DEUS_Depth suite "${suite}" (WG.00.09b Lane K) ===`);
    const base = await runOnce("", null);
    console.log(`run: ${base.result || "NO RESULT LINE"} in ${(base.ms / 1000).toFixed(1)} s (snapshot exit ${base.status}); snapshot ${base.dir}${base.removed ? " (deleted)" : ""}`);
    for (const line of base.text.split(/\r?\n/)) if (/^(PASS|FAIL|ERROR|HARNESS|SHOT)/.test(line)) console.log(`  ${line}`);
    if (!base.result) { harness++; console.error("HARNESS: the run produced no RESULT line"); if (base.stderr) console.error(base.stderr.slice(-2000)); }
    for (const h of base.harness) { harness++; console.log(`HARNESS: ${h}`); }
    for (const name of required) {
        const l = base.lines.get(name);
        if (!l) { bad++; console.log(`MISSING ${suite}.${name} (the check never ran)`); }
        else if (!l.pass) bad++;
    }
    if (base.exit !== 0 && !base.harness.length) bad++;
    console.log(`required checks: ${required.length - required.filter(n => !base.lines.get(n) || !base.lines.get(n).pass).length}/${required.length} PASS`);

    if (provoke) {
        console.log(`\n=== provocations (each must FAIL its own check; ${jobs} at a time) ===`);
        const queue = provocable.slice(), results = new Map();
        const worker = async () => { while (queue.length) { const name = queue.shift(); results.set(name, await runOnce(`_p_${name}`, name)); } };
        await Promise.all(Array.from({ length: Math.min(jobs, provocable.length) }, worker));
        for (const name of provocable) {
            const p = results.get(name), l = p.lines.get(name);
            const caught = !!l && !l.pass;
            if (!p.result) { harness++; console.log(`  (no RESULT line; run_tests said: ${(p.stderr || "").trim().split(String.fromCharCode(10)).slice(-3).join(" | ") || "nothing"})`); }
            if (!caught) bad++;
            console.log(`${caught ? "CAUGHT" : "NOT CAUGHT"} depth.${name}: ${l ? `${l.pass ? "PASS" : "FAIL"} ${suite}.${name} - ${l.detail}` : "the check did not run"} [${p.result || "no RESULT line"}${p.harness.length ? `; HARNESS ${p.harness.join(" | ")}` : ""}, ${(p.ms / 1000).toFixed(1)} s]`);
        }
    }

    const code = harness ? 2 : bad ? 1 : 0;
    console.log(`\nRESULT: ${bad === 0 && harness === 0 ? "all required checks passed" : `${bad} problem(s), ${harness} harness problem(s)`}${provoke ? `, ${provocable.length} provocation(s) run` : ""} (exit ${code})`);
    process.exit(code);
})();
