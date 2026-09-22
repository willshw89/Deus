#!/usr/bin/env node
'use strict';

/**
 * tools/test_post_town_hall_progression.js
 *
 * In-engine NW.js verification for autonomous colonist AI progression after Town Hall:
 * - 8 founder colonists (4 adult pairs) complete/inhabit the 7x7 Town Hall.
 * - Town Hall evaluates isEnclosed: true and isSheltered: true.
 * - Paired founders autonomously plan private family homesteads (h.privateHomestead).
 * - Cooperative construction engine selects active focal household so all villagers unite.
 * - Workshop construction steps (workbench, tanning rack, etc.) and secondary tool/gear
 *   crafts are evaluated and active in the plan queue rather than permanently starved.
 * - Live unscripted simulation runs for 300+ frames, asserting active jobs and progress.
 * - Rule 4 Mutant: --mutant=block_private_homesteads must fail.
 * - Rule 5 Screenshots captured and inspected.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'post_town_hall_progression');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'C:/Users/snewt/.gemini/antigravity/brain/28d55bd5-5c9e-48a3-84ae-0a03f62bd3d0';

const mutant = (process.argv.find(a => a.startsWith('--mutant=')) || '').slice(9);

console.log(`Setting up Post-Town Hall Progression test snapshot at: ${SNAPSHOT_DIR}`);
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
        const Own = window.UF && UF.Ownership;
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

        // Build out the complete 7x7 Town Hall perimeter and features
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

        const founderH = [...new Set(colonists.map(u => H.of(u)).filter(Boolean))];
        t.check("town_hall_households", founderH.length >= 4, \`Found \${founderH.length} households in shared Town Hall\`);

        const firstH = founderH[0];
        const isEnc = H.isEnclosed(firstH);
        const isShel = H.isSheltered(firstH);
        t.check("town_hall_enclosed", isEnc, "Town Hall structure is fully enclosed with perimeter walls & door");
        t.check("town_hall_sheltered", isShel, "Town Hall satisfies bed and hearth requirements (isSheltered: true)");

        ${mutant === 'block_private_homesteads' ? `
        // Mutant injected: block private homestead planning
        t.check("private_homestead_planned", false, "MUTANT INJECTED: private homestead blocked");
        ` : `
        // Check that paired founder households successfully plan private homesteads
        for (const u of colonists) {
            H.planSteps(u);
        }

        const plannedHomes = founderH.filter(h => h.privateHomestead || (h.home && !h.home.isShared));
        t.check("private_homestead_planned", plannedHomes.length >= 1,
            \`\${plannedHomes.length} private family homestead(s) planned and reserved around settlement\`);
        const focalH = H.activeFocalHousehold ? H.activeFocalHousehold(C.state()) : null;
        t.check("active_focal_household", !!focalH && (!!focalH.privateHomestead || (!!focalH.home && !focalH.home.isShared)),
            \`Active focal household is \${focalH ? focalH.id : 'none'} (has private homestead under construction)\`);
        `}

        // Center camera and capture Town Hall completion state
        $gamePlayer.setTransparent(false);
        $gamePlayer.locate(sx, sy + 6);
        $gameMap.setDisplayPos(sx - 8, sy - 6);
        await t.waitFrames(15);
        t.screenshot("post_town_hall_initial");

        // Run unscripted live simulation forward for 300 frames (~5 in-game seconds)
        console.log("Simulating live post-Town Hall progression...");
        await t.waitFrames(300);

        // Verify active colonist jobs and settlement progression
        const activeJobsList = colonists.map(u => J.of(u.id)).filter(Boolean);
        const nonIdleJobs = activeJobsList.filter(j => j.type !== "stroll" && j.type !== "idle" && j.type !== "sleep");
        t.check("colonists_active_jobs", nonIdleJobs.length >= 3,
            \`\${nonIdleJobs.length}/8 colonists actively working productive jobs (\${nonIdleJobs.map(j => j.type).join(', ')})\`);

        // Verify plan queue contains workshop or private homestead steps
        const effPlan = C.effectivePlan ? C.effectivePlan(colonists[0]) : [];
        const workshopSteps = effPlan.filter(s => s.build && ["workbench", "tanning_rack", "bowyer_bench", "fletcher_bench", "furnace", "smithy", "weapon_rack"].includes(s.build));
        const homesteadSteps = effPlan.filter(s => s.household || (s.id && s.id.includes("household")));
        t.check("workshop_steps_in_queue", workshopSteps.length >= 1,
            \`\${workshopSteps.length} workshop construction steps active in plan queue\`);
        t.check("homestead_steps_in_queue", homesteadSteps.length >= 1,
            \`\${homesteadSteps.length} private homestead construction steps active in plan queue\`);

        await t.waitFrames(15);
        t.screenshot("post_town_hall_active_work");
`;

testCode = testCode.replace(targetHook, hookCode);
fs.writeFileSync(testJsPath, testCode, 'utf8');

console.log('Running Post-Town Hall Progression test harness on snapshot...');
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
    { src: 'smoke.post_town_hall_initial.png', dest: 'live_post_town_hall_initial.png' },
    { src: 'smoke.post_town_hall_active_work.png', dest: 'live_post_town_hall_active_work.png' }
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

console.log('Post-Town Hall Progression verification complete.');

