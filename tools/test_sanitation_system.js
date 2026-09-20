"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const sanitationSource = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_Sanitation.js"), "utf8");
const pillarsSource = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_SettlementPillars.js"), "utf8");
const colonistsSource = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_Colonists.js"), "utf8");

let passed = 0;
let failed = 0;

function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`PASS sanitation.${name}`);
    } catch (e) {
        failed++;
        console.error(`FAIL sanitation.${name}: ${e.message}`);
    }
}

function createFixture(opts = {}) {
    const units = [];
    const items = [];
    const objects = [];
    const jobs = [];
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

    const listeners = new Map();
    const Events = {
        on: (ev, fn) => {
            if (!listeners.has(ev)) listeners.set(ev, []);
            listeners.get(ev).push(fn);
        },
        off: (ev, fn) => {
            if (!listeners.has(ev)) return;
            listeners.set(ev, listeners.get(ev).filter(x => x !== fn));
        },
        emit: (ev, ...args) => {
            const list = (listeners.get(ev) || []).slice();
            for (const fn of list) {
                try { fn(...args); } catch (e) { console.error(e); }
            }
        }
    };

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
        $ufTime: { hour: opts.hour !== undefined ? opts.hour : 12 },
        $ufWorldCatalog: {
            colony: {
                facets: ["industriousness", "curiosity", "natureAffinity", "bravery", "tidiness", "sociability", "patience"],
                skills: ["woodcutting", "stonework", "building", "hauling", "hunting", "crafting"],
                plan: [],
                thresholds: { hunger: 55, thirst: 55, sleep: 75, social: 40, nature: 35, waste: 65 },
                needs: {}
            },
            cultures: {
                human: { priorities: { build: 1, craft: 1, stock: 1, hunt: 1 }, wall: "wall_wood", door: "door_wood" }
            },
            sites: { kinds: { camp: { center: "campfire" } } },
            objects: [
                { id: "wall_wood", name: "Wooden Wall", tags: ["building", "wall"], passable: false },
                { id: "door_wood", name: "Wooden Door", tags: ["building", "door"], passable: false },
                { id: "campfire", name: "Campfire", tags: ["building", "hearth"], passable: true },
                { id: "well", name: "Well", tags: ["building", "workplace", "water", "well"], passable: false },
                { id: "stockpile", name: "Stockpile", tags: ["stockpile"], passable: true }
            ],
            items: {
                types: [
                    { id: "water", name: "Water", food: { thirst: 50 } },
                    { id: "meat_cooked", name: "Cooked Meat", food: { hunger: 40, thirst: 10 } },
                    { id: "berries", name: "Berries", food: { hunger: 20, thirst: 15 } },
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
            u.area = u.area || { x: 0, y: 0 };
            u.z = u.z !== undefined ? u.z : 0;
            units.push(u);
            return u;
        },
        hash32: (...args) => {
            let h = 2166136261;
            for (const n of args) h = Math.imul(h ^ (n | 0), 16777619);
            return h >>> 0;
        },
        state: { colony }
    };

    const Jobs = {
        _jobs: jobs,
        isWaterAt: (area, x, y) => opts.waterAt ? opts.waterAt(x, y) : false,
        standable: () => true,
        handler: () => ({ apply: () => {}, work: () => {} }),
        define: () => {},
        list: () => jobs,
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
        drop: (area, x, y, type, count = 1) => {
            const it = { id: nextId++, type, x, y, count, holder: null, area };
            items.push(it);
            return it;
        },
        add: it => {
            it.id = it.id || nextId++;
            items.push(it);
            return it;
        }
    };

    ctx.UF = {
        World,
        Jobs,
        Objects: ObjectsAPI,
        Items: ItemsAPI,
        Households: { all: () => opts.households || [] },
        Events,
        FireSafety: { safe: () => true }
    };

    vm.createContext(ctx);
    vm.runInContext(sanitationSource, ctx);
    vm.runInContext(pillarsSource, ctx);
    vm.runInContext(colonistsSource, ctx);

    // Boot scene to hook event listeners
    new ctx.Scene_Boot().start();

    return { ctx, colony, units, items, objects, jobs, World, Jobs, ObjectsAPI, ItemsAPI };
}

// 1. Catalog injection
check("catalog_injection", () => {
    const f = createFixture();
    const cat = f.ctx.$ufWorldCatalog;

    const latrine = cat.objects.find(o => o.id === "latrine_pit");
    assert(latrine, "latrine_pit object must be injected");
    assert.strictEqual(latrine.capacity, 10, "latrine_pit capacity must be 10");
    assert(latrine.tags.includes("sanitation"), "latrine_pit must have sanitation tag");

    const outhouse = cat.objects.find(o => o.id === "outhouse");
    assert(outhouse, "outhouse object must be injected");
    assert.strictEqual(outhouse.capacity, 25, "outhouse capacity must be 25");

    const nightSoil = cat.items.types.find(t => t.id === "night_soil");
    assert(nightSoil, "night_soil item must be injected");
    assert(nightSoil.tags.includes("waste"), "night_soil must have waste tag");
});

// 2. Waste need ticking and build up from food/drink
check("waste_need_progression", () => {
    const f = createFixture();
    const C = f.ctx.UF.Colonists;
    const u = f.World.addUnit({
        name: "Test Colonist",
        x: 20, y: 20,
        data: {
            kind: "colonist",
            faction: "player",
            site: 1,
            needs: { hunger: 50, thirst: 50, sleep: 20, social: 20, nature: 20, waste: 10 },
            thoughts: []
        }
    });

    // Natural tick
    C.tickNeeds();
    assert.strictEqual(u.data.needs.waste, 10.25, "Waste must increase by 0.25 per tick");

    // Eating food increases waste by +20 onDone
    f.ctx.UF.Events.emit("jobs:done", { type: "eat", target: { x: 20, y: 20 }, params: { itemType: "meat_cooked" } }, u);
    assert.strictEqual(u.data.needs.waste, 30.25, "Eating must add +20 to waste");

    // Drinking water increases waste by +15 onDone
    f.ctx.UF.Events.emit("jobs:done", { type: "drink", target: { x: 20, y: 20 }, params: {} }, u);
    assert.strictEqual(u.data.needs.waste, 45.25, "Drinking must add +15 to waste");
});

// 3. Relieving at a latrine resets waste and adds positive thought
check("relieve_at_latrine", () => {
    const f = createFixture();
    const S = f.ctx.UF.Sanitation;
    const C = f.ctx.UF.Colonists;

    // Place a latrine pit at (22, 20)
    f.ObjectsAPI.add({ id: "latrine_pit", x: 22, y: 20 });

    const u = f.World.addUnit({
        name: "Test Colonist",
        x: 20, y: 20,
        data: {
            kind: "colonist",
            faction: "player",
            site: 1,
            needs: { hunger: 20, thirst: 20, sleep: 20, social: 20, nature: 20, waste: 70 },
            thoughts: []
        }
    });

    const job = C._internal.needJob(u);
    assert(job, "Should return a job when waste >= 65");
    assert.strictEqual(job.type, "move", "Should generate a move job to latrine");
    assert.strictEqual(job.params.relieve, true, "Job params must have relieve: true");
    assert.strictEqual(job.params.latrineX, 22, "Target must be the latrine position");

    // Complete the job
    u.x = 22; u.y = 20;
    f.ctx.UF.Events.emit("jobs:done", job, u);

    assert.strictEqual(u.data.needs.waste, 0, "Waste must be reset to 0");
    const latData = S.getLatrineData({ x: 0, y: 0, z: 0 }, 22, 20, "latrine_pit");
    assert.strictEqual(latData.uses, 1, "Latrine uses must increment to 1");
    assert(u.data.thoughts.some(t => t.text.includes("proper latrine")), "Must gain positive latrine thought");
});

// 4. Latrine capacity fill and night soil generation
check("latrine_fill_and_night_soil", () => {
    const f = createFixture();
    const S = f.ctx.UF.Sanitation;

    f.ObjectsAPI.add({ id: "latrine_pit", x: 22, y: 20 });
    const latData = S.getLatrineData({ x: 0, y: 0, z: 0 }, 22, 20, "latrine_pit");
    latData.uses = 9; // Capacity is 10

    const u = f.World.addUnit({
        name: "Reliever",
        x: 22, y: 20,
        data: {
            kind: "colonist",
            faction: "player",
            site: 1,
            needs: { waste: 80 },
            thoughts: []
        }
    });

    S.onRelieved(u, { relieve: true, latrineX: 22, latrineY: 20, latrineId: "latrine_pit" });
    assert.strictEqual(latData.uses, 10, "Latrine uses should reach capacity 10");
    assert.strictEqual(latData.full, true, "Latrine must be marked full");

    const droppedSoil = f.items.find(it => it.type === "night_soil" && it.x === 22 && it.y === 20);
    assert(droppedSoil, "Night soil must be dropped when latrine becomes full");
});

// 5. Desperate relief in the open when no latrines exist
check("desperate_accident_without_latrine", () => {
    const f = createFixture();
    const C = f.ctx.UF.Colonists;

    // No latrines placed!
    const u = f.World.addUnit({
        name: "Desperate Colonist",
        x: 20, y: 20,
        data: {
            kind: "colonist",
            faction: "player",
            site: 1,
            needs: { hunger: 20, thirst: 20, sleep: 20, social: 20, nature: 20, waste: 90 },
            thoughts: []
        }
    });

    const job = C._internal.needJob(u);
    assert(job, "Should return desperate relief job");
    assert.strictEqual(job.params.relieveOpen, true, "Must be relieveOpen");
    assert.strictEqual(job.params.desperate, true, "Must be marked desperate");

    // Complete job
    f.ctx.UF.Events.emit("jobs:done", job, u);
    assert.strictEqual(u.data.needs.waste, 0, "Waste must reset");
    assert(u.data.thoughts.some(t => t.text.includes("unsanitary accident")), "Must gain negative accident thought");

    const droppedSoil = f.items.find(it => it.type === "night_soil" && it.x === u.x && it.y === u.y);
    assert(droppedSoil, "Night soil must be dropped in the dirt");
});

// 6. Water contamination detection
check("water_contamination_detection", () => {
    const f = createFixture();
    const S = f.ctx.UF.Sanitation;

    // Place a well at (20, 20)
    const wellPos = { x: 20, y: 20 };
    assert.strictEqual(S.isWaterContaminated({ x: 0, y: 0, z: 0 }, wellPos.x, wellPos.y), false, "Clean well should not be contaminated");

    // Drop night soil at (23, 20) (distance 3 < 6)
    f.ItemsAPI.drop({ x: 0, y: 0, z: 0 }, 23, 20, "night_soil", 1);
    assert.strictEqual(S.isWaterContaminated({ x: 0, y: 0, z: 0 }, wellPos.x, wellPos.y), true, "Well within 6 cells of night soil must be contaminated");

    // Far away water source at (50, 50)
    assert.strictEqual(S.isWaterContaminated({ x: 0, y: 0, z: 0 }, 50, 50), false, "Water source 30 cells away must not be contaminated");
});

// 7. Drinking contaminated water causes dysentery
check("drinking_contaminated_water_infects", () => {
    const f = createFixture();
    const S = f.ctx.UF.Sanitation;

    // Drop waste near water at (21, 20)
    f.ItemsAPI.drop({ x: 0, y: 0, z: 0 }, 21, 20, "night_soil", 1);

    const u = f.World.addUnit({
        name: "Thirsty Colonist",
        x: 20, y: 20,
        data: {
            kind: "colonist",
            faction: "player",
            site: 1,
            needs: { hunger: 20, thirst: 80, sleep: 20, social: 20, nature: 20, waste: 10 },
            thoughts: []
        }
    });

    // Complete drink job at (20, 20) near the waste
    f.ctx.UF.Events.emit("jobs:done", { type: "drink", target: { x: 20, y: 20 }, params: {} }, u);

    assert(u.data.illness, "Colonist must contract illness from contaminated water");
    assert.strictEqual(u.data.illness.type, "dysentery", "Illness must be dysentery");
    assert(u.data.thoughts.some(t => t.text.includes("violently ill")), "Must have sick thought");
    assert.strictEqual(S.isSick(u), true, "isSick(u) must be true");
});

// 8. Medical treatment cures sickness
check("medical_treatment_cures_patient", () => {
    const f = createFixture();
    const S = f.ctx.UF.Sanitation;

    const patient = f.World.addUnit({
        name: "Sick Patient",
        x: 20, y: 20,
        data: {
            kind: "colonist",
            faction: "player",
            site: 1,
            illness: { type: "dysentery", severity: 1.0 },
            needs: { hunger: 20, thirst: 20, sleep: 20, social: 20, nature: 20, waste: 20 },
            thoughts: []
        }
    });

    const healer = f.World.addUnit({
        name: "Healer Alistair",
        x: 21, y: 20,
        data: {
            kind: "colonist",
            faction: "player",
            site: 1,
            capabilities: ["medicine"],
            needs: { hunger: 20, thirst: 20, sleep: 20, social: 20, nature: 20, waste: 20 },
            thoughts: []
        }
    });

    const treatJob = S.treatSickJob(healer);
    assert(treatJob, "Healer must find treatment job for sick patient");
    assert.strictEqual(treatJob.params.patientId, patient.id, "Job must target sick patient");

    // Complete treatment
    f.ctx.UF.Events.emit("jobs:done", treatJob, healer);
    assert.strictEqual(patient.data.illness, undefined, "Patient illness must be cured");
    assert(patient.data.thoughts.some(t => t.text.includes("Recovered from sickness")), "Patient gets recovery thought");
    assert(healer.data.thoughts.some(t => t.text.includes("healing remedies")), "Healer gets treatment thought");
});

// 9. Sanitation worker hauls uncontained waste to distant waste pit
check("sanitation_worker_hauls_waste", () => {
    const f = createFixture();
    const S = f.ctx.UF.Sanitation;

    // Set up a waste pit stockpile at (30, 30) (14 cells away from site center 20, 20)
    f.colony.stockpiles.push({ x: 30, y: 30, stores: ["waste"] });

    // Drop uncontained night soil at (21, 20)
    const soil = f.ItemsAPI.drop({ x: 0, y: 0, z: 0 }, 21, 20, "night_soil", 1);

    const worker = f.World.addUnit({
        name: "Sanitation Worker",
        x: 20, y: 20,
        data: {
            kind: "colonist",
            faction: "player",
            site: 1,
            capabilities: ["sanitation"],
            needs: { hunger: 20, thirst: 20, sleep: 20, social: 20, nature: 20, waste: 20 },
            thoughts: []
        }
    });

    const cleanJob = S.cleanWasteJob(worker);
    assert(cleanJob, "Worker must receive clean waste job");
    assert.strictEqual(cleanJob.type, "haul", "Job must be a haul job");
    assert.strictEqual(cleanJob.params.itemId, soil.id, "Target item must be the night soil");
    assert.strictEqual(cleanJob.params.to.x, 30, "Destination must be the waste pit stockpile");
    assert.strictEqual(cleanJob.params.sanitation, true, "Must have sanitation flag");

    // Complete haul job
    f.ctx.UF.Events.emit("jobs:done", cleanJob, worker);
    assert(worker.data.thoughts.some(t => t.text.includes("Disposed of foul waste")), "Must get disposal thought");
});

// 10. Settlement Pillars sanitation evaluation
check("settlement_pillars_sanitation_eval", () => {
    const f = createFixture();
    const P = f.ctx.UF.SettlementPillars;
    const S = f.ctx.UF.Sanitation;

    // No latrines, no waste pit
    let evalRes = S.evaluateSanitation(f.colony);
    assert(evalRes.score < 0.5, "Sanitation score must be low without latrines or waste separation");
    assert.strictEqual(evalRes.status, "critical", "Status should be critical");

    // Add 2 latrines and 1 distant waste pit
    f.ObjectsAPI.add({ id: "latrine_pit", x: 22, y: 20 });
    f.ObjectsAPI.add({ id: "outhouse", x: 20, y: 23 });
    f.colony.stockpiles.push({ x: 32, y: 32, stores: ["waste"] });

    evalRes = S.evaluateSanitation(f.colony);
    assert(evalRes.score >= 0.8, `Sanitation score should be secure with latrines and waste separation, got ${evalRes.score}`);

    // Integrate with full evaluatePillars
    const allPillars = P.evaluatePillars(f.colony);
    assert(allPillars.sanitation, "Pillars evaluation must include sanitation");
    assert.strictEqual(allPillars.sanitation.id, "sanitation", "Pillar ID must match");
});

// 11. Civic plan generates latrine and distant waste pit
check("civic_sanitation_plan_steps", () => {
    const f = createFixture({
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

    // Secure water (well)
    f.ObjectsAPI.add({ id: "well", x: 21, y: 20 });

    // Secure food (stocked meat)
    f.colony.stockpiles.push({ x: 22, y: 20, stores: ["food"] });
    f.ItemsAPI.drop({ x: 0, y: 0, z: 0 }, 22, 20, "meat_cooked", 20);

    // Secure shelter
    f.ObjectsAPI.add({ id: "wall_wood", x: 18, y: 18 });
    f.ObjectsAPI.add({ id: "door_wood", x: 18, y: 19 });
    f.ObjectsAPI.add({ id: "bed_wood", x: 19, y: 19 });
    f.ObjectsAPI.add({ id: "campfire", x: 20, y: 20 });

    const prio = P.priorityPillar(f.colony);
    assert.strictEqual(prio, "sanitation", "Priority pillar should now be sanitation");

    const steps = P.pillarPlanSteps(f.colony);
    const latrineStep = steps.find(s => s.id === "civic_latrine");
    assert(latrineStep, "Must generate civic_latrine step when sanitation is missing");
    assert.strictEqual(latrineStep.build, "latrine_pit", "Must build latrine_pit");

    const pitStep = steps.find(s => s.id === "sanitation_waste_pit");
    assert(pitStep, "Must generate sanitation_waste_pit step");
    assert(pitStep.stores.includes("waste"), "Pit must store waste");
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
