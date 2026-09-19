/*:
 * @target MZ
 * @plugindesc [UF Households] Persistent families and exact, material-built household homes.
 * @author Codex
 * @base UF_Colonists
 * @base UF_Ownership
 * @orderAfter UF_Colonists
 * @orderAfter UF_Ownership
 * @help
 * Keeps existing parentage and explicit adult partnerships; unrelated founders
 * remain separate households. Does not create marriages, babies or objects.
 * planSteps(unit) supplies exact build steps to the colonist planner. Materials,
 * hauling, work and interruptions remain ordinary UF_Jobs operations.
 * Home reservations are same-level, dry 7x7 footprints with a sleeping room,
 * common room, two doors, four bed slots, hearth and storage. No excavation,
 * unsupported upper-floor construction, dining furniture, windows or keys.
 * Saved under UF.World.state.households. Only actual death records mark a
 * person deceased; a missing unit is not presumed dead. No core replacements.
 */
(() => {
    "use strict";
    const W = () => window.UF && UF.World;
    const C = () => window.UF && UF.Colonists;
    const O = () => window.UF && UF.Objects;
    const Own = () => window.UF && UF.Ownership;
    const zOf = r => r && r.z !== undefined ? r.z : r && r.area && r.area.z !== undefined ? r.area.z : 0;
    const areaOf = r => ({ x: r.area.x, y: r.area.y, z: zOf(r) });
    const samePlace = (a, b) => !!a && !!b && !!a.area && !!b.area &&
        a.area.x === b.area.x && a.area.y === b.area.y && zOf(a) === zOf(b);
    const unitOf = u => u && typeof u === "object" ? u : W() && W().unit(u);
    const dead = u => !!(u && u.data && (u.data.dead === true || u.data._isDying === true));
    const person = u => !!(u && u.data && ["colonist", "person"].includes(u.data.kind));
    const adult = u => !!(u && u.data && Number.isFinite(u.data.age) && u.data.age >= 18);
    const tick = () => window.UF && UF.Time && typeof UF.Time.ticks === "function" ? UF.Time.ticks() : W() && W()._frame || 0;
    const day = () => window.$ufTime ? `${$ufTime.year || 0}:${$ufTime.monthIndex || 0}:${$ufTime.day || 0}` : "0:0:0";
    const emit = (event, ...args) => { if (window.UF && UF.Events) UF.Events.emit(event, ...args); };
    const key = (x, y) => `${x},${y}`;
    const has = (o, tag) => !!(o && o.tags && o.tags.includes(tag));
    const SUPPORTED = ["floor_straw", "campfire", "stockpile"];
    const CAPACITY = 4;
    const SEARCH_RINGS = 4; // 80 candidates, never a full-map scan.
    let reconciling = false;

    function state() {
        const w = W();
        if (!w || !w.state) return null;
        const s = w.state.households || (w.state.households = { version: 1, nextId: 1, byId: {}, byUnit: {}, people: {} });
        s.byId = s.byId || {}; s.byUnit = s.byUnit || {}; s.people = s.people || {};
        s.nextId = Math.max(1, s.nextId | 0);
        return s;
    }
    function context(u) {
        const d = u && u.data, c = C() && C().state(u), home = d && d.home;
        if (!d || !d.faction || d.site === undefined || d.site === null) return null;
        const a = c || (home && home.area ? home : u), z = zOf(a);
        if (!a.area || !Number.isInteger(z) || z < -2 || z > 2) return null;
        return { faction: d.faction, siteId: d.site, area: { x: a.area.x, y: a.area.y }, z };
    }
    const fits = (h, c) => !!h && !!c && !h.mergedInto && h.faction === c.faction && h.siteId === c.siteId && samePlace(h, c);
    function all() { const s = state(); return s ? Object.values(s.byId).filter(h => !h.mergedInto) : []; }
    function of(u) { const s = state(), id = u && typeof u === "object" ? u.id : u; return s && s.byId[s.byUnit[id]] || null; }
    function resolve(h) { const s = state(); return h && typeof h === "object" ? h : s && s.byId[h] || null; }
    function members(ref) {
        const h = resolve(ref), s = state();
        return h && s ? (h.members || []).map(unitOf).filter(u => person(u) && !dead(u) && s.byUnit[u.id] === h.id && fits(h, context(u))) : [];
    }
    function remember(u, death = false) {
        const s = state();
        if (!s || !person(u)) return;
        const old = s.people[u.id] || {}, d = u.data;
        s.people[u.id] = Object.assign(old, { id: u.id, name: u.name || "", species: d.species || "human",
            motherId: d.motherId === undefined ? old.motherId || null : d.motherId,
            fatherId: d.fatherId === undefined ? old.fatherId || null : d.fatherId });
        if (death || dead(u)) { old.deceased = true; if (old.deathTick === undefined) old.deathTick = tick(); }
    }
    function join(u, h) {
        const s = state();
        if (!s || !u || !fits(h, context(u))) return null;
        s.byUnit[u.id] = h.id;
        if (!h.members.includes(u.id)) h.members.push(u.id);
        u.data.householdId = h.id;
        return h;
    }
    function make(u) {
        const s = state(), c = context(u);
        if (!s || !c) return null;
        const h = Object.assign({ id: `household:${s.nextId++}`, members: [], foundedTick: tick(), generation: 0, home: null, reason: "No home planned" }, c);
        s.byId[h.id] = h;
        return join(u, h);
    }
    function merge(a, b) {
        if (!a || !b || a.id === b.id || !fits(a, b)) return a;
        // Never discard a constructed/reserved home. A merged record retains its
        // former home reservation until a future explicit moving/demolition rule.
        if ((!a.home && b.home) || (!!a.home === !!b.home && a.foundedTick > b.foundedTick)) [a, b] = [b, a];
        for (const u of members(b)) join(u, a);
        b.mergedInto = a.id;
        emit("households:merged", a, b);
        return a;
    }
    function ancestors(u, depth = 3) {
        const s = state(), seen = new Set(), queue = [[u.id, 0]];
        while (queue.length) {
            const [id, d] = queue.shift();
            if (seen.has(id)) continue;
            seen.add(id);
            const p = s && s.people[id] || (unitOf(id) && unitOf(id).data);
            if (!p || d >= depth) continue;
            for (const parent of [p.motherId, p.fatherId]) if (parent !== undefined && parent !== null) queue.push([parent, d + 1]);
        }
        return seen;
    }
    function closeKin(a, b) {
        if (!a || !b) return true;
        const aa = ancestors(a), bb = ancestors(b);
        return [...aa].some(id => bb.has(id));
    }
    function partnerId(u) { return u && u.data ? u.data.partner || u.data.partnerId || null : null; }
    function pairReason(a, b) {
        if (!person(a) || !person(b) || a.id === b.id || dead(a) || dead(b)) return "not living people";
        if (!adult(a) || !adult(b)) return "adults only";
        if (a.data.familyDesire === false || b.data.familyDesire === false || a.data.willingToPartner === false || b.data.willingToPartner === false) return "unwilling";
        if (!samePlace(a, b) || !fits(Object.assign({ mergedInto: null }, context(a)), context(b))) return "different settlement or level";
        const sa = a.data.species || "human", sb = b.data.species || "human";
        if (sa !== sb || /automaton|undead|swarm/i.test(sa) || a.data.reproduction === false || b.data.reproduction === false) return "incompatible life cycle";
        for (const [u, other] of [[a, b], [b, a]]) {
            const existing = unitOf(partnerId(u));
            if (existing && !dead(existing) && existing.id !== other.id) return "already partnered";
        }
        if (closeKin(a, b)) return "close relatives";
        return null;
    }
    function formPair(a, b) {
        a = unitOf(a); b = unitOf(b);
        reconcile();
        if (pairReason(a, b)) return null;
        a.data.partner = b.id; b.data.partner = a.id;
        const h = merge(of(a) || make(a), of(b) || make(b));
        emit("households:paired", a, b, h);
        return h;
    }
    function generations() {
        const s = state(), memo = {}, visiting = new Set();
        const gen = id => {
            if (memo[id] !== undefined) return memo[id];
            if (visiting.has(id) || visiting.size > 64) return 0;
            const p = s.people[id];
            if (!p) return 0;
            visiting.add(id);
            const ps = [p.motherId, p.fatherId].filter(n => n !== null && n !== undefined);
            const g = ps.length ? 1 + Math.max(...ps.map(gen)) : 0;
            visiting.delete(id); p.generation = g; memo[id] = g;
            return g;
        };
        Object.keys(s.people).forEach(gen);
        for (const h of all()) h.generation = Math.max(0, ...(h.members || []).map(id => memo[id] || 0));
    }
    function reconcile() {
        const s = state(), w = W();
        if (!s || !w || reconciling) return all();
        reconciling = true;
        try {
            const people = w.units().filter(u => person(u) && !dead(u) && context(u)).sort((a, b) => a.id - b.id);
            for (const u of w.units().filter(person)) remember(u);
            for (const u of people) if (!fits(of(u), context(u))) make(u);
            for (const u of people) {
                const p = unitOf(partnerId(u));
                if (p && partnerId(p) === u.id && !pairReason(u, p)) merge(of(u), of(p));
            }
            // A child joins a known parent's household; parenthood does not
            // invent a marriage or merge two unpartnered parents' households.
            for (const u of people) if (!adult(u)) {
                const p = unitOf(u.data.motherId) || unitOf(u.data.fatherId);
                if (p && !dead(p) && fits(of(p), context(u))) {
                    const previous = of(u); join(u, of(p));
                    if (previous && previous.id !== of(p).id && !members(previous).length) previous.mergedInto = of(p).id;
                }
            }
            generations();
            for (const h of all()) if (h.home) syncHome(h);
            return all();
        } finally { reconciling = false; }
    }
    function object(h, p) { return O() && O().atIn(areaOf(h), p.x, p.y); }
    function ref(h, p) { return { kind: "object", area: { x: h.area.x, y: h.area.y }, z: h.z, x: p.x, y: p.y }; }
    function dry(h, x, y) {
        const w = W(), j = window.UF && UF.Jobs;
        return !!(w && w.state && x >= 1 && y >= 1 && x < w.state.size - 1 && y < w.state.size - 1 &&
            w.walkable && w.walkable(h.area.x, h.area.y, x, y, { z: h.z, ground: true }) &&
            !(j && j.isWaterAt && j.isWaterAt(areaOf(h), x, y)));
    }
    function layout(x, y, wall, door) {
        const walls = [], doors = [{ x: x + 3, y: y + 6 }, { x: x + 3, y: y + 3 }];
        for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) {
            if ((dx === 0 || dx === 6 || dy === 0 || dy === 6 || dy === 3) && !doors.some(p => p.x === x + dx && p.y === y + dy)) walls.push({ x: x + dx, y: y + dy });
        }
        const room = [];
        for (let dy = 1; dy <= 2; dy++) for (let dx = 1; dx <= 5; dx++) room.push({ x: x + dx, y: y + dy });
        return { x, y, w: 7, h: 7, wall, door, walls, doors, sleeping: room,
            beds: [[1, 1], [5, 1], [1, 2], [5, 2]].map(p => ({ x: x + p[0], y: y + p[1], unitId: null })),
            hearth: { x: x + 1, y: y + 4 }, storage: { x: x + 5, y: y + 4 },
            entrance: { x: x + 3, y: y + 7 }, steps: [] };
    }
    function footprintOK(h, home, u, reservations, occupied, bootstrap) {
        const built = new Set([...home.walls, ...home.doors, ...home.beds, home.hearth, home.storage].map(p => key(p.x, p.y)));
        for (let y = home.y; y < home.y + 7; y++) for (let x = home.x; x < home.x + 7; x++) {
            const k = key(x, y), p = { x, y }, o = object(h, p);
            if (!dry(h, x, y) || reservations.has(k) || occupied.has(k) || bootstrap.has(k) || has(o, "building") || has(o, "ruin")) return false;
            if (Own() && Own().ownerOf(ref(h, p))) return false;
            if (o && o.passable !== true && (!built.has(k) || !o.actions || !Object.keys(o.actions).length)) return false;
        }
        const e = home.entrance, eo = object(h, e);
        if (!dry(h, e.x, e.y) || (eo && eo.passable !== true) || occupied.has(key(e.x, e.y)) || reservations.has(key(e.x, e.y))) return false;
        const w = W();
        return typeof w.reachable === "function" && w.reachable(areaOf(h), u.x, u.y, e.x, e.y);
    }
    function ensureHome(h, u) {
        if (h.home) return h.home;
        if (h.lastSearchDay === day()) return null;
        h.lastSearchDay = day();
        const c = C() && C().state(u), o = O(), culture = C() && C().culture(u) || {};
        if (!c || !samePlace(h, c) || !o) { h.reason = "No same-level settlement"; return null; }
        let wall = culture.wall || "wall_wood";
        const door = culture.door || "door_wood";
        // Some approved cultures start with a ruin-style wall descriptor that
        // has no recipe. Only their own existing laterWall is a valid fallback.
        if ((!o.type(wall) || !o.type(wall).build) && culture.laterWall && o.type(culture.laterWall) && o.type(culture.laterWall).build) wall = culture.laterWall;
        if ([wall, door, ...SUPPORTED].some(id => !o.type(id) || !o.type(id).build)) { h.reason = "Home building definitions unavailable"; return null; }
        const reserved = new Set(), occupied = new Set(), bootstrap = new Set();
        for (const other of Object.values(state().byId)) if (samePlace(h, other) && other.home) {
            const p = other.home;
            for (let y = p.y - 1; y <= p.y + p.h; y++) for (let x = p.x - 1; x <= p.x + p.w; x++) reserved.add(key(x, y));
        }
        for (const p of W().units()) if (!dead(p) && samePlace(h, p)) occupied.add(key(p.x, p.y));
        for (const s of c.plan || []) for (const [dx, dy] of s.cells || []) bootstrap.add(key(c.site.x + dx, c.site.y + dy));
        for (let r = 1; r <= SEARCH_RINGS; r++) for (let gy = -r; gy <= r; gy++) for (let gx = -r; gx <= r; gx++) {
            if (Math.max(Math.abs(gx), Math.abs(gy)) !== r) continue;
            const candidate = layout(c.site.x - 3 + gx * 9, c.site.y - 3 + gy * 9, wall, door);
            if (footprintOK(h, candidate, u, reserved, occupied, bootstrap)) {
                h.home = candidate; h.reason = "Home reserved; construction needed";
                emit("households:homePlanned", h, candidate);
                return candidate;
            }
        }
        h.reason = "No dry accessible space within the bounded home search";
        return null;
    }
    function syncHome(h) {
        const home = h.home, own = Own(), current = members(h);
        if (!home) return;
        const ids = new Set(current.map(u => u.id));
        for (const b of home.beds) if (!ids.has(b.unitId)) b.unitId = null;
        for (const u of current) if (!home.beds.some(b => b.unitId === u.id)) {
            const b = home.beds.find(b => b.unitId === null);
            if (b) b.unitId = u.id;
        }
        if (own) for (const b of home.beds) {
            const u = unitOf(b.unitId), owner = own.ownerOf(ref(h, b));
            if (u && samePlace(h, u) && object(h, b) && object(h, b).id === "floor_straw" &&
                (!owner || (owner.kind === "unit" && owner.id === u.id))) {
                const assigned = own.bedOf ? own.bedOf(u) : u.data.bed;
                if (!assigned || !samePlace(h, assigned) || assigned.x !== b.x || assigned.y !== b.y) own.assignBed(u, ref(h, b));
            }
        }
        const doors = window.UF && UF.Doors;
        if (doors && doors.stateAt) for (const p of home.doors) {
            // Reserved footprints contained no prior doors; this state belongs
            // to construction for this household, not the default player faction.
            const owner = own && own.ownerOf(ref(h, p));
            if (object(h, p) && object(h, p).id === home.door && (!owner || owner.kind === "faction" && owner.id === h.faction)) {
                const s = doors.stateAt(areaOf(h), p.x, p.y);
                if (s) s.faction = h.faction;
            }
        }
    }
    function planSteps(u) {
        u = unitOf(u);
        if (!person(u) || dead(u)) return [];
        if (!of(u)) reconcile();
        const h = of(u), c = C() && C().state(u);
        if (!h || !c || !samePlace(h, u) || !adult(u)) return [];
        const home = ensureHome(h, u);
        if (!home) return [];
        syncHome(h);
        const previous = new Map((home.steps || []).map(s => [s.id, s]));
        const step = (suffix, build, cells, extras) => {
            const id = `${h.id}_${suffix}`, offsets = cells.map(p => [p.x - c.site.x, p.y - c.site.y]);
            const existing = previous.get(id);
            if (existing && existing.build === build && JSON.stringify(existing.cells) === JSON.stringify(offsets)) return existing;
            // Only a changed step loses its completion/celebration flags. Stable
            // objects let save data and the executor retain real plan progress.
            return Object.assign({ id, build, cells: offsets, exact: true, household: h.id }, extras || {});
        };
        // Exact placement is essential: another household's beds/hearth do not
        // satisfy these steps. The consumer must not count blocked cells as done.
        home.steps = [step("walls", home.wall, home.walls), step("doors", home.door, home.doors),
            step("beds", "floor_straw", home.beds.filter(b => b.unitId !== null)),
            step("hearth", "campfire", [home.hearth]), step("storage", "stockpile", [home.storage], { stores: ["food"] })];
        return home.steps;
    }
    function strictEnclosure(h) {
        const p = h && h.home;
        return !!p && p.walls.every(c => object(h, c) && object(h, c).id === p.wall) &&
            p.doors.every(c => object(h, c) && object(h, c).id === p.door);
    }
    function demands(refH) {
        const h = resolve(refH), people = h ? members(h) : [], p = h && h.home;
        const bedCount = p ? p.beds.filter(b => people.some(u => u.id === b.unitId) && object(h, b) && object(h, b).id === "floor_straw" &&
            (!Own() || !Own().ownerOf(ref(h, b)) || Own().ownerOf(ref(h, b)).kind === "unit" && Own().ownerOf(ref(h, b)).id === b.unitId)).length : 0;
        return { members: people.length, bedrooms: people.length && !strictEnclosure(h) ? 1 : 0,
            beds: Math.max(0, people.length - bedCount), cooking: people.length && !(p && object(h, p.hearth) && object(h, p.hearth).id === "campfire") ? 1 : 0,
            storage: people.length && !(p && object(h, p.storage) && object(h, p.storage).id === "stockpile") ? 1 : 0,
            overflow: Math.max(0, people.length - CAPACITY), blocked: !p && !!(h && h.lastSearchDay !== undefined),
            unsupported: ["dining", "windows", "locks"] };
    }
    function describe(refH) {
        const h = resolve(refH);
        if (!h) return null;
        const d = demands(h), people = members(h);
        return { id: h.id, members: people.map(u => u.id), generation: h.generation, home: h.home,
            complete: d.members > 0 && !d.bedrooms && !d.beds && !d.cooking && !d.storage && !d.overflow,
            demands: d, children: people.filter(u => Number.isFinite(u.data.age) && u.data.age < 18).map(u => u.id), reason: h.reason };
    }
    function roomForPair(a, b) {
        a = unitOf(a); b = unitOf(b);
        if (pairReason(a, b) || partnerId(a) !== b.id || partnerId(b) !== a.id) return null;
        const h = of(a);
        if (!h || of(b) !== h || !samePlace(h, a) || !strictEnclosure(h)) return null;
        const home = h.home, room = new Set(home.sleeping.map(p => key(p.x, p.y)));
        if (W().units().some(u => !dead(u) && u.id !== a.id && u.id !== b.id && samePlace(h, u) && room.has(key(u.x, u.y)))) return null;
        for (const p of home.sleeping) {
            const o = object(h, p);
            if (!dry(h, p.x, p.y) || o && o.passable !== true) return null;
        }
        const doors = window.UF && UF.Doors;
        if (doors && doors.at) for (const p of home.doors) {
            const d = doors.at(areaOf(h), p.x, p.y);
            if (!d || d.state.heldOpen || doors.isOpen && doors.isOpen(areaOf(h), p.x, p.y) ||
                !doors.canUnitPass(a, d) || !doors.canUnitPass(b, d)) return null;
        }
        const aBed = home.beds.find(p => p.unitId === a.id), bBed = home.beds.find(p => p.unitId === b.id);
        if (!aBed || !bBed || !has(object(h, aBed), "bed") || !has(object(h, bBed), "bed")) return null;
        return { householdId: h.id, area: { x: h.area.x, y: h.area.y }, z: h.z,
            spots: [{ x: home.x + 3, y: home.y + 2 }, { x: home.x + 4, y: home.y + 2 }],
            cells: home.sleeping.map(p => ({ x: p.x, y: p.y })), door: ref(h, home.doors[1]) };
    }
    window.UF = window.UF || {};
    UF.Households = { state, all, of, members, reconcile, formPair, pairReason: (a, b) => pairReason(unitOf(a), unitOf(b)),
        closeKin: (a, b) => closeKin(unitOf(a), unitOf(b)), planSteps, demands, describe, roomForPair, CAPACITY };
    let hooked = false;
    function hook() {
        if (hooked || !UF.Events) return;
        hooked = true;
        UF.Events.on("colonists:ready", reconcile);
        UF.Events.on("colonists:born", reconcile);
        UF.Events.on("time:day", reconcile);
        UF.Events.on("jobs:done", job => {
            const h = job && job.params && resolve(job.params.household);
            if (h && h.home) syncHome(h);
        });
        UF.Events.on("world:unitRemoved", u => { if (person(u)) { remember(u, dead(u)); reconcile(); } });
        UF.Events.on("combat:kill", event => { if (event && person(event.target)) remember(event.target, true); });
    }
    const boot = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() { hook(); boot.call(this); };
    const extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) { extract.call(this, contents); reconcile(); };
})();
