# DATA-SCHED — bounded resumable systems

**Status:** PARKED Owner-requested lane stub, 2026-10-03; after DATA-ECS in [the sequence](README.md). **Writer:** Grok. **Reviewer:** Claude (cross-family).

**Why the player cares:** A crowded colony should keep responding to clicks and drawing frames while jobs, ecology, and off-screen settlements advance without losing owed work.

Register systems by name, stable order, and a per-system millisecond tick budget. Long work resumes from an explicit cursor on later ticks rather than restarting a full-world scan; cursor/save behavior must be specified. Off-screen colonies use aggregate updates from the same underlying data and rates as detailed simulation, with parity checked separately. Expose per-system tick milliseconds to the shared performance overlay rather than creating a competing profiler. Numeric per-system budgets remain to be chosen by measurement.

**Acceptance gate:** On the controlled 1,800-unit native benchmark, no registered system's p95 tick time exceeds **110% of that system's assigned per-tick millisecond budget** (no more than 10% over its own budget). Publish each system's budget and p95 time in the shared overlay and report. A multi-tick fixture proves every queued item is eventually processed once, in deterministic order, including after save/load and pause. Run `run_tests.bat`, report test counts and failures, compare frame intervals before/after on the same seed, obtain cross-family review and Deus laptop confirmation. This stub sets no unapproved per-system millisecond budget.
