#!/usr/bin/env node
"use strict";
/**
 * tools/zrange/run_gates.js (WG.00.17, lane AA): runs the lane's gate commands (tasks/WG.00.17/lane-aa/lane.json
 * gateTests: the read-only gate tools, unchanged) on a commit, each run in its own fresh throwaway clone under %TEMP%
 * (tools/zrange/clone.js; nothing runs in the worktree), at a Z range, and keeps every run's raw output with its exit
 * code. Each clone is deleted after its run.
 *
 * Usage: node tools/zrange/run_gates.js [--commit=<rev>] [--z-range=default|<zMin>..<zMax>] [--gates=a,b] [--repeat=n]
 *                                       [--provoke] [--evidence=<dir>]
 *   --z-range   DEUS_Z_RANGE for the gates; "default" (the default) leaves it unset: the game's default range
 *   --gates     names below, comma separated (default: layers_flat,depth,minimap,switch,syntax,palette)
 *   --repeat    runs of each gate, each in a fresh clone (default 1)
 *   --provoke   the gates' own provocation modes instead: layers_flat and depth --provoke --jobs 3, switch --mutants,
 *               zrange --provoke-all (minimap, syntax and palette have none and are skipped)
 *   --evidence  each run's output goes to <dir>/<sha8>_<gate>_z<range>[_provoke][_run<k>].log, "EXIT=<code>" last
 * Gates: layers_flat  node tools/test_layer_render_flat.js          depth    node tools/test_layer_render_flat.js --suite depth
 *        minimap      node tools/test_minimap.js                    switch   node tools/test_layer_switch_inplace.js
 *        syntax       node tools/check_deus_syntax.js               palette  node tools/test_palette.js
 *        zrange       node tools/test_zrange.js (it sets its own ranges; DEUS_Z_RANGE is not passed)
 * Prints one line per run (gate, range, run, EXIT, other nw.exe at its start, the tool's result lines); exit 0 when
 * every run exited 0, 1 otherwise, 2 harness problem.
 */
const fs = require("fs");
const path = require("path");
const { spawn, execFileSync } = require("child_process");
const { makeClone, removeTree } = require("./clone.js");

const ROOT = path.resolve(__dirname, "..", "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => { const a = args.find(x => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : fallback; };
const flag = name => args.includes(`--${name}`);
const RANGE = arg("z-range", "default");
const REPEAT = Math.max(1, Number(arg("repeat", "1")) | 0);
const PROVOKE = flag("provoke");
const EVIDENCE = arg("evidence", "") ? path.resolve(arg("evidence", "")) : "";

// seconds: lane.json's timeouts; a provocation mode gets three times as long (at least an hour)
const GATES = {
    layers_flat: { cmd: ["tools/test_layer_render_flat.js"], provoke: ["--provoke", "--jobs", "3"], timeout: 900 },
    depth: { cmd: ["tools/test_layer_render_flat.js", "--suite", "depth"], provoke: ["--provoke", "--jobs", "3"], timeout: 900 },
    minimap: { cmd: ["tools/test_minimap.js"], timeout: 300 },
    switch: { cmd: ["tools/test_layer_switch_inplace.js"], provoke: ["--mutants"], timeout: 900 },
    syntax: { cmd: ["tools/check_deus_syntax.js"], timeout: 600, anyRange: true },
    palette: { cmd: ["tools/test_palette.js"], timeout: 300, anyRange: true },
    zrange: { cmd: ["tools/test_zrange.js"], provoke: ["--provoke-all"], timeout: 1800, anyRange: true, ownRanges: true }
};
const NAMES = arg("gates", "layers_flat,depth,minimap,switch,syntax,palette").split(",").map(s => s.trim()).filter(Boolean);
const RESULT_LINE = /^(run: RESULT|RESULT|required checks|Checked \d+ DEUS|Palette|PROVOCATIONS|SUMMARY|MUTANTS|CAUGHT|NOT CAUGHT|MUTANT |HARNESS)/;

function git(a, cwd) { return execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: Object.assign({}, process.env, { MSYS_NO_PATHCONV: "1" }) }).trim(); }
/** The nw.exe processes running now (tasklist; the count only). */
function nwCount() {
    try { return execFileSync("tasklist", ["/FI", "IMAGENAME eq nw.exe", "/FO", "CSV", "/NH"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split(/\r?\n/).filter(l => /^"nw\.exe"/i.test(l)).length; } catch (_) { return null; }
}
function run(clone, argv, env, timeoutSec) {
    return new Promise(resolve => {
        const t0 = Date.now();
        const child = spawn(process.execPath, argv, { cwd: clone, env, stdio: ["ignore", "pipe", "pipe"] });
        let out = "";
        child.stdout.on("data", d => { out += d; });
        child.stderr.on("data", d => { out += d; });
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; try { child.kill(); } catch (_) { /* gone */ } }, timeoutSec * 1000);
        child.on("exit", status => { clearTimeout(timer); resolve({ status, out, timedOut, secs: ((Date.now() - t0) / 1000).toFixed(0) }); });
    });
}

