// tools/test_material_recipes.js - Automated test suite for Material-Aware Recipes with Functional Roles & Output Inheritance
// Validates:
// 1. Functional role resolution in recipes (e.g. BUILDING_STONE, STRUCTURAL_TIMBER, CORDAGE, FLEXIBLE_BOW_WOOD, CUTTING_METAL).
// 2. Output items inherit material identity from primary input ingredient (e.g. Granite Stone Axe, Yew Bow, Iron Sword).
// 3. Crafter quality roll stamps output item.quality (q: 1..5).
// 4. Strategic material conservation during ingredient consumption.
// 5. Rule 4 compliance with --mutant mode.
"use strict";

const fs = require("fs");
const path = require("path");

const isMutant = process.argv.includes("--mutant");

// Mock global environment for RMMZ plugin loading
global.window = global;
const catalogData = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "game", "data", "UF_WorldCatalog.json"), "utf8"));
global.$ufWorldCatalog = catalogData;
global.$dataWorldCatalog = catalogData;
global.ImageManager = { loadCharacter: () => ({ isReady: () => true }), loadTileset: () => ({ isReady: () => true }) };
global.Sprite = function() {
    this.anchor = { set: () => {} };
    this.visible = true;
    this.bitmap = null;
    this.tint = 0xffffff;
};
global.Sprite.prototype = {};
global.Bitmap = function() {
    return { isReady: () => true, blt: () => {} };
};
global.Point = function(x, y) { this.x = x || 0; this.y = y || 0; };
global.Tilemap = { TILE_ID_A1: 2048, TILE_ID_A2: 2816, TILE_ID_A4: 4352 };
global.Scene_Boot = function() {};
global.Spriteset_Map = function() {};
global.DataManager = { onLoad: () => {}, _databaseFiles: [] };
global.Game_Map = function() {};
global.$gameMap = {
    tileWidth: () => 48,
    tileHeight: () => 48,
    adjustX: x => x,
    adjustY: y => y
};

let nextUnitId = 100;
const unitsById = {};
const worldState = {
    seed: 12345,
    items: { nextId: 1, byId: {} },
    jobs: { nextId: 1, list: [], byId: {}, log: [] }
};

const listeners = {};
global.UF = {
    Catalog: $dataWorldCatalog,
    Events: {
        on: (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); },
        emit: (ev, data) => { (listeners[ev] || []).forEach(fn => fn(data)); }
    },
    World: {
        state: worldState,
        inWorld: () => true,
        unit: (id) => unitsById[id] || null,
        units: () => Object.values(unitsById),
        currentArea: () => ({ x: 0, y: 0, z: 0 }),
        viewLevel: () => ({ x: 0, y: 0, z: 0 }),
        levelOfMapId: () => 0,
        eventOf: () => null,
        stopUnit: () => {},
        walkable: () => true
    },
    Objects: {
        findIn: (lv, filter) => {
            if (filter && filter.tags && (filter.tags.includes("bowyer") || filter.tags.includes("smithy"))) {
                return [{ x: 10, y: 10, type: { passable: true } }];
            }
            return [];
        }
    },
    Skills: {
        qualityRoll: (unit, skillOrRecipe) => {
            return (unit.data && unit.data.skillQuality) || 3;
        }
    },
    Ownership: {
        ownerOf: () => null,
        claim: () => {}
    }
};

function createMockUnit(name, x = 10, y = 10) {
    const id = nextUnitId++;
    const unit = {
        id,
        name,
        area: { x: 0, y: 0, z: 0 },
        x,
        y,
        z: 0,
        data: {
            inventory: [],
            equipment: { tool: null, clothes: null },
            skillQuality: 3
        }
    };
    unitsById[id] = unit;
    return unit;
}

// Load plugins
require(path.resolve(__dirname, "..", "game", "js", "plugins", "UF_Items.js"));
require(path.resolve(__dirname, "..", "game", "js", "plugins", "UF_Jobs.js"));

