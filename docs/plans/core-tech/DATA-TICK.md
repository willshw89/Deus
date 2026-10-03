# DATA-TICK — fixed simulation timestep

**Status:** PARKED Owner-requested M2 split proposal, 2026-10-03; third foundation job in [the sequence](README.md). **Writer:** Claude. **Reviewer:** Codex (cross-family).

**Why the player cares:** A colony should develop the same way at different display frame rates and at 1×, 2×, or 4× speed, while its animation remains smooth.

Propose a tunable fixed **10 Hz simulation tick** decoupled from rendering; 10 Hz is a proposal to measure, not an adopted runtime constant. The renderer interpolates presentation state between fixed simulation states. Pause and 1×/2×/4× change tick scheduling only; they must not alter the fixed tick's math or change outcomes for a given number of ticks. Define catch-up bounds and delayed-work reporting without silently dropping simulation truth. The existing `DEUS_TimeSpeed.js` multiplies scene updates and has the `no_speedup_while_paused` test; `DEUS_World.js` already has a minute-driven shared simulation tick. The implementation brief must reconcile those clocks and domain-tagged timers before replacing either.

[Glenn Fiedler's *Fix Your Timestep!*](https://gafferongames.com/post/fix_your_timestep/) is a read-only source for fixed-step accumulator/interpolation patterns. Use the ideas, not copied code. This lane opens no unrelated rendering or society behavior.

**Acceptance gate:** Given the same seed and command inputs, state hashes at tick N match across multiple render frame rates and 1×/2×/4× schedules. Pause advances no simulation ticks, and `timespeed.no_speedup_while_paused` remains valid. Measure native tick p50/p95 and frame intervals before/after on the 3×3 world; run `run_tests.bat`, report result counts, cross-family review, and Deus laptop confirmation. This stub has no observed timing result.
