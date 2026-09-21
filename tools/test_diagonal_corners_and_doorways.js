// tools/test_diagonal_corners_and_doorways.js
// Automated verification suite for Project DEUS 8-directional movement geometry:
// 1. Prohibits moving diagonally through obstacle/wall/tree corners (no corner cutting)
// 2. Prohibits moving diagonally through pinch points between two diagonal walls
// 3. Permits moving diagonally through doorways blocked on both sides by other creatures
// 4. Permits moving diagonally along or toward a wall past adjacent blocking creatures
// 5. Rule 4 mutant checks: --mutant=allow_corner_cuts, --mutant=block_doorway_diagonals

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert/strict");

const root = path.resolve(__dirname, "..");
const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);

let movementCode = fs.readFileSync(path.join(root, "game/js/plugins/UF_Movement8D.js"), "utf8");

if (mutant === "allow_corner_cuts") {
    // Mutant: allow cutting obstacle corners unconditionally
    movementCode = movementCode.replace(
        "// Neither start nor target has opposite walls: this is cutting around an obstacle/wall corner (prohibited)\n        return false;",
        "// MUTANT: allow corner cutting\n        return true;"
    );
} else if (mutant === "block_doorway_diagonals") {
    // Mutant: reject doorway diagonals when flanked by a wall
    movementCode = movementCode.replace(
        "if (startOpp || targetOpp) {\n            return true;\n        }",
        "// MUTANT: block doorway diagonals\n        if (false) return true;"
    );
}

function createHarness() {
    const width = 30;
    const height = 30;
    const walls = new Set();
    const characters = [];

    const wallKey = (x, y) => `${x},${y}`;
    const setWall = (x, y, isW = true) => {
        if (isW) walls.add(wallKey(x, y));
        else walls.delete(wallKey(x, y));
    };

    const ctx = {
        console,
        window: {},
        PluginManager: {
            parameters: () => ({
                NormalizeSpeed: "true",
                StrictCornerCutting: "true",
                FourWay: "false",
                DiagonalSlide: "true"
            })
        },
        Tilemap: {
            isWaterTile: () => false
        },
        $gameMap: {
            isValid: (x, y) => x >= 0 && x < width && y >= 0 && y < height,
            width: () => width,
            height: () => height,
            roundX: x => (x + width) % width,
            roundY: y => (y + height) % height,
            roundXWithDirection: (x, d) => {
                const dx = d === 6 || d === 3 || d === 9 ? 1 : (d === 4 || d === 1 || d === 7 ? -1 : 0);
                return (x + dx + width) % width;
            },
            roundYWithDirection: (y, d) => {
                const dy = d === 2 || d === 1 || d === 3 ? 1 : (d === 8 || d === 7 || d === 9 ? -1 : 0);
                return (y + dy + height) % height;
            },
            deltaX: (x1, x2) => x1 - x2,
            deltaY: (y1, y2) => y1 - y2,
            isPassable: (x, y, d) => !walls.has(wallKey(x, y)),
            tileId: () => 0
        },
        Game_CharacterBase: function() {
            this.x = 0;
            this.y = 0;
            this._isDiagonalMoving = false;
        },
        Game_Character: function() {
            ctx.Game_CharacterBase.call(this);
        },
        Game_Player: function() {
            ctx.Game_Character.call(this);
        },
        Game_Follower: function() {
            ctx.Game_Character.call(this);
        }
    };

    ctx.Game_Character.prototype = Object.create(ctx.Game_CharacterBase.prototype);
    ctx.Game_Player.prototype = Object.create(ctx.Game_Character.prototype);
    ctx.Game_Follower.prototype = Object.create(ctx.Game_Character.prototype);

    ctx.Game_CharacterBase.prototype.canPass = function(x, y, d) {
        const x2 = ctx.$gameMap.roundXWithDirection(x, d);
        const y2 = ctx.$gameMap.roundYWithDirection(y, d);
        if (!ctx.$gameMap.isValid(x2, y2)) return false;
        if (!ctx.$gameMap.isPassable(x, y, d)) return false;
        if (this.isCollidedWithCharacters(x2, y2)) return false;
        return true;
    };

    ctx.Game_CharacterBase.prototype.isCollidedWithCharacters = function(x, y) {
        return characters.some(c => c !== this && c.x === x && c.y === y);
    };

    ctx.Game_CharacterBase.prototype.isThrough = function() { return false; };
    ctx.Game_CharacterBase.prototype.isDebugThrough = function() { return false; };
    ctx.Game_CharacterBase.prototype.isMoving = function() { return false; };
    ctx.Game_CharacterBase.prototype.setDir8 = function() {};
    ctx.Game_CharacterBase.prototype.moveDiagonally = function() {};
    ctx.Game_CharacterBase.prototype.moveStraight = function() {};
    ctx.Game_CharacterBase.prototype.isMovementSucceeded = function() { return true; };

    vm.createContext(ctx);
    vm.runInContext(movementCode, ctx);

    const addCharacter = (x, y) => {
        const char = new ctx.Game_Character();
        char.x = x;
        char.y = y;
        characters.push(char);
        return char;
    };

    return { ctx, setWall, addCharacter, characters, walls };
}

