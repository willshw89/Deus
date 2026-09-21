// tools/test_material_substitution.js - Automated tests for Material Substitution Matrix & Property Matcher
// Validates functional requirement matching, candidate desirability scoring, strategic material conservation,
// and requirement-driven inventory consumption.
"use strict";

const fs = require("fs");
const path = require("path");

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
    items: { nextId: 1, byId: {} }
};

// Minimal mock UF environment
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
        levelOfMapId: () => 0
    }
};

// Load plugin
require(path.resolve(__dirname, "..", "game", "js", "plugins", "UF_Items.js"));

const isMutant = process.argv.includes("--mutant");
console.log(`Running test_material_substitution.js${isMutant ? " (MUTANT MODE)" : ""}`);

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
    if (condition) {
        console.log(`PASS: ${name} - ${detail || ""}`);
        passed++;
    } else {
        console.error(`FAIL: ${name} - ${detail || ""}`);
        failed++;
    }
}

// -----------------------------------------------------------------------------
// Test 1: Structural Timber Matcher
// -----------------------------------------------------------------------------
function testStructuralTimber() {
    const pine = { id: 1, type: "log", mat: "woods:pine" };
    const oak = { id: 2, type: "log", mat: "woods:oak" };
    const ash = { id: 3, type: "log", mat: "woods:ash" };
    const birch = { id: 4, type: "log", mat: "woods:birch" };
    const elm = { id: 5, type: "log", mat: "woods:elm" };
    const yew = { id: 6, type: "log", mat: "woods:yew" };
    const willow = { id: 7, type: "log", mat: "woods:willow" };
    const stone = { id: 8, type: "stone", mat: "stones:limestone" };

    let pineMatch = UF.Items.matchesRequirement(pine, "STRUCTURAL_TIMBER");
    const oakMatch = UF.Items.matchesRequirement(oak, "STRUCTURAL_TIMBER");
    const ashMatch = UF.Items.matchesRequirement(ash, "STRUCTURAL_TIMBER");
    const birchMatch = UF.Items.matchesRequirement(birch, "STRUCTURAL_TIMBER");
    const elmMatch = UF.Items.matchesRequirement(elm, "STRUCTURAL_TIMBER");
    const yewMatch = UF.Items.matchesRequirement(yew, "STRUCTURAL_TIMBER");
    const willowMatch = UF.Items.matchesRequirement(willow, "STRUCTURAL_TIMBER");
    const stoneMatch = UF.Items.matchesRequirement(stone, "STRUCTURAL_TIMBER");

    if (isMutant) {
        pineMatch = false; // Deliberate failure in mutant mode
    }

    const ok = pineMatch && oakMatch && ashMatch && birchMatch && elmMatch && yewMatch && !willowMatch && !stoneMatch;
    check("structural_timber_matcher", ok,
        `pine: ${pineMatch}, oak: ${oakMatch}, ash: ${ashMatch}, birch: ${birchMatch}, willow: ${willowMatch} (expected false), stone: ${stoneMatch} (expected false)`);
}

// -----------------------------------------------------------------------------
// Test 2: Flexible Bow Wood Matcher
// -----------------------------------------------------------------------------
function testFlexibleBowWood() {
    const yew = { id: 10, type: "log", mat: "woods:yew" };
    const ash = { id: 11, type: "log", mat: "woods:ash" };
    const willow = { id: 12, type: "log", mat: "woods:willow" };
    const elm = { id: 13, type: "log", mat: "woods:elm" };
    const oak = { id: 14, type: "log", mat: "woods:oak" };
    const pine = { id: 15, type: "log", mat: "woods:pine" };

    const yewMatch = UF.Items.matchesRequirement(yew, "FLEXIBLE_BOW_WOOD");
    const ashMatch = UF.Items.matchesRequirement(ash, "FLEXIBLE_BOW_WOOD");
    const willowMatch = UF.Items.matchesRequirement(willow, "FLEXIBLE_BOW_WOOD");
    const elmMatch = UF.Items.matchesRequirement(elm, "FLEXIBLE_BOW_WOOD");
    const oakMatch = UF.Items.matchesRequirement(oak, "FLEXIBLE_BOW_WOOD");
    const pineMatch = UF.Items.matchesRequirement(pine, "FLEXIBLE_BOW_WOOD");

    const ok = yewMatch && ashMatch && willowMatch && elmMatch && !oakMatch && !pineMatch;
    check("flexible_bow_wood_matcher", ok,
        `yew: ${yewMatch}, ash: ${ashMatch}, willow: ${willowMatch}, elm: ${elmMatch}, oak: ${oakMatch} (expected false), pine: ${pineMatch} (expected false)`);
}

