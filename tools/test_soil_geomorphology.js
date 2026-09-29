//=============================================================================
// test_soil_geomorphology.js - Geomorphology & Soil gate suite
// Project DEUS - NAT.04.01 (lane-by, attempt 3)
// Authority: DEC-037, DEC-038, DEC-039, DEC-040 (Owner clarification 2026-09-29)
//
// Every check below calls the real GeomorphologyEngine. Closed-mass checks compare
// engine.getTotalMass().total, the sum of every reservoir, on every tick, never a
// hand-picked pair of fields.
//
//   node tools/test_soil_geomorphology.js                  run the suite (exit 1 on any FAIL)
//   node tools/test_soil_geomorphology.js --mutant=<name>  run it with one defect restored
//   node tools/test_soil_geomorphology.js --mutation-sweep run every mutant in a child process
//                                                          and require each to fail on an assertion
//=============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const {
    VOLUME_PER_STRATUM,
    CELL_AREA_SQFT,
    MUTANTS,
    encodeStratumId,
    canonicalEdgeKey,
    stratumTopElevationFt,
    SoilStratum,
    GeomorphologyEngine,
    getHorizons,
    simulateWaterTransfer,
    clampMoisture,
    createSediment,
    checkCollapse,
    simulateQuiescence
} = require('../game/js/sim/geomorphology/index.js');

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, testName, detail) {
    if (actual === expected) {
        console.log(`PASS: ${testName} - ${detail}`);
        passed++;
    } else {
        console.error(`FAIL: ${testName} - ${detail}. Expected ${expected}, got ${actual}`);
        failed++;
    }
}

function assertTrue(condition, testName, detail) {
    if (condition) {
        console.log(`PASS: ${testName} - ${detail}`);
        passed++;
    } else {
        console.error(`FAIL: ${testName} - ${detail}`);
        failed++;
    }
}

function assertFalse(condition, testName, detail) {
    assertTrue(!condition, testName, detail);
}

// A full solid cell of the named horizon at (x, y, z, s).
const OA = ['O/A', 4000, 3000, 1000, 2000, 3750, 4500, 3500];
const C = ['C', 6000, 2500, 1500, 0, 6000, 3000, 2500];
function solidCell(spec, x, y, z, s, moistureBp = 0, loose = false, angle = 34) {
    return new SoilStratum(x, y, z, s, ...spec, moistureBp, loose, angle);
}
// An empty deposit cell holding only loose sediment.
function looseCell(spec, x, y, z, s, looseMassCp, angle = 34) {
    const like = solidCell(spec, x, y, z, s, 0, true, angle);
    const d = SoilStratum.deposit(x, y, z, s, like);
    d.looseMassCp = looseMassCp;
    return d;
}
const fullSolidCp = (spec) => Math.round(spec[5] * VOLUME_PER_STRATUM);
const maxStableStepFt = (angleDeg) => Math.tan((angleDeg * Math.PI) / 180) * 5;

// Run the brief's tick order n times and assert the world total never changes.
function runConserved(eng, ticks, testName, label) {
    const start = eng.getTotalMass().total;
    let ok = true;
    for (let t = 1; t <= ticks; t++) {
        simulateQuiescence(eng);
        const now = eng.getTotalMass().total;
        if (now !== start) {
            console.error(`FAIL: ${testName} - ${label}: world total changed on tick ${t}: ${start} -> ${now} cp`);
            failed++;
            ok = false;
            break;
        }
    }
    if (ok) {
        console.log(`PASS: ${testName} - ${label}: world total ${start} cp unchanged across ${ticks} ticks`);
        passed++;
    }
    return ok;
}

function maxSolidCp(eng) {
    let m = 0;
    for (const s of eng.strata.values()) m = Math.max(m, s.solidMassCp);
    return m;
}

// 1. Horizon Stratification & Soil Composition
function test_soil_horizon_stratification() {
    const horizons = getHorizons();
    assertEqual(horizons.length, 3, 'test_soil_horizon_stratification', 'Horizon count should be 3');
    assertEqual(horizons[0].name, 'O/A', 'test_soil_horizon_stratification', 'First horizon should be O/A');
    assertEqual(horizons[1].name, 'B', 'test_soil_horizon_stratification', 'Second horizon should be B');
    assertEqual(horizons[2].name, 'C', 'test_soil_horizon_stratification', 'Third horizon should be C');
    assertEqual(horizons[0].bulkDensity, 3750, 'test_soil_horizon_stratification', 'O/A bulk density should be 3750 cp/cu ft');
    assertEqual(horizons[1].bulkDensity, 4750, 'test_soil_horizon_stratification', 'B bulk density should be 4750 cp/cu ft');
    assertEqual(horizons[2].bulkDensity, 6000, 'test_soil_horizon_stratification', 'C bulk density should be 6000 cp/cu ft');
    for (const h of horizons) {
        const sum = h.sand + h.silt + h.clay + h.organic;
        assertEqual(sum, 10000, 'test_soil_horizon_stratification', `${h.name} composition should sum to 10000 bp`);
    }
    assertTrue(horizons[0].organic >= 2000, 'test_soil_horizon_stratification', 'O/A organic content should be >= 2000 bp');
}

