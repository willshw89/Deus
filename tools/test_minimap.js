//=============================================================================
// test_minimap.js - Headless & automated verification for DEUS_Minimap
//=============================================================================
"use strict";

const fs = require("fs");
const path = require("path");

console.log("=== DEUS Minimap (TASK UI-MAP-01) Headless Verification Suite ===");

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
    if (condition) {
        passed++;
        console.log(`PASS minimap.${name} - ${detail}`);
        return true;
    } else {
        failed++;
        console.error(`FAIL minimap.${name} - ${detail}`);
        return false;
    }
}

// 1. Mock minimal browser & RMMZ environment
global.window = global;
global.Graphics = { boxWidth: 816, boxHeight: 624, width: 816, height: 624 };
global.TouchInput = { x: 0, y: 0, isTriggered: () => false, isPressed: () => false, update: () => {} };
global.PluginManager = {
    parameters: () => ({}),
    loadScript: () => {},
    _scripts: ["DEUS_Minimap"]
};

// Mock Bitmap and Context
class MockImageData {
    constructor(w, h) {
        this.width = w;
        this.height = h;
        this.data = new Uint8Array(w * h * 4);
    }
}

class MockContext {
    createImageData(w, h) { return new MockImageData(w, h); }
    putImageData() {}
    clearRect() {}
    fillRect() {}
    strokeRect() {}
    beginPath() {}
    arc() {}
    fill() {}
    stroke() {}
    fillText() {}
    measureText(text) { return { width: text.length * 6 }; }
}

class MockBitmap {
    constructor(w, h) {
        this.width = w;
        this.height = h;
        this.context = new MockContext();
        this._baseTexture = { update: () => {} };
    }
    fillAll() {}
    clear() {}
    fillRect() {}
    strokeRect() {}
    drawText() {}
}
global.Bitmap = MockBitmap;

class MockSprite {
    constructor(b) {
        this.bitmap = b;
        this.children = [];
        this.scale = { x: 1, y: 1, set(x, y) { this.x = x; this.y = y; } };
        this.visible = true;
        this.x = 0;
        this.y = 0;
    }
    addChild(c) { this.children.push(c); }
    update() {}
}
global.Sprite = MockSprite;

class MockScene_Map {
    createAllWindows() {}
}
global.Scene_Map = MockScene_Map;

global.DataManager = {
    makeSaveContents: () => ({}),
    extractSaveContents: () => {}
};

// Mock DEUS World
global.UF = {
    World: {
        currentArea: () => ({ x: 0, y: 0 }),
        viewLevel: () => ({ x: 0, y: 0, z: 0 }),
        groundAt: (x, y) => ({ kind: (x < 10 ? "water" : "meadow") }),
        state: {
            size: 256,
            units: [
                { id: 1, x: 50, y: 50, z: 0, data: { faction: "player", kind: "colonist" } },
                { id: 2, x: 200, y: 200, z: 0, data: { faction: "wild", kind: "monster", tags: ["hostile"] } },
                { id: 3, x: 30, y: 30, z: -1, data: { faction: "wild", kind: "monster", tags: ["hostile"] } }
            ]
        }
    },
    Levels: {
        view: () => 0,
        shapeAt: ({ z }) => (z < 0 ? "solid" : "open")
    },
    NaturalConnections: {
        listConnectors: z => (z === 0 ? [{ x: 45, y: 45, type: "ramp" }] : [{ x: 45, y: 45, type: "stairs_down" }])
    },
    Objects: {
        atIn: (area, x, y) => {
            if (x === 60 && y === 60) return { id: "wall_stone", tags: ["wall"] };
            if (x === 61 && y === 60) return { id: "door_wood", tags: ["door"] };
            return null;
        }
    },
    Projects: {
        activeProjects: () => [{ x: 70, y: 70, w: 4, h: 4, z: 0, state: "active" }]
    },
    Select: {
        selectedUnit: () => ({ id: 1 })
    },
    Stance: {
        of: u => ((u && u.data && u.data.tags && u.data.tags.includes("hostile")) ? "hostile" : "friendly")
    },
    Fog: {
        isVisible: (x, y, z) => (x >= 40 && x <= 60 && y >= 40 && y <= 60 && z === 0)
    },
    Events: {
        on: () => {}
    }
};
global.DEUS = global.UF;

global.$gameMap = {
    width: () => 256,
    height: () => 256,
    displayX: () => 40,
    displayY: () => 40,
    screenTileX: () => 17,
    screenTileY: () => 13
};

// Load DEUS_Minimap.js
const minimapFile = path.resolve(__dirname, "..", "game", "js", "plugins", "DEUS_Minimap.js");
const code = fs.readFileSync(minimapFile, "utf8");
eval(code);

