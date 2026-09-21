"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const pillarsSource = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_SettlementPillars.js"), "utf8");
const colonistsSource = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_Colonists.js"), "utf8");

let passed = 0;
let failed = 0;

function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`PASS settlement_pillars.${name}`);
    } catch (e) {
        failed++;
        console.error(`FAIL settlement_pillars.${name}: ${e.message}`);
    }
}

function createFixture(opts = {}) {
    const units = [];
    const items = [];
    const objects = [];
    const jobs = [];
    let frame = 100;
    let nextId = 1;

    const colony = {
        version: 2,
        factionId: "player",
        siteId: 1,
        site: { x: 20, y: 20 },
        area: { x: 0, y: 0 },
        z: 0,
        radius: 8,
        plan: [],
        stockpiles: [],
        log: []
    };

    function Game_Map() {}
    Game_Map.prototype.update = function() {};
    function Scene_Boot() {}
    Scene_Boot.prototype.start = function() {};

    const ctx = {
        window: {},
        console,
        Math,
        Number,
        String,
        Object,
        Array,
        Set,
        Map,
        Infinity,
        Game_Map,
        Scene_Boot,
        DataManager: { extractSaveContents: () => {} },
        $ufTime: { hour: opts.hour !== undefined ? opts.hour : 10 },
        $ufWorldCatalog: {
            colony: {
                facets: ["industriousness", "curiosity", "natureAffinity", "bravery", "tidiness", "sociability", "patience"],
                skills: ["woodcutting", "stonework", "building", "hauling", "hunting", "crafting"],
                plan: [],
                thresholds: { hunger: 55, thirst: 55, sleep: 75, social: 40, nature: 35 },
                needs: {}
            },
            cultures: {
                human: { priorities: { build: 1, craft: 1, stock: 1, hunt: 1 }, wall: "wall_wood", door: "door_wood" }
            },
            sites: { kinds: { camp: { center: "campfire" } } },
            objects: [
                { id: "wall_wood", name: "Wooden Wall", tags: ["building", "wall"], passable: false },
                { id: "door_wood", name: "Wooden Door", tags: ["building", "door"], passable: false },
                { id: "bed_wood", name: "Wooden Bed", tags: ["building", "bed"], passable: true },
                { id: "campfire", name: "Campfire", tags: ["building", "hearth"], passable: true },
                { id: "well", name: "Well", tags: ["building", "workplace", "water", "well"], passable: false },
                { id: "apothecary_bench", name: "Apothecary Bench", tags: ["building", "workplace", "herbalist", "apothecary"], passable: false, build: { items: { log: 2, stone: 1 }, work: 60 } },
                { id: "workbench", name: "Workbench", tags: ["building", "workplace"], passable: false },
                { id: "farm_plot", name: "Farm Plot", tags: ["plot"], passable: true }
            ],
            items: {
                types: [
                    { id: "meat_cooked", name: "Cooked Meat", food: { hunger: 40, thirst: 10 } },
                    { id: "berries", name: "Berries", food: { hunger: 20, thirst: 15 } },
                    { id: "split_firewood", name: "Split Firewood" },
                    { id: "stone", name: "Stone" },
                    { id: "wood", name: "Wood" }
                ]
            }
        }
    };
    ctx.window = ctx;

    const World = {
        _frame: 100,
        units: () => units,
        unit: id => units.find(u => u.id === id) || null,
        addUnit: u => {
            u.id = u.id || nextId++;
            units.push(u);
            return u;
        },
        state: { colony }
    };

    const Jobs = {
        _jobs: jobs,
        isWaterAt: (area, x, y) => opts.waterAt ? opts.waterAt(x, y) : false,
        standable: () => true,
        create: spec => {
            const j = { id: nextId++, state: "active", ...spec };
            jobs.push(j);
            return j;
        },
        cancel: (id, reason) => {
            const j = jobs.find(x => x.id === id);
            if (j) j.state = "cancelled";
        },
        of: uid => jobs.find(x => x.owner === uid && x.state === "active") || null
    };

    const ObjectsAPI = {
        types: () => ctx.$ufWorldCatalog.objects,
        type: id => ctx.$ufWorldCatalog.objects.find(o => o.id === id) || null,
        findIn: (area, filter) => {
            return objects.filter(o => {
                if (filter.id && o.id !== filter.id) return false;
                if (filter.near && filter.radius) {
                    const d = Math.hypot(o.x - filter.near.x, o.y - filter.near.y);
                    if (d > filter.radius) return false;
                }
                return true;
            });
        },
        atIn: (area, x, y) => objects.find(o => o.x === x && o.y === y) || null,
        add: obj => { objects.push(obj); return obj; }
    };

    const ItemsAPI = {
        get: id => items.find(it => it.id === id) || null,
        type: id => (ctx.$ufWorldCatalog.items.types.find(t => t.id === id) || null),
        find: filter => {
            return items.filter(it => {
                if (filter.id && it.type !== filter.id) return false;
                if (filter.near && filter.radius) {
                    const d = Math.hypot(it.x - filter.near.x, it.y - filter.near.y);
                    if (d > filter.radius) return false;
                }
                return true;
            });
        },
        inventoryOf: uid => items.filter(it => it.holder === uid),
        consume: (id, count) => {
            const it = items.find(x => x.id === id);
            if (it) {
                it.count = Math.max(0, it.count - count);
                return count;
            }
            return 0;
        },
        add: it => {
            it.id = it.id || nextId++;
            items.push(it);
            return it;
        }
    };

    const HouseholdsAPI = {
        all: () => opts.households || []
    };

    ctx.UF = {
        World,
        Jobs,
        Objects: ObjectsAPI,
        Items: ItemsAPI,
        Households: HouseholdsAPI,
        Events: { emit: () => {}, on: () => {}, off: () => {} },
        FireSafety: { safe: () => true }
    };

    vm.createContext(ctx);
    vm.runInContext(pillarsSource, ctx);
    vm.runInContext(colonistsSource, ctx);

    return { ctx, colony, units, items, objects, jobs, World, Jobs, ObjectsAPI, ItemsAPI };
}

