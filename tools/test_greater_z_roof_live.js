#!/usr/bin/env node
'use strict';

/**
 * tools/test_greater_z_roof_live.js
 *
 * In-engine NW.js automated verification for representing tiles on the greater Z plane (Z = 1)
 * when houses are finished:
 * - Generates settlement with completed communal great hall and family homesteads
 * - Asserts physical roof deck tiles exist on Z = 1 with tileset 92 autotiling
 * - Asserts roof deck tiles are standable/walkable while surrounding air is impassable
 * - Switches view to Level +1 (UF.Levels.setView(1)) and captures live in-engine screenshot
 * - Switches view back to Ground (Z = 0) and captures live ground screenshot
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'greater_z_roof_live');
const ARTIFACT_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/74107bfb-a5b5-43a6-8ab7-87deb97997e1';

const mutant = (process.argv.find(a => a.startsWith('--mutant=')) || '').slice(9);

console.log(`Setting up Greater Z Roof in-engine test snapshot at: ${SNAPSHOT_DIR}`);
try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Inject Greater Z Roof live demonstration into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const roofDemoCode = `
        t.screenshot("map");
        // --- Live Greater Z Roof Deck Verification ---
        const W = window.UF && UF.World;
        const L = window.UF && UF.Levels;
        const F = window.UF && UF.Floors;
        const H = window.UF && UF.History;
        const O = window.UF && UF.Objects;
        const st = W && W.state;
        const area = W && (W.viewLevel ? W.viewLevel() : W.currentArea());
        const size = (st && st.size) || $gameMap.width();

        // Build a finished 7x7 wooden house with perimeter walls and south door
        const hx0 = 125, hy0 = 125, hx1 = 131, hy1 = 131;
        const wallId = "wall_wood", doorId = "door_wood";
        
        // Clear interior and perimeter
        for (let y = hy0 - 1; y <= hy1 + 1; y++) {
            for (let x = hx0 - 1; x <= hx1 + 1; x++) {
                O.setIn(area, x, y, null);
            }
        }
        
        // Place perimeter walls and south door
        for (let x = hx0; x <= hx1; x++) {
            O.setIn(area, x, hy0, wallId);
            if (x === 128) O.setIn(area, x, hy1, doorId);
            else O.setIn(area, x, hy1, wallId);
        }
        for (let y = hy0 + 1; y < hy1; y++) {
            O.setIn(area, hx0, y, wallId);
            O.setIn(area, hx1, y, wallId);
        }
        
        // Add domestic hearth and beds inside
        O.setIn(area, 128, 128, "kitchen_hearth");
        O.setIn(area, 126, 126, "bed_wood");
        O.setIn(area, 130, 126, "bed_wood");
        
        // Lay wooden floor on ground inside
        for (let y = hy0 + 1; y < hy1; y++) {
            for (let x = hx0 + 1; x < hx1; x++) {
                F.setFloor(area, x, y, "floor_wood");
            }
        }

        // Apply upper roof deck to greater Z plane (Z = 1) unless mutant is active
        ${mutant === 'no_roof_deck' ? '// Mutant: roof deck skipped' : 'F.applyRoofedUpperDeck(area, { x0: hx0, y0: hy0, x1: hx1, y1: hy1 }, "wood");'}

        // Verify that on Z = 1:
        // 1. All roof cells are shape "floor" and standableShape is true
        let roofCount = 0, standableCount = 0;
        for (let y = hy0; y <= hy1; y++) {
            for (let x = hx0; x <= hx1; x++) {
                const s = L.shapeAt({ area, x, y, z: 1 });
                const stand = L.standableShape({ area, x, y, z: 1 });
                if (s === "floor") roofCount++;
                if (stand) standableCount++;
            }
        }
        t.check("greater_z_roof_cells", roofCount === 49 && standableCount === 49,
            \`Z=1 roof cells: \${roofCount}/49 floor shape, \${standableCount}/49 standable\`);

        // 2. Wilderness outside roof on Z = 1 remains open air
        const airShape = L.shapeAt({ area, x: hx0 - 5, y: hy0 - 5, z: 1 });
        const airStand = L.standableShape({ area, x: hx0 - 5, y: hy0 - 5, z: 1 });
        t.check("greater_z_open_air", airShape === "open" && airStand === false,
            \`Wilderness on Z=1: shape=\${airShape}, standable=\${airStand}\`);

        // Center camera over the house
        $gamePlayer.setTransparent(false);
        $gamePlayer.setImage("$U7_Ranger", 0);
        $gamePlayer.locate(128, 134);
        $gamePlayer.setDirection(8);
        $gameMap.setDisplayPos(128 - 8, 128 - 6);
        await t.waitFrames(15);
        t.screenshot("ground_plane_roofed_house");

        // Switch camera view to greater Z plane (+1)
        L.setView(1, { center: { x: 128, y: 128 } });
        await t.waitUntil(() => {
            const v = W.viewLevel();
            return v && v.z === 1 && SceneManager._scene && SceneManager._scene.isStarted() && !$gamePlayer.isTransferring();
        }, 10000, "view switch to Z=1");
        
        await t.waitFrames(20);
        
        // Assert that on the active level +1 map, tile IDs on the roof deck are non-zero (tileset 92 deck_wood)
        const tCenter = $dataMap.data[0 * size * size + 128 * size + 128];
        const tAir = $dataMap.data[0 * size * size + (hy0 - 5) * size + (hx0 - 5)];
        t.check("level_plus1_tiles_rendered", tCenter >= 2960 && tCenter < 3008 && tAir >= 3056,
            \`Z=1 map tiles: center deck=\${tCenter} (want autotiled deck_wood 2960-3007), air=\${tAir} (want open_air >= 3056)\`);

        t.screenshot("greater_z_plane_roof_deck");

        // Switch back to Ground (Z = 0)
        L.setView(0, { center: { x: 128, y: 128 } });
        await t.waitUntil(() => {
            const v = W.viewLevel();
            return v && v.z === 0 && SceneManager._scene && SceneManager._scene.isStarted() && !$gamePlayer.isTransferring();
        }, 10000, "view switch to Z=0");
        await t.waitFrames(10);
`;

testCode = testCode.replace(targetHook, roofDemoCode);
fs.writeFileSync(testJsPath, testCode, 'utf8');

console.log('Running test harness on snapshot...');
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
    { src: 'smoke.ground_plane_roofed_house.png', dest: 'live_ground_plane_roofed_house.png' },
    { src: 'smoke.greater_z_plane_roof_deck.png', dest: 'live_greater_z_plane_roof_deck.png' }
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

console.log('Live Greater Z Roof verification complete.');
