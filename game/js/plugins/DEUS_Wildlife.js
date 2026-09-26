//=============================================================================
// DEUS_Wildlife.js - Wild creatures: herds placed with the world by biome and region, prey herds near every campfire, wandering, fleeing hunters
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Wildlife] Wild fauna populations, grazing herds, predator/prey behaviors, sensory awareness, and flee AI.
 * @author UF project
 * @base DEUS_World
 * @orderAfter DEUS_WorldGen
 * @orderAfter DEUS_Objects
 * @orderAfter DEUS_History
 *
 * @help
 * Reads the "wildlife" section of data/UF_WorldCatalog.json. On world:created
 * (after UF_Factions and UF_History have run) it places herds of creatures as
 * world units (UF.World.addUnit) in every area:
 *
 *   - the area is sampled on an 8x8 grid (UF.WorldGen.cellInfo): biome and
 *     region tier of each of the 64 points (the dominant tiers are reported);
 *   - per species: expected = sum(weight[biome] x share) x savageryScale,
 *     summed point by point with each point's own savagery tier and only at
 *     points whose region the species allows (minSavagery, alignment);
 *     herds = floor(expected x K + seeded roll), K scaled so a typical area
 *     totals wildlife.herdsPerArea herds;
 *   - each herd: a seeded center on walkable land where the species has
 *     weight and its region rule holds, not on a blocking object, at least
 *     startSafeRadius (predators and monsters: predatorFreeRadius) from the
 *     start; members within 3 cells;
 *   - the start kit (start.kit.wildlife, VISION V67): for every faction's
 *     campfire one herd per kit group (2-3 deer or boar, 2-4 hares or
 *     fowl) 24-40 cells from it in a seeded direction; no predator or
 *     monster within start.kit.wildlife.predatorFree (20) of any campfire,
 *     and no creature on a camp's nine cells; lair sites from
 *     UF.History.sites() (when it exists): one extra monster herd each.
 *
 * Runtime: a throttled wander AI for every unit with data.ai === "wander"
 * (creatures and faction people) in the area on screen or its neighbors;
 * prey whose species flees steps away from a hunter (a "hunt" job in
 * UF.World.state.jobs targeting it) within 6 cells; Sprite_Character
 * applies unit.data.tint; unit events with data.through pass through
 * everything (fliers).
 *
 * All randomness is seeded (hash32 of seed, unit id and frame). Nothing is
 * kept outside UF.World.state / unit.data except caches.
 *
 * API, events, save data and checks: docs/systems/UF_Wildlife.md
 * Contract: docs/design/WORLD_ARCHITECTURE.md sections 2.4 and 5.7
 *
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const catalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const WorldGen = () => (window.UF && UF.WorldGen) || null;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;

    // One salt per roll, so every decision is independent of the others.
    const SALT = Object.freeze({ herds: 0x1d, center: 0x1e, member: 0x1f, kit: 0x20, lair: 0x21, wander: 0x77, wanderGoal: 0x78, graze: 0x79, predator: 0x7a, sleep: 0x7b, alarm: 0x7c });
    const WANDER_EVERY = 90;   // map updates between wander decisions
    const WANDER_CHANCE = 0.35;
    const FLEE_EVERY = 30;     // map updates between flee steps: a fleeing hare is slower than a walking hunter
    const FLEE_RANGE = 6;      // cells: a hunter closer than this makes prey run
    const PREDATOR_EVERY = 60; // map updates between predator hunting decisions
    const PREDATOR_SIGHT = 10; // cells: scent/sight radius for detecting prey
    const PREDATOR_FEAR_RANGE = 7; // cells: prey flees awake predator
    const COLONIST_FEAR_RANGE = 5; // cells: prey flees approaching colonist
    const HERD_ALARM_RANGE = 5;// cells: alarm spreads across herd members
    const GRAZE_EVERY = 90;    // map updates between graze checks
    const HERD_SPREAD = 3;     // members stand within this many cells of the herd center
    const CENTER_TRIES = 96;   // seeded candidate cells per herd before the herd is dropped
    const MEMBER_TRIES = 12;
    const SAMPLE_GRID = 8;     // 8x8 = 64 sample points per area
    const PREY_KINDS = Object.freeze(["grazer", "vermin", "flier"]);
    const DANGEROUS_KINDS = Object.freeze(["predator", "monster"]);
    const KINDS = Object.freeze(PREY_KINDS.concat(DANGEROUS_KINDS));
    const DIRS4 = Object.freeze([[1, 0, 6], [-1, 0, 4], [0, 1, 2], [0, -1, 8]]);

    //-------------------------------------------------------------------------
    // Deterministic hashing (the same FNV + mix as UF_WorldGen). Never Math.random.

    const FNV_OFFSET = 2166136261 >>> 0;
    function fnv(h, part) {
        let v = part >>> 0;
        for (let i = 0; i < 4; i++) {
            h ^= v & 255;
            h = Math.imul(h, 16777619) >>> 0;
            v >>>= 8;
        }
        return h;
    }
    function hash32(...parts) {
        let h = FNV_OFFSET;
        for (const p of parts) h = fnv(h, p);
        h ^= h >>> 15;
        h = Math.imul(h, 0x2c1b3c6d) >>> 0;
        return (h ^ (h >>> 12)) >>> 0;
    }
    const unit01 = (...parts) => hash32(...parts) / 4294967296;
    function mulberry32(a) {
        return () => {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const tintValue = hex => parseInt(String(hex).replace("#", ""), 16);

    //-------------------------------------------------------------------------
    // Species: the catalog list with index, kind checks and a biome weight lookup (copies; the catalog stays untouched)

    let speciesCache = null;
    function speciesList() {
        const cat = catalog();
        const src = (cat && cat.wildlife && cat.wildlife.species) || [];
        if (speciesCache && speciesCache.source === src) return speciesCache.list;
        const list = src.map((s, i) => Object.assign({}, s, {
            index: i,
            biomes: Object.assign({}, s.biomes || {}),
            tintValue: s.tint ? tintValue(s.tint) : 0xffffff,
            prey: PREY_KINDS.includes(s.kind),
            dangerous: DANGEROUS_KINDS.includes(s.kind)
        }));
        speciesCache = { source: src, list, byId: new Map(list.map(s => [s.id, s])) };
        return list;
    }
    const speciesById = id => {
        speciesList();
        return (speciesCache && speciesCache.byId.get(id)) || null;
    };
    const wildlifeConfig = () => (catalog() && catalog().wildlife) || {};

    // Region tiers from the catalog, in order (tame < wild < primeval).
    const tierIds = key => (((catalog() || {}).regions || {})[key] || []).map(t => t.id);
    const tierIndex = (key, id) => tierIds(key).indexOf(id);

    /** True when the species may live in a region { savagery, alignment }: minSavagery met, alignment matched. */
    function allowedInRegion(sp, region) {
        if (!region) return false;
        if (sp.minSavagery && tierIndex("savagery", region.savagery) < tierIndex("savagery", sp.minSavagery)) return false;
        if (sp.alignment && sp.alignment !== region.alignment) return false;
        return true;
    }

    // Mean summed weight of the unrestricted species over the land biomes: what "a typical area" carries.
    // herds per species = expected x (mid herdsPerArea / typical), so a typical area totals herdsPerArea herds.
    function herdScale() {
        const cat = catalog();
        const biomes = Object.keys((cat && cat.biomes) || {}).filter(id => typeof cat.biomes[id] === "object" && !/^(ocean|lake)_/.test(id));
        const base = speciesList().filter(s => !s.minSavagery && !s.alignment);
        let sum = 0;
        for (const b of biomes) for (const s of base) sum += s.biomes[b] || 0;
        const typical = biomes.length ? sum / biomes.length : 0;
        const [h0, h1] = wildlifeConfig().herdsPerArea || [14, 24];
        return typical > 0 ? ((h0 + h1) / 2) / typical : 0;
    }

    //-------------------------------------------------------------------------
    // World geometry helpers

    function worldDims(st) {
        const size = st.size;
        const sa = st.startArea;
        const c0 = sa ? campsOf(st).find(c => (c.z || 0) === 0 && c.area && c.area.x === sa.x && c.area.y === sa.y) : null;
        return {
            size,
            startGX: c0 ? sa.x * size + c0.x : (sa ? sa.x * size + Math.floor(size / 2) : Math.floor(size / 2)),
            startGY: c0 ? sa.y * size + c0.y : (sa ? sa.y * size + Math.floor(size / 2) : Math.floor(size / 2))
        };
    }
    const distToStart = (d, gx, gy) => Math.hypot(gx - d.startGX, gy - d.startGY);

    // The start kit (catalog start.kit.wildlife), normalised: { herds: [{ species: [ids], count: [lo, hi] | null }],
    // distance: [d0, d1], predatorFree }. The shape before 2026-09-19 afternoon ({ species, distance }) is one herd group.
    function kitConfig() {
        const cat = catalog();
        const k = (cat && cat.start && cat.start.kit && cat.start.kit.wildlife) || {};
        const herds = Array.isArray(k.herds) ? k.herds.filter(g => g && Array.isArray(g.species) && g.species.length).map(g => ({ species: g.species.slice(), count: Array.isArray(g.count) ? g.count.slice(0, 2) : null }))
            : Array.isArray(k.species) && k.species.length ? [{ species: k.species.slice(), count: null }] : [];
        return { herds, distance: Array.isArray(k.distance) ? k.distance : [24, 40], predatorFree: k.predatorFree === undefined ? 20 : Number(k.predatorFree) || 0 };
    }
    const kitSpeciesIds = () => [...new Set(kitConfig().herds.flatMap(g => g.species))];

    // Every faction's campfire (UF_History's year-1 camps, VISION V4): [{ id, faction, area, x, y }]. Empty for a world
    // without a year-1 history (an older save, a synthetic test state). Cached per state.
    let campCache = { st: null, h: null, list: [] };
    function campsOf(st) {
        const h = st && st.history;
        if (campCache.st === st && campCache.h === h) return campCache.list;
        const list = h && h.founders && Array.isArray(h.sites) ? h.sites.filter(s => s && s.bare && !s.ruined && s.area).map(s => ({ id: s.id, faction: s.faction, area: { x: s.area.x, y: s.area.y }, x: s.x, y: s.y, z: typeof s.z === "number" ? s.z : (s.area && typeof s.area.z === "number" ? s.area.z : 0) })) : [];
        campCache = { st, h, list };
        return list;
    }
    // Camp rules for any creature cell: never on a camp's nine cells (the campfire and its eight founders); predators
    // and monsters at least kit.predatorFree (+ the herd spread) from every campfire.
    function campRuleOk(st, ax, ay, x, y, sp, z = 0) {
        const camps = campsOf(st);
        if (!camps.length) return true;
        const pf = sp.dangerous ? kitConfig().predatorFree + HERD_SPREAD : 0;
        for (const c of camps) {
            if (c.area.x !== ax || c.area.y !== ay || (c.z || 0) !== z) continue;
            if (Math.max(Math.abs(x - c.x), Math.abs(y - c.y)) <= 1) return false;
            if (pf > 0 && Math.hypot(x - c.x, y - c.y) < pf) return false;
        }
        return true;
    }

    // A cell in an area where this species may stand: walkable land, its biome has weight, its region allows it,
    // no blocking object (UF_Objects, when installed), at least minDist cells from the start, and the camp rules above.
    function cellOk(st, ax, ay, x, y, sp, minDist, ignoreBiome) {
        const d = worldDims(st);
        if (x < 0 || y < 0 || x >= d.size || y >= d.size) return false;
        const gx = ax * d.size + x, gy = ay * d.size + y;
        if (minDist > 0 && distToStart(d, gx, gy) < minDist) return false;
        if (!campRuleOk(st, ax, ay, x, y, sp)) return false;
        const WG = WorldGen();
        const c = WG && WG.cellInfo ? WG.cellInfo(gx, gy) : null;
        if (!c || !c.walkable) return false;
        if (!ignoreBiome && !(sp.biomes[c.biomeId] > 0)) return false;
        if (!allowedInRegion(sp, c.region)) return false;
        if (window.UF.Objects && UF.Objects.blocksIn && UF.Objects.blocksIn({ x: ax, y: ay }, x, y)) return false;
        return true;
    }

    //-------------------------------------------------------------------------
    // Planning (pure: same state, same plan). spawn() turns a plan into units.

    function areaSample(st, ax, ay) {
        const WG = WorldGen();
        const size = st.size;
        const shares = {}, sav = {}, al = {};
        const points = [];
        const n = SAMPLE_GRID;
        for (let j = 0; j < n; j++) {
            for (let i = 0; i < n; i++) {
                const x = Math.floor((i + 0.5) * size / n), y = Math.floor((j + 0.5) * size / n);
                const c = WG.cellInfo(ax * size + x, ay * size + y);
                if (!c) continue;
                shares[c.biomeId] = (shares[c.biomeId] || 0) + 1 / (n * n);
                sav[c.region.savagery] = (sav[c.region.savagery] || 0) + 1;
                al[c.region.alignment] = (al[c.region.alignment] || 0) + 1;
                points.push({ biomeId: c.biomeId, savagery: c.region.savagery, alignment: c.region.alignment });
            }
        }
        const dominant = counts => {
            const e = Object.entries(counts).sort((p, q) => (q[1] - p[1]) || (p[0] < q[0] ? -1 : 1));
            return e.length ? e[0][0] : null;
        };
        const toShares = counts => {
            const out = {};
            for (const k of Object.keys(counts)) out[k] = counts[k] / Math.max(1, points.length);
            return out;
        };
        return { shares, savagery: dominant(sav), alignment: dominant(al), savageryShares: toShares(sav), alignmentShares: toShares(al), points };
    }

    /**
     * Expected herds of a species in an area (before scaling): sum(weight[biome] x share) x savageryScale, evaluated
     * per sample point, so each point counts with its own tier and only where the species' region rule holds.
     * A tame start with wild outskirts keeps its outskirts' wildlife (and its monsters) instead of taking the
     * dominant tier for the whole area, which measured 8 % of seeds below 60 creatures (2026-09-18 seed sweep).
     */
    function expectedHerds(sp, sample) {
        const pts = sample.points || [];
        if (!pts.length) return 0;
        const scales = wildlifeConfig().savageryScale || {};
        let e = 0;
        for (const p of pts) {
            const w = sp.biomes[p.biomeId] || 0;
            if (!w || !allowedInRegion(sp, p)) continue;
            const s = scales[p.savagery];
            e += w * (s === undefined ? 1 : s);
        }
        return e / pts.length;
    }

    const minDistFor = sp => ((sp.dangerous ? wildlifeConfig().predatorFreeRadius : wildlifeConfig().startSafeRadius) || 0);

    function findHerdCenter(st, ax, ay, sp, herdIndex, minDist) {
        const rng = mulberry32(hash32(st.seed, SALT.center, ax, ay, sp.index, herdIndex));
        const size = st.size;
        for (let t = 0; t < CENTER_TRIES; t++) {
            const x = Math.floor(rng() * size), y = Math.floor(rng() * size);
            if (cellOk(st, ax, ay, x, y, sp, minDist + HERD_SPREAD, false)) return { x, y };
        }
        return null;
    }

    // Members: the center plus seeded cells within HERD_SPREAD that also suit the species (else they share the center).
    // size: [min, max] members instead of the species' herd range (the start kit's counts).
    function makeHerd(st, ax, ay, sp, herdIndex, center, minDist, extra, size) {
        const rng = mulberry32(hash32(st.seed, SALT.member, ax, ay, sp.index, herdIndex));
        const [mn, mx] = Array.isArray(size) ? size : Array.isArray(sp.herd) ? sp.herd : [1, 1];
        const n = Math.max(1, mn + Math.floor(rng() * (mx - mn + 1)));
        const cells = [{ x: center.x, y: center.y }];
        for (let k = 1; k < n; k++) {
            let cell = null;
            for (let t = 0; t < MEMBER_TRIES && !cell; t++) {
                const x = center.x + Math.floor(rng() * (2 * HERD_SPREAD + 1)) - HERD_SPREAD;
                const y = center.y + Math.floor(rng() * (2 * HERD_SPREAD + 1)) - HERD_SPREAD;
                if (cellOk(st, ax, ay, x, y, sp, minDist, false)) cell = { x, y };
            }
            cells.push(cell || { x: center.x, y: center.y });
        }
        const dirs = cells.map(() => [2, 4, 6, 8][Math.floor(rng() * 4)]);
        return Object.assign({ species: sp.id, area: { x: ax, y: ay }, home: { x: center.x, y: center.y }, cells, dirs }, extra || {});
    }

    function planArea(st, ax, ay, report) {
        const sample = areaSample(st, ax, ay);
        const K = herdScale();
        const herds = [];
        const perSpecies = {};
        for (const sp of speciesList()) {
            const e = expectedHerds(sp, sample);
            if (!(e > 0)) continue;
            const n = Math.floor(e * K + unit01(st.seed, SALT.herds, ax, ay, sp.index));
            if (n > 0) perSpecies[sp.id] = n;
            for (let h = 0; h < n; h++) {
                const minDist = minDistFor(sp);
                const center = findHerdCenter(st, ax, ay, sp, h, minDist);
                if (!center) {
                    report.dropped++;
                    continue;
                }
                herds.push(makeHerd(st, ax, ay, sp, h, center, minDist, { origin: "biome" }));
            }
        }
        report.samples[`${ax},${ay}`] = { savagery: sample.savagery, alignment: sample.alignment, savageryShares: sample.savageryShares, alignmentShares: sample.alignmentShares, shares: sample.shares, expectedHerds: perSpecies, K };
        return herds;
    }

    // The start kit (VISION V67, 2026-09-19 afternoon: every faction's area, not only the player's): for every campfire,
    // one herd per kit herd group (catalog start.kit.wildlife.herds: 2-3 deer or boar, 2-4 hares or fowl), each at
    // kit.distance from that campfire in a seeded direction and at least distance[0] from every other campfire, on land
    // where the species has weight. Species: a seeded pick among the group's species with weight in the camp's biome
    // (else among all of them); if it finds no cell in the ring, the group's other species, then any other prey species
    // that lives there (kitSubstitute); if none does, the preferred one on any walkable cell (flagged kitFallback, which
    // by_biome counts apart). A world without year-1 camps (an older save, a test
    // state) gets the groups around the start, as the kit did before.
    function planKit(st, report) {
        const kit = kitConfig();
        if (!kit.herds.length) return [];
        const d = worldDims(st);
        const mid = Math.floor(d.size / 2);
        const WG = WorldGen();
        const groundCamps = campsOf(st).filter(c => (c.z || 0) === 0);
        const rawD0 = kit.distance[0], rawD1 = kit.distance[1];
        const maxReach = Math.max(2, Math.floor(d.size / 2) - 2);
        const d0 = Math.min(rawD0, Math.max(1, Math.floor(maxReach * 0.5)));
        const d1 = Math.max(d0 + 1, Math.min(rawD1, maxReach));
        const out = [];
        groundCamps.forEach((camp, ci) => {
            const info = WG.cellInfo(camp.area.x * d.size + camp.x, camp.area.y * d.size + camp.y);
            kit.herds.forEach((g, gi) => {
                const listed = g.species.map(speciesById).filter(Boolean);
                if (!listed.length) return;
                const pickRng = mulberry32(hash32(st.seed, SALT.kit, camp.id | 0, gi, 0x5e1));
                const weighted = listed.filter(s => info && s.biomes[info.biomeId] > 0);
                const pool = weighted.length ? weighted : listed;
                const preferred = pool[Math.floor(pickRng() * pool.length)];
                // Then any other prey that lives in the ring (grazers, then vermin, then fliers): the catalog gives no deer,
                // boar, hare or fowl to many biomes (tropical grassland has aurochs and fowl, tundra wild sheep and hares).
                const substitutes = speciesList().filter(s => s.prey && !listed.includes(s)).sort((a, b) => PREY_KINDS.indexOf(a.kind) - PREY_KINDS.indexOf(b.kind) || a.index - b.index);
                const order = [preferred].concat(pool.filter(s => s !== preferred), listed.filter(s => !pool.includes(s)), substitutes);
                const others = groundCamps.filter(c => c !== camp && c.area.x === camp.area.x && c.area.y === camp.area.y);
                const search = (sp, ignoreBiome) => {
                    const rng = mulberry32(hash32(st.seed, SALT.kit, camp.id | 0, gi, sp.index, ignoreBiome ? 1 : 0));
                    for (let t = 0; t < 120; t++) {
                        const angle = rng() * Math.PI * 2, dist = d0 + rng() * (d1 - d0);
                        const x = Math.round(camp.x + Math.cos(angle) * dist), y = Math.round(camp.y + Math.sin(angle) * dist);
                        if (others.some(c => Math.hypot(x - c.x, y - c.y) < d0)) continue;
                        if (cellOk(st, camp.area.x, camp.area.y, x, y, sp, 0, ignoreBiome)) return { x, y };
                    }
                    return null;
                };
                const herdIndex = 0x4b17 + ci * 16 + gi;
                const extra = { origin: "kit", kit: true, kitCamp: camp.id | 0, kitGroup: gi };
                let herd = null;
                for (const sp of order) {
                    const center = search(sp, false);
                    if (center) { herd = makeHerd(st, camp.area.x, camp.area.y, sp, herdIndex, center, 0, listed.includes(sp) ? extra : Object.assign({}, extra, { kitSubstitute: true }), g.count); break; }
                }
                if (!herd) {
                    // No prey species lives anywhere in the ring (a desert, a glacier, a salt swamp): the group's species
                    // on any walkable cell, flagged, so the band still has animals to hunt (V67 over the biome table).
                    const center = search(order[0], true);
                    report.kitFallback = true;
                    if (center) herd = makeHerd(st, camp.area.x, camp.area.y, order[0], herdIndex, center, 0, Object.assign({}, extra, { kitFallback: true }), g.count);
                }
                if (herd) out.push(herd);
            });
        });
        return out;
    }

    // Lair sites (UF.History.sites(), when the history plugin provides them): one monster herd each, of a monster
    // species with weight in the lair's biome, subject to the same distance rule as any monster.
    function planLairs(st, report) {
        const H = window.UF.History;
        if (!H || typeof H.sites !== "function") return [];
        let sites;
        try {
            sites = H.sites() || [];
        } catch (e) {
            report.lairError = String((e && e.message) || e);
            return [];
        }
        const d = worldDims(st);
        const WG = WorldGen();
        const monsters = speciesList().filter(s => s.kind === "monster");
        const out = [];
        for (const s of sites) {
            if (!s || s.kind !== "lair" || s.ruined || !s.area) continue;
            const gx = s.area.x * d.size + s.x, gy = s.area.y * d.size + s.y;
            const c = WG.cellInfo(gx, gy);
            const sp = c && monsters.find(m => m.biomes[c.biomeId] > 0 && allowedInRegion(m, c.region));
            if (!sp) {
                report.lairsSkipped++;
                continue;
            }
            const minDist = minDistFor(sp);
            const rng = mulberry32(hash32(st.seed, SALT.lair, s.id | 0, sp.index));
            let center = null;
            for (let t = 0; t < 40 && !center; t++) {
                const x = s.x + Math.floor(rng() * 9) - 4, y = s.y + Math.floor(rng() * 9) - 4;
                if (cellOk(st, s.area.x, s.area.y, x, y, sp, minDist + HERD_SPREAD, false)) center = { x, y };
            }
            if (!center) {
                report.lairsSkipped++;
                continue;
            }
            out.push(makeHerd(st, s.area.x, s.area.y, sp, 0x1a1c + (s.id | 0), center, minDist, { origin: "lair", lair: s.id }));
        }
        return out;
    }

    function planUnderground(st, ax, ay, z, report) {
        const L = window.UF && UF.Levels;
        if (!L || typeof L.baseline !== "function") return [];
        const b = L.baseline(z, ax, ay);
        if (!b || !b.pockets || !b.pockets.length) return [];
        const size = st.size;
        const BORDER = Math.min(16, Math.max(1, Math.floor(size / 8)));
        const FLOOR = (L.SHAPES && L.SHAPES.floor) || 2;
        const caveSpecies = speciesList().filter(s => ["giant_spider", "bat", "rat", "troll", "bog_horror"].includes(s.id));
        if (!caveSpecies.length) return [];
        const herds = [];
        const rng = mulberry32(hash32(st.seed, SALT.herds ^ 0x63617665, ax, ay, (z + 5)));

        const zOf = o => (typeof (o && o.z) === "number" ? o.z : (o && o.area && typeof o.area.z === "number" ? o.area.z : 0));
        const camps = campsOf(st).filter(c => zOf(c) === z && c.area.x === ax && c.area.y === ay);
        const safeCampDist = Math.min(25, Math.max(3, Math.floor(size / 3)));
        const wildPockets = b.pockets.filter(p => !camps.some(c => Math.hypot(p.x - c.x, p.y - c.y) < safeCampDist));
        if (!wildPockets.length) return [];

        const herdCount = Math.min(wildPockets.length, z === -1 ? 6 : 4);
        for (let hi = 0; hi < herdCount; hi++) {
            const pocket = wildPockets[hi % wildPockets.length];
            const eligible = caveSpecies.filter(s => s.biomes && s.biomes[pocket.biome] > 0);
            const pool = eligible.length ? eligible : caveSpecies;
            const sp = pool[Math.floor(rng() * pool.length)];
            let cx = pocket.x, cy = pocket.y;
            for (let t = 0; t < 20; t++) {
                const rx = pocket.x + Math.floor(rng() * 17) - 8;
                const ry = pocket.y + Math.floor(rng() * 17) - 8;
                if (rx >= BORDER && ry >= BORDER && rx < size - BORDER && ry < size - BORDER) {
                    const idx = ry * size + rx;
                    if (b.shape[idx] === FLOOR && (!b.water || !b.water[idx])) {
                        cx = rx; cy = ry;
                        break;
                    }
                }
            }
            const center = { x: cx, y: cy };
            const mn = Array.isArray(sp.herd) ? sp.herd[0] : 1;
            const mx = Array.isArray(sp.herd) ? sp.herd[1] : 2;
            const n = Math.max(1, mn + Math.floor(rng() * (mx - mn + 1)));
            const cells = [center];
            for (let k = 1; k < n; k++) {
                let cell = null;
                for (let t = 0; t < 10 && !cell; t++) {
                    const nx = center.x + Math.floor(rng() * 7) - 3;
                    const ny = center.y + Math.floor(rng() * 7) - 3;
                    if (nx >= BORDER && ny >= BORDER && nx < size - BORDER && ny < size - BORDER) {
                        const idx = ny * size + nx;
                        if (b.shape[idx] === FLOOR && (!b.water || !b.water[idx])) {
                            cell = { x: nx, y: ny };
                        }
                    }
                }
                cells.push(cell || center);
            }
            const dirs = cells.map(() => [2, 4, 6, 8][Math.floor(rng() * 4)]);
            herds.push({
                species: sp.id,
                area: { x: ax, y: ay },
                z,
                home: center,
                cells,
                dirs,
                origin: "cave"
            });
        }
        return herds;
    }

    /** The full spawn plan for a world state: { herds: [{ species, area, home, cells, dirs, origin }], ... }. Pure. */
    function planWorld(st) {
        const report = { areas: 0, dropped: 0, lairsSkipped: 0, kitFallback: false, samples: {} };
        const herds = [];
        for (let ay = 0; ay < st.areasY; ay++) {
            for (let ax = 0; ax < st.areasX; ax++) {
                report.areas++;
                herds.push(...planArea(st, ax, ay, report));
                if (window.UF && UF.Levels) {
                    herds.push(...planUnderground(st, ax, ay, -1, report));
                    herds.push(...planUnderground(st, ax, ay, -2, report));
                }
            }
        }
        herds.push(...planKit(st, report));
        herds.push(...planLairs(st, report));
        return Object.assign(report, { herds });
    }

    /** The UF.World.addUnit spec for one creature (the same for placed herds and test units). */
    function unitSpec(sp, area, x, y, herd, dir, home, extra) {
        const z = (extra && extra.z !== undefined) ? extra.z : ((area && area.z !== undefined) ? area.z : 0);
        const data = {
            kind: "creature",
            species: sp.id,
            tags: [sp.kind],
            through: sp.kind === "flier",
            ai: null,
            home: { x: home ? home.x : x, y: home ? home.y : y },
            wander: sp.wander > 0 ? sp.wander | 0 : 8,
            herd: herd | 0,
            faction: null,
            equipment: {},
            inventory: []
        };
        if (sp.tint) data.tint = sp.tint;
        if (extra) Object.assign(data, extra);
        return { name: sp.name, image: { characterName: sp.image, characterIndex: 0 }, area: { x: area.x, y: area.y }, x, y, z, dir: dir || 2, data };
    }

    function spawnWorld(st) {
        const W = World();
        const t0 = now();
        const report = { herds: 0, creatures: 0, dropped: 0, lairs: 0, lairsSkipped: 0, kit: null, kits: [], placed: [], kitFallback: false, bySpecies: {}, samples: {}, ms: 0, error: null };
        Wildlife.lastSpawn = report;
        if (!W || !st || !catalog() || !WorldGen() || !WorldGen().cellInfo) {
            report.error = "UF_World, UF_WorldGen or the catalog is missing";
            return report;
        }
        try {
            const plan = planWorld(st);
            report.dropped = plan.dropped;
            report.lairsSkipped = plan.lairsSkipped;
            report.kitFallback = plan.kitFallback;
            report.samples = plan.samples;
            let herdNo = 0;
            for (const h of plan.herds) {
                const sp = speciesById(h.species);
                if (!sp) continue;
                herdNo++;
                const extra = h.origin === "kit" ? { kit: true, kitCamp: h.kitCamp, kitFallback: !!h.kitFallback } : h.origin === "lair" ? { lair: h.lair } : null;
                if (extra && extra.kitFallback === false) delete extra.kitFallback;
                const unitIds = [];
                for (let i = 0; i < h.cells.length; i++) {
                    let targetX = h.cells[i].x, targetY = h.cells[i].y;
                    if (W.cellFree && !W.cellFree(h.area.x, h.area.y, targetX, targetY)) {
                        let found = null;
                        const minDist = minDistFor(sp);
                        for (let r = 1; r <= 6 && !found; r++) {
                            for (let dy = -r; dy <= r && !found; dy++) {
                                for (let dx = -r; dx <= r && !found; dx++) {
                                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                                    const nx = targetX + dx, ny = targetY + dy;
                                    if (cellOk(st, h.area.x, h.area.y, nx, ny, sp, minDist, !!h.kitFallback) && W.cellFree(h.area.x, h.area.y, nx, ny)) {
                                        found = { x: nx, y: ny };
                                    }
                                }
                            }
                        }
                        if (found) { targetX = found.x; targetY = found.y; }
                    }
                    const extraWithZ = Object.assign({}, extra, h.z ? { z: h.z } : null);
                    const u = W.addUnit(Object.assign(unitSpec(sp, h.area, targetX, targetY, herdNo, h.dirs[i], h.home, extraWithZ), { z: h.z || (h.area && h.area.z) || 0, snapToFree: 2 }));
                    unitIds.push(u.id);
                    report.placed.push({ id: u.id, species: sp.id, dangerous: sp.dangerous, prey: sp.prey, area: { x: u.area.x, y: u.area.y }, z: u.z || 0, x: u.x, y: u.y, origin: h.origin, kitCamp: h.origin === "kit" ? h.kitCamp : null });
                    report.creatures++;
                    report.bySpecies[sp.id] = (report.bySpecies[sp.id] || 0) + 1;
                }
                if (h.origin === "kit") {
                    const k = { camp: h.kitCamp, group: h.kitGroup, species: sp.id, x: h.home.x, y: h.home.y, area: h.area, members: h.cells.length, units: unitIds, fallback: !!h.kitFallback, substitute: !!h.kitSubstitute };
                    report.kits.push(k);
                    if (!report.kit) report.kit = k; // the player's camp comes first (UF_History's site 1)
                }
                if (h.origin === "lair") report.lairs++;
            }
            report.herds = herdNo;
        } catch (e) {
            report.error = String((e && e.stack) || e);
            console.error("UF_Wildlife: spawning failed:", e);
        }
        report.ms = now() - t0;
        emit("wildlife:spawned", report);
        return report;
    }

    //-------------------------------------------------------------------------
    // Runtime AI: DF-style activity cycles, grazing, environmental fear, herd alarm, predator hunting, and wandering

    const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    const speciesOf = u => (u && u.data && u.data.kind === "creature" ? speciesById(u.data.species) : null);

    const ACTIVITY_CYCLES = Object.freeze({
        deer: "diurnal",
        aurochs: "diurnal",
        wild_horse: "diurnal",
        wild_sheep: "diurnal",
        hare: "diurnal",
        fowl: "diurnal",
        songbird: "diurnal",
        hawk: "diurnal",
        bat: "nocturnal",
        rat: "nocturnal",
        giant_spider: "nocturnal",
        serpent: "nocturnal",
        fox: "crepuscular",
        arctic_fox: "crepuscular",
        wildcat: "crepuscular",
        wolf: "crepuscular",
        jackal: "crepuscular",
        boar: "all_active",
        troll: "all_active",
        bog_horror: "all_active",
        sand_stalker: "all_active",
        restless_dead: "all_active",
        ice_wraith: "all_active"
    });
    const activityOf = id => ACTIVITY_CYCLES[id] || "all_active";

    function currentDayPhase() {
        const DN = window.UF && UF.DayNight;
        if (DN && typeof DN.phase === "function") return DN.phase();
        return "day";
    }

    function shouldSleep(speciesId) {
        const cycle = activityOf(speciesId);
        if (cycle === "all_active" || cycle === "crepuscular") return false;
        const phase = currentDayPhase();
        if (cycle === "diurnal") return phase === "night";
        if (cycle === "nocturnal") return phase === "day";
        return false;
    }

    const PREDATOR_PREY = Object.freeze({
        fox: ["hare", "rat", "fowl", "songbird"],
        arctic_fox: ["hare", "rat", "fowl", "songbird"],
        wildcat: ["hare", "rat", "fowl", "songbird"],
        serpent: ["hare", "rat", "fowl"],
        hawk: ["hare", "rat", "fowl", "songbird"],
        wolf: ["deer", "wild_sheep", "hare", "fowl", "rat", "wild_horse"],
        jackal: ["hare", "fowl", "wild_sheep", "rat"],
        giant_spider: ["deer", "wild_sheep", "hare", "fowl", "rat"],
        sand_stalker: ["deer", "hare", "jackal", "rat"],
        troll: ["deer", "boar", "aurochs", "wild_horse", "wild_sheep", "hare", "fowl"],
        bog_horror: ["deer", "boar", "serpent", "rat", "fowl"]
    });

    const EDIBLE_GROUND = new Set(["meadow", "dry_grass", "tropical_grass", "shrub_soil", "forest_floor", "tundra"]);
    const EDIBLE_OBJECTS = new Set(["grass_tuft", "bush", "tall_grass", "reeds", "berry_bush", "wildflowers"]);

    const cellCache = new Map();
    function cellGroundAndBiome(gx, gy) {
        const key = (gy << 16) | (gx & 0xffff);
        let val = cellCache.get(key);
        if (!val) {
            const WG = WorldGen();
            const c = WG && WG.cellInfo ? WG.cellInfo(gx, gy) : null;
            val = c ? { ground: c.ground, biomeId: c.biomeId, walkable: !!c.walkable, region: c.region } : null;
            cellCache.set(key, val);
        }
        return val;
    }

    function allowedCell(W, sp, area, x, y, ignoreBiome) {
        const size = W.state.size;
        if (x < 0 || y < 0 || x >= size || y >= size) return false;
        const gx = area.x * size + x, gy = area.y * size + y;
        const c = cellGroundAndBiome(gx, gy);
        if (!c || !c.walkable) return false;
        if (!ignoreBiome && sp && !(sp.biomes[c.biomeId] > 0)) return false;
        if (c.region && sp && !allowedInRegion(sp, c.region)) return false;
        return true;
    }

    function isVegetationAt(area, x, y) {
        const Obj = window.UF && UF.Objects;
        if (Obj && typeof Obj.typeIdAt === "function") {
            const objId = Obj.typeIdAt(x, y);
            if (objId && EDIBLE_OBJECTS.has(objId)) return true;
        }
        const W = World();
        if (W && W.state) {
            const gx = area.x * W.state.size + x, gy = area.y * W.state.size + y;
            const c = cellGroundAndBiome(gx, gy);
            if (c && EDIBLE_GROUND.has(c.ground)) return true;
        }
        return false;
    }

    function hasJob(u) {
        if (u.data && u.data.jobId) return true;
        const J = window.UF.Jobs;
        return !!(J && typeof J.of === "function" && J.of(u.id));
    }

    // Can this unit stand on / step to (x, y) of its area? Fliers may go anywhere inside the area. On screen the
    // map answers (tile flags, objects, water, other characters); off screen the pure cell classification does.
    function walkableFor(W, u, area, x, y) {
        const size = W.state.size;
        if (x < 0 || y < 0 || x >= size || y >= size) return false;
        if (u.data && u.data.through) return true;
        if (W.isDisplayed(u) && sameArea(area, u.area) && window.$gameMap && window.$dataMap) {
            if (!$gameMap.isPassable(x, y, 2) || Tilemap.isWaterTile($gameMap.tileId(x, y, 0))) return false;
            return $gameMap.eventsXyNt(x, y).length === 0;
        }
        const gx = area.x * size + x, gy = area.y * size + y;
        const c = cellGroundAndBiome(gx, gy);
        if (!c || !c.walkable) return false;
        return !(window.UF.Objects && UF.Objects.blocksIn && UF.Objects.blocksIn(area, x, y));
    }

    // A seeded cell within `wander` of home that the unit can reach, or null (then it stays put this time).
    function wanderGoal(W, u, frame) {
        const home = u.data.home || { x: u.x, y: u.y };
        const r = Math.max(1, u.data.wander | 0);
        const rng = mulberry32(hash32(W.state.seed, SALT.wanderGoal, u.id, frame));
        const sp = speciesOf(u);
        for (let t = 0; t < 6; t++) {
            const a = rng() * Math.PI * 2, dist = Math.sqrt(rng()) * r;
            const x = Math.round(home.x + Math.cos(a) * dist), y = Math.round(home.y + Math.sin(a) * dist);
            if (x === u.x && y === u.y) continue;
            if (!allowedCell(W, sp, u.area, x, y, !!u.data.kitFallback)) continue;
            if (!walkableFor(W, u, u.area, x, y)) continue;
            return { area: { x: u.area.x, y: u.area.y }, x, y };
        }
        return null;
    }

    function sleepTick(W, frame) {
        const cur = W.currentArea();
        if (!cur) return;
        const phase = currentDayPhase();
        for (const u of W.units()) {
            const d = u.data;
            if (!d || d.kind !== "creature" || d.ai !== "wander") continue;
            if (!sameArea(u.area, cur)) continue;
            const sp = speciesOf(u);
            if (!sp) continue;

            const cycle = activityOf(sp.id);
            if (cycle === "all_active" || cycle === "crepuscular") {
                if (d.state === "sleep") d.state = "idle";
                continue;
            }
            const wantsSleep = (cycle === "diurnal" && phase === "night") || (cycle === "nocturnal" && phase === "day");
            if (d.state === "sleep") {
                if (!wantsSleep) d.state = "idle";
                continue;
            }

            if (wantsSleep) {
                if (d.alarmedAt && frame - d.alarmedAt < 180) continue;
                if (d.state === "flee" || d.state === "hunt" || d.state === "retaliate") continue;
                d.state = "sleep";
                if (u.goal) u.goal = null;
            }
        }
    }

    function grazeTick(W, frame) {
        const cur = W.currentArea();
        if (!cur) return;
        for (const u of W.units()) {
            const d = u.data;
            if (!d || d.kind !== "creature" || d.ai !== "wander") continue;
            if (!sameArea(u.area, cur)) continue;
            const sp = speciesOf(u);
            if (!sp || sp.kind !== "grazer") continue;
            if (d.state === "sleep" || d.state === "flee" || d.state === "retaliate") continue;
            if (d.grazeUntil && d.grazeUntil > frame) continue;
            if (d.grazeCooldown && d.grazeCooldown > frame) continue;
            if (u.goal || hasJob(u)) continue;

            let hasFood = isVegetationAt(u.area, u.x, u.y);
            let foodDir = null;
            if (!hasFood) {
                for (const [dx, dy, dir] of DIRS4) {
                    if (isVegetationAt(u.area, u.x + dx, u.y + dy)) {
                        hasFood = true;
                        foodDir = dir;
                        break;
                    }
                }
            }
            if (!hasFood) {
                d.grazeCooldown = frame + 180;
                continue;
            }

            if (unit01(W.state.seed, SALT.graze, u.id, frame) < 0.40) {
                d.state = "graze";
                d.grazeUntil = frame + 45;
                d.grazeCooldown = frame + 240;
                if (foodDir && W.isDisplayed(u)) {
                    const ev = W.eventOf(u.id);
                    if (ev && typeof ev.setDirection === "function") ev.setDirection(foodDir);
                }
            } else {
                d.grazeCooldown = frame + 180;
            }
        }
    }

    function wanderTick(W, frame) {
        const cur = W.currentArea();
        if (!cur) return;
        for (const u of W.units()) {
            const d = u.data;
            if (!d || d.ai !== "wander" || u.goal) continue;
            if (d.state === "sleep" || d.state === "flee" || d.state === "hunt" || d.state === "feed" || d.state === "retaliate") continue;
            if (d.grazeUntil && d.grazeUntil > frame) continue;
            if (Math.abs(u.area.x - cur.x) > 1 || Math.abs(u.area.y - cur.y) > 1) continue;
            if (hasJob(u)) continue;
            if (unit01(W.state.seed, SALT.wander, u.id, frame) >= WANDER_CHANCE) continue;
            const goal = wanderGoal(W, u, frame);
            if (goal) {
                d.state = "wander";
                W.sendUnit(u.id, goal);
            }
        }
    }

    /** prey unit id -> the hunter unit, from the "hunt" jobs in UF.World.state.jobs (UF_Jobs' state shape). */
    function huntersByPrey(W) {
        const jobs = W.state.jobs && Array.isArray(W.state.jobs.list) ? W.state.jobs.list : [];
        if (!jobs.length) return new Map();
        const out = new Map();
        for (const j of jobs) {
            if (!j || j.type !== "hunt" || !j.params || j.params.unitId === undefined) continue;
            if (j.state === "done" || j.state === "failed" || j.state === "cancelled") continue;
            const hunter = j.assigned ? W.unit(j.assigned) : null;
            if (hunter) out.set(j.params.unitId, hunter);
        }
        return out;
    }

    // The 4-neighbor that gains the most distance from the hunter and can be stepped to, or null (cornered).
    function fleeStep(W, u, hunter, occupiedSet) {
        const dist2 = (x, y) => (x - hunter.x) ** 2 + (y - hunter.y) ** 2;
        const sp = speciesOf(u);
        const isThrough = !!(u.data && u.data.through);
        let best = null, bestD = dist2(u.x, u.y);
        for (const [dx, dy, dir] of DIRS4) {
            const x = u.x + dx, y = u.y + dy;
            const dd = dist2(x, y);
            if (dd <= bestD) continue;
            if (!allowedCell(W, sp, u.area, x, y, true)) continue;
            if (!isThrough) {
                if (occupiedSet && occupiedSet.has((y << 16) | (x & 0xffff))) continue;
                if (window.$gameMap) {
                    if (Tilemap.isWaterTile($gameMap.tileId(x, y, 0))) continue;
                    if (!$gameMap.isPassable(u.x, u.y, dir)) continue;
                }
                if (window.UF.Objects && UF.Objects.blocksIn && UF.Objects.blocksIn(u.area, x, y)) continue;
            }
            best = { x, y };
            bestD = dd;
        }
        return best;
    }

    function fleeTick(W, frame) {
        const cur = W.currentArea();
        if (!cur) return;
        const hunters = huntersByPrey(W);

        // Pre-gather potential environmental threats, unit occupancy, and herd members in one pass
        const allUnits = W.units();
        const threats = [];
        const occupiedSet = new Set();
        const herdMap = new Map();

        for (let i = 0; i < allUnits.length; i++) {
            const o = allUnits[i];
            const d = o.data;
            if (!d || !sameArea(o.area, cur)) continue;

            if (!d.through) {
                occupiedSet.add((o.y << 16) | (o.x & 0xffff));
            }

            if (!d.dead && !d._isDying) {
                const osp = speciesOf(o);
                if ((osp && (osp.kind === "predator" || osp.kind === "monster")) || (d.tags && d.tags.includes("hostile"))) {
                    threats.push({ unit: o, isPredator: true, sleep: d.state === "sleep" });
                } else if (d.kind === "colonist" || d.faction === "player") {
                    threats.push({ unit: o, isPredator: false, sleep: false });
                }
            }

            if (d.kind === "creature" && d.herd) {
                let arr = herdMap.get(d.herd);
                if (!arr) {
                    arr = [];
                    herdMap.set(d.herd, arr);
                }
                arr.push(o);
            }
        }

        // Fast path: if no hunters and no threats, simply clear old flee states
        if (!hunters.size && !threats.length) {
            for (let i = 0; i < allUnits.length; i++) {
                const d = allUnits[i].data;
                if (d && d.state === "flee" && (!d.alarmedAt || frame - d.alarmedAt > 90)) {
                    d.state = "idle";
                }
            }
            return;
        }

        // Spatial hash threats into 16x16 chunks so prey only inspect nearby candidates
        const threatGrid = new Map();
        for (let i = 0; i < threats.length; i++) {
            const th = threats[i];
            const cx = th.unit.x >> 4, cy = th.unit.y >> 4;
            const key = (cy << 8) | cx;
            let arr = threatGrid.get(key);
            if (!arr) { arr = []; threatGrid.set(key, arr); }
            arr.push(th);
        }

        for (let i = 0; i < allUnits.length; i++) {
            const u = allUnits[i];
            const d = u.data;
            if (!d || d.kind !== "creature" || !sameArea(u.area, cur)) continue;
            if (u.goal) continue; // already moving
            const sp = speciesOf(u);
            if (!sp || !sp.hunt) continue;
            if (!sp.prey && sp.hunt.flees) continue;

            let threat = null;
            const hunter = hunters.get(u.id);
            if (hunter && sameArea(u.area, hunter.area) && cheb(u, hunter) <= FLEE_RANGE) {
                threat = hunter;
            } else if (d.ai === "wander") {
                let closestD = Infinity;
                const ucx = u.x >> 4, ucy = u.y >> 4;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const cellThreats = threatGrid.get(((ucy + dy) << 8) | (ucx + dx));
                        if (!cellThreats) continue;
                        for (let i = 0; i < cellThreats.length; i++) {
                            const th = cellThreats[i];
                            if (th.unit.id === u.id) continue;
                            const r = th.isPredator ? (th.sleep ? 3 : PREDATOR_FEAR_RANGE) : COLONIST_FEAR_RANGE;
                            const tdx = Math.abs(u.x - th.unit.x), tdy = Math.abs(u.y - th.unit.y);
                            if (tdx > r || tdy > r) continue;
                            const dist = Math.max(tdx, tdy);
                            if (dist < closestD) {
                                closestD = dist;
                                threat = th.unit;
                            }
                        }
                    }
                }
            }

            if (!threat) {
                if (d.state === "flee" && (!d.alarmedAt || frame - d.alarmedAt > 90)) {
                    d.state = "idle";
                }
                continue;
            }

            if (d.state === "sleep") d.state = "idle";
            if (d.grazeUntil) d.grazeUntil = 0;
            d.alarmedAt = frame;

            if (!sp.hunt.flees) {
                if (d.ai === "wander" && cheb(u, threat) <= 2) {
                    d.state = "retaliate";
                    if (cheb(u, threat) <= 1) {
                        const C = window.UF && UF.Combat;
                        if (C && typeof C.engage === "function" && C.enabled) C.engage(u, threat);
                    }
                }
                continue;
            }

            const step = fleeStep(W, u, threat, occupiedSet);
            if (step) {
                d.state = "flee";
                occupiedSet.delete((u.y << 16) | (u.x & 0xffff));
                occupiedSet.add((step.y << 16) | (step.x & 0xffff));
                W.sendUnit(u.id, { area: { x: u.area.x, y: u.area.y }, x: step.x, y: step.y });
                const members = d.herd ? herdMap.get(d.herd) : null;
                if (members) {
                    for (let m = 0; m < members.length; m++) {
                        const o = members[m];
                        if (o.id === u.id || o.goal) continue;
                        const od = o.data;
                        if (od.alarmedAt && frame - od.alarmedAt < 60) continue;
                        if (cheb(u, o) <= HERD_ALARM_RANGE) {
                            od.alarmedAt = frame;
                            if (od.state === "sleep" || od.state === "graze") {
                                od.state = "idle";
                                if (od.grazeUntil) od.grazeUntil = 0;
                            }
                            const osp = speciesOf(o);
                            if (osp && osp.hunt && osp.hunt.flees) {
                                const hstep = fleeStep(W, o, threat, occupiedSet);
                                if (hstep) {
                                    od.state = "flee";
                                    occupiedSet.delete((o.y << 16) | (o.x & 0xffff));
                                    occupiedSet.add((hstep.y << 16) | (hstep.x & 0xffff));
                                    W.sendUnit(o.id, { area: { x: o.area.x, y: o.area.y }, x: hstep.x, y: hstep.y });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    function predatorTick(W, frame) {
        const cur = W.currentArea();
        if (!cur) return;

        const preyList = [];
        for (const o of W.units()) {
            if (!o.data || o.data.dead || o.data._isDying || !sameArea(o.area, cur)) continue;
            if (o.data.kit) continue; // preserve starter kit herds for colonies
            const osp = speciesOf(o);
            if (osp && (osp.prey || o.data.kind === "colonist")) preyList.push({ unit: o, speciesId: osp.id });
        }
        if (!preyList.length) return;

        const preyGrid = new Map();
        for (let i = 0; i < preyList.length; i++) {
            const p = preyList[i];
            const key = ((p.unit.y >> 4) << 8) | (p.unit.x >> 4);
            let arr = preyGrid.get(key);
            if (!arr) { arr = []; preyGrid.set(key, arr); }
            arr.push(p);
        }

        for (const u of W.units()) {
            const d = u.data;
            if (!d || d.kind !== "creature" || d.ai !== "wander" || !sameArea(u.area, cur)) continue;
            const sp = speciesOf(u);
            if (!sp || (sp.kind !== "predator" && sp.kind !== "monster")) continue;
            if (d.state === "sleep") continue;
            if (d.feedUntil && d.feedUntil > frame) {
                d.state = "feed";
                continue;
            }
            if (d.state === "feed") d.state = "idle";

            const targets = PREDATOR_PREY[sp.id] || (sp.kind === "monster" ? null : []);
            let bestPrey = null, bestDist = Infinity;
            const ucx = u.x >> 4, ucy = u.y >> 4;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const cellPrey = preyGrid.get(((ucy + dy) << 8) | (ucx + dx));
                    if (!cellPrey) continue;
                    for (let i = 0; i < cellPrey.length; i++) {
                        const p = cellPrey[i];
                        if (p.unit.id === u.id) continue;
                        if (targets !== null && !targets.includes(p.speciesId)) continue;
                        if (!allowedCell(W, sp, u.area, p.unit.x, p.unit.y, true)) continue;
                        const dist = cheb(u, p.unit);
                        if (dist <= PREDATOR_SIGHT && dist < bestDist) {
                            bestDist = dist;
                            bestPrey = p.unit;
                        }
                    }
                }
            }

            if (!bestPrey) {
                if (d.state === "hunt") d.state = "idle";
                d.targetPreyId = null;
                continue;
            }

            d.state = "hunt";
            d.targetPreyId = bestPrey.id;

            if (bestDist <= 1) {
                const C = window.UF && UF.Combat;
                if (C && typeof C.engage === "function" && C.enabled) C.engage(u, bestPrey);
                const psp = speciesOf(bestPrey);
                const preyHp = (bestPrey.data && typeof bestPrey.data.hp === "number") ? bestPrey.data.hp : ((psp && psp.combat && psp.combat.hitpoints) || 2);
                const atkDmg = (sp.combat && sp.combat.attack) || 6;
                const remainingHp = preyHp - atkDmg;
                if (bestPrey.data) bestPrey.data.hp = remainingHp;

                if (remainingHp <= 0) {
                    const I = window.UF && UF.Items;
                    const yields = (psp && psp.yields) || {};
                    if (I && typeof I.drop === "function") {
                        for (const it of Object.keys(yields)) {
                            I.drop(bestPrey.area, bestPrey.x, bestPrey.y, it, yields[it] | 0);
                        }
                    }
                    emit("wildlife:kill", { predator: u, prey: bestPrey });
                    W.removeUnit(bestPrey.id);
                    d.state = "feed";
                    d.feedUntil = frame + 90;
                    d.targetPreyId = null;
                }
            } else if (!u.goal || frame % 60 === 0) {
                let bestStep = null, bestStepD = Infinity;
                for (const [dx, dy] of DIRS4) {
                    const nx = bestPrey.x + dx, ny = bestPrey.y + dy;
                    if (!allowedCell(W, sp, u.area, nx, ny, true)) continue;
                    if (!walkableFor(W, u, u.area, nx, ny)) continue;
                    const dd = cheb({ x: nx, y: ny }, u);
                    if (dd < bestStepD) {
                        bestStepD = dd;
                        bestStep = { x: nx, y: ny };
                    }
                }
                const targetCell = bestStep || (allowedCell(W, sp, u.area, bestPrey.x, bestPrey.y, true) ? { x: bestPrey.x, y: bestPrey.y } : null);
                if (targetCell) W.sendUnit(u.id, { area: { x: u.area.x, y: u.area.y }, x: targetCell.x, y: targetCell.y });
            }
        }
    }

    const perf = { ticks: 0, ms: 0, sleepMs: 0, fleeMs: 0, predMs: 0, grazeMs: 0, wanderMs: 0 };
    function tick() {
        const W = World();
        if (!W || !W.state || !W.currentArea()) return;
        const frame = W._frame;
        const doFlee = frame % FLEE_EVERY === 0;
        const doPredator = (frame + 15) % PREDATOR_EVERY === 0;
        const doWander = frame % WANDER_EVERY === 0;
        const doGraze = (frame + 45) % GRAZE_EVERY === 0;
        const doSleep = (frame + 75) % 120 === 0;
        if (!doFlee && !doPredator && !doWander && !doGraze && !doSleep) return;

        const t0 = now();
        let s0 = now();
        if (doSleep) sleepTick(W, frame);
        perf.sleepMs += now() - s0;

        s0 = now();
        if (doFlee) fleeTick(W, frame);
        perf.fleeMs += now() - s0;

        s0 = now();
        if (doPredator) predatorTick(W, frame);
        perf.predMs += now() - s0;

        s0 = now();
        if (doGraze) grazeTick(W, frame);
        perf.grazeMs += now() - s0;

        s0 = now();
        if (doWander) wanderTick(W, frame);
        perf.wanderMs += now() - s0;

        perf.ticks++;
        perf.ms += now() - t0;
    }

    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);
        // AI update loop wiped per Objective 2
    };

    //-------------------------------------------------------------------------
    // Drawing: unit sprites take unit.data.tint; unit events with data.through pass through everything

    const _Sprite_Character_update = Sprite_Character.prototype.update;
    Sprite_Character.prototype.update = function() {
        _Sprite_Character_update.call(this);
        const W = World();
        const u = W && this._character ? W.unitOfEvent(this._character) : null;
        const want = u && u.data && u.data.tint ? tintValue(u.data.tint) : 0xffffff;
        if (this.tint !== want) this.tint = want;
    };

    const _Game_Event_isThrough = Game_Event.prototype.isThrough;
    Game_Event.prototype.isThrough = function() {
        if (_Game_Event_isThrough.call(this)) return true;
        const W = World();
        const u = W ? W.unitOfEvent(this) : null;
        return !!(u && u.data && u.data.through);
    };

    //-------------------------------------------------------------------------
    // The public object

    const resolveUnit = x => {
        const W = World();
        if (!W) return null;
        if (x && typeof x === "object" && x.data !== undefined && x.id !== undefined && !x.eventId) return x;
        if (typeof x === "number") return W.unit(x);
        return W.unitOfEvent(x);
    };

    const Wildlife = {
        PREY_KINDS, DANGEROUS_KINDS, KINDS, WANDER_EVERY, WANDER_CHANCE, FLEE_EVERY, FLEE_RANGE, HERD_SPREAD,
        PREDATOR_EVERY, PREDATOR_SIGHT, PREDATOR_FEAR_RANGE, COLONIST_FEAR_RANGE, HERD_ALARM_RANGE, GRAZE_EVERY,
        ACTIVITY_CYCLES, PREDATOR_PREY, activityOf, shouldSleep, isVegetationAt,
        lastSpawn: null,
        /** The catalog species with index, tintValue, prey/dangerous flags (copies). */
        species: () => speciesList().slice(),
        speciesById,
        /** The species entry of a creature unit (record, id or Game_Event), else null. */
        speciesOf: x => speciesOf(resolveUnit(x)),
        /** All creature units in the world (kind "creature"). */
        creatures: () => (World() ? World().units().filter(u => u.data && u.data.kind === "creature") : []),
        isPrey(x) {
            const sp = speciesOf(resolveUnit(x));
            return !!sp && sp.prey;
        },
        /** Nearest prey (grazer/vermin/flier; predators too when allowPredators) within radius cells of (x, y) in the area on screen (or `area`). */
        nearestPrey(x, y, radius = 40, allowPredators = false, area) {
            const W = World();
            const a = area || (W && W.currentArea());
            if (!W || !a) return null;
            let best = null, bestD = Infinity;
            for (const u of W.units()) {
                if (!u.data || u.data.kind !== "creature" || !sameArea(u.area, a)) continue;
                const sp = speciesOf(u);
                if (!sp || !(sp.prey || (allowPredators && sp.kind === "predator"))) continue;
                const d = Math.hypot(u.x - x, u.y - y);
                if (d <= radius && d < bestD) {
                    best = u;
                    bestD = d;
                }
            }
            return best;
        },
        /** The unit hunting this creature (a live "hunt" job assigned to someone), else null. */
        hunterOf(x) {
            const W = World(), u = resolveUnit(x);
            return W && u ? huntersByPrey(W).get(u.id) || null : null;
        },
        /** { name, species, kind, prey, flees, herd, state, text } for the look label, or null for non-creatures. */
        describe(x) {
            const u = resolveUnit(x), sp = speciesOf(u);
            if (!sp) return null;
            const flees = !!(sp.hunt && sp.hunt.flees);
            const state = (u.data && u.data.state) || "idle";
            return { name: u.name, species: sp.id, kind: sp.kind, prey: sp.prey, flees, herd: u.data.herd, state, text: `${sp.name} · ${sp.kind}${sp.prey ? " · prey" : ""}` };
        },
        /** May this species stand at world cell (gx, gy)? Biome weight > 0, walkable, and its region rule (monsters only where wild/cursed). */
        allowedAt(speciesId, gx, gy) {
            const sp = speciesById(speciesId), WG = WorldGen();
            const c = sp && WG && WG.cellInfo ? WG.cellInfo(gx, gy) : null;
            return !!c && c.walkable && sp.biomes[c.biomeId] > 0 && allowedInRegion(sp, c.region);
        },
        allowedInRegion: (speciesId, region) => {
            const sp = speciesById(speciesId);
            return !!sp && allowedInRegion(sp, region);
        },
        herdScale,
        areaSample: (ax, ay) => (World() && World().state ? areaSample(World().state, ax, ay) : null),
        expectedHerds: (speciesId, sample) => (speciesById(speciesId) ? expectedHerds(speciesById(speciesId), sample) : 0),
        /** The pure spawn plan for a world state (no units added). */
        plan: st => planWorld(st || World().state),
        /** Place the plan's creatures as units (what world:created does). Returns the report. */
        spawn: st => spawnWorld(st || World().state),
        unitSpec,
        /** catalog start.kit.wildlife normalised: { herds: [{ species, count }], distance, predatorFree }. */
        kitConfig,
        /** Every faction's campfire in a world state: [{ id, faction, area, x, y }] (UF_History's year-1 camps). */
        camps: st => campsOf(st || World().state),
        /** { ticks, avgMs, breakdown } of the AI ticks so far. */
        perf: () => ({ ticks: perf.ticks, avgMs: perf.ticks ? perf.ms / perf.ticks : 0, sleepMs: perf.sleepMs, fleeMs: perf.fleeMs, predMs: perf.predMs, grazeMs: perf.grazeMs, wanderMs: perf.wanderMs }),
        resetPerf() {
            perf.ticks = 0; perf.ms = 0; perf.sleepMs = 0; perf.fleeMs = 0; perf.predMs = 0; perf.grazeMs = 0; perf.wanderMs = 0;
        },
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Wildlife = Wildlife;

    // Registered at load: UF_Factions and UF_History load earlier, so their world:created listeners run first.
    if (window.UF.Events && UF.Events.on) UF.Events.on("world:created", state => spawnWorld(state));

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "wildlife"), registered at boot after all plugins load

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        const fs = require("fs"), path = require("path");
        const gameDir = nw.__dirname || process.cwd();
        const banned = /avatar|britannia|guardian|lord british|iolo|dupre|shamino|fellowship|moongate|urist|armok|strange mood|fey mood|dwarf fortress|ultima|beholder|mind flayer|illithid|displacer|githyanki/i;
        const scene = () => SceneManager._scene;
        const spriteOf = ev => (ev && scene()._spriteset ? scene()._spriteset._characterSprites.find(s => s._character === ev) : null) || null;
        const opaqueSamples = s => {
            const b = s && s.bitmap, f = s && s._frame;
            if (!b || !b.isReady() || !f || f.width === 0) return 0;
            let n = 0;
            for (let y = f.y; y < f.y + f.height; y += 4) for (let x = f.x; x < f.x + f.width; x += 4) if (b.getAlphaPixel(x, y) > 0) n++;
            return n;
        };
        const spriteReady = u => {
            const s = spriteOf(World().eventOf(u.id));
            return !!s && !!s.bitmap && s.bitmap.isReady() && s._frame && s._frame.width > 0;
        };
        const top = (counts, n) => Object.entries(counts).sort((p, q) => q[1] - p[1]).slice(0, n).map(([k, v]) => `${k} ${v}`).join(", ");

        UF.Test.suite("wildlife", async t => {
            const cat = catalog(), W = World(), WG = WorldGen();
            const list = speciesList();
            const Wc = wildlifeConfig();
            const allBiomesObj = Object.assign({}, (cat && cat.biomes) || {}, (cat && cat.undergroundBiomes) || {});
            const biomeIds = new Set(Object.keys(allBiomesObj).filter(k => typeof allBiomesObj[k] === "object"));
            const itemIds = new Set(((cat && cat.items && cat.items.types) || []).map(i => i.id));

            // 1. The catalog: every species drawable, every id it names known, every species huntable.
            const problems = [];
            for (const s of list) {
                if (!s.id || !s.name) problems.push(`#${s.index}: missing id or name`);
                if (!s.image) problems.push(`${s.id}: no image`);
                else if (!fs.existsSync(path.join(gameDir, "img", "characters", `${s.image}.png`))) problems.push(`${s.id}: img/characters/${s.image}.png missing`);
                if (!KINDS.includes(s.kind)) problems.push(`${s.id}: kind "${s.kind}" not one of ${KINDS.join("/")}`);
                if (!s.hunt || !(s.hunt.work > 0) || typeof s.hunt.flees !== "boolean") problems.push(`${s.id}: hunt needs { work > 0, flees: boolean }`);
                if (!Array.isArray(s.herd) || s.herd.length !== 2 || !(s.herd[0] >= 1) || !(s.herd[1] >= s.herd[0])) problems.push(`${s.id}: herd must be [min >= 1, max >= min]`);
                for (const b of Object.keys(s.biomes)) if (!biomeIds.has(b)) problems.push(`${s.id}: unknown biome "${b}"`);
                if (!Object.values(s.biomes).some(w => w > 0)) problems.push(`${s.id}: no biome with weight > 0`);
                for (const it of Object.keys(s.yields || {})) if (!itemIds.has(it)) problems.push(`${s.id}: yields unknown item "${it}"`);
                if (s.minSavagery && tierIndex("savagery", s.minSavagery) < 0) problems.push(`${s.id}: minSavagery "${s.minSavagery}" is not a savagery tier`);
                if (s.alignment && tierIndex("alignment", s.alignment) < 0) problems.push(`${s.id}: alignment "${s.alignment}" is not an alignment tier`);
                if (s.tint && !/^#[0-9a-f]{6}$/i.test(s.tint)) problems.push(`${s.id}: tint "${s.tint}" is not #rrggbb`);
            }
            const dup = list.map(s => s.id).filter((id, i, a) => a.indexOf(id) !== i);
            if (dup.length) problems.push(`duplicate ids: ${dup.join(", ")}`);
            for (const id of kitSpeciesIds()) if (!speciesById(id)) problems.push(`start.kit.wildlife names unknown species "${id}"`);
            for (const g of kitConfig().herds) if (g.count && !(g.count[0] >= 1 && g.count[1] >= g.count[0])) problems.push(`start.kit.wildlife herd ${g.species.join("/")}: count must be [min >= 1, max >= min]`);
            if (!kitConfig().herds.length) problems.push("start.kit.wildlife has no herds");
            t.check("catalog_species", list.length > 0 && problems.length === 0,
                problems.length ? `${problems.length} problem(s): ${problems.slice(0, 6).join("; ")}` : `${list.length} species: ${list.filter(s => s.prey).length} prey, ${list.filter(s => s.kind === "predator").length} predators, ${list.filter(s => s.kind === "monster").length} monsters; all images exist, all biome/item/tier ids resolve, every species has hunt.work and hunt.flees`);
            const dirty = list.filter(s => banned.test(s.name || "") || banned.test(s.id || ""));
            t.check("names_clean", dirty.length === 0, dirty.length ? `banned words in: ${dirty.map(s => s.name).join(", ")}` : `${list.length} species names checked against the banned-word list`);

            if (window.UF && UF.Levels && typeof UF.Levels.view === "function" && UF.Levels.view() !== 0) {
                UF.Levels.setView(0);
                await t.waitUntil(() => !!(W && W.currentArea()), 10000, "Ground view for wildlife checks").catch(() => {});
            }
            if (!W || !W.state || !WG || !W.currentArea()) {
                t.check("world_ready", false, `UF.World ${W && W.state ? "ready" : "MISSING"}, UF.WorldGen ${WG ? "ready" : "MISSING"}, on an area map: ${!!(W && W.currentArea())}`);
                return;
            }
            const st = W.state, area = W.currentArea(), size = st.size, mid = Math.floor(size / 2);
            const d = worldDims(st);
            const spawn = Wildlife.lastSpawn;

            // 2. Placed with the world.
            const creatures = Wildlife.creatures();
            const speciesSeen = new Set(creatures.map(u => u.data.species));
            t.check("spawned_with_world", !!spawn && !spawn.error && creatures.length >= 60 && speciesSeen.size >= 3,
                spawn ? `${creatures.length} creatures of ${speciesSeen.size} species in ${spawn.herds} herds (${spawn.dropped} herds dropped for lack of a cell, ${spawn.lairs} lair herds) placed in ${spawn.ms.toFixed(0)} ms on world:created (seed ${st.seed}); area sample: ${Object.values(spawn.samples).map(s => `${s.savagery}/${s.alignment}, K ${s.K.toFixed(2)}, expected herds ${Object.values(s.expectedHerds).reduce((a, b) => a + b, 0)}`).join("; ")}; most common: ${top(spawn.bySpecies, 8)}${spawn.error ? `; ERROR ${spawn.error}` : ""}` : "no spawn report: the world:created listener never ran");

            // 3. Every creature stands where its species belongs (biome weight > 0, walkable), by cellInfo. Kit herds flagged
            //    kitFallback are the one exception (VISION V67 over the biome table, 2026-09-19): they exist only where no
            //    prey species of the catalog lives within reach of a campfire, and are counted apart.
            let wrongBiome = 0, wrongWalk = 0, first = "", fallbackOut = 0;
            for (const u of creatures) {
                const z = typeof u.z === "number" ? u.z : (u.area && typeof u.area.z === "number" ? u.area.z : 0);
                const sp = speciesById(u.data.species);
                if (z < 0) {
                    const L = window.UF && UF.Levels;
                    const b = L && L.biomeAt ? L.biomeAt(u) : null;
                    const standable = L && L.standableShape ? L.standableShape(u) : true;
                    const ok = !!sp && (!b || (sp.biomes && sp.biomes[b.id] > 0));
                    if (!ok) wrongBiome++;
                    if (!standable) wrongWalk++;
                    continue;
                }
                const c = WG.cellInfo(u.area.x * size + u.x, u.area.y * size + u.y);
                const pl = (spawn && spawn.placed && spawn.placed.find(p => p.id === u.id));
                const homeBiome = pl ? WG.cellInfo(pl.area.x * size + pl.x, pl.area.y * size + pl.y) : null;
                const ok = !!sp && !!c && (sp.biomes[c.biomeId] > 0 || (homeBiome && sp.biomes[homeBiome.biomeId] > 0));
                if (!ok && u.data.kitFallback) fallbackOut++;
                else if (!ok) {
                    wrongBiome++;
                    if (!first) first = `${u.name} #${u.id} at (${u.x},${u.y}) in ${c ? c.biomeId : "?"} (home: ${JSON.stringify(u.data.home)}, placed: ${JSON.stringify(pl)})`;
                }
                if (!c || !c.walkable) wrongWalk++;
            }
            t.check("by_biome", creatures.length > 0 && wrongBiome === 0 && wrongWalk === 0,
                `${creatures.length} creatures checked with cellInfo: ${wrongBiome} in a biome where the species has no weight, ${wrongWalk} on unwalkable cells${first ? `; first: ${first}` : ""}; ${fallbackOut} kit-fallback units outside their species' biomes (placed where no prey species lives within reach of a campfire)`);

            // 4. The start kit herd: a prey herd of a kit species within kit.distance[1] of the start.
            const kitCfg = Object.assign({ species: kitSpeciesIds() }, kitConfig());
            const kitSpecies = new Set(kitCfg.species);
            const zOf = u => (typeof u.z === "number" ? u.z : (u.area && typeof u.area.z === "number" ? u.area.z : 0));
            const kitUnits = creatures.filter(u => zOf(u) === 0 && kitSpecies.has(u.data.species) && sameArea(u.area, st.startArea) && distToStart(d, u.area.x * size + u.x, u.area.y * size + u.y) <= kitCfg.distance[1] + HERD_SPREAD);
            const kitDist = kitUnits.map(u => distToStart(d, u.area.x * size + u.x, u.area.y * size + u.y));
            const flagged = kitUnits.filter(u => u.data.kit).length;
            t.check("start_kit_herd", kitUnits.length >= 2 && flagged >= 2 && kitUnits.every(u => Wildlife.isPrey(u)) && Math.min(...kitDist) >= kitCfg.distance[0] - HERD_SPREAD - 1,
                kitUnits.length ? `${kitUnits.length} ${[...new Set(kitUnits.map(u => u.data.species))].join("/")} (${flagged} placed by the kit) at ${kitDist.map(x => x.toFixed(0)).join("/")} cells from the start (kit distance ${kitCfg.distance.join("-")}, spread ${HERD_SPREAD})${spawn && spawn.kit ? `; report: ${spawn.kit.members} ${spawn.kit.species} around (${spawn.kit.x},${spawn.kit.y})` : ""}` : `no ${kitCfg.species.join("/")} within ${kitCfg.distance[1]} cells of the start`);

            // 4b. kit_every_area (VISION V67, 2026-09-19 afternoon): every faction's campfire got one herd per kit group (at
            //     least the group's smallest count, all prey), placed within reach (no member farther than the colonists'
            //     hunt radius from the fire, and the live units still carry the kit flag); no predator or monster was placed
            //     within kit.predatorFree cells of any campfire; no creature was placed on a camp's nine cells. Positions are
            //     where the units were actually put (lastSpawn.placed, after snapToFree), since they wander afterwards.
            const camps = campsOf(st).filter(c => (c.z || 0) === 0);
            const huntR = (cat.colony && cat.colony.huntRadius) || 45;
            const placed = (spawn && spawn.placed) || [];
            const kitRows = [], kitBad = [];
            const factionsN = camps.length;
            for (const c of camps) {
                const F = window.UF.Factions && UF.Factions.get ? UF.Factions.get(c.faction) : null;
                const label = F ? F.name.replace(/^The /, "") : `camp ${c.id}`;
                const groups = [];
                kitCfg.herds.forEach((g, gi) => {
                    const k = ((spawn && spawn.kits) || []).find(x => x.camp === c.id && x.group === gi) || null;
                    const members = k ? placed.filter(p => k.units.includes(p.id)) : [];
                    const dists = members.map(p => Math.hypot(p.x - c.x, p.y - c.y));
                    const live = members.filter(p => { const u = W.unit(p.id); return !!u && u.data.kit === true && u.data.kitCamp === c.id; }).length;
                    const min = g.count ? g.count[0] : 1;
                    const far = dists.length ? Math.max(...dists) : Infinity;
                    if (!k || members.length < min || members.some(p => !p.prey) || far > huntR || live !== members.length) {
                        kitBad.push(`${label} ${g.species.join("/")}: ${k ? `${members.length} ${k.species} (want >= ${min}), farthest ${far.toFixed(1)} (hunt radius ${huntR}), ${live} live with the kit flag${members.some(p => !p.prey) ? ", NOT all prey" : ""}` : "NO HERD"}`);
                    }
                    groups.push(k ? `${members.length} ${k.species}${k.substitute ? " (substitute: no " + g.species.join("/") + " lives in the ring)" : ""}${k.fallback ? " (fallback: no prey species lives in the ring)" : ""} at ${dists.length ? `${Math.min(...dists).toFixed(0)}-${far.toFixed(0)}` : "-"}` : `no ${g.species.join("/")}`);
                });
                const danger = placed.filter(p => p.dangerous && (p.z || 0) === (c.z || 0) && sameArea(p.area, c.area)).map(p => ({ p, d: Math.hypot(p.x - c.x, p.y - c.y) })).sort((a, b) => a.d - b.d);
                const nearest = danger.length ? danger[0] : null;
                if (nearest && nearest.d < kitCfg.predatorFree) kitBad.push(`${label}: ${nearest.p.species} placed ${nearest.d.toFixed(1)} from the campfire (want >= ${kitCfg.predatorFree})`);
                const onCamp = placed.filter(p => (p.z || 0) === (c.z || 0) && sameArea(p.area, c.area) && Math.max(Math.abs(p.x - c.x), Math.abs(p.y - c.y)) <= 1);
                if (onCamp.length) kitBad.push(`${label}: ${onCamp.length} creatures placed on the camp's nine cells (first ${onCamp[0].species})`);
                kitRows.push(`${label} (${c.x},${c.y}): ${groups.join(" + ")}; nearest predator/monster ${nearest ? `${nearest.p.species} ${nearest.d.toFixed(0)}` : "none in the area"}`);
            }
            t.check("kit_every_area", camps.length > 0 && camps.length === factionsN && kitBad.length === 0,
                `${camps.length} campfires (${factionsN} factions), kit herds ${kitCfg.herds.map(g => `${g.count ? g.count.join("-") : "herd-size"} ${g.species.join("/")}`).join(" + ")} at ${kitCfg.distance.join("-")} cells (hunt radius ${huntR}), predators placed >= ${kitCfg.predatorFree} from every campfire: ${kitRows.join(" | ")}${kitBad.length ? `; FAILING: ${kitBad.join("; ")}` : ""}`);

            // 5. Nothing too near the start.
            const safeR = Wc.startSafeRadius | 0, predR = Wc.predatorFreeRadius | 0;
            let nearAny = 0, nearDanger = 0, firstNear = "";
            for (const u of creatures) {
                if (zOf(u) !== 0) continue;
                const sp = speciesById(u.data.species);
                const dist = distToStart(d, u.area.x * size + u.x, u.area.y * size + u.y);
                if (dist < safeR) { nearAny++; if (!firstNear) firstNear = `${u.name} at ${dist.toFixed(1)}`; }
                if (sp && sp.dangerous && dist < predR) { nearDanger++; if (!firstNear) firstNear = `${u.name} (${sp.kind}) at ${dist.toFixed(1)}`; }
            }
            const dangerCount = creatures.filter(u => zOf(u) === 0 && (speciesById(u.data.species) || {}).dangerous).length;
            t.check("none_too_near_start", nearAny === 0 && nearDanger === 0,
                `${nearAny} creatures within ${safeR} cells of the start, ${nearDanger} of ${dangerCount} predators/monsters within ${predR}${firstNear ? `; first: ${firstNear}` : ""}`);

            // 6. Monsters only where the region allows them: every placed monster's own cell passes the species rule,
            //    and the tame start cell refuses a troll (minSavagery wild).
            const monsters = creatures.filter(u => (u.data.tags || []).includes("monster") && (typeof u.z === "number" ? u.z : (u.area && typeof u.area.z === "number" ? u.area.z : 0)) === 0);
            const badMonsters = monsters.filter(u => !Wildlife.allowedAt(u.data.species, u.area.x * size + u.x, u.area.y * size + u.y));
            const startRegion = WG.cellInfo(d.startGX, d.startGY).region;
            const trollAtStart = Wildlife.allowedInRegion("troll", startRegion);
            const deadAtStart = Wildlife.allowedInRegion("restless_dead", startRegion);
            t.check("monsters_only_wild", badMonsters.length === 0 && !trollAtStart && !deadAtStart,
                `${monsters.length} monsters placed, ${badMonsters.length} on a cell whose region is below their minSavagery / not their alignment${badMonsters.length ? ` (first ${badMonsters[0].name} at (${badMonsters[0].x},${badMonsters[0].y}))` : ""}; start region ${startRegion.savagery}/${startRegion.alignment} allows troll: ${trollAtStart}, restless dead: ${deadAtStart} (want false/false)`);

            // 7. Deterministic: the same state plans the same herds twice.
            const p1 = Wildlife.plan(st), p2 = Wildlife.plan(st);
            const j1 = JSON.stringify(p1.herds), j2 = JSON.stringify(p2.herds);
            t.check("deterministic", p1.herds.length > 0 && j1 === j2, `${p1.herds.length} herds planned twice from seed ${st.seed}: ${j1 === j2 ? "identical" : "DIFFERENT"} (${j1.length} chars)`);

            // Look at the start at the closest zoom, then spawn test creatures in view.
            if (UF.Camera) UF.Camera.setLevel(0);
            $gamePlayer.locate(mid, mid);
            await t.waitFrames(3);
            const added = [];
            const add = (speciesId, x, y, extra) => {
                const sp = speciesById(speciesId);
                const spec = unitSpec(sp, area, x, y, 9999, 2, { x, y }, extra);
                spec.name = `TEST_${sp.id}`;
                const u = W.addUnit(spec);
                added.push(u);
                return u;
            };
            const cx = Math.floor($gameMap.displayX() + $gameMap.screenTileX() / 2), cy = Math.floor($gameMap.displayY() + $gameMap.screenTileY() / 2);
            const placedObjects = [];
            const clearCell = (x, y) => {
                if (!UF.Objects) return;
                placedObjects.push({ x, y, was: UF.Objects.typeIdAt(x, y) });
                UF.Objects.set(x, y, null);
            };
            // Land cells only: the start pond can reach within 3 cells of the start, and a unit on water can't move.
            const isLand = (x, y) => x >= 0 && y >= 0 && x < size && y < size && !Tilemap.isWaterTile($gameMap.tileId(x, y, 0)) && $gameMap.regionId(x, y) !== 250;
            const landNear = (x, y) => {
                for (let r = 0; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (isLand(x + dx, y + dy)) return { x: x + dx, y: y + dy };
                return { x, y };
            };
            const findLandStrip = (len, rows) => {
                for (let dy = 4; dy <= 16; dy++) for (const sy of [-dy, dy]) for (let dx = -12; dx <= 12; dx++) {
                    const x0 = mid + dx - Math.floor(len / 2), y0 = mid + sy;
                    let ok = true;
                    for (let r = 0; r < rows && ok; r++) for (let i = 0; i < len && ok; i++) if (!isLand(x0 + i, y0 - r)) ok = false;
                    if (ok) return { x: x0 + Math.floor(len / 2), y: y0 };
                }
                return null;
            };

            // 8. Drawn and tinted: a tinted boar, an untinted deer, a flier that passes through a tree.
            const boar = add("boar", cx - 2, cy + 2, { ai: null }), deer = add("deer", cx + 2, cy + 2, { ai: null }), hawk = add("hawk", cx, cy - 2, { ai: null });
            await t.waitUntil(() => spriteReady(boar) && spriteReady(deer) && spriteReady(hawk), 10000, "the test creature sprites to load").catch(() => {});
            await t.waitFrames(2);
            const bs = spriteOf(W.eventOf(boar.id)), ds = spriteOf(W.eventOf(deer.id)), hs = spriteOf(W.eventOf(hawk.id));
            const hawkEv = W.eventOf(hawk.id), deerEv = W.eventOf(deer.id);
            const treeX = cx, treeY = cy - 3;
            placedObjects.push({ x: treeX, y: treeY, was: UF.Objects ? UF.Objects.typeIdAt(treeX, treeY) : 0 });
            if (UF.Objects) UF.Objects.set(treeX, treeY, "oak");
            const hawkThrough = !!hawkEv && hawkEv.isThrough() && hawkEv.canPass(hawkEv.x, hawkEv.y, 8) && !!hawk.data.through;
            const deerBlocked = !!deerEv && !deerEv.isThrough() && (!UF.Objects || !$gameMap.isPassable(treeX, treeY, 2));
            const boarTint = speciesById("boar").tintValue;
            t.check("drawn_and_tinted", !!bs && !!ds && !!hs && bs.visible && ds.visible && hs.visible && opaqueSamples(bs) > 0 && opaqueSamples(ds) > 0 && opaqueSamples(hs) > 0 && bs.tint === boarTint && ds.tint === 0xffffff && hawkThrough && deerBlocked,
                `boar sprite ${bs ? `${opaqueSamples(bs)} opaque samples, tint 0x${bs.tint.toString(16)} (species ${speciesById("boar").tint})` : "MISSING"}; deer ${ds ? `${opaqueSamples(ds)} samples, tint 0x${ds.tint.toString(16)} (want ffffff)` : "MISSING"}; hawk ${hs ? `${opaqueSamples(hs)} samples` : "MISSING"}, data.through ${hawk.data.through}, event isThrough ${hawkEv ? hawkEv.isThrough() : "?"}, can step north into an oak: ${hawkEv ? hawkEv.canPass(hawkEv.x, hawkEv.y, 8) : "?"}; deer isThrough ${deerEv ? deerEv.isThrough() : "?"}, oak cell passable ${UF.Objects ? $gameMap.isPassable(treeX, treeY, 2) : "n/a (no UF_Objects)"}`);
            await t.waitFrames(3);
            t.screenshot("test_herd");

            // 9. nearestPrey: the deer is prey, the wolf isn't unless predators are allowed.
            const wolf = add("wolf", cx + 1, cy + 3, { ai: null });
            const np = Wildlife.nearestPrey(cx + 1, cy + 4, 6, false), npPred = Wildlife.nearestPrey(cx + 1, cy + 4, 6, true), npFar = Wildlife.nearestPrey(cx + 1, cy + 4, 1, false);
            t.check("nearest_prey", !!np && np.id === deer.id && !!npPred && npPred.id === wolf.id && npFar === null,
                `nearestPrey from (${cx + 1},${cy + 4}) r6: ${np ? np.name : "null"} (want TEST_deer); with predators: ${npPred ? npPred.name : "null"} (want TEST_wolf); r1: ${npFar ? npFar.name : "null"} (want null)`);

            // 10. Wander: four hares with the AI on; at least one moves within 15 s.
            const hares = [[cx - 3, cy + 4], [cx - 2, cy + 5], [cx + 3, cy + 4], [cx + 2, cy + 5]].map(([x0, y0]) => {
                const { x, y } = landNear(x0, y0);
                clearCell(x, y);
                return add("hare", x, y, { wander: 4 });
            });
            const start0 = hares.map(u => `${u.x},${u.y}`);
            const f0 = Graphics.frameCount;
            const moved = () => hares.filter((u, i) => `${u.x},${u.y}` !== start0[i]);
            await t.waitUntil(() => moved().length > 0, 15000, "a test hare to wander").catch(() => {});
            const m = moved();
            t.check("wanders", m.length > 0 && m.every(u => Math.abs(u.x - u.data.home.x) <= 4 + 1 && Math.abs(u.y - u.data.home.y) <= 4 + 1),
                `${m.length} of ${hares.length} hares (ai wander, radius 4, ${WANDER_CHANCE * 100} % every ${WANDER_EVERY} ticks) left their cell within ${Graphics.frameCount - f0} frames${m.length ? `: ${m.map(u => `#${u.id} ${start0[hares.indexOf(u)]} -> (${u.x},${u.y})`).join(", ")}` : ""}`);

            // 11. Flee: a hunt job on a hare makes it step away from its hunter; a boar (flees false) stays.
            const strip = findLandStrip(9, 2) || { x: cx - 4, y: cy - 4 };
            const px = strip.x, py = strip.y;
            for (let x = px - 4; x <= px + 4; x++) clearCell(x, py);
            for (let x = px - 4; x <= px + 4; x++) clearCell(x, py - 1);
            //     With UF_Jobs loaded the jobs are real (the hunters chase); without it, raw job records in state.jobs.
            const prey = add("hare", px, py, { ai: null });
            const stayer = add("boar", px, py - 1, { ai: null });
            const mkHunter = (name, x, y) => {
                const u = W.addUnit({ name, image: { characterName: "$U7_Townsman", characterIndex: 0 }, area, x, y, dir: 4, data: { kind: "test", faction: "player", inventory: [], equipment: {} } });
                added.push(u);
                return u;
            };
            const hunter = mkHunter("TEST_hunter", px + 2, py), hunter2 = mkHunter("TEST_hunter2", px + 2, py - 1);
            const J = window.UF.Jobs && typeof UF.Jobs.create === "function" ? UF.Jobs : null;
            const jobs = (st.jobs = st.jobs || { nextId: 1, list: [] });
            const mk = (preyUnit, h) => {
                if (J) return J.create({ type: "hunt", target: { area: { x: area.x, y: area.y }, x: preyUnit.x, y: preyUnit.y }, params: { unitId: preyUnit.id }, owner: h.id });
                const j = { id: jobs.nextId++, type: "hunt", target: { area: { x: area.x, y: area.y }, x: preyUnit.x, y: preyUnit.y }, params: { unitId: preyUnit.id }, owner: h.id, assigned: h.id, progress: 0, state: "travel", reason: null, created: 0 };
                jobs.list.push(j);
                return j;
            };
            const preyJob = mk(prey, hunter), stayerJob = mk(stayer, hunter2);
            const hunterOk = !!preyJob && !!stayerJob && Wildlife.hunterOf(prey) === hunter && Wildlife.hunterOf(stayer) === hunter2;
            // The decision: the cell the hare picks must be farther from where its hunter stands at that moment.
            let decision = null;
            const fr0 = Graphics.frameCount;
            await t.waitUntil(() => {
                if (!decision && prey.goal) decision = { hx: hunter.x, hy: hunter.y, px: prey.x, py: prey.y, gx: prey.goal.x, gy: prey.goal.y, frame: Graphics.frameCount - fr0 };
                return !!decision && (prey.x !== px || prey.y !== py);
            }, 4000, "the hare to flee").catch(() => {});
            const stayed = stayer.x === px && stayer.y === py - 1;
            const dist2 = (x, y, hx, hy) => (x - hx) ** 2 + (y - hy) ** 2;
            const away = !!decision && dist2(decision.gx, decision.gy, decision.hx, decision.hy) > dist2(decision.px, decision.py, decision.hx, decision.hy);
            const preyMoved = prey.x !== px || prey.y !== py;
            const rem = u => { if (u) { W.removeUnit(u.id); const i = added.indexOf(u); if (i >= 0) added.splice(i, 1); } };
            if (J) { J.cancel(preyJob.id, "test over"); J.cancel(stayerJob.id, "test over"); }
            else jobs.list = jobs.list.filter(j => j !== preyJob && j !== stayerJob);
            t.check("flees_hunter", hunterOk && away && preyMoved && stayed,
                `${J ? "UF.Jobs hunt job" : "raw hunt job record"} ${preyJob ? `#${preyJob.id}` : "MISSING"} for TEST_hunter: hare at (${px},${py}) ${decision ? `chose (${decision.gx},${decision.gy}) at frame ${decision.frame} with the hunter at (${decision.hx},${decision.hy}): ${away ? "farther" : "NOT farther"}` : "never chose a flee cell"}; now at (${prey.x},${prey.y}) (${preyMoved ? "moved" : "did not move"}); hunterOf resolves both: ${hunterOk}; boar (flees false, hunted by TEST_hunter2) at (${stayer.x},${stayer.y}) ${stayed ? "stayed" : "MOVED"}; strip on land at (${px},${py})`);
            rem(prey); rem(stayer); rem(hunter); rem(hunter2);

            // DF 1. Activity cycles & sleep: diurnal deer sleeps during night, awakes on threat approach
            const testDeer = add("deer", px - 2, py, { ai: "wander", state: "idle" });
            const DN = window.UF && UF.DayNight;
            const origPhase = DN && DN.phase;
            if (DN) DN.phase = () => "night";
            sleepTick(W, 120);
            const deerSlept = testDeer.data.state === "sleep";
            const startleWolf = add("wolf", px - 1, py, { ai: "none" });
            fleeTick(W, 150);
            const deerWoke = testDeer.data.state !== "sleep";
            if (DN && origPhase) DN.phase = origPhase;
            t.check("activity_cycles", deerSlept && deerWoke,
                `diurnal deer slept at night: ${deerSlept}, woke on wolf threat approach: ${deerWoke} (state ${testDeer.data.state})`);
            rem(testDeer); rem(startleWolf);

            // DF 2. Herbivore grazing: grazer pauses to graze when on or adjacent to edible vegetation
            const testGrazer = add("deer", px - 3, py + 1, { ai: "wander", grazeCooldown: 0, state: "idle" });
            const hasVeg = isVegetationAt(area, testGrazer.x, testGrazer.y);
            let grazed = false;
            for (let f = 1; f <= 10 && !grazed; f++) {
                testGrazer.data.grazeCooldown = 0;
                grazeTick(W, f * 90 + 45);
                if (testGrazer.data.state === "graze") grazed = true;
            }
            t.check("herbivore_graze", hasVeg && grazed,
                `deer at (${testGrazer.x},${testGrazer.y}) has vegetation: ${hasVeg}, entered graze state: ${grazed} (state ${testGrazer.data.state}, until ${testGrazer.data.grazeUntil})`);
            rem(testGrazer);

            // DF 3. Environmental threat fear: shy prey flees approaching predator without a player hunt job
            const envHare = add("hare", px, py, { ai: "wander", state: "idle" });
            const envWolf = add("wolf", px + 3, py, { ai: "none" });
            const hareX0 = envHare.x, hareY0 = envHare.y;
            fleeTick(W, 180);
            const hareFled = envHare.data.state === "flee" && !!envHare.goal;
            const hareFarther = envHare.goal ? (envHare.goal.x - envWolf.x) ** 2 + (envHare.goal.y - envWolf.y) ** 2 > (hareX0 - envWolf.x) ** 2 + (hareY0 - envWolf.y) ** 2 : false;
            t.check("environmental_flee", hareFled && hareFarther,
                `unhunted hare at (${hareX0},${hareY0}) detected wolf at (${envWolf.x},${envWolf.y}): fled: ${hareFled}, goal farther: ${hareFarther} (${envHare.goal ? `(${envHare.goal.x},${envHare.goal.y})` : "none"})`);
            rem(envHare); rem(envWolf);

            // DF 4. Herd alarm & scatter: startling one member alerts nearby herdmates to wake and flee
            const deerA = add("deer", px, py, { ai: "wander", herd: 999, state: "idle" });
            const deerB = add("deer", px + 2, py, { ai: "wander", herd: 999, state: "sleep" });
            const alarmThreat = add("wolf", px - 2, py, { ai: "none" });
            fleeTick(W, 210);
            const deerAFled = deerA.data.state === "flee";
            const deerBWoke = deerB.data.state !== "sleep";
            const deerBFled = deerB.data.state === "flee" && !!deerB.goal;
            t.check("herd_alarm", deerAFled && deerBWoke && deerBFled,
                `deerA fled: ${deerAFled}, herdmate deerB woke: ${deerBWoke}, herdmate deerB fled: ${deerBFled} (state ${deerB.data.state}, alarmedAt ${deerB.data.alarmedAt})`);
            rem(deerA); rem(deerB); rem(alarmThreat);

            // DF 5. Autonomous predator hunting & feeding: wolf attacks adjacent low-HP prey, drops yields, feeds
            const huntWolf = add("wolf", px, py, { ai: "wander", state: "idle" });
            const huntHare = add("hare", px + 1, py, { ai: "none", hp: 1 });
            const preyId = huntHare.id;
            predatorTick(W, 240);
            const wolfFeeding = huntWolf.data.state === "feed" && huntWolf.data.feedUntil > 0;
            const hareSlain = W.unit(preyId) === null;
            t.check("predator_hunt", wolfFeeding && hareSlain,
                `wolf attacked adjacent hare: feeding: ${wolfFeeding} (state ${huntWolf.data.state}, until ${huntWolf.data.feedUntil}), prey unit #${preyId} removed/slain: ${hareSlain}`);
            rem(huntWolf); rem(huntHare);

            // DF 6. Defensive retaliation: cornered/threatened beast (boar, hunt.flees false) retaliates instead of fleeing
            const defBoar = add("boar", px, py, { ai: "wander", state: "idle" });
            const boarThreat = add("wolf", px + 1, py, { ai: "none" });
            fleeTick(W, 270);
            const boarRetaliated = defBoar.data.state === "retaliate";
            const boarStayed = defBoar.goal === null;
            t.check("defensive_retaliation", boarRetaliated && boarStayed,
                `boar (flees false) near wolf retaliated: ${boarRetaliated} (state ${defBoar.data.state}), stayed put: ${boarStayed}`);

            await t.waitFrames(3);
            t.screenshot("df_behaviors");

            // 12. Saved: creature data survives a save round-trip, and the save contents carry it.
            const sample = creatures[0];
            const roundTrip = JsonEx.parse(JsonEx.stringify(st));
            const saved = sample && roundTrip.units[sample.id];
            const contents = DataManager.makeSaveContents();
            const inSave = !!contents.ufWorld && !!contents.ufWorld.units && !!contents.ufWorld.units[sample ? sample.id : -1];
            const same = !!saved && saved.data.kind === "creature" && saved.data.species === sample.data.species && JSON.stringify(saved.data.home) === JSON.stringify(sample.data.home) && saved.data.herd === sample.data.herd && JSON.stringify(saved.data.tags) === JSON.stringify(sample.data.tags) && saved.data.tint === sample.data.tint && saved.data.ai === "wander";
            const tinted = creatures.find(u => u.data.tint);
            const tintKept = !tinted || roundTrip.units[tinted.id].data.tint === tinted.data.tint;
            t.check("saved", same && inSave && tintKept,
                sample ? `unit #${sample.id} ${sample.name}: species/home/herd/tags/tint/ai ${same ? "kept" : "CHANGED"} through JsonEx; in makeSaveContents().ufWorld.units: ${inSave}; tint of #${tinted ? tinted.id : "-"} kept: ${tintKept}; ${Object.keys(roundTrip.units).length} units in the round-trip` : "no creatures to save");

            // Screenshot: the start kit herd where it stands (zoom 1).
            const kitHome = spawn && spawn.kit ? spawn.kit : null;
            if (kitHome && kitUnits.length) {
                if (UF.Camera) UF.Camera.setLevel(1);
                $gamePlayer.locate(kitHome.x, kitHome.y);
                await t.waitUntil(() => kitUnits.some(spriteReady), 8000, "a kit herd sprite to load").catch(() => {});
                await t.waitFrames(5);
                t.screenshot("herd_in_view");
            }

            // 13. AI cost: the throttled ticks stay cheap with every creature in the world simulated.
            Wildlife.resetPerf();
            await t.waitFrames(WANDER_EVERY * 2 + 2);
            const p = Wildlife.perf();
            t.check("perf", p.ticks >= 6 && p.avgMs <= 1.0, `${p.ticks} AI ticks (flee every ${FLEE_EVERY}, wander every ${WANDER_EVERY}) over ${WANDER_EVERY * 2 + 2} frames: avg ${p.avgMs.toFixed(3)} ms per tick (flee ${p.fleeMs.toFixed(1)}ms, pred ${p.predMs.toFixed(1)}ms, graze ${p.grazeMs.toFixed(1)}ms, wander ${p.wanderMs.toFixed(1)}ms, sleep ${p.sleepMs.toFixed(1)}ms) with ${W.units().length} units in the world`);

            // Clean up.
            for (const u of added) W.removeUnit(u.id);
            if (UF.Objects) for (const o of placedObjects.reverse()) UF.Objects.set(o.x, o.y, o.was);
            if (UF.Camera) UF.Camera.setLevel(1);
            $gamePlayer.locate(mid, mid);
            await t.waitFrames(5);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during wildlife checks");
        });

        // Diagnostic (on request: --suite wildlife_seeds): the planned population over many seeds, so a marginal
        // herd count shows up as numbers rather than as a random failure of spawned_with_world on some other day.
        UF.Test.suite("wildlife_seeds", async t => {
            const W = World(), st = W && W.state;
            if (!st) {
                t.check("world_ready", false, "no world state");
                return;
            }
            const synthetic = seed => ({ zRange: st.zRange, seed, size: st.size, areasX: st.areasX, areasY: st.areasY, startArea: { x: st.startArea.x, y: st.startArea.y }, units: {}, nextUnitId: 1, diffs: {}, objectDiffs: {} });
            const K = herdScale();
            const rows = [];
            const t0 = now();
            for (let i = 0; i < 24; i++) {
                const seed = (1000003 * (i + 1) + 7) >>> 0;
                const s2 = synthetic(seed);
                const saved = W.state;
                W.state = s2; // UF.WorldGen.cellInfo reads UF.World.state (the same swap UF_History's checks use)
                let plan;
                try {
                    plan = planWorld(s2);
                } finally {
                    W.state = saved;
                }
                const sample = Object.values(plan.samples)[0] || {};
                const tame = sample.savageryShares ? Math.round((sample.savageryShares.tame || 0) * 100) : NaN;
                const creatures = plan.herds.reduce((n, h) => n + h.cells.length, 0);
                const monsters = plan.herds.filter(h => (speciesById(h.species) || {}).kind === "monster").length;
                rows.push({ seed, tier: `${sample.savagery}/${sample.alignment}`, tame, herds: plan.herds.length, creatures, monsters, dropped: plan.dropped });
            }
            const counts = rows.map(r => r.creatures);
            const min = Math.min(...counts), max = Math.max(...counts), mean = counts.reduce((a, b) => a + b, 0) / counts.length;
            const below = rows.filter(r => r.creatures < 60);
            t.check("population_over_seeds", below.length === 0,
                `${rows.length} seeds planned in ${(now() - t0).toFixed(0)} ms (K ${K.toFixed(2)}, per-point savagery): creatures min ${min}, mean ${mean.toFixed(1)}, max ${max}; ${below.length} seed(s) below 60 [${below.map(r => `${r.seed} ${r.tier} ${r.herds}h/${r.creatures}c`).join(", ")}]; `
                + `rows: ${rows.map(r => `${r.tier} (${r.tame}% tame) ${r.herds}h/${r.creatures}c, ${r.monsters} monster herd(s), ${r.dropped} dropped`).join("; ")}`);
        }, { isDefault: false });
    }
})();
