"use strict";
// Actual UF_Goals source with engine doubles. No rendering or F5 claim.
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert/strict");
const root = path.resolve(__dirname, "..");
let source = fs.readFileSync(path.join(root, "game/js/plugins/UF_Goals.js"), "utf8");
const mutant = process.argv.find(a => a.startsWith("--mutant="));
if (mutant && mutant.endsWith("=owner")) source = source.replace("c.step.goalOwner === u.id", "true");
if (mutant && mutant.endsWith("=physical")) source = source.replace("g.progress = inv.some(i => i.type === g.item && i.holder === u.id && i.count > 0) ? 1 : 0", "g.progress = 1");
if (mutant && mutant.endsWith("=backoff")) source = source.replace("if (f && f.retryAt > minute()) continue;", "if (false) continue;");
if (mutant && mutant.endsWith("=age")) source = source.replace("Number.isFinite(u.data.age) && u.data.age >= 18", "(u.data.age === undefined || u.data.age >= 18)");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "game/data/UF_WorldCatalog.json"), "utf8"));
let passed = 0, failed = 0;
function check(name, fn) { try { fn(); passed++; console.log(`PASS goals.${name}`); } catch (e) { failed++; console.error(`FAIL goals.${name}: ${e.message}`); } }
function harness() {
    const units = [], inventory = new Map(), activeJobs = new Map(), events = new Map(), homes = new Map();
    let bornId = 1;
    class Base { start() {} update() {} initialize() {} createAllWindows() {} }
    const context = { console, Scene_Boot: class extends Base {}, Scene_Map: class extends Base {}, Window_Base: class extends Base {},
        DataManager: { extractSaveContents() {} }, SceneManager: {}, Input: { keyMapper: {} },
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8, minute: 0 }, $ufWorldCatalog: catalog,
        UF: { World: { state: { seed: 424242 }, units: () => units, unit: id => units.find(u => u.id === id), hash32: (...v) => v.reduce((h, n) => { h = Math.imul(h ^ n, 16777619); h ^= h >>> 16; return h >>> 0; }, 2166136261) },
            Time: { paused: false, ticks: () => 0 },
            Jobs: { of: id => activeJobs.get(id), describe: j => `Doing ${j.type}` },
            Items: { inventoryOf: id => inventory.get(id) || [], type: id => catalog.items.types.find(t => t.id === id) },
            Skills: { level: (u, skill) => (u.data.actualLevels && u.data.actualLevels[skill]) || 1 },
            Colonists: { culture: u => catalog.cultures[u.data.species] },
            Households: { of: u => homes.get(u.id), describe: h => h },
            Wildlife: { speciesOf: u => catalog.wildlife.species.find(s => s.id === u.data.species) },
            Events: { on: (name, fn) => { if (!events.has(name)) events.set(name, []); events.get(name).push(fn); }, emit: (name, ...args) => { for (const fn of events.get(name) || []) fn(...args); } } } };
    context.window = context; vm.createContext(context); vm.runInContext(source, context); new context.Scene_Boot().start();
    function unit(data = {}, z = 0) { const u = { id: bornId++, name: "TEST_Person", area: { x: 0, y: 0 }, x: 12, y: 12, z, data: Object.assign({ kind: "person", species: "human", age: 25, stage: "adult", stats: { int: 10 }, facets: { sociability: 80, ambition: 70 }, needs: {} }, data) }; units.push(u); return u; }
    return { c: context, G: context.UF.Goals, units, unit, inventory, activeJobs, homes, emit: context.UF.Events.emit, time: context.$ufTime };
}
check("stable_seed_and_save", () => {
    const a = harness(), b = harness(), ua = a.unit(), ub = b.unit();
    assert.equal(JSON.stringify(a.G.ensure(ua)), JSON.stringify(b.G.ensure(ub)));
    const before = JSON.stringify(a.G.ensure(ua)); ua.data.lifeGoals = JSON.parse(before); assert.equal(JSON.stringify(a.G.ensure(ua)), before);
    ua.data.facets.bravery = 100; assert.equal(JSON.stringify(a.G.ensure(ua)), before, "personality change rerolled ambitions");
});
check("seeded_profession_variety", () => { const h = harness(), ids = new Set(); for (let i = 0; i < 100; i++) ids.add(h.G.ensure(h.unit()).profession.id); assert.ok(ids.size >= 5, `${ids.size} professions`); });
check("capability_and_children", () => {
    const h = harness(), low = h.unit({ stats: { int: 3 } }), high = h.unit({ stats: { int: 18 } }), child = h.unit({ age: 8, stage: "child" });
    assert.ok(h.G.capability(low).planningBudget < h.G.capability(high).planningBudget); assert.equal(h.G.planSteps(child).length, 0);
    child.data.age = 18; child.data.stage = "adult"; assert.ok(h.G.planSteps(child).length > 0);
});
check("unknown_age_no_manufacturing", () => {
    const h = harness();
    for (const age of [undefined, null, NaN, Infinity, "25", -1]) {
        const u = h.unit({ age, stage: "adult" });
        assert.equal(h.G.capability(u).mode, "developing", `age ${String(age)} accepted as adult`);
        assert.equal(h.G.planSteps(u).length, 0, `age ${String(age)} received manufacturing work`);
    }
    const u = h.unit({ age: 25, stage: "baby" });
    assert.equal(h.G.planSteps(u).length, 0, "inconsistent baby stage received manufacturing work");
});
check("animal_observation_no_control", () => {
    const h = harness(), wolf = h.unit({ kind: "creature", species: "wolf", ai: "wander", state: "hunt", targetPreyId: 91, home: { x: 9, y: 9 } }, -2);
    wolf.goal = { area: { x: 0, y: 0 }, x: 20, y: 20, z: -2 }; const before = JSON.stringify(wolf.goal), d = h.G.describe(wolf);
    assert.equal(d.mode, "instinctive_observation"); assert.equal(d.short.type, "hunt"); assert.match(d.limits, /Observational/); assert.equal(h.G.planSteps(wolf).length, 0); assert.equal(JSON.stringify(wolf.goal), before); assert.equal(wolf.data.ai, "wander");
});
check("owned_physical_equipment_only", () => {
    const h = harness(), u = h.unit(), s = h.G.refresh(u), g = s.medium.find(g => g.kind === "equipment");
    assert.equal(g.state, "active"); h.inventory.set(u.id, [{ id: 6, type: g.item, count: 1, holder: 999 }]); h.G.refresh(u); assert.equal(g.state, "active");
    h.inventory.set(u.id, [{ id: 6, type: g.item, count: 1, holder: u.id }]); h.G.refresh(u); assert.equal(g.state, "achieved");
    h.inventory.set(u.id, []); h.G.refresh(u); assert.equal(g.state, "achieved"); assert.equal(h.G.planSteps(u).length, 0); assert.equal(s.achievements.filter(a => a.id === g.id).length, 1);
});
check("real_skill_levels_not_legacy", () => {
    const h = harness(), u = h.unit({ skills: { crafting: 99, mining: 99, attack: 99 } }), s = h.G.refresh(u), g = s.long.find(g => g.kind === "profession");
    assert.equal(g.state, "active"); u.data.actualLevels = { [g.skill]: g.target }; h.G.refresh(u); assert.equal(g.state, "achieved");
});
check("home_physical_and_lineage_evidence", () => {
    const h = harness(), u = h.unit(), s = h.G.refresh(u), home = s.long.find(g => g.kind === "home"), family = s.long.find(g => g.kind === "parenthood");
    h.homes.set(u.id, { members: [u.id], home: { planned: true }, complete: false }); h.G.refresh(u); assert.equal(home.state, "active");
    u.data.pregnancy = { daysLeft: 1 }; h.time.day += 10; h.G.refresh(u); assert.equal(family.state, "active");
    h.homes.get(u.id).complete = true; h.G.refresh(u); assert.equal(home.state, "achieved");
    h.unit({ age: 0, stage: "baby", motherId: u.id }); h.emit("colonists:born", null, u, null); assert.equal(family.state, "achieved");
});
check("conversation_progress_level_scoped", () => {
    const h = harness(), a = h.unit({}, -1), b = h.unit({}, -2), s = h.G.refresh(a), g = s.medium.find(g => g.kind === "relationship");
    for (let i = 0; i < 3; i++) h.emit("jobs:done", { id: 100 + i, type: "talk", params: { unitId: b.id } }, a);
    assert.equal(g.progress, 0); b.z = -1;
    for (let i = 0; i < 3; i++) h.emit("jobs:done", { id: 200 + i, type: "talk", params: { unitId: b.id } }, a);
    assert.equal(g.state, "achieved"); assert.equal(h.G.refresh(b).medium.find(g => g.kind === "relationship").state, "achieved");
});
check("failure_backoff_and_order_exemption", () => {
    const h = harness(), u = h.unit(), step = h.G.planSteps(u)[0]; assert.ok(step && step.goalOwner === u.id);
    const j = { assigned: u.id, type: "craft", params: { plan: step.id }, reason: "needs materials" };
    h.emit("jobs:failed", j); assert.equal(h.G.planSteps(u).length, 0);
    h.time.minute += 5; assert.equal(h.G.planSteps(u).length, 1);
    j.reason = "ordered elsewhere"; h.emit("jobs:failed", j); assert.equal(h.G.planSteps(u).length, 1);
});
check("candidate_ownership_and_culture_score", () => {
    const h = harness(), u = h.unit(), candidates = [{ step: { id: "other", goalOwner: 999 }, spec: { type: "craft" }, order: 0, score: 100 }, { step: { id: "urgent_culture" }, spec: { type: "build" }, order: 1, score: 8 }, { step: { id: "own", goalOwner: u.id }, spec: { type: "craft" }, order: 2, score: 1 }];
    const before = JSON.stringify(candidates), result = h.G.choosePlan(u, candidates);
    assert.equal(result.length, 2); assert.equal(result[0].step.id, "urgent_culture"); assert.equal(JSON.stringify(candidates), before); assert.ok(result[0].score >= 8);
});
check("shared_minute_pause_and_all_layers", () => {
    const h = harness(), people = [-2, -1, 0, 1, 2].map(z => h.unit({}, z)); h.c.UF.Time.paused = true;
    h.emit("time:minute"); assert.ok(people.every(u => !u.data.lifeGoals)); h.c.UF.Time.paused = false; h.emit("time:minute");
    assert.ok(people.every(u => u.data.lifeGoals && u.data.lifeGoals.short));
    const p = people[0]; h.activeJobs.set(p.id, { id: 92, type: "drink" }); assert.equal(h.G.describe(p).short.jobId, 92);
});
check("paused_readout_cannot_invent_progress", () => {
    const h = harness(), u = h.unit(), s = h.G.refresh(u), record = JSON.stringify(s);
    h.c.UF.Time.paused = true;
    for (let i = 0; i < 60; i++) { h.emit("time:minute"); h.G.describe(u); }
    assert.equal(JSON.stringify(s), record, "repeated paused readout changed saved goal progress");
    assert.equal(s.achievements.length, 0, "paused readout invented an achievement");
    // A debugger/player action can change real inventory while paused. Reading
    // that new physical fact is allowed; the readout must not fabricate it.
    const g = s.medium.find(g => g.kind === "equipment");
    h.inventory.set(u.id, [{ id: 9001, type: g.item, count: 1, holder: u.id }]);
    h.G.describe(u); assert.equal(g.state, "achieved");
    assert.equal(s.achievements.length, 1);
    assert.ok(s.long.every(g => g.state === "active"), "physical tool acquisition also completed unrelated ambitions");
});
check("founders_wait_for_facets", () => {
    const h = harness(), u = h.unit(); delete u.data.facets; h.emit("world:unitAdded", u); assert.equal(u.data.lifeGoals, undefined);
    u.data.facets = { bravery: 100, sociability: 80 }; h.emit("colonists:ready"); assert.ok(u.data.lifeGoals);
});
console.log(`RESULT: ${passed} passed, ${failed} failed${mutant ? " (" + mutant + ")" : ""}`); process.exitCode = failed ? 1 : 0;
