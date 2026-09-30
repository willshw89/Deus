#!/usr/bin/env node
"use strict";

// NAT.03.01 lane-cw: deterministic runtime fixtures and targeted failure proofs.
// Mutations happen in isolated VM source copies, never in working-tree files.
const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createRequire } = require("module");
const { spawnSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const FLUID = path.join(ROOT, "game/js/plugins/DEUS_Fluid.js");
const HYDRO = path.join(ROOT, "game/js/sim/hydro/index.js");
const DOC = path.join(ROOT, "docs/systems/DEUS_Fluid.md");
const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
const selected = (process.argv.find(a => a.startsWith("--case=")) || "").slice(7);

const mutations = {
    shared_budget: ["fluid", "remaining -= n;", "remaining -= 0;"],
    zero_budget: ["fluid", "workBudget(budget);", "workBudget(budget || config.budget);"],
    area_scan: ["fluid", "let areasLeft = activeAreas.size;", "Array.from(areas.values()); let areasLeft = activeAreas.size;"],
    lake_scan: ["hydro", "function beginTick(spec) {", "function beginTick(spec) { rebuildLakeIndex();"],
    false_cost: ["hydro", "examined += (n === undefined ? 1 : n);", "examined += 0;"],
    drop_range: ["fluid", "if (Number.isInteger(z) && x >= 0", "if (inRange(z) && Number.isInteger(z) && x >= 0"],
    stale_origin: ["fluid", "data.zMin = next.zMin;", "data.zMin = data.zMin;"],
    bad_coords: ["fluid", "ar.ax !== undefined ? ar.ax : (ar.x !== undefined ? ar.x : a.ax)", "ar.x !== undefined ? ar.x : a.ax"],
    set_alias: ["fluid", "area.ax !== undefined ? area.ax : area.x", "area.x"],
    set_capacity: ["fluid", "Math.min(cap, Math.trunc(depthVal) || 0)", "Math.min(DEPTH_MAX, Math.trunc(depthVal) || 0)"],
    walk_z: ["fluid", "z = typeof zOrOpts === \"number\" ? zOrOpts : (opts.z || 0);", "z = 0;"],
    overwrite_type: ["fluid", "spaceAbove > 0 && (aboveDepth === 0 || typeCode(aboveType) === type)", "spaceAbove > 0"],
    lava_to_water: ["fluid", "sessionNow.receiveDisplaced(excess, typeName(type));", "sessionNow.receiveDisplaced(excess, 'water');"],
    drop_fallback: ["fluid", "pendingDisplaced[typeName(type)] += excess;", "pendingDisplaced[typeName(type)] += 0;"],
    drop_lava_save: ["hydro", "displacedLava: displacedLava,", "displacedLava: 0,"],
    absent_keys: ["fluid", "Fluid.extractSaveContents(contents && (contents.deusFluid || contents.ufFluid));", "if (contents && (contents.deusFluid || contents.ufFluid)) Fluid.extractSaveContents(contents.deusFluid || contents.ufFluid);"],
    drop_hydro: ["fluid", "else if (pendingHydro !== null)", "else if (false)"],
    narrow_mass: ["hydro", "? io.gridWater() : 0;", "? (io.gridWater() | 0) : 0;"],
    rain_barrier: ["fluid", "blockedAt: isBarrier,", "blockedAt: function () { return false; },"],
    spill_barrier: ["fluid", "_mutantIgnoreWalls: false,", "_mutantIgnoreWalls: true,"],
    seep_barrier: ["fluid", "objectBarrierAt: isObjectBarrier,", "objectBarrierAt: function () { return false; },"],
    mass_delete: null,
    false_docs: null
};
let mutationApplications = 0;
function source(file, kind) {
    let text = fs.readFileSync(file, "utf8");
    const m = mutations[mutant];
    if (m && m[0] === kind) {
        assert(text.includes(m[1]), "mutation anchor missing: " + mutant);
        text = text.split(m[1]).join(m[2]);
        mutationApplications++;
    }
    return text;
}

function loadHydro() {
    const module = { exports: {} };
    const factory = vm.runInThisContext("(function(require, module, exports) {\n" + source(HYDRO, "hydro") + "\n})", { filename: HYDRO });
    factory(createRequire(HYDRO), module, module.exports);
    return module.exports;
}

function environment(options = {}) {
    const range = { zMin: options.zMin ?? -2, zMax: options.zMax ?? 2 };
    const cells = new Map(), objects = new Map(), openDoors = new Set(), handlers = new Map();
    const counts = { areasEnumerated: 0, passageReads: 0, season: 0, requires: 0 };
    const key = (...coords) => coords.join(",");
    class ObservedMap extends Map {
        *values() {
            for (const value of super.values()) {
                if (value && value.grids instanceof Map) counts.areasEnumerated++;
                yield value;
            }
        }
        *entries() {
            for (const item of super.entries()) {
                if (item[1] && item[1].grids instanceof Map) counts.areasEnumerated++;
                yield item;
            }
        }
        [Symbol.iterator]() { return this.entries(); }
    }
    const ns = {
        Events: {
            on(name, fn) { if (!handlers.has(name)) handlers.set(name, []); handlers.get(name).push(fn); },
            emit(name, payload) { for (const fn of handlers.get(name) || []) fn(payload); }
        },
        World: {
            state: { size: 8 },
            zRange: () => range,
            viewLevel: () => options.view || null,
            getObject: (...coords) => objects.get(key(...coords)) || null
        },
        Objects: { type: id => ({ tags: [id] }) },
        Doors: { isOpen: (area, x, y) => openDoors.has(key(area.x, area.y, x, y, area.z)) },
        Levels: {
            getStrataFluidPassage(...coords) { counts.passageReads++; return (cells.get(key(...coords)) || {}).pass || 0; },
            dominantMaterial: (...coords) => ({ porosity: { perm: (cells.get(key(...coords)) || {}).perm || 0 } })
        }
    };
    const hydroMod = options.noHydro ? null : loadHydro();
    const sandbox = {
        console, Map: ObservedMap, Set, Uint8Array, performance,
        UF: ns, DEUS: ns,
        DataManager: { makeSaveContents: () => ({}), extractSaveContents() {} },
        module: { exports: {} },
        require() { counts.requires++; if (!hydroMod) throw Error("TEST_hydro_require_failed"); return hydroMod; }
    };
    sandbox.window = sandbox;
    vm.runInNewContext(source(FLUID, "fluid"), sandbox, { filename: FLUID });
    const fluid = ns.Fluid;
    function carve(ax, ay, x, y, z, pass = 7, perm = 0) { cells.set(key(ax, ay, x, y, z), { pass, perm }); }
    function put(ax, ay, x, y, z, type, depth) { fluid.setCell({ ax, ay }, x, y, z, type, depth); }
    function reconcile(ax, ay, x, y, z, pass) {
        carve(ax, ay, x, y, z, pass);
        ns.Events.emit("levels:strataChanged", { area: { x: ax, y: ay }, x, y, z });
    }
    return { fluid, ns, range, counts, carve, put, reconcile, objects, openDoors, key, dm: sandbox.DataManager };
}

const cases = [];
function check(id, mutation, run) { cases.push({ id, mutation, run }); }
function json(value) { return JSON.stringify(value); }

check("a_shared_budget_all_areas", "shared_budget", () => {
    const e = environment({ view: { x: 0, y: 0, z: 0 } });
    for (let ax = 0; ax < 20; ax++) e.fluid.enqueueCell(ax, 0, 1, 1, 0);
    const used = e.fluid.tick(3);
    assert.equal(used, 3);
    assert.equal(e.fluid.diagnostics().activeQueueLength, 17);
    for (let i = 0; i < 17; i++) assert.equal(e.fluid.tick(1), 1);
    assert.equal(e.fluid.diagnostics().activeQueueLength, 0, "off-view areas must progress");
    assert.equal(e.fluid.tick(3), 0);
});

check("a_zero_budget", "zero_budget", () => {
    const e = environment();
    e.carve(0, 0, 2, 2, 0);
    e.put(0, 0, 2, 2, 0, "water", 4);
    const h = e.fluid.hydro();
    h.defineLake({ id: "TEST_zero", evap: 1, cells: [{ x: 2, y: 2, z: 0 }] });
    h.seedAtmosphere(5);
    h.setSeasonInput(() => { e.counts.season++; return 2; });
    const before = json(e.fluid.makeSaveContents());
    const queue = e.fluid.diagnostics().activeQueueLength;
    e.counts.passageReads = 0;
    assert.equal(e.fluid.tick(0), 0);
    assert.equal(e.fluid.step({ x: 0, y: 0 }, 0), 0);
    assert.equal(json(e.fluid.makeSaveContents()), before);
    assert.equal(e.fluid.diagnostics().activeQueueLength, queue);
    assert.equal(e.counts.passageReads + e.counts.season, 0);
    assert.equal(h.cost().work + h.cost().examined, 0);
});

check("a_dirty_area_index", "area_scan", () => {
    const e = environment();
    for (let ax = 0; ax < 2000; ax++) e.fluid.depthAt(ax, 0, 1, 1, 0);
    e.fluid.enqueueCell(19, 0, 1, 1, 0);
    e.counts.areasEnumerated = 0;
    assert.equal(e.fluid.tick(1), 1);
    assert.equal(e.fluid.tick(1), 0);
    assert.equal(e.counts.areasEnumerated, 0, "tick enumerated allocated areas");
});

check("a_lake_area_index_and_shared_work", "lake_scan", () => {
    const e = environment();
    const h = e.fluid.hydro();
    const cells = Array.from({ length: 20000 }, (_, i) => ({ ax: i, ay: 0, x: 2, y: 2, z: 0 }));
    const lake = h.defineLake({ id: "TEST_many", evap: 0, cells });
    let enumeration = 0;
    const list = lake.cells;
    Object.defineProperty(lake, "cells", { get() { enumeration++; return list; } });
    assert.equal(e.fluid.tick(8), 0);
    assert.equal(h.cost().examined, 0);
    assert.equal(enumeration, 0, "idle tick read the definition's cell list");
    h.setSeasonInput(() => 1);
    h.seedAtmosphere(100);
    e.carve(99, 0, 2, 2, 0);
    e.fluid.step({ ax: 99, ay: 0 }, 1);
    assert.equal(e.fluid.depthAt(99, 0, 2, 2, 0), 1, "area-indexed lake lookup");
    assert.equal(h.cost().work, 1);
    e.fluid.enqueueCell(100, 0, 1, 1, 0);
    const n = e.fluid.tick(6);
    assert(n <= 6);
    assert.equal(h.cost().work, n);
    assert(h.cost().lakeVisits > 0 && h.cost().processed > 0, "both work classes progress");
    assert.equal(enumeration, 0, "active tick enumerated lake definitions");
    // Removal/redefinition and evap changes invalidate indexes at mutation time.
    h.defineLake({ id: "TEST_many", evap: 0, cells: [{ ax: 99, ay: 0, x: 2, y: 2, z: 0 }] });
    h.setSeasonInput(() => 0);
    h.setEvap("TEST_many", 1);
    e.fluid.step({ ax: 99, ay: 0 }, 8);
    assert.equal(e.fluid.depthAt(99, 0, 2, 2, 0), 0);
    h.setEvap("TEST_many", 0);
    for (let i = 0; i < 3; i++) e.fluid.tick(512);
    assert.equal(h.cost().lakeVisits, 0);
});

check("a_cost_counts_probes", "false_cost", () => {
    let depth = 4;
    const s = loadHydro().createSession({
        depthAt: () => depth, typeAt: () => "water", capacityAt: () => 7,
        writeWater: (ax, ay, x, y, z, d) => (depth = d), wake() {}, gridWater: () => depth
    });
    s.api.defineLake({ id: "TEST_cost", evap: 1, cells: [{ x: 1, y: 1 }] });
    assert.equal(s.beginTick({ budget: 1 }), 1);
    assert.equal(depth, 3);
    assert.equal(s.cost().examined, 2, "lake selection and evaporation read are both counted");
    assert.equal(s.cost().work, 1);
    s.beginTick({ budget: 0 });
    assert.equal(s.cost().examined + s.cost().work, 0);
});

check("b_load_preserves_outer_layers", "drop_range", () => {
    const e = environment();
    const records = [[0, 0, -16, 2, 2, 1, 6], [3, 4, 15, 3, 3, 2, 5]];
    e.fluid.extractSaveContents({ fluidSchemaVersion: 1, records });
    assert.equal(json(e.fluid.makeSaveContents().records), json(records));
    assert.equal(e.fluid.depthAt(0, 0, 2, 2, -16), 6);
    e.fluid.tick(10);
    assert.equal(json(e.fluid.makeSaveContents().records), json(records));
    e.range.zMin = -16; e.range.zMax = 15;
    e.carve(0, 0, 2, 2, -16);
    e.carve(3, 4, 3, 3, 15);
    assert(e.fluid.tick(10) > 0, "preserved records become schedulable after expansion");
    assert.equal(e.fluid.diagnostics().totalWaterVolume, 6);
    assert.equal(e.fluid.diagnostics().totalLavaVolume, 5);
});

check("b_rebase_queued_coordinates", "stale_origin", () => {
    for (const min of [-4, -16]) {
        const e = environment();
        e.carve(0, 0, 2, 2, 0, 7 | 8);
        e.carve(0, 0, 2, 2, -1);
        e.put(0, 0, 2, 2, 0, "water", 5);
        e.range.zMin = min; e.range.zMax = -min - 1;
        e.fluid.tick(32);
        assert.equal(e.fluid.diagnostics(0, 0).queueZMin, min);
        assert.equal(e.fluid.depthAt(0, 0, 2, 2, 0), 0);
        assert.equal(e.fluid.depthAt(0, 0, 2, 2, -1), 5);
        assert.equal(e.fluid.diagnostics().totalWaterVolume, 5);
    }
});

check("c_query_overloads", "bad_coords", () => {
    const e = environment();
    e.carve(3, 4, 2, 5, -1, 6);
    e.fluid.setCell({ x: 3, y: 4 }, 2, 5, -1, "lava", 3);
    for (const method of ["depthAt", "typeAt", "fluidFillFractionAt"]) {
        const expected = { depthAt: 3, typeAt: "lava", fluidFillFractionAt: 0.5 }[method];
        for (const args of [
            [3, 4, 2, 5, -1], [{ x: 3, y: 4 }, 2, 5, -1], [{ ax: 3, ay: 4 }, 2, 5, -1],
            [{ area: { x: 3, y: 4 }, x: 2, y: 5, z: -1 }],
            [{ area: { ax: 3, ay: 4 }, x: 2, y: 5, z: -1 }],
            [{ ax: 3, ay: 4, x: 2, y: 5, z: -1 }]
        ]) assert.equal(e.fluid[method](...args), expected, method + " " + json(args));
    }
});

check("c_set_area_alias", "set_alias", () => {
    const e = environment();
    e.carve(3, 4, 2, 5, -1);
    e.put(3, 4, 2, 5, -1, "water", 5);
    assert.equal(e.fluid.depthAt(3, 4, 2, 5, -1), 5);
    assert.equal(e.fluid.depthAt(0, 0, 2, 5, -1), 0);
});

check("c_set_capacity", "set_capacity", () => {
    const e = environment();
    for (const cap of [0, 1, 3, 6, 7]) {
        e.carve(0, 0, cap, 2, 0, cap);
        e.put(0, 0, cap, 2, 0, "water", 7);
        assert.equal(e.fluid.depthAt(0, 0, cap, 2, 0), cap);
    }
});

check("c_walkable_caller_z", "walk_z", () => {
    const e = environment();
    e.carve(3, 4, 2, 5, -1);
    e.put(3, 4, 2, 5, -1, "water", 6);
    assert.equal(e.fluid.walkable(3, 4, 2, 5, { z: -1 }), false);
    assert.equal(e.fluid.walkable(3, 4, 2, 5, -1), false);
    assert.equal(e.fluid.walkable(3, 4, 2, 5, -1, { canSwim: true }), true);
    assert.equal(e.fluid.walkable({ ax: 3, ay: 4 }, 2, 5, -1), false);
    assert.equal(e.fluid.walkable({ area: { x: 3, y: 4 }, x: 2, y: 5, z: -1 }), false);
    assert.equal(e.fluid.walkable(3, 4, 2, 5, { z: 0 }), true);
});

check("d_no_cross_type_overwrite", "overwrite_type", () => {
    for (const [src, dst] of [["water", "lava"], ["lava", "water"]]) {
        const e = environment();
        e.carve(0, 0, 2, 2, 0); e.carve(0, 0, 2, 2, 1);
        e.put(0, 0, 2, 2, 0, src, 7); e.put(0, 0, 2, 2, 1, dst, 3);
        e.reconcile(0, 0, 2, 2, 0, 0);
        assert.equal(e.fluid.typeAt(0, 0, 2, 2, 1), dst);
        assert.equal(e.fluid.depthAt(0, 0, 2, 2, 1), 3);
        const mass = e.fluid.diagnostics();
        assert.equal(mass.totalWaterMass, src === "water" ? 7 : 3);
        assert.equal(mass.totalLavaMass, src === "lava" ? 7 : 3);
    }
});

function displacedFixture(noHydro = false) {
    const e = environment({ noHydro });
    e.carve(0, 0, 2, 2, 0); e.carve(0, 0, 5, 5, 0);
    e.put(0, 0, 2, 2, 0, "lava", 7); e.put(0, 0, 5, 5, 0, "water", 5);
    e.reconcile(0, 0, 2, 2, 0, 0); e.reconcile(0, 0, 5, 5, 0, 0);
    return e;
}

check("d_typed_displaced_store", "lava_to_water", () => {
    const e = displacedFixture();
    assert.equal(e.fluid.hydro().mass().total, 5);
    assert.equal(e.fluid.hydro().mass().displacedByType.lava, 7);
    for (let i = 0; i < 10; i++) e.fluid.tick(32);
    assert.equal(e.fluid.diagnostics().totalLavaMass, 7);
    assert.equal(e.fluid.diagnostics().totalWaterMass, 5);
});

check("d_displaced_without_hydro", "drop_fallback", () => {
    const e = displacedFixture(true);
    assert.equal(e.fluid.hydro(), null);
    assert.equal(e.fluid.diagnostics().totalLavaMass, 7);
    assert.equal(e.fluid.diagnostics().totalWaterMass, 5);
    e.fluid.extractSaveContents(e.fluid.makeSaveContents());
    assert.equal(e.fluid.diagnostics().totalLavaMass, 7);
    assert.equal(e.fluid.diagnostics().totalWaterMass, 5);
});

check("d_typed_save_roundtrip", "drop_lava_save", () => {
    const e = displacedFixture();
    const saved = e.dm.makeSaveContents();
    e.dm.extractSaveContents(saved);
    assert.equal(e.fluid.diagnostics().totalLavaMass, 7);
    assert.equal(e.fluid.diagnostics().totalWaterMass, 5);
    e.fluid.extractSaveContents({ records: [], hydro: { v: 1, displaced: 11 } });
    assert.equal(e.fluid.hydro().mass().displaced, 11, "legacy displaced remains water");
    assert.equal(e.fluid.diagnostics().totalLavaMass, 0);
});

check("e_absent_save_keys_reset", "absent_keys", () => {
    const e = displacedFixture();
    e.fluid.hydro().defineAquifer("TEST_old", 100);
    e.dm.extractSaveContents({});
    assert.equal(e.fluid.diagnostics().totalWaterMass + e.fluid.diagnostics().totalLavaMass, 0);
    assert.equal(e.fluid.diagnostics().activeQueueLength, 0);
    assert.equal(e.fluid.hydro().cost().lakes, 0);
    assert.equal(e.fluid.makeSaveContents().hydro, undefined);
});

check("e_failed_require_payload_preserved", "drop_hydro", () => {
    const e = environment({ noHydro: true });
    const hydro = { v: 2, atmosphere: 900, displaced: 4, displacedLava: 8, aquifers: [["TEST_keep", 31]], futureField: { retained: true } };
    for (const key of ["ufFluid", "deusFluid"]) {
        const saved = { [key]: { fluidSchemaVersion: 1, records: [], hydro } };
        e.dm.extractSaveContents(saved);
        assert.equal(json(e.dm.makeSaveContents().deusFluid.hydro), json(hydro));
        const copy = e.dm.makeSaveContents();
        copy.deusFluid.hydro.atmosphere = 0;
        assert.equal(e.dm.makeSaveContents().deusFluid.hydro.atmosphere, 900, "output must be isolated");
    }
    e.dm.extractSaveContents({});
    assert.equal(e.dm.makeSaveContents().deusFluid.hydro, undefined);
});

check("f_large_mass_totals", "narrow_mass", () => {
    for (const grid of [2 ** 31 + 9, 2 ** 32 + 17]) {
        const s = loadHydro().createSession({ gridWater: () => grid });
        s.api.defineAquifer("TEST_large", 2 ** 32 + 5);
        s.api.seedAtmosphere(2 ** 31 + 7);
        s.receiveDisplaced(2 ** 32 + 3, "water");
        s.receiveDisplaced(2 ** 32 + 11, "lava");
        const expected = grid + (2 ** 32 + 5) + (2 ** 31 + 7) + (2 ** 32 + 3);
        assert.equal(s.mass().total, expected);
        s.importState(s.exportState());
        assert.equal(s.mass().total, expected);
        assert.equal(s.stored("lava"), 2 ** 32 + 11);
    }
});

check("g_rain_closed_door_and_wall", "rain_barrier", () => {
    for (const barrier of ["door", "wall"]) {
        const e = environment();
        e.carve(0, 0, 2, 2, 0);
        e.objects.set(e.key(0, 0, 2, 2, 0), barrier);
        const h = e.fluid.hydro();
        h.defineLake({ id: "TEST_rain", cells: [{ x: 2, y: 2, z: 0 }] });
        h.setSeasonInput(() => 3); h.seedAtmosphere(3);
        e.fluid.tick(8);
        assert.equal(e.fluid.depthAt(0, 0, 2, 2, 0), 0);
        assert.equal(h.mass().atmosphere, 3);
        if (barrier === "door") e.openDoors.add(e.key(0, 0, 2, 2, 0));
        else e.objects.delete(e.key(0, 0, 2, 2, 0));
        e.fluid.tick(8);
        assert.equal(e.fluid.depthAt(0, 0, 2, 2, 0), 3);
        assert.equal(h.mass().total, 3);
    }
});

check("g_spill_shared_barriers", "spill_barrier", () => {
    for (const [nx, ny, nz] of [[3, 2, 0], [2, 2, 1]]) {
        for (const barrier of ["door", "wall"]) {
            const e = environment();
            e.carve(0, 0, 2, 2, 0, 7 | 16);
            e.carve(0, 0, nx, ny, nz);
            e.put(0, 0, 2, 2, 0, "water", 7);
            e.objects.set(e.key(0, 0, nx, ny, nz), barrier);
            const h = e.fluid.hydro();
            h.defineLake({ id: "TEST_spill", cells: [{ x: 2, y: 2, z: 0 }] });
            h.setSeasonInput(() => 3); h.seedAtmosphere(3);
            e.fluid.tick(8);
            assert.equal(e.fluid.depthAt(0, 0, nx, ny, nz), 0, barrier + " spill destination");
            assert.equal(h.mass().atmosphere, 3);
            e.objects.delete(e.key(0, 0, nx, ny, nz));
            e.fluid.tick(8);
            assert(e.fluid.depthAt(0, 0, nx, ny, nz) > 0, "unblocked spill progresses");
            assert.equal(h.mass().total, 10);
        }
    }
});

check("g_seep_shared_barriers", "seep_barrier", () => {
    for (const wallZ of [0, -1, -2]) {
        for (const barrier of ["door", "wall"]) {
            const e = environment();
            e.carve(0, 0, 2, 2, 0);
            e.carve(0, 0, 2, 2, -1, 0, 4);
            e.carve(0, 0, 2, 2, -2);
            e.put(0, 0, 2, 2, 0, "water", 5);
            e.objects.set(e.key(0, 0, 2, 2, wallZ), barrier);
            for (let i = 0; i < 4; i++) e.fluid.tick(32);
            assert.equal(e.fluid.depthAt(0, 0, 2, 2, -2), 0);
            assert.equal(e.fluid.depthAt(0, 0, 2, 2, 0), 5);
            e.objects.delete(e.key(0, 0, 2, 2, wallZ));
            // Explicit wake keeps this fixture independent of held waiter policy.
            e.fluid.enqueueCell(0, 0, 2, 2, 0);
            for (let i = 0; i < 8; i++) e.fluid.tick(32);
            assert(e.fluid.depthAt(0, 0, 2, 2, -2) > 0);
            assert.equal(e.fluid.hydro().mass().total, 5);
        }
    }
});

check("i_real_mass_deletion", "mass_delete", () => {
    const e = environment();
    e.carve(0, 0, 2, 2, 0, 7 | 8); e.carve(0, 0, 2, 2, -1);
    e.put(0, 0, 2, 2, 0, "water", 5);
    if (mutant === "mass_delete") { e.fluid._configure({ _mutantDelete: true }); mutationApplications++; }
    const before = e.fluid.diagnostics().totalWaterMass;
    e.fluid.step({ x: 0, y: 0 }, 1);
    assert.equal(e.fluid.depthAt(0, 0, 2, 2, 0), 0, "transfer actually occurred");
    assert.equal(e.fluid.diagnostics().totalWaterMass, before, "destination lost mass under deletion mutant");
});

check("h_documentation_status", "false_docs", () => {
    let doc = fs.readFileSync(DOC, "utf8");
    if (mutant === "false_docs") { doc += "\nCOMPLETED/VERIFIED; guarantees 60 FPS and zero GC"; mutationApplications++; }
    assert(!/COMPLETED|VERIFIED|60\s*FPS|zero\s*GC/i.test(doc), "unsupported completion/performance claim");
    for (const required of ["D2", "NOT RUN", "DEUS_Levels", "DEUS_Visuals", "sim/hydrology", "pendingDisplaced", "examined"]) {
        assert(doc.includes(required), "missing status/contract: " + required);
    }
});

let passed = 0, failed = 0;
const wanted = selected ? cases.filter(c => c.id === selected) : cases;
assert(wanted.length > 0, "unknown case");
if (mutant) assert(Object.hasOwn(mutations, mutant), "unknown mutant");
for (const c of wanted) {
    try { c.run(); passed++; console.log("PASS " + c.id); }
    catch (err) {
        failed++;
        console.error("FAIL " + c.id + ": " + err.message);
        if (!(err instanceof assert.AssertionError)) console.error("UNEXPECTED_ERROR " + err.stack);
    }
}
if (mutant && mutationApplications === 0) {
    failed++; console.error("FAIL mutation_not_applied: " + mutant);
}
if (!mutant && !selected && failed === 0) {
    for (const c of cases) {
        const result = spawnSync(process.execPath, [__filename, "--case=" + c.id, "--mutant=" + c.mutation], { encoding: "utf8", timeout: 20000 });
        const output = result.stdout + result.stderr;
        const killed = result.status === 1 && output.includes("FAIL " + c.id + ":")
            && !output.includes("UNEXPECTED_ERROR") && !output.includes("mutation_not_applied");
        if (killed) { passed++; console.log("PASS mutant_" + c.mutation + " -> " + c.id); }
        else { failed++; console.error("FAIL mutant_" + c.mutation + " exit=" + result.status + "\n" + output); }
    }
}
console.log("RESULT: " + passed + " passed, " + failed + " failed");
process.exitCode = failed ? 1 : 0;