const I = UF.Items;
const J = UF.Jobs;
const craftHandler = J.handler("craft");

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  PASS: ${message}`);
        testsPassed++;
    } else {
        console.error(`  FAIL: ${message}`);
        testsFailed++;
    }
}

console.log(`\n--- Running Material-Aware Recipes & Inheritance Suite ${isMutant ? "(MUTANT MODE)" : ""} ---`);

// Test 1: Recipe Functional Role Matching in Plan
console.log("\nTest 1: Recipe Functional Role Matching in Plan");
{
    const crafter = createMockUnit("Thalric");
    
    // stone_axe requires: stone (BUILDING_STONE), log (STRUCTURAL_TIMBER), fiber (CORDAGE)
    // Crafter initially has nothing -> plan should fail with "needs stone"
    const jobEmpty = { type: "craft", params: { recipeId: "stone_axe" }, owner: crafter.id };
    const planEmpty = craftHandler.plan(jobEmpty, crafter);
    assert(!planEmpty.ok && planEmpty.reason.includes("needs stone"), "Empty crafter cannot plan stone axe (needs stone)");

    // Crafter receives Granite stone (matches BUILDING_STONE)
    I.give("stone", 2, crafter.id, { mat: "stones:granite" });
    const planNeedLog = craftHandler.plan(jobEmpty, crafter);
    assert(!planNeedLog.ok && planNeedLog.reason.includes("needs log"), "Crafter with granite stone still needs log");

    // Crafter receives Pine log (matches STRUCTURAL_TIMBER)
    I.give("log", 1, crafter.id, { mat: "woods:pine" });
    const planNeedFiber = craftHandler.plan(jobEmpty, crafter);
    assert(!planNeedFiber.ok && planNeedFiber.reason.includes("fiber"), "Crafter with stone and log still needs fiber");

    // Crafter receives fiber (matches CORDAGE)
    I.give("fiber", 1, crafter.id);
    const planReady = craftHandler.plan(jobEmpty, crafter);
    assert(planReady.ok && planReady.stand === null, "Crafter with all valid functional materials plans successfully");
}

// Test 2: Output Item Material Inheritance (Granite Stone Axe)
console.log("\nTest 2: Output Item Material Inheritance (Granite Stone Axe)");
{
    const crafter = createMockUnit("Boran");
    crafter.data.skillQuality = 4; // Masterwork roll

    // Give 2 Granite stones, 1 Oak log, 1 Fiber
    I.give("stone", 2, crafter.id, { mat: "stones:granite" });
    I.give("log", 1, crafter.id, { mat: "woods:oak" });
    I.give("fiber", 1, crafter.id);

    const job = { type: "craft", params: { recipeId: "stone_axe" }, owner: crafter.id };
    assert(craftHandler.plan(job, crafter).ok, "Plan succeeds for Granite Axe");

    // Apply crafting job
    craftHandler.apply(job, crafter);

    assert(job.result && job.result.items && job.result.items.length === 1, "Crafting job produced 1 item");
    const axeId = job.result.items[0];
    const axe = I.get(axeId);

    if (isMutant) {
        // Mutant test: corrupt output material check
        assert(axe && axe.mat === "metals:gold", "Mutant check: axe material should be gold (intentional failure)");
    } else {
        assert(axe && axe.mat === "stones:granite", `Output axe inherited primary material (got ${axe ? axe.mat : "none"}, expected stones:granite)`);
        assert(axe && axe.q === 4, `Output axe inherited crafted quality tier (got ${axe ? axe.q : "none"}, expected 4)`);
        
        const name = I.name ? I.name(axe) : "";
        assert(axe.type === "stone_axe", "Output item type is stone_axe");
        assert(I.count(crafter.id, "stone") === 0, "Granite stone consumed from crafter inventory");
        assert(I.count(crafter.id, "log") === 0, "Oak log consumed from crafter inventory");
        assert(I.count(crafter.id, "fiber") === 0, "Fiber consumed from crafter inventory");
    }
}

// Test 3: Output Item Material Inheritance (Yew Short Bow)
console.log("\nTest 3: Output Item Material Inheritance (Yew Short Bow)");
{
    const crafter = createMockUnit("Alia");
    crafter.data.skillQuality = 3;

    // Short bow requires: log (FLEXIBLE_BOW_WOOD: 1), fiber (CORDAGE: 2)
    // Give Yew log (elastic master bow wood) and 2 fibers
    I.give("log", 1, crafter.id, { mat: "woods:yew" });
    I.give("fiber", 2, crafter.id);

    const job = { type: "craft", params: { recipeId: "bow_short" }, owner: crafter.id };
    assert(craftHandler.plan(job, crafter).ok, "Plan succeeds for Yew Bow");

    craftHandler.apply(job, crafter);
    const bowId = job.result.items[0];
    const bow = I.get(bowId);

    assert(bow && bow.mat === "woods:yew", `Output bow inherited yew wood material (got ${bow ? bow.mat : "none"})`);
    assert(bow && bow.q === 3, "Output bow has quality 3");
}

// Test 4: Strategic Material Conservation During Crafting
console.log("\nTest 4: Strategic Material Conservation During Crafting");
{
    const crafter = createMockUnit("Garrick");

    // Crafter holds:
    // 2 Sandstone (common building stone, score ~96)
    // 2 Marble (prestige strategic stone, score ~ -54 due to -150 preservation penalty)
    // 1 Pine log
    // 1 Fiber
    I.give("stone", 2, crafter.id, { mat: "stones:sandstone" });
    I.give("stone", 2, crafter.id, { mat: "stones:marble" });
    I.give("log", 1, crafter.id, { mat: "woods:pine" });
    I.give("fiber", 1, crafter.id);

    const job = { type: "craft", params: { recipeId: "stone_axe" }, owner: crafter.id };
    assert(craftHandler.plan(job, crafter).ok, "Plan succeeds with mixed materials");

    craftHandler.apply(job, crafter);

    const axeId = job.result.items[0];
    const axe = I.get(axeId);

    assert(axe && axe.mat === "stones:sandstone", `Crafted axe consumed common sandstone (got ${axe ? axe.mat : "none"}, expected stones:sandstone)`);
    assert(I.count(crafter.id, "stone") === 2, "2 stones remain in inventory");

    const remainingStone = I.inventoryOf(crafter.id).find(it => it.type === "stone");
    assert(remainingStone && remainingStone.mat === "stones:marble", `Preserved strategic marble in inventory (got ${remainingStone ? remainingStone.mat : "none"})`);
}

// Test 5: Metal Tool Material Inheritance (Iron vs Bronze Dagger)
console.log("\nTest 5: Metal Tool Material Inheritance (Iron vs Bronze Dagger)");
{
    const crafter = createMockUnit("Brann");

    // Dagger requires: bar_iron (CUTTING_METAL: 1), leather (LEATHER: 1)
    // Give Bronze bar (matches CUTTING_METAL) and leather
    I.give("bar_iron", 1, crafter.id, { mat: "metals:bronze" });
    I.give("leather", 1, crafter.id);

    const job = { type: "craft", params: { recipeId: "dagger_iron" }, owner: crafter.id };
    assert(craftHandler.plan(job, crafter).ok, "Plan succeeds with bronze bar for iron dagger recipe");

    craftHandler.apply(job, crafter);
    const daggerId = job.result.items[0];
    const dagger = I.get(daggerId);

    assert(dagger && dagger.mat === "metals:bronze", `Dagger inherited bronze material (got ${dagger ? dagger.mat : "none"})`);
}

console.log(`\nTest Suite Summary: ${testsPassed} passed, ${testsFailed} failed.`);

if (testsFailed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
