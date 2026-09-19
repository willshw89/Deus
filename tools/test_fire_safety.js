"use strict";
// Production FireSafety, Fire and Jobs with terrain, movement, object and engine doubles.
// No renderer, actual generator, autonomous Colonists scan or editor acceptance claim.
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert/strict");
const root = path.resolve(__dirname, ".."), file = name => fs.readFileSync(path.join(root, "game/js/plugins", `${name}.js`), "utf8");
let safetySource = file("UF_FireSafety"), fireSource = file("UF_Fire");
const jobsSource = file("UF_Jobs"), mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
const mutations = {
    ordered: ["current.params&&current.params.ordered", "false"],
    second_leg: ["if (!stand || !path(u,plan.stand,stand)) continue;", "if (!stand) continue;"],
    ownership: ["|| ownedByOther(u,p)", "|| false"],
    adulthood: ["Number.isFinite(d.age) && d.age >= 18", "true"],
    limit: ["countResponders(u)>=LIMIT", "false"],
    changing_fuel: ["a.becomes!==t.id", "true"],
    thermal: ['if (d.burning || d.thermal && ["hypothermia_severe","critical","heatstroke"].includes(d.thermal.stage)) return false;', 'if (false) return false;']
};
if (mutant === "faction") {
    const needle = 'o.faction !== undefined ? o.faction : F && typeof F.playerId === "function" ? F.playerId() : null';
    assert.ok(fireSource.includes(needle), "faction mutation seam exists"); fireSource = fireSource.replace(needle, 'F && typeof F.playerId === "function" ? F.playerId() : null');
} else if (mutant) {
    assert.ok(mutations[mutant], "known mutation"); const [a, b] = mutations[mutant]; assert.ok(safetySource.includes(a), "mutation target exists"); safetySource = safetySource.replace(a, b);
}
let passed = 0, failed = 0;
function check(name, fn) { try { fn(); passed++; console.log(`PASS fire_safety.${name}`); } catch (e) { failed++; console.error(`FAIL fire_safety.${name}: ${e.message}`); } }
const a = z => ({ x: 0, y: 0, z });
const cell = (x, y, z = 0) => ({ area: { x: 0, y: 0 }, x, y, z });
function fixture() {
    const size = 28, objects = new Map(), water = new Set(), blocked = new Set(), owners = new Map(), homes = new Map(), events = new Map(), writes = [], paths = [], sent = [];
    let nextId = 1, time = 0, overridePath = null;
    const key = (area, x, y) => `${area.z === undefined ? 0 : area.z}:${x},${y}`;
    const types = {
        brush: { id: "brush", typeId: 1, name: "Brush", tags: ["plant"], passable: true, actions: { gather: { work: 5, becomes: null, yields: { fiber: 1 } } } },
        tree: { id: "tree", typeId: 2, name: "Tree", tags: ["tree"], passable: false, actions: { chop: { work: 8, becomes: "stump", yields: { log: 1 } } } },
        stump: { id: "stump", typeId: 3, name: "Stump", tags: ["stump"], passable: true, actions: { gather: { work: 5, becomes: null } } },
        campfire: { id: "campfire", typeId: 4, name: "Campfire", tags: ["fire", "building"], passable: false },
        wall: { id: "wall", typeId: 5, name: "Wood wall", tags: ["wood", "building", "wall"], passable: false, actions: { chop: { work: 10, becomes: null } } },
        berries: { id: "berries", typeId: 6, name: "Berry bush", tags: ["plant"], passable: true, actions: { gather: { work: 5, becomes: "berries", yields: { berry: 1 } } } },
        stone: { id: "stone", typeId: 7, name: "Stone", tags: ["stone"], passable: true, actions: { pick: { work: 5, becomes: null } } }
    };
    const W = { state: { seed: 424242, size, units: {} }, EVENT_BASE: 1000, _frame: 0,
        isLevel: z => Number.isInteger(z) && z >= -2 && z <= 2,
        inWorld: (x, y, z = 0) => x === 0 && y === 0 && Number.isInteger(z) && z >= -2 && z <= 2,
        currentArea: () => a(0), viewLevel: () => a(0), levelOfMapId: () => a(0), hash32: () => 900,
        unit: id => W.state.units[id], units: () => Object.values(W.state.units), eventOf: () => null,
        unitsInArea: (x, y, z = 0) => W.units().filter(u => u.area.x === x && u.area.y === y && u.z === z),
        walkable(ax, ay, x, y, opts = {}) { const area = { x: ax, y: ay, z: opts.z || 0 }, t = O.atIn(area, x, y); return x >= 0 && y >= 0 && x < size && y < size && !water.has(key(area, x, y)) && !blocked.has(key(area, x, y)) && (!t || t.passable); },
        cellFree(ax, ay, x, y, ignore = 0, z = 0) { return W.walkable(ax, ay, x, y, { z }) && !W.units().some(u => u.id !== ignore && u.z === z && u.x === x && u.y === y); },
        getTile: (ax, ay, x, y, layer, z = 0) => water.has(key({ z }, x, y)) ? 9 : 0,
        findPath(area, sx, sy, gx, gy, opts = {}) {
            paths.push({ area: { ...area }, sx, sy, gx, gy, opts });
            if (overridePath) return overridePath(area, sx, sy, gx, gy, opts);
            if (!W.walkable(area.x, area.y, gx, gy, { z: area.z })) return null;
            const queue = [[sx, sy]], seen = new Map([[`${sx},${sy}`, null]]);
            for (let head = 0; head < queue.length; head++) {
                const [x, y] = queue[head];
                if (x === gx && y === gy) { const out = []; let p = [x, y]; while (p && (p[0] !== sx || p[1] !== sy)) { out.push({ x: p[0], y: p[1] }); p = seen.get(`${p[0]},${p[1]}`); } return out.reverse(); }
                for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { const nx = x + dx, ny = y + dy, k = `${nx},${ny}`; if (seen.has(k) || !W.walkable(area.x, area.y, nx, ny, { z: area.z })) continue; seen.set(k, [x, y]); queue.push([nx, ny]); }
            }
            return null;
        },
        sendUnit(id, goal) { const u = W.unit(id); if (!u || u.z !== goal.z) return false; u.goal = goal; sent.push({ id, goal }); return true; },
        stopUnit(id) { if (W.unit(id)) W.unit(id).goal = null; },
        setTile(...args) { writes.push(["tile", ...args]); }, removeUnit(id) { delete W.state.units[id]; }
    };
    const O = { types: () => Object.values(types), type: id => types[id] || Object.values(types).find(t => t.typeId === id),
        atIn: (area, x, y) => types[objects.get(key(area, x, y))] || null,
        setIn(area, x, y, type) { writes.push(["object", area.z || 0, x, y, type]); if (type) objects.set(key(area, x, y), type); else objects.delete(key(area, x, y)); return true; },
        applyIn(area, x, y, action) { const t = O.atIn(area, x, y), ac = t && t.actions && t.actions[action]; if (!ac) return null; O.setIn(area, x, y, ac.becomes); return { from: t.id, to: ac.becomes, yields: ac.yields || {} }; }
    };
    class Base { update() {} start() {} createCharacters() {} isMapPassable() { return true; } }
    const context = { console, performance, Sprite: class extends Base {}, Game_Map: class extends Base {}, Game_CharacterBase: class extends Base {}, Game_Event: class extends Base {}, Spriteset_Map: class extends Base {}, Scene_Boot: class extends Base {},
        SceneManager: {}, Tilemap: { isWaterTile: id => id === 9 }, DataManager: { createGameObjects() {}, extractSaveContents(contents) { W.state = contents.ufWorld; } },
        $ufWorldCatalog: { objects: Object.values(types), fire: { beatFrames: 3, damage: [1, 1], startChance: 0,
            douse: { waterRadius: 8, fillBeats: 2, beats: 3, maxOpen: 0 }, rules: [{ tags: ["fire"], source: true, escapeChance: 0 }, { tags: ["stone"], never: true },
                { tags: ["plant"], burn: 1000, spread: 0, becomes: null }, { tags: ["tree"], burn: 1000, spread: 0, becomes: "stump" }, { tags: ["stump"], burn: 1000, spread: 0, becomes: null }, { tags: ["wood"], burn: 1000, spread: 0, becomes: null }] } },
        UF: { World: W, Objects: O, Items: { get: () => null, type: () => null, atIn: () => [], remove() {} }, Time: { ticks: () => time },
            Events: { on(name, fn) { if (!events.has(name)) events.set(name, []); events.get(name).push(fn); }, emit(name, ...args) { for (const fn of events.get(name) || []) fn(...args); } },
            Colonists: { state: u => u && u.data.site !== null ? { area: { x: 0, y: 0 }, z: u.z, site: { x: 10, y: 10 }, radius: 4 } : null, site: () => null },
            Combat: { inCombat: u => !!u.data.inCombat }, Factions: { playerId: () => "player" },
            Ownership: { ownerOf: r => owners.get(key({ z: r.z }, r.x, r.y)) || null },
            Households: { of: u => homes.get(u.id), structures: h => [h.home, ...(h.annexes || [])].filter(Boolean) }
        } };
    context.window = context; vm.createContext(context);
    for (const [name, source] of [["UF_Jobs", jobsSource], ["UF_Fire", fireSource], ["UF_FireSafety", safetySource]]) vm.runInContext(source, context, { filename: `${name}.js` });
    const J = context.UF.Jobs, F = context.UF.Fire;
    J.define("TEST_work", { plan: () => ({ ok: true, stand: null }), work: 10000, apply() {} });
    function unit(z = 0, data = {}, x = 7, y = 10) { const u = { id: nextId++, name: "TEST_Responder", area: { x: 0, y: 0 }, z, x, y, data: { kind: "person", ai: "settlement", faction: "npc", site: 1, age: 30, hp: 20, needs: { hunger: 10, thirst: 10, sleep: 10 }, ...data } }; W.state.units[u.id] = u; return u; }
    function put(z, x, y, type = "brush") { objects.set(key(a(z), x, y), type); }
    function light(z = 0, x = 10, y = 10, type = "brush") { put(z, x, y, type); assert.equal(F.ignite(a(z), x, y, { cause: "test" }), true); water.add(key(a(z), 10, 6)); return cell(x, y, z); }
    function tick(n) { for (let i = 0; i < n; i++) { time++; for (const u of W.units()) if (u.goal) { const p = W.findPath({ ...u.area, z: u.z }, u.x, u.y, u.goal.x, u.goal.y); if (p && p.length) { u.x = p[0].x; u.y = p[0].y; } if (u.x === u.goal.x && u.y === u.goal.y) u.goal = null; } J.update(); } }
    return { W, J, F, S: context.UF.FireSafety, context, O, types, objects, water, blocked, owners, homes, writes, paths, sent, key, unit, put, light, tick, time: n => { time = n; }, override: fn => { overridePath = fn; } };
}
check("npc_offscreen_physical_water_and_work", () => {
    const h = fixture(), u = h.unit(-1), fire = h.light(-1), old = h.J.create({ type: "TEST_work", owner: u.id });
    const job = h.S.respond(u); assert.ok(job); assert.equal(job.params.faction, "npc"); assert.equal(job.target.z, -1); assert.equal(job.params.siteId, 1); assert.equal(old.state, "failed");
    assert.equal(h.F.isBurning(a(-1), fire.x, fire.y), true, "dispatch must not extinguish");
    h.tick(1); assert.equal(job.params.filled, undefined, "water must be fetched physically"); assert.ok(u.goal);
    h.tick(60); assert.equal(job.state, "done"); assert.equal(job.result.doused, true); assert.equal(job.params.filled.z, -1); assert.equal(job.params.filled.water.z, -1); assert.equal(h.F.isBurning(a(-1), fire.x, fire.y), false); assert.equal(h.W.viewLevel().z, 0);
});
check("all_five_levels_are_independent", () => {
    for (const z of [-2, -1, 0, 1, 2]) { const h = fixture(), u = h.unit(z); h.light(z); h.light(z === 0 ? -1 : 0); const j = h.S.respond(u); assert.ok(j); assert.equal(j.target.z, z); h.tick(60); assert.equal(j.state, "done"); assert.equal(h.F.isBurning(a(z === 0 ? -1 : 0), 10, 10), true); }
});
check("adult_known_age_only", () => {
    for (const age of [undefined, null, NaN, "30", 0, 17]) { const h = fixture(), u = h.unit(0, { age }); h.light(); assert.equal(h.S.eligible(u), false, `age ${String(age)}`); assert.equal(h.S.respond(u), null); }
});
check("dying_and_nonpositive_hp_refused", () => {
    for (const data of [{ dead: true }, { dying: true }, { _isDying: true }, { hp: 0 }, { hp: -1 }]) { const h = fixture(), u = h.unit(0, data); h.light(); assert.equal(h.S.respond(u), null, JSON.stringify(data)); }
});
check("active_combat_preserved", () => {
    const h = fixture(), u = h.unit(0, { inCombat: true }); h.light(); const old = h.J.create({ type: "TEST_work", owner: u.id }); assert.equal(h.S.respond(u), null); assert.equal(h.J.of(u.id), old);
});
check("critical_needs_preserved", () => {
    for (const n of [{ hunger: 75 }, { thirst: 75 }, { sleep: 85 }]) { const h = fixture(), u = h.unit(0, { needs: n }); h.light(); const old = h.J.create({ type: "TEST_work", owner: u.id }); assert.equal(h.S.respond(u), null); assert.equal(h.J.of(u.id), old); }
});
check("critical_thermal_conditions_preserved", () => {
    for (const data of [{ burning: true }, ...["hypothermia_severe", "critical", "heatstroke"].map(stage => ({ thermal: { stage } }))]) {
        const h = fixture(), u = h.unit(0, data); h.light(); const old = h.J.create({ type: "TEST_work", owner: u.id });
        assert.equal(h.S.eligible(u), false, JSON.stringify(data)); assert.equal(h.S.respond(u), null); assert.equal(h.J.of(u.id), old);
        h.J.cancel(old.id, "test idle prevention"); h.put(0, 10, 10, "campfire"); h.put(0, 10, 9, "brush"); assert.equal(h.S.prevent(u), null);
    }
});
check("explicit_orders_preserved", () => {
    const h = fixture(), u = h.unit(); h.light(); const old = h.J.create({ type: "TEST_work", owner: u.id, params: { ordered: true } }); assert.equal(h.S.respond(u), null); assert.equal(h.J.of(u.id), old);
});
check("bodily_and_protected_jobs_preserved", () => {
    for (const type of ["eat", "drink", "sleep", "mate", "attack", "hunt", "flee", "douse"]) { const h = fixture(), u = h.unit(); h.light(); h.J.define(type, { plan: () => ({ ok: true, stand: null }), work: 1000, apply() {} }); const old = h.J.create({ type, owner: u.id }); assert.equal(h.S.respond(u), null, type); assert.equal(h.J.of(u.id), old); }
});
check("no_water_no_preemption", () => {
    const h = fixture(), u = h.unit(); h.light(); h.water.clear(); const old = h.J.create({ type: "TEST_work", owner: u.id }); assert.equal(h.S.respond(u), null); assert.equal(h.J.of(u.id), old); assert.equal(h.F.count(), 1);
});
check("first_leg_path_required", () => {
    const h = fixture(), u = h.unit(); h.light(); const old = h.J.create({ type: "TEST_work", owner: u.id }); h.override(() => null); assert.equal(h.S.respond(u), null); assert.equal(h.J.of(u.id), old); assert.equal(h.F.douseJobs().length, 0);
});
check("second_leg_path_required", () => {
    const h = fixture(), u = h.unit(); h.light(); const old = h.J.create({ type: "TEST_work", owner: u.id });
    h.override((area, sx, sy, gx, gy) => sx === u.x && sy === u.y ? [{ x: gx, y: gy }] : null);
    assert.equal(h.S.respond(u), null); assert.equal(h.J.of(u.id), old); assert.equal(h.F.douseJobs().length, 0);
});
check("partial_or_wrong_endpoint_not_reachable", () => {
    for (const mode of ["partial", "neighbor"]) { const h = fixture(), u = h.unit(); h.light(); h.override((area, sx, sy, gx, gy) => { const p = [{ x: mode === "neighbor" ? gx + 1 : gx, y: gy }]; if (mode === "partial") p.partial = true; return p; }); assert.equal(h.S.respond(u), null, mode); }
});
check("path_through_flames_refused", () => {
    const h = fixture(), u = h.unit(); h.light(); h.override((area, sx, sy, gx, gy) => [{ x: 10, y: 10 }, { x: gx, y: gy }]); assert.equal(h.S.respond(u), null); assert.equal(h.F.douseJobs().length, 0);
});
check("no_cross_level_or_remote_response", () => {
    const h = fixture(), u = h.unit(); h.light(-1); assert.equal(h.S.respond(u), null); const other = h.unit(0, {}, 0, 0); h.light(0, 27, 27); assert.equal(h.S.respond(other), null);
});
check("three_responders_per_settlement", () => {
    const h = fixture(); for (const [x, y] of [[10, 10], [12, 10], [14, 10], [16, 10]]) h.light(0, x, y);
    const workers = [h.unit(0, {}, 6, 10), h.unit(0, {}, 6, 11), h.unit(0, {}, 6, 12), h.unit(0, {}, 6, 13)];
    for (let i = 0; i < 3; i++) assert.ok(h.S.respond(workers[i]), `responder ${i}`);
    assert.equal(h.S.respond(workers[3]), null); assert.equal(h.F.douseJobs().filter(j => j.assigned).length, 3);
});
check("existing_other_faction_job_not_stolen", () => {
    const h = fixture(), u = h.unit(); h.light(); const other = h.F.douse(a(0), 10, 10, { faction: "other" }); assert.ok(other); assert.equal(h.S.respond(u), null); assert.equal(other.assigned, null);
});
check("bounded_retry_then_recheck", () => {
    const h = fixture(), u = h.unit(); h.light(); h.override(() => null); assert.equal(h.S.respond(u), null); const n = h.paths.length;
    h.override(null); h.time(119); assert.equal(h.S.respond(u), null); assert.equal(h.paths.length, n); h.time(120); assert.ok(h.S.respond(u));
});
check("hearth_clearance_is_physical_job", () => {
    const h = fixture(), u = h.unit(-2); h.put(-2, 10, 10, "campfire"); h.put(-2, 10, 9);
    const before = h.writes.length, prep = h.S.hearthPreparation(u, cell(10, 10, -2)); assert.equal(prep.safe, false); assert.equal(prep.spec.type, "gather"); assert.equal(prep.spec.target.z, -2); assert.equal(h.writes.length, before);
    const job = h.S.prevent(u); assert.ok(job); assert.equal(h.O.atIn(a(-2), 10, 9).id, "brush"); h.tick(40); assert.equal(job.state, "done"); assert.equal(h.O.atIn(a(-2), 10, 9), null); assert.equal(h.S.hearthPreparation(u, cell(10, 10, -2)).safe, true);
});
check("structures_and_other_ownership_untouched", () => {
    for (const kind of ["building", "otherUnit", "otherFaction"]) {
        const h = fixture(), u = h.unit(); h.put(0, 10, 10, "campfire"); h.put(0, 10, 9, kind === "building" ? "wall" : "brush");
        if (kind !== "building") h.owners.set(h.key(a(0), 10, 9), { kind: kind === "otherUnit" ? "unit" : "faction", id: kind === "otherUnit" ? 999 : "other" });
        const prep = h.S.hearthPreparation(u, cell(10, 10)); assert.equal(prep.safe, false); assert.equal(prep.spec, undefined, kind); assert.equal(h.S.prevent(u), null); assert.equal(h.writes.length, 0);
    }
});
check("own_faction_or_personal_fuel_can_clear", () => {
    for (const kind of ["faction", "unit", "public"]) { const h = fixture(), u = h.unit(); h.put(0, 10, 9); h.owners.set(h.key(a(0), 10, 9), { kind, id: kind === "unit" ? u.id : "npc" }); assert.ok(h.S.hearthPreparation(u, cell(10, 10)).spec, kind); }
});
check("harvest_that_keeps_fuel_is_not_clearance", () => {
    const h = fixture(), u = h.unit(); h.put(0, 10, 9, "berries"); const p = h.S.hearthPreparation(u, cell(10, 10)); assert.equal(p.safe, false); assert.equal(p.spec, undefined); assert.match(p.reason, /physical/);
});
check("nonflammable_neighbors_already_safe", () => {
    const h = fixture(), u = h.unit(); h.put(0, 10, 9, "stone"); const p = h.S.hearthPreparation(u, cell(10, 10)); assert.equal(p.safe, true); assert.equal(h.writes.length, 0);
});
check("household_annex_hearth_and_duplicate_work", () => {
    const h = fixture(), u = h.unit(); h.homes.set(u.id, { area: { x: 0, y: 0 }, z: 0, home: null, annexes: [{ x: 19, y: 19, w: 7, h: 7, hearth: { x: 20, y: 23 } }] });
    h.put(0, 20, 23, "campfire"); h.put(0, 20, 22); const prep = h.S.prevent(u); assert.ok(prep); assert.equal(prep.target.x, 20); assert.equal(prep.target.y, 22);
    const other = h.unit(0, {}, 8, 10); h.homes.set(other.id, h.homes.get(u.id)); assert.equal(h.S.prevent(other), null);
});
check("hearth_wrong_level_refused", () => { const h = fixture(), u = h.unit(-1); h.put(0, 10, 9); assert.equal(h.S.hearthPreparation(u, cell(10, 10, 0)).safe, false); assert.equal(h.writes.length, 0); });
console.log(`RESULT: ${passed} passed, ${failed} failed`); process.exitCode = failed ? 1 : 0;
