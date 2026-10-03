"use strict";
//=============================================================================
// DEUS_Pathfinding.js - CORE-HPA hierarchical pathfinder (HPA* with HAA*-style door masks)
//=============================================================================
/*
 * Project DEUS, lane CORE-HPA (docs/lanes/CORE-HPA.md; system doc docs/systems/DEUS_Pathfinding.md). Module file: game/js/sim/pathfinding.js (UF.Sim.require("pathfinding")).
 * Standalone module: no engine, catalogue or plugin imports. Runs headless in Node (CommonJS) and, when
 * loaded in the game, publishes itself as window.DEUS.Pathfinding (window.UF is the runtime alias).
 * Nothing in the game loads it yet (2026-10-03): engine bridge DEFERRED, see the system doc.
 *
 * Scope of this build (Owner brief 2026-10-03): one z-level per search, 16x16 clusters over a wrapping
 * world (768x768 by default), entrances and an abstract graph, faction door bitmasks, a growable open
 * list that fails loudly, deterministic node-expansion budgets with resumable state machines, incremental
 * cluster rebuilds, union-find connectivity, an abstract-path cache, string-pulling smoothing and a plain
 * A* reference on the same grid. Stairs, ramps and drops (CORE-HPA phase 2) are not built: the storage
 * layer is z-aware (idx = x + y*W + (z - zMin)*W*H) so they can be added without changing the indexing.
 *
 * References studied for patterns only; licences re-verified 2026-10-03 (all MIT); no code copied:
 *   hugoscurti/hierarchical-pathfinding  MIT  cluster / entrance / intra-edge structure
 *   qiao/PathFinding.js                   MIT  binary heap, 8-way neighbour and corner rules
 *   mikolalysenko/l1-path-finder          MIT  flat typed-array search state
 *   bgrins/javascript-astar               MIT  readable A* loop
 * Papers: Botea, Mueller, Schaeffer, "Near Optimal Hierarchical Path-Finding" (2004);
 *   Harabor, Botea, "Hierarchical path planning for multi-size agents in heterogeneous environments" (2008).
 *
 * Costs are integers: 10 straight, 14 diagonal. Eight-way movement without corner cutting: a diagonal
 * step needs its target and both orthogonal intermediates passable. Tie-breaking everywhere: lower f,
 * then lower h, then lower tile index, then lower node id.
 */
