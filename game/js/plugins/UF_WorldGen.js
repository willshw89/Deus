//=============================================================================
// UF_WorldGen.js - The world from the seed: climate fields, biomes, water, ground tiles, objects, sites, the start
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF WorldGen] Builds UF_World areas from the seed and data/UF_WorldCatalog.json: climate fields, biomes, ocean, lakes, rivers, ground autotiles, dense objects, faction sites, the start.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_World
 *
 * @help
 * Reads data/UF_WorldCatalog.json at boot. Every cell of the world is a pure
 * function of the seed and its world coordinates (gx = ax*256 + x): climate
 * fields (elevation, rainfall, temperature, drainage, volcanism, savagery,
 * alignment, salinity) become a biome, a ground kind, a water kind and a
 * region character. So any cell can be classified without building its
 * area, and areas match at their edges.
 *
 * Building an area (UF_World generator "uf_worldgen", order 10):
 *   1. classify every cell once (biome, ground, water, peak, region),
 *   2. ground autotiles (UF_Tiles A2 kinds, outlines where the kind changes)
 *      and water autotiles (A1 kinds from the catalog, edges against any water),
 *      region 250 on peaks,
 *   3. objects into the area's object grid (type = catalog objects index + 1):
 *      the biome's plant table walked in catalog order, seeded patches,
 *      one object per cell, no caps,
 *   4. faction sites from UF_History (cleared disc, stamped pieces; the
 *      year-1 camps of a New Game have no pieces, only the cleared disc),
 *   5. the start: a clearing, the start pair as events 1 and 2 until
 *      UF_Colonists exists,
 *   6. the resource kit (catalog start.kit) around every faction's area
 *      centre (2026-09-19; before that around the start only).
 *
 * Contract: docs/design/WORLD_ARCHITECTURE.md section 3.
 * API and checks: docs/systems/UF_WorldGen.md
 *
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const CATALOG_VAR = "$ufWorldCatalog";
    if (!DataManager.isBattleTest() && !DataManager.isEventTest()) {
        DataManager._databaseFiles.push({ name: CATALOG_VAR, src: "UF_WorldCatalog.json" });
    }
    const catalog = () => window[CATALOG_VAR] || null;
    const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

    // One salt per field or feature, so every noise field is independent of the others.
    const SALT = Object.freeze({
        elevation: 0x1e11, rainfall: 0x2a1f, temperature: 0x3e3f, drainage: 0x4d4a, volcanism: 0x5f0c,
        savagery: 0x6a5a, alignment: 0x7a11, lake: 0x8a4e, detail: 0x9d37,
        river: 0x21e5, riverWidth: 0x21e6, riverPhase: 0x7e11, pond: 0x90ed, names: 0x4e41, kit: 0x6b17
    });
    const PEAK_REGION = 250;   // impassable rock (informational: UF_Tiles flags peak_rock itself)
    const WATER_DIST_MAX = 4;  // how far from water "avoidWater" can ask for
    const FLAG_PEAK = 1, FLAG_CURSED = 2, FLAG_BLESSED = 4;

    //-------------------------------------------------------------------------
    // Deterministic hashing and noise. Every value comes from (seed, salt, coordinates), never from call order.

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
    function mix(h) {
        h ^= h >>> 15;
        h = Math.imul(h, 0x2c1b3c6d) >>> 0;
        return (h ^ (h >>> 12)) >>> 0;
    }
    function hash32(...parts) {
        let h = FNV_OFFSET;
        for (const p of parts) h = fnv(h, p);
        return mix(h);
    }
    // Fixed arity for the per-cell hot path (no argument array). Same result as hash32(a, b, c, d).
    const hash4 = (a, b, c, d) => mix(fnv(fnv(fnv(fnv(FNV_OFFSET, a), b), c), d));
    const unit4 = (a, b, c, d) => hash4(a, b, c, d) / 4294967296;
    const unit = (...parts) => hash32(...parts) / 4294967296;
    const hashString = s => {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
        return h;
    };
    function mulberry32(a) {
        return () => {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const smooth = t => t * t * (3 - 2 * t);
    /** smoothstep(a, b, v): 0 at v = a, 1 at v = b (a may be larger than b). */
    const smoothstep = (a, b, v) => smooth(clamp01((v - a) / (b - a)));

    // Lattice corners are memoized per (seed, salt): an area build reads each corner thousands of times.
    const cornerCaches = new Map();
    let cornerSeed = null;
    function corner(seed, salt, ix, iy) {
        if (seed !== cornerSeed) {
            cornerCaches.clear();
            cornerSeed = seed;
        }
        let m = cornerCaches.get(salt);
        if (!m) {
            m = new Map();
            cornerCaches.set(salt, m);
        }
        const key = (iy + 64) * 65536 + (ix + 64);
        let v = m.get(key);
        if (v === undefined) {
            if (m.size > 65536) m.clear();
            v = unit4(seed, salt, ix, iy);
            m.set(key, v);
        }
        return v;
    }
    /** Smooth value noise in 0-1 at world cell (gx, gy), lattice spacing `scale` cells. */
    function valueNoise(seed, salt, gx, gy, scale) {
        const fx = gx / scale, fy = gy / scale;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const tx = smooth(fx - ix), ty = smooth(fy - iy);
        const a = corner(seed, salt, ix, iy), b = corner(seed, salt, ix + 1, iy);
        const c = corner(seed, salt, ix, iy + 1), d = corner(seed, salt, ix + 1, iy + 1);
        const top = a + (b - a) * tx, bottom = c + (d - c) * tx;
        return top + (bottom - top) * ty;
    }

    //-------------------------------------------------------------------------
    // Autotile shapes, derived from the engine's own table so they match the editor

    let shapeLookup = null;
    function autotileShape(same) {
        if (!shapeLookup) {
            shapeLookup = new Map();
            for (let s = 0; s < 47; s++) shapeLookup.set(JSON.stringify(Tilemap.FLOOR_AUTOTILE_TABLE[s]), s);
        }
        const n = same(0, -1), s = same(0, 1), w = same(-1, 0), e = same(1, 0);
        const nw = same(-1, -1), ne = same(1, -1), sw = same(-1, 1), se = same(1, 1);
        const tl = n && w ? (nw ? [2, 4] : [2, 0]) : (!n && !w ? [0, 2] : (n ? [0, 4] : [2, 2]));
        const tr = n && e ? (ne ? [1, 4] : [3, 0]) : (!n && !e ? [3, 2] : (n ? [3, 4] : [1, 2]));
        const bl = s && w ? (sw ? [2, 3] : [2, 1]) : (!s && !w ? [0, 5] : (s ? [0, 3] : [2, 5]));
        const br = s && e ? (se ? [1, 3] : [3, 1]) : (!s && !e ? [3, 5] : (s ? [3, 3] : [1, 5]));
        const key = JSON.stringify([tl, tr, bl, br]);
        return shapeLookup.has(key) ? shapeLookup.get(key) : 0;
    }
    // Neighbor bits for the fast table: N S W E NW NE SW SE.
    const NB = [[0, -1, 1], [0, 1, 2], [-1, 0, 4], [1, 0, 8], [-1, -1, 16], [1, -1, 32], [-1, 1, 64], [1, 1, 128]];
    let shapeByMask = null;
    function shapeTable() {
        if (shapeByMask) return shapeByMask;
        shapeByMask = new Uint8Array(256);
        for (let mask = 0; mask < 256; mask++) {
            shapeByMask[mask] = autotileShape((dx, dy) => {
                const nb = NB.find(n => n[0] === dx && n[1] === dy);
                return (mask & nb[2]) !== 0;
            });
        }
        return shapeByMask;
    }
    const autotileBase = tileId => tileId - ((tileId - Tilemap.TILE_ID_A1) % 48);

    //-------------------------------------------------------------------------
    // Public object

    const WorldGen = {
        catalog,
        hash32, hashString, mulberry32, unit, valueNoise, smoothstep,
        autotileShape,
        autotileShapeCount: () => {
            autotileShape(() => true);
            return shapeLookup.size;
        },
        PEAK_REGION,
        stats: {},      // "ax,ay" -> { objectId: count } from the last build of each area
        lastBuild: null, // { area: {x, y}, ms, objects, biomes: { id: cells } } of the last build
        fieldsFor: (seed, d, cl, gx, gy) => fieldsFor(seed, d, cl, gx, gy),
        dims: st => dims(st)
    };
    window.UF = window.UF || {};
    window.UF.WorldGen = WorldGen;

    //-------------------------------------------------------------------------
    // World dimensions and the compiled catalog

    function dims(state) {
        const st = state || (window.UF.World && UF.World.state) || null;
        const size = st ? st.size : 256;
        const areasX = st ? st.areasX : 1, areasY = st ? st.areasY : 1;
        const start = st ? st.startArea : { x: 0, y: 0 };
        return {
            seed: st ? st.seed : 0, size, areasX, areasY, width: areasX * size, height: areasY * size,
            startX: start.x * size + Math.floor(size / 2), startY: start.y * size + Math.floor(size / 2)
        };
    }
    const tierIndex = (tiers, v) => {
        for (let i = 0; i < tiers.length; i++) if (v < tiers[i].below) return i;
        return tiers.length - 1;
    };

    // Catalog lookups resolved once per catalog object (ids -> indices, plant tables per biome and alignment).
    let model = null;
    function compiled() {
        const cat = catalog();
        if (!cat || !cat.biomes || !cat.climate || !cat.groundKinds || !cat.water) return null;
        if (model && model.source === cat) return model;
        const biomeIds = Object.keys(cat.biomes).filter(k => cat.biomes[k] && typeof cat.biomes[k] === "object");
        const groundIds = cat.groundKinds.map(g => g.id);
        const waterKeys = Object.keys(cat.water.surface || {});
        const objectById = new Map();
        (cat.objects || []).forEach((o, i) => { if (o && o.id) objectById.set(o.id, { entry: o, typeId: i + 1 }); });
        const regions = cat.regions || {};
        model = {
            source: cat,
            biomeIds, biomes: biomeIds.map(id => cat.biomes[id]), biomeIndex: new Map(biomeIds.map((id, i) => [id, i])),
            groundIds, groundIndex: new Map(groundIds.map((id, i) => [id, i])),
            waterKeys, waterIndex: new Map(waterKeys.map((k, i) => [k, i])),
            objectById,
            savTiers: (regions.savagery || [{ id: "wild", below: 1.01 }]),
            alignTiers: (regions.alignment || [{ id: "neutral", below: 1.01 }]),
            regions,
            plantTables: new Map()
        };
        return model;
    }
    // The plant table of a biome under an alignment: [{ typeId, chance, salt, rollSalt, clump, clumpScale, avoidWater }], land and water lists.
    function plantTable(m, b, alignId) {
        const key = `${b}:${alignId}`;
        let table = m.plantTables.get(key);
        if (table) return table;
        const r = m.regions;
        let list = Object.entries(m.biomes[b].plants || {});
        if (alignId === "cursed") {
            const remove = new Set(r.cursedRemove || []);
            list = list.filter(([id]) => !remove.has(id)).concat(Object.entries(r.cursedPlants || {}));
        } else if (alignId === "blessed") {
            list = list.concat(Object.entries(r.blessedPlants || {}));
        }
        table = { land: [], water: [] };
        for (const [id, chance] of list) {
            const o = m.objectById.get(id);
            if (!o || !(chance > 0)) continue;
            const salt = hashString(id);
            const entry = {
                id, typeId: o.typeId, chance, salt, rollSalt: (salt ^ 0x9e3779b9) >>> 0,
                clump: clamp01(o.entry.clump || 0), clumpScale: Math.max(2, o.entry.clumpScale || 16), avoidWater: o.entry.avoidWater | 0
            };
            (o.entry.onWater ? table.water : table.land).push(entry);
        }
        m.plantTables.set(key, table);
        return table;
    }

    //-------------------------------------------------------------------------
    // Fields (section 3.1): all 0-1, pure functions of seed and world coordinates

    function fieldsFor(seed, d, cl, gx, gy) {
        const sc = cl.scale;
        // Each field: its own noise plus a detail octave at 25 % weight.
        const n = (salt, scale) => valueNoise(seed, salt, gx, gy, scale) * 0.75 + valueNoise(seed, salt ^ SALT.detail, gx, gy, sc.detail) * 0.25;
        // Continent mask: the world's rim is ocean or coast.
        const edge = Math.min(gx, gy, d.width - 1 - gx, d.height - 1 - gy);
        const mask = smoothstep(0, 1, edge / (d.width * cl.continentRim));
        let e = n(SALT.elevation, sc.elevation) * mask;
        let r = n(SALT.rainfall, sc.rainfall);
        // North is cold, high ground is cold.
        let t = clamp01(0.15 + 0.7 * (1 - gy / d.height) + (n(SALT.temperature, sc.temperature) - 0.5) * 0.4 - Math.max(0, e - 0.5) * 0.6);
        let dr = n(SALT.drainage, sc.drainage);
        let v = n(SALT.volcanism, sc.volcanism);
        let sav = n(SALT.savagery, sc.savagery);
        let al = n(SALT.alignment, sc.alignment);
        // The start is always temperate and habitable: blend toward startClimate near it.
        const radius = cl.startHabitableRadius || [28, 110];
        const w = smoothstep(radius[1], radius[0], Math.hypot(gx - d.startX, gy - d.startY));
        if (w > 0 && cl.startClimate) {
            const s = cl.startClimate;
            e += (s.elevation - e) * w;
            r += (s.rainfall - r) * w;
            t += (s.temperature - t) * w;
            dr += (s.drainage - dr) * w;
            v += (s.volcanism - v) * w;
            sav += (s.savagery - sav) * w;
            al += (s.alignment - al) * w;
        }
        const sal = clamp01(1 - (e - cl.seaLevel) / 0.08);
        return { e, r, t, d: dr, v, sav, al, sal };
    }
    const isLake = (seed, cl, f, gx, gy) => {
        const L = cl.lakes;
        return !!L && f.e >= cl.seaLevel && f.e < cl.mountainLevel && f.d < L.maxDrainage && f.r > L.minRainfall
            && valueNoise(seed, SALT.lake, gx, gy, L.scale) > L.threshold;
    };

    /** Biome id from fields (section 3.3). Pure. */
    function classify(cl, f, lake) {
        const { e, r, t, d, v, sal } = f;
        if (e < cl.seaLevel) return t < 0.2 ? "ocean_arctic" : t < 0.65 ? "ocean_temperate" : "ocean_tropical";
        if (lake) return sal > 0.66 ? "lake_salt" : sal > 0.33 ? "lake_brackish" : "lake_fresh";
        if (e >= cl.mountainLevel) return "mountain";
        if (t < 0.12) return "glacier";
        if (t < 0.25) return r > 0.55 && d < 0.4 ? "marsh_temperate_fresh" : "tundra";
        if (r > 0.6 && d < 0.35) {
            const tropical = t > 0.65, salt = sal > 0.5;
            // Mangroves only on the very salty shore band (sal > 0.8), so tropical salt swamps exist behind them.
            if (tropical && sal > 0.8 && r > 0.75) return "swamp_mangrove";
            const zone = tropical ? "tropical" : "temperate", water = salt ? "salt" : "fresh";
            return `${r > 0.75 ? "swamp" : "marsh"}_${zone}_${water}`;
        }
        if (t < 0.45) return r > 0.5 ? "taiga" : r > 0.3 ? "forest_temperate_conifer" : r > 0.18 ? "grassland_temperate" : "shrubland_temperate";
        if (t < 0.65) {
            if (r > 0.6) return "forest_temperate_broadleaf";
            if (r > 0.45) return d > 0.5 ? "forest_temperate_conifer" : "forest_temperate_broadleaf";
            return r > 0.3 ? "grassland_temperate" : r > 0.18 ? "savanna_temperate" : r > 0.1 ? "shrubland_temperate" : "desert_rock";
        }
        if (r > 0.7) return "forest_tropical_moist_broadleaf";
        if (r > 0.5) return d > 0.6 ? "forest_tropical_conifer" : "forest_tropical_dry_broadleaf";
        if (r > 0.35) return "grassland_tropical";
        if (r > 0.2) return "savanna_tropical";
        if (r > 0.12) return "shrubland_tropical";
        return d > 0.5 ? "desert_sand" : v > 0.5 ? "desert_badland" : "desert_rock";
    }

    //-------------------------------------------------------------------------
    // Water bodies (section 3.2): rivers and the start pond are models in world coordinates

    function makeRiver(anchorX, anchorY, halfWidth, phase, amp, period) {
        const center = gy => {
            const dd = gy - anchorY;
            return anchorX + amp * (0.7 * Math.sin((2 * Math.PI * dd) / period + phase) + 0.3 * Math.sin((2 * Math.PI * dd) / (period * 0.43) + 2 * phase));
        };
        return { anchorX, anchorY, halfWidth, center, isWater: (gx, gy) => Math.abs(gx - Math.round(center(gy))) <= halfWidth };
    }
    /** All rivers of this world: north-south meanders at seeded columns, never within keepAwayFromStart of the start. */
    WorldGen.riverModels = function(state) {
        const cat = catalog();
        const R = cat && cat.rivers;
        if (!R || !state) return [];
        const d = dims(state), seed = state.seed;
        const [cMin, cMax] = R.count || [1, 1];
        const count = cMin + Math.floor(unit(seed, SALT.river, 0xffff) * (cMax - cMin + 1));
        const [hMin, hMax] = R.halfWidth || [1, 1];
        const keep = R.keepAwayFromStart || 14;
        const rivers = [];
        for (let i = 0; i < count; i++) {
            const hw = hMin + Math.floor(unit(seed, SALT.riverWidth, i) * (hMax - hMin + 1));
            const phase = unit(seed, SALT.riverPhase, i) * Math.PI * 2;
            let chosen = null;
            for (let j = 0; j < 60 && !chosen; j++) {
                const m = makeRiver(Math.floor(unit(seed, SALT.river, i * 64 + j) * d.width), d.startY, hw, phase, R.meanderCells || 0, R.meanderPeriodCells || 97);
                let clear = true;
                for (let dy = -keep; dy <= keep && clear; dy += 2) {
                    if (Math.abs(Math.round(m.center(d.startY + dy)) - d.startX) <= keep + hw) clear = false;
                }
                // Rivers keep apart, so two don't run as one wide river.
                if (clear && rivers.some(o => Math.abs(o.anchorX - m.anchorX) < 24)) clear = false;
                if (clear) chosen = m;
            }
            rivers.push(chosen || makeRiver(d.startX + keep * 3 * (i + 1), d.startY, hw, phase, R.meanderCells || 0, R.meanderPeriodCells || 97));
        }
        return rivers;
    };
    /** The first river (older callers). */
    WorldGen.riverModel = state => WorldGen.riverModels(state)[0] || null;

    /** A pond at a random direction and distance from the start (catalog start.pond), so the pair can drink. */
    WorldGen.pondModel = function(state) {
        const cat = catalog();
        const p = cat && cat.start && cat.start.pond;
        if (!p || !state) return null;
        const d = dims(state), seed = state.seed;
        const [dmin, dmax] = p.distance || [10, 30];
        const [rmin, rmax] = p.radius || [2, 5];
        const angle = unit(seed, SALT.pond, 0) * Math.PI * 2;
        const dist = dmin + unit(seed, SALT.pond, 1) * (dmax - dmin);
        const rx = rmin + unit(seed, SALT.pond, 2) * (rmax - rmin), ry = rmin + unit(seed, SALT.pond, 3) * (rmax - rmin);
        const cx = d.startX + Math.cos(angle) * dist, cy = d.startY + Math.sin(angle) * dist;
        return { cx, cy, rx, ry, isWater: (gx, gy) => ((gx - cx) / rx) ** 2 + ((gy - cy) / ry) ** 2 <= 1 };
    };

    // Rivers and pond are built once per world (seed and size) and reused by every cell lookup.
    let waterCache = null;
    function waterModels(state) {
        const d = dims(state);
        const key = `${d.seed}:${d.areasX}x${d.areasY}x${d.size}`;
        if (waterCache && waterCache.key === key) return waterCache;
        const rivers = WorldGen.riverModels(state), pond = WorldGen.pondModel(state);
        const cat = catalog();
        const cl = cat.climate;
        const isRiverOrPond = (gx, gy) => {
            for (let i = 0; i < rivers.length; i++) if (rivers[i].isWater(gx, gy)) return true;
            return !!pond && pond.isWater(gx, gy);
        };
        waterCache = {
            key, rivers, pond, isRiverOrPond,
            /** Any water: ocean, lake, river or the start pond. */
            isWater(gx, gy) {
                if (isRiverOrPond(gx, gy)) return true;
                const f = fieldsFor(d.seed, d, cl, gx, gy);
                return f.e < cl.seaLevel || isLake(d.seed, cl, f, gx, gy);
            }
        };
        return waterCache;
    }
    /** { rivers, pond, isWater(gx, gy) } for the world. */
    WorldGen.waterModel = state => waterModels(state || UF.World.state);

    //-------------------------------------------------------------------------
    // One cell, fully resolved (biome, ground, water kind, peak, region). Pure.

    function resolve(seed, d, m, wm, gx, gy, out) {
        const cat = m.source, cl = cat.climate;
        const f = fieldsFor(seed, d, cl, gx, gy);
        const lake = isLake(seed, cl, f, gx, gy);
        const biomeId = classify(cl, f, lake);
        const b = m.biomeIndex.get(biomeId);
        const bio = m.biomes[b];
        const alignIdx = tierIndex(m.alignTiers, f.al), savIdx = tierIndex(m.savTiers, f.sav);
        const alignId = m.alignTiers[alignIdx].id;
        let flags = 0;
        let ground = bio.ground;
        let water = null;
        if (f.e < cl.seaLevel || lake) {
            water = bio.water;
        } else if (wm.isRiverOrPond(gx, gy)) {
            water = alignId === "cursed" ? "blighted" : biomeId.startsWith("swamp") ? "swamp" : biomeId.startsWith("marsh") ? "marsh" : f.t < 0.25 ? "icy" : "fresh";
        } else if (biomeId === "mountain") {
            if (f.e >= cl.peakLevel) {
                ground = "peak_rock";
                flags |= FLAG_PEAK;
            } else if (f.t < 0.35) {
                ground = "snow";
            } else if (f.e < cl.mountainLevel + 0.04) {
                ground = "stony";
            } else if (f.e < cl.mountainLevel + 0.08) {
                ground = "scree";
            } else {
                ground = "rock";
            }
        } else if (!water) {
            // Continuous ecological ground gradient across moisture, temperature, and drainage
            if (bio.ground === "meadow") {
                if (f.r > 0.58 && f.d > 0.38) ground = "forest_floor";
                else if (f.r > 0.48 || f.d < 0.28) ground = "tropical_grass";
                else if (f.r < 0.26 || f.d > 0.68) ground = "dry_grass";
            } else if (bio.ground === "dry_grass") {
                if (f.r > 0.36) ground = "meadow";
                else if (f.r < 0.16 || f.d > 0.72) ground = "shrub_soil";
            } else if (bio.ground === "shrub_soil") {
                if (f.r > 0.28) ground = "dry_grass";
                else if (f.d > 0.75) ground = "dirt";
            } else if (bio.ground === "dirt") {
                if (f.r > 0.34) ground = "shrub_soil";
                else if (f.d > 0.72) ground = "red_clay";
            } else if (bio.ground === "red_clay") {
                if (f.r > 0.30) ground = "dirt";
                else if (f.r < 0.14) ground = "sand";
            } else if (bio.ground === "sand") {
                if (f.r > 0.22 && f.d < 0.62) ground = "shrub_soil";
                else if (f.d > 0.70) ground = "red_clay";
            } else if (bio.ground === "forest_floor") {
                if (f.r < 0.52 && f.d < 0.45) ground = "meadow";
                else if (f.t < 0.36) ground = "needle_floor";
                else if (f.r > 0.65 && f.t > 0.60) ground = "jungle_floor";
            } else if (bio.ground === "needle_floor") {
                if (f.t > 0.50 && f.r > 0.48) ground = "forest_floor";
                else if (f.t < 0.20) ground = "tundra";
            } else if (bio.ground === "tundra") {
                if (f.t > 0.28) ground = "needle_floor";
                else if (f.t < 0.16) ground = "snow";
            } else if (bio.ground === "snow") {
                if (f.t > 0.22) ground = "tundra";
                else if (f.t < 0.10 && f.d > 0.60) ground = "ice";
            } else if (bio.ground === "ice") {
                if (f.t > 0.15) ground = "snow";
            } else if (bio.ground === "mud") {
                if (f.r < 0.38 || f.d > 0.55) ground = "dirt";
                else if (f.r > 0.65) ground = "swamp_mud";
            } else if (bio.ground === "swamp_mud") {
                if (f.r < 0.50) ground = "mud";
            } else if (bio.ground === "ash") {
                if (f.e > (cl.mountainLevel || 0.6) - 0.05) ground = "scree";
                else if (f.d > 0.65) ground = "rock";
            }
        }
        if (alignId === "cursed") {
            flags |= FLAG_CURSED;
            ground = (m.regions.cursedGround || {})[ground] || ground;
        } else if (alignId === "blessed") {
            flags |= FLAG_BLESSED;
            ground = (m.regions.blessedGround || {})[ground] || ground;
        }
        out.b = b;
        out.biomeId = biomeId;
        out.g = m.groundIndex.has(ground) ? m.groundIndex.get(ground) : 0;
        out.groundId = ground;
        out.w = water && m.waterIndex.has(water) ? m.waterIndex.get(water) + 1 : 0;
        out.waterKey = water;
        out.flags = flags;
        out.align = alignIdx;
        out.sav = savIdx;
        out.lake = lake;
        out.f = f;
        return out;
    }

    //-------------------------------------------------------------------------
    // Public cell API (section 3.9): cheap, no area build

    WorldGen.fields = function(gx, gy) {
        const cat = catalog();
        const d = dims();
        return fieldsFor(d.seed, d, cat.climate, gx, gy);
    };
    WorldGen.classify = function(f, lake) {
        return classify(catalog().climate, f, !!lake);
    };
    WorldGen.lakeAt = function(gx, gy) {
        const cat = catalog(), d = dims();
        return isLake(d.seed, cat.climate, fieldsFor(d.seed, d, cat.climate, gx, gy), gx, gy);
    };
    WorldGen.biomeAt = (gx, gy, z = 0) => { const c = WorldGen.cellInfo(gx, gy, z); return c ? c.biomeId : null; };
    /** { biomeId, biome, ground, water, walkable, region: {savagery, alignment}, fields, lake, peak } for a world cell. */
    WorldGen.cellInfo = function(gx, gy, z = 0) {
        const m = compiled();
        const st = UF.World.state;
        if (!m || !st) return null;
        if (!Number.isInteger(z) || z < -2 || z > 2) return null;
        if (z !== 0) {
            const L = window.UF.Levels;
            if (!L) return null;
            const ax = Math.floor(gx / st.size), ay = Math.floor(gy / st.size);
            const ref = { area: { x: ax, y: ay }, x: gx - ax * st.size, y: gy - ay * st.size, z };
            const c = L.cellAt(ref);
            if (!c) return null;
            const biome = typeof L.biomeAt === "function" ? L.biomeAt(ref) : null;
            const biomeId = typeof biome === "string" ? biome : biome && biome.id;
            return { biomeId: biomeId || (z < 0 ? "cavern" : "open_air"),
                biome: typeof biome === "object" && biome ? biome : { id: biomeId || "cavern", name: biomeId || "Cavern" },
                ground: c.material, water: c.water || null, walkable: !c.water && L.standableShape(ref),
                region: { savagery: "wild", alignment: "ordinary" }, fields: null, lake: !!c.water, peak: false, z };
        }
        const c = resolve(st.seed, dims(st), m, waterModels(st), gx, gy, {});
        return {
            biomeId: c.biomeId, biome: m.biomes[c.b], ground: c.groundId, water: c.waterKey,
            walkable: !c.waterKey && !(c.flags & FLAG_PEAK),
            region: { savagery: m.savTiers[c.sav].id, alignment: m.alignTiers[c.align].id },
            fields: c.f, lake: c.lake, peak: !!(c.flags & FLAG_PEAK)
        };
    };
    WorldGen.cellInfoLocal = function(ax, ay, x, y, z = 0) {
        const size = dims().size;
        return WorldGen.cellInfo(ax * size + x, ay * size + y, z);
    };
    WorldGen.isWaterAt = (gx, gy, z = 0) => z === 0 ? waterModels(UF.World.state).isWater(gx, gy) : !!((WorldGen.cellInfo(gx, gy, z) || {}).water);

    /** The pair's names for this seed: { male, female }. */
    WorldGen.startNames = function(seed) {
        const n = (catalog().start || {}).names;
        if (!n) return { male: "TEST_man", female: "TEST_woman" };
        const pick = (list, k) => list[Math.floor(unit(seed, SALT.names, k) * list.length)];
        const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
        const male = cap(pick(n.start, 0) + pick(n.male, 1));
        let female = cap(pick(n.start, 2) + pick(n.female, 3));
        if (female === male) female = cap(pick(n.start, 4) + pick(n.female, 5));
        return { male, female };
    };

    /**
     * Where the kit goes in an area: [{ x, y, faction, camp? }] = every faction's campfire in it (its year-1 camp,
     * UF_History, 2026-09-19 afternoon: VISION V4/V67; the camp cell is the area centre unless the centre's 3 x 3 block
     * isn't all land), else its area centre (faction.home), the player's first. Without factions, or for a save whose
     * history is from the older generator (no founders), the start cell of the start area only, as before.
     */
    WorldGen.kitCentres = function(ax, ay, z = 0) {
        const st = window.UF.World && UF.World.state;
        if (!st || !Number.isInteger(z) || z < -2 || z > 2) return [];
        const F = st.factions;
        const legacy = !!st.history && !st.history.founders;
        if (!legacy && F && Array.isArray(F.list) && F.list.length) {
            const camps = st.history && Array.isArray(st.history.sites) ? st.history.sites.filter(s => s.bare && s.area && s.area.x === ax && s.area.y === ay && (s.z === undefined ? (s.area.z === undefined ? 0 : s.area.z) : s.z) === z) : [];
            return F.list.filter(f => f.home && f.home.area)
                .sort((a, b) => (b.id === F.playerId ? 1 : 0) - (a.id === F.playerId ? 1 : 0))
                .flatMap(f => {
                    const found = camps.filter(s => s.faction === f.id);
                    if (found.length) return found.map(camp => ({ x: camp.x, y: camp.y, faction: f.id, camp: camp.id, z }));
                    const h = f.home, hz = h.z === undefined ? (h.area.z === undefined ? 0 : h.area.z) : h.z;
                    return h.area.x === ax && h.area.y === ay && hz === z ? [{ x: h.x, y: h.y, faction: f.id, z }] : [];
                });
        }
        const mid = Math.floor(st.size / 2);
        return z === 0 && ax === st.startArea.x && ay === st.startArea.y ? [{ x: mid, y: mid, faction: null }] : [];
    };

    /** catalog start.kit with defaults: { radius, objects, ore: { ids, count } | null, nearWater, firstStage, water, wildlife }. */
    WorldGen.kitConfig = function() {
        const kit = (catalog() && catalog().start && catalog().start.kit) || {};
        const ore = kit.ore && Array.isArray(kit.ore.ids) && kit.ore.ids.length ? { ids: kit.ore.ids.slice(), count: Array.isArray(kit.ore.count) ? kit.ore.count.slice(0, 2) : [1, 1] } : null;
        return Object.assign({}, kit, { radius: kit.radius || [5, 20], objects: kit.objects || {}, ore, nearWater: Array.isArray(kit.nearWater) ? kit.nearWater : [] });
    };

    // The kit's entries for one centre: every start.kit.objects id at its minimum, then the ore outcrop (one id of
    // kit.ore.ids and a count within kit.ore.count, both seeded per area and centre). Any id of an entry already
    // standing within the radius counts toward it.
    function kitEntries(kit, seed, ax, ay, ci) {
        const out = Object.entries(kit.objects).map(([id, minimum]) => ({ key: id, ids: [id], place: id, minimum: minimum | 0 }));
        if (kit.ore) {
            const rng = mulberry32(hash32(seed, SALT.kit, ax, ay, ci * 256 + 255));
            const place = kit.ore.ids[Math.floor(rng() * kit.ore.ids.length)];
            const [lo, hi] = [kit.ore.count[0] | 0, Math.max(kit.ore.count[0] | 0, kit.ore.count[kit.ore.count.length - 1] | 0)];
            out.push({ key: "ore", ids: kit.ore.ids.slice(), place, minimum: lo + Math.floor(rng() * (hi - lo + 1)) });
        }
        return out;
    }

    //-------------------------------------------------------------------------
    // What the kit must cover (VISION V67): the colony plan's first stage (catalog start.kit.firstStage) for every
    // culture, and what each object is worth in those materials.

    const KIT_RESOURCES = ["log", "stone", "fiber", "straw", "food", "ore"];
    const itemTypes = () => new Map((((catalog() || {}).items || {}).types || []).map(i => [i.id, i]));
    // An item's resource: log, stone, fiber, straw as themselves, any food item as "food", any ore item as "ore".
    function resourceOf(itemId, types) {
        if (["log", "stone", "fiber", "straw"].includes(itemId)) return itemId;
        const t = types.get(itemId);
        const tags = (t && t.tags) || [];
        if (t && (t.food || tags.includes("food"))) return "food";
        if (tags.includes("ore")) return "ore";
        return null;
    }
    let worthCache = null;
    /**
     * What an object is worth: { log, stone, fiber, straw, food, ore } = per resource, the most one object yields
     * through its actions, following what it becomes (an oak: 3 logs, then its stump 1 more = 4; a granite boulder:
     * 4 stones, then the loose stones it leaves 2 more = 6). Regrowth isn't counted.
     */
    WorldGen.objectWorth = function(idOrTypeId) {
        const cat = catalog();
        if (!cat) return null;
        if (!worthCache || worthCache.source !== cat.objects) worthCache = { source: cat.objects, byId: new Map(), objects: new Map(cat.objects.map(o => [o.id, o])), types: itemTypes() };
        const byId = worthCache.objects, types = worthCache.types;
        const worth = (id, depth) => {
            if (worthCache.byId.has(id)) return worthCache.byId.get(id);
            const zero = Object.fromEntries(KIT_RESOURCES.map(k => [k, 0]));
            const o = byId.get(id);
            if (!o || depth > 8) return zero;
            const best = Object.assign({}, zero);
            for (const a of Object.values(o.actions || {})) {
                const got = Object.assign({}, zero);
                for (const [item, n] of Object.entries(a.yields || {})) {
                    const r = resourceOf(item, types);
                    if (r) got[r] += n | 0;
                }
                const after = a.becomes ? worth(a.becomes, depth + 1) : zero;
                for (const k of KIT_RESOURCES) best[k] = Math.max(best[k], got[k] + after[k]);
            }
            worthCache.byId.set(id, best);
            return best;
        };
        const id = typeof idOrTypeId === "number" ? ((cat.objects[idOrTypeId - 1] || {}).id || null) : idOrTypeId;
        return id ? worth(id, 0) : null;
    };

    /**
     * The first stage of the colony plan, in materials (VISION V67): for every culture (catalog cultures, its plan
     * variant and its wall), the steps named in start.kit.firstStage.steps: build steps = the object's build.items per
     * cell (the camp's own centre piece, the campfire, stands at New Game and costs nothing); craft steps = the recipe's
     * inputs once per founder ("each") or as often as "count" needs; stock steps = that many food items; plus
     * mealsPerFounder food items per founder. Returns { founders, steps, meals, byCulture: { species: need }, needs }
     * with needs = the most any culture needs of each resource (every faction gets the same kit).
     */
    WorldGen.kitNeeds = function() {
        const cat = catalog();
        if (!cat || !cat.colony) return null;
        const fs0 = (cat.start && cat.start.kit && cat.start.kit.firstStage) || {};
        const steps = Array.isArray(fs0.steps) ? fs0.steps : [];
        const f = (cat.factions && cat.factions.founders) || {};
        const founders = (f.male | 0) + (f.female | 0);
        const meals = founders * (fs0.mealsPerFounder === undefined ? 1 : Number(fs0.mealsPerFounder) || 0);
        const byId = new Map(cat.objects.map(o => [o.id, o]));
        const recipes = new Map((((cat.recipes || {}).list) || []).map(r => [r.id, r]));
        const types = itemTypes();
        const founding = (cat.sites && cat.sites.founding) || {};
        const centre = (((cat.sites || {}).kinds || {})[founding.kind || "camp"] || {}).center || null;
        const cultures = Object.entries(cat.cultures || {}).filter(([k, v]) => k !== "about" && v && typeof v === "object");
        if (!cultures.length) cultures.push(["default", { plan: "default" }]);
        const byCulture = {};
        const needs = Object.fromEntries(KIT_RESOURCES.filter(k => k !== "ore").map(k => [k, 0]));
        const other = {};
        for (const [species, cu] of cultures) {
            const plan = cu.plan && cu.plan !== "default" && cat.colony.plans && Array.isArray(cat.colony.plans[cu.plan]) ? cat.colony.plans[cu.plan] : (cat.colony.plan || []);
            const need = Object.fromEntries(Object.keys(needs).map(k => [k, 0]));
            const add = (item, n) => {
                const r = resourceOf(item, types);
                if (r && r in need) need[r] += n;
                else other[item] = Math.max(other[item] || 0, n);
            };
            for (const s of plan) {
                if (!steps.includes(s.id)) continue;
                if (s.build) {
                    let b = s.build;
                    if ((b === "wall_wood" || b === "wall_stone") && cu.wall && byId.has(cu.wall)) b = cu.wall;
                    if (b === centre) continue; // the standing campfire is the hearth
                    const o = byId.get(b);
                    for (const [item, n] of Object.entries((o && o.build && o.build.items) || {})) add(item, (n | 0) * (s.cells || []).length);
                } else if (s.craft) {
                    const r = recipes.get(s.craft);
                    if (!r) continue;
                    const out = Object.keys(r.outputs || {})[0];
                    const times = s.each ? founders : Math.ceil(((s.count | 0) || 1) / ((r.outputs || {})[out] || 1));
                    for (const [item, n] of Object.entries(r.inputs || {})) add(item, (n | 0) * times);
                } else if (s.stock) {
                    need.food += s.count | 0;
                }
            }
            need.food += meals;
            byCulture[species] = need;
            for (const k of Object.keys(needs)) needs[k] = Math.max(needs[k], need[k]);
        }
        return { founders, steps: steps.slice(), meals, byCulture, needs, other };
    };
    WorldGen.KIT_RESOURCES = KIT_RESOURCES;
    /** The objects the kit placed in each built area: kitLog["ax,ay"] = [{ c (centre index), faction, id, x, y }]. */
    WorldGen.kitLog = {};

    // Sites of an area from UF_History, if it's installed. Its errors never break the world build.
    function sitesFor(ax, ay) {
        if (!(window.UF.History && typeof UF.History.sitesIn === "function")) return [];
        try {
            return UF.History.sitesIn(ax, ay) || [];
        } catch (e) {
            WorldGen.lastSiteError = String((e && e.message) || e);
            console.warn("UF_WorldGen: UF.History.sitesIn failed:", e);
            return [];
        }
    }

    //-------------------------------------------------------------------------
    // The generator

    function generate(ctx) {
        const cat = catalog(), m = compiled();
        if (!cat || !m || !window.UF.World || !UF.World.state) return;
        const started = now();
        const state = UF.World.state, seed = state.seed;
        const d = dims(state);
        const size = ctx.width, cells = size * size;
        const gx0 = ctx.areaX * size, gy0 = ctx.areaY * size;
        const wm = waterModels(state);
        if (window.UF.Tiles && UF.Tiles.TILESET_ID) ctx.map.tilesetId = UF.Tiles.TILESET_ID;

        // 1. Classify every cell once.
        const biome = new Uint8Array(cells), ground = new Uint8Array(cells), water = new Uint8Array(cells);
        const flags = new Uint8Array(cells), align = new Uint8Array(cells);
        const cell = {};
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                resolve(seed, d, m, wm, gx0 + x, gy0 + y, cell);
                const i = y * size + x;
                biome[i] = cell.b;
                ground[i] = cell.g;
                water[i] = cell.w;
                flags[i] = cell.flags;
                align[i] = cell.align;
            }
        }
        // Neighbors outside this area come from the same pure function, so edges match the next area.
        const outside = new Map();
        const probe = (x, y) => {
            const key = (y + 8) * 4096 + (x + 8);
            let p = outside.get(key);
            if (!p) {
                const c = resolve(seed, d, m, wm, gx0 + x, gy0 + y, {});
                p = { g: c.g, w: c.w };
                outside.set(key, p);
            }
            return p;
        };
        const inside = (x, y) => x >= 0 && y >= 0 && x < size && y < size;
        const groundAt = (x, y) => (inside(x, y) ? ground[y * size + x] : probe(x, y).g);
        const waterAt = (x, y) => (inside(x, y) ? water[y * size + x] !== 0 : probe(x, y).w !== 0);

        // 2. Tiles: water autotiles join any water; ground autotiles join the same ground kind (biome borders get outlines).
        const shapes = shapeTable();
        const waterBases = m.waterKeys.map(k => autotileBase(cat.water.surface[k]));
        const groundBases = m.groundIds.map((id, k) => (window.UF.Tiles && UF.Tiles.groundBase(id) !== null ? UF.Tiles.groundBase(id) : Tilemap.TILE_ID_A2 + k * 48));
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = y * size + x;
                let mask = 0;
                if (water[i]) {
                    for (let k = 0; k < 8; k++) if (waterAt(x + NB[k][0], y + NB[k][1])) mask |= NB[k][2];
                    ctx.setTile(x, y, 0, waterBases[water[i] - 1] + shapes[mask]);
                } else {
                    const g = ground[i];
                    for (let k = 0; k < 8; k++) {
                        const ng = groundAt(x + NB[k][0], y + NB[k][1]);
                        const joins = ng === g || (window.UF && UF.Tiles && UF.Tiles.joins && UF.Tiles.joins(m.groundIds[ng], m.groundIds[g]));
                        if (joins) mask |= NB[k][2];
                    }
                    ctx.setTile(x, y, 0, groundBases[g] + shapes[mask]);
                    if (flags[i] & FLAG_PEAK) ctx.setTile(x, y, 5, PEAK_REGION);
                }
            }
        }

        // Distance to water (0 = water, up to WATER_DIST_MAX), one dilation, for keeping objects off the banks.
        const waterDist = new Uint8Array(cells).fill(WATER_DIST_MAX + 1);
        for (let i = 0; i < cells; i++) if (water[i]) waterDist[i] = 0;
        for (let pass = 1; pass <= WATER_DIST_MAX; pass++) {
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    if (waterDist[y * size + x] !== pass - 1) continue;
                    for (let k = 0; k < 8; k++) {
                        const nx = x + NB[k][0], ny = y + NB[k][1];
                        if (inside(nx, ny) && waterDist[ny * size + nx] > pass) waterDist[ny * size + nx] = pass;
                    }
                }
            }
        }

        // 3. The start (section 3.8): clearing, note, and the pair as events 1 and 2 until UF_Colonists exists.
        const start = ctx.isStart && !ctx.templateRect ? cat.start : null;
        const clearRadius = start ? (start.clearRadius || 0) : 0;
        const cx = ctx.center.x, cy = ctx.center.y;
        const inClearing = (x, y) => clearRadius > 0 && (x - cx) ** 2 + (y - cy) ** 2 <= clearRadius * clearRadius;
        if (start) {
            if (start.note) ctx.map.note = start.note;
            if (start.displayName) ctx.map.displayName = start.displayName;
            if (!window.UF.Colonists) {
                const names = WorldGen.startNames(seed);
                const fill = s => String(s || "").replace(/\{male\}/g, names.male).replace(/\{female\}/g, names.female);
                for (const e of start.pair || []) {
                    const img = typeof e.image === "string" ? { characterName: e.image } : (e.image || {});
                    ctx.addEvent({
                        name: fill(e.name), x: cx + (e.dx || 0), y: cy + (e.dy || 0), note: fill(e.note),
                        image: { characterName: img.characterName, characterIndex: img.characterIndex || 0, direction: e.dir || img.direction || 2, pattern: 1 },
                        priorityType: 1, through: false, directionFix: !!e.directionFix, walkAnime: e.walkAnime !== false
                    });
                }
            }
        }

        // 4. Sites (section 3.7): their discs stay free of plants; pieces are stamped after placement.
        const sites = sitesFor(ctx.areaX, ctx.areaY);
        const siteMask = sites.length ? new Uint8Array(cells) : null;
        for (const s of sites) {
            const r = (s.radius || 0) + 1;
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (dx * dx + dy * dy <= r * r && inside(s.x + dx, s.y + dy)) siteMask[(s.y + dy) * size + s.x + dx] = 1;
                }
            }
        }

        // 5. Objects (section 3.6): the biome's plant table in catalog order, seeded patches, first hit wins, no caps.
        const objects = ctx.objects;
        const counts = {};
        const biomeCells = {};
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = y * size + x;
                biomeCells[m.biomeIds[biome[i]]] = (biomeCells[m.biomeIds[biome[i]]] || 0) + 1;
                if (objects[i] || (siteMask && siteMask[i]) || (start && inClearing(x, y)) || ctx.isTemplateCell(x, y)) continue;
                if (flags[i] & FLAG_PEAK) continue;
                const table = plantTable(m, biome[i], m.alignTiers[align[i]].id);
                const list = water[i] ? table.water : table.land;
                const gx = gx0 + x, gy = gy0 + y;
                for (let k = 0; k < list.length; k++) {
                    const p = list[k];
                    if (!water[i] && waterDist[i] <= p.avoidWater) continue;
                    const patch = p.clump > 0 ? (1 - p.clump) + p.clump * smoothstep(0.5, 0.8, valueNoise(seed, p.salt, gx, gy, p.clumpScale)) : 1;
                    if (unit4(seed, p.rollSalt, gx, gy) < p.chance * patch) {
                        objects[i] = p.typeId;
                        counts[p.id] = (counts[p.id] || 0) + 1;
                        break;
                    }
                }
            }
        }
        for (const s of sites) {
            for (const piece of s.pieces || []) {
                const o = m.objectById.get(piece.object);
                if (!o || !inside(s.x + piece.dx, s.y + piece.dy)) continue;
                ctx.setObject(s.x + piece.dx, s.y + piece.dy, o.typeId);
                counts[piece.object] = (counts[piece.object] || 0) + 1;
            }
        }

        // 6. The kit (start.kit): minimum resources within reach of every faction's campfire (VISION V67, 2026-09-19:
        //    every band has what its first buildings, tools, clothes and meals need at hand), whatever the biome rolled.
        //    Placed on free land in the ring radius[0]..radius[1], never in a site disc (so never on a camp's nine cells).
        //    Without factions, or for a save made before 2026-09-19, around the start as before.
        const kit = cat.start && cat.start.kit ? WorldGen.kitConfig() : null;
        const kitCentres = kit && !ctx.templateRect ? WorldGen.kitCentres(ctx.areaX, ctx.areaY) : [];
        const [r0, r1] = (kit && kit.radius) || [5, 20];
        const kitLog = [];
        kitCentres.forEach((c, ci) => {
            let kitIndex = 0;
            for (const e of kitEntries(kit, seed, ctx.areaX, ctx.areaY, ci)) {
                const o = m.objectById.get(e.place);
                const salt = e.key === "ore" ? ci * 256 + 254 : ci * 256 + kitIndex++;
                if (!o) continue;
                const typeIds = new Set(e.ids.map(id => (m.objectById.get(id) || {}).typeId).filter(Boolean));
                let have = 0;
                const candidates = [], nearWater = [];
                const wantsWater = kit.nearWater.includes(e.place);
                for (let y = Math.max(0, c.y - r1); y <= Math.min(size - 1, c.y + r1); y++) {
                    for (let x = Math.max(0, c.x - r1); x <= Math.min(size - 1, c.x + r1); x++) {
                        const dist = Math.hypot(x - c.x, y - c.y);
                        if (dist > r1) continue;
                        const i = y * size + x;
                        if (typeIds.has(objects[i])) have++;
                        else if (dist >= r0 && objects[i] === 0 && !water[i] && !(flags[i] & FLAG_PEAK) && waterDist[i] > (o.entry.avoidWater | 0)
                            && !inClearing(x, y) && !(siteMask && siteMask[i]) && !ctx.isTemplateCell(x, y)) {
                            candidates.push(i);
                            if (wantsWater && waterDist[i] <= 3) nearWater.push(i); // reeds: on the banks when the ring has any
                        }
                    }
                }
                const rng = mulberry32(hash32(seed, SALT.kit, ctx.areaX, ctx.areaY, salt));
                for (let n = have; n < e.minimum && (nearWater.length || candidates.length); n++) {
                    const pool = nearWater.length ? nearWater : candidates; // the banks first, then the rest of the ring
                    const j = Math.floor(rng() * pool.length);
                    const i = pool[j];
                    pool[j] = pool[pool.length - 1];
                    pool.pop();
                    if (objects[i] !== 0) { n--; continue; } // already taken from the other pool
                    objects[i] = o.typeId;
                    counts[e.place] = (counts[e.place] || 0) + 1;
                    kitLog.push({ c: ci, faction: c.faction, id: e.place, x: i % size, y: Math.floor(i / size) });
                }
            }
        });
        WorldGen.kitLog[`${ctx.areaX},${ctx.areaY}`] = kitLog;

        let total = 0;
        for (let i = 0; i < cells; i++) if (objects[i]) total++;
        WorldGen.stats[`${ctx.areaX},${ctx.areaY}`] = counts;
        WorldGen.lastBuild = { area: { x: ctx.areaX, y: ctx.areaY }, ms: now() - started, objects: total, biomes: biomeCells, sites: sites.length };
    }

    // Underground content uses the underground shape grid, never surface climate, clearing or water.
    // Existing harvestable objects are temporary resource stand-ins until cave flora is approved.
    function generateUnderground(ctx) {
        const W = window.UF.World, L = window.UF.Levels, cat = catalog(), m = compiled();
        if (!W || !W.state || !L || !cat || !m || (ctx.z !== -1 && ctx.z !== -2)) return;
        const size = ctx.width, cells = size * size, seed = W.state.seed;
        const area = { x: ctx.areaX, y: ctx.areaY, z: ctx.z };
        const dry = new Uint8Array(cells), counts = {}, kitLog = [];
        const ref = { area, x: 0, y: 0, z: ctx.z };
        for (let i = 0; i < cells; i++) {
            ref.x = i % size; ref.y = Math.floor(i / size);
            const c = L.cellAt(ref);
            dry[i] = c && !c.water && L.standableShape(ref) ? 1 : 0;
        }
        const centres = WorldGen.kitCentres(ctx.areaX, ctx.areaY, ctx.z);
        const siteMask = new Uint8Array(cells);
        for (const c of centres) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
            const x = c.x + dx, y = c.y + dy;
            if (x >= 0 && y >= 0 && x < size && y < size) siteMask[y * size + x] = 1;
        }
        // Small finite mineral deposits in the habitable regions. Solid geology remains a shape, not an object.
        for (let i = 0; i < cells; i++) {
            if (!dry[i] || siteMask[i] || ctx.objects[i]) continue;
            const roll = unit(seed, SALT.kit ^ 0x706f636b, ctx.z, i);
            const id = roll < 0.014 ? "rocks_small" : roll < 0.019 ? "granite_boulder" : roll < 0.023 ? "ironstone" : roll < 0.027 ? "copper_outcrop" : ctx.z === -2 && roll < 0.032 ? "crystal" : null;
            const o = id && m.objectById.get(id);
            if (o) { ctx.objects[i] = o.typeId; counts[id] = (counts[id] || 0) + 1; }
        }
        const kit = WorldGen.kitConfig(), r1 = kit.radius[1] || 20;
        centres.forEach((c, ci) => {
            // Flood only dry floor in this pocket; a kit never spawns beyond a rock barrier.
            const reached = new Set(), queue = [c.y * size + c.x];
            for (let q = 0; q < queue.length; q++) {
                const i = queue[q], x = i % size, y = Math.floor(i / size);
                if (reached.has(i) || !dry[i] || Math.hypot(x - c.x, y - c.y) > r1) continue;
                reached.add(i);
                for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
                    const nx = x + dx, ny = y + dy;
                    if (nx >= 0 && ny >= 0 && nx < size && ny < size && !reached.has(ny * size + nx)) queue.push(ny * size + nx);
                }
            }
            let ki = 0;
            for (const e of kitEntries(kit, seed ^ hash32(ctx.z), ctx.areaX, ctx.areaY, ci)) {
                const o = m.objectById.get(e.place);
                if (!o) continue;
                const types = new Set(e.ids.map(id => (m.objectById.get(id) || {}).typeId).filter(Boolean));
                const candidates = [];
                let have = 0;
                for (const i of reached) {
                    if (types.has(ctx.objects[i])) have++;
                    else if (!ctx.objects[i] && !siteMask[i]) candidates.push(i);
                }
                const rng = mulberry32(hash32(seed, SALT.kit, ctx.z, ci, ki++));
                for (let n = have; n < e.minimum && candidates.length; n++) {
                    const j = Math.floor(rng() * candidates.length), i = candidates[j];
                    candidates[j] = candidates[candidates.length - 1]; candidates.pop();
                    ctx.objects[i] = o.typeId;
                    counts[e.place] = (counts[e.place] || 0) + 1;
                    kitLog.push({ c: ci, faction: c.faction, camp: c.camp, z: ctx.z, id: e.place, x: i % size, y: Math.floor(i / size) });
                }
            }
        });
        const key = W.levelKey(ctx.areaX, ctx.areaY, ctx.z);
        WorldGen.kitLog[key] = kitLog;
        WorldGen.stats[key] = counts;
    }

    if (window.UF.World) {
        UF.World.unregisterGenerator("df_wilderness_generator"); // superseded (UF_ProcGen, commit a09d3fd)
        UF.World.registerGenerator("uf_worldgen", generate, 10);
        UF.World.registerGenerator("uf_underground_resources", generateUnderground, 20, { levels: [-1, -2] });
    }

    //-------------------------------------------------------------------------
    // Checks (UF_Test suites "worldgen" and "biomes"), registered at boot after all plugins load

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        const fs = require("fs"), path = require("path");
        const gameDir = nw.__dirname || process.cwd();
        const isWaterTile = tileId => Tilemap.isTileA1(tileId);
        const hashData = arr => {
            let h = 0;
            for (let i = 0; i < arr.length; i++) h = (Math.imul(h, 31) + (arr[i] | 0)) | 0;
            return h;
        };
        const objectEntry = typeId => (catalog().objects || [])[typeId - 1] || null;
        const countObjects = map => {
            let n = 0;
            for (let i = 0; i < map.ufObjects.length; i++) if (map.ufObjects[i]) n++;
            return n;
        };
        // A build of the area as the generator makes it: no object or tile diffs from play (colonists chop and pick from
        // the first second), no units. UF.World.state is swapped for the call.
        const pristineBuild = (ax, ay) => {
            const W = UF.World, st = W.state;
            W.state = Object.assign({}, st, { objectDiffs: {}, diffs: {}, units: {} });
            try { return W.buildArea(ax, ay); } finally { W.state = st; }
        };
        // Kind of water of an A1 tile (catalog water.surface), or null.
        const waterKindOf = tileId => {
            if (!Tilemap.isTileA1(tileId)) return null;
            for (const [k, id] of Object.entries(catalog().water.surface || {})) {
                const base = autotileBase(id);
                if (tileId >= base && tileId < base + 48) return k;
            }
            return "?";
        };
        // The kit around every area centre (VISION V4/V31 revised 2026-09-19): each start.kit object at its minimum within
        // kit.radius[1], and drinkable water (start.kit.water.kinds) within start.kit.water.reach.
        // Per centre: the count of each kit entry within kit.radius[1] (the ore entry: any of kit.ore.ids, wanted at
        // least kit.ore.count[0]) and the nearest drinkable water. Used by kit_per_area, kit_present and kit_fair.
        const kitCounts = (map, size, c) => {
            const kit = WorldGen.kitConfig();
            const r1 = kit.radius[1];
            const m = compiled();
            const entries = Object.entries(kit.objects).map(([id, minimum]) => ({ key: id, ids: [id], minimum: minimum | 0 }));
            if (kit.ore) entries.push({ key: "ore", ids: kit.ore.ids, minimum: kit.ore.count[0] | 0 });
            const out = entries.map(e => {
                const typeIds = new Set(e.ids.map(id => (m.objectById.get(id) || {}).typeId).filter(Boolean));
                let n = 0;
                const kinds = {};
                for (let y = c.y - r1; y <= c.y + r1; y++) for (let x = c.x - r1; x <= c.x + r1; x++) {
                    if (x < 0 || y < 0 || x >= size || y >= size || Math.hypot(x - c.x, y - c.y) > r1) continue;
                    const t = map.ufObjects[y * size + x];
                    if (typeIds.has(t)) { n++; kinds[catalog().objects[t - 1].id] = (kinds[catalog().objects[t - 1].id] || 0) + 1; }
                }
                return { key: e.key, n, minimum: e.minimum, kinds };
            });
            const wcfg = Object.assign({ reach: 30, kinds: ["fresh", "pond", "icy", "marsh", "swamp"] }, kit.water || {});
            const drink = new Set(wcfg.kinds);
            let water = Infinity, kind = null;
            const R = wcfg.reach;
            for (let y = c.y - R; y <= c.y + R; y++) for (let x = c.x - R; x <= c.x + R; x++) {
                if (x < 0 || y < 0 || x >= size || y >= size) continue;
                const d = Math.hypot(x - c.x, y - c.y);
                if (d > R || d >= water) continue;
                const k = waterKindOf(map.data[y * size + x]);
                if (k && drink.has(k)) { water = d; kind = k; }
            }
            const F = window.UF.Factions && c.faction ? UF.Factions.get(c.faction) : null;
            return { entries: out, water, waterKind: kind, reach: R, label: F ? F.name.replace(/^The /, "") : "start" };
        };
        const kitReport = (map, size, centres) => {
            const r1 = WorldGen.kitConfig().radius[1];
            const rows = [], bad = [];
            let reach = 30;
            for (const c of centres) {
                const k = kitCounts(map, size, c);
                reach = k.reach;
                const short = k.entries.filter(e => e.n < e.minimum).map(e => `${e.key} ${e.n}/${e.minimum}`);
                const lines = k.entries.map(e => `${e.key} ${e.n}/${e.minimum}`);
                if (short.length || k.water === Infinity) bad.push(`${k.label} at (${c.x},${c.y}): ${short.length ? `short ${short.join(", ")}` : ""}${k.water === Infinity ? `${short.length ? "; " : ""}no drinkable water within ${k.reach}` : ""}`);
                rows.push(`${k.label} (${c.x},${c.y}): ${lines.join(", ")}; water ${k.water === Infinity ? "NONE" : `${k.waterKind} at ${k.water.toFixed(1)}`}`);
            }
            return { ok: centres.length > 0 && bad.length === 0, detail: `${centres.length} area centre(s), kit within ${r1} cells, drinkable water within ${reach}: ${rows.join(" | ")}${bad.length ? `; FAILING: ${bad.join("; ")}` : ""}` };
        };
        // What the objects within kit.radius[1] of a centre are worth in the plan's materials (objectWorth summed).
        const supplyAround = (map, size, c) => {
            const r1 = WorldGen.kitConfig().radius[1];
            const sum = Object.fromEntries(KIT_RESOURCES.map(k => [k, 0]));
            for (let y = c.y - r1; y <= c.y + r1; y++) for (let x = c.x - r1; x <= c.x + r1; x++) {
                if (x < 0 || y < 0 || x >= size || y >= size || Math.hypot(x - c.x, y - c.y) > r1) continue;
                const t = map.ufObjects[y * size + x];
                if (!t) continue;
                const w = WorldGen.objectWorth(t);
                for (const k of KIT_RESOURCES) sum[k] += w[k];
            }
            return sum;
        };
        // What the kit's minimums alone are worth (the guarantee whatever the biome rolled): each object at its minimum,
        // the ore entry at its smallest count of its least valuable id.
        const kitMinimumWorth = () => {
            const kit = WorldGen.kitConfig();
            const sum = Object.fromEntries(KIT_RESOURCES.map(k => [k, 0]));
            for (const [id, n] of Object.entries(kit.objects)) {
                const w = WorldGen.objectWorth(id) || {};
                for (const k of KIT_RESOURCES) sum[k] += (w[k] || 0) * (n | 0);
            }
            if (kit.ore) for (const k of KIT_RESOURCES) sum[k] += Math.min(...kit.ore.ids.map(id => (WorldGen.objectWorth(id) || {})[k] || 0)) * (kit.ore.count[0] | 0);
            return sum;
        };
        const factionCount = () => (window.UF.Factions && UF.World.state.factions ? UF.World.state.factions.list.length : 0);

        UF.Test.suite("worldgen", async t => {
            const cat = catalog();
            t.check("catalog_loaded", !!cat && Array.isArray(cat.objects) && !!cat.biomes && !!cat.climate && !!cat.water,
                cat ? `${cat.objects.length} object types, ${Object.keys(cat.biomes).length - 1} biomes` : "data/UF_WorldCatalog.json missing or invalid");
            if (!cat || !UF.World || !UF.World.state) return;
            const m = compiled();

            const missing = [];
            for (const o of cat.objects) {
                if (o.image && !fs.existsSync(path.join(gameDir, "img", "characters", `${o.image}.png`))) missing.push(`${o.id} -> img/characters/${o.image}.png`);
                if (o.tile && !fs.existsSync(path.join(gameDir, "img", "tilesets", `${o.tile.sheet}.png`))) missing.push(`${o.id} -> img/tilesets/${o.tile.sheet}.png`);
            }
            t.check("catalog_images_exist", missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : `${cat.objects.length} object images/sheets found`);

            // Every id the generator resolves exists: plants, grounds, water keys, kit objects, site pieces.
            const bad = [];
            for (const id of m.biomeIds) {
                const b = cat.biomes[id];
                if (!m.groundIndex.has(b.ground)) bad.push(`${id}.ground ${b.ground}`);
                if (!m.waterIndex.has(b.water)) bad.push(`${id}.water ${b.water}`);
                for (const p of Object.keys(b.plants || {})) if (!m.objectById.has(p)) bad.push(`${id}.plants.${p}`);
            }
            for (const p of Object.keys(cat.regions.cursedPlants || {}).concat(Object.keys(cat.regions.blessedPlants || {}))) if (!m.objectById.has(p)) bad.push(`regions ${p}`);
            for (const g of Object.values(cat.regions.cursedGround || {}).concat(Object.values(cat.regions.blessedGround || {}), ["peak_rock", "snow"])) if (!m.groundIndex.has(g)) bad.push(`ground ${g}`);
            const kitCfg = WorldGen.kitConfig();
            for (const p of Object.keys(kitCfg.objects).concat(kitCfg.ore ? kitCfg.ore.ids : [], kitCfg.nearWater)) if (!m.objectById.has(p)) bad.push(`kit ${p}`);
            for (const [k, s] of Object.entries((cat.sites && cat.sites.kinds) || {})) {
                for (const id of [s.ring, s.center].concat(Object.keys(s.inside || {}))) if (id && !m.objectById.has(id)) bad.push(`sites.${k} ${id}`);
            }
            for (const key of ["fresh", "icy", "swamp", "marsh", "blighted"]) if (!m.waterIndex.has(key)) bad.push(`water.surface.${key}`);
            t.check("catalog_ids_resolve", bad.length === 0, bad.length ? `unknown: ${bad.join(", ")}` : `${m.biomeIds.length} biomes, ${m.groundIds.length} ground kinds, ${m.waterKeys.length} water kinds, ${m.objectById.size} objects all resolve`);

            const strip = [0, 1, 2].map(col => autotileShape((dx) => col + dx >= 0 && col + dx <= 2));
            t.check("autotile_matches_editor", WorldGen.autotileShapeCount() === 47 && strip.join(",") === "16,0,24",
                `${WorldGen.autotileShapeCount()} shapes derived; a 3-wide vertical strip gives ${strip.join(",")} (the editor painted 16,0,24)`);

            const W = UF.World, st = W.state, a = st.startArea, size = st.size, mid = Math.floor(size / 2);
            const here = W.buildArea(a.x, a.y);
            const build = WorldGen.lastBuild;
            t.check("tileset_id", !!UF.Tiles && here.tilesetId === UF.Tiles.TILESET_ID && $gameMap.tilesetId() === UF.Tiles.TILESET_ID,
                `built map tilesetId ${here.tilesetId}, map on screen ${$gameMap.tilesetId()}, UF.Tiles.TILESET_ID ${UF.Tiles ? UF.Tiles.TILESET_ID : "n/a"}`);

            // The start: a man and a woman with seed-generated names as events 1 and 2, only until UF_Colonists exists.
            const names = WorldGen.startNames(st.seed);
            const fill = s => s.replace(/\{male\}/g, names.male).replace(/\{female\}/g, names.female);
            const colonistEvents = here.events.filter(e => e && /<colonist/.test(e.note));
            if (window.UF.Colonists) {
                t.check("start_in_middle", colonistEvents.length === 0 && here.note.includes("<glade>"),
                    `UF_Colonists installed: ${colonistEvents.length} generator start events (want 0); note "${here.note}"`);
            } else {
                const expected = cat.start.pair.map((e, i) => ({ id: i + 1, name: fill(e.name), x: mid + (e.dx || 0), y: mid + (e.dy || 0) }));
                const wrong = expected.filter(e => !here.events[e.id] || here.events[e.id].name !== e.name || here.events[e.id].x !== e.x || here.events[e.id].y !== e.y);
                t.check("start_in_middle", wrong.length === 0 && here.note.includes("<glade>") && colonistEvents.length === expected.length,
                    wrong.length ? `not as expected: ${wrong.map(e => `${e.name} (event ${e.id} at ${e.x},${e.y})`).join(", ")}` : `${expected.map(e => `${e.name} = event ${e.id} at (${e.x},${e.y})`).join("; ")}; note "${here.note}"`);
            }
            const other = WorldGen.startNames(st.seed + 1);
            t.check("names_vary_by_seed", other.male !== names.male || other.female !== names.female, `this world: ${names.male} and ${names.female}; next seed: ${other.male} and ${other.female}`);

            // Water within reach of the start (the pond), and no river through the start.
            const pond = cat.start.pond;
            const reach = pond.distance[1] + pond.radius[1] + 2;
            let nearest = Infinity;
            for (let y = Math.max(0, mid - reach); y <= Math.min(size - 1, mid + reach); y++) {
                for (let x = Math.max(0, mid - reach); x <= Math.min(size - 1, mid + reach); x++) {
                    if (isWaterTile(here.data[y * size + x])) nearest = Math.min(nearest, Math.hypot(x - mid, y - mid));
                }
            }
            t.check("water_near_start", nearest <= reach, `nearest water ${nearest === Infinity ? "none" : nearest.toFixed(1) + " cells"} from the pair (reach ${reach})`);
            const rivers = WorldGen.riverModels(st);
            const gaps = rivers.map(r => Math.abs(Math.round(r.center(a.y * size + mid)) - (a.x * size + mid)));
            t.check("river_not_through_start", gaps.every(g => g > cat.rivers.keepAwayFromStart), `river(s) pass ${gaps.join(", ")} cells from the start (keep away ${cat.rivers.keepAwayFromStart})`);
            const [cMin, cMax] = cat.rivers.count;
            t.check("rivers_count", rivers.length >= 1 && rivers.length >= cMin && rivers.length <= cMax,
                `${rivers.length} river(s) (catalog count ${cMin}-${cMax}) at columns ${rivers.map(r => `${r.anchorX} (half-width ${r.halfWidth})`).join(", ")}`);
            // Continuity: each river is water on every row of the start area, and consecutive rows touch (ocean/lake cells count as water).
            const breaks = [];
            for (const r of rivers) {
                const col = Math.round(r.center(a.y * size)) - a.x * size;
                if (col < 0 || col >= size) continue;
                let prev = null;
                for (let y = 0; y < size; y++) {
                    const c = Math.round(r.center(a.y * size + y)) - a.x * size;
                    if (c < -r.halfWidth || c >= size + r.halfWidth) { prev = null; continue; }
                    let wet = false;
                    for (let x = Math.max(0, c - r.halfWidth); x <= Math.min(size - 1, c + r.halfWidth); x++) if (isWaterTile(here.data[y * size + x])) wet = true;
                    if (!wet) breaks.push(`river at column ${r.anchorX}: row ${y} dry`);
                    else if (prev !== null && Math.abs(c - prev) > 2 * r.halfWidth + 1) breaks.push(`river at column ${r.anchorX}: jump ${prev}->${c} at row ${y}`);
                    prev = c;
                }
            }
            t.check("river_continuous", breaks.length === 0, breaks.length ? `${breaks.length} break(s); first: ${breaks[0]}` : `${rivers.length} river(s) wet on every row of area (${a.x},${a.y}) with no jumps`);
            if (W.inWorld(a.x, a.y + 1)) {
                // Across an area edge: the bottom row of this area and the top row of the one below share water columns.
                const below = W.buildArea(a.x, a.y + 1);
                const cols = (map, row) => { const c = []; for (let x = 0; x < size; x++) if (isWaterTile(map.data[row * size + x])) c.push(x); return c; };
                const last = cols(here, size - 1), first = cols(below, 0);
                t.check("river_continuous_between_areas", last.length > 0 && last.some(x => first.includes(x)), `${last.length} water columns on the bottom row, ${first.length} on the next area's top row, ${last.filter(x => first.includes(x)).length} shared`);
            }

            // Objects live in the object grid, not in events. Counted on a pristine build: since 2026-09-19 afternoon every
            // camp's campfire is written at New Game as a built object (a diff, UF_History), and colonists change objects
            // from the first second, so the build with diffs never matched the generator's own counts.
            const pristineStart = pristineBuild(a.x, a.y);
            const total = countObjects(pristineStart);
            const statTotal = Object.values(WorldGen.stats[`${a.x},${a.y}`] || {}).reduce((s, n) => s + n, 0);
            const top = Object.entries(WorldGen.stats[`${a.x},${a.y}`] || {}).sort((p, q) => q[1] - p[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(", ");
            const objectEvents = here.events.filter(e => e && /<ufObject:/.test(e.note)).length;
            t.check("objects_placed", total > 0 && statTotal === total && objectEvents === 0,
                `${total} objects in map.ufObjects of the start area (stats sum ${statTotal}, ${objectEvents} object events); most common: ${top}`);
            let onGlade = 0;
            const clearR = cat.start.clearRadius;
            // The generator's clearing (pristine build: the campfire UF_History lights on the player's camp cell is a built
            // object, not generated).
            for (let y = mid - clearR; y <= mid + clearR; y++) for (let x = mid - clearR; x <= mid + clearR; x++) if ((x - mid) ** 2 + (y - mid) ** 2 <= clearR * clearR && pristineStart.ufObjects[y * size + x]) onGlade++;
            t.check("glade_clear", onGlade === 0, `${onGlade} objects inside the start clearing (radius ${clearR}) as generated`);
            let inWater = 0, landOnWater = 0, waterOnLand = 0, waterCells = 0;
            for (let i = 0; i < size * size; i++) {
                const wet = isWaterTile(here.data[i]);
                if (wet) waterCells++;
                if (!here.ufObjects[i]) continue;
                const o = objectEntry(here.ufObjects[i]);
                if (wet) { inWater++; if (!o || !o.onWater) landOnWater++; }
                else if (o && o.onWater) waterOnLand++;
            }
            t.check("no_objects_in_water", landOnWater === 0 && waterOnLand === 0,
                `${waterCells} water cells; ${inWater} objects on water, ${landOnWater} of them not water plants; ${waterOnLand} water plants on land`);
            // kit_per_area: the kit and drinkable water around every faction's area centre, on the map as generated.
            const kitCentres = WorldGen.kitCentres(a.x, a.y);
            const kit = kitReport(pristineStart, size, kitCentres);
            const wantCentres = factionCount();
            t.check("kit_per_area", kit.ok && (!wantCentres || kitCentres.length === wantCentres), `${wantCentres ? `${wantCentres} factions; ` : ""}${kit.detail}`);

            // kit_covers_plan (VISION V67): within kit.radius[1] of every campfire the objects are worth at least the plan's
            // first stage (WorldGen.kitNeeds: the most any culture needs of logs, stones, fiber, straw and food for its
            // founders) and at least one ore outcrop's ore; and the kit's minimums alone cover it too, so the guarantee
            // holds whatever the biome rolls.
            const needInfo = WorldGen.kitNeeds();
            const kitNeed = needInfo ? Object.assign({}, needInfo.needs, { ore: Math.min(...(kitCfg.ore ? kitCfg.ore.ids : ["-"]).map(id => (WorldGen.objectWorth(id) || {}).ore || 0)) * ((kitCfg.ore ? kitCfg.ore.count[0] : 1) | 0) }) : null;
            const minWorth = kitMinimumWorth();
            const coverRows = [], coverBad = [];
            const shortOf = sup => (kitNeed ? KIT_RESOURCES.filter(k => (sup[k] || 0) < (kitNeed[k] || 0)).map(k => `${k} ${sup[k] || 0}/${kitNeed[k]}`) : ["no needs"]);
            for (const c of kitCentres) {
                const sup = supplyAround(pristineStart, size, c);
                const short = shortOf(sup);
                const F = window.UF.Factions && c.faction ? UF.Factions.get(c.faction) : null;
                const label = F ? F.name.replace(/^The /, "") : "start";
                coverRows.push(`${label} (${c.x},${c.y}): ${KIT_RESOURCES.map(k => `${k} ${sup[k]}`).join(", ")}`);
                if (short.length) coverBad.push(`${label}: short ${short.join(", ")}`);
            }
            const minShort = shortOf(minWorth);
            t.check("kit_covers_plan", !!needInfo && kitCentres.length > 0 && (!wantCentres || kitCentres.length === wantCentres) && coverBad.length === 0 && minShort.length === 0,
                needInfo ? `first stage (${needInfo.steps.join(", ")}) for ${needInfo.founders} founders, the most any of ${Object.keys(needInfo.byCulture).length} cultures needs, plus ${needInfo.meals} meals: ${KIT_RESOURCES.map(k => `${k} ${kitNeed[k]}`).join(", ")} `
                    + `(${Object.entries(needInfo.byCulture).map(([sp, n]) => `${sp} ${n.log}/${n.stone}/${n.fiber}/${n.straw}/${n.food}`).join(", ")} as log/stone/fiber/straw/food${Object.keys(needInfo.other).length ? `; not counted here: ${JSON.stringify(needInfo.other)}` : ""}); `
                    + `the kit's minimums alone are worth ${KIT_RESOURCES.map(k => `${k} ${minWorth[k]}`).join(", ")}${minShort.length ? ` (SHORT: ${minShort.join(", ")})` : ""}; within ${kitCfg.radius[1]} cells of each campfire: ${coverRows.join(" | ")}${coverBad.length ? `; FAILING: ${coverBad.join("; ")}` : ""}`
                    : "no colony plan or catalog");

            // kit_fair: every campfire gets the same minimum counts (one table in the catalog); the counts per area, the
            // ore kind and the distance to drinkable water.
            const fairRows = [], fairBad = [];
            for (const c of kitCentres) {
                const k = kitCounts(pristineStart, size, c);
                const short = k.entries.filter(e => e.n < e.minimum);
                const ore = k.entries.find(e => e.key === "ore");
                fairRows.push(`${k.label}: ${k.entries.filter(e => e.key !== "ore").map(e => `${e.key} ${e.n}`).join(", ")}, ore ${ore ? `${ore.n} (${Object.entries(ore.kinds).map(([id, n]) => `${id} ${n}`).join(", ") || "none"})` : "no ore entry"}; water ${k.water === Infinity ? "NONE" : `${k.waterKind} ${k.water.toFixed(1)}`}`);
                if (short.length) fairBad.push(`${k.label}: ${short.map(e => `${e.key} ${e.n}/${e.minimum}`).join(", ")}`);
                if (!ore) fairBad.push(`${k.label}: no ore entry in start.kit`);
            }
            t.check("kit_fair", kitCentres.length > 0 && (!wantCentres || kitCentres.length === wantCentres) && fairBad.length === 0,
                `minimums for every area: ${Object.entries(kitCfg.objects).map(([id, n]) => `${id} ${n}`).join(", ")}, ore ${kitCfg.ore ? `${kitCfg.ore.count.join("-")} of ${kitCfg.ore.ids.join("/")}` : "NONE"}; per area: ${fairRows.join(" | ")}${fairBad.length ? `; SHORT: ${fairBad.join("; ")}` : ""}`);

            // kit_seeded: the kit's placements (WorldGen.kitLog) are the same for two builds of this seed and differ for the
            // next seed (a synthetic world: its factions, its year-1 camps, its build).
            const kitSig = log => JSON.stringify((log || []).map(e => [e.c, e.id, e.x, e.y]));
            pristineBuild(a.x, a.y);
            const log1 = kitSig(WorldGen.kitLog[`${a.x},${a.y}`]);
            pristineBuild(a.x, a.y);
            const log2 = kitSig(WorldGen.kitLog[`${a.x},${a.y}`]);
            let log3 = null, seed3 = st.seed + 1, oreKinds3 = "";
            if (window.UF.Factions && window.UF.History) {
                const s3 = { seed: seed3, size: st.size, areasX: st.areasX, areasY: st.areasY, startArea: { x: a.x, y: a.y }, units: {}, nextUnitId: 1, diffs: {}, objectDiffs: {} };
                const saved = W.state;
                try {
                    W.state = s3;
                    UF.Factions.generate(s3);
                    UF.History.generate(s3);
                    W.buildArea(a.x, a.y);
                    log3 = kitSig(WorldGen.kitLog[`${a.x},${a.y}`]);
                    oreKinds3 = (WorldGen.kitLog[`${a.x},${a.y}`] || []).filter(e => kitCfg.ore && kitCfg.ore.ids.includes(e.id)).map(e => e.id).join("/");
                } finally {
                    W.state = saved;
                }
                pristineBuild(a.x, a.y); // leave this world's kit log and stats behind
            }
            const placed1 = JSON.parse(log1);
            t.check("kit_seeded", placed1.length > 0 && log1 === log2 && log3 !== null && log3 !== log1,
                `seed ${st.seed}: ${placed1.length} kit objects placed (first ${placed1.slice(0, 3).map(e => `${e[1]} (${e[2]},${e[3]})`).join(", ")}; ore ${placed1.filter(e => kitCfg.ore && kitCfg.ore.ids.includes(e[1])).map(e => `${e[1]} (${e[2]},${e[3]})`).join(", ") || "none placed (enough already stood there)"}), a second build ${log1 === log2 ? "identical" : "DIFFERENT"}; `
                + `seed ${seed3}: ${log3 === null ? "not built (no UF_Factions/UF_History)" : `${JSON.parse(log3).length} placed, ore ${oreKinds3 || "none placed"}, ${log3 === log1 ? "THE SAME layout" : "another layout"}`}`);
            // Peaks: region 250 exactly where the ground is peak_rock.
            const peakBase = UF.Tiles ? UF.Tiles.groundBase("peak_rock") : null;
            let peakTiles = 0, peakRegions = 0, mismatched = 0;
            for (let i = 0; i < size * size; i++) {
                const isPeak = peakBase !== null && here.data[i] >= peakBase && here.data[i] < peakBase + 48;
                const region = here.data[5 * size * size + i] === PEAK_REGION;
                if (isPeak) peakTiles++;
                if (region) peakRegions++;
                if (isPeak !== region) mismatched++;
            }
            t.check("peaks_region_250", mismatched === 0, `${peakTiles} peak_rock tiles, ${peakRegions} cells with region 250, ${mismatched} mismatched in the start area`);
            // Autotile shapes recomputed from the map itself: water joins any water; ground joins the same kind.
            // Ground next to water is skipped: the generator joins the ground under the water (the water tile draws the bank).
            let shapeErrors = 0, sampled = 0, waterSampled = 0, firstErr = "";
            const kindOf = tileId => (isWaterTile(tileId) ? -1 : Math.floor((tileId - Tilemap.TILE_ID_A2) / 48));
            for (let y = 1; y < size - 1; y += 3) {
                for (let x = 1; x < size - 1; x += 3) {
                    const tile = here.data[y * size + x];
                    const wet = isWaterTile(tile);
                    const kind = kindOf(tile);
                    let nearWater = false;
                    for (const [dx, dy] of NB) if (isWaterTile(here.data[(y + dy) * size + x + dx])) nearWater = true;
                    if (!wet && nearWater) continue;
                    const want = autotileShape((dx, dy) => {
                        if (wet) return isWaterTile(here.data[(y + dy) * size + x + dx]);
                        const nk = kindOf(here.data[(y + dy) * size + x + dx]);
                        return nk === kind || (window.UF && UF.Tiles && UF.Tiles.joins && UF.Tiles.joins(nk, kind));
                    });
                    const got = (tile - Tilemap.TILE_ID_A1) % 48;
                    sampled++;
                    if (wet) waterSampled++;
                    if (want !== got) { shapeErrors++; if (!firstErr) firstErr = `(${x},${y}) ${wet ? "water" : "ground"} shape ${got}, expected ${want}`; }
                }
            }
            t.check("autotile_shapes", sampled > 100 && shapeErrors === 0, `${sampled} interior cells sampled (${waterSampled} water, the rest ground away from water), ${shapeErrors} wrong shapes${firstErr ? `; first: ${firstErr}` : ""}`);
            const again = W.buildArea(a.x, a.y);
            t.check("deterministic", hashData(again.data) === hashData(here.data) && hashData(again.ufObjects) === hashData(here.ufObjects),
                `tiles ${hashData(here.data)} / ${hashData(again.data)}, objects ${hashData(here.ufObjects)} / ${hashData(again.ufObjects)} on rebuild (${build ? build.ms.toFixed(0) : "?"} ms first build)`);

            if (UF.Camera) UF.Camera.setLevel(UF.Camera.levels.length - 1);
            $gamePlayer.locate(mid, mid);
            await t.waitFrames(30);
            t.screenshot("start_area");
            if (UF.Camera) UF.Camera.setLevel(1);
            await t.waitFrames(5);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during worldgen checks");
        });

        UF.Test.suite("biomes", async t => {
            const cat = catalog();
            if (!cat || !UF.World || !UF.World.state) { t.check("catalog_loaded", false, "no catalog or world"); return; }
            const m = compiled(), cl = cat.climate;
            const W = UF.World, st = W.state, a = st.startArea, size = st.size, mid = Math.floor(size / 2);
            const d = dims(st);

            // Every biome id is reachable from some field values.
            const reached = new Set();
            for (const e of [0.1, 0.305, 0.33, 0.36, 0.5, 0.8, 0.9]) {
                const sal = clamp01(1 - (e - cl.seaLevel) / 0.08);
                for (let t1 = 0; t1 <= 1.001; t1 += 0.05) for (let r = 0; r <= 1.001; r += 0.05) for (const dd of [0.2, 0.55, 0.7]) for (const v of [0.3, 0.7]) for (const lake of [false, true]) {
                    reached.add(classify(cl, { e, r, t: t1, d: dd, v, sal }, lake));
                }
            }
            const unreachable = m.biomeIds.filter(id => !reached.has(id));
            const unknown = [...reached].filter(id => !m.biomeIndex.has(id));
            t.check("all_biomes_reachable", unreachable.length === 0 && unknown.length === 0,
                `${reached.size} ids produced by classify over ${7 * 21 * 21 * 3 * 2 * 2} synthetic field sets; unreachable: ${unreachable.join(", ") || "none"}; not in catalog: ${unknown.join(", ") || "none"}`);

            // A 6x6 sample of 4 points per area.
            const sample = [];
            for (let ay = 0; ay < st.areasY; ay++) for (let ax = 0; ax < st.areasX; ax++) {
                for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) {
                    const bx = ax * size + Math.floor((i + 0.5) * size / 6), by = ay * size + Math.floor((j + 0.5) * size / 6);
                    for (const [ox, oy] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) sample.push(WorldGen.cellInfo(bx + ox, by + oy));
                }
            }
            const biomeCount = {};
            for (const c of sample) biomeCount[c.biomeId] = (biomeCount[c.biomeId] || 0) + 1;
            const distinct = Object.keys(biomeCount);
            t.check("world_variety", distinct.length >= 10, `${distinct.length} distinct biomes over ${sample.length} sampled cells (seed ${st.seed}): ${Object.entries(biomeCount).sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${v}`).join(", ")}`);

            // The world's rim is ocean: sample cells 2 in from every world edge.
            const rim = [];
            for (let i = 0; i < 32; i++) {
                const p = Math.floor((i + 0.5) * d.width / 32), q = Math.floor((i + 0.5) * d.height / 32);
                rim.push([p, 2], [p, d.height - 3], [2, q], [d.width - 3, q]);
            }
            const oceans = rim.filter(([x, y]) => WorldGen.cellInfo(x, y).biomeId.startsWith("ocean")).length;
            t.check("ocean_rim", oceans >= rim.length * 0.6, `${oceans} of ${rim.length} cells 2 in from the world edge are ocean (${(100 * oceans / rim.length).toFixed(0)} %, want >= 60 %)`);

            const startInfo = WorldGen.cellInfoLocal(a.x, a.y, mid, mid);
            const habitable = ["grassland_temperate", "forest_temperate_broadleaf", "forest_temperate_conifer", "shrubland_temperate", "savanna_temperate"];
            t.check("start_habitable", habitable.includes(startInfo.biomeId) && startInfo.region.alignment !== "cursed" && startInfo.walkable,
                `start cell: ${startInfo.biomeId}, ground ${startInfo.ground}, region ${startInfo.region.savagery}/${startInfo.region.alignment}, walkable ${startInfo.walkable}`);

            const savTiers = new Set(sample.map(c => c.region.savagery)), alTiers = new Set(sample.map(c => c.region.alignment));
            const validSav = [...savTiers].every(id => cat.regions.savagery.some(x => x.id === id)), validAl = [...alTiers].every(id => cat.regions.alignment.some(x => x.id === id));
            t.check("region_tiers_exist", validSav && validAl && savTiers.size >= 2 && alTiers.size >= 1,
                `savagery tiers in the sample: ${[...savTiers].join(", ")} (want >= 2 of ${cat.regions.savagery.map(x => x.id).join("/")}); alignment: ${[...alTiers].join(", ")}`);

            // Inland water (lakes, rivers, the pond) in at least 3 of the 9 inland blocks of the world.
            const rimCells = Math.ceil(d.width * cl.continentRim);
            let blocksWithWater = 0;
            const blockNotes = [];
            for (let by = 0; by < 3; by++) for (let bx = 0; bx < 3; bx++) {
                const x0 = rimCells + Math.floor(bx * (d.width - 2 * rimCells) / 3), x1 = rimCells + Math.floor((bx + 1) * (d.width - 2 * rimCells) / 3);
                const y0 = rimCells + Math.floor(by * (d.height - 2 * rimCells) / 3), y1 = rimCells + Math.floor((by + 1) * (d.height - 2 * rimCells) / 3);
                let wet = 0;
                for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
                    const c = WorldGen.cellInfo(x, y);
                    if (c.water && !c.biomeId.startsWith("ocean")) wet++;
                }
                if (wet > 0) blocksWithWater++;
                blockNotes.push(`${wet}`);
            }
            t.check("lakes_or_rivers", blocksWithWater >= 3, `${blocksWithWater} of 9 inland blocks have lake/river/pond water (sampled cells per block: ${blockNotes.join(" ")})`);

            // Build the start area: density, kit, timing, determinism.
            const times = [];
            let here = null;
            for (let i = 0; i < 3; i++) {
                const t0 = now();
                here = W.buildArea(a.x, a.y);
                times.push(now() - t0);
            }
            const total = countObjects(here);
            const biomesHere = Object.entries(WorldGen.lastBuild.biomes).sort((p, q) => q[1] - p[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(", ");
            t.check("objects_dense", total >= 2500, `${total} objects in the start area (want >= 2500); biomes by cells: ${biomesHere}`);
            const pristineHere = pristineBuild(a.x, a.y);
            const kit = kitReport(pristineHere, size, WorldGen.kitCentres(a.x, a.y));
            t.check("kit_present", kit.ok, kit.detail);
            // camps_cleared (replaces sites_stamped, 2026-09-19: no site is stamped at New Game any more, VISION V31):
            // every site UF_History gives this area is a bare camp with no pieces, and the generator kept its disc
            // (radius + 1) free of every object; a site of an older save with pieces still gets them stamped.
            if (window.UF.History && typeof UF.History.sitesIn === "function") {
                const sites = sitesFor(a.x, a.y);
                const problems = [];
                let bare = 0, stampedOk = 0;
                for (const s of sites) {
                    if (!(s.pieces || []).length) {
                        bare++;
                        const r = (s.radius || 0) + 1;
                        let n = 0, first = "";
                        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
                            const x = s.x + dx, y = s.y + dy;
                            if (dx * dx + dy * dy > r * r || x < 0 || y < 0 || x >= size || y >= size) continue;
                            const o = pristineHere.ufObjects[y * size + x];
                            if (o) { n++; if (!first) first = `${(cat.objects[o - 1] || {}).id} at (${x},${y})`; }
                        }
                        if (n) problems.push(`${s.name}: ${n} objects in its disc (first ${first})`);
                    } else {
                        let hits = 0, expected = 0;
                        for (const piece of s.pieces) {
                            const x = s.x + piece.dx, y = s.y + piece.dy;
                            if (x < 0 || y < 0 || x >= size || y >= size) continue;
                            expected++;
                            const o = m.objectById.get(piece.object);
                            if (o && pristineHere.ufObjects[y * size + x] === o.typeId) hits++;
                        }
                        if (hits === expected) stampedOk++; else problems.push(`${s.name}: ${hits} of ${expected} pieces stamped`);
                    }
                }
                const bareWanted = UF.World.state.history && UF.World.state.history.founders ? factionCount() : bare;
                t.check("camps_cleared", sites.length > 0 && bare === bareWanted && problems.length === 0,
                    `${sites.length} sites in area (${a.x},${a.y}): ${bare} bare camps (want ${bareWanted}), ${stampedOk} older sites stamped; ${problems.length ? `PROBLEMS: ${problems.join("; ")}` : "every bare camp's disc is free of objects"}`);
            }
            const sorted = times.slice().sort((p, q) => p - q);
            t.check("build_time", sorted[1] <= 1500, `median ${sorted[1].toFixed(0)} ms of 3 builds (${times.map(x => x.toFixed(0)).join(", ")} ms) for 256x256 with ${total} objects`);
            const again = W.buildArea(a.x, a.y);
            t.check("deterministic", hashData(again.data) === hashData(here.data) && hashData(again.ufObjects) === hashData(here.ufObjects),
                `tiles ${hashData(here.data)} / ${hashData(again.data)}, objects ${hashData(here.ufObjects)} / ${hashData(again.ufObjects)}`);

            // Screenshots: the start at every zoom, then a far corner.
            const levels = UF.Camera ? UF.Camera.levels.length : 1;
            for (let i = 0; i < levels; i++) {
                if (UF.Camera) UF.Camera.setLevel(i);
                $gamePlayer.locate(mid, mid);
                await t.waitFrames(20);
                t.screenshot(`start_zoom_${i}`);
            }
            $gamePlayer.locate(24, 24);
            await t.waitFrames(20);
            t.screenshot("corner");
            if (UF.Camera) UF.Camera.setLevel(1);
            $gamePlayer.locate(mid, mid);
            await t.waitFrames(5);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during biome checks");
        });
    }
})();
