//=============================================================================
// DEUS_Depth.js - Vertical depth compositing: the levels below the viewed level, projected crisply beneath it
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Depth] Crisp depth projection of the levels below the viewed level, seen through open air (owner direction 2026-09-24).
 * @author DEUS project (Fable)
 * @base DEUS_Levels
 * @orderAfter DEUS_Levels
 * @orderAfter DEUS_Camera
 * @orderAfter DEUS_Culling
 *
 * @param Preset
 * @text Start preset
 * @desc A: two levels below at their camera-model scale, crisp (default). B: + value step. C: + subtle blur. D: one level, blurred. E: D + darker. off.
 * @type select
 * @option A: camera-model zoom, crisp (default)
 * @value A
 * @option B: zoom + value step
 * @value B
 * @option C: zoom + value + subtle blur
 * @value C
 * @option D: one level below, blurred
 * @value D
 * @option E: blurred + darker
 * @value E
 * @option off
 * @value off
 * @default A
 *
 * @param MaxDepth
 * @text Levels below drawn
 * @desc 2: the level two below shows through the open cells of the level below (default). 1: one level, then the void.
 * @type number
 * @min 0
 * @max 2
 * @default 2
 *
 * @param EyeHeightFt
 * @text Eye height (ft)
 * @desc The camera's height above the viewed level; each level is 6 ft lower, scale = eye / (eye + 6 x depth). 190 gives 0.969 / 0.941.
 * @type number
 * @min 1
 * @default 190
 *
 * @help
 * DEUS vertical depth compositing (owner addendum "DEUS — VERTICAL DEPTH COMPOSITING VISUAL
 * DIRECTION UPDATE", 2026-09-24). System doc: docs/systems/DEUS_Depth.md.
 *
 * While a level above the ground is on screen (+1 or +2), the level below it is drawn BENEATH
 * the tile layer of the map on screen, blurred to set it apart from the level on screen, and
 * beyond it lies the void (user direction 2026-09-24: one level below, black beyond). The
 * open-air look of tileset 92 is transparent (DEUS_Levels compose()), so the viewed level's own
 * floors, rock and decks are the exposure mask: the level below shows exactly where the level
 * above it is open air. Nothing is drawn on the ground or underground views: their hole looks
 * are opaque art.
 *
 * Each depth plane is a stock RMMZ Tilemap whose layers paint into a canvas Bitmap (nearest
 * sampling) from the lower level's cached build (UF.World.peekArea). Optionally (presets A/B/C,
 * the addendum's experiment) the plane is scaled about the viewport centre:
 *     screen = centre + (unprojectedScreen - centre) * depthScale
 * and with MaxDepth 2 the level two below shows through the open cells of the level below.
 *
 * Developer-tunable constants: UF.Depth.config (see docs/systems/DEUS_Depth.md) and the presets
 * UF.Depth.preset("D" | "E" | "A" | "B" | "C" | "off"). F7 cycles the presets in play and logs
 * the values to the console (F8).
 *
 * The A1 water frames of a lower level step with the map on screen (a sprite-frame animation
 * of the tileset, rule 12); the plugin synthesizes no motion of its own.
 *
 * Replaced core methods: none. Aliases: Spriteset_Map.createCharacters, Spriteset_Map.updateTilemap,
 * Scene_Map.update, Scene_Boot.start (checks). Save data: none.
 *
 * Checks: suite "depth" (not a default suite): node tools/test_snapshot.js --name depth
 * --plugins DEUS_Depth --suite depth. Provocations: UF_TEST_PROVOKE=depth.<check>.
 */

(() => {
    "use strict";

    const PLUGIN = "DEUS_Depth";
    const TW = 48, TH = 48;
    const PAD = 48; // the plane's window extends one tile beyond the viewport on every side (the projection pulls the edges inward)
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

    //-------------------------------------------------------------------------
    // Configuration (developer-tunable; nothing here is frozen)

    const params = (() => {
        try { return PluginManager.parameters(PLUGIN) || {}; } catch (e) { return {}; }
    })();
    const num = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };

    const depthDefaults = (scale) => ({ scale, brightness: 1, saturation: 0, contrast: 0, blur: 0 });
    // "camera": the scale comes from the camera model (config.camera): a pinhole eye at eyeHeightFt above the viewed
    // level sees a level d storeys (levelHeightFt each) lower at eye / (eye + d * levelHeight). User direction
    // 2026-09-24: "zoom them at the correct distance to simulate being 6 feet farther away". 190 ft gives 0.969 / 0.941,
    // the addendum's 0.97 / 0.94.
    const PRESETS = Object.freeze({
        off: { enabled: false },
        // A (the default): two levels below, each at its camera-model scale about the viewport centre, crisp, no value change
        A: { enabled: true, depths: { 1: depthDefaults("camera"), 2: depthDefaults("camera") } },
        // B: A plus a restrained value step per depth (brightness, saturation, contrast are ColorMatrix multipliers)
        B: { enabled: true, depths: {
            1: { scale: "camera", brightness: 0.93, saturation: -0.15, contrast: -0.06, blur: 0 },
            2: { scale: "camera", brightness: 0.86, saturation: -0.30, contrast: -0.12, blur: 0 } } },
        // C: B plus a very subtle blur (px), the addendum's comparison variant
        C: { enabled: true, depths: {
            1: { scale: "camera", brightness: 0.93, saturation: -0.15, contrast: -0.06, blur: 0.5 },
            2: { scale: "camera", brightness: 0.86, saturation: -0.30, contrast: -0.12, blur: 0.8 } } },
        // D (the default; user direction 2026-09-24): the level below at its own scale, blurred to set it apart from
        // the level on screen; beyond it the void. E: D plus a slight darkening.
        D: { enabled: true, depths: {
            1: { scale: 1.0, brightness: 1, saturation: 0, contrast: 0, blur: 1.5 },
            2: { scale: 1.0, brightness: 1, saturation: 0, contrast: 0, blur: 2.5 } } },
        E: { enabled: true, depths: {
            1: { scale: 1.0, brightness: 0.90, saturation: -0.15, contrast: 0, blur: 1.5 },
            2: { scale: 1.0, brightness: 0.80, saturation: -0.30, contrast: 0, blur: 2.5 } } }
    });

    const config = {
        enabled: true,
        preset: "A",
        /** How many levels below the viewed level are drawn: 2 (user direction 2026-09-24, the later one: two levels,
         *  the level two below showing through the open cells of the level below) or 1 (one level, the void beyond it). */
        maxDepth: 2,
        /** The camera model behind scale "camera": eye height above the viewed level and the height of one level, in feet. */
        camera: { eyeHeightFt: 190, levelHeightFt: 6 },
        /** The void beyond the last drawn level (DEUS near-black, rule 13's range #08080C..#121218). */
        voidColor: 0x08080c,
        /** Projection origin as a fraction of the viewport: 0.5/0.5 is the viewport centre (the camera focus). */
        origin: { x: 0.5, y: 0.5 },
        /** Diagnostic bound: the inward shift of a lower plane at the viewport edge, (1 - scale) * half the viewport, must stay under it. */
        maxParallaxPx: 26,
        /** Levels whose open cells draw transparent, so the level below them can show: the surface levels (open_air). */
        exposes: z => z > 0,
        depths: { 1: depthDefaults(0.97), 2: depthDefaults(0.94) },
        _stamp: 1
    };
    /** The camera-model scale of depth d: eye / (eye + d * levelHeight). */
    const cameraScale = d => {
        const eye = Math.max(1, +config.camera.eyeHeightFt || 190), lh = Math.max(0, +config.camera.levelHeightFt || 6);
        return eye / (eye + d * lh);
    };
    const resolveDepth = (d, src) => { const out = Object.assign({}, src); if (out.scale === "camera") out.scale = cameraScale(d); return out; };
    function applyPreset(name) {
        const p = PRESETS[name];
        if (!p) return false;
        config.preset = name;
        config.enabled = p.enabled !== false;
        if (p.depths) { config.depths[1] = resolveDepth(1, p.depths[1]); config.depths[2] = resolveDepth(2, p.depths[2]); }
        if (provoked("parallax_bounded")) config.depths[1].scale = 0.80; // the provocation survives every preset
        config._stamp++;
        return true;
    }
    if (params.EyeHeightFt !== undefined) config.camera.eyeHeightFt = num(params.EyeHeightFt, config.camera.eyeHeightFt);
    applyPreset(PRESETS[params.Preset] ? params.Preset : "A");
    if (params.MaxDepth !== undefined) config.maxDepth = Math.max(0, Math.min(2, num(params.MaxDepth, 2) | 0));
    // Provocations that change the configuration
    if (provoked("projection_origin")) { config.origin = { x: 0, y: 0 }; config._stamp++; }

    const stats = { rebuilds: 0, paints: 0, lastPaintMs: 0, peeks: 0, lastPeekMs: 0, layersAlive: 0 };

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
        this.bitmap = new Bitmap(width, height);
        this.bitmap.smooth = false; // NEAREST sampling, whatever the engine's Bitmap default is
        this.bitmap.context.imageSmoothingEnabled = false;
        this._images = [];
        this._count = 0;
        this._dirty = false;
        this.water = false;   // an A1 tile was drawn: the plane keeps stepping the water frames with the map on screen
        stats.layersAlive++;
    };
    DepthCanvasLayer.prototype.destroy = function() {
        if (this.bitmap) { this.bitmap.destroy(); this.bitmap = null; stats.layersAlive--; }
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
    // A Tilemap whose layers are canvas layers and whose window is the viewport plus PAD on every side.
    // It is never rendered itself: it lives under a detached container (PIXI's updateTransform needs a parent)
    // and its only job is to paint the spot grid the stock code computes.

    function DepthTilemap() { this.initialize(...arguments); }
    DepthTilemap.prototype = Object.create(Tilemap.prototype);
    DepthTilemap.prototype.constructor = DepthTilemap;
    DepthTilemap.prototype.initialize = function(width, height) {
        this._window = { width, height };
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
    // A depth plane on screen: the two canvas layers of one lower level, scaled about the viewport centre.

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
        this.addChild(this._lower);
        this.addChild(this._upper);
        this._colorFilter = null;
        this._blurFilter = null;
        this._appliedStamp = 0;
        this.visible = false;
    };
    Sprite_DepthPlane.prototype.destroy = function() {
        this._root.destroy({ children: true });
        this._root = null;
        this._tilemap = null;
        PIXI.Container.prototype.destroy.call(this, { children: true });
    };
    /** Show level `level` ({ x, y, z }) from its build `map`. */
    Sprite_DepthPlane.prototype.bind = function(level, map) {
        this.level = level;
        this.map = map;
        const tm = this._tilemap;
        tm.setData(map.width, map.height, map.data);
        tm.horizontalWrap = map.scrollType === 2 || map.scrollType === 3;
        tm.verticalWrap = map.scrollType === 1 || map.scrollType === 3;
        const ts = window.$dataTilesets && $dataTilesets[map.tilesetId];
        tm.flags = ts ? ts.flags : [];
        tm.setBitmaps(ts ? ts.tilesetNames.map(n => ImageManager.loadTileset(n)) : []);
        tm.refresh();
    };
    Sprite_DepthPlane.prototype.refresh = function() { this._tilemap.refresh(); };
    /** The unprojected screen position of the plane's canvas (the same rounding as the tilemap on screen). */
    Sprite_DepthPlane.prototype.unprojected = function(viewOx, viewOy) {
        const tm = this._tilemap;
        return { x: tm._lastStartX * TW - Math.ceil(viewOx), y: tm._lastStartY * TH - Math.ceil(viewOy) };
    };
    Sprite_DepthPlane.prototype.updatePlane = function(viewOx, viewOy, cfg) {
        const tm = this._tilemap;
        tm.origin.x = viewOx - PAD;
        tm.origin.y = viewOy - PAD;
        tm.update();
        tm.updateTransform(); // paints when the start tile, the water frame or a refresh asks for it
        const s = cfg.scale;
        const c = Depth.center();
        const u = this.unprojected(viewOx, viewOy);
        this.x = Math.round(c.x + (u.x - c.x) * s);
        this.y = Math.round(c.y + (u.y - c.y) * s);
        this.scale.set(s, s);
        if (this._appliedStamp !== config._stamp) this.applyLook(cfg);
    };
    Sprite_DepthPlane.prototype.applyLook = function(cfg) {
        const filters = [];
        const neutral = cfg.brightness === 1 && !cfg.saturation && !cfg.contrast;
        if (!neutral) {
            const f = this._colorFilter || (this._colorFilter = new PIXI.filters.ColorMatrixFilter());
            f.reset();
            if (cfg.brightness !== 1) f.brightness(cfg.brightness, true);
            if (cfg.saturation) f.saturate(cfg.saturation, true);
            if (cfg.contrast) f.contrast(cfg.contrast, true);
            f.resolution = 1;
            filters.push(f);
        }
        if (cfg.blur > 0 && !provoked("blur_by_default")) { // the provocation: the blur asked for is never applied
            const b = this._blurFilter || (this._blurFilter = new PIXI.filters.BlurFilter(cfg.blur, 2, 1, 5));
            b.blur = cfg.blur;
            b.quality = 2;
            filters.push(b);
        }
        this.filters = filters.length ? filters : null;
        const smooth = provoked("crisp_nearest"); // the provocation: bilinear sampling
        this._lower.bitmap.smooth = smooth;
        this._upper.bitmap.smooth = smooth;
        this._appliedStamp = config._stamp;
    };

    //-------------------------------------------------------------------------
    // The manager of one Spriteset_Map: which lower levels are drawn, from which builds.

    function Sprite_DepthRoot() { this.initialize(...arguments); }
    Sprite_DepthRoot.prototype = Object.create(PIXI.Container.prototype);
    Sprite_DepthRoot.prototype.constructor = Sprite_DepthRoot;
    Sprite_DepthRoot.prototype.initialize = function() {
        PIXI.Container.call(this);
        this.spriteId = Sprite._counter++;
        // Below the lower tile layer (z 0) of the map on screen: its opaque tiles are the exposure mask. The
        // exposure provocation lifts the planes above the tile layer, so a floor cell would change too.
        this.z = provoked("exposure") ? 0.5 : -1;
        // The void beyond the last drawn level: under the planes, over the parallax. Where the level on screen and the
        // drawn level(s) below are all open, this is what shows (never the sky). The void_beyond provocation hides it.
        this._void = new PIXI.Graphics();
        this._void.beginFill(config.voidColor).drawRect(0, 0, Graphics.width, Graphics.height).endFill();
        this._void.visible = false;
        this.addChild(this._void);
        this.planes = [new Sprite_DepthPlane(1), new Sprite_DepthPlane(2)];
        // Depth 2 is drawn first, depth 1 over it; through depth 1's transparent open cells depth 2 shows.
        // The mask-order provocation draws them the other way round.
        const order = provoked("mask_order") ? [this.planes[0], this.planes[1]] : [this.planes[1], this.planes[0]];
        for (const p of order) this.addChild(p);
        this.viewZ = null;
        this.openStamp = -1;
        this.rebuild();
    };
    Sprite_DepthRoot.prototype.destroy = function() {
        PIXI.Container.prototype.destroy.call(this, { children: true });
    };
    /** Bind the planes to the levels below the level on screen (none when nothing can show through). */
    Sprite_DepthRoot.prototype.rebuild = function() {
        const W = World(), L = Levels();
        const v = W && W.viewLevel ? W.viewLevel() : null;
        stats.rebuilds++;
        this.viewZ = v ? v.z : null;
        this.openStamp = openStamp;
        for (const p of this.planes) { p.visible = false; p.level = null; p.map = null; }
        if (!v || !L || !config.enabled || provoked("planes_present")) return;
        const exposes = z => L.isLevel(z) && config.exposes(z) && hasOpenCells(v, z);
        if (!exposes(v.z) || config.maxDepth < 1) return;
        this.bindPlane(this.planes[0], v, v.z - 1);
        if (config.maxDepth >= 2 && this.planes[0].level && exposes(v.z - 1)) this.bindPlane(this.planes[1], v, v.z - 2);
    };
    Sprite_DepthRoot.prototype.bindPlane = function(plane, v, z) {
        const W = World(), L = Levels();
        if (!L.isLevel(z) || !W.inWorld(v.x, v.y, z)) return;
        const t0 = performance.now();
        const map = W.peekArea(v.x, v.y, z);
        stats.peeks++;
        stats.lastPeekMs = performance.now() - t0;
        if (!map || !map.data) return;
        plane.bind({ x: v.x, y: v.y, z }, map);
        plane.visible = true;
    };
    Sprite_DepthRoot.prototype.update = function() {
        const W = World();
        const v = W && W.viewLevel ? W.viewLevel() : null;
        const z = v ? v.z : null;
        if (z !== this.viewZ || this.openStamp !== openStamp || this.maxDepth !== config.maxDepth) { this.maxDepth = config.maxDepth; this.rebuild(); }
        if (!config.enabled) { this._void.visible = false; for (const p of this.planes) p.visible = false; return; }
        this._void.visible = !!this.planes[0].level && !provoked("void_beyond");
        const viewOx = $gameMap.displayX() * $gameMap.tileWidth();
        const viewOy = $gameMap.displayY() * $gameMap.tileHeight();
        for (const p of this.planes) {
            if (!p.level) { p.visible = false; continue; }
            p.visible = true;
            p.updatePlane(viewOx, viewOy, config.depths[p.depth]);
        }
    };
    /** A level's tiles changed: repaint its plane. If the peek cache evicted the plane's build meanwhile (the change
     *  went into a newer build), read the level again first. Never per frame: a re-read can be a synchronous build. */
    Sprite_DepthRoot.prototype.refreshLevel = function(z) {
        const W = World();
        const v = W && W.viewLevel ? W.viewLevel() : null;
        for (const p of this.planes) {
            if (!p.level || (z !== undefined && p.level.z !== z)) continue;
            if (v && W.cachedBuild(p.level.x, p.level.y, p.level.z) !== p.map) this.bindPlane(p, v, p.level.z);
            p.refresh();
        }
    };

    // Which levels have an open cell (a full shape-grid scan, once per level per change; never per frame).
    let openStamp = 0;
    const openCache = new Map(); // "ax,ay,z" -> boolean, cleared on any shape change
    function hasOpenCells(v, z) {
        const key = `${v.x},${v.y},${z}`;
        if (openCache.has(key)) return openCache.get(key);
        const L = Levels();
        const grid = L && L.shapeGrid ? L.shapeGrid(z, v.x, v.y) : null;
        let has = false;
        if (grid) for (let i = 0; i < grid.length; i++) if (grid[i] === L.SHAPES.open) { has = true; break; }
        openCache.set(key, has);
        return has;
    }
    function shapesChanged() { openCache.clear(); openStamp++; }

    //-------------------------------------------------------------------------
    // Wiring into the map scene

    const rootOf = () => {
        const s = SceneManager._scene;
        return s instanceof Scene_Map && s._spriteset ? s._spriteset._ufDepth || null : null;
    };

    const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _Spriteset_Map_createCharacters.call(this);
        this._ufDepth = new Sprite_DepthRoot();
        this._tilemap.addChild(this._ufDepth);
    };
    const _Spriteset_Map_updateTilemap = Spriteset_Map.prototype.updateTilemap;
    Spriteset_Map.prototype.updateTilemap = function() {
        _Spriteset_Map_updateTilemap.call(this);
        if (this._ufDepth) this._ufDepth.update();
    };

    // F7 cycles the presets in play (a developer control) and logs the values to the console. (F9 is RMMZ debug, F6 is DEUS_NaturalConnections.)
    const HOTKEY = 118, HOTKEY_WAS = Input.keyMapper[HOTKEY];
    Input.keyMapper[HOTKEY] = "ufDepthPreset";
    const CYCLE = ["A", "B", "C", "D", "E", "off"];
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (this.isActive() && Input.isTriggered("ufDepthPreset")) {
            const next = CYCLE[(CYCLE.indexOf(config.preset) + 1) % CYCLE.length];
            Depth.preset(next);
            console.log(`[DEUS Depth] preset ${next}: ${Depth.describe()}`);
        }
    };

    function hookEvents() {
        const E = window.UF && UF.Events;
        if (!E || !E.on) return false;
        E.on("levels:shapeChanged", () => { shapesChanged(); const r = rootOf(); if (r) r.refreshLevel(); });
        E.on("levels:cellChanged", () => { shapesChanged(); const r = rootOf(); if (r) r.refreshLevel(); });
        E.on("world:levelTileChanged", lv => { const r = rootOf(); if (r) r.refreshLevel(lv && lv.z); });
        E.on("world:tileChanged", () => { const r = rootOf(); if (r) r.refreshLevel(0); });
        E.on("world:levelBuilt", () => { const r = rootOf(); if (r) r.rebuild(); });
        E.on("world:areaBuilt", () => { const r = rootOf(); if (r) r.rebuild(); });
        E.on("world:created", () => { shapesChanged(); });
        return true;
    }

    //-------------------------------------------------------------------------
    // The public object

    const Depth = {
        config,
        PRESETS,
        PAD,
        /** The projection origin on screen (the viewport centre by default). */
        center: () => ({ x: Graphics.width * config.origin.x, y: Graphics.height * config.origin.y }),
        /** Where an unprojected screen point lands at depth d: centre + (p - centre) * scale. */
        project(d, sx, sy) {
            const s = config.depths[d] ? config.depths[d].scale : 1, c = Depth.center();
            return { x: c.x + (sx - c.x) * s, y: c.y + (sy - c.y) * s };
        },
        /** The inward shift of the plane at the viewport edge for depth d, in px. */
        edgeShift: d => (1 - (config.depths[d] ? config.depths[d].scale : 1)) * Math.max(Graphics.width * config.origin.x, Graphics.height * config.origin.y),
        preset(name) {
            if (!applyPreset(name)) return false;
            const r = rootOf();
            if (r) r.rebuild();
            return true;
        },
        /** The camera-model scale of depth d for the current eye height. */
        cameraScale,
        /** Move the eye (feet above the viewed level) and re-derive the camera-model scales of the current preset. */
        setEyeHeight(ft) {
            config.camera.eyeHeightFt = Math.max(1, +ft || config.camera.eyeHeightFt);
            return applyPreset(config.preset);
        },
        setEnabled(on) { config.enabled = !!on; config._stamp++; const r = rootOf(); if (r) r.rebuild(); return config.enabled; },
        /** Call after editing config.depths / config.origin so the planes pick the change up on the next frame. */
        touch() { config._stamp++; },
        refresh() { const r = rootOf(); if (r) r.refreshLevel(); },
        rebuild() { const r = rootOf(); if (r) r.rebuild(); },
        root: rootOf,
        planes: () => { const r = rootOf(); return r ? r.planes.filter(p => p.visible && p.level) : []; },
        describe: () => `${config.maxDepth} level(s) below, eye ${config.camera.eyeHeightFt} ft, level ${config.camera.levelHeightFt} ft, void #${config.voidColor.toString(16).padStart(6, "0")}; ` + [1, 2].slice(0, Math.max(1, config.maxDepth)).map(d => { const c = config.depths[d]; return `depth ${d} scale ${c.scale} brightness ${c.brightness} saturation ${c.saturation} contrast ${c.contrast} blur ${c.blur}`; }).join("; ") + (config.enabled ? "" : " (off)"),
        stats() {
            const r = rootOf();
            return {
                enabled: config.enabled, preset: config.preset, maxDepth: config.maxDepth, camera: Object.assign({}, config.camera), view: r ? r.viewZ : null, origin: Object.assign({}, config.origin),
                voidVisible: !!(r && r._void && r._void.visible),
                rebuilds: stats.rebuilds, paints: stats.paints, lastPaintMs: stats.lastPaintMs, peeks: stats.peeks, lastPeekMs: stats.lastPeekMs,
                planes: r ? r.planes.map(p => ({
                    depth: p.depth, z: p.level ? p.level.z : null, visible: p.visible, scale: p.scale.x, x: p.x, y: p.y,
                    paints: p._tilemap ? p._tilemap.paints : 0, water: p._tilemap ? p._tilemap.hasWater() : false,
                    filters: (p.filters || []).map(f => f.constructor.name),
                    bitmap: p._tilemap ? { width: p._tilemap._lowerLayer.bitmap.width, height: p._tilemap._lowerLayer.bitmap.height } : null
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
    // Checks: suite "depth" (run on its own). Each check has a provocation UF_TEST_PROVOKE=depth.<check>.

    function registerChecks() {
        UF.Test.suite("depth", async t => {
            const W = World(), L = Levels();
            const scene = () => SceneManager._scene;
            const ok0 = !!W && !!L && L.view() === 0 && !!L.surfaceGrid() && Graphics.width === 816;
            t.check("preconditions", ok0, `world ${!!W}, levels ${!!L}, view ${L && L.view()}, surface grid ${!!(L && L.surfaceGrid())}, screen ${Graphics.width}x${Graphics.height}`);
            if (!ok0) return;
            const size = W.state.size;
            const area = W.viewLevel();
            const S = L.surfaceGrid(area.x, area.y);
            const sAt = (x, y) => (x < 0 || y < 0 || x >= size || y >= size ? -1 : S[y * size + x]);
            const COLS = 17, ROWS = 13;

            // 1. The proof window: the 17x13 view with the most balanced mix of +2 summit, +1 terrace and low ground.
            let best = null;
            for (let wy = 0; wy + ROWS <= size; wy += 2) {
                for (let wx = 0; wx + COLS <= size; wx += 2) {
                    let n0 = 0, n1 = 0, n2 = 0;
                    for (let y = wy; y < wy + ROWS; y++) for (let x = wx; x < wx + COLS; x++) { const s = S[y * size + x]; if (s === 0) n0++; else if (s === 1) n1++; else n2++; }
                    const score = Math.min(n0, n1, n2) * 1000 + n1 + n2;
                    if (!best || score > best.score) best = { wx, wy, n0, n1, n2, score };
                }
            }
            let synthetic = false;
            if (!best || Math.min(best.n0, best.n1, best.n2) === 0) {
                // No natural three-height window: raise a fixture hill on +1/+2 near the start (shapes only; the test world is discarded).
                synthetic = true;
                const sa = W.state.startArea || { x: area.x, y: area.y };
                const cx0 = Math.floor(size / 2) + 20, cy0 = Math.floor(size / 2) - 4;
                for (let y = -3; y <= 3; y++) for (let x = -5; x <= 5; x++) L.setShape({ area: sa, x: cx0 + x, y: cy0 + y, z: 1 }, "floor", { material: "soil" });
                for (let y = -1; y <= 1; y++) for (let x = -2; x <= 2; x++) { L.setShape({ area: sa, x: cx0 + x, y: cy0 + y, z: 1 }, "solid", { material: "stone" }); L.setShape({ area: sa, x: cx0 + x, y: cy0 + y, z: 2 }, "floor", { material: "stone" }); }
                best = { wx: cx0 - 8, wy: cy0 - 6, n0: 0, n1: 0, n2: 0, score: 0 };
            }
            const center = { x: best.wx + Math.floor(COLS / 2), y: best.wy + Math.floor(ROWS / 2) };
            const inWindow = (x, y) => x >= best.wx && x < best.wx + COLS && y >= best.wy && y < best.wy + ROWS;
            const shape1 = L.shapeGrid(1, area.x, area.y), shape2 = L.shapeGrid(2, area.x, area.y);
            const shAt = (g, x, y) => (g && x >= 0 && y >= 0 && x < size && y < size ? g[y * size + x] : 0);
            const OPEN = L.SHAPES.open, FLOOR = L.SHAPES.floor;

            // 2. Fixtures on +1: a hole in the terrace (seen from +2 through the open air above it) and a wooden deck over low ground.
            let hole = null, deck = [];
            for (let y = best.wy + 1; y < best.wy + ROWS - 1 && !hole; y++) for (let x = best.wx + 1; x < best.wx + COLS - 1 && !hole; x++) {
                if (shAt(shape1, x, y) !== FLOOR || shAt(shape2, x, y) !== OPEN) continue;
                if ([[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => shAt(shape1, x + a, y + b) === FLOOR)) hole = { x, y };
            }
            if (hole) L.setShape({ area, x: hole.x, y: hole.y, z: 1 }, "open");
            // The deck: from a +1 floor cell, up to three open cells in a row in any of the four directions (a bridge over low ground).
            for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                for (let y = best.wy + 1; y < best.wy + ROWS - 1 && deck.length < 3; y++) for (let x = best.wx + 1; x < best.wx + COLS - 1 && deck.length < 3; x++) {
                    if (shAt(shape1, x, y) !== FLOOR) continue;
                    const run = [];
                    for (let k = 1; k <= 3; k++) { const cx1 = x + ddx * k, cy1 = y + ddy * k; if (inWindow(cx1, cy1) && shAt(shape1, cx1, cy1) === OPEN && shAt(shape2, cx1, cy1) === OPEN) run.push({ x: cx1, y: cy1 }); else break; }
                    if (run.length > deck.length) deck = run;
                }
                if (deck.length === 3) break;
            }
            for (const c of deck) L.setShape({ area, x: c.x, y: c.y, z: 1 }, "floor", { constructed: true, material: "wood" });
            t.check("proof_scene", !!best && (synthetic || Math.min(best.n0, best.n1, best.n2) > 0) && !!hole && deck.length >= 2,
                `${synthetic ? "fixture hill" : "natural"} window at (${best.wx},${best.wy}): ground ${best.n0}, +1 ${best.n1}, +2 ${best.n2} cells; hole ${hole ? `(${hole.x},${hole.y})` : "none"}, deck ${deck.length ? `${deck.length} cells from (${deck[0].x},${deck[0].y})` : "none"}`);

            // Pixel comparisons need a still scene: no rain (DEUS_Environment's weather of the test area is seed-rolled).
            if (window.UF.Environment && UF.Environment.setWeather) UF.Environment.setWeather({ x: area.x, y: area.y }, "clear");
            if (window.$gameScreen) $gameScreen.changeWeather("none", 0, 0);
            const fs = require("fs"), pathMod = require("path");
            const outDir = pathMod.join((nw.__dirname) || process.cwd(), "test_output");
            const savePng = (name, bmp) => { const f = pathMod.join(outDir, `depth.${name}.png`); fs.writeFileSync(f, bmp.canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, ""), "base64"); UF.Test.write(`SHOT ${f}`); return f; };

            const goTo = async z => {
                const okSwitch = L.setView(z, { center });
                await t.waitUntil(() => !L.switching() && L.view() === z && scene() instanceof Scene_Map && scene().isStarted(), 30000, `the ${L.label(z)} view`);
                await t.waitFrames(8);
                return okSwitch;
            };
            const D = Depth;
            const applyAndSettle = async name => { D.preset(name); await t.waitFrames(3); };

            // 3. On +2 with the projection alone and both depths (the addendum's chain), to prove the mechanism; the
            //    shipped default (one level below, blurred, the void beyond: user direction 2026-09-24) is checked in section 11.
            config.maxDepth = 2;
            await goTo(2);
            await applyAndSettle("A");
            await t.waitFrames(40); // the weather fade
            const st = D.stats();
            const p1 = D.planes().find(p => p.depth === 1) || null, p2 = D.planes().find(p => p.depth === 2) || null;
            const imageData = bmp => bmp.context.getImageData(0, 0, bmp.width, bmp.height).data;
            const opaqueCount = bmp => { const d = imageData(bmp); let n = 0; for (let i = 3; i < d.length; i += 4 * 7) if (d[i] === 255) n++; return n; };
            const opq1 = p1 ? opaqueCount(p1._tilemap._lowerLayer.bitmap) : 0, opq2 = p2 ? opaqueCount(p2._tilemap._lowerLayer.bitmap) : 0;
            t.check("planes_present", st.view === 2 && !!p1 && p1.level.z === 1 && p1._tilemap.paints > 0 && opq1 > 0 && !!p2 && p2.level.z === 0 && p2._tilemap.paints > 0 && opq2 > 0,
                `view ${st.view}; depth 1 -> ${p1 ? `level ${p1.level.z}, ${p1._tilemap.paints} paint(s), ${opq1} opaque samples` : "none"}; depth 2 -> ${p2 ? `level ${p2.level.z}, ${p2._tilemap.paints} paint(s), ${opq2} opaque samples` : "none"}; last paint ${st.lastPaintMs.toFixed(1)} ms, last peek ${st.lastPeekMs.toFixed(1)} ms`);
            if (!p1 || !p2) return;
            // A repaint (every 48 px of scroll, every shape change, every 30 frames only while water is in the window) must stay well inside a frame.
            const paintMs = [st.lastPaintMs];
            for (let i = 0; i < 4; i++) { p1.refresh(); await t.waitFrames(1); paintMs.push(stats.lastPaintMs); }
            const worstPaint = Math.max(...paintMs);
            t.check("repaint_cost", worstPaint < 16, `repaints of one 1008x816 plane: ${paintMs.map(v => v.toFixed(1)).join(" / ")} ms (bound 16; this machine, nw.exe harness)`);

            // 4. The projection origin: the world point under the viewport centre stays there; the left edge moves in by (1 - s) * cx.
            const viewO = () => ({ x: $gameMap.displayX() * TW, y: $gameMap.displayY() * TH });
            const s1 = config.depths[1].scale, s2 = config.depths[2].scale;
            const cx = Graphics.width / 2, cy = Graphics.height / 2;
            const observed = (p, ux, uy) => { // where the plane draws the unprojected screen point (ux, uy)
                const u = p.unprojected(viewO().x, viewO().y);
                return p.toGlobal(new PIXI.Point(ux - u.x, uy - u.y));
            };
            const oc = observed(p1, cx, cy), oe = observed(p1, 0, cy);
            const originOk = Math.abs(oc.x - cx) <= 1 && Math.abs(oc.y - cy) <= 1 && Math.abs(oe.x - cx * (1 - s1)) <= 1;
            t.check("projection_origin", originOk, `centre -> (${oc.x.toFixed(1)},${oc.y.toFixed(1)}) want (${cx},${cy}); left edge -> x ${oe.x.toFixed(1)} want ${(cx * (1 - s1)).toFixed(1)} at scale ${s1}; origin ${JSON.stringify(config.origin)}`);

            // 5. The exposure mask is the viewed level's own geometry: a floor cell of +2 is untouched, an open cell shows a lower level.
            const cellScreen = (x, y) => ({ x: ($gameMap.adjustX(x) + 0.5) * TW, y: ($gameMap.adjustY(y) + 0.5) * TH });
            const onScreen = (x, y) => { const p = cellScreen(x, y); return p.x > 30 && p.x < Graphics.width - 30 && p.y > 60 && p.y < Graphics.height - 30; };
            const far = (x, y) => Math.abs(x - center.x) >= 3 || Math.abs(y - center.y) >= 2;
            let airOverTerrace = null, floorCell = null;
            for (let y = best.wy; y < best.wy + ROWS; y++) for (let x = best.wx; x < best.wx + COLS; x++) {
                if (!onScreen(x, y)) continue;
                if (!airOverTerrace && shAt(shape2, x, y) === OPEN && shAt(shape1, x, y) === FLOOR && far(x, y) && !(hole && hole.x === x && hole.y === y) && !deck.some(c => c.x === x && c.y === y)) airOverTerrace = { x, y };
                if (!floorCell && shAt(shape2, x, y) === FLOOR && far(x, y)) floorCell = { x, y };
            }
            const snapScreen = () => Bitmap.snap(scene());
            const pix = (bmp, x, y) => bmp.getPixel(Math.round(x), Math.round(y));
            const shotOn = snapScreen();
            D.setEnabled(false);
            await t.waitFrames(3);
            const shotOff = snapScreen();
            D.setEnabled(true);
            await applyAndSettle("A");
            const around = (bmp, p) => { const out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push(pix(bmp, p.x + dx * 4, p.y + dy * 4)); return out; };
            let floorSame = false, airDiffers = false, detail5 = "";
            if (floorCell) { const a = around(shotOn, cellScreen(floorCell.x, floorCell.y)), b = around(shotOff, cellScreen(floorCell.x, floorCell.y)); floorSame = a.every((c, i) => c === b[i]); detail5 += `floor cell (${floorCell.x},${floorCell.y}) ${floorSame ? "unchanged" : "CHANGED"} by the planes; `; }
            if (airOverTerrace) { const pp = D.project(1, cellScreen(airOverTerrace.x, airOverTerrace.y).x, cellScreen(airOverTerrace.x, airOverTerrace.y).y); const a = around(shotOn, pp), b = around(shotOff, pp); airDiffers = a.some((c, i) => c !== b[i]); detail5 += `open cell (${airOverTerrace.x},${airOverTerrace.y}) ${airDiffers ? "shows the level below" : "UNCHANGED (still sky)"}`; }
            t.check("exposure_by_upper_geometry", !!floorCell && !!airOverTerrace && floorSame && airDiffers, detail5 || "no floor or open cell in view");

            // 6. Mask order and the two-depth chain, from a render of the planes alone (no tint, no fog): through +2's open air
            //    a +1 terrace cell shows depth 1's own texel; the carved hole shows the ground (depth 2) through depth 1.
            const root = D.root();
            const planesOnly = () => { const b = Bitmap.snap(root); return b; };
            const texelOf = (p, gx, gy) => { // the plane's canvas colour under screen pixel (gx, gy)
                const s = p.scale.x, lx = Math.floor((gx + 0.5 - p.x) / s), ly = Math.floor((gy + 0.5 - p.y) / s);
                const lower = p._tilemap._lowerLayer.bitmap, upper = p._tilemap._upperLayer.bitmap;
                const up = upper.getAlphaPixel(lx, ly) > 0 ? upper.getPixel(lx, ly) : null;
                return { color: up || lower.getPixel(lx, ly), alpha: up ? 255 : lower.getAlphaPixel(lx, ly), lx, ly };
            };
            const neighbours = (p, gx, gy) => { const set = new Set(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const tx = texelOf(p, gx + dx, gy + dy); if (tx.alpha === 255) set.add(tx.color); } return set; };
            const render = planesOnly();
            savePng("planes_only_plus2", render);
            savePng("canvas_depth1", p1._tilemap._lowerLayer.bitmap);
            savePng("canvas_depth2", p2._tilemap._lowerLayer.bitmap);
            // The deck (a +1 floor over opaque low ground) is the strongest case: seen from +2 it must show depth 1's planks, never the ground under them.
            const deckCell = deck.find(c => onScreen(c.x, c.y)) || null;
            const maskCell = deckCell || airOverTerrace;
            let maskOk = false, detail6 = "";
            if (maskCell) {
                const pp = D.project(1, cellScreen(maskCell.x, maskCell.y).x, cellScreen(maskCell.x, maskCell.y).y);
                const gx = Math.round(pp.x), gy = Math.round(pp.y);
                const seen = render.getPixel(gx, gy), want1 = neighbours(p1, gx, gy), tx2 = texelOf(p2, gx, gy);
                maskOk = want1.has(seen);
                detail6 = `${deckCell ? "deck" : "terrace"} cell (${maskCell.x},${maskCell.y}) at screen (${gx},${gy}): drawn ${seen}, depth 1 texels {${[...want1].slice(0, 4).join(" ")}}, ground texel under it ${tx2.color}/${tx2.alpha}`;
            }
            t.check("mask_order", !!maskCell && maskOk, detail6 || "no deck or terrace cell under open air in view");
            // The two-depth chain: a low-ground cell (open on +2 and on +1) shows the ground's texel projected at depth 2, with depth 1 transparent there.
            let chainCell = null;
            for (let y = best.wy; y < best.wy + ROWS && !chainCell; y++) for (let x = best.wx; x < best.wx + COLS && !chainCell; x++) {
                if (onScreen(x, y) && far(x, y) && shAt(shape2, x, y) === OPEN && shAt(shape1, x, y) === OPEN && !deck.some(c => c.x === x && c.y === y)) chainCell = { x, y };
            }
            let chainOk = false, detail7 = "";
            if (chainCell) {
                const c = cellScreen(chainCell.x, chainCell.y);
                const pp = D.project(2, c.x, c.y);
                const gx = Math.round(pp.x), gy = Math.round(pp.y);
                const seen = render.getPixel(gx, gy), seenA = render.getAlphaPixel(gx, gy), want2 = neighbours(p2, gx, gy), tx1 = texelOf(p1, gx, gy), tx2 = texelOf(p2, gx, gy);
                chainOk = seenA === 255 && want2.has(seen) && tx1.alpha === 0;
                detail7 = `low ground (${chainCell.x},${chainCell.y}) at screen (${gx},${gy}): drawn ${seen}/${seenA}, ground texel ${tx2.color}/${tx2.alpha}, ground texels {${[...want2].slice(0, 4).join(" ")}}, depth 1 alpha there ${tx1.alpha}`;
            }
            // The carved hole is a visual fixture (in the screenshots); what the ground draws under a hill is reported, not judged here.
            if (hole) {
                const c = cellScreen(hole.x, hole.y), pp = D.project(2, c.x, c.y);
                const tx2 = texelOf(p2, Math.round(pp.x), Math.round(pp.y));
                const groundTiles = [0, 1, 2].map(l => W.getTile(area.x, area.y, hole.x, hole.y, l, 0));
                detail7 += `; under the hole (${hole.x},${hole.y}) the ground draws ${tx2.color}/${tx2.alpha} (tiles ${groundTiles.join("/")})${tx2.alpha === 0 ? ": the solid ground cell has no art (see AUDIT_LOG)" : ""}`;
            }
            t.check("depth2_through_depth1", !!chainCell && chainOk, detail7 || "no low-ground cell in view");

            // 7. Crisp: every opaque pixel of the planes' render is a colour of their source canvases (nearest sampling, no new colours).
            const colorsOf = bmp => { const d = imageData(bmp), set = new Set(); for (let i = 0; i < d.length; i += 4) if (d[i + 3] === 255) set.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); return set; };
            const palette = new Set();
            for (const p of [p1, p2]) for (const b of [p._tilemap._lowerLayer.bitmap, p._tilemap._upperLayer.bitmap]) for (const c of colorsOf(b)) palette.add(c);
            palette.add(config.voidColor); // the void shows where both planes are transparent; it is flat, not a blend
            const rd = imageData(render);
            let sampled = 0, foreign = 0, firstForeign = "";
            for (let y = 1; y < render.height; y += 3) for (let x = 1; x < render.width; x += 3) {
                const i = (y * render.width + x) * 4;
                if (rd[i + 3] !== 255) continue;
                sampled++;
                const c = (rd[i] << 16) | (rd[i + 1] << 8) | rd[i + 2];
                if (!palette.has(c)) { foreign++; if (!firstForeign) firstForeign = `#${c.toString(16).padStart(6, "0")} at (${x},${y})`; }
            }
            const bt = p1._lower.bitmap.baseTexture, st1 = p1._lower.texture && p1._lower.texture.baseTexture;
            t.check("crisp_nearest", sampled >= 1000 && foreign === 0, `${sampled} opaque samples, ${foreign} colour(s) not in the ${palette.size}-colour source set${firstForeign ? `, first ${firstForeign}` : ""}; smooth ${p1._lower.bitmap.smooth}, baseTexture scaleMode ${bt && bt.scaleMode} (0 nearest, 1 linear), sprite texture ${st1 === bt ? "is the bitmap's" : `scaleMode ${st1 && st1.scaleMode}`}`);

            // 8. Parallax: bounded at the edge, proportional to the scale when the camera moves, exact at the centre.
            const shift1 = D.edgeShift(1), shift2 = D.edgeShift(2);
            // A fixed world point (the low-ground cell's centre, in world px) is drawn where the projection says, before and after a pan.
            const worldPt = chainCell ? { x: (chainCell.x + 0.5) * TW, y: (chainCell.y + 0.5) * TH } : { x: (center.x + 3.5) * TW, y: (center.y + 0.5) * TH };
            const drawnAt = p => { const o = viewO(); return observed(p, worldPt.x - Math.ceil(o.x), worldPt.y - Math.ceil(o.y)); };
            const dx0 = $gameMap.displayX(), dy0 = $gameMap.displayY();
            const before1 = drawnAt(p1);
            $gameMap.scrollRight(2); // two tiles: the overseer's free camera keeps the display where the map puts it
            await t.waitFrames(3);
            const panned = ($gameMap.displayX() - dx0 + $gameMap.width()) % $gameMap.width();
            const after1 = drawnAt(p1);
            const moved = after1.x - before1.x, wantMove = -panned * TW * s1;
            const centreAfter = observed(p1, cx, cy);
            $gameMap.scrollLeft(2);
            await t.waitFrames(3);
            t.check("parallax_bounded", shift1 <= config.maxParallaxPx && shift2 <= config.maxParallaxPx && panned === 2 && Math.abs(moved - wantMove) <= 1.5 && Math.abs(centreAfter.x - cx) <= 1,
                `edge shift depth 1 ${shift1.toFixed(1)} px, depth 2 ${shift2.toFixed(1)} px (bound ${config.maxParallaxPx}); a pan of ${panned} tiles moved a low-ground point on depth 1 from x ${before1.x.toFixed(1)} to ${after1.x.toFixed(1)} (${moved.toFixed(1)} px, want ${wantMove.toFixed(1)}); the point under the centre stays at x ${centreAfter.x.toFixed(1)}; display back at ${$gameMap.displayX()} (was ${dx0})`);

            // 9. Tunables take effect on the next frame.
            const before = p1.scale.x;
            config.depths[1].scale = 0.90; D.touch();
            await t.waitFrames(2);
            const after = p1.scale.x;
            config.depths[1].scale = s1; D.touch();
            await t.waitFrames(2);
            t.check("tunables_take_effect", before === s1 && after === 0.90 && p1.scale.x === s1, `scale ${before} -> ${after} -> ${p1.scale.x}`);

            // 10. Each preset carries the filters it promises: A none, B a colour matrix, C colour matrix + blur, D blur only, E both.
            const filtersOf = async name => { await applyAndSettle(name); return (p1.filters || []).map(f => f.constructor.name); };
            const fA = await filtersOf("A"), fB = await filtersOf("B"), fC = await filtersOf("C"), fD = await filtersOf("D"), fE = await filtersOf("E");
            await applyAndSettle("A");
            t.check("preset_filters", fA.length === 0 && fB.join() === "ColorMatrixFilter" && fC.join() === "ColorMatrixFilter,BlurFilter" && fD.join() === "BlurFilter" && fE.join() === "ColorMatrixFilter,BlurFilter",
                `filters A [${fA}], B [${fB}], C [${fC}], D [${fD}], E [${fE}]`);

            // 11. The shipped default (user direction 2026-09-24): one level below, blurred; beyond it the void, never the sky.
            config.maxDepth = 1;
            await applyAndSettle("D");
            await t.waitFrames(3);
            const stD = D.stats();
            t.check("one_level_below", stD.preset === "D" && stD.maxDepth === 1 && stD.planes[0].visible && stD.planes[0].z === 1 && !stD.planes[1].visible && stD.voidVisible,
                `preset ${stD.preset}, maxDepth ${stD.maxDepth}: depth 1 ${stD.planes[0].visible ? `level ${stD.planes[0].z}` : "hidden"}, depth 2 ${stD.planes[1].visible ? "VISIBLE" : "hidden"}, void ${stD.voidVisible ? "shown" : "HIDDEN"}`);
            const renderD = planesOnly();
            const voidHex = `#${config.voidColor.toString(16).padStart(6, "0")}`;
            let voidOk = false, detailV = "";
            if (chainCell) {
                const c = cellScreen(chainCell.x, chainCell.y), gx = Math.round(c.x), gy = Math.round(c.y);
                const screenPx = Bitmap.snap(scene()).getPixel(gx, gy);
                const seen = renderD.getPixel(gx, gy), seenA = renderD.getAlphaPixel(gx, gy);
                voidOk = seen === voidHex && seenA === 255 && screenPx === voidHex;
                detailV = `low ground (${chainCell.x},${chainCell.y}) at screen (${gx},${gy}): planes render ${seen}/${seenA}, screen ${screenPx}, void ${voidHex}`;
            }
            t.check("void_beyond", !!chainCell && voidOk, detailV || "no low-ground cell in view");
            // The blur is real: with D the planes' render holds colours that are in no source canvas (blends), unlike A.
            const rdD = imageData(renderD);
            let sampledD = 0, blended = 0;
            for (let y = 1; y < renderD.height; y += 3) for (let x = 1; x < renderD.width; x += 3) {
                const i = (y * renderD.width + x) * 4;
                if (rdD[i + 3] !== 255) continue;
                sampledD++;
                if (!palette.has((rdD[i] << 16) | (rdD[i + 1] << 8) | rdD[i + 2])) blended++;
            }
            t.check("blur_by_default", PRESETS.D.depths[1].blur > 0 && fD.includes("BlurFilter") && blended > 500,
                `preset D blur ${PRESETS.D.depths[1].blur} px, filters [${fD}]; ${blended} of ${sampledD} sampled pixels are blends (want > 500)`);

            // 12. The screenshots at locked 1.00x. Two levels below at the camera-model zoom (user direction 2026-09-24): off, A at an eye
            //     height of 190 / 120 / 60 / 30 ft, B, C; then one level blurred (D); on +1: off, A (190 ft), D. The deck and hole are in the window.
            config.maxDepth = 2;
            const eye0 = config.camera.eyeHeightFt;
            const shots = [];
            const shot = async (label, name, eyeFt, maxDepth = 2) => {
                config.maxDepth = maxDepth;
                D.setEnabled(true); await applyAndSettle(name);
                if (eyeFt !== undefined) { D.setEyeHeight(eyeFt); await t.waitFrames(3); }
                shots.push(t.screenshot(label));
                D.setEyeHeight(eye0);
            };
            D.setEnabled(false); await t.waitFrames(3); shots.push(t.screenshot("plus2_off"));
            await shot("plus2_A_eye190", "A", 190);
            await shot("plus2_A_eye120", "A", 120);
            await shot("plus2_A_eye60", "A", 60);
            await shot("plus2_A_eye30", "A", 30);
            await shot("plus2_B", "B");
            await shot("plus2_C", "C");
            await shot("plus2_D_oneLevelBlur", "D", undefined, 1);
            config.maxDepth = 2;
            await applyAndSettle("A");
            await goTo(1);
            D.setEnabled(false); await t.waitFrames(3); shots.push(t.screenshot("plus1_off"));
            await shot("plus1_A_eye190", "A", 190);
            await shot("plus1_D_oneLevelBlur", "D", undefined, 1);
            config.maxDepth = 2;
            await applyAndSettle("A");
            const sizes = shots.map(f => (fs.existsSync(f) ? fs.statSync(f).size : 0));
            t.check("screenshots_written", shots.length === 11 && sizes.every(n => n > 10000), shots.map((f, i) => `${pathMod.basename(f)} ${sizes[i]} B`).join(", "));

            // 13. Back on the ground nothing is drawn (its holes are opaque art), and no errors.
            await goTo(0);
            const st0 = D.stats();
            t.check("ground_draws_nothing", st0.view === 0 && st0.planes.every(p => !p.visible) && !st0.voidVisible, `view ${st0.view}, visible planes ${st0.planes.filter(p => p.visible).length}, void ${st0.voidVisible ? "SHOWN" : "hidden"}`);
            // Each level switch makes a new spriteset: the old planes' canvases (4 x 3.3 MB) must have been destroyed with it.
            t.check("canvases_freed", stats.layersAlive === 4, `${stats.layersAlive} canvas layers alive after 3 level switches (want 4: two planes x two layers of the spriteset on screen)`);
            t.check("hotkey_free", HOTKEY_WAS === undefined && Input.keyMapper[HOTKEY] === "ufDepthPreset", `keyMapper[${HOTKEY}] was ${JSON.stringify(HOTKEY_WAS)} before the plugin took it`);
            t.check("no_errors", UF.Test.errors.length === 0, UF.Test.errors.length ? `${UF.Test.errors.length} error(s), first: ${UF.Test.errors[0]}` : "none");
        }, { isDefault: false });
    }
})();
