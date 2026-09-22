//=============================================================================
// DEUS_Ownership.js - Persistent ownership and assigned-bed sleep (VISION V71/V72)
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Ownership] Entity property ownership, personal bed claims, private quarters designation, and sleep allocation.
 * @author UF project
 * @base DEUS_World
 * @orderAfter DEUS_World
 * @orderAfter DEUS_Objects
 * @orderAfter DEUS_Jobs
 * @orderAfter DEUS_Colonists
 * @orderAfter DEUS_Combat
 * @orderAfter DEUS_Look
 *
 * @help
 * Ownership is saved under UF.World.state.ownership. A claim joins an entity
 * reference (an object cell, item, unit or site) to an owner reference (a unit,
 * faction or "public"). The first live use is beds:
 *
 * - each person is assigned one unclaimed bed in their area, nearest first;
 * - the assignment is also kept in unit.data.bed;
 * - when the sleep need reaches the catalog threshold, ordinary work is
 *   replaced by a reachable sleep job at that bed;
 * - combat, hunger and thirst remain higher priorities;
 * - a destroyed bed immediately loses its claim and assignment;
 * - Look text names an object's owner.
 *
 * Public API:
 *   UF.Ownership.keyOf(ref)
 *   UF.Ownership.claim(ref, owner, { force?, reason? })
 *   UF.Ownership.release(ref, owner?)
 *   UF.Ownership.ownerOf(ref), entryOf(ref), entries()
 *   UF.Ownership.assignBed(unit, bed, { force? }), bedOf(unit)
 *   UF.Ownership.reconcile(area?), scheduleSleep(unit, { frames? })
 *   UF.Ownership.priorityReason(unit), describeAt(area, x, y)
 *
 * Replaced core methods: none (aliases only: Game_Map.prototype.update,
 * DataManager.extractSaveContents and Scene_Boot.prototype.start; Look's
 * public inspection methods and tooltip class are decorated at runtime).
 */