let passed = 0, failed = 0;
function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`PASS diagonal_geometry.${name}`);
    } catch (e) {
        failed++;
        console.error(`FAIL diagonal_geometry.${name}: ${e.message}`);
    }
}

// ----------------------------------------------------------------------------
// Test 1: Corner Cut Rejection (Obstacle Corner / Tree / Wall End)
// ----------------------------------------------------------------------------
test("corner_cut_rejected_around_obstacle", () => {
    const { ctx, setWall, addCharacter } = createHarness();
    // Tree or wall at (10, 10). Surrounding cells are open grass.
    setWall(10, 10, true);

    const unit = addCharacter(9, 10);

    // From (9, 10) to (10, 9): horz=6 (East), vert=8 (North). Intermediate is (10, 10) [WALL] and (9, 9) [open].
    // Cutting around (10, 10) MUST BE REJECTED.
    const canCut = unit.canPassDiagonally(9, 10, 6, 8);
    assert.strictEqual(canCut, false, "Unit must not cut diagonally across obstacle corner from (9, 10) to (10, 9)");

    // From (10, 9) to (9, 10): horz=4 (West), vert=2 (South).
    const canCutReverse = unit.canPassDiagonally(10, 9, 4, 2);
    assert.strictEqual(canCutReverse, false, "Unit must not cut diagonally across obstacle corner from (10, 9) to (9, 10)");

    // From (10, 11) to (11, 10): horz=6 (East), vert=8 (North).
    const canCutSEtoNE = unit.canPassDiagonally(10, 11, 6, 8);
    assert.strictEqual(canCutSEtoNE, false, "Unit must not cut diagonally across obstacle corner from (10, 11) to (11, 10)");

    // Building outer corner: walls at (5, 5), (6, 5), (5, 6).
    setWall(5, 5, true);
    setWall(6, 5, true);
    setWall(5, 6, true);
    // Unit outside at (4, 5) tries to move to (5, 4):
    const canCutBuilding = unit.canPassDiagonally(4, 5, 6, 8);
    assert.strictEqual(canCutBuilding, false, "Unit must not cut diagonally around outer building corner from (4, 5) to (5, 4)");
});

// ----------------------------------------------------------------------------
// Test 2: Pinch Point Rejection (Two Diagonal Walls Touching)
// ----------------------------------------------------------------------------
test("pinch_point_between_diagonal_walls_rejected", () => {
    const { ctx, setWall, addCharacter } = createHarness();
    // Diagonal walls touching at corners: (10, 10) and (11, 11)
    setWall(10, 10, true);
    setWall(11, 11, true);

    const unit = addCharacter(10, 11);

    // Unit at (10, 11) tries to move to (11, 10):
    // Both intermediate tiles (10, 10) and (11, 11) are walls!
    const canSqueeze = unit.canPassDiagonally(10, 11, 6, 8);
    assert.strictEqual(canSqueeze, false, "Unit must not squeeze diagonally between two touching diagonal walls");
});

// ----------------------------------------------------------------------------
// Test 3: Doorway Navigation Blocked on Both Sides by Other Creatures
// ----------------------------------------------------------------------------
test("doorway_blocked_by_creatures_allows_diagonal_entry_and_exit", () => {
    const { ctx, setWall, addCharacter } = createHarness();
    // Horizontal wall along row 10 with a 1-tile doorway at (10, 10)
    setWall(8, 10, true);
    setWall(9, 10, true);
    // (10, 10) is open DOORWAY
    setWall(11, 10, true);
    setWall(12, 10, true);

    // Verify doorway geometry: (10, 10) has opposite walls West (9, 10) and East (11, 10)
    assert.strictEqual(ctx.window.UF_Dir8.hasOppositeWallsAt(10, 10), true, "Doorway at (10, 10) must have opposite walls");

    // Outside blocker: Creature 1 standing at (10, 9) (North of doorway)
    const blocker1 = addCharacter(10, 9);
    // Inside blocker: Creature 2 standing at (10, 11) (South of doorway)
    const blocker2 = addCharacter(10, 11);

    const walker = addCharacter(9, 9);

    // Step 3A: Walker at (9, 9) steps diagonally into the doorway (10, 10).
    // Flank 1 is (10, 9) [blocked by Creature 1].
    // Flank 2 is (9, 10) [WALL].
    // Target is (10, 10) [DOORWAY with opposite walls].
    const canEnterDiag = walker.canPassDiagonally(9, 9, 6, 2);
    assert.strictEqual(canEnterDiag, true, "Walker at (9, 9) must be allowed to step diagonally into doorway (10, 10)");

    // Step 3B: Walker moves into the doorway at (10, 10).
    walker.x = 10;
    walker.y = 10;

    // Step 3C: Walker inside doorway steps diagonally out to (11, 11) inside the room.
    // Flank 1 is (10, 11) [blocked by Creature 2].
    // Flank 2 is (11, 10) [WALL].
    // Start (10, 10) has opposite walls. Target (11, 11) is open.
    const canExitDiagSE = walker.canPassDiagonally(10, 10, 6, 2);
    assert.strictEqual(canExitDiagSE, true, "Walker at (10, 10) must be allowed to step diagonally out of doorway to (11, 11)");

    // Step 3D: Walker inside doorway steps diagonally out to (9, 11) inside the room.
    const canExitDiagSW = walker.canPassDiagonally(10, 10, 4, 2);
    assert.strictEqual(canExitDiagSW, true, "Walker at (10, 10) must be allowed to step diagonally out of doorway to (9, 11)");
});