// 1. Core Pillars Enum and Labels
check("pillars_structure", () => {
    const f = createFixture();
    const P = f.ctx.UF.SettlementPillars;
    assert.strictEqual(P.PILLARS.length, 10, "Must have exactly 10 pillars");
    const expected = ["water", "food", "shelter", "sanitation", "workshop", "medicine", "storage", "security", "governance", "community"];
    assert.deepStrictEqual([...P.PILLARS], expected, "Pillars must match exact evaluated sequence");
    for (const p of expected) {
        assert(P.PILLAR_LABELS[p], `Label must exist for pillar ${p}`);
    }
    assert.strictEqual(P.CAPABILITIES.length, 10, "Must have 10 core capabilities");
});

// 2. Water Pillar Evaluation & Well Priority
check("water_pillar_evaluation", () => {
    // Distant water (>30 cells), no well -> critical (score 0.2)
    const f1 = createFixture({ waterAt: (x, y) => x === 100 && y === 100 });
    const P = f1.ctx.UF.SettlementPillars;
    let evalRes = P.evaluatePillars(f1.colony);
    assert.strictEqual(evalRes.water.score, 0.2, "Score should be 0.2 without nearby water or well");
    assert.strictEqual(P.priorityPillar(f1.colony), "water", "Priority pillar must be water");

    // Natural water close by (within 15 cells) -> secure (score 1.0)
    const f2 = createFixture({ waterAt: (x, y) => x === 25 && y === 20 });
    const P2 = f2.ctx.UF.SettlementPillars;
    evalRes = P2.evaluatePillars(f2.colony);
    assert.strictEqual(evalRes.water.score, 1.0, "Score should be 1.0 with close water");

    // Well built at site -> secure (score 1.0)
    const f3 = createFixture({ waterAt: () => false });
    f3.ObjectsAPI.add({ id: "well", x: 21, y: 20 });
    const P3 = f3.ctx.UF.SettlementPillars;
    evalRes = P3.evaluatePillars(f3.colony);
    assert.strictEqual(evalRes.water.score, 1.0, "Score should be 1.0 with well built");
});

