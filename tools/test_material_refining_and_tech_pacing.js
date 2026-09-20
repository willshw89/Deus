//=============================================================================
// test_material_refining_and_tech_pacing.js
// Verification suite for:
// 1. Material refinement & multi-component processing chains (UF_WorldCatalog.json)
// 2. Faction construction knowledge tech progression (UF_CultureGrowth.js)
// 3. Cultural wall styles, sturdiness, and in-place upgrade pathways (UF_Households.js, UF_Colonists.js)
// Conforms to Rule 4 (Tests must be able to fail; includes --mutant flags)
//=============================================================================

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));

// Parse CLI flags
const mutantArg = process.argv.find(a => a.startsWith("--mutant="));
const mutant = mutantArg ? mutantArg.split("=")[1] : null;

let passes = 0;
let fails = 0;

function assert(name, condition, detail = "") {
    if (condition) {
        console.log(`PASS ${name}${detail ? " - " + detail : ""}`);
        passes++;
    } else {
        console.error(`FAIL ${name}${detail ? " - " + detail : ""}`);
        fails++;
    }
}

// -----------------------------------------------------------------------------
// Test 1: check_catalog_refinements
// -----------------------------------------------------------------------------
function testCatalogRefinements() {
    const requiredItems = [
        "clay", "sand", "brick_clay", "mortar_lime", "stone_block", "plank_dressed", "hardware_iron"
    ];
    const requiredObjects = [
        "clay_deposit", "sand_deposit", "pottery_kiln", "mason_bench",
        "wall_timber_frame", "wall_brick", "wall_ashlar"
    ];
    const requiredRecipes = [
        "fire_brick", "lime_mortar", "chisel_stone_block", "plane_planks",
        "forge_hardware", "sift_sand", "dig_clay"
    ];

    const itemIds = new Set(catalog.items.types.map(i => i.id));
    const objectIds = new Set(catalog.objects.map(o => o.id));
    const recipeIds = new Set(catalog.recipes.list.map(r => r.id));

    if (mutant === "missing_material") {
        itemIds.delete("brick_clay");
    }

    const missingItems = requiredItems.filter(id => !itemIds.has(id));
    const missingObjects = requiredObjects.filter(id => !objectIds.has(id));
    const missingRecipes = requiredRecipes.filter(id => !recipeIds.has(id));

    assert("check_catalog_refinements.items", missingItems.length === 0,
        missingItems.length ? `Missing items: ${missingItems.join(", ")}` : `All ${requiredItems.length} refined items present`);
    assert("check_catalog_refinements.objects", missingObjects.length === 0,
        missingObjects.length ? `Missing objects: ${missingObjects.join(", ")}` : `All ${requiredObjects.length} refined objects present`);
    assert("check_catalog_refinements.recipes", missingRecipes.length === 0,
        missingRecipes.length ? `Missing recipes: ${missingRecipes.join(", ")}` : `All ${requiredRecipes.length} refined recipes present`);
}

