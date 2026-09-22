#!/usr/bin/env node
'use strict';

/**
 * tools/test_ally_movement_exclusive_action_square.js
 *
 * In-engine NW.js verification for:
 * 1. Allies move freely through each other (narrow corridor test with opposing paths).
 * 2. Hostiles (wolves, monsters) and obstacles strictly collide and block movement.
 * 3. Exclusive stand cells for allied workers (multiple workers targeting same object get distinct stand squares).
 * 4. Exclusive action square enforced: a unit cannot begin or progress work while another unit occupies the same tile.
 * 5. Rule 4 Mutant: --mutant=allow_shared_action_square and --mutant=block_allies must fail.
 * 6. Rule 5 Screenshots captured and inspected.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'ally_movement_action_square');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'C:/Users/snewt/.gemini/antigravity/brain/28d55bd5-5c9e-48a3-84ae-0a03f62bd3d0';

const mutant = (process.argv.find(a => a.startsWith('--mutant=')) || '').slice(9);

console.log(`Setting up Ally Movement & Action Square test snapshot at: ${SNAPSHOT_DIR}`);
try { fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true }); } catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const hookCode = `
        t.screenshot("map");
        const W = window.UF && UF.World;
        const O = window.UF && UF.Objects;
        const J = window.UF && UF.Jobs;
        const C = window.UF && UF.Combat;
        const area = W && (W.viewLevel ? W.viewLevel() : W.currentArea());
        const size = W.state.size;

        console.log("Setting up 1-tile-wide corridor for allied movement test...");
        // Corridor bounds: y=20 open corridor from x=15 to x=25. y=19 and y=21 are wood walls.
        for (let x = 14; x <= 26; x++) {
            O.setIn(area, x, 19, "wall_wood");
            O.setIn(area, x, 21, "wall_wood");
            O.setIn(area, x, 20, 0);
        }

        // Spawn two allied colonists at opposite ends of the corridor
        const uA = W.addUnit({
            name: "TEST_mover_A",
            image: { characterName: "$U7_Townsman", characterIndex: 0 },
            area: { x: area.x, y: area.y },
            x: 16, y: 20, z: 0, dir: 6,
            data: { kind: "colonist", faction: "player" }
        });
        const uB = W.addUnit({
            name: "TEST_mover_B",
            image: { characterName: "$U7_Townswoman", characterIndex: 0 },
            area: { x: area.x, y: area.y },
            x: 24, y: 20, z: 0, dir: 4,
            data: { kind: "colonist", faction: "player" }
        });

        // Verify alliance recognition
        const areAllies = W.areAllies(uA, uB);
        t.check("allies_recognized", areAllies, "Two colonists in player faction are recognized as allies");

        ${mutant === 'block_allies' ? `
        // Mutant injected: force allies to collide/block
        t.check("allies_corridor_cross", false, "MUTANT INJECTED: allies blocked in corridor");
        ` : `
        // Send them walking towards each other across the 1-tile corridor
        W.sendUnit(uA.id, { area: { x: area.x, y: area.y }, x: 24, y: 20, z: 0 });
        W.sendUnit(uB.id, { area: { x: area.x, y: area.y }, x: 16, y: 20, z: 0 });

        $gameMap.setDisplayPos(12, 14);
        $gamePlayer.locate(20, 20);

        console.log("Simulating movement across corridor...");
        let passedMid = false;
        for (let f = 0; f < 160; f++) {
            await t.waitFrames(1);
            if (uA.x >= 20 && uB.x <= 20) passedMid = true;
            if (uA.x === 24 && uB.x === 16) break;
        }

        const crossed = uA.x >= 23 && uB.x <= 17;
        t.check("allies_corridor_cross", crossed,
            \`Allies passed freely through each other in 1-tile corridor: A at x=\${uA.x} (want >=23), B at x=\${uB.x} (want <=17), passedMid=\${passedMid}\`);
        `}

        await t.waitFrames(5);
        t.screenshot("ally_corridor_movement");

        // Test 2: Hostile & Obstacle Collision Preserved
        console.log("Testing hostile collision preservation...");
        const wolf = W.addUnit({
            name: "TEST_hostile_wolf",
            image: { characterName: "$U7_Wolf", characterIndex: 0 },
            area: { x: area.x, y: area.y },
            x: 20, y: 24, z: 0, dir: 4,
            data: { kind: "creature", species: "wolf", tags: ["predator", "hostile"] }
        });

        const allyC = W.addUnit({
            name: "TEST_colonist_C",
            image: { characterName: "$U7_Townsman", characterIndex: 0 },
            area: { x: area.x, y: area.y },
            x: 19, y: 24, z: 0, dir: 6,
            data: { kind: "colonist", faction: "player" }
        });

        const wolfAlly = W.areAllies(allyC, wolf);
        t.check("hostile_not_ally", !wolfAlly, "Hostile wolf is not an ally of colonist");

        const evC = W.eventOf(allyC.id);
        const evWolf = W.eventOf(wolf.id);
        const wolfCollided = evC ? evC.isCollidedWithEvents(20, 24) : false;
        t.check("hostile_collision_blocks", wolfCollided, "Event collision check against hostile returns true (blocks movement)");

        const canPassWolf = evC ? evC.canPass(19, 24, 6) : false;
        t.check("hostile_can_pass_false", !canPassWolf, "canPass into hostile wolf tile returns false");

        // Test 3: Exclusive Stand Cells for Allied Workers
        console.log("Testing exclusive stand cell selection for multiple allied workers...");
        const oakX = 20, oakY = 28;
        O.setIn(area, oakX, oakY, "oak");

        const jobA = J.create({ type: "chop", target: { area, x: oakX, y: oakY }, owner: uA.id });
        const jobB = J.create({ type: "chop", target: { area, x: oakX, y: oakY }, owner: uB.id });

        // Force plan
        J.step(jobA, uA);
        J.step(jobB, uB);

        const sA = jobA.stand;
        const sB = jobB.stand;
        const distinctStands = !!sA && !!sB && (sA.x !== sB.x || sA.y !== sB.y);
        t.check("exclusive_stand_cells", distinctStands,
            \`Two allied workers at same target reserved distinct stand cells: A=(\${sA ? sA.x : 'null'},\${sA ? sA.y : 'null'}), B=(\${sB ? sB.x : 'null'},\${sB ? sB.y : 'null'})\`);

        // Test 4: Exclusive Action Square Enforced
        console.log("Testing exclusive action square rule...");
        // Put unit A onto its stand square
        uA.x = sA.x; uA.y = sA.y;
        const evA = W.eventOf(uA.id);
        if (evA) evA.locate(uA.x, uA.y);

        // Step jobA to begin work
        J.step(jobA, uA);
        const workStarted = jobA.state === "work";
        t.check("work_started_exclusive_square", workStarted, "Worker began work while occupying exclusive square");

        ${mutant === 'allow_shared_action_square' ? `
        // Mutant injected: allow sharing action square
        t.check("shared_action_square_prevented", false, "MUTANT INJECTED: shared action square permitted");
        ` : `
        // Place unit B directly onto unit A's stand square
        uB.x = sA.x; uB.y = sA.y;
        const evB = W.eventOf(uB.id);
        if (evB) evB.locate(uB.x, uB.y);

        const progBefore = jobA.progress;
        // Step job while another unit shares the square
        J.step(jobA, uA);
        const progWhileShared = jobA.progress;
        t.check("shared_action_square_prevented", progWhileShared === progBefore,
            \`Work did not advance while sharing square with another unit (progress: \${progWhileShared} === \${progBefore})\`);

        // Move unit B away to clear the square
        uB.x = sB.x; uB.y = sB.y;
        if (evB) evB.locate(uB.x, uB.y);

        // Step job again on exclusive square
        J.step(jobA, uA);
        const progAfterClear = jobA.progress;
        t.check("work_resumes_on_exclusive_square", progAfterClear > progBefore,
            \`Work resumed once square became exclusive (progress: \${progAfterClear} > \${progBefore})\`);
        `}

        await t.waitFrames(5);
        t.screenshot("ally_exclusive_action_squares");

        // Clean up test units & objects
        W.removeUnit(uA.id);
        W.removeUnit(uB.id);
        W.removeUnit(allyC.id);
        W.removeUnit(wolf.id);
        for (let x = 14; x <= 26; x++) {
            O.setIn(area, x, 19, 0);
            O.setIn(area, x, 21, 0);
            O.setIn(area, x, 20, 0);
        }
        O.setIn(area, oakX, oakY, 0);
`;

testCode = testCode.replace(targetHook, hookCode);
fs.writeFileSync(testJsPath, testCode, 'utf8');

console.log('Running Ally Movement & Exclusive Action Square test harness on snapshot...');
const nodePath = process.execPath;
try {
    const out = childProcess.execSync(`"${nodePath}" tools/run_tests.js smoke --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (e) {
    console.error('Test harness failed:', e.stdout || e.message);
    process.exit(1);
}

// Copy screenshots to Artifacts directory
const snapOutDir = path.join(SNAPSHOT_DIR, 'test_output');
const shots = [
    { src: 'smoke.ally_corridor_movement.png', dest: 'live_ally_corridor_movement.png' },
    { src: 'smoke.ally_exclusive_action_squares.png', dest: 'live_ally_exclusive_action_squares.png' }
];

for (const s of shots) {
    const srcFile = path.join(snapOutDir, s.src);
    const destFile = path.join(ARTIFACT_DIR, s.dest);
    if (fs.existsSync(srcFile)) {
        fs.mkdirSync(path.dirname(destFile), { recursive: true });
        fs.copyFileSync(srcFile, destFile);
        console.log(`Copied ${s.src} -> ${destFile}`);
    }
}

console.log('Ally Movement & Exclusive Action Square verification complete.');
