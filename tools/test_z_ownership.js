"use strict";
// Contract tests run the real plugin in a VM with explicit legacy/level seams.
// --mutate-z removes level identity from the source before loading it: must fail.
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
let source = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_Ownership.js"), "utf8");
if (process.argv.includes("--mutate-z")) {
    const match = /const zOf = ref => ref && ref\.z !== undefined \? ref\.z\s*: ref && ref\.area && ref\.area\.z !== undefined \? ref\.area\.z : 0;/;
    assert(match.test(source), "mutation target missing");
    source = source.replace(match, "const zOf = ref => 0;");
}
let passed = 0, failed = 0;
function check(name, fn) {
    try { fn(); passed++; console.log(`PASS ownership_z.${name}`); }
    catch (e) { failed++; console.error(`FAIL ownership_z.${name}: ${e.message}`); }
}
function fixture(levels, legacyColonists = false) {
    const events = new Map(), cells = new Map(), seen = [], jobs = [];
    const ground = { x: 0, y: 0 }, lower = { x: 0, y: 0, z: -1 };
    const W = { state: { size: 16, units: [] }, currentArea: () => ground,
        units() { return this.state.units; }, unit(id) { return this.units().find(u => u.id === id); },
        unitsInArea(ax, ay, z = 0) { return this.units().filter(u => u.area.x === ax && u.area.y === ay && (!levels || (u.z || 0) === z)); }
    };
    let viewed = ground;
    if (levels) Object.assign(W, { viewLevel: () => viewed, levelKey: (x, y, z) => `${x},${y},${z}`, levelOfMapId: () => viewed });
    const coord = (a, x, y) => `${a.x},${a.y},${levels ? a.z || 0 : 0}:${x},${y}`;
    const bed = { id: "TEST_bed", tags: ["bed"] };
    const O = { atIn(a, x, y) { seen.push([a, x, y]); return cells.get(coord(a, x, y)) || null; },
        findIn(a) { return [...cells].filter(([key]) => key.startsWith(`${a.x},${a.y},${levels ? a.z || 0 : 0}:`)).map(([key]) => {
            const [x, y] = key.split(":")[1].split(",").map(Number); return { x, y };
        }); }
    };
    const plans = [], orders = [];
    const J = { handler: () => ({ plan(job) { plans.push(JSON.parse(JSON.stringify(job))); return { ok: true }; } }),
        of: id => jobs.find(j => j.owner === id && j.state !== "cancelled"),
        create(spec) { const j = Object.assign({ id: jobs.length + 1, state: "open" }, spec); jobs.push(j); return j; },
        cancel(id) { jobs.find(j => j.id === id).state = "cancelled"; }
    };
    function Game_Map() {} Game_Map.prototype.update = function() {};
    function Scene_Boot() {} Scene_Boot.prototype.start = function() {};
    const ctx = { console, Game_Map, Scene_Boot, UF: { World: W, Objects: O, Jobs: J,
        Events: { on(name, fn) { if (!events.has(name)) events.set(name, []); events.get(name).push(fn); },
            emit(name, ...args) { for (const fn of events.get(name) || []) fn(...args); } }
    }, DataManager: { extractSaveContents(save) { W.state = save.ufWorld; } } };
    ctx.window = ctx;
    if (legacyColonists) ctx.UF.Colonists = {
        isColonist: () => true,
        order(id, spec) {
            orders.push(id);
            const current = J.of(id); if (current) J.cancel(current.id);
            // Deliberately reproduce the live Ground-only order adapter.
            return J.create({ type: spec.type, owner: id, params: Object.assign({ ordered: true }, spec.params),
                target: { area: { x: spec.target.area.x, y: spec.target.area.y }, x: spec.target.x, y: spec.target.y } });
        }
    };
    vm.runInNewContext(source, ctx, { filename: "UF_Ownership.js" });
    const own = ctx.UF.Ownership;
    const person = (id, z) => {
        const u = { id, name: `TEST_person_${id}`, area: ground, x: 5, y: 4, data: { kind: "person", needs: { sleep: 90 } } };
        if (z !== undefined) u.z = z;
        W.state.units.push(u); return u;
    };
    const put = (a, x = 5, y = 5) => cells.set(coord(a, x, y), bed);
    const remove = (a, x = 5, y = 5) => { cells.delete(coord(a, x, y)); ctx.UF.Events.emit(a.z ? "objects:levelChanged" : "objects:changed", a, x, y, "TEST_bed", null); };
    return { own, W, ctx, ground, lower, cells, seen, jobs, plans, orders, person, put, remove, view(a) { viewed = a; } };
}
const ref = (area, extra = {}) => Object.assign({ kind: "object", area, x: 5, y: 5 }, extra);
const old = fixture(false), u0 = old.person(1);
old.put(old.ground);
check("legacy_ground_key", () => assert.strictEqual(old.own.keyOf(ref(old.ground)), "object:0,0:5,5"));
check("legacy_explicit_zero", () => assert.strictEqual(old.own.keyOf(ref(old.ground, { z: 0 })), "object:0,0:5,5"));
check("legacy_bed_shape", () => assert.strictEqual(JSON.stringify(old.own.assignBed(u0, ref(old.ground))), '{"area":{"x":0,"y":0},"x":5,"y":5}'));
check("legacy_nonzero_refused", () => {
    const before = JSON.stringify(old.W.state), reads = old.seen.length;
    assert.strictEqual(old.own.claim(ref(old.lower), "public"), null);
    assert.strictEqual(old.own.assignBed(u0, ref(old.lower)), null);
    assert.strictEqual(old.own.keyOf("object:0,0,-1:5,5"), null);
    assert.strictEqual(old.seen.length, reads);
    assert.strictEqual(JSON.stringify(old.W.state), before);
});
check("legacy_save_roundtrip", () => {
    const before = JSON.stringify(old.W.state);
    old.ctx.DataManager.extractSaveContents(JSON.parse(JSON.stringify({ ufWorld: old.W.state })));
    old.own.reconcile();
    assert.strictEqual(JSON.stringify(old.W.state), before);
    assert(old.own.bedOf(1));
});
const f = fixture(true), a = f.person(1, 0), b = f.person(2, -1);
f.put(f.ground); f.put(f.lower);
check("keys_separate_levels", () => assert.notStrictEqual(f.own.keyOf(ref(f.ground)), f.own.keyOf(ref(f.lower))));
check("record_z_wins", () => assert.strictEqual(f.own.keyOf(ref(f.lower, { z: 0 })), "object:0,0:5,5"));
check("invalid_levels_refused", () => {
    for (const z of [3, -3, 0.5, NaN, null, "-1"]) assert.strictEqual(f.own.claim(ref(f.ground, { z }), "public"), null);
});
check("reconcile_each_level", () => {
    const r = f.own.reconcile(); assert.strictEqual(r.assigned, 2); assert.strictEqual(r.areas, 2);
    assert.strictEqual(f.own.ownerOf(ref(f.ground)).id, a.id);
    assert.strictEqual(f.own.ownerOf(ref(f.lower)).id, b.id);
    assert.strictEqual(f.own.bedOf(b).z, -1);
    assert.strictEqual(f.own.bedOf(b).area.z, undefined);
});
check("sleep_preserves_target_z", () => {
    const j = f.own.scheduleSleep(b); assert(j); assert.strictEqual(j.target.z, -1);
    assert.strictEqual(f.plans[f.plans.length - 1].target.z, -1);
});
check("cross_level_sleep_refused", () => {
    const n = f.jobs.length; b.z = 0;
    assert.strictEqual(f.own.scheduleSleep(b, { force: true }), null);
    assert.strictEqual(f.jobs.length, n); assert.strictEqual(f.own.bedOf(b).z, -1); b.z = -1;
});
check("view_owner_uses_level", () => {
    f.view(f.lower); assert(f.own._decorateLines(["Bed"], 5, 5)[0].includes("TEST_person_2"));
    f.view(f.ground); assert(f.own._decorateLines(["Bed"], 5, 5)[0].includes("TEST_person_1"));
});
check("seam_save_roundtrip", () => {
    const before = JSON.stringify(f.W.state);
    f.ctx.DataManager.extractSaveContents(JSON.parse(JSON.stringify({ ufWorld: f.W.state })));
    f.own.reconcile();
    assert.strictEqual(JSON.stringify(f.W.state), before);
    assert.strictEqual(f.own.bedOf(2).z, -1);
});
check("lower_destruction_isolated", () => {
    f.remove(f.lower);
    assert.strictEqual(f.own.ownerOf(ref(f.lower)), null);
    assert.strictEqual(f.own.bedOf(2), null);
    assert.strictEqual(f.own.ownerOf(ref(f.ground)).id, 1);
    assert(f.own.bedOf(1));
});
check("unit_added_uses_record_z", () => {
    f.put(f.lower, 6, 5); const c = f.person(3, -1); c.x = 6; c.y = 5; f.ctx.UF.Events.emit("world:unitAdded", c);
    assert.strictEqual(f.own.bedOf(c).z, -1);
});
check("all_five_levels_simulate_offscreen", () => {
    const all = fixture(true, true);
    for (const z of [-2, -1, 0, 1, 2]) { all.person(z + 3, z); all.put({ x: 0, y: 0, z }); }
    all.view(all.ground);
    const r = all.own.reconcile(); assert.strictEqual(r.areas, 5); assert.strictEqual(r.assigned, 5);
    for (let frame = 0; frame < 30; frame++) all.ctx.Game_Map.prototype.update.call({}, true);
    assert.strictEqual(all.jobs.length, 5);
    assert.deepStrictEqual(all.jobs.map(j => j.target.z || 0).sort((a, b) => a - b), [-2, -1, 0, 1, 2]);
    assert.deepStrictEqual(all.orders, [3], "only the Ground colonist uses the legacy order adapter");
    assert(all.jobs.every(j => j.params.ordered === true && j.params.ownedBed === true));
});
console.log(`RESULT: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
