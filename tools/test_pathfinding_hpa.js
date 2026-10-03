"use strict";
// tools/test_pathfinding_hpa.js - CORE-HPA headless checks for game/js/sim/pathfinding.js.
//
//   node tools/test_pathfinding_hpa.js                 all checks (about 20 s on a 768x768 grid)
//   node tools/test_pathfinding_hpa.js --runs=20       determinism: fresh pathfinders per run (default 10)
//   node tools/test_pathfinding_hpa.js --mutant=<name> loads a deliberately broken copy of the module;
//                                                      the named check must FAIL (ENGINE_RULES section 6, AGENTS.md rule 4)
//
// Mutants (name: what breaks -> the check that must fail):
//   seam_closed       no entrances across the x=767/0 and y=767/0 seams   -> wrap_seam_* (forced hierarchy)
//   corner_cut        cluster-local searches cut corners                   -> corner_rule
//   corner_cut_plain  the plain A* cuts corners                            -> corner_rule
//   ignore_doors      cluster-local searches ignore door masks            -> door_masks
//   ignore_doors_plain the plain A* ignores door masks                    -> door_plain
//   no_dirty          tile edits mark no cluster dirty                     -> incremental_update
//   budget_ignored    step() ignores its budget                            -> budget
//   greedy_abstract   the abstract heuristic is inadmissible (x5)          -> optimality
//   random_ties       heap tie-breaking uses Math.random                   -> determinism
//   no_rollover       epoch rollover keeps stale marks                     -> epoch_rollover
//   overflow_silent   open-list overflow drops entries silently            -> open_overflow
//   door_in_run       a door tile no longer splits an entrance run         -> door_in_entrance_run
//   no_version_check  a paused search ignores a graph rebuild              -> inflight_rebuild
//   keep_loops        smoothing keeps the loops it makes                    -> smoothing_no_loops
//   no_same_cluster_fallthrough a same-cluster pair with no local route is unreachable -> same_cluster_detour
//   no_plain_fallback the short-query A* cap ends the search                -> short_query_detour
//   global_restart    any flush restarts every paused search                -> dig_storm
//   merge_on_reuse    recycled node ids are merged into the live union-find  -> connectivity_reuse
//   no_lazy_flush_check a flush does not end an in-flight lazy refinement    -> lazy_flush_invalidation
//
// Output: PASS/FAIL lines, one RESULT line, exit 0 (all passed) or 1 (a failure).
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const MODULE = path.join(ROOT, "game", "js", "sim", "pathfinding.js");
const argv = process.argv.slice(2);
const mutant = (argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
const runs = Number((argv.find(a => a.startsWith("--runs=")) || "--runs=10").slice(7));
const only = (argv.find(a => a.startsWith("--only=")) || "").slice(7);

const MUTANTS = {
    seam_closed: ["open = walk[t[0]] === 1 && walk[t[1]] === 1;\n                doorway", "open = walk[t[0]] === 1 && walk[t[1]] === 1 && c.x0 + c.w < grid.width && c.y0 + c.h < grid.height;\n                doorway"],
    corner_cut: ["if (d >= 4 && (!this.pass(this.toGlobal(nx + ly * w)) || !this.pass(this.toGlobal(lx + ny * w)))) continue;", "/* mutant: local corner cutting */"],
    corner_cut_plain: ["if (walk[a] !== 1 || walk[b] !== 1) continue;", "if (false) continue;"],
    ignore_doors: ["return d === 0 || (d & this.mask) !== 0;\n    }\n    /**\n     * @param c cluster rectangle", "return true;\n    }\n    /**\n     * @param c cluster rectangle"],
    ignore_doors_plain: ["let dm = door[n];\n                if (dm !== 0 && (dm & mask) === 0) continue;", "let dm = door[n];\n                if (false) continue;"],
    no_dirty: ["this.dirty.add(this.clusterOf(idx));\n        if (kind !== \"open\") this.splitSuspected = true;", "/* mutant: nothing is dirty */"],
    budget_ignored: ["if (this.version !== this.pf.graphVersion) this._restart();\n        let used = 0;", "if (this.version !== this.pf.graphVersion) this._restart();\n        let used = 0; budget = 1 << 30;"],
    greedy_abstract: ["if (n === GOAL_NODE) return 0;\n        const grid = this.grid, t = this._nodeTile(n);\n        return octile(", "if (n === GOAL_NODE) return 0;\n        const grid = this.grid, t = this._nodeTile(n);\n        return 5 * octile("],
    random_ties: ["const aj = this.k1[j]; if (a !== aj) return a < aj ? -1 : 1;", "return Math.random() < 0.5 ? -1 : 1;"],
    no_rollover: ["if (this.epoch >= EPOCH_MAX) { this.mark.fill(0); this.epoch = 0; this.rollovers++; }\n        return ++this.epoch;", "if (this.epoch >= EPOCH_MAX) { this.epoch = 0; this.rollovers++; }\n        return ++this.epoch;"],
    overflow_silent: ["if (this.size === this.cap && !this._grow()) { this.overflowed = true; return false; }", "if (this.size === this.cap && !this._grow()) { return true; }"],
    door_in_run: ["doorway = open && (door[t[0]] !== 0 || door[t[1]] !== 0);", "doorway = false;"],
    no_version_check: ["if (ver === pf.graphVersion) return true;\n        const cv = pf.clusterVersion;", "return true;\n        const cv = pf.clusterVersion;"],
    global_restart: ["if (!this._graphStillValid()) this._restart();", "if (this.version !== this.pf.graphVersion) this._restart();"],
    merge_on_reuse: ["if (this.splitSuspected || this.freedThisFlush > 0) this.connectivityStale = true;", "if (this.splitSuspected) this.connectivityStale = true;"],
    no_lazy_flush_check: ["if (this.version !== this.pf.graphVersion || this.entranceEpoch !== this.pf.entranceEpoch) { this._stale(); return null; }", "if (this.entranceEpoch !== this.pf.entranceEpoch) { this._stale(); return null; }"],
    keep_loops: ["this.path = removeLoops(out); this.refined = true; used++;", "this.path = out; this.refined = true; used++;"],
    no_same_cluster_fallthrough: ["this.directCost = this.startCluster === this.goalCluster ? local.gAt(this.goal) : -1;\n            this._beginLinks(false);", "this.directCost = this.startCluster === this.goalCluster ? local.gAt(this.goal) : -1;\n            if (this.startCluster === this.goalCluster && this.directCost < 0) { this._finish(\"unreachable\", \"same_cluster\"); return used; }\n            this._beginLinks(false);"],
    no_plain_fallback: ["else if (this.plainLeft <= 0) { pf.metrics.plainFallbacks++; this.mode = \"hpa\"; this._beginLinks(true); }", "else if (this.plainLeft <= 0) { this._finish(\"unreachable\", \"plain_cap\"); }"]
};

function loadModule() {
    let src = fs.readFileSync(MODULE, "utf8");
    if (mutant) {
        const m = MUTANTS[mutant];
        if (!m) { console.error(`unknown mutant "${mutant}"; known: ${Object.keys(MUTANTS).join(", ")}`); process.exit(2); }
        const hits = src.split(m[0]).length - 1;
        if (hits !== 1) { console.error(`mutant "${mutant}": its anchor text occurs ${hits} times in the module (must be exactly once)`); process.exit(2); }
        src = src.replace(m[0], m[1]);
    }
    const sandbox = { module: { exports: {} }, console, Math, Int32Array, Uint32Array, Uint8Array, Int16Array, Map, Set, Array, Number, Error, TypeError, RangeError, Object };
    sandbox.exports = sandbox.module.exports;
    vm.runInNewContext(src, sandbox, { filename: MODULE });
    return sandbox.module.exports;
}
const P = loadModule();

let passed = 0, failed = 0;
const results = [];
function check(name, cond, info) {
    const line = `${name}${info ? `: ${info}` : ""}`;
    if (cond) { passed++; console.log(`PASS ${line}`); } else { failed++; console.error(`FAIL ${line}`); }
    results.push({ name, ok: !!cond, info: info || "" });
}

// The checks use their own validator and cost function, so a module bug cannot vouch for itself.
function ownValidate(grid, p, mask) {
    if (!p || p.length === 0) return "empty";
    const W = grid.width, H = grid.height;
    const pass = idx => grid.walk[idx] === 1 && (grid.door[idx] === 0 || (grid.door[idx] & mask) !== 0);
    const seen = new Set();
    for (let i = 0; i < p.length; i++) {
        const t = p[i];
        if (seen.has(t)) return `revisit at ${i}`;
        seen.add(t);
        if (!pass(t)) return `impassable tile ${t} at ${i}`;
        if (i === 0) continue;
        const a = p[i - 1];
        const ax = a % W, ay = Math.floor(a / W), tx = t % W, ty = Math.floor(t / W);
        let dx = ((tx - ax) % W + W) % W; if (dx > W / 2) dx -= W;
        let dy = ((ty - ay) % H + H) % H; if (dy > H / 2) dy -= H;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || (dx === 0 && dy === 0)) return `not adjacent at ${i}`;
        if (dx !== 0 && dy !== 0) {
            const side1 = ((ax + dx + W) % W) + ay * W, side2 = ax + ((ay + dy + H) % H) * W;
            if (!pass(side1) || !pass(side2)) return `corner cut at ${i}`;
        }
    }
    return "";
}
function ownCost(grid, p) {
    const W = grid.width, H = grid.height;
    let c = 0;
    for (let i = 1; i < p.length; i++) {
        const a = p[i - 1], t = p[i];
        const dx = Math.abs((a % W) - (t % W)), dy = Math.abs(Math.floor(a / W) - Math.floor(t / W));
        const ddx = Math.min(dx, W - dx), ddy = Math.min(dy, H - dy);
        c += ddx !== 0 && ddy !== 0 ? 14 : 10;
    }
    return c;
}
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const W = 768, H = 768;
function obstacleGrid(seed) {
    const g = P.createGrid({ width: W, height: H });
    const rnd = mulberry32(seed);
    for (let i = 0; i < W * H; i++) if (rnd() < 0.20) g.walk[i] = 0;
    for (let k = 0; k < 300; k++) {
        const x = (rnd() * W) | 0, y = (rnd() * H) | 0, horiz = rnd() < 0.5, len = 8 + ((rnd() * 32) | 0);
        for (let j = 0; j < len; j++) g.walk[g.index(horiz ? x + j : x, horiz ? y : y + j, 0)] = 0;
    }
    return g;
}
function randomQueries(g, seed, count, minDist) {
    const rnd = mulberry32(seed);
    const out = [];
    while (out.length < count) {
        const s = g.index((rnd() * W) | 0, (rnd() * H) | 0, 0), e = g.index((rnd() * W) | 0, (rnd() * H) | 0, 0);
        if (!g.walk[s] || !g.walk[e]) continue;
        const dx = P.torusAbs(g.xOf(s), g.xOf(e), W), dy = P.torusAbs(g.yOf(s), g.yOf(e), H);
        if (Math.max(dx, dy) < minDist) continue;
        out.push([s, e]);
    }
    return out;
}
let current = "";
function runOnly(name) { const on = !only || only === name; if (on) current = name; return on; }
// A section that throws records a FAIL instead of killing the run (the RESULT line must always be computed).
function section(name, fn) {
    if (!runOnly(name)) return;
    try { fn(); } catch (err) { check(name, false, `threw ${err && err.stack ? err.stack.split("\n").slice(0, 2).join(" | ") : err}`); }
}
process.on("uncaughtException", err => {
    check(current || "harness", false, `threw ${err && err.stack ? err.stack.split("\n").slice(0, 2).join(" | ") : err}`);
    console.log(`RESULT: ${passed} passed, ${failed} failed (exit 1)${mutant ? ` [mutant ${mutant}]` : ""}`);
    process.exit(1);
});

