# CORE-HPA — bounded hierarchical paths

**Status:** PARKED, 2026-10-03. Owner-requested work after DATA-JOBS in [the sequence](README.md). **Writer:** Claude. **Reviewer:** Codex (cross-family).

**Why the player cares:** A unit should navigate across the 3×3 world and between connected levels without a full tile search across every intervening area on every order.

## Proposed design

Use 16×16 tile clusters with passable edge entrances and intra-cluster connections. Wrap **all world edges** between adjacent areas and every stair, ramp, or other permitted z-link in the cluster graph; no world boundary or vertical transition may fall back to an unrelated planner. Derive the graph from canonical walkability/connection data. Digging, building, collapse, or a changed link dirties the affected clusters and entrances; rebuilding only those parts must preserve deterministic route choices. Keep the graph derived and rebuildable, not a competing saved truth.

The hierarchy supplies a coarse route. Final tile paths for each segment must go through `World.findPath` and its passability/door/corner rules; the integration must not bypass the existing movement authority. Cover area boundaries and z transitions explicitly. A 3×3-world path that cannot be validated by final tile A* is a failure, not a silently accepted waypoint chain.

[hugoscurti/hierarchical-pathfinding](https://github.com/hugoscurti/hierarchical-pathfinding) is an HPA* design reference written for Unity, not a ready DEUS dependency. [PathFinding.js](https://github.com/qiao/PathFinding.js) is a 2D comparison reference; its API does not by itself solve DEUS area/z links. Source licenses and vendor rules are in [README](README.md#external-code-candidates-and-source-rules). No reference code is selected for copying by this plan.

**Acceptance gate:** Native `run_tests.bat` green; deterministic route/hash evidence on five or more seeds; valid tile-by-tile routes across every world edge and stair/ramp z-link, plus blocked-link and dig/build/collapse invalidation cases; same-seed before/after cross-area latency p50/p95 and expanded-node counts; dirty-cluster rebuild milliseconds; and the 3×3-world result on the Owner laptop. Record route-length changes and partial/no-path outcomes. Cross-family review checks that a single walkability authority remains, and Deus checks the live result before merge.

**Game translation at implementation:** A click or AI destination crosses a cluster graph, is refined by `World.findPath`, and is executed by the movement bridge. The graph is derived from persisted world changes after load. This stub is design only; no route or speed is claimed working.
