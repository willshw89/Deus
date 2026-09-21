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

const gameDir = path.join(__dirname, "../game");
const catalogPath = path.join(gameDir, "data/UF_WorldCatalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

const mockDataMap = {
    width: 64, height: 64,
    data: new Int32Array(64 * 64 * 6),
    events: [null],
    ufObjects: new Uint16Array(64 * 64),
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
    performance: { now: () => Date.now() },
    window: {},
    $ufWorldCatalog: catalog,
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
sandbox.Sprite.prototype.update = function() {};
sandbox.Spriteset_Map.prototype = { createCharacters: () => {} };
sandbox.Game_Map.prototype = mockGameMap;
sandbox.Game_Player.prototype = {
    moveStraight: () => {},
    moveDiagonally: () => {},
    locate: () => {}
};

// Load core plugins
const worldSrc = fs.readFileSync(path.join(gameDir, "js/plugins/UF_World.js"), "utf8");
const objSrc = fs.readFileSync(path.join(gameDir, "js/plugins/UF_Objects.js"), "utf8");
const genSrc = fs.readFileSync(path.join(gameDir, "js/plugins/UF_WorldGen.js"), "utf8");
const tileSrc = fs.readFileSync(path.join(gameDir, "js/plugins/UF_Tiles.js"), "utf8");
const fogSrc = fs.readFileSync(path.join(gameDir, "js/plugins/UF_Fog.js"), "utf8");

vm.createContext(sandbox);
vm.runInContext(worldSrc, sandbox);
vm.runInContext(objSrc, sandbox);
vm.runInContext(genSrc, sandbox);
vm.runInContext(tileSrc, sandbox);
vm.runInContext(fogSrc, sandbox);

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
    const area = W.buildArea(0, 0);
    check("area_built", !!area && area.data.length > 0, `area width: ${area.width}, height: ${area.height}`);

    // Verify wrapped autotiles: compare bottom row (y = sz - 1) autotile connectivity to top row (y = 0)
    // Water autotile test: find where water touches seam
    let seamChecked = 0;
    const wm = WG.waterModel(W.state);
    for (let x = 0; x < sz; x++) {
        const isW0 = wm.isWater(x, 0);
        const isWH = wm.isWater(x, sz);
        if (isW0) seamChecked++;
        check(`water_model_seam_x_${x}`, isW0 === isWH, `x=${x}: isWater(0)=${isW0}, isWater(H)=${isWH}`);
        if (x > 10) break; // sample first 10
    }
}

// 5. Fog Toroidal Visibility and Sprite Wrapping
console.log("\n--- Section 5: Fog Toroidal Visibility & Viewport Coverage ---");
{
    mockGameMap._width = 64;
    mockGameMap._height = 64;
    Fog.refresh();

    // Mark sight from observer right next to North boundary (cy = 0)
    Fog.mark(32, 0, 8);

    // Sight should have penetrated across North boundary into South tiles (y = 63, 62, etc.)
    const southExplored = Fog.isExplored(32, 63, 0);
    const southVisible = Fog.isVisible(32, 63, 0);
    check("fog_raycast_wraps_north_south_seam", southExplored && southVisible,
        `Observer at (32, 0) r8 saw wrapped tile (32, 63): explored=${southExplored}, visible=${southVisible}`);

    // Check Sprite_UFFog quadrant coverage
    const fogSprite = new Fog.Sprite();
    fogSprite.update();

    check("fog_sprite_has_quadrants", fogSprite._quadrants && fogSprite._quadrants.length >= 3,
        `quadrants created: ${fogSprite._quadrants ? fogSprite._quadrants.length : 0}`);

    // Verify positioning when camera is scrolled across edge:
    mockGameMap._displayY = 63.5;
    fogSprite.update();
    const tw = 48, th = 48;
    const mapH = 64 * th;
    check("fog_sprite_wrapped_position", fogSprite.y <= 0 && fogSprite.y + mapH >= 0,
        `camera displayY=63.5 -> fogSprite.y=${fogSprite.y}, bottom=${fogSprite.y + mapH}`);
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
