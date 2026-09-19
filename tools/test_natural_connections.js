"use strict";
// Production NaturalConnections + production Jobs; terrain, movement and UI doubles.
// This is not a real-generator seed survey, rendering test or editor acceptance.
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert/strict");
const root = path.resolve(__dirname, "..");
let source = fs.readFileSync(path.join(root, "game/js/plugins/UF_NaturalConnections.js"), "utf8");
const jobsSource = fs.readFileSync(path.join(root, "game/js/plugins/UF_Jobs.js"), "utf8");
const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
const mutations = {
    arrival: ["requireArrival && !sameCell(unit, route.from)", "false"],
    landing: ["if (!free(route.to, unit))", "if (false)"],
    water: ["b1.water && b1.water[i] || b2.water && b2.water[i]", "b1.water[i] || b2.water[i]"],
    protection: ["if (reservations.has(`${zOf(r)}:${r.x},${r.y}`)) return true;", "if (false) return true;"],
    adjacency: ["Math.abs(zOf(link.a) - zOf(link.b)) !== 1", "false"],
    finish: ["job.params.refusal = reason; return \"continue\";", "job.params.refusal = reason; return undefined;"],
    annex: ["UF.Households.structures(h) : [h.home]", "[h.home] : [h.home]"]
};
if (mutant) { assert.ok(mutations[mutant], "known mutation"); const [a, b] = mutations[mutant]; assert.ok(source.includes(a), "mutation target exists"); source = source.replace(a, b); }
let passed = 0, failed = 0;
function check(name, fn) { try { fn(); passed++; console.log(`PASS natural_connections.${name}`); } catch (e) { failed++; console.error(`FAIL natural_connections.${name}: ${e.stack}`); } }
function fixture(opts = {}) {
    const events = new Map(), blocks = new Set(), wet = new Set(), shapes = new Map(), baselines = {}, moves = [], sent = [], notices = [], sites = [], settlements = [];
    let view = { x: 0, y: 0, z: 0 }, nextId = 1, ticks = 0;
    const key = (x, y, z) => `${z}:${x},${y}`;
    const emit = (name, ...args) => { for (const f of events.get(name) || []) f(...args); };
    const on = (name, fn) => { if (!events.has(name)) events.set(name, []); events.get(name).push(fn); };
    const size = 24;
    for (const z of [-1, -2]) baselines[z] = { shape: new Uint8Array(size * size).fill(2), ...(opts.legacy ? {} : { water: new Uint8Array(size * size) }) };
    class Base { start() {} update() {} createCharacters() {} createAllWindows() {} }
    const W = {
        state: null, EVENT_BASE: 1000,
        hash32: (...v) => v.reduce((h, n) => Math.imul(h ^ n, 16777619) >>> 0, 2166136261),
        isLevel: z => Number.isInteger(z) && z >= -2 && z <= 2,
        inWorld: (ax, ay, z) => ax === 0 && ay === 0 && Number.isInteger(z) && z >= -2 && z <= 2,
        units: () => Object.values(W.state.units), unit: id => W.state.units[id], eventOf: () => null,
        unitsInArea: (ax, ay, z = 0) => W.units().filter(u => u.area.x === ax && u.area.y === ay && u.z === z),
        viewLevel: () => view, currentArea: () => view.z === 0 ? view : null,
        newWorld(seed = 424242) {
            nextId = 1;
            W.state = { seed, size, startArea: { x: 0, y: 0 }, areasX: 1, areasY: 1, levels: {}, units: {}, items: {} };
            const u = unit(12, 12, 0); u.data.faction = "test";
            emit("world:created", W.state);
            if (opts.founded) opts.founded(W, unit, sites, settlements);
            return W.state;
        },
        walkable(ax, ay, x, y, options = {}) {
            const z = options.z || 0;
            return x >= 0 && y >= 0 && x < size && y < size && !blocks.has(key(x, y, z)) && !wet.has(key(x, y, z)) && (z === 0 || (shapes.get(key(x, y, z)) || baselines[z].shape[y * size + x]) === 2);
        },
        cellFree(ax, ay, x, y, ignore = 0, z = 0) { return W.walkable(ax, ay, x, y, { z }) && !W.units().some(u => u.id !== ignore && u.z === z && u.x === x && u.y === y); },
        findPath(area, sx, sy, gx, gy, options = {}) {
            const z = options.z === undefined ? area.z : options.z;
            if (!W.walkable(area.x, area.y, gx, gy, { z })) return null;
            const queue = [[sx, sy]], seen = new Map([[key(sx, sy, z), null]]);
            for (let head = 0; head < queue.length; head++) {
                const [x, y] = queue[head];
                if (x === gx && y === gy) {
                    const result = []; let p = [x, y];
                    while (p && (p[0] !== sx || p[1] !== sy)) { result.push({ x: p[0], y: p[1] }); p = seen.get(key(p[0], p[1], z)); }
                    return result.reverse();
                }
                for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
                    const nx = x + dx, ny = y + dy, k = key(nx, ny, z);
                    if (seen.has(k) || !W.walkable(area.x, area.y, nx, ny, { z })) continue;
                    seen.set(k, [x, y]); queue.push([nx, ny]);
                }
            }
            return null;
        },
        reachable: (a, sx, sy, gx, gy) => !!W.findPath(a, sx, sy, gx, gy, { z: a.z }),
        sendUnit(id, goal) { const u = W.unit(id); if (!u || u.z !== goal.z) return false; sent.push({ id, goal }); u.goal = goal; return true; },
        stopUnit(id) { if (W.unit(id)) W.unit(id).goal = null; },
        moveUnitToLevel(u, z, x, y) { moves.push({ id: u.id, from: u.z, z, x, y }); const before = u.z; u.z = z; u.x = x; u.y = y; u.goal = null; emit("world:unitLevelChanged", u, before, z); return true; }
    };
    const C = { settlements: () => settlements, isColonist: u => u && u.data.kind === "colonist" && u.data.faction === "test",
        order(id, spec) { const active = context.UF.Jobs.of(id); if (active) context.UF.Jobs.cancel(active.id, "ordered elsewhere"); return context.UF.Jobs.create({ ...spec, owner: id, params: { ...spec.params, ordered: true } }); } };
    const context = { console: { log: console.log, error: console.error, warn: s => notices.push(s) },
        Scene_Boot: class extends Base {}, Scene_Map: class extends Base {}, Game_Map: class extends Base {}, Spriteset_Map: class extends Base {}, Sprite: class extends Base {}, Window_Base: class extends Base {},
        DataManager: { extractSaveContents(contents) { W.state = contents.ufWorld; } }, Input: { keyMapper: {} }, Graphics: { frameCount: 0 }, SceneManager: {},
        UF: { World: W, Colonists: C, Events: { emit, on }, Items: { get: id => W.state.items[id], type: () => null },
            Time: { ticks: () => ticks }, History: { sites: () => sites, homeSite: () => sites.find(s => s.protected) },
            Levels: { SHAPES: { floor: 2 }, baseline: z => baselines[z],
                standableShape: r => (shapes.get(key(r.x, r.y, r.z)) || baselines[r.z].shape[r.y * size + r.x]) === 2,
                waterAt: r => wet.has(key(r.x, r.y, r.z)) || !!(baselines[r.z].water && baselines[r.z].water[r.y * size + r.x]) } } };
    if (opts.structures) context.UF.Households = { structures: opts.structures };
    context.window = context; vm.createContext(context);
    vm.runInContext(jobsSource, context, { filename: "UF_Jobs.js" });
    vm.runInContext(source, context, { filename: "UF_NaturalConnections.js" });
    new context.Scene_Boot().start(); W.newWorld();
    function unit(x, y, z, data = {}) { const u = { id: nextId++, name: "TEST_Worker", area: { x: 0, y: 0 }, x, y, z, data: { kind: "colonist", faction: "test", inventory: [], equipment: {}, ...data } }; W.state.units[u.id] = u; return u; }
    function tick(n = 1) {
        for (let i = 0; i < n; i++) {
            ticks++;
            for (const u of W.units()) if (u.goal) { const p = W.findPath(u.area, u.x, u.y, u.goal.x, u.goal.y, { z: u.z }); if (p && p.length) { u.x = p[0].x; u.y = p[0].y; } if (u.x === u.goal.x && u.y === u.goal.y) u.goal = null; }
            context.UF.Jobs.update();
        }
    }
    return { context, W, J: context.UF.Jobs, N: context.UF.NaturalConnections, unit, tick, blocks, wet, shapes, baselines, moves, sent, sites, settlements, key, notices, setView: z => { view = { x: 0, y: 0, z }; } };
}
function enter(h, z = 0) { const link = h.N.list().find(l => l.a.z === z); assert.ok(link); const u = h.unit(link.a.x, link.a.y, z); return { link, u }; }
check("seeded_mock_determinism_and_pairing", () => {
    for (const seed of [1, 7, 42, 424242, 20260919]) {
        const a = fixture(), b = fixture(); a.W.newWorld(seed); b.W.newWorld(seed);
        assert.equal(JSON.stringify(a.N.state()), JSON.stringify(b.N.state()));
        const links = a.N.list(); assert.equal(a.N.state().status, "ready"); assert.equal(links.length, 2);
        assert.equal(links[0].b.x, links[1].a.x); assert.equal(links[0].b.y, links[1].a.y); assert.equal(links[1].b.z, -2);
    }
});
check("legacy_baseline_without_water_arrays", () => { const h = fixture({ legacy: true }); assert.equal(h.N.state().status, "ready"); });
check("post_founding_protects_sites", () => {
    const h = fixture({ founded(W, unit, sites) { sites.push({ area: { x: 0, y: 0 }, x: 12, y: 12, z: 0, protected: true, faction: "test" }); } });
    assert.ok(h.N.list().every(l => Math.max(Math.abs(l.a.x - 12), Math.abs(l.a.y - 12)) > 6));
});
check("bootstrap_and_household_reservations", () => {
    const h = fixture({ founded(W, unit, sites, settlements) {
        settlements.push({ area: { x: 0, y: 0 }, z: 0, site: { x: 12, y: 12 }, radius: 4, plan: [{ cells: [[8, 0]] }] });
        W.state.households = { byId: { old: { area: { x: 0, y: 0 }, z: -1, mergedInto: "new", home: { x: 2, y: 2, w: 7, h: 7 } } } };
    } });
    assert.ok(h.N.list().every(l => Math.max(Math.abs(l.a.x - 12), Math.abs(l.a.y - 12)) > 5));
    assert.ok(h.N.list().every(l => Math.max(Math.abs(l.a.x - 20), Math.abs(l.a.y - 12)) > 1));
    assert.ok(h.N.list().every(l => l.a.x > 9 || l.a.y > 9));
});
check("annex_footprint_and_entrance_reserved", () => {
    const baseline = fixture().N.list()[0].a;
    assert.ok(baseline.x >= 9 && baseline.x <= 17 && baseline.y >= 9 && baseline.y <= 17, "fixture must otherwise choose the annex footprint");
    const h = fixture({ structures: h => [h.home, ...(h.annexes || [])], founded(W) {
        W.state.households = { byId: { old: { area: { x: 0, y: 0 }, z: -1, mergedInto: "new",
            home: { x: 2, y: 2, w: 2, h: 2 }, annexes: [{ x: 10, y: 10, w: 7, h: 7, entrance: { x: 20, y: 12 } }] } } };
    } });
    assert.equal(h.N.state().status, "ready");
    assert.ok(h.N.list().every(l => l.a.x < 9 || l.a.x > 17 || l.a.y < 9 || l.a.y > 17), "entrance intersects retained annex or its clearance");
    assert.ok(h.N.list().every(l => Math.max(Math.abs(l.a.x - 20), Math.abs(l.a.y - 12)) > 1), "entrance intersects annex access clearance");
});
check("blocked_world_is_honest_no_carving", () => {
    const h = fixture(); delete h.W.state.naturalConnections; h.baselines[-2].shape.fill(1);
    const before = Array.from(h.baselines[-2].shape); const result = h.N.generate();
    assert.equal(result.status, "blocked"); assert.equal(result.links.length, 0); assert.match(result.reason, /Excavation/);
    assert.deepEqual(Array.from(h.baselines[-2].shape), before); assert.equal(h.N.generate(), result);
});
check("water_objects_and_units_excluded", () => {
    const h = fixture(), first = h.N.list()[0].a;
    delete h.W.state.naturalConnections; h.wet.add(h.key(first.x, first.y, -2)); const s = h.N.generate();
    assert.equal(s.status, "ready"); assert.ok(s.links.every(l => l.a.x !== first.x || l.a.y !== first.y));
    const next = s.links[0].a; delete h.W.state.naturalConnections; h.blocks.add(h.key(next.x, next.y, 0));
    assert.ok(h.N.generate().links.every(l => l.a.x !== next.x || l.a.y !== next.y));
});
check("save_roundtrip_and_detached_query", () => {
    const h = fixture(), before = JSON.stringify(h.N.state()), copy = h.N.list(); copy[0].a.z = 2;
    assert.equal(JSON.stringify(h.N.state()), before);
    h.context.DataManager.extractSaveContents({ ufWorld: JSON.parse(JSON.stringify(h.W.state)) }); assert.equal(JSON.stringify(h.N.state()), before);
    assert.equal(h.N.generate(), h.N.state());
    const a = h.N.list()[0].a; assert.equal(h.N.at(a).length, 1); assert.equal(h.N.at({ ...a, z: -1 }).length, 2);
});
check("reservation_is_level_specific", () => {
    const h = fixture(), e = h.N.list()[0].a; assert.equal(h.N.reserved(e), true);
    assert.equal(h.N.reserved({ ...e, x: e.x + 1 }), true); assert.equal(h.N.reserved({ ...e, z: 1 }), false);
    assert.equal(h.N.at({ ...e, z: "-1" }).length, 0);
});
check("walk_before_actual_jobs_transfer", () => {
    const h = fixture(), { link, u } = enter(h); u.x -= 2;
    const job = h.N.travel(u, link.id); assert.equal(job.owner, u.id); assert.equal(u.z, 0);
    h.tick(1); assert.equal(h.moves.length, 0); assert.ok(u.goal);
    h.tick(80); assert.equal(job.state, "done"); assert.equal(u.z, -1); assert.equal(h.moves.length, 1); assert.equal(job.target.z, -1); assert.equal(job.result.from.z, 0);
});
check("direct_apply_cannot_teleport_from_away", () => {
    const h = fixture(), { link, u } = enter(h); u.x -= 2;
    const job = { target: link.a, params: { linkId: link.id } };
    assert.equal(h.J.handler(h.N.TYPE).apply(job, u), "continue"); assert.equal(h.moves.length, 0); assert.match(job.params.refusal, /entrance/);
});
check("occupied_landing_at_plan_refused", () => {
    const h = fixture(), { link, u } = enter(h); h.unit(link.b.x, link.b.y, -1);
    const job = h.N.travel(u, link.id); assert.equal(job.state, "failed"); assert.equal(h.moves.length, 0); assert.match(job.reason, /landing/);
});
check("occupied_after_work_never_reports_done", () => {
    const h = fixture(), { link, u } = enter(h), job = h.N.travel(u, link.id); h.tick(20); assert.equal(job.state, "work");
    h.unit(link.b.x, link.b.y, -1); h.tick(50); assert.equal(job.state, "failed"); assert.equal(u.z, 0); assert.equal(h.moves.length, 0); assert.equal(job.result, undefined);
});
check("unsupported_landing_refused", () => {
    const h = fixture(), { link, u } = enter(h); h.shapes.set(h.key(link.b.x, link.b.y, -1), 3);
    assert.equal(h.N.travel(u, link.id).state, "failed"); assert.equal(h.moves.length, 0);
});
check("busy_order_and_goal_preserved", () => {
    const h = fixture(), { link, u } = enter(h);
    h.J.define("test_wait", { plan: () => ({ ok: true, stand: null }), work: 100, apply() {} });
    const old = h.J.create({ type: "test_wait", owner: u.id }); assert.equal(h.N.travel(u, link.id), null); assert.equal(h.J.of(u.id), old);
    h.J.cancel(old.id); u.goal = { ...link.a }; assert.equal(h.N.travel(u, link.id), null); assert.ok(u.goal);
});
check("offscreen_reverse_inventory_stays_owned", () => {
    const h = fixture(), { link, u } = enter(h, -1); h.setView(0); u.data.inventory = [99]; h.W.state.items[99] = { id: 99, holder: u.id, z: -1 };
    const first = h.N.travel(u, link.id); h.tick(70); assert.equal(first.state, "done"); assert.equal(u.z, -2); assert.equal(h.W.state.items[99].holder, u.id); assert.deepEqual(u.data.inventory, [99]);
    const back = h.N.travel(u, link.id); h.tick(70); assert.equal(back.state, "done"); assert.equal(u.z, -1);
});
check("wrong_level_and_nonadjacent_pair_refused", () => {
    const h = fixture(), { link, u } = enter(h); u.z = 1; assert.equal(h.N.travel(u, link.id), null); u.z = 0;
    h.N.state().links[0].b.z = -2; assert.equal(h.N.travel(u, link.id), null); assert.equal(h.moves.length, 0);
});
check("different_column_pair_refused", () => {
    const h = fixture(), { link, u } = enter(h); h.N.state().links[0].b.x++; assert.equal(h.N.travel(u, link.id), null);
});
check("saved_job_replans_then_traverses", () => {
    const h = fixture(), { link, u } = enter(h); const job = h.N.travel(u, link.id); h.tick(10);
    h.context.DataManager.extractSaveContents({ ufWorld: JSON.parse(JSON.stringify(h.W.state)) });
    const loaded = h.J.get(job.id); assert.equal(loaded.planned, false); h.tick(60); assert.equal(loaded.state, "done"); assert.equal(h.W.unit(u.id).z, -1);
});
check("invalid_explicit_command_keeps_current_job", () => {
    const h = fixture(), { u } = enter(h); h.context.$colonyManager = { selectedColonist: { id: u.id } };
    h.J.define("test_wait", { plan: () => ({ ok: true, stand: null }), work: 100, apply() {} });
    const old = h.J.create({ type: "test_wait", owner: u.id }); assert.equal(h.N.orderSelected(1), null); assert.equal(h.J.of(u.id), old);
});
check("valid_explicit_command_replaces_job", () => {
    const h = fixture(), { u } = enter(h); h.context.$colonyManager = { selectedColonist: { id: u.id } };
    h.J.define("test_wait", { plan: () => ({ ok: true, stand: null }), work: 100, apply() {} });
    const old = h.J.create({ type: "test_wait", owner: u.id }); const next = h.N.orderSelected(-1);
    assert.equal(old.state, "failed"); assert.equal(next.type, h.N.TYPE); assert.equal(next.params.ordered, true); h.tick(70); assert.equal(next.state, "done");
});
check("nonplayer_shortcut_refused", () => {
    const h = fixture(), { u } = enter(h); u.data.faction = "other"; h.context.$colonyManager = { selectedColonist: { id: u.id } };
    assert.equal(h.N.orderSelected(-1), null); assert.equal(h.J.list().length, 0);
});
console.log(`RESULT: ${passed} passed, ${failed} failed`); process.exitCode = failed ? 1 : 0;
