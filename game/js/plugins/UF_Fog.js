//=============================================================================
// UF_Fog.js - Fog of war, explored by your faction's members
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Fog] Fog of war: unexplored cells are black; once your faction's members have seen a cell it stays clear for good.
 * @author UF project
 * @orderAfter UF_World
 * @orderAfter UF_ColonyOverseer
 *
 * @param Enabled
 * @text Fog enabled
 * @type boolean
 * @default false
 * @desc false (user decision 2026-09-18, for development): no fog at all, the whole map is visible. true: fog of war.
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
 * @default 0
 * @desc Darkness over explored cells nobody currently sees. 0 (user decision 2026-09-18): once discovered, a cell stays clear for good.
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
    const ENABLED = P.Enabled !== undefined && P.Enabled !== "" ? P.Enabled === "true" : true;
    const SIGHT = Math.max(1, Number(P.SightRadius || 8));
    const DIM = Math.max(0, Math.min(255, P.ExploredDim !== undefined && P.ExploredDim !== "" ? Number(P.ExploredDim) : 150));
    const UPDATE_FRAMES = 6;
    const FOG_RGB = [4, 8, 12];

    // Sight radii per user specification (2026-09-20):
    // Individual colonist at night: 5–6 tiles (6)
    // Individual colonist in daylight: 8–10 tiles (9)
    // Campfire at night: 7–9 tiles (8)
    // Torch: 4–6 tiles (5)
    // Permanent settlement/building: 8–12 tiles (10)
    // Lookout/watchtower: 15–25 tiles (20)
    const COLONIST_NIGHT_SIGHT = 6;
    const COLONIST_DAY_SIGHT = 9;
    const CAMPFIRE_SIGHT = 8;
    const TORCH_SIGHT = 5;
    const SETTLEMENT_SIGHT = 10;
    const WATCHTOWER_SIGHT = 20;

    const sources = [];
    const provocation = (() => {
        try {
            const argv = (typeof nw !== "undefined" && nw.App && nw.App.argv) || [];
            if (!argv.some(a => a === "--uf-test" || String(a).startsWith("--uf-test="))) return "";
            return String((typeof process !== "undefined" && process.env && process.env.UF_TEST_PROVOKE) || "");
        } catch (_) { return ""; }
    })();
    const provokes = name => provocation.split(",").map(s => s.trim()).includes(name) || provocation === "fog.all";

    let mapKey = null;   // which map the buffers belong to
    let explored = null; // Uint8Array(width * height): 1 = explored
    let visible = null;  // Uint8Array(width * height): 1 = seen right now
    let width = 0, height = 0;
    let dirty = true;    // the image needs redrawing
    let lastSignature = "";
    let frame = 0;

    //-------------------------------------------------------------------------
    // Storage: per UF_World area and level in the world state, otherwise per map and level in $gameSystem

    function currentZ() {
        const W = window.UF && UF.World;
        if (W && typeof W.viewLevel === "function") {
            const v = W.viewLevel();
            if (v && typeof v.z === "number") return v.z;
        }
        if (W && W.state && window.$gameMap && typeof W.levelOfMapId === "function") {
            const lv = W.levelOfMapId($gameMap.mapId());
            if (lv && typeof lv.z === "number") return lv.z;
        }
        const L = window.UF && UF.Levels;
        if (L && typeof L.view === "function") {
            const z = L.view();
            if (typeof z === "number") return z;
        }
        return 0;
    }

    const keyFor = mapId => {
        const W = window.UF && UF.World;
        if (W && W.state && typeof W.levelOfMapId === "function") {
            const lv = W.levelOfMapId(mapId);
            if (lv) return `area:${lv.x},${lv.y}:z${lv.z}`;
        }
        const z = currentZ();
        return `map:${mapId}:z${z}`;
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
        const z = currentZ();
        const s = store();
        // Load explored bitset for this Z level, falling back to legacy un-suffixed key for z=0 if present
        const raw = s[key] || (z === 0 ? s[`area:${$gameMap.mapId()}`] || s[key.replace(/:z0$/, "")] : null);
        explored = decode(raw, width * height);
        visible = new Uint8Array(width * height);
        lastSignature = "";
        dirty = true;
        return true;
    }

    function isOpaque(rawX, rawY) {
        if (!width || !height) return true;
        const x = ((rawX % width) + width) % width;
        const y = ((rawY % height) + height) % height;

        const W = window.UF && UF.World;
        const area = W && typeof W.viewLevel === "function" ? W.viewLevel() : null;
        const z = area ? area.z : 0;

        // 1. Objects: Walls, closed doors, boulders
        const O = window.UF && UF.Objects;
        if (O && typeof O.atIn === "function") {
            const obj = O.atIn(area, x, y);
            if (obj) {
                if (obj.autotile === "wall" ||
                    (Array.isArray(obj.tags) && obj.tags.includes("wall")) ||
                    (typeof obj.id === "string" && (obj.id.includes("wall") || obj.id === "granite_boulder" || obj.id === "cave_boulder"))) {
                    return true;
                }
                const isDoor = (Array.isArray(obj.tags) && obj.tags.includes("door")) ||
                               (window.UF && UF.Doors && typeof UF.Doors.isDoorType === "function" && UF.Doors.isDoorType(obj));
                if (isDoor) {
                    const isOpen = window.UF && UF.Doors && typeof UF.Doors.isOpen === "function" && UF.Doors.isOpen(area, x, y);
                    if (!isOpen) return true;
                }
            }
        }

        // 2. Underground solid rock
        if (z < 0) {
            const L = window.UF && UF.Levels;
            if (L && typeof L.shapeAt === "function") {
                const s = L.shapeAt({ area, x, y, z });
                if (s === "solid" || s === 1) return true;
            }
        }

        // 3. Peak mountain region
        if (z === 0) {
            const map = window.$dataMap;
            if (map && map.data) {
                const size = (W && W.state && W.state.size) || map.width || 256;
                const idx = y * size + x;
                if (map.data[5 * size * size + idx] === 250) return true;
            }
        }

        return false;
    }

    function mark(cx, cy, r) {
        if (cx < 0 || cy < 0 || cx >= width || cy >= height) return;
        const cIdx = cy * width + cx;
        visible[cIdx] = 1;
        explored[cIdx] = 1;
        if (r <= 0) return;

        const r2 = r * r;
        const steps = Math.max(120, Math.round(r * 16));
        const angleStep = (Math.PI * 2) / steps;

        for (let i = 0; i < steps; i++) {
            const angle = i * angleStep;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            let prevX = cx, prevY = cy;

            for (let d = 0.5; d <= r; d += 0.5) {
                const rx = Math.round(cx + cos * d);
                const ry = Math.round(cy + sin * d);
                const x = ((rx % width) + width) % width;
                const y = ((ry % height) + height) % height;

                const dx = rx - cx, dy = ry - cy;
                if (dx * dx + dy * dy > r2) break;

                if (x !== prevX || y !== prevY) {
                    // Check for diagonal pinch between two touching orthogonal walls
                    if (x !== prevX && y !== prevY) {
                        if (Fog.isOpaque(x, prevY) && Fog.isOpaque(prevX, y)) {
                            break;
                        }
                    }

                    const idx = y * width + x;
                    visible[idx] = 1;
                    explored[idx] = 1;

                    // Obstacle surface is visible, but blocks vision beyond
                    if (Fog.isOpaque(x, y)) {
                        break;
                    }

                    prevX = x;
                    prevY = y;
                }
            }
        }
    }

    function colonistSightRadius(u) {
        if (u) {
            const eq = u.equipment || {};
            if (eq.tool === "torch" || eq.held === "torch" || (u.data && u.data.tags && u.data.tags.includes("torch"))) {
                return TORCH_SIGHT;
            }
            if (u.data && (u.data.atWatchtower || u.data.job === "watchtower" || u.data.job === "scout")) {
                return WATCHTOWER_SIGHT;
            }
        }
        return COLONIST_DAY_SIGHT;
    }

    //-------------------------------------------------------------------------
    // Public object

    const Fog = {
        sightRadius: SIGHT,
        exploredDim: DIM,
        COLONIST_NIGHT_SIGHT,
        COLONIST_DAY_SIGHT,
        CAMPFIRE_SIGHT,
        TORCH_SIGHT,
        SETTLEMENT_SIGHT,
        WATCHTOWER_SIGHT,
        colonistSightRadius,
        isOpaque,
        mark,
        /** Add a function returning [{ x, y, radius }] for things that should reveal the fog. */
        addObserverSource(fn) {
            sources.push(fn);
        },
        currentZ,
        observers() {
            const list = [];
            const W = window.UF && UF.World;
            const viewZ = currentZ();
            const zOf = o => (o && o.z !== undefined ? o.z : (o && o.area && o.area.z !== undefined ? o.area.z : 0));

            // 1. Colonists / player units (Daylight 8-10 [9], Night 5-6 [5-6] via visionFactor 0.55)
            const seenUnits = new Set();
            if (window.$colonyManager && $colonyManager.colonists) {
                for (const c of $colonyManager.colonists) {
                    const u = c.unit;
                    const uZ = u ? zOf(u) : 0;
                    if (uZ !== viewZ) continue;
                    const ev = c.event;
                    if (ev) {
                        seenUnits.add(c.id || `${ev.x},${ev.y}`);
                        const r = colonistSightRadius(c);
                        const fixed = (c.data && (c.data.atWatchtower || c.data.job === "watchtower" || c.data.job === "scout")) ||
                                      (c.equipment && (c.equipment.tool === "torch" || c.equipment.held === "torch"));
                        list.push({ x: ev.x, y: ev.y, radius: r, type: "colonist", scaleWithDayNight: !fixed, z: uZ });
                    }
                }
            }
            if (W && W.state) {
                const pid = window.UF.Factions && typeof UF.Factions.playerId === "function" ? UF.Factions.playerId() : null;
                for (const u of W.units()) {
                    if (seenUnits.has(u.id) || seenUnits.has(`${u.x},${u.y}`)) continue;
                    const uZ = zOf(u);
                    if (uZ !== viewZ) continue;
                    const isPlayerCreature = u.data && (
                        u.data.faction === "player" ||
                        (pid !== null && u.data.faction === pid) ||
                        u.data.kind === "colonist"
                    );
                    if (isPlayerCreature && W.isDisplayed(u)) {
                        seenUnits.add(u.id);
                        const r = colonistSightRadius(u);
                        const fixed = (u.data && (u.data.atWatchtower || u.data.job === "watchtower" || u.data.job === "scout")) ||
                                      (u.equipment && (u.equipment.tool === "torch" || u.equipment.held === "torch"));
                        list.push({ x: u.x, y: u.y, radius: r, type: "colonist", scaleWithDayNight: !fixed, z: uZ });
                    }
                }
            }
            // Fallback player: only if no units exist in the world at all (e.g. minimal unit test) and player is on this Z level
            if (list.length === 0 && window.$gamePlayer && (!W || !W.state || Object.keys(W.state.units || {}).length === 0)) {
                const playerZ = typeof $gamePlayer.z === "number" ? $gamePlayer.z : (W && W.viewLevel() ? W.viewLevel().z : 0);
                if (playerZ === viewZ) {
                    list.push({ x: $gamePlayer.x, y: $gamePlayer.y, radius: COLONIST_DAY_SIGHT, type: "colonist", scaleWithDayNight: true, z: playerZ });
                }
            }

            // 2. Completed outpost buildings and defensive lookouts
            if (window.UF && UF.Outposts && typeof UF.Outposts.buildings === "function") {
                for (const b of UF.Outposts.buildings()) {
                    if (b && (b.stage === "complete" || b.stage === "walls")) {
                        const bZ = b.z !== undefined ? b.z : (b.area && b.area.z !== undefined ? b.area.z : 0);
                        if (bZ !== viewZ) continue;
                        const bx = b.x + Math.floor((b.w || 4) / 2);
                        const by = b.y + Math.floor((b.h || 4) / 2);
                        if (b.archetype === "watchtower") {
                            // 5. Lookout / watchtower: 15-25 tiles (20 tiles)
                            list.push({ x: bx, y: by, radius: WATCHTOWER_SIGHT, type: "watchtower", scaleWithDayNight: false, z: viewZ });
                        } else if (b.stage === "complete") {
                            list.push({ x: bx, y: by, radius: SETTLEMENT_SIGHT, type: "building", scaleWithDayNight: false, z: viewZ });
                        }
                    }
                }
            }

            // 3. Registered custom sources
            for (const fn of sources) {
                try {
                    for (const o of fn() || []) {
                        if (o && (o.z === undefined || o.z === viewZ)) {
                            list.push(o);
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            }
            return list;
        },
        isExplored(x, y, z = currentZ()) {
            if (z === currentZ()) {
                return ensureMap() && x >= 0 && y >= 0 && x < width && y < height && explored[y * width + x] === 1;
            }
            const W = window.UF && UF.World;
            const area = W && typeof W.viewLevel === "function" ? W.viewLevel() : null;
            const key = area ? `area:${area.x},${area.y}:z${z}` : `map:${$gameMap ? $gameMap.mapId() : 0}:z${z}`;
            const s = store();
            const raw = s[key] || (z === 0 ? s[key.replace(/:z0$/, "")] : null);
            if (!raw) return false;
            const w = width || ($gameMap ? $gameMap.width() : 256);
            const h = height || ($gameMap ? $gameMap.height() : 256);
            const dec = decode(raw, w * h);
            return x >= 0 && y >= 0 && x < w && y < h && dec[y * w + x] === 1;
        },
        isVisible(x, y, z = currentZ()) {
            if (z !== currentZ()) return false;
            return ensureMap() && x >= 0 && y >= 0 && x < width && y < height && visible[y * width + x] === 1;
        },
        /** Mark cells explored (not visible) around (x, y) on level z (default currentZ()). */
        reveal(x, y, radius = 0, z = currentZ()) {
            if (z === currentZ()) {
                if (!ensureMap()) return;
                const r2 = radius * radius;
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const cx = x + dx, cy = y + dy;
                        if (cx >= 0 && cy >= 0 && cx < width && cy < height && dx * dx + dy * dy <= r2) explored[cy * width + cx] = 1;
                    }
                }
                dirty = true;
                return;
            }
            const W = window.UF && UF.World;
            const area = W && typeof W.viewLevel === "function" ? W.viewLevel() : null;
            const key = area ? `area:${area.x},${area.y}:z${z}` : `map:${$gameMap ? $gameMap.mapId() : 0}:z${z}`;
            const s = store();
            const w = width || ($gameMap ? $gameMap.width() : 256);
            const h = height || ($gameMap ? $gameMap.height() : 256);
            const raw = s[key] || (z === 0 ? s[key.replace(/:z0$/, "")] : null);
            const exp = decode(raw, w * h);
            const r2 = radius * radius;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const cx = x + dx, cy = y + dy;
                    if (cx >= 0 && cy >= 0 && cx < w && cy < h && dx * dx + dy * dy <= r2) exp[cy * w + cx] = 1;
                }
            }
            s[key] = encode(exp);
        },
        exploredCount(z = currentZ()) {
            if (z === currentZ()) {
                if (!ensureMap()) return 0;
                let n = 0;
                for (let i = 0; i < explored.length; i++) n += explored[i];
                return n;
            }
            const W = window.UF && UF.World;
            const area = W && typeof W.viewLevel === "function" ? W.viewLevel() : null;
            const key = area ? `area:${area.x},${area.y}:z${z}` : `map:${$gameMap ? $gameMap.mapId() : 0}:z${z}`;
            const s = store();
            const raw = s[key] || (z === 0 ? s[key.replace(/:z0$/, "")] : null);
            if (!raw) return 0;
            const w = width || ($gameMap ? $gameMap.width() : 256);
            const h = height || ($gameMap ? $gameMap.height() : 256);
            const exp = decode(raw, w * h);
            let n = 0;
            for (let i = 0; i < exp.length; i++) n += exp[i];
            return n;
        },
        /** Recompute what the faction sees now. Runs every few frames by itself. */
        refresh() {
            if (!ensureMap()) return;
            const obs = this.observers();
            const signature = `${currentZ()}:` + obs.map(o => `${o.x},${o.y},${o.radius}`).join("|");
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
    Fog.enabled = ENABLED;
    if (!ENABLED) {
        // Development: no fog. Everything counts as explored and visible; reveal/refresh do nothing.
        Fog.isExplored = () => true;
        Fog.isVisible = () => true;
        Fog.reveal = () => {};
        Fog.refresh = () => {};
        Fog.exploredCount = () => (window.$gameMap ? $gameMap.width() * $gameMap.height() : 0);
    }

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
            if (currentZ() > 0) {
                this.visible = false;
                return;
            }
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
            const mapW = width * tw;
            const mapH = height * th;
            let ox = (-$gameMap.displayX() * tw) % mapW;
            if (ox > 0) ox -= mapW;
            let oy = (-$gameMap.displayY() * th) % mapH;
            if (oy > 0) oy -= mapH;
            this.x = ox;
            this.y = oy;

            if (!this._quadrants) this._quadrants = [];
            const screenW = (window.Graphics && Graphics.width) || 816;
            const screenH = (window.Graphics && Graphics.height) || 624;
            const repsX = Math.max(2, Math.ceil(screenW / mapW) + 1);
            const repsY = Math.max(2, Math.ceil(screenH / mapH) + 1);
            const needed = repsX * repsY;
            while (this._quadrants.length < needed - 1) {
                const s = new Sprite(this.bitmap);
                this._quadrants.push(s);
                this.addChild(s);
            }
            let qIdx = 0;
            for (let ry = 0; ry < repsY; ry++) {
                for (let rx = 0; rx < repsX; rx++) {
                    if (rx === 0 && ry === 0) continue;
                    const s = this._quadrants[qIdx++];
                    s.visible = true;
                    if (s.bitmap !== this.bitmap) s.bitmap = this.bitmap;
                    s.x = rx * width;
                    s.y = ry * height;
                }
            }
            while (qIdx < this._quadrants.length) {
                this._quadrants[qIdx++].visible = false;
            }

            if (dirty) {
                const context = this.bitmap.context;
                if (!this._fogImage || this._fogImage.width !== width || this._fogImage.height !== height) {
                    this._fogImage = context.createImageData(width, height);
                    this._fogData32 = new Uint32Array(this._fogImage.data.buffer);
                }
                const r = FOG_RGB[0], g = FOG_RGB[1], b = FOG_RGB[2];
                const cClear = (0 << 24) | (b << 16) | (g << 8) | r;
                const cDim = (DIM << 24) | (b << 16) | (g << 8) | r;
                const cDark = (255 << 24) | (b << 16) | (g << 8) | r;
                const d32 = this._fogData32;
                const len = width * height;
                for (let i = 0; i < len; i++) {
                    d32[i] = visible[i] ? cClear : (explored[i] ? cDim : cDark);
                }
                context.putImageData(this._fogImage, 0, 0);
                this.bitmap._baseTexture.update();
                dirty = false;
            }
        }
    }
    Fog.Sprite = Sprite_UFFog;

    const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _Spriteset_Map_createCharacters.call(this);
        if (!ENABLED) return;
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
            if (!ENABLED) {
                const sprite = SceneManager._scene._spriteset && SceneManager._scene._spriteset._ufFog;
                t.check("disabled_whole_map_visible", !sprite && Fog.isExplored(2, 2) && Fog.isVisible(250, 250) && Fog.exploredCount() === $gameMap.width() * $gameMap.height(),
                    `Enabled=false: ${sprite ? "a fog sprite exists" : "no fog sprite"}, corner explored ${Fog.isExplored(2, 2)}, ${Fog.exploredCount()} of ${$gameMap.width() * $gameMap.height()} cells explored`);
                return;
            }
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

            // User-specified radii validation
            const colDay = Fog.COLONIST_DAY_SIGHT;
            const colNight = Fog.COLONIST_NIGHT_SIGHT;
            const campR = Fog.CAMPFIRE_SIGHT;
            const torchR = Fog.TORCH_SIGHT;
            const setR = Fog.SETTLEMENT_SIGHT;
            const towerR = Fog.WATCHTOWER_SIGHT;
            t.check("sight_radii_specs",
                colNight >= 5 && colNight <= 6 &&
                colDay >= 8 && colDay <= 10 &&
                campR >= 7 && campR <= 9 &&
                torchR >= 4 && torchR <= 6 &&
                setR >= 8 && setR <= 12 &&
                towerR >= 15 && towerR <= 25,
                `Sight radii: colonistNight=${colNight} (5-6), colonistDay=${colDay} (8-10), campfire=${campR} (7-9), torch=${torchR} (4-6), settlement=${setR} (8-12), watchtower=${towerR} (15-25)`);

            // Observer source support check (campfire & settlement radii specs):
            const testSources = () => [
                { x: 50, y: 50, radius: Fog.CAMPFIRE_SIGHT, type: "campfire", scaleWithDayNight: false, z: 0 },
                { x: 60, y: 60, radius: Fog.SETTLEMENT_SIGHT, type: "building", scaleWithDayNight: false, z: 0 }
            ];
            Fog.addObserverSource(testSources);
            const allObs = Fog.observers();
            const campObs = allObs.find(o => o.type === "campfire" && o.x === 50 && o.y === 50);
            t.check("campfire_observer_active", !!campObs && campObs.radius >= 7 && campObs.radius <= 9,
                campObs ? `active campfire observer at (${campObs.x},${campObs.y}) r${campObs.radius}` : "no campfire observer found");
            const bldObs = allObs.find(o => o.type === "building" && o.x === 60 && o.y === 60);
            t.check("settlement_observer_active", !!bldObs && bldObs.radius >= 8 && bldObs.radius <= 12,
                bldObs ? `active settlement observer at (${bldObs.x},${bldObs.y}) r${bldObs.radius}` : "no settlement observer found");

            // Start area is NOT perma fog-of-war free:
            // No fake permanent static observers pinned to the starting coordinates
            const site = (window.UF && UF.Colonists && UF.Colonists.state && UF.Colonists.state() && UF.Colonists.state().site) || { x: 128, y: 128 };
            const fakeSiteObs = allObs.some(o => (o.type === "building" || o.type === "campfire") && o.x === site.x && o.y === site.y);
            t.check("start_area_not_perma_fog_free", !fakeSiteObs,
                `Start area has no permanent static observer: fakeSiteObs=${fakeSiteObs}`);

            // Line of Sight (LOS) occlusion assertion:
            const testWallX = 130, testWallY = 128;
            const savedIsOpaque = Fog.isOpaque;
            if (provokes("no_los")) {
                Fog.isOpaque = () => false;
            } else {
                Fog.isOpaque = (x, y) => (x === testWallX && y === testWallY);
            }
            visible.fill(0);
            mark(128, 128, 8);
            const wallSeen = visible[testWallY * width + testWallX] === 1;
            const behindWallSeen = visible[testWallY * width + (testWallX + 1)] === 1;
            const openGroundSeen = visible[testWallY * width + (testWallX - 1)] === 1;
            Fog.isOpaque = savedIsOpaque;
            Fog.refresh();
            t.check("los_blocks_behind_wall", wallSeen && !behindWallSeen && openGroundSeen,
                `LOS occlusion: wall face (${testWallX},${testWallY}) seen=${wallSeen}, behind wall (${testWallX + 1},${testWallY}) seen=${behindWallSeen} (want false), open ground (${testWallX - 1},${testWallY}) seen=${openGroundSeen}`);

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

            // Z-level clearance isolation:
            // Ground (z=0) observers must not clear fog on other Z levels (z=1 or z=-1)
            let upperExplored = Fog.exploredCount(1);
            let lowerExplored = Fog.exploredCount(-1);
            const groundExplored = Fog.exploredCount(0);
            if (provokes("z_leak")) {
                upperExplored = 999;
            }
            t.check("z_level_clearance_isolation", groundExplored > 0 && upperExplored === 0 && lowerExplored === 0,
                `Z-level clearance isolation: ground(z=0) explored=${groundExplored}, upper(z=1) explored=${upperExplored} (want 0), lower(z=-1) explored=${lowerExplored} (want 0)`);

            // Observers filtering isolation:
            // Register an observer source explicitly stationed at z=1, verify it does not appear when viewing ground (z=0)
            const testZ1Source = () => [{ x: 128, y: 128, radius: 6, z: 1 }];
            Fog.addObserverSource(testZ1Source);
            const currentObs = Fog.observers();
            const leakedObserver = currentObs.some(o => o.z !== undefined && o.z !== 0);
            t.check("z_observer_source_isolation", !leakedObserver,
                `Z-level observer isolation: Z=1 observer on ground view leaked=${leakedObserver}`);

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
