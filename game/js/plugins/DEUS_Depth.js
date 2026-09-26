//=============================================================================
// DEUS_Depth.js - Flat layers: the levels below the viewed level, drawn 1:1 through its open cells
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Depth] Flat 1:1 layers: the levels below the viewed level, seen through its open cells (DEC-011, 2026-09-25).
 * @author DEUS project (Fable)
 * @base DEUS_Levels
 * @orderAfter DEUS_Levels
 * @orderAfter DEUS_Camera
 * @orderAfter DEUS_Culling
 *
 * @param MaxDepth
 * @text Levels below drawn
 * @desc 2: the level two below shows through the open cells of the level below (default). 1: one level, then the void. 0: none.
 * @type number
 * @min 0
 * @max 2
 * @default 2
 *
 * @help
 * DEUS flat layer compositing. System doc: docs/systems/DEUS_Depth.md.
 *
 * Owner decision DEC-011 (2026-09-25 23:54 CT): every Z layer renders 1:1. No blur, no scale or
 * zoom, no parallax or projection offset, no ColorMatrix, alpha or tint depth shading, no filter.
 * A unit's own tint (its data) and an item's material tint are the entities' own colours and stay.
 *
 * On every view (+2, +1, Ground, -1, -2), wherever the viewed level's cell is open (open air, a
 * natural cut or ravine, a dug hole), the level below is drawn through it at 1:1; where that level
 * is open too, the level two below (MaxDepth 2); below the last drawn level lies the void. Solid
 * cells stay opaque. The viewed level's own tiles are the exposure mask: the planes are drawn under
 * the map's lower tile layer, and while they are on, the map on screen does not paint its open cells
 * (on +1/+2 those are transparent open air anyway; on the ground and below, their rock-face and hole
 * looks would hide what is below).
 *
 * Each depth plane is a stock RMMZ Tilemap whose layers paint into a canvas Bitmap (nearest
 * sampling) from the lower level's cached build (UF.World.peekArea), plus the level's objects, items,
 * units, cliff faces and ground ramps as pooled sprites between its tile layers. A unit that steps on
 * a lower level walks from its cell to the next over UnitStepFrames simulation ticks and plays its
 * sheet's walk frames (discrete sprite frames, rule 12); the simulation is not touched. A level
 * switch happens in place (SIM.00.00: the spriteset is kept): the planes are bound to the new view's
 * levels, painted, and their entities and units placed before levels:viewChanged fires. The plane
 * canvases are pooled across map transfers (area edges, loads).
 *
 * The A1 water frames of a lower level step with the map on screen (a sprite-frame animation of the
 * tileset, rule 12); the plugin synthesizes no motion of its own.
 *
 * Replaced core methods: none. Aliases: Spriteset_Map.createCharacters, Spriteset_Map.updateTilemap,
 * Scene_Map.update, Scene_Map.start, Scene_Map.terminate, Scene_Boot.start (checks). Listens to
 * world:levelBuilt / world:areaBuilt (a level went on screen, in place or loaded). The map's own Tilemap instance gets
 * an _addSpot of its own that skips the viewed level's open cells while the planes are on. Save data:
 * none.
 *
 * Checks: suites "depth" and "layers_flat" (not default suites):
 *   node tools/test_snapshot.js --name depth --plugins DEUS_Depth --suite depth
 *   node tools/test_layer_render_flat.js
 * Provocations: UF_TEST_PROVOKE=depth.<check>.
 */