//----------------------------------------------------------------------------------------------------------
// determinism: same seed and grid give identical path hashes across fresh pathfinders
//----------------------------------------------------------------------------------------------------------
if (runOnly("determinism")) {
    const queries = randomQueries(obstacleGrid(7), 99, 100, 48);
    const hashes = [];
    for (let r = 0; r < runs; r++) {
        const g = obstacleGrid(7);
        const pf = P.createPathfinder(g);
        pf.build();
        const parts = [];
        for (const [s, e] of queries) {
            const res = pf.findPath(s, e, { mask: 0 });
            parts.push(res.status === "found" ? P.hashPath(res.path) : res.status);
        }
        hashes.push(parts.join(","));
    }
    const allSame = hashes.every(h => h === hashes[0]);
    check("determinism", allSame, `${runs} fresh runs x 100 routes, run hash ${P.hashPath(hashes[0].split(",").map(h => parseInt(h, 16) | 0))}${allSame ? "" : " (runs differ)"}`);
}

//----------------------------------------------------------------------------------------------------------
// wrap seams: x=5 -> x=760 with a wall between (spec phase 1), the y seam, and a corner crossing
//----------------------------------------------------------------------------------------------------------
section("wrap_seams", () => {
    const g = P.createGrid({ width: W, height: H });
    for (let y = 0; y < H; y++) g.walk[g.index(300, y, 0)] = 0;   // full-height wall: the only way round is the seam
    for (let x = 0; x < W; x++) g.walk[g.index(x, 300, 0)] = 0;   // full-width wall for the y case
    const pf = P.createPathfinder(g);
    pf.build();
    // Every seam route is checked twice: as the query it is (short ones run plain A*) and forced through the
    // hierarchy. A plain result must equal A*; a hierarchical one may exceed it by up to 2 %: entrance nodes sit
    // at chunk centres, so on open ground a long route detours two rows to reach them (16 cost on 1730 here).
    const seam = (name, s, e, mustCross, expectMode) => {
        const a = pf.findPathAStar(s, e, { mask: 0 });
        const info = [];
        let ok = a.status === "found";
        for (const forced of [false, true]) {
            const r = pf.findPath(s, e, { mask: 0, shortQueryTiles: forced ? 0 : undefined });
            const bad = r.status === "found" ? ownValidate(g, r.path, 0) : "not found";
            const crosses = r.status === "found" && mustCross(r.path);
            const cost = r.status === "found" ? ownCost(g, r.path) : -1;
            const hier = r.mode === "hpa" || r.mode === "cached";
            const modeOk = forced ? hier : r.mode === expectMode;
            const near = cost >= 0 && (hier ? cost <= 1.02 * a.cost : cost === a.cost);
            ok = ok && !bad && crosses && near && modeOk;
            info.push(`${forced ? "forced hpa" : "default"}: ${r.status} cost ${cost} (${r.mode})${bad ? ", " + bad : ""}${crosses ? "" : ", seam not crossed"}`);
        }
        check(name, ok, `${info.join("; ")}; astar ${a.status} cost ${a.cost}`);
    };
    const xSeam = p => p.some(i => g.xOf(i) === 0) && p.some(i => g.xOf(i) === W - 1);
    const ySeam = p => p.some(i => g.yOf(i) === 0) && p.some(i => g.yOf(i) === H - 1);
    seam("wrap_seam_x", g.index(5, 100, 0), g.index(760, 100, 0), xSeam, "plain");                 // the spec's phase-1 route
    seam("wrap_seam_y", g.index(100, 5, 0), g.index(100, 760, 0), ySeam, "plain");
    seam("wrap_corner", g.index(4, 4, 0), g.index(763, 763, 0), p => xSeam(p) && ySeam(p), "plain");
    seam("wrap_seam_x_long", g.index(5, 100, 0), g.index(600, 100, 0), xSeam, "hpa");              // 173 tiles via the seam
    seam("wrap_seam_y_long", g.index(100, 5, 0), g.index(100, 600, 0), ySeam, "hpa");
    seam("wrap_corner_long", g.index(4, 4, 0), g.index(600, 600, 0), p => xSeam(p) && ySeam(p), "hpa");
});