// 2. Capillary Rise & Closed-Mass Hydrology Coupling (one tick)
function test_capillary_rise_closed_mass() {
    const eng = new GeomorphologyEngine();
    const donor = solidCell(C, 0, 0, -1, 4, 8000);
    const receiver = solidCell(OA, 0, 0, 0, 0, 1000);
    eng.addStratum(donor);
    eng.addStratum(receiver);
    eng.markDirty(0, 0, 0, 0);

    const donorBefore = donor.getCurrentWaterMass();
    const receiverBefore = receiver.getCurrentWaterMass();
    const totalBefore = eng.getTotalMass().total;
    eng.processMoistureTick(1);

    assertEqual(eng.getTotalMass().total, totalBefore, 'test_capillary_rise_closed_mass', 'World total unchanged by a capillary tick');
    assertEqual(donorBefore - donor.getCurrentWaterMass(), receiver.getCurrentWaterMass() - receiverBefore, 'test_capillary_rise_closed_mass', 'Donor debit equals receiver credit');
    assertTrue(receiver.getCurrentWaterMass() <= receiver.getFieldCapacityWaterMass(), 'test_capillary_rise_closed_mass', 'Capillary wicking must not exceed field capacity');
    assertTrue(receiver.getCurrentWaterMass() > receiverBefore, 'test_capillary_rise_closed_mass', 'Receiver must have gained water');
}

// 2b. Capillary wicking continues on its own until field capacity, with no outside markDirty.
function test_capillary_reaches_field_capacity_unaided() {
    const eng = new GeomorphologyEngine();
    const donor = solidCell(C, 0, 0, -1, 4, 9000); // 84,240 cp; field capacity 23,400 cp -> 60,840 cp available
    const receiver = solidCell(OA, 0, 0, 0, 0, 1000); // 14,040 cp; field capacity 49,140 cp
    eng.addStratum(donor);
    eng.addStratum(receiver);
    eng.markDirty(0, 0, 0, 0);
    const totalBefore = eng.getTotalMass().total;

    let ticks = 0;
    while (eng.dirtyMoisture.size > 0 && ticks < 2000) {
        eng.processMoistureTick(1);
        ticks++;
    }
    assertEqual(receiver.getCurrentWaterMass(), receiver.getFieldCapacityWaterMass(), 'test_capillary_reaches_field_capacity_unaided', `Receiver reaches field capacity by itself (took ${ticks} ticks)`);
    assertTrue(ticks < 2000, 'test_capillary_reaches_field_capacity_unaided', 'Wicking finishes and the column goes quiet');
    assertEqual(eng.getTotalMass().total, totalBefore, 'test_capillary_reaches_field_capacity_unaided', 'World total unchanged over the whole wick');
    assertTrue(donor.getCurrentWaterMass() >= donor.getFieldCapacityWaterMass(), 'test_capillary_reaches_field_capacity_unaided', 'Donor keeps its own retained water');
}

// 2c. The signed residual sees the unrounded capillary rate: a 100 cp deficit moves exactly 100 cp.
function test_capillary_residual_sees_unrounded_rate() {
    const eng = new GeomorphologyEngine();
    const donor = solidCell(C, 3, 0, -1, 4, 9000);
    const receiver = solidCell(OA, 3, 0, 0, 0, 0);
    receiver.waterMassCp = receiver.getFieldCapacityWaterMass() - 100; // rate starts at 2000 * 100 / 49140 = 4.07 cp
    eng.addStratum(donor);
    eng.addStratum(receiver);
    eng.markDirty(3, 0, 0, 0);
    const donorBefore = donor.getCurrentWaterMass();

    let ticks = 0;
    let sawFraction = false;
    while (eng.dirtyMoisture.size > 0 && ticks < 500) {
        eng.processMoistureTick(1);
        ticks++;
        const r = eng.signedResidualMap.get(canonicalEdgeKey(receiver.id, donor.id)) || 0;
        if (r > 0 && r < 1) sawFraction = true;
    }
    assertEqual(donorBefore - donor.getCurrentWaterMass(), 100, 'test_capillary_residual_sees_unrounded_rate', 'Exactly the 100 cp deficit moved, in integer centipounds');
    assertTrue(sawFraction, 'test_capillary_residual_sees_unrounded_rate', 'A fractional remainder was carried between ticks');
    assertTrue(ticks <= 60, 'test_capillary_residual_sees_unrounded_rate', `Small deficits close in bounded time (took ${ticks} ticks)`);

    // A 10 cp deficit has an unrounded rate of 0.4 cp; it must still close.
    const eng2 = new GeomorphologyEngine();
    const donor2 = solidCell(C, 4, 0, -1, 4, 9000);
    const receiver2 = solidCell(OA, 4, 0, 0, 0, 0);
    receiver2.waterMassCp = receiver2.getFieldCapacityWaterMass() - 10;
    eng2.addStratum(donor2);
    eng2.addStratum(receiver2);
    eng2.markDirty(4, 0, 0, 0);
    let t2 = 0;
    while (eng2.dirtyMoisture.size > 0 && t2 < 100) { eng2.processMoistureTick(1); t2++; }
    assertEqual(receiver2.getCurrentWaterMass(), receiver2.getFieldCapacityWaterMass(), 'test_capillary_residual_sees_unrounded_rate', `A 10 cp deficit closes (took ${t2} ticks)`);
}