(() => {
    "use strict";

    const PLUGIN = "DEUS_Depth";
    const TW = 48, TH = 48;
    const PAD = 0; // DEC-011: nothing is projected inward, so a plane's window is the map tilemap's own (the viewport plus its 20 px margin)
    const World = () => (window.UF && UF.World) || null;
    const Levels = () => (window.UF && UF.Levels) || null;

    //-------------------------------------------------------------------------
    // Test provocations: UF_TEST_PROVOKE=depth.<check>, read only in harness runs (the DEUS_Levels pattern).

    const PROVOKE = (() => {
        const argv = (typeof nw !== "undefined" && nw.App && nw.App.argv) || [];
        if (!argv.some(a => /^--(uf|deus)-test(=|$)/.test(String(a)))) return [];
        const env = (typeof process !== "undefined" && process.env && process.env.UF_TEST_PROVOKE) || "";
        return env.split(",").map(s => s.trim()).filter(s => s.startsWith("depth."));
    })();
    const provoked = name => PROVOKE.includes(`depth.${name}`);
    const provokedAny = (...names) => names.some(provoked);
    // The removed centre projection comes back only under these provocations: the checks that prove the layers flat must see it fail.
    const REPROJECT = provoked("projection_origin") ? 0.97 : provoked("parallax_bounded") ? 0.80 : 0;
    // A half-pixel offset with bilinear sampling makes the blends a 1:1 layer must never have (at 1:1 on whole pixels, smooth alone blends nothing).
    const HALF_PIXEL = provokedAny("crisp_nearest", "flat_crisp", "no_blends");
    // A colour filter on the planes' entity container: the filters a flat layer must never carry.
    const INJECT_FILTER = provokedAny("flat_no_filters", "no_filters_any_state", "flat_transform", "entities_inherit_treatment");

    //-------------------------------------------------------------------------
    // Configuration (developer-tunable; nothing here is frozen)

    const params = (() => {
        try { return PluginManager.parameters(PLUGIN) || {}; } catch (e) { return {}; }
    })();
    const num = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };

    const config = {
        enabled: true,
        /** How many levels below the viewed level are drawn: 2 (the level two below shows through the open cells of the level
         *  below), 1 (one level, the void beyond it) or 0 (none). */
        maxDepth: 2,
        /** The void below the last drawn level (DEUS near-black, rule 13's range #08080C..#121218). */
        voidColor: 0x08080c,
        /** Levels whose open cells show the level below them: every level (Owner 2026-09-25 23:52 CT: "cuts down to z-2" on the ground view). */
        exposes: () => true,
        /** What of a lower level is drawn besides its tiles (user direction 2026-09-24: "all of the assets on the layers
         *  below too, like trees and creatures"): its objects, items, units, natural walls / cliff faces and ground ramps. */
        entities: { objects: true, items: true, units: true, walls: true },
        /** Safety net (frames): the lower levels' item and wall sets are re-read at least this often. Units are checked every
         *  frame; items, objects and walls on their events and when the view crosses a cell. */
        entityRefreshFrames: 300,
        _stamp: 1
    };
    if (params.MaxDepth !== undefined) config.maxDepth = Math.max(0, Math.min(2, num(params.MaxDepth, 2) | 0));
    // The ground_draws_through_openings provocation: the old rule, only the levels above the ground show what is below.
    if (provokedAny("ground_draws_through_openings", "every_view_sees_through")) config.exposes = z => z > 0;

    const stats = {
        rebuilds: 0, paints: 0, lastPaintMs: 0, peeks: 0, lastPeekMs: 0, layersAlive: 0, canvasesMade: 0, canvasesDestroyed: 0,
        updates: 0, lastUpdateMs: 0, unitSteps: 0, preloads: 0, mainRepaints: 0,
        unitsScanned: 0, candidateRebuilds: 0, entityRebuilds: 0, itemRebuilds: 0, itemDirties: 0, objectDirties: 0
    };
    let unitPlaceStamp = 0; // moves when a unit changes level or area (world:unitLevelChanged / world:unitAreaChanged)

    //-------------------------------------------------------------------------
    // The planes' canvases outlive a spriteset (K2 d). On a map transfer (an area edge, a load) the old Scene_Map is terminated
    // before the new spriteset is made, so its canvases go back to this pool at terminate and the new planes take them. A level
    // switch happens in place (SIM.00.00): the spriteset, its root and their canvases stay.

    const canvasPool = [];
    const POOL_MAX = 4; // two planes x two layers
    function takeCanvas(width, height) {
        for (let i = canvasPool.length - 1; i >= 0; i--) {
            const b = canvasPool[i];
            if (b.width !== width || b.height !== height) continue;
            canvasPool.splice(i, 1);
            b.context.clearRect(0, 0, width, height);
            return b;
        }
        const b = new Bitmap(width, height);
        b.smooth = false; // NEAREST sampling, whatever the engine's Bitmap default is
        b.context.imageSmoothingEnabled = false;
        stats.canvasesMade++;
        return b;
    }
    function returnCanvas(b) {
        if (!b) return;
        // The canvases_freed provocation: nothing is kept, every switch makes new canvases.
        if (canvasPool.length < POOL_MAX && !provoked("canvases_freed")) {
            b.smooth = false;
            canvasPool.push(b);
        } else {
            b.destroy();
            stats.canvasesDestroyed++;
        }
    }

    //-------------------------------------------------------------------------
    // A tile layer that paints into a canvas Bitmap. The stock Tilemap adds "spots" to its layers through
    // addRect(setNumber, sx, sy, dx, dy, w, h); the stock layer turns them into WebGL quads drawn through the
    // renderer plugin "rpgtilemap", whose three internal textures are shared by every layer of every tilemap
    // (a second tileset would fight the map on screen for them). This layer draws the same rectangles with
    // drawImage into a Bitmap instead: nearest-sampled, readable by checks, independent of the plugin.

    function DepthCanvasLayer() { this.initialize(...arguments); }
    DepthCanvasLayer.prototype = Object.create(PIXI.Container.prototype);
    DepthCanvasLayer.prototype.constructor = DepthCanvasLayer;
    DepthCanvasLayer.prototype.initialize = function(width, height) {
        PIXI.Container.call(this);
        this.bitmap = takeCanvas(width, height);
        this._images = [];
        this._count = 0;
        this._dirty = true;
        this.water = false;   // an A1 tile was drawn: the plane keeps stepping the water frames with the map on screen
        stats.layersAlive++;
    };
    /** Give the canvas back to the pool (its spriteset is going away); the layer draws nothing after this. */
    DepthCanvasLayer.prototype.release = function() {
        if (!this.bitmap) return;
        returnCanvas(this.bitmap);
        this.bitmap = null;
        stats.layersAlive--;
    };
    DepthCanvasLayer.prototype.destroy = function() {
        this.release();
        PIXI.Container.prototype.destroy.call(this, { children: true });
    };
    DepthCanvasLayer.prototype.setBitmaps = function(bitmaps) {
        this._images = bitmaps.map(b => (b ? (b.image || b.canvas) : null));
    };
    DepthCanvasLayer.prototype.clear = function() {
        if (!this.bitmap) return;
        this.bitmap.context.clearRect(0, 0, this.bitmap.width, this.bitmap.height);
        this._count = 0;
        this._dirty = true;
        this.water = false;
    };
    DepthCanvasLayer.prototype.size = function() { return this._count; };
    DepthCanvasLayer.prototype.isReady = function() { return true; };
    DepthCanvasLayer.prototype.render = function() { /* never in the rendered tree: its bitmap is shown by a Sprite */ };
    DepthCanvasLayer.prototype.addRect = function(setNumber, sx, sy, dx, dy, w, h) {
        if (!this.bitmap) return;
        const ctx = this.bitmap.context;
        if (setNumber < 0) { // the stock shadow quad
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(dx, dy, w, h);
        } else {
            const img = this._images[setNumber];
            if (!img || !img.width || !img.height) return;
            ctx.drawImage(img, sx, sy, w, h, dx, dy, w, h);
            if (setNumber === 0) this.water = true;
        }
        this._count++;
        this._dirty = true;
    };
    /** Upload the canvas once per repaint (the stock Bitmap uploads after every drawing call). */
    DepthCanvasLayer.prototype.flush = function() {
        if (!this._dirty || !this.bitmap) return;
        if (provoked("depth2_through_depth1")) { // the provocation: the lower level's open cells stop being see-through
            const ctx = this.bitmap.context;
            ctx.globalCompositeOperation = "destination-over";
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, this.bitmap.width, this.bitmap.height);
            ctx.globalCompositeOperation = "source-over";
        }
        this.bitmap.baseTexture.update();
        this._dirty = false;
    };

    //-------------------------------------------------------------------------
    // A Tilemap whose layers are canvas layers. It is never rendered itself: it lives under a detached container (PIXI's
    // updateTransform needs a parent) and its only job is to paint the spot grid the stock code computes. Its level's
    // open cells are not painted (skipCell): what is below them shows through (a lower plane or the void).

    function DepthTilemap() { this.initialize(...arguments); }
    DepthTilemap.prototype = Object.create(Tilemap.prototype);
    DepthTilemap.prototype.constructor = DepthTilemap;
    DepthTilemap.prototype.initialize = function(width, height) {
        this._window = { width, height };
        this.skipCell = null; // (mx, my) -> true: the cell is not painted
        Tilemap.prototype.initialize.call(this);
        this.width = width;
        this.height = height;
        this.paints = 0;
    };
    DepthTilemap.prototype._createLayers = function() {
        const w = this._window.width + this._margin * 2, h = this._window.height + this._margin * 2;
        const cols = Math.ceil(w / this.tileWidth) + 1, rows = Math.ceil(h / this.tileHeight) + 1;
        this._lowerLayer = new DepthCanvasLayer(cols * this.tileWidth, rows * this.tileHeight);
        this._lowerLayer.z = 0;
        this._upperLayer = new DepthCanvasLayer(cols * this.tileWidth, rows * this.tileHeight);
        this._upperLayer.z = 4;
        this.addChild(this._lowerLayer);
        this.addChild(this._upperLayer);
        this._needsRepaint = true;
    };
    // The stock Tilemap hands the sheets to its lower layer only (the WebGL layers share the plugin's textures);
    // canvas layers each need them, and the ground tileset does put "higher" (star) tiles on the upper layer.
    DepthTilemap.prototype._updateBitmaps = function() {
        if (this._needsBitmapsUpdate && this.isReady()) {
            this._lowerLayer.setBitmaps(this._bitmaps);
            this._upperLayer.setBitmaps(this._bitmaps);
            this._needsBitmapsUpdate = false;
            this._needsRepaint = true;
        }
    };
    DepthTilemap.prototype._addSpot = function(startX, startY, x, y) {
        if (this.skipCell !== null && this.skipCell(startX + x, startY + y)) return;
        Tilemap.prototype._addSpot.call(this, startX, startY, x, y);
    };
    DepthTilemap.prototype._addAllSpots = function(startX, startY) {
        const t0 = performance.now();
        Tilemap.prototype._addAllSpots.call(this, startX, startY);
        this._lowerLayer.flush();
        this._upperLayer.flush();
        this.paints++;
        stats.paints++;
        stats.lastPaintMs = performance.now() - t0;
    };
    /** Per frame, before updateTransform: the water frame follows the map on screen only when water is in the window. */
    DepthTilemap.prototype.update = function() {
        const main = SceneManager._scene && SceneManager._scene._spriteset && SceneManager._scene._spriteset._tilemap;
        if (this._lowerLayer.water && main) this.animationCount = main.animationCount;
        this.animationFrame = Math.floor(this.animationCount / 30);
    };
    DepthTilemap.prototype.hasWater = function() { return this._lowerLayer.water || this._upperLayer.water; };

    //-------------------------------------------------------------------------
    // The open cells of a level: a cached copy of its shape grid, read once per level and patched cell by cell on
    // levels:shapeChanged (never re-read per frame). openStamp moves when a level gains its first open cell or loses its last.

    let openStamp = 0;
    let shapeRevision = 0; // moves on every patched cell: the exposure mask of the map on screen is rebuilt
    const openCache = new Map(); // "ax,ay,z" -> { grid: Uint8Array | null, open: count }, least recently used first
    const OPEN_CACHE_MAX = 15;
    const openCode = () => { const L = Levels(); return L && L.SHAPES ? L.SHAPES.open : 3; };
    function openCells(ax, ay, z) {
        const key = `${ax},${ay},${z}`;
        let e = openCache.get(key);
        if (e) { openCache.delete(key); openCache.set(key, e); return e; }
        const L = Levels(), grid = L && L.shapeGrid ? L.shapeGrid(z, ax, ay) : null, OPEN = openCode();
        let open = 0;
        if (grid) for (let i = 0; i < grid.length; i++) if (grid[i] === OPEN) open++;
        e = { grid, open };
        openCache.set(key, e);
        while (openCache.size > OPEN_CACHE_MAX) openCache.delete(openCache.keys().next().value);
        return e;
    }
    const wrapCell = (v, size) => ((v % size) + size) % size;
    /** The cells a..b of a looping axis as ranges inside 0..size-1: one range, or two where the window crosses the loop seam. */
    function seamRanges(a, b, size) {
        if (b - a + 1 >= size) return [[0, size - 1]];
        const a0 = wrapCell(a, size), b0 = a0 + (b - a);
        return b0 < size ? [[a0, b0]] : [[a0, size - 1], [0, b0 - size]];
    }
    const isOpenIn = (e, size, mx, my, OPEN) => !!e.grid && e.grid[wrapCell(my, size) * size + wrapCell(mx, size)] === OPEN;
    /** A cell's shape changed (levels:shapeChanged / levels:cellChanged): patch the cached grid of its level. */
    function patchOpenCell(ref) {
        const L = Levels(), W = World();
        if (!ref || !ref.area || !L || !W || !W.state || !L.shapeCodeAt) { openCache.clear(); openStamp++; return; }
        const e = openCache.get(`${ref.area.x},${ref.area.y},${ref.z}`);
        if (!e || !e.grid) return;
        const size = W.state.size, i = ref.y * size + ref.x, OPEN = openCode();
        if (!(i >= 0 && i < e.grid.length)) return;
        const was = e.grid[i], now = L.shapeCodeAt(ref.area.x, ref.area.y, ref.x, ref.y, ref.z);
        if (was === now) return;
        e.grid[i] = now;
        shapeRevision++;
        const before = e.open;
        if (was === OPEN) e.open--;
        if (now === OPEN) e.open++;
        if ((before > 0) !== (e.open > 0)) openStamp++;
    }
    function shapesReset() { openCache.clear(); openStamp++; shapeRevision++; }

    //-------------------------------------------------------------------------
    // The entities of a lower level: its objects (the live object layer class, fed the lower level's build), items,
    // units, natural walls / cliff faces and ground connectors, as pooled sprites in the plane's own coordinate frame,
    // sorted by foot position like the map on screen. Units walk between cells with their sheet's walk frames; the
    // rest use their standing frames, read with the same sidecar rules as UF_Objects / UF_Anim.

    const FACING4 = { 2: "S", 4: "W", 6: "E", 8: "N" };
    const FACING8 = ["", "SW", "S", "SE", "W", "", "E", "NW", "N", "NE"]; // by numpad direction (dir8)
    const ENTITY_MARGIN = 3, ENTITY_TALL = 6; // cells beyond the view (UF_Objects' MARGIN / TALLEST_CELLS)
    const sidecarOf = name => (window.UF && UF.Sidecars && name ? UF.Sidecars.get(name) : null);
    // Shared sheets are sampled linearly by MZ's Bitmap (smooth = true). Nearest sampling is identical at 1:1, so forcing it
    // on the shared texture changes nothing on the map on screen and keeps the lower levels' sprites crisp.
    function forceNearest(bmp) {
        if (!bmp) return;
        if (bmp.smooth) bmp.smooth = false;
        const bt = bmp.baseTexture;
        // PIXI 5.3: the style reaches an already uploaded GL texture only through setStyle (it bumps dirtyStyleId)
        if (bt && typeof bt.setStyle === "function" && bt.scaleMode !== PIXI.SCALE_MODES.NEAREST) bt.setStyle(PIXI.SCALE_MODES.NEAREST, bt.mipmap);
        else if (bt && typeof bt.setStyle === "function" && bt.dirtyStyleId === 0) bt.setStyle(PIXI.SCALE_MODES.NEAREST, bt.mipmap);
    }
    const tintOf = c => (typeof c === "string" && /^#?[0-9a-f]{6}$/i.test(c) ? parseInt(c.replace("#", ""), 16) : (typeof c === "number" ? c : 0xffffff));
    const unitStepFrames = () => { const W = World(); return Math.max(1, (W && W.config && W.config.unitStepFrames) | 0 || 16); };

    /** Start loading a unit's sheet (ImageManager keeps it; a level switch does not clear the cache). */
    const preloaded = new Map(); // characterName -> Bitmap: the sheets preloadSheet started (the checks wait for them, Fix 1)
    function preloadSheet(image) {
        const name = image && image.characterName;
        if (!name || provoked("switch_same_frame")) return;
        if (!preloaded.has(name)) preloaded.set(name, ImageManager.loadCharacter(name));
        stats.preloads++;
    }
    /** Preload the sheets of the units of the viewed area (all levels, or the levels in `levels`). Once per scene start or rebuild, never per frame. */
    function preloadArea(v, levels) {
        const W = World();
        if (!v || !W || !W.units) return;
        const all = W.units();
        for (let i = 0; i < all.length; i++) {
            const u = all[i];
            if (!u || !u.area || u.area.x !== v.x || u.area.y !== v.y) continue;
            if (levels && !levels.includes(u.z !== undefined ? u.z : 0)) continue;
            preloadSheet(u.image);
        }
    }

    /** The facts of a unit's sheet once its bitmap is ready (null while it loads): frame size, block, facings, stand and walk columns. */
    const sheets = new Map(); // "name|index" -> info
    function sheetOf(image) {
        const name = image && image.characterName;
        if (!name) return null;
        const bmp = ImageManager.loadCharacter(name);
        if (!bmp.isReady() || !bmp.width) return null;
        const index = image.characterIndex | 0, key = `${name}|${index}`;
        const known = sheets.get(key);
        if (known && known.bitmap === bmp) return known; // a cleared ImageManager cache (a real map transfer) makes a new bitmap
        const big = ImageManager.isBigCharacter(name), sc = sidecarOf(name);
        let fw = big ? Math.floor(bmp.width / 3) : Math.floor(bmp.width / 12);
        let fh = big ? Math.floor(bmp.height / 4) : Math.floor(bmp.height / 8);
        if (sc && sc.frameWidth > 0 && sc.frameHeight > 0) { fw = sc.frameWidth; fh = sc.frameHeight; }
        const blockX = big ? 0 : (index % 4) * 3, blockY = big ? 0 : Math.floor(index / 4) * 4;
        const fits = c => Number.isInteger(c) && c >= 0 && (blockX + c + 1) * fw <= bmp.width;
        const anims = sc && sc.animations ? sc.animations : null;
        let stand = 1; // RPG Maker's standing pattern
        if (anims && Array.isArray(anims.stand) && anims.stand.length) stand = anims.stand[0] | 0;
        if (!fits(stand)) stand = 0;
        let walk = anims && Array.isArray(anims.walk) ? anims.walk.filter(fits) : [];
        if (!walk.length) walk = [1, 2, 1, 0].filter(fits); // RPG Maker's walk: patterns 1, 2, 1, 0
        if (!walk.length) walk = [stand];
        // Ticks per walk frame: the sidecar's frameMs (UF_Anim's rule, 150 ms = 9 ticks), else RPG Maker's rate while moving at speed 4.
        const walkTicks = sc && sc.frameMs > 0 ? (sc.frameMs * 60) / 1000 : (sc ? 9 : 10);
        const anchor = sc && Array.isArray(sc.anchor) && sc.anchor.length === 2 ? [sc.anchor[0] / fw, sc.anchor[1] / fh] : [0.5, 1];
        forceNearest(bmp);
        const info = { name, index, bitmap: bmp, fw, fh, blockX, blockY, facings: sc && Array.isArray(sc.facings) ? sc.facings : null,
            stand, walk, walkTicks: Math.max(1, walkTicks), ax: anchor[0], ay: anchor[1] };
        sheets.set(key, info);
        return info;
    }
    /** The sheet row of a facing: an 8-direction sheet names its rows (CHARSET_8D_STANDARD), RPG Maker's sheets have 4. */
    function rowOf(info, dir, dir8) {
        const d4 = FACING4[dir] ? dir : 2;
        let row = (d4 - 2) / 2;
        if (info.facings) {
            const j8 = FACING8[dir8] ? info.facings.indexOf(FACING8[dir8]) : -1, j4 = info.facings.indexOf(FACING4[d4]);
            row = j8 >= 0 ? j8 : (j4 >= 0 ? j4 : row);
        }
        return row;
    }
    /** The frame of an item stack on the ground (UF_Items' rule: column 1, row 0 of its sheet), or null while it loads. */
    function itemFrame(item) {
        const I = window.UF && UF.Items, t = I && I.type ? I.type(item.type) : null;
        if (!t || !t.image) return null;
        const bmp = ImageManager.loadCharacter(t.image);
        if (!bmp.isReady() || !bmp.width) return null;
        const sc = sidecarOf(t.image);
        const fw = (sc && sc.frameWidth > 0 ? sc.frameWidth : 0) || Math.floor(bmp.width / 3);
        const fh = (sc && sc.frameHeight > 0 ? sc.frameHeight : 0) || Math.floor(bmp.height / 4);
        const anchor = sc && Array.isArray(sc.anchor) && fw > 0 && fh > 0 ? [sc.anchor[0] / fw, sc.anchor[1] / fh] : [0.5, 1];
        const mat = item.mat && I.materialOf ? I.materialOf(item.mat) : null;
        return { bitmap: bmp, sx: fw, sy: 0, w: fw, h: fh, ax: anchor[0], ay: anchor[1], tint: tintOf(mat && mat.color ? mat.color : t.tint) };
    }
    const connectorFrames = new Map();
    /** One 48 x 48 frame of a ground connector look (ramp_up, stair_*) from tileset 92's B sheet, or null. */
    function connectorFrame(look) {
        if (connectorFrames.has(look)) return connectorFrames.get(look);
        const L = Levels(), sheetsB = L && L.composedSheets ? L.composedSheets() : null, src = sheetsB && sheetsB.B;
        const id = L && L.tileOf ? L.tileOf(look) : -1;
        if (!src || !src.isReady() || !(id >= 0 && id < 256)) return null;
        const bmp = new Bitmap(48, 48);
        bmp.smooth = false;
        bmp.blt(src, ((Math.floor(id / 128) % 2) * 8 + (id % 8)) * 48, Math.floor((id % 128) / 8) * 48, 48, 48, 0, 0);
        connectorFrames.set(look, bmp);
        return bmp;
    }

    // The live object layer, pointed at a lower level's build. UF_Objects reads the map on screen for wall autotile
    // masks, so the build is swapped in for the (synchronous) rebuild and placement only.
    let DepthObjectLayer = null;
    function objectLayerClass() {
        const O = window.UF && UF.Objects;
        if (DepthObjectLayer || !O || !O.Sprite_Layer) return DepthObjectLayer;
        DepthObjectLayer = class extends O.Sprite_Layer {
            constructor(plane) { super(); this._plane = plane; }
            update() {
                Sprite.prototype.update.call(this);
                this._updateObjects();
            }
            _assign(s, type, x, y) {
                super._assign(s, type, x, y);
                forceNearest(s.bitmap);
            }
            _updateObjects() {
                const map = this._plane.map;
                if (!this.parent || !map || !map.ufObjects || !window.$gameMap || !config.entities.objects) { this._hideAll(); return; }
                const dx = Math.floor($gameMap.displayX()), dy = Math.floor($gameMap.displayY());
                const seen = this._seen;
                if (seen.grid !== map.ufObjects) { this._hideAll(); this._force = true; }
                const saved = window.$dataMap;
                window.$dataMap = map;
                try {
                    if (this._dirty || this._force || seen.dx !== dx || seen.dy !== dy) {
                        this._rebuild(map, dx, dy, this._force);
                        seen.grid = map.ufObjects; seen.dx = dx; seen.dy = dy; seen.zoom = 1; seen.mapId = $gameMap.mapId();
                        this._dirty = false; this._force = false;
                    }
                    this._place();
                } finally { window.$dataMap = saved; }
            }
        };
        return DepthObjectLayer;
    }

    //-------------------------------------------------------------------------
    // A depth plane on screen: the two canvas layers of one lower level at 1:1, exactly where the level would be drawn if
    // it were on screen (DEC-011), with its entities between them.

    const inWindow = (win, x, y) => x >= win.x0 && x <= win.x1 && y >= win.y0 && y <= win.y1; // maps loop, but the view never spans the seam twice

    function Sprite_DepthPlane() { this.initialize(...arguments); }
    Sprite_DepthPlane.prototype = Object.create(PIXI.Container.prototype);
    Sprite_DepthPlane.prototype.constructor = Sprite_DepthPlane;
    Sprite_DepthPlane.prototype.initialize = function(depth) {
        PIXI.Container.call(this);
        this.depth = depth;
        this.level = null;          // { x, y, z } of the level drawn
        this.map = null;            // its cached build (UF.World.peekArea)
        this.spriteId = Sprite._counter++;
        this.z = 0;
        this._tilemap = new DepthTilemap(Graphics.width + 2 * PAD, Graphics.height + 2 * PAD);
        this._root = new PIXI.Container();
        this._root.addChild(this._tilemap);
        this._lower = new Sprite(this._tilemap._lowerLayer.bitmap);
        this._upper = new Sprite(this._tilemap._upperLayer.bitmap);
        // The level's entities sit between its tile layers, in screen coordinates shifted by the canvas origin.
        this._entities = new PIXI.Container();
        this._entities.spriteId = Sprite._counter++;
        const OL = objectLayerClass();
        this._objectLayer = OL ? new OL(this) : null;
        if (this._objectLayer) this._entities.addChild(this._objectLayer);
        this._units = new Map();   // unit id -> sprite
        this._items = new Map();   // item id -> sprite
        this._walls = new Map();   // "x,y" or "c:x,y" -> sprite
        this._pool = [];
        this._entityDirty = true;
        this._entityFrame = 0;
        this._winDx = NaN;
        this._winDy = NaN;
        this._scanStamp = 0;
        this._paintsAtBind = 0;
        this.addChild(this._lower);
        this.addChild(this._entities);
        this.addChild(this._upper);
        this._appliedStamp = 0;
        this.visible = false;
    };
    Sprite_DepthPlane.prototype.destroy = function() {
        if (this._root) this._root.destroy({ children: true });
        this._root = null;
        this._tilemap = null;
        PIXI.Container.prototype.destroy.call(this, { children: true });
    };
    /** The spriteset is going away: its canvases go back to the pool now (before the next spriteset is made). */
    Sprite_DepthPlane.prototype.releaseCanvases = function() {
        this.clearEntities();
        this._lower.bitmap = null;
        this._upper.bitmap = null;
        if (this._tilemap) { this._tilemap._lowerLayer.release(); this._tilemap._upperLayer.release(); }
        this.level = null;
        this.map = null;
        this.visible = false;
    };
    /** Show level `level` ({ x, y, z }) from its build `map`; skipCell(mx, my) names the cells not painted (its open cells). */
    Sprite_DepthPlane.prototype.bind = function(level, map, skipCell) {
        this.level = level;
        this.map = map;
        const tm = this._tilemap;
        tm.skipCell = skipCell || null;
        tm.setData(map.width, map.height, map.data);
        tm.horizontalWrap = map.scrollType === 2 || map.scrollType === 3;
        tm.verticalWrap = map.scrollType === 1 || map.scrollType === 3;
        const ts = window.$dataTilesets && $dataTilesets[map.tilesetId];
        tm.flags = ts ? ts.flags : [];
        tm.setBitmaps(ts ? ts.tilesetNames.map(n => ImageManager.loadTileset(n)) : []);
        tm.refresh();
        this._paintsAtBind = tm.paints; // a paint after this one shows the level just bound (switch_same_frame)
        this.clearEntities();
    };
    Sprite_DepthPlane.prototype.refresh = function() { this._tilemap.refresh(); this._entityDirty = true; if (this._objectLayer) this._objectLayer.markDirty(false); };
    Sprite_DepthPlane.prototype.clearEntities = function() {
        for (const m of [this._units, this._items, this._walls]) { for (const s of m.values()) this.releaseSprite(s); m.clear(); }
        if (this._objectLayer) this._objectLayer._hideAll();
        this._entityDirty = true;
        this._winDx = NaN;
    };
    Sprite_DepthPlane.prototype.takeSprite = function() {
        let s = this._pool.pop();
        if (!s) { s = new Sprite(); s.anchor.set(0.5, 1); this._entities.addChild(s); }
        s.visible = false;
        s._ufSheet = null; s._ufCol = -1; s._ufRow = -1; s._ufTinted = false; s._ufFrameOk = false;
        return s;
    };
    Sprite_DepthPlane.prototype.releaseSprite = function(s) { s.visible = false; s.bitmap = null; s._ufRef = null; s._ufSheet = null; this._pool.push(s); };
    /** The cells of the level in and around the view (the same window the live layers use). */
    Sprite_DepthPlane.prototype.entityWindow = function() { return fillWindow({}); };
    function fillWindow(w) {
        const dx = Math.floor($gameMap.displayX()), dy = Math.floor($gameMap.displayY());
        const cols = Math.ceil($gameMap.screenTileX()), rows = Math.ceil($gameMap.screenTileY());
        w.dx = dx; w.dy = dy; w.cols = cols; w.rows = rows;
        w.x0 = dx - ENTITY_MARGIN; w.y0 = dy - ENTITY_MARGIN - ENTITY_TALL; w.x1 = dx + cols + ENTITY_MARGIN; w.y1 = dy + rows + ENTITY_MARGIN;
        return w;
    }
    /** Whether a unit's cell is in the window (the window may cross the loop seam: tested modulo the area size). */
    Sprite_DepthPlane.prototype.inEntityWindow = function(win, x, y, size) {
        return inWindow(win, wrapCell(x - win.x0, size) + win.x0, wrapCell(y - win.y0, size) + win.y0);
    };

    // Units (K2 a/b): membership is checked every frame (Sprite_DepthRoot.scanUnits calls beginScan, seeUnit per unit on the
    // plane's level, endScan). A unit whose cell changed since the last frame gets its sprite's target that same frame and
    // walks there over UnitStepFrames simulation ticks (UF.World._frame), with the sheet's walk frames: presentation only.
    Sprite_DepthPlane.prototype.beginScan = function() { this._scanStamp++; };
    Sprite_DepthPlane.prototype.seeUnit = function(u, win, size, simNow) {
        if (!this.inEntityWindow(win, u.x, u.y, size)) return;
        let s = this._units.get(u.id);
        if (!s) {
            s = this.takeSprite();
            this._units.set(u.id, s);
            s._ufRef = u;
            s._ufKind = "unit";
            s._ufCellX = u.x; s._ufCellY = u.y;
            s._ufFromX = s._ufToX = s._ufPosX = u.x;
            s._ufFromY = s._ufToY = s._ufPosY = u.y;
            s._ufT0 = -Infinity;
            s._ufWalkT0 = simNow;
            s._ufTargetFrame = Graphics.frameCount;
            preloadSheet(u.image);
        } else if (u.x !== s._ufCellX || u.y !== s._ufCellY) {
            const dur = unitStepFrames();
            const fx = wrapCell(s._ufPosX, size), fy = wrapCell(s._ufPosY, size);
            let tx = u.x, ty = u.y;
            if (tx - fx > size / 2) tx -= size; else if (fx - tx > size / 2) tx += size;
            if (ty - fy > size / 2) ty -= size; else if (fy - ty > size / 2) ty += size;
            // More than two cells at once is a placement or a fall, not a step: no walk, the sprite is simply there.
            const jump = Math.abs(tx - fx) > 2 || Math.abs(ty - fy) > 2;
            if (!(simNow - s._ufT0 <= dur + 1)) s._ufWalkT0 = simNow; // a new walk (not the next step of one)
            s._ufFromX = jump ? tx : fx; s._ufFromY = jump ? ty : fy;
            s._ufToX = tx; s._ufToY = ty;
            s._ufT0 = jump ? -Infinity : simNow;
            s._ufCellX = u.x; s._ufCellY = u.y;
            s._ufTargetFrame = Graphics.frameCount;
            stats.unitSteps++;
        }
        s._ufRef = u;
        s._ufSeen = this._scanStamp;
    };
    Sprite_DepthPlane.prototype.endScan = function() {
        for (const [id, s] of this._units) if (s._ufSeen !== this._scanStamp) { this.releaseSprite(s); this._units.delete(id); }
    };
    Sprite_DepthPlane.prototype.updateEntities = function(win, simNow) {
        if (!this.level || !this.map || provoked("entities_drawn")) return; // the provocation: no entities at all
        this._entityFrame++;
        const periodic = this._entityFrame % Math.max(1, config.entityRefreshFrames | 0) === 0;
        if (this._entityDirty || this._winDx !== win.dx || this._winDy !== win.dy || periodic) {
            this._winDx = win.dx;
            this._winDy = win.dy;
            this._entityDirty = false;
            this._itemsDirty = false;
            this.rebuildItems(win);
            this.rebuildWalls(Levels(), win);
            stats.entityRebuilds++;
        } else if (this._itemsDirty) { // an item of this level changed: its item sprites only (K4: never the walls or the objects)
            this._itemsDirty = false;
            this.rebuildItems(win);
            stats.itemRebuilds++;
        }
        if (this._objectLayer) this._objectLayer.update();
        this.placeEntities();
    };
    /** Foot-position order, as the tilemap on screen sorts its children. */
    Sprite_DepthPlane.prototype.sortEntities = function() {
        this._entities.children.sort((a, b) => ((a.z || 0) - (b.z || 0)) || ((a.spriteId || 0) - (b.spriteId || 0)));
    };
    // The window's cells in the area's own coordinates. The areas loop (scrollType 3), so near the edge the view's display
    // origin wraps (a view centred at y 6 has its display at y 255.5) and the window runs past the seam: it is read in up to
    // four pieces inside 0..size-1, never as one query around the unwrapped window (B1, Fix 1: its items at y 3 were never
    // found, and the clamped wall window dropped the wall faces past the seam).
    const SEAM_FAULT = provoked("entities_at_seam"); // the provocation: the old unwrapped item query and clamped wall window
    function windowPieces(win, size) {
        if (SEAM_FAULT) return [[win.x0, win.y0, win.x1, win.y1]];
        const out = [];
        for (const [ya, yb] of seamRanges(win.y0, win.y1, size)) for (const [xa, xb] of seamRanges(win.x0, win.x1, size)) out.push([xa, ya, xb, yb]);
        return out;
    }
    Sprite_DepthPlane.prototype.rebuildItems = function(win) {
        const I = window.UF && UF.Items, keep = new Set();
        const see = it => {
            if (!it || it.holder || it.container) return;
            keep.add(it.id);
            let s = this._items.get(it.id);
            if (!s) { s = this.takeSprite(); this._items.set(it.id, s); }
            s._ufRef = it;
            s._ufKind = "item";
            s._ufFrameOk = false;
        };
        const level = { x: this.level.x, y: this.level.y, z: this.level.z };
        if (config.entities.items && I && SEAM_FAULT && I.find) {
            const near = { x: win.dx + win.cols / 2, y: win.dy + win.rows / 2 }, radius = Math.hypot(win.cols / 2 + ENTITY_MARGIN, win.rows / 2 + ENTITY_MARGIN + ENTITY_TALL);
            for (const f of I.find({ area: level, near, radius })) see(f.item);
        } else if (config.entities.items && I && I.find) {
            // One query per piece of the window, centred on the piece in the area's own coordinates, kept to the piece's cells
            // (one piece away from the seam: the cost of the single query it replaces; a cell lookup per window cell cost more).
            for (const [x0, y0, x1, y1] of windowPieces(win, World().state.size)) {
                const near = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, radius = Math.hypot((x1 - x0) / 2, (y1 - y0) / 2) + 0.5;
                for (const f of I.find({ area: level, near, radius })) if (f.x >= x0 && f.x <= x1 && f.y >= y0 && f.y <= y1) see(f.item);
            }
        }
        for (const [id, s] of this._items) if (!keep.has(id)) { this.releaseSprite(s); this._items.delete(id); }
    };
    Sprite_DepthPlane.prototype.rebuildWalls = function(L, win) {
        const keep = new Set();
        if (config.entities.walls && L && L.naturalWallCells) {
            const area = { x: this.level.x, y: this.level.y }, z = this.level.z, pieces = windowPieces(win, World().state.size);
            const wallCells = [], connectorCells = [];
            for (const [x0, y0, x1, y1] of pieces) {
                for (const c of L.naturalWallCells(area, z, x0, y0, x1, y1)) wallCells.push(c);
                if (z === 0 && L.groundConnectorCells) for (const c of L.groundConnectorCells(area, x0, y0, x1, y1)) connectorCells.push(c);
            }
            for (const c of wallCells) {
                const bmp = L.naturalWallFrame(c.code, c.mask);
                if (!bmp) continue;
                const k = `${c.x},${c.y}`;
                keep.add(k);
                let s = this._walls.get(k);
                if (!s) { s = this.takeSprite(); this._walls.set(k, s); }
                s._ufRef = { x: c.x, y: c.y, bitmap: bmp, z: null };
                s._ufKind = "wall";
                s._ufFrameOk = false;
            }
            for (const c of connectorCells) {
                const bmp = connectorFrame(c.look);
                if (!bmp) continue;
                const k = `c:${c.x},${c.y}`;
                keep.add(k);
                let s = this._walls.get(k);
                if (!s) { s = this.takeSprite(); this._walls.set(k, s); }
                s._ufRef = { x: c.x, y: c.y, bitmap: bmp, z: 0.5 };
                s._ufKind = "connector";
                s._ufFrameOk = false;
            }
        }
        for (const [k, s] of this._walls) if (!keep.has(k)) { this.releaseSprite(s); this._walls.delete(k); }
    };
    // Game_Map.adjustX / adjustY against a given display origin: the one the tiles of this frame were placed with.
    const adjustAt = (v, disp, mapSize, screenTiles, loop) => (loop && v < disp - (mapSize - screenTiles) / 2 ? v - disp + mapSize : v - disp);
    /** Units: position (a step walks from the last cell to the new one over UnitStepFrames ticks) and frame (walk or stand).
     *  cam: the display origin { x, y } in tiles the plane's tiles were placed with this frame. */
    Sprite_DepthPlane.prototype.placeUnits = function(simNow, cam) {
        const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight(), size = World().state.size, dur = unitStepFrames();
        const mw = $gameMap.width(), mh = $gameMap.height(), stx = $gameMap.screenTileX(), sty = $gameMap.screenTileY();
        const loopX = $gameMap.isLoopHorizontal(), loopY = $gameMap.isLoopVertical();
        for (const s of this._units.values()) {
            const u = s._ufRef, img = u.image;
            let info = s._ufSheet;
            if (!info || info.name !== (img && img.characterName) || info.index !== ((img && img.characterIndex) | 0)) {
                info = s._ufSheet = sheetOf(img);
                s._ufCol = -1; s._ufRow = -1;
                if (info) s.anchor.set(info.ax, info.ay);
            }
            if (!info) { s.visible = false; continue; }
            if (s.bitmap !== info.bitmap) { s.bitmap = info.bitmap; s._ufCol = -1; }
            const e = simNow - s._ufT0;
            let px = s._ufToX, py = s._ufToY;
            if (e < dur) {
                const k = e > 0 ? e / dur : 0;
                px = s._ufFromX + (s._ufToX - s._ufFromX) * k;
                py = s._ufFromY + (s._ufToY - s._ufFromY) * k;
            }
            s._ufPosX = px;
            s._ufPosY = py;
            const walking = e <= dur + 1;
            const col = walking ? info.walk[Math.floor(Math.max(0, simNow - s._ufWalkT0) / info.walkTicks) % info.walk.length] : info.stand;
            const row = rowOf(info, u.dir, u.dir8);
            if (col !== s._ufCol || row !== s._ufRow) {
                s.setFrame((info.blockX + col) * info.fw, (info.blockY + row) * info.fh, info.fw, info.fh);
                s._ufCol = col;
                s._ufRow = row;
            }
            const tint = u.data ? u.data.tint : undefined; // the unit's own colour (its data), not depth shading
            if (!s._ufTinted || tint !== s._ufTintSrc) { s.tint = tintOf(tint); s._ufTintSrc = tint; s._ufTinted = true; }
            s.x = Math.round((adjustAt(wrapCell(px, size), cam.x, mw, stx, loopX) + 0.5) * tw);
            s.y = Math.round((adjustAt(wrapCell(py, size), cam.y, mh, sty, loopY) + 1) * th);
            s.z = s.y;
            s.visible = true;
        }
    };
    Sprite_DepthPlane.prototype.placeEntities = function() {
        const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
        const foot = (x, y) => ({ x: Math.round(($gameMap.adjustX(x) + 0.5) * tw), y: Math.round(($gameMap.adjustY(y) + 1) * th) });
        for (const s of this._items.values()) {
            const it = s._ufRef;
            if (!s._ufFrameOk) {
                const f = itemFrame(it);
                if (!f) { s.visible = false; continue; }
                forceNearest(f.bitmap);
                if (s.bitmap !== f.bitmap) s.bitmap = f.bitmap;
                s.setFrame(f.sx, f.sy, f.w, f.h);
                s.anchor.set(f.ax, f.ay);
                s.tint = f.tint; // the item's material or type colour, not depth shading
                s._ufFrameOk = true;
            }
            const p = foot(it.x, it.y);
            s.x = p.x; s.y = p.y; s.z = p.y - 1; s.visible = true; // an item lies under a unit on the same cell
        }
        for (const s of this._walls.values()) {
            const r = s._ufRef;
            if (!s._ufFrameOk) {
                forceNearest(r.bitmap);
                if (s.bitmap !== r.bitmap) s.bitmap = r.bitmap;
                s.setFrame(0, 0, r.bitmap.width, r.bitmap.height);
                s.anchor.set(0.5, 1);
                s.tint = 0xffffff;
                s._ufFrameOk = true;
            }
            const p = foot(r.x, r.y);
            s.x = p.x; s.y = p.y; s.z = r.z === null ? Math.max(7, p.y) : r.z; s.visible = true;
        }
    };
    Sprite_DepthPlane.prototype.entityCounts = function() {
        const vis = m => [...m.values()].filter(s => s.visible).length;
        return { objects: this._objectLayer ? this._objectLayer.count() : 0, units: vis(this._units), items: vis(this._items), walls: vis(this._walls) };
    };
    /** The screen position of the plane's canvas: the same rounding as the tilemap on screen, so a lower level's cell is drawn
     *  exactly where that cell of the viewed level is. */
    Sprite_DepthPlane.prototype.unprojected = function(viewOx, viewOy) {
        const tm = this._tilemap;
        return { x: tm._lastStartX * TW - Math.ceil(viewOx), y: tm._lastStartY * TH - Math.ceil(viewOy) };
    };
    Sprite_DepthPlane.prototype.updatePlane = function(viewOx, viewOy, win, simNow) {
        const tm = this._tilemap;
        tm.origin.x = viewOx - PAD;
        tm.origin.y = viewOy - PAD;
        tm.update();
        tm.updateTransform(); // paints when the start tile, the water frame or a refresh asks for it
        const u = this.unprojected(viewOx, viewOy);
        // DEC-011: 1:1, no projection, no parallax. The plane's canvas sits exactly where the tilemap on screen puts its own.
        let x = u.x, y = u.y, s = 1;
        if (REPROJECT) { // provocations only: the removed centre projection
            s = REPROJECT;
            x = Math.round(Graphics.width / 2 + (u.x - Graphics.width / 2) * s);
            y = Math.round(Graphics.height / 2 + (u.y - Graphics.height / 2) * s);
        }
        if (HALF_PIXEL) x += 0.5;
        if (provoked("flat_position")) x += 1;
        this.x = x;
        this.y = y;
        if (this.scale.x !== s || this.scale.y !== s) this.scale.set(s, s);
        // Entities are placed in screen coordinates; the canvas origin is the plane's local origin.
        this._entities.x = -u.x;
        this._entities.y = -u.y;
        this.updateEntities(win, simNow);
        if (this._appliedStamp !== config._stamp) this.applyLook();
    };
    /** DEC-011: a plane is drawn as it is. No filter of any kind, full alpha, nearest-sampled canvases. */
    Sprite_DepthPlane.prototype.applyLook = function() {
        this.filters = null;
        this.alpha = 1;
        this._entities.filters = INJECT_FILTER ? [new PIXI.filters.ColorMatrixFilter()] : null;
        if (this._lower.bitmap) this._lower.bitmap.smooth = HALF_PIXEL;
        if (this._upper.bitmap) this._upper.bitmap.smooth = HALF_PIXEL;
        this._appliedStamp = config._stamp;
    };

    //-------------------------------------------------------------------------
    // The manager of one Spriteset_Map: which lower levels are drawn, from which builds, and which cells of the map on
    // screen are not painted (the viewed level's open cells, while the planes are on).

    function Sprite_DepthRoot() { this.initialize(...arguments); }
    Sprite_DepthRoot.prototype = Object.create(PIXI.Container.prototype);
    Sprite_DepthRoot.prototype.constructor = Sprite_DepthRoot;
    Sprite_DepthRoot.prototype.initialize = function(mainTilemap) {
        PIXI.Container.call(this);
        this.spriteId = Sprite._counter++;
        // Below the lower tile layer (z 0) of the map on screen: its opaque tiles are the exposure mask. The
        // exposure provocation lifts the planes above the tile layer, so a floor cell would change too.
        const exposureFault = provokedAny("exposure", "exposure_by_upper_geometry");
        this.z = exposureFault ? 0.5 : -1;
        this._main = mainTilemap || null;
        // The void below the last drawn level: under the planes, over the parallax. Where the level on screen and the
        // drawn level(s) below are all open, this is what shows (never the sky). The void_beyond provocation hides it.
        this._void = new PIXI.Graphics();
        this._void.beginFill(config.voidColor).drawRect(0, 0, Graphics.width, Graphics.height).endFill();
        this._void.visible = false;
        this.addChild(this._void);
        this.planes = [new Sprite_DepthPlane(1), new Sprite_DepthPlane(2)];
        // Depth 2 is drawn first, depth 1 over it; through depth 1's open cells depth 2 shows.
        // The mask-order provocation draws them the other way round.
        const order = provoked("mask_order") ? [this.planes[0], this.planes[1]] : [this.planes[1], this.planes[0]];
        for (const p of order) this.addChild(p);
        // The exposure mask: the planes and the void draw only inside the viewed level's open cells (a stencil Graphics mask,
        // not a filter). The viewed level's tiles occlude them as well, but a solid cell whose art has transparent pixels
        // (AUDIT_LOG A9) must still not show the level below. The exposure provocation drops it with the tile-layer order.
        this._exposureMask = new PIXI.Graphics();
        this.addChild(this._exposureMask);
        this.mask = exposureFault ? null : this._exposureMask; // (not this._mask: that is PIXI's own field behind .mask)
        if (exposureFault) this._exposureMask.visible = false; // not a mask then, and never drawn itself
        this._maskX = NaN;
        this._maskY = NaN;
        this._maskRev = -1;
        this.viewZ = null;
        this.openStamp = -1;
        this.maxDepth = config.maxDepth;
        this.enabledState = config.enabled;
        this.seeThrough = false;   // the viewed level's open cells show what is below (planes or the void)
        this._viewCells = null;    // openCells() of the viewed level
        this._size = 0;
        this._win = {};
        this._frames = 0;
        this._released = false;
        this._lateSeen = false;    // Scene_Map runs lateUpdate: the spriteset's update leaves the units to it
        this._cands = [];          // the units on the bound planes' levels (K4), made from this._candsOf
        this._candsOf = null;
        this._candsStamp = -1;
        this._candsFrame = -Infinity;
        this._unitsLate = false;
        this.rebuild();
    };
    Sprite_DepthRoot.prototype.destroy = function() {
        PIXI.Container.prototype.destroy.call(this, { children: true });
    };
    /** Scene_Map.terminate: the canvases go back to the pool; this root draws nothing more. */
    Sprite_DepthRoot.prototype.releaseCanvases = function() {
        for (const p of this.planes) p.releaseCanvases();
        this._released = true;
        this.seeThrough = false;
        this._void.visible = false;
    };
    /** Bind the planes to the levels below the level on screen (none when nothing can show through). */
    Sprite_DepthRoot.prototype.rebuild = function() {
        const W = World(), L = Levels();
        const v = W && W.viewLevel ? W.viewLevel() : null;
        stats.rebuilds++;
        this.viewZ = v ? v.z : null;
        this.openStamp = openStamp;
        this.maxDepth = config.maxDepth;
        this.enabledState = config.enabled;
        for (const p of this.planes) { p.visible = false; p.level = null; p.map = null; }
        const was = this.seeThrough;
        this.seeThrough = false;
        this._viewCells = null;
        this._maskX = NaN; // the mask is rebuilt on the next frame
        this._candsOf = null; // and the unit candidates
        if (v && L && W.state && config.enabled && config.maxDepth >= 1 && !this._released && !provoked("planes_present")) {
            const cells = openCells(v.x, v.y, v.z);
            if (config.exposes(v.z) && cells.open > 0) {
                this.seeThrough = true;
                this._viewCells = cells;
                this._size = W.state.size;
                this.bindPlane(this.planes[0], v, v.z - 1);
                if (config.maxDepth >= 2 && this.planes[0].level && config.exposes(v.z - 1) && openCells(v.x, v.y, v.z - 1).open > 0) this.bindPlane(this.planes[1], v, v.z - 2);
                preloadArea(v, this.planes.filter(p => p.level).map(p => p.level.z));
            }
        }
        if (was !== this.seeThrough) this.repaintMain();
    };
    /** A level went on screen (world:levelBuilt / world:areaBuilt). A map load fires these before the new scene has a spriteset,
     *  so no root hears them: the new root binds, paints and places everything when it is made (createCharacters). An in-place
     *  switch (SIM.00.00) keeps the spriteset and this root: DEUS_Levels' finishSwitch calls UF.World.rebindSpriteset at the
     *  start of the spriteset's update, which fires the event, and emits levels:viewChanged only after rebindSpriteset returns.
     *  So the planes are bound AND painted, and their entities and units placed, here, before that event, whatever the order of
     *  its listeners (Fix 2). The switch_same_frame provocation leaves it to the frame's own update and holds the units back
     *  one more frame (a lag the check must see both at the event and in the first frame drawn). */
    Sprite_DepthRoot.prototype.levelShown = function() {
        this.rebuild();
        if (this._released) return;
        if (provoked("switch_same_frame")) { this._unitsLate = true; return; }
        this.sync();
    };
    /** The work of one whole frame, now: the planes placed and painted, their entities placed, the units scanned and placed. */
    Sprite_DepthRoot.prototype.sync = function() {
        this.update(false);
        if (this._released || !this.seeThrough || !this._camSet || !window.$gameMap) return;
        const W = World();
        this.updateUnits(W, this._win, W._frame | 0);
    };
    Sprite_DepthRoot.prototype.bindPlane = function(plane, v, z) {
        const W = World(), L = Levels();
        if (!L.isLevel(z) || !W.inWorld(v.x, v.y, z)) return;
        const t0 = performance.now();
        const map = W.peekArea(v.x, v.y, z);
        stats.peeks++;
        stats.lastPeekMs = performance.now() - t0;
        if (!map || !map.data) return;
        const cells = openCells(v.x, v.y, z), size = W.state.size, OPEN = openCode();
        plane.bind({ x: v.x, y: v.y, z }, map, (mx, my) => isOpenIn(cells, size, mx, my, OPEN));
        plane.visible = true;
    };
    /** Whether the map on screen leaves cell (mx, my) unpainted: an open cell of the viewed level while the planes are on. */
    Sprite_DepthRoot.prototype.skipsMainCell = function(mx, my) {
        return this.seeThrough && !!this._viewCells && isOpenIn(this._viewCells, this._size, mx, my, openCode());
    };
    Sprite_DepthRoot.prototype.repaintMain = function() {
        if (this._main && this._main.refresh) { this._main.refresh(); stats.mainRepaints++; }
    };
    /** Per frame, from the spriteset's update (before the map and the world update in RMMZ's order). withUnits: false when
     *  lateUpdate follows this frame (Scene_Map), true when it does not (the construction of a spriteset). */
    Sprite_DepthRoot.prototype.update = function(withUnits = true) {
        if (this._released) return;
        const t0 = performance.now();
        const W = World();
        const v = W && W.viewLevel ? W.viewLevel() : null;
        const z = v ? v.z : null;
        if (z !== this.viewZ || this.openStamp !== openStamp || this.maxDepth !== config.maxDepth || this.enabledState !== config.enabled) this.rebuild();
        this._void.visible = this.seeThrough && !provoked("void_beyond");
        if (!this.seeThrough || !window.$gameMap) { for (const p of this.planes) p.visible = false; this._camSet = false; return; }
        this._cam = this._cam || { x: 0, y: 0 };
        this._cam.x = $gameMap.displayX();
        this._cam.y = $gameMap.displayY();
        this._camSet = true;
        const viewOx = this._cam.x * $gameMap.tileWidth();
        const viewOy = this._cam.y * $gameMap.tileHeight();
        const win = fillWindow(this._win), simNow = W._frame | 0;
        this._frames++;
        this.updateMask(viewOx, viewOy);
        for (const p of this.planes) {
            if (!p.level) { p.visible = false; continue; }
            p.visible = true;
            p.updatePlane(viewOx, viewOy, win, simNow);
        }
        if (withUnits && !this._lateSeen) this.updateUnits(W, win, simNow); // once a frame: lateUpdate does it in Scene_Map (K4)
        stats.updates++;
        stats.lastUpdateMs = performance.now() - t0;
    };
    /** After the map and the world have updated this frame (Scene_Map.update): the units' membership, targets and frames, so a
     *  step taken this frame is on its sprite before this frame is drawn. Units are placed against the camera the tiles of
     *  this frame were placed with, so a scroll in the map update cannot shift them off their cells. */
    Sprite_DepthRoot.prototype.lateUpdate = function() {
        if (this._released || !this.seeThrough || !this._camSet || !window.$gameMap) return;
        this._lateSeen = true;
        if (this._unitsLate) { this._unitsLate = false; return; } // the switch_same_frame provocation only (levelShown)
        const t0 = performance.now();
        const W = World();
        this.updateUnits(W, this._win, W._frame | 0);
        stats.lastUpdateMs += performance.now() - t0;
    };
    Sprite_DepthRoot.prototype.updateUnits = function(W, win, simNow) {
        this.scanUnits(W, win, simNow);
        for (const p of this.planes) {
            if (!p.level || provoked("entities_drawn")) continue;
            p.placeUnits(simNow, this._cam);
            p.sortEntities();
        }
    };
    /** The exposure mask: one rectangle per horizontal run of open cells of the viewed level in the tilemap's window, placed
     *  with the tilemap's own rounding. Rebuilt when the window's start cell or a shape changes; moved every frame. */
    Sprite_DepthRoot.prototype.updateMask = function(viewOx, viewOy) {
        const m = this._exposureMask, main = this._main;
        const margin = main && Number.isFinite(main._margin) ? main._margin : 20;
        const ox = Math.ceil(viewOx), oy = Math.ceil(viewOy);
        const sx = Math.floor((ox - margin) / TW), sy = Math.floor((oy - margin) / TH);
        if (sx !== this._maskX || sy !== this._maskY || this._maskRev !== shapeRevision || this._maskStamp !== openStamp) {
            const cols = Math.ceil((Graphics.width + margin * 2) / TW) + 1, rows = Math.ceil((Graphics.height + margin * 2) / TH) + 1;
            m.clear();
            m.beginFill(0xffffff);
            for (let j = 0; j < rows; j++) {
                let run = -1;
                for (let i = 0; i <= cols; i++) {
                    const open = i < cols && this.skipsMainCell(sx + i, sy + j);
                    if (open && run < 0) run = i;
                    else if (!open && run >= 0) { m.drawRect(run * TW, j * TH, (i - run) * TW, TH); run = -1; }
                }
            }
            m.endFill();
            this._maskX = sx;
            this._maskY = sy;
            this._maskRev = shapeRevision;
            this._maskStamp = openStamp;
        }
        m.x = sx * TW - ox;
        m.y = sy * TH - oy;
    };
    /** Plane unit membership, every frame (K2 b): one pass over the world's unit list (no allocation), each unit tested
     *  against the bound planes' levels and the view window. A world:unitMoved listener would be the event-driven way, but
     *  UF.Events writes a line to game_runtime.log for every listener of every world:* event (DEUS_Core), about 0.14 ms each. */
    Sprite_DepthRoot.prototype.scanUnits = function(W, win, simNow) {
        // The unit_step_same_frame provocation: the old path, units re-read only every 60 frames.
        if (provoked("unit_step_same_frame") && this._frames % 60 !== 1) return;
        const a = this.planes[0].level ? this.planes[0] : null, b = this.planes[1].level ? this.planes[1] : null;
        if (a) a.beginScan();
        if (b) b.beginScan();
        if (config.entities.units && W.units && !provoked("entities_drawn")) {
            const cands = this.unitCandidates(W, a, b), size = W.state.size;
            for (let i = 0; i < cands.length; i++) {
                const u = cands[i];
                if (!u || !u.area || (u.data && (u.data.dead || u.data.hidden))) continue;
                const uz = u.z !== undefined ? u.z : 0;
                if (a && uz === a.level.z && u.area.x === a.level.x && u.area.y === a.level.y) a.seeUnit(u, win, size, simNow);
                else if (b && uz === b.level.z && u.area.x === b.level.x && u.area.y === b.level.y) b.seeUnit(u, win, size, simNow);
            }
            stats.unitsScanned = cands.length;
        }
        if (a) a.endScan();
        if (b) b.endScan();
    };
    /** The units that can be on a bound plane (K4): made from the world's list when that list changes (a unit added or
     *  removed makes a new array), when a unit changes level or area, when the planes are bound again, and at least once a
     *  second as a safety net. Each frame then tests these units only, not every unit of the world. */
    const CANDIDATE_REFRESH_FRAMES = 60;
    Sprite_DepthRoot.prototype.unitCandidates = function(W, a, b) {
        const all = W.units();
        if (provoked("scan_candidates_only")) return all; // the provocation: every unit of the world, every frame
        if (all !== this._candsOf || this._candsStamp !== unitPlaceStamp || this._frames - this._candsFrame >= CANDIDATE_REFRESH_FRAMES) {
            const c = this._cands;
            c.length = 0;
            for (let i = 0; i < all.length; i++) {
                const u = all[i];
                if (!u || !u.area) continue;
                const uz = u.z !== undefined ? u.z : 0;
                if ((a && uz === a.level.z && u.area.x === a.level.x && u.area.y === a.level.y) || (b && uz === b.level.z && u.area.x === b.level.x && u.area.y === b.level.y)) c.push(u);
            }
            this._candsOf = all;
            this._candsStamp = unitPlaceStamp;
            this._candsFrame = this._frames;
            stats.candidateRebuilds++;
        }
        return this._cands;
    };
    /** A level's tiles changed: repaint its plane. If the peek cache evicted the plane's build meanwhile (the change
     *  went into a newer build), read the level again first. Never per frame: a re-read can be a synchronous build. */
    Sprite_DepthRoot.prototype.refreshLevel = function(z) {
        if (this._released) return;
        const W = World();
        const v = W && W.viewLevel ? W.viewLevel() : null;
        for (const p of this.planes) {
            if (!p.level || (z !== undefined && p.level.z !== z)) continue;
            if (v && W.cachedBuild(p.level.x, p.level.y, p.level.z) !== p.map) this.bindPlane(p, v, p.level.z);
            p.refresh();
        }
    };
    /** A level's objects changed: its plane's object layer rebuilds on the next frame. */
    Sprite_DepthRoot.prototype.dirtyObjects = function(z) {
        for (const p of this.planes) if (p.level && (z === undefined || p.level.z === z) && p._objectLayer) { p._objectLayer.markDirty(false); stats.objectDirties++; }
    };
    /** An item changed (UF_Items items:changed): only the item sprites of a plane re-read, and only when the item is on the
     *  ground of that plane's level or was drawn there. A held or contained item (an arrow shot, a meal eaten) touches no
     *  plane. K4: combat fired this for every arrow and rebuilt every plane's walls and objects each frame. */
    Sprite_DepthRoot.prototype.itemChanged = function(item) {
        if (this._released) return;
        const onGround = !!item && !!item.area && (item.holder === null || item.holder === undefined) && (item.container === null || item.container === undefined);
        for (const p of this.planes) {
            if (!p.level) continue;
            if (provoked("item_change_scoped")) { p._entityDirty = true; if (p._objectLayer) p._objectLayer.markDirty(false); continue; } // the old storm
            const here = onGround && item.area.x === p.level.x && item.area.y === p.level.y && (item.z || 0) === p.level.z;
            if (here || (item && p._items.has(item.id))) { p._itemsDirty = true; stats.itemDirties++; }
        }
    };
    /** A cell's shape changed: the plane of its level repaints (its open cells changed), and so does the map on screen when
     *  the cell is on the viewed level (the cells it leaves unpainted changed). */
    Sprite_DepthRoot.prototype.shapeChanged = function(ref) {
        if (this._released) return;
        const z = ref && typeof ref.z === "number" ? ref.z : undefined;
        if (z === undefined || z === this.viewZ) this.repaintMain();
        this.refreshLevel(z);
    };

    //-------------------------------------------------------------------------
    // Wiring into the map scene

    const rootOf = () => {
        const s = SceneManager._scene;
        return s instanceof Scene_Map && s._spriteset ? s._spriteset._ufDepth || null : null;
    };

    /** The map's own tilemap leaves the viewed level's open cells unpainted while the planes are on (its root decides). */
    function installMainSkip(tilemap, root) {
        if (!tilemap) return;
        tilemap._ufDepthRoot = root;
        if (tilemap._ufDepthSkip) return;
        tilemap._ufDepthSkip = true;
        tilemap._addSpot = function(startX, startY, x, y) {
            const r = this._ufDepthRoot;
            if (r && r.seeThrough && r.skipsMainCell(startX + x, startY + y)) return;
            Tilemap.prototype._addSpot.call(this, startX, startY, x, y);
        };
    }

    const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _Spriteset_Map_createCharacters.call(this);
        this._ufDepth = new Sprite_DepthRoot(this._tilemap);
        installMainSkip(this._tilemap, this._ufDepth);
        this._tilemap.addChild(this._ufDepth);
        // Bind, paint and place the planes now, so the first frame after a map transfer (an area edge, a load) already shows them
        // (K2). An in-place level switch keeps this root (levelShown). The switch_same_frame provocation leaves it to the first update.
        if (!provoked("switch_same_frame") && window.$gameMap) this._ufDepth.update();
    };
    const _Spriteset_Map_updateTilemap = Spriteset_Map.prototype.updateTilemap;
    Spriteset_Map.prototype.updateTilemap = function() {
        _Spriteset_Map_updateTilemap.call(this);
        if (this._ufDepth) this._ufDepth.update(); // the units wait for lateUpdate once Scene_Map has run one
    };
    // RMMZ updates the spriteset before the map (Scene_Map.update), so the units of the lower levels are updated again after it.
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        const r = this._spriteset && this._spriteset._ufDepth;
        if (r) r.lateUpdate();
    };
    // After the scene's own snapshot for the next scene's background, the canvases go back to the pool (K2 d).
    const _Scene_Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        _Scene_Map_terminate.call(this);
        const r = this._spriteset && this._spriteset._ufDepth;
        if (r) r.releaseCanvases();
    };
    // Every unit sheet of the area on screen starts loading when a scene starts, so a later level switch finds them ready (K2 c).
    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        const W = World();
        preloadArea(W && W.viewLevel ? W.viewLevel() : null, null);
    };

    function hookEvents() {
        const E = window.UF && UF.Events;
        if (!E || !E.on) return false;
        const onShape = ref => { patchOpenCell(ref); const r = rootOf(); if (r) r.shapeChanged(ref); };
        E.on("levels:shapeChanged", onShape);
        E.on("levels:cellChanged", onShape);
        E.on("world:levelTileChanged", lv => { const r = rootOf(); if (r) r.refreshLevel(lv && lv.z); });
        E.on("world:tileChanged", () => { const r = rootOf(); if (r) r.refreshLevel(0); });
        // A level went on screen: in place (SIM.00.00) from inside UF.World.rebindSpriteset, before levels:viewChanged (levelShown).
        E.on("world:levelBuilt", () => { const r = rootOf(); if (r) r.levelShown(); });
        E.on("world:areaBuilt", () => { const r = rootOf(); if (r) r.levelShown(); });
        E.on("world:created", () => { shapesReset(); sheets.clear(); });
        // The lower levels' objects (per level or the ground) and items. Units need no event: they are checked every frame.
        E.on("objects:levelChanged", lv => { const r = rootOf(); if (r) r.dirtyObjects(lv && lv.z); });
        E.on("objects:changed", () => { const r = rootOf(); if (r) r.dirtyObjects(0); });
        E.on("items:changed", item => { const r = rootOf(); if (r) r.itemChanged(item); });
        // A unit that changes level or area may join or leave a plane's level: the unit candidates are made again (K4).
        const moved = u => { unitPlaceStamp++; preloadSheet(u && u.image); };
        E.on("world:unitLevelChanged", moved);
        E.on("world:unitAreaChanged", moved);
        // A new unit's sheet starts loading at once, wherever it is (K2 c).
        E.on("world:unitAdded", u => preloadSheet(u && u.image));
        E.on("world:unitImageChanged", u => preloadSheet(u && u.image));
        return true;
    }

    //-------------------------------------------------------------------------
    // The public object

    const Depth = {
        config,
        PAD,
        /** DEC-011: every level is drawn 1:1, so a point of a lower level lands where it would on its own level (the identity). */
        project: (d, sx, sy) => ({ x: sx, y: sy }),
        /** No projection, no parallax: the edge shift of every depth is 0 px. */
        edgeShift: () => 0,
        setEnabled(on) { config.enabled = !!on; config._stamp++; const r = rootOf(); if (r) r.rebuild(); return config.enabled; },
        /** Call after editing config so the planes pick the change up on the next frame. */
        touch() { config._stamp++; },
        refresh() { const r = rootOf(); if (r) r.refreshLevel(); },
        rebuild() { const r = rootOf(); if (r) r.rebuild(); },
        root: rootOf,
        planes: () => { const r = rootOf(); return r ? r.planes.filter(p => p.visible && p.level) : []; },
        /** How many sheets the unit preload started are still loading (0: every one is ready or failed). */
        preloadsPending: () => { let n = 0; for (const b of preloaded.values()) if (!b.isReady() && !b.isError()) n++; return n; },
        /** Whether cell (x, y) of level z of area (ax, ay) is open (from the cached shape grid). */
        isOpen: (ax, ay, x, y, z) => { const W = World(); return !!(W && W.state) && isOpenIn(openCells(ax, ay, z), W.state.size, x, y, openCode()); },
        describe: () => `${config.maxDepth} level(s) below, drawn 1:1 (DEC-011), void #${config.voidColor.toString(16).padStart(6, "0")}` + (config.enabled ? "" : " (off)"),
        stats() {
            const r = rootOf();
            return {
                enabled: config.enabled, maxDepth: config.maxDepth, view: r ? r.viewZ : null, seeThrough: !!(r && r.seeThrough),
                voidVisible: !!(r && r._void && r._void.visible),
                rebuilds: stats.rebuilds, paints: stats.paints, lastPaintMs: stats.lastPaintMs, peeks: stats.peeks, lastPeekMs: stats.lastPeekMs,
                layersAlive: stats.layersAlive, canvasesMade: stats.canvasesMade, canvasesDestroyed: stats.canvasesDestroyed, pooled: canvasPool.length,
                updates: stats.updates, lastUpdateMs: stats.lastUpdateMs, unitSteps: stats.unitSteps, preloads: stats.preloads, mainRepaints: stats.mainRepaints,
                unitsScanned: stats.unitsScanned, candidateRebuilds: stats.candidateRebuilds, entityRebuilds: stats.entityRebuilds, itemRebuilds: stats.itemRebuilds, itemDirties: stats.itemDirties, objectDirties: stats.objectDirties,
                planes: r ? r.planes.map(p => ({
                    depth: p.depth, z: p.level ? p.level.z : null, visible: p.visible, scale: p.scale.x, x: p.x, y: p.y, alpha: p.alpha,
                    paints: p._tilemap ? p._tilemap.paints : 0, water: p._tilemap ? p._tilemap.hasWater() : false,
                    entities: p.entityCounts(),
                    filters: (p.filters || []).map(f => f.constructor.name),
                    bitmap: p._tilemap && p._tilemap._lowerLayer.bitmap ? { width: p._tilemap._lowerLayer.bitmap.width, height: p._tilemap._lowerLayer.bitmap.height } : null
                })) : []
            };
        }
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Depth = Depth;

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        hookEvents();
        if (window.UF && UF.Test && UF.Test.active) registerChecks();
    };

    //-------------------------------------------------------------------------
    // Checks: suites "depth" and "layers_flat" (run on their own). Each check has a provocation UF_TEST_PROVOKE=depth.<check>
    // where one exists (docs/systems/DEUS_Depth.md §6).

    // The fixture scene (WG.00.09b Fix 1, B2): every cell a check judges is built here, on all five levels, with explicit
    // strata and ground tiles, so that no check depends on what the world generator made. Columns (levels -2, -1, 0, +1, +2;
    // S solid, F floor, O open):
    //   low       S S F O O   the ground cell painted with the catalog's first ground kind (kinds 0-3 have art, AUDIT_LOG A9)
    //   terrace   S S S F O   a +1 stone floor under +2's open air
    //   summit    S S S S F   a +2 stone floor on a +1 stone hill (its +1 cells next to the terrace draw natural wall faces)
    //   deck      S S F F O   a +1 wooden deck (constructed) over painted low ground
    //   cutFloor  F F O O O   the Z-2 cut ("cuts down to z-2", Owner 2026-09-25 23:52 CT): open on the ground; this cell has a
    //   cut       F O O O O   -1 floor, the other five are open on -1 over a -2 floor
    // Layout, as offsets from the scene's centre C (every view of both suites is centred on C; the screen is 17 x 13 cells):
    //   rows -4..-2: the terrace at dx -7..-3 (its hole at (-5,-3) is low ground), the deck at dx -2..0 on row -2, the summit
    //   at dx 3..6; rows -1..0: the cut at dx -1..1 (the -1 floor at (-1,-1)); the rest of dx -8..7, dy -5..3 is low ground.
    const S5 = m => [m, m, m, m, m], F5 = m => [m, "air", "air", "air", "air"], A5 = S5("air");
    const SCENE_COLUMNS = {
        low: { strata: [S5("stone"), S5("stone"), F5("soil"), A5, A5], shapes: ["solid", "solid", "floor", "open", "open"] },
        terrace: { strata: [S5("stone"), S5("stone"), S5("stone"), F5("stone"), A5], shapes: ["solid", "solid", "solid", "floor", "open"] },
        summit: { strata: [S5("stone"), S5("stone"), S5("stone"), S5("stone"), F5("stone")], shapes: ["solid", "solid", "solid", "solid", "floor"] },
        deck: { strata: [S5("stone"), S5("stone"), F5("soil"), F5("wood"), A5], shapes: ["solid", "solid", "floor", "floor", "open"], constructedZ: 1 },
        cutFloor: { strata: [F5("stone"), F5("stone"), A5, A5, A5], shapes: ["floor", "floor", "open", "open", "open"] },
        cut: { strata: [F5("stone"), A5, A5, A5, A5], shapes: ["floor", "open", "open", "open", "open"] }
    };
    const SCENE_BOX = { dx0: -8, dx1: 7, dy0: -5, dy1: 3 };
    // No unit on any level here when the scene is built (the entity window of every view of C, with the checks' pans), and the
    // simulation is paused while the checks look: no unit of the world is in a window a check judges.
    const SCENE_ZONE = { dx0: -16, dx1: 16, dy0: -18, dy1: 14 };
    function sceneKind(dx, dy) {
        if (dx >= -1 && dx <= 1 && dy >= -1 && dy <= 0) return dx === -1 && dy === -1 ? "cutFloor" : "cut";
        if (dx >= -7 && dx <= -3 && dy >= -4 && dy <= -2) return dx === -5 && dy === -3 ? "low" : "terrace";
        if (dx >= -2 && dx <= 0 && dy === -2) return "deck";
        if (dx >= 3 && dx <= 6 && dy >= -4 && dy <= -2) return "summit";
        return "low";
    }
    // The cells the checks judge (offsets from C).
    const SCENE_AT = {
        hole: [-5, -3], deckMid: [-1, -2],
        summitFloor: [4, -3],   // +2 floor: the exposure check's floor cell and the +2 view's reference cell
        terraceAir: [-3, -4],   // +2 open over the +1 terrace: the exposure check's open cell, flat_transform's texel
        terraceRef: [-4, -4],   // a +1 terrace floor: the +1 view's reference cell
        chain: [4, 2],          // low ground, open on +2 and +1 over the painted ground: the two-depth chain, the void, the pan
        groundRef: [-2, -1],    // a ground floor cell next to the cut: the ground view's reference cell
        minus1Ref: [-2, -1],    // -1 solid next to the cut: the -1 view's reference cell
        tree: [-7, -4], item: [-6, -3], unit: [-4, -2], // the depth suite's entity fixtures on the terrace
        unitA: [-3, -3]         // layers_flat's unit A on the terrace (it steps east)
    };
    const SCENE_DECK = [[-2, -2], [-1, -2], [0, -2]];
    function sceneCut(C) {
        const cells = [];
        for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) cells.push({ x: C.x + dx, y: C.y + dy });
        return { cells, floorM1: cells[0], openM1: cells.slice(1), center: { x: C.x, y: C.y }, ok: true };
    }
    /** The scene's centre: the first place, in a fixed order from (size/2 + 56, size/2 + 56), with no unit on any level in its zone. */
    function sceneCentre(W, area, size) {
        const all = W.units(), sx = Math.floor(size / 2) + 56, sy = Math.floor(size / 2) + 56;
        const lo = { x: -SCENE_ZONE.dx0 + 4, y: -SCENE_ZONE.dy0 + 4 }, hi = { x: size - 1 - SCENE_ZONE.dx1 - 4, y: size - 1 - SCENE_ZONE.dy1 - 4 };
        const free = (cx, cy) => {
            for (let i = 0; i < all.length; i++) {
                const u = all[i];
                if (!u || !u.area || u.area.x !== area.x || u.area.y !== area.y) continue;
                const dx = u.x - cx, dy = u.y - cy;
                if (dx >= SCENE_ZONE.dx0 && dx <= SCENE_ZONE.dx1 && dy >= SCENE_ZONE.dy0 && dy <= SCENE_ZONE.dy1) return false;
            }
            return true;
        };
        for (let r = 0; r <= size; r += 8) for (let oy = -r; oy <= r; oy += 8) for (let ox = -r; ox <= r; ox += 8) {
            if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
            const cx = sx + ox, cy = sy + oy;
            if (cx < lo.x || cy < lo.y || cx > hi.x || cy > hi.y) continue;
            if (free(cx, cy)) return { x: cx, y: cy };
        }
        return null;
    }
    /** Build the scene around C: objects cleared in the zone, every column's strata written (unless already exactly so), the
     *  ground floor cells given one painted tile; then every level of every column verified. */
    function buildScene(W, L, area, C) {
        const t0 = performance.now(), O = window.UF.Objects, Tl = window.UF.Tiles;
        const lv = z => ({ x: area.x, y: area.y, z });
        const kinds = Tl && Tl.kinds ? Tl.kinds() : [];
        const groundTile = kinds.length && Tl.groundBase ? Tl.groundBase(kinds[0].id) : null;
        const out = { C, area: { x: area.x, y: area.y }, columns: 0, written: 0, kept: 0, objectsCleared: 0, tilesSet: 0, refused: [], mismatches: [],
            groundKind: kinds.length ? kinds[0].id : null, groundTile, ok: false, ms: 0 };
        if (!O || !O.typeIdIn || !O.setIn || !L.setStrata || !L.strataAt || groundTile === null) {
            out.refused.push(`an API is missing (Objects ${!!O}, setStrata ${!!L.setStrata}, ground tile ${groundTile})`);
            return out;
        }
        for (let z = -2; z <= 2; z++) for (let y = C.y + SCENE_ZONE.dy0; y <= C.y + SCENE_ZONE.dy1; y++) for (let x = C.x + SCENE_ZONE.dx0; x <= C.x + SCENE_ZONE.dx1; x++) {
            if (O.typeIdIn(lv(z), x, y)) { O.setIn(lv(z), x, y, null); out.objectsCleared++; }
        }
        const eachColumn = fn => { for (let dy = SCENE_BOX.dy0; dy <= SCENE_BOX.dy1; dy++) for (let dx = SCENE_BOX.dx0; dx <= SCENE_BOX.dx1; dx++) fn(SCENE_COLUMNS[sceneKind(dx, dy)], C.x + dx, C.y + dy); };
        eachColumn((col, x, y) => {
            out.columns++;
            for (let k = 0; k < 5; k++) {
                const z = k - 2, ref = { area: { x: area.x, y: area.y }, x, y, z }, want = col.strata[k], built = col.constructedZ === z;
                const s = L.strataAt(ref);
                if (s && s.connector === null && want.every((m, j) => s.materials[j] === m) && s.constructed.every((c, j) => c === (built && want[j] !== "air"))) { out.kept++; continue; }
                if (L.setStrata(ref, { m: want, connector: "none" }, { constructed: built, cause: "test fixture" })) out.written++;
                else out.refused.push(`${z} (${x},${y}): ${L.lastRefusal && L.lastRefusal() ? L.lastRefusal().reason : "refused"}`);
            }
        });
        // After every strata write (a write repaints its neighbours' ground from the generator, except tiles with a saved diff).
        eachColumn((col, x, y) => {
            if (col.shapes[2] !== "floor") return;
            for (let layer = 0; layer <= 3; layer++) {
                const want = layer === 0 ? groundTile : 0;
                if ((W.getTile(area.x, area.y, x, y, layer, 0) | 0) !== want) { W.setTile(area.x, area.y, x, y, layer, want, 0); out.tilesSet++; }
            }
        });
        eachColumn((col, x, y) => {
            for (let k = 0; k < 5; k++) {
                const got = L.shapeAt({ area: { x: area.x, y: area.y }, x, y, z: k - 2 });
                if (got !== col.shapes[k]) out.mismatches.push(`${k - 2} (${x},${y}) is ${got}, want ${col.shapes[k]}`);
            }
            if (col.shapes[2] === "floor" && (W.getTile(area.x, area.y, x, y, 0, 0) | 0) !== groundTile) out.mismatches.push(`ground tile (${x},${y}) is ${W.getTile(area.x, area.y, x, y, 0, 0)}, want ${groundTile}`);
        });
        out.ok = out.refused.length === 0 && out.mismatches.length === 0;
        out.ms = performance.now() - t0;
        return out;
    }
    const sceneText = (sc, W) => `fixture scene centred at (${sc.C.x},${sc.C.y}) in area (${sc.area.x},${sc.area.y}), world seed ${W.state.seed}: ${sc.columns} columns x 5 levels (${sc.written} cell(s) written, ${sc.kept} already as specified), ${sc.tilesSet} ground tile(s) set (${sc.groundKind}, tile ${sc.groundTile}), ${sc.objectsCleared} object(s) cleared, ${sc.ms.toFixed(0)} ms; ${sc.refused.length} refused${sc.refused.length ? ` (${sc.refused.slice(0, 3).join("; ")})` : ""}, ${sc.mismatches.length} cell(s) not as specified${sc.mismatches.length ? ` (${sc.mismatches.slice(0, 3).join("; ")})` : ""}`;

    // A harness problem (a fixture that can't be built, a condition that never comes): named in results.txt as a HARNESS line,
    // then the suite stops (DEUS_Test records it as suite_completed FAIL; tools/test_layer_render_flat.js exits 2). Never a pass.
    function harnessStop(message) {
        UF.Test.write(`HARNESS ${message}`);
        throw new Error(`HARNESS ${message}`);
    }
    /** A condition wait (Fix 1, section 3.1): a timeout only catches a hang, and is a harness problem that names the condition. */
    async function need(t, cond, ms, what) {
        try { await t.waitUntil(cond, ms, what); } catch (e) { harnessStop(`timed out after ${ms} ms waiting for ${what}`); }
    }
    /** Load character sheets and wait until every one is ready (a harness condition: the checks judge the planes, not the disk). */
    async function sheetsReady(t, names, what) {
        const list = names.filter(Boolean), bmps = list.map(n => ImageManager.loadCharacter(n));
        await need(t, () => bmps.every(b => b.isReady() || b.isError()), 30000, `the sheets ${list.join(", ")} to load (${what})`);
        const bad = list.filter((n, i) => bmps[i].isError());
        if (bad.length) harnessStop(`sheet(s) failed to load: ${bad.join(", ")} (${what})`);
    }
    // Every descendant of a display object (the object itself first).
    function subtree(o, out = []) { out.push(o); for (const c of o.children || []) subtree(c, out); return out; }
    const filterNames = o => (o.filters || []).map(f => f.constructor.name);
    const worldSeed = W => (W && W.state ? W.state.seed : "-");

    function registerChecks() {
        UF.Test.suite("depth", async t => {
            const W = World(), L = Levels();
            const scene = () => SceneManager._scene;
            const ok0 = !!W && !!L && L.view() === 0 && !!L.surfaceGrid() && Graphics.width === 816;
            t.check("preconditions", ok0, `world ${!!W}, levels ${!!L}, view ${L && L.view()}, surface grid ${!!(L && L.surfaceGrid())}, screen ${Graphics.width}x${Graphics.height}, world seed ${worldSeed(W)}`);
            if (!ok0) return;
            const size = W.state.size;
            const area = W.viewLevel();
            const D = Depth;
            // A still world for the whole suite: the simulation is paused (UF.Time; the view, the planes and the level switches keep
            // running), so no unit walks into a probe and nothing changes between two renders a check compares.
            const TS = window.UF.Time, wasPaused = !!(TS && TS.paused);
            if (TS && TS.pause) TS.pause();
            // Pixel comparisons need a still scene: no rain (the test area's weather is seed-rolled), and the day tone (DEUS_DayNight
            // tones the screen by the hour; the harness clock is DEUS_Test's).
            if (window.UF.Environment && UF.Environment.setWeather) UF.Environment.setWeather({ x: area.x, y: area.y }, "clear");
            if (window.$gameScreen) $gameScreen.changeWeather("none", 0, 0);
            if (window.UF.Time && UF.Time.setForTest) UF.Time.setForTest(12, 0);

            // 1. The fixture scene: +2 summit, +1 terrace with a hole, a deck, low ground and the Z-2 cut, built on every level.
            const C = sceneCentre(W, area, size);
            if (!C) harnessStop(`the fixture scene: no place in the area without a unit on any level (${SCENE_ZONE.dx1 - SCENE_ZONE.dx0 + 1} x ${SCENE_ZONE.dy1 - SCENE_ZONE.dy0 + 1} cells)`);
            const sc = buildScene(W, L, area, C);
            const at = k => ({ x: C.x + SCENE_AT[k][0], y: C.y + SCENE_AT[k][1] });
            const center = C, hole = at("hole"), deck = SCENE_DECK.map(([dx, dy]) => ({ x: C.x + dx, y: C.y + dy }));
            t.check("proof_scene", sc.ok, `${sceneText(sc, W)}; hole (${hole.x},${hole.y}), deck 3 cells from (${deck[0].x},${deck[0].y})`);
            if (!sc.ok) harnessStop(`the fixture scene was not built as specified: ${[...sc.refused, ...sc.mismatches].slice(0, 4).join("; ")}`);

            const fs = require("fs"), pathMod = require("path");
            const outDir = pathMod.join((nw.__dirname) || process.cwd(), "test_output");
            const savePng = (name, bmp) => { const f = pathMod.join(outDir, `depth.${name}.png`); fs.writeFileSync(f, bmp.canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, ""), "base64"); UF.Test.write(`SHOT ${f}`); return f; };
            let switches = 0;
            const goTo = async (z, c = center) => {
                const okSwitch = L.setView(z, { center: c });
                await need(t, () => !L.switching() && L.view() === z && scene() instanceof Scene_Map && scene().isStarted(), 30000, `the ${L.label(z)} view`);
                switches++;
                await t.waitFrames(8);
                return okSwitch;
            };
            const settle = async () => { D.touch(); await t.waitFrames(3); };

            // 3. On +2 with both depths (the addendum's chain): +1 through the summit's open air, the ground through +1's.
            config.maxDepth = 2;
            await goTo(2);
            await settle();
            await need(t, () => !window.$gameScreen || $gameScreen.weatherPower() === 0, 30000, "the weather to clear");
            const st = D.stats();
            const p1 = D.planes().find(p => p.depth === 1) || null, p2 = D.planes().find(p => p.depth === 2) || null;
            const imageData = bmp => bmp.context.getImageData(0, 0, bmp.width, bmp.height).data;
            const opaqueCount = bmp => { const d = imageData(bmp); let n = 0; for (let i = 3; i < d.length; i += 4 * 7) if (d[i] === 255) n++; return n; };
            const opq1 = p1 ? opaqueCount(p1._tilemap._lowerLayer.bitmap) : 0, opq2 = p2 ? opaqueCount(p2._tilemap._lowerLayer.bitmap) : 0;
            t.check("planes_present", st.view === 2 && !!p1 && p1.level.z === 1 && p1._tilemap.paints > 0 && opq1 > 0 && !!p2 && p2.level.z === 0 && p2._tilemap.paints > 0 && opq2 > 0,
                `view ${st.view}; depth 1 -> ${p1 ? `level ${p1.level.z}, ${p1._tilemap.paints} paint(s), ${opq1} opaque samples` : "none"}; depth 2 -> ${p2 ? `level ${p2.level.z}, ${p2._tilemap.paints} paint(s), ${opq2} opaque samples` : "none"}; last paint ${st.lastPaintMs.toFixed(1)} ms, last peek ${st.lastPeekMs.toFixed(1)} ms`);
            if (!p1 || !p2) return;
            // A repaint (every 48 px of scroll, every shape change, every 30 frames only while water is in the window) happens on the
            // plane's next frame. Its time is reported, not gated (Fix 1, P1: wall-clock time depends on the machine's load).
            const paintMs = [st.lastPaintMs], repainted = [];
            for (let i = 0; i < 4; i++) { const before = p1._tilemap.paints; p1.refresh(); await t.waitFrames(1); repainted.push(p1._tilemap.paints > before); paintMs.push(stats.lastPaintMs); }
            const cw = p1._tilemap._lowerLayer.bitmap.width, ch = p1._tilemap._lowerLayer.bitmap.height;
            t.check("repaint_cost", repainted.every(Boolean), `${repainted.filter(Boolean).length} of 4 refreshes of one ${cw}x${ch} plane repainted it by the next frame; repaint times ${paintMs.map(v => v.toFixed(1)).join(" / ")} ms (reported, not gated: wall-clock time, this machine, nw.exe harness)`);

            // 3b. Entities of the level below (user direction 2026-09-24): an oak, an item stack and a unit on the +1 terrace, in
            //     view. Their sheets are loaded first (a harness condition: the check judges the planes, not the file cache).
            const lv1 = { x: area.x, y: area.y, z: 1 };
            const O = window.UF.Objects, I = window.UF.Items;
            const treeType = O && O.types ? (O.types().find(tt => tt.image && Array.isArray(tt.tags) && tt.tags.includes("tree")) || O.types().find(tt => tt.image)) : null;
            const itemTypeId = ["stone", "oak_log", "log", "wood", "berries", "rations", "stone_axe", "gold_coin", "common_clothes", "pouch", "shovel", "waterskin"].find(id => I && I.type && I.type(id) && I.type(id).image) || null;
            const itemSheet = itemTypeId ? I.type(itemTypeId).image : null;
            await sheetsReady(t, [treeType && treeType.image, itemSheet, "People1"], "the entity fixtures");
            const fx = [at("tree"), at("item"), at("unit")];
            const treeOk = treeType ? !!O.setIn(lv1, fx[0].x, fx[0].y, treeType.id) : false;
            const itemMade = itemTypeId ? I.create(itemTypeId, 3, { area: lv1, x: fx[1].x, y: fx[1].y }) : null;
            const unitMade = W.addUnit({ name: "TEST_depth_unit", image: { characterName: "People1", characterIndex: 0 }, area: { x: area.x, y: area.y }, x: fx[2].x, y: fx[2].y, z: 1, dir: 2, exact: true, data: { kind: "test" } });
            await t.waitFrames(3); // the planes read a new object (objects:levelChanged), item (items:changed) and unit (every frame) on their next frame

            // 4. The projection is the identity (DEC-011): the viewport centre stays at the centre, the left edge at x 0.
            const viewO = () => ({ x: $gameMap.displayX() * TW, y: $gameMap.displayY() * TH });
            const cx = Graphics.width / 2, cy = Graphics.height / 2;
            const observed = (p, ux, uy) => { // where the plane draws the screen point (ux, uy) of its level
                const u = p.unprojected(viewO().x, viewO().y);
                return p.toGlobal(new PIXI.Point(ux - u.x, uy - u.y));
            };
            const oc = observed(p1, cx, cy), oe = observed(p1, 0, cy);
            const originOk = oc.x === cx && oc.y === cy && oe.x === 0 && oe.y === cy;
            t.check("projection_origin", originOk, `centre -> (${oc.x},${oc.y}) want (${cx},${cy}); left edge -> (${oe.x},${oe.y}) want (0,${cy}) (identity, DEC-011); plane scale ${p1.scale.x}`);

            // 5. The exposure mask is the viewed level's own geometry: a floor cell of +2 is untouched, an open cell shows a lower level.
            const cellScreen = (x, y) => ({ x: ($gameMap.adjustX(x) + 0.5) * TW, y: ($gameMap.adjustY(y) + 0.5) * TH });
            const floorCell = at("summitFloor"), airOverTerrace = at("terraceAir");
            const snapScreen = () => Bitmap.snap(scene());
            const pix = (bmp, x, y) => bmp.getPixel(Math.round(x), Math.round(y));
            const shotOn = snapScreen();
            D.setEnabled(false);
            await t.waitFrames(3);
            const shotOff = snapScreen();
            D.setEnabled(true);
            await settle();
            const around = (bmp, p) => { const out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push(pix(bmp, p.x + dx * 4, p.y + dy * 4)); return out; };
            const a5 = around(shotOn, cellScreen(floorCell.x, floorCell.y)), b5 = around(shotOff, cellScreen(floorCell.x, floorCell.y));
            const floorSame = a5.every((c, i) => c === b5[i]);
            const pa = cellScreen(airOverTerrace.x, airOverTerrace.y), a6 = around(shotOn, pa), b6 = around(shotOff, pa);
            const airDiffers = a6.some((c, i) => c !== b6[i]);
            t.check("exposure_by_upper_geometry", floorSame && airDiffers,
                `floor cell (${floorCell.x},${floorCell.y}) ${floorSame ? "unchanged" : "CHANGED"} by the planes; open cell (${airOverTerrace.x},${airOverTerrace.y}) ${airDiffers ? "shows the level below" : "UNCHANGED (still sky)"}`);

            // 6. Mask order and the two-depth chain, from a render of the planes alone (no tint, no fog): through +2's open air
            //    a +1 floor shows depth 1's own texel; a low-ground cell shows the ground (depth 2) through depth 1.
            const root = D.root();
            const planesOnly = () => Bitmap.snap(root);
            const texelOf = (p, gx, gy) => { // the plane's canvas colour under screen pixel (gx, gy)
                const s = p.scale.x, lx = Math.floor((gx + 0.5 - p.x) / s), ly = Math.floor((gy + 0.5 - p.y) / s);
                const lower = p._tilemap._lowerLayer.bitmap, upper = p._tilemap._upperLayer.bitmap;
                const up = upper.getAlphaPixel(lx, ly) > 0 ? upper.getPixel(lx, ly) : null;
                return { color: up || lower.getPixel(lx, ly), alpha: up ? 255 : lower.getAlphaPixel(lx, ly), lx, ly };
            };
            const neighbours = (p, gx, gy) => { const set = new Set(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const tx = texelOf(p, gx + dx, gy + dy); if (tx.alpha === 255) set.add(tx.color); } return set; };
            // The tile checks compare against tile texels, so the entities are switched off for their render (they are checked on
            // their own in 6b); the render with entities is dumped too.
            const ENTITIES_OFF = { objects: false, items: false, units: false, walls: false };
            const entitiesOn = Object.assign({}, config.entities);
            const setEntities = async on => { Object.assign(config.entities, on ? entitiesOn : ENTITIES_OFF); D.refresh(); await t.waitFrames(3); };
            savePng("planes_only_plus2", planesOnly());
            await setEntities(false);
            const render = planesOnly();
            savePng("planes_only_plus2_tiles", render);
            savePng("canvas_depth1", p1._tilemap._lowerLayer.bitmap);
            savePng("canvas_depth2", p2._tilemap._lowerLayer.bitmap);
            // The two-depth chain: the fixture's low-ground cell (open on +2 and on +1, over the painted ground) shows the ground's
            // texel, with depth 1 transparent there.
            const chainCell = at("chain");
            const cc = cellScreen(chainCell.x, chainCell.y), cgx = Math.round(cc.x), cgy = Math.round(cc.y);
            const seen7 = render.getPixel(cgx, cgy), seen7A = render.getAlphaPixel(cgx, cgy), want7 = neighbours(p2, cgx, cgy), tx71 = texelOf(p1, cgx, cgy), tx72 = texelOf(p2, cgx, cgy);
            const chainOk = seen7A === 255 && tx72.alpha === 255 && want7.has(seen7) && tx71.alpha === 0;
            let detail7 = `low ground (${chainCell.x},${chainCell.y}) at screen (${cgx},${cgy}): drawn ${seen7}/${seen7A}, ground texel ${tx72.color}/${tx72.alpha}, ground texels {${[...want7].slice(0, 4).join(" ")}}, depth 1 alpha there ${tx71.alpha}`;
            // Mask order: a +1 floor seen from +2 shows depth 1's texel, never the painted ground under it (the fixture deck).
            const maskCell = at("deckMid");
            const pm = cellScreen(maskCell.x, maskCell.y), mgx = Math.round(pm.x), mgy = Math.round(pm.y);
            const seen6 = render.getPixel(mgx, mgy), want6 = neighbours(p1, mgx, mgy), tx62 = texelOf(p2, mgx, mgy);
            const maskOk = tx62.alpha === 255 && want6.has(seen6);
            t.check("mask_order", maskOk, `deck cell (${maskCell.x},${maskCell.y}) at screen (${mgx},${mgy}): drawn ${seen6}, depth 1 texels {${[...want6].slice(0, 4).join(" ")}}, ground texel under it ${tx62.color}/${tx62.alpha}`);
            // The hole in the terrace is a visual fixture (in the screenshots); what the ground draws under it is reported.
            {
                const c = cellScreen(hole.x, hole.y);
                const tx2 = texelOf(p2, Math.round(c.x), Math.round(c.y));
                const groundTiles = [0, 1, 2].map(l => W.getTile(area.x, area.y, hole.x, hole.y, l, 0));
                detail7 += `; under the hole (${hole.x},${hole.y}) the ground draws ${tx2.color}/${tx2.alpha} (tiles ${groundTiles.join("/")})`;
            }
            t.check("depth2_through_depth1", chainOk, detail7);
            await setEntities(true);

            // 6b. The level below shows its entities: counts on the +1 plane, and the unit's body pixels change when units are
            //     switched off. The detail names the facts behind a missing item (B1): its sheet, whether the plane tracks it.
            const ec = p1.entityCounts();
            const itemSprite = itemMade ? p1._items.get(itemMade.id) : null;
            const itemFacts = itemMade ? `item sheet ${itemSheet} ready ${ImageManager.loadCharacter(itemSheet).isReady()}, tracked by the plane ${!!itemSprite}, visible ${itemSprite ? itemSprite.visible : "-"}` : "no item";
            let unitDrawn = false, detailE = "";
            if (unitMade) {
                const c = cellScreen(fx[2].x, fx[2].y); // the body, above the foot at the cell's bottom
                const gx = Math.round(c.x), gy = Math.round(c.y + 4);
                const probe = bmp => { const out = []; for (let dy = -2; dy <= 2; dy += 2) for (let dx = -2; dx <= 2; dx += 2) out.push(bmp.getPixel(gx + dx, gy + dy)); return out; };
                const onPx = probe(planesOnly());
                config.entities.units = false; D.refresh(); await t.waitFrames(3);
                const offPx = probe(planesOnly());
                config.entities.units = true; D.refresh(); await t.waitFrames(3);
                unitDrawn = onPx.some((v, i) => v !== offPx[i]);
                detailE = `unit at (${fx[2].x},${fx[2].y}) probed at screen (${gx},${gy}): ${unitDrawn ? "drawn" : "NOT drawn"} (${onPx[4]} vs ${offPx[4]} without units)`;
            }
            t.check("entities_drawn", treeOk && !!itemMade && !!unitMade && ec.objects >= 1 && ec.units >= 1 && ec.items >= 1 && ec.walls >= 1 && unitDrawn,
                `fixtures: oak ${treeOk ? "placed" : "NOT placed"} at (${fx[0].x},${fx[0].y}), item ${itemMade ? `${itemTypeId} x3` : "NOT made"} at (${fx[1].x},${fx[1].y}), unit ${unitMade ? "added" : "NOT added"}; +1 plane draws ${ec.objects} object(s), ${ec.units} unit(s), ${ec.items} item stack(s), ${ec.walls} wall/ramp frame(s); ${itemFacts}; ${detailE}`);

            // 7. Crisp: every opaque pixel of the planes' render (tiles only: the entity sheets have their own palettes) is a
            //    colour of the source canvases (nearest sampling, whole-pixel positions, no new colours).
            const colorsOf = bmp => { const d = imageData(bmp), set = new Set(); for (let i = 0; i < d.length; i += 4) if (d[i + 3] === 255) set.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); return set; };
            const paletteOf = planes => { const set = new Set([config.voidColor]); for (const p of planes) for (const b of [p._tilemap._lowerLayer.bitmap, p._tilemap._upperLayer.bitmap]) for (const c of colorsOf(b)) set.add(c); return set; };
            const foreignIn = (bmp, palette) => {
                const d = imageData(bmp);
                let sampled = 0, foreign = 0, first = "";
                for (let y = 1; y < bmp.height; y += 3) for (let x = 1; x < bmp.width; x += 3) {
                    const i = (y * bmp.width + x) * 4;
                    if (d[i + 3] !== 255) continue;
                    sampled++;
                    const c = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
                    if (!palette.has(c)) { foreign++; if (!first) first = `#${c.toString(16).padStart(6, "0")} at (${x},${y})`; }
                }
                return { sampled, foreign, first };
            };
            const palette = paletteOf([p1, p2]); // the void shows where both planes are transparent; it is flat, not a blend
            await setEntities(false);
            const crisp = foreignIn(planesOnly(), palette);
            await setEntities(true);
            const bt = p1._lower.bitmap.baseTexture, st1 = p1._lower.texture && p1._lower.texture.baseTexture;
            t.check("crisp_nearest", crisp.sampled >= 1000 && crisp.foreign === 0, `${crisp.sampled} opaque samples, ${crisp.foreign} colour(s) not in the ${palette.size}-colour source set${crisp.first ? `, first ${crisp.first}` : ""}; smooth ${p1._lower.bitmap.smooth}, baseTexture scaleMode ${bt && bt.scaleMode} (0 nearest, 1 linear), sprite texture ${st1 === bt ? "is the bitmap's" : `scaleMode ${st1 && st1.scaleMode}`}, plane at (${p1.x},${p1.y})`);

            // 8. No parallax (DEC-011): no edge shift at either depth, and a fixed world point moves exactly with the camera (48 px a tile).
            const edge1 = observed(p1, 0, cy).x, edge2 = observed(p2, 0, cy).x;
            const worldPt = { x: (chainCell.x + 0.5) * TW, y: (chainCell.y + 0.5) * TH }; // the low-ground cell's centre, in world px
            const drawnAt = p => { const o = viewO(); return observed(p, worldPt.x - Math.ceil(o.x), worldPt.y - Math.ceil(o.y)); };
            const dx0 = $gameMap.displayX();
            const before1 = drawnAt(p1);
            $gameMap.scrollRight(2); // two tiles: the overseer's free camera keeps the display where the map puts it
            await t.waitFrames(3);
            const panned = ($gameMap.displayX() - dx0 + $gameMap.width()) % $gameMap.width();
            const after1 = drawnAt(p1);
            const moved = after1.x - before1.x, wantMove = -panned * TW;
            const centreAfter = observed(p1, cx, cy);
            $gameMap.scrollLeft(2);
            await t.waitFrames(3);
            t.check("parallax_bounded", edge1 === 0 && edge2 === 0 && D.edgeShift(1) === 0 && panned === 2 && moved === wantMove && centreAfter.x === cx,
                `edge shift measured depth 1 ${edge1} px, depth 2 ${edge2} px (want 0); a pan of ${panned} tiles moved a low-ground point on depth 1 from x ${before1.x} to ${after1.x} (${moved} px, want ${wantMove}); the point under the centre stays at x ${centreAfter.x}; display back at ${$gameMap.displayX()} (was ${dx0})`);

            // 9. Tunables take effect on the next frame: maxDepth (2 -> 1 -> 2) and enabled (off -> on), set on config directly.
            const planeState = () => D.stats().planes.map(p => `${p.depth}:${p.visible ? p.z : "-"}`).join(" ");
            config.maxDepth = 1; await t.waitFrames(2);
            const sMax1 = D.stats(), tMax1 = planeState();
            config.maxDepth = 2; await t.waitFrames(2);
            const sMax2 = D.stats(), tMax2 = planeState();
            config.enabled = false; await t.waitFrames(2);
            const sOff = D.stats(), tOff = planeState();
            config.enabled = true; await t.waitFrames(2);
            const sOn = D.stats(), tOn = planeState();
            t.check("tunables_take_effect", sMax1.planes[0].visible && !sMax1.planes[1].visible && sMax1.voidVisible && sMax2.planes.every(p => p.visible)
                && sOff.planes.every(p => !p.visible) && !sOff.voidVisible && sOn.planes.every(p => p.visible) && sOn.voidVisible,
                `maxDepth 1 [${tMax1}] void ${sMax1.voidVisible}; maxDepth 2 [${tMax2}]; enabled false [${tOff}] void ${sOff.voidVisible}; enabled true [${tOn}] void ${sOn.voidVisible}`);

            // 10. No filter in any state (DEC-011): maxDepth 1 and 2, planes off and on, entities off and on; the root, both planes,
            //     their entity containers and every sprite under them.
            const filtered = () => { const out = []; for (const o of subtree(root)) if (o.filters && o.filters.length) out.push(`${o.constructor.name}[${filterNames(o)}]`); return out; };
            const states = [];
            const record = async (label, fn) => { await fn(); await t.waitFrames(2); states.push({ label, filters: filtered() }); };
            await record("maxDepth 1", async () => { config.maxDepth = 1; });
            await record("maxDepth 2", async () => { config.maxDepth = 2; });
            await record("off", async () => { D.setEnabled(false); });
            await record("on", async () => { D.setEnabled(true); });
            await record("entities off", async () => setEntities(false));
            await record("entities on", async () => setEntities(true));
            t.check("no_filters_any_state", states.every(s => s.filters.length === 0), states.map(s => `${s.label}: ${s.filters.length ? s.filters.join(", ") : "none"}`).join("; "));

            // 11. One level below: depth 1 only, the void beyond it, never the sky; the render has no blends.
            config.maxDepth = 1;
            await settle();
            const stD = D.stats();
            t.check("one_level_below", stD.maxDepth === 1 && stD.planes[0].visible && stD.planes[0].z === 1 && !stD.planes[1].visible && stD.voidVisible,
                `maxDepth ${stD.maxDepth}: depth 1 ${stD.planes[0].visible ? `level ${stD.planes[0].z}` : "hidden"}, depth 2 ${stD.planes[1].visible ? "VISIBLE" : "hidden"}, void ${stD.voidVisible ? "shown" : "HIDDEN"}`);
            await setEntities(false); // the void is judged on the tiles; an entity could stand on the probed cell
            const renderD = planesOnly();
            const voidHex = `#${config.voidColor.toString(16).padStart(6, "0")}`;
            const screenPx = Bitmap.snap(scene()).getPixel(cgx, cgy);
            const seenV = renderD.getPixel(cgx, cgy), seenVA = renderD.getAlphaPixel(cgx, cgy);
            const voidOk = seenV === voidHex && seenVA === 255 && screenPx === voidHex;
            t.check("void_beyond", voidOk, `low ground (${chainCell.x},${chainCell.y}) at screen (${cgx},${cgy}): planes render ${seenV}/${seenVA}, screen ${screenPx}, void ${voidHex}`);
            // No blends (the inverse of the old blur check): with one level below the render holds only source colours and the void.
            const blends = foreignIn(renderD, paletteOf([p1]));
            t.check("no_blends", blends.sampled >= 1000 && blends.foreign === 0, `${blends.foreign} of ${blends.sampled} sampled pixels are blends (want 0)${blends.first ? `, first ${blends.first}` : ""}`);
            await setEntities(true);

            // 11b. Flat transform (DEC-011; folds the old blur_off_no_blur and color_off_baseline): both planes and their entity
            //      containers at scale 1, whole-pixel positions equal to the tilemap's own, no filter, alpha 1, a terrace pixel equal
            //      to its source texel; the active tilemap untouched; no physical effect.
            config.maxDepth = 2;
            await settle();
            const mainTm = scene()._spriteset._tilemap;
            const flatOf = p => { const u = p.unprojected(viewO().x, viewO().y); return p.scale.x === 1 && p.scale.y === 1 && p.x === u.x && p.y === u.y && !p.filters && p.alpha === 1 && p._entities.scale.x === 1 && !p._entities.filters; };
            const noBlurAnywhere = subtree(root).every(o => !filterNames(o).some(n => n === "BlurFilter" || n === "ColorMatrixFilter"));
            const activeUntouched = mainTm.scale.x === 1 && mainTm.scale.y === 1 && !mainTm.filters && mainTm.alpha === 1;
            await setEntities(false);
            const cB = cellScreen(airOverTerrace.x, airOverTerrace.y), bgx = Math.round(cB.x), bgy = Math.round(cB.y);
            const seenB = planesOnly().getPixel(bgx, bgy), wantB = texelOf(p1, bgx, bgy);
            const baselineOk = wantB.alpha === 255 && seenB === wantB.color;
            await setEntities(true);
            t.check("flat_transform", flatOf(p1) && flatOf(p2) && noBlurAnywhere && activeUntouched && baselineOk,
                `depth 1 scale ${p1.scale.x} at (${p1.x},${p1.y}) filters [${filterNames(p1)}] entities [${filterNames(p1._entities)}] alpha ${p1.alpha}; depth 2 scale ${p2.scale.x} at (${p2.x},${p2.y}) filters [${filterNames(p2)}] entities [${filterNames(p2._entities)}] alpha ${p2.alpha}; blur/colour filters in the subtree: ${noBlurAnywhere ? "none" : "PRESENT"}; active tilemap scale ${mainTm.scale.x}, filters ${mainTm.filters ? "SET" : "none"}, alpha ${mainTm.alpha}; terrace pixel ${seenB}, its source texel ${wantB.color}/${wantB.alpha}`);
            // Entities are children of the plane: world scale 1, no filter on the sprite or any container above it.
            const us = unitMade ? p1._units.get(unitMade.id) : null;
            let inheritOk = false, detailI = "no unit sprite";
            if (us) {
                const chain = [];
                for (let o = us; o && o !== mainTm; o = o.parent) chain.push(o);
                const chained = us.parent === p1._entities && us.parent.parent === p1;
                const unfiltered = chain.every(o => !o.filters || !o.filters.length);
                inheritOk = chained && us.visible && us.worldTransform.a === 1 && us.worldTransform.d === 1 && unfiltered;
                detailI = `unit sprite in the +1 plane: ${chained ? "child of the plane" : "NOT a child of the plane"}, world scale ${us.worldTransform.a} x ${us.worldTransform.d}, filters on it and its ${chain.length - 1} container(s): ${unfiltered ? "none" : chain.filter(o => o.filters && o.filters.length).map(o => `${o.constructor.name}[${filterNames(o)}]`).join(", ")}; tint #${us.tint.toString(16).padStart(6, "0")} (the unit's own)`;
            }
            t.check("entities_inherit_treatment", inheritOk, detailI);
            // Visual settings never touch the physical world.
            const physics = () => JSON.stringify({
                unit: unitMade ? { x: unitMade.x, y: unitMade.y, z: unitMade.z } : null,
                shapeUnit: L.shapeAt({ area, x: fx[2].x, y: fx[2].y, z: 1 }),
                shapeChain: L.shapeAt({ area, x: chainCell.x, y: chainCell.y, z: 2 }),
                walkChain: W.walkable(area.x, area.y, chainCell.x, chainCell.y, { z: 2 }),
                walkUnit: W.walkable(area.x, area.y, fx[2].x, fx[2].y, { z: 1 }),
                objects: O.typeIdIn(lv1, fx[0].x, fx[0].y)
            });
            const phys0 = physics();
            const cycle = async () => { for (const m of [1, 0, 2]) { config.maxDepth = m; await t.waitFrames(2); } D.setEnabled(false); await t.waitFrames(2); D.setEnabled(true); await settle(); };
            await cycle();
            const phys1 = physics();
            t.check("visual_settings_no_physics", phys0 === phys1 && phys0.length > 20, phys0 === phys1 ? `unchanged: ${phys0}` : `CHANGED: ${phys0} -> ${phys1}`);
            // The same settings give the same planes whatever came before.
            const snapCfg = () => JSON.stringify({ describe: D.describe(), planes: D.stats().planes.map(p => ({ z: p.z, visible: p.visible, x: p.x, y: p.y, scale: p.scale, alpha: p.alpha, filters: p.filters })) });
            const cfgA = snapCfg();
            await cycle();
            const cfgB = snapCfg();
            t.check("config_deterministic", cfgA === cfgB, cfgA === cfgB ? `the same after maxDepth 1 / 0 / 2 and off / on: ${cfgA}` : `DIFFERS: ${cfgA} vs ${cfgB}`);

            // 12. The cost of the planes: the engine's own tick duration (update + render submission, Graphics.FPSCounter) and the
            //     wall interval per frame, planes off and on, medians of two interleaved rounds of 60 frames, the simulation paused.
            //     Reported, not gated (Fix 1, P1): the gate is that each condition was sampled as set (planes off: none shown; on:
            //     both bound); the milliseconds are judged separately with the machine's load (DEC-017).
            const sampleFrames = async n => {
                const ticks = [], gaps = [], shown = []; let last = performance.now();
                for (let i = 0; i < n; i++) { await t.waitFrames(1); const now = performance.now(); gaps.push(now - last); last = now; ticks.push(Graphics._fpsCounter ? Graphics._fpsCounter.duration : NaN); shown.push(D.planes().length); }
                const med = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
                return { tick: med(ticks), gap: med(gaps), worstTick: Math.max(...ticks.filter(Number.isFinite)), shown };
            };
            const conditions = { off: async () => { D.setEnabled(false); }, on: async () => { D.setEnabled(true); } };
            const cost = {};
            for (let round = 0; round < 2; round++) for (const name of Object.keys(conditions)) { await conditions[name](); await t.waitFrames(10); (cost[name] = cost[name] || []).push(await sampleFrames(60)); }
            D.setEnabled(true); await settle();
            const bestOf = name => cost[name].reduce((a, b) => (b.tick < a.tick ? b : a));
            const cOff = bestOf("off"), cOn = bestOf("on"), dPlanes = cOn.tick - cOff.tick;
            const offAsSet = cost.off.every(r => r.shown.length === 60 && r.shown.every(n => n === 0)), onAsSet = cost.on.every(r => r.shown.length === 60 && r.shown.every(n => n === 2));
            let glName = "unknown";
            try { const gl = Graphics.app.renderer.gl, dbg = gl.getExtension("WEBGL_debug_renderer_info"); glName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER)); } catch (e) { glName = `unreadable (${e.message})`; }
            t.check("planes_cost", offAsSet && onAsSet,
                `sampled 2 x 60 frames per condition: planes off ${offAsSet ? "none shown in every frame" : "PLANES SHOWN"}, on ${onAsSet ? "both bound in every frame" : "NOT BOTH BOUND"}; reported, not gated: GL renderer "${glName}"; median engine tick (update + render submit): planes off ${cOff.tick.toFixed(1)} ms, on ${cOn.tick.toFixed(1)} ms (the planes +${dPlanes.toFixed(1)} ms); median frame intervals off ${cOff.gap.toFixed(0)}, on ${cOn.gap.toFixed(0)} ms; worst tick off ${cOff.worstTick.toFixed(1)}, on ${cOn.worstTick.toFixed(1)} ms; this machine, nw.exe harness, simulation paused`);

            // 13. The screenshots at locked 1.00x: +2 and +1, planes off and flat (the fixture cut down to -2 is in view).
            const shots = [];
            D.setEnabled(false); await t.waitFrames(3); shots.push(t.screenshot("plus2_off"));
            D.setEnabled(true); await settle(); shots.push(t.screenshot("plus2_flat"));
            await goTo(1);
            D.setEnabled(false); await t.waitFrames(3); shots.push(t.screenshot("plus1_off"));
            D.setEnabled(true); await settle(); shots.push(t.screenshot("plus1_flat"));
            const sizes = shots.map(f => (fs.existsSync(f) ? fs.statSync(f).size : 0));
            t.check("screenshots_written", shots.length === 4 && sizes.every(n => n > 10000), shots.map((f, i) => `${pathMod.basename(f)} ${sizes[i]} B`).join(", "));

            // 14. The ground view sees through its openings (Owner 2026-09-25 23:52 CT): a solid ground cell draws nothing below; an
            //     open cell over the Z-2 cut shows -2 (with -1 open), an open cell over a -1 floor shows -1.
            const cut = sceneCut(C);
            await goTo(0);
            await setEntities(false);
            const main0 = scene()._spriteset._tilemap, root0 = D.root();
            // The tile layers and the planes only (characters, fog and the rest of the tilemap's children hidden for the render).
            const tileRender = () => {
                const hidden = [];
                for (const c of main0.children) if (c !== main0._lowerLayer && c !== main0._upperLayer && c !== root0 && c.visible) { c.visible = false; hidden.push(c); }
                const b = Bitmap.snap(main0);
                for (const c of hidden) c.visible = true;
                return b;
            };
            const st0 = D.stats();
            const q1 = D.planes().find(p => p.depth === 1) || null, q2 = D.planes().find(p => p.depth === 2) || null;
            let groundOk = false, detailG = `view ${st0.view}: depth 1 ${q1 ? q1.level.z : "none"}, depth 2 ${q2 ? q2.level.z : "none"}`;
            if (q1 && q2) {
                const g = cut.openM1[1], f1 = cut.floorM1, solidCell = at("groundRef");
                const on = tileRender(), planes0 = Bitmap.snap(root0);
                D.setEnabled(false); await t.waitFrames(3);
                const off = tileRender();
                D.setEnabled(true); await settle();
                const atPx = (bmp, c) => { const p = cellScreen(c.x, c.y); return bmp.getPixel(Math.round(p.x), Math.round(p.y)); };
                const pg = cellScreen(g.x, g.y), pf = cellScreen(f1.x, f1.y);
                const want2 = neighbours(q2, Math.round(pg.x), Math.round(pg.y)), a1 = texelOf(q1, Math.round(pg.x), Math.round(pg.y)).alpha;
                const want1 = neighbours(q1, Math.round(pf.x), Math.round(pf.y));
                const solidShape = L.shapeAt({ area, x: solidCell.x, y: solidCell.y, z: 0 });
                const sp = cellScreen(solidCell.x, solidCell.y);
                const solidSame = solidShape !== "open" && around(on, sp).every((c, i) => c === around(off, sp)[i]);
                // How much of the solid cell the ground's own art covers (255: opaque; less: transparent art, AUDIT_LOG A9).
                const solidAlpha = Math.min(...[-4, 0, 4].flatMap(dy => [-4, 0, 4].map(dx => off.getAlphaPixel(Math.round(sp.x + dx), Math.round(sp.y + dy)))));
                const cutShows2 = atPx(on, g) === atPx(planes0, g) && want2.has(atPx(on, g)) && a1 === 0;
                const cutShows1 = atPx(on, f1) === atPx(planes0, f1) && want1.has(atPx(on, f1));
                groundOk = st0.view === 0 && st0.seeThrough && q1.level.z === -1 && q2.level.z === -2 && solidSame && cutShows2 && cutShows1;
                detailG = `view ${st0.view}, depth 1 -> ${q1.level.z}, depth 2 -> ${q2.level.z}, void ${st0.voidVisible ? "shown" : "hidden"}; ${solidShape} ground cell (${solidCell.x},${solidCell.y}) ${solidSame ? "unchanged" : "CHANGED"} by the planes (its own art's lowest alpha ${solidAlpha}); open cell (${g.x},${g.y}) over the -2 floor draws ${atPx(on, g)} (planes ${atPx(planes0, g)}, -2 texels {${[...want2].slice(0, 3).join(" ")}}, -1 alpha ${a1}; planes off ${atPx(off, g)}); open cell (${f1.x},${f1.y}) over the -1 floor draws ${atPx(on, f1)} (-1 texels {${[...want1].slice(0, 3).join(" ")}}; planes off ${atPx(off, f1)})`;
            }
            t.check("ground_draws_through_openings", groundOk, detailG);
            await setEntities(true);

            // 15. Entities at the loop seam (B1, Fix 1). The areas loop: a view near the area's edge has its display origin wrapped (a
            //     view centred on (2,2) starts at (249.5,251.5)), and its window runs past the seam. Item stacks on both sides of both
            //     seams, a unit past them and natural wall faces past each seam, all on +1 and seen from +2: each is drawn, at the foot
            //     of its own cell on screen (Game_Map.adjustX/adjustY).
            const seamC = { x: 2, y: 2 }, hi = size - 3;
            const seamItems = [[1, 1], [hi, 1], [1, hi], [hi, hi]].map(([x, y]) => ({ x, y }));
            const seamWalls = [{ x: size - 2, y: 4 }, { x: 4, y: size - 2 }], seamUnitAt = { x: 3, y: 3 };
            const floorAt = (x, y, z) => L.setStrata({ area: { x: area.x, y: area.y }, x, y, z }, { m: z === 1 ? F5("stone") : A5, connector: "none" }, { cause: "test fixture" });
            const seamRefused = [];
            for (const c of [...seamItems, seamUnitAt]) { if (!floorAt(c.x, c.y, 1) || !floorAt(c.x, c.y, 2)) seamRefused.push(`(${c.x},${c.y})`); if (O.typeIdIn(lv1, c.x, c.y)) O.setIn(lv1, c.x, c.y, null); }
            for (const w of seamWalls) {
                // A natural stone wall cell on +1 with a floor on each side (a wall face is drawn where a wall cell has a neighbour that is not a wall).
                if (!L.setStrata({ area: { x: area.x, y: area.y }, x: w.x, y: w.y, z: 1 }, { m: S5("stone"), connector: "none" }, { cause: "test fixture" })) seamRefused.push(`wall (${w.x},${w.y})`);
                for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = wrapCell(w.x + ox, size), ny = wrapCell(w.y + oy, size); if (!floorAt(nx, ny, 1)) seamRefused.push(`(${nx},${ny})`); if (O.typeIdIn(lv1, nx, ny)) O.setIn(lv1, nx, ny, null); }
            }
            const seamStacks = seamItems.map(c => I.create(itemTypeId, 2, { area: lv1, x: c.x, y: c.y }));
            const seamUnit = W.addUnit({ name: "TEST_depth_seam_unit", image: { characterName: "People1", characterIndex: 0 }, area: { x: area.x, y: area.y }, x: seamUnitAt.x, y: seamUnitAt.y, z: 1, dir: 2, exact: true, data: { kind: "test" } });
            await goTo(2, seamC);
            const sp1 = D.planes().find(p => p.depth === 1) || null;
            const footOf = c => ({ x: Math.round(($gameMap.adjustX(c.x) + 0.5) * TW), y: Math.round(($gameMap.adjustY(c.y) + 1) * TH) });
            const onScreenFoot = f => f.x >= 0 && f.x <= Graphics.width && f.y >= 0 && f.y <= Graphics.height + TH;
            const judge = (label, c, s) => { const f = footOf(c), ok = !!s && s.visible && s.x === f.x && s.y === f.y && onScreenFoot(f); return { ok, text: `${label} (${c.x},${c.y}) ${ok ? `drawn at (${f.x},${f.y})` : s ? `sprite ${s.visible ? "visible" : "HIDDEN"} at (${s.x},${s.y}), its cell's foot (${f.x},${f.y})` : "NOT TRACKED"}` }; };
            const seamJudged = [];
            if (sp1 && sp1.level.z === 1) {
                seamItems.forEach((c, i) => seamJudged.push(judge("item", c, seamStacks[i] ? sp1._items.get(seamStacks[i].id) : null)));
                seamWalls.forEach(c => seamJudged.push(judge("wall face", c, sp1._walls.get(`${c.x},${c.y}`))));
                seamJudged.push(judge("unit", seamUnitAt, seamUnit ? sp1._units.get(seamUnit.id) : null));
            }
            const dispSeam = { x: $gameMap.displayX(), y: $gameMap.displayY() };
            const wrappedView = dispSeam.x > seamC.x && dispSeam.y > seamC.y; // the display origin lies past the seam on both axes
            t.check("entities_at_seam", seamRefused.length === 0 && wrappedView && seamJudged.length === 7 && seamJudged.every(j => j.ok),
                `view on +2 centred on (${seamC.x},${seamC.y}), display (${dispSeam.x},${dispSeam.y}) (${wrappedView ? "wrapped" : "NOT WRAPPED"}); +1 plane ${sp1 ? `level ${sp1.level.z}` : "NONE"}: ${seamJudged.map(j => j.text).join("; ") || "nothing judged"}${seamRefused.length ? `; fixture cells refused: ${seamRefused.join(" ")}` : ""}`);

            // The canvases across spritesets (K2 d). A level switch happens in place (SIM.00.00) and keeps the spriteset, its root and
            // their canvases; a map transfer (an area edge, a load) makes a new spriteset, whose planes take the old one's canvases from
            // the pool (they go back to it at terminate). Two map transfers to the level on screen (UF.World.transferView, the load
            // path): four canvases in use, none made since the first spriteset, none destroyed, none pooled (no leak, no
            // re-allocation); and each new scene starts with its planes bound to the levels below the view and shown (K2, the
            // transfer path). Fix 2: the switches alone no longer make spritesets, so this check needs the transfers to test the pool.
            const rootBefore = D.root(), starts = [];
            const realStart = Scene_Map.prototype.start;
            Scene_Map.prototype.start = function() {
                realStart.apply(this, arguments);
                const r = this._spriteset && this._spriteset._ufDepth;
                starts.push({ root: r || null, view: L.view(), planes: r ? r.planes.filter(p => p.level).map(p => ({ z: p.level.z, visible: p.visible, paints: p._tilemap.paints })) : [] });
            };
            try {
                for (let i = 0; i < 2; i++) {
                    const before = scene(), v = W.viewLevel();
                    if (!W.transferView(v.x, v.y, $gamePlayer.x, $gamePlayer.y, $gamePlayer.direction(), v.z)) harnessStop(`canvases_freed: UF.World.transferView refused map transfer ${i + 1}`);
                    await need(t, () => scene() !== before && scene() instanceof Scene_Map && scene().isStarted() && !$gamePlayer.isTransferring(), 60000, `map transfer ${i + 1} (a new map scene started)`);
                    await t.waitFrames(3);
                }
            } finally { Scene_Map.prototype.start = realStart; }
            const s0 = D.stats();
            const newRoots = new Set([rootBefore, ...starts.map(s => s.root)]).size === 3;
            const startsOk = starts.length === 2 && newRoots && starts.every(s => s.planes.length === 2 && s.planes.every((p, i) => p.visible && p.z === s.view - 1 - i));
            t.check("canvases_freed", s0.layersAlive === 4 && s0.canvasesMade === 4 && s0.canvasesDestroyed === 0 && s0.pooled === 0 && startsOk,
                `after ${switches} in-place level switches and ${starts.length} map transfer(s) (${newRoots ? "a new spriteset each" : "NOT A NEW SPRITESET EACH"}): ${s0.layersAlive} canvas layers in use, ${s0.canvasesMade} canvases made since boot, ${s0.canvasesDestroyed} destroyed, ${s0.pooled} pooled (want 4 / 4 / 0 / 0); at each new scene's start, view ${starts.map(s => `${s.view}: planes on levels [${s.planes.map(p => `${p.z}${p.visible ? "" : " HIDDEN"} ${p.paints} paint(s)`).join(", ")}]`).join("; view ") || "none"}`);
            t.check("hotkey_free", Input.keyMapper[118] === undefined, `keyMapper[118] (F7) is ${JSON.stringify(Input.keyMapper[118])}: the preset hotkey is gone and the key is free`);
            t.check("no_errors", UF.Test.errors.length === 0, UF.Test.errors.length ? `${UF.Test.errors.length} error(s), first: ${UF.Test.errors[0]}` : "none");
            if (TS && TS.resume && !wasPaused) TS.resume();
        }, { isDefault: false });

        UF.Test.suite("layers_flat", async t => {
            const W = World(), L = Levels(), D = Depth;
            const scene = () => SceneManager._scene;
            const ok0 = !!W && !!L && L.view() === 0 && !!L.surfaceGrid() && Graphics.width === 816;
            t.check("preconditions", ok0, `world ${!!W}, levels ${!!L}, view ${L && L.view()}, screen ${Graphics.width}x${Graphics.height}, world seed ${worldSeed(W)}`);
            if (!ok0) return;
            const size = W.state.size, area = W.viewLevel();
            // A still world (the simulation paused) except while the step check runs, at x1 (DEUS_TimeSpeed).
            const TS = window.UF.Time, wasPaused = !!(TS && TS.paused);
            if (TS && TS.setMultiplier) TS.setMultiplier(1);
            if (TS && TS.pause) TS.pause();
            if (window.UF.Environment && UF.Environment.setWeather) UF.Environment.setWeather({ x: area.x, y: area.y }, "clear");
            if (window.$gameScreen) $gameScreen.changeWeather("none", 0, 0);
            // Exact screen pixels need the day tone: DEUS_DayNight tones the screen by the hour (the harness clock is DEUS_Test's).
            if (window.UF.Time && UF.Time.setForTest) UF.Time.setForTest(12, 0);
            // Fixtures: the fixture scene (the Z-2 cut at its centre, the terrace, the summit); unit A (a sheet not used before in
            // this run) on the +1 terrace, seen from +2; unit B on the -1 floor of the cut, seen from the ground. Both are added on
            // the ground view, so only the planes' own preload (K2 c) loads their sheets.
            const C = sceneCentre(W, area, size);
            if (!C) harnessStop(`the fixture scene: no place in the area without a unit on any level (${SCENE_ZONE.dx1 - SCENE_ZONE.dx0 + 1} x ${SCENE_ZONE.dy1 - SCENE_ZONE.dy0 + 1} cells)`);
            const sc = buildScene(W, L, area, C);
            const at = k => ({ x: C.x + SCENE_AT[k][0], y: C.y + SCENE_AT[k][1] });
            const center = C, cut = sceneCut(C), tA = at("unitA");
            const unitA = W.addUnit({ name: "TEST_flat_A", image: { characterName: "People3", characterIndex: 1 }, area: { x: area.x, y: area.y }, x: tA.x, y: tA.y, z: 1, dir: 2, exact: true, data: { kind: "test", through: true } });
            const unitB = W.addUnit({ name: "TEST_flat_B", image: { characterName: "People4", characterIndex: 2 }, area: { x: area.x, y: area.y }, x: cut.floorM1.x, y: cut.floorM1.y, z: -1, dir: 2, exact: true, data: { kind: "test" } });
            t.check("fixtures", sc.ok && !!unitA && !!unitB, `${sceneText(sc, W)}; cut ${cut.cells.length} cells from (${cut.cells[0].x},${cut.cells[0].y}), -1 floor (${cut.floorM1.x},${cut.floorM1.y}); unit A ${unitA ? `(${unitA.x},${unitA.y}) +1` : "none"}; unit B ${unitB ? `(${unitB.x},${unitB.y}) -1` : "none"}`);
            if (!sc.ok) harnessStop(`the fixture scene was not built as specified: ${[...sc.refused, ...sc.mismatches].slice(0, 4).join("; ")}`);
            // The planes' preload of the new units' sheets finishes before the first switch (a condition, not a frame count).
            await need(t, () => D.preloadsPending() === 0, 30000, "the planes' sheet preloads (K2 c) to finish");
            const goTo = async z => {
                L.setView(z, { center });
                await need(t, () => !L.switching() && L.view() === z && scene() instanceof Scene_Map && scene().isStarted(), 30000, `the ${L.label(z)} view`);
                await t.waitFrames(8);
            };

            // (4) No lag after a level switch (DEC-011). Each of the 5 switches (0->+2->+1->0->-1->0) is judged twice: in the same
            //     frame as levels:viewChanged, and again just before the first render after it (the first frame drawn on the new
            //     view). Both times the planes are the new view's levels below it (depth 1 on z-1, depth 2 on z-2), shown and painted
            //     since they were bound (an in-place switch keeps the planes, so their paint count alone proves nothing, Fix 2);
            //     every unit in the window on a plane's level has a visible sprite with a ready bitmap and a frame, on its cell's
            //     foot; and no plane draws a unit of another level (no one-frame-late planes, units or leftovers).
            const atEvent = [];
            let awaitingDraw = null;
            const switchState = (to, frame) => {
                const r = D.root(), out = { frame, root: !!r, want: [to - 1, to - 2].filter(z => L.isLevel(z) && (z === to - 1 || (config.exposes(to - 1) && openCells(area.x, area.y, to - 1).open > 0))), planes: [], planesOk: false, units: [], missing: [], stale: [] }; // depth 2 only under rebuild's rule (PM ruling E1-A, WG.00.17)
                if (!r) return out;
                const win = r.planes[0].entityWindow();
                const footOf = u => ({ x: Math.round(($gameMap.adjustX(u.x) + 0.5) * TW), y: Math.round(($gameMap.adjustY(u.y) + 1) * TH) });
                for (const p of r.planes) {
                    if (!p.level) continue;
                    const tm = p._tilemap;
                    out.planes.push({ depth: p.depth, z: p.level.z, visible: p.visible, paints: tm.paints, painted: tm.paints > p._paintsAtBind && !tm._needsRepaint });
                    for (const u of W.units()) {
                        if (!u || !u.area || u.area.x !== p.level.x || u.area.y !== p.level.y || (u.z || 0) !== p.level.z || (u.data && (u.data.dead || u.data.hidden))) continue;
                        if (!p.inEntityWindow(win, u.x, u.y, size)) continue;
                        const s = p._units.get(u.id), f = footOf(u);
                        const ok = !!s && s.visible && !!s.bitmap && s.bitmap.isReady() && s._frame.width > 0 && s._ufCol >= 0 && s.x === f.x && s.y === f.y;
                        out.units.push(u.id);
                        if (!ok) out.missing.push(`${u.name}#${u.id}@${p.level.z}${s && s.visible ? ` at (${s.x},${s.y}), its foot (${f.x},${f.y})` : ""}`);
                    }
                    for (const s of p._units.values()) {
                        const u = s._ufRef;
                        if (s.visible && u && (!u.area || u.area.x !== p.level.x || u.area.y !== p.level.y || (u.z || 0) !== p.level.z)) out.stale.push(`${u.name}#${u.id}@${u.z || 0} on the ${p.level.z} plane`);
                    }
                }
                out.planesOk = out.planes.length === out.want.length && out.planes.every((p, i) => p.z === out.want[i] && p.visible && p.painted);
                return out;
            };
            const snapshotAtEvent = (from, to) => {
                const out = Object.assign({ from, to }, switchState(to, Graphics.frameCount));
                atEvent.push(out);
                awaitingDraw = out;
            };
            // The first render after the event: RMMZ renders once per tick, after the tick's updates (Graphics._onTick).
            const app = Graphics.app, ownRender = Object.prototype.hasOwnProperty.call(app, "render"), realRender = app.render;
            app.render = function() {
                if (awaitingDraw) { awaitingDraw.drawn = switchState(awaitingDraw.to, Graphics.frameCount); awaitingDraw = null; }
                return realRender.apply(this, arguments);
            };
            UF.Events.on("levels:viewChanged", snapshotAtEvent);
            await goTo(2);
            const flatAt = { plus2: null, plus1: null };
            const inspect = () => {
                const r = D.root(), main = scene()._spriteset._tilemap, bad = [];
                for (const o of subtree(r)) {
                    const f = filterNames(o);
                    if (o.filters !== null && o.filters !== undefined) bad.push(`${o.constructor.name} filters [${f}]`);
                    if (f.some(n => n === "BlurFilter" || n === "ColorMatrixFilter")) bad.push(`${o.constructor.name} ${f.join("+")}`);
                }
                for (const o of [r, ...r.planes, ...r.planes.map(p => p._entities)]) if (o.scale.x !== 1 || o.scale.y !== 1 || o.alpha !== 1) bad.push(`${o.constructor.name} scale ${o.scale.x}x${o.scale.y} alpha ${o.alpha}`);
                if (main.scale.x !== 1 || main.scale.y !== 1 || main.filters) bad.push(`main tilemap scale ${main.scale.x} filters [${filterNames(main)}]`);
                return { bound: r.planes.filter(p => p.visible && p.level).map(p => p.level.z), bad };
            };
            flatAt.plus2 = inspect();
            // (2) Position: a world point of each lower plane is drawn exactly where the tilemap on screen draws that point (+-0 px),
            //     before and after a two-tile pan; unit A's sprite stands exactly on its cell.
            const positionOf = () => {
                const r = D.root(), main = scene()._spriteset._tilemap, out = [];
                const probe = { x: (center.x + 2) * TW + 7, y: (center.y + 1) * TH + 11 }; // a world pixel, off the cell corners
                const mainAt = main._lowerLayer.toGlobal(new PIXI.Point(probe.x - main._lastStartX * TW, probe.y - main._lastStartY * TH));
                for (const p of r.planes) {
                    if (!p.level) continue;
                    const at = p._lower.toGlobal(new PIXI.Point(probe.x - p._tilemap._lastStartX * TW, probe.y - p._tilemap._lastStartY * TH));
                    out.push({ depth: p.depth, dx: at.x - mainAt.x, dy: at.y - mainAt.y });
                }
                return out;
            };
            const pos0 = positionOf();
            const dx0 = $gameMap.displayX();
            $gameMap.scrollRight(2);
            await t.waitFrames(3);
            const panned = ($gameMap.displayX() - dx0 + $gameMap.width()) % $gameMap.width();
            const pos1 = positionOf();
            $gameMap.scrollLeft(2);
            await t.waitFrames(3);
            const sA = unitA ? D.root().planes[0]._units.get(unitA.id) : null;
            const footA = unitA ? { x: Math.round(($gameMap.adjustX(unitA.x) + 0.5) * TW), y: Math.round(($gameMap.adjustY(unitA.y) + 1) * TH) } : null;
            const gA = sA ? sA.getGlobalPosition(new PIXI.Point()) : null;
            const posOk = pos0.length === 2 && pos1.length === 2 && panned === 2 && [...pos0, ...pos1].every(q => q.dx === 0 && q.dy === 0) && !!gA && gA.x === footA.x && gA.y === footA.y;
            t.check("flat_position", posOk, `before the pan ${pos0.map(q => `depth ${q.depth} off by (${q.dx},${q.dy})`).join(", ")}; after a ${panned}-tile pan ${pos1.map(q => `depth ${q.depth} off by (${q.dx},${q.dy})`).join(", ")} (want 0 px); unit A drawn at ${gA ? `(${gA.x},${gA.y})` : "-"} for its cell's foot ${footA ? `(${footA.x},${footA.y})` : "-"}`);

            // (3) Crisp: the planes' tile render holds no colour outside the source canvases (and the void).
            const imageData = bmp => bmp.context.getImageData(0, 0, bmp.width, bmp.height).data;
            const colorsOf = bmp => { const d = imageData(bmp), set = new Set(); for (let i = 0; i < d.length; i += 4) if (d[i + 3] === 255) set.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); return set; };
            const entitiesOn = Object.assign({}, config.entities);
            Object.assign(config.entities, { objects: false, items: false, units: false, walls: false }); D.refresh(); await t.waitFrames(3);
            const r2 = D.root(), palette = new Set([config.voidColor]);
            for (const p of r2.planes) if (p.level) for (const b of [p._tilemap._lowerLayer.bitmap, p._tilemap._upperLayer.bitmap]) for (const c of colorsOf(b)) palette.add(c);
            const render = Bitmap.snap(r2), rd = imageData(render);
            let sampled = 0, foreign = 0, first = "";
            for (let y = 1; y < render.height; y += 3) for (let x = 1; x < render.width; x += 3) {
                const i = (y * render.width + x) * 4;
                if (rd[i + 3] !== 255) continue;
                sampled++;
                const c = (rd[i] << 16) | (rd[i + 1] << 8) | rd[i + 2];
                if (!palette.has(c)) { foreign++; if (!first) first = `#${c.toString(16).padStart(6, "0")} at (${x},${y})`; }
            }
            Object.assign(config.entities, entitiesOn); D.refresh(); await t.waitFrames(3);
            t.check("flat_crisp", sampled >= 1000 && foreign === 0, `${sampled} opaque samples of the +2 planes' tile render, ${foreign} colour(s) not in the ${palette.size}-colour source set${first ? `, first ${first}` : ""}`);

            // (5) A unit on a lower level that steps gets its sprite's target in that same frame and walks to the new cell over
            //     UnitStepFrames simulation ticks, the clock the walk uses (Fix 1, m2): in every frame drawn 0 < ticks < UnitStepFrames
            //     after the step it is between the cells (not yet on the new one), in every frame drawn UnitStepFrames or more ticks
            //     after it stands on the new cell's foot, and walk frames show on the way. A unit entering the window (camera still)
            //     gets its sprite in the frame it enters. No 60-frame wait. Displayed-frame counts are reported, not gated.
            const moves = [];
            const onMoved = (u, from, to) => { if (u && (u === unitA || u.name === "TEST_flat_E")) moves.push({ id: u.id, frame: Graphics.frameCount, tick: W._frame | 0, from: { x: from.x, y: from.y }, x: to.x, y: to.y }); };
            UF.Events.on("world:unitMoved", onMoved);
            const dur = unitStepFrames();
            if (TS && TS.resume) TS.resume();
            let stepDetail = "unit A missing", stepOk = false;
            if (unitA && sA) {
                W.sendUnit(unitA.id, { area: { x: area.x, y: area.y }, x: unitA.x + 1, y: unitA.y, z: 1 });
                await need(t, () => moves.some(m => m.id === unitA.id), 20000, "unit A's step (world:unitMoved)");
                const m = moves.find(q => q.id === unitA.id);
                const plane1 = () => D.root().planes[0];
                const footAt = c => ({ x: Math.round(($gameMap.adjustX(c.x) + 0.5) * TW), y: Math.round(($gameMap.adjustY(c.y) + 1) * TH) });
                const want = footAt(m), fromFoot = footAt(m.from);
                const trace = [];
                for (let guard = 0; ; guard++) {
                    const s = plane1()._units.get(unitA.id), tick = W._frame | 0;
                    if (s) trace.push({ f: Graphics.frameCount, tick, t0: s._ufT0, e: tick - s._ufT0, x: s.x, y: s.y, col: s._ufCol, target: `${wrapCell(s._ufToX, size)},${wrapCell(s._ufToY, size)}`, targetFrame: s._ufTargetFrame });
                    if (tick - m.tick >= dur + 2) break;
                    if (guard > 3000) harnessStop(`the simulation clock did not reach ${dur + 2} ticks after unit A's step (at ${tick - m.tick})`);
                    await t.waitFrames(1);
                }
                const t0 = trace[0], stand = sA._ufSheet ? sA._ufSheet.stand : 1;
                const lo = Math.min(fromFoot.x, want.x), hi = Math.max(fromFoot.x, want.x), loY = Math.min(fromFoot.y, want.y), hiY = Math.max(fromFoot.y, want.y);
                const during = trace.filter(q => q.e > 0 && q.e < dur), after = trace.filter(q => q.e >= dur);
                const betweenAll = during.length > 0 && during.every(q => !(q.x === want.x && q.y === want.y) && q.x >= lo && q.x <= hi && q.y >= loY && q.y <= hiY && (q.x !== fromFoot.x || q.y !== fromFoot.y));
                const arrived = after.length > 0 && after.every(q => q.x === want.x && q.y === want.y);
                const walked = trace.some(q => q.e >= 0 && q.e <= dur && q.col !== stand);
                const firstAt = trace.find(q => q.x === want.x && q.y === want.y);
                stepOk = !!t0 && t0.targetFrame === m.frame && t0.target === `${m.x},${m.y}` && t0.t0 === m.tick && betweenAll && arrived && walked;
                stepDetail = `step (${m.from.x},${m.from.y}) -> (${m.x},${m.y}) in frame ${m.frame}, tick ${m.tick}: sprite target ${t0 ? `${t0.target} set in frame ${t0.targetFrame}, walk from tick ${t0.t0}` : "-"}; ${during.length} frame(s) drawn 1..${dur - 1} ticks after it, ${betweenAll ? "each between the cells" : "NOT ALL BETWEEN THE CELLS"}; ${after.length} frame(s) drawn ${dur}+ ticks after it, ${arrived ? "each on the new cell's foot" : "NOT ALL ON THE NEW CELL"} (${want.x},${want.y}); walk frames shown: ${walked} (columns ${[...new Set(trace.map(q => q.col))].join("/")}, stand ${stand}); reported, not gated: first drawn on the new cell ${firstAt ? `${firstAt.e} tick(s), ${firstAt.f - m.frame} frame update(s) after the step` : "never"} (bound ${dur} ticks)`;
            }
            // Entering: unit E starts one cell outside the window's right edge on +1 and steps into it.
            const win = D.root().planes[0].entityWindow();
            const ey = Math.min(Math.max(center.y, win.y0 + 1), win.y1 - 1);
            const unitE = W.addUnit({ name: "TEST_flat_E", image: { characterName: "People3", characterIndex: 1 }, area: { x: area.x, y: area.y }, x: wrapCell(win.x1 + 1, size), y: ey, z: 1, dir: 4, exact: true, data: { kind: "test", through: true } });
            await t.waitFrames(2);
            const outside = !D.root().planes[0]._units.has(unitE.id);
            W.sendUnit(unitE.id, { area: { x: area.x, y: area.y }, x: wrapCell(win.x1 - 1, size), y: ey, z: 1 });
            await need(t, () => moves.some(m => m.id === unitE.id), 20000, "unit E's step (world:unitMoved)");
            const mE = moves.find(q => q.id === unitE.id);
            await t.waitFrames(1);
            const sE = D.root().planes[0]._units.get(unitE.id);
            const enterOk = outside && !!sE && sE._ufTargetFrame === mE.frame && sE._ufCellX === mE.x;
            UF.Events.off("world:unitMoved", onMoved);
            W.stopUnit(unitE.id);
            W.stopUnit(unitA.id);
            if (TS && TS.pause) TS.pause();
            t.check("unit_step_same_frame", stepOk && enterOk, `${stepDetail}; unit E ${outside ? "outside the window" : "ALREADY TRACKED"} at x ${wrapCell(win.x1 + 1, size)}, stepped to (${mE.x},${mE.y}) in frame ${mE.frame}: sprite ${sE ? `made in frame ${sE._ufTargetFrame}` : "NOT made"}`);

            // K4: the per-frame unit check tests only the units on the planes' levels (a candidate list), not every unit of the world.
            await t.waitFrames(2);
            const rootK4 = D.root(), sK4 = D.stats(), allUnits = W.units();
            const onPlanes = allUnits.filter(u => u && u.area && rootK4.planes.some(p => p.level && (u.z || 0) === p.level.z && u.area.x === p.level.x && u.area.y === p.level.y)).length;
            t.check("scan_candidates_only", sK4.unitsScanned === onPlanes && (allUnits.length === onPlanes || sK4.unitsScanned < allUnits.length),
                `${sK4.unitsScanned} unit(s) tested per frame; ${onPlanes} on the planes' levels, ${allUnits.length} in the world; candidate lists made ${sK4.candidateRebuilds} time(s) since boot`);
            // K4: an item change touches only the item sprites of the plane whose level holds the item; a held item touches nothing
            // (combat used to rebuild every plane's walls and objects for every arrow shot).
            const Items = window.UF.Items;
            const itemType = ["stone", "oak_log", "log", "wood", "berries", "rations"].find(id => Items && Items.type && Items.type(id) && Items.type(id).image) || null;
            const flagsOf = () => D.root().planes.map(p => ({ items: !!p._itemsDirty, all: !!p._entityDirty, objects: !!(p._objectLayer && p._objectLayer._dirty) }));
            let heldOk = false, groundOk = false, detailIC = "no item type or unit A";
            if (Items && itemType && unitA && D.root().planes[0].level) {
                const f0 = flagsOf();
                const given = Items.give(itemType, 1, unitA.id);
                const f1 = flagsOf();
                heldOk = !!given && JSON.stringify(f1) === JSON.stringify(f0);
                const lvA = { x: area.x, y: area.y, z: D.root().planes[0].level.z };
                const made = Items.create(itemType, 1, { area: lvA, x: unitA.x, y: unitA.y });
                const f2 = flagsOf();
                groundOk = !!made && f2[0].items && f2[0].all === f0[0].all && f2[0].objects === f0[0].objects && f2[1].items === f0[1].items && f2[1].all === f0[1].all && f2[1].objects === f0[1].objects;
                detailIC = `before ${JSON.stringify(f0)}; a ${itemType} given to unit A (held): ${JSON.stringify(f1)}; a ${itemType} on the ground of level ${lvA.z} at (${unitA.x},${unitA.y}): ${JSON.stringify(f2)}`;
                await t.waitFrames(2);
            }
            t.check("item_change_scoped", heldOk && groundOk, detailIC);

            // Every view sees through its open cells (Owner 2026-09-25 23:52 CT): on +2, +1, the ground and -1, an open cell of the
            // viewed level is not painted by the map on screen (the tile render there equals the planes' own render, alpha 255), and
            // a reference cell that is not open is unchanged when the planes are switched off (solid cells stay opaque). Both cells of
            // every view are fixture cells (Fix 1, M1); a fixture cell that is not as built is a harness problem.
            const refCell = { 2: at("summitFloor"), 1: at("terraceRef"), 0: at("groundRef"), [-1]: at("minus1Ref") };
            const views = [];
            const viewCheck = async z => {
                const main = scene()._spriteset._tilemap, r = D.root();
                const cellPx = (x, y) => ({ x: Math.round(($gameMap.adjustX(x) + 0.5) * TW), y: Math.round(($gameMap.adjustY(y) + 0.5) * TH) });
                const visibleCell = c => { const p = cellPx(c.x, c.y); return p.x > 24 && p.x < Graphics.width - 24 && p.y > 24 && p.y < Graphics.height - 24; };
                const openHere = (z === -1 ? cut.openM1 : cut.cells)[0], solidHere = refCell[z];
                const openShape = L.shapeAt({ area, x: openHere.x, y: openHere.y, z }), refShape = L.shapeAt({ area, x: solidHere.x, y: solidHere.y, z });
                if (openShape !== "open" || refShape === "open" || !visibleCell(openHere) || !visibleCell(solidHere)) {
                    harnessStop(`every_view_sees_through, the ${L.label(z)} view: the fixture cells are not as built (open cell (${openHere.x},${openHere.y}) is ${openShape}${visibleCell(openHere) ? "" : ", off screen"}; reference cell (${solidHere.x},${solidHere.y}) is ${refShape}${visibleCell(solidHere) ? "" : ", off screen"})`);
                }
                Object.assign(config.entities, { objects: false, items: false, units: false, walls: false }); D.refresh(); await t.waitFrames(3);
                const tileRender = () => {
                    const hidden = [];
                    for (const c of main.children) if (c !== main._lowerLayer && c !== main._upperLayer && c !== r && c.visible) { c.visible = false; hidden.push(c); }
                    const b = Bitmap.snap(main);
                    for (const c of hidden) c.visible = true;
                    return b;
                };
                const on = tileRender(), planes = Bitmap.snap(r);
                D.setEnabled(false); await t.waitFrames(3);
                const off = tileRender();
                D.setEnabled(true); await t.waitFrames(3);
                Object.assign(config.entities, entitiesOn); D.refresh(); await t.waitFrames(3);
                const px = (b, c) => { const p = cellPx(c.x, c.y); return b.getPixel(p.x, p.y); };
                const po = cellPx(openHere.x, openHere.y);
                const seesThrough = r.seeThrough && px(on, openHere) === px(planes, openHere) && planes.getAlphaPixel(po.x, po.y) === 255;
                const opaque = px(on, solidHere) === px(off, solidHere);
                views.push({ z, ok: seesThrough && opaque, text: `${L.label(z)}: open cell (${openHere.x},${openHere.y}) draws ${px(on, openHere)}, planes ${px(planes, openHere)}/${planes.getAlphaPixel(po.x, po.y)}, planes off ${px(off, openHere)}; ${refShape} cell (${solidHere.x},${solidHere.y}) ${opaque ? "unchanged" : "CHANGED"} (${px(on, solidHere)} / ${px(off, solidHere)} planes off); planes on levels [${r.planes.filter(p => p.level).map(p => p.level.z).join(", ")}]` });
            };
            await goTo(2);
            await viewCheck(2);
            // Views +1, then the ground and -1 (the Z-2 cut): switches under the same-frame hook, and the flat state on +1.
            await goTo(1);
            flatAt.plus1 = inspect();
            await viewCheck(1);
            await goTo(0);
            await viewCheck(0);
            const shots = [];
            D.setEnabled(false); await t.waitFrames(3); shots.push(t.screenshot("ground_off"));
            D.setEnabled(true); await t.waitFrames(3); shots.push(t.screenshot("ground_flat"));
            await goTo(-1);
            await viewCheck(-1);
            D.setEnabled(false); await t.waitFrames(3); shots.push(t.screenshot("minus1_off"));
            D.setEnabled(true); await t.waitFrames(3); shots.push(t.screenshot("minus1_flat"));
            await goTo(0);
            UF.Events.off("levels:viewChanged", snapshotAtEvent);
            if (ownRender) app.render = realRender; else delete app.render;
            t.check("every_view_sees_through", views.length === 4 && views.every(v => v.ok), views.map(v => v.text).join("; "));

            // (1) Flat on +2 and +1 with both planes bound: no filter anywhere under the root, scale 1 and alpha 1 on the root, the
            //     planes and their entity containers; the map's tilemap at scale 1 without filters.
            const flatOk = ["plus2", "plus1"].every(k => flatAt[k] && flatAt[k].bound.length === 2 && flatAt[k].bad.length === 0);
            t.check("flat_no_filters", flatOk, ["plus2", "plus1"].map(k => `${k}: planes on levels [${flatAt[k] ? flatAt[k].bound.join(", ") : "-"}], ${flatAt[k] && flatAt[k].bad.length ? flatAt[k].bad.slice(0, 4).join("; ") : "flat"}`).join("; "));
            // Both observations of every switch must hold; the fixture units A (+1, seen from +2) and B (-1, seen from the ground) are
            // among the units judged at both.
            const stateOk = s => !!s && s.root && s.planesOk && s.missing.length === 0 && s.stale.length === 0;
            const sequence = atEvent.map(e => `${e.from}->${e.to}`).join(" "), wantSequence = "0->2 2->1 1->0 0->-1 -1->0";
            const judged = (e, u) => !!u && e.units.includes(u.id) && !!e.drawn && e.drawn.units.includes(u.id);
            const evOk = sequence === wantSequence && atEvent.every(e => stateOk(e) && stateOk(e.drawn))
                && atEvent.some(e => e.to === 2 && judged(e, unitA)) && atEvent.some(e => e.to === 0 && judged(e, unitB));
            const stateText = s => !s ? "NEVER DRAWN" : `planes ${s.planes.map(p => `${p.z}:${p.visible ? "shown" : "HIDDEN"} ${p.painted ? "painted" : "NOT PAINTED"} since bound (${p.paints} paint(s))`).join(", ") || "NONE"}${s.planesOk ? "" : ` (want levels [${s.want.join(", ")}], shown and painted)`}; ${s.units.length} unit(s) in the window${s.missing.length ? `, NOT DRAWN ON THEIR CELL: ${s.missing.join(" ")}` : ", all with a frame on their cell"}${s.stale.length ? `; STALE: ${s.stale.join(" ")}` : ""}`;
            t.check("switch_same_frame", evOk, `switches ${sequence || "none"}${sequence === wantSequence ? "" : ` (want ${wantSequence})`}: ` + atEvent.map(e => `${e.from}->${e.to} at levels:viewChanged (frame ${e.frame}): ${stateText(e)}; first drawn frame${e.drawn ? ` (frame ${e.drawn.frame})` : ""}: ${stateText(e.drawn)}`).join("; "));
            const fs = require("fs");
            const sizes = shots.map(f => (fs.existsSync(f) ? fs.statSync(f).size : 0));
            t.check("screenshots_written", shots.length === 4 && sizes.every(n => n > 10000), shots.map((f, i) => `${require("path").basename(f)} ${sizes[i]} B`).join(", "));
            t.check("no_errors", UF.Test.errors.length === 0, UF.Test.errors.length ? `${UF.Test.errors.length} error(s), first: ${UF.Test.errors[0]}` : "none");
            if (TS && TS.resume && !wasPaused) TS.resume();
        }, { isDefault: false });
    }
})();
