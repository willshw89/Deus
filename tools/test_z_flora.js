"use strict";
// Actual WorldGen + Objects sources; controlled pocket terrain and World storage, no renderer.
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert/strict");
const root = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, "game/js/plugins", name + ".js"), "utf8");
const source = read("UF_WorldGen"), objectSource = read("UF_Objects");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "game/data/UF_WorldCatalog.json"), "utf8"));
let passed = 0, failed = 0;
function check(name, fn) {
    try { fn(); passed++; console.log(`PASS z_flora.${name}`); }
    catch (e) { failed++; console.error(`FAIL z_flora.${name}: ${e.stack}`); }
}
function harness(code = source, objectsCode = objectSource) {
    const generators = new Map(), maps = new Map(), listeners = new Map(), drops = [];
    let view = 0;
    const size = 64;
    const state = { seed: 424242, size, areasX: 1, areasY: 1, startArea: { x: 0, y: 0 },
        factions: { playerId: "f1", list: [{ id: "f1", home: { area: { x: 0, y: 0 }, x: 20, y: 20, z: -1 } }] },
        history: { founders: {}, sites: [-1, -2].map((z, i) => ({ id: i + 1, faction: "f1", bare: true, area: { x: 0, y: 0 }, x: 20, y: 20, z })) } };
    const geology = ref => {
        const dry = Math.hypot(ref.x - 20, ref.y - 20) < 15 || Math.hypot(ref.x - 47, ref.y - 45) < 11;
        const water = dry && ((ref.x === 30 && ref.y >= 19 && ref.y <= 21) || (ref.x === 54 && ref.y === 45));
        return { water, dry: dry && !water, biome: { id: ref.z === -1 ? "rooted_loam" : "crystal_cavern" } };
    };
    const mapOf = z => { if (!maps.has(z)) maps.set(z, { width: size, height: size, ufObjects: new Array(size * size).fill(0) }); return maps.get(z); };
    const W = { state, registerGenerator: (id, fn) => generators.set(id, fn), unregisterGenerator() {},
        levelKey: (ax, ay, z) => z === 0 ? `${ax},${ay}` : `${ax},${ay},${z}`,
        inWorld: (ax, ay, z = 0) => ax === 0 && ay === 0 && Number.isInteger(z) && z >= -2 && z <= 2,
        viewLevel: () => ({ x: 0, y: 0, z: view }), levelOfMapId: () => ({ x: 0, y: 0, z: view }),
        peekArea: (ax, ay, z = 0) => mapOf(z), getObject: (ax, ay, x, y, z = 0) => mapOf(z).ufObjects[y * size + x],
        setObject: (ax, ay, x, y, type, z = 0) => { mapOf(z).ufObjects[y * size + x] = type; return true; } };
    class Base {}
    Base.prototype.start = Base.prototype.createCharacters = function() {};
    Base.prototype.isPassable = () => true;
    const context = { console, performance, DataManager: { isBattleTest: () => false, isEventTest: () => false, _databaseFiles: [] },
        Scene_Boot: class extends Base {}, Spriteset_Map: class extends Base {}, Game_Map: class extends Base {}, Sprite: class extends Base {}, SceneManager: {},
        $ufWorldCatalog: JSON.parse(JSON.stringify(catalog)), UF: { World: W,
            Levels: { cellAt: geology, standableShape: ref => geology(ref).dry },
            Items: { drop: (area, x, y, type, n) => { const item = { area: { x: area.x, y: area.y }, z: area.z, x, y, type, n }; drops.push(item); return [item]; } },
            Events: { on: (event, fn) => { if (!listeners.has(event)) listeners.set(event, []); listeners.get(event).push(fn); }, emit: (event, ...args) => { for (const fn of listeners.get(event) || []) fn(...args); } } } };
    context.window = context;
    vm.createContext(context);
    vm.runInContext(code, context, { filename: "UF_WorldGen.js" });
    vm.runInContext(objectsCode, context, { filename: "UF_Objects.js" });
    const build = z => {
        const map = mapOf(z); map.ufObjects.fill(0);
        generators.get("uf_underground_resources")({ areaX: 0, areaY: 0, z, width: size, height: size, objects: map.ufObjects });
        return map.ufObjects;
    };
    return { context, W, state, build, mapOf, drops, geology, view: z => { view = z; }, size };
}
function assertFlora(h, z) {
    const ids = h.build(z).filter(Boolean).map(t => catalog.objects[t - 1].id);
    const kit = h.context.UF.WorldGen.undergroundKitConfig(z);
    const allowed = new Set([...Object.keys(kit.objects), ...kit.natural.map(p => p.id), "rocks_small", "granite_boulder", "ironstone", "copper_outcrop", "crystal"]);
    assert.ok(ids.length > 0);
    assert.ok(ids.every(id => allowed.has(id)), `unexpected flora on ${z}: ${ids.filter(id => !allowed.has(id))}`);
    return ids;
}
check("depth_specific_natural_and_kit", () => {
    const h = harness(), flora = [];
    for (const z of [-1, -2]) {
        const ids = assertFlora(h, z), kit = h.context.UF.WorldGen.undergroundKitConfig(z);
        for (const [id, count] of Object.entries(kit.objects)) {
            const type = catalog.objects.findIndex(o => o.id === id) + 1;
            assert.ok(h.mapOf(z).ufObjects.filter((t, i) => t === type && Math.hypot(i % h.size - 20, Math.floor(i / h.size) - 20) <= 20).length >= count, `${z} kit short ${id}`);
        }
        const natural = new Set(kit.natural.map(p => p.id));
        assert.ok(ids.some(id => natural.has(id)));
        assert.ok(h.mapOf(z).ufObjects.some((t, i) => t && natural.has(catalog.objects[t - 1].id) && Math.hypot(i % h.size - 47, Math.floor(i / h.size) - 45) < 11), `${z} no flora in uninhabited pocket`);
        flora.push(new Set(ids.filter(id => natural.has(id))));
        for (let i = 0; i < h.size * h.size; i++) if (h.mapOf(z).ufObjects[i]) {
            const x = i % h.size, y = Math.floor(i / h.size);
            assert.ok(h.geology({ x, y, z }).dry, `${z} object on water/rock`);
            assert.ok(Math.abs(x - 20) > 3 || Math.abs(y - 20) > 3, `${z} object on camp`);
        }
    }
    assert.ok([...flora[0]].every(id => !flora[1].has(id)), "depths share flora identities");
    assert.ok(h.mapOf(0).ufObjects.every(t => t === 0), "underground generator touched Ground");
});
check("starter_resource_coverage", () => {
    const h = harness(), G = h.context.UF.WorldGen;
    for (const z of [-1, -2]) {
        const kit = G.undergroundKitConfig(z), total = { log: 0, stone: 0, fiber: 0, straw: 0, food: 0 };
        for (const [id, n] of Object.entries(kit.objects)) { const worth = G.objectWorth(id); for (const key of Object.keys(total)) total[key] += n * worth[key]; }
        for (const [key, n] of Object.entries(G.kitNeeds().needs)) assert.ok(total[key] >= n, `${z} ${key}: ${total[key]} < ${n}`);
        assert.deepEqual(JSON.parse(JSON.stringify(kit.ore)), catalog.start.kit.ore && { ids: catalog.start.kit.ore.ids, count: catalog.start.kit.ore.count });
    }
});
check("finite_mineral_baseline_preserved", () => {
    const h = harness(), G = h.context.UF.WorldGen;
    let checked = 0;
    for (const z of [-1, -2]) {
        const map = h.build(z);
        for (let i = 0; i < map.length; i++) {
            const x = i % h.size, y = Math.floor(i / h.size);
            if (!h.geology({ x, y, z }).dry || (Math.abs(x - 20) <= 3 && Math.abs(y - 20) <= 3)) continue;
            const roll = G.unit(h.state.seed, 0x6b17 ^ 0x706f636b, z, i);
            const id = roll < 0.014 ? "rocks_small" : roll < 0.019 ? "granite_boulder" : roll < 0.023 ? "ironstone" : roll < 0.027 ? "copper_outcrop" : z === -2 && roll < 0.032 ? "crystal" : null;
            if (id) { assert.equal(catalog.objects[map[i] - 1].id, id, `${z} mineral replaced at ${x},${y}`); checked++; }
        }
    }
    assert.ok(checked > 0);
});
check("determinism_view_and_seed", () => {
    const h = harness(), first = JSON.stringify(h.build(-1));
    h.view(-2); assert.equal(JSON.stringify(h.build(-1)), first);
    h.state.seed++; assert.notEqual(JSON.stringify(h.build(-1)), first);
});
check("regrowth_yields_and_saved_levels", () => {
    const h = harness(), O = h.context.UF.Objects;
    for (const z of [-1, -2]) {
        const G = h.context.UF.WorldGen, kit = G.undergroundKitConfig(z);
        const ids = kit.natural.map(p => p.id);
        ids.forEach((id, i) => {
            const area = { x: 0, y: 0, z }, x = 5 + i, y = 5;
            const type = O.type(id), action = Object.keys(type.actions || {})[0];
            assert.ok(action, `${id} has no harvest action`);
            O.setIn(area, x, y, id);
            const result = O.applyIn(area, x, y, action);
            assert.equal(result.z, z);
            const harvested = O.atIn(area, x, y);
            assert.ok(harvested && harvested.regrow && harvested.regrow.to === id, `${id} missing same-flora regrowth`);
            assert.ok((harvested.tags || []).includes("underground"));
        });
    }
    h.W.state = JSON.parse(JSON.stringify(h.state));
    const due = Math.max(...O.regrowList().map(r => r.due));
    for (let hour = 0; hour < due; hour++) O.processRegrow();
    assert.equal(O.regrowList().length, 0);
    for (const z of [-1, -2]) h.context.UF.WorldGen.undergroundKitConfig(z).natural.forEach((p, i) => assert.equal(O.atIn({ x: 0, y: 0, z }, 5 + i, 5).id, p.id));
    assert.ok(h.drops.length > 0 && h.drops.every(d => d.z === -1 || d.z === -2));
    assert.ok(h.mapOf(0).ufObjects.every(t => t === 0));
});
check("missing_or_surface_config_refused", () => {
    const h = harness();
    delete h.context.$ufWorldCatalog.start.undergroundKit["-1"];
    assert.throws(() => h.build(-1), /Missing underground flora/);
    h.context.$ufWorldCatalog.start.undergroundKit["-1"] = { objects: { oak: 1 }, natural: [] };
    assert.throws(() => h.build(-1), /Surface vegetation/);
});
check("surface_kit_mutation_is_detected", () => {
    const mutant = source.replace("kitEntries(kit, seed ^ hash32(ctx.z)", "kitEntries(WorldGen.kitConfig(), seed ^ hash32(ctx.z)");
    assert.notEqual(mutant, source, "mutation target disappeared");
    assert.throws(() => assertFlora(harness(mutant), -1), /unexpected flora/);
});
console.log(`RESULT: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
