//=============================================================================
// UF_Fog.js - Fog of war, explored by your faction's members
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Fog] Fog of war: unexplored cells are black, explored cells nobody sees are dimmed. Your faction's members reveal it.
 * @author UF project
 * @orderAfter UF_World
 * @orderAfter UF_ColonyOverseer
 *
 * @param SightRadius
 * @text Sight radius (cells)
 * @type number
 * @min 1
 * @default 8
 * @desc How far each member of your faction sees, when it doesn't set its own.
 *
 * @param ExploredDim
 * @text Explored darkness
 * @type number
 * @min 0
 * @max 255
 * @default 150
 * @desc Darkness over explored cells nobody currently sees (0 = none, 255 = black).
 *
 * @help
 * Who explores: the colonists (UF_ColonyOverseer: Adam and Eve), UF_World
 * units whose data.faction is "player", and anything another plugin adds
 * with UF.Fog.addObserverSource(fn).
 *
 * The fog is a 1-pixel-per-cell image drawn inside the map's tilemap, so it
 * scrolls and zooms with the map (UF_Camera). Explored cells are saved per
 * area as a compact bitset (about 11 KB for 256x256).
 *
 * API and checks: docs/systems/UF_Fog.md
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const P = PluginManager.parameters("UF_Fog");
    const SIGHT = Math.max(1, Number(P.SightRadius || 8));
    const DIM = Math.max(0, Math.min(255, P.ExploredDim !== undefined && P.ExploredDim !== "" ? Number(P.ExploredDim) : 150));
    const UPDATE_FRAMES = 6;
    const FOG_RGB = [4, 8, 12];

    const sources = [];
    let mapKey = null;   // which map the buffers belong to
    let explored = null; // Uint8Array(width * height): 1 = explored
    let visible = null;  // Uint8Array(width * height): 1 = seen right now
    let width = 0, height = 0;
    let dirty = true;    // the image needs redrawing
    let lastSignature = "";
    let frame = 0;

    //-------------------------------------------------------------------------
    // Storage: per UF_World area in the world state, otherwise per map in $gameSystem

    const keyFor = mapId => {
        const area = window.UF && UF.World && UF.World.state ? UF.World.areaOfMapId(mapId) : null;
        if (!area) return `map:${mapId}`;
        return area.z ? `area:${area.x},${area.y},${area.z}` : `area:${area.x},${area.y}`; // each layer explored separately
    };
    const store = () => {
        if (window.UF && UF.World && UF.World.state) return (UF.World.state.fog = UF.World.state.fog || {});
        return ($gameSystem._ufFog = $gameSystem._ufFog || {});
    };

    function encode(bytes) {
        const bits = new Uint8Array(Math.ceil(bytes.length / 8));
        for (let i = 0; i < bytes.length; i++) if (bytes[i]) bits[i >> 3] |= 1 << (i & 7);
        let s = "";
        for (let i = 0; i < bits.length; i += 4096) s += String.fromCharCode.apply(null, bits.subarray(i, i + 4096));
        return btoa(s);
    }
    function decode(str, n) {
        const out = new Uint8Array(n);
        if (!str) return out;
        const s = atob(str);
        for (let i = 0; i < n; i++) if (s.charCodeAt(i >> 3) & (1 << (i & 7))) out[i] = 1;
        return out;
    }

    function flush() {
        if (mapKey && explored) store()[mapKey] = encode(explored);
    }

    function ensureMap() {
        if (!window.$gameMap || !$dataMap || $gameMap.mapId() <= 0) return false;
        const key = keyFor($gameMap.mapId());
        if (key === mapKey && explored && width === $gameMap.width() && height === $gameMap.height()) return true;
        flush();
        mapKey = key;
        width = $gameMap.width();
        height = $gameMap.height();
        explored = decode(store()[key], width * height);
        visible = new Uint8Array(width * height);
        lastSignature = "";
        dirty = true;
        return true;
    }

    function mark(cx, cy, r) {
        const r2 = r * r;
        for (let dy = -r; dy <= r; dy++) {
            const y = cy + dy;
            if (y < 0 || y >= height) continue;
            for (let dx = -r; dx <= r; dx++) {
                const x = cx + dx;
                if (x < 0 || x >= width || dx * dx + dy * dy > r2) continue;
                const i = y * width + x;
                visible[i] = 1;
                explored[i] = 1;
            }
        }
    }

    //-------------------------------------------------------------------------
    // Public object

    const Fog = {
        sightRadius: SIGHT,
        exploredDim: DIM,
        /** Add a function returning [{ x, y, radius }] for things that should reveal the fog. */
        addObserverSource(fn) {
            sources.push(fn);
        },
        observers() {
            const list = [];
            if (window.$colonyManager && $colonyManager.colonists) {
                for (const c of $colonyManager.colonists) {
                    const ev = c.event;
                    if (ev) list.push({ x: ev.x, y: ev.y, radius: c.visionRadius || SIGHT });
                }
            }
            if (window.UF && UF.World && UF.World.state) {
                for (const u of UF.World.units()) {
                    if (u.data && u.data.faction === "player" && UF.World.isDisplayed(u)) list.push({ x: u.x, y: u.y, radius: u.data.sight || SIGHT });
                }
            }
            for (const fn of sources) {
                try {
                    for (const o of fn() || []) list.push(o);
                } catch (e) {
                    console.error(e);
                }
            }
            return list;
        },
        isExplored: (x, y) => ensureMap() && x >= 0 && y >= 0 && x < width && y < height && explored[y * width + x] === 1,
        isVisible: (x, y) => ensureMap() && x >= 0 && y >= 0 && x < width && y < height && visible[y * width + x] === 1,
        /** Mark cells explored (not visible) around (x, y). */
        reveal(x, y, radius = 0) {
            if (!ensureMap()) return;
            const r2 = radius * radius;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const cx = x + dx, cy = y + dy;
                    if (cx >= 0 && cy >= 0 && cx < width && cy < height && dx * dx + dy * dy <= r2) explored[cy * width + cx] = 1;
                }
            }
            dirty = true;
        },
        exploredCount() {
            if (!ensureMap()) return 0;
            let n = 0;
            for (let i = 0; i < explored.length; i++) n += explored[i];
            return n;
        },
        /** Recompute what the faction sees now. Runs every few frames by itself. */
        refresh() {
            if (!ensureMap()) return;
            const obs = this.observers();
            const signature = obs.map(o => `${o.x},${o.y},${o.radius}`).join("|");
            if (signature === lastSignature) return;
            lastSignature = signature;
            visible.fill(0);
            for (const o of obs) mark(o.x, o.y, o.radius | 0);
            dirty = true;
        },
        encode,
        decode
    };
    window.UF = window.UF || {};
    window.UF.Fog = Fog;

    //-------------------------------------------------------------------------
    // Drawing: one pixel per cell, scaled up inside the tilemap (so it follows scrolling and zoom)

    class Sprite_UFFog extends Sprite {
        constructor() {
            super();
            // Above every character. UF_Perspective25D sets character z to their foot pixel row (plus up to
            // 1000), so the core's small z values (1-9) aren't enough.
            this.z = 1000000;
        }

        update() {
            super.update();
            if (!ensureMap()) {
                this.visible = false;
                return;
            }
            this.visible = true;
            if (!this.bitmap || this.bitmap.width !== width || this.bitmap.height !== height) {
                this.bitmap = new Bitmap(width, height);
                this.bitmap.smooth = true; // soft edges between cells
                dirty = true;
            }
            const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
            this.scale.set(tw, th);
            this.x = -$gameMap.displayX() * tw;
            this.y = -$gameMap.displayY() * th;
            if (dirty) {
                const context = this.bitmap.context;
                const image = context.createImageData(width, height);
                const d = image.data;
                for (let i = 0; i < width * height; i++) {
                    const j = i * 4;
                    d[j] = FOG_RGB[0];
                    d[j + 1] = FOG_RGB[1];
                    d[j + 2] = FOG_RGB[2];
                    d[j + 3] = visible[i] ? 0 : explored[i] ? DIM : 255;
                }
                context.putImageData(image, 0, 0);
                this.bitmap._baseTexture.update();
                dirty = false;
            }
        }
    }
    Fog.Sprite = Sprite_UFFog;

    const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _Spriteset_Map_createCharacters.call(this);
        this._ufFog = new Sprite_UFFog();
        this._tilemap.addChild(this._ufFog);
    };

    //-------------------------------------------------------------------------
    // Updating, saving, loading

    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);
        if (++frame % UPDATE_FRAMES === 0) Fog.refresh();
    };

    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        flush();
        return _DataManager_makeSaveContents.call(this);
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        mapKey = null; // reload from the loaded save
        explored = null;
    };

    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DataManager_createGameObjects.call(this);
        mapKey = null;
        explored = null;
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "fog"), registered at boot after all plugins load

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("fog", async t => {
            // Look at the start, where the colonists are.
            const obs = Fog.observers();
            if (obs.length) $gamePlayer.locate(obs[0].x, obs[0].y);
            Fog.refresh();
            await t.waitFrames(12);
            const sprite = SceneManager._scene._spriteset && SceneManager._scene._spriteset._ufFog;
            t.check("fog_layer", !!sprite && sprite.visible && !!sprite.bitmap && sprite.bitmap.width === $gameMap.width() && sprite.parent === SceneManager._scene._spriteset._tilemap,
                sprite && sprite.bitmap ? `fog image ${sprite.bitmap.width}x${sprite.bitmap.height} inside the tilemap` : "no fog sprite");
            t.check("observers", obs.length >= 2, `${obs.length} observers: ${obs.map(o => `(${o.x},${o.y}) r${o.radius}`).join(", ")}`);
            const seen = obs.filter(o => Fog.isVisible(o.x, o.y) && Fog.isExplored(o.x, o.y));
            t.check("colonists_reveal", obs.length > 0 && seen.length === obs.length, `${seen.length} of ${obs.length} observers stand in visible, explored cells`);
            const corner = { x: 2, y: 2 };
            const far = obs.every(o => Math.hypot(o.x - corner.x, o.y - corner.y) > o.radius);
            t.check("far_is_unexplored", far && !Fog.isExplored(corner.x, corner.y), `cell (${corner.x},${corner.y}) explored: ${Fog.isExplored(corner.x, corner.y)}`);

            // Image values: visible = clear, explored-but-unseen = dim, unexplored = black.
            const probe = { x: 20, y: 20 };
            Fog.reveal(probe.x, probe.y, 1);
            await t.waitFrames(3);
            const a = (x, y) => sprite.bitmap.getAlphaPixel(x, y);
            const o0 = obs[0] || { x: 0, y: 0 };
            t.check("fog_image_values", a(o0.x, o0.y) === 0 && a(probe.x, probe.y) === DIM && a(corner.x, corner.y) === 255,
                `alpha at a colonist ${a(o0.x, o0.y)} (want 0), at a revealed-but-unseen cell ${a(probe.x, probe.y)} (want ${DIM}), unexplored ${a(corner.x, corner.y)} (want 255)`);

            // Saving: compact and lossless.
            const before = Fog.exploredCount();
            const packed = encode(explored);
            const unpacked = decode(packed, width * height);
            let same = unpacked.length === explored.length;
            for (let i = 0; same && i < explored.length; i++) same = unpacked[i] === explored[i];
            t.check("save_roundtrip", same, `${before} explored cells; saved as ${packed.length} characters for ${width}x${height}`);

            // Follows the camera zoom and covers the whole screen at every level.
            const levels = window.UF.Camera ? UF.Camera.levels.length : 1;
            for (let i = 0; i < levels; i++) {
                if (UF.Camera) UF.Camera.setLevel(i);
                await t.waitFrames(8);
                const b = sprite.getBounds();
                const covers = b.x <= 0 && b.y <= 0 && b.x + b.width >= Graphics.width && b.y + b.height >= Graphics.height;
                const z = UF.Camera ? UF.Camera.zoom() : 1;
                t.check(`covers_screen_zoom_${i}`, covers && Math.abs(sprite.worldTransform.a - $gameMap.tileWidth() * z) < 1e-6,
                    `zoom ${z.toFixed(3)}: fog spans (${Math.round(b.x)},${Math.round(b.y)})-(${Math.round(b.x + b.width)},${Math.round(b.y + b.height)}), cell = ${sprite.worldTransform.a.toFixed(1)} px`);
                t.screenshot(`zoom_${i}`);
            }
            if (UF.Camera) UF.Camera.setLevel(1);
            await t.waitFrames(5);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during fog checks");
        });
    }
})();
