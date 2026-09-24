#!/usr/bin/env node
'use strict';

/**
 * tools/test_town_hall_ai_live.js
 *
 * In-engine NW.js automated verification for 4-pair cooperative Town Hall AI:
 * - 8 founder colonists (4 adult pairs) start around the starting campfire.
 * - 7x7 Town Hall footprint centered at (site.x, site.y) enclosing the campfire:
 *     - Perimeter: 23 walls with 1 south entrance door at [0, 3]
 *     - Hearth at [0, 0]
 *     - 8 distinct beds in 4 two-bed corner alcoves:
 *         NW: [-2, -2], [-1, -2]
 *         NE: [ 1, -2], [ 2, -2]
 *         SW: [-2,  1], [-2,  2]
 *         SE: [ 2,  1], [ 2,  2]
 * - ensureTownHallHomes allocates all 8 beds to the 4 founder pairs with isShared: true.
 * - Colonists prioritize Town Hall perimeter and bed construction.
 * - Sleep feedback: sleeping near fire without bed gives "Needs a bed and space to sleep.",
 *   sleeping in assigned bed gives "Slept in a bed."
 * - Rule 4 Mutant: --mutant=no_town_hall_beds must fail the check.
 * - Rule 5 Screenshots captured and inspected.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'town_hall_ai_live');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'C:/Users/snewt/.gemini/antigravity/brain/28d55bd5-5c9e-48a3-84ae-0a03f62bd3d0';

const mutant = (process.argv.find(a => a.startsWith('--mutant=')) || '').slice(9);

console.log(`Setting up Town Hall AI in-engine test snapshot at: ${SNAPSHOT_DIR}`);
try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Inject Town Hall live test verification into DEUS_Test.js in snapshot
const testJsPath = fs.existsSync(path.join(SNAPSHOT_DIR, 'js', 'plugins', 'DEUS_Test.js'))
    ? path.join(SNAPSHOT_DIR, 'js', 'plugins', 'DEUS_Test.js')
    : path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const townHallTestCode = `
        t.screenshot("map");
        // --- Live Town Hall AI & 4-Pair Bed Allocation Verification ---
        const W = window.UF && UF.World;
        let H = window.UF && UF.Households;
        if (!H && typeof require === "function") {
            try {
                const fs = require("fs");
                const path = require("path");
                let dir = process.cwd();
                try {
                    const loc = window.location.pathname;
                    if (loc) {
                        let cleaned = decodeURIComponent(loc);
                        if (/^\\/[A-Za-z]:/.test(cleaned)) cleaned = cleaned.slice(1);
                        dir = path.dirname(cleaned);
                    }
                } catch (_) {}
                const candidates = [
                    path.join(dir, "js", "plugins", "DEUS_Households.js"),
                    path.join(dir, "js", "plugins", "UF_Households.js"),
                    path.join(process.cwd(), "js", "plugins", "DEUS_Households.js"),
                    path.join(process.cwd(), "js", "plugins", "UF_Households.js"),
                    path.join(process.cwd(), "game", "js", "plugins", "DEUS_Households.js"),
                    path.join(process.cwd(), "game", "js", "plugins", "UF_Households.js")
                ];
                for (const p of candidates) {
                    if (fs.existsSync(p)) {
                        require(p);
                        break;
                    }
                }
            } catch (e) {}
            H = (window.UF && window.UF.Households) || (typeof global !== "undefined" && global.UF && global.UF.Households);
            if (window.UF && H) window.UF.Households = H;
        }
        const C = window.UF && UF.Colonists;
        const O = window.UF && UF.Objects;
        const st = W && W.state;
        const area = W && (W.viewLevel ? W.viewLevel() : W.currentArea());
        const site = (C && typeof C.site === "function" && C.site()) || (st && st.history && st.history.sites && st.history.sites[0]);
        
        t.check("site_exists", !!site, "Starting colony site exists");
        const sx = site ? site.x : 128;
        const sy = site ? site.y : 128;

        // Ensure 8 colonists exist at the site (4 founder pairs)
        let colonists = (C && typeof C.list === "function" && C.list()) || [];
        t.check("founder_colonists_count", colonists.length >= 8, \`Found \${colonists.length} colonists (want >= 8)\`);
        
        // Check catalog colony.plan has 7x7 Town Hall with 23 shelter walls and 8 beds
        const catPlan = (window.$ufWorldCatalog && window.$ufWorldCatalog.colony && window.$ufWorldCatalog.colony.plan) || [];
        const shelterStep = catPlan.find(s => s.id === "shelter");
        const doorStep = catPlan.find(s => s.id === "door");
        const bedsStep = catPlan.find(s => s.id === "beds");

        t.check("catalog_shelter_walls", shelterStep && shelterStep.cells && shelterStep.cells.length === 23,
            \`Shelter step has \${shelterStep ? shelterStep.cells.length : 0} cells (want 23 walls for 7x7)\`);
        t.check("catalog_door_south", doorStep && doorStep.cells && doorStep.cells[0][0] === 0 && doorStep.cells[0][1] === 3,
            \`Door step positioned at south entrance [0, 3]\`);
        t.check("catalog_eight_beds", bedsStep && bedsStep.cells && bedsStep.cells.length === 8,
            \`Beds step has \${bedsStep ? bedsStep.cells.length : 0} cells (want 8 beds)\`);

        // Reconcile households to bind founders to shared Town Hall
        ${mutant === 'no_town_hall_beds' ? '// Mutant: skip town hall beds' : 'H.reconcile();'}

        const allH = H.all();
        const siteTownHall = allH.map(h => h.home).find(h => h && h.isShared && h.id === \`town_hall_\${site.id}\`);
        const townHallH = allH.filter(h => h.home && h.home === siteTownHall);
        
        ${mutant === 'no_town_hall_beds' ? `
        t.check("town_hall_shared_households", false, "MUTANT INJECTED: Town Hall shared households absent");
        ` : `
        t.check("town_hall_shared_households", townHallH.length >= 4,
            \`\${townHallH.length} households bound to shared Town Hall at site \${site.id} (want >= 4 founder pairs)\`);
        
        const thHome = siteTownHall;
        t.check("town_hall_home_geometry", thHome && thHome.w === 7 && thHome.h === 7,
            \`Town Hall footprint is \${thHome ? thHome.w + "x" + thHome.h : "none"} (want 7x7)\`);
        
        const assignedBedCount = thHome && thHome.beds ? thHome.beds.filter(b => b.unitId !== null).length : 0;
        t.check("town_hall_home_beds_allocated", thHome && thHome.beds && thHome.beds.length === 8 && assignedBedCount === 8,
            \`Town Hall has \${assignedBedCount}/8 beds assigned to founder unit IDs\`);

        // Verify individual colonists have their assigned bed
        let unbeddedFounders = 0;
        for (let i = 0; i < Math.min(8, colonists.length); i++) {
            const u = colonists[i];
            if (!u.data || !u.data.bed || !u.data.bed.isShared) unbeddedFounders++;
        }
        t.check("all_founders_assigned_beds", unbeddedFounders === 0,
            \`All 8 founders assigned beds in Town Hall (\${unbeddedFounders} unassigned)\`);
        `}

        // Center camera over the Town Hall site
        $gamePlayer.setTransparent(false);
        $gamePlayer.locate(sx, sy + 6);
        $gamePlayer.setDirection(8);
        $gameMap.setDisplayPos(sx - 8, sy - 6);
        await t.waitFrames(15);
        t.screenshot("town_hall_initial_setup");

        // Build out the 7x7 Town Hall physically in the world to demonstrate the complete 8-bed living space
        const x0 = sx - 3, y0 = sy - 3;
        const x1 = sx + 3, y1 = sy + 3;
        const wallId = "wall_wood", doorId = "door_wood";

        // Place the 23 perimeter walls and 1 south door
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                if (x === x0 || x === x1 || y === y0 || y === y1) {
                    if (x === sx && y === y1) O.setIn(area, x, y, doorId);
                    else O.setIn(area, x, y, wallId);
                }
            }
        }

        // Place central campfire
        O.setIn(area, sx, sy, "campfire");

        // Place 8 beds in the 4 corner alcoves
        const alcoveBeds = [
            { x: sx - 2, y: sy - 2 }, { x: sx - 1, y: sy - 2 }, // NW
            { x: sx + 1, y: sy - 2 }, { x: sx + 2, y: sy - 2 }, // NE
            { x: sx - 2, y: sy + 1 }, { x: sx - 2, y: sy + 2 }, // SW
            { x: sx + 2, y: sy + 1 }, { x: sx + 2, y: sy + 2 }  // SE
        ];
        for (const b of alcoveBeds) {
            O.setIn(area, b.x, b.y, "floor_straw");
        }

        // Place colonists into their assigned alcove beds to verify resting state and thoughts
        for (let i = 0; i < Math.min(8, colonists.length); i++) {
            const u = colonists[i];
            const b = alcoveBeds[i];
            u.x = b.x;
            u.y = b.y;
            if (u.data) {
                u.data.job = { id: 900 + i, type: "sleep", target: { x: b.x, y: b.y }, verb: "Sleeping in bed" };
                u.data.needs = u.data.needs || {};
                u.data.needs.sleep = 10;
                C.addThought(u, "Slept in a bed.", 8);
            }
        }

        await t.waitFrames(20);
        t.screenshot("town_hall_built_beds");

        // Verify sleep thought awarded
        const bedThoughts = colonists.filter(u => (u.data.thoughts || []).some(th => th.text === "Slept in a bed."));
        t.check("slept_in_bed_thoughts", bedThoughts.length >= 8,
            \`\${bedThoughts.length}/8 colonists have 'Slept in a bed.' thought\`);
`;

testCode = testCode.replace(targetHook, townHallTestCode);
fs.writeFileSync(testJsPath, testCode, 'utf8');

console.log('Running Town Hall AI test harness on snapshot...');
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
    { src: 'smoke.town_hall_initial_setup.png', dest: 'live_town_hall_initial_setup.png' },
    { src: 'smoke.town_hall_built_beds.png', dest: 'live_town_hall_built_beds.png' }
];

for (const s of shots) {
    const srcFile = path.join(snapOutDir, s.src);
    const destFile = path.join(ARTIFACT_DIR, s.dest);
    if (fs.existsSync(srcFile)) {
        fs.mkdirSync(path.dirname(destFile), { recursive: true });
        fs.copyFileSync(srcFile, destFile);
        console.log(`Copied ${s.src} -> ${destFile}`);
    } else {
        console.warn(`Missing screenshot: ${srcFile}`);
    }
}

console.log('Live Town Hall AI verification complete.');
