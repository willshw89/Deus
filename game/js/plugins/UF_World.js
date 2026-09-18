//=============================================================================
// UF_World.js - A world of 256x256 areas; units and the view travel between them
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF World] World made of 256x256 areas (one surface layer). Units and the view travel between areas; off-screen units keep moving.
 * @author UF project
 * @orderAfter UF_ProcGen
 *
 * @param AreasX
 * @text Areas across
 * @type number
 * @min 1
 * @default 1
 * @desc The world is one 256x256 area (user decision 2026-09-18). More areas still work: units and the view cross edges.
 *
 * @param AreasY
 * @text Areas down
 * @type number
 * @min 1
 * @default 1
 *
 * @param AreaSize
 * @text Area size (cells)
 * @type number
 * @min 16
 * @max 256
 * @default 256
 *
 * @param MapIdBase
 * @text First area map ID
 * @type number
 * @min 100
 * @default 1000
 * @desc Area map IDs are MapIdBase + ay * AreasX + ax. Must be above every map ID made in the editor.
 *
 * @param TilesetId
 * @type number
 * @default 2
 * @desc Tileset of area maps before a generator sets one (UF_Tiles sets its runtime tileset).
 *
 * @param GroundTileId
 * @text Ground tile ID
 * @type number
 * @default 2863
 * @desc Layer-0 tile for empty ground, before generators run.
 *
 * @param StartTemplateMapId
 * @text Start template map ID
 * @type number
 * @default 0
 * @desc Optional editor map overlaid on the middle of the start area. 0 = none: the start comes from the world catalog.
 *
 * @param StartInWorld
 * @type boolean
 * @default true
 * @desc New Game starts in the world's start area instead of the editor's start map.
 *
 * @param Seed
 * @type number
 * @default 0
 * @desc World seed. 0 = a new random seed every New Game.
 *
 * @param UnitStepFrames
 * @text Off-screen step frames
 * @type number
 * @min 1
 * @default 16
 * @desc Frames per cell for units in areas that aren't on screen (16 = RMMZ move speed 4).
 *
 * @help
 * The world is one 256x256 area (user decision 2026-09-18; AreasX/AreasY can
 * make it a grid again) on one surface layer (the underground layer was
 * removed the same day). Areas have no map files: each
 * one is built in memory when visited, from the world seed, the registered
 * generators, the start template and the area's saved tile and object
 * changes.
 *
 * Units live in a world registry, not on maps. Units in the area on screen
 * are drawn as ordinary events (event ID = 1000 + unit ID); units anywhere
 * else keep moving in a simplified simulation. Units and the view (the
 * player/cursor) cross area edges. Movement is 4-way (UF_Movement8D FourWay).
 *
 * Every area also has an object grid (one type number per cell, drawn and
 * simulated by UF_Objects) that generators fill and that is saved as diffs.
 *
 * API, events, save data and checks: docs/systems/UF_World.md
 * Architecture: docs/design/WORLD_ARCHITECTURE.md
 *
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const P = PluginManager.parameters("UF_World");
    const num = (key, fallback) => (P[key] !== undefined && P[key] !== "" ? Number(P[key]) : fallback);
    const CONFIG = Object.freeze({
        areasX: num("AreasX", 1),
        areasY: num("AreasY", 1),
        size: Math.min(256, num("AreaSize", 256)),
        mapIdBase: num("MapIdBase", 1000),
        tilesetId: num("TilesetId", 2),
        groundTileId: num("GroundTileId", 2863),
        templateMapId: num("StartTemplateMapId", 0),
        startInWorld: (P.StartInWorld || "true") === "true",
        seed: num("Seed", 0),
        unitStepFrames: Math.max(1, num("UnitStepFrames", 16))
    });
    const EVENT_BASE = 1000;
    const TEMPLATE_VAR = "$ufWorldTemplate";
    const STUCK_LIMIT = 300; // frames a unit on screen may fail to move before its goal is dropped

    //-------------------------------------------------------------------------
    // Helpers

    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    // Areas are { x, y }.
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
    const areaKey = (ax, ay) => `${ax},${ay}`;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    // 4-way movement (UF_Movement8D FourWay, VISION V3 revised 2026-09-18): units step along one axis at a time.
    const fourWay = () => !window.UF_Dir8 || UF_Dir8.fourWay !== false;
    // One step toward (ax, ay) remaining: both axes in 8-way, the longer axis in 4-way.
    const stepToward = (ax, ay) => {
        const dx = Math.sign(ax), dy = Math.sign(ay);
        if (!fourWay() || dx === 0 || dy === 0) return { dx, dy };
        return Math.abs(ax) >= Math.abs(ay) ? { dx, dy: 0 } : { dx: 0, dy };
    };

    // Facing with 4 facings (GUIDE_25D §3.5): NE→E, SE→S, SW→W, NW→N.
    const facing = (dx, dy) => {
        if (dx > 0) return dy > 0 ? 2 : 6;
        if (dx < 0) return dy < 0 ? 8 : 4;
        return dy > 0 ? 2 : 8;
    };

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
        return h >>> 0;
    }
    const hashString = s => {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
        return h;
    };
    function mulberry32(a) {
        return () => {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    const newConditions = () => ({
        actorId: 1, actorValid: false, itemId: 1, itemValid: false, selfSwitchCh: "A", selfSwitchValid: false,
        switch1Id: 1, switch1Valid: false, switch2Id: 1, switch2Valid: false, variableId: 1, variableValid: false, variableValue: 0
    });
    function makeEventData(id, spec) {
        const image = spec.image || {};
        return {
            id,
            name: spec.name || "",
            note: spec.note || "",
            x: spec.x,
            y: spec.y,
            pages: [{
                conditions: newConditions(),
                directionFix: !!spec.directionFix,
                image: {
                    characterName: image.characterName || "",
                    characterIndex: image.characterIndex || 0,
                    direction: image.direction || spec.dir || 2,
                    pattern: image.pattern !== undefined ? image.pattern : 1,
                    tileId: image.tileId || 0
                },
                list: [{ code: 0, indent: 0, parameters: [] }],
                moveFrequency: 3,
                moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false },
                moveSpeed: spec.moveSpeed || 4,
                moveType: 0,
                priorityType: spec.priorityType !== undefined ? spec.priorityType : 1,
                stepAnime: false,
                through: !!spec.through,
                trigger: 0,
                walkAnime: spec.walkAnime !== undefined ? spec.walkAnime : true
            }]
        };
    }

    //-------------------------------------------------------------------------
    // The public object

    const generators = [];
    const World = {
        config: CONFIG,
        EVENT_BASE,
        state: null,
        _frame: 0,
        hash32,
        mulberry32
    };
    window.UF = window.UF || {};
    window.UF.World = World;

    //-------------------------------------------------------------------------
    // World creation

    World.newWorld = function(seed) {
        const s = seed || CONFIG.seed || Math.floor(Math.random() * 0x7ffffffe) + 1;
        this.state = {
            version: 3,
            seed: s,
            areasX: CONFIG.areasX,
            areasY: CONFIG.areasY,
            size: CONFIG.size,
            startArea: { x: Math.floor(CONFIG.areasX / 2), y: Math.floor(CONFIG.areasY / 2) },
            units: {},
            nextUnitId: 1,
            diffs: {},
            objectDiffs: {}
        };
        buildCache.clear();
        this._convertTemplateUnits();
        emit("world:created", this.state);
        return this.state;
    };

    World.template = () => window[TEMPLATE_VAR] || null;

    World.templateOffset = function() {
        const tpl = this.template();
        const size = this.state ? this.state.size : CONFIG.size;
        if (!tpl) return { x: 0, y: 0 };
        return { x: Math.floor((size - tpl.width) / 2), y: Math.floor((size - tpl.height) / 2) };
    };

    // Template events tagged <ufUnit> become world units when a world is created.
    World._convertTemplateUnits = function() {
        const tpl = this.template();
        if (!tpl) return;
        const off = this.templateOffset();
        const start = this.state.startArea;
        for (const ev of tpl.events) {
            if (!ev || !ev.meta || !ev.meta.ufUnit) continue;
            const img = ev.pages[0].image;
            this.addUnit({
                name: ev.name,
                image: { characterName: img.characterName, characterIndex: img.characterIndex },
                area: { x: start.x, y: start.y },
                x: ev.x + off.x,
                y: ev.y + off.y,
                dir: img.direction || 2,
                data: { templateEventId: ev.id, note: ev.note }
            });
        }
    };

    //-------------------------------------------------------------------------
    // Areas

    const worldDims = () => (World.state ? World.state : CONFIG);

    World.inWorld = (ax, ay) => ax >= 0 && ay >= 0 && ax < worldDims().areasX && ay < worldDims().areasY;
    /** Map ID of an area: MapIdBase + ay * areasX + ax. */
    World.areaMapId = (ax, ay) => CONFIG.mapIdBase + ay * worldDims().areasX + ax;
    World.areaOfMapId = function(mapId) {
        const d = worldDims();
        const i = mapId - CONFIG.mapIdBase;
        if (!Number.isInteger(i) || i < 0 || i >= d.areasX * d.areasY) return null;
        return { x: i % d.areasX, y: Math.floor(i / d.areasX) };
    };
    World.isAreaMap = mapId => World.areaOfMapId(mapId) !== null;
    World.currentArea = () => (window.$gameMap && World.state ? World.areaOfMapId($gameMap.mapId()) : null);
    World.isStartArea = (ax, ay) => !!World.state && World.state.startArea.x === ax && World.state.startArea.y === ay;
    World.sameArea = sameArea;
    World.areaKey = areaKey;

    World.rngFor = function(ax, ay, salt = 0) {
        const s = typeof salt === "string" ? hashString(salt) : salt;
        return mulberry32(hash32(this.state.seed, ax, ay, s));
    };

    /**
     * Register an area generator. fn(ctx) runs for every area build, in order (low first).
     * ctx: { areaX, areaY, width, height, seed, rng, isStart, templateRect, center,
     *        setTile(x, y, layer, tileId), getTile(x, y, layer), index(x, y, layer),
     *        objects (Uint16Array), setObject(x, y, type), getObject(x, y),   (object types: UF_Objects)
     *        addEvent({ name, x, y, image, note, priorityType, through, directionFix, walkAnime }) -> event id }
     * Generators must be deterministic: use ctx.rng / UF.World.rngFor / hashes of coordinates only, never Math.random.
     */
    World.registerGenerator = function(name, fn, order = 100) {
        const i = generators.findIndex(g => g.name === name);
        if (i >= 0) generators.splice(i, 1);
        generators.push({ name, fn, order });
        generators.sort((a, b) => a.order - b.order);
    };
    World.generators = () => generators.map(g => g.name);
    World.unregisterGenerator = function(name) {
        const i = generators.findIndex(g => g.name === name);
        if (i >= 0) generators.splice(i, 1);
        return i >= 0;
    };

    /** True where the start template paints something: any tile on layers 0-3, or an event. */
    World.templatePaints = function(x, y) {
        const tpl = this.template();
        if (!tpl) return false;
        if (!this._templateMask || this._templateMask.source !== tpl) {
            const mask = new Uint8Array(tpl.width * tpl.height);
            for (let ty = 0; ty < tpl.height; ty++) {
                for (let tx = 0; tx < tpl.width; tx++) {
                    for (let layer = 0; layer < 4; layer++) {
                        if (tpl.data[(layer * tpl.height + ty) * tpl.width + tx]) mask[ty * tpl.width + tx] = 1;
                    }
                }
            }
            for (const e of tpl.events) if (e) mask[e.y * tpl.width + e.x] = 1;
            this._templateMask = { source: tpl, mask };
        }
        const off = this.templateOffset();
        const tx = x - off.x, ty = y - off.y;
        if (tx < 0 || ty < 0 || tx >= tpl.width || ty >= tpl.height) return false;
        return this._templateMask.mask[ty * tpl.width + tx] === 1;
    };

    /** Build an area's $dataMap object in memory. Pure: doesn't touch the current map. */
    World.buildArea = function(ax, ay) {
        const st = this.state;
        const size = st.size;
        const cells = size * size;
        const index = (x, y, layer) => (layer * size + y) * size + x;
        const data = new Array(cells * 6).fill(0);
        for (let i = 0; i < cells; i++) data[i] = CONFIG.groundTileId;

        const tpl = this.isStartArea(ax, ay) ? this.template() : null;
        const off = this.templateOffset();
        const templateRect = tpl ? { x: off.x, y: off.y, width: tpl.width, height: tpl.height } : null;
        const events = [null];
        // Map objects (plants, stones, buildings): one type number per cell, drawn and simulated by UF_Objects, not events.
        const objects = new Uint16Array(cells);
        let nextEventId = tpl ? tpl.events.length : 1; // keep template event IDs unchanged

        const map = {
            autoplayBgm: false, autoplayBgs: false, battleback1Name: "", battleback2Name: "",
            bgm: { name: "", pan: 0, pitch: 100, volume: 90 }, bgs: { name: "", pan: 0, pitch: 100, volume: 90 },
            disableDashing: false, displayName: "", encounterList: [], encounterStep: 30,
            width: size, height: size, note: "",
            parallaxLoopX: false, parallaxLoopY: false, parallaxName: "", parallaxShow: false, parallaxSx: 0, parallaxSy: 0,
            scrollType: 0, specifyBattleback: false, tilesetId: CONFIG.tilesetId,
            data, events, ufArea: { x: ax, y: ay }, ufObjects: objects
        };

        const ctx = {
            areaX: ax, areaY: ay, width: size, height: size, seed: st.seed,
            rng: this.rngFor(ax, ay), isStart: this.isStartArea(ax, ay), templateRect, index,
            map, // the $dataMap being built: generators may set map.note / map.displayName / map.tilesetId
            center: { x: Math.floor(size / 2), y: Math.floor(size / 2) },
            /** True where the template paints this cell (start area only). Generators should leave these alone. */
            isTemplateCell: (x, y) => !!tpl && World.templatePaints(x, y),
            setTile(x, y, layer, tileId) {
                if (x >= 0 && y >= 0 && x < size && y < size && layer >= 0 && layer < 6) data[index(x, y, layer)] = tileId;
            },
            getTile: (x, y, layer) => data[index(x, y, layer)],
            /** Object layer (UF_Objects): type number per cell, 0 = nothing. */
            objects,
            setObject(x, y, type) {
                if (x >= 0 && y >= 0 && x < size && y < size) objects[y * size + x] = type;
            },
            getObject: (x, y) => (x >= 0 && y >= 0 && x < size && y < size ? objects[y * size + x] : 0),
            addEvent(spec) {
                if (nextEventId >= EVENT_BASE) throw new Error(`UF_World: area (${ax},${ay}) has too many generated events (limit ${EVENT_BASE - 1})`);
                const id = nextEventId++;
                events[id] = makeEventData(id, spec);
                return id;
            }
        };
        for (const g of generators) g.fn(ctx);

        if (tpl) {
            // The template is an overlay: only cells it paints (any tile on layers 0-3) replace the generated ground.
            for (let y = 0; y < tpl.height; y++) {
                for (let x = 0; x < tpl.width; x++) {
                    let painted = false;
                    for (let layer = 0; layer < 4; layer++) {
                        if (tpl.data[(layer * tpl.height + y) * tpl.width + x]) painted = true;
                    }
                    if (!painted) continue;
                    for (let layer = 0; layer < 6; layer++) {
                        data[index(x + off.x, y + off.y, layer)] = tpl.data[(layer * tpl.height + y) * tpl.width + x];
                    }
                }
            }
            for (let i = 1; i < events.length; i++) {
                const e = events[i];
                if (e && this.templatePaints(e.x, e.y)) events[i] = null;
            }
            for (const e of tpl.events) {
                if (!e || (e.meta && e.meta.ufUnit)) continue;
                const copy = JSON.parse(JSON.stringify(e));
                copy.x += off.x;
                copy.y += off.y;
                events[copy.id] = copy;
            }
            map.note = tpl.note;
            map.displayName = tpl.displayName;
            for (const k of ["autoplayBgm", "autoplayBgs", "bgm", "bgs"]) map[k] = JSON.parse(JSON.stringify(tpl[k]));
        }

        const diff = st.diffs[areaKey(ax, ay)];
        if (diff) for (const i in diff) data[Number(i)] = diff[i];
        const odiff = st.objectDiffs && st.objectDiffs[areaKey(ax, ay)];
        if (odiff) for (const i in odiff) objects[Number(i)] = odiff[i];

        for (const u of this.unitsInArea(ax, ay)) events[EVENT_BASE + u.id] = unitEventData(u);
        return map;
    };

    /** Change a tile anywhere in the world. Recorded, so it survives leaving the area and saving. */
    World.setTile = function(ax, ay, x, y, layer, tileId) {
        const size = this.state.size;
        if (!this.inWorld(ax, ay) || x < 0 || y < 0 || x >= size || y >= size || layer < 0 || layer > 5) return false;
        const i = (layer * size + y) * size + x;
        const key = areaKey(ax, ay);
        (this.state.diffs[key] = this.state.diffs[key] || {})[i] = tileId;
        if (sameArea({ x: ax, y: ay }, this.currentArea()) && $dataMap && $dataMap.data) {
            $dataMap.data[i] = tileId;
            const scene = SceneManager._scene;
            if (scene instanceof Scene_Map && scene._spriteset) scene._spriteset._tilemap.refresh();
        }
        const cached = buildCache.get(cacheKey(ax, ay));
        if (cached) cached.data[i] = tileId;
        emit("world:tileChanged", { x: ax, y: ay }, x, y, layer, tileId);
        return true;
    };

    /** Read a tile. Off-screen areas come from the peek cache (built once, then reused). */
    World.getTile = function(ax, ay, x, y, layer) {
        const size = this.state.size;
        const i = (layer * size + y) * size + x;
        if (sameArea({ x: ax, y: ay }, this.currentArea()) && $dataMap && $dataMap.data) return $dataMap.data[i];
        const diff = this.state.diffs[areaKey(ax, ay)];
        if (diff && diff[i] !== undefined) return diff[i];
        return this.peekArea(ax, ay).data[i];
    };

    /** Change the object on a cell anywhere in the world (type number from UF_Objects, 0 = nothing). Recorded like tiles. */
    World.setObject = function(ax, ay, x, y, type) {
        const size = this.state.size;
        if (!this.inWorld(ax, ay) || x < 0 || y < 0 || x >= size || y >= size) return false;
        const i = y * size + x;
        const key = areaKey(ax, ay);
        const diffs = (this.state.objectDiffs = this.state.objectDiffs || {});
        (diffs[key] = diffs[key] || {})[i] = type | 0;
        if (sameArea({ x: ax, y: ay }, this.currentArea()) && $dataMap && $dataMap.ufObjects) $dataMap.ufObjects[i] = type | 0;
        const cached = buildCache.get(cacheKey(ax, ay));
        if (cached) cached.ufObjects[i] = type | 0;
        emit("world:objectChanged", { x: ax, y: ay }, x, y, type | 0);
        return true;
    };
    /** Object type number on a cell (0 = nothing). Off-screen areas come from the peek cache. */
    World.getObject = function(ax, ay, x, y) {
        const size = this.state.size;
        if (!this.inWorld(ax, ay) || x < 0 || y < 0 || x >= size || y >= size) return 0;
        const i = y * size + x;
        if (sameArea({ x: ax, y: ay }, this.currentArea()) && $dataMap && $dataMap.ufObjects) return $dataMap.ufObjects[i];
        return this.peekArea(ax, ay).ufObjects[i];
    };

    // Built areas kept for reading off-screen cells (AI, jobs, spawning) without rebuilding 256x256 every call.
    // setTile/setObject patch the cached copy. Its events are a snapshot from build time: don't read them.
    const buildCache = new Map();
    const PEEK_CACHE = 6;
    const cacheKey = (ax, ay) => (World.state ? `${World.state.seed}:${areaKey(ax, ay)}` : "");
    /** A cached build of an area (tiles and objects). Same object on repeated calls until it's evicted. */
    World.peekArea = function(ax, ay) {
        const key = cacheKey(ax, ay);
        let map = buildCache.get(key);
        if (!map) {
            map = this.buildArea(ax, ay);
            buildCache.set(key, map);
            while (buildCache.size > PEEK_CACHE) buildCache.delete(buildCache.keys().next().value);
        }
        return map;
    };
    World.clearPeekCache = () => buildCache.clear();

    //-------------------------------------------------------------------------
    // Units

    function unitEventData(u) {
        return makeEventData(EVENT_BASE + u.id, {
            name: u.name, note: `<ufUnit:${u.id}>`, x: u.x, y: u.y, dir: u.dir,
            image: { characterName: u.image.characterName, characterIndex: u.image.characterIndex, direction: u.dir },
            through: !!(u.data && u.data.through)
        });
    }

    function spawnUnitEvent(u) {
        if (!window.$dataMap || !window.$gameMap) return null;
        const eid = EVENT_BASE + u.id;
        if ($gameMap._events[eid]) return $gameMap._events[eid];
        const data = unitEventData(u);
        data.meta = { ufUnit: String(u.id) };
        $dataMap.events[eid] = data;
        const ev = new Game_Event($gameMap.mapId(), eid);
        ev.setDirection(u.dir || 2);
        $gameMap._events[eid] = ev;
        const scene = SceneManager._scene;
        if (scene instanceof Scene_Map && scene._spriteset) {
            const sprite = new Sprite_Character(ev);
            scene._spriteset._characterSprites.push(sprite);
            scene._spriteset._tilemap.addChild(sprite);
        }
        return ev;
    }

    function despawnUnitEvent(u) {
        if (!window.$gameMap) return;
        const eid = EVENT_BASE + u.id;
        const ev = $gameMap._events[eid];
        if (!ev) return;
        const scene = SceneManager._scene;
        if (scene instanceof Scene_Map && scene._spriteset) {
            const sprites = scene._spriteset._characterSprites;
            const i = sprites.findIndex(s => s._character === ev);
            if (i >= 0) {
                const sprite = sprites[i];
                if (sprite._shadowSprite && sprite._shadowSprite.parent) sprite._shadowSprite.parent.removeChild(sprite._shadowSprite);
                if (sprite.parent) sprite.parent.removeChild(sprite);
                sprites.splice(i, 1);
            }
        }
        delete $gameMap._events[eid];
        if ($dataMap && $dataMap.events) $dataMap.events[eid] = null;
    }

    /** Add a unit. spec: { name, image: { characterName, characterIndex }, area: { x, y }, x, y, dir, data } */
    World.addUnit = function(spec) {
        const st = this.state;
        const id = st.nextUnitId++;
        const image = spec.image || {};
        const u = {
            id,
            name: spec.name || `TEST_unit_${id}`,
            image: { characterName: image.characterName || "", characterIndex: image.characterIndex || 0 },
            area: { x: spec.area.x, y: spec.area.y },
            x: spec.x | 0,
            y: spec.y | 0,
            dir: spec.dir || 2,
            goal: null,
            stuckFrames: 0,
            data: spec.data || {}
        };
        st.units[id] = u;
        if (this.isDisplayed(u) && !$gamePlayer.isTransferring()) spawnUnitEvent(u);
        emit("world:unitAdded", u);
        return u;
    };
    World.unit = id => (World.state && World.state.units[id]) || null;
    World.units = () => (World.state ? Object.values(World.state.units) : []);
    World.unitsInArea = (ax, ay) => World.units().filter(u => u.area.x === ax && u.area.y === ay);
    World.unitByName = name => World.units().find(u => u.name === name) || null;
    World.removeUnit = function(id) {
        const u = this.unit(id);
        if (!u) return false;
        despawnUnitEvent(u);
        delete this.state.units[id];
        emit("world:unitRemoved", u);
        return true;
    };
    /** Send a unit toward { area: { x, y }, x, y }. It walks there across areas, on or off screen. */
    World.sendUnit = function(id, goal) {
        const u = this.unit(id);
        if (!u || !goal || !goal.area || !this.inWorld(goal.area.x, goal.area.y)) return false;
        u.goal = { area: { x: goal.area.x, y: goal.area.y }, x: goal.x | 0, y: goal.y | 0 };
        u.stuckFrames = 0;
        return true;
    };
    World.stopUnit = id => {
        const u = World.unit(id);
        if (u) u.goal = null;
    };
    World.eventIdOf = id => EVENT_BASE + id;
    World.isDisplayed = u => sameArea(u.area, World.currentArea());
    World.eventOf = function(id) {
        const u = this.unit(id);
        if (!u || !this.isDisplayed(u) || !window.$gameMap) return null;
        return $gameMap._events[EVENT_BASE + id] || null;
    };
    World.unitOfEvent = ev => (ev && ev.eventId && ev.eventId() >= EVENT_BASE ? World.unit(ev.eventId() - EVENT_BASE) : null);
    /** Re-read a unit's image (and `data.through`) into its on-screen event after `unit.image` changed (clothing tiers). */
    World.refreshUnitImage = function(id) {
        const u = this.unit(id);
        if (!u) return false;
        const ev = this.eventOf(id);
        if (ev) {
            ev.setImage(u.image.characterName, u.image.characterIndex);
            ev.setThrough(!!(u.data && u.data.through));
            if ($dataMap && $dataMap.events && $dataMap.events[EVENT_BASE + id]) $dataMap.events[EVENT_BASE + id].pages[0].image.characterName = u.image.characterName;
        }
        emit("world:unitImageChanged", u);
        return true;
    };

    function wrapStep(pos, dx, dy) {
        const size = World.state.size;
        let x = pos.x + dx, y = pos.y + dy, ax = pos.area.x, ay = pos.area.y;
        if (x < 0) { ax--; x += size; } else if (x >= size) { ax++; x -= size; }
        if (y < 0) { ay--; y += size; } else if (y >= size) { ay++; y -= size; }
        return { ax, ay, x, y, crossed: ax !== pos.area.x || ay !== pos.area.y };
    }

    function goalDelta(u) {
        const size = World.state.size;
        const gx = u.goal.area.x * size + u.goal.x, gy = u.goal.area.y * size + u.goal.y;
        const cx = u.area.x * size + u.x, cy = u.area.y * size + u.y;
        const step = stepToward(gx - cx, gy - cy);
        return { dx: step.dx, dy: step.dy, dist: Math.max(Math.abs(gx - cx), Math.abs(gy - cy)) };
    }

    function arrive(u) {
        u.goal = null;
        u.stuckFrames = 0;
        emit("world:unitArrived", u);
    }

    function moveUnitToArea(u, ax, ay, x, y) {
        const from = { x: u.area.x, y: u.area.y };
        if (World.isDisplayed(u)) despawnUnitEvent(u);
        u.area = { x: ax, y: ay };
        u.x = x;
        u.y = y;
        if (World.isDisplayed(u) && !$gamePlayer.isTransferring()) spawnUnitEvent(u);
        emit("world:unitAreaChanged", u, from, { x: ax, y: ay });
    }

    const goalReached = u => goalDelta(u).dist === 0;

    // Off screen: one cell per UnitStepFrames, straight toward the goal. Terrain isn't checked off screen (system doc).
    function stepOffscreen(u) {
        if (goalReached(u)) return arrive(u);
        const g = goalDelta(u);
        const w = wrapStep(u, g.dx, g.dy);
        if (!World.inWorld(w.ax, w.ay)) return arrive(u);
        u.dir = facing(g.dx, g.dy);
        if (w.crossed) moveUnitToArea(u, w.ax, w.ay, w.x, w.y);
        else {
            u.x = w.x;
            u.y = w.y;
        }
        if (u.goal && goalReached(u)) arrive(u);
    }

    // On screen: the unit's event walks with RMMZ movement and pathfinding; at an area edge it steps into the next area.
    function stepOnscreen(u, ev) {
        if (ev.isMoving()) return;
        if (goalReached(u)) return arrive(u);
        const size = World.state.size;
        const g = goalDelta(u);
        const w = wrapStep(u, g.dx, g.dy);
        if (w.crossed) {
            if (!World.inWorld(w.ax, w.ay)) return arrive(u);
            u.dir = facing(g.dx, g.dy);
            moveUnitToArea(u, w.ax, w.ay, w.x, w.y);
            return;
        }
        let tx = u.goal.x, ty = u.goal.y;
        if (u.goal.area.x !== u.area.x || u.goal.area.y !== u.area.y) {
            tx = clamp((u.goal.area.x - u.area.x) * size + u.goal.x, 0, size - 1);
            ty = clamp((u.goal.area.y - u.area.y) * size + u.goal.y, 0, size - 1);
        }
        const h = g.dx > 0 ? 6 : 4, v = g.dy > 0 ? 2 : 8;
        let tried = false;
        if (g.dx !== 0 && g.dy !== 0 && tx !== ev.x && ty !== ev.y && ev.canPassDiagonally(ev.x, ev.y, h, v)) {
            ev.moveDiagonally(h, v);
            tried = true;
        } else {
            const d = ev.findDirectionTo(tx, ty);
            if (d > 0) {
                ev.moveStraight(d);
                tried = true;
            }
        }
        // No direction at all (fully enclosed) counts as a failed step too, so the goal is dropped and
        // world:unitBlocked fires instead of the unit waiting forever (found by the jobs suite, 2026-09-18).
        if (tried && ev.isMovementSucceeded()) {
            ev.setDirection(facing(g.dx, g.dy));
            u.stuckFrames = 0;
        } else if (++u.stuckFrames > STUCK_LIMIT) {
            u.goal = null;
            u.stuckFrames = 0;
            emit("world:unitBlocked", u);
        }
    }

    World.update = function() {
        if (!this.state) return;
        this._frame++;
        const current = this.currentArea();
        const offscreenTick = this._frame % CONFIG.unitStepFrames === 0;
        for (const u of this.units()) {
            if (sameArea(u.area, current)) {
                const ev = $gameMap._events[EVENT_BASE + u.id];
                if (!ev) continue;
                u.x = ev.x;
                u.y = ev.y;
                u.dir = ev.direction();
                if (u.goal) stepOnscreen(u, ev);
            } else if (u.goal && offscreenTick) {
                stepOffscreen(u);
            }
        }
    };

    //-------------------------------------------------------------------------
    // The view (the RMMZ player is the view/cursor)

    /** Move the view to a cell of any area. */
    World.transferView = function(ax, ay, x, y, dir) {
        if (!this.state || !this.inWorld(ax, ay)) return false;
        $gamePlayer.reserveTransfer(this.areaMapId(ax, ay), x, y, dir || $gamePlayer.direction(), 2);
        return true;
    };

    // Returns true when the move was turned into an area transfer.
    function tryViewEdge(player, dx, dy) {
        const area = World.currentArea();
        if (!area || player.isTransferring()) return false;
        const size = World.state.size;
        const nx = player.x + dx, ny = player.y + dy;
        if (nx >= 0 && ny >= 0 && nx < size && ny < size) return false;
        const w = wrapStep({ area, x: player.x, y: player.y }, dx, dy);
        if (!World.inWorld(w.ax, w.ay)) return false;
        return World.transferView(w.ax, w.ay, w.x, w.y);
    }

    const _Game_Player_moveStraight = Game_Player.prototype.moveStraight;
    Game_Player.prototype.moveStraight = function(d) {
        if (tryViewEdge(this, d === 6 ? 1 : d === 4 ? -1 : 0, d === 2 ? 1 : d === 8 ? -1 : 0)) return;
        _Game_Player_moveStraight.call(this, d);
    };

    const _Game_Player_moveDiagonally = Game_Player.prototype.moveDiagonally;
    Game_Player.prototype.moveDiagonally = function(horz, vert) {
        if (tryViewEdge(this, horz === 6 ? 1 : -1, vert === 2 ? 1 : -1)) return;
        _Game_Player_moveDiagonally.call(this, horz, vert);
    };

    const _Game_Player_performTransfer = Game_Player.prototype.performTransfer;
    Game_Player.prototype.performTransfer = function() {
        const from = World.currentArea();
        _Game_Player_performTransfer.call(this);
        const to = World.currentArea();
        if (to && !sameArea(from, to)) emit("world:viewAreaChanged", from, to);
    };

    //-------------------------------------------------------------------------
    // Engine hooks: loading, new game, save/load, per-frame update

    if (CONFIG.templateMapId > 0 && !DataManager.isBattleTest() && !DataManager.isEventTest()) {
        DataManager._databaseFiles.push({ name: TEMPLATE_VAR, src: "Map%1.json".format(CONFIG.templateMapId.padZero(3)) });
    }

    const _DataManager_loadMapData = DataManager.loadMapData;
    DataManager.loadMapData = function(mapId) {
        const area = World.state ? World.areaOfMapId(mapId) : null;
        if (area) {
            window.$dataMap = null;
            const map = World.buildArea(area.x, area.y);
            this.onLoad(map);
            window.$dataMap = map;
            emit("world:areaBuilt", area);
            return;
        }
        _DataManager_loadMapData.call(this, mapId);
    };

    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DataManager_createGameObjects.call(this);
        World.state = null;
        buildCache.clear();
    };

    const _Game_Player_setupForNewGame = Game_Player.prototype.setupForNewGame;
    Game_Player.prototype.setupForNewGame = function() {
        if (!CONFIG.startInWorld) {
            _Game_Player_setupForNewGame.call(this);
            return;
        }
        World.newWorld();
        const start = World.state.startArea;
        const tpl = World.template();
        const off = World.templateOffset();
        let x = Math.floor(World.state.size / 2), y = x;
        if (tpl && $dataSystem.startMapId === CONFIG.templateMapId) {
            x = $dataSystem.startX + off.x;
            y = $dataSystem.startY + off.y;
        }
        this.reserveTransfer(World.areaMapId(start.x, start.y), x, y, 2, 0);
    };

    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DataManager_makeSaveContents.call(this);
        contents.ufWorld = World.state;
        return contents;
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        World.state = contents.ufWorld || null;
        if (World.state && !World.state.objectDiffs) World.state.objectDiffs = {};
        buildCache.clear();
    };

    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);
        World.update();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "world"). Registered at boot, after all plugins have loaded.

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        const settle = what => t => t.waitUntil(
            () => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted() && !$gamePlayer.isTransferring() && what(),
            10000, "the map to settle");

        UF.Test.suite("world", async t => {
            const W = World, st = W.state;
            const area = W.currentArea();
            t.check("in_area_map", !!st && sameArea(area, st.startArea),
                area ? `area (${area.x},${area.y}), map ${$gameMap.mapId()}, seed ${st.seed}` : `map ${$gameMap.mapId()} is not an area map`);
            if (!area) return;
            const size = st.size;

            t.check("area_size", size === 256 && $dataMap.width === 256 && $dataMap.height === 256 && $dataMap.data.length === 256 * 256 * 6 && $dataMap.ufObjects && $dataMap.ufObjects.length === 256 * 256,
                `${$dataMap.width}x${$dataMap.height}, data length ${$dataMap.data.length}, objects ${$dataMap.ufObjects ? $dataMap.ufObjects.length : "missing"}`);
            t.check("one_layer", !W.layers && !W.changeViewLayer && W.areaOfMapId(W.areaMapId(0, 0)).z === undefined, "areas are {x, y}; no layer API");

            const tpl = W.template();
            if (tpl) {
                const expected = tpl.events.filter(e => e && !(e.meta && e.meta.ufUnit));
                const missing = expected.filter(e => !$gameMap.event(e.id) || $gameMap.event(e.id).event().name !== e.name);
                const off = W.templateOffset();
                t.check("template_stamped", missing.length === 0,
                    missing.length ? `missing: ${missing.map(e => e.name).join(", ")}` : `${expected.length} template events at (${off.x},${off.y})`);
            }

            const hashData = arr => {
                let h = 0;
                for (let i = 0; i < arr.length; i++) h = (Math.imul(h, 31) + (arr[i] | 0)) | 0;
                return h;
            };
            const h1 = hashData(W.buildArea(0, 0).data), h2 = hashData(W.buildArea(0, 0).data);
            t.check("seeded", h1 === h2, `area (0,0) built twice: ${h1} / ${h2}; generators: ${W.generators().join(", ") || "none yet (flat ground only)"}`);

            // Tile changes are recorded.
            const tx = 3, ty = 3, idx = (0 * size + ty) * size + tx;
            const before = W.getTile(area.x, area.y, tx, ty, 0);
            const changed = before === 2048 ? 2096 : 2048;
            W.setTile(area.x, area.y, tx, ty, 0, changed);
            t.check("diff_applies_live", $dataMap.data[idx] === changed, `tile (${tx},${ty}) ${before} -> ${$dataMap.data[idx]}`);

            // Object changes are recorded, on screen and off.
            const ox = 5, oy = 5;
            W.setObject(area.x, area.y, ox, oy, 7);
            const other = W.inWorld(area.x + 1, area.y) ? { x: area.x + 1, y: area.y } : area;
            const peek = W.peekArea(other.x, other.y);
            W.setObject(other.x, other.y, 9, 9, 3);
            t.check("object_diffs", $dataMap.ufObjects[oy * size + ox] === 7 && W.getObject(area.x, area.y, ox, oy) === 7 && W.getObject(other.x, other.y, 9, 9) === 3 && peek.ufObjects[9 * size + 9] === 3 && W.peekArea(other.x, other.y) === peek,
                `on screen (${ox},${oy}) = ${W.getObject(area.x, area.y, ox, oy)}; area (${other.x},${other.y}) cell (9,9) = ${W.getObject(other.x, other.y, 9, 9)} through the peek cache (${W.peekArea(other.x, other.y) === peek ? "same cached build" : "rebuilt"})`);
            W.setObject(other.x, other.y, 9, 9, 0);

            const json = JsonEx.stringify(st);
            t.check("save_roundtrip", JSON.stringify(JsonEx.parse(json)) === JSON.stringify(st), `${json.length} bytes, ${W.units().length} units`);

            // A unit walks to a goal (from the west area when there is one, else from the west edge of this area).
            const multi = W.inWorld(area.x - 1, area.y) && W.inWorld(area.x + 1, area.y);
            const west = multi ? { x: area.x - 1, y: area.y } : area;
            const row = 128;
            $gamePlayer.locate(8, row);
            // The goal and the start must be walkable land (the world's rim is ocean): search the row from the middle outward.
            const walkable = (x, y) => $gameMap.isPassable(x, y, 2) && !Tilemap.isWaterTile($gameMap.tileId(x, y, 0)) && !(window.UF.Objects && UF.Objects.blocks && UF.Objects.blocks(x, y));
            const findWalkable = (fromX, toX) => { for (let x = fromX; toX > fromX ? x <= toX : x >= toX; x += toX > fromX ? 1 : -1) if (walkable(x, row)) return x; return null; };
            const goalX = multi ? 3 : findWalkable(size / 2 - 40, 3);
            const startX = multi ? size - 4 : findWalkable(goalX + 15, size / 2);
            const u = W.addUnit({ name: "TEST_walker", image: { characterName: "People1", characterIndex: 0 }, area: west, x: startX, y: row, dir: 6 });
            if (multi) t.check("unit_starts_offscreen", !W.eventOf(u.id), `unit ${u.id} in area (${u.area.x},${u.area.y}) at (${u.x},${u.y})`);
            else t.check("single_area_world", st.areasX === 1 && st.areasY === 1 && $gameMap.mapId() === W.areaMapId(0, 0) && goalX !== null && startX !== null, `${st.areasX}x${st.areasY} areas, map ${$gameMap.mapId()}; walk from x ${startX} to x ${goalX} on row ${row}`);
            W.sendUnit(u.id, { area, x: goalX, y: row });
            await t.waitUntil(() => !!W.eventOf(u.id), 8000, "TEST_walker to be on the area on screen").catch(() => {});
            const ev = W.eventOf(u.id);
            const sprite = ev && SceneManager._scene._spriteset._characterSprites.find(s => s._character === ev);
            t.check("unit_enters_view", !!ev && !!sprite,
                ev ? `event ${ev.eventId()} at (${ev.x},${ev.y}), sprite ${sprite ? "created" : "MISSING"}` : `still in area (${u.area.x},${u.area.y}) at (${u.x},${u.y})`);
            // 4-way: the event never faces or steps diagonally.
            let diagonal = 0;
            const origDiag = ev ? ev.moveDiagonally : null;
            if (ev) ev.moveDiagonally = function(h, v) { diagonal++; return origDiag.call(this, h, v); };
            await t.waitUntil(() => !u.goal, 14000, "TEST_walker to reach its goal").catch(() => {});
            if (ev) ev.moveDiagonally = origDiag;
            t.check("unit_walks_to_goal", !u.goal && sameArea(u.area, area) && u.x === goalX && u.y === row,
                `at (${u.x},${u.y}) in area (${u.area.x},${u.area.y}), goal (${goalX},${row}) ${u.goal ? "still set" : "reached"}`);
            t.check("four_way_steps", diagonal === 0, `${diagonal} diagonal step(s) on screen (FourWay ${window.UF_Dir8 ? UF_Dir8.fourWay : "n/a"})`);
            await t.waitFrames(10);
            t.screenshot("unit_in_view");

            // Image refresh (clothing tiers) changes the drawn character.
            u.image.characterName = "$U7_Ranger";
            W.refreshUnitImage(u.id);
            await t.waitFrames(3);
            t.check("unit_image_refresh", !!ev && ev.characterName() === "$U7_Ranger", ev ? `event now draws "${ev.characterName()}"` : "no event");

            if (multi) {
                // The unit walks back out and keeps existing in the west area.
                W.sendUnit(u.id, { area: west, x: size - 3, y: row });
                await t.waitUntil(() => sameArea(u.area, west), 8000, "TEST_walker to leave the area").catch(() => {});
                const leftover = $gameMap._events[W.eventIdOf(u.id)];
                t.check("unit_leaves_view", sameArea(u.area, west) && !leftover && !!W.unit(u.id),
                    `area (${u.area.x},${u.area.y}) at (${u.x},${u.y}); event ${leftover ? "still on the map" : "removed"}`);

                // The view crosses the east edge and comes back.
                const east = { x: area.x + 1, y: area.y };
                $gamePlayer.locate(size - 1, row);
                $gamePlayer.moveStraight(6);
                await settle(() => sameArea(W.currentArea(), east))(t).catch(() => {});
                t.check("view_crosses_edge", sameArea(W.currentArea(), east) && $gamePlayer.x === 0 && $gamePlayer.y === row,
                    `area ${JSON.stringify(W.currentArea())}, view at (${$gamePlayer.x},${$gamePlayer.y})`);
                await t.waitFrames(20);
                t.screenshot("east_area");

                $gamePlayer.moveStraight(4);
                await settle(() => sameArea(W.currentArea(), area))(t).catch(() => {});
                t.check("view_returns", sameArea(W.currentArea(), area) && $gamePlayer.x === size - 1 && $gamePlayer.y === row,
                    `area ${JSON.stringify(W.currentArea())}, view at (${$gamePlayer.x},${$gamePlayer.y})`);
            } else {
                // One area: the view stops at the edge instead of leaving the world.
                $gamePlayer.locate(size - 1, row);
                $gamePlayer.moveStraight(6);
                await t.waitFrames(10);
                t.check("view_stays_in_world", sameArea(W.currentArea(), area) && $gamePlayer.x === size - 1, `view at (${$gamePlayer.x},${$gamePlayer.y}) after pushing east at the edge`);
            }
            t.check("diff_persists", $dataMap.data[idx] === changed && $dataMap.ufObjects[oy * size + ox] === 7,
                `tile (${tx},${ty}) is ${$dataMap.data[idx]} (expected ${changed}) and object (${ox},${oy}) is ${$dataMap.ufObjects[oy * size + ox]} (expected 7) after leaving and returning`);

            W.setTile(area.x, area.y, tx, ty, 0, before);
            W.setObject(area.x, area.y, ox, oy, 0);
            W.removeUnit(u.id);
            await t.waitFrames(60);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during world checks");
        });
    }
})();
