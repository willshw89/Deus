"use strict";
// Contract harness for Doors against legacy and documented level-capable cores.
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
let source = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_Doors.js"), "utf8");
if (process.argv.includes("--provoke")) {
    const needle = "original.call(this, ax, ay, x, y, ignoreUnitId, z)";
    assert(source.includes(needle), "z-forwarding mutation target exists");
    source = source.replace(needle, "original.call(this, ax, ay, x, y, ignoreUnitId)");
}
function fixture(levels) {
    let view = { x: 0, y: 0 }, terrain = true;
    const objects = new Map(), units = [], listeners = {}, calls = [], sprites = new Map();
    const z = a => a && a.z !== undefined ? a.z : 0;
    const key = (a, x, y) => `${a.x},${a.y},${levels ? z(a) : 0}:${x},${y}`;
    const types = { door: { id: "door", typeId: 1, tags: ["door"], door: { hp: 20 }, ruin: "rubble", image: "!Door1" }, rubble: { id: "rubble", typeId: 2, tags: [] } };
    function Character() {}
    Character.prototype.isMapPassable = () => false;
    function Boot() {}
    Boot.prototype.start = () => {};
    const W = {
        state: { size: 8, factions: { playerId: "home" }, units: {} }, _frame: 0,
        currentArea: () => z(view) === 0 ? view : null,
        areaMapId: (ax, ay, level = 0) => 1000 + level,
        inWorld: () => true,
        cellFree(...args) { calls.push(["cellFree", ...args]); return args[5] === -1 || args[5] === 0; },
        units: () => units, unit: id => units.find(u => u.id === id),
        unitOfEvent: e => e.unit || null,
        peekArea(ax, ay, level) { calls.push(["peek", level]); return { tilesetId: 1, data: Array(8 * 8 * 6).fill(1) }; },
        getTile(ax, ay, x, y, layer, level) { calls.push(["tile", level]); return 1; },
        nearestFreeCell(...args) { calls.push(["nearest", ...args]); return { x: 6, y: 6 }; },
        stopUnit() {}, eventOf: () => null
    };
    if (levels) { W.viewLevel = () => view; W.levelOfMapId = () => view; }
    const O = {
        type: id => types[id] || Object.values(types).find(t => t.typeId === id),
        atIn: (a, x, y) => types[objects.get(key(a, x, y))] || null,
        setIn(a, x, y, id) { objects.set(key(a, x, y), id); return true; },
        spriteAt: (x, y) => sprites.get(`${x},${y}`)
    };
    const events = { on(name, fn) { (listeners[name] ||= []).push(fn); }, emit(name, ...args) { for (const fn of listeners[name] || []) fn(...args); } };
    const context = { console, Game_CharacterBase: Character, Scene_Boot: Boot,
        UF: { World: W, Objects: O, Events: events, Factions: { relation: () => -30 } },
        $gameMap: { mapId: () => 1000 + z(view), isValid: () => true, checkPassage: () => terrain, tileId: () => 1,
            roundXWithDirection: (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0), roundYWithDirection: (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0) },
        $dataTilesets: [null, { flags: [0, 0] }], Tilemap: { isWaterTile: () => false, isTileA1: () => false },
        $gamePlayer: new Character()
    };
    context.window = context;
    vm.runInNewContext(source, context, { filename: "UF_Doors.js" });
    return { W, O, D: context.UF.Doors, events, units, objects, calls, sprites, Character,
        setView: a => { view = a; }, setTerrain: value => { terrain = value; },
        addUnit(id, level, x, y) { const u = { id, area: { x: 0, y: 0 }, z: level, x, y, data: { faction: "home" } }; units.push(u); W.state.units[id] = u; return u; }
    };
}
const ground = { x: 0, y: 0 }, below = { x: 0, y: 0, z: -1 };
let passed = 0, failed = 0;
function check(name, fn) { try { fn(); passed++; console.log(`PASS z_doors.${name}`); } catch (e) { failed++; console.error(`FAIL z_doors.${name}: ${e.message}`); } }
check("legacy_refuses_level_aliasing", () => {
    const f = fixture(false); f.O.setIn(ground, 2, 2, "door"); const d = f.D.at(ground, 2, 2); d.state.hp = 13;
    assert.strictEqual(f.D.at(below, 2, 2), null);
    assert.strictEqual(f.D.toggleHeld(below, 2, 2), false);
    assert.strictEqual(f.W.cellFree(0, 0, 2, 2, 1, -1), false);
    f.events.emit("objects:levelChanged", below, 2, 2, null, 1);
    assert.deepStrictEqual(Object.keys(f.D.store().byCell), ["0,0:2,2"]);
    assert.strictEqual(d.state.hp, 13);
});
check("invalid_levels_fail_closed", () => {
    const f = fixture(true);
    for (const z of [-3, 3, 0.5, NaN, null, "-1"]) {
        const a = { ...ground, z };
        assert.strictEqual(f.D.cellKey(a, 2, 2), null);
        assert.strictEqual(f.D.at(a, 2, 2), null);
        assert.strictEqual(f.W.cellFree(0, 0, 2, 2, 1, z), false);
    }
    assert.strictEqual(f.D.parseKey("0,0,3:2,2"), null);
});
check("keys_and_save_roundtrip", () => {
    const f = fixture(true);
    for (const a of [ground, below, { ...ground, z: 1 }]) { f.O.setIn(a, 2, 2, "door"); f.D.at(a, 2, 2).state.hp = 10 + (a.z || 0); }
    assert.strictEqual(f.D.cellKey(ground, 2, 2), "0,0:2,2");
    assert.strictEqual(f.D.cellKey(below, 2, 2), "0,0,-1:2,2");
    assert.strictEqual(f.D.parseKey("0,0,-1:2,2").area.z, -1);
    const saved = JSON.stringify(f.W.state); f.W.state = JSON.parse(saved);
    assert.strictEqual(f.D.at(ground, 2, 2).state.hp, 10); assert.strictEqual(f.D.at(below, 2, 2).state.hp, 9);
    assert.strictEqual(JSON.stringify(f.W.state), saved);
});
check("cellfree_forwards_z", () => {
    const f = fixture(true);
    assert.strictEqual(f.W.cellFree(0, 0, 3, 3, 7, -1), true);
    assert.strictEqual(f.calls[0][6], -1, "non-door original cellFree must receive z");
});
check("occupancy_and_offscreen_tiles", () => {
    const f = fixture(true); f.O.setIn(below, 2, 2, "door"); f.addUnit(1, -1, 1, 2); f.addUnit(2, 0, 2, 2);
    assert.strictEqual(f.W.cellFree(0, 0, 2, 2, 1, -1), true, "ground occupant must not block basement door");
    assert(f.calls.some(c => c[0] === "peek" && c[1] === -1));
    f.addUnit(3, -1, 2, 2); assert.strictEqual(f.W.cellFree(0, 0, 2, 2, 1, -1), false);
    assert.strictEqual(f.W.cellFree(0, 0, 2, 2, 2, -1), false, "ground unit must not pass basement door");
});
check("movement_respects_view_and_terrain", () => {
    const f = fixture(true); f.setView(below); f.O.setIn(below, 2, 2, "door");
    const e = new f.Character(); e.unit = f.addUnit(1, -1, 1, 2);
    assert.strictEqual(e.isMapPassable(1, 2, 6), true);
    f.setTerrain(false); assert.strictEqual(e.isMapPassable(1, 2, 6), false);
    f.setTerrain(true); e.unit.z = 0; assert.strictEqual(e.isMapPassable(1, 2, 6), false);
});
check("events_damage_and_sprites_isolate_levels", () => {
    const f = fixture(true);
    for (const a of [ground, below]) { f.O.setIn(a, 2, 2, "door"); f.events.emit(a.z ? "objects:levelChanged" : "objects:changed", a, 2, 2, null, 1); }
    f.D.toggleHeld(below, 2, 2); assert.strictEqual(f.D.stateAt(ground, 2, 2).heldOpen, false);
    const frames = []; f.sprites.set("2,2", { bitmap: { width: 576, height: 384 }, setFrame: (...a) => frames.push(a) });
    f.setView(below); assert.strictEqual(f.D.syncSprites(), 1); assert.strictEqual(frames[0][0], 96);
    f.D.damageAt(below, 2, 2, 20); assert.strictEqual(f.O.atIn(below, 2, 2).id, "rubble");
    assert.strictEqual(f.O.atIn(ground, 2, 2).id, "door"); assert.strictEqual(f.D.stateAt(ground, 2, 2).hp, 20);
    f.events.emit("objects:levelChanged", below, 2, 2, 1, 2); assert.strictEqual(Object.keys(f.D.store().byCell).length, 1);
});
check("pending_placement_preserves_level", () => {
    const f = fixture(true); f.addUnit(1, 0, 4, 4);
    f.D.store().pending.push({ siteId: "TEST_site", area: below, x: 4, y: 4, objectId: "door", faction: "home" });
    assert.strictEqual(f.D.retryPending(), 1); assert.strictEqual(f.O.atIn(below, 4, 4).id, "door");
    assert.strictEqual(f.O.atIn(ground, 4, 4), null);
    const old = fixture(false); old.D.store().pending.push({ area: below, x: 4, y: 4, objectId: "door" });
    assert.strictEqual(old.D.retryPending(), 0); assert.strictEqual(old.objects.size, 0);
});
check("offscreen_pending_and_timers_continue", () => {
    const f = fixture(true); f.setView(below);
    f.D.store().pending.push({ siteId: "TEST_ground", area: ground, x: 4, y: 4, objectId: "door", faction: "home" });
    assert.strictEqual(f.D.retryPending(), 1, "ground placement continues while basement is viewed");
    const door = f.D.at(ground, 4, 4); f.D.open(door, 5);
    assert.strictEqual(f.D.isOpen(ground, 4, 4), true);
    f.W._frame += 6; assert.strictEqual(f.D.isOpen(ground, 4, 4), false, "offscreen timer expires on world time");
});
console.log(`RESULT: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
