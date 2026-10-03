# CORE-HPA — hierarchical pathfinding

Owner-approved design, 2026-10-03 08:55 CT. **PARKED: no implementation until ORG-0.2 is green and the Owner explicitly unparks this lane.** This filing changes documentation only; it supplies no runtime or performance proof.

Depends on DATA-RNG (seeded RNG), CORE-PQ (binary heap), and CORE-SPATIAL. Writer: Claude, or Codex/GPT fallback. Reviewer must be from another model family. Deus verifies. DEC-037 and protected engine/library/art paths remain in force.

## Design

- World: 768x768 tiles per z-level, wrapping on all edges, with multiple z-levels. Eight-way movement, without diagonal corner-cutting.
- HPA*: 16x16 clusters, two-dimensional per z-level; 48x48 clusters per level. Portals are contiguous walkable runs along a cluster edge. Use one abstract node at the center; split runs wider than six tiles. Stairs and ramps are one-tile point portals connecting z and z+/-1. Drops create directed down-only edges.
- Torus seams: cluster and portal scans use modulo coordinates. Cluster 47 borders cluster 0.
- Heuristic: integer octile distance on the torus. `dx=min(abs(dx), W-abs(dx))`, with the same rule for `dy`. Cost is `14*min(dx,dy) + 10*(max(dx,dy)-min(dx,dy)) + 10*abs(dz)`. Costs are integers: 10 straight, 14 diagonal, 10 per z step; no floating-point costs in the simulation.
- Faction doors: HAA*-style permission bitmasks on abstract edges. Use one graph; a search skips edges the agent cannot use.
- Incremental changes: tile edits mark the cluster dirty, and its neighbor when the edit is on a border. At tick start, rebuild dirty clusters by rescanning portals and running local A* between portals, capped at 256 tiles. Batch all edits per tick.
- Reachability: union-find connectivity for merges caused by digging. On a suspected split, rebuild connectivity on the abstract portal graph. Expose a `connectivity stale this tick` flag. Never report unreachable from stale connectivity without performing a real search.
- Refinement: refine lazily, only as far as the next portal. Cache abstract paths by `(startCluster, goalCluster, permissionMask)`. If movement fails, retry local A* to the portal; if the portal is sealed, discard the macro path and requeue after its cluster rebuild.
- Scheduling: deterministic per-tick budget in **nodes expanded**, initially 2,500. Never use elapsed time to make simulation scheduling decisions. Resumable searches use plain state machines, not JavaScript generators. Priority is combat, then player orders, then hauling, with deterministic ties.
- Data: flat typed arrays. The approved indexing expression is `idx = x + y*768 + z*768*768`; see the signed-z storage clarification below. Closed lists use a search-epoch `Uint32Array` without clearing between searches. One pathfinding worker owns the approximately 75 MB closed list; never allocate it per agent.
- Open list: use the CORE-PQ binary heap. It grows, or fails loudly with a counted `open list overflow` metric. No silent 12,000-node cap.
- Tie-breaking: lower f, then lower h, then lower tile index.
- Cave-in escape: a unit inside a wall uses BFS within one to three tiles to find the nearest open tile. The no-exit rule still needs Owner disposition; the provisional default is a `stuck` status, not death. Large caverns use the same clusters.
- Apply path smoothing after refinement, preserving movement, permissions and corner rules.

Consolidate the duplicate A* and priority queue in `DEUS_Movement8D.js` into the new pathfinder. Wire or retire `DEUS_FlowFields.js` only after the Owner's separate decision; this brief does not authorize deleting it.

## Reference licenses

License sources inspected on 2026-10-03 before repository implementation study. Study patterns and write our own code; this is not permission to vendor files. Re-verify at implementation start. No GPL/AGPL copying; CDDA remains descriptive reference only.

| Reference | Purpose | Verified license source |
|---|---|---|
| hugoscurti/hierarchical-pathfinding | Primary HPA* reference, C# | MIT, [actual LICENSE.md](https://github.com/hugoscurti/hierarchical-pathfinding/blob/master/LICENSE.md) |
| qiao/PathFinding.js | Heap and neighbor/corner rules | MIT terms in [README License section](https://github.com/qiao/PathFinding.js/blob/master/README.md#license), also declared in [package.json](https://github.com/qiao/PathFinding.js/blob/master/package.json). No root LICENSE file exists; do not cite one. |
| mikolalysenko/l1-path-finder | Flat typed-array performance patterns | MIT, [LICENSE](https://github.com/mikolalysenko/l1-path-finder/blob/master/LICENSE) |
| bgrins/javascript-astar, optional | Readable A* loop | MIT, [LICENSE](https://github.com/bgrins/javascript-astar/blob/master/LICENSE) |

## Phases

Every phase requires passing tests, independent cross-family review and Deus confirmation before a later authorized merge. The current no-main-merge instruction still applies.

1. **Torus baseline:** flat grid, wrap arithmetic, integer heuristic, heap and epoch closed list. Test a deterministic route across the seam, from x=5 to x=760 with a wall between them.
2. **Levels and movement rules:** no corner-cutting, stairs and down-only drops. Test a spiral staircase, successful descent through a hole and failed reverse ascent.
3. **Static HPA*:** clusters, portals, abstract edges, lazy refinement and smoothing. Compare 200 long routes on a fixed seed against plain A*.
4. **Dynamics:** dirty clusters, deterministic node-budget time slicing, door masks, cache and repair. Test 50 digs per tick while 200 agents seek routes.

## Acceptance

- Determinism: same seed and 100 routes produce identical hashes across 1,000 runs and between Node and browser.
- Route quality: after smoothing, median HPA* path length divided by plain A* length is at most 1.10. Report the distribution, not only its median.
- Budget: expanded nodes never exceed the per-tick budget. Open-list overflow count is zero on test seeds.
- Performance is **not a CI pass/fail gate**. Report before/after milliseconds per path and frame time from the overlay on the same seed. No “faster” claim without measurements.

## Clarifications to retain before implementation

These notes identify details to resolve within the approved design; none starts implementation or changes an Owner ruling.

- Signed world z cannot directly index a typed array. Define a zero-based storage layer, such as `z-zMin`, while retaining signed world coordinates at the API boundary. A 768x768x32 `Uint32Array` uses 75,497,472 bytes, about 72 MiB; the approximately 75 MB estimate depends on 32 layers, not an unspecified z span.
- Define stair/ramp edge costs consistently with the additive horizontal-plus-vertical heuristic. An edge that changes both horizontal position and z must not cost less than the heuristic progress it makes; otherwise use a proven conservative heuristic.
- Union-find is undirected. Treat it as a conservative connectivity aid, not proof that a directed drop can be reversed or that an agent has permission through a door. Stale or insufficient connectivity must fall back to a real search, as required above.
- The Owner's FlowFields choice and no-exit cave-in behavior remain unresolved. Implementation must also state cache invalidation and search-epoch rollover handling before claiming deterministic correctness.

Filed only. No game code, dependency import, native test, benchmark or screenshot was produced for this document. Deus confirmation and implementation reviews remain pending.
