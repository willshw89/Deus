//=============================================================================
// DEUS_World.js - A world of 256x256 areas; units and the view travel between them
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS World] Seeded multi-level procedural world generation, persistent area maps, coordinate translation, and world state.
 * @author UF project
 * @orderAfter DEUS_ProcGen
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
 * Paths (2026-09-19): units on screen follow a path planned over the whole
 * area (UF.World.findPath: A*, 4-way, round walls and through gaps; tile
 * passage, water and blocking objects as on-screen stepping; units are
 * ignored when planning and waited for, then walked round, when met). A
 * goal nobody can reach is given up at once (world:unitBlocked with a
 * reason). At most 4 new plans per map update; the rest wait in a queue.
 *
 * Spawning (2026-09-19, VISION V68): addUnit puts a unit only on a cell it
 * can stand on (the nearest free cell when the one asked for holds a tree,
 * a rock, a wall, water or another unit), except fliers and exact: true.
 * setObject refuses a blocking object on a cell where a unit stands, and
 * regrowth onto such a cell waits until the unit has left.
 *
 * Levels (2026-09-19, VISION V80, docs/design/VERTICAL_BUILD_PLAN.md): every
 * area has five levels, z = -2..+2 (0 = the ground). Units, tiles and objects
 * carry z; a trailing z argument that is left out means the ground. One map
 * id per level: MapIdBase + slot * areas + area index, slot 0 = ground (so
 * the ground keeps its old ids), 1 = +1, 2 = +2, 3 = -1, 4 = -2. The legacy
 * calls stay ground-only on purpose: currentArea() / areaOfMapId() /
 * isAreaMap() answer only for the ground (null while another level is on
 * screen), and world:tileChanged / world:objectChanged / world:areaBuilt fire
 * only for z 0 (world:levelTileChanged / world:levelObjectChanged /
 * world:levelBuilt otherwise). viewLevel() and levelOfMapId() are z-aware.
 * Generators run for the ground only unless registered with { levels }.
 * Off-screen units walk planned paths on their own level. UF_Levels owns the
 * level shapes, tiles and view switching.
 *
 * API, events, save data and checks: docs/systems/UF_World.md
 * Architecture: docs/design/WORLD_ARCHITECTURE.md
 *
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const P = (PluginManager.parameters("DEUS_World") && Object.keys(PluginManager.parameters("DEUS_World")).length ? PluginManager.parameters("DEUS_World") : PluginManager.parameters("UF_World"));
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
    // Areas are { x, y }. sameArea ignores z on purpose (VISION V80: the legacy compare means "the same area").
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
    const areaKey = (ax, ay) => `${ax},${ay}`;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    // Levels (VISION V80): z -2..+2, 0 = the ground. A record's z sits beside its area (unit.z, item.z); an API
    // handle may carry it inside the area ({ x, y, z }). A missing z is the ground.
    const LEVELS = Object.freeze([-2, -1, 0, 1, 2]);
    const SLOT = { 0: 0, 1: 1, 2: 2, "-1": 3, "-2": 4 }; // map id slot of each level; the ground keeps slot 0 (changed only by a test provocation)
    const zOf = o => (o && o.z !== undefined ? o.z : 0);
    const isLevel = z => Number.isInteger(z) && z >= -2 && z <= 2;
    // Diff and cache key of an area's level: the ground keeps the pre-V80 key "x,y".
    const levelKey = (ax, ay, z) => (z ? `${ax},${ay},${z}` : `${ax},${ay}`);
    // The level on screen matches (ax, ay, z)? (World.viewLevel is defined with the areas below.)
    const onView = (ax, ay, z) => {
        const v = World.viewLevel();
        return !!v && v.x === ax && v.y === ay && v.z === z;
    };

    // 8-way movement (VISION V3, 2026-09-19): UF_Movement8D's FourWay is off by default; with it on (the 2026-09-18
    // rule) units step along one axis at a time.
    const fourWay = () => !window.UF_Dir8 || UF_Dir8.fourWay !== false;
    // One step toward (ax, ay) remaining: both axes in 8-way, the longer axis in 4-way.
    const stepToward = (ax, ay) => {
        const dx = Math.sign(ax), dy = Math.sign(ay);
        if (!fourWay() || dx === 0 || dy === 0) return { dx, dy };
        return Math.abs(ax) >= Math.abs(ay) ? { dx, dy: 0 } : { dx: 0, dy };
    };

    // Facing (VISION V3): dir8 is one of 8 (numpad 1-9), dir its 4-way part for RPG Maker and 4-row sheets (a diagonal
    // shows its horizontal side, as UF_Movement8D does on screen).
    const dir8Of = (dx, dy) => (window.UF_Dir8 ? UF_Dir8.toward(dx, dy) : 0) ||
        (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 6 : dx < 0 ? 4 : 2) : (dy > 0 ? 2 : 8));
    const project4 = d => (d === 1 || d === 7 ? 4 : d === 3 || d === 9 ? 6 : d === 2 || d === 4 || d === 6 || d === 8 ? d : 2);
    const faceUnit = (u, d8) => {
        u.dir8 = d8;
        u.dir = project4(d8);
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
    // UF.Space: Authoritative spatial standard (VISION V127, 5ft/cell, 5ft/Z)
    //-------------------------------------------------------------------------

    const Space = {
        GRID_SIZE_FEET: 5,
        Z_STEP_FEET: 5,
        FEET_PER_CELL: 5,

        feetToCells(feet) {
            return Math.floor((feet || 0) / 5);
        },

        cellsToFeet(cells) {
            return (cells || 0) * 5;
        },

        zOf(o) {
            if (!o) return 0;
            if (typeof o.z === "number") return o.z;
            if (o.area && typeof o.area.z === "number") return o.area.z;
            return 0;
        },

        sameZ(a, b) {
            return Space.zOf(a) === Space.zOf(b);
        },

        sameArea(a, b) {
            if (!a || !b) return false;
            const aArea = a.area || a;
            const bArea = b.area || b;
            return aArea.x === bArea.x && aArea.y === bArea.y && Space.sameZ(a, b);
        },

        sameCell(a, b) {
            return Space.sameArea(a, b) && a.x === b.x && a.y === b.y;
        },

        chebyshev(a, b) {
            if (!a || !b) return Infinity;
            return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
        },

        manhattan(a, b) {
            if (!a || !b) return Infinity;
            return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        },

        euclidean(a, b) {
            if (!a || !b) return Infinity;
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            return Math.sqrt(dx * dx + dy * dy);
        },

        gridDistance(a, b) {
            if (!Space.sameArea(a, b)) return Infinity;
            return Space.chebyshev(a, b);
        },

        rulesDistanceFeet(a, b) {
            if (!a || !b) return Infinity;
            if (!Space.sameArea(a, b)) return Infinity;
            const gridDist = Space.chebyshev(a, b);
            const dz = Math.abs(Space.zOf(a) - Space.zOf(b));
            if (dz === 0) return gridDist * 5;
            return Math.round(Math.sqrt((gridDist * 5) ** 2 + (dz * 5) ** 2));
        },

        inMeleeReach(attacker, target, reachFeet = 5) {
            if (!attacker || !target) return false;
            if (!Space.sameZ(attacker, target)) return false;
            const reachCells = Space.feetToCells(reachFeet) || 1;
            return Space.gridDistance(attacker, target) <= reachCells;
        },

        inRangedRange(attacker, target, maxRangeFeet) {
            if (!attacker || !target) return false;
            const distFeet = Space.rulesDistanceFeet(attacker, target);
            return distFeet <= maxRangeFeet;
        }
    };

    // The public object

    const generators = [];
    const World = {
        config: CONFIG,
        EVENT_BASE,
        LEVELS,
        state: null,
        _frame: 0,
        hash32,
        mulberry32,
        zOf: Space.zOf,
        isLevel,
        levelKey,
        Space
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.World = World;
    window.UF.Space = Space;

    //-------------------------------------------------------------------------
    // World creation

    /**
     * Authoritative seed normalization and validation function for Project DEUS.
     * Accepted range: 0 to 2,147,483,647 (non-negative signed 32-bit integer, 0x7FFFFFFF).
     */
    World.normalizeSeed = function(input) {
        if (input === null || input === undefined) {
            return { valid: true, isBlank: true, seed: null, canonical: "", error: null };
        }
        if (typeof input === "number") {
            if (!Number.isFinite(input) || !Number.isInteger(input)) {
                return { valid: false, isBlank: false, seed: null, canonical: String(input), error: "Seed must be an integer between 0 and 2,147,483,647" };
            }
            if (input < 0 || input > 0x7fffffff) {
                return { valid: false, isBlank: false, seed: null, canonical: String(input), error: "Seed must be an integer between 0 and 2,147,483,647" };
            }
            return { valid: true, isBlank: false, seed: input, canonical: String(input), error: null };
        }
        const str = String(input).trim();
        if (str === "") {
            return { valid: true, isBlank: true, seed: null, canonical: "", error: null };
        }
        if (!/^\d+$/.test(str)) {
            return { valid: false, isBlank: false, seed: null, canonical: str, error: "Seed must be an integer between 0 and 2,147,483,647" };
        }
        if (str.length > 10) {
            return { valid: false, isBlank: false, seed: null, canonical: str, error: "Seed must be an integer between 0 and 2,147,483,647" };
        }
        const num = Number(str);
        if (!Number.isSafeInteger(num) || num < 0 || num > 0x7fffffff) {
            return { valid: false, isBlank: false, seed: null, canonical: str, error: "Seed must be an integer between 0 and 2,147,483,647" };
        }
        return { valid: true, isBlank: false, seed: num, canonical: String(num), error: null };
    };

    World.seed = function() {
        return this.state ? this.state.seed : null;
    };

    World.generatorInfo = function() {
        if (!this.state) return null;
        return {
            seed: this.state.seed,
            version: this.state.version || 3,
            size: this.state.size || 256,
            areasX: this.state.areasX || CONFIG.areasX,
            areasY: this.state.areasY || CONFIG.areasY
        };
    };

    World.newWorld = function(seed, size) {
        let s;
        if (seed !== undefined && seed !== null && seed !== "") {
            const norm = World.normalizeSeed(seed);
            if (!norm.valid || norm.isBlank) {
                s = Math.floor(Math.random() * 0x7ffffffe) + 1;
            } else {
                s = norm.seed;
            }
        } else if (CONFIG.seed && CONFIG.seed > 0) {
            s = CONFIG.seed;
        } else {
            s = Math.floor(Math.random() * 0x7ffffffe) + 1;
        }
        const worldSize = 256;
        this.state = {
            version: 4,
            seed: s,
            areasX: CONFIG.areasX,
            areasY: CONFIG.areasY,
            size: worldSize,
            startArea: { x: Math.floor(CONFIG.areasX / 2), y: Math.floor(CONFIG.areasY / 2) },
            units: {},
            nextUnitId: 1,
            diffs: {},
            objectDiffs: {}
        };
        buildCache.clear();
        offOcc = null;
        clearPaths(true);
        spawnStats = newSpawnStats();
        // Baselines must exist before faction/site listeners choose founding cells. This phase is for idempotent
        // world-state initialization only; world:created below remains the populated-world generation hook.
        emit("world:initializing", this.state);
        // Template units are placed before world:created, when generators' inputs (faction sites, history) aren't
        // there yet: checking their cells now would build and cache the area too early. They're seated right after.
        seatLater = [];
        let early;
        try {
            this._convertTemplateUnits();
        } finally {
            early = seatLater;
            seatLater = null;
        }
        emit("world:created", this.state);
        if (typeof require !== 'undefined') {
            try { require('fs').appendFileSync('game_runtime.log', `${new Date().toISOString()} [TIMING] emit world:created done\n`); } catch (_) {}
        }
        for (const id of early) {
            const u = this.unit(id);
            if (!u) continue;
            const c = seatCell(u.area.x, u.area.y, u.x, u.y, 0, u.name, u.id, zOf(u));
            spawnStats[c.how]++;
            u.x = c.x;
            u.y = c.y;
        }
        if (typeof require !== 'undefined') {
            try { require('fs').appendFileSync('game_runtime.log', `${new Date().toISOString()} [TIMING] early seated done, units=${early.length}\n`); } catch (_) {}
        }
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

    /** True for an area inside the world grid and a level -2..+2 (z left out = the ground). */
    World.inWorld = (ax, ay, z = 0) => Number.isInteger(ax) && Number.isInteger(ay) && ax >= 0 && ay >= 0 && ax < worldDims().areasX && ay < worldDims().areasY && isLevel(z);
    /** Map ID of an area's level: MapIdBase + slot * areas + ay * areasX + ax (ground slot 0, so ground ids are unchanged). 0 for a non-level z. */
    World.areaMapId = (ax, ay, z = 0) => {
        if (!World.inWorld(ax, ay, z)) return 0;
        const d = worldDims();
        return CONFIG.mapIdBase + SLOT[z] * d.areasX * d.areasY + ay * d.areasX + ax;
    };
    /** The ground area of a map ID, or null (another level's map, or not a world map). Ground-only by design (VISION V80). */
    World.areaOfMapId = function(mapId) {
        const d = worldDims();
        const i = mapId - CONFIG.mapIdBase;
        if (!Number.isInteger(i) || i < 0 || i >= d.areasX * d.areasY) return null;
        return { x: i % d.areasX, y: Math.floor(i / d.areasX) };
    };
    /** { x, y, z } of any level's map ID, or null. */
    World.levelOfMapId = function(mapId) {
        const d = worldDims();
        const n = d.areasX * d.areasY;
        const i = mapId - CONFIG.mapIdBase;
        if (!Number.isInteger(i) || i < 0 || i >= n * LEVELS.length) return null;
        const slot = Math.floor(i / n), j = i % n;
        const z = LEVELS.find(l => SLOT[l] === slot);
        return { x: j % d.areasX, y: Math.floor(j / d.areasX), z };
    };
    World.isAreaMap = mapId => World.areaOfMapId(mapId) !== null;
    /** True for the map of any level of any area. */
    World.isWorldMap = mapId => World.levelOfMapId(mapId) !== null;
    /** The ground area on screen, or null (not a world map, or another level is on screen: see viewLevel). */
    World.currentArea = () => (window.$gameMap && World.state ? World.areaOfMapId($gameMap.mapId()) : null);
    /** { x, y, z } of the level on screen, or null when the map on screen isn't a world map. (A shared object: don't change it.) */
    let viewMemo = { id: NaN, state: null, level: null };
    World.viewLevel = () => {
        if (!window.$gameMap || !World.state) return null;
        const id = $gameMap.mapId();
        if (viewMemo.id !== id || viewMemo.state !== World.state) viewMemo = { id, state: World.state, level: Object.freeze(World.levelOfMapId(id)) };
        return viewMemo.level;
    };
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
     * opts.levels: the levels the generator paints (default [0], the ground). ctx.z says which level is being built.
     */
    World.registerGenerator = function(name, fn, order = 100, opts = {}) {
        const i = generators.findIndex(g => g.name === name);
        if (i >= 0) generators.splice(i, 1);
        const levels = Array.isArray(opts && opts.levels) ? opts.levels.filter(isLevel) : [0];
        generators.push({ name, fn, order, levels });
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

    /**
     * Build the $dataMap object of an area's level (z left out = the ground) in memory. Pure: doesn't touch the
     * current map. Only the generators registered for that level run; the start template is ground-only.
     */
    World.buildArea = function(ax, ay, z = 0) {
        const st = this.state;
        if (!st || !this.inWorld(ax, ay, z)) return null;
        const size = st.size;
        const cells = size * size;
        const index = (x, y, layer) => (layer * size + y) * size + x;
        const data = new Array(cells * 6).fill(0);
        for (let i = 0; i < cells; i++) data[i] = CONFIG.groundTileId;

        const tpl = z === 0 && this.isStartArea(ax, ay) ? this.template() : null;
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
            parallaxLoopX: true, parallaxLoopY: true, parallaxName: "", parallaxShow: false, parallaxSx: 0, parallaxSy: 0,
            scrollType: 3, specifyBattleback: false, tilesetId: CONFIG.tilesetId,
            data, events, ufArea: { x: ax, y: ay, z }, ufObjects: objects
        };

        const ctx = {
            areaX: ax, areaY: ay, z, width: size, height: size, seed: st.seed,
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
        for (const g of generators) if (g.levels.includes(z)) g.fn(ctx);

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

        const diff = st.diffs[levelKey(ax, ay, z)];
        if (diff) for (const i in diff) data[Number(i)] = diff[i];
        const odiff = st.objectDiffs && st.objectDiffs[levelKey(ax, ay, z)];
        if (odiff) for (const i in odiff) objects[Number(i)] = odiff[i];

        for (const u of this.unitsInArea(ax, ay, z)) events[EVENT_BASE + u.id] = unitEventData(u);
        return map;
    };

    // Write one tile of an area's level: the map on screen and the cached build (and their walk grids). No diff.
    function patchTile(ax, ay, x, y, layer, tileId, z) {
        const size = World.state.size;
        const i = (layer * size + y) * size + x;
        const screen = onView(ax, ay, z) && window.$dataMap && $dataMap.data ? $dataMap : null;
        if (screen) {
            screen.data[i] = tileId;
            pathCellChanged(screen, x, y, true);
            const scene = SceneManager._scene;
            if (scene instanceof Scene_Map && scene._spriteset) scene._spriteset._tilemap.refresh();
        }
        const cached = buildCache.get(cacheKey(ax, ay, z));
        if (cached && cached !== screen) {
            cached.data[i] = tileId;
            pathCellChanged(cached, x, y, true);
        }
    }
    const tileArgsOk = (ax, ay, x, y, layer, z) => {
        const size = World.state ? World.state.size : 0;
        return Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(layer) && World.inWorld(ax, ay, z) && x >= 0 && y >= 0 && x < size && y < size && layer >= 0 && layer <= 5;
    };

    /** Change a tile anywhere in the world (z left out = the ground). Recorded, so it survives leaving the area and saving. */
    World.setTile = function(ax, ay, x, y, layer, tileId, z = 0) {
        if (!tileArgsOk(ax, ay, x, y, layer, z)) return false;
        const size = this.state.size;
        const i = (layer * size + y) * size + x;
        const key = levelKey(ax, ay, z);
        (this.state.diffs[key] = this.state.diffs[key] || {})[i] = tileId;
        patchTile(ax, ay, x, y, layer, tileId, z);
        if (z === 0) emit("world:tileChanged", { x: ax, y: ay }, x, y, layer, tileId);
        else emit("world:levelTileChanged", { x: ax, y: ay, z }, x, y, layer, tileId);
        return true;
    };
    /**
     * Change a tile that is derived from saved state kept elsewhere (UF_Levels' cell shapes): patches the map on
     * screen and the cached build like setTile, but records no tile diff. Emits world:levelTileChanged.
     */
    World.setDerivedTile = function(ax, ay, x, y, layer, tileId, z = 0) {
        if (!tileArgsOk(ax, ay, x, y, layer, z)) return false;
        patchTile(ax, ay, x, y, layer, tileId, z);
        emit("world:levelTileChanged", { x: ax, y: ay, z }, x, y, layer, tileId);
        return true;
    };

    /** Read a tile (z left out = the ground). Off-screen levels come from the peek cache (built once, then reused). */
    World.getTile = function(ax, ay, x, y, layer, z = 0) {
        if (!tileArgsOk(ax, ay, x, y, layer, z)) return 0;
        const size = this.state.size;
        const i = (layer * size + y) * size + x;
        if (onView(ax, ay, z) && $dataMap && $dataMap.data) return $dataMap.data[i];
        const diff = this.state.diffs[levelKey(ax, ay, z)];
        if (diff && diff[i] !== undefined) return diff[i];
        return this.peekArea(ax, ay, z).data[i];
    };

    /**
     * Change the object on a cell anywhere in the world (type number from UF_Objects, 0 = nothing). Recorded like tiles.
     * Every UF_Objects change (placing, building, harvesting, regrowth) comes through here. Refused (false) when the
     * new type blocks movement and a unit that doesn't pass through everything stands on the cell (VISION V68);
     * World.lastObjectRefusal says why. Generators write their own grid while an area is built: worldgen is unaffected.
     */
    World.setObject = function(ax, ay, x, y, type, z = 0) {
        const size = this.state.size;
        if (!this.inWorld(ax, ay, z) || x < 0 || y < 0 || x >= size || y >= size) return false;
        const stander = type && !(guardOff && guardOff.objects) && typeBlocks(type | 0) ? standerAt(ax, ay, x, y, z) : null;
        if (stander && this.getObject(ax, ay, x, y, z) !== (type | 0)) {
            const O = window.UF.Objects;
            const t = O && O.type ? O.type(type | 0) : null;
            const r = {
                area: { x: ax, y: ay }, x, y, z, type: type | 0, objectId: t ? t.id : null, unitId: stander.id, unitName: stander.name,
                reason: `${t ? `"${t.id}"` : `object type ${type | 0}`} can't go on (${x},${y}) in area (${ax},${ay})${z ? ` at level ${z}` : ""}: "${stander.name}" (unit ${stander.id}) stands there`
            };
            this.lastObjectRefusal = r;
            spawnStats.objectRefusals++;
            if (spawnStats.objectRefusals <= SPAWN.warnLimit) console.warn(`UF_World: ${r.reason}`);
            emit("world:objectRefused", r);
            return false;
        }
        const i = y * size + x;
        const key = levelKey(ax, ay, z);
        const diffs = (this.state.objectDiffs = this.state.objectDiffs || {});
        (diffs[key] = diffs[key] || {})[i] = type | 0;
        const screen = onView(ax, ay, z) && $dataMap && $dataMap.ufObjects ? $dataMap : null;
        if (screen) {
            screen.ufObjects[i] = type | 0;
            pathCellChanged(screen, x, y, false);
        }
        const cached = buildCache.get(cacheKey(ax, ay, z));
        if (cached && cached !== screen) {
            cached.ufObjects[i] = type | 0;
            pathCellChanged(cached, x, y, false);
        }
        if (z === 0) emit("world:objectChanged", { x: ax, y: ay }, x, y, type | 0);
        else emit("world:levelObjectChanged", { x: ax, y: ay, z }, x, y, type | 0);
        return true;
    };
    /** Object type number on a cell (0 = nothing; z left out = the ground). Off-screen levels come from the peek cache. */
    World.getObject = function(ax, ay, x, y, z = 0) {
        const size = this.state.size;
        if (!this.inWorld(ax, ay, z) || x < 0 || y < 0 || x >= size || y >= size) return 0;
        const i = y * size + x;
        if (onView(ax, ay, z) && $dataMap && $dataMap.ufObjects) return $dataMap.ufObjects[i];
        return this.peekArea(ax, ay, z).ufObjects[i];
    };

    // Built levels kept for reading off-screen cells (AI, jobs, spawning) without rebuilding 256x256 every call.
    // setTile/setObject patch the cached copy. Its unit events are a snapshot from build time: don't read them
    // (refreshUnitEvents renews them when a cached build becomes the map on screen).
    const buildCache = new Map();
    const PEEK_CACHE = 6;
    const cacheKey = (ax, ay, z = 0) => (World.state ? `${World.state.seed}:${levelKey(ax, ay, z)}` : "");
    let lastUsedKey = null;
    const remember = (key, map) => {
        buildCache.delete(key); // re-insert: the Map's order is least recently used first
        buildCache.set(key, map);
        lastUsedKey = key;
        while (buildCache.size > PEEK_CACHE) buildCache.delete(buildCache.keys().next().value);
    };
    /** A cached build of an area's level (tiles and objects; z left out = the ground). Same object on repeated calls until it's evicted. */
    World.peekArea = function(ax, ay, z = 0) {
        if (!this.state || !this.inWorld(ax, ay, z)) return null;
        const key = cacheKey(ax, ay, z);
        let map = buildCache.get(key);
        if (!map) {
            map = this.buildArea(ax, ay, z);
            remember(key, map);
        } else if (key !== lastUsedKey) {
            remember(key, map);
        }
        return map;
    };
    /** Keep a finished build (the map that was on screen) in the peek cache, so reading or showing that level again doesn't rebuild it. */
    World.adoptBuild = function(ax, ay, z, map) {
        if (!this.state || !map || !map.data || !map.ufObjects || !this.inWorld(ax, ay, z)) return false;
        remember(cacheKey(ax, ay, z), map);
        return true;
    };
    /** The cached build of a level if there is one (no build), else null. */
    World.cachedBuild = (ax, ay, z = 0) => buildCache.get(cacheKey(ax, ay, z)) || null;
    /** Replace a build's unit events with fresh ones for the units now on that level (a cached build about to be shown). */
    World.refreshUnitEvents = function(map, ax, ay, z = 0) {
        if (!map || !Array.isArray(map.events)) return 0;
        for (let i = EVENT_BASE; i < map.events.length; i++) map.events[i] = null;
        const units = this.unitsInArea(ax, ay, z);
        for (const u of units) map.events[EVENT_BASE + u.id] = unitEventData(u);
        return units.length;
    };
    World.clearPeekCache = () => {
        buildCache.clear();
        lastUsedKey = null;
    };

    //-------------------------------------------------------------------------
    // Units

    function unitMoveSpeed(u) {
        let base = (u && u.data && Number.isFinite(u.data.moveSpeed)) ? (u.data.moveSpeed | 0) : 4;
        const Cond = window.UF && UF.Conditions;
        if (Cond) {
            if (typeof Cond.speedZero === "function" && Cond.speedZero(u)) return 0;
            if (typeof Cond.canMove === "function" && !Cond.canMove(u)) return 0;
            if (typeof Cond.speedFactor === "function") {
                const factor = Cond.speedFactor(u);
                if (factor === 0) return 0;
                if (factor <= 0.5) return Math.max(1, base - 1);
            }
        }
        const Col = window.UF && UF.Colonists;
        if (Col && typeof Col.exhaustionEffects === "function") {
            const eff = Col.exhaustionEffects(u);
            if (eff && eff.speedFactor !== undefined) {
                if (eff.speedFactor === 0) return 0;
                if (eff.speedFactor <= 0.5) return Math.max(1, base - 1);
            }
        }
        return base;
    }

    function refreshUnitMovement(u) {
        if (!u) return;
        const spd = unitMoveSpeed(u);
        const ev = World.eventOf ? World.eventOf(u.id) : null;
        if (ev && typeof ev.setMoveSpeed === "function") {
            ev.setMoveSpeed(spd);
        }
    }

    function unitEventData(u) {
        return makeEventData(EVENT_BASE + u.id, {
            name: u.name, note: `<ufUnit:${u.id}>`, x: u.x, y: u.y, dir: u.dir,
            image: { characterName: u.image.characterName, characterIndex: u.image.characterIndex, direction: u.dir },
            through: !!(u.data && u.data.through),
            moveSpeed: unitMoveSpeed(u)
        });
    }

    function spawnUnitEvent(u) {
        if (!window.$dataMap || !window.$gameMap) return null;
        const eid = EVENT_BASE + u.id;
        const existing = $gameMap._events[eid];
        if (existing) {
            if (existing.x !== u.x || existing.y !== u.y) existing.locate(u.x, u.y);
            return existing;
        }
        const data = unitEventData(u);
        data.meta = { ufUnit: String(u.id) };
        $dataMap.events[eid] = data;
        const ev = new Game_Event($gameMap.mapId(), eid);
        ev.locate(u.x, u.y);
        if (typeof ev.setMoveSpeed === "function") ev.setMoveSpeed(unitMoveSpeed(u));
        if (u.dir8 && ev.setDir8) ev.setDir8(u.dir8);
        else ev.setDirection(u.dir || 2);
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

    /**
     * True when a unit can stand on the cell: walkable ground (tileset passage flags, no water), no blocking object
     * (UF_Objects) and no other unit there. Works for areas off screen (peek cache). User rule 2026-09-18: nothing
     * spawns into walls, trees or water.
     */
    World.cellFree = function(ax, ay, x, y, ignoreUnitId = 0, z = 0) {
        const st = this.state;
        if (!st || !this.inWorld(ax, ay, z) || x < 0 || y < 0 || x >= st.size || y >= st.size) return false;
        const onScreen = onView(ax, ay, z) && window.$gameMap && $gameMap.mapId() === this.areaMapId(ax, ay, z);
        if (onScreen) {
            if (!$gameMap.isPassable(x, y, 2) && !$gameMap.isPassable(x, y, 8)) return false;
            if (Tilemap.isWaterTile($gameMap.tileId(x, y, 0))) return false;
        } else {
            const map = this.peekArea(ax, ay, z);
            const ts = window.$dataTilesets && $dataTilesets[map.tilesetId];
            const size = st.size;
            for (let layer = 3; layer >= 0; layer--) {
                const tileId = map.data[(layer * size + y) * size + x];
                if (!tileId) continue;
                if (Tilemap.isWaterTile(tileId)) return false;
                const flag = ts ? ts.flags[tileId] : 0;
                if ((flag & 0x10) !== 0) continue; // [*] star: doesn't affect passage
                if ((flag & 0x0f) === 0x0f) return false;
                break;
            }
            if (window.UF.Objects && UF.Objects.blocksIn && UF.Objects.blocksIn({ x: ax, y: ay, z }, x, y)) return false;
        }
        if (onScreen && window.UF.Objects && UF.Objects.blocks && UF.Objects.blocks(x, y)) return false;
        for (const u of this.units()) if (u.id !== ignoreUnitId && u.area.x === ax && u.area.y === ay && u.x === x && u.y === y && zOf(u) === z) return false;
        return true;
    };
    /** The nearest free cell to (x, y) within `radius` (rings outward, then by distance), or null. */
    World.nearestFreeCell = function(ax, ay, x, y, radius = 6, ignoreUnitId = 0, z = 0) {
        if (this.cellFree(ax, ay, x, y, ignoreUnitId, z)) return { x, y };
        for (let r = 1; r <= radius; r++) {
            let best = null, bestD = Infinity;
            for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                const d = dx * dx + dy * dy;
                if (d < bestD && this.cellFree(ax, ay, x + dx, y + dy, ignoreUnitId, z)) { best = { x: x + dx, y: y + dy }; bestD = d; }
            }
            if (best) return best;
        }
        return null;
    };

    //-------------------------------------------------------------------------
    // Spawning (VISION V68, user 2026-09-19): nothing appears on a cell it can't move through, and nothing that blocks
    // movement appears on a cell where a unit stands.

    const SPAWN = Object.freeze({ radius: 6, maxRadius: 24, warnLimit: 20 });
    let spawnStats = newSpawnStats();
    let seatLater = null; // unit ids added before world:created (template units), seated after it
    // Test provocations (spawn suite, seen failing once): in a --uf-test run only, the environment variable
    // UF_TEST_PROVOKE=spawn.guard / spawn.exact / spawn.objects switches that part of the guard off from boot, and
    // spawn.misplace puts one unit on a blocked cell before each scan. Never set in a normal run.
    const PROVOKE = (() => {
        const argv = (typeof nw !== "undefined" && nw.App && nw.App.argv) || [];
        if (!argv.some(a => a === "--uf-test" || String(a).startsWith("--uf-test="))) return [];
        const env = (typeof process !== "undefined" && process.env && process.env.UF_TEST_PROVOKE) || "";
        return env.split(",").map(s => s.trim()).filter(s => s.startsWith("spawn.") || s.startsWith("world."));
    })();
    const provoked = name => PROVOKE.includes(`spawn.${name}`);
    // world.level_ids (seen failing once): the -1 map id slot collides with +1's.
    if (PROVOKE.includes("world.level_ids")) SLOT["-1"] = 1;
    let guardOff = provoked("guard") || provoked("exact") || provoked("objects")
        ? { units: provoked("guard"), exact: provoked("exact"), objects: provoked("objects") } : null;
    function newSpawnStats() {
        return { added: 0, asked: 0, moved: 0, widened: 0, shared: 0, stuck: 0, exact: 0, through: 0, maxMove: 0,
            objectRefusals: 0, regrowWaits: 0, warnings: 0, last: [] };
    }
    function spawnWarn(text) {
        spawnStats.warnings++;
        spawnStats.last.push(text);
        if (spawnStats.last.length > 10) spawnStats.last.shift();
        if (spawnStats.warnings <= SPAWN.warnLimit) console.warn(`UF_World: ${text}`);
    }
    /**
     * The cell a unit asked for (x, y) is put on: (x, y) when World.cellFree accepts it, else the nearest free cell
     * within `radius` (6 by default), widening to SPAWN.maxRadius (24). With no free cell that far, the nearest cell
     * that is at least walkable (World.walkable: tiles, water, objects) even if another unit stands there, with a
     * warning; with none of those either, (x, y) itself, with a warning. Returns { x, y, how, dist }.
     */
    function seatCell(ax, ay, x, y, radius, name, ignoreId = 0, z = 0) {
        const W = World;
        if (W.cellFree(ax, ay, x, y, ignoreId, z)) return { x, y, how: "asked", dist: 0 };
        const r0 = Math.max(1, Math.min(SPAWN.maxRadius, radius > 0 ? radius | 0 : SPAWN.radius));
        let c = W.nearestFreeCell(ax, ay, x, y, r0, ignoreId, z);
        let how = "moved";
        if (!c && r0 < SPAWN.maxRadius) {
            c = W.nearestFreeCell(ax, ay, x, y, SPAWN.maxRadius, ignoreId, z);
            how = "widened";
        }
        if (!c) {
            // Nothing free within 24 cells: the nearest walkable cell, sharing it with a unit rather than standing in a
            // tree, a wall or water.
            let best = null, bestD = Infinity;
            for (let dy = -SPAWN.maxRadius; dy <= SPAWN.maxRadius; dy++) {
                for (let dx = -SPAWN.maxRadius; dx <= SPAWN.maxRadius; dx++) {
                    const d = dx * dx + dy * dy;
                    if (d < bestD && W.walkable(ax, ay, x + dx, y + dy, { z })) { best = { x: x + dx, y: y + dy }; bestD = d; }
                }
            }
            if (best) {
                const other = W.units().find(o => o.id !== ignoreId && o.area.x === ax && o.area.y === ay && o.x === best.x && o.y === best.y && zOf(o) === z);
                spawnWarn(`no free cell within ${SPAWN.maxRadius} of (${x},${y}) in area (${ax},${ay}) for "${name}": placed on walkable (${best.x},${best.y})${other ? ` where "${other.name}" (unit ${other.id}) stands` : ""}`);
                c = best;
                how = "shared";
            } else {
                spawnWarn(`no walkable cell within ${SPAWN.maxRadius} of (${x},${y}) in area (${ax},${ay}) for "${name}": left on the blocked cell it asked for`);
                return { x, y, how: "stuck", dist: 0 };
            }
        }
        return { x: c.x, y: c.y, how, dist: Math.max(Math.abs(c.x - x), Math.abs(c.y - y)) };
    }
    World.spawnCellFor = (ax, ay, x, y, radius = SPAWN.radius, name = "a unit", z = 0) => seatCell(ax, ay, x | 0, y | 0, radius, name, 0, z);
    /** Counts since the world was created (or loaded): units added, how they were seated, object refusals, regrowth waits. */
    World.spawnStats = () => JSON.parse(JSON.stringify(spawnStats));

    // An object type that stops units (UF_Objects: not passable; a bridge never blocks).
    function typeBlocks(type) {
        const f = typeFlags()[type] | 0;
        return (f & T_BLOCK) !== 0 && (f & T_BRIDGE) === 0;
    }
    // The first unit standing on a cell of a level (z left out = the ground) that doesn't pass through everything, or null.
    function standerAt(ax, ay, x, y, z = 0) {
        const units = World.state ? World.state.units : null;
        if (!units) return null;
        for (const id in units) {
            const u = units[id];
            if (u.x === x && u.y === y && u.area.x === ax && u.area.y === ay && zOf(u) === z && !(u.data && u.data.through)) return u;
        }
        return null;
    }
    World.standerAt = (ax, ay, x, y, z = 0) => standerAt(ax, ay, x, y, z);

    // Regrowth waits while a unit stands on the cell: every due entry of UF.Objects' regrow list whose new type blocks
    // and whose cell holds a unit is put off by an hour, just before UF_Objects processes the list (on time:hour, and
    // around UF.Objects.processRegrow). World.setObject would refuse it anyway; this keeps the entry instead of losing it.
    function holdOccupiedRegrowth() {
        const O = window.UF && UF.Objects;
        if (!World.state || !O || !O.regrowList || !O.hourNow || (guardOff && guardOff.objects)) return 0;
        const list = O.regrowList();
        if (!list.length) return 0;
        // Without UF_Core's clock UF_Objects counts hours itself and adds this hour just after this runs.
        const now = O.hourNow() + (window.$ufTime ? 0 : 1);
        let held = 0;
        for (const e of list) {
            if (!(e.due <= now) || !e.area || !typeBlocks(e.to)) continue;
            if ((World.getObject(e.area.x, e.area.y, e.x, e.y, zOf(e)) | 0) !== e.from) continue;
            if (!standerAt(e.area.x, e.area.y, e.x, e.y, zOf(e))) continue;
            e.due = now + 1;
            held++;
        }
        spawnStats.regrowWaits += held;
        return held;
    }
    World.holdOccupiedRegrowth = holdOccupiedRegrowth;
    // Registered at load: UF_World loads before UF_Objects, so this runs before its regrowth on every time:hour.
    if (window.UF.Events && UF.Events.on) {
        UF.Events.on("time:hour", holdOccupiedRegrowth);
        UF.Events.on("colonists:exhaustion", refreshUnitMovement);
        UF.Events.on("condition:applied", refreshUnitMovement);
        UF.Events.on("condition:removed", refreshUnitMovement);
        UF.Events.on("condition:stood_up", refreshUnitMovement);
        UF.Events.on("condition:cleared", refreshUnitMovement);
    }
    function wrapRegrowth() {
        const O = window.UF && UF.Objects;
        if (!O || typeof O.processRegrow !== "function" || O.processRegrow._ufHeldForUnits) return;
        const _processRegrow = O.processRegrow;
        O.processRegrow = function() {
            holdOccupiedRegrowth();
            return _processRegrow.apply(this, arguments);
        };
        O.processRegrow._ufHeldForUnits = true;
        // Keep the hold first among time:hour listeners, whatever the plugin order.
        const L = window.UF.Events && UF.Events._listeners && UF.Events._listeners["time:hour"];
        const i = L ? L.indexOf(holdOccupiedRegrowth) : -1;
        if (i > 0) {
            L.splice(i, 1);
            L.unshift(holdOccupiedRegrowth);
        }
    }

    /**
     * Add a unit. spec: { name, image: { characterName, characterIndex }, area: { x, y }, x, y, dir, data,
     * snapToFree: true | number, exact: true }.
     * The unit appears only on a cell it can stand on (World.cellFree: no tree, wall, boulder, shut door, water or other
     * unit): the cell asked for when it's free, else the nearest free one (radius snapToFree when it's a number, else
     * 6, widening to 24). See seatCell for the last resorts. Not moved: units with data.through (fliers pass through
     * everything) and exact: true (test fixtures that must control the cell; that cell must be one the unit can stand
     * on, and a warning names it when it isn't).
     */
    World.addUnit = function(spec) {
        const st = this.state;
        // The unit's level: spec.z, else spec.area.z, else the ground. Anything but -2..+2 is refused (VISION V80).
        const z = spec.z !== undefined ? spec.z : zOf(spec.area);
        if (!isLevel(z)) throw new Error(`UF_World.addUnit: level ${JSON.stringify(z)} doesn't exist (levels are -2..+2)`);
        const id = st.nextUnitId++;
        const image = spec.image || {};
        const data = spec.data || {};
        if (!data.equipment) data.equipment = {};
        if (!data.inventory) data.inventory = [];
        const name = spec.name || `TEST_unit_${id}`;
        let sx = spec.x | 0, sy = spec.y | 0;
        spawnStats.added++;
        if (data.through) spawnStats.through++;
        else if (spec.exact === true && !(guardOff && guardOff.exact)) {
            spawnStats.exact++;
            if (seatLater === null && !this.cellFree(spec.area.x, spec.area.y, sx, sy, 0, z)) spawnWarn(`"${name}" placed with exact: true on (${sx},${sy}) in area (${spec.area.x},${spec.area.y})${z ? ` at level ${z}` : ""}, a cell it can't stand on`);
        } else if (seatLater !== null) {
            seatLater.push(id);
        } else if (!(guardOff && guardOff.units)) {
            const c = seatCell(spec.area.x, spec.area.y, sx, sy, typeof spec.snapToFree === "number" ? spec.snapToFree : SPAWN.radius, name, 0, z);
            spawnStats[c.how]++;
            if (c.dist > spawnStats.maxMove) spawnStats.maxMove = c.dist;
            sx = c.x;
            sy = c.y;
        }
        const u = {
            id,
            name,
            image: { characterName: image.characterName || "", characterIndex: image.characterIndex || 0 },
            area: { x: spec.area.x, y: spec.area.y },
            x: sx,
            y: sy,
            z,
            dir: project4(spec.dir || 2),
            dir8: spec.dir || 2,
            goal: null,
            stuckFrames: 0,
            data
        };
        st.units[id] = u;
        if (u.data && u.data.faction && (!u.data.callings || u.data.callings.length < 3) && (u.data.kind === "person" || u.data.kind === "colonist" || u.data.species)) {
            let Callings = window.UF && UF.Callings;
            if (!Callings && typeof require === "function") {
                try { Callings = require("./UF_Callings.js"); } catch (_) {
                    try { Callings = require("./game/js/plugins/UF_Callings.js"); } catch (_) {}
                }
            }
            if (Callings && Callings.assignCallings) Callings.assignCallings(u);
        }
        offOcc = null;
        if (this.isDisplayed(u) && !$gamePlayer.isTransferring()) spawnUnitEvent(u);
        invalidateUnitsCache();
        emit("world:unitAdded", u);
        return u;
    };
    let _unitsCache = null;
    function invalidateUnitsCache() { _unitsCache = null; }
    World.invalidateUnitsCache = invalidateUnitsCache;
    World.unit = id => (World.state && World.state.units[id]) || null;
    World.units = function() {
        if (!World.state || !World.state.units) return [];
        if (_unitsCache) return _unitsCache;
        return (_unitsCache = Object.values(World.state.units));
    };
    /** Units in an area on one level (z left out = the ground). */
    World.unitsInArea = function(ax, ay, z = 0) {
        const all = this.units();
        const res = [];
        for (let i = 0; i < all.length; i++) {
            const u = all[i];
            if (u && u.area.x === ax && u.area.y === ay && zOf(u) === z) {
                res.push(u);
            }
        }
        return res;
    };
    World.unitByName = function(name) {
        const all = this.units();
        for (let i = 0; i < all.length; i++) {
            if (all[i].name === name) return all[i];
        }
        return null;
    };
    World.removeUnit = function(id) {
        const u = this.unit(id);
        if (!u) return false;
        despawnUnitEvent(u);
        forgetPath(id);
        delete this.state.units[id];
        offOcc = null;
        invalidateUnitsCache();
        emit("world:unitRemoved", u);
        return true;
    };
    /**
     * Send a unit toward { area: { x, y }, x, y }. It walks there across areas, on or off screen. On screen it follows
     * a planned path; a goal cell it can't stand on (a tree, a wall site) ends at its nearest reachable open neighbour.
     */
    World.sendUnit = function(id, goal) {
        const u = this.unit(id);
        // The goal's level: goal.z, else goal.area.z, else the ground.
        const gz = goal && goal.z !== undefined ? goal.z : zOf(goal && goal.area);
        if (!u || !goal || !goal.area || !this.inWorld(goal.area.x, goal.area.y, gz)) return false;
        if (unitMoveSpeed(u) === 0) return false;
        const Cond = window.UF && UF.Conditions;
        if (Cond) {
            if (typeof Cond.canMove === "function" && !Cond.canMove(u)) return false;
            if (typeof Cond.canWillinglyMoveTo === "function" && !Cond.canWillinglyMoveTo(u, goal.x, goal.y)) return false;
        }
        const same = !!u.goal && sameArea(u.goal.area, goal.area) && u.goal.x === (goal.x | 0) && u.goal.y === (goal.y | 0) && zOf(u.goal) === gz;
        u.goal = { area: { x: goal.area.x, y: goal.area.y }, x: goal.x | 0, y: goal.y | 0, z: gz };
        u.stuckFrames = 0;
        if (!same) pathCache.delete(id);
        return true;
    };
    World.stopUnit = id => {
        const u = World.unit(id);
        if (u) u.goal = null;
        pathCache.delete(id);
    };
    World.unitMoveSpeed = unitMoveSpeed;
    World.refreshUnitMovement = refreshUnitMovement;
    World.eventIdOf = id => EVENT_BASE + id;
    /** True when the unit's level is the one on screen (its event exists there). */
    World.isDisplayed = u => !!u && onView(u.area.x, u.area.y, zOf(u));
    World.eventOf = function(id) {
        const u = this.unit(id);
        if (!u || !this.isDisplayed(u) || !window.$gameMap) return null;
        return $gameMap._events[EVENT_BASE + id] || null;
    };
    World.unitOfEvent = ev => (ev && ev.eventId && ev.eventId() >= EVENT_BASE ? World.unit(ev.eventId() - EVENT_BASE) : null);
    World.unitOfCharacter = function(ch) {
        if (!ch) return null;
        if (window.$gamePlayer && ch === $gamePlayer) {
            const pid = window.UF && UF.Factions && typeof UF.Factions.playerId === "function" ? UF.Factions.playerId() : "player";
            return {
                id: -1,
                isPlayer: true,
                data: { kind: "player", faction: pid }
            };
        }
        if (typeof ch.eventId === "function") {
            return World.unitOfEvent(ch);
        }
        return null;
    };

    /**
     * True when unit A and unit B are allies who can move freely through each other.
     * Hostiles (enemies, predators, warring factions) and non-unit obstacles (chests, boulders) return false.
     */
    World.areAllies = function(a, b) {
        if (a === b) return true;
        const resolve = ref => {
            if (!ref) return null;
            if (typeof ref === "number") return World.unit(ref);
            if (typeof ref === "object") {
                if (ref.isPlayer || (ref.data && ref.data.kind === "player")) return ref;
                if (ref.id !== undefined && ref.data !== undefined) return ref;
                return World.unitOfCharacter(ref);
            }
            return null;
        };
        const uA = resolve(a);
        const uB = resolve(b);
        if (!uA || !uB) return false;
        if (uA.id === uB.id && uA.id !== undefined && uA.id !== -1) return true;
        if (uA.isPlayer && uB.isPlayer) return true;

        const dA = uA.data || {};
        const dB = uB.data || {};

        // Active combat targeting check: if either is actively attacking the other, they are enemies
        if (dA.combat && dA.combat.targetId !== null && dA.combat.targetId !== undefined && dA.combat.targetId === uB.id) return false;
        if (dB.combat && dB.combat.targetId !== null && dB.combat.targetId !== undefined && dB.combat.targetId === uA.id) return false;

        // Explicit hostile tags or side
        const tagsA = Array.isArray(dA.tags) ? dA.tags : [];
        const tagsB = Array.isArray(dB.tags) ? dB.tags : [];
        const isHostileA = tagsA.includes("hostile") || dA.hostile === true || dA.side === "hostile";
        const isHostileB = tagsB.includes("hostile") || dB.hostile === true || dB.side === "hostile";
        if (isHostileA !== isHostileB) return false;

        // Faction resolution
        const pid = window.UF && UF.Factions && typeof UF.Factions.playerId === "function" ? UF.Factions.playerId() : "player";
        let facA = dA.faction;
        let facB = dB.faction;
        if (facA === "player") facA = pid;
        if (facB === "player") facB = pid;
        if (!facA && (dA.kind === "colonist" || uA.isPlayer)) facA = pid;
        if (!facB && (dB.kind === "colonist" || uB.isPlayer)) facB = pid;

        // If both belong to the same faction (e.g. all colony members and player)
        if (facA && facB && facA === facB) return true;

        // Check faction relations
        if (facA && facB && window.UF && UF.Factions && typeof UF.Factions.relation === "function") {
            const rel = UF.Factions.relation(facA, facB);
            if (rel >= 15) return true;
            if (rel <= -15) return false;
        }

        // Colonist kind check: colonists in the settlement are allies
        if (dA.kind === "colonist" && dB.kind === "colonist") return true;
        if ((dA.kind === "colonist" && uB.isPlayer) || (dB.kind === "colonist" && uA.isPlayer)) return true;

        // Combat side check
        const C = window.UF && UF.Combat;
        if (C && typeof C.sideOf === "function") {
            const sideA = C.sideOf(uA);
            const sideB = C.sideOf(uB);
            if (sideA && sideB) return sideA === sideB;
        }

        // If both are hostile creatures in the wild (e.g. wolf pack)
        if (isHostileA && isHostileB) return true;

        return false;
    };
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
        const areasX = World.state.areasX || 1;
        const areasY = World.state.areasY || 1;
        let x = pos.x + dx, y = pos.y + dy, ax = pos.area.x, ay = pos.area.y;
        if (x < 0) {
            ax--;
            x += size;
            if (ax < 0) ax = areasX - 1;
        } else if (x >= size) {
            ax++;
            x -= size;
            if (ax >= areasX) ax = 0;
        }
        if (y < 0) {
            ay--;
            y += size;
            if (ay < 0) ay = areasY - 1;
        } else if (y >= size) {
            ay++;
            y -= size;
            if (ay >= areasY) ay = 0;
        }
        const crossed = ax !== pos.area.x || ay !== pos.area.y;
        return { ax, ay, x, y, crossed };
    }

    function goalDelta(u) {
        const size = World.state.size;
        const areasX = World.state.areasX || 1;
        const areasY = World.state.areasY || 1;
        const totalW = size * areasX;
        const totalH = size * areasY;
        const gx = u.goal.area.x * size + u.goal.x, gy = u.goal.area.y * size + u.goal.y;
        const cx = u.area.x * size + u.x, cy = u.area.y * size + u.y;
        let ddx = gx - cx;
        let ddy = gy - cy;
        if (Math.abs(ddx) > totalW / 2) {
            ddx = ddx > 0 ? ddx - totalW : ddx + totalW;
        }
        if (Math.abs(ddy) > totalH / 2) {
            ddy = ddy > 0 ? ddy - totalH : ddy + totalH;
        }
        const step = stepToward(ddx, ddy);
        return { dx: step.dx, dy: step.dy, dist: Math.max(Math.abs(ddx), Math.abs(ddy)) };
    }

    function arrive(u) {
        u.goal = null;
        u.stuckFrames = 0;
        pathCache.delete(u.id);
        emit("world:unitArrived", u);
    }

    // A unit changed square (DEUS-TSK-FABLE-11): world:unitMoved(u, from, to); UF_Colonists hands it to UF.Conditions
    // so a grappler that walked away lets go at once. Only real changes emit (the on-screen sync runs every frame).
    function notifyMoved(u, fx, fy) {
        if (u.x !== fx || u.y !== fy) emit("world:unitMoved", u, { x: fx, y: fy }, { x: u.x, y: u.y });
    }
    function moveUnitToArea(u, ax, ay, x, y) {
        const from = { x: u.area.x, y: u.area.y };
        const fx = u.x, fy = u.y;
        pathCache.delete(u.id);
        if (World.isDisplayed(u)) despawnUnitEvent(u);
        u.area = { x: ax, y: ay };
        offOcc = null;
        u.x = x;
        u.y = y;
        if (World.isDisplayed(u) && !$gamePlayer.isTransferring()) spawnUnitEvent(u);
        emit("world:unitAreaChanged", u, from, { x: ax, y: ay });
        notifyMoved(u, fx, fy);
    }

    /**
     * Put a unit on another level of its area, at (x, y) (default: where it is). Its goal and path are dropped (a goal
     * is on one level); its event leaves the screen or appears on it. Emits world:unitLevelChanged(unit, fromZ, toZ).
     * UF_Levels calls it for stairs, ramps and falls; tests call it directly.
     */
    World.moveUnitToLevel = function(unit, z, x, y, opts = {}) {
        const u = typeof unit === "object" ? unit : this.unit(unit);
        if (!u || !isLevel(z) || !this.state || this.state.units[u.id] !== u) return false;
        if (![x === undefined ? u.x : x, y === undefined ? u.y : y].every(c => Number.isInteger(c) && c >= 0 && c < this.state.size)) return false;
        const from = zOf(u);
        if (!opts.keepPath) {
            forgetPath(u.id);
            u.goal = null;
            u.stuckFrames = 0;
        }
        if (this.isDisplayed(u)) despawnUnitEvent(u);
        u.z = z;
        offOcc = null;
        if (x !== undefined && x !== null) u.x = x | 0;
        if (y !== undefined && y !== null) u.y = y | 0;
        if (this.isDisplayed(u) && !$gamePlayer.isTransferring()) spawnUnitEvent(u);
        emit("world:unitLevelChanged", u, from, z);
        return true;
    };
    /** Give every unit on the level on screen an event (after a view change; a unit added mid-transfer has none). Returns how many were added. */
    World.reconcileEvents = function() {
        const v = this.viewLevel();
        if (!v || !window.$gameMap || !window.$dataMap || $gamePlayer.isTransferring()) return 0;
        let added = 0;
        for (const u of this.unitsInArea(v.x, v.y, v.z)) {
            const ev = $gameMap._events[EVENT_BASE + u.id];
            if (ev) {
                if (ev.x !== u.x || ev.y !== u.y) {
                    ev.locate(u.x, u.y);
                }
                continue;
            }
            spawnUnitEvent(u);
            added++;
        }
        return added;
    };

    const goalReached = u => {
        if (!u || !u.goal) return true;
        if (u.goal.z !== undefined && u.goal.z !== zOf(u)) return false;
        return goalDelta(u).dist === 0;
    };

    // Units on levels that aren't on screen, by cell: built once per map update when an off-screen unit steps, kept
    // up to date as they step (two units never step onto one cell in the same update).
    let offOcc = null, offOccFrame = -1;
    const occKey = (ax, ay, z, x, y) => {
        const d = worldDims(), size = World.state.size;
        return (((z + 2) * d.areasY + ay) * d.areasX + ax) * size * size + y * size + x;
    };
    function offscreenOccupancy() {
        if (offOcc && offOccFrame === World._frame) return offOcc;
        offOcc = new Map();
        offOccFrame = World._frame;
        for (const o of World.units()) {
            if (o.data && o.data.through) continue;
            const k = occKey(o.area.x, o.area.y, zOf(o), o.x, o.y);
            const list = offOcc.get(k) || [];
            list.push(o);
            offOcc.set(k, list);
        }
        return offOcc;
    }
    function occMove(u, fromX, fromY) {
        if (!offOcc || offOccFrame !== World._frame || (u.data && u.data.through)) return;
        const a = occKey(u.area.x, u.area.y, zOf(u), fromX, fromY), b = occKey(u.area.x, u.area.y, zOf(u), u.x, u.y);
        const listA = offOcc.get(a);
        if (listA) {
            const idx = listA.findIndex(o => o.id === u.id);
            if (idx >= 0) listA.splice(idx, 1);
            if (!listA.length) offOcc.delete(a);
        }
        const listB = offOcc.get(b) || [];
        listB.push(u);
        offOcc.set(b, listB);
    }

    // Off screen, walkers on their own area follow a planned path on their own level, one cell per step, like the
    // on-screen stepAlongPath (VISION V80: with the view on another level the whole colony is off screen, and a
    // straight line crosses trees, walls, water and rock). They wait for a unit in the way, then walk round it.
    function stepOffscreenAlongPath(u) {
        const tgt = localTarget(u);
        let p = pathCache.get(u.id);
        if (!p || p.stale || p.key !== tgt.key) {
            if (planQueued.has(u.id)) return;
            if (planBudget <= 0) {
                enqueuePlan(u.id);
                return;
            }
            p = planFor(u, u);
            if (!p) return;
        }
        const size = World.state.size, n2 = size * size;
        const curZ = zOf(u);
        const here = p.is3D ? ((curZ + 2) * n2 + u.y * size + u.x) : (u.y * size + u.x);
        const left = p.cells.length - p.i;
        if (left < p.bestLeft) {
            p.bestLeft = left;
            p.bestAt = World._frame;
        } else if (World._frame - p.bestAt > PATHS.progressFrames) {
            return blockUnit(u, "no way past");
        }
        if (p.i >= p.cells.length) {
            if (!p.partial && here === p.end) return arrive(u);
            p.stale = true; // the end of a partial plan: the next step plans the next leg
            return;
        }
        const next = p.cells[p.i];
        let nx, ny, nz;
        if (p.is3D) {
            const l = Math.floor(next / n2);
            nz = l - 2;
            const rem = next - l * n2;
            nx = rem % size;
            ny = (rem - nx) / size;
        } else {
            nz = curZ;
            nx = next % size;
            ny = (next - nx) / size;
        }
        if (nz !== curZ) {
            World.moveUnitToLevel(u, nz, nx, ny, { keepPath: true });
            p.i++;
            p.fails = 0;
            u.stuckFrames = 0;
            return;
        }
        const here2D = u.y * size + u.x, next2D = ny * size + nx;
        const d = dirTo(u.x, u.y, nx, ny);
        if (!d || !stepOpen(u, here2D, next2D, d)) {
            p.stale = true;
            pathStats.replans++;
            return;
        }
        const occBlocked = (x, y) => {
            const list = offscreenOccupancy().get(occKey(u.area.x, u.area.y, zOf(u), x, y));
            if (!list || !list.length) return false;
            return list.some(o => o.id !== u.id && !World.areAllies(u, o));
        };
        let blockedAt = occBlocked(nx, ny) ? next : -1, viaCorner = 0;
        if (blockedAt < 0 && isDiag(d)) {
            const takenH = occBlocked(nx, u.y), takenV = occBlocked(u.x, ny);
            if (takenH && takenV) blockedAt = u.y * size + nx;
            else if (takenH) viaCorner = ny > u.y ? 2 : 8;
            else if (takenV) viaCorner = nx > u.x ? 6 : 4;
        }
        if (blockedAt >= 0) {
            faceUnit(u, d);
            pathStats.waitFrames++;
            if (++p.wait * CONFIG.unitStepFrames <= PATHS.waitFrames) return;
            p.wait = 0;
            if (blockedAt === next && !p.partial && p.i === p.cells.length - 1) return blockUnit(u, "goal occupied");
            p.avoid = blockedAt;
            p.stale = true;
            pathStats.detours++;
            return;
        }
        p.wait = 0;
        const fx = u.x, fy = u.y;
        u.x = viaCorner === 2 || viaCorner === 8 ? fx : nx;
        u.y = viaCorner === 4 || viaCorner === 6 ? fy : ny;
        faceUnit(u, viaCorner || d);
        occMove(u, fx, fy);
        notifyMoved(u, fx, fy);
        if (!viaCorner) p.i++;
        p.fails = 0;
        u.stuckFrames = 0;
        if (!p.partial && p.i >= p.cells.length && next === p.end) arrive(u);
    }

    // Off screen: one cell per UnitStepFrames. Walkers in their own area follow a path (above); fliers, paths switched
    // off and goals in another area step straight toward the goal (terrain isn't checked for those).
    function stepOffscreen(u) {
        if (goalReached(u)) return arrive(u);
        if (PATHS.enabled && PATHS.offscreenPaths && !(u.data && u.data.through) && sameArea(u.goal.area, u.area)) return stepOffscreenAlongPath(u);
        const g = goalDelta(u);
        const w = wrapStep(u, g.dx, g.dy);
        if (!World.inWorld(w.ax, w.ay)) return arrive(u);
        faceUnit(u, dir8Of(g.dx, g.dy));
        if (w.crossed) moveUnitToArea(u, w.ax, w.ay, w.x, w.y);
        else {
            const fx = u.x, fy = u.y;
            u.x = w.x;
            u.y = w.y;
            notifyMoved(u, fx, fy);
        }
        if (u.goal && goalReached(u)) arrive(u);
    }

    // On screen: the unit's event walks its planned path (stepAlongPath) with RMMZ movement; at an area edge it steps
    // into the next area. Units that pass through everything (fliers) and paths switched off use the
    // direct step below.
    function stepOnscreen(u, ev) {
        if (ev.isMoving()) return;
        if (goalReached(u)) return arrive(u);
        const g = goalDelta(u);
        const w = wrapStep(u, g.dx, g.dy);
        if (w.crossed) {
            if (!World.inWorld(w.ax, w.ay)) return arrive(u);
            faceUnit(u, dir8Of(g.dx, g.dy));
            moveUnitToArea(u, w.ax, w.ay, w.x, w.y);
            return;
        }
        if (PATHS.enabled && !ev.isThrough()) return stepAlongPath(u, ev, false);
        stepDirect(u, ev, g);
    }

    // The step used before paths (2026-09-18): RMMZ's findDirectionTo toward the goal (UF_Movement8D: 8-way, never across
    // a blocked corner); after STUCK_LIMIT frames without a step the goal is dropped and world:unitBlocked is emitted.
    function stepDirect(u, ev, g) {
        const { tx, ty } = localTarget(u);
        const h = g.dx > 0 ? 6 : 4, v = g.dy > 0 ? 2 : 8;
        let tried = false;
        if (g.dx !== 0 && g.dy !== 0 && tx !== ev.x && ty !== ev.y && ev.canPassDiagonally(ev.x, ev.y, h, v)) {
            ev.moveDiagonally(h, v);
            tried = true;
        } else {
            const d = ev.findDirectionTo(tx, ty);
            if (d > 0) {
                // findDirectionTo answers 1-9 in 8-way: a diagonal goes through moveInDirection8D, never moveStraight.
                if (ev.moveInDirection8D) ev.moveInDirection8D(d);
                else ev.moveStraight(d);
                tried = true;
            }
        }
        // No direction at all (fully enclosed) counts as a failed step too, so the goal is dropped and
        // world:unitBlocked fires instead of the unit waiting forever (found by the jobs suite, 2026-09-18).
        if (tried && ev.isMovementSucceeded()) {
            // The event already faces the step it just took (RMMZ sets it in moveStraight); a unit walking around a
            // tree faces where it walks, not the far goal (user rule 2026-09-18).
            u.stuckFrames = 0;
        } else if (++u.stuckFrames > STUCK_LIMIT) {
            blockUnit(u, "stuck");
        }
    }

    World.update = function() {
        if (!this.state) return;
        this._frame++;
        planBudget = PATHS.plansPerUpdate;
        if (planQueue.length) servePlanQueue();
        const view = this.viewLevel();
        const steps = CONFIG.unitStepFrames, frame = this._frame;
        for (const u of this.units()) {
            if (!isLevel(zOf(u))) continue;
            if (view && u.area.x === view.x && u.area.y === view.y && zOf(u) === view.z) {
                const ev = $gameMap._events[EVENT_BASE + u.id];
                if (!ev) {
                    if (u.goal && (frame + u.id) % steps === 0) stepOffscreen(u);
                    continue;
                }
                const fx = u.x, fy = u.y;
                u.x = ev.x;
                u.y = ev.y;
                notifyMoved(u, fx, fy);
                u.dir = ev.direction();
                u.dir8 = ev.dir8 ? ev.dir8() : u.dir;
                if (u.goal) stepOnscreen(u, ev);
            } else if (u.goal && (frame + u.id) % steps === 0) {
                // Off-screen steps are spread over the frames by unit id, so hundreds of units don't all step at once.
                stepOffscreen(u);
            }
        }
    };

    //-------------------------------------------------------------------------
    // Paths (user 2026-09-19: "Paths should not go through walls")
    //
    // A* over an area's whole grid, 8-way (VISION V3; 4-way with UF_Movement8D's FourWay), octile costs (5 straight,
    // 7 diagonal), binary heap, typed arrays allocated once and stamped per search. A diagonal step is planned only when
    // both of its orthogonal neighbours are open to this unit and all four straight moves round that corner are
    // allowed: never across a blocked corner (a wall, a tree, water, a shut door, the cell to walk round).
    // Passability is the on-screen stepping rule, per cell and per direction: the tiles' passage flags (RMMZ
    // checkPassage: top layer first, [*] tiles skipped), no water, no blocking object (the catalog's `passable`
    // flag, as UF_Objects blocks on screen; a door is open to the units UF_Doors lets through; a bridge is walkable
    // whatever its water says, as UF_Roads makes it on screen). Other units are ignored when planning.
    // A region map (cells joined by passable steps, doors open) answers "no path" without searching.
    // Plans are runtime only: never saved; a loaded game plans again.

    const PATHS = {
        enabled: true,
        maxNodes: 12000,     // cells expanded before a search gives up (then: a partial plan toward the goal)
        plansPerUpdate: 4,   // new plans per map update; the rest wait in a queue, oldest first
        waitFrames: 30,      // frames a unit waits for another unit in its way before it walks round it
        maxStepFails: 3,     // steps the map refuses in a row (planner and map disagree) before the unit gives up
        maxPartialLegs: 8,   // partial plans in a row toward one goal before the unit gives up
        progressFrames: 600, // map updates without the path left getting shorter (walking round units that never move
                             // aside, back and forth between two blocked gaps) before the unit gives up
        offscreenPaths: true // off-screen walkers follow paths too (VISION V80); false = the old straight step (tests)
    };
    const WATER_BIT = 16;
    const BIT_DOWN = 1, BIT_LEFT = 2, BIT_RIGHT = 4, BIT_UP = 8; // RMMZ passage bits of directions 2, 4, 6, 8
    const T_BLOCK = 1, T_DOOR = 2, T_BRIDGE = 4;                 // object type flags
    const HEAP_TIE = 1048576;                                    // heap key f * HEAP_TIE - g: on equal f, deeper first
    const STEP_COST = 5, DIAG_COST = 7;                          // octile step costs (7/5 = 1.4)
    const grids = new WeakMap();   // a built map ($dataMap or a peek-cache build) -> its walk grid
    let typeTable = null;          // { list, doors, roads, flags: Uint8Array by object type number }
    let typeEpoch = 0;             // bumped when the type table changes: every grid recomputes its cells
    const pathCache = new Map();   // unit id -> { key, cells: Int32Array, i, end, partial, legs, wait, fails, avoid, stale }
    const planQueue = [];          // unit ids waiting for a plan, oldest first
    const planQueued = new Set();
    let planBudget = PATHS.plansPerUpdate;
    let pathStats = newPathStats();

    function newPathStats() {
        return {
            plans: 0, found: 0, partial: 0, none: 0, ms: 0, maxMs: 0, expanded: 0, maxExpanded: 0,
            recentMs: [], recentExpanded: [], queuedTotal: 0, queuePeak: 0, replans: 0, detours: 0, waitFrames: 0,
            blocked: {}, regionBuilds: 0, regionMs: 0, gridBuilds: 0, gridMs: 0
        };
    }
    function clearPaths(resetStats) {
        pathCache.clear();
        planQueue.length = 0;
        planQueued.clear();
        if (resetStats) pathStats = newPathStats();
    }
    function forgetPath(id) {
        pathCache.delete(id);
        planQueued.delete(id);
    }

    // Object type flags from UF_Objects' list (T_BLOCK = not passable), UF_Doors (T_DOOR) and UF_Roads (T_BRIDGE).
    function typeFlags() {
        const O = window.UF && UF.Objects, D = (window.UF && UF.Doors) || null, R = (window.UF && UF.Roads) || null;
        const list = O && O.types ? O.types() : null;
        if (typeTable && typeTable.list === list && typeTable.doors === D && typeTable.roads === R) return typeTable.flags;
        const flags = new Uint8Array(65536);
        const bridge = R && R.bridgeTypeId ? R.bridgeTypeId() : 0;
        if (list) {
            for (const t of list) {
                let f = t.passable === true ? 0 : T_BLOCK;
                if (D && D.isDoorType && D.isDoorType(t)) f |= T_DOOR;
                if (bridge && t.typeId === bridge) f |= T_BRIDGE;
                flags[t.typeId] = f;
            }
        }
        typeTable = { list, doors: D, roads: R, flags };
        typeEpoch++;
        return flags;
    }

    // Passage bits of a cell from its tiles (bit set = RMMZ checkPassage passes that direction), plus WATER_BIT.
    function tileBits(data, cells, i, flags) {
        let bits = 0;
        for (let b = 1; b <= 8; b <<= 1) {
            for (let layer = 3; layer >= 0; layer--) {
                const f = flags[data[layer * cells + i]] | 0;
                if (f & 0x10) continue; // [*] no effect on passage
                if ((f & b) === 0) bits |= b;
                break;                  // the first other tile decides
            }
        }
        if (Tilemap.isWaterTile(data[i])) bits |= WATER_BIT;
        return bits;
    }
    // Directions a unit may leave and enter the cell by (0 = nobody stands here): tiles, water and objects together.
    function effOf(g, tf, i) {
        const f = tf[g.objects[i]];
        if (f & T_BRIDGE) return 15;
        if ((f & T_BLOCK) && !(f & T_DOOR)) return 0;
        const p = g.pass[i];
        return (p & WATER_BIT) ? 0 : (p & 15);
    }

    // The built map and tileset flags of an area's level: the map on screen, or the peek cache's build.
    function areaMapOf(ax, ay, z = 0) {
        if (onView(ax, ay, z) && window.$dataMap && $dataMap.data && $dataMap.ufObjects) {
            return { map: $dataMap, flags: $gameMap.tilesetFlags() };
        }
        const map = World.peekArea(ax, ay, z);
        const ts = window.$dataTilesets && $dataTilesets[map.tilesetId];
        return { map, flags: ts ? ts.flags : [] };
    }

    function gridOf(map, flags) {
        const tf = typeFlags();
        let g = grids.get(map);
        if (g && g.flags === flags && g.objects === map.ufObjects) {
            if (g.epoch !== typeEpoch) {
                for (let i = 0; i < g.cells; i++) g.eff[i] = effOf(g, tf, i);
                g.epoch = typeEpoch;
                g.dirty = true;
            }
            return g;
        }
        const t0 = performance.now();
        const size = map.width, cells = size * map.height;
        g = { size, cells, flags, objects: map.ufObjects, pass: new Uint8Array(cells), eff: new Uint8Array(cells), region: null, regions: 0, dirty: true, epoch: typeEpoch };
        for (let i = 0; i < cells; i++) g.pass[i] = tileBits(map.data, cells, i, flags);
        for (let i = 0; i < cells; i++) g.eff[i] = effOf(g, tf, i);
        grids.set(map, g);
        pathStats.gridBuilds++;
        pathStats.gridMs += performance.now() - t0;
        return g;
    }

    // setTile / setObject changed a cell of a built map: update its walk grid (if it has one) and mark regions stale.
    function pathCellChanged(map, x, y, tileChanged) {
        const g = map ? grids.get(map) : null;
        if (!g || x < 0 || y < 0 || x >= g.size || y >= g.size) return;
        const i = y * g.size + x;
        if (tileChanged) g.pass[i] = tileBits(map.data, g.cells, i, g.flags);
        const e = effOf(g, typeFlags(), i);
        if (e !== g.eff[i]) {
            g.eff[i] = e;
            g.dirty = true;
        }
    }

    // Region labels (flood fill over passable steps, doors open), rebuilt only after a change.
    let regionStack = null;
    function regionsOf(g) {
        if (!g.dirty && g.region) return g.region;
        const t0 = performance.now();
        const size = g.size, n = g.cells, eff = g.eff;
        const region = g.region || new Int32Array(n);
        region.fill(0);
        if (!regionStack || regionStack.length < n) regionStack = new Int32Array(n);
        const stack = regionStack;
        let label = 0;
        for (let s = 0; s < n; s++) {
            if (region[s] !== 0 || eff[s] === 0) continue;
            region[s] = ++label;
            let top = 0;
            stack[top++] = s;
            while (top > 0) {
                const i = stack[--top], e = eff[i], x = i % size, y = (i - x) / size;
                let j = (y < size - 1) ? (i + size) : (i + size - n);
                if ((e & BIT_DOWN) && region[j] === 0 && (eff[j] & BIT_UP)) { region[j] = label; stack[top++] = j; }
                j = (y > 0) ? (i - size) : (i - size + n);
                if ((e & BIT_UP) && region[j] === 0 && (eff[j] & BIT_DOWN)) { region[j] = label; stack[top++] = j; }
                j = (x > 0) ? (i - 1) : (i - 1 + size);
                if ((e & BIT_LEFT) && region[j] === 0 && (eff[j] & BIT_RIGHT)) { region[j] = label; stack[top++] = j; }
                j = (x < size - 1) ? (i + 1) : (i + 1 - size);
                if ((e & BIT_RIGHT) && region[j] === 0 && (eff[j] & BIT_LEFT)) { region[j] = label; stack[top++] = j; }
            }
        }
        g.region = region;
        g.regions = label;
        g.dirty = false;
        pathStats.regionBuilds++;
        pathStats.regionMs += performance.now() - t0;
        return region;
    }

    // Search arrays, allocated once per grid size; a generation stamp marks what belongs to the current search.
    const AS = { n: 0, gen: 0 };
    function searchArrays(n) {
        if (AS.n < n) {
            AS.n = n;
            AS.gen = 0;
            AS.g = new Int32Array(n);
            AS.parent = new Int32Array(n);
            AS.seen = new Uint32Array(n);
            AS.closed = new Uint32Array(n);
            AS.goal = new Uint32Array(n);
            AS.heapCell = new Int32Array(4 * n + 8);
            AS.heapKey = new Float64Array(4 * n + 8);
            AS.trace = new Int32Array(n);
        }
        if (++AS.gen > 0xfffffff0) {
            AS.seen.fill(0);
            AS.closed.fill(0);
            AS.goal.fill(0);
            AS.gen = 1;
        }
        return AS.gen;
    }

    function recordPlan(res) {
        const s = pathStats;
        s.plans++;
        if (!res.cells) s.none++;
        else if (res.partial) s.partial++;
        else s.found++;
        s.ms += res.ms;
        if (res.ms > s.maxMs) {
            s.maxMs = res.ms;
            s.maxPlan = { ms: res.ms, expanded: res.expanded, reason: res.reason, regionMs: res.regionMs, length: res.cells ? res.cells.length : -1 };
        }
        s.expanded += res.expanded;
        if (res.expanded > s.maxExpanded) s.maxExpanded = res.expanded;
        s.recentMs.push(res.ms);
        s.recentExpanded.push(res.expanded);
        if (s.recentMs.length > 512) {
            s.recentMs.shift();
            s.recentExpanded.shift();
        }
    }

    /**
     * Plan a path in one area on one level. opts: { unit (record or id: doors), maxNodes, avoid (cell index to walk
     * round), allowPartial, resolveBlocked (default true), record, z (default area.z, else the ground) }. Returns
     * { cells: Int32Array (cell indices after the start, ending at `end`) | null, end, partial, expanded, ms, reason }.
     */
    function planPath(area, sx, sy, gx, gy, opts = {}) {
        const t0 = performance.now();
        const res = { cells: null, end: -1, partial: false, expanded: 0, ms: 0, regionMs: 0, reason: "", is3D: false };
        const done = reason => {
            res.reason = reason;
            res.ms = performance.now() - t0;
            World.lastPath = { reason, ms: res.ms, expanded: res.expanded, length: res.cells ? res.cells.length : -1, partial: res.partial };
            if (opts.record) recordPlan(res);
            return res;
        };
        const st = World.state;
        const sz = opts.z !== undefined ? opts.z : zOf(area);
        const gz = opts.tz !== undefined ? opts.tz : sz;
        if (!st || !area || !World.inWorld(area.x, area.y, sz) || !World.inWorld(area.x, area.y, gz)) return done("not in the world");
        const size = st.size, n = size * size;
        if (![sx, sy, gx, gy].every(v => Number.isInteger(v) && v >= 0 && v < size)) return done("outside the area");

        const is3D = !!(opts.z3d || gz !== sz || (st.version >= 4));
        if (is3D) {
            res.is3D = true;
            const totalNodes = 5 * n;
            const enc3D = (x, y, z) => (z + 2) * n + (y * size + x);
            const dec3D = c => {
                const l = Math.floor(c / n);
                const z = l - 2;
                const rem = c - l * n;
                const x = rem % size;
                const y = (rem - x) / size;
                return { x, y, z };
            };

            const tf = typeFlags(), D = typeTable.doors;
            const unit = opts.unit ? (typeof opts.unit === "object" ? opts.unit : World.unit(opts.unit)) : null;

            const gridsByZ = {};
            function getGrid(levelZ) {
                if (!gridsByZ[levelZ]) {
                    const { map, flags } = areaMapOf(area.x, area.y, levelZ);
                    gridsByZ[levelZ] = gridOf(map, flags);
                }
                return gridsByZ[levelZ];
            }

            const L = window.UF && UF.Levels;
            const shapeAt = (x, y, z) => (L && typeof L.shapeCodeAt === "function" ? L.shapeCodeAt(area.x, area.y, x, y, z) : (L && typeof L.shapeAt === "function" ? (L.shapeAt(area.x, area.y, x, y, z) === "floor" ? 2 : (L.shapeAt(area.x, area.y, x, y, z) === "ramp" ? 4 : (L.shapeAt(area.x, area.y, x, y, z) === "solid" ? 1 : 3))) : (z === 0 ? 2 : 3)));

            const enterable = (x, y, z) => {
                if (x < 0 || y < 0 || x >= size || y >= size || z < -2 || z > 2) return false;
                const s = shapeAt(x, y, z);
                if (s !== 2 && s < 4) return false;
                const g = getGrid(z);
                const i = y * size + x;
                if (g.eff[i] === 0) return false;
                if (D && (tf[g.objects[i]] & T_DOOR) !== 0 && !(unit && D.canUnitPass(unit, D.at({ x: area.x, y: area.y, z }, x, y)))) return false;
                if (window.UF && UF.Fire && typeof UF.Fire.isBurning === "function") {
                    if (UF.Fire.isBurning({ x: area.x, y: area.y, z }, x, y)) return false;
                }
                if (window.UF && UF.Fluid && typeof UF.Fluid.walkable === "function") {
                    if (!UF.Fluid.walkable(area.x, area.y, x, y, { z, canSwim: !!(unit && unit.canSwim), lavaImmune: !!(unit && unit.lavaImmune) })) return false;
                }
                return true;
            };

            const s = enc3D(sx, sy, sz), goalNode = enc3D(gx, gy, gz);
            const avoid = Number.isInteger(opts.avoid) ? opts.avoid : -1;

            const eight = !fourWay();
            let goals, hOff = 0;
            if (enterable(gx, gy, gz)) goals = [goalNode];
            else {
                if (opts.resolveBlocked === false) return done("goal blocked");
                hOff = eight ? DIAG_COST : STEP_COST;
                goals = [];
                for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                    const nx = (gx + dx + size) % size, ny = (gy + dy + size) % size;
                    if (enterable(nx, ny, gz)) goals.push(enc3D(nx, ny, gz));
                }
                if (eight) {
                    for (const [dx, dy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
                        const nx = (gx + dx + size) % size, ny = (gy + dy + size) % size;
                        if (enterable(nx, ny, gz) && enterable(nx, gy, gz) && enterable(gx, ny, gz)) {
                            goals.push(enc3D(nx, ny, gz));
                        }
                    }
                }
            }
            goals = goals.filter(c => c !== avoid);
            if (!goals.length) return done("goal walled in");
            if (goals.includes(s)) {
                res.cells = new Int32Array(0);
                res.end = s;
                return done("here");
            }
            if (!enterable(sx, sy, sz)) return done("start walled in");

            const gen = searchArrays(totalNodes);
            const G = AS.g, P = AS.parent, seen = AS.seen, closed = AS.closed, goalMark = AS.goal, hc = AS.heapCell, hk = AS.heapKey;
            for (const c of goals) goalMark[c] = gen;

            const hOf = (x, y, z) => {
                let ax = Math.abs(x - gx), ay = Math.abs(y - gy);
                if (ax > size / 2) ax = size - ax;
                if (ay > size / 2) ay = size - ay;
                const hHorz = eight
                    ? STEP_COST * (ax + ay) - (2 * STEP_COST - DIAG_COST) * (ax < ay ? ax : ay)
                    : STEP_COST * (ax + ay);
                const az = Math.abs(z - gz);
                const d = Math.max(hHorz, az * STEP_COST) - hOff;
                return d > 0 ? d : 0;
            };

            let hn = 0;
            const push = (c, key) => {
                let k = hn++;
                while (k > 0) {
                    const p = (k - 1) >> 1;
                    if (hk[p] <= key) break;
                    hk[k] = hk[p];
                    hc[k] = hc[p];
                    k = p;
                }
                hk[k] = key;
                hc[k] = c;
            };
            const pop = () => {
                const top = hc[0], last = --hn;
                if (last > 0) {
                    const key = hk[last], c = hc[last];
                    let k = 0;
                    for (;;) {
                        let ch = 2 * k + 1;
                        if (ch >= last) break;
                        if (ch + 1 < last && hk[ch + 1] < hk[ch]) ch++;
                        if (hk[ch] >= key) break;
                        hk[k] = hk[ch];
                        hc[k] = hc[ch];
                        k = ch;
                    }
                    hk[k] = key;
                    hc[k] = c;
                }
                return top;
            };

            let from = s;
            const relax = (j, gi) => {
                if (closed[j] === gen || j === avoid) return;
                if (seen[j] === gen && G[j] <= gi) return;
                seen[j] = gen;
                G[j] = gi;
                P[j] = from;
                const { x: jx, y: jy, z: jz } = dec3D(j);
                push(j, (gi + hOf(jx, jy, jz)) * HEAP_TIE - gi);
            };

            G[s] = 0;
            P[s] = -1;
            seen[s] = gen;
            push(s, hOf(sx, sy, sz) * HEAP_TIE);

            const maxNodes = opts.maxNodes > 0 ? opts.maxNodes | 0 : PATHS.maxNodes;
            const heapMax = hc.length - 4;
            let found = -1, best = s, bestH = hOf(sx, sy, sz), capped = false, expanded = 0;

            while (hn > 0) {
                const i = pop();
                if (closed[i] === gen) continue;
                closed[i] = gen;
                if (goalMark[i] === gen) {
                    found = i;
                    break;
                }
                if (expanded >= maxNodes || hn >= heapMax) {
                    capped = true;
                    break;
                }
                expanded++;
                const { x, y, z } = dec3D(i);
                const hi = hOf(x, y, z);
                if (hi < bestH || (hi === bestH && G[i] < G[best])) {
                    best = i;
                    bestH = hi;
                }

                from = i;
                const curCost = G[i];
                const curShape = shapeAt(x, y, z);
                const gEff = getGrid(z).eff;
                const e = gEff[y * size + x];

                // 1. Same-level orthogonal
                if (e & BIT_DOWN && y < size - 1 && enterable(x, y + 1, z)) relax(enc3D(x, y + 1, z), curCost + STEP_COST);
                if (e & BIT_UP && y > 0 && enterable(x, y - 1, z)) relax(enc3D(x, y - 1, z), curCost + STEP_COST);
                if (e & BIT_LEFT && x > 0 && enterable(x - 1, y, z)) relax(enc3D(x - 1, y, z), curCost + STEP_COST);
                if (e & BIT_RIGHT && x < size - 1 && enterable(x + 1, y, z)) relax(enc3D(x + 1, y, z), curCost + STEP_COST);

                // 1b. Same-level diagonal
                if (eight) {
                    const giDiag = curCost + DIAG_COST;
                    if (x > 0 && y > 0 && enterable(x - 1, y - 1, z) && enterable(x - 1, y, z) && enterable(x, y - 1, z)) {
                        relax(enc3D(x - 1, y - 1, z), giDiag);
                    }
                    if (x < size - 1 && y > 0 && enterable(x + 1, y - 1, z) && enterable(x + 1, y, z) && enterable(x, y - 1, z)) {
                        relax(enc3D(x + 1, y - 1, z), giDiag);
                    }
                    if (x > 0 && y < size - 1 && enterable(x - 1, y + 1, z) && enterable(x - 1, y, z) && enterable(x, y + 1, z)) {
                        relax(enc3D(x - 1, y + 1, z), giDiag);
                    }
                    if (x < size - 1 && y < size - 1 && enterable(x + 1, y + 1, z) && enterable(x + 1, y, z) && enterable(x, y + 1, z)) {
                        relax(enc3D(x + 1, y + 1, z), giDiag);
                    }
                }

                // 2. Ramp UP: if curShape is RAMP, step to orthogonal (nx, ny) at z + 1
                if (curShape === 4 && z < 2) {
                    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
                        const nx = x + dx, ny = y + dy;
                        if (enterable(nx, ny, z + 1)) relax(enc3D(nx, ny, z + 1), curCost + STEP_COST);
                    }
                }

                // 3. Ramp DOWN: if orthogonal (nx, ny) at z - 1 is RAMP, step down to it
                if (z > -2) {
                    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
                        const nx = x + dx, ny = y + dy;
                        if (shapeAt(nx, ny, z - 1) === 4 && enterable(nx, ny, z - 1)) {
                            relax(enc3D(nx, ny, z - 1), curCost + STEP_COST);
                        }
                    }
                }

                // 4. Stairs UP
                if ((curShape === 5 || curShape === 7) && z < 2) {
                    if (enterable(x, y, z + 1)) relax(enc3D(x, y, z + 1), curCost + STEP_COST);
                }

                // 5. Stairs DOWN
                if ((curShape === 6 || curShape === 7) && z > -2) {
                    if (enterable(x, y, z - 1)) relax(enc3D(x, y, z - 1), curCost + STEP_COST);
                }
            }

            res.expanded = expanded;
            let end = found;
            if (end < 0) {
                if (!capped) return done("no path");
                if (!opts.allowPartial || hOf(sx, sy, sz) - bestH < 2 * STEP_COST) return done("too far to plan");
                end = best;
                res.partial = true;
            }
            let len = 0;
            for (let c = end; c !== s; c = P[c]) AS.trace[len++] = c;
            const cells = new Int32Array(len);
            for (let k = 0; k < len; k++) cells[k] = AS.trace[len - 1 - k];
            res.cells = cells;
            res.end = end;
            return done(res.partial ? "partial" : "found");
        }

        const z = sz;
        const { map, flags } = areaMapOf(area.x, area.y, z);
        const g = gridOf(map, flags);
        const eff = g.eff, tf = typeFlags(), D = typeTable.doors;
        const unit = opts.unit ? (typeof opts.unit === "object" ? opts.unit : World.unit(opts.unit)) : null;
        const doorShut = i => !!D && (tf[g.objects[i]] & T_DOOR) !== 0 &&
            !(unit && D.canUnitPass(unit, D.at({ x: area.x, y: area.y, z }, i % size, (i - (i % size)) / size)));
        const isFire = i => {
            if (window.UF && UF.Fire && typeof UF.Fire.isBurning === "function") {
                const cx = i % size, cy = (i - cx) / size;
                return UF.Fire.isBurning({ x: area.x, y: area.y, z }, cx, cy);
            }
            return false;
        };
        const enterable = i => eff[i] !== 0 && !doorShut(i) && !isFire(i);
        const s = sy * size + sx, goalCell = gy * size + gx;
        const avoid = Number.isInteger(opts.avoid) ? opts.avoid : -1;

        const eight = !fourWay();
        // The goal set: the goal cell, or (a tree, a wall site, water) its open 4-neighbours, and in 8-way its open
        // diagonal neighbours whose two cells between them and the goal are open too (never reaching across a corner).
        let goals, hOff = 0;
        if (enterable(goalCell)) goals = [goalCell];
        else {
            if (opts.resolveBlocked === false) return done("goal blocked");
            hOff = eight ? DIAG_COST : STEP_COST;
            goals = [];
            goals.push(((gy + 1) % size) * size + gx);
            goals.push(((gy - 1 + size) % size) * size + gx);
            goals.push(gy * size + ((gx - 1 + size) % size));
            goals.push(gy * size + ((gx + 1) % size));
            goals = goals.filter(enterable);
            if (eight) {
                for (const [dx, dy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
                    const x = (gx + dx + size) % size, y = (gy + dy + size) % size;
                    const c = y * size + x;
                    if (enterable(c) && enterable(gy * size + x) && enterable(y * size + gx)) goals.push(c);
                }
            }
        }
        goals = goals.filter(c => c !== avoid);
        if (!goals.length) return done("goal walled in");
        if (goals.includes(s)) {
            res.cells = new Int32Array(0);
            res.end = s;
            return done("here");
        }
        if (eff[s] === 0 || doorShut(s)) return done("start walled in");
        const r0 = performance.now(), wasDirty = g.dirty || !g.region;
        const region = regionsOf(g);
        if (wasDirty) res.regionMs = performance.now() - r0;
        goals = goals.filter(c => region[c] === region[s]);
        if (!goals.length) return done("no path");

        const gen = searchArrays(n);
        const G = AS.g, P = AS.parent, seen = AS.seen, closed = AS.closed, goalMark = AS.goal, hc = AS.heapCell, hk = AS.heapKey;
        for (const c of goals) goalMark[c] = gen;
        const hOf = eight ? i => {
            const x = i % size, y = (i - x) / size;
            let ax = Math.abs(x - gx), ay = Math.abs(y - gy);
            if (ax > size / 2) ax = size - ax;
            if (ay > size / 2) ay = size - ay;
            const d = STEP_COST * (ax + ay) - (2 * STEP_COST - DIAG_COST) * (ax < ay ? ax : ay) - hOff; // octile
            return d > 0 ? d : 0;
        } : i => {
            const x = i % size, y = (i - x) / size;
            let ax = Math.abs(x - gx), ay = Math.abs(y - gy);
            if (ax > size / 2) ax = size - ax;
            if (ay > size / 2) ay = size - ay;
            const d = STEP_COST * (ax + ay) - hOff;
            return d > 0 ? d : 0;
        };
        let hn = 0;
        const push = (c, key) => {
            let k = hn++;
            while (k > 0) {
                const p = (k - 1) >> 1;
                if (hk[p] <= key) break;
                hk[k] = hk[p];
                hc[k] = hc[p];
                k = p;
            }
            hk[k] = key;
            hc[k] = c;
        };
        const pop = () => {
            const top = hc[0], last = --hn;
            if (last > 0) {
                const key = hk[last], c = hc[last];
                let k = 0;
                for (;;) {
                    let ch = 2 * k + 1;
                    if (ch >= last) break;
                    if (ch + 1 < last && hk[ch + 1] < hk[ch]) ch++;
                    if (hk[ch] >= key) break;
                    hk[k] = hk[ch];
                    hc[k] = hc[ch];
                    k = ch;
                }
                hk[k] = key;
                hc[k] = c;
            }
            return top;
        };
        const hasDoors = !!D;
        let from = s, gi = 0;
        const relax = (j, bitIn) => {
            if (closed[j] === gen || (eff[j] & bitIn) === 0 || j === avoid || (hasDoors && doorShut(j))) return;
            if (seen[j] === gen && G[j] <= gi) return;
            seen[j] = gen;
            G[j] = gi;
            P[j] = from;
            push(j, (gi + hOf(j)) * HEAP_TIE - gi);
        };
        // A diagonal step from `from` to j past its vertical neighbour a and horizontal neighbour b: both ways round the
        // corner open (from->a->j and from->b->j), a and b not shut doors and not the cell to walk round.
        const relaxDiag = (j, a, b, outV, inV, outH, inH) => {
            const e = eff[from], ea = eff[a], eb = eff[b], ej = eff[j];
            if ((e & outV) === 0 || (e & outH) === 0 || (ea & inV) === 0 || (ea & outH) === 0 ||
                (eb & inH) === 0 || (eb & outV) === 0 || (ej & inH) === 0 || (ej & inV) === 0) return;
            if (a === avoid || b === avoid || (hasDoors && (doorShut(a) || doorShut(b)))) return;
            relax(j, inH);
        };
        G[s] = 0;
        P[s] = -1;
        seen[s] = gen;
        push(s, hOf(s) * HEAP_TIE);
        const maxNodes = opts.maxNodes > 0 ? opts.maxNodes | 0 : PATHS.maxNodes;
        const heapMax = hc.length - 4;
        let found = -1, best = s, bestH = hOf(s), capped = false, expanded = 0;
        while (hn > 0) {
            const i = pop();
            if (closed[i] === gen) continue;
            closed[i] = gen;
            if (goalMark[i] === gen) {
                found = i;
                break;
            }
            if (expanded >= maxNodes || hn >= heapMax) {
                capped = true;
                break;
            }
            expanded++;
            const hi = hOf(i);
            if (hi < bestH || (hi === bestH && G[i] < G[best])) {
                best = i;
                bestH = hi;
            }
            const e = eff[i], x = i % size, y = (i - x) / size;
            from = i;
            gi = G[i] + STEP_COST;
            const yDown = y < size - 1 ? y + 1 : 0;
            const yUp = y > 0 ? y - 1 : size - 1;
            const xLeft = x > 0 ? x - 1 : size - 1;
            const xRight = x < size - 1 ? x + 1 : 0;
            const aDown = yDown * size + x;
            const aUp = yUp * size + x;
            const bLeft = y * size + xLeft;
            const bRight = y * size + xRight;
            if (e & BIT_DOWN) relax(aDown, BIT_UP);
            if (e & BIT_UP) relax(aUp, BIT_DOWN);
            if (e & BIT_LEFT) relax(bLeft, BIT_RIGHT);
            if (e & BIT_RIGHT) relax(bRight, BIT_LEFT);
            if (eight) {
                gi = G[i] + DIAG_COST;
                relaxDiag(yDown * size + xLeft, aDown, bLeft, BIT_DOWN, BIT_UP, BIT_LEFT, BIT_RIGHT);
                relaxDiag(yDown * size + xRight, aDown, bRight, BIT_DOWN, BIT_UP, BIT_RIGHT, BIT_LEFT);
                relaxDiag(yUp * size + xLeft, aUp, bLeft, BIT_UP, BIT_DOWN, BIT_LEFT, BIT_RIGHT);
                relaxDiag(yUp * size + xRight, aUp, bRight, BIT_UP, BIT_DOWN, BIT_RIGHT, BIT_LEFT);
            }
        }
        res.expanded = expanded;
        let end = found;
        if (end < 0) {
            if (!capped) return done("no path"); // same region, but a door shut to this unit or the cell to walk round closes it
            // A partial plan must bring the unit at least 2 cells closer, or it would step, search again and get nowhere.
            if (!opts.allowPartial || hOf(s) - bestH < 2 * STEP_COST) return done("too far to plan");
            end = best;
            res.partial = true;
        }
        let len = 0;
        for (let c = end; c !== s; c = P[c]) AS.trace[len++] = c;
        const cells = new Int32Array(len);
        for (let k = 0; k < len; k++) cells[k] = AS.trace[len - 1 - k];
        res.cells = cells;
        res.end = end;
        return done(res.partial ? "partial" : "found");
    }

    // The cell the unit walks toward in its own area: the goal, or (goal in another area) the nearest edge cell.
    function localTarget(u) {
        const size = World.state.size;
        let tx = u.goal.x, ty = u.goal.y;
        if (u.goal.area.x !== u.area.x || u.goal.area.y !== u.area.y) {
            tx = clamp((u.goal.area.x - u.area.x) * size + u.goal.x, 0, size - 1);
            ty = clamp((u.goal.area.y - u.area.y) * size + u.goal.y, 0, size - 1);
        }
        const gz = u.goal.z !== undefined ? u.goal.z : zOf(u.goal.area);
        return { tx, ty, tz: gz, key: `${u.area.x},${u.area.y},${zOf(u)}:${tx},${ty},${gz}` };
    }

    // Give up the goal at once and say why: world:unitBlocked(unit, reason, goal given up).
    function blockUnit(u, reason) {
        const goal = u.goal;
        u.goal = null;
        u.stuckFrames = 0;
        pathCache.delete(u.id);
        pathStats.blocked[reason] = (pathStats.blocked[reason] || 0) + 1;
        emit("world:unitBlocked", u, reason, goal);
    }

    function enqueuePlan(id) {
        if (planQueued.has(id)) return;
        planQueue.push(id);
        planQueued.add(id);
        pathStats.queuedTotal++;
        if (planQueue.length > pathStats.queuePeak) pathStats.queuePeak = planQueue.length;
    }

    // Plan (or re-plan) a unit's path from its event's cell (off screen: from the unit's own cell), on the unit's level.
    // Uses one of this update's plans.
    function planFor(u, ev) {
        const tgt = localTarget(u);
        const old = pathCache.get(u.id);
        const same = !!old && old.key === tgt.key;
        const avoid = same ? old.avoid : -1;
        planBudget--;
        const res = planPath(u.area, ev.x, ev.y, tgt.tx, tgt.ty, { unit: u, avoid, allowPartial: true, record: true, z: zOf(u), tz: tgt.tz });
        if (!res.cells) {
            blockUnit(u, avoid >= 0 && res.reason === "no path" ? "no way past" : res.reason);
            return null;
        }
        const legs = same && old.partial ? old.legs + 1 : 0;
        if (res.partial && legs >= PATHS.maxPartialLegs) {
            blockUnit(u, "too far to plan");
            return null;
        }
        // Progress (the fewest cells left so far, and when) carries over re-plans toward the same goal; a new partial leg
        // starts afresh.
        const keep = same && !old.partial;
        const p = {
            key: tgt.key, cells: res.cells, i: 0, end: res.end, is3D: res.is3D, partial: res.partial, legs, wait: 0, fails: same ? old.fails : 0, avoid: -1, stale: false,
            bestLeft: keep ? old.bestLeft : Infinity, bestAt: keep ? old.bestAt : World._frame
        };
        pathCache.set(u.id, p);
        return p;
    }

    function servePlanQueue() {
        while (planBudget > 0 && planQueue.length) {
            const id = planQueue.shift();
            planQueued.delete(id);
            const u = World.unit(id);
            if (!u || !u.goal || (u.data && u.data.through)) continue;
            if (!World.isDisplayed(u)) {
                if (PATHS.offscreenPaths && sameArea(u.goal.area, u.area)) planFor(u, u);
                continue;
            }
            if (!window.$gameMap) continue;
            const ev = $gameMap._events[EVENT_BASE + u.id];
            if (!ev || ev.isThrough()) continue;
            planFor(u, ev);
        }
    }

    // The direction (numpad 1-9) of a one-cell step, 0 when (nx, ny) isn't next to (x, y).
    const DIR_OF = [7, 8, 9, 4, 0, 6, 1, 2, 3]; // by (dy + 1) * 3 + (dx + 1)
    const dirTo = (x, y, nx, ny) => {
        let dx = nx - x, dy = ny - y;
        const size = (World.state && World.state.size) || 256;
        if (dx === -(size - 1)) dx = 1;
        else if (dx === size - 1) dx = -1;
        if (dy === -(size - 1)) dy = 1;
        else if (dy === size - 1) dy = -1;
        return dx < -1 || dx > 1 || dy < -1 || dy > 1 ? 0 : DIR_OF[(dy + 1) * 3 + dx + 1];
    };
    const isDiag = d => d === 1 || d === 3 || d === 7 || d === 9;
    const BIT_OUT = { 2: BIT_DOWN, 4: BIT_LEFT, 6: BIT_RIGHT, 8: BIT_UP };
    const BIT_IN = { 2: BIT_UP, 4: BIT_RIGHT, 6: BIT_LEFT, 8: BIT_DOWN };

    // Can the unit step from cell i to cell j (direction d) right now, by the grid (units aside)? A diagonal needs both
    // ways round its corner open and neither corner cell a shut door (the planner's rule).
    function stepOpen(u, i, j, d) {
        const { map, flags } = areaMapOf(u.area.x, u.area.y, zOf(u));
        const g = gridOf(map, flags);
        const size = g.size, eff = g.eff;
        const cells = [i, j];
        if (isDiag(d)) {
            const h = d === 1 || d === 7 ? 4 : 6, v = d === 1 || d === 3 ? 2 : 8;
            const x = i % size, y = (i - x) / size;
            const y_v = v === 2 ? (y < size - 1 ? y + 1 : 0) : (y > 0 ? y - 1 : size - 1);
            const x_h = h === 6 ? (x < size - 1 ? x + 1 : 0) : (x > 0 ? x - 1 : size - 1);
            const a = y_v * size + x, b = y * size + x_h;
            if ((eff[i] & BIT_OUT[v]) === 0 || (eff[a] & BIT_IN[v]) === 0 || (eff[a] & BIT_OUT[h]) === 0 || (eff[j] & BIT_IN[h]) === 0 ||
                (eff[i] & BIT_OUT[h]) === 0 || (eff[b] & BIT_IN[h]) === 0 || (eff[b] & BIT_OUT[v]) === 0 || (eff[j] & BIT_IN[v]) === 0) return false;
            cells.push(a, b);
        } else if ((eff[i] & BIT_OUT[d]) === 0 || (eff[j] & BIT_IN[d]) === 0) return false;
        const D = typeTable.doors;
        if (D) {
            const tf = typeTable.flags;
            for (const c of cells) {
                if ((tf[g.objects[c]] & T_DOOR) && !D.canUnitPass(u, D.at({ x: u.area.x, y: u.area.y, z: zOf(u) }, c % size, (c - (c % size)) / size))) return false;
            }
        }
        return true;
    }

    // One step along the unit's plan: plan first if needed (or queue), wait for units in the way, re-plan when the
    // world changed under the path, arrive at the end.
    function stepAlongPath(u, ev, again) {
        const tgt = localTarget(u);
        let p = pathCache.get(u.id);
        if (!p || p.stale || p.key !== tgt.key) {
            if (planQueued.has(u.id)) return; // waiting its turn
            if (planBudget <= 0) {
                enqueuePlan(u.id);
                return;
            }
            p = planFor(u, ev);
            if (!p) return;
        }
        const size = World.state.size, n2 = size * size;
        const curZ = zOf(u);
        const here = p.is3D ? ((curZ + 2) * n2 + ev.y * size + ev.x) : (ev.y * size + ev.x);
        const left = p.cells.length - p.i;
        if (left < p.bestLeft) {
            p.bestLeft = left;
            p.bestAt = World._frame;
        } else if (World._frame - p.bestAt > PATHS.progressFrames) {
            return blockUnit(u, "no way past");
        }
        if (p.i >= p.cells.length) {
            if (!p.partial && here === p.end) return arrive(u); // a blocked goal ends at its nearest reachable open neighbour
            p.stale = true; // the end of a partial plan: plan the next leg
            if (!again) stepAlongPath(u, ev, true);
            return;
        }
        const next = p.cells[p.i];
        let nx, ny, nz;
        if (p.is3D) {
            const l = Math.floor(next / n2);
            nz = l - 2;
            const rem = next - l * n2;
            nx = rem % size;
            ny = (rem - nx) / size;
        } else {
            nz = curZ;
            nx = next % size;
            ny = (next - nx) / size;
        }
        if (nz !== curZ) {
            World.moveUnitToLevel(u, nz, nx, ny, { keepPath: true });
            p.i++;
            p.fails = 0;
            u.stuckFrames = 0;
            return;
        }
        const here2D = ev.y * size + ev.x, next2D = ny * size + nx;
        const d = dirTo(ev.x, ev.y, nx, ny);
        if (!d || !stepOpen(u, here2D, next2D, d)) {
            // Moved off its path by something else, or the world changed under it (a wall went up): plan again.
            p.stale = true;
            pathStats.replans++;
            if (!again) stepAlongPath(u, ev, true);
            return;
        }
        // Someone stands in the way (on the next cell, or on both corners of a diagonal step): wait for them, then walk
        // round them (or give up when they stand on the goal). Someone on one corner of a diagonal: go round by the other
        // corner (two straight steps; the path cell is the second).
        const diag = isDiag(d);
        let blockedAt = ev.isCollidedWithCharacters(nx, ny) ? next : -1, viaCorner = 0;
        if (blockedAt < 0 && diag) {
            const horz = nx > ev.x ? 6 : 4, vert = ny > ev.y ? 2 : 8;
            if (ev.canPassDiagonally && ev.canPassDiagonally(ev.x, ev.y, horz, vert)) {
                viaCorner = 0;
            } else {
                const takenH = ev.isCollidedWithCharacters(nx, ev.y), takenV = ev.isCollidedWithCharacters(ev.x, ny);
                if (takenH && takenV) blockedAt = ev.y * size + nx;
                else if (takenH) viaCorner = vert;
                else if (takenV) viaCorner = horz;
            }
        }
        if (blockedAt >= 0) {
            if (ev.setDir8) ev.setDir8(d);
            else ev.setDirection(d);
            pathStats.waitFrames++;
            if (++p.wait <= PATHS.waitFrames) return;
            p.wait = 0;
            if (blockedAt === next && !p.partial && p.i === p.cells.length - 1) return blockUnit(u, "goal occupied");
            p.avoid = blockedAt;
            p.stale = true;
            pathStats.detours++;
            return;
        }
        p.wait = 0;
        if (viaCorner) ev.moveStraight(viaCorner);
        else if (diag) ev.moveDiagonally(nx > ev.x ? 6 : 4, ny > ev.y ? 2 : 8);
        else ev.moveStraight(d);
        if (ev.isMovementSucceeded()) {
            if (!viaCorner) p.i++;
            p.fails = 0;
            u.stuckFrames = 0;
        } else if (++p.fails >= PATHS.maxStepFails) {
            blockUnit(u, "step refused");
        } else {
            p.stale = true;
            pathStats.replans++;
        }
    }

    /**
     * A path in one area from (sx, sy) to (gx, gy): [{x, y}, ...] after the start, ending at the goal, or null. Steps are
     * 8-way (diagonals never across a blocked corner; 4-way with UF_Movement8D's FourWay). A goal cell nobody can stand
     * on ends at its nearest reachable open neighbour (4-neighbours; in 8-way also diagonal ones whose two cells between
     * them and the goal are open). [] when already there.
     * opts: { unit (doors let their faction through), maxNodes (default 12000), avoid: {x, y} (a cell to walk
     * round), allowPartial (capped searches return the part toward the goal, marked path.partial), z (the level:
     * default area.z, else the ground) }.
     * World.lastPath says what the search did: { reason, ms, expanded, length, partial }.
     */
    World.findPath = function(area, sx, sy, gx, gy, opts = {}) {
        const size = this.state ? this.state.size : 0, n2 = size * size;
        const o = Object.assign({}, opts);
        if (opts.avoid && typeof opts.avoid === "object") o.avoid = (opts.avoid.y | 0) * size + (opts.avoid.x | 0);
        const res = planPath(area, sx, sy, gx, gy, o);
        if (!res.cells) return null;
        const out = Array.from(res.cells, c => {
            if (res.is3D) {
                const l = Math.floor(c / n2), z = l - 2, rem = c - l * n2, x = rem % size, y = (rem - x) / size;
                return { x, y, z };
            }
            return { x: c % size, y: (c - (c % size)) / size };
        });
        if (res.partial) out.partial = true;
        return out;
    };
    /**
     * Whether a unit could stand on the cell, by the same rule as paths (tiles, water, objects; doors shut unless
     * opts.unit may pass). opts.ground: the ground alone (tiles and water) lets units walk every way, objects ignored.
     * opts.z: the level (default the ground).
     */
    World.walkable = function(ax, ay, x, y, opts = {}) {
        const st = this.state;
        const z = opts.z === undefined ? 0 : opts.z;
        if (!st || !this.inWorld(ax, ay, z) || x < 0 || y < 0 || x >= st.size || y >= st.size) return false;
        const { map, flags } = areaMapOf(ax, ay, z);
        const g = gridOf(map, flags);
        const i = y * g.size + x;
        if (opts.ground) return (g.pass[i] & WATER_BIT) === 0 && (g.pass[i] & 15) === 15;
        if (g.eff[i] === 0) return false;
        if (st.version >= 4 && window.UF && UF.Levels && (typeof UF.Levels.shapeCodeAt === "function" || typeof UF.Levels.shapeAt === "function")) {
            const s = typeof UF.Levels.shapeCodeAt === "function" ? UF.Levels.shapeCodeAt(ax, ay, x, y, z) : UF.Levels.shapeAt(ax, ay, x, y, z);
            if (typeof s === "string") {
                if (s === "solid" || s === "open") return false;
            } else if (s !== 2 && s < 4) return false; // must be FLOOR or RAMP or STAIR
        }
        if (window.UF && UF.Fluid && typeof UF.Fluid.walkable === "function") {
            if (!UF.Fluid.walkable(ax, ay, x, y, { z, canSwim: opts.canSwim, lavaImmune: opts.lavaImmune })) return false;
        } else if (z < 0 && window.UF && UF.Levels) {
            if (typeof UF.Levels.isLavaAt === "function") {
                if (UF.Levels.isLavaAt(ax, ay, z, x, y)) return false;
            } else if (typeof UF.Levels.isFlooded === "function") {
                const fl = UF.Levels.isFlooded({ area: { x: ax, y: ay }, x, y, z });
                if (fl && fl.flooded && fl.type === "lava") return false;
            }
        }
        if (window.UF && UF.Fire && typeof UF.Fire.isBurning === "function") {
            if (UF.Fire.isBurning({ x: ax, y: ay, z }, x, y)) return false;
        }
        const D = typeTable.doors;
        if (D && (typeTable.flags[g.objects[i]] & T_DOOR)) return !!opts.unit && D.canUnitPass(opts.unit, D.at({ x: ax, y: ay, z }, x, y));
        return true;
    };
    /** Whether (gx, gy) can be walked to from (sx, sy) in one area on one level (area.z; region map: doors open, units ignored). */
    World.reachable = function(area, sx, sy, gx, gy, opts = {}) {
        const st = this.state;
        const sz = opts.z !== undefined ? opts.z : zOf(area);
        const gz = opts.tz !== undefined ? opts.tz : sz;
        if (!st || !area || !this.inWorld(area.x, area.y, sz) || !this.inWorld(area.x, area.y, gz)) return false;
        const size = st.size;
        if (![sx, sy, gx, gy].every(v => Number.isInteger(v) && v >= 0 && v < size)) return false;
        if (st.version < 4 && sz === gz && !opts.z3d) {
            const { map, flags } = areaMapOf(area.x, area.y, sz);
            const g = gridOf(map, flags);
            const region = regionsOf(g);
            const s = sy * size + sx, t = gy * size + gx;
            return g.eff[s] !== 0 && region[s] !== 0 && region[s] === region[t];
        }
        const p = planPath(area, sx, sy, gx, gy, { z: sz, tz: gz, maxNodes: Math.min(2048, size * size), allowPartial: false, resolveBlocked: false });
        return !!p && !!p.cells && !p.partial;
    };
    /** The cells still ahead on a unit's current plan ([{x, y}], the next step first), or null when it has none. */
    World.pathOf = function(id) {
        const p = pathCache.get(id);
        if (!p || p.stale || !this.state) return null;
        const size = this.state.size, n2 = size * size;
        return Array.from(p.cells.subarray(p.i), c => {
            if (p.is3D) {
                const l = Math.floor(c / n2), z = l - 2, rem = c - l * n2, x = rem % size, y = (rem - x) / size;
                return { x, y, z };
            }
            return { x: c % size, y: (c - (c % size)) / size };
        });
    };
    /** Planner numbers since the world was created: plans, ms (average, p95 of the last 512, max), cells expanded, queue, waits. */
    World.pathStats = function() {
        const s = pathStats;
        const ms = s.recentMs.slice().sort((a, b) => a - b), ex = s.recentExpanded.slice().sort((a, b) => a - b);
        const pick = (arr, q) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * q))] : 0);
        return {
            plans: s.plans, found: s.found, partial: s.partial, none: s.none,
            avgMs: s.plans ? s.ms / s.plans : 0, p95Ms: pick(ms, 0.95), maxMs: s.maxMs, maxPlan: s.maxPlan || null,
            avgExpanded: s.plans ? s.expanded / s.plans : 0, medianExpanded: pick(ex, 0.5), maxExpanded: s.maxExpanded,
            queuedTotal: s.queuedTotal, queuePeak: s.queuePeak, queueNow: planQueue.length,
            replans: s.replans, detours: s.detours, waitFrames: s.waitFrames, blocked: Object.assign({}, s.blocked),
            regionBuilds: s.regionBuilds, regionMsAvg: s.regionBuilds ? s.regionMs / s.regionBuilds : 0,
            gridBuilds: s.gridBuilds, gridMsAvg: s.gridBuilds ? s.gridMs / s.gridBuilds : 0, cachedPlans: pathCache.size
        };
    };
    World.resetPathStats = () => { pathStats = newPathStats(); };
    /** Planner settings (read them; tests may change them): enabled, maxNodes, plansPerUpdate, waitFrames, maxStepFails, maxPartialLegs. */
    World.pathConfig = PATHS;
    World.lastPath = null;

    //-------------------------------------------------------------------------
    // The view (the RMMZ player is the view/cursor)

    /** Move the view to a cell of any area, on level z (default: the level on screen, else the ground). */
    World.transferView = function(ax, ay, x, y, dir, z) {
        const v = this.viewLevel();
        const lz = z === undefined ? (v ? v.z : 0) : z;
        if (!this.state || !this.inWorld(ax, ay, lz)) return false;
        $gamePlayer.reserveTransfer(this.areaMapId(ax, ay, lz), x, y, dir || $gamePlayer.direction(), 2);
        return true;
    };

    // Returns true when the move was turned into an area transfer (the view keeps its level).
    function tryViewEdge(player, dx, dy) {
        const view = World.viewLevel();
        if (!view || player.isTransferring()) return false;
        if ($gameMap && ($gameMap.isLoopHorizontal() || $gameMap.isLoopVertical())) {
            const size = World.state.size;
            const nx = player.x + dx, ny = player.y + dy;
            const wrapsX = $gameMap.isLoopHorizontal() && (nx < 0 || nx >= size);
            const wrapsY = $gameMap.isLoopVertical() && (ny < 0 || ny >= size);
            if (wrapsX || wrapsY) {
                const areasX = World.state.areasX || 1, areasY = World.state.areasY || 1;
                if ((!wrapsX || areasX === 1) && (!wrapsY || areasY === 1)) return false;
            }
        }
        const size = World.state.size;
        const nx = player.x + dx, ny = player.y + dy;
        if (nx >= 0 && ny >= 0 && nx < size && ny < size) return false;
        const w = wrapStep({ area: view, x: player.x, y: player.y }, dx, dy);
        if (!World.inWorld(w.ax, w.ay, view.z)) return false;
        if (w.ax === view.x && w.ay === view.y) return false;
        return World.transferView(w.ax, w.ay, w.x, w.y, undefined, view.z);
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

    // Character collisions: allies move freely through each other across corridors and open terrain,
    // while collisions with hostiles (enemies, wolves, monsters) and solid map obstacles are strictly preserved.
    const _Game_Event_isCollidedWithEvents = Game_Event.prototype.isCollidedWithEvents;
    Game_Event.prototype.isCollidedWithEvents = function(x, y) {
        const events = $gameMap.eventsXyNt(x, y);
        if (!events || !events.length) return false;
        for (const ev of events) {
            if (ev === this) continue;
            if (ev.isNormalPriority() && !World.areAllies(this, ev)) {
                return true;
            }
        }
        return false;
    };

    const _Game_Event_isCollidedWithPlayerCharacters = Game_Event.prototype.isCollidedWithPlayerCharacters;
    Game_Event.prototype.isCollidedWithPlayerCharacters = function(x, y) {
        if (!this.isNormalPriority() || !$gamePlayer.isCollided(x, y)) return false;
        if (World.areAllies(this, $gamePlayer)) return false;
        return true;
    };

    const _Game_Player_isCollidedWithEvents = Game_Player.prototype.isCollidedWithEvents || Game_CharacterBase.prototype.isCollidedWithEvents;
    Game_Player.prototype.isCollidedWithEvents = function(x, y) {
        const events = $gameMap.eventsXyNt(x, y);
        if (!events || !events.length) return false;
        for (const ev of events) {
            if (ev.isNormalPriority() && !World.areAllies($gamePlayer, ev)) {
                return true;
            }
        }
        return false;
    };

    //-------------------------------------------------------------------------
    // Engine hooks: loading, new game, save/load, per-frame update

    if (CONFIG.templateMapId > 0 && !DataManager.isBattleTest() && !DataManager.isEventTest()) {
        DataManager._databaseFiles.push({ name: TEMPLATE_VAR, src: "Map%1.json".format(CONFIG.templateMapId.padZero(3)) });
    }

    // A world map id (any level) is built in memory. The map leaving the screen stays in the peek cache, and a level
    // that was on screen before is shown again from there (its unit events renewed) when the view comes from another
    // level: switching levels and back doesn't rebuild the ground. Showing the same level again (a map reload, a
    // return from another scene) still rebuilds it, as before. Builds made only for off-screen reads are never shown
    // (they may be older than the generators' inputs, e.g. one made during world:created).
    const _DataManager_loadMapData = DataManager.loadMapData;
    DataManager.loadMapData = function(mapId) {
        const lv = World.state ? World.levelOfMapId(mapId) : null;
        if (lv) {
            const out = World.viewLevel();
            if (out && window.$dataMap && $dataMap._ufShown && $dataMap._ufState === World.state) World.adoptBuild(out.x, out.y, out.z, $dataMap);
            window.$dataMap = null;
            const cached = World.cachedBuild(lv.x, lv.y, lv.z);
            let map;
            const fromOtherLevel = !!out && (out.x !== lv.x || out.y !== lv.y || out.z !== lv.z) && !(window.$gamePlayer && $gamePlayer._needsMapReload);
            if (fromOtherLevel && cached && cached._ufShown && cached._ufState === World.state) {
                map = cached;
                World.refreshUnitEvents(map, lv.x, lv.y, lv.z);
                World.lastMapLoad = { mapId, level: { x: lv.x, y: lv.y, z: lv.z }, reused: true };
            } else {
                map = World.buildArea(lv.x, lv.y, lv.z);
                map._ufShown = true;
                map._ufState = World.state; // a build belongs to one world: a loaded game never shows another world's map
                World.adoptBuild(lv.x, lv.y, lv.z, map);
                World.lastMapLoad = { mapId, level: { x: lv.x, y: lv.y, z: lv.z }, reused: false };
            }
            this.onLoad(map);
            window.$dataMap = map;
            if (lv.z === 0) emit("world:areaBuilt", { x: lv.x, y: lv.y });
            else emit("world:levelBuilt", { x: lv.x, y: lv.y, z: lv.z });
            return;
        }
        _DataManager_loadMapData.call(this, mapId);
    };

    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DataManager_createGameObjects.call(this);
        World.state = null;
        buildCache.clear();
        clearPaths(true);
        spawnStats = newSpawnStats();
    };

    const _Game_Player_setupForNewGame = Game_Player.prototype.setupForNewGame;
    Game_Player.prototype.setupForNewGame = function() {
        if (!CONFIG.startInWorld) {
            _Game_Player_setupForNewGame.call(this);
            return;
        }
        if (typeof require !== 'undefined') {
            try { require('fs').appendFileSync('game_runtime.log', `${new Date().toISOString()} [TIMING] setupForNewGame before World.newWorld\n`); } catch (_) {}
        }
        const reqSeed = (window.UF && UF.NewGameSetup && UF.NewGameSetup.seed !== undefined) ? UF.NewGameSetup.seed : undefined;
        World.newWorld(reqSeed);
        if (typeof require !== 'undefined') {
            try { require('fs').appendFileSync('game_runtime.log', `${new Date().toISOString()} [TIMING] setupForNewGame after World.newWorld\n`); } catch (_) {}
        }
        let start = World.state.startArea;
        let z = 0;
        const tpl = World.template();
        const off = World.templateOffset();
        let x = Math.floor(World.state.size / 2), y = x;
        if (tpl && $dataSystem.startMapId === CONFIG.templateMapId) {
            x = $dataSystem.startX + off.x;
            y = $dataSystem.startY + off.y;
        }
        // A generator (UF_History) may set where the view starts: the player's home site (user decision 2026-09-18).
        if (World.state.viewStart) {
            const view = World.state.viewStart;
            const area = view.area || start;
            const level = view.z !== undefined ? view.z : zOf(area);
            if (!World.inWorld(area.x, area.y, level)) throw new Error("UF_World: invalid founding view level");
            start = area;
            z = level;
            x = view.x | 0;
            y = view.y | 0;
        }
        this.reserveTransfer(World.areaMapId(start.x, start.y, z), x, y, 2, 0);
        if (typeof require !== 'undefined') {
            try { require('fs').appendFileSync('game_runtime.log', `${new Date().toISOString()} [TIMING] setupForNewGame exit (reserved map ${World.areaMapId(start.x, start.y, z)})\n`); } catch (_) {}
        }
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
        spawnStats = newSpawnStats();
        buildCache.clear();
        offOcc = null;
        clearPaths(true); // plans are runtime only: a loaded game plans again
    };

    // The walk grid and region map of an area are built while its map loads, not on the first step (about 15-20 ms).
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _Game_Map_setup.call(this, mapId);
        if (World.state && World.isWorldMap(mapId) && window.$dataMap && $dataMap.data && $dataMap.ufObjects) {
            try {
                regionsOf(gridOf($dataMap, this.tilesetFlags()));
            } catch (e) {
                console.error(e);
            }
        }
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
        wrapRegrowth();
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    // 8-way (VISION V3, 2026-09-19): an 8-row scratch sheet (facings S, SW, W, NW, N, NE, E, SE; each frame a body with a
    // white nose on the side it faces and the facing's name), made in memory like the anim suite's (never a file).
    const FACINGS8 = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
    const NAME8 = { 1: "SW", 2: "S", 3: "SE", 4: "W", 6: "E", 7: "NW", 8: "N", 9: "NE" };
    const DIR8_SHEET = "$TEST_Dir8Body";
    const dir8SheetUrl = () => "img/characters/" + Utils.encodeURI(DIR8_SHEET) + ".png";
    function makeDir8Sheet() {
        const A = window.UF && UF.Anim;
        if (!A || typeof A.setSidecar !== "function") return false;
        const FW = 48, b = new Bitmap(20 * FW, 8 * FW);
        const vec = { S: [0, 1], SW: [-1, 1], W: [-1, 0], NW: [-1, -1], N: [0, -1], NE: [1, -1], E: [1, 0], SE: [1, 1] };
        const colour = c => (c === 0 || c >= 18 ? "#9aa0a6" : c <= 3 ? "#3f7fd0" : c <= 6 ? "#e08a1e" : c === 7 ? "#8a5a2b" : c <= 10 ? "#d23c3c" : c <= 13 ? "#8e44ad" : c === 14 ? "#ff7fbf" : "#6b1010");
        b.fontSize = 12;
        for (let r = 0; r < 8; r++) {
            const [vx, vy] = vec[FACINGS8[r]];
            for (let c = 0; c < 20; c++) {
                const x = c * FW, y = r * FW;
                b.fillRect(x + 16, y + 16, 16, 30, colour(c));
                b.fillRect(x + 20 + vx * 12, y + 27 + vy * 12, 8, 8, "#ffffff");
                b.drawText(FACINGS8[r], x, y, FW, 14, "center");
            }
        }
        ImageManager._cache[dir8SheetUrl()] = b;
        A.setSidecar(DIR8_SHEET, { frameWidth: FW, frameHeight: FW, facings: FACINGS8.slice(), frameMs: 150,
            animations: { stand: [0], walk: [1, 2, 3], work: [4, 5, 6], carry: [7], attack: [8, 9, 10], cast: [11, 12, 13], hurt: [14], death: [15, 16, 17], idle: [18, 19] } });
        return true;
    }
    function dropDir8Sheet() {
        const A = window.UF && UF.Anim;
        delete ImageManager._cache[dir8SheetUrl()];
        if (A && typeof A.setSidecar === "function") A.setSidecar(DIR8_SHEET, null);
    }

    // On the cleared test site (27x27 cells round (cx, cy), all walkable ground):
    // - TEST_diag8 (the 8-row sheet, starting facing S) walks 8 cells north-east and TEST_diag4 (stock People1, 4 rows,
    //   starting facing N) 8 cells south-east over open ground: every step diagonal, each step faced (dir8), the row drawn
    //   that facing's row on the 8-row sheet and the horizontal side (E) on the stock sheet.
    // - TEST_rounder walks from just north of a line of 7 trees to just south of it: round an end, never a diagonal
    //   step with a tree on a corner, and its plan has none either.
    // - TEST_chopper (8-row) chops a tree from the south-west (the stand UF_Jobs picks for it): it faces NE and draws the
    //   NE row of its work frames; TEST_striker attacks a unit to its south-west (UF.Combat.playAttackAnimation) and
    //   faces SW on its attack frames; TEST_caster casts at a unit 3 east and 2 south of it (data.casting.targetId) and
    //   faces SE on its cast frames.
    async function eightWayChecks(t, W, area, cx, cy, blocksHere) {
        const O = window.UF.Objects, J = window.UF.Jobs, A = window.UF.Anim, C = window.UF.Combat;
        const treeType = O.typeId("oak") || O.typeId("pine");
        const eightWay = !fourWay();
        const sheet8 = makeDir8Sheet();
        const img8 = sheet8 ? { characterName: DIR8_SHEET, characterIndex: 0 } : { characterName: "People1", characterIndex: 6 };
        const size = W.state.size;
        const out = { lineY: cy + 4, lineX0: cx - 1, lineX1: cx + 5, cuts: [], planCuts: 0, planDiagonals: 0, planLen: -1, rounderArrived: false, roundedEnd: false, rounderTrail: [], rounderDiag: 0 };
        const placedTrees = [];
        const putTree = (x, y) => { W.setObject(area.x, area.y, x, y, treeType); placedTrees.push({ x, y }); };
        for (let x = out.lineX0; x <= out.lineX1; x++) putTree(x, out.lineY);
        const tree = { x: cx + 9, y: cy + 5 };
        putTree(tree.x, tree.y);
        const added = [];
        const add = (name, img, x, y, dir, data) => {
            const u = W.addUnit({ name, image: img, area, x, y, dir, exact: true, data: Object.assign({ kind: "test", inventory: [], equipment: {} }, data || {}) });
            added.push(u);
            return u;
        };
        const d8 = add("TEST_diag8", img8, cx - 12, cy + 4, 2);
        const d4 = add("TEST_diag4", { characterName: "People1", characterIndex: 0 }, cx + 2, cy - 8, 8);
        const rounder = add("TEST_rounder", { characterName: "People1", characterIndex: 3 }, cx + 2, cy + 2, 2);
        const chopper = add("TEST_chopper", img8, cx + 6, cy + 8, 2);
        const striker = add("TEST_striker", img8, cx - 8, cy + 7, 2);
        const struck = add("TEST_struck", { characterName: "People1", characterIndex: 5 }, cx - 9, cy + 8, 2);
        const caster = add("TEST_caster", img8, cx - 6, cy + 5, 2);
        const castAt = add("TEST_cast_target", { characterName: "People1", characterIndex: 4 }, cx - 3, cy + 7, 2);
        await t.waitFrames(3);
        const plan = W.findPath(area, rounder.x, rounder.y, cx + 2, cy + 6, { unit: rounder });
        if (plan) {
            out.planLen = plan.length;
            let px = rounder.x, py = rounder.y;
            for (const c of plan) {
                if (c.x !== px && c.y !== py) {
                    out.planDiagonals++;
                    if (blocksHere(c.x, py) || blocksHere(px, c.y)) out.planCuts++;
                }
                px = c.x;
                py = c.y;
            }
        }
        const chop = J && J.create ? J.create({ type: "chop", target: { area, x: tree.x, y: tree.y }, owner: chopper.id }) : null;
        const goals = new Map([[d8.id, { x: cx - 4, y: cy - 4 }], [d4.id, { x: cx + 10, y: cy }], [rounder.id, { x: cx + 2, y: cy + 6 }]]);
        for (const [id, g] of goals) W.sendUnit(id, { area, x: g.x, y: g.y });
        // Each frame: steps (diagonal or not, corner cells), the facing (dir8), and the row the sprite drew.
        const walk = new Map([d8, d4, rounder, chopper].map(u => [u.id, { steps: 0, diag: 0, wrongStepFacing: 0, rowChecked: 0, rowWrong: [], last: { x: u.x, y: u.y }, lastDir8: 0, trail: [{ x: u.x, y: u.y }] }])); // from the start cell: the first step can begin in the frame the goal is set
        const rowWant = (u, ev) => (u.image.characterName === DIR8_SHEET ? FACINGS8.indexOf(NAME8[ev.dir8()]) : ((window.UF_Dir8 ? UF_Dir8.project4(ev.dir8()) : ev.direction()) - 2) >> 1);
        const sampleWalk = () => {
            for (const u of [d8, d4, rounder, chopper]) {
                const ev = W.eventOf(u.id), w = walk.get(u.id);
                if (!ev) continue;
                const here = { x: ev.x, y: ev.y };
                if (w.last.x !== here.x || w.last.y !== here.y) {
                    w.steps++;
                    w.trail.push(here);
                    const sdx = here.x - w.last.x, sdy = here.y - w.last.y;
                    const want = window.UF_Dir8 ? UF_Dir8.combine(sdx > 0 ? 6 : sdx < 0 ? 4 : 0, sdy > 0 ? 2 : sdy < 0 ? 8 : 0) : 0;
                    if (ev.dir8 && ev.dir8() !== want) w.wrongStepFacing++;
                    if (sdx !== 0 && sdy !== 0) {
                        w.diag++;
                        if (blocksHere(here.x, w.last.y) || blocksHere(w.last.x, here.y)) out.cuts.push(`${u.name} ${w.last.x},${w.last.y} -> ${here.x},${here.y}`);
                    }
                }
                w.last = here;
                // The row drawn, once the facing has held for a frame (the sprite draws after the map update).
                const fr = A && A.frameOf ? A.frameOf(u) : null;
                const d = ev.dir8 ? ev.dir8() : ev.direction();
                if (fr && d === w.lastDir8) {
                    w.rowChecked++;
                    const want = rowWant(u, ev);
                    if (fr.row !== want && w.rowWrong.length < 6) w.rowWrong.push(`${NAME8[d]}: row ${fr.row} (want ${want})`);
                }
                w.lastDir8 = d;
            }
            // The chopper, once at work for 2 frames: its facing and the frame drawn (before any other turn).
            if (chop && !chopSeen && chop.state === "work") {
                const ev = W.eventOf(chopper.id), fr = A && A.frameOf ? A.frameOf(chopper) : null;
                if (++chopFrames >= 2) chopSeen = { d8: ev ? ev.dir8() : 0, want: fr ? fr.want : "", row: fr ? fr.row : -1, stand: chop.stand ? `(${chop.stand.x},${chop.stand.y})` : "none" };
            }
        };
        let shot = false, chopSeen = null, chopFrames = 0;
        const f0 = Graphics.frameCount;
        // The screenshot at zoom 2/3 (level 1): the whole fixture (23 x 18 cells) in view.
        const zoomWas = UF.Camera ? UF.Camera.level() : null;
        if (UF.Camera) UF.Camera.setLevel(1);
        $gamePlayer.locate(cx - 1, cy + 1);
        await t.waitUntil(() => {
            sampleWalk();
            if (!shot && Graphics.frameCount - f0 >= 75) {
                t.screenshot("eight_way");
                shot = true;
            }
            return [d8, d4, rounder].every(u => !u.goal) && (!chop || !!chopSeen || chop.state === "done" || chop.state === "failed") && Graphics.frameCount - f0 >= 80;
        }, 30000, "the 8-way walkers to arrive and the chopper to work").catch(() => {});
        const at = (u, g) => u.x === g.x && u.y === g.y;
        const W8 = walk.get(d8.id), W4 = walk.get(d4.id), WR = walk.get(rounder.id), WC = walk.get(chopper.id);
        out.rounderArrived = at(rounder, goals.get(rounder.id));
        out.rounderTrail = WR.trail;
        out.rounderDiag = WR.diag;
        out.roundedEnd = WR.trail.some(c => c.x < out.lineX0 || c.x > out.lineX1);
        out.rounderFrom = `(${cx + 2},${cy + 2})`;
        out.rounderTo = `(${cx + 2},${cy + 6})`;
        const ev8 = W.eventOf(d8.id), ev4 = W.eventOf(d4.id);
        const walkText = (u, w, name) => `${name} ${at(u, goals.get(u.id)) ? "arrived" : `at (${u.x},${u.y}), not arrived`}: ${w.steps} steps, ${w.diag} diagonal`;
        t.check("eight_way_steps", eightWay && at(d8, goals.get(d8.id)) && at(d4, goals.get(d4.id)) && W8.steps === 8 && W8.diag === 8 && W4.steps === 8 && W4.diag === 8,
            `FourWay ${window.UF_Dir8 ? UF_Dir8.fourWay : "n/a"}; open ground, 8 cells each way: ${walkText(d8, W8, "TEST_diag8 north-east")}; ${walkText(d4, W4, "TEST_diag4 south-east")} (want 8 of 8 diagonal each); TEST_rounder ${WR.diag} diagonal of ${WR.steps}`);

        // Facing on the walk: every step faced (dir8), rows drawn; after the walk, NE on the 8-row sheet and E (the
        // horizontal side of SE) on the stock sheet; RPG Maker alone would have turned it S (vertical) from N.
        const end8 = ev8 ? { d8: ev8.dir8(), row: A && A.frameOf(d8) ? A.frameOf(d8).row : -1, own: A && A.frameOf(d8) ? A.frameOf(d8).own : false } : null;
        const end4 = ev4 ? { d8: ev4.dir8(), dir: ev4.direction(), row: A && A.frameOf(d4) ? A.frameOf(d4).row : -1 } : null;
        const stepFacing = W8.wrongStepFacing + W4.wrongStepFacing + WR.wrongStepFacing;
        const rowsWrong = W8.rowWrong.length + W4.rowWrong.length + WR.rowWrong.length;
        t.check("faces_eight_ways", sheet8 && !!end8 && !!end4 && stepFacing === 0 && rowsWrong === 0 && W8.rowChecked > 20 && W4.rowChecked > 20 &&
            end8.d8 === 9 && end8.row === FACINGS8.indexOf("NE") && end8.own && end4.d8 === 3 && end4.dir === 6 && end4.row === 2,
            `8-row scratch sheet ${sheet8 ? "made" : "NOT made (no UF.Anim)"}; steps not facing their direction ${stepFacing}; rows checked ${W8.rowChecked} (8-row) / ${W4.rowChecked} (stock) / ${WR.rowChecked} (rounder, stock), wrong ${rowsWrong}${rowsWrong ? ": " + [...W8.rowWrong, ...W4.rowWrong, ...WR.rowWrong].slice(0, 4).join(" | ") : ""}; ` +
            `TEST_diag8 after walking NE: dir8 ${end8 ? `${end8.d8} (${NAME8[end8.d8]}), row ${end8.row} drawn by UF_Anim ${end8.own}` : "no event"} (want 9, row ${FACINGS8.indexOf("NE")}); ` +
            `TEST_diag4 (stock) after walking SE from facing N: dir8 ${end4 ? `${end4.d8}, direction ${end4.dir}, row ${end4.row}` : "no event"} (want 3, 6, row 2)`);

        // Facing targets: the chopper at work, a strike, a cast.
        const chopState = chop ? chop.state : "no UF.Jobs";
        const chopStand = chopSeen ? chopSeen.stand : chop && chop.stand ? `(${chop.stand.x},${chop.stand.y})` : "none";
        const chopOk = !!chopSeen && chopSeen.d8 === 9 && chopSeen.want === "work" && chopSeen.row === FACINGS8.indexOf("NE") && chopSeen.stand === `(${tree.x - 1},${tree.y + 1})`;
        if (!shot) t.screenshot("eight_way");
        if (chop && J.cancel && (chop.state === "work" || chop.state === "travel")) J.cancel(chop.id, "test over");
        let strikeOk = false, strikeText = "no UF.Combat";
        const evS = W.eventOf(striker.id);
        if (C && typeof C.playAttackAnimation === "function" && evS) {
            C.playAttackAnimation(striker, struck);
            await t.waitFrames(3);
            const fr = A && A.frameOf ? A.frameOf(striker) : null;
            strikeOk = evS.dir8() === 1 && !!fr && fr.want === "attack" && fr.row === FACINGS8.indexOf("SW");
            strikeText = `dir8 ${evS.dir8()} (${NAME8[evS.dir8()]}), ${fr ? `${fr.want} row ${fr.row}` : "no frame"} (want 1, attack row ${FACINGS8.indexOf("SW")})`;
        }
        caster.data.casting = { targetId: castAt.id };
        await t.waitFrames(3);
        const evK = W.eventOf(caster.id);
        const frK = A && A.frameOf ? A.frameOf(caster) : null;
        const castOk = !!evK && evK.dir8() === 3 && !!frK && frK.want === "cast" && frK.row === FACINGS8.indexOf("SE");
        t.check("faces_targets", eightWay && chopOk && strikeOk && castOk,
            `TEST_chopper from (${cx + 6},${cy + 8}) to chop the tree at (${tree.x},${tree.y}): job now ${chopState}, stand ${chopStand} (want (${tree.x - 1},${tree.y + 1}), south-west), ` +
            `at work: ${chopSeen ? `dir8 ${chopSeen.d8} (${NAME8[chopSeen.d8]}), ${chopSeen.want} row ${chopSeen.row}` : "never seen working"} (want 9, work row ${FACINGS8.indexOf("NE")}); ` +
            `TEST_striker attacking the unit south-west of it: ${strikeText}; TEST_caster casting at a unit 3 east, 2 south: dir8 ${evK ? `${evK.dir8()} (${NAME8[evK.dir8()]})` : "no event"}, ${frK ? `${frK.want} row ${frK.row}` : "no frame"} (want 3, cast row ${FACINGS8.indexOf("SE")})`);

        for (const u of added) W.removeUnit(u.id);
        for (const p of placedTrees) W.setObject(area.x, area.y, p.x, p.y, 0);
        dropDir8Sheet();
        if (UF.Camera && zoomWas !== null) UF.Camera.setLevel(zoomWas);
        return out;
    }

    // Paths (2026-09-19): round a walled ring through its gap, a blocked goal cell, "no path" within 60 frames, a wall
    // going up on the path mid-walk, the planner's budget, and 60 s of play without a walker stepping onto a blocking
    // cell (with World.update's cost per map update over the same window).
    async function pathChecks(t, W, area) {
        const size = W.state.size;
        const O = window.UF.Objects;
        const wallType = O && O.typeId ? (O.typeId("wall_stone") || O.typeId("wall_wood")) : 0;
        if (!O || !wallType || !window.UF.Events) {
            t.check("path_setup", false, `UF.Objects ${!!O}, wall object type ${wallType}, UF.Events ${!!window.UF.Events}: the path checks need all three`);
            return;
        }
        const cellOf = (x, y) => y * size + x;
        const xyOf = c => ({ x: c % size, y: (c - (c % size)) / size });
        const isDoor = (x, y) => window.UF && UF.Doors && UF.Doors.isDoorType && UF.Doors.isDoorType(O.at(x, y));
        const blocksHere = (x, y) => (O.blocks(x, y) && !isDoor(x, y)) || (Tilemap.isWaterTile($gameMap.tileId(x, y, 0)) && !(window.UF.Roads && UF.Roads.bridgeAt && UF.Roads.bridgeAt(x, y)));
        const kindOf = u => (u.data && u.data.kind ? u.data.kind + (u.data.species ? "/" + u.data.species : "") : "?");

        // Watch every unit on screen from here on (at least 60 s): its steps, and steps by walkers (units without
        // data.through) that end on a blocking cell (UF.Objects.blocks, or water that isn't a bridge). World.update is
        // timed over the same window.
        const watch = { steps: 0, diagonal: 0, jumps: 0, bad: [], cornerCuts: [], updates: 0, ms: 0, maxMs: 0, units: new Set(), t0: performance.now(), testMs: 0 };
        const last = new Map();
        const realUpdate = W.update;
        W.update = function() {
            const t0 = performance.now(), test0 = watch.testMs;
            realUpdate.call(this);
            const ms = performance.now() - t0 - (watch.testMs - test0); // the checks' own flood fills (below) don't count
            watch.updates++;
            watch.ms += ms;
            if (ms > watch.maxMs) watch.maxMs = ms;
            for (const u of W.units()) {
                const ev = W.eventOf(u.id);
                if (!ev) continue;
                const p = last.get(u.id);
                if (p && (p.x !== ev.x || p.y !== ev.y)) {
                    const adx = Math.abs(p.x - ev.x), ady = Math.abs(p.y - ev.y);
                    if (adx <= 1 && ady <= 1) {
                        watch.steps++;
                        watch.units.add(u.id);
                        const walker = !(u.data && u.data.through);
                        if (walker && blocksHere(ev.x, ev.y)) watch.bad.push(`${u.name} (${kindOf(u)}) ${p.x},${p.y} -> ${ev.x},${ev.y}`);
                        if (adx === 1 && ady === 1) {
                            // 8-way: a diagonal step past a blocking corner cell (a tree, a wall, water) cuts the corner.
                            watch.diagonal++;
                            if (walker && (blocksHere(ev.x, p.y) || blocksHere(p.x, ev.y))) watch.cornerCuts.push(`${u.name} (${kindOf(u)}) ${p.x},${p.y} -> ${ev.x},${ev.y}`);
                        }
                    } else watch.jumps++;
                }
                last.set(u.id, { x: ev.x, y: ev.y });
            }
        };
        const stats0 = W.pathStats();
        // "No path" must be true: the first 5 such give-ups (any unit) are re-tested at that moment with a flood fill
        // over the map's own passability ($gameMap.isPassable out of the cell and into the next, no water unless a
        // bridge), which knows nothing of the planner's grid or region map.
        const mapStep = (x, y, d) => {
            const x2 = x + (d === 6 ? 1 : d === 4 ? -1 : 0), y2 = y + (d === 2 ? 1 : d === 8 ? -1 : 0);
            if (x2 < 0 || y2 < 0 || x2 >= size || y2 >= size) return -1;
            if (!$gameMap.isPassable(x, y, d) || !$gameMap.isPassable(x2, y2, 10 - d)) return -1;
            if (Tilemap.isWaterTile($gameMap.tileId(x2, y2, 0)) && !(window.UF.Roads && UF.Roads.bridgeAt && UF.Roads.bridgeAt(x2, y2))) return -1;
            return cellOf(x2, y2);
        };
        const mapReach = (sx, sy, targets) => {
            const seen = new Uint8Array(size * size), queue = new Int32Array(size * size);
            let head = 0, tail = 0;
            seen[cellOf(sx, sy)] = 1;
            queue[tail++] = cellOf(sx, sy);
            while (head < tail) {
                const c = queue[head++];
                if (targets.has(c)) return { reached: true, explored: tail };
                const { x, y } = xyOf(c);
                for (const d of [2, 4, 6, 8]) {
                    const nb = mapStep(x, y, d);
                    if (nb >= 0 && !seen[nb]) {
                        seen[nb] = 1;
                        queue[tail++] = nb;
                    }
                }
            }
            return { reached: false, explored: tail };
        };
        const truth = [];
        const blockedLog = [];
        const onBlocked = (u, reason, goal) => {
            if (!u) return;
            if (/^TEST_/.test(u.name)) blockedLog.push({ id: u.id, reason: reason || "?", at: `${u.x},${u.y}` });
            if (reason !== "no path" || truth.length >= 5 || !goal || !sameArea(goal.area, area) || !sameArea(u.area, area)) return;
            const t0 = performance.now();
            const ev = W.eventOf(u.id);
            const sx = ev ? ev.x : u.x, sy = ev ? ev.y : u.y, gc = cellOf(goal.x, goal.y);
            // The goal itself when the map lets anyone step onto it, else its 4 neighbours (a tree, a wall site).
            const around = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dx, dy]) => ({ x: goal.x + dx, y: goal.y + dy })).filter(c => c.x >= 0 && c.y >= 0 && c.x < size && c.y < size);
            const enterable = around.some(c => mapStep(c.x, c.y, c.x < goal.x ? 6 : c.x > goal.x ? 4 : c.y < goal.y ? 2 : 8) === gc);
            const r = mapReach(sx, sy, new Set(enterable ? [gc] : around.map(c => cellOf(c.x, c.y))));
            const ms = performance.now() - t0;
            watch.testMs += ms;
            truth.push({ name: u.name, kind: kindOf(u), from: `${sx},${sy}`, goal: `${goal.x},${goal.y}${enterable ? "" : " (blocked: its neighbours)"}`, reached: r.reached, explored: r.explored, ms });
        };
        UF.Events.on("world:unitBlocked", onBlocked);
        const gaveUp = id => blockedLog.filter(b => b.id === id).map(b => b.reason).join(", ") || "never";
        const finishWatch = () => {
            W.update = realUpdate;
            UF.Events.off("world:unitBlocked", onBlocked);
        };

        // A clear test site: 27x27 cells whose ground lets units walk every way, away from every unit. Objects on it
        // are taken off for the test and put back afterwards.
        const R = 13;
        const ground = new Uint8Array(size * size);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) ground[cellOf(x, y)] = W.walkable(area.x, area.y, x, y, { ground: true }) ? 1 : 0;
        const here = W.units().filter(u => sameArea(u.area, area));
        let site = null;
        for (let cy = R + 6; cy < size - R - 6; cy += 3) {
            for (let cx = R + 6; cx < size - R - 6; cx += 3) {
                let ok = true, objects = 0;
                for (let dy = -R; dy <= R && ok; dy++) {
                    for (let dx = -R; dx <= R; dx++) {
                        const c = cellOf(cx + dx, cy + dy);
                        if (!ground[c]) { ok = false; break; }
                        if ($dataMap.ufObjects[c]) objects++;
                    }
                }
                if (!ok) continue;
                let near = 99;
                for (const u of here) near = Math.min(near, Math.max(Math.abs(u.x - cx), Math.abs(u.y - cy)));
                if (near <= R + 2) continue;
                const score = Math.min(near, 40) * 4 - objects;
                if (!site || score > site.score) site = { cx, cy, score, objects, near };
            }
        }
        if (!site) {
            finishWatch();
            t.check("path_setup", false, `no ${2 * R + 1}x${2 * R + 1} patch of walkable ground at least ${R + 3} cells from every unit in area (${area.x},${area.y})`);
            return;
        }
        const { cx, cy } = site;
        const saved = [];
        for (let dy = -R; dy <= R; dy++) {
            for (let dx = -R; dx <= R; dx++) {
                const x = cx + dx, y = cy + dy, ty = W.getObject(area.x, area.y, x, y);
                if (ty) {
                    saved.push({ x, y, ty });
                    W.setObject(area.x, area.y, x, y, 0);
                }
            }
        }
        const gap = { x: cx, y: cy - 4 };
        const wallCells = new Set();
        for (let dy = -4; dy <= 4; dy++) {
            for (let dx = -4; dx <= 4; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== 4 || (cx + dx === gap.x && cy + dy === gap.y)) continue;
                W.setObject(area.x, area.y, cx + dx, cy + dy, wallType);
                wallCells.add(cellOf(cx + dx, cy + dy));
            }
        }
        $gamePlayer.locate(cx, cy);
        await t.waitFrames(5);

        // 1. Inside the ring to the far side outside, 7 cells past the ring: out through the gap, round the ring, never
        // onto a wall (33 steps; the old step, a 200-node search, pressed against the south wall here).
        const pather = W.addUnit({ name: "TEST_pather", image: { characterName: "People1", characterIndex: 2 }, area, x: cx, y: cy + 2, dir: 8, data: { kind: "test" } });
        await t.waitFrames(2);
        const goalA = { x: cx, y: cy + 11 };
        const trail = [];
        let touches = 0, resends = 0, planLen = -1;
        const arrivedA = () => !pather.goal && pather.x === goalA.x && pather.y === goalA.y;
        const f0 = Graphics.frameCount; // measuring only
        W.sendUnit(pather.id, { area, x: goalA.x, y: goalA.y });
        await t.waitUntil(() => {
            const ev = W.eventOf(pather.id);
            if (ev) {
                const c = cellOf(ev.x, ev.y);
                if (trail[trail.length - 1] !== c) {
                    trail.push(c);
                    if (wallCells.has(c)) touches++;
                }
            }
            if (planLen < 0) {
                const ahead = W.pathOf(pather.id);
                if (ahead) planLen = ahead.length;
            }
            if (!pather.goal && !arrivedA()) {
                // It gave up. A job would ask again after a unit got in its way; the test does too (at most 3 times),
                // but never after "no path".
                const lastB = blockedLog.filter(b => b.id === pather.id).pop();
                if (resends < 3 && lastB && lastB.reason !== "no path") {
                    resends++;
                    W.sendUnit(pather.id, { area, x: goalA.x, y: goalA.y });
                } else return true;
            }
            return arrivedA();
        }, 40000, "TEST_pather to walk out of the ring").catch(() => {});
        const framesA = Graphics.frameCount - f0;
        const viaGap = trail.includes(cellOf(gap.x, gap.y));
        $gamePlayer.locate(cx, cy + 3); // the ring and the goal 11 rows below its centre both in view
        await t.waitFrames(10);
        t.screenshot("path_around_wall");
        $gamePlayer.locate(cx, cy);
        t.check("path_around_wall", arrivedA() && touches === 0 && viaGap,
            `9x9 ring of ${wallCells.size} wall pieces round (${cx},${cy}), gap at (${gap.x},${gap.y}); TEST_pather from (${cx},${cy + 2}) inside to (${goalA.x},${goalA.y}) outside on the far side: ` +
            `${arrivedA() ? "arrived" : `not arrived (at ${pather.x},${pather.y}, goal ${pather.goal ? "still set" : "dropped"})`} after ${framesA} frames and ${trail.length - 1} steps (first plan ${planLen} cells), ` +
            `through the gap: ${viaGap}, wall cells stood on: ${touches}; gave up: ${gaveUp(pather.id)}; sent again ${resends}x; test site: ${site.objects} objects cleared, nearest unit ${site.near} cells away`);

        // 2. A goal cell nobody can stand on (a wall piece) ends at its nearest reachable open neighbour.
        const wallGoal = { x: cx, y: cy + 4 };
        const endOf = p => (p && p.length ? p[p.length - 1] : null);
        const onWall = p => (p || []).filter(c => wallCells.has(cellOf(c.x, c.y))).length;
        const pIn = W.findPath(area, cx, cy + 2, wallGoal.x, wallGoal.y);
        const rIn = W.lastPath ? W.lastPath.reason : "?";
        const pOut = W.findPath(area, goalA.x, goalA.y, wallGoal.x, wallGoal.y);
        const rOut = W.lastPath ? W.lastPath.reason : "?";
        const eIn = endOf(pIn), eOut = endOf(pOut);
        t.check("path_blocked_goal", !!eIn && eIn.x === cx && eIn.y === cy + 3 && !!eOut && eOut.x === cx && eOut.y === cy + 5 && onWall(pIn) + onWall(pOut) === 0,
            `goal: the wall piece at (${wallGoal.x},${wallGoal.y}); from inside (${cx},${cy + 2}): ${eIn ? `${pIn.length} cell(s) ending at (${eIn.x},${eIn.y})` : `no path (${rIn})`} (want (${cx},${cy + 3})); ` +
            `from outside (${goalA.x},${goalA.y}): ${eOut ? `${pOut.length} cell(s) ending at (${eOut.x},${eOut.y})` : `no path (${rOut})`} (want (${cx},${cy + 5})); wall cells on either path: ${onWall(pIn) + onWall(pOut)}`);

        // 3. Close the gap: a goal inside the ring is given up within 60 frames, with no step onto a wall.
        W.setObject(area.x, area.y, gap.x, gap.y, wallType);
        wallCells.add(cellOf(gap.x, gap.y));
        const b0 = blockedLog.length;
        const startB = { x: pather.x, y: pather.y };
        let framesB = -1, touchesB = 0;
        W.sendUnit(pather.id, { area, x: cx, y: cy });
        for (let f = 1; f <= 90; f++) {
            await t.waitFrames(1);
            const ev = W.eventOf(pather.id);
            if (ev && wallCells.has(cellOf(ev.x, ev.y))) touchesB++;
            if (blockedLog.slice(b0).some(b => b.id === pather.id)) {
                framesB = f;
                break;
            }
        }
        const bB = blockedLog.slice(b0).find(b => b.id === pather.id);
        t.check("path_blocked_fast", framesB > 0 && framesB <= 60 && touchesB === 0,
            `goal (${cx},${cy}) inside the ring with its gap closed; TEST_pather outside at (${startB.x},${startB.y}): ` +
            `${framesB > 0 ? `world:unitBlocked after ${framesB} frame(s), reason "${bB ? bB.reason : "?"}"` : "no world:unitBlocked within 90 frames"}; ` +
            `now at (${pather.x},${pather.y}), goal ${pather.goal ? "still set" : "dropped"}; wall cells stood on: ${touchesB}`);

        // 4. Two gaps (north and south), a unit standing still in each: sent inside, a unit goes from one gap to the other
        // and gives up ("no way past") once its path left hasn't got shorter for pathConfig.progressFrames, instead of
        // going back and forth for ever (seen 2026-09-19 with animals at a site's gate held by working colonists).
        const gapS = { x: cx, y: cy + 4 };
        for (const c of [gap, gapS]) {
            W.setObject(area.x, area.y, c.x, c.y, 0);
            wallCells.delete(cellOf(c.x, c.y));
        }
        const sitters = [gap, gapS].map((c, k) => W.addUnit({ name: `TEST_sitter${k + 1}`, image: { characterName: "People1", characterIndex: 4 + k }, area, x: c.x, y: c.y, dir: 2, data: { kind: "test" } }));
        await t.waitFrames(2);
        const b1 = blockedLog.length, startD = { x: pather.x, y: pather.y }, fD = Graphics.frameCount;
        let insideD = 0, touchesD = 0, stepsD = 0, lastD = -1;
        W.sendUnit(pather.id, { area, x: cx, y: cy });
        await t.waitUntil(() => {
            const ev = W.eventOf(pather.id);
            if (ev) {
                const c = cellOf(ev.x, ev.y);
                if (c !== lastD) {
                    if (lastD >= 0) stepsD++;
                    lastD = c;
                    if (wallCells.has(c)) touchesD++;
                    if (Math.max(Math.abs(ev.x - cx), Math.abs(ev.y - cy)) < 4) insideD++;
                }
            }
            return blockedLog.slice(b1).some(b => b.id === pather.id);
        }, 20000, "TEST_pather to give up at the two held gaps").catch(() => {});
        const framesD = Graphics.frameCount - fD;
        const bD = blockedLog.slice(b1).find(b => b.id === pather.id);
        t.check("path_gives_up_when_crowded", !!bD && bD.reason === "no way past" && insideD === 0 && touchesD === 0,
            `gaps at (${gap.x},${gap.y}) and (${gapS.x},${gapS.y}), each held by a unit standing still; TEST_pather from (${startD.x},${startD.y}) sent to (${cx},${cy}) inside: ` +
            `${bD ? `gave up after ${framesD} frames, reason "${bD.reason}"` : `no give-up within ${framesD} frames (goal ${pather.goal ? "still set" : "dropped"})`}, ${stepsD} steps, now at (${pather.x},${pather.y}); ` +
            `cells inside the ring entered: ${insideD}, wall cells stood on: ${touchesD} (progress limit ${W.pathConfig.progressFrames} map updates)`);
        for (const s of sitters) W.removeUnit(s.id);

        // 5. The ring comes down; a unit walks a straight row; a wall goes up on its next path cell mid-walk.
        for (const c of wallCells) W.setObject(area.x, area.y, xyOf(c).x, xyOf(c).y, 0);
        W.removeUnit(pather.id);
        const walker = W.addUnit({ name: "TEST_replanner", image: { characterName: "People1", characterIndex: 3 }, area, x: cx - 7, y: cy, dir: 6, data: { kind: "test" } });
        await t.waitFrames(2);
        const goalC = { x: cx + 7, y: cy };
        const replans0 = W.pathStats().replans;
        const trailC = [cellOf(walker.x, walker.y)];
        let placed = null, aheadWhenPlaced = 0, onPlaced = 0;
        W.sendUnit(walker.id, { area, x: goalC.x, y: goalC.y });
        await t.waitUntil(() => {
            const ev = W.eventOf(walker.id);
            if (ev) {
                const c = cellOf(ev.x, ev.y);
                if (trailC[trailC.length - 1] !== c) trailC.push(c);
                if (placed && c === cellOf(placed.x, placed.y)) onPlaced++;
                if (!placed && ev.x >= cx - 4) {
                    const ahead = W.pathOf(walker.id);
                    if (ahead && ahead.length) {
                        placed = ahead[0];
                        aheadWhenPlaced = ahead.length;
                        W.setObject(area.x, area.y, placed.x, placed.y, wallType);
                    }
                }
            }
            return !walker.goal;
        }, 20000, "TEST_replanner to arrive").catch(() => {});
        const replans = W.pathStats().replans - replans0;
        const arrivedC = !walker.goal && walker.x === goalC.x && walker.y === goalC.y;
        const stepsC = trailC.length - 1;
        t.check("path_replans", !!placed && arrivedC && onPlaced === 0 && stepsC > 14,
            `TEST_replanner from (${cx - 7},${cy}) to (${goalC.x},${goalC.y}) (14 steps in a straight line); a wall went up on its next path cell ${placed ? `(${placed.x},${placed.y}) with ${aheadWhenPlaced} cells to go` : "(never placed)"}; ` +
            `${arrivedC ? "arrived" : `not arrived (at ${walker.x},${walker.y}, goal ${walker.goal ? "still set" : "dropped"})`} after ${stepsC} steps (a detour round the wall makes it more than 14); ` +
            `steps onto the new wall: ${onPlaced}; re-plans counted (all units) ${replans}; gave up: ${gaveUp(walker.id)}`);
        if (placed) W.setObject(area.x, area.y, placed.x, placed.y, 0);
        W.removeUnit(walker.id);
        const eight = await eightWayChecks(t, W, area, cx, cy, blocksHere);
        let restored = 0;
        for (const s of saved) {
            if (W.units().some(u => sameArea(u.area, area) && u.x === s.x && u.y === s.y)) continue;
            W.setObject(area.x, area.y, s.x, s.y, s.ty);
            restored++;
        }

        // 6. Budget: 100 plans of 40-80 cells on this map (seeded picks), each timed.
        const rng = W.mulberry32(W.hash32(W.state.seed, 0x7a7b));
        W.findPath(area, cx, cy, cx + 1, cy); // warm-up: the region map after the test's changes
        const times = [], expandedList = [];
        let tries = 0, capped = 0, outside = 0;
        while (times.length < 100 && tries < 4000) {
            tries++;
            const sx = 4 + Math.floor(rng() * (size - 8)), sy = 4 + Math.floor(rng() * (size - 8));
            const dist = 40 + Math.floor(rng() * 41), ax = Math.floor(rng() * (dist + 1));
            const gx = sx + (rng() < 0.5 ? -ax : ax), gy = sy + (rng() < 0.5 ? ax - dist : dist - ax);
            if (gx < 0 || gy < 0 || gx >= size || gy >= size) continue;
            if (!W.walkable(area.x, area.y, sx, sy) || !W.walkable(area.x, area.y, gx, gy) || !W.reachable(area, sx, sy, gx, gy)) continue;
            const t0 = performance.now();
            const p = W.findPath(area, sx, sy, gx, gy);
            const ms = performance.now() - t0;
            const lp = W.lastPath;
            if (!p || p.length < 40 || p.length > 80) {
                outside++;
                if (lp && lp.reason === "too far to plan") capped++;
                continue;
            }
            times.push(ms);
            expandedList.push(lp.expanded);
        }
        const q = (arr, f) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * f))] : 0);
        const msSorted = times.slice().sort((a, b) => a - b), exSorted = expandedList.slice().sort((a, b) => a - b);
        const avg = times.reduce((a, b) => a + b, 0) / Math.max(1, times.length);
        t.check("path_budget", times.length === 100 && avg <= 1.5,
            `${times.length} plans of 40-80 cells (${tries} seeded picks; ${outside} planned paths outside 40-80 cells, ${capped} of them capped at ${W.pathConfig.maxNodes} cells): ` +
            `average ${avg.toFixed(3)} ms, p95 ${q(msSorted, 0.95).toFixed(3)} ms, max ${q(msSorted, 1).toFixed(3)} ms; cells expanded median ${q(exSorted, 0.5)}, p95 ${q(exSorted, 0.95)}, max ${q(exSorted, 1)}`);

        // 7. The rest of the 60 s: the colony and the animals go on; no walker may step onto a blocking cell.
        await t.waitUntil(() => performance.now() - watch.t0 >= 60000, 80000, "60 s of play").catch(() => {});
        finishWatch();
        const secs = (performance.now() - watch.t0) / 1000;
        const ps = W.pathStats();
        const plans = ps.plans - stats0.plans;
        const planMs = ps.avgMs * ps.plans - stats0.avgMs * stats0.plans;
        const planExp = ps.avgExpanded * ps.plans - stats0.avgExpanded * stats0.plans;
        const gaveUpAll = {};
        for (const k of Object.keys(ps.blocked)) {
            const n = ps.blocked[k] - (stats0.blocked[k] || 0);
            if (n) gaveUpAll[k] = n;
        }
        t.check("no_wall_steps", watch.steps > 0 && watch.bad.length === 0,
            `${secs.toFixed(1)} s of play, ${watch.updates} map updates: ${watch.steps} one-cell steps (${watch.diagonal} diagonal) by ${watch.units.size} units (${watch.jumps} moves of more than one cell), ` +
            `${watch.bad.length} steps by walkers onto blocking cells${watch.bad.length ? ": " + watch.bad.slice(0, 6).join(" | ") : ""}; ` +
            `planner in this window: ${plans} plans (${ps.found - stats0.found} found, ${ps.partial - stats0.partial} partial, ${ps.none - stats0.none} none), ` +
            `${plans ? (planMs / plans).toFixed(3) : "0"} ms average, p95 ${ps.p95Ms.toFixed(3)} ms and max ${ps.maxMs.toFixed(2)} ms (last 512 / all plans), ` +
            `cells expanded ${plans ? (planExp / plans).toFixed(0) : 0} average, median ${ps.medianExpanded}; queue peak ${ps.queuePeak}, ${ps.queuedTotal - stats0.queuedTotal} queued; ` +
            `re-plans ${ps.replans - stats0.replans}, detours round units ${ps.detours - stats0.detours}; gave up: ${JSON.stringify(gaveUpAll)}; ` +
            `region map rebuilt ${ps.regionBuilds - stats0.regionBuilds}x (${ps.regionMsAvg.toFixed(2)} ms average); slowest plan so far ${JSON.stringify(ps.maxPlan)}; ${restored} of ${saved.length} test-site objects put back`);
        // 8-way: no walker stepped diagonally past a blocking corner cell, in the tree-line fixture (its walk and its plan)
        // or anywhere in the 60 s of play.
        t.check("no_corner_cut", !!eight && eight.rounderArrived && eight.roundedEnd && eight.cuts.length === 0 && eight.planCuts === 0 && eight.planDiagonals > 0 && watch.cornerCuts.length === 0,
            eight ? `tree line of 7 at row ${eight.lineY} (x ${eight.lineX0}-${eight.lineX1}); TEST_rounder ${eight.rounderFrom} -> ${eight.rounderTo}: ${eight.rounderArrived ? "arrived" : "NOT arrived"} in ${eight.rounderTrail.length - 1} steps (${eight.rounderDiag} diagonal), round an end of the line ${eight.roundedEnd}; ` +
                `its plan ${eight.planLen} cells, ${eight.planDiagonals} diagonal, ${eight.planCuts} past a tree corner; diagonal steps past a blocking corner in the fixture ${eight.cuts.length}${eight.cuts.length ? ": " + eight.cuts.slice(0, 4).join(" | ") : ""}; ` +
                `in ${secs.toFixed(1)} s of play ${watch.diagonal} diagonal steps, ${watch.cornerCuts.length} past a blocking corner by walkers${watch.cornerCuts.length ? ": " + watch.cornerCuts.slice(0, 6).join(" | ") : ""}`
                : "the 8-way fixtures did not run");
        const falseNoPath = truth.filter(r => r.reached);
        t.check("no_path_is_true", truth.length > 0 && falseNoPath.length === 0,
            `${truth.length} "no path" give-ups re-tested at that moment with a flood fill over $gameMap.isPassable (out of the cell and into the next, no water): ${falseNoPath.length} could reach the goal after all; ` +
            truth.map(r => `${r.name} (${r.kind}) ${r.from} -> ${r.goal}: ${r.reached ? "REACHABLE" : "unreachable"} (${r.explored} cells flooded, ${r.ms.toFixed(0)} ms)`).join("; "));
        const perUpdate = watch.updates ? watch.ms / watch.updates : 0;
        t.check("frame_cost", watch.updates > 0 && perUpdate <= 1.0,
            `UF.World.update ${perUpdate.toFixed(3)} ms average per map update over ${watch.updates} updates, worst ${watch.maxMs.toFixed(2)} ms; ${W.units().length} units; ` +
            `includes planning (the path checks' own findPath calls are outside it)`);
    }

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "spawn", VISION V68; not in the default run: it plays 60 s of game time). Every unit stands
    // on a cell it could walk onto, after world creation and after play; addUnit moves units off blocked cells and keeps
    // exact ones; nothing that blocks is built or regrows onto a unit.

    async function spawnChecks(t) {
        const W = World, st = W.state, area = W.currentArea();
        if (!st || !area) {
            t.check("in_area_map", false, `map ${$gameMap.mapId()} is not an area map`);
            return;
        }
        const O = window.UF.Objects;
        const size = st.size;
        const note = PROVOKE.length ? ` [PROVOKED: ${PROVOKE.join(", ")}]` : "";
        const kindOf = u => (u.data && u.data.kind) || "none";
        const inMap = (x, y) => x >= 0 && y >= 0 && x < size && y < size;
        const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
        const isWater = (x, y) => Tilemap.isWaterTile($gameMap.tileId(x, y, 0));
        const free = (x, y, ignore = 0) => inMap(x, y) && W.cellFree(area.x, area.y, x, y, ignore);
        const img = { characterName: "People1", characterIndex: 1 };
        const testUnits = [];
        const placed = [];   // objects this suite changed: put back at the end
        const setObj = (x, y, typeId) => {
            placed.push({ x, y, t: W.getObject(area.x, area.y, x, y) });
            W.setObject(area.x, area.y, x, y, typeId);
        };
        // Why a unit's cell isn't one it can stand on (for the report only; the checks use World.cellFree).
        const whyNot = u => {
            const x = u.x, y = u.y;
            if (!sameArea(u.area, area)) return `off screen in area (${u.area.x},${u.area.y})`;
            const ob = O && O.atIn ? O.atIn(area, x, y) : null;
            if (ob && O.blocks(x, y)) return `object "${ob.id}"`;
            if (isWater(x, y)) return "water";
            if (!$gameMap.isPassable(x, y, 2) && !$gameMap.isPassable(x, y, 8)) return `impassable tile ${$gameMap.tileId(x, y, 0)}`;
            const other = W.units().find(o => o.id !== u.id && sameArea(o.area, u.area) && o.x === x && o.y === y);
            if (other) return `shares the cell with "${other.name}" (${kindOf(other)})`;
            return "World.cellFree says no (a shut door?)";
        };
        // A unit stands where it may: World.cellFree ignoring itself, or a cell it could walk onto whose only other
        // occupants pass through everything (a walker under a flier: RMMZ lets it walk there too; cellFree itself stays
        // strict, so nothing spawns under a bird).
        let underFliers = 0;
        const standsOk = u => {
            if (W.cellFree(u.area.x, u.area.y, u.x, u.y, u.id)) return true;
            const others = W.units().filter(o => o.id !== u.id && sameArea(o.area, u.area) && o.x === u.x && o.y === u.y);
            if (others.length && others.every(o => o.data && o.data.through) && W.walkable(u.area.x, u.area.y, u.x, u.y, { unit: u })) {
                underFliers++;
                return true;
            }
            return false;
        };
        const scan = () => {
            const kinds = {}, bad = [];
            let checked = 0, through = 0;
            underFliers = 0;
            for (const u of W.units()) {
                if (u.data && u.data.through) { through++; continue; }
                checked++;
                const k = kindOf(u);
                const e = kinds[k] || (kinds[k] = { n: 0, bad: 0 });
                e.n++;
                if (!standsOk(u)) {
                    e.bad++;
                    bad.push(`"${u.name}" (${k}) at (${u.x},${u.y}): ${whyNot(u)}`);
                }
            }
            const text = Object.keys(kinds).sort().map(k => `${k} ${kinds[k].n}${kinds[k].bad ? ` (${kinds[k].bad} BAD)` : ""}`).join(", ");
            return { checked, through, bad, text: text + (underFliers ? `; ${underFliers} walker(s) under a flier (allowed)` : "") };
        };
        // spawn.misplace: one unit put on a tree cell just before a scan (and back after it).
        const misplace = () => {
            if (!provoked("misplace") || !O) return null;
            const victim = W.units().find(u => !(u.data && u.data.through) && sameArea(u.area, area));
            const tree = victim && O.findIn(area, { near: { x: victim.x, y: victim.y }, radius: 60, tags: ["tree"], limit: 1 })[0];
            if (!tree) return null;
            const was = { u: victim, x: victim.x, y: victim.y };
            W.stopUnit(victim.id);
            victim.x = tree.x;
            victim.y = tree.y;
            const ev = W.eventOf(victim.id);
            if (ev) ev.locate(tree.x, tree.y);
            return was;
        };
        const unmisplace = was => {
            if (!was) return;
            was.u.x = was.x;
            was.u.y = was.y;
            const ev = W.eventOf(was.u.id);
            if (ev) ev.locate(was.x, was.y);
        };
        const cat = window.$ufWorldCatalog;
        const species = (cat && cat.wildlife && cat.wildlife.species) || [];
        const waterWords = /swim|aquatic|water|fish|marine/i;
        const dwellers = species.filter(sp => waterWords.test(`${sp.kind || ""} ${(sp.tags || []).join(" ")} ${sp.habitat || ""}`)).map(sp => sp.id);

        // 1. Right after world creation: the camp in view (the closest zoom showing every unit within 14 cells of where
        // the view starts), then every unit's cell.
        const home = { x: $gamePlayer.x, y: $gamePlayer.y };
        const C = window.UF.Camera;
        const level0 = C ? C.level() : 0;
        const camp = W.units().filter(u => sameArea(u.area, area) && cheb(u, home) <= 14);
        let bx0 = home.x, bx1 = home.x, by0 = home.y, by1 = home.y;
        for (const u of camp) {
            bx0 = Math.min(bx0, u.x); bx1 = Math.max(bx1, u.x);
            by0 = Math.min(by0, u.y); by1 = Math.max(by1, u.y);
        }
        if (C) {
            for (let i = 0; i < C.levels.length; i++) {
                C.setLevel(i);
                if ($gameMap.screenTileX() >= bx1 - bx0 + 3 && $gameMap.screenTileY() >= by1 - by0 + 3) break;
            }
        }
        $gamePlayer.locate(Math.round((bx0 + bx1) / 2), Math.round((by0 + by1) / 2));
        await t.waitFrames(10);
        let was = misplace();
        t.screenshot("camp_after_new_game");
        const s1 = scan();
        unmisplace(was);
        const stats1 = W.spawnStats();
        delete stats1.last;
        const campNow = W.units().filter(u => sameArea(u.area, area) && cheb(u, home) <= 16);
        t.check("all_units_on_standable_cells", s1.checked > 0 && s1.bad.length === 0,
            `${s1.checked} units checked (${s1.through} passing through everything skipped): ${s1.text}; ${s1.bad.length} on a cell they can't stand on` +
            `${s1.bad.length ? ": " + s1.bad.slice(0, 8).join(" | ") : ""}; seated since world creation: ${JSON.stringify(stats1)}; ` +
            `water dwellers: ${dwellers.length ? dwellers.join(", ") + " (left to the land rule)" : "none (no wildlife species is tagged for water: every unit follows the land rule)"}; ` +
            `camp shot at zoom ${C ? C.zoom().toFixed(3) : 1} centred on (${$gamePlayer.x},${$gamePlayer.y}): ${campNow.length} units within 16 cells of (${home.x},${home.y}): ` +
            campNow.slice(0, 24).map(u => `${u.name || "?"}@${u.x},${u.y}${W.cellFree(area.x, area.y, u.x, u.y, u.id) || (u.data && u.data.through) ? "" : " BLOCKED"}`).join(", ") + note);
        if (C) C.setLevel(level0);

        // 2. Asked for a tree, a boulder, water and a cell another unit stands on: each lands on the nearest free cell.
        const taken = () => new Set(W.units().filter(u => sameArea(u.area, area)).map(u => u.y * size + u.x));
        let occ = taken();
        const ring = function* (c, rmax) {
            for (let r = 0; r <= rmax; r++) {
                for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && inMap(c.x + dx, c.y + dy)) yield { x: c.x + dx, y: c.y + dy };
                    }
                }
            }
        };
        const find = (pred, rmax) => {
            for (const c of ring(home, rmax)) if (pred(c.x, c.y)) return c;
            return null;
        };
        const freeBeside = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => free(x + dx, y + dy));
        const clearSpot = (away = 2) => find((x, y) => {
            if (!free(x, y) || W.getObject(area.x, area.y, x, y) || !freeBeside(x, y)) return false;
            for (let dy = -away; dy <= away; dy++) for (let dx = -away; dx <= away; dx++) if (occ.has((y + dy) * size + x + dx)) return false;
            return true;
        }, 80);
        const blockingTagged = tag => (x, y) => {
            const o = O.atIn(area, x, y);
            return !!o && (o.tags || []).includes(tag) && O.blocks(x, y) && !occ.has(y * size + x) && freeBeside(x, y);
        };
        const cases = [];
        const tryCase = (label, cell, add) => {
            if (!cell) {
                cases.push({ label, ok: false, text: `${label}: no such cell found` });
                return null;
            }
            const blocked = !free(cell.x, cell.y);
            const u = add ? add(cell) : W.addUnit({ name: `TEST_spawn_${label}`, image: img, area, x: cell.x, y: cell.y, dir: 2, data: { kind: "test" } });
            if (!u) {
                cases.push({ label, ok: false, text: `${label}: no unit was added` });
                return null;
            }
            testUnits.push(u);
            const d = cheb(u, cell);
            const stands = sameArea(u.area, area) && free(u.x, u.y, u.id);
            let closer = null;
            for (let dy = -(d - 1); dy <= d - 1 && !closer; dy++) {
                for (let dx = -(d - 1); dx <= d - 1; dx++) {
                    if (free(cell.x + dx, cell.y + dy, u.id)) { closer = { x: cell.x + dx, y: cell.y + dy }; break; }
                }
            }
            const ev = W.eventOf(u.id);
            const ok = blocked && d > 0 && stands && !closer && !!ev && ev.x === u.x && ev.y === u.y;
            cases.push({ label, ok, text: `${label} (${cell.x},${cell.y}) ${blocked ? "blocked" : "NOT blocked"} -> "${u.name}" at (${u.x},${u.y}), ${d} away, ` +
                `${stands ? "free" : "NOT free: " + whyNot(u)}, closer free cell ${closer ? `(${closer.x},${closer.y}) EXISTS` : "none"}, event ${ev ? `at (${ev.x},${ev.y})` : "MISSING"}` });
            return u;
        };
        let tree = O ? find(blockingTagged("tree"), 80) : null;
        if (!tree && O) {
            tree = clearSpot();
            if (tree) setObj(tree.x, tree.y, O.typeId("oak"));
        }
        let boulder = O ? find(blockingTagged("boulder"), 80) : null;
        if (!boulder && O) {
            boulder = clearSpot();
            if (boulder) setObj(boulder.x, boulder.y, O.typeId("granite_boulder"));
        }
        const water = find((x, y) => isWater(x, y) && freeBeside(x, y), 128);
        tryCase("tree", tree);
        tryCase("boulder", boulder);
        tryCase("water", water);
        const held = clearSpot();
        const holder = held ? W.addUnit({ name: "TEST_spawn_holder", image: img, area, x: held.x, y: held.y, dir: 2, data: { kind: "test" } }) : null;
        if (holder) testUnits.push(holder);
        tryCase("occupied", holder && holder.x === held.x && holder.y === held.y ? held : null);
        // A real spawner that never asked for a free cell (UF_Combat's hostile spawn) sent to the tree.
        if (window.UF.Combat && typeof UF.Combat.spawnHostile === "function" && tree) {
            tryCase("hostile_on_tree", tree, c => UF.Combat.spawnHostile("wolf", c.x, c.y));
        }
        t.check("addUnit_moves_off_blocked", cases.length >= 4 && cases.every(c => c.ok),
            cases.map(c => `${c.ok ? "" : "BAD "}${c.text}`).join("; ") + note);
        for (const u of testUnits.splice(0)) W.removeUnit(u.id);

        // 3. exact: true keeps the cell asked for: a free cell, then the same cell again (exact wins even though the
        // first unit now stands there; a warning names it), then the same cell without exact (moved).
        occ = taken();
        const spot = clearSpot();
        if (!spot) {
            t.check("exact_respected", false, "no clear cell near the camp for the fixture");
        } else {
            const wasFree = free(spot.x, spot.y);
            const a = W.addUnit({ name: "TEST_exact_a", image: img, area, x: spot.x, y: spot.y, dir: 2, exact: true, data: { kind: "test" } });
            const b = W.addUnit({ name: "TEST_exact_b", image: img, area, x: spot.x, y: spot.y, dir: 2, exact: true, data: { kind: "test" } });
            const c = W.addUnit({ name: "TEST_exact_c", image: img, area, x: spot.x, y: spot.y, dir: 2, data: { kind: "test" } });
            testUnits.push(a, b, c);
            const at = u => u.x === spot.x && u.y === spot.y;
            t.check("exact_respected", wasFree && at(a) && at(b) && !at(c),
                `cell (${spot.x},${spot.y}) free before: ${wasFree}; exact on the free cell -> (${a.x},${a.y}) ${at(a) ? "kept" : "MOVED"}; ` +
                `exact again on it while TEST_exact_a stands there -> (${b.x},${b.y}) ${at(b) ? "kept" : "MOVED"}; ` +
                `the same without exact -> (${c.x},${c.y}) ${at(c) ? "NOT MOVED" : "moved"}; last warning: ${W.spawnStats().last.slice(-1)[0] || "none"}${note}`);
            for (const u of testUnits.splice(0)) W.removeUnit(u.id);
        }

        // 4. Nothing that blocks goes onto a unit's cell: a forced regrowth (a regrow entry due now, empty cell -> berry
        // bush) waits while the unit stands there and grows once it has left; a build (wall) is refused while a unit
        // stands there and goes up once it has left. A plant that doesn't block may go under a unit.
        occ = taken();
        const bush = O ? O.typeId("berry_bush") : 0;
        const rCell = O ? clearSpot() : null;
        if (rCell) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) occ.add((rCell.y + dy) * size + rCell.x + dx);
        const bCell = O ? clearSpot() : null;
        if (!O || !bush || !rCell || !bCell || !O.regrowList || !O.hourNow) {
            t.check("no_object_on_unit", false, `fixture: UF.Objects ${!!O}, berry_bush ${bush}, cells ${JSON.stringify(rCell)} ${JSON.stringify(bCell)}`);
        } else {
            const hour = () => {
                if (window.$ufTime) $ufTime.advanceMinute(60); // time:hour, as the clock does
                else O.processRegrow();
            };
            const entryAt = c => O.regrowList().find(e => e.x === c.x && e.y === c.y && sameArea(e.area, area));
            const waits0 = W.spawnStats().regrowWaits;
            const ru = W.addUnit({ name: "TEST_regrow_stander", image: img, area, x: rCell.x, y: rCell.y, dir: 2, data: { kind: "test" } });
            const ruHere = ru.x === rCell.x && ru.y === rCell.y;
            O.regrowList().push({ area: { x: area.x, y: area.y }, x: rCell.x, y: rCell.y, from: 0, to: bush, due: O.hourNow() });
            hour();
            const whileThere = W.getObject(area.x, area.y, rCell.x, rCell.y);
            const pending = entryAt(rCell);
            const waited = !!pending && pending.due > O.hourNow();
            const pendingText = pending ? `due hour ${pending.due} (now ${O.hourNow()})` : "GONE";
            W.removeUnit(ru.id);
            hour();
            const afterLeft = W.getObject(area.x, area.y, rCell.x, rCell.y);
            const cleared = !entryAt(rCell);
            O.setIn(area, rCell.x, rCell.y, null);

            const bu = W.addUnit({ name: "TEST_build_stander", image: img, area, x: bCell.x, y: bCell.y, dir: 2, data: { kind: "test" } });
            const buHere = bu.x === bCell.x && bu.y === bCell.y;
            W.lastObjectRefusal = null;
            const wallIn = O.setIn(area, bCell.x, bCell.y, "wall_stone");
            const refusal = W.lastObjectRefusal;
            const wallOn = O.set(bCell.x, bCell.y, "wall_wood");
            const under = W.getObject(area.x, area.y, bCell.x, bCell.y);
            const plant = O.setIn(area, bCell.x, bCell.y, "flowers");
            O.setIn(area, bCell.x, bCell.y, null);
            W.removeUnit(bu.id);
            const wallAfter = O.setIn(area, bCell.x, bCell.y, "wall_stone");
            const builtAfter = W.getObject(area.x, area.y, bCell.x, bCell.y) === O.typeId("wall_stone");
            O.setIn(area, bCell.x, bCell.y, null);
            const ok = ruHere && whileThere === 0 && waited && afterLeft === bush && cleared &&
                buHere && wallIn === false && wallOn === false && under === 0 && !!refusal && refusal.unitId === bu.id && plant === true && wallAfter === true && builtAfter;
            t.check("no_object_on_unit", ok,
                `regrowth at (${rCell.x},${rCell.y}) (${window.$ufTime ? "clock hour" : "processRegrow"}): unit there ${ruHere}; after an hour the cell holds ${whileThere ? `type ${whileThere} (A BUSH ON THE UNIT)` : "nothing"}, ` +
                `entry ${pendingText}; regrowth waits +${W.spawnStats().regrowWaits - waits0}; after the unit left and an hour: ${afterLeft === bush ? "berry bush" : `type ${afterLeft}`}, entry ${cleared ? "cleared" : "still there"}. ` +
                `Build at (${bCell.x},${bCell.y}): unit there ${buHere}; setIn wall_stone -> ${wallIn}, set wall_wood -> ${wallOn}, cell holds ${under ? `type ${under} (A WALL ON THE UNIT)` : "nothing"}; ` +
                `reason: ${refusal ? refusal.reason : "none recorded"}; flowers under the unit -> ${plant}; wall after it left -> ${wallAfter} (${builtAfter ? "built" : "NOT built"})${note}`);
        }

        // 5. 60 s of game time (3600 map updates) at the fastest speed with the colony, wildlife and regrowth running,
        // plus a birth, a hostile spawn onto a tree and regrowth forced onto occupied cells a third of the way in. Every
        // unit added is checked the moment it appears; every unit at the end.
        const T = window.UF.Time, Col = window.UF.Colonists;
        const ticks = () => (T ? T.ticks() : Graphics.frameCount);
        const added = [];
        const onAdded = u => {
            const through = !!(u.data && u.data.through);
            const ok = through || W.cellFree(u.area.x, u.area.y, u.x, u.y, u.id);
            added.push({ name: u.name, kind: kindOf(u), at: `${u.x},${u.y}`, ok, why: ok ? "" : whyNot(u) });
        };
        UF.Events.on("world:unitAdded", onAdded);
        if (T) {
            if (T.paused) T.resume();
            T.setLevel(T.speeds.length - 1);
        }
        const t0 = ticks(), real0 = performance.now(), waits1 = W.spawnStats().regrowWaits;
        let forced = null;
        await t.waitUntil(() => ticks() - t0 >= 1200, 45000, "a third of the play").catch(() => {});
        {
            const f = { birth: "no colonist", hostile: "no UF.Combat", regrow: 0 };
            const mother = Col && Col.list ? (Col.list().find(u => u.data && u.data.gender === "female") || Col.list()[0]) : null;
            if (mother && Col.giveBirth) {
                const child = Col.giveBirth(mother);
                f.birth = child ? `"${child.name}" born at (${child.x},${child.y}), mother at (${mother.x},${mother.y})` : "giveBirth returned nothing";
            }
            const treeNow = O ? O.findIn(area, { near: home, radius: 40, tags: ["tree"], limit: 1 })[0] : null;
            if (window.UF.Combat && UF.Combat.spawnHostile && treeNow) {
                const wolf = UF.Combat.spawnHostile("wolf", treeNow.x, treeNow.y);
                f.hostile = wolf ? `wolf asked for the tree at (${treeNow.x},${treeNow.y}), at (${wolf.x},${wolf.y})` : "spawnHostile returned nothing";
                if (wolf) W.removeUnit(wolf.id);
            }
            if (O && O.regrowList && bush) {
                for (const u of W.units()) {
                    if (f.regrow >= 3) break;
                    if ((u.data && u.data.through) || !sameArea(u.area, area) || W.getObject(area.x, area.y, u.x, u.y)) continue;
                    O.regrowList().push({ area: { x: area.x, y: area.y }, x: u.x, y: u.y, from: 0, to: bush, due: O.hourNow() });
                    f.regrow++;
                }
                if (window.$ufTime) $ufTime.advanceMinute(60);
            }
            forced = f;
        }
        await t.waitUntil(() => ticks() - t0 >= 3600, 75000, "60 s of game time").catch(() => {});
        UF.Events.off("world:unitAdded", onAdded);
        const played = ticks() - t0, realS = (performance.now() - real0) / 1000;
        if (T) T.setLevel(0);
        was = misplace();
        const s2 = scan();
        unmisplace(was);
        const addedBad = added.filter(a => !a.ok);
        const addedKinds = {};
        for (const a of added) addedKinds[a.kind] = (addedKinds[a.kind] || 0) + 1;
        t.check("after_play", played >= 3600 && s2.checked > 0 && s2.bad.length === 0 && added.length > 0 && addedBad.length === 0,
            `${played} map updates (${(played / 60).toFixed(0)} s of game time at x1) at speed x${T ? T.speeds[T.speeds.length - 1] : 1} in ${realS.toFixed(1)} s real time; ` +
            `${s2.checked} units checked (${s2.through} passing through everything skipped): ${s2.text}; ${s2.bad.length} on a cell they can't stand on${s2.bad.length ? ": " + s2.bad.slice(0, 8).join(" | ") : ""}; ` +
            `${added.length} units added during play (${Object.keys(addedKinds).map(k => `${k} ${addedKinds[k]}`).join(", ") || "none"}), ${addedBad.length} on a blocked cell when they appeared` +
            `${addedBad.length ? ": " + addedBad.slice(0, 6).map(a => `"${a.name}" (${a.kind}) at (${a.at}): ${a.why}`).join(" | ") : ""}; ` +
            `forced a third of the way in: birth ${forced ? forced.birth : "not reached"}; hostile ${forced ? forced.hostile : "-"}; regrowth due on ${forced ? forced.regrow : 0} occupied cells, regrowth waits +${W.spawnStats().regrowWaits - waits1}; ` +
            `arrivals: no plugin in plugins.js adds arrivals yet${note}`);

        for (const p of placed.reverse()) W.setObject(area.x, area.y, p.x, p.y, p.t);
        $gamePlayer.locate(home.x, home.y);
        await t.waitFrames(10);
        t.check("no_errors", t.errorsSoFar().length === 0,
            t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during the spawn checks");
    }

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
            // Five levels (VISION V80): the ground keeps its map id; each level has its own id that levelOfMapId turns back
            // into that level; the legacy areaOfMapId knows only the ground; a sixth level doesn't exist.
            {
                const ids = W.LEVELS.map(z => W.areaMapId(area.x, area.y, z));
                const back = ids.map(id => W.levelOfMapId(id));
                const roundTrip = W.LEVELS.every((z, i) => !!back[i] && back[i].z === z && back[i].x === area.x && back[i].y === area.y);
                const distinct = new Set(ids).size === W.LEVELS.length && ids.every(id => id > 0);
                const groundId = W.areaMapId(area.x, area.y) === W.areaMapId(area.x, area.y, 0) && W.areaMapId(0, 0) === W.config.mapIdBase;
                const legacyGround = W.areaOfMapId(W.areaMapId(area.x, area.y, -1)) === null && sameArea(W.areaOfMapId(W.areaMapId(area.x, area.y)), area);
                const noSixth = W.inWorld(area.x, area.y, 3) === false && W.inWorld(area.x, area.y, -3) === false && W.areaMapId(area.x, area.y, 3) === 0;
                t.check("level_ids", roundTrip && distinct && groundId && legacyGround && noSixth,
                    `levels ${W.LEVELS.join(", ")} -> map ids ${ids.join(", ")} (${distinct ? "distinct" : "NOT distinct"}); levelOfMapId round trip ${roundTrip}; ground id ${W.areaMapId(0, 0)} (MapIdBase ${W.config.mapIdBase}, ${groundId ? "unchanged" : "CHANGED"}); ` +
                    `areaOfMapId(level -1) ${JSON.stringify(W.areaOfMapId(W.areaMapId(area.x, area.y, -1)))} (want null); inWorld at level 3 / -3: ${W.inWorld(area.x, area.y, 3)} / ${W.inWorld(area.x, area.y, -3)}${PROVOKE.length ? ` [PROVOKED: ${PROVOKE.join(", ")}]` : ""}`);
            }

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
            // One area: the start and the goal are 15 cells apart on a straight open row (the world's rim is ocean, and a
            // faction's walls may cross row 128), so the walk is 15 steps west. Rows are searched outward from 128.
            let row = 128, goalX = multi ? 3 : null, startX = multi ? size - 4 : null;
            if (!multi) {
                const taken = new Set(W.unitsInArea(area.x, area.y).map(o => o.y * size + o.x));
                const open = (x, y) => W.walkable(area.x, area.y, x, y) && !taken.has(y * size + x);
                search: for (let k = 0; k < 120; k++) {
                    const r = 128 + (k % 2 ? -((k + 1) >> 1) : k >> 1);
                    for (let x = size / 2 - 40; x >= 3; x--) {
                        let ok = true;
                        for (let i = 0; i <= 15 && ok; i++) ok = open(x + i, r);
                        if (ok) {
                            row = r;
                            goalX = x;
                            startX = x + 15;
                            break search;
                        }
                    }
                }
            }
            $gamePlayer.locate(8, row);
            const u = W.addUnit({ name: "TEST_walker", image: { characterName: "People1", characterIndex: 0 }, area: west, x: startX, y: row, dir: 6 });
            if (multi) t.check("unit_starts_offscreen", !W.eventOf(u.id), `unit ${u.id} in area (${u.area.x},${u.area.y}) at (${u.x},${u.y})`);
            else t.check("single_area_world", st.areasX === 1 && st.areasY === 1 && $gameMap.mapId() === W.areaMapId(0, 0) && goalX !== null && startX !== null, `${st.areasX}x${st.areasY} areas, map ${$gameMap.mapId()}; walk from x ${startX} to x ${goalX} on row ${row}`);
            W.sendUnit(u.id, { area, x: goalX, y: row });
            await t.waitUntil(() => !!W.eventOf(u.id), 8000, "TEST_walker to be on the area on screen").catch(() => {});
            const ev = W.eventOf(u.id);
            const sprite = ev && SceneManager._scene._spriteset._characterSprites.find(s => s._character === ev);
            t.check("unit_enters_view", !!ev && !!sprite,
                ev ? `event ${ev.eventId()} at (${ev.x},${ev.y}), sprite ${sprite ? "created" : "MISSING"}` : `still in area (${u.area.x},${u.area.y}) at (${u.x},${u.y})`);
            // It faces every step it takes (a diagonal step: its diagonal, dir8). 8-way steps: eight_way_steps below.
            let diagonal = 0, facedSteps = 0, wrongFaced = 0;
            const origDiag = ev ? ev.moveDiagonally : null, origStraight = ev ? ev.moveStraight : null;
            if (ev) ev.moveDiagonally = function(h, v) { origDiag.call(this, h, v); if (this.isMovementSucceeded()) { facedSteps++; diagonal++; if (this.dir8() !== UF_Dir8.combine(h, v)) wrongFaced++; } };
            if (ev) ev.moveStraight = function(d) { origStraight.call(this, d); if (this.isMovementSucceeded()) { facedSteps++; if (this.direction() !== d) wrongFaced++; } };
            await t.waitUntil(() => !u.goal, 14000, "TEST_walker to reach its goal").catch(() => {});
            await t.waitFrames(2);
            if (ev) { ev.moveDiagonally = origDiag; ev.moveStraight = origStraight; }
            t.check("faces_its_steps", facedSteps > 0 && wrongFaced === 0 && (!ev || ev.direction() === 4),
                `${facedSteps} step(s) taken (${diagonal} diagonal), ${wrongFaced} not facing the step's direction; facing ${ev ? ev.direction() : "?"} after walking west (want 4)`);
            t.check("unit_walks_to_goal", !u.goal && sameArea(u.area, area) && u.x === goalX && u.y === row,
                `at (${u.x},${u.y}) in area (${u.area.x},${u.area.y}), goal (${goalX},${row}) ${u.goal ? "still set" : u.x === goalX && u.y === row ? "reached" : "given up"}`);
            await t.waitFrames(10);
            t.screenshot("unit_in_view");

            // Spawning never lands in a wall, a tree or water: snapToFree moves the unit to the nearest free cell.
            if (window.UF.Objects && UF.Objects.typeId) {
                const treeType = UF.Objects.typeId("oak") || UF.Objects.typeId("pine");
                const wx = 100, wy = 100;
                W.setObject(area.x, area.y, wx, wy, treeType);
                const blockedNow = !W.cellFree(area.x, area.y, wx, wy);
                const spawned = W.addUnit({ name: "TEST_spawn", image: { characterName: "People1", characterIndex: 1 }, area, x: wx, y: wy, snapToFree: true });
                const onTree = spawned.x === wx && spawned.y === wy;
                const dist = Math.max(Math.abs(spawned.x - wx), Math.abs(spawned.y - wy));
                t.check("spawn_not_in_walls", blockedNow && !onTree && dist <= 6 && W.cellFree(area.x, area.y, spawned.x, spawned.y, spawned.id),
                    `an oak was set at (${wx},${wy}) (free: ${!blockedNow}); the unit spawned at (${spawned.x},${spawned.y}), ${dist} cell(s) away, on a free cell: ${W.cellFree(area.x, area.y, spawned.x, spawned.y, spawned.id)}`);
                W.removeUnit(spawned.id);
                W.setObject(area.x, area.y, wx, wy, 0);
            }

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
                // One area: round world wraps from east edge to west edge.
                $gamePlayer.locate(size - 1, row);
                $gamePlayer.moveStraight(6);
                await t.waitFrames(10);
                const wantX = ($gameMap && $gameMap.isLoopHorizontal()) ? 0 : size - 1;
                t.check("view_wraps_in_round_world", sameArea(W.currentArea(), area) && $gamePlayer.x === wantX, `view at (${$gamePlayer.x},${$gamePlayer.y}) after stepping east at the edge (expected ${wantX})`);
                t.screenshot("round_seam_wrap");
                if ($gameMap && $gameMap.isLoopHorizontal()) {
                    $gamePlayer.moveStraight(4);
                    await t.waitFrames(10);
                    t.check("view_wraps_back_west", sameArea(W.currentArea(), area) && $gamePlayer.x === size - 1, `view returned to (${$gamePlayer.x},${$gamePlayer.y}) after stepping west from 0`);
                }
            }
            t.check("diff_persists", $dataMap.data[idx] === changed && $dataMap.ufObjects[oy * size + ox] === 7,
                `tile (${tx},${ty}) is ${$dataMap.data[idx]} (expected ${changed}) and object (${ox},${oy}) is ${$dataMap.ufObjects[oy * size + ox]} (expected 7) after leaving and returning`);

            W.setTile(area.x, area.y, tx, ty, 0, before);
            W.setObject(area.x, area.y, ox, oy, 0);
            W.removeUnit(u.id);
            await pathChecks(t, W, area);
            await t.waitFrames(60);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during world checks");
        });
        UF.Test.suite("spawn", spawnChecks, { isDefault: false });
    }
})();