// 3. Gravitational Drainage Downward Percolation
function test_gravity_downward_drainage() {
    const eng = new GeomorphologyEngine();
    const upper = solidCell(OA, 1, 0, 0, 2, 9000);
    const lower = solidCell(OA, 1, 0, 0, 1, 0);
    eng.addStratum(upper);
    eng.addStratum(lower);
    eng.markDirty(1, 0, 0, 2);

    const waterBefore = upper.getCurrentWaterMass() + lower.getCurrentWaterMass();
    const totalBefore = eng.getTotalMass().total;
    eng.processMoistureTick(1);
    const waterAfter = upper.getCurrentWaterMass() + lower.getCurrentWaterMass();

    assertEqual(waterAfter, waterBefore, 'test_gravity_downward_drainage', 'Gravity drainage must conserve water mass');
    assertEqual(eng.getTotalMass().total, totalBefore, 'test_gravity_downward_drainage', 'World total unchanged');
    assertTrue(lower.getCurrentWaterMass() > 0, 'test_gravity_downward_drainage', 'Downward neighbor (s-1) must receive percolating water');
    assertTrue(upper.getCurrentWaterMass() < waterBefore, 'test_gravity_downward_drainage', 'Upper stratum excess water must drain downward');
}

// 4. Downward Drainage Across Z Boundaries
function test_gravity_drainage_across_z_boundary() {
    const eng = new GeomorphologyEngine();
    const upperZ = solidCell(OA, 2, 0, 0, 0, 9000);
    const lowerZ = new SoilStratum(2, 0, -1, 4, 'B', 3000, 4000, 2500, 500, 4750, 3800, 4000, 0);
    const decoyAbove = solidCell(OA, 2, 0, 1, 0, 0);
    eng.addStratum(upperZ);
    eng.addStratum(lowerZ);
    eng.addStratum(decoyAbove);
    eng.markDirty(2, 0, 0, 0);

    eng.processMoistureTick(1);
    assertTrue(lowerZ.getCurrentWaterMass() > 0, 'test_gravity_drainage_across_z_boundary', 'Water must drain across Z boundary from s=0 down to z-1, s=4');
    assertEqual(decoyAbove.getCurrentWaterMass(), 0, 'test_gravity_drainage_across_z_boundary', 'Nothing flows upward into z+1');
}

// 5. Signed Residual Moisture Conservation (DEC-038)
function test_signed_residual_sub_centipound_accumulation() {
    const eng = new GeomorphologyEngine();
    const edgeKey = canonicalEdgeKey('3,0,0,1', '3,0,0,2');
    let totalIntTransferred = 0;
    for (let t = 0; t < 10; t++) {
        totalIntTransferred += eng.accumulateFractionalTransfer(edgeKey, 0.35);
    }
    const finalResidual = eng.signedResidualMap.get(edgeKey) || 0;
    assertEqual(totalIntTransferred, 3, 'test_signed_residual_sub_centipound_accumulation', '10 ticks of 0.35 cp must yield exactly 3 integer centipounds');
    assertTrue(Math.abs(finalResidual - 0.5) < 1e-6, 'test_signed_residual_sub_centipound_accumulation', 'Final signed residual must hold exactly 0.5 cp remainder');
}

// 6. Receiver-Side Pore Space Clamping
function test_receiver_side_clamping_pore_space() {
    const stratum = solidCell(OA, 4, 0, 0, 0, 5000);
    simulateWaterTransfer(stratum, 8000);
    clampMoisture(stratum);
    assertTrue(stratum.moisture <= 10000, 'test_receiver_side_clamping_pore_space', 'Receiver pore space must clamp moisture to <= 10000 bp');
    assertTrue(stratum.waterMassCp <= stratum.getMaxWaterMass(), 'test_receiver_side_clamping_pore_space', 'Water mass never exceeds pore volume');
}

// 7. Angle of Repose Thresholds & Moist Cohesion
function test_angle_of_repose_thresholds() {
    const gravel = createSediment('gravel');
    const drySand = createSediment('sand');
    const moistLoam = createSediment('loam', { moisture: 2000 });
    const dryLoam = createSediment('loam', { moisture: 0 });
    const mud = createSediment('mud');

    assertEqual(gravel.angleRepose, 35, 'test_angle_of_repose_thresholds', 'Gravel repose angle should be 35 degrees');
    assertEqual(drySand.angleRepose, 34, 'test_angle_of_repose_thresholds', 'Dry sand repose angle should be 34 degrees');
    assertEqual(moistLoam.angleRepose, 45, 'test_angle_of_repose_thresholds', 'Moist loam repose angle should be 45 degrees due to capillary cohesion');
    assertEqual(dryLoam.angleRepose, 30, 'test_angle_of_repose_thresholds', 'Dry loam repose angle should be 30 degrees');
    assertEqual(mud.angleRepose, 20, 'test_angle_of_repose_thresholds', 'Mud repose angle should be 20 degrees due to liquefaction');

    assertTrue(checkCollapse(gravel, 40), 'test_angle_of_repose_thresholds', 'Gravel should collapse at 40 degrees');
    assertFalse(checkCollapse(gravel, 30), 'test_angle_of_repose_thresholds', 'Gravel should not collapse at 30 degrees');
    assertFalse(checkCollapse(moistLoam, 40), 'test_angle_of_repose_thresholds', 'Moist loam should not collapse at 40 degrees');
}

