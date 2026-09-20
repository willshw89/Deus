"use strict";
// Actual plugin, engine doubles. --mutate-evidence accepts imagined completion;
// --mutate-inheritance removes parental influence; --mutate-policies disables ranking.
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
let source = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_CultureGrowth.js"), "utf8");
function mutate(flag, from, to) { if (process.argv.includes(flag)) { assert(source.includes(from), `${flag} target missing`); source = source.replace(from, to); } }
mutate("--mutate-evidence", "if (!confirmed(job, u)) return false;", "if (!job || !u) return false;");
mutate("--mutate-inheritance", "0.55 * mean + 0.45 * p.preferences[d]", "0 * mean + 1 * p.preferences[d]");
mutate("--mutate-policies", "if (!p || !f || rows.length < 2) return rows;", "if (true) return rows;");
mutate("--mutate-farm-evidence", "return !!(agriculture && agriculture.confirmedJob && agriculture.confirmedJob(job, u) === true);", "return true;");
mutate("--mutate-farm-migration", "if (!Number.isFinite(p.preferences[d])) p.preferences[d] =", "if (true) p.preferences[d] =");
let pass = 0, fail = 0;
function check(name, fn) { try { fn(); pass++; console.log(`PASS culture_growth.${name}`); } catch (e) { fail++; console.error(`FAIL culture_growth.${name}: ${e.message}`); } }
function fixture() {
    const events = new Map(), objects = new Map(), items = new Map(), jobs = [];
    const types = [{ id: "stone", tags: ["stone"] }, { id: "fiber", tags: ["fiber"] }, { id: "sword", tags: ["weapon"] }, { id: "meal", tags: ["food"] }];
    const objectTypes = [
        { id: "wall_stone", tags: ["wall", "stone"], build: { items: { stone: 2 } } },
        { id: "bed", tags: ["bed"], build: { items: { fiber: 1 } } },
        { id: "plant", actions: { gather: { yields: { fiber: 2 }, becomes: "plant_bare" } } },
        { id: "plant_bare", regrow: { to: "plant", hours: 24 } },
        { id: "tree", actions: { chop: { yields: { fiber: 2 }, becomes: null } } }
    ];
    const catalog = { items: { types }, objects: objectTypes, recipes: { list: [
        { id: "forge_sword", skill: "smithing", inputs: { stone: 1 }, outputs: { sword: 1 } },
        { id: "cook_meal", skill: "cooking", inputs: { fiber: 1 }, outputs: { meal: 1 } }
    ] } };
    const factions = ["human", "elf", "dwarf", "gnome", "goblin", "orc", "automaton"].map((species, i) => ({ id: i + 1, species }));
    const world = { state: { seed: 717, factions: { list: factions, playerId: 1 }, units: {} }, units() { return Object.values(this.state.units); }, unit(id) { return this.state.units[id] || null; } };
    const key = (a, x, y) => `${a.x},${a.y},${a.z || 0}:${x},${y}`;
    function Scene_Boot() {} Scene_Boot.prototype.start = function() {};
    const ctx = { console, Scene_Boot, $ufWorldCatalog: catalog, UF: { World: world, Time: { ticks: () => 20 },
        Items: { get: id => items.get(id) || null, atIn: (a, x, y) => [...items.values()].filter(it => it.area && key({ ...it.area, z: it.z }, it.x, it.y) === key(a, x, y)) },
        Objects: { type: id => objectTypes.find(t => t.id === id), atIn: (a, x, y) => objects.get(key(a, x, y)) || null },
        Jobs: { list: () => jobs }, Events: {
            on(n, fn) { if (!events.has(n)) events.set(n, []); events.get(n).push(fn); },
            emit(n, ...args) { for (const fn of events.get(n) || []) fn(...args); }
        }
    } };
    ctx.window = ctx; vm.runInNewContext(source, ctx, { filename: "UF_CultureGrowth.js" }); new ctx.Scene_Boot().start();
    const culture = ctx.UF.CultureGrowth;
    function person(id = 1, faction = 1, z = 0, x = 5) {
        const f = factions.find(f => f.id === faction), u = { id, name: `TEST_person_${id}`, area: { x: 0, y: 0 }, z, x, y: 5, data: { kind: "person", ai: "settlement", faction, species: f.species, age: 25, stage: "adult", site: faction, skills: { smithing: 7 }, facets: { curiosity: 73 }, householdId: faction } };
        world.state.units[id] = u; culture.ensurePerson(u); return u;
    }
    const target = (u, x = u.x, y = u.y) => ({ area: { ...u.area }, z: u.z, x, y });
    function craft(id, u, recipeId = "forge_sword") {
        const r = catalog.recipes.list.find(r => r.id === recipeId), type = Object.keys(r.outputs)[0], itemId = id + 1000;
        items.set(itemId, { id: itemId, type, count: 1, holder: u.id, area: null, z: u.z });
        return { id, type: "craft", state: "done", assigned: u.id, target: target(u), params: { recipeId }, result: { items: [itemId] } };
    }
    function build(id, u, objectId = "wall_stone", x = 8) {
        objects.set(key({ ...u.area, z: u.z }, x, 5), objectTypes.find(t => t.id === objectId));
        return { id, type: "build", state: "done", assigned: u.id, target: target(u, x), params: { objectId } };
    }
    const place = (u, x, id) => objects.set(key({ ...u.area, z: u.z }, x, 5), objectTypes.find(t => t.id === id));
    return { ctx, culture, world, person, target, craft, build, items, objects, jobs, factions, place };
}
const candidate = (type, params = {}, step = {}, score = 1, target) => ({ spec: { type, params, ...(target ? { target } : {}) }, step, order: 0, score });
const plain = x => JSON.parse(JSON.stringify(x));
check("initialization_additive_deterministic", () => {
    const a = fixture(), b = fixture(), u = a.person(), v = b.person();
    assert.deepStrictEqual(plain(u.data.preferences), plain(v.data.preferences));
    assert.deepStrictEqual(u.data.skills, { smithing: 7 }); assert.deepStrictEqual(u.data.facets, { curiosity: 73 });
    assert.strictEqual(a.culture.ensureFaction("missing"), null);
    assert.strictEqual(a.culture.ensurePerson({ id: 9, data: { kind: "animal" } }), null);
});
check("reject_unconfirmed_work", () => {
    const f = fixture(), u = f.person();
    assert.strictEqual(f.culture.recordJob({ id: 1, state: "done", type: "craft", params: { recipeId: "forge_sword" }, result: { items: [999] } }, u), false);
    assert.strictEqual(f.culture.recordJob({ id: 2, state: "done", type: "build", target: f.target(u), params: { objectId: "wall_stone" } }, u), false);
    assert.deepStrictEqual(plain(f.culture.ensureFaction(1).knowledge), {});
});
check("reject_failed_or_foreign_worker", () => {
    const f = fixture(), u = f.person(), j = f.craft(1, u); j.state = "failed";
    assert.strictEqual(f.culture.recordJob(j, u), false); j.state = "done"; j.assigned = 44;
    assert.strictEqual(f.culture.recordJob(j, u), false);
});
check("confirmed_recipe_and_build_remembered_once", () => {
    const f = fixture(), u = f.person(), j = f.craft(1, u); f.ctx.UF.Events.emit("jobs:done", j, u);
    assert.strictEqual(f.culture.recordJob(j, u), false); assert.strictEqual(f.culture.recordJob(f.build(2, u), u), true);
    const record = f.culture.ensureFaction(1); assert(record.knowledge["recipe:forge_sword"]); assert(record.knowledge["building:wall_stone"]);
    assert.strictEqual(record.practices.smithing, 1); assert.strictEqual(record.practices.building, 1);
    assert.strictEqual(f.culture.professionFor(u), null);
    assert.strictEqual(f.culture.recordJob(j, u), false);
});
check("z_is_actor_scoped_and_wrong_level_refused", () => {
    const f = fixture(), u = f.person(1, 3, -2), j = f.build(1, u);
    assert(f.culture.recordJob(j, u)); const wrong = f.build(2, u); wrong.target.z = 0;
    assert.strictEqual(f.culture.recordJob(wrong, u), false);
});
check("actual_gather_yield_required", () => {
    const f = fixture(), u = f.person(), j = { id: 1, state: "done", type: "gather", params: {}, target: f.target(u), result: { yields: { fiber: 2 } } };
    assert.strictEqual(f.culture.recordJob(j, u), false);
    f.items.set(500, { id: 500, type: "fiber", count: 2, area: u.area, x: u.x, y: u.y, z: u.z, holder: null });
    assert(f.culture.recordJob(j, u));
});
check("same_species_factions_diverge", () => {
    const f = fixture(); f.factions.push({ id: 8, species: "human" }); const a = f.person(1), b = f.person(2, 8);
    f.culture.recordJob(f.craft(1, a), a); f.culture.recordJob(f.craft(2, b, "cook_meal"), b);
    assert.notDeepStrictEqual(plain(f.culture.describeFaction(1).practices), plain(f.culture.describeFaction(8).practices));
    assert(!f.culture.ensureFaction(8).knowledge["recipe:forge_sword"]);
});
check("human_observation_is_local_no_free_experience", () => {
    const f = fixture(), mentor = f.person(), pupil = f.person(2), below = f.person(3, 1, -1), minor = f.person(4); minor.data.age = 12; minor.data.stage = "child";
    const before = JSON.stringify(pupil.data.skills); f.culture.recordJob(f.craft(1, mentor), mentor);
    assert.strictEqual(f.culture.ensurePerson(pupil).exposure.smithing, 1);
    assert.strictEqual(f.culture.ensurePerson(below).exposure.smithing, undefined); assert.strictEqual(f.culture.ensurePerson(minor).exposure.smithing, undefined);
    assert.strictEqual(JSON.stringify(pupil.data.skills), before); assert.deepStrictEqual(plain(f.culture.ensurePerson(pupil).practices), {});
    const ranked = f.culture.rankCandidates(pupil, [candidate("craft", { recipeId: "cook_meal" }), candidate("craft", { recipeId: "forge_sword" })]);
    assert.strictEqual(ranked[0].spec.params.recipeId, "forge_sword"); assert(ranked[0].cultureReason);
});
check("elf_chooses_renewable_equivalent_source", () => {
    const f = fixture(), u = f.person(1, 2); f.place(u, 6, "plant"); f.place(u, 7, "tree");
    const input = [candidate("chop", {}, {}, 1, f.target(u, 7)), candidate("gather", {}, {}, 1, f.target(u, 6))], copy = JSON.stringify(input);
    const ranked = f.culture.rankCandidates(u, input); assert.strictEqual(ranked[0].spec.type, "gather"); assert(ranked[0].cultureReason); assert.strictEqual(JSON.stringify(input), copy);
});
check("dwarf_joins_same_site_project_not_other_level", () => {
    const f = fixture(), u = f.person(1, 3, -1), helper = f.person(2, 3, -1); f.jobs.push({ id: 1, state: "work", type: "build", assigned: helper.id, params: { plan: "house_2" } });
    const choices = [candidate("build", { objectId: "wall_stone", plan: "house_1" }, { id: "house_1" }), candidate("build", { objectId: "wall_stone", plan: "house_2" }, { id: "house_2" })];
    const ranked = f.culture.rankCandidates(u, choices); assert.strictEqual(ranked[0].step.id, "house_2"); assert(ranked[0].cultureReason);
    helper.z = 0; assert(f.culture.rankCandidates(u, choices).every(r => !r.cultureReason));
});
check("gnome_chooses_underpractised_trade", () => {
    const f = fixture(), u = f.person(1, 4); f.culture.recordJob(f.craft(1, u), u);
    const ranked = f.culture.rankCandidates(u, [candidate("craft", { recipeId: "forge_sword" }), candidate("craft", { recipeId: "cook_meal" })]);
    assert.strictEqual(ranked[0].spec.params.recipeId, "cook_meal"); assert(ranked[0].cultureReason);
});
check("goblin_reuses_existing_matching_product", () => {
    const f = fixture(), u = f.person(1, 5); f.items.set(8, { id: 8, type: "sword", count: 1 });
    const ranked = f.culture.rankCandidates(u, [candidate("craft", { recipeId: "forge_sword" }), candidate("fetch", { itemId: 8 })]);
    assert.strictEqual(ranked[0].spec.type, "fetch"); assert(ranked[0].cultureReason);
    f.items.get(8).type = "fiber"; assert(f.culture.rankCandidates(u, [candidate("craft", { recipeId: "forge_sword" }), candidate("fetch", { itemId: 8 })]).every(r => !r.cultureReason));
});
check("orc_equipment_precedes_only_optional_furnishing", () => {
    const f = fixture(), u = f.person(1, 6); const input = [candidate("build", { objectId: "bed" }, { optional: true }), candidate("craft", { recipeId: "forge_sword" })];
    const ranked = f.culture.rankCandidates(u, input); assert.strictEqual(ranked[0].spec.type, "craft"); assert(ranked[0].cultureReason);
    input[0].step.optional = false; assert(f.culture.rankCandidates(u, input).every(r => !r.cultureReason));
});
check("automaton_finishes_then_rotates_batch", () => {
    const f = fixture(), u = f.person(1, 7); const choices = [candidate("craft", { recipeId: "cook_meal" }), candidate("craft", { recipeId: "forge_sword" })];
    f.culture.recordJob(f.craft(1, u), u); assert.strictEqual(f.culture.rankCandidates(u, choices)[0].spec.params.recipeId, "forge_sword");
    f.culture.recordJob(f.craft(2, u), u); f.culture.recordJob(f.craft(3, u), u);
    assert.strictEqual(f.culture.rankCandidates(u, choices)[0].spec.params.recipeId, "cook_meal");
});
check("inheritance_influences_not_clones_or_skills", () => {
    const a = fixture(), mom = a.person(1), dad = a.person(2), child = a.person(3); child.data.age = 0; child.data.stage = "baby";
    for (const parent of [mom, dad]) a.culture.ensurePerson(parent).preferences.smithing = 100;
    const before = JSON.stringify(child.data.skills); const result = a.culture.inherit(child, mom, dad);
    const b = fixture(), bm = b.person(1), bd = b.person(2), bc = b.person(3); b.culture.ensurePerson(bm).preferences.smithing = 0; b.culture.ensurePerson(bd).preferences.smithing = 0;
    const other = b.culture.inherit(bc, bm, bd);
    assert(result.preferences.smithing - other.preferences.smithing >= 50);
    assert(result.preferences.smithing < 100); assert.strictEqual(JSON.stringify(child.data.skills), before); assert.strictEqual(result.generation, 1); assert.deepStrictEqual(plain(result.parents), [1, 2]);
    const once = JSON.stringify(result); a.ctx.UF.Events.emit("colonists:born", child, mom, dad); assert.strictEqual(JSON.stringify(result), once);
});
check("household_practice_influences_child", () => {
    const a = fixture(), mom = a.person(1), child = a.person(2); for (let i = 1; i <= 4; i++) a.culture.recordJob(a.craft(i, mom), mom);
    const p = a.culture.inherit(child, mom, null);
    const b = fixture(), bm = b.person(1), bc = b.person(2); b.culture.ensurePerson(bm).preferences.smithing = a.culture.ensurePerson(mom).preferences.smithing;
    const q = b.culture.inherit(bc, bm, null); assert(p.preferences.smithing > q.preferences.smithing);
});
check("knowledge_survives_death_and_save_generations", () => {
    const f = fixture(), mom = f.person(), child = f.person(2); f.culture.recordJob(f.craft(1, mom), mom); f.culture.inherit(child, mom, null);
    mom.data.dead = true; f.ctx.UF.Events.emit("world:unitRemoved", mom); delete f.world.state.units[mom.id];
    f.culture.initialize(); const saved = JSON.stringify(f.world.state); f.world.state = JSON.parse(saved); f.culture.initialize();
    assert(f.culture.ensureFaction(1).knowledge["recipe:forge_sword"]); assert(f.culture.state().people[1].deceased);
    assert.strictEqual(f.culture.ensurePerson(f.world.unit(2)).generation, 1); assert.strictEqual(JSON.stringify(f.world.state), saved);
    const grandchild = f.person(3); assert.strictEqual(f.culture.inherit(grandchild, f.world.unit(2), null).generation, 2);
});
check("bounded_watermark_and_safe_priorities", () => {
    const f = fixture(), u = f.person(); for (let id = 1; id <= 120; id++) f.culture.recordJob(f.craft(id, u), u);
    assert.strictEqual(f.culture.ensurePerson(u).lastJob, 120); assert.strictEqual(Object.keys(f.culture.ensureFaction(1).knowledge).length, 1);
    assert.strictEqual(f.culture.professionFor(u), "smithing"); assert.strictEqual(f.culture.describeFaction(1).professions.smithing, 1);
    for (const domain of f.culture.DOMAINS) { const n = f.culture.priorityFor(u, domain === "smithing" ? { type: "craft", params: { recipeId: "forge_sword" } } : "build"); assert(n >= 0.8 && n <= 1.28); }
    assert.strictEqual(f.culture.priorityFor(u, "drink"), 1);
});
// Agriculture's physical plot/receipt validation is its own system's test contract.
// These doubles prove CultureGrowth calls that authority, rejects false/missing proof,
// and never substitutes a planner's claimed success or awards duplicate skill XP.
check("farming_domains_and_old_tastes_migrate_additively", () => {
    const f = fixture(), u = f.person(), p = f.culture.ensurePerson(u);
    for (const d of f.culture.DOMAINS) assert(Number.isFinite(p.preferences[d]));
    delete p.preferences.farming; p.preferences.smithing = 0; p.preferences.cooking = 99; p.preferences.TEST_oldTaste = 17;
    p.inherited = true; p.practices.smithing = 4;
    const old = plain(p.preferences), skills = JSON.stringify(u.data.skills);
    f.culture.ensurePerson(u);
    for (const [k, v] of Object.entries(old)) assert.strictEqual(p.preferences[k], v, `preserve ${k}`);
    assert(Number.isFinite(p.preferences.farming)); assert.strictEqual(p.inherited, true); assert.strictEqual(p.practices.smithing, 4);
    const saved = JSON.stringify(p); f.culture.ensurePerson(u); assert.strictEqual(JSON.stringify(p), saved);
    assert.strictEqual(JSON.stringify(u.data.skills), skills);
    for (const type of ["farm_till", "farm_plant", "farm_tend", "farm_harvest"]) assert.strictEqual(f.culture.domainOf(type), "farming");
    assert.strictEqual(f.culture.domainOf("farm_imagined"), null);
});
check("farming_requires_owning_system_physical_confirmation", () => {
    const f = fixture(), u = f.person(1, 3, -1), job = { id: 1, type: "farm_harvest", state: "done", assigned: u.id, target: f.target(u), result: { harvests: 99 } };
    assert.strictEqual(f.culture.recordJob(job, u), false, "no agriculture API");
    f.ctx.UF.Agriculture = { confirmedJob: () => false };
    assert.strictEqual(f.culture.recordJob(job, u), false, "authority refuses imaginary result");
    f.ctx.UF.Agriculture.confirmedJob = () => ({ ok: true });
    assert.strictEqual(f.culture.recordJob(job, u), false, "strict boolean contract");
    f.ctx.UF.Agriculture.confirmedJob = () => true;
    job.state = "failed"; assert.strictEqual(f.culture.recordJob(job, u), false);
    job.state = "done"; job.assigned = 200; assert.strictEqual(f.culture.recordJob(job, u), false);
    job.assigned = u.id; job.target.z = 0; assert.strictEqual(f.culture.recordJob(job, u), false);
    assert.strictEqual(f.culture.ensureFaction(u).practices.farming, undefined);
});
check("confirmed_farm_actions_train_culture_once_not_skills", () => {
    const f = fixture(), u = f.person(1, 3, -2), proof = new Map();
    f.ctx.UF.Skills = { add: () => { throw new Error("Culture must not award XP"); } };
    f.ctx.UF.Agriculture = { confirmedJob: (job, worker) => proof.get(job.id) === worker.id };
    const before = JSON.stringify(u.data.skills), types = ["farm_till", "farm_plant", "farm_tend", "farm_harvest"];
    types.forEach((type, i) => {
        const job = { id: i + 1, type, state: "done", assigned: u.id, target: f.target(u), params: { plotId: "TEST_Plot" } };
        proof.set(job.id, u.id); f.ctx.UF.Events.emit("jobs:done", job, u);
        assert.strictEqual(f.culture.recordJob(job, u), false, "duplicate completion ignored");
    });
    const p = f.culture.ensurePerson(u), faction = f.culture.ensureFaction(u);
    assert.strictEqual(p.practices.farming, 4); assert.strictEqual(faction.practices.farming, 4);
    assert.strictEqual(f.culture.state().households["3:3"].practices.farming, 4);
    assert(faction.knowledge["work:farming"]); assert.strictEqual(Object.keys(faction.knowledge).length, 1);
    assert.strictEqual(f.culture.professionFor(u), "farming"); assert.strictEqual(JSON.stringify(u.data.skills), before);
});
check("farming_taste_inherited_without_skills", () => {
    const f = fixture(), mother = f.person(), father = f.person(2), child = f.person(3);
    for (const u of [mother, father]) f.culture.ensurePerson(u).preferences.farming = 100;
    const savedSkills = JSON.stringify(child.data.skills), high = f.culture.inherit(child, mother, father).preferences.farming;
    const g = fixture(), m = g.person(), d = g.person(2), c = g.person(3);
    for (const u of [m, d]) g.culture.ensurePerson(u).preferences.farming = 0;
    const low = g.culture.inherit(c, m, d).preferences.farming;
    assert(high - low >= 50); assert(high < 100); assert.strictEqual(JSON.stringify(child.data.skills), savedSkills);
});
check("human_farming_observation_changes_feasible_choice", () => {
    const f = fixture(), mentor = f.person(), pupil = f.person(2);
    f.ctx.UF.Agriculture = { confirmedJob: () => true };
    const p = f.culture.ensurePerson(pupil); for (const d of f.culture.DOMAINS) p.preferences[d] = 50;
    f.culture.recordJob({ id: 1, type: "farm_tend", state: "done", assigned: mentor.id, target: f.target(mentor) }, mentor);
    const ranked = f.culture.rankCandidates(pupil, [candidate("craft", { recipeId: "cook_meal" }), candidate("farm_tend")]);
    assert.strictEqual(p.exposure.farming, 1); assert.strictEqual(p.practices.farming, undefined);
    assert.strictEqual(ranked[0].spec.type, "farm_tend"); assert(ranked[0].cultureReason);
});
console.log(`RESULT: ${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0;
