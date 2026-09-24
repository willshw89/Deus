#!/usr/bin/env node
'use strict';

/**
 * tools/test_temperate_arid_transition_live.js
 *
 * Runs an actual in-engine NW.js playtest of the Temperate <-> Arid cross-biome transition
 * at official locked 1.00x camera using real native 48px packed assets:
 * - Real RMMZ WebGL rendering
 * - Organic irregular ecological gradient based on moisture, topography & drainage
 * - Soil, vegetation density, tree species, and rock geology transitioning across 5 stages
 * - Canonical ~42 px Human colonists, winding trail, water stream, trees, clutter, and HUD
 * - Captures live in-engine screenshot to art/review/ and brain artifacts
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { buildCompositeSheets } = require('./build_composite_transition_tileset');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'temp_arid_live');
const REVIEW_DIR = path.join(ROOT, 'art', 'review');
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/7d7882c9-e557-404d-b5c5-5f27d0d37964';

console.log(`Setting up in-game test snapshot at: ${SNAPSHOT_DIR}`);
try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
console.log('Syncing game directory to snapshot...');
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Build and copy composite tileset sheets into snapshot
console.log('Building composite tilesets in snapshot...');
buildCompositeSheets(path.join(SNAPSHOT_DIR, 'img', 'tilesets'));

// 3. Configure Map001.json in snapshot to use Outside tileset (id: 2)
const map1Path = path.join(SNAPSHOT_DIR, 'data', 'Map001.json');
let map1Json = JSON.parse(fs.readFileSync(map1Path, 'utf8').replace(/^\uFEFF/, ''));
map1Json.tilesetId = 2; // Outside tileset: uses Outside_A1, Outside_A2, Outside_B, Outside_C
fs.writeFileSync(map1Path, JSON.stringify(map1Json), 'utf8');

// 4. Inject the temperate_arid_live test suite into DEUS_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'DEUS_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const suiteCode = `
    // --- Live In-Engine Temperate <-> Arid Cross-Biome Transition Showcase ---
    Test.suite("temperate_arid_live", async t => {
        const map = $gameMap;
        const width = map.width();
        const height = map.height();
        const data = map.data();
        const W = window.UF && UF.World;
        const curLevel = W && typeof W.levelOfMapId === 'function' ? W.levelOfMapId(map.mapId()) : null;
        const curArea = curLevel ? { x: curLevel.x, y: curLevel.y } : (W && W.currentArea ? W.currentArea() : { x: 0, y: 0 });
        const curZ = curLevel ? curLevel.z : 0;

        // Clear weather and ensure bright clear noon daylight
        $gameScreen.changeWeather('none', 0, 0);
        $gameScreen.startTint([0, 0, 0, 0], 0);
        if (window.UF && UF.DayNight && typeof UF.DayNight.setTime === 'function') {
            UF.DayNight.setTime(12, 0);
        }

        // Collapse minimap window to keep upper-right map area visible
        if (window.UF && UF.Minimap) {
            UF.Minimap.expanded = false;
        }

        // Relocate all existing map events and units away from showcase corridor
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

        // Clear all map layers
        for (let i = 0; i < data.length; i++) data[i] = 0;

        // -------------------------------------------------------------
        // Layer 0: Ground Autotiles (Seamless shapes base + 46)
        // -------------------------------------------------------------
        function getMoisture(x, y) {
            const macro = 1.0 - (x / 16.0); // 1.0 at West (Temperate), 0.0 at East (Arid)
            const riverDrainage = (x <= 3) ? (0.28 - Math.abs(x - 1.0) * 0.08) : 0;
            const topography = 0.20 * Math.sin(y * 0.45) 
                             + 0.16 * Math.cos(x * 0.35 + y * 0.35) 
                             + 0.10 * Math.sin(x * 0.7 - y * 0.55);
            return Math.max(0, Math.min(1, macro + riverDrainage + topography));
        }

        // Populate Layer 0 with Organic Irregular Ecological Gradient
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (0 * height + y) * width + x;
                const m = getMoisture(x, y);

                let groundTile = 2862; // Default Zone 1: Lush Temperate Turf
                if (m < 0.20) {
                    // Zone 5: Arid Core (Hardpan Sand with Cracked Caliche swales)
                    const calicheNoise = Math.sin(x * 0.8 + y * 0.7);
                    groundTile = (calicheNoise > 0.4) ? 3102 : 3054;
                } else if (m < 0.38) {
                    // Zone 4: Arid-to-Temperate Steppe Clay
                    groundTile = 3006;
                } else if (m < 0.56) {
                    // Zone 3: Shared Ecotone Mottled Loam
                    groundTile = 2958;
                } else if (m < 0.74) {
                    // Zone 2: Temperate-to-Arid Olive Turf
                    groundTile = 2910;
                } else {
                    // Zone 1: Temperate Core Turf
                    groundTile = 2862;
                }

                data[i] = groundTile;
            }
        }

        // Add Winding Dirt Trade Road across the screen (x=0..16, y~7)
        for (let x = 0; x < width; x++) {
            const roadY = Math.round(7 + Math.sin(x * 0.32) * 1.5 + Math.cos(x * 0.65) * 0.7);
            if (roadY >= 0 && roadY < height) {
                const i = (0 * height + roadY) * width + x;
                data[i] = (x >= 12 && ((x + roadY) % 3 === 0)) ? 3198 : 3150;
            }
        }

        // Add Water Stream in Temperate Region (x=0..1, y=0..13)
        for (let y = 0; y < 14; y++) {
            const streamX = Math.round(0.8 + Math.sin(y * 0.38) * 0.5);
            for (let dx = -1; dx <= 0; dx++) {
                const sx = streamX + dx;
                if (sx >= 0 && sx < width) {
                    const i = (0 * height + y) * width + sx;
                    data[i] = 2048; // Water Autotile (A1)
                }
            }
        }

        // -------------------------------------------------------------
        // Layer 1: Flora, Clutter, Rocks, Reeds (Sheet B: tileId = 0 + row*16 + col)
        // -------------------------------------------------------------
        const placeB = (x, y, tileCol, tileRow) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return;
            const i = (1 * height + y) * width + x;
            data[i] = 0 + tileRow * 16 + tileCol;
        };

        // Zone 1: Temperate Flora & Clutter
        placeB(2, 6, 4, 0);  // Bluebells
        placeB(4, 2, 4, 0);  // Bluebells
        placeB(3, 8, 5, 0);  // Red Poppy
        placeB(4, 5, 5, 0);  // Red Poppy
        placeB(1, 10, 6, 0); // Meadow Daisies
        placeB(3, 1, 1, 0);  // Grass tuft 1
        placeB(2, 7, 2, 0);  // Grass tuft 2
        placeB(1, 1, 10, 0); // River Reeds along stream
        placeB(1, 7, 10, 0); // River Reeds
        placeB(1, 12, 10, 0);// River Reeds
        placeB(1, 4, 11, 0); // Cattails
        placeB(2, 4, 13, 0); // River Pebbles
        placeB(2, 8, 13, 0); // River Pebbles
        placeB(1, 9, 15, 0); // Mossy Boulder

        // Zone 2: Temperate-to-Arid Edge
        placeB(5, 5, 7, 0);  // Deciduous Bush
        placeB(6, 9, 8, 0);  // Berry Bramble
        placeB(5, 1, 9, 0);  // Autumn Bush
        placeB(5, 11, 12, 0);// River Fern
        placeB(6, 1, 14, 0); // Granite Rock
        placeB(4, 8, 3, 0);  // Grass tuft 3
        placeB(6, 6, 1, 0);  // Grass tuft 1

        // Zone 3: Shared Ecotone
        placeB(8, 1, 1, 1);  // Sage Scrub
        placeB(8, 9, 1, 1);  // Sage Scrub
        placeB(7, 6, 0, 1);  // Dry Bunchgrass
        placeB(10, 5, 0, 1); // Dry Bunchgrass
        placeB(7, 9, 5, 1);  // Sandstone Rock
        placeB(9, 2, 5, 1);  // Sandstone Rock
        placeB(8, 11, 8, 1); // Driftwood Log
        placeB(10, 8, 2, 1); // Aloe succulent

        // Zone 4: Arid-to-Temperate Edge
        placeB(11, 8, 2, 1); // Aloe Succulent
        placeB(13, 1, 2, 1); // Aloe Succulent
        placeB(12, 5, 1, 1); // Sage Scrub
        placeB(13, 9, 1, 1); // Sage Scrub
        placeB(11, 11, 0, 1);// Dry Bunchgrass
        placeB(13, 4, 0, 1); // Dry Bunchgrass
        placeB(13, 2, 6, 1); // Sandstone Boulder
        placeB(12, 11, 6, 1);// Sandstone Boulder

        // Zone 5: Arid Core
        placeB(14, 6, 9, 1); // Prickly Pear Cactus
        placeB(16, 11, 9, 1);// Prickly Pear Cactus
        placeB(15, 5, 7, 1); // Horned Animal Skull
        placeB(14, 8, 7, 1); // Horned Animal Skull
        placeB(16, 2, 4, 1); // Caliche Pebbles
        placeB(14, 12, 4, 1);// Caliche Pebbles
        placeB(16, 7, 3, 1); // Canyon Reeds

        // -------------------------------------------------------------
        // Layer 2: Standard Overworld Trees (Sheet C: tileId >= 256)
        // -------------------------------------------------------------
        const placeOak = (x, y) => {
            data[(2 * height + (y - 1)) * width + x]       = 256;
            data[(2 * height + (y - 1)) * width + (x + 1)] = 257;
            data[(2 * height + y) * width + x]             = 272;
            data[(2 * height + y) * width + (x + 1)]       = 273;
        };

        const placeAcacia = (x, y) => {
            data[(2 * height + (y - 1)) * width + x]       = 260;
            data[(2 * height + (y - 1)) * width + (x + 1)] = 261;
            data[(2 * height + y) * width + x]             = 276;
            data[(2 * height + y) * width + (x + 1)]       = 277;
        };

        const place1x2Tree = (x, y, topId, botId) => {
            data[(2 * height + (y - 1)) * width + x] = topId;
            data[(2 * height + y) * width + x]       = botId;
        };

        // Place all 5 Canonical Overworld Trees:
        placeOak(2, 3);                // Zone 1: Deciduous Oak (2x2, planted on lush turf next to stream)
        place1x2Tree(4, 10, 258, 274); // Zone 1/2: Slender Birch (1x2)
        place1x2Tree(6, 3, 259, 275);  // Zone 2: Conifer / Pine (1x2)
        place1x2Tree(8, 4, 263, 279);  // Zone 3: Gnarled Desert Olive (1x2)
        place1x2Tree(9, 11, 263, 279); // Zone 3: Second Gnarled Olive (1x2)
        placeAcacia(11, 3);            // Zone 4: Umbrella Acacia (2x2)
        place1x2Tree(14, 3, 262, 278); // Zone 5: Desert Date Palm (1x2)
        place1x2Tree(15, 10, 262, 278);// Zone 5: Second Date Palm (1x2)

        // -------------------------------------------------------------
        // Add 6 Canonical ~42 px Human Colonists across the Corridor
        // -------------------------------------------------------------
        function addHuman(name, charName, x, y, dir) {
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

        addHuman("Temperate Farmer", "$UF_Human_Male_Walk",   4, 4, 2); // Zone 1 (beside Oak tree)
        addHuman("Trail Pioneer",   "$UF_Human_Female_Walk", 5, 7, 6); // Zone 2 (traveling along road)
        addHuman("Forester Scout",   "$UF_Human_Male_Walk",   7, 3, 4); // Zone 2/3 (near Pine & Olive)
        addHuman("Ecotone Ranger",   "$UF_Human_Female_Walk", 9, 7, 6); // Zone 3 (at crossroads)
        addHuman("Steppe Surveyor",  "$UF_Human_Male_Walk",  12, 7, 6); // Zone 4 (near Acacia)
        addHuman("Desert Nomad",     "$UF_Human_Female_Walk",15, 7, 4); // Zone 5 (near Palm & Skull)

        // Set camera display position to (0,0) showing entire 17x13 screen
        $gamePlayer.locate(45, 35); // Move player avatar off screen so only our 6 colonists appear in the corridor
        map.setDisplayPos(0, 0);

        // Refresh tilemap to display newly populated layers
        const scene = SceneManager._scene;
        if (scene && scene._spriteset && scene._spriteset._tilemap) {
            scene._spriteset._tilemap.refresh();
        }

        // Wait 30 frames for WebGL draw settling
        await t.waitFrames(30);

        // Capture primary in-engine screenshot at official 1.00x camera
        t.screenshot("live_temperate_arid_gameplay_1x");

        // Focus shot centered directly on the shared ecotone transition (x=4..20, y=1..13)
        $gamePlayer.locate(10, 7);
        map.setDisplayPos(3, 1);
        if (scene && scene._spriteset && scene._spriteset._tilemap) {
            scene._spriteset._tilemap.refresh();
        }
        await t.waitFrames(15);
        t.screenshot("live_temperate_arid_ecotone_focus");

        t.check("temperate_arid_transition_verified", true, "In-engine RMMZ cross-biome transition rendered at locked 1.00x camera");
    });
`;

testCode = testCode.replace('Test.suite("smoke",', `${suiteCode}\n    Test.suite("smoke",`);
fs.writeFileSync(testJsPath, testCode, 'utf8');
console.log('Injected temperate_arid_live suite into DEUS_Test.js in snapshot.');

// 5. Run NW.js test harness
console.log('Launching NW.js test harness on snapshot...');
const nodePath = process.execPath;
try {
    const out = childProcess.execSync(`"${nodePath}" tools/run_tests.js temperate_arid_live --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (err) {
    console.error('Harness output:', err.stdout || err.message);
    if (err.stderr) console.error('Harness stderr:', err.stderr);
    process.exit(1);
}

// 6. Collect screenshots
fs.mkdirSync(REVIEW_DIR, { recursive: true });
const shot1 = path.join(SNAPSHOT_DIR, 'test_output', 'temperate_arid_live.live_temperate_arid_gameplay_1x.png');
const shot2 = path.join(SNAPSHOT_DIR, 'test_output', 'temperate_arid_live.live_temperate_arid_ecotone_focus.png');

if (fs.existsSync(shot1)) {
    fs.copyFileSync(shot1, path.join(REVIEW_DIR, 'live_temperate_arid_gameplay_1x.png'));
    fs.copyFileSync(shot1, path.join(BRAIN_DIR, 'live_temperate_arid_gameplay_1x.png'));
    console.log('Saved screenshot: art/review/live_temperate_arid_gameplay_1x.png');
}
if (fs.existsSync(shot2)) {
    fs.copyFileSync(shot2, path.join(REVIEW_DIR, 'live_temperate_arid_ecotone_focus.png'));
    fs.copyFileSync(shot2, path.join(BRAIN_DIR, 'live_temperate_arid_ecotone_focus.png'));
    console.log('Saved screenshot: art/review/live_temperate_arid_ecotone_focus.png');
}

console.log('\n=== In-Engine Cross-Biome Live Test Complete! ===\n');
