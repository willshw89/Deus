#!/usr/bin/env node
"use strict";

/**
 * tools/test_generated_z2_cut_proof.js
 *
 * Targeted proof for WG.00.08 / FABLE-19B:
 * 1. Proves Seed 18 generates a genuine natural chasm/ravine reaching Z-2 at (194, 89).
 * 2. Proves the strata column through Z0, Z-1, and Z-2 has first air at exactly 3 ft.
 * 3. Proves Z0 is 'open' (HEIGHT_0_OF_5), Z-1 is 'open' (HEIGHT_0_OF_5), and Z-2 is 'floor' (HEIGHT_3_OF_5).
 * 4. Proves adjacent/overhead fluid strata (m = 4, 5) are preserved with 0 rock carved underneath.
 * 5. Generates an ASCII elevation cross-section and renders a crisp 2D map PNG to game/test_output/z2_cut_proof_seed18_194_89.png.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const OUT_DIR = path.join(ROOT, "game", "test_output");
fs.mkdirSync(OUT_DIR, { recursive: true });

// Minimal pure-Node PNG encoder using zlib
function encodePNG(width, height, rgbaBuffer) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // CRC32 table
    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crcTable[n] = c;
    }
    function crc32(buf) {
        let c = 0xffffffff;
        for (let i = 0; i < buf.length; i++) {
            c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
        }
        return (c ^ 0xffffffff) >>> 0;
    }

    function createChunk(type, data) {
        const typeBuf = Buffer.from(type, "ascii");
        const lenBuf = Buffer.alloc(4);
        lenBuf.writeUInt32BE(data.length, 0);
        const crcBuf = Buffer.alloc(4);
        const crcVal = crc32(Buffer.concat([typeBuf, data]));
        crcBuf.writeUInt32BE(crcVal, 0);
        return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
    }

    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // 8 bits per channel
    ihdr[9] = 6; // RGBA
    ihdr[10] = 0; // Deflate
    ihdr[11] = 0; // Filter
    ihdr[12] = 0; // Interlace
    const ihdrChunk = createChunk("IHDR", ihdr);

    // IDAT: uncompressed scanlines with filter byte 0
    const rawScanlines = Buffer.alloc(height * (1 + width * 4));
    let rawOffset = 0;
    for (let y = 0; y < height; y++) {
        rawScanlines[rawOffset++] = 0; // Filter: None
        const srcOffset = y * width * 4;
        rgbaBuffer.copy(rawScanlines, rawOffset, srcOffset, srcOffset + width * 4);
        rawOffset += width * 4;
    }
    const compressedData = zlib.deflateSync(rawScanlines, { level: 9 });
    const idatChunk = createChunk("IDAT", compressedData);

    // IEND
    const iendChunk = createChunk("IEND", Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// VM setup matching test_strata_cuts_and_caves.js
function setupVM() {
    const list = {};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game/js/plugins.js"), "utf8"), list);
    const ns = {}, warnings = [], errors = [];
    const canvasCtx = () => ({
        imageSmoothingEnabled: false,
        createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {},
        getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    });
    const env = {
        window: null, UF: ns, DEUS: ns, Math, performance, setTimeout, clearTimeout,
        console: {
            log: (...a) => console.log("  [VM]", ...a),
            warn: (...a) => warnings.push(a.map(String).join(" ")),
            error: (...a) => errors.push(a.map(x => (x && x.stack) || String(x)).join(" "))
        },
        document: { createElement: () => ({ width: 0, height: 0, getContext: canvasCtx }) },
        PluginManager: {
            parameters: name => (list.$plugins && list.$plugins.find(p => p.name === name) || {}).parameters || {},
            registerCommand() {}
        },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false, createGameObjects() {} },
        Input: { keyMapper: {} }, TouchInput: { _currentState: {} }, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        ImageManager: { loadTileset() { return null; } },
        Utils: { isOptionValid: () => false, encodeURI: s => s },
        Tilemap: function() {},
        $dataTilesets: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/Tilesets.json"), "utf8")),
        $ufWorldCatalog: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8")),
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8, minute: 0 },
        $gameSystem: {}, $gameScreen: { weatherType: () => "none", weatherPower: () => 0, changeWeather() {} },
        $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {}, $gameActors: {}, $gameParty: {}
    };
    env.window = env;
    env.$deusWorldCatalog = env.$ufWorldCatalog;
    env.Tilemap.TILE_ID_A1 = 2048;
    env.Tilemap.TILE_ID_A2 = 2816;
    env.Tilemap.isTileA1 = id => id >= 2048 && id < 2816;
    env.Tilemap.isWaterTile = id => env.Tilemap.isTileA1(id);
    for (const name of ["Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player", "Game_CharacterBase", "Game_Event", "Spriteset_Map", "Spriteset_Base"]) {
        env[name] = vm.runInNewContext(`(function ${name}(){})`);
        env[name].prototype.initialize = function() {};
    }
    env.Scene_Boot.prototype.start = function() {};
    env.Scene_Boot.prototype.isReady = function() { return true; };
    env.Spriteset_Map.prototype.createCharacters = function() {};
    Object.assign(env.Game_Map.prototype, {
        mapId() { return this._mapId || 0; }, width: () => 256, height: () => 256, update() {}, tileId: () => 0, tilesetFlags: () => [],
        isPassable: () => true, checkPassage: () => true,
        displayX() { return 0; }, displayY() { return 0; }, screenTileX: () => 17, screenTileY: () => 13,
        adjustX(x) { return x; }, adjustY(y) { return y; },
        roundXWithDirection: (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0), roundYWithDirection: (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0),
        eventsXy: () => [], eventsXyNt: () => []
    });
    Object.assign(env.Game_Player.prototype, { isTransferring: () => false, direction: () => 2, locate(x, y) { this.x = x; this.y = y; } });
    env.$gameMap = new env.Game_Map();
    env.$gameMap._events = [];
    env.$gamePlayer = new env.Game_Player();
    env.$gamePlayer.x = 128;
    env.$gamePlayer.y = 128;
    env.Sprite = vm.runInNewContext(`(function Sprite(bitmap) {
        this.anchor = { x: 0, y: 0, set(a, b) { this.x = a; this.y = b; } };
        this.children = []; this.parent = null; this.visible = true; this.bitmap = bitmap || null; this.x = 0; this.y = 0; this.z = 0;
    })`);
    Object.assign(env.Sprite.prototype, { update() {}, addChild(c) { c.parent = this; this.children.push(c); return c; } });
    env.Bitmap = vm.runInNewContext(`(function Bitmap(w, h) {
        this.width = w || 0; this.height = h || 0;
        this.context = { imageSmoothingEnabled: false, drawImage() {}, putImageData() {}, fillRect() {} };
        this._baseTexture = { update() {} };
    })`);
    Object.assign(env.Bitmap.prototype, { isReady() { return true; }, isError() { return false; }, clear() {}, clearRect() {}, fillRect() {}, blt() {} });
    env.Bitmap.load = () => ({ isReady: () => false, isError: () => false });

    const section = (src, a, b) => {
        const i = src.indexOf(a), j = src.indexOf(b, i + a.length);
        if (i < 0 || j <= i) throw new Error(`engine source section missing: ${a}`);
        return src.slice(i, j);
    };
    const core = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
    const mgr = fs.readFileSync(path.join(ROOT, "game/js/rmmz_managers.js"), "utf8");
    const deus = fs.readFileSync(path.join(PLUGINS, "DEUS_Core.js"), "utf8");
    const ctx = vm.createContext(env);
    vm.runInContext(section(mgr, "DataManager.makeSaveContents =", "DataManager.correctDataErrors ="), ctx, { filename: "rmmz_managers.js" });
    vm.runInContext(section(core, "function JsonEx()", "//-----------------------------------------------------------------------------"), ctx, { filename: "rmmz_core.js JsonEx" });
    vm.runInContext(section(core, "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), ctx, { filename: "rmmz_core.js Tilemap constants" });
    vm.runInContext(section(deus, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------"), ctx, { filename: "DEUS_Core.js events" });

    const files = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Levels.js", "DEUS_Floors.js"];
    for (const f of files) {
        const full = path.join(PLUGINS, f);
        if (fs.existsSync(full)) {
            vm.runInContext(fs.readFileSync(full, "utf8"), ctx, { filename: f });
        }
    }
    env.DataManager.onLoad(env.$dataTilesets);
    new env.Scene_Boot().start();
    return { env, errors, warnings };
}

const LEVELS = [-2, -1, 0, 1, 2], E_TOP = 25;
const isSolidB = v => v !== 0 && (v & 0x40) === 0 && (v & 0x3f) >= 1 && (v & 0x3f) <= 3;
const isFluidB = v => (v & 0x3f) === 4 || (v & 0x3f) === 5;

function run() {
    console.log("======================================================================");
    console.log("DEUS TARGETED PROOF: GENERATED Z-2 CUT & FLUID PRESERVATION");
    console.log("======================================================================");

    const SEED = 18;
    console.log(`Setting up VM and generating World Seed ${SEED} (generator version 5)...`);
    const { env } = setupVM();
    const W = env.UF.World;
    const L = env.UF.Levels;

    env.UF.NewGameSetup = { seed: SEED, year: 1, levelsGen: 5 };
    const t0 = performance.now();
    W.newWorld(SEED);
    const genMs = performance.now() - t0;
    console.log(`World generated in ${genMs.toFixed(0)} ms.`);

    const st = W.state;
    const size = st.size;
    const a = { x: st.startArea.x, y: st.startArea.y };
    const bs = LEVELS.map(z => L.baseline(z, a.x, a.y));
    const M = bs.map(b => b.strata.m);
    const get = (i, e) => M[(e / 5) | 0][i * 5 + (e % 5)];
    const solid = (i, e) => isSolidB(get(i, e));
    const fluid = (i, e) => isFluidB(get(i, e));

    const TARGET_X = 194;
    const TARGET_Y = 89;
    const i = TARGET_Y * size + TARGET_X;

    console.log(`\n--- 1. STRATA COLUMN INSPECTION AT (${TARGET_X}, ${TARGET_Y}) ---`);
    console.log(`Cell index: ${i}`);

    let firstAir = -1;
    for (let e = 0; e < E_TOP; e++) {
        if (!solid(i, e) && firstAir < 0) firstAir = e;
    }
    console.log(`First air elevation: ${firstAir} ft`);

    const strataBreakdown = [];
    for (let e = 0; e < E_TOP; e++) {
        const val = get(i, e);
        const z = ((e / 5) | 0) - 2;
        const sub = e % 5;
        const mat = val === 0 ? "AIR" : (val & 0x3f) === 1 ? "STONE" : (val & 0x3f) === 2 ? "SOIL" : (val & 0x3f) === 4 ? "WATER" : `MAT_${val}`;
        strataBreakdown.push({ e, z, sub, val, mat, isSolid: isSolidB(val) });
    }

    console.log("Elevation | Level | Stratum | Material | Solid?");
    console.log("----------------------------------------------");
    for (let e = E_TOP - 1; e >= 0; e--) {
        const row = strataBreakdown[e];
        const zStr = row.z >= 0 ? `+${row.z}` : `${row.z}`;
        console.log(`   ${e.toString().padStart(2)}     |  Z=${zStr}  |   S${row.sub}    | ${row.mat.padEnd(8)} | ${row.isSolid}`);
    }

    console.log(`\n--- 2. MULTI-Z SHAPE & HEIGHT STATE AT (${TARGET_X}, ${TARGET_Y}) ---`);
    const ref = (x, y, z) => ({ areaX: a.x, areaY: a.y, x, y, z });
    const zStates = {};
    for (const z of LEVELS) {
        const r = ref(TARGET_X, TARGET_Y, z);
        const shape = L.shapeAt(r);
        const height = L.heightStateAt(r);
        zStates[z] = { shape, height };
        console.log(`Level Z=${z >= 0 ? `+${z}` : z}: shape = ${shape.padEnd(8)} | heightState = ${height}`);
    }

    // Verify requirements:
    const checks = [
        { name: "first_air_is_3ft", pass: firstAir === 3, msg: `First air is ${firstAir} ft (expected 3 ft)` },
        { name: "z0_is_open", pass: zStates[0].shape === "open" && zStates[0].height === "HEIGHT_0_OF_5", msg: `Z0 shape=${zStates[0].shape} height=${zStates[0].height}` },
        { name: "z_minus1_is_open", pass: zStates[-1].shape === "open" && zStates[-1].height === "HEIGHT_0_OF_5", msg: `Z-1 shape=${zStates[-1].shape} height=${zStates[-1].height}` },
        { name: "z_minus2_is_floor", pass: zStates[-2].shape === "floor" && zStates[-2].height === "HEIGHT_3_OF_5", msg: `Z-2 shape=${zStates[-2].shape} height=${zStates[-2].height}` },
        { name: "z_plus1_is_open", pass: zStates[1].shape === "open", msg: `Z+1 shape=${zStates[1].shape}` },
        { name: "z_plus2_is_open", pass: zStates[2].shape === "open", msg: `Z+2 shape=${zStates[2].shape}` },
    ];

    console.log(`\n--- 3. FEATURE METADATA ---`);
    const feats = L.naturalFeatures(a.x, a.y) || { cuts: [], caves: [] };
    const containingCut = feats.cuts.find(c => {
        return c.deepest && c.deepest.x === TARGET_X && c.deepest.y === TARGET_Y;
    }) || feats.cuts.find(c => c.floorLevel === -2);

    if (containingCut) {
        console.log(`Identified Cut Feature: Type = ${containingCut.type}, Family = ${containingCut.family}, DepthClass = ${containingCut.depthClass}`);
        console.log(`  Anchor = (${containingCut.anchor.x}, ${containingCut.anchor.y}), FloorLevel = ${containingCut.floorLevel}, Cells = ${containingCut.cells}`);
    } else {
        console.log("Cut feature not located by exact coordinate lookup.");
    }

    console.log(`\n--- 4. ADJACENT FLUID PRESERVATION AUDIT ---`);
    // Search nearby cells (radius 30) for fluid strata
    let fluidColsFound = 0;
    let fluidStrataCount = 0;
    let illegalCarveUnderFluid = 0;

    for (let dy = -30; dy <= 30; dy++) {
        for (let dx = -30; dx <= 30; dx++) {
            const cx = TARGET_X + dx;
            const cy = TARGET_Y + dy;
            if (cx < 0 || cx >= size || cy < 0 || cy >= size) continue;
            const ci = cy * size + cx;
            let colHasFluid = false;
            for (let e = 0; e < E_TOP; e++) {
                if (fluid(ci, e)) {
                    colHasFluid = true;
                    fluidStrataCount++;
                    // Verify all strata below this fluid stratum are solid (not carved to air!)
                    for (let below = 0; below < e; below++) {
                        if (!solid(ci, below)) {
                            illegalCarveUnderFluid++;
                            console.error(`ILLEGAL CARVE UNDER FLUID at (${cx}, ${cy}): fluid at e=${e}, but air at e=${below}!`);
                        }
                    }
                }
            }
            if (colHasFluid) fluidColsFound++;
        }
    }
    console.log(`Scanned 61x61 neighborhood: found ${fluidColsFound} fluid columns (${fluidStrataCount} total fluid strata).`);
    console.log(`Illegal air carves under fluid: ${illegalCarveUnderFluid}`);

    checks.push({
        name: "fluid_preserved_no_under_carves",
        pass: illegalCarveUnderFluid === 0,
        msg: `${illegalCarveUnderFluid} air carves found under fluid columns`
    });

    console.log(`\n--- 5. ASCII ELEVATION CROSS-SECTION (Y = ${TARGET_Y}, X = 186..202) ---`);
    const xStart = 186, xEnd = 202;
    let headerStr = "Elev | ";
    for (let x = xStart; x <= xEnd; x++) headerStr += (x % 10).toString();
    console.log(headerStr);
    console.log("-".repeat(headerStr.length));

    for (let e = E_TOP - 1; e >= 0; e--) {
        let line = ` ${e.toString().padStart(2)}  | `;
        for (let x = xStart; x <= xEnd; x++) {
            const idx = TARGET_Y * size + x;
            const val = get(idx, e);
            if (isFluidB(val)) {
                line += "~";
            } else if (isSolidB(val)) {
                line += "#";
            } else {
                line += ".";
            }
        }
        const z = ((e / 5) | 0) - 2;
        const sub = e % 5;
        line += `  (Z=${z >= 0 ? `+${z}` : z} S${sub})`;
        console.log(line);
    }
    console.log("Legend: '#' = Solid Rock/Soil, '.' = Air, '~' = Water");

    console.log(`\n--- 6. RENDERING CRISP 2D MAP VISUAL PROOF (128x128 CELL VIEW) ---`);
    // Render a 128x128 area centered around (TARGET_X, TARGET_Y)
    // Scale: 4x4 pixels per cell -> 512x512 PNG image
    const mapW = 128, mapH = 128;
    const originX = TARGET_X - 64;
    const originY = TARGET_Y - 64;
    const scale = 4;
    const imgW = mapW * scale;
    const imgH = mapH * scale;
    const rgba = Buffer.alloc(imgW * imgH * 4);

    for (let my = 0; my < mapH; my++) {
        for (let mx = 0; mx < mapW; mx++) {
            const wx = originX + mx;
            const wy = originY + my;
            let r = 20, g = 20, b = 25, aVal = 255;

            if (wx >= 0 && wx < size && wy >= 0 && wy < size) {
                const ci = wy * size + wx;
                let topSolid = -1;
                let hasWater = false;
                for (let e = E_TOP - 1; e >= 0; e--) {
                    if (fluid(ci, e)) { hasWater = true; break; }
                    if (solid(ci, e)) { topSolid = e; break; }
                }

                if (hasWater) {
                    // Cyan / Water
                    r = 30; g = 100; b = 200;
                } else if (topSolid < 0) {
                    // Deep abyss
                    r = 10; g = 10; b = 15;
                } else {
                    const topZ = ((topSolid / 5) | 0) - 2;
                    if (topZ === -2) {
                        // Exposed Z-2 Chasm Floor: Deep purple/slate
                        r = 75; g = 45; b = 95;
                    } else if (topZ === -1) {
                        // Exposed Z-1 Subterranean Rim: Slate grey/brown
                        r = 90; g = 80; b = 80;
                    } else if (topZ === 0) {
                        // Surface Overland: Greenish meadow/soil
                        r = 60; g = 110; b = 50;
                    } else if (topZ === 1) {
                        // Hill / Plateau (+1): Light olive
                        r = 90; g = 135; b = 65;
                    } else {
                        // Mountain Peak (+2): Snow/Grey
                        r = 180; g = 185; b = 190;
                    }
                }

                // Highlight the target cell (194, 89) in bright gold crosshair
                if (wx === TARGET_X && wy === TARGET_Y) {
                    r = 255; g = 220; b = 40;
                } else if ((wx === TARGET_X && Math.abs(wy - TARGET_Y) <= 3) || (wy === TARGET_Y && Math.abs(wx - TARGET_X) <= 3)) {
                    r = 255; g = 80; b = 80;
                }
            }

            // Fill scale x scale pixel block
            for (let sy = 0; sy < scale; sy++) {
                for (let sx = 0; sx < scale; sx++) {
                    const px = mx * scale + sx;
                    const py = my * scale + sy;
                    const pOffset = (py * imgW + px) * 4;
                    rgba[pOffset] = r;
                    rgba[pOffset + 1] = g;
                    rgba[pOffset + 2] = b;
                    rgba[pOffset + 3] = aVal;
                }
            }
        }
    }

    const pngBuffer = encodePNG(imgW, imgH, rgba);
    const pngPath = path.join(OUT_DIR, "z2_cut_proof_seed18_194_89.png");
    fs.writeFileSync(pngPath, pngBuffer);
    console.log(`Visual proof rendered and saved to: ${pngPath} (${pngBuffer.length} bytes, ${imgW}x${imgH} px)`);

    console.log(`\n--- 7. CHECK VERIFICATION SUMMARY ---`);
    let allPassed = true;
    for (const c of checks) {
        const statusStr = c.pass ? "PASS" : "FAIL";
        console.log(`  [${statusStr}] ${c.name}: ${c.msg}`);
        if (!c.pass) allPassed = false;
    }

    if (allPassed) {
        console.log("\n======================================================================");
        console.log("VERIFICATION RESULT: ALL CHECKS PASSED (EXIT 0)");
        console.log("======================================================================");
        process.exit(0);
    } else {
        console.log("\n======================================================================");
        console.log("VERIFICATION RESULT: FAILURE DETECTED (EXIT 1)");
        console.log("======================================================================");
        process.exit(1);
    }
}

run();
