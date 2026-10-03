# CORE-PQ — one path queue and one path authority

**Status:** PARKED, 2026-10-03. Owner-requested work after ORG-0.2 green, WORLD-3x3, and the preceding DATA foundation stubs in [the sequence](README.md). **Writer:** Grok. **Reviewer:** Claude (cross-family).

**Why the player cares:** Click orders and AI movement should find the same valid route through doors, terrain, and vertical links without a long path search freezing a frame.

`DEUS_World.js` currently exposes `World.findPath` and path statistics. The main `038a02c3` implementation describes 8-way steps when permitted (otherwise 4-way), blocked-corner handling, a default 12,000-node cap, a region precheck, and vertical links within an area. `DEUS_Movement8D.js` also runs an octile A* with its own binary heap and a 200-iteration cutoff for `findDirection8DTo`. Its line 510 comment describes a 24×24 window, but the function uses map dimensions and wrapped neighbors without enforcing a 24-cell window. These contracts and call sites need a fresh audit at the implementation SHA.

## Proposed change

1. Capture a green native 3×3-world baseline first. With the same controlled seed and route set, record `World.findPath` latency p50/p95, expanded nodes, successful/partial/no-path outcomes, and the movement callers reached by clicks and AI.
2. Trial [tinyqueue](https://github.com/mourner/tinyqueue) as the queue inside `World.findPath` only. Retain the project's passability, region, door, vertical-link, and determinism rules. Adopt the library only if the measured comparison shows a real win without a path-validity regression. A license check is in [README](README.md#external-code-candidates-and-source-rules); Owner OK and an exact upstream commit are required before any vendor copy.
3. Route click and AI movement through `World.findPath` and retire the inline A* in `DEUS_Movement8D.js` by removing that code in place. Keep 8-direction step and corner behavior at the movement boundary. Do not delete files or alter `DEUS_FlowFields.js` in this lane.

**Acceptance gate:** `run_tests.bat` green on the lane SHA, plus same-seed before/after p50/p95 path milliseconds and node counts with route equivalence/validity cases for short, blocked, door, cross-level, capped, click, and AI movement. Report partial paths and failures explicitly. A queue swap with no measured win does not pass its stated purpose. Cross-family review checks that `World.findPath` is the sole live path authority. Deus verifies the route behavior on the Owner laptop; any required sign-off stays with the Owner.

**Game translation at implementation:** Input/AI order → `World.findPath` → validated tile/z steps → movement plugin → visible unit motion. Save/load should retain stable world and unit IDs, not transient heap nodes. The current page is design only; no runtime or in-game proof is claimed.
