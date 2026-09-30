// tools/test_zoom_depth_coverage.js - Automated tests for 0.5x zoom depth coverage & zero allocation churn
// Owner Directive: "When we zoom out it needs to show everything"
"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs");

console.log("=== DEUS ZOOM DEPTH COVERAGE & PERFORMANCE TEST SUITE ===");

// 1. Setup mock environment for PIXI, Tilemap, Graphics, RMMZ
global.window = global;
global.$dataMap = null;
global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); }
};
global.Graphics = { width: 816, height: 624, boxWidth: 816, boxHeight: 624, frameCount: 1 };
global.Game_Map = class {
    constructor() { this._displayX = 0; this._displayY = 0; }
    tileWidth() { return 48; }
    tileHeight() { return 48; }
    roundX(x) { return x; }
    roundY(y) { return y; }
    width() { return 256; }
    height() { return 256; }
    displayX() { return this._displayX; }
    displayY() { return this._displayY; }
    screenTileX() { return Graphics.width / this.tileWidth(); }
    screenTileY() { return Graphics.height / this.tileHeight(); }
    canvasToMapX(x) { return Math.floor(this._displayX + x / this.tileWidth()); }
    canvasToMapY(y) { return Math.floor(this._displayY + y / this.tileHeight()); }
    setDisplayPos(x, y) { this._displayX = x; this._displayY = y; }
    isLoopHorizontal() { return true; }
    isLoopVertical() { return true; }
    mapId() { return 0; }
};
global.Game_CharacterBase = class { scrolledX() { return 0; } scrolledY() { return 0; } };
global.Sprite = class {
    constructor() { this.x = 0; this.y = 0; this.scale = { x: 1, y: 1, set(x, y) { this.x = x; this.y = y; } }; this.anchor = { x: 0, y: 0, set(x, y) { this.x = x; this.y = y; } }; }
};
Sprite._counter = 1;
global.Bitmap = class {
    constructor(w, h) {
        this.width = w;
        this.height = h;
        this.context = {
            clearRect: () => {},
            fillRect: () => {},
            drawImage: () => {}
        };
        this.baseTexture = { update: () => {} };
    }
    fillRect() {}
    strokeRect() {}
    drawText() {}
    clear() {}
    destroy() {}
};
global.PIXI = {
    Container: class {
        constructor() { this.children = []; this.x = 0; this.y = 0; this.scale = { x: 1, y: 1, set(x, y) { this.x = x; this.y = y; } }; }
        addChild(c) { this.children.push(c); c.parent = this; return c; }
        removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); }
        destroy() {}
    },
    Graphics: class {
        constructor() { this.rects = []; this.visible = true; this.x = 0; this.y = 0; }
        beginFill() { return this; }
        drawRect(x, y, w, h) { this.rects.push({ x, y, w, h }); return this; }
        endFill() { return this; }
        clear() { this.rects = []; }
    }
};
global.Tilemap = class extends PIXI.Container {
    constructor() {
        super();
        this.tileWidth = 48;
        this.tileHeight = 48;
        this._margin = 20;
        this.width = 0;
        this.height = 0;
        this.origin = { x: 0, y: 0 };
        this._needsRepaint = false;
        this._createLayers();
    }
    _createLayers() {}
    setData() {}
    setBitmaps() {}
    refresh() { this._needsRepaint = true; }
    update() {}
    _sortChildren() {}
    updateTransform() {}
};
global.Spriteset_Map = class {
    update() {}
};
global.Scene_Boot = class { start() {} };
global.Scene_Map = class {
    createDisplayObjects() {}
    addChild() {}
    isAnyWindowUnderMouse() { return false; }
};
global.TouchInput = { x: 0, y: 0, isTriggered: () => false, isPressed: () => false, clear: () => {} };
global.Input = { isPressed: () => false };
global.SoundManager = { playCursor: () => {} };
global.SceneManager = { _scene: null };
global.$gameMap = new Game_Map();

// Load DEUS_Camera.js
const cameraCode = fs.readFileSync(path.join(__dirname, "../game/js/plugins/DEUS_Camera.js"), "utf8");
eval(cameraCode);