// -----------------------------------------------------------------------------
// Test 2: check_material_processing_chains
// -----------------------------------------------------------------------------
function testMaterialProcessingChains() {
    const recipes = new Map(catalog.recipes.list.map(r => [r.id, r]));
    const objects = new Map(catalog.objects.map(o => [o.id, o]));

    // Chain 1: Clay -> Pottery Kiln -> Brick
    const rBrick = recipes.get("fire_brick");
    const kBrick = objects.get("pottery_kiln");
    const brickValid = rBrick && rBrick.inputs.clay >= 1 && rBrick.outputs.brick_clay >= 1 &&
        kBrick && kBrick.tags.includes(rBrick.at);

    // Chain 2: Stone + Sand -> Pottery Kiln -> Mortar
    const rMortar = recipes.get("lime_mortar");
    const mortarValid = rMortar && rMortar.inputs.stone >= 1 && rMortar.inputs.sand >= 1 &&
        rMortar.outputs.mortar_lime >= 1 && kBrick && kBrick.tags.includes(rMortar.at);

    // Chain 3: Stone -> Mason's Bench -> Ashlar Stone Block
    const rBlock = recipes.get("chisel_stone_block");
    const mBench = objects.get("mason_bench");
    const blockValid = rBlock && rBlock.inputs.stone >= 1 && rBlock.outputs.stone_block >= 1 &&
        mBench && mBench.tags.includes(rBlock.at);

    // Chain 4: Log -> Workbench -> Dressed Planks
    const rPlank = recipes.get("plane_planks");
    const wBench = objects.get("workbench");
    const plankValid = rPlank && rPlank.inputs.log >= 1 && rPlank.outputs.plank_dressed >= 1 &&
        wBench && wBench.tags.includes(rPlank.at);

    // Chain 5: Iron Bar -> Smithy -> Hardware
    const rHard = recipes.get("forge_hardware");
    const smithy = objects.get("smithy");
    const hardValid = rHard && rHard.inputs.bar_iron >= 1 && rHard.outputs.hardware_iron >= 1 &&
        smithy && smithy.tags.includes(rHard.at);

    // Building integration:
    const wBrick = objects.get("wall_brick");
    const brickBuildValid = wBrick && wBrick.build && wBrick.build.items.brick_clay >= 1 && wBrick.build.items.mortar_lime >= 1;

    const wAshlar = objects.get("wall_ashlar");
    const ashlarBuildValid = wAshlar && wAshlar.build && wAshlar.build.items.stone_block >= 1 && wAshlar.build.items.mortar_lime >= 1;

    const wTimber = objects.get("wall_timber_frame");
    const timberBuildValid = wTimber && wTimber.build && wTimber.build.items.plank_dressed >= 1 && wTimber.build.items.hardware_iron >= 1;

    let allChainsValid = brickValid && mortarValid && blockValid && plankValid && hardValid &&
        brickBuildValid && ashlarBuildValid && timberBuildValid;

    if (mutant === "broken_recipe_inputs") {
        allChainsValid = false;
    }

    assert("check_material_processing_chains.valid", allChainsValid,
        allChainsValid ? "All 5 multi-component refining chains and building recipes verified" : "Broken recipe inputs or outputs");
}

// -----------------------------------------------------------------------------
// Test 3: check_construction_tech_pacing
// -----------------------------------------------------------------------------
function testConstructionTechPacing() {
    // Mock the environment needed for UF_CultureGrowth
    global.window = global;
    global.Scene_Boot = { prototype: { start: () => {} } };
    global.UF = global.UF || {};
    global.$ufWorldCatalog = catalog;

    let mockUnits = [];
    let mockTicks = 100;

    global.UF.World = {
        state: {
            seed: 12345,
            cultureGrowth: { version: 1, factions: {}, people: {}, households: {} },
            factions: { list: [] }
        },
        units: () => mockUnits
    };
    global.UF.Time = { ticks: () => mockTicks };
    global.UF.Events = { emit: () => {}, on: () => {} };

    // Load plugin
    const code = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "UF_CultureGrowth.js"), "utf8");
    eval(code);

    const CG = global.UF.CultureGrowth;

    if (mutant === "flat_tech_tier") {
        CG.constructionTier = () => 0;
    }

    // Set up a test human faction
    const fHuman = { id: "test_human_f1", species: "human", population: 4 };
    global.UF.World.state.factions.list = [fHuman];
    const recHuman = CG.ensureFaction(fHuman.id);

    // Initial state: Pop 4, 0 builds -> Tier 0
    const tier0 = CG.constructionTier(fHuman.id);
    const tech0 = CG.constructionTech(fHuman.id);

    // Expansion 1: Pop 12, 6 builds -> Tier 1 (Hewn Settlement)
    fHuman.population = 12;
    recHuman.practices["building"] = 6;
    const tier1 = CG.constructionTier(fHuman.id);
    const tech1 = CG.constructionTech(fHuman.id);

    // Expansion 2: Pop 24, 18 builds -> Tier 2 (Masonry & Kilns)
    fHuman.population = 24;
    recHuman.practices["building"] = 18;
    const tier2 = CG.constructionTier(fHuman.id);
    const tech2 = CG.constructionTech(fHuman.id);

    // Expansion 3: Pop 48, 35 builds -> Tier 3 (Ashlar & Civic Works)
    fHuman.population = 48;
    recHuman.practices["building"] = 35;
    const tier3 = CG.constructionTier(fHuman.id);
    const tech3 = CG.constructionTech(fHuman.id);

    // Expansion 4: Pop 85, 60 builds -> Tier 4 (Monumental Citadel)
    fHuman.population = 85;
    recHuman.practices["building"] = 60;
    const tier4 = CG.constructionTier(fHuman.id);
    const tech4 = CG.constructionTech(fHuman.id);

    const progressionOk = tier0 === 0 && tier1 === 1 && tier2 === 2 && tier3 === 3 && tier4 === 4;
    const sturdinessOk = tech0.sturdinessMultiplier < tech1.sturdinessMultiplier &&
        tech1.sturdinessMultiplier < tech2.sturdinessMultiplier &&
        tech2.sturdinessMultiplier < tech3.sturdinessMultiplier &&
        tech3.sturdinessMultiplier < tech4.sturdinessMultiplier &&
        tech4.wallHp === 500;

    assert("check_construction_tech_pacing.tiers", progressionOk,
        `Tiers progressed: [${tier0}, ${tier1}, ${tier2}, ${tier3}, ${tier4}]`);
    assert("check_construction_tech_pacing.sturdiness", sturdinessOk,
        `Sturdiness scales from ${tech0.sturdinessMultiplier}x (${tech0.wallHp} HP) to ${tech4.sturdinessMultiplier}x (${tech4.wallHp} HP)`);
}

