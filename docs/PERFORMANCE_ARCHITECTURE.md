# PERFORMANCE_ARCHITECTURE: targets (not enforced)

> The enforced numbers are in `docs/ENGINE_RULES.md` §7: the `DEUS_Test.js` `perf` suite, average frame <= 17.0 ms and worst frame < 50 ms over 30 s, with p50, p99, map size and drawn events in the detail. Everything below is a target until a `DEUS_Test` check measures it. Reduced 2026-09-29 from the 454-line v1 manual (2026-09-25): the removed text repeated ENGINE_RULES (no per-frame scans, derived caches, zero-allocation hot paths, save hygiene, time domains) or described tooling that does not exist (`tools/performance/bench_*.js`, the F3 HUD, `docs/telemetry/*.jsonl`).

## Targets by domain
| Domain | Target | Domain | Target |
|---|---|---|---|
| A Boot to title | < 2,500 ms | F Worldgen per area | < 3,000 ms |
| B New Game to playable | < 18,000 ms | G Memory | < 350 MB working set |
| C Load save to map | < 1,500 ms | H Save | < 300 ms, < 2 MB |
| D Render per frame | < 6.0 ms | I Shipping footprint | no orphan assets |
| E Simulation per frame | < 4.0 ms | Frame p99 / max spike | <= 16.67 ms / <= 33.3 ms |

## Simulation tiers (target)
A visible or engaged: every frame. B nearby (<= 48 tiles): 15-20 Hz staggered. C remote in loaded areas: 1-2 Hz. D dormant (distant wildlife, sleeping colonists, settled fluid, deep rock): event-driven, about 0 Hz. Lower tiers accumulate elapsed time and resolve it mathematically; they never change an outcome. Design scale: 1,000 simulated creatures (DEC-013 nine races; not measured).

## Benchmark scenarios
Names reserved: `PERF_QUIET_WORLD`, `PERF_BUSY_SETTLEMENT`, `PERF_1000_CREATURE`, `PERF_LARGE_COMBAT`, `PERF_HEAVY_FLUID`, `PERF_FIVE_Z_EXPOSURE`, `PERF_ANIMATED_FOREST`, `PERF_SAVE_LOAD`. Recorded so far (v1 manual, method not stated beyond avg / p99 / heap): `PERF_QUIET_WORLD` at `19fcf0e` 3.8 ms / 6.2 ms / 108 MB; `PERF_HEAVY_FLUID` at `2f47203` 7.4 ms / 11.2 ms / 124 MB. The others have no numbers. Any new number states duration, units drawn and machine (ENGINE_RULES §7).

## Reference machine (checked 2026-09-29)
Windows 11 Home x64, 16 GB RAM, 816x624 viewport at 1.00x, NW.js 0.48.4 (the RMMZ 1.10.0 bundle), host Node v24.19.0. The v1 text said "NW.js v0.84+ / RMMZ Core 1.8.0" and a `C:\Dev\DEUS` SSD path; neither matches this machine.

## Regression rule
A performance-sensitive lane declares `PERFORMANCE IMPACT: N/A | MEASURED`. `MEASURED` means before and after on a named scenario. A regression over 5% is classified by the PM: defect (back to the writer), justified tradeoff (Owner or PM approval recorded), or noise (five repeated runs).

## Tooling that exists
`game/js/plugins/DEUS_Test.js` (`run_tests.bat perf`), `tools/performance/census_boot_load.js`, `tools/benchmark_performance.js` (host Node; loads `UF_Time.js`, which the game does not).
