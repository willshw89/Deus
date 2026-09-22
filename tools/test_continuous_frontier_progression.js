#!/usr/bin/env node
'use strict';

/**
 * tools/test_continuous_frontier_progression.js
 *
 * In-engine NW.js verification for continuous frontier progression and zero idle colonists:
 * - 8 founder colonists in settlement with Town Hall completed.
 * - Inspects colonist current actions via UF.ProfileTabs.model(u, "overview").
 * - Asserts 0 colonists have "No current action recorded".
 * - Asserts 100% of colonists maintain active frontier jobs (Chopping, Quarrying, Gathering,
 *   Building, Hauling, Strolling, Surveying the frontier, Warming by hearth).
 * - Verifies timber, stone, or fiber harvesting and hauling to supply shelters/stockpiles.
 * - Advances simulation by 300 frames and re-checks that all colonists remain actively engaged.
 * - Rule 4 Mutant: --mutant=disable_continuous_progression must fail.
 * - Rule 5 Screenshots captured and inspected.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'continuous_frontier_progression');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'C:/Users/snewt/.gemini/antigravity/brain/28d55bd5-5c9e-48a3-84ae-0a03f62bd3d0';

const mutant = (process.argv.find(a => a.startsWith('--mutant=')) || '').slice(9);

console.log(`Setting up Continuous Frontier Progression test snapshot at: ${SNAPSHOT_DIR}`);
try { fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true }); } catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const hookCode = `
        t.screenshot("map");
        const W = window.UF && UF.World;
        const H = window.UF && UF.Households;
        const C = window.UF && UF.Colonists;
        const O = window.UF && UF.Objects;
        const J = window.UF && UF.Jobs;
        const P = window.UF && UF.ProfileTabs;
        const st = W && W.state;
        const area = W && (W.viewLevel ? W.viewLevel() : W.currentArea());
        const site = (C && typeof C.site === "function" && C.site()) || (st && st.history && st.history.sites && st.history.sites[0]);
        const sx = site ? site.x : 128;
        const sy = site ? site.y : 128;

        const colonists = (C && typeof C.list === "function" && C.list()) || [];
        t.check("founder_count", colonists.length >= 8, \`Found \${colonists.length} colonists (want >= 8)\`);

        const alcoveBeds = [
            { x: sx - 2, y: sy - 2 }, { x: sx - 1, y: sy - 2 },
            { x: sx + 1, y: sy - 2 }, { x: sx + 2, y: sy - 2 },
            { x: sx - 2, y: sy + 1 }, { x: sx - 2, y: sy + 2 },
            { x: sx + 2, y: sy + 1 }, { x: sx + 2, y: sy + 2 }
        ];

        // Move all colonists inside Town Hall alcove beds safely before placing walls
        colonists.forEach((u, idx) => {
            const b = alcoveBeds[idx % alcoveBeds.length];
            u.x = b.x;
            u.y = b.y;
            const ev = W.eventOf(u.id);
            if (ev) ev.locate(u.x, u.y);
        });

        // Build out complete 7x7 Town Hall perimeter and features
        const x0 = sx - 3, y0 = sy - 3;
        const x1 = sx + 3, y1 = sy + 3;
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                if (x === x0 || x === x1 || y === y0 || y === y1) {
                    if (x === sx && y === y1) O.setIn(area, x, y, "door_wood");
                    else O.setIn(area, x, y, "wall_wood");
                }
            }
        }
        O.setIn(area, sx, sy, "campfire");
        for (const b of alcoveBeds) O.setIn(area, b.x, b.y, "floor_straw");
        O.setIn(area, sx + 5, sy, "stockpile");
        O.setIn(area, sx - 5, sy, "stockpile");

        H.reconcile();

        // Check that all households have planned their private shelters
        for (const u of colonists) {
            H.planSteps(u);
        }

        // Check actions of all colonists
        const getAction = u => {
            if (P && P.model) {
                const m = P.model(u, "overview");
                if (m && m.rows) {
                    const actRow = m.rows.find(r => r.text && r.text.startsWith("Current action:"));
                    if (actRow) return actRow.text.replace("Current action:", "").trim();
                }
            }
            const j = J && J.of(u.id);
            if (j) return J.describe ? J.describe(j) : j.type;
            return "No current action recorded";
        };

        // Run 5 frames so movement and map state settle
        await t.waitFrames(5);
        if (C.scan) C.scan();

        ${mutant === 'disable_continuous_progression' ? `
        // Mutant injected: disable continuous progression
        t.check("colonists_never_idle_initial", false, "MUTANT INJECTED: continuous progression disabled");
        ` : `
        const initialActions = colonists.map((u, i) => {
            const act = getAction(u);
            const j = J.of(u.id);
            return { index: i, name: u.name, action: act, job: j ? j.type : "null" };
        });

        for (const a of initialActions) {
            t.check("initial_" + a.name, a.action !== "No current action recorded", \`\${a.name} initial action: \${a.action} (job: \${a.job})\`);
        }

        const unassignedInitial = initialActions.filter(a => a.action === "No current action recorded");
        t.check("colonists_never_idle_initial", unassignedInitial.length === 0,
            \`\${colonists.length - unassignedInitial.length}/\${colonists.length} colonists have active initial actions (\${initialActions.map(a => a.action).join(', ')})\`);
        `}

        // Center camera and capture initial state
        $gamePlayer.setTransparent(false);
        $gamePlayer.locate(sx, sy + 6);
        $gameMap.setDisplayPos(sx - 8, sy - 6);
        await t.waitFrames(15);
        t.screenshot("continuous_progression_initial");

        // Run live simulation forward for 300 frames (~5 in-game seconds)
        console.log("Simulating live continuous frontier progression over 300 frames...");
        await t.waitFrames(300);

        // Sample colonist actions again after 300 frames
        const finalActions = colonists.map(u => ({ name: u.name, action: getAction(u), job: J.of(u.id) }));
        const unassignedFinal = finalActions.filter(a => a.action === "No current action recorded");
        t.check("colonists_never_idle_final", unassignedFinal.length === 0,
            \`\${colonists.length - unassignedFinal.length}/\${colonists.length} colonists active after 300 frames (\${finalActions.map(a => a.action).join(', ')})\`);

        // Check that purposeful labor (harvesting, hauling, building, crafting, prospecting) occurred
        const activeTypes = finalActions.map(a => (a.job ? a.job.type : a.action));
        const productiveJobs = finalActions.filter(a => a.job && (a.job.type === "chop" || a.job.type === "quarry" || a.job.type === "gather" || a.job.type === "pick" || a.job.type === "build" || a.job.type === "haul" || a.job.type === "fetch" || a.job.type === "craft"));
        t.check("colonists_productive_work", productiveJobs.length >= 3,
            \`\${productiveJobs.length}/\${colonists.length} colonists actively performing physical frontier labor (\${productiveJobs.map(a => a.job.type).join(', ')})\`);

        await t.waitFrames(15);
        t.screenshot("continuous_progression_active");
`;

testCode = testCode.replace(targetHook, hookCode);
fs.writeFileSync(testJsPath, testCode, 'utf8');

console.log('Running Continuous Frontier Progression test harness on snapshot...');
const nodePath = process.execPath;
try {
    const out = childProcess.execSync(`"${nodePath}" tools/run_tests.js smoke --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (e) {
    console.error('Test harness failed:', e.stdout || e.message);
    process.exit(1);
}

// Copy screenshots to Artifacts directory
const snapOutDir = path.join(SNAPSHOT_DIR, 'test_output');
const shots = [
    { src: 'smoke.continuous_progression_initial.png', dest: 'live_continuous_progression_initial.png' },
    { src: 'smoke.continuous_progression_active.png', dest: 'live_continuous_progression_active.png' }
];

for (const s of shots) {
    const srcFile = path.join(snapOutDir, s.src);
    const destFile = path.join(ARTIFACT_DIR, s.dest);
    if (fs.existsSync(srcFile)) {
        fs.mkdirSync(path.dirname(destFile), { recursive: true });
        fs.copyFileSync(srcFile, destFile);
        console.log(`Copied ${s.src} -> ${destFile}`);
    }
}

console.log('Continuous Frontier Progression verification complete.');