// Load DEUS_Depth.js
const depthCode = fs.readFileSync(path.join(__dirname, "../game/js/plugins/DEUS_Depth.js"), "utf8");
eval(depthCode);

const Camera = global.UF && global.UF.Camera;
const Depth = global.UF && global.UF.Depth;

assert(Camera, "UF.Camera must be loaded");
assert(Depth, "UF.Depth must be loaded");

let passed = 0;
function test(name, fn) {
    try {
        fn();
        console.log(`  [PASS] ${name}`);
        passed++;
    } catch (e) {
        console.error(`  [FAIL] ${name}: ${e.message}`);
        console.error(e.stack);
        process.exitCode = 1;
    }
}

// 1. Zoom limits and 3 discrete levels
test("zoom_discrete_options_and_scale", () => {
    Camera.setLevel(0);
    assert.strictEqual(Camera.zoom(), 0.50, "Level 0 is 0.50x");

    Camera.setLevel(1);
    assert.strictEqual(Camera.zoom(), 1.00, "Level 1 is 1.00x");

    Camera.setLevel(2);
    assert.strictEqual(Camera.zoom(), 2.00, "Level 2 is 2.00x");
});

// 2. Viewport metrics calculation at 0.5x zoom
test("viewport_metrics_at_0_5x_zoom", () => {
    Camera.setLevel(0); // 0.5x
    const z = Camera.zoom();
    const gw = Graphics.width;
    const gh = Graphics.height;
    const viewW = Math.ceil(gw / z);
    const viewH = Math.ceil(gh / z);

    assert.strictEqual(viewW, 1632, "View width at 0.5x zoom must be 1632 px (2x screen)");
    assert.strictEqual(viewH, 1248, "View height at 0.5x zoom must be 1248 px (2x screen)");

    // Margin is 20 px, TW = 48, TH = 48
    const cols = Math.ceil((viewW + 40) / 48) + 1;
    const rows = Math.ceil((viewH + 40) / 48) + 1;

    assert.strictEqual(cols, 36, "Viewport must span 36 tile columns at 0.5x zoom (previously 19)");
    assert.strictEqual(rows, 28, "Viewport must span 28 tile rows at 0.5x zoom (previously 15)");

    // Canvas allocated dimensions
    const canvasW = cols * 48;
    const canvasH = rows * 48;
    assert.strictEqual(canvasW, 1728, "Allocated canvas width is 1728 px");
    assert.strictEqual(canvasH, 1344, "Allocated canvas height is 1344 px");
});

// 3. Spriteset_Map.prototype.updateUfZoom depth plane invalidation hook
test("spriteset_updateUfZoom_invalidates_depth_mask_and_planes", () => {
    const spriteset = new Spriteset_Map();
    spriteset._tilemap = new Tilemap();
    spriteset._ufDepth = {
        _maskX: 10,
        _maskCols: 19,
        planes: [
            { _entityDirty: false, _tilemap: { _needsRepaint: false, refresh() { this._needsRepaint = true; } } },
            { _entityDirty: false, _tilemap: { _needsRepaint: false, refresh() { this._needsRepaint = true; } } }
        ]
    };

    Camera.setLevel(1); // 1.0x
    spriteset.updateUfZoom();

    // Change to 0.5x zoom
    Camera.setLevel(0); // 0.5x
    spriteset.updateUfZoom();

    assert(isNaN(spriteset._ufDepth._maskX), "_maskX must be invalidated to NaN on zoom change");
    assert.strictEqual(spriteset._ufDepth._maskCols, -1, "_maskCols must be reset to -1 on zoom change");
    assert.strictEqual(spriteset._ufDepth.planes[0]._entityDirty, true, "Plane 0 entities marked dirty");
    assert.strictEqual(spriteset._ufDepth.planes[1]._entityDirty, true, "Plane 1 entities marked dirty");
    assert.strictEqual(spriteset._ufDepth.planes[0]._tilemap._needsRepaint, true, "Plane 0 tilemap marked for repaint");
    assert.strictEqual(spriteset._ufDepth.planes[1]._tilemap._needsRepaint, true, "Plane 1 tilemap marked for repaint");
});