// -----------------------------------------------------------------------------
// Test 3: Cutting Metal Matcher
// -----------------------------------------------------------------------------
function testCuttingMetal() {
    const steel = { id: 20, type: "bar_steel", mat: "metals:steel" };
    const bronze = { id: 21, type: "bar_bronze", mat: "metals:bronze" };
    const iron = { id: 22, type: "bar_iron", mat: "metals:iron" };
    const copper = { id: 23, type: "bar_copper", mat: "metals:copper" };
    const tin = { id: 24, type: "bar_tin", mat: "metals:tin" };
    const gold = { id: 25, type: "gold", mat: "metals:gold" };

    const steelMatch = UF.Items.matchesRequirement(steel, "CUTTING_METAL");
    const bronzeMatch = UF.Items.matchesRequirement(bronze, "CUTTING_METAL");
    const ironMatch = UF.Items.matchesRequirement(iron, "CUTTING_METAL");
    const copperMatch = UF.Items.matchesRequirement(copper, "CUTTING_METAL");
    const tinMatch = UF.Items.matchesRequirement(tin, "CUTTING_METAL");
    const goldMatch = UF.Items.matchesRequirement(gold, "CUTTING_METAL");

    const ok = steelMatch && bronzeMatch && ironMatch && !copperMatch && !tinMatch && !goldMatch;
    check("cutting_metal_matcher", ok,
        `steel: ${steelMatch}, bronze: ${bronzeMatch}, iron: ${ironMatch}, copper: ${copperMatch} (expected false), tin: ${tinMatch} (expected false), gold: ${goldMatch} (expected false)`);
}

// -----------------------------------------------------------------------------
// Test 4: Stone Grades Matcher (Building, Hard, Soft)
// -----------------------------------------------------------------------------
function testStoneGrades() {
    const limestone = { id: 30, type: "stone", mat: "stones:limestone" };
    const sandstone = { id: 31, type: "stone", mat: "stones:sandstone" };
    const granite = { id: 32, type: "stone", mat: "stones:granite" };
    const basalt = { id: 33, type: "stone", mat: "stones:basalt" };

    // Building stone: all should match
    const limeBuild = UF.Items.matchesRequirement(limestone, "BUILDING_STONE");
    const sandBuild = UF.Items.matchesRequirement(sandstone, "BUILDING_STONE");
    const granBuild = UF.Items.matchesRequirement(granite, "BUILDING_STONE");
    const basBuild = UF.Items.matchesRequirement(basalt, "BUILDING_STONE");

    // Hard stone: granite and basalt match, limestone and sandstone fail
    const granHard = UF.Items.matchesRequirement(granite, "HARD_STONE");
    const basHard = UF.Items.matchesRequirement(basalt, "HARD_STONE");
    const limeHard = UF.Items.matchesRequirement(limestone, "HARD_STONE");
    const sandHard = UF.Items.matchesRequirement(sandstone, "HARD_STONE");

    // Soft stone: limestone and sandstone match, granite and basalt fail
    const limeSoft = UF.Items.matchesRequirement(limestone, "SOFT_STONE");
    const sandSoft = UF.Items.matchesRequirement(sandstone, "SOFT_STONE");
    const granSoft = UF.Items.matchesRequirement(granite, "SOFT_STONE");
    const basSoft = UF.Items.matchesRequirement(basalt, "SOFT_STONE");

    const ok = limeBuild && sandBuild && granBuild && basBuild &&
        granHard && basHard && !limeHard && !sandHard &&
        limeSoft && sandSoft && !granSoft && !basSoft;

    check("stone_grades_matcher", ok,
        `building stones all pass: ${limeBuild && sandBuild && granBuild && basBuild}; hard stone (granite=${granHard}, lime=${limeHard}); soft stone (sand=${sandSoft}, basalt=${basSoft})`);
}

