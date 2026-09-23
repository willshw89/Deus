// tools/test_upper_elevation_terrain.js - Automated verification suite for DEUS-TSK-GEMINI-06
// Verifies:
// 1. Elevation field determinism across identical seeds.
// 2. Guaranteed flat camp clearing (S = 0 for r <= 12).
// 3. Volumetric layer integrity: z < S is SOLID rock/soil, z = S is FLOOR or RAMP, z > S is OPEN air.
// 4. Substantial Z+1 traversable surface area.
// 5. Substantial contiguous Z+2 plateau (>= 1,500 cells on 256x256 map).
// 6. Bidirectional natural ramps connecting single-step elevation transitions (deltaS = 1).
// 7. Surface object anchoring: flora, trees, boulders, and kit items anchor to actual surface (S === z), never on ramps.
// 8. 3D multi-Z pathfinding: A* finds continuous 3D paths connecting Z0 <-> Z1 <-> Z2.
// 9. Unit multi-Z traversal: unit walks cross-level along ramps, updating u.z without teleportation, preserving unit state.
// 10. Vertical cliff blocking: sheer cliffs without ramps or stairs are strictly impassable.
// 11. Elevation mutation persistence: modifying Z+1/Z+2 cells persists across save/load state.
// 12. Backward compatibility: worlds generated with gen: 3 preserve legacy behavior.
// 13. Rule 4 mutant negative controls.

"use strict";

const fs = require("fs");
const path = require("path");

const mutant = process.argv.find(arg => arg.startsWith("--mutant="))?.split("=")[1] || (process.argv.includes("--mutant") ? "default" : null);

// Setup RMMZ environment mock
global.window = global;
const ROOT = path.resolve(__dirname, "..");
const catalogData = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));
global.$ufWorldCatalog = catalogData;
global.$deusWorldCatalog = catalogData;
global.$dataWorldCatalog = catalogData;

global.ImageManager = { loadCharacter: () => ({ isReady: () => true }), loadTileset: () => ({ isReady: () => true }) };
global.Sprite = function() { this.anchor = { set: () => {} }; this.visible = true; };
global.Bitmap = function() { return { isReady: () => true, blt: () => {} }; };
global.PluginManager = { parameters: () => ({}), registerCommand: () => {} };
global.Input = { keyMapper: {} };
global.TouchInput = { isTriggered: () => false, clear: () => {}, x: 0, y: 0 };
global.SoundManager = { playCursor: () => {} };
global.Utils = { encodeURI: s => s };
global.Tilemap = { isWaterTile: () => false, TILE_ID_A1: 2048, TILE_ID_A2: 2816, TILE_ID_A4: 4352, FLOOR_AUTOTILE_TABLE: Array.from({ length: 48 }, () => [[0, 0], [0, 0], [0, 0], [0, 0]]) };
global.DataManager = { isBattleTest: () => false, isEventTest: () => false, _databaseFiles: [] };
global.$dataTilesets = [];
global.Scene_Boot = { prototype: { start: () => {} } };
global.SceneManager = { _scene: null };
global.Scene_Map = function() {};
global.Scene_Map.prototype = { createDisplayObjects: () => {} };
global.Spriteset_Map = function() {};
global.Game_System = function() {};
global.Game_System.prototype = { windowOpacity: () => 192 };
global.$gameSystem = new Game_System();
global.Game_CharacterBase = function() {};
global.Game_CharacterBase.prototype = {};
global.Game_Character = function() {};
global.Game_Character.prototype = Object.create(Game_CharacterBase.prototype);
global.Game_Player = function() {};
global.Game_Player.prototype = Object.create(Game_Character.prototype);
global.Game_Player.prototype.isTransferring = () => false;
global.Game_Player.prototype.reserveTransfer = () => {};
global.Game_Player.prototype.direction = () => 2;
global.Game_Player.prototype.moveStraight = () => {};
global.Game_Player.prototype.moveDiagonally = () => {};
global.Game_Player.prototype.performTransfer = () => {};
global.$gamePlayer = new Game_Player();

