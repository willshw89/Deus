"use strict";
// Real Colonists + Households sources, engine doubles. Room geometry is supplied
// explicitly for core guard checks; tools/test_households.js tests actual rooms.
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
let source = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_Colonists.js"), "utf8");
const houseSource = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_Households.js"), "utf8");
function mutate(flag, from, to) { if (process.argv.includes(flag)) { assert(source.includes(from), `${flag} target missing`); source = source.replace(from, to); } }
mutate("--mutate-adapters", "const extra = u ?", "const extra = false ?");
mutate("--mutate-birth", "if (!childUnit) return null;", "// Mutant loses failed births.");
mutate("--mutate-reservations", "if (!h.home || !sameLevel(h, c)) continue;", "if (!h.home) continue;");
mutate("--mutate-owned-bed", "const owned = UF.Ownership && UF.Ownership.bedOf(u);", "const owned = null;");
mutate("--mutate-source", "if (hasTag(type, \"building\") || hasTag(type, \"door\") || hasTag(type, \"bed\")) return true;", "// Mutant treats completed buildings as resources.");
mutate("--mutate-home-exemption", "if (p && sameLevel(h, u) && u.x >= p.x - 2", "if (false && p && sameLevel(h, u) && u.x >= p.x - 2");
mutate("--mutate-rendezvous", "if (visit && visit.until > ticks() && eligibleForIntimacy(u)", "if (false && visit && visit.until > ticks() && eligibleForIntimacy(u)");
mutate("--mutate-unknown-age", "if (!Number.isFinite(u.data.age) || u.data.age < 18) return needJob(u)", "if (u.data.age < 18) return needJob(u)");
if (process.argv.includes("--mutate-adult")) {
    const start = source.indexOf("function eligibleForIntimacy(u)"), end = source.indexOf("function privatePairRoom", start);
    const guard = source.slice(start, end); assert(guard.includes("u.data.age < 18"), "adult mutation target missing");
    source = source.slice(0, start) + guard.replace("u.data.age < 18", "u.data.age < 16") + source.slice(end);
}
let passed = 0, failed = 0;
function check(name, fn) { try { fn(); passed++; console.log(`PASS family_integration.${name}`); } catch (e) { failed++; console.error(`FAIL family_integration.${name}: ${e.message}`); } }
const plain = x => JSON.parse(JSON.stringify(x));
function fixture() {
    const events = {}, errors = [], cells = new Map(), items = new Map(), jobList = [], handlers = {}, hSteps = [], gSteps = [], seenCandidates = [];
    let time = 100, nextUnit = 1, nextItem = 1, refuseBirth = false, standable = true, water = false, roomAvailable = true;
    const types = [
        { id: "wall", name: "Wall", tags: ["building", "wall"], build: { items: {} }, passable: false },
        { id: "bed", name: "Bed", tags: ["building", "bed"], build: { items: {} }, passable: true },
        { id: "blocker", name: "Other building", tags: ["building"], build: { items: {} }, passable: false }
    ];
    const itemTypes = [{ id: "tool", name: "Tool", tags: [] }, { id: "food", name: "Food", tags: ["food"], food: { hunger: 25 } }];
    const catalog = { colony: { facets: ["industriousness", "curiosity"], skills: ["crafting"], plan: [], thresholds: { hunger: 55, thirst: 55, sleep: 75, social: 40, nature: 35 }, needs: {} },
        cultures: { human: { priorities: {}, wall: "wall", door: "wall" } }, sites: { kinds: { camp: {} } }, objects: types,
        recipes: { list: [{ id: "tool", name: "Make tool", inputs: {}, outputs: { tool: 1 }, skill: "crafting" }] }, start: {}, people: {} };
    const colony = { factionId: 1, siteId: 1, site: { x: 10, y: 10 }, area: { x: 0, y: 0 }, z: 0, radius: 8, plan: [], stockpiles: [], log: [], settlements: {}, settlementsReady: true, adopted: true };
    const world = { state: { seed: 451, size: 32, units: {}, colony, factions: { playerId: 1, list: [{ id: 1, species: "human" }] } }, _frame: 100,
        hash32(...args) { let h = 2166136261; for (const n of args) h = Math.imul(h ^ (n | 0), 16777619); return h >>> 0; },
        mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
        units() { return Object.values(this.state.units); }, unit(id) { return this.state.units[id] || null; },
        viewLevel: () => ({ x: 0, y: 0, z: 0 }), currentArea: () => ({ x: 0, y: 0 }), levelOfMapId: () => ({ x: 0, y: 0, z: 0 }),
        peekArea(ax, ay, z = 0) {
            const grid = new Array(this.state.size * this.state.size).fill(0);
            for (const [k, type] of cells) if (k.startsWith(`${ax},${ay},${z}:`)) {
                const [x, y] = k.split(":")[1].split(",").map(Number); grid[y * this.state.size + x] = types.indexOf(type) + 1;
            }
            return { ufObjects: grid };
        }, walkable: () => standable, reachable: () => true, eventOf: () => null, refreshUnitImage() {},
        addUnit(spec) { if (refuseBirth) return null; const u = Object.assign({ id: nextUnit++ }, spec); this.state.units[u.id] = u; return u; }
    };
    const key = (a, x, y) => `${a.x},${a.y},${a.z || 0}:${x},${y}`;
    const I = { type: id => itemTypes.find(t => t.id === id), get: id => items.get(id), inventoryOf: id => [...items.values()].filter(i => i.holder === id),
        atIn: (a, x, y) => [...items.values()].filter(i => i.area && key({ ...i.area, z: i.z }, i.x, i.y) === key(a, x, y)),
        count(ref, id) { return (typeof ref === "number" ? this.inventoryOf(ref) : this.atIn(ref.area, ref.x, ref.y)).filter(i => !id || i.type === id).reduce((n, i) => n + i.count, 0); },
        find: () => [] };
    const O = { type: id => types.find(t => t.id === id), types: () => types,
        atIn: (a, x, y) => cells.get(key(a, x, y)) || null,
        findIn(a, opts) { return [...cells].filter(([k, t]) => k.startsWith(`${a.x},${a.y},${a.z || 0}:`) && (!opts.id || opts.id === t.id) && (!opts.tags || opts.tags.some(tag => t.tags.includes(tag)))).map(([k, type]) => { const [x, y] = k.split(":")[1].split(",").map(Number); return { x, y, type, dist: opts.near ? Math.hypot(x - opts.near.x, y - opts.near.y) : 0 }; }).filter(p => opts.radius === undefined || p.dist <= opts.radius); }
    };
    const J = { handler: id => handlers[id], define: (id, h) => handlers[id] = h,
        create(spec) { const j = Object.assign({ id: jobList.length + 1, state: "work", assigned: spec.owner, params: {} }, spec); jobList.push(j); return j; },
        of: id => jobList.find(j => j.assigned === id && ["work", "travel"].includes(j.state)) || null,
        list: pred => pred ? jobList.filter(pred) : jobList.slice(), open: () => jobList.filter(j => j.state === "open"),
        take(id, pred) { const j = this.open().find(pred); if (j) { j.assigned = id; j.state = "work"; } return j; },
        cancel(id, reason) { const j = jobList.find(j => j.id === id); if (j) { j.state = "failed"; j.reason = reason; } },
        standable: () => standable, isWaterAt: (a, x, y) => water && x === 10 && y === 12, describe: j => j.type };
    J.define("mate", { plan: () => ({ ok: true, stand: null }), apply: () => {}, work: 120 });
    function Game_Map() {} Game_Map.prototype.update = function() {};
    function Scene_Boot() {} Scene_Boot.prototype.start = function() {};
    const ctx = { console: { log: console.log, error: (...xs) => errors.push(xs.join(" ")) }, Game_Map, Scene_Boot,
        DataManager: { extractSaveContents: save => world.state = save.ufWorld }, $ufWorldCatalog: catalog, $ufTime: { hour: 12, day: 1, monthIndex: 0, year: 1 },
        UF: { World: world, Items: I, Objects: O, Jobs: J, Time: { ticks: () => time },
            Factions: { get: () => ({ id: 1, species: "human" }), playerId: () => 1 },
            History: { siteById: () => ({ id: 1, kind: "camp", x: 10, y: 10, faction: 1, area: { x: 0, y: 0 }, z: colony.z }), sites: () => [] },
            Ownership: { ownerOf: () => null, assignBed: () => null, bedOf: u => u.data.bed || null },
            Events: { on: (n, f) => (events[n] || (events[n] = [])).push(f), emit: (n, ...args) => (events[n] || []).forEach(f => f(...args)) },
            Goals: { planSteps: () => gSteps, choosePlan(u, cs) { seenCandidates.push(...cs); return cs.slice().sort((a, b) => (b.step.household ? 2 : b.step.goalOwner ? 1 : 0) - (a.step.household ? 2 : a.step.goalOwner ? 1 : 0)); } } } };
    ctx.window = ctx; vm.createContext(ctx); vm.runInContext(source, ctx, { filename: "UF_Colonists.js" }); vm.runInContext(houseSource, ctx, { filename: "UF_Households.js" }); new ctx.Scene_Boot().start();
    const C = ctx.UF.Colonists, H = ctx.UF.Households;
    H.planSteps = () => hSteps; // The actual household layout has its own source tests.
    H.roomForPair = (a, b) => roomAvailable && a && b ? { cells: [{ x: 10, y: 10 }, { x: 11, y: 10 }], spots: [{ x: 10, y: 10 }, { x: 11, y: 10 }] } : null;
    function add(age = 25, gender = "female", z = colony.z) {
        const id = nextUnit++, u = { id, name: `TEST_person_${id}`, area: { x: 0, y: 0 }, z, x: id === 1 ? 10 : 11, y: 10, image: { characterName: "People1" },
            data: { kind: "colonist", ai: "colonist", faction: 1, site: 1, species: "human", age, gender, familyDesire: true, inventory: [], equipment: {}, facets: { industriousness: 100, curiosity: 0 }, skills: {}, thoughts: [], needs: { hunger: 0, thirst: 0, sleep: 0, social: 0, nature: 0 }, home: { area: { x: 0, y: 0 }, z, x: 10, y: 10 } } };
        world.state.units[id] = u; return u;
    }
    function give(u, type = "tool") { const it = { id: nextItem++, type, count: 1, holder: u.id, area: null, z: u.z }; items.set(it.id, it); return it; }
    const pair = () => { const a = add(25), b = add(25, "male"); H.reconcile(); assert(H.formPair(a, b)); return [a, b]; };
    return { C, H, J, I, O, ctx, world, colony, add, give, pair, cells, key, hSteps, gSteps, seenCandidates, jobList, errors, types, itemTypes, catalog,
        block(x, y, id = "blocker") { cells.set(key({ x: 0, y: 0, z: colony.z }, x, y), O.type(id)); },
        setRoom(v) { roomAvailable = v; }, setWater(v) { water = v; }, setStandable(v) { standable = v; }, refuseBirth(v) { refuseBirth = v; }, advance(amount = 1000) { time += amount; } };
}
check("exact_blocked_is_not_completed", () => {
    const f = fixture(), u = f.add(), s = { id: "home_bed", build: "bed", cells: [[2, 0]], exact: true };
    f.block(12, 10); assert.strictEqual(f.C._internal.buildCells(s, u)[0].state, "blocked");
    assert.strictEqual(f.C.planStatus(u, [s])[0].done, false);
    f.block(13, 10, "bed"); assert.strictEqual(f.C.planStatus(u, [s])[0].done, false);
    f.block(12, 10, "bed"); assert.strictEqual(f.C.planStatus(u, [s])[0].done, true);
});
check("adapters_survive_unfinished_bootstrap", () => {
    const f = fixture(), u = f.add(); for (let i = 0; i < 5; i++) f.colony.plan.push({ id: `boot${i}`, build: "wall", cells: [[i, 5]] });
    f.hSteps.push({ id: "home_wall", household: "household:1", exact: true, build: "wall", cells: [[0, -3]] });
    f.gSteps.push({ id: "own_tool", craft: "tool", each: true, goalOwner: u.id, goalId: "own_tool" });
    const j = f.C._internal.planJob(u); assert(j && j.params.household === "household:1");
    assert(f.seenCandidates.some(c => c.step.id === "home_wall")); assert(f.seenCandidates.some(c => c.step.id === "own_tool")); assert.strictEqual(f.seenCandidates.filter(c => /^boot/.test(c.step.id)).length, 3);
});
check("personal_completion_counts_only_goal_owner", () => {
    const f = fixture(), a = f.add(), b = f.add(), s = { id: "own_tool", craft: "tool", each: true, goalOwner: a.id };
    f.gSteps.push(s); f.give(b); assert.strictEqual(f.C.planStatus(a, [s])[0].done, false);
    f.give(a); assert.strictEqual(f.C.planStatus(a, [s])[0].done, true);
    assert(!f.C.planStatus(b).some(s => s.id === "own_tool"));
});
check("critical_need_preempts_industry_not_existing_order_without_need", () => {
    const f = fixture(), a = f.add(); const first = f.C.order(a.id, { type: "move", target: { x: 13, y: 10 } });
    f.C._internal.scan(); assert.strictEqual(f.J.of(a.id), first);
    a.data.needs.thirst = 95; f.setWater(true); f.advance(); f.C._internal.scan();
    assert.strictEqual(first.state, "failed"); assert.strictEqual(f.J.of(a.id).type, "drink"); assert.deepStrictEqual(f.errors, []);
});
check("explicit_order_replaces_current_and_preserves_z", () => {
    const f = fixture(); f.colony.z = -1; const a = f.add(); const old = f.C.order(a.id, { type: "move", target: { x: 11, y: 10 } });
    const next = f.C.order(a.id, { type: "move", target: { x: 12, y: 10, z: -1 } });
    assert.strictEqual(old.state, "failed"); assert.strictEqual(next.target.z, -1); assert.strictEqual(next.params.ordered, true);
    assert.strictEqual(f.C.order(a.id, { type: "move", target: { x: 12, y: 10, z: 0 } }), null); assert.strictEqual(f.J.of(a.id), next);
});
check("strict_adult_and_unknown_age_guards", () => {
    const f = fixture(), a = f.add(17), b = f.add(25, "male"); a.data._forceConceive = true;
    assert.strictEqual(f.C.onMated(a, b), false); assert.strictEqual(a.data.pregnancy, undefined);
    a.data.age = 18; assert.strictEqual(f.C._internal.eligibleForIntimacy(a), true);
    delete a.data.age; assert.strictEqual(f.C.onMated(a, b), false); assert.strictEqual(f.C._internal.eligibleForIntimacy(a), false);
});
check("privacy_species_level_and_critical_needs_refuse", () => {
    const f = fixture(), [a, b] = f.pair(); f.setRoom(false); assert.strictEqual(f.C.onMated(a, b), false); f.setRoom(true);
    b.data.species = "elf"; assert.strictEqual(f.C.onMated(a, b), false); b.data.species = "human";
    b.z = -1; assert.strictEqual(f.C.onMated(a, b), false); b.z = 0;
    a.data.needs.sleep = 90; assert.strictEqual(f.C.onMated(a, b), false); a.data.needs.sleep = 0;
    a.data.familyDesire = false; assert.strictEqual(f.C.onMated(a, b), false);
});
check("real_household_partner_field_reaches_mating_adapter", () => {
    const f = fixture(), [a, b] = f.pair(); assert.strictEqual(a.data.partner || a.data.partnerId, b.id);
    const job = f.C.nightlyMateJob(a); assert(job && job.type === "mate"); assert.strictEqual(job.params.partnerId, b.id);
});
check("once_per_full_date_and_single_completion", () => {
    const f = fixture(), [a, b] = f.pair(); const j = { id: 1, type: "mate", state: "done", params: { partnerId: b.id }, target: { area: a.area, z: 0, x: b.x, y: b.y } };
    f.J.handler("mate").apply(j, a); assert.strictEqual(j.result.familyInteraction, true); const thoughts = a.data.thoughts.filter(t => /Made love/.test(t.text)).length;
    f.ctx.UF.Events.emit("jobs:done", j, a); assert.strictEqual(a.data.thoughts.filter(t => /Made love/.test(t.text)).length, thoughts);
    assert.strictEqual(f.C.onMated(a, b), false); f.ctx.$ufTime.monthIndex++; assert.strictEqual(f.C.onMated(a, b), true);
});
check("manual_and_loaded_handler_guard_rechecks_privacy", () => {
    const f = fixture(), [a, b] = f.pair(), j = { params: { partnerId: b.id } }, h = f.J.handler("mate");
    assert.strictEqual(h.plan(j, a).ok, true); f.setRoom(false); assert.strictEqual(h.plan(j, a).ok, false); h.apply(j, a);
    assert.strictEqual(j.result.familyInteraction, false); assert.strictEqual(a.data.lastMatedDate, undefined);
});
check("failed_birth_retains_pregnancy_and_no_success", () => {
    const f = fixture(), [a, b] = f.pair(); a.data.pregnancy = { fatherId: b.id, daysLeft: 0 }; f.refuseBirth(true);
    assert.strictEqual(f.C.giveBirth(a), null); assert(a.data.pregnancy); assert(!a.data.thoughts.some(t => /Gave birth/.test(t.text)));
    f.refuseBirth(false); f.setStandable(false); assert.strictEqual(f.C.giveBirth(a), null); assert(a.data.pregnancy);
});
check("successful_birth_keeps_family_and_level", () => {
    const f = fixture(); f.colony.z = -2; const [a, b] = f.pair(); a.data.pregnancy = { fatherId: b.id, daysLeft: 0 };
    const baby = f.C.giveBirth(a); assert(baby); assert.strictEqual(baby.z, -2); assert.strictEqual(baby.data.motherId, a.id); assert.strictEqual(baby.data.fatherId, b.id); assert(!a.data.pregnancy);
    assert.strictEqual(f.H.of(baby).id, f.H.of(a).id); assert.strictEqual(f.H.state().people[baby.id].generation, 1);
});
check("infants_and_children_do_not_choose_industry", () => {
    const f = fixture(), infant = f.add(0), child = f.add(8); f.colony.plan.push({ id: "build", build: "wall", cells: [[2, 0]] });
    assert.strictEqual(f.C.decide(infant), null); const j = f.C.decide(child); assert(!j || ["move", "sleep", "talk", "drink", "eat", "fetch", "gather"].includes(j.type));
    assert(!f.jobList.some(j => ["build", "craft", "mine", "chop", "hunt", "mate"].includes(j.type)));
});
check("three_reciprocal_conversations_form_willing_pair", () => {
    const f = fixture(), a = f.add(), b = f.add(25, "male"); f.H.reconcile();
    f.C._internal.rememberConversation(a, b); f.C._internal.rememberConversation(a, b); assert.strictEqual(a.data.partner || a.data.partnerId, undefined);
    f.C._internal.rememberConversation(a, b); assert.strictEqual(a.data.partner || a.data.partnerId, b.id); assert.strictEqual(f.H.of(a), f.H.of(b));
    assert.strictEqual(b.data.socialBonds.find(x => x.unitId === a.id).conversations, 3);
});
check("unwilling_kin_and_minor_do_not_pair_and_bonds_bounded", () => {
    const f = fixture(), a = f.add(), b = f.add(17, "male"); f.H.reconcile(); for (let i = 0; i < 3; i++) f.C._internal.rememberConversation(a, b); assert(!a.data.partner && !a.data.partnerId);
    b.data.age = 25; b.data.familyDesire = false; f.C._internal.rememberConversation(a, b); assert(!a.data.partner && !a.data.partnerId);
    b.data.familyDesire = true; b.data.motherId = a.id; f.H.reconcile(); f.C._internal.rememberConversation(a, b); assert(!a.data.partner && !a.data.partnerId);
    for (let i = 0; i < 25; i++) { const other = f.add(); other.data.familyDesire = false; f.advance(); f.C._internal.rememberConversation(a, other); }
    assert(a.data.socialBonds.length <= 16); assert.deepStrictEqual(f.errors, []);
});
const reservedHome = (x, y) => ({ x, y, w: 7, h: 7, walls: [{ x, y }], doors: [{ x: x + 1, y }], beds: [{ x: x + 2, y: y + 1, unitId: null }], hearth: { x: x + 1, y: y + 4 }, storage: { x: x + 5, y: y + 4 } });
check("other_household_reserved_cells_protected_only_same_level", () => {
    const f = fixture(), a = f.add(), b = f.add(); f.H.reconcile(); const other = f.H.of(b); other.home = reservedHome(22, 18);
    for (const p of [...other.home.walls, ...other.home.doors, ...other.home.beds, other.home.hearth, other.home.storage]) assert.strictEqual(f.C._internal.onBuildCell(p.x, p.y, a), true);
    other.z = -1; assert.strictEqual(f.C._internal.onBuildCell(22, 18, a), false);
    other.z = 0; other.mergedInto = "retained"; assert.strictEqual(f.C._internal.onBuildCell(22, 18, a), true);
});
check("ordinary_sleep_prefers_owned_bed_beyond_camp_radius", () => {
    const f = fixture(), a = f.add(); f.world.state.size = 128; f.block(11, 10, "bed"); f.block(64, 12, "bed");
    a.data.bed = { area: { x: 0, y: 0 }, z: 0, x: 64, y: 12 }; a.data.needs.sleep = 90;
    assert.strictEqual(f.O.findIn({ x: 0, y: 0, z: 0 }, { near: f.colony.site, radius: f.colony.radius + 6, tags: ["bed"] }).length, 1);
    const j = f.C._internal.needJob(a); assert(j && j.type === "sleep"); assert.strictEqual(j.target.x, 64); assert.strictEqual(j.target.y, 12);
});
check("resource_search_never_mines_completed_walls_or_doors", () => {
    const f = fixture(), a = f.add(); f.itemTypes.push({ id: "stone", name: "Stone", tags: ["stone"] });
    f.O.type("wall").actions = { quarry: { yields: { stone: 2 } } };
    f.types.push({ id: "door", name: "Door", tags: ["door"], passable: false, actions: { quarry: { yields: { stone: 2 } } } });
    f.O.type("bed").build.items = { stone: 1 }; f.colony.plan.push({ id: "bed", build: "bed", cells: [[0, 3]] });
    f.block(22, 10, "wall"); f.block(23, 10, "door"); assert.strictEqual(f.C._internal.planJob(a), null);
    f.types.push({ id: "rock", name: "Rock", tags: ["stone"], passable: false, actions: { quarry: { yields: { stone: 2 } } } });
    // The catalog object-array identity changes when definitions change in a fixture.
    f.catalog.objects = f.types.slice(); f.block(24, 10, "rock");
    const j = f.C._internal.planJob(a); assert(j && j.type === "quarry"); assert.strictEqual(j.target.x, 24);
});
check("own_house_beyond_leash_is_home_not_straying", () => {
    const f = fixture(), a = f.add(); f.world.state.size = 128; f.H.reconcile(); const h = f.H.of(a); h.home = reservedHome(60, 10); a.x = 62; a.y = 12;
    assert.strictEqual(f.C._internal.homeJob(a), null);
    a.x = 78; const j = f.C._internal.homeJob(a); assert(j && j.params.home === true); assert(j.target.x < 20);
});
check("rendezvous_waits_door_delay_then_can_continue", () => {
    const f = fixture(), [a, b] = f.pair(); a.data.familyRendezvous = { partnerId: b.id, until: 1300 }; a.data.needs.sleep = 80; f.setRoom(false);
    assert.strictEqual(f.C.decide(a), null); f.advance(90); assert.strictEqual(f.C.decide(a), null); assert.strictEqual(f.J.of(a.id), null);
    f.setRoom(true); const j = f.C.decide(a); assert(j && j.type === "mate");
});
check("rendezvous_yields_to_threshold_needs_and_deadline", () => {
    for (const mode of ["thirst", "hunger", "exhaustion", "deadline"]) {
        const f = fixture(), [a, b] = f.pair(); a.data.familyRendezvous = { partnerId: b.id, until: 1300 }; a.data.needs.sleep = 80; f.setRoom(false);
        if (mode === "thirst") { a.data.needs.thirst = 55; f.setWater(true); }
        if (mode === "hunger") { a.data.needs.hunger = 55; f.give(a, "food"); }
        if (mode === "exhaustion") a.data.needs.sleep = 85;
        if (mode === "deadline") f.advance(1201);
        const j = f.C.decide(a); assert(j, `${mode} must stop waiting`); assert.strictEqual(j.type, mode === "thirst" ? "drink" : mode === "hunger" ? "eat" : "sleep");
    }
});
check("unknown_age_never_selects_industry", () => {
    const f = fixture(), a = f.add(); delete a.data.age;
    f.colony.plan.push({ id: "manufacture", build: "wall", cells: [[2, 0]] });
    const j = f.C.decide(a); assert(!j || ["move", "sleep", "talk", "drink", "eat", "fetch", "gather"].includes(j.type));
    assert(!f.jobList.some(j => ["build", "craft", "mine", "chop", "hunt", "mate"].includes(j.type)));
});
console.log(`RESULT: ${passed} passed, ${failed} failed`); process.exitCode = failed ? 1 : 0;
