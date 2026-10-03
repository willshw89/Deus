# DATA-ECS — bounded entity component store

**Status:** PARKED Owner-requested lane stub, 2026-10-03; after CORE-SPATIAL in [the sequence](README.md). **Writer:** Claude. **Reviewer:** Codex (cross-family).

**Why the player cares:** About 1,800 colonists should move and work at the Owner's 60-FPS target without duplicating entity truth or corrupting references after a save/load.

Own stable entity IDs plus generation counters that reject stale handles. Use typed, column-oriented storage for position, z, faction, health, job, and needs, with sparse optional component sets where appropriate. Start with colonists and wildlife; move items only in a later bounded phase. The spatial index remains the query authority for nearby moving units; this store owns entity components. Save stable entity IDs and string content IDs, never transient dense array slots or registry-list indices, and rebuild derived indexes after load.

[bitECS](https://github.com/NateTheGreatt/bitECS) is a **reference only** for data-oriented ECS patterns; its upstream [LICENSE is MPL-2.0](https://github.com/NateTheGreatt/bitECS/blob/main/LICENSE). No bitECS files or code are to be copied. Recheck that license at the lane start and follow the global vendor rule for any other candidate.

**Acceptance gate:** Controlled add/remove/reuse tests catch stale generation handles and verify component/query parity with the pre-change game. Exact save/load round trips preserve identities and behavior. On the same seed and view, compare native frame intervals, per-system timing overlay, and memory before/after for the 1,800-unit 60-FPS target on the Owner laptop and in CI. Run `run_tests.bat`, report counts/failing names, cross-family review, and Deus confirmation. No ECS implementation is claimed here.
