# DEUS_Pathfinding (CORE-HPA)

Hierarchical pathfinding (HPA* with HAA*-style door bitmasks) for the wrapping 768x768 tile world. Standalone build of lane CORE-HPA (`docs/lanes/CORE-HPA.md`, Owner-approved design 2026-10-03), implemented 2026-10-03 on branch `task/core-hpa-impl-fable` per the Owner's brief: a self-contained module plus headless Node tests, no game integration.

**Owner:** Claude (writer); cross-family review pending · **File:** `game/js/deus/DEUS_Pathfinding.js` (CommonJS; also publishes `window.DEUS.Pathfinding`, `window.UF` alias) · **Loaded by:** nothing yet. Engine bridge: DEFERRED to the integration the Owner authorises after ORG-0.2 is green (colonist movement, the duplicate A* in `DEUS_Movement8D.js`, the FlowFields decision). Player-facing status: NOT YET PLAYABLE. Under DEC-087 item 7 a module no plugin loads needs no GAME TRANSLATION block; one is owed by the integration lane.

## Purpose

Answer "how does unit U walk from tile A to tile B" on one z-level of the torus world in a bounded, deterministic amount of work per tick, with routes within 10 % of plain A* and with faction doors respected. The world is cut into 16x16 clusters (48x48 per level); walkable runs along cluster borders become entrance nodes; an abstract graph of entrance nodes (inter-edges across borders, intra-edges inside clusters) is searched first, then each abstract hop is refined by a cluster-local A* and the tile path is string-pulled. Tile edits mark their cluster dirty; `flush()` at tick start rebuilds only dirty clusters.

What this build does **not** do (CORE-HPA phase 2, out of the brief's scope): stairs, ramps, drops, cross-level searches (`beginSearch` throws for different z). The storage layer is already z-aware (`idx = x + y*768 + (z - zMin)*768*768`, zero-based storage behind signed world z, per the spec's clarification). Smoothing works on path waypoints only; it cannot remove the two-row detour to an entrance at a chunk centre on open ground (see Known limits).

## Public API (`require("game/js/deus/DEUS_Pathfinding.js")` or `DEUS.Pathfinding`)