(function (factory) {
    const api = factory();
    if (typeof module === "object" && module && module.exports) module.exports = api;
    if (typeof window !== "undefined" && window) {
        const ns = window.DEUS || window.UF || (window.UF = {});
        ns.Pathfinding = Object.assign(ns.Pathfinding || {}, api);
    }
})(function () {

const CLUSTER_SIZE = 16;
const COST_STRAIGHT = 10;
const COST_DIAG = 14;
const MAX_RUN = 6;                 // an entrance run wider than this is split into chunks of at most MAX_RUN
const DEFAULT_BUDGET = 2500;       // nodes expanded per tick (spec)
const LOCAL_CAP = CLUSTER_SIZE * CLUSTER_SIZE;
const EPOCH_MAX = 0x7fffffff;      // epochs are stored as tag = epoch*2 (+1 when closed) in a Uint32Array
const MAX_DOOR_CLASSES = 30;
const PRIORITY = Object.freeze({ COMBAT: 0, ORDER: 1, HAUL: 2 });
const START_NODE = 0;              // virtual abstract node ids
const GOAL_NODE = 1;
const FIRST_NODE = 2;

// Fixed neighbour order (E, W, S, N, SE, SW, NE, NW): the expansion order is part of determinism.
const DX = [1, -1, 0, 0, 1, -1, 1, -1];
const DY = [0, 0, 1, -1, 1, 1, -1, -1];
const DCOST = [10, 10, 10, 10, 14, 14, 14, 14];

function wrap(c, n) { return ((c % n) + n) % n; }

/** Signed minimal delta from `from` to `to` on a ring of n cells (+n/2 on an exact tie). */
function torusDelta(from, to, n) {
    let d = wrap(to - from, n);
    if (d > n - d) d -= n;
    return d;
}

function torusAbs(a, b, n) { const d = Math.abs(a - b); return d < n - d ? d : n - d; }

/** Integer octile cost for a displacement (no wrapping here; callers pass torus deltas). */
function octile(dx, dy) {
    dx = dx < 0 ? -dx : dx;
    dy = dy < 0 ? -dy : dy;
    return dx < dy ? COST_DIAG * dx + COST_STRAIGHT * (dy - dx) : COST_DIAG * dy + COST_STRAIGHT * (dx - dy);
}

/** FNV-1a (32-bit) over a path's tile indices, as 8 hex digits. Same path, same hash, in Node and browsers. */
function hashPath(path) {
    let h = 0x811c9dc5;
    if (path) {
        for (let i = 0; i < path.length; i++) {
            const v = path[i] | 0;
            h = Math.imul(h ^ (v & 0xff), 0x01000193);
            h = Math.imul(h ^ ((v >>> 8) & 0xff), 0x01000193);
            h = Math.imul(h ^ ((v >>> 16) & 0xff), 0x01000193);
            h = Math.imul(h ^ ((v >>> 24) & 0xff), 0x01000193);
        }
    }
    return (h >>> 0).toString(16).padStart(8, "0");
}

//-----------------------------------------------------------------------------
// Grid: flat typed arrays, wrapping x and y, zero-based z storage behind signed world z.
//-----------------------------------------------------------------------------
class Grid {
    /**
     * @param {object} [opts] width (768), height (768), depth (1), zMin (0), walkable (true: start all walkable)
     */
    constructor(opts) {
        const o = opts || {};
        this.width = (o.width | 0) || 768;
        this.height = (o.height | 0) || 768;
        this.depth = (o.depth | 0) || 1;
        this.zMin = o.zMin | 0;
        if (this.width < 2 * CLUSTER_SIZE || this.height < 2 * CLUSTER_SIZE || this.depth < 1) {
            throw new RangeError(`Grid: width and height must be at least ${2 * CLUSTER_SIZE} and depth at least 1`);
        }
        this.layer = this.width * this.height;
        this.size = this.layer * this.depth;
        this.walk = new Uint8Array(this.size);      // 1 = walkable
        this.door = new Uint32Array(this.size);     // 0 = no door, else bitmask of agents allowed through
        if (o.walkable !== false) this.walk.fill(1);
        this._listeners = [];
    }

    /** Tile index for world coordinates; x and y wrap, z must lie in [zMin, zMin + depth - 1]. */
    index(x, y, z) {
        const zs = (z === undefined ? 0 : (z | 0) - this.zMin);
        if (zs < 0 || zs >= this.depth) throw new RangeError(`Grid.index: z ${z} outside [${this.zMin}, ${this.zMin + this.depth - 1}]`);
        return wrap(x | 0, this.width) + wrap(y | 0, this.height) * this.width + zs * this.layer;
    }
    /** A tile index from a number (returned as is) or a {x, y, z} point. */
    indexOf(p) {
        if (typeof p === "number") {
            if (!Number.isInteger(p) || p < 0 || p >= this.size) throw new RangeError(`Grid.indexOf: tile index ${p} out of range`);
            return p;
        }
        if (p && typeof p === "object") return this.index(p.x, p.y, p.z === undefined ? this.zMin : p.z);
        throw new TypeError("Grid.indexOf: expected a tile index or a {x, y, z} point");
    }
    xOf(idx) { return idx % this.width; }
    yOf(idx) { return ((idx % this.layer) / this.width) | 0; }
    zOf(idx) { return ((idx / this.layer) | 0) + this.zMin; }
    toPoint(idx) { return { x: this.xOf(idx), y: this.yOf(idx), z: this.zOf(idx) }; }

    isWalkable(idx) { return this.walk[idx] === 1; }
    doorAt(idx) { return this.door[idx]; }
    /** Passable for an agent with permission bitmask `mask` (0 = passes no doors). */
    canPass(idx, mask) {
        if (this.walk[idx] !== 1) return false;
        const d = this.door[idx];
        return d === 0 || (d & mask) !== 0;
    }

    setWalkable(x, y, z, walkable) { this.setWalkableAt(this.index(x, y, z), walkable); }
    setWalkableAt(idx, walkable) {
        const v = walkable ? 1 : 0;
        if (this.walk[idx] === v) return;
        this.walk[idx] = v;
        this._changed(idx, v === 1 ? "open" : "block");
    }
    setDoor(x, y, z, mask) { this.setDoorAt(this.index(x, y, z), mask); }
    setDoorAt(idx, mask) {
        const v = mask >>> 0;
        if (this.door[idx] === v) return;
        this.door[idx] = v;
        this._changed(idx, "door");
    }
    /** Sets walkability on an inclusive rectangle (coordinates wrap). */
    fillRect(x0, y0, x1, y1, z, walkable) {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.setWalkableAt(this.index(x, y, z), walkable);
    }

    /** Listeners get (idx, kind) with kind "open" (tile became walkable), "block" (became a wall) or "door". */
    onChange(fn) { this._listeners.push(fn); return fn; }
    offChange(fn) { const i = this._listeners.indexOf(fn); if (i >= 0) this._listeners.splice(i, 1); }
    _changed(idx, kind) { for (let i = 0; i < this._listeners.length; i++) this._listeners[i](idx, kind); }
}

//-----------------------------------------------------------------------------
// OpenList: growable binary min-heap over parallel Int32Arrays. Order: f, h, key1, key2.
// It grows by doubling up to maxCapacity; past that push() returns false and sets `overflowed`.
//-----------------------------------------------------------------------------
class OpenList {
    constructor(capacity, maxCapacity) {
        this.maxCap = Math.max(16, (maxCapacity | 0) || (1 << 22));
        this.cap = Math.max(16, Math.min((capacity | 0) || 16, this.maxCap));
        this.kf = new Int32Array(this.cap);
        this.kh = new Int32Array(this.cap);
        this.k1 = new Int32Array(this.cap);
        this.k2 = new Int32Array(this.cap);
        this.size = 0;
        this.overflowed = false;
        this.grows = 0;
        this.f = 0; this.h = 0; this.id = 0; this.id2 = 0; // the last popped entry
    }
    clear() { this.size = 0; this.overflowed = false; }
    _grow() {
        if (this.cap >= this.maxCap) return false;
        const cap = Math.min(this.maxCap, this.cap * 2);
        const kf = new Int32Array(cap); kf.set(this.kf);
        const kh = new Int32Array(cap); kh.set(this.kh);
        const k1 = new Int32Array(cap); k1.set(this.k1);
        const k2 = new Int32Array(cap); k2.set(this.k2);
        this.kf = kf; this.kh = kh; this.k1 = k1; this.k2 = k2;
        this.cap = cap;
        this.grows++;
        return true;
    }
    /** < 0 when (f, h, a, b) sorts before entry j, > 0 after, 0 equal. */
    _cmp(f, h, a, b, j) {
        const fj = this.kf[j]; if (f !== fj) return f < fj ? -1 : 1;
        const hj = this.kh[j]; if (h !== hj) return h < hj ? -1 : 1;
        const aj = this.k1[j]; if (a !== aj) return a < aj ? -1 : 1;
        const bj = this.k2[j]; if (b !== bj) return b < bj ? -1 : 1;
        return 0;
    }
    push(f, h, a, b) {
        if (this.size === this.cap && !this._grow()) { this.overflowed = true; return false; }
        let i = this.size++;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (this._cmp(f, h, a, b, p) >= 0) break;
            this.kf[i] = this.kf[p]; this.kh[i] = this.kh[p]; this.k1[i] = this.k1[p]; this.k2[i] = this.k2[p];
            i = p;
        }
        this.kf[i] = f; this.kh[i] = h; this.k1[i] = a; this.k2[i] = b;
        return true;
    }
    /** Pops the smallest entry into .f .h .id .id2; false when empty. */
    pop() {
        if (this.size === 0) return false;
        this.f = this.kf[0]; this.h = this.kh[0]; this.id = this.k1[0]; this.id2 = this.k2[0];
        const last = --this.size;
        if (last > 0) {
            const f = this.kf[last], h = this.kh[last], a = this.k1[last], b = this.k2[last];
            let i = 0;
            for (;;) {
                let c = 2 * i + 1;
                if (c >= last) break;
                const r = c + 1;
                if (r < last && this._cmp(this.kf[r], this.kh[r], this.k1[r], this.k2[r], c) < 0) c = r;
                if (this._cmp(f, h, a, b, c) <= 0) break;
                this.kf[i] = this.kf[c]; this.kh[i] = this.kh[c]; this.k1[i] = this.k1[c]; this.k2[i] = this.k2[c];
                i = c;
            }
            this.kf[i] = f; this.kh[i] = h; this.k1[i] = a; this.k2[i] = b;
        }
        return true;
    }
}

//-----------------------------------------------------------------------------
// TileWorkspace: the one worker-owned closed list over the whole grid (never allocated per agent).
// mark[idx] = epoch*2 means reached in this epoch (open), epoch*2+1 means closed; any other value is untouched.
// Rollover: when the epoch would pass EPOCH_MAX the marks are cleared and the epoch restarts at 1.
//-----------------------------------------------------------------------------
class TileWorkspace {
    constructor(size) {
        this.mark = new Uint32Array(size);
        this.g = new Int32Array(size);
        this.parent = new Int32Array(size);
        this.epoch = 0;
        this.rollovers = 0;
    }
    nextEpoch() {
        if (this.epoch >= EPOCH_MAX) { this.mark.fill(0); this.epoch = 0; this.rollovers++; }
        return ++this.epoch;
    }
}

//-----------------------------------------------------------------------------
// TileSearch: resumable A* over the whole (wrapping) grid, one z-level. Also the plain-A* reference.
//-----------------------------------------------------------------------------
class TileSearch {
    constructor(grid, ws, maxOpen) {
        this.grid = grid;
        this.ws = ws;
        this.open = new OpenList(4096, maxOpen);
        this.status = "idle";
        this.expansions = 0;
        this.touch = null;      // optional Uint32Array over clusters, stamped with touchId for every expanded tile
        this.touchId = 0;
        this.cs = 0; this.cw = 0; this.cpl = 0;
    }
    begin(start, goal, mask) {
        const grid = this.grid;
        this.epoch = this.ws.nextEpoch();
        this.open.clear();
        this.start = start; this.goal = goal; this.mask = mask >>> 0;
        this.gx = grid.xOf(goal); this.gy = grid.yOf(goal);
        this.zo = goal - (goal % grid.layer);
        this.expansions = 0;
        this.status = "running";
        const ws = this.ws, tag = this.epoch * 2;
        ws.mark[start] = tag; ws.g[start] = 0; ws.parent[start] = -1;
        const h = this.h(start);
        this.open.push(h, h, start, 0);
    }
    h(idx) {
        const grid = this.grid;
        return octile(torusAbs(grid.xOf(idx), this.gx, grid.width), torusAbs(grid.yOf(idx), this.gy, grid.height));
    }
    /** Expands up to `budget` tiles; returns the number expanded. Sets status: running, found, unreachable, open_overflow. */
    run(budget) {
        const grid = this.grid, ws = this.ws, open = this.open, mask = this.mask;
        const W = grid.width, H = grid.height, walk = grid.walk, door = grid.door, zo = this.zo;
        const mark = ws.mark, g = ws.g, parent = ws.parent;
        const tag = this.epoch * 2, closedTag = tag + 1;
        const touch = this.touch, touchId = this.touchId, cs = this.cs, cw = this.cw;
        const cl0 = touch ? ((zo / grid.layer) | 0) * this.cpl : 0;
        let used = 0;
        while (this.status === "running" && used < budget) {
            if (!open.pop()) { this.status = "unreachable"; break; }
            const idx = open.id;
            if (mark[idx] === closedTag) continue;
            const gi = open.f - open.h;
            if (gi !== g[idx]) continue;              // stale duplicate entry
            mark[idx] = closedTag;
            used++;
            if (idx === this.goal) { this.status = "found"; break; }
            const x = idx % W, y = ((idx - zo) / W) | 0;
            if (touch !== null) touch[cl0 + ((x / cs) | 0) + ((y / cs) | 0) * cw] = touchId;
            for (let d = 0; d < 8; d++) {
                const nx = wrap(x + DX[d], W), ny = wrap(y + DY[d], H);
                const n = zo + nx + ny * W;
                if (mark[n] === closedTag) continue;
                if (walk[n] !== 1) continue;
                let dm = door[n];
                if (dm !== 0 && (dm & mask) === 0) continue;
                if (d >= 4) {
                    const a = zo + nx + y * W, b = zo + x + ny * W;
                    if (walk[a] !== 1 || walk[b] !== 1) continue;
                    dm = door[a]; if (dm !== 0 && (dm & mask) === 0) continue;
                    dm = door[b]; if (dm !== 0 && (dm & mask) === 0) continue;
                }
                const ng = gi + DCOST[d];
                if (mark[n] === tag && ng >= g[n]) continue;
                mark[n] = tag; g[n] = ng; parent[n] = idx;
                const nh = this.h(n);
                if (!open.push(ng + nh, nh, n, 0)) { this.status = "open_overflow"; break; }
            }
        }
        this.expansions += used;
        return used;
    }
    path() {
        if (this.status !== "found") return null;
        const out = [];
        for (let i = this.goal; i >= 0; i = this.ws.parent[i]) out.push(i);
        out.reverse();
        return out;
    }
}

//-----------------------------------------------------------------------------
// LocalSearch: resumable A* / Dijkstra inside one cluster rectangle (no wrapping inside a cluster).
// Has its own 256-entry state, so rebuilds never touch the worker's tile workspace.
//-----------------------------------------------------------------------------
class LocalSearch {
    constructor(grid) {
        this.grid = grid;
        this.mark = new Uint32Array(LOCAL_CAP);
        this.g = new Int32Array(LOCAL_CAP);
        this.parent = new Int16Array(LOCAL_CAP);
        this.targets = new Uint8Array(LOCAL_CAP);
        this.open = new OpenList(64, 1 << 13);
        this.epoch = 0;
        this.rollovers = 0;
        this.status = "idle";
        this.expansions = 0;
    }
    toLocal(idx) {
        const c = this.c, grid = this.grid;
        return (idx % grid.width - c.x0) + ((((idx % grid.layer) / grid.width) | 0) - c.y0) * c.w;
    }
    toGlobal(l) {
        const c = this.c;
        return c.zo + (c.x0 + (l % c.w)) + (c.y0 + ((l / c.w) | 0)) * this.grid.width;
    }
    pass(idx) {
        if (this.grid.walk[idx] !== 1) return false;
        const d = this.grid.door[idx];
        return d === 0 || (d & this.mask) !== 0;
    }
    /**
     * @param c cluster rectangle {x0, y0, w, h, zo}
     * @param start global tile index inside c
     * @param goal global tile index inside c, or -1 for Dijkstra to all tiles
     * @param mask agent permission mask
     * @param targetTiles optional global tiles; a Dijkstra stops once all of them are closed ("complete")
     */
    begin(c, start, goal, mask, targetTiles) {
        if (this.epoch >= EPOCH_MAX) { this.mark.fill(0); this.epoch = 0; this.rollovers++; }
        this.epoch++;
        this.c = c; this.mask = mask >>> 0; this.goal = goal;
        this.open.clear();
        this.expansions = 0;
        this.startLocal = this.toLocal(start);
        this.goalLocal = goal >= 0 ? this.toLocal(goal) : -1;
        this.useTargets = false;
        this.targetCount = 0;
        if (targetTiles) {
            this.targets.fill(0, 0, c.w * c.h);
            for (let i = 0; i < targetTiles.length; i++) {
                const l = this.toLocal(targetTiles[i]);
                if (this.targets[l] === 0) { this.targets[l] = 1; this.targetCount++; }
            }
            this.useTargets = true;
            if (this.targetCount === 0) { this.status = "complete"; return; }
        }
        if (!this.pass(start)) { this.status = goal >= 0 ? "unreachable" : "complete"; return; }
        this.status = "running";
        const tag = this.epoch * 2, ls = this.startLocal;
        this.mark[ls] = tag; this.g[ls] = 0; this.parent[ls] = -1;
        const h = this.h(ls);
        this.open.push(h, h, ls, 0);
    }
    h(l) {
        if (this.goalLocal < 0) return 0;
        const w = this.c.w;
        return octile((l % w) - (this.goalLocal % w), ((l / w) | 0) - ((this.goalLocal / w) | 0));
    }
    run(budget) {
        const c = this.c, w = c.w, hh = c.h, open = this.open;
        const mark = this.mark, g = this.g, parent = this.parent;
        const tag = this.epoch * 2, closedTag = tag + 1;
        let used = 0;
        while (this.status === "running" && used < budget) {
            if (!open.pop()) { this.status = this.goalLocal >= 0 ? "unreachable" : "complete"; break; }
            const l = open.id;
            if (mark[l] === closedTag) continue;
            const gl = open.f - open.h;
            if (gl !== g[l]) continue;
            mark[l] = closedTag;
            used++;
            if (l === this.goalLocal) { this.status = "found"; break; }
            if (this.useTargets && this.targets[l] === 1 && --this.targetCount === 0) { this.status = "complete"; break; }
            const lx = l % w, ly = (l / w) | 0;
            for (let d = 0; d < 8; d++) {
                const nx = lx + DX[d], ny = ly + DY[d];
                if (nx < 0 || ny < 0 || nx >= w || ny >= hh) continue;
                const nl = nx + ny * w;
                if (mark[nl] === closedTag) continue;
                if (!this.pass(this.toGlobal(nl))) continue;
                if (d >= 4 && (!this.pass(this.toGlobal(nx + ly * w)) || !this.pass(this.toGlobal(lx + ny * w)))) continue;
                const ng = gl + DCOST[d];
                if (mark[nl] === tag && ng >= g[nl]) continue;
                mark[nl] = tag; g[nl] = ng; parent[nl] = l;
                const nh = this.h(nl);
                if (!open.push(ng + nh, nh, nl, 0)) { this.status = "open_overflow"; break; }
            }
        }
        this.expansions += used;
        return used;
    }
    /** Final cost to a closed tile of this search, else -1. */
    gAt(idx) {
        const l = this.toLocal(idx);
        return this.mark[l] === this.epoch * 2 + 1 ? this.g[l] : -1;
    }
    /** Global tile indices from the start to `toIdx` (which must be closed). */
    path(toIdx) {
        const out = [];
        for (let l = this.toLocal(toIdx); l >= 0; l = this.parent[l]) out.push(this.toGlobal(l));
        out.reverse();
        return out;
    }
}

//-----------------------------------------------------------------------------
// Pathfinder: clusters, entrances, abstract graph, searches, incremental rebuilds.
//-----------------------------------------------------------------------------
const PH = Object.freeze({ INIT: 0, PLAIN: 1, START_LINKS: 2, GOAL_LINKS: 3, ABSTRACT_INIT: 4, ABSTRACT: 5, REFINE: 6, SMOOTH: 7, DONE: 8 });

class Pathfinder {
    /**
     * @param {Grid} grid
     * @param {object} [opts]
     *   maxOpen (1<<22) open-list entry cap for every heap; past it a search ends with status "open_overflow"
     *   shortQueryTiles (32) queries at most this Chebyshev distance apart run plain A* first
     *   shortQueryMaxExpansions (4096) plain A* expansion cap before falling back to the hierarchy
     *   smoothWindow (32) how far string-pulling looks ahead; 0 disables smoothing
     *   cache (true) abstract-path cache by (startCluster, goalCluster, mask)
     *   cacheLimit (4096) entries; the cache is emptied when it grows past this
     *   useConnectivity (true) fast-fail on fresh union-find components
     *   autoConnectivity (true) rebuild components at the end of every build()/flush()
     */
    constructor(grid, opts) {
        if (!(grid instanceof Grid)) throw new TypeError("Pathfinder: expected a Grid");
        const o = opts || {};
        this.grid = grid;
        this.cs = CLUSTER_SIZE;
        this.maxOpen = (o.maxOpen | 0) || (1 << 22);
        this.shortQueryTiles = o.shortQueryTiles === undefined ? 32 : (o.shortQueryTiles | 0);
        this.shortQueryMaxExpansions = o.shortQueryMaxExpansions === undefined ? 4096 : (o.shortQueryMaxExpansions | 0);
        this.smoothWindow = o.smoothWindow === undefined ? 32 : (o.smoothWindow | 0);
        this.cacheEnabled = o.cache !== false;
        this.cacheLimit = o.cacheLimit === undefined ? 4096 : (o.cacheLimit | 0);
        this.useConnectivity = o.useConnectivity !== false;
        this.autoConnectivity = o.autoConnectivity !== false;

        this.cw = Math.ceil(grid.width / this.cs);
        this.ch = Math.ceil(grid.height / this.cs);
        this.clustersPerLayer = this.cw * this.ch;
        this.clusterCount = this.clustersPerLayer * grid.depth;
        this.clusters = new Array(this.clusterCount);
        this.borders = new Array(this.clusterCount * 2);
        for (let id = 0; id < this.clusterCount; id++) {
            const zs = (id / this.clustersPerLayer) | 0;
            const r = id % this.clustersPerLayer;
            const cx = r % this.cw, cy = (r / this.cw) | 0;
            const x0 = cx * this.cs, y0 = cy * this.cs;
            const c = {
                id, cx, cy, zs, x0, y0,
                w: Math.min(this.cs, grid.width - x0),
                h: Math.min(this.cs, grid.height - y0),
                zo: zs * grid.layer,
                nodes: [],
                doorMasks: [],
                classes: new Map()
            };
            this.clusters[id] = c;
            const right = zs * this.clustersPerLayer + wrap(cx + 1, this.cw) + cy * this.cw;
            const bottom = zs * this.clustersPerLayer + cx + wrap(cy + 1, this.ch) * this.cw;
            this.borders[id * 2] = { owner: id, other: right, side: 0, positions: [], nodesA: [], nodesB: [] };
            this.borders[id * 2 + 1] = { owner: id, other: bottom, side: 1, positions: [], nodesA: [], nodesB: [] };
        }

        // Abstract nodes: ids 0 and 1 are the virtual start and goal; real nodes start at FIRST_NODE.
        this.nodeCap = 1024;
        this.nodeTile = new Int32Array(this.nodeCap);
        this.nodeCluster = new Int32Array(this.nodeCap);
        this.nodePair = new Int32Array(this.nodeCap);
        this.nodeLocal = new Int32Array(this.nodeCap);
        this.nodeAlive = new Uint8Array(this.nodeCap);
        this.nodeComp = new Int32Array(this.nodeCap);
        this.nodeBorn = new Int32Array(this.nodeCap);     // graphVersion at which the id was (re)allocated
        this.nodeMark = new Uint32Array(this.nodeCap);
        this.nodeG = new Int32Array(this.nodeCap);
        this.nodeParent = new Int32Array(this.nodeCap);
        this.nodeHigh = FIRST_NODE;
        this.freeIds = [];
        this.aliveNodes = 0;
        this.nodeEpoch = 0;
        this.nodeRollovers = 0;

        this.ws = new TileWorkspace(grid.size);
        this.tileSearch = new TileSearch(grid, this.ws, this.maxOpen);
        this.local = new LocalSearch(grid);          // owned by the in-flight search
        this.localRebuild = new LocalSearch(grid);   // owned by cluster rebuilds
        this.localRefine = new LocalSearch(grid);    // owned by lazy refineNext() calls (synchronous, one hop each)
        this.abstractOpen = new OpenList(1024, this.maxOpen);

        this.dirty = new Set();
        this.splitSuspected = false;   // a blocking or door edit since the last flush: components may have split
        this.graphVersion = 0;
        this.entranceEpoch = 0;        // bumps when a border rescan replaces entrance nodes
        this.clusterVersion = new Uint32Array(this.clusterCount);   // graphVersion at which each cluster was last rebuilt
        this.touchStamp = new Uint32Array(this.clusterCount);       // search id that last touched each cluster
        this.searchSeq = 0;
        this.freedThisFlush = 0;       // node ids freed since the last flush: a recycled id can split a union-find chain
        this.tileSearch.touch = this.touchStamp; this.tileSearch.cs = this.cs; this.tileSearch.cw = this.cw; this.tileSearch.cpl = this.clustersPerLayer;
        this.built = false;
        this.connectivityStale = true;
        this.cache = new Map();
        this.inflight = null;
        this.metrics = this._freshMetrics();
        this._listener = grid.onChange((idx, kind) => this._onTileChange(idx, kind));
    }

    _freshMetrics() {
        return {
            searches: 0, found: 0, unreachable: 0, blocked: 0,
            expansions: 0, lastExpansions: 0,
            plainQueries: 0, plainFallbacks: 0, hpaQueries: 0, directQueries: 0,
            openListOverflow: 0,
            clusterRebuilds: 0, borderRescans: 0, entranceChanges: 0, classTables: 0, rebuildExpansions: 0,
            cacheHits: 0, cacheMisses: 0, cacheStores: 0,
            connectivityRebuilds: 0, connectivityMerges: 0, connectivityFastFails: 0,
            restarts: 0, refineFailures: 0, schedulerStalls: 0, nodesFreed: 0
        };
    }
    resetMetrics() { this.metrics = this._freshMetrics(); }

    /** Read-only numbers for reports: clusters, live abstract nodes, epochs and rollovers. */
    stats() {
        return {
            clusters: this.clusterCount, nodes: this.aliveNodes, nodeCapacity: this.nodeCap,
            graphVersion: this.graphVersion, built: this.built, dirty: this.dirty.size,
            connectivityStale: this.connectivityStale, cacheEntries: this.cache.size,
            tileEpoch: this.ws.epoch, tileEpochRollovers: this.ws.rollovers,
            nodeEpoch: this.nodeEpoch, nodeEpochRollovers: this.nodeRollovers,
            localEpochRollovers: this.local.rollovers + this.localRebuild.rollovers
        };
    }

    clusterOf(idx) {
        const grid = this.grid;
        const x = idx % grid.width, y = ((idx % grid.layer) / grid.width) | 0, zs = (idx / grid.layer) | 0;
        return zs * this.clustersPerLayer + ((x / this.cs) | 0) + ((y / this.cs) | 0) * this.cw;
    }
    _leftRec(c) { return this.borders[(c.zs * this.clustersPerLayer + wrap(c.cx - 1, this.cw) + c.cy * this.cw) * 2]; }
    _topRec(c) { return this.borders[(c.zs * this.clustersPerLayer + c.cx + wrap(c.cy - 1, this.ch) * this.cw) * 2 + 1]; }

    //--- nodes -------------------------------------------------------------------------------------------------
    _growNodes() {
        const cap = this.nodeCap * 2;
        const grow = (old, Ctor) => { const a = new Ctor(cap); a.set(old); return a; };
        this.nodeTile = grow(this.nodeTile, Int32Array);
        this.nodeCluster = grow(this.nodeCluster, Int32Array);
        this.nodePair = grow(this.nodePair, Int32Array);
        this.nodeLocal = grow(this.nodeLocal, Int32Array);
        this.nodeAlive = grow(this.nodeAlive, Uint8Array);
        this.nodeComp = grow(this.nodeComp, Int32Array);
        this.nodeMark = grow(this.nodeMark, Uint32Array);
        this.nodeG = grow(this.nodeG, Int32Array);
        this.nodeParent = grow(this.nodeParent, Int32Array);
        this.nodeBorn = grow(this.nodeBorn, Int32Array);
        this.nodeCap = cap;
    }
    _allocNode(tile, cluster) {
        let id;
        if (this.freeIds.length > 0) id = this.freeIds.pop();
        else {
            if (this.nodeHigh === this.nodeCap) this._growNodes();
            id = this.nodeHigh++;
        }
        this.nodeTile[id] = tile; this.nodeCluster[id] = cluster; this.nodePair[id] = -1; this.nodeLocal[id] = -1;
        this.nodeAlive[id] = 1;
        this.nodeComp[id] = id;        // a fresh singleton for the incremental union-find
        this.nodeBorn[id] = this.graphVersion + 1;   // allocation happens inside build()/flush(), which bump the version after
        this.nodeMark[id] = 0; this.nodeG[id] = -1; this.nodeParent[id] = -1;   // a paused open-list entry for this id must not expand the new node
        this.aliveNodes++;
        return id;
    }
    _freeNode(id) {
        if (this.nodeAlive[id] !== 1) return;
        this.nodeAlive[id] = 0;
        this.nodePair[id] = -1;
        this.aliveNodes--;
        this.freeIds.push(id);
        this.freedThisFlush++;
        this.metrics.nodesFreed++;
    }

    //--- building ----------------------------------------------------------------------------------------------
    _scanDoorMasks(c) {
        const grid = this.grid, W = grid.width, door = grid.door;
        const seen = new Set();
        for (let y = 0; y < c.h; y++) {
            let idx = c.zo + c.x0 + (c.y0 + y) * W;
            for (let x = 0; x < c.w; x++, idx++) { const d = door[idx]; if (d !== 0) seen.add(d); }
        }
        c.doorMasks = Array.from(seen).sort((a, b) => a - b);
    }
    _borderTiles(rec, pos) {
        const grid = this.grid, W = grid.width, c = this.clusters[rec.owner];
        if (rec.side === 0) {
            const y = c.y0 + pos;
            return [c.zo + (c.x0 + c.w - 1) + y * W, c.zo + wrap(c.x0 + c.w, W) + y * W];
        }
        const x = c.x0 + pos;
        return [c.zo + x + (c.y0 + c.h - 1) * W, c.zo + x + wrap(c.y0 + c.h, grid.height) * W];
    }
    /**
     * Rescans one shared border; true when its entrance set changed (nodes were replaced).
     * A run is a maximal stretch of positions whose two tiles are both walkable and door-free; a run gets one
     * node at its centre, or one per chunk of at most MAX_RUN. A position with a door on either tile is its
     * own one-wide entrance, so agents without the key still get the open tiles beside the door.
     */
    _rescanBorder(rec) {
        const grid = this.grid, walk = grid.walk, door = grid.door, c = this.clusters[rec.owner];
        const len = rec.side === 0 ? c.h : c.w;
        const positions = [];
        let runStart = -1;
        this.metrics.borderRescans++;
        const closeRun = end => {
            const L = end - runStart;
            const chunks = Math.ceil(L / MAX_RUN);
            for (let k = 0; k < chunks; k++) {
                const a = runStart + Math.floor(k * L / chunks);
                const b = runStart + Math.floor((k + 1) * L / chunks) - 1;
                positions.push(a + ((b - a) >> 1));
            }
        };
        for (let i = 0; i <= len; i++) {
            let open = false, doorway = false;
            if (i < len) {
                const t = this._borderTiles(rec, i);
                open = walk[t[0]] === 1 && walk[t[1]] === 1;
                doorway = open && (door[t[0]] !== 0 || door[t[1]] !== 0);
            }
            if (open && !doorway) { if (runStart < 0) runStart = i; continue; }
            if (runStart >= 0) { closeRun(i); runStart = -1; }
            if (doorway) positions.push(i);
        }
        let same = positions.length === rec.positions.length;
        for (let i = 0; same && i < positions.length; i++) same = positions[i] === rec.positions[i];
        if (same) return false;
        for (let i = 0; i < rec.nodesA.length; i++) { this._freeNode(rec.nodesA[i]); this._freeNode(rec.nodesB[i]); }
        rec.positions = positions;
        rec.nodesA = []; rec.nodesB = [];
        for (let i = 0; i < positions.length; i++) {
            const t = this._borderTiles(rec, positions[i]);
            const a = this._allocNode(t[0], rec.owner);
            const b = this._allocNode(t[1], rec.other);
            this.nodePair[a] = b; this.nodePair[b] = a;
            rec.nodesA.push(a); rec.nodesB.push(b);
        }
        this.metrics.entranceChanges++;
        this.entranceEpoch++;   // node ids on this border were freed and may be reused; outstanding macro paths must not keep them
        return true;
    }
    _rebuildIntra(c) {
        const right = this.borders[c.id * 2], bottom = this.borders[c.id * 2 + 1];
        const left = this._leftRec(c), top = this._topRec(c);
        c.nodes = right.nodesA.concat(bottom.nodesA, left.nodesB, top.nodesB);
        for (let i = 0; i < c.nodes.length; i++) this.nodeLocal[c.nodes[i]] = i;
        c.classes.clear();
        this._classTable(c, 0);
        this.metrics.clusterRebuilds++;
        this.clusterVersion[c.id] = this.graphVersion + 1;   // the flush (or build) bumps graphVersion right after its rebuilds
    }
    _classKey(c, mask) {
        const masks = c.doorMasks;
        if (masks.length === 0) return 0;
        if (masks.length > MAX_DOOR_CLASSES) throw new RangeError(`Pathfinding: cluster ${c.id} has ${masks.length} distinct door masks (limit ${MAX_DOOR_CLASSES})`);
        let key = 0;
        for (let i = 0; i < masks.length; i++) if ((masks[i] & mask) !== 0) key |= (1 << i);
        return key;
    }
    /** The intra-cluster edge table for the agent's door class: CSR arrays over local node indices. */
    _classTable(c, mask) {
        const key = this._classKey(c, mask);
        let t = c.classes.get(key);
        if (t) return t;
        const n = c.nodes.length;
        const lists = new Array(n);
        for (let i = 0; i < n; i++) lists[i] = [];
        const tiles = new Array(n);
        for (let i = 0; i < n; i++) tiles[i] = this.nodeTile[c.nodes[i]];
        const ls = this.localRebuild;
        for (let i = 0; i < n - 1; i++) {
            if (!this.grid.canPass(tiles[i], mask)) continue;
            const targets = [];
            for (let j = i + 1; j < n; j++) if (this.grid.canPass(tiles[j], mask)) targets.push(tiles[j]);
            if (targets.length === 0) continue;
            ls.begin(c, tiles[i], -1, mask, targets);
            ls.run(LOCAL_CAP + 1);
            this.metrics.rebuildExpansions += ls.expansions;
            for (let j = i + 1; j < n; j++) {
                const g = ls.gAt(tiles[j]);
                if (g < 0) continue;
                lists[i].push(j, g);
                lists[j].push(i, g);
            }
        }
        let m = 0;
        for (let i = 0; i < n; i++) m += lists[i].length >> 1;
        const off = new Int32Array(n + 1), to = new Int32Array(m), cost = new Int32Array(m);
        let k = 0;
        for (let i = 0; i < n; i++) {
            off[i] = k;
            const l = lists[i];
            for (let e = 0; e < l.length; e += 2) { to[k] = l[e]; cost[k] = l[e + 1]; k++; }
        }
        off[n] = k;
        t = { key, off, to, cost };
        c.classes.set(key, t);
        this.metrics.classTables++;
        return t;
    }

    /** Full build from the grid: every cluster, every border. Runs once; flush() handles edits afterwards. */
    build() {
        for (let id = 0; id < this.clusterCount; id++) this._scanDoorMasks(this.clusters[id]);
        for (let id = 0; id < this.clusterCount; id++) {
            this._rescanBorder(this.borders[id * 2]);
            this._rescanBorder(this.borders[id * 2 + 1]);
        }
        for (let id = 0; id < this.clusterCount; id++) this._rebuildIntra(this.clusters[id]);
        this.dirty.clear();
        this.splitSuspected = false;
        this.freedThisFlush = 0;
        this.graphVersion++;
        this.cache.clear();
        this.connectivityStale = true;
        if (this.autoConnectivity) this.rebuildConnectivity();
        this.built = true;
        return this.clusterCount;
    }
    _onTileChange(idx, kind) {
        this.dirty.add(this.clusterOf(idx));
        if (kind !== "open") this.splitSuspected = true;   // a wall or a door change can only remove ways through
    }
    /**
     * Tick start: rebuilds the clusters whose tiles changed since the last flush (and the intra tables of a
     * neighbour whose shared entrance set changed). Returns the number of clusters whose tables were rebuilt.
     * Connectivity: open-only edits are unioned in place when they freed no node id. A freed id can sit in a
     * live union-find chain, so any recycle, wall or door edit marks connectivity stale.
     */
    flush() {
        if (!this.built) return this.build();
        if (this.dirty.size === 0) return 0;
        const ids = Array.from(this.dirty).sort((a, b) => a - b);
        this.dirty.clear();
        const intra = new Set(ids);
        for (let i = 0; i < ids.length; i++) {
            const c = this.clusters[ids[i]];
            this._scanDoorMasks(c);
            const recs = [this.borders[c.id * 2], this.borders[c.id * 2 + 1], this._leftRec(c), this._topRec(c)];
            for (let r = 0; r < 4; r++) {
                if (this._rescanBorder(recs[r])) { intra.add(recs[r].owner); intra.add(recs[r].other); }
            }
        }
        const order = Array.from(intra).sort((a, b) => a - b);
        for (let i = 0; i < order.length; i++) this._rebuildIntra(this.clusters[order[i]]);
        this.graphVersion++;
        this.cache.clear();          // version stamps also make stale entries miss; clearing bounds memory
        // Merge-only unions are exact only while no node id was freed: a freed id can sit inside a live
        // union-find chain, and reusing it would split that component. Any recycle forces a rebuild.
        if (this.splitSuspected || this.freedThisFlush > 0) this.connectivityStale = true;
        else if (!this.connectivityStale) this._mergeConnectivity(order);
        this.splitSuspected = false;
        this.freedThisFlush = 0;
        return order.length;
    }

    //--- connectivity (union-find over abstract nodes, every door open: a conservative "unreachable" only) ----
    _find(i) {
        const parent = this.nodeComp;
        while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
        return i;
    }
    _union(a, b) {
        a = this._find(a); b = this._find(b);
        if (a !== b) { if (a < b) this.nodeComp[b] = a; else this.nodeComp[a] = b; }
    }
    _unionCluster(c) {
        if (c.nodes.length === 0) return;
        const t = this._classTable(c, -1);   // every door open
        for (let i = 0; i < c.nodes.length; i++) {
            for (let e = t.off[i]; e < t.off[i + 1]; e++) this._union(c.nodes[i], c.nodes[t.to[e]]);
            this._union(c.nodes[i], this.nodePair[c.nodes[i]]);
        }
    }
    /** Full rebuild of the components over every live abstract node. */
    rebuildConnectivity() {
        for (let i = 0; i < this.nodeHigh; i++) this.nodeComp[i] = i;
        for (let id = 0; id < this.clusterCount; id++) this._unionCluster(this.clusters[id]);
        this.connectivityStale = false;
        this.metrics.connectivityRebuilds++;
    }
    /** Merge-only update after digs: unions the rebuilt clusters' edges into the live components. */
    _mergeConnectivity(clusterIds) {
        for (let i = 0; i < clusterIds.length; i++) this._unionCluster(this.clusters[clusterIds[i]]);
        this.metrics.connectivityMerges++;
    }
    /** Component id of a live abstract node (meaningful while connectivityStale is false). */
    componentOf(nodeId) { return this._find(nodeId); }

    //--- searches ----------------------------------------------------------------------------------------------
    _ensureReady() {
        if (!this.built) this.build();
        else if (this.dirty.size > 0) this.flush();
    }
    /**
     * Creates a resumable search (a plain state machine). step(budget) expands at most `budget` nodes and
     * returns how many it used; read .status ("running", "found", "unreachable", "blocked", "open_overflow",
     * "abandoned") and result(). One search at a time owns the worker's workspaces.
     */
    beginSearch(start, goal, opts) {
        if (this.inflight && this.inflight.status === "running") {
            throw new Error("Pathfinder.beginSearch: a search is already in flight; finish or abandon() it first");
        }
        this._ensureReady();
        const s = new Search(this, this.grid.indexOf(start), this.grid.indexOf(goal), opts || {});
        this.inflight = s;
        return s;
    }
    /** One-shot hierarchical search. Returns the result object (see Search.result()). */
    findPath(start, goal, opts) {
        const s = this.beginSearch(start, goal, opts);
        while (s.status === "running") {
            if (s.step(1 << 30) === 0 && s.status === "running") throw new Error("Pathfinding: search made no progress");
        }
        return s.result();
    }
    /** Plain A* on the tile grid with the same rules (the optimality reference). */
    findPathAStar(start, goal, opts) {
        if (this.inflight && this.inflight.status === "running") {
            throw new Error("Pathfinder.findPathAStar: a hierarchical search is in flight; finish or abandon() it first");
        }
        const o = opts || {};
        const mask = (o.mask | 0) >>> 0;
        const s = this.grid.indexOf(start), g = this.grid.indexOf(goal);
        const maxExpansions = o.maxExpansions === undefined ? 1 << 30 : (o.maxExpansions | 0);
        if (this.grid.zOf(s) !== this.grid.zOf(g)) throw new Error("Pathfinding: cross-level search is not built (CORE-HPA phase 2)");
        if (!this.grid.canPass(s, mask) || !this.grid.canPass(g, mask)) {
            return { status: "blocked", path: null, cost: -1, expansions: 0, mode: "plain" };
        }
        if (s === g) return { status: "found", path: [s], cost: 0, expansions: 0, mode: "plain" };
        const ts = this.tileSearch;
        ts.begin(s, g, mask);
        const used = ts.run(maxExpansions);
        this.metrics.expansions += used;
        let status = ts.status;
        if (status === "running") status = "exhausted";
        if (status === "open_overflow") this.metrics.openListOverflow++;
        const path = ts.path();
        return { status, path, cost: path ? pathCost(this.grid, path) : -1, expansions: used, mode: "plain" };
    }
    /**
     * Cave-in escape: the nearest passable tile within `radius` (1..3) Chebyshev steps of (x, y, z), by octile
     * distance then tile index; null when there is none (the caller's status is then "stuck", provisional).
     */
    nearestOpen(x, y, z, mask, radius) {
        const grid = this.grid, r = Math.max(1, Math.min(3, radius === undefined ? 3 : radius | 0));
        const m = (mask | 0) >>> 0;
        let best = -1, bestD = 0;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx === 0 && dy === 0) continue;
                const idx = grid.index(x + dx, y + dy, z);
                if (!grid.canPass(idx, m)) continue;
                const d = octile(dx, dy);
                if (best < 0 || d < bestD || (d === bestD && idx < best)) { best = idx; bestD = d; }
            }
        }
        return best < 0 ? null : best;
    }

    /** Canonical description of the abstract graph (entrance tile pairs and class-0 intra edges) for tests. */
    snapshotGraph() {
        const entrances = [];
        for (let i = 0; i < this.borders.length; i++) {
            const rec = this.borders[i];
            for (let k = 0; k < rec.nodesA.length; k++) entrances.push([this.nodeTile[rec.nodesA[k]], this.nodeTile[rec.nodesB[k]]]);
        }
        entrances.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const intra = [];
        for (let id = 0; id < this.clusterCount; id++) {
            const c = this.clusters[id];
            const t = c.classes.get(0);
            if (!t) continue;
            for (let i = 0; i < c.nodes.length; i++) {
                for (let e = t.off[i]; e < t.off[i + 1]; e++) {
                    const a = this.nodeTile[c.nodes[i]], b = this.nodeTile[c.nodes[t.to[e]]];
                    if (a < b) intra.push([a, b, t.cost[e]]);
                }
            }
        }
        intra.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
        return { entrances, intra };
    }

    /** Smoothing legality: the canonical octile move sequence from tile a to tile b, or null if any step is illegal. */
    _octileMoves(a, b, mask, out) {
        const grid = this.grid, W = grid.width, H = grid.height;
        const zo = a - (a % grid.layer);
        let x = grid.xOf(a), y = grid.yOf(a);
        const dx = torusDelta(x, grid.xOf(b), W), dy = torusDelta(y, grid.yOf(b), H);
        const ax = dx < 0 ? -dx : dx, ay = dy < 0 ? -dy : dy;
        const sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
        const major = ax > ay ? ax : ay, minor = ax > ay ? ay : ax;
        const xMajor = ax >= ay;
        let err = 0;
        out.length = 0;
        for (let k = 0; k < major; k++) {
            err += minor;
            let mx = 0, my = 0;
            if (2 * err >= major) { err -= major; mx = sx; my = sy; }
            else if (xMajor) mx = sx; else my = sy;
            const nx = wrap(x + mx, W), ny = wrap(y + my, H);
            const n = zo + nx + ny * W;
            if (!grid.canPass(n, mask)) return null;
            if (mx !== 0 && my !== 0 && (!grid.canPass(zo + nx + y * W, mask) || !grid.canPass(zo + x + ny * W, mask))) return null;
            out.push(n);
            x = nx; y = ny;
        }
        return out;
    }
}

