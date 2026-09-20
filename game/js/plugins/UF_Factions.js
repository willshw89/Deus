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
 * Window skins and portraits per culture (VISION V99, V100): every window of the
 * player uses the player's culture's skin (catalog "skins"); portraits come from
 * the culture's face sheets or sit in a frame in its colours (catalog "faces").
 *
 * API and checks: docs/systems/UF_Factions.md
 * Replaced core methods: none (aliases only; Window_Base.prototype.loadWindowskin
 * is aliased for the skins).
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
        const dwarf = cfg.species.find(sp => sp.id === "dwarf");
        for (let i = 0; i < count; i++) {
            const rolled = weighted(cfg.species);
            // Reserve within the configured count, before naming or relations: never append a faction.
            const sp = dwarf && i === count - 1 && !list.some(f => f.species === "dwarf") ? dwarf : rolled;
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
                home: { area, x: Math.floor(size / 2), y: Math.floor(size / 2), z: sp.id === "dwarf" ? -1 : 0 }, // the centre is set by placeAreas
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
        state.factions = { version: 4, list, relations, log: [], playerId: player.id };
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
            r.f.home = { area: r.area, x: r.x, y: r.y, z: r.f.species === "dwarf" ? -1 : 0 };
            r.f.areaInfo = { biome: r.info ? r.info.biomeId : null, water: Number.isFinite(r.water) ? Math.round(r.water) : null, rule: r.rule, disc: r.disc };
            if (relaxed) r.f.areaInfo.gap = gap;
        }
        if (!result) for (const f of others) f.areaInfo = { biome: null, water: null, rule: "none", disc: -1 }; // no land at all (never seen)
        // Geological pockets are selected before History or any world-map build: no surface camp is ever stamped.
        const usedPockets = new Map();
        for (const f of F.list) {
            if (f.species !== "dwarf") continue;
            if (!UF.Levels || typeof UF.Levels.settlementCell !== "function") throw new Error("Dwarf founding requires UF.Levels.settlementCell");
            const anchor = f.home;
            f.homes = [-1, -2].map(z => {
                const key = `${anchor.area.x},${anchor.area.y},${z}`;
                const used = usedPockets.get(key) || [];
                const pocket = UF.Levels.settlementCell(state, { area: anchor.area, x: anchor.x, y: anchor.y, z, used });
                if (!pocket) throw new Error(`No unused habitable pocket for ${f.id} on ${z}`);
                used.push(pocket.id); usedPockets.set(key, used);
                return { area: { ...anchor.area }, x: pocket.x, y: pocket.y, z, pocketId: pocket.id };
            });
            f.home = { ...f.homes[0], area: { ...f.homes[0].area } };
            f.areaInfo = { ...f.areaInfo, rule: "underground-pocket", biome: null, water: null, disc: 3 };
        }
        state.viewStart = { area: { ...player.home.area }, x: player.home.x, y: player.home.y, z: player.home.z || 0 };
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

    /** Current living census count for a faction. */
    Factions.census = function(id) {
        const fid = resolve(id);
        const W = window.UF && UF.World;
        if (!W || !fid) return 0;
        return W.units().filter(u => u && u.data && (u.data.kind === "colonist" || u.data.kind === "person") && u.data.faction === fid && !u.data.dead && !u.data._isDying).length;
    };

    // New Game rolls new factions together with the new world.
    if (window.UF.Events && UF.Events.on) {
        UF.Events.on("world:created", state => Factions.generate(state));
        UF.Events.on("factions:born", child => {
            if (child && child.data && child.data.faction && !child.data._popCounted) {
                child.data._popCounted = true;
                const f = Factions.get(child.data.faction);
                if (f) f.population = (f.population || 0) + 1;
            }
        });
        UF.Events.on("combat:kill", event => {
            const victim = event && event.target;
            if (victim && victim.data && victim.data.faction && !victim.data._popDeducted) {
                victim.data._popDeducted = true;
                const f = Factions.get(victim.data.faction);
                if (f && f.population > 0) f.population--;
            }
        });
        UF.Events.on("world:unitRemoved", u => {
            if (u && u.data && u.data.faction && (u.data.dead || u.data._isDying) && !u.data._popDeducted) {
                u.data._popDeducted = true;
                const f = Factions.get(u.data.faction);
                if (f && f.population > 0) f.population--;
            }
        });
    }

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
            const near = theirs.some(t => ours.some(o => o.area.x === t.area.x && o.area.y === t.area.y && (o.z || 0) === (t.z || 0) && Math.abs(o.x - t.x) <= CONTACT_CELLS && Math.abs(o.y - t.y) <= CONTACT_CELLS));
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
                if (f.species === "dwarf") {
                    const homes = f.homes || [];
                    if (h.z !== -1 || homes.length !== 2 || ![-1, -2].every(z => homes.some(c => c.z === z))) areaProblems.push(`${f.name}: missing underground homes`);
                    for (const c of homes) {
                        const pockets = UF.Levels.habitablePockets(c.z, a.x, a.y);
                        if (!pockets.some(p => p.id === c.pocketId && p.x === c.x && p.y === c.y && p.clearRadius >= 3)) areaProblems.push(`${f.name}: home is not a habitable pocket on ${c.z}`);
                    }
                    continue;
                }
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
                if (!p || !q || p.area.x !== q.area.x || p.area.y !== q.area.y || (p.z || 0) !== (q.z || 0)) continue;
                const dist = Math.hypot(p.x - q.x, p.y - q.y);
                if (dist < minPair) { minPair = dist; closest = `${d.list[i].name} and ${d.list[j].name}`; }
            }
            if (minPair < acfg.minGap) areaProblems.push(`${closest} only ${minPair.toFixed(1)} cells apart`);
            const pl = Factions.player();
            const plDist = pl ? Math.hypot(pl.home.x - mid, pl.home.y - mid) : Infinity;
            if (!pl || (pl.species !== "dwarf" && !(plDist <= acfg.playerReach)) || pl.home.area.x !== st.startArea.x || pl.home.area.y !== st.startArea.y) areaProblems.push(`the player's centre is ${plDist.toFixed(1)} cells from (${mid},${mid})`);
            const vs = st.viewStart;
            if (!pl || !vs || vs.x !== pl.home.x || vs.y !== pl.home.y || (vs.z || 0) !== (pl.home.z || 0)) areaProblems.push(`viewStart ${vs ? `(${vs.x},${vs.y})` : "unset"} is not the player's centre`);
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
                const view = W.viewLevel();
                const mine = W.addUnit({ name: "TEST_scout", image: { characterName: "$U7_Ranger", characterIndex: 0 }, area: view, z: view.z, x: px, y: py, data: { kind: "test", faction: Factions.playerId() } });
                const theirs = W.addUnit({ name: "TEST_stranger", image: { characterName: "$U7_Townsman", characterIndex: 0 }, area: view, z: view.z, x: px + 3, y: py, data: { kind: "person", faction: target.id } });
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
    //-------------------------------------------------------------------------
    // Window skins and portrait styles per culture (VISION V99, V100; user 2026-09-19 14:42 "Every faction should have a
    // different menu skin", 14:44 "Every faction should have it's own U7 faceset style"). Catalog keys "skins", "faces".
    //
    // Skins: every Window_Base loads the skin of the player's faction's culture: img/system/<file>.png when that file
    // exists, else a stand-in built once from img/system/<base>.png with the culture's recipe (a gradient map by
    // brightness; the text colour row is never changed, so ColorManager's colours stay as Window.png has them). A window
    // may show another side's skin: Factions.setWindowSkin(window, factionOrUnitOrCulture). The player's skin follows a
    // faction change or a loaded save: Scene_Map compares the player's skin key every frame and reloads every window's
    // skin when it changes. UF_Talk has no windows: it draws each side's skin frame around that side's portrait
    // (drawSkinFrame).
    // Faces: the culture's sheets (faces.pattern) and then the species' sheets (faces.species) when the unit belongs to
    // that culture's people; otherwise the portrait its caller chose before (UF_Talk portraitOf, UF_Sheet faceSpecOf)
    // inside a code-drawn frame in the culture's colours (UF_GenFrame, faces.cultures.<id>.standIn).
    // Docs: docs/systems/UF_Factions.md (Skins and portraits). Test-only sabotage: plugin parameter TestProvoke.

    const SKIN_SALT = 0x5c1e;
    const skinParams = PluginManager.parameters("UF_Factions") || {};
    const skinProvokes = String(skinParams.TestProvoke || "").split(",").map(s => s.trim()).filter(Boolean);
    /** Test-only sabotage (plugin parameter TestProvoke, never set in the real plugins.js): proves each skins check can FAIL. */
    Factions.provoked = name => !!(window.UF && UF.Test && UF.Test.active) && (skinProvokes.includes("all") || skinProvokes.includes(name));
    const provoked = Factions.provoked;

    // Files are checked before ImageManager sees them (a failed load throws at the next scene change). Without a file
    // system (a web build) no optional file is loaded: stand-ins and today's portraits are used.
    let skinFs = null, skinPath = null, skinBaseDir = "";
    try {
        if (typeof require === "function") {
            skinFs = require("fs");
            skinPath = require("path");
            skinBaseDir = (typeof nw !== "undefined" && nw.__dirname) || process.cwd();
        }
    } catch (e) {
        skinFs = null;
    }
    const skinExists = new Map();
    function assetExists(rel) {
        if (!skinFs) return false;
        if (skinExists.has(rel)) return skinExists.get(rel);
        let ok = false;
        try { ok = skinFs.existsSync(skinPath.join(skinBaseDir, rel)); } catch (e) { ok = false; }
        skinExists.set(rel, ok);
        return ok;
    }
    Factions.forgetFileChecks = () => skinExists.clear();

    const skinsCfg = () => (catalogOf() && catalogOf().skins) || null;
    const facesCfg = () => (catalogOf() && catalogOf().faces) || null;
    /** The entry of a culture in a section's "cultures", following "like" (automaton -> starborn): { id, entry } or null. */
    function cultureEntry(section, culture) {
        const map = section && section.cultures;
        let id = culture;
        for (let hops = 0; map && id && hops < 4; hops++) {
            const e = map[id];
            if (!e || typeof e !== "object") return null;
            if (!e.like) return { id, entry: e };
            id = e.like;
        }
        return null;
    }

    // The faction list without generating it (Factions.player() generates factions for a state that has none).
    const factionList = () => {
        const W = window.UF && UF.World;
        const st = W && W.state && W.state.factions;
        return st && Array.isArray(st.list) ? st : null;
    };
    const playerFactionNow = () => {
        const st = factionList();
        return st ? st.list.find(f => f.id === st.playerId) || null : null;
    };
    const factionNow = id => {
        const st = factionList();
        if (!st || id === undefined || id === null) return null;
        const fid = id === "player" ? st.playerId : id;
        return st.list.find(f => f.id === fid) || null;
    };
    const cultureOfFaction = f => (f ? String(f.culture || f.species || "") || null : null);

    /**
     * The culture id of a faction, faction id ("player" too), unit or culture id: a faction's culture (faction.culture,
     * else its species); a unit's data.culture, else its faction's, else (a colonist) the player's, else its species.
     */
    Factions.cultureOf = function(x) {
        if (x === undefined || x === null) return null;
        if (typeof x === "string") {
            const f = factionNow(x);
            return f ? cultureOfFaction(f) : x;
        }
        if (x.data && typeof x.data === "object") {
            const d = x.data;
            if (d.culture) return String(d.culture);
            const f = factionNow(d.faction);
            if (f) return cultureOfFaction(f);
            if (d.kind === "colonist") {
                const p = playerFactionNow();
                if (p) return cultureOfFaction(p);
            }
            return d.species ? String(d.species) : null;
        }
        if (x.species !== undefined || x.culture !== undefined) return cultureOfFaction(x);
        return null;
    };
    Factions.playerCulture = () => cultureOfFaction(playerFactionNow());

    //-------------------------------------------------------------------------
    // Skins

    const hexRgb = hex => {
        const n = parseInt(String(hex || "#000000").replace("#", ""), 16) || 0;
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    /**
     * How a faction, unit or culture's windows look: { culture, id (the skins entry used, or "default"), base, file,
     * recipe, source ("file": img/system/<file>.png; "stand-in": built from base with the recipe; "base": base as it
     * is), key }.
     */
    function skinPlan(x) {
        const culture = Factions.cultureOf(x);
        const cfg = skinsCfg();
        const base = cfg && cfg.base ? String(cfg.base) : "Window";
        const hit = cfg ? cultureEntry(cfg, culture) : null;
        const entry = hit ? hit.entry : (cfg && cfg.default) || null;
        const id = hit ? hit.id : "default";
        const file = entry && entry.file ? String(entry.file) : null;
        const recipe = entry && entry.recipe && typeof entry.recipe === "object" ? entry.recipe : null;
        const hasFile = !!file && assetExists(`img/system/${file}.png`);
        const source = hasFile ? "file" : recipe ? "stand-in" : "base";
        const key = source === "file" ? `file:${file}` : source === "stand-in" ? `standin:${id}:${JSON.stringify(recipe)}` : `base:${base}`;
        return { culture, id, base, file, recipe, source, key };
    }
    Factions.skinInfo = function(x) {
        const info = skinPlan(x);
        if (provoked("fallback_default") && info.file && info.source !== "file") info.source = "file"; // test-only: a wrong report (nothing is loaded)
        return info;
    };

    const skinCache = new Map(); // stand-in key -> Bitmap, each built once
    let skinsBuilt = 0;
    /** Build a stand-in skin: a copy of the base skin, every part but the text colours gradient-mapped by brightness. */
    function buildStandIn(src, recipe) {
        const w = src.width, h = src.height;
        const b = new Bitmap(w, h);
        b.blt(src, 0, 0, w, h, 0, 0);
        const ctx = b.context;
        const img = ctx.getImageData(0, 0, w, h);
        const d = img.data;
        const ramp = list => (Array.isArray(list) && list.length === 3 ? list.map(hexRgb) : null);
        const back = provoked("text_readable") ? ramp(["#b8b8b0", "#dcdcd4", "#ffffff"]) : ramp(recipe.back);
        const frame = ramp(recipe.frame);
        const mix = clamp(Number(recipe.mix) || 0, 0, 1);
        const same = provoked("cultures_differ"); // test-only: every stand-in stays the base skin
        for (let y = 0; y < h && !same; y++) {
            for (let x = 0; x < w; x++) {
                if (x >= 96 && y >= 144) continue; // the text colours (ColorManager.textColor reads x 96-191, y 144-191)
                const part = x < 96 ? back : frame;
                if (!part) continue;
                const i = (y * w + x) * 4;
                if (d[i + 3] === 0) continue;
                const t = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
                const lo = t < 0.5 ? part[0] : part[1], hi = t < 0.5 ? part[1] : part[2];
                const k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
                for (let j = 0; j < 3; j++) d[i + j] = Math.round((lo[j] + (hi[j] - lo[j]) * k) * (1 - mix) + d[i + j] * mix);
            }
        }
        ctx.putImageData(img, 0, 0);
        b._baseTexture.update();
        skinsBuilt++;
        return b;
    }

    /** The window skin Bitmap for a faction, faction id, unit or culture id (see skinInfo). Stand-ins are built once. */
    Factions.skinFor = function(x) {
        const info = skinPlan(x);
        let bmp;
        if (info.source === "file") bmp = ImageManager.loadSystem(info.file);
        else {
            const base = ImageManager.loadSystem(info.base);
            if (info.source === "base") bmp = base;
            else if (skinCache.has(info.key)) bmp = skinCache.get(info.key);
            else if (!base.isReady()) {
                // Window.png is still loading (never after boot): the base for now, the stand-in once it is in.
                if (!base._ufSkinWaiting && !(base.isError && base.isError())) {
                    base._ufSkinWaiting = true;
                    base.addLoadListener(() => { base._ufSkinWaiting = false; appliedSkinKey = null; });
                }
                return base;
            } else {
                bmp = buildStandIn(base, info.recipe);
                bmp._ufSkin = { id: info.id, source: "stand-in" };
                skinCache.set(info.key, bmp);
            }
        }
        return bmp;
    };
    Factions.skinStats = () => ({ built: skinsBuilt, cached: skinCache.size });

    /** Make a window show another side's skin (a faction, faction id, unit or culture id); null = the player's again. */
    Factions.setWindowSkin = function(win, who) {
        if (!win) return;
        win._ufSkinFor = who === undefined ? null : who;
        win.loadWindowskin();
    };
    /** Whose skin a side of a conversation shows: that unit's, or the player's faction when nobody speaks for it. */
    Factions.skinOwner = function(unit) {
        if (provoked("stranger_in_talk")) return playerFactionNow(); // test-only: every side in the player's skin
        return unit || playerFactionNow();
    };

    const _Window_Base_loadWindowskin = Window_Base.prototype.loadWindowskin;
    Window_Base.prototype.loadWindowskin = function() {
        _Window_Base_loadWindowskin.call(this);
        if (provoked("player_skin")) return; // test-only: every window keeps Window.png
        const who = this._ufSkinFor !== undefined && this._ufSkinFor !== null ? this._ufSkinFor : playerFactionNow();
        if (!who) return; // no world yet (the title screen): Window.png
        let skin = null;
        try {
            skin = Factions.skinFor(who);
        } catch (e) {
            console.error(e);
        }
        if (skin && skin !== this.windowskin) this.windowskin = skin;
    };

    /** Reload the skin of every window in a scene that shows the player's skin. Returns how many. */
    Factions.refreshSkins = function(scene = SceneManager._scene) {
        let n = 0;
        const walk = node => {
            if (node instanceof Window_Base && (node._ufSkinFor === undefined || node._ufSkinFor === null)) {
                node.loadWindowskin();
                n++;
            }
            if (node && node.children) for (const c of node.children) walk(c);
        };
        if (scene) walk(scene);
        return n;
    };
    /** The key of the player's skin ("none" before a world exists). */
    Factions.playerSkinKey = () => {
        const p = playerFactionNow();
        return p ? skinPlan(p).key : "none";
    };
    let appliedSkinKey = null;
    /** Apply the player's skin when it changed (a faction change, a loaded save, a delivered file). True when it did. */
    Factions.syncSkins = function(scene = SceneManager._scene) {
        const key = Factions.playerSkinKey();
        if (key === appliedSkinKey) return false;
        const before = appliedSkinKey;
        appliedSkinKey = key;
        const n = Factions.refreshSkins(scene);
        if (before !== null) emit("factions:skinChanged", Factions.playerCulture(), key, n);
        return true;
    };
    const _Scene_Map_update_skins = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update_skins.call(this);
        Factions.syncSkins(this);
    };

    /**
     * Draw a skin's window frame (the 96 x 96 frame part at x 96, cut in nine like RMMZ's Window) around a rectangle of a
     * bitmap, corners m px. { drawn, skin, pending }: not drawn while the skin file is still loading.
     */
    Factions.drawSkinFrame = function(bitmap, x, y, w, h, who, m = 12) {
        const skin = Factions.skinFor(who);
        if (!skin || !skin.isReady()) return { drawn: false, skin, pending: !!skin && !(skin.isError && skin.isError()) };
        const M = 24, sx = 96, sy = 0, sw = 96;
        const e = sw - M * 2;
        bitmap.blt(skin, sx, sy, M, M, x, y, m, m);
        bitmap.blt(skin, sx + sw - M, sy, M, M, x + w - m, y, m, m);
        bitmap.blt(skin, sx, sy + sw - M, M, M, x, y + h - m, m, m);
        bitmap.blt(skin, sx + sw - M, sy + sw - M, M, M, x + w - m, y + h - m, m, m);
        bitmap.blt(skin, sx + M, sy, e, M, x + m, y, w - m * 2, m);
        bitmap.blt(skin, sx + M, sy + sw - M, e, M, x + m, y + h - m, w - m * 2, m);
        bitmap.blt(skin, sx, sy + M, M, e, x, y + m, m, h - m * 2);
        bitmap.blt(skin, sx + sw - M, sy + M, M, e, x + w - m, y + m, m, h - m * 2);
        return { drawn: true, skin, pending: false };
    };

    //-------------------------------------------------------------------------
    // Portraits

    const PERSON_KINDS = ["colonist", "person", "stranger"];
    function isPerson(u) {
        const d = (u && u.data) || {};
        if (d.kind === "creature" || d.kind === "animal") return false;
        const people = catalogOf() && catalogOf().people;
        return PERSON_KINDS.includes(d.kind) || !!(people && d.species && people[d.species]);
    }
    function faceStageOf(u) {
        const d = (u && u.data) || {};
        if (typeof d.age === "number" && d.age < 2) return "baby";
        if (d.stage) return String(d.stage).toLowerCase();
        if (typeof d.age === "number") {
            const H = window.UF && UF.History;
            if (H && typeof H.stageOf === "function") return H.stageOf(d.age);
            return d.age < 12 ? "child" : d.age < 18 ? "teen" : d.age >= 60 ? "elder" : "adult";
        }
        return "adult";
    }
    /** Does a unit belong to a culture's people (the culture's own sheets show its people)? */
    function ofCulturePeople(u, hit) {
        const d = (u && u.data) || {};
        if (!hit || !d.species) return false;
        const list = Array.isArray(hit.entry.species) && hit.entry.species.length ? hit.entry.species : [hit.id];
        return list.includes(String(d.species));
    }

    /** The faces entry style of a culture merged over the default: { id, frame, background, ..., standIn }. */
    Factions.faceStyle = function(culture) {
        const cfg = facesCfg();
        if (!cfg) return null;
        const hit = cultureEntry(cfg, culture);
        const def = (cfg.cultures && cfg.cultures.default) || {};
        const e = hit ? hit.entry : def;
        const sd = def.standIn || {}, se = e.standIn || {};
        const standIn = Object.assign({ shape: "square", ornament: "none", thickness: 0.1 }, sd, se, { colors: Object.assign({ frame: "#5a4a36", light: "#a89272", dark: "#221a10", back: "#14110d" }, sd.colors || {}, se.colors || {}) });
        return Object.assign({}, e, { id: hit ? hit.id : "default", standIn });
    };

    /**
     * A portrait sheet for a person from the catalog "faces" key, or null: the culture's sheets (faces.pattern with
     * {culture} and {n}), then the species' sheets (faces.species), each only when the unit belongs to its culture's
     * people and the file exists. { sheet, index, from: "faces.culture" | "faces.species", culture, framed (the art has its own frame) }.
     */
    Factions.cultureFace = function(u) {
        const cfg = facesCfg();
        const d = (u && u.data) || {};
        if (!cfg || !isPerson(u) || provoked("faces_fallback")) return null;
        const stage = faceStageOf(u);
        if (stage === "baby" || stage === "child") return null; // the sheets hold adults and elders
        const culture = Factions.cultureOf(u);
        const hit = cultureEntry(cfg, culture);
        if (!hit || !ofCulturePeople(u, hit)) return null;
        const gender = String(d.gender || "").toLowerCase() === "female" ? "female" : "male";
        const age = stage === "elder" ? "elder" : "adult";
        const content = Array.isArray(cfg.contentMoods) && cfg.contentMoods.includes(d.mood);
        const h = hash32(u.id | 0, SKIN_SALT);
        const layout = cfg.layout || {};
        const slot = layout[`${age}_${gender}`];
        if (cfg.pattern && Number.isInteger(slot)) {
            const sheets = [];
            const max = clamp((cfg.sheets | 0) || 4, 1, 16);
            for (let n = 1; n <= max; n++) {
                const name = String(cfg.pattern).replace("{culture}", hit.id).replace("{n}", String(n));
                if (assetExists(`img/faces/${name}.png`)) sheets.push(name);
            }
            if (sheets.length) return { sheet: sheets[h % sheets.length], index: slot + (content ? 4 : 0), from: "faces.culture", culture: hit.id, framed: true };
        }
        const sp = cfg.species && d.species ? cfg.species[d.species] : null;
        const byAge = sp && sp[gender];
        const e = byAge && (byAge[age] || byAge.adult);
        if (e && e.sheet && assetExists(`img/faces/${e.sheet}.png`)) {
            const list = content && Array.isArray(e.content) && e.content.length ? e.content : Array.isArray(e.indices) && e.indices.length ? e.indices : [e.index | 0];
            return { sheet: String(e.sheet), index: list[h % list.length] | 0, from: "faces.species", culture: hit.id, framed: e.framed !== false };
        }
        return null;
    };
    /** The culture whose code-drawn frame goes around a person's stand-in portrait ("default" when it has none), or null (not a person). */
    Factions.faceFrameCulture = function(u) {
        const cfg = facesCfg();
        if (!cfg || !isPerson(u) || provoked("faces_fallback")) return null;
        if (provoked("faces_by_culture")) return "default"; // test-only: one frame for everyone
        const hit = cultureEntry(cfg, Factions.cultureOf(u));
        return hit ? hit.id : "default";
    };

    // The opening of a frame: square, arch, pointed, round, notched (octagon), cave (rough), blob (rounded).
    function openingPath(ctx, shape, x, y, w, h) {
        const cx = x + w / 2;
        switch (shape) {
            case "arch": {
                const a = h * 0.3;
                ctx.moveTo(x, y + h);
                ctx.lineTo(x, y + a);
                ctx.ellipse(cx, y + a, w / 2, a, 0, Math.PI, 0);
                ctx.lineTo(x + w, y + h);
                ctx.closePath();
                break;
            }
            case "pointed": {
                const a = h * 0.38;
                ctx.moveTo(x, y + h);
                ctx.lineTo(x, y + a);
                ctx.quadraticCurveTo(x, y + a * 0.2, cx, y);
                ctx.quadraticCurveTo(x + w, y + a * 0.2, x + w, y + a);
                ctx.lineTo(x + w, y + h);
                ctx.closePath();
                break;
            }
            case "round":
                ctx.moveTo(x + w, y + h / 2);
                ctx.ellipse(cx, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
                ctx.closePath();
                break;
            case "notched": {
                const k = w * 0.2;
                ctx.moveTo(x + k, y);
                ctx.lineTo(x + w - k, y);
                ctx.lineTo(x + w, y + k);
                ctx.lineTo(x + w, y + h - k);
                ctx.lineTo(x + w - k, y + h);
                ctx.lineTo(x + k, y + h);
                ctx.lineTo(x, y + h - k);
                ctx.lineTo(x, y + k);
                ctx.closePath();
                break;
            }
            case "cave": { // a rough tunnel mouth
                const pts = [[0, 1], [0, 0.36], [0.1, 0.16], [0.3, 0.05], [0.55, 0], [0.78, 0.07], [0.93, 0.2], [1, 0.38], [1, 1]];
                pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * w, y + py * h) : ctx.moveTo(x + px * w, y + py * h)));
                ctx.closePath();
                break;
            }
            case "blob": {
                const r = w * 0.3;
                ctx.moveTo(x + r, y);
                ctx.arcTo(x + w, y, x + w, y + h, r);
                ctx.arcTo(x + w, y + h, x, y + h, r);
                ctx.arcTo(x, y + h, x, y, r);
                ctx.arcTo(x, y, x + w, y, r);
                ctx.closePath();
                break;
            }
            default:
                ctx.rect(x, y, w, h);
        }
    }
    // Small code-drawn marks on the frame band (placeholders until the culture's face sheets arrive).
    function frameOrnament(ctx, kind, x, y, S, t, col) {
        const u = Math.max(1, S / 144);
        const m = t / 2;
        const dot = (cx, cy, r, fill, edge) => {
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2);
            ctx.fillStyle = fill;
            ctx.fill();
            if (edge) { ctx.lineWidth = u; ctx.strokeStyle = edge; ctx.stroke(); }
        };
        const corners = [[x + m, y + m], [x + S - m, y + m], [x + m, y + S - m], [x + S - m, y + S - m]];
        const mids = [[x + S / 2, y + m], [x + S / 2, y + S - m], [x + m, y + S / 2], [x + S - m, y + S / 2]];
        ctx.lineWidth = u;
        switch (kind) {
            case "studs":
                for (const [cx, cy] of corners) dot(cx, cy, t * 0.3, col.light, col.dark);
                break;
            case "knobs": // bone ends
                for (const [cx, cy] of corners) { dot(cx - t * 0.2, cy - t * 0.1, t * 0.24, col.light, col.dark); dot(cx + t * 0.2, cy + t * 0.1, t * 0.24, col.light, col.dark); }
                break;
            case "diamonds":
                for (const [cx, cy] of corners.concat(mids)) {
                    const r = t * 0.34;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.7, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.7, cy);
                    ctx.closePath();
                    ctx.fillStyle = col.light;
                    ctx.fill();
                    ctx.strokeStyle = col.dark;
                    ctx.stroke();
                }
                break;
            case "leaves":
                for (let i = 0; i <= 8; i++) {
                    const p = i / 8;
                    for (const [cx, cy, rot] of [[x + t + (S - 2 * t) * p, y + m, 0.6], [x + m, y + t + (S - 2 * t) * p, 1.2], [x + S - m, y + t + (S - 2 * t) * p, -1.2]]) {
                        ctx.beginPath();
                        ctx.ellipse(cx, cy, t * 0.42, t * 0.2, rot + (i % 2 ? 0.5 : -0.5), 0, Math.PI * 2);
                        ctx.fillStyle = i % 2 ? col.light : col.dark;
                        ctx.fill();
                    }
                }
                break;
            case "ticks": // cut runes
                ctx.strokeStyle = col.dark;
                ctx.lineWidth = Math.max(1, 1.5 * u);
                for (let i = 1; i <= 5; i++) {
                    const p = (S * i) / 6;
                    for (const [ax, ay, bx, by] of [[x + p, y + t * 0.2, x + p + (i % 2 ? t * 0.3 : 0), y + t * 0.8], [x + p, y + S - t * 0.8, x + p - (i % 2 ? t * 0.3 : 0), y + S - t * 0.2],
                        [x + t * 0.2, y + p, x + t * 0.8, y + p + (i % 2 ? 0 : t * 0.3)], [x + S - t * 0.8, y + p, x + S - t * 0.2, y + p - (i % 2 ? 0 : t * 0.3)]]) {
                        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
                    }
                }
                break;
            case "teeth": { // a gear ring around a round opening
                const cx = x + S / 2, cy = y + S / 2, r = S / 2 - t * 0.55;
                ctx.fillStyle = col.light;
                for (let i = 0; i < 16; i++) {
                    const a = (i / 16) * Math.PI * 2;
                    ctx.save();
                    ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                    ctx.rotate(a);
                    ctx.fillRect(-t * 0.22, -t * 0.16, t * 0.44, t * 0.32);
                    ctx.restore();
                }
                for (const [px, py] of corners) dot(px, py, t * 0.22, col.dark, null);
                break;
            }
            case "stitches":
                ctx.strokeStyle = col.light;
                ctx.lineWidth = Math.max(1, 1.5 * u);
                ctx.setLineDash([3 * u, 3 * u]);
                ctx.strokeRect(x + m, y + m, S - t, S - t);
                ctx.setLineDash([]);
                for (const [cx, cy] of [corners[0], corners[3]]) { ctx.fillStyle = col.dark; ctx.fillRect(cx - t * 0.35, cy - t * 0.35, t * 0.7, t * 0.7); }
                break;
            case "veins":
                ctx.strokeStyle = col.light;
                ctx.lineWidth = Math.max(1, 1.5 * u);
                for (let i = 0; i < 4; i++) {
                    const p = (S * (i + 0.5)) / 4;
                    ctx.beginPath(); ctx.moveTo(x + p - t, y + t * 0.2); ctx.quadraticCurveTo(x + p, y + t * 1.1, x + p + t, y + t * 0.3); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(x + p - t, y + S - t * 0.2); ctx.quadraticCurveTo(x + p, y + S - t * 1.1, x + p + t, y + S - t * 0.3); ctx.stroke();
                }
                for (const [cx, cy] of mids) dot(cx, cy, t * 0.2, col.dark, null);
                break;
            case "bars": // reeds, or the bars of a tomb niche
                ctx.fillStyle = col.dark;
                for (let i = 0; i < 3; i++) {
                    const off = t * (0.2 + 0.28 * i);
                    ctx.fillRect(x + off, y + t, Math.max(1, t * 0.12), S - 2 * t);
                    ctx.fillRect(x + S - off - t * 0.12, y + t, Math.max(1, t * 0.12), S - 2 * t);
                }
                for (const [cx, cy] of corners) dot(cx, cy, t * 0.26, col.light, col.dark);
                break;
            case "beads": // trinkets strung along the top
                for (let i = 0; i <= 6; i++) dot(x + t + ((S - 2 * t) * i) / 6, y + m, t * 0.22, i % 2 ? col.light : col.dark, col.dark);
                for (const [cx, cy] of [corners[2], corners[3]]) dot(cx, cy, t * 0.28, col.light, col.dark);
                break;
            default:
                break;
        }
    }

    /**
     * Draw a portrait in a culture's code-drawn frame (UF_GenFrame) into bitmap at (x, y), S x S: the culture's background,
     * then inner(ox, oy, os) draws the face into the opening's box, then the frame band over it (the opening's shape cut
     * out) with its marks. culture: a culture id or a faces.cultures key ("default"). Returns the style id used.
     */
    Factions.drawPortrait = function(bitmap, x, y, S, culture, inner) {
        const style = Factions.faceStyle(culture) || { id: "default", standIn: { shape: "square", ornament: "none", thickness: 0.1, colors: { frame: "#5a4a36", light: "#a89272", dark: "#221a10", back: "#14110d" } } };
        const s = style.standIn, col = s.colors;
        const ctx = bitmap.context;
        const t = Math.max(3, Math.round(S * clamp(Number(s.thickness) || 0.1, 0.04, 0.2)));
        const ox = x + t, oy = y + t, os = S - t * 2;
        ctx.save();
        ctx.fillStyle = col.back;
        ctx.fillRect(x, y, S, S);
        ctx.restore();
        if (typeof inner === "function") inner(ox, oy, os);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, S, S);
        openingPath(ctx, s.shape, ox, oy, os, os);
        ctx.fillStyle = col.frame;
        ctx.fill("evenodd");
        const lw = Math.max(1, Math.round(S / 72));
        ctx.lineWidth = lw;
        ctx.beginPath();
        openingPath(ctx, s.shape, ox, oy, os, os);
        ctx.strokeStyle = col.dark;
        ctx.stroke();
        ctx.strokeStyle = col.light;
        ctx.beginPath();
        ctx.moveTo(x + lw / 2, y + S - lw);
        ctx.lineTo(x + lw / 2, y + lw / 2);
        ctx.lineTo(x + S - lw, y + lw / 2);
        ctx.stroke();
        ctx.strokeStyle = col.dark;
        ctx.beginPath();
        ctx.moveTo(x + S - lw / 2, y + lw);
        ctx.lineTo(x + S - lw / 2, y + S - lw / 2);
        ctx.lineTo(x + lw, y + S - lw / 2);
        ctx.stroke();
        frameOrnament(ctx, s.ornament, x, y, S, t, col);
        ctx.restore();
        if (bitmap._baseTexture && bitmap._baseTexture.update) bitmap._baseTexture.update();
        return style.id;
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "skins", on request: run_tests.js skins)

    const _Scene_Boot_start_skins = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start_skins.call(this);
        if (window.UF.Test && UF.Test.active) UF.Test.suite("skins", skinChecks, { isDefault: false });
    };

    async function skinChecks(t) {
        const W = UF.World, Talk = UF.Talk, Sheet = UF.Sheet, Tm = UF.Time;
        await t.waitUntil(() => !!(UF.World && UF.World.state && Factions.player() && skinsCfg() && facesCfg() && SceneManager._scene instanceof Scene_Map && UF.World.currentArea()), 10000, "map and world ready").catch(() => {});
        const scene = SceneManager._scene;
        const pf = W && W.state ? Factions.player() : null;
        const cfg = skinsCfg(), fcfg = facesCfg();
        const ready = !!(pf && cfg && fcfg && scene instanceof Scene_Map && W.currentArea());
        const NAMES = ["player_skin", "cultures_differ", "stranger_in_talk", "fallback_default", "text_readable", "by_culture", "fallback", "no_errors"];
        const check = (n, ok, detail) => (n === "by_culture" || n === "fallback" ? t.check(`faces.${n}`, ok, detail) : t.check(n, ok, detail));
        if (!ready) {
            for (const n of NAMES) check(n, false, `not ready: player faction ${!!pf}, catalog skins ${!!cfg}, faces ${!!fcfg}, map scene ${scene instanceof Scene_Map}`);
            return;
        }
        const errors0 = t.errorsSoFar().length;
        const fx = { culture: [pf, Object.prototype.hasOwnProperty.call(pf, "culture"), pf.culture], units: [], relations: [], patches: [], paused: !!(Tm && Tm.paused), sel: null };
        const setCulture = (f, c) => {
            if (!fx.cultureOf) fx.cultureOf = new Map();
            if (!fx.cultureOf.has(f)) fx.cultureOf.set(f, [Object.prototype.hasOwnProperty.call(f, "culture"), f.culture]);
            if (c === null) delete f.culture;
            else f.culture = c;
        };
        const patch = (obj, key, value) => {
            fx.patches.push([obj, key, Object.prototype.hasOwnProperty.call(obj, key), obj[key]]);
            obj[key] = value;
        };
        const baseSkin = ImageManager.loadSystem(cfg.base || "Window");
        const px = (b, x, y) => {
            const d = b.context ? b.context.getImageData(x, y, 1, 1).data : null;
            return d ? [d[0], d[1], d[2], d[3]] : [0, 0, 0, 0];
        };
        const canvasOf = b => b; // skins are ready here (stand-ins are canvases; Window.png loaded at boot)
        // Mean colour of the opaque pixels of a rect (r, g, b, count).
        const mean = (b, x, y, w, h) => {
            const d = b.context.getImageData(x, y, w, h).data;
            let r = 0, g = 0, bl = 0, n = 0;
            for (let i = 0; i < d.length; i += 4) if (d[i + 3] >= 128) { r += d[i]; g += d[i + 1]; bl += d[i + 2]; n++; }
            return n ? [r / n, g / n, bl / n, n] : [0, 0, 0, 0];
        };
        const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
        const hex = c => `#${c.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
        const cultures = Object.keys(cfg.cultures || {});
        const playable = (Factions.config().species || []).filter(s => s.playable !== false).map(s => s.id);
        const others = c => cultures.filter(x => x !== c && !(cfg.cultures[x] && cfg.cultures[x].like));

        try {
            if (Tm && !Tm.paused) Tm.pause();
            if (window.$colonyManager && $colonyManager.deselect) $colonyManager.deselect();
            const area = W.currentArea();
            const cols = W.units().filter(u => u.area && u.area.x === area.x && u.area.y === area.y && u.data && u.data.kind === "colonist" && W.eventOf(u.id));
            const col = cols[0] || null;

            // skins.player_skin: the player's windows use the player's culture's skin, and follow a faction change and a
            // loaded save. Also the three screenshots of the character sheet under three player cultures.
            {
                const why = [], seen = [];
                const sheetWin = Sheet && Sheet.window ? Sheet.window() : null;
                if (col && Sheet) Sheet.open(col.id);
                await t.waitFrames(3);
                const own = Factions.cultureOf(pf);
                const shots = [own].concat(playable.filter(c => c !== own)).slice(0, 3);
                for (const c of shots) {
                    setCulture(pf, c);
                    await t.waitFrames(3); // Scene_Map.update compares the player's skin every frame
                    const want = Factions.skinFor(pf);
                    const probe = new Window_Base(new Rectangle(0, 0, 120, 60));
                    const info = Factions.skinInfo(c);
                    const ok = !!sheetWin && sheetWin.windowskin === want && probe.windowskin === want && want === Factions.skinFor(c) && (info.source === "base" || want !== baseSkin);
                    seen.push(`${c}: skin ${info.id}/${info.source}, panel ${sheetWin && sheetWin.windowskin === want ? "yes" : "NO"}, new window ${probe.windowskin === want ? "yes" : "NO"}`);
                    probe.destroy();
                    if (!ok) why.push(`${c}: the windows do not show its skin`);
                    await t.waitFrames(20); // the panel redraws its face on its next check (every 15 frames)
                    if (Sheet && col) {
                        await t.waitUntil(() => Sheet.pending() === 0, 4000, "the panel's face").catch(() => {});
                        await t.waitFrames(2);
                    }
                    t.screenshot(`sheet_${c}`);
                }
                // A faction change: the player becomes another faction of another culture (for one comparison).
                const st = factionList();
                const other = st.list.find(f => !f.isPlayer && cultureOfFaction(f) !== Factions.cultureOf(pf) && Factions.skinInfo(f).key !== Factions.skinInfo(pf).key);
                let factionNote = "no other faction with another skin";
                if (other) {
                    // Switched and switched back within one frame (no other system sees it), then the comparison run by hand.
                    const pid = st.playerId;
                    st.playerId = other.id;
                    let got = null, okF = false;
                    try {
                        Factions.syncSkins(scene);
                        got = sheetWin ? sheetWin.windowskin : null;
                        okF = !!got && got === Factions.skinFor(other);
                    } finally {
                        st.playerId = pid;
                        Factions.syncSkins(scene);
                    }
                    factionNote = `player faction -> ${other.name} (${cultureOfFaction(other)}, skin ${Factions.skinInfo(other).id}): panel skin ${okF ? "followed" : "DID NOT follow"}`;
                    if (!okF) why.push(factionNote);
                }
                // A loaded save replaces UF.World.state (UF_World's extractSaveContents); the next comparison applies its skin.
                const st0 = W.state;
                const copy = JsonEx.parse(JsonEx.stringify(st0));
                const cf = copy.factions.list.find(f => f.id === copy.factions.playerId);
                const loadCulture = playable.find(c => c !== Factions.cultureOf(pf) && Factions.skinInfo(c).key !== Factions.skinInfo(pf).key) || "dwarf";
                cf.culture = loadCulture;
                let loadNote;
                W.state = copy;
                try {
                    Factions.syncSkins(scene);
                    const got = sheetWin ? sheetWin.windowskin : null;
                    const okL = !!got && got === Factions.skinFor(loadCulture);
                    loadNote = `a loaded state (UF.World.state replaced) whose player is ${loadCulture}: panel skin ${okL ? "followed" : "DID NOT follow"}`;
                    if (!okL) why.push(loadNote);
                } finally {
                    W.state = st0;
                    Factions.syncSkins(scene);
                }
                check("player_skin", why.length === 0, `${why.length ? `PROBLEMS: ${why.join("; ")} | ` : ""}${seen.join("; ")}; ${factionNote}; ${loadNote}; colonist ${col ? col.name : "none"}`);
                setCulture(pf, fx.culture[1] ? fx.culture[2] : null);
                await t.waitFrames(2);
            }

            // Delivered skin files load asynchronously; reading a loading Bitmap's canvas would leave it empty.
            await t.waitUntil(() => cultures.concat(["default"]).every(c => Factions.skinFor(c).isReady()), 8000, "every culture's skin").catch(() => {});
            // skins.cultures_differ: every culture with a recipe or a file of its own has a frame unlike every other.
            {
                const rows = [];
                for (const c of cultures) {
                    const e = cfg.cultures[c];
                    if (!e || e.like) continue;
                    const b = canvasOf(Factions.skinFor(c));
                    rows.push({ c, key: Factions.skinInfo(c).key, frame: mean(b, 96, 0, 96, 96), back: mean(b, 0, 0, 96, 96), cursor: mean(b, 96, 96, 48, 48) });
                }
                let min = Infinity, minPair = "";
                const same = [];
                for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
                    const a = rows[i], b = rows[j];
                    const dd = dist(a.frame, b.frame) + dist(a.back, b.back);
                    if (dd < min) { min = dd; minPair = `${a.c}/${b.c}`; }
                    if (dd < 30) same.push(`${a.c}=${b.c} (${dd.toFixed(0)})`);
                }
                check("cultures_differ", rows.length >= 2 && same.length === 0,
                    `${rows.length} culture skins; closest pair ${minPair} differs by ${min.toFixed(0)} (frame + back mean RGB distance, want >= 30)${same.length ? `; TOO CLOSE: ${same.join(", ")}` : ""}; frames ${rows.map(r => `${r.c} ${hex(r.frame)}`).join(", ")}`);
            }

            // skins.text_readable: the text colour row untouched, and the normal and system text colours readable on each skin's back.
            {
                const baseC = canvasOf(baseSkin);
                const lum = c => {
                    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
                    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
                };
                const contrast = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
                const normal = hexRgb(ColorManager.normalColor()), system = hexRgb(ColorManager.systemColor());
                const bad = [], lines = [];
                for (const c of cultures.concat(["default"])) {
                    const b = canvasOf(Factions.skinFor(c));
                    let changed = 0;
                    for (let n = 0; n < 32; n++) {
                        const x = 96 + (n % 8) * 12 + 6, y = 144 + Math.floor(n / 8) * 12 + 6;
                        if (dist(px(b, x, y), px(baseC, x, y)) > 0) changed++;
                    }
                    // What text sits on: the stretched back part, then the tiled part over it (RMMZ's Window._refreshBack).
                    const back = mean(b, 0, 0, 96, 96), tile = b.context.getImageData(0, 96, 96, 96).data;
                    let r = 0, g = 0, bl = 0, n = 0;
                    for (let i = 0; i < tile.length; i += 4) {
                        const a = tile[i + 3] / 255;
                        r += tile[i] * a + back[0] * (1 - a); g += tile[i + 1] * a + back[1] * (1 - a); bl += tile[i + 2] * a + back[2] * (1 - a); n++;
                    }
                    const under = [r / n, g / n, bl / n];
                    const cn = contrast(normal, under), cs = contrast(system, under);
                    lines.push(`${c} ${hex(under)} ${cn.toFixed(1)}:1/${cs.toFixed(1)}:1`);
                    if (changed || cn < 4.5 || cs < 3) bad.push(`${c}: ${changed} text colours changed, normal ${cn.toFixed(2)}:1 (want >= 4.5), system ${cs.toFixed(2)}:1 (want >= 3)`);
                }
                check("text_readable", bad.length === 0, `${bad.length ? `PROBLEMS: ${bad.join("; ")} | ` : ""}normal ${ColorManager.normalColor()}, system ${ColorManager.systemColor()} on each skin's back (mean under the text): ${lines.join(", ")}`);
            }

            // skins.fallback_default: no entry -> the default skin; an entry whose file is missing -> its stand-in, and the
            // missing file is never loaded; an entry whose file exists -> the file.
            {
                const why = [];
                const none = Factions.skinInfo("TEST_nobody");
                const noneBmp = Factions.skinFor("TEST_nobody");
                const defFile = cfg.default && cfg.default.file ? cfg.default.file : null;
                const defOk = none.id === "default" && (defFile ? noneBmp === ImageManager.loadSystem(defFile) : noneBmp === baseSkin);
                if (!defOk) why.push(`no entry: ${none.id}/${none.source}`);
                const cands = cultures.filter(c => cfg.cultures[c] && !cfg.cultures[c].like && cfg.cultures[c].recipe && cfg.cultures[c].file);
                const probe = cands.find(c => !assetExists(`img/system/${cfg.cultures[c].file}.png`)) || null;
                let missNote = "every culture has its file", fileNote = "";
                if (probe) {
                    const info = Factions.skinInfo(probe);
                    const loaded = Object.keys(ImageManager._cache || {}).some(k => k.includes(`${cfg.cultures[probe].file}.png`));
                    missNote = `${probe} (file ${cfg.cultures[probe].file} missing): ${info.source}, loaded the missing file ${loaded}`;
                    if (info.source !== "stand-in" || loaded) why.push(missNote);
                    patch(cfg.cultures[probe], "file", cfg.base || "Window");
                    const withFile = Factions.skinInfo(probe);
                    const fb = Factions.skinFor(probe);
                    fileNote = `; the same entry pointed at an existing file (${cfg.base || "Window"}): ${withFile.source}, the file's bitmap ${fb === ImageManager.loadSystem(cfg.base || "Window")}`;
                    if (withFile.source !== "file" || fb !== ImageManager.loadSystem(cfg.base || "Window")) why.push(fileNote);
                    const p = fx.patches.pop();
                    if (p[2]) p[0][p[1]] = p[3]; else delete p[0][p[1]];
                }
                check("fallback_default", why.length === 0, `${why.length ? `PROBLEMS: ${why.join("; ")} | ` : ""}culture TEST_nobody: entry ${none.id}, ${none.source}; ${missNote}${fileNote}`);
            }

            // skins.stranger_in_talk: a talk with a stranger of another culture: each side's portrait in its own culture's
            // skin frame and face frame.
            {
                const why = [];
                let detail = "";
                const st = factionList();
                const own = Factions.cultureOf(pf);
                let strangerF = st.list.find(f => !f.isPlayer && cultureOfFaction(f) !== own && Factions.skinInfo(f).key !== Factions.skinInfo(pf).key);
                if (!strangerF) {
                    strangerF = st.list.find(f => !f.isPlayer);
                    setCulture(strangerF, others(own).find(c => Factions.skinInfo(c).key !== Factions.skinInfo(pf).key) || "dwarf");
                }
                fx.relations.push([strangerF.id, Factions.relation("player", strangerF.id)]);
                Factions.setRelation("player", strangerF.id, 30);
                const anchor = col || W.units().find(u => u.area && u.area.x === area.x && u.area.y === area.y && W.eventOf(u.id));
                const peopleImage = sp => {
                    const p = catalogOf().people && catalogOf().people[sp];
                    return p && Array.isArray(p.images) && p.images[0] ? p.images[0] : "$UF_Stock_People1_0";
                };
                const stranger = W.addUnit({ name: "TEST_skinStranger", image: { characterName: peopleImage(strangerF.species), characterIndex: 0 }, area, x: anchor.x + 4, y: anchor.y + 2, dir: 2, snapToFree: 6,
                    data: { kind: "person", faction: strangerF.id, species: strangerF.species, gender: "female", age: 34, ai: null } });
                fx.units.push(stranger);
                await t.waitUntil(() => !!W.eventOf(stranger.id), 3000, "the stranger's event").catch(() => {});
                if (Talk && Talk.open(stranger.id)) {
                    await t.waitUntil(() => { const l = Talk.layout(); return !!l && !!l.other.faceInfo && !l.other.faceInfo.pending && !!l.player.faceInfo && !l.player.faceInfo.pending; }, 5000, "the talk's portraits").catch(() => {});
                    await t.waitFrames(4);
                    const l = Talk.layout(), sc = Talk.screen();
                    const o = l.other.faceInfo || {}, p = l.player.faceInfo || {};
                    const wantO = Factions.cultureOf(stranger), wantP = Factions.cultureOf(pf);
                    const edgeO = mean(sc.other.face.bitmap, 0, 0, Talk.FACE, 6), edgeP = mean(sc.player.face.bitmap, 0, 0, Talk.FACE, 6);
                    const ringO = mean(sc.other.face.bitmap, 6, 14, 6, Talk.FACE - 28), ringP = mean(sc.player.face.bitmap, 6, 14, 6, Talk.FACE - 28);
                    const dd = dist(edgeO, edgeP) + dist(ringO, ringP);
                    if (o.skin !== wantO) why.push(`stranger's side in ${o.skin} skin, want ${wantO}`);
                    if (p.skin !== wantP) why.push(`your side in ${p.skin} skin, want ${wantP}`);
                    if (!o.skinDrawn || !p.skinDrawn) why.push(`skin frames drawn: stranger ${o.skinDrawn}, you ${p.skinDrawn}`);
                    if (dd < 30) why.push(`the two sides' frames look alike (edge + band distance ${dd.toFixed(0)}, want >= 30)`);
                    detail = `stranger ${stranger.name} of ${strangerF.name} (${wantO}): portrait ${o.drawn} ${o.sheet ? `${o.sheet}:${o.index}` : o.name || ""} (${o.from}), face frame ${o.frame}, skin ${o.skin}; `
                        + `your side (#${l.player.unitId}, ${wantP}): ${p.drawn} (${p.from}), face frame ${p.frame}, skin ${p.skin}; edge ${hex(edgeO)} vs ${hex(edgeP)}, band ${hex(ringO)} vs ${hex(ringP)} (distance ${dd.toFixed(0)})`;
                    t.screenshot("talk_stranger");
                    Talk.closeNow();
                    await t.waitFrames(2);
                } else why.push(`the talk did not open (mode ${Talk ? Talk.modeOf(stranger) : "no UF_Talk"})`);
                check("stranger_in_talk", why.length === 0, `${why.length ? `PROBLEMS: ${why.join("; ")} | ` : ""}${detail}`);
            }

            // faces.by_culture: two people of one species and two cultures get their cultures' portraits (sheets or frames),
            // in the talk and in the panel alike.
            {
                const why = [];
                const cs = playable.filter(c => cultureEntry(fcfg, c)).slice(0, 2);
                const sp = (factionList().list.find(f => f.isPlayer) || {}).species || "human";
                const mk = (c, i) => {
                    const u = W.addUnit({ name: `TEST_face_${c}`, image: { characterName: "$UF_Stock_People1_0", characterIndex: 0 }, area, x: (col ? col.x : 10) - 3 - i, y: (col ? col.y : 10) + 3, dir: 2, snapToFree: 6,
                        data: { kind: "person", culture: c, species: sp, gender: "male", age: 30, ai: null } });
                    fx.units.push(u);
                    return u;
                };
                const us = cs.map(mk);
                const rows = us.map((u, i) => {
                    const tp = Talk ? Talk.portraitOf(u) : null;
                    const m = Sheet ? Sheet.buildModel({ kind: "unit", unitId: u.id }) : null;
                    const sp2 = m ? m.picture : null;
                    const expect = cultureEntry(fcfg, cs[i]).id;
                    const viaSheet = p => String(p.from || "").indexOf("faces.") === 0;
                    const talkOk = !!tp && (viaSheet(tp) ? tp.culture === expect : tp.frame === expect);
                    const sheetOk = !!sp2 && (viaSheet(sp2) ? sp2.culture === expect : sp2.frame === expect);
                    if (!talkOk) why.push(`talk portrait of the ${cs[i]} person: ${JSON.stringify(tp)}`);
                    if (!sheetOk) why.push(`panel picture of the ${cs[i]} person: ${JSON.stringify(sp2)}`);
                    return { c: cs[i], tp, sp2 };
                });
                // Drawn: the two frames differ in pixels.
                const bmps = rows.map(r => {
                    const b = new Bitmap(144, 144);
                    Factions.drawPortrait(b, 0, 0, 144, r.tp && r.tp.frame ? r.tp.frame : r.c, null);
                    return b;
                });
                const band = bmps.map(b => mean(b, 0, 0, 144, 12));
                const ddf = band.length === 2 ? dist(band[0], band[1]) : 0;
                bmps.forEach(b => b.destroy());
                const differ = rows.length === 2 && (rows[0].tp && rows[1].tp) && (rows[0].tp.sheet !== rows[1].tp.sheet || rows[0].tp.frame !== rows[1].tp.frame) && ddf >= 30;
                if (!differ) why.push(`the two portraits do not differ (frames ${rows.map(r => r.tp && r.tp.frame).join(" vs ")}, band distance ${ddf.toFixed(0)})`);
                check("by_culture", cs.length === 2 && why.length === 0, `${why.length ? `PROBLEMS: ${why.join("; ")} | ` : ""}two ${sp} people of cultures ${cs.join(" and ")}: `
                    + rows.map(r => `${r.c}: talk ${r.tp ? `${r.tp.sheet || r.tp.name}${r.tp.sheet ? `:${r.tp.index}` : ""} from ${r.tp.from}, frame ${r.tp.frame}` : "none"}; panel ${r.sp2 ? `${r.sp2.sheet || r.sp2.type} frame ${r.sp2.frame}` : "none"}`).join(" | ")
                    + `; frame band mean distance ${ddf.toFixed(0)}`);
            }

            // faces.fallback: the chain culture sheet -> species sheet -> today's portrait in the culture's frame.
            {
                const why = [], notes = [];
                const mk = (nm, data) => {
                    const u = W.addUnit({ name: nm, image: { characterName: "$UF_Stock_People1_0", characterIndex: 0 }, area, x: (col ? col.x : 10) + 3, y: (col ? col.y : 10) - 3, dir: 2, snapToFree: 6, data: Object.assign({ kind: "person", gender: "male", age: 30, ai: null }, data) });
                    fx.units.push(u);
                    return u;
                };
                // (1) No sheets for the culture: today's portrait in the culture's frame.
                const bare = cultures.find(c => cultureEntry(fcfg, c) && !Factions.cultureFace({ id: 1, data: { kind: "person", species: c, culture: c, age: 30 } })) || null;
                if (bare) {
                    const u = mk("TEST_face_bare", { species: bare, culture: bare });
                    const tp = Talk.portraitOf(u);
                    notes.push(`${bare} (no sheets): ${tp.sheet ? `${tp.sheet}:${tp.index}` : tp.name} from ${tp.from}, frame ${tp.frame}`);
                    if (!(tp.frame === cultureEntry(fcfg, bare).id && String(tp.from || "").indexOf("faces.") !== 0)) why.push(`no-sheet ${bare}: ${JSON.stringify(tp)}`);
                } else notes.push("every culture has sheets");
                // (2) The species' sheets when the culture has none (catalog faces.species, when its file exists).
                const spIds = Object.keys(fcfg.species || {}).filter(s => cultureEntry(fcfg, s));
                const spWith = spIds.find(s => {
                    const g = fcfg.species[s] && (fcfg.species[s].male || fcfg.species[s].female);
                    const e = g && (g.adult || g.elder);
                    return e && e.sheet && assetExists(`img/faces/${e.sheet}.png`);
                });
                if (spWith) {
                    const gender = fcfg.species[spWith].male ? "male" : "female";
                    const u = mk("TEST_face_species", { species: spWith, culture: spWith, gender });
                    const tp = Talk.portraitOf(u);
                    notes.push(`${spWith} (species sheets): ${tp.sheet}:${tp.index} from ${tp.from}, frame ${tp.frame}`);
                    if (tp.from !== "faces.species" || tp.frame) why.push(`species ${spWith}: ${JSON.stringify(tp)}`);
                } else notes.push("no species sheet on disk");
                // (3) The culture's sheets win when they exist (the pattern pointed at existing sheets for the check).
                const cc = cultures.find(c => cultureEntry(fcfg, c) && cultureEntry(fcfg, c).id === c) || "human";
                patch(fcfg, "pattern", "People{n}");
                const u3 = mk("TEST_face_culture", { species: cc, culture: cc, gender: "female" });
                const tp3 = Talk.portraitOf(u3);
                const slot = (fcfg.layout || {}).adult_female;
                notes.push(`${cc} with culture sheets (pattern People{n} for the check): ${tp3.sheet}:${tp3.index} from ${tp3.from}, frame ${tp3.frame}`);
                if (tp3.from !== "faces.culture" || !/^People[1-4]$/.test(tp3.sheet || "") || tp3.index !== slot || tp3.frame) why.push(`culture sheets for ${cc}: ${JSON.stringify(tp3)}`);
                const p = fx.patches.pop();
                if (p[2]) p[0][p[1]] = p[3]; else delete p[0][p[1]];
                // (4) Not a person (a hare): no frame.
                const hare = W.units().find(u => u.data && u.data.kind === "creature");
                if (hare) {
                    const tp = Talk.portraitOf(hare);
                    notes.push(`${hare.data.species} (a creature): frame ${tp.frame || "none"}`);
                    if (tp.frame) why.push(`creature framed: ${JSON.stringify(tp)}`);
                }
                check("fallback", why.length === 0, `${why.length ? `PROBLEMS: ${why.join("; ")} | ` : ""}${notes.join("; ")}`);
            }
        } catch (e) {
            t.check("skins_completed", false, `threw: ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" / ") : e}`);
        } finally {
            if (Talk && Talk.isOpen && Talk.isOpen()) Talk.closeNow();
            if (Sheet && Sheet.close) Sheet.close();
            for (const u of fx.units) if (W.unit(u.id)) W.removeUnit(u.id);
            for (const [id, v] of fx.relations) Factions.setRelation("player", id, v, "test over");
            for (const p of fx.patches.reverse()) { if (p[2]) p[0][p[1]] = p[3]; else delete p[0][p[1]]; }
            if (fx.cultureOf) for (const [f, [had, v]] of fx.cultureOf) { if (had) f.culture = v; else delete f.culture; }
            if (Tm && !fx.paused && Tm.paused) Tm.resume();
            await t.waitFrames(3);
        }
        // test-only: a recorded error, what the check must catch (a real uncaught error stops RMMZ's frame loop)
        if (provoked("no_errors")) UF.Test.errors.push("window.error: TEST provoked error (UF_Factions TestProvoke)");
        const errs = t.errorsSoFar().slice(errors0);
        t.check("no_errors", errs.length === 0, errs.length ? `${errs.length} error(s), first: ${errs[0]}` : "none during the skins checks");
    }
})();