| Member | Description |
|---|---|
| `createGrid({ width=768, height=768, depth=1, zMin=0, walkable=true })` → `Grid` | Flat `walk` (`Uint8Array`, 1 = walkable) and `door` (`Uint32Array`, 0 = none, else the bitmask of agents allowed through) |
| `Grid.index(x, y, z)` → tile index | x and y wrap (`((c % W) + W) % W`); z must be inside `[zMin, zMin + depth - 1]` |
| `Grid.indexOf(p)`, `xOf/yOf/zOf(idx)`, `toPoint(idx)` | Conversions; `indexOf` takes a tile index or `{x, y, z}` |
| `Grid.canPass(idx, mask)` | Walkable and (no door or `door & mask` non-zero) |
| `Grid.setWalkable(x, y, z, bool)`, `setWalkableAt(idx, bool)`, `setDoor(x, y, z, mask)`, `setDoorAt(idx, mask)`, `fillRect(...)` | Edits; each notifies `onChange` listeners with `(idx, kind)`, kind `open`, `block` or `door` |
| `createPathfinder(grid, opts)` → `Pathfinder` | Options: `maxOpen` (1<<22 entries per heap), `shortQueryTiles` (32), `shortQueryMaxExpansions` (4096), `smoothWindow` (32, 0 = off), `cache` (true), `cacheLimit` (4096), `useConnectivity` (true), `autoConnectivity` (true) |
| `Pathfinder.build()` | Full build (every cluster, every border). `findPath`/`beginSearch` call it on first use |
| `Pathfinder.flush()` → clusters rebuilt | Tick start: rebuilds dirty clusters (+ a neighbour whose shared entrance set changed), bumps `graphVersion`, clears the cache, merges or stales connectivity (below) |
| `Pathfinder.findPath(start, goal, { mask=0, cache, smoothWindow, shortQueryTiles })` → result | One-shot. `result = { status, path, cost, expansions, mode, reason, abstractPath, refined }`; `status` is `found`, `unreachable`, `blocked` (start or goal impassable for the mask), `open_overflow`; `mode` is `plain`, `hpa`, `cached` or `direct`; `path` is an array of tile indices from start to goal |
| `Pathfinder.beginSearch(start, goal, opts)` → `Search` | Resumable search. `search.step(budget)` expands at most `budget` nodes and returns how many it used; `search.status`, `search.result()`, `search.abandon()`. One search at a time owns the worker's workspaces; a second `beginSearch` while one is running throws |
| `beginSearch(..., { lazy: true })` + `search.refineNext()` | Lazy refinement (spec: "only as far as the next portal"). The search is `found` as soon as the macro path exists (`path` holds the start tile, `refined` false); each `refineNext()` refines one abstract hop on the live grid with one cluster-local A* (at most 256 expansions), smooths it, appends it to `path` and returns the new tiles, or `null` when the path is complete (`refined` true, `cost` set). A hop sealed since the macro path was found ends the search with status `stale`, reason `portal_sealed`: discard it and request again after the cluster rebuild |
| `Pathfinder.findPathAStar(start, goal, { mask, maxExpansions })` | Plain A* on the same grid and rules (the optimality reference); status `exhausted` when the cap is hit |
| `Pathfinder.nearestOpen(x, y, z, mask, radius<=3)` → tile or `null` | Cave-in escape: nearest passable tile by octile distance then index; `null` means the caller's provisional `stuck` status |
| `Pathfinder.rebuildConnectivity()`, `componentOf(nodeId)`, `connectivityStale` | Union-find over abstract nodes with every door open (a conservative "unreachable" only) |
| `Pathfinder.metrics`, `resetMetrics()`, `stats()` | Counters: `expansions`, `openListOverflow`, `clusterRebuilds`, `borderRescans`, `entranceChanges`, `classTables`, `cacheHits/Misses/Stores`, `connectivityRebuilds/Merges/FastFails`, `restarts`, `refineFailures`, `schedulerStalls`; `stats()` has node counts, epochs and rollovers |
| `Pathfinder.snapshotGraph()` | Canonical entrance pairs and class-0 intra edges (tests compare incremental against from-scratch state) |
| `createScheduler(pf, { budgetPerTick=2500 })` → `Scheduler` | `request(start, goal, { mask, priority })` → id; `tick()` → completed results (flushes the grid first, spends at most `budgetPerTick` expansions, one search in flight, priority then request order); `result(id)`, `take(id)`, `pending()`, `lastTickExpansions` |
| `PRIORITY` | `{ COMBAT: 0, ORDER: 1, HAUL: 2 }` |
| `wrap`, `torusDelta`, `torusAbs`, `octile`, `hashPath`, `pathCost`, `validatePath`, `removeLoops` | Helpers; `hashPath` is FNV-1a over the tile indices (determinism evidence) |
| `OpenList`, `TileWorkspace`, `TileSearch`, `LocalSearch`, `Pathfinder`, `Search`, `Scheduler`, `Grid` | The classes, exported for tests |