const Minimap = UF.Minimap;

// Run Test Suite
check("api_loaded", !!Minimap && typeof Minimap.explore === "function", "Minimap API is present and loaded");

// Scenario A: Discovery
const unexp = Minimap.isExplored(100, 100, 0);
check("discovery_initial_unexplored", unexp === false, "Cell (100,100,0) starts as UNKNOWN");

Minimap.explore(100, 100, 4, 0);
const expAfter = Minimap.isExplored(100, 100, 0);
check("discovery_revealed", expAfter === true, "Cell (100,100,0) is DISCOVERED after explore()");

const expNeighbour = Minimap.isExplored(102, 102, 0);
check("discovery_radius_explored", expNeighbour === true, "Radius explore correctly marked neighbour (102,102,0)");

// Scenario B: Z-Layer Isolation
const zMinus1 = Minimap.isExplored(100, 100, -1);
const zPlus1 = Minimap.isExplored(100, 100, 1);
check("z_layer_isolation_neg1", zMinus1 === false, "Discovery on Z0 does NOT reveal Z-1");
check("z_layer_isolation_pos1", zPlus1 === false, "Discovery on Z0 does NOT reveal Z+1");

Minimap.explore(100, 100, 2, -1);
check("z_layer_neg1_discovered", Minimap.isExplored(100, 100, -1) === true, "Z-1 cell becomes discovered independently");
check("z_layer_neg2_still_unexplored", Minimap.isExplored(100, 100, -2) === false, "Z-2 remains unexplored");

// Flush initial initialization chunks so map is completely clean
Minimap.processDirty(0);
check("initial_chunks_flushed", Minimap.stats().dirtyCount === 0, "Initial startup chunks cleanly flushed to base bitmap");

// Scenario C: Geometry Invalidation (Build Wall)
const statsBefore = Minimap.stats();
Minimap.invalidate(60, 60, 0);
const statsAfter = Minimap.stats();
check("geometry_invalidation_dirty", statsAfter.dirtyCount === 1, `Building wall at (60,60,0) dirties exactly 1 chunk (${statsAfter.dirtyCount} dirty chunk)`);

const rebuilt = Minimap.processDirty(0);
check("chunk_rebuild_success", rebuilt === 1, `Dirty chunk successfully rebuilt (${rebuilt} chunk rebuilt)`);
check("chunk_now_clean", Minimap.stats().dirtyCount === 0, "All chunks are clean after rebuild");

// Scenario D: Destruction (Dig / Remove Wall)
Minimap.invalidate(60, 60, 0);
check("destruction_invalidation", Minimap.stats().dirtyCount === 1, "Digging cell dirties exactly 1 chunk (16x16)");
Minimap.processDirty(0);

// Scenario E: Performance / No Unnecessary Redraw
const rebuildsBefore = Minimap.stats().dirtyRebuilds;
// Simulate panning camera 50 times
for (let i = 0; i < 50; i++) {
    $gameMap.displayX = () => 40 + i * 0.1;
    $gameMap.displayY = () => 40 + i * 0.1;
    Minimap.processDirty(0);
}
const rebuildsAfter = Minimap.stats().dirtyRebuilds;
check("camera_pan_no_rebuild", rebuildsBefore === rebuildsAfter, `Camera panning triggered 0 base rebuilds (${rebuildsBefore} == ${rebuildsAfter})`);

// Scenario F: Save / Reload Roundtrip
const saveContents = DataManager.makeSaveContents();
check("save_state_contains_minimap", !!saveContents.ufWorld && !!saveContents.ufWorld.minimapDiscovery, "Save contents include minimapDiscovery bitset");

// Simulate new session
Minimap.explore(150, 150, 1, 0);
const beforeReload = Minimap.isExplored(150, 150, 0);
// Extract original save
DataManager.extractSaveContents(saveContents);
const afterReload = Minimap.isExplored(150, 150, 0);
check("reload_restores_exact_state", afterReload === false && Minimap.isExplored(100, 100, 0) === true, "Reload accurately restored saved discovery state and discarded unsaved cells");

// Scenario G: Hostile Knowledge Leak Prevention
// Colonist at (50,50,0) in visible range [40..60]
// Monster #2 at (200,200,0) outside visible range
const isMonster2Visible = UF.Fog.isVisible(200, 200, 0);
check("hostile_out_of_sight", isMonster2Visible === false, "Hostile at (200,200,0) is outside line of sight");

