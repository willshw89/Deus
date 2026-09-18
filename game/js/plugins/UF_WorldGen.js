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
 *   4. faction sites from UF_History (cleared disc, stamped pieces),
 *   5. the start: a clearing, the resource kit, the start pair as events 1
 *      and 2 until UF_Colonists exists.
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
        lastBuild: null // { area: {x, y}, ms, objects, biomes: { id: cells } } of the last build
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
    WorldGen.biomeAt = (gx, gy) => WorldGen.cellInfo(gx, gy).biomeId;
    /** { biomeId, biome, ground, water, walkable, region: {savagery, alignment}, fields, lake, peak } for a world cell. */
    WorldGen.cellInfo = function(gx, gy) {
        const m = compiled();
        const st = UF.World.state;
        if (!m || !st) return null;
        const c = resolve(st.seed, dims(st), m, waterModels(st), gx, gy, {});
        return {
            biomeId: c.biomeId, biome: m.biomes[c.b], ground: c.groundId, water: c.waterKey,
            walkable: !c.waterKey && !(c.flags & FLAG_PEAK),
            region: { savagery: m.savTiers[c.sav].id, alignment: m.alignTiers[c.align].id },
            fields: c.f, lake: c.lake, peak: !!(c.flags & FLAG_PEAK)
        };
    };
    WorldGen.cellInfoLocal = function(ax, ay, x, y) {
        const size = dims().size;
        return WorldGen.cellInfo(ax * size + x, ay * size + y);
    };
    WorldGen.isWaterAt = (gx, gy) => waterModels(UF.World.state).isWater(gx, gy);

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
                    for (let k = 0; k < 8; k++) if (groundAt(x + NB[k][0], y + NB[k][1]) === g) mask |= NB[k][2];
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

        // 6. The kit: minimum resources within reach of the start, whatever the biome rolled.
        if (start && start.kit && start.kit.objects) {
            const [r0, r1] = start.kit.radius || [5, 20];
            let kitIndex = 0;
            for (const [id, minimum] of Object.entries(start.kit.objects)) {
                const o = m.objectById.get(id);
                if (!o) continue;
                let have = 0;
                const candidates = [];
                for (let y = Math.max(0, cy - r1); y <= Math.min(size - 1, cy + r1); y++) {
                    for (let x = Math.max(0, cx - r1); x <= Math.min(size - 1, cx + r1); x++) {
                        const dist = Math.hypot(x - cx, y - cy);
                        if (dist > r1) continue;
                        const i = y * size + x;
                        if (objects[i] === o.typeId) have++;
                        else if (dist >= r0 && objects[i] === 0 && !water[i] && !(flags[i] & FLAG_PEAK) && waterDist[i] > (o.entry.avoidWater | 0)
                            && !inClearing(x, y) && !(siteMask && siteMask[i]) && !ctx.isTemplateCell(x, y)) candidates.push(i);
                    }
                }
                const rng = mulberry32(hash32(seed, SALT.kit, ctx.areaX, ctx.areaY, kitIndex++));
                for (let n = have; n < minimum && candidates.length; n++) {
                    const j = Math.floor(rng() * candidates.length);
                    const i = candidates[j];
                    candidates[j] = candidates[candidates.length - 1];
                    candidates.pop();
                    objects[i] = o.typeId;
                    counts[id] = (counts[id] || 0) + 1;
                }
            }
        }

        let total = 0;
        for (let i = 0; i < cells; i++) if (objects[i]) total++;
        WorldGen.stats[`${ctx.areaX},${ctx.areaY}`] = counts;
        WorldGen.lastBuild = { area: { x: ctx.areaX, y: ctx.areaY }, ms: now() - started, objects: total, biomes: biomeCells, sites: sites.length };
    }

    if (window.UF.World) {
        UF.World.unregisterGenerator("df_wilderness_generator"); // superseded (UF_ProcGen, commit a09d3fd)
        UF.World.registerGenerator("uf_worldgen", generate, 10);
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
        const kitReport = (map, mid, size) => {
            const kit = catalog().start.kit;
            const r1 = kit.radius[1];
            const m = compiled();
            const lines = [], short = [];
            for (const [id, minimum] of Object.entries(kit.objects)) {
                const o = m.objectById.get(id);
                let n = 0;
                for (let y = mid - r1; y <= mid + r1; y++) for (let x = mid - r1; x <= mid + r1; x++) {
                    if (Math.hypot(x - mid, y - mid) <= r1 && o && map.ufObjects[y * size + x] === o.typeId) n++;
                }
                lines.push(`${id} ${n}/${minimum}`);
                if (n < minimum) short.push(id);
            }
            return { ok: short.length === 0, detail: `${lines.join(", ")} within ${r1} cells of the start${short.length ? `; short: ${short.join(", ")}` : ""}` };
        };

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
            for (const p of Object.keys(cat.start.kit.objects)) if (!m.objectById.has(p)) bad.push(`kit ${p}`);
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

            // Objects live in the object grid, not in events.
            const total = countObjects(here);
            const statTotal = Object.values(WorldGen.stats[`${a.x},${a.y}`] || {}).reduce((s, n) => s + n, 0);
            const top = Object.entries(WorldGen.stats[`${a.x},${a.y}`] || {}).sort((p, q) => q[1] - p[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(", ");
            const objectEvents = here.events.filter(e => e && /<ufObject:/.test(e.note)).length;
            t.check("objects_placed", total > 0 && statTotal === total && objectEvents === 0,
                `${total} objects in map.ufObjects of the start area (stats sum ${statTotal}, ${objectEvents} object events); most common: ${top}`);
            let onGlade = 0;
            const clearR = cat.start.clearRadius;
            for (let y = mid - clearR; y <= mid + clearR; y++) for (let x = mid - clearR; x <= mid + clearR; x++) if ((x - mid) ** 2 + (y - mid) ** 2 <= clearR * clearR && here.ufObjects[y * size + x]) onGlade++;
            t.check("glade_clear", onGlade === 0, `${onGlade} objects inside the start clearing (radius ${clearR})`);
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
            const kit = kitReport(here, mid, size);
            t.check("kit", kit.ok, kit.detail);
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
                    const want = autotileShape((dx, dy) => (wet ? isWaterTile(here.data[(y + dy) * size + x + dx]) : kindOf(here.data[(y + dy) * size + x + dx]) === kind));
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
            const kit = kitReport(here, mid, size);
            t.check("kit_present", kit.ok, kit.detail);
            if (window.UF.History && typeof UF.History.sitesIn === "function") {
                let found = null;
                for (let ay = 0; ay < st.areasY && !found; ay++) for (let ax = 0; ax < st.areasX && !found; ax++) {
                    const sites = sitesFor(ax, ay);
                    if (sites.length) found = { ax, ay, site: sites[0] };
                }
                if (found) {
                    const s = found.site;
                    const map = W.buildArea(found.ax, found.ay);
                    const ringId = (s.pieces || []).length ? s.pieces[0].object : null;
                    const ringType = ringId && m.objectById.get(ringId) ? m.objectById.get(ringId).typeId : 0;
                    let hits = 0, expected = 0;
                    for (const piece of s.pieces || []) {
                        const x = s.x + piece.dx, y = s.y + piece.dy;
                        if (x < 0 || y < 0 || x >= size || y >= size) continue;
                        expected++;
                        const o = m.objectById.get(piece.object);
                        if (o && map.ufObjects[y * size + x] === o.typeId) hits++;
                    }
                    t.check("sites_stamped", expected > 0 && hits === expected, `site "${s.name || s.kind}" at (${s.x},${s.y}) in area (${found.ax},${found.ay}): ${hits} of ${expected} pieces in ufObjects (first piece ${ringId} = type ${ringType})`);
                } else {
                    t.check("sites_stamped", false, "UF.History.sitesIn returned no sites in any area");
                }
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