//----------------------------------------------------------------------------------------------------------
// corner_rule: no diagonal step cuts a wall corner (the validator here is independent of the module)
//----------------------------------------------------------------------------------------------------------
section("corner_rule", () => {
    const g = obstacleGrid(11);
    const pf = P.createPathfinder(g);
    pf.build();
    let bad = "", checked = 0, diagonals = 0;
    const count = p => { for (let i = 1; i < p.length; i++) if (g.xOf(p[i]) !== g.xOf(p[i - 1]) && g.yOf(p[i]) !== g.yOf(p[i - 1])) diagonals++; };
    for (const [s, e] of randomQueries(g, 5, 60, 40)) {
        for (const r of [pf.findPath(s, e, { mask: 0 }), pf.findPathAStar(s, e, { mask: 0, maxExpansions: 20000 })]) {
            if (r.status !== "found") continue;
            checked++;
            count(r.path);
            const v = ownValidate(g, r.path, 0);
            if (v) { bad = `${r.mode}: ${v}`; break; }
        }
        if (bad) break;
    }
    check("corner_rule", !bad && checked > 0 && diagonals > 0, bad || `${checked} hierarchical and plain paths, ${diagonals} diagonal steps, none cuts a corner`);
});

//----------------------------------------------------------------------------------------------------------
// optimality: 200 random seeded queries, HPA cost / A* cost; reachability must agree with A*
//----------------------------------------------------------------------------------------------------------
if (runOnly("optimality")) {
    const g = obstacleGrid(12345);
    const pf = P.createPathfinder(g, { cache: false });
    pf.build();
    const queries = randomQueries(g, 777, 200, 64);
    const stats = (label, cacheOn) => {
        const ratios = [];
        let disagree = 0, invalid = 0, unreachable = 0;
        const pfc = cacheOn ? P.createPathfinder(g, { cache: true }) : pf;
        if (cacheOn) pfc.build();
        for (const [s, e] of queries) {
            const r = pfc.findPath(s, e, { mask: 0 });
            const a = pf.findPathAStar(s, e, { mask: 0 });
            if ((r.status === "found") !== (a.status === "found")) { disagree++; continue; }
            if (r.status !== "found") { unreachable++; continue; }
            if (ownValidate(g, r.path, 0)) { invalid++; continue; }
            ratios.push(ownCost(g, r.path) / a.cost);
        }
        ratios.sort((a, b) => a - b);
        const q = p => ratios.length === 0 ? Number.POSITIVE_INFINITY : ratios[Math.min(ratios.length - 1, Math.floor(p * ratios.length))];
        const mean = ratios.length === 0 ? Number.POSITIVE_INFINITY : ratios.reduce((a, b) => a + b, 0) / ratios.length;
        return { label, ratios, disagree, invalid, unreachable, max: q(1), mean, p50: q(0.5), p90: q(0.9), p99: q(0.99), over: ratios.filter(r => r > 1.10).length };
    };
    const off = stats("cache off", false);
    const on = stats("cache on", true);
    const fmt = s => `max ${s.max.toFixed(4)} mean ${s.mean.toFixed(4)} p50 ${s.p50.toFixed(4)} p90 ${s.p90.toFixed(4)} p99 ${s.p99.toFixed(4)} over1.10 ${s.over} (n=${s.ratios.length}, unreachable ${s.unreachable}, disagree ${s.disagree}, invalid ${s.invalid})`;
    check("optimality", off.disagree === 0 && off.invalid === 0 && off.ratios.length >= 150 && off.max <= 1.10, `cache off: ${fmt(off)}`);
    check("optimality_cached", on.disagree === 0 && on.invalid === 0 && on.ratios.length >= 150 && on.p50 <= 1.10, `cache on (spec bar is the median): ${fmt(on)}`);
    // cache reuse: the same cluster pairs queried from different tiles must hit the cache and stay near optimal
    const pfr = P.createPathfinder(g, { cache: true });
    pfr.build();
    const rr = mulberry32(99);
    const reuse = [];
    let pairs = 0;
    while (pairs < 25) {
        const sx = (rr() * W) | 0, sy = (rr() * H) | 0, ex = (rr() * W) | 0, ey = (rr() * H) | 0;
        if (Math.max(P.torusAbs(sx, ex, W), P.torusAbs(sy, ey, H)) < 96) continue;
        const tiles = [];
        for (let k = 0; k < 6 && tiles.length < 4; k++) {
            const s = g.index((sx & ~15) + ((rr() * 16) | 0), (sy & ~15) + ((rr() * 16) | 0), 0);
            const e = g.index((ex & ~15) + ((rr() * 16) | 0), (ey & ~15) + ((rr() * 16) | 0), 0);
            if (g.walk[s] && g.walk[e]) tiles.push([s, e]);
        }
        if (tiles.length < 2) continue;
        pairs++;
        for (const [s, e] of tiles) {
            const r = pfr.findPath(s, e, { mask: 0 });
            const a = pf.findPathAStar(s, e, { mask: 0 });
            if (r.status === "found" && a.status === "found" && !ownValidate(g, r.path, 0)) reuse.push(ownCost(g, r.path) / a.cost);
        }
    }
    reuse.sort((a, b) => a - b);
    const rq = p => reuse[Math.min(reuse.length - 1, Math.floor(p * reuse.length))];
    check("cache_reuse", pfr.metrics.cacheHits >= 25 && reuse.length >= 50 && rq(0.5) <= 1.10 && rq(1) <= 1.25,
        `${pfr.metrics.cacheHits} hits / ${pfr.metrics.cacheMisses} misses over ${reuse.length} routes on ${pairs} cluster pairs: ratio max ${rq(1).toFixed(4)} mean ${(reuse.reduce((a, b) => a + b, 0) / reuse.length).toFixed(4)} p50 ${rq(0.5).toFixed(4)} p90 ${rq(0.9).toFixed(4)}`);
}

