//=============================================================================
// DEUS_Levels.js - Five persistent levels (+2 to -2): cell shapes, one map per level, switching the view
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Levels] Multi-level vertical world: 5 persistent elevation layers (-2 to +2), caverns, and Z-level transitions.
 * @author UF project
 * @base DEUS_World
 * @orderAfter DEUS_World
 * @orderAfter DEUS_WorldGen
 * @orderAfter DEUS_Tiles
 * @orderAfter DEUS_Objects
 * @orderAfter DEUS_Items
 * @orderAfter DEUS_Jobs
 * @orderAfter DEUS_Combat
 * @orderAfter DEUS_TimeSpeed
 * @orderAfter DEUS_Camera
 * @orderAfter DEUS_Look
 * @orderAfter DEUS_Fire
 *
 * @help
 * The world is five persistent 256x256 levels at the same x,y (VISION V80,
 * docs/design/VERTICAL_WORLD.md): -2, -1, Ground, +1, +2. Vertical slice 1
 * (docs/design/VERTICAL_BUILD_PLAN.md section 5) is here:
 *
 * - Cells: every cell of every level has a shape (solid, floor, open, ramp,
 *   stair up / down / both) and a material. A level is a seeded baseline
 *   (regenerated from the world seed, never saved) plus sparse changes saved
 *   in UF.World.state.levels[z].cells. -1 and -2 are rock and soil with
 *   seeded open pockets; +1 and +2 are open air; the ground's shape is its
 *   ground tiles. Every baseline is generated and checksummed at New Game.
 * - Maps: one RMMZ map id per level (UF_World). The levels other than the
 *   ground are painted from their shapes with runtime tileset 92, built at
 *   boot from the stock sheets named in the catalog's levels.look (stock
 *   RPG Maker MZ placeholders, VISION V9; tints baked in).
 * - The view: "," or "<" = up a level, "." or ">" = down, Home = the
 *   ground; or click the arrows on the level plate beside the speed buttons.
 *   The cursor cell and the camera stay where they were. Follow mode (a
 *   followed unit) changes level with the unit. A level switch is a camera
 *   move: no autosave, the image cache is kept.
 * - Saves: a save made before V80 loads unchanged at the ground; every
 *   record gets z 0 and the four other levels come from its seed.
 *
 * Suites: vertical (the default run skips it). Provocations for the checks:
 * UF_TEST_PROVOKE=vertical.<check> in a --uf-test run only.
 *
 * API, events, save data and checks: docs/systems/UF_Levels.md
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const TILESET_ID = 92;
    const GEN = 4;                        // a save keeps its baseline generator version; version 1, 2 and 3 are preserved below
    const LEVELS = Object.freeze([-2, -1, 0, 1, 2]);
    const LABELS = Object.freeze({ 2: "+2", 1: "+1", 0: "Ground", "-1": "-1", "-2": "-2" });
    const SHAPES = Object.freeze({ solid: 1, floor: 2, open: 3, ramp: 4, stairUp: 5, stairDown: 6, stairBoth: 7 });
    const SHAPE_NAMES = ["", "solid", "floor", "open", "ramp", "stairUp", "stairDown", "stairBoth"];
    const MATERIALS = Object.freeze(["stone", "soil", "wood"]);
    const STONE = 0, SOIL = 1, WOOD = 2;
    const SOLID = 1, FLOOR = 2, OPEN = 3, RAMP = 4, STAIR_UP = 5, STAIR_DOWN = 6, STAIR_BOTH = 7;
    const BORDER = 2;                     // cells of solid rock kept round the edge of the levels below ground

    // Baseline parameters per generator version. Frozen: changing them would change every old save's levels (the load
    // check reports a checksum mismatch). A new look of the levels is a new version (slice 4, RESOURCE_ATLAS).
    const GEN_PARAMS = Object.freeze({
        1: {
            "-1": { caveScale: 18, caveThreshold: 0.76, soilScale: 36, soilThreshold: 0.5 },
            "-2": { caveScale: 30, caveThreshold: 0.74, soilScale: 0, soilThreshold: 1 }
        }
    });
    // Generic geological labels from RESOURCE_ATLAS, not generated settlements.
    // These identify substrate and floor art; resources/ecology are separate generators.
    const BIOMES = Object.freeze([
        null,
        { id: "rooted_loam", name: "Rooted loam", material: SOIL, floorLook: "mined_soil", depthBand: "upper_earth" },
        { id: "clay_bed", name: "Clay bed", material: SOIL, floorLook: "mined_soil", depthBand: "upper_earth" },
        { id: "chalk_karst", name: "Chalk and karst", material: STONE, floorLook: "mined_stone", depthBand: "upper_earth" },
        { id: "shallow_cave", name: "Shallow cave", material: SOIL, floorLook: "cave_floor", depthBand: "upper_earth" },
        { id: "deep_mine_belt", name: "Deep mine belt", material: STONE, floorLook: "mined_stone", depthBand: "deep" },
        { id: "crystal_cavern", name: "Crystal cavern", material: STONE, floorLook: "cave_floor", depthBand: "deep" },
        { id: "fossil_bed", name: "Fossil bed", material: STONE, floorLook: "mined_soil", depthBand: "deep" },
        { id: "deep_salt_cavern", name: "Deep salt cavern", material: STONE, floorLook: "cave_floor", depthBand: "deep" }
    ].map(b => b && Object.freeze(b)));

    // Where each look sits in the runtime sheets: the slots of docs/handoffs/HANDOFF_vertical.md section 3, so the
    // delivered UF_Levels_* sheets drop in through the catalog alone.
    const TARGET = Object.freeze({
        rock: ["A4", 0], soil: ["A4", 1],
        cave_floor: ["A2", 0], mined_stone: ["A2", 1], mined_soil: ["A2", 2], deck_wood: ["A2", 3], deck_stone: ["A2", 4],
        open_air: ["A2", 5], hole_edge: ["A2", 6], roof_wood: ["A2", 7],
        stair_up: ["B", 1], stair_down: ["B", 2], stair_both: ["B", 3], ramp_up: ["B", 4], ramp_top: ["B", 5],
        ladder_foot: ["B", 6], ladder_top: ["B", 7], vein_iron: ["B", 8], vein_copper: ["B", 9], vein_gold: ["B", 10], vein_gem: ["B", 11]
    });
    // Stock placeholders (HANDOFF_vertical.md section 2) when the catalog has no levels.look entry for a key.
    const DEFAULT_LOOK = Object.freeze({
        rock: { sheet: "Dungeon_A4", slot: "A4", kind: 1, tint: "#8c8c9c" },
        soil: { sheet: "Dungeon_A4", slot: "A4", kind: 0, tint: "#b0a090" },
        cave_floor: { sheet: "Dungeon_A2", slot: "A2", kind: 8 },
        mined_stone: { sheet: "Dungeon_A2", slot: "A2", kind: 10 },
        mined_soil: { sheet: "Dungeon_A2", slot: "A2", kind: 2 },
        deck_wood: { sheet: "Inside_A2", slot: "A2", kind: 8 },
        deck_stone: { sheet: "Inside_A2", slot: "A2", kind: 1 },
        open_air: { sheet: null, slot: "A2", color: "transparent" },
        hole_edge: { sheet: "Dungeon_A2", slot: "A2", kind: 6 },
        roof_wood: { sheet: "Outside_A3", slot: "A3", kind: 4 },
        stair_up: { sheet: "Dungeon_B", slot: "B", tile: 2 },
        stair_down: { sheet: "Dungeon_B", slot: "B", tile: 10 },
        stair_both: { sheet: "Dungeon_A5", slot: "A5", tile: 83 },
        ramp_up: { sheet: "Dungeon_A5", slot: "A5", tile: 43 },
        ramp_top: { sheet: "Dungeon_A5", slot: "A5", tile: 43, tint: "#6a6a7a" },
        ladder_foot: { sheet: "Dungeon_B", slot: "B", tile: 5 },
        ladder_top: { sheet: "Dungeon_B", slot: "B", tile: 29 },
        vein_iron: { sheet: "Dungeon_B", slot: "B", tile: 32, tint: "#e07050" },
        vein_copper: { sheet: "Dungeon_B", slot: "B", tile: 32, tint: "#50e0a8" },
        vein_gold: { sheet: "Dungeon_B", slot: "B", tile: 32, tint: "#ffff50" },
        vein_gem: { sheet: "Dungeon_B", slot: "B", tile: 37 }
    });
    // Flat colours drawn in a slot whose sheet failed to load, so a level still reads (graybox).
    const FALLBACK_RGB = { rock: "#5c5c68", soil: "#6e5c48", open_air: "rgba(0,0,0,0)", hole_edge: "#20242c" };
    const IMPASSABLE_LOOKS = new Set(["rock", "soil", "open_air", "hole_edge"]);
    const SHEETS = Object.freeze({ A1: "UF_GenLevels_A1", A2: "UF_GenLevels_A2", A4: "UF_GenLevels_A4", B: "UF_GenLevels_B" });
    const SHEET_SIZE = Object.freeze({ A1: [768, 576], A2: [768, 576], A4: [768, 720], B: [768, 768] });
    const NAME_OF = { rock: "Rock", soil: "Soil", cave_floor: "Cave floor", mined_stone: "Dug stone floor", mined_soil: "Dug earth floor",
        deck_wood: "Wooden floor", deck_stone: "Stone floor", open_air: "Open air", freshwater_pool: "Fresh water", lava_pool: "Lava pool" };

    const World = () => (window.UF && UF.World) || null;
    const catalog = () => window.$ufWorldCatalog || null;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const zOf = o => o && o.z !== undefined ? o.z : o && o.area && o.area.z !== undefined ? o.area.z : 0;

    // Test provocations (each check seen failing once): UF_TEST_PROVOKE=vertical.<check>, read only in --uf-test runs.
    const PROVOKE = (() => {
        const argv = (typeof nw !== "undefined" && nw.App && nw.App.argv) || [];
        if (!argv.some(a => a === "--uf-test" || String(a).startsWith("--uf-test="))) return [];
        const env = (typeof process !== "undefined" && process.env && process.env.UF_TEST_PROVOKE) || "";
        return env.split(",").map(s => s.trim()).filter(s => s.startsWith("vertical."));
    })();
    const provoked = name => PROVOKE.includes(`vertical.${name}`);

    const isLevel = z => (Number.isInteger(z) && z >= -2 && z <= 2) || (provoked("five_levels") && z === 3);

    //-------------------------------------------------------------------------
    // Seeded noise (self-contained, so a change elsewhere never changes a saved world's levels)

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
    const hashString = s => {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
        return h;
    };
    const smooth = t => t * t * (3 - 2 * t);
    function valueNoise(seed, salt, gx, gy, scale) {
        const fx = gx / scale, fy = gy / scale;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const tx = smooth(fx - ix), ty = smooth(fy - iy);
        const c = (a, b) => hash32(seed, salt, a, b) / 4294967296;
        const a = c(ix, iy), b = c(ix + 1, iy), d = c(ix, iy + 1), e = c(ix + 1, iy + 1);
        const top = a + (b - a) * tx, bottom = d + (e - d) * tx;
        return top + (bottom - top) * ty;
    }
    // FNV-1a over bytes, as 8 hex digits.
    function fnvBytes(h, bytes) {
        for (let i = 0; i < bytes.length; i++) {
            h ^= bytes[i];
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    }
    const hex = h => (h >>> 0).toString(16).padStart(8, "0");

    //-------------------------------------------------------------------------
    // Autotile shapes from the engine's own table (the same derivation as UF_WorldGen, kept here so this file stands alone)

    let shapeByMask = null;
    function maskTable() {
        if (shapeByMask) return shapeByMask;
        const lookup = new Map();
        for (let s = 0; s < 47; s++) lookup.set(JSON.stringify(Tilemap.FLOOR_AUTOTILE_TABLE[s]), s);
        const NB = [[0, -1, 1], [0, 1, 2], [-1, 0, 4], [1, 0, 8], [-1, -1, 16], [1, -1, 32], [-1, 1, 64], [1, 1, 128]];
        shapeByMask = new Uint8Array(256);
        for (let mask = 0; mask < 256; mask++) {
            const same = (dx, dy) => (mask & NB.find(q => q[0] === dx && q[1] === dy)[2]) !== 0;
            const n = same(0, -1), s = same(0, 1), w = same(-1, 0), e = same(1, 0);
            const nw = same(-1, -1), ne = same(1, -1), sw = same(-1, 1), se = same(1, 1);
            const tl = n && w ? (nw ? [2, 4] : [2, 0]) : (!n && !w ? [0, 2] : (n ? [0, 4] : [2, 2]));
            const tr = n && e ? (ne ? [1, 4] : [3, 0]) : (!n && !e ? [3, 2] : (n ? [3, 4] : [1, 2]));
            const bl = s && w ? (sw ? [2, 3] : [2, 1]) : (!s && !w ? [0, 5] : (s ? [0, 3] : [2, 5]));
            const br = s && e ? (se ? [1, 3] : [3, 1]) : (!s && !e ? [3, 5] : (s ? [3, 3] : [1, 5]));
            const key = JSON.stringify([tl, tr, bl, br]);
            shapeByMask[mask] = lookup.has(key) ? lookup.get(key) : 0;
        }
        return shapeByMask;
    }
    const NB8 = [[0, -1, 1], [0, 1, 2], [-1, 0, 4], [1, 0, 8], [-1, -1, 16], [1, -1, 32], [-1, 1, 64], [1, 1, 128]];

    //-------------------------------------------------------------------------
    // Looks: which stock sheet draws each look (catalog levels.look, else the placeholders above)

    function looks() {
        const c = catalog();
        const fromCat = (c && c.levels && c.levels.look) || {};
        const out = {};
        for (const key of Object.keys(TARGET)) {
            const e = fromCat[key] || DEFAULT_LOOK[key];
            if (e && e.sheet && e.slot) out[key] = e;
        }
        out.freshwater_pool = { sheet: "Dungeon_A1", slot: "A1", kind: 0 };
        out.lava_pool = { sheet: "Dungeon_A1", slot: "A1", kind: 4 };
        return out;
    }

    // Runtime sheets: the looks copied (and tinted) into the handoff's slots, built once at boot.
    const composed = { state: "idle", sources: null, bitmaps: {}, ms: 0, failed: [], t0: 0 };
    const srcUrl = name => `img/tilesets/${Utils.encodeURI(name)}.png`;

    function startCompose() {
        if (composed.state !== "idle") return;
        composed.state = "loading";
        composed.t0 = performance.now();
        const L = looks();
        composed.sources = {};
        for (const key of Object.keys(L)) {
            const name = L[key].sheet;
            if (!composed.sources[name]) composed.sources[name] = Bitmap.load(srcUrl(name));
        }
    }
    function composeReady() {
        if (composed.state === "done") return true;
        if (composed.state === "idle") startCompose();
        const srcs = Object.values(composed.sources || {});
        if (srcs.some(b => !b.isReady() && !b.isError())) return false;
        compose();
        return true;
    }

    // Source rectangle of a look in its own sheet: { x, y, w, h, layout: "A2" | "A4" | "tile" | "A3" }.
    function sourceOf(e) {
        const k = e.kind | 0, i = e.tile | 0;
        switch (e.slot) {
            case "A2": return { x: (k % 8) * 96, y: Math.floor(k / 8) * 144, w: 96, h: 144, layout: "A2" };
            case "A4": {
                const row = Math.floor(k / 8), y = (row >> 1) * 240;
                return { x: (k % 8) * 96, y, w: 96, h: 240, layout: "A4" }; // the top (96x144) and its side (96x96) below it
            }
            case "A3": return { x: (k % 8) * 96, y: Math.floor(k / 8) * 96, w: 96, h: 96, layout: "A3" };
            case "A5": return { x: (i % 8) * 48, y: Math.floor(i / 8) * 48, w: 48, h: 48, layout: "tile" };
            case "B": case "C": case "D": case "E":
                return { x: ((Math.floor(i / 128) % 2) * 8 + (i % 8)) * 48, y: Math.floor((i % 128) / 8) * 48, w: 48, h: 48, layout: "tile" };
            default: return null;
        }
    }
    // A 48x48 piece that stands for the whole look (for fills when the source and target layouts differ).
    function interiorOf(src) {
        if (src.layout === "A2" || src.layout === "A4") return { x: src.x + 24, y: src.y + 72, w: 48, h: 48 }; // the interior (shape 0) quarters
        if (src.layout === "A3") return { x: src.x + 24, y: src.y + 24, w: 48, h: 48 };
        return { x: src.x, y: src.y, w: 48, h: 48 };
    }

    function drawPiece(dst, srcCanvas, r, dx, dy, tint) {
        const tmp = document.createElement("canvas");
        tmp.width = r.w;
        tmp.height = r.h;
        const c = tmp.getContext("2d");
        c.imageSmoothingEnabled = false;
        c.drawImage(srcCanvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
        if (tint) {
            c.globalCompositeOperation = "multiply";
            c.fillStyle = tint;
            c.fillRect(0, 0, r.w, r.h);
            c.globalCompositeOperation = "destination-in"; // keep the source's transparency
            c.drawImage(srcCanvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
            c.globalCompositeOperation = "source-over";
        }
        dst.context.drawImage(tmp, dx, dy);
    }

    function compose() {
        const t0 = performance.now();
        const L = looks();
        for (const slot of Object.keys(SHEETS)) {
            const [w, h] = SHEET_SIZE[slot];
            composed.bitmaps[slot] = composed.bitmaps[slot] || new Bitmap(w, h);
            composed.bitmaps[slot].clear();
        }
        const dstA1 = composed.bitmaps["A1"];
        if (dstA1) {
            const bmpDungA1 = composed.sources["Dungeon_A1"];
            if (bmpDungA1 && bmpDungA1.isReady() && !bmpDungA1.isError()) {
                dstA1.context.drawImage(bmpDungA1.canvas, 0, 0);
            } else {
                const bmpOutA1 = composed.sources["Outside_A1"];
                if (bmpOutA1 && bmpOutA1.isReady() && !bmpOutA1.isError()) {
                    dstA1.context.drawImage(bmpOutA1.canvas, 0, 0);
                }
            }
        }
        composed.failed = [];
        for (const key of Object.keys(TARGET)) {
            const e = L[key];
            const [slot, index] = TARGET[key];
            const dst = composed.bitmaps[slot];
            // The target block: A2 96x144 kind; A4 top 96x144 + side 96x96 below; B one 48x48 tile.
            const block = slot === "A2" ? { x: (index % 8) * 96, y: Math.floor(index / 8) * 144, w: 96, h: 144 }
                : slot === "A4" ? { x: (index % 8) * 96, y: 0, w: 96, h: 240 }
                    : { x: ((Math.floor(index / 128) % 2) * 8 + (index % 8)) * 48, y: Math.floor((index % 128) / 8) * 48, w: 48, h: 48 };
            if (key === "open_air") {
                dst.clearRect(block.x, block.y, block.w, block.h);
                continue;
            }
            if (e && e.color === "#000000") {
                dst.fillRect(block.x, block.y, block.w, block.h, "#000000");
                continue;
            }
            const bmp = e && composed.sources[e.sheet];
            const src = e ? sourceOf(e) : null;
            if (!bmp || !bmp.isReady() || bmp.isError() || !src) {
                composed.failed.push(`${key}: ${e ? `${e.sheet} ${bmp && bmp.isError() ? "failed to load" : "not usable"}` : "no look"}`);
                if (FALLBACK_RGB[key] || slot !== "B") dst.fillRect(block.x, block.y, block.w, block.h, FALLBACK_RGB[key] || "#9a9080");
                continue;
            }
            const canvas = bmp.canvas;
            const tint = e.tint || null;
            const sameLayout = (slot === "A2" && src.layout === "A2") || (slot === "A4" && src.layout === "A4") || (slot === "B" && src.layout === "tile");
            if (sameLayout) {
                drawPiece(dst, canvas, src, block.x, block.y, tint);
            } else if (slot === "A4" && src.layout === "A2") {
                drawPiece(dst, canvas, src, block.x, block.y, tint);                      // the top from the floor block
                const piece = interiorOf(src);
                for (let yy = 144; yy < 240; yy += 48) for (let xx = 0; xx < 96; xx += 48) drawPiece(dst, canvas, piece, block.x + xx, block.y + yy, tint);
            } else {
                // Different layouts (a single tile into an autotile block, a block into a tile): repeat one 48x48 piece.
                const piece = interiorOf(src);
                for (let yy = 0; yy < block.h; yy += 48) for (let xx = 0; xx < block.w; xx += 48) drawPiece(dst, canvas, piece, block.x + xx, block.y + yy, tint);
            }
        }
        for (const slot of Object.keys(SHEETS)) composed.bitmaps[slot]._baseTexture.update();
        composed.sources = null; // the composed sheets are all that's kept
        composed.state = "done";
        composed.ms = performance.now() - t0;
        composed.loadMs = t0 - composed.t0;
        if (composed.failed.length) console.warn(`UF_Levels: looks drawn flat (sheet missing or unusable): ${composed.failed.join("; ")}`);
    }

    const _ImageManager_loadTileset = ImageManager.loadTileset;
    ImageManager.loadTileset = function(filename) {
        for (const slot of Object.keys(SHEETS)) {
            if (filename === SHEETS[slot]) {
                if (composed.state !== "done") composeReady();
                return composed.bitmaps[slot] || (composed.bitmaps[slot] = new Bitmap(SHEET_SIZE[slot][0], SHEET_SIZE[slot][1]));
            }
        }
        return _ImageManager_loadTileset.call(this, filename);
    };

    // Tile ids of the looks in tileset 92.
    function tileBase(key) {
        if (key === "freshwater_pool") return Tilemap.TILE_ID_A1;
        if (key === "lava_pool") return Tilemap.TILE_ID_A1 + 4 * 48;
        const t = TARGET[key];
        if (!t) return 0;
        if (t[0] === "A2") return Tilemap.TILE_ID_A2 + t[1] * 48;
        if (t[0] === "A4") return Tilemap.TILE_ID_A4 + t[1] * 48;
        return t[1]; // B
    }
    const LOOK_KEYS = Object.keys(TARGET);
    const LOOK_INDEX = {};
    LOOK_KEYS.forEach((k, i) => { LOOK_INDEX[k] = i + 1; });

    // Tileset 92 in memory: the runtime sheets, and passage flags by look (rock, soil, air and holes block).
    function registerTileset() {
        if (!window.$dataTilesets) return;
        const flags = new Array(8192).fill(0);
        for (let i = 0; i < 256; i++) flags[i] = 0x10; // B tiles: no effect on passage unless a connector says otherwise
        for (const key of LOOK_KEYS) {
            const [slot, index] = TARGET[key];
            if (slot === "B") {
                // Stairs and ramps stand on a floor and are walkable; veins lie on rock and leave it blocking.
                if (/^(stair|ramp|ladder)/.test(key)) flags[index] = 0;
                continue;
            }
            const base = tileBase(key), f = IMPASSABLE_LOOKS.has(key) ? 0x0f : 0;
            for (let s = 0; s < 48; s++) flags[base + s] = f;
            if (slot === "A4") for (let s = 0; s < 48; s++) flags[base + 8 * 48 + s] = f; // the side autotile of the same kind
        }
        for (let s = 0; s < 48; s++) flags[Tilemap.TILE_ID_A1 + s] = 0x0f;
        for (let s = 0; s < 48; s++) flags[Tilemap.TILE_ID_A1 + 4 * 48 + s] = 0x0f;
        $dataTilesets[TILESET_ID] = {
            id: TILESET_ID, mode: 1, name: "UF Levels (runtime)", note: "",
            tilesetNames: [SHEETS.A1, SHEETS.A2, "", SHEETS.A4, "", SHEETS.B, "", "", ""],
            flags
        };
    }

    const _DataManager_onLoad = DataManager.onLoad;
    DataManager.onLoad = function(object) {
        _DataManager_onLoad.call(this, object);
        if (object === window.$dataTilesets) registerTileset();
    };

    // Boot waits for the runtime sheets (a few stock PNGs), so no level is ever drawn from empty sheets.
    const _Scene_Boot_isReady = Scene_Boot.prototype.isReady;
    Scene_Boot.prototype.isReady = function() {
        if (!_Scene_Boot_isReady.call(this)) return false;
        return composeReady();
    };

    //-------------------------------------------------------------------------
    // Baselines: the seeded shape and material of every cell of a level (runtime only; regenerated from the seed)

    const baselines = new Map(); // "seed:gen:z:ax,ay" -> { shape: Uint8Array, material: Uint8Array }
    const stats = { generated: 0, genMs: 0, lastGenMs: 0, shapeReads: 0, switches: 0, lastSwitch: null, migrations: 0, checksumMismatches: 0, composeMs: 0 };

    function levelGen(st, z) {
        const L = st && st.levels && st.levels[String(z)];
        return L && L.gen ? L.gen : GEN;
    }

    function generateUnderground(seed, gen, z, ax, ay, size, shape, material) {
        const biome = new Uint8Array(size * size), water = new Uint8Array(size * size), pockets = [];
        if (gen === 2) {
            const salt = hashString(`uf.levels.v2.${z}`), offset = hash32(seed, salt, 99) % 4;
            const rand = (...p) => hash32(seed, salt, ax, ay, ...p) / 4294967296;
            const provinces = [];
            for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) {
                const i = py * 4 + px;
                provinces.push({ x: (px + 0.25 + rand(i, 1) * 0.5) * size / 4,
                    y: (py + 0.25 + rand(i, 2) * 0.5) * size / 4,
                    code: (z === -1 ? 1 : 5) + ((px + py + offset) % 4) });
            }
            shape.fill(SOLID);
            for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                let nearest = null, distance = Infinity;
                for (const p of provinces) {
                    const d = (x - p.x) ** 2 + (y - p.y) ** 2;
                    if (d < distance) { nearest = p; distance = d; }
                }
                const i = y * size + x;
                biome[i] = nearest.code;
                material[i] = BIOMES[nearest.code].material;
            }
            const divisions = z === -1 ? 6 : 4, span = size / divisions;
            for (let py = 0; py < divisions; py++) for (let px = 0; px < divisions; px++) {
                const id = py * divisions + px + 1;
                const x = Math.round((px + 0.5 + (rand(id, 3) - 0.5) * 0.16) * span);
                const y = Math.round((py + 0.5 + (rand(id, 4) - 0.5) * 0.16) * span);
                const rx = span * (0.235 + rand(id, 5) * 0.035), ry = span * (0.195 + rand(id, 6) * 0.030);
                const bounds = { x0: Math.max(BORDER, Math.floor(x - rx * 1.06)), x1: Math.min(size - BORDER - 1, Math.ceil(x + rx * 1.06)),
                    y0: Math.max(BORDER, Math.floor(y - ry * 1.06)), y1: Math.min(size - BORDER - 1, Math.ceil(y + ry * 1.06)) };
                let floorCells = 0;
                for (let cy = bounds.y0; cy <= bounds.y1; cy++) for (let cx = bounds.x0; cx <= bounds.x1; cx++) {
                    const edge = 0.96 + valueNoise(seed, salt + id, cx + ax * size, cy + ay * size, 7) * 0.08;
                    if (((cx - x) / rx) ** 2 + ((cy - y) / ry) ** 2 > edge) continue;
                    shape[cy * size + cx] = FLOOR; floorCells++;
                }
                const wx = x + Math.floor(rx * 0.62), wy = y;
                for (let cy = wy; cy <= wy + 1; cy++) for (let cx = wx; cx <= wx + 1; cx++) {
                    if (shape[cy * size + cx] === FLOOR) water[cy * size + cx] = 1;
                }
                pockets.push({ id, z, area: { x: ax, y: ay }, x, y, floorCells,
                    clearRadius: Math.max(1, Math.floor(Math.min(rx, ry) * 0.62)), bounds,
                    biome: BIOMES[biome[y * size + x]].id, water: { x: wx, y: wy } });
            }
            if (provoked("underground_biomes")) { shape.fill(FLOOR); biome.fill(z === -1 ? 1 : 5); }
            pockets.sort((a, b) => b.floorCells - a.floorCells || a.id - b.id);
            return { biome, water, pockets };
        }

        // GEN >= 3: Continuous rolling cavern network with interconnected halls, corridors, and natural pillars
        const salt = hashString(`uf.levels.v3.${z}`), offset = hash32(seed, salt, 99) % 4;
        const rand = (...p) => hash32(seed, salt, ax, ay, ...p) / 4294967296;
        const provinces = [];
        for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) {
            const i = py * 4 + px;
            provinces.push({
                x: (px + 0.25 + rand(i, 1) * 0.5) * size / 4,
                y: (py + 0.25 + rand(i, 2) * 0.5) * size / 4,
                code: (z === -1 ? 1 : 5) + ((px + py + offset) % 4)
            });
        }
        shape.fill(SOLID);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            let nearest = null, distance = Infinity;
            for (const p of provinces) {
                const d = (x - p.x) ** 2 + (y - p.y) ** 2;
                if (d < distance) { nearest = p; distance = d; }
            }
            const i = y * size + x;
            biome[i] = nearest.code;
            material[i] = BIOMES[nearest.code].material;
        }

        for (let y = BORDER; y < size - BORDER; y++) {
            for (let x = BORDER; x < size - BORDER; x++) {
                const gx = ax * size + x, gy = ay * size + y;
                const n1 = valueNoise(seed, salt + 101, gx, gy, z === -1 ? 26 : 30);
                const n2 = valueNoise(seed, salt + 102, gx, gy, 13);
                const n3 = valueNoise(seed, salt + 103, gx, gy, 6);
                const cVal = n1 * 0.55 + n2 * 0.32 + n3 * 0.13;

                const t1 = Math.abs(valueNoise(seed, salt + 201, gx, gy, 20) - 0.5) * 2;
                const t2 = Math.abs(valueNoise(seed, salt + 202, gx, gy, 20) - 0.5) * 2;
                const tVal = Math.min(t1, t2);

                const pVal = valueNoise(seed, salt + 301, gx, gy, 5);

                const isHall = cVal > (z === -1 ? 0.54 : 0.56);
                const isCorridor = tVal < (z === -1 ? 0.080 : 0.068);

                if ((isHall || isCorridor) && !(isHall && pVal > 0.84)) {
                    shape[y * size + x] = FLOOR;
                }
            }
        }

        const divisions = z === -1 ? 6 : 4, span = size / divisions;
        for (let py = 0; py < divisions; py++) {
            for (let px = 0; px < divisions; px++) {
                const id = py * divisions + px + 1;
                const minX = Math.max(BORDER + 4, Math.floor(px * span));
                const maxX = Math.min(size - BORDER - 5, Math.floor((px + 1) * span));
                const minY = Math.max(BORDER + 4, Math.floor(py * span));
                const maxY = Math.min(size - BORDER - 5, Math.floor((py + 1) * span));

                let bestX = Math.floor((minX + maxX) / 2);
                let bestY = Math.floor((minY + maxY) / 2);
                let bestScore = -1;

                for (let cy = minY + 2; cy <= maxY - 2; cy += 2) {
                    for (let cx = minX + 2; cx <= maxX - 2; cx += 2) {
                        let score = 0;
                        for (let dy = -3; dy <= 3; dy++) {
                            for (let dx = -3; dx <= 3; dx++) {
                                if (shape[(cy + dy) * size + (cx + dx)] === FLOOR) score++;
                            }
                        }
                        if (score > bestScore) {
                            bestScore = score;
                            bestX = cx;
                            bestY = cy;
                        }
                    }
                }

                const clearRadius = 3;
                for (let dy = -clearRadius; dy <= clearRadius; dy++) {
                    for (let dx = -clearRadius; dx <= clearRadius; dx++) {
                        const idx = (bestY + dy) * size + (bestX + dx);
                        shape[idx] = FLOOR;
                        water[idx] = 0;
                    }
                }

                const wx = Math.min(size - BORDER - 2, bestX + clearRadius + 2);
                const wy = bestY;
                for (let dy = 0; dy <= 1; dy++) {
                    for (let dx = 0; dx <= 1; dx++) {
                        const idx = (wy + dy) * size + (wx + dx);
                        shape[idx] = FLOOR;
                        water[idx] = 1;
                    }
                }

                const bounds = {
                    x0: Math.max(BORDER, bestX - 12),
                    x1: Math.min(size - BORDER - 1, bestX + 12),
                    y0: Math.max(BORDER, bestY - 12),
                    y1: Math.min(size - BORDER - 1, bestY + 12)
                };

                pockets.push({
                    id, z,
                    area: { x: ax, y: ay },
                    x: bestX, y: bestY,
                    floorCells: bestScore * 10,
                    clearRadius,
                    bounds,
                    biome: BIOMES[biome[bestY * size + bestX]].id,
                    water: { x: wx, y: wy }
                });
            }
        }
        if (provoked("underground_biomes")) { shape.fill(FLOOR); biome.fill(z === -1 ? 1 : 5); }
        pockets.sort((a, b) => b.floorCells - a.floorCells || a.id - b.id);
        return { biome, water, pockets };
    }

    function surfaceElevation(seed, gx, gy, size, d, cl) {
        const mid = Math.floor(size / 2);
        const lx = ((gx % size) + size) % size;
        const ly = ((gy % size) + size) % size;
        const distToCamp = Math.hypot(lx - mid, ly - mid);

        // Within starting camp clearing (r <= 12), always datum S = 0
        if (distToCamp <= 12) return 0;

        const G = window.UF && UF.WorldGen;
        let e = 0.45;
        if (G && typeof G.fieldsFor === "function" && d && cl) {
            const f = G.fieldsFor(seed, d, cl, gx, gy);
            e = f.e;
        } else {
            const saltElev = hashString("uf.worldgen.elevation");
            e = valueNoise(seed, saltElev, gx, gy, 64);
        }

        const saltPlateau = hashString("uf.levels.plateau");
        const upland = valueNoise(seed, saltPlateau, gx, gy, 48);
        const saltRelief = hashString("uf.levels.relief");
        const relief = valueNoise(seed, saltRelief, gx, gy, 18);
        let eff = (e * 0.55 + upland * 0.45) + (relief - 0.5) * 0.15;

        // Smooth transition ring near camp (12 < r < 18)
        if (distToCamp < 18) {
            const blend = (distToCamp - 12) / 6;
            eff = eff * blend + 0.35 * (1 - blend);
        }

        if (eff >= 0.58) return 2;
        if (eff >= 0.44) return 1;
        return 0;
    }

    function cliffCaveMouthsForArea(seed, ax, ay, size, d, cl) {
        const mid = Math.floor(size / 2);
        const saltCliffCave = hashString("uf.levels.cliff_cave");
        const S_cache = new Int8Array(size * size);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const gx = ax * size + x, gy = ay * size + y;
                S_cache[y * size + x] = surfaceElevation(seed, gx, gy, size, d, cl);
            }
        }

        const candidates = [];
        const minCoord = BORDER + 3, maxCoord = size - BORDER - 4;
        for (let y = minCoord; y <= maxCoord; y++) {
            for (let x = minCoord; x <= maxCoord; x++) {
                const i = y * size + x;
                const S = S_cache[i];
                if (S < 1) continue; // Must be on elevated landform (S >= 1)

                const gx = ax * size + x, gy = ay * size + y;
                const distToCamp = Math.hypot(x - mid, y - mid);
                if (distToCamp <= 16) continue; // Outside camp clearing radius

                const caveNoise = valueNoise(seed, saltCliffCave, gx, gy, 12);
                if (caveNoise <= 0.72) continue;

                // Look for an adjacent cell that is valley floor (S == 0)
                let outDir = null;
                for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
                    const nx = x + dx, ny = y + dy;
                    if (S_cache[ny * size + nx] === 0) {
                        outDir = { dx, dy };
                        break;
                    }
                }
                if (!outDir) continue;

                // Inward direction into the cliff face
                const inDir = { dx: -outDir.dx, dy: -outDir.dy };
                const t1 = { x: x + inDir.dx, y: y + inDir.dy };
                const t2 = { x: x + 2 * inDir.dx, y: y + 2 * inDir.dy };

                // Ensure tunnel remains within solid landform bounds
                if (t2.x < BORDER + 1 || t2.x >= size - BORDER - 1 || t2.y < BORDER + 1 || t2.y >= size - BORDER - 1) continue;
                if (S_cache[t1.y * size + t1.x] < 1 || S_cache[t2.y * size + t2.x] < 1) continue;

                candidates.push({
                    x, y, gx, gy,
                    noise: caveNoise,
                    inDir, outDir,
                    tunnel: [{ x, y }, t1, t2],
                    terminus: t2
                });
            }
        }

        // Filter candidates by minimum distance (at least 8 tiles apart) to avoid clutter
        candidates.sort((a, b) => b.noise - a.noise);
        const selected = [];
        for (const c of candidates) {
            const tooClose = selected.some(s => Math.hypot(s.x - c.x, s.y - c.y) < 8);
            if (!tooClose) selected.push(c);
        }
        return selected;
    }

    function generateBaseline(seed, gen, z, ax, ay, size) {
        const t0 = performance.now();
        const n = size * size;
        const shape = new Uint8Array(n), material = new Uint8Array(n);
        let extra = null;
        if (gen >= 4) {
            const W = World(), st = W && W.state;
            const d = (st && st.areasX) ? { width: st.areasX * size, height: st.areasY * size, seed } : { width: size, height: size, seed };
            const cat = catalog(), cl = (cat && cat.climate) || { continentRim: 0.15, seaLevel: 0.2, scale: { elevation: 64, rainfall: 48, temperature: 96, detail: 16 } };

            if (z < 0) {
                extra = generateUnderground(seed, gen, z, ax, ay, size, shape, material) || {};
                if (z === -1) {
                    const cliffMouths = cliffCaveMouthsForArea(seed, ax, ay, size, d, cl);
                    extra.cliffCaves = cliffMouths;
                    for (const m of cliffMouths) {
                        const term = m.terminus;
                        const termi = term.y * size + term.x;
                        shape[termi] = STAIR_UP;
                        material[termi] = STONE;
                        if (extra.water) extra.water[termi] = 0;

                        // 3x3 dry landing vestibule around stairs up
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                const vx = term.x + dx, vy = term.y + dy;
                                if (vx >= BORDER && vx < size - BORDER && vy >= BORDER && vy < size - BORDER) {
                                    const vi = vy * size + vx;
                                    if (shape[vi] === SOLID) {
                                        shape[vi] = FLOOR;
                                        material[vi] = STONE;
                                    }
                                    if (extra.water) extra.water[vi] = 0;
                                }
                            }
                        }

                        // Connect vestibule to nearest underground cavern floor
                        let nearestDist = Infinity, targetX = -1, targetY = -1;
                        for (let cy = BORDER; cy < size - BORDER; cy++) {
                            for (let cx = BORDER; cx < size - BORDER; cx++) {
                                const ci = cy * size + cx;
                                if (shape[ci] === FLOOR && (Math.abs(cx - term.x) > 1 || Math.abs(cy - term.y) > 1)) {
                                    const dist = Math.hypot(cx - term.x, cy - term.y);
                                    if (dist < nearestDist) {
                                        nearestDist = dist;
                                        targetX = cx;
                                        targetY = cy;
                                    }
                                }
                            }
                        }

                        if (targetX >= 0 && nearestDist < 30) {
                            let curX = term.x, curY = term.y;
                            while (curX !== targetX || curY !== targetY) {
                                if (curX < targetX) curX++;
                                else if (curX > targetX) curX--;
                                else if (curY < targetY) curY++;
                                else if (curY > targetY) curY--;
                                const ci = curY * size + curX;
                                if (shape[ci] === SOLID) {
                                    shape[ci] = FLOOR;
                                    material[ci] = STONE;
                                }
                                if (extra.water) extra.water[ci] = 0;
                            }
                        }
                    }
                }
            } else {
                const S_grid = new Int8Array(n);
                for (let y = 0; y < size; y++) {
                    for (let x = 0; x < size; x++) {
                        const i = y * size + x, gx = ax * size + x, gy = ay * size + y;
                        const S = surfaceElevation(seed, gx, gy, size, d, cl);
                        S_grid[i] = S;

                        if (z < S) {
                            shape[i] = SOLID;
                            material[i] = STONE;
                        } else if (z === S) {
                            shape[i] = FLOOR;
                            material[i] = SOIL;
                        } else {
                            shape[i] = OPEN;
                            material[i] = STONE;
                        }
                    }
                }

                // Natural ramps connecting single-step elevation transitions (ΔS = 1)
                const saltRamp = hashString("uf.levels.natural_ramp");
                for (let y = 1; y < size - 1; y++) {
                    for (let x = 1; x < size - 1; x++) {
                        const i = y * size + x;
                        if (shape[i] === FLOOR && S_grid[i] === z) {
                            const gx = ax * size + x, gy = ay * size + y;
                            const rampNoise = valueNoise(seed, saltRamp, gx, gy, 8);
                            if (rampNoise > 0.65) {
                                for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
                                    const ni = (y + dy) * size + (x + dx);
                                    if (S_grid[ni] === z + 1) {
                                        shape[i] = RAMP;
                                        material[i] = STONE;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                // Cliff cave mouths breaching cliff faces horizontally into the mountain at z = 0
                if (z === 0) {
                    const cliffMouths = cliffCaveMouthsForArea(seed, ax, ay, size, d, cl);
                    extra = { cliffCaves: cliffMouths };
                    for (const m of cliffMouths) {
                        shape[m.y * size + m.x] = FLOOR;
                        material[m.y * size + m.x] = STONE;
                        const t1 = m.tunnel[1];
                        shape[t1.y * size + t1.x] = FLOOR;
                        material[t1.y * size + t1.x] = STONE;
                        const term = m.terminus;
                        shape[term.y * size + term.x] = STAIR_DOWN;
                        material[term.y * size + term.x] = STONE;
                    }
                }
            }
        } else if (z > 0) {
            shape.fill(OPEN);
        } else if (z < 0) {
            if (gen >= 2) extra = generateUnderground(seed, gen, z, ax, ay, size, shape, material);
            else {
            const P = GEN_PARAMS[1][String(z)];
            const saltCave = hashString(`uf.levels.cave.${z}`), saltSoil = hashString(`uf.levels.soil.${z}`);
            const d = World().state || { areasX: 1, areasY: 1 };
            const W = d.areasX * size, H = d.areasY * size;
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const i = y * size + x, gx = ax * size + x, gy = ay * size + y;
                    const edge = gx < BORDER || gy < BORDER || gx >= W - BORDER || gy >= H - BORDER;
                    shape[i] = !edge && valueNoise(seed, saltCave, gx, gy, P.caveScale) > P.caveThreshold ? FLOOR : SOLID;
                    material[i] = P.soilScale > 0 && valueNoise(seed, saltSoil, gx, gy, P.soilScale) > P.soilThreshold ? SOIL : STONE;
                }
            }
            }
        } else {
            shape.fill(FLOOR); // the ground (its real passability is its tiles)
        }
        const ms = performance.now() - t0;
        stats.generated++;
        stats.genMs += ms;
        stats.lastGenMs = ms;
        return Object.assign({ shape, material }, extra || {});
    }

    function baseline(z, ax = 0, ay = 0, seed, gen) {
        const W = World();
        const st = W && W.state;
        if (!st || !isLevel(z)) return null;
        const s = seed === undefined ? st.seed : seed, g = gen === undefined ? levelGen(st, z) : gen;
        const key = `${s}:${g}:${z}:${ax},${ay}:${st.size}:${st.areasX},${st.areasY}`;
        let b = baselines.get(key);
        if (!b) {
            b = generateBaseline(s, g, z, ax, ay, st.size);
            baselines.set(key, b);
            while (baselines.size > 12) baselines.delete(baselines.keys().next().value);
        }
        return b;
    }

    // Checksum of a level's baseline over every area (FNV-1a of shapes then materials). The ground's is a 32x32 lattice
    // of UF_WorldGen's cell info (ground kind, water, peak), which checks its generator without building the map.
    function checksumOf(z, seed, gen) {
        const W = World(), st = W.state;
        let h = 2166136261 >>> 0;
        if (z === 0) {
            const G = window.UF.WorldGen;
            if (!G || typeof G.cellInfo !== "function") return "n/a";
            const size = st.size, step = size / 32;
            const enc = s => Array.from(String(s), ch => ch.charCodeAt(0) & 255);
            for (let ay = 0; ay < st.areasY; ay++) for (let ax = 0; ax < st.areasX; ax++) {
                for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) {
                    const info = G.cellInfo(ax * size + Math.floor(i * step + step / 2), ay * size + Math.floor(j * step + step / 2));
                    h = fnvBytes(h, enc(info ? `${info.ground}|${info.water || ""}|${info.peak ? 1 : 0};` : "-;"));
                }
            }
            return hex(h);
        }
        for (let ay = 0; ay < st.areasY; ay++) for (let ax = 0; ax < st.areasX; ax++) {
            const b = seed === undefined ? baseline(z, ax, ay, undefined, gen) : generateBaseline(seed, gen || GEN, z, ax, ay, st.size);
            h = fnvBytes(h, b.shape);
            h = fnvBytes(h, b.material);
            if (b.biome) h = fnvBytes(h, b.biome);
            if (b.water) h = fnvBytes(h, b.water);
        }
        return hex(h);
    }

    //-------------------------------------------------------------------------
    // Cells: shape and material (baseline plus the saved changes)

    const pack = (shape, constructed, material) => (shape & 7) | (constructed ? 8 : 0) | ((material & 15) << 4);
    const unpack = p => ({ shape: SHAPE_NAMES[p & 7] || "", code: p & 7, constructed: (p & 8) !== 0, material: MATERIALS[p >> 4] || String(p >> 4) });
    const areaKey = (ax, ay) => `${ax},${ay}`;

    function changesOf(st, z, ax, ay, create) {
        const L = st.levels && st.levels[String(z)];
        if (!L) return null;
        L.cells = L.cells || {};
        const k = areaKey(ax, ay);
        if (!L.cells[k] && create) L.cells[k] = {};
        return L.cells[k] || null;
    }
    // Packed shape of a cell (0 for outside the world).
    function packedAt(ax, ay, x, y, z) {
        const W = World(), st = W && W.state;
        if (!st || !isLevel(z) || !W.inWorld(ax, ay, z) || x < 0 || y < 0 || x >= st.size || y >= st.size) return 0;
        stats.shapeReads++;
        const i = y * st.size + x;
        const ch = changesOf(st, z, ax, ay, false);
        if (ch && ch[i] !== undefined) return ch[i] | 0;
        if (z === 0) {
            if (levelGen(st, 0) >= 4) {
                const b = baseline(0, ax, ay);
                return pack(b.shape[i], false, b.material[i]);
            }
            const G = window.UF.WorldGen;
            const info = G && G.cellInfoLocal ? G.cellInfoLocal(ax, ay, x, y) : null;
            return pack(info && info.peak ? SOLID : FLOOR, false, STONE);
        }
        const b = baseline(z, ax, ay);
        return pack(b.shape[i], false, b.material[i]);
    }
    const refOf = ref => ({ ax: ref.area ? ref.area.x : 0, ay: ref.area ? ref.area.y : 0, x: ref.x | 0, y: ref.y | 0, z: zOf(ref) });

    function biomeCodeAt(ax, ay, x, y, z) {
        const W = World();
        if (!W || !W.state || z >= 0 || !isLevel(z) || !W.inWorld(ax, ay, z) || x < 0 || y < 0 || x >= W.state.size || y >= W.state.size) return 0;
        const b = baseline(z, ax, ay);
        return b && b.biome ? b.biome[y * W.state.size + x] : 0;
    }
    function biomeAt(ref) {
        const r = refOf(ref), b = BIOMES[biomeCodeAt(r.ax, r.ay, r.x, r.y, r.z)];
        return b ? Object.assign({}, b, { material: MATERIALS[b.material] }) : null;
    }
    function naturalWaterAt(ref) {
        const r = refOf(ref);
        return isNaturalWaterAtRaw(r.ax, r.ay, r.z, r.x, r.y);
    }
    function isNaturalWaterAtRaw(ax, ay, z, x, y) {
        if (z >= 0) return false;
        const p = packedAt(ax, ay, x, y, z);
        if (!p || (p & 7) !== FLOOR || (p & 8)) return false;
        const b = baseline(z, ax, ay);
        const W = World();
        const size = (W && W.state && W.state.size) || 256;
        return !!(b && b.water && b.water[y * size + x]);
    }
    function waterAt(ref) {
        const r = refOf(ref);
        return isWaterAtRaw(r.ax, r.ay, r.z, r.x, r.y);
    }
    function habitablePockets(z, ax = 0, ay = 0) {
        if (z !== -1 && z !== -2) return [];
        const W = World();
        if (!W || !W.state || !W.inWorld(ax, ay, z)) return [];
        const b = baseline(z, ax, ay);
        return b && b.pockets ? b.pockets.map(p => Object.assign({}, p, { area: Object.assign({}, p.area), bounds: Object.assign({}, p.bounds), water: Object.assign({}, p.water) })) : [];
    }
    function settlementCell(st, ref) {
        if (!st || st !== (World() && World().state) || !ref) return null;
        const r = refOf(ref), used = new Set(ref.used || []);
        const pockets = habitablePockets(r.z, r.ax, r.ay).filter(p => !used.has(p.id));
        pockets.sort((a, b) => ((a.x - r.x) ** 2 + (a.y - r.y) ** 2) - ((b.x - r.x) ** 2 + (b.y - r.y) ** 2) || a.id - b.id);
        return pockets[0] || null;
    }
    function baselineMetrics(b, size) {
        const counts = {}, visited = new Uint8Array(b.shape.length), components = [];
        let solid = 0, floor = 0, water = 0, soil = 0;
        for (let i = 0; i < b.shape.length; i++) {
            if (b.shape[i] === SOLID) solid++;
            if (b.shape[i] === FLOOR) floor++;
            if (b.material[i] === SOIL) soil++;
            if (b.water && b.water[i]) water++;
            if (b.biome) counts[b.biome[i]] = (counts[b.biome[i]] || 0) + 1;
            if (b.shape[i] !== FLOOR || visited[i]) continue;
            const queue = [i]; visited[i] = 1;
            for (let head = 0; head < queue.length; head++) {
                const cell = queue[head], x = cell % size, y = Math.floor(cell / size);
                for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                    const nx = x + dx, ny = y + dy, next = ny * size + nx;
                    if (nx < 0 || ny < 0 || nx >= size || ny >= size || visited[next] || b.shape[next] !== FLOOR) continue;
                    visited[next] = 1; queue.push(next);
                }
            }
            components.push(queue.length);
        }
        return { solid, floor, water, soil, biomes: counts, components,
            solidFraction: solid / b.shape.length };
    }
    const biomeReader = (b, size) => (x, y) => x >= 0 && y >= 0 && x < size && y < size
        ? { code: b.biome ? b.biome[y * size + x] : 0, water: !!(b.water && b.water[y * size + x]) } : null;

    // The looks of a cell: [layer 0 base look, layer 1 overlay, layer 2 connector] keys (null = none).
    function looksOfPacked(p, z, biomeInfo) {
        const s = p & 7, c = (p & 8) !== 0, m = p >> 4;
        let base, l1 = null, l2 = null;
        if (z > 0 && (s === OPEN || s === 0)) {
            base = "open_air";
        } else if (s === SOLID) base = m === SOIL ? "soil" : "rock";
        else if (s === OPEN) {
            base = "cave_floor"; l1 = "hole_edge";
        } else {
            base = c ? (m === WOOD ? "deck_wood" : "deck_stone") : "cave_floor";
            if (!c && s === FLOOR && biomeInfo) {
                const b = BIOMES[biomeInfo.code];
                if (b) base = b.floorLook;
                if (biomeInfo.water) base = (z === -2 ? "lava_pool" : "freshwater_pool");
            }
            if (s === RAMP) l2 = "ramp_up";
            else if (s === STAIR_UP) l2 = "stair_up";
            else if (s === STAIR_DOWN) l2 = "stair_down";
            else if (s === STAIR_BOTH) l2 = "stair_both";
        }
        return [base, l1, l2];
    }

    // Tile ids of cell (x, y) on a level whose cells read(x, y) -> packed (0 outside the area: counts as "same").
    function tilesAt(read, x, y, z, readBiome) {
        const here = looksOfPacked(read(x, y), z, readBiome && readBiome(x, y));
        const table = maskTable();
        let m0 = 0, m1 = 0;
        for (const [dx, dy, bit] of NB8) {
            const p = read(x + dx, y + dy);
            if (!p) { m0 |= bit; m1 |= bit; continue; }
            const nb = looksOfPacked(p, z, readBiome && readBiome(x + dx, y + dy));
            if (nb[0] === here[0]) m0 |= bit;
            if (here[1] && nb[1] === here[1]) m1 |= bit;
        }
        return [
            tileBase(here[0]) + table[m0],
            here[1] ? tileBase(here[1]) + table[m1] : 0,
            here[2] ? tileBase(here[2]) : 0
        ];
    }

    // The map generator for the levels other than the ground: every cell's tiles from its shape.
    function paintLevel(ctx) {
        const z = ctx.z;
        if (!z) return;
        const W = World(), st = W.state, size = ctx.width;
        ctx.map.tilesetId = TILESET_ID;
        if (z > 0) {
            ctx.map.parallaxName = "BlueSky";
            ctx.map.parallaxShow = true;
            ctx.map.parallaxLoopX = true;
            ctx.map.parallaxLoopY = true;
            ctx.map.parallaxSx = 0;
            ctx.map.parallaxSy = 0;
        }
        const b = baseline(z, ctx.areaX, ctx.areaY);
        const grid = new Uint8Array(size * size);
        for (let i = 0; i < grid.length; i++) grid[i] = pack(b.shape[i], false, b.material[i]);
        const ch = changesOf(st, z, ctx.areaX, ctx.areaY, false);
        if (ch) for (const k in ch) grid[Number(k)] = ch[k] | 0;
        const read = (x, y) => (x < 0 || y < 0 || x >= size || y >= size ? 0 : grid[y * size + x]);
        const readBiome = biomeReader(b, size);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const t = tilesAt(read, x, y, z, readBiome);
                ctx.setTile(x, y, 0, t[0]);
                ctx.setTile(x, y, 1, t[1]);
                ctx.setTile(x, y, 2, t[2]);
            }
        }
        if (provoked("budgets")) { const until = performance.now() + 6000; while (performance.now() < until) { /* provoked slow build */ } }
    }

    /**
     * Change a cell's shape: setShape({ area, x, y, z }, "floor" | code, { constructed, material }). The ground's shape
     * changes come with its stairs and holes (vertical slice 2): refused here. Refused too when the new shape can't be
     * stood on and a unit stands there (VISION V68). The change is saved (sparse: back to the baseline = no entry) and
     * the cell and its neighbours are redrawn wherever the level is built.
     */
    let lastRefusal = null;
    function setShape(ref, shape, opts = {}) {
        const W = World(), st = W && W.state;
        const r = refOf(ref);
        const code = typeof shape === "number" ? shape : SHAPES[shape];
        const refuse = reason => {
            lastRefusal = { ref: { area: { x: r.ax, y: r.ay }, x: r.x, y: r.y, z: r.z }, shape, reason };
            return false;
        };
        if (!st || !st.levels) return refuse("no levels in this world");
        if (!isLevel(r.z) || !W.inWorld(r.ax, r.ay, r.z) || r.x < 0 || r.y < 0 || r.x >= st.size || r.y >= st.size) return refuse(`level ${ref && ref.z} or cell (${r.x},${r.y}) doesn't exist`);
        if (!Number.isInteger(code) || !(code >= 1 && code <= 7)) return refuse(`unknown shape ${JSON.stringify(shape)}`);
        if (r.z === 0 && levelGen(st, 0) < 4) return refuse("the ground's shapes change with stairs and holes (vertical slice 2)");
        const from = packedAt(r.ax, r.ay, r.x, r.y, r.z);
        const matName = opts.material !== undefined ? opts.material : (opts.constructed && (code === FLOOR || code >= RAMP) ? "wood" : null);
        const mat = matName === null ? (from >> 4) : (typeof matName === "number" ? matName : MATERIALS.indexOf(matName));
        if (!Number.isInteger(mat) || mat < 0 || mat >= MATERIALS.length) return refuse(`unknown material ${JSON.stringify(opts.material)}`);
        const to = pack(code, !!opts.constructed, mat);
        if ((code === SOLID || code === OPEN) && W.standerAt(r.ax, r.ay, r.x, r.y, r.z)) return refuse(`a unit stands on (${r.x},${r.y}) at level ${r.z}`);
        const i = r.y * st.size + r.x;
        const b = baseline(r.z, r.ax, r.ay);
        const ch = changesOf(st, r.z, r.ax, r.ay, true);
        if (to === pack(b.shape[i], false, b.material[i])) delete ch[i];
        else ch[i] = to;
        redrawAround(r.ax, r.ay, r.x, r.y, r.z);
        emit("levels:shapeChanged", { area: { x: r.ax, y: r.ay }, x: r.x, y: r.y, z: r.z }, unpack(from), unpack(to));
        notifyWorldCellChanged({ area: { x: r.ax, y: r.ay }, x: r.x, y: r.y, z: r.z }, unpack(from), unpack(to), opts.cause || "setShape");
        return true;
    }
    function redrawAround(ax, ay, x, y, z) {
        naturalWallRevision++;
        invalidateFloods();
        const W = World();
        const read = (cx, cy) => packedAt(ax, ay, cx, cy, z);
        const readBiome = biomeReader(baseline(z, ax, ay), W.state.size);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const cx = x + dx, cy = y + dy;
                if (cx < 0 || cy < 0 || cx >= W.state.size || cy >= W.state.size) continue;
                const t = tilesAt(read, cx, cy, z, readBiome);
                for (let layer = 0; layer < 3; layer++) W.setDerivedTile(ax, ay, cx, cy, layer, t[layer], z);
            }
        }
    }

    function isExposedSurface(ref) {
        const r = refOf(ref);
        const s = packedAt(r.ax, r.ay, r.x, r.y, r.z) & 7;
        if (s !== SOLID) return false;
        const neighbors = [
            [-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]
        ];
        for (const [dx, dy, dz] of neighbors) {
            const nz = r.z + dz;
            if (nz < -2 || nz > 2) continue;
            const ns = packedAt(r.ax, r.ay, r.x + dx, r.y + dy, nz) & 7;
            if (ns === FLOOR || ns === OPEN || ns === RAMP) return true;
        }
        return false;
    }

    function exposedFacesAround(ref) {
        const r = refOf(ref);
        const faces = [];
        const directions = [
            { dir: "west", dx: -1, dy: 0, dz: 0 },
            { dir: "east", dx: 1, dy: 0, dz: 0 },
            { dir: "north", dx: 0, dy: -1, dz: 0 },
            { dir: "south", dx: 0, dy: 1, dz: 0 },
            { dir: "down", dx: 0, dy: 0, dz: -1 },
            { dir: "up", dx: 0, dy: 0, dz: 1 }
        ];
        for (const d of directions) {
            const nz = r.z + d.dz;
            if (nz < -2 || nz > 2) continue;
            const ns = packedAt(r.ax, r.ay, r.x + d.dx, r.y + d.dy, nz) & 7;
            if (ns === FLOOR || ns === OPEN || ns === RAMP) {
                faces.push(d.dir);
            }
        }
        return faces;
    }

    function notifyWorldCellChanged(ref, oldCell, newCell, cause = "unknown") {
        const r = refOf(ref);
        const area = { x: r.ax, y: r.ay };
        const payload = { area, x: r.x, y: r.y, z: r.z, oldCell, newCell, cause };
        emit("levels:cellChanged", payload);

        // Update exposed faces for the 6 orthogonal neighbors
        for (const [dx, dy, dz] of [[-1,0,0], [1,0,0], [0,-1,0], [0,1,0], [0,0,-1], [0,0,1]]) {
            const nz = r.z + dz;
            if (nz >= -2 && nz <= 2) {
                emit("levels:faceExposed", { area, x: r.x + dx, y: r.y + dy, z: nz });
            }
        }

        // Room enclosure invalidation
        const Households = window.UF && window.UF.Households;
        if (Households && typeof Households.invalidateRoomEnclosure === "function") {
            try { Households.invalidateRoomEnclosure(area, r.x, r.y, r.z); } catch (e) {}
        }
    }

    //-------------------------------------------------------------------------
    // Flooding: Multi-level liquid penetration and lateral BFS flood expansion
    // (Z = 0 -> -1 -> -2 for water and lava)
    const DRY = 0, FLOOD_WATER = 1, FLOOD_LAVA = 2, FLOOD_SOLIDIFIED = 3;
    const floodCache = new Map(); // "ax,ay:z" -> { revision: number, grid: Uint8Array }
    let floodRevision = 0;

    function invalidateFloods() {
        floodRevision++;
        floodCache.clear();
    }

    let computingFloods = false;

    function isWallAt(area, x, y, z) {
        const W = World();
        const st = W && W.state;
        const size = st ? st.size : 256;
        if (x < 0 || y < 0 || x >= size || y >= size) return true;
        const ax = area ? (area.x | 0) : 0, ay = area ? (area.y | 0) : 0;
        if (z < 0) {
            const p = packedAt(ax, ay, x, y, z);
            if ((p & 7) === SOLID) return true;
        } else if (z === 0) {
            const p = packedAt(ax, ay, x, y, 0);
            if ((p & 7) === SOLID) return true;
        }
        
        let typeId = 0;
        if (W) {
            if (typeof W.onView === "function" && W.onView(ax, ay, z) && window.$dataMap && window.$dataMap.ufObjects) {
                typeId = window.$dataMap.ufObjects[y * size + x] | 0;
            } else if (typeof W.cachedBuild === "function") {
                const b = W.cachedBuild(ax, ay, z);
                if (b && b.ufObjects) typeId = b.ufObjects[y * size + x] | 0;
            }
            if (!typeId && st && st.objectDiffs) {
                const lk = typeof W.levelKey === "function" ? W.levelKey(ax, ay, z) : (z ? `${ax},${ay},${z}` : `${ax},${ay}`);
                const diffs = st.objectDiffs[lk];
                if (diffs && diffs[y * size + x] !== undefined) typeId = diffs[y * size + x] | 0;
            }
        }
        if (typeId) {
            const O = window.UF && UF.Objects;
            const obj = O ? O.type(typeId) : null;
            if (obj) {
                if (obj.autotile === "wall" || (Array.isArray(obj.tags) && obj.tags.includes("wall"))) return true;
                const isDoor = (Array.isArray(obj.tags) && obj.tags.includes("door")) ||
                               (window.UF && UF.Doors && typeof UF.Doors.isDoorType === "function" && UF.Doors.isDoorType(obj));
                if (isDoor) {
                    const isOpen = window.UF && UF.Doors && typeof UF.Doors.isOpen === "function" && UF.Doors.isOpen({ x: ax, y: ay, z }, x, y);
                    if (!isOpen) return true;
                }
            }
        }
        return false;
    }

    function groundLiquidAt(ax, ay, x, y) {
        const W = World();
        const st = W && W.state;
        const size = st ? st.size : 256;
        const gx = ax * size + x, gy = ay * size + y;
        
        if (W && typeof W.getTile === "function") {
            const tile = W.getTile(ax, ay, x, y, 0, 0) | 0;
            if (Tilemap.isWaterTile(tile)) return "water";
            if (Tilemap.isTileA1(tile) && tile >= Tilemap.TILE_ID_A1 + 4 * 48) return "lava";
        }
        const J = window.UF && UF.Jobs;
        if (J && typeof J.isWaterAt === "function" && J.isWaterAt({ x: ax, y: ay, z: 0 }, x, y)) return "water";
        return null;
    }

    const _wallGrids = {};
    function getWallGridBuffer(z, size) {
        if (!_wallGrids[z] || _wallGrids[z].length !== size * size) {
            _wallGrids[z] = new Uint8Array(size * size);
        } else {
            _wallGrids[z].fill(0);
        }
        return _wallGrids[z];
    }

    function buildWallGrid(ax, ay, z, size, st) {
        const wall = getWallGridBuffer(z, size);
        const b = baseline(z, ax, ay);
        const ch = changesOf(st, z, ax, ay, false);
        const bShape = b ? b.shape : null;

        if (bShape) {
            for (let i = 0; i < size * size; i++) {
                if ((bShape[i] & 7) === SOLID) wall[i] = 1;
            }
        }
        if (ch) {
            for (const key in ch) {
                const idx = Number(key);
                if (Number.isInteger(idx) && idx >= 0 && idx < size * size) {
                    wall[idx] = ((ch[idx] | 0) & 7) === SOLID ? 1 : 0;
                }
            }
        }

        const W = World();
        if (W) {
            const lk = typeof W.levelKey === "function" ? W.levelKey(ax, ay, z) : (z ? `${ax},${ay},${z}` : `${ax},${ay}`);
            const diffs = st && st.objectDiffs ? st.objectDiffs[lk] : null;
            const viewObjects = (typeof W.onView === "function" && W.onView(ax, ay, z) && window.$dataMap && window.$dataMap.ufObjects) ? window.$dataMap.ufObjects : null;
            const cachedBuild = (typeof W.cachedBuild === "function") ? W.cachedBuild(ax, ay, z) : null;
            const buildObjects = cachedBuild ? cachedBuild.ufObjects : null;

            const O = window.UF && UF.Objects;
            const D = window.UF && UF.Doors;

            if (viewObjects || buildObjects) {
                const objs = viewObjects || buildObjects;
                for (let i = 0; i < size * size; i++) {
                    const typeId = objs[i] | 0;
                    if (typeId) {
                        const obj = O ? O.type(typeId) : null;
                        if (obj) {
                            if (obj.autotile === "wall" || (Array.isArray(obj.tags) && obj.tags.includes("wall"))) {
                                wall[i] = 1;
                            } else if ((Array.isArray(obj.tags) && obj.tags.includes("door")) || (D && typeof D.isDoorType === "function" && D.isDoorType(obj))) {
                                const x = i % size, y = (i / size) | 0;
                                const isOpen = D && typeof D.isOpen === "function" && D.isOpen({ x: ax, y: ay, z }, x, y);
                                if (!isOpen) wall[i] = 1;
                            }
                        }
                    }
                }
            } else if (diffs) {
                for (const key in diffs) {
                    const idx = Number(key);
                    if (!Number.isInteger(idx) || idx < 0 || idx >= size * size) continue;
                    const typeId = diffs[idx] | 0;
                    if (typeId) {
                        const obj = O ? O.type(typeId) : null;
                        if (obj) {
                            if (obj.autotile === "wall" || (Array.isArray(obj.tags) && obj.tags.includes("wall"))) {
                                wall[idx] = 1;
                            } else if ((Array.isArray(obj.tags) && obj.tags.includes("door")) || (D && typeof D.isDoorType === "function" && D.isDoorType(obj))) {
                                const x = idx % size, y = (idx / size) | 0;
                                const isOpen = D && typeof D.isOpen === "function" && D.isOpen({ x: ax, y: ay, z }, x, y);
                                if (!isOpen) wall[idx] = 1;
                            }
                        }
                    }
                }
            }
        }
        return wall;
    }

    function computeFloods(area) {
        if (computingFloods) return;
        computingFloods = true;
        try {
            _doComputeFloods(area);
        } finally {
            computingFloods = false;
        }
    }

    function _doComputeFloods(area) {
        const W = World();
        const st = W && W.state;
        const size = st ? st.size : 256;
        const ax = area ? (area.x | 0) : 0, ay = area ? (area.y | 0) : 0;
        const keyMinus1 = `${ax},${ay}:-1`;
        const keyMinus2 = `${ax},${ay}:-2`;

        let entry1 = floodCache.get(keyMinus1);
        if (!entry1 || !entry1.grid || entry1.grid.length !== size * size) {
            entry1 = { revision: floodRevision, grid: new Uint8Array(size * size) };
            floodCache.set(keyMinus1, entry1);
        } else {
            entry1.revision = floodRevision;
            entry1.grid.fill(0);
        }
        const gridMinus1 = entry1.grid;

        let entry2 = floodCache.get(keyMinus2);
        if (!entry2 || !entry2.grid || entry2.grid.length !== size * size) {
            entry2 = { revision: floodRevision, grid: new Uint8Array(size * size) };
            floodCache.set(keyMinus2, entry2);
        } else {
            entry2.revision = floodRevision;
            entry2.grid.fill(0);
        }
        const gridMinus2 = entry2.grid;

        const base1 = baseline(-1, ax, ay);
        const baseWater1 = base1 ? base1.water : null;
        const base2 = baseline(-2, ax, ay);
        const baseWater2 = base2 ? base2.water : null;

        const isWall1 = buildWallGrid(ax, ay, -1, size, st);
        const isWall2 = buildWallGrid(ax, ay, -2, size, st);

        let groundTiles = null;
        if (W) {
            if (typeof W.onView === "function" && W.onView(ax, ay, 0) && window.$dataMap && window.$dataMap.data) {
                groundTiles = window.$dataMap.data;
            } else if (typeof W.peekArea === "function") {
                const p = W.peekArea(ax, ay, 0);
                if (p && p.data) groundTiles = p.data;
            }
        }
        const J = window.UF && UF.Jobs;

        // 1. Breaches from Ground (z=0) into z=-1
        const queueMinus1 = [];
        const groundArea = { x: ax, y: ay, z: 0 };
        for (let i = 0; i < size * size; i++) {
            let liq0 = null;
            if (groundTiles) {
                const tile = groundTiles[i] | 0;
                if (Tilemap.isWaterTile(tile)) liq0 = "water";
                else if (Tilemap.isTileA1(tile) && tile >= Tilemap.TILE_ID_A1 + 4 * 48) liq0 = "lava";
            } else if (W && typeof W.getTile === "function") {
                const tile = W.getTile(ax, ay, i % size, (i / size) | 0, 0, 0) | 0;
                if (Tilemap.isWaterTile(tile)) liq0 = "water";
                else if (Tilemap.isTileA1(tile) && tile >= Tilemap.TILE_ID_A1 + 4 * 48) liq0 = "lava";
            } else if (J && typeof J.isWaterAt === "function") {
                if (J.isWaterAt(groundArea, i % size, (i / size) | 0)) liq0 = "water";
            }

            if (liq0) {
                if (!isWall1[i]) {
                    gridMinus1[i] = liq0 === "lava" ? FLOOD_LAVA : FLOOD_WATER;
                    queueMinus1.push(i);
                }
            }
            // Natural water pools on -1
            if (baseWater1 && baseWater1[i]) {
                if (!isWall1[i] && gridMinus1[i] === DRY) {
                    gridMinus1[i] = FLOOD_WATER;
                    queueMinus1.push(i);
                }
            }
        }

        // 2. Lateral BFS on z=-1 until hitting walls
        let head1 = 0;
        while (head1 < queueMinus1.length) {
            const curr = queueMinus1[head1++];
            const cx = curr % size, cy = (curr / size) | 0;
            const currType = gridMinus1[curr];
            if (currType === FLOOD_SOLIDIFIED) continue;

            if (cy > 0) {
                const ni = curr - size;
                if (!isWall1[ni]) {
                    const nextType = gridMinus1[ni];
                    if (nextType === DRY) {
                        gridMinus1[ni] = currType;
                        queueMinus1.push(ni);
                    } else if (nextType !== currType && nextType !== FLOOD_SOLIDIFIED) {
                        gridMinus1[ni] = FLOOD_SOLIDIFIED;
                    }
                }
            }
            if (cy < size - 1) {
                const ni = curr + size;
                if (!isWall1[ni]) {
                    const nextType = gridMinus1[ni];
                    if (nextType === DRY) {
                        gridMinus1[ni] = currType;
                        queueMinus1.push(ni);
                    } else if (nextType !== currType && nextType !== FLOOD_SOLIDIFIED) {
                        gridMinus1[ni] = FLOOD_SOLIDIFIED;
                    }
                }
            }
            if (cx > 0) {
                const ni = curr - 1;
                if (!isWall1[ni]) {
                    const nextType = gridMinus1[ni];
                    if (nextType === DRY) {
                        gridMinus1[ni] = currType;
                        queueMinus1.push(ni);
                    } else if (nextType !== currType && nextType !== FLOOD_SOLIDIFIED) {
                        gridMinus1[ni] = FLOOD_SOLIDIFIED;
                    }
                }
            }
            if (cx < size - 1) {
                const ni = curr + 1;
                if (!isWall1[ni]) {
                    const nextType = gridMinus1[ni];
                    if (nextType === DRY) {
                        gridMinus1[ni] = currType;
                        queueMinus1.push(ni);
                    } else if (nextType !== currType && nextType !== FLOOD_SOLIDIFIED) {
                        gridMinus1[ni] = FLOOD_SOLIDIFIED;
                    }
                }
            }
        }

        // 3. Breaches from z=-1 into z=-2
        const queueMinus2 = [];
        for (let i = 0; i < size * size; i++) {
            let liq1 = null;
            if (gridMinus1[i] === FLOOD_WATER || (baseWater1 && baseWater1[i])) {
                liq1 = "water";
            } else if (gridMinus1[i] === FLOOD_LAVA) {
                liq1 = "lava";
            }

            if (liq1) {
                if (!isWall2[i]) {
                    gridMinus2[i] = liq1 === "lava" ? FLOOD_LAVA : FLOOD_WATER;
                    queueMinus2.push(i);
                }
            }

            // Natural lava pools on z=-2
            if (baseWater2 && baseWater2[i]) {
                if (!isWall2[i] && gridMinus2[i] === DRY) {
                    gridMinus2[i] = FLOOD_LAVA;
                    queueMinus2.push(i);
                }
            }
        }

        // 4. Lateral BFS on z=-2 until hitting walls
        let head2 = 0;
        while (head2 < queueMinus2.length) {
            const curr = queueMinus2[head2++];
            const cx = curr % size, cy = (curr / size) | 0;
            const currType = gridMinus2[curr];
            if (currType === FLOOD_SOLIDIFIED) continue;

            if (cy > 0) {
                const ni = curr - size;
                if (!isWall2[ni]) {
                    const nextType = gridMinus2[ni];
                    if (nextType === DRY) {
                        gridMinus2[ni] = currType;
                        queueMinus2.push(ni);
                    } else if (nextType !== currType && nextType !== FLOOD_SOLIDIFIED) {
                        gridMinus2[ni] = FLOOD_SOLIDIFIED;
                    }
                }
            }
            if (cy < size - 1) {
                const ni = curr + size;
                if (!isWall2[ni]) {
                    const nextType = gridMinus2[ni];
                    if (nextType === DRY) {
                        gridMinus2[ni] = currType;
                        queueMinus2.push(ni);
                    } else if (nextType !== currType && nextType !== FLOOD_SOLIDIFIED) {
                        gridMinus2[ni] = FLOOD_SOLIDIFIED;
                    }
                }
            }
            if (cx > 0) {
                const ni = curr - 1;
                if (!isWall2[ni]) {
                    const nextType = gridMinus2[ni];
                    if (nextType === DRY) {
                        gridMinus2[ni] = currType;
                        queueMinus2.push(ni);
                    } else if (nextType !== currType && nextType !== FLOOD_SOLIDIFIED) {
                        gridMinus2[ni] = FLOOD_SOLIDIFIED;
                    }
                }
            }
            if (cx < size - 1) {
                const ni = curr + 1;
                if (!isWall2[ni]) {
                    const nextType = gridMinus2[ni];
                    if (nextType === DRY) {
                        gridMinus2[ni] = currType;
                        queueMinus2.push(ni);
                    } else if (nextType !== currType && nextType !== FLOOD_SOLIDIFIED) {
                        gridMinus2[ni] = FLOOD_SOLIDIFIED;
                    }
                }
            }
        }

        floodCache.set(keyMinus1, { revision: floodRevision, grid: gridMinus1 });
        floodCache.set(keyMinus2, { revision: floodRevision, grid: gridMinus2 });
    }

    function getFloodGrid(area, z) {
        if (window.UF && UF.Fluid && typeof UF.Fluid.getFloodGrid === "function") {
            const fg = UF.Fluid.getFloodGrid(area, z);
            if (fg) return fg;
        }
        if (z !== -1 && z !== -2) return null;
        const ax = area ? (area.x | 0) : 0, ay = area ? (area.y | 0) : 0;
        const key = `${ax},${ay}:${z}`;
        const c = floodCache.get(key);
        if (c && c.revision === floodRevision) return c.grid;
        computeFloods({ x: ax, y: ay });
        const updated = floodCache.get(key);
        return updated ? updated.grid : null;
    }

    const NOT_FLOODED = Object.freeze({ flooded: false, type: null, depth: 0 });
    const FLOODED_WATER = Object.freeze({ flooded: true, type: "water", depth: 7 });
    const FLOODED_LAVA = Object.freeze({ flooded: true, type: "lava", depth: 7 });

    function floodTypeAt(ax, ay, z, x, y) {
        if (window.UF && UF.Fluid && typeof UF.Fluid.depthAt === "function") {
            const d = UF.Fluid.depthAt(ax, ay, x, y, z);
            if (d > 0) {
                const t = UF.Fluid.typeAt(ax, ay, x, y, z);
                return t === "lava" ? FLOOD_LAVA : FLOOD_WATER;
            }
        }
        if (z !== -1 && z !== -2) return DRY;
        const key = `${ax | 0},${ay | 0}:${z}`;
        let c = floodCache.get(key);
        if (!c || c.revision !== floodRevision) {
            computeFloods({ x: ax, y: ay });
            c = floodCache.get(key);
        }
        if (!c || !c.grid) return DRY;
        const W = World(), size = (W && W.state && W.state.size) || 256;
        if (x < 0 || y < 0 || x >= size || y >= size) return DRY;
        return c.grid[y * size + x];
    }

    function isFlooded(ref) {
        if (window.UF && UF.Fluid && typeof UF.Fluid.isFlooded === "function") {
            const fl = UF.Fluid.isFlooded(ref);
            if (fl && fl.flooded) return fl;
        }
        const r = refOf(ref);
        if (r.z !== -1 && r.z !== -2) return NOT_FLOODED;
        const val = floodTypeAt(r.ax, r.ay, r.z, r.x, r.y);
        if (val === FLOOD_WATER) return FLOODED_WATER;
        if (val === FLOOD_LAVA) return FLOODED_LAVA;
        return NOT_FLOODED;
    }

    function isWaterAtRaw(ax, ay, z, x, y) {
        if (isNaturalWaterAtRaw(ax, ay, z, x, y)) return true;
        if (window.UF && UF.Fluid && typeof UF.Fluid.depthAt === "function") {
            if (UF.Fluid.typeAt(ax, ay, x, y, z) === "water" && UF.Fluid.depthAt(ax, ay, x, y, z) > 0) return true;
        }
        return floodTypeAt(ax, ay, z, x, y) === FLOOD_WATER;
    }

    function isLavaAtRaw(ax, ay, z, x, y) {
        if (z === -2 && isNaturalWaterAtRaw(ax, ay, z, x, y)) return true;
        if (window.UF && UF.Fluid && typeof UF.Fluid.depthAt === "function") {
            if (UF.Fluid.typeAt(ax, ay, x, y, z) === "lava" && UF.Fluid.depthAt(ax, ay, x, y, z) > 0) return true;
        }
        return floodTypeAt(ax, ay, z, x, y) === FLOOD_LAVA;
    }

    let waterFloodBitmap = null;
    let lavaFloodBitmap = null;

    function ensureFloodBitmaps() {
        if (waterFloodBitmap && lavaFloodBitmap) return;

        // Water: 4 frames of 48x48 (192x48)
        waterFloodBitmap = new Bitmap(192, 48);
        for (let f = 0; f < 4; f++) {
            const ox = f * 48;
            const ctx = waterFloodBitmap.context;
            waterFloodBitmap.fillRect(ox, 0, 48, 48, "rgba(24, 118, 210, 0.45)");
            ctx.fillStyle = "rgba(130, 215, 255, 0.35)";
            for (let y = 6; y < 44; y += 12) {
                const shift = ((f * 3) + Math.floor(y / 6)) % 8;
                ctx.fillRect(ox + shift * 2, y, 14, 2);
                ctx.fillRect(ox + ((shift * 2 + 24) % 44), y + 4, 10, 2);
            }
            ctx.fillStyle = "rgba(180, 235, 255, 0.25)";
            ctx.fillRect(ox, 0, 48, 1);
            ctx.fillRect(ox, 47, 48, 1);
        }
        waterFloodBitmap._baseTexture.update();

        // Lava: 4 frames of 48x48 (192x48)
        lavaFloodBitmap = new Bitmap(192, 48);
        for (let f = 0; f < 4; f++) {
            const ox = f * 48;
            const ctx = lavaFloodBitmap.context;
            lavaFloodBitmap.fillRect(ox, 0, 48, 48, "rgba(215, 38, 16, 0.55)");
            ctx.fillStyle = "rgba(255, 185, 0, 0.48)";
            for (let y = 8; y < 42; y += 10) {
                const shift = ((f * 4) + Math.floor(y / 4)) % 10;
                ctx.fillRect(ox + shift * 2, y, 12, 3);
                ctx.fillRect(ox + ((shift * 2 + 20) % 42), y + 3, 14, 2);
            }
            ctx.fillStyle = "rgba(255, 240, 120, 0.60)";
            const emberX = ox + ((f * 11 + 7) % 40);
            const emberY = (f * 13 + 5) % 40;
            ctx.fillRect(emberX, emberY, 2, 2);
            ctx.fillRect(ox + 44 - (emberX % 40), 44 - emberY, 2, 2);
        }
        lavaFloodBitmap._baseTexture.update();
    }

    class Sprite_UFFloodOverlay extends Sprite {
        constructor() {
            super();
            this.z = 2.5; // directly above floor autotiles, beneath units (z >= 7)
            this._active = new Map();
            this._pool = [];
            this._seen = "";
            this._seenAnim = -1;
            this._lastDispX = -999;
            this._lastDispY = -999;
        }
        update() {
            super.update();
            const map = window.$dataMap, W = World(), view = W && W.viewLevel();
            if (!this.parent || !map || !view || (view.z !== -1 && view.z !== -2)) {
                if (this._active.size > 0) {
                    for (const s of this._active.values()) { s.visible = false; this._pool.push(s); }
                    this._active.clear();
                    this._seen = "";
                    this._seenAnim = -1;
                    this._lastDispX = -999;
                    this._lastDispY = -999;
                }
                return;
            }
            ensureFloodBitmaps();
            const grid = getFloodGrid(view, view.z);
            if (!grid) {
                if (this._active.size > 0) {
                    for (const s of this._active.values()) { s.visible = false; this._pool.push(s); }
                    this._active.clear();
                    this._seen = "";
                    this._seenAnim = -1;
                    this._lastDispX = -999;
                    this._lastDispY = -999;
                }
                return;
            }
            const dx = Math.floor($gameMap.displayX()), dy = Math.floor($gameMap.displayY());
            const cols = Math.ceil($gameMap.screenTileX()), rows = Math.ceil($gameMap.screenTileY());
            const animTick = Math.floor(Graphics.frameCount / 12) % 4;
            const gridStamp = `${$gameMap.mapId()}:${dx}:${dy}:${cols}:${rows}:${floodRevision}`;

            // Only scan visible grid cells when viewport bounding box or flood revision changes
            if (gridStamp !== this._seen) {
                const keep = new Set();
                const maxY = Math.min(map.height - 1, dy + rows + 1);
                const maxX = Math.min(map.width - 1, dx + cols + 1);
                for (let y = Math.max(0, dy - 1); y <= maxY; y++) {
                    for (let x = Math.max(0, dx - 1); x <= maxX; x++) {
                        const i = y * map.width + x;
                        const val = grid[i];
                        if (val !== FLOOD_WATER && val !== FLOOD_LAVA) continue;

                        keep.add(i);
                        let s = this._active.get(i);
                        if (!s) {
                            s = this._pool.pop() || new Sprite();
                            s.anchor.set(0, 0);
                            if (!s.parent) this.parent.addChild(s);
                            this._active.set(i, s);
                        }
                        const isWater = val === FLOOD_WATER;
                        s.bitmap = isWater ? waterFloodBitmap : lavaFloodBitmap;
                        const phase = (animTick + ((x + y * 2) % 4)) % 4;
                        s.setFrame(phase * 48, 0, 48, 48);
                        s._ufX = x;
                        s._ufY = y;
                        if (window.UF && UF.Fluid && typeof UF.Fluid.depthAt === "function") {
                            const d = UF.Fluid.depthAt(view.x, view.y, x, y, view.z);
                            s.alpha = Math.min(1.0, 0.35 + ((d || 7) / 7) * 0.65);
                        } else {
                            s.alpha = 1.0;
                        }
                        s.visible = true;
                    }
                }
                for (const [i, s] of this._active) {
                    if (!keep.has(i)) {
                        s.visible = false;
                        this._pool.push(s);
                        this._active.delete(i);
                    }
                }
                this._seen = gridStamp;
                this._seenAnim = animTick;
                this._lastDispX = -999; // force immediate repositioning
            } else if (animTick !== this._seenAnim) {
                // Viewport unchanged, simply cycle frame for existing sprites without grid scanning
                for (const s of this._active.values()) {
                    const phase = (animTick + ((s._ufX + s._ufY * 2) % 4)) % 4;
                    s.setFrame(phase * 48, 0, 48, 48);
                }
                this._seenAnim = animTick;
            }

            // Sub-tile camera follow: only recalculate pixel offsets if camera moved
            const curDispX = $gameMap.displayX(), curDispY = $gameMap.displayY();
            if (curDispX !== this._lastDispX || curDispY !== this._lastDispY) {
                for (const s of this._active.values()) {
                    s.x = Math.round($gameMap.adjustX(s._ufX) * 48);
                    s.y = Math.round($gameMap.adjustY(s._ufY) * 48);
                    s.z = 2.5;
                }
                this._lastDispX = curDispX;
                this._lastDispY = curDispY;
            }
        }
    }

    // Natural walls have the same visual footprint as built walls: the blocked cell is the face, and its cap is
    // one screen row north on this same level. Tile passage and the saved shape grid are never changed by drawing.
    const naturalWallFrames = new Map();
    let naturalWallRevision = 0;
    function naturalWallBitmap(material, mask) {
        const key = `${material}:${mask}:${provoked("natural_wall_height")}`;
        if (naturalWallFrames.has(key)) return naturalWallFrames.get(key);
        const source = composed.bitmaps.A4;
        if (!source || !source.isReady()) return null;
        const bitmap = new Bitmap(48, provoked("natural_wall_height") ? 48 : 96);
        const x0 = material === SOIL ? 96 : 0;
        const cap = Tilemap.FLOOR_AUTOTILE_TABLE[maskTable()[mask]];
        const face = Tilemap.WALL_AUTOTILE_TABLE[10 + ((mask & 4) ? 0 : 1) + ((mask & 8) ? 0 : 4)];
        for (let q = 0; q < 4; q++) {
            const dx = (q % 2) * 24, dy = Math.floor(q / 2) * 24;
            bitmap.blt(source, x0 + cap[q][0] * 24, cap[q][1] * 24, 24, 24, dx, dy);
            if (bitmap.height === 96) bitmap.blt(source, x0 + face[q][0] * 24, 144 + face[q][1] * 24, 24, 24, dx, dy + 48);
        }
        naturalWallFrames.set(key, bitmap);
        return bitmap;
    }
    class Sprite_UFNaturalWalls extends Sprite {
        constructor() {
            super(); this.z = 0; this._active = new Map(); this._pool = []; this._seen = "";
        }
        update() {
            super.update();
            const map = window.$dataMap, W = World(), view = W && W.viewLevel();
            if (!this.parent || !map || !view || (view.z === 0 && levelGen(W.state, 0) < 4) || map.tilesetId !== TILESET_ID) {
                for (const s of this._active.values()) { s.visible = false; this._pool.push(s); }
                this._active.clear(); this._seen = ""; return;
            }
            const dx = Math.floor($gameMap.displayX()), dy = Math.floor($gameMap.displayY());
            const cols = Math.ceil($gameMap.screenTileX()), rows = Math.ceil($gameMap.screenTileY());
            const stamp = `${$gameMap.mapId()}:${dx}:${dy}:${cols}:${rows}:${naturalWallRevision}`;
            if (stamp !== this._seen || this._data !== map.data) {
                const typeAt = (x, y) => {
                    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return -1;
                    const id = map.data[y * map.width + x];
                    if (id >= tileBase("rock") && id < tileBase("rock") + 48) return STONE;
                    if (id >= tileBase("soil") && id < tileBase("soil") + 48) return SOIL;
                    return -1;
                };
                const keep = new Set();
                for (let y = Math.max(0, dy - 1); y <= Math.min(map.height - 1, dy + rows + 2); y++) {
                    for (let x = Math.max(0, dx - 1); x <= Math.min(map.width - 1, dx + cols + 1); x++) {
                        const material = typeAt(x, y);
                        if (material < 0 || [[0,-1],[0,1],[-1,0],[1,0]].every(([a,b]) => typeAt(x+a,y+b) >= 0)) continue;
                        let mask = 0;
                        for (const [a,b,bit] of NB8) if (typeAt(x+a,y+b) === material) mask |= bit;
                        const bitmap = naturalWallBitmap(material, mask);
                        if (!bitmap) continue;
                        const i = y * map.width + x; keep.add(i);
                        let s = this._active.get(i);
                        if (!s) {
                            s = this._pool.pop() || new Sprite(); s.anchor.set(0.5, 1);
                            if (!s.parent) this.parent.addChild(s);
                            this._active.set(i, s);
                        }
                        s.bitmap = bitmap; s._ufX = x; s._ufY = y; s._ufMaterial = material; s._ufLevel = view.z; s.visible = true;
                    }
                }
                for (const [i,s] of this._active) if (!keep.has(i)) { s.visible = false; this._pool.push(s); this._active.delete(i); }
                this._seen = stamp; this._data = map.data;
            }
            for (const s of this._active.values()) {
                s.x = Math.round(($gameMap.adjustX(s._ufX) + 0.5) * 48);
                s.y = Math.round(($gameMap.adjustY(s._ufY) + 1) * 48);
                s.z = Math.max(7, s.y); // same minimum as objects: above tile/stance/designation layers
            }
        }
    }
    const _Spriteset_Map_createCharacters_naturalWalls = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _Spriteset_Map_createCharacters_naturalWalls.call(this);
        this._ufNaturalWalls = new Sprite_UFNaturalWalls();
        this._tilemap.addChild(this._ufNaturalWalls);
        this._ufFloodOverlay = new Sprite_UFFloodOverlay();
        this._tilemap.addChild(this._ufFloodOverlay);
    };

    const _Spriteset_Map_updateParallax = Spriteset_Map.prototype.updateParallax;
    Spriteset_Map.prototype.updateParallax = function() {
        const W = World();
        const v = W && typeof W.viewLevel === "function" ? W.viewLevel() : null;
        const isSky = v && v.z > 0;
        if (isSky) {
            if (this._parallaxName !== "BlueSky") {
                this._parallaxName = "BlueSky";
                this._parallax.bitmap = ImageManager.loadParallax("BlueSky");
            }
            if (this._parallax) {
                this._parallax.visible = true;
                if (this._parallax.bitmap && this._parallax.bitmap.isReady()) {
                    const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
                    this._parallax.origin.x = $gameMap.displayX() * tw * 0.5;
                    this._parallax.origin.y = $gameMap.displayY() * th * 0.5;
                }
            }
        } else {
            _Spriteset_Map_updateParallax.call(this);
            if (this._parallax && (!v || v.z <= 0)) {
                this._parallax.visible = false;
            }
        }
    };

    const _Game_Map_parallaxName = Game_Map.prototype.parallaxName;
    Game_Map.prototype.parallaxName = function() {
        const W = World();
        const v = W && typeof W.viewLevel === "function" ? W.viewLevel() : null;
        if (v && v.z > 0) return "BlueSky";
        return _Game_Map_parallaxName.call(this);
    };

    function describeCell(ref) {
        const r = refOf(ref);
        const p = packedAt(r.ax, r.ay, r.x, r.y, r.z);
        if (!p) return "";
        const label = LABELS[r.z];
        const s = p & 7;
        let text;
        const fl = isFlooded(ref);
        if (fl && fl.flooded) {
            text = fl.type === "lava" ? "Flooded (Lava)" : "Flooded (Fresh water)";
        } else if (r.z === 0) text = s === SOLID ? "Rock" : "Ground";
        else if (s === OPEN) text = r.z > 0 ? "Open air" : "Hole";
        else if (s === RAMP) text = "Ramp";
        else if (s >= STAIR_UP) text = s === STAIR_UP ? "Stairs up" : s === STAIR_DOWN ? "Stairs down" : "Stairs up and down";
        else if (waterAt(ref)) text = r.z === -2 ? "Lava pool" : "Fresh water";
        else text = NAME_OF[looksOfPacked(p, r.z, { code: biomeCodeAt(r.ax, r.ay, r.x, r.y, r.z), water: waterAt(ref) })[0]] || SHAPE_NAMES[s];
        const biome = biomeAt(ref);
        return `${label} · ${text}${biome ? ` · ${biome.name}` : ""}`;
    }
    function cellArt(ref) {
        const r = refOf(ref);
        const p = packedAt(r.ax, r.ay, r.x, r.y, r.z);
        if (!p || r.z === 0) return "";
        const key = looksOfPacked(p, r.z, { code: biomeCodeAt(r.ax, r.ay, r.x, r.y, r.z), water: waterAt(ref) })[0];
        const e = looks()[key];
        return e ? (e.tile !== undefined ? `${e.sheet}#${e.tile | 0}` : e.sheet) : "";
    }

    //-------------------------------------------------------------------------
    // The level state in the save: UF.World.state.levels, .view, .version 4, .migrations

    function ensureWorldLevels(st) {
        if (!st || st !== (World() && World().state)) return false;
        const t0 = performance.now();
        st.levels = st.levels || {};
        for (const z of LEVELS) if (!st.levels[String(z)]) st.levels[String(z)] = { z, gen: GEN, checksum: null, cells: {} };
        for (const z of LEVELS) {
            // Allocate Ground too: its checksum still uses its unchanged WorldGen lattice.
            for (let ay = 0; ay < st.areasY; ay++) for (let ax = 0; ax < st.areasX; ax++) baseline(z, ax, ay);
            if (!st.levels[String(z)].checksum) st.levels[String(z)].checksum = checksumOf(z);
        }
        st.version = 4;
        stats.initMs = performance.now() - t0;
        return true;
    }

    /**
     * Bring a pre-V80 world state (version 3 or none) to version 4 in place: z 0 on every unit (and its goal), ground
     * item, job target and stand, and regrow entry; the five level entries (the four new levels come from the seed);
     * the view on the ground. Nothing moves and no id changes. Returns the migration record.
     */
    function migrate(st, view) {
        const from = st.version | 0;
        const counts = { units: 0, items: 0, jobs: 0, regrow: 0 };
        for (const id in st.units || {}) {
            const u = st.units[id];
            if (u.z === undefined) u.z = 0;
            if (u.goal && u.goal.z === undefined) u.goal.z = 0;
            counts.units++;
        }
        if (provoked("surface_migration")) {
            const first = Object.values(st.units || {})[0];
            if (first) first.z = -1;
        }
        const items = st.items && st.items.byId ? st.items.byId : {};
        for (const id in items) {
            if (items[id].z === undefined) items[id].z = 0;
            counts.items++;
        }
        for (const job of (st.jobs && st.jobs.list) || []) {
            if (job.target && job.target.z === undefined) job.target.z = 0;
            if (job.stand && job.stand.z === undefined) job.stand.z = 0;
            counts.jobs++;
        }
        for (const e of st.regrow || []) {
            if (e.z === undefined) e.z = 0;
            counts.regrow++;
        }
        ensureWorldLevels(st);
        st.view = { x: view ? view.x | 0 : 0, y: view ? view.y | 0 : 0, z: 0 };
        st.migrations = st.migrations || [];
        const record = { from, to: 4, rule: "V80", counts, conflicts: [] };
        st.migrations.push(record);
        stats.migrations++;
        return record;
    }

    // A version-4 world on load: regenerate the baselines and compare them with the checksums made at New Game. A
    // mismatch is reported, never repaired silently.
    function verifyLevels(st) {
        const bad = [];
        for (const z of LEVELS) {
            const L = st.levels[String(z)];
            if (!L) { bad.push(`${z}: missing`); continue; }
            const now = checksumOf(z);
            if (L.checksum && now !== "n/a" && L.checksum !== "n/a" && now !== L.checksum) {
                L.checksumMismatch = true;
                bad.push(`${z}: saved ${L.checksum}, regenerated ${now}`);
            }
        }
        if (bad.length) {
            stats.checksumMismatches += bad.length;
            console.warn(`UF_Levels: level baselines differ from the ones this save was made with: ${bad.join("; ")}`);
        }
        return bad;
    }

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        const W = World(), st = W && W.state;
        if (!st) return;
        if (!(st.version >= 4 && st.levels)) migrate(st, { x: $gamePlayer.x, y: $gamePlayer.y });
        else verifyLevels(st);
        pruneUnitEvents();
    };

    // A loaded game map keeps the unit events it was saved with. One whose unit isn't on that map's level (gone, or on
    // another level) would crash Game_Event.refresh once the map is built without it, so it is dropped here; the map's
    // start adds any unit that lacks one (UF.World.reconcileEvents).
    function pruneUnitEvents() {
        const W = World();
        const lv = W && W.levelOfMapId && window.$gameMap ? W.levelOfMapId($gameMap.mapId()) : null;
        if (!lv || !$gameMap._events) return 0;
        let n = 0;
        for (let id = W.EVENT_BASE; id < $gameMap._events.length; id++) {
            if (!$gameMap._events[id]) continue;
            const u = W.unit(id - W.EVENT_BASE);
            if (u && u.area && u.area.x === lv.x && u.area.y === lv.y && zOf(u) === lv.z) continue;
            delete $gameMap._events[id];
            n++;
        }
        stats.prunedEvents = (stats.prunedEvents || 0) + n;
        return n;
    }

    // New Game: every baseline generated and checksummed before the first frame (RESOURCE_ATLAS section 2). The view is
    // recorded when the first map starts (UF_History sets where it starts in its own world:created listener).
    function onWorldCreated(st) {
        ensureWorldLevels(st);
        if (st.view === undefined) st.view = null;
    }

    //-------------------------------------------------------------------------
    // The view: which level is on screen

    let pending = null;     // a level switch in progress: { from, to, displayX, displayY, t0, frames, follow }
    let mapFrames = 0;      // Scene_Map updates since boot (measuring only)

    function viewZ() {
        const W = World();
        const v = W && W.viewLevel ? W.viewLevel() : null;
        return v ? v.z : null;
    }

    /** Show level z (-2..+2). Keeps the cursor cell and the camera; opts.center: { x, y } to centre on instead (follow). */
    function setView(z, opts = {}) {
        const W = World();
        const v = W && W.viewLevel();
        if (!v || !isLevel(z) || !W.inWorld(v.x, v.y, z)) return false;
        if (v.z === z) return true;
        if ($gamePlayer.isTransferring() || pending) return false;
        const c = opts.center || null;
        const px = c ? c.x | 0 : $gamePlayer.x, py = c ? c.y | 0 : $gamePlayer.y;
        pending = { from: v.z, to: z, displayX: $gameMap.displayX(), displayY: $gameMap.displayY(), center: c, t0: performance.now(), frames0: mapFrames, zoom: window.UF.Camera ? UF.Camera.zoom() : 1 };
        if (!W.transferView(v.x, v.y, px, py, $gamePlayer.direction(), z)) {
            pending = null;
            return false;
        }
        return true;
    }

    // Right after the new level's map is set up: put the camera back where it was (or on the followed unit).
    const _Game_Player_performTransfer = Game_Player.prototype.performTransfer;
    Game_Player.prototype.performTransfer = function() {
        const p = pending;
        _Game_Player_performTransfer.call(this);
        if (!p || viewZ() !== p.to) return;
        if (p.center) $gameMap.setDisplayPos(p.center.x - $gameMap.screenTileX() / 2, p.center.y - $gameMap.screenTileY() / 2);
        else $gameMap.setDisplayPos(p.displayX, p.displayY);
        const st = World().state;
        st.view = { x: this.x, y: this.y, z: p.to };
    };

    // A level switch is a camera move, not a journey: keep the image cache and don't autosave.
    const _Scene_Map_onTransfer = Scene_Map.prototype.onTransfer;
    Scene_Map.prototype.onTransfer = function() {
        if (pending) return;
        _Scene_Map_onTransfer.call(this);
    };
    const _Scene_Map_shouldAutosave = Scene_Map.prototype.shouldAutosave;
    Scene_Map.prototype.shouldAutosave = function() {
        if (pending) return false;
        return _Scene_Map_shouldAutosave.call(this);
    };

    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        const W = World();
        if (W && W.reconcileEvents) W.reconcileEvents();
        const st = W && W.state;
        if (st && st.levels && !st.view && viewZ() !== null) st.view = { x: $gamePlayer.x, y: $gamePlayer.y, z: viewZ() };
        const p = pending;
        if (p && viewZ() === p.to) {
            pending = null;
            stats.switches++;
            stats.lastSwitch = {
                from: p.from, to: p.to, ms: performance.now() - p.t0, frames: mapFrames - p.frames0,
                reused: !!(W.lastMapLoad && W.lastMapLoad.reused), follow: !!p.center
            };
            emit("levels:viewChanged", p.from, p.to);
        } else if (p) {
            pending = null; // the transfer went elsewhere (a load, an edge): forget the switch
        }
        if (this._ufLevelPlate) this._ufLevelPlate.redraw();
    };

    // Keys: "," (and "<", the same key) up, "." (">") down, Home the ground.
    Input.keyMapper[188] = "ufLevelUp";
    Input.keyMapper[190] = "ufLevelDown";
    Input.keyMapper[36] = "ufLevelGround";

    const busyWindowIn = (node, depth = 0) => {
        if (!node || !node.children || depth > 3) return false;
        for (const child of node.children) {
            if (child instanceof Window_Selectable && child.active && child.visible && child.isOpen()) return true;
            if (busyWindowIn(child, depth + 1)) return true;
        }
        return false;
    };
    function canSwitch(scene) {
        if (!(scene instanceof Scene_Map) || !scene.isActive() || scene.isBusy() || SceneManager.isSceneChanging()) return false;
        if ($gameMessage.isBusy() || $gameMap.isEventRunning() || $gamePlayer.isTransferring() || pending) return false;
        return viewZ() !== null && !busyWindowIn(scene);
    }
    function step(dz) {
        const z = viewZ();
        if (z === null) return false;
        const to = Math.max(-2, Math.min(2, z + dz));
        return to !== z && setView(to);
    }

    // Follow mode: the followed unit changed level (stairs, a fall, a test moving it): the view goes with it.
    function followedUnit() {
        const cm = window.$colonyManager;
        const f = cm && cm.cameraFollowUnit;
        const W = World();
        return f && f.id !== undefined && W ? W.unit(f.id) : null;
    }
    function updateFollow() {
        if (provoked("follow_view")) return;
        const u = followedUnit();
        const W = World();
        const v = W && W.viewLevel();
        if (!u || !v || pending || $gamePlayer.isTransferring()) return;
        if (u.area && zOf(u) !== v.z && u.area.x === v.x && u.area.y === v.y) setView(zOf(u), { center: { x: u.x, y: u.y } });
    }

    // A level key pressed in a frame when the map can't switch (a transfer finishing, an event running) is kept for up to
    // half a second and carried out as soon as it can be, so a press is never lost.
    const KEY_KEEP_FRAMES = 30;
    let queuedKey = null; // { go: "up" | "down" | "ground", ttl }
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        mapFrames++;
        // A switch whose transfer never started (another transfer or scene took over) is forgotten, so keys keep working.
        if (pending && !$gamePlayer.isTransferring() && mapFrames - pending.frames0 > 5) pending = null;
        if (this.isActive()) {
            if (Input.isTriggered("ufLevelUp")) queuedKey = { go: "up", ttl: KEY_KEEP_FRAMES };
            else if (Input.isTriggered("ufLevelDown")) queuedKey = { go: "down", ttl: KEY_KEEP_FRAMES };
            else if (Input.isTriggered("ufLevelGround")) queuedKey = { go: "ground", ttl: KEY_KEEP_FRAMES };
        }
        if (canSwitch(this)) {
            if (queuedKey) {
                const k = queuedKey;
                queuedKey = null;
                if (k.go === "up") step(1);
                else if (k.go === "down") step(-1);
                else setView(0);
            } else {
                updateFollow();
            }
        } else if (queuedKey && --queuedKey.ttl <= 0) {
            queuedKey = null;
        }
    };

    //-------------------------------------------------------------------------
    // The level plate: beside the speed buttons (UF_TimeSpeed), drawn in code (AR-1312 replaces it later)

    const PLATE_W = 132, PLATE_H = 32;
    class Sprite_UFLevelPlate extends Sprite {
        constructor() {
            super(new Bitmap(PLATE_W, PLATE_H));
            this.width = PLATE_W;
            this.height = PLATE_H;
            this.z = 90;
            this._z = null;
            this.updatePosition();
            this.redraw();
        }
        updatePosition() {
            const gw = (window.Graphics && (Graphics.width || Graphics.boxWidth)) || 816;
            const timeW = 192;
            const margin = 10;
            this.x = gw - timeW - margin - PLATE_W - 8;
            this.y = margin;
        }
        redraw() {
            const z = viewZ();
            this._z = z;
            this.visible = z !== null;
            const b = this.bitmap;
            b.clear();
            if (z === null) return;
            // Sleek system menu / cursor styling: dark void backdrop, glowing electric cyan border, subtle top highlight
            b.fillRect(0, 0, PLATE_W, PLATE_H, "rgba(8, 11, 18, 0.92)");
            b.strokeRect(0, 0, PLATE_W, PLATE_H, "rgba(56, 189, 248, 0.85)");
            b.fillRect(1, 1, PLATE_W - 2, 1, "rgba(160, 240, 255, 0.35)");

            this.drawButton(4, 3, 28, 26, "▼", z > -2);
            this.drawButton(PLATE_W - 32, 3, 28, 26, "▲", z < 2);

            b.fontSize = 15;
            b.fontBold = true;
            b.outlineColor = "rgba(0, 0, 0, 0.95)";
            b.outlineWidth = 3;
            b.textColor = z === 0 ? "#ffffff" : z < 0 ? "#94a3b8" : "#7dd3fc";
            b.drawText(LABELS[z], 34, 3, PLATE_W - 68, 26, "center");
        }
        drawButton(x, y, w, h, label, enabled) {
            const b = this.bitmap;
            b.fillRect(x, y, w, h, enabled ? "rgba(18, 26, 42, 0.95)" : "rgba(10, 14, 22, 0.60)");
            b.strokeRect(x, y, w, h, enabled ? "rgba(56, 189, 248, 0.65)" : "rgba(45, 55, 72, 0.40)");
            if (enabled) b.fillRect(x + 1, y + 1, w - 2, 1, "rgba(160, 240, 255, 0.30)");
            b.fontSize = 14;
            b.fontBold = true;
            b.outlineColor = "rgba(0, 0, 0, 0.95)";
            b.outlineWidth = 3;
            b.textColor = enabled ? "#a0f0ff" : "#475569";
            b.drawText(label, x, y, w, h, "center");
        }
        /** The label shown ("+2", "+1", "Ground", "-1", "-2"), or "" when hidden. */
        text() {
            return this._z === null ? "" : LABELS[this._z];
        }
        update() {
            super.update();
            this.updatePosition();
            if (viewZ() !== this._z) this.redraw();
            if (TouchInput.isTriggered() && this.visible) {
                const lx = TouchInput.x - this.x, ly = TouchInput.y - this.y;
                if (lx >= 0 && lx < PLATE_W && ly >= 0 && ly < PLATE_H) {
                    const scene = SceneManager._scene;
                    if (lx < 34) { if (canSwitch(scene) && step(-1)) SoundManager.playCursor(); }
                    else if (lx >= PLATE_W - 34) { if (canSwitch(scene) && step(1)) SoundManager.playCursor(); }
                    TouchInput.clear();
                }
            }
        }
    }

    const _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function() {
        _Scene_Map_createDisplayObjects.call(this);
        this._ufLevelPlate = new Sprite_UFLevelPlate();
        this.addChild(this._ufLevelPlate);
    };
    const _Scene_Map_isAnyWindowUnderMouse = Scene_Map.prototype.isAnyWindowUnderMouse;
    Scene_Map.prototype.isAnyWindowUnderMouse = function() {
        if (_Scene_Map_isAnyWindowUnderMouse && _Scene_Map_isAnyWindowUnderMouse.call(this)) return true;
        const p = this._ufLevelPlate;
        return !!p && p.visible && TouchInput.x >= p.x && TouchInput.x < p.x + PLATE_W && TouchInput.y >= p.y && TouchInput.y < p.y + PLATE_H;
    };

    //-------------------------------------------------------------------------
    // The public object

    const Levels = {
        LEVELS, SHAPES, MATERIALS, TILESET_ID, GEN, BIOMES,
        isLevel,
        label: z => (isLevel(z) && z !== 3 ? LABELS[z] : ""),
        levelKey: (ax, ay, z = 0) => isLevel(z) ? (z ? `${ax},${ay},${z}` : `${ax},${ay}`) : null,
        zOf,
        levelArea: ref => ({ x: ref.area.x, y: ref.area.y, z: zOf(ref) }),
        ref: (area, x, y, z) => ({ area: { x: area.x, y: area.y }, x: x | 0, y: y | 0, z: z === undefined ? zOf(area) : z }),
        sameLevel: (a, b) => !!a && !!b && !!a.area && !!b.area && a.area.x === b.area.x && a.area.y === b.area.y && zOf(a) === zOf(b),
        /** The shape name of a cell ("solid", "floor", "open", "ramp", "stairUp", "stairDown", "stairBoth"), "" outside the world. */
        shapeAt: (...args) => {
            const r = args.length >= 5 ? { ax: args[0], ay: args[1], x: args[2], y: args[3], z: args[4] } : refOf(args[0]);
            return SHAPE_NAMES[packedAt(r.ax, r.ay, r.x, r.y, r.z) & 7] || "";
        },
        /** The numeric shape code of a cell (0..7). */
        shapeCodeAt: (...args) => {
            const r = args.length >= 5 ? { ax: args[0], ay: args[1], x: args[2], y: args[3], z: args[4] } : refOf(args[0]);
            return packedAt(r.ax, r.ay, r.x, r.y, r.z) & 7;
        },
        /** { shape, code, constructed, material, stratum } of a cell, or null outside the world. */
        cellAt: ref => {
            const r = refOf(ref);
            const p = packedAt(r.ax, r.ay, r.x, r.y, r.z);
            const fl = isFlooded(ref);
            const hasWater = waterAt(ref) || (fl && fl.flooded && fl.type === "water");
            const isLava = (fl && fl.flooded && fl.type === "lava") || (r.z === -2 && naturalWaterAt(ref));
            return p ? Object.assign(unpack(p), {
                biome: biomeAt(ref),
                water: hasWater,
                flooded: fl ? fl.flooded : false,
                floodType: fl && fl.flooded ? fl.type : null,
                liquid: isLava ? "lava" : hasWater ? "water" : null,
                stratum: Levels.stratumAt(ref)
            }) : null;
        },
        stratumAt: ref => {
            const r = refOf(ref);
            const W = World(), st = W && W.state;
            const size = st ? st.size : 256;
            const gx = r.ax * size + r.x, gy = r.ay * size + r.y;
            const G = window.UF && UF.WorldGen;
            return G && typeof G.geologyAt === "function" ? G.geologyAt(gx, gy, r.z) : null;
        },
        setShape,
        lastRefusal: () => lastRefusal,
        /** Whether a unit could stand on a cell by its shape alone (floors, ramps, stairs). */
        standableShape: ref => {
            const r = refOf(ref);
            const s = packedAt(r.ax, r.ay, r.x, r.y, r.z) & 7;
            return s === FLOOR || s >= RAMP;
        },
        isConnectorCell: ref => {
            const r = refOf(ref);
            return (packedAt(r.ax, r.ay, r.x, r.y, r.z) & 7) >= RAMP;
        },
        describeCell,
        cellArt,
        /** The seeded baseline of a level (area 0,0 by default): { shape: Uint8Array, material: Uint8Array } (codes; runtime only). */
        baseline: (z, ax = 0, ay = 0) => baseline(z, ax, ay),
        biomeAt, waterAt, habitablePockets, settlementCell,
        startingPocket: (z, index = 0, ax = 0, ay = 0) => habitablePockets(z, ax, ay)[index] || null,
        terrainStats: (z, ax = 0, ay = 0) => {
            const b = baseline(z, ax, ay);
            return b ? baselineMetrics(b, World().state.size) : null;
        },
        ensureWorldLevels,
        surfaceElevationAt: (gx, gy, seed) => {
            const W = World(), st = W && W.state;
            const s = seed !== undefined ? seed : (st ? st.seed : 0);
            const size = st ? st.size : 256;
            const d = (st && st.areasX) ? { width: st.areasX * size, height: st.areasY * size, seed: s } : { width: size, height: size, seed: s };
            const cat = catalog(), cl = (cat && cat.climate) || { continentRim: 0.15, seaLevel: 0.2, scale: { elevation: 64, rainfall: 48, temperature: 96, detail: 16 } };
            return surfaceElevation(s, gx, gy, size, d, cl);
        },
        cliffCaveMouths: area => {
            const W = World(), st = W && W.state;
            if (!st) return [];
            const ax = area && area.x !== undefined ? area.x : (st.startArea ? st.startArea.x : 0);
            const ay = area && area.y !== undefined ? area.y : (st.startArea ? st.startArea.y : 0);
            const b = baseline(0, ax, ay);
            if (b && b.cliffCaves) return b.cliffCaves;
            const size = st.size || 96;
            const d = (st && st.areasX) ? { width: st.areasX * size, height: st.areasY * size, seed: st.seed } : { width: size, height: size, seed: st.seed };
            const cat = catalog(), cl = (cat && cat.climate) || { continentRim: 0.15, seaLevel: 0.2, scale: { elevation: 64, rainfall: 48, temperature: 96, detail: 16 } };
            return cliffCaveMouthsForArea(st.seed, ax, ay, size, d, cl);
        },
        isExposedSurface,
        exposedFacesAround,
        notifyWorldCellChanged,
        /** Checksum of a level's baseline: the save's world by default; seed/gen regenerate another one (tests). */
        checksum: (z, seed, gen) => checksumOf(z, seed, gen),
        migrate,
        verifyLevels,
        /** The level on screen (-2..+2), or null off the world maps. */
        view: () => viewZ(),
        setView,
        up: () => step(1),
        down: () => step(-1),
        ground: () => setView(0),
        /** Follow a unit (id) with the view, or null to stop; the camera and the level go with it. */
        follow(unitId) {
            const cm = window.$colonyManager;
            if (!cm) return false;
            const W = World();
            const u = unitId !== null && unitId !== undefined && W ? W.unit(unitId) : null;
            cm.cameraFollowUnit = u ? { id: u.id, get event() { return W.eventOf(u.id); } } : null;
            return !!u || unitId === null;
        },
        switching: () => !!pending,
        plateText: () => {
            const s = SceneManager._scene;
            return s && s._ufLevelPlate ? s._ufLevelPlate.text() : "";
        },
        looks,
        composedSheets: () => Object.assign({}, composed.bitmaps),
        composeInfo: () => ({ state: composed.state, ms: composed.ms, loadMs: composed.loadMs, failed: composed.failed.slice() }),
        tileOf: key => tileBase(key),
        isFlooded,
        floodTypeAt,
        isWaterAt: isWaterAtRaw,
        isLavaAt: isLavaAtRaw,
        floodGrid: (area, z) => getFloodGrid(area, z),
        invalidateFloods,
        stats: () => JSON.parse(JSON.stringify(stats))
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Levels = Levels;

    //-------------------------------------------------------------------------
    // Wiring at boot (after every plugin has loaded)

    function hookWorld() {
        const W = World();
        if (!W || W._ufLevelsHooked) return;
        W._ufLevelsHooked = true;
        W.registerGenerator("uf_levels_terrain", paintLevel, 5, { levels: LEVELS.filter(z => z !== 0) });
        // vertical.offscreen_state (seen failing once): off-screen walkers go back to the straight step.
        if (provoked("offscreen_state") && W.pathConfig) W.pathConfig.offscreenPaths = false;
        if (window.UF.Events && UF.Events.on) {
            UF.Events.on("world:initializing", st => {
                if (!provoked("complete_at_start")) {
                    ensureWorldLevels(st);
                    stats.initializedBeforeCreated = st.seed;
                }
            });
            UF.Events.on("world:created", onWorldCreated);
            UF.Events.on("levels:shapeChanged", invalidateFloods);
            UF.Events.on("levels:cellChanged", invalidateFloods);
            const isFloodBarrier = typeId => {
                if (!typeId) return false;
                const O = window.UF && UF.Objects;
                const t = O && typeof O.type === "function" ? O.type(typeId) : null;
                return !!(t && (t.autotile === "wall" || (Array.isArray(t.tags) && (t.tags.includes("wall") || t.tags.includes("door")))));
            };
            UF.Events.on("objects:levelChanged", (area, x, y, fromTypeId, toTypeId) => {
                if (isFloodBarrier(fromTypeId) || isFloodBarrier(toTypeId)) invalidateFloods();
            });
            UF.Events.on("objects:changed", (area, x, y, fromTypeId, toTypeId) => {
                if (isFloodBarrier(fromTypeId) || isFloodBarrier(toTypeId)) invalidateFloods();
            });
        }
        // Units on different levels never fight (vertical combat is slice 6). Combat.engage is also what Combat's own AI
        // calls, so this covers both.
        const C = window.UF.Combat;
        if (C && typeof C.engage === "function" && !C.engage._ufLevels) {
            const _engage = C.engage;
            C.engage = function(attacker, target) {
                if (attacker && target && zOf(attacker) !== zOf(target)) return false;
                return _engage.apply(this, arguments);
            };
            C.engage._ufLevels = true;
        }
    }

    // Hooked before the original start: a test run (and "title skip") creates the world inside it.
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        registerTileset();
        hookWorld();
        _Scene_Boot_start.call(this);
        stats.composeMs = composed.ms;
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "vertical", not in the default run)

    function registerChecks() {
        UF.Test.suite("vertical", verticalSuite, { isDefault: false });
        UF.Test.suite("natural_walls", naturalWallsSuite, { isDefault: false });
        UF.Test.suite("flooding", floodingSuite, { isDefault: false });
    }

    async function naturalWallsSuite(t) {
        const W = World(), O = UF.Objects, C = UF.Camera;
        if (!W || !W.state || !O) { t.check("setup", false, "world/objects absent"); return; }
        if (window.$colonyManager) $colonyManager.cameraFollowUnit = null;
        const settled = () => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted() && !$gamePlayer.isTransferring() && !pending;
        await t.waitUntil(settled, 20000, "initial map");
        if (viewZ() !== -1) { setView(-1); await t.waitUntil(() => settled() && viewZ() === -1, 20000, "wall fixture level"); }
        const area = W.viewLevel(), size = W.state.size;
        let cx = 0, cy = 0;
        find: for (let y = 20; y < size - 20; y += 12) for (let x = 20; x < size - 20; x += 16) {
            if (!W.units().some(u => zOf(u) === -1 && u.area.x === area.x && u.area.y === area.y && Math.abs(u.x-x) < 9 && Math.abs(u.y-y) < 7)) { cx=x; cy=y; break find; }
        }
        if (!cx) { t.check("setup", false, "no empty unit-free fixture region"); return; }
        const originals = [], units = [], oldZoom = C && C.level();
        for (let y=cy-4;y<=cy+4;y++) for (let x=cx-7;x<=cx+7;x++) {
            const ref={area,x,y,z:-1}; originals.push({ref,cell:Levels.cellAt(ref),object:W.getObject(area.x,area.y,x,y,-1)});
            O.setIn(area,x,y,null); setShape(ref,"floor",{constructed:true,material:"stone"});
        }
        for (const [offset,material] of [[-4,"soil"],[0,"stone"]]) for(let i=0;i<3;i++) setShape({area,x:cx+offset+i,y:cy,z:-1},"solid",{material});
        for(const [name,x,y] of [["TEST_north",cx-3,cy-1],["TEST_south",cx-3,cy+1],["TEST_scale",cx+4,cy]]) {
            units.push(W.addUnit({name,image:{characterName:"People1",characterIndex:2},area:{x:area.x,y:area.y},x,y,z:-1,exact:true,data:{kind:"test"}}));
        }
        if(C) C.setLevel(0);
        $gamePlayer.locate(cx,cy); $gamePlayer.center(cx,cy);
        await t.waitFrames(20);
        const layer=SceneManager._scene._spriteset._ufNaturalWalls;
        const soil=layer && layer._active.get(cy*size+cx-3), stone=layer && layer._active.get(cy*size+cx+1);
        const sprites=SceneManager._scene._spriteset._characterSprites;
        const person=u=>sprites.find(s=>s._character===W.eventOf(u.id));
        const north=person(units[0]), south=person(units[1]);
        const opaque=(s,from,to)=> {
            let n=0; if(!s || !s.bitmap || !s.bitmap.isReady()) return n;
            for(let y=from;y<Math.min(to,s.bitmap.height);y+=4) for(let x=0;x<48;x+=4) if(s.bitmap.getAlphaPixel(x,y)>0) n++;
            return n;
        };
        const heightOk=[soil,stone].every(s=>s && s.bitmap.width===48 && s.bitmap.height===96 && s.anchor.y===1 && s._ufLevel===-1 && s.y-96===Math.round($gameMap.adjustY(cy-1)*48) && opaque(s,0,48)>80 && opaque(s,48,96)>80);
        t.check("two_cell_render",heightOk,`soil ${soil ? soil.bitmap.width+"x"+soil.bitmap.height : "missing"}, stone ${stone ? stone.bitmap.width+"x"+stone.bitmap.height : "missing"}; opaque cap/face samples soil ${opaque(soil,0,48)}/${opaque(soil,48,96)}, stone ${opaque(stone,0,48)}/${opaque(stone,48,96)}; cap y-1 on z=-1, lower face ends at wall-cell foot`);
        const ref=(x,y)=>({area,x,y,z:-1});
        t.check("one_collision_cell",Levels.shapeAt(ref(cx-3,cy))==="solid" && Levels.shapeAt(ref(cx-3,cy-1))==="floor" && Levels.shapeAt(ref(cx-3,cy+1))==="floor" &&
            !$gameMap.isPassable(cx-3,cy,2) && $gameMap.isPassable(cx-3,cy-1,2) && $gameMap.isPassable(cx-3,cy+1,2) && !W.getObject(area.x,area.y,cx-3,cy,-1),"wall base blocked; north cap overhang and south floor remain passable; no duplicate object");
        t.check("material_and_depth",!!soil && !!stone && soil.bitmap!==stone.bitmap && soil._ufMaterial===SOIL && stone._ufMaterial===STONE && !!north && !!south && north.z<soil.z && soil.z<south.z,
            `separate material frames; depth north ${north && north.z} < wall ${soil && soil.z} < south ${south && south.z}`);
        t.screenshot("two_cell_natural_walls");
        for(const u of units) W.removeUnit(u.id);
        for(const o of originals) { setShape(o.ref,o.cell.shape,{material:o.cell.material,constructed:o.cell.constructed}); O.setIn(area,o.ref.x,o.ref.y,o.object || null); }
        if(C) C.setLevel(oldZoom);
        t.check("no_errors",t.errorsSoFar().length===0,t.errorsSoFar().join(" | ") || "none");
    }

    async function floodingSuite(t) {
        const W = World(), O = window.UF && UF.Objects;
        if (!W || !W.state || !O) { t.check("setup", false, "world/objects absent"); return; }
        if (window.$colonyManager) $colonyManager.cameraFollowUnit = null;
        const settled = () => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted() && !$gamePlayer.isTransferring() && !pending;
        await t.waitUntil(settled, 20000, "map settled");

        const area = W.viewLevel() ? { x: W.viewLevel().x, y: W.viewLevel().y } : { x: 0, y: 0 };
        const size = W.state.size;

        // Choose a testing fixture coordinate
        const cx = Math.max(10, Math.min(size - 14, Math.floor(size / 2) + 10));
        const cy = Math.max(10, Math.min(size - 14, Math.floor(size / 2) + 10));

        const savedShapes = new Map();
        const saveShape = (x, y, z) => {
            const k = `${x},${y},${z}`;
            if (!savedShapes.has(k)) {
                savedShapes.set(k, { x, y, z, cell: Levels.cellAt({ area, x, y, z }) });
            }
        };

        const savedTiles0 = [];
        const saveAndSetTile0 = (x, y, tile) => {
            savedTiles0.push({ x, y, tile: W.getTile(area.x, area.y, x, y, 0, 0) });
            W.setTile(area.x, area.y, x, y, 0, tile);
        };

        // 1. Clear ground (Z=0) in the test area to dry ground so no natural water leaks in
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 11; dx++) {
                saveAndSetTile0(cx + dx, cy + dy, 2816); // dry grass autotile
            }
        }

        // 2. Setup Chamber 1 (Water Chamber) on Z = -1 (5x5 room, center at cx, cy)
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                saveShape(cx + dx, cy + dy, -1);
                saveShape(cx + dx, cy + dy, -2);
                O.setIn({ x: area.x, y: area.y, z: -1 }, cx + dx, cy + dy, null);
                O.setIn({ x: area.x, y: area.y, z: -2 }, cx + dx, cy + dy, null);
                const isPerimeter = Math.abs(dx) === 2 || Math.abs(dy) === 2;
                setShape({ area, x: cx + dx, y: cy + dy, z: -1 }, isPerimeter ? "solid" : "floor", { material: "stone" });
                setShape({ area, x: cx + dx, y: cy + dy, z: -2 }, (dx === 0 && dy === 0) ? "floor" : "solid", { material: "stone" });
            }
        }

        // Setup an isolated dry test cell at (cx + 3, cy, -1) enclosed by solid walls
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = 3; dx <= 4; dx++) {
                saveShape(cx + dx, cy + dy, -1);
                saveShape(cx + dx, cy + dy, -2);
                O.setIn({ x: area.x, y: area.y, z: -1 }, cx + dx, cy + dy, null);
                O.setIn({ x: area.x, y: area.y, z: -2 }, cx + dx, cy + dy, null);
                const isCell = dx === 3 && dy === 0;
                setShape({ area, x: cx + dx, y: cy + dy, z: -1 }, isCell ? "floor" : "solid", { material: "stone" });
                setShape({ area, x: cx + dx, y: cy + dy, z: -2 }, "solid", { material: "stone" });
            }
        }

        // Water breach source at (cx, cy, 0)
        W.setTile(area.x, area.y, cx, cy, 0, Tilemap.TILE_ID_A1);
        invalidateFloods();

        // Check 1: Downward breach from Z = 0 into Z = -1
        const floodMinus1Center = Levels.isFlooded({ area, x: cx, y: cy, z: -1 });
        t.check("downward_breach_water", floodMinus1Center.flooded === true && floodMinus1Center.type === "water",
            `breach at (${cx},${cy},-1): flooded ${floodMinus1Center.flooded}, type ${floodMinus1Center.type} (want true, water)`);

        // Check 2: Lateral expansion within room bounded by solid walls
        const floodMinus1Inner = Levels.isFlooded({ area, x: cx + 1, y: cy, z: -1 });
        const floodMinus1Wall = Levels.isFlooded({ area, x: cx + 2, y: cy, z: -1 });
        const floodMinus1Outside = Levels.isFlooded({ area, x: cx + 3, y: cy, z: -1 });
        t.check("lateral_flood_bounded", floodMinus1Inner.flooded === true && floodMinus1Inner.type === "water" &&
            floodMinus1Wall.flooded === false && floodMinus1Outside.flooded === false,
            `interior (${cx+1},${cy}) flooded: ${floodMinus1Inner.flooded}; perimeter wall (${cx+2},${cy}) flooded: ${floodMinus1Wall.flooded}; outside (${cx+3},${cy}) flooded: ${floodMinus1Outside.flooded}`);

        // Check 3: Solid wall on Z = -1 blocks breach from water on Z = 0
        W.setTile(area.x, area.y, cx + 2, cy, 0, Tilemap.TILE_ID_A1);
        invalidateFloods();
        const floodBlockedByWall = Levels.isFlooded({ area, x: cx + 2, y: cy, z: -1 });
        t.check("wall_blocks_breach", floodBlockedByWall.flooded === false,
            `solid rock on z=-1 directly under water remains unflooded: ${!floodBlockedByWall.flooded}`);

        // Check 4: Cascading breach from Z = -1 down into Z = -2
        const floodMinus2Center = Levels.isFlooded({ area, x: cx, y: cy, z: -2 });
        t.check("cascading_breach_to_minus2", floodMinus2Center.flooded === true && floodMinus2Center.type === "water",
            `cascade from -1 to -2 at (${cx},${cy},-2): flooded ${floodMinus2Center.flooded}, type ${floodMinus2Center.type} (want true, water)`);

        // Check 5: Lava flooding on Z = -2 in an isolated chamber with solid rock ceiling on Z = -1
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = 6; dx <= 10; dx++) {
                saveShape(cx + dx, cy + dy, -1);
                saveShape(cx + dx, cy + dy, -2);
                O.setIn({ x: area.x, y: area.y, z: -1 }, cx + dx, cy + dy, null);
                O.setIn({ x: area.x, y: area.y, z: -2 }, cx + dx, cy + dy, null);
                // Ceiling on Z=-1 is completely solid
                setShape({ area, x: cx + dx, y: cy + dy, z: -1 }, "solid", { material: "stone" });
                // Chamber on Z=-2: perimeter solid, interior floor
                const isEdge = dx === 6 || dx === 10 || Math.abs(dy) === 2;
                setShape({ area, x: cx + dx, y: cy + dy, z: -2 }, isEdge ? "solid" : "floor", { material: "stone" });
            }
        }
        const bMinus2 = baseline(-2, area.x, area.y);
        const lavaIdx = cy * size + (cx + 8);
        const oldWaterVal = bMinus2 && bMinus2.water ? bMinus2.water[lavaIdx] : 0;
        if (bMinus2 && bMinus2.water) bMinus2.water[lavaIdx] = 1; // Baseline water on z=-2 is lava
        invalidateFloods();

        const floodLava = Levels.isFlooded({ area, x: cx + 8, y: cy, z: -2 });
        const floodLavaAdj = Levels.isFlooded({ area, x: cx + 7, y: cy, z: -2 });
        const floodLavaWall = Levels.isFlooded({ area, x: cx + 6, y: cy, z: -2 });
        t.check("lava_flooding", floodLava.flooded === true && floodLava.type === "lava" &&
            floodLavaAdj.flooded === true && floodLavaAdj.type === "lava" && floodLavaWall.flooded === false,
            `lava pool (${cx+8},${cy}): ${floodLava.flooded} (${floodLava.type}); adjacent (${cx+7},${cy}): ${floodLavaAdj.flooded} (${floodLavaAdj.type}); wall (${cx+6},${cy}): ${floodLavaWall.flooded}`);

        // Check 6: Cell description in UF.Levels
        const descWater = Levels.describeCell({ area, x: cx, y: cy, z: -1 });
        const descLava = Levels.describeCell({ area, x: cx + 8, y: cy, z: -2 });
        t.check("describe_flooded_cells", descWater.includes("Flooded (Fresh water)") && descLava.includes("Flooded (Lava)"),
            `water desc "${descWater}"; lava desc "${descLava}"`);

        // Check 7: Switch view to -1, reveal fog and illuminate, screenshot animated overlay, verify Sprite_UFFloodOverlay
        setView(-1);
        await t.waitUntil(() => settled() && viewZ() === -1, 10000, "view switch to -1");
        $gamePlayer.locate(cx, cy);
        if ($gamePlayer.center) $gamePlayer.center(cx, cy);
        if (window.UF && UF.Fog && typeof UF.Fog.reveal === "function") {
            UF.Fog.reveal(cx, cy, 14, -1);
            if (typeof UF.Fog.refresh === "function") UF.Fog.refresh();
        }
        const unit = W.addUnit({
            name: "TEST_observer",
            image: { characterName: "People1", characterIndex: 2 },
            area: { x: area.x, y: area.y },
            x: cx - 1, y: cy, z: -1,
            exact: true,
            data: { kind: "colonist", light: 12 }
        });
        await t.waitFrames(20);
        const overlay = SceneManager._scene._spriteset && SceneManager._scene._spriteset._ufFloodOverlay;
        const overlayActive = overlay && overlay._active.size > 0;
        t.check("flood_overlay_rendered", overlayActive,
            `overlay present: ${!!overlay}, active sprites: ${overlay ? overlay._active.size : 0}`);
        t.screenshot("flooded_cavern_water_minus1");
        W.removeUnit(unit.id);

        // Restore original shapes, tiles, and baselines
        for (const st of savedTiles0) {
            W.setTile(area.x, area.y, st.x, st.y, 0, st.tile);
        }
        if (bMinus2 && bMinus2.water) bMinus2.water[lavaIdx] = oldWaterVal;
        for (const s of savedShapes.values()) {
            if (s.cell) setShape({ area, x: s.x, y: s.y, z: s.z }, s.cell.code, { material: s.cell.material, constructed: s.cell.constructed });
        }
        invalidateFloods();
        setView(0);
        await t.waitUntil(() => settled() && viewZ() === 0, 10000, "view return to Ground");

        t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().join(" | ") || "none");
    }

    async function verticalSuite(t) {
        const W = World();
        const note = PROVOKE.length ? ` [PROVOKED: ${PROVOKE.join(", ")}]` : "";
        const settled = () => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted() && !$gamePlayer.isTransferring() && !pending;
        const waitSettled = (what, ms = 20000) => t.waitUntil(settled, ms, what);
        // An unhandled rejection is recorded by UF_Test without stopping the game (a thrown error would stop RMMZ itself).
        if (provoked("no_errors")) Promise.reject(new Error("provoked error (vertical.no_errors)"));
        const O = window.UF.Objects, I = window.UF.Items, C = window.UF.Camera;
        // Factions may now found below Ground. The legacy view fixtures start
        // on Ground explicitly; normal play retains the faction's home level.
        if (W.viewLevel() && W.viewLevel().z !== 0) {
            if (window.$colonyManager) $colonyManager.cameraFollowUnit = null;
            await waitSettled("the founding view to settle");
            if (!setView(0)) { t.check("setup", false, "could not select Ground for the vertical fixtures"); return; }
            await t.waitUntil(() => settled() && W.viewLevel() && W.viewLevel().z === 0, 20000, "Ground view for vertical fixtures");
        }
        const home = W.viewLevel();
        if (!home || home.z !== 0 || !O || !I) {
            t.check("setup", false, `view ${JSON.stringify(home)}, UF.Objects ${!!O}, UF.Items ${!!I}`);
            return;
        }
        const area = { x: home.x, y: home.y };
        const size = W.state.size;
        const img = { characterName: "People1", characterIndex: 2 };
        const objType = O.types().find(o => o.passable !== true && o.image) || O.types()[0];
        const itemType = I.types()[0];

        //---------------------------------------------------------------- five_levels
        {
            const st = W.state;
            const keys = Object.keys(st.levels || {}).map(Number).sort((a, b) => a - b);
            const want = LEVELS.slice();
            const regen = {}, lens = {};
            for (const z of LEVELS) {
                regen[z] = z === 0 ? checksumOf(0) : checksumOf(z, st.seed, levelGen(st, z));
                if (z !== 0) {
                    const b = baseline(z);
                    lens[z] = `${b.shape.length}/${b.material.length}`;
                }
            }
            const lensOk = LEVELS.filter(z => z !== 0).every(z => lens[z] === `${size * size}/${size * size}`);
            const sumsOk = LEVELS.every(z => st.levels[String(z)] && st.levels[String(z)].checksum === regen[z] && regen[z] !== "n/a");
            let threw = null;
            try {
                W.addUnit({ name: "TEST_sixth", image: img, area, x: 1, y: 1, z: 3, data: { kind: "test" } });
            } catch (e) {
                threw = e.message;
            }
            const sixth = [
                ["Levels.isLevel(3)", Levels.isLevel(3) === false],
                ["World.inWorld(3)", W.inWorld(area.x, area.y, 3) === false],
                ["World.areaMapId(3)", W.areaMapId(area.x, area.y, 3) === 0],
                ["World.setObject(3)", W.setObject(area.x, area.y, 10, 10, objType ? objType.typeId : 1, 3) === false],
                ["Levels.setShape(3)", setShape({ area, x: 10, y: 10, z: 3 }, "floor") === false],
                ["World.addUnit(z 3) throws", !!threw]
            ];
            const idsOk = LEVELS.every(z => { const l = W.levelOfMapId(W.areaMapId(area.x, area.y, z)); return !!l && l.z === z; }) && W.areaMapId(area.x, area.y, 0) === W.config.mapIdBase + area.y * st.areasX + area.x;
            const open = z => { const b = baseline(z); let n = 0; for (let i = 0; i < b.shape.length; i++) if (b.shape[i] === FLOOR) n++; return n; };
            t.check("five_levels",
                JSON.stringify(Levels.LEVELS) === JSON.stringify(want) && JSON.stringify(keys) === JSON.stringify(want) && lensOk && sumsOk && sixth.every(s => s[1]) && idsOk && st.version === 4,
                `LEVELS ${JSON.stringify(Levels.LEVELS)}; saved levels ${JSON.stringify(keys)}; world version ${st.version}; baseline sizes ${JSON.stringify(lens)}; ` +
                `checksums saved/regenerated: ${LEVELS.map(z => `${z} ${st.levels[String(z)] ? st.levels[String(z)].checksum : "MISSING"}/${regen[z]}`).join(", ")}; ` +
                `floor cells in the baselines: -1 ${open(-1)}, -2 ${open(-2)} of ${size * size} (the rest rock or soil), +1 ${open(1)}, +2 ${open(2)} (open air); ` +
                `a sixth level refused: ${sixth.map(s => `${s[0]} ${s[1] ? "ok" : "NOT REFUSED"}`).join(", ")}${threw ? ` ("${threw}")` : ""}; map ids ${LEVELS.map(z => `${z}->${W.areaMapId(area.x, area.y, z)}`).join(" ")}; ` +
                `New Game levels made in ${stats.initMs !== undefined ? stats.initMs.toFixed(0) : "?"} ms (${stats.generated} baselines generated so far, last ${stats.lastGenMs.toFixed(1)} ms)${note}`);
        }

        //---------------------------------------------------------------- underground geometry/biomes and initialization
        {
            const st = W.state, report = [];
            let geographyOk = true, deterministic = true;
            for (const z of [-1, -2]) {
                const b = baseline(z), metrics = baselineMetrics(b, size);
                const expectedCodes = z === -1 ? [1, 2, 3, 4] : [5, 6, 7, 8];
                let dryCores = true;
                for (const p of b.pockets || []) {
                    for (let dy = -p.clearRadius; dy <= p.clearRadius; dy++) for (let dx = -p.clearRadius; dx <= p.clearRadius; dx++) {
                        const i = (p.y + dy) * size + p.x + dx;
                        if (b.shape[i] !== FLOOR || b.water[i]) dryCores = false;
                    }
                }
                const expectedPockets = z === -1 ? 36 : 16;
                const gen = levelGen(st, z);
                if (gen >= 3) {
                    geographyOk = geographyOk && metrics.solidFraction >= 0.40 && metrics.solidFraction <= 0.65 &&
                        expectedCodes.every(code => metrics.biomes[code] > 0) && Object.keys(metrics.biomes).length === 4 &&
                        (b.pockets || []).length === expectedPockets && dryCores &&
                        (z === -1 ? metrics.soil > size * size * 0.4 : metrics.soil === 0);
                } else {
                    geographyOk = geographyOk && metrics.solidFraction >= 0.80 && metrics.solidFraction <= 0.90 &&
                        expectedCodes.every(code => metrics.biomes[code] > 0) && Object.keys(metrics.biomes).length === 4 &&
                        metrics.components.length === expectedPockets && (b.pockets || []).length === expectedPockets &&
                        metrics.water === expectedPockets * 4 && dryCores &&
                        (z === -1 ? metrics.soil > size * size * 0.5 : metrics.soil === 0);
                }
                const ownSum = checksumOf(z), repeat = checksumOf(z, st.seed, levelGen(st, z)), other = checksumOf(z, st.seed + 1, levelGen(st, z));
                deterministic = deterministic && ownSum === repeat && ownSum !== other;
                report.push(`${z}: ${metrics.solid}/${size * size} solid (${(metrics.solidFraction * 100).toFixed(2)}%), ` +
                    `${metrics.components.length} pockets (${Math.min(...metrics.components)}-${Math.max(...metrics.components)} cells), ` +
                    `biomes ${JSON.stringify(metrics.biomes)}, fresh water ${metrics.water}, dry founding cores ${dryCores}, checksums ${ownSum}/${repeat}/${other}`);
            }
            t.check("underground_biomes", geographyOk && deterministic, report.join("; "));
            const before = JSON.stringify(st.levels), viewBefore = JSON.stringify(st.view);
            ensureWorldLevels(st);
            const allAllocated = LEVELS.every(z => {
                const b = baseline(z);
                return b && b.shape.length === size * size && b.material.length === size * size && !!st.levels[String(z)].checksum;
            });
            t.check("complete_at_start", allAllocated && stats.initializedBeforeCreated === st.seed &&
                JSON.stringify(st.levels) === before && JSON.stringify(st.view) === viewBefore,
                `all five ${size}x${size} baselines allocated; early initialization seed ${stats.initializedBeforeCreated}/${st.seed}; repeated initialization preserves saved edits/checksums/view ${JSON.stringify(st.levels) === before && JSON.stringify(st.view) === viewBefore}`);
        }

        //---------------------------------------------------------------- fixtures for the view checks
        // A clear 7x5 patch of walkable ground near the camp, away from units and objects.
        const free = (x, y, z = 0) => W.cellFree(area.x, area.y, x, y, 0, z) && !W.getObject(area.x, area.y, x, y, z);
        let spot = null;
        const c0 = { x: $gamePlayer.x, y: $gamePlayer.y };
        search: for (let r = 6; r < 60; r++) {
            for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                const cx = c0.x + dx, cy = c0.y + dy;
                if (cx < 8 || cy < 8 || cx >= size - 8 || cy >= size - 8) continue;
                let ok = true;
                for (let yy = -2; yy <= 2 && ok; yy++) for (let xx = -3; xx <= 3; xx++) if (!free(cx + xx, cy + yy)) { ok = false; break; }
                if (ok && !W.units().some(u => Math.abs(u.x - cx) <= 5 && Math.abs(u.y - cy) <= 4)) { spot = { x: cx, y: cy }; break search; }
            }
        }
        if (!spot) {
            t.check("fixtures", false, "no clear 7x5 patch of ground within 60 cells of the view");
            return;
        }
        const cx = spot.x, cy = spot.y;
        const made = { units: [], objects: [], items: [], shapes: [], counterObjects: [] };
        const shape = (x, y, z, s, opts) => {
            const before = Levels.cellAt({ area, x, y, z });
            if (setShape({ area, x, y, z }, s, opts)) made.shapes.push({ x, y, z, before });
        };
        // -1: a 7x5 floor pocket under the patch (so unit B has a floor to stand on); +1: a 3x1 wooden floor.
        for (let yy = -2; yy <= 2; yy++) for (let xx = -3; xx <= 3; xx++) shape(cx + xx, cy + yy, -1, "floor", { constructed: false, material: "stone" });
        for (let xx = -1; xx <= 1; xx++) shape(cx + xx, cy, 1, "floor", { constructed: true, material: "wood" });
        const A = W.addUnit({ name: "TEST_lv_ground", image: img, area, x: cx, y: cy, z: 0, exact: true, data: { kind: "test" } });
        const B = W.addUnit({ name: "TEST_lv_below", image: { characterName: "People1", characterIndex: 5 }, area, x: cx + 1, y: cy, z: -1, exact: true, data: { kind: "test", marker: "below" } });
        made.units.push(A, B);
        // Objects: the ground one west of A, the -1 one south-west of B (different cells, so a leak shows).
        const objG = { x: cx - 2, y: cy }, objL = { x: cx - 2, y: cy + 1 };
        // Underground resources may naturally occupy the ground fixture's countercell. That is not a level leak.
        // Make the isolation fixture explicit, then restore this natural object after the round-trip checks.
        const counterLv = { x: area.x, y: area.y, z: -1 };
        const counterType = W.getObject(area.x, area.y, objG.x, objG.y, -1);
        if (counterType) {
            made.counterObjects.push({ lv: counterLv, x: objG.x, y: objG.y, type: counterType });
            O.setIn(counterLv, objG.x, objG.y, null);
        }
        const setObj = (lv, c) => { if (O.setIn(lv, c.x, c.y, objType.id)) made.objects.push({ lv, x: c.x, y: c.y }); };
        setObj({ x: area.x, y: area.y, z: 0 }, objG);
        setObj({ x: area.x, y: area.y, z: -1 }, objL);
        const itemG = I.drop({ x: area.x, y: area.y, z: 0 }, cx + 2, cy - 1, itemType.id, 1)[0];
        const itemL = I.drop({ x: area.x, y: area.y, z: -1 }, cx + 2, cy + 1, itemType.id, 1)[0];
        made.items.push(itemG, itemL);
        await t.waitFrames(3);

        //---------------------------------------------------------------- switch_view (screenshots at zoom 1 with the plate)
        const level0 = C ? C.level() : 0;
        if (C) C.setLevel(0);
        $gamePlayer.locate(cx, cy);
        await t.waitFrames(5);
        const before = { px: $gamePlayer.x, py: $gamePlayer.y, dx: $gameMap.displayX(), dy: $gameMap.displayY(), zoom: C ? C.zoom() : 1 };
        const plateG = Levels.plateText();
        t.screenshot("view_ground");
        // Press a level key (RMMZ turns a held state into a trigger) and wait until the switch has finished. A press the
        // map didn't take is pressed again (at most twice more) and reported in the detail with what blocked it.
        const pressLog = [];
        const whyNot = () => {
            const s = SceneManager._scene, r = [];
            if (!(s instanceof Scene_Map)) r.push("not the map scene");
            else {
                if (!s.isActive()) r.push("scene inactive");
                if (s.isBusy()) r.push("scene busy");
                if (busyWindowIn(s)) r.push("a window is busy");
            }
            if (SceneManager.isSceneChanging()) r.push("scene changing");
            if ($gameMessage.isBusy()) r.push("message");
            if ($gameMap.isEventRunning()) r.push("event running");
            if ($gamePlayer.isTransferring()) r.push("transferring");
            if (pending) r.push("switch pending");
            return r.join(", ") || "nothing";
        };
        const pressed = async key => {
            for (let attempt = 1; attempt <= 3; attempt++) {
                const n0 = stats.switches, why = whyNot();
                Input._currentState[key] = true;
                await t.waitFrames(1);
                Input._currentState[key] = false;
                await t.waitUntil(() => stats.switches > n0 && settled(), 3000, "the level switch").catch(() => {});
                if (stats.switches > n0) {
                    if (attempt > 1) pressLog.push(`${key} taken on press ${attempt}`);
                    return true;
                }
                pressLog.push(`${key} press ${attempt} not taken (blocking before it: ${why}; after: ${whyNot()}; view ${viewZ()})`);
            }
            return false;
        };
        // A leak of the level filter (vertical.switch_view): unit lists ignore z while the view changes.
        const realUnitsInArea = W.unitsInArea;
        if (provoked("switch_view")) W.unitsInArea = (ax, ay) => W.units().filter(u => u.area.x === ax && u.area.y === ay);
        const tSwitch0 = performance.now();
        await pressed("ufLevelDown");
        await waitSettled("the view to reach -1").catch(() => {});
        const switchDown = stats.lastSwitch ? Object.assign({}, stats.lastSwitch) : null;
        const wallDown = performance.now() - tSwitch0;
        await t.waitFrames(20);
        W.unitsInArea = realUnitsInArea;
        const sprites = () => (SceneManager._scene._spriteset ? SceneManager._scene._spriteset._characterSprites : []);
        const spriteOf = ev => sprites().find(s => s._character === ev) || null;
        const opaque = sp => {
            const b = sp && sp.bitmap, f = sp && sp._frame;
            if (!b || !b.isReady() || !f || !f.width) return 0;
            let n = 0;
            for (let y = f.y; y < f.y + f.height; y += 2) for (let x = f.x; x < f.x + f.width; x += 2) if (b.getAlphaPixel(x, y) > 0) n++;
            return n;
        };
        const evA = $gameMap._events[W.eventIdOf(A.id)], evB = $gameMap._events[W.eventIdOf(B.id)];
        const spB = evB ? spriteOf(evB) : null;
        const gB = spB ? spB.getGlobalPosition() : null;
        const bDrawn = !!spB && spB.visible && spB.opacity > 0 && opaque(spB) > 0 && !!gB && gB.x >= 0 && gB.x <= Graphics.width && gB.y >= 0 && gB.y <= Graphics.height + 100;
        const aLeak = !!evA || sprites().some(s => s._character && s._character.eventId && s._character.eventId() === W.eventIdOf(A.id));
        const objSpriteL = O.spriteAt(objL.x, objL.y), objSpriteG = O.spriteAt(objG.x, objG.y);
        const itemLayer = I.layer ? I.layer() : null;
        const spItemL = itemLayer && itemLayer.spriteFor ? itemLayer.spriteFor(itemL.id) : null, spItemG = itemLayer && itemLayer.spriteFor ? itemLayer.spriteFor(itemG.id) : null;
        const look = window.UF.Look && UF.Look.describeCell ? (UF.Look.describeCell(cx, cy) || []) : [];
        const lookNamesA = look.some(l => String(l).includes(A.name));
        const lookB = window.UF.Look && UF.Look.describeCell ? (UF.Look.describeCell(B.x, B.y) || []) : [];
        const opts = window.UF.Interact && UF.Interact.optionsFor ? UF.Interact.optionsFor(objG.x, objG.y) : [];
        const optsNameG = (opts || []).some(o => new RegExp(objType.name, "i").test(`${o.label || ""} ${o.text || ""}`));
        const plateL = Levels.plateText();
        const leak = {
            currentArea: W.currentArea(), unitsGround: W.unitsInArea(area.x, area.y).map(u => u.id), unitsBelow: W.unitsInArea(area.x, area.y, -1).map(u => u.id),
            findG: O.findIn({ x: area.x, y: area.y }, { near: objL, radius: 0.5 }).length, itemsG: I.find({ area: { x: area.x, y: area.y }, near: { x: itemL.x, y: itemL.y }, radius: 0.5 }).filter(f => f.item.id === itemL.id).length
        };
        let changedFired = 0, levelFired = 0;
        const onCh = () => changedFired++, onLv = () => levelFired++;
        UF.Events.on("objects:changed", onCh);
        UF.Events.on("objects:levelChanged", onLv);
        O.setIn({ x: area.x, y: area.y, z: -1 }, objL.x, objL.y, null);
        O.setIn({ x: area.x, y: area.y, z: -1 }, objL.x, objL.y, objType.id);
        UF.Events.off("objects:changed", onCh);
        UF.Events.off("objects:levelChanged", onLv);
        const engageCross = window.UF.Combat && UF.Combat.engage ? UF.Combat.engage(A, B) : null;
        if (window.UF.Combat && UF.Combat.disengage) UF.Combat.disengage(A);
        const after = { px: $gamePlayer.x, py: $gamePlayer.y, dx: $gameMap.displayX(), dy: $gameMap.displayY(), zoom: C ? C.zoom() : 1 };
        t.screenshot("view_minus1");
        const mapBelow = $gameMap.mapId();
        const okDown = mapBelow === W.areaMapId(area.x, area.y, -1) && after.px === before.px && after.py === before.py &&
            Math.abs(after.dx - before.dx) < 0.01 && Math.abs(after.dy - before.dy) < 0.01 && after.zoom === before.zoom &&
            bDrawn && !aLeak && !!objSpriteL && !objSpriteG && !!spItemL && !spItemG && !lookNamesA && plateL === "-1" && plateG === "Ground" &&
            leak.currentArea === null && leak.unitsGround.includes(A.id) && !leak.unitsGround.includes(B.id) && leak.unitsBelow.includes(B.id) &&
            leak.findG === 0 && leak.itemsG === 0 && changedFired === 0 && levelFired === 2 && engageCross === false && !optsNameG;
        const downText = `down: map ${mapBelow} (want ${W.areaMapId(area.x, area.y, -1)}); cursor (${before.px},${before.py}) -> (${after.px},${after.py}); display (${before.dx.toFixed(2)},${before.dy.toFixed(2)}) -> (${after.dx.toFixed(2)},${after.dy.toFixed(2)}); zoom ${before.zoom} -> ${after.zoom}; ` +
            `B (${B.name}, -1) event ${evB ? "yes" : "NO"}, sprite ${spB ? `visible ${spB.visible}, ${opaque(spB)} opaque samples at (${Math.round(gB.x)},${Math.round(gB.y)})` : "NONE"}; A (${A.name}, ground) event/sprite ${aLeak ? "PRESENT (LEAK)" : "none"}; ` +
            `object sprite on the -1 cell ${objSpriteL ? "yes" : "NO"}, on the ground object's cell ${objSpriteG ? "YES (LEAK)" : "none"}; item sprite -1 ${spItemL ? "yes" : "NO"}, ground ${spItemG ? "YES (LEAK)" : "none"}; ` +
            `Look at A's cell ${JSON.stringify(look)}; Look at B ${JSON.stringify(lookB[0] || "")}; options at the ground object's cell: ${(opts || []).length}${optsNameG ? " (NAMES IT)" : ""}; plate "${plateG}" -> "${plateL}"; ` +
            `currentArea() ${JSON.stringify(leak.currentArea)}; unitsInArea ground ${leak.unitsGround.includes(A.id) ? "has A" : "NO A"}${leak.unitsGround.includes(B.id) ? " AND B (LEAK)" : ""}, -1 ${leak.unitsBelow.includes(B.id) ? "has B" : "NO B"}; ` +
            `ground findIn/find at the -1 fixtures ${leak.findG}/${leak.itemsG}; a -1 object change fired objects:changed ${changedFired}x, objects:levelChanged ${levelFired}x; Combat.engage(A, B) ${engageCross}`;

        // Up to +1 (two steps), then Home.
        await pressed("ufLevelUp");
        await waitSettled("the view to reach the ground").catch(() => {});
        const switchBack = stats.lastSwitch ? Object.assign({}, stats.lastSwitch) : null;
        await t.waitFrames(5);
        const unitEvents = () => Object.keys($gameMap._events).map(Number).filter(id => id >= W.EVENT_BASE).length;
        const backInfo = { load: JSON.stringify(W.lastMapLoad), unitEvents: unitEvents(), groundUnits: W.unitsInArea(area.x, area.y, 0).length, switches: stats.switches, frame: mapFrames };
        const evA2 = $gameMap._events[W.eventIdOf(A.id)], evB2 = $gameMap._events[W.eventIdOf(B.id)];
        const spA2 = evA2 ? spriteOf(evA2) : null;
        const back = { map: $gameMap.mapId(), plate: Levels.plateText(), px: $gamePlayer.x, py: $gamePlayer.y, dx: $gameMap.displayX() };
        const backOk = back.map === W.areaMapId(area.x, area.y, 0) && !!spA2 && opaque(spA2) > 0 && !evB2 && !!O.spriteAt(objG.x, objG.y) && !O.spriteAt(objL.x, objL.y) &&
            back.plate === "Ground" && back.px === before.px && back.py === before.py && Math.abs(back.dx - before.dx) < 0.01;
        await pressed("ufLevelUp");
        await waitSettled("the view to reach +1").catch(() => {});
        await t.waitFrames(20);
        const plateUp = Levels.plateText();
        const up = {
            map: $gameMap.mapId(), floorWalk: $gameMap.isPassable(cx, cy, 2), airWalk: $gameMap.isPassable(cx + 3, cy + 3, 2),
            airFree: W.cellFree(area.x, area.y, cx + 3, cy + 3, 0, 1), unitsDrawn: !!$gameMap._events[W.eventIdOf(A.id)] || !!$gameMap._events[W.eventIdOf(B.id)]
        };
        const airDiagnostic = {
            shape: Levels.shapeAt({ area, x: cx + 3, y: cy + 3, z: 1 }), tileset: $gameMap.tilesetId(),
            tiles: $gameMap.allTiles(cx + 3, cy + 3).map(id => [id, $gameMap.tilesetFlags()[id]]),
            object: W.getObject(area.x, area.y, cx + 3, cy + 3, 1),
            bridge: !!(UF.Roads && UF.Roads.bridgeAt(cx + 3, cy + 3))
        };
        const upOk = up.map === W.areaMapId(area.x, area.y, 1) && plateUp === "+1" && !up.unitsDrawn && up.floorWalk && !up.airWalk && !up.airFree;
        t.screenshot("view_plus1");
        await pressed("ufLevelGround");
        await waitSettled("Home to bring the view to the ground").catch(() => {});
        await t.waitFrames(5);
        const homeNow = { map: $gameMap.mapId(), plate: Levels.plateText() };
        const homeOk = homeNow.map === W.areaMapId(area.x, area.y, 0) && homeNow.plate === "Ground";
        t.check("switch_view", okDown && backOk && upOk && homeOk,
            `${downText}; back up to the ground: ${backOk ? "A drawn again, B gone, the ground object drawn and the -1 one not, cursor and camera kept" : `NOT RIGHT (map ${back.map}, A sprite ${!!spA2}, B event ${!!evB2}, plate "${back.plate}", cursor (${back.px},${back.py}), display x ${back.dx.toFixed(2)})`} (last map load ${backInfo.load}, ${backInfo.unitEvents} unit events for ${backInfo.groundUnits} ground units, ${backInfo.switches} switches so far); ` +
            `+1 (map ${up.map}): plate "${plateUp}", wooden floor at (${cx},${cy}) walkable ${up.floorWalk}, open air at (${cx + 3},${cy + 3}) walkable ${up.airWalk} (cellFree ${up.airFree}; ${JSON.stringify(airDiagnostic)}), a ground or -1 unit drawn ${up.unitsDrawn}; Home -> map ${homeNow.map}, plate "${homeNow.plate}" (${homeOk ? "the ground" : "NOT THE GROUND"}); ` +
            `keys pressed through Input._currentState (RMMZ turns a held state into a trigger)${pressLog.length ? `; PRESSES: ${pressLog.join(" | ")}` : "; every press taken at once"}; screenshots at zoom ${before.zoom}${note}`);

        //---------------------------------------------------------------- follow_view
        {
            const F = W.addUnit({ name: "TEST_lv_followed", image: { characterName: "People1", characterIndex: 6 }, area, x: cx - 1, y: cy - 1, z: 0, exact: true, data: { kind: "test" } });
            made.units.push(F);
            await t.waitFrames(2);
            Levels.follow(F.id);
            const moved = W.moveUnitToLevel(F, -1, cx - 1, cy - 1);
            const f0 = performance.now();
            await t.waitUntil(() => settled() && viewZ() === -1, 8000, "the view to follow the unit to -1").catch(() => {});
            const followMs = performance.now() - f0;
            await t.waitFrames(5);
            const centreX = $gameMap.displayX() + $gameMap.screenTileX() / 2, centreY = $gameMap.displayY() + $gameMap.screenTileY() / 2;
            const onIt = Math.abs(centreX - (F.x + 0.5)) <= 1.5 && Math.abs(centreY - (F.y + 0.5)) <= 1.5;
            const evF = W.eventOf(F.id);
            Levels.follow(null);
            // An unfollowed unit changing level never moves the view.
            const B2 = B;
            const zBefore = viewZ();
            W.moveUnitToLevel(B2, 1, B2.x, B2.y);
            await t.waitFrames(30);
            const stayed = viewZ() === zBefore && !pending;
            W.moveUnitToLevel(B2, -1, cx + 1, cy);
            t.check("follow_view", moved && viewZ() === -1 && onIt && !!evF && stayed,
                `followed TEST unit moved to -1 by World.moveUnitToLevel (${moved}): view ${viewZ()} after ${followMs.toFixed(0)} ms, view centre (${centreX.toFixed(1)},${centreY.toFixed(1)}) vs unit (${F.x},${F.y}) ${onIt ? "centred" : "NOT CENTRED"}, its event ${evF ? "drawn" : "MISSING"}; ` +
                `an unfollowed unit moved -1 -> +1: view ${stayed ? "stayed" : "MOVED"} on ${zBefore}${note}`);
            setView(0);
            await waitSettled("the view to come back to the ground").catch(() => {});
            await t.waitFrames(3);
        }

        //---------------------------------------------------------------- offscreen_state
        {
            // A walker on -1 in an L-shaped corridor (the straight line to its goal crosses rock), sent while the ground is on
            // screen; a ground walker sent round a wall while -1 is on screen. Neither may stand on a cell it can't walk.
            const lx = cx + 14, ly = cy - 12; // corridor corner, well clear of the -1 pocket
            const corridor = [];
            for (let i = 0; i <= 8; i++) corridor.push({ x: lx - 8 + i, y: ly });      // west arm, east to the corner
            for (let i = 1; i <= 8; i++) corridor.push({ x: lx, y: ly + i });          // south arm, down from the corner
            for (const c of corridor) {
                shape(c.x, c.y, -1, "floor", { constructed: false, material: "stone" });
                if (O && O.atIn && O.atIn({ x: area.x, y: area.y, z: -1 }, c.x, c.y)) O.setIn({ x: area.x, y: area.y, z: -1 }, c.x, c.y, null);
            }
            // Rock round the corridor (the baseline may have pockets there).
            const corridorSet = new Set(corridor.map(c => c.y * size + c.x));
            for (let y = ly - 1; y <= ly + 9; y++) for (let x = lx - 9; x <= lx + 1; x++) if (!corridorSet.has(y * size + x) && Levels.shapeAt({ area, x, y, z: -1 }) !== "solid") shape(x, y, -1, "solid");
            const Cu = W.addUnit({ name: "TEST_lv_tunneler", image: img, area, x: lx - 8, y: ly, z: -1, exact: true, data: { kind: "test", needs: { hunger: 42 } } });
            made.units.push(Cu);
            const goalC = { x: lx, y: ly + 8 };
            const steps = corridor.length - 1;
            let onRock = 0, stepsSeen = 0, last = `${Cu.x},${Cu.y}`;
            const f0 = W._frame;
            W.sendUnit(Cu.id, { area, x: goalC.x, y: goalC.y, z: -1 });
            const onScreenBelow = !!W.eventOf(Cu.id);
            await t.waitUntil(() => {
                const s = Levels.shapeAt({ area, x: Cu.x, y: Cu.y, z: -1 });
                if (s !== "floor") onRock++;
                const k = `${Cu.x},${Cu.y}`;
                if (k !== last) { stepsSeen++; last = k; }
                return !Cu.goal;
            }, 40000, "the -1 walker to arrive").catch(() => {});
            const framesC = W._frame - f0;
            const arrivedC = Cu.x === goalC.x && Cu.y === goalC.y && zOf(Cu) === -1;
            // A ground walker D round a 5-cell wall of objects, while -1 is on screen.
            const wallType = O.typeId("wall_stone") || O.typeId("wall_wood") || (objType && objType.typeId);
            // Inside the clear patch: from its south-west corner to its south-east corner, with a wall across the south rows.
            const wallCells = [];
            for (let i = 0; i <= 2; i++) {
                const wx = cx + 1, wy = cy + i;
                if (!W.getObject(area.x, area.y, wx, wy) && !W.standerAt(area.x, area.y, wx, wy)) {
                    W.setObject(area.x, area.y, wx, wy, wallType);
                    made.objects.push({ lv: { x: area.x, y: area.y, z: 0 }, x: wx, y: wy });
                    wallCells.push(`${wx},${wy}`);
                }
            }
            const D = W.addUnit({ name: "TEST_lv_walker", image: img, area, x: cx - 3, y: cy + 2, z: 0, exact: true, data: { kind: "test", needs: { thirst: 17 } } });
            made.units.push(D);
            setView(-1);
            await waitSettled("the view to reach -1 for the ground walker").catch(() => {});
            const goalD = { x: cx + 3, y: cy + 2 };
            let onWall = 0, dSteps = 0, lastD = `${D.x},${D.y}`;
            const offD = !W.eventOf(D.id);
            // Nothing scans the levels per frame: no level build, no baseline generation, few cell reads while this runs.
            const builds0 = stats.generated, reads0 = stats.shapeReads, frames0 = W._frame;
            const realBuild = W.buildArea, realUpdate = W.update;
            let buildsDuring = 0, updN = 0, updMs = 0, updMax = 0;
            W.buildArea = function() { buildsDuring++; return realBuild.apply(this, arguments); };
            W.update = function() {
                const u0 = performance.now();
                realUpdate.apply(this, arguments);
                const ms = performance.now() - u0;
                updN++;
                updMs += ms;
                if (ms > updMax) updMax = ms;
            };
            W.sendUnit(D.id, { area, x: goalD.x, y: goalD.y });
            await t.waitUntil(() => {
                if (wallCells.includes(`${D.x},${D.y}`) || !W.walkable(area.x, area.y, D.x, D.y)) onWall++;
                const k = `${D.x},${D.y}`;
                if (k !== lastD) { dSteps++; lastD = k; }
                return !D.goal;
            }, 40000, "the ground walker to arrive off screen").catch(() => {});
            W.buildArea = realBuild;
            W.update = realUpdate;
            const offUnits = W.units().filter(u => zOf(u) === 0).length;
            const framesD = W._frame - frames0;
            const readsPerFrame = (stats.shapeReads - reads0) / Math.max(1, framesD);
            const arrivedD = D.x === goalD.x && D.y === goalD.y;
            // Back on the ground: state kept (ids, data), events recreated for the ground units, none on a blocked cell.
            const groundIds = W.unitsInArea(area.x, area.y, 0).map(u => u.id);
            setView(0);
            await waitSettled("the view to come back to the ground after the walk").catch(() => {});
            await t.waitFrames(3);
            const groundIdsAfter = W.unitsInArea(area.x, area.y, 0).map(u => u.id);
            const missingEvents = groundIdsAfter.filter(id => !$gameMap._events[W.eventIdOf(id)]).length;
            const badCells = W.unitsInArea(area.x, area.y, 0).filter(u => !(u.data && u.data.through) && !W.walkable(area.x, area.y, u.x, u.y, { unit: u })).map(u => `${u.name}@${u.x},${u.y}`);
            const kept = Cu.data.needs.hunger === 42 && D.data.needs.thirst === 17 && zOf(Cu) === -1 && zOf(D) === 0;
            t.check("offscreen_state",
                !onScreenBelow && arrivedC && onRock === 0 && stepsSeen >= steps && offD && arrivedD && onWall === 0 && dSteps > 5 && kept &&
                buildsDuring === 0 && stats.generated === builds0 && readsPerFrame <= 64 && missingEvents === 0 && badCells.length === 0 && groundIds.every(id => groundIdsAfter.includes(id)),
                `-1 walker in an L corridor of ${corridor.length} cells (the straight line crosses rock), ground on screen (its event ${onScreenBelow ? "EXISTS" : "none"}): ` +
                `${arrivedC ? "arrived" : `NOT ARRIVED at (${Cu.x},${Cu.y}), goal ${Cu.goal ? "still set" : "dropped"}`} after ${stepsSeen} steps (${steps} needed) in ${framesC} frames; cells off the corridor stood on: ${onRock}; ` +
                `ground walker round a wall of ${wallCells.length} pieces with -1 on screen (its event ${offD ? "none" : "EXISTS"}): ${arrivedD ? "arrived" : `NOT ARRIVED at (${D.x},${D.y})`} after ${dSteps} steps in ${framesD} frames; blocked cells stood on: ${onWall}; ` +
                `state kept (needs, level): ${kept}; while it walked (-1 on screen, ${offUnits} ground units off screen): UF.World.update ${updN ? (updMs / updN).toFixed(3) : "?"} ms average, ${updMax.toFixed(2)} ms worst over ${updN} map updates (measured, not judged), level builds ${buildsDuring}, baselines generated ${stats.generated - builds0}, cell reads ${(stats.shapeReads - reads0)} (${readsPerFrame.toFixed(2)} per frame); ` +
                `back on the ground: ${groundIdsAfter.length} ground units (${groundIds.filter(id => !groundIdsAfter.includes(id)).length} of the ${groundIds.length} before missing), ${missingEvents} without an event, on blocked cells: ${badCells.length ? badCells.slice(0, 5).join(", ") : "none"}${note}`);
        }

        //---------------------------------------------------------------- persistence (a real save and load of the running game)
        {
            // One shape change (the ground: a tile change), one object, one item and one unit on each of the five levels.
            const fx = {};
            let fi = 0;
            for (const z of LEVELS) {
                const x = cx - 3 + fi, y = cy - 2; // along the patch's north row
                fi++;
                const lv = { x: area.x, y: area.y, z };
                if (z === 0) {
                    const t0 = W.getTile(area.x, area.y, x, y + 4, 0);
                    fx[z] = { tileCell: { x, y: y + 4 }, tileWas: t0, tileNow: t0 === Tilemap.TILE_ID_A2 ? Tilemap.TILE_ID_A2 + 48 : Tilemap.TILE_ID_A2 };
                    W.setTile(area.x, area.y, x, y + 4, 0, fx[z].tileNow);
                } else {
                    shape(x, y, z, "floor", { constructed: true, material: z > 0 ? "wood" : "stone" });
                    shape(x, y + 1, z, "floor", { constructed: true, material: z > 0 ? "wood" : "stone" });
                    shape(x, y + 2, z, "floor", { constructed: true, material: z > 0 ? "wood" : "stone" });
                }
                fx[z] = Object.assign(fx[z] || {}, { cell: { x, y } });
                // The object goes on the first nearby cell nobody stands on (a colonist or an animal may be walking by: V68 refuses it).
                for (const [ox, oy] of [[x, y + 1], [x, y + 3], [x, y - 1], [x, y + 4], [x, y - 2]]) {
                    if (W.standerAt(area.x, area.y, ox, oy, z) || W.getObject(area.x, area.y, ox, oy, z)) continue;
                    if (O.setIn(lv, ox, oy, objType.id)) {
                        made.objects.push({ lv, x: ox, y: oy });
                        fx[z] = Object.assign(fx[z] || {}, { obj: { x: ox, y: oy } });
                        break;
                    }
                }
                const it = I.drop(lv, x, y + 2, itemType.id, 1)[0];
                fx[z].item = it ? it.id : null;
                const u = W.addUnit({ name: `TEST_lv_keep${z}`, image: img, area, x, y, z, exact: true, data: { kind: "test", keep: z } });
                fx[z].unit = u.id;
                made.units.push(u);
            }
            const contentsNow = DataManager.makeSaveContents();
            const json = JsonEx.stringify(contentsNow);
            const zipped = typeof pako !== "undefined" ? pako.deflate(json, { to: "string", level: 1 }).length : -1;
            const saveBytes = json.length;
            const copy = JsonEx.parse(json);
            if (provoked("persistence") && copy.ufWorld.levels["-1"]) copy.ufWorld.levels["-1"].cells = {};
            if (provoked("save_size")) W.state._provokedPadding = "x".repeat(4 * 1024 * 1024);
            const sizeNow = provoked("save_size") ? JsonEx.stringify(DataManager.makeSaveContents()).length : saveBytes;
            if (provoked("save_size")) delete W.state._provokedPadding;
            DataManager.createGameObjects();
            DataManager.extractSaveContents(copy);
            SceneManager.goto(Scene_Map);
            await t.waitUntil(() => settled() && SceneManager._scene._spriteset && $gameMap.mapId() === W.areaMapId(area.x, area.y, 0), 30000, "the reloaded game's map").catch(() => {});
            await t.waitFrames(5);
            const W2 = World(), st2 = W2.state;
            const per = [];
            let ok = true;
            for (const z of LEVELS) {
                const f = fx[z], lv = { x: area.x, y: area.y, z };
                const u = W2.unit(f.unit);
                const others = LEVELS.filter(o => o !== z);
                const unitOk = !!u && zOf(u) === z && u.x === f.cell.x && u.y === f.cell.y && u.data.keep === z;
                const oc = f.obj;
                const objOk = !!oc && O.typeIdIn(lv, oc.x, oc.y) === objType.typeId && others.every(o => O.typeIdIn({ x: area.x, y: area.y, z: o }, oc.x, oc.y) !== objType.typeId || (fx[o].obj && fx[o].obj.x === oc.x && fx[o].obj.y === oc.y));
                const itemsHere = I.atIn(lv, f.cell.x, f.cell.y + 2).map(i => i.id);
                const itemOk = !!f.item && itemsHere.includes(f.item) && others.every(o => !I.atIn({ x: area.x, y: area.y, z: o }, f.cell.x, f.cell.y + 2).some(i => i.id === f.item));
                let shapeOk;
                if (z === 0) shapeOk = W2.getTile(area.x, area.y, f.tileCell.x, f.tileCell.y, 0) === f.tileNow;
                else shapeOk = Levels.shapeAt({ area, x: f.cell.x, y: f.cell.y, z }) === "floor" && Levels.cellAt({ area, x: f.cell.x, y: f.cell.y, z }).constructed === true;
                if (!(unitOk && objOk && itemOk && shapeOk)) ok = false;
                per.push(`${LABELS[z]}: ${z === 0 ? "tile" : "shape"} ${shapeOk ? "kept" : "LOST"}, object ${objOk ? "kept" : "LOST/LEAKED"}, item ${itemOk ? "kept" : "LOST/LEAKED"}, unit ${unitOk ? "kept" : "LOST/MOVED"}`);
            }
            const regen = LEVELS.map(z => ({ z, saved: st2.levels[String(z)].checksum, now: z === 0 ? checksumOf(0) : checksumOf(z, st2.seed, levelGen(st2, z)) }));
            const sumsOk = regen.every(r => r.saved === r.now && r.now !== "n/a");
            const other = checksumOf(-1, st2.seed + 1, levelGen(st2, -1));
            t.check("persistence", ok && sumsOk && other !== regen.find(r => r.z === -1).now && st2.version === 4,
                `saved (${saveBytes} characters of JSON, ${zipped} zipped) and loaded through DataManager.extractSaveContents, then a new Scene_Map: ${per.join("; ")}; ` +
                `baselines regenerated from seed ${st2.seed}: ${regen.map(r => `${r.z} ${r.saved === r.now ? "same" : `DIFFERENT (${r.saved}/${r.now})`}`).join(", ")}; seed + 1 gives -1 checksum ${other} (${other !== regen.find(r => r.z === -1).now ? "different" : "SAME"})${note}`);
            t.check("save_size", sizeNow <= 3 * 1024 * 1024 && saveBytes > 0,
                `save contents ${sizeNow} characters of JSON (V50 limit 3 MB = ${3 * 1024 * 1024}), ${zipped} zipped (RMMZ level 1), measured with JsonEx.stringify(DataManager.makeSaveContents()); ` +
                `${W2.units().length} units, level changes ${LEVELS.map(z => `${z}: ${Object.values(st2.levels[String(z)].cells || {}).reduce((n, c) => n + Object.keys(c).length, 0)}`).join(", ")}${note}`);
            // Clean up the fixtures (in the reloaded world).
            for (const u of made.units) if (W2.unit(u.id)) W2.removeUnit(u.id);
            for (const o of made.objects) O.setIn(o.lv, o.x, o.y, null);
            for (const o of made.counterObjects) O.setIn(o.lv, o.x, o.y, o.type);
            for (const it of made.items) if (it) I.remove(it.id);
            for (const z of LEVELS) if (fx[z].item) I.remove(fx[z].item);
            if (fx[0] && fx[0].tileCell) W2.setTile(area.x, area.y, fx[0].tileCell.x, fx[0].tileCell.y, 0, fx[0].tileWas);
            for (const s of made.shapes.reverse()) {
                const ch = changesOf(st2, s.z, area.x, area.y, false);
                if (ch) delete ch[s.y * size + s.x];
            }
        }

        //---------------------------------------------------------------- switch_time (measured, sane bound)
        {
            const d = switchDown, b = switchBack;
            t.check("switch_time", !!d && !!b && d.ms < 5000 && b.ms < 5000,
                `ground -> -1 (first build of -1): ${d ? `${d.ms.toFixed(0)} ms, ${d.frames} map frames, reused build ${d.reused}` : "NOT MEASURED"}; -1 -> ground (the ground build kept): ${b ? `${b.ms.toFixed(0)} ms, ${b.frames} frames, reused build ${b.reused}` : "NOT MEASURED"}; ` +
                `measured from the key frame to Scene_Map.start with performance.now() (${wallDown.toFixed(0)} ms wall time to settle for the first); bound 5000 ms (sanity only; V50 map build 1500 ms is the target); ` +
                `runtime sheets composed at boot in ${composed.ms.toFixed(0)} ms after ${composed.loadMs !== undefined ? composed.loadMs.toFixed(0) : "?"} ms of loading${composed.failed.length ? `; flat looks: ${composed.failed.join(", ")}` : ""}${note}`);
        }
        if (C) C.setLevel(level0);

        //---------------------------------------------------------------- surface_migration (a real pre-V80 save, loaded in place; last: it replaces the game)
        {
            const fs = require("fs"), path = require("path");
            const base = nw.__dirname || process.cwd();
            const file = path.join(base, "test_fixtures", "vertical_pre_v80.rmmzsave");
            const metaFile = path.join(base, "test_fixtures", "vertical_pre_v80.meta.json");
            if (!fs.existsSync(file) || !fs.existsSync(metaFile)) {
                t.check("surface_migration", false, `fixture missing: ${file} (a save made before V80, with its .meta.json)`);
            } else {
                const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
                const json = pako.inflate(fs.readFileSync(file, { encoding: "utf8" }), { to: "string" });
                const pristine = JsonEx.parse(json), contents = JsonEx.parse(json);
                const pw = pristine.ufWorld;
                DataManager.createGameObjects();
                DataManager.extractSaveContents(contents);
                DataManager.correctDataErrors();
                const W2 = World(), st = W2.state;
                // Straight after the load, before the world runs: every record where it was, at z 0.
                const probs = [];
                for (const id in pw.units) {
                    const a = pw.units[id], b = st.units[id];
                    if (!b) { probs.push(`unit ${id} missing`); continue; }
                    if (b.area.x !== a.area.x || b.area.y !== a.area.y || b.x !== a.x || b.y !== a.y || b.z !== 0) probs.push(`unit ${id} ${a.x},${a.y} -> ${b.x},${b.y} z ${b.z}`);
                }
                const pItems = (pw.items && pw.items.byId) || {};
                for (const id in pItems) {
                    const a = pItems[id], b = st.items.byId[id];
                    if (!b || JSON.stringify(a.area) !== JSON.stringify(b.area) || a.x !== b.x || a.y !== b.y || a.holder !== b.holder || b.z !== 0) probs.push(`item ${id}`);
                }
                const pJobs = (pw.jobs && pw.jobs.list) || [];
                pJobs.forEach((a, i) => {
                    const b = st.jobs.list[i];
                    if (!b || b.id !== a.id || b.target.x !== a.target.x || b.target.y !== a.target.y || b.target.z !== 0 || (b.stand && b.stand.z !== 0)) probs.push(`job ${a.id}`);
                });
                const same = k => JSON.stringify(pw[k] || null) === JSON.stringify(st[k] || null);
                const keysSame = ["diffs", "objectDiffs", "fog", "seed", "nextUnitId", "startArea"].filter(k => !same(k));
                const zAll = Object.values(st.units).every(u => u.z === 0) && Object.values((st.items && st.items.byId) || {}).every(i => i.z === 0) && (st.regrow || []).every(e => e.z === 0);
                const hash = arr => { let h = 2166136261 >>> 0; for (let i = 0; i < arr.length; i++) { h ^= (arr[i] | 0) & 0xffff; h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
                const build = W2.buildArea(0, 0, 0);
                const tilesHash = hash(build.data), objHash = hash(build.ufObjects);
                const levelsOk = JSON.stringify(Object.keys(st.levels).map(Number).sort((a, b) => a - b)) === JSON.stringify(LEVELS) && st.version === 4 && (st.migrations || []).length === 1 && st.migrations[0].from === (pw.version | 0);
                SceneManager.goto(Scene_Map);
                await t.waitUntil(() => settled() && SceneManager._scene._spriteset, 30000, "the pre-V80 save's map").catch(() => {});
                await t.waitFrames(10);
                t.screenshot("pre_v80_loaded");
                const mapOk = $gameMap.mapId() === meta.mapId && W2.viewLevel() && W2.viewLevel().z === 0 && Levels.plateText() === "Ground";
                t.check("surface_migration",
                    probs.length === 0 && keysSame.length === 0 && zAll && tilesHash === meta.tiles && objHash === meta.objects && levelsOk && mapOk && pw.version === meta.version && !pw.levels,
                    `fixture ${path.basename(file)} (made ${meta.made} by the pre-V80 build, world version ${pw.version}, seed ${pw.seed}): ${Object.keys(pw.units).length} units, ${Object.keys(pItems).length} items, ${pJobs.length} jobs, ${(pw.regrow || []).length} regrow entries; ` +
                    `after the load: ${probs.length ? `${probs.length} moved or missing: ${probs.slice(0, 5).join("; ")}` : "every unit, item and job where it was, all at z 0"}; ` +
                    `diffs/objectDiffs/fog/seed ${keysSame.length ? `CHANGED: ${keysSame.join(", ")}` : "unchanged"}; ground rebuilt from the migrated state: tiles ${tilesHash} (pre-V80 build ${meta.tiles}), objects ${objHash} (${meta.objects}); ` +
                    `levels ${JSON.stringify(Object.keys(st.levels))}, version ${st.version}, migration record ${JSON.stringify(st.migrations && st.migrations[0])}; map ${$gameMap.mapId()} (saved on ${meta.mapId}), plate "${Levels.plateText()}"${note}`);
            }
        }
        await t.waitFrames(30);
        t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : `none during the vertical checks${note}`);
    }
})();