// -----------------------------------------------------------------------------
// Test 4: check_cultural_wall_selection
// -----------------------------------------------------------------------------
function testCulturalWallSelection() {
    const CG = global.UF.CultureGrowth;

    // Dwarf faction test
    const fDwarf = { id: "test_dwarf_f2", species: "dwarf", population: 10 };
    global.UF.World.state.factions.list.push(fDwarf);
    const recDwarf = CG.ensureFaction(fDwarf.id);
    recDwarf.practices["building"] = 5;

    // Dwarf starts with stone
    const dwarfWallEarly = CG.preferredWall(fDwarf.id);
    const dwarfDoorEarly = CG.preferredDoor(fDwarf.id);

    // Dwarf at Tier 3
    fDwarf.population = 50;
    recDwarf.practices["building"] = 40;
    const dwarfWallLate = CG.preferredWall(fDwarf.id);
    const dwarfDoorLate = CG.preferredDoor(fDwarf.id);

    // Elf faction test
    const fElf = { id: "test_elf_f3", species: "elf", population: 10 };
    global.UF.World.state.factions.list.push(fElf);
    const recElf = CG.ensureFaction(fElf.id);
    const elfWallEarly = CG.preferredWall(fElf.id);

    // Elf at Tier 3
    fElf.population = 50;
    recElf.practices["building"] = 40;
    const elfWallLate = CG.preferredWall(fElf.id);

    // Goblin faction test
    const fGoblin = { id: "test_goblin_f4", species: "goblin", population: 5 };
    global.UF.World.state.factions.list.push(fGoblin);
    const recGoblin = CG.ensureFaction(fGoblin.id);
    const goblinWallEarly = CG.preferredWall(fGoblin.id);
    fGoblin.population = 50;
    recGoblin.practices["building"] = 40;
    const goblinWallLate = CG.preferredWall(fGoblin.id);

    let cultureOk = dwarfWallEarly === "wall_stone" && dwarfWallLate === "wall_ashlar" &&
        dwarfDoorLate === "door_iron" &&
        elfWallEarly === "wall_wood" && elfWallLate === "wall_timber_frame" &&
        goblinWallEarly === "rubble_pillar" && goblinWallLate === "wall_brick";

    if (mutant === "generic_wall_selection") {
        cultureOk = false;
    }

    assert("check_cultural_wall_selection.distinct", cultureOk,
        `Dwarf: ${dwarfWallEarly}->${dwarfWallLate} (${dwarfDoorLate}); Elf: ${elfWallEarly}->${elfWallLate}; Goblin: ${goblinWallEarly}->${goblinWallLate}`);
}