//----------------------------------------------------------------------------------------------------------
// door_masks: two full-width walls isolate a band; faction A's door is the only way in from the start side
//----------------------------------------------------------------------------------------------------------
if (runOnly("door_masks")) {
    const A = 1, B = 2;
    const g = P.createGrid({ width: W, height: H });
    for (let x = 0; x < W; x++) { g.walk[g.index(x, 100, 0)] = 0; g.walk[g.index(x, 400, 0)] = 0; }
    g.setDoor(300, 100, 0, A); g.walk[g.index(300, 100, 0)] = 1;   // A's door in the y=100 wall
    g.setDoor(500, 400, 0, B); g.walk[g.index(500, 400, 0)] = 1;   // B's door in the y=400 wall
    const pf = P.createPathfinder(g);
    pf.build();
    const s = g.index(300, 50, 0), e = g.index(300, 200, 0);
    const ra = pf.findPath(s, e, { mask: A });
    const rb = pf.findPath(s, e, { mask: B });
    const rn = pf.findPath(s, e, { mask: 0 });
    const rab = pf.findPath(s, e, { mask: A | B });
    const aa = pf.findPathAStar(s, e, { mask: A }), ab = pf.findPathAStar(s, e, { mask: B });
    const doorA = g.index(300, 100, 0), doorB = g.index(500, 400, 0);
    const okA = ra.status === "found" && !ownValidate(g, ra.path, A) && ra.path.includes(doorA) && ownCost(g, ra.path) <= 1.10 * aa.cost;
    const okB = rb.status === "found" && !ownValidate(g, rb.path, B) && rb.path.includes(doorB) && !rb.path.includes(doorA) && ownCost(g, rb.path) <= 1.10 * ab.cost;
    const okN = rn.status === "unreachable";
    const okAB = rab.status === "found" && !ownValidate(g, rab.path, A | B) && ownCost(g, rab.path) <= 1.10 * aa.cost;
    check("door_masks", okA && okB && okN && okAB,
        `A: ${ra.status} cost ${ra.cost} via its door ${ra.path ? ra.path.includes(doorA) : false} (astar ${aa.cost}); ` +
        `B: ${rb.status} cost ${rb.cost} via its own door ${rb.path ? rb.path.includes(doorB) : false}, through A's door ${rb.path ? rb.path.includes(doorA) : false} (astar ${ab.cost}); ` +
        `no permissions: ${rn.status}; A|B: ${rab.status} cost ${rab.cost}`);
    // a locked door that is the agent's own start tile must still be passable to it, and nearestOpen respects doors
    const inDoor = pf.findPath(doorA, g.index(300, 120, 0), { mask: A });
    const notInDoor = pf.findPath(doorA, g.index(300, 120, 0), { mask: B });
    check("door_start_tile", inDoor.status === "found" && notInDoor.status === "blocked", `A from its door: ${inDoor.status}; B from A's door: ${notInDoor.status} (${notInDoor.reason})`);
    // a short query straight across A's door runs the plain A*: A through it, B never through it
    const pA = pf.findPath(g.index(300, 90, 0), g.index(300, 110, 0), { mask: A });
    const pB = pf.findPath(g.index(300, 90, 0), g.index(300, 110, 0), { mask: B });
    check("door_plain", pA.status === "found" && pA.mode === "plain" && pA.path.includes(doorA) && pB.status === "found" && !pB.path.includes(doorA) && !ownValidate(g, pB.path, B) && pB.cost > 6000,
        `A: ${pA.status} (${pA.mode}) cost ${pA.cost} through the door ${pA.path ? pA.path.includes(doorA) : false}; B: ${pB.status} (${pB.mode}) cost ${pB.cost} through A's door ${pB.path ? pB.path.includes(doorA) : false}`);
    // a door at the centre of a cluster-border run: the open tiles beside it must still carry an entrance
    const g2 = P.createGrid({ width: W, height: H });
    for (let x = 0; x < W; x++) { g2.walk[g2.index(x, 200, 0)] = 0; g2.walk[g2.index(x, 400, 0)] = 0; }   // two full-width walls
    for (let y = 201; y <= 399; y++) g2.walk[g2.index(255, y, 0)] = 0;                                    // a wall along x=255 (cluster 15's east edge)...
    for (let y = 298; y <= 302; y++) g2.walk[g2.index(255, y, 0)] = 1;                                   // ...with a five-tile gap at y=298..302
    g2.setDoor(255, 300, 0, A);                                                                           // whose centre tile is A's door
    const pf2 = P.createPathfinder(g2);
    pf2.build();
    const s2 = g2.index(240, 300, 0), e2 = g2.index(270, 300, 0);   // 30 tiles apart: the gap is the only way through
    const rA = pf2.findPath(s2, e2, { mask: A, shortQueryTiles: 0 });
    const rB = pf2.findPath(s2, e2, { mask: B, shortQueryTiles: 0 });
    const aB = pf2.findPathAStar(s2, e2, { mask: B });
    const recNodes = pf2.borders[pf2.clusterOf(g2.index(240, 300, 0)) * 2].positions.length;
    check("door_in_entrance_run", rA.status === "found" && rB.status === "found" && !ownValidate(g2, rB.path, B) && !rB.path.includes(g2.index(255, 300, 0)) && ownCost(g2, rB.path) <= 1.10 * aB.cost && recNodes === 3,
        `gap with A's door at its centre: A ${rA.status} cost ${rA.cost}; B ${rB.status} cost ${rB.cost} (astar ${aB.cost}) avoiding the door ${rB.path ? !rB.path.includes(g2.index(255, 300, 0)) : false}; entrances on that border: ${recNodes} (expected 3: open run, door, open run)`);
}

//----------------------------------------------------------------------------------------------------------
// incremental_update: wall placement and removal rebuild only the affected clusters; graph == from scratch
//----------------------------------------------------------------------------------------------------------
if (runOnly("incremental_update")) {
    const g = obstacleGrid(4242);
    const s = g.index(40, 40, 0), e = g.index(200, 60, 0);
    // open a corridor so a known route exists (before any pathfinder sees the grid), then cut it
    for (let x = 40; x <= 200; x++) for (let y = 38; y <= 42; y++) g.walk[g.index(x, y, 0)] = 1;
    g.walk[s] = 1; g.walk[e] = 1;
    const pf = P.createPathfinder(g, { cache: true });
    pf.build();
    const fresh = () => { const f = P.createPathfinder(g, { cache: false }); f.build(); return f; };
    const sameGraph = (a, b) => JSON.stringify(a.snapshotGraph()) === JSON.stringify(b.snapshotGraph());
    const pf0 = fresh();
    const before = pf.findPath(s, e, { mask: 0 });
    const beforeA = pf0.findPathAStar(s, e, { mask: 0 });
    // 1. an interior wall tile: exactly one cluster rebuilt
    const r0 = pf.metrics.clusterRebuilds;
    g.setWalkable(37, 37, 0, false);          // cluster (2,2), interior (x%16=5, y%16=5)
    const n1 = pf.flush();
    // 2. a wall that closes the corridor on a cluster border: the cluster and its neighbour
    const r1 = pf.metrics.clusterRebuilds;
    const column = [];
    for (let y = 36; y <= 44; y++) column.push(g.walk[g.index(112, y, 0)]);   // remembered so the removal restores the original grid
    for (let y = 36; y <= 44; y++) g.setWalkable(112, y, 0, false);  // x=112 is a cluster's left edge (112 % 16 = 0)
    const n2 = pf.flush();
    const r2 = pf.metrics.clusterRebuilds;
    const after = pf.findPath(s, e, { mask: 0 });
    const afterFresh = fresh();
    const afterA = afterFresh.findPathAStar(s, e, { mask: 0 });
    const graphAfterOk = sameGraph(pf, afterFresh);
    const pathAfterOk = (after.status === "found") === (afterA.status === "found") && (after.status !== "found" || (!ownValidate(g, after.path, 0) && !after.path.some(i => g.xOf(i) === 112 && g.yOf(i) >= 36 && g.yOf(i) <= 44) && ownCost(g, after.path) <= 1.10 * afterA.cost));
    // 3. removal restores the original graph and route cost
    for (let y = 36; y <= 44; y++) g.setWalkable(112, y, 0, column[y - 36] === 1);
    g.setWalkable(37, 37, 0, true);
    const cacheBeforeFlush = pf.stats().cacheEntries;
    const n3 = pf.flush();
    const cacheAfterFlush = pf.stats().cacheEntries;
    const restored = pf.findPath(s, e, { mask: 0 });
    const graphRestoredOk = sameGraph(pf, pf0);
    const costRestoredOk = restored.status === "found" && before.status === "found" && ownCost(g, restored.path) === ownCost(g, before.path) && ownCost(g, before.path) <= 1.10 * beforeA.cost;
    check("incremental_update",
        n1 === 1 && (r1 - r0) === 1 && n2 >= 2 && n2 <= 4 && (r2 - r1) === n2 && graphAfterOk && pathAfterOk && n3 >= 2 && n3 <= 4 && graphRestoredOk && costRestoredOk,
        `interior wall rebuilt ${n1} cluster (metric ${r1 - r0}); border wall rebuilt ${n2} (metric ${r2 - r1}); graph after == fresh ${graphAfterOk}; ` +
        `route after: ${after.status} cost ${after.cost} (astar ${afterA.cost}) avoids wall ${pathAfterOk}; removal rebuilt ${n3}; graph restored ${graphRestoredOk}; cost restored ${costRestoredOk} (${restored.cost} vs ${before.cost}, astar ${beforeA.cost})`);
    check("incremental_version", pf.graphVersion === 4 && pf.stats().dirty === 0 && cacheBeforeFlush === 1 && cacheAfterFlush === 0,
        `graphVersion ${pf.graphVersion} after build + 3 flushes, dirty ${pf.stats().dirty}, cache entries before flush ${cacheBeforeFlush}, after ${cacheAfterFlush}`);
}

