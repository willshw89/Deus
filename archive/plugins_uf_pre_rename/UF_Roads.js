//=============================================================================
// UF_Roads.js - Roads between sites, bridges over rivers, farm plots and wells at every living site
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Roads] Roads between the factions' sites (plank bridges where they cross water), farm plots and a well at every living site, generated with the map from the seed.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_Objects
 *
 * @help
 * A UF_World generator ("uf_roads", order 20: after UF_WorldGen has laid the
 * ground and stamped UF_History's sites) that adds the depth a lived-in
 * world has: a road network between the living sites (a minimum spanning
 * set of connections, every site reachable from the player's home), plank
 * bridges where a road crosses water no wider than 5 cells, 2-4 farm plots
 * beside the road outside every living site, and one well inside its ring.
 *
 * Roads are the ground kind "road" (catalog groundKinds, drawn by UF_Tiles)
 * written on layer 0 with autotile shapes; the road removes the plants it
 * runs through (never a wall, a building, a boulder or an ore outcrop, and
 * never anything inside a site's disc). Bridges, farm plots and wells are
 * catalog objects ("bridge", "farm_plot", "well"). Everything is a pure
 * function of the seed: no Math.random, no state to save.
 *
 * A bridge cell stays a water tile; Game_Map.isPassable (aliased) lets units
 * walk on a cell whose object is a bridge.
 *
 * API and checks: docs/systems/UF_Roads.md
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const KIND = "road";
    const GENERATOR = "uf_roads";
    const ORDER = 20;                       // after uf_worldgen (10): ground, water and sites are in place
    const COST = Object.freeze({ ground: 1, road: 0.7, passable: 1, plant: 4, water: 20, bridge: 1 });
    const MAX_BRIDGE = 5;                   // longest water run a bridge may span (rivers are 3-5 cells wide)
    const NODE_CAP = 40000;                 // A* expansions per road before giving up on that connection
    const BUDGET_MS = 300;                  // the whole generator on a 256x256 area (WORLD_ARCHITECTURE section 1.8 style budget)
    const FARM_ALONG = 4, FARM_DEEP = 3;    // a farm plot is 4 cells along the ring side and 3 cells deep
    const FARM_BANDS = [[2, 4], [2, 6], [2, 8]]; // distance bands outside the ring (radius + lo .. radius + hi), widened when land is short
    const SALT = Object.freeze({ farms: 0xfa12 });
    const NB4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const NB8 = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
    const CLS_NONE = 0, CLS_PASS = 1, CLS_PLANT = 2, CLS_BLOCK = 3;
    const TERR_LAND = 0, TERR_WATER = 1, TERR_ROCK = 2;
    const PEAK_REGION = 250;

    const catalog = () => window.$ufWorldCatalog || null;
    const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
    const World = () => (window.UF && UF.World) || null;
    const Tiles = () => (window.UF && UF.Tiles) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const History = () => (window.UF && UF.History) || null;
    const WorldGen = () => (window.UF && UF.WorldGen) || null;
    const isWaterTile = tileId => Tilemap.isTileA1(tileId);
    const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

    //-------------------------------------------------------------------------
    // Deterministic helpers (UF_World's hash, never Math.random)

    const hash32 = (...parts) => World().hash32(...parts);
    const unit = (...parts) => hash32(...parts) / 4294967296;

    // Autotile shape from an 8-neighbor predicate: UF_WorldGen's helper when it exists, else the same derivation
    // from Tilemap.FLOOR_AUTOTILE_TABLE (re-implemented here so the road blends even without it).
    let shapeLookup = null;
    function autotileShape(same) {
        const G = WorldGen();
        if (G && typeof G.autotileShape === "function") return G.autotileShape(same);
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

    //-------------------------------------------------------------------------
    // Public object

    const builds = new Map(); // "seed:ax,ay" -> the build record of that area's last build
    const Roads = {
        KIND,
        GENERATOR,
        config: { costs: COST, maxBridge: MAX_BRIDGE, nodeCap: NODE_CAP, budgetMs: BUDGET_MS, farm: { along: FARM_ALONG, deep: FARM_DEEP, bands: FARM_BANDS } },
        lastBuild: null, // { area, ms, sites, roads: [{from, to, cells: [cellIndex], bridges}], roadCells, bridges: [{x, y, cells}], farms: [{site, x, y, w, h}], wells: [{site, x, y}], failed: [{from, to, reason}], expanded, capHits, skipped }
        stats: {},       // "ax,ay" -> { roads, roadCells, bridges, farms, wells, ms }
        autotileShape,
        /** Tile id of the road ground kind's shape 0, or null when the catalog has no "road" kind. */
        roadBase: () => (Tiles() ? Tiles().groundBase(KIND) : null),
        /** True for any of the 48 shapes of the road ground kind. */
        isRoadTile(tileId) {
            const base = Roads.roadBase();
            return base !== null && tileId >= base && tileId < base + 48;
        },
        isRoadAt: (area, x, y) => !!World() && Roads.isRoadTile(World().getTile(area.x, area.y, x, y, 0)),
        isRoad: (area, x, y) => !!World() && Roads.isRoadTile(World().getTile(area.x, area.y, x, y, 0)),
        bridgeTypeId: () => (Objects() ? Objects().typeId("bridge") : 0),
        /** True when the cell of the map on screen holds a bridge (a walkable water cell). */
        bridgeAt(x, y) {
            const map = window.$dataMap;
            if (!map || !map.ufObjects) return false;
            if (map.width && map.height) {
                if ($gameMap && $gameMap.isLoopHorizontal()) x = ((x % map.width) + map.width) % map.width;
                if ($gameMap && $gameMap.isLoopVertical()) y = ((y % map.height) + map.height) % map.height;
            }
            if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
            const b = Roads.bridgeTypeId();
            return b !== 0 && map.ufObjects[y * map.width + x] === b;
        },
        bridgeAtIn: (area, x, y) => !!World() && Roads.bridgeTypeId() !== 0 && World().getObject(area.x, area.y, x, y) === Roads.bridgeTypeId(),
        /** The build record of an area (roads, bridges, farms, wells) from its latest build with the current seed, or null. */
        network(ax, ay) {
            const W = World();
            return (W && W.state && builds.get(`${W.state.seed}:${ax},${ay}`)) || null;
        }
    };
    window.UF = window.UF || {};
    window.UF.Roads = Roads;

    //-------------------------------------------------------------------------
    // The generator

    // Object classes by type number: nothing, walk-over (removed by a road outside sites), blocking plant (removed), blocking (never).
    function objectClasses() {
        const O = Objects();
        const types = O.types();
        const cls = new Uint8Array(types.length + 1);
        const ids = new Array(types.length + 1).fill(null);
        for (const t of types) {
            ids[t.typeId] = t.id;
            const tags = t.tags || [];
            if (t.passable === true) cls[t.typeId] = CLS_PASS;
            else if (tags.includes("tree") || tags.includes("bush") || tags.includes("plant")) cls[t.typeId] = CLS_PLANT;
            else cls[t.typeId] = CLS_BLOCK;
        }
        return { cls, ids };
    }

    // Plan build cells of every culture's plan, relative to a site centre: wells and farm plots stay off them.
    function planCells() {
        const cat = catalog();
        const out = new Set();
        const walk = plan => { for (const step of plan || []) if (step.build) for (const c of step.cells || []) out.add(`${c[0]},${c[1]}`); };
        if (cat && cat.colony) {
            walk(cat.colony.plan);
            for (const p of Object.values(cat.colony.plans || {})) walk(p);
        }
        return out;
    }

    function livingSitesOf(sites) {
        return sites.filter(s => s.faction && !s.ruined && s.kind !== "lair" && s.kind !== "ruin");
    }

    function generate(ctx) {
        const t0 = now();
        const build = {
            area: { x: ctx.areaX, y: ctx.areaY }, ms: 0, sites: 0, living: 0, roads: [], roadCells: 0, bridges: [], farms: [], wells: [],
            failed: [], expanded: 0, capHits: 0, removed: 0, added: 0, statsDelta: 0, skipped: null
        };
        Roads.lastBuild = build;
        const cat = catalog(), W = World(), T = Tiles(), O = Objects(), H = History(), G = WorldGen();
        const finish = () => {
            build.ms = now() - t0;
            builds.set(`${W && W.state ? W.state.seed : 0}:${ctx.areaX},${ctx.areaY}`, build);
            Roads.stats[`${ctx.areaX},${ctx.areaY}`] = { roads: build.roads.length, roadCells: build.roadCells, bridges: build.bridges.length, farms: build.farms.length, wells: build.wells.length, ms: build.ms };
        };
        if (!cat || !W || !W.state || !T || !O || !H || typeof H.sitesIn !== "function") { build.skipped = "needs the catalog, UF_World, UF_Tiles, UF_Objects and UF_History"; return finish(); }
        const roadBase = T.groundBase(KIND);
        const bridgeType = O.typeId("bridge"), farmType = O.typeId("farm_plot"), wellType = O.typeId("well");
        if (roadBase === null || !bridgeType || !farmType || !wellType) { build.skipped = `catalog lacks ${roadBase === null ? "ground kind road" : !bridgeType ? "object bridge" : !farmType ? "object farm_plot" : "object well"}`; return finish(); }
        let sites;
        try { sites = H.sitesIn(ctx.areaX, ctx.areaY) || []; } catch (e) { build.skipped = `UF.History.sitesIn failed: ${e.message}`; return finish(); }
        const living = livingSitesOf(sites);
        build.sites = sites.length;
        build.living = living.length;
        if (living.length === 0) { build.skipped = "no living site in this area"; return finish(); }

        const size = ctx.width, cells = size * size;
        const data = ctx.map.data, objects = ctx.objects;
        const kinds = T.kinds();
        const { cls: objClass, ids: objIds } = objectClasses();
        const inside = (x, y) => x >= 0 && y >= 0 && x < size && y < size;
        const kindIndexOf = tileId => (Tilemap.isTileA2(tileId) ? Math.floor((tileId - Tilemap.TILE_ID_A2) / 48) : -1);
        const isRoad = i => data[i] >= roadBase && data[i] < roadBase + 48;

        // Terrain per cell: land, water, or rock (peaks and any impassable ground kind).
        const terr = new Uint8Array(cells);
        for (let i = 0; i < cells; i++) {
            const tile = data[i];
            if (isWaterTile(tile)) terr[i] = TERR_WATER;
            else if (data[5 * cells + i] === PEAK_REGION) terr[i] = TERR_ROCK;
            else {
                const k = kindIndexOf(tile);
                terr[i] = k >= 0 && kinds[k] && kinds[k].passable === false ? TERR_ROCK : TERR_LAND;
            }
        }
        // Site discs (radius + 1, every site kind): nothing inside is removed or painted over; walls block roads.
        const discOf = new Uint8Array(cells); // site index + 1
        sites.forEach((s, n) => {
            const r = (s.radius || 0) + 1;
            for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
                if (inside(s.x + dx, s.y + dy)) discOf[(s.y + dy) * size + s.x + dx] = n + 1;
            }
        });
        // Protected minimums: the start kit within its radius and the map kit over the area. A road may remove one of
        // those objects only while the count stays above the minimum (allowance), so worldgen's kit checks hold.
        const start = cat.start || {};
        const isStart = ctx.isStart;
        const mid = Math.floor(size / 2);
        const kitR = isStart && start.kit && start.kit.radius ? start.kit.radius[1] : 0;
        const kitMask = new Uint8Array(cells);
        const kitAllow = new Map(), mapAllow = new Map();
        if (kitR > 0 && start.kit.objects) {
            const have = new Map();
            for (let y = Math.max(0, mid - kitR); y <= Math.min(size - 1, mid + kitR); y++) for (let x = Math.max(0, mid - kitR); x <= Math.min(size - 1, mid + kitR); x++) {
                if (Math.hypot(x - mid, y - mid) > kitR) continue;
                const i = y * size + x;
                kitMask[i] = 1;
                if (objects[i]) have.set(objects[i], (have.get(objects[i]) || 0) + 1);
            }
            for (const [id, minimum] of Object.entries(start.kit.objects)) {
                const type = O.typeId(id);
                if (type) kitAllow.set(type, (have.get(type) || 0) - minimum);
            }
        }
        if (start.mapKit && start.mapKit.objects) {
            const have = new Map();
            for (let i = 0; i < cells; i++) if (objects[i]) have.set(objects[i], (have.get(objects[i]) || 0) + 1);
            for (const [id, spec] of Object.entries(start.mapKit.objects)) {
                const type = O.typeId(id);
                if (type) mapAllow.set(type, (have.get(type) || 0) - ((spec && spec.min) | 0));
            }
        }
        const removable = i => {
            const o = objects[i];
            if (!o) return true;
            if (discOf[i]) return false;
            const c = objClass[o];
            if (c === CLS_BLOCK) return false;
            if (kitMask[i] && kitAllow.has(o) && kitAllow.get(o) <= 0) return false;
            if (mapAllow.has(o) && mapAllow.get(o) <= 0) return false;
            return true;
        };
        // Stats (UF_WorldGen.stats["ax,ay"], per object id) stay truthful: worldgen's objects_placed compares them to the grid.
        const stats = G && G.stats ? G.stats[`${ctx.areaX},${ctx.areaY}`] : null;
        const count = (id, delta) => { build.statsDelta += delta; if (stats && id) stats[id] = (stats[id] || 0) + delta; };
        const removeObject = i => {
            const o = objects[i];
            if (!o) return;
            if (kitMask[i] && kitAllow.has(o)) kitAllow.set(o, kitAllow.get(o) - 1);
            if (mapAllow.has(o)) mapAllow.set(o, mapAllow.get(o) - 1);
            count(objIds[o], -1);
            objects[i] = 0;
            build.removed++;
        };
        const putObject = (i, type) => {
            if (objects[i]) removeObject(i);
            objects[i] = type;
            count(objIds[type], 1);
            build.added++;
        };
        // Cost of stepping onto a land cell for a road (Infinity = never).
        const stepCost = i => {
            if (terr[i] !== TERR_LAND) return Infinity;
            const o = objects[i];
            if (!o) return isRoad(i) ? COST.road : COST.ground;
            const c = objClass[o];
            if (c === CLS_BLOCK) return Infinity;
            if (discOf[i]) return c === CLS_PASS ? COST.passable : Infinity;
            if (!removable(i)) return Infinity;
            return c === CLS_PLANT ? COST.plant : COST.passable;
        };

        //---------------------------------------------------------------------
        // A* on the 4-connected grid with straight bridge jumps over water runs of at most MAX_BRIDGE cells.
        // Deterministic: ties in the open set break on the node index. The heuristic is Manhattan distance at cost 1
        // (roads cost 0.7, so this is a lightly weighted A*: it favours joining existing roads and searches less).

        const gScore = new Float64Array(cells), parent = new Int32Array(cells), closed = new Uint8Array(cells);
        const heapF = new Float64Array(cells * 2), heapN = new Int32Array(cells * 2);
        let heapSize = 0;
        const heapLess = (a, b) => heapF[a] < heapF[b] || (heapF[a] === heapF[b] && heapN[a] < heapN[b]);
        const heapSwap = (a, b) => { const f = heapF[a], n = heapN[a]; heapF[a] = heapF[b]; heapN[a] = heapN[b]; heapF[b] = f; heapN[b] = n; };
        const heapPush = (f, n) => {
            if (heapSize >= heapF.length) return;
            let i = heapSize++;
            heapF[i] = f; heapN[i] = n;
            while (i > 0) { const p = (i - 1) >> 1; if (heapLess(i, p)) { heapSwap(i, p); i = p; } else break; }
        };
        const heapPop = () => {
            const top = heapN[0];
            heapSize--;
            if (heapSize > 0) {
                heapF[0] = heapF[heapSize]; heapN[0] = heapN[heapSize];
                let i = 0;
                for (;;) {
                    const l = 2 * i + 1, r = l + 1;
                    let m = i;
                    if (l < heapSize && heapLess(l, m)) m = l;
                    if (r < heapSize && heapLess(r, m)) m = r;
                    if (m === i) break;
                    heapSwap(i, m); i = m;
                }
            }
            return top;
        };

        function astar(sx, sy, gx, gy) {
            gScore.fill(Infinity); parent.fill(-2); closed.fill(0); heapSize = 0;
            const h = i => Math.abs((i % size) - gx) + Math.abs(Math.floor(i / size) - gy);
            for (const [dx, dy] of NB4) {
                const x = sx + dx, y = sy + dy;
                if (!inside(x, y)) continue;
                const i = y * size + x, c = stepCost(i);
                if (!Number.isFinite(c)) continue;
                gScore[i] = c; parent[i] = -1; heapPush(c + h(i), i);
            }
            let expanded = 0, found = -1;
            while (heapSize > 0) {
                const cur = heapPop();
                if (closed[cur]) continue;
                closed[cur] = 1;
                if (++expanded > NODE_CAP) { build.capHits++; break; }
                const cx = cur % size, cy = Math.floor(cur / size);
                if (Math.abs(cx - gx) + Math.abs(cy - gy) <= 1) { found = cur; break; }
                const g = gScore[cur];
                for (const [dx, dy] of NB4) {
                    let nx = cx + dx, ny = cy + dy;
                    if (!inside(nx, ny)) continue;
                    let ni = ny * size + nx;
                    if (terr[ni] === TERR_ROCK) continue;
                    let extra = 0;
                    if (terr[ni] === TERR_WATER) {
                        // A straight bridge: walk the water run in this direction; land within MAX_BRIDGE cells or nothing.
                        let run = 0, ok = false;
                        while (inside(nx, ny) && terr[ni] === TERR_WATER) {
                            extra += objects[ni] === bridgeType ? COST.bridge : COST.water;
                            if (++run > MAX_BRIDGE) break;
                            nx += dx; ny += dy; ni = ny * size + nx;
                            if (inside(nx, ny) && terr[ni] === TERR_LAND) ok = true;
                        }
                        if (!ok || run > MAX_BRIDGE) continue;
                    }
                    if (closed[ni]) continue;
                    const c = stepCost(ni);
                    if (!Number.isFinite(c)) continue;
                    const ng = g + extra + c;
                    if (ng < gScore[ni] - 1e-9) { gScore[ni] = ng; parent[ni] = cur; heapPush(ng + h(ni), ni); }
                }
            }
            build.expanded += expanded;
            if (found < 0) return null;
            // Reconstruct; a parent that isn't adjacent means a bridge: fill the straight water run between them.
            const path = [];
            let n = found;
            while (n >= 0) {
                path.push({ i: n, bridge: false });
                const p = parent[n];
                if (p >= 0) {
                    const x1 = n % size, y1 = Math.floor(n / size), x0 = p % size, y0 = Math.floor(p / size);
                    if (Math.abs(x1 - x0) + Math.abs(y1 - y0) > 1) {
                        const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
                        for (let x = x1 - dx, y = y1 - dy; x !== x0 || y !== y0; x -= dx, y -= dy) path.push({ i: y * size + x, bridge: true });
                    }
                }
                n = p;
            }
            path.reverse();
            return path;
        }

        //---------------------------------------------------------------------
        // Roads: Kruskal over the living sites by distance, each edge routed with A*; then anything still cut off from
        // the player's home gets a direct connection to it.

        const home = living.find(s => s.protected) || (H.homeSite ? living.find(s => H.homeSite() && s.id === H.homeSite().id) : null) || living[0];
        const order = living.slice().sort((a, b) => a.id - b.id);
        const comp = order.map((_, i) => i);
        const find = i => { while (comp[i] !== i) { comp[i] = comp[comp[i]]; i = comp[i]; } return i; };
        const union = (a, b) => { comp[find(a)] = find(b); };
        const edges = [];
        for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) edges.push({ i, j, d: Math.hypot(order[i].x - order[j].x, order[i].y - order[j].y) });
        edges.sort((a, b) => a.d - b.d || a.i - b.i || a.j - b.j);

        const paint = (path, from, to) => {
            const road = { from: from.id, to: to.id, cells: [], bridges: 0 };
            let crossing = null;
            for (const step of path) {
                const i = step.i, x = i % size, y = Math.floor(i / size);
                if (step.bridge) {
                    if (objects[i] !== bridgeType) putObject(i, bridgeType);
                    if (!crossing) { crossing = { x, y, cells: [] }; build.bridges.push(crossing); road.bridges++; }
                    crossing.cells.push(i);
                } else {
                    crossing = null;
                    if (objects[i] && !discOf[i] && removable(i)) removeObject(i);
                    if (!objects[i] && !isRoad(i)) { ctx.setTile(x, y, 0, roadBase); build.roadCells++; }
                }
                road.cells.push(i);
            }
            build.roads.push(road);
        };
        const connect = (a, b) => {
            const path = astar(a.x, a.y, b.x, b.y);
            if (!path) { build.failed.push({ from: a.id, to: b.id, reason: build.capHits ? "no route (or the node cap)" : "no route" }); return false; }
            paint(path, a, b);
            return true;
        };
        for (const e of edges) {
            if (find(e.i) === find(e.j)) continue;
            if (connect(order[e.i], order[e.j])) union(e.i, e.j);
        }
        const homeIdx = order.indexOf(home);
        for (let i = 0; i < order.length; i++) {
            if (i === homeIdx || find(i) === find(homeIdx)) continue;
            if (connect(order[i], home)) union(i, homeIdx);
        }

        // Autotile shapes: road cells join road cells and bridges; their land neighbours are re-shaped with
        // UF_WorldGen's rule (same kind, counting the ground under water and outside the area as its classified kind).
        const affected = new Set();
        for (const road of build.roads) for (const i of road.cells) if (isRoad(i)) {
            affected.add(i);
            const x = i % size, y = Math.floor(i / size);
            for (const [dx, dy] of NB8) if (inside(x + dx, y + dy)) affected.add((y + dy) * size + x + dx);
        }
        const classifiedKind = (x, y) => {
            if (!G || typeof G.cellInfoLocal !== "function") return -1;
            const info = G.cellInfoLocal(ctx.areaX, ctx.areaY, x, y);
            return info ? kinds.findIndex(k => k.id === info.ground) : -1;
        };
        for (const i of affected) {
            if (terr[i] !== TERR_LAND) continue;
            const x = i % size, y = Math.floor(i / size);
            if (isRoad(i)) {
                const shape = autotileShape((dx, dy) => inside(x + dx, y + dy) && (isRoad((y + dy) * size + x + dx) || objects[(y + dy) * size + x + dx] === bridgeType));
                ctx.setTile(x, y, 0, roadBase + shape);
            } else {
                const k = kindIndexOf(data[i]);
                if (k < 0) continue;
                const shape = autotileShape((dx, dy) => {
                    const nx = x + dx, ny = y + dy;
                    if (!inside(nx, ny)) return classifiedKind(nx, ny) === k;
                    const ni = ny * size + nx;
                    if (terr[ni] === TERR_WATER) return classifiedKind(nx, ny) === k;
                    return kindIndexOf(data[ni]) === k;
                });
                ctx.setTile(x, y, 0, Tilemap.TILE_ID_A2 + k * 48 + shape);
            }
        }

        //---------------------------------------------------------------------
        // Farm plots: 2-4 rectangles outside each living site's ring, beside its road when there is one.

        const plan = planCells();
        const farmMask = new Uint8Array(cells);
        const roadNear = i => {
            const x = i % size, y = Math.floor(i / size);
            for (const [dx, dy] of NB4) if (inside(x + dx, y + dy) && isRoad((y + dy) * size + x + dx)) return true;
            return false;
        };
        for (const s of living) {
            const want = 2 + Math.floor(unit(W.state.seed, SALT.farms, s.id) * 3); // 2..4
            const r = s.radius || 0;
            const mine = sites.indexOf(s) + 1;
            const placed = [];
            const cellOk = (x, y, lo, hi) => {
                if (!inside(x, y)) return false;
                const d = cheb(x, y, s.x, s.y);
                if (d < lo || d > hi) return false;
                const i = y * size + x;
                if (terr[i] !== TERR_LAND || isRoad(i) || farmMask[i]) return false;
                if (discOf[i] && discOf[i] !== mine) return false;
                if (objects[i] && (objClass[objects[i]] !== CLS_PASS || !removable(i))) return false;
                if (plan.has(`${x - s.x},${y - s.y}`)) return false;
                return true;
            };
            for (const [lo0, hi0] of FARM_BANDS) {
                if (placed.length >= want) break;
                const lo = r + lo0, hi = r + hi0;
                const candidates = [];
                for (const [w, h] of [[FARM_ALONG, FARM_DEEP], [FARM_DEEP, FARM_ALONG]]) {
                    for (let y0 = s.y - hi; y0 <= s.y + hi - h + 1; y0++) for (let x0 = s.x - hi; x0 <= s.x + hi - w + 1; x0++) {
                        let ok = true, score = 0;
                        for (let y = y0; y < y0 + h && ok; y++) for (let x = x0; x < x0 + w && ok; x++) {
                            if (!cellOk(x, y, lo, hi)) ok = false;
                            else if (roadNear(y * size + x)) score++;
                        }
                        // Plots keep one free cell between them.
                        for (let y = y0 - 1; y <= y0 + h && ok; y++) for (let x = x0 - 1; x <= x0 + w && ok; x++) if (inside(x, y) && farmMask[y * size + x]) ok = false;
                        if (ok) candidates.push({ x0, y0, w, h, score });
                    }
                }
                candidates.sort((a, b) => b.score - a.score || a.y0 - b.y0 || a.x0 - b.x0 || a.w - b.w);
                for (const c of candidates) {
                    if (placed.length >= want) break;
                    if (c.score === 0 && placed.length >= 2) break; // beside the road, or at least two anywhere
                    let free = true;
                    for (let y = c.y0 - 1; y <= c.y0 + c.h && free; y++) for (let x = c.x0 - 1; x <= c.x0 + c.w && free; x++) if (inside(x, y) && farmMask[y * size + x]) free = false;
                    if (!free) continue;
                    for (let y = c.y0; y < c.y0 + c.h; y++) for (let x = c.x0; x < c.x0 + c.w; x++) {
                        const i = y * size + x;
                        putObject(i, farmType);
                        farmMask[i] = 1;
                    }
                    placed.push({ site: s.id, x: c.x0, y: c.y0, w: c.w, h: c.h, byRoad: c.score > 0 });
                }
            }
            build.farms.push(...placed);
        }

        //---------------------------------------------------------------------
        // Wells: one per living site on a free cell inside the ring, 2+ cells from the centre, off the plan cells.

        for (const s of living) {
            const r = s.radius || 0;
            let best = null, bestD = Infinity;
            for (let dy = -(r - 1); dy <= r - 1; dy++) for (let dx = -(r - 1); dx <= r - 1; dx++) {
                const d = Math.max(Math.abs(dx), Math.abs(dy));
                if (d < 2) continue;
                const x = s.x + dx, y = s.y + dy;
                if (!inside(x, y)) continue;
                const i = y * size + x;
                if (terr[i] !== TERR_LAND || objects[i] || isRoad(i) || plan.has(`${dx},${dy}`)) continue;
                const e = dx * dx + dy * dy;
                if (e < bestD) { bestD = e; best = { x, y }; }
            }
            if (!best) {
                for (let dy = -(r - 1); dy <= r - 1 && !best; dy++) for (let dx = -(r - 1); dx <= r - 1 && !best; dx++) {
                    const x = s.x + dx, y = s.y + dy;
                    if (Math.max(Math.abs(dx), Math.abs(dy)) >= 2 && inside(x, y) && terr[y * size + x] === TERR_LAND && !objects[y * size + x]) best = { x, y };
                }
            }
            if (best) {
                putObject(best.y * size + best.x, wellType);
                build.wells.push({ site: s.id, x: best.x, y: best.y });
            } else {
                build.failed.push({ from: s.id, to: null, reason: "no free cell for a well" });
            }
        }
        finish();
    }

    if (window.UF && UF.World) UF.World.registerGenerator(GENERATOR, generate, ORDER);

    //-------------------------------------------------------------------------
    // Bridges are walkable water: a cell whose object is a bridge passes whatever its water tile says.

    const _Game_Map_isPassable = Game_Map.prototype.isPassable;
    Game_Map.prototype.isPassable = function(x, y, d) {
        if (Roads.bridgeAt(x, y)) return true;
        return _Game_Map_isPassable.call(this, x, y, d);
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "roads"), registered at boot after every plugin has loaded

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        const fs = require("fs"), path = require("path");
        const gameDir = nw.__dirname || process.cwd();
        const hashData = arr => {
            let h = 0;
            for (let i = 0; i < arr.length; i++) h = (Math.imul(h, 31) + (arr[i] | 0)) | 0;
            return h;
        };

        UF.Test.suite("roads", async t => {
            const cat = catalog(), W = World(), T = Tiles(), O = Objects(), H = History();
            const kind = cat && (cat.groundKinds || []).find(k => k.id === KIND);
            const bridge = O && O.type("bridge"), farm = O && O.type("farm_plot"), well = O && O.type("well");
            const sheetOk = o => !!o && !!o.tile && fs.existsSync(path.join(gameDir, "img", "tilesets", `${o.tile.sheet}.png`)) && o.tile.id >= 0 && o.tile.id <= 511;
            const catalogOk = !!kind && Array.isArray(kind.colors) && kind.colors.length >= 3 && T && T.groundBase(KIND) !== null
                && sheetOk(bridge) && bridge.passable === true && bridge.onWater === true
                && sheetOk(farm) && farm.under === true && farm.passable === true
                && sheetOk(well) && (well.tags || []).includes("workplace") && (well.tags || []).includes("water");
            t.check("catalog", catalogOk, `ground kind "${KIND}" ${kind ? `"${kind.name}" (tile base ${T ? T.groundBase(KIND) : "?"})` : "MISSING"}; bridge ${bridge ? `${bridge.tile.sheet}#${bridge.tile.id} passable ${bridge.passable} onWater ${bridge.onWater}` : "MISSING"}; farm_plot ${farm ? `${farm.tile.sheet}#${farm.tile.id} under ${farm.under} passable ${farm.passable}` : "MISSING"}; well ${well ? `${well.tile.sheet}#${well.tile.id} tags ${(well.tags || []).join("/")}` : "MISSING"}`);
            if (!catalogOk || !W || !W.state || !H) return;

            const st = W.state, a = st.startArea, size = st.size;
            const key = `${a.x},${a.y}`;
            const t0 = now();
            const map = W.buildArea(a.x, a.y);
            const buildMs = now() - t0;
            const net = Roads.network(a.x, a.y);
            const data = map.data, objects = map.ufObjects;
            const cells = size * size;
            const idx = (x, y) => y * size + x;
            const inside = (x, y) => x >= 0 && y >= 0 && x < size && y < size;
            const roadBase = T.groundBase(KIND);
            const isRoad = i => data[i] >= roadBase && data[i] < roadBase + 48;
            const bridgeType = O.typeId("bridge"), farmType = O.typeId("farm_plot"), wellType = O.typeId("well");
            const sites = H.sitesIn(a.x, a.y), living = livingSitesOf(sites);
            const home = living.find(s => s.protected) || living[0];
            const siteName = s => `${s.name || s.kind} (${s.x},${s.y})`;
            const { cls: objClass } = objectClasses();
            const walkable = i => (Tilemap.isTileA1(data[i]) ? objects[i] === bridgeType : data[5 * cells + i] !== PEAK_REGION && (!objects[i] || objClass[objects[i]] === CLS_PASS));

            // connects_sites: from the home's centre, over road cells, bridges and site discs only, every living site's centre is reached.
            const discOf = new Uint8Array(cells);
            sites.forEach((s, n) => { const r = (s.radius || 0) + 1; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inside(s.x + dx, s.y + dy)) discOf[idx(s.x + dx, s.y + dy)] = n + 1; });
            const seen = new Uint8Array(cells);
            const queue = [];
            if (home) for (const [dx, dy] of NB4) { const i = idx(home.x + dx, home.y + dy); if (walkable(i)) { seen[i] = 1; queue.push(i); } }
            for (let q = 0; q < queue.length; q++) {
                const i = queue[q], x = i % size, y = Math.floor(i / size);
                for (const [dx, dy] of NB4) {
                    if (!inside(x + dx, y + dy)) continue;
                    const n = idx(x + dx, y + dy);
                    if (seen[n] || !walkable(n) || !(isRoad(n) || objects[n] === bridgeType || discOf[n])) continue;
                    seen[n] = 1; queue.push(n);
                }
            }
            const unreachable = living.filter(s => s !== home && !NB4.some(([dx, dy]) => inside(s.x + dx, s.y + dy) && seen[idx(s.x + dx, s.y + dy)]));
            t.check("connects_sites", !!home && living.length >= 2 && unreachable.length === 0 && !!net && net.roads.length >= living.length - 1,
                `${living.length} living sites, ${net ? net.roads.length : 0} roads (${net ? net.roadCells : 0} road cells), home ${home ? siteName(home) : "NONE"}; ${queue.length} cells reached over roads, bridges and site discs; unreachable: ${unreachable.map(siteName).join(", ") || "none"}${net && net.failed.length ? `; failed: ${net.failed.map(f => `${f.from}->${f.to} ${f.reason}`).join(", ")}` : ""}`);

            // bridges_on_water_only: every bridge object stands on water; every water cell of every road has a bridge; no road tile on
            // water; and bridges exist whenever a living site can't be reached from the home over land alone (an independent BFS).
            let bridgesOnLand = 0, bridgeCells = 0, wetRoadCellsWithoutBridge = 0, roadTilesOnWater = 0;
            for (let i = 0; i < cells; i++) {
                if (objects[i] === bridgeType) { bridgeCells++; if (!Tilemap.isTileA1(data[i])) bridgesOnLand++; }
                if (isRoad(i) && Tilemap.isTileA1(data[i])) roadTilesOnWater++;
            }
            if (net) for (const r of net.roads) for (const i of r.cells) if (Tilemap.isTileA1(data[i]) && objects[i] !== bridgeType) wetRoadCellsWithoutBridge++;
            const landSeen = new Uint8Array(cells);
            const landQueue = [];
            const landOk = i => !Tilemap.isTileA1(data[i]) && data[5 * cells + i] !== PEAK_REGION && (!objects[i] || objClass[objects[i]] !== CLS_BLOCK);
            if (home) for (const [dx, dy] of NB4) { const i = idx(home.x + dx, home.y + dy); if (landOk(i)) { landSeen[i] = 1; landQueue.push(i); } }
            for (let q = 0; q < landQueue.length; q++) {
                const i = landQueue[q], x = i % size, y = Math.floor(i / size);
                for (const [dx, dy] of NB4) {
                    if (!inside(x + dx, y + dy)) continue;
                    const n = idx(x + dx, y + dy);
                    if (!landSeen[n] && landOk(n)) { landSeen[n] = 1; landQueue.push(n); }
                }
            }
            const cutOffByWater = living.filter(s => s !== home && !NB4.some(([dx, dy]) => inside(s.x + dx, s.y + dy) && landSeen[idx(s.x + dx, s.y + dy)]));
            t.check("bridges_on_water_only", bridgesOnLand === 0 && wetRoadCellsWithoutBridge === 0 && roadTilesOnWater === 0 && (bridgeCells > 0 || cutOffByWater.length === 0),
                `${bridgeCells} bridge cells in ${net ? net.bridges.length : 0} crossings (${net ? net.bridges.map(b => `${b.cells.length} at (${b.x},${b.y})`).slice(0, 6).join(", ") : ""}); ${bridgesOnLand} on land, ${wetRoadCellsWithoutBridge} water cells of a road without a bridge, ${roadTilesOnWater} road tiles on water; ${cutOffByWater.length} living sites cut off from the home by water (${cutOffByWater.map(siteName).slice(0, 4).join(", ") || "none"}), ${landQueue.length} land cells reachable without bridges`);

            // no_road_through_walls: no road cell (a painted tile, or any cell of a routed path) holds a wall or another blocking object.
            let roadTiles = 0, pathCells = 0, onWalls = 0, onBlocking = 0, firstWall = "";
            const seenPath = new Uint8Array(cells);
            const inspect = i => {
                const o = objects[i] ? O.type(objects[i]) : null;
                if (o && (o.tags || []).includes("wall")) { onWalls++; if (!firstWall) firstWall = `${o.id} at (${i % size},${Math.floor(i / size)})`; }
                else if (o && objClass[objects[i]] === CLS_BLOCK) { onBlocking++; if (!firstWall) firstWall = `${o.id} at (${i % size},${Math.floor(i / size)})`; }
            };
            for (let i = 0; i < cells; i++) if (isRoad(i)) { roadTiles++; seenPath[i] = 1; inspect(i); }
            if (net) for (const r of net.roads) for (const i of r.cells) if (!seenPath[i]) { seenPath[i] = 1; pathCells++; inspect(i); }
            t.check("no_road_through_walls", roadTiles > 0 && onWalls === 0 && onBlocking === 0, `${roadTiles} road tiles and ${pathCells} more path cells (bridges, site interiors); ${onWalls} on wall pieces, ${onBlocking} on other blocking objects${firstWall ? ` (first: ${firstWall})` : ""}`);

            // farms_and_wells: per living site, >= 2 farm plots (rectangles of farm_plot on land) and exactly one well inside the ring.
            const perSite = [];
            let farmsOk = true;
            for (const s of living) {
                const plots = net ? net.farms.filter(f => f.site === s.id) : [];
                let plotCellsOk = 0, plotCells = 0;
                for (const f of plots) for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) {
                    plotCells++;
                    const i = idx(x, y);
                    if (objects[i] === farmType && !Tilemap.isTileA1(data[i]) && cheb(x, y, s.x, s.y) > s.radius) plotCellsOk++;
                }
                let wells = 0;
                for (let dy = -(s.radius - 1); dy <= s.radius - 1; dy++) for (let dx = -(s.radius - 1); dx <= s.radius - 1; dx++) if (inside(s.x + dx, s.y + dy) && objects[idx(s.x + dx, s.y + dy)] === wellType) wells++;
                const ok = plots.length >= 2 && plotCells === plotCellsOk && plots.every(f => f.w * f.h === FARM_ALONG * FARM_DEEP) && wells === 1;
                if (!ok) farmsOk = false;
                perSite.push(`${siteName(s)}: ${plots.length} plots (${plots.filter(f => f.byRoad).length} by the road, ${plotCellsOk}/${plotCells} cells ok), ${wells} well${ok ? "" : " FAIL"}`);
            }
            t.check("farms_and_wells", living.length > 0 && farmsOk, perSite.join("; "));

            // autotile_shapes: 200 sampled road cells match the 8-neighbour rule (road or bridge = same); their land neighbours match worldgen's rule.
            const roadCells = [];
            for (let i = 0; i < cells; i++) if (isRoad(i)) roadCells.push(i);
            const step = Math.max(1, Math.floor(roadCells.length / 200));
            let sampled = 0, wrong = 0, neighbours = 0, wrongNeighbours = 0, firstErr = "";
            const kindOf = tileId => (Tilemap.isTileA2(tileId) ? Math.floor((tileId - Tilemap.TILE_ID_A2) / 48) : -1);
            const sameRoad = (x, y) => (dx, dy) => inside(x + dx, y + dy) && (isRoad(idx(x + dx, y + dy)) || objects[idx(x + dx, y + dy)] === bridgeType);
            for (let n = 0; n < roadCells.length && sampled < 200; n += step) {
                const i = roadCells[n], x = i % size, y = Math.floor(i / size);
                sampled++;
                const want = autotileShape(sameRoad(x, y)), got = (data[i] - Tilemap.TILE_ID_A1) % 48;
                if (want !== got) { wrong++; if (!firstErr) firstErr = `road (${x},${y}) shape ${got}, expected ${want}`; }
                for (const [dx, dy] of NB8) {
                    const nx = x + dx, ny = y + dy;
                    if (!inside(nx, ny) || nx < 1 || ny < 1 || nx >= size - 1 || ny >= size - 1) continue;
                    const ni = idx(nx, ny);
                    if (isRoad(ni) || Tilemap.isTileA1(data[ni])) continue;
                    if (NB8.some(([ex, ey]) => Tilemap.isTileA1(data[idx(nx + ex, ny + ey)]))) continue; // worldgen skips ground next to water too
                    const k = kindOf(data[ni]);
                    const wantN = autotileShape((ex, ey) => kindOf(data[idx(nx + ex, ny + ey)]) === k), gotN = (data[ni] - Tilemap.TILE_ID_A1) % 48;
                    neighbours++;
                    if (wantN !== gotN) { wrongNeighbours++; if (!firstErr) firstErr = `neighbour (${nx},${ny}) kind ${k} shape ${gotN}, expected ${wantN}`; }
                }
            }
            t.check("autotile_shapes", sampled >= Math.min(200, roadCells.length) && sampled > 0 && wrong === 0 && wrongNeighbours === 0,
                `${sampled} road cells sampled of ${roadCells.length}: ${wrong} wrong shapes; ${neighbours} land neighbours away from water: ${wrongNeighbours} wrong${firstErr ? `; first: ${firstErr}` : ""}`);

            // object_stats: every object the roads removed or added is booked in UF_WorldGen.stats (the generator's stats delta
            // equals the grid's change: added minus removed), so worldgen's objects_placed stays as true as it was before
            // roads. The residual between the stats and a diff-free grid is reported: it is UF_WorldGen's own (its site
            // pieces overwrite plants at the ring corners and count both) and the same without this plugin.
            const G = WorldGen();
            const savedDiffs = st.objectDiffs ? st.objectDiffs[key] : undefined;
            if (st.objectDiffs) delete st.objectDiffs[key];
            const clean = W.buildArea(a.x, a.y);
            const cleanNet = Roads.network(a.x, a.y);
            if (savedDiffs !== undefined) st.objectDiffs[key] = savedDiffs;
            let total = 0;
            for (let i = 0; i < cells; i++) if (clean.ufObjects[i]) total++;
            const statSum = G && G.stats && G.stats[key] ? Object.values(G.stats[key]).reduce((s, n) => s + n, 0) : -1;
            const booked = !!cleanNet && cleanNet.statsDelta === cleanNet.added - cleanNet.removed && cleanNet.added > 0;
            t.check("object_stats", booked, `roads removed ${cleanNet ? cleanNet.removed : "?"} objects and added ${cleanNet ? cleanNet.added : "?"} (${bridgeCells} bridge, ${net ? net.farms.length * FARM_ALONG * FARM_DEEP : "?"} farm, ${net ? net.wells.length : "?"} well cells); stats delta booked ${cleanNet ? cleanNet.statsDelta : "?"} (want ${cleanNet ? cleanNet.added - cleanNet.removed : "?"}); ${total} objects in a diff-free build, UF_WorldGen.stats sum ${statSum} (residual ${statSum - total} is worldgen's own, ${savedDiffs ? Object.keys(savedDiffs).length : 0} live object diffs set aside)`);

            // deterministic: a second build gives the same tiles, objects and road cells.
            const again = W.buildArea(a.x, a.y);
            const net2 = Roads.network(a.x, a.y);
            t.check("deterministic", hashData(again.data) === hashData(data) && hashData(again.ufObjects) === hashData(objects) && !!net2 && net2.roadCells === net.roadCells && net2.bridges.length === net.bridges.length,
                `tiles ${hashData(data)} / ${hashData(again.data)}, objects ${hashData(objects)} / ${hashData(again.ufObjects)}, road cells ${net ? net.roadCells : "?"} / ${net2 ? net2.roadCells : "?"} (seed ${st.seed})`);

            // budget: the generator's own time on this 256x256 area.
            const ms = net2 ? net2.ms : Infinity;
            t.check("budget", ms <= BUDGET_MS, `uf_roads ${ms.toFixed(0)} ms (budget ${BUDGET_MS}) for ${living.length} living sites, ${net2 ? net2.roads.length : 0} roads, ${net2 ? net2.expanded : 0} A* expansions, node cap ${NODE_CAP} hit ${net2 ? net2.capHits : 0} times; whole area build ${buildMs.toFixed(0)} ms`);

            // walkable: a test unit on screen walks along a road, over a bridge, to the road on the far bank. When this seed's
            // network needed no crossing, a test crossing is laid over the first short water run (bridges on the water, road on
            // both banks, removed afterwards) so the alias and the walk are still exercised.
            let walkDetail = "no bridge in the area", walked = false;
            const onScreen = W.currentArea() && W.sameArea(W.currentArea(), a);
            let crossing = net2 && net2.bridges.find(b => b.cells.length >= 1 && b.cells.length <= MAX_BRIDGE);
            let from = -1, to = -1, testCrossing = null;
            if (crossing) {
                const road = net2.roads.find(r => r.cells.includes(crossing.cells[0]));
                const at = road.cells.indexOf(crossing.cells[0]), atEnd = road.cells.indexOf(crossing.cells[crossing.cells.length - 1]);
                from = road.cells[Math.max(0, at - 2)]; to = road.cells[Math.min(road.cells.length - 1, atEnd + 2)];
            } else {
                // A water run of 1..MAX_BRIDGE cells along x or y with two free land cells on each side, nearest the map centre first.
                const free = i => !Tilemap.isTileA1($dataMap.data[i]) && $dataMap.data[5 * cells + i] !== PEAK_REGION && !$dataMap.ufObjects[i] && $gameMap.isPassable(i % size, Math.floor(i / size), 2);
                const wet = i => Tilemap.isTileA1($dataMap.data[i]);
                const mid = Math.floor(size / 2);
                outer: for (let ring = 1; ring < mid - 3 && !testCrossing; ring++) {
                    for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
                        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
                        const x = mid + dx, y = mid + dy;
                        if (!inside(x, y) || !wet(idx(x, y))) continue;
                        for (const [sx, sy] of [[1, 0], [0, 1]]) {
                            // Start of a run: the cell before is land.
                            if (!inside(x - sx, y - sy) || wet(idx(x - sx, y - sy))) continue;
                            let run = 0, ex = x, ey = y;
                            while (inside(ex, ey) && wet(idx(ex, ey)) && run < MAX_BRIDGE + 1) { run++; ex += sx; ey += sy; }
                            if (run > MAX_BRIDGE || !inside(ex + sx, ey + sy) || !inside(x - 2 * sx, y - 2 * sy)) continue;
                            const before = [idx(x - sx, y - sy), idx(x - 2 * sx, y - 2 * sy)], after = [idx(ex, ey), idx(ex + sx, ey + sy)];
                            if (!before.every(free) || !after.every(free)) continue;
                            const water = [];
                            for (let k = 0; k < run; k++) water.push(idx(x + k * sx, y + k * sy));
                            testCrossing = { water, banks: before.concat(after) };
                            break outer;
                        }
                    }
                }
                if (testCrossing) {
                    for (const i of testCrossing.water) W.setObject(a.x, a.y, i % size, Math.floor(i / size), bridgeType);
                    for (const i of testCrossing.banks) W.setTile(a.x, a.y, i % size, Math.floor(i / size), 0, roadBase);
                    crossing = { x: testCrossing.water[0] % size, y: Math.floor(testCrossing.water[0] / size), cells: testCrossing.water };
                    from = testCrossing.banks[1]; to = testCrossing.banks[3];
                }
            }
            if (crossing && onScreen) {
                const fx = from % size, fy = Math.floor(from / size), tx = to % size, ty = Math.floor(to / size);
                const bx = crossing.x, by = crossing.y;
                if (UF.Camera) UF.Camera.setLevel(1);
                $gamePlayer.locate(bx, by);
                await t.waitFrames(5);
                const u = W.addUnit({ name: "TEST_bridge_walker", image: { characterName: "$U7_Townsman", characterIndex: 0 }, area: a, x: fx, y: fy, dir: 2, data: { kind: "test", faction: "player" } });
                W.sendUnit(u.id, { area: a, x: tx, y: ty });
                let onBridge = false;
                await t.waitUntil(() => { if (u.area && Roads.bridgeAt(u.x, u.y)) onBridge = true; return !u.goal; }, 20000, "the walker to cross the bridge").catch(() => {});
                await t.waitFrames(2);
                walked = !u.goal && u.x === tx && u.y === ty && onBridge;
                walkDetail = `${testCrossing ? "no crossing in this seed's network, so a test crossing was laid: " : ""}from (${fx},${fy}) over the ${crossing.cells.length}-cell bridge at (${bx},${by}) to (${tx},${ty}): now at (${u.x},${u.y}), goal ${u.goal ? "still set" : "reached"}, stood on a bridge cell: ${onBridge}; bridge cell passable: ${$gameMap.isPassable(bx, by, 2)}`;
                await t.waitFrames(10);
                t.screenshot("bridge");
                W.removeUnit(u.id);
                if (testCrossing) {
                    for (const i of testCrossing.water) W.setObject(a.x, a.y, i % size, Math.floor(i / size), 0);
                    for (const i of testCrossing.banks) W.setTile(a.x, a.y, i % size, Math.floor(i / size), 0, data[i]);
                }
            } else if (crossing) walkDetail = "the start area isn't on screen";
            else if (onScreen) walkDetail = "no crossing in the network and no short water run with free banks to lay a test crossing on";
            t.check("walkable", walked, walkDetail);

            // Screenshot: the road leaving the home site through its wall gap, farm plots beside it.
            if (home && net2 && onScreen) {
                const road = net2.roads.find(r => r.from === home.id || r.to === home.id);
                let gate = null;
                if (road) {
                    const cellsFromHome = road.from === home.id ? road.cells : road.cells.slice().reverse();
                    const i = cellsFromHome.find(c => cheb(c % size, Math.floor(c / size), home.x, home.y) === home.radius + 1);
                    if (i !== undefined) gate = { x: i % size, y: Math.floor(i / size) };
                }
                if (UF.Camera) UF.Camera.setLevel(1);
                $gamePlayer.locate(gate ? gate.x : home.x, gate ? gate.y : home.y);
                await t.waitFrames(30);
                t.screenshot("home_gate");
                if (st.viewStart) $gamePlayer.locate(st.viewStart.x, st.viewStart.y);
                await t.waitFrames(5);
            }
            t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during roads checks");
        });
    }
})();
