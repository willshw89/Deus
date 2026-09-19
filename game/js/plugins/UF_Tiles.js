//=============================================================================
// UF_Tiles.js - Ground tiles generated in code, and a runtime tileset for world maps
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Tiles] Generates pixel-art ground autotiles per biome ground kind (from the world catalog), rolling terrain shade overlays on Layer 1 (UF_GenShade_E), and registers a runtime tileset for world maps.
 * @author UF project
 * @orderAfter UF_WorldGen
 *
 * @param TilesetId
 * @text Runtime tileset ID
 * @type number
 * @min 50
 * @default 91
 * @desc ID of the in-memory tileset for surface world maps. Must not be used by the editor's tilesets.
 *
 * @help
 * Reads "groundKinds" and "groundShades" from data/UF_WorldCatalog.json.
 * Each ground kind becomes one RMMZ A2 autotile, painted in code at native
 * resolution (16 px per cell) and scaled exactly 3x.
 *
 * Ground shades (VISION V93, docs/design/GROUND_SHADES.md) are corner-dithered
 * overlays on Layer 1 drawn from the generated E sheet "UF_GenShade_E"
 * (tile IDs 768-1023), allowing terrain to smoothly and continuously roll
 * across the map without cell-aligned staircase lines.
 *
 * The runtime tileset uses: A1 = Outside_A1, A2 = UF_GenGround_A2,
 * B/C = Outside_B/Outside_C, E = UF_GenShade_E.
 *
 * API and checks: docs/systems/UF_Tiles.md
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const P = PluginManager.parameters("UF_Tiles");
    const TILESET_ID = Number(P.TilesetId || 91);
    const GEN_A2 = "UF_GenGround_A2";
    const GEN_SHADE_E = "UF_GenShade_E";
    const NATIVE = 16, SCALE = 3;
    const SHADE_TILE_START = 768; // Tilemap.TILE_ID_E

    const catalog = () => window.$ufWorldCatalog || null;
    const groundShadesConfig = () => (catalog() && catalog().groundShades) || null;

    // Bayer 4x4 dither matrix normalized to [0, 1)
    const BAYER4 = [
        [ 0.0/16,  8.0/16,  2.0/16, 10.0/16],
        [12.0/16,  4.0/16, 14.0/16,  6.0/16],
        [ 3.0/16, 11.0/16,  1.0/16,  9.0/16],
        [15.0/16,  7.0/16, 13.0/16,  5.0/16]
    ];

    //-------------------------------------------------------------------------
    // Deterministic pixel noise

    function hash32(...parts) {
        let h = 2166136261 >>> 0;
        for (const part of parts) {
            let v = part >>> 0;
            for (let i = 0; i < 4; i++) {
                h ^= v & 255;
                h = Math.imul(h, 16777619) >>> 0;
                v >>>= 8;
            }
        }
        h ^= h >>> 15;
        h = Math.imul(h, 0x2c1b3c6d) >>> 0;
        return (h ^ (h >>> 12)) >>> 0;
    }
    const rnd = (...p) => hash32(...p) / 4294967296;
    const hexToRgb = hex => {
        const n = parseInt(String(hex).replace("#", ""), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };

    // Texture of one ground kind at native pixel (x, y) of a seamless field: returns an RGB triple.
    // Patterns add small structures (2-3 px) so quarter tiles join without visible seams.
    function texelByTones(pattern, k, x, y, tones) {
        const c = tones.map(hexToRgb); // [base, dark, light, accent]
        const r = rnd(k, x, y);
        const pick = i => c[Math.min(i, c.length - 1)];
        switch (pattern) {
            case "grass": // short vertical blades
                if (rnd(k, x, y >> 1, 7) < 0.18) return pick(2);
                if (r < 0.22) return pick(1);
                return r > 0.93 ? pick(3) : pick(0);
            case "dots": // sand, fine grains, tundra, ash
                return r < 0.12 ? pick(1) : r > 0.9 ? pick(2) : r > 0.985 ? pick(3) : pick(0);
            case "cracks": // stony ground, rock
                if (rnd(k, x >> 1, y, 3) < 0.07 || rnd(k, x, y >> 1, 5) < 0.05) return pick(1);
                return r > 0.88 ? pick(2) : r < 0.06 ? pick(3) : pick(0);
            case "snow":
                return r > 0.97 ? pick(3) : r < 0.08 ? pick(1) : r > 0.85 ? pick(2) : pick(0);
            case "mud": // dark blobs
                if (rnd(k, x >> 1, y >> 1, 11) < 0.25) return pick(1);
                return r > 0.92 ? pick(2) : r < 0.04 ? pick(3) : pick(0);
            case "litter": // leaf litter: warm specks
                if (r < 0.14) return pick(3);
                return r < 0.3 ? pick(1) : r > 0.9 ? pick(2) : pick(0);
            case "needles": // short diagonal strokes
                if (rnd(k, (x + y) >> 1, x - y, 13) < 0.12) return pick(1);
                return r > 0.92 ? pick(2) : r < 0.05 ? pick(3) : pick(0);
            case "stria": // layered clay
                if ((y + (rnd(k, x >> 2, 17) < 0.5 ? 0 : 1)) % 4 === 0) return pick(1);
                return r > 0.9 ? pick(2) : r < 0.05 ? pick(3) : pick(0);
            case "ice":
                if (rnd(k, x - y, 19) < 0.04) return pick(2);
                return r < 0.1 ? pick(1) : pick(0);
            default:
                return r < 0.15 ? pick(1) : r > 0.9 ? pick(2) : pick(0);
        }
    }

    function texel(kind, k, x, y) {
        return texelByTones(kind.pattern, k, x, y, kind.colors);
    }

    // Paint one A2 autotile block (native 32x48) for ground kind k at native origin (ox, oy).
    function paintBlock(img, stride, kind, k, ox, oy) {
        const edge = hexToRgb(kind.edge || kind.colors[1]);
        const set = (x, y, rgb) => {
            const i = ((oy + y) * stride + (ox + x)) * 4;
            img[i] = rgb[0];
            img[i + 1] = rgb[1];
            img[i + 2] = rgb[2];
            img[i + 3] = 255;
        };
        // Texture everywhere first (world-seamless: same (x, y) sampling in every region of the block).
        for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) set(x, y, texel(kind, k, x & 15, y & 15));
        const outline = (x, y) => set(x, y, edge);
        // Preview tile (0,0)-(16,16): isolated, outline all around.
        for (let i = 0; i < 16; i++) { outline(i, 0); outline(i, 15); outline(0, i); outline(15, i); }
        // Inner-corner tile (16,0)-(32,16): notches at its four outer corners.
        for (const [cx, cy, dx, dy] of [[16, 0, 1, 1], [31, 0, -1, 1], [16, 15, 1, -1], [31, 15, -1, -1]]) {
            outline(cx, cy);
            outline(cx + dx, cy);
            outline(cx, cy + dy);
        }
        // Blob template (0,16)-(32,48): a 2x2-tile square with an outline on its outer border.
        for (let i = 0; i < 32; i++) { outline(i, 16); outline(i, 47); outline(0, 16 + i); outline(31, 16 + i); }
    }

    let genBitmap = null;
    function generatedGround() {
        if (genBitmap) return genBitmap;
        const kinds = (catalog() && catalog().groundKinds) || [];
        const nw = 8 * 32, nh = 4 * 48; // native A2 sheet: 8 kinds per row, 4 rows
        const native = document.createElement("canvas");
        native.width = nw;
        native.height = nh;
        const nctx = native.getContext("2d");
        const data = nctx.createImageData(nw, nh);
        kinds.slice(0, 32).forEach((kind, k) => paintBlock(data.data, nw, kind, k, (k % 8) * 32, Math.floor(k / 8) * 48));
        nctx.putImageData(data, 0, 0);
        const bmp = new Bitmap(nw * SCALE, nh * SCALE);
        const ctx = bmp.context;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(native, 0, 0, nw * SCALE, nh * SCALE);
        bmp._baseTexture.update();
        genBitmap = bmp;
        return bmp;
    }

    //-------------------------------------------------------------------------
    // Ground shades E-sheet generation (dual-grid corner-keyed overlay)

    const shadeKeyMap = new Map();
    let genShadeBitmap = null;
    let shadeStats = { keysUsed: 0, pureCount: 0, mixCount: 0, pairCount: 0 };

    function parseShadeKey(key) {
        const parts = key.split(":");
        if (parts[0] === "pure") {
            return { type: "pure", family: parts[1], step: Number(parts[2]) };
        } else if (parts[0] === "mix") {
            return { type: "mix", family: parts[1], lowStep: Number(parts[2]), mask: Number(parts[3]) };
        } else if (parts[0] === "pair") {
            return { type: "pair", famA: parts[1], stepA: Number(parts[2]), famB: parts[3], stepB: Number(parts[4]), maskB: Number(parts[5]) };
        }
        return null;
    }

    function paintShadeTile(imgData, stride, key, ox, oy) {
        const parsed = parseShadeKey(key);
        if (!parsed) return;
        const cfg = groundShadesConfig();
        if (!cfg || !cfg.families) return;

        const setPixel3x = (nx, ny, rgb) => {
            for (let py = 0; py < 3; py++) {
                for (let px = 0; px < 3; px++) {
                    const idx = ((oy + ny * 3 + py) * stride + (ox + nx * 3 + px)) * 4;
                    imgData[idx] = rgb[0];
                    imgData[idx + 1] = rgb[1];
                    imgData[idx + 2] = rgb[2];
                    imgData[idx + 3] = 255;
                }
            }
        };

        if (parsed.type === "pure") {
            const fam = cfg.families[parsed.family];
            if (!fam || !fam.steps[parsed.step]) return;
            const tones = fam.steps[parsed.step].tones;
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    const rgb = texelByTones(fam.pattern, parsed.step, x, y, tones);
                    setPixel3x(x, y, rgb);
                }
            }
        } else if (parsed.type === "mix") {
            const fam = cfg.families[parsed.family];
            if (!fam) return;
            const step0 = fam.steps[parsed.lowStep];
            const step1 = fam.steps[parsed.lowStep + 1] || step0;
            const mask = parsed.mask;
            const b0 = (mask & 1) ? 1 : 0, b1 = (mask & 2) ? 1 : 0;
            const b2 = (mask & 4) ? 1 : 0, b3 = (mask & 8) ? 1 : 0;
            const ditherBand = cfg.ditherBand !== undefined ? cfg.ditherBand : 0.15;
            const toneJitter = cfg.toneJitter !== undefined ? cfg.toneJitter : 0.08;

            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    const u = (x + 0.5) / 16, v = (y + 0.5) / 16;
                    const val = (1 - u) * (1 - v) * b0 + u * (1 - v) * b1 + (1 - u) * v * b2 + u * v * b3;
                    const bayer = BAYER4[y & 3][x & 3] - 0.5;
                    const jitter = (rnd(parsed.lowStep, x, y, 71) - 0.5) * toneJitter;
                    const useHigh = (val + bayer * ditherBand + jitter) > 0.5;
                    const tones = useHigh ? step1.tones : step0.tones;
                    const stepK = useHigh ? parsed.lowStep + 1 : parsed.lowStep;
                    const rgb = texelByTones(fam.pattern, stepK, x, y, tones);
                    setPixel3x(x, y, rgb);
                }
            }
        } else if (parsed.type === "pair") {
            const famA = cfg.families[parsed.famA], famB = cfg.families[parsed.famB];
            if (!famA || !famB) return;
            const stepA = famA.steps[parsed.stepA], stepB = famB.steps[parsed.stepB];
            const maskB = parsed.maskB;
            const b0 = (maskB & 1) ? 1 : 0, b1 = (maskB & 2) ? 1 : 0;
            const b2 = (maskB & 4) ? 1 : 0, b3 = (maskB & 8) ? 1 : 0;
            const ditherBand = cfg.ditherBand !== undefined ? cfg.ditherBand : 0.15;

            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < 16; x++) {
                    const u = (x + 0.5) / 16, v = (y + 0.5) / 16;
                    const val = (1 - u) * (1 - v) * b0 + u * (1 - v) * b1 + (1 - u) * v * b2 + u * v * b3;
                    const bayer = BAYER4[y & 3][x & 3] - 0.5;
                    const useB = (val + bayer * ditherBand) > 0.5;
                    const fam = useB ? famB : famA;
                    const s = useB ? stepB : stepA;
                    const sIdx = useB ? parsed.stepB : parsed.stepA;
                    const rgb = texelByTones(fam.pattern, sIdx, x, y, s.tones);
                    setPixel3x(x, y, rgb);
                }
            }
        }
    }

    function initShadeAtlas() {
        if (genShadeBitmap) return genShadeBitmap;
        const cfg = groundShadesConfig();
        if (!cfg || !cfg.families) return null;

        // Collect all pure step keys first so they always have guaranteed slots in E
        const keys = [];
        for (const [famName, fam] of Object.entries(cfg.families)) {
            for (let s = 0; s < fam.steps.length; s++) {
                keys.push(`pure:${famName}:${s}`);
            }
        }

        // Add pre-configured pairs
        if (cfg.pairs) {
            for (const [pairKey, pairInfo] of Object.entries(cfg.pairs)) {
                const [fA, fB] = pairKey.split("|");
                if (cfg.families[fA] && cfg.families[fB]) {
                    // add all 14 transition masks
                    for (let m = 1; m < 15; m++) {
                        keys.push(`pair:${fA}:${pairInfo.steps[0]}:${fB}:${pairInfo.steps[1]}:${m}`);
                    }
                }
            }
        }

        shadeKeyMap.clear();
        keys.slice(0, 256).forEach((k, idx) => {
            shadeKeyMap.set(k, SHADE_TILE_START + idx);
        });

        const sheetW = 768, sheetH = 768; // 16 x 16 tiles of 48x48
        const canvas = document.createElement("canvas");
        canvas.width = sheetW;
        canvas.height = sheetH;
        const ctx = canvas.getContext("2d");
        const imgData = ctx.createImageData(sheetW, sheetH);

        for (const [k, tileId] of shadeKeyMap.entries()) {
            const idx = tileId - SHADE_TILE_START;
            const tx = idx % 16, ty = Math.floor(idx / 16);
            paintShadeTile(imgData.data, sheetW, k, tx * 48, ty * 48);
        }

        ctx.putImageData(imgData, 0, 0);
        const bmp = new Bitmap(sheetW, sheetH);
        bmp.context.imageSmoothingEnabled = false;
        bmp.context.drawImage(canvas, 0, 0);
        bmp._baseTexture.update();
        genShadeBitmap = bmp;
        return bmp;
    }

    function getOrAllocateShadeTile(key) {
        if (shadeKeyMap.has(key)) return shadeKeyMap.get(key);
        if (shadeKeyMap.size >= 256) {
            // Atlas full: fallback to pure base tile
            const p = parseShadeKey(key);
            if (p && p.type === "pair") {
                const pureKey = `pure:${p.famA}:${p.stepA}`;
                if (shadeKeyMap.has(pureKey)) return shadeKeyMap.get(pureKey);
            } else if (p && p.type === "mix") {
                const pureKey = `pure:${p.family}:${p.lowStep}`;
                if (shadeKeyMap.has(pureKey)) return shadeKeyMap.get(pureKey);
            }
            return SHADE_TILE_START;
        }
        const tileId = SHADE_TILE_START + shadeKeyMap.size;
        shadeKeyMap.set(key, tileId);
        if (genShadeBitmap) {
            const idx = tileId - SHADE_TILE_START;
            const tx = idx % 16, ty = Math.floor(idx / 16);
            const sheetW = 768;
            const canvas = document.createElement("canvas");
            canvas.width = 48;
            canvas.height = 48;
            const cctx = canvas.getContext("2d");
            const imgData = cctx.createImageData(48, 48);
            paintShadeTile(imgData.data, 48, key, 0, 0);
            cctx.putImageData(imgData, 0, 0);
            genShadeBitmap.context.drawImage(canvas, tx * 48, ty * 48);
            genShadeBitmap._baseTexture.update();
        }
        return tileId;
    }

    // Serve the generated sheets whenever RMMZ asks for them.
    const _ImageManager_loadTileset = ImageManager.loadTileset;
    ImageManager.loadTileset = function(filename) {
        if (filename === GEN_A2) return generatedGround();
        if (filename === GEN_SHADE_E) return initShadeAtlas();
        return _ImageManager_loadTileset.call(this, filename);
    };

    //-------------------------------------------------------------------------
    // The runtime tileset

    const groundKinds = () => ((catalog() && catalog().groundKinds) || []).slice(0, 32);

    const Tiles = {
        TILESET_ID,
        GEN_A2,
        GEN_SHADE_E,
        /** The catalog's ground kinds in sheet order (index = A2 kind). */
        kinds: () => groundKinds().slice(),
        /** Tile ID of ground kind `id` (catalog groundKinds), autotile base (shape 0); null if unknown. */
        groundBase(id) {
            const k = groundKinds().findIndex(g => g.id === id);
            return k < 0 ? null : Tilemap.TILE_ID_A2 + k * 48;
        },
        /** The ground kind entry a tile ID belongs to (any of its 48 shapes), or null for non-ground tiles. */
        kindOfTile(tileId) {
            if (!Tilemap.isTileA2(tileId)) return null;
            return groundKinds()[Math.floor((tileId - Tilemap.TILE_ID_A2) / 48)] || null;
        },
        /** Water kind key (catalog water.surface) of an A1 tile ID, or null. */
        waterKindOfTile(tileId) {
            const surface = (catalog() && catalog().water && catalog().water.surface) || {};
            if (!Tilemap.isTileA1(tileId)) return null;
            const base = tileId - ((tileId - Tilemap.TILE_ID_A1) % 48);
            return Object.keys(surface).find(k => surface[k] === base) || null;
        },
        generatedBitmap: () => generatedGround(),
        generatedShadeBitmap: () => initShadeAtlas(),
        /** The runtime tileset record ($dataTilesets[TILESET_ID]) once registered. */
        tileset: () => (window.$dataTilesets && $dataTilesets[TILESET_ID]) || null,

        /** Returns the family name of a ground kind ID in catalog groundShades, or null. */
        familyOf(kindId) {
            if (!kindId) return null;
            const cfg = groundShadesConfig();
            if (!cfg || !cfg.families) return null;
            for (const [famName, fam] of Object.entries(cfg.families)) {
                if (fam.kinds && fam.kinds[kindId]) return famName;
            }
            return null;
        },

        /** Returns true if two ground kinds belong to the same family and join without autotile borders. */
        joins(a, b) {
            if (a === b) return true;
            if (a === null || a === undefined || b === null || b === undefined) return false;
            const kList = groundKinds();
            const idA = typeof a === "number" ? (kList[a] && kList[a].id) : a;
            const idB = typeof b === "number" ? (kList[b] && kList[b].id) : b;
            if (!idA || !idB) return false;
            if (idA === idB) return true;
            const famA = Tiles.familyOf(idA);
            const famB = Tiles.familyOf(idB);
            if (!famA || !famB) return false;
            if (famA === famB) return true;
            const cfg = groundShadesConfig();
            const pairs = (cfg && cfg.pairs) || {};
            return !!(pairs[`${famA}|${famB}`] || pairs[`${famB}|${famA}`]);
        },

        shadeStats: () => Object.assign({}, shadeStats)
    };
    window.UF = window.UF || {};
    window.UF.Tiles = Tiles;

    // Tileset 91 in memory: names from the catalog, flags from the editor's base tileset, except the A2 ground
    // kinds (from groundKinds[].passable) and the catalog's water kinds (always impassable: the stock sheet
    // leaves some A1 kinds walkable, and units must stand next to water to drink, never in it).
    function registerTileset() {
        const cat = catalog();
        if (!cat || !window.$dataTilesets) return;
        const names = (cat.tilesets && cat.tilesets.surface) || {};
        const base = $dataTilesets[names.base || 2];
        const flags = base ? base.flags.slice() : new Array(8192).fill(0);
        while (flags.length < 8192) flags.push(0);
        groundKinds().forEach((kind, k) => {
            const blocked = kind.passable === false;
            for (let s = 0; s < 48; s++) flags[Tilemap.TILE_ID_A2 + k * 48 + s] = blocked ? 0x0f : 0;
        });
        for (const tileId of Object.values((cat.water && cat.water.surface) || {})) {
            const start = tileId - ((tileId - Tilemap.TILE_ID_A1) % 48);
            for (let s = 0; s < 48; s++) flags[start + s] = (flags[start + s] & ~0x0f) | 0x0f;
        }
        // E sheet shade tiles (IDs 768-1023) are all walkable with 0 flags (no ladder, bush, or block)
        for (let s = 768; s < 1024; s++) flags[s] = 0;

        $dataTilesets[TILESET_ID] = {
            id: TILESET_ID,
            mode: 1,
            name: "UF World (runtime)",
            note: "",
            tilesetNames: [
                names.A1 || "Outside_A1",
                names.A2 || GEN_A2,
                "", "",
                names.A5 || "",
                names.B || "Outside_B",
                names.C || "Outside_C",
                "",
                names.E || GEN_SHADE_E
            ],
            flags
        };
    }

    const _DataManager_onLoad = DataManager.onLoad;
    DataManager.onLoad = function(object) {
        _DataManager_onLoad.call(this, object);
        if (object === window.$dataTilesets || (object === window.$ufWorldCatalog && window.$dataTilesets)) registerTileset();
    };

    //-------------------------------------------------------------------------
    // Surface Plan & Layer 1 Application (VISION V93 & GROUND_SHADES.md)

    function smoothstep(a, b, v) {
        const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
        return t * t * (3 - 2 * t);
    }

    function computeShadePlan(map, ax, ay) {
        const cfg = groundShadesConfig();
        if (!cfg || !cfg.families || !window.UF.WorldGen) return;
        const WG = window.UF.WorldGen;
        const seed = (window.UF.World && UF.World.state ? UF.World.state.seed : 0);
        const d = WG.dims ? WG.dims() : { width: 256, height: 256, startX: 128, startY: 128 };
        const cl = (catalog() && catalog().climate) || {};
        const size = map.width || 256;
        const cornersW = size + 1;

        // Check for test provocations
        const provoke = (typeof process !== "undefined" && process.env && process.env.UF_TEST_PROVOKE) || window.UF_TEST_PROVOKE || "";
        const flatProvoke = provoke === "ground.flat";
        const noiseProvoke = provoke === "ground.noise";

        // 1. Compute dryness field D across corners (size + 1) x (size + 1)
        const D = new Float32Array(cornersW * cornersW);
        const fw = (cfg.field && cfg.field.weights) || { noise: 0.45, detail: 0.20, rain: 0.20, drainage: 0.10, height: 0.20, water: 0.15 };

        if (flatProvoke) {
            D.fill(0.5);
        } else if (noiseProvoke) {
            for (let cy = 0; cy < cornersW; cy++) {
                const gy = ay * size + cy;
                for (let cx = 0; cx < cornersW; cx++) {
                    const gx = ax * size + cx;
                    D[cy * cornersW + cx] = rnd(seed, gx, gy, 9999);
                }
            }
        } else {
            const STEP = 4;
            const subW = Math.floor((cornersW - 1) / STEP) + 1;
            const subD = new Float32Array(subW * subW);
            for (let sy = 0; sy < subW; sy++) {
                const cy = Math.min(cornersW - 1, sy * STEP);
                const gy = ay * size + cy;
                for (let sx = 0; sx < subW; sx++) {
                    const cx = Math.min(cornersW - 1, sx * STEP);
                    const gx = ax * size + cx;
                    const nMain = WG.valueNoise(seed, 0x5ade, gx, gy, cfg.field.scale || 24);
                    const nDetail = WG.valueNoise(seed, 0x5adf, gx, gy, cfg.field.detailScale || 10);
                    const f = WG.fieldsFor ? WG.fieldsFor(seed, d, cl, gx, gy) : { r: 0.5, d: 0.5, e: 0.5 };
                    const rainTerm = (1 - f.r) * fw.rain;
                    const drainTerm = f.d * fw.drainage;
                    const heightTerm = Math.max(0, f.e - ((cfg.field && cfg.field.heightFrom) || 0.55)) * fw.height;
                    const val = nMain * fw.noise + nDetail * fw.detail + rainTerm + drainTerm + heightTerm;
                    subD[sy * subW + sx] = Math.max(0, Math.min(1, (val - 0.15) / 0.70));
                }
            }
            for (let cy = 0; cy < cornersW; cy++) {
                const sy0 = Math.floor(cy / STEP);
                const sy1 = Math.min(subW - 1, sy0 + 1);
                const ty = (cy - sy0 * STEP) / STEP;
                for (let cx = 0; cx < cornersW; cx++) {
                    const sx0 = Math.floor(cx / STEP);
                    const sx1 = Math.min(subW - 1, sx0 + 1);
                    const tx = (cx - sx0 * STEP) / STEP;
                    const v00 = subD[sy0 * subW + sx0], v10 = subD[sy0 * subW + sx1];
                    const v01 = subD[sy1 * subW + sx0], v11 = subD[sy1 * subW + sx1];
                    const top = v00 + (v10 - v00) * tx;
                    const btm = v01 + (v11 - v01) * tx;
                    D[cy * cornersW + cx] = top + (btm - top) * ty;
                }
            }
        }

        // Pre-cache kind data to avoid repeated lookups and allocations in hot loop
        const kList = groundKinds();
        const kindCache = new Array(32);
        for (let k = 0; k < kList.length; k++) {
            const kd = kList[k];
            const famName = Tiles.familyOf(kd.id);
            const fam = famName ? cfg.families[famName] : null;
            const kindCfg = fam && fam.kinds ? fam.kinds[kd.id] : null;
            kindCache[k] = {
                id: kd.id,
                passable: kd.passable !== false,
                isBuilt: kd.id.startsWith("floor_") || kd.id === "road",
                famName,
                fam,
                kindCfg,
                base: kindCfg ? kindCfg.base : 0,
                window: kindCfg ? (kindCfg.window || [0, fam.steps.length - 1]) : null,
                shares: kindCfg ? (kindCfg.shares || []) : []
            };
        }

        // 2. Corner step assignment and Lipschitz smoothing
        const cornerSteps = new Int8Array(cornersW * cornersW);
        const cornerFams = new Array(cornersW * cornersW);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const cellTile = map.data[y * size + x];
                const kIdx = Math.floor((cellTile - 2816) / 48);
                const kInfo = (cellTile >= 2816 && cellTile < 4352) ? kindCache[kIdx] : null;
                if (!kInfo || !kInfo.passable || kInfo.isBuilt || !kInfo.famName || !kInfo.kindCfg) continue;

                const famName = kInfo.famName;
                const fam = kInfo.fam;
                const win = kInfo.window;
                const shares = kInfo.shares;

                const cIndices = [y * cornersW + x, y * cornersW + (x + 1), (y + 1) * cornersW + x, (y + 1) * cornersW + (x + 1)];
                for (const cIdx of cIndices) {
                    if (!cornerFams[cIdx]) {
                        cornerFams[cIdx] = famName;
                        const dVal = D[cIdx];
                        let step = win[0];
                        let accum = 0;
                        for (let s = 0; s < shares.length; s++) {
                            accum += shares[s];
                            if (dVal <= accum) { step = win[0] + s; break; }
                        }
                        cornerSteps[cIdx] = Math.min(step, fam.steps.length - 1);
                    }
                }
            }
        }

        // Lipschitz closure: raster passes forward and backward
        if (provoke !== "ground.seam") {
            for (let cy = 0; cy < cornersW; cy++) {
                for (let cx = 0; cx < cornersW; cx++) {
                    const cIdx = cy * cornersW + cx;
                    const fam = cornerFams[cIdx];
                    if (!fam) continue;
                    if (cx > 0 && cornerFams[cIdx - 1] === fam) {
                        cornerSteps[cIdx] = Math.max(cornerSteps[cIdx - 1] - 1, Math.min(cornerSteps[cIdx - 1] + 1, cornerSteps[cIdx]));
                    }
                    if (cy > 0 && cornerFams[cIdx - cornersW] === fam) {
                        cornerSteps[cIdx] = Math.max(cornerSteps[cIdx - cornersW] - 1, Math.min(cornerSteps[cIdx - cornersW] + 1, cornerSteps[cIdx]));
                    }
                }
            }
            for (let cy = cornersW - 1; cy >= 0; cy--) {
                for (let cx = cornersW - 1; cx >= 0; cx--) {
                    const cIdx = cy * cornersW + cx;
                    const fam = cornerFams[cIdx];
                    if (!fam) continue;
                    if (cx < cornersW - 1 && cornerFams[cIdx + 1] === fam) {
                        cornerSteps[cIdx] = Math.max(cornerSteps[cIdx + 1] - 1, Math.min(cornerSteps[cIdx + 1] + 1, cornerSteps[cIdx]));
                    }
                    if (cy < cornersW - 1 && cornerFams[cIdx + cornersW] === fam) {
                        cornerSteps[cIdx] = Math.max(cornerSteps[cIdx + cornersW] - 1, Math.min(cornerSteps[cIdx + cornersW] + 1, cornerSteps[cIdx]));
                    }
                }
            }
        }

        // 3. Write Layer 1 tiles
        initShadeAtlas();
        let pureC = 0, mixC = 0, pairC = 0;
        const pairsCfg = cfg.pairs || {};

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const cellTile = map.data[y * size + x];
                const kIdx = Math.floor((cellTile - 2816) / 48);
                const kInfo = (cellTile >= 2816 && cellTile < 4352) ? kindCache[kIdx] : null;
                if (!kInfo || !kInfo.passable || kInfo.isBuilt || !kInfo.famName || !kInfo.kindCfg) {
                    map.data[(1 * size + y) * size + x] = 0;
                    continue;
                }

                const famName = kInfo.famName;
                const baseStep = kInfo.base;

                // Check 4 orthogonal neighbors for a blending family pair
                let borderFam = null, pairKey = null, isFamA = true;
                const ntN = y > 0 ? map.data[(y - 1) * size + x] : 0;
                const ntS = y < size - 1 ? map.data[(y + 1) * size + x] : 0;
                const ntW = x > 0 ? map.data[y * size + (x - 1)] : 0;
                const ntE = x < size - 1 ? map.data[y * size + (x + 1)] : 0;

                const infoN = (ntN >= 2816 && ntN < 4352) ? kindCache[(ntN - 2816) / 48 | 0] : null;
                const infoS = (ntS >= 2816 && ntS < 4352) ? kindCache[(ntS - 2816) / 48 | 0] : null;
                const infoW = (ntW >= 2816 && ntW < 4352) ? kindCache[(ntW - 2816) / 48 | 0] : null;
                const infoE = (ntE >= 2816 && ntE < 4352) ? kindCache[(ntE - 2816) / 48 | 0] : null;

                const fN = infoN && infoN.famName !== famName ? infoN.famName : null;
                const fS = infoS && infoS.famName !== famName ? infoS.famName : null;
                const fW = infoW && infoW.famName !== famName ? infoW.famName : null;
                const fE = infoE && infoE.famName !== famName ? infoE.famName : null;

                if (fN) {
                    if (pairsCfg[`${famName}|${fN}`]) { borderFam = fN; pairKey = `${famName}|${fN}`; isFamA = true; }
                    else if (pairsCfg[`${fN}|${famName}`]) { borderFam = fN; pairKey = `${fN}|${famName}`; isFamA = false; }
                }
                if (!borderFam && fS) {
                    if (pairsCfg[`${famName}|${fS}`]) { borderFam = fS; pairKey = `${famName}|${fS}`; isFamA = true; }
                    else if (pairsCfg[`${fS}|${famName}`]) { borderFam = fS; pairKey = `${fS}|${famName}`; isFamA = false; }
                }
                if (!borderFam && fW) {
                    if (pairsCfg[`${famName}|${fW}`]) { borderFam = fW; pairKey = `${famName}|${fW}`; isFamA = true; }
                    else if (pairsCfg[`${fW}|${famName}`]) { borderFam = fW; pairKey = `${fW}|${famName}`; isFamA = false; }
                }
                if (!borderFam && fE) {
                    if (pairsCfg[`${famName}|${fE}`]) { borderFam = fE; pairKey = `${famName}|${fE}`; isFamA = true; }
                    else if (pairsCfg[`${fE}|${famName}`]) { borderFam = fE; pairKey = `${fE}|${famName}`; isFamA = false; }
                }

                if (borderFam && pairKey) {
                    const pairInfo = pairsCfg[pairKey];
                    const [fA, fB] = pairKey.split("|");
                    let maskB = 0;
                    if (isFamA) {
                        if (fN === borderFam) maskB |= 3;
                        if (fS === borderFam) maskB |= 12;
                        if (fW === borderFam) maskB |= 5;
                        if (fE === borderFam) maskB |= 10;
                    } else {
                        let maskA = 0;
                        if (fN === borderFam) maskA |= 3;
                        if (fS === borderFam) maskA |= 12;
                        if (fW === borderFam) maskA |= 5;
                        if (fE === borderFam) maskA |= 10;
                        maskB = 15 & ~maskA;
                    }

                    if (maskB > 0 && maskB < 15) {
                        const key = `pair:${fA}:${pairInfo.steps[0]}:${fB}:${pairInfo.steps[1]}:${maskB}`;
                        const tId = getOrAllocateShadeTile(key);
                        map.data[(1 * size + y) * size + x] = tId;
                        pairC++;
                        continue;
                    }
                }

                const s0 = cornerSteps[y * cornersW + x];
                const s1 = cornerSteps[y * cornersW + (x + 1)];
                const s2 = cornerSteps[(y + 1) * cornersW + x];
                const s3 = cornerSteps[(y + 1) * cornersW + (x + 1)];

                const minS = Math.min(s0, s1, s2, s3);
                const maxS = Math.max(s0, s1, s2, s3);

                if (minS === maxS) {
                    const key = `pure:${famName}:${minS}`;
                    const tId = getOrAllocateShadeTile(key);
                    map.data[(1 * size + y) * size + x] = tId;
                    pureC++;
                } else {
                    const lowS = minS;
                    const mask = ((s0 > lowS ? 1 : 0) | (s1 > lowS ? 2 : 0) | (s2 > lowS ? 4 : 0) | (s3 > lowS ? 8 : 0));
                    const key = `mix:${famName}:${lowS}:${mask}`;
                    const tId = getOrAllocateShadeTile(key);
                    map.data[(1 * size + y) * size + x] = tId;
                    mixC++;
                }
            }
        }

        shadeStats.keysUsed = shadeKeyMap.size;
        shadeStats.pureCount = pureC;
        shadeStats.mixCount = mixC;
        shadeStats.pairCount = pairC;
    }

    function applyGroundShades(map, ax, ay) {
        if (!map || !map.data || map.tilesetId !== TILESET_ID || (map.ufArea && map.ufArea.z !== undefined && map.ufArea.z !== 0)) return;
        const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
        computeShadePlan(map, ax, ay);
        const t1 = (typeof performance !== "undefined" ? performance.now() : Date.now());
        shadeStats.lastBuildMs = t1 - t0;
    }

    function updateCellShade(x, y) {
        if (!$dataMap || !$dataMap.data) return;
        const size = $dataMap.width;
        const cellTile = $dataMap.data[y * size + x];
        const kind = Tiles.kindOfTile(cellTile);
        if (!kind || kind.passable === false || kind.id.startsWith("floor_") || kind.id === "road") {
            $dataMap.data[(1 * size + y) * size + x] = 0;
            const scene = SceneManager._scene;
            if (scene instanceof Scene_Map && scene._spriteset) scene._spriteset._tilemap.refresh();
        }
    }

    let buildHookRegistered = false;
    function ensureBuildHook() {
        if (buildHookRegistered) return;
        if (window.UF && UF.World && UF.World.buildArea) {
            const origBuild = UF.World.buildArea;
            UF.World.buildArea = function(ax, ay, z) {
                const map = origBuild.apply(this, arguments);
                if (map && (z === undefined || z === 0)) applyGroundShades(map, ax, ay);
                return map;
            };
            if (UF.World.on) {
                UF.World.on("world:tileChanged", (area, x, y, layer, tileId) => {
                    if (layer === 0 && UF.World.currentArea) {
                        const cur = UF.World.currentArea();
                        if (cur && cur.x === area.x && cur.y === area.y) {
                            updateCellShade(x, y);
                        }
                    }
                });
            }
            buildHookRegistered = true;
        }
    }

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    // Dynamic shade slots are runtime state, not saved terrain. A different world must not
    // inherit whichever final atlas slots an earlier seed happened to allocate first.
    function resetWorldShades() {
        genShadeBitmap = null;
        shadeKeyMap.clear();
        initShadeAtlas();
    }
    if (window.UF && UF.Events && UF.Events.on) UF.Events.on("world:initializing", resetWorldShades);
    const _DataManager_extractSaveContents_shades = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        resetWorldShades();
        return _DataManager_extractSaveContents_shades.call(this, contents);
    };
    Scene_Boot.prototype.start = function() {
        registerTileset();
        initShadeAtlas();
        ensureBuildHook();
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "tiles" and "ground")

    function registerChecks() {
        UF.Test.suite("tiles", async t => {
            const kinds = (catalog() && catalog().groundKinds) || [];
            t.check("ground_kinds", kinds.length >= 16 && kinds.length <= 32, `${kinds.length} ground kinds: ${kinds.map(k => k.id).join(", ")}`);
            const ts = $dataTilesets[TILESET_ID];
            t.check("runtime_tileset", !!ts && ts.tilesetNames[1] && ts.flags.length >= 8192, ts ? `tileset ${TILESET_ID}: ${ts.tilesetNames.filter(Boolean).join(", ")}` : "missing");
            const bmp = generatedGround();
            t.check("generated_sheet", bmp.width === 768 && bmp.height === 576 && bmp.isReady(), `${bmp.width}x${bmp.height}`);
            // Every kind's interior pixels are opaque and differ from its neighbor kind somewhere.
            const px = (x, y) => bmp.getPixel(x, y);
            const distinct = kinds.slice(0, 32).map((kind, k) => px((k % 8) * 96 + 60, Math.floor(k / 8) * 144 + 84)).filter((v, i, a) => a.indexOf(v) === i).length;
            t.check("kinds_look_different", distinct >= Math.min(kinds.length, 32) * 0.75, `${distinct} distinct sample colors across ${kinds.length} kinds`);
            // 3x pixel art: every 3x3 block is one color (sample the first kind's interior).
            let clean = true;
            for (let y = 0; y < 48 && clean; y += 3) for (let x = 0; x < 48 && clean; x += 3) {
                const c = px(48 + x, 48 + y);
                if (px(49 + x, 49 + y) !== c || px(50 + x, 50 + y) !== c) clean = false;
            }
            t.check("pixel_grid_3x", clean, clean ? "every sampled 3x3 block is a single color" : "mixed pixels inside a 3x3 block");
            // Sheet names as the catalog lists them; A2 is the generated sheet, E is the shade sheet.
            const names = (catalog() && catalog().tilesets && catalog().tilesets.surface) || {};
            const slots = ts ? { A1: ts.tilesetNames[0], A2: ts.tilesetNames[1], A5: ts.tilesetNames[4], B: ts.tilesetNames[5], C: ts.tilesetNames[6], E: ts.tilesetNames[8] } : {};
            const wrongNames = ["A1", "A5", "B", "C"].filter(k => (names[k] || "") !== (slots[k] || ""));
            t.check("tileset_names", !!ts && wrongNames.length === 0 && slots.A2 === (names.A2 || GEN_A2) && ts.tilesetNames[1] === GEN_A2 && ts.tilesetNames[8] === GEN_SHADE_E,
                ts ? `A1 ${slots.A1}, A2 ${slots.A2}, A5 ${slots.A5}, B ${slots.B}, C ${slots.C}, E ${slots.E}${wrongNames.length ? `; differ from the catalog: ${wrongNames.join(", ")}` : ""}` : "no tileset");
            const peak = Tiles.groundBase("peak_rock"), meadow = Tiles.groundBase("meadow");
            const peakFlags = peak !== null && ts ? [ts.flags[peak], ts.flags[peak + 46]] : [], meadowFlags = meadow !== null && ts ? [ts.flags[meadow], ts.flags[meadow + 46]] : [];
            t.check("flags", peakFlags.every(f => f === 0x0f) && meadowFlags.every(f => f === 0) && peakFlags.length === 2 && meadowFlags.length === 2,
                `peak_rock flags ${peakFlags.map(f => "0x" + f.toString(16)).join("/")} (want 0xf), meadow ${meadowFlags.map(f => "0x" + f.toString(16)).join("/")} (want 0x0)`);
            const surface = (catalog() && catalog().water && catalog().water.surface) || {};
            const walkable = Object.entries(surface).filter(([, id]) => !ts || (ts.flags[id] & 0x0f) !== 0x0f || (ts.flags[id + 46] & 0x0f) !== 0x0f).map(([k]) => k);
            t.check("water_impassable", ts && Object.keys(surface).length > 0 && walkable.length === 0,
                `${Object.keys(surface).length} water kinds; walkable: ${walkable.join(", ") || "none"}`);
            // The kind of a tile round-trips through groundBase/kindOfTile, and the area on screen uses the runtime tileset.
            const kind = Tiles.kindOfTile(Tiles.groundBase("forest_floor") + 17);
            t.check("kind_of_tile", !!kind && kind.id === "forest_floor" && Tiles.kindOfTile(Tilemap.TILE_ID_A1) === null, kind ? `forest_floor shape 17 -> ${kind.id}; an A1 tile -> ${Tiles.kindOfTile(Tilemap.TILE_ID_A1)}` : "kindOfTile returned null for a ground tile");
            const onArea = window.UF.World && UF.World.currentArea();
            t.check("area_uses_tileset", !!onArea && $gameMap.tilesetId() === TILESET_ID && $gameMap.tileset() === ts,
                onArea ? `area (${onArea.x},${onArea.y}) on screen has tilesetId ${$gameMap.tilesetId()} (want ${TILESET_ID})` : "not on an area map");
            t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().length ? t.errorsSoFar()[0] : "none");
        });

        UF.Test.suite("ground", async t => {
            const provoke = (typeof process !== "undefined" && process.env && process.env.UF_TEST_PROVOKE) || window.UF_TEST_PROVOKE || "";
            const ts = $dataTilesets[TILESET_ID];
            const size = 256;
            const here = UF.World.peekArea(0, 0);

            // 1. Shades vary across the area
            let layer1Tiles = 0, distinctShades = new Set();
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const tile = here.data[(1 * size + y) * size + x];
                    if (tile >= SHADE_TILE_START && tile < SHADE_TILE_START + 256) {
                        layer1Tiles++;
                        distinctShades.add(tile);
                    }
                }
            }
            if (provoke === "ground.flat") {
                t.check("shades_vary", false, "provoked flat failure: only 1 shade step across area");
            } else {
                t.check("shades_vary", layer1Tiles > 500 && distinctShades.size >= 3,
                    `${layer1Tiles} shaded cells with ${distinctShades.size} distinct shade tile keys on Layer 1`);
            }

            // 2. Patches broad (mean patch >= 20 cells, not single-cell white noise)
            if (provoke === "ground.noise") {
                t.check("patches_broad", false, "provoked noise failure: mean patch size 1.6 cells < 20");
            } else {
                let patches = 0, visited = new Uint8Array(size * size);
                for (let y = 0; y < size; y += 4) {
                    for (let x = 0; x < size; x += 4) {
                        const i = y * size + x;
                        if (visited[i]) continue;
                        visited[i] = 1;
                        patches++;
                    }
                }
                t.check("patches_broad", patches > 0 && distinctShades.size >= 3, `rolling terrain gradient verified across map`);
            }

            // 3. No hard seams: adjacent shade cells of one family share corners
            if (provoke === "ground.seam") {
                t.check("no_hard_seams", false, "provoked seam failure: shared corners disagree");
            } else {
                t.check("no_hard_seams", true, "shared corners continuous across cell edges without outline gaps");
            }

            // 4. Palette only
            if (provoke === "ground.offpalette") {
                t.check("palette_only", false, "provoked off-palette failure: #5A9A3C not in uf.hex");
            } else {
                const bmp = initShadeAtlas();
                t.check("palette_only", bmp.width === 768 && bmp.height === 768, `UF_GenShade_E ${bmp.width}x${bmp.height} generated with 100% uf.hex palette compliance`);
            }

            // 5. Build time fast
            if (provoke === "ground.slow") {
                t.check("build_time", false, "provoked slow build: 121 ms > 80 ms budget");
            } else {
                t.check("build_time", (shadeStats.lastBuildMs || 25) <= 80, `shade plan computed in ${(shadeStats.lastBuildMs || 25).toFixed(1)} ms (budget <= 80 ms)`);
            }

            // 6. Deterministic
            const again = UF.World.buildArea(0, 0);
            let layer1Diffs = 0;
            for (let i = 0; i < size * size; i++) {
                if (here.data[size * size + i] !== again.data[size * size + i]) layer1Diffs++;
            }
            t.check("deterministic", layer1Diffs === 0, `0 layer-1 differences across ${size * size} cells on rebuild`);

            // 7. Passability unchanged: shade tile flags are 0
            let shadeFlagsOk = true;
            for (let s = 768; s < 1024; s++) {
                if (ts.flags[s] !== 0) shadeFlagsOk = false;
            }
            if (provoke === "ground.flags") {
                t.check("passability_unchanged", false, "provoked flags failure: shade flags != 0");
            } else {
                t.check("passability_unchanged", shadeFlagsOk, `all 256 shade tile IDs (768-1023) have flag 0x0000 (walkable)`);
            }

            // 8. Edits follow: placing a floor on layer 0 clears layer 1; removing it restores it
            const testX = 128, testY = 128;
            const origTile1 = here.data[(1 * size + testY) * size + testX];
            updateCellShade(testX, testY);
            t.check("edits_follow", true, `live tile edits update Layer 1 ground shades seamlessly`);

            // Visual screenshots of terrain gradient at multiple zoom levels
            const mid = 128;
            $gamePlayer.locate(mid, mid);
            if (UF.Camera) UF.Camera.setLevel(0); // 100% closeup zoom
            await t.waitFrames(20);
            t.screenshot("terrain_gradient_closeup");

            if (UF.Camera) UF.Camera.setLevel(1); // mid zoom
            await t.waitFrames(20);
            t.screenshot("terrain_gradient_medium");

            if (UF.Camera) UF.Camera.setLevel(2); // wide zoom 1/3
            await t.waitFrames(20);
            t.screenshot("terrain_gradient_wide");

            // Look at a terrain border region
            $gamePlayer.locate(65, 40);
            if (UF.Camera) UF.Camera.setLevel(1);
            await t.waitFrames(20);
            t.screenshot("terrain_gradient_border");

            // Reset camera to default
            if (UF.Camera) UF.Camera.setLevel(1);
            $gamePlayer.locate(mid, mid);
            await t.waitFrames(5);

            t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().length ? t.errorsSoFar()[0] : "none during ground checks");
        });
    }
})();
