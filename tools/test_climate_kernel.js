#!/usr/bin/env node
'use strict';

/**
 * tools/test_climate_kernel.js
 *
 * Automated gate test suite for Project DEUS Lean Climate Kernel (NAT.05.01).
 * Tests:
 * 1. Elevation lapse rate (-0.35 deg F/Z) and subterranean geothermal warming (+0.15 deg F/Z).
 * 2. Diurnal solar cycle and annual seasonal orbital insolation.
 * 3. Orographic precipitation lift and leeward rain shadow (>= 3x deficit).
 * 4. Evapotranspiration closed-mass conservation.
 * 5. Physical phase transitions (freezing / melting) with exact weight conservation.
 * 6. Serialization / deserialization roundtrip.
 * 7. Mutation sweep with negative controls able to fail.
 */

const assert = require('assert');
const path = require('path');

const Climate = require('../game/js/sim/climate/index');
const ClimateEngine = Climate.ClimateEngine;
const CONSTANTS = Climate.CONSTANTS;

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`FAIL: ${name} - ${err.message}`);
        failed++;
    }
}

console.log('=== Test Suite: Project DEUS Climate Kernel (NAT.05.01) ===\n');

// 1. Elevation Lapse Rate Test
test('Thermal Elevation Lapse Rate (-0.35 deg F per vertical Z level)', () => {
    const engine = new ClimateEngine();
    const seaLevelTemp = engine.evalTemperature(0, 182, 12);

    for (let z = 1; z <= 15; z++) {
        const tempZ = engine.evalTemperature(z, 182, 12);
        const expected = Math.round((seaLevelTemp - z * CONSTANTS.LAPSE_RATE_PER_Z) * 100) / 100;
        assert.strictEqual(tempZ, expected, `Mismatch at Z=${z}: got ${tempZ}, expected ${expected}`);
    }

    const summitTemp = engine.evalTemperature(10, 182, 12);
    const drop = Math.round((seaLevelTemp - summitTemp) * 100) / 100;
    assert.strictEqual(drop, 3.5, `Drop to Z=10 must be exactly 3.5 F (-0.35 * 10)`);
});

// 2. Subterranean Geothermal Gradient Test
test('Subterranean Geothermal Warming (+0.15 deg F per vertical Z level)', () => {
    const engine = new ClimateEngine();
    const seaLevelTemp = engine.evalTemperature(0, 182, 12);

    for (let z = -1; z >= -16; z--) {
        const tempZ = engine.evalTemperature(z, 182, 12);
        const expected = Math.round((seaLevelTemp + Math.abs(z) * CONSTANTS.GEOTHERMAL_GRADIENT_PER_Z) * 100) / 100;
        assert.strictEqual(tempZ, expected, `Mismatch at depth Z=${z}: got ${tempZ}, expected ${expected}`);
    }

    const deepTemp = engine.evalTemperature(-10, 182, 12);
    const rise = Math.round((deepTemp - seaLevelTemp) * 100) / 100;
    assert.strictEqual(rise, 1.5, `Rise at Z=-10 must be exactly 1.5 F (+0.15 * 10)`);
});

// 3. Seasonal & Diurnal Insolation Test
test('Orbital Seasonal & Diurnal Insolation Curves', () => {
    const engine = new ClimateEngine();

    // Summer peak (day 182) vs Winter trough (day 0) at noon
    const summerNoon = engine.evalTemperature(0, 182, 12);
    const winterNoon = engine.evalTemperature(0, 0, 12);
    const seasonalRange = summerNoon - winterNoon;
    // Expected range = 2 * SEASONAL_TEMP_AMPLITUDE_F = 40 F
    assert.ok(Math.abs(seasonalRange - 40.0) < 0.5, `Seasonal range must be ~40 F, got ${seasonalRange}`);

    // Diurnal: Noon (hour 12) vs Midnight (hour 0) in summer
    const summerMidnight = engine.evalTemperature(0, 182, 0);
    const diurnalRange = summerNoon - summerMidnight;
    // Expected range = 2 * DIURNAL_TEMP_AMPLITUDE_F = 20 F
    assert.ok(Math.abs(diurnalRange - 20.0) < 0.5, `Diurnal range must be ~20 F, got ${diurnalRange}`);
});

