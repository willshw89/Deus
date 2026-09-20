'use strict';

/**
 * tools/test_human_female_variations_live.js
 *
 * Spawns all 6 Adult Female Human variations and action poses
 * in an in-game test snapshot and captures live in-game screenshots.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'human_female_variations_test');
const BRAIN_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';
const REVIEW_DIR = path.join(ROOT, 'art', 'review');

console.log(`Setting up Human Female 6 Variations Live In-Game test snapshot at: ${SNAPSHOT_DIR}`);
try {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
} catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Inject showcase lineup into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
if (!testCode.includes(targetHook)) {
    console.error('Target hook t.screenshot("map") not found in UF_Test.js!');
    process.exit(1);
}

const showcaseCode = `
        // --- Live In-Game Adult Female Human 6 Variations + Actions Showcase ---
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
            if (!evName.startsWith('Female')) {
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
                data: { species: "human" }
            });
            if (u && u.id !== undefined) {
                const evId = typeof W.eventIdOf === 'function' ? W.eventIdOf(u.id) : (1000 + u.id);
                const ev = $gameMap.event(evId);
                if (ev) {
                    ev.setImage(sheet, 0);
                    ev.setDirection(dir);
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

        // Lineup 1 (Row cy - 1): All 6 Variations of Adult Female Human Walk
        addShowcaseUnit("Female Var 1", "$UF_Human_Female_1_Walk", cx - 4, cy - 1, 2, 1, true);
        addShowcaseUnit("Female Var 2", "$UF_Human_Female_2_Walk", cx - 2, cy - 1, 2, 1, true);
        addShowcaseUnit("Female Var 3", "$UF_Human_Female_3_Walk", cx + 0, cy - 1, 2, 1, true);
        addShowcaseUnit("Female Var 4", "$UF_Human_Female_4_Walk", cx + 2, cy - 1, 2, 1, true);
        addShowcaseUnit("Female Var 5", "$UF_Human_Female_5_Walk", cx + 4, cy - 1, 2, 1, true);
        addShowcaseUnit("Female Var 6", "$UF_Human_Female_6_Walk", cx + 6, cy - 1, 2, 1, true);

        // Lineup 2 (Row cy + 1): Specialized Faction Action Poses
        addShowcaseUnit("Female 1 Haul",   "$UF_Human_Female_1_Haul",   cx - 4, cy + 1, 2, 1, true);
        addShowcaseUnit("Female 2 Attack", "$UF_Human_Female_2_Attack", cx - 2, cy + 1, 2, 2, true);
        addShowcaseUnit("Female 3 Attack", "$UF_Human_Female_3_Attack", cx + 0, cy + 1, 2, 2, true);
        addShowcaseUnit("Female 4 Work",   "$UF_Human_Female_4_Work",   cx + 2, cy + 1, 2, 1, true);
        addShowcaseUnit("Female 5 Work",   "$UF_Human_Female_5_Work",   cx + 4, cy + 1, 2, 1, true);
        addShowcaseUnit("Female 6 Bow",    "$UF_Human_Female_6_Bow",    cx + 6, cy + 1, 2, 2, true);

        // Lineup 3 (Row cy + 3): Magic, Downed, and Side Facings
        addShowcaseUnit("Female 1 Magic",  "$UF_Human_Female_1_Magic",  cx - 4, cy + 3, 2, 2, true);
        addShowcaseUnit("Female 2 Side",   "$UF_Human_Female_2_Walk",   cx - 2, cy + 3, 6, 2, true);
        addShowcaseUnit("Female 3 Side",   "$UF_Human_Female_3_Walk",   cx + 0, cy + 3, 6, 0, true);
        addShowcaseUnit("Female 4 Magic",  "$UF_Human_Female_4_Magic",  cx + 2, cy + 3, 2, 2, true);
        addShowcaseUnit("Female 5 Downed", "$UF_Human_Female_5_Downed", cx + 4, cy + 3, 2, 1, false);
        addShowcaseUnit("Female 6 Downed", "$UF_Human_Female_6_Downed", cx + 6, cy + 3, 2, 2, false);

        if (window.UF && UF.Objects && typeof UF.Objects.refresh === 'function') {
            UF.Objects.refresh();
        }

        // Pan camera to center on lineup
        $gamePlayer.locate(cx + 1, cy);

        if (window.TouchInput) {
            TouchInput._x = -999;
            TouchInput._y = -999;
        }

        // Capture Zoom Level 0 (3x closeup)
        if (window.UF && UF.Camera && typeof UF.Camera.setLevel === 'function') {
            UF.Camera.setLevel(0);
        }
        await t.waitFrames(40);
        t.screenshot("female_6_variations_live_closeup");

        // Capture Zoom Level 1 (2x normal)
        if (window.UF && UF.Camera && typeof UF.Camera.setLevel === 'function') {
            UF.Camera.setLevel(1);
        }
        await t.waitFrames(30);
        t.screenshot("female_6_variations_live_normal");
`;

testCode = testCode.replace(targetHook, showcaseCode + '\n        ' + targetHook);
fs.writeFileSync(testJsPath, testCode);
console.log('Injected Female 6 Variations lineup into snapshot UF_Test.js');

// 3. Run test using run_tests.js against snapshot
console.log('Running in-engine smoke test on snapshot...');
const testResult = childProcess.spawnSync(
    'C:\\Program Files\\nodejs\\node.exe',
    ['tools/run_tests.js', 'smoke', '--game', SNAPSHOT_DIR],
    { cwd: ROOT, encoding: 'utf8' }
);

console.log(testResult.stdout || '');
if (testResult.stderr) console.error(testResult.stderr);

// 4. Copy screenshots to art/review/ and brain artifacts
const snapOut = path.join(SNAPSHOT_DIR, 'test_output');
const shotNormal = path.join(snapOut, 'smoke.female_6_variations_live_normal.png');
const shotCloseup = path.join(snapOut, 'smoke.female_6_variations_live_closeup.png');

if (fs.existsSync(shotNormal)) {
    const destNormal = path.join(REVIEW_DIR, 'human_female_6_variations_live_normal.png');
    fs.copyFileSync(shotNormal, destNormal);
    fs.copyFileSync(shotNormal, path.join(BRAIN_DIR, 'human_female_6_variations_live_normal.png'));
    console.log(`Saved live normal screenshot: ${destNormal}`);
} else {
    console.warn(`Missing normal screenshot: ${shotNormal}`);
}

if (fs.existsSync(shotCloseup)) {
    const destCloseup = path.join(REVIEW_DIR, 'human_female_6_variations_live_closeup.png');
    fs.copyFileSync(shotCloseup, destCloseup);
    fs.copyFileSync(shotCloseup, path.join(BRAIN_DIR, 'human_female_6_variations_live_closeup.png'));
    console.log(`Saved live close-up screenshot: ${destCloseup}`);
} else {
    console.warn(`Missing close-up screenshot: ${shotCloseup}`);
}

console.log('=== Live in-game test complete ===');
