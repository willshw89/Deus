"use strict";
// tools/test_duplicate_registration.js - Focused test proving catalog-plugin integration has zero duplicate registration,
// consistent authoritative weights, and idempotent founder gear issuance.
//
// Usage: node tools/test_duplicate_registration.js [--mutant=<name>]
// Mutants:
//   --mutant=dup_id        (injects a duplicate item type id)
//   --mutant=bad_weight    (mutates common_clothes weight to 99)
//   --mutant=no_idempotent (bypasses starting kit idempotency guard)

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");

const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) {
        passed++;
        console.log(`PASS duplicate_reg.${name}${detail ? " - " + detail : ""}`);
    } else {
        failed++;
        console.log(`FAIL duplicate_reg.${name}${detail ? " - " + detail : ""}`);
    }
    return !!condition;
}

// 1. Check catalog files on disk directly
const ufCatRaw = fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8");
const deusCatRaw = fs.readFileSync(path.join(ROOT, "game", "data", "DEUS_WorldCatalog.json"), "utf8");

let ufCat, deusCat;
try {
    ufCat = JSON.parse(ufCatRaw);
    deusCat = JSON.parse(deusCatRaw);
} catch (e) {
    check("catalogs_valid_json", false, `JSON parse error: ${e.message}`);
    process.exit(1);
}

check("catalogs_valid_json", true, "Both UF_WorldCatalog.json and DEUS_WorldCatalog.json parse cleanly");
check("catalogs_in_sync", ufCat.items.types.length === deusCat.items.types.length, `UF items=${ufCat.items.types.length}, DEUS items=${deusCat.items.types.length}`);

// Test duplicate item IDs in catalog
const catTypes = ufCat.items.types.slice();
if (mutant === "dup_id") {
    catTypes.push({ id: "common_clothes", name: "Duplicate Clothes", stack: 1, weight: 3 });
}
const catIds = new Set();
const dupIds = [];
for (const t of catTypes) {
    if (catIds.has(t.id)) dupIds.push(t.id);
    catIds.add(t.id);
}
check("no_duplicate_catalog_ids", dupIds.length === 0, dupIds.length ? `Found duplicate IDs: ${dupIds.join(", ")}` : `All ${catIds.size} catalog item IDs are unique`);

// Check canonical starting gear entries exist
const clothesDef = catTypes.find(t => t.id === "common_clothes");
const pouchDef = catTypes.find(t => t.id === "pouch");
const coinDef = catTypes.find(t => t.id === "gold_coin");

check("common_clothes_in_catalog", !!clothesDef, clothesDef ? `name="${clothesDef.name}", weight=${clothesDef.weight}, stack=${clothesDef.stack}` : "missing");
check("pouch_in_catalog", !!pouchDef, pouchDef ? `name="${pouchDef.name}", weight=${pouchDef.weight}, capacity=${pouchDef.capacity}` : "missing");
check("gold_coin_in_catalog", !!coinDef, coinDef ? `name="${coinDef.name}", weight=${coinDef.weight}, value=${coinDef.value}` : "missing");

// 2. Load DEUS_Items plugin in a simulated RMMZ environment
function Game_System() {}
Game_System.prototype.windowOpacity = () => 255;
function Game_Map() { this._events = []; }
Game_Map.prototype.isValid = () => true;
Game_Map.prototype.isPassable = () => true;
Game_Map.prototype.events = function() { return this._events.filter(Boolean); };
Game_Map.prototype.eventsXy = () => [];
Game_Map.prototype.mapId = () => 1000;
Game_Map.prototype.displayX = () => 0;
Game_Map.prototype.displayY = () => 0;
Game_Map.prototype.tileWidth = () => 48;
Game_Map.prototype.tileHeight = () => 48;
Game_Map.prototype.tileId = () => 0;
Game_Map.prototype.update = () => {};
function Spriteset_Map() {}
Spriteset_Map.prototype.createCharacters = () => {};
function Scene_Boot() {}
Scene_Boot.prototype.start = () => {};
function Scene_Map() {}
Scene_Map.prototype.update = () => {};
function Sprite_Character() {}
class Sprite { constructor() { this.children = []; } addChild(c) { this.children.push(c); } }
function DataManager() {}
DataManager.makeSaveContents = () => ({});
function Game_CharacterBase() {}
Game_CharacterBase.prototype.moveStraight = function() {};
function Game_Character() {}
Game_Character.prototype = Object.create(Game_CharacterBase.prototype);
function Game_Player() {}
Game_Player.prototype = Object.create(Game_Character.prototype);
Game_Player.prototype.moveStraight = function() {};
function Game_Event() {}
Game_Event.prototype = Object.create(Game_Character.prototype);
Game_Event.prototype.locate = function() {};
Game_Event.prototype.initMembers = function() {};
Game_Event.prototype.setImage = function() {};
Game_Event.prototype.setDirection = function() {};
Game_Event.prototype.refresh = function() {};

const playerInst = new Game_Player();
playerInst.isTransferring = () => false;
playerInst.locate = () => {};

const catalogForVM = { items: { types: catTypes } };
if (mutant === "bad_weight" && clothesDef) {
    clothesDef.weight = 99;
}