//-----------------------------------------------------------------------------
// Search: the resumable state machine for one hierarchical query.
//-----------------------------------------------------------------------------
class Search {
    constructor(pf, start, goal, opts) {
        this.pf = pf;
        this.grid = pf.grid;
        this.start = start;
        this.goal = goal;
        this.mask = (opts.mask | 0) >>> 0;
        this.cacheEnabled = opts.cache === undefined ? pf.cacheEnabled : !!opts.cache;
        this.smoothWindow = opts.smoothWindow === undefined ? pf.smoothWindow : (opts.smoothWindow | 0);
        this.shortQueryTiles = opts.shortQueryTiles === undefined ? pf.shortQueryTiles : (opts.shortQueryTiles | 0);
        this.lazy = !!opts.lazy;       // found = abstract path ready; the caller refines portal by portal with refineNext()
        this.refined = false;
        if (this.grid.zOf(start) !== this.grid.zOf(goal)) throw new Error("Pathfinding: cross-level search is not built (CORE-HPA phase 2)");
        this.status = "running";
        this.expansions = 0;
        this.mode = "hpa";
        this.reason = "";
        this.path = null;
        this.cost = -1;
        this.abstractPath = null;
        this._reset();
        pf.metrics.searches++;
    }
    _reset() {
        this.phase = PH.INIT;
        this.version = this.pf.graphVersion;
        this.entranceEpoch = this.pf.entranceEpoch;
        this.id = ++this.pf.searchSeq;            // a fresh id: nothing is touched yet
        this.startCluster = this.pf.clusterOf(this.start);
        this.goalCluster = this.pf.clusterOf(this.goal);
        this.pf.touchStamp[this.startCluster] = this.id;
        this.pf.touchStamp[this.goalCluster] = this.id;
        this.expanded = [];          // abstract node ids this search has expanded; a flush that recycles one restarts it
        this.startLinks = null;
        this.goalLinks = null;
        this.directCost = -1;
        this.segIndex = 0;
        this.segOpen = false;
        this.segTo = -1;
        this.plainLeft = 0;
        this.smoothIndex = 0;
        this.smoothOut = null;
        // A restart must not keep tiles from the attempt that just died. Non-found results stay pathless.
        this.path = null;
        this.cost = -1;
        this.abstractPath = null;
        this.mode = "hpa";
        this.reason = "";
        this.refined = false;
    }
    _restart() { this._reset(); this.restartCount = (this.restartCount | 0) + 1; this.pf.metrics.restarts++; }
    /**
     * A paused search keeps going after a flush unless the rebuild hit something it stands on: its start or
     * goal cluster (the links were computed there), a cluster whose tiles it has expanded (plain phase), an
     * abstract node it has already expanded that this flush freed or reused, or a cluster or node on its
     * current abstract path. An interior rebuild that keeps those node ids does not restart the abstract
     * search: later expansions read the live tables, a sealed hop restarts at refinement, and a parent cycle
     * restarts immediately. Replacement entrances the search has not expanded stay usable, because allocation
     * clears that id's search marks so a stale open-list entry cannot expand the new node.
     */
    _graphStillValid() {
        const pf = this.pf, ver = this.version;
        if (ver === pf.graphVersion) return true;
        const cv = pf.clusterVersion;
        if (cv[this.startCluster] > ver || cv[this.goalCluster] > ver) return false;
        if (this.phase === PH.PLAIN) {
            const stamp = pf.touchStamp, id = this.id;
            for (let c = 0; c < pf.clusterCount; c++) if (stamp[c] === id && cv[c] > ver) return false;
        }
        if (this.phase === PH.ABSTRACT && this.expanded) {
            const exp = this.expanded;
            for (let i = 0; i < exp.length; i++) {
                const n = exp[i];
                if (pf.nodeAlive[n] !== 1 || pf.nodeBorn[n] > ver) return false;
            }
        }
        const nodes = this.abstractPath;
        if (nodes) {
            for (let i = 1; i < nodes.length - 1; i++) {
                const n = nodes[i];
                if (this._nodeStale(n) || cv[pf.nodeCluster[n]] > ver) return false;
            }
        }
        this.version = pf.graphVersion;
        return true;
    }
    /** A committed-path id that was freed, or reallocated after the version this search has accepted. */
    _nodeStale(n) { return n >= FIRST_NODE && (this.pf.nodeAlive[n] !== 1 || this.pf.nodeBorn[n] > this.version); }
    /** Every step adjacent (torus), passable for the mask, and no cut corner. */
    _stepsValid(path) {
        const grid = this.grid, m = this.mask, W = grid.width, H = grid.height;
        for (let i = 0; i < path.length; i++) {
            if (!grid.canPass(path[i], m)) return false;
            if (i === 0) continue;
            const a = path[i - 1], t = path[i];
            if (grid.zOf(a) !== grid.zOf(t)) return false;
            const dx = torusDelta(grid.xOf(a), grid.xOf(t), W), dy = torusDelta(grid.yOf(a), grid.yOf(t), H);
            if (dx < -1 || dx > 1 || dy < -1 || dy > 1 || (dx === 0 && dy === 0)) return false;
            if (dx !== 0 && dy !== 0) {
                const z = grid.zOf(a);
                if (!grid.canPass(grid.index(grid.xOf(a) + dx, grid.yOf(a), z), m) || !grid.canPass(grid.index(grid.xOf(a), grid.yOf(a) + dy, z), m)) return false;
            }
        }
        return true;
    }
    abandon() {
        if (this.status === "running") { this.status = "abandoned"; this.phase = PH.DONE; if (this.pf.inflight === this) this.pf.inflight = null; }
    }
    result() {
        return {
            status: this.status, path: this.path, cost: this.cost, expansions: this.expansions,
            mode: this.mode, reason: this.reason, abstractPath: this.abstractPath, refined: this.refined
        };
    }
    _finish(status, reason) {
        if (status === "found" && this.refined && this.path && !this._stepsValid(this.path)) {
            this.pf.metrics.refineFailures++;   // never hand out a path the grid refuses: plan again on the live graph
            this._restart();
            return;
        }
        this.status = status;
        this.reason = reason || "";
        this.phase = PH.DONE;
        if (status !== "found") this.path = null;
        const m = this.pf.metrics;
        if (status === "found") { m.found++; if (this.refined) this.cost = pathCost(this.grid, this.path); }
        else if (status === "unreachable") m.unreachable++;
        else if (status === "blocked") m.blocked++;
        else if (status === "open_overflow") m.openListOverflow++;
        if (this.pf.inflight === this) this.pf.inflight = null;
    }

