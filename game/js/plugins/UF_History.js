//=============================================================================
// UF_History.js - Centuries of simulated history: sites, rulers, wars, ruins, people at the sites
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF History] Simulates 500-600 years of the factions' history from the world seed: sites founded, grown and sacked, rulers, wars, peace, plagues, beasts. The player's home site at the map centre. H = chronicle.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_Factions
 *
 * @help
 * On every New Game, right after UF_Factions rolled the factions, this plugin
 * rolls a length of history from data/UF_WorldCatalog.json ("history.years")
 * and simulates it year by year with a random function seeded from the world
 * seed, so the same seed always gives the same past:
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
 * People (units of kind "person") are spawned at every living site; the
 * home site gets at least 4 (UF_Colonists makes them the colonists).
 *
 * Press H on the map for the chronicle window.
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
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
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
        lastRun: null // { ms, years, factions, sites, events } of the last generate()
    };
    window.UF = window.UF || {};
    window.UF.History = History;

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
        const margin = opts.radius + 2;
        const minStart = sc.minDistanceFromStart || 48;
        const preferred = (sc.preferredBiomes && Array.isArray(sc.preferredBiomes[opts.species])) ? sc.preferredBiomes[opts.species] : null;
        const gx0 = opts.area.x * size, gy0 = opts.area.y * size;
        const discWalkable = (x, y) => {
            const r = opts.radius + 1;
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const info = cellInfo(gx0 + x + dx, gy0 + y + dy);
                    if (info && !info.walkable) return false;
                }
            }
            return true;
        };
        for (let pass = 0; pass < 2; pass++) {
            const wantBiome = pass === 0 ? preferred : null;
            for (let i = 0; i < SITE_TRIES; i++) {
                let x, y;
                if (opts.near) {
                    x = opts.near.x + Math.round((rand() * 2 - 1) * NEW_SITE_REACH);
                    y = opts.near.y + Math.round((rand() * 2 - 1) * NEW_SITE_REACH);
                    if (x < margin || y < margin || x > size - 1 - margin || y > size - 1 - margin) continue;
                } else {
                    x = margin + Math.floor(rand() * (size - 2 * margin));
                    y = margin + Math.floor(rand() * (size - 2 * margin));
                }
                if (opts.start && Math.hypot(x - opts.start.x, y - opts.start.y) < minStart) continue;
                if (sites.some(s => sameArea(s.area, opts.area) && Math.hypot(s.x - x, s.y - y) < MIN_SITE_GAP)) continue;
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
        for (let dy = -HOME_REACH; dy <= HOME_REACH; dy++) {
            for (let dx = -HOME_REACH; dx <= HOME_REACH; dx++) {
                const d = Math.hypot(dx, dy);
                if (d <= HOME_REACH) cells.push({ x: mid + dx, y: mid + dy, d });
            }
        }
        cells.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
        for (const r of [radius + 1, Math.min(radius + 1, 2), 0]) {
            const c = cells.find(c => discWalkable(c.x, c.y, r));
            if (c) {
                const info = cellInfo(gx0 + c.x, gy0 + c.y);
                return { x: c.x, y: c.y, biomeId: info ? info.biomeId : null, clearRadius: r };
            }
        }
        return null;
    }

    //-------------------------------------------------------------------------
    // Generation

    /**
     * Simulate the history into state.history and update state.factions (homes, populations, relations).
     * Deterministic from state.seed. Doesn't spawn people (see spawnPeople).
     */
    History.generate = function(state) {
        const cfg = this.config();
        if (!cfg || !state || !state.factions || !Array.isArray(state.factions.list)) return null;
        return withWorldState(state, () => simulate(state, cfg));
    };

    function simulate(state, cfg) {
        const started = typeof performance !== "undefined" ? performance.now() : Date.now();
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

        const years = range(cfg.years || [500, 600]);
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
                if (rel <= -15 && rand() < (cfg.warChancePerYear || 0)) {
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
        state.history = { version: 2, years, events, sites, rulers, wars, homeSiteId: homeSite ? homeSite.id : null };
        History.lastRun = { ms: (typeof performance !== "undefined" ? performance.now() : Date.now()) - started, years, factions: fx.length, sites: sites.length, events: events.length };
        emit("history:generated", state.history);
        return state.history;
    }

    //-------------------------------------------------------------------------
    // People at the living sites (world units of kind "person")

    /** Spawn peoplePerSite units at every living faction site of the state. Returns the units. */
    History.spawnPeople = function(state) {
        const W = window.UF && UF.World;
        const cfg = this.config();
        const people = (catalog() && catalog().people) || {};
        if (!W || !state || !state.history || W.state !== state) return [];
        const rand = mulberry32(hash32(state.seed, SALT_PEOPLE));
        const range = ([lo, hi]) => lo + Math.floor(rand() * (hi - lo + 1));
        const used = new Set();
        const newName = makeNamer(rand, used);
        const factionOf = id => state.factions.list.find(f => f.id === id) || null;
        const out = [];
        let imageIndex = 0;
        for (const site of state.history.sites) {
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
            // The home site always has at least HOME_MIN_PEOPLE (they become the colonists).
            const rolled = range(perSiteRange());
            const n = Math.min(site.protected ? Math.max(rolled, HOME_MIN_PEOPLE) : rolled, free.length);
            for (let i = 0; i < n; i++) {
                const j = Math.floor(rand() * free.length);
                const cell = free.splice(j, 1)[0];
                const data = { kind: "person", faction: f.id, species: f.species, ai: "wander", home: { x: site.x, y: site.y }, wander: radius + 2, site: site.id };
                if (sp.tint) data.tint = sp.tint;
                out.push(W.addUnit({
                    name: newName(), image: { characterName: images[imageIndex++ % images.length], characterIndex: 0 },
                    area: { x: site.area.x, y: site.area.y }, x: site.x + cell.dx, y: site.y + cell.dy, dir: 2, data
                }));
            }
        }
        return out;
    };

    //-------------------------------------------------------------------------
    // Site layouts (pieces), deterministic per site

    function piecesFor(state, site) {
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
    History.sitesIn = function(ax, ay) {
        const st = window.UF && UF.World && UF.World.state;
        if (!st || !st.history) return [];
        return st.history.sites.filter(s => s.area.x === ax && s.area.y === ay)
            .map(s => Object.assign({}, s, { radius: kindConfig(s.kind).radius || 0, pieces: piecesFor(st, s) }));
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
        return factions.map(f => {
            const sites = h.sites.filter(s => s.faction === f.id);
            const list = h.rulers[f.id] || [];
            const ruler = list[list.length - 1] || null;
            return {
                id: f.id, name: f.name, species: f.species, population: f.population, isPlayer: !!f.isPlayer,
                sites: sites.filter(s => !s.ruined).map(s => ({ id: s.id, name: s.name, kind: s.kind })),
                ruins: sites.filter(s => s.ruined).map(s => ({ id: s.id, name: s.name, year: s.ruined })),
                wars: (h.wars || []).filter(w => w.a === f.id || w.b === f.id).length,
                ruler: ruler ? { name: ruler.name, title: ruler.title, since: ruler.from } : null
            };
        });
    };
    /** The site under a cell of the area on screen (within radius + 1), described for the look label; null if none. */
    History.siteAt = function(x, y, area) {
        const a = area || (window.UF && UF.World ? UF.World.currentArea() : null);
        if (!a) return null;
        for (const s of History.sitesIn(a.x, a.y)) {
            if (Math.max(Math.abs(s.x - x), Math.abs(s.y - y)) <= s.radius + 1) return s;
        }
        return null;
    };
    History.describeSite = function(x, y, area) {
        const s = History.siteAt(x, y, area);
        if (!s) return null;
        if (s.kind === "lair") return `${s.name} (a beast's lair, year ${s.founded})`;
        if (s.ruined) return `Ruins of ${s.name}, once of ${History.factionName(s.faction)} (sacked in year ${s.ruined})`;
        if (s.protected) return `${s.name}, your home ${s.kind} of ${History.factionName(s.faction)} (founded year ${s.founded})`;
        return `${s.name}, a ${s.kind} of ${History.factionName(s.faction)} (founded year ${s.founded})`;
    };

    // New Game: history right after the factions (UF_Factions registered its listener first), then the people.
    if (window.UF.Events && UF.Events.on) {
        UF.Events.on("world:created", state => {
            if (History.generate(state)) History.spawnPeople(state);
        });
    }

    //-------------------------------------------------------------------------
    // Chronicle window (H), the same style as the faction ledger

    class Window_UFChronicle extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this.opacity = 240;
            this.hide();
        }

        refresh() {
            this.contents.clear();
            const w = this.innerWidth;
            const h = History.current();
            let y = 4;
            this.contents.fontSize = 20;
            this.changeTextColor("#f59e0b");
            this.drawText(h ? `Chronicle of ${h.years} years` : "Chronicle", 0, y, w, "center");
            y += 30;
            if (!h) {
                this.contents.fontSize = 14;
                this.changeTextColor("#94a3b8");
                this.drawText("This world has no recorded history.", 0, y, w, "center");
                this.resetTextColor();
                return;
            }
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
            const room = Math.max(0, Math.floor((this.innerHeight - y - 20) / 16));
            const recent = h.events.slice(-Math.min(20, room));
            for (const e of recent) {
                this.changeTextColor("#38bdf8");
                this.drawText(`Year ${e.year}`, 12, y, 60, "left");
                this.changeTextColor("#e2e8f0");
                this.drawText(e.text, 76, y, w - 88, "left");
                y += 16;
            }
            this.changeTextColor("#64748b");
            this.drawText("Press H to close.", 0, this.innerHeight - 18, w, "center");
            this.resetTextColor();
        }
    }
    History.ChronicleWindow = Window_UFChronicle;

    History.chronicleWindow = () => (SceneManager._scene && SceneManager._scene._ufChronicleWindow) || null;
    History.toggleChronicle = function() {
        const win = this.chronicleWindow();
        if (!win) return false;
        if (win.visible) win.hide();
        else {
            win.refresh();
            win.show();
        }
        return win.visible;
    };

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        const ww = Math.min(Graphics.boxWidth - 16, 780), wh = Math.min(Graphics.boxHeight - 16, 560);
        this._ufChronicleWindow = new Window_UFChronicle(new Rectangle((Graphics.boxWidth - ww) / 2, (Graphics.boxHeight - wh) / 2, ww, wh));
        this.addChild(this._ufChronicleWindow);
    };

    Input.keyMapper[72] = "ufChronicle"; // H
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (Input.isTriggered("ufChronicle")) History.toggleChronicle();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "history"), registered at boot after all plugins load

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        // Words from the reference games and product-identity creatures that must never reach the player (AGENTS.md).
        const BANNED = /\b(avatar|britannia|guardian|lord british|iolo|dupre|shamino|fellowship|moongate|urist|armok|strange mood|fey mood|dwarf fortress|ultima|beholder|mind flayer|illithid|displacer beast|githyanki)\b/i;
        const sig = h => JSON.stringify({ years: h.years, events: h.events, sites: h.sites, rulers: h.rulers });
        const syntheticState = (st, seed) => ({ seed, size: st.size, areasX: st.areasX, areasY: st.areasY, startArea: { x: st.startArea.x, y: st.startArea.y }, units: {}, nextUnitId: 1, diffs: {}, objectDiffs: {} });
        const regenerate = (st, seed) => {
            const s2 = syntheticState(st, seed);
            UF.Factions.generate(s2);
            History.generate(s2);
            return s2;
        };

        UF.Test.suite("history", async t => {
            const W = UF.World, st = W && W.state;
            const h = st && st.history;
            const cfg = History.config(), sc = History.sitesConfig();
            t.check("generated_with_world", !!cfg && !!sc && !!h && Array.isArray(h.events) && Array.isArray(h.sites),
                h ? `${h.years} years, ${h.events.length} events, ${h.sites.length} sites, seed ${st.seed} (${History.lastRun ? History.lastRun.ms.toFixed(0) + " ms" : "time unknown"})` : "no history in the world state");
            if (!h) return;
            const factions = UF.Factions.all(); // every faction is a generated one, the player's included
            const size = st.size, mid = Math.floor(size / 2);
            const homeOf = s2 => (s2.history && s2.history.sites.find(s => s.protected && s.faction === s2.factions.playerId)) || null;
            const otherState = regenerate(st, st.seed + 1), thirdState = regenerate(st, st.seed + 2);
            const other = otherState.history;

            // The view starts on the home site; a look at it before anything moves the view.
            t.screenshot("home_site");

            // player_faction: the player's faction is a generated one; its home site is alive at the map centre, never
            // sacked over three seeds; the view started on it (state.viewStart and the RMMZ player).
            const pid = st.factions.playerId;
            const player = UF.Factions.player();
            const home = homeOf(st);
            const homeDist = home ? Math.hypot(home.x - mid, home.y - mid) : Infinity;
            const homeAlive = !!home && !home.ruined && home.kind !== "ruin" && sameArea(home.area, st.startArea);
            const sackedHome = home ? h.events.filter(e => e.type === "sack" && e.site === home.id).length : 0;
            const runs3 = [{ seed: st.seed, s: st }, { seed: st.seed + 1, s: otherState }, { seed: st.seed + 2, s: thirdState }];
            const badRuns = runs3.filter(r => {
                const hs = homeOf(r.s);
                return !hs || hs.ruined || hs.kind === "ruin" || Math.hypot(hs.x - mid, hs.y - mid) > HOME_REACH
                    || r.s.history.events.some(e => e.type === "sack" && e.site === hs.id) || !r.s.viewStart || r.s.viewStart.x !== hs.x || r.s.viewStart.y !== hs.y;
            });
            const vs = st.viewStart;
            const viewOnHome = !!vs && !!home && vs.x === home.x && vs.y === home.y;
            const playerNear = !!home && sameArea(W.currentArea(), home.area) && Math.hypot($gamePlayer.x - home.x, $gamePlayer.y - home.y) <= 6;
            const homeIsFactionHome = !!home && !!player && player.home && player.home.x === home.x && player.home.y === home.y;
            t.check("player_faction", !!player && player.id === pid && player.isPlayer && factions.includes(player) && homeAlive && homeDist <= HOME_REACH
                && sackedHome === 0 && badRuns.length === 0 && viewOnHome && playerNear && homeIsFactionHome && h.homeSiteId === home.id,
                `playerId ${pid} = ${player ? `${player.name} (${player.species}, isPlayer ${player.isPlayer})` : "NO FACTION"}; home site ${home ? `${home.name} (${home.kind}, id ${home.id}) at (${home.x},${home.y}), ${homeDist.toFixed(1)} cells from the centre (want <= ${HOME_REACH}), ${home.ruined ? `RUINED in ${home.ruined}` : "alive"}, ${sackedHome} sack events` : "NONE"}; `
                + `faction.home on it: ${homeIsFactionHome}; viewStart ${vs ? `(${vs.x},${vs.y})` : "unset"} ${viewOnHome ? "matches" : "DOES NOT match"}; the view (${$gamePlayer.x},${$gamePlayer.y}) ${playerNear ? "is on" : "is NOT on"} the home; `
                + `seeds ${runs3.map(r => r.seed).join("/")}: ${badRuns.length ? `home not alive at the centre for seed ${badRuns.map(r => r.seed).join(", ")}` : "home alive at the centre and unsacked in all three"}`);

            // simulated: years in range and differing by seed, enough events, clean text, a year-0 founding per faction.
            const [ymin, ymax] = cfg.years;
            const dirty = h.events.filter(e => BANNED.test(e.text)).concat(h.sites.filter(s => BANNED.test(s.name)).map(s => ({ text: s.name })));
            const noFounding = factions.filter(f => !h.events.some(e => e.year === 0 && e.type === "founding" && e.factions.includes(f.id)));
            const differs = sig(other) !== sig(h);
            t.check("simulated", h.years >= ymin && h.years <= ymax && differs && h.events.length >= 50 && dirty.length === 0 && noFounding.length === 0,
                `${h.years} years (allowed ${ymin}-${ymax}; seed+1 gives ${other.years} years and ${differs ? "a different" : "THE SAME"} history), ${h.events.length} events (want >= 50), `
                + `${dirty.length} texts with banned words${dirty.length ? ` (first: "${dirty[0].text}")` : ""}, `
                + `${noFounding.length ? `no year-0 founding for ${noFounding.map(f => f.name).join(", ")}` : `year-0 founding for all ${factions.length} factions`}`);

            // sites_placed
            const without = factions.filter(f => !h.sites.some(s => s.faction === f.id));
            const notWalkable = h.sites.filter(s => { const c = UF.WorldGen.cellInfoLocal(s.area.x, s.area.y, s.x, s.y); return c && !c.walkable; });
            // Every site but the player's home keeps minDistanceFromStart; every site keeps 24 cells from the others.
            const others = h.sites.filter(s => !s.protected);
            const tooNear = others.filter(s => W.isStartArea(s.area.x, s.area.y) && Math.hypot(s.x - mid, s.y - mid) < sc.minDistanceFromStart);
            const crowded = h.sites.filter(s => h.sites.some(o => o !== s && sameArea(o.area, s.area) && Math.hypot(o.x - s.x, o.y - s.y) < MIN_SITE_GAP));
            const badHome = factions.filter(f => !h.sites.some(s => s.faction === f.id && !s.ruined && s.x === f.home.x && s.y === f.home.y && sameArea(s.area, f.home.area)));
            const nearest = others.reduce((m, s) => Math.min(m, W.isStartArea(s.area.x, s.area.y) ? Math.hypot(s.x - mid, s.y - mid) : Infinity), Infinity);
            const kinds = {};
            for (const s of h.sites) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
            t.check("sites_placed", without.length === 0 && notWalkable.length === 0 && tooNear.length === 0 && crowded.length === 0 && badHome.length === 0 && others.length === h.sites.length - 1,
                `${h.sites.length} sites (${Object.entries(kinds).map(([k, v]) => `${v} ${k}`).join(", ")}), ${h.sites.length - others.length} protected (want 1); factions without a site: ${without.map(f => f.name).join(", ") || "none"}; `
                + `on unwalkable cells: ${notWalkable.length}; other sites within ${sc.minDistanceFromStart} of the start: ${tooNear.length} (nearest ${nearest === Infinity ? "n/a" : nearest.toFixed(1)}); `
                + `sites closer than ${MIN_SITE_GAP} to another: ${crowded.length}; homes not on a living site: ${badHome.map(f => f.name).join(", ") || "none"}`);

            // wars_and_ruins over three seeds
            const runs = [h, other, thirdState.history];
            const warsIn = x => (x.wars || []).length, ruinsIn = x => x.sites.filter(s => s.ruined).length;
            const totalWars = runs.reduce((n, x) => n + warsIn(x), 0), totalRuins = runs.reduce((n, x) => n + ruinsIn(x), 0);
            t.check("wars_and_ruins", totalWars >= 1 && totalRuins >= 1,
                `seeds ${st.seed}, +1, +2: wars ${runs.map(warsIn).join("/")}, ruins ${runs.map(ruinsIn).join("/")} (want at least one of each over the three)`);

            // deterministic: the same seed from a fresh synthetic state gives the same history and relations.
            const again = regenerate(st, st.seed);
            t.check("deterministic", sig(again.history) === sig(h) && JSON.stringify(again.factions.relations) === JSON.stringify(st.factions.relations),
                `regenerated from seed ${st.seed}: history ${sig(again.history) === sig(h) ? "identical" : "DIFFERENT"}, relations ${JSON.stringify(again.factions.relations) === JSON.stringify(st.factions.relations) ? "identical" : "DIFFERENT"}`);

            // saved
            const saved = JsonEx.parse(JsonEx.stringify(st));
            t.check("saved", !!saved.history && sig(saved.history) === sig(h), `history round-trips through the save format (${JsonEx.stringify(h).length} bytes)`);

            // stamped_in_world: the ring of the first non-lair site that isn't the home (the home is checked on
            // screen below) is in the built area's object grid.
            const site = h.sites.find(s => s.kind !== "lair" && !s.protected) || h.sites.find(s => s.kind !== "lair") || h.sites[0];
            if (site) {
                const layout = History.sitesIn(site.area.x, site.area.y).find(s => s.id === site.id);
                const map = W.buildArea(site.area.x, site.area.y);
                const objects = catalog().objects;
                const typeIdOf = id => objects.findIndex(o => o.id === id) + 1;
                let hits = 0, expected = 0, first = "";
                for (const p of layout.pieces) {
                    const x = site.x + p.dx, y = site.y + p.dy;
                    if (x < 0 || y < 0 || x >= size || y >= size) continue;
                    expected++;
                    if (map.ufObjects[y * size + x] === typeIdOf(p.object)) hits++;
                    else if (!first) first = `(${x},${y}) has type ${map.ufObjects[y * size + x]}, wanted ${p.object} = ${typeIdOf(p.object)}`;
                }
                const ring = kindConfig(site.kind).ring;
                t.check("stamped_in_world", expected > 0 && hits === expected && layout.pieces.some(p => p.object === ring),
                    `${site.name} (${site.kind}, radius ${layout.radius}) at (${site.x},${site.y}) in area (${site.area.x},${site.area.y}): ${hits} of ${expected} pieces in ufObjects, ring ${ring}${first ? `; first miss ${first}` : ""}`);
            } else {
                t.check("stamped_in_world", false, "no site to stamp");
            }

            // people_at_sites
            const living = h.sites.filter(s => !s.ruined && s.kind !== "lair");
            const people = W.units().filter(u => u.data && u.data.kind === "person");
            const perSite = living.map(s => people.filter(u => sameArea(u.area, s.area) && Math.max(Math.abs(u.x - s.x), Math.abs(u.y - s.y)) <= kindConfig(s.kind).radius + 2).length);
            const minPeople = perSiteRange()[0];
            const empty = living.filter((s, i) => perSite[i] < minPeople);
            const badFaction = people.filter(u => !factions.some(f => f.id === u.data.faction));
            const noImage = people.filter(u => !u.image.characterName);
            // The home site has at least max(peoplePerSite[0], 4) people of the player's faction (the colonists to be).
            const homeMin = Math.max(minPeople, HOME_MIN_PEOPLE);
            const atHome = home ? people.filter(u => u.data.faction === pid && sameArea(u.area, home.area) && Math.max(Math.abs(u.x - home.x), Math.abs(u.y - home.y)) <= kindConfig(home.kind).radius + 2).length : 0;
            t.check("people_at_sites", living.length > 0 && people.length > 0 && empty.length === 0 && badFaction.length === 0 && noImage.length === 0 && atHome >= homeMin,
                `${people.length} person units at ${living.length} living sites (${perSite.join("/")} each, want >= ${minPeople}); sites short: ${empty.map(s => s.name).join(", ") || "none"}; `
                + `with an unknown faction: ${badFaction.length}; without an image: ${noImage.length}; ${atHome} people of ${pid} at the home site (want >= ${homeMin})`);

            // A look at another site on screen (evidence for the report), then the view goes back to the home.
            const shown = h.sites.find(s => s.kind !== "lair" && !s.ruined && !s.protected && sameArea(s.area, W.currentArea())) || site;
            if (shown && sameArea(shown.area, W.currentArea())) {
                $gamePlayer.locate(shown.x, shown.y);
                await t.waitFrames(30);
                t.screenshot("site_in_view");
                $gamePlayer.locate(home ? home.x : mid, home ? home.y : mid);
                await t.waitFrames(5);
            }

            // chronicle_opens: press H (Input state), see the window, screenshot, press H again.
            const win = History.chronicleWindow();
            Input._currentState.ufChronicle = true;
            await t.waitFrames(2);
            Input._currentState.ufChronicle = false;
            await t.waitFrames(2);
            const opened = !!win && win.visible;
            t.screenshot("chronicle");
            Input._currentState.ufChronicle = true;
            await t.waitFrames(2);
            Input._currentState.ufChronicle = false;
            await t.waitFrames(2);
            const closed = !!win && !win.visible;
            t.check("chronicle_opens", opened && closed, `H (Input.keyMapper[72] = "${Input.keyMapper[72]}") opened the chronicle: ${opened}; a second H closed it: ${closed}`);

            // describe_site: the look label text for a site cell, for the map centre (the home), and for a cell with no site.
            const d = site ? History.describeSite(site.x, site.y, site.area) : null;
            const dHome = History.describeSite(mid, mid, st.startArea);
            let freeCell = null;
            for (let x = 0; x < size && !freeCell; x++) if (History.siteAt(x, mid, st.startArea) === null) freeCell = { x, y: mid };
            const dFree = freeCell ? History.describeSite(freeCell.x, freeCell.y, st.startArea) : "no free cell on row " + mid;
            t.check("describe_site", !!site && !!d && d.includes(site.name) && !!home && !!dHome && dHome.includes(home.name) && dHome.includes("your home") && !!freeCell && dFree === null,
                `${site ? `"${d}" for (${site.x},${site.y})` : "no site"}; centre (${mid},${mid}): ${JSON.stringify(dHome)}; ${freeCell ? `free cell (${freeCell.x},${freeCell.y}): ${JSON.stringify(dFree)}` : dFree}`);

            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during history checks");
        });
    }
})();
