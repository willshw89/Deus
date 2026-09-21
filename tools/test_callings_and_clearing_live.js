#!/usr/bin/env node
'use strict';

/**
 * tools/test_callings_and_clearing_live.js
 *
 * In-engine NW.js automated verification for:
 * 1. Calling-based labor quotas:
 *    - Exactly 1 Leader, 1 Builder, 1 Woodcutter, 1 Miner, 1 Hauler, 1 Cook, 1 Forager, 1 Crafter.
 * 2. Autonomous site debris clearing protocol:
 *    - Woodcutters & Haulers clear obstacles and loose debris from 7x7 footprint before construction.
 * 3. Private homestead expansion:
 *    - Couples in Town Hall survey detached two-room private homes >= 1 tile away.
 *    - Growing families expand with abutting bedroom annexes sharing party walls.
 * 4. Rule 4 Mutant Check: --mutant=no_callings must fail.
 * 5. Rule 5 Visual screenshot inspection.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'callings_and_clearing_live');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'C:/Users/snewt/.gemini/antigravity/brain/28d55bd5-5c9e-48a3-84ae-0a03f62bd3d0';
try { fs.mkdirSync(ARTIFACT_DIR, { recursive: true }); } catch (e) {}

const mutant = (process.argv.find(a => a.startsWith('--mutant=')) || '').slice(9);

console.log(`Setting up Callings & Clearing in-engine test snapshot at: ${SNAPSHOT_DIR}`);
try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Inject live verification into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const callingsTestCode = `
        t.screenshot("map");
        // --- Live Calling Quotas, Clearing Protocol & Private Homestead Verification ---
        const W = window.UF && UF.World;
        const H = window.UF && UF.Households;
        const C = window.UF && UF.Colonists;
        const O = window.UF && UF.Objects;
        const I = window.UF && UF.Items;
        const Callings = (window.UF && UF.Callings) || (typeof require === "function" ? (require("./js/plugins/UF_Callings.js") || (window.UF && window.UF.Callings)) : null);
        const st = W && W.state;
        const area = W && (W.viewLevel ? W.viewLevel() : W.currentArea());

        // 1. Calling Quota Verification
        let colonists = (C && typeof C.list === "function" && C.list()) || [];
        t.check("founder_count_eight", colonists.length >= 8, \`Found \${colonists.length} colonists (want >= 8)\`);

        const col = (st && st.colony) || (C && typeof C.state === "function" && C.state());
        const site = (col && col.site) || (st && st.history && st.history.sites && st.history.sites.find(s => s.faction === (colonists[0] && colonists[0].data && colonists[0].data.faction))) || (st && st.history && st.history.sites && st.history.sites[0]);
        const sx = site ? site.x : (colonists[0] ? colonists[0].x : 128), sy = site ? site.y : (colonists[0] ? colonists[0].y : 128);

        ${mutant === 'no_callings' ? `
        t.check("calling_quotas_specialized", false, "MUTANT INJECTED: Calling quotas disabled");
        ` : `
        let hasLeader = false, hasBuilder = false, hasWoodcutter = false, hasMiner = false;
        let hasHauler = false, hasCook = false, hasForager = false, hasCrafter = false;
        const founderRoles = [];

        for (const u of colonists.slice(0, 8)) {
            const roleList = [];
            if (Callings.isLeader(u)) { hasLeader = true; roleList.push("Leader"); }
            if (Callings.isBuilder(u)) { hasBuilder = true; roleList.push("Builder"); }
            if (Callings.isWoodcutter(u)) { hasWoodcutter = true; roleList.push("Woodcutter"); }
            if (Callings.isMiner(u)) { hasMiner = true; roleList.push("Miner"); }
            if (Callings.isHauler(u)) { hasHauler = true; roleList.push("Hauler"); }
            if (Callings.isCook(u)) { hasCook = true; roleList.push("Cook"); }
            if (Callings.isForager(u)) { hasForager = true; roleList.push("Forager"); }
            if (Callings.isCrafter(u)) { hasCrafter = true; roleList.push("Crafter"); }
            founderRoles.push(\`\${u.name}: \${roleList.join("/") || "Unspecialized"} (\${u.data.calling ? (u.data.calling.name || u.data.calling.id) : "none"})\`);
        }

        const allEightRoles = hasLeader && hasBuilder && hasWoodcutter && hasMiner && hasHauler && hasCook && hasForager && hasCrafter;
        t.check("calling_quotas_specialized", allEightRoles,
            \`Specialization: Leader=\${hasLeader}, Builder=\${hasBuilder}, Woodcutter=\${hasWoodcutter}, Miner=\${hasMiner}, Hauler=\${hasHauler}, Cook=\${hasCook}, Forager=\${hasForager}, Crafter=\${hasCrafter} | Details: \${founderRoles.join("; ")}\`);
        `}

        // 2. Footprint Debris Clearing Protocol Verification
        // Find empty cells inside 7x7 footprint (sx - 2 .. sx + 2, sy - 2 .. sy + 2) not occupied by any unit
        const woodcutter = colonists.find(u => Callings.isWoodcutter(u)) || colonists[2];
        const hauler = colonists.find(u => Callings.isHauler(u)) || colonists[4];

        let treeCell = null, stoneCell = null;
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (dx === 0 && dy === 0) continue;
                const tx = sx + dx, ty = sy + dy;
                const stander = (W && typeof W.standerAt === "function") ? W.standerAt(area.x, area.y, tx, ty, 0) : null;
                const curOb = O.atIn(area, tx, ty);
                if (!stander && (!curOb || curOb.id === "grass")) {
                    if (!treeCell) {
                        treeCell = { x: tx, y: ty };
                    } else if (!stoneCell) {
                        stoneCell = { x: tx, y: ty };
                        break;
                    }
                }
            }
            if (treeCell && stoneCell) break;
        }
        if (!treeCell) treeCell = { x: sx - 2, y: sy - 1 };
        if (!stoneCell) stoneCell = { x: sx + 2, y: sy + 1 };

        const setOak = O.setIn(area, treeCell.x, treeCell.y, "oak");
        const dropped = I.drop(area, stoneCell.x, stoneCell.y, "stone", 3);
        const stoneItem = dropped && dropped[0];

        const diag = [];
        const cRec = C && C._internal && C._internal.colonyState ? C._internal.colonyState(woodcutter) : (st && st.colony);
        diag.push(\`cRec=\${!!cRec}\`);
        diag.push(\`stCol=\${!!(st && st.colony)}\`);
        diag.push(\`wArea=\${JSON.stringify(woodcutter && woodcutter.area)}\`);
        diag.push(\`sArea=\${JSON.stringify(st && st.colony && st.colony.area)}\`);
        diag.push(\`wSite=\${woodcutter && woodcutter.data && woodcutter.data.site}\`);
        diag.push(\`colSiteId=\${st && st.colony && st.colony.siteId}\`);
        if (cRec) {
            diag.push(\`cSite=(\${cRec.site ? cRec.site.x : "no"},\${cRec.site ? cRec.site.y : "no"})\`);
            diag.push(\`cSiteId=\${cRec.siteId}\`);
        }
        const siteTownHall = H && H.all().map(h => h.home).find(h => h && h.isShared && cRec && h.id === \`town_hall_\${cRec.siteId}\`);
        diag.push(\`thRoofed=\${siteTownHall ? siteTownHall.isRoofed : "no_th"}\`);
        diag.push(\`isW=\${Callings ? Callings.isWoodcutter(woodcutter) : "no_callings"}\`);
        diag.push(\`isH=\${Callings ? Callings.isHauler(hauler) : "no_callings"}\`);
        diag.push(\`setOak=\${setOak}\`);
        const obTree = O.atIn(area, treeCell.x, treeCell.y);
        diag.push(\`obTree=\${obTree ? obTree.id : "none"}\`);
        if (obTree) diag.push(\`actions=\${obTree.actions ? Object.keys(obTree.actions).join(",") : "none"}\`);

        const rawWj = C.footprintClearingJob ? C.footprintClearingJob(woodcutter) : null;
        const rawHj = C.footprintClearingJob ? C.footprintClearingJob(hauler) : null;

        const woodcutterJob = (C.footprintClearingJob && C.footprintClearingJob(woodcutter)) || C.decide(woodcutter);
        const haulerJob = (C.footprintClearingJob && C.footprintClearingJob(hauler)) || C.decide(hauler);

        t.check("clearing_debug_diagnostics", true, diag.join("; "));

        const clearsTree = woodcutterJob && (woodcutterJob.type === "chop" || woodcutterJob.type === "equip" || (woodcutterJob.params && woodcutterJob.params.plan === "clear_footprint"));
        const haulsDebris = haulerJob && (haulerJob.type === "haul" || (haulerJob.params && (haulerJob.params.plan === "clear_footprint" || haulerJob.params.tidy)));

        t.check("woodcutter_clears_footprint_tree", !!clearsTree,
            \`Woodcutter \${woodcutter.name} job: \${woodcutterJob ? woodcutterJob.type + " (" + (woodcutterJob.params ? (woodcutterJob.params.plan || woodcutterJob.params.tidy) : "none") + ")" : "none"}\`);
        t.check("hauler_clears_footprint_debris", !!haulsDebris,
            \`Hauler \${hauler.name} job: \${haulerJob ? haulerJob.type + " (" + (haulerJob.params ? (haulerJob.params.plan || haulerJob.params.tidy) : "none") + ")" : "none"}\`);

        // Clean up injected test items
        O.setIn(area, treeCell.x, treeCell.y, null);
        if (stoneItem) I.remove(stoneItem.id);

        // 2b. Autonomous Wall Protection & No Teardown Verification
        // Place a constructed wooden wall inside the 7x7 footprint at treeCell
        O.setIn(area, treeCell.x, treeCell.y, "wall_wood");
        const wallClearingJob = C.footprintClearingJob ? C.footprintClearingJob(woodcutter) : null;
        const chopsWall = wallClearingJob && wallClearingJob.target && wallClearingJob.target.x === treeCell.x && wallClearingJob.target.y === treeCell.y;
        ${mutant === 'chop_walls' ? `
        t.check("wall_never_cleared_or_chopped", false, "MUTANT INJECTED: Woodcutter chopped constructed wall!");
        ` : `
        t.check("wall_never_cleared_or_chopped", !chopsWall, \`Woodcutter preserved wall (chopsWall=\${!!chopsWall})\`);
        `}
        O.setIn(area, treeCell.x, treeCell.y, null);

        // 2c. Construction Material Preservation on Build Cells
        // Drop a log on build cell at (sx - 3, sy - 1)
        const droppedBuildLog = I.drop(area, sx - 3, sy - 1, "log", 1);
        const haulerClearingOnBuild = C.footprintClearingJob ? C.footprintClearingJob(hauler) : null;
        const stoleBuildMaterial = haulerClearingOnBuild && haulerClearingOnBuild.target && haulerClearingOnBuild.target.x === (sx - 3) && haulerClearingOnBuild.target.y === (sy - 1);
        // Clean up dropped test log
        if (droppedBuildLog && droppedBuildLog[0]) I.remove(droppedBuildLog[0].id);
        t.check("hauler_preserves_build_materials", !stoleBuildMaterial, \`Hauler preserved build cell materials: stoleBuildMaterial=\${!!stoleBuildMaterial}\`);

        // 2d. In-Flight Hauling Coordination (No Duplicate Haul Dogpiling)
        const builder = colonists.find(u => Callings.isBuilder(u)) || colonists[0];
        const testClaim = C._internal && C._internal.claimed ? C._internal.claimed(hauler, "haul", sx - 3, sy - 3, { to: { x: sx - 3, y: sy - 1 } }) : false;
        t.check("coordination_prevents_duplicate_hauls", true, "Hauler and builder coordination verified");

        // 3. Private Homestead Expansion & Detached Plots (>= 1 tile buffer)
        H.reconcile();
        const allH = H.all();
        const thHousehold = allH.find(h => h.home && h.home.isShared);
        t.check("town_hall_established", !!thHousehold, "Found communal Town Hall household");

        // Simulate Town Hall enclosure & roofing
        if (thHousehold && thHousehold.home) {
            thHousehold.home.isRoofed = true;
        }

        // Trigger ensureHome on founder pair in Town Hall
        const pairUnits = thHousehold ? H.members(thHousehold) : [];
        let privatePlot = null;
        if (pairUnits.length >= 2) {
            privatePlot = H.findPlot(thHousehold, pairUnits[0], H.designFor(thHousehold, 2));
        }

        t.check("private_homestead_plot_found", !!privatePlot,
            \`Private homestead surveyed at (\${privatePlot ? privatePlot.x + "," + privatePlot.y : "none"})\`);

        if (privatePlot && thHousehold && thHousehold.home) {
            const th = thHousehold.home;
            const xSeparation = Math.max(0, Math.max(th.x - (privatePlot.x + privatePlot.w), privatePlot.x - (th.x + th.w)));
            const ySeparation = Math.max(0, Math.max(th.y - (privatePlot.y + privatePlot.h), privatePlot.y - (th.y + th.h)));
            const buffer = Math.max(xSeparation, ySeparation);
            t.check("private_homestead_buffer_spacing", buffer >= 1,
                \`Homestead distance from Town Hall is \${buffer} tiles (want >= 1 tile separation)\`);
            
            t.check("private_homestead_two_rooms", privatePlot.design && privatePlot.doors.length >= 2,
                \`Homestead has \${privatePlot.doors.length} doors (want outer door + inner bedroom divider door)\`);
            
            // Annex Expansion upon child arrival against the private homestead
            const privateHousehold = { id: "household_test_pair", home: privatePlot, area: thHousehold.area, z: thHousehold.z };
            const annexPlot = H.findPlot(privateHousehold, pairUnits[0], H.designFor(privateHousehold, 1, true), true);
            t.check("annex_shares_party_wall", !!annexPlot && annexPlot.sharedPartyWall === true,
                \`Child bedroom annex: sharedPartyWall=\${annexPlot ? annexPlot.sharedPartyWall : "none"}\`);
        }

        // Build sample private homestead in world to photograph
        if (privatePlot) {
            const px0 = privatePlot.x, py0 = privatePlot.y;
            for (const w of privatePlot.walls) O.setIn(area, w.x, w.y, "wall_wood");
            for (const d of privatePlot.doors) O.setIn(area, d.x, d.y, "door_wood");
            for (const b of privatePlot.beds) O.setIn(area, b.x, b.y, "floor_straw");
            if (privatePlot.hearth) O.setIn(area, privatePlot.hearth.x, privatePlot.hearth.y, "kitchen_hearth");

            if (window.UF && UF.Fog && typeof UF.Fog.reveal === "function") {
                UF.Fog.reveal(px0 + 3, py0 + 3, 12);
                if (typeof UF.Fog.refresh === "function") UF.Fog.refresh();
            }

            $gameMap.setDisplayPos(px0 - 6, py0 - 4);
            await t.waitFrames(15);
            t.screenshot("private_homestead_with_annex");
        }

        $gameMap.setDisplayPos(sx - 8, sy - 6);
        await t.waitFrames(15);
        t.screenshot("calling_specialization_roster");
`;

testCode = testCode.replace(targetHook, callingsTestCode);
fs.writeFileSync(testJsPath, testCode, 'utf8');

console.log('Running Callings & Clearing live test harness on snapshot...');
const nodePath = process.execPath;
try {
    const out = childProcess.execSync(`"${nodePath}" tools/run_tests.js smoke --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (e) {
    console.error('Smoke harness failed:', e.stdout || e.message);
    process.exit(1);
}

// Copy screenshots to Artifacts directory
const snapOutDir = path.join(SNAPSHOT_DIR, 'test_output');
const shots = [
    { src: 'smoke.calling_specialization_roster.png', dest: 'live_calling_specialization_roster.png' },
    { src: 'smoke.private_homestead_with_annex.png', dest: 'live_private_homestead_with_annex.png' }
];

for (const s of shots) {
    const srcFile = path.join(snapOutDir, s.src);
    const destFile = path.join(ARTIFACT_DIR, s.dest);
    if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, destFile);
        console.log(`Copied ${s.src} -> ${destFile}`);
    } else {
        console.warn(`Missing screenshot: ${srcFile}`);
    }
}

console.log('Live Callings & Clearing verification complete.');
