//=============================================================================
// DEUS_Projects.js - Settlement projects: deficits, reserved blueprints, phased jobs
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Projects] Settlement deficits (shelter, food, sheltered beds, storage), the brain that picks one project per cycle, reserved blueprints, and phased open jobs.
 * @author UF project
 * @base DEUS_Jobs
 * @orderAfter DEUS_Jobs
 * @orderAfter DEUS_Colonists
 *
 * @help
 * The settlement-level planner. Every ~50 s of action time (3000 map updates)
 * it counts what the colony has around its hearth (doors set into walls,
 * colonist-days of food, beds under a roof, storage slots) against what its
 * population needs, ranks the four blueprints by how much of each need is
 * still unmet once active projects are counted, opens the best one, reserves
 * its cells, and posts ordinary open UF_Jobs jobs for the current phase:
 * clearing the site, hauling materials, building, harvesting a material
 * nobody has, foraging food into the larder. Idle colonists take those jobs
 * through their normal open-designation path.
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
        perShelter: 0,           // colonists per communal shelter; 0 = the communal_shelter blueprint's bed count (11 for the 6x6)
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
        staleTicks: 600,         // an untaken haul or harvest job every colonist found undoable for this long is withdrawn (one game hour)
        giveUpTicks: 43200,      // a project with nothing workable for this long (three days) is cancelled and its kind cooled; 0 = never
        logKept: 20,
        // The settlement brain (DEUS-TSK-FABLE-06)
        targetReserveDays: 3,    // food: colonist-days of nutrition kept within reach (24 colonist-days for 8 founders)
        slotsPerColonist: 1,     // storage: physical slots each colonist needs
        slotsPerStockpileCell: 1, // storage: physical 1-to-1 occupancy (1 cell = 1 slot)
        forageJobs: 4,           // food: gather jobs alive at once for a food cache
        reserveMarginDays: 0.5,  // food: a cache forages this much past the target, so a meal does not reopen one at once
        kindCooldownTicks: 6000, // a kind whose project could not be sited or supplied is not tried again for this long
        // Hearths and homes (DEUS-TSK-FABLE-16)
        hearthClearance: 1,      // no bed or other furnishing within this many orthogonal steps of a blueprint's hearth (a walkway, no fuel against the fire)
        cottageBeds: 3,          // household_cottage: beds for the household's members, at most this many
        villageFoodDays: 3,      // phase: village once the communal shelter stands, storage holds and the reserve covers this many days
        townPopulation: 16,      // phase: town at this population
        severity: { shelter: 3, food: 2, foodCritical: 4, bed: 1.5, storage: 1, housing: 2.5 },
        survivalBonus: { foodCritical: 5, shelter: 2 },
        phaseBonus: { housing: 1 } // village and town: added to housing's utility (camp never opens a cottage)
    };

    // Blueprints. `kind` "footprint": a square site chosen outside the camp (cells from the geometry below);
    // "task": cells chosen inside existing settlement space, or no cells at all (a forage quota).
    // A blueprint's `hearth` names a contained fire source (DEUS-TSK-FABLE-16): "hearth" resolves through hearthId()
    // to the first of hearth / kitchen_hearth the catalog defines (stone-built; UF_Fire treats both as contained), and
    // only when neither exists to a campfire, which the finished building marks contained (UF.Fire.setContained).
    const HEARTH_FALLBACKS = ["hearth", "kitchen_hearth", "campfire"];
    const BLUEPRINTS = {
        communal_shelter: {
            id: "communal_shelter",
            name: "Communal shelter",
            deficit: "shelter",
            kind: "footprint",
            size: 6,                 // 6x6: 20 wall and door cells, a hearth, its four clearance cells, 11 beds (8 founders and room for arrivals)
            wall: "wall_wood",
            door: "door_wood",
            hearth: "hearth",
            bed: "floor_straw",
            phases: ["site", "walls", "hearth", "beds"]
        },
        household_cottage: {
            id: "household_cottage",
            name: "Cottage",
            deficit: "housing",
            kind: "footprint",
            size: 5,                 // 5x5: 16 wall and door cells, a hearth with its clearance, up to cottageBeds beds on the corners, a chest
            wall: "wall_wood",
            door: "door_wood",
            hearth: "hearth",
            bed: "floor_straw",
            chest: "chest_wood",
            phases: ["site", "walls", "hearth", "beds", "chest"]
        },
        // One dwelling blueprint (Rule 14, one source of truth per concept): a second kind for the same deficit
        // would let two dwellings open beside each other for the same household. Variants belong in the catalog's
        // colony.projects.blueprints override, not here.
        communal_stockpile: {
            id: "communal_stockpile",
            name: "Communal stockpile",
            deficit: "storage",
            kind: "footprint",
            size: 3,
            fill: "stockpile",
            stores: ["wood", "stone", "metal", "material"],
            phases: ["site", "stockpile"]
        },
        bedding_expansion: {
            id: "bedding_expansion",
            name: "Bedding",
            deficit: "bed",
            kind: "task",
            bed: "floor_straw",
            phases: ["beds"]
        },
        food_cache: {
            id: "food_cache",
            name: "Food cache",
            deficit: "food",
            kind: "task",
            larder: "stockpile",
            stores: ["food"],
            phases: ["larder", "forage"]
        }
    };
    const DEFICITS = ["shelter", "food", "bed", "storage", "housing"];
    const PHASES = ["camp", "village", "town"];
    const WORKING_AGE = 15; // a household needs a member of working age to ask for a dwelling (UF_Colonists' own line)

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
        // The blueprint set never changes with the phase: the brain gates a cottage on the phase (phaseOk), and
        // UF_Households reads blueprint("household_cottage") to know this planner owns housing in every phase.
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

    /** The object id a blueprint's hearth builds: the first of HEARTH_FALLBACKS (after bp.hearth itself) the catalog defines. */
    function hearthId(bp) {
        const O = Objects();
        const wanted = bp && bp.hearth ? [bp.hearth].concat(HEARTH_FALLBACKS.filter(id => id !== bp.hearth)) : HEARTH_FALLBACKS;
        for (const id of wanted) if (O && O.type(id)) return id;
        return bp && bp.hearth ? bp.hearth : "campfire";
    }
    /**
     * A footprint blueprint's cells relative to its origin. The perimeter is wall with the door at the bottom middle;
     * the hearth sits at (mid, mid); its orthogonal neighbours within hearthClearance stay free of every furnishing
     * (a walkway from the door, no straw against the fire: DEUS-TSK-FABLE-16); the other interior cells take beds
     * (bedCount of them at most, nearest the top-left first) and, when the blueprint has one, a chest on the last cell.
     */
    function relativeCells(bp, bedCount) {
        const n = bp.size | 0, mid = Math.floor(n / 2), clearance = Math.max(0, config().hearthClearance | 0);
        const site = [], walls = [], hearth = [], beds = [], chest = [], clear = [], fill = [], free = [];
        const nearHearth = (x, y) => !!bp.hearth && !(x === mid && y === mid) && Math.abs(x - mid) + Math.abs(y - mid) <= clearance;
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                site.push({ x, y, object: null });
                if (bp.fill) { fill.push({ x, y, object: bp.fill, stores: bp.stores || null }); continue; }
                const edge = x === 0 || y === 0 || x === n - 1 || y === n - 1;
                if (edge) walls.push({ x, y, object: x === mid && y === n - 1 ? bp.door : bp.wall });
                else if (bp.hearth && x === mid && y === mid) hearth.push({ x, y, object: hearthId(bp), role: "hearth" });
                else if (nearHearth(x, y)) clear.push({ x, y, object: null, role: "clearance" });
                else free.push({ x, y });
            }
        }
        if (bp.chest && free.length) { const c = free.pop(); chest.push({ x: c.x, y: c.y, object: bp.chest, role: "chest" }); }
        const want = Number.isFinite(bedCount) ? Math.max(0, bedCount | 0) : free.length;
        for (const c of free) { if (beds.length >= want) break; if (bp.bed) beds.push({ x: c.x, y: c.y, object: bp.bed, role: "bed" }); }
        const out = { site, walls, hearth, beds, chest, clearance: clear };
        if (bp.fill) out[bp.fill === "stockpile" ? "stockpile" : bp.fill] = fill;
        return out;
    }
    /**
     * The blueprint as this project was laid out: its own recorded size wins (DEUS-TSK-FABLE-17). A communal shelter
     * opened before the 6x6 blueprint is a 5x5 record in the save; computing its cells from the new size would put
     * walls, beds and the hearth on the wrong squares.
     */
    function layoutOf(p, bp) {
        const b = bp || blueprint(p.kind);
        if (!b || !((p.size | 0) > 0) || (p.size | 0) === (b.size | 0)) return b;
        return Object.assign({}, b, { size: p.size | 0 });
    }
    // A phase's cells: a task project carries its own absolute cells (chosen when it opened); a footprint project
    // takes them from its layout at its origin.
    function phaseSpec(p, bp, phase) {
        if (Array.isArray(p.phases) && p.phases[phase]) return p.phases[phase];
        const name = bp.phases[phase];
        const rel = relativeCells(layoutOf(p, bp), p.bedCount)[name] || [];
        return { name, task: null, cells: rel.map(c => ({ x: p.origin.x + c.x, y: p.origin.y + c.y, object: c.object, stores: c.stores || null, role: c.role || null })) };
    }
    /** A finished footprint project's hearth cell (absolute), or null. */
    function hearthCellOf(p) {
        const bp = layoutOf(p);
        if (!bp || !bp.hearth || !((p.size | 0) > 0)) return null;
        const h = relativeCells(bp, p.bedCount).hearth[0];
        return h ? { x: p.origin.x + h.x, y: p.origin.y + h.y } : null;
    }
    const phaseCells = (p, bp, phase) => phaseSpec(p, bp, phase).cells;
    const phaseName = (p, bp, phase) => (Array.isArray(p.phases) && p.phases[phase] ? p.phases[phase].name : bp.phases[phase]);
    const phaseCount = (p, bp) => (Array.isArray(p.phases) ? p.phases.length : bp.phases.length);
    /** Every cell the project holds: the square of a footprint project, the chosen cells of a task project. */
    const footprint = p => {
        if (Array.isArray(p.phases)) {
            const seen = new Set(), out = [];
            for (const ph of p.phases) for (const c of ph.cells || []) { const k = cellKey(c.x, c.y); if (!seen.has(k)) { seen.add(k); out.push({ x: c.x, y: c.y }); } }
            return out;
        }
        const out = [];
        for (let y = 0; y < p.size; y++) for (let x = 0; x < p.size; x++) out.push({ x: p.origin.x + x, y: p.origin.y + y });
        return out;
    };
    const inFootprint = (p, x, y, pad = 0) => {
        if (Array.isArray(p.phases)) return p.phases.some(ph => (ph.cells || []).some(c => Math.abs(c.x - x) <= pad && Math.abs(c.y - y) <= pad));
        return x >= p.origin.x - pad && y >= p.origin.y - pad && x < p.origin.x + p.size + pad && y < p.origin.y + p.size + pad;
    };

    /** The project whose reserved cells hold the cell, or null. */
    function reservedAt(area, x, y) {
        const hit = active().find(p => sameLevel(levelArea(p.origin), area) && inFootprint(p, x, y, 0));
        return hit ? hit.id : null;
    }
    /** Finished footprint projects and their ground, for other planners to keep clear of: [{ id, kind, origin, size, cells }] (DEUS-TSK-FABLE-13). */
    const structures = () => list(p => p.state === "done" && (p.size | 0) > 0).map(p => ({ id: p.id, kind: p.kind, origin: { x: p.origin.x, y: p.origin.y }, size: p.size | 0, cells: footprint(p) }));

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
        // A hearth cell already holding a fire source (a campfire an older blueprint built) is done: the finished
        // building marks it contained rather than tearing it out (DEUS-TSK-FABLE-16).
        if (cell.role === "hearth" && here && hasTag(here, "fire")) return { state: "done", here };
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
            if (Array.isArray(p.phases)) { for (const cell of footprint(p)) set.add(cellKey(cell.x, cell.y)); continue; }
            for (let y = -cfg.margin; y < p.size + cfg.margin; y++) for (let x = -cfg.margin; x < p.size + cfg.margin; x++) set.add(cellKey(p.origin.x + x, p.origin.y + y));
        }
        return set;
    }
    // Sheltered space: the interior of every finished roofed blueprint (communal shelters and cottages: every cell
    // inside the walls but the hearth, so a bed anywhere under the roof counts, an older shelter's too), and the
    // camp's own interior inside its ring. Where a new bed may go is beddingCells' business (never against a fire).
    // (UF.Rooms' enclosure detection is not consulted yet; the sheltered set is what this planner built or was given.)
    function shelteredCells(c) {
        const set = new Set();
        const r = Math.max(0, (c.radius | 0) - 1);
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx || dy) set.add(cellKey(c.site.x + dx, c.site.y + dy));
        for (const p of list(q => q.state === "done" && (q.size | 0) > 0)) {
            const bp = layoutOf(p);
            if (!bp || !bp.bed || !bp.hearth || !sameLevel(levelArea(p.origin), levelArea(c))) continue;
            const rel = relativeCells(bp, p.bedCount);
            for (const cell of rel.beds.concat(rel.clearance, rel.chest)) set.add(cellKey(p.origin.x + cell.x, p.origin.y + cell.y));
        }
        return set;
    }
    // Whether a cell touches a fire source (an object with the "fire" tag) orthogonally within `steps`: no bed goes
    // there (DEUS-TSK-FABLE-16: a straw bed against the camp's open fire is how the shelter burned).
    function nextToFire(area, x, y, steps) {
        const O = Objects();
        for (let dy = -steps; dy <= steps; dy++) for (let dx = -steps; dx <= steps; dx++) {
            if ((dx === 0 && dy === 0) || Math.abs(dx) + Math.abs(dy) > steps) continue;
            if (hasTag(O.atIn(area, x + dx, y + dy), "fire")) return true;
        }
        return false;
    }
    // Free sheltered cells a bed could go on: no object, dry standable ground, nobody's reserved cell, not against a fire.
    function beddingCells(c, cfg, count) {
        const O = Objects(), area = levelArea(c), out = [];
        const taken = new Set();
        for (const p of active()) if (sameLevel(levelArea(p.origin), area)) for (const cell of footprint(p)) taken.add(cellKey(cell.x, cell.y));
        const cells = [...shelteredCells(c)].map(k => k.split(",").map(Number)).map(([x, y]) => ({ x, y }))
            .sort((a, b) => Math.hypot(a.x - c.site.x, a.y - c.site.y) - Math.hypot(b.x - c.site.x, b.y - c.site.y) || a.y - b.y || a.x - b.x);
        const clearance = Math.max(0, cfg.hearthClearance | 0);
        for (const cell of cells) {
            if (out.length >= count) break;
            if (taken.has(cellKey(cell.x, cell.y)) || O.atIn(area, cell.x, cell.y)) continue;
            if (isWater(area, cell.x, cell.y) || !groundOk(area, cell.x, cell.y)) continue;
            if (clearance > 0 && nextToFire(area, cell.x, cell.y, clearance)) continue;
            out.push({ x: cell.x, y: cell.y });
        }
        return out;
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
    // Nutrition of an item stack in pounds of the SRD's daily requirement (catalog food.nutrition), never its weight.
    const nutritionOf = (I, it) => { const t = it ? I.type(it.type) : null; return t && t.food && Number.isFinite(t.food.nutrition) ? t.food.nutrition * (it.count | 0) : 0; };
    const larderCells = s => (s.stockpiles || []).filter(sp => Array.isArray(sp.stores) && sp.stores.includes("food"));
    /**
     * What the settlement has against what its people need, one bounded scan around the hearth:
     * - shelter: doors set into walls; needed one per perShelter colonists.
     * - bed: beds on sheltered cells (a finished shelter's interior, the camp's interior); needed one per colonist.
     * - storage: chest container slots plus stockpile cells times slotsPerStockpileCell; needed slotsPerColonist each.
     * - food: colonist-days of nutrition the settlement can eat (totalAccessibleNutrition: larders, containers, food on
     *   the ground within reach, and the packs of its living members), against targetReserveDays. What lies deposited
     *   in larders and containers is reported apart (communalStoredNutrition) for logistics; it never changes the
     *   survival answer. Every stack is counted once, wherever it is, and always by food.nutrition, never by weight.
     */
    function evaluateDeficits(areaRef) {
        const W = World(), O = Objects(), I = Items();
        const s = settlementFor(areaRef);
        if (!W || !W.state || !O || !I || !s || !s.site) return null;
        const cfg = config(), area = levelArea(s);
        // The settlement's people: living colonists of the faction. The dead hold nothing for the colony (their packs
        // follow the corpse's loot rules elsewhere) and need nothing from it.
        const people = W.unitsInArea(area.x, area.y, area.z).filter(u => isColonist(u) && !u.data.dead);
        const population = people.length;
        const near = { x: s.site.x, y: s.site.y };
        const buildings = O.findIn(area, { near, radius: cfg.scanRadius, tags: ["building"], unsorted: true });
        const sheltered = shelteredCells(s);
        const C = window.UF && UF.Containers;
        const isContainer = t => !!(C && typeof C.isContainerType === "function" && C.isContainerType(t.id));
        let beds = 0, bedsUnsheltered = 0, shelters = 0, stockpileCells = 0;
        for (const b of buildings) {
            if (hasTag(b.type, "bed")) { if (sheltered.has(cellKey(b.x, b.y))) beds++; else bedsUnsheltered++; }
            if (hasTag(b.type, "stockpile") && !isContainer(b.type) && b.type.passable === true) stockpileCells++;
            if (hasTag(b.type, "door") && wallNeighbours(area, b.x, b.y) >= 2) shelters++;
        }
        // Food, each stack once: `seen` keeps a stack that two lists reach (a pack and the pouch in it, a container
        // and a cell) from counting twice.
        const seen = new Set();
        const take = it => { if (!it || seen.has(it.id)) return 0; seen.add(it.id); return nutritionOf(I, it); };
        let containerSlots = 0, containerFoodLb = 0;
        if (C && typeof C.all === "function") {
            for (const cont of C.all(area, area.z)) {
                if (Math.hypot(cont.x - near.x, cont.y - near.y) > cfg.scanRadius) continue;
                containerSlots += cont.maxSlots | 0;
                if (typeof C.itemsIn === "function") for (const it of C.itemsIn(cont.id)) containerFoodLb += take(it);
            }
        }
        const larders = new Set(larderCells(s).map(sp => cellKey(sp.x, sp.y)));
        let larderLb = 0, groundLb = 0;
        for (const f of I.find({ area: { x: area.x, y: area.y }, z: area.z, near, radius: cfg.scanRadius, tags: ["food"] })) {
            const lb = take(f.item);
            if (larders.has(cellKey(f.x, f.y))) larderLb += lb; else groundLb += lb;
        }
        // Carried by the settlement's living members: theirs to eat (a colonist eats from its own pack first), so it
        // answers "can we survive"; it is not communal until deposited.
        let carriedLb = 0;
        for (const u of people) for (const it of I.inventoryOf(u.id)) carriedLb += take(it);
        const storedLb = larderLb + containerFoodLb;          // communalStoredNutrition
        const foodLb = storedLb + groundLb + carriedLb;        // totalAccessibleNutrition
        const foodDays = population > 0 ? foodLb / population : 0;
        const row = (needed, current, unit) => ({ needed, current, deficit: Math.max(0, needed - current), unit });
        const round3 = v => Math.round(v * 1000) / 1000;
        const food = row(population > 0 ? cfg.targetReserveDays : 0, round3(foodDays), "colonist-days");
        food.deficit = round3(food.deficit);
        Object.assign(food, {
            lb: round3(foodLb), larderLb: round3(larderLb), containerLb: round3(containerFoodLb), groundLb: round3(groundLb), carriedLb: round3(carriedLb),
            storedLb: round3(storedLb), totalAccessibleNutrition: round3(foodLb), communalStoredNutrition: round3(storedLb),
            communalDays: round3(population > 0 ? storedLb / population : 0),
            deficitLb: round3(food.deficit * population), critical: population > 0 && foodDays < 1
        });
        const Stockpiles = window.UF && UF.Stockpiles;
        let storageCapacity = containerSlots + stockpileCells * (cfg.slotsPerStockpileCell || 1);
        if (Stockpiles && typeof Stockpiles.settlementCapacity === "function") {
            const cap = Stockpiles.settlementCapacity(area, area.z, s.factionId || "player", cfg.scanRadius, near);
            if (cap && cap.totalCells > 0) {
                storageCapacity = cap.totalSlots;
                containerSlots = cap.containerSlots;
                stockpileCells = cap.totalCells;
            }
        }
        const storage = row(population * cfg.slotsPerColonist, storageCapacity, "slots");
        Object.assign(storage, { containerSlots, stockpileCells });
        const bed = row(population, beds, "beds");
        bed.unsheltered = bedsUnsheltered;
        const shelter = row(population > 0 ? Math.ceil(population / perShelterOf(cfg)) : 0, shelters, "shelters");
        // Emergency shelter answers "can everybody survive tonight?": a sheltered bed for every colonist (the
        // communal shelter's beds count). Domestic housing answers "does every household have an adequate permanent
        // home of its own?": the communal shelter never satisfies it (DEUS-TSK-FABLE-16).
        shelter.emergency = row(population, beds, "sheltered beds");
        const households = householdsOf(s, people);
        const eligible = households.filter(h => h.eligible);
        const housing = row(eligible.length, eligible.filter(h => h.housed).length, "dwellings");
        housing.households = households.map(h => ({ id: h.id, size: h.members.length, adults: h.adults, eligible: h.eligible, housed: h.housed, homeBuildingId: h.homeBuildingId, source: h.source }));
        housing.domestic = { needed: housing.needed, current: housing.current, deficit: housing.deficit };
        const out = {
            area: { x: area.x, y: area.y, z: area.z },
            site: near,
            radius: cfg.scanRadius,
            population,
            shelter,
            food, bed, storage, housing,
            evaluatedAt: stamp()
        };
        const dev = projectState(false) && projectState(false).development;
        out.phase = phaseOf(out, dev ? dev.phase : null);
        return out;
    }
    /** Colonists one communal shelter is for: the catalog's perShelter, else the shelter blueprint's bed count. */
    function perShelterOf(cfg) {
        if ((cfg.perShelter | 0) > 0) return cfg.perShelter | 0;
        const bp = cfg.blueprints && cfg.blueprints.communal_shelter;
        return bp ? Math.max(1, relativeCells(bp).beds.length) : 8;
    }
    /**
     * The settlement's development phase (DEUS-TSK-FABLE-16/17), from the deficits and the phase it had:
     * - camp until a shelter stands and everybody has a sheltered bed (shelter.emergency: "can everybody survive
     *   tonight?"), the food reserve holds villageFoodDays and storage holds. Emergency shelter, beds, starter food and
     *   the stockpile come first; no cottage opens.
     * - village once that holds: households get permanent dwellings. A village stays a village through ordinary dips
     *   (a day's meals under the reserve, a short stockpile); only an emergency sends it back to camp: nobody's shelter
     *   stands, someone has no sheltered bed, or food is critical (under a colonist-day).
     * - town: a village of townPopulation or more (civic buildings and districts are later work; the phase is exposed now).
     * prev: the phase recorded at the last cycle (colony.projects.development.phase), or null.
     */
    function phaseOf(d, prev) {
        const cfg = config();
        if (!d || !(d.population > 0)) return "camp";
        const sheltered = d.shelter.current > 0 && !!d.shelter.emergency && d.shelter.emergency.deficit === 0;
        const foodStable = d.food.current >= Math.min(d.food.needed, Number(cfg.villageFoodDays) || 0);
        const storageUp = d.storage.deficit === 0;
        const settled = prev && prev !== "camp" ? sheltered && !d.food.critical : sheltered && foodStable && storageUp;
        if (!settled) return "camp";
        return d.population >= (cfg.townPopulation | 0) ? "town" : "village";
    }
    const isAdult = u => !!u && !!u.data && (!Number.isFinite(u.data.age) || u.data.age >= WORKING_AGE);
    /**
     * The settlement's households as this planner sees them: [{ id, members: [units], adults, eligible, housed,
     * homeBuildingId, source, record }]. UF.Households' records when that plugin is loaded (members through it);
     * colonists no record covers are grouped from their own data: `householdId`, else a partner pair (both alive,
     * each other's partner), else a child with a living parent, else alone. Eligible: a member of working age.
     * Housed (DEUS-TSK-FABLE-17): the finished cottage whose record names the household (dwellingOf) meets the home
     * contract in the world now (homeContract: walls and door stand, a bed stands for each member it was built for,
     * a hearth or the communal hearth, a free entrance, reachable from the settlement). The communal shelter houses
     * nobody; a cottage that fell or was left names nobody.
     */
    function householdsOf(s, people) {
        const H = window.UF && UF.Households;
        const area = levelArea(s), alive = new Map(people.map(u => [u.id, u]));
        const out = [], covered = new Set();
        const housedBy = (id, members) => {
            const p = dwellingOf(id, members.map(u => u.id));
            return { p, ok: !!p && homeContract(p, members).ok };
        };
        if (H && typeof H.all === "function") {
            let records = [];
            try { records = H.all(); } catch (e) { records = []; }
            for (const h of records) {
                if (!h || !h.area || !sameLevel({ x: h.area.x, y: h.area.y, z: zOf(h) }, area)) continue;
                if (s.factionId && h.faction && h.faction !== s.factionId) continue;
                let members = [];
                try { members = (typeof H.members === "function" ? H.members(h) : (h.members || []).map(id => alive.get(id))).filter(u => u && alive.has(u.id)); } catch (e) { members = []; }
                if (!members.length) continue;
                for (const u of members) covered.add(u.id);
                const adults = members.filter(isAdult).length;
                const home = housedBy(h.id, members);
                out.push({ id: h.id, members, adults, eligible: adults > 0, housed: home.ok, homeBuildingId: home.p ? home.p.id : null, source: "households", record: h });
            }
        }
        // Colonists without a household record: a deterministic key per household.
        const keys = new Map();
        const keyOfUnit = u => {
            if (keys.has(u.id)) return keys.get(u.id);
            let k = null;
            if (u.data.householdId) k = `hh:${u.data.householdId}`;
            else {
                const pid = u.data.partnerId || u.data.partner;
                const partner = pid ? alive.get(pid) : null;
                if (partner && !covered.has(partner.id) && (partner.data.partnerId || partner.data.partner) === u.id) k = `pair:${Math.min(u.id, partner.id)}`;
            }
            if (!k && !isAdult(u)) {
                const parent = alive.get(u.data.motherId) || alive.get(u.data.fatherId);
                if (parent && !covered.has(parent.id)) k = keyOfUnit(parent);
            }
            if (!k) k = `unit:${u.id}`;
            keys.set(u.id, k);
            return k;
        };
        const groups = new Map();
        for (const u of people) {
            if (covered.has(u.id)) continue;
            const k = keyOfUnit(u);
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k).push(u);
        }
        for (const [k, members] of groups) {
            const adults = members.filter(isAdult).length;
            const home = housedBy(k, members);
            out.push({ id: k, members, adults, eligible: adults > 0, housed: home.ok, homeBuildingId: home.p ? home.p.id : null, source: "units", record: null });
        }
        out.sort((a, b) => String(a.id).localeCompare(String(b.id)));
        return out;
    }
    /**
     * The finished cottage a household lives in, or null: the one whose record names the household's id, else (a
     * household grouped from the colonists' own data, whose key changes when a partner dies) the one whose recorded
     * members include one of its members. A cottage released (its household gone, or the building fallen) names nobody.
     */
    function dwellingOf(id, memberIds) {
        const cottages = list(p => p.state === "done" && p.kind === "household_cottage" && p.household && !p.household.released);
        return cottages.find(p => p.household.id === id) ||
            cottages.find(p => p.household.source === "units" && (p.household.members || []).some(m => memberIds.includes(m))) || null;
    }
    /**
     * The home functional contract of a finished dwelling for its household (owner directive 2026-09-24): sleeping
     * capacity (a bed stands for each member, up to the beds it was built with), weatherproof (every wall and the door
     * stand), a hearth or the communal hearth (a finished communal shelter), an exterior entrance (the cell outside
     * the door is free dry ground), a minimum interior (9 cells), and reachable from the settlement (World.reachable
     * from the entrance to the hearth's side, when the world answers it). { ok, reasons: [..], beds, bedsNeeded }.
     */
    function homeContract(p, members) {
        const O = Objects(), W = World(), c = colony(), bp = layoutOf(p);
        if (!O || !bp || !p || p.state !== "done") return { ok: false, reasons: ["not a finished dwelling"], beds: 0, bedsNeeded: 0 };
        const area = levelArea(p.origin), rel = relativeCells(bp, p.bedCount), at = cell => O.atIn(area, p.origin.x + cell.x, p.origin.y + cell.y);
        const reasons = [];
        const bedsStanding = rel.beds.filter(cell => hasTag(at(cell), "bed")).length;
        const bedsNeeded = Math.min((members || []).length, rel.beds.length);
        if (bedsStanding < bedsNeeded) reasons.push(`${bedsStanding} of ${bedsNeeded} beds stand`);
        const brokenWalls = rel.walls.filter(cell => !hasTag(at(cell), cell.object === bp.door ? "door" : "wall")).length;
        if (brokenWalls) reasons.push(`${brokenWalls} wall or door cell(s) down`);
        const hearthStands = rel.hearth.length > 0 && hasTag(at(rel.hearth[0]), "fire");
        const communalHearth = list(q => q.state === "done" && q.kind === "communal_shelter").length > 0;
        if (!hearthStands && !communalHearth) reasons.push("no hearth and no communal hearth");
        const door = rel.walls.find(cell => cell.object === bp.door);
        const ex = door ? { x: p.origin.x + door.x, y: p.origin.y + door.y + 1 } : null;
        const outside = ex ? O.atIn(area, ex.x, ex.y) : null;
        if (!ex || isWater(area, ex.x, ex.y) || !groundOk(area, ex.x, ex.y) || (outside && outside.passable !== true)) reasons.push("the entrance is blocked");
        const interior = rel.beds.length + rel.clearance.length + rel.chest.length + rel.hearth.length;
        if (interior < 9) reasons.push(`interior ${interior} cells`);
        if (ex && c && c.site && W && typeof W.reachable === "function") {
            const goal = NEIGHBORS.map(([dx, dy]) => ({ x: c.site.x + dx, y: c.site.y + dy })).find(g => groundOk(area, g.x, g.y) && !isWater(area, g.x, g.y));
            if (goal) { let r = true; try { r = W.reachable(area, ex.x, ex.y, goal.x, goal.y); } catch (e) { r = true; } if (!r) reasons.push("not reachable from the settlement"); }
        }
        return { ok: reasons.length === 0, reasons, beds: bedsStanding, bedsNeeded };
    }
    /**
     * Bed cells kept for a household (DEUS-TSK-FABLE-17): every bed cell of a cottage that is being built or stands
     * for a household (not released) -> that household's member ids. UF_Colonists' bed claims skip a bed kept for
     * others, so newcomers do not take a cottage's beds before its family moves in. Indexed once per tick.
     */
    let reservedTick = -1, reservedIndex = null;
    function bedReservations() {
        if (reservedIndex && reservedTick === now()) return reservedIndex;
        const idx = new Map();
        for (const p of list(q => (q.state === "active" || q.state === "done") && q.kind === "household_cottage" && q.household && !q.household.released)) {
            const bp = layoutOf(p);
            if (!bp) continue;
            const a = levelArea(p.origin);
            for (const cell of relativeCells(bp, p.bedCount).beds) idx.set(`${a.x},${a.y},${a.z}:${p.origin.x + cell.x},${p.origin.y + cell.y}`, (p.household.members || []).slice());
        }
        reservedTick = now(); reservedIndex = idx;
        return idx;
    }
    /** The unit ids a bed cell is kept for, or null when it is nobody's. area: { x, y, z }. */
    const bedReservedFor = (area, x, y) => (area ? bedReservations().get(`${area.x},${area.y},${zOf(area)}:${x},${y}`) || null : null);
    function explain(areaRef) {
        const d = evaluateDeficits(areaRef);
        if (!d) return "No settlement.";
        const part = (label, r) => `${label} ${r.current}/${r.needed}${r.deficit ? ` (needs ${r.deficit} more)` : ""}`;
        const b = brain(d);
        const top = b && b.chosen ? `; next: ${b.chosen.kind} (utility ${b.chosen.utility.toFixed(1)})` : (b ? "; nothing to open" : "");
        return `${d.phase} · ${part("Shelter", d.shelter)} · Food ${d.food.current}/${d.food.needed} days${d.food.critical ? " (critical)" : d.food.deficit ? ` (needs ${d.food.deficit} more)` : ""} · ${part("Beds", d.bed)} · ${part("Storage", d.storage)} slots · ${part("Homes", d.housing)} · ${d.population} colonists within ${d.radius} of (${d.site.x},${d.site.y})${top}`;
    }

    //-------------------------------------------------------------------------
    // Opening and cancelling projects

    // The larder: the first food stockpile that still stands, or null.
    function larderCell(c) {
        const O = Objects(), area = levelArea(c);
        for (const sp of larderCells(c)) { const t = O.atIn(area, sp.x, sp.y); if (t && hasTag(t, "stockpile")) return { x: sp.x, y: sp.y }; }
        return null;
    }
    // What a project of this kind adds to each deficit once done (for duplicate prevention and the utility term).
    // A registered stockpile cell for a loose stack (DEUS-TSK-FABLE-13): UF.Stockpiles' own destination when it is
    // loaded (its priorities, filters and reservations), else the nearest registered cell of the colony whose `stores`
    // take the item's kind and that holds nothing but the same kind under its stack limit (one stack a cell). Null
    // when no stockpile has room. `exclude`: cell keys never offered (the project's own footprint).
    function stockpileCellFor(c, item, exclude, inflight) {
        const I = Items(), O = Objects(), St = window.UF && UF.Stockpiles;
        if (!I || !O || !c || !item) return null;
        const t = I.type(item.type);
        if (!t) return null;
        const area = levelArea(c);
        if (St && typeof St.findDestination === "function") {
            const d = St.findDestination(item, null, c.factionId || "player");
            if (d && sameLevel(levelArea(d), area) && !(exclude && exclude.has(cellKey(d.x, d.y)))) return { x: d.x, y: d.y, containerId: d.containerId || null };
        }
        const tags = Array.isArray(t.tags) ? t.tags : [];
        let best = null, bestD = Infinity;
        for (const sp of c.stockpiles || []) {
            if (!Array.isArray(sp.stores) || !sp.stores.length) continue;
            if (!sp.stores.includes("all") && !sp.stores.some(s => s === item.type || tags.includes(s))) continue;
            if (exclude && exclude.has(cellKey(sp.x, sp.y))) continue;
            if (!hasTag(O.atIn(area, sp.x, sp.y), "stockpile")) continue;
            const stacks = I.atIn(area, sp.x, sp.y);
            if (stacks.some(s => s.type !== item.type)) continue;
            // What the cell holds plus what is already on its way there (hauls posted this round or still alive).
            const sent = inflight && inflight.get(cellKey(sp.x, sp.y));
            if (sent && sent.type !== item.type) continue;
            const held = stacks.reduce((n, s) => n + (s.count | 0), 0) + (sent ? sent.count | 0 : 0);
            if (held > 0 && held + (item.count | 0) > Math.max(1, t.stack | 0)) continue;
            const d = chebyshev(sp.x, sp.y, item.x | 0, item.y | 0);
            if (d < bestD || (d === bestD && best && (sp.y < best.y || (sp.y === best.y && sp.x < best.x)))) { best = { x: sp.x, y: sp.y, containerId: null }; bestD = d; }
        }
        return best;
    }
    const isMaterialItem = (I, it) => { const t = I.type(it.type); return !!t && !t.food && Array.isArray(t.tags) && t.tags.includes("material"); };
    // The cleared parcel is tidied before anything goes up on it (DEUS-TSK-FABLE-13): loose material the clearing
    // left on the footprint (a felled tree's logs, quarried stone) is hauled to a registered stockpile with room, so
    // the walls draw on the stockpile and no delivery lands on a square that must be cleared again. Each stack is
    // offered once (p.tidied); with no stockpile room the material stays where it lies and the build uses it there.
    // Returns the tidy hauls alive after posting; the site phase waits while any are.
    const TIDY_TRIES = 3; // hauls offered for one stack before what is left of it stays on the parcel
    function tidyParcel(p, summary) {
        const I = Items(), J = Jobs(), c = colony(), cfg = config(), area = levelArea(p.origin);
        if (!I || !J || !c) return 0;
        // Hauls alive, and what each destination cell already has on its way (a carrier lifts the legal part of a
        // stack, so a remainder may be offered again, up to TIDY_TRIES).
        let alive = 0;
        const inflight = new Map();
        for (const id of Object.keys(p.hauls)) {
            const h = p.hauls[id];
            if (h.cell !== "tidy") continue;
            alive++;
            if (h.to) { const s = inflight.get(h.to) || { type: h.type, count: 0 }; s.count += h.count | 0; inflight.set(h.to, s); }
        }
        const cells = footprint(p), exclude = new Set(cells.map(cell => cellKey(cell.x, cell.y)));
        p.tidied = p.tidied || {};
        let posted = 0;
        for (const cell of cells) {
            for (const it of I.atIn(area, cell.x, cell.y)) {
                if (alive + posted >= cfg.harvestPerMaterial * 2 || openCount(p) >= cfg.maxOpenJobs) break;
                if (p.hauls[it.id] || (p.tidied[it.id] | 0) >= TIDY_TRIES || !isMaterialItem(I, it)) continue;
                if (J.reservation && J.reservation.reservedBy(it.id)) continue;
                const dest = stockpileCellFor(c, it, exclude, inflight);
                if (!dest) continue;
                const params = { itemId: it.id, count: it.count | 0, to: targetOf(p, dest.x, dest.y), material: it.type, tidy: true };
                if (dest.containerId) params.toContainer = dest.containerId;
                const job = postJob(p, { type: "haul", target: targetOf(p, cell.x, cell.y), params });
                if (!job) continue;
                const toKey = cellKey(dest.x, dest.y);
                p.hauls[it.id] = { job: job.id, cell: "tidy", type: it.type, count: it.count | 0, to: toKey };
                const s = inflight.get(toKey) || { type: it.type, count: 0 };
                s.count += it.count | 0;
                inflight.set(toKey, s);
                p.tidied[it.id] = (p.tidied[it.id] | 0) + 1;
                posted++;
            }
        }
        summary.tidy = alive + posted;
        if (posted > 0) { summary.posted += posted; log(p, `${posted} stack(s) cleared from the parcel sent to the stockpile`); wakeIdle(p, summary); }
        return alive + posted;
    }

    function capacityFor(bp, d, phases, bedCount) {
        const cfg = config();
        if (bp.id === "communal_shelter") return { shelter: 1, bed: relativeCells(bp).beds.length };
        if (bp.id === "household_cottage") return { housing: 1, bed: relativeCells(bp, bedCount).beds.length };
        if (bp.id === "communal_stockpile") return { storage: (bp.size | 0) * (bp.size | 0) * (cfg.slotsPerStockpileCell || 1) };
        if (bp.id === "bedding_expansion") return { bed: phases && phases[0] ? phases[0].cells.length : 0 };
        if (bp.id === "food_cache") return { food: d && d.food ? Math.max(d.food.deficit, 0.001) : cfg.targetReserveDays };
        return {};
    }

    /**
     * Opens a project of a kind. opts: { origin } fixes a footprint project's site; { count } bounds a bedding
     * project's beds; { deficits } is the evaluation the brain used. Returns the record or null (no site, no cells).
     */
    function open(kind, opts) {
        const c = colony(), bp = blueprint(kind), st = projectState(true);
        if (!c || !bp || !st) return null;
        const cfg = config(), d = (opts && opts.deficits) || evaluateDeficits(null);
        let site = null, phases = null, larder = null, household = null, bedCount;
        if (bp.id === "household_cottage") {
            // A cottage is for one household: the first unhoused one (by id) no active cottage is already for.
            const spoken = new Set(active().filter(p => p.kind === "household_cottage" && p.household).map(p => p.household.id));
            const want = (d && d.housing && d.housing.households ? d.housing.households : []).find(h => h.eligible && !h.housed && !spoken.has(h.id));
            if (!want) return null;
            household = { id: want.id, source: want.source, members: null, size: want.size };
            const full = householdsOf(c, World().unitsInArea(c.area.x, c.area.y, zOf(c)).filter(u => isColonist(u) && !u.data.dead)).find(h => h.id === want.id);
            household.members = full ? full.members.map(u => u.id) : [];
            // A bed for each member, and one more for a child when two adults share the home (UF_Households lets a
            // couple have a child only with a spare room), up to cottageBeds and to what the 5x5 holds (DEUS-TSK-FABLE-17).
            const maxBeds = relativeCells(bp, 99).beds.length;
            bedCount = Math.max(1, Math.min((want.size | 0) + ((want.adults | 0) >= 2 ? 1 : 0), Math.max(1, cfg.cottageBeds | 0), maxBeds));
        }
        if (bp.kind === "task" && bp.id === "bedding_expansion") {
            const count = Math.max(1, Math.min((opts && opts.count) || (d ? d.bed.deficit : 1), 16));
            const cells = beddingCells(c, cfg, count);
            if (!cells.length) return null;
            phases = [{ name: "beds", task: null, cells: cells.map(cell => ({ x: cell.x, y: cell.y, object: bp.bed, stores: null })) }];
            site = { x: cells[0].x, y: cells[0].y, distance: chebyshev(cells[0].x, cells[0].y, c.site.x, c.site.y) };
        } else if (bp.kind === "task" && bp.id === "food_cache") {
            larder = larderCell(c);
            if (!larder) {
                const spot = chooseSite(c, Object.assign({}, bp, { size: 1 }), cfg);
                if (!spot) return null;
                larder = { x: spot.x, y: spot.y };
            }
            phases = [
                { name: "larder", task: null, cells: Objects().atIn(levelArea(c), larder.x, larder.y) ? [] : [{ x: larder.x, y: larder.y, object: bp.larder, stores: (bp.stores || ["food"]).slice() }] },
                { name: "forage", task: "forage", cells: [] }
            ];
            site = { x: larder.x, y: larder.y, distance: chebyshev(larder.x, larder.y, c.site.x, c.site.y) };
        } else {
            site = (opts && opts.origin) ? { x: opts.origin.x | 0, y: opts.origin.y | 0, distance: 0 } : chooseSite(c, bp, cfg);
            if (!site) return null;
        }
        const record = {
            id: st.nextId++,
            kind: bp.id,
            deficit: bp.deficit,
            state: "active",
            phase: 0,
            origin: { area: { x: c.area.x, y: c.area.y }, x: site.x, y: site.y, z: zOf(c) },
            size: bp.kind === "task" ? 0 : bp.size | 0,
            margin: cfg.margin | 0,
            phases,
            larder,
            household,
            bedCount: bedCount === undefined ? null : bedCount,
            capacity: capacityFor(bp, d, phases, bedCount),
            utility: opts && Number.isFinite(opts.utility) ? opts.utility : null,
            created: stamp(),
            sited: stamp(),
            finished: null,
            jobs: {},
            hauls: {},
            harvests: {},
            failed: {},
            blocked: null,
            blockedCycles: 0,
            blockedSince: null,
            refused: {},
            recheck: null,
            reason: null,
            log: []
        };
        st.list.push(record);
        log(record, `${bp.name} sited at (${site.x},${site.y}), ${site.distance} from the hearth; adds ${JSON.stringify(record.capacity)}${household ? `; for household ${household.id} (${household.size} member(s), ${bedCount} bed(s))` : ""}`);
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

    /**
     * Work recovery (DEUS-TSK-FABLE-08/09). A failed job counts against its cell only when the cell is the problem:
     * nobody can stand beside it, or the world refused the placement. Everything else is the worker's interruption
     * (`survival: …`), this planner's own withdrawal (`stale: …`), or the world's change under the job (the item was
     * eaten or carried off, the plant was picked, the materials vanished, the worker left): those are posted again
     * from the world at the next advance and never pause a cell.
     */
    const CELL_FAULT = /^can't reach|^nowhere to take it|^the square is taken/;
    const cellFault = job => !!job && job.state === "failed" && typeof job.reason === "string" && CELL_FAULT.test(job.reason);
    const preempted = job => typeof job.reason === "string" && (job.reason.startsWith("survival:") || job.reason.startsWith("stale:"));
    /**
     * Why an open, untaken job of the project can never be taken now, or null: its item is gone, carried, boxed or
     * moved (a colonist ate or hauled it); its plant was picked by somebody else; its square was built or blocked by
     * somebody else, or the materials it was posted for are gone from the cell (they are hauled again); or every
     * colonist that looked at it found it undoable (UF_Jobs' dry run leaves `reason`) for staleTicks. Left alone,
     * such jobs fill the project's slots and the phase stalls: foraging stops while food stands regrown, a wall
     * waits for logs a build job already claims.
     */
    function staleReason(p, job, cell) {
        if (!job || job.state !== "open" || job.assigned) return null;
        const I = Items(), O = Objects();
        if (job.type === "haul" && job.params && job.params.itemId !== undefined) {
            const it = I ? I.get(job.params.itemId) : null;
            if (!it || (it.count | 0) <= 0) return "the item is gone";
            if (it.holder !== null && it.holder !== undefined) return "the item is carried";
            if (it.container !== null && it.container !== undefined) return "the item is in a container";
            if (!it.area || it.x !== job.target.x || it.y !== job.target.y) return "the item moved";
        } else if (CLEAR_ACTIONS.includes(job.type) && O) {
            const t = O.atIn(levelArea(job.target), job.target.x, job.target.y);
            if (!t || !t.actions || !t.actions[job.type]) return `nothing to ${job.type} there`;
        } else if (job.type === "build" && cell && O) {
            const s = cellStatus(p, cell);
            if (s.state === "done") return "already built";
            if (s.state !== "build") return s.reason || "the square changed";
            const t = O.type(job.params.objectId), needs = (t && t.build && t.build.items) || {};
            if (Object.keys(needs).some(id => countOnCell(p, cell, id) < (needs[id] | 0))) return "the materials are gone";
        }
        const aged = job.reason && job.params && Number.isFinite(job.params.postedAt) && now() - job.params.postedAt >= (config().staleTicks | 0);
        if (aged && (job.type === "haul" || CLEAR_ACTIONS.includes(job.type))) return job.reason;
        if (aged && job.type === "build" && job.reason !== "needs items") return job.reason;
        return null;
    }
    // A destination that would not take a delivery (a full larder or container: UF_Jobs finishes the haul with no
    // result) is not offered another for retryTicks; the larder's food goes to another larder meanwhile.
    function refusedAt(p, key) {
        const r = p.refused && p.refused[key];
        if (!r) return false;
        if (now() < r.until.tick) return true;
        delete p.refused[key];
        return false;
    }
    function reconcile(p) {
        const J = Jobs(), bp = blueprint(p.kind);
        if (!J) return;
        const cells = new Map();
        if (bp) for (const c of phaseCells(p, bp, p.phase)) cells.set(cellKey(c.x, c.y), c);
        // Withdraw stale jobs first; the sweep below then drops them like any finished job. A target nobody could
        // work (the job's own dry-run reason) waits retryTicks before it is chosen again, so an unreachable tree or
        // square is not posted every hour; a gone item, plant or material needs no wait.
        const withdraw = (jobId, retryKey) => {
            const job = J.get(jobId);
            const why = staleReason(p, job, retryKey ? cells.get(retryKey) || null : null);
            if (!why) return;
            const dryRun = job.reason; // what the colonists' dry runs said, before cancel overwrites it
            J.cancel(job.id, `stale: ${why}`);
            if (retryKey && why === dryRun) p.failed[retryKey] = { count: 3, reason: `stale: ${why}`, retryAt: now() + (config().retryTicks | 0) };
            log(p, `withdrew ${job.type} at (${job.target.x},${job.target.y}): ${why}`);
        };
        for (const key of Object.keys(p.jobs)) withdraw(p.jobs[key], key);
        for (const itemId of Object.keys(p.hauls)) withdraw(p.hauls[itemId].job, null);
        for (const key of Object.keys(p.harvests)) withdraw(p.harvests[key].job, key);
        const note = (key, job) => {
            if (cellFault(job)) {
                const f = p.failed[key] || { count: 0, reason: null, retryAt: 0 };
                f.count++;
                f.reason = job.reason || null;
                if (f.count >= 3) f.retryAt = now() + (config().retryTicks | 0);
                p.failed[key] = f;
            }
        };
        const refused = (key, job) => {
            if (!job || job.state !== "done" || job.result !== null || !job.params || !job.params.to) return;
            p.refused = p.refused || {};
            const r = p.refused[key] || { count: 0, since: stamp(), until: null };
            r.count++;
            r.until = { domain: "action", tick: now() + (config().retryTicks | 0) };
            p.refused[key] = r;
            log(p, `delivery refused at (${job.params.to.x},${job.params.to.y}); not offered another for ${config().retryTicks | 0} ticks`);
        };
        for (const key of Object.keys(p.jobs)) {
            const job = J.get(p.jobs[key]);
            if (finished(job)) { note(key, job); delete p.jobs[key]; }
        }
        for (const itemId of Object.keys(p.hauls)) {
            const job = J.get(p.hauls[itemId].job);
            if (finished(job)) { note(p.hauls[itemId].cell, job); refused(p.hauls[itemId].cell, job); delete p.hauls[itemId]; }
        }
        for (const key of Object.keys(p.harvests)) {
            const job = J.get(p.harvests[key].job);
            if (finished(job)) { note(key, job); delete p.harvests[key]; }
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
        spec.params = Object.assign({ project: p.id, phase: p.phase, postedAt: now() }, spec.params || {});
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
            if (p.harvests[key] || retrying(p, key) || reservedAt(area, cnd.x, cnd.y)) continue;
            if (J.list(j => !finished(j) && j.target && j.target.x === cnd.x && j.target.y === cnd.y && sameLevel(levelArea(j.target), area)).length) continue;
            const job = postJob(p, { type: cnd.action, target: targetOf(p, cnd.x, cnd.y), params: { material } });
            if (!job) continue;
            p.harvests[key] = { job: job.id, material };
            posted++;
        }
        return posted;
    }

    // Objects whose harvest yields food (from the catalog), and the gather jobs a food cache posts on them.
    // The settlement's chest with room for a food stack (DEUS-TSK-FABLE-14): the nearest to the hearth within
    // scanRadius that UF.Containers will store it in, as { x, y, containerId }; null when none (or no containers plugin).
    function foodChestFor(c, item) {
        const C = window.UF && UF.Containers, cfg = config();
        if (!C || typeof C.all !== "function" || typeof C.canStore !== "function" || !c || !c.site) return null;
        const area = levelArea(c);
        let best = null, bestD = Infinity;
        for (const cont of C.all(area, area.z)) {
            const d = chebyshev(cont.x, cont.y, c.site.x, c.site.y);
            if (d > cfg.scanRadius || d >= bestD) continue;
            const can = C.canStore(cont.id, item, item.count | 0);
            if (!can || !can.ok) continue;
            best = { x: cont.x, y: cont.y, containerId: cont.id };
            bestD = d;
        }
        return best;
    }
    function foodSources() {
        const cat = catalog(), I = Items();
        const out = [];
        for (const t of (cat && cat.objects) || []) {
            if (!t || !t.actions || isConstructed(t)) continue;
            for (const action of Object.keys(t.actions)) {
                const y = t.actions[action] && t.actions[action].yields;
                if (y && Object.keys(y).some(id => { const it = I.type(id); return it && it.food; })) out.push({ id: t.id, action });
            }
        }
        return out;
    }
    // The forage phase of a food cache: loose food goes to the larder, wild food is gathered, until the reserve holds.
    function forageStep(p, summary) {
        const O = Objects(), I = Items(), J = Jobs(), c = colony(), cfg = config(), area = levelArea(p.origin);
        const d = evaluateDeficits(null);
        summary.reserveDays = d ? d.food.current : null;
        // The phase is complete when the reserve holds with a margin (a supper's worth), so the next meal does not
        // reopen a cache the same hour.
        if (!d || d.food.current >= d.food.needed + Math.max(0, Number(cfg.reserveMarginDays) || 0)) return true;
        summary.todo = 1;
        let posted = 0, sources = 0;
        // The larder: the project's own if it stands and takes deliveries, else the first registered one that does.
        const standing = sp => !!sp && !!O.atIn(area, sp.x, sp.y) && !refusedAt(p, cellKey(sp.x, sp.y));
        const larder = standing(p.larder) ? p.larder : (larderCells(c).find(sp => standing(sp) && hasTag(O.atIn(area, sp.x, sp.y), "stockpile")) || null);
        if (!larder && larderCell(c)) summary.refused = 1;
        // Loose food (on the ground, not in a larder or container) is hauled into the communal store: the settlement's
        // chest when one has room for it (DEUS-TSK-FABLE-14: UF.Containers, so every colonist eats from it), else the
        // larder cell.
        if (larder) {
            const larders = new Set(larderCells(c).map(sp => cellKey(sp.x, sp.y)));
            // A stack somebody is walking to for a meal (an eat or a fetch on it) is theirs: hauling it to the larder
            // under their feet fails their meal "the food moved" (DEUS-TSK-FABLE-14, seen in the survival soak).
            const spokenFor = new Set(J.list(j => !finished(j) && (j.type === "eat" || j.type === "fetch") && j.params && j.params.itemId !== undefined).map(j => j.params.itemId));
            for (const f of I.find({ area: { x: area.x, y: area.y }, z: area.z, near: { x: larder.x, y: larder.y }, radius: cfg.materialRadius, tags: ["food"] })) {
                if (openCount(p) >= cfg.maxOpenJobs) break;
                if (larders.has(cellKey(f.x, f.y)) || f.item.container || p.hauls[f.item.id] || spokenFor.has(f.item.id)) continue;
                if (J.reservation && J.reservation.reservedBy(f.item.id)) continue;
                const chest = foodChestFor(c, f.item);
                const to = chest || larder;
                const params = { itemId: f.item.id, count: f.item.count | 0, to: targetOf(p, to.x, to.y), material: "food" };
                if (chest) params.toContainer = chest.containerId;
                const job = postJob(p, { type: "haul", target: targetOf(p, f.x, f.y), params });
                if (!job) continue;
                p.hauls[f.item.id] = { job: job.id, cell: cellKey(to.x, to.y), type: f.item.type, count: f.item.count | 0 };
                posted++;
            }
        }
        // Wild food within reach: gather jobs, a few at a time, outside every reserved footprint.
        let alive = Object.keys(p.harvests).length;
        const candidates = [];
        for (const s of foodSources()) {
            if (!J.handler(s.action)) continue;
            for (const f of O.findIn(area, { near: { x: c.site.x, y: c.site.y }, radius: cfg.materialRadius, id: s.id, limit: 8 })) candidates.push({ x: f.x, y: f.y, dist: f.dist, action: s.action, id: s.id });
        }
        sources = candidates.length;
        candidates.sort((a, b) => a.dist - b.dist || a.y - b.y || a.x - b.x);
        for (const cnd of candidates) {
            if (alive >= cfg.forageJobs || openCount(p) >= cfg.maxOpenJobs) break;
            const key = cellKey(cnd.x, cnd.y);
            if (p.harvests[key] || retrying(p, key) || reservedAt(area, cnd.x, cnd.y)) continue;
            if (J.list(j => !finished(j) && j.target && j.target.x === cnd.x && j.target.y === cnd.y && sameLevel(levelArea(j.target), area)).length) continue;
            const job = postJob(p, { type: cnd.action, target: targetOf(p, cnd.x, cnd.y), params: { material: "food", forage: true } });
            if (!job) continue;
            p.harvests[key] = { job: job.id, material: "food" };
            alive++;
            posted++;
        }
        summary.posted += posted;
        if (!posted && !openCount(p)) {
            p.blocked = { cell: null, reason: summary.refused ? "the larder refuses deliveries" : (sources ? "wild food is spoken for" : "no wild food within reach"), since: stamp() };
            summary.blocked = 1;
        }
        return false;
    }

    // Idle strolls yield to posted work (DEUS-TSK-FABLE-09): for every project job just posted and still untaken,
    // the nearest colonist of the faction on a low-priority idle job (UF_Colonists' stroll, exploration, inspection,
    // contemplation, hearth or social idling; never a player's order) is taken off it. UF_Jobs' cancel releases its
    // reservations and UF_Colonists decides again at once, project work first. Deterministic: nearest first, then id.
    const IDLE_PARAMS = ["stroll", "explore", "contemplate", "inspect", "idleSocial", "fireGather"];
    const isIdleJob = job => !!job && !!job.params && !job.params.ordered && IDLE_PARAMS.some(k => job.params[k]);
    function wakeIdle(p, summary) {
        const W = World(), J = Jobs();
        if (!W || !J) return 0;
        const area = levelArea(p.origin);
        let untaken = 0;
        for (const id of ownJobIds(p)) { const job = J.get(id); if (job && job.state === "open" && !job.assigned) untaken++; }
        if (!untaken) return 0;
        const idle = W.unitsInArea(area.x, area.y, area.z)
            .filter(u => isColonist(u) && !u.data.dead && !(Number.isFinite(u.data.age) && u.data.age < 15) && isIdleJob(J.of(u.id)))
            .sort((a, b) => chebyshev(a.x, a.y, p.origin.x, p.origin.y) - chebyshev(b.x, b.y, p.origin.x, p.origin.y) || a.id - b.id);
        let woken = 0;
        for (const u of idle.slice(0, untaken)) {
            const job = J.of(u.id);
            if (J.cancel(job.id, "work: project posted")) woken++;
        }
        if (woken) { summary.woken = woken; log(p, `${woken} idle colonist(s) called to work`); }
        return woken;
    }

    function advance(p) {
        const O = Objects(), J = Jobs(), bp = blueprint(p.kind);
        if (!p || p.state !== "active") return null;
        if (!O || !J || !bp) { cancel(p.id, "no blueprint"); return null; }
        const cfg = config(), area = levelArea(p.origin);
        reconcile(p);
        const spec = phaseSpec(p, bp, p.phase);
        const cells = spec.cells || [];
        const summary = { phase: spec.name, total: cells.length, done: 0, todo: 0, blocked: 0, posted: 0, waiting: null, standers: 0, starved: 0, retrying: 0 };
        p.blocked = null;
        p.recheck = null;
        if (spec.task === "forage") {
            const complete = forageStep(p, summary);
            if (summary.blocked) {
                // Nothing to gather and nothing to haul: after three such cycles the project gives up and its kind waits.
                p.blockedCycles = (p.blockedCycles | 0) + 1;
                if (p.blockedCycles >= 3) { coolKind(p.kind); cancel(p.id, p.blocked.reason); return summary; }
            } else p.blockedCycles = 0;
            if (!complete) { if (summary.posted > 0) wakeIdle(p, summary); return summary; }
        }
        for (const cell of cells) {
            const key = cellKey(cell.x, cell.y);
            const s = cellStatus(p, cell);
            if (s.state === "done") { summary.done++; continue; }
            if (s.state === "blocked") { summary.blocked++; p.blocked = { cell: { x: cell.x, y: cell.y }, reason: s.reason, since: stamp() }; continue; }
            summary.todo++;
            if (retrying(p, key)) { summary.retrying++; p.blocked = p.blocked || { cell: { x: cell.x, y: cell.y }, reason: `${p.failed[key].reason || "failed"}; waiting to retry`, since: stamp() }; continue; }
            if (activeJobOn(p, key) || openCount(p) >= cfg.maxOpenJobs) continue;
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
                    const params = { objectId: t.id };
                    if (Array.isArray(cell.stores)) params.stores = cell.stores.slice(); // a stockpile's stores, registered by UF_Colonists on completion
                    const job = postJob(p, { type: "build", target: targetOf(p, cell.x, cell.y), params });
                    if (job) { p.jobs[key] = job.id; summary.posted++; }
                }
                continue; // else materials are on their way
            }
            if (refusedAt(p, key)) {
                // The square would not take the last delivery (see reconcile): nothing is sent there for now.
                summary.starved++;
                p.blocked = p.blocked || { cell: { x: cell.x, y: cell.y }, reason: `deliveries refused at (${cell.x},${cell.y})`, since: stamp() };
                continue;
            }
            let starved = false;
            for (const id of missing) {
                const want = (needs[id] | 0) - countOnCell(p, cell, id) - inFlight(p, cell, id);
                const got = postHauls(p, cell, id, want);
                if (got > 0) summary.posted += 1;
                if (got < want) {
                    const n = postHarvests(p, id);
                    summary.posted += n;
                    if (!summary.waiting) summary.waiting = id;
                    // Supplied: something is on its way or being harvested for it; else nothing within reach yields it.
                    const supplied = got > 0 || n > 0 || inFlight(p, cell, id) > 0 || Object.keys(p.harvests).some(k => p.harvests[k].material === id);
                    if (!supplied) starved = true;
                    p.blocked = p.blocked || { cell: { x: cell.x, y: cell.y }, reason: supplied ? `waiting for ${id}` : `no ${id} within reach`, since: stamp() };
                }
            }
            if (starved) summary.starved++;
        }
        // A cleared parcel is tidied into the stockpile before its walls go up (DEUS-TSK-FABLE-13).
        if ((p.size | 0) > 0 && spec.name === "site" && summary.todo === 0 && summary.blocked === 0 && tidyParcel(p, summary) > 0) return summary;
        if (summary.posted > 0) wakeIdle(p, summary);
        // Nothing workable: cells remain, no job of the project is alive, nothing was posted and nobody is standing
        // in the way (blocked squares, materials nothing within reach yields, squares waiting to retry, deliveries
        // refused). The project pauses with its diagnostic (blocked, blockedSince), looks again every ten rechecks,
        // and after giveUpTicks gives up: cancelled with the reason, its ground and its kind free again. Colonists'
        // dispatch is never held by a paused project: it posts nothing, so they take other work.
        const stuck = summary.todo + summary.blocked > 0 && summary.posted === 0 && summary.standers === 0 && openCount(p) === 0;
        if (stuck) {
            if (!p.blocked) p.blocked = { cell: null, reason: "nothing workable", since: stamp() };
            if (!p.blockedSince) { p.blockedSince = stamp(); log(p, `paused: ${p.blocked.reason}`); emit("projects:paused", p); }
            p.recheck = { domain: "action", tick: now() + (cfg.recheckTicks | 0) * 10 };
            summary.paused = 1;
            if ((cfg.giveUpTicks | 0) > 0 && now() - p.blockedSince.tick >= (cfg.giveUpTicks | 0)) {
                coolKind(p.kind);
                cancel(p.id, `gave up: ${p.blocked.reason}`);
                return summary;
            }
        } else if (p.blockedSince) {
            p.blockedSince = null;
            log(p, "resumed");
            emit("projects:resumed", p);
        }
        if (summary.todo === 0 && summary.blocked === 0) {
            p.phase++;
            if (p.phase >= phaseCount(p, bp)) {
                p.state = "done";
                p.finished = stamp();
                p.jobs = {}; p.hauls = {}; p.harvests = {}; p.failed = {};
                log(p, `${bp.name} finished`);
                containHearth(p);
                if (p.kind === "household_cottage") moveIn(p);
                if (p.kind === "communal_stockpile") {
                    const S = window.UF && UF.Stockpiles;
                    if (S && typeof S.create === "function") {
                        const area = levelArea(p.origin);
                        const existing = S.at(area, p.origin.x, p.origin.y, zOf(p.origin));
                        if (!existing) {
                            S.create({
                                factionId: p.factionId || (colony() && colony().factionId) || "player",
                                name: `${bp.name} #${p.id}`,
                                area,
                                z: zOf(p.origin),
                                cells: footprint(p),
                                filters: { groups: bp.stores ? bp.stores.slice() : ["all"] }
                            });
                        }
                    }
                }
                emit("projects:done", p);
            } else {
                log(p, `phase ${phaseName(p, bp, p.phase)} started`);
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
    // Finishing a building (DEUS-TSK-FABLE-16): its hearth is a contained fire; a cottage's household moves in

    // The finished building's hearth cell is marked contained in UF_Fire, whatever stands there (a stone hearth is
    // contained by type; a campfire an older blueprint built becomes contained by the cell record).
    function containHearth(p) {
        const F = window.UF && UF.Fire, O = Objects();
        const h = hearthCellOf(p);
        if (!F || typeof F.setContained !== "function" || !O || !h) return false;
        const area = levelArea(p.origin);
        if (!hasTag(O.atIn(area, h.x, h.y), "fire")) return false;
        const info = typeof F.sourceInfoAt === "function" ? F.sourceInfoAt(area, h.x, h.y) : null;
        if (info && info.contained) return true;
        return F.setContained(area, h.x, h.y, true, `project:${p.id}`);
    }
    // Every finished building's hearth is contained, once, after a load (saves from before DEUS-TSK-FABLE-16 hold
    // shelters whose campfire hearth was an open fire). Bounded by the number of finished footprint projects.
    let containmentSwept = false;
    function sweepContainment() {
        if (containmentSwept) return;
        const F = window.UF && UF.Fire;
        if (!F || typeof F.setContained !== "function" || !Objects()) return;
        containmentSwept = true;
        for (const p of list(q => q.state === "done" && (q.size | 0) > 0)) containHearth(p);
    }
    /**
     * The cottage's household moves in: the household's home record (UF.Households.assignHome when its record came
     * from there; the project's own p.household in every case), then each living member claims one of the cottage's
     * beds (UF.Colonists.claimBedAt), which frees the communal bed it held for the next arrival. Emits projects:movedIn.
     */
    function moveIn(p) {
        const W = World(), O = Objects(), st = projectState(true), bp = blueprint(p.kind), Col = window.UF && UF.Colonists, H = window.UF && UF.Households;
        if (!W || !O || !st || !bp || !p.household) return null;
        const area = levelArea(p.origin), rel = relativeCells(layoutOf(p, bp), p.bedCount);
        const abs = c => ({ x: p.origin.x + c.x, y: p.origin.y + c.y });
        const members = (p.household.members || []).map(id => W.unit(id)).filter(u => isColonist(u) && !u.data.dead && sameLevel(levelArea(u), area));
        const spec = {
            buildingId: p.id, x: p.origin.x, y: p.origin.y, w: p.size | 0, h: p.size | 0, area: { x: area.x, y: area.y }, z: area.z,
            wall: bp.wall, door: bp.door,
            walls: rel.walls.filter(c => c.object === bp.wall).map(abs), doors: rel.walls.filter(c => c.object === bp.door).map(abs),
            beds: rel.beds.map(abs), hearth: rel.hearth[0] ? abs(rel.hearth[0]) : null, storage: rel.chest[0] ? abs(rel.chest[0]) : null,
            entrance: rel.walls.filter(c => c.object === bp.door).map(c => ({ x: p.origin.x + c.x, y: p.origin.y + c.y + 1 }))[0] || null
        };
        let home = null;
        if (p.household.source === "households" && H && typeof H.assignHome === "function") {
            try { home = H.assignHome(p.household.id, spec); } catch (e) { home = null; }
        }
        // Beds: one per member in order; a member that cannot claim (a bed missing) keeps what it had. The project
        // record (p.household) is the one record of who lives here (DEUS-TSK-FABLE-17).
        const claimed = [];
        const bedCells = spec.beds.slice();
        for (const u of members) {
            const cell = bedCells.shift();
            if (!cell) break;
            const b = Col && typeof Col.claimBedAt === "function" ? Col.claimBedAt(u, { area: { x: area.x, y: area.y }, z: area.z, x: cell.x, y: cell.y }) : null;
            if (b) claimed.push(u.id);
        }
        p.movedIn = { household: p.household.id, members: members.map(u => u.id), claimed, at: stamp() };
        log(p, `household ${p.household.id} moved in: ${claimed.length}/${members.length} member(s) took a bed`);
        emit("projects:movedIn", p, p.household.id, claimed);
        return home || spec;
    }

    //-------------------------------------------------------------------------
    // The cycle: evaluate, open for a deficit with a blueprint, advance every active project

    // The phase reached is remembered (colony.projects.development = { phase, since, history }); phaseOf reads it for
    // its stickiness. Emits projects:phaseChanged(phase, previous).
    function recordPhase(phase) {
        const st = projectState(true);
        if (!st || !PHASES.includes(phase)) return;
        const dev = st.development || (st.development = { phase: null, since: null, history: [] });
        if (dev.phase === phase) return;
        const was = dev.phase;
        dev.phase = phase;
        dev.since = stamp();
        dev.history.push({ phase, at: stamp() });
        while (dev.history.length > 12) dev.history.shift();
        emit("projects:phaseChanged", phase, was);
    }
    /**
     * Homes are kept (DEUS-TSK-FABLE-17), once per cycle and bounded by the finished cottages: a cottage whose
     * household is gone, or whose building fell (walls, door or beds down), is released (UF.Households.releaseHome;
     * the household reads unhoused again); a household's current members follow it (a child born into it is kept a
     * bed); a member without a bed in the cottage claims a free one; and an unhoused household moves into a released
     * cottage that still stands with beds enough before any new cottage is built for it.
     */
    function settleHomes(c) {
        const W = World(), Col = window.UF && UF.Colonists, H = window.UF && UF.Households;
        if (!W || !c) return;
        const people = W.unitsInArea(c.area.x, c.area.y, zOf(c)).filter(u => isColonist(u) && !u.data.dead);
        const households = householdsOf(c, people);
        const release = (p, reason) => {
            p.household.released = { reason, at: stamp() };
            if (p.household.source === "households" && H && typeof H.releaseHome === "function") { try { H.releaseHome(p.household.id, reason); } catch (e) { console.error(e); } }
            log(p, `released: ${reason}`);
            emit("projects:homeReleased", p, reason);
        };
        for (const p of list(q => q.state === "done" && q.kind === "household_cottage" && q.household && !q.household.released)) {
            const h = households.find(x => x.homeBuildingId === p.id) || null;
            const members = h ? h.members : (p.household.members || []).map(id => W.unit(id)).filter(u => isColonist(u) && !u.data.dead);
            if (!members.length) { release(p, "its household is gone"); continue; }
            const contract = homeContract(p, members);
            if (contract.reasons.some(r => /beds stand|wall or door/.test(r))) { release(p, `the cottage no longer stands: ${contract.reasons.join(", ")}`); continue; }
            p.household.members = members.map(u => u.id);
            if (!Col || typeof Col.claimBedAt !== "function") continue;
            const area = levelArea(p.origin), beds = relativeCells(layoutOf(p), p.bedCount).beds.map(cell => ({ x: p.origin.x + cell.x, y: p.origin.y + cell.y }));
            const inside = u => u.data.bed && beds.some(b => b.x === u.data.bed.x && b.y === u.data.bed.y) && sameLevel(u.data.bed, u);
            const held = new Set(members.filter(inside).map(u => `${u.data.bed.x},${u.data.bed.y}`));
            for (const u of members) {
                if (inside(u)) continue;
                const free = beds.find(b => !held.has(`${b.x},${b.y}`) && Col.claimBedAt(u, { area: { x: area.x, y: area.y }, z: area.z, x: b.x, y: b.y }));
                if (free) held.add(`${free.x},${free.y}`);
            }
        }
        // Released cottages that still stand go to unhoused households before new ones are built.
        for (const h of households.filter(x => x.eligible && !x.housed)) {
            const p = list(q => q.state === "done" && q.kind === "household_cottage" && q.household && q.household.released)
                .find(q => homeContract(q, h.members).ok && relativeCells(layoutOf(q), q.bedCount).beds.length >= Math.min(h.members.length, relativeCells(layoutOf(q), 99).beds.length));
            if (!p) continue;
            p.household = { id: h.id, source: h.source, members: h.members.map(u => u.id), size: h.members.length };
            log(p, `household ${h.id} moves into the vacant cottage`);
            moveIn(p);
            // A new cottage already begun for this household is no longer needed.
            for (const q of active().filter(q => q.kind === "household_cottage" && q.household && q.household.id === h.id)) cancel(q.id, "its household moved into a vacant cottage");
        }
    }

    // A kind that could not open (no site, no cells, no wild food) is not tried again for kindCooldownTicks.
    function coolKind(kind) {
        const st = projectState(true);
        if (!st) return;
        st.cooldowns = st.cooldowns || {};
        st.cooldowns[kind] = now() + (config().kindCooldownTicks | 0);
    }
    /**
     * The settlement brain: every blueprint is a candidate for its deficit. What active projects already add to that
     * deficit (their `capacity`) is subtracted first, so a need one project covers never opens another:
     *   unmet = deficit - sum(active capacity for the deficit); nothing opens when unmet <= 0.
     * Deficits come in different units (shelters, colonist-days, beds, slots), so the utility term uses the unmet
     * fraction of the need:  utility = severity * (unmet / needed) + survivalBonus - activeProjectsOfKind * 10.
     * Food below one colonist-day is critical (higher severity, a survival bonus); a shelter deficit carries the
     * shelter bonus. The highest utility among eligible kinds opens, one per cycle.
     */
    function brain(evaluated) {
        const d = evaluated || evaluateDeficits(null);
        if (!d) return null;
        const cfg = config(), st = projectState(true), t = now();
        const phase = d.phase || phaseOf(d);
        const candidates = [];
        for (const kind of Object.keys(cfg.blueprints)) {
            const bp = cfg.blueprints[kind];
            const key = bp && bp.deficit;
            const row = key ? d[key] : null;
            if (!row) continue;
            const inFlight = active().filter(p => p.capacity && p.capacity[key] > 0);
            const inFlightCapacity = inFlight.reduce((n, p) => n + p.capacity[key], 0);
            const unmet = Math.max(0, row.deficit - inFlightCapacity);
            const fraction = row.needed > 0 ? Math.min(1, unmet / row.needed) : 0;
            const critical = key === "food" && !!row.critical;
            const severity = critical ? cfg.severity.foodCritical : (cfg.severity[key] || 1);
            // Domestic housing waits for the village (DEUS-TSK-FABLE-16): in camp a cottage is never eligible; from
            // the village on it carries the phase bonus, so homes come before more beds and storage but never before
            // an unmet emergency shelter or critical food.
            const housing = key === "housing";
            const phaseOk = !housing || phase !== "camp";
            const bonus = (critical ? cfg.survivalBonus.foodCritical : 0) + (key === "shelter" && unmet > 0 ? cfg.survivalBonus.shelter : 0) + (housing && phaseOk ? (cfg.phaseBonus && cfg.phaseBonus.housing) || 0 : 0);
            const activeOfKind = active().filter(p => p.kind === kind).length;
            const utility = unmet > 0 && phaseOk ? severity * fraction + bonus - activeOfKind * 10 : -Infinity;
            const cooledUntil = (st && st.cooldowns && st.cooldowns[kind]) || 0;
            // Eligible: something unmet, the kind not cooling, the phase allowing it, and a positive utility: the
            // active-project penalty keeps a second project of a kind from opening beside one in flight (a food cache
            // forages until the reserve holds whatever the deficit grows to; the next shelter waits for the first).
            candidates.push({ kind, deficit: key, total: row.deficit, needed: row.needed, unit: row.unit, inFlightCapacity, inFlightProjects: inFlight.length, unmet, fraction, severity, bonus, utility, cooled: cooledUntil > t, phaseOk, eligible: unmet > 0 && phaseOk && cooledUntil <= t && utility > 0 });
        }
        candidates.sort((a, b) => (b.utility - a.utility) || a.kind.localeCompare(b.kind));
        return { deficits: d, phase, candidates, chosen: candidates.find(x => x.eligible) || null };
    }

    function runCycle() {
        const c = colony();
        if (!c) return null;
        settleHomes(c);
        const b = brain(null);
        const out = { deficits: b ? b.deficits : null, brain: b, opened: [], advanced: [] };
        if (b) emit("projects:evaluated", b.deficits, b);
        if (b && b.deficits) recordPhase(b.deficits.phase);
        if (b && b.chosen) {
            const p = open(b.chosen.kind, { deficits: b.deficits, count: b.chosen.unmet, utility: b.chosen.utility });
            if (p) out.opened.push(p.id);
            else coolKind(b.chosen.kind);
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
        if (!containmentSwept) sweepContainment();
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
        containmentSwept = false;
    }

    //-------------------------------------------------------------------------
    // Words for cards and the Look panel

    function describe(ref) {
        const p = typeof ref === "number" ? get(ref) : ref;
        const bp = p ? blueprint(p.kind) : null;
        if (!p || !bp) return "";
        const n = p.size, o = p.origin;
        const where = n > 0 ? `at (${o.x},${o.y})-(${o.x + n - 1},${o.y + n - 1})` : `on ${footprint(p).length} cell(s) near (${o.x},${o.y})`;
        const head = `${bp.name} #${p.id} ${where}`;
        if (p.state !== "active") return `${head}: ${p.state}${p.reason ? ` (${p.reason})` : ""}`;
        const spec = phaseSpec(p, bp, p.phase), cells = spec.cells || [];
        let done = 0;
        for (const cell of cells) if (cellStatus(p, cell).state === "done") done++;
        const J = Jobs();
        let openJobs = 0, taken = 0;
        for (const id of ownJobIds(p)) {
            const job = J ? J.get(id) : null;
            if (!job || finished(job)) continue;
            if (job.assigned) taken++; else openJobs++;
        }
        const progress = spec.task === "forage" ? "foraging" : `${done}/${cells.length} cells`;
        const pause = p.blockedSince ? `; paused since tick ${p.blockedSince.tick}` : "";
        return `${head}: phase ${p.phase + 1}/${phaseCount(p, bp)} ${spec.name}, ${progress}, ${openJobs} jobs open, ${taken} taken${p.blocked ? `, ${p.blocked.reason}` : ""}${pause}`;
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
        brain: () => brain(null),
        deficits: DEFICITS.slice(),
        open,
        cancel,
        advance: id => { const p = get(id); return p ? advance(p) : null; },
        tick: runCycle,
        reservedAt,
        structures,
        footprint,
        sheltered: () => { const c = colony(); return c ? [...shelteredCells(c)].map(k => { const [x, y] = k.split(",").map(Number); return { x, y }; }) : []; },
        cells: (ref, phase) => {
            const p = typeof ref === "number" ? get(ref) : ref;
            const bp = p ? blueprint(p.kind) : null;
            if (!p || !bp) return [];
            return phaseCells(p, bp, phase === undefined ? p.phase : phase).map(c => Object.assign({}, c, { state: cellStatus(p, c).state }));
        },
        describe,
        setEnabled: on => { enabled = !!on; return enabled; },
        isEnabled: () => enabled,
        // Phases and households (DEUS-TSK-FABLE-16)
        phases: PHASES.slice(),
        /** The settlement's development phase now: "camp" | "village" | "town". */
        phase: () => phaseOf(evaluateDeficits(null)),
        /** The households the planner sees: [{ id, members: [units], adults, eligible, housed, homeBuildingId, source }]. */
        households: () => { const c = colony(), W = World(); return c && W ? householdsOf(c, W.unitsInArea(c.area.x, c.area.y, zOf(c)).filter(u => isColonist(u) && !u.data.dead)) : []; },
        hearthId,
        hearthCellOf,
        /** The home contract of a finished dwelling (a project or its id) for its household: { ok, reasons, beds, bedsNeeded }. */
        homeContract: ref => { const p = typeof ref === "number" ? get(ref) : ref; if (!p) return null; const W = World(); return homeContract(p, (p.household && p.household.members || []).map(id => W && W.unit(id)).filter(u => isColonist(u) && !u.data.dead)); },
        /** The unit ids a bed cell is kept for (a cottage built or standing for a household), or null. */
        bedReservedFor,
        /** The phase recorded at the last cycle and its history: { phase, since, history } or null. */
        development: () => { const st = projectState(false); return st && st.development ? JSON.parse(JSON.stringify(st.development)) : null; },
        _internal: { layoutOf, chooseSite, siteValid, stockpileCellFor, tidyParcel, reservedCellSet, cellStatus, canFullyClear, clearAction, relativeCells, harvestSources, foodSources, shelteredCells, beddingCells, nextToFire, larderCell, capacityFor, brain, coolKind, cellFault, staleReason, refusedAt, wakeIdle, isIdleJob, onMapUpdate, onLoaded, now, phaseOf, householdsOf, containHearth, sweepContainment, moveIn, settleHomes, dwellingOf, homeContract, recordPhase, perShelterOf }
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
            // Households in the running game (DEUS-TSK-FABLE-17): UF_Households is loaded (DEUS_Core's companion loader
            // while plugins.js is held by the editor), its records are the planner's households, and the deficits
            // carry the phase and the homes row.
            const Hh = window.UF && UF.Households;
            const records = Hh && typeof Hh.all === "function" ? Hh.all() : [];
            const seen = c ? householdsOf(c, W.unitsInArea(c.area.x, c.area.y, zOf(c)).filter(u => isColonist(u) && !u.data.dead)) : [];
            const fromRecords = seen.filter(h => h.source === "households").length;
            t.check("households_live", !!Hh && records.length > 0 && seen.length > 0 && fromRecords === seen.length && !!d && PHASES.includes(d.phase) && !!d.housing && d.housing.needed === seen.filter(h => h.eligible).length,
                `UF.Households ${Hh ? "loaded" : "MISSING"}: ${records.length} record(s); the planner sees ${seen.length} household(s), ${fromRecords} from those records; phase ${d ? d.phase : "?"}, homes ${d && d.housing ? `${d.housing.current}/${d.housing.needed}` : "?"}`);
            // The plugin's own first cycle may already have run (start delay 120 ticks) and opened the brain's first choice;
            // this cycle opens at most one more. Every active project answers a deficit that was open, no kind twice.
            const already = list().length;
            const cycle = runCycle();
            const opened = active();
            const p = opened[0] || null;
            const kinds = opened.map(q => q.kind);
            const b = cycle && cycle.brain ? cycle.brain : null;
            t.check("project_opened", !!p && !!b && opened.length >= 1 && opened.length <= already + 1 && new Set(kinds).size === kinds.length &&
                opened.every(q => !!d[q.deficit] && d[q.deficit].deficit > 0 && !!q.capacity && q.capacity[q.deficit] > 0) && b.candidates.length === Object.keys(config().blueprints).length,
                p ? `${opened.map(q => describe(q)).join(" | ")} (${cycle.opened.length ? "one opened by this cycle" : "opened by the plugin's own cycle"}); brain: ${b ? b.candidates.map(x => `${x.kind}:${x.utility === -Infinity ? "-" : x.utility.toFixed(1)}`).join(" ") : "none"}` : "no active project");
            const area = p ? levelArea(p.origin) : null;
            // A footprint project reserves its square outside the camp ring; a task project reserves the cells it chose
            // (a food cache whose larder already stands reserves nothing and works from that larder).
            const cells = p ? footprint(p) : [];
            const first = cells[0] || null;
            const centre = p && p.size > 0 ? { x: p.origin.x + Math.floor(p.size / 2), y: p.origin.y + Math.floor(p.size / 2) } : (first || (p && p.larder) || (c && c.site));
            const reservedOk = first ? reservedAt(area, first.x, first.y) === p.id : !!(p && p.larder && O.atIn(area, p.larder.x, p.larder.y));
            const outsideOk = !p || p.size === 0 || chebyshev(centre.x, centre.y, c.site.x, c.site.y) > (c.radius | 0) + 1 + Math.floor(p.size / 2);
            t.check("site_reserved", !!p && reservedOk && !reservedAt(area, c.site.x, c.site.y) && outsideOk,
                p ? `${first ? `cell (${first.x},${first.y}) reserved` : `no cells reserved, larder ${p.larder ? `(${p.larder.x},${p.larder.y})` : "none"}`}, ${cells.length} cell(s), centre ${chebyshev(centre.x, centre.y, c.site.x, c.site.y)} from the hearth` : "no project");
            const own = () => J.list(j => j.params && j.params.project === (p && p.id) && !finished(j));
            t.check("jobs_posted", own().length >= 1 && own().every(j => !j.owner && j.state === "open"),
                `${own().length} open project jobs: ${own().slice(0, 4).map(j => `${j.type}@${j.target.x},${j.target.y}`).join(" ")}`);
            // The posted job is an ordinary UF_Jobs job: assigned the way an overseer order is, it plans a stand cell,
            // reserves its target, and the colonist walks there and does it on the real map. (Autonomous pick-up is
            // UF_Colonists' decision loop, DEUS-TSK-FABLE-03; assigning directly keeps the check off the sweep's timing.)
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
            // A footprint cell may still read "clear" after the job when the harvest left a clearable remainder (an oak's
            // stump); what must not happen is a blocked cell or an unchanged object.
            t.check("job_done_in_engine", !!assigned && assigned.state === "done" && (!after || !before || after.id !== before.id) && (!onFootprint || (!!cellNow && cellNow.state !== "blocked")),
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

        // Unattended settlement run (UF_Test suite "settlement", not in the default run; DEUS-TSK-FABLE-07):
        // node tools/test_snapshot.js --name settlement --suite settlement
        // The calendar is put at 08:00 through the test clock, the speed at its top step, and nobody is ordered:
        // what gets opened, taken, interrupted and built is the founders' own doing. Then the game is saved and
        // loaded back in this process and the work must go on from an identical record.
        UF.Test.suite("settlement", async t => {
            const W = UF.World, J = UF.Jobs, I = UF.Items;
            const c = colony();
            const near = v => Math.abs(v) < 1e-6;
            t.check("colony_present", !!c && !!c.site, c ? `hearth at (${c.site.x},${c.site.y}), radius ${c.radius}` : "no colony state");
            // 1. The test clock: 08:00 on the calendar, and the calendar keeps running.
            const set = UF.Time && typeof UF.Time.setForTest === "function" ? UF.Time.setForTest(8, 0) : null;
            const stamp0 = window.$ufTime ? $ufTime.hour * 60 + $ufTime.minute : -1;
            await t.waitFrames(30);
            const stamp1 = window.$ufTime ? $ufTime.hour * 60 + $ufTime.minute : -1;
            t.check("clock_set_for_test", !!set && set.hour === 8 && set.minute === 0 && stamp0 === 8 * 60 && stamp1 > stamp0,
                set ? `UF.Time.setForTest(8, 0) -> ${JSON.stringify(set)}; 30 frames later the calendar reads ${window.$ufTime ? $ufTime.timeString || `${$ufTime.hour}:${$ufTime.minute}` : "?"} (not frozen)` : "no UF.Time.setForTest");
            // 2. Food in a pack counts once towards the reserve; in the larder it is the same food, moved.
            const area = levelArea(c);
            const people = W.unitsInArea(area.x, area.y, area.z).filter(isColonist);
            const holder = people[0] || null;
            const d0 = evaluateDeficits(null);
            const given = holder ? I.give("rations", 2, holder.id, { bypassLimits: true }) : [];
            const d1 = evaluateDeficits(null);
            const larder = larderCell(c);
            let d2 = null;
            if (given.length && larder) { I.putDown(given[0].id, area, larder.x, larder.y); d2 = evaluateDeficits(null); }
            for (const it of given) I.remove(it.id);
            const d3 = evaluateDeficits(null);
            t.check("carried_food_counted", !!d0 && !!d1 && given.length > 0 && near(d1.food.carriedLb - d0.food.carriedLb - 2) && near(d1.food.totalAccessibleNutrition - d0.food.totalAccessibleNutrition - 2) &&
                (!d2 || (near(d2.food.totalAccessibleNutrition - d1.food.totalAccessibleNutrition) && near(d2.food.communalStoredNutrition - d1.food.communalStoredNutrition - 2))) && !!d3 && near(d3.food.totalAccessibleNutrition - d0.food.totalAccessibleNutrition),
                d0 && d1 ? `2 rations given to ${holder.name}: carried ${d0.food.carriedLb} -> ${d1.food.carriedLb} lb, total ${d0.food.totalAccessibleNutrition} -> ${d1.food.totalAccessibleNutrition} lb${d2 ? `; put in the larder: total ${d2.food.totalAccessibleNutrition} lb, communal ${d1.food.communalStoredNutrition} -> ${d2.food.communalStoredNutrition} lb` : "; no larder to deposit in"}; removed: total ${d3 ? d3.food.totalAccessibleNutrition : "?"} lb` : "no evaluation");
            // 3. Unattended, at top speed. Nothing here assigns or orders; the counters say what the founders did.
            const opened = [], done = {}, preempted = {}, rests = [];
            let projectJobsDone = 0;
            const resting = new Map();
            const onOpen = p => opened.push(p.kind);
            const onDone = job => { done[job.type] = (done[job.type] || 0) + 1; if (job.params && job.params.project) projectJobsDone++; if (job.type === "sleep" && job.params && job.params.longRest && resting.has(job.id)) { const r = resting.get(job.id); rests.push({ hours: (($ufTime.day - r.day) * 24 + $ufTime.hour - r.hour) + ($ufTime.minute - r.minute) / 60, from: r.text }); resting.delete(job.id); } };
            const onAssigned = job => { if (job.type === "sleep" && job.params && job.params.longRest) resting.set(job.id, { day: $ufTime.day, hour: $ufTime.hour, minute: $ufTime.minute, text: `day ${$ufTime.day} ${$ufTime.hour}:${String($ufTime.minute).padStart(2, "0")}` }); };
            const onFail = job => { if (job.params && job.params.project && typeof job.reason === "string" && job.reason.startsWith("survival:")) preempted[job.reason] = (preempted[job.reason] || 0) + 1; };
            UF.Events.on("projects:opened", onOpen); UF.Events.on("jobs:done", onDone); UF.Events.on("jobs:assigned", onAssigned); UF.Events.on("jobs:failed", onFail);
            const topLevel = 3; // x8: the top step (x32) ended the test process without a trace three times on 2026-09-23 (renderer load)
            if (UF.Time.setLevel) UF.Time.setLevel(topLevel);
            const speed = UF.Time.multiplier ? UF.Time.multiplier() : 1;
            const budgetMs = 150000, t0 = Date.now();
            let firstDone = null;
            try { await t.waitUntil(() => { firstDone = list().find(p => p.state === "done") || null; return !!firstDone || Date.now() - t0 > budgetMs; }, budgetMs + 5000, "a project to finish"); } catch (e) { /* reported below */ }
            if (UF.Time.setLevel) UF.Time.setLevel(0);
            const seconds = Math.round((Date.now() - t0) / 1000);
            const shelter = list().find(p => p.kind === "communal_shelter") || null;
            const d4 = evaluateDeficits(null);
            const histogram = Object.keys(done).map(k => `${k} ${done[k]}`).join(", ");
            t.check("autonomous_work_done", projectJobsDone >= 8 && opened.length >= 1,
                `${projectJobsDone} project jobs done by colonists without an order in ${seconds} s at x${speed}: ${histogram}; projects opened: ${opened.join(", ") || "none"}; now ${explain(null)}`);
            t.check("project_completed_unattended", !!firstDone,
                firstDone ? `${describe(firstDone)} on ${$ufTime.timeString || `${$ufTime.hour}:${$ufTime.minute}`} of calendar day ${$ufTime.day}` : `nothing finished within ${seconds} s; ${shelter ? describe(shelter) : "no shelter project"}`);
            const survivalFailures = list().flatMap(p => Object.keys(p.failed || {}).map(k => p.failed[k])).filter(f => typeof f.reason === "string" && f.reason.startsWith("survival:"));
            t.check("survival_interruptions_not_failures", survivalFailures.length === 0,
                `${Object.keys(preempted).map(k => `${k} ${preempted[k]}`).join(", ") || "no project job cancelled for a survival need"}; ${survivalFailures.length} counted against a cell; long rests seen ${rests.length}${rests.length ? ` (first lasted ${rests[0].hours.toFixed(1)} calendar hours from ${rests[0].from})` : ""}; calendar day ${$ufTime.day}`);
            // 4. Save to a file and load it back in this process: every plugin's extractSaveContents runs over the
            //    loaded record (world, items, jobs, projects), the map scene keeps ticking on the loaded state, the
            //    project record is identical and the loop goes on. (Re-creating the scene as the load screen does,
            //    SceneManager.goto(Scene_Map) after onAfterLoad, ended the test process with code 0 in two runs on
            //    2026-09-23 and is left out; a cold start from the file is a separate check.)
            const beforeJson = JSON.stringify(projectState(false));
            const liveBefore = J.list(j => !finished(j)).length;
            const slot = 19;
            let saved = false, loaded = false, loadError = null;
            const where = e => (e && e.stack ? e.stack.split("\n").slice(0, 3).map(s => s.trim()).join(" | ") : String(e));
            try { $gameSystem.onBeforeSave(); await DataManager.saveGame(slot); saved = true; await DataManager.loadGame(slot); loaded = true; $gameSystem.onAfterLoad(); } catch (e) { loadError = where(e); }
            const afterJson = JSON.stringify(projectState(false));
            const doneBefore = projectJobsDone + (done.eat || 0) + (done.drink || 0);
            if (UF.Time.setLevel) UF.Time.setLevel(topLevel);
            let resumed = false;
            try { await t.waitUntil(() => (projectJobsDone + (done.eat || 0) + (done.drink || 0)) > doneBefore, 40000, "a job to finish after the reload"); resumed = true; } catch (e) { /* reported */ }
            if (UF.Time.setLevel) UF.Time.setLevel(0);
            t.check("save_reload_equivalent", saved && loaded && !loadError && beforeJson === afterJson && resumed,
                `${saved ? "saved" : "not saved"} to slot ${slot}, ${loaded ? "loaded" : "not loaded"}${loadError ? ` (${loadError})` : ""}; project record ${beforeJson === afterJson ? "identical" : "differs"} (${beforeJson.length} bytes), ${liveBefore} live jobs before; ${resumed ? "work resumed after the reload" : "no job finished within 40 s after the reload"}`);
            UF.Events.off("projects:opened", onOpen); UF.Events.off("jobs:done", onDone); UF.Events.off("jobs:assigned", onAssigned); UF.Events.off("jobs:failed", onFail);
            const focus = shelter || firstDone || null;
            if (focus && window.$gamePlayer && $gamePlayer.locate) $gamePlayer.locate(focus.origin.x + Math.floor((focus.size || 1) / 2), focus.origin.y + Math.floor((focus.size || 1) / 2));
            await t.waitFrames(2);
            t.screenshot("site");
            t.check("no_errors", t.errorsSoFar().length === 0, `${t.errorsSoFar().length} errors`);
        }, { isDefault: false });
    }
})();
