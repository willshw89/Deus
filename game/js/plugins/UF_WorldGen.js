//=============================================================================
// UF_WorldGen.js - Catalog-driven generation for UF_World areas
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF WorldGen] Builds UF_World areas from data/UF_WorldCatalog.json: ground, one continuous river, trees, rocks.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_World
 *
 * @help
 * Reads data/UF_WorldCatalog.json at boot. Adding art to the world takes no
 * code: add the image and a catalog entry
 * (docs/handoffs/HANDOFF_world_generation.md).
 *
 * Everything is computed from world coordinates and the world seed, so
 * areas are identical every time they're built, and the river and object
 * patches continue across area edges.
 *
 * API and checks: docs/systems/UF_WorldGen.md
 * Replaced core methods: none.
 */

(() => {
    "use strict";

    const CATALOG_VAR = "$ufWorldCatalog";
    if (!DataManager.isBattleTest() && !DataManager.isEventTest()) {
        DataManager._databaseFiles.push({ name: CATALOG_VAR, src: "UF_WorldCatalog.json" });
    }

    //-------------------------------------------------------------------------
    // Deterministic noise (order-independent: every value comes from coordinates + seed)

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
        h ^= h >>> 15;
        h = Math.imul(h, 0x2c1b3c6d) >>> 0;
        h ^= h >>> 12;
        return h >>> 0;
    }
    const hashString = s => {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
        return h;
    };
    const unit = (...parts) => hash32(...parts) / 4294967296;
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const smooth = t => t * t * (3 - 2 * t);
    const smoothstep = (a, b, v) => smooth(clamp01((v - a) / (b - a)));

    function valueNoise(seed, salt, gx, gy, scale) {
        const fx = gx / scale, fy = gy / scale;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const tx = smooth(fx - ix), ty = smooth(fy - iy);
        const a = unit(seed, salt, ix, iy), b = unit(seed, salt, ix + 1, iy);
        const c = unit(seed, salt, ix, iy + 1), d = unit(seed, salt, ix + 1, iy + 1);
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
    const autotileBase = tileId => tileId - ((tileId - Tilemap.TILE_ID_A1) % 48);
    const isKind = (tileId, base) => tileId >= base && tileId < base + 48;

    //-------------------------------------------------------------------------
    // Public object

    const WorldGen = {
        catalog: () => window[CATALOG_VAR] || null,
        autotileShape,
        autotileShapeCount: () => {
            autotileShape(() => true);
            return shapeLookup.size;
        },
        stats: {} // "ax,ay" -> { objectId: count }, from the last build of each area
    };
    window.UF = window.UF || {};
    window.UF.WorldGen = WorldGen;

    //-------------------------------------------------------------------------
    // The river: one north-south river through the whole world, in world coordinates

    WorldGen.riverModel = function(state) {
        const cat = this.catalog();
        const r = cat && cat.river;
        if (!r || !r.enabled || !window.UF.World) return null;
        const W = UF.World, size = state.size, start = state.startArea;
        const tpl = W.template(), off = W.templateOffset();
        const water = cat.terrain && cat.terrain.water;
        let anchorX = null, anchorY = null;
        if (tpl) {
            const waterBase = water ? autotileBase(water.tileId) : -1;
            let sx = 0, sy = 0, n = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (let y = 0; y < tpl.height; y++) {
                for (let x = 0; x < tpl.width; x++) {
                    const t0 = tpl.data[y * tpl.width + x];
                    if (waterBase >= 0 && isKind(t0, waterBase)) { sx += x; sy += y; n++; }
                    if (W.templatePaints(x + off.x, y + off.y)) {
                        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                    }
                }
            }
            if (n > 0) {
                anchorX = start.x * size + off.x + sx / n;
                anchorY = start.y * size + off.y + sy / n;
            } else if (maxX >= 0) {
                anchorX = start.x * size + off.x + maxX + 1 + (r.offsetFromGlade || 0) + (r.halfWidth || 0);
                anchorY = start.y * size + off.y + (minY + maxY) / 2;
            }
        }
        const hw = r.halfWidth || 0;
        const period = r.meanderPeriodCells || 97;
        const amp = r.meanderCells || 0;
        const phase = unit(state.seed, 0x7e11) * Math.PI * 2;
        const mid = Math.floor(size / 2);
        const startGX = start.x * size + mid, startGY = start.y * size + mid;
        const make = (ax, ay, straight) => {
            const center = gy => {
                const d = gy - ay;
                const env = straight > 0 ? clamp01((Math.abs(d) - straight) / 32) : 1;
                return ax + amp * env * (0.7 * Math.sin((2 * Math.PI * d) / period + phase) + 0.3 * Math.sin((2 * Math.PI * d) / (period * 0.43) + 2 * phase));
            };
            return { anchorX: ax, anchorY: ay, halfWidth: hw, center, isWater: (gx, gy) => Math.abs(gx - Math.round(center(gy))) <= hw };
        };
        // An editor template with water: the river joins it and runs straight through it.
        if (anchorX !== null) return make(anchorX, anchorY, 24);
        // Otherwise a random place in the world each game, never through the start.
        const keep = r.keepAwayFromStart || 14;
        const worldWidth = state.areasX * size;
        for (let i = 0; i < 60; i++) {
            const m = make(Math.floor(unit(state.seed, 0x21e5, i) * worldWidth), startGY, 0);
            let clear = true;
            for (let dy = -keep; dy <= keep && clear; dy += 2) {
                if (Math.abs(Math.round(m.center(startGY + dy)) - startGX) <= keep + hw) clear = false;
            }
            if (clear) return m;
        }
        return make(startGX + keep * 3, startGY, 0);
    };

    /** A pond at a random direction and distance from the start (catalog start.pond), so the pair can drink. */
    WorldGen.pondModel = function(state) {
        const cat = this.catalog();
        const p = cat && cat.start && cat.start.pond;
        if (!p) return null;
        const size = state.size, mid = Math.floor(size / 2), start = state.startArea;
        const [dmin, dmax] = p.distance || [10, 30];
        const [rmin, rmax] = p.radius || [2, 5];
        const angle = unit(state.seed, 0x90ed, 0) * Math.PI * 2;
        const dist = dmin + unit(state.seed, 0x90ed, 1) * (dmax - dmin);
        const rx = rmin + unit(state.seed, 0x90ed, 2) * (rmax - rmin), ry = rmin + unit(state.seed, 0x90ed, 3) * (rmax - rmin);
        const cx = start.x * size + mid + Math.cos(angle) * dist, cy = start.y * size + mid + Math.sin(angle) * dist;
        return { cx, cy, rx, ry, isWater: (gx, gy) => ((gx - cx) / rx) ** 2 + ((gy - cy) / ry) ** 2 <= 1 };
    };

    /** Surface water at a world cell (river or start pond). */
    WorldGen.waterModel = function(state) {
        const river = this.riverModel(state), pond = this.pondModel(state);
        return {
            river, pond,
            isWater: (gx, gy) => (!!river && river.isWater(gx, gy)) || (!!pond && pond.isWater(gx, gy))
        };
    };

    /** The pair's names for this seed: { male, female }. */
    WorldGen.startNames = function(seed) {
        const n = (this.catalog().start || {}).names;
        if (!n) return { male: "Adam", female: "Eve" };
        const pick = (list, k) => list[Math.floor(unit(seed, 0x4e41, k) * list.length)];
        const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
        const male = cap(pick(n.start, 0) + pick(n.male, 1));
        let female = cap(pick(n.start, 2) + pick(n.female, 3));
        if (female === male) female = cap(pick(n.start, 4) + pick(n.female, 5));
        return { male, female };
    };

    //-------------------------------------------------------------------------
    // The generator

    function generate(ctx) {
        const cat = WorldGen.catalog();
        if (!cat || !window.UF.World || !UF.World.state) return;
        const state = UF.World.state;
        const size = ctx.width;
        const gx0 = ctx.areaX * size, gy0 = ctx.areaY * size;
        // Catalog v3 has no 'terrain': ground comes from UF_Tiles ground kinds (biome rewrite), water kinds from cat.water.
        const terrain = cat.terrain || { water: { tileId: (cat.water && cat.water.surface && cat.water.surface.fresh) || 2048, autotile: true } };

        // 1. Ground
        if (terrain.grass) {
            for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) ctx.setTile(x, y, 0, terrain.grass.tileId);
        }

        // 2. Water: the world's river and the start pond, edges computed from both together
        const waterModel = WorldGen.waterModel(state);
        const river = waterModel.river;
        const isWaterAt = waterModel.isWater;
        const waterMask = new Uint8Array(size * size);
        if (terrain.water) {
            const base = autotileBase(terrain.water.tileId);
            const paint = (x, y) => {
                if (x < 0 || y < 0 || x >= size || y >= size || waterMask[y * size + x]) return;
                const gx = gx0 + x, gy = gy0 + y;
                if (!isWaterAt(gx, gy)) return;
                waterMask[y * size + x] = 1;
                ctx.setTile(x, y, 0, terrain.water.autotile ? base + autotileShape((dx, dy) => isWaterAt(gx + dx, gy + dy)) : terrain.water.tileId);
            };
            if (river) {
                for (let y = 0; y < size; y++) {
                    const c = Math.round(river.center(gy0 + y)) - gx0;
                    for (let x = c - river.halfWidth; x <= c + river.halfWidth; x++) paint(x, y);
                }
            }
            const pond = waterModel.pond;
            if (pond) {
                for (let y = Math.floor(pond.cy - pond.ry) - gy0; y <= Math.ceil(pond.cy + pond.ry) - gy0; y++) {
                    for (let x = Math.floor(pond.cx - pond.rx) - gx0; x <= Math.ceil(pond.cx + pond.rx) - gx0; x++) paint(x, y);
                }
            }
        }
        // Distance to water (0 = water, up to 4), for keeping objects off the banks.
        const waterDist = new Uint8Array(size * size).fill(9);
        for (let i = 0; i < waterMask.length; i++) if (waterMask[i]) waterDist[i] = 0;
        for (let pass = 1; pass <= 4; pass++) {
            for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                if (waterDist[y * size + x] !== pass - 1) continue;
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
                    const nx = x + dx, ny = y + dy;
                    if (nx >= 0 && ny >= 0 && nx < size && ny < size && waterDist[ny * size + nx] > pass) waterDist[ny * size + nx] = pass;
                }
            }
        }

        // 3. The start (VISION V4, revised 2026-09-18): a man and a woman with names from the seed, in the middle.
        //    Placed first, so their events get IDs 1 and 2 (UF_ColonyOverseer uses them).
        const occupied = new Uint8Array(size * size);
        const start = ctx.isStart && !ctx.templateRect ? cat.start : null;
        const clearRadius = start ? (start.clearRadius || 0) : 0;
        if (start) {
            if (start.note) ctx.map.note = start.note;
            if (start.displayName) ctx.map.displayName = start.displayName;
            const names = WorldGen.startNames(state.seed);
            const fill = s => String(s || "").replace(/\{male\}/g, names.male).replace(/\{female\}/g, names.female);
            // The pair as events 1 and 2, only until UF_Colonists exists (it creates them as world units instead).
            const pair = window.UF.Colonists ? [] : (start.pair || start.events || []);
            for (const e of pair) {
                const x = ctx.center.x + (e.dx || 0), y = ctx.center.y + (e.dy || 0);
                const img = typeof e.image === "string" ? { characterName: e.image } : (e.image || {});
                ctx.addEvent({
                    name: fill(e.name), x, y, note: fill(e.note),
                    image: { characterName: img.characterName, characterIndex: img.characterIndex || 0, direction: e.dir || img.direction || 2, pattern: 1 },
                    priorityType: 1, through: false, directionFix: !!e.directionFix, walkAnime: e.walkAnime !== false
                });
                occupied[y * size + x] = 1;
            }
        }
        const inClearing = (x, y) => clearRadius > 0 && (x - ctx.center.x) ** 2 + (y - ctx.center.y) ** 2 <= clearRadius * clearRadius;

        // 5. Objects, in catalog order; one per cell
        placeObjects(ctx, cat.objects || [], cat.maxObjectsPerArea, occupied, (x, y, gx, gy, o) => {
            if (ctx.isTemplateCell(x, y) || (ctx.isStart && inClearing(x, y))) return false;
            return waterDist[y * size + x] > (o.avoidWater || 0);
        });
    }

    /**
     * Place catalog objects as events: per object, seeded patches (density x clump), capped per area.
     * eligible(x, y, gx, gy, object) decides where an object may stand; occupied cells are always skipped.
     */
    function placeObjects(ctx, objects, totalMax, occupied, eligible) {
        const state = UF.World.state;
        const size = ctx.width;
        const gx0 = ctx.areaX * size, gy0 = ctx.areaY * size;
        const layerSalt = ctx.areaZ || 0;
        const placed = [];
        objects.forEach((o, oi) => {
            if (!o || !o.image || !(o.density > 0)) return;
            const salt = hashString(o.id || `object${oi}`) ^ (layerSalt * 0x01000193);
            const scale = Math.max(2, o.clumpScale || 16);
            const clump = clamp01(o.clump || 0);
            const candidates = [];
            for (let y = 0; y < size; y++) {
                const gy = gy0 + y;
                for (let x = 0; x < size; x++) {
                    if (occupied[y * size + x]) continue;
                    const gx = gx0 + x;
                    if (!eligible(x, y, gx, gy, o)) continue;
                    const patch = (1 - clump) + clump * smoothstep(0.5, 0.8, valueNoise(state.seed, salt, gx, gy, scale));
                    const roll = unit(state.seed, salt ^ 0x9e3779b9, gx, gy);
                    if (roll < o.density * patch) candidates.push({ x, y, roll });
                }
            }
            const max = o.maxPerArea > 0 ? o.maxPerArea : Infinity;
            if (candidates.length > max) {
                candidates.sort((a, b) => a.roll - b.roll);
                candidates.length = max;
            }
            for (const c of candidates) {
                occupied[c.y * size + c.x] = 1;
                placed.push({ o, x: c.x, y: c.y, roll: c.roll });
            }
        });
        const cap = totalMax > 0 ? totalMax : 800;
        if (placed.length > cap) {
            placed.sort((a, b) => a.roll - b.roll);
            placed.length = cap;
        }
        placed.sort((a, b) => (a.y - b.y) || (a.x - b.x));
        const counts = {};
        for (const p of placed) {
            counts[p.o.id] = (counts[p.o.id] || 0) + 1;
            ctx.addEvent({
                name: p.o.name || p.o.id,
                x: p.x,
                y: p.y,
                image: { characterName: p.o.image, characterIndex: p.o.characterIndex || 0, direction: 2, pattern: 1 },
                note: `<ufObject:${p.o.id}> ${p.o.note || ""}`.trim(),
                priorityType: 1,
                through: false,
                directionFix: true,
                walkAnime: false
            });
        }
        WorldGen.stats[`${ctx.areaX},${ctx.areaY},${ctx.areaZ || 0}`] = counts;
    }

    if (window.UF.World) {
        UF.World.unregisterGenerator("df_wilderness_generator"); // superseded (UF_ProcGen, commit a09d3fd)
        UF.World.registerGenerator("uf_worldgen", generate, 10);
    }

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "worldgen"), registered at boot after all plugins load

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("worldgen", async t => {
            const cat = WorldGen.catalog();
            t.check("catalog_loaded", !!cat && Array.isArray(cat.objects) && !!(cat.terrain || cat.water),
                cat ? `${cat.objects.length} object types` : "data/UF_WorldCatalog.json missing or invalid");
            if (!cat || !UF.World || !UF.World.state) return;

            const fs = require("fs"), path = require("path");
            const gameDir = nw.__dirname || process.cwd();
            const missing = cat.objects.filter(o => o.image && !fs.existsSync(path.join(gameDir, "img", "characters", `${o.image}.png`)));
            t.check("catalog_images_exist", missing.length === 0,
                missing.length ? `missing: ${missing.map(o => `${o.id} -> img/characters/${o.image}.png`).join(", ")}` : `${cat.objects.length} images found`);

            const strip = [0, 1, 2].map(col => autotileShape((dx) => col + dx >= 0 && col + dx <= 2));
            t.check("autotile_matches_editor", WorldGen.autotileShapeCount() === 47 && strip.join(",") === "16,0,24",
                `${WorldGen.autotileShapeCount()} shapes derived; a 3-wide vertical strip gives ${strip.join(",")} (the editor painted 16,0,24)`);

            const W = UF.World, st = W.state, a = st.startArea, size = st.size;
            const waterBase = autotileBase(cat.terrain && cat.terrain.water ? cat.terrain.water.tileId : cat.water.surface.fresh);
            const waterCols = (map, row) => {
                const cols = [];
                for (let x = 0; x < size; x++) if (isKind(map.data[row * size + x], waterBase)) cols.push(x);
                return cols;
            };
            const span = cols => (cols.length ? `x ${cols[0]}-${cols[cols.length - 1]}` : "none");
            const here = W.buildArea(a.x, a.y);
            // The river is wherever the seed put it: check continuity in the area column it actually runs through.
            const river = WorldGen.riverModel(st);
            const edgeGy = a.y * size + size - 1;
            const riverAreaX = Math.floor(Math.round(river.center(edgeGy)) / size);
            if (W.inWorld(riverAreaX, a.y + 1) && riverAreaX !== a.x) {
                const above = W.buildArea(riverAreaX, a.y), below = W.buildArea(riverAreaX, a.y + 1);
                const lastRow = waterCols(above, size - 1), firstRow = waterCols(below, 0);
                t.check("river_continuous_between_areas", lastRow.length > 0 && lastRow.some(x => firstRow.includes(x)),
                    `bottom row of area (${riverAreaX},${a.y}): ${span(lastRow)}; top row of area (${riverAreaX},${a.y + 1}): ${span(firstRow)}`);
            }

            // The start: a man and a woman with seed-generated names, in the middle, as events 1 and 2.
            const mid = Math.floor(size / 2);
            if (cat.start && !W.template()) {
                const names = WorldGen.startNames(st.seed);
                const fill = s => s.replace(/\{male\}/g, names.male).replace(/\{female\}/g, names.female);
                const expected = window.UF.Colonists ? [] : (cat.start.pair || cat.start.events || []).map((e, i) => ({ id: i + 1, name: fill(e.name), x: mid + (e.dx || 0), y: mid + (e.dy || 0) }));
                const wrong = expected.filter(e => !here.events[e.id] || here.events[e.id].name !== e.name || here.events[e.id].x !== e.x || here.events[e.id].y !== e.y);
                t.check("start_in_middle", wrong.length === 0 && here.note.includes("<glade>") && !here.events.some(e => e && /<fruit>/.test(e.note) && !/<ufObject:/.test(e.note)),
                    wrong.length ? `not as expected: ${wrong.map(e => `${e.name} (event ${e.id} at ${e.x},${e.y})`).join(", ")}` : `${expected.map(e => `${e.name} = event ${e.id} at (${e.x},${e.y})`).join("; ")}; no fixed tree`);
                const other = WorldGen.startNames(st.seed + 1);
                t.check("names_vary_by_seed", other.male !== names.male || other.female !== names.female, `this world: ${names.male} and ${names.female}; next seed: ${other.male} and ${other.female}`);
            }

            // Water within reach of the start (the pond), and the river never through the start.
            const pond = cat.start && cat.start.pond;
            const reach = pond ? pond.distance[1] + pond.radius[1] + 2 : 40;
            let nearest = Infinity;
            for (let y = Math.max(0, mid - reach); y <= Math.min(size - 1, mid + reach); y++) {
                for (let x = Math.max(0, mid - reach); x <= Math.min(size - 1, mid + reach); x++) {
                    if (isKind(here.data[y * size + x], waterBase)) nearest = Math.min(nearest, Math.hypot(x - mid, y - mid));
                }
            }
            t.check("water_near_start", nearest <= reach, `nearest water ${nearest === Infinity ? "none" : nearest.toFixed(1) + " cells"} from the pair (reach ${reach})`);
            const riverGap = Math.abs(Math.round(river.center(a.y * size + mid)) - (a.x * size + mid));
            t.check("river_not_through_start", riverGap > (cat.river.keepAwayFromStart || 14), `the river passes ${riverGap} cells from the start`);

            const objects = here.events.filter(e => e && /<ufObject:/.test(e.note));
            const counts = {};
            for (const e of objects) {
                const id = e.note.match(/<ufObject:([^>]+)>/)[1];
                counts[id] = (counts[id] || 0) + 1;
            }
            const absent = cat.objects.filter(o => o.density > 0 && !counts[o.id]).map(o => o.id);
            t.check("objects_placed", absent.length === 0 && objects.length > 0 && objects.length <= (cat.maxObjectsPerArea || 800),
                `${objects.length} objects in the start area: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ")}${absent.length ? `; none placed for: ${absent.join(", ")}` : ""}`);
            const clearR = cat.start && !W.template() ? (cat.start.clearRadius || 0) : 0;
            const onGlade = objects.filter(e => W.templatePaints(e.x, e.y) || (clearR > 0 && (e.x - mid) ** 2 + (e.y - mid) ** 2 <= clearR * clearR));
            t.check("glade_clear", onGlade.length === 0, onGlade.length ? `${onGlade.length} generated objects inside the start clearing` : `no generated objects inside the start clearing`);
            const inWater = objects.filter(e => isKind(here.data[e.y * size + e.x], waterBase));
            t.check("no_objects_in_water", inWater.length === 0, inWater.length ? `${inWater.length} objects placed in the river` : "none in the river");
            const signature = map => map.events.filter(e => e && /<ufObject:/.test(e.note)).map(e => `${e.x},${e.y},${e.note}`).join("|");
            t.check("deterministic", signature(W.buildArea(a.x, a.y)) === signature(here), `${objects.length} objects identical on rebuild`);

            // Look at the start from the farthest zoom.
            if (UF.Camera) UF.Camera.setLevel(UF.Camera.levels.length - 1);
            $gamePlayer.locate(mid, mid);
            await t.waitFrames(30);
            t.screenshot("zoomed_out_glade");
            if (UF.Camera) UF.Camera.setLevel(1);
            await t.waitFrames(5);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during worldgen checks");
        });
    }
})();