Rules the module keeps (spec items):
- **Costs** 10 straight, 14 diagonal, integers only. **Heuristic** octile on the torus (`dx = min(|dx|, W - |dx|)`, same for dy). **Movement** 8-way, no corner cutting: a diagonal step needs its target and both orthogonal intermediates passable.
- **Tie-breaking** lower f, then lower h, then lower tile index, then lower node id (heap keys).
- **Entrances** a run of border positions whose two tiles are walkable and door-free gets one node at its centre, or one per chunk of at most 6; a position with a door on either tile is its own one-wide entrance (so agents without the key keep the open tiles beside it). Cluster 47 borders cluster 0 on both axes.
- **Doors (HAA*-style)** one graph; a search skips what the agent cannot use. A cluster lists its distinct door masks; an agent's mask maps to a class key (bit i set when it may pass door mask i); intra-edge tables are built per class key on first use and cached on the cluster (class 0, doors as walls, is built at rebuild). Inter-edges check both tiles' doors at search time. Refinement and smoothing use the agent's mask directly.
- **Open list** a growable binary heap over parallel `Int32Array`s; past `maxOpen` entries the search ends with status `open_overflow` and `metrics.openListOverflow++`. No silent cap.
- **Closed list** one `TileWorkspace` per pathfinder (never per agent): `mark`/`g`/`parent` arrays over the grid, stamped by a search epoch (`epoch*2` open, `+1` closed). **Rollover:** at `EPOCH_MAX` (2^31 - 1) the marks are cleared and the epoch restarts at 1; the node and cluster-local workspaces do the same. Tested across the rollover.
- **Budget** `step(budget)` counts expansions in every phase (start/goal links, abstract A*, refinement segments, smoothing waypoints) and stops exactly at the budget; a resumed search gives the same path as a one-shot one. Plain state machine, no generators.
- **Short queries** at most `shortQueryTiles` (32) apart run plain A* first, capped at `shortQueryMaxExpansions`; past the cap they fall back to the hierarchy.
- **Cache** keyed by `(startCluster, goalCluster, mask)`, stamped with `graphVersion`; a hit is used only if its first node is reachable from the start and its last from the goal inside their clusters, otherwise it is a miss. **Invalidation:** every `flush()` bumps `graphVersion` and empties the map; the stamp makes any surviving entry miss.
- **In-flight search across a rebuild:** a search stamps `graphVersion` when it starts; `step()` restarts it from scratch when the version changed (`metrics.restarts`). Rebuilds use their own cluster-local workspace, so a paused search's state is never touched by `flush()`.
- **Connectivity** union-find over abstract nodes with all doors open. `flush()` unions the rebuilt clusters' edges in place when every edit only opened tiles; a blocking or door edit marks it stale (suspected split) and the next search that wants the fast-fail rebuilds it first (`autoConnectivity`), or, with automatic rebuilds off, runs a real search. A stale structure never reports unreachable.
- **Smoothing** greedy string-pulling over the refined waypoints: from waypoint i, the furthest j within `smoothWindow` whose canonical octile move sequence (Bresenham-distributed diagonals) is legal under the same passability, corner and door rules; octile is a lower bound, so cost never rises. A straightened segment can run through a tile the path reaches again later, so loops are cut afterwards (`removeLoops`, every kept step existed before).
- **Fall-throughs** (never a false unreachable): a same-cluster pair with no route inside the cluster still runs the abstract search (the direct cost is just one more edge); a short query whose plain A* hits `shortQueryMaxExpansions` continues as a hierarchical search; the connectivity fast-fail is consulted only when no direct route exists and only on fresh components.

## Events
None. The pathfinder listens to `Grid.onChange`.

## Save data
None. The grid is the truth; clusters, entrances, tables, cache and connectivity are caches rebuilt by `build()` after a load (about 1.25 s for 768x768 in the Node benchmark below; a later integration can spread it).

## Checks

`node tools/test_pathfinding_hpa.js` (headless Node, 31 checks, about 60 s; `--only=<section>` runs one section, `--runs=N` sets the determinism run count). Every check has its own validator and cost function in the test file, independent of the module's; a section that throws is recorded as a FAIL and the RESULT line is still printed. Results 2026-10-03 on the implementation branch:

