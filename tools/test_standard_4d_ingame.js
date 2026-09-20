#!/usr/bin/env node
'use strict';

/**
 * tools/test_standard_4d_ingame.js
 *
 * In-engine NW.js test harness for the Standard 4-Directional Charset Suite:
 * - 100% Native RMMZ 3x4 Sheets ($UF_Elf_*.png)
 * - 4 Facings: Down (2), Left (4), Right (6), Up (8)
 * - 7 Core Actions: Walk, Attack, Bow, Magic, Work, Downed, Haul
 * - 3 Demographics: Adult Male, Adult Female, Elf Child
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'standard_4d_live');
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

console.log(`Setting up 4D Standard in-game test snapshot at: ${SNAPSHOT_DIR}`);
try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Inject live 4D Showcase into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const showcaseCode = `
        // --- Live In-Game 4-Directional Standard Charset Showcase ---
        const W = window.UF && UF.World;
        const curLevel = W && typeof W.levelOfMapId === 'function' ? W.levelOfMapId($gameMap.mapId()) : null;
        const curArea = curLevel ? { x: curLevel.x, y: curLevel.y } : (W && W.currentArea ? W.currentArea() : { x: 0, y: 0 });
        const curZ = curLevel ? curLevel.z : 0;
        const px = $gamePlayer.x || 15;
        const py = $gamePlayer.y || 15;

        // Move non-showcase events away
        for (const ev of $gameMap.events()) {
            if (!ev) continue;
            const evName = (ev.event() && ev.event().name) || '';
            if (!evName.startsWith('Elf 4D')) {
                ev.locate(px + 40, py - 30);
            }
        }

        function addShowcaseUnit(name, sheet, x, y, dir, pattern, stepAnime) {
            if (W && typeof W.setObject === 'function') {
                W.setObject(curArea.x, curArea.y, x, y, 0, curZ);
            }
            const u = W.addUnit({
                name: name,
                image: { characterName: sheet, characterIndex: 0 },
                area: curArea,
                z: curZ,
                x: x,
                y: y,
                dir: dir,
                exact: true,
                data: { species: "elf" }
            });
            if (u && u.id !== undefined) {
                const evId = typeof W.eventIdOf === 'function' ? W.eventIdOf(u.id) : (1000 + u.id);
                const ev = $gameMap.event(evId);
                if (ev) {
                    ev.setDirection(dir);
                    ev.setDirectionFix(true);
                    if (pattern !== undefined) {
                        ev.setPattern(pattern);
                        ev._originalPattern = pattern;
                    }
                    if (stepAnime) {
                        ev.setStepAnime(true);
                    }
                }
            }
            return u;
        }

        const cx = px;
        const cy = py;

        // Row 0: Adult Male 4D Walkers & Actions (y = cy - 2)
        addShowcaseUnit("Elf 4D Male Walk S",   "$UF_Elf_Male_Walk",   cx - 5, cy - 2, 2, 1, true);
        addShowcaseUnit("Elf 4D Male Walk W",   "$UF_Elf_Male_Walk",   cx - 4, cy - 2, 4, 1, true);
        addShowcaseUnit("Elf 4D Male Walk E",   "$UF_Elf_Male_Walk",   cx - 3, cy - 2, 6, 1, true);
        addShowcaseUnit("Elf 4D Male Walk N",   "$UF_Elf_Male_Walk",   cx - 2, cy - 2, 8, 1, true);
        addShowcaseUnit("Elf 4D Male Haul S",   "$UF_Elf_Male_Haul",   cx + 0, cy - 2, 2, 1, true);
        addShowcaseUnit("Elf 4D Male Attack S", "$UF_Elf_Male_Attack", cx + 1, cy - 2, 2, 1, true);
        addShowcaseUnit("Elf 4D Male Bow W",     "$UF_Elf_Male_Bow",    cx + 2, cy - 2, 4, 1, false);
        addShowcaseUnit("Elf 4D Male Magic N",   "$UF_Elf_Male_Magic",  cx + 3, cy - 2, 8, 1, true);
        addShowcaseUnit("Elf 4D Male Work S",    "$UF_Elf_Male_Work",   cx + 4, cy - 2, 2, 1, true);
        addShowcaseUnit("Elf 4D Male Downed S",  "$UF_Elf_Male_Downed", cx + 5, cy - 2, 2, 2, false);

        // Row 1: Adult Female Formations (y = cy)
        addShowcaseUnit("Elf 4D Fem Walk S",   "$UF_Elf_Female_Walk",   cx - 5, cy, 2, 1, true);
        addShowcaseUnit("Elf 4D Fem Walk W",   "$UF_Elf_Female_Walk",   cx - 4, cy, 4, 1, true);
        addShowcaseUnit("Elf 4D Fem Walk E",   "$UF_Elf_Female_Walk",   cx - 3, cy, 6, 1, true);
        addShowcaseUnit("Elf 4D Fem Walk N",   "$UF_Elf_Female_Walk",   cx - 2, cy, 8, 1, true);
        addShowcaseUnit("Elf 4D Fem Haul S",   "$UF_Elf_Female_Haul",   cx + 0, cy, 2, 1, true);
        addShowcaseUnit("Elf 4D Fem Attack S", "$UF_Elf_Female_Attack", cx + 1, cy, 2, 1, true);
        addShowcaseUnit("Elf 4D Fem Bow W",     "$UF_Elf_Female_Bow",    cx + 2, cy, 4, 1, false);
        addShowcaseUnit("Elf 4D Fem Magic N",   "$UF_Elf_Female_Magic",  cx + 3, cy, 8, 1, true);
        addShowcaseUnit("Elf 4D Fem Work S",    "$UF_Elf_Female_Work",   cx + 4, cy, 2, 1, true);
        addShowcaseUnit("Elf 4D Fem Downed S",  "$UF_Elf_Female_Downed", cx + 5, cy, 2, 2, false);

        // Row 2: Elf Child Formations (y = cy + 2)
        addShowcaseUnit("Elf 4D Kid Walk S",   "$UF_Elf_Child_Walk",   cx - 5, cy + 2, 2, 1, true);
        addShowcaseUnit("Elf 4D Kid Walk W",   "$UF_Elf_Child_Walk",   cx - 4, cy + 2, 4, 1, true);
        addShowcaseUnit("Elf 4D Kid Walk E",   "$UF_Elf_Child_Walk",   cx - 3, cy + 2, 6, 1, true);
        addShowcaseUnit("Elf 4D Kid Walk N",   "$UF_Elf_Child_Walk",   cx - 2, cy + 2, 8, 1, true);
        addShowcaseUnit("Elf 4D Kid Haul S",   "$UF_Elf_Child_Haul",   cx + 0, cy + 2, 2, 1, true);
        addShowcaseUnit("Elf 4D Kid Attack S", "$UF_Elf_Child_Attack", cx + 1, cy + 2, 2, 1, true);
        addShowcaseUnit("Elf 4D Kid Bow W",     "$UF_Elf_Child_Bow",    cx + 2, cy + 2, 4, 1, false);
        addShowcaseUnit("Elf 4D Kid Magic N",   "$UF_Elf_Child_Magic",  cx + 3, cy + 2, 8, 1, true);
        addShowcaseUnit("Elf 4D Kid Work S",    "$UF_Elf_Child_Work",   cx + 4, cy + 2, 2, 1, true);
        addShowcaseUnit("Elf 4D Kid Downed S",  "$UF_Elf_Child_Downed", cx + 5, cy + 2, 2, 2, false);

        if (window.UF && UF.Objects && typeof UF.Objects.refresh === 'function') {
            UF.Objects.refresh();
        }

        // Center player on the showcase lineup
        $gamePlayer.locate(cx, cy);

        // Hide Look tooltip for clean screenshot
        if (window.TouchInput) {
            TouchInput._x = -999;
            TouchInput._y = -999;
        }

        // Capture Zoom Level 0 (3x closeup)
        if (window.UF && UF.Camera && typeof UF.Camera.setLevel === 'function') {
            UF.Camera.setLevel(0);
        }
        await t.waitFrames(40);
        t.screenshot("standard_4d_live_closeup");

        // Capture Zoom Level 1 (2x normal)
        if (window.UF && UF.Camera && typeof UF.Camera.setLevel === 'function') {
            UF.Camera.setLevel(1);
        }
        await t.waitFrames(30);
        t.screenshot("standard_4d_live_normal");
`;

testCode = testCode.replace(targetHook, `${showcaseCode}\n        ${targetHook}`);
fs.writeFileSync(testJsPath, testCode);
console.log('Injected 4D Showcase into UF_Test.js in snapshot.');

// 3. Run NW.js test harness
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
        if (f.startsWith('smoke.standard_4d_live_') && f.endsWith('.png')) {
            const clean = f.replace('smoke.', '');
            const src = path.join(snapOutDir, f);
            fs.copyFileSync(src, path.join(REVIEW_DIR, clean));
            fs.copyFileSync(src, path.join(BRAIN_DIR, clean));
            console.log(`Saved screenshot: art/review/${clean}`);
        }
    }
}

console.log('\n=== In-Engine 4D Live Test Complete! ===');
