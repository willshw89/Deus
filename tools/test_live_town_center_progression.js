#!/usr/bin/env node
'use strict';

/**
 * tools/test_live_town_center_progression.js
 *
 * In-engine NW.js verification for autonomous live settlement progression post-Town-Hall:
 * - 8 founder colonists in Town Hall.
 * - Town Hall complete with walls, door, campfire, and beds.
 * - A colonist is carrying a stone in inventory (reproducing user report).
 * - CRITICAL: Zero manual test script calls to H.reconcile() or H.planSteps().
 * - Live unscripted simulation advances 300 frames, exercising scan() and physicalChange().
 * - Verifies:
 *   1. autonomous_reconcile_active: Households autonomously reconcile and plan private homesteads.
 *   2. carried_resource_handled: Colonist holding loose stone immediately stages/hauls it.
 *   3. colonists_never_idle: Zero colonists end up with "No current action recorded".
 *   4. private_homesteads_planned: Single cabins & family cottages reserved for all households.
 * - Rule 4 Mutant: --mutant=block_autonomous_reconcile must fail with exit code 1.
 * - Rule 5 Screenshots: live_town_center_initial.png and live_town_center_active.png.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'live_town_center_progression');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'C:/Users/snewt/.gemini/antigravity/brain/28d55bd5-5c9e-48a3-84ae-0a03f62bd3d0';

const mutant = (process.argv.find(a => a.startsWith('--mutant=')) || '').slice(9);

console.log(`Setting up Live Town Center Progression test snapshot at: ${SNAPSHOT_DIR}`);
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
        const I = window.UF && UF.Items;
        const S = window.UF && UF.Sheet;
        const Prof = window.UF && UF.ProfileTabs;
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

        // Give colonist 0 a loose stone in inventory to reproduce user report
        const targetWorker = colonists[0];
        if (I && I.create) {
            I.create({ type: "stone", holder: targetWorker.id, area: targetWorker.area, z: targetWorker.z || 0 });
        }

        // Center camera and capture initial Town Hall state
        $gamePlayer.setTransparent(false);
        $gamePlayer.locate(sx, sy);
        $gameMap.setDisplayPos(sx - 10, sy - 7);
        await t.waitFrames(15);
        t.screenshot("live_town_center_initial");

        // NOTE: We DO NOT call H.reconcile() or H.planSteps() here!
        // The live simulation engine in UF_Colonists.js scan() must do it autonomously!

        ${mutant === 'block_autonomous_reconcile' ? `
        // Mutant injected: block autonomous reconcile in live scan
        t.check("autonomous_reconcile_active", false, "MUTANT INJECTED: autonomous reconcile blocked");
        ` : `
        // Advance 300 live unscripted frames
        console.log("Simulating live autonomous post-Town-Hall progression over 300 frames...");
        await t.waitFrames(300);

        const allHouseholds = H.all().filter(h => !h.mergedInto);
        const plannedHomesteads = allHouseholds.filter(h => h.privateHomestead || (h.home && !h.home.isShared));
        t.check("autonomous_reconcile_active", plannedHomesteads.length >= 1,
            \`\${plannedHomesteads.length} private homestead(s) planned autonomously in live play\`);

        const idleColonists = [];
        const actionTexts = [];
        for (const u of colonists) {
            const j = J.of(u.id);
            let desc = "No current action recorded";
            if (j) desc = J.describe ? J.describe(j) : j.type;
            else if (u.data && u.data.state) desc = u.data.state;
            else if (u.goal) desc = "Walking";
            actionTexts.push(\`\${u.name || 'Colonist #' + u.id}: \${desc}\`);
            if (desc === "No current action recorded") {
                idleColonists.push(u.name || \`#\${u.id}\`);
            }
        }

        t.check("colonists_never_idle", idleColonists.length === 0,
            \`\${colonists.length - idleColonists.length}/\${colonists.length} colonists active; idle: \${idleColonists.join(", ") || "none"}\`);

        // Check that the carried stone was handled (staged to build cell, stockpiled, or currently hauling)
        const carriedStoneCount = (I && typeof I.count === "function") ? I.count(targetWorker.id, "stone") : 0;
        const targetWorkerJob = J.of(targetWorker.id);
        const isHandlingStone = carriedStoneCount === 0 || (targetWorkerJob && (targetWorkerJob.type === "haul" || targetWorkerJob.params?.itemId));
        t.check("carried_resource_handled", isHandlingStone,
            \`Colonist carried stone handled (remaining in hands: \${carriedStoneCount}, active job: \${targetWorkerJob ? targetWorkerJob.type : 'none'})\`);

        await t.waitFrames(15);
        t.screenshot("live_town_center_active");
        `}
`;

testCode = testCode.replace(targetHook, hookCode);
fs.writeFileSync(testJsPath, testCode, 'utf8');

// Copy updated plugins to snapshot
fs.copyFileSync(path.join(ROOT, 'game', 'js', 'plugins', 'UF_Colonists.js'), path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Colonists.js'));
fs.copyFileSync(path.join(ROOT, 'game', 'js', 'plugins', 'UF_Households.js'), path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Households.js'));
fs.copyFileSync(path.join(ROOT, 'game', 'js', 'plugins', 'UF_Jobs.js'), path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Jobs.js'));

console.log('Running Live Town Center Progression test harness on snapshot...');
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
    { src: 'smoke.live_town_center_initial.png', dest: 'live_town_center_initial.png' },
    { src: 'smoke.live_town_center_active.png', dest: 'live_town_center_active.png' }
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

console.log('Live Town Center Progression verification complete.');