// Scenario H (WG.00.09b K2): one base bitmap per Z. Switching back to a Z tab that is already built repaints nothing
// (the old setter dirtied all 256 chunks on every switch: 32 frames at 8 chunks a frame); a tab never built is filled
// once; a cell change on a tab that is not shown still reaches that tab.
Minimap.activeZ = 0;
Minimap.processDirty(0);
Minimap.activeZ = -1;
const dirtyFirstVisit = Minimap.stats().dirtyCount;
Minimap.processDirty(0);
Minimap.activeZ = 0;
const dirtyBack = Minimap.stats().dirtyCount;
check("z_switch_back_no_full_redirty", dirtyFirstVisit === 256 && dirtyBack === 0,
    `first visit of the -1 tab dirties ${dirtyFirstVisit} chunk(s) (want 256, built once); back on the built Z0 tab: ${dirtyBack} dirty chunk(s) (want 0)`);
Minimap.activeZ = -1;
Minimap.invalidate(20, 20, 0);
Minimap.activeZ = 0;
const dirtyChanged = Minimap.stats().dirtyCount;
check("z_switch_keeps_offtab_changes", dirtyChanged === 1, `a Z0 cell changed while the -1 tab was shown: ${dirtyChanged} dirty chunk(s) on returning to Z0 (want 1)`);
Minimap.processDirty(0);

// Scenario I (WG.00.09b K2): a tab samples its own level. The mock wall at (60,60) exists on Z0 only; the -1 tab must draw
// the -1 cell (solid rock in the mock), never Z0's wall (the old sampleCell read objects from the level on screen).
const puts = new Map();
const putBefore = MockContext.prototype.putImageData;
MockContext.prototype.putImageData = function(img, x, y) { puts.set(`${x},${y}`, img); };
const atInBefore = UF.Objects.atIn;
UF.Objects.atIn = (area, x, y) => (area && area.z === 0 ? atInBefore(area, x, y) : null);
const pixelAt = (x, y) => { const img = puts.get(`${(x >> 4) * 16},${(y >> 4) * 16}`); if (!img) return null; const i = ((y & 15) * 16 + (x & 15)) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
Minimap.explore(60, 60, 1, 0);
Minimap.explore(60, 60, 1, -1);
Minimap.processDirty(0);                  // Z0 tab
const onZ0 = pixelAt(60, 60);
Minimap.activeZ = -1;
Minimap.processDirty(0);                  // -1 tab
const onZm1 = pixelAt(60, 60);
Minimap.activeZ = 0;
const STONE_WALL = [148, 163, 184], SOLID_WALL = [71, 85, 105];
check("tab_samples_its_own_level", same(onZ0, STONE_WALL) && !!onZm1 && !same(onZm1, STONE_WALL) && same(onZm1, SOLID_WALL),
    `(60,60): Z0 tab ${onZ0 ? onZ0.join(",") : "not drawn"} (want the wall ${STONE_WALL.join(",")}); -1 tab ${onZm1 ? onZm1.join(",") : "not drawn"} (want the -1 rock ${SOLID_WALL.join(",")}, never Z0's wall)`);
UF.Objects.atIn = atInBefore;
MockContext.prototype.putImageData = putBefore;

// Scenario J (WG.00.09b K4): the overlay (every unit of the world and a texture upload) is redrawn at most every 4 updates
// while the view is still, and at once when the camera moves (the old sprite redrew it on every update).
const hudScene = new MockScene_Map();
hudScene.addChild = () => {};
hudScene.createDeusMinimap();
const hud = hudScene._deusMinimap;
let redraws = 0;
const redrawInner = hud.updateOverlay;
hud.updateOverlay = function() { redraws++; return redrawInner.call(this); };
$gameMap.displayX = () => 40;
$gameMap.displayY = () => 40;
hud.update();
redraws = 0;
for (let i = 0; i < 12; i++) hud.update();
const stillRedraws = redraws;
redraws = 0;
$gameMap.displayX = () => 41;
hud.update();
const moveRedraws = redraws;
check("overlay_throttled", stillRedraws >= 2 && stillRedraws <= 3 && moveRedraws === 1,
    `12 updates with a still camera redrew the overlay ${stillRedraws} time(s) (want 2-3, every 4th update); a camera move redrew it ${moveRedraws} time(s) in that update (want 1)`);

// Test negative / mutant fixtures
Minimap.invalidate(-10, -50, 0);
Minimap.explore(-20, -30, 5, 0);
check("negative_coords_safe", true, "Negative coordinates (-10,-50) handled safely without crash");

Minimap.activeZ = 15;
check("z_clamped_high", Minimap.activeZ === 2, "Z=15 correctly clamped to +2");
Minimap.activeZ = -99;
check("z_clamped_low", Minimap.activeZ === -2, "Z=-99 correctly clamped to -2");
Minimap.activeZ = 0;

console.log("\n======================================================");
console.log(`RESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
console.log("======================================================");

process.exit(failed === 0 ? 0 : 1);
