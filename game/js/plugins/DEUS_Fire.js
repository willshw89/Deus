//=============================================================================
// DEUS_Fire.js - Fire as a cell state that spreads, burns objects out, hurts units and is put out with water
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Fire] Cellular fire propagation, material flammability, burn damage, firefighter water bucket jobs, and burnout.
 * @author UF project
 * @base DEUS_World
 * @orderAfter DEUS_Objects
 * @orderAfter DEUS_Items
 * @orderAfter DEUS_Jobs
 * @orderAfter DEUS_Interact
 *
 * @help
 * Fire is a state of a cell (VISION V21, V25): UF.World.state.fire.burning
 * holds one record per burning cell. Once per simulation second (or stepInterval
 * map updates, 60 = one second at x1) each burning cell rolls, seeded by the world
 * seed, the step and the cell, to ignite each of its 4 neighbours with the neighbour's
 * "spread" chance, and spends one unit of fuel; when the fuel is gone the object becomes
 * what the catalog rule says (a tree a stump, a wooden wall rubble, grass nothing on
 * ash ground, a bed or stockpile nothing with the items on it destroyed).
 * Rules live in data/UF_WorldCatalog.json "fire" (flammability per object
 * tag or id; stone never burns). Fire sources (the catalog's "source" rule:
 * campfires, hearths) never burn themselves. An open fire (a campfire in the
 * open) lets each flammable neighbour catch with a small seeded chance each
 * second. A constructed hearth (id "hearth" or "kitchen_hearth", a "hearth"
 * tag, `contained: true`, or a cell marked contained by setContained, as a
 * finished shelter's hearth is) is a contained source: in normal use it never
 * escapes; only a damaged, overturned or uncontrolled hearth (setSourceState)
 * may (DEUS-TSK-FABLE-16). Accidental starts are off unless fire.startChance > 0.
 *
 * Every fire carries its ignition provenance (DEUS-TSK-FABLE-16): fireId,
 * startedAt (beat), sourceType ("hearth", "open_fire", "accident", "direct",
 * "legacy"), sourceObjectId, sourceCell, firstFuelIgnited, spreadParents (the
 * cells it spread through to get here) and spreadSteps. provenanceAt(area, x, y)
 * reads it; a unit burned to death carries it to UF.DeathForensics.
 *
 * Units never step into a burning cell (alias of isMapPassable for unit
 * events); a unit standing in one loses hit points (UF.Combat's damage
 * popup and death), shows its sheet's hurt frames when its sidecar has them
 * (UF.Anim; no code-made flinch or flash, VISION V58), gets a thought
 * (UF.Colonists.addThought), drops its job and walks out. Fires within the player's camp radius get open "douse" jobs
 * of the player's faction: fetch water beside a water cell, then 3 seconds of
 * work beside the fire. Right-click: "Set on fire" on flammable cells, "Put
 * out the fire" on burning ones (a runtime wrap of UF.Interact).
 *
 * Flames: a pooled code-drawn sprite (UF_GenFlame, 3 frames) per burning
 * cell in view, drawn just above the objects of its row.
 *
 * API, state, events, checks: docs/systems/UF_Fire.md
 *
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const TILE = 48;
    const EVENT_BASE = 1000;
    const NEIGHBORS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // 4-way (WORLD_ARCHITECTURE section 1.6)
    const NEIGHBORS8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    const SALT = { spread: 0xf1e01, escape: 0xf1e02, start: 0xf1e03, startCell: 0xf1e04, damage: 0xf1e05 };
    const NO_WATER_RETRY = 10;   // steps before a camp fire without water nearby is looked at again
    const RETARGET_RADIUS = 8;   // cells a douse worker looks for another fire when its own went out
    const FLEE_RADIUS = 4;       // cells a unit in a burning cell looks for a safe cell
    const VIEW_MARGIN = 2;       // cells beyond the view that still get flame sprites (they lean up-left into view)
    const HURT_FRAMES = 10;      // map updates a burned unit shows its sheet's hurt frames (UF_Anim's own hurt length)
    // Containment and provenance (DEUS-TSK-FABLE-16)
    const HEARTH_IDS = ["hearth", "kitchen_hearth"];      // constructed hearths: contained sources
    const SOURCE_STATES = ["normal", "damaged", "overturned", "uncontrolled"];
    const UNCONTROLLED_ESCAPE = 0.002;                    // per beat per flammable 4-neighbour, a hearth out of control
    const OPEN_ESCAPE = 0.0005;                           // per beat per flammable 4-neighbour, an open fire
    const PARENTS_KEPT = 128;                             // spreadParents kept per burning cell (spreadSteps counts every hop)
    const FIRE_HISTORY = 64;                              // finished fires whose summary is kept for forensics
    const PROVENANCE_VERSION = 2;                         // UF.World.state.fire.version once fires carry provenance

    const catalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const zOf = ref => ref && ref.z !== undefined ? ref.z : (ref && ref.area && ref.area.z !== undefined ? ref.area.z : 0);
    const levelArea = ref => { const a = ref && (ref.area || ref); return a ? { x: a.x, y: a.y, z: zOf(ref) } : null; };
    const hasLevels = W => !!W && typeof W.viewLevel === "function" && typeof W.levelOfMapId === "function" && typeof W.isLevel === "function";
    // Capability comes from the documented World seam, never function arity.
    const acceptsArea = a => {
        const W = World(), z = zOf(a);
        return !!a && !!W && Number.isInteger(z) && z >= -2 && z <= 2 &&
            (z === 0 || (hasLevels(W) && W.isLevel(z))) && W.inWorld(a.x, a.y, z);
    };
    const viewArea = () => { const W = World(); const a = W ? (hasLevels(W) ? W.viewLevel() : W.currentArea()) : null; return acceptsArea(a) ? a : null; };
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y && zOf(a) === zOf(b);
    const copyArea = a => zOf(a) === 0 ? { x: a.x, y: a.y } : { x: a.x, y: a.y, z: zOf(a) };
    const cellRef = (area, x, y) => ({ area: { x: area.x, y: area.y }, x, y, z: zOf(area) });
    const areaKey = a => `${a.x},${a.y}${zOf(a) === 0 ? "" : `,${zOf(a)}`}`;
    const keyOf = (area, x, y) => `${areaKey(area)}:${x},${y}`;
    const num = (v, fallback) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
    const errors = []; // errors caught inside the beat (the no_errors check reads them)

    function hash01(...parts) {
        const W = World();
        return (W.hash32(...parts) >>> 0) / 4294967296;
    }

    //-------------------------------------------------------------------------
    // Configuration: catalog "fire" (numbers fall back to defaults; rules never do)

    let confCache = null;
    function conf() {
        const cat = catalog();
        const src = cat && cat.fire ? cat.fire : null;
        if (confCache && confCache.src === src && confCache.objects === (cat && cat.objects)) return confCache;
        const c = src || {};
        const d = c.douse || {};
        const th = c.thought || {};
        const dmg = Array.isArray(c.damage) && c.damage.length === 2 ? [Math.max(0, c.damage[0] | 0), Math.max(0, c.damage[1] | 0)] : [1, 3];
        confCache = {
            src, objects: cat && cat.objects,
            beatFrames: Math.max(1, num(c.beatFrames, 60) | 0),
            startChance: Math.max(0, num(c.startChance, 0)),
            damage: [Math.min(dmg[0], dmg[1]), Math.max(dmg[0], dmg[1])],
            thought: { text: typeof th.text === "string" ? th.text : "Was burned by fire.", strength: num(th.strength, -8) | 0, everyBeats: Math.max(1, num(th.everyBeats, 10) | 0) },
            douse: {
                campRadius: Math.max(0, num(d.campRadius, 20)), waterRadius: Math.max(1, num(d.waterRadius, 24) | 0),
                fillBeats: Math.max(0, num(d.fillBeats, 1)), beats: Math.max(0, num(d.beats, 3)),
                priority: num(d.priority, 5) | 0, maxOpen: Math.max(0, num(d.maxOpen, 6) | 0), wetBeats: Math.max(0, num(d.wetBeats, 30) | 0)
            },
            rules: Array.isArray(c.rules) ? c.rules : [],
            byType: new Map(),
            sourceTypes: null
        };
        return confCache;
    }
    const beatFrames = () => {
        return (conf() && conf().beatFrames) || 60;
    };

    /** The rule for an object type (catalog entry with `id`/`tags`), or null: first rule whose ids hold the id or whose tags are all on it. */
    function ruleForType(type) {
        if (!type) return null;
        const c = conf();
        const k = type.typeId || type.id;
        if (c.byType.has(k)) return c.byType.get(k);
        const tags = type.tags || [];
        let found = null;
        for (const r of c.rules) {
            if (!r) continue;
            if (Array.isArray(r.ids) && r.ids.includes(type.id)) { found = r; break; }
            if (Array.isArray(r.tags) && r.tags.length && r.tags.every(tag => tags.includes(tag))) { found = r; break; }
        }
        c.byType.set(k, found);
        return found;
    }
    const burns = r => !!r && !r.never && !r.source && num(r.burn, 0) > 0;
    function sourceTypes() {
        const c = conf();
        if (c.sourceTypes) return c.sourceTypes;
        const set = new Set();
        const O = Objects();
        if (O) for (const t of O.types()) { const r = ruleForType(t); if (r && r.source) set.add(t.typeId || t.id); }
        c.sourceTypes = set;
        return set;
    }

    //-------------------------------------------------------------------------
    // Containment (DEUS-TSK-FABLE-16): a constructed hearth is a contained fire source, an open fire is not.

    /** A constructed hearth type: id "hearth" or "kitchen_hearth", a "hearth" tag, or `contained: true` in the catalog. */
    function isHearthType(type) {
        return !!type && (HEARTH_IDS.includes(type.id) || (Array.isArray(type.tags) && type.tags.includes("hearth")) || type.contained === true);
    }
    // The saved record of one source cell, { contained, state, by }, set by setContained / setSourceState; or null.
    function sourceRecord(f, area, x, y) {
        return f && f.sources ? f.sources[keyOf(area, x, y)] || null : null;
    }
    /**
     * How the fire source on a cell is held, or null when the cell holds none:
     * { contained, state, escapeChance, sourceType, objectId, by }.
     * - Contained (a hearth type, or a cell marked contained, e.g. a legacy campfire inside a finished shelter):
     *   state "normal" never escapes (0); "damaged", "overturned" or "uncontrolled" escapes at the type's
     *   escapeChance, else the rule's uncontrolledEscapeChance, else 0.002 per beat per flammable 4-neighbour.
     * - Open fire (a campfire outdoors): the rule's escapeChance (0.0005 when the rule names none).
     * The state comes from the cell record (setSourceState) or else the type's damaged/overturned/uncontrolled flag.
     */
    function sourceInfoAt(area, x, y, typeArg) {
        const O = Objects();
        if (!acceptsArea(area)) return null;
        const type = typeArg || (O ? O.atIn(area, x, y) : null);
        const rule = ruleForType(type);
        if (!type || !rule || !rule.source) return null;
        const rec = sourceRecord(fireState(), area, x, y);
        const contained = isHearthType(type) || !!(rec && rec.contained);
        const typeState = type.uncontrolled ? "uncontrolled" : type.overturned ? "overturned" : type.damaged ? "damaged" : "normal";
        const state = rec && SOURCE_STATES.includes(rec.state) && rec.state !== "normal" ? rec.state : typeState;
        const chance = contained
            ? (state === "normal" ? 0 : num(type.escapeChance, num(rule.uncontrolledEscapeChance, UNCONTROLLED_ESCAPE)))
            : num(rule.escapeChance, OPEN_ESCAPE);
        return { contained, state, escapeChance: Math.max(0, chance), sourceType: contained ? "hearth" : "open_fire", objectId: type.id, by: rec && rec.by ? rec.by : null };
    }

    //-------------------------------------------------------------------------
    // State: UF.World.state.fire = { version: 2, beat, nextFireId, burning: { cellKey: { since, fuel, obj, fireId, parent,
    // provenance } }, fires: { fireId: summary }, sources: { cellKey: { contained, state, by } }, wet: { cellKey: untilBeat } }

    function fireState() {
        const W = World();
        if (!W || !W.state) return null;
        let f = W.state.fire;
        if (!f || typeof f !== "object" || !f.burning || typeof f.burning !== "object") {
            f = W.state.fire = { version: PROVENANCE_VERSION, beat: 0, nextFireId: 1, burning: {}, fires: {}, sources: {}, wet: {} };
        }
        if (!f.wet || typeof f.wet !== "object") f.wet = {};
        if (typeof f.beat !== "number") f.beat = 0;
        if ((f.version | 0) < PROVENANCE_VERSION || !f.fires || typeof f.fires !== "object" || !f.sources || typeof f.sources !== "object" || !Number.isInteger(f.nextFireId)) migrateProvenance(f);
        return f;
    }
    // A save from before provenance (version 1): the cells burning at load become one fire of sourceType "legacy", so
    // every burning record has a fireId and provenanceAt says "legacy" rather than nothing.
    function migrateProvenance(f) {
        if (!f.fires || typeof f.fires !== "object") f.fires = {};
        if (!f.sources || typeof f.sources !== "object") f.sources = {};
        if (!Number.isInteger(f.nextFireId) || f.nextFireId < 1) f.nextFireId = 1;
        let legacy = null;
        for (const key of Object.keys(f.burning)) {
            const rec = f.burning[key];
            if (!rec || (typeof rec.fireId === "string" && rec.provenance)) continue;
            const p = parseKey(key);
            if (!legacy) {
                const fireId = `fire-${f.nextFireId++}`;
                legacy = f.fires[fireId] = { fireId, startedAt: typeof rec.since === "number" ? rec.since : f.beat, sourceType: "legacy", sourceObjectId: null,
                    sourceCell: p ? { x: p.x, y: p.y, z: p.z } : null, firstFuelIgnited: rec.obj || null, cause: "legacy", area: p ? copyArea(p.area) : null,
                    cells: 0, burning: 0, out: null, casualties: [] };
            }
            rec.fireId = legacy.fireId;
            rec.parent = null;
            rec.provenance = { fireId: legacy.fireId, startedAt: legacy.startedAt, sourceType: "legacy", sourceObjectId: null, sourceCell: legacy.sourceCell,
                firstFuelIgnited: rec.obj || null, spreadParents: [], spreadSteps: 0, cause: "legacy" };
            legacy.cells++;
            legacy.burning++;
        }
        f.version = PROVENANCE_VERSION;
    }

    const parsedKeys = new Map();
    function parseKey(key) {
        let p = parsedKeys.get(key);
        if (p) return p;
        const m = /^(-?\d+),(-?\d+)(?:,(-?\d+))?:(-?\d+),(-?\d+)$/.exec(key);
        if (!m) return null;
        const z = m[3] === undefined ? 0 : Number(m[3]);
        if (z < -2 || z > 2) return null;
        p = { area: copyArea({ x: Number(m[1]), y: Number(m[2]), z }), x: Number(m[4]), y: Number(m[5]), z };
        if (parsedKeys.size > 50000) parsedKeys.clear();
        parsedKeys.set(key, p);
        return p;
    }

    // Cache: area key -> Set of cell indices (y * size + x) that burn. Rebuilt whenever state.fire is another object (new game, load).
    const idx = { src: null, size: 0, byArea: new Map(), total: 0, stamp: 0 };
    function index() {
        const W = World();
        const f = W && W.state ? W.state.fire || null : null;
        if (idx.src !== f) {
            idx.src = f;
            idx.byArea.clear();
            idx.total = 0;
            idx.size = W && W.state ? W.state.size : 0;
            idx.stamp++;
            if (f && f.burning) for (const key of Object.keys(f.burning)) indexAdd(key);
        }
        return idx;
    }
    function indexAdd(key) {
        const p = parseKey(key);
        if (!p || !acceptsArea(p.area)) return;
        const ak = areaKey(p.area);
        let set = idx.byArea.get(ak);
        if (!set) idx.byArea.set(ak, set = new Set());
        const i = p.y * idx.size + p.x;
        if (!set.has(i)) { set.add(i); idx.total++; idx.stamp++; }
    }
    function indexRemove(key) {
        const p = parseKey(key);
        if (!p) return;
        const set = idx.byArea.get(areaKey(p.area));
        const i = p.y * idx.size + p.x;
        if (set && set.delete(i)) { idx.total--; idx.stamp++; }
    }
    function burningIn(area, x, y) {
        if (!acceptsArea(area)) return false;
        const I = index();
        if (!I.total || !area) return false;
        const set = I.byArea.get(areaKey(area));
        return !!set && set.has(y * I.size + x);
    }

    const inBounds = (x, y) => {
        const W = World();
        const size = W && W.state ? W.state.size : 0;
        return x >= 0 && y >= 0 && x < size && y < size;
    };
    const wetUntil = (f, key) => (f.wet && typeof f.wet[key] === "number" ? f.wet[key] : -1);

    //-------------------------------------------------------------------------
    // Igniting, putting out, burning out

    // The calendar moment a fire started, for the forensic record (the beat is what the simulation keys on).
    function calendarNow() {
        const T = window.$ufTime;
        const W = World();
        const tick = W && W.state && Number.isFinite(W.state.ticks) ? W.state.ticks : 0;
        if (T && Number.isFinite(T.day) && Number.isFinite(T.hour)) return { tick, day: T.day, time: `${String(T.hour).padStart(2, "0")}:${String(T.minute || 0).padStart(2, "0")}` };
        const min = Math.floor((tick % 14400) / 10);
        return { tick, day: Math.floor(tick / 14400) + 1, time: `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}` };
    }
    // The provenance sourceType of a fire nothing spread to and no source let escape: what lit it.
    const causeType = cause => (cause === "accident" ? "accident" : "direct");
    /**
     * The provenance of a cell about to burn (DEUS-TSK-FABLE-16). Spread from a burning cell (o.parent = { key, rec }):
     * the parent's fire, its origin, and the parent's key appended to spreadParents. Otherwise a new fire: an escape
     * from a source (o.source = { type: "hearth" | "open_fire", objectId, cell }), an accident, or a direct lighting
     * (the player, a burning unit, a script; o.sourceType / o.sourceObjectId / o.sourceCell may name it).
     */
    function provenanceFor(f, area, x, y, type, o) {
        const parent = o.parent && o.parent.rec && o.parent.rec.provenance ? o.parent : null;
        if (parent) {
            const pp = parent.rec.provenance;
            let parents = (Array.isArray(pp.spreadParents) ? pp.spreadParents : []).concat([parent.key]);
            if (parents.length > PARENTS_KEPT) parents = parents.slice(parents.length - PARENTS_KEPT);
            return { fireId: pp.fireId, startedAt: pp.startedAt, startedOn: pp.startedOn || null, sourceType: pp.sourceType, sourceObjectId: pp.sourceObjectId, sourceCell: pp.sourceCell,
                firstFuelIgnited: pp.firstFuelIgnited, spreadParents: parents, spreadSteps: (pp.spreadSteps | 0) + 1, cause: pp.cause };
        }
        const src = o.source || null;
        const fireId = `fire-${f.nextFireId++}`;
        const cell = src && src.cell ? { x: src.cell.x, y: src.cell.y, z: src.cell.z | 0 }
            : (o.sourceCell ? { x: o.sourceCell.x, y: o.sourceCell.y, z: o.sourceCell.z | 0 } : { x, y, z: zOf(area) });
        const prov = { fireId, startedAt: f.beat, startedOn: calendarNow(), sourceType: src ? src.type : (o.sourceType || causeType(o.cause)),
            sourceObjectId: src ? src.objectId || null : (o.sourceObjectId || null), sourceCell: cell, firstFuelIgnited: type.id, spreadParents: [], spreadSteps: 0, cause: o.cause || "unknown" };
        f.fires[fireId] = { fireId, startedAt: prov.startedAt, startedOn: prov.startedOn, sourceType: prov.sourceType, sourceObjectId: prov.sourceObjectId, sourceCell: prov.sourceCell,
            firstFuelIgnited: prov.firstFuelIgnited, cause: prov.cause, area: copyArea(area), cells: 0, burning: 0, out: null, casualties: [] };
        pruneFires(f);
        return prov;
    }
    // A burning cell stops burning (put out, burnt out, fuel gone): its fire's live count drops; at zero the fire is over.
    function dropBurning(f, key) {
        const rec = f.burning[key];
        delete f.burning[key];
        indexRemove(key);
        const fire = rec && rec.fireId && f.fires ? f.fires[rec.fireId] : null;
        if (fire) {
            fire.burning = Math.max(0, (fire.burning | 0) - 1);
            if (!fire.burning && fire.out === null) fire.out = f.beat;
        }
        return rec || null;
    }
    // Finished fires beyond the newest FIRE_HISTORY are forgotten (a fire still burning is always kept).
    function pruneFires(f) {
        const done = Object.keys(f.fires).filter(id => f.fires[id] && f.fires[id].out !== null);
        if (done.length <= FIRE_HISTORY) return;
        done.sort((a, b) => f.fires[a].out - f.fires[b].out || f.fires[a].startedAt - f.fires[b].startedAt);
        for (const id of done.slice(0, done.length - FIRE_HISTORY)) delete f.fires[id];
    }
    const provenanceCopy = p => (p ? Object.assign({}, p, { sourceCell: p.sourceCell ? Object.assign({}, p.sourceCell) : null, spreadParents: (p.spreadParents || []).slice(), startedOn: p.startedOn ? Object.assign({}, p.startedOn) : null }) : null);

    /**
     * Light a cell. opts: { cause, force (ignore a wet cell), parent: { key, rec } (spread from that burning cell),
     * source: { type, objectId, cell } (an escape from a fire source), sourceType / sourceObjectId / sourceCell (what
     * lit it otherwise) }. True when the cell burns now (it wasn't burning, its object burns).
     */
    function ignite(area, x, y, opts) {
        if (!acceptsArea(area)) return false;
        const o = opts || {};
        const W = World(), O = Objects(), f = fireState();
        if (!W || !O || !f || !area || !W.inWorld(area.x, area.y) || !inBounds(x, y)) return false;
        index();
        const key = keyOf(area, x, y);
        if (f.burning[key]) return false;
        const type = O.atIn(area, x, y);
        const rule = ruleForType(type);
        if (!burns(rule)) return false;
        if (!o.force && wetUntil(f, key) > f.beat) return false;
        const provenance = provenanceFor(f, area, x, y, type, o);
        const fire = f.fires[provenance.fireId];
        if (fire) { fire.cells++; fire.burning++; fire.out = null; }
        f.burning[key] = { since: f.beat, fuel: Math.max(1, Math.round(num(rule.burn, 1))), obj: type.id, fireId: provenance.fireId, parent: o.parent ? o.parent.key : null, provenance };
        delete f.wet[key];
        indexAdd(key);
        emit("fire:ignited", copyArea(area), x, y, o.cause || "unknown", type.id, provenanceCopy(provenance));
        if (o.cause !== "test") campDouse(key);
        return true;
    }

    function stopDouseJobsFor(key) {
        const J = Jobs();
        if (!J) return;
        for (const j of douseJobs()) {
            if (!j.params || j.params.fireKey !== key) continue;
            if (j.state === "open") J.cancel(j.id, "the fire is out");
            else j.planned = false; // the worker plans again: another fire nearby, or the job ends ("the fire is out")
        }
    }

    /**
     * Put a burning cell out. how: "doused" (water: a rule's dousedBecomes applies, the cell stays wet for douse.wetBeats)
     * or anything else ("out": nothing changes). Returns { from, to } (object ids) or null when the cell wasn't burning.
     */
    function extinguish(area, x, y, how, unit) {
        if (!acceptsArea(area) || (unit && !sameArea(levelArea(unit), area))) return null;
        const f = fireState(), O = Objects();
        if (!f || !area) return null;
        index();
        const key = keyOf(area, x, y);
        if (!f.burning[key]) return null;
        dropBurning(f, key);
        const type = O ? O.atIn(area, x, y) : null;
        const rule = ruleForType(type);
        let to = type ? type.id : null;
        if (how === "doused") {
            f.wet[key] = f.beat + conf().douse.wetBeats;
            if (rule && rule.dousedBecomes !== undefined && O) {
                O.setIn(area, x, y, rule.dousedBecomes);
                to = rule.dousedBecomes;
            }
        }
        const result = { from: type ? type.id : null, to };
        stopDouseJobsFor(key);
        emit("fire:extinguished", copyArea(area), x, y, how || "out", unit || null, result);
        return result;
    }

    // The fuel ran out: the object becomes the rule's `becomes`, the ground may turn to ash, items may burn.
    function burnOut(key, p, rule, type) {
        const f = fireState(), O = Objects(), I = Items();
        dropBurning(f, key);
        const to = rule.becomes === undefined ? null : rule.becomes;
        let destroyed = 0;
        if (rule.destroysItems && I) {
            for (const it of I.atIn(p.area, p.x, p.y)) if (I.remove(it.id)) destroyed++;
        }
        O.setIn(p.area, p.x, p.y, to);
        if (rule.ground) setGround(p.area, p.x, p.y, rule.ground);
        stopDouseJobsFor(key);
        emit("fire:burnedOut", copyArea(p.area), p.x, p.y, type ? type.id : null, to, destroyed);
    }

    // Ground kind of a cell becomes `kindId` (UF_Tiles A2), with the autotile shapes of it and its 8 neighbours redone.
    function groundKindAt(area, x, y) {
        const W = World(), T = window.UF && UF.Tiles;
        if (!W || !T || !acceptsArea(area) || zOf(area) !== 0 || !inBounds(x, y)) return null;
        return T.kindOfTile(W.getTile(area.x, area.y, x, y, 0));
    }
    function autotileShape(same) {
        const G = window.UF && UF.WorldGen;
        if (G && typeof G.autotileShape === "function") return G.autotileShape(same);
        const I = window.UF && UF.Interact;
        if (I && typeof I.autotileShape === "function") return I.autotileShape(same);
        return 0;
    }
    function reshape(area, x, y) {
        const W = World(), T = UF.Tiles;
        const kind = groundKindAt(area, x, y);
        if (!kind) return;
        const same = (dx, dy) => {
            const nx = x + dx, ny = y + dy;
            if (!inBounds(nx, ny)) return true;
            const k = groundKindAt(area, nx, ny);
            return !!k && k.id === kind.id;
        };
        const tileId = T.groundBase(kind.id) + autotileShape(same);
        if (W.getTile(area.x, area.y, x, y, 0) !== tileId) W.setTile(area.x, area.y, x, y, 0, tileId);
    }
    function setGround(area, x, y, kindId) {
        const W = World(), T = window.UF && UF.Tiles;
        if (!W || !T || T.groundBase(kindId) === null) return false;
        const cur = groundKindAt(area, x, y);
        if (!cur || cur.passable === false) return false; // water, rock face: nothing to scorch
        if (cur.id === kindId) return true;
        W.setTile(area.x, area.y, x, y, 0, T.groundBase(kindId));
        reshape(area, x, y);
        for (const [dx, dy] of NEIGHBORS8) if (inBounds(x + dx, y + dy)) reshape(area, x + dx, y + dy);
        return true;
    }

    //-------------------------------------------------------------------------
    // Contained sources (campfires) of the area on screen: indexed once per built grid, kept by world:objectChanged

    const src = { grid: null, area: null, conf: null, cells: new Set() };
    function sourceCells() {
        const W = World(), map = window.$dataMap;
        const area = viewArea();
        if (!area || !map || !map.ufObjects) return null;
        if (src.grid !== map.ufObjects || src.conf !== conf() || !sameArea(src.area, area)) {
            src.grid = map.ufObjects;
            src.area = copyArea(area);
            src.conf = conf();
            src.cells.clear();
            const types = sourceTypes();
            if (types.size) {
                const g = map.ufObjects;
                for (let i = 0; i < g.length; i++) if (g[i] && types.has(g[i])) src.cells.add(i);
            }
        }
        return src;
    }
    function onObjectChanged(area, x, y, typeId) {
        if (!src.grid || !sameArea(area, src.area) || !World() || !World().state) return;
        const i = y * World().state.size + x;
        if (typeId && sourceTypes().has(typeId)) src.cells.add(i);
        else src.cells.delete(i);
    }

    //-------------------------------------------------------------------------
    // The beat

    const simPerf = { beats: 0, ms: 0, max: 0 };

    /** One beat of fire: spread, fuel, burn-outs, campfire escapes, accidental starts, units in fire, camp douse jobs. */
    function beat() {
        const W = World(), O = Objects(), f = fireState();
        if (!W || !O || !f) return;
        const t0 = performance.now();
        index();
        const c = conf();
        const seed = W.state.seed >>> 0;
        f.beat += 1;
        const b = f.beat;
        const keys = Object.keys(f.burning);
        const catches = new Map(); // key -> ignite options { area, x, y, cause, parent | source }
        const outs = [];
        for (const key of keys) {
            const rec = f.burning[key], p = parseKey(key);
            if (!rec || !p) { delete f.burning[key]; continue; }
            if (!acceptsArea(p.area)) continue; // Preserve level saves inertly under a legacy core.
            const type = O.atIn(p.area, p.x, p.y);
            const rule = ruleForType(type);
            if (!burns(rule)) {
                // The fuel went away (chopped, dismantled, built over): the fire dies without changing anything.
                outs.push({ key, p, gone: true });
                continue;
            }
            if (rec.obj !== type.id) rec.obj = type.id;
            for (let d = 0; d < 4; d++) {
                const nx = p.x + NEIGHBORS[d][0], ny = p.y + NEIGHBORS[d][1];
                if (!inBounds(nx, ny)) continue;
                const nkey = keyOf(p.area, nx, ny);
                if (f.burning[nkey] || catches.has(nkey) || wetUntil(f, nkey) > b) continue;
                const nr = ruleForType(O.atIn(p.area, nx, ny));
                if (!burns(nr)) continue;
                // Spread: the neighbour joins this cell's fire, with this cell as its parent (provenance).
                if (hash01(seed, SALT.spread, b, p.area.x, p.area.y, p.x, p.y, d) < num(nr.spread, 0)) catches.set(nkey, { area: p.area, x: nx, y: ny, cause: "spread", parent: { key, rec } });
            }
            rec.fuel -= 1;
            if (rec.fuel <= 0) outs.push({ key, p, rule, type });
        }
        // Fire sources never burn themselves. A contained hearth in normal use never lets a flame out (escapeChance 0,
        // DEUS-TSK-FABLE-16); an open fire, or a damaged / overturned / uncontrolled hearth, may light a flammable
        // 4-neighbour each beat with its escape chance. What escapes is a new fire whose provenance names the source.
        const s = sourceCells();
        if (s && s.cells.size) {
            const size = W.state.size;
            for (const i of s.cells) {
                const x = i % size, y = (i / size) | 0;
                const info = sourceInfoAt(s.area, x, y, O.type(s.grid[i]));
                if (!info || !(info.escapeChance > 0)) continue;
                for (let d = 0; d < 4; d++) {
                    const nx = x + NEIGHBORS[d][0], ny = y + NEIGHBORS[d][1];
                    if (!inBounds(nx, ny)) continue;
                    const nkey = keyOf(s.area, nx, ny);
                    if (f.burning[nkey] || catches.has(nkey) || wetUntil(f, nkey) > b) continue;
                    if (!burns(ruleForType(O.atIn(s.area, nx, ny)))) continue;
                    if (hash01(seed, SALT.escape, b, x, y, d) < info.escapeChance) {
                        catches.set(nkey, { area: s.area, x: nx, y: ny, cause: info.contained ? `hearth ${info.state}` : "campfire", source: { type: info.sourceType, objectId: info.objectId, cell: { x, y, z: zOf(s.area) } } });
                    }
                }
            }
        }
        // Accidental starts (off unless fire.startChance > 0): one seeded cell of the area on screen.
        if (c.startChance > 0 && viewArea() && hash01(seed, SALT.start, b) < c.startChance) {
            const size = W.state.size;
            const x = W.hash32(seed, SALT.startCell, b, 1) % size, y = W.hash32(seed, SALT.startCell, b, 2) % size;
            const area = viewArea();
            const nkey = keyOf(area, x, y);
            if (!f.burning[nkey] && !catches.has(nkey)) catches.set(nkey, { area, x, y, cause: "accident" });
        }
        for (const o of outs) {
            if (o.gone) {
                dropBurning(f, o.key);
                stopDouseJobsFor(o.key);
                emit("fire:extinguished", copyArea(o.p.area), o.p.x, o.p.y, "gone", null, null);
            } else burnOut(o.key, o.p, o.rule, o.type);
        }
        for (const cat of catches.values()) ignite(cat.area, cat.x, cat.y, cat);
        hurtUnits(b);
        campDouse(null);
        for (const key of Object.keys(f.wet)) if (f.wet[key] <= b) delete f.wet[key];
        const dt = performance.now() - t0;
        simPerf.beats++;
        simPerf.ms += dt;
        if (dt > simPerf.max) simPerf.max = dt;
    }
    function safeBeat() {
        try {
            beat();
        } catch (e) {
            errors.push(String(e && e.stack ? e.stack.split("\n").slice(0, 2).join(" | ") : e));
            console.error("UF_Fire: beat failed", e);
        }
    }

    // Driven from the map update: steady simulation cadence (pause and speed come for free).
    let subFrames = 0;
    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);
        const W = World();
        if (!W || !W.state) return;
        if (++subFrames >= beatFrames()) {
            subFrames = 0;
            safeBeat();
        }
    };

    //-------------------------------------------------------------------------
    // Units in fire: damage (UF.Combat), a thought (UF.Colonists), the job dropped, a walk out

    function standableIn(area, x, y, unitId) {
        const J = Jobs(), W = World();
        if (!acceptsArea(area)) return false;
        if (zOf(area) !== 0) return typeof W.cellFree === "function" && W.cellFree(area.x, area.y, x, y, unitId || 0, zOf(area));
        if (J && typeof J.standable === "function") return J.standable(area, x, y, unitId || 0);
        return W && typeof W.cellFree === "function" ? W.cellFree(area.x, area.y, x, y, unitId || 0) : false;
    }
    function safeCellNear(area, x, y, radius, unitId) {
        for (let r = 1; r <= radius; r++) {
            let best = null, bestD = Infinity;
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                    const nx = x + dx, ny = y + dy;
                    if (!inBounds(nx, ny) || burningIn(area, nx, ny) || !standableIn(area, nx, ny, unitId)) continue;
                    const d = dx * dx + dy * dy;
                    if (d < bestD) { best = { x: nx, y: ny }; bestD = d; }
                }
            }
            if (best) return best;
        }
        return null;
    }

    function burnUnit(u, b) {
        const W = World(), c = conf();
        const d = u.data || (u.data = {});
        const [lo, hi] = c.damage;
        const dmg = lo + ((W.hash32(W.state.seed >>> 0, SALT.damage, b, u.id) >>> 0) % (hi - lo + 1));
        const C = window.UF && UF.Combat;
        if (C && typeof d.hp !== "number" && typeof C.calcAC === "function") {
            try { C.calcAC(u); } catch (e) { /* UF_Combat sets hp/maxHp on first use; without it the unit has no hit points */ }
        }
        let died = false;
        if (typeof d.hp === "number" && dmg > 0) {
            d.hp -= dmg;
            if (d.hp <= 0) { d.hp = 0; died = true; }
        }
        d.burnedAt = b;
        if (typeof W.isDisplayed === "function" && W.isDisplayed(u)) {
            // Sprites only (VISION V58): the damage number, and the sheet's own hurt frames when its sidecar lists them.
            // No UF.Combat.playHitAnimation: that is a code-made recoil and red flash.
            try {
                if (C && typeof C.addPopup === "function") C.addPopup(u.x, u.y, `-${dmg}`, "#ff8e10");
                const A = window.UF && UF.Anim;
                const cols = A && typeof A.hurtColumns === "function" && u.image ? A.hurtColumns(u.image.characterName) : null;
                if (cols && typeof A.playFrames === "function") A.playFrames(u, cols, HURT_FRAMES);
            } catch (e) { /* decoration */ }
        }
        const Col = window.UF && UF.Colonists;
        if (Col && typeof Col.addThought === "function" && c.thought.text && (d.kind === "colonist" || Array.isArray(d.thoughts))) {
            if (typeof d.fireThoughtBeat !== "number" || b - d.fireThoughtBeat >= c.thought.everyBeats) {
                Col.addThought(u, c.thought.text, c.thought.strength);
                d.fireThoughtBeat = b;
            }
        }
        emit("fire:unitBurned", u, dmg, died);
        if (died) {
            // The casualty carries the provenance of the fire it stood in (DEUS-TSK-FABLE-16): the forensic record
            // names the fire, where it started and how many spread steps brought it here, before Combat's death path
            // (whose own recordDeath call is the second one and does nothing).
            const area = levelArea(u), f = fireState();
            const rec = f && f.burning ? f.burning[keyOf(area, u.x, u.y)] : null;
            const prov = rec && rec.provenance ? provenanceCopy(rec.provenance) : null;
            if (prov) {
                d.fireProvenance = prov;
                const fire = f.fires[prov.fireId];
                if (fire) fire.casualties.push({ unitId: u.id, name: u.name || null, beat: b, cell: { x: u.x, y: u.y, z: zOf(area) }, spreadSteps: prov.spreadSteps | 0 });
            }
            d.deathCause = "fire";
            const Forensics = window.UF && UF.DeathForensics;
            if (Forensics && typeof Forensics.recordDeath === "function") {
                try { Forensics.recordDeath(u, "fire", null); } catch (e) { errors.push(String(e && e.stack ? e.stack.split("\n").slice(0, 2).join(" | ") : e)); }
            }
            if (C && typeof C.onUnitDeath === "function") C.onUnitDeath(u, null);
            else W.removeUnit(u.id);
            return;
        }
        flee(u);
    }
    function flee(u) {
        const W = World(), J = Jobs();
        const job = J ? J.of(u.id) : null;
        if (job) J.cancel(job.id, "fled from the fire");
        const area = levelArea(u);
        if (u.goal && sameArea(levelArea(u.goal), area) && !burningIn(levelArea(u.goal), u.goal.x, u.goal.y)) return; // already walking somewhere safe
        const safe = safeCellNear(area, u.x, u.y, FLEE_RADIUS, u.id);
        if (safe) W.sendUnit(u.id, cellRef(area, safe.x, safe.y));
    }
    function hurtUnits(b) {
        const W = World(), I = index();
        if (!I.total) return;
        const size = W.state.size;
        for (const u of W.units()) {
            if (!u || !u.area) continue;
            const area = levelArea(u);
            if (!acceptsArea(area)) continue;
            const set = I.byArea.get(areaKey(area));
            if (!set || !set.has(u.y * size + u.x)) continue;
            if (u.data && (u.data.through || u.data._isDying)) continue; // fliers pass over; the dying are already falling
            burnUnit(u, b);
        }
    }

    // Units never step into a burning cell (on-screen pathfinding asks this for every step it considers).
    const _Game_CharacterBase_isMapPassable = Game_CharacterBase.prototype.isMapPassable;
    Game_CharacterBase.prototype.isMapPassable = function(x, y, d) {
        if (!_Game_CharacterBase_isMapPassable.call(this, x, y, d)) return false;
        if (!idx.total && idx.src === (World() && World().state ? World().state.fire || null : null)) return true;
        if (!(this instanceof Game_Event) || this.eventId() < EVENT_BASE) return true;
        const W = World();
        const u = W && W.unitOfEvent ? W.unitOfEvent(this) : null;
        if (!u || (u.data && u.data.through)) return true;
        const x2 = $gameMap.roundXWithDirection(x, d), y2 = $gameMap.roundYWithDirection(y, d);
        return !burningIn(levelArea(u), x2, y2);
    };

    //-------------------------------------------------------------------------
    // Putting fires out: the "douse" job (fetch water beside a water cell, then work beside the fire)

    const douseJobs = () => {
        const J = Jobs();
        return J ? J.list(j => j.type === "douse" && (j.state === "open" || j.state === "travel" || j.state === "work")) : [];
    };
    const isWaterIn = (area, x, y) => {
        if (!acceptsArea(area)) return false;
        if (zOf(area) !== 0) return Tilemap.isWaterTile(World().getTile(area.x, area.y, x, y, 0, zOf(area)));
        const J = Jobs();
        return !!J && typeof J.isWaterAt === "function" && J.isWaterAt(area, x, y);
    };
    // A standable 4-neighbour of (x, y) that isn't burning, nearest to the unit (fixed order without a unit).
    function standBeside(area, x, y, unit) {
        if (!acceptsArea(area) || (unit && !sameArea(levelArea(unit), area))) return null;
        let best = null, bestD = Infinity;
        for (const [dx, dy] of NEIGHBORS) {
            const nx = x + dx, ny = y + dy;
            if (!inBounds(nx, ny) || burningIn(area, nx, ny) || isWaterIn(area, nx, ny)) continue;
            const here = unit && sameArea(levelArea(unit), area) && unit.x === nx && unit.y === ny;
            if (!here && !standableIn(area, nx, ny, unit ? unit.id : 0)) continue;
            const dist = unit && sameArea(levelArea(unit), area) ? Math.abs(unit.x - nx) + Math.abs(unit.y - ny) : 0;
            if (dist < bestD) { best = cellRef(area, nx, ny); bestD = dist; }
        }
        return best;
    }
    /** The water cell nearest to (fx, fy) within `radius` (Chebyshev rings) that has a dry, standable, unburnt neighbour: { x, y, stand } or null. */
    function findWater(area, fx, fy, radius, unit) {
        if (!acceptsArea(area) || (unit && !sameArea(levelArea(unit), area))) return null;
        for (let r = 1; r <= radius; r++) {
            let best = null, bestD = Infinity;
            for (let dy = -r; dy <= r; dy++) {
                const edge = dy === -r || dy === r;
                for (let dx = -r; dx <= r; dx += edge ? 1 : 2 * r) {
                    const x = fx + dx, y = fy + dy;
                    if (!inBounds(x, y) || !isWaterIn(area, x, y)) continue;
                    const dd = dx * dx + dy * dy;
                    if (dd >= bestD) continue;
                    const stand = standBeside(area, x, y, unit);
                    if (stand) { best = { x, y, stand }; bestD = dd; }
                }
            }
            if (best) return best;
        }
        return null;
    }
    function retarget(job) {
        const old = job.params && job.params.fire;
        const I = index();
        const area = levelArea(old);
        if (!acceptsArea(area)) return null;
        const set = old ? I.byArea.get(areaKey(area)) : null;
        if (!set || !set.size) return null;
        const taken = new Set(douseJobs().filter(j => j.id !== job.id && j.params).map(j => j.params.fireKey));
        let best = null, bestD = Infinity;
        for (const i of set) {
            const x = i % I.size, y = (i / I.size) | 0;
            const d = Math.max(Math.abs(x - old.x), Math.abs(y - old.y));
            if (d > RETARGET_RADIUS) continue;
            const key = keyOf(area, x, y);
            if (taken.has(key)) continue;
            const dd = Math.hypot(x - old.x, y - old.y);
            if (dd < bestD || (dd === bestD && best && (y < best.y || (y === best.y && x < best.x)))) { best = { x, y, key }; bestD = dd; }
        }
        if (!best) return null;
        job.params.fire = cellRef(area, best.x, best.y);
        job.params.fireKey = best.key;
        job.target = cellRef(area, best.x, best.y);
        return job.params.fire;
    }
    function defineDouse() {
        const J = Jobs();
        if (!J || typeof J.define !== "function") return false;
        J.define("douse", {
            verb: "Dousing",
            plan(job, unit) {
                const p = job.params || (job.params = {});
                let fire = p.fire;
                if (!fire || !burningIn(levelArea(fire), fire.x, fire.y)) fire = retarget(job);
                if (!fire) return { ok: false, reason: "the fire is out" };
                const area = levelArea(fire);
                if (!sameArea(levelArea(unit), area)) return { ok: false, reason: "the fire is on another level" };
                if ((job.phase | 0) === 0) {
                    const w = findWater(area, fire.x, fire.y, conf().douse.waterRadius, unit);
                    if (!w) return { ok: false, reason: "no water within reach" };
                    p.water = cellRef(area, w.x, w.y);
                    return { ok: true, stand: w.stand };
                }
                const stand = standBeside(area, fire.x, fire.y, unit);
                return stand ? { ok: true, stand } : { ok: false, reason: "can't reach the fire" };
            },
            work: job => Math.round(((job.phase | 0) === 0 ? conf().douse.fillBeats : conf().douse.beats) * beatFrames()),
            apply(job, unit) {
                const p = job.params;
                if (!p.fire || !sameArea(levelArea(unit), levelArea(p.fire))) {
                    job.reason = "the fire is on another level";
                    return "continue"; // Jobs.finish replans; the normal plan refusal reports this without a console error.
                }
                if ((job.phase | 0) === 0) {
                    p.filled = Object.assign(cellRef(levelArea(unit), unit.x, unit.y), { water: p.water || null });
                    return "continue";
                }
                const fire = p.fire;
                const r = fire ? extinguish(levelArea(fire), fire.x, fire.y, "doused", unit) : null;
                job.result = { doused: !!r, fireKey: p.fireKey || null, from: r ? r.from : null, to: r ? r.to : null };
            },
            describe: job => ((job.phase | 0) === 0 ? "Fetching water for a fire" : "Putting out a fire")
        });
        return true;
    }
    defineDouse();

    /** An open douse job (owner null unless opts.owner) of the player's faction for a burning cell; null when not burning, already covered, or no water within reach. */
    function douse(area, x, y, opts) {
        if (!acceptsArea(area)) return null;
        const o = opts || {};
        const J = Jobs();
        if (!J || !J.handler("douse")) defineDouse();
        if (!J || !J.handler("douse") || !area || !burningIn(area, x, y)) return null;
        const key = keyOf(area, x, y);
        if (douseJobs().some(j => j.params && j.params.fireKey === key)) return null;
        if (!findWater(area, x, y, conf().douse.waterRadius, null)) return null;
        const F = window.UF && UF.Factions;
        const faction = o.faction !== undefined ? o.faction : F && typeof F.playerId === "function" ? F.playerId() : null;
        return J.create({
            type: "douse", target: cellRef(area, x, y),
            params: { faction, fireKey: key, fire: cellRef(area, x, y), cause: o.cause || "player" },
            owner: o.owner || null, priority: typeof o.priority === "number" ? o.priority : conf().douse.priority
        });
    }

    /** The player's camp (UF.Colonists.site()) with the douse radius, or null. */
    function campOf() {
        const Col = window.UF && UF.Colonists;
        let s = null;
        try { s = Col && typeof Col.site === "function" ? Col.site() : null; } catch (e) { s = null; }
        if (!s || !s.area || typeof s.x !== "number") return null;
        return { area: copyArea(levelArea(s)), x: s.x, y: s.y, z: zOf(s), radius: Math.max(conf().douse.campRadius, (s.radius | 0) + 4) };
    }
    const noWater = new Map(); // fire key -> beat it was last found without water in reach (a cache)
    /** Open douse jobs for burning cells within the camp radius (nearest first) up to douse.maxOpen active ones. onlyKey: just that cell. */
    function campDouse(onlyKey) {
        const J = Jobs(), f = fireState();
        if (!J || !f || !index().total || !J.handler("douse")) return 0;
        const camp = campOf();
        if (!camp) return 0;
        const I = index();
        const set = I.byArea.get(areaKey(camp.area));
        if (!set || !set.size) return 0;
        const active = douseJobs();
        let room = conf().douse.maxOpen - active.length;
        if (room <= 0) return 0;
        const covered = new Set(active.map(j => j.params && j.params.fireKey));
        const cand = [];
        const consider = (x, y) => {
            const dist = Math.hypot(x - camp.x, y - camp.y);
            if (dist > camp.radius) return;
            const key = keyOf(camp.area, x, y);
            if (covered.has(key)) return;
            if (noWater.has(key) && f.beat - noWater.get(key) < NO_WATER_RETRY) return;
            cand.push({ x, y, key, dist });
        };
        if (onlyKey) {
            const p = parseKey(onlyKey);
            if (p && sameArea(p.area, camp.area) && set.has(p.y * I.size + p.x)) consider(p.x, p.y);
        } else {
            for (const i of set) consider(i % I.size, (i / I.size) | 0);
        }
        cand.sort((a, b) => (a.dist - b.dist) || (a.y - b.y) || (a.x - b.x));
        let made = 0;
        for (const c of cand) {
            if (room <= 0) break;
            const job = douse(camp.area, c.x, c.y, { cause: "camp" });
            if (job) { made++; room--; noWater.delete(c.key); } else noWater.set(c.key, f.beat);
        }
        return made;
    }

    //-------------------------------------------------------------------------
    // Flames: code-drawn UF_GenFlame (low: grass, bushes, beds) and UF_GenFlame_Tall (trees, walls), 3 frames each.
    // One art pixel = one screen pixel at zoom 1 (VISION V2); colours from the project palette art/palette/uf.hex
    // (indices 238, 237, 236, 235, 234, 233, 1); flames lean up-left (GUIDE_25D section 1) at half the 45-degree slope so
    // they read as flames, while flames higher up a tree sit where the 45-degree projection puts that height.

    const FLAME_RAMP = ["#9A2800", "#CA3900", "#FF5100", "#FF8E10", "#FFC228", "#FFEF41", "#FBF3CE"];
    const FLAME_VARIANTS = {
        low: { name: "UF_GenFlame", w: 64, h: 64, foot: [16, 16], tongues: 10, lifted: 0, height: [7, 15], radius: [3, 4.6], seed: 0x10f1 },
        tall: { name: "UF_GenFlame_Tall", w: 112, h: 112, foot: [64, 64], tongues: 8, lifted: 9, height: [7, 15], radius: [3, 4.6], seed: 0x7a11 }
    };
    const FLAME_LEAN = 0.5;   // px left per px a flame rises
    const HEIGHT_LEAN = 1;    // px left per px of height on the object (the 45-degree projection)
    const FLAME_FRAMES = 3;
    const FLAME_TICKS = 8;    // rendered frames per flame frame (animation only; the simulation never reads it)

    /** Pure: { w, h, frames, anchor: [x, y], data: RGBA } of a flame sheet (frames side by side). Deterministic. */
    function flamePixels(variant) {
        const V = FLAME_VARIANTS[variant] || FLAME_VARIANTS.low;
        const W = V.w, H = V.h, FRAMES = FLAME_FRAMES;
        const rgb = FLAME_RAMP.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
        let s = V.seed >>> 0;
        const rnd = () => { s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x297a2d39) >>> 0; s ^= s >>> 12; return (s >>> 0) / 4294967296; };
        const fx0 = V.foot[0], fy0 = V.foot[1];
        const tongues = [];
        // Bases spread over the cell's ground square on a jittered 4x3 grid (so the whole cell reads as burning).
        const slots = [];
        for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 4; gx++) slots.push([gx, gy]);
        const add = (slot, lift) => tongues.push({
            bx: fx0 + 7 + slot[0] * 10 + rnd() * 7, by: fy0 + 14 + slot[1] * 11 + rnd() * 8, lift,
            h: V.height[0] + rnd() * (V.height[1] - V.height[0]), r: V.radius[0] + rnd() * (V.radius[1] - V.radius[0]),
            amp: 0.2 + rnd() * 0.2, phase: rnd() * 6.283, sway: 0.8 + rnd() * 1.2
        });
        for (let i = 0; i < V.tongues; i++) add(slots[(i * 5) % slots.length], 0);
        for (let i = 0; i < V.lifted; i++) add(slots[(i * 7 + 3) % slots.length], 12 + rnd() * 28);
        const embers = [];
        for (let i = 0; i < 8; i++) embers.push({ bx: fx0 + 8 + rnd() * 32, by: fy0 + 10 + rnd() * 30, up: 12 + rnd() * 16 + (V.lifted ? 10 + rnd() * 30 : 0), phase: rnd() });
        const data = new Uint8ClampedArray(W * FRAMES * H * 4);
        for (let f = 0; f < FRAMES; f++) {
            const heat = new Float32Array(W * H);
            const ang = f * 2.0944;
            for (const tg of tongues) {
                const h = tg.h * (1 + tg.amp * Math.sin(ang + tg.phase));
                const steps = Math.ceil(h * 2);
                for (let k = 0; k <= steps; k++) {
                    const t = k / steps;
                    const rise = t * h;
                    const r = Math.max(0.5, tg.r * (t < 0.2 ? 0.8 + t : Math.pow(1 - (t - 0.2) / 0.8, 1.1)));
                    const cx = tg.bx - HEIGHT_LEAN * tg.lift - FLAME_LEAN * rise + tg.sway * Math.sin(Math.PI * t * 1.7 + ang + tg.phase) * t;
                    const cy = tg.by - tg.lift - rise;
                    for (let py = Math.floor(cy - r); py <= Math.ceil(cy + r); py++) {
                        if (py < 0 || py >= H) continue;
                        for (let px = Math.floor(cx - r); px <= Math.ceil(cx + r); px++) {
                            if (px < 0 || px >= W) continue;
                            const dd = Math.hypot(px + 0.5 - cx, py + 0.5 - cy) / r;
                            if (dd > 1) continue;
                            const hot = Math.min(1, (1 - dd * dd * 0.9) * (1.0 - 0.8 * t));
                            const i = py * W + px;
                            if (hot > heat[i]) heat[i] = hot;
                        }
                    }
                }
            }
            for (const e of embers) {
                const k = (e.phase + f / FRAMES) % 1;
                const rise = e.up * (0.5 + 0.5 * k);
                const px = Math.round(e.bx - FLAME_LEAN * rise), py = Math.round(e.by - rise);
                if (px >= 0 && py >= 0 && px < W && py < H) heat[py * W + px] = Math.max(heat[py * W + px], 0.45);
            }
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const hv = heat[y * W + x];
                    if (hv <= 0.05) continue;
                    const dither = ((x + y) & 1) ? 0.35 : -0.35; // checker micro-dither between the ramp's bands
                    const level = Math.max(0, Math.min(FLAME_RAMP.length - 1, Math.floor(hv * 6.3 + dither)));
                    const o = (y * W * FRAMES + f * W + x) * 4;
                    data[o] = rgb[level][0];
                    data[o + 1] = rgb[level][1];
                    data[o + 2] = rgb[level][2];
                    data[o + 3] = 255;
                }
            }
        }
        return { w: W, h: H, frames: FRAMES, anchor: [V.foot[0] + 24, V.foot[1] + 48], data };
    }

    const generatedCache = {};
    function flameBitmap(variant) {
        const v = FLAME_VARIANTS[variant] ? variant : "low";
        if (generatedCache[v]) return generatedCache[v];
        const p = flamePixels(v);
        const bmp = new Bitmap(p.w * p.frames, p.h);
        bmp.smooth = false;
        const img = bmp.context.createImageData(p.w * p.frames, p.h);
        img.data.set(p.data);
        bmp.context.putImageData(img, 0, 0);
        bmp._baseTexture.update();
        bmp._ufName = FLAME_VARIANTS[v].name;
        bmp._ufFlame = { w: p.w, h: p.h, frames: p.frames, ax: p.anchor[0] / p.w, ay: p.anchor[1] / p.h };
        generatedCache[v] = bmp;
        return bmp;
    }
    const generated = { flame: () => flameBitmap("low"), flameTall: () => flameBitmap("tall") };

    class Sprite_UFFireLayer extends Sprite {
        constructor() {
            super();
            this.z = 0;
            this._active = [];
            this._byCell = new Map();
            this._pool = [];
            this._seen = { stamp: -1, dx: NaN, dy: NaN, zoom: NaN, mapId: -1, area: "" };
            this.perf = { frames: 0, ms: 0, max: 0, rebuilds: 0 };
        }
        update() {
            super.update();
            const t0 = performance.now();
            try {
                this._updateFlames();
            } catch (e) {
                errors.push(String(e && e.stack ? e.stack.split("\n").slice(0, 2).join(" | ") : e));
                this._hideAll();
            }
            const dt = performance.now() - t0;
            this.perf.frames++;
            this.perf.ms += dt;
            if (dt > this.perf.max) this.perf.max = dt;
        }
        _updateFlames() {
            const W = World();
            const area = W && W.state ? viewArea() : null;
            if (!this.parent || !area || !window.$gameMap) { if (this._active.length) this._hideAll(); return; }
            const I = index();
            const set = I.byArea.get(areaKey(area));
            if ((!set || !set.size) && !this._active.length) return;
            const dx = Math.floor($gameMap.displayX()), dy = Math.floor($gameMap.displayY());
            const zoom = window.UF && UF.Camera ? UF.Camera.zoom() : 1;
            const seen = this._seen, ak = areaKey(area);
            if (seen.stamp !== I.stamp || seen.dx !== dx || seen.dy !== dy || seen.zoom !== zoom || seen.mapId !== $gameMap.mapId() || seen.area !== ak) {
                this._rebuild(set, I.size, area, dx, dy);
                seen.stamp = I.stamp; seen.dx = dx; seen.dy = dy; seen.zoom = zoom; seen.mapId = $gameMap.mapId(); seen.area = ak;
            }
            this._place();
        }
        _rebuild(set, size, area, dx, dy) {
            const O = Objects();
            const cols = Math.ceil($gameMap.screenTileX()) + 1, rows = Math.ceil($gameMap.screenTileY()) + 1;
            const x0 = dx - VIEW_MARGIN, x1 = dx + cols + VIEW_MARGIN + 2; // flames lean up-left: cells right of and below the view reach in
            const y0 = dy - VIEW_MARGIN, y1 = dy + rows + VIEW_MARGIN + 2;
            const keep = new Set();
            if (set) {
                for (const i of set) {
                    const x = i % size, y = (i / size) | 0;
                    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
                    const rule = O ? ruleForType(O.atIn(area, x, y)) : null;
                    const variant = rule && rule.flame === "tall" ? "tall" : "low";
                    let s = this._byCell.get(i);
                    if (!s) {
                        s = this._acquire();
                        this._byCell.set(i, s);
                        this._active.push(s);
                    }
                    if (s._ufVariant !== variant || s._ufX !== x || s._ufY !== y) this._assign(s, variant, x, y);
                    keep.add(s);
                }
            }
            let n = 0;
            for (const s of this._active) {
                if (keep.has(s)) this._active[n++] = s;
                else {
                    this._byCell.delete(s._ufY * size + s._ufX);
                    this._release(s);
                }
            }
            this._active.length = n;
            this.perf.rebuilds++;
        }
        _acquire() {
            let s = this._pool.pop();
            if (!s) {
                s = new Sprite();
                s._ufFire = true;
                this.parent.addChild(s);
            }
            s.visible = true;
            return s;
        }
        _release(s) {
            s.visible = false;
            s._ufVariant = null;
            this._pool.push(s);
        }
        _assign(s, variant, x, y) {
            const bmp = flameBitmap(variant);
            const fr = bmp._ufFlame;
            if (s.bitmap !== bmp) s.bitmap = bmp;
            s._ufVariant = variant;
            s._ufX = x;
            s._ufY = y;
            s._ufPhase = (World().hash32(x, y, 0xf1a) >>> 0) % FLAME_FRAMES;
            s._ufFrame = -1;
            s.anchor.set(fr.ax, fr.ay);
            s.visible = true;
        }
        _place() {
            const loopH = $gameMap && $gameMap.isLoopHorizontal(), loopV = $gameMap && $gameMap.isLoopVertical();
            const offX = loopH ? 0 : ($gameMap ? $gameMap.adjustX(0) : 0);
            const offY = loopV ? 0 : ($gameMap ? $gameMap.adjustY(0) : 0);
            const step = Math.floor(Graphics.frameCount / FLAME_TICKS);
            for (const s of this._active) {
                const fr = s.bitmap && s.bitmap._ufFlame;
                if (!fr) continue;
                const ax = loopH ? $gameMap.adjustX(s._ufX) : (s._ufX + offX);
                const ay = loopV ? $gameMap.adjustY(s._ufY) : (s._ufY + offY);
                s.x = Math.round((ax + 0.5) * TILE);
                const footY = Math.round(ay * TILE + TILE);
                s.y = footY;
                s.z = footY + 1; // just above the objects (footY) and units (footY) of its row, below the rows nearer the viewer
                const frame = (step + s._ufPhase) % fr.frames;
                if (frame !== s._ufFrame) {
                    s._ufFrame = frame;
                    s.setFrame(frame * fr.w, 0, fr.w, fr.h);
                }
            }
        }
        _hideAll() {
            for (const s of this._active) this._release(s);
            this._active.length = 0;
            this._byCell.clear();
            this._seen.stamp = -1;
        }
        spriteAt(x, y) {
            const W = World();
            const s = W && W.state ? this._byCell.get(y * W.state.size + x) : null;
            return s && s.visible ? s : null;
        }
        count() { return this._active.length; }
    }

    const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _Spriteset_Map_createCharacters.call(this);
        this._ufFireLayer = new Sprite_UFFireLayer();
        this._tilemap.addChild(this._ufFireLayer);
    };
    const currentLayer = () => {
        const scene = SceneManager._scene;
        return (scene && scene._spriteset && scene._spriteset._ufFireLayer) || null;
    };

    //-------------------------------------------------------------------------
    // Right-click options (a runtime wrap of UF_Interact: its optionsFor and its menu window)

    function fireOptions(x, y) {
        const W = World(), O = Objects();
        const area = W && W.state ? viewArea() : null;
        if (!area || !O || !inBounds(x, y)) return [];
        if (burningIn(area, x, y)) {
            const key = keyOf(area, x, y);
            if (douseJobs().some(j => j.params && j.params.fireKey === key)) return [];
            const water = !!findWater(area, x, y, conf().douse.waterRadius, null);
            return [{ id: "fire:douse", label: water ? "Put out the fire" : "Put out the fire (no water near)", enabled: water, run: () => douse(area, x, y, { cause: "player" }) }];
        }
        const rule = ruleForType(O.atIn(area, x, y));
        if (!burns(rule)) return [];
        return [{ id: "fire:ignite", label: "Set on fire", enabled: true, run: () => ignite(area, x, y, { cause: "player", force: true }) }];
    }
    const isCellList = opts => Array.isArray(opts) && opts.some(o => o && o.id === "look") && !opts.some(o => o && o.id === "back");
    function withFireOptions(opts, x, y) {
        if (!isCellList(opts) || opts.some(o => o && typeof o.id === "string" && o.id.startsWith("fire:"))) return opts;
        let extra = [];
        try { extra = fireOptions(x, y); } catch (e) { extra = []; }
        if (!extra.length) return opts;
        const out = opts.slice();
        const at = out.findIndex(o => o.id === "look");
        out.splice(at >= 0 ? at : out.length, 0, ...extra);
        return out;
    }
    function wrapInteract() {
        const IA = window.UF && UF.Interact;
        if (!IA || IA._ufFireWrapped || typeof IA.optionsFor !== "function") return false;
        const original = IA.optionsFor;
        IA.optionsFor = function(x, y) {
            return withFireOptions(original.call(this, x, y), x, y);
        };
        const MW = IA.MenuWindow;
        if (MW && MW.prototype) {
            const init = MW.prototype.initialize;
            MW.prototype.initialize = function(rect, options, header, cell) {
                if (cell && isCellList(options)) {
                    const more = withFireOptions(options, cell.x, cell.y);
                    if (more !== options) {
                        options = more;
                        if (typeof IA.menuRect === "function") rect = IA.menuRect(options, header, rect.x, rect.y, true);
                    }
                }
                return init.call(this, rect, options, header, cell);
            };
            const setOptions = MW.prototype.setOptions;
            if (typeof setOptions === "function") {
                MW.prototype.setOptions = function(options, header) {
                    const cell = this._cell;
                    if (cell && isCellList(options)) options = withFireOptions(options, cell.x, cell.y);
                    return setOptions.call(this, options, header);
                };
            }
        }
        IA._ufFireWrapped = true;
        return true;
    }
    wrapInteract();

    //-------------------------------------------------------------------------
    // The public object

    const Fire = {
        SALT, generated, flamePixels, FLAME_RAMP, FLAME_VARIANTS, Sprite_Layer: Sprite_UFFireLayer,
        /** The fire config from the catalog (numbers with defaults, rules as written). */
        config: conf,
        rules: () => conf().rules.slice(),
        /** The rule for an object type or catalog id, or null (never burns). */
        ruleFor(typeOrId) {
            const O = Objects();
            const t = typeof typeOrId === "string" || typeof typeOrId === "number" ? (O ? O.type(typeOrId) : null) : typeOrId;
            return ruleForType(t);
        },
        /** True when the object on the cell burns (not stone, not a contained source). */
        flammableAt(area, x, y) {
            const O = Objects();
            return !!O && acceptsArea(area) && burns(ruleForType(O.atIn(area, x, y)));
        },
        state: fireState,
        beatNow: () => { const f = fireState(); return f ? f.beat : 0; },
        beatFrames,
        ignite,
        extinguish,
        isBurning: burningIn,
        /** For path planners: true when a unit must not enter the cell (it burns). */
        blocksCell: burningIn,
        /** Every burning cell: [{ key, area, x, y, z, since, fuel, obj, fireId }]. */
        burningCells() {
            const f = fireState();
            if (!f) return [];
            return Object.keys(f.burning).flatMap(key => { const p = parseKey(key), r = f.burning[key]; return p ? [{ key, area: copyArea(p.area), x: p.x, y: p.y, z: p.z, since: r.since, fuel: r.fuel, obj: r.obj, fireId: r.fireId || null }] : []; });
        },
        count: () => index().total,
        /** Run n beats now (tests, tools); the live beat keeps running from the map update. */
        step(n = 1) {
            for (let i = 0; i < Math.max(0, n | 0); i++) safeBeat();
            return fireState() ? fireState().beat : 0;
        },
        // Provenance and containment (DEUS-TSK-FABLE-16)
        /**
         * The provenance of the fire on a burning cell, or null: { fireId, startedAt (beat), startedOn { tick, day, time },
         * sourceType ("hearth" | "open_fire" | "accident" | "direct" | "legacy"), sourceObjectId, sourceCell { x, y, z },
         * firstFuelIgnited, spreadParents [cell keys, oldest first, the last PARENTS_KEPT], spreadSteps, cause }. A copy.
         */
        provenanceAt(area, x, y) {
            const f = fireState();
            if (!f || !acceptsArea(area)) return null;
            const rec = f.burning[keyOf(area, x, y)];
            return rec && rec.provenance ? provenanceCopy(rec.provenance) : null;
        },
        /** The summary of one fire by id (burning or finished, the last FIRE_HISTORY finished ones are kept), or null. */
        fire(fireId) {
            const f = fireState();
            const r = f && f.fires ? f.fires[fireId] : null;
            return r ? JSON.parse(JSON.stringify(r)) : null;
        },
        /** Every fire summary: [{ fireId, startedAt, startedOn, sourceType, sourceObjectId, sourceCell, firstFuelIgnited, cause, area, cells, burning, out, casualties }]. */
        fires() {
            const f = fireState();
            return f && f.fires ? Object.keys(f.fires).map(id => JSON.parse(JSON.stringify(f.fires[id]))) : [];
        },
        /** One sentence for a casualty: "Burned to death by fire fire-3 originating from hearth (campfire) at (12,8,0) via 2 spread steps". */
        describeProvenance(prov) {
            if (!prov) return "Burned to death by a fire of unknown provenance";
            const c = prov.sourceCell || {};
            return `Burned to death by fire ${prov.fireId} originating from ${prov.sourceType}${prov.sourceObjectId ? ` (${prov.sourceObjectId})` : ""} at (${c.x}, ${c.y}, ${c.z | 0}) via ${prov.spreadSteps | 0} spread steps`;
        },
        isHearthType,
        /** How the fire source on a cell is held, or null: { contained, state, escapeChance, sourceType, objectId, by }. */
        sourceInfoAt: (area, x, y) => sourceInfoAt(area, x, y),
        /**
         * Mark a source cell contained (a campfire built as a shelter's hearth) or not. `by` names who set it (a
         * project id, "player"). Saved in state.fire.sources; the object may be rebuilt, the record stays with the cell.
         */
        setContained(area, x, y, contained, by) {
            const f = fireState();
            if (!f || !acceptsArea(area) || !inBounds(x, y)) return false;
            const key = keyOf(area, x, y);
            const rec = f.sources[key] || { contained: false, state: "normal", by: null };
            rec.contained = !!contained;
            if (by !== undefined) rec.by = by;
            if (!rec.contained && rec.state === "normal") delete f.sources[key]; else f.sources[key] = rec;
            emit("fire:sourceChanged", copyArea(area), x, y, Object.assign({}, rec));
            return true;
        },
        /** Set a source cell's state: "normal", "damaged", "overturned" or "uncontrolled" (a contained hearth escapes only when not normal). */
        setSourceState(area, x, y, state, by) {
            const f = fireState();
            if (!f || !acceptsArea(area) || !inBounds(x, y) || !SOURCE_STATES.includes(state)) return false;
            const key = keyOf(area, x, y);
            const rec = f.sources[key] || { contained: false, state: "normal", by: null };
            rec.state = state;
            if (by !== undefined) rec.by = by;
            if (!rec.contained && rec.state === "normal") delete f.sources[key]; else f.sources[key] = rec;
            emit("fire:sourceChanged", copyArea(area), x, y, Object.assign({}, rec));
            return true;
        },
        douse,
        douseJobs,
        campDouse,
        camp: campOf,
        findWater,
        standBeside,
        sourceCells: () => { const s = sourceCells(); return s ? Array.from(s.cells) : []; },
        options: fireOptions,
        wrapInteract,
        layer: currentLayer,
        spriteAt(x, y) { const l = currentLayer(); return l ? l.spriteAt(x, y) : null; },
        perf() {
            const l = currentLayer();
            const p = l ? l.perf : { frames: 0, ms: 0, max: 0, rebuilds: 0 };
            return { frames: p.frames, layerMs: p.ms, layerMax: p.max, rebuilds: p.rebuilds, sprites: l ? l.count() : 0, beats: simPerf.beats, simMs: simPerf.ms, simMax: simPerf.max };
        },
        resetPerf() {
            const l = currentLayer();
            if (l) l.perf = { frames: 0, ms: 0, max: 0, rebuilds: 0 };
            simPerf.beats = 0; simPerf.ms = 0; simPerf.max = 0;
        },
        errors: () => errors.slice()
    };
    const ns = window.DEUS || window.UF || {};
    window.DEUS = ns;
    window.UF = ns;
    ns.Fire = Fire;

    //-------------------------------------------------------------------------
    // Events and boot

    let hooked = false;
    function hookEvents() {
        if (hooked || !window.UF || !UF.Events) return;
        hooked = true;
        UF.Events.on("world:objectChanged", onObjectChanged);
        UF.Events.on("world:levelObjectChanged", onObjectChanged);
    }
    hookEvents();

    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DataManager_createGameObjects.call(this);
        subFrames = 0;
        noWater.clear();
    };

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        hookEvents();
        defineDouse();
        wrapInteract();
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "fire")

    function registerChecks() {
        UF.Test.suite("fire", async t => {
            const W = UF.World, O = UF.Objects, I = UF.Items, J = UF.Jobs, T = UF.Time;
            const area = W && W.currentArea();
            if (!area || !O || !I || !J) {
                t.check("suite_setup", false, `area ${JSON.stringify(area)}, Objects ${!!O}, Items ${!!I}, Jobs ${!!J}`);
                return;
            }
            const size = W.state.size;
            const cfg = conf();
            const playerId = UF.Factions && UF.Factions.playerId ? UF.Factions.playerId() : null;
            const Col = window.UF.Colonists;
            const colonistsWere = Col && Col.isEnabled ? Col.isEnabled() : null;
            if (Col && Col.setEnabled) Col.setEnabled(false); // keep them out of the arena and off the test jobs
            const camLevel = UF.Camera ? UF.Camera.level() : 0;
            if (T && T.setLevel) T.setLevel(0);
            if (T && T.pause) T.pause();

            // The arena: 22 x 14 cells of free land (plus a 1-cell margin) away from the camp, cleared of objects.
            const camp = campOf();
            const AW = 22, AH = 14;
            const groundOk = (x, y) => x >= 0 && y >= 0 && x < size && y < size && !Tilemap.isWaterTile($gameMap.tileId(x, y, 0)) && $gameMap.checkPassage(x, y, 0x0f);
            const freeRect = (x0, y0) => {
                for (let y = y0 - 1; y <= y0 + AH; y++) for (let x = x0 - 1; x <= x0 + AW; x++) {
                    if (!groundOk(x, y)) return false;
                    const ty = O.atIn(area, x, y);
                    if (ty && (ty.tags || []).includes("building")) return false;
                    if (I.atIn(area, x, y).length) return false;
                }
                for (const u of W.unitsInArea(area.x, area.y)) if (u.x >= x0 - 1 && u.x <= x0 + AW && u.y >= y0 - 1 && u.y <= y0 + AH) return false;
                return true;
            };
            const centre = camp ? { x: camp.x, y: camp.y } : { x: size >> 1, y: size >> 1 };
            let arena = null;
            for (const r of [40, 48, 56, 34, 64, 72, 80, 90]) {
                for (let k = 0; k < 16 && !arena; k++) {
                    const a = k * Math.PI / 8;
                    const cx = Math.round(centre.x + Math.cos(a) * r), cy = Math.round(centre.y + Math.sin(a) * r);
                    const x0 = cx - (AW >> 1), y0 = cy - (AH >> 1);
                    if (x0 < 2 || y0 < 2 || x0 + AW > size - 3 || y0 + AH > size - 3) continue;
                    if (freeRect(x0, y0)) arena = { x: x0, y: y0 };
                }
                if (arena) break;
            }
            if (!arena) {
                t.check("suite_setup", false, `no ${AW}x${AH} rectangle of free land found around (${centre.x},${centre.y})`);
                if (T && T.resume) T.resume();
                if (Col && Col.setEnabled && colonistsWere !== null) Col.setEnabled(colonistsWere);
                return;
            }
            const ax = arena.x, ay = arena.y;
            const C = (dx, dy) => ({ x: ax + dx, y: ay + dy });
            const savedObjects = [], savedTiles = [];
            for (let y = ay - 2; y <= ay + AH + 1; y++) for (let x = ax - 2; x <= ax + AW + 1; x++) {
                if (x < 0 || y < 0 || x >= size || y >= size) continue;
                savedObjects.push({ x, y, t: O.typeIdIn(area, x, y) });
                savedTiles.push({ x, y, tile: W.getTile(area.x, area.y, x, y, 0) });
            }
            const itemsBefore = new Set(I.all().map(it => it.id));
            const unitsMade = [];
            const jobsMade = [];
            const clearArena = () => {
                for (const k of Object.keys(fireState().burning)) { const p = parseKey(k); if (p && sameArea(p.area, area) && p.x >= ax - 2 && p.x <= ax + AW + 1 && p.y >= ay - 2 && p.y <= ay + AH + 1) extinguish(p.area, p.x, p.y, "out"); }
                for (let y = ay - 1; y <= ay + AH; y++) for (let x = ax - 1; x <= ax + AW; x++) O.setIn(area, x, y, null);
            };
            clearArena();
            const put = (dx, dy, id) => O.setIn(area, ax + dx, ay + dy, id);
            const idAt = (dx, dy) => { const ty = O.atIn(area, ax + dx, ay + dy); return ty ? ty.id : null; };
            const burningAt = (dx, dy) => burningIn(area, ax + dx, ay + dy);
            const ruleOf = id => ruleForType(O.type(id));
            const ignitedCells = [];
            const onIgnite = (a, x, y, cause, objId) => { if (sameArea(a, area)) ignitedCells.push({ x, y, cause, objId }); };
            if (UF.Events) UF.Events.on("fire:ignited", onIgnite);
            const runUntilOut = (cells, maxBeats) => { let n = 0; while (n < maxBeats && cells.some(([dx, dy]) => burningAt(dx, dy))) { Fire.step(1); n++; } return n; };
            if (UF.Camera) UF.Camera.setLevel(1);
            $gamePlayer.locate(ax + 5, ay + 3);
            await t.waitFrames(3);

            try {
                // --- spreads_in_grass: a 9 x 5 field of tall grass with two bushes, lit through the right-click menu, burns live.
                for (let dy = 1; dy <= 5; dy++) for (let dx = 1; dx <= 9; dx++) put(dx, dy, "grass_tuft");
                put(4, 2, "berry_bush");
                put(7, 4, "bush");
                const o0 = C(1, 3);
                const apiOpts = UF.Interact ? UF.Interact.optionsFor(o0.x, o0.y) : [];
                const apiHas = apiOpts.some(o => o.label === "Set on fire");
                let menuLabels = [];
                let chose = false;
                if (UF.Interact && UF.Interact.open) {
                    const win = UF.Interact.open(o0.x, o0.y, { x: 300, y: 260 });
                    menuLabels = win ? win.labels() : [];
                    chose = UF.Interact.choose("Set on fire") === true;
                    if (UF.Interact.isOpen()) UF.Interact.close();
                }
                const litByMenu = burningAt(1, 3);
                const beat0 = fireState().beat;
                T.resume();
                await t.waitUntil(() => fireState().beat - beat0 >= 5, 15000, "5 live beats of fire").catch(() => {});
                T.pause();
                const liveBeats = fireState().beat - beat0;
                await t.waitFrames(12);
                const litCells = [];
                for (let dy = 1; dy <= 5; dy++) for (let dx = 1; dx <= 9; dx++) if (burningAt(dx, dy)) litCells.push([dx, dy]);
                const sp = litCells.length ? Fire.spriteAt(ax + litCells[0][0], ay + litCells[0][1]) : null;
                let spriteOk = false, spriteDetail = "no flame sprite";
                if (sp) {
                    const b = sp.bitmap, f = sp._frame;
                    let opaque = 0;
                    if (b && f) for (let y = f.y; y < f.y + f.height; y += 2) for (let x = f.x; x < f.x + f.width; x += 2) if (b.getAlphaPixel(x, y) > 0) opaque++;
                    const cellObj = O.spriteAt(ax + litCells[0][0], ay + litCells[0][1]);
                    const footY = Math.round($gameMap.adjustY(ay + litCells[0][1]) * TILE + TILE);
                    spriteOk = sp.visible && sp.parent === SceneManager._scene._spriteset._tilemap && opaque > 20 && sp.z === footY + 1 && (!cellObj || cellObj.z < sp.z) && b._ufName && b._ufName.startsWith("UF_GenFlame");
                    spriteDetail = `${b ? b._ufName : "?"} sprite, ${opaque} opaque samples, z ${sp.z} (footY ${footY}), object z ${cellObj ? cellObj.z : "none"}`;
                }
                t.screenshot("grass_fire_spreading");
                const burningNow = litCells.length;
                let extra = 0;
                while (Object.keys(fireState().burning).some(k => { const p = parseKey(k); return p && p.x >= ax && p.x <= ax + 10 && p.y >= ay && p.y <= ay + 6; }) && extra < 80) { Fire.step(1); extra++; }
                let burnt = 0, farthest = 0, ash = 0, grassLeft = 0;
                const hasAsh = UF.Tiles && UF.Tiles.groundBase("ash") !== null && ruleOf("grass_tuft") && ruleOf("grass_tuft").ground === "ash";
                for (let dy = 1; dy <= 5; dy++) for (let dx = 1; dx <= 9; dx++) {
                    const id = idAt(dx, dy);
                    if (id === "grass_tuft" || id === "berry_bush" || id === "bush") { grassLeft++; continue; }
                    burnt++;
                    farthest = Math.max(farthest, Math.abs(dx - 1) + Math.abs(dy - 3));
                    const k = groundKindAt(area, ax + dx, ay + dy);
                    if (k && k.id === "ash") ash++;
                }
                const inArena = c => c.x >= ax - 2 && c.x <= ax + AW + 1 && c.y >= ay - 2 && c.y <= ay + AH + 1;
                const strays = ignitedCells.filter(c => inArena(c) && (c.x < ax + 1 || c.x > ax + 9 || c.y < ay + 1 || c.y > ay + 5 || !["grass_tuft", "berry_bush", "bush"].includes(c.objId)));
                t.check("spreads_in_grass",
                    apiHas && menuLabels.includes("Set on fire") && chose && litByMenu && liveBeats >= 5 && burningNow >= 2 && spriteOk && burnt >= 30 && farthest >= 6 && strays.length === 0 && (!hasAsh || ash === burnt),
                    `menu: api option ${apiHas}, window rows [${menuLabels.join(" | ")}], chosen ${chose}, lit ${litByMenu}; ${liveBeats} live beats -> ${burningNow} cells burning; flame: ${spriteDetail}; after ${extra} more beats ${burnt}/45 burnt (${grassLeft} left), farthest ${farthest} cells from the start, ${ash} on ash ground${hasAsh ? "" : " (no ash rule)"}; ignitions outside the grass: ${strays.length}`);

                // --- stone_stops: grass | grass | boulder column | grass | grass, 3 rows, lit on the west end.
                for (let dy = 8; dy <= 10; dy++) { put(1, dy, "grass_tuft"); put(2, dy, "grass_tuft"); put(3, dy, "granite_boulder"); put(4, dy, "grass_tuft"); put(5, dy, "grass_tuft"); }
                const stoneLit = ignite(area, ax + 3, ay + 9, { cause: "test" });
                for (let dy = 8; dy <= 10; dy++) { ignite(area, ax + 1, ay + dy, { cause: "test" }); ignite(area, ax + 2, ay + dy, { cause: "test" }); } // the whole west side burns against the stone
                let eastEver = false, stoneEver = false, beatsRun = 0;
                for (; beatsRun < 60; beatsRun++) {
                    Fire.step(1);
                    for (let dy = 8; dy <= 10; dy++) { if (burningAt(4, dy) || burningAt(5, dy)) eastEver = true; if (burningAt(3, dy)) stoneEver = true; }
                }
                const westBurnt = [1, 2].every(dx => [8, 9, 10].every(dy => idAt(dx, dy) !== "grass_tuft"));
                const eastIntact = [4, 5].every(dx => [8, 9, 10].every(dy => idAt(dx, dy) === "grass_tuft"));
                const stonesIntact = [8, 9, 10].every(dy => idAt(3, dy) === "granite_boulder");
                t.check("stone_stops", !stoneLit && westBurnt && eastIntact && stonesIntact && !eastEver && !stoneEver,
                    `igniting the boulder: ${stoneLit}; after ${beatsRun} beats west grass burnt ${westBurnt}, boulders intact ${stonesIntact}, east grass intact ${eastIntact}; east ever burned ${eastEver}, stone ever burned ${stoneEver}`);

                // --- tree_to_stump: an oak alone burns for its fuel, then stands as a stump.
                put(8, 9, "oak");
                const oakRule = ruleOf("oak");
                const oakLit = ignite(area, ax + 8, ay + 9, { cause: "test" });
                const fuel0 = oakLit ? fireState().burning[keyOf(area, ax + 8, ay + 9)].fuel : 0;
                const oakBeats = runUntilOut([[8, 9]], 200);
                t.check("tree_to_stump", oakLit && idAt(8, 9) === "stump" && !burningAt(8, 9) && oakBeats === fuel0 && !!oakRule && oakRule.becomes === "stump",
                    `oak lit ${oakLit} with ${fuel0} beats of fuel, went out after ${oakBeats} beats; the cell holds "${idAt(8, 9)}" (rule becomes "${oakRule ? oakRule.becomes : "none"}", doused "${oakRule ? oakRule.dousedBecomes : "-"}")`);

                // --- wall_to_rubble
                put(11, 9, "wall_wood");
                const wallLit = ignite(area, ax + 11, ay + 9, { cause: "test" });
                const wallBeats = runUntilOut([[11, 9]], 200);
                t.check("wall_to_rubble", wallLit && idAt(11, 9) === "rubble" && !burningAt(11, 9),
                    `wooden wall lit ${wallLit}, out after ${wallBeats} beats; the cell holds "${idAt(11, 9)}"`);

                // --- items_destroyed: a straw bed with 2 logs and a stockpile with 3 stones burn out; 2 logs on bare ground nearby stay.
                put(14, 9, "floor_straw");
                put(17, 9, "stockpile");
                const bedItems = I.drop(area, ax + 14, ay + 9, "log", 2).map(it => it.id);
                const pileItems = I.drop(area, ax + 17, ay + 9, "stone", 3).map(it => it.id);
                const control = I.drop(area, ax + 14, ay + 11, "log", 2).map(it => it.id);
                const bedLit = ignite(area, ax + 14, ay + 9, { cause: "test" });
                const pileLit = ignite(area, ax + 17, ay + 9, { cause: "test" });
                const itemBeats = runUntilOut([[14, 9], [17, 9]], 200);
                const bedGone = I.atIn(area, ax + 14, ay + 9).length === 0 && bedItems.every(id => !I.get(id));
                const pileGone = I.atIn(area, ax + 17, ay + 9).length === 0 && pileItems.every(id => !I.get(id));
                const controlKept = control.length > 0 && control.every(id => !!I.get(id)) && I.count({ area, x: ax + 14, y: ay + 11 }, "log") === 2;
                t.check("items_destroyed", bedLit && pileLit && idAt(14, 9) === null && idAt(17, 9) === null && bedGone && pileGone && controlKept,
                    `bed lit ${bedLit}, stockpile lit ${pileLit}, out after ${itemBeats} beats; cells now "${idAt(14, 9)}" / "${idAt(17, 9)}"; items on the bed gone ${bedGone} (${bedItems.length} stack(s)), on the stockpile gone ${pileGone} (${pileItems.length}); 2 logs on bare ground kept ${controlKept}`);

                // --- units_hurt: a unit standing in burning grass is hurt, reacts, thinks, drops its job and walks out;
                // another unit can't step into a burning cell but can step elsewhere.
                put(20, 9, "grass_tuft");
                put(20, 12, "grass_tuft");
                const mk = (name, dx, dy, sheet) => {
                    const u = W.addUnit({ name, image: { characterName: sheet, characterIndex: 0 }, area: copyArea(area), x: ax + dx, y: ay + dy, dir: 2,
                        data: { kind: "test", faction: playerId, inventory: [], equipment: {}, thoughts: [], hp: 20, maxHp: 20 } });
                    unitsMade.push(u.id);
                    return u;
                };
                const hurt = mk("TEST_burned", 20, 9, "$UF_Stock_People1_4");
                const walker = mk("TEST_wary", 21, 12, "$UF_Stock_Actor1_0");
                await t.waitFrames(4);
                const pending = J.create({ type: "move", target: { area: copyArea(area), x: ax + 20, y: ay + 13 }, owner: hurt.id });
                if (pending) jobsMade.push(pending.id);
                ignite(area, ax + 20, ay + 9, { cause: "test" });
                ignite(area, ax + 20, ay + 12, { cause: "test" });
                const popups0 = UF.Combat && Array.isArray(UF.Combat.popups) ? UF.Combat.popups.length : 0;
                const thoughts0 = hurt.data.thoughts.length;
                // Sprites only (VISION V58): the burned unit's sheet gets a hurt column through a sidecar set in code for this
                // check (UF_Anim), and that column must be shown; no code-made motion may start (UF_Combat's _combatAnim, its
                // recoil and red flash). The fire:unitBurned event must carry the unit and the damage.
                const Anim = window.UF && UF.Anim;
                const animApi = !!Anim && typeof Anim.setSidecar === "function" && typeof Anim.sidecar === "function" && typeof Anim.hurtColumns === "function" && typeof Anim.playFrames === "function";
                const HURT_TEST_COL = 1, hurtSheet = hurt.image.characterName;
                const logBefore = animApi ? Anim.log : null;
                if (animApi) {
                    const sc = Anim.sidecar(hurtSheet) || {};
                    Anim.setSidecar(hurtSheet, Object.assign({}, sc, { animations: Object.assign({}, sc.animations || {}, { hurt: [HURT_TEST_COL] }) }));
                    Anim.log = [];
                }
                const burnedEvents = [];
                const onBurned = (u, dmg, died) => { if (u && u.id === hurt.id) burnedEvents.push({ dmg, died }); };
                if (UF.Events && UF.Events.on) UF.Events.on("fire:unitBurned", onBurned);
                const hpBefore = hurt.data.hp;
                Fire.step(1);
                if (UF.Events && UF.Events.off) UF.Events.off("fire:unitBurned", onBurned);
                const hurtEv = W.eventOf(hurt.id);
                const codeMotion = !!(hurtEv && hurtEv._combatAnim);
                const popupOk = !UF.Combat || (UF.Combat.popups || []).length > popups0;
                const eventOk = burnedEvents.length === 1 && burnedEvents[0].dmg === hpBefore - hurt.data.hp;
                const thought = hurt.data.thoughts[0];
                const thoughtOk = !(Col && Col.addThought) || (hurt.data.thoughts.length === thoughts0 + 1 && !!thought && thought.text === cfg.thought.text);
                const fleeing = !!hurt.goal && !burningIn(hurt.goal.area, hurt.goal.x, hurt.goal.y) && (hurt.goal.x !== hurt.x || hurt.goal.y !== hurt.y);
                const jobDropped = !pending || pending.state === "failed";
                const wev = W.eventOf(walker.id);
                const intoFire = wev ? wev.canPass(walker.x, walker.y, 4) : null;
                const elsewhere = wev ? wev.canPass(walker.x, walker.y, 2) : null;
                await t.waitFrames(4); // the sprite shows the hurt frames on its next updates
                const hurtFrames = animApi ? (Anim.log || []).filter(e => e.kind === "frame" && hurtEv && e.eventId === hurtEv.eventId() && e.col === HURT_TEST_COL).length : 0;
                if (animApi) {
                    Anim.setSidecar(hurtSheet, null);
                    Anim.log = logBefore;
                }
                const reacted = popupOk && eventOk && !codeMotion && (!animApi || hurtFrames > 0);
                t.check("units_hurt", hurt.data.hp < 20 && hurt.data.hp >= 20 - cfg.damage[1] && reacted && thoughtOk && fleeing && jobDropped && intoFire === false && elsewhere === true,
                    `hp 20 -> ${hurt.data.hp} (damage ${cfg.damage[0]}-${cfg.damage[1]}); hurt reaction: popup ${UF.Combat ? popupOk : "(no UF.Combat)"}, fire:unitBurned ${burnedEvents.length}x${burnedEvents[0] ? ` (dmg ${burnedEvents[0].dmg})` : ""}, code-made motion ${codeMotion} (must be false, V58), sheet hurt frames ${animApi ? `${hurtFrames} frame(s) of column ${HURT_TEST_COL}` : "not checked (no UF_Anim sidecar API)"}; thought "${thought ? thought.text : "none"}"; job ${pending ? pending.state + (pending.reason ? " (" + pending.reason + ")" : "") : "none"}; walking out to ${hurt.goal ? `(${hurt.goal.x},${hurt.goal.y})` : "nowhere"}; the other unit may step west into the fire: ${intoFire}, south: ${elsewhere}`);
                runUntilOut([[20, 9], [20, 12]], 50);

                // --- douse: (a) a fire inside the camp radius gets an open douse job of the player's faction at once;
                // (b) a worker fetches water beside a water cell and puts out a burning oak from beside it: a dead tree.
                let campOk = false, campDetail = "no camp (UF.Colonists.site() is null)";
                if (camp) {
                    let spot = null, water = null, placedWater = null;
                    for (let r = 3; r < camp.radius - 1 && !spot; r++) {
                        for (let k = 0; k < 24 && !spot; k++) {
                            const a2 = k * Math.PI / 12;
                            const x = Math.round(camp.x + Math.cos(a2) * r), y = Math.round(camp.y + Math.sin(a2) * r);
                            if (!groundOk(x, y) || O.typeIdIn(area, x, y) || W.unitsInArea(area.x, area.y).some(u => u.x === x && u.y === y)) continue;
                            if (NEIGHBORS.some(([dx, dy]) => burns(ruleForType(O.atIn(area, x + dx, y + dy))))) continue;
                            spot = { x, y };
                        }
                    }
                    if (spot) {
                        water = findWater(area, spot.x, spot.y, cfg.douse.waterRadius, null);
                        if (!water) {
                            // No water near the camp in this world: a test water cell 3 cells away (restored afterwards).
                            for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) {
                                const x = spot.x + dx, y = spot.y + dy;
                                if (!groundOk(x, y) || O.typeIdIn(area, x, y)) continue;
                                placedWater = { x, y, tile: W.getTile(area.x, area.y, x, y, 0) };
                                W.setTile(area.x, area.y, x, y, 0, Tilemap.TILE_ID_A1);
                                break;
                            }
                        }
                        const was = O.typeIdIn(area, spot.x, spot.y);
                        O.setIn(area, spot.x, spot.y, "grass_tuft");
                        const lit = ignite(area, spot.x, spot.y, { cause: "camp test" });
                        const key = keyOf(area, spot.x, spot.y);
                        const job = douseJobs().find(j => j.params && j.params.fireKey === key);
                        campOk = lit && !!job && job.state === "open" && job.owner === null && job.params.faction === playerId && playerId !== null && job.priority === cfg.douse.priority;
                        campDetail = `camp (${camp.x},${camp.y}) radius ${camp.radius}: grass lit at (${spot.x},${spot.y}) ${lit}; douse job ${job ? `#${job.id} ${job.state}, owner ${job.owner}, faction ${job.params.faction} (player ${playerId}), priority ${job.priority}` : "NOT created"}${placedWater ? "; a test water cell was placed" : water ? `; water at (${water.x},${water.y})` : ""}`;
                        if (job) J.cancel(job.id, "test over");
                        extinguish(area, spot.x, spot.y, "out");
                        O.setIn(area, spot.x, spot.y, was || null);
                        if (placedWater) W.setTile(area.x, area.y, placedWater.x, placedWater.y, 0, placedWater.tile);
                    } else campDetail = `camp (${camp.x},${camp.y}): no free cell within its radius for the test fire`;
                }
                // (b) the job itself
                const waterCell = C(1, 12);
                W.setTile(area.x, area.y, waterCell.x, waterCell.y, 0, Tilemap.TILE_ID_A1);
                put(4, 12, "oak");
                const worker = mk("TEST_douser", 7, 12, "$UF_Stock_Actor1_0");
                await t.waitFrames(4);
                const treeLit = ignite(area, ax + 4, ay + 12, { cause: "test" });
                const dj = douse(area, ax + 4, ay + 12, { cause: "test" });
                if (dj) jobsMade.push(dj.id);
                const openOk = !!dj && dj.state === "open" && dj.owner === null && dj.params.faction === playerId;
                const assigned = dj ? J.take(worker.id, j => j.id === dj.id) : null;
                const phase1Work = J.handler("douse") ? J.work({ type: "douse", phase: 1, params: {} }, worker) : 0;
                let fireStand = null;
                const onAssignedWork = () => { if (dj && dj.state === "work" && (dj.phase | 0) === 1 && !fireStand) fireStand = { x: worker.x, y: worker.y }; };
                T.resume();
                if (T.setLevel) T.setLevel(3);
                await t.waitUntil(() => { onAssignedWork(); return !dj || dj.state === "done" || dj.state === "failed"; }, 30000, "the douse job to finish").catch(() => {});
                if (T.setLevel) T.setLevel(0);
                T.pause();
                const filled = dj && dj.params.filled;
                const besideWater = !!filled && !!filled.water && isWaterIn(area, filled.water.x, filled.water.y) && Math.abs(filled.x - filled.water.x) + Math.abs(filled.y - filled.water.y) === 1;
                const besideFire = !!fireStand && Math.abs(fireStand.x - (ax + 4)) + Math.abs(fireStand.y - (ay + 12)) === 1;
                const oakRule2 = ruleOf("oak");
                const wantDoused = oakRule2 && oakRule2.dousedBecomes !== undefined ? oakRule2.dousedBecomes : "oak";
                t.check("douse", campOk && treeLit && openOk && !!assigned && dj.state === "done" && besideWater && besideFire && !burningAt(4, 12) && idAt(4, 12) === wantDoused && !!dj.result && dj.result.doused && phase1Work === Math.round(cfg.douse.beats * beatFrames()),
                    `${campDetail}. Arena: oak lit ${treeLit}; job ${dj ? `#${dj.id} opened ${openOk ? "open, faction " + dj.params.faction : "WRONG"}, taken ${!!assigned}, ended ${dj.state}${dj.reason ? " (" + dj.reason + ")" : ""}` : "not created"}; filled at ${filled ? `(${filled.x},${filled.y})` : "-"} beside the water ${filled && filled.water ? `(${filled.water.x},${filled.water.y})` : "-"} (test water at (${waterCell.x},${waterCell.y})): ${besideWater}; worked from ${fireStand ? `(${fireStand.x},${fireStand.y})` : "-"} beside the fire: ${besideFire}; fire at the oak ${burningAt(4, 12) ? "still burning" : "out"}, the cell holds "${idAt(4, 12)}" (want "${wantDoused}"); work at the fire ${phase1Work} ticks = ${cfg.douse.beats} beats`);

                // --- seeded_and_saved: the same state gives the same fire; a save round-trip mid-fire changes nothing.
                const field = [];
                for (let dy = 1; dy <= 4; dy++) for (let dx = 12; dx <= 16; dx++) field.push([dx, dy]);
                const snapshotField = () => ({ objects: field.map(([dx, dy]) => O.typeIdIn(area, ax + dx, ay + dy)), tiles: field.map(([dx, dy]) => W.getTile(area.x, area.y, ax + dx, ay + dy, 0)) });
                const restoreField = s => field.forEach(([dx, dy], i) => { O.setIn(area, ax + dx, ay + dy, s.objects[i] || null); W.setTile(area.x, area.y, ax + dx, ay + dy, 0, s.tiles[i]); });
                for (const [dx, dy] of field) put(dx, dy, "grass_tuft");
                const field0 = snapshotField();
                const fire0 = JsonEx.stringify(fireState());
                const signature = () => JSON.stringify({ objects: field.map(([dx, dy]) => idAt(dx, dy)), burning: Object.keys(fireState().burning).filter(k => { const p = parseKey(k); return !!p && p.x >= ax + 11 && p.x <= ax + 17 && p.y >= ay && p.y <= ay + 5; }).sort().map(k => `${k}=${fireState().burning[k].fuel}/${fireState().burning[k].since}`), beat: fireState().beat, ignited: ignitedCells.filter(c => c.x >= ax + 12 && c.x <= ax + 16).map(c => `${c.x},${c.y}`) });
                const runField = (split) => {
                    ignitedCells.length = 0;
                    ignite(area, ax + 12, ay + 2, { cause: "test" });
                    Fire.step(split);
                    let saveOk = true;
                    if (split < 8) {
                        const json = JsonEx.stringify(W.state.fire);
                        const back = JsonEx.parse(json);
                        saveOk = JSON.stringify(back) === JSON.stringify(W.state.fire) && DataManager.makeSaveContents().ufWorld.fire === W.state.fire;
                        W.state.fire = back; // as a load does: the live object is replaced
                    }
                    Fire.step(8 - split);
                    return { sig: signature(), saveOk };
                };
                const runA = runField(8);
                restoreField(field0);
                W.state.fire = JsonEx.parse(fire0);
                const runB = runField(4);
                restoreField(field0);
                W.state.fire = JsonEx.parse(fire0);
                const runC = runField(8);
                const burntInA = JSON.parse(runA.sig).objects.filter(id => id !== "grass_tuft").length;
                t.check("seeded_and_saved", runA.sig === runB.sig && runA.sig === runC.sig && runB.saveOk && burntInA + JSON.parse(runA.sig).burning.length >= 2,
                    `8 beats from the same state: run A ${runA.sig === runC.sig ? "=" : "!="} run C; with a JsonEx save/load after beat 4: ${runA.sig === runB.sig ? "same" : "DIFFERENT"} (round-trip identical and in makeSaveContents: ${runB.saveOk}); ${burntInA} burnt, ${JSON.parse(runA.sig).burning.length} burning at the end`);
                restoreField(field0);
                clearArena();

                // --- perf: 100 burning cells in view at zoom 1/3, the world running at x1.
                for (let dy = 1; dy <= 10; dy++) for (let dx = 1; dx <= 10; dx++) put(dx, dy, "grass_tuft");
                let lit100 = 0;
                for (let dy = 1; dy <= 10; dy++) for (let dx = 1; dx <= 10; dx++) {
                    if (ignite(area, ax + dx, ay + dy, { cause: "test" })) lit100++;
                    const rec = fireState().burning[keyOf(area, ax + dx, ay + dy)];
                    if (rec) rec.fuel = 100000;
                }
                if (UF.Camera) UF.Camera.setLevel(2);
                $gamePlayer.locate(ax + 6, ay + 6);
                await t.waitFrames(5);
                Fire.resetPerf();
                const beatP = fireState().beat;
                T.resume();
                await t.waitFrames(150);
                T.pause();
                const pf = Fire.perf();
                const perFrame = (pf.layerMs + pf.simMs) / Math.max(1, pf.frames);
                t.screenshot("perf_100_cells");
                t.check("perf", lit100 === 100 && pf.frames >= 140 && pf.sprites >= 100 && fireState().beat - beatP >= 2 && perFrame <= 0.5,
                    `${lit100} cells burning, ${pf.sprites} flame sprites, zoom ${UF.Camera ? UF.Camera.zoom().toFixed(2) : 1}; over ${pf.frames} frames: layer ${(pf.layerMs / Math.max(1, pf.frames)).toFixed(3)} ms/frame (max ${pf.layerMax.toFixed(2)}), ${pf.beats} beats at ${(pf.simMs / Math.max(1, pf.beats)).toFixed(3)} ms (max ${pf.simMax.toFixed(2)}); total ${perFrame.toFixed(3)} ms per frame (budget 0.5)`);
            } finally {
                // Clean up: fires out, test units and jobs gone, items made in the arena removed, objects and ground restored.
                if (UF.Events) UF.Events.off("fire:ignited", onIgnite);
                clearArena();
                for (const id of jobsMade) { const j = J.get(id); if (j && j.state !== "done" && j.state !== "failed") J.cancel(id, "test over"); }
                for (const id of unitsMade) W.removeUnit(id);
                for (const it of I.all()) {
                    if (itemsBefore.has(it.id) || !it.area || !sameArea(it.area, area)) continue;
                    if (it.x >= ax - 2 && it.x <= ax + AW + 1 && it.y >= ay - 2 && it.y <= ay + AH + 1) I.remove(it.id);
                }
                for (const s of savedObjects) O.setIn(area, s.x, s.y, s.t || null);
                for (const s of savedTiles) if (W.getTile(area.x, area.y, s.x, s.y, 0) !== s.tile) W.setTile(area.x, area.y, s.x, s.y, 0, s.tile);
                if (Col && Col.setEnabled && colonistsWere !== null) Col.setEnabled(colonistsWere);
                if (T && T.setLevel) T.setLevel(0);
                if (T && T.resume) T.resume();
                if (UF.Camera) UF.Camera.setLevel(camLevel);
            }
            await t.waitFrames(30);
            const errs = t.errorsSoFar();
            t.check("no_errors", errs.length === 0 && errors.length === 0,
                errs.length || errors.length ? `${errs.length} uncaught, ${errors.length} inside the fire beat or layer; first: ${errs[0] || errors[0]}` : "none during the fire checks");
        });
    }
})();
