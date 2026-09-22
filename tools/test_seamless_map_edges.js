"use strict";
// test_seamless_map_edges.js - Automated verification of seamless map edge alignment and toroidal continuity
const fs = require("fs"), path = require("path"), vm = require("vm");

let passed = 0, failed = 0;
function check(name, cond, info) {
    if (cond) {
        passed++;
        console.log(`PASS seamless_edges.${name}${info ? `: ${info}` : ""}`);
    } else {
        failed++;
        console.error(`FAIL seamless_edges.${name}${info ? `: ${info}` : ""}`);
    }
}

const mutateRiver = process.argv.includes("--mutate-river");
const mutateNoise = process.argv.includes("--mutate-noise");
const mutateTemp = process.argv.includes("--mutate-temp");
const mutateFog = process.argv.includes("--mutate-fog");

const gameDir = path.join(__dirname, "../game");
const catalogPath = path.join(gameDir, "data/UF_WorldCatalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

const mockDataMap = {
    width: 256, height: 256,
    data: new Int32Array(256 * 256 * 6),
    events: [null],
    ufObjects: new Uint16Array(256 * 256),
    scrollType: 3
};

const mockGameMap = {
    _width: 64, _height: 64,
    _displayX: 0, _displayY: 0,
    width() { return this._width; },
    height() { return this._height; },
    tileWidth() { return 48; },
    tileHeight() { return 48; },
    isLoopHorizontal() { return true; },
    isLoopVertical() { return true; },
    displayX() { return this._displayX; },
    displayY() { return this._displayY; },
    mapId() { return 1; }
};

const sandbox = {
    console,
    Math,
    Int32Array,
    Int8Array,
    Uint16Array,
    Uint8Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    Map,
    Set,
    JSON,
    btoa: str => Buffer.from(str, "binary").toString("base64"),
    atob: b64 => Buffer.from(b64, "base64").toString("binary"),
    performance: { now: () => Date.now() },
    window: {},
    $ufWorldCatalog: catalog,
    // DEUS_WorldGen.js runs `window.$ufWorldCatalog = window.$deusWorldCatalog;` at load and its catalog()
    // reads $deusWorldCatalog first, so both names must point at the parsed catalog.
    $deusWorldCatalog: catalog,
    $dataMap: mockDataMap,
    $gameMap: mockGameMap,
    $gamePlayer: { x: 32, y: 32, z: 0 },
    $gameSystem: {},
    Tilemap: {
        TILE_ID_A1: 2048,
        TILE_ID_A2: 2816,
        FLOOR_AUTOTILE_TABLE: Array.from({ length: 48 }, () => [[0, 0]])
    },
    PluginManager: {
        parameters: () => ({ Enabled: "true", SightRadius: "8", ExploredDim: "150" })
    },
    PIXI: {
        Texture: { EMPTY: {} }
    },
    Graphics: {
        width: 816,
        height: 624
    },
    Bitmap: function(w, h) {
        this.width = w; this.height = h;
        this.smooth = false;
        this.context = {
            createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
            putImageData: () => {}
        };
        this._baseTexture = { update: () => {} };
    },
    Sprite: function(b) {
        this.bitmap = b;
        this.scale = { x: 1, y: 1, set: function(x, y) { this.x = x; this.y = y; } };
        this.children = [];
        this.addChild = function(c) { this.children.push(c); };
        this.x = 0; this.y = 0; this.visible = true;
    },
    Spriteset_Map: function() { this._tilemap = new sandbox.Sprite(); },
    Game_Map: function() {},
    Game_Player: function() {},
    // DEUS_World.js aliases Game_Event.prototype.isCollidedWithEvents / isCollidedWithPlayerCharacters and reads
    // Game_CharacterBase.prototype.isCollidedWithEvents at load; the classes only need to exist.
    Game_Event: function() {},
    Game_CharacterBase: function() {},
    Scene_Boot: function() {},
    ImageManager: {
        loadTileset: () => ({ isReady: () => true, width: 768, height: 768 })
    },
    DataManager: {
        isBattleTest: () => false,
        isEventTest: () => false,
        _databaseFiles: []
    }
};
sandbox.window = sandbox;
let currentZoom = 1;
sandbox.UF = {
    Camera: {
        zoom: () => currentZoom
    }
};
// DEUS_*.js plugins run `window.DEUS = window.DEUS || {}; window.UF = window.DEUS;` at load.
// Alias DEUS to the mock namespace so the Camera mock survives and every plugin attaches to it.
sandbox.DEUS = sandbox.UF;
sandbox.Sprite.prototype.update = function() {};
sandbox.Spriteset_Map.prototype = { createCharacters: () => {} };
sandbox.Game_Map.prototype = mockGameMap;
sandbox.Game_Player.prototype = {
    moveStraight: () => {},
    moveDiagonally: () => {},
    locate: () => {}
};

// Load core plugins.
// Since the 2026-09-22 rename (commit 0544ef0) the UF_*.js files are forwarders that only call
// PluginManager.loadScript inside RMMZ, so the real sources are the DEUS_*.js files.
const worldSrc = fs.readFileSync(path.join(gameDir, "js/plugins/DEUS_World.js"), "utf8");
const objSrc = fs.readFileSync(path.join(gameDir, "js/plugins/DEUS_Objects.js"), "utf8");
const genSrc = fs.readFileSync(path.join(gameDir, "js/plugins/DEUS_WorldGen.js"), "utf8");
const tileSrc = fs.readFileSync(path.join(gameDir, "js/plugins/DEUS_Tiles.js"), "utf8");
const fogSrc = fs.readFileSync(path.join(gameDir, "js/plugins/DEUS_Fog.js"), "utf8");

vm.createContext(sandbox);
vm.runInContext(worldSrc, sandbox, { filename: "DEUS_World.js" });
vm.runInContext(objSrc, sandbox, { filename: "DEUS_Objects.js" });
vm.runInContext(genSrc, sandbox, { filename: "DEUS_WorldGen.js" });
vm.runInContext(tileSrc, sandbox, { filename: "DEUS_Tiles.js" });
vm.runInContext(fogSrc, sandbox, { filename: "DEUS_Fog.js" });

const WG = sandbox.UF.WorldGen;
const W = sandbox.UF.World;
const Fog = sandbox.UF.Fog;

// 1. Noise Toroidal Continuity Across Boundary
console.log("\n--- Section 1: Lattice Noise Toroidal Wrapping ---");
{
    const seed = 4242;
    const sizes = [16, 32, 64, 128, 256];
    let allNoiseMatch = true;
    let maxDiff = 0;

    for (const sz of sizes) {
        for (let salt = 1; salt <= 5; salt++) {
            const scale = 32.0;
            for (let x = 0; x < sz; x += 4) {
                let n0 = WG.valueNoise(seed, salt, x, 0, scale, sz, sz);
                let nH = WG.valueNoise(seed, salt, x, sz, scale, sz, sz);
                if (mutateNoise) nH += 0.5; // intentional mutation
                const diff = Math.abs(n0 - nH);
                if (diff > maxDiff) maxDiff = diff;
                if (diff > 1e-6) allNoiseMatch = false;
            }
            for (let y = 0; y < sz; y += 4) {
                let n0 = WG.valueNoise(seed, salt, 0, y, scale, sz, sz);
                let nW = WG.valueNoise(seed, salt, sz, y, scale, sz, sz);
                const diff = Math.abs(n0 - nW);
                if (diff > maxDiff) maxDiff = diff;
                if (diff > 1e-6) allNoiseMatch = false;
            }
        }
    }
    check("lattice_noise_toroidal_continuity", allNoiseMatch, `max boundary difference: ${maxDiff}`);
}

// 2. River Continuity Across Boundary
console.log("\n--- Section 2: River Seam Alignment ---");
{
    const sizes = [16, 32, 64, 128, 256];
    let allRiversContinuous = true;
    let maxCenterDiff = 0;
    let maxSlopeDiff = 0;
    let waterSetMatches = true;

    for (const sz of sizes) {
        W.state = { seed: 9999, size: sz, areasX: 1, areasY: 1, startArea: { x: 0, y: 0 } };
        const rivers = WG.riverModels(W.state);
        check(`rivers_generated_size_${sz}`, rivers.length > 0, `river count: ${rivers.length}`);

        for (let ri = 0; ri < rivers.length; ri++) {
            const r = rivers[ri];
            let c0 = r.center(0);
            let cH = r.center(sz);
            if (mutateRiver) cH += 15.0; // intentional mutation
            const centerDiff = Math.abs(c0 - cH);
            if (centerDiff > maxCenterDiff) maxCenterDiff = centerDiff;
            if (centerDiff > 1e-5) allRiversContinuous = false;

            // Check derivative continuity (slope)
            const eps = 0.05;
            const slope0 = (r.center(eps) - r.center(-eps)) / (2 * eps);
            const slopeH = (r.center(sz + eps) - r.center(sz - eps)) / (2 * eps);
            const slopeDiff = Math.abs(slope0 - slopeH);
            if (slopeDiff > maxSlopeDiff) maxSlopeDiff = slopeDiff;
            if (slopeDiff > 1e-4) allRiversContinuous = false;

            // Check that isWater at (gx, 0) matches (gx, sz)
            for (let gx = 0; gx < sz; gx++) {
                const w0 = r.isWater(gx, 0);
                const wH = r.isWater(gx, sz);
                if (w0 !== wH) waterSetMatches = false;
            }
        }
    }
    check("river_center_continuity_y0_to_yH", allRiversContinuous, `max center diff: ${maxCenterDiff}, max slope diff: ${maxSlopeDiff}`);
    check("river_water_tiles_match_across_seam", waterSetMatches, "river water cells at y=0 connect 1:1 to y=H");
}

// 3. Climate and Elevation Fields Continuity
console.log("\n--- Section 3: Climate and Elevation Seam Alignment ---");
{
    const sz = 64;
    W.state = { seed: 54321, size: sz, areasX: 1, areasY: 1, startArea: { x: 0, y: 0 } };
    const d = WG.dims(W.state);
    const cl = catalog.climate;
    let allFieldsMatch = true;
    let maxFieldDiff = 0;

    for (let gx = 0; gx < sz; gx += 2) {
        const f0 = WG.fieldsFor(W.state.seed, d, cl, gx, 0);
        const fH = WG.fieldsFor(W.state.seed, d, cl, gx, sz);
        if (mutateTemp) fH.t += 0.5;

        for (const k of ["e", "r", "t", "d", "v", "sav", "al"]) {
            const diff = Math.abs(f0[k] - fH[k]);
            if (diff > maxFieldDiff) maxFieldDiff = diff;
            if (diff > 1e-5) allFieldsMatch = false;
        }
    }
    check("climate_fields_continuity", allFieldsMatch, `elevation and climate fields match at y=0 and y=H (max diff: ${maxFieldDiff})`);

    // Verify polar temperature symmetry: North (y=0) and South (y=sz-1) are both cold
    const fNorth = WG.fieldsFor(W.state.seed, d, cl, 32, 0);
    const fSouth = WG.fieldsFor(W.state.seed, d, cl, 32, sz - 1);
    const fEquator = WG.fieldsFor(W.state.seed, d, cl, 32, Math.floor(sz / 2));
    const isPolarSymmetric = Math.abs(fNorth.t - fSouth.t) < 0.05 && fEquator.t > fNorth.t;
    check("temperature_equator_polar_symmetry", isPolarSymmetric,
        `North pole temp: ${fNorth.t.toFixed(3)}, South pole temp: ${fSouth.t.toFixed(3)}, Equator temp: ${fEquator.t.toFixed(3)}`);
}

// 4. Autotile and Dryness Shading Boundary Alignment
console.log("\n--- Section 4: Autotiling and Shading Continuity ---");
{
    const sz = 64;
    W.newWorld(77777, sz);
    // Since 28c911e (2026-09-22) World.newWorld ignores its size argument and always builds a 256-cell world, so the
    // seam row must come from the state the plugin actually built, not from the size this harness asked for.
    const worldSize = W.state.size;
    const area = W.buildArea(0, 0);
    check("area_built", !!area && area.data.length > 0 && area.width === worldSize && area.height === worldSize,
        `area width: ${area.width}, height: ${area.height}, state size: ${worldSize}`);

    // Verify wrapped autotiles: the row just past the bottom edge (y = worldSize) must wrap to the top row (y = 0)
    // Water autotile test: find where water touches seam
    let seamChecked = 0;
    const wm = WG.waterModel(W.state);
    for (let x = 0; x < worldSize; x++) {
        const isW0 = wm.isWater(x, 0);
        const isWH = wm.isWater(x, worldSize);
        if (isW0) seamChecked++;
        check(`water_model_seam_x_${x}`, isW0 === isWH, `x=${x}: isWater(0)=${isW0}, isWater(H=${worldSize})=${isWH}`);
        if (x > 10) break; // sample first 10
    }
}

// 5. Fog Toroidal Visibility, Dynamic Toggle, and Sprite Wrapping Coverage
console.log("\n--- Section 5: Fog Toroidal Visibility & Viewport Coverage ---");
{
    mockGameMap._width = 64;
    mockGameMap._height = 64;
    mockGameMap._displayX = 0;
    mockGameMap._displayY = 0;

    // 5a. Dynamic Fog Toggle
    Fog.setEnabled(false);
    check("fog_disabled_is_explored", Fog.isExplored(10, 10) === true, "all cells explored when fog disabled");
    check("fog_disabled_is_visible", Fog.isVisible(10, 10) === true, "all cells visible when fog disabled");
    check("fog_disabled_explored_count", Fog.exploredCount() === 64 * 64, "full count returned when fog disabled");
    const fogSprite = new Fog.Sprite();
    fogSprite.update();
    check("fog_disabled_sprite_hidden", fogSprite.visible === false, "fog sprite hidden when fog disabled");

    Fog.setEnabled(true);
    check("fog_re_enabled_state", Fog.enabled === true, "fog enabled restored");

    // 5b. Toroidal Raycast Seam Crossing
    Fog.refresh();
    Fog.mark(32, 0, 8);
    const southExplored = Fog.isExplored(32, 63, 0);
    const southVisible = Fog.isVisible(32, 63, 0);
    check("fog_raycast_wraps_north_south_seam", southExplored && southVisible,
        `Observer at (32, 0) r8 saw wrapped tile (32, 63): explored=${southExplored}, visible=${southVisible}`);

    // 5c. Viewport Full Coverage Across Toroidal Seams and Zooms
    const testCases = [
        { sz: 64, zoom: 1.0, dx: 0, dy: 0 },
        { sz: 64, zoom: 1.0, dx: 63.5, dy: 63.5 },
        { sz: 64, zoom: 0.666, dx: 63.5, dy: 63.5 },
        { sz: 64, zoom: 0.333, dx: 63.5, dy: 63.5 },
        { sz: 64, zoom: 0.333, dx: 32.0, dy: 0.2 },
        { sz: 128, zoom: 0.333, dx: 127.5, dy: 127.5 },
        { sz: 256, zoom: 0.333, dx: 255.5, dy: 255.5 }
    ];

    let allViewportsCovered = true;
    for (const tc of testCases) {
        mockGameMap._width = tc.sz;
        mockGameMap._height = tc.sz;
        mockGameMap._displayX = tc.dx;
        mockGameMap._displayY = tc.dy;
        currentZoom = tc.zoom;

        fogSprite.update();

        const tw = 48, th = 48;
        const mapW = tc.sz * tw;
        const mapH = tc.sz * th;
        const viewW = Math.ceil(sandbox.Graphics.width / currentZoom);
        const viewH = Math.ceil(sandbox.Graphics.height / currentZoom);

        const tileRects = [
            { x1: fogSprite.x, y1: fogSprite.y, x2: fogSprite.x + mapW, y2: fogSprite.y + mapH }
        ];
        for (const t of fogSprite._tiles) {
            if (!t.visible) continue;
            const tx = fogSprite.x + t.x * tw;
            const ty = fogSprite.y + t.y * th;
            tileRects.push({ x1: tx, y1: ty, x2: tx + mapW, y2: ty + mapH });
        }

        if (mutateFog) {
            // Simulate the old bug: only allow tiles with non-negative origin coordinates
            for (let i = tileRects.length - 1; i >= 0; i--) {
                if (tileRects[i].x1 < 0 || tileRects[i].y1 < 0) tileRects.splice(i, 1);
            }
        }

        // Probe grid of points across viewport
        let caseCovered = tileRects.length > 0;

        for (let py = 0; py <= viewH; py += Math.max(16, Math.floor(viewH / 6))) {
            for (let px = 0; px <= viewW; px += Math.max(16, Math.floor(viewW / 6))) {
                const pointCovered = tileRects.some(r =>
                    px >= r.x1 && px <= r.x2 &&
                    py >= r.y1 && py <= r.y2
                );
                if (!pointCovered) {
                    caseCovered = false;
                    break;
                }
            }
            if (!caseCovered) break;
        }

        if (!caseCovered) allViewportsCovered = false;
        check(`fog_viewport_covered_sz${tc.sz}_z${Math.round(tc.zoom * 100)}_dx${Math.round(tc.dx)}_dy${Math.round(tc.dy)}`,
            caseCovered,
            `total tiles=${tileRects.length}, view=${viewW}x${viewH}, map=${mapW}x${mapH}`);
    }
    check("fog_all_viewports_seamlessly_covered", allViewportsCovered, "100% viewport coverage with zero gaps");
}

// Summary
console.log(`\n==================================================`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    process.exit(1);
} else {
    console.log("All seamless map edge tests PASSED.");
    process.exit(0);
}