// 3. Sanitation Pillar Evaluation & Safe Waste Separation
check("sanitation_pillar_evaluation", () => {
    const f = createFixture({ waterAt: (x, y) => Math.hypot(x - 20, y - 20) <= 5 });
    const P = f.ctx.UF.SettlementPillars;
    
    // No waste pit -> score 0.3
    let evalRes = P.evaluatePillars(f.colony);
    assert.strictEqual(evalRes.sanitation.score, 0.3, "Sanitation without waste pit should be 0.3");

    // Waste pit placed too close (< 5 cells) -> score 0.6
    f.colony.stockpiles = [{ x: 21, y: 20, stores: ["waste", "bones"] }];
    evalRes = P.evaluatePillars(f.colony);
    assert.strictEqual(evalRes.sanitation.score, 0.6, "Waste pit too close should score 0.6");

    // Waste pit placed safely at distance (>= 5 cells, e.g. [-6, -6] = 14, 14) -> score 1.0
    f.colony.stockpiles = [{ x: 14, y: 14, stores: ["waste", "bones"] }];
    evalRes = P.evaluatePillars(f.colony);
    assert.strictEqual(evalRes.sanitation.score, 1.0, "Safely separated waste pit should score 1.0");
});

// 4. Shelter Pillar Evaluation
check("shelter_pillar_evaluation", () => {
    const f = createFixture({
        waterAt: (x, y) => Math.hypot(x - 20, y - 20) <= 5,
        households: [
            {
                faction: "player",
                area: { x: 0, y: 0 },
                z: 0,
                home: {
                    walls: [{ x: 18, y: 18 }, { x: 19, y: 18 }],
                    doors: [{ x: 18, y: 19 }],
                    beds: [{ x: 19, y: 19 }],
                    floors: [],
                    wall: "wall_wood",
                    door: "door_wood",
                    hearth: { x: 20, y: 20 }
                }
            }
        ]
    });
    const P = f.ctx.UF.SettlementPillars;
    let evalRes = P.evaluatePillars(f.colony);
    assert(evalRes.shelter.score < 0.5, "Unbuilt shelter should have low score");

    // Build the components
    f.ObjectsAPI.add({ id: "wall_wood", x: 18, y: 18 });
    f.ObjectsAPI.add({ id: "wall_wood", x: 19, y: 18 });
    f.ObjectsAPI.add({ id: "door_wood", x: 18, y: 19 });
    f.ObjectsAPI.add({ id: "bed_wood", x: 19, y: 19 });
    f.ObjectsAPI.add({ id: "campfire", x: 20, y: 20 });

    evalRes = P.evaluatePillars(f.colony);
    assert.strictEqual(evalRes.shelter.score, 1.0, "Complete shelter components should score 1.0");
});

// 5. Pillar Plan Step Generation
check("pillar_plan_steps", () => {
    const f = createFixture({
        waterAt: () => false,
        households: [
            {
                faction: "player",
                area: { x: 0, y: 0 },
                z: 0,
                home: {
                    walls: [{ x: 18, y: 18 }],
                    doors: [{ x: 18, y: 19 }],
                    beds: [{ x: 19, y: 19 }],
                    floors: [],
                    wall: "wall_wood",
                    door: "door_wood",
                    hearth: { x: 20, y: 20 }
                }
            }
        ]
    });
    const P = f.ctx.UF.SettlementPillars;
    
    // Priority is water: should generate civic well step
    let steps = P.pillarPlanSteps(f.colony);
    assert(steps.some(s => s.id === "civic_well" && s.build === "well"), "Should generate civic_well step when water is deficient");

    // Satisfy water by adding well
    f.ObjectsAPI.add({ id: "well", x: 21, y: 20 });
    // Satisfy food
    f.ItemsAPI.add({ type: "meat_cooked", count: 20, x: 20, y: 20, item: { type: "meat_cooked", count: 20 } });
    // Satisfy shelter
    f.ObjectsAPI.add({ id: "wall_wood", x: 18, y: 18 });
    f.ObjectsAPI.add({ id: "door_wood", x: 18, y: 19 });
    f.ObjectsAPI.add({ id: "bed_wood", x: 19, y: 19 });
    f.ObjectsAPI.add({ id: "campfire", x: 20, y: 20 });

    // Priority should advance to sanitation (no waste pit)
    assert.strictEqual(P.priorityPillar(f.colony), "sanitation", "Priority must advance to sanitation");
    steps = P.pillarPlanSteps(f.colony);
    assert(steps.some(s => s.id === "sanitation_waste_pit" && s.stores && s.stores.includes("waste")), "Should generate sanitation_waste_pit step");
});