global.Game_Event = function() {};
global.Game_Event.prototype = Object.create(Game_Character.prototype);
global.Game_Event.prototype.isCollidedWithEvents = () => false;
global.Game_Event.prototype.isCollidedWithPlayerCharacters = () => false;
global.Game_Event.prototype.isThrough = () => false;
global.Game_Event.prototype.locate = function(x, y) { this.x = x; this.y = y; };
global.Game_Event.prototype.setDirection = function(d) { this._direction = d; };
global.Game_Event.prototype.direction = function() { return this._direction || 2; };
global.Game_Event.prototype.moveStraight = function(d) {
    if (d === 2) this.y++;
    else if (d === 4) this.x--;
    else if (d === 6) this.x++;
    else if (d === 8) this.y--;
    this._movementSuccess = true;
};
global.Game_Event.prototype.moveDiagonally = function(h, v) {
    if (h === 4) this.x--;
    else if (h === 6) this.x++;
    if (v === 2) this.y++;
    else if (v === 8) this.y--;
    this._movementSuccess = true;
};
global.Game_Event.prototype.isMovementSucceeded = function() { return this._movementSuccess !== false; };
global.Game_Event.prototype.isStopping = function() { return true; };
global.Game_Event.prototype.isMoving = function() { return false; };
global.Game_Event.prototype.isCollidedWithCharacters = function() { return false; };

global.Game_Map = function() {};
global.Game_Map.prototype = {
    isPassable: () => true,
    tilesetFlags: () => [],
    isLoopHorizontal: () => false,
    isLoopVertical: () => false,
    tileId: () => 0,
    mapId: () => 1000,
    eventsXyNt: () => []
};
global.$gameMap = new Game_Map();
global.$gameMap._events = {};
global.$dataMap = { width: 256, height: 256, data: new Int32Array(256 * 256 * 6), ufObjects: new Uint16Array(256 * 256), events: [] };

// Load plugins under test in correct dependency order
require(path.join(ROOT, "game", "js", "plugins", "DEUS_World.js"));
require(path.join(ROOT, "game", "js", "plugins", "DEUS_Levels.js"));
require(path.join(ROOT, "game", "js", "plugins", "DEUS_WorldGen.js"));

const L = UF.Levels;
const W = UF.World;
const G = UF.WorldGen;

let passes = 0, fails = 0;
function check(name, condition, extra = "") {
    if (condition) {
        passes++;
        console.log(`PASS ${name} ${extra}`);
    } else {
        fails++;
        console.log(`FAIL ${name} ${extra}`);
    }
}

console.log(`=== DEUS-TSK-GEMINI-06 Verification Suite ===`);
if (mutant) console.log(`[MUTANT MODE: ${mutant}]`);

// --------------------------------------------------------------------------
// 1. Elevation Field Determinism
// --------------------------------------------------------------------------
{
    const seed = 20260923;
    let match = true;
    for (let y = 0; y < 64; y += 4) {
        for (let x = 0; x < 64; x += 4) {
            const s1 = L.surfaceElevationAt(x, y, seed);
            const s2 = L.surfaceElevationAt(x, y, seed);
            if (s1 !== s2) { match = false; break; }
        }
    }
    check("determinism_same_seed", match);

    // Different seeds should differ
    let differs = false;
    for (let y = 20; y < 64; y += 4) {
        for (let x = 20; x < 64; x += 4) {
            const s1 = L.surfaceElevationAt(x, y, 12345);
            const s2 = L.surfaceElevationAt(x, y, 98765);
            if (s1 !== s2) { differs = true; break; }
        }
    }
    check("determinism_different_seeds_vary", differs);
}

// --------------------------------------------------------------------------
// 2. Guaranteed Flat Camp Clearing
// --------------------------------------------------------------------------
{
    const seeds = [20260923, 424242, 999999, 101, 7777777];
    let allCampFlat = true;
    for (const s of seeds) {
        const cx = 128, cy = 128;
        for (let dy = -12; dy <= 12; dy++) {
            for (let dx = -12; dx <= 12; dx++) {
                if (dx * dx + dy * dy <= 144) {
                    const elev = L.surfaceElevationAt(cx + dx, cy + dy, s);
                    if (elev !== 0) {
                        allCampFlat = false;
                        break;
                    }
                }
            }
        }
    }
    check("starter_clearing_flat_datum_zero", allCampFlat);
}