//----------------------------------------------------------------------------------------------------------
// connectivity: a dig merges components in place; a wall marks them stale; stale never reports unreachable
//----------------------------------------------------------------------------------------------------------
if (runOnly("connectivity")) {
    const g = P.createGrid({ width: W, height: H });
    // a sealed 40x40 room at (200..239, 200..239)
    for (let x = 200; x <= 239; x++) { g.walk[g.index(x, 200, 0)] = 0; g.walk[g.index(x, 239, 0)] = 0; }
    for (let y = 200; y <= 239; y++) { g.walk[g.index(200, y, 0)] = 0; g.walk[g.index(239, y, 0)] = 0; }
    const pf = P.createPathfinder(g, { cache: false });
    pf.build();
    const inside = g.index(220, 220, 0), outside = g.index(100, 100, 0);
    const a = pf.findPath(outside, inside, { mask: 0 });
    const fastFailed = a.status === "unreachable" && a.reason === "connectivity" && pf.metrics.connectivityFastFails === 1;
    // dig a doorway: merge-only edit, so no full rebuild and not stale
    const rebuildsBefore = pf.metrics.connectivityRebuilds;
    g.setWalkable(200, 220, 0, true);
    pf.flush();
    const mergedLive = !pf.connectivityStale && pf.metrics.connectivityRebuilds === rebuildsBefore && pf.metrics.connectivityMerges === 1;
    const b = pf.findPath(outside, inside, { mask: 0 });
    const bOk = b.status === "found" && !ownValidate(g, b.path, 0) && pf.metrics.connectivityFastFails === 1;
    // wall it up again: suspected split, stale until a search needs it, then rebuilt and a real fast-fail
    g.setWalkable(200, 220, 0, false);
    pf.flush();
    const staleAfterWall = pf.connectivityStale;
    const c = pf.findPath(outside, inside, { mask: 0 });
    const cOk = c.status === "unreachable" && c.reason === "connectivity" && pf.metrics.connectivityRebuilds === rebuildsBefore + 1 && !pf.connectivityStale;
    // with automatic rebuilds off, stale connectivity must fall back to a real search, never a fast fail
    const pf2 = P.createPathfinder(g, { cache: false, autoConnectivity: false });
    pf2.build();
    g.setWalkable(239, 220, 0, true);  // open the east wall: the room is reachable again
    pf2.flush();
    const d = pf2.findPath(outside, inside, { mask: 0 });
    const dOk = pf2.connectivityStale && d.status === "found" && d.reason !== "connectivity" && pf2.metrics.connectivityFastFails === 0;
    g.setWalkable(239, 220, 0, false);
    check("connectivity", fastFailed && mergedLive && bOk && staleAfterWall && cOk && dOk,
        `sealed room: ${a.status} (${a.reason}, ${a.expansions} expansions); dig: stale ${pf.connectivityStale}, merges ${pf.metrics.connectivityMerges}, route ${b.status}; ` +
        `wall again: stale ${staleAfterWall} then ${c.status} (${c.reason}) after ${pf.metrics.connectivityRebuilds - rebuildsBefore} rebuild; manual mode stale ${pf2.connectivityStale}: ${d.status} (${d.reason || "real search"})`);
}

//----------------------------------------------------------------------------------------------------------
// budget: step(budget) never expands more than budget, and resuming in chunks gives the one-shot path
//----------------------------------------------------------------------------------------------------------
if (runOnly("budget")) {
    const g = obstacleGrid(31337);
    const queries = randomQueries(g, 3, 6, 200);
    const pfOne = P.createPathfinder(g, { cache: false }); pfOne.build();
    const pfStep = P.createPathfinder(g, { cache: false }); pfStep.build();
    let maxUsed = 0, steps = 0, mismatches = 0, found = 0;
    for (const [s, e] of queries) {
        const one = pfOne.findPath(s, e, { mask: 0 });
        const search = pfStep.beginSearch(s, e, { mask: 0 });
        while (search.status === "running") {
            const used = search.step(100);
            steps++;
            if (used > maxUsed) maxUsed = used;
            if (used === 0 && search.status === "running") { mismatches++; break; }
        }
        const r = search.result();
        if (r.status !== one.status || (r.status === "found" && P.hashPath(r.path) !== P.hashPath(one.path))) mismatches++;
        if (r.status === "found") found++;
        if (r.expansions !== one.expansions) mismatches++;
    }
    check("budget", maxUsed <= 100 && mismatches === 0 && found > 0 && steps > queries.length * 3,
        `${queries.length} routes stepped at 100 nodes: max per step ${maxUsed}, ${steps} steps, ${found} found, ${mismatches} mismatches vs one-shot`);
    // the scheduler keeps every tick within its budget and completes in priority order
    const sched = P.createScheduler(pfStep, { budgetPerTick: 500 });
    const [s0, e0] = queries[0], [s1, e1] = queries[1], [s2, e2] = queries[2];
    const idHaul = sched.request(s0, e0, { mask: 0, priority: P.PRIORITY.HAUL });
    const idCombat = sched.request(s1, e1, { mask: 0, priority: P.PRIORITY.COMBAT });
    const idOrder = sched.request(s2, e2, { mask: 0, priority: P.PRIORITY.ORDER });
    const order = [];
    let tickMax = 0, ticks = 0;
    while (sched.pending() > 0 && ticks < 10000) { const done = sched.tick(); ticks++; tickMax = Math.max(tickMax, sched.lastTickExpansions); for (const d of done) order.push(d.id); }
    const expect = [idCombat, idOrder, idHaul];
    const sameAsOneShot = [idHaul, idCombat, idOrder].every((id, k) => {
        const one = pfOne.findPath(queries[k][0], queries[k][1], { mask: 0 });
        const r = sched.result(id);
        return r && r.status === one.status && (r.status !== "found" || P.hashPath(r.path) === P.hashPath(one.path));
    });
    check("scheduler", tickMax <= 500 && order.join() === expect.join() && sameAsOneShot && ticks > 1,
        `completion order ${order.join(",")} (expected ${expect.join(",")}), ${ticks} ticks, max per tick ${tickMax}, results match one-shot ${sameAsOneShot}`);
    // a search paused mid-way when a flush rebuilds the graph restarts and answers for the new grid
    const [s3, e3] = queries[3];
    const probe = pfOne.findPath(s3, e3, { mask: 0 });
    // the goal cluster's entrance on its route: walling it while the search is paused in the abstract phase replaces
    // the goal-link nodes, so the search must restart (its goal links name freed ids) and answer for the new grid
    const cut = pfOne.nodeTile[probe.abstractPath[probe.abstractPath.length - 2]];
    const paused = pfStep.beginSearch(s3, e3, { mask: 0 });
    let stepsBefore = 0;
    while (paused.status === "running" && paused.phase < P.PH.ABSTRACT && stepsBefore < 10000) { paused.step(10); stepsBefore++; }
    const wasRunning = paused.status === "running" && paused.phase === P.PH.ABSTRACT;
    g.setWalkableAt(cut, false);
    const rebuilt = pfStep.flush();
    while (paused.status === "running") paused.step(100);
    const pr = paused.result();
    const expectFresh = () => { const f = P.createPathfinder(g, { cache: false }); f.build(); return f.findPath(s3, e3, { mask: 0 }); };
    const fr = expectFresh();
    g.setWalkableAt(cut, true);
    pfStep.flush();
    check("inflight_rebuild", wasRunning && rebuilt >= 1 && pfStep.metrics.restarts === 1 && pr.status === fr.status && (pr.status !== "found" || (!ownValidate(g, pr.path, 0) && !pr.path.includes(cut) && pr.cost === fr.cost)),
        `paused in the abstract phase after ${stepsBefore} steps of 10, goal-cluster entrance walled, flush rebuilt ${rebuilt}; restarts ${pfStep.metrics.restarts}; result ${pr.status} cost ${pr.cost} vs fresh ${fr.status} cost ${fr.cost}`);
}