// 6. Overlapping Skill Roster Assignment (2-3 skills per person)
check("assign_skill_roster", () => {
    const f = createFixture();
    const P = f.ctx.UF.SettlementPillars;
    
    const u1 = f.World.addUnit({
        name: "Colonist 1",
        area: { x: 0, y: 0 },
        z: 0,
        x: 20, y: 20,
        data: {
            kind: "colonist",
            site: 1,
            facets: { natureAffinity: 85, industriousness: 70, bravery: 30, tidiness: 40 }
        }
    });
    const u2 = f.World.addUnit({
        name: "Colonist 2",
        area: { x: 0, y: 0 },
        z: 0,
        x: 20, y: 20,
        data: {
            kind: "colonist",
            site: 1,
            facets: { bravery: 90, industriousness: 80, natureAffinity: 20, tidiness: 50 }
        }
    });

    P.assignSkillRoster(f.colony);

    assert(Array.isArray(u1.data.capabilities), "Colonist 1 must have capabilities array");
    assert.strictEqual(u1.data.capabilities.length, 3, "Colonist 1 must have 3 overlapping capabilities");
    assert(u1.data.capabilities.includes("farming"), "High nature affinity colonist should get farming");

    assert(Array.isArray(u2.data.capabilities), "Colonist 2 must have capabilities array");
    assert.strictEqual(u2.data.capabilities.length, 3, "Colonist 2 must have 3 overlapping capabilities");
    assert(u2.data.capabilities.includes("security") || u2.data.capabilities.includes("hunting"), "High bravery colonist should get security or hunting");
});

// 7. Status Summary Format
check("status_summary_format", () => {
    const f = createFixture({ waterAt: (x, y) => Math.hypot(x - 20, y - 20) <= 5 });
    const P = f.ctx.UF.SettlementPillars;
    const summary = P.statusSummary(f.colony);
    assert(typeof summary === "string", "Summary must be string");
    assert(summary.startsWith("Pillars: W:"), "Summary must begin with 'Pillars: W:'");
    assert(summary.includes("[Focus:"), "Summary must indicate active focus pillar");
});

// 8. Communal Meal Gathering at Meal Hours
check("communal_meal_job", () => {
    const f = createFixture({ hour: 12 }); // 12:00 lunch
    const P = f.ctx.UF.SettlementPillars;
    const u = f.World.addUnit({
        name: "Hungry Worker",
        area: { x: 0, y: 0 },
        z: 0,
        x: 22, y: 22,
        data: {
            kind: "colonist",
            site: 1,
            needs: { hunger: 45, thirst: 20, sleep: 10 },
            thoughts: []
        }
    });
    // Add food item at site
    const food = f.ItemsAPI.add({ type: "meat_cooked", count: 5, x: 20, y: 20, item: { id: 101, type: "meat_cooked", count: 5 } });
    food.item = { id: 101, type: "meat_cooked", count: 5 };

    const job = P.communalMealJob(u);
    assert(job, "Communal meal job must be created during meal hour with hunger >= 25");
    assert(job.params && job.params.communal === true, "Job params must flag communal: true");
    assert(u.data._lastCommunalMealHour === 12, "Must record attendance hour to prevent duplicate triggers");

    // Second call during same hour should return null
    const job2 = P.communalMealJob(u);
    assert.strictEqual(job2, null, "Should not repeat communal meal in same hour");
});

// 9. Night Watch / Sentry Patrol
check("night_watch_job", () => {
    const f = createFixture({ hour: 23 }); // 23:00 night
    const P = f.ctx.UF.SettlementPillars;
    const guard = f.World.addUnit({
        name: "Night Sentry",
        area: { x: 0, y: 0 },
        z: 0,
        x: 20, y: 20,
        data: {
            kind: "colonist",
            site: 1,
            capabilities: ["security", "carpentry", "farming"],
            needs: { sleep: 40, hunger: 20, thirst: 20 }
        }
    });

    const job = P.nightWatchJob(guard);
    assert(job, "Night watch sentry job must be generated for security colonist at night");
    assert.strictEqual(job.type, "move", "Sentry job type must be move");
    assert(job.params && job.params.sentry === true, "Job params must flag sentry: true");
});

// 10. Integration: StepObject fallback for well
check("well_step_object_fallback", () => {
    const f = createFixture();
    const C = f.ctx.UF.Colonists;
    const worker = f.World.addUnit({
        name: "Worker",
        area: { x: 0, y: 0 },
        z: 0,
        x: 20, y: 20,
        data: {
            kind: "colonist",
            faction: "player",
            site: 1
        }
    });
    const plan = C.effectivePlan(worker);
    assert(plan.some(s => s.id === "civic_well"), "Effective plan must include civic_well when water deficient");
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