// --------------------------------------------------------------------------
// 3. Volumetric Layer Integrity
// --------------------------------------------------------------------------
{
    const seed = 20260923;
    W.newWorld(seed);

    // Apply mutant: open_air
    if (mutant === "open_air") {
        const origBaseline = L.baseline;
        L.baseline = function(z, ax, ay) {
            const b = origBaseline.call(this, z, ax, ay);
            if (z === 0) b.shape.fill(3); // force OPEN air below surface
            return b;
        };
    }

    const b0 = L.baseline(0, 0, 0);
    const b1 = L.baseline(1, 0, 0);
    const b2 = L.baseline(2, 0, 0);
    const SOLID = 1, FLOOR = 2, OPEN = 3, RAMP = 4;

    let volumetricOk = true;
    let sampleCount = 0;
    for (let y = 0; y < 256; y += 8) {
        for (let x = 0; x < 256; x += 8) {
            const i = y * 256 + x;
            const S = L.surfaceElevationAt(x, y, seed);

            // Test Z = 0
            if (0 < S) {
                if (b0.shape[i] !== SOLID) volumetricOk = false;
            } else if (0 === S) {
                if (b0.shape[i] !== FLOOR && b0.shape[i] !== RAMP) volumetricOk = false;
            } else if (0 > S) {
                if (b0.shape[i] !== OPEN) volumetricOk = false;
            }

            // Test Z = 1
            if (1 < S) {
                if (b1.shape[i] !== SOLID) volumetricOk = false;
            } else if (1 === S) {
                if (b1.shape[i] !== FLOOR && b1.shape[i] !== RAMP) volumetricOk = false;
            } else if (1 > S) {
                if (b1.shape[i] !== OPEN) volumetricOk = false;
            }

            // Test Z = 2
            if (2 === S) {
                if (b2.shape[i] !== FLOOR && b2.shape[i] !== RAMP) volumetricOk = false;
            } else if (2 > S) {
                if (b2.shape[i] !== OPEN) volumetricOk = false;
            }
            sampleCount++;
        }
    }
    check("volumetric_layer_integrity", volumetricOk, `(tested ${sampleCount} coordinate columns across Z0, Z1, Z2)`);
}

// --------------------------------------------------------------------------
// 4 & 5. Upper-Z Presence and Contiguous Usable Z+2 Plateau
// --------------------------------------------------------------------------
{
    const seed = 20260923;
    let z0 = 0, z1 = 0, z2 = 0;
    const z2Grid = new Uint8Array(256 * 256);

    // Apply mutant: flat_terrain
    if (mutant === "flat_terrain") {
        L.surfaceElevationAt = () => 0;
    }

    for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 256; x++) {
            const S = L.surfaceElevationAt(x, y, seed);
            if (S === 0) z0++;
            else if (S === 1) z1++;
            else if (S === 2) {
                z2++;
                z2Grid[y * 256 + x] = 1;
            }
        }
    }

    check("upper_z1_presence", z1 >= 1000, `(Z1 cells = ${z1})`);
    check("upper_z2_presence", z2 >= 1500, `(Z2 cells = ${z2})`);

    // Calculate largest contiguous Z+2 component
    const visited = new Uint8Array(256 * 256);
    let maxComponent = 0;
    for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 256; x++) {
            const idx = y * 256 + x;
            if (z2Grid[idx] && !visited[idx]) {
                let size = 0;
                const queue = [idx];
                visited[idx] = 1;
                while (queue.length > 0) {
                    const c = queue.pop();
                    size++;
                    const cx = c % 256, cy = Math.floor(c / 256);
                    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                        const nx = cx + dx, ny = cy + dy;
                        if (nx >= 0 && nx < 256 && ny >= 0 && ny < 256) {
                            const nidx = ny * 256 + nx;
                            if (z2Grid[nidx] && !visited[nidx]) {
                                visited[nidx] = 1;
                                queue.push(nidx);
                            }
                        }
                    }
                }
                if (size > maxComponent) maxComponent = size;
            }
        }
    }

    check("contiguous_z2_plateau_size", maxComponent >= 1500, `(Largest contiguous Z+2 plateau = ${maxComponent} cells, required >= 1,500)`);
}

// --------------------------------------------------------------------------
// 6. Natural Ramps Connecting Single-Step Elevation (ΔS = 1)
// --------------------------------------------------------------------------
{
    const b0 = L.baseline(0, 0, 0);
    const b1 = L.baseline(1, 0, 0);
    const RAMP = 4;

    let rampsZ0 = 0, rampsZ1 = 0;
    for (let i = 0; i < 256 * 256; i++) {
        if (b0.shape[i] === RAMP) rampsZ0++;
        if (b1.shape[i] === RAMP) rampsZ1++;
    }

    check("natural_ramps_z0_to_z1", rampsZ0 > 10, `(Found ${rampsZ0} ramps connecting Z0 to Z1)`);
    check("natural_ramps_z1_to_z2", rampsZ1 > 10, `(Found ${rampsZ1} ramps connecting Z1 to Z2)`);
}

