#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'profile_live_frames');

try { fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true }); } catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

function instrumentPlugin(filename, search, replace) {
    const p = path.join(SNAPSHOT_DIR, 'js', 'plugins', filename);
    let code = fs.readFileSync(p, 'utf8');
    if (!code.includes(search)) {
        console.error(`FAILED to find search target in ${filename}`);
        process.exit(1);
    }
    code = code.replace(search, replace);
    fs.writeFileSync(p, code, 'utf8');
}

// 1. Initialize timings in UF_Core.js
instrumentPlugin('UF_Core.js',
    '(() => {',
    '(() => { window.__TIMINGS__ = { Colonists_scan: [], Colonists_total: [], Jobs: [], Wildlife: [], Combat: [], Fire: [], Fog: [], Environment: [], CoreMapEvents: [] };'
);

// 2. UF_Colonists.js
instrumentPlugin('UF_Colonists.js',
    'function scan() {',
    `function scan() {
        const _scanT0 = performance.now();
        let _tBeforeLoop = 0, _tSimUnits = 0, _tJob0 = 0, _tInJob = 0, _tInDecide = 0;
        const _t0A = performance.now();`
);
instrumentPlugin('UF_Colonists.js',
    'let decideCount = 0;\n        const MAX_DECIDE_PER_SCAN = 12;\n        for (const u of simulationUnits()) {',
    `_tBeforeLoop = performance.now() - _t0A;
        let decideCount = 0;
        const MAX_DECIDE_PER_SCAN = 12;
        const _t0Sim = performance.now();
        const _simUnits = simulationUnits();
        _tSimUnits = performance.now() - _t0Sim;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.scan_before) window.__TIMINGS__.scan_before = [];
            window.__TIMINGS__.scan_before.push(_tBeforeLoop);
            if (!window.__TIMINGS__.scan_simUnits) window.__TIMINGS__.scan_simUnits = [];
            window.__TIMINGS__.scan_simUnits.push(_tSimUnits);
            window.__TIMINGS__.simUnits_len = [_simUnits.length];
            window.__TIMINGS__.simUnits_sameLevel = [_simUnits.filter(u => sameLevel(u, c)).length];
        }
        const _tLoop0 = performance.now();
        for (const u of _simUnits) {`
);
instrumentPlugin('UF_Colonists.js',
    'decisionAt.set(u.id, t);\n            }\n        }\n    }',
    `decisionAt.set(u.id, t);\n            }\n        }\n        if (window.__TIMINGS__) {\n            if (!window.__TIMINGS__.scan_loop) window.__TIMINGS__.scan_loop = [];\n            window.__TIMINGS__.scan_loop.push(performance.now() - _tLoop0);\n        }\n    }`
);
instrumentPlugin('UF_Colonists.js',
    'if (job) {',
    'if (job) { _tJob0 = performance.now();'
);
instrumentPlugin('UF_Colonists.js',
    'const lastDecide = decisionAt.get(u.id) || -Infinity;',
    `if (job && window.__TIMINGS__) {
                if (!window.__TIMINGS__.scan_jobBranch) window.__TIMINGS__.scan_jobBranch = [];
                window.__TIMINGS__.scan_jobBranch.push(performance.now() - _tJob0);
            }
            const lastDecide = decisionAt.get(u.id) || -Infinity;`
);
instrumentPlugin('UF_Colonists.js',
    'const res = decide(u);',
    `const _tDecide0 = performance.now();
                const res = decide(u);
                if (window.__TIMINGS__) {
                    if (!window.__TIMINGS__.scan_decideCall) window.__TIMINGS__.scan_decideCall = [];
                    window.__TIMINGS__.scan_decideCall.push(performance.now() - _tDecide0);
                }`
);
instrumentPlugin('UF_Colonists.js',
    'return designationJob(u) || planSpec || haulerStaging || footprintClearingJob(u) || constructionHaulingJob(u) || tidyStockpileJob(u) || tryMakeBed() || autonomousCallingJob(u) || autonomousFrontierProgression(u) || idleJob(u);',
    `const _t1 = performance.now();
        const j1 = designationJob(u);
        const dtDesig = performance.now() - _t1;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.desig) window.__TIMINGS__.desig = [];
            window.__TIMINGS__.desig.push(dtDesig);
        }
        if (j1) return j1;

        const _t2 = performance.now();
        const jPlan = planSpec;
        const dtPlan = performance.now() - _t2;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.plan) window.__TIMINGS__.plan = [];
            window.__TIMINGS__.plan.push(dtPlan);
        }
        if (jPlan) return jPlan;

        const _t3 = performance.now();
        const jTidy = tidyStockpileJob(u);
        const dtTidy = performance.now() - _t3;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.tidy) window.__TIMINGS__.tidy = [];
            window.__TIMINGS__.tidy.push(dtTidy);
        }
        if (jTidy) return jTidy;

        const _t4 = performance.now();
        const jFrontier = autonomousFrontierProgression(u);
        const dtFrontier = performance.now() - _t4;
        if (window.__TIMINGS__) {
            if (!window.__TIMINGS__.frontier) window.__TIMINGS__.frontier = [];
            window.__TIMINGS__.frontier.push(dtFrontier);
        }
        if (jFrontier) return jFrontier;

        return haulerStaging || footprintClearingJob(u) || constructionHaulingJob(u) || (unbeddedJob ? give(u, unbeddedJob) : null) || autonomousCallingJob(u) || idleJob(u);`
);

