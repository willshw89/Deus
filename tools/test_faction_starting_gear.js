"use strict";
// tools/test_faction_starting_gear.js - Verification for faction creature starting equipment
// Requirements (User Directive 2026-09-23 / D&D 5.1 SRD standard background starting kit):
// Every faction creature starts with:
// - a set of common clothes (equipped in torso/clothes slot)
// - a pouch containing 15 gp
//
// Usage: node tools/test_faction_starting_gear.js [--mutant=<name>]
// Mutants:
//   --mutant=no_clothes   (removes common clothes)
//   --mutant=no_pouch     (removes pouch)
//   --mutant=wrong_coins  (changes coin count from 15 to 0)

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
        console.log(`PASS starting_gear.${name}${detail ? " - " + detail : ""}`);
    } else {
        failed++;
        console.log(`FAIL starting_gear.${name}${detail ? " - " + detail : ""}`);
    }
    return !!condition;
}

// 1. Build a minimal browser / RMMZ context
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));

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
const Tilemap = { isWaterTile: () => false };
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
function Bitmap() {}
function Rectangle() {}
function Window_Base() {}

const playerInst = new Game_Player();
playerInst.isTransferring = () => false;
playerInst.locate = () => {};

const windowMock = {
    $ufWorldCatalog: catalog,
    $gamePlayer: playerInst,
    $gameMap: new Game_Map(),
    $dataMap: { width: 100, height: 100, data: [], events: [] },
    PluginManager: { parameters: () => ({}), registerCommand: () => {}, _scripts: ["DEUS_Containers", "DEUS_Dnd5e"], loadScript: () => {} },
    Graphics: { frameCount: 100 },
    TouchInput: { isPressed: () => false, isTriggered: () => false, _currentState: {} },
    Input: { isPressed: () => false, keyMapper: {} },
    SoundManager: { playCursor: () => {}, playCancel: () => {} },
    SceneManager: { _scene: null },
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
    Bitmap,
    Rectangle,
    Window_Base,
    Tilemap,
    addEventListener: () => {},
    DEUS: {},
    UF: {
        Events: {
            _listeners: {},
            on(event, cb) { (this._listeners[event] = this._listeners[event] || []).push(cb); },
            off(event, cb) { if (this._listeners[event]) this._listeners[event] = this._listeners[event].filter(x => x !== cb); },
            emit(event, ...args) { for (const cb of (this._listeners[event] || []).slice()) { try { cb(...args); } catch (e) { console.error(e); } } }
        }
    }
};
windowMock.DEUS = windowMock.UF;
windowMock.window = windowMock;
windowMock.global = windowMock;

const ctx = vm.createContext(windowMock);

// Load required scripts into VM
function loadScript(fileName) {
    const code = fs.readFileSync(path.join(PLUGINS, fileName), "utf8");
    vm.runInContext(code, ctx, { filename: fileName });
}

loadScript("DEUS_World.js");
loadScript("DEUS_Containers.js");
loadScript("DEUS_Dnd5e.js");
loadScript("DEUS_Items.js");
loadScript("DEUS_History.js");
loadScript("DEUS_Sheet.js");

const UF = windowMock.UF;
const W = UF.World;
const I = UF.Items;
const H = UF.History;
const Sheet = UF.Sheet;

