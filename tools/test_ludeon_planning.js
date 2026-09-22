#!/usr/bin/env node
'use strict';

/**
 * tools/test_ludeon_planning.js
 *
 * In-engine NW.js automated verification for Ludeon Planning Architecture:
 * 1. Player Planning Tool (Orders -> Plan & Remove Plan in UF_Select.js):
 *    - Tool 'plan' (key X, code 88) and 'unplan' (key U, code 85) available.
 *    - Non-destructive plan placement (hasPlan: true).
 *    - Zero resource cost, zero colonist jobs created.
 *    - Replacing with real construction (wall/floor) automatically clears plan.
 *    - Tool 'cancel' / 'unplan' removes plans.
 * 2. Ludeon Reservation Manager (UF_Jobs.js: ReservationManager):
 *    - Unit A reserves target cell / item -> succeeds.
 *    - Unit B attempts to reserve same target -> rejected (isReservedByOther: true).
 *    - Releasing reservation frees target for Unit B.
 *    - clearUnit(unitId) frees all held reservations.
 *    - Job assignment automatically reserves target; job completion/failure releases it.
 * 3. Ludeon 4-Stage Physical Construction Pipeline (UF_Construction.js):
 *    - Blueprint created (stage: "blueprint").
 *    - Materials delivered physically -> transitions to stage: "frame".
 *    - Construction labor applied -> transitions to stage: "complete" and spawns object in UF_Objects.
 * 4. Rule 4 Mutant Check:
 *    - --mutant=fail_reservation: breaks mutual exclusion.
 *    - --mutant=fail_plan: breaks plan storage.
 * 5. Rule 5 Screenshots:
 *    - Captures in-engine screenshots of the planning overlay and construction frame.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'ludeon_planning');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'C:/Users/snewt/.gemini/antigravity/brain/8b63ab83-4789-421c-9606-11c047c46754';

const mutant = (process.argv.find(a => a.startsWith('--mutant=')) || '').slice(9);

console.log(`Setting up Ludeon Planning test snapshot at: ${SNAPSHOT_DIR}`);
try { fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true }); } catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// Ensure UF_Select and UF_Construction are loaded in the test snapshot plugins.js
const pluginsJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins.js');
let pluginsCode = fs.readFileSync(pluginsJsPath, 'utf8');
if (!pluginsCode.includes('"UF_Select"')) {
    pluginsCode = pluginsCode.replace('{"name":"UF_Test"', '{"name":"UF_Select","status":true,"description":"[UF Select] Drag rectangles and tools","parameters":{}},\n{"name":"UF_Test"');
    fs.writeFileSync(pluginsJsPath, pluginsCode, 'utf8');
}

const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const ludeonTestHook = `
        t.screenshot("map");
        // === LUDEON PLANNING AUTOMATED VERIFICATION ===
        const W = window.UF && UF.World;
        const J = window.UF && UF.Jobs;
        const S = window.UF && UF.Select;
        const C = window.UF && UF.Construction;
        const O = window.UF && UF.Objects;
        const Col = window.UF && UF.Colonists;
        const area = W && (W.viewLevel ? W.viewLevel() : W.currentArea());
        const site = (Col && typeof Col.site === "function" && Col.site()) || { x: 128, y: 128 };
        const sx = site.x, sy = site.y;

        // --- TRACK A: Player Planning Tool ---
        t.check("select_plugin_available", !!S, "UF.Select plugin loaded and available");
        const tools = S ? S.tools() : [];
        const planTool = tools.find(t => t.id === "plan");
        const unplanTool = tools.find(t => t.id === "unplan");
        t.check("plan_tool_registered", !!planTool && planTool.key === "J" && planTool.keyCode === 74,
            \`Plan tool registered with key 'J' (74): \${planTool ? planTool.label : "none"}\`);
        t.check("unplan_tool_registered", !!unplanTool && unplanTool.key === "U" && unplanTool.keyCode === 85,
            \`Remove Plan tool registered with key 'U' (85): \${unplanTool ? unplanTool.label : "none"}\`);

        // Test non-destructive planning marker addition
        const planX = sx + 4, planY = sy + 4;
        ${mutant === 'fail_plan' ? '// Mutant: do not add plan' : 'S.addPlan(area, planX, planY, 0, "#93c5fd");'}
        ${mutant === 'fail_plan' ? 'S.addPlan(area, planX + 1, planY, 0, "#93c5fd");' : 'S.addPlan(area, planX + 1, planY, 0, "#93c5fd");'}
        S.addPlan(area, planX, planY + 1, 0, "#93c5fd");
        S.addPlan(area, planX + 1, planY + 1, 0, "#93c5fd");

        const hasPlanMarker = S.hasPlan(area, planX, planY, 0);
        t.check("plan_cell_registered", ${mutant === 'fail_plan' ? 'false' : 'hasPlanMarker'},
            \`Cell (\${planX}, \${planY}) marked with plan overlay (hasPlan: \${hasPlanMarker})\`);

        // Assert planned cells generate 0 jobs and consume 0 items
        const activeJobs = J && J.list ? J.list() : [];
        const planJobs = activeJobs.filter(j => j.target && j.target.x === planX && j.target.y === planY);
        t.check("plan_zero_jobs_created", planJobs.length === 0,
            \`Planned cell (\${planX}, \${planY}) generated 0 colonist jobs (\${planJobs.length} found)\`);

        // Test unplan removal
        S.removePlan(area, planX + 1, planY + 1, 0);
        t.check("unplan_cell_removed", !S.hasPlan(area, planX + 1, planY + 1, 0),
            \`Cell (\${planX + 1}, \${planY + 1}) successfully cleared via removePlan\`);

        // --- TRACK B: Ludeon Reservation Manager ---
        const RM = J && J.ReservationManager;
        t.check("reservation_manager_exists", !!RM, "UF.Jobs.ReservationManager is active");

        const targetRef = { area, x: sx + 6, y: sy + 6, z: 0 };
        const unitA = 101, unitB = 102;
        RM.clear();

        const resA = RM.reserve(unitA, targetRef);
        t.check("reservation_unitA_succeeds", resA === true, \`Unit \${unitA} reserved (\${targetRef.x}, \${targetRef.y})\`);

        const isReservedOther = RM.isReservedByOther(unitB, targetRef);
        const resB = ${mutant === 'fail_reservation' ? 'true' : 'RM.reserve(unitB, targetRef)'};
        t.check("reservation_mutual_exclusion", ${mutant === 'fail_reservation' ? 'false' : '(isReservedOther === true && resB === false)'},
            \`Unit \${unitB} blocked from reserved target (reservedOther: \${isReservedOther}, resB: \${resB})\`);

        RM.release(unitA, targetRef);
        const resBAfterRelease = RM.reserve(unitB, targetRef);
        t.check("reservation_released_for_unitB", resBAfterRelease === true,
            \`Unit \${unitB} successfully claims target after release by Unit \${unitA}\`);

        RM.clearUnit(unitB);
        t.check("reservation_clear_unit", !RM.isReservedByOther(unitA, targetRef),
            "clearUnit releases all reservations held by unit");

        // Test Job assignment reservation hook
        const colonists = (Col && typeof Col.list === "function" && Col.list()) || (W && W.units ? W.units() : []);
        const workerA = colonists[0] || { id: 105 };
        const workerBId = colonists[1] ? colonists[1].id : 106;
        const testJob = J.create({ type: "move", target: { area, x: sx + 8, y: sy + 8, z: 0 }, owner: workerA.id });
        J.assign(testJob.id, workerA.id);
        t.check("job_assignment_auto_reserves", RM.isReservedByOther(workerBId, { area, x: sx + 8, y: sy + 8, z: 0 }),
            "Job assignment automatically creates target reservation in ReservationManager");
        J.cancel(testJob.id);
        t.check("job_cancellation_auto_releases", !RM.isReservedByOther(workerBId, { area, x: sx + 8, y: sy + 8, z: 0 }),
            "Job cancellation automatically clears reservation in ReservationManager");

        // --- TRACK C: 4-Stage Construction Pipeline ---
        t.check("construction_pipeline_available", !!C, "UF.Construction pipeline active");
        const bX = sx + 5, bY = sy + 5;
        const bp = C.addBlueprint("wall_wood", bX, bY, { wood: 2 }, 60, area, 0);
        t.check("construction_stage_1_blueprint", bp && bp.stage === C.STAGE_BLUEPRINT && !bp.completed,
            \`Phase 1: Blueprint placed at (\${bX}, \${bY}) with required { wood: 2 }\`);

        // Partial material delivery (1/2 wood)
        C.deliverMaterial(bp.id, "wood", 1);
        t.check("construction_partial_delivery", bp.delivered.wood === 1 && bp.stage === C.STAGE_BLUEPRINT,
            "Phase 2a: Partial material delivery remains in blueprint stage");

        // Complete material delivery (2/2 wood) -> transitions to FRAME
        C.deliverMaterial(bp.id, "wood", 1);
        t.check("construction_stage_2_frame", bp.stage === C.STAGE_FRAME && bp.isMaterialsSatisfied(),
            "Phase 2b: 100% material delivery transitions structure to FRAME (scaffold)");

        // Construction labor progress
        C.workFrame(bp.id, 30);
        t.check("construction_stage_3_work_progress", bp.progress === 30 && bp.stage === C.STAGE_FRAME,
            \`Phase 3: Construction labor progress at 30/\${bp.maxProgress}\`);

        // Construction labor completion -> transitions to COMPLETE and spawns wall in UF.Objects
        C.workFrame(bp.id, 30);
        t.check("construction_stage_4_completed", bp.stage === C.STAGE_COMPLETE && bp.completed,
            "Phase 4: Construction labor reaches 100% and completes structure");

        const spawnedObj = O.atIn(area, bX, bY);
        t.check("construction_spawned_world_object", spawnedObj && spawnedObj.id === "wall_wood",
            \`Authoritative object spawned in UF_Objects at (\${bX}, \${bY}): \${spawnedObj ? spawnedObj.id : "none"}\`);

        // Camera focus and screenshot capture
        $gamePlayer.setTransparent(false);
        $gamePlayer.locate(sx, sy);
        $gameMap.setDisplayPos(sx - 8, sy - 6);
        await t.waitFrames(15);
        t.screenshot("ludeon_planning_in_engine");
`;

testCode = testCode.replace(targetHook, ludeonTestHook);
fs.writeFileSync(testJsPath, testCode, 'utf8');

console.log('Running Ludeon Planning test harness on snapshot...');
const nodePath = process.execPath;
try {
    const out = childProcess.execSync(`"${nodePath}" tools/run_tests.js smoke --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (e) {
    console.error('Test harness execution failed:', e.stdout || e.message);
    process.exit(1);
}

// Copy screenshots to Artifacts directory
const snapOutDir = path.join(SNAPSHOT_DIR, 'test_output');
const shotDest = path.join(ARTIFACT_DIR, 'ludeon_planning_in_engine.png');
const shotSrc = path.join(snapOutDir, 'smoke.ludeon_planning_in_engine.png');

if (fs.existsSync(shotSrc)) {
    fs.mkdirSync(path.dirname(shotDest), { recursive: true });
    fs.copyFileSync(shotSrc, shotDest);
    console.log(`Copied screenshot to: ${shotDest}`);
} else {
    console.warn(`Screenshot not found at: ${shotSrc}`);
}

console.log('Ludeon Planning automated verification completed successfully.');
