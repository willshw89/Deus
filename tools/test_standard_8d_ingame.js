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
try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
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
        if (W && typeof W.areaMapId === 'function') {
            const curLevel0 = typeof W.levelOfMapId === 'function' ? W.levelOfMapId($gameMap.mapId()) : null;
            const curArea0 = curLevel0 ? { x: curLevel0.x, y: curLevel0.y } : (W && W.currentArea ? W.currentArea() : { x: 0, y: 0 });
            const groundMapId = W.areaMapId(curArea0.x, curArea0.y, 0);
            if ($gameMap.mapId() !== groundMapId) {
                $gamePlayer.reserveTransfer(groundMapId, 15, 15, 2, 0);
                await t.waitFrames(45);
            }
        }

        const curLevel = W && typeof W.levelOfMapId === 'function' ? W.levelOfMapId($gameMap.mapId()) : null;
        const curArea = curLevel ? { x: curLevel.x, y: curLevel.y } : (W && W.currentArea ? W.currentArea() : { x: 0, y: 0 });
        const curZ = curLevel ? curLevel.z : 0;
        const px = $gamePlayer.x || 15;
        const py = $gamePlayer.y || 15;

        // Ensure 8-Directional 48x48 framing is used by Sprite_Character for 8D sheets
        const _origUpdateCharFrame = Sprite_Character.prototype.updateCharacterFrame;
        const dir8ToRow = { 2: 0, 1: 1, 4: 2, 7: 3, 8: 4, 9: 5, 6: 6, 3: 7 };
        Sprite_Character.prototype.updateCharacterFrame = function() {
            if (this._character && this._character._testFrame) {
                const tf = this._character._testFrame;
                this.setFrame(tf.col * 48, tf.row * 48, 48, 48);
                return;
            }
            if (this._character && this._character._is8D) {
                const row = dir8ToRow[this._character.direction()] !== undefined ? dir8ToRow[this._character.direction()] : 0;
                const col = this._character.pattern();
                this.setFrame(col * 48, row * 48, 48, 48);
                return;
            }
            _origUpdateCharFrame.call(this);
        };

        // Move all non-showcase events away from the viewport
        for (const ev of $gameMap.events()) {
            if (!ev) continue;
            const evName = (ev.event() && ev.event().name) || '';
            if (!evName.startsWith('Elf ')) {
                ev.locate(px + 40, py - 30);
            }
        }

        const cx = 22;
        const cy = 20;

        function addShowcaseUnit(spec, dir, pattern, stepAnime) {
            const u = W.addUnit(Object.assign({ exact: true, area: curArea, z: curZ, data: { species: "elf" } }, spec));
            if (u && u.eventId) {
                const ev = $gameMap.event(u.eventId);
                if (ev) {
                    ev.setDirection(dir);
                    ev.setDirectionFix(true);
                    ev._is8D = true;
                    const r = dir8ToRow[dir] !== undefined ? dir8ToRow[dir] : 0;
                    if (pattern !== undefined) {
                        ev.setPattern(pattern);
                        ev._testFrame = { col: pattern, row: r };
                    }
                    if (stepAnime) {
                        ev.setStepAnime(true);
                    }
                }
            }
            return u;
        }

        const facings8 = [
            { name: "S",  dir: 2 },
            { name: "SW", dir: 1 },
            { name: "W",  dir: 4 },
            { name: "NW", dir: 7 },
            { name: "N",  dir: 8 },
            { name: "NE", dir: 9 },
            { name: "E",  dir: 6 },
            { name: "SE", dir: 3 }
        ];

        if (W && curArea) {
            // --- TOP SECTOR: 8-Directional Formations ---
            // Row -5: Adult Male Walkers (8 facings walking in place)
            facings8.forEach((f, i) => {
                addShowcaseUnit({ name: "Elf Male Walk " + f.name, image: { characterName: "$UF_Elf_Male_8D", characterIndex: 0 }, x: cx - 4 + i, y: cy - 5 }, f.dir, undefined, true);
            });

            // Row -4: Adult Female Walkers (8 facings walking in place)
            facings8.forEach((f, i) => {
                addShowcaseUnit({ name: "Elf Female Walk " + f.name, image: { characterName: "$UF_Elf_Female_8D", characterIndex: 0 }, x: cx - 4 + i, y: cy - 4 }, f.dir, undefined, true);
            });

            // Row -3: Elf Child Walkers (8 facings walking in place)
            facings8.forEach((f, i) => {
                addShowcaseUnit({ name: "Elf Child Walk " + f.name, image: { characterName: "$UF_Elf_Child_8D", characterIndex: 0 }, x: cx - 4 + i, y: cy - 3 }, f.dir, undefined, true);
            });

            // --- MID SECTOR: Combat & Action Demographics Lineup ---
            // Row -1: Melee Attack (Male, Female, Child lunging with crescent slashes)
            facings8.slice(0, 4).forEach((f, i) => {
                addShowcaseUnit({ name: "Elf M Strike " + f.name, image: { characterName: "$UF_Elf_Male_Attack_8D", characterIndex: 0 }, x: cx - 4 + i, y: cy - 1 }, f.dir, 1, false);
            });
            facings8.slice(0, 4).forEach((f, i) => {
                addShowcaseUnit({ name: "Elf F Strike " + f.name, image: { characterName: "$UF_Elf_Female_Attack_8D", characterIndex: 0 }, x: cx + i, y: cy - 1 }, f.dir, 1, false);
            });

            // Row 0: Ranged Bows (Male, Female, Child aiming longbows & training bows)
            facings8.slice(0, 4).forEach((f, i) => {
                addShowcaseUnit({ name: "Elf M Bow " + f.name, image: { characterName: "$UF_Elf_Male_Bow_8D", characterIndex: 0 }, x: cx - 4 + i, y: cy }, f.dir, 1, false);
            });
            facings8.slice(0, 4).forEach((f, i) => {
                addShowcaseUnit({ name: "Elf C Bow " + f.name, image: { characterName: "$UF_Elf_Child_Bow_8D", characterIndex: 0 }, x: cx + i, y: cy }, f.dir, 1, false);
            });

            // Row 1: Arcane Magic (Male, Female, Child casting radiant emerald mana glowing hands)
            facings8.slice(0, 4).forEach((f, i) => {
                addShowcaseUnit({ name: "Elf F Magic " + f.name, image: { characterName: "$UF_Elf_Female_Magic_8D", characterIndex: 0 }, x: cx - 4 + i, y: cy + 1 }, f.dir, 1, false);
            });
            facings8.slice(0, 4).forEach((f, i) => {
                addShowcaseUnit({ name: "Elf C Magic " + f.name, image: { characterName: "$UF_Elf_Child_Magic_8D", characterIndex: 0 }, x: cx + i, y: cy + 1 }, f.dir, 1, false);
            });

            // Row 2: Crafting & Gathering (Father carving, Mother crafting, Child gathering berries)
            facings8.slice(0, 3).forEach((f, i) => {
                addShowcaseUnit({ name: "Elf M Work " + f.name, image: { characterName: "$UF_Elf_Male_Work_8D", characterIndex: 0 }, x: cx - 4 + i, y: cy + 2 }, f.dir, 1, false);
            });
            facings8.slice(0, 3).forEach((f, i) => {
                addShowcaseUnit({ name: "Elf F Work " + f.name, image: { characterName: "$UF_Elf_Female_Work_8D", characterIndex: 0 }, x: cx - 1 + i, y: cy + 2 }, f.dir, 1, false);
            });
            facings8.slice(0, 2).forEach((f, i) => {
                addShowcaseUnit({ name: "Elf C Work " + f.name, image: { characterName: "$UF_Elf_Child_Work_8D", characterIndex: 0 }, x: cx + 2 + i, y: cy + 2 }, f.dir, 1, false);
            });

            // --- BOTTOM SECTOR: Downed & Family Group ---
            // Row 4: Downed & Sleeping Demographics
            addShowcaseUnit({ name: "Elf M Hurt",       image: { characterName: "$UF_Elf_Male_Dead_8D", characterIndex: 0 }, x: cx - 4, y: cy + 4 }, 2, 0, false);
            addShowcaseUnit({ name: "Elf F Collapse",   image: { characterName: "$UF_Elf_Female_Dead_8D", characterIndex: 0 }, x: cx - 2, y: cy + 4 }, 2, 1, false);
            addShowcaseUnit({ name: "Elf C Sleep",      image: { characterName: "$UF_Elf_Child_Dead_8D", characterIndex: 0 }, x: cx,     y: cy + 4 }, 2, 2, false);
            addShowcaseUnit({ name: "Elf M Fallen",     image: { characterName: "$UF_Elf_Male_Dead_8D", characterIndex: 0 }, x: cx + 2, y: cy + 4 }, 2, 2, false);
            addShowcaseUnit({ name: "Elf F Fallen",     image: { characterName: "$UF_Elf_Female_Dead_8D", characterIndex: 0 }, x: cx + 4, y: cy + 4 }, 2, 2, false);

            // Row 5: Intimate Family Group (Father, Mother, Child standing side-by-side)
            addShowcaseUnit({ name: "Father Guard", image: { characterName: "$UF_Elf_Male_8D", characterIndex: 0 }, x: cx - 1, y: cy + 6 }, 2, 1, false);
            addShowcaseUnit({ name: "Mother Sylvan", image: { characterName: "$UF_Elf_Female_8D", characterIndex: 0 }, x: cx + 1, y: cy + 6 }, 2, 1, false);
            addShowcaseUnit({ name: "Child Youth", image: { characterName: "$UF_Elf_Child_8D", characterIndex: 0 }, x: cx, y: cy + 6 }, 2, 1, false);
        }

        // Center camera directly on the showcase center
        $gamePlayer.locate(cx, cy + 1);

        // Hide Look tooltip for clean screenshot
        if (window.UF && UF.Look && typeof UF.Look.hide === 'function') {
            UF.Look.hide();
        }
        if (SceneManager._scene && SceneManager._scene._windowLayer) {
            for (const w of SceneManager._scene._windowLayer.children) {
                if (w && w.constructor && (w.constructor.name === 'Window_UFLook' || w._isUFLook)) {
                    w.visible = false;
                }
            }
        }

        // Capture in-game screenshots at Zoom Levels 0 (3x closeup), 1 (2x normal), and 2 (1x wide)
        if (UF.Camera && typeof UF.Camera.setLevel === 'function') {
            UF.Camera.setLevel(1);
        }
        await t.waitFrames(30);
        t.screenshot("standard_8d_live_normal");

        if (UF.Camera && typeof UF.Camera.setLevel === 'function') {
            UF.Camera.setLevel(0);
        }
        await t.waitFrames(30);
        t.screenshot("standard_8d_live_closeup");

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
const normalFile = path.join(REVIEW_DIR, 'standard_8d_live_normal.png');
const closeupFile = path.join(REVIEW_DIR, 'standard_8d_live_closeup.png');
const targetFile = fs.existsSync(normalFile) ? normalFile : closeupFile;
if (fs.existsSync(targetFile)) {
    const buf = fs.readFileSync(targetFile);
    const img = decodePNG(buf, path.basename(targetFile));

    // Crop center area around the player/units
    const cw = Math.min(img.width, 860);
    const ch = Math.min(img.height, 640);
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
