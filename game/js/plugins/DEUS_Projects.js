//=============================================================================
// DEUS_Projects.js - Settlement projects: deficits, reserved blueprints, phased jobs
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Projects] Settlement deficit evaluation (shelter, beds, stockpiles), a reserved 5x5 communal shelter blueprint, and phased open construction jobs.
 * @author UF project
 * @base DEUS_Jobs
 * @orderAfter DEUS_Jobs
 * @orderAfter DEUS_Colonists
 *
 * @help
 * The settlement-level planner. Every ~50 s of action time (3000 map updates)
 * it counts what the colony has around its hearth (doors set into walls,
 * beds, stockpiles) against what its population needs, opens a project for
 * a deficit it has a blueprint for, reserves the project's footprint, and
 * posts ordinary open UF_Jobs jobs for the current phase: clearing the site,
 * hauling materials, building, harvesting a material nobody has. Idle
 * colonists take those jobs through their normal open-designation path.
 *
 * Nothing here scans the whole world per frame: the per-frame cost is one
 * tick comparison; the cycle scans a bounded radius around the hearth.
 *
 * API, state, events, assets, and checks: docs/systems/DEUS_Projects.md
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    //-------------------------------------------------------------------------
    // Configuration: catalog.colony.projects overrides these (data over hardcoding)

    const DEFAULTS = {
        cadenceTicks: 3000,      // map updates between full cycles (~50 s at 60 updates/s); domain "action"
        startDelayTicks: 120,    // first cycle this long after the colony exists or a save loads
        perShelter: 8,           // colonists per communal shelter
        perStockpile: 8,         // colonists per stockpile
        scanRadius: 24,          // cells around the hearth counted as the settlement
        siteSearchRadius: 40,    // Chebyshev distance searched for a footprint
        margin: 1,               // free ring kept around a footprint
        materialRadius: 40,      // how far a haul or harvest may reach from the site
        maxOpenJobs: 12,         // posted jobs alive at once per project
        harvestPerMaterial: 2,   // harvest jobs alive at once per missing material
        jobPriority: 0,          // UF_Jobs priority of posted jobs (0 = like any designation)
        recheckTicks: 60,        // a build square somebody stands on is looked at again after this
        retryTicks: 9000,        // a cell whose jobs failed three times waits this long
        logKept: 20
    };

    const BLUEPRINTS = {
        communal_shelter: {
            id: "communal_shelter",
            name: "Communal shelter",
            deficit: "shelter",
            size: 5,
            wall: "wall_wood",
            door: "door_wood",
            hearth: "campfire",
            bed: "floor_straw",
            phases: ["site", "walls", "hearth", "beds"]
        }
    };

    // Build inputs a job accepts in place of the named material (mirrors UF_Jobs' build plan).
    const ACCEPTS = { wood: ["wood", "log"], straw: ["straw", "fiber"], stone: ["stone", "rocks_small"] };
    const CLEAR_ACTIONS = ["chop", "gather", "pick", "quarry", "mine", "dismantle"];
    const CONSTRUCTED_TAGS = ["building", "wall", "door", "bed", "stockpile", "workplace", "furniture", "ruin"];
    const NEIGHBORS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const SITE_SALT = 0x50524f4a; // "PROJ"

    //-------------------------------------------------------------------------
    // Accessors

    const catalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const zOf = o => (o && o.z !== undefined ? o.z : (o && o.area && o.area.z !== undefined ? o.area.z : 0));
    const levelArea = rec => (rec && rec.area ? { x: rec.area.x, y: rec.area.y, z: zOf(rec) } : null);
    const sameLevel = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y && zOf(a) === zOf(b);
    const chebyshev = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
    const cellKey = (x, y) => `${x},${y}`;

    // Ticks = map updates (UF.Time keeps the same count), so speed-up and pause carry over.
    let localTicks = 0;
    const now = () => (window.UF && UF.Time && UF.Time.ticks ? UF.Time.ticks() : localTicks);
    const stamp = () => ({ domain: "action", tick: now() });

    function config() {
        const cat = catalog();
        const over = cat && cat.colony && cat.colony.projects ? cat.colony.projects : null;
        const cfg = Object.assign({}, DEFAULTS, over || {});
        cfg.blueprints = Object.assign({}, BLUEPRINTS, (over && over.blueprints) || {});
        return cfg;
    }
    const blueprint = kind => config().blueprints[kind] || null;

    //-------------------------------------------------------------------------
    // State: UF.World.state.colony.projects = { version, nextId, list: [project] }

    function colony() {
        const W = World();
        return W && W.state && W.state.colony ? W.state.colony : null;
    }
    function projectState(create) {
        const c = colony();
        if (!c) return null;
        if (!c.projects && create) c.projects = { version: 1, nextId: 1, list: [] };
        return c.projects || null;
    }
    const list = filter => {
        const st = projectState(false);
        const all = st ? st.list : [];
        return typeof filter === "function" ? all.filter(filter) : all.slice();
    };
    const get = id => list().find(p => p.id === id) || null;
    const active = () => list(p => p.state === "active");

    function log(p, text) {
        p.log.push({ tick: now(), text });
        const kept = config().logKept | 0;
        while (kept > 0 && p.log.length > kept) p.log.shift();
    }

    //-------------------------------------------------------------------------
    // Blueprint geometry (relative to the footprint origin, its top-left cell)

    function relativeCells(bp) {
        const n = bp.size | 0, mid = Math.floor(n / 2);
        const site = [], walls = [], hearth = [], beds = [];
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                site.push({ x, y, object: null });
                const edge = x === 0 || y === 0 || x === n - 1 || y === n - 1;
                if (edge) walls.push({ x, y, object: x === mid && y === n - 1 ? bp.door : bp.wall });
                else if (x === mid && y === mid) hearth.push({ x, y, object: bp.hearth });
                else beds.push({ x, y, object: bp.bed });
            }
        }
        return { site, walls, hearth, beds };
    }
    function phaseCells(p, bp, phase) {
        const name = bp.phases[phase];
        const rel = relativeCells(bp)[name] || [];
        return rel.map(c => ({ x: p.origin.x + c.x, y: p.origin.y + c.y, object: c.object }));
    }
    const footprint = p => {
        const out = [];
        for (let y = 0; y < p.size; y++) for (let x = 0; x < p.size; x++) out.push({ x: p.origin.x + x, y: p.origin.y + y });
        return out;
    };
    const inFootprint = (p, x, y, pad = 0) =>
        x >= p.origin.x - pad && y >= p.origin.y - pad && x < p.origin.x + p.size + pad && y < p.origin.y + p.size + pad;

    /** The project whose reserved footprint holds the cell, or null. */
    function reservedAt(area, x, y) {
        const hit = active().find(p => sameLevel(levelArea(p.origin), area) && inFootprint(p, x, y, 0));
        return hit ? hit.id : null;
    }

    //-------------------------------------------------------------------------
    // Reading cells

    const hasTag = (t, tag) => !!t && Array.isArray(t.tags) && t.tags.includes(tag);
    const isConstructed = t => !!t && (!!t.build || CONSTRUCTED_TAGS.some(tag => hasTag(t, tag)));
    function clearAction(t) {
        const J = Jobs();
        if (!t || !t.actions || !J) return null;
        for (const a of CLEAR_ACTIONS) if (t.actions[a] && J.handler(a)) return a;
        return null;
    }
    // Fully clearable: a job can remove the object and whatever its harvest leaves (`becomes`) is passable or clearable
    // in turn. An oak chops into a stump that chops away; a berry bush gathers into a bare bush nothing clears.
    function canFullyClear(t, depth = 0) {
        if (!t) return true;
        const action = clearAction(t);
        if (!action) return t.passable === true;
        const def = t.actions[action];
        const next = def && def.becomes ? Objects().type(def.becomes) : null;
        if (!next) return true;
        if (depth >= 4) return false; // remainders that cycle never clear
        return next.passable === true || canFullyClear(next, depth + 1);
    }
    function isWater(area, x, y) {
        const J = Jobs();
        return !!(J && typeof J.isWaterAt === "function" && J.isWaterAt(area, x, y));
    }
    function groundOk(area, x, y) {
        const W = World();
        if (typeof W.walkable === "function") return W.walkable(area.x, area.y, x, y, { z: zOf(area), ground: true });
        return !isWater(area, x, y);
    }
    function standerOn(area, x, y) {
        const W = World();
        if (typeof W.standerAt === "function") return W.standerAt(area.x, area.y, x, y, zOf(area)) || null;
        return W.unitsInArea(area.x, area.y, zOf(area)).find(u => u.x === x && u.y === y) || null;
    }
    const isColonist = u => !!u && !!u.data && u.data.kind === "colonist";

    // What a phase wants from a cell right now.
    function cellStatus(p, cell) {
        const O = Objects(), area = levelArea(p.origin);
        const here = O.atIn(area, cell.x, cell.y);
        if (cell.object && here && here.id === cell.object) return { state: "done", here };
        if (here && isConstructed(here)) return { state: "blocked", here, reason: `${here.name || here.id} is in the way` };
        if (here && (here.passable !== true || !cell.object)) {
            const action = clearAction(here);
            if (action && canFullyClear(here)) return { state: "clear", action, here };
            if (here.passable !== true) return { state: "blocked", here, reason: `${here.name || here.id} can't be cleared` };
        }
        if (!cell.object) return { state: "done", here };
        return { state: "build", here };
    }

    //-------------------------------------------------------------------------
    // Choosing a footprint: nearest valid origin to the hearth, outside the camp ring,
    // the society plan's cells, stockpiles and other projects; ties by the seeded hash.

    function reservedCellSet(c, cfg) {
        const set = new Set();
        const r = (c.radius | 0) + 1;
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) set.add(cellKey(c.site.x + dx, c.site.y + dy));
        for (const step of c.plan || []) {
            if (!step || !step.build || !Array.isArray(step.cells)) continue;
            for (const rel of step.cells) set.add(cellKey(c.site.x + rel[0], c.site.y + rel[1]));
        }
        for (const s of c.stockpiles || []) set.add(cellKey(s.x, s.y));
        for (const p of active()) {
            if (!sameLevel(levelArea(p.origin), levelArea(c))) continue;
            for (let y = -cfg.margin; y < p.size + cfg.margin; y++) for (let x = -cfg.margin; x < p.size + cfg.margin; x++) set.add(cellKey(p.origin.x + x, p.origin.y + y));
        }
        return set;
    }
    function siteValid(area, ox, oy, n, margin, reserved) {
        const W = World(), O = Objects(), size = W.state.size;
        for (let y = oy - margin; y < oy + n + margin; y++) {
            for (let x = ox - margin; x < ox + n + margin; x++) {
                if (x < 1 || y < 1 || x >= size - 1 || y >= size - 1) return false;
                if (reserved.has(cellKey(x, y))) return false;
                if (isWater(area, x, y) || !groundOk(area, x, y)) return false;
                const here = O.atIn(area, x, y);
                if (!here) continue;
                if (isConstructed(here)) return false;
                if (!canFullyClear(here)) return false;
            }
        }
        return true;
    }
    function chooseSite(c, bp, cfg) {
        const W = World(), area = levelArea(c), seed = W.state.seed | 0;
        const n = bp.size | 0, half = Math.floor(n / 2), reserved = reservedCellSet(c, cfg);
        for (let d = 1; d <= cfg.siteSearchRadius; d++) {
            const ring = [];
            for (let dy = -d; dy <= d; dy++) {
                for (let dx = -d; dx <= d; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
                    const cx = c.site.x + dx, cy = c.site.y + dy;
                    ring.push({ cx, cy, h: W.hash32(seed, cx, cy, SITE_SALT) });
                }
            }
            ring.sort((a, b) => (a.h - b.h) || (a.cy - b.cy) || (a.cx - b.cx));
            for (const r of ring) {
                const ox = r.cx - half, oy = r.cy - half;
                if (siteValid(area, ox, oy, n, cfg.margin, reserved)) return { x: ox, y: oy, distance: d };
            }
        }
        return null;
    }

    //-------------------------------------------------------------------------
    // Deficits: what the settlement has around its hearth against what its people need

    function settlementFor(areaRef) {
        const c = colony();
        if (!c) return null;
        if (!areaRef) return c;
        if (sameLevel(levelArea(c), levelArea({ area: areaRef, z: zOf(areaRef) }))) return c;
        for (const k of Object.keys(c.settlements || {})) {
            const s = c.settlements[k];
            if (s && s.area && sameLevel(levelArea(s), levelArea({ area: areaRef, z: zOf(areaRef) }))) return s;
        }
        return null;
    }
    function wallNeighbours(area, x, y) {
        const O = Objects();
        let n = 0;
        for (const [dx, dy] of NEIGHBORS) if (hasTag(O.atIn(area, x + dx, y + dy), "wall")) n++;
        return n;
    }
    function evaluateDeficits(areaRef) {
        const W = World(), O = Objects();
        const s = settlementFor(areaRef);
        if (!W || !W.state || !O || !s || !s.site) return null;
        const cfg = config(), area = levelArea(s);
        const population = W.unitsInArea(area.x, area.y, area.z).filter(isColonist).length;
        const buildings = O.findIn(area, { near: { x: s.site.x, y: s.site.y }, radius: cfg.scanRadius, tags: ["building"], unsorted: true });
        let beds = 0, stockpiles = 0, shelters = 0;
        for (const b of buildings) {
            if (hasTag(b.type, "bed")) beds++;
            if (hasTag(b.type, "stockpile")) stockpiles++;
            if (hasTag(b.type, "door") && wallNeighbours(area, b.x, b.y) >= 2) shelters++;
        }
        const row = (needed, current) => ({ needed, current, deficit: Math.max(0, needed - current) });
        return {
            area: { x: area.x, y: area.y, z: area.z },
            site: { x: s.site.x, y: s.site.y },
            radius: cfg.scanRadius,
            population,
            shelter: row(population > 0 ? Math.ceil(population / cfg.perShelter) : 0, shelters),
            bed: row(population, beds),
            stockpile: row(population > 0 ? Math.max(1, Math.ceil(population / cfg.perStockpile)) : 0, stockpiles),
            evaluatedAt: stamp()
        };
    }
    function explain(areaRef) {
        const d = evaluateDeficits(areaRef);
        if (!d) return "No settlement.";
        const part = (label, r) => `${label} ${r.current}/${r.needed}${r.deficit ? ` (needs ${r.deficit} more)` : ""}`;
        return `${part("Shelter", d.shelter)} · ${part("Beds", d.bed)} · ${part("Stockpiles", d.stockpile)} · ${d.population} colonists within ${d.radius} of (${d.site.x},${d.site.y})`;
    }

    //-------------------------------------------------------------------------
    // Opening and cancelling projects

    function open(kind, opts) {
        const c = colony(), bp = blueprint(kind), st = projectState(true);
        if (!c || !bp || !st) return null;
        const cfg = config();
        const site = (opts && opts.origin) ? { x: opts.origin.x | 0, y: opts.origin.y | 0, distance: 0 } : chooseSite(c, bp, cfg);
        if (!site) return null;
        const record = {
            id: st.nextId++,
            kind: bp.id,
            state: "active",
            phase: 0,
            origin: { area: { x: c.area.x, y: c.area.y }, x: site.x, y: site.y, z: zOf(c) },
            size: bp.size | 0,
            margin: cfg.margin | 0,
            created: stamp(),
            sited: stamp(),
            finished: null,
            jobs: {},
            hauls: {},
            harvests: {},
            failed: {},
            blocked: null,
            recheck: null,
            reason: null,
            log: []
        };
        st.list.push(record);
        log(record, `${bp.name} sited at (${site.x},${site.y}), ${site.distance} from the hearth`);
        emit("projects:opened", record);
        emit("projects:sited", record);
        return record;
    }
    function cancel(id, reason = "cancelled") {
        const p = get(id), J = Jobs();
        if (!p || p.state !== "active") return false;
        if (J) for (const jobId of ownJobIds(p)) J.cancel(jobId, reason);
        p.jobs = {}; p.hauls = {}; p.harvests = {};
        p.state = "cancelled";
        p.reason = reason;
        p.finished = stamp();
        log(p, `cancelled: ${reason}`);
        emit("projects:cancelled", p, reason);
        return true;
    }
    function ownJobIds(p) {
        const ids = new Set();
        for (const k of Object.keys(p.jobs)) ids.add(p.jobs[k]);
        for (const k of Object.keys(p.hauls)) ids.add(p.hauls[k].job);
        for (const k of Object.keys(p.harvests)) ids.add(p.harvests[k].job);
        return [...ids];
    }

    //-------------------------------------------------------------------------
    // Advancing a project: reconcile its jobs, post what the phase needs, step the phase

    const finished = job => !job || job.state === "done" || job.state === "failed";

    function reconcile(p) {
        const J = Jobs();
        const note = (key, job) => {
            if (job && job.state === "failed") {
                const f = p.failed[key] || { count: 0, reason: null, retryAt: 0 };
                f.count++;
                f.reason = job.reason || null;
                if (f.count >= 3) f.retryAt = now() + (config().retryTicks | 0);
                p.failed[key] = f;
            }
        };
        for (const key of Object.keys(p.jobs)) {
            const job = J ? J.get(p.jobs[key]) : null;
            if (finished(job)) { note(key, job); delete p.jobs[key]; }
        }
        for (const itemId of Object.keys(p.hauls)) {
            const job = J ? J.get(p.hauls[itemId].job) : null;
            if (finished(job)) { note(p.hauls[itemId].cell, job); delete p.hauls[itemId]; }
        }
        for (const key of Object.keys(p.harvests)) {
            const job = J ? J.get(p.harvests[key].job) : null;
            if (finished(job)) delete p.harvests[key];
        }
    }
    const openCount = p => Object.keys(p.jobs).length + Object.keys(p.hauls).length + Object.keys(p.harvests).length;
    function retrying(p, key) {
        const f = p.failed[key];
        if (!f || f.count < 3) return false;
        if (now() < f.retryAt) return true;
        delete p.failed[key];
        return false;
    }

    function postJob(p, spec) {
        const J = Jobs();
        if (!J) return null;
        const cfg = config();
        spec.params = Object.assign({ project: p.id, phase: p.phase }, spec.params || {});
        if (spec.priority === undefined) spec.priority = cfg.jobPriority | 0;
        const job = J.create(spec);
        if (job) emit("projects:jobPosted", p, job);
        return job;
    }
    const targetOf = (p, x, y) => ({ area: { x: p.origin.area.x, y: p.origin.area.y }, x, y, z: zOf(p.origin) });

    const accepts = id => ACCEPTS[id] || [id];
    function countOnCell(p, cell, material) {
        const I = Items(), where = { area: { x: p.origin.area.x, y: p.origin.area.y }, z: zOf(p.origin), x: cell.x, y: cell.y };
        let n = 0;
        for (const id of accepts(material)) n += I.count(where, id);
        return n;
    }
    function inFlight(p, cell, material) {
        const key = cellKey(cell.x, cell.y);
        let n = 0;
        for (const itemId of Object.keys(p.hauls)) {
            const h = p.hauls[itemId];
            if (h.cell === key && accepts(material).includes(h.type)) n += h.count | 0;
        }
        return n;
    }
    const activeJobOn = (p, key) => !!p.jobs[key] || Object.keys(p.hauls).some(id => p.hauls[id].cell === key);

    // Ground stacks of a material within reach, nearest first, that nobody has claimed and that don't already lie
    // on a reserved footprint (there they count as delivered).
    function sources(p, cell, material) {
        const I = Items(), J = Jobs(), cfg = config(), area = levelArea(p.origin);
        const out = [];
        for (const id of accepts(material)) {
            const found = I.find({ area: { x: p.origin.area.x, y: p.origin.area.y }, z: zOf(p.origin), near: { x: cell.x, y: cell.y }, radius: cfg.materialRadius, id });
            for (const f of found) {
                if (p.hauls[f.item.id]) continue;
                if (reservedAt(area, f.x, f.y)) continue;
                if (J.reservation && J.reservation.reservedBy(f.item.id)) continue;
                out.push(f);
            }
        }
        out.sort((a, b) => a.dist - b.dist || a.item.id - b.item.id);
        return out;
    }
    // A haul asks for exactly what the cell still needs (params.count); UF_Jobs lifts what the carrier may legally
    // carry of it and leaves the rest on the source cell for the next haul (DEUS-TSK-FABLE-04).
    function postHauls(p, cell, material, missing) {
        const I = Items(), key = cellKey(cell.x, cell.y), cfg = config();
        let left = missing;
        for (const f of sources(p, cell, material)) {
            if (left <= 0 || openCount(p) >= cfg.maxOpenJobs) break;
            const it = f.item;
            const take = Math.min(it.count | 0, left);
            if (take <= 0) continue;
            let carried = it;
            if (take < (it.count | 0)) {
                // Split off exactly what the cell still needs, on the same cell; the rest stays for the next haul.
                const part = I.create(it.type, take, { area: { x: p.origin.area.x, y: p.origin.area.y }, z: zOf(p.origin), x: f.x, y: f.y }, { mat: it.mat, q: it.q });
                if (!part) continue;
                I.consume(it.id, take);
                carried = part;
            }
            const job = postJob(p, { type: "haul", target: targetOf(p, f.x, f.y), params: { itemId: carried.id, count: carried.count | 0, to: targetOf(p, cell.x, cell.y), material } });
            if (!job) continue;
            p.hauls[carried.id] = { job: job.id, cell: key, type: carried.type, count: carried.count | 0 };
            left -= carried.count | 0;
        }
        return missing - left;
    }

    // Objects whose harvest action yields a material: { material: [{ id, action }] } from the catalog.
    let yieldIndex = null, yieldSource = null;
    function harvestSources(material) {
        const cat = catalog();
        const listOf = (cat && cat.objects) || [];
        if (!yieldIndex || yieldSource !== listOf) {
            yieldIndex = {};
            yieldSource = listOf;
            for (const t of listOf) {
                if (!t || !t.actions || isConstructed(t)) continue;
                for (const action of Object.keys(t.actions)) {
                    const y = t.actions[action] && t.actions[action].yields;
                    if (!y) continue;
                    for (const item of Object.keys(y)) (yieldIndex[item] = yieldIndex[item] || []).push({ id: t.id, action });
                }
            }
        }
        const out = [];
        for (const id of accepts(material)) for (const s of yieldIndex[id] || []) out.push(s);
        return out;
    }
    function postHarvests(p, material) {
        const O = Objects(), J = Jobs(), c = colony(), cfg = config();
        if (!O || !J || !c) return 0;
        const area = levelArea(p.origin);
        let alive = 0;
        for (const key of Object.keys(p.harvests)) if (p.harvests[key].material === material) alive++;
        let posted = 0;
        const candidates = [];
        for (const s of harvestSources(material)) {
            if (!J.handler(s.action)) continue;
            for (const f of O.findIn(area, { near: { x: c.site.x, y: c.site.y }, radius: cfg.materialRadius, id: s.id, limit: 6 })) {
                candidates.push({ x: f.x, y: f.y, dist: f.dist, action: s.action });
            }
        }
        candidates.sort((a, b) => a.dist - b.dist || a.y - b.y || a.x - b.x);
        for (const cnd of candidates) {
            if (alive + posted >= cfg.harvestPerMaterial || openCount(p) >= cfg.maxOpenJobs) break;
            const key = cellKey(cnd.x, cnd.y);
            if (p.harvests[key] || reservedAt(area, cnd.x, cnd.y)) continue;
            if (J.list(j => !finished(j) && j.target && j.target.x === cnd.x && j.target.y === cnd.y && sameLevel(levelArea(j.target), area)).length) continue;
            const job = postJob(p, { type: cnd.action, target: targetOf(p, cnd.x, cnd.y), params: { material } });
            if (!job) continue;
            p.harvests[key] = { job: job.id, material };
            posted++;
        }
        return posted;
    }

    function advance(p) {
        const O = Objects(), J = Jobs(), bp = blueprint(p.kind);
        if (!p || p.state !== "active") return null;
        if (!O || !J || !bp) { cancel(p.id, "no blueprint"); return null; }
        const cfg = config(), area = levelArea(p.origin);
        reconcile(p);
        const cells = phaseCells(p, bp, p.phase);
        const summary = { phase: bp.phases[p.phase], total: cells.length, done: 0, todo: 0, blocked: 0, posted: 0, waiting: null, standers: 0 };
        p.blocked = null;
        p.recheck = null;
        for (const cell of cells) {
            const key = cellKey(cell.x, cell.y);
            const s = cellStatus(p, cell);
            if (s.state === "done") { summary.done++; continue; }
            if (s.state === "blocked") { summary.blocked++; p.blocked = { cell: { x: cell.x, y: cell.y }, reason: s.reason, since: stamp() }; continue; }
            summary.todo++;
            if (activeJobOn(p, key) || retrying(p, key) || openCount(p) >= cfg.maxOpenJobs) continue;
            if (s.state === "clear") {
                const job = postJob(p, { type: s.action, target: targetOf(p, cell.x, cell.y) });
                if (job) { p.jobs[key] = job.id; summary.posted++; }
                continue;
            }
            const t = O.type(cell.object);
            const needs = (t && t.build && t.build.items) || {};
            if (t && t.passable !== true && standerOn(area, cell.x, cell.y)) {
                // Somebody stands on the square (often the hauler who just delivered): look again shortly.
                summary.standers++;
                p.recheck = { domain: "action", tick: now() + (cfg.recheckTicks | 0) };
                continue;
            }
            const missing = Object.keys(needs).filter(id => countOnCell(p, cell, id) + inFlight(p, cell, id) < (needs[id] | 0));
            if (!missing.length) {
                if (Object.keys(needs).every(id => countOnCell(p, cell, id) >= (needs[id] | 0))) {
                    const job = postJob(p, { type: "build", target: targetOf(p, cell.x, cell.y), params: { objectId: t.id } });
                    if (job) { p.jobs[key] = job.id; summary.posted++; }
                }
                continue; // else materials are on their way
            }
            for (const id of missing) {
                const want = (needs[id] | 0) - countOnCell(p, cell, id) - inFlight(p, cell, id);
                const got = postHauls(p, cell, id, want);
                if (got > 0) summary.posted += 1;
                if (got < want) {
                    const n = postHarvests(p, id);
                    summary.posted += n;
                    if (!summary.waiting) summary.waiting = id;
                    p.blocked = p.blocked || { cell: { x: cell.x, y: cell.y }, reason: `waiting for ${id}`, since: stamp() };
                }
            }
        }
        if (summary.todo === 0 && summary.blocked === 0) {
            p.phase++;
            if (p.phase >= bp.phases.length) {
                p.state = "done";
                p.finished = stamp();
                p.jobs = {}; p.hauls = {}; p.harvests = {}; p.failed = {};
                log(p, `${bp.name} finished`);
                emit("projects:done", p);
            } else {
                log(p, `phase ${bp.phases[p.phase]} started`);
                emit("projects:phase", p);
                // The new phase's cells are read and its first jobs posted now, not at the next cadence cycle.
                // Bounded: every recursion steps one phase, and a project has bp.phases.length of them.
                const next = advance(p);
                if (next) return next;
            }
        }
        return summary;
    }

    //-------------------------------------------------------------------------
    // The cycle: evaluate, open for a deficit with a blueprint, advance every active project

    function runCycle() {
        const c = colony();
        if (!c) return null;
        const d = evaluateDeficits(null);
        const out = { deficits: d, opened: [], advanced: [] };
        if (d) emit("projects:evaluated", d);
        if (d) {
            const cfg = config();
            for (const kind of Object.keys(cfg.blueprints)) {
                const bp = cfg.blueprints[kind];
                const row = bp && bp.deficit ? d[bp.deficit] : null;
                if (!row) continue;
                const planned = active().filter(p => p.kind === kind).length;
                if (row.deficit - planned > 0) {
                    const p = open(kind);
                    if (p) out.opened.push(p.id);
                }
            }
        }
        for (const p of active()) {
            const s = advance(p);
            if (s) out.advanced.push({ id: p.id, ...s });
        }
        return out;
    }

    //-------------------------------------------------------------------------
    // Timing: one comparison per map update; a cycle on the cadence; a dirty project on the next update

    let enabled = true;
    let nextRunAt = null;          // null = not armed (no colony yet, or just loaded)
    const dirty = new Set();       // project ids whose jobs finished since the last advance
    function onMapUpdate() {
        localTicks++;
        if (!enabled) return;
        const W = World();
        if (!W || !W.state || !W.state.colony) return;
        const t = now();
        if (nextRunAt === null) nextRunAt = t + (config().startDelayTicks | 0);
        if (dirty.size) {
            for (const id of dirty) { const p = get(id); if (p && p.state === "active") advance(p); }
            dirty.clear();
        }
        for (const p of active()) if (p.recheck && t >= p.recheck.tick) advance(p);
        if (t >= nextRunAt) {
            nextRunAt = t + (config().cadenceTicks | 0);
            runCycle();
        }
    }
    function onLoaded() {
        nextRunAt = null;
        dirty.clear();
        yieldIndex = null;
    }

    //-------------------------------------------------------------------------
    // Words for cards and the Look panel

    function describe(ref) {
        const p = typeof ref === "number" ? get(ref) : ref;
        const bp = p ? blueprint(p.kind) : null;
        if (!p || !bp) return "";
        const n = p.size, o = p.origin;
        const head = `${bp.name} #${p.id} at (${o.x},${o.y})-(${o.x + n - 1},${o.y + n - 1})`;
        if (p.state !== "active") return `${head}: ${p.state}${p.reason ? ` (${p.reason})` : ""}`;
        const cells = phaseCells(p, bp, p.phase);
        let done = 0;
        for (const cell of cells) if (cellStatus(p, cell).state === "done") done++;
        const J = Jobs();
        let openJobs = 0, taken = 0;
        for (const id of ownJobIds(p)) {
            const job = J ? J.get(id) : null;
            if (!job || finished(job)) continue;
            if (job.assigned) taken++; else openJobs++;
        }
        return `${head}: phase ${p.phase + 1}/${bp.phases.length} ${bp.phases[p.phase]}, ${done}/${cells.length} cells, ${openJobs} jobs open, ${taken} taken${p.blocked ? `, ${p.blocked.reason}` : ""}`;
    }

    //-------------------------------------------------------------------------
    // The public object

    const Projects = {
        version: 1,
        timers: { cadence: { domain: "action", ticks: DEFAULTS.cadenceTicks }, startDelay: { domain: "action", ticks: DEFAULTS.startDelayTicks } },
        config,
        blueprints: () => config().blueprints,
        blueprint,
        state: () => projectState(false),
        list,
        get,
        active,
        evaluateDeficits,
        explain,
        open,
        cancel,
        advance: id => { const p = get(id); return p ? advance(p) : null; },
        tick: runCycle,
        reservedAt,
        footprint,
        cells: (ref, phase) => {
            const p = typeof ref === "number" ? get(ref) : ref;
            const bp = p ? blueprint(p.kind) : null;
            if (!p || !bp) return [];
            return phaseCells(p, bp, phase === undefined ? p.phase : phase).map(c => Object.assign({}, c, { state: cellStatus(p, c).state }));
        },
        describe,
        setEnabled: on => { enabled = !!on; return enabled; },
        isEnabled: () => enabled,
        _internal: { chooseSite, siteValid, reservedCellSet, cellStatus, canFullyClear, clearAction, relativeCells, harvestSources, onMapUpdate, onLoaded, now }
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Projects = Projects;

    //-------------------------------------------------------------------------
    // Engine aliases (none replaced)

    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive); // UF_World moved the units and UF_Jobs stepped the jobs first
        onMapUpdate();
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        onLoaded();
    };

    let hooked = false;
    function hookEvents() {
        if (hooked || !window.UF || !UF.Events) return;
        hooked = true;
        const mark = job => { if (job && job.params && job.params.project) dirty.add(job.params.project); };
        UF.Events.on("jobs:done", mark);
        UF.Events.on("jobs:failed", mark);
    }
    hookEvents();

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        hookEvents();
        if (window.UF.Test && UF.Test.active) registerChecks();
        _Scene_Boot_start.call(this);
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "projects"; not in the default run: node tools/test_snapshot.js --suite projects)

    function registerChecks() {
        UF.Test.suite("projects", async t => {
            const W = UF.World, J = UF.Jobs, O = UF.Objects;
            const c = colony();
            t.check("colony_present", !!c && !!c.site, c ? `hearth at (${c.site.x},${c.site.y}), radius ${c.radius}` : "no colony state");
            const d = evaluateDeficits(null);
            t.check("deficits_year1", !!d && d.population >= 2 && d.shelter.needed >= 1 && d.shelter.current === 0,
                d ? explain(null) : "no deficits");
            // The plugin's own first cycle may already have run (start delay 120 ticks); either way exactly one project.
            const cycle = runCycle();
            const p = active()[0] || null;
            t.check("project_opened", !!p && p.kind === "communal_shelter" && list().length === 1 && !!cycle,
                p ? `${describe(p)} (${cycle.opened.length ? "opened by this cycle" : "opened by the plugin's own cycle"})` : "no active project");
            const area = p ? levelArea(p.origin) : null;
            const centre = p ? { x: p.origin.x + Math.floor(p.size / 2), y: p.origin.y + Math.floor(p.size / 2) } : null;
            t.check("site_reserved", !!p && reservedAt(area, p.origin.x, p.origin.y) === p.id && !reservedAt(area, c.site.x, c.site.y) &&
                chebyshev(centre.x, centre.y, c.site.x, c.site.y) > (c.radius | 0) + 1 + Math.floor(p.size / 2),
                p ? `origin (${p.origin.x},${p.origin.y}) reserved, centre ${chebyshev(centre.x, centre.y, c.site.x, c.site.y)} from the hearth` : "no project");
            const own = () => J.list(j => j.params && j.params.project === (p && p.id) && !finished(j));
            t.check("jobs_posted", own().length >= 1 && own().every(j => !j.owner && j.state === "open"),
                `${own().length} open project jobs: ${own().slice(0, 4).map(j => `${j.type}@${j.target.x},${j.target.y}`).join(" ")}`);
            // The posted job is an ordinary UF_Jobs job: assigned the way an overseer order is, it plans a stand cell,
            // reserves its target, and the colonist walks there and does it on the real map. (Autonomous pick-up is
            // UF_Colonists' decision loop, which decides nothing in the current tree.)
            const job = own().find(j => !j.assigned) || null;
            const colonists = W.unitsInArea(area ? area.x : 0, area ? area.y : 0, area ? area.z : 0).filter(isColonist);
            const worker = job ? colonists.slice().sort((a, b) => chebyshev(a.x, a.y, job.target.x, job.target.y) - chebyshev(b.x, b.y, job.target.x, job.target.y))[0] : null;
            const assigned = job && worker ? J.assign(job.id, worker.id) : null;
            t.check("job_assigned_in_engine", !!assigned && assigned.state !== "failed" && !!assigned.stand && J.reservation.reservedBy(assigned.target) === worker.id,
                assigned ? `${J.describe(assigned)} -> #${worker.id} ${worker.name}: ${assigned.state}${assigned.reason ? ` (${assigned.reason})` : ""}, stand (${assigned.stand && assigned.stand.x},${assigned.stand && assigned.stand.y}), target reserved by ${J.reservation.reservedBy(assigned.target)}` : "nothing to assign");
            const before = assigned ? O.atIn(area, assigned.target.x, assigned.target.y) : null;
            if (UF.Time && UF.Time.setLevel) UF.Time.setLevel(3);
            try {
                await t.waitUntil(() => !assigned || finished(assigned), 60000, "the assigned project job to finish");
            } catch (e) { /* reported by the check */ }
            if (UF.Time && UF.Time.setLevel) UF.Time.setLevel(0);
            const after = assigned ? O.atIn(area, assigned.target.x, assigned.target.y) : null;
            // A site-clearing job targets a footprint cell (its state must leave "clear"); a harvest for a missing
            // material targets a tree or stone pile outside the footprint (the object on the cell must change).
            const onFootprint = assigned ? reservedAt(area, assigned.target.x, assigned.target.y) === p.id : false;
            const cellNow = assigned && onFootprint ? Projects.cells(p).find(c => c.x === assigned.target.x && c.y === assigned.target.y) : null;
            t.check("job_done_in_engine", !!assigned && assigned.state === "done" && (!after || !before || after.id !== before.id) && (!onFootprint || (!!cellNow && cellNow.state !== "clear")),
                assigned ? `${J.describe(assigned)}: ${assigned.state}${assigned.reason ? ` (${assigned.reason})` : ""}; cell held ${before ? before.id : "nothing"}, now ${after ? after.id : "nothing"}; ${onFootprint ? `footprint cell state ${cellNow ? cellNow.state : "?"}` : "a harvest outside the footprint"}` : "nothing assigned");
            if (p && window.$gamePlayer && $gamePlayer.locate) $gamePlayer.locate(centre.x, centre.y);
            await t.waitFrames(2);
            t.screenshot("site");
            const live = projectState(false);
            const copy = JSON.parse(JSON.stringify(live));
            let same = true;
            try { require("assert").deepStrictEqual(copy, live); } catch (e) { same = false; }
            t.check("saved", same && DataManager.makeSaveContents().ufWorld.colony.projects === live, same ? "JSON round trip identical; live projects in the save contents" : "round trip differs");
            t.check("no_errors", t.errorsSoFar().length === 0, `${t.errorsSoFar().length} errors`);
        }, { isDefault: false });
    }
})();
