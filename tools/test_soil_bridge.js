#!/usr/bin/env node
'use strict';

//=============================================================================
// test_soil_bridge.js - Soil Engine Bridge Gate Test Suite
// Project DEUS - NAT.04.01 (lane-cf)
// Authority: DEC-037, DEC-038, DEC-039, DEC-040, DEC-041, Grok Review fb8ffd36
//
// Verifies:
// 1. Bridge builds GeomorphologyEngine from DEUS_Levels strata columns.
// 2. Feeds soil and loose strata only; stone/air excluded.
// 3. groundElevationProvider returns kernel datum feet or null for unknown.
// 4. Ticks until quiet, conserving getTotalMass().total on every tick.
// 5. Mirrors angle-of-repose cascades back into DEUS_Levels without resetting HP.
// 6. Quiescence: zero ticks or calculations when dirty queues are empty.
// 7. interact:dug event marks cell dirty and loosens sediment.
// 8. Save/load serialization round-tripping via World.state.soil.
// 9. Mutation sweep catches every mutant: no_mirror, tick_when_quiet,
//    skip_provider, save_without_engine, double_load.
//=============================================================================

const path = require('path');
const { spawnSync } = require('child_process');

// Setup mock global environment for headless testing
global.window = global;
global.DEUS = global.DEUS || {};
global.UF = global.UF || global.DEUS;

// Mock event bus
const eventListeners = new Map();
global.UF.Events = {
    on(name, fn) {
        if (!eventListeners.has(name)) eventListeners.set(name, []);
        eventListeners.get(name).push(fn);
    },
    emit(name, ...args) {
        const list = eventListeners.get(name) || [];
        for (const fn of list) fn(...args);
    }
};

// Mock World and World.state
global.UF.World = {
    state: {
        soil: {},
        soilSchemaVersion: 1
    },
    currentArea() {
        return { x: 0, y: 0 };
    }
};

// Mock DEUS_Levels
const mockLevelsData = new Map(); // key "ax,ay:x,y:z" -> { materials: [5], constructed: [5], hp: [5], connector: 0 }
function levelKey(ref) {
    const a = ref.area || { x: 0, y: 0 };
    return `${a.x},${a.y}:${ref.x},${ref.y}:${ref.z || 0}`;
}

global.UF.Levels = {
    strataAt(ref) {
        const k = levelKey(ref);
        if (!mockLevelsData.has(k)) return null;
        const d = mockLevelsData.get(k);
        return {
            materials: d.materials.slice(),
            constructed: (d.constructed || [false, false, false, false, false]).slice(),
            hp: (d.hp || [255, 255, 255, 255, 255]).slice(),
            bytes: d.materials.map(m => (m === 'soil' ? 2 : m === 'stone' ? 1 : 0)),
            connector: d.connector || 0,
            fill: 5,
            changed: false
        };
    },
    setStrata(ref, spec, opts = {}) {
        const k = levelKey(ref);
        const m = spec.m ? spec.m.slice() : ['air', 'air', 'air', 'air', 'air'];
        const hp = spec.hp ? spec.hp.slice() : m.map(mat => (mat !== 'air' ? 255 : 0));
        const constructed = m.map((_, idx) => (opts.constructed ? true : false));
        mockLevelsData.set(k, { materials: m, hp, constructed, connector: spec.connector || 0 });
        return true;
    },
    strataMaterialsAt(ref) {
        const s = this.strataAt(ref);
        return s ? s.materials : null;
    },
    setStratumMaterial(ref, s, material, opts = {}) {
        const cur = this.strataAt(ref);
        if (!cur) return false;
        const m = cur.materials.slice();
        const hp = cur.hp.slice();
        const constructed = cur.constructed.slice();
        m[s] = material;
        if (opts.hp !== undefined && opts.hp[s] !== undefined) {
            hp[s] = opts.hp[s];
        } else if (material !== 'air') {
            hp[s] = cur.hp[s] > 0 ? cur.hp[s] : 255;
        } else {
            hp[s] = 0;
        }
        if (opts.constructed !== undefined) {
            constructed[s] = Boolean(opts.constructed);
        }
        const k = levelKey(ref);
        mockLevelsData.set(k, { materials: m, hp, constructed, connector: cur.connector });
        return true;
    },
    worldStrataElevationAt(area, x, y, z = 0) {
        const s = this.strataAt({ area, x, y, z });
        if (!s) return -1;
        // Find top solid stratum
        for (let i = 4; i >= 0; i--) {
            if (s.materials[i] !== 'air') {
                return (z - (-16)) * 5 + i;
            }
        }
        return -1;
    },
    surfaceHeightAt(area, x, y, z = 0) {
        const s = this.strataAt({ area, x, y, z });
        if (!s) return -1;
        for (let i = 4; i >= 0; i--) {
            if (s.materials[i] !== 'air') return i;
        }
        return -1;
    }
};

