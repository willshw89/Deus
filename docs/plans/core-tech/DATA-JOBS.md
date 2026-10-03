# DATA-JOBS — one job board and claim ledger

**Status:** PARKED Owner-requested lane stub, 2026-10-03; after DATA-SCHED and CORE-SPATIAL in [the sequence](README.md). **Writer:** Claude. **Reviewer:** Codex (cross-family).

**Why the player cares:** Two colonists should not claim the same tool, tile, or workstation, and a cancelled or dead worker should not leave a resource blocked forever.

Consolidate job postings, claims, and reservations under one authority for items, tiles, and workstations. Provide timeout and explicit release on completion, cancellation, death, and load recovery. Use CORE-SPATIAL's nearest-free queries to select reachable work and stockpile hauling candidates, then validate the route with the canonical path authority. Existing `DEUS_Jobs.js:137-214` has a `ReservationManager`; preserve and reconcile its behavior rather than installing a second unrelated ledger. RimWorld and Dwarf Fortress are descriptive design references only; copy no game code or GPL/AGPL material. DEC-037 still bars new faction/society job systems.

**Acceptance gate:** Native `run_tests.bat` green; a 1,800-colonist soak on a fixed seed with an assertion rejecting duplicate live claims, plus checks for orphaned reservations and lost jobs; fixtures for death/cancel/timeout/load release; and before/after nearest-item query p95 latency and frame intervals. Report exact counts, seed/year, reviewer verdict, and Deus laptop confirmation. No job behavior is changed by this page.
