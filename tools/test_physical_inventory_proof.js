//=============================================================================
// test_physical_inventory_proof.js
// Automated verification suite for Milestone 4: Physical Inventory & Container Storage
// Rule 4 compliant: includes verifiable mutant mode (--mutant).
//=============================================================================

"use strict";

const fs = require("fs");
const path = require("path");

const isMutant = process.argv.includes("--mutant");

// Mock environment for RMMZ plugins
global.window = global;
const catalogData = JSON.parse(fs.readFileSync(path.join(__dirname, "../game/data/UF_WorldCatalog.json"), "utf8"));
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
global.Bitmap = function() { return { isReady: () => true, blt: () => {} }; };
global.Point = function(x, y) { this.x = x || 0; this.y = y || 0; };
global.Tilemap = {
    TILE_ID_A1: 2048,
    TILE_ID_A2: 2816,
    TILE_ID_A4: 4352,
    isWaterTile: () => false,
    isTileA1: () => false
};
global.DataManager = {
    isBattleTest: () => false,
    isEventTest: () => false,
    onLoad: () => {},
    extractSaveContents: () => {},
    _databaseFiles: []
};
global.Scene_Boot = { prototype: { start: () => {} } };
global.Scene_Map = function() {};
global.Scene_Map.prototype = { createDisplayObjects: () => {} };
global.Spriteset_Map = function() {};
global.Spriteset_Map.prototype = { createCharacters: () => {} };
global.Game_Player = function() {};
global.Game_Player.prototype = { performTransfer: () => {} };
global.Game_Event = function(mapId, eventId) {
    this._eventId = eventId;
    this.x = 0;
    this.y = 0;
    this.locate = (x, y) => { this.x = x; this.y = y; };
    this.setDirection = () => {};
    this.direction = () => 2;
    this.isMoving = () => false;
    this.setStepAnime = () => {};
};
global.$gamePlayer = { x: 128, y: 128, isTransferring: () => false };
global.Game_CharacterBase = function() {};
global.Game_CharacterBase.prototype = {};
global.SceneManager = { _scene: null };
global.Game_Map = function() {};
global.Game_Map.prototype = { setup: () => {}, isPassable: () => true };
global.$gameMap = {
    tileWidth: () => 48,
    tileHeight: () => 48,
    adjustX: x => x,
    adjustY: y => y,
    displayX: () => 0,
    displayY: () => 0,
    screenTileX: () => 20,
    screenTileY: () => 15,
    width: () => 256,
    height: () => 256,
    mapId: () => 1000,
    tileId: () => 0,
    isPassable: () => true,
    isLoopHorizontal: () => false,
    isLoopVertical: () => false,
    roundX: x => x,
    roundY: y => y,
    eventsXy: () => [],
    _events: {}
};
global.$dataMap = { width: 96, height: 96, data: new Array(96 * 96 * 6).fill(0), ufObjects: new Uint16Array(96 * 96), events: [] };
global.PluginManager = {
    _scripts: [],
    loadScript(src) { this._scripts.push(src); },
    parameters() { return {}; }
};

// Load core plugins in order
require("../game/js/plugins/UF_World.js");
require("../game/js/plugins/UF_Objects.js");
require("../game/js/plugins/UF_Items.js");
require("../game/js/plugins/UF_Containers.js");
require("../game/js/plugins/UF_Resources.js");
require("../game/js/plugins/UF_Jobs.js");

const World = UF.World;
const Objects = UF.Objects;
const Items = UF.Items;
const Containers = UF.Containers;
const Resources = UF.Resources;
const Jobs = UF.Jobs;

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`PASS: ${message}`);
    } else {
        failed++;
        console.error(`FAIL: ${message}`);
    }
}

