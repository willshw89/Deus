//=============================================================================
// UF_Jobs.js - Jobs: the only way a unit changes the world (walk there, work, then apply)
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Jobs] Jobs for units: walk to a stand cell, work for a while (tools speed it up), then change the world: chop, gather, haul, fetch, build, craft, equip, hunt, drink, eat, sleep, talk, move.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_World
 * @orderAfter UF_Objects
 * @orderAfter UF_Items
 *
 * @help
 * A job is { id, type, target: { area, x, y }, params, owner, assigned,
 * progress, state, reason }. Every job type is a handler registered with
 * UF.Jobs.define(type, { verb, plan, work, apply, cancel }). Open jobs
 * (owner null, nobody assigned) are designations: anyone may take them
 * (UF.Jobs.take). Jobs live in UF.World.state.jobs and are saved with it.
 *
 * Each map update, for every assigned job:
 * - plan() picks the stand cell (the target cell when it's passable and
 *   free, else the nearest passable 4-neighbor) or fails the job with a
 *   reason ("needs items", "needs a fire", "can't reach it", ...);
 * - if the unit isn't on the stand cell it is sent there (UF.World.sendUnit);
 * - on arrival the unit faces the target, its event steps in place, it
 *   shows the job in the profile (no over-head verb, VISION V92), and progress grows
 *   by workRate x tool multiplier per tick until it reaches the job's work;
 * - then apply() changes the world (UF.Objects.apply, UF.Items, ...) and the
 *   job is done (jobs:done). A handler's apply may return "continue" to go
 *   on to its next phase (haul: pick up, then carry to the cell).
 * A job fails after the unit has been blocked twice (world:unitBlocked, or
 * no progress toward the stand cell for 300 ticks). A job whose unit left
 * the world goes back to open.
 *
 * Built-in types (WORLD_ARCHITECTURE section 5.5): move, wander, gather,
 * chop, pick, quarry, mine, haul, fetch, build, craft, equip, hunt, drink,
 * eat, sleep, talk. Nothing here is random.
 *
 * Levels (VISION V80): job.target and job.stand carry z (-2..+2; missing =
 * the ground; a target given without an area takes the level on screen). A
 * unit takes open jobs on its own level only until units can walk between
 * levels (vertical slice 2).
 *
 * API, state, events and checks: docs/systems/UF_Jobs.md
 *
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const REPLAN_TICKS = 30;     // hunt / talk: the target moves, so the stand cell is re-planned this often
    const HUNT_MAX_DIST = 40;    // cells (Chebyshev) the prey may be from the hunter before the hunt fails
    const CRAFT_SEARCH = 40;     // cells: how far a crafter looks for a workplace object (recipe "at")
    const BLOCKS_TO_FAIL = 2;    // blocks (unitBlocked, or a stall) before a job fails
    const STALL_TICKS = 300;     // ticks without a cell change while travelling that count as one block
    const FINISHED_KEPT = 40;    // done/failed jobs kept in the list for readers (cards, tests); older ones are pruned
    const NEED_WORK = 60;        // ticks (one game minute) to drink or eat
    const TALK_WORK = 180;
    const SLEEP_WORK = 600;      // default when params.frames is missing
    const NEIGHBORS = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // 4-way (contract section 1.6)
    const DIAGONALS = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    // 8-way (VISION V3, UF_Movement8D's FourWay off): a unit may also work from a diagonal neighbour of its target.
    const eightWay = () => !!window.UF_Dir8 && UF_Dir8.fourWay === false;

    const catalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
    const copyArea = a => ({ x: a.x, y: a.y });
    // Levels (VISION V80). A record ({ area, x, y, z }: a target, a stand, a unit, an item) carries z beside its area; an
    // area handle may carry it inside ({ x, y, z }). Missing = the ground.
    const zOf = o => o && o.z !== undefined ? o.z : (o && o.area && o.area.z !== undefined ? o.area.z : 0);
    const refZ = zOf;
    const lv = r => ({ x: r.area.x, y: r.area.y, z: refZ(r) });       // the level area of a record
    const sameLevel = (a, b) => !!a && !!b && sameArea(a.area, b.area) && refZ(a) === refZ(b);
    const validLevel = ref => {
        const z = zOf(ref), W = World();
        return Number.isInteger(z) && z >= -2 && z <= 2 && (z === 0 || !!(W && typeof W.isLevel === "function" && W.isLevel(z)));
    };
    // Is this area's level the one on screen?
    const onScreen = area => {
        const W = World();
        const v = W && W.viewLevel ? W.viewLevel() : (W ? W.currentArea() : null);
        return !!v && !!area && v.x === area.x && v.y === area.y && zOf(v) === zOf(area);
    };
    const chebyshev = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
    const manhattan = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);

    // Ticks = map updates (the same count UF.Time keeps), so speed-up and pause carry over.
    let localTicks = 0;
    const now = () => (window.UF && UF.Time && UF.Time.ticks ? UF.Time.ticks() : localTicks);

    //-------------------------------------------------------------------------
    // State: UF.World.state.jobs = { nextId, list: [job] }

    function jobState() {
        const W = World();
        if (!W || !W.state) return null;
        if (!W.state.jobs) W.state.jobs = { nextId: 1, list: [] };
        return W.state.jobs;
    }
    const isActive = job => job.state === "travel" || job.state === "work";
    const isFinished = job => job.state === "done" || job.state === "failed";

    //-------------------------------------------------------------------------
    // Ludeon Reservation Manager
    // Centralized concurrency control for targets, items, and spatial cells
    //-------------------------------------------------------------------------

    class ReservationManager {
        constructor() {
            this._reservations = new Map();
        }

        _key(targetRef) {
            if (!targetRef) return null;
            if (typeof targetRef === "string" || typeof targetRef === "number") return String(targetRef);
            if (targetRef.id !== undefined && typeof targetRef.id !== "object") return `entity:${targetRef.id}`;
            const ax = (targetRef.area && targetRef.area.x) || 0;
            const ay = (targetRef.area && targetRef.area.y) || 0;
            const z = (typeof targetRef.z === "number" ? targetRef.z : (targetRef.area && targetRef.area.z) || 0);
            return `cell:${ax},${ay},${z}:${targetRef.x | 0},${targetRef.y | 0}`;
        }

        reserve(unitId, targetRef, stack = 1) {
            const key = this._key(targetRef);
            if (!key) return false;
            const existing = this._reservations.get(key);
            if (existing && existing.unitId !== unitId) {
                return false;
            }
            this._reservations.set(key, { unitId, stack, tick: now() });
            return true;
        }

        release(unitId, targetRef) {
            const key = this._key(targetRef);
            if (!key) return;
            const existing = this._reservations.get(key);
            if (existing && existing.unitId === unitId) {
                this._reservations.delete(key);
            }
        }

        isReservedByOther(unitId, targetRef) {
            const key = this._key(targetRef);
            if (!key) return false;
            const existing = this._reservations.get(key);
            return !!(existing && existing.unitId !== unitId);
        }

        reservedBy(targetRef) {
            const key = this._key(targetRef);
            if (!key) return null;
            const existing = this._reservations.get(key);
            return existing ? existing.unitId : null;
        }

        clearUnit(unitId) {
            for (const [k, v] of this._reservations.entries()) {
                if (v.unitId === unitId) {
                    this._reservations.delete(k);
                }
            }
        }

        clear() {
            this._reservations.clear();
        }
    }

    const reservationManager = new ReservationManager();

    //-------------------------------------------------------------------------
    // Cells: what a unit can stand on, in the area on screen or any other

    // area may be a level area { x, y, z } (missing z = the ground).
    function isWaterIn(area, x, y) {
        const W = World();
        if (!area || !validLevel(area) || !W || !W.state || !W.inWorld(area.x, area.y, zOf(area))) return false;
        const z = zOf(area);
        if (z < 0) {
            if (window.UF && UF.Levels && typeof UF.Levels.isFlooded === "function") {
                const fl = UF.Levels.isFlooded({ area: { x: area.x, y: area.y }, x, y, z });
                if (fl && fl.flooded && fl.type === "water") return true;
            }
            if (window.UF && UF.Levels && typeof UF.Levels.naturalWaterAt === "function") {
                return UF.Levels.naturalWaterAt({ area: { x: area.x, y: area.y }, x, y, z });
            }
            return false;
        }
        if (W && onScreen(area) && window.$gameMap && $dataMap) {
            return Tilemap.isWaterTile($gameMap.tileId(x, y, 0));
        }
        if (typeof W.getTile === "function") return Tilemap.isWaterTile(W.getTile(area.x, area.y, x, y, 0, zOf(area)) | 0);
        const G = window.UF && UF.WorldGen;
        if (G && G.cellInfoLocal) {
            const c = G.cellInfoLocal(area.x, area.y, x, y);
            return !!(c && c.water);
        }
        return false;
    }

    // Another unit (or a solid non-unit event on screen) already stands there, or an active job reserved it as its stand cell.
    function occupiedIn(area, x, y, unitId) {
        const W = World();
        for (const u of W.unitsInArea(area.x, area.y, zOf(area))) if (u.id !== unitId && u.x === x && u.y === y) return true;
        const st = jobState();
        if (st && st.list) {
            for (const j of st.list) {
                if (j.assigned !== null && j.assigned !== undefined && j.assigned !== unitId && isActive(j) && j.stand) {
                    if (sameLevel(j.stand, { area, z: zOf(area) }) && j.stand.x === x && j.stand.y === y) {
                        return true;
                    }
                }
            }
        }
        if (onScreen(area) && window.$gameMap) {
            for (const ev of $gameMap.eventsXy(x, y)) {
                if (ev.eventId() >= W.EVENT_BASE) continue; // units were checked above
                if (ev.isNormalPriority() && !ev.isThrough()) return true;
            }
        }
        return false;
    }

    /** True when a unit could stand on the cell: inside the area, walkable ground, no blocking object, no water, nobody there. */
    function standableIn(area, x, y, unitId) {
        const W = World();
        if (!area || !validLevel(area) || !W || !W.state || !W.inWorld(area.x, area.y, zOf(area))) return false;
        const size = W.state.size;
        if (x < 0 || y < 0 || x >= size || y >= size) return false;
        if (onScreen(area) && window.$gameMap && $dataMap) {
            // Game_Map.isPassable includes UF_Objects' object blocking; a cell blocked in every direction can't be stood on.
            if (![2, 4, 6, 8].some(d => $gameMap.isPassable(x, y, d))) return false;
            if (Tilemap.isWaterTile($gameMap.tileId(x, y, 0))) return false;
        } else if (typeof W.walkable === "function") {
            // Every off-screen floor uses saved tiles/shapes and objects, including ground tile changes.
            if (!W.walkable(area.x, area.y, x, y, { z: zOf(area) })) return false;
        } else {
            const O = Objects();
            if (O && O.blocksIn(area, x, y)) return false;
            const G = window.UF && UF.WorldGen;
            if (G && G.cellInfoLocal) {
                const c = G.cellInfoLocal(area.x, area.y, x, y);
                if (c && !c.walkable) return false;
            }
        }
        return !occupiedIn(area, x, y, unitId);
    }

    // Distance from a unit to a cell of an area, in cells, across areas.
    function unitDistance(unit, area, x, y) {
        const size = World().state.size;
        return manhattan(unit.area.x * size + unit.x, unit.area.y * size + unit.y, area.x * size + x, area.y * size + y);
    }

    // Walking distance in 8-way: diagonal steps count (octile, in cells).
    function octileDistance(unit, area, x, y) {
        const size = World().state.size;
        const ax = Math.abs(unit.area.x * size + unit.x - (area.x * size + x)), ay = Math.abs(unit.area.y * size + unit.y - (area.y * size + y));
        return Math.max(ax, ay) + 0.4 * Math.min(ax, ay);
    }

    /**
     * The stand cell for a target: the target cell itself when it's standable (unless adjacentOnly), else the
     * standable 4-neighbor nearest to the unit; in 8-way also the diagonal neighbours whose two cells between them and
     * the target are walkable (never reaching across a blocked corner), nearest by walking distance. Null when there is
     * none (the target is walled in).
     */
    function standFor(target, unit, adjacentOnly) {
        if (!target || !unit || !target.area || !validLevel(target) || !validLevel(unit) || !sameLevel(target, unit)) return null;
        const area = lv(target), z = refZ(target);
        if (!adjacentOnly && target.x === unit.x && target.y === unit.y) return { area: copyArea(area), x: target.x, y: target.y, z };
        if (!adjacentOnly && standableIn(area, target.x, target.y, unit.id)) return { area: copyArea(area), x: target.x, y: target.y, z };
        const W = World(), eight = eightWay();
        let best = null, bestDist = Infinity;
        for (const [dx, dy] of eight ? NEIGHBORS.concat(DIAGONALS) : NEIGHBORS) {
            const x = target.x + dx, y = target.y + dy;
            if (!standableIn(area, x, y, unit.id)) continue;
            if (dx && dy && !(W.walkable(area.x, area.y, x, target.y, { unit, z }) && W.walkable(area.x, area.y, target.x, y, { unit, z }))) continue;
            const dist = eight ? octileDistance(unit, area, x, y) : unitDistance(unit, area, x, y);
            if (dist < bestDist) {
                bestDist = dist;
                best = { area: copyArea(area), x, y, z };
            }
        }
        return best;
    }
    const atCell = (unit, cell) => sameLevel(unit, cell) && unit.x === cell.x && unit.y === cell.y;

    //-------------------------------------------------------------------------
    // Words for cards and labels (no DF/U7 terms: names come from the catalog)

    const lower = s => String(s || "").toLowerCase();
    const withArticle = name => {
        const n = lower(name);
        if (!n) return "";
        if (/s$/.test(n)) return n; // "loose stones", "reeds", "berries": no article
        return (/^[aeiou]/.test(n) ? "an " : "a ") + n;
    };
    // "Weave a fiber wrap" -> "Weaving a fiber wrap"; "Knap" -> "Knapping"; "Roast" -> "Roasting".
    const gerund = phrase => {
        const words = String(phrase || "").split(" ");
        let v = words[0] || "";
        if (/e$/i.test(v) && !/ee$/i.test(v)) v = v.slice(0, -1) + "ing";
        else if (/[^aeiou][aeiou][^aeiouwxy]$/i.test(v)) v = v + v.slice(-1) + "ing";
        else v = v + "ing";
        words[0] = v;
        return words.join(" ");
    };
    const objectName = job => {
        const O = Objects();
        const t = O && job.target ? O.atIn(lv(job.target), job.target.x, job.target.y) : null;
        return t ? t.name : (job.params && job.params.objectName) || "";
    };
    const itemName = id => {
        const I = Items();
        const t = I && id ? I.type(id) : null;
        return t ? t.name : String(id || "");
    };
    const itemTypeOf = itemId => {
        const I = Items();
        const it = I ? I.get(itemId) : null;
        return it ? it.type : null;
    };

    //-------------------------------------------------------------------------
    // Handlers

    const handlers = {};

    /** Register a job type: { verb, plan(job, unit) -> { ok, stand, reason? }, work: n | fn, apply(job, unit), cancel?(job, unit), describe?(job), replanEvery? } */
    function define(type, handler) {
        if (!type || !handler || typeof handler.plan !== "function" || typeof handler.apply !== "function") throw new Error(`UF_Jobs.define("${type}"): plan and apply are required`);
        handlers[type] = Object.assign({ verb: type, work: 0 }, handler);
        return handlers[type];
    }

    const noNeeds = unit => !unit.data || !unit.data.needs;
    const lowerNeed = (unit, key, by) => {
        if (noNeeds(unit) || typeof unit.data.needs[key] !== "number") return;
        unit.data.needs[key] = Math.max(0, unit.data.needs[key] - by);
    };

    // Object actions (chop, gather, pick, quarry, mine): the object on the target cell must have that action,
    // or (for mine/quarry) the cell is a natural subterranean solid wall.
    const objectAction = (type, verb) => define(type, {
        verb,
        plan(job, unit) {
            const O = Objects(), L = window.UF && UF.Levels;
            const t = O ? O.atIn(lv(job.target), job.target.x, job.target.y) : null;
            if (t && t.actions && t.actions[type]) {
                job.params.objectName = t.name; // kept for the label after the object is gone
                const stand = standFor(job.target, unit, false);
                return stand ? { ok: true, stand } : { ok: false, reason: "can't reach it" };
            }
            if ((type === "mine" || type === "quarry") && L && typeof L.shapeAt === "function") {
                const s = L.shapeAt(job.target);
                if (s === "solid") {
                    const c = L.cellAt ? L.cellAt(job.target) : null;
                    job.params.objectName = c && c.material === "soil" ? "Natural soil wall" : "Natural rock wall";
                    const stand = standFor(job.target, unit, true);
                    return stand ? { ok: true, stand } : { ok: false, reason: "can't reach it" };
                }
            }
            return { ok: false, reason: `nothing to ${type} there` };
        },
        work(job, unit) {
            const O = Objects(), L = window.UF && UF.Levels, I = Items();
            const t = O ? O.atIn(lv(job.target), job.target.x, job.target.y) : null;
            let baseWork = 0;
            if (t && t.actions && t.actions[type]) {
                baseWork = t.actions[type].work | 0;
            } else if ((type === "mine" || type === "quarry") && L && typeof L.shapeAt === "function" && L.shapeAt(job.target) === "solid") {
                baseWork = 180;
            }
            if (baseWork <= 0) return 0;

            // Systemic Material Dynamics:
            // 1. Chopping wood: scale work by wood hardness & workability
            if (type === "chop" && t) {
                const matRef = O && typeof O.materialOf === "function" ? O.materialOf(t.id, job.target.area, job.target.x, job.target.y) : null;
                const matDef = (matRef && I && typeof I.materialOf === "function") ? I.materialOf(matRef) : null;
                if (matDef && matDef.workability) {
                    // Oak is baseline (workability: 50, factor 1.0)
                    const factor = Math.max(0.35, Math.min(2.0, (120 - matDef.workability) / 70));
                    baseWork = Math.round(baseWork * factor);
                }
            } else if (type === "quarry" || type === "mine") {
                let stoneMat = null;
                if (t && O && typeof O.materialOf === "function") {
                    stoneMat = O.materialOf(t.id, job.target.area, job.target.x, job.target.y);
                }
                if (!stoneMat) {
                    const W = World(), st = W && W.state;
                    const size = st ? st.size : 256;
                    const gx = job.target.area.x * size + job.target.x, gy = job.target.area.y * size + job.target.y;
                    const G = window.UF && UF.WorldGen;
                    const geo = G && typeof G.geologyAt === "function" ? G.geologyAt(gx, gy, zOf(job.target)) : null;
                    stoneMat = geo ? `stones:${geo.stone}` : "stones:limestone";
                }
                const matDef = (stoneMat && I && typeof I.materialOf === "function") ? I.materialOf(stoneMat) : null;
                if (matDef) {
                    // Limestone is baseline (fractureResistance: 45, factor 1.0)
                    const fracture = matDef.fractureResistance || 45;
                    const factor = Math.max(0.5, Math.min(3.0, fracture / 45));
                    baseWork = Math.round(baseWork * factor);
                }
            }

            return Math.max(10, baseWork);
        },
        apply(job, unit) {
            const O = Objects(), L = window.UF && UF.Levels, I = Items();
            const t = O ? O.atIn(lv(job.target), job.target.x, job.target.y) : null;
            if (t && t.actions && t.actions[type]) {
                const r = O.applyIn(lv(job.target), job.target.x, job.target.y, type, unit);
                job.result = r ? { from: r.from, to: r.to, yields: r.yields } : null;
                return;
            }
            if ((type === "mine" || type === "quarry") && L && typeof L.setShape === "function" && L.shapeAt(job.target) === "solid") {
                const c = L.cellAt ? L.cellAt(job.target) : null;
                const mat = c && c.material === "soil" ? "soil" : "stone";
                L.setShape(job.target, "floor", { material: mat });
                const yields = mat === "soil" ? { stone: 1 } : { stone: 2 };
                if (I && typeof I.drop === "function") {
                    const W = World(), st = W && W.state;
                    const size = st ? st.size : 256;
                    const gx = job.target.area.x * size + job.target.x, gy = job.target.area.y * size + job.target.y;
                    const G = window.UF && UF.WorldGen;
                    const geo = G && typeof G.geologyAt === "function" ? G.geologyAt(gx, gy, zOf(job.target)) : null;
                    const stoneMat = geo ? geo.stone : "limestone";
                    const S = window.UF && UF.Skills;
                    let q = (S && typeof S.qualityRoll === "function" && unit) ? S.qualityRoll(unit, "mining") : 0;
                    const matDef = (stoneMat && I && typeof I.materialOf === "function") ? I.materialOf(`stones:${stoneMat}`) : null;
                    if (matDef && ((matDef.tags && matDef.tags.includes("hard_stone")) || (matDef.fractureResistance && matDef.fractureResistance >= 75))) {
                        const eq = unit && unit.data && unit.data.equipment;
                        const toolItem = (I && eq && eq.tool) ? I.get(eq.tool) : null;
                        const toolType = toolItem ? I.type(toolItem.type) : null;
                        const isMetalPick = toolType && (toolType.id.includes("iron") || toolType.id.includes("steel") || toolType.id.includes("bronze") || (toolItem.mat && ["iron", "steel", "bronze"].includes(toolItem.mat)));
                        if (!isMetalPick) q = 0;
                    }
                    for (const id of Object.keys(yields)) {
                        I.drop(lv(job.target), job.target.x, job.target.y, id, yields[id], unit.id, { mat: stoneMat, q: q > 0 ? q : undefined });
                    }
                }
                job.result = { from: "solid", to: "floor", yields };
                emit("levels:mined", job.target, mat);
            }
        },
        describe: job => `${verb} ${withArticle(objectName(job))}`.trim()
    });
    objectAction("chop", "Chopping");
    objectAction("gather", "Gathering");
    objectAction("pick", "Picking up");
    objectAction("quarry", "Quarrying");
    objectAction("mine", "Mining");

    const moveHandler = verb => ({
        verb,
        plan(job, unit) {
            const stand = standFor(job.target, unit, false);
            return stand ? { ok: true, stand } : { ok: false, reason: "can't reach it" };
        },
        work(job, unit) {
            if (job && job.params) {
                if (job.params.contemplate) return 90;
                if (job.params.inspect) return 60;
                if (job.params.fireGather) return 120;
            }
            return 0;
        },
        apply() {},
        describe(job) {
            if (job && job.params) {
                if (job.params.explore) return "Surveying the frontier";
                if (job.params.stroll) return "Strolling";
                if (job.params.fireGather) return "Warming by the hearth";
                if (job.params.inspect) return "Inspecting the homestead";
                if (job.params.contemplate) return "Contemplating";
            }
            return verb;
        }
    });
    define("move", moveHandler("Walking"));
    define("wander", moveHandler("Wandering"));

    // Carrying: phase 0 = stand on the item's cell (or container) and pick it up; phase 1 (haul only) = carry it to `to` and put it down.
    function pickPhasePlan(job, unit) {
        const I = Items(), C = window.UF && UF.Containers;
        const it = I ? I.get(job.params.itemId) : null;
        if (!it) return { ok: false, reason: "the item is gone" };
        if (it.holder === unit.id) return { ok: true, stand: null }; // already carried (a resumed job)
        if (!it.area && !it.container) return { ok: false, reason: "someone else carries it" };
        let targetX = it.x, targetY = it.y, targetZ = zOf(it), targetArea = it.area;
        if (it.container && C) {
            const cont = C.get(it.container);
            if (cont) {
                targetX = cont.x; targetY = cont.y; targetZ = zOf(cont); targetArea = cont.area;
            }
        }
        job.target = { area: copyArea(targetArea), x: targetX, y: targetY, z: targetZ };
        const stand = standFor(job.target, unit, false);
        return stand ? { ok: true, stand } : { ok: false, reason: "can't reach it" };
    }
    function pickUpNow(job, unit) {
        const I = Items(), C = window.UF && UF.Containers;
        const it = I ? I.get(job.params.itemId) : null;
        if (!it) return false;
        if (it.holder === unit.id) return true;
        if (it.container && C) {
            const taken = C.takeItem(it.container, it.id, unit.id);
            return !!taken;
        }
        return I.pickUp(it.id, unit.id);
    }
    define("fetch", {
        verb: "Fetching",
        plan: pickPhasePlan,
        work: 0,
        apply(job, unit) {
            if (!pickUpNow(job, unit)) throw new Error("the item is gone");
        },
        describe: job => `Fetching ${withArticle(itemName(itemTypeOf(job.params.itemId) || job.params.itemType))}`
    });
    define("haul", {
        verb: "Hauling",
        plan(job, unit) {
            if ((job.phase | 0) === 0) return pickPhasePlan(job, unit);
            const I = Items();
            const it = I ? I.get(job.params.itemId) : null;
            if (!it || it.holder !== unit.id) return { ok: false, reason: "the item is gone" };
            const to = job.params.to;
            if (!to || !to.area) return { ok: false, reason: "nowhere to take it" };
            job.target = { area: copyArea(to.area), x: to.x | 0, y: to.y | 0, z: refZ(to) };
            const stand = standFor(job.target, unit, false);
            return stand ? { ok: true, stand } : { ok: false, reason: "can't reach the place" };
        },
        work: 0,
        apply(job, unit) {
            if ((job.phase | 0) === 0) {
                if (!pickUpNow(job, unit)) throw new Error("the item is gone");
                return "continue";
            }
            const I = Items(), C = window.UF && UF.Containers, to = job.params.to;
            if (job.params.toContainer && C) {
                const stored = C.putItem(job.params.toContainer, job.params.itemId);
                job.result = stored ? { itemId: job.params.itemId, containerId: job.params.toContainer } : null;
            } else {
                const placed = I.putDown(job.params.itemId, lv(to), to.x | 0, to.y | 0);
                job.result = placed ? { itemId: placed.id } : null;
            }
        },
        cancel(job, unit) {
            // What was picked up and not delivered is put down where the carrier stands, so nothing vanishes.
            const I = Items();
            const it = I ? I.get(job.params.itemId) : null;
            if (it && it.holder === unit.id && (job.phase | 0) > 0) I.putDown(it.id, lv(unit), unit.x, unit.y);
        },
        describe: job => `Hauling ${withArticle(itemName(itemTypeOf(job.params.itemId) || job.params.itemType))}`
    });

    define("build", {
        verb: "Building",
        plan(job, unit) {
            const O = Objects(), I = Items();
            const t = O ? O.type(job.params.objectId) : null;
            if (!t || !t.build) return { ok: false, reason: "nothing to build" };
            const needs = t.build.items || {};
            const countFor = (cell, id) => {
                let cnt = I ? I.count(cell, id) : 0;
                if (id === "wood") {
                    cnt += I ? I.count(cell, "log") : 0;
                } else if (id === "straw") {
                    cnt += I ? I.count(cell, "fiber") : 0;
                } else if (id === "stone") {
                    cnt += I ? I.count(cell, "rocks_small") : 0;
                }
                return cnt;
            };
            const missing = Object.keys(needs).filter(id => countFor({ area: lv(job.target), x: job.target.x, y: job.target.y }, id) < (needs[id] | 0));
            if (missing.length) return { ok: false, reason: "needs items" };
            const stand = standFor(job.target, unit, t.passable !== true); // a wall is built from beside its cell
            return stand ? { ok: true, stand } : { ok: false, reason: "can't reach it" };
        },
        work(job) {
            const O = Objects();
            const t = O ? O.type(job.params.objectId) : null;
            return t && t.build ? t.build.work | 0 : 0;
        },
        apply(job) {
            const O = Objects(), I = Items();
            const t = O.type(job.params.objectId);
            const needs = (t.build && t.build.items) || {};
            for (const id of Object.keys(needs)) {
                let left = needs[id] | 0;
                for (const it of I.atIn(lv(job.target), job.target.x, job.target.y)) {
                    if (left <= 0) break;
                    const matches = it.type === id ||
                        (id === "wood" && (it.type === "wood" || it.type === "log")) ||
                        (id === "straw" && (it.type === "straw" || it.type === "fiber")) ||
                        (id === "stone" && (it.type === "stone" || it.type === "rocks_small"));
                    if (!matches) continue;
                    left -= I.consume(it.id, left);
                }
            }
            O.setIn(lv(job.target), job.target.x, job.target.y, t.id);
        },
        describe(job) {
            const O = Objects();
            const t = O ? O.type(job.params.objectId) : null;
            return `Building ${withArticle(t ? t.name : job.params.objectId)}`;
        }
    });

    const recipeOf = id => {
        const c = catalog();
        const list = (c && c.recipes && c.recipes.list) || [];
        return list.find(r => r.id === id) || null;
    };
    define("craft", {
        verb: "Making",
        plan(job, unit) {
            const I = Items(), O = Objects();
            const r = recipeOf(job.params.recipeId);
            if (!r) return { ok: false, reason: "no such recipe" };
            const inputs = r.inputs || {};
            const short = Object.keys(inputs).find(id => {
                const req = (r.roles && r.roles[id]) || id;
                const need = inputs[id] | 0;
                return !I || (typeof I.countRequirement === "function" ? I.countRequirement(unit.id, req) : I.count(unit.id, id)) < need;
            });
            if (short) return { ok: false, reason: `needs ${lower(itemName(short))}` };
            if (!r.at) {
                job.target = { area: copyArea(unit.area), x: unit.x, y: unit.y, z: zOf(unit) };
                return { ok: true, stand: null }; // made where the crafter stands
            }
            const found = O ? O.findIn(lv(unit), { near: { x: unit.x, y: unit.y }, radius: CRAFT_SEARCH, tags: [r.at], limit: 4 }) : [];
            for (const f of found) {
                const target = { area: copyArea(unit.area), x: f.x, y: f.y, z: zOf(unit) };
                const stand = standFor(target, unit, f.type.passable !== true);
                if (stand) {
                    job.target = target;
                    return { ok: true, stand };
                }
            }
            return { ok: false, reason: `needs a ${r.at}` };
        },
        work(job) {
            const r = recipeOf(job.params.recipeId);
            return r ? r.work | 0 : 0;
        },
        apply(job, unit) {
            const I = Items();
            const r = recipeOf(job.params.recipeId);
            if (!r) return;

            // 1. Determine primary material to inherit on output
            let primaryMat = null;
            let primaryKey = r.primaryInput;
            if (primaryKey === undefined) {
                const inputKeys = Object.keys(r.inputs || {});
                if (r.roles) {
                    const priorityRoles = ["CUTTING_METAL", "FLEXIBLE_BOW_WOOD", "HARD_STONE", "BUILDING_STONE", "STRUCTURAL_TIMBER", "LEATHER"];
                    for (const prole of priorityRoles) {
                        const foundKey = inputKeys.find(k => r.roles[k] === prole);
                        if (foundKey) { primaryKey = foundKey; break; }
                    }
                }
                if (!primaryKey && inputKeys.length > 0) {
                    primaryKey = inputKeys[0];
                }
            }
            if (primaryKey && I && typeof I.findCandidates === "function") {
                const primaryReq = (r.roles && r.roles[primaryKey]) || primaryKey;
                const candidates = I.findCandidates(unit.id, primaryReq);
                if (candidates && candidates.length > 0 && candidates[0].mat) {
                    primaryMat = candidates[0].mat;
                }
            }

            // 2. Consume required inputs
            for (const id of Object.keys(r.inputs || {})) {
                const req = (r.roles && r.roles[id]) || id;
                const need = r.inputs[id] | 0;
                if (I && typeof I.consumeRequirementFrom === "function") {
                    I.consumeRequirementFrom(unit.id, req, need);
                } else if (I) {
                    I.consumeFrom(unit.id, id, need);
                }
            }

            // 3. Roll quality and prepare output options
            const made = [];
            const quality = (window.UF && UF.Skills && typeof UF.Skills.qualityRoll === "function") ? UF.Skills.qualityRoll(unit, r.id) : 0;
            const giveOpts = {};
            if (primaryMat) giveOpts.mat = primaryMat;
            if (quality > 0) giveOpts.q = quality;

            // 4. Produce output items with inherited material and quality
            for (const id of Object.keys(r.outputs || {})) {
                let itemsGiven = I.give(id, r.outputs[id] | 0, unit.id, giveOpts);
                if (!itemsGiven || itemsGiven.length === 0) {
                    itemsGiven = I.drop(lv(unit), unit.x, unit.y, id, r.outputs[id] | 0, unit.id, giveOpts);
                }
                for (const it of (itemsGiven || [])) {
                    if (quality > 0) it.quality = quality;
                    if (!it.firstOwner) {
                        it.firstOwner = unit.id;
                        const Own = window.UF && UF.Ownership;
                        if (Own && typeof Own.claim === "function" && !Own.ownerOf({ kind: "item", id: it.id })) {
                            Own.claim({ kind: "item", id: it.id }, unit, { reason: "crafted" });
                        }
                    }
                    made.push(it.id);
                }
            }
            job.result = { items: made, quality, mat: primaryMat };
        },
        describe(job) {
            const r = recipeOf(job.params.recipeId);
            return r ? gerund(r.name) : "Making something";
        }
    });

    define("equip", {
        verb: "Equipping",
        plan(job, unit) {
            const I = Items();
            const it = I ? I.get(job.params.itemId) : null;
            if (!it || it.holder !== unit.id) return { ok: false, reason: "not carried" };
            const t = I.type(it.type);
            if (!t || (!t.tool && !t.wear)) return { ok: false, reason: "can't be equipped" };
            return { ok: true, stand: null }; // instant
        },
        work: 0,
        apply(job, unit) {
            const I = Items();
            const it = I.get(job.params.itemId), t = I.type(it.type);
            if (!unit.data.equipment) unit.data.equipment = { tool: null, clothes: null };
            if (t.tool) unit.data.equipment.tool = it.id;
            if (t.wear) {
                unit.data.equipment.clothes = it.id;
                unit.data.tier = t.wear.tier | 0;
                if (window.UF.Colonists && typeof UF.Colonists.setTier === "function") UF.Colonists.setTier(unit, unit.data.tier);
            }
        },
        describe(job) {
            const t = Items() ? Items().type(itemTypeOf(job.params.itemId)) : null;
            return t && t.wear ? `Putting on ${withArticle(t.name)}` : `Taking up ${withArticle(t ? t.name : "a tool")}`;
        }
    });

    const speciesOf = unit => {
        const c = catalog();
        const list = (c && c.wildlife && c.wildlife.species) || [];
        return list.find(s => s.id === (unit && unit.data && unit.data.species)) || null;
    };
    define("hunt", {
        verb: "Hunting",
        replanEvery: REPLAN_TICKS,
        plan(job, unit) {
            const W = World();
            const prey = W.unit(job.params.unitId);
            if (!prey) return { ok: false, reason: "the prey is gone" };
            job.params.preyName = prey.name;
            if (!sameLevel(prey, unit)) return { ok: false, reason: "the prey left the area" };
            if (chebyshev(prey.x, prey.y, unit.x, unit.y) > HUNT_MAX_DIST) return { ok: false, reason: "the prey got away" };
            job.target = { area: copyArea(prey.area), x: prey.x, y: prey.y, z: zOf(prey) };
            const stand = standFor(job.target, unit, true);
            return stand ? { ok: true, stand } : { ok: false, reason: "can't reach it" };
        },
        work(job) {
            const prey = World().unit(job.params.unitId);
            const s = speciesOf(prey);
            return s && s.hunt && s.hunt.work > 0 ? s.hunt.work | 0 : 60;
        },
        apply(job, unit) {
            const W = World(), I = Items();
            const prey = W.unit(job.params.unitId);
            if (!prey) throw new Error("the prey is gone");
            const s = speciesOf(prey);
            const yields = (s && s.yields) || {};
            const dropped = [];
            if (I) for (const id of Object.keys(yields)) for (const it of I.drop(lv(prey), prey.x, prey.y, id, yields[id] | 0, unit.id)) dropped.push(it.id);
            const where = { area: copyArea(prey.area), x: prey.x, y: prey.y, z: zOf(prey) };
            W.removeUnit(prey.id);
            job.result = { prey: prey.id, species: prey.data && prey.data.species, at: where, yields, items: dropped };
            emit("jobs:kill", job, prey, unit);
        },
        describe: job => `Hunting ${withArticle(job.params.preyName || (World().unit(job.params.unitId) || {}).name || "prey")}`
    });

    define("drink", {
        verb: "Drinking",
        plan(job, unit) {
            if (!isWaterIn(lv(job.target), job.target.x, job.target.y)) return { ok: false, reason: "no water there" };
            const stand = standFor(job.target, unit, true);
            return stand ? { ok: true, stand } : { ok: false, reason: "can't reach the water" };
        },
        work: NEED_WORK,
        apply(job, unit) {
            lowerNeed(unit, "thirst", 65);
        },
        describe: () => "Drinking"
    });

    define("eat", {
        verb: "Eating",
        plan(job, unit) {
            const I = Items();
            const it = I ? I.get(job.params.itemId) : null;
            const t = it ? I.type(it.type) : null;
            if (!it || !t || !t.food) return { ok: false, reason: "nothing to eat" };
            if (it.holder === unit.id) return { ok: true, stand: null };
            if (!it.area) return { ok: false, reason: "someone else has it" };
            if (!sameLevel(it, job.target) || it.x !== job.target.x || it.y !== job.target.y) return { ok: false, reason: "the food moved" };
            const stand = standFor(job.target, unit, false);
            return stand ? { ok: true, stand } : { ok: false, reason: "can't reach it" };
        },
        work: NEED_WORK,
        apply(job, unit) {
            const I = Items();
            const it = I.get(job.params.itemId);
            if (!it) throw new Error("the food is gone");
            const t = I.type(it.type);
            job.params.itemType = it.type;
            if (I.consume(it.id, 1) < 1) throw new Error("the food is gone");
            lowerNeed(unit, "hunger", (t.food && t.food.hunger) | 0);
            lowerNeed(unit, "thirst", (t.food && t.food.thirst) | 0);
        },
        describe: job => `Eating ${lower(itemName(itemTypeOf(job.params.itemId) || job.params.itemType))}`.trim()
    });

    define("sleep", {
        verb: "Sleeping",
        plan(job, unit) {
            const stand = standFor(job.target, unit, false);
            return stand ? { ok: true, stand } : { ok: false, reason: "can't reach the bed" };
        },
        work: job => (job.params.frames > 0 ? job.params.frames | 0 : SLEEP_WORK),
        apply(job, unit) {
            if (!noNeeds(unit)) unit.data.needs.sleep = 5;
        },
        describe: () => "Sleeping"
    });

    define("talk", {
        verb: "Talking",
        replanEvery: REPLAN_TICKS,
        plan(job, unit) {
            const other = World().unit(job.params.unitId);
            if (!other) return { ok: false, reason: "nobody to talk to" };
            job.params.otherName = other.name;
            if (!sameLevel(other, unit) || chebyshev(other.x, other.y, unit.x, unit.y) > HUNT_MAX_DIST) return { ok: false, reason: "too far away" };
            job.target = { area: copyArea(other.area), x: other.x, y: other.y, z: zOf(other) };
            const stand = standFor(job.target, unit, true);
            return stand ? { ok: true, stand } : { ok: false, reason: "can't get near" };
        },
        work: TALK_WORK,
        apply(job, unit) {
            const other = World().unit(job.params.unitId);
            lowerNeed(unit, "social", 55);
            if (other) lowerNeed(other, "social", 55);
        },
        describe: job => `Talking with ${job.params.otherName || "someone"}`
    });

    define("mate", {
        verb: "Embracing",
        replanEvery: REPLAN_TICKS,
        plan(job, unit) {
            const partner = World().unit(job.params.partnerId || job.params.unitId);
            if (!partner) return { ok: false, reason: "nobody to embrace" };
            job.params.partnerName = partner.name;
            if (!sameLevel(partner, unit) || chebyshev(partner.x, partner.y, unit.x, unit.y) > HUNT_MAX_DIST) return { ok: false, reason: "too far away" };
            job.target = { area: copyArea(partner.area), x: partner.x, y: partner.y, z: zOf(partner) };
            const stand = standFor(job.target, unit, true);
            return stand ? { ok: true, stand } : { ok: false, reason: "can't get near" };
        },
        work: 120,
        apply(job, unit) {
            const partner = World().unit(job.params.partnerId || job.params.unitId);
            lowerNeed(unit, "social", 50);
            if (partner) lowerNeed(partner, "social", 50);
            if (window.UF && UF.Colonists && typeof UF.Colonists.onMated === "function") {
                UF.Colonists.onMated(unit, partner);
            }
        },
        describe: job => `Intimate with ${job.params.partnerName || "partner"}`
    });

    //-------------------------------------------------------------------------
    // The job list

    function create(spec) {
        const st = jobState();
        if (!st || !spec || !handlers[spec.type]) return null;
        const W = World();
        let target = spec.target || null;
        if (target && !target.area) {
            // No area: the level on screen (else the start area's ground).
            const v = W.viewLevel ? W.viewLevel() : W.currentArea();
            target = { area: v ? copyArea(v) : copyArea(W.state.startArea), x: target.x | 0, y: target.y | 0, z: target.z !== undefined ? target.z : zOf(v) };
        }
        if (!target && spec.owner) {
            const u = W.unit(spec.owner);
            if (u) target = { area: copyArea(u.area), x: u.x, y: u.y, z: zOf(u) };
        }
        if (!target || !target.area || !validLevel(target) || !W.inWorld(target.area.x, target.area.y, refZ(target))) return null;
        const job = {
            id: st.nextId++,
            type: spec.type,
            target: { area: copyArea(target.area), x: target.x | 0, y: target.y | 0, z: refZ(target) },
            params: Object.assign({}, spec.params || {}),
            owner: spec.owner || null,
            assigned: null,
            priority: spec.priority | 0,
            progress: 0,
            phase: 0,
            state: "open",
            reason: null,
            created: now(),
            planned: false,
            stand: null,
            blocked: 0
        };
        st.list.push(job);
        emit("jobs:created", job);
        if (job.owner) assign(job.id, job.owner);
        return job;
    }

    function byId(id) {
        const st = jobState();
        return (st && st.list.find(j => j.id === id)) || null;
    }
    function of(unitId) {
        const st = jobState();
        return (st && st.list.find(j => isActive(j) && j.assigned === unitId)) || null;
    }

    function unitEvent(unit) {
        const W = World();
        return W ? W.eventOf(unit.id) : null;
    }
    function stopWorking(unit) {
        const ev = unitEvent(unit);
        if (ev) ev.setStepAnime(false);
    }

    function fail(job, reason) {
        const W = World();
        const unit = job.assigned ? W.unit(job.assigned) : null;
        const h = handlers[job.type];
        if (unit) {
            reservationManager.clearUnit(unit.id);
            if (unit.goal && job.stand && atCell({ area: unit.goal.area, x: unit.goal.x, y: unit.goal.y, z: zOf(unit.goal) }, job.stand)) W.stopUnit(unit.id);
            stopWorking(unit);
            if (h && typeof h.cancel === "function") {
                try { h.cancel(job, unit); } catch (e) { console.error(e); }
            }
        } else if (job.assigned) {
            reservationManager.clearUnit(job.assigned);
        }
        job.state = "failed";
        job.reason = reason || "failed";
        job.finished = now();
        emit("jobs:failed", job);
        return job;
    }

    function cancel(jobId, reason) {
        const job = byId(jobId);
        if (!job || isFinished(job)) return false;
        fail(job, reason || "cancelled");
        return true;
    }

    // The assigned unit left the world: an open job goes back to the pool, an owned one can't be done any more.
    function release(job) {
        if (job.assigned) reservationManager.clearUnit(job.assigned);
        if (job.owner) return fail(job, "the worker is gone");
        job.assigned = null;
        job.state = "open";
        job.progress = 0;
        job.phase = 0;
        job.planned = false;
        job.stand = null;
        job.blocked = 0;
        return job;
    }

    function plan(job, unit) {
        if (!validLevel(unit) || !validLevel(job.target) || !sameLevel(job.target, unit)) {
            fail(job, "the target is on another level");
            return false;
        }
        const h = handlers[job.type];
        let r;
        try {
            r = h.plan(job, unit);
        } catch (e) {
            console.error(e);
            r = { ok: false, reason: e.message };
        }
        if (!r || r.ok === false) {
            fail(job, (r && r.reason) || "can't be done");
            return false;
        }
        job.stand = r.stand ? { area: copyArea(r.stand.area || job.target.area), x: r.stand.x | 0, y: r.stand.y | 0,
            z: r.stand.z !== undefined ? r.stand.z : r.stand.area && r.stand.area.z !== undefined ? r.stand.area.z : refZ(job.target) } : null;
        if (!validLevel(job.target) || !sameLevel(job.target, unit) || (job.stand && (!validLevel(job.stand) || !sameLevel(job.stand, unit)))) {
            fail(job, "the target is on another level");
            return false;
        }
        job.planned = true;
        job.plannedAt = now();
        return true;
    }

    function assign(jobId, unitId) {
        const job = byId(jobId);
        const W = World();
        const unit = W ? W.unit(unitId) : null;
        if (!job || !unit || isFinished(job) || !handlers[job.type]) return null;
        if (!validLevel(unit) || !validLevel(job.target) || !sameLevel(job.target, unit)) return fail(job, "the target is on another level");
        if (job.assigned === unitId && isActive(job)) return job;
        const current = of(unitId);
        if (current && current !== job) fail(current, "replaced");
        if (job.assigned && job.assigned !== unitId) {
            const previous = W.unit(job.assigned);
            if (previous) stopWorking(previous);
        }
        job.assigned = unitId;
        job.state = "travel";
        reservationManager.reserve(unitId, job.target);
        if (job.params && job.params.itemId) {
            reservationManager.reserve(unitId, job.params.itemId);
        }
        job.progress = 0;
        job.phase = 0;
        job.blocked = 0;
        job.stall = null;
        job.barked = false;
        job.reason = null;
        emit("jobs:assigned", job, unit);
        if (!plan(job, unit)) return job; // failed with a reason, still returned so the caller can read it
        return job;
    }

    function matches(job, filter) {
        if (!filter) return true;
        if (typeof filter === "function") return !!filter(job);
        return Object.keys(filter).every(k => job[k] === filter[k]);
    }
    function list(filter) {
        const st = jobState();
        return st ? st.list.filter(j => matches(j, filter)) : [];
    }
    const open = () => list(j => j.state === "open" && !j.assigned);

    /** Give a unit the nearest open job it can do (highest priority first). Returns the job or null. */
    function take(unitId, filter) {
        const W = World();
        const unit = W ? W.unit(unitId) : null;
        if (!unit || !validLevel(unit)) return null;
        const candidates = open().filter(j => sameLevel(j.target, unit) && matches(j, filter));
        candidates.sort((a, b) => (b.priority - a.priority) || (unitDistance(unit, lv(a.target), a.target.x, a.target.y) - unitDistance(unit, lv(b.target), b.target.x, b.target.y)) || (a.id - b.id));
        for (const job of candidates.slice(0, 8)) {
            // A dry run of the plan: a designation nobody can do yet (needs items, walled in) stays open.
            let r = null;
            try { r = handlers[job.type].plan(job, unit); } catch (e) { r = null; }
            if (!r || r.ok === false) {
                job.reason = (r && r.reason) || null;
                continue;
            }
            return assign(job.id, unitId);
        }
        return null;
    }

    function describe(job) {
        if (!job) return "";
        const h = handlers[job.type];
        if (!h) return job.type;
        try {
            const text = typeof h.describe === "function" ? h.describe(job) : `${h.verb}`;
            return text.charAt(0).toUpperCase() + text.slice(1);
        } catch (e) {
            return h.verb;
        }
    }

    //-------------------------------------------------------------------------
    // Working: tool multipliers and the per-tick step

    function toolMultiplier(unit, job) {
        if (!unit) return 1;
        const I = Items();
        const eq = unit.data && unit.data.equipment;
        const it = I && eq && eq.tool ? I.get(eq.tool) : null;
        const t = it && it.holder === unit.id ? I.type(it.type) : null;
        let mult = 1;
        if (t && t.tool) {
            if (typeof t.tool[job.type] === "number" && t.tool[job.type] > 0) {
                mult = t.tool[job.type];
            } else if (job.type === "craft") {
                // A recipe's "tool" is a tag that helps (never required): a knife for sewing.
                const r = recipeOf(job.params.recipeId);
                if (r && r.tool && Array.isArray(t.tags) && t.tags.includes(r.tool)) mult = 1.5;
            }
            // Quality and material scaling for tool
            if (it && mult > 1) {
                const q = it.q || it.quality || 0;
                if (q > 0) mult *= (1 + q * 0.1);
                if (it.mat && I && typeof I.materialOf === "function") {
                    const matDef = I.materialOf(it.mat);
                    if (matDef && matDef.hardness) {
                        if (matDef.hardness >= 7.0) mult *= 1.35; // Steel
                        else if (matDef.hardness >= 4.5) mult *= 1.25; // Iron
                        else if (matDef.hardness >= 4.0) mult *= 1.15; // Bronze
                    }
                }
            }
        }

        // Tool penalty for hard stone mining/quarrying:
        if (job && (job.type === "quarry" || job.type === "mine") && job.target) {
            const O = Objects();
            let stoneMat = null;
            const targetObj = O ? O.atIn(lv(job.target), job.target.x, job.target.y) : null;
            if (targetObj && O && typeof O.materialOf === "function") {
                stoneMat = O.materialOf(targetObj.id, job.target.area, job.target.x, job.target.y);
            }
            if (!stoneMat && zOf(job.target) < 0) {
                const W = World(), st = W && W.state;
                const size = st ? st.size : 256;
                const gx = job.target.area.x * size + job.target.x, gy = job.target.area.y * size + job.target.y;
                const G = window.UF && UF.WorldGen;
                const geo = G && typeof G.geologyAt === "function" ? G.geologyAt(gx, gy, zOf(job.target)) : null;
                stoneMat = geo ? `stones:${geo.stone}` : "stones:limestone";
            }
            const matDef = (stoneMat && I && typeof I.materialOf === "function") ? I.materialOf(stoneMat) : null;
            if (matDef && ((matDef.tags && matDef.tags.includes("hard_stone")) || (matDef.fractureResistance && matDef.fractureResistance >= 75))) {
                const hasMetalPick = t && t.tool && (t.tool.quarry || t.tool.mine) &&
                    (t.id.includes("iron") || t.id.includes("steel") || t.id.includes("bronze") || (it && it.mat && ["iron", "steel", "bronze"].includes(it.mat)));
                if (!hasMetalPick) {
                    mult *= 0.5; // Inadequate tool penalty on hard stone
                }
            }
        }

        return mult;
    }
    const skillMultiplier = (unit, job) => {
        if (window.UF && UF.Proficiency && typeof UF.Proficiency.resolveCapability === "function") {
            try {
                let profId = job.type;
                let abilityKey = "str";
                if (job.type === "chop") { profId = "woodcutting"; abilityKey = "str"; }
                else if (job.type === "mine" || job.type === "quarry") { profId = "mining"; abilityKey = "str"; }
                else if (job.type === "build") { profId = "carpentry"; abilityKey = "str"; }
                else if (job.type === "craft") {
                    const r = recipeOf(job.params && job.params.recipeId);
                    if (r && r.craft === "smithing") { profId = "smithing"; abilityKey = "str"; }
                    else if (r && r.craft === "fletching") { profId = "fletching"; abilityKey = "dex"; }
                    else if (r && r.craft === "cooking") { profId = "cooking"; abilityKey = "wis"; }
                    else { profId = "carpentry"; abilityKey = "dex"; }
                }
                const cap = UF.Proficiency.resolveCapability(unit, profId, abilityKey).capability;
                return Math.max(0.3, 1.0 + cap * 0.15);
            } catch (e) {
                return 1;
            }
        }
        if (window.UF && UF.Skills && typeof UF.Skills.rate === "function") {
            try { return UF.Skills.rate(unit, job.type, job); } catch (e) { return 1; }
        }
        return 1;
    };
    const rateOf = (unit, job) => ((unit.data && unit.data.workRate > 0 ? unit.data.workRate : 1) * toolMultiplier(unit, job) * skillMultiplier(unit, job));
    function workOf(job, unit) {
        const h = handlers[job.type];
        const w = typeof h.work === "function" ? h.work(job, unit) : h.work;
        return Math.max(0, Number(w) || 0);
    }

    const facingTo = (dx, dy) => (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 6 : 4) : (dy > 0 ? 2 : 8));
    function startWork(job, unit) {
        const h = handlers[job.type];
        job.state = "work";
        job.stall = null;
        const ev = unitEvent(unit);
        if (ev) {
            let dx = job.target.x - unit.x, dy = job.target.y - unit.y;
            if (!dx && !dy && job.params && job.params.faceTowards) {
                dx = job.params.faceTowards.x - unit.x;
                dy = job.params.faceTowards.y - unit.y;
            }
            // Face the target before the work frames play: 8 ways (VISION V3), 4 with FourWay.
            if ((dx || dy) && sameLevel(job.target, unit)) {
                if (ev.faceToward8) ev.faceToward8(dx, dy);
                else ev.setDirection(facingTo(dx, dy));
                if (unit) unit.dir = ev.direction();
            }
            if (job.type === "sleep") {
                ev.setStepAnime(false);
            } else {
                ev.setStepAnime(true);
            }
            // V92 (user 2026-09-19): no status text over heads; the job shows in the profile, not as a bark.
        }
        job.barked = true;
    }

    function finish(job, unit) {
        const h = handlers[job.type];
        // Moving targets may change floor after the last timed replan. Refuse
        // before apply can kill a unit, consume an item or change either need.
        let subject = null;
        if (job.type === "hunt" || job.type === "talk" || job.type === "mate") subject = World().unit(job.params.partnerId || job.params.unitId);
        else if (job.type === "fetch" || job.type === "eat" || (job.type === "haul" && (job.phase | 0) === 0)) {
            const item = Items() && Items().get(job.params.itemId);
            if (item && item.area && item.holder !== unit.id) subject = item;
        } else if (job.type === "haul") subject = job.params.to;
        if (!sameLevel(job.target, unit) || (subject && (!validLevel(subject) || !sameLevel(subject, unit)))) {
            fail(job, "the target is on another level");
            return;
        }
        let result;
        try {
            result = h.apply(job, unit);
        } catch (e) {
            console.error(e);
            fail(job, e.message || "failed");
            return;
        }
        if (result === "continue") {
            job.phase = (job.phase | 0) + 1;
            job.progress = 0;
            job.planned = false;
            job.stand = null;
            job.state = "travel";
            job.barked = false;
            stopWorking(unit);
            return;
        }
        stopWorking(unit);
        if (unit) reservationManager.clearUnit(unit.id);
        else if (job.assigned) reservationManager.clearUnit(job.assigned);
        job.state = "done";
        job.finished = now();
        if (unit && window.UF && UF.Proficiency && typeof UF.Proficiency.gainXp === "function") {
            let profId = job.type;
            if (job.type === "chop") profId = "woodcutting";
            else if (job.type === "mine" || job.type === "quarry") profId = "mining";
            else if (job.type === "build") profId = "carpentry";
            else if (job.type === "craft") {
                const r = recipeOf(job.params && job.params.recipeId);
                if (r && r.craft) profId = r.craft;
            }
            UF.Proficiency.gainXp(unit, profId, 15, "routine");
        }
        emit("jobs:done", job, unit);
    }

    function noteBlocked(job, unit) {
        job.blocked = (job.blocked | 0) + 1;
        if (job.blocked >= BLOCKS_TO_FAIL) {
            fail(job, "can't reach it");
            return false;
        }
        job.planned = false; // a fresh plan may choose another stand cell
        if (unit.goal) World().stopUnit(unit.id);
        return true;
    }

    function step(job, unit) {
        const W = World();
        const h = handlers[job.type];
        if (!validLevel(unit) || !validLevel(job.target) || !sameLevel(job.target, unit) ||
            (job.stand && (!validLevel(job.stand) || !sameLevel(job.stand, unit)))) {
            fail(job, "the target is on another level");
            return;
        }
        if (!job.planned || (h.replanEvery > 0 && now() - job.plannedAt >= h.replanEvery)) {
            const wasStand = job.stand;
            if (!plan(job, unit)) return;
            // The target moved: walk again.
            if (job.state === "work" && !atCell(unit, job.stand) && wasStand) {
                job.state = "travel";
                stopWorking(unit);
            }
        }
        const stand = job.stand;
        if (stand && !atCell(unit, stand)) {
            if (!unit.goal || !sameLevel(unit.goal, stand) || unit.goal.x !== stand.x || unit.goal.y !== stand.y) {
                W.sendUnit(unit.id, { area: stand.area, x: stand.x, y: stand.y, z: refZ(stand) });
            }
            // No progress toward the stand for a while counts as a block (an enclosed unit never reports one).
            const key = `${unit.area.x},${unit.area.y},${zOf(unit)}:${unit.x},${unit.y}`;
            if (!job.stall || job.stall.key !== key) job.stall = { key, since: now() };
            else if (now() - job.stall.since >= STALL_TICKS) {
                job.stall = null;
                noteBlocked(job, unit);
            }
            return;
        }
        // A unit must have its own exclusive square to act:
        const sharingSquare = W.unitsInArea(unit.area.x, unit.area.y, zOf(unit)).some(o => o.id !== unit.id && o.x === unit.x && o.y === unit.y);
        if (sharingSquare) {
            const ev = unitEvent(unit);
            const otherEvs = window.$gameMap ? $gameMap.eventsXyNt(unit.x, unit.y).filter(e => e !== ev) : [];
            const anyOtherMoving = otherEvs.some(e => e.isMoving());
            if (!anyOtherMoving) {
                // Another unit is stationary on this square; replan to select an unoccupied neighbor stand square
                job.planned = false;
            }
            return;
        }
        if (job.state !== "work") {
            const ev = unitEvent(unit);
            if (ev && ev.isMoving()) return; // let the sprite arrive before the work starts
            startWork(job, unit);
        }
        job.progress += rateOf(unit, job);
        if (job.progress >= workOf(job, unit)) finish(job, unit);
    }

    function prune(st) {
        let finished = st.list.filter(isFinished).length;
        if (finished <= FINISHED_KEPT) return;
        for (let i = 0; i < st.list.length && finished > FINISHED_KEPT; ) {
            if (isFinished(st.list[i])) {
                st.list.splice(i, 1);
                finished--;
            } else i++;
        }
    }

    function update() {
        localTicks++;
        const st = jobState();
        if (!st || !st.list.length) return;
        const W = World();
        for (const job of st.list.slice()) {
            if (!isActive(job)) continue;
            const unit = W.unit(job.assigned);
            if (!unit) {
                release(job);
                continue;
            }
            if (!handlers[job.type]) {
                fail(job, "unknown job type");
                continue;
            }
            step(job, unit);
        }
        prune(st);
    }

    //-------------------------------------------------------------------------
    // The public object

    const Jobs = {
        define,
        types: () => Object.keys(handlers),
        handler: type => handlers[type] || null,
        create,
        assign,
        take,
        cancel,
        list,
        open,
        of,
        get: byId,
        describe,
        standFor,
        standable: standableIn,
        isWaterAt: isWaterIn,
        toolMultiplier,
        work: workOf,
        update,
        tick: update,
        step,
        ReservationManager: reservationManager,
        reservation: reservationManager
    };
    window.UF = window.UF || {};
    window.UF.Jobs = Jobs;

    //-------------------------------------------------------------------------
    // Engine hooks and events

    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive); // UF_World moved the units first (its alias is below ours)
        update();
    };

    // A loaded game: stand cells were planned on another run's map; plan them again.
    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        const st = jobState();
        if (st) for (const job of st.list) if (isActive(job)) { job.planned = false; job.stall = null; }
    };

    let hooked = false;
    function hookEvents() {
        if (hooked || !window.UF || !UF.Events) return;
        hooked = true;
        UF.Events.on("world:unitBlocked", u => {
            const job = u ? of(u.id) : null;
            if (job) noteBlocked(job, u);
        });
        UF.Events.on("world:unitRemoved", u => {
            const job = u ? of(u.id) : null;
            if (job) release(job);
        });
    }
    hookEvents();

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        hookEvents();
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "jobs")

    function registerChecks() {
        UF.Test.suite("jobs", async t => {
            const W = UF.World, O = UF.Objects, I = UF.Items;
            if (window.UF && UF.Levels && typeof UF.Levels.view === "function" && UF.Levels.view() !== 0) {
                UF.Levels.setView(0);
                await t.waitUntil(() => !!(W && W.currentArea && W.currentArea()), 10000, "Ground view for jobs checks").catch(() => {});
            }
            const area = W.currentArea();
            if (!area || !O || !I) {
                t.check("world_present", false, `area ${JSON.stringify(area)}, UF.Objects ${!!O}, UF.Items ${!!I}`);
                return;
            }
            const Col = window.UF && UF.Colonists;
            const colonistsWere = Col && typeof Col.setEnabled === "function" ? Col.enabled !== false : null;
            if (Col && Col.setEnabled) Col.setEnabled(false);
            const mid = Math.floor(W.state.size / 2);
            const errors0 = t.errorsSoFar().length;
            const ticks = () => now();
            const waitJob = (job, ms, what) => t.waitUntil(() => isFinished(job), ms, what || `job ${job.id} (${job.type}) to finish`).catch(() => {});
            const jobText = job => `${job.type} #${job.id} state ${job.state}${job.reason ? ` (${job.reason})` : ""}, progress ${job.progress}`;
            const itemsOn = (x, y, type) => I.count({ x, y, area }, type);
            const inventory = u => I.inventoryOf(u.id).map(it => `${it.type}x${it.count}`).join(",") || "empty";

            // An arena south of the pair, cleared of generated objects (restored at the end), at zoom 1.
            const ax0 = mid - 10, ax1 = mid + 10, ay0 = mid + 4, ay1 = mid + 14;
            const placed = [];
            const put = (x, y, id) => {
                placed.push({ x, y, was: O.typeIdAt(x, y) });
                return O.set(x, y, id);
            };
            for (let y = ay0; y <= ay1; y++) for (let x = ax0; x <= ax1; x++) if (O.typeIdAt(x, y)) put(x, y, null);
            if (UF.Camera) UF.Camera.setLevel(0);
            $gamePlayer.locate(mid, mid + 9);
            const itemsBefore = new Set(Object.keys(I.state().byId));
            const unitsBefore = new Set(W.units().map(u => u.id));
            await t.waitFrames(3);

            const worker = W.addUnit({ name: "TEST_worker", image: { characterName: "$U7_Townsman" }, area, x: mid - 2, y: mid + 13, dir: 8,
                data: { kind: "test", faction: "player", inventory: [], equipment: {} } });

            // define + create: a custom type runs through the loop and finishes; every built-in type is registered.
            const builtIn = ["move", "wander", "gather", "chop", "pick", "quarry", "mine", "haul", "fetch", "build", "craft", "equip", "hunt", "drink", "eat", "sleep", "talk", "mate"];
            let applied = 0;
            const events = { created: 0, assigned: 0, done: 0, failed: 0, kill: 0 };
            const listeners = {};
            for (const k of Object.keys(events)) UF.Events.on(`jobs:${k}`, listeners[k] = () => events[k]++);
            define("test_noop", { verb: "Testing", plan: () => ({ ok: true, stand: null }), work: 3, apply: () => { applied++; } });
            const j0 = create({ type: "test_noop", owner: worker.id });
            await waitJob(j0, 3000);
            const missing = builtIn.filter(ty => !handlers[ty]);
            t.check("define_and_create", !!j0 && j0.state === "done" && applied === 1 && missing.length === 0 && events.created >= 1 && events.done >= 1 && Jobs.of(worker.id) === null && W.state.jobs.list.includes(j0),
                `custom job ${j0 ? jobText(j0) : "not created"}, apply ran ${applied}x; built-in types missing: ${missing.join(", ") || "none"}; events created ${events.created}, done ${events.done}; of(worker) after: ${Jobs.of(worker.id)}`);

            // travel_and_work (at x1, for the screenshot): chop an oak 4 cells north (the stand cell south of the
            // trunk draws over the canopy, so the worker is visible in the screenshot).
            const ox = mid - 2, oy = mid + 9;
            put(ox, oy, "oak");
            const startY = worker.y;
            const chop = create({ type: "chop", target: { area, x: ox, y: oy }, owner: worker.id });
            await t.waitUntil(() => chop.state === "work" || isFinished(chop), 8000, "the worker to reach the oak").catch(() => {});
            const arrivedAt = { x: worker.x, y: worker.y, state: chop.state, adjacent: manhattan(worker.x, worker.y, ox, oy) === 1 };
            const ev = W.eventOf(worker.id);
            const facingOak = !!ev && ev.direction() === 8 && ev.hasStepAnime();
            const p0 = chop.progress, t0 = ticks();
            await t.waitFrames(30);
            const rate1 = ticks() > t0 ? (chop.progress - p0) / (ticks() - t0) : NaN;
            const view = `view (${$gameMap.displayX().toFixed(1)},${$gameMap.displayY().toFixed(1)}) ${Math.ceil($gameMap.screenTileX())}x${Math.ceil($gameMap.screenTileY())} cells`;
            t.screenshot("jobs_working");
            const describeChop = describe(chop);
            await waitJob(chop, 12000);
            const stump = O.typeIdAt(ox, oy) === O.typeId("stump");
            t.check("travel_and_work", chop.state === "done" && arrivedAt.state === "work" && arrivedAt.adjacent && worker.y !== startY && rate1 > 0 && stump && itemsOn(ox, oy, "log") === 3 && facingOak,
                `worker walked from y ${startY} to (${arrivedAt.x},${arrivedAt.y}) [adjacent to the oak at (${ox},${oy}) ${arrivedAt.adjacent}, state then "${arrivedAt.state}", facing north with step anime ${facingOak}]; progress rate ${rate1.toFixed(2)}/tick over 30 frames; ${jobText(chop)}; cell now "${(O.at(ox, oy) || {}).id}", logs on it ${itemsOn(ox, oy, "log")}; ${view}`);

            // The rest runs at x8 (reset at the end).
            if (UF.Time) UF.Time.setLevel(3);

            // haul: a stone stack to another cell (picked up on the way).
            const stone = I.drop(area, mid + 2, mid + 9, "stone", 2)[0];
            const to = { area, x: mid + 6, y: mid + 12 };
            const haul = create({ type: "haul", target: { area, x: stone.x, y: stone.y }, params: { itemId: stone.id, to }, owner: worker.id });
            let carried = false;
            await t.waitUntil(() => { if (I.get(stone.id) && I.get(stone.id).holder === worker.id) carried = true; return isFinished(haul); }, 10000, "the haul to finish").catch(() => {});
            const stoneNow = I.get(stone.id);
            t.check("haul", haul.state === "done" && carried && !!stoneNow && stoneNow.holder === null && stoneNow.x === to.x && stoneNow.y === to.y && sameArea(stoneNow.area, area) && itemsOn(to.x, to.y, "stone") === 2 && !worker.data.inventory.includes(stone.id),
                `${jobText(haul)}; carried on the way ${carried}; stones now at ${stoneNow ? `(${stoneNow.x},${stoneNow.y}) holder ${stoneNow.holder}` : "gone"}, ${itemsOn(to.x, to.y, "stone")} on the target cell; worker inventory ${inventory(worker)}`);

            // fetch_and_craft: 1 stone + 1 fiber fetched, then a stone knife knapped where the crafter stands.
            const s1 = I.drop(area, mid - 4, mid + 12, "stone", 1)[0], f1 = I.drop(area, mid - 1, mid + 12, "fiber", 1)[0];
            const fetch1 = create({ type: "fetch", target: { area, x: s1.x, y: s1.y }, params: { itemId: s1.id }, owner: worker.id });
            await waitJob(fetch1, 8000);
            const fetch2 = create({ type: "fetch", target: { area, x: f1.x, y: f1.y }, params: { itemId: f1.id }, owner: worker.id });
            await waitJob(fetch2, 8000);
            const hadInputs = I.has(worker.id, { stone: 1, fiber: 1 });
            const craft = create({ type: "craft", params: { recipeId: "stone_knife" }, owner: worker.id });
            await waitJob(craft, 8000);
            const knife = I.inventoryOf(worker.id).find(it => it.type === "stone_knife");
            t.check("fetch_and_craft", fetch1.state === "done" && fetch2.state === "done" && hadInputs && craft.state === "done" && !!knife && I.count(worker.id, "stone") === 0 && I.count(worker.id, "fiber") === 0,
                `${jobText(fetch1)}; ${jobText(fetch2)}; had 1 stone + 1 fiber ${hadInputs}; ${jobText(craft)}; inventory ${inventory(worker)}`);

            // craft needing a workplace: with no fire within 40 cells the plan fails with "needs a fire".
            // (A generated site's campfire can sit within 40 cells of the arena; then the job plans instead and is cancelled.)
            I.give("meat_raw", 1, worker.id);
            const firesNear = O.findIn(area, { near: { x: worker.x, y: worker.y }, radius: CRAFT_SEARCH, tags: ["fire"] }).length;
            const cook = create({ type: "craft", params: { recipeId: "cook_meat" }, owner: worker.id });
            const cookText = jobText(cook);
            t.check("craft_needs_workplace", firesNear === 0 ? cook.state === "failed" && cook.reason === "needs a fire" : cook.state === "travel" && !!cook.stand,
                `${firesNear} fire object(s) within ${CRAFT_SEARCH} cells of the worker at (${worker.x},${worker.y}); ${cookText}${cook.stand ? ` toward (${cook.stand.x},${cook.stand.y})` : ""}`);
            if (!isFinished(cook)) cancel(cook.id, "test over");

            // tool_speeds_work: with a stone axe equipped, chop progress per tick doubles.
            const axe = I.give("stone_axe", 1, worker.id)[0];
            const equipAxe = create({ type: "equip", params: { itemId: axe.id }, owner: worker.id });
            await waitJob(equipAxe, 3000);
            put(mid - 5, mid + 6, "oak");
            const chop2 = create({ type: "chop", target: { area, x: mid - 5, y: mid + 6 }, owner: worker.id });
            await t.waitUntil(() => chop2.state === "work" || isFinished(chop2), 8000, "the worker to reach the second oak").catch(() => {});
            const q0 = chop2.progress, u0 = ticks();
            await t.waitUntil(() => ticks() - u0 >= 40 || isFinished(chop2), 5000, "40 ticks of chopping").catch(() => {});
            const rate2 = ticks() > u0 ? (chop2.progress - q0) / (ticks() - u0) : NaN;
            await waitJob(chop2, 8000);
            t.check("tool_speeds_work", equipAxe.state === "done" && worker.data.equipment.tool === axe.id && toolMultiplier(worker, chop2) === 2 && Math.abs(rate2 - 2 * rate1) < 0.05 && chop2.state === "done",
                `${jobText(equipAxe)}; equipment.tool ${worker.data.equipment.tool} (axe ${axe.id}); multiplier ${toolMultiplier(worker, chop2)}; chop rate ${rate2.toFixed(2)}/tick with the axe vs ${rate1.toFixed(2)} without; ${jobText(chop2)}`);

            // equip_clothes: a woven wrap sets tier 1.
            const wrap = I.give("fiber_wrap", 1, worker.id)[0];
            const equipWrap = create({ type: "equip", params: { itemId: wrap.id }, owner: worker.id });
            await waitJob(equipWrap, 3000);
            t.check("equip_clothes", equipWrap.state === "done" && worker.data.tier === 1 && worker.data.equipment.clothes === wrap.id && worker.data.equipment.tool === axe.id,
                `${jobText(equipWrap)}; tier ${worker.data.tier}, equipment ${JSON.stringify(worker.data.equipment)}`);

            // hunt: a test hare 5 cells away; the hunter stands next to it, the hare goes, meat and hide lie there.
            const hare = W.addUnit({ name: "Hare", image: { characterName: "$U7_Hare" }, area, x: worker.x + 5, y: worker.y, dir: 4,
                data: { kind: "test", species: "hare", tags: ["grazer"], faction: null } });
            const hareAt = { x: hare.x, y: hare.y };
            const hunt = create({ type: "hunt", target: { area, x: hare.x, y: hare.y }, params: { unitId: hare.id }, owner: worker.id });
            const huntText = describe(hunt);
            await waitJob(hunt, 10000);
            const huntStand = { x: worker.x, y: worker.y };
            const nextTo = (a, b) => (eightWay() ? chebyshev(a.x, a.y, b.x, b.y) : manhattan(a.x, a.y, b.x, b.y)) === 1;
            const hareGone = !W.unit(hare.id) && !W.eventOf(hare.id);
            const deathAt = (hunt.result && hunt.result.at) || hareAt;
            t.check("hunt", hunt.state === "done" && hareGone && !!huntStand && nextTo(huntStand, deathAt) && itemsOn(deathAt.x, deathAt.y, "meat_raw") === 1 && itemsOn(deathAt.x, deathAt.y, "hide") === 1 && events.kill === 1,
                `${jobText(hunt)}; hunter worked from ${huntStand ? `(${huntStand.x},${huntStand.y})` : "nowhere"} next to the hare at (${deathAt.x},${deathAt.y}); hare unit gone ${hareGone}; on its cell: ${itemsOn(deathAt.x, deathAt.y, "meat_raw")} raw meat, ${itemsOn(deathAt.x, deathAt.y, "hide")} hide; jobs:kill fired ${events.kill}x`);

            // build: without items the job says "needs items"; with 3 logs + 3 stones on the cell a campfire appears.
            const bx = mid + 3, by = mid + 12;
            const buildDry = create({ type: "build", target: { area, x: bx, y: by }, params: { objectId: "campfire" }, owner: worker.id });
            const dryText = jobText(buildDry);
            I.drop(area, bx, by, "log", 3);
            I.drop(area, bx, by, "stone", 3);
            const build = create({ type: "build", target: { area, x: bx, y: by }, params: { objectId: "campfire" }, owner: worker.id });
            await waitJob(build, 10000);
            const fire = (O.at(bx, by) || {}).id;
            t.check("build", buildDry.state === "failed" && buildDry.reason === "needs items" && build.state === "done" && fire === "campfire" && itemsOn(bx, by, "log") === 0 && itemsOn(bx, by, "stone") === 0 && !(worker.x === bx && worker.y === by),
                `without items: ${dryText}; with items: ${jobText(build)}; cell (${bx},${by}) now "${fire}", logs left ${itemsOn(bx, by, "log")}, stones left ${itemsOn(bx, by, "stone")}; worker at (${worker.x},${worker.y})`);

            // With the campfire built, roasting the meat works at it.
            const cook2 = create({ type: "craft", params: { recipeId: "cook_meat" }, owner: worker.id });
            await waitJob(cook2, 10000);
            t.check("craft_at_workplace", cook2.state === "done" && I.count(worker.id, "meat_cooked") === 1 && I.count(worker.id, "meat_raw") === 0 && cook2.target.x === bx && cook2.target.y === by,
                `${jobText(cook2)} at target (${cook2.target.x},${cook2.target.y}) [campfire at (${bx},${by})]; inventory ${inventory(worker)}`);

            // open_job_taken: a second unit with no job takes the nearest of two open gather designations.
            const helper = W.addUnit({ name: "TEST_helper", image: { characterName: "$U7_Ranger" }, area, x: mid + 8, y: mid + 7, dir: 2,
                data: { kind: "test", faction: "player", inventory: [], equipment: {} } });
            put(mid + 9, mid + 8, "grass_tuft");
            put(mid + 2, mid + 14, "grass_tuft");
            const near = create({ type: "gather", target: { area, x: mid + 9, y: mid + 8 } });
            const far = create({ type: "gather", target: { area, x: mid + 2, y: mid + 14 } });
            const openBefore = open().length;
            const taken = take(helper.id);
            await waitJob(near, 8000);
            t.check("open_job_taken", openBefore === 2 && taken === near && near.assigned === helper.id && near.owner === null && near.state === "done" && far.state === "open" && !O.typeIdAt(mid + 9, mid + 8) && itemsOn(mid + 9, mid + 8, "fiber") === 1,
                `${openBefore} open jobs; take(helper) -> ${taken ? `#${taken.id} at (${taken.target.x},${taken.target.y})` : "null"} (nearest is #${near.id}); ${jobText(near)}; far job ${far.state}; grass cell now ${O.typeIdAt(mid + 9, mid + 8) ? "still has the grass" : "empty"}, fiber there ${itemsOn(mid + 9, mid + 8, "fiber")}`);
            cancel(far.id, "test over");

            // describe: card and label texts.
            const wrapJob = create({ type: "craft", target: { area, x: mid, y: mid + 9 }, params: { recipeId: "fiber_wrap" } });
            const texts = { chop: describeChop, hunt: huntText, craft: describe(wrapJob), build: describe(build), far: describe(far) };
            t.check("describe_text", texts.chop === "Chopping an oak" && texts.hunt === "Hunting a hare" && texts.craft === "Weaving a fiber wrap" && texts.build === "Building a campfire" && texts.far === "Gathering tall grass",
                Object.entries(texts).map(([k, v]) => `${k}: "${v}"`).join("; "));
            cancel(wrapJob.id, "test over");

            // mine_built_wall: worker mines a wooden wall; the wall is removed and dropped logs appear.
            const mx = mid + 4, my = mid + 7;
            put(mx, my, "wall_wood");
            const mineWall = create({ type: "mine", target: { area, x: mx, y: my }, owner: worker.id });
            await waitJob(mineWall, 15000);
            const wallGone = !O.typeIdAt(mx, my);
            const logDropped = itemsOn(mx, my, "log");
            t.check("mine_built_wall", mineWall.state === "done" && wallGone && logDropped >= 1,
                `${jobText(mineWall)}; wall_wood cleared: ${wallGone}, logs on cell: ${logDropped}`);

            // mine_subterranean_wall: worker on z = -1 mines a solid rock wall; shape becomes floor and stone drops.
            const L = window.UF && UF.Levels;
            if (L && typeof L.setShape === "function" && typeof L.shapeAt === "function") {
                const subTarget = { area, x: mid + 1, y: mid + 1, z: -1 };
                const subStand = { area, x: mid + 1, y: mid + 2, z: -1 };
                L.setShape(subTarget, "solid", { material: "stone" });
                L.setShape(subStand, "floor", { material: "stone" });
                const subWorker = W.addUnit({ name: "TEST_miner", image: { characterName: "$U7_Townsman" }, area, x: subStand.x, y: subStand.y, z: -1, dir: 8,
                    data: { kind: "test", faction: "player", inventory: [], equipment: {} } });
                const subMine = create({ type: "mine", target: subTarget, owner: subWorker.id });
                await waitJob(subMine, 15000);
                const shapeAfter = L.shapeAt(subTarget);
                const subStone = I.count({ area, x: subTarget.x, y: subTarget.y, z: -1 }, "stone");
                t.check("mine_subterranean_wall", subMine.state === "done" && shapeAfter === "floor" && subStone >= 1,
                    `${jobText(subMine)}; shape after mining: "${shapeAfter}" (want "floor"), stone dropped: ${subStone}`);
                W.removeUnit(subWorker.id);
            }

            // drink and eat: a water cell made for the test; needs go down and the drinker stays out of the water.
            worker.data.needs = { hunger: 60, thirst: 80, sleep: 50, social: 50 };
            const wx = mid + 8, wy = mid + 13;
            const tileBefore = W.getTile(area.x, area.y, wx, wy, 0);
            W.setTile(area.x, area.y, wx, wy, 0, ((catalog().water && catalog().water.surface && catalog().water.surface.fresh) || 2048));
            const drink = create({ type: "drink", target: { area, x: wx, y: wy }, owner: worker.id });
            await waitJob(drink, 10000);
            const drankFrom = { x: worker.x, y: worker.y };
            const berries = I.give("berries", 2, worker.id)[0];
            const eat = create({ type: "eat", params: { itemId: berries.id }, owner: worker.id });
            await waitJob(eat, 5000);
            t.check("drink_and_eat", drink.state === "done" && worker.data.needs.thirst === 15 && nextTo(drankFrom, { x: wx, y: wy }) && eat.state === "done" && worker.data.needs.hunger === 35 && I.count(worker.id, "berries") === 1,
                `${jobText(drink)} from (${drankFrom.x},${drankFrom.y}) next to water at (${wx},${wy}): thirst 80 -> ${worker.data.needs.thirst}; ${jobText(eat)}: hunger 60 -> ${worker.data.needs.hunger}, berries left ${I.count(worker.id, "berries")}`);
            W.setTile(area.x, area.y, wx, wy, 0, tileBefore);

            // blocked_fails: an oak walled in by four oaks can't be reached; the plan fails with a reason.
            const cx = mid - 8, cy = mid + 12;
            put(cx, cy, "oak");
            for (const [dx, dy] of NEIGHBORS) put(cx + dx, cy + dy, "oak");
            const blocked = create({ type: "chop", target: { area, x: cx, y: cy }, owner: worker.id });
            t.check("blocked_fails", blocked.state === "failed" && typeof blocked.reason === "string" && blocked.reason.length > 0 && Jobs.of(worker.id) === null,
                `${jobText(blocked)}; of(worker) ${Jobs.of(worker.id) ? "still set" : "null"}`);

            // stalled_fails: the helper is boxed in by oaks; walking out never progresses, so after two stalls or unitBlocked checks the job fails.
            const hx = helper.x, hy = helper.y;
            for (const [dx, dy] of NEIGHBORS) put(hx + dx, hy + dy, "oak");
            const walk = create({ type: "move", target: { area, x: mid + 5, y: mid + 5 }, owner: helper.id });
            const s0 = ticks();
            await waitJob(walk, 15000);
            const stallTicks = ticks() - s0;
            t.check("stalled_fails", walk.state === "failed" && /reach/.test(walk.reason || "") && helper.x === hx && helper.y === hy && (stallTicks >= 2 * STALL_TICKS || (walk.blocked >= BLOCKS_TO_FAIL && stallTicks >= 2)),
                `${jobText(walk)} after ${stallTicks} ticks (blocked ${walk.blocked}/${BLOCKS_TO_FAIL}, stall limit ${2 * STALL_TICKS}); helper still at (${helper.x},${helper.y})`);

            // saved: jobs round-trip through JsonEx and are part of the save contents.
            const json = JsonEx.stringify(W.state);
            const copy = JsonEx.parse(json);
            const savedChop = copy.jobs && copy.jobs.list.find(j => j.id === chop.id);
            const contents = DataManager.makeSaveContents();
            t.check("saved", !!savedChop && savedChop.type === "chop" && savedChop.state === "done" && JSON.stringify(copy.jobs) === JSON.stringify(W.state.jobs) && contents.ufWorld && contents.ufWorld.jobs === W.state.jobs,
                `${W.state.jobs.list.length} jobs in state (nextId ${W.state.jobs.nextId}); chop #${chop.id} after round-trip: ${savedChop ? `${savedChop.type} ${savedChop.state}` : "missing"}; identical json ${JSON.stringify(copy.jobs) === JSON.stringify(W.state.jobs)}; in save contents ${!!(contents.ufWorld && contents.ufWorld.jobs)}`);

            // Clean up: units, items, objects, listeners, speed, zoom.
            if (Col && Col.setEnabled && colonistsWere !== null) Col.setEnabled(colonistsWere);
            for (const k of Object.keys(listeners)) UF.Events.off(`jobs:${k}`, listeners[k]);
            delete handlers.test_noop;
            for (const u of W.units()) if (!unitsBefore.has(u.id)) W.removeUnit(u.id);
            for (const id of Object.keys(I.state().byId)) if (!itemsBefore.has(id)) I.remove(Number(id));
            for (const p of placed.reverse()) O.set(p.x, p.y, p.was);
            if (UF.Time) UF.Time.setLevel(0);
            if (UF.Camera) UF.Camera.setLevel(1);
            $gamePlayer.locate(mid, mid);
            await t.waitFrames(5);
            const errs = t.errorsSoFar().slice(errors0);
            t.check("no_errors", errs.length === 0, errs.length ? `${errs.length} error(s), first: ${errs[0]}` : "none during jobs checks");
        });
    }
})();