    /** Runs until `budget` expansions are used or the search ends. Returns the expansions used. */
    step(budget) {
        if (this.status !== "running" || !(budget > 0)) return 0;
        if (!this._graphStillValid()) this._restart();
        let used = 0;
        while (this.status === "running" && used < budget) {
            if (this.phase === PH.INIT && this.restartCount > 16) { this._finish("unreachable", "restart_limit"); break; }
            switch (this.phase) {
                case PH.INIT: this._init(); break;
                case PH.PLAIN: used += this._plain(budget - used); break;
                case PH.START_LINKS: used += this._links(budget - used, true); break;
                case PH.GOAL_LINKS: used += this._links(budget - used, false); break;
                case PH.ABSTRACT_INIT: this._abstractInit(); break;
                case PH.ABSTRACT: used += this._abstract(budget - used); break;
                case PH.REFINE: used += this._refine(budget - used); break;
                case PH.SMOOTH: used += this._smooth(budget - used); break;
                default: throw new Error("Pathfinding: bad search phase");
            }
        }
        this.expansions += used;
        this.pf.metrics.expansions += used;
        this.pf.metrics.lastExpansions = this.expansions;
        return used;
    }

    _init() {
        const pf = this.pf, grid = this.grid;
        if (!grid.canPass(this.start, this.mask)) { this._finish("blocked", "start"); return; }
        if (!grid.canPass(this.goal, this.mask)) { this._finish("blocked", "goal"); return; }
        if (this.start === this.goal) { this.path = [this.start]; this.mode = "direct"; this.refined = true; pf.metrics.directQueries++; this._finish("found"); return; }
        const dx = torusAbs(grid.xOf(this.start), grid.xOf(this.goal), grid.width);
        const dy = torusAbs(grid.yOf(this.start), grid.yOf(this.goal), grid.height);
        if (this.shortQueryTiles > 0 && Math.max(dx, dy) <= this.shortQueryTiles) {
            pf.tileSearch.touchId = this.id;
            pf.tileSearch.begin(this.start, this.goal, this.mask);
            this.plainLeft = pf.shortQueryMaxExpansions;
            this.mode = "plain";
            this.phase = PH.PLAIN;
            return;
        }
        this._beginLinks(true);
    }
    _beginLinks(isStart) {
        const pf = this.pf;
        const c = pf.clusters[isStart ? this.startCluster : this.goalCluster];
        const from = isStart ? this.start : this.goal;
        const targets = [];
        for (let i = 0; i < c.nodes.length; i++) targets.push(pf.nodeTile[c.nodes[i]]);
        if (isStart && this.startCluster === this.goalCluster) targets.push(this.goal);
        pf.local.begin(c, from, -1, this.mask, targets);
        this.phase = isStart ? PH.START_LINKS : PH.GOAL_LINKS;
    }
    _plain(budget) {
        const pf = this.pf, ts = pf.tileSearch;
        const used = ts.run(Math.min(budget, this.plainLeft));
        this.plainLeft -= used;
        if (ts.status === "found") { this.path = ts.path(); this.refined = true; pf.metrics.plainQueries++; this._finish("found"); }
        else if (ts.status === "unreachable") { pf.metrics.plainQueries++; this._finish("unreachable", "plain"); }
        else if (ts.status === "open_overflow") this._finish("open_overflow", "plain");
        else if (this.plainLeft <= 0) { pf.metrics.plainFallbacks++; this.mode = "hpa"; this._beginLinks(true); }
        return used;
    }
    _links(budget, isStart) {
        const pf = this.pf, local = pf.local;
        const used = local.run(budget);
        if (local.status === "running") return used;
        const c = pf.clusters[isStart ? this.startCluster : this.goalCluster];
        if (isStart) {
            this.startLinks = [];
            for (let i = 0; i < c.nodes.length; i++) {
                const g = local.gAt(pf.nodeTile[c.nodes[i]]);
                if (g >= 0) this.startLinks.push(c.nodes[i], g);
            }
            this.directCost = this.startCluster === this.goalCluster ? local.gAt(this.goal) : -1;
            this._beginLinks(false);
        } else {
            this.goalLinks = new Map();
            for (let i = 0; i < c.nodes.length; i++) {
                const g = local.gAt(pf.nodeTile[c.nodes[i]]);
                if (g >= 0) this.goalLinks.set(c.nodes[i], g);
            }
            this.phase = PH.ABSTRACT_INIT;
        }
        return used;
    }
    _abstractInit() {
        const pf = this.pf;
        if (this.startLinks.length === 0 && this.directCost < 0) { this._finish("unreachable", "start_isolated"); return; }
        if (this.goalLinks.size === 0 && this.directCost < 0) { this._finish("unreachable", "goal_isolated"); return; }
        if (pf.useConnectivity && this.directCost < 0) {
            if (pf.connectivityStale && pf.autoConnectivity) pf.rebuildConnectivity();
            if (!pf.connectivityStale) {
                let joined = false;
                for (let i = 0; i < this.startLinks.length && !joined; i += 2) {
                    const comp = pf.componentOf(this.startLinks[i]);
                    for (const n of this.goalLinks.keys()) if (pf.componentOf(n) === comp) { joined = true; break; }
                }
                if (!joined) { pf.metrics.connectivityFastFails++; this._finish("unreachable", "connectivity"); return; }
            }
        }
        if (this.cacheEnabled && this.directCost < 0) {
            const key = this.startCluster + ":" + this.goalCluster + ":" + this.mask;
            const e = pf.cache.get(key);
            if (e && e.version === pf.graphVersion && this._startHas(e.nodes[0]) && this.goalLinks.has(e.nodes[e.nodes.length - 1])) {
                this.abstractPath = [START_NODE].concat(Array.from(e.nodes), [GOAL_NODE]);
                for (let i = 0; i < e.nodes.length; i++) pf.touchStamp[pf.nodeCluster[e.nodes[i]]] = this.id;
                this.mode = "cached";
                pf.metrics.cacheHits++;
                this._beginRefine();
                return;
            }
            pf.metrics.cacheMisses++;
        }
        if (pf.nodeEpoch >= EPOCH_MAX) { pf.nodeMark.fill(0); pf.nodeEpoch = 0; pf.nodeRollovers++; }
        pf.nodeEpoch++;
        const tag = pf.nodeEpoch * 2;
        pf.abstractOpen.clear();
        pf.nodeMark[START_NODE] = tag; pf.nodeG[START_NODE] = 0; pf.nodeParent[START_NODE] = -1;
        const h = this._nodeH(START_NODE);
        pf.abstractOpen.push(h, h, this.start, START_NODE);
        this.phase = PH.ABSTRACT;
    }
    _startHas(nodeId) {
        for (let i = 0; i < this.startLinks.length; i += 2) if (this.startLinks[i] === nodeId) return true;
        return false;
    }
    _nodeTile(n) { return n === START_NODE ? this.start : n === GOAL_NODE ? this.goal : this.pf.nodeTile[n]; }
    _nodeH(n) {
        if (n === GOAL_NODE) return 0;
        const grid = this.grid, t = this._nodeTile(n);
        return octile(torusAbs(grid.xOf(t), grid.xOf(this.goal), grid.width), torusAbs(grid.yOf(t), grid.yOf(this.goal), grid.height));
    }
    _relax(m, g, tag) {
        const pf = this.pf;
        if (pf.nodeMark[m] === tag + 1) return true;
        if (pf.nodeMark[m] === tag && g >= pf.nodeG[m]) return true;
        if (m >= FIRST_NODE && pf.nodeAlive[m] !== 1) return true;
        pf.nodeMark[m] = tag; pf.nodeG[m] = g; pf.nodeParent[m] = this._current;
        const h = this._nodeH(m);
        return pf.abstractOpen.push(g + h, h, this._nodeTile(m), m);
    }
    _abstract(budget) {
        const pf = this.pf, open = pf.abstractOpen, tag = pf.nodeEpoch * 2, closedTag = tag + 1;
        let used = 0;
        while (this.status === "running" && used < budget) {
            if (!open.pop()) { this._finish("unreachable", "abstract"); break; }
            const n = open.id2;
            if (n >= FIRST_NODE && pf.nodeAlive[n] !== 1) continue;   // freed; a recycled id was cleared and misses the g check
            if (pf.nodeMark[n] === closedTag) continue;
            const g = open.f - open.h;
            if (g !== pf.nodeG[n]) continue;
            pf.nodeMark[n] = closedTag;
            if (n >= FIRST_NODE) this.expanded.push(n);
            used++;
            if (n === GOAL_NODE) {
                const nodes = [];
                const seen = new Set();
                let chain = true;
                for (let i = GOAL_NODE; i >= 0; i = pf.nodeParent[i]) {
                    if (seen.has(i)) { chain = false; break; }   // a flush can leave a parent cycle; plan again
                    seen.add(i);
                    nodes.push(i);
                    if (nodes.length > pf.nodeHigh) { chain = false; break; }
                }
                if (!chain || nodes[nodes.length - 1] !== START_NODE) { pf.metrics.refineFailures++; this._restart(); break; }
                nodes.reverse();
                this.abstractPath = nodes;
                if (this.cacheEnabled && nodes.length > 2) {
                    if (pf.cache.size >= pf.cacheLimit) pf.cache.clear();
                    pf.cache.set(this.startCluster + ":" + this.goalCluster + ":" + this.mask,
                        { version: pf.graphVersion, nodes: Int32Array.from(nodes.slice(1, nodes.length - 1)) });
                    pf.metrics.cacheStores++;
                }
                pf.metrics.hpaQueries++;
                this._beginRefine();
                break;
            }
            this._current = n;
            let ok = true;
            if (n === START_NODE) {
                for (let i = 0; i < this.startLinks.length && ok; i += 2) ok = this._relax(this.startLinks[i], g + this.startLinks[i + 1], tag);
                if (ok && this.directCost >= 0) ok = this._relax(GOAL_NODE, g + this.directCost, tag);
            } else {
                const c = pf.clusters[pf.nodeCluster[n]];
                const t = pf._classTable(c, this.mask);
                const li = pf.nodeLocal[n];
                for (let e = t.off[li]; e < t.off[li + 1] && ok; e++) ok = this._relax(c.nodes[t.to[e]], g + t.cost[e], tag);
                const pair = pf.nodePair[n];
                if (ok && pair >= 0 && this.grid.canPass(pf.nodeTile[pair], this.mask)) ok = this._relax(pair, g + COST_STRAIGHT, tag);
                if (ok && c.id === this.goalCluster) {
                    const gl = this.goalLinks.get(n);
                    if (gl !== undefined) ok = this._relax(GOAL_NODE, g + gl, tag);
                }
            }
            if (!ok) { this._finish("open_overflow", "abstract"); break; }
        }
        return used;
    }
    _beginRefine() {
        this.path = [this.start];
        this.segIndex = 0;
        this.segOpen = false;
        if (this.lazy) { this._finish("found", "lazy"); return; }   // the macro path is the answer; refineNext() walks it
        this.phase = PH.REFINE;
    }
    /**
     * Lazy refinement (spec: "refine lazily, only as far as the next portal"). Refines the next abstract hop on the
     * live grid, smooths it and appends it to .path; returns the appended tiles (the hop's tiles after the current
     * end of the path) or null when the path is complete (.refined becomes true and .cost is set). A hop whose
     * tiles were sealed since the macro path was found, or a flush has replaced entrance nodes (their ids
     * may now name a different tile), ends the search with status "stale" (reason "portal_sealed") and
     * returns null: discard the macro path and request again after the cluster rebuild.
     * Bounded work: one cluster-local A* (at most 256 expansions) plus smoothing of that segment.
     */
    refineNext() {
        if (this.status !== "found" || !this.lazy || this.refined) return null;
        // Any flush invalidates an in-flight lazy refinement: the macro path's node ids may name other tiles
        // after entrance replacement, and the tables it was planned on are gone.
        if (this.version !== this.pf.graphVersion || this.entranceEpoch !== this.pf.entranceEpoch) { this._stale(); return null; }
        const pf = this.pf, nodes = this.abstractPath;
        if (nodes === null) { this.refined = true; this.cost = pathCost(this.grid, this.path); return null; }   // plain or direct result: already whole
        while (this.segIndex < nodes.length - 1) {
            const a = nodes[this.segIndex], b = nodes[this.segIndex + 1];
            const from = this.path[this.path.length - 1], to = b === GOAL_NODE ? this.goal : pf.nodeTile[b];
            this.segIndex++;
            if (from === to) continue;
            let tiles;
            if (a !== START_NODE && b !== GOAL_NODE && pf.nodePair[a] === b) {
                if (!this.grid.canPass(to, this.mask) || !this.grid.canPass(from, this.mask)) { this._stale(); return null; }
                tiles = [from, to];
            } else {
                const c = pf.clusters[a === START_NODE ? this.startCluster : b === GOAL_NODE ? this.goalCluster : pf.nodeCluster[a]];
                const ls = pf.localRefine;
                ls.begin(c, from, to, this.mask, null);
                const used = ls.run(LOCAL_CAP + 1);
                this.expansions += used; pf.metrics.expansions += used;
                if (ls.status !== "found") { this._stale(); return null; }
                tiles = ls.path(to);
            }
            if (this.smoothWindow > 0 && tiles.length > 2) tiles = this._smoothTiles(tiles);
            for (let i = 1; i < tiles.length; i++) this.path.push(tiles[i]);
            this.expansions += tiles.length; pf.metrics.expansions += tiles.length;
            if (this.segIndex >= nodes.length - 1) return this._completeLazy() ? tiles.slice(1) : null;
            return tiles.slice(1);
        }
        this._completeLazy();
        return null;
    }
    /** The whole lazily refined path is re-validated step by step before it counts as found. */
    _completeLazy() {
        if (!this._stepsValid(this.path)) { this.status = "stale"; this.reason = "invalid_steps"; this.pf.metrics.refineFailures++; return false; }
        this.refined = true;
        this.cost = pathCost(this.grid, this.path);
        return true;
    }
    _stale() {
        this.status = "stale";
        this.reason = "portal_sealed";
        this.pf.metrics.refineFailures++;
    }
    /** Synchronous string-pulling of one segment (same rules as the resumable _smooth). */
    _smoothTiles(tiles) {
        const pf = this.pf, out = [tiles[0]], moves = [];
        let i = 0;
        while (i < tiles.length - 1) {
            let best = i + 1, found = null;
            const maxJ = Math.min(tiles.length - 1, i + this.smoothWindow);
            for (let j = maxJ; j > i + 1; j--) {
                const m = pf._octileMoves(tiles[i], tiles[j], this.mask, moves);
                if (m) { best = j; found = m; break; }
            }
            if (found) for (let k = 0; k < found.length; k++) out.push(found[k]);
            else out.push(tiles[i + 1]);
            i = best;
        }
        return removeLoops(out);
    }
    _refine(budget) {
        const pf = this.pf, local = pf.local, nodes = this.abstractPath;
        let used = 0;
        while (this.status === "running" && used < budget) {
            if (!this.segOpen) {
                if (this.segIndex >= nodes.length - 1) { this.smoothIndex = 0; this.smoothOut = null; this.phase = PH.SMOOTH; break; }
                const a = nodes[this.segIndex], b = nodes[this.segIndex + 1];
                if (this._nodeStale(a) || this._nodeStale(b)) { pf.metrics.refineFailures++; this._restart(); break; }
                const from = this._nodeTile(a), to = this._nodeTile(b);
                if (a !== START_NODE && b !== GOAL_NODE && pf.nodePair[a] === b) { this.path.push(to); this.segIndex++; continue; }
                if (from === to) { this.segIndex++; continue; }
                const c = pf.clusters[a === START_NODE ? this.startCluster : b === GOAL_NODE ? this.goalCluster : pf.nodeCluster[a]];
                local.begin(c, from, to, this.mask, null);
                this.segOpen = true;
                this.segTo = to;
            }
            used += local.run(budget - used);
            if (local.status === "running") break;
            if (local.status === "found") {
                const p = local.path(this.segTo);
                for (let i = 1; i < p.length; i++) this.path.push(p[i]);
                this.segOpen = false;
                this.segIndex++;
            } else {
                pf.metrics.refineFailures++;   // the hop no longer exists on the live grid: plan again
                this._restart();
            }
        }
        return used;
    }
    _smooth(budget) {
        const pf = this.pf, path = this.path;
        if (this.smoothWindow <= 0 || path.length < 3) { this.refined = true; this._finish("found"); return 0; }
        if (!this.smoothOut) { this.smoothOut = [path[0]]; this.smoothIndex = 0; this._moves = []; }
        let used = 0;
        const out = this.smoothOut;
        while (used < budget) {
            const i = this.smoothIndex;
            if (i >= path.length - 1) { this.path = removeLoops(out); this.refined = true; used++; this._finish("found"); break; }
            let best = i + 1;
            const maxJ = Math.min(path.length - 1, i + this.smoothWindow);
            let moves = null;
            for (let j = maxJ; j > i + 1; j--) {
                moves = pf._octileMoves(path[i], path[j], this.mask, this._moves);
                if (moves) { best = j; break; }
            }
            if (best === i + 1) out.push(path[i + 1]);
            else for (let k = 0; k < moves.length; k++) out.push(moves[k]);
            this.smoothIndex = best;
            used++;
        }
        return used;
    }
}

