//=============================================================================
// UF_World.js - A world of 256x256 areas; units and the view travel between them
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF World] World made of 256x256 areas. Units and the view travel between areas; off-screen units keep moving.
 * @author UF project
 * @orderAfter UF_ProcGen
 *
 * @param AreasX
 * @text Areas across
 * @type number
 * @min 1
 * @default 6
 *
 * @param AreasY
 * @text Areas down
 * @type number
 * @min 1
 * @default 6
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
 * @default 2
 * @desc Editor map stamped into the middle of the start area (the glade). 0 = none.
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
 * The world is a grid of areas. Areas have no map files: each one is built
 * in memory when visited, from the world seed, the registered generators,
 * the start template (the glade) and the area's saved tile changes.
 *
 * Units live in a world registry, not on maps. Units in the area on screen
 * are drawn as ordinary events (event ID = 1000 + unit ID); units anywhere
 * else keep moving in a simplified simulation. Units and the view (the
 * player/cursor) cross area edges.
 *
 * API, events, save data and checks: docs/systems/UF_World.md
 *
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const P = PluginManager.parameters("UF_World");
    const num = (key, fallback) => (P[key] !== undefined && P[key] !== "" ? Number(P[key]) : fallback);
    const CONFIG = Object.freeze({
        areasX: num("AreasX", 6),
        areasY: num("AreasY", 6),
        size: Math.min(256, num("AreaSize", 256)),
        mapIdBase: num("MapIdBase", 1000),
        tilesetId: num("TilesetId", 2),
        groundTileId: num("GroundTileId", 2863),
        templateMapId: num("StartTemplateMapId", 2),
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
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
    const areaKey = (ax, ay) => `${ax},${ay}`;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    // Facing for 8-way movement with 4 facings (GUIDE_25D §3.5): NE→E, SE→S, SW→W, NW→N.
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
        _frame: 0
    };
    window.UF = window.UF || {};
    window.UF.World = World;

    //-------------------------------------------------------------------------
    // World creation

    World.newWorld = function(seed) {
        const s = seed || CONFIG.seed || Math.floor(Math.random() * 0x7ffffffe) + 1;
        this.state = {
            version: 1,
            seed: s,
            areasX: CONFIG.areasX,
            areasY: CONFIG.areasY,
            size: CONFIG.size,
            startArea: { x: Math.floor(CONFIG.areasX / 2), y: Math.floor(CONFIG.areasY / 2) },
            units: {},
            nextUnitId: 1,
            diffs: {}
        };
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

    World.rngFor = function(ax, ay, salt = 0) {
        const s = typeof salt === "string" ? hashString(salt) : salt;
        return mulberry32(hash32(this.state.seed, ax, ay, s));
    };

    /**
     * Register an area generator. fn(ctx) runs for every area build, in order (low first).
     * ctx: { areaX, areaY, width, height, seed, rng, isStart, templateRect,
     *        setTile(x, y, layer, tileId), getTile(x, y, layer), index(x, y, layer),
     *        addEvent({ name, x, y, image, note, priorityType, through, directionFix, walkAnime }) -> event id }
     * Generators must be deterministic: use ctx.rng / UF.World.rngFor only, never Math.random.
     */
    World.registerGenerator = function(name, fn, order = 100) {
        const i = generators.findIndex(g => g.name === name);
        if (i >= 0) generators.splice(i, 1);
        generators.push({ name, fn, order });
        generators.sort((a, b) => a.order - b.order);
    };
    World.generators = () => generators.map(g => g.name);

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
        let nextEventId = tpl ? tpl.events.length : 1; // keep template event IDs unchanged (UF_ColonyOverseer relies on them)

        const map = {
            autoplayBgm: false, autoplayBgs: false, battleback1Name: "", battleback2Name: "",
            bgm: { name: "", pan: 0, pitch: 100, volume: 90 }, bgs: { name: "", pan: 0, pitch: 100, volume: 90 },
            disableDashing: false, displayName: "", encounterList: [], encounterStep: 30,
            width: size, height: size, note: "",
            parallaxLoopX: false, parallaxLoopY: false, parallaxName: "", parallaxShow: false, parallaxSx: 0, parallaxSy: 0,
            scrollType: 0, specifyBattleback: false, tilesetId: CONFIG.tilesetId,
            data, events, ufArea: { x: ax, y: ay }
        };

        const ctx = {
            areaX: ax, areaY: ay, width: size, height: size, seed: st.seed,
            rng: this.rngFor(ax, ay, 0), isStart: !!tpl, templateRect, index,
            setTile(x, y, layer, tileId) {
                if (x >= 0 && y >= 0 && x < size && y < size && layer >= 0 && layer < 6) data[index(x, y, layer)] = tileId;
            },
            getTile: (x, y, layer) => data[index(x, y, layer)],
            addEvent(spec) {
                if (nextEventId >= EVENT_BASE) throw new Error(`UF_World: area (${ax},${ay}) has too many generated events (limit ${EVENT_BASE - 1})`);
                const id = nextEventId++;
                events[id] = makeEventData(id, spec);
                return id;
            }
        };
        for (const g of generators) g.fn(ctx);

        if (tpl) {
            for (let layer = 0; layer < 6; layer++) {
                for (let y = 0; y < tpl.height; y++) {
                    for (let x = 0; x < tpl.width; x++) {
                        data[index(x + off.x, y + off.y, layer)] = tpl.data[(layer * tpl.height + y) * tpl.width + x];
                    }
                }
            }
            for (let i = 1; i < events.length; i++) {
                const e = events[i];
                if (e && e.x >= off.x && e.x < off.x + tpl.width && e.y >= off.y && e.y < off.y + tpl.height) events[i] = null;
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
        emit("world:tileChanged", { x: ax, y: ay }, x, y, layer, tileId);
        return true;
    };

    /** Read a tile. For areas not on screen this builds the area, which is slow; don't call it every frame. */
    World.getTile = function(ax, ay, x, y, layer) {
        const size = this.state.size;
        const i = (layer * size + y) * size + x;
        if (sameArea({ x: ax, y: ay }, this.currentArea()) && $dataMap && $dataMap.data) return $dataMap.data[i];
        const diff = this.state.diffs[areaKey(ax, ay)];
        if (diff && diff[i] !== undefined) return diff[i];
        return this.buildArea(ax, ay).data[i];
    };

    //-------------------------------------------------------------------------
    // Units

    function unitEventData(u) {
        return makeEventData(EVENT_BASE + u.id, {
            name: u.name, note: `<ufUnit:${u.id}>`, x: u.x, y: u.y, dir: u.dir, image: { characterName: u.image.characterName, characterIndex: u.image.characterIndex, direction: u.dir }
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
    /** Send a unit toward { area: { x, y }, x, y }. It walks there, across areas, on or off screen. */
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
        return { dx: Math.sign(gx - cx), dy: Math.sign(gy - cy), dist: Math.max(Math.abs(gx - cx), Math.abs(gy - cy)) };
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

    // Off screen: one cell per UnitStepFrames, straight toward the goal. Terrain isn't checked yet (see system doc).
    function stepOffscreen(u) {
        const g = goalDelta(u);
        if (g.dist === 0) return arrive(u);
        const w = wrapStep(u, g.dx, g.dy);
        if (!World.inWorld(w.ax, w.ay)) return arrive(u);
        u.dir = facing(g.dx, g.dy);
        if (w.crossed) moveUnitToArea(u, w.ax, w.ay, w.x, w.y);
        else {
            u.x = w.x;
            u.y = w.y;
        }
        if (u.goal && goalDelta(u).dist === 0) arrive(u);
    }

    // On screen: the unit's event walks with RMMZ movement and pathfinding; at an edge it steps into the next area.
    function stepOnscreen(u, ev) {
        if (ev.isMoving()) return;
        const g = goalDelta(u);
        if (g.dist === 0) return arrive(u);
        const w = wrapStep(u, g.dx, g.dy);
        if (w.crossed) {
            if (!World.inWorld(w.ax, w.ay)) return arrive(u);
            u.dir = facing(g.dx, g.dy);
            moveUnitToArea(u, w.ax, w.ay, w.x, w.y);
            return;
        }
        const size = World.state.size;
        let tx = u.goal.x, ty = u.goal.y;
        if (!sameArea(u.goal.area, u.area)) {
            tx = clamp((u.goal.area.x - u.area.x) * size + u.goal.x, 0, size - 1);
            ty = clamp((u.goal.area.y - u.area.y) * size + u.goal.y, 0, size - 1);
        }
        const h = g.dx > 0 ? 6 : 4, v = g.dy > 0 ? 2 : 8;
        if (g.dx !== 0 && g.dy !== 0 && tx !== ev.x && ty !== ev.y && ev.canPassDiagonally(ev.x, ev.y, h, v)) {
            ev.moveDiagonally(h, v);
        } else {
            const d = ev.findDirectionTo(tx, ty);
            if (d > 0) ev.moveStraight(d);
        }
        if (ev.isMovementSucceeded()) {
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

            t.check("area_size", size === 256 && $dataMap.width === 256 && $dataMap.height === 256 && $dataMap.data.length === 256 * 256 * 6,
                `${$dataMap.width}x${$dataMap.height}, data length ${$dataMap.data.length}`);

            const tpl = W.template();
            if (tpl) {
                const expected = tpl.events.filter(e => e && !(e.meta && e.meta.ufUnit));
                const missing = expected.filter(e => !$gameMap.event(e.id) || $gameMap.event(e.id).event().name !== e.name);
                const off = W.templateOffset();
                t.check("template_stamped", missing.length === 0,
                    missing.length ? `missing: ${missing.map(e => e.name).join(", ")}` : `${expected.length} glade events, glade at (${off.x},${off.y})`);
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

            const json = JsonEx.stringify(st);
            t.check("save_roundtrip", JSON.stringify(JsonEx.parse(json)) === JSON.stringify(st), `${json.length} bytes, ${W.units().length} units`);

            // A unit walking in the west area crosses into the area on screen.
            const west = { x: area.x - 1, y: area.y };
            const row = 128;
            $gamePlayer.locate(8, row);
            const u = W.addUnit({ name: "TEST_walker", image: { characterName: "People1", characterIndex: 0 }, area: west, x: size - 4, y: row, dir: 6 });
            t.check("unit_starts_offscreen", !W.eventOf(u.id), `unit ${u.id} in area (${u.area.x},${u.area.y}) at (${u.x},${u.y})`);
            W.sendUnit(u.id, { area, x: 3, y: row });
            await t.waitUntil(() => !!W.eventOf(u.id), 8000, "TEST_walker to cross into the area on screen").catch(() => {});
            const ev = W.eventOf(u.id);
            const sprite = ev && SceneManager._scene._spriteset._characterSprites.find(s => s._character === ev);
            t.check("unit_enters_view", !!ev && !!sprite,
                ev ? `event ${ev.eventId()} at (${ev.x},${ev.y}), sprite ${sprite ? "created" : "MISSING"}` : `still in area (${u.area.x},${u.area.y}) at (${u.x},${u.y})`);
            await t.waitUntil(() => !u.goal, 8000, "TEST_walker to reach its goal").catch(() => {});
            t.check("unit_walks_to_goal", !u.goal && sameArea(u.area, area) && u.x === 3 && u.y === row,
                `at (${u.x},${u.y}) in area (${u.area.x},${u.area.y}), goal ${u.goal ? "still set" : "reached"}`);
            await t.waitFrames(10);
            t.screenshot("unit_in_view");

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
            t.check("diff_persists", $dataMap.data[idx] === changed, `tile (${tx},${ty}) is ${$dataMap.data[idx]} after leaving and returning, expected ${changed}`);

            W.setTile(area.x, area.y, tx, ty, 0, before);
            W.removeUnit(u.id);
            await t.waitFrames(60);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during world checks");
        });
    }
})();