const windowMock = {
    $ufWorldCatalog: catalogForVM,
    $deusWorldCatalog: catalogForVM,
    $gamePlayer: playerInst,
    $gameMap: new Game_Map(),
    $dataMap: { width: 100, height: 100, data: [], events: [] },
    PluginManager: { parameters: () => ({}), registerCommand: () => {}, _scripts: ["DEUS_Containers", "DEUS_Dnd5e"], loadScript: () => {} },
    Graphics: { frameCount: 1, printError: () => {} },
    ImageManager: { loadCharacter: () => ({ isReady: () => true, addLoadListener: cb => cb() }) },
    Input: { isPressed: () => false, keyMapper: {} },
    TouchInput: { x: 0, y: 0, isPressed: () => false, isTriggered: () => false, _currentState: {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    Game_System,
    Game_Map,
    Game_CharacterBase,
    Game_Character,
    Game_Player,
    Game_Event,
    Spriteset_Map,
    Scene_Boot,
    Scene_Map,
    Sprite_Character,
    Sprite,
    DataManager,
    Window_Base: class Window_Base {},
    Tilemap: { isWaterTile: () => false },
    SceneManager: { _scene: null },
    SoundManager: { playCursor: () => {}, playCancel: () => {} },
    performance: { now: () => Date.now() },
    console: console,
    Set,
    Map,
    Array,
    Object,
    Math,
    Number,
    String,
    Date
};
windowMock.window = windowMock;

const ctx = vm.createContext(windowMock);

// Load plugins
const coreCode = fs.readFileSync(path.join(PLUGINS, "DEUS_Core.js"), "utf8");
const worldCode = fs.readFileSync(path.join(PLUGINS, "DEUS_World.js"), "utf8");
const itemsCode = fs.readFileSync(path.join(PLUGINS, "DEUS_Items.js"), "utf8");

vm.runInContext(coreCode, ctx);
vm.runInContext(worldCode, ctx);
vm.runInContext(itemsCode, ctx);

const W = ctx.UF.World;
const I = ctx.UF.Items;

// Test runtime types registry
const runtimeTypes = I.types();
const runtimeIds = new Set();
const runtimeDups = [];
for (const t of runtimeTypes) {
    if (runtimeIds.has(t.id)) runtimeDups.push(t.id);
    runtimeIds.add(t.id);
}
check("runtime_types_no_duplicates", runtimeDups.length === 0, runtimeDups.length ? `Duplicates in I.types(): ${runtimeDups.join(", ")}` : `${runtimeTypes.length} types registered with 0 duplicates`);

// Test authoritative weights
const rtClothes = I.type("common_clothes");
const rtPouch = I.type("pouch");
const rtCoin = I.type("gold_coin");

check("authoritative_clothes_weight", rtClothes && rtClothes.weight === 3, `weight=${rtClothes ? rtClothes.weight : "?"} (expected 3)`);
check("authoritative_pouch_weight", rtPouch && rtPouch.weight === 1, `weight=${rtPouch ? rtPouch.weight : "?"} (expected 1)`);
check("authoritative_coin_weight", rtCoin && rtCoin.weight === 0.02, `weight=${rtCoin ? rtCoin.weight : "?"} (expected 0.02)`);

// Test alias resolution matches same object
check("alias_clothes_identity", I.type("clothes") === rtClothes, "I.type('clothes') === I.type('common_clothes')");
check("alias_gp_identity", I.type("gp") === rtCoin, "I.type('gp') === I.type('gold_coin')");

// Initialize World state
W.state = {
    version: 4,
    seed: 12345,
    size: 256,
    areasX: 1,
    areasY: 1,
    startArea: { x: 0, y: 0 },
    units: {},
    nextUnitId: 1,
    diffs: {},
    objectDiffs: {},
    factions: { playerId: "player" },
    items: { nextId: 1, byId: {} }
};

// Test founder starting kit idempotency (no duplicate items if called twice)
const testUnit = W.addUnit({
    name: "Founder_A",
    area: { x: 0, y: 0 },
    x: 10,
    y: 10,
    data: { kind: "colonist", faction: "f1", founder: true }
});

// Call kit issuance first time
I.giveFactionStartingKit(testUnit);

const clothesAfterFirst = testUnit.data.equipment && testUnit.data.equipment.clothes;
const invCountFirst = (testUnit.data.inventory || []).length;
const weightFirst = I.carriedWeight(testUnit.id);

if (mutant === "no_idempotent") {
    delete testUnit.data.startingKitGiven;
}

// Call kit issuance second time
I.giveFactionStartingKit(testUnit);

const clothesAfterSecond = testUnit.data.equipment && testUnit.data.equipment.clothes;
const invCountSecond = (testUnit.data.inventory || []).length;
const weightSecond = I.carriedWeight(testUnit.id);

check("kit_issuance_idempotent_inventory", invCountFirst === invCountSecond, `first=${invCountFirst}, second=${invCountSecond} items in inventory`);
check("kit_issuance_idempotent_weight", weightFirst === weightSecond && Math.abs(weightSecond - 4.3) < 1e-4, `first=${weightFirst} lb, second=${weightSecond} lb (expected 4.3 lb)`);
check("kit_issuance_idempotent_clothes", clothesAfterFirst === clothesAfterSecond, `clothes item id remained ${clothesAfterFirst}`);

// Total results
console.log(`\nDuplicate Registration Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