// -----------------------------------------------------------------------------
// Test 5: Candidate Desirability Scoring & Strategic Preservation
// -----------------------------------------------------------------------------
function testCandidateScoring() {
    const pine = { id: 40, type: "log", mat: "woods:pine", count: 1 };
    const oak = { id: 41, type: "log", mat: "woods:oak", count: 1 };
    const yew = { id: 42, type: "log", mat: "woods:yew", count: 1 };
    const ash = { id: 43, type: "log", mat: "woods:ash", count: 1 };

    // Bulk Structural Timber: Pine should have highest score, Yew should have heavy negative score
    const pineScore = UF.Items.scoreCandidate(pine, "STRUCTURAL_TIMBER");
    const oakScore = UF.Items.scoreCandidate(oak, "STRUCTURAL_TIMBER");
    const yewScore = UF.Items.scoreCandidate(yew, "STRUCTURAL_TIMBER");

    const timberHierarchy = pineScore > oakScore && oakScore > yewScore && yewScore < 0;

    // Bow Wood: Yew and Ash should score higher than Elm
    const yewBowScore = UF.Items.scoreCandidate(yew, "FLEXIBLE_BOW_WOOD");
    const ashBowScore = UF.Items.scoreCandidate(ash, "FLEXIBLE_BOW_WOOD");
    const bowHierarchy = yewBowScore > 0 && ashBowScore > 0;

    // Stone: Sandstone/Limestone should score higher than Granite for ordinary building
    const sand = { id: 44, type: "stone", mat: "stones:sandstone", count: 1 };
    const lime = { id: 45, type: "stone", mat: "stones:limestone", count: 1 };
    const gran = { id: 46, type: "stone", mat: "stones:granite", count: 1 };

    const sandScore = UF.Items.scoreCandidate(sand, "BUILDING_STONE");
    const limeScore = UF.Items.scoreCandidate(lime, "BUILDING_STONE");
    const granScore = UF.Items.scoreCandidate(gran, "BUILDING_STONE");
    const granFortScore = UF.Items.scoreCandidate(gran, "BUILDING_STONE", { fortification: true });
    const sandFortScore = UF.Items.scoreCandidate(sand, "BUILDING_STONE", { fortification: true });

    const stoneHierarchy = sandScore > granScore && limeScore > granScore && granFortScore > sandFortScore;

    const ok = timberHierarchy && bowHierarchy && stoneHierarchy;
    check("candidate_desirability_scoring", ok,
        `timber: pine (${pineScore}) > oak (${oakScore}) > yew (${yewScore}); bow: yew (${yewBowScore}), ash (${ashBowScore}); stone: sand (${sandScore}) > gran (${granScore}), fort: gran (${granFortScore}) > sand (${sandFortScore})`);
}

// -----------------------------------------------------------------------------
// Test 6: Requirement-Driven Inventory Consumption & Preservation
// -----------------------------------------------------------------------------
function testRequirementConsumption() {
    // Create unit with mixed timber
    const unitId = nextUnitId++;
    unitsById[unitId] = { id: unitId, area: { x: 0, y: 0, z: 0 }, data: { inventory: [] } };

    // Give unit 1 Yew Log, 2 Pine Logs
    UF.Items.create("log", 1, { holder: unitId }, { mat: "woods:yew" });
    UF.Items.create("log", 2, { holder: unitId }, { mat: "woods:pine" });

    // Initial count
    const totalTimber = UF.Items.countRequirement(unitId, "STRUCTURAL_TIMBER");
    check("count_requirement_initial", totalTimber === 3, `initial structural timber count: ${totalTimber} (expected 3)`);

    // Consume 1 structural timber: should consume Pine, NOT Yew!
    const consumed = UF.Items.consumeFrom(unitId, "STRUCTURAL_TIMBER", 1);
    const remaining = UF.Items.inventoryOf(unitId);

    const yewRemaining = remaining.find(it => it.mat === "woods:yew");
    const pineRemaining = remaining.find(it => it.mat === "woods:pine");

    const preservedYew = consumed === 1 && yewRemaining && yewRemaining.count === 1 && pineRemaining && pineRemaining.count === 1;
    check("strategic_material_preservation_on_consume", preservedYew,
        `consumed: ${consumed}, yew remaining: ${yewRemaining ? yewRemaining.count : 0} (expected 1), pine remaining: ${pineRemaining ? pineRemaining.count : 0} (expected 1)`);
}

// Run all tests
testStructuralTimber();
testFlexibleBowWood();
testCuttingMetal();
testStoneGrades();
testCandidateScoring();
testRequirementConsumption();

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
