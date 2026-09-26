//=============================================================================
// DEUS_WorldGen.js - The world from the seed: climate fields, biomes, water, ground tiles, objects, sites, the start
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS WorldGen] Multi-octave Perlin terrain synthesis, elevation and moisture maps, geological strata, and biome placement.
 * @author UF project
 * @base DEUS_World
 * @orderAfter DEUS_World
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

    const CATALOG_VAR = "$deusWorldCatalog";
    if (!DataManager.isBattleTest() && !DataManager.isEventTest()) {
        DataManager._databaseFiles.push({ name: CATALOG_VAR, src: "DEUS_WorldCatalog.json" });
        window.$ufWorldCatalog = window.$deusWorldCatalog;
    }

    const _DEUS_WorldGen_DataManager_onLoad = DataManager.onLoad;
    DataManager.onLoad = function(object) {
        _DEUS_WorldGen_DataManager_onLoad.call(this, object);
        if (object === window.$deusWorldCatalog || object === window.$ufWorldCatalog) {
            window.$deusWorldCatalog = object;
            window.$ufWorldCatalog = object;
        }
    };

    const catalog = () => {
        const cat = window.$deusWorldCatalog || window.$ufWorldCatalog || null;
        if (cat) { window.$deusWorldCatalog = cat; window.$ufWorldCatalog = cat; }
        return cat;
    };
    const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

    // One salt per field or feature, so every noise field is independent of the others.
    const SALT = Object.freeze({
        elevation: 0x1e11, rainfall: 0x2a1f, temperature: 0x3e3f, drainage: 0x4d4a, volcanism: 0x5f0c,
        savagery: 0x6a5a, alignment: 0x7a11, lake: 0x8a4e, detail: 0x9d37,
        river: 0x21e5, riverWidth: 0x21e6, riverPhase: 0x7e11, pond: 0x90ed, names: 0x4e41, kit: 0x6b17, geology: 0x5701
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
    function valueNoise(seed, salt, gx, gy, scale, wrapW, wrapH) {
        if (!wrapW || !wrapH) {
            const st = window.UF && UF.World && UF.World.state;
            if (st && st.size) {
                wrapW = wrapW || ((st.areasX || 1) * st.size);
                wrapH = wrapH || ((st.areasY || 1) * st.size);
            }
        }
        let fx, fy;
        let x0, x1, y0, y1, tx, ty;
        if (wrapW && scale) {
            const modW = Math.max(1, Math.round(wrapW / scale));
            const effScaleX = wrapW / modW;
            fx = gx / effScaleX;
            const ix = Math.floor(fx);
            tx = smooth(fx - ix);
            x0 = ((ix % modW) + modW) % modW;
            x1 = (((ix + 1) % modW) + modW) % modW;
        } else {
            fx = gx / scale;
            const ix = Math.floor(fx);
            tx = smooth(fx - ix);
            x0 = ix;
            x1 = ix + 1;
        }
        if (wrapH && scale) {
            const modH = Math.max(1, Math.round(wrapH / scale));
            const effScaleY = wrapH / modH;
            fy = gy / effScaleY;
            const iy = Math.floor(fy);
            ty = smooth(fy - iy);
            y0 = ((iy % modH) + modH) % modH;
            y1 = (((iy + 1) % modH) + modH) % modH;
        } else {
            fy = gy / scale;
            const iy = Math.floor(fy);
            ty = smooth(fy - iy);
            y0 = iy;
            y1 = iy + 1;
        }
        const a = corner(seed, salt, x0, y0), b = corner(seed, salt, x1, y0);
        const c = corner(seed, salt, x0, y1), d = corner(seed, salt, x1, y1);
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
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
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
        const ww = d && d.width ? d.width : 256;
        const wh = d && d.height ? d.height : 256;
        // Each field: its own noise plus a detail octave at 25 % weight.
        const n = (salt, scale) => valueNoise(seed, salt, gx, gy, scale, ww, wh) * 0.75 + valueNoise(seed, salt ^ SALT.detail, gx, gy, sc.detail, ww, wh) * 0.25;
        let e = n(SALT.elevation, sc.elevation);
        let r = n(SALT.rainfall, sc.rainfall);
        // North and South poles are cold, equator (middle) is warm, high ground is cold.
        const distFromEq = Math.abs(gy - wh / 2) / (wh / 2);
        const baseTemp = 0.85 - 0.7 * distFromEq;
        let t = clamp01(baseTemp + (n(SALT.temperature, sc.temperature) - 0.5) * 0.4 - Math.max(0, e - 0.5) * 0.6);
        let dr = n(SALT.drainage, sc.drainage);
        let v = n(SALT.volcanism, sc.volcanism);
        let sav = n(SALT.savagery, sc.savagery);
        let al = n(SALT.alignment, sc.alignment);
        // The start is always temperate and habitable: blend toward startClimate near it.
        const radius = cl.startHabitableRadius || [28, 110];
        let dx = Math.abs(gx - d.startX);
        if (dx > ww / 2) dx = ww - dx;
        let dy = Math.abs(gy - d.startY);
        if (dy > wh / 2) dy = wh - dy;
        const w = smoothstep(radius[1], radius[0], Math.hypot(dx, dy));
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
    const isLake = (seed, cl, f, gx, gy, wrapW, wrapH) => {
        const L = cl.lakes;
        return !!L && f.e >= cl.seaLevel && f.e < cl.mountainLevel && f.d < L.maxDrainage && f.r > L.minRainfall
            && valueNoise(seed, SALT.lake, gx, gy, L.scale, wrapW, wrapH) > L.threshold;
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

    function makeRiver(anchorX, anchorY, halfWidth, phase, amp, period, worldW, worldH) {
        const h = worldH || 256;
        const w = worldW || 256;
        const cycles = Math.max(1, Math.round(h / period));
        const freq1 = (2 * Math.PI * cycles) / h;
        const freq2 = (4 * Math.PI * cycles) / h;
        const center = gy => {
            const dd = gy - anchorY;
            return anchorX + amp * (0.7 * Math.sin(freq1 * dd + phase) + 0.3 * Math.sin(freq2 * dd + 2 * phase));
        };
        const isWater = (gx, gy) => {
            let dx = Math.abs(gx - Math.round(center(gy)));
            if (w) {
                dx = dx % w;
                if (dx > w / 2) dx = w - dx;
            }
            return dx <= halfWidth;
        };
        return { anchorX, anchorY, halfWidth, center, isWater };
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
                const m = makeRiver(Math.floor(unit(seed, SALT.river, i * 64 + j) * d.width), d.startY, hw, phase, R.meanderCells || 0, R.meanderPeriodCells || 97, d.width, d.height);
                let clear = true;
                for (let dy = -keep; dy <= keep && clear; dy += 2) {
                    let distToStart = Math.abs(Math.round(m.center(d.startY + dy)) - d.startX);
                    if (distToStart > d.width / 2) distToStart = d.width - distToStart;
                    if (distToStart <= keep + hw) clear = false;
                }
                // Rivers keep apart, so two don't run as one wide river.
                if (clear && rivers.some(o => {
                    let sep = Math.abs(o.anchorX - m.anchorX);
                    if (sep > d.width / 2) sep = d.width - sep;
                    return sep < 24;
                })) clear = false;
                if (clear) chosen = m;
            }
            rivers.push(chosen || makeRiver(d.startX + keep * 3 * (i + 1), d.startY, hw, phase, R.meanderCells || 0, R.meanderPeriodCells || 97, d.width, d.height));
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
        let cx = (d.startX + Math.cos(angle) * dist) % d.width;
        if (cx < 0) cx += d.width;
        let cy = (d.startY + Math.sin(angle) * dist) % d.height;
        if (cy < 0) cy += d.height;
        const isWater = (gx, gy) => {
            let dx = Math.abs(gx - cx);
            if (dx > d.width / 2) dx = d.width - dx;
            let dy = Math.abs(gy - cy);
            if (dy > d.height / 2) dy = d.height - dy;
            return ((dx) / rx) ** 2 + ((dy) / ry) ** 2 <= 1;
        };
        return { cx, cy, rx, ry, isWater };
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
                return f.e < cl.seaLevel || isLake(d.seed, cl, f, gx, gy, d.width, d.height);
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
        const lake = isLake(seed, cl, f, gx, gy, d.width, d.height);
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
        return isLake(d.seed, cat.climate, fieldsFor(d.seed, d, cat.climate, gx, gy), gx, gy, d.width, d.height);
    };
    WorldGen.biomeAt = (gx, gy, z = 0) => { const c = WorldGen.cellInfo(gx, gy, z); return c ? c.biomeId : null; };
    WorldGen.surfaceElevationAt = (gx, gy, seed) => (window.UF && UF.Levels && typeof UF.Levels.surfaceElevationAt === "function") ? UF.Levels.surfaceElevationAt(gx, gy, seed) : 0;

    // The stone of the ground and the levels above it at a world cell (a pure function of the seed, the world's
    // dimensions and the climate; geologyAt and the landform plan both read it).
    function surfaceStoneId(seed, d, cl, gx, gy) {
        const f = fieldsFor(seed, d, cl, gx, gy);
        const localNoise = unit4(seed, SALT.geology, gx, gy);
        // Volcanic hotspots produce extrusive basalt
        if (f.v > 0.62 || (f.v > 0.50 && localNoise > 0.70)) return "basalt";
        // Mountain peaks and high elevations expose massive plutonic granite
        if (f.e > 0.60 || (f.e > 0.52 && localNoise > 0.60)) return "granite";
        // High drainage upland slopes form metamorphic slate
        if (f.e > 0.44 && f.d > 0.48) return "slate";
        // Contact metamorphism zones form rare marble
        if (f.e > 0.48 && f.v > 0.45 && localNoise > 0.85) return "marble";
        // Arid, dry or well-drained basins form sedimentary sandstone
        if (f.r < 0.38 || f.d < 0.32 || localNoise < 0.22) return "sandstone";
        // Valleys, lush river basins, and temperate meadows form sedimentary limestone
        return "limestone";
    }
    // The stone of -1 (upper earth) and -2 (deep earth) from the level's geological biome id (UF_Levels).
    function undergroundStoneId(seed, bId, gx, gy, z) {
        const localNoise = unit4(seed, SALT.geology, gx, gy);
        if (z === -1) {
            if (bId === "chalk_karst") return "limestone";
            if (bId === "rooted_loam") return localNoise > 0.5 ? "sandstone" : "slate";
            if (bId === "clay_bed") return "slate";
            if (bId === "shallow_cave") return localNoise > 0.6 ? "limestone" : "sandstone";
            return localNoise > 0.6 ? "limestone" : (localNoise > 0.3 ? "sandstone" : "slate");
        }
        if (bId === "deep_mine_belt") return "granite";
        if (bId === "crystal_cavern") return "marble";
        if (bId === "fossil_bed") return localNoise > 0.5 ? "limestone" : "slate";
        if (bId === "deep_salt_cavern") return "basalt";
        return localNoise > 0.5 ? "granite" : (localNoise > 0.25 ? "basalt" : "marble");
    }

    /**
     * Deterministic geological stratum at world coordinates (gx, gy, z).
     * Maps climate fields, elevation, volcanism, and subterranean biomes
     * to physical stone materials in catalog.materials.stones (Limestone, Sandstone, Granite, Basalt, Slate, Marble).
     * Returns: { stone, name, category, depthBand, density, compressiveStrength, workability, color, tags, z } or null.
     */
    WorldGen.geologyAt = function(gx, gy, z = 0) {
        const cat = catalog();
        const stones = cat && cat.materials && cat.materials.stones;
        if (!stones) return null;
        const st = UF.World && UF.World.state;
        const seed = st ? st.seed : 0;
        const d = dims(st);
        if (gx < 0 || gy < 0 || gx >= d.width || gy >= d.height) return null;

        let stoneId = "limestone";
        let depthBand = "surface";

        if (z < 0) {
            depthBand = z === -1 ? "upper_earth" : "deep";
            const L = window.UF.Levels;
            const size = d.size;
            const ax = Math.floor(gx / size), ay = Math.floor(gy / size);
            const lx = gx - ax * size, ly = gy - ay * size;
            const biome = L && typeof L.biomeAt === "function" ? L.biomeAt({ area: { x: ax, y: ay }, x: lx, y: ly, z }) : null;
            const bId = (biome && biome.id) || (typeof biome === "string" ? biome : "");
            stoneId = undergroundStoneId(seed, bId, gx, gy, z);
        } else {
            // Surface (z >= 0)
            stoneId = surfaceStoneId(seed, d, cat.climate, gx, gy);
        }

        const matDef = stones[stoneId] || stones.limestone;
        if (!matDef) return null;

        return {
            stone: stoneId,
            name: matDef.name,
            category: matDef.category,
            depthBand,
            density: matDef.density,
            compressiveStrength: matDef.compressiveStrength,
            workability: matDef.workability,
            color: matDef.color,
            tags: matDef.tags,
            z
        };
    };

    /** { biomeId, biome, ground, water, walkable, region: {savagery, alignment}, fields, lake, peak, geology } for a world cell. */
    WorldGen.cellInfo = function(gx, gy, z = 0) {
        const m = compiled();
        const st = UF.World.state;
        if (!m || !st) return null;
        if (!Number.isInteger(z) || z < -2 || z > 2) return null;
        const geology = WorldGen.geologyAt(gx, gy, z);
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
                region: { savagery: "wild", alignment: "ordinary" }, fields: null, lake: !!c.water, peak: false, z, geology };
        }
        const c = resolve(st.seed, dims(st), m, waterModels(st), gx, gy, {});
        return {
            biomeId: c.biomeId, biome: m.biomes[c.b], ground: c.groundId, water: c.waterKey,
            walkable: !c.waterKey && !(c.flags & FLAG_PEAK) && groundStandable(st, gx, gy),
            region: { savagery: m.savTiers[c.sav].id, alignment: m.alignTiers[c.align].id },
            fields: c.f, lake: c.lake, peak: !!(c.flags & FLAG_PEAK), geology
        };
    };
    // A ground cell of a generator 6 world (DEUS-TSK-FABLE-19B) is walkable only on a floor, ramp or stairs of its column:
    // not inside a hill, not over a cut or a cave. Older grounds keep their climate-only answer (generator 4 worlds
    // unchanged; below generator 4 the ground's shapes come from this function, so no shape is read there).
    function groundStandable(st, gx, gy) {
        const L = window.UF && UF.Levels;
        if (!L || typeof L.levelGenerator !== "function" || L.levelGenerator(0) < 6 || typeof L.shapeCodeAt !== "function") return true;
        const size = st.size, ax = Math.floor(gx / size), ay = Math.floor(gy / size);
        const code = L.shapeCodeAt(ax, ay, gx - ax * size, gy - ay * size, 0);
        return code === 2 || code >= 4;
    }
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

    /** Depth-specific flora and starter objects. Surface vegetation is never a fallback underground. */
    WorldGen.undergroundKitConfig = function(z) {
        if (z !== -1 && z !== -2) return null;
        const cat = catalog(), row = cat && cat.start && cat.start.undergroundKit && cat.start.undergroundKit[String(z)];
        if (!row || !row.objects || !Array.isArray(row.natural)) throw new Error(`Missing underground flora configuration for level ${z}`);
        const base = WorldGen.kitConfig();
        const objects = Object.assign({}, row.objects);
        const natural = row.natural.map(p => Object.assign({}, p));
        const types = new Map((cat.objects || []).map(o => [o.id, o]));
        for (const [id, count] of Object.entries(objects)) {
            const type = types.get(id), tags = type && type.tags || [];
            if (!type || !Number.isInteger(count) || count < 0) throw new Error(`Invalid underground kit object ${id} on level ${z}`);
            if (tags.some(t => ["tree", "plant", "bush", "food", "fruit", "fiber", "straw"].includes(t)) && !tags.includes("underground")) throw new Error(`Surface vegetation ${id} in underground kit ${z}`);
        }
        for (const p of natural) {
            const type = types.get(p.id);
            if (!type || !(type.tags || []).includes("underground") || !Number.isFinite(p.chance) || p.chance < 0 || p.chance > 1) throw new Error(`Invalid natural underground flora ${p.id} on level ${z}`);
        }
        return { radius: base.radius.slice(), ore: base.ore, objects, nearWater: [], natural };
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
    // The ground's column (DEUS-TSK-FABLE-16, owner directive 2026-09-24): hard volumetric terrain invariant. For every
    // natural cell whose surface S (UF_Levels) is +1 or +2, the ground cell under it (z = 0) is solid rock, and at S = 2
    // the +1 cell is solid too (UF_Levels' shapes). The ground's tiles follow those shapes here: a solid ground cell is
    // the rock face ground kind (peak_rock: impassable, region 250), never grass, dirt or water; a cell carved or dug
    // inside a hill (cave mouths, tunnels) is bare rock floor (rock); a ramp (natural: an S = 0 cell at the foot of a
    // one-step rise) is dry ground, never water, and UF_Levels draws the ramp over it. UF_Levels draws the cliff faces.

    let columnWarned = false;
    // The column of an area's ground: { code(i) -> shape code 0..7, surface: Int8Array of S } or null when the ground has
    // no column (no UF_Levels, a save from before generator 4: the ground's shape is its tiles). perCell: read shapes
    // one cell at a time (a repaint) instead of copying the area's grid (a build).
    function groundColumns(ax, ay, perCell) {
        const L = window.UF && UF.Levels, m = compiled();
        if (!L || typeof L.groundVolumetric !== "function" || !L.groundVolumetric()) return null;
        if (!m || m.groundIndex.get("peak_rock") === undefined || m.groundIndex.get("rock") === undefined) {
            if (!columnWarned) console.warn("UF_WorldGen: groundKinds lacks peak_rock or rock; the ground is painted without its column");
            columnWarned = true;
            return null;
        }
        const surface = L.surfaceGrid(ax, ay);
        if (!surface) return null;
        if (perCell) {
            const size = UF.World.state.size;
            return { code: i => L.shapeCodeAt(ax, ay, i % size, (i - (i % size)) / size, 0), surface };
        }
        const grid = L.shapeGrid(0, ax, ay);
        return grid ? { code: i => grid[i], surface } : null;
    }
    WorldGen.volumeStats = {}; // "ax,ay" -> { columns, solid, holes, carved, ramps, groundReplaced, waterSuppressed, sitePiecesSkipped } of the last ground build

    function groundPalette(cat, m) {
        const T = window.UF && UF.Tiles;
        return {
            shapes: shapeTable(),
            waterBases: m.waterKeys.map(k => autotileBase(cat.water.surface[k])),
            groundBases: m.groundIds.map((id, k) => (T && T.groundBase(id) !== null ? T.groundBase(id) : Tilemap.TILE_ID_A2 + k * 48)),
            peakK: m.groundIndex.get("peak_rock"), rockK: m.groundIndex.get("rock"),
            joins: (a, b) => !!(T && T.joins && T.joins(m.groundIds[a], m.groundIds[b]))
        };
    }

    // Readers for the painter, in area-local coordinates (neighbours outside the area included): solid (the ground cell
    // is solid), hole (the ground cell is open: a cut or cave took its floor, generator 6), under (its surface is above
    // the ground: S >= 1), kind (ground index painted there), wet (water index + 1 painted there, 0 = none), peak (a
    // mountain peak cell). natural: { kind, wet, peak } of the climate model. col null:
    // nothing is solid and every cell is its natural ground (the painting before the column invariant).
    function columnReader(col, size, d, gx0, gy0, natural, P) {
        const one = d.areasX === 1 && d.areasY === 1;
        const L = window.UF && UF.Levels;
        const outside = new Map(); // cells of other areas (multi-area worlds): their surface height; their caves and digs aren't seen
        const surfaceOut = (x, y) => {
            const wx = ((gx0 + x) % d.width + d.width) % d.width, wy = ((gy0 + y) % d.height + d.height) % d.height;
            const key = wy * 65536 + wx;
            let s = outside.get(key);
            if (s === undefined) {
                s = L && typeof L.surfaceElevationAt === "function" ? L.surfaceElevationAt(wx, wy) : 0;
                outside.set(key, s);
            }
            return s;
        };
        const local = (x, y) => one ? (((y % size) + size) % size) * size + (((x % size) + size) % size)
            : (x >= 0 && y >= 0 && x < size && y < size ? y * size + x : -1);
        const solid = col ? (x, y) => { const i = local(x, y); return i >= 0 ? col.code(i) === 1 : surfaceOut(x, y) >= 1; } : () => false;
        const under = col ? (x, y) => { const i = local(x, y); return i >= 0 ? col.surface[i] >= 1 : surfaceOut(x, y) >= 1; } : () => false;
        const ramp = col ? (x, y) => { const i = local(x, y); return i >= 0 && col.code(i) === 4; } : () => false;
        const hole = col ? (x, y) => { const i = local(x, y); return i >= 0 && col.code(i) === 3; } : () => false;
        return {
            solid, under, ramp, hole,
            kind: (x, y) => solid(x, y) || hole(x, y) ? P.peakK : under(x, y) ? P.rockK : natural.kind(x, y),
            wet: (x, y) => solid(x, y) || hole(x, y) || under(x, y) || ramp(x, y) ? 0 : natural.wet(x, y),
            peak: natural.peak
        };
    }

    // The ground tiles of one cell: { layer0, layer2, region, solid, hole, carved, ramp }.
    function paintGround(x, y, R, P) {
        if (R.hole(x, y)) {
            // Generator 6 (DEUS-TSK-FABLE-19B): a ground cell that a cut or a cave left without a floor (UF_Levels derives
            // it open) is impassable ground with region 250, painted as the rock round it until 19C draws what is below
            // (the History land test, the peaks check and the tile passage all read it as rock; nothing is placed on it).
            let mask = 0;
            for (let k = 0; k < 8; k++) if (R.solid(x + NB[k][0], y + NB[k][1]) || R.hole(x + NB[k][0], y + NB[k][1])) mask |= NB[k][2];
            const tile = P.groundBases[P.peakK] + P.shapes[mask];
            return { layer0: tile, layer2: tile, region: PEAK_REGION, solid: false, hole: true, carved: false, ramp: false };
        }
        if (R.solid(x, y)) {
            let mask = 0;
            for (let k = 0; k < 8; k++) if (R.solid(x + NB[k][0], y + NB[k][1]) || R.hole(x + NB[k][0], y + NB[k][1])) mask |= NB[k][2];
            const tile = P.groundBases[P.peakK] + P.shapes[mask];
            // Layer 2 repeats the rock face: UF_Tiles' shade overlay on layer 1 (E tiles, passable) must not open the rock
            // to passage (RMMZ decides passage by the top tile that isn't a [*] tile).
            return { layer0: tile, layer2: tile, region: PEAK_REGION, solid: true, carved: false, ramp: false };
        }
        const carved = R.under(x, y);
        const w = R.wet(x, y);
        let mask = 0, layer0;
        if (w) {
            for (let k = 0; k < 8; k++) if (R.wet(x + NB[k][0], y + NB[k][1])) mask |= NB[k][2];
            layer0 = P.waterBases[w - 1] + P.shapes[mask];
        } else {
            const g = R.kind(x, y);
            for (let k = 0; k < 8; k++) {
                const ng = R.kind(x + NB[k][0], y + NB[k][1]);
                if (ng === g || P.joins(ng, g)) mask |= NB[k][2];
            }
            layer0 = P.groundBases[g] + P.shapes[mask];
        }
        return { layer0, layer2: 0, region: !w && !carved && R.peak(x, y) ? PEAK_REGION : 0, solid: false, carved, ramp: R.ramp(x, y) };
    }

    /**
     * The ground tiles of cell (x, y) of area (ax, ay) as a build paints them now (UF_Levels' shapes with their saved
     * changes): { layer0, layer2, region, solid, carved }, or null without a world or catalog. UF_Levels repaints a
     * ground cell whose shape changed, and its neighbours, with this.
     */
    WorldGen.groundTilesAt = function(ax, ay, x, y) {
        const cat = catalog(), m = compiled(), st = window.UF.World && UF.World.state;
        if (!cat || !m || !st) return null;
        const d = dims(st), size = st.size, gx0 = ax * size, gy0 = ay * size, wm = waterModels(st);
        const cells = new Map();
        const natural = (lx, ly) => {
            const gx = ((gx0 + lx) % d.width + d.width) % d.width, gy = ((gy0 + ly) % d.height + d.height) % d.height;
            const key = gy * 65536 + gx;
            let c = cells.get(key);
            if (!c) {
                const r = resolve(st.seed, d, m, wm, gx, gy, {});
                c = { g: r.g, w: r.w, flags: r.flags };
                cells.set(key, c);
            }
            return c;
        };
        const P = groundPalette(cat, m);
        const R = columnReader(groundColumns(ax, ay, true), size, d, gx0, gy0, {
            kind: (lx, ly) => natural(lx, ly).g,
            wet: (lx, ly) => natural(lx, ly).w,
            peak: (lx, ly) => (natural(lx, ly).flags & FLAG_PEAK) !== 0
        }, P);
        return paintGround(x, y, R, P);
    };

    //-------------------------------------------------------------------------
    // Landforms (DEUS-TSK-FABLE-19B, WG.00.08): the natural cuts and cave networks of an area, planned from the seed for
    // UF_Levels' generator 6, which carves them into the five-strata columns (the one terrain authority: nothing here is
    // kept as terrain). Pure: the seed, the area, the world's dimensions and start, the catalog's climate and the columns
    // UF_Levels passes in; no read of UF.World.state. Every number below is frozen for generator 6 (another landform is
    // another generator version). Elevation g = (z + 2) * 5 + s: 0 (-2 S0) .. 24 (+2 S4); a column's top is the elevation
    // just above its highest solid stratum (the ground's surface is top 11, a +1 hilltop 16, a +2 summit 21).
    // docs/systems/UF_WorldGen.md, section Landforms.

    const LF_EDGE = 8;                          // nothing within 8 cells of an area edge (neighbour areas are generated apart)
    const LF_LATTICE = 32;                      // one surface landform slot per 32 x 32 cells
    const LF_COVER_MAX = 0.12;                  // surface landforms stop once 12 % of an area's columns are cut
    const LF_CLASS_P = Object.freeze([0.62, 0.86, 0.975]);    // shallow < .62 <= one band < .86 <= Z-1 < .975 <= Z-2
    const LF_CLASSES = Object.freeze(["shallow", "band", "z-1", "z-2"]);
    const LF_FAMILIES = Object.freeze(["TEMP", "WET", "ARID", "HIGH", "VOLC"]);
    const LF_SLOT_P = Object.freeze([0.62, 0.62, 0.66, 0.66, 0.62]);   // a slot holds a landform, by family
    const LFS = Object.freeze({ slot: 0x4c460001, bump: 0x4c460002, crag: 0x4c460003, cave: 0x4c460004, open: 0x4c460005 });
    const C_SH = 1, C_BAND = 2, C_Z1 = 4, C_Z2 = 8;
    const DX4 = [0, 1, 0, -1], DY4 = [-1, 0, 1, 0];   // N E S W

    // Kinds. prim: channel | bowl | terrace | arc (surface cuts), crag (raised summit rock), cave, opening (a collapse
    // into a cave). classes: the depth classes it may take (bits: shallow, one band, Z-1, Z-2). w: tendency per family
    // (TEMP, WET, ARID, HIGH, VOLC) plus 0.1 for every family (tendencies, not exclusive); host: the stone that doubles it.
    // Walls: steps [rise strata, run cells] from the floor's edge outwards, repeated; every `ledge`-th step is a shelf two
    // cells wider (ledges, shoulders); bump: the share of wall cells one stratum higher (broken, eroded banks).
    const lfKind = (id, prim, classes, w, host, style) => Object.freeze({ id, prim, classes, w: Object.freeze(w), host, style: Object.freeze(style) });
    const LF_KINDS = Object.freeze([
        null,
        lfKind("limestone_ravine", "channel", C_BAND | C_Z1 | C_Z2, [5, 1, 1, 1, 0], "limestone", { len: [34, 70], hw: [0.7, 1.6], steps: [[1, 1], [1, 1], [2, 1]], ledge: 3, meander: 0.55, slope: 0.6, bump: 0.12 }),
        lfKind("sinkhole", "bowl", C_SH | C_BAND | C_Z1 | C_Z2, [4, 1, 0.3, 0.3, 0.5], "limestone", { r0: [0.6, 2.0], steps: [[1, 1], [2, 1]], ledge: 0, irregular: 0.3, bump: 0.1 }),
        lfKind("karst_cut", "channel", C_SH | C_BAND | C_Z1, [3, 0.5, 0, 0.5, 0], "limestone", { len: [14, 30], hw: [0.5, 1.2], steps: [[2, 1], [1, 1]], ledge: 0, meander: 0.8, slope: 0.8, bump: 0.15 }),
        lfKind("stream_cut", "channel", C_SH | C_BAND, [3, 3, 1, 1, 0.5], null, { len: [44, 90], hw: [0.5, 1.2], steps: [[1, 1], [1, 2]], ledge: 0, meander: 0.6, slope: 0.35, bump: 0.08 }),
        lfKind("limestone_cleft", "channel", C_BAND | C_Z1, [2, 0, 0, 1, 0], "limestone", { len: [12, 26], hw: [0.2, 0.6], steps: [[2, 1], [3, 1]], ledge: 0, meander: 0.25, slope: 1.0, bump: 0.1 }),
        lfKind("drainage_cut", "channel", C_SH | C_BAND, [1, 5, 0, 0, 0], null, { len: [30, 72], hw: [0.3, 0.9], steps: [[1, 1]], ledge: 0, meander: 0.45, slope: 0.4, bump: 0.05 }),
        lfKind("peat_collapse_hollow", "bowl", C_SH, [0.5, 4, 0, 0, 0], null, { r0: [1.8, 3.6], steps: [[1, 2]], ledge: 0, irregular: 0.35, bump: 0.05 }),
        lfKind("wet_sinkhole", "bowl", C_SH | C_BAND | C_Z1, [0.5, 3, 0, 0, 0], null, { r0: [0.8, 2.2], steps: [[1, 1]], ledge: 0, irregular: 0.3, bump: 0.08 }),
        lfKind("water_cut_channel", "channel", C_SH | C_BAND | C_Z1, [1, 3, 0, 0, 0], null, { len: [40, 80], hw: [0.8, 1.8], steps: [[1, 1], [1, 1], [1, 2]], ledge: 0, meander: 0.65, slope: 0.45, bump: 0.08 }),
        lfKind("arroyo", "channel", C_SH | C_BAND, [0.5, 0, 4, 0, 0], "sandstone", { len: [40, 86], hw: [1.8, 3.2], steps: [[1, 1], [1, 2]], ledge: 0, meander: 0.45, slope: 0.5, bump: 0.06 }),
        lfKind("canyon", "channel", C_BAND | C_Z1 | C_Z2, [0.3, 0, 3, 1, 0], "sandstone", { len: [44, 84], hw: [1.5, 3.0], steps: [[2, 1], [2, 1], [1, 2]], ledge: 2, meander: 0.35, slope: 0.7, bump: 0.08 }),
        lfKind("slot_chasm", "channel", C_BAND | C_Z1 | C_Z2, [0, 0, 2, 0.5, 0], "sandstone", { len: [26, 52], hw: [0.2, 0.6], steps: [[3, 1], [2, 1]], ledge: 0, meander: 0.5, slope: 0.9, bump: 0.1 }),
        lfKind("dry_wash", "channel", C_SH, [0, 0, 4, 0, 0], null, { len: [36, 80], hw: [2.6, 4.6], steps: [[1, 2], [1, 3]], ledge: 0, meander: 0.5, slope: 0.3, bump: 0.05 }),
        lfKind("erosion_terraces", "terrace", C_SH | C_BAND, [0.5, 0, 3, 1, 0], "sandstone", { r: [8, 13], steps: [[2, 2], [1, 1]], ledge: 0, bump: 0.06 }),
        lfKind("fault_chasm", "channel", C_Z1 | C_Z2, [0.3, 0, 0, 4, 1], "granite", { len: [56, 110], hw: [0.6, 1.3], steps: [[3, 1], [2, 1], [2, 2]], ledge: 3, meander: 0.06, slope: 0.9, bump: 0.08 }),
        lfKind("granite_cleft", "channel", C_BAND | C_Z1, [0, 0, 0, 3, 0], "granite", { len: [12, 28], hw: [0.2, 0.6], steps: [[3, 1], [2, 1]], ledge: 0, meander: 0.2, slope: 1.0, bump: 0.08 }),
        lfKind("rock_cut", "channel", C_SH | C_BAND, [0, 0, 0.5, 3, 0], "granite", { len: [16, 40], hw: [0.6, 1.4], steps: [[2, 1], [3, 1]], ledge: 0, meander: 0.3, slope: 0.9, bump: 0.1 }),
        lfKind("scree_terraces", "terrace", C_SH | C_BAND, [0, 0, 0, 4, 0], null, { r: [8, 13], steps: [[1, 1]], ledge: 0, bump: 0.12 }),
        lfKind("fissure", "channel", C_BAND | C_Z1 | C_Z2, [0, 0, 0, 0.5, 5], "basalt", { len: [40, 92], hw: [0.1, 0.5], steps: [[1, 1], [3, 1], [3, 1]], ledge: 0, meander: 0.12, slope: 0.9, bump: 0.12 }),
        lfKind("caldera_fracture", "arc", C_BAND | C_Z1 | C_Z2, [0, 0, 0, 0, 2], "basalt", { radius: [14, 24], span: [70, 150], arcs: [1, 3], hw: [0.2, 0.7], steps: [[2, 1], [3, 1]], ledge: 0, slope: 1.0, bump: 0.1 }),
        lfKind("broken_basalt_cut", "channel", C_SH | C_BAND, [0, 0, 0, 0, 3], "basalt", { len: [16, 40], hw: [0.6, 1.5], steps: [[2, 1], [1, 1]], ledge: 0, meander: 0.35, slope: 0.8, bump: 0.3 }),
        lfKind("summit_crag", "crag", 0, [0, 0, 0, 0, 0], null, {}),
        lfKind("hill_cave", "cave", 0, [0, 0, 0, 0, 0], null, { level: 0 }),
        lfKind("massif_cave", "cave", 0, [0, 0, 0, 0, 0], null, { level: 1 }),
        lfKind("crag_cave", "cave", 0, [0, 0, 0, 0, 0], null, { level: 2 }),
        lfKind("upper_cave", "cave", 0, [0, 0, 0, 0, 0], null, { level: -1 }),
        lfKind("lava_tube", "cave", 0, [0, 0, 0, 0, 0], "basalt", { level: -1 }),
        lfKind("deep_cave", "cave", 0, [0, 0, 0, 0, 0], null, { level: -2 }),
        lfKind("descending_cave", "cave", 0, [0, 0, 0, 0, 0], null, { level: 0 }),
        lfKind("lava_tube_collapse", "opening", C_Z1, [0, 0, 0, 0, 0], "basalt", { r0: [0.8, 1.6], steps: [[2, 1], [1, 1]], ledge: 0, irregular: 0.25, bump: 0.15 }),
        lfKind("karst_window", "opening", C_Z1, [0, 0, 0, 0, 0], "limestone", { r0: [0.8, 1.8], steps: [[2, 1], [1, 1]], ledge: 0, irregular: 0.3, bump: 0.1 })
    ]);
    const LF_CODE = new Map(LF_KINDS.map((k, i) => [k ? k.id : "", i]));

    /** The landform family of climate fields: VOLC volcanism > 0.62 (geologyAt's basalt), HIGH mountains or cold
     *  (glacier, tundra), WET the marsh and swamp rule of classify, ARID rainfall < 0.3, TEMP the rest. */
    function lfFamily(cl, f) {
        if (f.v > 0.62) return 4;
        if (f.e >= cl.mountainLevel || f.t < 0.25) return 3;
        if (f.r > 0.6 && f.d < 0.35) return 1;
        if (f.r < 0.3) return 2;
        return 0;
    }

    // Wall rise (strata above the floor) at u cells beyond the floor's edge, as a table at quarter cells: index ceil(4u).
    function lfWallTable(style, maxRise) {
        const out = [0];
        let acc = 0, rise = 0;
        for (let k = 0; rise <= maxRise && k < 64; k++) {
            const s = style.steps[k % style.steps.length];
            rise += s[0];
            acc += s[1] + (style.ledge && k % style.ledge === style.ledge - 1 ? 2 : 0);
            while (out.length <= acc * 4) out.push(rise);
        }
        return { table: Uint8Array.from(out), reach: acc };
    }
    const lfRise = (tbl, u) => u <= 0 ? 0 : tbl[Math.min(tbl.length - 1, Math.ceil(u * 4))];

    // The cut field: the lowest floor any landform asks for per column (255 none), and which landform asked.
    function lfStamp(P, i, F) {
        if (F >= P.field[i] || P.prot[i]) return;
        if (P.field[i] >= P.top0[i] && F < P.top0[i]) P.cutCells++;
        P.field[i] = F;
        P.owner[i] = P.cur;
    }
    const lfBump = (P, k, gx, gy) => k.style.bump && unit4(P.seed, LFS.bump + P.cur, gx, gy) < k.style.bump ? 1 : 0;

    // A swept channel along points (x, y) at 0.5-cell spacing: the floor descends from the rim at both ends (style.slope
    // strata per cell) to `bed`, is at least one cell wide (so the floor is continuous), tapers and swells; the walls step
    // up from it. t: distance of each point from the channel's middle.
    function lfSweep(P, k, pts, rim, bed, hwBase, ph) {
        const count = pts.length >> 1, half = (count - 1) * 0.25;
        const W = lfWallTable(k.style, rim - bed), size = P.size, gx0 = P.ax * size, gy0 = P.ay * size;
        for (let p = 0; p < count; p++) {
            const t = p * 0.5 - half;
            const depth = Math.min(rim - bed, Math.floor(k.style.slope * (half - Math.abs(t))));
            if (depth < 1) continue;
            const bedT = rim - depth;
            const hw = hwBase * (0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - (t / half) * (t / half)))) * (1 + 0.22 * Math.sin(t / 4.3 + ph));
            const floorR = Math.max(hw, 0.72), R = floorR + W.reach + 0.5;
            const px = pts[p * 2], py = pts[p * 2 + 1];
            const x0 = Math.max(0, Math.ceil(px - R)), x1 = Math.min(size - 1, Math.floor(px + R));
            const y0 = Math.max(0, Math.ceil(py - R)), y1 = Math.min(size - 1, Math.floor(py + R));
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
                const i = y * size + x;
                if (P.prot[i]) continue;
                const rise = lfRise(W.table, Math.hypot(x - px, y - py) - floorR);
                lfStamp(P, i, bedT + rise + (rise > 0 ? lfBump(P, k, gx0 + x, gy0 + y) : 0));
            }
        }
    }
    function lfChannel(P, k, rng, x, y, rim, bed) {
        const s = k.style, len = s.len[0] + rng() * (s.len[1] - s.len[0]), hw = s.hw[0] + rng() * (s.hw[1] - s.hw[0]);
        const theta0 = rng() * Math.PI * 2, ph1 = rng() * 6.283, ph2 = rng() * 6.283, ph3 = rng() * 6.283;
        const lam1 = 7 + rng() * 9, lam2 = 3 + rng() * 4;
        const heading = t => theta0 + s.meander * (Math.sin(t / lam1 + ph1) + 0.5 * Math.sin(t / lam2 + ph2));
        const K = Math.ceil(len / 0.5), mid = K >> 1, pts = new Float32Array((K + 1) * 2);
        pts[mid * 2] = x; pts[mid * 2 + 1] = y;
        for (let p = mid + 1; p <= K; p++) {
            const a = heading((p - mid) * 0.5);
            pts[p * 2] = pts[(p - 1) * 2] + Math.cos(a) * 0.5; pts[p * 2 + 1] = pts[(p - 1) * 2 + 1] + Math.sin(a) * 0.5;
        }
        for (let p = mid - 1; p >= 0; p--) {
            const a = heading((p - mid) * 0.5);
            pts[p * 2] = pts[(p + 1) * 2] - Math.cos(a) * 0.5; pts[p * 2 + 1] = pts[(p + 1) * 2 + 1] - Math.sin(a) * 0.5;
        }
        lfSweep(P, k, pts, rim, bed, hw, ph3);
        return { length: Math.round(len), halfWidth: Math.round(hw * 10) / 10, heading: Math.round(theta0 * 180 / Math.PI) };
    }
    function lfArc(P, k, rng, x, y, rim, bed) {
        const s = k.style, arcs = s.arcs[0] + Math.floor(rng() * (s.arcs[1] - s.arcs[0] + 1));
        const R0 = s.radius[0] + rng() * (s.radius[1] - s.radius[0]), a0 = rng() * Math.PI * 2;
        const cx = x - Math.cos(a0) * R0, cy = y - Math.sin(a0) * R0;
        for (let q = 0; q < arcs; q++) {
            const R = R0 + q * (4 + rng() * 3), span = (s.span[0] + rng() * (s.span[1] - s.span[0])) * Math.PI / 180;
            const hw = s.hw[0] + rng() * (s.hw[1] - s.hw[0]), K = Math.max(2, Math.ceil(R * span / 0.5)), pts = new Float32Array((K + 1) * 2);
            for (let p = 0; p <= K; p++) {
                const a = a0 - span / 2 + span * p / K, rr = R * (1 + 0.04 * Math.sin(p * 0.9));
                pts[p * 2] = cx + Math.cos(a) * rr; pts[p * 2 + 1] = cy + Math.sin(a) * rr;
            }
            lfSweep(P, k, pts, rim, q === 0 ? bed : Math.min(rim - 1, bed + 2 * q), hw, rng() * 6.283);
        }
        return { arcs, radius: Math.round(R0), centre: { x: Math.round(cx), y: Math.round(cy) } };
    }
    // A bowl: floor radius r0, walls stepping up to the rim, an irregular outline (16 radial factors).
    function lfBowl(P, k, rng, x, y, rim, bed) {
        const s = k.style, r0 = s.r0[0] + rng() * (s.r0[1] - s.r0[0]), W = lfWallTable(s, rim - bed);
        const fac = new Float32Array(17);
        for (let q = 0; q < 16; q++) fac[q] = 1 + s.irregular * (rng() * 2 - 1);
        fac[16] = fac[0];
        const size = P.size, gx0 = P.ax * size, gy0 = P.ay * size, R = Math.ceil((Math.max(r0, 0.72) + W.reach) * (1 + s.irregular)) + 1;
        for (let yy = Math.max(0, y - R); yy <= Math.min(size - 1, y + R); yy++) for (let xx = Math.max(0, x - R); xx <= Math.min(size - 1, x + R); xx++) {
            const i = yy * size + xx;
            if (P.prot[i]) continue;
            const dx = xx - x, dy = yy - y, a = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) * 16 % 16, q = Math.floor(a);
            const f = fac[q] + (fac[q + 1] - fac[q]) * (a - q);
            const rise = lfRise(W.table, Math.hypot(dx, dy) / f - Math.max(r0, 0.72));
            lfStamp(P, i, bed + rise + (rise > 0 ? lfBump(P, k, gx0 + xx, gy0 + yy) : 0));
        }
        return { floorRadius: Math.round(r0 * 10) / 10, radius: Math.round(Math.max(r0, 0.72) + W.reach) };
    }
    // Terraces on a hill flank: inside a disc, the floor steps up from the lowest ground by the distance (cells) from it;
    // no deeper than 2 strata per cell from the disc's edge. null when the disc has under 4 strata of relief.
    function lfTerrace(P, k, rng, x, y) {
        const s = k.style, R = s.r[0] + rng() * (s.r[1] - s.r[0]), Ri = Math.ceil(R), size = P.size, D = 2 * Ri + 1;
        let low = 255, high = 0;
        for (let yy = y - Ri; yy <= y + Ri; yy++) for (let xx = x - Ri; xx <= x + Ri; xx++) {
            if (xx < 0 || yy < 0 || xx >= size || yy >= size || Math.hypot(xx - x, yy - y) > R) continue;
            const t = P.top0[yy * size + xx];
            if (t < low) low = t;
            if (t > high) high = t;
        }
        if (high - low < 4) return null;
        const W = lfWallTable(s, high - low), dist = new Uint8Array(D * D).fill(255), q = [];
        for (let yy = y - Ri; yy <= y + Ri; yy++) for (let xx = x - Ri; xx <= x + Ri; xx++) {
            if (xx < 0 || yy < 0 || xx >= size || yy >= size || Math.hypot(xx - x, yy - y) > R) continue;
            if (P.top0[yy * size + xx] === low) { dist[(yy - y + Ri) * D + (xx - x + Ri)] = 0; q.push(xx, yy); }
        }
        for (let h = 0; h < q.length; h += 2) {
            const qx = q[h], qy = q[h + 1], dv = dist[(qy - y + Ri) * D + (qx - x + Ri)];
            for (let d = 0; d < 4; d++) {
                const nx = qx + DX4[d], ny = qy + DY4[d];
                if (nx < 0 || ny < 0 || nx >= size || ny >= size || Math.hypot(nx - x, ny - y) > R) continue;
                const li = (ny - y + Ri) * D + (nx - x + Ri);
                if (dist[li] > dv + 1) { dist[li] = dv + 1; q.push(nx, ny); }
            }
        }
        const gx0 = P.ax * size, gy0 = P.ay * size;
        for (let yy = y - Ri; yy <= y + Ri; yy++) for (let xx = x - Ri; xx <= x + Ri; xx++) {
            if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
            const r = Math.hypot(xx - x, yy - y), dv = dist[(yy - y + Ri) * D + (xx - x + Ri)];
            if (r > R || dv === 255) continue;
            const i = yy * size + xx, rise = lfRise(W.table, dv);
            lfStamp(P, i, Math.max(low + rise + (rise > 0 ? lfBump(P, k, gx0 + xx, gy0 + yy) : 0), P.top0[i] - 2 * Math.floor(R - r)));
        }
        return { radius: Math.round(R), low, high };
    }

    // Caves. A void is strata [lo, hi) of one column carved to air; the column must be solid from lo - 1 (the floor)
    // to hi (the roof) after the cuts, outside protection, and one cell of rock away from any other network.
    const lfSolidAfter = (P, i, g) => g < P.raiseTop[i] || (g < P.cutTop[i] && P.solid[P.col[i * 25 + g]] === 1);
    function lfStep(P, i, dir) {
        const x = (i % P.size) + DX4[dir], y = ((i / P.size) | 0) + DY4[dir];
        return x < 0 || y < 0 || x >= P.size || y >= P.size ? -1 : y * P.size + x;
    }
    function lfHost(P, i, lo, hi, id) {
        if (i < 0 || P.prot[i] || P.voidMark[i] || lo < 1 || hi > 24) return false;
        for (let g = lo - 1; g <= hi; g++) if (!lfSolidAfter(P, i, g)) return false;
        for (let d = 0; d < 4; d++) {
            const j = lfStep(P, i, d);
            if (j >= 0 && P.voidMark[j] && P.voidMark[j] !== id) return false;
        }
        return true;
    }
    function lfAddVoid(P, i, lo, hi, id, openBelow) {
        P.vI.push(i); P.vLo.push(lo); P.vHi.push(hi); P.vId.push(id); P.vOpen.push(openBelow ? 1 : 0);
        P.voidMark[i] = id;
    }
    // The tallest void from lo, up to `want` strata (a thinner roof gives a lower one, down to 4), or 0.
    function lfFit(P, i, lo, want, id) {
        for (let c = want; c >= 4; c--) if (lfHost(P, i, lo, lo + c, id)) return c;
        return 0;
    }
    function lfFitAny(P, i, lo0, lo1, id) {
        for (let lo = lo0; lo <= lo1; lo++) if (lfFit(P, i, lo, 4, id)) return true;
        return false;
    }
    function lfChamber(P, id, i, lo, c, r) {
        const size = P.size, x = i % size, y = (i / size) | 0, R = Math.ceil(r);
        let cells = 0;
        for (let yy = y - R; yy <= y + R; yy++) for (let xx = x - R; xx <= x + R; xx++) {
            if (xx < 0 || yy < 0 || xx >= size || yy >= size || Math.hypot(xx - x, yy - y) > r) continue;
            const j = yy * size + xx, h = lfFit(P, j, lo, c, id);
            if (h) { lfAddVoid(P, j, lo, lo + h, id); cells++; }
        }
        return cells;
    }
    // A passage: `len` cells from i0 heading dir (N E S W), turning now and then; its floor drifts within [lo0, lo1],
    // `c` strata tall where the rock allows; wide stretches, dead-end branches (sometimes ending in a chamber) and a
    // chamber at its end by chance. Returns the main line's cells in order.
    function lfPassage(P, id, rng, i0, dir, len, lo0, lo1, c, o) {
        const cells = [];
        let i = i0, lo = lo0;
        for (let k = 0; k < len && i >= 0; k++) {
            let h = lfFit(P, i, lo, c, id);
            for (let alt = lo0; !h && alt <= lo1; alt++) if (alt !== lo && (h = lfFit(P, i, alt, c, id))) lo = alt;
            if (!h) break;
            lfAddVoid(P, i, lo, lo + h, id);
            cells.push(i);
            if (o.wide && rng() < o.wide) {
                const sd = lfStep(P, i, (dir + (rng() < 0.5 ? 1 : 3)) & 3), hs = sd >= 0 ? lfFit(P, sd, lo, c, id) : 0;
                if (hs) lfAddVoid(P, sd, lo, lo + hs, id);
            }
            if (o.branch && rng() < o.branch) {
                const bd = (dir + (rng() < 0.5 ? 1 : 3)) & 3, b0 = lfStep(P, i, bd);
                if (b0 >= 0) {
                    const br = lfPassage(P, id, rng, b0, bd, 4 + Math.floor(rng() * 11), lo0, lo1, Math.max(4, c - 1), { wide: 0, branch: 0, chamber: 0.35 });
                    P.stats.branches++;
                    if (br.length) P.stats.deadEnds++;
                }
            }
            const r = rng();
            const nd = r < 0.74 ? dir : r < 0.87 ? (dir + 1) & 3 : (dir + 3) & 3;
            if (rng() < 0.12) lo = Math.max(lo0, Math.min(lo1, lo + (rng() < 0.5 ? -1 : 1)));
            let next = -1;
            for (let t = 0; t < 4 && next < 0; t++) {
                const dd = t === 0 ? nd : t === 1 ? dir : t === 2 ? (dir + 1) & 3 : (dir + 3) & 3, j = lfStep(P, i, dd);
                if (j >= 0 && lfFitAny(P, j, lo0, lo1, id)) { next = j; dir = dd; }
            }
            i = next;
        }
        if (cells.length && o.chamber && rng() < o.chamber) {
            if (lfChamber(P, id, cells[cells.length - 1], lo, c + 1 + Math.floor(rng() * 3), 1.6 + rng() * 2.0)) P.stats.chambers++;
        }
        return cells;
    }
    function lfNewFeature(P, code, extra) {
        const id = P.features.length;
        if (id > 254) return 0;
        const k = LF_KINDS[code];
        P.features.push(Object.assign({ id, kind: k.id, prim: k.prim }, extra));
        P.cur = id;
        return id;
    }
    // Mouth candidates: a column of rock at `top` (uncut, no crag unless crag) beside a column whose surface is one of
    // `outside` (the floor a walker comes from), in scan order; { i, dir } with dir pointing into the rock.
    function lfMouths(P, top, outside, crag) {
        const out = [], size = P.size;
        for (let i = 0; i < P.n; i++) {
            if (P.prot[i] || P.cutTop[i] !== 255 || (crag ? P.raiseTop[i] !== 25 : (P.raiseTop[i] !== 0 || P.top0[i] !== top))) continue;
            for (let d = 0; d < 4; d++) {
                const j = lfStep(P, i, (d + 2) & 3);
                if (j < 0 || P.prot[j] || P.raiseTop[j]) continue;
                const tj = Math.min(P.top0[j], P.cutTop[j]);
                if (outside.includes(tj)) { out.push(i, d); break; }
            }
        }
        return out;
    }
    // Pick up to `count` start cells from candidate pairs, at least `apart` cells from each other and from `taken`.
    function lfPick(P, rng, cand, count, apart, taken) {
        const picked = [], size = P.size, m = cand.length >> 1;
        for (let tries = 0; picked.length < count * 2 && tries < count * 12 && m; tries++) {
            const q = Math.floor(rng() * m), i = cand[q * 2], x = i % size, y = (i / size) | 0;
            if (taken.some(t => Math.hypot((t % size) - x, ((t / size) | 0) - y) < apart)) continue;
            picked.push(i, cand[q * 2 + 1]);
            taken.push(i);
        }
        return picked;
    }

    /**
     * The landform plan of an area for UF_Levels' generator 6 (pure; see the section comment). inp: { seed, ax, ay,
     * size, world: { seed, size, areasX, areasY, startArea }, cl (catalog climate), col (Uint8Array size * size * 25:
     * the generator 4 material byte of every stratum, read only), solid (Uint8Array 256: 1 for a solid material byte),
     * top0 (Uint8Array: each column's top), protect (Uint8Array: 1 = never carved: UF_Levels' pockets, cliff caves, the
     * start valley), biome1 / biome2 (Uint8Array: the geological biome index of -1 / -2), biomeIds (index -> id) }.
     * Returns { features (index = id, [0] null), cutTop (Uint8Array, 255 none: every stratum at or above it becomes air),
     * cutFeat, raiseTop (Uint8Array, 0 none: solid stone up to it), raiseFeat, voids { count, i, lo, hi, id, openBelow (1: a
     * shaft that opens down into a cave, no floor of its own) }, stats, ms }.
     */
    WorldGen.landformPlan = function(inp) {
        const t0 = now();
        const { seed, ax, ay, size, col, solid, top0 } = inp, n = size * size, cl = inp.cl, d = dims(inp.world);
        const gx0 = ax * size, gy0 = ay * size;
        const P = { seed, ax, ay, size, n, col, solid, top0, cur: 0, cutCells: 0,
            prot: new Uint8Array(n), distProt: new Uint8Array(n).fill(255), field: new Uint8Array(n).fill(255), owner: new Uint8Array(n),
            cutTop: null, raiseTop: new Uint8Array(n), raiseFeat: new Uint8Array(n), voidMark: new Uint8Array(n),
            vI: [], vLo: [], vHi: [], vId: [], vOpen: [], features: [null], stats: { slots: 0, rolled: 0, branches: 0, deadEnds: 0, chambers: 0, shafts: 0, openings: 0, voidsDropped: 0 } };

        // 1. Nothing is carved in UF_Levels' protected cells, within LF_EDGE of the area's edge, in or under water (sea,
        //    lakes, rivers, the pond) or peaks; landforms deepen by at most 2 strata per cell away from those.
        const wm = waterModels(inp.world), q = new Int32Array(n);
        let qt = 0;
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            const i = y * size + x, gx = gx0 + x, gy = gy0 + y;
            let p = inp.protect[i] || x < LF_EDGE || y < LF_EDGE || x >= size - LF_EDGE || y >= size - LF_EDGE || wm.isRiverOrPond(gx, gy);
            if (!p) {
                const f = fieldsFor(seed, d, cl, gx, gy);
                p = f.e < cl.seaLevel || f.e >= cl.peakLevel || isLake(seed, cl, f, gx, gy, d.width, d.height);
            }
            if (p) { P.prot[i] = 1; P.distProt[i] = 0; q[qt++] = i; }
        }
        for (let qh = 0; qh < qt; qh++) {
            const i = q[qh], dv = P.distProt[i];
            if (dv >= 8) continue;
            for (let dd = 0; dd < 4; dd++) {
                const j = lfStep(P, i, dd);
                if (j >= 0 && P.distProt[j] > dv + 1) { P.distProt[j] = dv + 1; q[qt++] = j; }
            }
        }

        // 2. Surface landforms: one roll per 32 x 32 slot, in slot order. Family from the climate at the anchor; the
        //    depth class (shallow 62 %, one band 24 %, Z-1 11.5 %, Z-2 2.5 %) from the slot's roll; the kind by the
        //    family's tendencies and the host stone; a class no kind of the family takes is lowered.
        const slots = Math.floor(size / LF_LATTICE);
        for (let ly = 0; ly < slots; ly++) for (let lx = 0; lx < slots; lx++) {
            if (P.cutCells > LF_COVER_MAX * n) break;
            P.stats.slots++;
            const rng = mulberry32(hash32(seed, LFS.slot, ax, ay, lx, ly));
            let x = Math.floor(lx * LF_LATTICE + 4 + rng() * (LF_LATTICE - 8)), y = Math.floor(ly * LF_LATTICE + 4 + rng() * (LF_LATTICE - 8));
            const x2 = Math.floor(lx * LF_LATTICE + 4 + rng() * (LF_LATTICE - 8)), y2 = Math.floor(ly * LF_LATTICE + 4 + rng() * (LF_LATTICE - 8));
            if (P.prot[y * size + x] || P.distProt[y * size + x] < 3) { x = x2; y = y2; }   // a second anchor in the slot
            const i = y * size + x;
            const f = fieldsFor(seed, d, cl, gx0 + x, gy0 + y), fam = lfFamily(cl, f);
            if (rng() >= LF_SLOT_P[fam] || P.prot[i] || P.distProt[i] < 3) continue;
            const host = surfaceStoneId(seed, d, cl, gx0 + x, gy0 + y), rim = top0[i];
            const u = rng();
            let klass = u < LF_CLASS_P[0] ? 0 : u < LF_CLASS_P[1] ? 1 : u < LF_CLASS_P[2] ? 2 : 3;
            const pick = rng(), shape = rng();
            let code = 0;
            for (; klass >= 0 && !code; klass--) {
                const bit = 1 << klass, list = [];
                let total = 0;
                for (let c = 1; c < LF_KINDS.length; c++) {
                    const k = LF_KINDS[c];
                    if (!(k.classes & bit) || !k.w.some(v => v > 0) || k.prim === "opening") continue;
                    const w = (k.w[fam] + 0.1) * (k.host === host ? 2 : 1);
                    list.push(c, w);
                    total += w;
                }
                let r = pick * total;
                for (let e = 0; e < list.length && !code; e += 2) if ((r -= list[e + 1]) <= 0) code = list[e];
                if (!code && list.length) code = list[list.length - 2];
            }
            klass++;
            // Floors: shallow 1-3 strata under the rim; one band 4-6 under it but no lower than -1 S2 (top 7: in a valley a
            // one-band cut stops 4 ft down); Z-1 on -1 S0..S1 (top 5-6, 5-6 ft under the ground); Z-2 on -2 S0..S2 (top 1-3).
            const bed = klass === 0 ? rim - 1 - Math.floor(shape * 3) : klass === 1 ? Math.max(7, rim - 4 - Math.floor(shape * 3))
                : klass === 2 ? 5 + Math.floor(shape * 2) : 1 + Math.floor(shape * 3);
            if (!code || bed >= rim || bed < 1) continue;
            const k = LF_KINDS[code], id = lfNewFeature(P, code, { family: LF_FAMILIES[fam], host, planned: LF_CLASSES[klass], anchor: { x, y }, rim, bed });
            if (!id) break;
            const geo = k.prim === "channel" ? lfChannel(P, k, rng, x, y, rim, bed) : k.prim === "arc" ? lfArc(P, k, rng, x, y, rim, bed)
                : k.prim === "bowl" ? lfBowl(P, k, rng, x, y, rim, bed) : lfTerrace(P, k, rng, x, y);
            if (!geo) { P.features.pop(); continue; }
            Object.assign(P.features[id], geo);
            P.stats.rolled++;
        }

        // 3. The cut: the field, no deeper than 2 strata per cell from protection, never below -2 S0. A cut that would
        //    remove the whole roof of a cave below it (a generator 4 hall, a pool's cavern) opens that cave only when the
        //    landform is that deep: a shallow or one-band landform keeps one stratum of roof; a Z-1 landform may open a
        //    cave whose floor is on -1, not deeper; a Z-2 landform or a collapse opening any.
        const floorLevelOf = top => Math.floor(top / 5) - 2;
        const finishCut = () => {
            const cutTop = new Uint8Array(n).fill(255), cutFeat = new Uint8Array(n);
            for (let i = 0; i < n; i++) {
                let F = P.field[i];
                if (F >= top0[i]) continue;
                if (P.distProt[i] < 8) F = Math.max(F, top0[i] - 2 * P.distProt[i]);
                if (F < 1) F = 1;
                const f = P.features[P.owner[i]], o = i * 25;
                if (F < top0[i] && solid[col[o + F - 1]] !== 1) {
                    let a = F - 1;                                   // the cut opens a cave: its floor and roof
                    while (a >= 0 && solid[col[o + a]] !== 1) a--;
                    let r = F - 1;
                    while (r < 25 && solid[col[o + r]] !== 1) r++;
                    const deepest = !f ? -2 : f.prim === "opening" || f.planned === "z-2" ? -2 : f.planned === "z-1" ? -1 : 3;
                    if (floorLevelOf(a + 1) < deepest) F = r + 1;     // not that deep: keep the roof's lowest stratum
                }
                if (F >= top0[i]) continue;
                cutTop[i] = F;
                cutFeat[i] = P.owner[i];
            }
            P.cutTop = cutTop;
            P.cutFeat = cutFeat;
        };
        finishCut();

        // 4. Summit crags: 1-2 small blobs of +2 summit (top 21) raised to the top of the world (+2 S4), inside uncut
        //    summit ground; they host the +2 caves (a +2 cave's roof is the crag's own top stratum: section Z+2 cap).
        const rngC = mulberry32(hash32(seed, LFS.crag, ax, ay));
        const summitOk = (x, y, r) => {
            for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) {
                if (xx < 0 || yy < 0 || xx >= size || yy >= size) return false;
                const j = yy * size + xx;
                if (top0[j] !== 21 || P.cutTop[j] !== 255 || P.prot[j]) return false;
            }
            return true;
        };
        const cragCand = [];
        for (let y = LF_EDGE; y < size - LF_EDGE; y += 6) for (let x = LF_EDGE; x < size - LF_EDGE; x += 6) if (summitOk(x, y, 5)) cragCand.push(y * size + x, 0);
        const cragCount = 1 + (rngC() < 0.6 ? 1 : 0), crags = lfPick(P, rngC, cragCand, cragCount, 30, []);
        for (let c = 0; c < crags.length; c += 2) {
            const ci = crags[c], x = ci % size, y = (ci / size) | 0, rr = 2.4 + rngC() * 1.8, ph = rngC() * 6.283;
            const id = lfNewFeature(P, LF_CODE.get("summit_crag"), { family: LF_FAMILIES[lfFamily(cl, fieldsFor(seed, d, cl, gx0 + x, gy0 + y))], host: surfaceStoneId(seed, d, cl, gx0 + x, gy0 + y), anchor: { x, y }, radius: Math.round(rr * 10) / 10 });
            if (!id) break;
            let cells = 0;
            for (let yy = y - 5; yy <= y + 5; yy++) for (let xx = x - 5; xx <= x + 5; xx++) {
                const a = Math.atan2(yy - y, xx - x), r = Math.hypot(xx - x, yy - y) / (1 + 0.28 * Math.sin(a * 3 + ph));
                if (r > rr) continue;
                const j = yy * size + xx;
                P.raiseTop[j] = 25; P.raiseFeat[j] = id; cells++;
            }
            P.features[id].cells = cells;
        }

        // 5. Cave networks, each from its own seeded stream, in this order: hill caves (Z0, in +1/+2 rock beside the
        //    ground), massif caves (+1, in +2 summit rock beside a +1 hilltop), crag caves (+2), upper caves (-1, from a
        //    -1 hall; a lava tube under volcanic ground), deep caves (-2, from a -2 hall), one descending network (rare).
        const caveRng = s => mulberry32(hash32(seed, LFS.cave, ax, ay, s));
        const taken = [];
        const addNetwork = (code, rng, start, dir, len, lo0, lo1, c, o, extra) => {
            const x = start % size, y = (start / size) | 0;
            const id = lfNewFeature(P, code, Object.assign({ family: LF_FAMILIES[lfFamily(cl, fieldsFor(seed, d, cl, gx0 + x, gy0 + y))], anchor: { x, y } }, extra));
            if (!id) return null;
            const cells = lfPassage(P, id, rng, start, dir, len, lo0, lo1, c, o);
            if (!cells.length) { P.features.pop(); return null; }
            P.features[id].mainLine = cells.length;
            return { id, cells };
        };
        {   // Z0
            const rng = caveRng(0), cand = lfMouths(P, 16, [10, 11], false).concat(lfMouths(P, 21, [10, 11], false));
            const starts = lfPick(P, rng, cand, 3 + (rng() < 0.5 ? 1 : 0), 24, taken);
            for (let s = 0; s < starts.length; s += 2) {
                const i = starts[s];
                addNetwork(LF_CODE.get("hill_cave"), rng, i, starts[s + 1], 16 + Math.floor(rng() * 22), 10, 11, top0[i] >= 21 ? 7 : 5,
                    { wide: 0.25, branch: 0.14, chamber: 0.6 }, { host: surfaceStoneId(seed, d, cl, gx0 + i % size, gy0 + ((i / size) | 0)), level: 0 });
            }
        }
        {   // +1
            const rng = caveRng(1), starts = lfPick(P, rng, lfMouths(P, 21, [15, 16], false), 1 + (rng() < 0.5 ? 1 : 0), 24, taken);
            for (let s = 0; s < starts.length; s += 2) {
                const i = starts[s];
                addNetwork(LF_CODE.get("massif_cave"), rng, i, starts[s + 1], 10 + Math.floor(rng() * 14), 15, 16, 5,
                    { wide: 0.2, branch: 0.1, chamber: 0.5 }, { host: surfaceStoneId(seed, d, cl, gx0 + i % size, gy0 + ((i / size) | 0)), level: 1 });
            }
        }
        {   // +2
            const rng = caveRng(2), starts = lfPick(P, rng, lfMouths(P, 25, [21], true), 1, 0, taken);
            for (let s = 0; s < starts.length; s += 2) {
                const i = starts[s];
                addNetwork(LF_CODE.get("crag_cave"), rng, i, starts[s + 1], 3 + Math.floor(rng() * 5), 20, 20, 4,
                    { wide: 0.3, branch: 0, chamber: 0.5 }, { host: surfaceStoneId(seed, d, cl, gx0 + i % size, gy0 + ((i / size) | 0)), level: 2, cap: "the crag's +2 S4 stratum" });
            }
        }
        const hallBeside = (lvl) => {   // rock columns beside a hall floor of level -1 (lvl 5) or -2 (lvl 0), uncut
            const out = [];
            for (let i = 0; i < n; i++) {
                if (P.prot[i] || P.cutTop[i] !== 255 || !solid[col[i * 25 + lvl + 1]]) continue;   // rock, not the hall itself
                for (let dd = 0; dd < 4; dd++) {
                    const j = lfStep(P, i, dd);
                    if (j >= 0 && P.cutTop[j] === 255 && solid[col[j * 25 + lvl]] && !solid[col[j * 25 + lvl + 1]]) { out.push(i, (dd + 2) & 3); break; }
                }
            }
            return out;
        };
        const tubes = [], karst = [];
        {   // -1
            const rng = caveRng(3), starts = lfPick(P, rng, hallBeside(5), 3, 28, taken);
            for (let s = 0; s < starts.length; s += 2) {
                const i = starts[s], x = i % size, y = (i / size) | 0;
                const volcanic = lfFamily(cl, fieldsFor(seed, d, cl, gx0 + x, gy0 + y)) === 4;
                const stone = volcanic ? "basalt" : undergroundStoneId(seed, inp.biomeIds[inp.biome1[i]] || "", gx0 + x, gy0 + y, -1);
                const net = volcanic
                    ? addNetwork(LF_CODE.get("lava_tube"), rng, i, starts[s + 1], 40 + Math.floor(rng() * 40), 5, 6, 6, { wide: 0.5, branch: 0.04, chamber: 0.2 }, { host: stone, level: -1 })
                    : addNetwork(LF_CODE.get("upper_cave"), rng, i, starts[s + 1], 18 + Math.floor(rng() * 26), 5, 6, 6, { wide: 0.25, branch: 0.16, chamber: 0.5 }, { host: stone, level: -1 });
                if (net && volcanic) tubes.push(net);
                else if (net && stone === "limestone") karst.push(net);
            }
        }
        {   // -2
            const rng = caveRng(4), starts = lfPick(P, rng, hallBeside(0), 2, 28, taken);
            for (let s = 0; s < starts.length; s += 2) {
                const i = starts[s];
                addNetwork(LF_CODE.get("deep_cave"), rng, i, starts[s + 1], 16 + Math.floor(rng() * 24), 1, 2, 7,
                    { wide: 0.25, branch: 0.16, chamber: 0.5 }, { host: undergroundStoneId(seed, inp.biomeIds[inp.biome2[i]] || "", gx0 + i % size, gy0 + ((i / size) | 0), -2), level: -2 });
            }
        }
        {   // A descending network (about half the areas): a hill cave that slopes down one stratum per cell into -1,
            // runs on, and may slope on down into a chamber at -2; beside its -1 run, a shaft from -2 to the passage roof.
            const rng = caveRng(5);
            if (rng() < 0.55) {
                const starts = lfPick(P, rng, lfMouths(P, 16, [10, 11], false).concat(lfMouths(P, 21, [10, 11], false)), 1, 24, taken);
                if (starts.length) {
                    const i0 = starts[0];
                    let dir = starts[1];
                    const id = lfNewFeature(P, LF_CODE.get("descending_cave"), { family: LF_FAMILIES[lfFamily(cl, fieldsFor(seed, d, cl, gx0 + i0 % size, gy0 + ((i0 / size) | 0)))],
                        host: surfaceStoneId(seed, d, cl, gx0 + i0 % size, gy0 + ((i0 / size) | 0)), anchor: { x: i0 % size, y: (i0 / size) | 0 }, level: 0 });
                    const flat = 4 + Math.floor(rng() * 5), run1 = 6 + Math.floor(rng() * 9), deeper = rng() < 0.7;
                    const plan = [];
                    for (let k = 0; k < flat; k++) plan.push(10);
                    for (let lo = 9; lo >= 5; lo--) plan.push(lo);
                    for (let k = 0; k < run1; k++) plan.push(k < run1 / 2 ? 5 : 6);
                    if (deeper) { plan.push(5); for (let lo = 4; lo >= 1; lo--) plan.push(lo); }
                    const cells = [];
                    let i = i0, lowest = 10;
                    for (let k = 0; k < plan.length && i >= 0; k++) {
                        const lo = plan[k], h = lfFit(P, i, lo, 6, id);
                        if (h < 5) break;
                        lfAddVoid(P, i, lo, lo + h, id);
                        cells.push(i);
                        lowest = Math.min(lowest, lo);
                        if (k + 1 >= plan.length) break;
                        const r = rng(), nd = r < 0.8 ? dir : r < 0.9 ? (dir + 1) & 3 : (dir + 3) & 3;
                        let next = -1;
                        for (let t = 0; t < 3 && next < 0; t++) {
                            const dd = t === 0 ? nd : t === 1 ? dir : (nd === dir ? (dir + 1) & 3 : nd), j = lfStep(P, i, dd);
                            if (j >= 0 && lfFit(P, j, plan[k + 1], 5, id) >= 5) { next = j; dir = dd; }
                        }
                        i = next;
                    }
                    if (!cells.length) P.features.pop();
                    else {
                        if (lowest <= 2) { if (lfChamber(P, id, cells[cells.length - 1], lowest, 6, 2.2)) P.stats.chambers++; }
                        // The shaft: a side column of the -1 run, open from -2 S1 to the passage's roof, with a small chamber at
                        // its foot on -2.
                        for (let k = flat + 5; k < cells.length && !P.features[id].shaft; k++) {
                            const pi = cells[k], vi = P.vI.lastIndexOf(pi), top = vi >= 0 ? P.vHi[vi] : 0;
                            if (!top || P.vLo[vi] > 6) continue;
                            for (let side = 1; side <= 3 && !P.features[id].shaft; side += 2) {
                                const sd = lfStep(P, pi, (dir + side) & 3);
                                if (sd < 0 || P.prot[sd] || P.voidMark[sd] || !lfSolidAfter(P, sd, top)) continue;
                                let g = top - 1;
                                while (g >= 1 && lfSolidAfter(P, sd, g)) g--;
                                const from = g + 1;                                // 1: down to bedrock; else into the cave below
                                if (from > 4 || top - from < 6) continue;
                                let apart = true;
                                for (let dd = 0; dd < 4; dd++) { const j = lfStep(P, sd, dd); if (j >= 0 && P.voidMark[j] && P.voidMark[j] !== id) apart = false; }
                                if (!apart) continue;
                                lfAddVoid(P, sd, from, top, id, from > 1);
                                if (from === 1) lfChamber(P, id, sd, 1, 4, 2.0);
                                P.features[id].shaft = { x: sd % size, y: (sd / size) | 0, from, to: top, intoCave: from > 1 };
                                P.stats.shafts++;
                            }
                        }
                        Object.assign(P.features[id], { mainLine: cells.length, lowestFloor: lowest });
                    }
                }
            }
        }

        // 6. Openings: a lava tube's roof has fallen in at 1-3 places, a limestone cave now and then (40 %) at one: a pit
        //    from the surface down to the passage floor (a steep bowl). Every void is checked again against the final cut.
        const rngO = mulberry32(hash32(seed, LFS.open, ax, ay));
        const opening = (net, code, count) => {
            const cells = net.cells, stepK = Math.floor(cells.length / (count + 1));
            for (let o = 1; o <= count && stepK >= 4; o++) {
                const ci = cells[o * stepK], vi = P.vI.indexOf(ci);
                if (vi < 0 || P.distProt[ci] < 4 || top0[ci] > 16) continue;
                const x = ci % size, y = (ci / size) | 0, rim = top0[ci], bed = P.vLo[vi];
                const id = lfNewFeature(P, code, { family: P.features[net.id].family, host: P.features[net.id].host, planned: "z-1", anchor: { x, y }, rim, bed, network: net.id });
                if (!id) return;
                Object.assign(P.features[id], lfBowl(P, LF_KINDS[code], rngO, x, y, rim, bed));
                P.stats.openings++;
            }
        };
        for (const t of tubes) opening(t, LF_CODE.get("lava_tube_collapse"), 1 + Math.floor(rngO() * 3));
        for (const kn of karst) if (rngO() < 0.4) opening(kn, LF_CODE.get("karst_window"), 1);
        finishCut();
        const vCount = P.vI.length, vi = new Int32Array(vCount), vlo = new Uint8Array(vCount), vhi = new Uint8Array(vCount), vid = new Uint8Array(vCount), vopen = new Uint8Array(vCount);
        let kept = 0;
        for (let v = 0; v < vCount; v++) {
            const i = P.vI[v], lo = P.vLo[v], hi = P.vHi[v];
            let ok = true;
            for (let g = P.vOpen[v] ? lo : lo - 1; g <= hi && ok; g++) if (!lfSolidAfter(P, i, g)) ok = false;
            if (!ok) { P.stats.voidsDropped++; continue; }
            vi[kept] = i; vlo[kept] = lo; vhi[kept] = hi; vid[kept] = P.vId[v]; vopen[kept] = P.vOpen[v]; kept++;
        }
        for (const f of P.features) if (f) Object.freeze(f);
        return {
            gen: 6, features: P.features, cutTop: P.cutTop, cutFeat: P.cutFeat, raiseTop: P.raiseTop, raiseFeat: P.raiseFeat,
            voids: { count: kept, i: vi.subarray(0, kept), lo: vlo.subarray(0, kept), hi: vhi.subarray(0, kept), id: vid.subarray(0, kept), openBelow: vopen.subarray(0, kept) },
            stats: P.stats, ms: now() - t0
        };
    };
    WorldGen.LANDFORM_KINDS = Object.freeze(LF_KINDS.map(k => (k ? k.id : "")));
    WorldGen.LANDFORM_CLASSES = LF_CLASSES;
    /** The landform family (TEMP, WET, ARID, HIGH, VOLC) of climate fields (fieldsFor). */
    WorldGen.landformFamily = f => LF_FAMILIES[lfFamily(catalog().climate, f)];

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
        const z = ctx.z !== undefined ? ctx.z : 0;
        const wm = waterModels(state);
        if (z === 0 && window.UF.Tiles && UF.Tiles.TILESET_ID) ctx.map.tilesetId = UF.Tiles.TILESET_ID;

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
        // Neighbors outside this area come from the same pure function, wrapping around the toroidal world.
        const outside = new Map();
        const probe = (x, y) => {
            const wx = ((gx0 + x) % d.width + d.width) % d.width;
            const wy = ((gy0 + y) % d.height + d.height) % d.height;
            const key = wy * 4096 + wx;
            let p = outside.get(key);
            if (!p) {
                const c = resolve(seed, d, m, wm, wx, wy, {});
                p = { g: c.g, w: c.w };
                outside.set(key, p);
            }
            return p;
        };
        const inside = (x, y) => x >= 0 && y >= 0 && x < size && y < size;
        const groundAt = (x, y) => {
            if (d.areasX === 1 && d.areasY === 1) {
                const wx = ((x % size) + size) % size;
                const wy = ((y % size) + size) % size;
                return ground[wy * size + wx];
            }
            return inside(x, y) ? ground[y * size + x] : probe(x, y).g;
        };
        const waterAt = (x, y) => {
            if (d.areasX === 1 && d.areasY === 1) {
                const wx = ((x % size) + size) % size;
                const wy = ((y % size) + size) % size;
                return water[wy * size + wx] !== 0;
            }
            return inside(x, y) ? water[y * size + x] !== 0 : probe(x, y).w !== 0;
        };

        // 2. Tiles: water autotiles join any water; ground autotiles join the same ground kind (biome borders get outlines).
        // Painted by uf_worldgen on z = 0 only (paintLevel owns levels other than ground).
        // Column invariant (DEUS-TSK-FABLE-16, owner directive 2026-09-24): where UF_Levels says the ground cell is solid
        // (the surface is at +1 or +2 above it), the cell is the rock face, impassable, never grass or water; a cell dug
        // or carved inside a hill (cave mouths) is bare rock floor. Everything else is painted as before.
        const col = z === 0 ? groundColumns(ctx.areaX, ctx.areaY, false) : null; // null: a save from before the column levels (gen < 4)
        const volume = { solid: 0, holes: 0, carved: 0, ramps: 0, groundReplaced: 0, waterSuppressed: 0, sitePiecesSkipped: 0 };
        if (z === 0) {
            const P = groundPalette(cat, m);
            const R = columnReader(col, size, d, gx0, gy0, {
                kind: (x, y) => groundAt(x, y),
                wet: (x, y) => {
                    if (d.areasX === 1 && d.areasY === 1) return water[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
                    return inside(x, y) ? water[y * size + x] : probe(x, y).w;
                },
                peak: (x, y) => inside(x, y) && (flags[y * size + x] & FLAG_PEAK) !== 0
            }, P);
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const i = y * size + x;
                    const t = paintGround(x, y, R, P);
                    ctx.setTile(x, y, 0, t.layer0);
                    if (t.layer2) ctx.setTile(x, y, 2, t.layer2);
                    if (t.region) ctx.setTile(x, y, 5, t.region);
                    if (t.solid || t.hole) {
                        if (t.solid) volume.solid++;
                        else volume.holes++;
                        if (water[i]) volume.waterSuppressed++;
                        else volume.groundReplaced++;
                    } else if (t.carved || t.ramp) {
                        if (t.carved) volume.carved++;
                        else volume.ramps++;
                        if (water[i]) volume.waterSuppressed++;
                    }
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
        if (z === 0 && start) {
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
        const L = window.UF && UF.Levels;
        const lfCutWorld = !!(L && typeof L.levelGenerator === "function" && L.levelGenerator(z) >= 6 && typeof L.shapeCodeAt === "function");
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = y * size + x;
                const gx = gx0 + x, gy = gy0 + y;
                biomeCells[m.biomeIds[biome[i]]] = (biomeCells[m.biomeIds[biome[i]]] || 0) + 1;
                if (objects[i] || (siteMask && siteMask[i]) || (start && inClearing(x, y)) || ctx.isTemplateCell(x, y)) continue;
                if (flags[i] & FLAG_PEAK) continue;
                // Anchor surface objects to actual surface elevation (S === z)
                if (L && typeof L.surfaceElevationAt === "function") {
                    const S = L.surfaceElevationAt(gx, gy, seed);
                    if (S !== z) continue;
                } else if (z !== 0) continue;
                const isRamp = L && (typeof L.shapeCodeAt === "function" ? L.shapeCodeAt(ctx.areaX, ctx.areaY, x, y, z) === 4 : (typeof L.shapeAt === "function" && (L.shapeAt(ctx.areaX, ctx.areaY, x, y, z) === "ramp" || L.shapeAt(ctx.areaX, ctx.areaY, x, y, z) === 4)));
                if (isRamp) continue; // Don't place on ramps
                if (lfCutWorld && L.shapeCodeAt(ctx.areaX, ctx.areaY, x, y, z) !== 2) continue; // generator 6: only on a floor (not over a cut, not on a cave's roof edge)
                const table = plantTable(m, biome[i], m.alignTiers[align[i]].id);
                const list = water[i] ? table.water : table.land;
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
        if (z === 0) {
            for (const s of sites) {
                for (const piece of s.pieces || []) {
                    const o = m.objectById.get(piece.object);
                    if (!o || !inside(s.x + piece.dx, s.y + piece.dy)) continue;
                    // Never inside a hill or over a hole: a piece whose ground cell is solid rock or open is left out (counted).
                    if (col && (col.code((s.y + piece.dy) * size + s.x + piece.dx) === 1 || col.code((s.y + piece.dy) * size + s.x + piece.dx) === 3)) { volume.sitePiecesSkipped++; continue; }
                    ctx.setObject(s.x + piece.dx, s.y + piece.dy, o.typeId);
                    counts[piece.object] = (counts[piece.object] || 0) + 1;
                }
            }
        }

        // 6. The kit (start.kit): minimum resources within reach of every faction's campfire (VISION V67, 2026-09-19:
        //    every band has what its first buildings, tools, clothes and meals need at hand), whatever the biome rolled.
        //    Placed on free land in the ring radius[0]..radius[1], never in a site disc (so never on a camp's nine cells).
        //    Without factions, or for a save made before 2026-09-19, around the start as before.
        const kit = cat.start && cat.start.kit ? WorldGen.kitConfig() : null;
        const kitCentres = kit && !ctx.templateRect ? WorldGen.kitCentres(ctx.areaX, ctx.areaY, z) : [];
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
                        const gx = ctx.areaX * size + x, gy = ctx.areaY * size + y;
                        if (L && typeof L.surfaceElevationAt === "function") {
                            const S = L.surfaceElevationAt(gx, gy, seed);
                            if (S !== z) continue;
                        } else if (z !== 0) continue;
                        const isRamp = L && (typeof L.shapeCodeAt === "function" ? L.shapeCodeAt(ctx.areaX, ctx.areaY, x, y, z) === 4 : (typeof L.shapeAt === "function" && (L.shapeAt(ctx.areaX, ctx.areaY, x, y, z) === "ramp" || L.shapeAt(ctx.areaX, ctx.areaY, x, y, z) === 4)));
                        if (isRamp) continue;
                        if (lfCutWorld && L.shapeCodeAt(ctx.areaX, ctx.areaY, x, y, z) !== 2) continue; // generator 6: only on a floor
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
        if (z === 0) WorldGen.volumeStats[`${ctx.areaX},${ctx.areaY}`] = Object.assign({ columns: !!col }, volume);
        WorldGen.lastBuild = { area: { x: ctx.areaX, y: ctx.areaY }, ms: now() - started, objects: total, biomes: biomeCells, sites: sites.length };
    }

    // Underground content uses the underground shape grid, never surface climate, clearing or water.
    // Cave flora has its own depth tables; stock cave art remains a placeholder until original assets are approved.
    function generateUnderground(ctx) {
        const W = window.UF.World, L = window.UF.Levels, cat = catalog(), m = compiled();
        if (!W || !W.state || !L || !cat || !m || (ctx.z !== -1 && ctx.z !== -2)) return;
        const size = ctx.width, cells = size * size, seed = W.state.seed;
        const area = { x: ctx.areaX, y: ctx.areaY, z: ctx.z };
        const dry = new Uint8Array(cells), water = new Uint8Array(cells), biomes = new Array(cells), counts = {}, kitLog = [];
        const kit = WorldGen.undergroundKitConfig(ctx.z), r1 = kit.radius[1] || 20;
        const ref = { area, x: 0, y: 0, z: ctx.z };
        for (let i = 0; i < cells; i++) {
            ref.x = i % size; ref.y = Math.floor(i / size);
            const c = L.cellAt(ref);
            dry[i] = c && !c.water && L.standableShape(ref) ? 1 : 0;
            water[i] = c && c.water ? 1 : 0;
            biomes[i] = c && c.biome ? c.biome.id : null;
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
        // Natural vegetation exists in uninhabited pockets too. Depth, world coordinates and plant ID seed it;
        // neither settlement order nor the currently displayed map changes the result.
        const nearWater = (i, radius) => {
            const x = i % size, y = Math.floor(i / size);
            for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx, ny = y + dy;
                if (dx * dx + dy * dy <= radius * radius && nx >= 0 && ny >= 0 && nx < size && ny < size && water[ny * size + nx]) return true;
            }
            return false;
        };
        for (let i = 0; i < cells; i++) {
            if (!dry[i] || siteMask[i] || ctx.objects[i]) continue;
            for (const p of kit.natural) {
                if (p.biomes && !p.biomes.includes(biomes[i])) continue;
                if (p.nearWater > 0 && !nearWater(i, p.nearWater)) continue;
                const gx = ctx.areaX * size + i % size, gy = ctx.areaY * size + Math.floor(i / size);
                if (unit(seed, SALT.kit ^ hashString(p.id), ctx.z, gx, gy) >= p.chance) continue;
                const o = m.objectById.get(p.id);
                ctx.objects[i] = o.typeId;
                counts[p.id] = (counts[p.id] || 0) + 1;
                break;
            }
        }
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
        UF.World.registerGenerator("uf_worldgen", generate, 10, { levels: [0, 1, 2] });
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

            const W = UF.World;
            if (window.UF && UF.Levels && typeof UF.Levels.view === "function" && UF.Levels.view() !== 0) {
                UF.Levels.setView(0);
                await t.waitUntil(() => !!(W && W.currentArea && W.currentArea()), 10000, "Ground view for worldgen checks").catch(() => {});
            }
            const st = W.state, a = st.startArea, size = st.size, mid = Math.floor(size / 2);
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
            const wantCentres = window.UF.Factions && UF.World.state.factions ? UF.World.state.factions.list.filter(f => {
                if (f.species === "dwarf") return false;
                const h = f.home;
                if (!h || !h.area) return false;
                const hz = h.z === undefined ? (h.area.z === undefined ? 0 : h.area.z) : h.z;
                return h.area.x === a.x && h.area.y === a.y && hz === 0;
            }).length : kitCentres.length;
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
                const groundFactionsN = window.UF.Factions && UF.World.state.factions ? UF.World.state.factions.list.filter(f => !f.species || f.species !== "dwarf").length : factionCount();
                const bareWanted = UF.World.state.history && UF.World.state.history.founders ? groundFactionsN : bare;
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
