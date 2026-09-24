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
 * @desc deus (default): recession + fade/colour + light blur. deus_scale / deus_color: its steps. A: crisp zoom. B/C/D/E: earlier variants. off.
 * @type select
 * @option deus: recession + fade + light blur (default)
 * @value deus
 * @option deus_scale: recession only
 * @value deus_scale
 * @option deus_color: recession + fade/colour
 * @value deus_color
 * @option A: camera-model zoom, crisp
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
 * @default deus
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
 * @desc The camera's height above the viewed level; each level is 6 ft lower, scale = eye / (eye + 6 x depth). 140 gives 0.959 / 0.921, 190 gives 0.969 / 0.941.
 * @type number
 * @min 1
 * @default 140
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
 * sampling) from the lower level's cached build (UF.World.peekArea), plus the level's objects,
 * items, units, cliff faces and ground ramps as pooled sprites between its tile layers (standing
 * frames; nothing animates off the level on screen). The plane is scaled about the viewport
 * centre by the camera model (presets A/B/C; D/E draw one level at scale 1):
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

    const depthDefaults = (scale) => ({ scale, brightness: 1, saturation: 0, contrast: 0, blur: 0, alpha: 1 });
    // The DEUS depth treatment (owner direction "DEPTH COMPOSITING VISUAL TUNING", 2026-09-24, on the fc3b358 baseline):
    // three progressive cues on the whole plane (tiles and entities alike): a stronger recession (eye 140 ft: 0.959 /
    // 0.921), a fade done as brightness / contrast / saturation loss (never alpha: the void would show through), and a
    // very light blur. brightness and contrast are ColorMatrix multipliers; saturation is PIXI's saturate() amount,
    // where -0.10 is about 93 % and -0.22 about 85 %; blur is the BlurFilter strength in px. Tuning values, not rules.
    const DEUS_DEPTH = {
        1: { scale: "camera", brightness: 0.92, saturation: -0.10, contrast: -0.045, blur: 0.6, alpha: 1 },
        2: { scale: "camera", brightness: 0.82, saturation: -0.22, contrast: -0.10, blur: 1.2, alpha: 1 }
    };
    if (provoked("depth_transform_progressive")) DEUS_DEPTH[2] = Object.assign({}, DEUS_DEPTH[1]); // the provocation: depth 2 no stronger than depth 1
    const noBlur = d => Object.assign({}, d, { blur: 0 });
    const scaleOnly = d => Object.assign(depthDefaults(d.scale), {});
    // "camera": the scale comes from the camera model (config.camera): a pinhole eye at eyeHeightFt above the viewed
    // level sees a level d storeys (levelHeightFt each) lower at eye / (eye + d * levelHeight). User direction
    // 2026-09-24: "zoom them at the correct distance to simulate being 6 feet farther away". 190 ft gives 0.969 / 0.941,
    // the addendum's 0.97 / 0.94.
    const PRESETS = Object.freeze({
        off: { enabled: false },
        // deus (the default): the full treatment; deus_scale and deus_color are its comparison steps (the owner's B and C)
        deus: { enabled: true, eyeHeightFt: 140, depths: { 1: Object.assign({}, DEUS_DEPTH[1]), 2: Object.assign({}, DEUS_DEPTH[2]) } },
        deus_scale: { enabled: true, eyeHeightFt: 140, depths: { 1: scaleOnly(DEUS_DEPTH[1]), 2: scaleOnly(DEUS_DEPTH[2]) } },
        deus_color: { enabled: true, eyeHeightFt: 140, depths: { 1: noBlur(DEUS_DEPTH[1]), 2: noBlur(DEUS_DEPTH[2]) } },
        // A: two levels below, each at its camera-model scale about the viewport centre, crisp, no value change (the
        // fc3b358 baseline at 190 ft; A keeps whatever eye height is set)
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
        /** Diagnostic bound: the inward shift of a lower plane at the viewport edge, (1 - scale) * half the viewport, must stay under it
         *  (three quarters of a tile; the deus treatment's depth 2 sits at 32 px). */
        maxParallaxPx: 36,
        /** Levels whose open cells draw transparent, so the level below them can show: the surface levels (open_air). */
        exposes: z => z > 0,
        /** What of a lower level is drawn besides its tiles (user direction 2026-09-24: "all of the assets on the layers
         *  below too, like trees and creatures"): its objects, items, units, natural walls / cliff faces and ground ramps. */
        entities: { objects: true, items: true, units: true, walls: true },
        /** How often (frames) the lower levels' unit and item sets are re-read; positions of tracked units follow every frame. */
        entityRefreshFrames: 60,
        /** PIXI BlurFilter quality (passes per direction) for the planes' blur: 1 is the cheapest; 2 is smoother and about twice the cost. */
        blurQuality: 1,
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
        if (p.eyeHeightFt > 0) config.camera.eyeHeightFt = p.eyeHeightFt;
        if (p.depths) { config.depths[1] = resolveDepth(1, p.depths[1]); config.depths[2] = resolveDepth(2, p.depths[2]); }
        if (provoked("parallax_bounded")) config.depths[1].scale = 0.80; // the provocation survives every preset
        config._stamp++;
        return true;
    }
    applyPreset(PRESETS[params.Preset] ? params.Preset : "deus");
    if (params.EyeHeightFt !== undefined) { config.camera.eyeHeightFt = num(params.EyeHeightFt, config.camera.eyeHeightFt); applyPreset(config.preset); }
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
    // The entities of a lower level: its objects (the live object layer class, fed the lower level's build), items,
    // units, natural walls / cliff faces and ground connectors, as pooled sprites in the plane's own coordinate frame,
    // sorted by foot position like the map on screen. Frames are the sheets' standing frames (nothing animates off
    // the level on screen, V50), read with the same sidecar rules as UF_Objects / UF_Anim.

    const FACING4 = { 2: "S", 4: "W", 6: "E", 8: "N" };
    const FACING8 = ["", "SW", "S", "SE", "W", "", "E", "NW", "N", "NE"]; // by numpad direction (dir8)
    const ENTITY_MARGIN = 3, ENTITY_TALL = 6; // cells beyond the view (UF_Objects' MARGIN / TALLEST_CELLS)
    const sidecarOf = name => (window.UF && UF.Sidecars && name ? UF.Sidecars.get(name) : null);
    // Shared sheets are sampled linearly by MZ's Bitmap (smooth = true); inside a scaled plane that would soften them.
    // Nearest sampling is identical at 1:1, so forcing it on the shared texture changes nothing on the map on screen.
    function forceNearest(bmp) {
        if (!bmp) return;
        if (bmp.smooth) bmp.smooth = false;
        const bt = bmp.baseTexture;
        // PIXI 5.3: the style reaches an already uploaded GL texture only through setStyle (it bumps dirtyStyleId)
        if (bt && typeof bt.setStyle === "function" && bt.scaleMode !== PIXI.SCALE_MODES.NEAREST) bt.setStyle(PIXI.SCALE_MODES.NEAREST, bt.mipmap);
        else if (bt && typeof bt.setStyle === "function" && bt.dirtyStyleId === 0) bt.setStyle(PIXI.SCALE_MODES.NEAREST, bt.mipmap);
    }
    const tintOf = c => (typeof c === "string" && /^#?[0-9a-f]{6}$/i.test(c) ? parseInt(c.replace("#", ""), 16) : (typeof c === "number" ? c : 0xffffff));

    /** The standing frame of a unit's charset: { bitmap, sx, sy, w, h, ax, ay }, or null while the sheet loads. */
    function unitFrame(image, dir, dir8) {
        const name = image && image.characterName;
        if (!name) return null;
        const bmp = ImageManager.loadCharacter(name);
        if (!bmp.isReady() || !bmp.width) return null;
        const big = ImageManager.isBigCharacter(name), sc = sidecarOf(name);
        let fw = big ? Math.floor(bmp.width / 3) : Math.floor(bmp.width / 12);
        let fh = big ? Math.floor(bmp.height / 4) : Math.floor(bmp.height / 8);
        if (sc && sc.frameWidth > 0 && sc.frameHeight > 0) { fw = sc.frameWidth; fh = sc.frameHeight; }
        const d4 = FACING4[dir] ? dir : 2;
        let row = (d4 - 2) / 2;
        if (sc && Array.isArray(sc.facings)) { // an 8-direction sheet names its rows (CHARSET_8D_STANDARD)
            const j8 = FACING8[dir8] ? sc.facings.indexOf(FACING8[dir8]) : -1, j4 = sc.facings.indexOf(FACING4[d4]);
            row = j8 >= 0 ? j8 : (j4 >= 0 ? j4 : row);
        }
        let col = 1; // RPG Maker's standing pattern
        if (sc && sc.animations && Array.isArray(sc.animations.stand) && sc.animations.stand.length) col = sc.animations.stand[0] | 0;
        let blockX = 0, blockY = 0;
        if (!big) { const index = image.characterIndex | 0; blockX = (index % 4) * 3; blockY = Math.floor(index / 4) * 4; }
        if ((blockX + col + 1) * fw > bmp.width) col = 0;
        const anchor = sc && Array.isArray(sc.anchor) && sc.anchor.length === 2 ? [sc.anchor[0] / fw, sc.anchor[1] / fh] : [0.5, 1];
        return { bitmap: bmp, sx: (blockX + col) * fw, sy: (blockY + row) * fh, w: fw, h: fh, ax: anchor[0], ay: anchor[1] };
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
        const L = Levels(), sheets = L && L.composedSheets ? L.composedSheets() : null, src = sheets && sheets.B;
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
        // The level's entities sit between its tile layers, in unprojected screen coordinates shifted by the canvas origin.
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
        this._entityWindow = "";
        this.addChild(this._lower);
        this.addChild(this._entities);
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
        this.clearEntities();
    };
    Sprite_DepthPlane.prototype.refresh = function() { this._tilemap.refresh(); this._entityDirty = true; if (this._objectLayer) this._objectLayer.markDirty(false); };
    Sprite_DepthPlane.prototype.clearEntities = function() {
        for (const m of [this._units, this._items, this._walls]) { for (const s of m.values()) this.releaseSprite(s); m.clear(); }
        if (this._objectLayer) this._objectLayer._hideAll();
        this._entityDirty = true;
        this._entityWindow = "";
    };
    Sprite_DepthPlane.prototype.takeSprite = function() {
        let s = this._pool.pop();
        if (!s) { s = new Sprite(); s.anchor.set(0.5, 1); this._entities.addChild(s); }
        s.visible = false;
        return s;
    };
    Sprite_DepthPlane.prototype.releaseSprite = function(s) { s.visible = false; s.bitmap = null; s._ufRef = null; this._pool.push(s); };
    /** The cells of the level in and around the view (the same window the live layers use). */
    Sprite_DepthPlane.prototype.entityWindow = function() {
        const dx = Math.floor($gameMap.displayX()), dy = Math.floor($gameMap.displayY());
        const cols = Math.ceil($gameMap.screenTileX()), rows = Math.ceil($gameMap.screenTileY());
        return { dx, dy, cols, rows, x0: dx - ENTITY_MARGIN, y0: dy - ENTITY_MARGIN - ENTITY_TALL, x1: dx + cols + ENTITY_MARGIN, y1: dy + rows + ENTITY_MARGIN };
    };
    Sprite_DepthPlane.prototype.updateEntities = function() {
        if (!this.level || !this.map || provoked("entities_drawn")) return; // the provocation: no entities at all
        const W = World(), L = Levels(), win = this.entityWindow();
        const key = `${win.dx},${win.dy}`;
        this._entityFrame++;
        const periodic = this._entityFrame % Math.max(1, config.entityRefreshFrames | 0) === 0;
        if (this._entityDirty || this._entityWindow !== key || periodic) {
            this._entityWindow = key;
            this._entityDirty = false;
            this.rebuildUnits(W, win);
            this.rebuildItems(win);
            this.rebuildWalls(L, win);
        }
        if (this._objectLayer) this._objectLayer.update();
        this.placeEntities();
        // Foot-position order, as the tilemap on screen sorts its children.
        this._entities.children.sort((a, b) => ((a.z || 0) - (b.z || 0)) || ((a.spriteId || 0) - (b.spriteId || 0)));
    };
    const inWindow = (win, x, y) => x >= win.x0 && x <= win.x1 && y >= win.y0 && y <= win.y1; // maps loop, but the view never spans the seam twice
    const wrapCell = (v, size) => ((v % size) + size) % size;
    Sprite_DepthPlane.prototype.rebuildUnits = function(W, win) {
        const keep = new Set();
        if (config.entities.units && W && W.unitsInArea) {
            const size = W.state.size;
            for (const u of W.unitsInArea(this.level.x, this.level.y, this.level.z)) {
                if (!u || (u.data && (u.data.dead || u.data.hidden))) continue;
                // the window may cross the loop seam: test the unit's cell against the window modulo the area size
                const rx = wrapCell(u.x - win.x0, size) + win.x0, ry = wrapCell(u.y - win.y0, size) + win.y0;
                if (!inWindow(win, rx, ry)) continue;
                keep.add(u.id);
                let s = this._units.get(u.id);
                if (!s) { s = this.takeSprite(); this._units.set(u.id, s); }
                s._ufRef = u;
                s._ufKind = "unit";
                s._ufFrameOk = false;
            }
        }
        for (const [id, s] of this._units) if (!keep.has(id)) { this.releaseSprite(s); this._units.delete(id); }
    };
    Sprite_DepthPlane.prototype.rebuildItems = function(win) {
        const I = window.UF && UF.Items, keep = new Set();
        if (config.entities.items && I && I.find) {
            const near = { x: win.dx + win.cols / 2, y: win.dy + win.rows / 2 }, radius = Math.hypot(win.cols / 2 + ENTITY_MARGIN, win.rows / 2 + ENTITY_MARGIN + ENTITY_TALL);
            for (const f of I.find({ area: { x: this.level.x, y: this.level.y, z: this.level.z }, near, radius })) {
                const it = f.item;
                if (!it || it.holder || it.container) continue;
                keep.add(it.id);
                let s = this._items.get(it.id);
                if (!s) { s = this.takeSprite(); this._items.set(it.id, s); }
                s._ufRef = it;
                s._ufKind = "item";
                s._ufFrameOk = false;
            }
        }
        for (const [id, s] of this._items) if (!keep.has(id)) { this.releaseSprite(s); this._items.delete(id); }
    };
    Sprite_DepthPlane.prototype.rebuildWalls = function(L, win) {
        const keep = new Set();
        if (config.entities.walls && L && L.naturalWallCells) {
            const area = { x: this.level.x, y: this.level.y }, z = this.level.z;
            for (const c of L.naturalWallCells(area, z, win.x0, win.y0, win.x1, win.y1)) {
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
            if (z === 0 && L.groundConnectorCells) {
                for (const c of L.groundConnectorCells(area, win.x0, win.y0, win.x1, win.y1)) {
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
        }
        for (const [k, s] of this._walls) if (!keep.has(k)) { this.releaseSprite(s); this._walls.delete(k); }
    };
    Sprite_DepthPlane.prototype.placeEntities = function() {
        const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
        const foot = (x, y) => ({ x: Math.round(($gameMap.adjustX(x) + 0.5) * tw), y: Math.round(($gameMap.adjustY(y) + 1) * th) });
        for (const s of this._units.values()) {
            const u = s._ufRef;
            if (!s._ufFrameOk) {
                const f = unitFrame(u.image, u.dir, u.dir8);
                if (!f) { s.visible = false; continue; }
                forceNearest(f.bitmap);
                if (s.bitmap !== f.bitmap) s.bitmap = f.bitmap;
                s.setFrame(f.sx, f.sy, f.w, f.h);
                s.anchor.set(f.ax, f.ay);
                s.tint = tintOf(u.data && u.data.tint);
                s._ufFrameOk = true;
            }
            const p = foot(u.x, u.y);
            s.x = p.x; s.y = p.y; s.z = p.y; s.visible = true;
        }
        for (const s of this._items.values()) {
            const it = s._ufRef;
            if (!s._ufFrameOk) {
                const f = itemFrame(it);
                if (!f) { s.visible = false; continue; }
                forceNearest(f.bitmap);
                if (s.bitmap !== f.bitmap) s.bitmap = f.bitmap;
                s.setFrame(f.sx, f.sy, f.w, f.h);
                s.anchor.set(f.ax, f.ay);
                s.tint = f.tint;
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
        // Entities are placed in unprojected screen coordinates; the canvas origin is the plane's local origin.
        this._entities.x = -u.x;
        this._entities.y = -u.y;
        this.updateEntities();
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
            const q = Math.max(1, Math.min(4, config.blurQuality | 0));
            const b = this._blurFilter || (this._blurFilter = new PIXI.filters.BlurFilter(cfg.blur, q, 1, 5));
            b.blur = cfg.blur;
            b.quality = q;
            filters.push(b);
        }
        this.filters = filters.length ? filters : null;
        this.alpha = cfg.alpha === undefined ? 1 : Math.max(0, Math.min(1, +cfg.alpha)); // 1 by default: a fade is done in colour, not alpha
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
    /** A level's objects, items or units changed: its plane re-reads its entities on the next frame. */
    Sprite_DepthRoot.prototype.dirtyEntities = function(z) {
        for (const p of this.planes) if (p.level && (z === undefined || p.level.z === z)) { p._entityDirty = true; if (p._objectLayer) p._objectLayer.markDirty(false); }
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
    const CYCLE = ["deus", "deus_scale", "deus_color", "A", "B", "C", "D", "E", "off"];
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
        // The lower levels' entities: objects (per level or the ground), items (any), units entering/leaving a level.
        E.on("objects:levelChanged", lv => { const r = rootOf(); if (r) r.dirtyEntities(lv && lv.z); });
        E.on("objects:changed", () => { const r = rootOf(); if (r) r.dirtyEntities(0); });
        E.on("items:changed", () => { const r = rootOf(); if (r) r.dirtyEntities(); });
        E.on("world:unitLevelChanged", () => { const r = rootOf(); if (r) r.dirtyEntities(); });
        E.on("world:unitAdded", () => { const r = rootOf(); if (r) r.dirtyEntities(); });
        E.on("world:unitRemoved", () => { const r = rootOf(); if (r) r.dirtyEntities(); });
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
                    entities: p.entityCounts(),
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
            D.setEyeHeight(190); // the geometry checks run on the fc3b358 baseline (A at 190 ft); the tuning is checked in section 11b
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

            // 3b. Entities of the level below (user direction 2026-09-24): an oak, an item stack and a unit on the +1 terrace, in view.
            const fx = [];
            for (let y = best.wy + 3; y < best.wy + ROWS - 2 && fx.length < 3; y++) for (let x = best.wx + 2; x < best.wx + COLS - 2 && fx.length < 3; x += 3) {
                if (shAt(shape1, x, y) !== FLOOR || shAt(shape2, x, y) !== OPEN) continue;
                if ((hole && hole.x === x && hole.y === y) || deck.some(c => c.x === x && c.y === y)) continue;
                if (fx.some(c => Math.abs(c.x - x) < 3 && Math.abs(c.y - y) < 3)) continue;
                fx.push({ x, y });
            }
            const lv1 = { x: area.x, y: area.y, z: 1 };
            const O = window.UF.Objects, I = window.UF.Items;
            const treeType = O && O.types ? (O.types().find(tt => tt.image && Array.isArray(tt.tags) && tt.tags.includes("tree")) || O.types().find(tt => tt.image)) : null;
            const treeOk = fx[0] && treeType ? O.setIn(lv1, fx[0].x, fx[0].y, treeType.id) : false;
            const itemTypeId = ["stone", "oak_log", "log", "wood", "berries", "rations", "stone_axe", "gold_coin", "common_clothes", "pouch", "shovel", "waterskin"].find(id => I && I.type && I.type(id) && I.type(id).image) || null;
            const itemMade = fx[1] && itemTypeId ? I.create(itemTypeId, 3, { area: lv1, x: fx[1].x, y: fx[1].y }) : null;
            const unitMade = fx[2] ? W.addUnit({ name: "TEST_depth_unit", image: { characterName: "People1", characterIndex: 0 }, area: { x: area.x, y: area.y }, x: fx[2].x, y: fx[2].y, z: 1, dir: 2, snapToFree: true, data: { kind: "test" } }) : null;
            if (unitMade) fx[2] = { x: unitMade.x, y: unitMade.y }; // it may have snapped to the nearest free cell
            await t.waitFrames(6);

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
            // The tile checks compare against tile texels, so the entities are switched off for their render (they are
            // checked on their own in 6b); the render with entities is dumped too.
            const ENTITIES_OFF = { objects: false, items: false, units: false, walls: false };
            const entitiesOn = Object.assign({}, config.entities);
            const setEntities = async on => { Object.assign(config.entities, on ? entitiesOn : ENTITIES_OFF); D.refresh(); await t.waitFrames(3); };
            savePng("planes_only_plus2", planesOnly());
            await setEntities(false);
            const render = planesOnly();
            savePng("planes_only_plus2_tiles", render);
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
            // The cell must have ground art under it: kinds the live Outside_A2 sheet does not paint are transparent (AUDIT_LOG A9).
            let chainCell = null, chainCandidates = 0;
            for (let y = best.wy; y < best.wy + ROWS && !chainCell; y++) for (let x = best.wx; x < best.wx + COLS && !chainCell; x++) {
                if (!(onScreen(x, y) && far(x, y) && shAt(shape2, x, y) === OPEN && shAt(shape1, x, y) === OPEN && !deck.some(c => c.x === x && c.y === y))) continue;
                chainCandidates++;
                const c = cellScreen(x, y), pp = D.project(2, c.x, c.y);
                if (texelOf(p2, Math.round(pp.x), Math.round(pp.y)).alpha === 255) chainCell = { x, y };
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
            t.check("depth2_through_depth1", !!chainCell && chainOk, detail7 || `no low-ground cell with painted ground in view (${chainCandidates} open cells over transparent ground kinds: AUDIT_LOG A9)`);
            await setEntities(true);

            // 6b. The level below shows its entities: counts on the +1 plane, and the unit's body pixels change when units are switched off.
            const ec = p1.entityCounts();
            let unitDrawn = false, detailE = "";
            if (unitMade && fx[2]) {
                const c = cellScreen(fx[2].x, fx[2].y), pp = D.project(1, c.x, c.y + 4); // the body, above the foot at the cell's bottom
                const gx = Math.round(pp.x), gy = Math.round(pp.y);
                const probe = bmp => { const out = []; for (let dy = -2; dy <= 2; dy += 2) for (let dx = -2; dx <= 2; dx += 2) out.push(bmp.getPixel(gx + dx, gy + dy)); return out; };
                const onPx = probe(planesOnly());
                config.entities.units = false; D.refresh(); await t.waitFrames(3);
                const offPx = probe(planesOnly());
                config.entities.units = true; D.refresh(); await t.waitFrames(3);
                unitDrawn = onPx.some((v, i) => v !== offPx[i]);
                detailE = `unit at (${fx[2].x},${fx[2].y}) probed at screen (${gx},${gy}): ${unitDrawn ? "drawn" : "NOT drawn"} (${onPx[4]} vs ${offPx[4]} without units)`;
            }
            t.check("entities_drawn", treeOk && !!itemMade && !!unitMade && ec.objects >= 1 && ec.units >= 1 && ec.items >= 1 && ec.walls >= 1 && unitDrawn,
                `fixtures: oak ${treeOk ? "placed" : "NOT placed"} at ${fx[0] ? `(${fx[0].x},${fx[0].y})` : "-"}, item ${itemMade ? `${itemTypeId} x3` : "NOT made"} at ${fx[1] ? `(${fx[1].x},${fx[1].y})` : "-"}, unit ${unitMade ? "added" : "NOT added"}; +1 plane draws ${ec.objects} object(s), ${ec.units} unit(s), ${ec.items} item stack(s), ${ec.walls} wall/ramp frame(s); ${detailE}`);

            // 7. Crisp: every opaque pixel of the planes' render (tiles only: the entity sheets have their own palettes) is a
            //    colour of the source canvases (nearest sampling, no new colours).
            const colorsOf = bmp => { const d = imageData(bmp), set = new Set(); for (let i = 0; i < d.length; i += 4) if (d[i + 3] === 255) set.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); return set; };
            const palette = new Set();
            for (const p of [p1, p2]) for (const b of [p._tilemap._lowerLayer.bitmap, p._tilemap._upperLayer.bitmap]) for (const c of colorsOf(b)) palette.add(c);
            palette.add(config.voidColor); // the void shows where both planes are transparent; it is flat, not a blend
            await setEntities(false);
            const renderTiles = planesOnly();
            await setEntities(true);
            const rd = imageData(renderTiles);
            let sampled = 0, foreign = 0, firstForeign = "";
            for (let y = 1; y < renderTiles.height; y += 3) for (let x = 1; x < renderTiles.width; x += 3) {
                const i = (y * renderTiles.width + x) * 4;
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
            await setEntities(false); // the void and the blur are judged on the tiles; an entity could stand on the probed cell
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
            await setEntities(true);

            // 11b. The depth treatment (owner direction "DEPTH COMPOSITING VISUAL TUNING"): progressive recession, fade in colour, light blur,
            //      applied to whole planes so tiles and entities share one depth; the active level untouched; no physical effect.
            config.maxDepth = 2;
            await applyAndSettle("deus");
            const d1 = config.depths[1], d2 = config.depths[2];
            const mainTm = scene()._spriteset._tilemap;
            const names = p => (p.filters || []).map(f => f.constructor.name);
            const progressive = d1.scale < 1 && d2.scale < d1.scale && d1.brightness < 1 && d2.brightness < d1.brightness && d1.saturation < 0 && d2.saturation < d1.saturation
                && d1.contrast < 0 && d2.contrast < d1.contrast && d1.blur > 0 && d2.blur > d1.blur && d1.alpha === 1 && d2.alpha === 1;
            const applied = Math.abs(p1.scale.x - d1.scale) < 1e-9 && Math.abs(p2.scale.x - d2.scale) < 1e-9 && names(p1).join() === "ColorMatrixFilter,BlurFilter" && names(p2).join() === "ColorMatrixFilter,BlurFilter";
            const activeUntouched = mainTm.scale.x === 1 && mainTm.scale.y === 1 && !mainTm.filters && mainTm.alpha === 1;
            t.check("depth_transform_progressive", progressive && applied && activeUntouched && D.edgeShift(2) <= config.maxParallaxPx,
                `eye ${config.camera.eyeHeightFt} ft: depth 1 scale ${d1.scale.toFixed(3)} brightness ${d1.brightness} saturation ${d1.saturation} contrast ${d1.contrast} blur ${d1.blur}; depth 2 scale ${d2.scale.toFixed(3)} brightness ${d2.brightness} saturation ${d2.saturation} contrast ${d2.contrast} blur ${d2.blur}; planes scaled ${p1.scale.x.toFixed(3)} / ${p2.scale.x.toFixed(3)}, filters [${names(p1)}] / [${names(p2)}]; active tilemap scale ${mainTm.scale.x}, filters ${mainTm.filters ? "SET" : "none"}; depth 2 edge shift ${D.edgeShift(2).toFixed(1)} px (bound ${config.maxParallaxPx})`);
            // Entities are children of the plane: same scale, no filters of their own; the colour treatment reaches the unit's pixels.
            const us = unitMade ? p1._units.get(unitMade.id) : null;
            let inheritOk = false, detailI = "no unit sprite";
            if (us && fx[2]) {
                const c = cellScreen(fx[2].x, fx[2].y), pp = D.project(1, c.x, c.y + 4);
                const gx = Math.round(pp.x), gy = Math.round(pp.y);
                const bodyUnder = async name => { await applyAndSettle(name); return planesOnly().getPixel(gx, gy); };
                const bodyScale = await bodyUnder("deus_scale"), bodyColor = await bodyUnder("deus_color");
                await applyAndSettle("deus");
                const chain = us.parent === p1._entities && us.parent.parent === p1;
                inheritOk = chain && us.visible && Math.abs(us.worldTransform.a - p1.scale.x) < 1e-6 && !us.filters && bodyScale !== bodyColor;
                detailI = `unit sprite in the +1 plane: ${chain ? "child of the plane" : "NOT a child of the plane"}, world scale ${us.worldTransform.a.toFixed(3)} vs plane ${p1.scale.x.toFixed(3)}, own filters ${us.filters ? "SET" : "none"}; body pixel ${bodyScale} under deus_scale, ${bodyColor} under deus_color`;
            }
            t.check("entities_inherit_treatment", inheritOk, detailI);
            // Switching the blur off leaves no BlurFilter; switching the colour off leaves no filter and the baseline colour.
            config.depths[1].blur = 0; config.depths[2].blur = 0; D.touch(); await t.waitFrames(2);
            const noBlurNames = names(p1).concat(names(p2));
            t.check("blur_off_no_blur", !noBlurNames.includes("BlurFilter") && noBlurNames.includes("ColorMatrixFilter"), `filters with blur 0: [${names(p1)}] / [${names(p2)}]`);
            for (const d of [1, 2]) Object.assign(config.depths[d], { brightness: 1, saturation: 0, contrast: 0, blur: 0 });
            D.touch(); await setEntities(false);
            let baselineOk = false, detailB = "";
            if (airOverTerrace) {
                const c = cellScreen(airOverTerrace.x, airOverTerrace.y), pp = D.project(1, c.x, c.y);
                const gx = Math.round(pp.x), gy = Math.round(pp.y);
                const seen = planesOnly().getPixel(gx, gy), want = neighbours(p1, gx, gy);
                baselineOk = !p1.filters && !p2.filters && want.has(seen);
                detailB = `filters ${p1.filters ? "SET" : "none"}; terrace pixel ${seen}, source texels {${[...want].slice(0, 4).join(" ")}}`;
            }
            await setEntities(true);
            t.check("color_off_baseline", !!airOverTerrace && baselineOk, detailB || "no terrace cell");
            await applyAndSettle("deus");
            // Visual settings never touch the physical world.
            const physics = () => JSON.stringify({
                unit: unitMade ? { x: unitMade.x, y: unitMade.y, z: unitMade.z } : null,
                shapeUnit: fx[2] ? L.shapeAt({ area, x: fx[2].x, y: fx[2].y, z: 1 }) : null,
                shapeChain: chainCell ? L.shapeAt({ area, x: chainCell.x, y: chainCell.y, z: 2 }) : null,
                walkChain: chainCell ? W.walkable(area.x, area.y, chainCell.x, chainCell.y, { z: 2 }) : null,
                walkUnit: fx[2] ? W.walkable(area.x, area.y, fx[2].x, fx[2].y, { z: 1 }) : null,
                objects: fx[0] ? O.typeIdIn(lv1, fx[0].x, fx[0].y) : null
            });
            const phys0 = physics();
            for (const name of ["deus_scale", "deus_color", "A", "D", "deus"]) await applyAndSettle(name);
            D.setEyeHeight(60); await t.waitFrames(2); D.setEyeHeight(140); await t.waitFrames(2);
            const phys1 = physics();
            t.check("visual_settings_no_physics", phys0 === phys1 && phys0.length > 20, phys0 === phys1 ? `unchanged: ${phys0}` : `CHANGED: ${phys0} -> ${phys1}`);
            // The same preset resolves to the same values whatever came before.
            await applyAndSettle("deus");
            const cfgA = JSON.stringify({ depths: config.depths, eye: config.camera.eyeHeightFt, describe: D.describe() });
            await applyAndSettle("A"); D.setEyeHeight(60); await applyAndSettle("E"); await applyAndSettle("deus");
            const cfgB = JSON.stringify({ depths: config.depths, eye: config.camera.eyeHeightFt, describe: D.describe() });
            t.check("config_deterministic", cfgA === cfgB, cfgA === cfgB ? `deus resolves to the same values after A / 60 ft / E: ${D.describe()}` : `DIFFERS: ${cfgA} vs ${cfgB}`);
            // The cost of the treatment: wall time per frame with and without the filters (this machine, nw.exe harness).
            // Per frame: the engine's own tick duration (update + render submission, Graphics.FPSCounter) and the wall interval.
            // Medians, sampled in two interleaved rounds per condition, so a world-generation hitch or another process does not decide.
            const sampleFrames = async n => {
                const ticks = [], gaps = []; let last = performance.now();
                for (let i = 0; i < n; i++) { await t.waitFrames(1); const now = performance.now(); gaps.push(now - last); last = now; ticks.push(Graphics._fpsCounter ? Graphics._fpsCounter.duration : NaN); }
                const med = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
                return { tick: med(ticks), gap: med(gaps), worstTick: Math.max(...ticks.filter(Number.isFinite)) };
            };
            // Five conditions, two interleaved rounds each: planes off (the game alone), recession only (the compositing's own
            // cost), colour only, the full treatment at blur quality 1 and at quality 2. The bounds: the colour treatment
            // must cost under 4 ms, the shipped blur (quality 1) under one frame; the rest is reported.
            const conditions = {
                off: async () => { D.setEnabled(false); },
                deus_scale: async () => { D.setEnabled(true); await applyAndSettle("deus_scale"); },
                deus_color: async () => { D.setEnabled(true); await applyAndSettle("deus_color"); },
                deus_q1: async () => { D.setEnabled(true); config.blurQuality = 1; await applyAndSettle("deus"); },
                deus_q2: async () => { D.setEnabled(true); config.blurQuality = 2; await applyAndSettle("deus"); }
            };
            const cost = {};
            // The world simulation is paused while sampling, so the tick is the presentation alone (the editor stays open).
            const TS = window.UF.TimeSpeed, wasPaused = !!(TS && TS.isPaused && TS.isPaused());
            if (TS && TS.pause) TS.pause();
            for (let round = 0; round < 2; round++) for (const name of Object.keys(conditions)) { await conditions[name](); await t.waitFrames(10); (cost[name] = cost[name] || []).push(await sampleFrames(60)); }
            if (TS && TS.resume && !wasPaused) TS.resume();
            config.blurQuality = 1; D.setEnabled(true); await applyAndSettle("deus");
            const bestOf = name => cost[name].reduce((a, b) => (b.tick < a.tick ? b : a));
            const c = {}; for (const name of Object.keys(conditions)) c[name] = bestOf(name);
            const dColor = c.deus_color.tick - c.deus_scale.tick, dQ1 = c.deus_q1.tick - c.deus_scale.tick, dQ2 = c.deus_q2.tick - c.deus_scale.tick;
            // Which GL device drew this (a software renderer makes every full-screen pass cost tens of ms).
            let glName = "unknown";
            try { const gl = Graphics.app.renderer.gl, dbg = gl.getExtension("WEBGL_debug_renderer_info"); glName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER)); } catch (e) { glName = `unreadable (${e.message})`; }
            t.check("treatment_cost", dColor < 4 && dQ1 < 16.7,
                `GL renderer "${glName}"; median engine tick (update + render submit) over 2 x 60 frames: planes off ${c.off.tick.toFixed(1)} ms, recession only ${c.deus_scale.tick.toFixed(1)} ms (compositing itself +${(c.deus_scale.tick - c.off.tick).toFixed(1)}), colour +${dColor.toFixed(1)} ms (bound 4), blur quality 1 +${dQ1.toFixed(1)} ms (bound 16.7, the shipped setting), blur quality 2 +${dQ2.toFixed(1)} ms; median frame intervals ${Object.keys(c).map(k => `${k} ${c[k].gap.toFixed(0)}`).join(", ")} ms; this machine, nw.exe harness, simulation paused, RMMZ editor open`);

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
            // The tuning comparison (owner's A/B/C/D), same camera: the fc3b358 baseline, recession only, + fade/colour, + light blur.
            await shot("tune_A_baseline", "A", 190);
            await shot("tune_B_scale", "deus_scale");
            await shot("tune_C_scale_color", "deus_color");
            await shot("tune_D_full", "deus");
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
            await shot("plus1_tune_D_full", "deus");
            config.maxDepth = 2;
            await applyAndSettle("deus");
            const sizes = shots.map(f => (fs.existsSync(f) ? fs.statSync(f).size : 0));
            t.check("screenshots_written", shots.length === 16 && sizes.every(n => n > 10000), shots.map((f, i) => `${pathMod.basename(f)} ${sizes[i]} B`).join(", "));

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
