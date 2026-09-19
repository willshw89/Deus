//=============================================================================
// UF_Factions.js - Factions rolled from the world seed on every New Game
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Factions] Factions generated from the world seed each New Game: species, stances, relations from allied to at war, and each faction's own area on habitable land. F = ledger.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_WorldGen
 *
 * @help
 * Every New Game rolls a new set of factions from the world seed, using the
 * "factions" section of data/UF_WorldCatalog.json: species, stances, name
 * syllables, counts. One of them, of a playable species, is the player's
 * (state.factions.playerId); "player" is accepted everywhere as its alias.
 *
 * Each pair of factions has a relation from -100 (at war) to +100 (allied).
 * Every world has at least one strong alliance and one serious hostility.
 *
 * Every faction gets its own area (user decision 2026-09-19: no history, each
 * faction starts as two men and two women dropped into its area): a centre on
 * walkable, habitable land (factions.areas in the catalog), the player's at
 * the map centre, every other at least 40 cells from every centre and 12 from
 * the map edge, in a biome its species prefers with drinkable water within
 * reach when the map has such a place. Seeded, so the same seed gives the
 * same areas. The centres are faction.home; the view starts on the player's.
 * Everything is saved with the world.
 *
 * Press F on the map for the faction ledger.
 *
 * API and checks: docs/systems/UF_Factions.md
 * Replaced core methods: none (aliases only).
 * Replaces the earlier draft (5 fixed factions, commit a09d3fd/3f687a0);
 * window.$factionManager is kept as a thin compatibility layer.
 */