// 8. Slope cascade: the gate fixture, run for eight ticks with the world total checked every tick.
function test_slope_stability_cascade_conservation() {
    const T = 'test_slope_stability_cascade_conservation';
    const eng = new GeomorphologyEngine();
    const highStratum = solidCell(OA, 0, 0, 2, 0, 0, true, 34);
    highStratum.looseMassCp = 50000;
    const lowStratum = solidCell(OA, 1, 0, -2, 0, 0, true, 34);
    eng.addStratum(highStratum);
    eng.addStratum(lowStratum);
    eng.markDirty(0, 0, 2, 0);

    assertEqual(eng.getTotalMass().total, 425000, T, 'Fixture starts at 425,000 cp');
    let transfersAfterTick1 = 0;
    const start = eng.getTotalMass().total;
    let conserved = true;
    for (let t = 1; t <= 8; t++) {
        eng.processSlopeStability(1);
        if (t === 1) transfersAfterTick1 = eng.stats.sedimentTransfers;
        if (eng.getTotalMass().total !== start) {
            console.error(`FAIL: ${T} - world total changed on slope tick ${t}: ${start} -> ${eng.getTotalMass().total} cp`);
            failed++;
            conserved = false;
            break;
        }
    }
    if (conserved) { console.log(`PASS: ${T} - world total ${start} cp unchanged across 8 slope ticks`); passed++; }

    assertTrue(transfersAfterTick1 > 0, T, 'Loose sediment left the cliff on tick 1');
    assertEqual(highStratum.solidMassCp, fullSolidCp(OA), T, 'The cliff\'s solid matrix does not slide');
    assertEqual(highStratum.looseMassCp, 0, T, 'All 50,000 cp of loose sediment left the cliff');
    let receivedInLowColumn = 0;
    for (const s of eng.strata.values()) if (s.x === 1 && s.y === 0) receivedInLowColumn += s.looseMassCp;
    assertEqual(receivedInLowColumn, 50000, T, 'The low column received exactly the 50,000 cp that left');
    assertTrue(maxSolidCp(eng) <= fullSolidCp(OA), T, 'No stratum holds more solid matrix than a full cell');
    for (const s of eng.strata.values()) {
        if (s !== highStratum && s !== lowStratum) {
            assertEqual(s.solidMassCp, 0, T, `New deposit cell ${s.id} starts with zero solid matrix`);
        }
    }
    assertEqual(eng.dirtySlope.size, 0, T, 'The cascade finished and the slope queue is empty');
    assertTrue(eng.ledgerMassSediment > 0, T, 'Sediment ledger must record relocated mass');
}

// 8b. A loose cell with no known neighbours: nothing to cascade into, nothing created.
function test_slope_unknown_ground_moves_nothing() {
    const T = 'test_slope_unknown_ground_moves_nothing';
    const eng = new GeomorphologyEngine();
    const lone = solidCell(OA, 0, 0, 2, 0, 0, true, 34);
    lone.looseMassCp = 50000;
    eng.addStratum(lone);
    eng.markDirty(0, 0, 2, 0);
    const before = eng.getTotalMass().total;
    eng.processSlopeStability(1);
    eng.processSlopeStability(1);
    assertEqual(eng.getTotalMass().total, before, T, 'World total unchanged');
    assertEqual(eng.stats.sedimentTransfers, 0, T, 'No sediment moved into unknown ground');
    assertEqual(eng.strata.size, 1, T, 'No strata were created');
    assertEqual(lone.looseMassCp, 50000, T, 'The loose sediment is still where it was');
}

// 8c. A ground provider tells the engine where an unknown column's floor is; the deposit lands there.
function test_slope_ground_provider_floor() {
    const T = 'test_slope_ground_provider_floor';
    const eng = new GeomorphologyEngine();
    const lone = solidCell(OA, 0, 0, 2, 0, 0, true, 34);
    lone.looseMassCp = 50000;
    eng.addStratum(lone);
    eng.groundElevationProvider = (x, y) => (x === 1 && y === 0) ? 162 : null; // floor at the top of z=0,s=0
    eng.markDirty(0, 0, 2, 0);
    const before = eng.getTotalMass().total;
    eng.processSlopeStability(1);
    eng.processSlopeStability(1);
    const deposit = eng.getStratum(encodeStratumId(1, 0, 0, 1));
    assertEqual(eng.getTotalMass().total, before, T, 'World total unchanged');
    assertTrue(Boolean(deposit), T, 'Deposit created in the stratum band that holds the provided floor');
    if (deposit) {
        assertEqual(deposit.solidMassCp, 0, T, 'The deposit cell has no matrix of its own');
        assertEqual(deposit.looseMassCp, 50000, T, 'The deposit holds exactly what left the source');
    }
    assertEqual(eng.strata.size, 2, T, 'Only the columns that were named received anything');
}

// 8d. A full neighbour at s=4 receives into a new cell at z+1, s=0 that starts empty.
function test_slope_deposit_above_full_cell_crosses_z() {
    const T = 'test_slope_deposit_above_full_cell_crosses_z';
    const eng = new GeomorphologyEngine();
    const high = solidCell(OA, 0, 0, 3, 0, 0, true, 34);
    high.looseMassCp = 40000;
    const neighborTop = solidCell(OA, 1, 0, 0, 4, 0); // full cell; its top is 170 ft, source surface 192 ft
    eng.addStratum(high);
    eng.addStratum(neighborTop);
    eng.markDirty(0, 0, 3, 0);
    const before = eng.getTotalMass().total;
    eng.processSlopeStability(1);
    const created = eng.getStratum(encodeStratumId(1, 0, 1, 0));
    assertEqual(eng.getTotalMass().total, before, T, 'World total unchanged');
    assertTrue(Boolean(created), T, 'A receiving cell exists at z+1, s=0 above the full neighbour');
    if (created) {
        assertEqual(created.solidMassCp, 0, T, 'The new cell has zero solid matrix');
        assertEqual(created.looseMassCp, 40000, T, 'The new cell holds the moved sediment');
    }
    assertEqual(neighborTop.solidMassCp, fullSolidCp(OA), T, 'The full neighbour is unchanged');
}