//----------------------------------------------------------------------------------------------------------
// fall-throughs: a same-cluster pair whose only route leaves the cluster, and a short query whose only route
// is a long detour, must both reach the hierarchy instead of reporting unreachable
//----------------------------------------------------------------------------------------------------------
section("fallthrough", () => {
    const g = P.createGrid({ width: W, height: H });
    for (let y = 160; y <= 175; y++) g.walk[g.index(168, y, 0)] = 0;      // a wall spanning cluster (10,10) top to bottom
    const pf = P.createPathfinder(g, { cache: false });
    pf.build();
    const s = g.index(164, 168, 0), e = g.index(172, 168, 0);              // same cluster, 8 tiles apart, wall between
    const r = pf.findPath(s, e, { mask: 0, shortQueryTiles: 0 });          // forced through the hierarchy
    const a = pf.findPathAStar(s, e, { mask: 0 });
    const leaves = r.status === "found" && r.path.some(i => g.yOf(i) < 160 || g.yOf(i) > 175);
    check("same_cluster_detour", r.status === "found" && r.mode === "hpa" && !ownValidate(g, r.path, 0) && leaves && ownCost(g, r.path) <= 1.10 * a.cost && r.abstractPath.length > 2,
        `hpa ${r.status} (${r.mode}) cost ${r.cost} leaving the cluster ${leaves} via ${r.abstractPath ? r.abstractPath.length - 2 : 0} nodes; astar ${a.status} cost ${a.cost}`);
    // a U-shaped wall around the goal: 20 tiles apart, but the plain A* must give up at its cap and fall back
    const g2 = P.createGrid({ width: W, height: H });
    for (let x = 300; x <= 500; x++) { g2.walk[g2.index(x, 350, 0)] = 0; g2.walk[g2.index(x, 450, 0)] = 0; }
    for (let y = 350; y <= 450; y++) g2.walk[g2.index(500, y, 0)] = 0;
    const pf2 = P.createPathfinder(g2, { cache: false });
    pf2.build();
    const s2 = g2.index(480, 340, 0), e2 = g2.index(480, 360, 0);          // across the top arm of the U: the way in is 180 tiles west
    const r2 = pf2.findPath(s2, e2, { mask: 0 });
    const a2 = pf2.findPathAStar(s2, e2, { mask: 0 });
    check("short_query_detour", r2.status === "found" && r2.mode === "hpa" && pf2.metrics.plainFallbacks === 1 && !ownValidate(g2, r2.path, 0) && ownCost(g2, r2.path) <= 1.10 * a2.cost,
        `20 tiles apart: ${r2.status} (${r2.mode}) cost ${r2.cost} after ${pf2.metrics.plainFallbacks} plain fallback; astar cost ${a2.cost} with ${a2.expansions} expansions`);
});

//----------------------------------------------------------------------------------------------------------
// lazy_refinement: the macro path is the answer, hops are refined on demand, and a sealed hop reports stale
//----------------------------------------------------------------------------------------------------------
section("lazy_refinement", () => {
    const g = obstacleGrid(2222);
    const pf = P.createPathfinder(g, { cache: false });
    pf.build();
    const queries = randomQueries(g, 21, 30, 100);
    let n = 0, invalid = 0, hops = 0, mismatch = 0, worse = 0, maxHop = 0;
    for (const [s, e] of queries) {
        const eager = pf.findPath(s, e, { mask: 0 });
        const lazy = pf.beginSearch(s, e, { mask: 0, lazy: true });
        while (lazy.status === "running") lazy.step(1 << 30);
        if (lazy.status !== eager.status) { mismatch++; continue; }
        if (lazy.status !== "found") continue;
        n++;
        if (lazy.refined || lazy.result().path.length !== 1) mismatch++;
        if (P.hashPath(lazy.abstractPath) !== P.hashPath(eager.abstractPath)) mismatch++;
        let seg;
        while ((seg = lazy.refineNext()) !== null) { hops++; if (seg.length > maxHop) maxHop = seg.length; if (seg.length > 40) mismatch++; }
        const r = lazy.result();
        if (!r.refined || r.path[r.path.length - 1] !== e) mismatch++;
        if (ownValidate(g, r.path, 0)) invalid++;
        if (ownCost(g, r.path) > 1.10 * eager.cost) worse++;
    }
    // sealing a hop after the macro path was found: refineNext reports stale instead of a path through the wall
    const [s, e] = queries[0];
    const lazy = pf.beginSearch(s, e, { mask: 0, lazy: true });
    while (lazy.status === "running") lazy.step(1 << 30);
    const sealTile = pf.nodeTile[lazy.abstractPath[2]];
    g.setWalkableAt(sealTile, false);
    pf.flush();
    let staleSeg = null, calls = 0;
    while ((staleSeg = lazy.refineNext()) !== null && calls < 100) calls++;
    const staleOk = lazy.status === "stale" && lazy.reason === "portal_sealed" && !lazy.result().path.includes(sealTile);
    g.setWalkableAt(sealTile, true);
    check("lazy_refinement", n >= 20 && invalid === 0 && mismatch === 0 && worse === 0 && hops > n * 3 && staleOk,
        `${n} routes refined in ${hops} hops (longest hop ${maxHop} tiles): invalid ${invalid}, mismatches ${mismatch}, worse than eager by >10 % ${worse}; sealed hop -> ${lazy.status} (${lazy.reason}) after ${calls} hops`);
});

//----------------------------------------------------------------------------------------------------------
// smoothing_no_loops: string-pulling never leaves a revisited tile (a 70x200 grid with 25 % blocks reproduced
// the loop that a straightened segment can make through a tile the path reaches again)
//----------------------------------------------------------------------------------------------------------
section("smoothing_no_loops", () => {
    const w = 70, h = 200;
    const g = P.createGrid({ width: w, height: h });
    const rnd = mulberry32(w * h);
    for (let i = 0; i < w * h; i++) if (rnd() < 0.25) g.walk[i] = 0;
    const pf = P.createPathfinder(g, { cache: false });
    pf.build();
    let n = 0, loops = 0, invalid = 0, shorter = 0;
    while (n < 100) {
        const s = (rnd() * w * h) | 0, e = (rnd() * w * h) | 0;
        if (!g.walk[s] || !g.walk[e]) continue;
        n++;
        const r = pf.findPath(s, e, { mask: 0, shortQueryTiles: 0 });
        if (r.status !== "found") continue;
        if (new Set(r.path).size !== r.path.length) loops++;
        const raw = pf.findPath(s, e, { mask: 0, shortQueryTiles: 0, smoothWindow: 0 });
        if (ownCost(g, r.path) > ownCost(g, raw.path)) invalid++;
        if (ownCost(g, r.path) < ownCost(g, raw.path)) shorter++;
        // the test's validator: adjacency, passability, corners and no revisits, on a 70-wide torus
        const seen = new Set();
        for (let i = 0; i < r.path.length; i++) {
            const t = r.path[i];
            if (seen.has(t) || g.walk[t] !== 1) { invalid++; break; }
            seen.add(t);
            if (i === 0) continue;
            const a = r.path[i - 1];
            let dx = ((g.xOf(t) - g.xOf(a)) % w + w) % w; if (dx > w / 2) dx -= w;
            let dy = ((g.yOf(t) - g.yOf(a)) % h + h) % h; if (dy > h / 2) dy -= h;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || (dx === 0 && dy === 0)) { invalid++; break; }
            if (dx !== 0 && dy !== 0 && (g.walk[g.index(g.xOf(a) + dx, g.yOf(a), 0)] !== 1 || g.walk[g.index(g.xOf(a), g.yOf(a) + dy, 0)] !== 1)) { invalid++; break; }
        }
    }
    check("smoothing_no_loops", loops === 0 && invalid === 0 && shorter > 0, `${n} routes on 70x200: revisits ${loops}, invalid or longer than unsmoothed ${invalid}, shortened by smoothing ${shorter}`);
});

