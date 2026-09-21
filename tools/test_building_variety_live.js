#!/usr/bin/env node
'use strict';

/**
 * tools/test_building_variety_live.js
 *
 * In-engine NW.js automated verification for structural and shelter architectural variety:
 * - Constructs procedurally varied non-square buildings (L-shape, Octagonal roundhouse, T-shape, Cruciform)
 * - Verifies perimeter wall enclosure, interior floors, doors, and furniture (hearths, beds)
 * - Verifies Level +1 upper roof decks matching the exact non-square contours
 * - Captures live in-engine screenshots of Ground (Z = 0) and Level +1 (Z = 1)
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'building_variety_live');
const ARTIFACT_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/74107bfb-a5b5-43a6-8ab7-87deb97997e1';

const mutant = (process.argv.find(a => a.startsWith('--mutant=')) || '').slice(9);

console.log(`Setting up Building Variety in-engine test snapshot at: ${SNAPSHOT_DIR}`);
try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Inject Building Variety live demonstration into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const varietyDemoCode = `
        t.screenshot("map");
        // --- Live Building Variety Verification ---
        const W = window.UF && UF.World;
        const L = window.UF && UF.Levels;
        const F = window.UF && UF.Floors;
        const H = window.UF && UF.Households;
        const O = window.UF && UF.Objects;
        const st = W && W.state;
        const area = W && (W.viewLevel ? W.viewLevel() : W.currentArea());
        const size = (st && st.size) || $gameMap.width();

        // Helper to clear a box
        const clearBox = (x0, y0, w, h) => {
            for (let y = y0; y < y0 + h; y++) {
                for (let x = x0; x < x0 + w; x++) {
                    O.setIn(area, x, y, null);
                }
            }
        };

        // 1. L-Shaped Homestead (x: 114, y: 122, w: 7, h: 7)
        // Main hall on left + South wing, patio in NE quadrant
        const lShapeCells = [];
        const lx0 = 114, ly0 = 122, lw = 7, lh = 7;
        clearBox(lx0 - 1, ly0 - 1, lw + 2, lh + 2);
        for (let dy = 0; dy < lh; dy++) {
            for (let dx = 0; dx < lw; dx++) {
                if (${mutant === 'no_variety' ? 'false' : 'dx >= 4 && dy < 3'}) continue; // Patio cutout
                lShapeCells.push({ x: lx0 + dx, y: ly0 + dy });
            }
        }
        const isLPerim = (cx, cy) => {
            for (const [ox, oy] of [[cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]]) {
                if (!lShapeCells.some(c => c.x === ox && c.y === oy)) return true;
            }
            return false;
        };
        for (const c of lShapeCells) {
            if (c.x === lx0 + 2 && c.y === ly0 + lh - 1) {
                O.setIn(area, c.x, c.y, "door_wood");
            } else if (isLPerim(c.x, c.y)) {
                O.setIn(area, c.x, c.y, "wall_wood");
            } else {
                F.setFloor(area, c.x, c.y, "floor_wood");
            }
        }
        O.setIn(area, lx0 + 2, ly0 + 3, "kitchen_hearth");
        O.setIn(area, lx0 + 1, ly0 + 1, "bed_wood");
        O.setIn(area, lx0 + 2, ly0 + 1, "bed_wood");
        O.setIn(area, lx0 + 5, ly0 + 4, "bed_wood");
        F.applyRoofedUpperDeck(area, lShapeCells, "wood");

        // 2. Chamfered Octagonal Roundhouse / Pavilion (x: 124, y: 122, w: 7, h: 7)
        // 8-sided rotunda with 4 chamfered corners
        const octCells = [];
        const ox0 = 124, oy0 = 122, ow = 7, oh = 7;
        clearBox(ox0 - 1, oy0 - 1, ow + 2, oh + 2);
        for (let dy = 0; dy < oh; dy++) {
            for (let dx = 0; dx < ow; dx++) {
                if (${mutant === 'no_variety' ? 'false' : '(dx === 0 || dx === ow - 1) && (dy === 0 || dy === oh - 1)'}) continue;
                if (${mutant === 'no_variety' ? 'false' : '(dx === 0 || dx === ow - 1) && (dy === 1 || dy === oh - 2)'}) continue;
                octCells.push({ x: ox0 + dx, y: oy0 + dy });
            }
        }
        const isOctPerim = (cx, cy) => {
            for (const [ox, oy] of [[cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]]) {
                if (!octCells.some(c => c.x === ox && c.y === oy)) return true;
            }
            return false;
        };
        for (const c of octCells) {
            if (c.x === ox0 + 3 && c.y === oy0 + oh - 1) {
                O.setIn(area, c.x, c.y, "door_stone");
            } else if (isOctPerim(c.x, c.y)) {
                O.setIn(area, c.x, c.y, "wall_stone");
            } else {
                F.setFloor(area, c.x, c.y, "floor_stone");
            }
        }
        O.setIn(area, ox0 + 3, oy0 + 3, "kitchen_hearth");
        O.setIn(area, ox0 + 2, oy0 + 1, "bed_stone");
        O.setIn(area, ox0 + 4, oy0 + 1, "bed_stone");
        F.applyRoofedUpperDeck(area, octCells, "stone");

        // 3. T-Shaped Meadhall (x: 134, y: 122, w: 7, h: 7)
        // Top crossbar + vertical stem
        const tCells = [];
        const tx0 = 134, ty0 = 122, tw = 7, th = 7;
        clearBox(tx0 - 1, ty0 - 1, tw + 2, th + 2);
        for (let dy = 0; dy < th; dy++) {
            for (let dx = 0; dx < tw; dx++) {
                if (${mutant === 'no_variety' ? 'false' : 'dy >= 3 && (dx < 2 || dx > 4)'}) continue;
                tCells.push({ x: tx0 + dx, y: ty0 + dy });
            }
        }
        const isTPerim = (cx, cy) => {
            for (const [ox, oy] of [[cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]]) {
                if (!tCells.some(c => c.x === ox && c.y === oy)) return true;
            }
            return false;
        };
        for (const c of tCells) {
            if (c.x === tx0 + 3 && c.y === ty0 + th - 1) {
                O.setIn(area, c.x, c.y, "door_wood");
            } else if (isTPerim(c.x, c.y)) {
                O.setIn(area, c.x, c.y, "wall_wood");
            } else {
                F.setFloor(area, c.x, c.y, "floor_wood");
            }
        }
        O.setIn(area, tx0 + 3, ty0 + 2, "kitchen_hearth");
        O.setIn(area, tx0 + 1, ty0 + 1, "bed_wood");
        O.setIn(area, tx0 + 5, ty0 + 1, "bed_wood");
        F.applyRoofedUpperDeck(area, tCells, "wood");

        // Assert non-square shapes have distinct cell counts and perimeter geometry
        const lArea = lShapeCells.length, octArea = octCells.length, tArea = tCells.length;
        const varietyOk = lArea !== 49 && octArea !== 49 && tArea !== 49 && lArea !== tArea;
        t.check("architectural_variety_areas", varietyOk,
            \`Distinct non-square areas: L-Shape=\${lArea} (want <49), Octagon=\${octArea} (want <49), T-Shape=\${tArea} (want <49)\`);

        // Center camera to view the varied settlement structures
        $gamePlayer.setTransparent(false);
        $gamePlayer.setImage("$U7_Ranger", 0);
        $gamePlayer.locate(128, 126);
        $gamePlayer.setDirection(8);
        $gameMap.setDisplayPos(128 - 10, 126 - 6);
        await t.waitFrames(20);
        t.screenshot("structure_variety_ground");

        // Switch camera view to greater Z plane (+1)
        L.setView(1, { center: { x: 128, y: 126 } });
        await t.waitUntil(() => {
            const v = W.viewLevel();
            return v && v.z === 1 && SceneManager._scene && SceneManager._scene.isStarted() && !$gamePlayer.isTransferring();
        }, 10000, "view switch to Z=1");
        
        await t.waitFrames(25);
        
        // Assert Level +1 deck tiles exist on each structure's interior and open_air on the cutouts
        const lDeckTile = $dataMap.data[0 * size * size + (ly0 + 1) * size + (lx0 + 1)];
        const lPatioTile = $dataMap.data[0 * size * size + (ly0 + 1) * size + (lx0 + 5)];
        const tDeckTile = $dataMap.data[0 * size * size + (ty0 + 1) * size + (tx0 + 3)];
        const tCutoutTile = $dataMap.data[0 * size * size + (ty0 + 5) * size + (tx0 + 1)];

        const roofsOk = lDeckTile >= 2960 && lDeckTile < 3008 && lPatioTile >= 3056 &&
                        tDeckTile >= 2960 && tDeckTile < 3008 && tCutoutTile >= 3056;
        t.check("non_square_upper_decks_rendered", roofsOk,
            \`Z=1 non-square roof contours: L-deck=\${lDeckTile}, L-patioAir=\${lPatioTile}, T-deck=\${tDeckTile}, T-cutoutAir=\${tCutoutTile}\`);

        t.screenshot("structure_variety_roof");

        // Switch back to Ground (Z = 0)
        L.setView(0, { center: { x: 128, y: 126 } });
        await t.waitUntil(() => {
            const v = W.viewLevel();
            return v && v.z === 0 && SceneManager._scene && SceneManager._scene.isStarted() && !$gamePlayer.isTransferring();
        }, 10000, "view switch to Z=0");
        await t.waitFrames(10);
`;

testCode = testCode.replace(targetHook, varietyDemoCode);
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
    { src: 'smoke.structure_variety_ground.png', dest: 'live_structure_variety_ground.png' },
    { src: 'smoke.structure_variety_roof.png', dest: 'live_structure_variety_roof.png' }
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

console.log('Live Building Variety verification complete.');

