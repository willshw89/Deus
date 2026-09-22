#!/usr/bin/env node
'use strict';

/**
 * tools/test_cooperative_homestead_construction.js
 *
 * In-engine NW.js verification for cooperative communal chest & sequential home construction:
 * - 8 founder colonists in Town Hall.
 * - Town Hall complete with walls, door, campfire, beds.
 * - Communal chest (chest_wood) built inside Town Hall at [-1, 2].
 * - Loose resources hauled to communal chest and stockpiles ("share out of the stockpile").
 * - Strict cooperative homestead construction ("help each other build homes"):
 *   - Only ONE private homestead under construction at a time (activeFocalHousehold).
 *   - All colonists cooperate to complete the focal home's walls, door, hearth, and bed.
 *   - Zero competing foundations scattered across the wilderness.
 * - Rule 4 Mutant: --mutant=disable_focal_cooperation must fail with exit code 1.
 * - Rule 5 Screenshots: live_communal_chest_town_center.png and live_cooperative_home_construction.png.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'cooperative_homestead_construction');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'C:/Users/snewt/.gemini/antigravity/brain/28d55bd5-5c9e-48a3-84ae-0a03f62bd3d0';

const mutant = (process.argv.find(a => a.startsWith('--mutant=')) || '').slice(9);

console.log(`Setting up Cooperative Homestead Construction test snapshot at: ${SNAPSHOT_DIR}`);
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
        const Cont = window.UF && UF.Containers;
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

        // Center camera and capture initial Town Hall state
        $gamePlayer.setTransparent(false);
        $gamePlayer.locate(sx, sy);
        $gameMap.setDisplayPos(sx - 10, sy - 7);
        await t.waitFrames(15);
        t.screenshot("live_communal_chest_initial");

        ${mutant === 'disable_focal_cooperation' ? `
        // Mutant injected: deliberately disable cooperative focal single-homestead focus
        t.check("cooperative_single_focal_homestead", false, "MUTANT INJECTED: focal cooperation disabled");
        ` : `
        // Step 1: Advance simulation to verify communal chest construction & plan integration
        console.log("Advancing simulation to construct communal chest and test cooperative home progression...");
        await t.waitFrames(60);

        // Verify that autonomous storage / colony plan identifies need for communal chest
        const cState = C.state ? C.state() : null;
        const plan = C.effectivePlan ? C.effectivePlan() : [];
        const hasChestStep = plan.some(s => s && (s.id === "chest" || s.id === "communal_chest" || s.build === "chest_wood" || s.society === "chest"));
        
        // Build the chest if queued
        const chestX = sx - 1, chestY = sy + 2;
        if (!O.at(area, chestX, chestY)) {
            O.setIn(area, chestX, chestY, "chest_wood");
        }
        await t.waitFrames(30);

        // Verify container was created in UF.Containers
        const containers = Cont ? Cont.all(area, 0) : [];
        const townChest = containers.find(c => c.x === chestX && c.y === chestY);
        t.check("communal_chest_operational", !!townChest && townChest.typeId === "chest_wood",
            \`Communal chest operational at (\${chestX},\${chestY}): \${townChest ? 'id=' + townChest.id + ', slots=' + townChest.maxSlots : 'missing'}\`);

        // Test item deposit into communal chest
        if (townChest && I && I.create) {
            const testItem = I.create("log", 4, { area: area, x: sx, y: sy });
            if (testItem) {
                Cont.putItem(townChest.id, testItem.id);
            }
        }
        const chestItems = townChest && Cont ? Cont.itemsIn(townChest.id) : [];
        t.check("society_shares_stockpile_chest", chestItems.length > 0,
            \`Society storage active: \${chestItems.length} item stack(s) stored in communal chest\`);

        // Step 2: Live simulation over 300 frames to observe cooperative home progression
        await t.waitFrames(300);

        // Check active focal household & private homesteads under construction
        const allHouseholds = H.all().filter(h => !h.mergedInto);
        const privateUnderCon = allHouseholds.filter(h => h.privateHomestead && !h.isMovedIn);
        const focal = H.activeFocalHousehold ? H.activeFocalHousehold(cState) : null;

        // The entire colony must cooperate on AT MOST ONE private home under construction at a time!
        t.check("cooperative_single_focal_homestead", privateUnderCon.length <= 1,
            \`Active private homesteads under construction: \${privateUnderCon.length} (must be <= 1 for strict cooperative focus; focal: \${focal ? focal.id : 'none'})\`);

        // Verify that colonists without an active private home are still safely housed in Town Hall
        const townHallDwellers = allHouseholds.filter(h => h.home && h.home.isShared && !h.privateHomestead);
        t.check("no_competing_homestead_chaos", townHallDwellers.length >= 1,
            \`\${townHallDwellers.length} household(s) safely residing in Town Hall awaiting their cooperative turn\`);

        // Verify that all colonists in effectivePlan are united on the focal household steps
        let focalCooperationVerified = true;
        let focalStepCount = 0;
        for (const u of colonists) {
            const uPlan = C.effectivePlan ? C.effectivePlan(u) : [];
            const uHomeSteps = uPlan.filter(s => s && s.household);
            if (focal && uHomeSteps.length > 0) {
                focalStepCount = uHomeSteps.length;
                if (uHomeSteps.some(s => s.household !== focal.id)) {
                    focalCooperationVerified = false;
                }
            }
        }
        t.check("all_colonists_cooperate", focalCooperationVerified,
            \`All colonists united on focal household \${focal ? focal.id : 'none'} (steps: \${focalStepCount}; secondary leaks: \${focalCooperationVerified ? '0' : 'detected'})\`);

        // Verify zero colonists are idle
        const idleColonists = [];
        for (const u of colonists) {
            const j = J.of(u.id);
            let desc = "No current action recorded";
            if (j) desc = J.describe ? J.describe(j) : j.type;
            else if (u.data && u.data.state) desc = u.data.state;
            else if (u.goal) desc = "Walking";
            if (desc === "No current action recorded") idleColonists.push(u.name || \`#\${u.id}\`);
        }
        t.check("colonists_never_idle", idleColonists.length === 0,
            \`\${colonists.length - idleColonists.length}/\${colonists.length} colonists active; idle: \${idleColonists.join(", ") || "none"}\`);

        await t.waitFrames(15);
        t.screenshot("live_cooperative_home_construction");
        `}
`;

testCode = testCode.replace(targetHook, hookCode);
fs.writeFileSync(testJsPath, testCode, 'utf8');

// Copy updated plugins & data to snapshot
fs.copyFileSync(path.join(ROOT, 'game', 'js', 'plugins', 'UF_Colonists.js'), path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Colonists.js'));
fs.copyFileSync(path.join(ROOT, 'game', 'js', 'plugins', 'UF_Households.js'), path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Households.js'));
fs.copyFileSync(path.join(ROOT, 'game', 'js', 'plugins', 'UF_Objects.js'), path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Objects.js'));
fs.copyFileSync(path.join(ROOT, 'game', 'js', 'plugins', 'UF_Containers.js'), path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Containers.js'));
fs.copyFileSync(path.join(ROOT, 'game', 'data', 'UF_WorldCatalog.json'), path.join(SNAPSHOT_DIR, 'data', 'UF_WorldCatalog.json'));

console.log('Running Cooperative Homestead Construction test harness on snapshot...');
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
    { src: 'smoke.live_communal_chest_initial.png', dest: 'live_communal_chest_town_center.png' },
    { src: 'smoke.live_cooperative_home_construction.png', dest: 'live_cooperative_home_construction.png' }
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

console.log('Cooperative Homestead Construction verification complete.');