| Check | FAILs when | Result 2026-10-03 |
|---|---|---|
| `determinism` | Fresh pathfinders on the same seeded grid give different hashes for 100 routes | PASS, 10 runs (and a separate `--runs=100` run), hash `29bbbfe6` both times |
| `wrap_seam_x`, `_y`, `wrap_corner` | The spec's x=5 → x=760 route (and y, corner) is invalid, misses the seam, or costs more than A* (plain mode exact, forced hierarchy within 2 %) | PASS, cost 130 / 130 / 126 = A* |
| `wrap_seam_x_long`, `_y_long`, `wrap_corner_long` | A 173-tile seam route through the hierarchy is invalid, misses the seam, or exceeds A* by more than 2 % | PASS, 1746 vs 1730 (1.009), 2426 vs 2408 |
| `corner_rule` | Any hierarchical or plain path cuts a wall corner | PASS, 101 paths, 9615 diagonal steps |
| `optimality` | Reachability disagrees with A*, a path is invalid, or any of 200 seeded routes exceeds 1.10x A* (cache off) | PASS: max 1.038, mean 1.012, p50 1.011, p90 1.019, p99 1.025, 0 over 1.10 (n = 199, 1 unreachable pair) |
| `optimality_cached` | Same with the cache on, median bar | PASS (no repeated cluster pairs in that query set, so no hits) |
| `cache_reuse` | Repeated cluster pairs from different tiles get no hits, or the median exceeds 1.10, or any route exceeds 1.25 | PASS: 62 hits / 31 misses, max 1.131, mean 1.024, p50 1.017, p90 1.054 |
| `door_masks` | Faction A cannot pass its door, B passes it or cannot use its own, mask 0 gets through, or A|B fails | PASS (A 1500 = A*, B 7792 vs 7786, mask 0 unreachable) |
| `door_start_tile` | An agent on its own door cannot leave, or a stranger starting on it is not `blocked` | PASS |
| `door_plain` | A short plain-A* route lets B through A's door | PASS (B reroutes, cost 9086) |
| `door_in_entrance_run` | A door at the centre of a five-tile gap strands agents without the key, or the border does not carry 3 entrances | PASS |
| `incremental_update` | Rebuild counts are off (interior 1, border 2..4), the incremental graph differs from a from-scratch build, the new route crosses the wall, or removal does not restore graph and cost | PASS |
| `incremental_version` | `graphVersion` or the cache clear at flush is wrong | PASS |
| `connectivity` | A sealed room is not a fast-fail, a dig triggers a full rebuild, a wall does not stale it, or stale connectivity reports unreachable | PASS (fast-fail after 504 expansions) |
| `budget` | A step exceeds its budget or a stepped search differs from the one-shot one | PASS (max 100 per step) |
| `scheduler` | A tick exceeds its budget, priorities complete out of order, or results differ from one-shot | PASS |
| `inflight_rebuild` | A search paused across a flush that walls an entrance on its route does not restart, or answers for the old grid | PASS (restarts 1, same path as a fresh search) |
| `same_cluster_detour` | A same-cluster pair split by a wall spanning the cluster is not routed out through the neighbours | PASS (cost 210 vs A* 204, 4 abstract nodes) |
| `short_query_detour` | A 20-tile query whose only route is a 180-tile detour does not fall back from plain A* to the hierarchy | PASS (cost 3712 = A*, 1 fallback; plain A* alone needed 75,184 expansions) |
| `lazy_refinement` | Lazy hops are invalid, longer than 40 tiles, disagree with the eager macro path, exceed 1.10x eager cost, or a sealed hop is not reported `stale` | PASS (30 routes, 1456 hops, longest 22 tiles) |
| `smoothing_no_loops` | A smoothed path revisits a tile or costs more than the unsmoothed one (70x200 grid, where the loop reproduced) | PASS (100 routes, 85 shortened) |
| `dig_storm` | Spec phase 4: 50 edits per tick for 30 ticks with 10 new requests per tick under the scheduler; any completed route invalid for its tick's grid, any A* disagreement, a tick over budget, or the incremental graph differing from a fresh build | PASS (1500 edits, 176 routes, 23 restarts, graph == fresh) |
| `epoch_rollover` | Routes differ across the epoch wrap, or a workspace does not roll over | PASS (tile, node and local rollovers 1 each) |
| `open_overflow` | A 64-entry cap does not end both plain and hierarchical searches with `open_overflow` and a count of 2 | PASS |
| `open_overflow_zero_on_test_seed` | The default cap overflows on the test seed | PASS (0) |
| `cave_in_bfs` | The 5x5 block centre has no open tile at radius 3, has one at radius 2, or the 7x7 centre is not stuck | PASS |
| `heap` | The heap pops out of (f, h, key, key2) order, does not grow, or does not report overflow | PASS |

Mutants (`--mutant=<name>`; each loads a deliberately broken module, its anchor must occur exactly once, and its check must FAIL; results 2026-10-03): `seam_closed` → wrap_seam_* forced hierarchy FAIL; `corner_cut` and `corner_cut_plain` → corner_rule FAIL; `ignore_doors` → door_masks, door_plain, door_in_entrance_run FAIL; `ignore_doors_plain` → door_masks, door_plain FAIL; `no_dirty` → incremental_update, incremental_version FAIL; `budget_ignored` → budget, scheduler, inflight_rebuild FAIL; `greedy_abstract` → optimality (max 1.415, 175 over 1.10) FAIL; `random_ties` → determinism FAIL; `no_rollover` → epoch_rollover FAIL; `overflow_silent` → open_overflow FAIL; `door_in_run` → door_in_entrance_run FAIL; `no_version_check` → inflight_rebuild FAIL; `keep_loops` → smoothing_no_loops FAIL; `no_same_cluster_fallthrough` → same_cluster_detour FAIL; `no_plain_fallback` → short_query_detour FAIL.