// --------------------------------------------------------------------------
// 7. Surface Object Anchoring
// --------------------------------------------------------------------------
{
    const seed = 20260923;
    W.newWorld(seed);
    const map0 = W.peekArea(0, 0, 0);
    const map1 = W.peekArea(0, 0, 1);
    const map2 = W.peekArea(0, 0, 2);

    let misplacedObjects = 0;
    let placedCount = 0;

    const checkLevelObjects = (map, levelZ) => {
        const objs = map.ufObjects;
        for (let y = 0; y < 256; y++) {
            for (let x = 0; x < 256; x++) {
                const typeId = objs[y * 256 + x];
                if (typeId > 0) {
                    placedCount++;
                    const S = L.surfaceElevationAt(x, y, seed);
                    const shape = L.shapeAt(0, 0, x, y, levelZ);
                    // Must be placed only where S === levelZ and shape is not RAMP
                    if (S !== levelZ || shape === "ramp" || shape === 4) {
                        misplacedObjects++;
                    }
                }
            }
        }
    };

    checkLevelObjects(map0, 0);
    checkLevelObjects(map1, 1);
    checkLevelObjects(map2, 2);

    check("surface_objects_anchored_to_elevation", misplacedObjects === 0 && placedCount > 100,
        `(Placed objects = ${placedCount}, Misplaced = ${misplacedObjects})`);
}

// --------------------------------------------------------------------------
// 8 & 9. 3D Multi-Z Pathfinding and Unit Traversal
// --------------------------------------------------------------------------
{
    const seed = 20260923;
    W.newWorld(seed);

    // Apply mutant: no_ramps
    if (mutant === "no_ramps") {
        const origShapeCodeAt = L.shapeCodeAt;
        L.shapeCodeAt = function(...args) {
            const s = origShapeCodeAt ? origShapeCodeAt.apply(this, args) : 2;
            return s === 4 ? 2 : s;
        };
        const origShapeAt = L.shapeAt;
        L.shapeAt = function(...args) {
            const s = origShapeAt.apply(this, args);
            return s === "ramp" ? "floor" : (s === 4 ? 2 : s);
        };
    }

    // Pick a reachable Z2 plateau target
    let target = null;
    for (let y = 0; y < 256; y += 4) {
        for (let x = 0; x < 256; x += 4) {
            if (L.surfaceElevationAt(x, y, seed) === 2 && Math.hypot(x - 128, y - 128) > 30) {
                target = { x, y, z: 2 };
                break;
            }
        }
        if (target) break;
    }
    if (!target) target = { x: 128, y: 128, z: 2 };

    const pathUp = W.findPath({ x: 0, y: 0 }, 128, 128, target.x, target.y, { z: 0, tz: 2 });
    check("3d_pathfinding_z0_to_z2_found", !!pathUp && pathUp.length > 0, `(Steps = ${pathUp ? pathUp.length : 0})`);

    let transitionsUp = 0;
    if (pathUp) {
        transitionsUp = pathUp.filter((s, i) => i > 0 && s.z !== pathUp[i - 1].z).length;
    }
    check("3d_pathfinding_multi_z_transitions", transitionsUp >= 2, `(Z transitions = ${transitionsUp})`);

    // Reverse path down
    const pathDown = W.findPath({ x: 0, y: 0 }, target.x, target.y, 128, 128, { z: 2, tz: 0 });
    check("3d_pathfinding_z2_to_z0_found", !!pathDown && pathDown.length > 0, `(Steps = ${pathDown ? pathDown.length : 0})`);

    // Physical unit traversal along 3D path
    const unit = W.addUnit({
        id: 10,
        name: "Climber",
        x: 128,
        y: 128,
        z: 0,
        area: { x: 0, y: 0 },
        kind: "colonist"
    });

    const goalObj = { area: { x: 0, y: 0 }, x: target.x, y: target.y, z: target.z };
    const sent = W.sendUnit(unit.id, goalObj);
    check("send_unit_cross_level_accepted", sent === true);

    // Apply mutant: teleport
    if (mutant === "teleport") {
        unit.z = 2; // cheat
    }

    const zSeen = new Set([unit.z]);
    let ticks = 0;
    while (ticks < 2000 && (unit.x !== target.x || unit.y !== target.y || unit.z !== target.z)) {
        W.update();
        ticks++;
        zSeen.add(unit.z);
    }

    check("unit_reached_z2_target_without_teleport", unit.z === 2 && zSeen.has(0) && zSeen.has(1) && zSeen.has(2),
        `(Arrived at (${unit.x}, ${unit.y}, Z=${unit.z}) in ${ticks} ticks, visited levels: ${Array.from(zSeen).join(", ")})`);

    // Walk back to camp
    W.sendUnit(unit.id, { area: { x: 0, y: 0 }, x: 128, y: 128, z: 0 });
    let ticksBack = 0;
    while (ticksBack < 2000 && (unit.x !== 128 || unit.y !== 128 || unit.z !== 0)) {
        W.update();
        ticksBack++;
    }

    check("unit_returned_to_z0_camp", unit.z === 0 && unit.x === 128 && unit.y === 128,
        `(Returned to (${unit.x}, ${unit.y}, Z=${unit.z}) in ${ticksBack} ticks)`);
}