(() => {
    "use strict";

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
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
    const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };

    const TIERS = [
        { id: "allied", label: "Allied", min: 50, color: "#22c55e" },
        { id: "friendly", label: "Friendly", min: 15, color: "#60a5fa" },
        { id: "neutral", label: "Neutral", min: -14, color: "#e2e8f0" },
        { id: "hostile", label: "Hostile", min: -49, color: "#f59e0b" },
        { id: "war", label: "At war", min: -100, color: "#ef4444" }
    ];
    const COLORS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#22d3ee", "#a3e635", "#fb923c", "#e879f9"];

    //-------------------------------------------------------------------------
    // Generation

    const Factions = {
        TIERS,
        config: () => (window.$ufWorldCatalog && $ufWorldCatalog.factions) || null
    };
    window.UF = window.UF || {};
    window.UF.Factions = Factions;

    /** Roll factions from state.seed into state.factions (deterministic: same seed, same factions). */
    Factions.generate = function(state) {
        const cfg = this.config();
        if (!cfg || !state) return null;
        const rand = mulberry32(hash32(state.seed, 0xfac7));
        const pick = arr => arr[Math.floor(rand() * arr.length)];
        const weighted = items => {
            let r = rand() * items.reduce((s, it) => s + (it.weight || 1), 0);
            for (const it of items) {
                r -= it.weight || 1;
                if (r <= 0) return it;
            }
            return items[items.length - 1];
        };
        const size = state.size;
        const [cmin, cmax] = cfg.count || [4, 7];
        const count = cmin + Math.floor(rand() * (cmax - cmin + 1));
        const usedNames = new Set();
        const makeName = sp => {
            for (let i = 0; i < 30; i++) {
                const stem = capitalize(pick(cfg.names.start) + (rand() < 0.45 ? pick(cfg.names.start) : "") + pick(cfg.names.end));
                const full = `The ${stem} ${pick(sp.groups && sp.groups.length ? sp.groups : ["Folk"])}`;
                if (!usedNames.has(full)) {
                    usedNames.add(full);
                    return full;
                }
            }
            return `The ${sp.name} of ${usedNames.size}`;
        };

        // Every faction is a generated one; the player's is picked from them below (user decision 2026-09-18).
        const list = [];
        const oneArea = state.areasX * state.areasY === 1;
        const usedHomes = new Set([`${state.startArea.x},${state.startArea.y}`]);
        const founders = foundersCount();
        for (let i = 0; i < count; i++) {
            const sp = weighted(cfg.species);
            const ethos = [pick(cfg.ethos).id];
            if (rand() < 0.4) {
                const second = pick(cfg.ethos).id;
                if (!ethos.includes(second)) ethos.push(second);
            }
            // The area of the world the faction lives in: the start area in a one-area world, else a rolled one
            // (the player's moves to the start area below). placeAreas picks the centre inside it.
            let area = oneArea ? { x: state.startArea.x, y: state.startArea.y } : null;
            for (let t = 0; t < 100 && !area; t++) {
                const ax = Math.floor(rand() * state.areasX), ay = Math.floor(rand() * state.areasY);
                const key = `${ax},${ay}`;
                if (usedHomes.has(key) || (ax === state.startArea.x && ay === state.startArea.y)) continue;
                usedHomes.add(key);
                area = { x: ax, y: ay };
            }
            if (!area) area = { x: (state.startArea.x + 1 + i) % state.areasX, y: (state.startArea.y + 1) % state.areasY };
            list.push({
                id: `f${i + 1}`,
                name: makeName(sp),
                species: sp.id,
                ethos,
                home: { area, x: Math.floor(size / 2), y: Math.floor(size / 2) }, // the centre is set by placeAreas
                color: COLORS[i % COLORS.length],
                isPlayer: false,
                met: false,
                population: founders // every faction starts as its founders (VISION V4, 2026-09-19)
            });
        }

        // Relations: species affinity + both sides' stances + chance.
        const aff = cfg.speciesAffinity || {};
        const speciesTerm = (a, b) => (a === b ? (cfg.sameSpecies || 0) : (aff[`${a}|${b}`] !== undefined ? aff[`${a}|${b}`] : (aff[`${b}|${a}`] || 0)));
        const ethosById = {};
        for (const e of cfg.ethos) ethosById[e.id] = e;
        const stanceTerm = (A, B) => A.ethos.reduce((v, id) => {
            const e = ethosById[id];
            return e ? v + (e.toAll || 0) + (B.ethos.includes(id) ? (e.toSame || 0) : 0) : v;
        }, 0);
        const spread = cfg.randomSpread !== undefined ? cfg.randomSpread : 30;
        const relations = {};
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                const A = list[i], B = list[j];
                const v = speciesTerm(A.species, B.species) + stanceTerm(A, B) + stanceTerm(B, A) + (rand() * 2 - 1) * spread;
                relations[pairKey(A.id, B.id)] = clamp(Math.round(v), -100, 100);
            }
        }
        // Every world has some alignment and some hostility (VISION V18).
        const keys = Object.keys(relations);
        if (keys.length >= 2) {
            if (!keys.some(k => relations[k] >= 40)) {
                const best = keys.reduce((a, b) => (relations[a] >= relations[b] ? a : b));
                relations[best] = 60;
            }
            if (!keys.some(k => relations[k] <= -40)) {
                const worst = keys.filter(k => relations[k] < 40).reduce((a, b) => (relations[a] <= relations[b] ? a : b));
                relations[worst] = -60;
            }
        }
        // The player's faction: one of the generated ones, of a playable species when there is one (user decision
        // 2026-09-18). Its area is at the map centre (placeAreas); UF_Colonists turns its founders into the colonists.
        const playable = list.filter(f => {
            const sp = cfg.species.find(s => s.id === f.species);
            return !sp || sp.playable !== false;
        });
        const pool = playable.length ? playable : list;
        const player = pool[Math.floor(rand() * pool.length)];
        for (const f of list) f.isPlayer = f === player;
        player.met = true;
        player.color = "#4ade80";
        player.home.area = { x: state.startArea.x, y: state.startArea.y };
        state.factions = { version: 3, list, relations, log: [], playerId: player.id };
        Factions.placeAreas(state);
        emit("factions:generated", state.factions);
        return state.factions;
    };

    //-------------------------------------------------------------------------
    // Areas (VISION V4 and V31, revised by the user 2026-09-19: "no history, just start by dropping 2 males and 2
    // females into each faction area"). Every faction's area centre stands on habitable land: the player's at the map
    // centre (the habitable start), every other one spread apart. Seeded from the world seed (never Math.random) and
    // separate from the roll above, so the terrain never changes a faction's name or relations.

    const AREA_DEFAULTS = { minGap: 40, edgeMargin: 12, playerReach: 6, clearDisc: 5, cursedOk: [] };
    const WATER_DEFAULTS = { reach: 30, kinds: ["fresh", "pond", "icy", "marsh", "swamp"] };
    const AREA_STEP = 3;      // the coarse grid of candidate centres and water samples: a river is at least 3 cells wide, so every one crosses a sampled column
    const AREA_ATTEMPTS = 16; // seeded restarts when a greedy pass boxes a faction in
    const SALT_AREAS = 0xa7ea;
    const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
    const catalogOf = () => window.$ufWorldCatalog || null;
    function foundersCount() {
        const c = Factions.config();
        const f = (c && c.founders) || {};
        return (f.male !== undefined ? f.male | 0 : 2) + (f.female !== undefined ? f.female | 0 : 2);
    }
    /** catalog factions.areas with defaults. */
    Factions.areasConfig = () => Object.assign({}, AREA_DEFAULTS, (Factions.config() && Factions.config().areas) || {});
    /** catalog start.kit.water with defaults: drinkable water kinds and the reach an area centre wants them within. */
    Factions.waterConfig = () => {
        const c = catalogOf();
        return Object.assign({}, WATER_DEFAULTS, (c && c.start && c.start.kit && c.start.kit.water) || {});
    };
    /** { ms, attempts, relaxed, cells } of the last placeAreas. */
    Factions.lastAreas = null;

    // UF.WorldGen reads UF.World.state, so a synthetic state (tests, other seeds) is swapped in for the call.
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

    // (info, species) => true for a cell a faction may settle on: walkable land (no water, no peak rock, no ground kind
    // with passable false), not in a cursed region unless the species is in areas.cursedOk. The catalog's regions don't
    // mark species as good or evil, so by default no species settles cursed land.
    function makeHabitable() {
        const cat = catalogOf();
        const blocked = new Set((cat && Array.isArray(cat.groundKinds) ? cat.groundKinds : []).filter(g => g.passable === false).map(g => g.id));
        const cursedOk = new Set(Factions.areasConfig().cursedOk || []);
        return (info, species) => !!info && info.walkable && !info.peak && !info.water && !blocked.has(info.ground)
            && !(info.region && info.region.alignment === "cursed" && !cursedOk.has(species));
    }
    /** True for a cell (a UF.WorldGen.cellInfo result) a faction of `species` may settle on. */
    Factions.habitable = (info, species) => makeHabitable()(info, species);

    /**
     * Place every faction's area centre in state.factions (faction.home = { area: {x, y}, x, y }, faction.areaInfo =
     * { biome, water, rule, disc }) and set state.viewStart to the player's. Returns the list, or null without UF_WorldGen.
     */
    Factions.placeAreas = function(state) {
        const F = state && state.factions;
        const WG = window.UF && UF.WorldGen;
        if (!F || !Array.isArray(F.list) || !WG || typeof WG.cellInfo !== "function" || !catalogOf()) return null;
        return withWorldState(state, () => placeAreas(state, F));
    };

    function placeAreas(state, F) {
        const t0 = now();
        const WG = UF.WorldGen;
        const acfg = Factions.areasConfig(), wcfg = Factions.waterConfig();
        const size = state.size, mid = Math.floor(size / 2);
        const cat = catalogOf();
        const preferredOf = sp => {
            const p = cat.sites && cat.sites.preferredBiomes && cat.sites.preferredBiomes[sp];
            return Array.isArray(p) ? p : null;
        };
        const drinkable = new Set(wcfg.kinds || []);
        const reach = Math.max(0, wcfg.reach | 0);
        const habitable = makeHabitable();
        let cells = 0;
        const infoAt = (area, x, y) => { cells++; return WG.cellInfo(area.x * size + x, area.y * size + y); };

        // One coarse grid per area: every AREA_STEP cells, the cell's info and a chamfer distance to drinkable water.
        const grids = new Map();
        const gridOf = area => {
            const key = `${area.x},${area.y}`;
            let g = grids.get(key);
            if (g) return g;
            const n = Math.floor((size - 1) / AREA_STEP) + 1;
            const infos = new Array(n * n);
            const dist = new Float64Array(n * n).fill(1e9);
            for (let j = 0; j < n; j++) {
                for (let i = 0; i < n; i++) {
                    const info = infoAt(area, i * AREA_STEP, j * AREA_STEP);
                    infos[j * n + i] = info;
                    if (info && info.water && drinkable.has(info.water)) dist[j * n + i] = 0;
                }
            }
            // Two-pass 3-4 chamfer transform: dist / 3 * AREA_STEP approximates the distance in cells.
            const relax = (i, j, di, dj, w) => {
                const a = i + di, b = j + dj;
                if (a < 0 || b < 0 || a >= n || b >= n) return;
                const v = dist[b * n + a] + w;
                if (v < dist[j * n + i]) dist[j * n + i] = v;
            };
            for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { relax(i, j, -1, 0, 3); relax(i, j, -1, -1, 4); relax(i, j, 0, -1, 3); relax(i, j, 1, -1, 4); }
            for (let j = n - 1; j >= 0; j--) for (let i = n - 1; i >= 0; i--) { relax(i, j, 1, 0, 3); relax(i, j, 1, 1, 4); relax(i, j, 0, 1, 3); relax(i, j, -1, 1, 4); }
            g = { area, n, infos, water: i => (dist[i] >= 1e9 ? Infinity : (dist[i] / 3) * AREA_STEP), disc: new Map() };
            grids.set(key, g);
            return g;
        };
        // Every cell within radius r (euclidean) of (x, y) is walkable land.
        const discOk = (g, x, y, r) => {
            const key = `${x},${y},${r}`;
            if (g.disc.has(key)) return g.disc.get(key);
            let ok = true;
            for (let dy = -r; dy <= r && ok; dy++) {
                for (let dx = -r; dx <= r && ok; dx++) {
                    if (dx * dx + dy * dy > r * r) continue;
                    const x2 = x + dx, y2 = y + dy;
                    if (x2 < 0 || y2 < 0 || x2 >= size || y2 >= size) { ok = false; break; }
                    const info = infoAt(g.area, x2, y2);
                    if (!info || !info.walkable || info.peak) ok = false;
                }
            }
            g.disc.set(key, ok);
            return ok;
        };

        const player = F.list.find(f => f.id === F.playerId) || F.list[0];
        const others = F.list.filter(f => f !== player);
        const sameArea = (a, b) => a.x === b.x && a.y === b.y;

        // The player's: the habitable cell nearest the map centre (within playerReach) whose disc is walkable; failing
        // that a smaller disc, failing that any habitable cell there. No random numbers: a function of the terrain only.
        const pArea = { x: state.startArea.x, y: state.startArea.y };
        const pGrid = gridOf(pArea);
        const near = [];
        for (let dy = -acfg.playerReach; dy <= acfg.playerReach; dy++) {
            for (let dx = -acfg.playerReach; dx <= acfg.playerReach; dx++) {
                const d = Math.hypot(dx, dy);
                if (d <= acfg.playerReach) near.push({ x: mid + dx, y: mid + dy, d });
            }
        }
        near.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
        let pCell = null;
        for (const r of [acfg.clearDisc, Math.min(acfg.clearDisc, 2), 0]) {
            pCell = near.find(c => habitable(infoAt(pArea, c.x, c.y), player.species) && discOk(pGrid, c.x, c.y, r));
            if (pCell) { pCell = { x: pCell.x, y: pCell.y, disc: r }; break; }
        }
        if (!pCell) pCell = { x: mid, y: mid, disc: -1 }; // never seen: the start climate keeps the centre habitable
        const pInfo = infoAt(pArea, pCell.x, pCell.y);
        const pWater = pGrid.water(Math.round(pCell.y / AREA_STEP) * pGrid.n + Math.round(pCell.x / AREA_STEP));
        player.home = { area: pArea, x: pCell.x, y: pCell.y };
        player.areaInfo = { biome: pInfo ? pInfo.biomeId : null, water: Math.round(pWater), rule: "centre", disc: pCell.disc };

        // Everyone else: seeded picks among the coarse cells that keep every rule, the strictest rule first
        // (preferred biome and water, then water, then the biome, then any habitable cell). A greedy pass can box the
        // last faction in; then the whole pass restarts with the next seeded stream, and after AREA_ATTEMPTS the gap is
        // relaxed step by step (recorded, and the factions.areas check fails on it).
        const RULES = [
            { id: "preferred+water", biome: true, water: true },
            { id: "water", biome: false, water: true },
            { id: "preferred", biome: true, water: false },
            { id: "habitable", biome: false, water: false }
        ];
        const margin = acfg.edgeMargin;
        const tryPlace = (rand, gap) => {
            const placed = [{ area: pArea, x: pCell.x, y: pCell.y }];
            const out = [];
            for (const f of others) {
                const area = f.home && f.home.area ? { x: f.home.area.x, y: f.home.area.y } : pArea;
                const g = gridOf(area);
                const pref = preferredOf(f.species);
                const base = [];
                for (let j = 0; j < g.n; j++) {
                    for (let i = 0; i < g.n; i++) {
                        const x = i * AREA_STEP, y = j * AREA_STEP;
                        if (x < margin || y < margin || x > size - 1 - margin || y > size - 1 - margin) continue;
                        const info = g.infos[j * g.n + i];
                        if (!habitable(info, f.species)) continue;
                        if (placed.some(p => sameArea(p.area, area) && Math.hypot(p.x - x, p.y - y) < gap)) continue;
                        base.push({ x, y, info, water: g.water(j * g.n + i) });
                    }
                }
                let chosen = null;
                for (const rule of RULES) {
                    if (rule.biome && !pref) continue;
                    const pool = base.filter(c => (!rule.biome || pref.includes(c.info.biomeId)) && (!rule.water || c.water <= reach - AREA_STEP));
                    while (pool.length && !chosen) {
                        const k = Math.floor(rand() * pool.length);
                        const c = pool[k];
                        if (discOk(g, c.x, c.y, acfg.clearDisc)) chosen = { c, rule: rule.id, disc: acfg.clearDisc };
                        else pool.splice(k, 1);
                    }
                    if (chosen) break;
                }
                if (!chosen) return null;
                placed.push({ area, x: chosen.c.x, y: chosen.c.y });
                out.push({ f, area, x: chosen.c.x, y: chosen.c.y, info: chosen.c.info, water: chosen.c.water, rule: chosen.rule, disc: chosen.disc });
            }
            return out;
        };
        let result = null, attempts = 0, gap = acfg.minGap, relaxed = false;
        while (!result) {
            for (let a = 0; a < AREA_ATTEMPTS && !result; a++) {
                attempts++;
                result = tryPlace(mulberry32(hash32(state.seed, SALT_AREAS, attempts)), gap);
            }
            if (!result) {
                if (gap <= 8) break;
                gap = Math.floor(gap * 0.8);
                relaxed = true;
            }
        }
        for (const r of result || []) {
            r.f.home = { area: r.area, x: r.x, y: r.y };
            r.f.areaInfo = { biome: r.info ? r.info.biomeId : null, water: Number.isFinite(r.water) ? Math.round(r.water) : null, rule: r.rule, disc: r.disc };
            if (relaxed) r.f.areaInfo.gap = gap;
        }
        if (!result) for (const f of others) f.areaInfo = { biome: null, water: null, rule: "none", disc: -1 }; // no land at all (never seen)
        state.viewStart = { x: pCell.x, y: pCell.y };
        Factions.lastAreas = { ms: now() - t0, attempts, relaxed, gap, cells };
        return F.list;
    }

    //-------------------------------------------------------------------------
    // Queries and changes

    const data = () => {
        const W = window.UF && UF.World;
        if (!W || !W.state) return null;
        if (!W.state.factions) Factions.generate(W.state); // e.g. a save from before factions existed
        return W.state.factions;
    };
    Factions.state = data;
    Factions.all = () => (data() ? data().list : []);
    /** The player's faction id ("player" is accepted everywhere as an alias for it). */
    Factions.playerId = () => (data() ? data().playerId : null);
    const resolve = id => (id === "player" ? Factions.playerId() : id);
    Factions.get = id => Factions.all().find(f => f.id === resolve(id)) || null;
    Factions.player = () => Factions.get("player");
    Factions.relation = (a, b) => {
        a = resolve(a);
        b = resolve(b);
        if (a === b) return 100;
        const d = data();
        return d && d.relations[pairKey(a, b)] !== undefined ? d.relations[pairKey(a, b)] : 0;
    };
    Factions.tierOf = value => TIERS.find(t => value >= t.min) || TIERS[TIERS.length - 1];
    Factions.tierBetween = (a, b) => Factions.tierOf(Factions.relation(a, b));
    Factions.setRelation = function(a, b, value, reason = "") {
        const d = data();
        a = resolve(a);
        b = resolve(b);
        if (!d || a === b) return;
        const before = this.relation(a, b);
        const after = clamp(Math.round(value), -100, 100);
        d.relations[pairKey(a, b)] = after;
        d.log.push({ a, b, before, after, reason, day: window.$ufTime ? $ufTime.dateString : "" });
        if (d.log.length > 200) d.log.shift();
        emit("factions:relationChanged", a, b, before, after, reason);
    };
    Factions.adjust = function(a, b, delta, reason = "") {
        this.setRelation(a, b, this.relation(a, b) + delta, reason);
    };
    Factions.alliesOf = id => Factions.all().filter(f => f.id !== resolve(id) && Factions.relation(id, f.id) >= 15);
    Factions.enemiesOf = id => Factions.all().filter(f => f.id !== resolve(id) && Factions.relation(id, f.id) <= -15);
    Factions.meet = id => {
        const f = Factions.get(id);
        if (f && !f.met) {
            f.met = true;
            emit("factions:met", f);
        }
    };
    Factions.speciesName = id => {
        const cfg = Factions.config();
        const sp = cfg && cfg.species.find(s => s.id === id);
        return sp ? sp.name : id;
    };
    Factions.stanceNames = f => {
        const cfg = Factions.config();
        return f.ethos.map(id => (cfg.ethos.find(e => e.id === id) || { name: id }).name);
    };

    /** Factions the ledger shows: the player's and the ones met so far (user decision 2026-09-18). */
    Factions.listed = () => Factions.all().filter(f => f.isPlayer || f.met);

    // New Game rolls new factions together with the new world.
    if (window.UF.Events && UF.Events.on) UF.Events.on("world:created", state => Factions.generate(state));

    //-------------------------------------------------------------------------
    // Contact: an unmet faction is met when one of its units comes within CONTACT_CELLS of one of ours.

    const CONTACT_CELLS = 12;
    const CONTACT_EVERY = 120; // frames (2 s at x1)
    let contactFrame = 0;
    Factions.checkContact = function() {
        const d = data();
        const W = window.UF && UF.World;
        if (!d || !W || !W.state) return [];
        const unmet = d.list.filter(f => !f.isPlayer && !f.met);
        if (!unmet.length) return [];
        const pid = d.playerId;
        const units = W.units();
        const ours = units.filter(u => u.data && u.data.faction === pid);
        if (!ours.length) return [];
        const met = [];
        for (const f of unmet) {
            const theirs = units.filter(u => u.data && u.data.faction === f.id);
            const near = theirs.some(t => ours.some(o => o.area.x === t.area.x && o.area.y === t.area.y && Math.abs(o.x - t.x) <= CONTACT_CELLS && Math.abs(o.y - t.y) <= CONTACT_CELLS));
            if (near) {
                Factions.meet(f.id);
                met.push(f);
                d.log.push({ a: pid, b: f.id, before: null, after: null, reason: "met", day: window.$ufTime ? $ufTime.dateString : "" });
            }
        }
        return met;
    };
    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);
        if (++contactFrame % CONTACT_EVERY === 0) Factions.checkContact();
    };

    //-------------------------------------------------------------------------
    // Compatibility with the earlier draft's $factionManager (standing = relation with the player's colony)

    window.$factionManager = {
        getAllFactions: () => Factions.all().map(f => Object.assign({}, f, { standing: Factions.relation("player", f.id) })),
        getFaction: id => Factions.get(id),
        getAlignmentTier: standing => Factions.tierOf(standing),
        modifyStanding: (id, delta, reason) => Factions.adjust("player", id, delta, reason),
        discoverFaction: id => Factions.meet(id),
        toggleLedger: () => {
            const w = SceneManager._scene && SceneManager._scene._factionLedgerWindow;
            if (!w) return;
            if (w.visible) w.hide();
            else {
                w.refresh();
                w.show();
            }
        }
    };

    //-------------------------------------------------------------------------
    // Ledger window (F)

    class Window_FactionLedger extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this.opacity = 240;
            this.hide();
        }

        refresh() {
            this.contents.clear();
            const w = this.innerWidth;
            const list = Factions.listed(); // only factions your people have met (user decision 2026-09-18)
            const unmet = Factions.all().length - list.length;
            let y = 4;
            this.contents.fontSize = 20;
            this.changeTextColor("#f59e0b");
            this.drawText(unmet ? `Factions you know (${unmet} not yet met)` : "Factions you know", 0, y, w, "center");
            y += 32;
            this.contents.fontSize = 13;
            for (const f of list) {
                this.contents.fillRect(4, y, w - 8, 44, "rgba(20, 25, 35, 0.75)");
                this.changeTextColor(f.color);
                this.contents.fontSize = 16;
                this.drawText(f.name, 12, y + 2, 300, "left");
                this.contents.fontSize = 12;
                this.changeTextColor("#94a3b8");
                const home = f.home.area;
                const where = `area ${home.x},${home.y}`;
                const about = `${Factions.speciesName(f.species)} · ${Factions.stanceNames(f).join(", ")} · ${f.population} people · ${where}${f.isPlayer ? " · yours" : ""}`;
                this.drawText(about, 12, y + 22, w - 220, "left");
                if (!f.isPlayer) {
                    const rel = Factions.relation("player", f.id);
                    const tier = Factions.tierOf(rel);
                    this.contents.fontSize = 15;
                    this.changeTextColor(tier.color);
                    this.drawText(`${tier.label} (${rel > 0 ? "+" : ""}${rel})`, w - 200, y + 2, 188, "right");
                    const others = list.filter(o => o.id !== f.id && !o.isPlayer);
                    const friend = others.reduce((best, o) => (!best || Factions.relation(f.id, o.id) > Factions.relation(f.id, best.id) ? o : best), null);
                    const foe = others.reduce((best, o) => (!best || Factions.relation(f.id, o.id) < Factions.relation(f.id, best.id) ? o : best), null);
                    this.contents.fontSize = 11;
                    this.changeTextColor("#cbd5e1");
                    if (friend && foe) this.drawText(`ally: ${friend.name.replace(/^The /, "")} · rival: ${foe.name.replace(/^The /, "")}`, w - 320, y + 24, 308, "right");
                } else {
                    this.contents.fontSize = 15;
                    this.changeTextColor("#4ade80");
                    this.drawText("Your colony", w - 200, y + 2, 188, "right");
                }
                y += 48;
            }
            this.contents.fontSize = 12;
            this.changeTextColor("#64748b");
            this.drawText("Relations with your colony shown on the right. Press F to close.", 0, y + 2, w, "center");
            this.resetTextColor();
        }
    }
    Factions.LedgerWindow = Window_FactionLedger;

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        const ww = Math.min(Graphics.boxWidth - 16, 780), wh = Math.min(Graphics.boxHeight - 16, 520);
        this._factionLedgerWindow = new Window_FactionLedger(new Rectangle((Graphics.boxWidth - ww) / 2, (Graphics.boxHeight - wh) / 2, ww, wh));
        this.addChild(this._factionLedgerWindow);
    };

    Input.keyMapper[70] = "ufFactionLedger"; // F
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (Input.isTriggered("ufFactionLedger")) $factionManager.toggleLedger();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "factions"), registered at boot after all plugins load

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("factions", async t => {
            const cfg = Factions.config();
            const W = UF.World, st = W && W.state;
            const d = st && st.factions;
            t.check("generated_with_world", !!cfg && !!d && Array.isArray(d.list), d ? `${d.list.length} factions (yours among them), seed ${st.seed}` : "no factions in the world state");
            if (!d) return;
            const others = d.list.filter(f => !f.isPlayer);
            t.check("count_in_range", d.list.length >= cfg.count[0] && d.list.length <= cfg.count[1], `${d.list.length} factions (allowed ${cfg.count[0]}-${cfg.count[1]}), ${others.length} besides the player's`);
            const player = Factions.player();
            const playerSpecies = player && cfg.species.find(s => s.id === player.species);
            t.check("player_faction", !!player && player.id === d.playerId && d.list.includes(player) && player.isPlayer && others.length === d.list.length - 1 && (!playerSpecies || playerSpecies.playable !== false) && Factions.relation("player", player.id) === 100,
                player ? `the player's faction is ${player.name} (${player.species}, id ${player.id}); "player" resolves to it` : "no player faction");
            const names = d.list.map(f => f.name);
            t.check("names_unique", new Set(names).size === names.length, names.join(" | "));

            const values = Object.values(d.relations);
            const pairs = (d.list.length * (d.list.length - 1)) / 2;
            t.check("relations_complete", values.length === pairs && values.every(v => v >= -100 && v <= 100),
                `${values.length} of ${pairs} pairs, range ${Math.min(...values)} to ${Math.max(...values)}`);
            const allied = Object.entries(d.relations).filter(([, v]) => v >= 40), hostile = Object.entries(d.relations).filter(([, v]) => v <= -40);
            t.check("aligned_and_disaligned", allied.length > 0 && hostile.length > 0, `${allied.length} strong alliance(s), ${hostile.length} serious hostility(ies)`);
            t.check("relation_symmetric", others.length > 1 && Factions.relation(others[0].id, others[1].id) === Factions.relation(others[1].id, others[0].id), "relation(a, b) = relation(b, a)");

            // areas (VISION V4/V31 revised 2026-09-19): every faction's area centre on habitable land with a walkable
            // disc, pairwise at least minGap apart, at least edgeMargin from the map edge, the player's within
            // playerReach of the map centre, the view started there; the same areas for the same seed, others for the next.
            const acfg = Factions.areasConfig();
            const size = st.size, mid = Math.floor(size / 2);
            const fresh = () => ({ seed: st.seed, size: st.size, areasX: st.areasX, areasY: st.areasY, startArea: { x: st.startArea.x, y: st.startArea.y } });
            const areaProblems = [];
            const infoOf = f => UF.WorldGen.cellInfoLocal(f.home.area.x, f.home.area.y, f.home.x, f.home.y);
            for (const f of d.list) {
                const h = f.home, a = h && h.area;
                if (!h || !a || !W.inWorld(a.x, a.y) || !Number.isInteger(h.x) || !Number.isInteger(h.y)) { areaProblems.push(`${f.name}: no area`); continue; }
                const info = infoOf(f);
                if (!Factions.habitable(info, f.species)) areaProblems.push(`${f.name} (${h.x},${h.y}): not habitable (${info ? `${info.biomeId}, walkable ${info.walkable}, water ${info.water}, ${info.region.alignment}` : "no cell info"})`);
                let dry = 0, discCells = 0;
                const r = f.isPlayer ? Math.max(0, f.areaInfo ? f.areaInfo.disc : 0) : acfg.clearDisc;
                for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
                    if (dx * dx + dy * dy > r * r) continue;
                    discCells++;
                    const c = UF.WorldGen.cellInfoLocal(a.x, a.y, h.x + dx, h.y + dy);
                    if (!c || !c.walkable) dry++;
                }
                if (dry) areaProblems.push(`${f.name}: ${dry} of ${discCells} cells within ${r} not walkable`);
                if (!f.isPlayer && (h.x < acfg.edgeMargin || h.y < acfg.edgeMargin || h.x > size - 1 - acfg.edgeMargin || h.y > size - 1 - acfg.edgeMargin)) areaProblems.push(`${f.name} (${h.x},${h.y}): within ${acfg.edgeMargin} of the edge`);
            }
            let minPair = Infinity, closest = "";
            for (let i = 0; i < d.list.length; i++) for (let j = i + 1; j < d.list.length; j++) {
                const p = d.list[i].home, q = d.list[j].home;
                if (!p || !q || p.area.x !== q.area.x || p.area.y !== q.area.y) continue;
                const dist = Math.hypot(p.x - q.x, p.y - q.y);
                if (dist < minPair) { minPair = dist; closest = `${d.list[i].name} and ${d.list[j].name}`; }
            }
            if (minPair < acfg.minGap) areaProblems.push(`${closest} only ${minPair.toFixed(1)} cells apart`);
            const pl = Factions.player();
            const plDist = pl ? Math.hypot(pl.home.x - mid, pl.home.y - mid) : Infinity;
            if (!(plDist <= acfg.playerReach) || !pl || pl.home.area.x !== st.startArea.x || pl.home.area.y !== st.startArea.y) areaProblems.push(`the player's centre is ${plDist.toFixed(1)} cells from (${mid},${mid})`);
            const vs = st.viewStart;
            if (!pl || !vs || vs.x !== pl.home.x || vs.y !== pl.home.y) areaProblems.push(`viewStart ${vs ? `(${vs.x},${vs.y})` : "unset"} is not the player's centre`);
            const homesSig = f => JSON.stringify(f.list.map(x => [x.id, x.home]));
            const areasAgain = Factions.generate(fresh());
            const areasOther = Factions.generate(Object.assign(fresh(), { seed: st.seed + 1 }));
            const sameAreas = homesSig(areasAgain) === homesSig(d);
            const otherAreas = homesSig(areasOther) !== homesSig(d);
            if (!sameAreas) areaProblems.push(`seed ${st.seed} regenerated gives other areas`);
            if (!otherAreas) areaProblems.push(`seed ${st.seed + 1} gives the same areas`);
            const la = Factions.lastAreas;
            t.check("areas", areaProblems.length === 0,
                `${d.list.map(f => `${f.name.replace(/^The /, "")} (${f.species}${f.isPlayer ? ", yours" : ""}) at (${f.home.x},${f.home.y}) ${f.areaInfo ? `${f.areaInfo.biome}, water ${f.areaInfo.water === null ? "none" : "~" + f.areaInfo.water} cells, rule ${f.areaInfo.rule}` : "no area info"}`).join("; ")}; `
                + `closest pair ${minPair === Infinity ? "n/a" : minPair.toFixed(1)} (want >= ${acfg.minGap}); player's ${plDist.toFixed(1)} from the centre (want <= ${acfg.playerReach}); same seed ${sameAreas ? "same" : "DIFFERENT"} areas, seed+1 ${otherAreas ? "other" : "THE SAME"} areas; `
                + `last placement ${la ? `${la.ms.toFixed(0)} ms, ${la.cells} cell lookups, ${la.attempts} attempt(s)${la.relaxed ? `, gap RELAXED to ${la.gap}` : ""}` : "?"}`
                + (areaProblems.length ? `; PROBLEMS: ${areaProblems.join("; ")}` : ""));

            // Determinism of generation itself (the live state changes in play: met, log, populations).
            const again = Factions.generate(fresh()), again2 = Factions.generate(fresh());
            const other = Factions.generate(Object.assign(fresh(), { seed: st.seed + 1 }));
            const sig = f => JSON.stringify({ list: f.list, relations: f.relations, playerId: f.playerId });
            t.check("same_seed_same_factions", sig(again) === sig(again2) && again.list.map(f => f.name).join("|") === d.list.map(f => f.name).join("|") && again.playerId === d.playerId,
                `generated twice from seed ${st.seed}: identical; same names and player (${again.playerId}) as the live world`);
            t.check("new_seed_new_factions", sig(other) !== sig(d), `another seed gives: ${other.list.filter(f => !f.isPlayer).map(f => f.name).join(", ")}`);

            const saved = JsonEx.parse(JsonEx.stringify(st));
            t.check("saved_with_world", !!saved.factions && sig(saved.factions) === sig(d), "factions round-trip through the save format");

            // Contact (user decision 2026-09-18): a faction appears in the ledger only once your people have met it.
            const unmetBefore = Factions.all().filter(f => !f.met);
            const listedBefore = Factions.listed().map(f => f.id);
            t.check("unmet_not_listed", listedBefore.every(id => Factions.get(id).met) && !listedBefore.some(id => unmetBefore.some(f => f.id === id)),
                `ledger lists ${listedBefore.length} met faction(s) (${listedBefore.join(", ") || "none"}); ${unmetBefore.length} unmet and hidden`);
            if (unmetBefore.length) {
                const target = unmetBefore[0];
                const px = $gamePlayer.x, py = $gamePlayer.y;
                const mine = W.addUnit({ name: "TEST_scout", image: { characterName: "$U7_Ranger", characterIndex: 0 }, area: W.currentArea(), x: px, y: py, data: { kind: "test", faction: Factions.playerId() } });
                const theirs = W.addUnit({ name: "TEST_stranger", image: { characterName: "$U7_Townsman", characterIndex: 0 }, area: W.currentArea(), x: px + 3, y: py, data: { kind: "person", faction: target.id } });
                await t.waitUntil(() => target.met, 6000, `${target.name} to be met`).catch(() => {});
                t.check("contact_reveals_faction", target.met && Factions.listed().some(f => f.id === target.id),
                    `${target.name}: met ${target.met} after a scout of ours stood 3 cells from one of theirs; listed ${Factions.listed().some(f => f.id === target.id)}`);
                W.removeUnit(mine.id);
                W.removeUnit(theirs.id);
            }

            $factionManager.toggleLedger();
            await t.waitFrames(10);
            const ledger = SceneManager._scene._factionLedgerWindow;
            t.check("ledger_opens", !!ledger && ledger.visible, "F toggles the ledger window");
            t.screenshot("ledger");
            $factionManager.toggleLedger();
            await t.waitFrames(5);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during faction checks");
        });
    }
})();