## Benchmark (Node, not an in-game number)

`node tools/bench_pathfinding_hpa.js`, Node v22.22.0, Linux x64 cloud container, 2026-10-03; 768x768 grid, 20 % random blocks + 300 wall segments, seed 12345, 200 routes at Chebyshev distance >= 64. Expansion counts are machine-independent; milliseconds are not, and no frame-time or overlay figure exists yet.

| Measure | Result |
|---|---|
| Full build | 1392 / 1300 / 1372 ms (3 runs); 39,360 abstract nodes; 1.97 M cluster-local expansions |
| `flush()` after one interior tile edit | median 0.53 ms, p95 0.74 ms (1 cluster) |
| `flush()` after one border tile edit | median 0.83 ms, p95 1.28 ms (1.56 clusters) |
| HPA* query, cache off | median 1.48 ms, p95 4.02 ms, max 8.6 ms; expansions median 2402, p95 5477 |
| HPA* query, cache on, repeated | median 0.53 ms, p95 0.82 ms; expansions median 992 |
| Plain A* reference | median 6.57 ms, p95 18.8 ms, max 47 ms; expansions median 13,350, p95 40,317 |
| HPA*/A* cost ratio, cache off | max 1.030, mean 1.012, p50 1.011, p90 1.018, p99 1.026 |
| Open-list overflow | 0 |

The median hierarchical query expands fewer nodes than the 2,500-per-tick budget; the p95 takes about three ticks under the scheduler.

## Status

Built and tested headless (above). Not loaded by the game, not seen in Playtest, no screenshot: the brief excluded integration. Deviations from `docs/lanes/CORE-HPA.md`, with reasons:
- DATA-RNG, CORE-PQ and CORE-SPATIAL do not exist in the repository, so the module carries its own heap and the tests seed with the repository's existing mulberry32 (`game/js/sim/combat_rt/rng.js` form).
- Entrance runs wider than 6 are split into chunks of at most 6 with a node per chunk centre (the spec's "split runs wider than six tiles" read as chunking, which the 1.10 bar favours), and a door tile is its own entrance (not in the spec; needed so agents without the key keep the open tiles beside a door).
- Short queries (<= 32 tiles) run plain A* first (not in the spec; the hierarchy's relative overhead is largest there).
- Connectivity is rebuilt lazily before the first search that wants it after a suspected split, not at tick start, so a construction tick without searches pays nothing.
- Refinement is eager by default (the whole tile path is returned, which the quality measurements need); the spec's lazy refinement is the `lazy` option with `refineNext()`. Movement-time repair is the caller's re-request: a sealed hop reports `stale`, a rebuilt graph restarts a paused search.
- Phase 2 (levels, stairs, drops) and the `DEUS_Movement8D.js` consolidation are not done; the Owner's FlowFields and no-exit cave-in decisions stay open.

## Known limits
- One z-level per search; cross-level queries throw until phase 2.
- Lazy hops are smoothed one at a time, so a lazily refined path can be a little longer than the eager one (measured within 10 % on 30 routes) and two hops through the same cluster may share a tile.
- Smoothing moves between existing waypoints; a long open-ground route pays up to 16 cost to reach chunk-centre entrances (1.009 on the seam test). A waypoint-free any-angle smoother would close that gap.
- A cached abstract path can be up to 13 % longer for a different start tile in the same cluster (measured max 1.131, median 1.017); the version stamp and link checks keep it valid, not optimal.
- `findPath` and `findPathAStar` throw while a `beginSearch` search is paused; the scheduler is the intended caller for resumable work.
- Full build is about 1.25 s for 768x768 in Node; the integration lane decides how to spread it over frames.
- A cluster with more than 30 distinct door masks throws (`MAX_DOOR_CLASSES`).
