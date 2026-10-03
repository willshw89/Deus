# DATA-INSPECT — debug entity and system view

**Status:** PARKED Owner-requested lane stub, 2026-10-03; last in [the sequence](README.md), with an earlier parallel slot possible only after ORG-0.2 green and only for an idle non-overlapping writer. **Writer:** Grok. **Reviewer:** Claude (cross-family).

**Why the player cares:** The developer must be able to see why a colonist is idle, which job and resource it claimed, and which system is consuming frame time before tuning the game.

In a debug build, clicking an entity opens its raw component fields, stable ID/generation, job, and item/tile/workstation reservations. Add a per-system timing graph/overlay by consuming DATA-SCHED and the existing shared performance instrumentation rather than creating a second timing authority. The inspector is read-only and must be disabled in release builds; it must not mutate simulation, advance ticks, or change save contents when opened.

**Acceptance gate:** Native `run_tests.bat` green; a fixture with known entity/components/job/reservations matches the clicked readout; screenshots are opened and checked; the release build has no inspector activation path or debug overlay; and opening the view leaves a controlled simulation hash unchanged. Record exact test counts, screenshots, cross-family review, and Deus laptop confirmation. This page adds no UI now.
