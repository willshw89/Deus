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

    const catalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
    const copyArea = a => ({ x: a.x, y: a.y });
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
    // Cells: what a unit can stand on, in the area on screen or any other

    function isWaterIn(area, x, y) {
        const W = World();
        if (W && sameArea(area, W.currentArea()) && window.$gameMap && $dataMap) {
            return Tilemap.isWaterTile($gameMap.tileId(x, y, 0));
        }
        const G = window.UF && UF.WorldGen;
        if (G && G.cellInfoLocal) {
            const c = G.cellInfoLocal(area.x, area.y, x, y);
            return !!(c && c.water);
        }
        return false;
    }

    // Another unit (or a solid non-unit event on screen) already stands there.
    function occupiedIn(area, x, y, unitId) {
        const W = World();
        for (const u of W.unitsInArea(area.x, area.y)) if (u.id !== unitId && u.x === x && u.y === y) return true;
        if (sameArea(area, W.currentArea()) && window.$gameMap) {
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
        if (!W || !W.state || !W.inWorld(area.x, area.y)) return false;
        const size = W.state.size;
        if (x < 0 || y < 0 || x >= size || y >= size) return false;
        if (sameArea(area, W.currentArea()) && window.$gameMap && $dataMap) {
            // Game_Map.isPassable includes UF_Objects' object blocking; a cell blocked in every direction can't be stood on.
            if (![2, 4, 6, 8].some(d => $gameMap.isPassable(x, y, d))) return false;
            if (Tilemap.isWaterTile($gameMap.tileId(x, y, 0))) return false;
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

    /**
     * The stand cell for a target: the target cell itself when it's standable (unless adjacentOnly), else the
     * standable 4-neighbor nearest to the unit. Null when there is none (the target is walled in).
     */
    function standFor(target, unit, adjacentOnly) {
        const area = target.area;
        const onIt = unit.x === target.x && unit.y === target.y && sameArea(unit.area, area);
        if (!adjacentOnly && (onIt || standableIn(area, target.x, target.y, unit.id))) return { area: copyArea(area), x: target.x, y: target.y };
        let best = null, bestDist = Infinity;
        for (const [dx, dy] of NEIGHBORS) {
            const x = target.x + dx, y = target.y + dy;
            const here = sameArea(unit.area, area) && unit.x === x && unit.y === y;
            if (!here && !standableIn(area, x, y, unit.id)) continue;
            const dist = unitDistance(unit, area, x, y);
            if (dist < bestDist) {
                bestDist = dist;
                best = { area: copyArea(area), x, y };
            }
        }
        return best;
    }
    const atCell = (unit, cell) => !!cell && sameArea(unit.area, cell.area) && unit.x === cell.x && unit.y === cell.y;

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
        const t = O && job.target ? O.atIn(job.target.area, job.target.x, job.target.y) : null;
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

    // Object actions (chop, gather, pick, quarry, mine): the object on the target cell must have that action.
    const objectAction = (type, verb) => define(type, {
        verb,
        plan(job, unit) {
            const O = Objects();
            const t = O ? O.atIn(job.target.area, job.target.x, job.target.y) : null;
            if (!t || !t.actions || !t.actions[type]) return { ok: false, reason: `nothing to ${type} there` };
            job.params.objectName = t.name; // kept for the label after the object is gone
            const stand = standFor(job.target, unit, false);
            return stand ? { ok: true, stand } : { ok: false, reason: "can't reach it" };
        },
        work(job) {
            const O = Objects();
            const t = O ? O.atIn(job.target.area, job.target.x, job.target.y) : null;
            return t && t.actions && t.actions[type] ? t.actions[type].work | 0 : 0;
        },
        apply(job, unit) {
            const O = Objects();
            const r = O ? O.applyIn(job.target.area, job.target.x, job.target.y, type, unit) : null;
            job.result = r ? { from: r.from, to: r.to, yields: r.yields } : null;
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
        work: 0,
        apply() {},
        describe: () => verb
    });
    define("move", moveHandler("Walking"));
    define("wander", moveHandler("Wandering"));

    // Carrying: phase 0 = stand on the item's cell and pick it up; phase 1 (haul only) = carry it to `to` and put it down.
    function pickPhasePlan(job, unit) {
        const I = Items();
        const it = I ? I.get(job.params.itemId) : null;
        if (!it) return { ok: false, reason: "the item is gone" };
        if (it.holder === unit.id) return { ok: true, stand: null }; // already carried (a resumed job)
        if (!it.area) return { ok: false, reason: "someone else carries it" };
        job.target = { area: copyArea(it.area), x: it.x, y: it.y };
        const stand = standFor(job.target, unit, false);
        return stand ? { ok: true, stand } : { ok: false, reason: "can't reach it" };
    }
    function pickUpNow(job, unit) {
        const I = Items();
        const it = I ? I.get(job.params.itemId) : null;
        if (!it) return false;
        if (it.holder === unit.id) return true;
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
            job.target = { area: copyArea(to.area), x: to.x | 0, y: to.y | 0 };
            const stand = standFor(job.target, unit, false);
            return stand ? { ok: true, stand } : { ok: false, reason: "can't reach the place" };
        },
        work: 0,
        apply(job, unit) {
            if ((job.phase | 0) === 0) {
                if (!pickUpNow(job, unit)) throw new Error("the item is gone");
                return "continue";
            }
            const I = Items(), to = job.params.to;
            const placed = I.putDown(job.params.itemId, to.area, to.x | 0, to.y | 0);
            job.result = placed ? { itemId: placed.id } : null;
        },
        cancel(job, unit) {
            // What was picked up and not delivered is put down where the carrier stands, so nothing vanishes.
            const I = Items();
            const it = I ? I.get(job.params.itemId) : null;
            if (it && it.holder === unit.id && (job.phase | 0) > 0) I.putDown(it.id, unit.area, unit.x, unit.y);
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
            const missing = Object.keys(needs).filter(id => (I ? I.count({ area: job.target.area, x: job.target.x, y: job.target.y }, id) : 0) < (needs[id] | 0));
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
                for (const it of I.atIn(job.target.area, job.target.x, job.target.y)) {
                    if (left <= 0) break;
                    if (it.type !== id) continue;
                    left -= I.consume(it.id, left);
                }
            }
            O.setIn(job.target.area, job.target.x, job.target.y, t.id);
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
            const short = Object.keys(inputs).find(id => !I || I.count(unit.id, id) < (inputs[id] | 0));
            if (short) return { ok: false, reason: `needs ${lower(itemName(short))}` };
            if (!r.at) {
                job.target = { area: copyArea(unit.area), x: unit.x, y: unit.y };
                return { ok: true, stand: null }; // made where the crafter stands
            }
            const found = O ? O.findIn(unit.area, { near: { x: unit.x, y: unit.y }, radius: CRAFT_SEARCH, tags: [r.at], limit: 4 }) : [];
            for (const f of found) {
                const target = { area: copyArea(unit.area), x: f.x, y: f.y };
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
            for (const id of Object.keys(r.inputs || {})) I.consumeFrom(unit.id, id, r.inputs[id] | 0);
            const made = [];
            for (const id of Object.keys(r.outputs || {})) for (const it of I.give(id, r.outputs[id] | 0, unit.id)) made.push(it.id);
            job.result = { items: made };
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
            if (!sameArea(prey.area, unit.area)) return { ok: false, reason: "the prey left the area" };
            if (chebyshev(prey.x, prey.y, unit.x, unit.y) > HUNT_MAX_DIST) return { ok: false, reason: "the prey got away" };
            job.target = { area: copyArea(prey.area), x: prey.x, y: prey.y };
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
            if (I) for (const id of Object.keys(yields)) for (const it of I.drop(prey.area, prey.x, prey.y, id, yields[id] | 0)) dropped.push(it.id);
            const where = { area: copyArea(prey.area), x: prey.x, y: prey.y };
            W.removeUnit(prey.id);
            job.result = { prey: prey.id, species: prey.data && prey.data.species, at: where, yields, items: dropped };
            emit("jobs:kill", job, prey, unit);
        },
        describe: job => `Hunting ${withArticle(job.params.preyName || (World().unit(job.params.unitId) || {}).name || "prey")}`
    });

    define("drink", {
        verb: "Drinking",
        plan(job, unit) {
            if (!isWaterIn(job.target.area, job.target.x, job.target.y)) return { ok: false, reason: "no water there" };
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
            if (!sameArea(it.area, job.target.area) || it.x !== job.target.x || it.y !== job.target.y) return { ok: false, reason: "the food moved" };
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
            if (!sameArea(other.area, unit.area) || chebyshev(other.x, other.y, unit.x, unit.y) > HUNT_MAX_DIST) return { ok: false, reason: "too far away" };
            job.target = { area: copyArea(other.area), x: other.x, y: other.y };
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
            if (!sameArea(partner.area, unit.area) || chebyshev(partner.x, partner.y, unit.x, unit.y) > HUNT_MAX_DIST) return { ok: false, reason: "too far away" };
            job.target = { area: copyArea(partner.area), x: partner.x, y: partner.y };
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
        if (target && !target.area) target = { area: W.currentArea() || copyArea(W.state.startArea), x: target.x | 0, y: target.y | 0 };
        if (!target && spec.owner) {
            const u = W.unit(spec.owner);
            if (u) target = { area: copyArea(u.area), x: u.x, y: u.y };
        }
        if (!target) return null;
        const job = {
            id: st.nextId++,
            type: spec.type,
            target: { area: copyArea(target.area), x: target.x | 0, y: target.y | 0 },
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
            if (unit.goal && job.stand && atCell({ area: unit.goal.area, x: unit.goal.x, y: unit.goal.y }, job.stand)) W.stopUnit(unit.id);
            stopWorking(unit);
            if (h && typeof h.cancel === "function") {
                try { h.cancel(job, unit); } catch (e) { console.error(e); }
            }
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
        job.stand = r.stand ? { area: copyArea(r.stand.area || job.target.area), x: r.stand.x | 0, y: r.stand.y | 0 } : null;
        job.planned = true;
        job.plannedAt = now();
        return true;
    }

    function assign(jobId, unitId) {
        const job = byId(jobId);
        const W = World();
        const unit = W ? W.unit(unitId) : null;
        if (!job || !unit || isFinished(job) || !handlers[job.type]) return null;
        if (job.assigned === unitId && isActive(job)) return job;
        const current = of(unitId);
        if (current && current !== job) fail(current, "replaced");
        if (job.assigned && job.assigned !== unitId) {
            const previous = W.unit(job.assigned);
            if (previous) stopWorking(previous);
        }
        job.assigned = unitId;
        job.state = "travel";
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
        if (!unit) return null;
        const candidates = open().filter(j => sameArea(j.target.area, unit.area) && matches(j, filter));
        candidates.sort((a, b) => (b.priority - a.priority) || (unitDistance(unit, a.target.area, a.target.x, a.target.y) - unitDistance(unit, b.target.area, b.target.x, b.target.y)) || (a.id - b.id));
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
        const I = Items();
        const eq = unit.data && unit.data.equipment;
        const it = I && eq && eq.tool ? I.get(eq.tool) : null;
        const t = it && it.holder === unit.id ? I.type(it.type) : null;
        if (!t || !t.tool) return 1;
        if (typeof t.tool[job.type] === "number" && t.tool[job.type] > 0) return t.tool[job.type];
        if (job.type === "craft") {
            // A recipe's "tool" is a tag that helps (never required): a knife for sewing.
            const r = recipeOf(job.params.recipeId);
            if (r && r.tool && Array.isArray(t.tags) && t.tags.includes(r.tool)) return 1.5;
        }
        return 1;
    }
    const rateOf = (unit, job) => ((unit.data && unit.data.workRate > 0 ? unit.data.workRate : 1) * toolMultiplier(unit, job));
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
            const dx = job.target.x - unit.x, dy = job.target.y - unit.y;
            if ((dx || dy) && sameArea(job.target.area, unit.area)) ev.setDirection(facingTo(dx, dy));
            ev.setStepAnime(true);
            // V92 (user 2026-09-19): no status text over heads; the job shows in the profile, not as a bark.
        }
        job.barked = true;
    }

    function finish(job, unit) {
        const h = handlers[job.type];
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
        job.state = "done";
        job.finished = now();
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
            if (!unit.goal || !sameArea(unit.goal.area, stand.area) || unit.goal.x !== stand.x || unit.goal.y !== stand.y) {
                W.sendUnit(unit.id, { area: stand.area, x: stand.x, y: stand.y });
            }
            // No progress toward the stand for a while counts as a block (an enclosed unit never reports one).
            const key = `${unit.area.x},${unit.area.y}:${unit.x},${unit.y}`;
            if (!job.stall || job.stall.key !== key) job.stall = { key, since: now() };
            else if (now() - job.stall.since >= STALL_TICKS) {
                job.stall = null;
                noteBlocked(job, unit);
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
        update
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
            const area = W.currentArea();
            if (!area || !O || !I) {
                t.check("world_present", false, `area ${JSON.stringify(area)}, UF.Objects ${!!O}, UF.Items ${!!I}`);
                return;
            }
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
                data: { kind: "creature", species: "hare", tags: ["grazer"], faction: null } });
            const hareAt = { x: hare.x, y: hare.y };
            const hunt = create({ type: "hunt", target: { area, x: hare.x, y: hare.y }, params: { unitId: hare.id }, owner: worker.id });
            const huntText = describe(hunt);
            let huntStand = null;
            await t.waitUntil(() => { if (hunt.state === "work" && !huntStand) huntStand = { x: worker.x, y: worker.y }; return isFinished(hunt); }, 10000, "the hunt to finish").catch(() => {});
            const hareGone = !W.unit(hare.id) && !W.eventOf(hare.id);
            t.check("hunt", hunt.state === "done" && hareGone && !!huntStand && manhattan(huntStand.x, huntStand.y, hareAt.x, hareAt.y) === 1 && itemsOn(hareAt.x, hareAt.y, "meat_raw") === 1 && itemsOn(hareAt.x, hareAt.y, "hide") === 1 && events.kill === 1,
                `${jobText(hunt)}; hunter worked from ${huntStand ? `(${huntStand.x},${huntStand.y})` : "nowhere"} next to the hare at (${hareAt.x},${hareAt.y}); hare unit gone ${hareGone}; on its cell: ${itemsOn(hareAt.x, hareAt.y, "meat_raw")} raw meat, ${itemsOn(hareAt.x, hareAt.y, "hide")} hide; jobs:kill fired ${events.kill}x`);

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
            t.check("drink_and_eat", drink.state === "done" && worker.data.needs.thirst === 15 && manhattan(drankFrom.x, drankFrom.y, wx, wy) === 1 && eat.state === "done" && worker.data.needs.hunger === 35 && I.count(worker.id, "berries") === 1,
                `${jobText(drink)} from (${drankFrom.x},${drankFrom.y}) next to water at (${wx},${wy}): thirst 80 -> ${worker.data.needs.thirst}; ${jobText(eat)}: hunger 60 -> ${worker.data.needs.hunger}, berries left ${I.count(worker.id, "berries")}`);
            W.setTile(area.x, area.y, wx, wy, 0, tileBefore);

            // blocked_fails: an oak walled in by four oaks can't be reached; the plan fails with a reason.
            const cx = mid - 8, cy = mid + 12;
            put(cx, cy, "oak");
            for (const [dx, dy] of NEIGHBORS) put(cx + dx, cy + dy, "oak");
            const blocked = create({ type: "chop", target: { area, x: cx, y: cy }, owner: worker.id });
            t.check("blocked_fails", blocked.state === "failed" && typeof blocked.reason === "string" && blocked.reason.length > 0 && Jobs.of(worker.id) === null,
                `${jobText(blocked)}; of(worker) ${Jobs.of(worker.id) ? "still set" : "null"}`);

            // stalled_fails: the helper is boxed in by oaks; walking out never progresses, so after two stalls the job fails.
            const hx = helper.x, hy = helper.y;
            for (const [dx, dy] of NEIGHBORS) put(hx + dx, hy + dy, "oak");
            const walk = create({ type: "move", target: { area, x: mid + 5, y: mid + 5 }, owner: helper.id });
            const s0 = ticks();
            await waitJob(walk, 15000);
            const stallTicks = ticks() - s0;
            t.check("stalled_fails", walk.state === "failed" && /reach/.test(walk.reason || "") && helper.x === hx && helper.y === hy && stallTicks >= 2 * STALL_TICKS,
                `${jobText(walk)} after ${stallTicks} ticks (2 stalls = ${2 * STALL_TICKS}); helper still at (${helper.x},${helper.y})`);

            // saved: jobs round-trip through JsonEx and are part of the save contents.
            const json = JsonEx.stringify(W.state);
            const copy = JsonEx.parse(json);
            const savedChop = copy.jobs && copy.jobs.list.find(j => j.id === chop.id);
            const contents = DataManager.makeSaveContents();
            t.check("saved", !!savedChop && savedChop.type === "chop" && savedChop.state === "done" && JSON.stringify(copy.jobs) === JSON.stringify(W.state.jobs) && contents.ufWorld && contents.ufWorld.jobs === W.state.jobs,
                `${W.state.jobs.list.length} jobs in state (nextId ${W.state.jobs.nextId}); chop #${chop.id} after round-trip: ${savedChop ? `${savedChop.type} ${savedChop.state}` : "missing"}; identical json ${JSON.stringify(copy.jobs) === JSON.stringify(W.state.jobs)}; in save contents ${!!(contents.ufWorld && contents.ufWorld.jobs)}`);

            // Clean up: units, items, objects, listeners, speed, zoom.
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
