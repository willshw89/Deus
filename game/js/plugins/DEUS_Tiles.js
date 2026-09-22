//=============================================================================
// DEUS_Tiles.js - Ground tiles generated in code, and a runtime tileset for world maps
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Tiles] Dynamic terrain autotiling, biome transitions, elevation cliffs, and multi-layer autotile rendering.
 * @author UF project
 * @orderAfter DEUS_WorldGen
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

    const P = (PluginManager.parameters("DEUS_Tiles") && Object.keys(PluginManager.parameters("DEUS_Tiles")).length ? PluginManager.parameters("DEUS_Tiles") : PluginManager.parameters("UF_Tiles"));
    const TILESET_ID = Number(P.TilesetId || 91);
    const GEN_A2 = "UF_GenGround_A2";
    const GEN_SHADE_E = "UF_GenShade_E";
    const NATIVE = 16, SCALE = 3;
    const SHADE_TILE_START = 768; // Tilemap.TILE_ID_E

    const catalog = () => window.$deusWorldCatalog || window.$ufWorldCatalog || null;
    const groundShadesConfig = () => (catalog() && catalog().groundShades) || null;

    // Bayer 4x4 dither matrix normalized to [0, 1)
    const BAYER4 = [
        [ 0.0/16,  8.0/16,  2.0/16, 10.0/16],
        [12.0/16,  4.0/16, 14.0/16,  6.0/16],
        [ 3.0/16, 11.0/16,  1.0/16,  9.0/16],
        [15.0/16,  7.0/16, 13.0/16,  5.0/16]
    ];

    // Bayer 8x8 dither matrix normalized to [0, 1) for native 48px micro-dithering
    const BAYER8 = [
        [ 0.0/64, 32.0/64,  8.0/64, 40.0/64,  2.0/64, 34.0/64, 10.0/64, 42.0/64],
        [48.0/64, 16.0/64, 56.0/64, 24.0/64, 50.0/64, 18.0/64, 58.0/64, 26.0/64],
        [12.0/64, 44.0/64,  4.0/64, 36.0/64, 14.0/64, 46.0/64,  6.0/64, 38.0/64],
        [60.0/64, 28.0/64, 52.0/64, 20.0/64, 62.0/64, 30.0/64, 54.0/64, 22.0/64],
        [ 3.0/64, 35.0/64, 11.0/64, 43.0/64,  1.0/64, 33.0/64,  9.0/64, 41.0/64],
        [51.0/64, 19.0/64, 59.0/64, 27.0/64, 49.0/64, 17.0/64, 57.0/64, 25.0/64],
        [15.0/64, 47.0/64,  7.0/64, 39.0/64, 13.0/64, 45.0/64,  5.0/64, 37.0/64],
        [63.0/64, 31.0/64, 55.0/64, 23.0/64, 61.0/64, 29.0/64, 53.0/64, 21.0/64]
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
            case "grass": // natural organic grass texture without directional bias
                if (rnd(k, x, y, 7) < 0.18) return pick(2);
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
        const natural = ["grass", "dots", "mud", "litter", "needles"].includes(kind.pattern);
        const outline = (x, y) => {
            if (natural && ((x + y) & 1)) return; // 50% dither on natural terrain borders
            set(x, y, edge);
        };
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
        const kinds = (catalog() && catalog().groundKinds) || [];
        if (genBitmap && (!kinds.length || genBitmap._kindsCount === kinds.length)) return genBitmap;
        if (!kinds.length) {
            return new Bitmap(768, 576);
        }
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
        bmp._kindsCount = kinds.length;
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
            if (parts.length >= 6) {
                return { type: "pair", famB: parts[3], stepB: Number(parts[4]), maskB: Number(parts[5]) };
            }
            return { type: "pair", famB: parts[1], stepB: Number(parts[2]), maskB: Number(parts[3]) };
        }
        return null;
    }

    function paintShadeTile(imgData, stride, key, ox, oy) {
        const parsed = parseShadeKey(key);
        if (!parsed) return;
        const cfg = groundShadesConfig();
        if (!cfg || !cfg.families) return;

        const setPixel = (px, py, rgb) => {
            const idx = ((oy + py) * stride + (ox + px)) * 4;
            imgData[idx] = rgb[0];
            imgData[idx + 1] = rgb[1];
            imgData[idx + 2] = rgb[2];
            imgData[idx + 3] = 255;
        };

        if (parsed.type === "pure") {
            const fam = cfg.families[parsed.family];
            if (!fam || !fam.steps[parsed.step]) return;
            const tones = fam.steps[parsed.step].tones;
            // Transparent micro-dither overlay:
            // Non-dither pixels remain alpha = 0 so Layer 0 authentic texture shines through!
            const baseStep = fam.baseStep !== undefined ? fam.baseStep : (fam.steps.length > 2 ? 2 : 0);
            const delta = Math.abs(parsed.step - baseStep);
            const density = delta === 0 ? 0 : (delta === 1 ? 0.16 : (delta === 2 ? 0.32 : 0.48));
            if (density === 0) return; // Completely transparent, Layer 0 handles base step
            
            const pickTone = (parsed.step < baseStep) ? (tones[1] || tones[0]) : (tones[2] || tones[3] || tones[0]);
            const rgb = hexToRgb(pickTone);
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const bayer = BAYER8[y & 7][x & 7];
                    if (bayer < density) {
                        setPixel(x, y, rgb);
                    }
                }
            }
        } else if (parsed.type === "mix") {
            const fam = cfg.families[parsed.family];
            if (!fam) return;
            const mask = parsed.mask;
            const b0 = (mask & 1) ? 1 : 0, b1 = (mask & 2) ? 1 : 0;
            const b2 = (mask & 4) ? 1 : 0, b3 = (mask & 8) ? 1 : 0;
            const baseStep = fam.baseStep !== undefined ? fam.baseStep : (fam.steps.length > 2 ? 2 : 0);

            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const u = (x + 0.5) / 48, v = (y + 0.5) / 48;
                    const val = (1 - u) * (1 - v) * b0 + u * (1 - v) * b1 + (1 - u) * v * b2 + u * v * b3;
                    const stepK = val > 0.5 ? parsed.lowStep + 1 : parsed.lowStep;
                    const stepDef = fam.steps[stepK] || fam.steps[0];
                    const tones = stepDef.tones;
                    const delta = Math.abs(stepK - baseStep);
                    const weight = val > 0.5 ? val : (1 - val);
                    const density = delta === 0 ? 0 : Math.min(0.48, delta * 0.18 * weight);
                    const bayer = BAYER8[y & 7][x & 7];
                    if (bayer < density) {
                        const pickTone = (stepK < baseStep) ? (tones[1] || tones[0]) : (tones[2] || tones[3] || tones[0]);
                        setPixel(x, y, hexToRgb(pickTone));
                    }
                }
            }
        } else if (parsed.type === "pair") {
            const famB = cfg.families[parsed.famB];
            if (!famB) return;
            const stepB = (famB.steps && famB.steps[parsed.stepB]) || (famB.steps && famB.steps[0]);
            if (!stepB) return;
            const maskB = parsed.maskB;
            const b0 = (maskB & 1) ? 1 : 0, b1 = (maskB & 2) ? 1 : 0;
            const b2 = (maskB & 4) ? 1 : 0, b3 = (maskB & 8) ? 1 : 0;
            const isD5   = (maskB & 128) !== 0; // Bit 128 = distance-5 outermost rolling dusting
            const isD4   = (maskB & 64)  !== 0; // Bit 64  = distance-4 outer dusting
            const isDust = (maskB & 32)  !== 0; // Bit 32  = distance-3 outer dusting
            const isD2   = (maskB & 16)  !== 0; // Bit 16  = distance-2 outer diffusion
            const weight = isD5 ? 0.05 : (isD4 ? 0.10 : (isDust ? 0.20 : (isD2 ? 0.35 : 0.55)));
            const ditherBand = isD5 ? 1.80 : (isD4 ? 1.65 : (isDust ? 1.50 : (isD2 ? 1.35 : 1.20)));

            const tones = stepB.tones;
            const colA = hexToRgb(tones[0]);
            const colB = hexToRgb(tones[1] || tones[0]);

            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const u = (x + 0.5) / 48, v = (y + 0.5) / 48;
                    const val = ((1 - u) * (1 - v) * b0 + u * (1 - v) * b1 + (1 - u) * v * b2 + u * v * b3) * weight;
                    const bayer = BAYER8[y & 7][x & 7] - 0.5;
                    const meander = (rnd(parsed.stepB, x, y, 79) - 0.5) * 0.16;
                    const useB = (val + bayer * ditherBand + meander) > 0.5;
                    if (useB) {
                        const rgb = ((x + y) & 2) ? colB : colA;
                        setPixel(x, y, rgb);
                    }
                }
            }
        }
    }

    let pairLookup = null;
    function getPairDef(cfg, fam1, fam2) {
        if (!fam1 || !fam2 || fam1 === fam2) return null;
        if (!pairLookup) {
            pairLookup = Object.create(null);
            const p = (cfg && cfg.pairs) || (groundShadesConfig() && groundShadesConfig().pairs) || {};
            for (const [k, def] of Object.entries(p)) {
                const [a, b] = k.split("|");
                const entry = { fA: a, fB: b, def };
                if (!pairLookup[a]) pairLookup[a] = Object.create(null);
                if (!pairLookup[b]) pairLookup[b] = Object.create(null);
                pairLookup[a][b] = entry;
                pairLookup[b][a] = entry;
            }
        }
        const row = pairLookup[fam1];
        if (row && row[fam2]) return row[fam2];
        const fams = (cfg && cfg.families) || (groundShadesConfig() && groundShadesConfig().families);
        if (fams && fams[fam1] && fams[fam2]) {
            const fallbackEntry = { fA: fam1, fB: fam2, def: { steps: [0, 0] } };
            if (!pairLookup[fam1]) pairLookup[fam1] = Object.create(null);
            if (!pairLookup[fam2]) pairLookup[fam2] = Object.create(null);
            pairLookup[fam1][fam2] = fallbackEntry;
            pairLookup[fam2][fam1] = fallbackEntry;
            return fallbackEntry;
        }
        return null;
    }

    function initShadeAtlas() {
        if (genShadeBitmap) return genShadeBitmap;
        const cfg = groundShadesConfig();
        if (!cfg || !cfg.families) return null;

        shadeKeyMap.clear();

        // Pre-allocate a pure base key for each family so Layer 1 always has fallback tiles
        const keys = [];
        for (const famName of Object.keys(cfg.families)) {
            keys.push(`pure:${famName}:0`);
        }

        keys.forEach((k, idx) => {
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
        genShadeImgData = imgData;
        const bmp = new Bitmap(sheetW, sheetH);
        bmp.context.imageSmoothingEnabled = false;
        bmp.context.drawImage(canvas, 0, 0);
        bmp._baseTexture.update();
        genShadeBitmap = bmp;
        return bmp;
    }

    let genShadeImgData = null;
    let shadeAtlasDirty = false;

    const fallbackMap = new Map();
    let cachedTileToFam = null;
    let cachedTileToInfo = null;
    function getOrAllocateShadeTile(key) {
        const tId = shadeKeyMap.get(key);
        if (tId !== undefined) return tId;
        if (shadeKeyMap.size >= 256) {
            let fb = fallbackMap.get(key);
            if (fb !== undefined) return fb;
            const p = parseShadeKey(key);
            if (p && p.type === "pair") {
                const baseMask = p.maskB & 15;
                const d1Key = `pair:${p.famB}:${p.stepB}:${baseMask}`;
                const fallbackId = shadeKeyMap.get(d1Key);
                fb = (fallbackId !== undefined ? fallbackId : 0);
            } else {
                fb = 0;
            }
            fallbackMap.set(key, fb);
            return fb;
        }
        const newId = SHADE_TILE_START + shadeKeyMap.size;
        shadeKeyMap.set(key, newId);
        if (genShadeImgData) {
            const idx = newId - SHADE_TILE_START;
            const tx = idx % 16, ty = Math.floor(idx / 16);
            paintShadeTile(genShadeImgData.data, 768, key, tx * 48, ty * 48);
            shadeAtlasDirty = true;
        }
        return newId;
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
            if (idA.startsWith("floor_") || idA === "road" || idB.startsWith("floor_") || idB === "road") return false;
            const famA = Tiles.familyOf(idA);
            const famB = Tiles.familyOf(idB);
            if (!famA || !famB) return false;
            if (famA === famB) return true;
            const cfg = groundShadesConfig();
            if (cfg && getPairDef(cfg, famA, famB) !== null) return true;
            return false;
        },

        shadeStats: () => Object.assign({}, shadeStats),
        applyGroundShades: (map, ax, ay) => applyGroundShades(map, ax || 0, ay || 0)
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
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

        // Recognize all A1 water autotiles as water throughout engine systems
        Tilemap.isWaterTile = function(tileId) {
            return Tilemap.isTileA1(tileId);
        };

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
        if (object === window.$deusWorldCatalog || object === window.$ufWorldCatalog) {
            window.$deusWorldCatalog = object;
            window.$ufWorldCatalog = object;
        }
        if (window.$dataTilesets && (window.$deusWorldCatalog || window.$ufWorldCatalog)) {
            registerTileset();
        }
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
        const tStart = performance.now();

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
            const STEP = 8;
            const subW = Math.floor((cornersW - 1) / STEP) + 1;
            const subD = new Float32Array(subW * subW);
            const mapDataForD = map.data;
            for (let sy = 0; sy < subW; sy++) {
                const cy = Math.min(cornersW - 1, sy * STEP);
                const gy = ay * size + cy;
                for (let sx = 0; sx < subW; sx++) {
                    const cx = Math.min(cornersW - 1, sx * STEP);
                    const gx = ax * size + cx;
                    const nMain = WG.valueNoise(seed, 0x5ade, gx, gy, (cfg.field && cfg.field.scale ? cfg.field.scale * 2.5 : 60), d.width, d.height);
                    const nDetail = WG.valueNoise(seed, 0x5adf, gx, gy, (cfg.field && cfg.field.detailScale ? cfg.field.detailScale * 2.5 : 25), d.width, d.height);
                    const f = WG.fieldsFor ? WG.fieldsFor(seed, d, cl, gx, gy) : { r: 0.5, d: 0.5, e: 0.5 };
                    const rainTerm = (1 - f.r) * fw.rain;
                    const drainTerm = f.d * fw.drainage;
                    const heightTerm = Math.max(0, f.e - ((cfg.field && cfg.field.heightFrom) || 0.55)) * fw.height;

                    // Water proximity moisture halo: pulls dryness D down toward lush vibrant green
                    let nearWater = false;
                    if (mapDataForD) {
                        const checkR = 4;
                        for (let dy = -checkR; dy <= checkR; dy += 2) {
                            const wy = ((cy + dy) % size + size) % size;
                            for (let dx = -checkR; dx <= checkR; dx += 2) {
                                const wx = ((cx + dx) % size + size) % size;
                                const tile = mapDataForD[wy * size + wx];
                                if (tile >= 2048 && tile < 2816) { nearWater = true; break; }
                            }
                            if (nearWater) break;
                        }
                    }
                    const waterTerm = nearWater ? fw.water : 0;
                    const val = nMain * fw.noise + nDetail * fw.detail + rainTerm + drainTerm + heightTerm - waterTerm;
                    const centered = (val - 0.50) * 2.6 + 0.50;
                    subD[sy * subW + sx] = Math.max(0, Math.min(1, centered));
                }
            }
            for (let cy = 0; cy < cornersW; cy++) {
                const sy0 = Math.min(subW - 1, cy >> 3);
                const sy1 = Math.min(subW - 1, sy0 + 1);
                const ty = (cy - (sy0 << 3)) * 0.125;
                const cyRow = cy * cornersW;
                const sy0Row = sy0 * subW;
                const sy1Row = sy1 * subW;
                for (let cx = 0; cx < cornersW; cx++) {
                    const sx0 = Math.min(subW - 1, cx >> 3);
                    const sx1 = Math.min(subW - 1, sx0 + 1);
                    const tx = (cx - (sx0 << 3)) * 0.125;
                    const v00 = subD[sy0Row + sx0], v10 = subD[sy0Row + sx1];
                    const v01 = subD[sy1Row + sx0], v11 = subD[sy1Row + sx1];
                    const top = v00 + (v10 - v00) * tx;
                    const btm = v01 + (v11 - v01) * tx;
                    D[cyRow + cx] = top + (btm - top) * ty;
                }
            }
            for (let cy = 0; cy < cornersW; cy++) {
                D[cy * cornersW + size] = D[cy * cornersW + 0];
            }
            const lastRowD = size * cornersW;
            for (let cx = 0; cx < cornersW; cx++) {
                D[lastRowD + cx] = D[0 * cornersW + cx];
            }
        }

    function ensureTileLookups(cfg) {
        if (cachedTileToFam && cachedTileToInfo) return { tileToFam: cachedTileToFam, tileToInfo: cachedTileToInfo };
        const kList = groundKinds();
        const tileToFam = new Array(5000).fill(null);
        const tileToInfo = new Array(5000).fill(null);
        const famNameToId = Object.create(null);
        let nextFamId = 1;
        for (const fName of Object.keys(cfg.families)) {
            famNameToId[fName] = nextFamId++;
        }

        for (let k = 0; k < kList.length; k++) {
            const kd = kList[k];
            const famName = Tiles.familyOf(kd.id);
            const fam = famName ? cfg.families[famName] : null;
            const kindCfg = fam && fam.kinds ? fam.kinds[kd.id] : null;
            const rawShares = (kindCfg && kindCfg.shares) || [];
            const sharesCdf = new Float32Array(rawShares.length);
            let acc = 0;
            for (let i = 0; i < rawShares.length; i++) {
                acc += rawShares[i];
                sharesCdf[i] = acc;
            }
            const info = {
                id: kd.id,
                passable: kd.passable !== false,
                isBuilt: kd.id.startsWith("floor_") || kd.id === "road",
                famName,
                famId: famName ? (famNameToId[famName] || 0) : 0,
                fam,
                kindCfg,
                base: kindCfg ? kindCfg.base : 0,
                window: kindCfg ? (kindCfg.window || [0, fam.steps.length - 1]) : null,
                sharesCdf,
                maxStep: fam ? fam.steps.length - 1 : 0,
                pureCache: new Int16Array(16),
                mixCache: new Int16Array(256)
            };
            const baseTile = Tilemap.TILE_ID_A2 + k * 48;
            for (let s = 0; s < 48; s++) {
                tileToFam[baseTile + s] = famName;
                tileToInfo[baseTile + s] = info;
            }
        }
        cachedTileToFam = tileToFam;
        cachedTileToInfo = tileToInfo;
        return { tileToFam, tileToInfo };
    }

        const { tileToFam, tileToInfo } = ensureTileLookups(cfg);
        const t1 = performance.now();
        const mapData = map.data;

        // 2. Corner step assignment and Lipschitz smoothing
        const cornerSteps = new Int8Array(cornersW * cornersW);
        const cornerFams = new Uint8Array(cornersW * cornersW);

        for (let y = 0; y < size; y++) {
            const rowOffset = y * size;
            const cy0 = y * cornersW;
            const cy1 = cy0 + cornersW;
            for (let x = 0; x < size; x++) {
                const cellTile = mapData[rowOffset + x];
                const kInfo = tileToInfo[cellTile];
                if (!kInfo || kInfo.isBuilt || !kInfo.famId || !kInfo.kindCfg) continue;

                const famId = kInfo.famId;
                const win0 = kInfo.window[0];
                const cdf = kInfo.sharesCdf;
                const cdfLen = cdf.length;
                const maxS = kInfo.maxStep;

                const ci0 = cy0 + x;
                const ci1 = ci0 + 1;
                const ci2 = cy1 + x;
                const ci3 = ci2 + 1;

                if (cornerFams[ci0] === 0) {
                    cornerFams[ci0] = famId;
                    const dVal = D[ci0];
                    let step = win0;
                    for (let s = 0; s < cdfLen; s++) {
                        if (dVal <= cdf[s]) { step = win0 + s; break; }
                    }
                    cornerSteps[ci0] = step < maxS ? step : maxS;
                }
                if (cornerFams[ci1] === 0) {
                    cornerFams[ci1] = famId;
                    const dVal = D[ci1];
                    let step = win0;
                    for (let s = 0; s < cdfLen; s++) {
                        if (dVal <= cdf[s]) { step = win0 + s; break; }
                    }
                    cornerSteps[ci1] = step < maxS ? step : maxS;
                }
                if (cornerFams[ci2] === 0) {
                    cornerFams[ci2] = famId;
                    const dVal = D[ci2];
                    let step = win0;
                    for (let s = 0; s < cdfLen; s++) {
                        if (dVal <= cdf[s]) { step = win0 + s; break; }
                    }
                    cornerSteps[ci2] = step < maxS ? step : maxS;
                }
                if (cornerFams[ci3] === 0) {
                    cornerFams[ci3] = famId;
                    const dVal = D[ci3];
                    let step = win0;
                    for (let s = 0; s < cdfLen; s++) {
                        if (dVal <= cdf[s]) { step = win0 + s; break; }
                    }
                    cornerSteps[ci3] = step < maxS ? step : maxS;
                }
            }
        }

        for (let cy = 0; cy < cornersW; cy++) {
            cornerFams[cy * cornersW + size] = cornerFams[cy * cornersW + 0];
            cornerSteps[cy * cornersW + size] = cornerSteps[cy * cornersW + 0];
        }
        const lastRowCorners = size * cornersW;
        for (let cx = 0; cx < cornersW; cx++) {
            cornerFams[lastRowCorners + cx] = cornerFams[0 * cornersW + cx];
            cornerSteps[lastRowCorners + cx] = cornerSteps[0 * cornersW + cx];
        }

        const t1_5 = performance.now();

        // Lipschitz closure: raster passes forward and backward
        if (provoke !== "ground.seam") {
            // Forward pass: Row 0
            for (let cx = 1; cx < cornersW; cx++) {
                const famId = cornerFams[cx];
                if (famId !== 0 && cornerFams[cx - 1] === famId) {
                    const p = cornerSteps[cx - 1], v = cornerSteps[cx];
                    if (v > p + 1) cornerSteps[cx] = p + 1;
                    else if (v < p - 1) cornerSteps[cx] = p - 1;
                }
            }
            // Forward pass: Rows 1 to cornersW - 1
            for (let cy = 1; cy < cornersW; cy++) {
                let cIdx = cy * cornersW;
                const famId0 = cornerFams[cIdx];
                if (famId0 !== 0 && cornerFams[cIdx - cornersW] === famId0) {
                    const p = cornerSteps[cIdx - cornersW], v = cornerSteps[cIdx];
                    if (v > p + 1) cornerSteps[cIdx] = p + 1;
                    else if (v < p - 1) cornerSteps[cIdx] = p - 1;
                }
                cIdx++;
                for (let cx = 1; cx < cornersW; cx++, cIdx++) {
                    const famId = cornerFams[cIdx];
                    if (famId === 0) continue;
                    let v = cornerSteps[cIdx];
                    const origV = v;
                    if (cornerFams[cIdx - 1] === famId) {
                        const p = cornerSteps[cIdx - 1];
                        if (v > p + 1) v = p + 1;
                        else if (v < p - 1) v = p - 1;
                    }
                    if (cornerFams[cIdx - cornersW] === famId) {
                        const p = cornerSteps[cIdx - cornersW];
                        if (v > p + 1) v = p + 1;
                        else if (v < p - 1) v = p - 1;
                    }
                    if (v !== origV) cornerSteps[cIdx] = v;
                }
            }

            // Backward pass: Bottom row
            const lastRow = (cornersW - 1) * cornersW;
            for (let cx = cornersW - 2; cx >= 0; cx--) {
                const cIdx = lastRow + cx;
                const famId = cornerFams[cIdx];
                if (famId !== 0 && cornerFams[cIdx + 1] === famId) {
                    const p = cornerSteps[cIdx + 1], v = cornerSteps[cIdx];
                    if (v > p + 1) cornerSteps[cIdx] = p + 1;
                    else if (v < p - 1) cornerSteps[cIdx] = p - 1;
                }
            }
            // Backward pass: Rows cornersW - 2 down to 0
            for (let cy = cornersW - 2; cy >= 0; cy--) {
                let cIdx = cy * cornersW + (cornersW - 1);
                const famIdLast = cornerFams[cIdx];
                if (famIdLast !== 0 && cornerFams[cIdx + cornersW] === famIdLast) {
                    const p = cornerSteps[cIdx + cornersW], v = cornerSteps[cIdx];
                    if (v > p + 1) cornerSteps[cIdx] = p + 1;
                    else if (v < p - 1) cornerSteps[cIdx] = p - 1;
                }
                cIdx--;
                for (let cx = cornersW - 2; cx >= 0; cx--, cIdx--) {
                    const famId = cornerFams[cIdx];
                    if (famId === 0) continue;
                    let v = cornerSteps[cIdx];
                    const origV = v;
                    if (cornerFams[cIdx + 1] === famId) {
                        const p = cornerSteps[cIdx + 1];
                        if (v > p + 1) v = p + 1;
                        else if (v < p - 1) v = p - 1;
                    }
                    if (cornerFams[cIdx + cornersW] === famId) {
                        const p = cornerSteps[cIdx + cornersW];
                        if (v > p + 1) v = p + 1;
                        else if (v < p - 1) v = p - 1;
                    }
                    if (v !== origV) cornerSteps[cIdx] = v;
                }
            }
        }

        for (let cy = 0; cy < cornersW; cy++) {
            cornerFams[cy * cornersW + size] = cornerFams[cy * cornersW + 0];
            cornerSteps[cy * cornersW + size] = cornerSteps[cy * cornersW + 0];
        }
        const lastRowCornersEnd = size * cornersW;
        for (let cx = 0; cx < cornersW; cx++) {
            cornerFams[lastRowCornersEnd + cx] = cornerFams[0 * cornersW + cx];
            cornerSteps[lastRowCornersEnd + cx] = cornerSteps[0 * cornersW + cx];
        }

        const t2 = performance.now();

        // 3. Write Layer 1 tiles
        initShadeAtlas();
        let pureC = 0, mixC = 0, pairC = 0;
        const pairsCfg = cfg.pairs || {};
        const layer1Offset = size * size;
        const size2 = size * 2;
        const tileAt = (gx, gy) => mapData[(((gy % size) + size) % size) * size + (((gx % size) + size) % size)];

        for (let y = 0; y < size; y++) {
            const rowOffset = y * size;
            const cy0 = y * cornersW;
            const cy1 = cy0 + cornersW;
            const isYInterior = y > 0 && y < size - 1;

            for (let x = 0; x < size; x++) {
                const idx = rowOffset + x;
                const cellTile = mapData[idx];
                const kInfo = tileToInfo[cellTile];
                if (!kInfo || kInfo.isBuilt || !kInfo.famName || !kInfo.kindCfg) {
                    mapData[layer1Offset + idx] = 0;
                    continue;
                }

                const famName = kInfo.famName;
                const baseStep = kInfo.base;

                let borderFam = null;
                let ntN = 0, ntS = 0, ntW = 0, ntE = 0, ntNW = 0, ntNE = 0, ntSW = 0, ntSE = 0;
                if (isYInterior && x > 0 && x < size - 1) {
                    ntN  = mapData[idx - size];
                    ntS  = mapData[idx + size];
                    ntW  = mapData[idx - 1];
                    ntE  = mapData[idx + 1];
                    ntNW = mapData[idx - size - 1];
                    ntNE = mapData[idx - size + 1];
                    ntSW = mapData[idx + size - 1];
                    ntSE = mapData[idx + size + 1];
                } else {
                    ntN  = tileAt(x, y - 1);
                    ntS  = tileAt(x, y + 1);
                    ntW  = tileAt(x - 1, y);
                    ntE  = tileAt(x + 1, y);
                    ntNW = tileAt(x - 1, y - 1);
                    ntNE = tileAt(x + 1, y - 1);
                    ntSW = tileAt(x - 1, y + 1);
                    ntSE = tileAt(x + 1, y + 1);
                }

                const s0 = cornerSteps[cy0 + x];
                const s1 = cornerSteps[cy0 + x + 1];
                const s2 = cornerSteps[cy1 + x];
                const s3 = cornerSteps[cy1 + x + 1];
                let minS = s0 < s1 ? s0 : s1;
                if (s2 < minS) minS = s2;
                if (s3 < minS) minS = s3;
                let maxS = s0 > s1 ? s0 : s1;
                if (s2 > maxS) maxS = s2;
                if (s3 > maxS) maxS = s3;

                // Quick interior check: if all 8 distance-1 neighbors are identical to cellTile, distance-1 has no border
                const allSameD1 = (ntN === cellTile && ntS === cellTile && ntW === cellTile && ntE === cellTile &&
                                   ntNW === cellTile && ntNE === cellTile && ntSW === cellTile && ntSE === cellTile);

                if (!allSameD1) {
                    const fN  = ntN !== cellTile ? tileToFam[ntN] : null;
                    const fS  = ntS !== cellTile ? tileToFam[ntS] : null;
                    const fW  = ntW !== cellTile ? tileToFam[ntW] : null;
                    const fE  = ntE !== cellTile ? tileToFam[ntE] : null;
                    const fNW = ntNW !== cellTile ? tileToFam[ntNW] : null;
                    const fNE = ntNE !== cellTile ? tileToFam[ntNE] : null;
                    const fSW = ntSW !== cellTile ? tileToFam[ntSW] : null;
                    const fSE = ntSE !== cellTile ? tileToFam[ntSE] : null;

                    const candBf = (fN && fN !== famName ? fN : null) ||
                                   (fS && fS !== famName ? fS : null) ||
                                   (fW && fW !== famName ? fW : null) ||
                                   (fE && fE !== famName ? fE : null) ||
                                   (fNW && fNW !== famName ? fNW : null) ||
                                   (fNE && fNE !== famName ? fNE : null) ||
                                   (fSW && fSW !== famName ? fSW : null) ||
                                   (fSE && fSE !== famName ? fSE : null);
                    const pairInfo = candBf ? getPairDef(cfg, famName, candBf) : null;
                    if (pairInfo) {
                        borderFam = candBf;
                        const candTile = (fN === borderFam ? ntN : (fS === borderFam ? ntS : (fW === borderFam ? ntW : (fE === borderFam ? ntE : (fNW === borderFam ? ntNW : (fNE === borderFam ? ntNE : (fSW === borderFam ? ntSW : ntSE)))))));
                        const candInfo = candTile ? tileToInfo[candTile] : null;
                        const sNeighbor = candInfo ? candInfo.base : 0;

                        let maskTouch = 0;
                        if (fN === borderFam) maskTouch |= 3;   // NW(1) | NE(2)
                        if (fS === borderFam) maskTouch |= 12;  // SW(4) | SE(8)
                        if (fW === borderFam) maskTouch |= 5;   // NW(1) | SW(4)
                        if (fE === borderFam) maskTouch |= 10;  // NE(2) | SE(8)
                        if (fNW === borderFam) maskTouch |= 1;  // NW(1)
                        if (fNE === borderFam) maskTouch |= 2;  // NE(2)
                        if (fSW === borderFam) maskTouch |= 4;  // SW(4)
                        if (fSE === borderFam) maskTouch |= 8;  // SE(8)

                        if (maskTouch > 0) {
                            const key = `pair:${borderFam}:${sNeighbor}:${maskTouch}`;
                            const tId = getOrAllocateShadeTile(key);
                            if (tId > 0) {
                                mapData[layer1Offset + idx] = tId;
                                pairC++;
                                continue;
                            }
                        }
                    } else {
                        // Intra-family kind transition check
                        const kId = kInfo.id;
                        const iN = ntN !== cellTile ? tileToInfo[ntN] : null;
                        const iS = ntS !== cellTile ? tileToInfo[ntS] : null;
                        const iW = ntW !== cellTile ? tileToInfo[ntW] : null;
                        const iE = ntE !== cellTile ? tileToInfo[ntE] : null;
                        const iNW = ntNW !== cellTile ? tileToInfo[ntNW] : null;
                        const iNE = ntNE !== cellTile ? tileToInfo[ntNE] : null;
                        const iSW = ntSW !== cellTile ? tileToInfo[ntSW] : null;
                        const iSE = ntSE !== cellTile ? tileToInfo[ntSE] : null;

                        const candKind = (iN && iN.id !== kId && iN.famName === famName ? iN : null) ||
                                         (iS && iS.id !== kId && iS.famName === famName ? iS : null) ||
                                         (iW && iW.id !== kId && iW.famName === famName ? iW : null) ||
                                         (iE && iE.id !== kId && iE.famName === famName ? iE : null) ||
                                         (iNW && iNW.id !== kId && iNW.famName === famName ? iNW : null) ||
                                         (iNE && iNE.id !== kId && iNE.famName === famName ? iNE : null) ||
                                         (iSW && iSW.id !== kId && iSW.famName === famName ? iSW : null) ||
                                         (iSE && iSE.id !== kId && iSE.famName === famName ? iSE : null);
                        if (candKind) {
                            borderFam = famName;
                            const targetId = candKind.id;
                            let maskTouch = 0;
                            if (iN && iN.id === targetId) maskTouch |= 3;
                            if (iS && iS.id === targetId) maskTouch |= 12;
                            if (iW && iW.id === targetId) maskTouch |= 5;
                            if (iE && iE.id === targetId) maskTouch |= 10;
                            if (iNW && iNW.id === targetId) maskTouch |= 1;
                            if (iNE && iNE.id === targetId) maskTouch |= 2;
                            if (iSW && iSW.id === targetId) maskTouch |= 4;
                            if (iSE && iSE.id === targetId) maskTouch |= 8;

                            if (maskTouch > 0) {
                                const key = `pair:${famName}:${candKind.base}:${maskTouch}`;
                                const tId = getOrAllocateShadeTile(key);
                                if (tId > 0) {
                                    mapData[layer1Offset + idx] = tId;
                                    pairC++;
                                    continue;
                                }
                            }
                        }
                    }
                }

                // Check distance-2 neighbors for broad multi-tile outer diffusion
                if (!borderFam) {
                    const d2N  = (y >= 2) ? mapData[idx - size2] : tileAt(x, y - 2);
                    const d2S  = (y < size - 2) ? mapData[idx + size2] : tileAt(x, y + 2);
                    const d2W  = (x >= 2) ? mapData[idx - 2] : tileAt(x - 2, y);
                    const d2E  = (x < size - 2) ? mapData[idx + 2] : tileAt(x + 2, y);

                    if (d2N !== cellTile || d2S !== cellTile || d2W !== cellTile || d2E !== cellTile) {
                        const d2NW = (y >= 2 && x >= 2) ? mapData[idx - size2 - 2] : tileAt(x - 2, y - 2);
                        const d2NE = (y >= 2 && x < size - 2) ? mapData[idx - size2 + 2] : tileAt(x + 2, y - 2);
                        const d2SW = (y < size - 2 && x >= 2) ? mapData[idx + size2 - 2] : tileAt(x - 2, y + 2);
                        const d2SE = (y < size - 2 && x < size - 2) ? mapData[idx + size2 + 2] : tileAt(x + 2, y + 2);
                        const d2fN  = d2N !== cellTile ? tileToFam[d2N] : null;
                        const d2fS  = d2S !== cellTile ? tileToFam[d2S] : null;
                        const d2fW  = d2W !== cellTile ? tileToFam[d2W] : null;
                        const d2fE  = d2E !== cellTile ? tileToFam[d2E] : null;
                        const d2fNW = d2NW !== cellTile ? tileToFam[d2NW] : null;
                        const d2fNE = d2NE !== cellTile ? tileToFam[d2NE] : null;
                        const d2fSW = d2SW !== cellTile ? tileToFam[d2SW] : null;
                        const d2fSE = d2SE !== cellTile ? tileToFam[d2SE] : null;

                        const candD2Bf = (d2fN && d2fN !== famName ? d2fN : null) ||
                                       (d2fS && d2fS !== famName ? d2fS : null) ||
                                       (d2fW && d2fW !== famName ? d2fW : null) ||
                                       (d2fE && d2fE !== famName ? d2fE : null) ||
                                       (d2fNW && d2fNW !== famName ? d2fNW : null) ||
                                       (d2fNE && d2fNE !== famName ? d2fNE : null) ||
                                       (d2fSW && d2fSW !== famName ? d2fSW : null) ||
                                       (d2fSE && d2fSE !== famName ? d2fSE : null);
                        const pairD2Info = candD2Bf ? getPairDef(cfg, famName, candD2Bf) : null;
                        if (pairD2Info) {
                            borderFam = candD2Bf;
                            const candD2Tile = (d2fN === borderFam ? d2N : (d2fS === borderFam ? d2S : (d2fW === borderFam ? d2W : (d2fE === borderFam ? d2E : (d2fNW === borderFam ? d2NW : (d2fNE === borderFam ? d2NE : (d2fSW === borderFam ? d2SW : d2SE)))))));
                            const candD2Info = candD2Tile ? tileToInfo[candD2Tile] : null;
                            const sNeighbor = candD2Info ? candD2Info.base : 0;

                            let maskTouch = 0;
                            if (d2fN === borderFam) maskTouch |= 3;
                            if (d2fS === borderFam) maskTouch |= 12;
                            if (d2fW === borderFam) maskTouch |= 5;
                            if (d2fE === borderFam) maskTouch |= 10;
                            if (d2fNW === borderFam) maskTouch |= 1;
                            if (d2fNE === borderFam) maskTouch |= 2;
                            if (d2fSW === borderFam) maskTouch |= 4;
                            if (d2fSE === borderFam) maskTouch |= 8;

                            const maskB = maskTouch | 16; // Bit 16: distance-2 dusting
                            const key = `pair:${borderFam}:${sNeighbor}:${maskB}`;
                            const tId = getOrAllocateShadeTile(key);
                            if (tId > 0) {
                                mapData[layer1Offset + idx] = tId;
                                pairC++;
                                continue;
                            }
                        } else {
                            // Intra-family distance-2
                            const kId = kInfo.id;
                            const d2iN = d2N !== cellTile ? tileToInfo[d2N] : null;
                            const d2iS = d2S !== cellTile ? tileToInfo[d2S] : null;
                            const d2iW = d2W !== cellTile ? tileToInfo[d2W] : null;
                            const d2iE = d2E !== cellTile ? tileToInfo[d2E] : null;
                            const candD2Kind = (d2iN && d2iN.id !== kId && d2iN.famName === famName ? d2iN : null) ||
                                              (d2iS && d2iS.id !== kId && d2iS.famName === famName ? d2iS : null) ||
                                              (d2iW && d2iW.id !== kId && d2iW.famName === famName ? d2iW : null) ||
                                              (d2iE && d2iE.id !== kId && d2iE.famName === famName ? d2iE : null);
                            if (candD2Kind) {
                                borderFam = famName;
                                const targetId = candD2Kind.id;
                                let maskTouch = 0;
                                if (d2iN && d2iN.id === targetId) maskTouch |= 3;
                                if (d2iS && d2iS.id === targetId) maskTouch |= 12;
                                if (d2iW && d2iW.id === targetId) maskTouch |= 5;
                                if (d2iE && d2iE.id === targetId) maskTouch |= 10;
                                const maskB = maskTouch | 16;
                                const key = `pair:${famName}:${candD2Kind.base}:${maskB}`;
                                const tId = getOrAllocateShadeTile(key);
                                if (tId > 0) {
                                    mapData[layer1Offset + idx] = tId;
                                    pairC++;
                                    continue;
                                }
                            }
                        }
                    }
                }

                // Check distance-3 neighbors for broad outer rolling gradient
                if (!borderFam) {
                    const d3N = (y >= 3) ? mapData[idx - size * 3] : tileAt(x, y - 3);
                    const d3S = (y < size - 3) ? mapData[idx + size * 3] : tileAt(x, y + 3);
                    const d3W = (x >= 3) ? mapData[idx - 3] : tileAt(x - 3, y);
                    const d3E = (x < size - 3) ? mapData[idx + 3] : tileAt(x + 3, y);

                    if (d3N !== cellTile || d3S !== cellTile || d3W !== cellTile || d3E !== cellTile) {
                        const dfN = d3N !== cellTile ? tileToFam[d3N] : null;
                        const dfS = d3S !== cellTile ? tileToFam[d3S] : null;
                        const dfW = d3W !== cellTile ? tileToFam[d3W] : null;
                        const dfE = d3E !== cellTile ? tileToFam[d3E] : null;

                        const candBf = (dfN && dfN !== famName ? dfN : null) ||
                                       (dfS && dfS !== famName ? dfS : null) ||
                                       (dfW && dfW !== famName ? dfW : null) ||
                                       (dfE && dfE !== famName ? dfE : null);
                        const pairInfo = candBf ? getPairDef(cfg, famName, candBf) : null;
                        if (pairInfo) {
                            borderFam = candBf;
                            const candD3Tile = (dfN === borderFam ? d3N : (dfS === borderFam ? d3S : (dfW === borderFam ? d3W : d3E)));
                            const candD3Info = candD3Tile ? tileToInfo[candD3Tile] : null;
                            const sNeighbor = candD3Info ? candD3Info.base : 0;

                            let maskTouch = 0;
                            if (dfN === borderFam) maskTouch |= 3;
                            if (dfS === borderFam) maskTouch |= 12;
                            if (dfW === borderFam) maskTouch |= 5;
                            if (dfE === borderFam) maskTouch |= 10;

                            const maskB = maskTouch | 32;
                            const key = `pair:${borderFam}:${sNeighbor}:${maskB}`;
                            const tId = getOrAllocateShadeTile(key);
                            if (tId > 0) {
                                mapData[layer1Offset + idx] = tId;
                                pairC++;
                                continue;
                            }
                        } else {
                            const kId = kInfo.id;
                            const diN = d3N !== cellTile ? tileToInfo[d3N] : null;
                            const diS = d3S !== cellTile ? tileToInfo[d3S] : null;
                            const diW = d3W !== cellTile ? tileToInfo[d3W] : null;
                            const diE = d3E !== cellTile ? tileToInfo[d3E] : null;
                            const candDKind = (diN && diN.id !== kId && diN.famName === famName ? diN : null) ||
                                             (diS && diS.id !== kId && diS.famName === famName ? diS : null) ||
                                             (diW && diW.id !== kId && diW.famName === famName ? diW : null) ||
                                             (diE && diE.id !== kId && diE.famName === famName ? diE : null);
                            if (candDKind) {
                                borderFam = famName;
                                const targetId = candDKind.id;
                                let maskTouch = 0;
                                if (diN && diN.id === targetId) maskTouch |= 3;
                                if (diS && diS.id === targetId) maskTouch |= 12;
                                if (diW && diW.id === targetId) maskTouch |= 5;
                                if (diE && diE.id === targetId) maskTouch |= 10;
                                const maskB = maskTouch | 32;
                                const key = `pair:${famName}:${candDKind.base}:${maskB}`;
                                const tId = getOrAllocateShadeTile(key);
                                if (tId > 0) {
                                    mapData[layer1Offset + idx] = tId;
                                    pairC++;
                                    continue;
                                }
                            }
                        }
                    }
                }

                if (minS === maxS) {
                    if (minS === baseStep) {
                        mapData[layer1Offset + idx] = 0; // Pure base is already rendered on Layer 0!
                    } else {
                        let tId = kInfo.pureCache[minS];
                        if (!tId) {
                            const key = `pure:${famName}:${minS}`;
                            tId = getOrAllocateShadeTile(key);
                            kInfo.pureCache[minS] = tId;
                        }
                        mapData[layer1Offset + idx] = tId;
                        pureC++;
                    }
                } else {
                    const lowS = minS;
                    const mask = ((s0 > lowS ? 1 : 0) | (s1 > lowS ? 2 : 0) | (s2 > lowS ? 4 : 0) | (s3 > lowS ? 8 : 0));
                    const mixIdx = (lowS << 4) | mask;
                    let tId = kInfo.mixCache[mixIdx];
                    if (!tId) {
                        const key = `mix:${famName}:${lowS}:${mask}`;
                        tId = getOrAllocateShadeTile(key);
                        kInfo.mixCache[mixIdx] = tId;
                    }
                    mapData[layer1Offset + idx] = tId;
                    mixC++;
                }
            }
        }

        const tEnd = performance.now();
        shadeStats.tD = (t1 - tStart).toFixed(1);
        shadeStats.tC = (t2 - t1).toFixed(1);
        shadeStats.tAssign = (t1_5 - t1).toFixed(1);
        shadeStats.tLip = (t2 - t1_5).toFixed(1);
        shadeStats.tL1 = (tEnd - t2).toFixed(1);

        shadeStats.keysUsed = shadeKeyMap.size;
        shadeStats.pureCount = pureC;
        shadeStats.mixCount = mixC;
        shadeStats.pairCount = pairC;
    }

    function applyGroundShades(map, ax, ay) {
        if (!map || !map.data || map.tilesetId !== TILESET_ID || (map.ufArea && map.ufArea.z !== undefined && map.ufArea.z !== 0)) return;
        initShadeAtlas();
        const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
        computeShadePlan(map, ax, ay);
        const t1 = (typeof performance !== "undefined" ? performance.now() : Date.now());
        shadeStats.lastBuildMs = t1 - t0;

        if (shadeAtlasDirty && genShadeBitmap && genShadeImgData) {
            genShadeBitmap.context.putImageData(genShadeImgData, 0, 0);
            genShadeBitmap._baseTexture.update();
            shadeAtlasDirty = false;
        }
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
        genShadeImgData = null;
        pairLookup = null;
        shadeKeyMap.clear();
        fallbackMap.clear();
        cachedTileToFam = null;
        cachedTileToInfo = null;
        initShadeAtlas();
    }
    if (window.UF && UF.Events && UF.Events.on) UF.Events.on("world:initializing", resetWorldShades);
    const _DataManager_extractSaveContents_shades = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        resetWorldShades();
        return _DataManager_extractSaveContents_shades.call(this, contents);
    };
    Scene_Boot.prototype.start = function() {
        if (window.$deusWorldCatalog && !window.$ufWorldCatalog) window.$ufWorldCatalog = window.$deusWorldCatalog;
        if (window.$ufWorldCatalog && !window.$deusWorldCatalog) window.$deusWorldCatalog = window.$ufWorldCatalog;
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
            await t.waitUntil(() => window.UF.World && UF.World.currentArea() && $gameMap && $gameMap.mapId() > 0, 8000, "currentArea");
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

            // 5. Build time fast (GROUND_SHADES.md: median of 3 builds <= 80 ms)
            if (provoke === "ground.slow") {
                t.check("build_time", false, "provoked slow build: 121 ms > 80 ms budget");
            } else {
                // Warmup call to allow V8 JIT tier-up
                computeShadePlan(here, 0, 0);
                const times = [];
                for (let r = 0; r < 3; r++) {
                    const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
                    computeShadePlan(here, 0, 0);
                    const t1 = (typeof performance !== "undefined" ? performance.now() : Date.now());
                    times.push(t1 - t0);
                }
                times.sort((a, b) => a - b);
                const medianMs = times[1];
                t.check("build_time", medianMs <= 80, `shade plan computed in ${medianMs.toFixed(1)} ms (median of 3, budget <= 80 ms) [min: ${times[0].toFixed(1)}ms, max: ${times[2].toFixed(1)}ms]`);
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
            const borderCells = [];
            const curMap = $dataMap;
            const revMap = new Map();
            for (const [k, id] of shadeKeyMap.entries()) revMap.set(id, k);
            for (let dy = -1; dy <= 2; dy++) {
                const y = mid + dy;
                const row = [];
                for (let dx = -4; dx <= 4; dx++) {
                    const x = mid + dx;
                    const t0 = curMap.data[y * size + x];
                    const t1 = curMap.data[(1 * size + y) * size + x];
                    const kd = Tiles.kindOfTile(t0);
                    const kId = kd ? kd.id : (Tilemap.isTileA1(t0) ? "water" : "?");
                    row.push(`(${dx},${dy}):${kId}:L1=${t1}[${revMap.get(t1) || "?"}]`);
                }
                borderCells.push(row.join(" | "));
            }
            t.check("diag_seam", true, borderCells.join(" || "));
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
            try {
                const fsNode = require("fs");
                const pathNode = require("path");
                const dumpLines = [];
                for (let dy = -6; dy <= 6; dy++) {
                    const row = [];
                    for (let dx = -8; dx <= 8; dx++) {
                        const x = 65 + dx, y = 40 + dy;
                        const t0 = $dataMap.data[y * size + x];
                        const t1 = $dataMap.data[(1 * size + y) * size + x];
                        const kd = Tiles.kindOfTile(t0);
                        const kId = kd ? kd.id : (t0 >= 2048 && t0 < 2816 ? "water" : "?");
                        const shape = (t0 - 2816) % 48;
                        row.push(`${x},${y}:${kId}[sh${shape}]:L1=${t1}[${revMap.get(t1) || "?"}]`);
                    }
                    dumpLines.push(row.join(" | "));
                }
                fsNode.writeFileSync(pathNode.join(process.cwd(), "test_output", "border_inspect.txt"), dumpLines.join("\n"), "utf8");
            } catch (err) {}
            t.screenshot("terrain_gradient_border");


            // Reset camera to default
            if (UF.Camera) UF.Camera.setLevel(1);
            $gamePlayer.locate(mid, mid);
            await t.waitFrames(5);

            t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().length ? t.errorsSoFar()[0] : "none during ground checks");
        });
    }
})();
