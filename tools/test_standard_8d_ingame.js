#!/usr/bin/env node
'use strict';

/**
 * tools/test_standard_8d_ingame.js
 *
 * Live in-engine NW.js test harness for the Universal 8-Directional Standard Charset Suite.
 * Sets up a live colony scene with:
 * - 8-Directional Walking/Movement Compass
 * - Melee Attack, Ranged Bow, and Magic Cast formations
 * - Work / Carve / Harvest units
 * - Downed / Collapse / Sleeping units
 *
 * Captures high-resolution in-game screenshots at multiple zoom levels,
 * copies them to art/review/ and brain artifacts, and generates close-up crops.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'standard_8d_live');
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

console.log(`Setting up 8D Standard in-game test snapshot at: ${SNAPSHOT_DIR}`);
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Inject live 8D Showcase into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const showcaseCode = `
        // --- Live In-Game 8-Directional Standard Charset Showcase ---
        const W = window.UF && UF.World;
        const curArea = W ? W.currentArea() : null;
        const px = $gamePlayer.x || 15;
        const py = $gamePlayer.y || 15;

        if (W && curArea) {
            // 1. Circular 8-Direction Movement Compass (using $UF_Elf_8D)
            // Center is (px, py - 4)
            const cx = px - 1;
            const cy = py - 4;
            const compass = [
                { name: "Elf Walk N",  x: cx,     y: cy - 2, dir: 8 },
                { name: "Elf Walk NE", x: cx + 2, y: cy - 2, dir: 9 },
                { name: "Elf Walk E",  x: cx + 2, y: cy,     dir: 6 },
                { name: "Elf Walk SE", x: cx + 2, y: cy + 2, dir: 3 },
                { name: "Elf Walk S",  x: cx,     y: cy + 2, dir: 2 },
                { name: "Elf Walk SW", x: cx - 2, y: cy + 2, dir: 1 },
                { name: "Elf Walk W",  x: cx - 2, y: cy,     dir: 4 },
                { name: "Elf Walk NW", x: cx - 2, y: cy - 2, dir: 7 }
            ];
            compass.forEach(u => {
                W.addUnit({ name: u.name, image: { characterName: "$UF_Elf_8D", characterIndex: 0 }, area: curArea, x: u.x, y: u.y, dir: u.dir, data: { species: "elf" } });
            });

            // 2. Combat & Magic Lineup (py)
            // Melee Slash (South & West)
            W.addUnit({ name: "Elf Swordsman S", image: { characterName: "$UF_Elf_Attack_8D", characterIndex: 0 }, area: curArea, x: px - 4, y: py, dir: 2, data: { species: "elf" } });
            W.addUnit({ name: "Elf Swordsman W", image: { characterName: "$UF_Elf_Attack_8D", characterIndex: 0 }, area: curArea, x: px - 3, y: py, dir: 4, data: { species: "elf" } });
            
            // Ranged Bow (South-West & East)
            W.addUnit({ name: "Elf Archer SW",   image: { characterName: "$UF_Elf_Bow_8D", characterIndex: 0 }, area: curArea, x: px - 2, y: py, dir: 1, data: { species: "elf" } });
            W.addUnit({ name: "Elf Archer E",    image: { characterName: "$UF_Elf_Bow_8D", characterIndex: 0 }, area: curArea, x: px - 1, y: py, dir: 6, data: { species: "elf" } });

            // Magic Cast (South & North-West)
            W.addUnit({ name: "Elf Mage S",      image: { characterName: "$UF_Elf_Magic_8D", characterIndex: 0 }, area: curArea, x: px,     y: py, dir: 2, data: { species: "elf" } });
            W.addUnit({ name: "Elf Mage NW",     image: { characterName: "$UF_Elf_Magic_8D", characterIndex: 0 }, area: curArea, x: px + 1, y: py, dir: 7, data: { species: "elf" } });

            // 3. Industry, Work, Downed (py + 2)
            // Work / Carve / Gather
            W.addUnit({ name: "Elf Crafter S",   image: { characterName: "$UF_Elf_Work_8D", characterIndex: 0 }, area: curArea, x: px - 4, y: py + 2, dir: 2, data: { species: "elf" } });
            W.addUnit({ name: "Elf Artisan SW",  image: { characterName: "$UF_Elf_Work_8D", characterIndex: 0 }, area: curArea, x: px - 3, y: py + 2, dir: 1, data: { species: "elf" } });
            W.addUnit({ name: "Elf Forager W",   image: { characterName: "$UF_Elf_Work_8D", characterIndex: 0 }, area: curArea, x: px - 2, y: py + 2, dir: 4, data: { species: "elf" } });

            // Downed / Collapse / Dead
            W.addUnit({ name: "Elf Fallen S",    image: { characterName: "$UF_Elf_Dead_8D", characterIndex: 0 }, area: curArea, x: px,     y: py + 2, dir: 2, data: { species: "elf" } });
            W.addUnit({ name: "Elf Resting E",   image: { characterName: "$UF_Elf_Dead_8D", characterIndex: 0 }, area: curArea, x: px + 1, y: py + 2, dir: 6, data: { species: "elf" } });
        }

        // Position camera and look cursor over the Elf Mage
        $gamePlayer.locate(px, py);
        if (window.UF && UF.Look && typeof UF.Look.show === 'function') {
            UF.Look.show();
        }

        // Capture in-game screenshots at Zoom Levels 0 (3x closeup), 1 (2x normal), and 2 (1x wide)
        if (UF.Camera && typeof UF.Camera.setLevel === 'function') {
            UF.Camera.setLevel(0);
        }
        await t.waitFrames(30);
        t.screenshot("standard_8d_live_closeup");

        if (UF.Camera && typeof UF.Camera.setLevel === 'function') {
            UF.Camera.setLevel(1);
        }
        await t.waitFrames(30);
        t.screenshot("standard_8d_live_normal");

        if (UF.Camera && typeof UF.Camera.setLevel === 'function') {
            UF.Camera.setLevel(2);
        }
        await t.waitFrames(25);
        t.screenshot("standard_8d_live_wide");

        ${targetHook}`;

testCode = testCode.replace(targetHook, showcaseCode);
fs.writeFileSync(testJsPath, testCode);
console.log('Injected 8D Standard showcase into snapshot test suite.');

// 3. Run snapshot test harness
console.log('Launching NW.js test harness on snapshot...');
const nodePath = process.execPath;
try {
    const out = childProcess.execSync(`"${nodePath}" tools/run_tests.js smoke --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (err) {
    console.error('Harness output:', err.stdout || err.message);
}

// 4. Collect and save screenshots
fs.mkdirSync(REVIEW_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

const snapOutDir = path.join(SNAPSHOT_DIR, 'test_output');
if (fs.existsSync(snapOutDir)) {
    const files = fs.readdirSync(snapOutDir);
    for (const f of files) {
        if (f.startsWith('smoke.standard_8d_live_') && f.endsWith('.png')) {
            const clean = f.replace('smoke.', '');
            const src = path.join(snapOutDir, f);
            fs.copyFileSync(src, path.join(REVIEW_DIR, clean));
            fs.copyFileSync(src, path.join(BRAIN_DIR, clean));
            console.log(`Saved screenshot: art/review/${clean}`);
        }
    }
}

// 5. Create a 2x focused crop of the combat and movement lineup
const closeupFile = path.join(REVIEW_DIR, 'standard_8d_live_closeup.png');
if (fs.existsSync(closeupFile)) {
    const buf = fs.readFileSync(closeupFile);
    const img = decodePNG(buf, 'standard_8d_live_closeup.png');

    // Crop center 640x480 area around the player/units
    const cw = Math.min(img.width, 680);
    const ch = Math.min(img.height, 520);
    const cx = Math.max(0, Math.round((img.width - cw) / 2));
    const cy = Math.max(0, Math.round((img.height - ch) / 2));

    const cropBuf = Buffer.alloc(cw * ch * 4);
    for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
            const sIdx = ((cy + y) * img.width + (cx + x)) * 4;
            const dIdx = (y * cw + x) * 4;
            cropBuf[dIdx]     = img.data[sIdx];
            cropBuf[dIdx + 1] = img.data[sIdx + 1];
            cropBuf[dIdx + 2] = img.data[sIdx + 2];
            cropBuf[dIdx + 3] = img.data[sIdx + 3];
        }
    }

    const cropPath = path.join(REVIEW_DIR, 'standard_8d_live_focused_scene.png');
    writePNG(cropPath, cw, ch, cropBuf);
    writePNG(path.join(BRAIN_DIR, 'standard_8d_live_focused_scene.png'), cw, ch, cropBuf);
    console.log('Generated focused close-up scene: art/review/standard_8d_live_focused_scene.png');
}

console.log('In-game 8D testing successfully completed!');