// 8e. A loose pile settles until the step to its neighbour is within tan(theta) * 5 ft, with sediment left on both sides.
function test_slope_settles_at_angle_of_repose() {
    const T = 'test_slope_settles_at_angle_of_repose';
    const eng = new GeomorphologyEngine();
    eng.addStratum(solidCell(C, 0, 0, 0, 0));
    eng.addStratum(solidCell(C, 1, 0, 0, 0));
    const pile = looseCell(C, 0, 0, 0, 1, fullSolidCp(C), 20); // a full 2 ft of mud-angle sediment on a 162 ft base
    const receiver = looseCell(C, 1, 0, 0, 1, 0, 20);
    eng.addStratum(pile);
    eng.addStratum(receiver);
    eng.markDirty(0, 0, 0, 1);
    const maxStep = maxStableStepFt(20);

    assertTrue(runConserved(eng, 6, T, 'Settling run'), 'conserved');
    const step = pile.surfaceElevationFt() - receiver.surfaceElevationFt();
    assertTrue(step <= maxStep + 0.01, T, `Final step ${step.toFixed(3)} ft is within the stable ${maxStep.toFixed(3)} ft`);
    assertTrue(step > maxStep - 0.5, T, 'The pile did not over-shed: it stopped near the stable angle, not at zero');
    assertTrue(pile.looseMassCp > 0 && receiver.looseMassCp > 0, T, 'Sediment remains on both sides');
    assertEqual(pile.looseMassCp + receiver.looseMassCp, fullSolidCp(C), T, 'All sediment is accounted for between the two cells');
    assertEqual(eng.dirtySlope.size, 0, T, 'The slope queue is empty once settled');
}

// 8f. The brief's order, moisture then slope, still lets a dry cliff shed its sediment.
function test_slope_runs_after_moisture_pass() {
    const T = 'test_slope_runs_after_moisture_pass';
    const eng = new GeomorphologyEngine();
    const high = solidCell(OA, 0, 0, 2, 0, 0, true, 34);
    high.looseMassCp = 50000;
    const low = solidCell(OA, 1, 0, -2, 0, 0, true, 34);
    eng.addStratum(high);
    eng.addStratum(low);
    eng.markDirty(0, 0, 2, 0);
    const before = eng.getTotalMass().total;
    simulateQuiescence(eng); // moisture tick, then slope tick
    assertTrue(eng.stats.sedimentTransfers > 0, T, 'Sediment moved on a moisture-then-slope tick');
    assertEqual(high.looseMassCp, 0, T, 'The cliff shed its loose sediment');
    assertEqual(eng.getTotalMass().total, before, T, 'World total unchanged');
}

// 8g. Two lower neighbours compete for one pile; both receive and the total holds.
function test_slope_competing_transfers() {
    const T = 'test_slope_competing_transfers';
    const eng = new GeomorphologyEngine();
    eng.addStratum(solidCell(C, 0, 0, 0, 0));
    const pile = looseCell(C, 0, 0, 0, 1, 250000, 34);
    eng.addStratum(pile);
    eng.addStratum(solidCell(C, 1, 0, -1, 2));
    const eastCell = looseCell(C, 1, 0, -1, 3, 240000, 34); // nearly full: 10 cu ft of room
    eng.addStratum(eastCell);
    eng.addStratum(solidCell(C, -1, 0, -1, 2));
    eng.markDirty(0, 0, 0, 1);
    const before = eng.getTotalMass().total;
    eng.processSlopeStability(1);
    const westCell = eng.getStratum(encodeStratumId(-1, 0, -1, 3));
    assertEqual(eng.getTotalMass().total, before, T, 'World total unchanged');
    assertEqual(eastCell.looseMassCp, 300000, T, 'East cell filled to the brim and no further');
    assertTrue(Boolean(westCell) && westCell.looseMassCp > 0, T, 'West column received the rest');
    assertEqual(pile.looseMassCp + eastCell.looseMassCp + (westCell ? westCell.looseMassCp : 0), 250000 + 240000, T, 'Every centipound of sediment is in one of the three cells');
}

// 8h. An exhausted pile: a small amount of loose sediment moves entirely; the matrix beneath stays.
function test_slope_exhausted_donor() {
    const T = 'test_slope_exhausted_donor';
    const eng = new GeomorphologyEngine();
    const high = solidCell(OA, 0, 0, 2, 0, 0, true, 34);
    high.looseMassCp = 1000;
    const low = solidCell(OA, 1, 0, -2, 0, 0, true, 34);
    eng.addStratum(high);
    eng.addStratum(low);
    eng.markDirty(0, 0, 2, 0);
    assertTrue(runConserved(eng, 4, T, 'Exhaustion run'), 'conserved');
    assertEqual(high.looseMassCp, 0, T, 'The 1,000 cp of loose sediment all moved');
    assertEqual(high.solidMassCp, fullSolidCp(OA), T, 'The solid matrix stayed');
    assertEqual(eng.dirtySlope.size, 0, T, 'Nothing left to do');
}