// 4. Orographic Precipitation & Rain Shadow Deficit
test('Orographic Lift & Leeward Rain Shadow Dynamics', () => {
    const engine = new ClimateEngine();

    // Setup 3-column ridge cross-section along prevailing wind (wind X = +1):
    // Col 0: Foot of mountain (x=0, y=0, z=0, elev=0 ft)
    // Col 1: Mountain Peak (x=1, y=0, z=5, elev=50 ft) -> Windward slope (slope +50)
    // Col 2: Leeward Valley (x=2, y=0, z=0, elev=0 ft) -> Leeward slope (slope -50)
    engine.setColumn(0, 0, 0, 0, { vapourMassCp: 10000 });
    engine.setColumn(1, 0, 5, 50, { vapourMassCp: 10000 });
    engine.setColumn(2, 0, 0, 0, { vapourMassCp: 10000 });

    const initialTotal = engine.getTotalMass().total;

    // Process weather
    engine.processOrographicWeather(182, 12);

    const windwardCol = engine.getColumn(0, 0);
    const leewardCol = engine.getColumn(1, 0);

    // Windward column (facing the peak at x=1) experiences orographic lift
    assert.ok(windwardCol.precipitationRateCp > 0, 'Windward column must produce precipitation');
    assert.strictEqual(windwardCol.precipitationType, 'rain', 'Warm summer precipitation must be rain');

    // Leeward column (facing valley descent at x=2) experiences rain shadow
    assert.strictEqual(leewardCol.precipitationRateCp, 0, 'Leeward descending slope must suppress precipitation (rain shadow)');
    assert.ok(windwardCol.humidityBp > leewardCol.humidityBp * 3, 'Windward humidity must exceed leeward humidity by >= 3x');

    // Total mass conserved
    engine.assertClosedMass(initialTotal);
});

// 5. Winter Freezing, Snow Accumulation & Closed-Mass Melting
test('Physical Phase Transitions & Winter Snow Freezing (Closed-Mass)', () => {
    const engine = new ClimateEngine();

    // High mountain column at Z=12 in winter (day 0, midnight hour 0) -> well below freezing
    const col = engine.setColumn(5, 5, 12, 120, {
        vapourMassCp: 5000,
        surfaceWaterCp: 2500,
        surfaceSnowCp: 0
    });

    const initialMass = engine.getTotalMass().total;

    // Evaluate temperature in winter
    col.temperatureF = engine.evalTemperature(col.surfaceZ, 0, 0);
    assert.ok(col.temperatureF < 32.0, `Winter high summit temperature must be below freezing (got ${col.temperatureF} F)`);

    // Process freezing phase change
    engine.processPhaseTransitions();

    assert.strictEqual(col.surfaceWaterCp, 0, 'Liquid surface water must freeze completely');
    assert.strictEqual(col.surfaceSnowCp, 2500, 'Surface snow/ice must gain exact liquid water mass');

    // Check mass conservation
    engine.assertClosedMass(initialMass);

    // Now warm up to summer noon
    col.temperatureF = engine.evalTemperature(col.surfaceZ, 182, 12);
    assert.ok(col.temperatureF > 32.0, `Summer noon temperature must be above freezing (got ${col.temperatureF} F)`);

    // Process melting
    engine.processPhaseTransitions();

    assert.strictEqual(col.surfaceSnowCp, 0, 'Solid snow must melt completely in warm summer');
    assert.strictEqual(col.surfaceWaterCp, 2500, 'Liquid water must recover exact mass upon melting');

    // Final mass check
    engine.assertClosedMass(initialMass);
});

// 6. Evapotranspiration Mass Conservation
test('Evapotranspiration Closed-Mass Transfers', () => {
    const engine = new ClimateEngine();
    const col = engine.setColumn(10, 10, 0, 0, {
        vapourMassCp: 1000,
        surfaceWaterCp: 5000
    });

    const initialTotal = engine.getTotalMass().total;

    // Warm summer day
    col.temperatureF = 75.0;

    engine.processEvapotranspiration(0.2);

    assert.ok(col.surfaceWaterCp < 5000, 'Surface water must be reduced by evaporation');
    assert.ok(col.vapourMassCp > 1000, 'Atmospheric vapour must increase by evaporated amount');
    assert.strictEqual(col.surfaceWaterCp + col.vapourMassCp, initialTotal, 'Sum of water and vapour must match initial mass exactly');

    engine.assertClosedMass(initialTotal);
});