//-----------------------------------------------------------------------------
// Scheduler: one search in flight at a time, a deterministic per-tick budget, priority then request order.
//-----------------------------------------------------------------------------
class Scheduler {
    constructor(pf, opts) {
        const o = opts || {};
        this.pf = pf;
        this.budgetPerTick = o.budgetPerTick === undefined ? DEFAULT_BUDGET : (o.budgetPerTick | 0);
        this.queue = [];
        this.seq = 0;
        this.results = new Map();
        this.current = null;
        this.lastTickExpansions = 0;
        this.ticks = 0;
    }
    /** Queues a query; returns its id. opts.priority: PRIORITY.COMBAT (0), ORDER (1), HAUL (2, default). */
    request(start, goal, opts) {
        const o = opts || {};
        const id = ++this.seq;
        this.queue.push({ id, start, goal, opts: o, priority: o.priority === undefined ? PRIORITY.HAUL : (o.priority | 0) });
        return id;
    }
    pending() { return this.queue.length + (this.current ? 1 : 0); }
    _next() {
        let best = -1;
        for (let i = 0; i < this.queue.length; i++) {
            const r = this.queue[i];
            if (best < 0 || r.priority < this.queue[best].priority || (r.priority === this.queue[best].priority && r.id < this.queue[best].id)) best = i;
        }
        return best < 0 ? null : this.queue.splice(best, 1)[0];
    }
    /** One tick: flush grid edits, then spend at most budgetPerTick expansions. Returns the completed results. */
    tick() {
        const pf = this.pf;
        this.ticks++;
        pf.flush();
        let budget = this.budgetPerTick;
        const done = [];
        while (budget > 0) {
            if (!this.current) {
                const req = this._next();
                if (!req) break;
                this.current = { req, search: pf.beginSearch(req.start, req.goal, req.opts) };
            }
            const cur = this.current;
            const used = cur.search.step(budget);
            budget -= used;
            if (cur.search.status !== "running") {
                const r = cur.search.result();
                r.id = cur.req.id;
                this.results.set(r.id, r);
                done.push(r);
                this.current = null;
            } else if (used === 0) { pf.metrics.schedulerStalls++; break; }
        }
        this.lastTickExpansions = this.budgetPerTick - budget;
        return done;
    }
    result(id) { return this.results.get(id) || null; }
    take(id) { const r = this.results.get(id) || null; this.results.delete(id); return r; }
}

