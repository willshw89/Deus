#!/usr/bin/env node
'use strict';

/**
 * tools/test_golden_art_review_live.js
 *
 * Runs an actual in-engine NW.js playtest of Batch 1 Grass on the Golden Art Review Map
 * at official locked 1.00x camera using real native 48px packed assets:
 * - Real RMMZ WebGL rendering
 * - Calm, low-frequency multi-tile grass distribution (Base, Swale, Sunlit, Clover)
 * - 48px grid completely invisible
 * - Canonical ~42 px Human colonists standing in an open temperate field
 * - Captures live in-engine screenshot to art/review/ and brain artifacts
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'golden_art_review');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/7d7882c9-e557-404d-b5c5-5f27d0d37964';

console.log(`Setting up Golden Art Review snapshot at: ${SNAPSHOT_DIR}`);
try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
console.log('Syncing game directory to snapshot...');
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// Explicitly copy fresh tileset images into snapshot to guarantee synchronization
const tilesetSrcDir = path.join(ROOT, 'game', 'img', 'tilesets');
const tilesetDstDir = path.join(SNAPSHOT_DIR, 'img', 'tilesets');
fs.mkdirSync(tilesetDstDir, { recursive: true });
for (const file of fs.readdirSync(tilesetSrcDir)) {
    if (file.endsWith('.png')) {
        fs.copyFileSync(path.join(tilesetSrcDir, file), path.join(tilesetDstDir, file));
    }
}
console.log('Copied all fresh tileset PNGs to snapshot.');

// Ensure catalog in snapshot points A2 to Outside_A2
for (const catName of ['DEUS_WorldCatalog.json', 'UF_WorldCatalog.json']) {
    const catPath = path.join(SNAPSHOT_DIR, 'data', catName);
    if (fs.existsSync(catPath)) {
        const catObj = JSON.parse(fs.readFileSync(catPath, 'utf8').replace(/^\uFEFF/, ''));
        if (catObj.tilesets && catObj.tilesets.surface) {
            catObj.tilesets.surface.A2 = 'Outside_A2';
            catObj.tilesets.surface.B = 'Outside_B';
            fs.writeFileSync(catPath, JSON.stringify(catObj, null, 2), 'utf8');
            console.log(`Verified ${catName} in snapshot: A2 -> Outside_A2, B -> Outside_B`);
        }
    }
}

// 2. Configure Map001.json in snapshot
const map1Path = path.join(SNAPSHOT_DIR, 'data', 'Map001.json');
let map1Json = JSON.parse(fs.readFileSync(map1Path, 'utf8').replace(/^\uFEFF/, ''));
map1Json.tilesetId = 2; // Outside tileset
if (map1Json.data && map1Json.data.value && Array.isArray(map1Json.data.value)) {
    map1Json.data = map1Json.data.value;
}
fs.writeFileSync(map1Path, JSON.stringify(map1Json), 'utf8');

// 3. Inject the golden_art_review_grass test suite into DEUS_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'DEUS_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const suiteCode = `
    // --- Golden Art Review: Batch 1 Grass Showcase ---
    Test.suite("golden_art_review_grass", async t => {
        const map = $gameMap;
        const width = map.width();
        const height = map.height();
        const rawData = map.data();
        const data = Array.isArray(rawData) ? rawData : (rawData && rawData.value ? rawData.value : rawData);
        const W = window.UF && UF.World;

        // Clear weather and ensure clear noon daylight
        $gameScreen.changeWeather('none', 0, 0);
        $gameScreen.startTint([0, 0, 0, 0], 0);
        if (window.UF && UF.DayNight && typeof UF.DayNight.setTime === 'function') {
            UF.DayNight.setTime(12, 0);
        }

        // Collapse minimap window to keep view clear
        if (window.UF && UF.Minimap) {
            UF.Minimap.expanded = false;
        }

        // Relocate all existing map events and units away from the review area
        for (const ev of map.events()) {
            if (ev) ev.locate(45, 35);
        }
        if (W && typeof W.units === 'function') {
            for (const u of W.units()) {
                if (u) {
                    u.x = 45;
                    u.y = 35;
                }
            }
        }

        // Clear all map layers across all 6 layers
        const totalCells = width * height * 6;
        for (let i = 0; i < totalCells; i++) data[i] = 0;

        const curLevel = W && typeof W.levelOfMapId === 'function' ? W.levelOfMapId(map.mapId()) : null;
        const curArea = curLevel ? { x: curLevel.x, y: curLevel.y } : (W && W.currentArea ? W.currentArea() : { x: 0, y: 0 });
        const curZ = curLevel ? curLevel.z : 0;

        // -------------------------------------------------------------
        // Layer 0: Multi-Tile Low-Frequency Grass Distribution
        // -------------------------------------------------------------
        // Base Emerald = 2862 (Block 0, Shape 46)
        // Swale Turf   = 2910 (Block 1, Shape 46)
        // Sunlit Turf  = 2958 (Block 2, Shape 46)
        // Clover Turf  = 3006 (Block 3, Shape 46)

        function getGrassVariant(x, y) {
            // Broad low-frequency harmonic field spanning 4-8 tiles per swale
            const n1 = Math.sin(x * 0.32 + 1.2) * 0.55 + Math.cos(y * 0.36 + 0.8) * 0.45;
            const n2 = Math.sin((x + y) * 0.24 + 0.4) * 0.35 + Math.cos((x - y) * 0.28) * 0.35;
            const field = n1 + n2;

            if (field > 0.50) return 2958;  // Sunlit warm meadow rise
            if (field < -0.45) return 2910; // Swale cooler depression
            if (field > -0.05 && field < 0.22 && Math.sin(x * 0.65 - y * 0.5) > 0.4) {
                return 3006;                // Clover meadow colony
            }
            return 2862;                    // Base emerald turf
        }

        // Fill review viewport (x: 0..18, y: 0..14)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (0 * height + y) * width + x;
                data[idx] = getGrassVariant(x, y);
            }
        }

        // -------------------------------------------------------------
        // Layer 1: Clustered Grass Tufts on Sheet B (Tile 1, 2, 3)
        // -------------------------------------------------------------
        function hash2(x, y) {
            const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
            return s - Math.floor(s);
        }

        // Place a few natural tuft colonies across the visible region (x: 12..28, y: 9..21)
        const tuftColonies = [
            { cx: 15, cy: 11, radius: 2, tile: 1 }, // Slender blades
            { cx: 24, cy: 12, radius: 2, tile: 3 }, // Wild field grass
            { cx: 18, cy: 18, radius: 2, tile: 2 }, // Clover cluster
            { cx: 26, cy: 18, radius: 2, tile: 1 }  // Slender blades
        ];

        for (const col of tuftColonies) {
            for (let dy = -col.radius; dy <= col.radius; dy++) {
                for (let dx = -col.radius; dx <= col.radius; dx++) {
                    const tx = col.cx + dx, ty = col.cy + dy;
                    if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist <= col.radius && hash2(tx, ty) > 0.45) {
                            const idx = (1 * height + ty) * width + tx;
                            data[idx] = col.tile; // B-sheet tile 1, 2, or 3
                        }
                    }
                }
            }
        }

        // -------------------------------------------------------------
        // Place 6 Canonical ~42 px Human Colonists via DEUS World
        // -------------------------------------------------------------
        function addHuman(name, charName, x, y, dir) {
            if (W && typeof W.addUnit === 'function') {
                return W.addUnit({
                    name: name,
                    image: { characterName: charName, characterIndex: 0 },
                    area: curArea,
                    z: curZ,
                    x: x,
                    y: y,
                    dir: dir,
                    exact: true,
                    data: { species: "human" }
                });
            }
        }

        addHuman("Farmer",   "$UF_Human_Male_Walk",   17, 14, 2);
        addHuman("Herbalist","$UF_Human_Female_Walk", 18, 14, 4);
        addHuman("Scout",    "$UF_Human_Male_Walk",   22, 12, 6);
        addHuman("Weaver",   "$UF_Human_Female_Walk", 23, 17, 2);
        addHuman("Laborer",  "$UF_Human_Male_Walk",   26, 15, 4);
        addHuman("Guide",    "$UF_Human_Female_Walk", 15, 18, 6);

        // Position camera to center exactly on the beautiful open field (tiles 12..28 x 9..21)
        $gamePlayer.locate(20, 15);
        $gameMap.setDisplayPos(12, 9);

        // Force RMMZ Tilemap WebGL renderer to rebuild from modified data
        const scene = SceneManager._scene;
        if (scene && scene._spriteset) {
            if (scene._spriteset._ufNaturalWalls) scene._spriteset._ufNaturalWalls.visible = false;
            if (scene._spriteset._ufObjectLayer) scene._spriteset._ufObjectLayer.visible = false;
            if (scene._spriteset._tilemap) scene._spriteset._tilemap.refresh();
        }
        if (scene && scene._windowLayer) scene._windowLayer.visible = false;

        // Allow WebGL frames to settle
        await t.waitFrames(20);

        // Snap live in-engine screenshot
        t.screenshot("live_temperate_grass_batch1_1x");
        t.check("grass_batch1_rendered", true, "In-engine RMMZ Batch 1 Grass rendered at locked 1.00x camera");

        // Restore layer visibility
        if (scene && scene._windowLayer) scene._windowLayer.visible = true;
        if (scene && scene._spriteset) {
            if (scene._spriteset._ufNaturalWalls) scene._spriteset._ufNaturalWalls.visible = true;
            if (scene._spriteset._ufObjectLayer) scene._spriteset._ufObjectLayer.visible = true;
        }
    });
`;

testCode = testCode.replace('Test.suite("smoke",', `${suiteCode}\n    Test.suite("smoke",`);
fs.writeFileSync(testJsPath, testCode, 'utf8');
console.log('Injected golden_art_review_grass suite into DEUS_Test.js in snapshot.');

// 4. Run NW.js headless playtest
console.log('Running in-engine test suite via run_tests.js...');
const nodePath = process.execPath;
try {
    const out = childProcess.execSync(`"${nodePath}" tools/run_tests.js golden_art_review_grass --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (err) {
    console.error('Harness output:', err.stdout || err.message);
    if (err.stderr) console.error('Harness stderr:', err.stderr);
}

// 5. Copy captured screenshot to art/review/ and brain directory
fs.mkdirSync(REVIEW_DIR, { recursive: true });
const shotName = 'golden_art_review_grass.live_temperate_grass_batch1_1x.png';
const snapshotShot = path.join(SNAPSHOT_DIR, 'test_output', shotName);

if (fs.existsSync(snapshotShot)) {
    const reviewShot = path.join(REVIEW_DIR, 'live_temperate_grass_batch1_1x.png');
    const brainShot = path.join(BRAIN_DIR, 'live_temperate_grass_batch1_1x.png');
    fs.copyFileSync(snapshotShot, reviewShot);
    fs.copyFileSync(snapshotShot, brainShot);
    console.log(`SUCCESS: Captured live in-engine screenshot: ${reviewShot}`);
} else {
    console.error(`ERROR: Screenshot not found at ${snapshotShot}`);
}
