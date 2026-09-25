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
    // A save keeps its baseline generator version; versions 1 to 4 are preserved below. Generator 5 (DEUS-TSK-FABLE-19B)
    // is generator 4 plus the natural cuts and caves carved into the strata of an area's five levels at once.
    const GEN = 5;
    const PRE_CUT_GEN = 4;                // a pre-V80 save migrates to the generator it had before 19B (no cuts under its settlement)
    const KNOWN_GENS = Object.freeze([1, 2, 3, 4, 5]);
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
        // Both harness flags: run_tests.js starts nw.exe with --deus-test (since the DEUS rename), older runs --uf-test.
        if (!argv.some(a => /^--(uf|deus)-test(=|$)/.test(String(a)))) return [];
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
    const stats = { generated: 0, genMs: 0, lastGenMs: 0, shapeReads: 0, switches: 0, lastSwitch: null, migrations: 0, checksumMismatches: 0, composeMs: 0,
        strataWrites: 0, strataDamaged: 0, strataDestroyed: 0, strataMigrations: 0, strataSchemaErrors: 0, derives: 0, gridBuilds: 0, featureMs: 0 };

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

        // Within starting settlement valley, kit objects and pond radius (r <= 30), always datum S = 0
        if (distToCamp <= 30) return 0;

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

        // Smooth transition ring near camp (30 < r < 36)
        if (distToCamp < 36) {
            const blend = (distToCamp - 30) / 6;
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

    // One level's baseline. Generator 5 and later generate the five levels of the area together (generateVolume: the
    // natural cuts and caves span levels) and hand out this level's.
    function generateBaseline(seed, gen, z, ax, ay, size) {
        if (gen >= FEATURE_GEN) return volumeOf(seed, gen, ax, ay, size)[z + 2];
        const t0 = performance.now();
        const b = finishBaseline(levelArrays(seed, gen, z, ax, ay, size), z, gen, size);
        const ms = performance.now() - t0;
        stats.generated++;
        stats.genMs += ms;
        stats.lastGenMs = ms;
        return b;
    }

    // The generator's working arrays of one level (one shape, material and water code per cell, and its extras).
    function levelArrays(seed, gen, z, ax, ay, size) {
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
                            const corridor = m.corridor = [];   // the cells walked (natural cuts and caves keep clear of them)
                            while (curX !== targetX || curY !== targetY) {
                                if (curX < targetX) curX++;
                                else if (curX > targetX) curX--;
                                else if (curY < targetY) curY++;
                                else if (curY > targetY) curY--;
                                const ci = curY * size + curX;
                                corridor.push(ci);
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
                const S_grid = surfaceGridFor(seed, ax, ay, size, d, cl);
                for (let y = 0; y < size; y++) {
                    for (let x = 0; x < size; x++) {
                        const i = y * size + x;
                        const S = S_grid[i];

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
                    extra = { cliffCaves: cliffMouths, surface: S_grid };
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
                } else {
                    extra = { surface: S_grid };
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
        return { shape, material, extra };
    }

    // A level's baseline from its working arrays: only the strata are kept (toStrata converts the arrays; they are dropped).
    function finishBaseline(a, z, gen, size) {
        const b = Object.assign({ z }, a.extra || {});
        const water = b.water || null;
        delete b.water;
        if (z === 0 && gen < 4) b.legacyGround = true;
        toStrata(b, a.shape, a.material, water, z, size);
        return b;
    }

    // The surface height S of every cell of an area, computed once and shared by the ground, +1 and +2 baselines
    // (surfaceElevation is the same function of the seed and the cell for all three).
    const surfaceGrids = new Map();
    function surfaceGridFor(seed, ax, ay, size, d, cl) {
        const key = `${seed}:${ax},${ay}:${size}:${d.width}x${d.height}`;
        const e = surfaceGrids.get(key);
        if (e && e.cl === cl) return e.grid;
        const grid = new Int8Array(size * size);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) grid[y * size + x] = surfaceElevation(seed, ax * size + x, ay * size + y, size, d, cl);
        surfaceGrids.set(key, { cl, grid });
        while (surfaceGrids.size > 4) surfaceGrids.delete(surfaceGrids.keys().next().value);
        return grid;
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
    function shapeGrid(z, ax, ay) {
        const W = World(), st = W && W.state;
        if (!st || !isLevel(z) || !W.inWorld(ax, ay, z)) return null;
        if (z === 0 && levelGen(st, 0) < 4) return null;
        if (!baseline(z, ax, ay)) return null;
        const grid = derivedGrid(z, ax, ay, new Uint8Array(st.size * st.size));
        for (let i = 0; i < grid.length; i++) grid[i] &= 7;
        return grid;
    }

    function checksumOf(z, seed, gen) {
        const W = World(), st = W.state;
        const g = gen || (seed === undefined ? levelGen(st, z) : GEN);
        const baseOfArea = (ax, ay) => seed === undefined ? baseline(z, ax, ay, undefined, gen) : generateBaseline(seed, gen || GEN, z, ax, ay, st.size);
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
            // Generator 5: the ground's strata too (its natural cuts and caves are strata, not climate cells).
            if (g >= FEATURE_GEN) for (let ay = 0; ay < st.areasY; ay++) for (let ax = 0; ax < st.areasX; ax++) h = strataHash(h, baseOfArea(ax, ay));
            return hex(h);
        }
        for (let ay = 0; ay < st.areasY; ay++) for (let ax = 0; ax < st.areasX; ax++) {
            // Generator 5: the strata bytes themselves (partial fills, caves and caps don't show in the legacy codes).
            if (g >= FEATURE_GEN) { h = strataHash(h, baseOfArea(ax, ay)); continue; }
            // The generator's codes, read back from the strata (legacyViews): the same bytes as before the strata, so a
            // save's checksum from New Game still matches.
            const v = legacyViews(baseOfArea(ax, ay));
            h = fnvBytes(h, v.shape);
            h = fnvBytes(h, v.material);
            if (v.biome) h = fnvBytes(h, v.biome);
            if (v.water) h = fnvBytes(h, v.water);
        }
        return hex(h);
    }

    // FNV-1a over a baseline's strata bytes, connectors, biome codes and caps (the checksum of generator 5 and later).
    function strataHash(h, b) {
        h = fnvBytes(h, b.strata.m);
        h = fnvBytes(h, b.conn);
        if (b.biome) h = fnvBytes(h, b.biome);
        if (b.caps && b.caps.size) {
            const keys = [...b.caps.keys()].sort((p, q) => p - q), buf = new Uint8Array(keys.length * 6);
            keys.forEach((i, k) => {
                const c = b.caps.get(i);
                buf[k * 6] = i & 255; buf[k * 6 + 1] = (i >> 8) & 255; buf[k * 6 + 2] = (i >> 16) & 255;
                buf[k * 6 + 3] = c & 255; buf[k * 6 + 4] = (c >> 8) & 255; buf[k * 6 + 5] = (c >> 16) & 255;
            });
            h = fnvBytes(h, buf);
        }
        return h;
    }

    //-------------------------------------------------------------------------
    // Strata (DEUS-TSK-FABLE-19A): the one geometry authority. Every 5 ft cell of every level is five 1 ft strata,
    // S0 (bottom) .. S4 (top). A stratum is two bytes: its material (id in the low 6 bits, 0 = air; 0x80 = constructed)
    // and its HP (0..255 = 0..100 % of the material's max HP). A level's seeded baseline keeps the material bytes only
    // (Uint8Array size*size*5; an unchanged solid stratum is at full HP by definition) and a 4-bit connector code per
    // cell (ramp, stairs). A changed cell is an 11-byte record [connector, m0..m4, hp0..hp4], saved as 22 hex digits in
    // UF.World.state.levels[z].strata["ax,ay"][i]. The shape codes the rest of the game reads (solid, floor, open,
    // ramp, stairs) are derived from the strata here and nowhere else. docs/systems/UF_Levels.md, section Strata.

    const STRATA = 5, CELL_FT = 5;
    const M_AIR = 0, M_STONE = 1, M_SOIL = 2, M_WOOD = 3, M_WATER = 4, M_LAVA = 5;
    const M_BUILT = 0x80, M_ID = 0x3f;
    const STRATA_SCHEMA = 1;
    const REC = 11, REC_M = 1, REC_HP = 6;       // a changed cell: [connector, m0..m4, hp0..hp4]
    const LEVEL_KEY = ["-2", "-1", "0", "1", "2"];
    const AREA_STRIDE = 4096;                    // area index in the change maps: ax + ay * 4096
    // Material table. Diagnostic values, not balanced: maxHP in HP points; resist multiplies incoming damage by damage
    // type (a type not listed: 1); support is what a full-HP stratum carries (0..1); debris is what a destroyed stratum
    // leaves, reported in levels:strataDestroyed (no item drops in 19A).
    const STRATA_MATERIALS = Object.freeze([
        { id: M_AIR, key: "air", solid: false, fluid: false, maxHP: 0, support: 0, debris: null, resist: {} },
        { id: M_STONE, key: "stone", solid: true, fluid: false, maxHP: 120, support: 1, debris: "rubble", resist: { impact: 0.5, dig: 1, blast: 1, fire: 0.1 } },
        { id: M_SOIL, key: "soil", solid: true, fluid: false, maxHP: 40, support: 0.5, debris: "loose_earth", resist: { impact: 1, dig: 2, blast: 1.5, fire: 0.2 } },
        { id: M_WOOD, key: "wood", solid: true, fluid: false, maxHP: 60, support: 0.7, debris: "broken_timber", resist: { impact: 1, dig: 1, blast: 1.2, fire: 2 } },
        { id: M_WATER, key: "water", solid: false, fluid: true, maxHP: 0, support: 0, debris: null, resist: {} },
        { id: M_LAVA, key: "lava", solid: false, fluid: true, maxHP: 0, support: 0, debris: null, resist: {} }
    ].map(m => Object.freeze(Object.assign(m, { resist: Object.freeze(m.resist) }))));
    const MATERIAL_ID = new Map(STRATA_MATERIALS.map(m => [m.key, m.id]));
    const LEGACY_TO_M = [M_STONE, M_SOIL, M_WOOD];     // legacy material code (stone, soil, wood) -> stratum material
    // Lookups by the whole material byte (id and constructed flag): solid, fluid, legacy material code.
    const SOLID_B = new Uint8Array(256), FLUID_B = new Uint8Array(256), LEGACY_B = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
        const m = (v & 0x40) === 0 ? STRATA_MATERIALS[v & M_ID] : null;
        SOLID_B[v] = m && m.solid ? 1 : 0;
        FLUID_B[v] = m && m.fluid && !(v & M_BUILT) ? 1 : 0;
        LEGACY_B[v] = (v & M_ID) === M_SOIL ? SOIL : (v & M_ID) === M_WOOD ? WOOD : STONE;
    }
    // A material byte a stratum may hold: air is exactly 0, fluids carry no constructed flag, the id is known.
    const validMaterialByte = v => Number.isInteger(v) && v >= 0 && v <= 255 && (v === 0 || SOLID_B[v] === 1 || FLUID_B[v] === 1);
    const HEIGHT_STATES = Object.freeze(["HEIGHT_0_OF_5", "HEIGHT_1_OF_5", "HEIGHT_2_OF_5", "HEIGHT_3_OF_5", "HEIGHT_4_OF_5", "HEIGHT_5_OF_5"]);
    const FLUID_STATES = Object.freeze(["FLUID_0_OF_5", "FLUID_1_OF_5", "FLUID_2_OF_5", "FLUID_3_OF_5", "FLUID_4_OF_5", "FLUID_5_OF_5"]);
    // DEUS_Fluid keeps its 0..7 depth scale (DEPTH_MAX 7); these are the conversions (round(d * 5 / 7), round(k * 7 / 5)).
    const FLUID_TO_STRATA = Object.freeze([0, 1, 1, 2, 3, 4, 4, 5]);
    const STRATA_TO_FLUID = Object.freeze([0, 1, 3, 4, 6, 7]);
    // Bits of getStrataFluidPassage: capacity 0..7 in DEUS_Fluid depth units, then the open faces.
    const FLUID_PASS = Object.freeze({ CAPACITY_MASK: 7, DOWN: 8, UP: 16, SIDE: 32 });

    const connOf = (conn, i) => (conn[i >> 1] >> ((i & 1) << 2)) & 15;

    // A baseline's strata from the generator's working arrays (shape, material and water codes per cell), made in the
    // same call and then dropped: solid -> 5 strata, ramp -> S0..S2 and its connector, floor and stairs -> S0 (stairs
    // with their connector), open -> 5 air. A natural pool (water) is fluid in S1..S2: water on -1, lava on -2.
    function toStrata(b, shape, material, water, z, size) {
        const n = size * size, m = new Uint8Array(n * STRATA), conn = new Uint8Array((n + 1) >> 1);
        const fluid = z === -2 ? M_LAVA : M_WATER;
        for (let i = 0; i < n; i++) {
            const s = shape[i], mat = LEGACY_TO_M[material[i]] || M_STONE, o = i * STRATA;
            const fill = s === SOLID ? STRATA : s === RAMP ? 3 : (s === FLOOR || s >= STAIR_UP) ? 1 : 0;
            for (let k = 0; k < fill; k++) m[o + k] = mat;
            if (s >= RAMP && s <= STAIR_BOTH) conn[i >> 1] |= s << ((i & 1) << 2);
            if (water && water[i] && fill < 2) { m[o + 1] = fluid; m[o + 2] = fluid; }
        }
        b.strata = { m, hp: null };    // hp null: every baseline solid stratum is at full HP
        b.conn = conn;
        b.size = size;
        b.hasWater = !!water;
        // Read-only legacy views (b.shape, b.material, b.water: one code per cell, what the generator made), built on
        // the first read and kept: code written before the strata still reads them. Writing into them changes nothing.
        const lazy = (name, which) => Object.defineProperty(b, name, {
            enumerable: true, configurable: true,
            get() {
                const v = new Uint8Array(n);
                standaloneInto(b, which === 0 ? v : null, which === 1 ? v : null, which === 2 ? v : null);
                Object.defineProperty(b, name, { value: v, enumerable: true, configurable: true, writable: true });
                return v;
            }
        });
        lazy("shape", 0);
        lazy("material", 1);
        if (water) lazy("water", 2);
        return b;
    }
    // The generator's codes back from a baseline's strata alone (no cells above or below): exact for every baseline.
    function standaloneInto(b, shapeOut, matOut, waterOut) {
        const m = b.strata.m, conn = b.conn, n = b.size * b.size;
        for (let i = 0; i < n; i++) {
            const o = i * STRATA;
            let fill = 0;
            while (fill < STRATA && SOLID_B[m[o + fill]] === 1) fill++;
            if (shapeOut) { const c = connOf(conn, i); shapeOut[i] = fill === STRATA ? SOLID : c ? c : fill > 0 ? FLOOR : OPEN; }
            if (matOut) matOut[i] = fill > 0 ? LEGACY_B[m[o]] : STONE;
            if (waterOut) waterOut[i] = FLUID_B[m[o]] | FLUID_B[m[o + 1]] | FLUID_B[m[o + 2]] | FLUID_B[m[o + 3]] | FLUID_B[m[o + 4]];
        }
    }
    // Scratch copies of the legacy views for checksums and metrics (reused: never kept, never handed out).
    let scratchViews = null;
    function legacyViews(b) {
        const n = b.size * b.size;
        if (!scratchViews || scratchViews.shape.length !== n) scratchViews = { shape: new Uint8Array(n), material: new Uint8Array(n), water: new Uint8Array(n) };
        standaloneInto(b, scratchViews.shape, scratchViews.material, b.hasWater ? scratchViews.water : null);
        return { shape: scratchViews.shape, material: scratchViews.material, water: b.hasWater ? scratchViews.water : null, biome: b.biome || null };
    }

    //-------------------------------------------------------------------------
    // Reading strata: baseline plus changed cells (no allocation on a read)

    const pack = (shape, constructed, material) => (shape & 7) | (constructed ? 8 : 0) | ((material & 15) << 4);
    const unpack = p => ({ shape: SHAPE_NAMES[p & 7] || "", code: p & 7, constructed: (p & 8) !== 0, material: MATERIALS[p >> 4] || String(p >> 4) });
    const areaKey = (ax, ay) => `${ax},${ay}`;
    const genOf = (st, z) => { const L = st.levels && st.levels[LEVEL_KEY[z + 2]]; return L && L.gen ? L.gen : GEN; };

    // The last baseline read per level (a numeric check instead of baseline()'s string key).
    const baseSlots = [null, null, null, null, null];
    function baseOf(st, z, ax, ay) {
        const s = baseSlots[z + 2], g = genOf(st, z);
        if (s !== null && s.st === st && s.ax === ax && s.ay === ay && s.gen === g && s.seed === st.seed) return s.b;
        const b = baseline(z, ax, ay);
        baseSlots[z + 2] = { st, ax, ay, gen: g, seed: st.seed, b };
        return b;
    }

    // The changed cells, decoded: per level (z + 2) a Map of area index -> Map of cell index -> record. Rebuilt from the
    // save whenever UF.World.state is another object (a load, a New Game). Unreadable saved records are reported and
    // skipped (they stay in the save untouched).
    const HEX = "0123456789abcdef";
    const deltas = { st: null, levels: null, errors: [] };
    function encodeRecord(r) {
        let s = "";
        for (let k = 0; k < REC; k++) s += HEX[r[k] >> 4] + HEX[r[k] & 15];
        return s;
    }
    function decodeRecord(s) {
        if (typeof s !== "string" || s.length !== REC * 2 || !/^[0-9a-fA-F]+$/.test(s)) return null;
        const r = new Uint8Array(REC);
        for (let k = 0; k < REC; k++) r[k] = parseInt(s.substr(k * 2, 2), 16);
        return validRecord(r) ? r : null;
    }
    function validRecord(r) {
        if (r[0] !== 0 && !(r[0] >= RAMP && r[0] <= STAIR_BOTH)) return false;
        for (let k = 0; k < STRATA; k++) {
            if (!validMaterialByte(r[REC_M + k])) return false;
            if (!SOLID_B[r[REC_M + k]] && r[REC_HP + k] !== 0) return false;
        }
        return true;
    }
    const parseAreaKey = k => {
        const m = /^(-?\d+),(-?\d+)$/.exec(String(k));
        return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
    };
    const schemaKnown = st => st.strataSchemaVersion === undefined || st.strataSchemaVersion === STRATA_SCHEMA;
    function deltaLevels(st) {
        if (deltas.st === st) return deltas.levels;
        deltas.st = st;
        deltas.levels = [new Map(), new Map(), new Map(), new Map(), new Map()];
        deltas.errors = [];
        if (!st || !st.levels || !schemaKnown(st)) return deltas.levels;
        const n = st.size * st.size;
        for (let li = 0; li < 5; li++) {
            const L = st.levels[LEVEL_KEY[li]], saved = L && L.strata;
            if (!saved) continue;
            if (typeof saved !== "object" || Array.isArray(saved)) { deltas.errors.push(`level ${LEVEL_KEY[li]}: strata is not an object`); continue; }
            for (const ak in saved) {
                const a = parseAreaKey(ak), cells = saved[ak];
                if (!a || !cells || typeof cells !== "object") { deltas.errors.push(`level ${LEVEL_KEY[li]} area "${ak}"`); continue; }
                let map = null;
                for (const k in cells) {
                    const i = Number(k), r = decodeRecord(cells[k]);
                    if (!Number.isInteger(i) || i < 0 || i >= n || !r) { deltas.errors.push(`level ${LEVEL_KEY[li]} area ${ak} cell ${k}: ${JSON.stringify(cells[k])}`); continue; }
                    if (!map) { map = new Map(); deltas.levels[li].set(a.x + a.y * AREA_STRIDE, map); }
                    map.set(i, r);
                }
            }
        }
        if (deltas.errors.length) {
            stats.strataReadErrors = (stats.strataReadErrors || 0) + deltas.errors.length;
            console.error(`DEUS_Levels: ${deltas.errors.length} saved strata record(s) could not be read and were skipped (left in the save): ${deltas.errors.slice(0, 5).join("; ")}`);
        }
        return deltas.levels;
    }

    // The cell located last: material bytes rdM[rdO..rdO+4], HP bytes rdH[rdHO..] (rdH null: the baseline's full HP),
    // connector rdC. Module-level so a read allocates nothing. slot: which scratch a legacy ground cell uses (0 below,
    // 1 the cell, 2 above), so the three cells of one derivation never share one.
    let rdM = null, rdO = 0, rdH = null, rdHO = 0, rdC = 0;
    const legacyGroundRec = [new Uint8Array(REC), new Uint8Array(REC), new Uint8Array(REC)];
    function locate(st, z, ax, ay, i, slot) {
        const am = deltaLevels(st)[z + 2].get(ax + ay * AREA_STRIDE);
        const r = am !== undefined ? am.get(i) : undefined;
        if (r !== undefined) { rdM = r; rdO = REC_M; rdH = r; rdHO = REC_HP; rdC = r[0]; return; }
        const b = baseOf(st, z, ax, ay);
        if (b.legacyGround) {
            // The ground of a world without its column (generator < 4): its peaks are solid, the rest a floor.
            const G = window.UF.WorldGen, size = st.size;
            const info = G && G.cellInfoLocal ? G.cellInfoLocal(ax, ay, i % size, (i - (i % size)) / size) : null;
            const rec = legacyGroundRec[slot], fill = info && info.peak ? STRATA : 1;
            rec.fill(0);
            for (let k = 0; k < fill; k++) { rec[REC_M + k] = M_STONE; rec[REC_HP + k] = 255; }
            rdM = rec; rdO = REC_M; rdH = rec; rdHO = REC_HP; rdC = 0;
            return;
        }
        rdM = b.strata.m; rdO = i * STRATA; rdH = b.strata.hp; rdHO = rdO; rdC = connOf(b.conn, i);
    }
    const hpAt = k => rdH !== null ? rdH[rdHO + k] : (SOLID_B[rdM[rdO + k]] === 1 ? 255 : 0);
    const fillOf = (m, o) => { let f = 0; while (f < STRATA && SOLID_B[m[o + f]] === 1) f++; return f; };
    const solidMaskOf = (m, o) => SOLID_B[m[o]] | (SOLID_B[m[o + 1]] << 1) | (SOLID_B[m[o + 2]] << 2) | (SOLID_B[m[o + 3]] << 3) | (SOLID_B[m[o + 4]] << 4);
    const fluidCountOf = (m, o) => FLUID_B[m[o]] + FLUID_B[m[o + 1]] + FLUID_B[m[o + 2]] + FLUID_B[m[o + 3]] + FLUID_B[m[o + 4]];

    /**
     * The legacy packed code of a cell, derived from its strata and the cells above and below (the table in
     * docs/systems/UF_Levels.md). fill = solid strata stacked from S0. fill 5: solid. A connector (ramp, stairs): that
     * connector. Otherwise the standing surface is the top of the fill, or with fill 0 the top stratum (S4) of the cell
     * below when it is solid (below -2 there is only lava: no surface). No surface: open. A surface with under 4 strata
     * of headroom (counted on into the cell above; the sky above +2) can't be stood on: solid. Material and the
     * constructed flag come from the stratum stood on.
     */
    function derivePacked(st, ax, ay, i, z) {
        stats.derives++;
        locate(st, z, ax, ay, i, 1);
        const m = rdM, o = rdO, c = rdC;
        let fill = 0;
        while (fill < STRATA && SOLID_B[m[o + fill]] === 1) fill++;
        if (fill === STRATA) return pack(SOLID, (m[o] & M_BUILT) !== 0, LEGACY_B[m[o]]);
        let sup = -1;
        if (fill > 0) sup = m[o + fill - 1];
        else if (z > -2) {
            locate(st, z - 1, ax, ay, i, 0);
            if (SOLID_B[rdM[rdO + 4]] === 1) sup = rdM[rdO + 4];
        }
        if (c !== 0) return sup >= 0 ? pack(c, (sup & M_BUILT) !== 0, LEGACY_B[sup]) : pack(c, false, STONE);
        if (sup < 0) return pack(OPEN, false, STONE);
        let head = 0, s = fill;
        while (s < STRATA && SOLID_B[m[o + s]] === 0) { head++; s++; }
        if (s === STRATA && head < 4) {
            if (z === 2) head = capCode(st, ax, ay, i) !== 0 ? head : STRATA * 2;   // the sky above +2, unless the column is capped
            else {
                locate(st, z + 1, ax, ay, i, 2);
                for (let t = 0; t < STRATA && head < 4 && SOLID_B[rdM[rdO + t]] === 0; t++) head++;
            }
        }
        return pack(head >= 4 ? FLOOR : SOLID, (sup & M_BUILT) !== 0, LEGACY_B[sup]);
    }

    // The derived packed codes of a whole level of an area, kept per world state: a read-only view of the strata, built
    // from them (derivePacked) on first use after a load or a New Game and refreshed by putDelta for the changed cell and
    // the cells above and below it, the only cells whose derivation reads it. 65,536 bytes per level of a 256 x 256 area;
    // the last GRID_KEEP grids are kept. A shape read is one array read; whole-level passes (painting, flood walls, the
    // ground's cliffs) read the grid instead of deriving every cell again.
    const GRID_KEEP = 15;
    const packedGrids = { st: null, map: new Map() };   // (ax + ay * AREA_STRIDE) * 5 + (z + 2) -> Uint8Array
    const gridSlots = [0, 1, 2, 3, 4].map(() => ({ st: null, ai: -1, grid: null }));   // the last grid read per level
    function packedGridOf(st, z, ax, ay) {
        const li = z + 2, ai = ax + ay * AREA_STRIDE, slot = gridSlots[li];
        if (slot.st === st && slot.ai === ai) return slot.grid;
        if (packedGrids.st !== st) { packedGrids.st = st; packedGrids.map.clear(); }
        const key = ai * 5 + li;
        let grid = packedGrids.map.get(key);
        if (grid === undefined) {
            const n = st.size * st.size;
            grid = new Uint8Array(n);
            for (let i = 0; i < n; i++) grid[i] = derivePacked(st, ax, ay, i, z);
            packedGrids.map.set(key, grid);
            stats.gridBuilds++;
            while (packedGrids.map.size > GRID_KEEP) {
                const k0 = packedGrids.map.keys().next().value, g0 = packedGrids.map.get(k0);
                packedGrids.map.delete(k0);
                for (const sl of gridSlots) if (sl.grid === g0) { sl.st = null; sl.ai = -1; sl.grid = null; }
            }
        }
        slot.st = st; slot.ai = ai; slot.grid = grid;
        return grid;
    }
    // After a cell's strata changed: re-derive it and the cells above and below in the grids that exist.
    function refreshPacked(st, z, ax, ay, i) {
        if (packedGrids.st !== st) return;
        const ai = ax + ay * AREA_STRIDE;
        for (let zz = Math.max(-2, z - 1); zz <= Math.min(2, z + 1); zz++) {
            const g = packedGrids.map.get(ai * 5 + zz + 2);
            if (g !== undefined) g[i] = derivePacked(st, ax, ay, i, zz);
        }
    }
    // Every built grid of an area against a fresh derivation of every cell (diagnostics and tests; slow).
    function verifyPackedGrids(ax, ay) {
        const st = World().state, out = { grids: 0, cells: 0, mismatches: 0, examples: [] };
        if (packedGrids.st !== st) return out;
        const ai = ax + ay * AREA_STRIDE, n = st.size * st.size;
        for (let li = 0; li < 5; li++) {
            const g = packedGrids.map.get(ai * 5 + li);
            if (g === undefined) continue;
            out.grids++;
            for (let i = 0; i < n; i++) {
                out.cells++;
                const p = derivePacked(st, ax, ay, i, li - 2);
                if (g[i] !== p) { out.mismatches++; if (out.examples.length < 5) out.examples.push({ z: li - 2, x: i % st.size, y: (i / st.size) | 0, cached: g[i], derived: p }); }
            }
        }
        return out;
    }

    // Packed shape of a cell (0 for outside the world).
    function packedAt(ax, ay, x, y, z) {
        const W = World(), st = W && W.state;
        if (!st || !isLevel(z) || z < -2 || z > 2 || !W.inWorld(ax, ay, z) || x < 0 || y < 0 || x >= st.size || y >= st.size) return 0;
        stats.shapeReads++;
        return packedGridOf(st, z, ax, ay)[y * st.size + x];
    }

    // The packed codes of a whole level of an area (baseline plus changes) into out: a copy of the grid.
    function derivedGrid(z, ax, ay, out) {
        out.set(packedGridOf(World().state, z, ax, ay));
        return out;
    }

    // The cell queries' arguments without allocating: (ref), (area, x, y[, z]) or (ax, ay, x, y, z). Sets q*; false when
    // the cell isn't in the world.
    let qSt = null, qAx = 0, qAy = 0, qX = 0, qY = 0, qZ = 0, qI = 0;
    function cellQuery(a, b, c, d, e) {
        if (typeof a === "number") { qAx = a; qAy = b; qX = c; qY = d; qZ = e; }
        else if (a && typeof b === "number") { qAx = a.x | 0; qAy = a.y | 0; qX = b; qY = c; qZ = d !== undefined ? d : (a.z !== undefined ? a.z : 0); }
        else if (a) { qAx = a.area ? a.area.x | 0 : 0; qAy = a.area ? a.area.y | 0 : 0; qX = a.x; qY = a.y; qZ = zOf(a); }
        else return false;
        qX |= 0; qY |= 0;
        const W = World();
        qSt = W && W.state;
        if (!qSt || !Number.isInteger(qZ) || qZ < -2 || qZ > 2 || !W.inWorld(qAx, qAy, qZ) || qX < 0 || qY < 0 || qX >= qSt.size || qY >= qSt.size) return false;
        qI = qY * qSt.size + qX;
        return true;
    }
    // The packed shape of the cell cellQuery just set (no second world lookup; no allocation).
    const queriedPacked = () => { stats.shapeReads++; return packedGridOf(qSt, qZ, qAx, qAy)[qI]; };

    // A copy of a cell's record (writes and damage only).
    function currentRecord(st, z, ax, ay, i) {
        locate(st, z, ax, ay, i, 1);
        const r = new Uint8Array(REC);
        r[0] = rdC;
        for (let k = 0; k < STRATA; k++) { r[REC_M + k] = rdM[rdO + k]; r[REC_HP + k] = hpAt(k); }
        return r;
    }
    function sameAsBaseline(b, i, r) {
        if (b.legacyGround) return false;
        if (connOf(b.conn, i) !== r[0]) return false;
        const m = b.strata.m, o = i * STRATA;
        for (let k = 0; k < STRATA; k++) {
            if (m[o + k] !== r[REC_M + k]) return false;
            const hp = b.strata.hp ? b.strata.hp[o + k] : (SOLID_B[m[o + k]] === 1 ? 255 : 0);
            if (hp !== r[REC_HP + k]) return false;
        }
        return true;
    }
    // Store a cell's record (null: back to the baseline) in the decoded maps and the save.
    function putDelta(st, z, ax, ay, i, r) {
        const lv = deltaLevels(st)[z + 2], ai = ax + ay * AREA_STRIDE, key = areaKey(ax, ay);
        const L = st.levels[LEVEL_KEY[z + 2]];
        if (r === null) {
            const am = lv.get(ai);
            if (am) { am.delete(i); if (!am.size) lv.delete(ai); }
            if (L && L.strata && L.strata[key]) {
                delete L.strata[key][i];
                if (!Object.keys(L.strata[key]).length) delete L.strata[key];
            }
            refreshPacked(st, z, ax, ay, i);
            return;
        }
        let am = lv.get(ai);
        if (!am) { am = new Map(); lv.set(ai, am); }
        am.set(i, r);
        L.strata = L.strata || {};
        (L.strata[key] = L.strata[key] || {})[i] = encodeRecord(r);
        refreshPacked(st, z, ax, ay, i);
    }

    // The strata of a legacy packed cell (migration, setShape): solid -> 5 strata of its material; floor and stairs -> S0;
    // ramp -> S0..S2 (the compatibility step); open -> none; a constructed cell marks its strata. Fluid strata of keep
    // (the cell's record before) stay where the new shape leaves air.
    function recordFromPacked(p, keep) {
        const r = new Uint8Array(REC), s = p & 7;
        const byte = (LEGACY_TO_M[p >> 4] || M_STONE) | ((p & 8) ? M_BUILT : 0);
        const fill = s === SOLID ? STRATA : s === RAMP ? 3 : (s === FLOOR || s >= STAIR_UP) ? 1 : 0;
        for (let k = 0; k < fill; k++) { r[REC_M + k] = byte; r[REC_HP + k] = 255; }
        r[0] = s >= RAMP ? s : 0;
        if (keep) for (let k = fill; k < STRATA; k++) if (FLUID_B[keep[REC_M + k]]) r[REC_M + k] = keep[REC_M + k];
        return r;
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
    // A natural pool: a floor cell below the ground, not constructed, holding fluid strata (water on -1 and lava on -2 in
    // generated levels; isLavaAtRaw tells which). As before the strata, a lava pool also counts here.
    function isNaturalWaterAtRaw(ax, ay, z, x, y) {
        if (z >= 0) return false;
        const p = packedAt(ax, ay, x, y, z);
        if (!p || (p & 7) !== FLOOR || (p & 8)) return false;
        const st = World().state;
        return fluidMaterialAt(st, z, ax, ay, y * st.size + x) !== M_AIR;
    }
    // The material id of a cell's lowest fluid stratum (M_AIR: none). No allocation.
    function fluidMaterialAt(st, z, ax, ay, i) {
        locate(st, z, ax, ay, i, 1);
        for (let k = 0; k < STRATA; k++) if (FLUID_B[rdM[rdO + k]] === 1) return rdM[rdO + k] & M_ID;
        return M_AIR;
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
    function baselineMetrics(base, size) {
        const b = legacyViews(base);   // the generator's codes, read back from the strata
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
    // A cell's biome code and pool (fluid strata now, baseline plus changes: water, and lava when the fluid is lava).
    const biomeReader = (b, size, z, ax, ay) => {
        const st = World().state;
        return (x, y) => {
            if (x < 0 || y < 0 || x >= size || y >= size) return null;
            const fluid = z < 0 ? fluidMaterialAt(st, z, ax, ay, y * size + x) : M_AIR;
            return { code: b.biome ? b.biome[y * size + x] : 0, water: fluid !== M_AIR, lava: fluid === M_LAVA };
        };
    };

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
                if (biomeInfo.water) base = ((biomeInfo.lava !== undefined ? biomeInfo.lava : z === -2) ? "lava_pool" : "freshwater_pool");
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
        const grid = derivedGrid(z, ctx.areaX, ctx.areaY, new Uint8Array(size * size));
        const fluid = new Uint8Array(size * size);
        if (z < 0) for (let i = 0; i < fluid.length; i++) fluid[i] = fluidMaterialAt(st, z, ctx.areaX, ctx.areaY, i);
        const read = (x, y) => (x < 0 || y < 0 || x >= size || y >= size ? 0 : grid[y * size + x]);
        const readBiome = (x, y) => x >= 0 && y >= 0 && x < size && y < size
            ? { code: b.biome ? b.biome[y * size + x] : 0, water: fluid[y * size + x] !== M_AIR, lava: fluid[y * size + x] === M_LAVA } : null;
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

    //-------------------------------------------------------------------------
    // Writing strata: the one writer (setStrata, setShape and the damage API all end in writeCell)

    const standableCode = s => s === FLOOR || s >= RAMP;
    const CONNECTOR_CODE = { ramp: RAMP, stairUp: STAIR_UP, stairDown: STAIR_DOWN, stairBoth: STAIR_BOTH };

    // Store a cell's new record and tell the world. The derived shapes of the cell and of the cells above and below are
    // compared before and after: each level whose derived cell changed is redrawn and gets levels:shapeChanged and
    // levels:cellChanged (the cell itself also when a material or its connector changed; legacyEvents: always, as
    // setShape always did). An HP-only change emits levels:strataChanged alone. refuseIfStanding: undo and refuse when a
    // unit stands on the cell and it can't be stood on after the change.
    function writeCell(st, ax, ay, x, y, z, rec, opts) {
        const W = World(), i = y * st.size + x;
        const before = currentRecord(st, z, ax, ay, i);
        const from = [-1, -1, -1], to = [-1, -1, -1];
        for (let d = -1; d <= 1; d++) if (z + d >= -2 && z + d <= 2 && W.inWorld(ax, ay, z + d)) from[d + 1] = derivePacked(st, ax, ay, i, z + d);
        const b = baseOf(st, z, ax, ay);
        putDelta(st, z, ax, ay, i, sameAsBaseline(b, i, rec) ? null : rec);
        for (let d = -1; d <= 1; d++) if (from[d + 1] >= 0) to[d + 1] = derivePacked(st, ax, ay, i, z + d);
        if (opts.refuseIfStanding && !standableCode(to[1] & 7) && W.standerAt(ax, ay, x, y, z)) {
            putDelta(st, z, ax, ay, i, sameAsBaseline(b, i, before) ? null : before);
            return { ok: false, reason: `a unit stands on (${x},${y}) at level ${z}` };
        }
        let matChanged = before[0] !== rec[0], hpChanged = false;
        for (let k = 0; k < STRATA; k++) {
            if (before[REC_M + k] !== rec[REC_M + k]) matChanged = true;
            if (before[REC_HP + k] !== rec[REC_HP + k]) hpChanged = true;
        }
        if (!matChanged && !hpChanged && !opts.legacyEvents) return { ok: true, changed: false, from: from[1], to: to[1] };
        stats.strataWrites++;
        const cause = opts.cause || "setStrata";
        const ref = { area: { x: ax, y: ay }, x, y, z };
        emit("levels:strataChanged", ref, { before: Array.from(before), after: Array.from(rec), cause });
        for (let d = -1; d <= 1; d++) {
            const a = from[d + 1], c = to[d + 1];
            if (a < 0) continue;
            const here = d === 0, moved = a !== c;
            if (moved || (here && matChanged)) redrawAround(ax, ay, x, y, z + d);
            const r = here ? ref : { area: { x: ax, y: ay }, x, y, z: z + d };
            if (moved || (here && opts.legacyEvents)) emit("levels:shapeChanged", r, unpack(a), unpack(c));
            if (moved || (here && (matChanged || opts.legacyEvents))) notifyWorldCellChanged(r, unpack(a), unpack(c), cause);
        }
        return { ok: true, changed: true, from: from[1], to: to[1] };
    }

    /**
     * Write a cell's five strata: setStrata(ref, { m, hp, connector }, opts). m: five materials, S0 first, as keys
     * ("stone", "soil", "wood", "water", "lava", "air") or bytes (id | 0x80 constructed); opts.constructed marks the solid
     * ones constructed. hp: five 1..255 for solid strata (default 255; air and fluids are 0). connector: 0 / null /
     * "none", a shape name ("ramp", "stairUp", "stairDown", "stairBoth") or its code (default: the cell's own).
     * opts.refuseIfStanding: refused when a unit stands on the cell and it can't be stood on after (VISION V68).
     * Returns true, or false with lastRefusal() saying why.
     */
    function setStrata(ref, spec, opts = {}) {
        const W = World(), st = W && W.state;
        const r = refOf(ref || {});
        const refuse = reason => {
            lastRefusal = { ref: { area: { x: r.ax, y: r.ay }, x: r.x, y: r.y, z: r.z }, strata: spec, reason };
            return false;
        };
        if (!st || !st.levels) return refuse("no levels in this world");
        if (!schemaKnown(st)) return refuse(`this save's strata schema ${JSON.stringify(st.strataSchemaVersion)} is unknown: no changes are written`);
        if (!isLevel(r.z) || r.z < -2 || r.z > 2 || !W.inWorld(r.ax, r.ay, r.z) || r.x < 0 || r.y < 0 || r.x >= st.size || r.y >= st.size) return refuse(`level ${ref && ref.z} or cell (${r.x},${r.y}) doesn't exist`);
        if (r.z === 0 && levelGen(st, 0) < 4) return refuse("the ground has no column in this world (generator < 4)");
        const m = spec && spec.m;
        if (!m || typeof m.length !== "number" || m.length !== STRATA) return refuse("m must list five materials, S0 first");
        if (spec.hp !== undefined && (!spec.hp || spec.hp.length !== STRATA)) return refuse("hp must list five values, S0 first");
        const i = r.y * st.size + r.x;
        const rec = new Uint8Array(REC);
        for (let k = 0; k < STRATA; k++) {
            let v = m[k];
            if (typeof v === "string") {
                const id = MATERIAL_ID.get(v);
                if (id === undefined) return refuse(`unknown material ${JSON.stringify(v)} in S${k}`);
                v = id;
            }
            if (opts.constructed && SOLID_B[v & 0xff] === 1) v |= M_BUILT;
            if (!validMaterialByte(v)) return refuse(`material ${JSON.stringify(m[k])} in S${k} is not a known material byte`);
            rec[REC_M + k] = v;
            const hp = spec.hp !== undefined ? spec.hp[k] : (SOLID_B[v] === 1 ? 255 : 0);
            if (SOLID_B[v] === 1) {
                if (!Number.isInteger(hp) || hp < 1 || hp > 255) return refuse(`HP ${JSON.stringify(hp)} of S${k} must be 1..255 (0 HP is air)`);
            } else if (hp !== 0) return refuse(`HP of S${k} (${STRATA_MATERIALS[v & M_ID].key}) must be 0`);
            rec[REC_HP + k] = hp;
        }
        let conn;
        const c = spec.connector;
        if (c === undefined) conn = currentRecord(st, r.z, r.ax, r.ay, i)[0];
        else if (c === 0 || c === null || c === "none") conn = 0;
        else if (typeof c === "string" && CONNECTOR_CODE[c]) conn = CONNECTOR_CODE[c];
        else if (Number.isInteger(c) && c >= RAMP && c <= STAIR_BOTH) conn = c;
        else return refuse(`unknown connector ${JSON.stringify(c)}`);
        rec[0] = conn;
        const res = writeCell(st, r.ax, r.ay, r.x, r.y, r.z, rec, { cause: opts.cause || "setStrata", refuseIfStanding: !!opts.refuseIfStanding });
        return res.ok ? true : refuse(res.reason);
    }

    // A cell's strata for reading (allocates; not for per-frame use).
    function strataAt(ref) {
        const r = refOf(ref || {});
        const W = World(), st = W && W.state;
        if (!st || !isLevel(r.z) || r.z < -2 || r.z > 2 || !W.inWorld(r.ax, r.ay, r.z) || r.x < 0 || r.y < 0 || r.x >= st.size || r.y >= st.size) return null;
        const rec = currentRecord(st, r.z, r.ax, r.ay, r.y * st.size + r.x);
        const out = { materials: [], constructed: [], hp: [], bytes: [], connector: rec[0] ? SHAPE_NAMES[rec[0]] : null, fill: 0, changed: false };
        for (let k = 0; k < STRATA; k++) {
            const v = rec[REC_M + k];
            out.materials.push(STRATA_MATERIALS[v & M_ID].key);
            out.constructed.push((v & M_BUILT) !== 0);
            out.hp.push(rec[REC_HP + k]);
            out.bytes.push(v);
        }
        out.fill = fillOf(rec, REC_M);
        const am = deltaLevels(st)[r.z + 2].get(r.ax + r.ay * AREA_STRIDE);
        out.changed = !!(am && am.has(r.y * st.size + r.x));
        return out;
    }

    //-------------------------------------------------------------------------
    // Damage: material HP per stratum, volumes across levels

    const damageHooks = new Map();   // material key, "*" (every solid material) or "fluid" -> [fn]
    /**
     * A damage response: fn(ctx) runs when a stratum of that material ("stone", ...; "*" = every solid material; "fluid",
     * "water", "lava" = fluid strata) takes damage. ctx: { ref, stratum, material, constructed, damageType, damage,
     * effective, source }. A solid material's hook may return the effective damage to use (a number >= 0); a fluid's
     * return is ignored (fluids take no HP damage in 19A). Returns a function that removes the hook.
     */
    function registerDamageResponse(key, fn) {
        if (typeof key !== "string" || typeof fn !== "function") return () => false;
        const list = damageHooks.get(key) || [];
        list.push(fn);
        damageHooks.set(key, list);
        return () => {
            const l = damageHooks.get(key), j = l ? l.indexOf(fn) : -1;
            if (j >= 0) l.splice(j, 1);
            return j >= 0;
        };
    }
    function runHooks(key, ctx) {
        const list = damageHooks.get(key);
        if (!list || !list.length) return;
        for (const fn of list.slice()) {
            try {
                const v = fn(ctx);
                if (typeof v === "number" && Number.isFinite(v) && v >= 0) ctx.effective = v;
            } catch (e) {
                console.error(`DEUS_Levels: damage response "${key}" threw: ${e && e.message}`);
            }
        }
    }
    // One stratum of a record takes damage (the record changes in place). effective = damage x the material's resist
    // for the damage type, then the hooks. HP bytes lost = ceil(effective x 255 / maxHP): any damage > 0 costs at least
    // one step (maxHP / 255 HP). HP 0: the stratum becomes air.
    function damageStratum(rec, s, damage, damageType, ref, source) {
        const byte = rec[REC_M + s], mat = STRATA_MATERIALS[byte & M_ID];
        const out = { stratum: s, material: mat.key, hit: false, fluid: false, destroyed: false, damage, effective: 0,
            hpBefore: rec[REC_HP + s], hpAfter: rec[REC_HP + s], constructed: (byte & M_BUILT) !== 0, debris: null };
        if (byte === M_AIR) return out;
        const ctx = { ref, stratum: s, material: mat.key, constructed: out.constructed, damageType, damage, effective: 0, source };
        if (FLUID_B[byte] === 1) {
            out.fluid = true;
            runHooks(mat.key, ctx);
            runHooks("fluid", ctx);
            return out;
        }
        ctx.effective = damage * (mat.resist[damageType] !== undefined ? mat.resist[damageType] : 1);
        runHooks(mat.key, ctx);
        runHooks("*", ctx);
        out.hit = true;
        out.effective = ctx.effective;
        if (ctx.effective > 0) {
            const hp = Math.max(0, out.hpBefore - Math.ceil(ctx.effective * 255 / mat.maxHP - 1e-9));
            out.hpAfter = hp;
            if (hp === 0) {
                out.destroyed = true;
                out.debris = mat.debris;
                rec[REC_M + s] = M_AIR;
                rec[REC_HP + s] = 0;
            } else rec[REC_HP + s] = hp;
        }
        return out;
    }
    // Damage some strata of one cell: hits = [[stratum, damage], ...]. One write for the cell, then the events.
    function damageCell(st, ax, ay, x, y, z, hits, damageType, source) {
        const i = y * st.size + x, ref = { area: { x: ax, y: ay }, x, y, z };
        const rec = currentRecord(st, z, ax, ay, i);
        const results = hits.map(h => damageStratum(rec, h[0], h[1], damageType, ref, source));
        if (results.some(r => r.hpAfter !== r.hpBefore)) writeCell(st, ax, ay, x, y, z, rec, { cause: `damage:${damageType}` });
        for (const r of results) {
            if (!r.hit) continue;
            stats.strataDamaged++;
            emit("levels:strataDamaged", { area: { x: ax, y: ay }, x, y, z, stratum: r.stratum, material: r.material, constructed: r.constructed,
                damageType, damage: r.damage, effective: r.effective, hpBefore: r.hpBefore, hpAfter: r.hpAfter, destroyed: r.destroyed, source });
            if (r.destroyed) {
                stats.strataDestroyed++;
                emit("levels:strataDestroyed", { area: { x: ax, y: ay }, x, y, z, stratum: r.stratum, material: r.material, constructed: r.constructed,
                    debris: r.debris, damageType, source });
            }
        }
        return results;
    }
    // Why a cell can't take damage ("" = it can).
    function damageRefusal(st, ax, ay, x, y, z) {
        const W = World();
        if (!st || !st.levels) return "no levels in this world";
        if (!schemaKnown(st)) return `this save's strata schema ${JSON.stringify(st.strataSchemaVersion)} is unknown`;
        if (!Number.isInteger(z) || z < -2 || z > 2 || !W.inWorld(ax, ay, z) || x < 0 || y < 0 || x >= st.size || y >= st.size) return `level ${z} or cell (${x},${y}) doesn't exist`;
        if (z === 0 && levelGen(st, 0) < 4) return "the ground has no column in this world (generator < 4)";
        return "";
    }
    const badNumber = v => typeof v !== "number" || !Number.isFinite(v);

    /** Damage one stratum: applyStrataDamage(area, x, y, z, stratumIndex 0..4, damage >= 0, damageType = "impact"[, { source }]) or applyStrataDamage(ref, damage, damageType, opts). */
    function applyStrataDamage(area, x, y, z, s, damage, damageType = "impact", opts = {}) {
        let ax, ay, px, py, pz, ps, dmg, dtype, popts;
        if (typeof area === "object" && area !== null && "x" in area && "y" in area && "z" in area) {
            const a = area.area || { x: 0, y: 0 };
            ax = a.x | 0; ay = a.y | 0;
            px = area.x | 0; py = area.y | 0; pz = area.z | 0;
            ps = area.stratum !== undefined ? (area.stratum | 0) : (area.s | 0);
            dmg = x;
            dtype = typeof y === "string" ? y : "impact";
            popts = typeof z === "object" ? z : {};
        } else {
            ax = area ? area.x | 0 : 0; ay = area ? area.y | 0 : 0;
            px = x; py = y; pz = z; ps = s;
            dmg = damage; dtype = damageType; popts = opts;
        }
        const W = World(), st = W && W.state;
        const why = damageRefusal(st, ax, ay, px, py, pz)
            || (!Number.isInteger(ps) || ps < 0 || ps >= STRATA ? `stratum ${JSON.stringify(ps)} isn't 0..4` : "")
            || (badNumber(dmg) || dmg < 0 ? `damage ${JSON.stringify(dmg)} isn't a number >= 0` : "")
            || (typeof dtype !== "string" || !dtype ? "damageType must be a name" : "");
        if (why) return { ok: false, reason: why };
        const r = damageCell(st, ax, ay, px, py, pz, [[ps, dmg]], dtype, (popts && popts.source) || null)[0];
        return Object.assign({ ok: true, area: { x: ax, y: ay }, x: px, y: py, z: pz }, r);
    }

    const FALLOFF = { constant: t => 1, linear: t => 1 - t, quadratic: t => (1 - t) * (1 - t) };
    const levelOfElevation = e => Math.floor(e / STRATA) - 2;
    function newSummary() { return { ok: true, cells: 0, strataHit: 0, strataDestroyed: 0, skipped: 0, destroyed: [], levels: [] }; }
    function addResults(sum, results, x, y, z) {
        let wrote = false;
        for (const r of results) {
            if (r.hpAfter !== r.hpBefore) wrote = true;
            if (r.hit) sum.strataHit++;
            if (r.destroyed) { sum.strataDestroyed++; sum.destroyed.push({ x, y, z, stratum: r.stratum, material: r.material }); }
        }
        if (wrote) { sum.cells++; if (!sum.levels.includes(z)) sum.levels.push(z); }
    }
    // Any non-air stratum of the cell among the listed ones (no allocation; skips air before a record is made).
    function anyMatter(st, ax, ay, i, z, hits) {
        locate(st, z, ax, ay, i, 1);
        for (let h = 0; h < hits.length; h++) if (rdM[rdO + hits[h][0]] !== M_AIR) return true;
        return false;
    }

    /**
     * Damage a volume. Two forms:
     *   applyVolumeDamage(area, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact"[, { source }]):
     *     every stratum of the box, from level minZ stratum minS up to level maxZ stratum maxS (it crosses levels: the
     *     25 strata of a column are one elevation scale, e = (z + 2) * 5 + s, 0..24), takes the damage.
     *   applyVolumeDamage({ center: { area, x, y, z, s = 2 }, radius (feet), damage, damageType = "impact",
     *     falloff: "constant" | "linear" (default) | "quadratic", source }):
     *     a sphere around the middle of that stratum; a stratum takes damage x falloff(distance / radius) when its middle
     *     is within the radius (a cell is 5 ft across, a stratum 1 ft high). It crosses levels the same way.
     * One area per call (cells past the area's edge are left out). Returns { ok, cells, strataHit, strataDestroyed,
     * skipped, destroyed: [{ x, y, z, stratum, material }], levels } or { ok: false, reason }.
     */
    function applyVolumeDamage(a, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact", opts = {}) {
        if (a && typeof a === "object" && a.radius !== undefined) return sphereDamage(a);
        const W = World(), st = W && W.state;
        if (!st || !st.levels) return { ok: false, reason: "no levels in this world" };
        const nums = [minX, minY, minZ, minS, maxX, maxY, maxZ, maxS];
        if (nums.some(v => !Number.isInteger(v))) return { ok: false, reason: "the box needs integer bounds" };
        if (badNumber(damage) || damage < 0) return { ok: false, reason: `damage ${JSON.stringify(damage)} isn't a number >= 0` };
        if (typeof damageType !== "string" || !damageType) return { ok: false, reason: "damageType must be a name" };
        if (minS < 0 || minS >= STRATA || maxS < 0 || maxS >= STRATA) return { ok: false, reason: "strata are 0..4" };
        const ax = a ? a.x | 0 : 0, ay = a ? a.y | 0 : 0;
        const e0 = Math.max(0, (minZ + 2) * STRATA + minS), e1 = Math.min(24, (maxZ + 2) * STRATA + maxS);
        const x0 = Math.max(0, minX), y0 = Math.max(0, minY), x1 = Math.min(st.size - 1, maxX), y1 = Math.min(st.size - 1, maxY);
        const sum = newSummary(), source = (opts && opts.source) || null;
        if (e0 > e1 || x0 > x1 || y0 > y1) return sum;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            for (let z = levelOfElevation(e0); z <= levelOfElevation(e1); z++) {
                if (damageRefusal(st, ax, ay, x, y, z)) { sum.skipped++; continue; }
                const hits = [];
                for (let s = 0; s < STRATA; s++) { const e = (z + 2) * STRATA + s; if (e >= e0 && e <= e1) hits.push([s, damage]); }
                if (!anyMatter(st, ax, ay, y * st.size + x, z, hits)) continue;
                addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);
            }
        }
        sum.levels.sort((p, q) => p - q);
        return sum;
    }
    function sphereDamage(spec) {
        const W = World(), st = W && W.state;
        if (!st || !st.levels) return { ok: false, reason: "no levels in this world" };
        const c = spec.center || {};
        const area = c.area || spec.area || { x: 0, y: 0 }, ax = area.x | 0, ay = area.y | 0;
        const cs = c.s !== undefined ? c.s : 2, falloff = FALLOFF[spec.falloff || "linear"];
        const damage = spec.damage, radius = spec.radius, damageType = spec.damageType || "impact", source = spec.source || null;
        if (![c.x, c.y, c.z, cs].every(Number.isInteger) || cs < 0 || cs >= STRATA || c.z < -2 || c.z > 2) return { ok: false, reason: "center needs integer x, y, z (-2..2) and s (0..4)" };
        if (badNumber(radius) || radius <= 0) return { ok: false, reason: `radius ${JSON.stringify(radius)} isn't a number > 0 (feet)` };
        if (badNumber(damage) || damage < 0) return { ok: false, reason: `damage ${JSON.stringify(damage)} isn't a number >= 0` };
        if (!falloff) return { ok: false, reason: `unknown falloff ${JSON.stringify(spec.falloff)} (constant, linear, quadratic)` };
        if (typeof damageType !== "string") return { ok: false, reason: "damageType must be a name" };
        const px = (c.x + 0.5) * CELL_FT, py = (c.y + 0.5) * CELL_FT, pe = (c.z + 2) * STRATA + cs + 0.5;
        const rc = Math.ceil(radius / CELL_FT), r2 = radius * radius;
        const e0 = Math.max(0, Math.floor(pe - radius)), e1 = Math.min(24, Math.floor(pe + radius));
        const sum = newSummary();
        for (let y = Math.max(0, c.y - rc); y <= Math.min(st.size - 1, c.y + rc); y++) {
            for (let x = Math.max(0, c.x - rc); x <= Math.min(st.size - 1, c.x + rc); x++) {
                const dx = (x + 0.5) * CELL_FT - px, dy = (y + 0.5) * CELL_FT - py, h2 = dx * dx + dy * dy;
                if (h2 > r2) continue;
                for (let z = levelOfElevation(e0); z <= levelOfElevation(e1); z++) {
                    if (damageRefusal(st, ax, ay, x, y, z)) { sum.skipped++; continue; }
                    const hits = [];
                    for (let s = 0; s < STRATA; s++) {
                        const de = (z + 2) * STRATA + s + 0.5 - pe, d2 = h2 + de * de;
                        if (d2 <= r2) hits.push([s, damage * falloff(Math.sqrt(d2) / radius)]);
                    }
                    if (!hits.length || !anyMatter(st, ax, ay, y * st.size + x, z, hits)) continue;
                    addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);
                }
            }
        }
        sum.levels.sort((p, q) => p - q);
        return sum;
    }

    //-------------------------------------------------------------------------
    // Adapters: questions about a cell's strata (no allocation; arguments (ref), (area, x, y[, z]) or (ax, ay, x, y, z))

    /** The index (0..4) of the top stratum of the cell's solid base (S0 up), or -1 when S0 isn't solid. */
    function surfaceHeightAt(a, b, c, d, e) {
        if (!cellQuery(a, b, c, d, e)) return -1;
        locate(qSt, qZ, qAx, qAy, qI, 1);
        const f = fillOf(rdM, rdO);
        return f > 0 ? f - 1 : -1;
    }
    /** The column elevation (0..24 = (z + 2) * 5 + stratum) of the stratum stood on in the cell: the top of its solid base,
     *  or with none the cell below's S4 when that is solid; -1 when there is nothing to stand on. */
    function worldStrataElevationAt(a, b, c, d, e) {
        if (!cellQuery(a, b, c, d, e)) return -1;
        locate(qSt, qZ, qAx, qAy, qI, 1);
        const f = fillOf(rdM, rdO);
        if (f > 0) return (qZ + 2) * STRATA + f - 1;
        if (qZ > -2) {
            locate(qSt, qZ - 1, qAx, qAy, qI, 0);
            if (SOLID_B[rdM[rdO + 4]] === 1) return (qZ + 2) * STRATA - 1;
        }
        return -1;
    }
    /** "HEIGHT_k_OF_5": k = the solid strata stacked from S0 ("" outside the world). */
    function heightStateAt(a, b, c, d, e) {
        if (!cellQuery(a, b, c, d, e)) return "";
        locate(qSt, qZ, qAx, qAy, qI, 1);
        return HEIGHT_STATES[fillOf(rdM, rdO)];
    }
    /** "FLUID_k_OF_5": k = the fluid strata of the cell ("" outside the world). */
    function fluidStateAt(a, b, c, d, e) {
        if (!cellQuery(a, b, c, d, e)) return "";
        locate(qSt, qZ, qAx, qAy, qI, 1);
        if (typeof window !== "undefined" && window.UF && window.UF.Fluid && typeof window.UF.Fluid.fluidPhysicalHeightStateAt === "function") {
            const live = window.UF.Fluid.fluidPhysicalHeightStateAt(qAx, qAy, qI % qSt.size, Math.floor(qI / qSt.size), qZ);
            if (live > 0) return FLUID_STATES[live];
        }
        return FLUID_STATES[fluidCountOf(rdM, rdO)];
    }
    /** All five strata solid. */
    function isSolid(a, b, c, d, e) {
        if (!cellQuery(a, b, c, d, e)) return false;
        locate(qSt, qZ, qAx, qAy, qI, 1);
        return fillOf(rdM, rdO) === STRATA;
    }
    /** Solid strata / 5 (0, 0.2 .. 1). */
    function solidFraction(a, b, c, d, e) {
        if (!cellQuery(a, b, c, d, e)) return 0;
        locate(qSt, qZ, qAx, qAy, qI, 1);
        const m = rdM, o = rdO;
        return (SOLID_B[m[o]] + SOLID_B[m[o + 1]] + SOLID_B[m[o + 2]] + SOLID_B[m[o + 3]] + SOLID_B[m[o + 4]]) / STRATA;
    }
    const materialCounts = new Uint8Array(64);
    /** The material key held by the most strata ("air" when none; a tie goes to the lower stratum's). */
    function dominantMaterial(a, b, c, d, e) {
        if (!cellQuery(a, b, c, d, e)) return "";
        locate(qSt, qZ, qAx, qAy, qI, 1);
        let best = M_AIR, bestN = 0;
        for (let k = 0; k < STRATA; k++) materialCounts[rdM[rdO + k] & M_ID] = 0;
        for (let k = 0; k < STRATA; k++) {
            const id = rdM[rdO + k] & M_ID;
            if (id === M_AIR) continue;
            const n = ++materialCounts[id];
            if (n > bestN) { best = id; bestN = n; }
        }
        return STRATA_MATERIALS[best].key;
    }
    /** HP points left in the cell's solid strata (sum of maxHP x hp / 255). */
    function remainingStructuralHP(a, b, c, d, e) {
        if (!cellQuery(a, b, c, d, e)) return 0;
        locate(qSt, qZ, qAx, qAy, qI, 1);
        let hp = 0;
        for (let k = 0; k < STRATA; k++) if (SOLID_B[rdM[rdO + k]] === 1) hp += STRATA_MATERIALS[rdM[rdO + k] & M_ID].maxHP * hpAt(k) / 255;
        return hp;
    }
    /** HP points of the cell's solid strata at full HP. */
    function maxStructuralHP(a, b, c, d, e) {
        if (!cellQuery(a, b, c, d, e)) return 0;
        locate(qSt, qZ, qAx, qAy, qI, 1);
        let hp = 0;
        for (let k = 0; k < STRATA; k++) if (SOLID_B[rdM[rdO + k]] === 1) hp += STRATA_MATERIALS[rdM[rdO + k] & M_ID].maxHP;
        return hp;
    }
    /** The load the cell carries, 0..1: sum over its solid strata of support x hp / 255, divided by 5 (diagnostic; no
     *  collapse rules in 19A). */
    function effectiveSupport(a, b, c, d, e) {
        if (!cellQuery(a, b, c, d, e)) return 0;
        locate(qSt, qZ, qAx, qAy, qI, 1);
        let s = 0;
        for (let k = 0; k < STRATA; k++) if (SOLID_B[rdM[rdO + k]] === 1) s += STRATA_MATERIALS[rdM[rdO + k] & M_ID].support * hpAt(k) / 255;
        return s / STRATA;
    }
    /** Any solid stratum above the cell's standing space: in the cell above its solid base (after an air gap), or in any
     *  cell above it up to +2 (the 25-strata column), or the column's ceiling cap above +2 (19B). A 5-bit solid mask per
     *  cell. */
    function hasOpaqueOverburden(a, b, c, d, e) {
        if (!cellQuery(a, b, c, d, e)) return false;
        locate(qSt, qZ, qAx, qAy, qI, 1);
        const f = fillOf(rdM, rdO);
        if (f < STRATA && (solidMaskOf(rdM, rdO) >> f) !== 0) return true;
        for (let z = qZ + 1; z <= 2; z++) {
            if (!World().inWorld(qAx, qAy, z)) break;
            locate(qSt, z, qAx, qAy, qI, 2);
            if (solidMaskOf(rdM, rdO) !== 0) return true;
        }
        return capCode(qSt, qAx, qAy, qI) !== 0;
    }
    /**
     * For DEUS_Fluid (which keeps its 0..7 depth scale): the cell's open volume and faces as bits. capacity (bits 0..2) =
     * the cell's non-solid strata in fluid depth units (STRATA_TO_FLUID); DOWN (8): S0 open and the cell below's S4 open
     * (not at -2); UP (16): S4 open and the cell above's S0 open (the sky above +2); SIDE (32): any stratum open. 0 outside
     * the world or for a solid cell.
     */
    function getStrataFluidPassage(a, b, c, d, e) {
        if (!cellQuery(a, b, c, d, e)) return 0;
        locate(qSt, qZ, qAx, qAy, qI, 1);
        const mask = solidMaskOf(rdM, rdO);
        const open = STRATA - (SOLID_B[rdM[rdO]] + SOLID_B[rdM[rdO + 1]] + SOLID_B[rdM[rdO + 2]] + SOLID_B[rdM[rdO + 3]] + SOLID_B[rdM[rdO + 4]]);
        if (!open) return 0;
        let bits = STRATA_TO_FLUID[open] | FLUID_PASS.SIDE;
        if ((mask & 1) === 0 && qZ > -2) {
            locate(qSt, qZ - 1, qAx, qAy, qI, 0);
            if (SOLID_B[rdM[rdO + 4]] === 0) bits |= FLUID_PASS.DOWN;
        }
        if ((mask & 16) === 0) {
            if (qZ === 2) { if (capCode(qSt, qAx, qAy, qI) === 0) bits |= FLUID_PASS.UP; }   // a capped column is closed above
            else {
                locate(qSt, qZ + 1, qAx, qAy, qI, 2);
                if (SOLID_B[rdM[rdO]] === 0) bits |= FLUID_PASS.UP;
            }
        }
        return bits;
    }
    const fluidDepthToStrata = d => FLUID_TO_STRATA[Math.max(0, Math.min(7, d | 0))];
    const strataToFluidDepth = k => STRATA_TO_FLUID[Math.max(0, Math.min(STRATA, k | 0))];
    /** Everything above about a cell's standing surface in one object (allocates: diagnostics, cellAt). */
    function surfaceAt(ref) {
        if (!cellQuery(ref)) return null;
        const top = surfaceHeightAt(ref), elevation = worldStrataElevationAt(ref);
        return { topStratum: top, elevation, heightState: heightStateAt(ref), fluidState: fluidStateAt(ref),
            solidFraction: solidFraction(ref), dominantMaterial: dominantMaterial(ref), overburden: hasOpaqueOverburden(ref) };
    }

    //-------------------------------------------------------------------------
    // Natural cuts and caves (DEUS-TSK-FABLE-19B, generator 5). docs/systems/UF_Levels.md, section "Natural cuts and
    // caves". A generator-5 area has its five levels generated together (generator 4's baselines, generateVolume), then
    // natural features are carved into their strata in one deterministic pass: solid strata become air through the
    // column, so a ravine or a cave is strata and nothing else. The plans below are the generator's working data,
    // dropped after the carve; the ground baseline keeps a list of feature descriptors (naturalFeatures) for diagnostics
    // and tests, never read as terrain. Everything is a pure function of the seed, the generator version, the area and
    // the world's size and catalog climate (never of the live world state), so any area regenerates the same way.

    const FEATURE_GEN = 5;
    const E_TOP = 25;                  // elevations 0..24 (e = (z + 2) * 5 + s); 25 is the top of +2, where the model ends
    const DEFAULT_CLIMATE = Object.freeze({ continentRim: 0.15, seaLevel: 0.2, scale: Object.freeze({ elevation: 64, rainfall: 48, temperature: 96, detail: 16 }) });
    const deepFreeze = o => {
        if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]); }
        return o;
    };
    // Frozen per generator: a change is a new generator version (saves regenerate their baselines from these numbers).
    const FEATURE_PARAMS = deepFreeze({
        5: {
            edgeMargin: 12, edgeTaper: 8,      // nothing carved within 12 cells of an area edge; full depth from 20 in
            startRadius: 40, startTaper: 8,    // each area's flat centre (the founders' valley: flat to r 30, blended by r 36)
            waterMargin: 2,                    // cells kept between a cut and surface water (ocean, lake, river, pond)
            pocketMargin: 3, mouthMargin: 3,   // round underground founding squares and pools, and the cliff cave mouths
            minBed: 1,                         // -2 S0 is never carved: below -2 there is only lava
            cuts: {
                spacing: 36, chance: 0.5,      // one candidate anchor per 36 x 36 lattice cell
                // Depth below the anchor's rock top (ft) and the lowest first-air elevation the class may carve to: the
                // valley floor stands on the ground's S0 (first air 11), only 1 ft above -1, so shallow and medium cuts
                // keep -1's lower strata (first air >= 7), deep ones stop on -1 S0 (6: the whole -1 band exposed) and
                // only the rare z2 class reaches -2 (bed 1..3; -2 S0 stays).
                classes: [
                    { key: "shallow", p: 0.60, depth: [1, 4], floor: 7 },    // partial-height relief
                    { key: "medium", p: 0.25, depth: [5, 8], floor: 7 },     // about one macro-Z transition (from higher ground)
                    { key: "deep", p: 0.12, depth: [9, 13], floor: 6 },      // exposes -1
                    { key: "z2", p: 0.03, bed: [1, 3], floor: 1 }            // reaches -2
                ],
                // Geological tendencies by biome family (weights; not exclusive).
                families: {
                    TEMP: { ravine: 4, karst_sinkhole: 3, stream_cut: 3, limestone_cleft: 2, arroyo: 0.5, fissure: 0.3 },
                    WET: { drainage_cut: 4, peat_hollow: 3, wet_sinkhole: 2, water_channel: 3, ravine: 0.5 },
                    ARID: { arroyo: 4, canyon: 3, slot_chasm: 2, terrace_steps: 3, ravine: 0.5 },
                    HIGH: { fault_chasm: 3, granite_cleft: 3, rock_cut: 3, scree_terrace: 3, ravine: 0.5 },
                    VOLC: { fissure: 4, tube_collapse: 3, caldera_fracture: 2, basalt_steps: 3, slot_chasm: 0.5 }
                },
                // Shapes: form line / round / chain / arc; half-widths and radii in cells; profile = the cross-section
                // (vertical walls with a 1 ft lip, U, flat bed with banks, steep, stepped ledges, funnel, bowl, throat);
                // deep: the type may take the deep and z2 classes.
                types: {
                    ravine: { form: "line", len: [24, 56], half: [1.6, 3.2], profile: "u", bend: 0.9, deep: true },
                    stream_cut: { form: "line", len: [30, 70], half: [1.2, 2.2], profile: "flat", bend: 1.2, deep: false },
                    limestone_cleft: { form: "line", len: [12, 28], half: [0.7, 1.2], profile: "vertical", bend: 0.5, deep: true },
                    karst_sinkhole: { form: "round", r: [2.5, 5.5], profile: "funnel", deep: true },
                    drainage_cut: { form: "line", len: [30, 70], half: [1.8, 3.4], profile: "flat", bend: 1.0, deep: false },
                    water_channel: { form: "line", len: [24, 60], half: [1.0, 2.0], profile: "u", bend: 1.3, deep: false },
                    peat_hollow: { form: "round", r: [3, 7], profile: "bowl", deep: false },
                    wet_sinkhole: { form: "round", r: [2, 4], profile: "throat", deep: true },
                    arroyo: { form: "line", len: [30, 80], half: [2.0, 4.0], profile: "flat", bend: 1.1, deep: false },
                    canyon: { form: "line", len: [30, 70], half: [3.0, 6.0], profile: "stepped", bend: 0.8, deep: true },
                    slot_chasm: { form: "line", len: [16, 40], half: [0.7, 1.1], profile: "vertical", bend: 0.9, deep: true },
                    terrace_steps: { form: "line", len: [20, 44], half: [3.5, 6.5], profile: "stepped", bend: 0.4, deep: true },
                    fault_chasm: { form: "line", len: [30, 70], half: [0.8, 1.6], profile: "vertical", bend: 0.25, deep: true },
                    granite_cleft: { form: "line", len: [12, 30], half: [0.7, 1.2], profile: "vertical", bend: 0.4, deep: true },
                    rock_cut: { form: "line", len: [16, 40], half: [1.5, 3.0], profile: "steep", bend: 0.5, deep: true },
                    scree_terrace: { form: "line", len: [18, 40], half: [3.0, 5.5], profile: "stepped", bend: 0.5, deep: true },
                    fissure: { form: "line", len: [24, 64], half: [0.7, 1.1], profile: "vertical", bend: 0.35, deep: true },
                    tube_collapse: { form: "chain", pits: [3, 6], r: [1.3, 2.6], gap: [3, 6], profile: "throat", deep: true },
                    caldera_fracture: { form: "arc", radius: [14, 26], span: [0.8, 1.8], half: [0.7, 1.4], profile: "vertical", deep: true },
                    basalt_steps: { form: "line", len: [16, 36], half: [2.5, 5.0], profile: "stepped", bend: 0.6, deep: true }
                }
            },
            caves: {
                spacing: 64,                   // one candidate anchor per 64 x 64 lattice cell and level
                // Per level: chance per candidate, floor = first air elevation of its chambers, node count, clearance of
                // chambers and passages (ft), the host rock it needs. +2 caves sit in a massif: the summit's rock rising
                // above the model, its +2 strata solid and its column capped (the ceiling cap).
                levels: {
                    "2": { chance: 0.3, floor: [21, 21], chamberFloor: [20, 21], nodes: [2, 4], chamberH: [4, 6], passageH: [4, 4], interior: 7, massifMargin: 3, capThickness: [3, 12] },
                    "1": { chance: 0.35, floor: [15, 16], nodes: [2, 4], chamberH: [4, 5], passageH: [4, 4] },
                    "0": { chance: 0.3, floor: [10, 11], nodes: [3, 5], chamberH: [5, 8], passageH: [4, 5] },
                    "-1": { chance: 0.22, floor: [5, 6], nodes: [3, 6], chamberH: [5, 7], passageH: [4, 5] },
                    "-2": { chance: 0.2, floor: [1, 2], nodes: [3, 6], chamberH: [5, 7], passageH: [4, 5] }
                },
                nodeGap: [7, 13], chamberR: [2.5, 5.5], passageHalf: [0.7, 1.3],
                branchChance: 0.35, deadEnds: [0, 2], loopChance: 0.2,
                multiZChance: 0.25,            // one chamber a level up or down, joined by a sloped passage
                shaftChance: 0.4, shaftReach: 20,  // two networks on adjacent levels joined by a shaft
                skylightChance: 0.25, skylightMax: 10,  // a shaft from a chamber up to the open surface through thin rock
                mouthChance: 0.6, mouthReach: 28,       // a passage out to open ground at the network's floor height
                roofMin: 1                     // strata of rock kept above a cave (the cap is the roof of a massif column)
            }
        }
    });
    const FAMILIES = Object.freeze(["TEMP", "WET", "ARID", "HIGH", "VOLC"]);

    // The five baselines of a generator-5 area, generated together (the last VOLUME_KEEP areas are kept: a pure
    // function of the key, so a dropped one regenerates identically).
    const VOLUME_KEEP = 3;
    const volumes = new Map();
    function volumeOf(seed, gen, ax, ay, size) {
        const W = World(), st = W && W.state;
        const key = `${seed}:${gen}:${ax},${ay}:${size}:${st && st.areasX ? `${st.areasX}x${st.areasY}` : "1x1"}`;
        let v = volumes.get(key);
        if (v) return v;
        const t0 = performance.now();
        v = LEVELS.map(z => finishBaseline(levelArrays(seed, gen, z, ax, ay, size), z, gen, size));
        const tBase = performance.now() - t0;
        carveNaturalFeatures(seed, gen, ax, ay, size, v);
        const ms = performance.now() - t0;
        stats.generated += 5;
        stats.genMs += ms;
        stats.lastGenMs = ms;
        stats.featureMs = ms - tBase;
        volumes.set(key, v);
        while (volumes.size > VOLUME_KEEP) volumes.delete(volumes.keys().next().value);
        return v;
    }

    /**
     * Carve the natural cuts and caves of an area into its five baselines' strata (bs[z + 2]), in place. Order: host
     * rock and protections, cave networks (+2 massifs and their caps first), shafts and skylights, cuts, ramps where a
     * carved slope meets the next level, removal of any natural solid no longer connected to bedrock. Keeps the feature
     * descriptors on the ground baseline (bs[2].features) and the caps on +2's (bs[4].caps).
     */
    function carveNaturalFeatures(seed, gen, ax, ay, size, bs) {
        const t0 = performance.now();
        const P = FEATURE_PARAMS[gen] || FEATURE_PARAMS[FEATURE_GEN];
        const n = size * size, mid = Math.floor(size / 2);
        const M = bs.map(b => b.strata.m), CONN = bs.map(b => b.conn);
        const S = bs[2].surface;                                   // the natural surface heights (0, 1, 2)
        const W = World(), st = W && W.state;
        const areasX = st && st.areasX ? st.areasX : 1, areasY = st && st.areasY ? st.areasY : 1;
        const G = window.UF && UF.WorldGen, cat = catalog(), cl = (cat && cat.climate) || DEFAULT_CLIMATE;
        const salt = hashString(`deus.levels.features.v${gen}`);
        const rnd = (...p) => hash32(seed, salt, ax, ay, ...p) / 4294967296;
        const rint = (range, ...p) => range[0] + Math.floor(rnd(...p) * (range[1] - range[0] + 1));
        const rfl = (range, ...p) => range[0] + rnd(...p) * (range[1] - range[0]);
        const out = { gen, area: { x: ax, y: ay }, cuts: [], caves: [], shafts: [], skylights: [], massifCells: 0, capCells: 0,
            carvedStrata: 0, cutCells: 0, caveCells: 0, rampsAdded: 0, floatingRemoved: 0, ms: 0 };
        bs[4].caps = new Map();

        // The column as one elevation scale: stratum e of cell i.
        const getE = (i, e) => M[(e / STRATA) | 0][i * STRATA + (e % STRATA)];
        const setE = (i, e, v) => { M[(e / STRATA) | 0][i * STRATA + (e % STRATA)] = v; };
        const solidE = (i, e) => SOLID_B[getE(i, e)] === 1;
        const clearConn = (i, e0, e1) => {   // connectors of the levels whose strata e0..e1 changed
            for (let li = (e0 / STRATA) | 0; li <= ((e1 / STRATA) | 0) && li < 5; li++) CONN[li][i >> 1] &= ~(15 << ((i & 1) << 2));
        };
        const top = new Uint8Array(n);      // first air above the highest solid stratum (the rock surface; 0 = none)
        const topOf = i => { let e = E_TOP - 1; while (e >= 0 && !solidE(i, e)) e--; return e + 1; };
        for (let i = 0; i < n; i++) top[i] = topOf(i);

        // Protections. wt: 0..1 depth allowed (area edges and each area's flat centre fade in); lock bits; minTop: a cut
        // stops above the roof of an underground founding square or pool.
        const NO_CUT = 1, NO_CAVE = 2;
        const wt = new Float32Array(n), lock = new Uint8Array(n), minTop = new Uint8Array(n);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
            const we = Math.min(1, Math.max(0, (edge - P.edgeMargin) / P.edgeTaper));
            const ws = Math.min(1, Math.max(0, (Math.hypot(x - mid, y - mid) - P.startRadius) / P.startTaper));
            wt[y * size + x] = Math.min(we, ws);
        }
        const inArea = (x, y) => x >= 0 && y >= 0 && x < size && y < size;
        const lockDisc = (cx, cy, r, bits, mt) => {
            for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
                if (dx * dx + dy * dy > r * r || !inArea(cx + dx, cy + dy)) continue;
                const i = (cy + dy) * size + cx + dx;
                lock[i] |= bits;
                if (mt > minTop[i]) minTop[i] = mt;
            }
        };
        for (const li of [0, 1]) {
            const roofTop = (li - 2 + 3) * STRATA + 1;   // first air above the pocket's roof (the next level's S0)
            for (const p of bs[li].pockets || []) {
                lockDisc(p.x, p.y, (p.clearRadius || 3) + P.pocketMargin + 0.5, NO_CAVE, roofTop);
                if (p.water) lockDisc(p.water.x, p.water.y, 2.5 + P.pocketMargin, NO_CAVE, roofTop);   // the 2 x 2 pool from (x, y)
            }
        }
        for (const m of bs[2].cliffCaves || []) for (const c of m.tunnel) lockDisc(c.x, c.y, P.mouthMargin + 0.5, NO_CUT | NO_CAVE, 0);
        for (const m of bs[1].cliffCaves || []) {
            lockDisc(m.terminus.x, m.terminus.y, P.mouthMargin + 1.5, NO_CUT | NO_CAVE, 0);
            for (const ci of m.corridor || []) lockDisc(ci % size, (ci / size) | 0, P.mouthMargin + 0.5, NO_CUT | NO_CAVE, 0);
        }
        // Surface water (pure: the water model of this seed and world size), asked only for cells a feature reaches. Water
        // is painted on the valley floor only (S = 0), so nearWater looks for wet valley cells round any cell.
        const pseudo = { seed, size, areasX, areasY, startArea: { x: Math.floor(areasX / 2), y: Math.floor(areasY / 2) } };
        const wm = G && cat && cat.climate && typeof G.waterModel === "function" ? G.waterModel(pseudo) : null;
        const wetMemo = new Int8Array(n).fill(-1);
        const isWet = i => {
            if (!wm) return false;
            if (wetMemo[i] < 0) wetMemo[i] = wm.isWater(ax * size + i % size, ay * size + ((i / size) | 0)) ? 1 : 0;
            return wetMemo[i] === 1;
        };
        const nearWater = i => {
            const x = i % size, y = (i / size) | 0, r = P.waterMargin;
            for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
                if (!inArea(x + dx, y + dy)) continue;
                const j = (y + dy) * size + x + dx;
                if (S[j] === 0 && isWet(j)) return true;      // water is painted on the valley floor only (S = 0)
            }
            return false;
        };
        // Biome family of a cell from the climate fields (blended toward the start's climate, as the biome map is).
        const dd = { seed, width: areasX * size, height: areasY * size,
            startX: pseudo.startArea.x * size + Math.floor(size / 2), startY: pseudo.startArea.y * size + Math.floor(size / 2) };
        const familyAt = (x, y) => {
            if (!G || typeof G.fieldsFor !== "function" || !cat || !cat.climate) return "TEMP";
            const f = G.fieldsFor(seed, dd, cl, ax * size + x, ay * size + y), s = S[y * size + x];
            if (f.v > 0.62) return "VOLC";
            if (s === 2 || f.e > (cl.mountainLevel || 0.74) - 0.08) return "HIGH";
            if (f.r > 0.58 && f.d < 0.45) return "WET";
            if (f.r < 0.28 || (f.t > 0.62 && f.r < 0.36)) return "ARID";
            return "TEMP";
        };
        const touched = new Uint8Array(n);          // 1: cut, 2: cave, 4: shaft or skylight, 8: massif
        const ownerCut = new Int32Array(n).fill(-1);

        // A thick polyline: pts = [{ x, y, w, ...}] every half cell. fn(i, d, p) for every cell whose centre lies within
        // p.w + extra of some point p: the point whose edge (d - w) is nearest.
        function stroke(pts, extra, fn) {
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, wmax = 0;
            for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); wmax = Math.max(wmax, p.w); }
            const r = wmax + extra;
            const bx0 = Math.max(0, Math.floor(x0 - r)), by0 = Math.max(0, Math.floor(y0 - r));
            const bx1 = Math.min(size - 1, Math.ceil(x1 + r)), by1 = Math.min(size - 1, Math.ceil(y1 + r));
            if (bx0 > bx1 || by0 > by1) return;
            const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
            const best = new Float32Array(bw * bh).fill(1e9), dist = new Float32Array(bw * bh), which = new Int32Array(bw * bh).fill(-1);
            for (let k = 0; k < pts.length; k++) {
                const p = pts[k], rr = p.w + extra;
                for (let y = Math.max(by0, Math.floor(p.y - rr)); y <= Math.min(by1, Math.ceil(p.y + rr)); y++) {
                    for (let x = Math.max(bx0, Math.floor(p.x - rr)); x <= Math.min(bx1, Math.ceil(p.x + rr)); x++) {
                        const dx = x + 0.5 - p.x, dy = y + 0.5 - p.y, d = Math.sqrt(dx * dx + dy * dy);
                        if (d > rr) continue;
                        const j = (y - by0) * bw + (x - bx0);
                        if (d - p.w < best[j]) { best[j] = d - p.w; dist[j] = d; which[j] = k; }
                    }
                }
            }
            for (let j = 0; j < bw * bh; j++) if (which[j] >= 0) fn((by0 + ((j / bw) | 0)) * size + bx0 + (j % bw), dist[j], pts[which[j]]);
        }

        //---------------------------------------------------------------- cave networks
        const CV = P.caves;
        // Distance (cells) from each summit cell (S = 2) to the nearest cell that isn't one: +2 caves need a broad summit.
        const interior = new Uint8Array(n);
        {
            const q = new Int32Array(n);
            let qh = 0, qt = 0;
            for (let i = 0; i < n; i++) { if (S[i] !== 2) { interior[i] = 0; q[qt++] = i; } else interior[i] = 255; }
            while (qh < qt) {
                const i = q[qh++], x = i % size, y = (i / size) | 0, d = interior[i] + 1;
                if (x > 0 && interior[i - 1] > d) { interior[i - 1] = d; q[qt++] = i - 1; }
                if (x < size - 1 && interior[i + 1] > d) { interior[i + 1] = d; q[qt++] = i + 1; }
                if (y > 0 && interior[i - size] > d) { interior[i - size] = d; q[qt++] = i - size; }
                if (y < size - 1 && interior[i + size] > d) { interior[i + size] = d; q[qt++] = i + size; }
            }
        }
        // Host rock for a chamber of level z at cell (x, y) with first-air floor F and h ft of clearance.
        const hostOk = (z, x, y, F, h) => {
            if (!inArea(x, y)) return false;
            const i = y * size + x;
            if (wt[i] < 1 || (lock[i] & NO_CAVE)) return false;
            if (z === 2) return S[i] === 2 && interior[i] >= 5;   // (the network's first chamber: levels["2"].interior)
            if (z === 1 && S[i] !== 2) return false;
            if (z === 0 && S[i] < 1) return false;
            return solidE(i, F - 1) && solidE(i, F) && top[i] >= F + h + CV.roofMin;
        };
        const networks = [];
        const lat = Math.max(1, Math.floor(size / CV.spacing));
        out.placement = {};
        for (const z of [2, 1, 0, -1, -2]) {
            const LV = CV.levels[String(z)], pl = out.placement[z] = { rolled: 0, hosted: 0, planned: 0 };
            for (let ly = 0; ly < lat; ly++) for (let lx = 0; lx < lat; lx++) {
                const k = (z + 2) * 4096 + ly * lat + lx;
                if (rnd(101, k) >= LV.chance) continue;
                pl.rolled++;
                // A few seeded tries inside the lattice cell for host rock (the first that fits).
                const F0 = rint(LV.floor, 104, k), hP = rint(LV.passageH, 105, k);
                let x = -1, y = -1;
                for (let t = 0; t < 8 && x < 0; t++) {
                    const tx = Math.floor((lx + 0.1 + 0.8 * rnd(102, k, t)) * CV.spacing), ty = Math.floor((ly + 0.1 + 0.8 * rnd(103, k, t)) * CV.spacing);
                    if (hostOk(z, tx, ty, F0, z === 2 ? 0 : hP) && (z !== 2 || interior[ty * size + tx] >= LV.interior)) { x = tx; y = ty; }
                }
                if (x < 0) continue;
                pl.hosted++;
                const net = planNetwork(z, k, x, y, F0, hP, LV);
                if (net) { networks.push(net); pl.planned++; }
            }
        }
        function planNetwork(z, k, x0, y0, F0, hP, LV) {
            const net = { id: networks.length, z, F0, hP, nodes: [], edges: [], mouth: null, skylight: null, multiZ: false, joins: [] };
            const chamberFloor = i => z === 2 ? rint(LV.chamberFloor, 110, k, i) : F0;
            const addNode = (x, y, F, stub) => {
                const node = { x, y, F, stub: !!stub, rx: stub ? 1.1 : rfl(CV.chamberR, 111, k, net.nodes.length), ry: stub ? 1.1 : rfl(CV.chamberR, 112, k, net.nodes.length),
                    rot: rnd(113, k, net.nodes.length) * Math.PI, h: stub ? hP : rint(LV.chamberH, 114, k, net.nodes.length) };
                net.nodes.push(node);
                return node;
            };
            const ok = (x, y, F, h) => hostOk(z, x, y, F, z === 2 ? 0 : h) && !net.nodes.some(nd => Math.hypot(nd.x - x, nd.y - y) < 6);
            addNode(x0, y0, chamberFloor(0));
            let dir = rnd(115, k) * Math.PI * 2;
            const count = rint(LV.nodes, 116, k);
            for (let a = 1; a < count; a++) {
                const parent = net.nodes.length > 1 && rnd(117, k, a) < CV.branchChance ? net.nodes[Math.floor(rnd(118, k, a) * net.nodes.length)] : net.nodes[net.nodes.length - 1];
                for (let t = 0; t < 8; t++) {
                    const th = dir + (rnd(119, k, a, t) - 0.5) * 1.8, d = rfl(CV.nodeGap, 120, k, a, t);
                    const x = Math.round(parent.x + Math.cos(th) * d), y = Math.round(parent.y + Math.sin(th) * d), F = chamberFloor(a);
                    if (!ok(x, y, F, rint(LV.chamberH, 114, k, net.nodes.length))) continue;
                    dir = th;
                    net.edges.push({ a: parent, b: addNode(x, y, F), kind: "passage" });
                    break;
                }
            }
            if (net.nodes.length < 2) return null;
            // Dead ends: short passages that end in a small alcove.
            const dead = rint(CV.deadEnds, 121, k);
            for (let a = 0; a < dead; a++) {
                const from = net.nodes[Math.floor(rnd(122, k, a) * net.nodes.length)];
                const th = rnd(123, k, a) * Math.PI * 2, d = 4 + rnd(124, k, a) * 5;
                const x = Math.round(from.x + Math.cos(th) * d), y = Math.round(from.y + Math.sin(th) * d);
                if (!hostOk(z, x, y, from.F, z === 2 ? 0 : hP)) continue;
                net.edges.push({ a: from, b: addNode(x, y, from.F, true), kind: "deadEnd" });
            }
            // A loop between two chambers close to each other that aren't joined yet.
            if (rnd(125, k) < CV.loopChance) {
                const ch = net.nodes.filter(nd => !nd.stub);
                loop: for (let i = 0; i < ch.length; i++) for (let j = i + 2; j < ch.length; j++) {
                    if (Math.hypot(ch[i].x - ch[j].x, ch[i].y - ch[j].y) > 18) continue;
                    if (net.edges.some(e => (e.a === ch[i] && e.b === ch[j]) || (e.a === ch[j] && e.b === ch[i]))) continue;
                    net.edges.push({ a: ch[i], b: ch[j], kind: "loop" });
                    break loop;
                }
            }
            // Multi-Z: the last chamber drops (or rises) one level, the passage to it sloping (1 ft per cell or less).
            if (z < 2 && z > -2 && rnd(126, k) < CV.multiZChance) {
                const leaf = net.nodes.filter(nd => !nd.stub).pop(), dz = z > -1 ? -1 : (rnd(127, k) < 0.5 ? -1 : 1);
                const F = leaf.F + dz * STRATA, e = net.edges.find(ed => ed.b === leaf);
                if (e && Math.hypot(e.a.x - leaf.x, e.a.y - leaf.y) >= STRATA + 2 && F >= 1 && hostOk(z + dz, leaf.x, leaf.y, F, leaf.h)) {
                    leaf.F = F;
                    net.multiZ = true;
                }
            }
            // A mouth: a passage out to open ground at the network's floor height (found when carving: +2's needs the massif).
            net.wantsMouth = z >= 0 && rnd(128, k) < CV.mouthChance;
            if (z < 2 && rnd(129, k) < CV.skylightChance) net.skylight = { node: net.nodes[Math.floor(rnd(130, k) * net.nodes.length)] };
            return net;
        }
        // Shafts: a chamber of one network over a chamber of a network one level down, joined through the rock between.
        for (const A of networks) for (const B of networks) {
            if (B.z !== A.z - 1 || A.joins.length || B.joins.length || rnd(131, A.id, B.id) >= CV.shaftChance) continue;
            let pick = null;
            for (const a of A.nodes) if (!a.stub) for (const b of B.nodes) if (!b.stub) {
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                if (d <= CV.shaftReach && (!pick || d < pick.d)) pick = { a, b, d };
            }
            if (!pick) continue;
            const LB = CV.levels[String(B.z)];
            if (!hostOk(B.z, pick.a.x, pick.a.y, pick.b.F, pick.b.h)) continue;
            // B reaches under A's chamber with a passage to a small chamber there; the shaft rises from it.
            const under = { x: pick.a.x, y: pick.a.y, F: pick.b.F, stub: false, rx: 2, ry: 2, rot: 0, h: rint(LB.chamberH, 132, A.id, B.id) };
            B.nodes.push(under);
            if (pick.d >= 1) B.edges.push({ a: pick.b, b: under, kind: "passage" });
            const shaft = { x: pick.a.x, y: pick.a.y, r: 1.2 + rnd(133, A.id, B.id) * 0.6, from: under.F, to: pick.a.F, upper: A.id, lower: B.id };
            A.joins.push(B.id); B.joins.push(A.id);
            A.multiZ = B.multiZ = true;
            out.shafts.push(shaft);
        }

        // +2 massifs: the summit rock round a +2 network rises above the model. Its +2 strata are solid and its column
        // is capped (the cap: rock above +2, the network's roof).
        const LV2 = CV.levels["2"];
        const inNetwork = (net, fn, extra) => {
            for (const nd of net.nodes) ellipse(nd, extra, fn);
            for (const e of net.edges) stroke(passagePoints(net, e), extra, (i, d, p) => fn(i, p.F));
        };
        function ellipse(nd, extra, fn) {
            const R = Math.max(nd.rx, nd.ry) * 1.2 + extra + 1, c = Math.cos(nd.rot), s = Math.sin(nd.rot);
            for (let y = Math.floor(nd.y - R); y <= Math.ceil(nd.y + R); y++) for (let x = Math.floor(nd.x - R); x <= Math.ceil(nd.x + R); x++) {
                if (!inArea(x, y)) continue;
                const dx = x - nd.x, dy = y - nd.y, u = (dx * c + dy * s) / (nd.rx + extra), v = (-dx * s + dy * c) / (nd.ry + extra);
                const th = Math.atan2(dy, dx), rim = 0.85 + 0.3 * valueNoise(seed, salt + 7, Math.cos(th) * 2 + nd.x, Math.sin(th) * 2 + nd.y, 1);
                if (u * u + v * v <= rim * rim) fn(y * size + x, nd.F);
            }
        }
        function passagePoints(net, e) {
            const L = Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y), steps = Math.max(2, Math.ceil(L * 2));
            const bend = (rnd(140, net.id, e.a.x, e.b.x, e.a.y) - 0.5) * Math.min(6, L * 0.3), nx = -(e.b.y - e.a.y) / (L || 1), ny = (e.b.x - e.a.x) / (L || 1);
            const pts = [];
            for (let s = 0; s <= steps; s++) {
                const t = s / steps, off = Math.sin(t * Math.PI) * bend;
                pts.push({ x: e.a.x + 0.5 + (e.b.x - e.a.x) * t + nx * off, y: e.a.y + 0.5 + (e.b.y - e.a.y) * t + ny * off,
                    w: rfl(CV.passageHalf, 141, net.id, e.a.x, e.b.y), F: Math.round(e.a.F + (e.b.F - e.a.F) * t), h: e.kind === "deadEnd" ? e.b.h : net.hP });
            }
            return pts;
        }
        for (const net of networks) {
            if (net.z !== 2) continue;
            net.massif = [];
            const mark = new Set();
            inNetwork(net, i => mark.add(i), LV2.massifMargin);
            for (const i of [...mark].sort((p, q) => p - q)) {
                if (S[i] !== 2 || (lock[i] & NO_CAVE) || wt[i] < 1 || touched[i] & 8) continue;
                for (let e = 21; e < E_TOP; e++) setE(i, e, M_STONE);
                clearConn(i, 20, 24);
                top[i] = E_TOP;
                touched[i] |= 8;
                bs[4].caps.set(i, M_STONE | (rint(LV2.capThickness, 150, i) << 8));
                net.massif.push(i);
            }
            out.massifCells += net.massif.length;
        }
        out.capCells = bs[4].caps.size;

        // Carving a void: strata F .. C - 1 of cell i become air, where C = min(F + h, the rock's top - roofMin) (a
        // capped column may be carved to the top of +2: the cap is its roof). The floor stratum F - 1 must be solid; the
        // carve stops a stratum short of an existing void above (a 1 ft slab between them), and skips a cell whose void
        // would hold less than 3 ft, a fluid, or a locked cell.
        const caveOwner = new Int32Array(n).fill(-1);
        const carveVoid = (i, F, h, id) => {
            if ((lock[i] & NO_CAVE) || wt[i] < 1 || F < 1 || F >= E_TOP || !solidE(i, F - 1)) return 0;
            const capped = bs[4].caps.has(i);
            let C = Math.min(F + h, capped ? E_TOP : top[i] - CV.roofMin, E_TOP);
            for (let e = F; e < C; e++) {
                const v = getE(i, e);
                if (FLUID_B[v] === 1) return 0;
                if (SOLID_B[v] !== 1) { C = e - 1; break; }
            }
            if (C - F < 3) return 0;
            for (let e = F; e < C; e++) setE(i, e, M_AIR);
            clearConn(i, F, C - 1);
            touched[i] |= 2;
            caveOwner[i] = id;
            return C - F;
        };
        // The open cell nearest a chamber whose ground is at the network's floor: a valley cell for the ground's caves, a
        // +1 terrace for +1's, the open summit outside the massif for +2's.
        function findMouth(net) {
            let best = null;
            const R = CV.mouthReach;
            for (const nd of net.nodes) {
                if (nd.stub) continue;
                for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
                    const x = nd.x + dx, y = nd.y + dy, dist = Math.hypot(dx, dy);
                    if (dist > R || !inArea(x, y) || (best && dist >= best.dist)) continue;
                    const i = y * size + x;
                    if (wt[i] < 1 || (lock[i] & (NO_CAVE | NO_CUT))) continue;
                    const want = net.z === 2 ? S[i] === 2 && !(touched[i] & 8) && top[i] === 21
                        : S[i] === net.z && top[i] >= nd.F && top[i] <= nd.F + 1;
                    if (!want || nearWater(i)) continue;
                    best = { node: nd, x, y, dist };
                }
            }
            return best;
        }
        for (const net of networks) {
            const d = { id: net.id, kind: "cave", level: net.z, floor: net.F0, chambers: 0, passages: 0, deadEnds: 0, loops: 0, multiZ: false,
                nodes: net.nodes.map(nd => ({ x: nd.x, y: nd.y, floor: nd.F, stub: nd.stub })), cells: 0, maxClearance: 0, massifCells: (net.massif || []).length,
                mouth: null, skylight: null, joins: net.joins.slice(), levels: [] };
            const carve = (i, F, h) => { const c = carveVoid(i, F, h, net.id); if (c) { d.cells++; if (c > d.maxClearance) d.maxClearance = c; } };
            for (const nd of net.nodes) {
                if (!nd.stub) d.chambers++;
                ellipse(nd, 0, i => {
                    // Uneven chamber floors: raised patches a stratum up (partial heights inside the cave).
                    const F = nd.F + (valueNoise(seed, salt + 9, i % size, (i / size) | 0, 3) > 0.72 && !nd.stub ? 1 : 0);
                    carve(i, F, nd.h - (F - nd.F));
                });
            }
            for (const e of net.edges) {
                if (e.kind === "deadEnd") d.deadEnds++; else if (e.kind === "loop") d.loops++; else d.passages++;
                stroke(passagePoints(net, e), 0, (i, dist, p) => carve(i, p.F, p.h));
            }
            if (net.wantsMouth) net.mouth = findMouth(net);
            if (net.mouth) {
                const nd = net.mouth.node, exitTop = net.z === 2 ? 21 : top[net.mouth.y * size + net.mouth.x];
                const e = { a: nd, b: { x: net.mouth.x, y: net.mouth.y, F: exitTop, h: net.hP }, kind: "mouth" };
                const before = d.cells;
                stroke(passagePoints(net, e), 0, (i, dist, p) => {
                    if (touched[i] & 8 || (i !== net.mouth.y * size + net.mouth.x && top[i] > p.F)) carve(i, p.F, p.h);
                });
                if (d.cells > before) d.mouth = { x: net.mouth.x, y: net.mouth.y, floor: exitTop };
            }
            net.desc = d;
            out.caves.push(d);
        }
        // Shafts between networks, then skylights up to the open surface through thin rock. As a cave void, a shaft or a
        // skylight never carves through a fluid: a column holding a fluid stratum anywhere in its interval is left as it is
        // (checked before anything is written), and only solid strata become air.
        const fluidIn = (i, e0, e1) => { for (let e = e0; e < e1; e++) if (FLUID_B[getE(i, e)] === 1) return true; return false; };
        const disc = (cx, cy, r, fn) => {
            for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
                if (inArea(x, y) && (x + 0.5 - cx - 0.5) ** 2 + (y + 0.5 - cy - 0.5) ** 2 <= r * r) fn(y * size + x);
            }
        };
        for (const sh of out.shafts) {
            let cells = 0;
            disc(sh.x, sh.y, sh.r, i => {
                if ((lock[i] & NO_CAVE) || wt[i] < 1) return;
                const hi = Math.min(sh.to, top[i] - CV.roofMin);   // up to and through the upper chamber's floor stratum
                if (fluidIn(i, sh.from, hi)) return;
                let changed = false;
                for (let e = sh.from; e < hi; e++) if (SOLID_B[getE(i, e)] === 1) { setE(i, e, M_AIR); changed = true; }
                if (changed) { clearConn(i, sh.from, hi - 1); touched[i] |= 4; cells++; }
            });
            sh.cells = cells;
        }
        for (const net of networks) {
            if (!net.skylight) continue;
            const nd = net.skylight.node, r = 1.2;
            let ok = true, cells = 0;
            disc(nd.x, nd.y, r, i => {
                if ((lock[i] & (NO_CUT | NO_CAVE)) || wt[i] < 1 || minTop[i] > nd.F || top[i] - (nd.F + nd.h) > CV.skylightMax || nearWater(i)) ok = false;
            });
            if (!ok) continue;
            disc(nd.x, nd.y, r, i => {
                if (!solidE(i, nd.F - 1) || fluidIn(i, nd.F, top[i])) return;
                let changed = false;
                for (let e = nd.F; e < top[i]; e++) if (SOLID_B[getE(i, e)] === 1) { setE(i, e, M_AIR); changed = true; }
                if (changed) { clearConn(i, nd.F, top[i] - 1); top[i] = topOf(i); touched[i] |= 4; cells++; }
            });
            if (cells) { net.desc.skylight = { x: nd.x, y: nd.y, floor: nd.F, cells }; out.skylights.push({ network: net.id, x: nd.x, y: nd.y, floor: nd.F, cells }); }
        }

        //---------------------------------------------------------------- cuts
        const CU = P.cuts;
        const cutTop = new Uint8Array(n).fill(255);
        // The first-air elevation a cut's cross-section gives a cell of natural top T: g = distance / half-width (0 on
        // the centre line, 1 at the edge), b = the bed there. T: not cut.
        const profileF = (profile, g, T, b, w, step) => {
            if (b >= T) return T;
            const span = T - b, lip = 1 + 1 / Math.max(1, w);
            switch (profile) {
                case "vertical": return g <= 1 ? b : g <= lip ? T - 1 : T;
                case "u": return g <= 1 ? b + Math.round(span * g * g) : T;
                case "flat": return g <= 0.6 ? b : g <= 1 ? b + Math.round(span * (g - 0.6) / 0.4) : T;
                case "steep": return g <= 0.8 ? b : g <= 1 ? b + Math.round(span * (g - 0.8) / 0.2) : g <= lip ? T - 1 : T;
                case "stepped": return g <= 1 ? Math.min(T, b + step * Math.floor(g * Math.max(1, Math.ceil(span / step)))) : T;
                case "funnel": return g <= 1 ? b + Math.round(span * Math.pow(g, 1.6)) : g <= lip ? T - 1 : T;
                case "bowl": return g <= 1 ? T - Math.round(span * (1 - g * g)) : T;
                case "throat": return g <= 0.45 ? b : g <= 1 ? b + Math.round(span * Math.pow((g - 0.45) / 0.55, 1.3)) : g <= lip ? T - 1 : T;
                default: return T;
            }
        };
        const latC = Math.max(1, Math.floor(size / CU.spacing));
        for (let ly = 0; ly < latC; ly++) for (let lx = 0; lx < latC; lx++) {
            const k = ly * latC + lx;
            if (rnd(201, k) >= CU.chance) continue;
            const x = Math.floor((lx + 0.15 + 0.7 * rnd(202, k)) * CU.spacing), y = Math.floor((ly + 0.15 + 0.7 * rnd(203, k)) * CU.spacing);
            if (!inArea(x, y)) continue;
            const i0 = y * size + x;
            if (wt[i0] < 1 || (lock[i0] & NO_CUT) || nearWater(i0) || (touched[i0] & 8)) continue;
            let cls = CU.classes[CU.classes.length - 1], acc = 0;
            const cr = rnd(204, k);
            for (const c of CU.classes) { acc += c.p; if (cr < acc) { cls = c; break; } }
            const family = familyAt(x, y);
            const choices = Object.keys(CU.families[family]).filter(t => CU.types[t].deep || cls.key === "shallow" || cls.key === "medium");
            let wsum = 0;
            for (const t of choices) wsum += CU.families[family][t];
            let pick = rnd(205, k) * wsum, type = choices[choices.length - 1];
            for (const t of choices) { pick -= CU.families[family][t]; if (pick < 0) { type = t; break; } }
            const spec = CU.types[type], Hs = top[i0];
            const floorMin = Math.max(P.minBed, cls.floor);
            const bed0 = cls.bed ? rint(cls.bed, 206, k) : Math.max(floorMin, Hs - rint(cls.depth, 206, k));
            if (bed0 >= Hs) continue;
            const f = { id: out.cuts.length, kind: "cut", type, family, depthClass: cls.key, anchor: { x, y }, hostTop: Hs, bed: bed0, form: spec.form, profile: spec.profile,
                cells: 0, minFloor: 99, maxDepth: 0, floorLevel: null };
            const step = spec.profile === "stepped" ? 2 + Math.floor(rnd(207, k) * 2) : 1;
            const put = (i, F, dist, fw) => {
                if ((lock[i] & NO_CUT) || (touched[i] & 8) || wt[i] <= 0) return;
                const T = top[i];
                if (F >= T) return;
                if (nearWater(i)) return;                           // whatever the cell's height: water beside a trench would pour in
                let Fw = T - Math.round((T - F) * wt[i]);            // fades out toward area edges and flat centres
                Fw = Math.max(Fw, minTop[i], floorMin);
                if (Fw >= T || Fw >= cutTop[i]) return;
                cutTop[i] = Fw;
                ownerCut[i] = f.id;
            };
            const bedAt = (t, u) => {
                const bn = Math.round((valueNoise(seed, salt + 13 + k, t + 4096, 0, 9) - 0.5) * 2.4);
                return Math.max(floorMin, Math.round(Hs - (Hs - bed0) * (1 - 0.7 * u * u * u)) + bn);
            };
            if (spec.form === "line" || spec.form === "arc") {
                const pts = [];
                if (spec.form === "line") {
                    const len = rfl(spec.len, 208, k), half = rfl(spec.half, 209, k), heading = rnd(210, k) * Math.PI * 2, stepL = 0.5, nHalf = Math.ceil(len / 2 / stepL);
                    for (const dir of [-1, 1]) {
                        let px = x + 0.5, py = y + 0.5;
                        for (let s = 0; s <= nHalf; s++) {
                            const t = dir * s * stepL;
                            if (dir === 1 || s > 0) pts.push({ t, x: px, y: py });
                            const th = heading + spec.bend * (valueNoise(seed, salt + 11 + k, t + 4096, 0, 14) - 0.5) * 2;
                            px += dir * Math.cos(th) * stepL;
                            py += dir * Math.sin(th) * stepL;
                        }
                    }
                    pts.sort((p, q) => p.t - q.t);
                    for (const p of pts) {
                        const u = Math.min(1, Math.abs(p.t) / (len / 2));
                        p.w = half * (0.75 + 0.5 * valueNoise(seed, salt + 12 + k, p.t + 4096, 0, 10)) * (0.35 + 0.65 * smooth(Math.min(1, (1 - u) / 0.2)));
                        p.b = bedAt(p.t, u);
                    }
                    f.length = Math.round(len);
                } else {
                    const R = rfl(spec.radius, 208, k), span = rfl(spec.span, 209, k), half = rfl(spec.half, 210, k), c0 = rnd(211, k) * Math.PI * 2;
                    const cx = x + 0.5 - Math.cos(c0 + span / 2) * R, cy = y + 0.5 - Math.sin(c0 + span / 2) * R, steps = Math.ceil(R * span * 2);
                    for (let s = 0; s <= steps; s++) {
                        const a = c0 + span * s / steps, t = (s / steps - 0.5) * R * span, u = Math.abs(s / steps - 0.5) * 2;
                        pts.push({ t, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, w: half * (0.35 + 0.65 * smooth(Math.min(1, (1 - u) / 0.2))), b: bedAt(t, u) });
                    }
                    f.length = Math.round(R * span);
                }
                stroke(pts, 1.5, (i, d, p) => put(i, profileF(spec.profile, d / Math.max(0.5, p.w), top[i], p.b, p.w, step), d, p.w));
            } else {
                const pits = [];
                if (spec.form === "round") pits.push({ x: x + 0.5, y: y + 0.5, r: rfl(spec.r, 208, k), b: bed0 });
                else {
                    const count = rint(spec.pits, 208, k), heading = rnd(209, k) * Math.PI * 2;
                    let px = x + 0.5, py = y + 0.5;
                    for (let a = 0; a < count; a++) {
                        pits.push({ x: px, y: py, r: rfl(spec.r, 210, k, a), b: Math.max(floorMin, bed0 + (a === Math.floor(count / 2) ? 0 : rint([0, 2], 211, k, a))) });
                        const g = rfl(spec.gap, 212, k, a) + 2, th = heading + (rnd(213, k, a) - 0.5) * 0.8;
                        px += Math.cos(th) * g;
                        py += Math.sin(th) * g;
                    }
                    // The collapsed tube's shallow trough between the pits.
                    const tpts = [];
                    for (let a = 0; a + 1 < pits.length; a++) for (let s = 0; s <= 8; s++) {
                        const t = s / 8;
                        tpts.push({ x: pits[a].x + (pits[a + 1].x - pits[a].x) * t, y: pits[a].y + (pits[a + 1].y - pits[a].y) * t, w: 0.9, b: Math.max(floorMin, Hs - 2) });
                    }
                    if (tpts.length) stroke(tpts, 0.5, (i, d, p) => put(i, profileF("u", d / p.w, top[i], Math.max(floorMin, top[i] - 2), p.w, 1), d, p.w));
                }
                for (const pit of pits) {
                    const R = pit.r * 1.25 + 2;
                    for (let yy = Math.floor(pit.y - R); yy <= Math.ceil(pit.y + R); yy++) for (let xx = Math.floor(pit.x - R); xx <= Math.ceil(pit.x + R); xx++) {
                        if (!inArea(xx, yy)) continue;
                        const dx = xx + 0.5 - pit.x, dy = yy + 0.5 - pit.y, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
                        const rr = pit.r * (0.78 + 0.44 * valueNoise(seed, salt + 14 + k, Math.cos(th) * 2.2 + 8, Math.sin(th) * 2.2 + 8, 1));
                        const i = yy * size + xx;
                        put(i, profileF(spec.profile, d / rr, top[i], pit.b, rr, 1), d, rr);
                    }
                }
                f.pits = pits.length;
            }
            out.cuts.push(f);
        }
        // Carve: every stratum from the cut's floor to the rock's top becomes air (fluids included: none are left
        // floating), and the connectors of the levels it reaches are dropped.
        for (let i = 0; i < n; i++) {
            const F = cutTop[i];
            if (F === 255 || F >= top[i]) continue;
            let fluid = false;
            for (let e = F; e < top[i]; e++) if (FLUID_B[getE(i, e)] === 1) fluid = true;
            if (fluid) continue;
            for (let e = F; e < top[i]; e++) setE(i, e, M_AIR);
            clearConn(i, F, top[i] - 1);
            const f = out.cuts[ownerCut[i]];
            const depth = top[i] - F;
            out.carvedStrata += depth;
            out.cutCells++;
            if (f) {
                f.cells++;
                if (depth > f.maxDepth) f.maxDepth = depth;
                if (F < f.minFloor) { f.minFloor = F; f.deepest = { x: i % size, y: (i / size) | 0 }; }
            }
            top[i] = topOf(i);
            touched[i] |= 1;
        }

        //---------------------------------------------------------------- ramps where a carved slope steps 1 ft up onto the next level
        const floorsOf = (i, list) => {
            list.length = 0;
            for (let e = 1; e < E_TOP; e++) if (!solidE(i, e) && solidE(i, e - 1)) list.push(e);
            return list;
        };
        const fa = [], fb = [];
        for (let i = 0; i < n; i++) {
            if (!(touched[i] & 7)) continue;
            const x = i % size, y = (i / size) | 0;
            floorsOf(i, fa);
            for (const f of fa) {
                const zf = ((f / STRATA) | 0) - 2;
                if (zf >= 2) continue;
                let clear = 0;
                for (let e = f; e < E_TOP && !solidE(i, e); e++) clear++;
                if (clear < 3 || connOf(CONN[zf + 2], i) !== 0) continue;
                let ramp = false;
                for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                    if (!inArea(x + dx, y + dy)) continue;
                    for (const g of floorsOf((y + dy) * size + x + dx, fb)) if (((g / STRATA) | 0) - 2 === zf + 1 && g - f === 1) ramp = true;
                }
                if (ramp) { CONN[zf + 2][i >> 1] |= RAMP << ((i & 1) << 2); out.rampsAdded++; }
            }
        }

        //---------------------------------------------------------------- no floating natural mass
        // Every solid stratum must reach bedrock (elevation 0) or the area's edge (the next area) through solid strata
        // (up, down or sideways). Whatever the carve left unconnected is removed.
        {
            const N = n * E_TOP, sol = new Uint8Array(N), q = new Int32Array(N);
            for (let e = 0; e < E_TOP; e++) for (let i = 0; i < n; i++) sol[e * n + i] = solidE(i, e) ? 1 : 0;
            let qh = 0, qt = 0;
            const push = v => { if (sol[v] === 1) { sol[v] = 2; q[qt++] = v; } };
            for (let i = 0; i < n; i++) push(i);
            for (let e = 0; e < E_TOP; e++) for (let k = 0; k < size; k++) {
                push(e * n + k); push(e * n + (size - 1) * size + k); push(e * n + k * size); push(e * n + k * size + size - 1);
            }
            while (qh < qt) {
                const v = q[qh++], e = (v / n) | 0, i = v - e * n, x = i % size;
                if (e > 0) push(v - n);
                if (e < E_TOP - 1) push(v + n);
                if (x > 0) push(v - 1);
                if (x < size - 1) push(v + 1);
                if (i >= size) push(v - size);
                if (i < n - size) push(v + size);
            }
            for (let v = 0; v < N; v++) {
                if (sol[v] !== 1) continue;
                const e = (v / n) | 0, i = v - e * n;
                setE(i, e, M_AIR);
                clearConn(i, e, e);
                if (out.floatingRemoved++ < 8) (out.floatingAt = out.floatingAt || []).push({ x: i % size, y: (i / size) | 0, e, owner: touched[i] });
            }
        }

        // Descriptors: the floor levels each cave reaches (from the strata).
        for (const net of networks) {
            const lv = new Set();
            const f = [];
            for (const nd of net.nodes) {
                const i = nd.y * size + nd.x;
                for (const e of floorsOf(i, f)) if (e >= nd.F - 1 && e <= nd.F + 1) lv.add(((e / STRATA) | 0) - 2);
            }
            net.desc.levels = [...lv].sort((p, q) => p - q);
            net.desc.multiZ = net.desc.levels.length > 1 || net.joins.length > 0;
        }
        for (const f of out.cuts) {
            if (f.minFloor === 99) { f.minFloor = null; f.floorLevel = null; continue; }
            f.floorLevel = ((f.minFloor / STRATA) | 0) - 2;
            f.hostLevel = ((f.hostTop - 1) / STRATA | 0) - 2;
        }
        out.caveCells = 0;
        for (let i = 0; i < n; i++) if (touched[i] & 2) out.caveCells++;
        out.ms = performance.now() - t0;
        bs[2].features = out;
        return out;
    }

    //-------------------------------------------------------------------------
    // The ceiling cap (19B): rock above +2 over a column where the mountain rises beyond the model (a +2 massif). The
    // model has no level above +2; a cap is the minimal record of the rock there: material, thickness (ft), HP. It is
    // opaque (hasOpaqueOverburden, continuousAirHeight), carries a +2 floor's headroom, blocks fluids rising out of the
    // top, and can be damaged and breached like a stratum (applyCapDamage). A generator-5 baseline keeps its caps in
    // +2's baseline (caps: Map cell -> material | thickness << 8, at full HP); a changed cap is saved sparse in
    // UF.World.state.levels["2"].caps["ax,ay"][cell] = 6 hex digits (material, thickness, HP; "000000" = breached).

    const capState = { st: null, map: null };
    function capDeltas(st) {
        if (capState.st === st) return capState.map;
        capState.st = st;
        capState.map = new Map();
        const L = st && st.levels && st.levels["2"], saved = L && L.caps;
        if (!saved || typeof saved !== "object") return capState.map;
        const n = st.size * st.size;
        for (const ak in saved) {
            const a = parseAreaKey(ak), cells = saved[ak];
            if (!a || !cells || typeof cells !== "object") { console.error(`DEUS_Levels: saved caps of area "${ak}" could not be read`); continue; }
            let map = null;
            for (const k in cells) {
                const i = Number(k), s = cells[k];
                const code = typeof s === "string" && /^[0-9a-fA-F]{6}$/.test(s) ? parseInt(s.slice(0, 2), 16) | (parseInt(s.slice(2, 4), 16) << 8) | (parseInt(s.slice(4, 6), 16) << 16) : -1;
                const ok = code === 0 || (code > 0 && SOLID_B[code & 0xff] === 1 && ((code >> 8) & 0xff) > 0 && ((code >> 16) & 0xff) > 0);
                if (!Number.isInteger(i) || i < 0 || i >= n || !ok) { console.error(`DEUS_Levels: saved cap ${ak} cell ${k} ${JSON.stringify(s)} could not be read and was skipped`); continue; }
                if (!map) { map = new Map(); capState.map.set(a.x + a.y * AREA_STRIDE, map); }
                map.set(i, code);
            }
        }
        return capState.map;
    }
    // A column's cap as one number (no allocation): 0 = none (open sky above +2), else material byte | thickness << 8 |
    // HP (0..255) << 16.
    function capCode(st, ax, ay, i) {
        const cd = capDeltas(st).get(ax + ay * AREA_STRIDE);
        if (cd !== undefined) { const v = cd.get(i); if (v !== undefined) return v; }
        const b = baseOf(st, 2, ax, ay);
        if (!b || !b.caps) return 0;
        const c = b.caps.get(i);
        return c === undefined ? 0 : c | (255 << 16);
    }
    function capInfo(code) {
        if (!code) return null;
        const mat = STRATA_MATERIALS[code & M_ID], thickness = (code >> 8) & 0xff, hp = (code >> 16) & 0xff;
        return { material: mat.key, thickness, hp, maxHP: mat.maxHP * thickness, remainingHP: mat.maxHP * thickness * hp / 255,
            opaque: mat.solid, support: mat.support, anchored: true };
    }
    // Store a column's cap (0: breached) and tell the world: +2's derived cell reads the cap (and +1's reads +2).
    function writeCap(st, ax, ay, x, y, code, cause) {
        const i = y * st.size + x, before = capCode(st, ax, ay, i);
        if (before === code) return false;
        const from = derivePacked(st, ax, ay, i, 2);
        const b = baseOf(st, 2, ax, ay), base = b && b.caps && b.caps.has(i) ? b.caps.get(i) | (255 << 16) : 0;
        const ai = ax + ay * AREA_STRIDE, key = areaKey(ax, ay), L = st.levels["2"];
        let am = capDeltas(st).get(ai);
        if (code === base) {
            if (am) { am.delete(i); if (!am.size) capDeltas(st).delete(ai); }
            if (L.caps && L.caps[key]) { delete L.caps[key][i]; if (!Object.keys(L.caps[key]).length) delete L.caps[key]; if (!Object.keys(L.caps).length) delete L.caps; }
        } else {
            if (!am) { am = new Map(); capDeltas(st).set(ai, am); }
            am.set(i, code);
            L.caps = L.caps || {};
            const hx = v => (v & 0xff).toString(16).padStart(2, "0");
            (L.caps[key] = L.caps[key] || {})[i] = hx(code) + hx(code >> 8) + hx(code >> 16);
        }
        refreshPacked(st, 2, ax, ay, i);
        const to = derivePacked(st, ax, ay, i, 2);
        const ref = { area: { x: ax, y: ay }, x, y, z: 2 };
        emit("levels:capChanged", ref, { before: capInfo(before), after: capInfo(code), cause });
        if (from !== to) {
            redrawAround(ax, ay, x, y, 2);
            emit("levels:shapeChanged", ref, unpack(from), unpack(to));
            notifyWorldCellChanged(ref, unpack(from), unpack(to), cause);
        }
        return true;
    }
    /** A column's cap: { material, thickness, hp, maxHP, remainingHP, opaque, support, anchored, changed } or null. */
    function capAt(a, b, c, d, e) {
        if (!cellQuery(a, b, c, d, e === undefined && typeof a === "number" ? 2 : e)) return null;
        const code = capCode(qSt, qAx, qAy, qI), info = capInfo(code);
        if (info) { const am = capDeltas(qSt).get(qAx + qAy * AREA_STRIDE); info.changed = !!(am && am.has(qI)); }
        return info;
    }
    /** Set (spec { material, thickness 1..255, hp 1..255 }) or remove (null) a column's cap. Returns true or false (lastRefusal). */
    function setCap(ref, spec, opts = {}) {
        const W = World(), st = W && W.state, r = refOf(ref || {});
        const refuse = reason => { lastRefusal = { ref: { area: { x: r.ax, y: r.ay }, x: r.x, y: r.y, z: 2 }, cap: spec, reason }; return false; };
        if (!st || !st.levels || !st.levels["2"]) return refuse("no levels in this world");
        if (!schemaKnown(st)) return refuse(`this save's strata schema ${JSON.stringify(st.strataSchemaVersion)} is unknown: no changes are written`);
        if (!W.inWorld(r.ax, r.ay, 2) || r.x < 0 || r.y < 0 || r.x >= st.size || r.y >= st.size) return refuse(`cell (${r.x},${r.y}) doesn't exist`);
        let code = 0;
        if (spec) {
            const id = typeof spec.material === "string" ? MATERIAL_ID.get(spec.material) : spec.material;
            const t = spec.thickness, hp = spec.hp === undefined ? 255 : spec.hp;
            if (id === undefined || SOLID_B[id & 0xff] !== 1 || (id & M_BUILT)) return refuse(`a cap is a natural solid material, not ${JSON.stringify(spec.material)}`);
            if (!Number.isInteger(t) || t < 1 || t > 255) return refuse("thickness must be 1..255 ft");
            if (!Number.isInteger(hp) || hp < 1 || hp > 255) return refuse("hp must be 1..255");
            code = id | (t << 8) | (hp << 16);
        }
        writeCap(st, r.ax, r.ay, r.x, r.y, code, opts.cause || "setCap");
        return true;
    }
    /**
     * Damage a column's cap: applyCapDamage(ref | area, x, y, damage, damageType = "impact", { source }). The cap is one
     * body of material x thickness HP points (resist by damage type, hooks as a stratum's); at 0 HP it is breached
     * (removed): levels:capBreached, and the column below is open to the sky.
     */
    function applyCapDamage(a, b, c, d, e, f) {
        let ref, damage, damageType, opts;
        if (a && typeof b === "number" && typeof c === "number") { ref = { area: a, x: b, y: c, z: 2 }; damage = d; damageType = e; opts = f; }
        else { ref = a; damage = b; damageType = c; opts = d; }
        damageType = typeof damageType === "string" && damageType ? damageType : "impact";
        const W = World(), st = W && W.state, r = refOf(ref || {});
        if (!st || !st.levels || !schemaKnown(st)) return { ok: false, reason: "no writable levels in this world" };
        if (!W.inWorld(r.ax, r.ay, 2) || r.x < 0 || r.y < 0 || r.x >= st.size || r.y >= st.size) return { ok: false, reason: `cell (${r.x},${r.y}) doesn't exist` };
        if (badNumber(damage) || damage < 0) return { ok: false, reason: `damage ${JSON.stringify(damage)} isn't a number >= 0` };
        const i = r.y * st.size + r.x, code = capCode(st, r.ax, r.ay, i);
        if (!code) return { ok: false, reason: "no cap over this column" };
        const mat = STRATA_MATERIALS[code & M_ID], thickness = (code >> 8) & 0xff, hpBefore = (code >> 16) & 0xff;
        const cref = { area: { x: r.ax, y: r.ay }, x: r.x, y: r.y, z: 2 };
        const ctx = { ref: cref, stratum: "cap", material: mat.key, constructed: false, damageType, damage,
            effective: damage * (mat.resist[damageType] !== undefined ? mat.resist[damageType] : 1), source: (opts && opts.source) || null };
        runHooks(mat.key, ctx);
        runHooks("*", ctx);
        const hpAfter = ctx.effective > 0 ? Math.max(0, hpBefore - Math.ceil(ctx.effective * 255 / (mat.maxHP * thickness) - 1e-9)) : hpBefore;
        const res = { ok: true, area: cref.area, x: r.x, y: r.y, material: mat.key, thickness, damage, effective: ctx.effective, hpBefore, hpAfter, breached: hpAfter === 0 };
        if (hpAfter !== hpBefore) writeCap(st, r.ax, r.ay, r.x, r.y, hpAfter === 0 ? 0 : (code & 0xffff) | (hpAfter << 16), `damage:${damageType}`);
        if (res.breached) emit("levels:capBreached", { area: cref.area, x: r.x, y: r.y, material: mat.key, thickness, debris: mat.debris, damageType, source: ctx.source });
        return res;
    }

    //-------------------------------------------------------------------------
    // Clearance (19B): continuous air in the column, in feet (strata), across levels. Physical data only: no creature's
    // needs are decided here.

    /**
     * The continuous AIR strata above a cell's standing surface, in feet: from the stratum stood on (the top of the
     * cell's solid base, or the S4 of the cell below when the cell's S0 is open; worldStrataElevationAt) up through the
     * cells above to the first stratum that isn't air: a solid one, or a fluid one (water and lava are not clearance: a
     * floor under a pool has 0 ft; the air above a fluid isn't counted). Infinity when every stratum above up to +2's S4
     * is air and the column has no cap (open sky); 0 for a solid cell; -1 when there is nothing to stand on (outside the
     * world, or an open cell over open space).
     * Arguments (ref), (area, x, y[, z]) or (ax, ay, x, y, z); no allocation.
     */
    function continuousAirHeight(a, b, c, d, e) {
        if (!cellQuery(a, b, c, d, e)) return -1;
        locate(qSt, qZ, qAx, qAy, qI, 1);
        let s = fillOf(rdM, rdO), z = qZ;
        if (s === STRATA) return 0;
        if (s === 0) {
            if (qZ === -2) return -1;
            locate(qSt, qZ - 1, qAx, qAy, qI, 0);
            if (SOLID_B[rdM[rdO + 4]] !== 1) return -1;
            locate(qSt, qZ, qAx, qAy, qI, 1);
        }
        let h = 0;
        for (;;) {
            while (s < STRATA) {
                if (rdM[rdO + s] !== M_AIR) return h;   // solid or fluid: the air run ends
                h++;
                s++;
            }
            if (z === 2) return capCode(qSt, qAx, qAy, qI) !== 0 ? h : Infinity;
            z++;
            s = 0;
            locate(qSt, z, qAx, qAy, qI, 2);
        }
    }
    /** Continuous air strata (ft) from column elevation e (0..24) upward in a cell, ending at the first solid or fluid
     *  stratum: 0 when e itself is solid or fluid; Infinity to the open sky (no cap). airRunAt(area, x, y, e) or
     *  airRunAt(ax, ay, x, y, e). No allocation. */
    function airRunAt(a, b, c, d, e) {
        let ax, ay, x, y, el;
        if (typeof a === "number") { ax = a; ay = b; x = c; y = d; el = e; }
        else { ax = a ? a.x | 0 : 0; ay = a ? a.y | 0 : 0; x = b; y = c; el = d; }
        if (!Number.isInteger(el) || el < 0 || el >= E_TOP || !cellQuery(ax, ay, x, y, ((el / STRATA) | 0) - 2)) return -1;
        let z = qZ, s = el % STRATA, h = 0;
        locate(qSt, z, qAx, qAy, qI, 1);
        for (;;) {
            while (s < STRATA) {
                if (rdM[rdO + s] !== M_AIR) return h;   // solid or fluid: the air run ends
                h++;
                s++;
            }
            if (z === 2) return capCode(qSt, qAx, qAy, qI) !== 0 ? h : Infinity;
            z++;
            s = 0;
            locate(qSt, z, qAx, qAy, qI, 2);
        }
    }

    //-------------------------------------------------------------------------
    // Old saves: legacy level changes (levels[z].cells, one packed shape per cell) to strata records (schema 1)

    /**
     * Bring a save's level changes to strata, in place, before the world is used: each legacy cells[area][i] packed shape
     * becomes a strata record (recordFromPacked; the baseline's natural pool fluid stays where the shape leaves air),
     * dropped when it equals the baseline; levels[z].cells is removed and st.strataSchemaVersion set to 1. Entries that
     * can't be read are kept, unapplied, in levels[z].unmigratedCells with a console.error; nothing is guessed. A save
     * with an unknown strata schema version is left untouched (console.error; its changes aren't read or written).
     * Returns the record (pushed to st.migrations when anything was converted or refused).
     */
    function migrateSaveToFiveStrata(st) {
        const rec = { rule: "strata", to: STRATA_SCHEMA, converted: 0, droppedAsBaseline: 0, invalid: 0, shapeChanged: 0, normalizedOpen: 0, errors: [] };
        const fail = msg => {
            rec.errors.push(msg);
            stats.strataSchemaErrors++;
            console.error(`DEUS_Levels: ${msg}`);
            return rec;
        };
        if (!st || typeof st !== "object" || !st.levels || typeof st.levels !== "object") return fail("strata migration: this save has no levels");
        if (st.strataSchemaVersion === STRATA_SCHEMA) { rec.already = true; return rec; }
        if (st.strataSchemaVersion !== undefined) return fail(`strata migration: unknown strata schema version ${JSON.stringify(st.strataSchemaVersion)}; the level changes of this save were not read and nothing is written to them`);
        const W = World();
        if (!W || W.state !== st) return fail("strata migration: the save isn't the live world state");
        const n = st.size * st.size, todo = [];
        const keep = (L, ak, k, v) => {
            L.unmigratedCells = L.unmigratedCells || {};
            if (k === null) L.unmigratedCells[ak] = v;
            else (L.unmigratedCells[ak] = L.unmigratedCells[ak] || {})[k] = v;
            rec.invalid++;
        };
        for (const z of LEVELS) {
            const L = st.levels[String(z)];
            if (!L || L.cells === undefined) continue;
            const cells = L.cells;
            delete L.cells;
            if (!cells || typeof cells !== "object" || Array.isArray(cells)) { keep(L, "*", null, cells); continue; }
            for (const ak in cells) {
                const a = parseAreaKey(ak), area = cells[ak];
                if (!a || !area || typeof area !== "object" || Array.isArray(area) || !W.inWorld(a.x, a.y, z)) { keep(L, ak, null, area); continue; }
                for (const k in area) {
                    const i = Number(k), p = area[k];
                    const ok = Number.isInteger(i) && i >= 0 && i < n && Number.isInteger(p) && p >= 0 && p <= 255 && (p & 7) >= SOLID && (p >> 4) < MATERIALS.length;
                    if (!ok) { keep(L, ak, k, p); continue; }
                    todo.push({ z, ax: a.x, ay: a.y, i, p });
                }
            }
        }
        st.strataSchemaVersion = STRATA_SCHEMA;
        for (const t of todo) {
            const r = recordFromPacked(t.p, currentRecord(st, t.z, t.ax, t.ay, t.i));
            if ((t.p & 7) === OPEN && (t.p & 0xf8) !== 0) rec.normalizedOpen++;   // an open cell's material and flag aren't geometry
            if (sameAsBaseline(baseOf(st, t.z, t.ax, t.ay), t.i, r)) { rec.droppedAsBaseline++; putDelta(st, t.z, t.ax, t.ay, t.i, null); }
            else putDelta(st, t.z, t.ax, t.ay, t.i, r);
            rec.converted++;
        }
        // The derived shapes agree with the legacy ones except an open cell over solid ground, which the strata read as a
        // floor on the ground's top (counted, not repaired).
        for (const t of todo) if ((derivePacked(st, t.ax, t.ay, t.i, t.z) & 7) !== (t.p & 7)) rec.shapeChanged++;
        if (rec.invalid) console.error(`DEUS_Levels: strata migration: ${rec.invalid} legacy level change(s) could not be read; they are kept in levels[z].unmigratedCells and not applied`);
        if (rec.converted || rec.invalid) {
            st.migrations = st.migrations || [];
            st.migrations.push(rec);
        }
        stats.strataMigrations++;
        return rec;
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
        if (!schemaKnown(st)) return refuse(`this save's strata schema ${JSON.stringify(st.strataSchemaVersion)} is unknown: no changes are written`);
        if (!isLevel(r.z) || r.z < -2 || r.z > 2 || !W.inWorld(r.ax, r.ay, r.z) || r.x < 0 || r.y < 0 || r.x >= st.size || r.y >= st.size) return refuse(`level ${ref && ref.z} or cell (${r.x},${r.y}) doesn't exist`);
        if (!Number.isInteger(code) || !(code >= 1 && code <= 7)) return refuse(`unknown shape ${JSON.stringify(shape)}`);
        if (r.z === 0 && levelGen(st, 0) < 4) return refuse("the ground's shapes change with stairs and holes (vertical slice 2)");
        const from = packedAt(r.ax, r.ay, r.x, r.y, r.z);
        const matName = opts.material !== undefined ? opts.material : (opts.constructed && (code === FLOOR || code >= RAMP) ? "wood" : null);
        const mat = matName === null ? (from >> 4) : (typeof matName === "number" ? matName : MATERIALS.indexOf(matName));
        if (!Number.isInteger(mat) || mat < 0 || mat >= MATERIALS.length) return refuse(`unknown material ${JSON.stringify(opts.material)}`);
        const to = pack(code, !!opts.constructed, mat);
        if ((code === SOLID || code === OPEN) && W.standerAt(r.ax, r.ay, r.x, r.y, r.z)) return refuse(`a unit stands on (${r.x},${r.y}) at level ${r.z}`);
        // The shape becomes its legacy strata (recordFromPacked); a natural pool's fluid stays where the shape leaves air.
        const i = r.y * st.size + r.x;
        const rec = recordFromPacked(to, currentRecord(st, r.z, r.ax, r.ay, i));
        writeCell(st, r.ax, r.ay, r.x, r.y, r.z, rec, { cause: opts.cause || "setShape", legacyEvents: true });
        return true;
    }
    function redrawAround(ax, ay, x, y, z) {
        naturalWallRevision++;
        invalidateFloods();
        const W = World();
        if (z === 0) return redrawGroundAround(ax, ay, x, y);
        const read = (cx, cy) => packedAt(ax, ay, cx, cy, z);
        const readBiome = biomeReader(baseline(z, ax, ay), W.state.size, z, ax, ay);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const cx = x + dx, cy = y + dy;
                if (cx < 0 || cy < 0 || cx >= W.state.size || cy >= W.state.size) continue;
                const t = tilesAt(read, cx, cy, z, readBiome);
                for (let layer = 0; layer < 3; layer++) W.setDerivedTile(ax, ay, cx, cy, layer, t[layer], z);
            }
        }
    }

    // The ground (z = 0) is painted by UF_WorldGen on its own tileset (91), not from the looks of tileset 92: a changed
    // ground shape asks WorldGen for the tiles a build paints now (solid: the rock face on layers 0 and 2, region 250;
    // dug or carved inside a hill: bare rock floor; elsewhere the natural ground or water). Cells the start template
    // paints, and layers with a saved tile diff, keep their tiles. The changed cell's ground shade (layer 1) is cleared.
    // A save whose ground has no column (generator < 4) never gets here: setShape refuses ground changes there.
    function redrawGroundAround(ax, ay, x, y) {
        const W = World(), st = W && W.state, G = window.UF && UF.WorldGen;
        if (!st || !G || typeof G.groundTilesAt !== "function" || levelGen(st, 0) < 4) return;
        const size = st.size, cells = size * size;
        const diff = st.diffs ? st.diffs[typeof W.levelKey === "function" ? W.levelKey(ax, ay, 0) : `${ax},${ay}`] : null;
        const template = typeof W.isStartArea === "function" && W.isStartArea(ax, ay) && typeof W.templatePaints === "function";
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const cx = x + dx, cy = y + dy;
                if (cx < 0 || cy < 0 || cx >= size || cy >= size) continue;
                if (template && W.templatePaints(cx, cy)) continue;
                const t = G.groundTilesAt(ax, ay, cx, cy);
                if (!t) continue;
                const i = cy * size + cx;
                const put = (layer, id) => {
                    if (diff && diff[layer * cells + i] !== undefined) return;
                    const now = typeof W.getTile === "function" ? W.getTile(ax, ay, cx, cy, layer, 0) | 0 : -1;
                    if (now !== id && typeof W.setDerivedTile === "function") W.setDerivedTile(ax, ay, cx, cy, layer, id, 0);
                };
                put(0, t.layer0);
                if (dx === 0 && dy === 0) put(1, 0);
                put(2, t.layer2);
                put(5, t.region);
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

    // The fluid material of every cell of a level below the ground (0 = none), in one of two reused buffers.
    const poolBuffers = [null, null];
    function poolGrid(st, z, ax, ay, slot) {
        const W = World();
        if (!st || !W || !W.inWorld(ax, ay, z) || !baseline(z, ax, ay)) return null;
        const n = st.size * st.size;
        if (!poolBuffers[slot] || poolBuffers[slot].length !== n) poolBuffers[slot] = new Uint8Array(n);
        const out = poolBuffers[slot], b = baseline(z, ax, ay);
        if (b.legacyGround) out.fill(0);
        else {
            const m = b.strata.m;
            for (let i = 0, o = 0; i < n; i++, o += STRATA) {
                out[i] = FLUID_B[m[o]] ? m[o] & M_ID : FLUID_B[m[o + 1]] ? m[o + 1] & M_ID : FLUID_B[m[o + 2]] ? m[o + 2] & M_ID
                    : FLUID_B[m[o + 3]] ? m[o + 3] & M_ID : FLUID_B[m[o + 4]] ? m[o + 4] & M_ID : M_AIR;
            }
        }
        const am = deltaLevels(st)[z + 2].get(ax + ay * AREA_STRIDE);
        if (am !== undefined) {
            for (const [i, r] of am) {
                let f = M_AIR;
                for (let k = 0; k < STRATA; k++) if (FLUID_B[r[REC_M + k]] === 1) { f = r[REC_M + k] & M_ID; break; }
                out[i] = f;
            }
        }
        return out;
    }
    function buildWallGrid(ax, ay, z, size, st) {
        const wall = getWallGridBuffer(z, size);
        if (baseline(z, ax, ay)) {
            const g = packedGridOf(st, z, ax, ay);
            for (let i = 0; i < size * size; i++) if ((g[i] & 7) === SOLID) wall[i] = 1;
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

        // Natural pools: the fluid strata of -1 and -2 now (baseline plus changes); lava seeds a lava flood, water a water one.
        const pool1 = poolGrid(st, -1, ax, ay, 0), pool2 = poolGrid(st, -2, ax, ay, 1);

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
            if (pool1 && pool1[i]) {
                if (!isWall1[i] && gridMinus1[i] === DRY) {
                    gridMinus1[i] = pool1[i] === M_LAVA ? FLOOD_LAVA : FLOOD_WATER;
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
            if (gridMinus1[i] === FLOOD_WATER || (pool1 && pool1[i] === M_WATER)) {
                liq1 = "water";
            } else if (gridMinus1[i] === FLOOD_LAVA || (pool1 && pool1[i] === M_LAVA)) {
                liq1 = "lava";
            }

            if (liq1) {
                if (!isWall2[i]) {
                    gridMinus2[i] = liq1 === "lava" ? FLOOD_LAVA : FLOOD_WATER;
                    queueMinus2.push(i);
                }
            }

            // Natural lava pools on z=-2
            if (pool2 && pool2[i]) {
                if (!isWall2[i] && gridMinus2[i] === DRY) {
                    gridMinus2[i] = pool2[i] === M_WATER ? FLOOD_WATER : FLOOD_LAVA;
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
        // A natural pool whose fluid strata are lava (the pools of -2).
        if (isNaturalWaterAtRaw(ax, ay, z, x, y)) {
            const st = World().state;
            if (fluidMaterialAt(st, z, ax, ay, y * st.size + x) === M_LAVA) return true;
        }
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
    // Frame (DF black wall-top convention, AGENTS.md rule 13, docs/PROJECT_DEUS_ART_DIRECTION_SPEC.md section 3):
    // 48 x 96, the upper 48 px a flat near-black cap in #08080C..#121218 (drawn here: a flat fill, never art), the lower
    // 48 px the material's face (the side autotile of the rock or soil look in the runtime A4 sheet: AR-1200/AR-1201
    // sides, AR-2100/AR-2101). The same frames stand on the ground (z = 0) at the foot of every hill.
    const NATURAL_WALL_SPEC = Object.freeze({
        width: 48, height: 96, capHeight: 48, capColor: "#0a0a10", capEdgeColor: "#121218", capEdgeHeight: 2,
        capRange: Object.freeze(["#08080c", "#121218"]), faceSheet: "A4 side autotile (y 144..239 of the look's kind column)"
    });
    const ORTHO4 = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    const naturalWallFrames = new Map();
    let naturalWallRevision = 0;
    function naturalWallBitmap(material, mask) {
        const S = NATURAL_WALL_SPEC, flat = provoked("natural_wall_height");
        const key = `${material}:${mask}:${flat}`;
        if (naturalWallFrames.has(key)) return naturalWallFrames.get(key);
        const source = composed.bitmaps.A4;
        if (!source || !source.isReady()) return null;
        const bitmap = new Bitmap(S.width, flat ? S.capHeight : S.height);
        const x0 = material === SOIL ? 96 : 0;
        if (!flat) {
            bitmap.fillRect(0, 0, S.width, S.capHeight, S.capColor);
            bitmap.fillRect(0, 0, S.width, S.capEdgeHeight, S.capEdgeColor);
            const face = Tilemap.WALL_AUTOTILE_TABLE[10 + ((mask & 4) ? 0 : 1) + ((mask & 8) ? 0 : 4)];
            for (let q = 0; q < 4; q++) {
                const dx = (q % 2) * 24, dy = Math.floor(q / 2) * 24;
                bitmap.blt(source, x0 + face[q][0] * 24, 144 + face[q][1] * 24, 24, 24, dx, S.capHeight + dy);
            }
        } else {
            // vertical.natural_wall_height (seen failing once): the one-cell top of the look only.
            const cap = Tilemap.FLOOR_AUTOTILE_TABLE[maskTable()[mask]];
            for (let q = 0; q < 4; q++) {
                const dx = (q % 2) * 24, dy = Math.floor(q / 2) * 24;
                bitmap.blt(source, x0 + cap[q][0] * 24, cap[q][1] * 24, 24, 24, dx, dy);
            }
        }
        naturalWallFrames.set(key, bitmap);
        return bitmap;
    }

    // Wall material of a cell for the classification (STONE, SOIL, or -1 = not a wall). The ground (z = 0) reads its
    // shapes (solid, with the saved changes; the ground's tiles are tileset 91's and say nothing about rock looks); a
    // one-area world wraps like its looping map; a cell of another area counts as a wall (never an exposed face). A
    // ground without its column (generator < 4) has no natural walls. The other levels read the built map's tiles (the
    // rock and soil looks of tileset 92), off the map = not a wall.
    function groundWallReader(ax, ay) {
        const W = World(), st = W && W.state;
        if (!st || levelGen(st, 0) < 4 || !W.inWorld(ax, ay, 0) || provoked("ground_cliffs")) return () => -1;
        const size = st.size;
        const one = st.areasX === 1 && st.areasY === 1;
        return (x, y) => {
            if (one) { x = ((x % size) + size) % size; y = ((y % size) + size) % size; }
            else if (x < 0 || y < 0 || x >= size || y >= size) return STONE;
            const p = packedGridOf(st, 0, ax, ay)[y * size + x];
            return (p & 7) === SOLID ? ((p >> 4) === SOIL ? SOIL : STONE) : -1;
        };
    }
    function tileWallReader(map) {
        const rock = tileBase("rock"), soil = tileBase("soil");
        return (x, y) => {
            if (!map || x < 0 || y < 0 || x >= map.width || y >= map.height) return -1;
            const id = map.data[y * map.width + x];
            if (id >= rock && id < rock + 48) return STONE;
            if (id >= soil && id < soil + 48) return SOIL;
            return -1;
        };
    }
    // The cells in [x0..x1] x [y0..y1] that draw a natural wall frame: a wall cell with at least one orthogonal
    // neighbour that isn't a wall. mask: the NB8 bits of the neighbours of the same material (the face's ends).
    function classifyNaturalWalls(typeAt, x0, y0, x1, y1) {
        const out = [];
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const material = typeAt(x, y);
                if (material < 0 || ORTHO4.every(([a, b]) => typeAt(x + a, y + b) >= 0)) continue;
                let mask = 0;
                for (const [a, b, bit] of NB8) if (typeAt(x + a, y + b) === material) mask |= bit;
                out.push({ x, y, material: MATERIALS[material], code: material, mask });
            }
        }
        return out;
    }
    /** Natural wall cells of a level in a window (inclusive): [{ x, y, material: "stone" | "soil", code, mask }]. */
    function naturalWallCells(area, z, x0, y0, x1, y1) {
        const W = World(), st = W && W.state;
        if (!st || !area || !isLevel(z) || !W.inWorld(area.x, area.y, z)) return [];
        const c = v => Math.max(0, Math.min(st.size - 1, v | 0));
        let typeAt;
        if (z === 0) typeAt = groundWallReader(area.x, area.y);
        else {
            const onScreen = window.$dataMap && $dataMap.ufArea && $dataMap.ufArea.x === area.x && $dataMap.ufArea.y === area.y && ($dataMap.ufArea.z || 0) === z;
            typeAt = tileWallReader(onScreen ? $dataMap : W.peekArea(area.x, area.y, z));
        }
        return classifyNaturalWalls(typeAt, c(x0), c(y0), c(x1), c(y1));
    }

    // Connectors on the ground (z = 0): ramps and stairs are shapes there, but the ground's tileset (91) has no looks
    // for them, so they are drawn as one 48 x 48 frame of the connector's look (tileset 92's B sheet: ramp_up AR-1211,
    // stair_up/down/both AR-1208..1210) over the ground, never animated.
    const CONNECTOR_LOOK = { [RAMP]: "ramp_up", [STAIR_UP]: "stair_up", [STAIR_DOWN]: "stair_down", [STAIR_BOTH]: "stair_both" };
    function groundConnectorCells(area, x0, y0, x1, y1) {
        const W = World(), st = W && W.state;
        if (!st || !area || levelGen(st, 0) < 4 || !W.inWorld(area.x, area.y, 0)) return [];
        const size = st.size, out = [];
        const c = v => Math.max(0, Math.min(size - 1, v | 0));
        for (let y = c(y0); y <= c(y1); y++) {
            for (let x = c(x0); x <= c(x1); x++) {
                const s = packedGridOf(st, 0, area.x, area.y)[y * size + x] & 7;
                if (s >= RAMP) out.push({ x, y, look: CONNECTOR_LOOK[s] });
            }
        }
        return out;
    }
    const connectorFrames = new Map();
    function connectorBitmap(look) {
        if (connectorFrames.has(look)) return connectorFrames.get(look);
        const t = TARGET[look], source = composed.bitmaps.B;
        if (!t || t[0] !== "B" || !source || !source.isReady()) return null;
        const i = t[1];
        const bitmap = new Bitmap(48, 48);
        bitmap.blt(source, ((Math.floor(i / 128) % 2) * 8 + (i % 8)) * 48, Math.floor((i % 128) / 8) * 48, 48, 48, 0, 0);
        connectorFrames.set(look, bitmap);
        return bitmap;
    }

    class Sprite_UFNaturalWalls extends Sprite {
        constructor() {
            super(); this.z = 0; this._active = new Map(); this._pool = []; this._seen = "";
        }
        hideAll() {
            for (const s of this._active.values()) { s.visible = false; this._pool.push(s); }
            this._active.clear(); this._seen = "";
        }
        take(key) {
            let s = this._active.get(key);
            if (!s) {
                s = this._pool.pop() || new Sprite(); s.anchor.set(0.5, 1);
                if (!s.parent) this.parent.addChild(s);
                this._active.set(key, s);
            }
            return s;
        }
        update() {
            super.update();
            const map = window.$dataMap, W = World(), view = W && W.viewLevel();
            const ground = !!view && view.z === 0;
            // The ground draws its cliffs once its column exists (generator 4) and the map on screen is that level's.
            const showing = !!this.parent && !!map && !!view && (ground
                ? levelGen(W.state, 0) >= 4 && (!map.ufArea || (map.ufArea.x === view.x && map.ufArea.y === view.y && (map.ufArea.z || 0) === 0))
                : map.tilesetId === TILESET_ID);
            if (!showing) return this.hideAll();
            const dx = Math.floor($gameMap.displayX()), dy = Math.floor($gameMap.displayY());
            const cols = Math.ceil($gameMap.screenTileX()), rows = Math.ceil($gameMap.screenTileY());
            const stamp = `${$gameMap.mapId()}:${view.z}:${dx}:${dy}:${cols}:${rows}:${naturalWallRevision}`;
            if (stamp !== this._seen || this._data !== map.data) {
                const x0 = Math.max(0, dx - 1), x1 = Math.min(map.width - 1, dx + cols + 1);
                const y0 = Math.max(0, dy - 1), y1 = Math.min(map.height - 1, dy + rows + 2);
                const keep = new Set();
                for (const c of classifyNaturalWalls(ground ? groundWallReader(view.x, view.y) : tileWallReader(map), x0, y0, x1, y1)) {
                    const bitmap = naturalWallBitmap(c.code, c.mask);
                    if (!bitmap) continue;
                    const i = c.y * map.width + c.x; keep.add(i);
                    const s = this.take(i);
                    s.bitmap = bitmap; s._ufX = c.x; s._ufY = c.y; s._ufMaterial = c.code; s._ufLevel = view.z; s._ufKind = "wall"; s._ufLook = null; s.visible = true;
                }
                if (ground) {
                    for (const c of groundConnectorCells(view, x0, y0, x1, y1)) {
                        const bitmap = connectorBitmap(c.look);
                        if (!bitmap) continue;
                        const i = -1 - (c.y * map.width + c.x); keep.add(i); // connectors keyed apart from walls
                        const s = this.take(i);
                        s.bitmap = bitmap; s._ufX = c.x; s._ufY = c.y; s._ufMaterial = -1; s._ufLevel = 0; s._ufKind = "connector"; s._ufLook = c.look; s.visible = true;
                    }
                }
                for (const [i,s] of this._active) if (!keep.has(i)) { s.visible = false; this._pool.push(s); this._active.delete(i); }
                this._seen = stamp; this._data = map.data;
            }
            for (const s of this._active.values()) {
                s.x = Math.round(($gameMap.adjustX(s._ufX) + 0.5) * 48);
                s.y = Math.round(($gameMap.adjustY(s._ufY) + 1) * 48);
                // Walls: same minimum as objects (above tile/stance/designation layers). Connectors lie on the ground:
                // above the lower tile layer (z 0), below every character and overlay.
                s.z = s._ufKind === "connector" ? 0.5 : Math.max(7, s.y);
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

    // The generator version of a level entry added to a world: gen when given (a pre-V80 migration passes PRE_CUT_GEN);
    // else the version of the levels the world already has (a column is one generator: generator 5's cuts span it);
    // else a New Game's UF.NewGameSetup.levelsGen when it names a version 4 or later (tests pinning an older generator);
    // else GEN.
    function newLevelGen(st, gen) {
        if (KNOWN_GENS.includes(gen)) return gen;
        for (const z of [0, -1, -2, 1, 2]) { const L = st.levels[String(z)]; if (L && KNOWN_GENS.includes(L.gen)) return L.gen; }
        const req = window.UF && UF.NewGameSetup ? UF.NewGameSetup.levelsGen : undefined;
        return KNOWN_GENS.includes(req) && req >= 4 ? req : GEN;
    }
    function ensureWorldLevels(st, gen) {
        if (!st || st !== (World() && World().state)) return false;
        const t0 = performance.now();
        st.levels = st.levels || {};
        const g = newLevelGen(st, gen);
        for (const z of LEVELS) if (!st.levels[String(z)]) st.levels[String(z)] = { z, gen: g, checksum: null, strata: {} };
        for (const z of LEVELS) {
            // Allocate Ground too: its checksum still uses its unchanged WorldGen lattice.
            for (let ay = 0; ay < st.areasY; ay++) for (let ax = 0; ax < st.areasX; ax++) baseline(z, ax, ay);
            if (!st.levels[String(z)].checksum) st.levels[String(z)].checksum = checksumOf(z);
        }
        // A new world starts at strata schema 1; a save from before the strata has its level changes converted.
        if (st.strataSchemaVersion === undefined) migrateSaveToFiveStrata(st);
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
        ensureWorldLevels(st, PRE_CUT_GEN);   // no natural cuts under a settlement that was made before the levels
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
        else {
            migrateSaveToFiveStrata(st);   // a no-op at schema 1; converts levels[z].cells of a save made before the strata
            verifyLevels(st);
        }
        deltaLevels(st);                   // decode the saved strata records now: an unreadable one is reported at load
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
        LEVELS, SHAPES, MATERIALS, TILESET_ID, GEN, BIOMES, PRE_CUT_GEN, FEATURE_GEN, FEATURE_PARAMS, FAMILIES,
        isLevel,
        label: z => (isLevel(z) && z !== 3 ? LABELS[z] : ""),
        levelKey: (ax, ay, z = 0) => isLevel(z) ? (z ? `${ax},${ay},${z}` : `${ax},${ay}`) : null,
        zOf,
        levelArea: ref => ({ x: ref.area.x, y: ref.area.y, z: zOf(ref) }),
        ref: (area, x, y, z) => ({ area: { x: area.x, y: area.y }, x: x | 0, y: y | 0, z: z === undefined ? zOf(area) : z }),
        sameLevel: (a, b) => !!a && !!b && !!a.area && !!b.area && a.area.x === b.area.x && a.area.y === b.area.y && zOf(a) === zOf(b),
        /** The shape name of a cell ("solid", "floor", "open", "ramp", "stairUp", "stairDown", "stairBoth"), "" outside the
         *  world; derived from the strata. Arguments: (ref), (area, x, y[, z]) or (ax, ay, x, y, z). No allocation. */
        shapeAt: (a, b, c, d, e) => cellQuery(a, b, c, d, e) ? SHAPE_NAMES[queriedPacked() & 7] || "" : "",
        /** The numeric shape code of a cell (0..7; 0 outside the world). Same arguments as shapeAt. No allocation. */
        shapeCodeAt: (a, b, c, d, e) => cellQuery(a, b, c, d, e) ? queriedPacked() & 7 : 0,
        /** { shape, code, constructed, material, stratum } of a cell, or null outside the world. */
        cellAt: ref => {
            const r = refOf(ref);
            const p = packedAt(r.ax, r.ay, r.x, r.y, r.z);
            const fl = isFlooded(ref);
            const hasWater = waterAt(ref) || (fl && fl.flooded && fl.type === "water");
            const isLava = (fl && fl.flooded && fl.type === "lava") || isLavaAtRaw(r.ax, r.ay, r.z, r.x, r.y);
            if (!p) return null;
            const surface = surfaceAt(ref);
            return Object.assign(unpack(p), {
                biome: biomeAt(ref),
                water: hasWater,
                flooded: fl ? fl.flooded : false,
                floodType: fl && fl.flooded ? fl.type : null,
                liquid: isLava ? "lava" : hasWater ? "water" : null,
                stratum: Levels.stratumAt(ref),
                // The cell's strata (19A): the stratum stood on and its column elevation, fill and fluid states.
                surfaceStratum: surface ? surface.topStratum : -1,
                elevation: surface ? surface.elevation : -1,
                heightState: surface ? surface.heightState : "",
                fluidState: surface ? surface.fluidState : ""
            });
        },
        /** A cell's five strata: { materials, constructed, hp, bytes, connector, fill, changed } (S0 first), or null. */
        strataAt,
        setStrata,
        applyStrataDamage,
        damageStrata: applyStrataDamage,
        applyVolumeDamage,
        registerDamageResponse,
        surfaceHeightAt,
        worldStrataElevationAt,
        heightStateAt,
        fluidStateAt,
        isSolid,
        solidFraction,
        dominantMaterial,
        remainingStructuralHP,
        maxStructuralHP,
        effectiveSupport,
        hasOpaqueOverburden,
        getStrataFluidPassage,
        continuousAirHeight,
        airRunAt,
        capAt,
        setCap,
        applyCapDamage,
        /** The natural cuts and caves of an area (generator 5): { gen, cuts: [...], caves: [...], shafts, skylights, massifCells,
         *  capCells, carvedStrata, cutCells, caveCells, rampsAdded, floatingRemoved, ms } (a copy; descriptors for
         *  diagnostics and tests, not terrain: the strata are), or null for an older generator. */
        naturalFeatures: (ax = 0, ay = 0) => {
            const W = World(), st = W && W.state;
            if (!st || !W.inWorld(ax, ay, 0) || levelGen(st, 0) < FEATURE_GEN) return null;
            const b = baseline(0, ax, ay);
            return b && b.features ? JSON.parse(JSON.stringify(b.features)) : null;
        },
        fluidDepthToStrata,
        strataToFluidDepth,
        fluidVolumeAt: (...args) => (typeof window !== "undefined" && window.UF && window.UF.Fluid && typeof window.UF.Fluid.fluidVolumeAt === "function") ? window.UF.Fluid.fluidVolumeAt(...args) : 0,
        fluidCapacityAt: (...args) => (typeof window !== "undefined" && window.UF && window.UF.Fluid && typeof window.UF.Fluid.fluidCapacityAt === "function") ? window.UF.Fluid.fluidCapacityAt(...args) : 0,
        fluidFillFractionAt: (...args) => (typeof window !== "undefined" && window.UF && window.UF.Fluid && typeof window.UF.Fluid.fluidFillFractionAt === "function") ? window.UF.Fluid.fluidFillFractionAt(...args) : 0.0,
        fluidPhysicalHeightStateAt: (...args) => (typeof window !== "undefined" && window.UF && window.UF.Fluid && typeof window.UF.Fluid.fluidPhysicalHeightStateAt === "function") ? window.UF.Fluid.fluidPhysicalHeightStateAt(...args) : 0,
        fluidCanPassDown: (...args) => (typeof window !== "undefined" && window.UF && window.UF.Fluid && typeof window.UF.Fluid.fluidCanPassDown === "function") ? window.UF.Fluid.fluidCanPassDown(...args) : false,
        fluidCanPassLaterally: (...args) => (typeof window !== "undefined" && window.UF && window.UF.Fluid && typeof window.UF.Fluid.fluidCanPassLaterally === "function") ? window.UF.Fluid.fluidCanPassLaterally(...args) : false,
        fluidTypeAt: (...args) => (typeof window !== "undefined" && window.UF && window.UF.Fluid && typeof window.UF.Fluid.fluidTypeAt === "function") ? window.UF.Fluid.fluidTypeAt(...args) : null,
        surfaceAt,
        migrateSaveToFiveStrata,
        /** Every cached shape grid of an area against a fresh derivation: { grids, cells, mismatches, examples } (slow). */
        verifyPackedGrids: (ax = 0, ay = 0) => verifyPackedGrids(ax, ay),
        STRATA_MATERIALS,
        STRATA_SCHEMA,
        FLUID_PASS,
        HEIGHT_STATES,
        FLUID_STATES,
        /** Bytes held by the strata of one area's five baselines (the budget check; builds them when missing). */
        strataMemory: (ax = 0, ay = 0) => {
            const W = World(), st = W && W.state;
            if (!st) return null;
            const out = { perLevel: {}, strata: 0, connectors: 0, shapeGrids: 0, biome: 0, surface: 0, legacyViews: 0, caps: 0, capEntries: 0 };
            let surf = null;
            for (const z of LEVELS) {
                const b = baseline(z, ax, ay);
                if (!b) continue;
                const own = Object.getOwnPropertyDescriptor(b, "shape");
                const views = ["shape", "material", "water"].reduce((n, k) => {
                    const d = Object.getOwnPropertyDescriptor(b, k);
                    return n + (d && d.value ? d.value.byteLength : 0);
                }, 0);
                out.perLevel[z] = { strata: b.strata.m.byteLength + (b.strata.hp ? b.strata.hp.byteLength : 0), connectors: b.conn.byteLength, legacyViewsBuilt: !!(own && own.value) };
                out.strata += out.perLevel[z].strata;
                out.connectors += b.conn.byteLength;
                out.biome += b.biome ? b.biome.byteLength : 0;
                if (b.caps) { out.capEntries += b.caps.size; out.caps += b.caps.size * 8; }   // a Map entry: 2 numbers (about 8 B of data)
                if (b.surface && b.surface !== surf) { out.surface += b.surface.byteLength; surf = b.surface; }
                out.legacyViews += views;
            }
            if (packedGrids.st === st) for (let li = 0; li < 5; li++) { const g = packedGrids.map.get((ax + ay * AREA_STRIDE) * 5 + li); if (g) out.shapeGrids += g.byteLength; }
            out.total = out.strata + out.connectors + out.shapeGrids + out.biome + out.surface + out.legacyViews + out.caps;
            return out;
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
        standableShape: (a, b, c, d, e) => {
            if (!cellQuery(a, b, c, d, e)) return false;
            const s = queriedPacked() & 7;
            return s === FLOOR || s >= RAMP;
        },
        isConnectorCell: (a, b, c, d, e) => cellQuery(a, b, c, d, e) && (queriedPacked() & 7) >= RAMP,
        describeCell,
        cellArt,
        /** The seeded baseline of a level (area 0,0 by default; runtime only, never write): { strata: { m, hp: null }, conn,
         *  biome, pockets, cliffCaves, surface, ... } plus read-only legacy views shape, material (and water below the
         *  ground) built from the strata on first read. */
        baseline: (z, ax = 0, ay = 0) => baseline(z, ax, ay),
        /** True when the ground has its column (generator 4+): its shapes are volumetric and its tiles follow them. */
        groundVolumetric: () => {
            const W = World(), st = W && W.state;
            return !!st && levelGen(st, 0) >= 4;
        },
        /** A fresh Uint8Array of the shape codes of a level's area (baseline plus saved changes); null for no world, or
         *  for the ground of a save without its column (its shape is its tiles there). */
        shapeGrid: (z, ax = 0, ay = 0) => shapeGrid(z, ax, ay),
        /** The surface height S (0, 1, 2) of every cell of an area (Int8Array, the baseline's own: don't write), or null
         *  without a world or column. */
        surfaceGrid: (ax = 0, ay = 0) => {
            const W = World(), st = W && W.state;
            if (!st || levelGen(st, 0) < 4 || !W.inWorld(ax, ay, 0)) return null;
            const b = baseline(0, ax, ay);
            return b && b.surface ? b.surface : null;
        },
        /** The natural wall frame's spec: { width 48, height 96, capHeight 48, capColor, capEdgeColor, capRange }. */
        naturalWallSpec: NATURAL_WALL_SPEC,
        naturalWallCells,
        /** Ramps and stairs of the ground in a window: [{ x, y, look }] (drawn as frames over the ground). */
        groundConnectorCells: (area, x0, y0, x1, y1) => groundConnectorCells(area, x0, y0, x1, y1),
        /** The natural wall frame (Bitmap) of a material ("stone" | "soil" | code) and NB8 mask; null before the sheets are composed. */
        naturalWallFrame: (material, mask = 0) => naturalWallBitmap(typeof material === "string" ? MATERIALS.indexOf(material) : material, mask | 0),
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
        UF.Test.suite("strata", strataSuite, { isDefault: false });
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
        await groundCliffChecks(t, settled, C);
        if(C) C.setLevel(oldZoom);
        t.check("no_errors",t.errorsSoFar().length===0,t.errorsSoFar().join(" | ") || "none");
    }

    // Ground cliffs (DEUS-TSK-FABLE-16, owner directive 2026-09-24): on the ground, at the south-facing hill edge nearest
    // the start's centre (one with a ramp or stairs in view preferred), every natural wall cell on screen draws a 48 x 96
    // frame whose cap is near-black, and the rock face of the hill cell blocks passage. Provocation
    // UF_TEST_PROVOKE=vertical.ground_cliffs (no natural walls on the ground) makes ground_cliff_render fail.
    async function groundCliffChecks(t, settled, C) {
        const W = World(), st = W.state, size = st.size;
        if (viewZ() !== 0) { setView(0); await t.waitUntil(() => settled() && viewZ() === 0, 20000, "ground level"); }
        const view = W.viewLevel(), area = { x: view.x, y: view.y };
        if (levelGen(st, 0) < 4) { t.check("ground_cliff_render", false, "the ground has no column (generator < 4)"); return; }
        const shapeAt = (x, y) => Levels.shapeCodeAt(area.x, area.y, x, y, 0);
        const mid = Math.floor(size / 2), margin = 24;
        const conn = new Set(groundConnectorCells(area, 0, 0, size - 1, size - 1).map(c => c.y * size + c.x));
        let edge = null, best = Infinity;
        for (let y = margin; y < size - margin; y++) {
            for (let x = margin; x < size - margin; x++) {
                if (shapeAt(x, y) !== SOLID || shapeAt(x, y + 1) === SOLID) continue;
                let near = false;
                for (let dy = -5; dy <= 5 && !near; dy++) for (let dx = -8; dx <= 8 && !near; dx++) if (conn.has((y + dy) * size + x + dx)) near = true;
                const d = Math.hypot(x - mid, y - mid) + (near ? 0 : 40);
                if (d < best) { best = d; edge = { x, y }; }
            }
        }
        if (!edge) { t.check("ground_cliff_render", false, "no south-facing hill edge in the area"); return; }
        if (window.$colonyManager) $colonyManager.cameraFollowUnit = null;
        if (C) C.setLevel(0);
        $gamePlayer.locate(edge.x, edge.y + 2);
        $gamePlayer.center(edge.x, edge.y + 2);
        await t.waitFrames(20);
        const layer = SceneManager._scene._spriteset._ufNaturalWalls;
        const dx = Math.floor($gameMap.displayX()), dy = Math.floor($gameMap.displayY());
        const cols = Math.ceil($gameMap.screenTileX()), rows = Math.ceil($gameMap.screenTileY());
        const x0 = Math.max(0, dx - 1), x1 = Math.min(size - 1, dx + cols + 1), y0 = Math.max(0, dy - 1), y1 = Math.min(size - 1, dy + rows + 2);
        let want = 0, wantConn = 0;
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const s = shapeAt(x, y);
                if (s >= RAMP) wantConn++;
                if (s === SOLID && [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([a, b]) => { const n = shapeAt(x + a, y + b); return n !== SOLID && n !== 0; })) want++;
            }
        }
        const sprites = layer ? [...layer._active.values()].filter(s => s.visible) : [];
        const walls = sprites.filter(s => s._ufKind === "wall"), conns = sprites.filter(s => s._ufKind === "connector");
        const s = layer && layer._active.get(edge.y * size + edge.x);
        const cap = s && s.bitmap ? s.bitmap.getPixel(24, 24) : "";
        const rgb = cap ? [1, 3, 5].map(k => parseInt(cap.slice(k, k + 2), 16)) : [];
        const capOk = rgb.length === 3 && rgb[0] >= 0x08 && rgb[0] <= 0x12 && rgb[1] >= 0x08 && rgb[1] <= 0x12 && rgb[2] >= 0x0c && rgb[2] <= 0x18;
        t.check("ground_cliff_render", !!s && s.bitmap.width === 48 && s.bitmap.height === 96 && s._ufLevel === 0 && capOk && want > 0 && walls.length === want && conns.length === wantConn,
            `edge (${edge.x},${edge.y}) on the ground: frame ${s ? `${s.bitmap.width}x${s.bitmap.height}` : "missing"}, cap pixel ${cap || "none"} (want #08080C..#121218); `
            + `${walls.length} wall frames on screen for ${want} natural wall cells in x ${x0}..${x1}, y ${y0}..${y1}; ${conns.length} ramp/stair frames for ${wantConn}`);
        const kind = UF.Tiles ? UF.Tiles.kindOfTile($gameMap.tileId(edge.x, edge.y, 0)) : null;
        const walk = W.walkable(area.x, area.y, edge.x, edge.y, { z: 0 });
        t.check("ground_cliff_blocks", !!kind && kind.id === "peak_rock" && !$gameMap.isPassable(edge.x, edge.y, 2) && !$gameMap.isPassable(edge.x, edge.y, 8) && !walk,
            `hill cell (${edge.x},${edge.y}): ground ${kind ? kind.id : "none"}, map passable down/up ${$gameMap.isPassable(edge.x, edge.y, 2)}/${$gameMap.isPassable(edge.x, edge.y, 8)}, World.walkable ${walk}`);
        t.screenshot("ground_cliff_z0");
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
                savedShapes.set(k, { x, y, z, cell: Levels.cellAt({ area, x, y, z }), strata: strataAt({ area, x, y, z }) });
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
        // A lava pool on z=-2: lava strata over the chamber's floor stratum (the strata are the pool, 19A).
        setStrata({ area, x: cx + 8, y: cy, z: -2 }, { m: ["stone", "lava", "lava", "air", "air"] });
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
        // Each cell back to its strata record from before (a record equal to the baseline is dropped from the save).
        for (const s of savedShapes.values()) {
            if (s.strata) setStrata({ area, x: s.x, y: s.y, z: s.z }, { m: s.strata.bytes, hp: s.strata.hp, connector: s.strata.connector || 0 });
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
            if (provoked("persistence") && copy.ufWorld.levels["-1"]) copy.ufWorld.levels["-1"].strata = {};
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
                `${W2.units().length} units, changed strata cells ${LEVELS.map(z => `${z}: ${Object.values(st2.levels[String(z)].strata || {}).reduce((n, c) => n + Object.keys(c).length, 0)}`).join(", ")}${note}`);
            // Clean up the fixtures (in the reloaded world).
            for (const u of made.units) if (W2.unit(u.id)) W2.removeUnit(u.id);
            for (const o of made.objects) O.setIn(o.lv, o.x, o.y, null);
            for (const o of made.counterObjects) O.setIn(o.lv, o.x, o.y, o.type);
            for (const it of made.items) if (it) I.remove(it.id);
            for (const z of LEVELS) if (fx[z].item) I.remove(fx[z].item);
            if (fx[0] && fx[0].tileCell) W2.setTile(area.x, area.y, fx[0].tileCell.x, fx[0].tileCell.y, 0, fx[0].tileWas);
            for (const s of made.shapes.reverse()) putDelta(st2, s.z, area.x, area.y, s.y * size + s.x, null);
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

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "strata", on request: run_tests.bat strata) for the strata of DEUS-TSK-FABLE-19A, in the
    // running game. strata_live: the New Game world is on strata schema 1 with flat baselines; every saved record decodes
    // and differs from its baseline; every colonist of the viewed area stands on a cell whose derived shape can be stood
    // on (other walkers are counted, not judged: some wildlife stands inside hills on the pre-strata build too, measured
    // 2026-09-24, a Wildlife placement matter). adapter_cost: over 600 frames of normal play, shape reads, shape
    // derivations and overburden queries per frame, times their cost measured here (docs/DEUS_TSK_FABLE_19_HANDOFF.md
    // section 9: under 0.2 ms a frame of added overhead). It judges the work the strata add (derivations: grid builds
    // and refreshes; overburden queries, which replace isRoofed's two shape reads) and the cost of one shape read; how
    // many reads there are is the path planner's and the other callers' business, unchanged by the strata, and is
    // reported with its total (a pre-strata read cost 651 ns in the same harness on 2026-09-24: docs/systems/UF_Levels.md,
    // section Strata). dig_tunnel: four rock cells of -1 south of a cave floor (a north-south tunnel: the black caps of the
    // natural walls fall beside it, not on it) lose S1..S4 to applyVolumeDamage: they read as
    // floor, are walkable, a path runs to the end and the level's map is repainted (screenshot); tunnel_restored: setStrata
    // puts them back, no saved record left; shape_grids_coherent: every cached shape grid of the area equals a fresh
    // derivation of every cell.
    // Provocations: UF_TEST_PROVOKE=vertical.strata_live (a record equal to its baseline is saved),
    // vertical.adapter_cost (budget 0), vertical.dig_tunnel (the dig does no damage), vertical.tunnel_restored (not put
    // back), vertical.shape_grids_coherent (one cached code flipped).

    async function strataSuite(t) {
        const W = World();
        if (!W || !W.state || !W.viewLevel()) { t.check("setup", false, "no world"); return; }
        const settled = () => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted() && !$gamePlayer.isTransferring() && !pending;
        await t.waitUntil(settled, 20000, "initial map");
        const st = W.state, size = st.size, n = size * size, v = W.viewLevel(), area = { x: v.x, y: v.y };

        //---------------------------------------------------------------- strata_live
        if (provoked("strata_live")) {
            const i = (size >> 1) * size + (size >> 1);
            putDelta(st, -1, area.x, area.y, i, currentRecord(st, -1, area.x, area.y, i));   // a record equal to its baseline
        }
        const noCells = LEVELS.every(z => { const L = st.levels[LEVEL_KEY[z + 2]]; return !!L && L.cells === undefined && (L.strata === undefined || (typeof L.strata === "object" && !Array.isArray(L.strata))); });
        const flat = LEVELS.every(z => { const b = baseline(z, area.x, area.y); return !!b && b.strata.m instanceof Uint8Array && b.strata.m.length === n * STRATA && b.strata.hp === null; });
        let records = 0, differ = 0, saved = 0;
        const lv = deltaLevels(st);
        for (let li = 0; li < 5; li++) {
            for (const [ai, am] of lv[li]) {
                const b = baseOf(st, li - 2, ai % AREA_STRIDE, (ai - (ai % AREA_STRIDE)) / AREA_STRIDE);
                for (const [i, r] of am) { records++; if (!sameAsBaseline(b, i, r)) differ++; }
            }
            const s = st.levels[LEVEL_KEY[li]].strata || {};
            for (const k in s) saved += Object.keys(s[k]).length;
        }
        const units = W.units().filter(u => u.area && u.area.x === area.x && u.area.y === area.y);
        const fliers = units.filter(u => u.data && u.data.through);
        const standable = u => Levels.standableShape({ area, x: u.x, y: u.y, z: zOf(u) });
        const colonists = units.filter(u => u.data && u.data.kind === "colonist");
        const offStand = colonists.filter(u => !standable(u));
        const offOthers = units.filter(u => !(u.data && u.data.through) && !(u.data && u.data.kind === "colonist") && !standable(u));
        const byLevel = LEVELS.map(z => `${z}: ${units.filter(u => zOf(u) === z).length}`).join(", ");
        t.check("strata_live", st.strataSchemaVersion === STRATA_SCHEMA && noCells && flat && records === saved && differ === records && deltas.errors.length === 0 && colonists.length > 0 && offStand.length === 0,
            `strataSchemaVersion ${st.strataSchemaVersion}; no legacy levels[z].cells ${noCells}; five baselines of area ${area.x},${area.y} flat Uint8Array ${n}x5, HP implicit ${flat}; ` +
            `saved strata records ${saved}, decoded ${records}, differing from their baseline ${differ}, unreadable ${deltas.errors.length}; ` +
            `units of the area ${units.length} (by level ${byLevel}); colonists ${colonists.length}, on cells not standable by their derived shape ${offStand.length}${offStand.length ? `: ${offStand.slice(0, 4).map(u => `${u.name} (${u.x},${u.y},${zOf(u)}) ${Levels.shapeAt({ area, x: u.x, y: u.y, z: zOf(u) })}`).join("; ")}` : ""}; ` +
            `other walkers on such cells (not judged) ${offOthers.length}${offOthers.length ? ` (${offOthers.slice(0, 4).map(u => `${u.name} (${u.x},${u.y},${zOf(u)}) ${Levels.shapeAt({ area, x: u.x, y: u.y, z: zOf(u) })}`).join("; ")})` : ""}; fliers ${fliers.length}`);

        //---------------------------------------------------------------- adapter_cost (normal play first, before any fixture)
        let overCalls = 0;
        const over = Levels.hasOpaqueOverburden;
        Levels.hasOpaqueOverburden = (a, b, c, d, e) => { overCalls++; return over(a, b, c, d, e); };
        await t.waitFrames(60);
        const samples = [];
        let r0 = stats.shapeReads, d0 = stats.derives, o0 = overCalls, f0 = Graphics.frameCount;
        const frames0 = Graphics.frameCount, builds0 = stats.gridBuilds;
        for (let k = 0; k < 600; k++) {
            await t.waitFrames(1);
            const r = stats.shapeReads, d = stats.derives, o = overCalls, f = Graphics.frameCount;
            samples.push({ reads: r - r0, derives: d - d0, over: o - o0, frames: Math.max(1, f - f0) });
            r0 = r; d0 = d; o0 = o; f0 = f;
        }
        Levels.hasOpaqueOverburden = over;
        const frames = Graphics.frameCount - frames0, builds = stats.gridBuilds - builds0;
        const totReads = samples.reduce((s, x) => s + x.reads, 0), totDerives = samples.reduce((s, x) => s + x.derives, 0), totOver = samples.reduce((s, x) => s + x.over, 0);
        // Cost per call here, on cells round the view on all five levels (warmed up first; the ref form is what most callers use).
        const pts = [];
        for (let k = 0; k < 4096; k++) pts.push({ x: Math.max(0, Math.min(size - 1, $gamePlayer.x + ((k * 37) % 65) - 32)), y: Math.max(0, Math.min(size - 1, $gamePlayer.y + ((k * 61) % 49) - 24)), z: (k % 5) - 2 });
        const refs = pts.map(p => ({ area, x: p.x, y: p.y, z: p.z }));
        const bench = fn => {
            let acc = 0;
            for (let k = 0; k < 40000; k++) acc += fn(k & 4095);
            const N = 200000, t0 = performance.now();
            for (let k = 0; k < N; k++) acc += fn(k & 4095);
            return { ns: (performance.now() - t0) * 1e6 / N, acc };
        };
        const cRead = bench(k => Levels.shapeCodeAt(refs[k]));
        const cDerive = bench(k => derivePacked(st, area.x, area.y, pts[k].y * size + pts[k].x, pts[k].z));
        const cOver = bench(k => (over(refs[k]) ? 1 : 0));
        const cost = s => (s.reads * cRead.ns + s.derives * cDerive.ns + s.over * cOver.ns) / 1e6 / s.frames;   // ms a frame
        const costs = samples.map(cost).sort((p, q) => p - q);
        const meanMs = (totReads * cRead.ns + totDerives * cDerive.ns + totOver * cOver.ns) / 1e6 / Math.max(1, frames);
        const addedMs = (totDerives * cDerive.ns + totOver * cOver.ns) / 1e6 / Math.max(1, frames);
        const p95 = costs[Math.floor(costs.length * 0.95)], worst = costs[costs.length - 1];
        const budget = provoked("adapter_cost") ? 0 : 0.2, READ_NS = 200;
        t.check("adapter_cost", addedMs < budget && cRead.ns < READ_NS && cRead.ns > 0 && cDerive.ns > 0 && cOver.ns > 0,
            `work the strata add a frame (derivations + overburden queries): mean ${addedMs.toFixed(4)} ms (budget ${budget} ms); one shape read ${cRead.ns.toFixed(0)} ns (bound ${READ_NS} ns). ` +
            `${frames} frames of normal play on level ${v.z} (${units.length} units in the area): a frame ${(totReads / Math.max(1, frames)).toFixed(1)} shape reads, ${(totDerives / Math.max(1, frames)).toFixed(1)} shape derivations (${builds} whole-level grid builds in the window), ${(totOver / Math.max(1, frames)).toFixed(2)} overburden queries ` +
            `(most in one sample: ${Math.max(...samples.map(s => s.reads))} / ${Math.max(...samples.map(s => s.derives))} / ${Math.max(...samples.map(s => s.over))}); cost here ${cRead.ns.toFixed(0)} ns per shapeCodeAt(ref), ${cDerive.ns.toFixed(0)} ns per derivation, ${cOver.ns.toFixed(0)} ns per hasOpaqueOverburden(ref) ` +
            `(200,000 calls each on ${pts.length} cells round the view, all five levels); all adapter time a frame, reads included: mean ${meanMs.toFixed(4)} ms, 95th percentile ${p95.toFixed(4)} ms, worst sample ${worst.toFixed(4)} ms`);

        //---------------------------------------------------------------- dig_tunnel, tunnel_restored
        if (window.$colonyManager) $colonyManager.cameraFollowUnit = null;
        if (viewZ() !== -1) { setView(-1); await t.waitUntil(() => settled() && viewZ() === -1, 20000, "level -1"); }
        const lv1 = W.viewLevel(), a1 = { x: lv1.x, y: lv1.y };
        const code = (x, y) => packedAt(a1.x, a1.y, x, y, -1);
        const rock = (x, y) => { const p = code(x, y); return (p & 7) === SOLID && (p & 8) === 0 && !W.getObject(a1.x, a1.y, x, y, -1); };
        const cave = (x, y) => { const p = code(x, y); return (p & 7) === FLOOR && (p & 8) === 0 && fluidMaterialAt(st, -1, a1.x, a1.y, y * size + x) === M_AIR && W.walkable(a1.x, a1.y, x, y, { z: -1 }); };
        const tiles = (x, y) => [0, 1, 2, 3].map(l => $gameMap.tileId(x, y, l)).join(":");
        const busy = (x, y) => W.units().some(u => zOf(u) === -1 && u.area.x === a1.x && u.area.y === a1.y && Math.abs(u.x - x) <= 4 && Math.abs(u.y - y) <= 5);
        const mx = Math.round($gameMap.displayX() + $gameMap.screenTileX() / 2), my = Math.round($gameMap.displayY() + $gameMap.screenTileY() / 2);
        let fx = null, best = Infinity;
        for (let y = 12; y < size - 12; y++) {
            for (let x = 12; x < size - 12; x++) {
                const dd = (x - mx) * (x - mx) + (y - my) * (y - my);
                if (dd >= best || !cave(x, y)) continue;
                let ok = true;
                for (let d = 1; d <= 4 && ok; d++) ok = rock(x, y + d) && rock(x - 1, y + d) && rock(x + 1, y + d);
                if (ok && rock(x, y + 5) && !busy(x, y + 2)) { fx = { x, y }; best = dd; }
            }
        }
        if (!fx) { t.check("dig_tunnel", false, `no cave floor at -1 with 4 rock cells south of it (rock on both sides) in area ${a1.x},${a1.y}`); }
        else {
            $gamePlayer.locate(fx.x, fx.y + 2);
            $gamePlayer.center(fx.x, fx.y + 2);
            await t.waitFrames(15);
            t.screenshot("tunnel_before");
            const cells = [1, 2, 3, 4].map(d => ({ area: a1, x: fx.x, y: fx.y + d, z: -1 }));
            const before = cells.map(r => ({ strata: strataAt(r), tile: tiles(r.x, r.y), pass: $gameMap.isPassable(r.x, r.y, 2), walk: W.walkable(a1.x, a1.y, r.x, r.y, { z: -1 }) }));
            const pathBefore = W.findPath(a1, fx.x, fx.y, fx.x, fx.y + 4, { z: -1 });
            const seen = { destroyed: 0, cell: 0 };
            const onDestroyed = e => { if (e && e.z === -1 && e.x === fx.x && e.y > fx.y && e.y <= fx.y + 4) seen.destroyed++; };
            const onCell = r => { if (r && zOf(r) === -1 && r.x === fx.x && r.y > fx.y && r.y <= fx.y + 4) seen.cell++; };
            UF.Events.on("levels:strataDestroyed", onDestroyed);
            UF.Events.on("levels:cellChanged", onCell);
            const sum = applyVolumeDamage(a1, fx.x, fx.y + 1, -1, 1, fx.x, fx.y + 4, -1, 4, provoked("dig_tunnel") ? 0 : 100000, "dig", { source: "TEST_strata_tunnel" });
            UF.Events.off("levels:strataDestroyed", onDestroyed);
            UF.Events.off("levels:cellChanged", onCell);
            await t.waitFrames(15);
            const after = cells.map(r => ({ shape: Levels.shapeAt(r), top: surfaceHeightAt(r), elev: worldStrataElevationAt(r), walk: W.walkable(a1.x, a1.y, r.x, r.y, { z: -1 }), pass: $gameMap.isPassable(r.x, r.y, 2), tile: tiles(r.x, r.y), mats: strataAt(r).materials.join("/") }));
            const path = W.findPath(a1, fx.x, fx.y, fx.x, fx.y + 4, { z: -1 });
            const pathEnds = !!path && path.length === 4 && path[3].x === fx.x && path[3].y === fx.y + 4;
            const beforeEnd = pathBefore && pathBefore.length ? `${pathBefore[pathBefore.length - 1].x},${pathBefore[pathBefore.length - 1].y}` : "none";
            t.screenshot("tunnel_dug");
            t.check("dig_tunnel", sum.ok && sum.strataDestroyed === 16 && sum.cells === 4 && seen.destroyed === 16 && seen.cell >= 4 &&
                before.every(b => !b.walk && !b.pass) && after.every((a, k) => a.shape === "floor" && a.top === 0 && a.elev === 5 && a.walk && a.pass && a.tile !== before[k].tile) && pathEnds,
                `cave floor (${fx.x},${fx.y}) at -1, rock (${fx.x},${fx.y + 1}..${fx.y + 4}) dug with applyVolumeDamage from S1 to S4 (100000 dig): destroyed ${sum.strataDestroyed} strata in ${sum.cells} cells ` +
                `(events: strataDestroyed ${seen.destroyed}, cellChanged ${seen.cell}); before: walkable ${before.map(b => b.walk).join("/")}, map passable ${before.map(b => b.pass).join("/")}, path ended at ${beforeEnd}; ` +
                `after: ${after.map(a => `${a.shape} S${a.top} e${a.elev} [${a.mats}]`).join(", ")}, walkable ${after.map(a => a.walk).join("/")}, map passable ${after.map(a => a.pass).join("/")}, ` +
                `tiles ${before.map(b => b.tile).join("/")} -> ${after.map(a => a.tile).join("/")}; path to (${fx.x},${fx.y + 4}) ${path ? `${path.length} steps ending ${path.length ? `${path[path.length - 1].x},${path[path.length - 1].y}` : "here"}` : "none"}`);
            for (let k = 0; k < cells.length && !provoked("tunnel_restored"); k++) {
                const s = before[k].strata;
                setStrata(cells[k], { m: s.bytes, hp: s.hp, connector: s.connector || 0 }, { cause: "test" });
            }
            await t.waitFrames(15);
            const back = cells.map(r => ({ shape: Levels.shapeAt(r), changed: strataAt(r).changed, pass: $gameMap.isPassable(r.x, r.y, 2), walk: W.walkable(a1.x, a1.y, r.x, r.y, { z: -1 }) }));
            const tilesBack = cells.every((r, k) => tiles(r.x, r.y) === before[k].tile);
            t.check("tunnel_restored", back.every(b => b.shape === "solid" && !b.changed && !b.pass && !b.walk) && tilesBack,
                `after setStrata with the saved strata: ${back.map(b => `${b.shape}${b.changed ? " (record)" : ""}`).join(", ")}; walkable ${back.map(b => b.walk).join("/")}; map passable ${back.map(b => b.pass).join("/")}; tiles as before ${tilesBack}`);
        }
        for (const z of LEVELS) packedAt(area.x, area.y, 0, 0, z);   // every level's grid built
        const flip = provoked("shape_grids_coherent") ? packedGridOf(st, -1, area.x, area.y) : null;
        if (flip) flip[0] ^= 7;
        const vg = verifyPackedGrids(area.x, area.y);
        if (flip) flip[0] ^= 7;
        t.check("shape_grids_coherent", vg.grids === 5 && vg.cells === 5 * n && vg.mismatches === 0,
            `${vg.grids} cached shape grids of area ${area.x},${area.y}, ${vg.cells} cells re-derived from the strata after normal play and the tunnel: ${vg.mismatches} differ${vg.examples.length ? ` (${JSON.stringify(vg.examples)})` : ""}`);
        setView(0);
        await t.waitUntil(() => settled() && viewZ() === 0, 20000, "back to the ground").catch(() => {});
        await t.waitFrames(10);
        t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during the strata checks");
    }
})();