// 8i. An emptied deposit cell no longer defines its column's surface.
function test_emptied_cell_is_not_surface() {
    const T = 'test_emptied_cell_is_not_surface';
    const eng = new GeomorphologyEngine();
    const base = solidCell(C, 0, 0, 1, 0);
    const pile = looseCell(C, 0, 0, 1, 1, 30000, 34);
    eng.addStratum(base);
    eng.addStratum(pile);
    eng.addStratum(solidCell(C, 1, 0, -1, 0)); // far below: 140 ft top vs the pile at 172 ft
    eng.markDirty(0, 0, 1, 1);
    eng.processSlopeStability(1);
    assertEqual(pile.looseMassCp, 0, T, 'The pile emptied into the lower column');
    assertTrue(eng.getHighestStratumAt(0, 0) === base, T, 'The surface is the base again, not the empty shell');
    assertEqual(eng.getSurfaceElevationFt(0, 0), stratumTopElevationFt(1, 0), T, 'Surface elevation is the top of the base');
}

// 8j. Surface lookups are column-local: one dirty cell in a 2,000-stratum world touches only its own five columns.
function test_slope_lookups_are_column_local() {
    const T = 'test_slope_lookups_are_column_local';
    const eng = new GeomorphologyEngine();
    for (let x = 0; x < 20; x++) for (let y = 0; y < 20; y++) for (let s = 0; s < 5; s++) {
        eng.addStratum(solidCell(C, x, y, 0, s));
    }
    const cell = eng.getStratum(encodeStratumId(5, 5, 0, 4));
    cell.loose = true;
    cell.looseMassCp = 10000;
    eng.markDirty(5, 5, 0, 4);
    eng.stats.strataScanned = 0;
    eng.stats.columnLookups = 0;
    eng.processSlopeStability(1);
    assertEqual(eng.strata.size, 2000, T, 'World holds 2,000 strata');
    assertTrue(eng.stats.columnLookups <= 6, T, `Surface lookups bounded by the dirty cell and its 4 neighbours (${eng.stats.columnLookups})`);
    assertTrue(eng.stats.strataScanned <= 30, T, `Strata scanned bounded by those columns (${eng.stats.strataScanned})`);
}

// 9. Mechanical Weathering Closed-Mass Balance (DEC-040)
function test_weathering_closed_mass_balance() {
    const eng = new GeomorphologyEngine();
    const rock = solidCell(C, 5, 0, 0, 0);
    const initialMass = rock.solidMassCp;
    eng.addStratum(rock);
    const before = eng.getTotalMass().total;

    eng.applyWeathering(5, 0, 0, 0, true, 1);
    const finalMass = rock.solidMassCp + rock.looseMassCp;

    assertEqual(finalMass, initialMass, 'test_weathering_closed_mass_balance', 'Weathering must conserve 100% of mass into regolith sediment');
    assertEqual(eng.getTotalMass().total, before, 'test_weathering_closed_mass_balance', 'World total unchanged');
    assertTrue(rock.looseMassCp > 0, 'test_weathering_closed_mass_balance', 'Fractured rock must be deposited as loose regolith');
    assertEqual(rock.bulkDensity, 6000, 'test_weathering_closed_mass_balance', 'Material density is a property of the rock and does not drift');
    assertEqual(eng.ledgerMassRock + eng.ledgerMassSediment, 0, 'test_weathering_closed_mass_balance', 'Ledger net delta must equal 0 (closed-mass invariant)');
}

// 10. Water Erosion Sediment Wash, and the sediment settling out again
function test_water_erosion_sediment_wash() {
    const T = 'test_water_erosion_sediment_wash';
    const eng = new GeomorphologyEngine();
    const soil = solidCell(OA, 6, 0, 0, 0, 2000);
    const downstream = solidCell(OA, 7, 0, -1, 4, 0);
    const initialMass = soil.solidMassCp;
    const initialParticles = soil.particles;
    eng.addStratum(soil);
    eng.addStratum(downstream);
    const before = eng.getTotalMass().total;

    eng.applyWaterErosion(6, 0, 0, 0, 10, 1); // Fluid velocity = 10 ft/s
    assertTrue(soil.particles < initialParticles, T, 'Water erosion must strip topsoil particles');
    assertTrue(eng.reservoirSuspendedSediment > 0, T, 'Eroded mass must transfer to suspended sediment reservoir');
    assertEqual(soil.solidMassCp + eng.reservoirSuspendedSediment, initialMass, T, 'Total mass between soil and sediment must be conserved');
    assertEqual(eng.getTotalMass().total, before, T, 'World total unchanged by erosion');

    const suspended = eng.reservoirSuspendedSediment;
    const moved = eng.depositSuspendedSediment(7, 0, -1, 4, suspended + 5000);
    assertEqual(moved, suspended, T, 'Deposition moves at most what the water carries');
    assertEqual(eng.reservoirSuspendedSediment, 0, T, 'The suspended reservoir was debited');
    assertEqual(downstream.looseMassCp, suspended, T, 'The downstream cell received the alluvium as loose sediment');
    assertEqual(eng.getTotalMass().total, before, T, 'World total unchanged by deposition');
}