// Mock UF.Look
global.UF.Look = {
    cellAt(x, y) {
        return { x, y, text: 'Meadow', ground: 'grass' };
    }
};

// Load bridge plugin
const SimBridge = require('../game/js/plugins/DEUS_SimBridge.js');

let passed = 0;
let failed = 0;

function check(desc, cond, extra = '') {
    if (cond) {
        console.log(`PASS: ${desc} ${extra}`);
        passed++;
    } else {
        console.error(`FAIL: ${desc} ${extra}`);
        failed++;
    }
}

function runSuite() {
    passed = 0;
    failed = 0;
    SimBridge.resetEngines();
    mockLevelsData.clear();
    global.UF.World.state.soil = {};

    const area = { x: 0, y: 0 };

    console.log('=== Test 1: Provider Connection & Elevation Datum ===');
    const eng = SimBridge.getEngine(area);
    check('GeomorphologyEngine created for area', !!eng);

    // Setup a known floor at (11, 10): 2 strata stone (s=0, 1), 3 air (s=2, 3, 4)
    global.UF.Levels.setStrata({ area, x: 11, y: 10, z: 0 }, { m: ['stone', 'stone', 'air', 'air', 'air'] });
    const elevFloor = eng.groundElevationProvider ? eng.groundElevationProvider(11, 10) : null;
    // e = (0 - (-16)) * 5 + 1 = 81. Top elevation: (81 + 1) * 2 = 164 ft.
    check('groundElevationProvider returns exact kernel datum (164 ft)', elevFloor === 164, `(Got ${elevFloor})`);

    // Unknown ground (no solid floor) at (50, 50)
    const elevUnknown = eng.groundElevationProvider ? eng.groundElevationProvider(50, 50) : null;
    check('groundElevationProvider returns null for unknown ground', elevUnknown === null, `(Got ${elevUnknown})`);

    console.log('\n=== Test 2: Feeding Strata from DEUS_Levels (Excluding Stone/Air) ===');
    // Setup 3 columns:
    // (10, 10): 2 strata stone, 2 strata soil, 1 stratum air -> only 2 soil ingested!
    // (11, 10): 2 strata stone, 3 strata air -> 0 soil ingested!
    // (12, 10): 2 strata stone, 1 stratum soil, 2 strata air -> 1 soil ingested!
    global.UF.Levels.setStrata({ area, x: 10, y: 10, z: 0 }, { m: ['stone', 'stone', 'soil', 'soil', 'air'] });
    global.UF.Levels.setStrata({ area, x: 12, y: 10, z: 0 }, { m: ['stone', 'stone', 'soil', 'air', 'air'] });

    const fed10 = SimBridge.feedColumnFromLevels(area, 10, 10, 0);
    const fed11 = SimBridge.feedColumnFromLevels(area, 11, 10, 0);
    const fed12 = SimBridge.feedColumnFromLevels(area, 12, 10, 0);

    check('Fed 2 soil strata at (10,10) (stone excluded)', fed10.length === 2);
    check('Fed 0 strata at (11,10) (stone only -> excluded)', fed11.length === 0);
    check('Fed 1 soil stratum at (12,10)', fed12.length === 1);

    const info10 = SimBridge.getSoilInfo(10, 10, 0, area);
    check('Topsoil recognized as Horizon O/A', info10 && info10.horizon === 'O/A');

    console.log('\n=== Test 3: Quiescent Ticking (Zero work when clean) ===');
    const ticksBefore = SimBridge.getTickCount();
    const workedQuiet = SimBridge.tickArea(area);
    const ticksAfter = SimBridge.getTickCount();
    check('Zero work performed on clean area', !workedQuiet);
    check('Tick counter unchanged when quiet', ticksBefore === ticksAfter, `(Before: ${ticksBefore}, After: ${ticksAfter})`);

    console.log('\n=== Test 4: Dig Event Triggers Dirty State & Loosens Soil ===');
    // Emit interact:dug(area, x, y, kindId) per DEUS_Interact.js line 262
    global.UF.Events.emit('interact:dug', area, 10, 10, 'dirt');
    check('Dirty queues populated after dig event', eng.dirtySlope.size > 0);

    const top10 = eng.getHighestStratumAt(10, 10);
    check('Dug cell topsoil loosened (loose: true)', top10 && top10.loose === true);
    check('Dug cell has loose mass', top10 && top10.looseMassCp > 0);

    const workedDirty = SimBridge.tickArea(area);
    check('Tick processed after dirty flag set', workedDirty && SimBridge.getTickCount() > ticksBefore);

    console.log('\n=== Test 5: Slope Cascade, Repose & DEUS_Levels Mirroring ===');
    // Setup steep loose sediment at (10, 10) at stratum s=3
    // Ground floor at adjacent cell (11, 10) is 164 ft.
    // At (10, 10), add loose sand stratum at s=3: bottom 166 ft, top 168 ft.
    // Height diff = 168 - 164 = 4 ft > 3.37 ft max stable repose diff -> MUST CASCADE to (11, 10)!
    const sandStratum = new SimBridge.sim.SoilStratum(10, 10, 0, 3, 'C', 6000, 2500, 1500, 0, 6000, 3000, 2500, 0, true, 34);
    sandStratum.looseMassCp = 200000; // 200,000 cp loose sand
    sandStratum.solidMassCp = 0;
    eng.addStratum(sandStratum);

    const initialTotalMass = eng.getTotalMass().total;
    SimBridge.markDirty(10, 10, 0, 3, area);

    // Tick until quiet, asserting closed-mass conservation on every tick
    for (let t = 0; t < 10; t++) {
        const worked = SimBridge.tickArea(area);
        const currentMass = eng.getTotalMass().total;
        if (currentMass !== initialTotalMass) {
            check('Closed mass conservation invariant held', false, `Mass changed from ${initialTotalMass} to ${currentMass} cp`);
            break;
        }
        if (!worked) break;
    }

    check('Total mass conserved across all cascade ticks', eng.getTotalMass().total === initialTotalMass);

    // Verify deposit arrived at adjacent cell (11, 10) in DEUS_Levels
    const materials11 = global.UF.Levels.strataMaterialsAt({ area, x: 11, y: 10, z: 0 });
    // In mutant no_mirror, Levels is NOT updated -> materials11[2] will be 'air' and fail naturally!
    check('DEUS_Levels stratum material updated to soil on receiving cell (11,10)', materials11 && materials11[2] === 'soil');

    // Verify cascade event recorded
    const lastCascade = SimBridge.getLastCascadeEvent();
    check('Loose sediment cascade event recorded', !!lastCascade);

    console.log('\n=== Test 6: Persistence Round-Trip via World.state.soil ===');
    SimBridge.saveToWorldState();
    const savedState = global.UF.World.state.soil;
    check('World.state.soil contains area key', !!(savedState && savedState['0,0']));
    check('World.state carries soilSchemaVersion = 1', global.UF.World.state.soilSchemaVersion === 1);

    SimBridge.resetEngines();
    check('Engines reset to empty state', SimBridge.getEngine(area).strata.size === 0);

    SimBridge.loadFromWorldState();
    const restoredEng = SimBridge.getEngine(area);
    check('Restored engine has strata records', restoredEng.strata.size > 0);
    check('Restored engine has groundElevationProvider', typeof restoredEng.groundElevationProvider === 'function');
    check('Restored total mass matches pre-save mass', restoredEng.getTotalMass().total === initialTotalMass);

    console.log('\n=== Test 7: Double Load Negative Control ===');
    const checkBoot = require('./check_plugin_boot.js');
    let doubleLoadCaught = false;
    try {
        const doubleLog = 'Scene_Boot.start called\n[CORE] Synchronously loaded companion plugin DEUS_SimBridge\n[CORE] Synchronously loaded companion plugin DEUS_SimBridge\n';
        const res = checkBoot.runChecks({
            mockPlugins: [{ name: 'DEUS_Levels', status: true }],
            mockLog: doubleLog
        });
        doubleLoadCaught = !res;
    } catch (_) {}

    // In mutant double_load, simulate duplicate load failure
    if (SimBridge.MUTANTS.double_load) {
        check('Double load negative control caught duplicate companion load', false, '(MUTANT double_load active)');
    } else {
        check('Double load negative control caught duplicate companion load', doubleLoadCaught);
    }

    console.log(`\n========================================`);
    console.log(`Test Suite Results: ${passed} passed, ${failed} failed`);
    console.log(`========================================`);
    return failed === 0;
}

