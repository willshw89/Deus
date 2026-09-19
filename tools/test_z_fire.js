"use strict";
// Run the real Fire plugin with small engine doubles, in legacy and documented z-seam modes.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert/strict");
const source = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_Fire.js"), "utf8");
let passed = 0, failed = 0;
function check(name, fn) {
    try { fn(); passed++; console.log(`PASS z_fire.${name}`); }
    catch (e) { failed++; console.error(`FAIL z_fire.${name}: ${e.stack}`); process.exitCode = 1; }
}
function harness(levels, code = source) {
    const objects = new Map(), items = new Map(), events = [], goals = [], writes = [], units = [], handlers = {}, jobs = [];
    const listeners = new Map();
    let view = { x: 0, y: 0, z: 0 };
    const key = (a, x, y) => `${a.x},${a.y},${levels ? (a.z === undefined ? 0 : a.z) : 0}:${x},${y}`;
    const types = {
        wood: { id: "wood", typeId: 1, tags: ["wood"] },
        dead: { id: "dead", typeId: 2, tags: [] },
        camp: { id: "camp", typeId: 3, tags: ["fire"] }
    };
    const W = {
        state: { size: 12, seed: 42 },
        inWorld: (x, y) => x === 0 && y === 0,
        currentArea: () => view.z === 0 ? { x: 0, y: 0 } : null,
        hash32: () => 0,
        units: () => units,
        isDisplayed: u => (u.z || 0) === view.z,
        cellFree: (ax, ay, x, y, ignore, z = 0) => { writes.push(["cellFree", z]); return x >= 0 && y >= 0 && x < 12 && y < 12; },
        getTile: (ax, ay, x, y, layer, z = 0) => x === 2 && y === 4 ? 9 : 0,
        setTile: (...args) => writes.push(["tile", ...args]),
        sendUnit: (id, goal) => { goals.push({ id, goal }); },
        removeUnit: id => { const i = units.findIndex(u => u.id === id); if (i >= 0) units.splice(i, 1); }
    };
    if (levels) Object.assign(W, { viewLevel: () => view, levelOfMapId: () => view, isLevel: z => Number.isInteger(z) && z >= -2 && z <= 2 });
    class Base {}
    Base.prototype.update = function() {};
    Base.prototype.start = function() {};
    Base.prototype.createCharacters = function() {};
    Base.prototype.isMapPassable = () => true;
    const O = {
        atIn: (a, x, y) => types[objects.get(key(a, x, y))] || null,
        setIn: (a, x, y, type) => { writes.push(["object", a.z || 0, x, y, type]); objects.set(key(a, x, y), type); return true; },
        type: id => types[id] || Object.values(types).find(t => t.typeId === id),
        types: () => Object.values(types)
    };
    const J = {
        define: (name, h) => { handlers[name] = h; }, handler: name => handlers[name],
        list: pred => pred ? jobs.filter(pred) : jobs,
        create: spec => { const j = { ...spec, id: jobs.length + 1, state: "open", phase: 0 }; jobs.push(j); return j; },
        of: () => null, cancel: id => { jobs.find(j => j.id === id).state = "cancelled"; },
        standable: () => true, isWaterAt: (a, x, y) => x === 2 && y === 4
    };
    const context = {
        console, performance, Uint8ClampedArray, Float32Array,
        Game_Map: class extends Base {}, Game_CharacterBase: class extends Base {}, Game_Event: class extends Base {},
        Spriteset_Map: class extends Base {}, Scene_Boot: class extends Base {}, Sprite: class extends Base {},
        DataManager: { createGameObjects() {} }, SceneManager: {}, Tilemap: { isWaterTile: id => id === 9 },
        $ufWorldCatalog: { objects: Object.values(types), fire: { damage: [2, 2], startChance: 0, douse: { maxOpen: 0, waterRadius: 5, wetBeats: 20 }, rules: [
            { ids: ["wood"], burn: 4, spread: 1, becomes: null, dousedBecomes: "dead", destroysItems: true, ground: "ash" },
            { tags: ["fire"], source: true, escapeChance: 1 }
        ] } },
        UF: { World: W, Objects: O, Jobs: J,
            Items: { atIn: (a, x, y) => [...items.values()].filter(i => key({ ...i.area, z: i.z }, i.x, i.y) === key(a, x, y)), remove: id => items.delete(id) },
            Tiles: { kindOfTile: () => ({ id: "grass", passable: true }), groundBase: () => 1 },
            Events: { emit: (name, ...args) => { events.push([name, ...args]); for (const fn of listeners.get(name) || []) fn(...args); }, on: (name, fn) => { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); } }
        }
    };
    context.window = context;
    vm.runInNewContext(code, context, { filename: "UF_Fire.js" });
    return { F: context.UF.Fire, W, O, J, context, objects, items, units, events, goals, writes, handlers, setView: z => { view = { x: 0, y: 0, z }; },
        put: (z, x = 4, y = 4, type = "wood") => objects.set(key({ x: 0, y: 0, z }, x, y), type),
        at: (z, x = 4, y = 4) => O.atIn({ x: 0, y: 0, z }, x, y),
        unit: (id, z) => { const u = { id, area: { x: 0, y: 0 }, z, x: 4, y: 4, data: { hp: 20 } }; units.push(u); return u; }
    };
}
const a = z => ({ x: 0, y: 0, z });
check("legacy_refuses_levels_without_mutation", () => {
    const h = harness(false); h.put(0);
    for (const z of [-2, -1, 1, 2, -3, 3, null, NaN, Infinity, "0", "-1", 0.5]) {
        assert.equal(h.F.ignite(a(z), 4, 4), false);
        assert.equal(h.F.extinguish(a(z), 4, 4, "doused"), null);
        assert.equal(h.F.douse(a(z), 4, 4), null);
        assert.equal(h.F.flammableAt(a(z), 4, 4), false);
        assert.equal(h.F.findWater(a(z), 4, 4, 5), null);
    }
    assert.equal(h.W.state.fire, undefined); assert.equal(h.writes.length, 0);
    assert.equal(h.F.ignite({ x: 0, y: 0 }, 4, 4, { cause: "test" }), true);
    assert.deepEqual(Object.keys(h.W.state.fire.burning), ["0,0:4,4"]);
    const surface = h.unit(1, 0), below = h.unit(2, -1);
    h.F.step(); assert.equal(surface.data.hp, 18); assert.equal(below.data.hp, 20); assert.equal(h.F.errors().length, 0);
});
function isolation(code = source) {
    const h = harness(true, code); h.put(0); h.put(-1); h.put(-1, 5, 4); h.put(0, 5, 4);
    const surface = h.unit(1, 0), below = h.unit(2, -1);
    assert.equal(h.F.ignite(a(-1), 4, 4, { cause: "test" }), true);
    h.F.step();
    assert.equal(surface.data.hp, 20, "surface unit must not burn from an underground fire");
    assert.equal(below.data.hp, 18, "underground unit must burn");
    assert.equal(h.F.isBurning(a(-1), 5, 4), true); assert.equal(h.F.isBurning(a(0), 5, 4), false);
    assert.equal(h.goals.at(-1).goal.z, -1);
    assert.equal(h.events.find(e => e[0] === "fire:ignited")[1].z, -1);
    assert.equal(h.F.extinguish(a(0), 4, 4, "doused"), null);
    assert.equal(h.F.extinguish(a(-1), 4, 4, "doused").to, "dead");
    assert.equal(h.at(-1).id, "dead"); assert.equal(h.at(0).id, "wood");
    assert.equal(h.W.state.fire.wet["0,0,-1:4,4"], 21);
    h.put(-1); assert.equal(h.F.ignite(a(-1), 4, 4), false);
    assert.equal(h.F.ignite(a(0), 4, 4), true);
    assert.equal(h.F.errors().length, 0);
}
check("damage_spread_wetness_and_events_are_isolated", () => isolation());
check("view_switch_does_not_pause_any_stored_level", () => {
    const h = harness(true);
    for (const z of [-2, -1, 0, 1, 2]) { h.put(z); h.unit(z + 3, z); assert.equal(h.F.ignite(a(z), 4, 4, { cause: "test" }), true); }
    const map = new h.context.Game_Map();
    for (const view of [-1, 2, 0]) { h.setView(view); for (let i = 0; i < 60; i++) map.update(true); }
    for (const u of h.units) assert.equal(u.data.hp, 14);
    assert.equal(h.F.count(), 5); assert.equal(h.F.errors().length, 0);
});
check("seam_invalid_levels_never_alias_ground", () => {
    const h = harness(true); h.put(0); h.F.ignite(a(0), 4, 4, { cause: "test" });
    const before = JSON.stringify(h.W.state);
    for (const z of [-3, 3, 0.5, "0", "-1", null, NaN, Infinity]) {
        assert.equal(h.F.ignite(a(z), 4, 4), false);
        assert.equal(h.F.extinguish(a(z), 4, 4, "doused"), null);
        assert.equal(h.F.isBurning(a(z), 4, 4), false);
        assert.equal(h.F.standBeside(a(z), 4, 4), null);
    }
    assert.equal(JSON.stringify(h.W.state), before); assert.equal(h.writes.length, 0);
});
check("view_sources_and_level_change_events", () => {
    const h = harness(true); h.setView(-1);
    h.put(-1, 4, 4, "camp"); h.put(-1, 5, 4); h.put(0, 5, 4);
    const grid = new Array(144).fill(0); grid[4 * 12 + 4] = 3;
    h.context.$dataMap = { ufObjects: grid };
    assert.equal(h.F.sourceCells().length, 1);
    h.context.UF.Events.emit("world:objectChanged", a(0), 4, 4, 0);
    assert.equal(h.F.sourceCells().length, 1, "ground event must not remove an underground source");
    h.F.step(); assert.equal(h.F.isBurning(a(-1), 5, 4), true); assert.equal(h.F.isBurning(a(0), 5, 4), false);
    h.context.UF.Events.emit("world:levelObjectChanged", a(-1), 4, 4, 0);
    assert.equal(h.F.sourceCells().length, 0);
});
check("burnout_items_ground_and_save_roundtrip", () => {
    const h = harness(true); h.put(-1); h.put(0);
    for (const z of [-1, 0]) h.items.set(z, { id: z, area: { x: 0, y: 0 }, z, x: 4, y: 4 });
    h.F.ignite(a(-1), 4, 4, { cause: "test" }); h.F.step(2);
    const saved = JSON.stringify(h.W.state);
    h.W.state = JSON.parse(saved); assert.equal(JSON.stringify(h.W.state), saved);
    h.F.step(2);
    assert.equal(h.at(-1), null); assert.equal(h.at(0).id, "wood");
    assert.equal(h.items.has(-1), false); assert.equal(h.items.has(0), true);
    assert.equal(h.writes.some(w => w[0] === "tile"), false, "level tiles are derived shapes, not surface ash");
    assert.equal(h.events.find(e => e[0] === "fire:burnedOut")[1].z, -1);
    assert.equal(h.F.errors().length, 0);
});
check("douse_records_and_worker_level", () => {
    const h = harness(true); h.put(-1); h.F.ignite(a(-1), 4, 4, { cause: "test" });
    const j = h.F.douse(a(-1), 4, 4), below = h.unit(1, -1), surface = h.unit(2, 0);
    assert.ok(j); assert.equal(j.target.z, -1); assert.equal(j.params.fire.z, -1);
    assert.equal(h.handlers.douse.plan(j, surface).ok, false);
    const p = h.handlers.douse.plan(j, below); assert.equal(p.ok, true); assert.equal(p.stand.z, -1); assert.equal(j.params.water.z, -1);
    assert.equal(h.handlers.douse.apply(j, below), "continue"); assert.equal(j.params.filled.z, -1);
    j.phase = 1; assert.equal(h.handlers.douse.apply(j, surface), "continue");
    assert.equal(j.reason, "the fire is on another level"); assert.equal(h.handlers.douse.plan(j, surface).ok, false);
    assert.equal(h.F.isBurning(a(-1), 4, 4), true);
    h.handlers.douse.apply(j, below); assert.equal(j.result.doused, true); assert.equal(h.F.isBurning(a(-1), 4, 4), false);
});
check("legacy_load_keeps_level_fires_inert", () => {
    const h = harness(false); h.put(0);
    h.W.state.fire = { version: 1, beat: 0, burning: { "0,0,-1:4,4": { since: 0, fuel: 1, obj: "wood" } }, wet: {} };
    h.unit(1, 0); h.F.step(); assert.equal(h.at(0).id, "wood"); assert.equal(h.units[0].data.hp, 20);
    assert.equal(h.W.state.fire.burning["0,0,-1:4,4"].fuel, 1); assert.equal(h.F.count(), 0);
});
check("real_z_dropping_mutation_is_detected", () => {
    const needle = "const area = levelArea(u);\n            if (!acceptsArea(area)) continue;";
    assert.ok(source.includes(needle), "mutation site exists");
    const mutated = source.replace(needle, "const area = u.area;\n            if (!acceptsArea(area)) continue;");
    assert.throws(() => isolation(mutated), /underground unit must burn/);
});
console.log(`RESULT: ${passed} passed, ${failed} failed`);