instrumentPlugin('UF_Colonists.js',
    'if (localTicks % SCAN_EVERY === 0) scan();',
    'if (localTicks % SCAN_EVERY === 0) { const _st0 = performance.now(); scan(); if (window.__TIMINGS__) window.__TIMINGS__.Colonists_scan.push(performance.now() - _st0); }'
);
instrumentPlugin('UF_Colonists.js',
    'localTicks++;\n\n        if (localTicks === 1 || localTicks % 300 === 0) ensureColonistsGeneticsAndAging();',
    'const _ct0 = performance.now(); localTicks++;\n\n        if (localTicks === 1 || localTicks % 300 === 0) ensureColonistsGeneticsAndAging();'
);
instrumentPlugin('UF_Colonists.js',
    'stepMerchantCaravan();\n            }\n        }\n    };',
    'stepMerchantCaravan();\n            }\n        }\n        if (window.__TIMINGS__) window.__TIMINGS__.Colonists_total.push(performance.now() - _ct0);\n    };'
);

// 3. UF_Jobs.js
instrumentPlugin('UF_Jobs.js',
    '_Game_Map_update.call(this, sceneActive); // UF_World moved the units first (its alias is below ours)\n        update();',
    '_Game_Map_update.call(this, sceneActive);\n        const _jt0 = performance.now();\n        update();\n        if (window.__TIMINGS__) window.__TIMINGS__.Jobs.push(performance.now() - _jt0);'
);

// 4. UF_Wildlife.js
instrumentPlugin('UF_Wildlife.js',
    '_Game_Map_update.call(this, sceneActive);\n        tick();',
    '_Game_Map_update.call(this, sceneActive);\n        const _wt0 = performance.now();\n        tick();\n        if (window.__TIMINGS__) window.__TIMINGS__.Wildlife.push(performance.now() - _wt0);'
);

// 5. UF_Combat.js
instrumentPlugin('UF_Combat.js',
    'const t0 = performance.now();\n        try {\n            step();\n        } catch (e) {\n            report("step", e);\n        }',
    'const t0 = performance.now();\n        try {\n            step();\n        } catch (e) {\n            report("step", e);\n        }\n        if (window.__TIMINGS__) window.__TIMINGS__.Combat.push(performance.now() - t0);'
);

// 6. UF_Fog.js
instrumentPlugin('UF_Fog.js',
    '_Game_Map_update.call(this, sceneActive);\n        if (++frame % UPDATE_FRAMES === 0) Fog.refresh();',
    '_Game_Map_update.call(this, sceneActive);\n        const _ft0 = performance.now();\n        if (++frame % UPDATE_FRAMES === 0) Fog.refresh();\n        if (window.__TIMINGS__) window.__TIMINGS__.Fog.push(performance.now() - _ft0);'
);

// 7. UF_Environment.js
instrumentPlugin('UF_Environment.js',
    'Game_Map.prototype.update = function(sceneActive) {\n        _Game_Map_update.call(this, sceneActive);\n        frameCount++;\n        updateEnvironment();\n    };',
    'Game_Map.prototype.update = function(sceneActive) {\n        _Game_Map_update.call(this, sceneActive);\n        const _et0 = performance.now();\n        frameCount++;\n        updateEnvironment();\n        if (window.__TIMINGS__) window.__TIMINGS__.Environment.push(performance.now() - _et0);\n    };'
);

const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const hookCode = `
        t.screenshot("map");

        // Advance 120 frames using t.waitFrames
        await t.waitFrames(120);

        const avg = arr => arr && arr.length ? (arr.reduce((a,b)=>a+b, 0) / arr.length).toFixed(2) : "0.00";
        const max = arr => arr && arr.length ? Math.max(...arr).toFixed(2) : "0.00";

        let lines = [];
        const tim = window.__TIMINGS__ || {};
        for (const k of Object.keys(tim)) {
            lines.push(k + ": avg=" + avg(tim[k]) + "ms, max=" + max(tim[k]) + "ms (calls=" + (tim[k] ? tim[k].length : 0) + ")");
        }

        const summary = lines.join(" | ");
        console.log("PROFILER_OUTPUT: " + summary);

        t.check("profiler_summary", true, summary);
`;

testCode = testCode.replace(targetHook, hookCode);
fs.writeFileSync(testJsPath, testCode, 'utf8');

console.log('Running profiler harness on snapshot...');
const nodePath = process.execPath;
try {
    const out = childProcess.execSync(`"${nodePath}" tools/run_tests.js smoke --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (e) {
    console.error('Test harness failed:', e.stdout || e.message);
    process.exit(1);
}
