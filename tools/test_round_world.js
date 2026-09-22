"use strict";
// test_round_world.js - Automated verification of round / toroidal world wrapping
const fs = require("fs"), path = require("path"), vm = require("vm");

let passed = 0, failed = 0, skipped = 0;
function check(name, cond, info) {
    if (cond) {
        passed++;
        console.log(`PASS round_world.${name}${info ? `: ${info}` : ""}`);
    } else {
        failed++;
        console.error(`FAIL round_world.${name}${info ? `: ${info}` : ""}`);
    }
}

// Load plugins in test sandbox
const gameDir = path.join(__dirname, "../game");
const catalogPath = path.join(gameDir, "data/UF_WorldCatalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

// Support mutation flags for Rule 4
const mutateScroll = process.argv.includes("--mutate-scroll");
const mutateDelta = process.argv.includes("--mutate-delta");

// Core mock environment
const mockDataMap = {
    width: 256, height: 256,
    data: new Int32Array(256 * 256 * 6),
    events: [null],
    ufObjects: new Uint16Array(256 * 256),
    scrollType: 3
};

const mockGameMap = {
    _width: 256, _height: 256,
    _displayX: 0, _displayY: 0,
    width() { return this._width; },
    height() { return this._height; },
    isLoopHorizontal() { return mutateScroll ? false : true; },
    isLoopVertical() { return mutateScroll ? false : true; },
    roundX(x) { return this.isLoopHorizontal() ? ((x % this._width) + this._width) % this._width : x; },
    roundY(y) { return this.isLoopVertical() ? ((y % this._height) + this._height) % this._height : y; },
    roundXWithDirection(x, d) { return this.roundX(x + (d === 6 ? 1 : d === 4 ? -1 : 0)); },
    roundYWithDirection(y, d) { return this.roundY(y + (d === 2 ? 1 : d === 8 ? -1 : 0)); },
    xWithDirection(x, d) { return x + (d === 6 ? 1 : d === 4 ? -1 : 0); },
    yWithDirection(y, d) { return y + (d === 2 ? 1 : d === 8 ? -1 : 0); },
    isValid(x, y) { return x >= 0 && x < this._width && y >= 0 && y < this._height; },
    isPassable(x, y, d) { return true; },
    tileId(x, y, z) { return 0; },
    adjustX(x) {
        if (this.isLoopHorizontal() && x < this._displayX - (this.width() - 17) / 2) {
            return x - this._displayX + this.width();
        }
        return x - this._displayX;
    },
    adjustY(y) {
        if (this.isLoopVertical() && y < this._displayY - (this.height() - 13) / 2) {
            return y - this._displayY + this.height();
        }
        return y - this._displayY;
    },
    mapId() { return 1; },
    screenTileX() { return 17; },
    screenTileY() { return 13; }
};

const mockPlayer = {
    _x: 0, _y: 0,
    _realX: 0, _realY: 0,
    _direction: 2,
    x: 0, y: 0,
    isTransferring() { return false; },
    canPass(x, y, d) {
        const x2 = mockGameMap.roundXWithDirection(x, d);
        const y2 = mockGameMap.roundYWithDirection(y, d);
        return mockGameMap.isValid(x2, y2) && mockGameMap.isPassable(x, y, d) && mockGameMap.isPassable(x2, y2, 10 - d);
    },
    reverseDir(d) { return 10 - d; },
    moveStraight(d) {
        if (sandbox.tryViewEdge && sandbox.tryViewEdge(this, d === 6 ? 1 : d === 4 ? -1 : 0, d === 2 ? 1 : d === 8 ? -1 : 0)) return;
        if (this.canPass(this._x, this._y, d)) {
            this._direction = d;
            this._x = mockGameMap.roundXWithDirection(this._x, d);
            this._y = mockGameMap.roundYWithDirection(this._y, d);
            this.x = this._x;
            this.y = this._y;
        }
    },
    moveDiagonally(horz, vert) {
        if (sandbox.tryViewEdge && sandbox.tryViewEdge(this, horz === 6 ? 1 : -1, vert === 2 ? 1 : -1)) return;
        this._x = mockGameMap.roundXWithDirection(this._x, horz);
        this._y = mockGameMap.roundYWithDirection(this._y, vert);
        this.x = this._x;
        this.y = this._y;
    },
    direction() { return this._direction; }
};

const sandbox = {
    console,
    Math,
    Int32Array,
    Uint16Array,
    Uint8Array,
    Float64Array,
    performance: { now: () => Date.now() },
    window: {},
    $ufWorldCatalog: catalog,
    // DEUS_WorldGen.js runs `window.$ufWorldCatalog = window.$deusWorldCatalog;` at load and its catalog()
    // reads $deusWorldCatalog first, so both names must point at the parsed catalog.
    $deusWorldCatalog: catalog,
    $dataMap: mockDataMap,
    $gameMap: mockGameMap,
    $gamePlayer: mockPlayer,
    Tilemap: {
        isTileA1: () => false,
        isWaterTile: () => false,
        TILE_ID_A1: 2048,
        TILE_ID_A2: 2816,
        FLOOR_AUTOTILE_TABLE: Array.from({ length: 48 }, () => [[0, 0]])
    },
    ImageManager: {
        isBigCharacter: () => true,
        loadCharacter: () => ({ isReady: () => true, width: 144, height: 192 }),
        loadTileset: () => ({ isReady: () => true, width: 768, height: 768 })
    },
    PluginManager: {
        parameters: () => ({})
    },
    TouchInput: {
        x: 0, y: 0,
        isPressed: () => false,
        isTriggered: () => false
    },
    Graphics: {
        boxWidth: 816,
        boxHeight: 624
    },
    $gameTemp: {},
    $gameSystem: {},
    $gameScreen: {},
    $gameVariables: { value: () => 0, setValue: () => {} },
    $gameSwitches: { value: () => false, setValue: () => {} },
    Sprite: function() { this.anchor = { set: () => {} }; this.setFrame = () => {}; },
    Spriteset_Map: function() {},
    Game_Map: function() {},
    Game_Player: function() {},
    // DEUS_World.js aliases Game_Event.prototype.isCollidedWithEvents / isCollidedWithPlayerCharacters and reads
    // Game_CharacterBase.prototype.isCollidedWithEvents at load; the classes only need to exist.
    Game_Event: function() {},
    Game_CharacterBase: function() {},
    Scene_Boot: function() {},
    DataManager: {
        isBattleTest: () => false,
        isEventTest: () => false,
        _databaseFiles: []
    }
};
sandbox.window = sandbox;
// DEUS_*.js plugins run `window.DEUS = window.DEUS || {}; window.UF = window.DEUS;` at load.
// Pre-create the namespace so every plugin attaches to the same object the harness reads.
sandbox.UF = sandbox.UF || {};
sandbox.DEUS = sandbox.UF;
sandbox.Spriteset_Map.prototype = { createCharacters: () => {} };
sandbox.Game_Map.prototype = mockGameMap;
sandbox.Game_Player.prototype = mockPlayer;
sandbox.Scene_Boot.prototype = { start: () => {} };

// Run DEUS_World, DEUS_Objects, DEUS_WorldGen.
// Since the 2026-09-22 rename (commit 0544ef0) the UF_*.js files are forwarders that only call
// PluginManager.loadScript inside RMMZ, so the real sources are the DEUS_*.js files.
// Roads was archived to archive/plugins and no check here used it, so it is no longer loaded.
const worldSrc = fs.readFileSync(path.join(gameDir, "js/plugins/DEUS_World.js"), "utf8");
const objSrc = fs.readFileSync(path.join(gameDir, "js/plugins/DEUS_Objects.js"), "utf8");
const genSrc = fs.readFileSync(path.join(gameDir, "js/plugins/DEUS_WorldGen.js"), "utf8");

vm.createContext(sandbox);
vm.runInContext(worldSrc, sandbox, { filename: "DEUS_World.js" });
vm.runInContext(objSrc, sandbox, { filename: "DEUS_Objects.js" });
vm.runInContext(genSrc, sandbox, { filename: "DEUS_WorldGen.js" });

const W = sandbox.UF.World;
const O = sandbox.UF.Objects;
const WG = sandbox.UF.WorldGen;

// Initialize world state
W.newWorld(12345);

// Test 1: Map configuration has scrollType 3 and parallax looping
const builtArea = W.buildArea(0, 0);
check("map_scroll_type_3", builtArea.scrollType === 3 && builtArea.parallaxLoopX === true && builtArea.parallaxLoopY === true,
    `scrollType=${builtArea.scrollType}, parallaxLoopX=${builtArea.parallaxLoopX}, parallaxLoopY=${builtArea.parallaxLoopY}`);

check("game_map_loop_enabled", mockGameMap.isLoopHorizontal() && mockGameMap.isLoopVertical(),
    "Game_Map loops both horizontally and vertically");

// Test 2: Player East-West wrapping
mockPlayer._x = 255; mockPlayer._y = 100; mockPlayer.x = 255; mockPlayer.y = 100;
mockPlayer.moveStraight(6); // Step East
check("player_wrap_east_to_west", mockPlayer.x === 0 && mockPlayer.y === 100,
    `Player moved East from 255 to ${mockPlayer.x}`);

mockPlayer._x = 0; mockPlayer._y = 100; mockPlayer.x = 0; mockPlayer.y = 100;
mockPlayer.moveStraight(4); // Step West
check("player_wrap_west_to_east", mockPlayer.x === 255 && mockPlayer.y === 100,
    `Player moved West from 0 to ${mockPlayer.x}`);

// Test 3: Player North-South wrapping
mockPlayer._x = 100; mockPlayer._y = 255; mockPlayer.x = 100; mockPlayer.y = 255;
mockPlayer.moveStraight(2); // Step South
check("player_wrap_south_to_north", mockPlayer.x === 100 && mockPlayer.y === 0,
    `Player moved South from 255 to ${mockPlayer.y}`);

mockPlayer._x = 100; mockPlayer._y = 0; mockPlayer.x = 100; mockPlayer.y = 0;
mockPlayer.moveStraight(8); // Step North
check("player_wrap_north_to_south", mockPlayer.x === 100 && mockPlayer.y === 255,
    `Player moved North from 0 to ${mockPlayer.y}`);

// Test 4: Corner diagonal wrapping
mockPlayer._x = 255; mockPlayer._y = 255; mockPlayer.x = 255; mockPlayer.y = 255;
mockPlayer.moveDiagonally(6, 2); // South-East
check("player_wrap_southeast_corner", mockPlayer.x === 0 && mockPlayer.y === 0,
    `Player moved diagonally SE from (255, 255) to (${mockPlayer.x}, ${mockPlayer.y})`);

mockPlayer._x = 0; mockPlayer._y = 0; mockPlayer.x = 0; mockPlayer.y = 0;
mockPlayer.moveDiagonally(4, 8); // North-West
check("player_wrap_northwest_corner", mockPlayer.x === 255 && mockPlayer.y === 255,
    `Player moved diagonally NW from (0, 0) to (${mockPlayer.x}, ${mockPlayer.y})`);

// Test 5: Pathfinding shortest toroidal path across seams
// Clear path cells in builtArea
const area0 = { x: 0, y: 0 };
const path1 = W.findPath(area0, 255, 100, 1, 100);
check("path_across_horizontal_seam", path1 && path1.length === 2,
    `Expected 2 steps from (255, 100) to (1, 100) across seam, got ${path1 ? path1.length : 'none'}`);

const path2 = W.findPath(area0, 100, 255, 100, 1);
check("path_across_vertical_seam", path2 && path2.length === 2,
    `Expected 2 steps from (100, 255) to (100, 1) across seam, got ${path2 ? path2.length : 'none'}`);

// Test 6: Direction calculations across seams
if (path1 && path1.length === 2) {
    const firstStep = path1[0];
    check("path_first_step_is_x_0", firstStep.x === 0 && firstStep.y === 100, `First step after 255 is x=${firstStep.x}, y=${firstStep.y}`);
}

// Test 7: Unit movement goalDelta wrapping
// goalDelta() is a closure-local function inside DEUS_World.js (lines ~1280-1300); it is not exported on World or
// window, and never was (checked at 4430f7e too). The earlier fallback literal { dx: 1, dist: 4 } was a hardcoded
// pass (Rule 4), so the check now runs only when the plugin actually exposes the function and is SKIPped otherwise.
const u = {
    id: 1,
    area: { x: 0, y: 0 },
    x: 254, y: 50,
    goal: { area: { x: 0, y: 0 }, x: 2, y: 50 }
};
const goalDeltaFn = typeof W.goalDelta === "function" ? W.goalDelta
    : typeof sandbox.goalDelta === "function" ? sandbox.goalDelta : null;
if (goalDeltaFn) {
    const delta = goalDeltaFn(u);
    if (mutateDelta) {
        delta.dx = -1;
    }
    check("unit_goal_delta_toroidal", delta.dx === 1 && delta.dist === 4,
        `Toroidal delta from 254 to 2: dx=${delta.dx}, dist=${delta.dist}`);
} else {
    skipped++;
    console.log("SKIP: round_world.unit_goal_delta_toroidal - DEUS_World.js does not export goalDelta (closure-local); "
        + "nothing to call, so --mutate-delta has nothing to mutate");
}


// Test 9: Object passability wrapping
mockDataMap.ufObjects[100 * 256 + 0] = 5; // Suppose cell (0, 100) has an object
const blocks0 = O.blocks(0, 100);
const blocks256 = O.blocks(256, 100);
check("object_blocks_at_wrapped_coord", blocks0 === blocks256,
    `blocks(0, 100) === blocks(256, 100) (${blocks0} === ${blocks256})`);

console.log(`\nRESULT: ${passed} passed, ${failed} failed, ${skipped} skipped`);
if (failed > 0) process.exit(1);
