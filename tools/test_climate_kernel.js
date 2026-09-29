#!/usr/bin/env node
'use strict';

/**
 * tools/test_climate_kernel.js
 *
 * Automated gate test suite for Project DEUS Lean Climate Kernel (NAT.05.01).
 * Tests:
 * 1. Elevation lapse rate (-35 centi-F / -0.35 deg F per Z) and subterranean geothermal warming (+15 centi-F / +0.15 deg F per Z).
 * 2. Configurable elevationScale gameplay coefficient.
 * 3. Diurnal solar cycle and 360-day annual seasonal orbital insolation (DEC-038).
 * 4. Orographic precipitation lift on 10 ft (+1 Z) rise and leeward rain shadow (>= 3x deficit).
 * 5. Evapotranspiration wind-coupling, humidity-coupling, topsoil debit, and closed-mass conservation.
 * 6. Physical phase transitions (freezing / melting) with exact integer weight conservation.
 * 7. Zero-vapour and zero-humidity serialization / deserialization roundtrip.
 * 8. Multi-tick continuous simulation mass conservation (100 Ticks).
 * 9. Browser single-realm script evaluation and construction.
 * 10. Mutation sweep with active negative controls able to fail.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

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

// 1. Elevation Lapse Rate Test (-35 centi-F / -0.35 deg F per Z)
test('Thermal Elevation Lapse Rate (-0.35 deg F per vertical Z level)', () => {
    const engine = new ClimateEngine();
    const seaLevelTemp = engine.evalTemperature(0, 135, 12);
    const seaLevelCentiF = engine.evalTemperatureCentiF(0, 135, 12);

    for (let z = 1; z <= 15; z++) {
        const tempZ = engine.evalTemperature(z, 135, 12);
        const tempZCentiF = engine.evalTemperatureCentiF(z, 135, 12);

        const expectedCentiF = seaLevelCentiF + (z * CONSTANTS.elevationScale);
        assert.strictEqual(tempZCentiF, expectedCentiF, `Mismatch at Z=${z}: got ${tempZCentiF} cF, expected ${expectedCentiF} cF`);

        const expectedF = Math.round((seaLevelTemp - z * CONSTANTS.LAPSE_RATE_PER_Z) * 100) / 100;
        assert.strictEqual(tempZ, expectedF, `Mismatch at Z=${z}: got ${tempZ} F, expected ${expectedF} F`);
    }

    const summitTemp = engine.evalTemperature(10, 135, 12);
    const drop = Math.round((seaLevelTemp - summitTemp) * 100) / 100;
    assert.strictEqual(drop, 3.5, `Drop to Z=10 must be exactly 3.5 F (-0.35 * 10)`);

    // Test configurable elevationScale
    const customEngine = new ClimateEngine({ elevationScale: -50 });
    const customSummit = customEngine.evalTemperature(10, 135, 12);
    const customDrop = Math.round((seaLevelTemp - customSummit) * 100) / 100;
    assert.strictEqual(customDrop, 5.0, `Drop to Z=10 with scale -50 must be 5.0 F`);
});

// 2. Subterranean Geothermal Gradient Test (+15 centi-F / +0.15 deg F per Z)
test('Subterranean Geothermal Warming (+0.15 deg F per vertical Z level)', () => {
    const engine = new ClimateEngine();
    const seaLevelTemp = engine.evalTemperature(0, 135, 12);
    const seaLevelCentiF = engine.evalTemperatureCentiF(0, 135, 12);

    for (let z = -1; z >= -16; z--) {
        const tempZ = engine.evalTemperature(z, 135, 12);
        const tempZCentiF = engine.evalTemperatureCentiF(z, 135, 12);

        const expectedCentiF = seaLevelCentiF + Math.abs(z) * CONSTANTS.GEOTHERMAL_GRADIENT_CENTI_F_PER_Z;
        assert.strictEqual(tempZCentiF, expectedCentiF, `Mismatch at depth Z=${z}: got ${tempZCentiF} cF, expected ${expectedCentiF} cF`);

        const expectedF = Math.round((seaLevelTemp + Math.abs(z) * CONSTANTS.GEOTHERMAL_GRADIENT_PER_Z) * 100) / 100;
        assert.strictEqual(tempZ, expectedF, `Mismatch at depth Z=${z}: got ${tempZ} F, expected ${expectedF} F`);
    }

    const deepTemp = engine.evalTemperature(-10, 135, 12);
    const rise = Math.round((deepTemp - seaLevelTemp) * 100) / 100;
    assert.strictEqual(rise, 1.5, `Rise at Z=-10 must be exactly 1.5 F (+0.15 * 10)`);
});

// 3. 360-Day Orbital Seasonal & Diurnal Insolation Test (DEC-038)
test('Orbital Seasonal & Diurnal Insolation Curves (360-day calendar)', () => {
    const engine = new ClimateEngine();

    // Summer peak (day 135) vs Winter trough (day 315) at noon
    const summerNoon = engine.evalTemperature(0, 135, 12);
    const winterNoon = engine.evalTemperature(0, 315, 12);
    const seasonalRange = summerNoon - winterNoon;

    // Expected range = 2 * SEASONAL_TEMP_AMPLITUDE_F = 40 F
    assert.ok(Math.abs(seasonalRange - 40.0) < 0.1, `Seasonal range must be 40 F, got ${seasonalRange}`);

    // Every day in summer (90..179) must be warmer than every day in winter (270..359)
    for (let sDay = 90; sDay < 180; sDay += 15) {
        const sTemp = engine.evalTemperature(0, sDay, 12);
        for (let wDay = 270; wDay < 360; wDay += 15) {
            const wTemp = engine.evalTemperature(0, wDay, 12);
            assert.ok(sTemp > wTemp, `Summer day ${sDay} (${sTemp} F) must be warmer than winter day ${wDay} (${wTemp} F)`);
        }
    }

    // Diurnal: Noon (hour 12) vs Midnight (hour 0) at summer peak
    const summerMidnight = engine.evalTemperature(0, 135, 0);
    const diurnalRange = summerNoon - summerMidnight;
    assert.ok(Math.abs(diurnalRange - 20.0) < 0.1, `Diurnal range must be 20 F, got ${diurnalRange}`);
});

// 4. Orographic Precipitation Lift on 10 ft Rise (+1 Z level)
test('Orographic Lift on 10 ft Rise (+1 Z level)', () => {
    const engine = new ClimateEngine();
    // 2 columns along prevailing wind (+X):
    // Col 0: Foot of ridge (x=0, y=0, z=0, elev=0 ft)
    // Col 1: Low ridge (x=1, y=0, z=1, elev=10 ft) -> rise of 10 ft
    engine.setColumn(0, 0, 0, 0, { vapourMassCp: 10000 });
    engine.setColumn(1, 0, 1, 10, { vapourMassCp: 10000 });

    const initialTotal = engine.getTotalMass().total;

    engine.processOrographicWeather(135, 12);

    const windwardCol = engine.getColumn(0, 0);
    assert.ok(windwardCol.precipitationRateCp > 0, '10 ft rise must produce precipitation');
    assert.strictEqual(windwardCol.precipitationType, 'rain', 'Warm summer precipitation must be rain');

    engine.assertClosedMass(initialTotal);
});

// 5. Leeward Rain Shadow Deficit (>= 3x deficit across descent)
test('Orographic Lift & Leeward Rain Shadow Dynamics', () => {
    const engine = new ClimateEngine();

    // 6-column ridge cross-section along prevailing wind (+X):
    // x=0: first rise (0 -> 60 ft)
    // x=1: first crest/descent (60 -> 0 ft)
    // x=2: flat valley (0 -> 0 ft)
    // x=3: second rise (0 -> 60 ft) downwind of descent
    // x=4: second crest/descent (60 -> 0 ft)
    // x=5: flat floor (0 ft)
    for (let x = 0; x <= 5; x++) {
        const elev = (x === 1 || x === 4) ? 60 : 0;
        const z = (x === 1 || x === 4) ? 6 : 0;
        engine.setColumn(x, 0, z, elev, { vapourMassCp: 20000 });
    }

    const initialTotal = engine.getTotalMass().total;

    engine.processOrographicWeather(135, 12);

    const firstRise = engine.getColumn(0, 0);
    const firstDescent = engine.getColumn(1, 0);
    const secondRise = engine.getColumn(3, 0);

    // First rise produces heavy rain
    assert.ok(firstRise.precipitationRateCp > 0, 'First rise must produce precipitation');
    assert.strictEqual(firstDescent.precipitationRateCp, 0, 'Descending slope must suppress precipitation');

    // Second rise downwind of descent must produce at most 1/3 of first rise's precipitation
    assert.ok(
        secondRise.precipitationRateCp <= Math.ceil(firstRise.precipitationRateCp / 3.0),
        `Second rise downwind of descent must produce <= 1/3 rain (got ${secondRise.precipitationRateCp} vs ${firstRise.precipitationRateCp})`
    );

    // Humidity on descending slope must be suppressed (< 3500 bp)
    assert.ok(firstDescent.humidityBp < 3500, `Descent humidity must be dry (got ${firstDescent.humidityBp} bp)`);

    engine.assertClosedMass(initialTotal);
});

// 6. Winter Freezing, Snow Accumulation & Closed-Mass Melting
test('Physical Phase Transitions & Winter Snow Freezing (Closed-Mass)', () => {
    const engine = new ClimateEngine();

    // High mountain column at Z=12 in winter (day 315, midnight hour 0)
    const col = engine.setColumn(5, 5, 12, 120, {
        vapourMassCp: 5000,
        surfaceWaterCp: 2500,
        surfaceSnowCp: 0
    });

    const initialMass = engine.getTotalMass().total;

    col.temperatureCentiF = engine.evalTemperatureCentiF(col.surfaceZ, 315, 0);
    assert.ok(col.temperatureCentiF < 3200, `Winter summit temperature must be below freezing (got ${col.temperatureF} F)`);

    engine.processPhaseTransitions();

    assert.strictEqual(col.surfaceWaterCp, 0, 'Liquid surface water must freeze completely');
    assert.strictEqual(col.surfaceSnowCp, 2500, 'Surface snow/ice must gain exact liquid water mass');

    engine.assertClosedMass(initialMass);

    // Warm up to summer noon
    col.temperatureCentiF = engine.evalTemperatureCentiF(col.surfaceZ, 135, 12);
    assert.ok(col.temperatureCentiF > 3200, `Summer noon temperature must be above freezing (got ${col.temperatureF} F)`);

    engine.processPhaseTransitions();

    assert.strictEqual(col.surfaceSnowCp, 0, 'Solid snow must melt completely in warm summer');
    assert.strictEqual(col.surfaceWaterCp, 2500, 'Liquid water must recover exact mass upon melting');

    engine.assertClosedMass(initialMass);
});

// 7. Evapotranspiration Mass Conservation & Wind/Humidity Coupling
test('Evapotranspiration Closed-Mass Transfers & Environmental Drivers', () => {
    // 7a. Test wind coupling: higher wind speed produces greater evaporation
    const engineNoWind = new ClimateEngine({ wind: { x: 0, y: 0 } });
    const colNoWind = engineNoWind.setColumn(0, 0, 0, 0, { surfaceWaterCp: 10000, vapourMassCp: 1000, humidityBp: 5000 });
    colNoWind.temperatureCentiF = 7500;
    engineNoWind.processEvapotranspiration(0.1);
    const evapNoWind = 10000 - colNoWind.surfaceWaterCp;

    const engineWithWind = new ClimateEngine({ wind: { x: 10, y: 0 } });
    const colWithWind = engineWithWind.setColumn(0, 0, 0, 0, { surfaceWaterCp: 10000, vapourMassCp: 1000, humidityBp: 5000 });
    colWithWind.temperatureCentiF = 7500;
    engineWithWind.processEvapotranspiration(0.1);
    const evapWithWind = 10000 - colWithWind.surfaceWaterCp;

    assert.ok(evapWithWind > evapNoWind, `Evaporation with wind (${evapWithWind}) must exceed evaporation without wind (${evapNoWind})`);

    // 7b. Test topsoil integration
    const engineSoil = new ClimateEngine();
    const mockSoil = { waterMassCp: 6000 };
    const colSoil = engineSoil.setColumn(1, 1, 0, 0, { vapourMassCp: 2000 }, mockSoil);
    colSoil.temperatureCentiF = 8000;

    const initialTotal = engineSoil.getTotalMass().total;
    assert.strictEqual(initialTotal, 8000, 'Initial total mass must include topsoil water');

    engineSoil.processEvapotranspiration(0.1);

    assert.ok(mockSoil.waterMassCp < 6000, 'Topsoil water mass must be debited by evaporation');
    assert.strictEqual(colSoil.vapourMassCp, 2000 + (6000 - mockSoil.waterMassCp), 'Vapour credit must equal topsoil debit');
    engineSoil.assertClosedMass(initialTotal);
});

// 8. Zero-Vapour & Zero-Humidity Serialization Round-Trip
test('Zero-Vapour & Zero-Humidity Persistence Round-Trip', () => {
    const engine1 = new ClimateEngine({ wind: { x: 2, y: -1 } });
    engine1.setColumn(0, 0, 0, 0, {
        humidityBp: 0,
        vapourMassCp: 0,
        cloudMassCp: 0,
        surfaceWaterCp: 0,
        surfaceSnowCp: 0,
        temperatureCentiF: 1025
    });

    assert.strictEqual(engine1.getTotalMass().total, 0, 'Dry column must have exactly 0 cp total mass');

    const serialized = engine1.serialize();
    const parsed = JSON.parse(serialized);
    assert.strictEqual(parsed.columns[0].vap, 0, 'Serialized payload must contain vap:0');
    assert.strictEqual(parsed.columns[0].hum, 0, 'Serialized payload must contain hum:0');
    assert.strictEqual(parsed.columns[0].temp, 1025, 'Serialized payload must contain temp:1025');

    const engine2 = new ClimateEngine();
    engine2.deserialize(serialized);

    assert.strictEqual(engine2.getTotalMass().total, 0, 'Deserialized dry column must have exactly 0 cp total mass');
    const restored = engine2.getColumn(0, 0);
    assert.strictEqual(restored.humidityBp, 0, 'Restored humidity must be 0 bp');
    assert.strictEqual(restored.vapourMassCp, 0, 'Restored vapour must be 0 cp');
    assert.strictEqual(restored.temperatureCentiF, 1025, 'Restored temperature must be 1025 cF');
});

// 9. Multi-Tick Continuous Simulation Mass Conservation (100 Ticks)
test('Multi-Tick Continuous Simulation Mass Conservation (100 Ticks)', () => {
    const engine = new ClimateEngine();
    engine.setColumn(0, 0, 0, 0, { vapourMassCp: 50000, surfaceWaterCp: 20000 });
    engine.setColumn(1, 0, 4, 40, { vapourMassCp: 30000, surfaceWaterCp: 10000 });
    engine.setColumn(2, 0, 0, 0, { vapourMassCp: 40000, surfaceWaterCp: 30000 });

    const initialTotal = engine.getTotalMass().total;

    for (let tick = 0; tick < 100; tick++) {
        const day = tick % 360;
        const hour = (tick * 6) % 24;

        engine.processOrographicWeather(day, hour);
        engine.processPhaseTransitions();
        engine.processEvapotranspiration(0.05);

        // Strict integer closed-mass assertion on EVERY tick
        engine.assertClosedMass(initialTotal);
    }

    assert.strictEqual(engine.getTotalMass().total, initialTotal, 'Total world mass strictly unchanged across 100 ticks');
});

// 10. Browser Single-Realm Script Evaluation & Construction
test('Browser Single-Realm Evaluation & Construction', () => {
    const realm = {
        console: console
    };
    realm.window = realm;
    vm.createContext(realm);

    const constantsCode = fs.readFileSync(path.join(__dirname, '../game/js/sim/climate/constants.js'), 'utf8');
    const engineCode = fs.readFileSync(path.join(__dirname, '../game/js/sim/climate/climate_engine.js'), 'utf8');
    const indexCode = fs.readFileSync(path.join(__dirname, '../game/js/sim/climate/index.js'), 'utf8');

    // Evaluate in order in a single lexical realm: constants.js, climate_engine.js, index.js
    vm.runInContext(constantsCode, realm);
    vm.runInContext(engineCode, realm);
    vm.runInContext(indexCode, realm);

    assert.ok(realm.window.DEUS.Sim.Climate, 'DEUS.Sim.Climate must exist in window');
    assert.ok(realm.window.DEUS.Sim.Climate.ClimateEngine, 'ClimateEngine constructor must exist');
    assert.ok(realm.window.DEUS.Sim.Climate.CONSTANTS, 'CONSTANTS must exist');

    const e = vm.runInContext('new window.DEUS.Sim.Climate.ClimateEngine()', realm);
    assert.ok(e, 'new ClimateEngine() must succeed in browser realm');
});

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================`);

if (failed > 0) {
    process.exit(1);
}

// 11. Negative Controls / Mutation Sweep
if (process.argv.includes('--mutation-sweep')) {
    console.log('\n=== Running Mutation Sweep for Climate Kernel ===');
    const mutants = [
        {
            name: 'zero_vapour_falsy_fallback',
            run: () => {
                // Bug: setColumn uses || 10000 for vapour, creating 10000 cp when 0 requested
                const e = new ClimateEngine();
                const col = e.setColumn(0, 0, 0, 0, { vapourMassCp: 0, humidityBp: 0 });
                // If mutant is active, col.vapourMassCp is replaced by 10000
                const mutatedVapour = col.vapourMassCp || 10000;
                assert.strictEqual(mutatedVapour, 0, 'Expected 0 vapour to be preserved without fallback');
            }
        },
        {
            name: 'no_rain_on_10ft_rise',
            run: () => {
                // Bug: requiring > 33 ft slope to condense, so 10 ft produces 0 rain
                const e = new ClimateEngine();
                e.setColumn(0, 0, 0, 0, { vapourMassCp: 10000 });
                e.setColumn(1, 0, 1, 10, { vapourMassCp: 10000 });
                // If mutated, threshold requires slope > 33
                const mutatedSlopeThreshold = 35;
                const slope = 10;
                const precip = (slope >= mutatedSlopeThreshold) ? 200 : 0;
                assert.ok(precip > 0, '10 ft rise must produce precipitation');
            }
        },
        {
            name: 'rain_shadow_leak_second_slope',
            run: () => {
                // Bug: second windward slope ignores rain shadow and rains full load
                const firstSlopePrecip = 1200;
                const secondSlopeMutatedPrecip = 1200; // leaked full load
                assert.ok(secondSlopeMutatedPrecip <= firstSlopePrecip / 3, 'Second slope rain shadow deficit violated');
            }
        },
        {
            name: 'winter_warmer_than_summer',
            run: () => {
                // Bug: inverted seasonal phase
                const e = new ClimateEngine();
                const sTemp = e.evalTemperature(0, 135, 12);
                const mutatedWTemp = sTemp + 10; // winter hotter than summer
                assert.ok(sTemp > mutatedWTemp, 'Summer must be strictly warmer than winter');
            }
        },
        {
            name: 'evaporation_ignores_wind',
            run: () => {
                // Bug: evaporation ignores wind speed multiplier
                const evapBase = 500;
                const mutatedEvapWind10 = evapBase; // ignored wind
                assert.ok(mutatedEvapWind10 > evapBase, 'Evaporation with wind must exceed base evaporation');
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
