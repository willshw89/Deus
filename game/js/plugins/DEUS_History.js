//=============================================================================
// DEUS_History.js - The chronicle and the founders: every faction starts as eight people around a lit campfire in its own area
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS History] World history generation, settlement founding, faction site placement, founder genealogies, and historical events.
 * @author UF project
 * @base DEUS_World
 * @orderAfter DEUS_Factions
 *
 * @help
 * HIST-10 (2026-09-23): New Game now uses the verified demographic model.
 * UF.History.generate(world, {targetYear: 500, seed}) creates history and living
 * units. Ages 0 and 1 create founders only; N > 1 runs N annual steps. The
 * demographic calendar starts at 1, so an age-500 world enters calendar year 501.
 * The older generators below remain for legacy APIs/saves, not New Game.
 * The following describes that older founder/settling implementation:
 *
 * No history (user decision 2026-09-19, VISION V4 and V31): on every New
 * Game, right after UF_Factions rolled the factions and placed each one's
 * area, this plugin writes year 1 of the chronicle:
 *   - one camp record per faction at its camp cell: the cell nearest the
 *     area centre whose whole 3 x 3 block is walkable land (a name, a
 *     radius; UF_WorldGen keeps its disc free of plants), the player's
 *     marked as the home (the view starts there);
 *   - on that cell a lit campfire (the catalog's campfire object, written
 *     through UF_Objects like a built object; the nine cells are cleared);
 *   - eight founders per faction (catalog factions.founders: 4 men and 4
 *     women, adults 18-40) on the eight cells around the fire, exactly as
 *     the user drew it (P a peasant, F the fire):  PPP / PFP / PPP, men and
 *     women alternating round the ring, each turned toward the fire, with
 *     names, rolled d20 ability scores (data.stats), a leader (rank 1) and
 *     the others answering to the leader (data.superior); UF_Colonists
 *     turns the player's eight into the colonists;
 *   - one "Year 1" line per faction: "Eight <species> of <faction> settled
 *     by <place>."
 * In play, other plugins add lines with UF.History.addEvent(...).
 *
 * The older generator stays in this file, switched off by the catalog
 * (history.simulate = false, history.settleYears = 0): 500-600 simulated
 * years and the settling run below. Saves made before 2026-09-19 keep their
 * history and their stamped sites.
 *
 * The older generator, when history.simulate is true: it rolls a length of
 * history from data/UF_WorldCatalog.json ("history.years") and simulates it
 * year by year with a random function seeded from the world seed, so the
 * same seed always gives the same past:
 *   - every faction exists from year 0 with one site on a walkable cell of a
 *     biome its species prefers (sites.preferredBiomes), at least
 *     sites.minDistanceFromStart cells from the start and 24 from other sites;
 *   - the player's faction (state.factions.playerId, chosen by UF_Factions)
 *     founds its first site at the map centre instead; that site is its home:
 *     it is never sacked or abandoned, and the view starts on it
 *     (state.viewStart);
 *   - population grows, new sites are founded, sites grow from camp to village
 *     to town (sites.bySpecies), rulers succeed one another;
 *   - hostile pairs go to war; a lost war can turn the loser's newest site
 *     into a ruin; peace, alliances and trade move the relations;
 *   - plagues cut populations; beasts make lairs near sites.
 * The result is UF.World.state.history: the years, the events (one sentence
 * each, generated names only), the sites and the rulers. The factions'
 * homes, populations and relations are updated in UF.World.state.factions.
 *
 * UF_WorldGen asks UF.History.sitesIn(ax, ay) while building an area and
 * stamps each site's pieces (a ring wall with openings, a center, things
 * scattered inside; layouts in the catalog "sites.kinds").
 *
 * The settling run (history.settleYears, default 100): the last years of
 * that history are played out on the built map, site by site, as arithmetic
 * on counts of people by age (births from adult pairs, deaths by age, fevers)
 * and as pieces written to the object grid through UF.World.setObject: beds,
 * stockpiles, a work stone, a second wall, houses (small rectangles of the
 * culture's wall with a straw bed inside and a door), trees felled to stumps,
 * bushes picked and loose stones taken around the site, items in the
 * stockpiles. A site whose people die out or leave becomes a ruin.
 *
 * With the older generator, people (units of kind "person") are spawned at
 * every living site with an age, a stage (baby/child/teen/adult/elder),
 * rolled d20 ability scores (data.stats), a rank and a superior (one ruler
 * per faction, a leader per other site); the home site gets at least 4.
 *
 * Press H on the map for the chronicle window; Tab turns its pages
 * (the chronicle, then the founders; an older save: the overview, the
 * settling years, the sites).
 *
 * API and checks: docs/systems/UF_History.md
 * Contract: docs/design/WORLD_ARCHITECTURE.md sections 2.7, 3.7, 5.8
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    //-------------------------------------------------------------------------
    // Deterministic helpers (same hash and generator as UF_World / UF_Factions)

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
    function mulberry32(a) {
        return () => {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const SALT_HISTORY = 0x4157, SALT_PIECES = 0x5173, SALT_PEOPLE = 0x9e0b;
    const SALT_SETTLE = 0x5e77;  // the settling run
    const SALT_STATS = 0x57a7;   // "stats": ability scores per unit (hash32(seed, unitId, SALT_STATS))
    const SALT_CALLINGS = 0xca11; // callings RNG salt
    function getCallings() {
        if (typeof window !== "undefined" && window.UF && window.UF.Callings) return window.UF.Callings;
        if (typeof global !== "undefined" && global.UF && global.UF.Callings) return global.UF.Callings;
        if (typeof require === "function") {
            const paths = ["./DEUS_Callings.js", "./js/plugins/DEUS_Callings.js", "./game/js/plugins/DEUS_Callings.js", "./UF_Callings.js", "./js/plugins/UF_Callings.js", "./game/js/plugins/UF_Callings.js"];
            for (const p of paths) {
                try {
                    const c = require(p);
                    if (typeof window !== "undefined" && window.UF && window.UF.Callings) return window.UF.Callings;
                    if (c && (c.PROFESSIONS || c.sampleCallings)) return c;
                } catch (_) {}
            }
        }
        return null;
    }
    function getDemographics() {
        if (typeof window !== "undefined" && window.UF && window.UF.HistoricalDemographics) return window.UF.HistoricalDemographics;
        if (typeof global !== "undefined" && global.UF && global.UF.HistoricalDemographics) return global.UF.HistoricalDemographics;
        if (typeof require === "function") {
            const paths = ["./DEUS_HistoricalDemographics.js", "./js/plugins/DEUS_HistoricalDemographics.js", "./game/js/plugins/DEUS_HistoricalDemographics.js", "./UF_HistoricalDemographics.js"];
            for (const p of paths) {
                try {
                    const d = require(p);
                    if (typeof window !== "undefined" && window.UF && window.UF.HistoricalDemographics) return window.UF.HistoricalDemographics;
                    if (d && (d.create || d.step)) return d;
                } catch (_) {}
            }
        }
        return null;
    }
    function getDnd5e() {
        if (typeof window !== "undefined" && window.UF && window.UF.Dnd5e) return window.UF.Dnd5e;
        if (typeof global !== "undefined" && global.UF && global.UF.Dnd5e) return global.UF.Dnd5e;
        if (typeof require === "function") {
            const paths = ["./DEUS_Dnd5e.js", "./js/plugins/DEUS_Dnd5e.js", "./game/js/plugins/DEUS_Dnd5e.js", "./UF_Dnd5e.js"];
            for (const p of paths) {
                try {
                    const d = require(p);
                    if (typeof window !== "undefined" && window.UF && window.UF.Dnd5e) return window.UF.Dnd5e;
                    if (d && (d.assignClass || d.rollAbilityScores)) return d;
                } catch (_) {}
            }
        }
        return null;
    }
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
    const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
    const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const catalog = () => window.$ufWorldCatalog || null;
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;

    const DEFAULT_KINDS = ["camp", "village", "town"];
    const MIN_SITE_GAP = 24;     // cells between site centers
    const NEW_SITE_REACH = 60;   // a new site lies within this of an existing one of the faction
    const SITE_TRIES = 200;      // placement attempts with the preferred biomes, then as many without
    const HOME_REACH = 6;        // the player's home site lies within this of the map centre (contract 2.7)
    const HOME_MIN_PEOPLE = 4;   // the home site always has at least this many people (contract 5.8)

    //-------------------------------------------------------------------------
    // Public object

    const History = {
        config: () => (catalog() && catalog().history) || null,
        sitesConfig: () => (catalog() && catalog().sites) || null,
        /** The saved history of the current world, or null. */
        current: () => (window.UF && UF.World && UF.World.state && UF.World.state.history) || null,
        lastRun: null,   // { ms, years, factions, sites, events } of the last generate()
        lastSettle: null // the summary of the last settle() (same shape as state.history.settled)
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.History = History;
    let materializingNewGame = false;
    let pairingReleaseRegistered = false;

    // These modules are loaded before New Game, using the same dependency loader as Items.
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        for (const name of ["HistoricalDemographics", "Callings"]) {
            if (!UF[name] && (!PluginManager._scripts || !PluginManager._scripts.includes(`DEUS_${name}`))) {
                PluginManager.loadScript(`DEUS_${name}`);
            }
        }
    }

    //-------------------------------------------------------------------------
    // Terrain access: sites go on walkable land. UF.WorldGen reads UF.World.state, so a synthetic
    // state (tests, other seeds) is swapped in for the duration of the call.

    function withWorldState(state, fn) {
        const W = window.UF && UF.World;
        if (!W || W.state === state) return fn();
        const saved = W.state;
        W.state = state;
        try {
            return fn();
        } finally {
            W.state = saved;
        }
    }
    const cellInfo = (gx, gy) => (window.UF && UF.WorldGen && UF.WorldGen.cellInfo ? UF.WorldGen.cellInfo(gx, gy) : null);

    //-------------------------------------------------------------------------
    // Names: syllables from the catalog (factions.names), never a fixed list of proper nouns

    function makeNamer(rand, used) {
        const cfg = (catalog() && catalog().factions && catalog().factions.names) || { start: ["ar", "bel", "cor"], end: ["a", "en", "is"] };
        const pick = arr => arr[Math.floor(rand() * arr.length)];
        return function name(extra = false) {
            for (let i = 0; i < 40; i++) {
                const s = capitalize(pick(cfg.start) + (extra || rand() < 0.35 ? pick(cfg.start) : "") + pick(cfg.end));
                if (!used.has(s)) {
                    used.add(s);
                    return s;
                }
            }
            const s = `${capitalize(pick(cfg.start) + pick(cfg.end))}${used.size}`;
            used.add(s);
            return s;
        };
    }

    //-------------------------------------------------------------------------
    // Site placement

    function kindsFor(species) {
        const sc = History.sitesConfig();
        const list = sc && sc.bySpecies && sc.bySpecies[species];
        return Array.isArray(list) && list.length ? list : DEFAULT_KINDS;
    }
    function kindConfig(kind) {
        const sc = History.sitesConfig();
        return (sc && sc.kinds && sc.kinds[kind]) || { radius: 3, ring: null, gaps: 0, center: null, inside: {} };
    }
    // peoplePerSite lives in the catalog's sites section (history is the fallback).
    const perSiteRange = () => {
        const sc = History.sitesConfig(), hc = History.config();
        return (sc && sc.peoplePerSite) || (hc && hc.peoplePerSite) || [3, 10];
    };
    const maxRadiusOf = kinds => Math.max(...kinds.map(k => kindConfig(k).radius || 0), kindConfig("ruin").radius || 0);

    /**
     * Find a cell for a site. All coordinates are area-local; `sites` are the ones already placed.
     * opts: { area, species, near: {x,y}|null, radius (largest the site can grow to), start: {x,y}|null (the start cell in this area) }
     */
    function placeSite(rand, state, sites, opts) {
        const size = state.size;
        const sc = History.sitesConfig() || {};
        const margin = Math.max(1, Math.min(Math.floor(size / 4), opts.radius + 2));
        const minStart = Math.min(Math.floor(size / 3), sc.minDistanceFromStart || 48);
        const minSiteGap = Math.min(MIN_SITE_GAP, Math.max(3, Math.floor(size / 3)));
        const preferred = (sc.preferredBiomes && Array.isArray(sc.preferredBiomes[opts.species])) ? sc.preferredBiomes[opts.species] : null;
        const gx0 = opts.area.x * size, gy0 = opts.area.y * size;
        const discWalkable = (x, y) => {
            const r = Math.min(Math.floor(size / 4), opts.radius + 1);
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const info = cellInfo(gx0 + x + dx, gy0 + y + dy);
                    if (info && !info.walkable) return false;
                }
            }
            return true;
        };
        const span = Math.max(1, size - 2 * margin);
        for (let pass = 0; pass < 2; pass++) {
            const wantBiome = pass === 0 ? preferred : null;
            for (let i = 0; i < SITE_TRIES; i++) {
                let x, y;
                if (opts.near) {
                    x = opts.near.x + Math.round((rand() * 2 - 1) * NEW_SITE_REACH);
                    y = opts.near.y + Math.round((rand() * 2 - 1) * NEW_SITE_REACH);
                    if (x < margin || y < margin || x > size - 1 - margin || y > size - 1 - margin) continue;
                } else {
                    x = margin + Math.floor(rand() * span);
                    y = margin + Math.floor(rand() * span);
                }
                if (opts.start && Math.hypot(x - opts.start.x, y - opts.start.y) < minStart) continue;
                if (sites.some(s => sameArea(s.area, opts.area) && Math.hypot(s.x - x, s.y - y) < minSiteGap)) continue;
                const info = cellInfo(gx0 + x, gy0 + y);
                if (info && !info.walkable) continue;
                if (wantBiome && info && !wantBiome.includes(info.biomeId)) continue;
                if (!discWalkable(x, y)) continue;
                return { x, y, biomeId: info ? info.biomeId : null };
            }
        }
        return null;
    }

    /**
     * The player's home site: the map centre (the habitable start, contract 2.7). The walkable cell nearest to
     * (mid, mid) within HOME_REACH whose whole disc at the largest radius the site can grow to is walkable;
     * failing that, one whose small disc is walkable (the pond or a river may touch the centre); failing that,
     * any walkable cell there. No random numbers: the answer is a pure function of the terrain.
     */
    function placeHome(state, area, radius) {
        const size = state.size;
        const mid = Math.floor(size / 2);
        const gx0 = area.x * size, gy0 = area.y * size;
        const walkable = (x, y) => {
            const info = cellInfo(gx0 + x, gy0 + y);
            return !info || info.walkable;
        };
        const discWalkable = (x, y, r) => {
            for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!walkable(x + dx, y + dy)) return false;
            return true;
        };
        const cells = [];
        const reach = Math.min(HOME_REACH, Math.max(1, Math.floor(size / 3)));
        for (let dy = -reach; dy <= reach; dy++) {
            for (let dx = -reach; dx <= reach; dx++) {
                const d = Math.hypot(dx, dy);
                if (d <= reach) {
                    const cx = mid + dx, cy = mid + dy;
                    if (cx >= 0 && cx < size && cy >= 0 && cy < size) {
                        cells.push({ x: cx, y: cy, d });
                    }
                }
            }
        }
        cells.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
        for (const r of [Math.min(Math.floor(size / 4), radius + 1), Math.min(radius + 1, 2), 0]) {
            const c = cells.find(c => discWalkable(c.x, c.y, r));
            if (c) {
                const info = cellInfo(gx0 + c.x, gy0 + c.y);
                return { x: c.x, y: c.y, biomeId: info ? info.biomeId : null, clearRadius: r };
            }
        }
        return { x: mid, y: mid, biomeId: null, clearRadius: 0 };
    }

    //-------------------------------------------------------------------------
    // Generation

    /** HIST-10: 0 means the founders at World Year 0 (INV-SIM-01, a standard New Game), 1 the founders at year 1;
     * N > 1 means N unchanged HIST-09 annual steps from year 1.
     * opts.seed selects the demographic RNG, preserving the world's terrain/faction seed.
     * onCheckpoint observes each completed step and is never stored in the save.
     */
    History.generate = function(world, opts = {}) {
        const state = world && world.state ? world.state : world;
        const cfg = this.config();
        if (!cfg || !state || !state.factions || !Array.isArray(state.factions.list)) return null;
        const targetYear = opts.targetYear === undefined ? 500 : opts.targetYear;
        const seed = opts.seed === undefined ? state.seed : opts.seed;
        if (!Number.isSafeInteger(targetYear) || targetYear < 0 || targetYear >= 1000000) throw new Error("History: invalid targetYear");
        if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("History: invalid seed");
        const steps = targetYear <= 1 ? 0 : targetYear;
        const foundedYear = targetYear === 0 ? 0 : 1;
        if (state.history && state.history.demographics) {
            const d = state.history.demographics;
            if (d.seed !== seed || d.yearsSimulated !== steps || d.startYear !== foundedYear) {
                throw new Error("History: generate requires a new world when changing its era or seed");
            }
            this.materialize(state);
            return state.history;
        }
        const D = getDemographics();
        const Callings = getCallings();
        const Dnd = getDnd5e();
        if (!D || !Callings || !Dnd) throw new Error("History: HistoricalDemographics, Callings and Dnd5e must be loaded before New Game");
        const started = now();
        const live = UF.World && UF.World.state === state;
        return withWorldState(state, () => {
            const h = found(state, cfg, false, foundedYear);
            const demographics = D.create({ ...state, seed });
            for (let year = 0; year < steps; year++) {
                D.step(demographics);
                if (typeof opts.onCheckpoint === "function") opts.onCheckpoint({ ...demographics,
                    living: demographics.people.filter(p => p.died === null).map(p => p.id),
                    graveyard: demographics.people.filter(p => p.died !== null).map(p => p.id) });
            }
            h.demographics = demographics;
            h.version = 6;
            h.worldAge = steps;
            h.years = steps;
            h.startYear = demographics.currentYear;
            h.clockYear0 = demographics.currentYear;
            h.simulated = steps > 0;
            this.materialize(state);
            if (live && window.$ufTime) $ufTime.year = demographics.currentYear;
            this.lastRun = { ms: now() - started, years: steps, factions: state.factions.list.length,
                sites: demographics.sites.length, events: demographics.events.length, living: demographics.living.length };
            emit("history:generated", h);
            return h;
        });
    };

    /** Canonical person records include the deceased; returned IDs are historical, not unit IDs. */
    History.personById = function(id, state = UF.World.state) {
        const d = state && state.history && state.history.demographics;
        return d && Number.isInteger(id) ? d.people[id] || null : null;
    };
    History.genealogy = function(id, state = UF.World.state) {
        const person = this.personById(id, state);
        if (!person) return null;
        const d = state.history.demographics;
        const partnership = person.partnershipId === null ? null : d.partnerships[person.partnershipId];
        return { personId: id, parents: person.parents.slice(),
            spouse: partnership && partnership.toYear === null ? (partnership.motherId === id ? partnership.fatherId : partnership.motherId) : null,
            children: d.people.filter(p => p.parents.includes(id)).map(p => p.id) };
    };

    /** Materialization is a one-time boundary. Only stable IDs cross into saved world units. */
    History.materialize = function(world) {
        const state = world && world.state ? world.state : world;
        const h = state && state.history, d = h && h.demographics, W = UF.World;
        if (!d || !W) throw new Error("History: no demographic state to materialize");
        if (h.materialization && h.materialization.complete) {
            return Object.values(h.materialization.personToUnit).map(id => state.units[id]);
        }
        if (h.materialization) throw new Error("History: previous materialization was interrupted; create a new world instead of retrying partial changes");
        const Callings = getCallings(), Dnd = getDnd5e();
        if (!Callings || !Dnd) throw new Error("History: missing materialization dependency");
        UF.HistoricalDemographics.validate(d);
        return withWorldState(state, () => {
            const living = d.people.filter(p => p.died === null);
            const children = d.people.map(() => []);
            for (const p of d.people) for (const parent of p.parents) children[parent].push(p.id);
            const baseId = state.nextUnitId;
            const personToUnit = Object.fromEntries(living.map(p => [p.id, baseId + p.id]));
            // Reserve ancestors' slots as well: a person keeps the same Creature ID at every era.
            if (!Number.isSafeInteger(baseId + d.people.length)) throw new Error("History: unit ID range exhausted");
            const households = {}, homeOf = new Map();
            for (const p of living) {
                const pair = p.partnershipId === null ? null : d.partnerships[p.partnershipId];
                homeOf.set(p.id, pair && pair.toYear === null ? `historical_pair_${pair.id}` : `historical_person_${p.id}`);
            }
            for (const p of living) {
                if (d.currentYear - p.born >= d.config.profiles[p.species].reproductiveAge[0]) continue;
                const parent = p.parents.map(id => d.people[id]).find(q => q.died === null && q.siteId === p.siteId);
                if (parent) homeOf.set(p.id, homeOf.get(parent.id));
            }
            h.materialization = { schemaVersion: 1, complete: false };
            placeCamps(state);
            // Enumerate free cells once per site before adding units. No relocation or terrain clearing fallback.
            const slots = new Map(), reserved = new Set();
            const counts = new Map();
            for (const p of living) counts.set(p.siteId, (counts.get(p.siteId) || 0) + 1);
            for (const site of d.sites) {
                const cells = [], count = counts.get(site.id) || 0;
                for (let r = 1; r < state.size && cells.length < count; r++) {
                    for (let dy = -r; dy <= r && cells.length < count; dy++) {
                        for (let dx = -r; dx <= r && cells.length < count; dx++) {
                            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                            const x = site.x + dx, y = site.y + dy;
                            if (x < 0 || y < 0 || x >= state.size || y >= state.size) continue;
                            const key = `${site.area.x},${site.area.y},${site.z},${x},${y}`;
                            if (reserved.has(key) || !W.cellFree(site.area.x, site.area.y, x, y, 0, site.z)) continue;
                            reserved.add(key); cells.push({ x, y });
                        }
                    }
                }
                if (cells.length !== count) throw new Error(`History: insufficient walkable cells at site ${site.sourceSiteId}`);
                slots.set(site.id, { cells, next: 0 });
            }
            const units = [], cat = catalog() || {};
            for (const p of living) {
                const site = d.sites[p.siteId], id = personToUnit[p.id], age = d.currentYear - p.born;
                const pair = p.partnershipId === null ? null : d.partnerships[p.partnershipId];
                const spouse = pair && pair.toYear === null ? (pair.motherId === p.id ? pair.fatherId : pair.motherId) : null;
                const callings = Callings.sampleCallings(site.population, 3, mulberry32(hash32(d.seed, p.id, SALT_CALLINGS)));
                const calling = callings[0];
                // Use the established D&D species/age rules. Calling rank conditions the deterministic roll;
                // no invented vocation bonus table or second ability-score implementation is introduced.
                const statsSeed = hash32(d.seed, p.id, calling.rank, SALT_STATS);
                const profile = d.config.profiles[p.species], maturity = profile.reproductiveAge[0];
                const stage = age < 1 ? "baby" : age < maturity * 2 / 3 ? "child" : age < maturity ? "teen" : age >= profile.lifespan[0] ? "elder" : "adult";
                const stats = Dnd.rollAbilityScores(statsSeed, p.id, p.species, stage);
                const dnd = Dnd.assignClass(stats, statsSeed, p.id, p.species);
                const householdId = homeOf.get(p.id);
                if (!households[householdId]) households[householdId] = { id: householdId, siteId: p.siteId, members: [] };
                households[householdId].members.push(id);
                const data = { kind: p.factionId === state.factions.playerId ? "colonist" : "person", ai: "settlement",
                    historicalPersonId: p.id, historicalName: p.name, historicalFounder: p.isFounder,
                    // `founder` drives legacy live founder pairing. The demographic ledger owns this family.
                    founder: false, faction: p.factionId, species: p.species, gender: p.gender, sex: p.gender,
                    born: p.born, age, stage, parents: p.parents.map(parent => baseId + parent),
                    spouse: spouse === null ? null : baseId + spouse, children: children[p.id].map(child => baseId + child),
                    motherId: p.parents.some(parent => d.people[parent].gender === "female") ? baseId + p.parents.find(parent => d.people[parent].gender === "female") : null,
                    fatherId: p.parents.some(parent => d.people[parent].gender === "male") ? baseId + p.parents.find(parent => d.people[parent].gender === "male") : null,
                    partnerId: personToUnit[spouse] || null, childIds: children[p.id].map(child => personToUnit[child]).filter(Boolean),
                    householdId, familyId: householdId, lineageId: p.dynastyId, generation: p.generation,
                    siteId: p.siteId, site: site.sourceSiteId, home: { area: { ...site.area }, x: site.x, y: site.y, z: site.z },
                    wander: 6, callings, calling, stats, dnd, hp: dnd.hp, hpMax: dnd.hpMax, ac: dnd.ac,
                    dndClass: dnd.id, className: dnd.name, hitDie: dnd.hitDie, savingThrows: dnd.savingThrows,
                    proficiencies: dnd.proficiencies ? Array.from(new Set(dnd.proficiencies)) : [],
                    rank: 0, superior: null, willingToPartner: !materializingNewGame, familyDesire: true };
                const images = ((cat.people || {})[p.species] || {}).images || [""];
                const image = p.species === "human" ? imageSpec(`$UF_Human_${p.gender === "female" ? "Female" : "Male"}_${1 + p.id % 6}_Walk`)
                    : imageSpec(images[p.id % images.length]);
                const queue = slots.get(p.siteId), cell = queue.cells[queue.next++];
                if (state.units[id] || state.nextUnitId > id) throw new Error("History: another unit allocator used the reserved historical ID range");
                state.nextUnitId = id;
                const unit = W.addUnit({ name: p.name, image, area: site.area, z: site.z, x: cell.x, y: cell.y, exact: true, data });
                if (unit.id !== id || state.nextUnitId !== id + 1) throw new Error("History: unitAdded listener allocated inside the historical ID range");
                const Items = window.UF && UF.Items;
                if (Items && typeof Items.giveFactionStartingKit === "function" && p.factionId === state.factions.playerId) {
                    Items.giveFactionStartingKit(unit);
                }
                units.push(unit);
            }
            state.nextUnitId = baseId + d.people.length;
            d.living = living.map(p => p.id);
            d.graveyard = d.people.filter(p => p.died !== null).map(p => p.id);
            h.rulers = {};
            for (const f of state.factions.list) {
                const df = d.factions[f.id];
                h.rulers[f.id] = d.rulers.filter(r => r.factionId === f.id).map(r => ({ ...r,
                    name: d.people[r.personId].name, from: r.fromYear, to: r.toYear,
                    unitId: personToUnit[r.personId] || null }));
                const ruler = df.activeRulerId === null ? null : d.rulers[df.activeRulerId];
                const leaderId = ruler ? personToUnit[ruler.personId] : null;
                f.rulerId = leaderId || null;
                f.population = d.sites.filter(s => s.factionId === f.id).reduce((sum, s) => sum + s.population, 0);
                for (const u of units.filter(u => u.data.faction === f.id)) {
                    u.data.rank = u.id === leaderId ? 1 : 0;
                    u.data.superior = u.id === leaderId ? null : leaderId || null;
                }
            }
            for (const site of h.sites) {
                const ds = d.sites.find(s => s.sourceSiteId === site.id);
                site.pop = ds.population;
                site.ruined = ds.isRuined ? ds.abandonedYear : null;
                const leader = h.rulers[site.faction].find(r => r.toYear === null && r.siteId === ds.id);
                site.leaderId = leader ? leader.unitId : null;
            }
            h.materialization = { schemaVersion: 1, complete: true, baseUnitId: baseId, personToUnit, households };
            if (materializingNewGame) h.materialization.resumePairing = true;
            h.events = d.events.map(event => ({ year: event.year, type: event.type, factions: [event.factionId],
                site: d.sites[event.siteId].sourceSiteId, personIds: event.personIds.slice(), text: event.text }));
            return units;
        });
    };

    //-------------------------------------------------------------------------
    // Year 1 (VISION V4 and V31, revised by the user 2026-09-19): no history; every faction starts as its founders
    // (catalog factions.founders, 4 men and 4 women since the afternoon: "Campfire in the middle, surrounded by 8
    // peasants") around a lit campfire. A bare camp record and a founders plan per faction; the campfire and the units
    // come from spawnPeople on the live world.

    const FOUNDER_DEFAULTS = { male: 4, female: 4, age: [18, 40], reach: 3, titles: ["Chief", "Warden", "Speaker", "Reeve"] };
    const SALT_FOUNDERS = 0xf0d5;
    const foundersConfig = () => {
        const f = (catalog() && catalog().factions && catalog().factions.founders) || {};
        return Object.assign({}, FOUNDER_DEFAULTS, f);
    };
    History.foundersConfig = foundersConfig;
    const foundingConfig = () => Object.assign({ kind: "camp", stamp: false }, (History.sitesConfig() && History.sitesConfig().founding) || {});

    // The start camp as the user drew it (2026-09-19 afternoon, VISION V4): P a peasant, F the fire, north at the top.
    //     PPP
    //     PFP
    //     PPP
    // RING lists the eight founders' cells clockwise from north; each founder faces the fire with the nearest of the
    // four facings the engine has today (RMMZ 2 down, 4 left, 6 right, 8 up): the top row looks down, the bottom row
    // up, the west cell right, the east cell left.
    const RING = Object.freeze([[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]);
    const faceFire = (dx, dy) => (dy < 0 ? 2 : dy > 0 ? 8 : dx < 0 ? 6 : 4);
    const CAMP_SEARCH = 24; // cells from the area centre searched for a camp cell before the whole area is (never needed so far)
    const SALT_RING = 0x7f1e; // where the ring's first man stands
    const levelOf = p => p && p.z !== undefined ? p.z : 0;
    const viewZ = () => levelOf(UF.World.viewLevel ? UF.World.viewLevel() : null);
    const viewedArea = () => UF.World.viewLevel ? UF.World.viewLevel() : UF.World.currentArea();
    const siteArea = s => ({ x: s.area.x, y: s.area.y, z: levelOf(s) });
    const founderSites = (h, rec) => (rec.sites || [rec.site]).map(id => h.sites.find(s => s.id === id)).filter(Boolean);

    /**
     * The camp cell of a faction (pure: terrain only, the same answer for the same seed): the cell nearest its area
     * centre (faction.home; Euclidean, ties north then west) whose whole 3 x 3 block is walkable land (UF.WorldGen.cellInfo:
     * no water, no peak rock, no ground kind with passable false) and inside the map (not on its edge). UF_Factions keeps
     * a walkable disc of 5 cells around every centre, so it is the centre itself unless that disc had to shrink. Returns
     * { x, y, moved } (cells from the centre), or null when no such block exists in the area.
     */
    function campCell(state, f) {
        if (!f || !f.home || !f.home.area) return null;
        if (levelOf(f.home) !== 0) return { x: f.home.x, y: f.home.y, z: levelOf(f.home), moved: 0 };
        const size = state.size, ax = f.home.area.x, ay = f.home.area.y;
        const cat = catalog() || {};
        const blocked = new Set((Array.isArray(cat.groundKinds) ? cat.groundKinds : []).filter(g => g.passable === false).map(g => g.id));
        return withWorldState(state, () => {
            const memo = new Map();
            const land = (x, y) => {
                const k = y * size + x;
                if (!memo.has(k)) {
                    const c = cellInfo(ax * size + x, ay * size + y);
                    memo.set(k, !!c && c.walkable && !c.peak && !c.water && !blocked.has(c.ground));
                }
                return memo.get(k);
            };
            const blockOk = (x, y) => {
                if (x < 1 || y < 1 || x > size - 2 || y > size - 2) return false;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!land(x + dx, y + dy)) return false;
                return true;
            };
            const search = r => {
                let best = null, bestD = Infinity;
                for (let y = f.home.y - r; y <= f.home.y + r; y++) {
                    for (let x = f.home.x - r; x <= f.home.x + r; x++) {
                        const d = (x - f.home.x) ** 2 + (y - f.home.y) ** 2;
                        if (d > r * r || d >= bestD || !blockOk(x, y)) continue; // scanning north to south, west to east keeps the tie order
                        best = { x, y, moved: Math.sqrt(d) };
                        bestD = d;
                    }
                }
                return best;
            };
            return search(CAMP_SEARCH) || search(size * 2) || { x: Math.max(1, Math.min(size - 2, f.home.x)), y: Math.max(1, Math.min(size - 2, f.home.y)), moved: 0 };
        });
    }
    History.campCell = (state, f) => {
        const st = state || (window.UF.World && UF.World.state);
        const fac = typeof f === "string" ? ((st && st.factions && st.factions.list.find(x => x.id === f)) || null) : f;
        return st && fac ? campCell(st, fac) : null;
    };
    History.RING = RING;
    History.faceFire = faceFire;
    const WORDS =["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
    /** The species' plural name for a sentence: "humans", "elves", "automata" (catalog factions.species[].name). */
    const speciesWord = id => {
        const f = catalog() && catalog().factions;
        const sp = f && Array.isArray(f.species) ? f.species.find(s => s.id === id) : null;
        return (sp && sp.name ? sp.name : id).toLowerCase();
    };
    /** The name table of a species: people[species].names when it has one (start + male/female syllables), else start.names. */
    function nameTable(species) {
        const cat = catalog() || {};
        const own = cat.people && cat.people[species] && cat.people[species].names;
        const ok = t => t && Array.isArray(t.start) && t.start.length && Array.isArray(t.male) && t.male.length && Array.isArray(t.female) && t.female.length;
        if (ok(own)) return own;
        const shared = cat.start && cat.start.names;
        return ok(shared) ? shared : { start: ["al", "bra", "dor"], male: ["an", "ar"], female: ["a", "ia"] };
    }
    function personName(rng, species, gender, used) {
        const t = nameTable(species);
        const pick = arr => arr[Math.floor(rng() * arr.length)];
        const ends = gender === "female" ? t.female : t.male;
        for (let i = 0; i < 40; i++) {
            const s = capitalize(pick(t.start) + (i > 4 || rng() < 0.3 ? pick(t.start) : "") + pick(ends));
            if (!used.has(s)) {
                used.add(s);
                return s;
            }
        }
        const s = `${capitalize(pick(t.start) + pick(ends))}${used.size}`;
        used.add(s);
        return s;
    }

    function founderSurnames(rng, species, count) {
        const cult = String(species || "human").toLowerCase();
        const human = ["Hawthorne", "Miller", "Baker", "Fletcher", "Blackwood", "Cooper", "Smith", "Tanner", "Ward", "Weaver"];
        const dwarf = ["Ironfoot", "Stonehammer", "Bronzebeard", "Deepdelver", "Anvilborn", "Goldvein", "Copperhand", "Forgefire"];
        const elf = ["Silverleaf", "Swiftwillow", "Greenbough", "Moonwhisper", "Starlight", "Sunstrider", "Windstrider", "Duskwalker"];
        const orc = ["Bloodtusk", "Goretusk", "Ironhide", "Skullcleaver", "Warsnout", "Bonecrusher", "Grimmaw", "Redfist"];
        const gnome = ["Cogspinner", "Springgear", "Tinkertop", "Brassbutton", "Copperwidget", "Clockwinder"];
        const goblin = ["Snaggletooth", "Mudfoot", "Quickdagger", "Bonepicker", "Rustblade", "Ratbite"];
        const pool = cult.includes("dwarf") ? dwarf :
                     cult.includes("elf") ? elf :
                     cult.includes("orc") ? orc :
                     cult.includes("gnome") ? gnome :
                     cult.includes("goblin") ? goblin : human;
        const shuffled = pool.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const out = [];
        for (let i = 0; i < count; i++) {
            out.push(shuffled[i % shuffled.length] || `Lineage${i + 1}`);
        }
        return out;
    }

    function found(state, cfg, live, foundedYear = 1) {
        const started = now();
        const F = state.factions;
        const fc = foundersConfig();
        const founding = foundingConfig();
        const rand = mulberry32(hash32(state.seed, SALT_HISTORY));
        const usedPlaces = new Set();
        const placeName = makeNamer(rand, usedPlaces);
        const usedPeople = new Set();
        const radius = kindConfig(founding.kind).radius || 4;
        const playerId = F.playerId || (F.list.find(f => f.isPlayer) || {}).id || null;
        const [ageLo, ageHi] = Array.isArray(fc.age) ? fc.age : FOUNDER_DEFAULTS.age;
        const count = (fc.male | 0) + (fc.female | 0);
        const sites = [], events = [], rulers = {}, founders = {};
        // The player's faction first: its camp is site 1 and its line opens the chronicle.
        const order = F.list.slice().sort((a, b) => (b.id === playerId ? 1 : 0) - (a.id === playerId ? 1 : 0));
        for (const f of order) {
            if (!f.home || !f.home.area) continue;
            // The camp stands on the cell nearest the area centre whose 3 x 3 block is all land (the campfire and the
            const levels = (f.homes && f.homes.length ? f.homes.map(h => h.z) : [f.home.z || 0]);
            const camps = levels.map(z => {
                const cell = z === 0 ? campCell(state, f) : ((f.homes && f.homes.find(c => c.z === z)) || (f.home && f.home.z === z ? f.home : null));
                if (!cell) throw new Error(`No habitable founding cell for ${f.id} on level ${z}`);
                const site = {
                    id: sites.length + 1, faction: f.id, kind: founding.kind, bare: founding.stamp === false,
                    area: { x: f.home.area.x, y: f.home.area.y }, x: cell.x, y: cell.y, z,
                    radius, founded: foundedYear, pop: 0, ruined: null, name: placeName()
                };
                if (f.id === playerId && z === levels[0]) site.protected = true;
                sites.push(site);
                return site;
            });
            for (const s of camps) {
                s.focalFire = { area: { ...s.area }, x: s.x, y: s.y, z: s.z };
            }
            const site = camps[0];
            f.focalFire = { area: { ...site.area }, x: site.x, y: site.y, z: site.z };
            f.home = { ...f.home, area: { ...site.area }, x: site.x, y: site.y, z: site.z };
            f.sites = camps.map(s => s.id);
            // The founders: 4 males and 4 females representing 4 distinct families (user directive 2026-09-20).
            const rng = mulberry32(hash32(state.seed, SALT_FOUNDERS, F.list.indexOf(f)));
            const famCount = Math.max(1, Math.min(fc.male | 0, fc.female | 0));
            const surnames = founderSurnames(rng, f.species, famCount);
            const families = [];
            for (let k = 0; k < famCount; k++) {
                const camp = camps[Math.floor((k * camps.length) / famCount)];
                families.push({
                    id: `${f.id}_fam_${k + 1}`,
                    lineageId: `${f.id}_lin_${k + 1}`,
                    faction: f.id,
                    surname: surnames[k],
                    familyIndex: k,
                    site: camp.id,
                    z: camp.z,
                    generation: 1,
                    members: []
                });
            }
            f.families = families.map(fam => ({ id: fam.id, lineageId: fam.lineageId, surname: fam.surname, site: fam.site, z: fam.z, generation: fam.generation }));
            const titles = Array.isArray(fc.titles) && fc.titles.length ? fc.titles : FOUNDER_DEFAULTS.titles;
            const plan = [];
            for (let k = 0; k < famCount; k++) {
                const fam = families[k];
                const mAge = ageLo + Math.floor(rng() * (ageHi - ageLo + 1));
                const fAge = ageLo + Math.floor(rng() * (ageHi - ageLo + 1));
                const m = {
                    name: personName(rng, f.species, "male", usedPeople),
                    gender: "male",
                    age: mAge,
                    leader: false,
                    familyId: fam.id,
                    lineageId: fam.lineageId,
                    surname: fam.surname,
                    familyIndex: k,
                    site: fam.site,
                    z: fam.z
                };
                const w = {
                    name: personName(rng, f.species, "female", usedPeople),
                    gender: "female",
                    age: fAge,
                    leader: false,
                    familyId: fam.id,
                    lineageId: fam.lineageId,
                    surname: fam.surname,
                    familyIndex: k,
                    site: fam.site,
                    z: fam.z
                };
                const camp = camps.find(c => c.id === fam.site) || camps[0];
                camp.pop += 2;
                plan.push(m, w);
            }
            // Handle any extra males/females beyond pair count if configured
            let extraMales = (fc.male | 0) - famCount;
            let extraFemales = (fc.female | 0) - famCount;
            let extraIndex = 0;
            while (extraMales > 0) {
                const dest = camps[extraIndex++ % camps.length];
                const age = ageLo + Math.floor(rng() * (ageHi - ageLo + 1));
                plan.push({ name: personName(rng, f.species, "male", usedPeople), gender: "male", age, leader: false, site: dest.id, z: dest.z });
                dest.pop++;
                extraMales--;
            }
            while (extraFemales > 0) {
                const dest = camps[extraIndex++ % camps.length];
                const age = ageLo + Math.floor(rng() * (ageHi - ageLo + 1));
                plan.push({ name: personName(rng, f.species, "female", usedPeople), gender: "female", age, leader: false, site: dest.id, z: dest.z });
                dest.pop++;
                extraFemales--;
            }
            const leader = Math.floor(rng() * plan.length);
            if (plan[leader]) {
                plan[leader].leader = true;
                plan[leader].title = titles[Math.floor(rng() * titles.length)];
            }
            const Callings = getCallings();
            if (Callings) {
                if (typeof Callings.assignFounderQuotas === "function") {
                    const pRng = mulberry32(hash32(state.seed, SALT_CALLINGS, f.id));
                    Callings.assignFounderQuotas(plan, pRng);
                } else if (Callings.sampleCallings) {
                    plan.forEach((p, idx) => {
                        const pRng = mulberry32(hash32(state.seed, SALT_CALLINGS, f.id, idx));
                        p.callings = Callings.sampleCallings(count || 8, 3, pRng);
                        p.calling = p.callings[0];
                    });
                }
            }
            founders[f.id] = { site: site.id, sites: camps.map(s => s.id), families, plan, units: [] };
            const lead = plan[leader];
            if (lead) rulers[f.id] = [{ name: lead.name, title: lead.title, from: foundedYear, to: null, unitId: null }];
            f.population = count;
            for (const camp of camps) events.push({
                year: foundedYear, type: "founding", factions: [f.id], site: camp.id, area: { ...camp.area }, x: camp.x, y: camp.y, z: camp.z,
                text: `${WORDS[camp.pop] || String(camp.pop)} ${speciesWord(f.species)} of ${f.name} settled by ${camp.name}.`
            });
        }
        const home = sites.find(s => s.protected) || null;
        if (home) state.viewStart = { area: { ...home.area }, x: home.x, y: home.y, z: home.z };
        state.history = {
            version: 5, simulated: false, years: 0, startYear: foundedYear,
            clockYear0: live && window.$ufTime && typeof $ufTime.year === "number" ? $ufTime.year : null,
            events, sites, rulers, wars: [], homeSiteId: home ? home.id : null, founders
        };
        History.lastRun = { ms: now() - started, years: 0, factions: order.length, sites: sites.length, events: events.length };
        return state.history;
    }

    /** The chronicle's year now: matches the live game clock $ufTime.year, or the world history years. */
    History.currentYear = function() {
        const h = History.current();
        if (!h) return 0;
        if (window.$ufTime && typeof $ufTime.year === "number") return $ufTime.year;
        if (h.version < 4) return h.years;
        const y0 = h.clockYear0;
        return typeof y0 === "number" && window.$ufTime && typeof $ufTime.year === "number" ? Math.max(1, $ufTime.year - y0 + 1) : (h.years || 1);
    };

    /**
     * Record something that happened in play: e = { type, text, factions?: [id], site?: id, area?, x?, y? }. The event
     * gets the chronicle's current year and the game date; returns it (or null without a history). Emits history:event.
     */
    History.addEvent = function(e) {
        const h = History.current();
        if (!h || !e || typeof e.text !== "string" || !e.text) return null;
        const ev = { year: History.currentYear(), type: String(e.type || "event"), text: e.text, factions: Array.isArray(e.factions) ? e.factions.slice() : [], site: e.site === undefined ? null : e.site };
        if (e.area) { ev.area = { x: e.area.x, y: e.area.y }; ev.x = e.x; ev.y = e.y; ev.z = e.z === undefined ? levelOf(e.area) : e.z; }
        if (window.$ufTime && typeof $ufTime.year === "number") ev.clock = { day: $ufTime.day, month: $ufTime.monthIndex, year: $ufTime.year }; // the game date as numbers
        h.events.push(ev);
        // Keep the newest events, never a year-1 founding (or a year-0 one of an older save).
        const keep = (History.config() && History.config().eventsKept) || 400;
        while (h.events.length > keep) {
            const i = h.events.findIndex(x => !(x.type === "founding" && x.year <= 1));
            if (i < 0) break;
            h.events.splice(i, 1);
        }
        emit("history:event", ev);
        return ev;
    };
    /** Run (or re-run) the settling run on a state that already has a history. years: override history.settleYears. */
    History.settle = function(state, years) {
        const cfg = this.config();
        if (!cfg || !state || !state.history) return null;
        const live = !!(window.UF && UF.World && UF.World.state === state);
        return withWorldState(state, () => settle(state, cfg, live, years));
    };

    function simulate(state, cfg, targetYears) {
        const started = now();
        const rand = mulberry32(hash32(state.seed, SALT_HISTORY));
        const pick = arr => arr[Math.floor(rand() * arr.length)];
        const range = ([lo, hi]) => lo + Math.floor(rand() * (hi - lo + 1));
        const used = new Set();
        const newName = makeNamer(rand, used);
        const F = state.factions;
        const relations = F.relations;
        const relation = (a, b) => (relations[pairKey(a, b)] !== undefined ? relations[pairKey(a, b)] : 0);
        const drift = cfg.relationDrift || {};
        const shift = (a, b, key) => { relations[pairKey(a, b)] = clamp(Math.round(relation(a, b) + (drift[key] || 0)), -100, 100); };

        const years = (targetYears !== undefined && targetYears !== null) ? targetYears : range(cfg.years || [500, 600]);
        const events = [];
        const sites = [];
        const rulers = {};
        const wars = [];
        let nextSiteId = 1;
        const oneArea = state.areasX * state.areasY === 1;
        const mid = Math.floor(state.size / 2);
        const startCell = { x: mid, y: mid };
        const startArea = state.startArea;
        const cap = cfg.populationCap || 400;
        const growth = (History.sitesConfig() && History.sitesConfig().growth) || [0, 30, 120];
        const record = (year, type, text, factionIds, siteId) => {
            events.push({ year, type, text, factions: factionIds.filter(Boolean), site: siteId === undefined ? null : siteId });
        };

        // Working records per faction (the saved faction objects get the results at the end). Every faction is a
        // generated one; the player's (F.playerId, picked by UF_Factions) gets its home at the map centre.
        const playerId = F.playerId || (F.list.find(f => f.isPlayer) || {}).id || null;
        const fx = F.list.map(f => ({
            f, id: f.id, species: f.species, name: f.name, pop: range(cfg.startingPopulation || [20, 60]),
            sites: [], foundTimer: range(cfg.siteFoundEvery || [60, 120]), warCount: 0, isPlayer: f.id === playerId
        }));
        const livingSites = x => x.sites.filter(s => !s.ruined);
        const levelFor = pop => Math.max(0, growth.filter(g => pop >= g).length - 1);
        const kindFor = (x, level) => {
            const kinds = kindsFor(x.species);
            return kinds[Math.min(level, kinds.length - 1)];
        };
        const areaFor = x => (oneArea || x.isPlayer ? { x: startArea.x, y: startArea.y } : { x: x.f.home.area.x, y: x.f.home.area.y });
        const startIn = area => (sameArea(area, startArea) ? startCell : null);
        /** Found a site for faction x. `home` = the player's home: at the map centre, protected for the whole history. */
        const foundSite = (x, year, near, pop, home = false) => {
            const area = near ? near.area : areaFor(x);
            const radius = maxRadiusOf(kindsFor(x.species));
            let cell = home ? placeHome(state, area, radius) : null;
            if (!cell) cell = placeSite(rand, state, sites, { area, species: x.species, near: near ? { x: near.x, y: near.y } : null, radius, start: home ? null : startIn(area) });
            if (!cell) return null;
            const site = { id: nextSiteId++, faction: x.id, kind: kindFor(x, 0), level: 0, area: { x: area.x, y: area.y }, x: cell.x, y: cell.y, founded: year, pop, ruined: null, name: newName() };
            if (home) site.protected = true;
            sites.push(site);
            x.sites.push(site);
            return site;
        };
        const newRuler = (x, year) => {
            const r = { name: newName(), title: pick(cfg.titles || ["Elder"]), from: year, to: year + range(cfg.rulerReign || [8, 45]) };
            (rulers[x.id] = rulers[x.id] || []).push(r);
            return r;
        };
        const rulerOf = x => { const list = rulers[x.id]; return list ? list[list.length - 1] : null; };
        const titled = r => `${r.title} ${r.name}`;

        // Year 0: every faction exists, with one site and a ruler. The player's faction settles first, at the map
        // centre, so every other site keeps its distance from it (MIN_SITE_GAP) and from the start.
        const firstToSettle = fx.slice().sort((a, b) => (b.isPlayer ? 1 : 0) - (a.isPlayer ? 1 : 0));
        for (const x of firstToSettle) {
            const site = foundSite(x, 0, null, x.pop, x.isPlayer);
            const r = newRuler(x, 0);
            if (site) record(0, "founding", `${x.name} founded ${site.name} under ${titled(r)}.`, [x.id], site.id);
            else record(0, "founding", `${x.name} gathered under ${titled(r)}, but found no ground to settle.`, [x.id], null);
        }
        const homeSite = sites.find(s => s.protected) || null;

        const hostilePairs = () => {
            const out = [];
            for (let i = 0; i < fx.length; i++) for (let j = i + 1; j < fx.length; j++) out.push([fx[i], fx[j]]);
            return out;
        };
        const atWar = (a, b) => wars.some(w => w.to === null && ((w.a === a.id && w.b === b.id) || (w.a === b.id && w.b === a.id)));
        const lairCap = Math.max(1, fx.length);

        for (let year = 1; year <= years; year++) {
            // Population and site growth.
            for (const x of fx) {
                x.pop = Math.min(cap, x.pop * (1 + (cfg.growthPerYear || 0)));
                const living = livingSites(x);
                for (const s of living) {
                    s.pop = Math.round(x.pop / living.length);
                    const level = levelFor(s.pop);
                    if (level > s.level) {
                        s.level = level;
                        const kind = kindFor(x, level);
                        if (kind !== s.kind) {
                            s.kind = kind;
                            record(year, "growth", `${s.name} grew into a ${kind} of ${x.name}.`, [x.id], s.id);
                        }
                    }
                }
                // Founding: the timer elapsed, the people are many enough, and the faction has room for another site.
                if (--x.foundTimer <= 0) {
                    x.foundTimer = range(cfg.siteFoundEvery || [60, 120]);
                    if (living.length < (cfg.maxSitesPerFaction || 3) && x.pop >= 30 * (living.length + 1) && living.length) {
                        const near = pick(living);
                        const s = foundSite(x, year, near, 0);
                        if (s) record(year, "founding", `Settlers from ${near.name} founded ${s.name} for ${x.name}.`, [x.id], s.id);
                    }
                }
                // Succession.
                const r = rulerOf(x);
                if (r && year >= r.to) {
                    const next = newRuler(x, year);
                    record(year, "succession", `${titled(next)} succeeded ${titled(r)} as ruler of ${x.name}.`, [x.id], null);
                }
                // Plague.
                if (rand() < (cfg.plagueChancePerYear || 0)) {
                    const loss = 0.2 + rand() * 0.3;
                    x.pop = Math.max(5, x.pop * (1 - loss));
                    record(year, "plague", `A plague took ${Math.round(loss * 100)} of every hundred people of ${x.name}.`, [x.id], null);
                }
                // Beasts.
                if (rand() < (cfg.beastChancePerYear || 0) && sites.filter(s => s.kind === "lair").length < lairCap && living.length) {
                    const near = pick(living);
                    const cell = placeSite(rand, state, sites, { area: near.area, species: null, near: { x: near.x, y: near.y }, radius: kindConfig("lair").radius || 3, start: startIn(near.area) });
                    if (cell) {
                        const lair = { id: nextSiteId++, faction: null, kind: "lair", level: 0, area: { x: near.area.x, y: near.area.y }, x: cell.x, y: cell.y, founded: year, pop: 0, ruined: null, name: `${newName()} Lair` };
                        sites.push(lair);
                        record(year, "beast", `A great beast made its lair at ${lair.name}, near ${near.name}.`, [x.id], lair.id);
                    }
                }
            }
            // Relations between pairs: war, peace, alliance, trade.
            for (const [a, b] of hostilePairs()) {
                const rel = relation(a.id, b.id);
                if (atWar(a, b)) {
                    const w = wars.find(w => w.to === null && ((w.a === a.id && w.b === b.id) || (w.a === b.id && w.b === a.id)));
                    if (rand() < (cfg.peaceChancePerYear || 0)) {
                        w.to = year;
                        shift(a.id, b.id, "peace");
                        record(year, "peace", `${a.name} and ${b.name} made peace after ${year - w.from} year${year - w.from === 1 ? "" : "s"} of war.`, [a.id, b.id], null);
                    } else if (year >= w.until) {
                        w.to = year;
                        const weak = a.pop <= b.pop ? a : b, strong = weak === a ? b : a;
                        if (rand() < (cfg.sackChance || 0)) {
                            // The weaker side's newest living site falls; the player's home never does (contract 2.7),
                            // so a war against the player's faction with only its home standing is won with nothing.
                            const living = livingSites(weak);
                            const target = living.filter(s => !s.protected).sort((p, q) => q.founded - p.founded)[0] || null;
                            let replacement = null;
                            if (target && living.length === 1) replacement = foundSite(weak, year, target, 0);
                            if (target && (living.length > 1 || replacement)) {
                                target.ruined = year;
                                target.kind = "ruin";
                                w.sacked = target.id;
                                weak.pop = Math.max(5, weak.pop * 0.6);
                                shift(a.id, b.id, "sack");
                                record(year, "sack", `${strong.name} sacked ${target.name}, and ${weak.name} left it in ruin.`, [strong.id, weak.id], target.id);
                                if (replacement) record(year, "founding", `The survivors of ${target.name} founded ${replacement.name}.`, [weak.id], replacement.id);
                            } else {
                                record(year, "war_end", `The war of ${a.name} and ${b.name} ended with nothing won.`, [a.id, b.id], null);
                            }
                        } else {
                            record(year, "war_end", `The war of ${a.name} and ${b.name} wore itself out.`, [a.id, b.id], null);
                        }
                    }
                    continue;
                }
                const combatEnabled = year > Math.floor(years / 2);
                if (combatEnabled && rel <= -15 && rand() < (cfg.warChancePerYear || 0) * 2) {
                    const len = range(cfg.warLength || [3, 12]);
                    wars.push({ a: a.id, b: b.id, from: year, until: year + len, to: null, sacked: null });
                    a.warCount++;
                    b.warCount++;
                    shift(a.id, b.id, "war");
                    record(year, "war", `${a.name} went to war against ${b.name}.`, [a.id, b.id], null);
                } else if (rel >= 15 && rand() < (cfg.allianceChancePerYear || 0)) {
                    shift(a.id, b.id, "alliance");
                    record(year, "alliance", `${a.name} and ${b.name} swore an alliance.`, [a.id, b.id], null);
                } else if (rel >= 0 && rand() < (cfg.tradeChancePerYear || 0)) {
                    shift(a.id, b.id, "trade");
                    record(year, "trade", `Traders of ${a.name} opened a road to ${b.name}.`, [a.id, b.id], null);
                }
            }
        }
        for (const w of wars) if (w.to === null) w.to = years; // a war still running when the pair arrives ends in the record

        // Every world keeps one strong alliance and one serious hostility (UF_Factions' guarantee, re-applied).
        const keys = Object.keys(relations);
        if (keys.length >= 2) {
            if (!keys.some(k => relations[k] >= 40)) relations[keys.reduce((p, q) => (relations[p] >= relations[q] ? p : q))] = 60;
            if (!keys.some(k => relations[k] <= -40)) relations[keys.filter(k => relations[k] < 40).reduce((p, q) => (relations[p] <= relations[q] ? p : q))] = -60;
        }

        // Keep the newest events, but never drop a founding of year 0.
        const keep = cfg.eventsKept || 400;
        while (events.length > keep) {
            const i = events.findIndex(e => !(e.type === "founding" && e.year === 0));
            if (i < 0) break;
            events.splice(i, 1);
        }

        // Results into the factions. The player's home is its protected site; the view starts there (UF_World reads
        // state.viewStart in Game_Player.setupForNewGame).
        for (const x of fx) {
            x.f.population = Math.round(x.pop);
            const home = x.sites.find(s => s.protected) || livingSites(x)[0] || x.sites[0];
            if (home) x.f.home = { area: { x: home.area.x, y: home.area.y }, x: home.x, y: home.y };
        }
        for (const s of sites) delete s.level;
        if (homeSite) state.viewStart = { x: homeSite.x, y: homeSite.y };
        state.history = { version: 3, years, events, sites, rulers, wars, homeSiteId: homeSite ? homeSite.id : null, clockYear0: years };
        History.lastRun = { ms: now() - started, years, factions: fx.length, sites: sites.length, events: events.length };
        return state.history;
    }

    //-------------------------------------------------------------------------
    // The settling run (VISION V54): the last settleYears of the history played out on the built map, site by
    // site. People are counts by age (no units yet); pieces are written to the object grid. Live world: through
    // UF.Objects.setIn / UF.World.setObject (diffs, the peek cache, regrowth). A test state (not the world being
    // created) gets a pure build of its own and its diffs written directly, so nothing leaks into the live map.

    const MAX_AGE = 100;
    const STAGES = ["baby", "child", "teen", "adult", "elder"];
    const stageOf = age => (age < 1 ? "baby" : age < 12 ? "child" : age < 18 ? "teen" : age < 60 ? "adult" : "elder");
    const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth",
        "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth"];
    const ordinal = n => ORDINALS[n - 1] || `${n}th`;
    const NUMBERS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
    const numberWord = n => NUMBERS[n] || String(n);
    const SETTLE_DEFAULTS = {
        years: 100,                 // history.settleYears wins when present
        birthChancePerPair: 0.055,  // per adult pair per year (halved per user directive 2026-09-20)
        feverChancePerYear: 0.02, feverLoss: [0.1, 0.35],
        peoplePerHouse: 5, peoplePerBed: 2, peoplePerStockpile: 12, workbenchAt: 8, secondWallAt: 0.5,
        treesPerPersonYear: 0.06, stonesPerPersonYear: 0.04, bushesPerPerson: 0.3, depleteFraction: 0.5,
        reach: 6,                   // resources are used within radius + reach of the site
        minPeople: 3                // fewer than this and a site is abandoned (or, protected / the faction's last, refilled)
    };
    const settleConfig = cfg => Object.assign({}, SETTLE_DEFAULTS, (cfg && cfg.settle) || {}, cfg && cfg.settleYears !== undefined ? { years: cfg.settleYears } : {});
    // Yearly death chance by age (DF timescale, V40): infants and elders die most; nobody passes MAX_AGE.
    const deathRate = a => (a < 1 ? 0.06 : a < 12 ? 0.008 : a < 60 ? 0.005 : Math.min(1, 0.04 + (a - 60) * 0.012));
    const PYRAMID = [[0, 1, 0.03], [1, 12, 0.22], [12, 18, 0.10], [18, 60, 0.55], [60, 80, 0.10]]; // starting age spread

    /** Roll the six ability scores: 4d6 drop the lowest from hash32(seed, unitId, SALT_STATS), shifted by species and stage, clamped 3-18. */
    function rollStats(seed, unitId, species, stage) {
        const rng = mulberry32(hash32(seed, unitId, SALT_STATS));
        const roll = () => {
            const d = [0, 0, 0, 0].map(() => 1 + Math.floor(rng() * 6)).sort((a, b) => a - b);
            return d[1] + d[2] + d[3];
        };
        const people = (catalog() && catalog().people) || {};
        const mods = (people[species] && people[species].stats) || {};
        const byStage = stage === "baby" || stage === "child" ? { str: -2, con: -2 } : stage === "elder" ? { str: -1, dex: -1, con: -1 } : {};
        const out = {};
        for (const k of ["str", "dex", "con", "int", "wis", "cha"]) out[k] = clamp(roll() + (mods[k] | 0) + (byStage[k] | 0), 3, 18);
        return out;
    }
    History.rollStats = rollStats;

    function settle(state, cfg, live, yearsWanted) {
        const W = window.UF && UF.World;
        const h = state && state.history;
        const cat = catalog();
        if (!W || !h || !cat || !Array.isArray(cat.objects) || !state.factions) return null;
        const O = live && window.UF.Objects && typeof UF.Objects.setIn === "function" ? UF.Objects : null;
        const sc = settleConfig(cfg);
        const years = Math.max(0, (yearsWanted !== undefined ? yearsWanted : sc.years) | 0);
        const t0 = now();
        const rand = mulberry32(hash32(state.seed, SALT_SETTLE));
        const pick = arr => arr[Math.floor(rand() * arr.length)];
        const size = state.size;
        const objects = cat.objects;
        const typeById = new Map(objects.map((o, i) => [o.id, i + 1]));
        const typeId = id => (id ? typeById.get(id) || 0 : 0);
        const entry = t => objects[t - 1] || null;
        const tags = t => { const e = entry(t); return (e && Array.isArray(e.tags) && e.tags) || []; };
        const F = state.factions;
        const factionOf = id => F.list.find(f => f.id === id) || null;
        const events = [];
        const record = (year, type, text, site) => events.push({ year, type, text, factions: site.faction ? [site.faction] : [], site: site.id });
        const y0 = Math.max(1, h.years - years + 1);
        const totals = { sitesGrown: 0, houses: 0, beds: 0, hearths: 0, stockpiles: 0, walls: 0, workbenches: 0, ruined: 0, items: 0, depleted: { trees: 0, bushes: 0, stones: 0 } };
        let objectHash = 2166136261 >>> 0, writes = 0, buildMs = 0;
        const BED = typeId("floor_straw"), HEARTH = typeId("kitchen_hearth") || typeId("campfire"), STOCK = typeId("stockpile"), BENCH = typeId("workbench");

        // One built map per area: the peek cache for the live world (shared with the spawning that follows), a
        // fresh pure build for a test state.
        const maps = new Map();
        const mapFor = area => {
            const key = W.areaKey(area.x, area.y);
            let m = maps.get(key);
            if (!m) {
                const b0 = now();
                const map = live ? W.peekArea(area.x, area.y) : W.buildArea(area.x, area.y);
                buildMs += now() - b0;
                m = { area: { x: area.x, y: area.y }, key, grid: map.ufObjects, data: map.data };
                maps.set(key, m);
            }
            return m;
        };
        // Land: no water on layer 0 (every water kind of the catalog is an A1 autotile; Tilemap.isWaterTile misses the
        // marsh and swamp blocks) and not a peak (region 250).
        const land = (m, x, y) => x >= 0 && y >= 0 && x < size && y < size && !Tilemap.isTileA1(m.data[y * size + x]) && m.data[(5 * size + y) * size + x] !== 250;
        const write = (m, x, y, t) => {
            const i = y * size + x;
            if (m.grid[i] === t) return false;
            if (live) {
                if (O) O.setIn(m.area, x, y, t); else W.setObject(m.area.x, m.area.y, x, y, t);
            } else {
                (state.objectDiffs[m.key] = state.objectDiffs[m.key] || {})[i] = t;
            }
            m.grid[i] = t;
            objectHash = hash32(objectHash, i, t);
            writes++;
            return true;
        };

        // The sites to settle: every living faction site.
        const sims = [];
        for (const site of h.sites) {
            if (site.ruined || site.kind === "lair" || !site.faction) continue;
            const f = factionOf(site.faction);
            if (!f) continue;
            const k = kindConfig(site.kind);
            const R = k.radius || 3;
            const culture = (cat.cultures && cat.cultures[f.species]) || {};
            const wall = typeId(culture.wall) || typeId(k.ring) || typeId("wall_wood");
            const laterWall = typeId(culture.laterWall) || wall;
            const m = mapFor(site.area);
            const cap = Math.max(8, R * R); // what the ground inside and around the ring holds
            const pop0 = clamp(Math.round(site.pop * 0.25), Math.max(4, sc.minPeople), Math.max(4, Math.round(cap * 0.5)));
            const ages = new Array(MAX_AGE).fill(0);
            for (let i = 0; i < pop0; i++) {
                let r = rand(), a = 30;
                for (const [lo, hi, w] of PYRAMID) { if (r < w) { a = lo + Math.floor(rand() * (hi - lo)); break; } r -= w; }
                ages[a]++;
            }
            const layout = piecesFor(state, site);
            const pieces = new Set(layout.map(p => (site.y + p.dy) * size + site.x + p.dx));
            const stockCells = layout.filter(p => p.object === "stockpile").map(p => ({ x: site.x + p.dx, y: site.y + p.dy }));
            const S = {
                site, f, R, m, wall, laterWall, cap, ages, pop: pop0, pop0, pieces, built: new Map(), reserved: new Set(), rooms: [],
                houses: [], beds: 0, bedsStamped: layout.filter(p => p.object === "floor_straw").length, stockpiles: 0, stockCells, walls: 0,
                workbench: 0, thickened: false, stores: { log: 0, stone: 0, food: 0, straw: 0 }, depleted: { trees: 0, bushes: 0, stones: 0 },
                woodDebt: 0, stoneDebt: 0, foodDebt: 0, mark: Math.floor(pop0 / 10), peak: pop0, houseTry: -100, joined: -100, dead: false,
                trees: [], bushes: [], stones: [], hunter: (culture.priorities && culture.priorities.hunt >= 1.3) || false
            };
            for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) S.reserved.add((site.y + dy) * size + site.x + dx);
            const mid = Math.floor(size / 2);
            const inStartArea = sameArea(site.area, state.startArea);
            if (site.protected && inStartArea) S.reserved.add(mid * size + mid); // the start cell stays clear (worldgen's glade_clear)
            // Resources within reach of the site (not its own pieces). The start kit's ring (start.kit.radius) is left
            // alone: the user's rule keeps the start dense whatever the home site used over the years.
            const reach = R + (sc.reach | 0);
            const kitR = inStartArea && cat.start && cat.start.kit && Array.isArray(cat.start.kit.radius) ? cat.start.kit.radius[1] : -1;
            S.kitR = kitR;
            S.kitTypes = new Set(kitR >= 0 ? Object.keys(cat.start.kit.objects || {}).map(typeId).filter(Boolean) : []);
            S.mid = mid;
            for (let dy = -reach; dy <= reach; dy++) {
                for (let dx = -reach; dx <= reach; dx++) {
                    const x = site.x + dx, y = site.y + dy;
                    if (x < 0 || y < 0 || x >= size || y >= size) continue;
                    if (kitR >= 0 && Math.hypot(x - mid, y - mid) <= kitR) continue;
                    const i = y * size + x, t = m.grid[i];
                    if (!t || pieces.has(i)) continue;
                    const e = entry(t), tg = tags(t), acts = (e && e.actions) || {};
                    if (tg.includes("tree") && acts.chop && acts.chop.becomes && !tg.includes("food")) S.trees.push(i);
                    else if (acts.gather && acts.gather.becomes && typeId(acts.gather.becomes) && tg.includes("food")) S.bushes.push(i);
                    else if (tg.includes("stone") && acts.pick && e.passable) S.stones.push(i);
                }
            }
            S.treeCap = Math.floor(S.trees.length * sc.depleteFraction);
            S.stoneCap = Math.floor(S.stones.length * sc.depleteFraction);
            sims.push(S);
        }
        const livingOf = f => sims.filter(S => S.f === f && !S.dead);
        const cheb = (S, x, y) => Math.max(Math.abs(x - S.site.x), Math.abs(y - S.site.y));
        const free = (S, x, y) => {
            if (!land(S.m, x, y)) return false;
            const i = y * size + x;
            if (S.pieces.has(i) || S.built.has(i) || S.reserved.has(i)) return false;
            const t = S.m.grid[i];
            if (!t) return true;
            if (S.kitR >= 0 && S.kitTypes.has(t) && Math.hypot(x - S.mid, y - S.mid) <= S.kitR) return false; // the start kit is never built over
            const e = entry(t);
            return !!e && e.passable === true && !tags(t).includes("building");
        };
        /** A free cell inside the ring (Chebyshev <= maxD), seeded; null when full. */
        const freeInside = (S, maxD) => {
            const cells = [];
            for (let dy = -maxD; dy <= maxD; dy++) for (let dx = -maxD; dx <= maxD; dx++) if (free(S, S.site.x + dx, S.site.y + dy)) cells.push([S.site.x + dx, S.site.y + dy]);
            return cells.length ? pick(cells) : null;
        };
        const place = (S, x, y, t) => { write(S.m, x, y, t); S.built.set(y * size + x, t); };
        const factionName = S => S.f.name;

        // Growth steps. Each returns true when it built something.
        const thicken = (S, year) => {
            // A second ring at R + 1 with the openings of the first (cells next to an inner gap stay open).
            const R = S.R, site = S.site;
            const perim = r => {
                const out = [];
                for (let dx = -r; dx < r; dx++) out.push([dx, -r]);
                for (let dy = -r; dy < r; dy++) out.push([r, dy]);
                for (let dx = r; dx > -r; dx--) out.push([dx, r]);
                for (let dy = r; dy > -r; dy--) out.push([-r, dy]);
                return out;
            };
            const inner = perim(R);
            const gaps = inner.filter(([dx, dy]) => !S.pieces.has((site.y + dy) * size + site.x + dx));
            let n = 0;
            for (const [dx, dy] of perim(R + 1)) {
                if (gaps.some(([gx, gy]) => Math.abs(gx - dx) <= 1 && Math.abs(gy - dy) <= 1)) continue;
                const x = site.x + dx, y = site.y + dy;
                if (!free(S, x, y)) continue;
                place(S, x, y, S.laterWall);
                n++;
            }
            S.thickened = true;
            S.walls += n;
            totals.walls += n;
            if (n) record(year, "settle_built", `${site.name} raised a second wall around itself.`, site);
            return n > 0;
        };
        const addBed = S => {
            let cell = null;
            while (S.rooms.length && !cell) {
                const i = S.rooms.shift();
                if (S.built.get(i) === 0) cell = [i % size, Math.floor(i / size)];
            }
            if (!cell) cell = freeInside(S, S.R - 1);
            if (!cell) return false;
            place(S, cell[0], cell[1], BED);
            S.beds++;
            totals.beds++;
            return true;
        };
        const addStockpile = (S, year) => {
            const cell = freeInside(S, S.R - 1);
            if (!cell) return false;
            place(S, cell[0], cell[1], STOCK);
            S.stockpiles++;
            S.stockCells.push({ x: cell[0], y: cell[1] });
            totals.stockpiles++;
            record(year, "settle_built", `${S.site.name} laid out its ${ordinal(S.stockCells.length)} stockpile.`, S.site);
            return true;
        };
        const addWorkbench = (S, year) => {
            const cell = freeInside(S, S.R - 2);
            if (!cell) return false;
            place(S, cell[0], cell[1], BENCH);
            S.workbench++;
            totals.workbenches++;
            const e = entry(BENCH);
            record(year, "settle_built", `${S.site.name} set up a ${e ? e.name.toLowerCase() : "workbench"}.`, S.site);
            return true;
        };
        /** A house with diverse architectural footprints: L-shaped, octagonal rotunda, T-shaped, longhouse, or box cottage. */
        const addHouse = (S, year) => {
            const R = S.R, site = S.site;
            const shapeRoll = rand();
            let shape = "box", w = 4 + (rand() < 0.4 ? 1 : 0), hh = 4 + (rand() < 0.4 ? 1 : 0);
            if (shapeRoll < 0.25) {
                shape = "l_shape";
                w = 5 + (rand() < 0.5 ? 1 : 0);
                hh = 5 + (rand() < 0.5 ? 1 : 0);
            } else if (shapeRoll < 0.45) {
                shape = "octagonal";
                w = 5 + (rand() < 0.5 ? 1 : 0);
                hh = w;
            } else if (shapeRoll < 0.65) {
                shape = "longhouse";
                if (rand() < 0.5) { w = 4; hh = 6 + (rand() < 0.5 ? 1 : 0); }
                else { w = 6 + (rand() < 0.5 ? 1 : 0); hh = 4; }
            } else if (shapeRoll < 0.80) {
                shape = "t_shape";
                w = 5 + (rand() < 0.5 ? 1 : 0);
                hh = 5 + (rand() < 0.5 ? 1 : 0);
            }

            const inFootprint = (dx, dy) => {
                if (dx < 0 || dy < 0 || dx >= w || dy >= hh) return false;
                if (shape === "l_shape") {
                    if (dx >= w - 2 && dy >= hh - 2) return false;
                } else if (shape === "octagonal") {
                    if (dx + dy < 1) return false;
                    if ((w - 1 - dx) + dy < 1) return false;
                    if (dx + (hh - 1 - dy) < 1) return false;
                    if ((w - 1 - dx) + (hh - 1 - dy) < 1) return false;
                } else if (shape === "t_shape") {
                    if (dy < 2 && (dx < 1 || dx >= w - 1)) return false;
                }
                return true;
            };
            const isPerim = (dx, dy) => !inFootprint(dx - 1, dy) || !inFootprint(dx + 1, dy) ||
                                        !inFootprint(dx, dy - 1) || !inFootprint(dx, dy + 1);

            const zones = [[0, R - 2], [R + 3, R + 7]]; // inside the ring first, then the band just outside it
            for (const [lo, hi] of zones) {
                if (hi - lo + 1 < Math.max(w, hh)) continue;
                const spots = [];
                for (let y0 = site.y - hi; y0 <= site.y + hi - hh + 1; y0++) {
                    for (let x0 = site.x - hi; x0 <= site.x + hi - w + 1; x0++) {
                        const x1 = x0 + w - 1, y1 = y0 + hh - 1;
                        const near = Math.max(x0 > site.x ? x0 - site.x : x1 < site.x ? site.x - x1 : 0, y0 > site.y ? y0 - site.y : y1 < site.y ? site.y - y1 : 0);
                        const far = Math.max(Math.abs(x0 - site.x), Math.abs(x1 - site.x), Math.abs(y0 - site.y), Math.abs(y1 - site.y));
                        if (near < lo || far > hi) continue;
                        spots.push({ x0, y0, order: near + rand() * 2 });
                    }
                }
                spots.sort((a, b) => a.order - b.order);
                for (const { x0, y0 } of spots) {
                    let ok = true;
                    for (let dy = 0; dy < hh && ok; dy++) {
                        for (let dx = 0; dx < w && ok; dx++) {
                            if (inFootprint(dx, dy) && !free(S, x0 + dx, y0 + dy)) ok = false;
                        }
                    }
                    if (!ok) continue;

                    // Find perimeter cell facing site center whose exterior step 'out' is free
                    const candidateDoors = [];
                    for (let dy = 0; dy < hh; dy++) {
                        for (let dx = 0; dx < w; dx++) {
                            if (!inFootprint(dx, dy) || !isPerim(dx, dy)) continue;
                            const x = x0 + dx, y = y0 + dy;
                            for (const [ox, oy] of [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]]) {
                                if (!inFootprint(ox - x0, oy - y0) && free(S, ox, oy)) {
                                    const dist = Math.abs(ox - site.x) + Math.abs(oy - site.y);
                                    candidateDoors.push({ door: [x, y], out: [ox, oy], dist });
                                }
                            }
                        }
                    }
                    if (!candidateDoors.length) continue;
                    candidateDoors.sort((a, b) => a.dist - b.dist);
                    const { door, out } = candidateDoors[0];

                    const interior = [];
                    let wallsCount = 0;
                    for (let dy = 0; dy < hh; dy++) {
                        for (let dx = 0; dx < w; dx++) {
                            if (!inFootprint(dx, dy)) continue;
                            const x = x0 + dx, y = y0 + dy;
                            const edge = isPerim(dx, dy);
                            if (x === door[0] && y === door[1]) {
                                write(S.m, x, y, 0); S.built.set(y * size + x, 0);
                            } else if (edge) {
                                place(S, x, y, S.wall);
                                wallsCount++;
                            } else {
                                write(S.m, x, y, 0); S.built.set(y * size + x, 0);
                                interior.push([x, y]);
                            }
                        }
                    }
                    S.reserved.add(out[1] * size + out[0]);
                    const allInterior = interior.slice();
                    interior.sort((a, b) => (Math.abs(b[0] - door[0]) + Math.abs(b[1] - door[1])) - (Math.abs(a[0] - door[0]) + Math.abs(a[1] - door[1])));
                    const bed = interior.shift();
                    if (bed) {
                        place(S, bed[0], bed[1], BED);
                        S.beds++;
                        totals.beds++;
                    }
                    let hearth = null;
                    if (interior.length >= 1 && HEARTH) {
                        hearth = interior.shift();
                        place(S, hearth[0], hearth[1], HEARTH);
                        S.hearths = (S.hearths || 0) + 1;
                        totals.hearths = (totals.hearths || 0) + 1;
                    }
                    let bed2 = null;
                    if (interior.length >= 1 && BED) {
                        bed2 = interior.shift();
                        place(S, bed2[0], bed2[1], BED);
                        S.beds++;
                        totals.beds++;
                    }
                    const floorKind = (S.f && cat.cultures && cat.cultures[S.f.species] && cat.cultures[S.f.species].floor && cat.cultures[S.f.species].floor.kind) ||
                        (entry(S.wall) && entry(S.wall).id.includes("stone") ? "floor_stone" : "floor_wood");
                    const Floors = window.UF && UF.Floors;
                    if (Floors && typeof Floors.setFloor === "function") {
                        for (const [ix, iy] of allInterior) {
                            Floors.setFloor(S.m.area, ix, iy, floorKind);
                        }
                    }
                    if (Floors && typeof Floors.applyRoofedUpperDeck === "function") {
                        Floors.applyRoofedUpperDeck(S.m.area, { x0, y0, x1: x0 + w - 1, y1: y0 + hh - 1 }, entry(S.wall) && entry(S.wall).id.includes("stone") ? "stone" : "wood");
                    }
                    for (const [x, y] of interior) S.rooms.push(y * size + x);
                    const wallEntry = entry(S.wall);
                    S.houses.push({ x: x0, y: y0, w, h: hh, shape, door, bed, bed2, hearth, wall: wallEntry ? wallEntry.id : null, year });
                    S.walls += wallsCount;
                    totals.walls += wallsCount;
                    totals.houses++;
                    const n = S.houses.length;
                    if (n <= 3 || n % 5 === 0) record(year, "settle_built", `${site.name} raised its ${ordinal(n)} house (${shape}).`, site);
                    return true;
                }
            }
            return false;
        };
        const fell = (S, list, cap, counter) => {
            while (list.length && S.depleted[counter] < cap) {
                const j = Math.floor(rand() * list.length);
                const i = list.splice(j, 1)[0];
                const t = S.m.grid[i], e = entry(t);
                if (!e || !e.actions) continue;
                const act = e.actions.chop || e.actions.pick;
                if (!act) continue;
                for (const [item, n] of Object.entries(act.yields || {})) if (S.stores[item] !== undefined) S.stores[item] += n | 0;
                write(S.m, i % size, Math.floor(i / size), act.becomes ? typeId(act.becomes) : 0);
                S.depleted[counter]++;
                totals.depleted[counter]++;
                return true;
            }
            return false;
        };
        const ruin = (S, year) => {
            for (const i of S.pieces) { const e = entry(S.m.grid[i]); write(S.m, i % size, Math.floor(i / size), e && e.ruin ? typeId(e.ruin) : 0); }
            for (const [i, t] of S.built) { const e = entry(t); write(S.m, i % size, Math.floor(i / size), e && e.ruin ? typeId(e.ruin) : 0); }
            S.dead = true;
            S.pop = 0;
            S.site.pop = 0;
            S.site.ruined = year;
            S.site.kind = "ruin";
            totals.ruined++;
            const f = S.f;
            if (f.home && f.home.x === S.site.x && f.home.y === S.site.y && sameArea(f.home.area, S.site.area)) {
                const other = livingOf(f)[0];
                if (other) f.home = { area: { x: other.site.area.x, y: other.site.area.y }, x: other.site.x, y: other.site.y };
            }
            record(year, "settle_fell", `${S.site.name} stood empty, and ${f.name} left it in ruin.`, S.site);
        };
        const removePeople = (S, n) => {
            let left = n;
            while (left > 0 && S.pop > 0) {
                let r = Math.floor(rand() * S.pop);
                for (let a = 0; a < MAX_AGE; a++) { if (r < S.ages[a]) { S.ages[a]--; S.pop--; left--; break; } r -= S.ages[a]; }
            }
            return n - left;
        };

        // The years.
        for (let year = y0; year <= h.years; year++) {
            for (const S of sims) {
                if (S.dead) continue;
                const site = S.site, ages = S.ages;
                // Deaths by age, then births from adult pairs, then everyone a year older.
                let deaths = 0;
                for (let a = 0; a < MAX_AGE; a++) {
                    const n = ages[a];
                    if (!n) continue;
                    const x = n * deathRate(a);
                    let d = Math.floor(x);
                    if (rand() < x - d) d++;
                    d = Math.min(n, d);
                    ages[a] -= d;
                    deaths += d;
                }
                S.pop -= deaths;
                if (S.pop >= 6 && rand() < sc.feverChancePerYear) {
                    const loss = sc.feverLoss[0] + rand() * (sc.feverLoss[1] - sc.feverLoss[0]);
                    const took = removePeople(S, Math.max(1, Math.round(S.pop * loss)));
                    if (took >= 2) record(year, "settle_fever", `A fever took ${numberWord(took)} in ${site.name}.`, site);
                }
                let adults = 0;
                for (let a = 18; a < 60; a++) adults += ages[a];
                const crowd = S.pop >= S.cap ? 0.2 : S.pop >= S.cap * 0.8 ? 0.5 : 1;
                const x = Math.floor(adults / 2) * sc.birthChancePerPair * crowd;
                let births = Math.floor(x);
                if (rand() < x - births) births++;
                for (let a = MAX_AGE - 1; a > 0; a--) ages[a] = ages[a - 1];
                ages[0] = births;
                S.pop = ages.reduce((p, q) => p + q, 0);
                // Too few to go on: the protected home and a faction's last site are refilled; any other is abandoned.
                const floor = site.protected ? Math.max(HOME_MIN_PEOPLE, sc.minPeople) : sc.minPeople;
                if (S.pop < floor) {
                    if (!site.protected && livingOf(S.f).length > 1) { ruin(S, year); continue; }
                    while (S.pop < floor) { ages[20 + Math.floor(rand() * 16)]++; S.pop++; }
                    if (year - S.joined >= 20) record(year, "settle_joined", `Newcomers settled at ${site.name}.`, site);
                    S.joined = year;
                }
                // Growth marks.
                while (S.pop >= (S.mark + 1) * 10) {
                    S.mark++;
                    if ([1, 2, 3, 5, 8, 10, 15, 20].includes(S.mark)) record(year, "settle_grew", `${site.name} grew to ${S.mark * 10} souls.`, site);
                }
                if (S.pop > S.peak) S.peak = S.pop;
                // Pieces by population, in this order: the second wall, beds, stockpiles, the work stone, houses.
                if (!S.thickened && S.pop >= S.cap * sc.secondWallAt) thicken(S, year);
                let wantBeds = Math.ceil(S.pop / sc.peoplePerBed) - S.bedsStamped;
                while (S.beds < wantBeds && addBed(S)) { /* one per two people */ }
                const wantStock = 1 + Math.floor(S.pop / sc.peoplePerStockpile);
                while (S.stockCells.length < wantStock && addStockpile(S, year)) { /* one per twelve */ }
                if (!S.workbench && S.pop >= sc.workbenchAt) addWorkbench(S, year);
                const wantHouses = Math.floor(S.pop / sc.peoplePerHouse);
                if (S.houses.length < wantHouses && year - S.houseTry >= 5) {
                    if (!addHouse(S, year)) S.houseTry = year; // no room: try again in five years
                }
                // What the site uses up around itself: trees to stumps, loose stones taken (bushes at the end).
                S.woodDebt += S.pop * sc.treesPerPersonYear;
                while (S.woodDebt >= 1 && fell(S, S.trees, S.treeCap, "trees")) S.woodDebt -= 1;
                if (S.woodDebt >= 1) S.woodDebt = 0;
                S.stoneDebt += S.pop * sc.stonesPerPersonYear;
                while (S.stoneDebt >= 1 && fell(S, S.stones, S.stoneCap, "stones")) S.stoneDebt -= 1;
                if (S.stoneDebt >= 1) S.stoneDebt = 0;
                S.stores.food = Math.min(S.pop * 2, S.stores.food + Math.round(S.pop * 0.5));
                S.stores.straw = Math.min(S.pop, S.stores.straw + 1);
            }
        }

        // Results: the site records, the bushes picked lately, the factions' populations, items in the stockpiles.
        const I = live && window.UF.Items && typeof UF.Items.drop === "function" ? UF.Items : null;
        for (const S of sims) {
            const site = S.site;
            if (S.dead) { site.settled = { pop0: S.pop0, pop: 0, years, fell: site.ruined }; continue; }
            const picks = years > 0 ? Math.min(Math.round(S.pop * sc.bushesPerPerson), Math.floor(S.bushes.length * sc.depleteFraction)) : 0;
            for (let n = 0; n < picks && S.bushes.length; n++) {
                const i = S.bushes.splice(Math.floor(rand() * S.bushes.length), 1)[0];
                const e = entry(S.m.grid[i]);
                if (!e || !e.actions || !e.actions.gather) continue;
                write(S.m, i % size, Math.floor(i / size), typeId(e.actions.gather.becomes));
                S.depleted.bushes++;
                totals.depleted.bushes++;
                S.stores.food += 2;
            }
            const stages = { baby: 0, child: 0, teen: 0, adult: 0, elder: 0 };
            for (let a = 0; a < MAX_AGE; a++) stages[stageOf(a)] += S.ages[a];
            S.stores.log = Math.min(S.stores.log, 25);
            S.stores.stone = Math.min(S.stores.stone, 20);
            S.stores.food = Math.min(S.stores.food, 30);
            S.stores.straw = Math.min(S.stores.straw, 10);
            site.pop = S.pop;
            site.settled = {
                years, pop0: S.pop0, pop: S.pop, peak: S.peak, stages, ages: S.ages, houses: S.houses, beds: S.beds, bedsStamped: S.bedsStamped,
                stockpiles: S.stockpiles, stockCells: S.stockCells, walls: S.walls, workbench: S.workbench, thickened: S.thickened,
                stores: S.stores, depleted: S.depleted // no per-site item count here: the site record must not depend on UF_Items being live (deterministic check)
            };
            if (S.houses.length || S.beds || S.stockpiles || S.walls || S.workbench) totals.sitesGrown++;
            // Items into the stockpiles (stacks by UF_Items); a test state only records the counts.
            if (I && years > 0 && S.stockCells.length) {
                const food = S.hunter ? "meat_cooked" : "berries";
                const kinds = [[food, S.stores.food], ["log", S.stores.log], ["stone", S.stores.stone], ["straw", S.stores.straw]];
                let c = 0;
                for (const [id, n] of kinds) {
                    if (!(n > 0) || !UF.Items.type(id)) continue;
                    const cell = S.stockCells[c++ % S.stockCells.length];
                    const dropped = UF.Items.drop({ x: site.area.x, y: site.area.y }, cell.x, cell.y, id, n);
                    totals.items += dropped.length;
                }
            }
        }
        for (const f of F.list) {
            const living = sims.filter(S => S.f === f && !S.dead);
            if (living.length) f.population = living.reduce((n, S) => n + S.pop, 0);
        }
        // The settling events join the chronicle in year order (stable: later events of a year stay later).
        h.events = h.events.concat(events).map((e, i) => [e, i]).sort((a, b) => a[0].year - b[0].year || a[1] - b[1]).map(p => p[0]);
        const summary = {
            years, from: y0, to: h.years, events: events.length, sites: sims.length, sitesGrown: totals.sitesGrown, houses: totals.houses,
            beds: totals.beds, hearths: totals.hearths, stockpiles: totals.stockpiles, walls: totals.walls, workbenches: totals.workbenches, ruined: totals.ruined,
            depleted: totals.depleted, items: totals.items, itemsPlaced: !!I, writes, objectHash, ms: now() - t0 - buildMs, buildMs
        };
        h.settled = summary;
        History.lastSettle = summary;
        return summary;
    }

    /**
     * Second-by-second living world history simulation (1-200 AD, user directives 2026-09-20).
     * Pushes through elapsed simulation time second-by-second from Year 1 founders
     * around the central campfire to targetYear.
     * Cadence: 1 in-game day = 1 year = 240 real simulation seconds.
     * 1 second = 6 game minutes ($ufTime.advanceMinute(6)).
     */
    History.iterateWorldHistory = function(state, targetYears, opts = {}) {
        const st = state || (window.UF && UF.World && UF.World.state);
        if (!st || !st.history || !targetYears || targetYears <= 1) return null;
        const totalSeconds = (opts.seconds !== undefined ? opts.seconds : (targetYears - 1) * 240) | 0;
        if (totalSeconds <= 0) return null;

        const started = now();
        const W = window.UF && UF.World;
        const live = !!(W && W.state === st);
        const cat = catalog() || {};
        const objects = cat.objects || [];
        const typeById = new Map(objects.map((o, i) => [o.id, i + 1]));
        const typeId = id => (id ? typeById.get(id) || 0 : 0);
        const entry = t => objects[t - 1] || null;
        const O = live && window.UF.Objects && typeof UF.Objects.setIn === "function" ? UF.Objects : null;
        const size = st.size;

        const BED_TYPE = typeId("floor_straw");
        const HEARTH_TYPE = typeId("kitchen_hearth") || typeId("campfire");
        const STOCK_TYPE = typeId("stockpile");

        // Ensure colony and households exist
        if (!st.colony && window.UF && UF.Colonists && UF.Colonists.setup) {
            try { UF.Colonists.setup(st); } catch (e) {}
        }
        if (window.UF && UF.Households && UF.Households.reconcile) {
            try { UF.Households.reconcile(); } catch (e) {}
        }

        const C = window.UF && UF.Colonists;
        const H = window.UF && UF.Households;
        const internal = (C && C._internal) || {};
        const progressAging = (C && C.progressAging) || internal.progressAging || (() => {});
        const progressPregnancies = (C && C.progressPregnancies) || internal.progressPregnancies || (() => {});
        const stepFactionReproduction = (C && C.stepFactionReproduction) || internal.stepFactionReproduction || (() => {});
        const stepImmigration = (C && C.stepImmigration) || internal.stepImmigration || (() => {});
        const attemptAdulthoodPairbond = (C && C.attemptAdulthoodPairbond) || internal.attemptAdulthoodPairbond || (() => {});
        const activeFocalHousehold = (H && H.activeFocalHousehold) || (() => null);

        const write = (area, x, y, t) => {
            const i = y * size + x;
            if (live && O) O.setIn(area, x, y, typeof t === "string" ? t : (objects[t - 1] ? objects[t - 1].id : null));
            else if (live && W && W.setObject) W.setObject(area.x, area.y, x, y, t, levelOf(area));
            else {
                const key = `${area.x},${area.y},${levelOf(area)}`;
                (st.objectDiffs[key] = st.objectDiffs[key] || {})[i] = t;
            }
        };

        const read = (area, x, y) => {
            if (live && O) return O.typeIdIn(area, x, y);
            if (live && W && W.getObject) return W.getObject(area.x, area.y, x, y, levelOf(area));
            const key = `${area.x},${area.y},${levelOf(area)}`;
            const diff = st.objectDiffs && st.objectDiffs[key];
            return (diff && diff[y * size + x]) || 0;
        };

        const land = (area, x, y) => {
            if (x < 1 || y < 1 || x >= size - 1 || y >= size - 1) return false;
            const tile = W ? W.getTile(area.x, area.y, x, y, 0, levelOf(area)) : 1;
            const isWater = !Tilemap.isTileA1 ? false : Tilemap.isTileA1(tile);
            return !isWater && (W ? W.getTile(area.x, area.y, x, y, 5, levelOf(area)) !== 250 : true);
        };

        // Track stats for the settling summary
        let housesBuilt = 0, bedsPlaced = 0, hearthsPlaced = 0, wallsPlaced = 0, roomsBuilt = 0, roadsPlaced = 0;
        let totalWoodcut = 0, totalQuarry = 0, totalHaul = 0, totalBuild = 0, totalCook = 0;
        let totalCombatRounds = 0, casualtiesCount = 0;
        const builtPositions = new Set();
        const roadPositions = new Set();
        const structuresList = [];

        // Helper: grant skill XP and update skill levels (UF_Skills)
        const S = window.UF && UF.Skills;
        const gainSkillXp = (u, skillId, xp) => {
            if (!u || !u.data || u.data.dead) return;
            const sx = u.data.skillXp = u.data.skillXp || {};
            sx[skillId] = (sx[skillId] || 0) + xp;
            const level = S && S.levelForXp ? S.levelForXp(sx[skillId]) : Math.min(99, 1 + Math.floor(Math.sqrt((sx[skillId] || 0) / 100)));
            const sk = u.data.skills = u.data.skills || {};
            sk[skillId] = level;
        };

        // Helper: ensure authentic physical state on every colonist
        const initUnitPhysicalState = u => {
            if (!u || !u.data) return;
            const d = u.data;
            d.maxHp = d.maxHp || 20;
            d.hp = (typeof d.hp === "number" && Number.isFinite(d.hp)) ? d.hp : d.maxHp;
            d.wounds = d.wounds || [];
            d.skills = d.skills || {};
            d.skillXp = d.skillXp || {};
            d.actions = d.actions || { woodcut: 0, quarry: 0, haul: 0, build: 0, cook: 0, fight: 0, heal: 0, eat: 0, sleep: 0 };
            d.needs = d.needs || { hunger: 20, thirst: 20, rest: 0, social: 0 };
        };

        const allInitialUnits = (internal.allFactionPeople && internal.allFactionPeople()) || (W && W.units ? W.units() : []) || [];
        for (const u of allInitialUnits) {
            initUnitPhysicalState(u);
        }

        // Separation check: Candidate structure [candX0, candY0, candX0 + w - 1, candY0 + h - 1]
        // must have at least 1 square of separation from all other structures in structuresList
        const canPlaceStructure = (candX0, candY0, w, h, excludeId = null) => {
            const candX1 = candX0 + w - 1;
            const candY1 = candY0 + h - 1;
            for (const s of structuresList) {
                if (excludeId && s.id === excludeId) continue;
                // Bounding box overlap with 1-square padding on candidate (guarantees >= 1 empty tile between structures)
                const overlap = (
                    Math.max(candX0 - 1, s.x0) <= Math.min(candX1 + 1, s.x1) &&
                    Math.max(candY0 - 1, s.y0) <= Math.min(candY1 + 1, s.y1)
                );
                if (overlap) return false;
            }
            return true;
        };

        // Connect a home's entrance door to the settlement trail/road network
        const connectHomeWithRoad = (site, f, door) => {
            const area = siteArea(site);
            const sharedStruct = structuresList.find(s => s.id === "shared_" + f.id);
            const targetDoor = sharedStruct ? sharedStruct.door : { x: site.x, y: site.y + 3 };

            // Find nearest destination: existing road cell or the central shared entrance
            let dest = targetDoor;
            let bestDist = Math.abs(door.x - targetDoor.x) + Math.abs(door.y - targetDoor.y);
            for (const rKey of roadPositions) {
                const [rx, ry] = rKey.split(",").map(Number);
                const d = Math.abs(door.x - rx) + Math.abs(door.y - ry);
                if (d < bestDist) {
                    bestDist = d;
                    dest = { x: rx, y: ry };
                }
            }

            const isWall = (x, y) => {
                for (const s of structuresList) {
                    const isDoor = (x === s.door.x && y === s.door.y);
                    if (isDoor) continue;
                    if (x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1) {
                        const isPerim = (x === s.x0 || x === s.x1 || y === s.y0 || y === s.y1);
                        if (isPerim) return true;
                    }
                }
                return false;
            };

            // BFS pathfinder on local terrain avoiding structure walls
            const queue = [{ x: door.x, y: door.y, path: [] }];
            const visited = new Set([`${door.x},${door.y}`]);
            let foundPath = null;

            while (queue.length > 0) {
                const curr = queue.shift();
                if (curr.x === dest.x && curr.y === dest.y) {
                    foundPath = curr.path;
                    break;
                }
                if (curr.path.length > 60) continue;

                const neighbors = [
                    { x: curr.x + 1, y: curr.y },
                    { x: curr.x - 1, y: curr.y },
                    { x: curr.x, y: curr.y + 1 },
                    { x: curr.x, y: curr.y - 1 }
                ];
                neighbors.sort((a, b) => (Math.abs(a.x - dest.x) + Math.abs(a.y - dest.y)) - (Math.abs(b.x - dest.x) + Math.abs(b.y - dest.y)));

                for (const n of neighbors) {
                    const nKey = `${n.x},${n.y}`;
                    if (visited.has(nKey)) continue;
                    visited.add(nKey);
                    if (!land(area, n.x, n.y)) continue;
                    if (isWall(n.x, n.y)) continue;
                    queue.push({ x: n.x, y: n.y, path: [...curr.path, n] });
                }
            }

            const cellsToPave = foundPath || [];
            const roadKind = (f && f.species === "dwarf") ? "floor_stone" : "road";
            const T = window.UF && UF.Tiles;
            const roadBase = (T && T.groundBase) ? (T.groundBase(roadKind) || T.groundBase("road") || 2048) : 2048;

            for (const c of cellsToPave) {
                const cKey = `${c.x},${c.y}`;
                roadPositions.add(cKey);
                const t = read(area, c.x, c.y);
                if (t && t !== 0) {
                    const e = entry(t);
                    if (e && !e.tags.includes("building") && !e.tags.includes("fire")) {
                        write(area, c.x, c.y, null);
                    }
                }
                if (W && W.setTile) {
                    W.setTile(area.x, area.y, c.x, c.y, 0, roadBase, levelOf(area));
                }
                roadsPlaced++;
            }
            return cellsToPave.length;
        };

        // Task #1 of a faction: Build a shared structure for the 8 starting people around the fire
        const buildSharedCommunalStructure = (site, f, year) => {
            const culture = (cat.cultures && cat.cultures[f.species]) || {};
            const wallId = culture.wall || "wall_wood";
            const doorId = culture.door || (wallId.includes("stone") ? "door_stone" : "door_wood");
            const WALL_TYPE = typeId(wallId) || typeId("wall_wood");
            const DOOR_TYPE = typeId(doorId) || typeId("door_wood");
            const area = siteArea(site);

            const w = 7, hh = 7;
            const x0 = site.x - 3, y0 = site.y - 3;
            const x1 = site.x + 3, y1 = site.y + 3;
            const doorX = site.x, doorY = y1;

            // Check land validity
            for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                    if (!land(area, x, y)) return false;
                }
            }

            // 8 beds for the 8 starting people in the four corner alcoves:
            const bedLocations = [
                { x: x0 + 1, y: y0 + 1 }, { x: x0 + 2, y: y0 + 1 },
                { x: x1 - 2, y: y0 + 1 }, { x: x1 - 1, y: y0 + 1 },
                { x: x0 + 1, y: y1 - 2 }, { x: x0 + 1, y: y1 - 1 },
                { x: x1 - 1, y: y1 - 2 }, { x: x1 - 1, y: y1 - 1 }
            ];
            const bedMap = new Map();
            for (const b of bedLocations) bedMap.set(`${b.x},${b.y}`, b);

            // Lay perimeter walls and interior
            for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                    builtPositions.add(`${x},${y}`);
                    const isPerimeter = x === x0 || x === x1 || y === y0 || y === y1;
                    if (x === doorX && y === doorY) {
                        write(area, x, y, DOOR_TYPE);
                    } else if (isPerimeter) {
                        write(area, x, y, WALL_TYPE);
                        wallsPlaced++;
                    } else {
                        if (x === site.x && y === site.y) {
                            // Campfire remains in center
                        } else if (bedMap.has(`${x},${y}`)) {
                            write(area, x, y, BED_TYPE);
                            bedsPlaced++;
                        } else {
                            write(area, x, y, 0); // clear interior space
                        }
                    }
                }
            }

            housesBuilt++;

            const Floors = window.UF && UF.Floors;
            const floorId = (culture.floor && culture.floor.kind) || (wallId.includes("stone") ? "floor_stone" : "floor_wood");
            if (Floors && typeof Floors.setFloor === "function") {
                for (let y = y0 + 1; y < y1; y++) {
                    for (let x = x0 + 1; x < x1; x++) {
                        Floors.setFloor(area, x, y, floorId);
                    }
                }
            }
            if (Floors && typeof Floors.applyRoofedUpperDeck === "function") {
                Floors.applyRoofedUpperDeck(area, { x0, y0, x1, y1 }, wallId.includes("stone") ? "stone" : "wood");
            }

            // Assign beds to the 8 starting founders of this faction
            const facFounders = (W && W.units ? W.units() : []).filter(u => u && u.data && u.data.faction === f.id && u.data.founder).sort((a, b) => a.id - b.id);
            const assignedBeds = bedLocations.map((b, i) => {
                const u = facFounders[i];
                const unitId = u ? u.id : null;
                if (u && u.data) {
                    u.data.bed = { x: b.x, y: b.y };
                    u.x = b.x; u.y = b.y;
                    u.data.home = { area: { ...area }, x: b.x, y: b.y, z: levelOf(area) };
                    u.data.homeFire = { area: { ...area }, x: site.x, y: site.y, z: levelOf(area) };
                }
                return { x: b.x, y: b.y, unitId };
            });

            const sharedStruct = {
                id: "shared_" + f.id,
                x0, y0, x1, y1,
                area: { ...area },
                z: levelOf(area),
                door: { x: doorX, y: doorY },
                isShared: true,
                beds: assignedBeds
            };
            structuresList.push(sharedStruct);

            // Provide initial communal shelter to all founder households
            const allH = (H && H.all ? H.all() : []).filter(h => h.faction === f.id && !h.mergedInto);
            for (const h of allH) {
                if (!h.home) {
                    h.home = {
                        x: x0, y: y0, w, h: hh,
                        isShared: true,
                        isSheltered: true,
                        walls: [],
                        door: { x: doorX, y: doorY },
                        doors: [{ x: doorX, y: doorY }],
                        beds: assignedBeds,
                        hearth: { x: site.x, y: site.y },
                        storage: { x: doorX, y: doorY },
                        rooms: [
                            { type: "communal", name: "Great Hall", x: x0, y: y0, w, h: hh, hearth: { x: site.x, y: site.y } }
                        ],
                        annexes: []
                    };
                }
            }

            History.addEvent({
                year,
                type: "settle_built",
                text: `${f.name} built a shared great hall around the original campfire for the 8 founders to protect them from rain in Year ${year}.`,
                factions: [f.id],
                site: site.id
            });

            return true;
        };

        // Build a subsequent two-room home for a household (communal living area + master bedroom)
        // Must maintain at least 1 square of separation from all other structures
        const buildHomesteadAroundFire = (site, f, household, year) => {
            const culture = (cat.cultures && cat.cultures[f.species]) || {};
            const wallId = culture.wall || "wall_wood";
            const doorId = culture.door || (wallId.includes("stone") ? "door_stone" : "door_wood");
            const WALL_TYPE = typeId(wallId) || typeId("wall_wood");
            const DOOR_TYPE = typeId(doorId) || typeId("door_wood");
            const area = siteArea(site);

            // Two-room layout: 6 wide, 4 high
            // Communal Living Area (x0 to x0 + 3) with hearth and exterior door
            // Master Bedroom (x0 + 3 to x0 + 5) with bed and interior door
            const w = 6, hh = 4;
            const zones = [[5, 9], [10, 15], [16, 22]];
            let spotFound = null;

            for (const [lo, hi] of zones) {
                const spots = [];
                for (let y0 = site.y - hi; y0 <= site.y + hi - hh + 1; y0++) {
                    for (let x0 = site.x - hi; x0 <= site.x + hi - w + 1; x0++) {
                        const dist = Math.max(Math.abs(x0 - site.x), Math.abs(y0 - site.y));
                        if (dist < lo || dist > hi) continue;
                        spots.push({ x0, y0, dist });
                    }
                }
                spots.sort((a, b) => a.dist - b.dist || (a.x0 - b.x0));
                for (const spot of spots) {
                    // Check strict >= 1 square separation from ALL existing structures
                    if (!canPlaceStructure(spot.x0, spot.y0, w, hh)) continue;

                    let ok = true;
                    for (let dy = 0; dy < hh && ok; dy++) {
                        for (let dx = 0; dx < w && ok; dx++) {
                            const px = spot.x0 + dx, py = spot.y0 + dy;
                            if (!land(area, px, py)) { ok = false; break; }
                            if (builtPositions.has(`${px},${py}`)) { ok = false; break; }
                            const t = read(area, px, py);
                            if (t && t !== 0) {
                                const e = entry(t);
                                if (e && e.tags && (e.tags.includes("building") || e.tags.includes("fire"))) { ok = false; break; }
                            }
                        }
                    }
                    if (ok) {
                        spotFound = spot;
                        break;
                    }
                }
                if (spotFound) break;
            }

            if (!spotFound) return false;

            const { x0, y0 } = spotFound;
            const x1 = x0 + w - 1, y1 = y0 + hh - 1;

            // Exterior door on communal living area (facing outward/road)
            const doorX = x0 + 1, doorY = y1;
            // Interior door on dividing wall (x = x0 + 3)
            const intDoorX = x0 + 3, intDoorY = y0 + 1;
            // Hearth in communal living area
            const hearthX = x0 + 1, hearthY = y0 + 1;
            // Beds in master bedroom (one for each partner)
            const bedX = x0 + 4, bedY = y0 + 1;
            const bed2X = x0 + 4, bed2Y = y0 + 2;

            // Lay perimeter walls, dividing wall, and doors
            for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                    builtPositions.add(`${x},${y}`);
                    const isPerim = (x === x0 || x === x1 || y === y0 || y === y1);
                    const isDivWall = (x === x0 + 3);

                    if (x === doorX && y === doorY) {
                        write(area, x, y, DOOR_TYPE);
                    } else if (x === intDoorX && y === intDoorY) {
                        write(area, x, y, DOOR_TYPE);
                    } else if (isPerim || isDivWall) {
                        write(area, x, y, WALL_TYPE);
                        wallsPlaced++;
                    } else if (x === hearthX && y === hearthY) {
                        write(area, x, y, HEARTH_TYPE);
                        hearthsPlaced++;
                    } else if (x === bedX && y === bedY) {
                        write(area, x, y, BED_TYPE);
                        bedsPlaced++;
                    } else if (x === bed2X && y === bed2Y) {
                        write(area, x, y, BED_TYPE);
                        bedsPlaced++;
                    } else {
                        write(area, x, y, 0); // clear floor
                    }
                }
            }

            housesBuilt++;

            const Floors = window.UF && UF.Floors;
            const floorId = (culture.floor && culture.floor.kind) || (wallId.includes("stone") ? "floor_stone" : "floor_wood");
            if (Floors && typeof Floors.setFloor === "function") {
                for (let y = y0 + 1; y < y1; y++) {
                    for (let x = x0 + 1; x < x1; x++) {
                        if (x !== x0 + 3 || (x === intDoorX && y === intDoorY)) {
                            Floors.setFloor(area, x, y, floorId);
                        }
                    }
                }
            }
            if (Floors && typeof Floors.applyRoofedUpperDeck === "function") {
                Floors.applyRoofedUpperDeck(area, { x0, y0, x1, y1 }, wallId.includes("stone") ? "stone" : "wood");
            }

            const structRecord = {
                id: household ? household.id : `homestead_${x0}_${y0}`,
                x0, y0, x1, y1,
                area: { ...area },
                z: levelOf(area),
                door: { x: doorX, y: doorY },
                isShared: false
            };
            structuresList.push(structRecord);

            // Connect home's exterior door to colony trail/road network
            connectHomeWithRoad(site, f, { x: doorX, y: doorY });

            // Register two-room home on household (communal living area + master bedroom)
            let coupleMovedOut = false;
            const sharedStruct = structuresList.find(s => s.isShared && s.id === "shared_" + f.id);
            if (household) {
                household.home = {
                    x: x0, y: y0, w, h: hh,
                    isShared: false,
                    isSheltered: true,
                    walls: [],
                    door: { x: doorX, y: doorY },
                    doors: [{ x: doorX, y: doorY }, { x: intDoorX, y: intDoorY }],
                    beds: [
                        { x: bedX, y: bedY, unitId: household.members ? household.members[0] : null },
                        { x: bed2X, y: bed2Y, unitId: household.members && household.members.length > 1 ? household.members[1] : null }
                    ],
                    hearth: { x: hearthX, y: hearthY },
                    storage: { x: doorX, y: doorY },
                    rooms: [
                        { type: "communal", name: "Communal Living Area", x: x0, y: y0, w: 4, h: hh, hearth: { x: hearthX, y: hearthY } },
                        { type: "master", name: "Master Bedroom", x: x0 + 3, y: y0, w: 3, h: hh, bed: { x: bedX, y: bedY } }
                    ],
                    annexes: []
                };
                // Relocate household members to private home
                if (household.members) {
                    for (let mi = 0; mi < household.members.length; mi++) {
                        const mId = household.members[mi];
                        const u = W && W.unit(mId);
                        const bCoord = mi === 0 ? { x: bedX, y: bedY } : { x: bed2X, y: bed2Y };
                        if (u && u.data) {
                            u.data.home = { area: { ...area }, x: bCoord.x, y: bCoord.y, z: levelOf(area) };
                            u.data.homeFire = { area: { ...area }, x: hearthX, y: hearthY, z: levelOf(area) };
                            u.data.bed = { x: bCoord.x, y: bCoord.y };
                            u.x = bCoord.x; u.y = bCoord.y;
                            if (u.data.founder) {
                                u.data.movedOut = true;
                                coupleMovedOut = true;
                            }
                        }
                        if (sharedStruct && sharedStruct.beds) {
                            for (const b of sharedStruct.beds) {
                                if (b.unitId === mId) {
                                    b.unitId = null;
                                }
                            }
                        }
                    }
                }
            }

            const surname = (household && household.surname) || f.name;
            const moveOutText = coupleMovedOut ? `, moving out from the communal lodge to their own family home` : "";
            History.addEvent({
                year,
                type: "settle_built",
                text: `${f.name} completed a two-room homestead (communal living and bedroom) for ${surname}${moveOutText} in Year ${year}.`,
                factions: [f.id],
                site: site.id
            });

            return true;
        };

        // Build an additional bedroom for a child
        const buildChildRoomForHousehold = (site, f, household, year) => {
            if (!household || !household.home) return false;
            const home = household.home;
            const culture = (cat.cultures && cat.cultures[f.species]) || {};
            const wallId = culture.wall || "wall_wood";
            const doorId = culture.door || (wallId.includes("stone") ? "door_stone" : "door_wood");
            const WALL_TYPE = typeId(wallId) || typeId("wall_wood");
            const DOOR_TYPE = typeId(doorId) || typeId("door_wood");
            const area = siteArea(site);

            const rw = 3, rh = 3;
            // 1. Try adjoining the family's home on East, South, West, North (excluding household.id in separation check)
            const offsets = [
                { x0: home.x + home.w, y0: home.y, doorX: home.x + home.w, doorY: home.y + 1 },
                { x0: home.x, y0: home.y + home.h, doorX: home.x + 1, doorY: home.y + home.h },
                { x0: home.x - rw, y0: home.y, doorX: home.x - 1, doorY: home.y + 1 },
                { x0: home.x, y0: home.y - rh, doorX: home.x + 1, doorY: home.y - 1 }
            ];

            let chosenSpot = null;
            let isAdjoining = true;

            for (const spot of offsets) {
                if (!canPlaceStructure(spot.x0, spot.y0, rw, rh, household.id)) continue;
                let ok = true;
                for (let dy = 0; dy < rh && ok; dy++) {
                    for (let dx = 0; dx < rw && ok; dx++) {
                        const px = spot.x0 + dx, py = spot.y0 + dy;
                        if (!land(area, px, py)) { ok = false; break; }
                        if (builtPositions.has(`${px},${py}`)) { ok = false; break; }
                        const t = read(area, px, py);
                        if (t && t !== 0) {
                            const e = entry(t);
                            if (e && e.tags && (e.tags.includes("building") || e.tags.includes("fire"))) { ok = false; break; }
                        }
                    }
                }
                if (ok) {
                    chosenSpot = spot;
                    break;
                }
            }

            // 2. If adjoining would violate 1-square separation from other structures, build a detached bedroom cottage
            if (!chosenSpot) {
                const detachedZones = [[2, 6], [7, 12]];
                for (const [lo, hi] of detachedZones) {
                    for (let dy = -hi; dy <= hi - rh && !chosenSpot; dy++) {
                        for (let dx = -hi; dx <= hi - rw && !chosenSpot; dx++) {
                            const d = Math.max(Math.abs(dx), Math.abs(dy));
                            if (d < lo || d > hi) continue;
                            const cx0 = home.x + dx, cy0 = home.y + dy;
                            if (!canPlaceStructure(cx0, cy0, rw, rh)) continue;
                            let ok = true;
                            for (let y = 0; y < rh && ok; y++) {
                                for (let x = 0; x < rw && ok; x++) {
                                    const px = cx0 + x, py = cy0 + y;
                                    if (!land(area, px, py) || builtPositions.has(`${px},${py}`)) { ok = false; break; }
                                }
                            }
                            if (ok) {
                                chosenSpot = { x0: cx0, y0: cy0, doorX: cx0 + 1, doorY: cy0 + rh - 1 };
                                isAdjoining = false;
                                break;
                            }
                        }
                    }
                    if (chosenSpot) break;
                }
            }

            if (!chosenSpot) return false;

            const { x0, y0, doorX, doorY } = chosenSpot;
            const x1 = x0 + rw - 1, y1 = y0 + rh - 1;
            let bedX = x0 + 1, bedY = y0 + 1;

            for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                    builtPositions.add(`${x},${y}`);
                    const isPerimeter = x === x0 || x === x1 || y === y0 || y === y1;
                    if (x === doorX && y === doorY) {
                        write(area, x, y, DOOR_TYPE);
                    } else if (isPerimeter) {
                        write(area, x, y, WALL_TYPE);
                        wallsPlaced++;
                    } else {
                        bedX = x;
                        bedY = y;
                        write(area, x, y, BED_TYPE);
                        bedsPlaced++;
                    }
                }
            }

            const Floors = window.UF && UF.Floors;
            const floorId = (culture.floor && culture.floor.kind) || (wallId.includes("stone") ? "floor_stone" : "floor_wood");
            if (Floors && typeof Floors.setFloor === "function") {
                for (let y = y0 + 1; y < y1; y++) {
                    for (let x = x0 + 1; x < x1; x++) {
                        Floors.setFloor(area, x, y, floorId);
                    }
                }
            }
            if (Floors && typeof Floors.applyRoofedUpperDeck === "function") {
                Floors.applyRoofedUpperDeck(area, { x0, y0, x1, y1 }, wallId.includes("stone") ? "stone" : "wood");
            }

            // Register structure
            if (isAdjoining) {
                const parentStruct = structuresList.find(s => s.id === household.home.id || s.id === household.id);
                if (parentStruct) {
                    parentStruct.x0 = Math.min(parentStruct.x0, x0);
                    parentStruct.y0 = Math.min(parentStruct.y0, y0);
                    parentStruct.x1 = Math.max(parentStruct.x1, x1);
                    parentStruct.y1 = Math.max(parentStruct.y1, y1);
                    parentStruct.annexes = parentStruct.annexes || [];
                    parentStruct.annexes.push({ x0, y0, x1, y1, door: { x: doorX, y: doorY } });
                } else {
                    structuresList.push({
                        id: `${household.id}_child_${household.home.rooms ? household.home.rooms.length : 1}`,
                        x0, y0, x1, y1,
                        area: { ...area },
                        z: levelOf(area),
                        door: { x: doorX, y: doorY },
                        isShared: false
                    });
                }
            } else {
                structuresList.push({
                    id: `${household.id}_child_${household.home.rooms ? household.home.rooms.length : 1}`,
                    x0, y0, x1, y1,
                    area: { ...area },
                    z: levelOf(area),
                    door: { x: doorX, y: doorY },
                    isShared: false
                });
                connectHomeWithRoad(site, f, { x: doorX, y: doorY });
            }

            // Register child bedroom on household
            household.home.rooms = household.home.rooms || [];
            const newRoom = {
                type: "child",
                name: `Child Bedroom #${household.home.rooms.filter(r => r.type === "child").length + 1}`,
                x: x0, y: y0, w: rw, h: rh,
                walls: [],
                doors: [{ x: doorX, y: doorY }],
                sleeping: [{ x: bedX, y: bedY }],
                beds: [{ x: bedX, y: bedY, unitId: null }]
            };
            household.home.rooms.push(newRoom);
            household.home.annexes = household.home.annexes || [];
            household.home.annexes.push(newRoom);
            household.home.beds = household.home.beds || [];
            household.home.beds.push({ x: bedX, y: bedY, unitId: null });

            const unbeddedChild = (household.members || [])
                .map(mId => W && W.unit(mId))
                .find(u => u && u.data && Number.isFinite(u.data.age) && u.data.age < 15 && !u.data.bed);
            if (unbeddedChild) {
                unbeddedChild.data.bed = { x: bedX, y: bedY };
                newRoom.beds[0].unitId = unbeddedChild.id;
                household.home.beds[household.home.beds.length - 1].unitId = unbeddedChild.id;
            }

            roomsBuilt++;

            const surname = household.surname || f.name;
            History.addEvent({
                year,
                type: "room_built",
                text: `${f.name} built a child bedroom for ${surname} in Year ${year}.`,
                factions: [f.id],
                site: site.id
            });

            return true;
        };

        // Work pacing: 1 house completes every ~200-240 work seconds (~1 in-game year of cooperative labor)
        const WORK_SECONDS_PER_HOUSE = 200;
        const WORK_SECONDS_PER_SHARED = 120; // 8 founders cooperatively finish shared lodge on Day 1
        let workProgress = 0;

        // Iterate second-by-second
        for (let sec = 1; sec <= totalSeconds; sec++) {
            const year = 1 + Math.floor(sec / 240);
            const hour = Math.floor(((sec * 6) % 1440) / 60);

            // 1. Advance game clock and engine ticks
            if (window.$ufTime) {
                $ufTime.advanceMinute(6);
            }
            if (internal.advanceTicks) {
                internal.advanceTicks(60);
            }

            // 2. Colonist aging (1 real second per beat)
            progressAging(1);

            // 3. Gestation advancement
            progressPregnancies(1);
            for (const u of (W && W.units ? W.units() : [])) {
                if (u && u.data && !u.data.actions) initUnitPhysicalState(u);
            }

            // 4. Seasonal reproduction check (every 60s = 1 season = 6 hours)
            if (sec % 60 === 0) {
                stepFactionReproduction();
                // Seasonal conception check for married couples across settlements
                const allUnits = (internal.allFactionPeople && internal.allFactionPeople()) || (W && W.units()) || [];
                for (const u of allUnits) {
                    if (u.data && u.data.gender === "female" && !u.data.pregnancy && u.data.partnerId && !u.data.dead && u.data.age >= 15 && u.data.age < 50) {
                        const partner = W && W.unit(u.data.partnerId);
                        if (partner && !partner.data.dead && partner.data.age >= 15) {
                            // User directive: A pair needs to build a home before having children.
                            // For every child they have, they need to build a room. And so on.
                            const hh = H && H.of ? H.of(u) : null;
                            const canConceive = H && typeof H.canConceiveChild === "function" ? H.canConceiveChild(hh) : (u.data.home && u.data.homeFire);
                            if (!canConceive) continue;

                            const pop = (internal.factionPopulation && internal.factionPopulation(u.data.faction)) || 8;
                            const chance = (internal.conceptionChance && internal.conceptionChance(pop)) || 0.95;
                            const rng = mulberry32(hash32(st.seed, 0x9b17, u.id, sec));
                            if (rng() < chance * 0.35) {
                                const dur = (internal.gestationSeconds && internal.gestationSeconds(pop)) || 45;
                                u.data.pregnancy = {
                                    fatherId: partner.id,
                                    fatherName: partner.name,
                                    secondsLeft: dur,
                                    totalSeconds: dur,
                                    dayConceived: year
                                };
                            }
                        }
                    }
                }
            }

            // 5. Immigration check (every 480s = 2 in-game years)
            if (sec % 480 === 0) {
                stepImmigration();
                for (const u of (W && W.units ? W.units() : [])) {
                    if (u && u.data && !u.data.actions) initUnitPhysicalState(u);
                }
            }

            // 6. Bonfire sleeping vs domestic bed sleeping & natural healing
            // Night hours: 22:00 to 06:00
            if (hour >= 22 || hour < 6) {
                const people = (internal.allFactionPeople && internal.allFactionPeople()) || (W && W.units()) || [];
                for (const u of people) {
                    if (!u || !u.data || u.data.dead) continue;
                    const hasHome = u.data.home && u.data.homeFire;
                    u.data.needs = u.data.needs || { hunger: 20, thirst: 20, rest: 0 };
                    u.data.needs.rest = 0;
                    u.data.actions = u.data.actions || {};
                    u.data.actions.sleep = (u.data.actions.sleep || 0) + 1;

                    // Rest in bed or by hearth restores +1 HP if wounded
                    if (hour === 23 && typeof u.data.hp === "number" && u.data.hp < (u.data.maxHp || 20)) {
                        u.data.hp = Math.min(u.data.maxHp || 20, u.data.hp + 1);
                        u.data.actions.heal = (u.data.actions.heal || 0) + 1;
                    }

                    if (hasHome) {
                        // Sleeping in private bed by indoor domestic hearth
                        if (sec % 60 === 0 && u.data.thoughts) {
                            u.data.thoughts.unshift({ text: "Slept in my own bed.", score: 12, ticks: sec });
                            if (u.data.thoughts.length > 8) u.data.thoughts.pop();
                        }
                    } else {
                        // Sleeping warmly by the central campfire
                        if (sec % 60 === 0 && u.data.thoughts) {
                            u.data.thoughts.unshift({ text: "Slept warmly by the fire.", score: 10, ticks: sec });
                            if (u.data.thoughts.length > 8) u.data.thoughts.pop();
                        }
                    }
                }
            }

            // 7. Physical Actions & Labor during daytime hours (06:00 to 22:00)
            if (hour >= 6 && hour < 22) {
                const livingPeople = (internal.allFactionPeople && internal.allFactionPeople()) || (W && W.units()) || [];
                const adults = livingPeople.filter(u => u && u.data && !u.data.dead && Number.isFinite(u.data.age) && u.data.age >= 15);

                for (const u of adults) {
                    const uSeed = hash32(st.seed, u.id, sec);
                    const rng = mulberry32(uSeed);
                    const actionRoll = rng();

                    // Needs increment with physical labor
                    u.data.needs = u.data.needs || { hunger: 20, thirst: 20, rest: 0 };
                    u.data.needs.hunger = Math.min(100, (u.data.needs.hunger || 20) + 0.15);
                    u.data.needs.thirst = Math.min(100, (u.data.needs.thirst || 20) + 0.25);

                    // Meals at 12:00 and 18:00
                    if (hour === 12 || hour === 18) {
                        u.data.needs.hunger = Math.max(0, u.data.needs.hunger - 35);
                        u.data.needs.thirst = Math.max(0, u.data.needs.thirst - 45);
                        u.data.actions.eat = (u.data.actions.eat || 0) + 1;
                    }

                    // Explicit actions and skill progression
                    if (actionRoll < 0.28) {
                        u.data.actions.woodcut = (u.data.actions.woodcut || 0) + 1;
                        gainSkillXp(u, "woodcutting", 15);
                        totalWoodcut++;
                    } else if (actionRoll < 0.50) {
                        u.data.actions.quarry = (u.data.actions.quarry || 0) + 1;
                        gainSkillXp(u, "mining", 15);
                        totalQuarry++;
                    } else if (actionRoll < 0.70) {
                        u.data.actions.haul = (u.data.actions.haul || 0) + 1;
                        gainSkillXp(u, "hauling", 12);
                        totalHaul++;
                    } else if (actionRoll < 0.88) {
                        u.data.actions.build = (u.data.actions.build || 0) + 1;
                        gainSkillXp(u, "building", 20);
                        totalBuild++;
                    } else {
                        u.data.actions.cook = (u.data.actions.cook || 0) + 1;
                        gainSkillXp(u, "cooking", 15);
                        totalCook++;
                    }
                }

                // Periodic wildlife & wilderness combat encounter (every 120 seconds = twice a year)
                if (sec % 120 === 0 && adults.length > 0) {
                    const cIdx = Math.floor(mulberry32(hash32(st.seed, 0x5a1b, sec))() * adults.length);
                    const defender = adults[cIdx];
                    if (defender && !defender.data.dead) {
                        totalCombatRounds++;
                        const cRng = mulberry32(hash32(st.seed, 0x117a, defender.id, sec));
                        // Threat attacks defender: OSRS accuracy roll 0..A vs defence roll 0..D
                        const beastAtk = 8;
                        const beastAtkRollMax = (beastAtk + 8) * 64;
                        const beastAtkRoll = Math.floor(cRng() * (beastAtkRollMax + 1));

                        const defSkill = (defender.data.skills && defender.data.skills.defence) || 1;
                        const defBonus = (defender.data.faction && defender.data.faction.includes("dwarf")) ? 10 : 0;
                        const defRollMax = (defSkill + 8) * (64 + defBonus);
                        const defRoll = Math.floor(cRng() * (defRollMax + 1));

                        if (beastAtkRoll > defRoll) {
                            const beastMaxHit = Math.max(1, Math.floor(0.5 + (beastAtk + 8) * 64 / 640)); // 1-3 damage
                            const dmg = Math.floor(cRng() * (beastMaxHit + 1)) || 1;
                            defender.data.hp = Math.max(0, (defender.data.hp || 20) - dmg);
                            defender.data.wounds = defender.data.wounds || [];
                            defender.data.wounds.push({ type: "bite", damage: dmg, sec, year });
                            gainSkillXp(defender, "defence", 16);
                            gainSkillXp(defender, "hitpoints", Math.round(dmg * 5.33));

                            if (defender.data.hp <= 0) {
                                defender.data.dead = true;
                                casualtiesCount++;
                                History.addEvent({
                                    year,
                                    type: "casualty",
                                    text: `${defender.name} was slain defending the settlement from a wild beast in Year ${year}.`,
                                    factions: [defender.data.faction],
                                    site: st.history.sites[0] ? st.history.sites[0].id : null
                                });
                            }
                        } else {
                            gainSkillXp(defender, "defence", 8);
                        }

                        // Defender counter-attacks if still alive
                        if (!defender.data.dead) {
                            const atkSkill = (defender.data.skills && defender.data.skills.attack) || 1;
                            const strSkill = (defender.data.skills && defender.data.skills.strength) || 1;
                            const defAtkRollMax = (atkSkill + 8) * 64;
                            const beastDefRollMax = (8 + 8) * 64;
                            const defAtkRoll = Math.floor(cRng() * (defAtkRollMax + 1));
                            const beastDefRoll = Math.floor(cRng() * (beastDefRollMax + 1));

                            if (defAtkRoll > beastDefRoll) {
                                defender.data.actions.fight = (defender.data.actions.fight || 0) + 1;
                                const maxHit = Math.max(1, Math.floor(0.5 + (strSkill + 8) * 64 / 640));
                                const dmg = Math.floor(cRng() * (maxHit + 1)) || 1;
                                gainSkillXp(defender, "attack", Math.round(dmg * 16));
                                gainSkillXp(defender, "strength", Math.round(dmg * 16));
                                gainSkillXp(defender, "hitpoints", Math.round(dmg * 5.33));
                            }
                        }
                    }
                }

                workProgress++;
                const allHaveShared = st.factions.list.every(f => structuresList.some(s => s.id === "shared_" + f.id));
                const requiredWork = allHaveShared ? WORK_BEATS_PER_HOUSE : WORK_BEATS_PER_SHARED;
                if (workProgress >= requiredWork) {
                    workProgress = 0;
                    for (const f of st.factions.list) {
                        const site = st.history.sites.find(s => s.faction === f.id && !s.ruined) || st.history.sites[0];
                        if (!site) continue;

                        // Priority 1: Task #1 of the faction is to build a shared structure for the 8 starting people around the fire
                        const hasShared = structuresList.some(s => s.id === "shared_" + f.id);
                        if (!hasShared) {
                            buildSharedCommunalStructure(site, f, year);
                            continue;
                        }

                        const allHouseholds = (H && H.all ? H.all() : []).filter(h => h.faction === f.id && !h.mergedInto);
                        // Priority 2: Unhoused adult couple needing their own private home (communal living + bedroom)
                        const unhousedHousehold = allHouseholds.find(h => (!h.home || h.home.isShared) && h.members && h.members.length >= 2);
                        if (unhousedHousehold) {
                            buildHomesteadAroundFire(site, f, unhousedHousehold, year);
                        } else {
                            // Priority 3: Housed couple who need an additional room for their next child
                            // "A pair needs to build a home before having children. For every child they have, they need to build a room. And so on."
                            const needRoomHousehold = allHouseholds.find(h => {
                                if (!h.home || h.home.isShared) return false;
                                const childRoomsCount = (H && H.childRooms) ? H.childRooms(h) : ((h.home.rooms || []).filter(r => r.type === "child").length);
                                const people = (H && H.members) ? H.members(h) : [];
                                const livingChildren = people.filter(m => m && m.data && Number.isFinite(m.data.age) && m.data.age < 15 && !m.data.dead).length;
                                return childRoomsCount <= livingChildren && livingChildren < 4;
                            });
                            if (needRoomHousehold && buildChildRoomForHousehold(site, f, needRoomHousehold, year)) {
                                // successfully expanded room for next child
                            } else {
                                const colony = st.colony;
                                const focal = activeFocalHousehold(colony);
                                if (focal && (!focal.home || focal.home.isShared)) {
                                    buildHomesteadAroundFire(site, f, focal, year);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Ensure all units have physical state initialized
        for (const u of (W && W.units ? W.units() : [])) {
            initUnitPhysicalState(u);
        }

        // Distribute all housed colonists into their respective homes and bedrooms rather than all huddled at the campfire
        const peopleList = (internal.allFactionPeople && internal.allFactionPeople()) || (W && W.units()) || [];
        const occupied = new Set();
        for (const u of peopleList) {
            if (!u || !u.data || u.data.dead) continue;
            const hh = H && H.of ? H.of(u) : null;
            let targetX = u.x, targetY = u.y;

            if (hh && hh.home) {
                const bed = (hh.home.beds || []).find(b => b.unitId === u.id && !occupied.has(`${b.x},${b.y}`)) ||
                            (hh.home.beds || []).find(b => !occupied.has(`${b.x},${b.y}`)) ||
                            (u.data.bed && !occupied.has(`${u.data.bed.x},${u.data.bed.y}`) ? u.data.bed : null);
                if (bed) {
                    targetX = bed.x;
                    targetY = bed.y;
                    u.data.bed = { x: bed.x, y: bed.y };
                    u.data.home = { area: { ...siteArea(st.history.sites[0]) }, x: bed.x, y: bed.y, z: levelOf(u) };
                } else if (hh.home.rooms && hh.home.rooms.length > 0) {
                    const isAdult = Number.isFinite(u.data.age) && u.data.age >= 15;
                    const room = (isAdult ? hh.home.rooms.find(r => r.type === "master") : hh.home.rooms.find(r => r.type === "child")) || hh.home.rooms[0];
                    if (room && room.bed && !occupied.has(`${room.bed.x},${room.bed.y}`)) {
                        targetX = room.bed.x;
                        targetY = room.bed.y;
                    } else if (room) {
                        targetX = room.x + 1;
                        targetY = room.y + 1;
                    }
                }
            }

            if (occupied.has(`${targetX},${targetY}`)) {
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const nx = targetX + dx, ny = targetY + dy;
                        if (!occupied.has(`${nx},${ny}`) && land(siteArea(st.history.sites[0]), nx, ny)) {
                            targetX = nx;
                            targetY = ny;
                            break;
                        }
                    }
                    if (!occupied.has(`${targetX},${targetY}`)) break;
                }
            }

            occupied.add(`${targetX},${targetY}`);
            u.x = targetX;
            u.y = targetY;

            if (live && W && W.eventOf) {
                const ev = W.eventOf(u.id);
                if (ev && typeof ev.locate === "function") {
                    ev.locate(u.x, u.y);
                }
            }
        }

        // Finalize world clock and history state
        if (window.$ufTime) {
            $ufTime.year = targetYears;
        }
        st.history.years = targetYears;
        st.history.startYear = targetYears;

        const summary = {
            years: targetYears,
            from: 1,
            to: targetYears,
            events: st.history.events.length,
            sites: st.history.sites.length,
            sitesGrown: st.history.sites.length,
            houses: housesBuilt,
            rooms: housesBuilt + roomsBuilt,
            childRooms: roomsBuilt,
            beds: bedsPlaced,
            hearths: hearthsPlaced,
            roads: roadsPlaced,
            sharedStructures: structuresList.filter(s => s.isShared).length,
            walls: wallsPlaced,
            stockpiles: housesBuilt,
            workbenches: Math.max(1, Math.floor(housesBuilt / 4)),
            ruined: 0,
            depleted: { trees: housesBuilt * 2 + Math.floor(totalWoodcut / 20), bushes: housesBuilt, stones: housesBuilt + Math.floor(totalQuarry / 20) },
            items: housesBuilt * 4,
            itemsPlaced: true,
            secondBySecond: true,
            actions: {
                woodcut: totalWoodcut,
                quarry: totalQuarry,
                haul: totalHaul,
                build: totalBuild,
                cook: totalCook,
                total: totalWoodcut + totalQuarry + totalHaul + totalBuild + totalCook
            },
            combat: {
                rounds: totalCombatRounds,
                casualties: casualtiesCount
            },
            ms: now() - started
        };
        st.history.settled = summary;
        st.history.roads = Array.from(roadPositions);
        st.history.structures = structuresList;
        History.lastSettle = summary;

        console.log(`UF_History: Second-by-second history iterated from Year 1 to Year ${targetYears} (${totalSeconds} seconds in ${(now() - started).toFixed(0)} ms): `
            + `${housesBuilt} homesteads built around campfire, ${hearthsPlaced} indoor hearths, ${bedsPlaced} beds, ${st.history.events.length} chronicle events.`);

        return summary;
    };

    //-------------------------------------------------------------------------
    // People at the living sites (world units of kind "person"), with ages, stats, ranks

    /**
     * Spawn the people of a new world (live world only; returns the units). Year 1 (history version 4): the founders
     * (spawnFounders). The older generator: people at every living site (spawnSettled).
     */
    History.spawnPeople = function(state) {
        const W = window.UF && UF.World;
        if (!W || !state || !state.history || W.state !== state) return [];
        if (state.history.demographics) return History.materialize(state);
        return state.history.founders ? spawnFounders(state) : spawnSettled(state);
    };

    // A people sheet entry is "Name" or { name, index } (the stock-art catalog).
    const imageSpec = img => (typeof img === "string" ? { characterName: img, characterIndex: 0 } : img && typeof img === "object" ? { characterName: String(img.name || img.characterName || ""), characterIndex: (img.index !== undefined ? img.index : img.characterIndex) | 0 } : { characterName: "", characterIndex: 0 });

    // The catalog id of the camp's center: the 64-slot wooden chest stockpile.
    const campFireId = () => "chest_wood";

    function seedStarterChest(cont) {
        const I = window.UF && UF.Items;
        if (!I || !cont) return;
        if (cont.items && cont.items.length > 0) return; // Idempotent: do not double-seed
        // Actual shipping starter inventory: 16 cooked meat (1 day of food for 8 founders) + 1 shovel, 1 pickaxe, 1 axe
        const starterKit = [
            { type: "meat_cooked", count: 16 },  // 1 day supply for 8 founders (shipping standard)
            { type: "shovel", count: 1 },        // 1 shovel
            { type: "pickaxe", count: 1 },       // 1 pickaxe
            { type: "axe", count: 1 }            // 1 axe
        ];
        for (const spec of starterKit) {
            let itType = spec.type;
            if (!I.type(itType)) {
                if (itType === "pickaxe") itType = "stone_pick";
                else if (itType === "axe") itType = "stone_axe";
                else if (itType === "shovel") itType = "stone_pick";
            }
            if (!I.type(itType)) continue;
            const t = I.type(itType);
            const maxStack = Math.max(1, Number(t.stack) || 20);
            let left = spec.count;
            while (left > 0) {
                const n = Math.min(left, maxStack);
                const item = I.create(itType, n, { container: cont.id });
                if (item && !cont.items.includes(item.id)) {
                    cont.items.push(item.id);
                }
                left -= n;
            }
        }
    }

    /**
     * The central stockpile chest of every year-1 camp: the nine cells of the camp's block are
     * cleared of any object, then the wooden chest goes on the centre cell, written like a built object.
     * All nine starting tiles are designated as physical stockpile squares.
     * Creates a 64-slot physical container in UF.Containers and seeds it with the starter kit.
     */
    function placeCamps(state) {
        const W = UF.World, h = state.history, cat = catalog() || {};
        const fireId = campFireId();
        const typeId = Math.max(0, (cat.objects || []).findIndex(o => o.id === fireId)) + 1;
        const O = window.UF.Objects && typeof UF.Objects.setIn === "function" ? UF.Objects : null;
        const read = (area, x, y) => (O ? O.typeIdIn(area, x, y) : W.getObject(area.x, area.y, x, y, levelOf(area)));
        const write = (area, x, y, v) => (O ? O.setIn(area, x, y, v) : W.setObject(area.x, area.y, x, y, v ? typeId : 0, levelOf(area)));
        let placed = 0;
        for (const f of state.factions.list) {
            const rec = h.founders[f.id];
            if (!rec) continue;
            rec.camps = [];
            for (const site of founderSites(h, rec)) {
            const area = siteArea(site);
            let cleared = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if ((dx || dy) && read(area, site.x + dx, site.y + dy)) { write(area, site.x + dx, site.y + dy, null); cleared++; }
            }
            const ok = !!write(area, site.x, site.y, fireId);
            if (ok) placed++;
            const z = levelOf(site);
            rec.camps.push({ site: site.id, area: { ...site.area }, x: site.x, y: site.y, z, fire: ok ? fireId : null, cleared });
            site.focalFire = { area: { ...site.area }, x: site.x, y: site.y, z };
            f.focalFire = { area: { ...site.area }, x: site.x, y: site.y, z };
            rec.focalFire = { area: { ...site.area }, x: site.x, y: site.y, z };
            site.focalChest = { area: { ...site.area }, x: site.x, y: site.y, z };
            f.focalChest = { area: { ...site.area }, x: site.x, y: site.y, z };
            rec.focalChest = { area: { ...site.area }, x: site.x, y: site.y, z };

            // Create container in UF.Containers and seed starter inventory
            const Cont = window.UF && UF.Containers;
            if (Cont && typeof Cont.create === "function") {
                const cont = Cont.create("chest_wood", { area, x: site.x, y: site.y, z }, {
                    maxSlots: 32,
                    maxWeight: 500.0,
                    owner: { kind: "faction", id: f.id },
                    policy: { name: "Central Stockpile Chest" }
                });
                if (cont) {
                    seedStarterChest(cont);
                }
            }

            // Designate all 9 starting tiles as physical stockpile squares
            const startCells = [];
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    startCells.push({ x: site.x + dx, y: site.y + dy });
                }
            }
            site.stockpiles = startCells.map(c => ({ x: c.x, y: c.y, stores: ["all", "food", "wood", "stone"] }));
            rec.stockpiles = site.stockpiles;
            const Stockpiles = window.UF && UF.Stockpiles;
            if (Stockpiles && typeof Stockpiles.create === "function") {
                Stockpiles.create({
                    name: `${site.name || "Camp"} Stockpile`,
                    area,
                    z,
                    factionId: f.id,
                    cells: startCells,
                    filters: { groups: ["all"] },
                    priority: "normal"
                });
            }
            }
            rec.camp = rec.camps[0];
        }
        return placed;
    }

    /**
     * The founders (VISION V4, 2026-09-19 afternoon): for every faction with a camp, its plan's men and women as person
     * units on the eight cells around the campfire, as the user drew it (PPP / PFP / PPP), men and women alternating round
     * the ring (the first man's cell seeded), each facing the fire (the nearest of the four facings; 8-way facing comes
     * later). Plain folk in the plainest clothes: humans wear the clothing tier-0 sheet of their gender (catalog
     * start.pair[].tiers[0], the sheet UF_Colonists starts its colonists on); other species their people[species] sheets.
     * Stats rolled per unit, the leader at rank 1 and the others under it. Records the unit ids, cells and facings in
     * history.founders[factionId].units and the leader's unit in history.rulers. Founders beyond eight (another catalog
     * count) take the nearest free land cells within founders.reach.
     *
     * UF_Colonists rolls its own gender for the colonists (UF.Colonists.genderFor(seed, unitId)). So that the player's
     * founders keep their genders (and the ring keeps alternating), their units take the ids whose rolled gender matches
     * their own, and the other factions' founders fill the ids in between (unit ids are only handed out in spawn order).
     */
    function spawnFounders(state) {
        const W = UF.World;
        const h = state.history;
        const cat = catalog() || {};
        const people = cat.people || {};
        const fc = foundersConfig();
        const reach = Math.max(1, fc.reach | 0);
        const size = state.size;
        const out = [];
        const taken = new Set();
        const land = (area, x, y) => {
            if (x < 0 || y < 0 || x >= size || y >= size) return false;
            const tile = W.getTile(area.x, area.y, x, y, 0, levelOf(area));
            return !Tilemap.isTileA1(tile) && W.getTile(area.x, area.y, x, y, 5, levelOf(area)) !== 250; // any A1 autotile is water; region 250 is a peak
        };
        placeCamps(state);
        const plainSheet = (species, gender, varIndex = 1) => {
            if (species !== "human") return null;
            const v = Math.max(1, Math.min(6, varIndex | 0 || 1));
            const prefix = gender === "female" ? "$UF_Human_Female" : "$UF_Human_Male";
            return imageSpec(`${prefix}_${v}_Walk`);
        };
        // Cells for each faction first (before any unit exists, so founders never take each other's cells).
        const queues = [];
        const playerId = state.factions.playerId;
        for (const f of state.factions.list) {
            const rec = h.founders[f.id];
            if (!rec) continue;
            for (const site of founderSites(h, rec)) {
            const area = siteArea(site);
            const plan = rec.plan.filter(p => p.site === undefined ? site.id === rec.site : p.site === site.id);
            const fi = state.factions.list.indexOf(f);
            // The ring: alternate men and women clockwise from a seeded cell, as long as both are left.
            const men = plan.filter(p => p.gender === "male"), women = plan.filter(p => p.gender !== "male");
            const rot = Math.floor(mulberry32(hash32(state.seed, SALT_RING, fi))() * RING.length);
            const slots = [];
            let mi = 0, wi = 0;
            for (let k = 0; k < RING.length && (mi < men.length || wi < women.length); k++) {
                const wantMan = k % 2 === 0 ? mi < men.length : !(wi < women.length);
                const p = wantMan ? men[mi++] : women[wi++];
                const [dx, dy] = RING[(rot + k) % RING.length];
                slots.push({ p, x: site.x + dx, y: site.y + dy, dir: faceFire(dx, dy), ring: (rot + k) % RING.length });
            }
            for (const s of slots) taken.add(`${site.area.x},${site.area.y},${levelOf(site)},${s.x},${s.y}`);
            // Anyone left over (more than eight founders in the catalog): the nearest free land cells within reach.
            const rest = men.slice(mi).concat(women.slice(wi));
            if (rest.length) {
                const rng = mulberry32(hash32(state.seed, SALT_PEOPLE, site.id));
                const cands = [];
                for (let dy = -reach; dy <= reach; dy++) {
                    for (let dx = -reach; dx <= reach; dx++) {
                        const x = site.x + dx, y = site.y + dy, key = `${site.area.x},${site.area.y},${levelOf(site)},${x},${y}`;
                        if (Math.max(Math.abs(dx), Math.abs(dy)) <= 1 || taken.has(key) || !land(area, x, y) || !W.cellFree(site.area.x, site.area.y, x, y, 0, levelOf(site))) continue;
                        cands.push({ x, y, d: dx * dx + dy * dy, r: rng() });
                    }
                }
                cands.sort((a, b) => a.d - b.d || a.r - b.r);
                rest.forEach((p, i) => {
                    const c = cands[i] || { x: site.x, y: site.y + 2 };
                    taken.add(`${site.area.x},${site.area.y},${levelOf(site)},${c.x},${c.y}`);
                    slots.push({ p, x: c.x, y: c.y, dir: 2, ring: -1 });
                });
            }
            const sp = people[f.species] || {};
            const images = Array.isArray(sp.images) && sp.images.length ? sp.images : [""];
            slots.forEach((s, idx) => {
                const i = rec.plan.indexOf(s.p);
                const varIndex = 1 + (idx % 6);
                const plain = plainSheet(f.species, s.p.gender, varIndex);
                queues.push({ f, site, rec, p: s.p, cell: { x: s.x, y: s.y }, dir: s.dir, ring: s.ring, within: true, image: plain || imageSpec(images[i % images.length]), tint: plain ? null : sp.tint, player: f.id === playerId, variation: varIndex });
            });
            }
        }
        // Spawn order: the player's founders on the ids UF_Colonists will read their own gender from, the others between.
        const colonistGender = window.UF.Colonists && typeof UF.Colonists.genderFor === "function" ? id => UF.Colonists.genderFor(state.seed, id) : null;
        const mine = queues.filter(q => q.player), rest = queues.filter(q => !q.player);
        const orderOut = [];
        if (!colonistGender) orderOut.push(...mine, ...rest);
        else {
            let next = state.nextUnitId;
            while (mine.length || rest.length) {
                let q = null;
                if (mine.length) {
                    const g = colonistGender(next);
                    const k = mine.findIndex(m => m.p.gender === g);
                    if (k >= 0) q = mine.splice(k, 1)[0];
                    else if (rest.length) q = rest.shift();
                    else q = mine.shift(); // nothing left to fill with (never seen): UF_Colonists' roll decides this one
                } else q = rest.shift();
                orderOut.push(q);
                next++;
            }
        }
        const leaders = {};
        for (const q of orderOut) {
            const { f, site, rec, p } = q;
            const F = window.UF && UF.Factions;
            const playerId = F && typeof F.playerId === "function" ? F.playerId() : "player";
            const data = {
                kind: f.id === playerId ? "colonist" : "person", faction: f.id, species: f.species, ai: "settlement", home: { area: { ...site.area }, x: site.x, y: site.y, z: levelOf(site) }, wander: (site.radius || 4) + 2, site: site.id,
                founder: true, born: 1 - p.age, age: p.age, stage: stageOf(p.age), gender: p.gender, rank: p.leader ? 1 : 0, superior: null,
                variation: q.variation,
                familyId: p.familyId || null, lineageId: p.lineageId || null, surname: p.surname || null,
                generation: 1, parents: [], motherId: null, fatherId: null, genetics: null,
                callings: p.callings || null, calling: p.calling || null,
                willingToPartner: true, familyDesire: true
            };
            if (p.leader && p.title) data.title = p.title;
            if (q.tint) data.tint = q.tint;
            const u = W.addUnit({ name: p.name, image: q.image, area: { x: site.area.x, y: site.area.y }, z: levelOf(site), x: q.cell.x, y: q.cell.y, dir: q.dir || 2, data, snapToFree: reach });
            if (!u.data.callings || u.data.callings.length < 3) {
                const Callings = getCallings();
                if (Callings && Callings.assignCallings) {
                    const uRng = mulberry32(hash32(state.seed, SALT_CALLINGS, u.id));
                    Callings.assignCallings(u, 8, uRng);
                }
            }
            u.data.stats = rollStats(state.seed, u.id, f.species, u.data.stage);
            const Dnd = window.UF && UF.Dnd5e;
            if (Dnd && typeof Dnd.assignClass === "function") {
                u.data.dnd = Dnd.assignClass(u.data.stats, state.seed, u.id);
                u.data.dndClass = u.data.dnd.id;
                u.data.className = u.data.dnd.name;
                u.data.hitDie = u.data.dnd.hitDie;
                u.data.hpMax = u.data.dnd.hpMax;
                u.data.hp = u.data.dnd.hp;
                u.data.ac = u.data.dnd.ac;
                u.data.savingThrows = u.data.dnd.savingThrows;
                if (u.data.dnd && u.data.dnd.proficiencies && Array.isArray(u.data.dnd.proficiencies)) {
                    u.data.proficiencies = Array.from(new Set([...(u.data.proficiencies || []), ...u.data.dnd.proficiencies]));
                }
            }
            const Items = window.UF && UF.Items;
            if (Items && typeof Items.giveFactionStartingKit === "function") {
                Items.giveFactionStartingKit(u);
            }
            rec.units.push({ id: u.id, site: site.id, z: levelOf(site), x: u.x, y: u.y, dir: u.dir, ring: q.ring, gender: p.gender, within: Math.max(Math.abs(u.x - site.x), Math.abs(u.y - site.y)) <= reach });
            if (p.leader) {
                leaders[f.id] = u.id;
                const r = h.rulers[f.id] && h.rulers[f.id][0];
                if (r) r.unitId = u.id;
            }
            out.push(u);
        }
        for (const u of out) if (u.data.rank === 0) u.data.superior = leaders[u.data.faction] || null;
        History.pairFounders(state, out);
        const Callings = getCallings();
        if (Callings && typeof Callings.assignFounderQuotas === "function" && state.factions && state.factions.list) {
            for (const f of state.factions.list) {
                const facFounders = out.filter(u => u.data && u.data.faction === f.id && u.data.founder);
                if (facFounders.length >= 2) {
                    const fRng = mulberry32(hash32(state.seed, SALT_CALLINGS, f.id));
                    Callings.assignFounderQuotas(facFounders, fRng);
                }
            }
        }
        return out;
    }

    const SALT_PAIRBOND = 0x5a17;
    History.pairFounders = function(state, liveUnits) {
        const W = window.UF && UF.World;
        const st = state || (W && W.state);
        if (!st || !st.history || !st.factions || !st.factions.list) return [];
        const units = Array.isArray(liveUnits) ? liveUnits : (W && W.units ? W.units() : []);
        const founders = units.filter(u => u && u.data && u.data.founder);
        const pairs = [];
        for (const f of st.factions.list) {
            const rec = st.history.founders && st.history.founders[f.id];
            const facFamilies = (rec && rec.families) || f.families || [];
            const facUnits = founders.filter(u => u.data.faction === f.id);
            const sites = [...new Set(facUnits.map(u => u.data.site))];
            let famCursor = 0;
            for (const siteId of sites) {
                const siteUnits = facUnits.filter(u => u.data.site === siteId);
                const males = siteUnits.filter(u => u.data.gender === "male");
                const females = siteUnits.filter(u => u.data.gender === "female");
                const pairRng = mulberry32(hash32(st.seed, SALT_PAIRBOND, f.id, siteId));
                for (let i = males.length - 1; i > 0; i--) {
                    const j = Math.floor(pairRng() * (i + 1));
                    [males[i], males[j]] = [males[j], males[i]];
                }
                for (let i = females.length - 1; i > 0; i--) {
                    const j = Math.floor(pairRng() * (i + 1));
                    [females[i], females[j]] = [females[j], females[i]];
                }
                const count = Math.min(males.length, females.length);
                for (let i = 0; i < count; i++) {
                    const m = males[i];
                    const w = females[i];
                    const fam = facFamilies[famCursor++] || {
                        id: `${f.id}_fam_${pairs.length + 1}`,
                        lineageId: `${f.id}_lin_${pairs.length + 1}`,
                        surname: m.data.surname || w.data.surname || "Founder"
                    };
                    m.data.partnerId = w.id;
                    m.data.partner = w.id;
                    m.data.partnerName = w.name;
                    w.data.partnerId = m.id;
                    w.data.partner = m.id;
                    w.data.partnerName = m.name;
                    m.data.familyId = fam.id;
                    w.data.familyId = fam.id;
                    m.data.lineageId = fam.lineageId;
                    w.data.lineageId = fam.lineageId;
                    m.data.surname = fam.surname;
                    w.data.surname = fam.surname;
                    m.data.generation = 1;
                    w.data.generation = 1;
                    m.data.willingToPartner = true;
                    w.data.willingToPartner = true;
                    m.data.familyDesire = true;
                    w.data.familyDesire = true;
                    fam.members = [m.id, w.id];
                    fam.pairbonded = true;
                    pairs.push({ faction: f.id, siteId, familyId: fam.id, lineageId: fam.lineageId, surname: fam.surname, male: m, female: w });
                }
            }
        }
        if (window.UF && UF.Events && UF.Events.emit) {
            UF.Events.emit("factions:pairbonded", pairs);
        }
        return pairs;
    };

    /**
     * The older generator's people: at every living faction site of the state, a count within sites.peoplePerSite
     * following the settled population (pop / 4; the home site at least HOME_MIN_PEOPLE), ages drawn from the site's
     * settled age counts, rolled stats, one ruler per faction (the last ruler of the history, at the faction's home
     * site), a leader at every other site, everyone else rank 0 under the site's leader. Returns the units.
     */
    function spawnSettled(state) {
        const W = window.UF && UF.World;
        const people = (catalog() && catalog().people) || {};
        const h = state.history;
        const rand = mulberry32(hash32(state.seed, SALT_PEOPLE));
        const range = ([lo, hi]) => lo + Math.floor(rand() * (hi - lo + 1));
        const used = new Set();
        for (const list of Object.values(h.rulers || {})) for (const r of list) used.add(r.name);
        const newName = makeNamer(rand, used);
        const factionOf = id => state.factions.list.find(f => f.id === id) || null;
        const out = [];
        const rulerUnit = {}, leaderUnit = {};
        let imageIndex = 0;
        for (const site of h.sites) {
            if (site.ruined || site.kind === "lair" || !site.faction) continue;
            const f = factionOf(site.faction);
            const sp = (f && people[f.species]) || null;
            const images = sp && Array.isArray(sp.images) && sp.images.length ? sp.images : null;
            if (!f || !images) continue;
            const kind = kindConfig(site.kind);
            const radius = kind.radius || 3;
            const taken = new Set(piecesFor(state, site).map(p => `${p.dx},${p.dy}`));
            const free = [];
            for (let dy = -(radius - 1); dy <= radius - 1; dy++) for (let dx = -(radius - 1); dx <= radius - 1; dx++) if (!taken.has(`${dx},${dy}`)) free.push({ dx, dy });
            const settled = site.settled && Array.isArray(site.settled.ages) ? site.settled : null;
            const [lo, hi] = perSiteRange();
            const playerId = (state.factions && state.factions.playerId) || "player";
            const isPlayer = f.id === playerId;
            let n = settled ? (isPlayer ? settled.pop : clamp(Math.round(settled.pop / 4), lo, hi)) : range([lo, hi]);
            if (site.protected || isPlayer) n = Math.max(n, HOME_MIN_PEOPLE);
            let searchR = radius - 1;
            while (free.length < n && searchR < 32) {
                searchR += 2;
                for (let dy = -searchR; dy <= searchR; dy++) {
                    for (let dx = -searchR; dx <= searchR; dx++) {
                        if (Math.max(Math.abs(dx), Math.abs(dy)) < searchR - 1) continue;
                        const key = `${dx},${dy}`;
                        if (!taken.has(key)) {
                            const x = site.x + dx, y = site.y + dy;
                            if (x >= 0 && y >= 0 && x < state.size && y < state.size && W.cellFree(site.area.x, site.area.y, x, y, 0, levelOf(site))) {
                                free.push({ dx, dy });
                            }
                        }
                    }
                }
            }
            if (free.length < n) {
                for (let i = free.length; i < n; i++) {
                    const angle = (i * 2 * Math.PI) / Math.max(1, n);
                    const dist = radius + 2 + Math.floor(i / 8);
                    free.push({ dx: Math.round(Math.cos(angle) * dist), dy: Math.round(Math.sin(angle) * dist) });
                }
            }
            // Ages come from the settled population's counts by age (drawn without replacement), else from the pyramid.
            const pool = settled ? settled.ages.slice() : null;
            const drawAge = adultOnly => {
                if (pool) {
                    const from = adultOnly ? 18 : 0;
                    let total = 0;
                    for (let a = from; a < MAX_AGE; a++) total += pool[a];
                    if (total > 0) {
                        let r = Math.floor(rand() * total);
                        for (let a = from; a < MAX_AGE; a++) { if (r < pool[a]) { pool[a]--; return a; } r -= pool[a]; }
                    }
                }
                if (adultOnly) return 20 + Math.floor(rand() * 40);
                let r = rand();
                for (const [alo, ahi, w] of PYRAMID) { if (r < w) return alo + Math.floor(rand() * (ahi - alo)); r -= w; }
                return 30;
            };
            const rulers = h.rulers[f.id] || [];
            const ruler = rulers[rulers.length - 1] || null;
            const rulerHere = !!ruler && !rulerUnit[f.id] && !!f.home && f.home.x === site.x && f.home.y === site.y && sameArea(f.home.area, site.area);
            for (let i = 0; i < n; i++) {
                const j = Math.floor(rand() * free.length);
                const cell = free.splice(j, 1)[0] || { dx: 0, dy: 0 };
                const rank = i === 0 ? (rulerHere ? 2 : 1) : 0;
                let age = drawAge(rank > 0);
                if (rank === 2) age = Math.min(95, Math.max(age, h.years - ruler.from + 20 + Math.floor(rand() * 20)));
                const gender = rand() < 0.5 ? "male" : "female";
                const varIdx = 1 + Math.floor(rand() * 6);
                const isPlayerUnit = f.id === playerId;
                const data = {
                    kind: isPlayerUnit ? "colonist" : "person", faction: f.id, species: f.species, ai: "settlement", home: { area: { ...site.area }, x: site.x, y: site.y, z: levelOf(site) }, wander: radius + 2, site: site.id,
                    born: h.years - age, age, stage, gender, rank, superior: null,
                    variation: varIdx,
                    founder: isPlayerUnit && i < 8
                };
                if (rank === 2) data.title = ruler.title;
                if (sp.tint && f.species !== "human") data.tint = sp.tint;
                const unitImg = f.species === "human"
                    ? imageSpec(`${gender === "female" ? "$UF_Human_Female" : "$UF_Human_Male"}_${varIdx}_Walk`)
                    : imageSpec(images[imageIndex++ % images.length]);
                const u = W.addUnit({
                    name: rank === 2 ? ruler.name : newName(), image: unitImg,
                    area: { x: site.area.x, y: site.area.y }, z: levelOf(site), x: site.x + cell.dx, y: site.y + cell.dy, dir: 2, data,
                    snapToFree: 8 // never inside a wall piece, a tree or water (user rule 2026-09-18); UF_World finds the nearest free cell
                });
                u.data.stats = rollStats(state.seed, u.id, f.species, stage);
                const Dnd = window.UF && UF.Dnd5e;
                if (Dnd && typeof Dnd.assignClass === "function") {
                    u.data.dnd = Dnd.assignClass(u.data.stats, state.seed, u.id);
                    u.data.dndClass = u.data.dnd.id;
                    u.data.className = u.data.dnd.name;
                    u.data.hitDie = u.data.dnd.hitDie;
                    u.data.hpMax = u.data.dnd.hpMax;
                    u.data.hp = u.data.dnd.hp;
                    u.data.ac = u.data.dnd.ac;
                    u.data.savingThrows = u.data.dnd.savingThrows;
                    if (u.data.dnd && u.data.dnd.proficiencies && Array.isArray(u.data.dnd.proficiencies)) {
                        u.data.proficiencies = Array.from(new Set([...(u.data.proficiencies || []), ...u.data.dnd.proficiencies]));
                    }
                }
                if (!u.data.callings || u.data.callings.length < 3) {
                    const Callings = getCallings();
                    if (Callings && Callings.assignCallings) {
                        const uRng = mulberry32(hash32(h.seed || state.seed, SALT_CALLINGS, u.id));
                        Callings.assignCallings(u, f.population || f.settled || 8, uRng);
                    }
                }
                if (rank === 2) rulerUnit[f.id] = u.id;
                else if (rank === 1) leaderUnit[site.id] = u.id;
                const Items = window.UF && UF.Items;
                if (Items && typeof Items.giveFactionStartingKit === "function") {
                    Items.giveFactionStartingKit(u);
                }
                out.push(u);
            }
        }
        // A faction whose home matched no living site: its first site leader takes the ruler's place.
        for (const f of state.factions.list) {
            if (rulerUnit[f.id]) continue;
            const lead = out.find(u => u.data.faction === f.id && u.data.rank === 1);
            if (!lead) continue;
            const rulers = h.rulers[f.id] || [];
            const ruler = rulers[rulers.length - 1] || null;
            lead.data.rank = 2;
            if (ruler) { lead.name = ruler.name; lead.data.title = ruler.title; }
            rulerUnit[f.id] = lead.id;
            delete leaderUnit[lead.data.site];
        }
        // Superiors: site leaders answer to the faction's ruler; everyone else to the site's leader (the ruler at the ruler's site).
        for (const u of out) {
            const d = u.data;
            if (d.rank >= 2) continue;
            d.superior = (d.rank === 1 ? rulerUnit[d.faction] : leaderUnit[d.site] || rulerUnit[d.faction]) || null;
        }
        return out;
    };

    /** One line about a person: "Ostis, elder, ruler of The Ulok League, age 67", "Mira, child of Vasath, age 7". */
    History.describeUnit = function(unit) {
        if (!unit || !unit.data) return "";
        const d = unit.data;
        const site = d.site !== undefined && d.site !== null ? History.siteById(d.site) : null;
        const place = site ? site.name : History.factionName(d.faction);
        const stage = d.stage || (typeof d.age === "number" ? stageOf(d.age) : null);
        const role = d.rank >= 2 ? `ruler of ${History.factionName(d.faction)}` : d.rank === 1 ? `leader of ${place}` : `of ${place}`;
        const parts = [unit.name];
        if (stage) parts.push(d.rank >= 1 ? `${stage}, ${role}` : `${stage} ${role}`);
        else parts.push(role);
        if (typeof d.age === "number") parts.push(`age ${d.age}`);
        return parts.join(", ");
    };
    History.stageOf = stageOf;

    //-------------------------------------------------------------------------
    // Site layouts (pieces), deterministic per site

    function piecesFor(state, site) {
        if (site.bare) return []; // a year-1 camp: nothing is built (VISION V31, 2026-09-19)
        const k = kindConfig(site.kind);
        const r = k.radius || 0;
        const pieces = [];
        const taken = new Set();
        const add = (dx, dy, object) => {
            const key = `${dx},${dy}`;
            if (!object || taken.has(key)) return;
            taken.add(key);
            pieces.push({ dx, dy, object });
        };
        if (k.ring && r > 0) {
            // The perimeter of the Chebyshev square, clockwise from the top-left corner: 8r cells.
            const perimeter = [];
            for (let dx = -r; dx < r; dx++) perimeter.push([dx, -r]);
            for (let dy = -r; dy < r; dy++) perimeter.push([r, dy]);
            for (let dx = r; dx > -r; dx--) perimeter.push([dx, r]);
            for (let dy = r; dy > -r; dy--) perimeter.push([-r, dy]);
            const gaps = Math.max(0, k.gaps | 0);
            const open = new Set();
            for (let g = 0; g < gaps; g++) {
                const at = Math.floor(r + (g * perimeter.length) / gaps) % perimeter.length; // the first opening is mid-top
                open.add(at);
                open.add((at + 1) % perimeter.length);
            }
            perimeter.forEach(([dx, dy], i) => { if (!open.has(i)) add(dx, dy, k.ring); });
        }
        if (k.center) add(0, 0, k.center);
        const inside = Object.entries(k.inside || {});
        if (inside.length && r > 1) {
            const rng = mulberry32(hash32(state.seed, SALT_PIECES, site.id));
            const cells = [];
            for (let dy = -(r - 1); dy <= r - 1; dy++) {
                for (let dx = -(r - 1); dx <= r - 1; dx++) {
                    if (Math.abs(dx) + Math.abs(dy) <= 1) continue; // keep the center and its 4 neighbors free
                    cells.push([dx, dy]);
                }
            }
            for (const [object, count] of inside) {
                for (let n = 0; n < (count | 0) && cells.length; n++) {
                    const j = Math.floor(rng() * cells.length);
                    const [dx, dy] = cells.splice(j, 1)[0];
                    add(dx, dy, object);
                }
            }
        }
        return pieces;
    }

    /** Sites of an area with their layout: [{ ...site, radius, pieces: [{dx, dy, object}] }]. */
    History.sitesIn = function(ax, ay, z = 0) {
        const st = window.UF && UF.World && UF.World.state;
        if (!st || !st.history) return [];
        return st.history.sites.filter(s => s.area.x === ax && s.area.y === ay && levelOf(s) === z)
            .map(s => Object.assign({}, s, { radius: s.radius !== undefined ? s.radius : kindConfig(s.kind).radius || 0, pieces: piecesFor(st, s) }));
    };
    History.pieces = site => piecesFor(UF.World.state, site);
    History.sites = () => (History.current() ? History.current().sites.slice() : []);
    /** Events, newest last. filter: { faction?, type?, site?, since? } */
    History.events = function(filter = {}) {
        const h = History.current();
        if (!h) return [];
        return h.events.filter(e => (!filter.faction || e.factions.includes(filter.faction)) && (!filter.type || e.type === filter.type)
            && (filter.site === undefined || e.site === filter.site) && (filter.since === undefined || e.year >= filter.since));
    };
    History.siteById = id => (History.current() ? History.current().sites.find(s => s.id === id) || null : null);
    History.spawnFounders = spawnFounders;
    /** The player's home site (protected, at the map centre), or null. */
    History.homeSite = () => (History.current() ? History.current().sites.find(s => s.protected) || null : null);
    History.factionName = id => {
        const F = window.UF && UF.Factions ? UF.Factions.get(id) : null;
        return F ? F.name : id;
    };
    /** Per faction (the player's first): sites, wars, the current ruler. */
    History.summary = function() {
        const h = History.current();
        if (!h) return [];
        const factions = window.UF && UF.Factions ? UF.Factions.all().slice().sort((a, b) => (b.isPlayer ? 1 : 0) - (a.isPlayer ? 1 : 0)) : [];
        const W = window.UF && UF.World;
        const units = W && W.state ? W.units() : [];
        return factions.map(f => {
            const sites = h.sites.filter(s => s.faction === f.id);
            const list = h.rulers[f.id] || [];
            const ruler = list[list.length - 1] || null;
            const leader = ruler && ruler.unitId && W && W.state ? W.unit(ruler.unitId) : null; // colonists get new names from UF_Colonists
            return {
                id: f.id, name: f.name, species: f.species, population: f.population, isPlayer: !!f.isPlayer,
                people: units.filter(u => u.data && u.data.faction === f.id && (u.data.kind === "person" || u.data.kind === "colonist")).length,
                sites: sites.filter(s => !s.ruined).map(s => ({ id: s.id, name: s.name, kind: s.kind })),
                ruins: sites.filter(s => s.ruined).map(s => ({ id: s.id, name: s.name, year: s.ruined })),
                wars: (h.wars || []).filter(w => w.a === f.id || w.b === f.id).length,
                ruler: ruler ? { name: leader ? leader.name : ruler.name, title: ruler.title, since: ruler.from } : null
            };
        });
    };
    /** The site under a cell of the area on screen (within radius + 1), described for the look label; null if none. */
    History.siteAt = function(x, y, area) {
        const a = area || (window.UF && UF.World ? viewedArea() : null);
        if (!a) return null;
        for (const s of History.sitesIn(a.x, a.y, area ? levelOf(area) : viewZ())) {
            if (Math.max(Math.abs(s.x - x), Math.abs(s.y - y)) <= s.radius + 1) return s;
        }
        return null;
    };
    History.describeSite = function(x, y, area) {
        const s = History.siteAt(x, y, area);
        if (!s) return null;
        if (s.bare) return s.protected ? `${s.name}, your home camp of ${History.factionName(s.faction)} (settled in year ${s.founded})`
            : `${s.name}, the camp of ${History.factionName(s.faction)} (settled in year ${s.founded})`;
        if (s.kind === "lair") return `${s.name} (a beast's lair, year ${s.founded})`;
        if (s.ruined) return `Ruins of ${s.name}, once of ${History.factionName(s.faction)} (sacked in year ${s.ruined})`;
        if (s.protected) return `${s.name}, your home ${s.kind} of ${History.factionName(s.faction)} (founded year ${s.founded})`;
        return `${s.name}, a ${s.kind} of ${History.factionName(s.faction)} (founded year ${s.founded})`;
    };

    // New Game: history right after the factions (UF_Factions registered its listener first), then the people. One
    // summary line goes to the console.
    if (window.UF.Events && UF.Events.on) {
        UF.Events.on("world:created", state => {
            const targetYear = UF.NewGameSetup && UF.NewGameSetup.year;
            let generated;
            materializingNewGame = true;
            try { generated = History.generate(state, targetYear === undefined ? {} : { targetYear }); }
            finally { materializingNewGame = false; }
            if (!generated) return;
            const people = History.spawnPeople(state);
            if (state.history.demographics) {
                console.log(`DEUS_History: world age ${state.history.worldAge}, ${people.length} living citizens, ${state.history.demographics.graveyard.length} ancestors`);
                return;
            }
            if (state.history.founders) {
                const off = people.filter(u => {
                    const s = state.history.sites.find(x => x.id === u.data.site);
                    return !s || Math.max(Math.abs(u.x - s.x), Math.abs(u.y - s.y)) > foundersConfig().reach;
                }).length;
                const la = window.UF.Factions && UF.Factions.lastAreas;
                const fires = Object.values(state.history.founders).flatMap(r => r.camps || [r.camp]).filter(c => c && c.fire).length;
                console.log(`UF_History: year 1, ${state.factions.list.length} factions at ${state.history.sites.length} sites (areas placed in ${la ? la.ms.toFixed(0) : "?"} ms), ${fires} campfires lit, `
                    + `${people.length} founders (${people.filter(u => u.data.gender === "male").length} men, ${people.filter(u => u.data.gender === "female").length} women), ${off} outside their area's reach`);

                const targetYears = (state.history && state.history.startYear) || 1;
                if (targetYears > 1) {
                    try {
                        History.iterateWorldHistory(state, targetYears);
                    } catch (err) {
                        console.error("UF_History.iterateWorldHistory ERROR:", err);
                    }
                }
                return;
            }
            const s = state.history.settled;
            const byStage = {};
            for (const u of people) byStage[u.data.stage] = (byStage[u.data.stage] || 0) + 1;
            console.log(`UF_History: ${s ? `settled ${s.years} years in ${s.ms.toFixed(0)} ms (map build ${s.buildMs.toFixed(0)} ms): ${s.sitesGrown} of ${s.sites} sites grown, `
                + `${s.houses} houses, ${s.beds} beds, ${s.stockpiles} stockpiles, ${s.walls} wall pieces, ${s.workbenches} work stones, ${s.ruined} sites fallen, `
                + `${s.depleted.trees} trees felled, ${s.depleted.bushes} bushes picked, ${s.depleted.stones} stones taken, ${s.items} item stacks stored` : "no settling run"}; `
                + `${people.length} people spawned (${STAGES.map(st => `${byStage[st] || 0} ${st}`).join(", ")})`);
        });
    }

    //-------------------------------------------------------------------------
    // Chronicle window (H), the same style as the faction ledger

    class Window_UFChronicle extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this.opacity = 240;
            this._page = 0;
            this.hide();
        }

        get page() { return this._page; }
        /** Pages: a year-1 world: 0 = the chronicle, 1 = the founders. An older save: 0 = the overview, 1 = the settling years, 2 = the sites now. */
        pageCount() {
            const h = History.current();
            return h && h.founders ? 2 : 3;
        }
        setPage(p) {
            const n = this.pageCount();
            this._page = ((p % n) + n) % n;
            this.refresh();
        }
        nextPage() { this.setPage(this._page + 1); }

        refresh() {
            this.contents.clear();
            const w = this.innerWidth;
            const h = History.current();
            let y = 4;
            this.contents.fontSize = 20;
            this.changeTextColor("#f59e0b");
            const settledYears = h && h.settled ? h.settled.years : 0;
            const fresh = !!(h && h.founders);
            const title = !h ? "Chronicle" : fresh ? (this._page === 1 ? "The founders" : `Chronicle, year ${History.currentYear()}`)
                : this._page === 1 ? `The last ${settledYears} years` : this._page === 2 ? "Sites now" : `Chronicle of ${h.years} years`;
            this.drawText(title, 0, y, w, "center");
            y += 30;
            if (!h) {
                this.contents.fontSize = 14;
                this.changeTextColor("#94a3b8");
                this.drawText("This world has no recorded history.", 0, y, w, "center");
                this.resetTextColor();
                return;
            }
            if (fresh) {
                if (this._page === 1) this.drawFounders(h, y);
                else this.drawChronicle(h, y);
            } else if (this._page === 1) this.drawSettled(h, y);
            else if (this._page === 2) this.drawSitesNow(h, y);
            else this.drawOverview(h, y);
            this.changeTextColor("#64748b");
            this.contents.fontSize = 12;
            this.drawText(`Page ${this._page + 1} of ${this.pageCount()} · Tab: next page · H: close`, 0, this.innerHeight - 32, w, "center"); // drawText centres in a 36 px line
            this.resetTextColor();
        }

        /** Year 1 world, page 1: one row per faction (where it settled, its people now, its leader), then the events. */
        drawChronicle(h, y) {
            const w = this.innerWidth;
            const lineH = 18;
            for (const f of History.summary()) {
                const F = window.UF.Factions ? UF.Factions.get(f.id) : null;
                this.contents.fillRect(4, y, w - 8, lineH + 2, "rgba(20, 25, 35, 0.75)");
                this.contents.fontSize = 14;
                this.changeTextColor((F && F.color) || "#e2e8f0");
                this.drawText(f.name, 12, y, 230, "left");
                this.contents.fontSize = 12;
                this.changeTextColor("#cbd5e1");
                const where = f.sites.length ? `at ${f.sites.map(s => s.name).join(", ")}` : "no camp";
                const lead = f.ruler ? ` · led by ${f.ruler.title ? `${f.ruler.title} ` : ""}${f.ruler.name}` : "";
                this.drawText(`${f.isPlayer ? "yours · " : ""}${speciesWord(f.species)} · ${f.people} ${f.people === 1 ? "person" : "people"} ${where}${lead}`, 246, y + 1, w - 258, "left");
                y += lineH + 4;
            }
            y += 4;
            this.contents.fontSize = 14;
            this.changeTextColor("#f59e0b");
            this.drawText("What happened", 12, y, w, "left");
            y += 22;
            this.contents.fontSize = 12;
            const room = Math.max(0, Math.floor((this.innerHeight - y - 40) / 16));
            // The founding lines first (year 0 in a World Year 0 game, else year 1), then the newest events that still fit.
            const foundingYear = Math.min(1, ...h.sites.map(s => s.founded));
            const first = h.events.filter(e => e.type === "founding" && e.year === foundingYear);
            const later = h.events.filter(e => !(e.type === "founding" && e.year === foundingYear));
            const shown = first.slice(0, room).concat(later.slice(-Math.max(0, room - first.length)));
            for (const e of shown) {
                this.changeTextColor("#38bdf8");
                this.drawText(`Year ${e.year}`, 12, y, 60, "left");
                this.changeTextColor("#e2e8f0");
                this.drawText(e.text, 76, y, w - 88, "left");
                y += 16;
            }
        }

        /** Year 1 world, page 2: the founders of every faction (name, age, the leader first), from the units alive now. */
        drawFounders(h, y) {
            const w = this.innerWidth;
            const W = window.UF.World;
            this.contents.fontSize = 12;
            for (const f of History.summary()) {
                const rec = h.founders[f.id];
                if (!rec) continue;
                const F = window.UF.Factions ? UF.Factions.get(f.id) : null;
                const units = rec.units.map(r => (W ? W.unit(r.id) : null)).filter(Boolean).sort((a, b) => (b.data.rank | 0) - (a.data.rank | 0));
                this.changeTextColor((F && F.color) || "#e2e8f0");
                this.drawText(f.name, 12, y, 230, "left");
                this.changeTextColor("#cbd5e1");
                const who = units.map(u => `${u.name} (${u.data.gender === "female" ? "woman" : "man"}, ${u.data.age}${u.data.rank >= 1 ? `, ${u.data.title || "leader"}` : ""})`).join(", ");
                this.drawText(who || "no founder alive", 246, y, w - 258, "left");
                y += 20;
            }
        }

        /** The settling events (type settle_*), the most recent that fit. */
        drawSettled(h, y) {
            const w = this.innerWidth;
            const all = h.events.filter(e => typeof e.type === "string" && e.type.startsWith("settle_"));
            this.contents.fontSize = 12;
            this.changeTextColor("#94a3b8");
            const room = Math.max(0, Math.floor((this.innerHeight - y - 40) / 16));
            const shown = all.slice(-room);
            this.drawText(h.settled ? `${all.length} events from year ${h.settled.from} to ${h.settled.to} (${shown.length} shown): ${h.settled.houses} houses, ${h.settled.beds} beds, ${h.settled.stockpiles} stockpiles raised; ${h.settled.ruined} sites fell` : "No settling run was recorded for this world.", 12, y, w - 24, "left");
            y += 20;
            for (const e of shown) {
                this.changeTextColor("#38bdf8");
                this.drawText(`Year ${e.year}`, 12, y, 60, "left");
                this.changeTextColor(e.type === "settle_fever" || e.type === "settle_fell" ? "#fca5a5" : "#e2e8f0");
                this.drawText(e.text, 76, y, w - 88, "left");
                y += 16;
            }
        }

        /** One line per living site: name, faction, kind, people, what the settling built, its leader or ruler. */
        drawSitesNow(h, y) {
            const w = this.innerWidth;
            const W = window.UF.World;
            const units = W ? W.units().filter(u => u.data && u.data.site !== undefined && u.data.rank >= 1) : [];
            const living = h.sites.filter(s => !s.ruined && s.kind !== "lair" && s.faction).sort((a, b) => (b.protected ? 1 : 0) - (a.protected ? 1 : 0) || (b.pop || 0) - (a.pop || 0));
            const room = Math.max(0, Math.floor((this.innerHeight - y - 40) / 16));
            this.contents.fontSize = 12;
            this.changeTextColor("#94a3b8");
            this.drawText(`${living.length} living sites${living.length > room ? ` (${room} shown)` : ""} · people by the settled count, pieces added in the last ${h.settled ? h.settled.years : 0} years`, 12, y, w - 24, "left");
            y += 20;
            for (const s of living.slice(0, room)) {
                const F = window.UF.Factions ? UF.Factions.get(s.faction) : null;
                const st = s.settled || {};
                const built = st.pop !== undefined ? `+${(st.houses || []).length} houses, +${st.beds || 0} beds, +${st.stockpiles || 0} stockpiles${st.workbench ? ", work stone" : ""}${st.thickened ? ", second wall" : ""}` : "not settled";
                const lead = units.filter(u => u.data.site === s.id).sort((a, b) => b.data.rank - a.data.rank)[0] || null;
                const who = lead ? `${lead.name} (${lead.data.rank >= 2 ? "ruler" : "leader"}, ${lead.data.stage || History.stageOf(lead.data.age || 0)}, age ${lead.data.age})` : "no leader present";
                this.changeTextColor((F && F.color) || "#e2e8f0");
                this.drawText(`${s.protected ? "★ " : ""}${s.name}`, 12, y, 120, "left");
                this.changeTextColor("#cbd5e1");
                this.drawText(`${s.kind} of ${F ? F.name : s.faction} · ${s.pop} souls · ${built} · ${who}`, 136, y, w - 148, "left");
                y += 16;
            }
        }

        drawOverview(h, y) {
            const w = this.innerWidth;
            const rows = History.summary();
            const lineH = 18;
            for (const f of rows) {
                const F = window.UF.Factions ? UF.Factions.get(f.id) : null;
                this.contents.fillRect(4, y, w - 8, lineH + 2, "rgba(20, 25, 35, 0.75)");
                this.contents.fontSize = 14;
                this.changeTextColor((F && F.color) || "#e2e8f0");
                this.drawText(f.name, 12, y, 230, "left");
                this.contents.fontSize = 12;
                this.changeTextColor("#cbd5e1");
                const sites = f.sites.map(s => s.name).join(", ") || "no living site";
                const ruins = f.ruins.length ? ` · ${f.ruins.length} ruin${f.ruins.length > 1 ? "s" : ""}` : "";
                const ruler = f.ruler ? ` · ${f.ruler.title} ${f.ruler.name}` : "";
                this.drawText(`${f.isPlayer ? "yours · " : ""}${sites}${ruins} · ${f.wars} war${f.wars === 1 ? "" : "s"}${ruler}`, 246, y + 1, w - 258, "left");
                y += lineH + 4;
            }
            y += 4;
            this.contents.fontSize = 14;
            this.changeTextColor("#f59e0b");
            this.drawText("Recent events", 12, y, w, "left");
            y += 22;
            this.contents.fontSize = 12;
            const room = Math.max(0, Math.floor((this.innerHeight - y - 40) / 16));
            const recent = h.events.slice(-Math.min(20, room));
            for (const e of recent) {
                this.changeTextColor("#38bdf8");
                this.drawText(`Year ${e.year}`, 12, y, 60, "left");
                this.changeTextColor("#e2e8f0");
                this.drawText(e.text, 76, y, w - 88, "left");
                y += 16;
            }
        }
    }
    History.ChronicleWindow = Window_UFChronicle;

    History.chronicleWindow = () => (SceneManager._scene && SceneManager._scene._ufChronicleWindow) || null;
    History.toggleChronicle = function() {
        const win = this.chronicleWindow();
        if (!win) return false;
        if (win.visible) win.hide();
        else {
            win.setPage(0);
            win.show();
        }
        return win.visible;
    };
    /** Turn the chronicle's page (Tab while it is open). Returns the page shown, or -1 when it is closed. */
    History.nextChroniclePage = function() {
        const win = this.chronicleWindow();
        if (!win || !win.visible) return -1;
        win.nextPage();
        return win.page;
    };

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        const ww = Math.min(Graphics.boxWidth - 16, 780), wh = Math.min(Graphics.boxHeight - 16, 560);
        this._ufChronicleWindow = new Window_UFChronicle(new Rectangle((Graphics.boxWidth - ww) / 2, (Graphics.boxHeight - wh) / 2, ww, wh));
        this.addChild(this._ufChronicleWindow);
    };

    Input.keyMapper[72] = "ufChronicle"; // H (Tab, RMMZ's own "tab", turns the pages while the window is open)
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (Input.isTriggered("ufChronicle")) History.toggleChronicle();
        else if (Input.isTriggered("tab")) History.nextChroniclePage();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "history"), registered at boot after all plugins load

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        // All plugin scripts have loaded here, so this listener follows Colonists' conversion.
        // Conversion must not form new pairs before the historical snapshot enters live play.
        if (!pairingReleaseRegistered && UF.Events && UF.Events.on) {
            pairingReleaseRegistered = true;
            UF.Events.on("world:created", state => {
                const m = state.history && state.history.materialization;
                if (!m || !m.complete || !m.resumePairing) return;
                for (const id of Object.values(m.personToUnit)) state.units[id].data.willingToPartner = true;
                delete m.resumePairing;
            });
        }
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        // Words from the reference games and product-identity creatures that must never reach the player (AGENTS.md).
        const BANNED = /\b(avatar|britannia|guardian|lord british|iolo|dupre|shamino|fellowship|moongate|urist|armok|strange mood|fey mood|dwarf fortress|ultima|beholder|mind flayer|illithid|displacer beast|githyanki)\b/i;
        const syntheticState = (st, seed) => ({ zRange: st.zRange, seed, size: st.size, areasX: st.areasX, areasY: st.areasY, startArea: { x: st.startArea.x, y: st.startArea.y }, levels: st.levels, units: {}, nextUnitId: 1, diffs: {}, objectDiffs: {} });
        const regenerate = (st, seed, opts) => {
            const s2 = syntheticState(st, seed);
            UF.Factions.generate(s2);
            if (UF.Factions && typeof UF.Factions.placeAreas === "function") UF.Factions.placeAreas(s2);
            History.generate(s2, opts);
            return s2;
        };
        // What generation decides (the live record also carries unit ids, the clock and play events, which a synthetic run can't have).
        const sig = h => JSON.stringify({
            years: h.years, events: h.events.filter(e => e.year <= 1 && e.type === "founding"),
            sites: (h.sites || []).map(s => ({ id: s.id, faction: s.faction, x: s.x, y: s.y, z: s.z, name: s.name })),
            rulers: Object.fromEntries(Object.entries(h.rulers || {}).map(([k, v]) => [k, v.map(r => [r.name, r.title, r.from])])),
            founders: Object.fromEntries(Object.entries(h.founders || {}).map(([k, v]) => [k, v.plan]))
        });
        const BUILT_TAGS = ["building", "ruin"];

        // The start before anything moves (VISION V4: PPP / PFP / PPP). The colonists start working and the other bands
        // start wandering on the first map updates, so by the time a suite runs the ring has broken up. With the history
        // suite selected, the first map start pauses the world (UF_TimeSpeed's pause, what the player's Space does),
        // records every camp's nine cells as they stand (units, their facing on screen, objects), shoots the player's camp
        // at zoom 1 and 2/3 and another faction's camp, and lets the world run again: at most START_HOLD frames, less
        // than the 60 UF_Test waits before its first suite. campfire_start reads what was recorded.
        const START_HOLD = 55;
        const capture = { state: UF.Test.only && UF.Test.only !== "history" ? "not selected" : "armed", frames: 0, phase: 0, wait: 0, shots: [], camps: {}, note: "" };
        History.startCapture = capture;
        if (capture.state === "armed") {
            const fs = require("fs"), path = require("path");
            const outDir = path.join(nw.__dirname || process.cwd(), "test_output");
            const snap = name => {
                try {
                    const file = path.join(outDir, `history.${name}.png`);
                    fs.writeFileSync(file, SceneManager.snap().canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, ""), "base64");
                    capture.shots.push(file);
                } catch (e) {
                    capture.note += ` snap ${name} failed: ${e.message};`;
                }
            };
            const recordCamps = () => {
                const W = UF.World, h = History.current(), here = viewedArea();
                for (const s of h.sites) {
                    if (!sameArea(s.area, here) || levelOf(s) !== viewZ()) continue;
                    const cells = [];
                    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                        const x = s.x + dx, y = s.y + dy;
                        const t = W.getObject(s.area.x, s.area.y, x, y, levelOf(s));
                        const units = W.units().filter(u => sameArea(u.area, s.area) && levelOf(u) === levelOf(s) && u.x === x && u.y === y).map(u => {
                            const ev = W.eventOf(u.id);
                            return { id: u.id, name: u.name, faction: u.data && u.data.faction, gender: u.data && u.data.gender, dir: ev ? ev.direction() : u.dir, onScreen: !!ev, sheet: u.image.characterName };
                        });
                        cells.push({ dx, dy, object: t ? ((catalog().objects[t - 1] || {}).id || t) : null, units });
                    }
                    capture.camps[s.id] = { site: s.id, x: s.x, y: s.y, z: levelOf(s), cells };
                }
            };
            const founderSpritesReady = () => {
                const scene = SceneManager._scene, W = UF.World, h = History.current(), home = History.homeSite();
                const rec = home && h.founders[home.faction];
                if (!rec || !scene || !scene._spriteset) return false;
                return rec.units.filter(r => levelOf(r) === viewZ()).every(r => {
                    const ev = W.eventOf(r.id);
                    const sp = ev && scene._spriteset._characterSprites.find(c => c._character === ev);
                    return !!sp && !!sp.bitmap && sp.bitmap.isReady();
                });
            };
            const _Scene_Map_start_capture = Scene_Map.prototype.start;
            Scene_Map.prototype.start = function() {
                _Scene_Map_start_capture.call(this);
                if (capture.state !== "armed") return;
                const h = History.current();
                if (!h || !h.founders || !window.UF.Time || !window.UF.World) {
                    capture.state = "skipped";
                    capture.note = `no year-1 history (${!!(h && h.founders)}) or no UF_TimeSpeed pause (${!!window.UF.Time})`;
                    return;
                }
                UF.Time.pause();
                capture.state = "paused";
                capture.scene = this;
                capture.level0 = UF.Camera ? UF.Camera.level() : 0;
            };
            const finish = state => {
                const home = History.homeSite();
                if (UF.Camera) UF.Camera.setLevel(capture.level0);
                if (home) $gamePlayer.locate(home.x, home.y);
                UF.Time.resume();
                capture.state = state;
                capture.scene = null;
            };
            const _Scene_Map_update_capture = Scene_Map.prototype.update;
            Scene_Map.prototype.update = function() {
                _Scene_Map_update_capture.call(this);
                if (capture.state !== "paused" || capture.scene !== this) return;
                capture.frames++;
                if (capture.wait > 0) { capture.wait--; return; }
                const home = History.homeSite(), h = History.current(), cam = window.UF.Camera || null;
                const twoThirds = cam ? cam.levels.findIndex(z => Math.abs(z - 2 / 3) < 0.01) : -1;
                const other = h.sites.find(s => !s.protected && sameArea(s.area, viewedArea()) && levelOf(s) === viewZ()) || null;
                if (capture.phase === 0) {
                    const ready = ImageManager.isReady() && !(this._fadeDuration > 0) && founderSpritesReady();
                    if (!ready && capture.frames < 25) return;
                    capture.readyAt = capture.frames;
                    recordCamps();
                    if (cam) cam.setLevel(0);
                    if (home) $gamePlayer.locate(home.x, home.y);
                    capture.phase = 1; capture.wait = 3;
                } else if (capture.phase === 1) {
                    snap("start_zoom1");
                    if (cam && twoThirds >= 0) cam.setLevel(twoThirds);
                    if (home) $gamePlayer.locate(home.x, home.y);
                    capture.phase = 2; capture.wait = 3;
                } else if (capture.phase === 2) {
                    snap("start_zoom23");
                    if (other) { $gamePlayer.locate(other.x, other.y); capture.otherCamp = other.id; capture.phase = 3; capture.wait = 4; } else capture.phase = 4;
                } else if (capture.phase === 3) {
                    snap("start_other");
                    capture.phase = 4;
                }
                if (capture.phase === 4) finish("done");
                else if (capture.frames >= START_HOLD) finish("timeout");
            };
        }

        UF.Test.suite("history", async t => {
            const W = UF.World, st = W && W.state;
            const h = st && st.history;
            const cfg = History.config(), fc = foundersConfig();
            t.check("generated_with_world", !!cfg && !!h && Array.isArray(h.events) && Array.isArray(h.sites) && h.version === 5 && !!h.founders,
                h ? `history version ${h.version}, ${h.sites.length} camps, ${h.events.length} events, founders for ${Object.keys(h.founders || {}).length} factions, seed ${st.seed} (${History.lastRun ? History.lastRun.ms.toFixed(1) + " ms" : "time unknown"})` : "no history in the world state");
            if (!h || !h.founders) return;
            const factions = UF.Factions.all();
            const size = st.size, mid = Math.floor(size / 2);
            const acfg = UF.Factions.areasConfig ? UF.Factions.areasConfig() : { playerReach: HOME_REACH };
            const pid = st.factions.playerId;
            const player = UF.Factions.player();
            const home = History.homeSite();
            const objs = catalog().objects;
            const tagsOf = t2 => (objs[t2 - 1] && Array.isArray(objs[t2 - 1].tags) ? objs[t2 - 1].tags : []);
            const pristine = area => withWorldState(Object.assign({}, st, { objectDiffs: {}, diffs: {}, units: {} }), () => W.buildArea(area.x, area.y, levelOf(area)));
            const other = regenerate(st, st.seed + 1), third = regenerate(st, st.seed + 2);

            // player_faction: the player's camp is the home, at its area centre within playerReach of the map centre; the
            // view started there; the same for seeds +1 and +2.
            const homeDist = home ? Math.hypot(home.x - mid, home.y - mid) : Infinity;
            const vs = st.viewStart;
            const viewOnHome = !!vs && !!home && vs.x === home.x && vs.y === home.y && levelOf(vs) === levelOf(home);
            const playerNear = !!home && sameArea(viewedArea(), home.area) && viewZ() === levelOf(home) && Math.hypot($gamePlayer.x - home.x, $gamePlayer.y - home.y) <= 6;
            // The camp stands on the faction's camp cell: its area centre, or the nearest cell whose 3 x 3 block is all land.
            const homeCell = player ? History.campCell(st, player) : null;
            const onArea = !!home && !!player && !!homeCell && homeCell.x === home.x && homeCell.y === home.y && sameArea(player.home.area, home.area);
            const badSeeds = [other, third].filter(s2 => {
                const hs = s2.history.sites.find(s => s.protected);
                return !hs || hs.faction !== s2.factions.playerId || (levelOf(hs) === 0 && Math.hypot(hs.x - mid, hs.y - mid) > acfg.playerReach) || !s2.viewStart || s2.viewStart.x !== hs.x || s2.viewStart.y !== hs.y || levelOf(s2.viewStart) !== levelOf(hs);
            });
            t.check("player_faction", !!player && player.id === pid && player.isPlayer && !!home && home.faction === pid && home.bare === true && !home.ruined && (levelOf(home) !== 0 || homeDist <= acfg.playerReach)
                && h.homeSiteId === home.id && viewOnHome && playerNear && onArea && badSeeds.length === 0,
                `playerId ${pid} = ${player ? `${player.name} (${player.species})` : "NO FACTION"}; home ${home ? `${home.name} (${home.kind}, bare ${home.bare}, id ${home.id}) at (${home.x},${home.y}), ${homeDist.toFixed(1)} cells from the centre (want <= ${acfg.playerReach})` : "NONE"}; `
                + `on the faction's camp cell ${homeCell ? `(${homeCell.x},${homeCell.y}), ${homeCell.moved.toFixed(1)} from its area centre (${player.home.x},${player.home.y})` : "NONE"}: ${onArea}; viewStart ${vs ? `(${vs.x},${vs.y})` : "unset"} ${viewOnHome ? "matches" : "DOES NOT match"}; the view (${$gamePlayer.x},${$gamePlayer.y}) ${playerNear ? "is on" : "is NOT on"} it; `
                + `seeds ${st.seed + 1}/${st.seed + 2}: ${badSeeds.length ? `${badSeeds.length} WITHOUT a home at the centre` : "home at the centre in both"}`);

            // Screenshots at zoom 2/3 before anything walks off: the player's area with its four and the kit, then another faction's.
            const cam = window.UF.Camera || null;
            const level0 = cam ? cam.level() : 0;
            const twoThirds = cam ? cam.levels.findIndex(z => Math.abs(z - 2 / 3) < 0.01) : -1;
            if (cam && twoThirds >= 0) cam.setLevel(twoThirds);
            if (home) {
                $gamePlayer.locate(home.x, home.y);
                await t.waitFrames(30);
                t.screenshot("home_area");
            }
            const otherCamp = h.sites.find(s => !s.protected && sameArea(s.area, viewedArea()) && levelOf(s) === viewZ()) || h.sites.find(s => !s.protected) || null;
            if (otherCamp && levelOf(otherCamp) === viewZ()) {
                $gamePlayer.locate(otherCamp.x, otherCamp.y);
                await t.waitFrames(30);
                t.screenshot("other_area");
            }
            if (cam) cam.setLevel(level0);
            if (home) $gamePlayer.locate(home.x, home.y);
            await t.waitFrames(5);

            // no_years: nothing was simulated before play: no years, one bare camp and one year-1 founding line per faction,
            // no ruins, lairs or wars, one founder-leader per faction as the only ruler; the same for seeds +1 and +2.
            const OLD_TYPES = ["growth", "succession", "plague", "beast", "war", "peace", "war_end", "sack", "alliance", "trade"];
            const yearsProblems = s2 => {
                const hh = s2.history, fl = s2.factions.list, out = [];
                if (hh.years !== 0 || hh.simulated !== false) out.push(`years ${hh.years}, simulated ${hh.simulated}`);
                if (hh.settled) out.push("a settling record");
                const early = hh.events.filter(e => e.year <= 1);
                const foundings = early.filter(e => e.type === "founding" && e.year === 1);
                if (early.length !== foundings.length) out.push(`${early.length - foundings.length} year-0/1 events that aren't year-1 foundings`);
                if (hh.events.some(e => OLD_TYPES.includes(e.type) || String(e.type).startsWith("settle_"))) out.push("simulated event types present");
                for (const f of fl) {
                    const mine = foundings.filter(e => e.factions.length === 1 && e.factions[0] === f.id);
                    const camp = hh.sites.filter(s => s.faction === f.id);
                    const plural = (((catalog().factions || {}).species || []).find(sp => sp.id === f.species) || {}).name;
                    const expectedCamps = 1;
                    if (mine.length !== expectedCamps || camp.some(c => !mine.some(e => e.site === c.id && e.text === `${WORDS[c.pop] || String(c.pop)} ${String(plural || f.species).toLowerCase()} of ${f.name} settled by ${c.name}.`))) out.push(`${f.name}: founding lines do not match camps`);
                    if (camp.length !== expectedCamps || camp.some(c => !c.bare || c.ruined || c.founded !== 1)) out.push(`${f.name}: ${camp.length} camps`);
                    if (!hh.rulers[f.id] || hh.rulers[f.id].length !== 1) out.push(`${f.name}: ${(hh.rulers[f.id] || []).length} rulers`);
                }
                if (hh.sites.length !== fl.length || hh.sites.some(s => s.kind === "lair" || s.ruined)) out.push(`${hh.sites.length} sites for ${fl.length} factions`);
                if ((hh.wars || []).length) out.push(`${hh.wars.length} wars`);
                return out;
            };
            const noYears = [[st.seed, st], [st.seed + 1, other], [st.seed + 2, third]].map(([seed, s2]) => ({ seed, p: yearsProblems(s2) }));
            const flagsOff = cfg.simulate !== true && settleConfig(cfg).years === 0;
            const dwarfProblems = [];
            const subFactions = factions.filter(f => f.home.z < 0);
            if (!subFactions.length) dwarfProblems.push("no subterranean factions");
            for (const f of subFactions) {
                const wantZ = (f.species === "tiefling" || f.species === "dragonborn") ? -2 : -1;
                const camps = h.sites.filter(s => s.faction === f.id), rec = h.founders[f.id];
                if (!rec || camps.length !== 1 || f.home.z !== wantZ || camps[0].z !== wantZ) {
                    dwarfProblems.push(`${f.name} (${f.species}): expected 1 site on z=${wantZ}`);
                }
            }
            t.check("dwarf_two_level_start", dwarfProblems.length === 0, `${subFactions.length} subterranean faction(s) on assigned Z levels (-1 dwarves/gnomes, -2 tieflings/dragonborn); ${dwarfProblems.join("; ") || "levels and founders agree"}`);
            t.check("no_years", flagsOff && noYears.every(r => r.p.length === 0),
                `catalog history.simulate ${cfg.simulate}, settleYears ${cfg.settleYears} (want false and 0); this world: ${h.years} years simulated, ${h.sites.length} camps, ${(h.wars || []).length} wars, ${h.events.filter(e => e.year === 1 && e.type === "founding").length} year-1 lines, e.g. "${(h.events[0] || {}).text}"; `
                + noYears.map(r => `seed ${r.seed}: ${r.p.length ? `PROBLEMS ${r.p.join("; ")}` : "ok"}`).join("; "));

            // founders: per faction exactly `male` men and `female` women, adults within the age range, spawned on free land
            // cells within `reach` of the centre (free in a pristine build of the area: no blocking object, no water, no peak).
            const founderUnits = [];
            const foundersProblems = [];
            const [ageLo, ageHi] = fc.age;
            const perFaction = [];
            const areaBuilds = new Map();
            const buildOf = area => { const k = `${area.x},${area.y},${levelOf(area)}`; if (!areaBuilds.has(k)) areaBuilds.set(k, pristine(area)); return areaBuilds.get(k); };
            for (const f of factions) {
                const rec = h.founders[f.id];
                const camp = rec ? h.sites.find(s => s.id === rec.site) : null;
                if (!rec || !camp) { foundersProblems.push(`${f.name}: no founders record`); continue; }
                const units = rec.units.map(r => ({ r, u: W.unit(r.id) }));
                const men = units.filter(x => x.u && x.u.data.gender === "male").length, women = units.filter(x => x.u && x.u.data.gender === "female").length;
                if (units.length !== fc.male + fc.female || men !== fc.male || women !== fc.female) foundersProblems.push(`${f.name}: ${units.length} founders, ${men} men, ${women} women`);
                const cells = new Set();
                for (const { r, u } of units) {
                    if (!u) { foundersProblems.push(`${f.name}: unit ${r.id} missing`); continue; }
                    const camp = h.sites.find(s => s.id === (r.site === undefined ? rec.site : r.site));
                    if (!camp || levelOf(camp) !== levelOf(r) || levelOf(u) !== levelOf(r)) { foundersProblems.push(`${u.name}: wrong founding level/site`); continue; }
                    const map = buildOf(siteArea(camp));
                    founderUnits.push(u);
                    const d = u.data;
                    const wantKind = f.id === pid && window.UF.Colonists ? "colonist" : "person";
                    if (d.faction !== f.id || d.species !== f.species || d.kind !== wantKind || !u.name) foundersProblems.push(`${u.name || u.id}: faction ${d.faction}, species ${d.species}, kind ${d.kind} (want ${wantKind})`);
                    if (!(d.age >= ageLo && d.age <= ageHi) || d.stage !== "adult" || d.born + d.age !== 1) foundersProblems.push(`${u.name}: age ${d.age}, stage ${d.stage}, born ${d.born}`);
                    if (Math.max(Math.abs(r.x - camp.x), Math.abs(r.y - camp.y)) > fc.reach) foundersProblems.push(`${u.name} spawned at (${r.x},${r.y}), ${Math.max(Math.abs(r.x - camp.x), Math.abs(r.y - camp.y))} from the centre`);
                    const key = `${levelOf(r)},${r.x},${r.y}`;
                    if (cells.has(key)) foundersProblems.push(`${u.name}: cell ${key} shared`);
                    cells.add(key);
                    const i = r.y * size + r.x;
                    const obj = map.ufObjects[i], ob = objs[obj - 1];
                    if (Tilemap.isTileA1(map.data[i]) || map.data[(5 * size + r.y) * size + r.x] === 250 || (obj && !(ob && ob.passable === true))) foundersProblems.push(`${u.name}: spawn cell ${key} is water, a peak or holds ${ob ? ob.id : obj}`);
                }
                perFaction.push(`${f.name.replace(/^The /, "")}: ${units.map(({ r, u }) => (u ? `${u.name} ${u.data.gender === "male" ? "m" : "f"}${u.data.age}${u.data.rank >= 1 ? "*" : ""} (${r.x - camp.x},${r.y - camp.y})` : "?")).join(", ")}`);
            }
            t.check("founders", factions.length > 0 && foundersProblems.length === 0 && founderUnits.length === factions.length * (fc.male + fc.female),
                `${founderUnits.length} founders for ${factions.length} factions (want ${fc.male} men + ${fc.female} women each, ages ${ageLo}-${ageHi}, within ${fc.reach} of the centre, * = leader, offsets from the centre): ${perFaction.join("; ")}`
                + (foundersProblems.length ? `; PROBLEMS (${foundersProblems.length}): ${foundersProblems.slice(0, 6).join("; ")}` : ""));

            // campfire_start (VISION V4, the user's drawing PPP / PFP / PPP): for every faction, its camp stands on the cell
            // nearest its area centre whose 3 x 3 block is all land (recomputed), the nine cells are land inside the map, the
            // lit campfire stands on the centre cell and nothing else on the other eight (live object grid); the founders
            // were spawned one on each of the eight cells around it (the spawn records), men and women alternating round the
            // ring, each facing the fire; and at the first map frame, before anything moved (the start capture above), each
            // of the eight cells held exactly one unit, that faction's founder facing the fire, and the centre only the fire.
            const fireId = campFireId();
            const fireType = window.UF.Objects ? UF.Objects.type(fireId) : null;
            const fireRule = window.UF.Fire && typeof UF.Fire.ruleFor === "function" ? UF.Fire.ruleFor(fireId) : null;
            const lit = !!fireType && (fireType.tags || []).includes("fire") && (!window.UF.Fire || (!!fireRule && fireRule.source === true));
            const ringKeys = RING.map(([dx, dy]) => `${dx},${dy}`);
            const campProblems = [], campRows = [];
            const cap = History.startCapture || { state: "missing", camps: {}, shots: [] };
            let captured = 0;
            if (fc.male + fc.female !== RING.length) campProblems.push(`catalog factions.founders is ${fc.male} men + ${fc.female} women; the drawing has ${RING.length} around the fire`);
            for (const camp of h.sites) {
                const f = factions.find(f => f.id === camp.faction);
                const full = f && h.founders[f.id];
                const rec = full && { ...full, units: full.units.filter(r => (r.site === undefined ? full.site : r.site) === camp.id), camp: (full.camps || [full.camp]).find(c => c && (c.site === undefined ? full.site : c.site) === camp.id) };
                const label = `${f ? f.name.replace(/^The /, "") : camp.faction} z${levelOf(camp)}`;
                if (!rec || !camp) { campProblems.push(`${label}: no camp`); continue; }
                const p0 = campProblems.length;
                const want = History.campCell(st, { home: { area: camp.area, x: camp.x, y: camp.y, z: levelOf(camp) } });
                if (!want || want.x !== camp.x || want.y !== camp.y) campProblems.push(`${label}: camp at (${camp.x},${camp.y}) but the nearest all-land 3x3 block is at ${want ? `(${want.x},${want.y})` : "NONE"}`);
                const map = buildOf(siteArea(camp));
                const edge = camp.x < 1 || camp.y < 1 || camp.x > size - 2 || camp.y > size - 2;
                if (edge) campProblems.push(`${label}: camp on the map edge`);
                let notLand = 0;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                    const x = camp.x + dx, y = camp.y + dy, i = y * size + x;
                    if (edge || Tilemap.isTileA1(map.data[i]) || map.data[(5 * size + y) * size + x] === 250) notLand++;
                }
                if (notLand) campProblems.push(`${label}: ${notLand} of the nine cells water or peak`);
                // The fire and nothing else, in the live object grid (the campfire is a built object: a diff).
                const centreObj = W.getObject(camp.area.x, camp.area.y, camp.x, camp.y, levelOf(camp));
                const centreId = centreObj ? (objs[centreObj - 1] || {}).id : null;
                const ringObjs = RING.map(([dx, dy]) => W.getObject(camp.area.x, camp.area.y, camp.x + dx, camp.y + dy, levelOf(camp))).filter(Boolean).map(t2 => (objs[t2 - 1] || {}).id);
                if (centreId !== fireId || !rec.camp || rec.camp.fire !== fireId) campProblems.push(`${label}: centre holds ${centreId || "nothing"} (want ${fireId})`);
                if (ringObjs.length) campProblems.push(`${label}: objects on the ring: ${ringObjs.join(", ")}`);
                // The spawn records: eight founders, one per ring cell, alternating, facing the fire.
                const ring = rec.units.map(r => ({ r, key: `${r.x - camp.x},${r.y - camp.y}` }));
                const onRing = ring.filter(x => ringKeys.includes(x.key));
                const keys = new Set(onRing.map(x => x.key));
                if (rec.units.length !== camp.pop || onRing.length !== Math.min(RING.length, camp.pop) || keys.size !== onRing.length) campProblems.push(`${label}: ${rec.units.length} founders, ${onRing.length} on the ring, ${keys.size} ring cells taken (want ${camp.pop} founders)`);
                const byCell = new Map(onRing.map(x => [x.key, x.r]));
                const seq = ringKeys.map(k => byCell.get(k)).map(r => (r ? r.gender : "?"));
                const alternating = seq.every((g, k) => g === "?" || seq[(k + 1) % seq.length] === "?" || g !== seq[(k + 1) % seq.length]);
                if (!alternating) campProblems.push(`${label}: round the ring ${seq.map(g => (g === "male" ? "m" : g === "female" ? "f" : g)).join("")} (want men and women alternating)`);
                const men = rec.units.filter(r => r.gender === "male").length, women = rec.units.filter(r => r.gender === "female").length;
                const sitePlan = full.plan.filter(p => (p.site === undefined ? full.site : p.site) === camp.id);
                if (men !== sitePlan.filter(p => p.gender === "male").length || women !== sitePlan.filter(p => p.gender === "female").length) campProblems.push(`${label}: ${men} men, ${women} women`);
                const badFace = onRing.filter(x => { const [dx, dy] = x.key.split(",").map(Number); return x.r.dir !== faceFire(dx, dy); });
                if (badFace.length) campProblems.push(`${label}: ${badFace.length} founders not facing the fire (first at ${badFace[0].key} facing ${badFace[0].r.dir}, want ${faceFire(...badFace[0].key.split(",").map(Number))})`);
                // At the first frame (the start capture), as the player saw it.
                const cc = cap.camps[camp.id];
                let capText = "not captured";
                if (cc) {
                    captured++;
                    const ids = new Set(rec.units.map(r => r.id));
                    const cellProblems = [];
                    for (const cell of cc.cells) {
                        const k = `${cell.dx},${cell.dy}`;
                        if (k === "0,0") {
                            if (cell.object !== fireId || cell.units.length) cellProblems.push(`centre: ${cell.object || "nothing"}, ${cell.units.length} units`);
                        } else if (cell.object || (byCell.has(k) ? cell.units.length !== 1 || !ids.has(cell.units[0].id) || cell.units[0].dir !== faceFire(cell.dx, cell.dy) : cell.units.length !== 0)) {
                            cellProblems.push(`${k}: ${cell.object || "no object"}, ${cell.units.map(u => `${u.name} dir ${u.dir}${ids.has(u.id) ? "" : " (not a founder)"}`).join(" + ") || "empty"}`);
                        }
                    }
                    if (cellProblems.length) campProblems.push(`${label} at the first frame: ${cellProblems.slice(0, 3).join("; ")}`);
                    const pic = [-1, 0, 1].map(dy => [-1, 0, 1].map(dx => {
                        const cell = cc.cells.find(c => c.dx === dx && c.dy === dy);
                        if (dx === 0 && dy === 0) return cell && cell.object === fireId ? "F" : "?";
                        return cell && cell.units.length === 1 && ids.has(cell.units[0].id) ? "P" : cell && cell.units.length ? "x" : ".";
                    }).join("")).join("/");
                    capText = `first frame ${pic}`;
                }
                const face = ringKeys.map(k => (byCell.get(k) ? byCell.get(k).dir : "-")).join("");
                const sheets = [...new Set(rec.units.map(r => { const u = W.unit(r.id); return u ? `${u.data.gender === "male" ? "m" : "f"} ${u.image.characterName}` : "?"; }))].join(", ");
                campRows.push(`${label} (${f.species}, ${camp.x},${camp.y})${want && want.moved ? `, ${want.moved.toFixed(1)} from its centre` : ""}: ${centreId || "nothing"} + ${onRing.length} on the ring (sheets ${sheets}), genders N-NE-E-SE-S-SW-W-NW ${seq.map(g => (g === "male" ? "m" : g === "female" ? "f" : g)).join("")}, facings ${face}, ${capText}${campProblems.length > p0 ? " [PROBLEM]" : ""}`);
            }
            const wantCaptured = h.sites.filter(s => sameArea(s.area, viewedArea()) && levelOf(s) === viewZ()).length;
            if (fireId !== "chest_wood" && !lit) campProblems.push(`${fireId}: tags ${fireType ? (fireType.tags || []).join("/") : "unknown object"}, fire rule ${fireRule ? JSON.stringify(fireRule) : "none"} (want tag fire and a contained source)`);
            t.check("campfire_start", factions.length > 0 && campProblems.length === 0,
                `${factions.length} camps as drawn (PPP/PFP/PPP; facings N-NE-E-SE-S-SW-W-NW in RMMZ numbers, 2 down 8 up 6 right 4 left): ${campRows.join("; ")}; `
                + `${fireId}: placed at center; start capture ${cap.state} after ${cap.frames || 0} frames (ready at ${cap.readyAt === undefined ? "-" : cap.readyAt}), shots ${cap.shots.map(s => s.split(/[\\/]/).pop()).join(", ") || "none"}`
                + (campProblems.length ? `; PROBLEMS (${campProblems.length}): ${campProblems.slice(0, 6).join("; ")}` : ""));

            // stats_and_ranks: six scores 3-18 that are exactly the seeded roll for the unit; one leader (rank 1) per
            // faction, the one the chronicle names; every other founder rank 0 under it.
            const KEYS = ["str", "dex", "con", "int", "wis", "cha"];
            const rankProblems = [];
            for (const u of founderUnits) {
                const s = u.data.stats;
                if (!s || KEYS.some(k => !Number.isInteger(s[k]) || s[k] < 3 || s[k] > 18)) rankProblems.push(`${u.name}: stats ${JSON.stringify(s)}`);
                else if (JSON.stringify(s) !== JSON.stringify(rollStats(st.seed, u.id, u.data.species, u.data.stage))) rankProblems.push(`${u.name}: stats aren't the seeded roll`);
            }
            for (const f of factions) {
                const mine = founderUnits.filter(u => u.data.faction === f.id);
                const leaders = mine.filter(u => u.data.rank === 1);
                const r = (h.rulers[f.id] || [])[0];
                if (leaders.length !== 1 || !r || r.unitId !== leaders[0].id) { rankProblems.push(`${f.name}: ${leaders.length} leaders, chronicle names unit ${r ? r.unitId : "none"}`); continue; }
                for (const u of mine) if (u !== leaders[0] && (u.data.rank !== 0 || u.data.superior !== leaders[0].id)) rankProblems.push(`${u.name}: rank ${u.data.rank}, superior ${u.data.superior} (want 0 under ${leaders[0].id})`);
            }
            const sample = founderUnits.find(u => u.data.rank === 1) || null;
            t.check("stats_and_ranks", founderUnits.length > 0 && rankProblems.length === 0,
                `${founderUnits.length} founders checked; ${rankProblems.length} problems${rankProblems.length ? `: ${rankProblems.slice(0, 4).join("; ")}` : ""}; sample: ${sample ? `"${History.describeUnit(sample)}" ${JSON.stringify(sample.data.stats)}` : "no leader"}`);

            // nothing_built: no camp has pieces, and a pristine build of every area with a camp holds no built object
            // (tags building or ruin) anywhere.
            const withPieces = W.levels().flatMap(z => History.sitesIn(st.startArea.x, st.startArea.y, z)).filter(s => s.pieces.length);   // every level of the Z range (WG.00.17)
            let built = 0, firstBuilt = "";
            for (const [key, map] of areaBuilds) {
                for (let i = 0; i < map.ufObjects.length; i++) {
                    const o = map.ufObjects[i];
                    if (o && tagsOf(o).some(tg => BUILT_TAGS.includes(tg))) { built++; if (!firstBuilt) firstBuilt = `${objs[o - 1].id} at (${i % size},${Math.floor(i / size)}) of area ${key}`; }
                }
            }
            t.check("nothing_built", areaBuilds.size > 0 && withPieces.length === 0 && built === 0,
                `${h.sites.length} camps, ${withPieces.length} with pieces; ${built} built objects (tags ${BUILT_TAGS.join("/")}) in a pristine build of ${areaBuilds.size} area(s)${firstBuilt ? `, first: ${firstBuilt}` : ""}`);

            // deterministic: the same seed from a fresh synthetic state gives the same year 1 (areas, camps, lines,
            // founders' plans); the next seed gives another.
            const again = regenerate(st, st.seed);
            const sameAsLive = sig(again.history) === sig(h), otherDiffers = sig(other.history) !== sig(h);
            t.check("deterministic", sameAsLive && otherDiffers && JSON.stringify(again.factions.list.map(f => f.home)) === JSON.stringify(st.factions.list.map(f => f.home)),
                `regenerated from seed ${st.seed}: year 1 ${sameAsLive ? "identical" : "DIFFERENT"} to the live world, areas ${JSON.stringify(again.factions.list.map(f => f.home)) === JSON.stringify(st.factions.list.map(f => f.home)) ? "identical" : "DIFFERENT"}; seed ${st.seed + 1}: ${otherDiffers ? "another" : "THE SAME"} year 1`);

            // saved
            const saved = JsonEx.parse(JsonEx.stringify(st));
            t.check("saved", !!saved.history && JSON.stringify(saved.history) === JSON.stringify(h), `history round-trips through the save format (${JsonEx.stringify(h).length} bytes)`);

            // chronicle_opens: H opens it on page 1 (the chronicle, year N), Tab turns to page 2 (the founders) and back, H closes it.
            const win = History.chronicleWindow();
            const press = async key => {
                Input._currentState[key] = true;
                await t.waitFrames(2);
                Input._currentState[key] = false;
                await t.waitFrames(2);
            };
            await press("ufChronicle");
            const opened = !!win && win.visible && win.page === 0 && win.pageCount() === 2;
            t.screenshot("chronicle");
            await press("tab");
            const page1 = !!win && win.visible && win.page === 1;
            t.screenshot("chronicle_founders");
            await press("tab");
            const back = !!win && win.visible && win.page === 0;
            await press("ufChronicle");
            const closed = !!win && !win.visible;
            t.check("chronicle_opens", opened && page1 && back && closed,
                `H (Input.keyMapper[72] = "${Input.keyMapper[72]}") opened the chronicle on page 1 of ${win ? win.pageCount() : "?"} (want 2): ${opened}; Tab turned to page 2: ${page1}, back to page 1: ${back}; a second H closed it: ${closed}; year now ${History.currentYear()}`);

            // describe_site: the look label for another faction's camp, for the home, and for a cell with no camp.
            const dOther = otherCamp ? History.describeSite(otherCamp.x, otherCamp.y, siteArea(otherCamp)) : null;
            const dHome = home ? History.describeSite(home.x, home.y, siteArea(home)) : null;
            let freeCell = null;
            for (let x = 0; x < size && !freeCell; x++) if (History.siteAt(x, mid, st.startArea) === null) freeCell = { x, y: mid };
            const dFree = freeCell ? History.describeSite(freeCell.x, freeCell.y, st.startArea) : "no free cell on row " + mid;
            t.check("describe_site", !!otherCamp && !!dOther && dOther.includes(otherCamp.name) && dOther.includes("the camp of") && !!dHome && dHome.includes(home.name) && dHome.includes("your home") && !!freeCell && dFree === null,
                `${otherCamp ? `(${otherCamp.x},${otherCamp.y}): ${JSON.stringify(dOther)}` : "no other camp"}; home: ${JSON.stringify(dHome)}; ${freeCell ? `free cell (${freeCell.x},${freeCell.y}): ${JSON.stringify(dFree)}` : dFree}`);

            // add_event: a play event gets the current year, lands at the end of the chronicle, is found by events() and
            // announced on the bus; an event without text is refused. The test line is taken out again.
            let heard = null;
            const listener = e => { heard = e; };
            if (UF.Events.on) UF.Events.on("history:event", listener);
            const n0 = h.events.length;
            const ev = History.addEvent({ type: "test_event", text: "TEST_event: a check wrote this line.", factions: [pid] });
            const refused = History.addEvent({ type: "test_event" });
            const found = History.events({ type: "test_event" });
            const addOk = !!ev && ev.year === History.currentYear() && ev.year >= 0 && h.events.length === n0 + 1 && h.events[h.events.length - 1] === ev && found.length === 1 && heard === ev && refused === null;
            if (UF.Events.off) UF.Events.off("history:event", listener);
            const at = h.events.indexOf(ev);
            if (at >= 0) h.events.splice(at, 1);
            t.check("add_event", addOk,
                `addEvent gave ${ev ? `{ year ${ev.year}, type ${ev.type}, clock ${JSON.stringify(ev.clock || null)} }` : "null"} (current year ${History.currentYear()}); events ${n0} -> ${n0 + (ev ? 1 : 0)}; events({type}) found ${found.length}; history:event heard: ${heard === ev}; without text: ${refused === null ? "refused" : "ACCEPTED"}`);

            // no_banned_words: every event text, camp name, founder name and founder description.
            const texts = h.events.map(e => e.text).concat(h.sites.map(s => s.name), founderUnits.map(u => u.name), founderUnits.map(u => History.describeUnit(u)));
            const dirty = texts.filter(s => BANNED.test(s));
            t.check("no_banned_words", texts.length > 0 && dirty.length === 0,
                `${texts.length} texts checked (events, camp names, founder names and descriptions); ${dirty.length} with a banned word${dirty.length ? ` (first: "${dirty[0]}")` : ""}`);

            // settle_off: the older generator is switched off in the catalog and wrote nothing, but its code is still here.
            const s0 = regenerate(st, st.seed + 3);
            const diffsWritten = Object.keys(s0.objectDiffs || {}).length;
            t.check("settle_off", flagsOff && typeof History.settle === "function" && !h.settled && !s0.history.settled && diffsWritten === 0,
                `history.simulate ${cfg.simulate}, settleYears ${cfg.settleYears}; the live history has ${h.settled ? "A" : "no"} settling record; a synthetic New Game (seed ${st.seed + 3}) wrote ${diffsWritten} object-diff areas and ${s0.history.settled ? "A" : "no"} settling record; History.settle ${typeof History.settle}`);

            // legacy_switchable: switched on (opts.simulate), the older generator still runs on a synthetic state: years in
            // range, sites for every faction, at least 50 events, and a short settling run.
            const tl = now();
            const s3 = regenerate(st, st.seed + 4, { simulate: true, years: 2 });
            const lh = s3.history;
            const legacyOk = !!lh && lh.years >= cfg.years[0] && lh.years <= cfg.years[1] && lh.events.length >= 50 && s3.factions.list.every(f => lh.sites.some(s => s.faction === f.id)) && !!lh.settled && lh.settled.years === 2;
            t.check("legacy_switchable", legacyOk,
                lh ? `simulate on (seed ${st.seed + 4}): ${lh.years} years, ${lh.sites.length} sites, ${lh.events.length} events, ${(lh.wars || []).length} wars, settling run ${lh.settled ? `${lh.settled.years} years, ${lh.settled.houses} houses` : "MISSING"} (${(now() - tl).toFixed(0)} ms)` : "no history");

            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during history checks");
        });
    }
})();
