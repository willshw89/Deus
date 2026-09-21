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
    // Storage: per UF_World area in the world state, otherwise per map in $gameSystem

    const keyFor = mapId => {
        const area = window.UF && UF.World && UF.World.state ? UF.World.areaOfMapId(mapId) : null;
        if (!area) return `map:${mapId}`;
        return `area:${area.x},${area.y}`;
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

    function isOpaque(x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) return true;

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
                const x = Math.round(cx + cos * d);
                const y = Math.round(cy + sin * d);
                if (x < 0 || x >= width || y < 0 || y >= height) break;

                const dx = x - cx, dy = y - cy;
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
        observers() {
            const list = [];
            const W = window.UF && UF.World;

            // 1. Colonists / player units (Daylight 8-10 [9], Night 5-6 [5-6] via visionFactor 0.55)
            const seenUnits = new Set();
            if (window.$colonyManager && $colonyManager.colonists) {
                for (const c of $colonyManager.colonists) {
                    const ev = c.event;
                    if (ev) {
                        seenUnits.add(c.id || `${ev.x},${ev.y}`);
                        const r = colonistSightRadius(c);
                        const fixed = (c.data && (c.data.atWatchtower || c.data.job === "watchtower" || c.data.job === "scout")) ||
                                      (c.equipment && (c.equipment.tool === "torch" || c.equipment.held === "torch"));
                        list.push({ x: ev.x, y: ev.y, radius: r, type: "colonist", scaleWithDayNight: !fixed });
                    }
                }
            }
            if (W && W.state) {
                const pid = window.UF.Factions && typeof UF.Factions.playerId === "function" ? UF.Factions.playerId() : null;
                for (const u of W.units()) {
                    if (seenUnits.has(u.id) || seenUnits.has(`${u.x},${u.y}`)) continue;
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
                        list.push({ x: u.x, y: u.y, radius: r, type: "colonist", scaleWithDayNight: !fixed });
                    }
                }
            }
            if (list.length === 0 && window.$gamePlayer) {
                list.push({ x: $gamePlayer.x, y: $gamePlayer.y, radius: COLONIST_DAY_SIGHT, type: "colonist", scaleWithDayNight: true });
            }

            // 2. Campfires: 7-9 tiles (8 tiles) at night and day (fixed light source, scaleWithDayNight: false)
            const campfireCells = new Set();
            const historyFounders = W && W.state && W.state.history && W.state.history.founders;
            if (historyFounders) {
                for (const fid of Object.keys(historyFounders)) {
                    const f = historyFounders[fid];
                    if (f && f.camp && (fid === "player" || (window.UF && UF.Factions && fid === UF.Factions.playerId()))) {
                        campfireCells.add(`${f.camp.x},${f.camp.y}`);
                    }
                }
            }
            const households = window.UF && UF.Households && typeof UF.Households.list === "function" ? UF.Households.list() : [];
            for (const h of households) {
                if (h && h.hearth) campfireCells.add(`${h.hearth.x},${h.hearth.y}`);
            }
            if (campfireCells.size === 0) {
                const col = window.UF && UF.Colonists && typeof UF.Colonists.state === "function" ? UF.Colonists.state() : null;
                if (col && col.site) {
                    campfireCells.add(`${col.site.x},${col.site.y}`);
                }
            }
            for (const key of campfireCells) {
                const [cx, cy] = key.split(",").map(Number);
                list.push({ x: cx, y: cy, radius: CAMPFIRE_SIGHT, type: "campfire", scaleWithDayNight: false });
            }

            // 3. Permanent settlement / buildings: 8-12 tiles (10 tiles)
            if (window.UF && UF.Colonists) {
                const col = UF.Colonists.state && UF.Colonists.state();
                if (col && col.site) {
                    list.push({ x: col.site.x, y: col.site.y, radius: SETTLEMENT_SIGHT, type: "building", scaleWithDayNight: false });
                }
            }
            if (window.UF && UF.Outposts && typeof UF.Outposts.buildings === "function") {
                for (const b of UF.Outposts.buildings()) {
                    if (b && (b.stage === "complete" || b.stage === "walls")) {
                        const bx = b.x + Math.floor((b.w || 4) / 2);
                        const by = b.y + Math.floor((b.h || 4) / 2);
                        if (b.archetype === "watchtower") {
                            // 5. Lookout / watchtower: 15-25 tiles (20 tiles)
                            list.push({ x: bx, y: by, radius: WATCHTOWER_SIGHT, type: "watchtower", scaleWithDayNight: false });
                        } else {
                            list.push({ x: bx, y: by, radius: SETTLEMENT_SIGHT, type: "building", scaleWithDayNight: false });
                        }
                    }
                }
            }

            // 6. Registered custom sources
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

            // Active campfire & settlement observers
            const campObs = obs.find(o => o.type === "campfire");
            t.check("campfire_observer_active", !!campObs && campObs.radius >= 7 && campObs.radius <= 9,
                campObs ? `active campfire observer at (${campObs.x},${campObs.y}) r${campObs.radius}` : "no campfire observer found");
            const bldObs = obs.find(o => o.type === "building");
            t.check("settlement_observer_active", !!bldObs && bldObs.radius >= 8 && bldObs.radius <= 12,
                bldObs ? `active settlement observer at (${bldObs.x},${bldObs.y}) r${bldObs.radius}` : "no settlement observer found");

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