// 11. Thermal Degradation / Lava Interaction (Closed Mass)
function test_thermal_degradation_closed_mass() {
    const eng = new GeomorphologyEngine();
    const soil = solidCell(OA, 7, 0, 0, 0, 0);
    const initialMass = soil.solidMassCp;
    eng.addStratum(soil);
    const before = eng.getTotalMass().total;

    eng.applyThermalDegradation(7, 0, 0, 0, 300, 1);
    assertEqual(soil.solidMassCp, initialMass, 'test_thermal_degradation_closed_mass', 'Zero thermal degradation should occur at normal ambient temperature (300 K)');

    eng.applyThermalDegradation(7, 0, 0, 0, 1200, 1);
    const finalTotal = soil.solidMassCp + eng.reservoirCeramicCp + eng.reservoirAshGasCp;
    assertEqual(finalTotal, initialMass, 'test_thermal_degradation_closed_mass', 'Lava thermal degradation must 100% conserve mass into ceramic and ash/gas reservoirs');
    assertEqual(eng.getTotalMass().total, before, 'test_thermal_degradation_closed_mass', 'World total unchanged');
    assertTrue(eng.reservoirCeramicCp > 0, 'test_thermal_degradation_closed_mass', 'Clay must bake into ceramic brick reservoir');
    assertTrue(eng.reservoirAshGasCp > 0, 'test_thermal_degradation_closed_mass', 'Organic fraction must vaporize into ash and atmospheric gas reservoir');
}

// 12. Dirty Region Quiescence & Performance
function test_dirty_region_quiescence() {
    const eng = new GeomorphologyEngine();
    for (let i = 0; i < 100; i++) {
        eng.addStratum(solidCell(OA, i, 0, 0, 0, 2000));
    }
    eng.processMoistureTick(1);
    eng.processSlopeStability(1);
    assertEqual(eng.stats.strataVisited, 0, 'test_dirty_region_quiescence', 'Undisturbed strata must not be visited during quiescent ticks');
    assertEqual(eng.stats.columnLookups, 0, 'test_dirty_region_quiescence', 'No surface lookups in a quiescent world');
    assertEqual(eng.stats.waterTransfers, 0, 'test_dirty_region_quiescence', 'Zero water transfers should occur in quiescent region');
    assertEqual(eng.stats.sedimentTransfers, 0, 'test_dirty_region_quiescence', 'Zero sediment transfers should occur in quiescent region');
    assertTrue(eng.stats.quiescentTicks >= 2, 'test_dirty_region_quiescence', 'Quiescent ticks must be registered');
}

// 13. Persistence & Serialization Roundtrip
function test_save_load_serialization_roundtrip() {
    const T = 'test_save_load_serialization_roundtrip';
    const eng1 = new GeomorphologyEngine();
    const s1 = solidCell(OA, 8, 9, 1, 2, 2500, true, 45);
    s1.looseMassCp = 1200;
    s1.particles = 4200;
    eng1.addStratum(s1);
    eng1.signedResidualMap.set('edge:test', 0.42);
    eng1.markDirty(8, 9, 1, 2);
    eng1.dirtySlope.add('slope:only');
    eng1.ledgerMassSediment = 500;
    eng1.reservoirSuspendedSediment = 77;

    const savedJson = eng1.serialize();
    const eng2 = new GeomorphologyEngine();
    eng2.deserialize(savedJson);

    const s2 = eng2.getStratum(s1.id);
    assertTrue(Boolean(s2), T, 'Stratum must exist after reload');
    assertEqual(s2.waterMassCp, s1.waterMassCp, T, 'Water mass must be preserved');
    assertEqual(s2.solidMassCp, s1.solidMassCp, T, 'Solid mass must be preserved');
    assertEqual(s2.looseMassCp, s1.looseMassCp, T, 'Loose sediment mass must be preserved');
    assertEqual(s2.particles, s1.particles, T, 'Particle count must be preserved');
    assertEqual(s2.loose, s1.loose, T, 'Loose state must be preserved');
    assertEqual(s2.angleRepose, s1.angleRepose, T, 'Repose angle must be preserved');
    assertEqual(eng2.signedResidualMap.get('edge:test'), 0.42, T, 'Signed residuals must be preserved');
    assertTrue(eng2.dirtyMoisture.has(s1.id) && eng2.dirtySlope.has(s1.id), T, 'Both work queues must be preserved');
    assertTrue(eng2.dirtySlope.has('slope:only') && !eng2.dirtyMoisture.has('slope:only'), T, 'The queues are kept apart');
    assertTrue(eng2.dirtyColumns.has(s1.id), T, 'The dirtyColumns view still answers');
    assertEqual(eng2.reservoirSuspendedSediment, 77, T, 'Reservoirs must be preserved');
    assertTrue(eng2.getHighestStratumAt(8, 9) === s2, T, 'The column index is rebuilt on load');
    assertEqual(eng2.getTotalMass().total, eng1.getTotalMass().total, T, 'World total identical after reload');
}

// 13b. Save in the middle of a cascade, load, continue: same result as running straight through.
function test_save_continue_equivalence() {
    const T = 'test_save_continue_equivalence';
    const build = () => {
        const eng = new GeomorphologyEngine();
        for (let s = 0; s < 5; s++) eng.addStratum(solidCell(C, 0, 0, 0, s));
        const pile = looseCell(OA, 0, 0, 1, 0, 187500, 34);
        eng.addStratum(pile);
        eng.addStratum(solidCell(C, 1, 0, 0, 0));
        eng.addStratum(solidCell(C, 2, 0, -1, 2));
        eng.markDirty(0, 0, 1, 0);
        return eng;
    };
    const snapshot = (eng) => {
        const d = JSON.parse(eng.serialize());
        d.strata.sort((a, b) => (a.id < b.id ? -1 : 1));
        d.residuals.sort((a, b) => (a[0] < b[0] ? -1 : 1));
        d.dirtyMoisture.sort();
        d.dirtySlope.sort();
        return JSON.stringify(d);
    };

    const straight = build();
    for (let t = 0; t < 3; t++) simulateQuiescence(straight);

    const first = build();
    simulateQuiescence(first);
    const saved = first.serialize();
    const resumed = new GeomorphologyEngine();
    resumed.deserialize(saved);
    for (let t = 0; t < 2; t++) simulateQuiescence(resumed);

    assertTrue(straight.stats.sedimentTransfers >= 2, T, `The fixture cascades across more than one tick (${straight.stats.sedimentTransfers} transfers)`);
    assertEqual(resumed.getTotalMass().total, straight.getTotalMass().total, T, 'World total identical with and without a save in the middle');
    assertEqual(snapshot(resumed), snapshot(straight), T, 'Every stratum, residual, queue and reservoir identical after save/continue');
}