//----------------------------------------------------------------------------------------------------------
// dig_storm (spec phase 4): 50 edits per tick while agents keep requesting routes through the scheduler;
// every completed route must be valid for the grid of its tick, agree with A* on reachability, and the
// incremental graph must still equal a from-scratch build at the end
//----------------------------------------------------------------------------------------------------------
section("dig_storm", () => {
    const g = obstacleGrid(606);
    const pf = P.createPathfinder(g, { cache: true });
    pf.build();
    const ref = P.createPathfinder(g, { cache: false });   // the plain-A* reference: the scheduler's pathfinder may hold a paused search
    ref.build();
    const sched = P.createScheduler(pf, { budgetPerTick: P.DEFAULT_BUDGET });   // the spec's 2,500 nodes per tick
    const rnd = mulberry32(77);
    const pending = new Map();
    let completed = 0, invalid = 0, disagree = 0, found = 0, restarts = 0, edits = 0, maxTick = 0, duringStorm = 0;
    const randomTile = () => g.index((rnd() * W) | 0, (rnd() * H) | 0, 0);
    const STORM_TICKS = 60;
    for (let tick = 0; tick < STORM_TICKS + 400 && (tick < STORM_TICKS || sched.pending() > 0); tick++) {
        const storm = tick < STORM_TICKS;
        if (storm) for (let k = 0; k < 50; k++) { const t = randomTile(); g.setWalkableAt(t, g.walk[t] !== 1); edits++; }   // 50 digs/walls per tick
        if (storm) {   // one new route per tick: about the budget's capacity for a median long route
            let s = randomTile(), e = randomTile();
            while (!g.walk[s] || !g.walk[e]) { s = randomTile(); e = randomTile(); }
            pending.set(sched.request(s, e, { mask: 0, priority: (rnd() * 3) | 0 }), [s, e]);
        }
        const done = sched.tick();
        ref.flush();
        maxTick = Math.max(maxTick, sched.lastTickExpansions);
        restarts = pf.metrics.restarts;
        if (storm) duringStorm += done.length;
        for (const r of done) {
            const [s, e] = pending.get(r.id);
            pending.delete(r.id);
            completed++;
            const a = ref.findPathAStar(s, e, { mask: 0 });
            if (r.status === "found") {
                found++;
                if (ownValidate(g, r.path, 0)) invalid++;
                if (a.status !== "found") disagree++;
            } else if (r.status === "unreachable" && a.status === "found") disagree++;
        }
    }
    const requested = completed + pending.size;
    const freshPf = P.createPathfinder(g, { cache: false });
    freshPf.build();
    const graphSame = JSON.stringify(pf.snapshotGraph()) === JSON.stringify(freshPf.snapshotGraph());
    // Under edits every tick, routes longer than one tick's budget must still complete: a search restarts only
    // when a cluster it touched was rebuilt, so completions during the storm stay near the request rate.
    check("dig_storm", requested === STORM_TICKS && pending.size === 0 && duringStorm >= STORM_TICKS / 3 && restarts <= STORM_TICKS / 3 && invalid === 0 && disagree === 0 && maxTick <= P.DEFAULT_BUDGET && graphSame,
        `${edits} edits over ${STORM_TICKS} ticks at budget ${P.DEFAULT_BUDGET}: ${requested} routes requested, ${duringStorm} completed during the storm, ${completed} in all (${found} found, ${pending.size} left), invalid ${invalid}, A* disagreements ${disagree}, restarts ${restarts}, max tick expansions ${maxTick}, graph == fresh ${graphSame}`);
});

//----------------------------------------------------------------------------------------------------------
// connectivity_reuse: dig-only flushes that free and recycle entrance node ids must leave the live components
// equal to a from-scratch rebuild (a recycled id inside a union-find chain used to split a component)
//----------------------------------------------------------------------------------------------------------
section("connectivity_reuse", () => {
    const g = P.createGrid({ width: W, height: H });
    const rnd = mulberry32(4040);
    for (let i = 0; i < W * H; i++) if (rnd() < 0.40) g.walk[i] = 0;      // dense: entrance runs change on most digs
    const pf = P.createPathfinder(g, { cache: false });
    pf.build();
    const ref = P.createPathfinder(g, { cache: false });
    ref.build();
    let rounds = 0, recycled = 0, merged = 0, mismatches = 0, falseUnreachable = 0, queries = 0;
    const liveRoots = () => { const out = []; for (let id = P.FIRST_NODE; id < pf.nodeHigh; id++) if (pf.nodeAlive[id]) out.push([id, pf.componentOf(id)]); return out; };
    for (let round = 0; round < 40; round++) {
        let opened = 0;
        while (opened < 20) { const t = g.index((rnd() * W) | 0, (rnd() * H) | 0, 0); if (g.walk[t] === 1) continue; g.setWalkableAt(t, true); opened++; }
        const freedBefore = pf.metrics.nodesFreed;
        pf.flush();
        ref.flush();
        rounds++;
        if (pf.metrics.nodesFreed > freedBefore) recycled++;
        if (!pf.connectivityStale) {
            merged++;
            const live = liveRoots();
            pf.rebuildConnectivity();
            const fresh = new Map(liveRoots());
            const l2f = new Map(), f2l = new Map();
            for (const [id, root] of live) {
                const fr = fresh.get(id);
                if ((l2f.has(root) && l2f.get(root) !== fr) || (f2l.has(fr) && f2l.get(fr) !== root)) { mismatches++; break; }
                l2f.set(root, fr); f2l.set(fr, root);
            }
        }
        for (let q = 0; q < 5; q++) {
            const s = g.index((rnd() * W) | 0, (rnd() * H) | 0, 0), e = g.index((rnd() * W) | 0, (rnd() * H) | 0, 0);
            if (!g.walk[s] || !g.walk[e]) continue;
            queries++;
            const r = pf.findPath(s, e, { mask: 0, shortQueryTiles: 0 });
            if (r.status === "unreachable" && ref.findPathAStar(s, e, { mask: 0 }).status === "found") falseUnreachable++;
        }
    }
    check("connectivity_reuse", rounds === 40 && recycled >= 10 && mismatches === 0 && falseUnreachable === 0 && queries >= 50,
        `${rounds} dig-only rounds of 20 tiles: ${recycled} recycled node ids (rebuilt), ${merged} merged in place; live components != fresh ${mismatches}; false unreachable ${falseUnreachable} of ${queries} queries`);
});

//----------------------------------------------------------------------------------------------------------
// lazy_flush_invalidation: a flush anywhere ends an in-flight lazy refinement with stale, never a bad path
//----------------------------------------------------------------------------------------------------------
section("lazy_flush_invalidation", () => {
    const g = obstacleGrid(909);
    const pf = P.createPathfinder(g, { cache: false });
    pf.build();
    let n = 0, stale = 0, bad = 0, refinedAfterFlush = 0;
    for (const [s, e] of randomQueries(g, 13, 15, 120)) {
        const lazy = pf.beginSearch(s, e, { mask: 0, lazy: true });
        while (lazy.status === "running") lazy.step(1 << 30);
        if (lazy.status !== "found") continue;
        n++;
        lazy.refineNext();                                           // one hop walked
        const far = g.index(g.xOf(s) + 384, g.yOf(s) + 384, 0);   // an interior edit on the far side of the torus (index wraps)
        g.setWalkableAt(far, g.walk[far] !== 1);
        pf.flush();
        let seg, hops = 0;
        while ((seg = lazy.refineNext()) !== null && hops < 500) hops++;
        const r = lazy.result();
        if (lazy.status === "stale") stale++;
        else if (r.refined) { refinedAfterFlush++; if (ownValidate(g, r.path, 0)) bad++; }
        if (r.path && ownValidate(g, r.path, 0) && lazy.status !== "stale") bad++;
    }
    check("lazy_flush_invalidation", n >= 10 && stale === n && refinedAfterFlush === 0 && bad === 0,
        `${n} lazy routes, one hop walked, then an unrelated flush: ${stale} went stale, ${refinedAfterFlush} kept refining, ${bad} invalid paths`);
});

//----------------------------------------------------------------------------------------------------------
// epoch_rollover: searches straddling the epoch wrap give the same paths as before it
//----------------------------------------------------------------------------------------------------------
if (runOnly("epoch_rollover")) {
    const g = obstacleGrid(2024);
    const pf = P.createPathfinder(g, { cache: false });
    pf.build();
    // ten short routes (plain A*: the tile workspace) and ten long ones (the hierarchy: node and local epochs)
    const rnd = mulberry32(8);
    const queries = [];
    while (queries.length < 20) {
        const sx = (rnd() * W) | 0, sy = (rnd() * H) | 0;
        const far = queries.length >= 10;
        const ex = sx + (far ? 200 : 20) + ((rnd() * 10) | 0), ey = sy + ((rnd() * 10) | 0);
        const s = g.index(sx, sy, 0), e = g.index(ex, ey, 0);
        if (g.walk[s] && g.walk[e]) queries.push([s, e]);
    }
    const modes = [];
    const run = () => queries.map(([s, e]) => { const r = pf.findPath(s, e, { mask: 0 }); modes.push(r.mode); return r.status === "found" ? P.hashPath(r.path) : r.status; });
    const baseline = run();   // the first route ran at tile epoch 1, the first hierarchical one at node and local epoch 1
    // the next epoch request rolls over to 1 again, so each workspace meets the marks its first route left behind
    pf.ws.epoch = P.EPOCH_MAX;
    pf.nodeEpoch = P.EPOCH_MAX;
    pf.local.epoch = P.EPOCH_MAX;
    const after = run();
    const st = pf.stats();
    const same = after.join() === baseline.join();
    check("epoch_rollover", same && modes.includes("plain") && modes.includes("hpa") && st.tileEpochRollovers === 1 && st.nodeEpochRollovers === 1 && st.localEpochRollovers === 1 && st.tileEpoch >= 1 && st.tileEpoch < 100,
        `${queries.length} routes (${modes.filter(m => m === "plain").length} plain, ${modes.filter(m => m === "hpa").length} hpa) identical across the rollover: ${same}; rollovers tile ${st.tileEpochRollovers}, node ${st.nodeEpochRollovers}, local ${st.localEpochRollovers}; tile epoch now ${st.tileEpoch}`);
}