(async () => {
    let failed = 0, harness = 0;
    try {
        for (const n of NAMES) if (!GATES[n]) { console.error(`unknown gate ${n}; known: ${Object.keys(GATES).join(", ")}`); process.exit(2); }
        const sha = git(["rev-parse", arg("commit", "HEAD")], ROOT), sha8 = sha.slice(0, 8);
        console.log(`=== WG.00.17 gates on ${sha}, DEUS_Z_RANGE ${RANGE === "default" ? "unset (the default range)" : RANGE}${PROVOKE ? ", provocation modes" : ""}, ${REPEAT} run(s) each, a fresh clone per run ===`);
        for (const name of NAMES) {
            const g = GATES[name];
            if (PROVOKE && !g.provoke) { console.log(`${name}: no provocation mode (skipped)`); continue; }
            for (let k = 1; k <= REPEAT; k++) {
                const cloneName = `gates_${sha8}_${name}_${process.pid}_${k}`;
                let clone = null;
                try { clone = makeClone(sha, cloneName).dir; } catch (e) { harness++; console.log(`${name} run ${k}: HARNESS clone failed: ${e.message}`); continue; }
                const env = Object.assign({}, process.env);
                delete env.UF_TEST_PROVOKE;
                if (RANGE === "default" || g.ownRanges) delete env.DEUS_Z_RANGE; else env.DEUS_Z_RANGE = RANGE;
                const argv = [path.join(clone, ...g.cmd[0].split("/")), ...g.cmd.slice(1), ...(PROVOKE ? g.provoke : [])];
                const nw0 = nwCount();
                const r = await run(clone, argv, env, PROVOKE ? Math.max(3600, 3 * g.timeout) : g.timeout);
                const rangeTag = g.anyRange ? "any" : RANGE;
                const header = `# ${sha} ${name} (${["node", ...g.cmd, ...(PROVOKE ? g.provoke : [])].join(" ")}), DEUS_Z_RANGE ${g.ownRanges ? "(not passed: the tool sets its own)" : RANGE === "default" ? "unset" : RANGE}, run ${k} of ${REPEAT}, clone ${clone}, ${nw0} nw.exe running at the start, ${r.secs} s${r.timedOut ? ", KILLED at the timeout" : ""}\n`;
                if (EVIDENCE) {
                    fs.mkdirSync(EVIDENCE, { recursive: true });
                    fs.writeFileSync(path.join(EVIDENCE, `${sha8}_${name}_z${rangeTag}${PROVOKE ? "_provoke" : ""}${REPEAT > 1 ? `_run${k}` : ""}.log`), `${header}${r.out}\nEXIT=${r.status}\n`);
                }
                if (r.status !== 0) failed++;
                const lines = r.out.split(/\r?\n/).filter(l => RESULT_LINE.test(l.trim())).map(l => l.trim().slice(0, 240));
                const keep = PROVOKE ? lines : lines.filter(l => !/^(CAUGHT|NOT CAUGHT|MUTANT )/.test(l));
                console.log(`${name} z${rangeTag}${REPEAT > 1 ? ` run ${k}` : ""}: EXIT=${r.status} (${r.secs} s, ${nw0} nw.exe at the start${r.timedOut ? ", KILLED at the timeout" : ""})`);
                for (const l of keep) console.log(`    ${l}`);
                try { removeTree(clone); } catch (e) { console.log(`    (could not delete ${clone}: ${e.message})`); }
            }
        }
    } catch (e) {
        console.error(`HARNESS: ${e.stack || e.message}`);
        harness++;
    }
    console.log(`RESULT: ${failed} run(s) with a non-zero exit${harness ? `, ${harness} harness problem(s)` : ""} (exit ${harness ? 2 : failed ? 1 : 0})`);
    process.exit(harness ? 2 : failed ? 1 : 0);
})();