// Initialize World state
W.state = {
    version: 4,
    seed: 902943875,
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

// Check 1: Catalog types include common_clothes, pouch, and gold_coin
const clothesType = I.type("common_clothes");
check("clothes_type_defined", !!clothesType && clothesType.weight === 3.0 && clothesType.tags.includes("clothing"),
    `common_clothes defined: weight=${clothesType ? clothesType.weight : null}`);

const pouchType = I.type("pouch");
check("pouch_type_defined", !!pouchType && pouchType.weight === 1.0 && pouchType.tags.includes("container"),
    `pouch defined: weight=${pouchType ? pouchType.weight : null}`);

const gpType = I.type("gold_coin");
check("gold_coin_type_defined", !!gpType && gpType.weight === 0.02 && gpType.value === 1,
    `gold_coin defined: weight=${gpType ? gpType.weight : null}`);

// Check 2: Aliases resolve properly
check("alias_gp", I.type("gp") === gpType, "I.type('gp') resolves to gold_coin");
check("alias_clothes", I.type("clothes") === clothesType, "I.type('clothes') resolves to common_clothes");
check("alias_clothes_common", I.type("clothes_common") === clothesType, "I.type('clothes_common') resolves to common_clothes");

// Check 3: Standalone faction creature creation gets starting kit
const testUnit = W.addUnit({
    name: "TEST_ColonistA",
    area: { x: 0, y: 0 },
    x: 10, y: 10, dir: 2,
    data: { kind: "colonist", faction: "player", species: "human" }
});

if (mutant === "no_clothes") {
    delete testUnit.data.equipment.clothes;
    delete testUnit.data.equipment.torso;
} else if (mutant === "no_pouch") {
    const inv = I.inventoryOf(testUnit.id);
    const p = inv.find(it => it.type === "pouch");
    if (p) I.remove(p.id);
} else if (mutant === "wrong_coins") {
    const inv = I.inventoryOf(testUnit.id);
    const coins = inv.find(it => it.type === "gold_coin");
    if (coins) coins.count = 0;
}

const testInv = I.inventoryOf(testUnit.id);
const hasClothesEquipped = !!(testUnit.data.equipment && (testUnit.data.equipment.clothes || testUnit.data.equipment.torso));
const testPouch = testInv.find(it => it.type === "pouch");
const testCoins = testInv.find(it => it.type === "gold_coin");
const coinCount = testCoins ? testCoins.count : 0;

check("test_unit_has_clothes_equipped", hasClothesEquipped,
    `Clothes equipped: slot clothes=${testUnit.data.equipment ? testUnit.data.equipment.clothes : null}, torso=${testUnit.data.equipment ? testUnit.data.equipment.torso : null}`);

check("test_unit_has_pouch", !!testPouch,
    `Pouch in inventory: ${testPouch ? "yes (id=" + testPouch.id + ")" : "no"}`);

check("test_unit_has_15_gp", coinCount === 15,
    `Gold coins in inventory: count=${coinCount} (expected 15)`);

check("coins_inside_pouch", !!testPouch && !!testCoins && testCoins.container === testPouch.id && Array.isArray(testPouch.contents) && testPouch.contents.includes(testCoins.id),
    `Coins contained in pouch: coins.container=${testCoins ? testCoins.container : null}, pouch.contents=${testPouch ? JSON.stringify(testPouch.contents) : null}`);

const carriedWeight = I.carriedWeight(testUnit.id);
check("carried_weight_exact_4_3_lbs", carriedWeight === 4.3,
    `Carried weight: ${carriedWeight} lbs (expected 3.0 clothes + 1.0 pouch + 0.3 gp = 4.3 lbs)`);

// Check 4: Non-faction creatures (e.g. wild animals) do NOT receive starting kit
const wildHare = W.addUnit({
    name: "TEST_Hare",
    area: { x: 0, y: 0 },
    x: 12, y: 12, dir: 2,
    data: { kind: "creature", species: "hare", faction: null }
});
const hareInv = I.inventoryOf(wildHare.id);
check("wild_creature_no_kit", hareInv.length === 0 && !wildHare.data.startingKitGiven,
    `Wild creature has 0 items and no starting kit: inv length=${hareInv.length}`);

// Check 5: Historical founders across all 9 factions (72 founders total)
console.log("Generating history and verifying 72 founders across 9 factions...");
const histState = { seed: 902943875, areasX: 1, areasY: 1, factions: { playerId: "f1", list: [
    { id: "f1", name: "The Arnoris Freehold", species: "human", isPlayer: true, home: { area: { x: 0, y: 0 }, x: 128, y: 128, z: 0 } },
    { id: "f2", name: "The Loren Court", species: "elf", home: { area: { x: 0, y: 0 }, x: 140, y: 140, z: 0 } },
    { id: "f3", name: "The Vasic Shire", species: "halfling", home: { area: { x: 0, y: 0 }, x: 110, y: 110, z: 0 } },
    { id: "f4", name: "The Torloror Hold", species: "dwarf", home: { area: { x: 0, y: 0 }, x: 150, y: 150, z: 0 } },
    { id: "f5", name: "The Norpelic Burrow", species: "gnome", home: { area: { x: 0, y: 0 }, x: 160, y: 160, z: 0 } },
    { id: "f6", name: "The Arnoresh Flight", species: "dragonborn", home: { area: { x: 0, y: 0 }, x: 170, y: 170, z: 0 } },
    { id: "f7", name: "The Nortoreth Enclave", species: "half_elf", home: { area: { x: 0, y: 0 }, x: 180, y: 180, z: 0 } },
    { id: "f8", name: "The Coreth Warband", species: "half_orc", home: { area: { x: 0, y: 0 }, x: 190, y: 190, z: 0 } },
    { id: "f9", name: "The Loreth House", species: "tiefling", home: { area: { x: 0, y: 0 }, x: 200, y: 200, z: 0 } }
] } };

H.generate(histState);
W.state.history = histState.history;
W.state.factions = histState.factions;
const founders = H.spawnFounders(histState);
check("founders_count_72", founders.length === 72, `Generated ${founders.length} founders across 9 factions`);

let allFoundersHaveClothes = true;
let allFoundersHavePouch = true;
let allFoundersHave15Gp = true;
let allCoinsInPouch = true;

for (const f of founders) {
    const eq = f.data && f.data.equipment;
    if (!eq || (!eq.clothes && !eq.torso)) allFoundersHaveClothes = false;

    const fInv = I.inventoryOf(f.id);
    const p = fInv.find(it => it.type === "pouch");
    if (!p) allFoundersHavePouch = false;

    const g = fInv.find(it => it.type === "gold_coin");
    if (!g || g.count !== 15) allFoundersHave15Gp = false;

    if (!p || !g || g.container !== p.id || !Array.isArray(p.contents) || !p.contents.includes(g.id)) {
        allCoinsInPouch = false;
    }
}

check("all_72_founders_have_clothes", allFoundersHaveClothes, "All 72 founders have common clothes equipped in torso/clothes");
check("all_72_founders_have_pouch", allFoundersHavePouch, "All 72 founders have a pouch in inventory");
check("all_72_founders_have_15_gp", allFoundersHave15Gp, "All 72 founders have exactly 15 gp in inventory");
check("all_72_founders_coins_in_pouch", allCoinsInPouch, "All 72 founders have their 15 gp contained within their pouch");

// Check 6: Character sheet model inspection
if (Sheet && typeof Sheet.unitModel === "function") {
    const model = Sheet.unitModel(testUnit);
    check("sheet_model_torso_common_clothes",
        model && model.equipment && model.equipment.some(e => e.slot === "torso" && (e.typeId === "common_clothes" || e.name === "Common clothes")),
        `Sheet torso slot displays common clothes`);

    check("sheet_model_inventory_grid_pouch_and_gp",
        model && model.grid && model.grid.slots &&
        model.grid.slots.some(s => s && s.typeId === "pouch") &&
        model.grid.slots.some(s => s && s.typeId === "gold_coin" && s.count === 15),
        `Sheet inventory grid contains pouch and 15 gold pieces`);
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
