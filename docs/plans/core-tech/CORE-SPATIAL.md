# CORE-SPATIAL — dynamic unit index

**Status:** PARKED, 2026-10-03. Proposed M1 work after CORE-PQ. **Writer:** Grok. **Reviewer:** Claude (cross-family).

**Why the player cares:** A full 3×3 world with about 1,800 colonists should keep nearby-unit decisions and interaction responsive without scanning every unit each frame.

## Proposed authority

Own one dynamic, uniform 16×16-cell index per z-level for moving units. Use typed `Int32Array` bucket heads and next links, plus the prior-link and unit-to-cell bookkeeping needed for **actual O(1)** add/remove/move. Keep stable unit IDs as the external identity. Allocate only needed z/chunk buckets; rebuild the index from saved unit positions on load rather than persisting internal array positions.

Expose `queryRadius(x, y, z, radius, filter)`, `queryRect(minX, minY, maxX, maxY, z, filter)`, and `nearest(x, y, z, filter)`. Each query must have declared coordinate and z semantics, deterministic result ordering or tie-breaking, and safe handling of add/remove/move during a tick. Callers should use this authority for dynamic units; no second live unit index should be introduced.

[Flatbush](https://github.com/mourner/flatbush) and [KDBush](https://github.com/mourner/kdbush) are optional **static** data indexes for rectangles or points. They are not the moving-unit index. Their ISC licenses were checked as recorded in [README](README.md#external-code-candidates-and-source-rules); any later copy needs Owner OK, exact commit pin, and notices.

**Acceptance gate:** Randomized seeded operations compare radius, rectangle, nearest, filters, ties, moving units, removals, and z separation against brute-force results. Run native `run_tests.bat` and a same-seed before/after method benchmark for affected callers. Measure the Owner's 1,800-colonist, 60-FPS target on the laptop with a stated native frame-interval method and run it in CI; report achieved frame-time distribution, query latency, update cost, allocations, and test counts rather than assuming the target was met. Cross-family review checks one authority and no per-frame global scan. Deus checks the live consumer and evidence on the Owner laptop.

**Game translation at implementation:** Unit moves update the index; jobs, AI, selection, or nearby interactions query candidates; live unit choices and frame pacing change accordingly. The current page is design only and makes no performance claim.