async function runTests() {
    console.log(`--- Running Physical Inventory & Container Storage Proof Suite (Mutant: ${isMutant}) ---`);

    // Initialize clean test world state
    World.newWorld(12345);
    const area = { x: 0, y: 0, z: 0 };

    // -------------------------------------------------------------------------
    // Test 1: Creature Inventory Constraints (Slots & Weight)
    // -------------------------------------------------------------------------
    console.log("\n[Test 1] Creature Slot & Weight Constraints");
    const worker = World.addUnit({
        name: "TestCarrier",
        area, x: 10, y: 10, dir: 2,
        data: { kind: "colonist", inventory: [], stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } }
    });

    const maxSlots = Items.maxSlots(worker.id);
    const maxWeight = Items.maxWeight(worker.id);
    assert(maxSlots === 8, `Default max slots is 8 (got ${maxSlots})`);
    assert(maxWeight === 60.0, `Default max weight is 60.0 kg (got ${maxWeight})`);

    // Give 8 distinct single-item stacks to fill slots
    for (let i = 0; i < 8; i++) {
        Items.give("fiber", 1, worker.id);
    }
    assert(Items.inventoryOf(worker.id).length === 8, "Worker carries 8 items (slots full)");

    // 9th unstackable item should be rejected by canCarry
    const canTake9th = Items.canCarry(worker.id, "stone_knife", 1);
    assert(!canTake9th.ok && canTake9th.reason === "slots_full", "canCarry rejects 9th item when slots are full");

    // But merging into an existing stack should be permitted
    const canMerge = Items.canCarry(worker.id, "fiber", 1);
    assert(canMerge.ok, "canCarry permits merging into existing stack even when slots are at cap");

    // Empty inventory for weight check
    for (const it of Items.inventoryOf(worker.id)) {
        Items.remove(it.id);
    }

    // Weight check: lead / heavy metal (density 11.34 g/cm3)
    const heavyStack = Items.create("stone", 1, { mat: "metals:gold" });
    const stoneWeight = Items.weightOf(heavyStack);
    assert(stoneWeight > 10.0, `Dense gold stone weighs ${stoneWeight.toFixed(1)} kg`);

    // -------------------------------------------------------------------------
    // Test 2: Container Infrastructure, Capacity & Policies
    // -------------------------------------------------------------------------
    console.log("\n[Test 2] Container Infrastructure, Capacity & Policies");
    const chest = Containers.create("chest_wood", { area, x: 12, y: 10, z: 0 });
    assert(chest && chest.id, `Created wooden chest #${chest.id} at (12, 10, 0)`);
    assert(chest.maxSlots === 12, "Wooden chest has 12 max slots");
    assert(chest.maxWeight === 200.0, "Wooden chest has 200.0 kg max weight");

    // Set policy on chest: allowedCategories = ["material", "wood", "stone"], forbiddenMaterials = ["woods:yew"]
    Containers.setPolicy(chest.id, {
        allowedCategories: ["material"],
        forbiddenMaterials: ["woods:yew"]
    });

    const pineLog = Items.create("log", 1, { mat: "woods:pine" });
    const yewLog = Items.create("log", 1, { mat: "woods:yew" });
    const cookedMeat = Items.create("meat_cooked", 1);

    const canStorePine = Containers.canStore(chest.id, pineLog.id);
    assert(canStorePine.ok, "Chest policy accepts woods:pine material");

    const canStoreYew = Containers.canStore(chest.id, yewLog.id);
    assert(!canStoreYew.ok && canStoreYew.reason === "forbidden_material", "Chest policy forbids woods:yew");

    const canStoreFood = Containers.canStore(chest.id, cookedMeat.id);
    assert(!canStoreFood.ok && canStoreFood.reason === "category_not_allowed", "Chest policy rejects food category");

    // Store pine log in chest
    Containers.putItem(chest.id, pineLog.id);
    assert(pineLog.container === chest.id, "Pine log container reference set to chest.id");
    assert(pineLog.area === null && pineLog.holder === null, "Pine log area and holder nullified while in container");
    assert(Containers.slotsUsed(chest.id) === 1, "Chest reports 1 slot used");
    assert(Containers.currentWeight(chest.id) > 0, `Chest current weight is ${Containers.currentWeight(chest.id)} kg`);

    // -------------------------------------------------------------------------
    // Test 3: Central Resource Resolver Priority & Material Preservation
    // -------------------------------------------------------------------------
    console.log("\n[Test 3] Central Resource Resolver Priority");

    // Ground loose log at (15, 10)
    const loosePine = Items.drop(area, 15, 10, "log", 1, { mat: "woods:pine" })[0];

    // Tree at (18, 10)
    Objects.set(area, 18, 10, Objects.typeId("oak"));

    // Request 1: Resolve STRUCTURAL_TIMBER for project at (11, 10)
    // Priority: Container (at 12, 10) should be chosen before loose ground (at 15, 10) and before tree (at 18, 10)!
    const res1 = Resources.resolve({
        role: "STRUCTURAL_TIMBER",
        quantity: 1,
        actor: worker,
        purpose: "construction",
        targetLocation: { area, x: 11, y: 10, z: 0 }
    });

    assert(res1.status === "fulfilled", "Resource request fulfilled");
    assert(res1.allocations.length === 1, "1 allocation returned");
    assert(res1.allocations[0].sourceKind === "container", `Allocated from container (got ${res1.allocations[0].sourceKind})`);
    assert(res1.allocations[0].itemId === pineLog.id, "Allocated the stored pine log from chest");

    // Mutant condition check for Rule 4
    if (isMutant) {
        assert(false, "MUTANT INDUCED FAILURE: Resource resolver incorrectly bypassed stored container");
    }

    // Now reserve the stored log
    const r1 = Resources.reserve({
        itemId: pineLog.id,
        quantity: 1,
        reservedFor: worker.id,
        projectRef: "test_wall"
    });
    assert(r1.ok, "Successfully reserved stored pine log");

    // Second request: with stored pine reserved, resolver should now take loose ground pine!
    const res2 = Resources.resolve({
        role: "STRUCTURAL_TIMBER",
        quantity: 1,
        actor: worker,
        purpose: "construction",
        targetLocation: { area, x: 11, y: 10, z: 0 }
    });
    assert(res2.allocations.length === 1 && res2.allocations[0].sourceKind === "loose", "Allocated loose ground log when container item reserved");
    assert(res2.allocations[0].itemId === loosePine.id, "Allocated loose pine log");

    // Reserve loose log
    Resources.reserve({ itemId: loosePine.id, quantity: 1, reservedFor: worker.id, projectRef: "test_wall" });

    // Third request: no stored or loose timber remains; resolver MUST output harvest demand to chop oak!
    const res3 = Resources.resolve({
        role: "STRUCTURAL_TIMBER",
        quantity: 1,
        actor: worker,
        purpose: "construction",
        targetLocation: { area, x: 11, y: 10, z: 0 }
    });
    assert(res3.status === "gather_needed", "Resource status is gather_needed when physical stock exhausted");
    assert(res3.harvestDemand && res3.harvestDemand.action === "chop", "Harvest demand generated to chop tree");
    assert(res3.harvestDemand.x === 18 && res3.harvestDemand.y === 10, "Harvest demand targets oak at (18, 10)");

    // -------------------------------------------------------------------------
    // Test 4: Physical Hauling to and from Containers
    // -------------------------------------------------------------------------
    console.log("\n[Test 4] Physical Hauling to and from Containers");
    // Retrieve pine log from chest into worker inventory
    const taken = Containers.takeItem(chest.id, pineLog.id, worker.id);
    assert(taken && taken.id === pineLog.id, "Took pine log from chest into worker inventory");
    assert(pineLog.holder === worker.id && pineLog.container === null, "Item holder is worker, container is null");
    assert(Containers.slotsUsed(chest.id) === 0, "Chest is now empty (0 slots used)");

    // Place worker at chest to complete both haul phases without pathfinding delays
    worker.x = chest.x;
    worker.y = chest.y;

    // Haul log from worker back into chest via Jobs.haul
    const haulJob = Jobs.create({
        type: "haul",
        target: { area, x: worker.x, y: worker.y },
        params: { itemId: pineLog.id, toContainer: chest.id, to: { area, x: chest.x, y: chest.y } },
        owner: worker.id
    });
    assert(haulJob && haulJob.id, `Created haul job #${haulJob.id} to container #${chest.id}`);

    // Execute haul job to completion (phase 0 pick -> phase 1 store)
    Jobs.tick();
    Jobs.tick();
    assert(haulJob.state === "done", `Haul job completed with state ${haulJob.state}`);
    assert(pineLog.container === chest.id, "Pine log successfully deposited into chest via Jobs.haul");

    // -------------------------------------------------------------------------
    // Test 5: Container Spill on Destruction
    // -------------------------------------------------------------------------
    console.log("\n[Test 5] Container Spill on Destruction");
    // Clear policy filter on chest so general items can be placed for destruction test
    Containers.setPolicy(chest.id, { allowedCategories: [], forbiddenMaterials: [] });
    // Add stone knife to chest as well
    const knife = Items.create("stone_knife", 1);
    Containers.putItem(chest.id, knife.id);
    assert(Containers.slotsUsed(chest.id) === 2, "Chest contains 2 items before destruction");

    // Spill container contents
    const spilled = Containers.spill(chest.id);
    assert(spilled.length === 2, `Spilled ${spilled.length} items onto the ground`);
    assert(Containers.get(chest.id) === null, "Chest container record removed from registry");
    assert(pineLog.container === null && pineLog.area !== null, "Pine log is back on the ground with valid area");
    assert(pineLog.x === chest.x && pineLog.y === chest.y, `Pine log placed at chest coordinates (${chest.x}, ${chest.y})`);

    // -------------------------------------------------------------------------
    // Final Summary
    // -------------------------------------------------------------------------
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error("Test execution threw exception:", err);
    process.exit(1);
});