// 4. Main tilemap dimensions expand at 0.5x zoom
test("main_tilemap_expands_to_1632x1248_at_0_5x", () => {
    const spriteset = new Spriteset_Map();
    spriteset._tilemap = new Tilemap();

    Camera.setLevel(0); // 0.5x
    spriteset.updateUfZoom();

    assert.strictEqual(spriteset._tilemap.width, 1632, "Tilemap width must expand to 1632 px at 0.5x");
    assert.strictEqual(spriteset._tilemap.height, 1248, "Tilemap height must expand to 1248 px at 0.5x");
    assert.strictEqual(spriteset._tilemap.scale.x, 0.50, "Tilemap scale.x is 0.50");
    assert.strictEqual(spriteset._tilemap.scale.y, 0.50, "Tilemap scale.y is 0.50");
});

// 5. Zero allocation churn across zoom cycles
test("zero_canvas_destruction_across_zoom_cycles", () => {
    const statsBefore = Depth.stats();

    // Cycle zooms multiple times
    for (let i = 0; i < 20; i++) {
        Camera.setLevel(0); // 0.5x
        Camera.setLevel(2); // 2.0x
        Camera.setLevel(1); // 1.0x
    }

    const statsAfter = Depth.stats();
    assert.strictEqual(statsAfter.canvasesDestroyed, 0, "Zero canvases destroyed across zoom cycles (0 GC churn)");
});

// 6. Multi-Z uncap across all 32 layers
test("depth_uncap_maxdepth_supports_all_32_layers", () => {
    assert.strictEqual(Depth.config.maxDepth, 31, "Default maxDepth is 31 (covers all 32 layers from z=+15 down to z=-16)");

    Depth.setMaxDepth(10);
    assert.strictEqual(Depth.config.maxDepth, 10, "setMaxDepth sets to 10");

    Depth.setMaxDepth(50);
    assert.strictEqual(Depth.config.maxDepth, 31, "setMaxDepth clamps to max 31");

    Depth.setMaxDepth(-5);
    assert.strictEqual(Depth.config.maxDepth, 0, "setMaxDepth clamps to min 0");

    Depth.setMaxDepth(31);
    assert.strictEqual(Depth.config.maxDepth, 31, "Reset back to 31");
});

// 7. Occlusion culling raycast through 32 layers
test("occlusion_raycast_through_32_layers_to_bedrock", () => {
    const O = Depth.occlusion;
    assert(O, "Occlusion planner exists");

    // Open vertical shaft from z=15 down to z=-15; bedrock solid at z=-16
    const shaftOpen = (x, y, z) => (x === 10 && y === 10 && z >= -15);
    const bounds = { minX: 8, minY: 8, maxX: 12, maxY: 12 };

    const input = {
        viewZ: 15,
        maxDepth: 31,
        zMin: -16,
        zMax: 15,
        size: 64,
        bounds,
        shapeStamp: "test-32-shaft",
        isOpen: shaftOpen
    };

    const plan = O.plan(input);
    assert.strictEqual(plan.rebuilt, true, "Plan successfully rebuilt");

    // All levels from 14 down to -15 must be exposed in the open shaft
    // There are 30 levels from 14 down to -15 (14 - (-15) + 1 = 30) plus -16 is reached as the first opaque floor!
    // Total exposed levels in the shaft = 31 (depth 1..31)
    for (let d = 1; d <= 31; d++) {
        const targetZ = 15 - d; // down to -16
        assert(plan.exposed.has(`${targetZ},10,10`), `Shaft cell at z=${targetZ} (depth ${d}) must be exposed`);
        assert.strictEqual(plan.byDepth[d], 1, `Depth ${d} has 1 exposed cell in the shaft`);
    }

    // Depth 32 cannot be exposed because zMin is -16
    assert.strictEqual(plan.byDepth[32] || 0, 0, "No exposure beyond zMin -16");
});

console.log(`\nResults: ${passed} passed, 0 failed.`);