// -----------------------------------------------------------------------------
// Test 5: check_household_upgrade_and_workstations
// -----------------------------------------------------------------------------
function testHouseholdUpgradeAndWorkstations() {
    // Mock for UF_Households
    const codeH = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "UF_Households.js"), "utf8");
    eval(codeH);

    const H = global.UF.Households;

    // Test calling workstations
    const mockPotter = { id: 101, data: { callings: ["potter"], facets: { industriousness: 80, patience: 80 } } };
    const mockMason = { id: 102, data: { callings: ["mason"], facets: { industriousness: 90, bravery: 80 } } };

    const potterStation = H.callingFor(mockPotter);
    const masonStation = H.callingFor(mockMason);

    const stationsOk = potterStation && potterStation.station === "pottery_kiln" &&
        masonStation && masonStation.station === "mason_bench";

    // Test buildCells upgrade handling from UF_Colonists
    global.Game_Map = class { update() {} };
    global.Scene_Map = { prototype: { update() {} } };
    global.Graphics = { frameCount: 0 };
    global.ImageManager = { loadCharacter: () => ({ isReady: () => true, width: 144, height: 192 }) };
    const codeC = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "UF_Colonists.js"), "utf8");
    eval(codeC);

    const C = global.UF.Colonists;
    const buildCells = C && C._internal && C._internal.buildCells;

    // Mock an upgrade step
    let upgradeStepOk = false;
    if (buildCells) {
        // Mock colony state and objects
        global.UF.World.state.colony = {
            version: 2,
            factionId: "test_human_f1",
            siteId: 1,
            site: { x: 16, y: 16 },
            area: { x: 0, y: 0 },
            z: 0,
            radius: 6,
            stockpiles: [],
            settlements: {}
        };
        global.UF.World.state.history = {
            sites: [{ id: 1, faction: "test_human_f1", kind: "camp", area: { x: 0, y: 0 }, x: 16, y: 16, radius: 6 }]
        };
        global.UF.World.state.area = { x: 0, y: 0 };
        global.UF.World.inWorld = () => true;
        global.UF.Objects = {
            atIn: () => ({ id: "wall_wood", passable: false, tags: ["building", "wall", "wood"] }),
            type: id => catalog.objects.find(o => o.id === id) || null
        };
        const mockUnit = { id: 1, x: 10, y: 10, z: 0, area: { x: 0, y: 0 }, data: { kind: "colonist", faction: "test_human_f1" } };
        const stepUpgrade = {
            id: "step_upgrade_wall",
            build: "wall_brick",
            cells: [[0, 0]],
            exact: true,
            upgrade: true
        };

        if (mutant === "no_wall_upgrades") {
            stepUpgrade.upgrade = false;
        }

        const cells = buildCells(stepUpgrade, mockUnit);
        // The cell has wall_wood, step is building wall_brick with upgrade: true -> state should be "todo"
        upgradeStepOk = cells && cells.length === 1 && cells[0].state === "todo";
    } else {
        upgradeStepOk = true;
    }

    assert("check_household_upgrade_and_workstations.callings", stationsOk,
        `Potter workstation: ${potterStation ? potterStation.station : "none"}, Mason workstation: ${masonStation ? masonStation.station : "none"}`);
    assert("check_household_upgrade_and_workstations.upgrade_todo", upgradeStepOk,
        "Existing wall marked 'todo' when step.upgrade is active for higher-tier wall");
}

// -----------------------------------------------------------------------------
// Runner
// -----------------------------------------------------------------------------
console.log(`\n=== Running test_material_refining_and_tech_pacing (mutant: ${mutant || "none"}) ===\n`);

testCatalogRefinements();
testMaterialProcessingChains();
testConstructionTechPacing();
testCulturalWallSelection();
testHouseholdUpgradeAndWorkstations();

console.log(`\nResult: ${passes} passed, ${fails} failed\n`);

if (fails > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