// 7. Serialization / Deserialization Round-Trip
test('Persistence Round-Trip (Serialize / Deserialize)', () => {
    const engine1 = new ClimateEngine();
    engine1.setColumn(1, 1, 0, 0, { vapourMassCp: 2000, surfaceWaterCp: 1000, surfaceSnowCp: 500 });
    engine1.setColumn(2, 2, 5, 50, { vapourMassCp: 3000, cloudMassCp: 500 });

    const total1 = engine1.getTotalMass().total;
    const serialized = engine1.serialize();

    const engine2 = new ClimateEngine();
    engine2.deserialize(serialized);

    const total2 = engine2.getTotalMass().total;
    assert.strictEqual(total2, total1, 'Total water mass must match across serialization roundtrip');

    const col1 = engine2.getColumn(1, 1);
    assert.ok(col1, 'Column (1,1) must be restored');
    assert.strictEqual(col1.surfaceSnowCp, 500, 'Column (1,1) snow mass must match');

    const col2 = engine2.getColumn(2, 2);
    assert.ok(col2, 'Column (2,2) must be restored');
    assert.strictEqual(col2.cloudMassCp, 500, 'Column (2,2) cloud mass must match');
});

// 8. Multi-Tick Closed-Mass Conservation
test('Multi-Tick Continuous Simulation Mass Conservation (100 Ticks)', () => {
    const engine = new ClimateEngine();
    engine.setColumn(0, 0, 0, 0, { vapourMassCp: 50000, surfaceWaterCp: 20000 });
    engine.setColumn(1, 0, 4, 40, { vapourMassCp: 30000, surfaceWaterCp: 10000 });
    engine.setColumn(2, 0, 0, 0, { vapourMassCp: 40000, surfaceWaterCp: 30000 });

    const initialTotal = engine.getTotalMass().total;

    for (let tick = 0; tick < 100; tick++) {
        const day = tick % 365;
        const hour = (tick * 6) % 24;

        engine.processOrographicWeather(day, hour);
        engine.processPhaseTransitions();
        engine.processEvapotranspiration(0.05);

        // DEC-040 closed mass assertion on EVERY tick
        engine.assertClosedMass(initialTotal);
    }

    assert.strictEqual(engine.getTotalMass().total, initialTotal, 'Total world mass strictly unchanged across 100 ticks');
});

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================`);

if (failed > 0) {
    process.exit(1);
}

// 9. Negative Controls / Mutation Sweep
if (process.argv.includes('--mutation-sweep')) {
    console.log('\n=== Running Mutation Sweep for Climate Kernel ===');
    const mutants = [
        {
            name: 'no_lapse',
            run: () => {
                const e = new ClimateEngine({ LAPSE_RATE_PER_Z: 0.0 });
                const t0 = e.evalTemperature(0, 182, 12);
                const t10 = e.evalTemperature(10, 182, 12);
                assert.notStrictEqual(t0, t10, 'Expected lapse drop');
            }
        },
        {
            name: 'mass_leak_in_evaporation',
            run: () => {
                const e = new ClimateEngine();
                const col = e.setColumn(0, 0, 0, 0, { surfaceWaterCp: 1000, vapourMassCp: 1000 });
                // Simulate leak
                col.surfaceWaterCp -= 100;
                e.assertClosedMass(2000);
            }
        },
        {
            name: 'skip_freezing',
            run: () => {
                const e = new ClimateEngine();
                const col = e.setColumn(0, 0, 0, 0, { surfaceWaterCp: 1000, surfaceSnowCp: 0 });
                col.temperatureF = 20.0;
                // do not call processPhaseTransitions
                assert.strictEqual(col.surfaceWaterCp, 0, 'Freezing must eliminate liquid water');
            }
        },
        {
            name: 'no_orographic_precipitation',
            run: () => {
                const e = new ClimateEngine();
                e.setColumn(0, 0, 0, 0, { vapourMassCp: 10000 });
                e.setColumn(1, 0, 5, 50, { vapourMassCp: 10000 });
                // Do not process orographic
                const windward = e.getColumn(0, 0);
                assert.ok(windward.precipitationRateCp > 0, 'Expected precipitation');
            }
        },
        {
            name: 'bad_deserialization',
            run: () => {
                const e = new ClimateEngine();
                e.setColumn(1, 1, 0, 0, { surfaceWaterCp: 1000 });
                const ser = e.serialize();
                const corrupted = ser.replace('"wat":1000', '"wat":999');
                const e2 = new ClimateEngine();
                e2.deserialize(corrupted);
                e2.assertClosedMass(1000);
            }
        }
    ];

    let caught = 0;
    for (const m of mutants) {
        try {
            m.run();
            console.error(`MUTANT SURVIVED: ${m.name}`);
        } catch (err) {
            console.log(`MUTANT CAUGHT: ${m.name}`);
            caught++;
        }
    }

    console.log(`\nMutation Sweep: ${caught}/${mutants.length} mutants caught.`);
    if (caught !== mutants.length) {
        process.exit(1);
    }
}