// 14. Total Mass Verification (Centipounds)
function test_total_mass_calculation() {
    const eng = new GeomorphologyEngine();
    eng.addStratum(solidCell(C, 10, 0, 0, 0, 0));
    const report = eng.getTotalMass();
    assertEqual(report.rock, 300000, 'test_total_mass_calculation', 'Solid rock mass should be exactly 300000 cp');
    assertEqual(report.total, 300000, 'test_total_mass_calculation', 'Total mass should match exact centipounds');
}

// 15. Browser entry points: a realm with only `window` (no require, no module) gets the kernel.
function test_browser_realm_entry_points() {
    const T = 'test_browser_realm_entry_points';
    const dir = path.join(__dirname, '..', 'game', 'js', 'sim', 'geomorphology');
    const soilSrc = fs.readFileSync(path.join(dir, 'soil.js'), 'utf8');
    const indexSrc = fs.readFileSync(path.join(dir, 'index.js'), 'utf8');

    const ctx = vm.createContext({ window: {} });
    let threw = null;
    try {
        vm.runInContext(soilSrc, ctx, { filename: 'soil.js' });
        vm.runInContext(indexSrc, ctx, { filename: 'index.js' });
    } catch (e) { threw = e; }
    assertEqual(threw, null, T, `soil.js then index.js evaluate in a window-only realm${threw ? ': ' + threw.message : ''}`);
    const soil = ctx.window.DEUS && ctx.window.DEUS.Sim && ctx.window.DEUS.Sim.Soil;
    assertTrue(Boolean(soil && typeof soil.GeomorphologyEngine === 'function'), T, 'window.DEUS.Sim.Soil.GeomorphologyEngine is published');
    assertTrue(Boolean(ctx.window.DEUS && ctx.window.DEUS.Sim && ctx.window.DEUS.Sim.Geomorphology === soil), T, 'window.DEUS.Sim.Geomorphology is the same kernel');

    const ctx2 = vm.createContext({ window: {} });
    let threw2 = null;
    try { vm.runInContext(indexSrc, ctx2, { filename: 'index.js' }); } catch (e) { threw2 = e; }
    assertEqual(threw2, null, T, 'index.js alone does not throw in a window-only realm');
}

function runAll() {
    test_soil_horizon_stratification();
    test_capillary_rise_closed_mass();
    test_capillary_reaches_field_capacity_unaided();
    test_capillary_residual_sees_unrounded_rate();
    test_gravity_downward_drainage();
    test_gravity_drainage_across_z_boundary();
    test_signed_residual_sub_centipound_accumulation();
    test_receiver_side_clamping_pore_space();
    test_angle_of_repose_thresholds();
    test_slope_stability_cascade_conservation();
    test_slope_unknown_ground_moves_nothing();
    test_slope_ground_provider_floor();
    test_slope_deposit_above_full_cell_crosses_z();
    test_slope_settles_at_angle_of_repose();
    test_slope_runs_after_moisture_pass();
    test_slope_competing_transfers();
    test_slope_exhausted_donor();
    test_emptied_cell_is_not_surface();
    test_slope_lookups_are_column_local();
    test_weathering_closed_mass_balance();
    test_water_erosion_sediment_wash();
    test_thermal_degradation_closed_mass();
    test_dirty_region_quiescence();
    test_save_load_serialization_roundtrip();
    test_save_continue_equivalence();
    test_total_mass_calculation();
    test_browser_realm_entry_points();

    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        process.exit(1);
    }
}

// Every mutant must make the suite fail through an assertion (a FAIL: line and exit 1),
// never through a hard-coded exit. Prints one row per mutant; exits 1 if any survives.
function mutationSweep() {
    const names = Object.keys(MUTANTS);
    let survived = 0;
    console.log(`MUTATION SWEEP: ${names.length} mutants`);
    for (const name of names) {
        const r = spawnSync(process.execPath, [__filename, `--mutant=${name}`], { encoding: 'utf8', timeout: 120000 });
        const out = (r.stdout || '') + (r.stderr || '');
        const failLines = out.split(/\r?\n/).filter(l => l.startsWith('FAIL:'));
        const caught = r.status === 1 && failLines.length > 0;
        if (!caught) survived++;
        const first = failLines.length ? failLines[0].slice(6, 130) : '(no FAIL line)';
        console.log(`${caught ? 'CAUGHT ' : 'SURVIVED'} ${name.padEnd(26)} exit=${r.status} fails=${failLines.length}  ${first}`);
    }
    console.log(`\nSWEEP RESULT: ${names.length - survived} caught, ${survived} survived`);
    if (survived > 0) process.exit(1);
}

if (process.argv.includes('--mutation-sweep')) {
    mutationSweep();
} else {
    runAll();
}