test("vertical_doorway_blocked_by_creatures_allows_diagonal_navigation", () => {
    const { ctx, setWall, addCharacter } = createHarness();
    // Vertical wall along col 10 with doorway at (10, 10)
    setWall(10, 8, true);
    setWall(10, 9, true);
    // (10, 10) is open DOORWAY
    setWall(10, 11, true);
    setWall(10, 12, true);

    assert.strictEqual(ctx.window.UF_Dir8.hasOppositeWallsAt(10, 10), true, "Vertical doorway at (10, 10) has opposite walls N and S");

    // Blockers West and East of doorway
    addCharacter(9, 10);
    addCharacter(11, 10);

    const walker = addCharacter(9, 9);
    // Enter vertical doorway from (9, 9) to (10, 10):
    const canEnter = walker.canPassDiagonally(9, 9, 6, 2);
    assert.strictEqual(canEnter, true, "Walker at (9, 9) must be allowed to enter vertical doorway at (10, 10)");

    // Exit vertical doorway from (10, 10) to (11, 11):
    walker.x = 10;
    walker.y = 10;
    const canExit = walker.canPassDiagonally(10, 10, 6, 2);
    assert.strictEqual(canExit, true, "Walker at (10, 10) must be allowed to exit vertical doorway to (11, 11)");
});

// ----------------------------------------------------------------------------
// Test 4: Wall-Adjacent Diagonal Navigation Past a Blocker
// ----------------------------------------------------------------------------
test("wall_adjacent_creature_can_slip_diagonally_past_blocker", () => {
    const { ctx, setWall, addCharacter } = createHarness();
    // Continuous straight wall along row 8: (8, 8), (9, 8), (10, 8), (11, 8), (12, 8)
    for (let x = 8; x <= 12; x++) setWall(x, 8, true);

    // Walker is at (9, 9). North is wall (9, 8) (wall on one side of walker!).
    const walker = addCharacter(9, 9);
    assert.strictEqual(ctx.window.UF_Dir8.wallCountAt(9, 9), 1, "Walker at (9, 9) has 1 wall to the North");

    // Blocker stands at (10, 9) along the wall
    addCharacter(10, 9);

    // Walker steps diagonally to (10, 10) (South-East, into room):
    // Flank 1 is (10, 9) [Blocker].
    // Flank 2 is (9, 10) [open floor].
    // Target is (10, 10) [open floor].
    const canSlipAway = walker.canPassDiagonally(9, 9, 6, 2);
    assert.strictEqual(canSlipAway, true, "Walker with wall on North side must be allowed to step diagonally past blocker to (10, 10)");

    // Reverse: Walker at (10, 10) steps diagonally to (9, 9) towards the wall:
    walker.x = 10;
    walker.y = 10;
    const canSlipToward = walker.canPassDiagonally(10, 10, 4, 8);
    assert.strictEqual(canSlipToward, true, "Walker at (10, 10) must be allowed to step diagonally towards wall to (9, 9)");
});

test("wall_adjacent_with_both_flanks_blocked_by_creatures_allows_diagonal", () => {
    const { ctx, setWall, addCharacter } = createHarness();
    // Wall along row 8
    for (let x = 8; x <= 12; x++) setWall(x, 8, true);

    // Walker at (9, 9) has a wall to the North at (9, 8)
    const walker = addCharacter(9, 9);

    // Both East and South are blocked by creatures
    addCharacter(10, 9); // East
    addCharacter(9, 10); // South

    // Target (10, 10) is open floor.
    // Walker has a wall on one side (North); allowed to slip diagonally past the blockers.
    const canSlip = walker.canPassDiagonally(9, 9, 6, 2);
    assert.strictEqual(canSlip, true, "Walker along wall must be allowed to step diagonally even if both orthogonal neighbours have creatures");
});

// ----------------------------------------------------------------------------
// Test 5: Open Field Diagonal Movement Past a Single Blocker
// ----------------------------------------------------------------------------
test("open_field_allows_diagonal_past_single_blocker", () => {
    const { ctx, addCharacter } = createHarness();
    // In an open field with NO walls anywhere near:
    const walker = addCharacter(15, 15);
    // Blocker at (16, 15)
    addCharacter(16, 15);

    // Walker steps to (16, 16): Flank 1 is (16, 15) [blocker], Flank 2 is (15, 16) [open]
    const canStep = walker.canPassDiagonally(15, 15, 6, 2);
    assert.strictEqual(canStep, true, "Walker in open field can step diagonally past a single blocker");
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
