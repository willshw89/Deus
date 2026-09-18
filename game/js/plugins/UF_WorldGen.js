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
        if (anchorX === null) {
            anchorX = start.x * size + size / 2;
            anchorY = start.y * size + size / 2;
        }
        const hw = r.halfWidth || 0;
        const period = r.meanderPeriodCells || 97;
        const amp = r.meanderCells || 0;
        const straight = r.straightNearGladeCells || 0;
        const phase = ((state.seed % 1000) / 1000) * Math.PI * 2;
        const center = gy => {
            const d = gy - anchorY;
            const env = clamp01((Math.abs(d) - straight) / 32);
            return anchorX + amp * env * (0.7 * Math.sin((2 * Math.PI * d) / period + phase) + 0.3 * Math.sin((2 * Math.PI * d) / (period * 0.43) + 2 * phase));
        };
        return {
            anchorX, anchorY, halfWidth: hw, center,
            isWater: (gx, gy) => Math.abs(gx - Math.round(center(gy))) <= hw
        };
    };

    //-------------------------------------------------------------------------
    // The generator

    function generate(ctx) {
        const cat = WorldGen.catalog();
        if (!cat || !window.UF.World || !UF.World.state) return;
        const state = UF.World.state;
        const size = ctx.width;
        const gx0 = ctx.areaX * size, gy0 = ctx.areaY * size;
        const terrain = cat.terrain || {};

        // 1. Ground
        if (terrain.grass) {
            for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) ctx.setTile(x, y, 0, terrain.grass.tileId);
        }

        // 2. River
        const river = WorldGen.riverModel(state);
        if (river && terrain.water) {
            const base = autotileBase(terrain.water.tileId);
            for (let y = 0; y < size; y++) {
                const gy = gy0 + y;
                const c = Math.round(river.center(gy));
                for (let gx = c - river.halfWidth; gx <= c + river.halfWidth; gx++) {
                    const x = gx - gx0;
                    if (x < 0 || x >= size) continue;
                    const id = terrain.water.autotile
                        ? base + autotileShape((dx, dy) => river.isWater(gx + dx, gy + dy))
                        : terrain.water.tileId;
                    ctx.setTile(x, y, 0, id);
                }
            }
        }

        // 3. Objects, in catalog order; one per cell
        const occupied = new Uint8Array(size * size);
        const placed = [];
        (cat.objects || []).forEach((o, oi) => {
            if (!o || !o.image || !(o.density > 0)) return;
            const salt = hashString(o.id || `object${oi}`);
            const scale = Math.max(2, o.clumpScale || 16);
            const clump = clamp01(o.clump || 0);
            const avoid = o.avoidWater || 0;
            const candidates = [];
            for (let y = 0; y < size; y++) {
                const gy = gy0 + y;
                const riverX = river ? Math.round(river.center(gy)) : null;
                for (let x = 0; x < size; x++) {
                    if (occupied[y * size + x] || ctx.isTemplateCell(x, y)) continue;
                    const gx = gx0 + x;
                    if (river && Math.abs(gx - riverX) <= river.halfWidth + avoid) continue;
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
        const totalMax = cat.maxObjectsPerArea > 0 ? cat.maxObjectsPerArea : 800;
        if (placed.length > totalMax) {
            placed.sort((a, b) => a.roll - b.roll);
            placed.length = totalMax;
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
        WorldGen.stats[`${ctx.areaX},${ctx.areaY}`] = counts;
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
            t.check("catalog_loaded", !!cat && Array.isArray(cat.objects) && !!cat.terrain,
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
            const waterBase = autotileBase(cat.terrain.water.tileId);
            const waterCols = (map, row) => {
                const cols = [];
                for (let x = 0; x < size; x++) if (isKind(map.data[row * size + x], waterBase)) cols.push(x);
                return cols;
            };
            const span = cols => (cols.length ? `x ${cols[0]}-${cols[cols.length - 1]}` : "none");
            const here = W.buildArea(a.x, a.y);
            const south = W.buildArea(a.x, a.y + 1);
            const lastRow = waterCols(here, size - 1), firstRow = waterCols(south, 0);
            t.check("river_continuous_between_areas", lastRow.length > 0 && lastRow.some(x => firstRow.includes(x)),
                `bottom row of area (${a.x},${a.y}): ${span(lastRow)}; top row of area (${a.x},${a.y + 1}): ${span(firstRow)}`);

            // The river runs beside the glade so the colonists can drink.
            let gRight = -1, gTop = Infinity, gBottom = -1, gLeft = Infinity;
            for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (W.templatePaints(x, y)) {
                gRight = Math.max(gRight, x); gLeft = Math.min(gLeft, x); gTop = Math.min(gTop, y); gBottom = Math.max(gBottom, y);
            }
            const midRow = Math.round((gTop + gBottom) / 2);
            const cols = waterCols(here, midRow);
            const gap = cols.length ? cols[0] - gRight - 1 : Infinity;
            const allowed = (cat.river.offsetFromGlade || 0) + 1;
            t.check("river_by_glade", cols.length > 0 && gap <= allowed,
                `glade x ${gLeft}-${gRight}; water on its middle row (${midRow}) at ${span(cols)}; gap ${gap} cells (allowed ${allowed})`);

            const objects = here.events.filter(e => e && /<ufObject:/.test(e.note));
            const counts = {};
            for (const e of objects) {
                const id = e.note.match(/<ufObject:([^>]+)>/)[1];
                counts[id] = (counts[id] || 0) + 1;
            }
            const absent = cat.objects.filter(o => o.density > 0 && !counts[o.id]).map(o => o.id);
            t.check("objects_placed", absent.length === 0 && objects.length > 0 && objects.length <= (cat.maxObjectsPerArea || 800),
                `${objects.length} objects in the start area: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ")}${absent.length ? `; none placed for: ${absent.join(", ")}` : ""}`);
            const onGlade = objects.filter(e => W.templatePaints(e.x, e.y));
            t.check("glade_clear", onGlade.length === 0, onGlade.length ? `${onGlade.length} generated objects on glade cells` : "no generated objects on the glade");
            const inWater = objects.filter(e => isKind(here.data[e.y * size + e.x], waterBase));
            t.check("no_objects_in_water", inWater.length === 0, inWater.length ? `${inWater.length} objects placed in the river` : "none in the river");
            const signature = map => map.events.filter(e => e && /<ufObject:/.test(e.note)).map(e => `${e.x},${e.y},${e.note}`).join("|");
            t.check("deterministic", signature(W.buildArea(a.x, a.y)) === signature(here), `${objects.length} objects identical on rebuild`);

            // Look at the glade's south side from the farthest zoom: river and forest should continue past the glade.
            if (UF.Camera) UF.Camera.setLevel(UF.Camera.levels.length - 1);
            $gamePlayer.locate(Math.round((gLeft + gRight) / 2), Math.min(size - 1, gBottom + 12));
            await t.waitFrames(30);
            t.screenshot("zoomed_out_glade");
            if (UF.Camera) UF.Camera.setLevel(1);
            await t.waitFrames(5);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during worldgen checks");
        });
    }
})();