//----------------------------------------------------------------------------------------------------------
// open_overflow: a too-small open list ends the search with status open_overflow and a counted metric
//----------------------------------------------------------------------------------------------------------
if (runOnly("open_overflow")) {
    const g = obstacleGrid(5);
    const pf = P.createPathfinder(g, { maxOpen: 64, cache: false });
    pf.build();
    const [s, e] = randomQueries(g, 9, 1, 300)[0];
    const plain = pf.findPathAStar(s, e, { mask: 0 });
    const hpa = pf.findPath(s, e, { mask: 0 });
    check("open_overflow", plain.status === "open_overflow" && hpa.status === "open_overflow" && pf.metrics.openListOverflow === 2,
        `plain ${plain.status}, hpa ${hpa.status} (${hpa.reason}), metric ${pf.metrics.openListOverflow}`);
    const big = P.createPathfinder(g, { maxOpen: 1 << 22, cache: false });
    big.build();
    const ok = big.findPath(s, e, { mask: 0 });
    check("open_overflow_zero_on_test_seed", ok.status === "found" && big.metrics.openListOverflow === 0, `default cap: ${ok.status}, overflow metric ${big.metrics.openListOverflow}`);
}

//----------------------------------------------------------------------------------------------------------
// cave_in_bfs: a unit inside a wall mass finds the nearest open tile within 3, or is stuck
//----------------------------------------------------------------------------------------------------------
if (runOnly("cave_in_bfs")) {
    const g = P.createGrid({ width: W, height: H });
    const pf = P.createPathfinder(g);
    for (let y = 100; y <= 104; y++) for (let x = 100; x <= 104; x++) g.walk[g.index(x, y, 0)] = 0;   // 5x5 block, centre (102,102)
    for (let y = 200; y <= 206; y++) for (let x = 200; x <= 206; x++) g.walk[g.index(x, y, 0)] = 0;   // 7x7 block, centre (203,203)
    const near5 = pf.nearestOpen(102, 102, 0, 0, 3);
    const near5r2 = pf.nearestOpen(102, 102, 0, 0, 2);
    const stuck7 = pf.nearestOpen(203, 203, 0, 0, 3);
    const p = near5 === null ? null : g.toPoint(near5);
    check("cave_in_bfs", near5 !== null && p && Math.max(Math.abs(p.x - 102), Math.abs(p.y - 102)) === 3 && (p.x === 102 || p.y === 102) && near5r2 === null && stuck7 === null,
        `5x5 block: nearest open ${p ? `(${p.x},${p.y})` : "none"} at radius 3, radius 2 -> ${near5r2 === null ? "stuck" : "open"}; 7x7 block: ${stuck7 === null ? "stuck" : "open"}`);
}

//----------------------------------------------------------------------------------------------------------
// heap: the open list orders by f, then h, then key, grows, and reports overflow
//----------------------------------------------------------------------------------------------------------
if (runOnly("heap")) {
    const h = new P.OpenList(16, 64);
    const rnd = mulberry32(1);
    const items = [];
    for (let i = 0; i < 60; i++) { const it = [(rnd() * 20) | 0, (rnd() * 5) | 0, (rnd() * 100) | 0, i]; items.push(it); h.push(it[0], it[1], it[2], it[3]); }
    const sorted = items.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3]);
    let ordered = true;
    for (let i = 0; i < sorted.length; i++) { h.pop(); if (h.f !== sorted[i][0] || h.h !== sorted[i][1] || h.id !== sorted[i][2] || h.id2 !== sorted[i][3]) { ordered = false; break; } }
    const empty = !h.pop();
    for (let i = 0; i < 64; i++) h.push(1, 1, i, 0);
    const overflow = !h.push(1, 1, 999, 0) && h.overflowed;
    check("heap", ordered && empty && h.grows === 2 && overflow, `60 entries popped in (f, h, key, key2) order ${ordered}, grew ${h.grows} times, overflow reported ${overflow}`);
}

//----------------------------------------------------------------------------------------------------------
// stale_identity: entrance ids are not stable across a flush, and a non-found search must not return tiles
//----------------------------------------------------------------------------------------------------------
section("stale_identity", () => {
    const w = 64, h = 64;
    const g = P.createGrid({ width: w, height: h });
    g.setWalkable(3, 3, 0, false);
    const pf = P.createPathfinder(g, { cache: false });
    pf.build();
    const wall = pf.findPath(g.index(3, 3, 0), g.index(3, 3, 0), { mask: 0 });
    const open = pf.findPath(g.index(4, 4, 0), g.index(4, 4, 0), { mask: 0 });
    const trivialOk = wall.status === "blocked" && wall.reason === "start" && wall.path === null
        && open.status === "found" && open.path.length === 1 && open.cost === 0;

    // Two runs on the x=15/16 seam. Opening the tile between them replaces entrance nodes.
    // A lazy macro path that still holds the old ids must go stale, not walk the reused tiles.
    for (let x = 15; x < w; x += 16) {
        for (let y = 0; y < h; y++) {
            g.setWalkable(x, y, 0, false);
            g.setWalkable(x + 1, y, 0, false);
        }
        for (const y of [0, 1, 2, 4, 5, 6]) {
            g.setWalkable(x, y, 0, true);
            g.setWalkable(x + 1, y, 0, true);
        }
    }
    pf.flush();
    const s = g.index(2, 30, 0), e = g.index(34, 30, 0);
    const lazy = pf.beginSearch(s, e, { mask: 0, lazy: true, shortQueryTiles: 0 });
    while (lazy.status === "running") lazy.step(1 << 20);
    const macroStatus = lazy.status;
    const macroOk = macroStatus === "found";
    g.setWalkable(15, 3, 0, true);
    g.setWalkable(16, 3, 0, true);
    pf.flush();
    const seg = lazy.refineNext();
    const staleOk = seg === null && lazy.status === "stale" && lazy.reason === "portal_sealed";

    // A search already refining, flushed, then the goal walled: restart, and the blocked result has no path.
    const g2 = P.createGrid({ width: w, height: h });
    const pf2 = P.createPathfinder(g2, { cache: false, shortQueryTiles: 0 });
    pf2.build();
    const s2 = g2.index(1, 1, 0), e2 = g2.index(50, 40, 0);
    const search = pf2.beginSearch(s2, e2, { mask: 0 });
    let guard = 0;
    while (search.status === "running" && !(search.path && search.path.length > 3) && guard++ < 10000) search.step(15);
    const midOk = search.status === "running" && search.path && search.path.length > 3;
    g2.setWalkable(50, 40, 0, false);
    pf2.flush();
    while (search.status === "running" && guard++ < 20000) search.step(500);
    const rr = search.result();
    const restartOk = rr.status === "blocked" && rr.reason === "goal" && rr.path === null;

    check("stale_identity", trivialOk && macroOk && staleOk && midOk && restartOk,
        `trivial wall ${wall.status}/${wall.reason} path ${wall.path === null ? "null" : "set"}, open ${open.status}; ` +
        `lazy macro ${macroStatus} then ${lazy.status}/${lazy.reason} seg ${seg === null ? "null" : "tiles"}; ` +
        `restart mid ${midOk} -> ${rr.status}/${rr.reason} path ${rr.path === null ? "null" : rr.path.length}`);
});

console.log(`RESULT: ${passed} passed, ${failed} failed (exit ${failed ? 1 : 0})${mutant ? ` [mutant ${mutant}]` : ""}`);
process.exit(failed ? 1 : 0);