(() => {
    "use strict";

    const VERSION = 1;
    const CHECK_EVERY = 30;
    const RECONCILE_EVERY = 600;
    const URGENT_MARGIN = 0; // hunger and thirst win as soon as their own jobs become due
    const BED_TAG = "bed";
    const LOOK_MARK = " \u00b7 Owned by ";
    const PUBLIC_MARK = " \u00b7 Shared";

    const World = () => (window.UF && UF.World) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;
    const Colonists = () => (window.UF && UF.Colonists) || null;
    const Combat = () => (window.UF && UF.Combat) || null;
    const catalog = () => window.$ufWorldCatalog || null;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    // Records carry z beside area; API handles carry it inside the area.
    // Ground retains its old saved shape and key spelling.
    const zOf = ref => ref && ref.z !== undefined ? ref.z
        : ref && ref.area && ref.area.z !== undefined ? ref.area.z : 0;
    const copyArea = ref => {
        const a = ref.area || ref, z = zOf(ref);
        return Object.assign({ x: a.x | 0, y: a.y | 0 }, z === 0 ? {} : { z });
    };
    const areaKey = ref => {
        const a = copyArea(ref), z = zOf(a);
        return `${a.x},${a.y}${z === 0 ? "" : `,${z}`}`;
    };
    const supported = ref => {
        if (!ref) return false;
        const z = zOf(ref), W = World();
        return Number.isInteger(z) && z >= -2 && z <= 2 && (z === 0 || !!(W &&
            typeof W.viewLevel === "function" && typeof W.levelKey === "function" && typeof W.levelOfMapId === "function"));
    };
    const sameArea = (a, b) => !!a && !!b && areaKey(a) === areaKey(b);
    const cellRecord = ref => {
        const a = copyArea(ref), z = zOf(ref);
        return Object.assign({ area: { x: a.x, y: a.y }, x: ref.x | 0, y: ref.y | 0 }, z === 0 ? {} : { z });
    };
    const distance = (a, b) => Math.max(Math.abs((a.x | 0) - (b.x | 0)), Math.abs((a.y | 0) - (b.y | 0)));
    const isPerson = u => !!(u && u.data && (u.data.kind === "colonist" || u.data.kind === "person"));
    const now = () => (window.UF && UF.Time && UF.Time.ticks ? UF.Time.ticks() : localTicks);

    let localTicks = 0;
    let enabled = true;
    let lastReconcile = -Infinity;
    let hooked = false;
    let lookHooked = false;
    const errors = [];
    let errorCount = 0;

    // Test-only fault switch. It is inert unless UF_Test is active and the
    // launcher explicitly sets UF_TEST_PROVOKE=ownership.<check>|ownership.all.
    function provoked(check) {
        if (!(window.UF && UF.Test && UF.Test.active) || typeof process === "undefined" || !process.env) return false;
        const set = new Set(String(process.env.UF_TEST_PROVOKE || "").split(",").map(s => s.trim()).filter(Boolean));
        return set.has("ownership.all") || set.has(`ownership.${check}`);
    }

    function report(where, e) {
        errorCount++;
        errors.push(`${where}: ${e && e.message ? e.message : e}`);
        if (errors.length > 20) errors.shift();
        console.error(`UF_Ownership ${where}:`, e);
    }

    //-------------------------------------------------------------------------
    // Persistent registry

    function state() {
        const W = World();
        if (!W || !W.state) return null;
        const old = W.state.ownership;
        if (!old || typeof old !== "object" || !old.claims) {
            W.state.ownership = { version: VERSION, claims: {} };
        } else if ((old.version | 0) < VERSION) {
            old.version = VERSION;
        }
        return W.state.ownership;
    }

    function normalizeEntity(ref) {
        if (!ref || typeof ref !== "object") return null;
        const kind = String(ref.kind || "");
        if (kind === "object" && ref.area && Number.isFinite(ref.x) && Number.isFinite(ref.y) && supported(ref)) {
            return Object.assign({ kind }, cellRecord(ref));
        }
        if ((kind === "item" || kind === "unit" || kind === "site") && ref.id !== undefined && ref.id !== null) {
            return { kind, id: ref.id };
        }
        return null;
    }

    function normalizeOwner(owner) {
        if (!owner) return null;
        if (owner.data && owner.id !== undefined) return { kind: "unit", id: owner.id };
        if (owner === "public") return { kind: "public" };
        if (typeof owner !== "object") return null;
        const kind = String(owner.kind || "");
        if (kind === "public") return { kind };
        if ((kind === "unit" || kind === "faction") && owner.id !== undefined && owner.id !== null) return { kind, id: owner.id };
        return null;
    }

    function keyOf(ref) {
        if (typeof ref === "string") {
            if (!ref.startsWith("object:")) return ref;
            const m = ref.match(/^object:(-?\d+),(-?\d+)(?:,(-?\d+))?:(-?\d+),(-?\d+)$/);
            return m ? keyOf({ kind: "object", area: { x: +m[1], y: +m[2] }, z: m[3] === undefined ? 0 : +m[3], x: +m[4], y: +m[5] }) : null;
        }
        const e = normalizeEntity(ref);
        if (!e) return null;
        if (e.kind === "object") return `object:${areaKey(e)}:${e.x},${e.y}`;
        return `${e.kind}:${e.id}`;
    }

    function entryOf(ref) {
        const st = state(), key = keyOf(ref);
        return st && key ? st.claims[key] || null : null;
    }

    function ownerOf(ref) {
        const e = entryOf(ref);
        return e ? Object.assign({}, e.owner) : null;
    }

    function firstOwnerOf(ref) {
        const I = window.UF && UF.Items;
        const itemId = ref && ref.kind === "item" ? ref.id : typeof ref === "number" ? ref : null;
        if (itemId !== null && I && typeof I.get === "function") {
            const it = I.get(itemId);
            if (it && it.firstOwner) return { kind: "unit", id: it.firstOwner };
        }
        const e = entryOf(ref);
        return e ? Object.assign({}, e.owner) : null;
    }

    function sameOwner(a, b) {
        return !!a && !!b && a.kind === b.kind && (a.kind === "public" || a.id === b.id);
    }

    function claim(ref, owner, opts) {
        const st = state(), entity = normalizeEntity(ref), who = normalizeOwner(owner), o = opts || {};
        const key = keyOf(entity);
        if (!st || !key || !who) return null;
        const old = st.claims[key];
        if (old && !sameOwner(old.owner, who) && !o.force) return null;
        const entry = {
            entity,
            owner: who,
            reason: o.reason ? String(o.reason) : (old && old.reason) || "",
            tick: now()
        };
        st.claims[key] = entry;
        emit("ownership:changed", key, entry, old || null);
        return entry;
    }

    function release(ref, owner) {
        const st = state(), key = keyOf(ref);
        if (!st || !key || !st.claims[key]) return false;
        const want = owner === undefined ? null : normalizeOwner(owner);
        if (want && !sameOwner(st.claims[key].owner, want)) return false;
        const old = st.claims[key];
        delete st.claims[key];
        emit("ownership:changed", key, null, old);
        return true;
    }

    const entries = () => {
        const st = state();
        return st ? Object.entries(st.claims).map(([key, value]) => ({ key, entity: Object.assign({}, value.entity), owner: Object.assign({}, value.owner), reason: value.reason, tick: value.tick })) : [];
    };

    //-------------------------------------------------------------------------
    // Beds

    const objectRef = (area, x, y) => Object.assign({ kind: "object" }, cellRecord({ area: copyArea(area), x, y }));
    const isBedType = t => !!(t && Array.isArray(t.tags) && t.tags.includes(BED_TAG));
    function isBedId(id) {
        if (!id) return false;
        if (id === "floor_straw" || id.includes("bed")) return true;
        const O = Objects();
        const t = O && O.type ? O.type(id) : null;
        return isBedType(t);
    }
    const bedExists = bed => {
        const O = Objects();
        return !!(O && bed && bed.area && supported(bed) && isBedType(O.atIn(copyArea(bed), bed.x | 0, bed.y | 0)));
    };

    function bedFromEntry(e) {
        const x = e && e.entity;
        return x && x.kind === "object" ? cellRecord(x) : null;
    }

    function clearUnitBed(unit, expected) {
        if (!unit || !unit.data || !unit.data.bed) return;
        const b = unit.data.bed;
        if (!expected || (sameArea(b, expected) && (b.x | 0) === (expected.x | 0) && (b.y | 0) === (expected.y | 0))) delete unit.data.bed;
    }

    function bedOf(unitOrId) {
        const W = World();
        const unit = typeof unitOrId === "object" ? unitOrId : (W ? W.unit(unitOrId) : null);
        if (!unit || !unit.data || !unit.data.bed) return null;
        const b = unit.data.bed;
        const ref = objectRef(b, b.x, b.y);
        const owner = ownerOf(ref);
        if (!bedExists(b) || !sameOwner(owner, { kind: "unit", id: unit.id })) return null;
        return cellRecord(b);
    }

    function assignBed(unitOrId, bed, opts) {
        const W = World();
        const unit = typeof unitOrId === "object" ? unitOrId : (W ? W.unit(unitOrId) : null);
        const o = opts || {};
        if (!isPerson(unit) || !supported(unit) || !bedExists(bed) || !sameArea(unit, bed)) return null;
        const ref = objectRef(bed, bed.x, bed.y);
        const oldEntry = entryOf(ref);
        if (oldEntry && oldEntry.owner.kind === "unit" && oldEntry.owner.id !== unit.id) {
            if (!o.force) return null;
            clearUnitBed(W && W.unit(oldEntry.owner.id), bed);
        }
        const oldBed = bedOf(unit);
        if (oldBed && keyOf(objectRef(oldBed, oldBed.x, oldBed.y)) !== keyOf(ref)) release(objectRef(oldBed, oldBed.x, oldBed.y), unit);
        const got = claim(ref, unit, { force: !!o.force, reason: "assigned bed" });
        if (!got) return null;
        unit.data.bed = cellRecord(bed);
        emit("ownership:bedAssigned", unit, Object.assign({}, unit.data.bed));
        return Object.assign({}, unit.data.bed);
    }

    function unassignBed(unitOrId) {
        const W = World();
        const unit = typeof unitOrId === "object" ? unitOrId : (W ? W.unit(unitOrId) : null);
        if (!unit) return false;
        const oldBed = bedOf(unit) || (unit.data && unit.data.bed);
        if (oldBed) {
            release(objectRef(oldBed, oldBed.x, oldBed.y), unit);
        }
        if (unit.data) unit.data.bed = null;
        const H = window.UF && UF.Households;
        const h = H && H.of ? H.of(unit) : null;
        if (h) {
            const homes = [h.home, ...(h.home && h.home.annexes ? h.home.annexes : [])].filter(Boolean);
            for (const home of homes) {
                if (Array.isArray(home.beds)) {
                    for (const b of home.beds) {
                        if (b.unitId === unit.id) b.unitId = null;
                    }
                }
            }
        }
        emit("ownership:bedUnassigned", unit, oldBed ? Object.assign({}, oldBed) : null);
        return true;
    }

    function cleanClaims() {
        const W = World(), st = state();
        if (!W || !st) return 0;
        let removed = 0;
        for (const [key, e] of Object.entries(st.claims)) {
            if (!e || !e.entity || !e.owner) {
                delete st.claims[key]; removed++; continue;
            }
            if (e.entity.kind === "object") {
                // A legacy core cannot inspect another level. Preserve its
                // saved claims until a compatible core can validate them.
                if (!supported(e.entity)) continue;
                const object = Objects() && Objects().atIn(copyArea(e.entity), e.entity.x, e.entity.y);
                const invalid = !object || (e.reason === "assigned bed" && !isBedType(object));
                if (invalid) {
                    if (e.reason === "assigned bed" && e.owner.kind === "unit") clearUnitBed(W.unit(e.owner.id), bedFromEntry(e));
                    delete st.claims[key]; removed++;
                }
            } else if (e.owner.kind === "unit" && !W.unit(e.owner.id)) {
                delete st.claims[key]; removed++;
            }
        }
        for (const u of W.units()) {
            if (!u.data || !u.data.bed || !supported(u.data.bed)) continue;
            if (!bedOf(u)) delete u.data.bed;
        }
        return removed;
    }

    const _bedsCache = new Map();
    function areaBeds(area) {
        const W = World(), O = Objects();
        if (!W || !W.state || !O || !area || !supported(area)) return [];
        const k = areaKey(area);
        if (_bedsCache.has(k)) return _bedsCache.get(k);
        const mid = (W.state.size - 1) / 2;
        const res = O.findIn(area, { near: { x: mid, y: mid }, radius: W.state.size * 0.75, tags: [BED_TAG] })
            .map(b => cellRecord({ area: copyArea(area), x: b.x, y: b.y }));
        _bedsCache.set(k, res);
        return res;
    }

    function reconcileArea(area) {
        const W = World();
        if (!W || !W.state || !area || !supported(area)) return { assigned: 0, people: 0, beds: 0 };
        area = copyArea(area);
        _bedsCache.delete(areaKey(area));
        cleanClaims();
        const people = W.unitsInArea(area.x, area.y, zOf(area)).filter(u => isPerson(u) && sameArea(u, area)).sort((a, b) => a.id - b.id);
        const unassigned = people.filter(u => !bedOf(u));
        const allBeds = areaBeds(area);
        const free = allBeds.filter(b => !entryOf(objectRef(b, b.x, b.y)));
        let assigned = 0;
        while (unassigned.length && free.length) {
            let best = null;
            for (let ui = 0; ui < unassigned.length; ui++) for (let bi = 0; bi < free.length; bi++) {
                const u = unassigned[ui], b = free[bi];
                const candidate = { ui, bi, d: distance(u, b), unitId: u.id, y: b.y, x: b.x };
                if (!best || candidate.d < best.d || (candidate.d === best.d && (candidate.unitId < best.unitId ||
                    (candidate.unitId === best.unitId && (candidate.y < best.y || (candidate.y === best.y && candidate.x < best.x)))))) best = candidate;
            }
            if (!best) break;
            const u = unassigned.splice(best.ui, 1)[0];
            const b = free.splice(best.bi, 1)[0];
            if (assignBed(u, b)) assigned++;
        }
        return { assigned, people: people.length, beds: allBeds.length };
    }

    function reconcile(area) {
        const W = World();
        if (!W || !W.state) return { assigned: 0, people: 0, beds: 0, areas: 0 };
        cleanClaims();
        if (area) return Object.assign({ areas: 1 }, reconcileArea(area));
        const seen = new Map();
        for (const u of W.units().filter(isPerson)) if (supported(u)) seen.set(areaKey(u), copyArea(u));
        const total = { assigned: 0, people: 0, beds: 0, areas: seen.size };
        for (const a of seen.values()) {
            const r = reconcileArea(a);
            total.assigned += r.assigned; total.people += r.people; total.beds += r.beds;
        }
        lastReconcile = now();
        return total;
    }

    //-------------------------------------------------------------------------
    // Exhaustion priority

    function thresholds() {
        const c = catalog();
        return (c && c.colony && c.colony.thresholds) || {};
    }

    function priorityReason(unit) {
        if (!unit || !unit.data || !unit.data.needs) return "no needs";
        const C = Combat();
        if (C && typeof C.inCombat === "function" && C.inCombat(unit)) return "danger";
        const n = unit.data.needs, th = thresholds();
        if ((n.thirst || 0) >= (th.thirst || 55) + URGENT_MARGIN) return "thirst";
        if ((n.hunger || 0) >= (th.hunger || 55) + URGENT_MARGIN) return "hunger";
        if ((n.sleep || 0) < (th.sleep || 75)) return "not exhausted";
        if (!bedOf(unit)) return "no assigned bed";
        return "sleep";
    }

    function sleepFrames(unit) {
        const col = Colonists();
        if (col && typeof col.sleepFrames === "function") return col.sleepFrames(unit);
        const c = catalog();
        const hours = (c && c.colony && c.colony.sleepHours) || [22, 6];
        const wake = hours[1] | 0;
        const hour = window.$ufTime ? $ufTime.hour | 0 : 22;
        const left = ((wake - hour + 24) % 24) || 8;
        return Math.max(4, Math.min(10, left)) * 3600;
    }

    function preflightSleep(unit, bed, frames) {
        const J = Jobs();
        const h = J && J.handler("sleep");
        if (!h || typeof h.plan !== "function") return false;
        try {
            const fake = { type: "sleep", target: cellRecord(bed), params: { frames }, assigned: unit.id };
            const r = h.plan(fake, unit);
            return !!r && r.ok !== false;
        } catch (e) {
            report("preflightSleep", e);
            return false;
        }
    }

    function scheduleSleep(unitOrId, opts) {
        const W = World(), J = Jobs(), C = Colonists();
        const unit = typeof unitOrId === "object" ? unitOrId : (W ? W.unit(unitOrId) : null);
        const o = opts || {};
        if (!W || !J || !isPerson(unit) || (!o.force && priorityReason(unit) !== "sleep")) return null;
        const bed = bedOf(unit);
        if (!bed || !supported(unit) || !sameArea(unit, bed)) return null;
        const current = J.of(unit.id);
        if (current && current.type === "sleep" && sameArea(current.target, bed) && current.target.x === bed.x && current.target.y === bed.y) return current;
        const frames = o.frames > 0 ? o.frames | 0 : sleepFrames(unit);
        if (!preflightSleep(unit, bed, frames)) return null;
        let job;
        const colonist = C && typeof C.isColonist === "function" && C.isColonist(unit);
        // The legacy Colonists.order copies only target area/x/y. Keep its
        // Ground behavior, but submit level targets directly without losing z.
        if (zOf(bed) === 0 && colonist && typeof C.order === "function") {
            job = C.order(unit.id, { type: "sleep", target: bed, params: { frames, ownedBed: true } });
        } else {
            if (current) J.cancel(current.id, "exhausted");
            const params = Object.assign({ frames, ownedBed: true }, colonist ? { ordered: true } : {});
            job = J.create({ type: "sleep", target: bed, params, owner: unit.id });
        }
        if (!job || job.state === "failed") return null;
        if (unit.data && Array.isArray(unit.data.thoughts) && C && typeof C.addThought === "function") {
            C.addThought(unit, "Went to sleep in their own bed.", 3);
        }
        emit("ownership:sleepOrdered", unit, job, bed);
        return job;
    }

    function scanSleep() {
        const W = World();
        if (!enabled || !W || !W.state) return 0;
        let count = 0;
        for (const u of W.units().filter(isPerson)) if (priorityReason(u) === "sleep" && scheduleSleep(u)) count++;
        return count;
    }

    //-------------------------------------------------------------------------
    // Inspection text

    function ownerName(owner) {
        if (!owner) return "";
        if (owner.kind === "public") return "Shared";
        if (owner.kind === "unit") {
            const u = World() && World().unit(owner.id);
            return u ? u.name || `unit ${owner.id}` : `unit ${owner.id}`;
        }
        if (owner.kind === "faction") {
            const f = window.UF && UF.Factions && UF.Factions.get ? UF.Factions.get(owner.id) : null;
            return f ? f.name : String(owner.id);
        }
        return String(owner.id || owner.kind);
    }

    function describeAt(area, x, y) {
        if (!area) return "";
        const owner = ownerOf(objectRef(area, x, y));
        if (!owner) return "";
        return owner.kind === "public" ? "Shared" : `Owned by ${ownerName(owner)}`;
    }

    function stripOwnership(text) {
        let s = String(text || "");
        const a = s.indexOf(LOOK_MARK), b = s.indexOf(PUBLIC_MARK);
        const at = a >= 0 && b >= 0 ? Math.min(a, b) : Math.max(a, b);
        if (at >= 0) s = s.slice(0, at);
        return s;
    }

    function decorateLines(lines, x, y) {
        if (!Array.isArray(lines)) return lines;
        const out = lines.slice();
        out[0] = stripOwnership(out[0]);
        const W = World(), area = W && (typeof W.viewLevel === "function" ? W.viewLevel() : W.currentArea ? W.currentArea() : null);
        const owner = area ? ownerOf(objectRef(area, x, y)) : null;
        if (owner) out[0] = `${out[0]}${owner.kind === "public" ? PUBLIC_MARK : LOOK_MARK + ownerName(owner)}`;
        return out;
    }

    function hookLook() {
        const L = window.UF && UF.Look;
        if (lookHooked || !L) return false;
        lookHooked = true;
        const describe = L.describeCell;
        if (typeof describe === "function") L.describeCell = function(x, y) { return decorateLines(describe.call(this, x, y), x, y); };
        const inspect = L.inspect;
        if (typeof inspect === "function") L.inspect = function(x, y) {
            const info = inspect.call(this, x, y);
            if (!info) return info;
            const out = Object.assign({}, info, { lines: decorateLines(info.lines, x, y) });
            if (out.subject && out.lines) out.subject = Object.assign({}, out.subject, { text: out.lines[0] });
            return out;
        };
        const Tip = L.TipSprite;
        if (Tip && Tip.prototype && typeof Tip.prototype.update === "function") {
            const update = Tip.prototype.update;
            Tip.prototype.update = function() {
                update.call(this);
                if (this.visible && this._cell && Number.isFinite(this._cell.x) && Number.isFinite(this._cell.y) && !this._pin) {
                    this.setLines(decorateLines(this._lines, this._cell.x, this._cell.y));
                }
            };
        }
        return true;
    }

    //-------------------------------------------------------------------------
    // Events and engine hooks

    function onObjectsChanged(area, x, y, fromId, toId) {
        try {
            let bedChanged = isBedId(fromId) || isBedId(toId);
            if (fromId && fromId !== toId) {
                const ref = objectRef(area, x, y), e = entryOf(ref);
                if (e) {
                    if (e.reason === "assigned bed") bedChanged = true;
                    if (e.reason === "assigned bed" && e.owner.kind === "unit") clearUnitBed(World() && World().unit(e.owner.id), { area, x, y });
                    release(ref);
                }
            }
            if (bedChanged) _bedsCache.delete(areaKey(area));
            if (enabled && bedChanged) reconcileArea(area);
        } catch (e) { report("objects:changed", e); }
    }

    function hookEvents() {
        if (hooked || !window.UF || !UF.Events) return;
        hooked = true;
        UF.Events.on("world:created", () => { state(); lastReconcile = -Infinity; });
        UF.Events.on("colonists:ready", () => { if (enabled) reconcile(); });
        UF.Events.on("world:unitAdded", u => { if (enabled && isPerson(u)) reconcileArea(copyArea(u)); });
        UF.Events.on("world:unitRemoved", u => {
            try {
                if (!u) return;
                const b = u.data && u.data.bed;
                if (b) release(objectRef(b, b.x, b.y), { kind: "unit", id: u.id });
                cleanClaims();
            } catch (e) { report("unitRemoved", e); }
        });
        UF.Events.on("objects:changed", onObjectsChanged);
        UF.Events.on("objects:levelChanged", onObjectsChanged);
    }

    const Ownership = {
        VERSION,
        state,
        keyOf,
        claim,
        release,
        ownerOf,
        firstOwnerOf,
        entryOf,
        entries,
        assignBed,
        unassignBed,
        bedOf,
        reconcile,
        reconcileArea,
        scheduleSleep,
        priorityReason,
        describeAt,
        ownerName,
        setEnabled(on) { enabled = !!on; },
        isEnabled: () => enabled,
        errors,
        errorCount: () => errorCount,
        _decorateLines: decorateLines
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Ownership = Ownership;

    hookEvents();
    hookLook();

    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);
        localTicks++;
        if (enabled) {
            const t = now();
            if (t % CHECK_EVERY === 0) scanSleep();
            if (t - lastReconcile >= RECONCILE_EVERY) reconcile();
        }
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        try { state(); lastReconcile = -Infinity; } catch (e) { report("load", e); }
    };

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        hookEvents();
        hookLook();
        if (window.UF.Test && UF.Test.active) registerChecks();
        _Scene_Boot_start.call(this);
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "ownership")

    function registerChecks() {
        UF.Test.suite("ownership", async t => {
            const W = UF.World, O = UF.Objects, J = UF.Jobs, Own = Ownership;
            const errors0 = t.errorsSoFar().length, inner0 = errorCount;
            const check = (name, condition, detail) => t.check(name, !!condition && !provoked(name),
                `${detail || ""}${provoked(name) ? "; deliberately provoked through UF_TEST_PROVOKE" : ""}`);
            const area = (typeof W.viewLevel === "function" ? W.viewLevel() : null) || (typeof W.currentArea === "function" ? W.currentArea() : null) || (W.state && W.state.startArea) || { x: 0, y: 0 };
            const priorEnabled = enabled;
            const C = window.UF.Colonists;
            const colonistsEnabled = C && C.isEnabled ? C.isEnabled() : null;
            enabled = false;
            if (C && C.setEnabled) C.setEnabled(false);

            const occupied = (x, y) => W.unitsInArea(area.x, area.y, area.z !== undefined ? area.z : 0).some(u => u.x === x && u.y === y);
            const free = [];
            const size = W.state.size;
            const cx = Math.floor(size / 2), cy = Math.floor(size / 2);
            for (let r = 2; r < 30 && free.length < 6; r++) {
                for (let dy = -r; dy <= r && free.length < 6; dy++) for (let dx = -r; dx <= r && free.length < 6; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                    const x = cx + dx, y = cy + dy;
                    if (!O.atIn(area, x, y) && !occupied(x, y) && J.standable(area, x, y, 0)) free.push({ area: copyArea(area), x, y });
                }
            }
            if (free.length < 6) {
                t.check("arena", false, `found ${free.length} empty passable cells (want 6)`);
                enabled = priorEnabled;
                if (C && C.setEnabled && colonistsEnabled !== null) C.setEnabled(colonistsEnabled);
                return;
            }

            const made = [];
            const mk = (name, cell) => {
                const u = W.addUnit({ name, image: { characterName: "$Adam", characterIndex: 0 }, area: copyArea(area), x: cell.x, y: cell.y, dir: 2,
                    data: { kind: "colonist", faction: "TEST", needs: { hunger: 0, thirst: 0, sleep: 0, social: 0, nature: 0 }, inventory: [], equipment: {}, thoughts: [] } });
                made.push(u.id); return u;
            };
            const A = mk("TEST_Ada", free[0]), B = mk("TEST_Bram", free[3]);
            const bedA = free[1], bedB = free[4];
            O.setIn(area, bedA.x, bedA.y, "floor_straw");
            O.setIn(area, bedB.x, bedB.y, "floor_straw");

            // 1. registry_contract: generic entities may be owned by a faction or shared publicly.
            const siteRef = { kind: "site", id: "TEST_site" };
            const c1 = Own.claim(siteRef, { kind: "faction", id: "TEST" });
            const blocked = Own.claim(siteRef, B);
            const forced = Own.claim(siteRef, "public", { force: true, reason: "test commons" });
            const genericOk = !!c1 && blocked === null && !!forced && Own.ownerOf(siteRef).kind === "public" && Own.release(siteRef, "public") && !Own.ownerOf(siteRef);
            check("registry_contract", genericOk,
                `faction claim ${!!c1}; overwrite without force ${blocked === null ? "refused" : "accepted"}; forced owner ${forced ? forced.owner.kind : "none"}; released ${!Own.ownerOf(siteRef)}`);

            // 2. bed_assignment: one bed per person, bidirectional and persistent in the registry.
            const aBed = Own.assignBed(A, bedA, { force: true }), bBed = Own.assignBed(B, bedB, { force: true });
            const unique = aBed && bBed && Own.keyOf(objectRef(aBed.area, aBed.x, aBed.y)) !== Own.keyOf(objectRef(bBed.area, bBed.x, bBed.y));
            const bidirectional = unique && Own.ownerOf(objectRef(area, bedA.x, bedA.y)).id === A.id && Own.bedOf(A).x === bedA.x && Own.bedOf(B).x === bedB.x;
            check("bed_assignment", !!bidirectional,
                `${A.name} -> (${aBed ? `${aBed.x},${aBed.y}` : "none"}), owner ${JSON.stringify(Own.ownerOf(objectRef(area, bedA.x, bedA.y)))}; ${B.name} -> (${bBed ? `${bBed.x},${bBed.y}` : "none"}); unique ${!!unique}`);

            // 3. inspection_visible: the same public Look text used by the pin shows the owner.
            const lines = window.UF.Look ? UF.Look.describeCell(bedA.x, bedA.y) : null;
            const line = lines && lines[0] || "";
            check("inspection_visible", line.includes("Straw bed") && line.includes(`Owned by ${A.name}`), `Look line at (${bedA.x},${bedA.y}): "${line}"`);
            if (window.UF.Look) {
                $gamePlayer.locate(Math.max(0, bedA.x - 1), bedA.y);
                UF.Look.show(bedA.x, bedA.y, 4);
                await t.waitFrames(10);
                t.screenshot("owned_bed");
            }

            // 4. exhausted_uses_owned_bed: ordinary work is preempted; the short test sleep wakes rested.
            A.data.needs.sleep = thresholds().sleep || 75;
            const oldJob = J.create({ type: "move", target: free[2], owner: A.id });
            const sleep = Own.scheduleSleep(A, { frames: 12 });
            const targetOk = !!sleep && sleep.type === "sleep" && sleep.params.ownedBed === true && sleep.target.x === bedA.x && sleep.target.y === bedA.y;
            await t.waitUntil(() => sleep && (sleep.state === "done" || sleep.state === "failed"), 7000, "the assigned-bed sleep job").catch(() => {});
            const woke = !!sleep && sleep.state === "done" && A.data.needs.sleep === 5;
            check("exhausted_uses_owned_bed", !!oldJob && oldJob.state === "failed" && (oldJob.reason === "ordered elsewhere" || oldJob.reason === "exhausted") && targetOk && woke,
                `old ${oldJob ? `${oldJob.state} (${oldJob.reason})` : "missing"}; sleep ${sleep ? `${sleep.state} at (${sleep.target.x},${sleep.target.y}), ownedBed ${sleep.params.ownedBed}` : "missing"}; need after ${A.data.needs.sleep}`);

            // 5. survival_and_danger_win: hunger and combat leave the current job alone.
            B.data.needs.sleep = 100; B.data.needs.hunger = thresholds().hunger || 55;
            const keep = J.create({ type: "move", target: free[5], owner: B.id });
            const hungryReason = Own.priorityReason(B), hungrySleep = Own.scheduleSleep(B);
            B.data.needs.hunger = 0;
            const combat = Combat(), priorInCombat = combat && combat.inCombat;
            if (combat) combat.inCombat = u => u.id === B.id || (priorInCombat ? priorInCombat.call(combat, u) : false);
            const dangerReason = Own.priorityReason(B), dangerSleep = Own.scheduleSleep(B);
            if (combat) combat.inCombat = priorInCombat;
            check("survival_and_danger_win", hungryReason === "hunger" && hungrySleep === null && dangerReason === "danger" && dangerSleep === null && J.of(B.id) === keep,
                `hungry: reason ${hungryReason}, sleep ${!!hungrySleep}; danger: reason ${dangerReason}, sleep ${!!dangerSleep}; original job still active ${J.of(B.id) === keep}`);

            // 6. destroyed_bed_clears: object removal clears both sides of the assignment.
            O.setIn(area, bedA.x, bedA.y, null);
            const gone = !Own.bedOf(A) && !Own.ownerOf(objectRef(area, bedA.x, bedA.y)) && !A.data.bed;
            check("destroyed_bed_clears", gone,
                `object ${(O.atIn(area, bedA.x, bedA.y) || {}).id || "none"}; bedOf ${JSON.stringify(Own.bedOf(A))}; owner ${JSON.stringify(Own.ownerOf(objectRef(area, bedA.x, bedA.y)))}`);

            // 7. saved: claims and unit assignments survive JsonEx and makeSaveContents.
            const copy = JsonEx.parse(JsonEx.stringify(W.state));
            const contents = DataManager.makeSaveContents();
            const keyB = Own.keyOf(objectRef(area, bedB.x, bedB.y));
            const savedClaim = copy.ownership && copy.ownership.claims[keyB];
            const savedUnitBed = copy.units[B.id] && copy.units[B.id].data && copy.units[B.id].data.bed;
            const saved = !!savedClaim && savedClaim.owner.id === B.id && !!savedUnitBed && savedUnitBed.x === bedB.x &&
                !!contents.ufWorld && contents.ufWorld.ownership === W.state.ownership;
            check("saved", saved,
                `round-trip claim ${savedClaim ? JSON.stringify(savedClaim.owner) : "missing"}; unit bed ${savedUnitBed ? `(${savedUnitBed.x},${savedUnitBed.y})` : "missing"}; save points at live ownership ${!!contents.ufWorld && contents.ufWorld.ownership === W.state.ownership}`);

            // 8. perf: registry reads are O(1); a full current-area reconciliation remains outside a frame budget.
            let t0 = performance.now(), found = 0;
            for (let i = 0; i < 20000; i++) if (Own.ownerOf(objectRef(area, bedB.x, bedB.y))) found++;
            const lookupUs = (performance.now() - t0) * 1000 / 20000;
            t0 = performance.now();
            for (let i = 0; i < 20; i++) Own.reconcileArea(area);
            const reconcileMs = (performance.now() - t0) / 20;
            check("perf", found === 20000 && lookupUs <= 20 && reconcileMs <= 20,
                `20,000 ownerOf calls: ${lookupUs.toFixed(2)} us each (budget 20 us); 20 area reconciliations: ${reconcileMs.toFixed(3)} ms each (budget 20 ms)`);

            if (keep && keep.state !== "done" && keep.state !== "failed") J.cancel(keep.id, "test over");
            for (const id of made) if (W.unit(id)) W.removeUnit(id);
            O.setIn(area, bedA.x, bedA.y, null);
            O.setIn(area, bedB.x, bedB.y, null);
            enabled = priorEnabled;
            if (C && C.setEnabled && colonistsEnabled !== null) C.setEnabled(colonistsEnabled);

            // 9. no_errors
            const newErrors = t.errorsSoFar().slice(errors0), newInner = errorCount - inner0;
            check("no_errors", newErrors.length === 0 && newInner === 0,
                `${newErrors.length} uncaught error(s)${newErrors.length ? `, first: ${newErrors[0]}` : ""}; ${newInner} caught inside UF_Ownership${newInner ? `, last: ${errors[errors.length - 1]}` : ""}`);
        });
    }
})();