// --------------------------------------------------------------------------
// 10. Vertical Cliff Blocking
// --------------------------------------------------------------------------
{
    const seed = 20260923;
    // Find a cliff cell where S changes from 0 to 1 without a ramp
    let cliffCell = null;
    for (let y = 1; y < 255; y++) {
        for (let x = 1; x < 255; x++) {
            const s0 = L.surfaceElevationAt(x, y, seed);
            if (s0 === 0 && L.shapeCodeAt(0, 0, x, y, 0) === 2) { // flat floor on Z0
                for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                    const nx = x + dx, ny = y + dy;
                    const sn = L.surfaceElevationAt(nx, ny, seed);
                    if (sn === 1 && L.shapeCodeAt(0, 0, nx, ny, 0) === 1) { // solid rock cliff face on Z0
                        cliffCell = { x, y, nx, ny };
                        break;
                    }
                }
            }
            if (cliffCell) break;
        }
        if (cliffCell) break;
    }

    let cliffBlocked = true;
    if (cliffCell) {
        // Attempt horizontal path on Z=0 straight into the solid cliff
        const pathDirect = W.findPath({ x: 0, y: 0 }, cliffCell.x, cliffCell.y, cliffCell.nx, cliffCell.ny, { z: 0, tz: 0, resolveBlocked: false });
        if (pathDirect !== null) cliffBlocked = false;

        // Apply mutant: cliff_pass
        if (mutant === "cliff_pass") {
            cliffBlocked = false;
        }
    }
    check("cliff_face_blocks_passage", cliffBlocked && cliffCell !== null,
        `(Cliff at (${cliffCell?.x},${cliffCell?.y}) -> (${cliffCell?.nx},${cliffCell?.ny}) blocks transit)`);
}

// --------------------------------------------------------------------------
// 11. Elevation Mutation Persistence
// --------------------------------------------------------------------------
{
    const area = { x: 0, y: 0 };
    // Mutate a cell on Z=2: excavate / set shape
    const tx = 50, ty = 50;
    const oldShape = L.shapeCodeAt(area.x, area.y, tx, ty, 2);
    L.setShape({ area, x: tx, y: ty, z: 2 }, 2); // set floor
    const newShape = L.shapeCodeAt(area.x, area.y, tx, ty, 2);
    check("elevation_mutation_applied", newShape === 2);

    // Save and reload state simulation
    const serialized = JSON.stringify(W.state);
    const restored = JSON.parse(serialized);
    W.state = restored;

    const restoredShape = L.shapeCodeAt(area.x, area.y, tx, ty, 2);
    check("elevation_mutation_persisted", restoredShape === 2);
}

// --------------------------------------------------------------------------
// 12. Backward Compatibility
// --------------------------------------------------------------------------
{
    // Worlds generated with version <= 3 should preserve flat behavior
    const legacyState = {
        version: 3,
        seed: 12345,
        areasX: 1,
        areasY: 1,
        size: 96,
        startArea: { x: 0, y: 0 },
        levels: {
            "0": { z: 0, gen: 3, checksum: null, cells: {} },
            "1": { z: 1, gen: 3, checksum: null, cells: {} },
            "2": { z: 2, gen: 3, checksum: null, cells: {} }
        },
        units: {},
        nextUnitId: 1,
        diffs: {},
        objectDiffs: {}
    };
    W.state = legacyState;

    const p = W.findPath({ x: 0, y: 0 }, 10, 10, 20, 20, { z: 0 });
    check("legacy_gen3_backward_compatibility", !!p && p.length > 0 && p[0].z === undefined,
        `(Legacy path returns 2D coordinates)`);
}

// --------------------------------------------------------------------------
// Summary & Exit Code
// --------------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`Results: ${passes} passed, ${fails} failed.`);
console.log(`========================================`);

if (fails > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
