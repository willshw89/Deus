//=============================================================================
// UF_Tiles.js - Ground tiles generated in code, and a runtime tileset for world maps
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Tiles] Generates pixel-art ground autotiles per biome ground kind (from the world catalog) and registers a runtime tileset for world maps.
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
 * Reads "groundKinds" from data/UF_WorldCatalog.json. Each kind (up to 32)
 * becomes one RMMZ A2 autotile, painted in code at native resolution
 * (16 px per cell) and scaled exactly 3x: a textured interior plus an
 * outline on the sides that border a different kind, so biome edges show.
 *
 * The runtime tileset uses: A1 = Outside_A1 (water stand-in), A2 = the
 * generated sheet "UF_GenGround_A2" (or catalog tilesets.surface.A2 if art
 * replaces it), B/C = Outside_B/Outside_C (plant and object tiles).
 * Nothing is written to game/data; the tileset exists only in memory.
 *
 * API and checks: docs/systems/UF_Tiles.md
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const P = PluginManager.parameters("UF_Tiles");
    const TILESET_ID = Number(P.TilesetId || 91);
    const GEN_A2 = "UF_GenGround_A2";
    const NATIVE = 16, SCALE = 3;

    const catalog = () => window.$ufWorldCatalog || null;

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
    function texel(kind, k, x, y) {
        const c = kind.colors.map(hexToRgb); // [base, dark, light, accent]
        const r = rnd(k, x, y);
        const pick = i => c[Math.min(i, c.length - 1)];
        switch (kind.pattern) {
            case "grass": // short vertical blades
                if (rnd(k, x, y >> 1, 7) < 0.18) return pick(2);
                if (r < 0.22) return pick(1);
                return r > 0.93 ? pick(3) : pick(0);
            case "dots": // sand, fine grains
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

    // Serve the generated sheet whenever RMMZ asks for it.
    const _ImageManager_loadTileset = ImageManager.loadTileset;
    ImageManager.loadTileset = function(filename) {
        if (filename === GEN_A2) return generatedGround();
        return _ImageManager_loadTileset.call(this, filename);
    };

    //-------------------------------------------------------------------------
    // The runtime tileset

    const groundKinds = () => ((catalog() && catalog().groundKinds) || []).slice(0, 32);

    const Tiles = {
        TILESET_ID,
        GEN_A2,
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
        /** The runtime tileset record ($dataTilesets[TILESET_ID]) once registered. */
        tileset: () => (window.$dataTilesets && $dataTilesets[TILESET_ID]) || null
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
        $dataTilesets[TILESET_ID] = {
            id: TILESET_ID,
            mode: 1,
            name: "UF World (runtime)",
            note: "",
            tilesetNames: [names.A1 || "Outside_A1", names.A2 || GEN_A2, "", "", names.A5 || "", names.B || "Outside_B", names.C || "Outside_C", "", ""],
            flags
        };
    }

    const _DataManager_onLoad = DataManager.onLoad;
    DataManager.onLoad = function(object) {
        _DataManager_onLoad.call(this, object);
        if (object === window.$dataTilesets || (object === window.$ufWorldCatalog && window.$dataTilesets)) registerTileset();
    };
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        registerTileset();
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "tiles")

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
            // Sheet names as the catalog lists them; A2 is the generated sheet.
            const names = (catalog() && catalog().tilesets && catalog().tilesets.surface) || {};
            const slots = ts ? { A1: ts.tilesetNames[0], A2: ts.tilesetNames[1], A5: ts.tilesetNames[4], B: ts.tilesetNames[5], C: ts.tilesetNames[6] } : {};
            const wrongNames = ["A1", "A5", "B", "C"].filter(k => (names[k] || "") !== (slots[k] || ""));
            t.check("tileset_names", !!ts && wrongNames.length === 0 && slots.A2 === (names.A2 || GEN_A2) && ts.tilesetNames[1] === GEN_A2,
                ts ? `A1 ${slots.A1}, A2 ${slots.A2}, A5 ${slots.A5}, B ${slots.B}, C ${slots.C}${wrongNames.length ? `; differ from the catalog: ${wrongNames.join(", ")}` : ""}` : "no tileset");
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
    }
})();