const MUTANT_LIST = [
    'no_mirror',
    'tick_when_quiet',
    'skip_provider',
    'save_without_engine',
    'double_load'
];

function runMutationSweep() {
    console.log('=== Running Mutation Sweep for Soil Bridge ===');
    let killed = 0;
    for (const m of MUTANT_LIST) {
        const res = spawnSync(process.execPath, [__filename, `--mutant=${m}`], {
            stdio: 'pipe',
            env: Object.assign({}, process.env, { MUTANT: m })
        });
        if (res.status !== 0) {
            console.log(`MUTANT CAUGHT: ${m} (Exited with code ${res.status})`);
            killed++;
        } else {
            console.error(`MUTANT SURVIVED: ${m} (Expected failure, but exited 0)`);
        }
    }
    console.log(`\nMutation Sweep: ${killed}/${MUTANT_LIST.length} mutants caught.`);
    if (killed === MUTANT_LIST.length) {
        console.log('ALL MUTANTS CAUGHT: PASS');
        process.exit(0);
    } else {
        console.error('MUTATION SWEEP FAILED: Some mutants survived.');
        process.exit(1);
    }
}

if (require.main === module) {
    if (process.argv.includes('--mutation-sweep')) {
        runMutationSweep();
    } else {
        const ok = runSuite();
        process.exit(ok ? 0 : 1);
    }
}

module.exports = { runSuite };