//-----------------------------------------------------------------------------
// Path utilities
//-----------------------------------------------------------------------------
/**
 * Cuts loops out of a path: a straightened segment can run through a tile the path reaches again later, so
 * when a tile repeats the walk is cut back to its first visit. Every kept step existed in the input, so the
 * result stays legal, and it is never longer.
 */
function removeLoops(path) {
    const at = new Map();
    const out = [];
    for (let i = 0; i < path.length; i++) {
        const t = path[i];
        const seen = at.get(t);
        if (seen !== undefined) {
            for (let k = out.length - 1; k > seen; k--) at.delete(out[k]);
            out.length = seen + 1;
            continue;
        }
        at.set(t, out.length);
        out.push(t);
    }
    return out;
}
/** Sum of step costs (10 / 14) along a path of tile indices on the wrapping grid. */
function pathCost(grid, path) {
    let cost = 0;
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i];
        const dx = torusAbs(grid.xOf(a), grid.xOf(b), grid.width), dy = torusAbs(grid.yOf(a), grid.yOf(b), grid.height);
        cost += dx !== 0 && dy !== 0 ? COST_DIAG : COST_STRAIGHT;
    }
    return cost;
}
/** Checks adjacency, passability, corner rules and no revisits. Returns { ok, reason, at }. */
function validatePath(grid, path, mask) {
    const m = (mask | 0) >>> 0;
    if (!path || path.length === 0) return { ok: false, reason: "empty", at: -1 };
    const seen = new Set();
    for (let i = 0; i < path.length; i++) {
        const t = path[i];
        if (!Number.isInteger(t) || t < 0 || t >= grid.size) return { ok: false, reason: "index", at: i };
        if (seen.has(t)) return { ok: false, reason: "revisit", at: i };
        seen.add(t);
        if (!grid.canPass(t, m)) return { ok: false, reason: "impassable", at: i };
        if (i === 0) continue;
        const a = path[i - 1];
        if (grid.zOf(a) !== grid.zOf(t)) return { ok: false, reason: "z", at: i };
        const dx = torusDelta(grid.xOf(a), grid.xOf(t), grid.width), dy = torusDelta(grid.yOf(a), grid.yOf(t), grid.height);
        if (dx < -1 || dx > 1 || dy < -1 || dy > 1 || (dx === 0 && dy === 0)) return { ok: false, reason: "not_adjacent", at: i };
        if (dx !== 0 && dy !== 0) {
            const z = grid.zOf(a);
            if (!grid.canPass(grid.index(grid.xOf(a) + dx, grid.yOf(a), z), m) || !grid.canPass(grid.index(grid.xOf(a), grid.yOf(a) + dy, z), m)) {
                return { ok: false, reason: "corner_cut", at: i };
            }
        }
    }
    return { ok: true, reason: "", at: -1 };
}

function createGrid(opts) { return new Grid(opts); }
function createPathfinder(grid, opts) { return new Pathfinder(grid, opts); }
function createScheduler(pf, opts) { return new Scheduler(pf, opts); }

return {
    CLUSTER_SIZE, COST_STRAIGHT, COST_DIAG, MAX_RUN, DEFAULT_BUDGET, EPOCH_MAX, PRIORITY, START_NODE, GOAL_NODE, FIRST_NODE, PH,
    wrap, torusDelta, torusAbs, octile, hashPath, pathCost, validatePath, removeLoops,
    Grid, OpenList, TileWorkspace, TileSearch, LocalSearch, Pathfinder, Search, Scheduler,
    createGrid, createPathfinder, createScheduler
};
});
