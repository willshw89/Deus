## What changed

- `tools/worldgen_qa/`: bounded headless audit of the real registered procedural generation path, 20 deterministic seeds, cold replays, all 32 level builds, stability and physical settlement checks, isolated failure controls.
- `tasks/WG.84.01/`: lane-local writer checkpoint and evidence only. Production plugins/data, WBS/status, decisions, registration and other tasks are untouched.

## How I tested it

2026-09-27. **The audit is implemented; the worldgen gate exits 1 because it detects existing settlement-viability failures.** All 20 distinct seeds completed two cold runs: three seed pairs passed every check and 17 failed. All 40 baseline workers completed without fatal/logged runtime errors, map-integrity failures, stability failures, or reproducibility failures. Baseline failures are **212 food-access cases, 270 water-access cases, and 56 surface-kit cases**, counting both cold runs: 538 failing checks, representing 269 distinct seed/check/case failures reproduced in the replay. All 20 controls were caught. No production fix or acceptance waiver was made.

- `node tools/worldgen_qa/test_multiseed_worldgen_qa.js`: **exit 1**, shell stopwatch **1,668,653.0855 ms** (27 minutes 48.653 seconds); driver measurement 1,668,578.286 ms. Final output: `RESULT: 8803 passed, 538 failed; 20/20 provocations caught; exit=1`. See [gate_worldgen.log](gate_worldgen.log).

- `node tools/worldgen_qa/seed_worker.js 424242`: exit 1, shell stopwatch 27,615.3979 ms. Early pilot before fingerprint hardening; same-level food/water and surface-kit failures. `pilot_424242.log` preserves the actual output.
- Cold-pair diagnostic using exported `execute`/`compare`, seed `288419699`: both workers exit 0, 28,320.324 / 28,036.483 ms; comparison passes all 32 layer hashes and saved state. Shell command exit 0, 56,436.7792 ms. `pilot_cold_pair.log`.
- Fingerprint structural-discrimination probe: exit 0; two previously ambiguous string arrays and two Maps with different values hash differently.
- `node tools/check_deus_syntax.js`: exit 0, shell stopwatch 3,260.0291 ms; `Checked 60 DEUS plugin files. Errors: 0`. See `gate_syntax.log`.

Both lane commands run in attached foreground PowerShell calls. The audit driver runs its workers synchronously/serially; the separate syntax gate ran in the foreground while that audit was active. Each command uses this capture pattern (with its literal command and output filename):

```powershell
$auditClock = [Diagnostics.Stopwatch]::StartNew()
node tools/worldgen_qa/test_multiseed_worldgen_qa.js 2>&1 | Tee-Object -FilePath tasks/WG.84.01/lane-bj/gate_worldgen.log
$auditExit = $LASTEXITCODE
$auditClock.Stop()
"EXIT=$auditExit ELAPSED_MS=$($auditClock.Elapsed.TotalMilliseconds)" | Tee-Object -FilePath tasks/WG.84.01/lane-bj/gate_worldgen.log -Append
exit $auditExit
```

```powershell
$auditClock = [Diagnostics.Stopwatch]::StartNew()
node tools/check_deus_syntax.js 2>&1 | Tee-Object -FilePath tasks/WG.84.01/lane-bj/gate_syntax.log
$auditExit = $LASTEXITCODE
$auditClock.Stop()
"EXIT=$auditExit ELAPSED_MS=$($auditClock.Elapsed.TotalMilliseconds)" | Tee-Object -FilePath tasks/WG.84.01/lane-bj/gate_syntax.log -Append
exit $auditExit
```

Runtime executable: `C:\Program Files\nodejs\node.exe`. For each seed, the driver calls that executable with arguments `["--max-old-space-size=768", "C:\\Users\\snewt\\.deus_worktrees\\lane-bj\\tools\\worldgen_qa\\seed_worker.js", "<seed>", ""]`, twice. Controls use the same argument vector with their name replacing the final empty string. Those calls use `spawnSync`, a 45,000 ms timeout, a 4 MiB output limit and a fresh process. The default gate has no seed-list/count override. The `seed_count` control instead rejects a deliberately invalid 19-seed input in-process; its `elapsedMs:0` is a sentinel, not an independently timed measurement.

The fixed seed stream is xorshift32 with master seed `20260927`, restricted to valid nonnegative signed-32-bit seeds and rejecting duplicates. Seeds were chosen before observing generation. The table is the exact roster; milliseconds include child startup and exit. Every failure below is at stage `viability`.

| Seed | Both exits | First / replay ms | Failed checks |
|---|---|---|---|
| 288419699 | 0 / 0 | 29821.620 / 31028.692 | none |
| 386902684 | 1 / 1 | 27915.536 / 27781.118 | surface_kit |
| 702508530 | 1 / 1 | 25765.851 / 26036.064 | surface_kit |
| 1212217234 | 1 / 1 | 31245.364 / 31572.369 | food_reachable, water_reachable, surface_kit |
| 14882235 | 1 / 1 | 27534.860 / 27276.361 | surface_kit |
| 685688481 | 1 / 1 | 34319.187 / 31632.470 | food_reachable, water_reachable, surface_kit |
| 1901271604 | 1 / 1 | 27490.519 / 27697.425 | food_reachable, water_reachable, surface_kit |
| 1353049342 | 1 / 1 | 25844.781 / 25200.788 | surface_kit |
| 1803046531 | 1 / 1 | 27587.812 / 28569.239 | water_reachable, surface_kit |
| 934012215 | 1 / 1 | 27266.819 / 26605.125 | water_reachable |
| 715732609 | 1 / 1 | 24104.695 / 24964.199 | food_reachable, water_reachable, surface_kit |
| 56170269 | 1 / 1 | 25181.217 / 25992.522 | food_reachable, water_reachable, surface_kit |
| 384720832 | 1 / 1 | 33017.603 / 30173.998 | water_reachable, surface_kit |
| 2144884779 | 1 / 1 | 27309.632 / 28014.537 | food_reachable, water_reachable, surface_kit |
| 1870482165 | 0 / 0 | 28767.961 / 28096.543 | none |
| 39380324 | 1 / 1 | 30292.465 / 28057.609 | food_reachable, water_reachable, surface_kit |
| 1081682398 | 0 / 0 | 27500.226 / 27247.289 | none |
| 1293530271 | 1 / 1 | 25642.259 / 26131.940 | food_reachable, water_reachable, surface_kit |
| 180830746 | 1 / 1 | 25492.965 / 29236.480 | food_reachable, water_reachable, surface_kit |
| 839014488 | 1 / 1 | 28422.792 / 33053.376 | food_reachable, water_reachable, surface_kit |

The 40 baseline processes took 1,124,892.308 ms in total, mean 28,122.308 ms, range 24,104.695–34,319.187 ms. Stage timings use `performance.now()` inside each worker; process durations use the parent's monotonic clock. Maximum OS-reported RSS was 470,148 KiB (459.129 MiB); maximum sampled heap usage was 281,294,088 bytes (268.263 MiB). Heap/RSS samples occur at stage boundaries; `process.resourceUsage().maxRSS` also captures the process high-water mark. These are observations on this host, not frame-rate or survival-performance claims. The 768 MiB old-space cap is not a total RSS cap. Forty baseline workers plus nineteen control workers have at most 59 × 45 seconds = 2,655 seconds of child waits, plus startup/parsing overhead, below the lane's 3,600-second gate allowance.

All controls below ran in the foreground inside the exact worldgen gate command. Their common reference is the unmodified, passing seed `288419699`; no acceptance seed was removed or replaced. The nineteen control workers took 543,643.543 ms in total. `worker_protocol` deliberately exits 0 without a result record and is rejected by the parent. `timeout` has no ordinary exit code because the parent terminated the looping child; it reported `ETIMEDOUT` at `build:z=-16`. The integrated roster control launches no child. Standalone `--provoke=<name>` commands are supported but were not additionally rerun; they exit 1 for a demonstrated rejection or 2 for missing proof.

| Control argument | Observed child exit | Parent-measured ms | Newly failed passing reference cases |
|---|---|---|---|
| seed_count | no child | not separately timed | invalid roster rejected |
| registration | 1 | 27124.866 | 1 |
| completion | 1 | 29543.329 | 1 |
| map_integrity | 1 | 28808.390 | 1 |
| stability | 1 | 28699.840 | 1 |
| state_stability | 1 | 29506.935 | 1 |
| reproducibility | 1 | 32127.596 | 1 |
| runtime_errors | 1 | 31416.616 | 1 |
| worker_protocol | 0 | 7363.020 | 1 |
| fatal | 1 | 7213.756 | 1 |
| timeout | terminated | 45016.226 | 1 |
| founder_population | 1 | 29400.802 | 1 |
| founder_links | 1 | 31227.490 | 1 |
| founder_cells | 1 | 30078.870 | 1 |
| camp_chests | 1 | 31646.105 | 1 |
| camp_clearance | 1 | 29020.940 | 1 |
| food_reachable | 1 | 28267.020 | 72 |
| water_reachable | 1 | 30934.697 | 72 |
| light_reachable | 1 | 32709.831 | 8 |
| surface_kit | 1 | 33537.214 | 5 |

Exact additional diagnostic commands are in [DEVELOPMENT_RUNS.md](DEVELOPMENT_RUNS.md). They are not substitutes for the full lane gate. Committed logs preserve their output with CRLF line endings normalized to LF; no result content is changed.

## Evidence

No screenshots produced. This task is explicitly headless and includes no art/audio work. Logs record real runtime output. Node v24.19.0, Windows x64, AMD Ryzen 7 8845HS w/ Radeon 780M Graphics. Starting worktree commit: `16f56ff2e63cd3776bbdfb8b38c9a252e8035f7e`; the brief cites the earlier main base `6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0`. The tested and delivered `tools/worldgen_qa` Git tree is `20de7c94dabc1dce27fbe53464cc8b008948fe4f`; no audit-source changes followed the gate. The final commit adds the completed task evidence to the pre-run checkpoint.

The path under test is `Scene_Boot.start` aliases → `UF.World.newWorld(seed)` → real `world:initializing` / `world:created` listeners → `World.buildArea(0,0,z)` for every Z from −16 through 15. Boot installs the actual NaturalConnections NewWorld wrapper and Levels hooks. Runtime registry checks observe `uf_levels_terrain`, `uf_worldgen`, and `uf_underground_resources` executing on their applicable levels in order; no exported standalone generator substitutes for registration.

The loaded registry subset, in actual registry order, is Core, World, WorldGen, Tiles, Factions, History, Objects, Items, Jobs, Wildlife, Ecology, Levels and NaturalConnections (all `DEUS_` modules). Dnd5e, Callings, HistoricalDemographics, Fluid and Containers are then loaded as Core companions before boot. Catalog and tileset metadata are read from the actual data files, and actual plugin parameters are used. The production sources are unmodified, including in mutant runs. Mutants alter isolated runtime state, generated output or function behavior only.

Both cold replays hash every map tile/object/event and the actual shape, five-stratum material and connector data of every level, including non-enumerable baseline accessors and cap Maps. All saved world-state fields are hashed. Only baseline `features.ms`, measured generation time outside saved state, is excluded. Reverse rebuilds compare both map signatures and saved world truth after clearing World peek caches and invalidating Levels flood caches. A fresh-process replay separately rules out reading the same baseline cache twice. Ambient `Math.random` and the wall clock are not fixed to conceal nondeterminism.

Concrete viability contracts and controls:

| Check | Runtime observation / basis | Provocation |
|---|---|---|
| seed_roster | exactly 20 distinct valid seeds | reject a 19-seed input |
| registration | enabled registry modules and actual generator invocations on all applicable levels | unregister surface generator |
| completion | seed/size/range, GEN5 checksummed core levels, Year 0, initialization events, completed materialization | clear materialization completion |
| map_integrity | full tile/object/shape/material array dimensions, tile/type/shape validity | insert NaN into generated tile data |
| stability | reverse rebuilds preserve all layer hashes and saved state | alter a rebuilt tile; separately advance nextUnitId during rebuild |
| reproducibility | all layer and saved-state hashes agree across cold processes | alter a generated object in the replay |
| runtime_errors | captured console.error, including caught event-listener exceptions | throw from a listener on the real event bus |
| fatal | all build/survey stages return | registered generator throws |
| bounded_runtime | child completes under wall timeout | registered generator loops forever |
| worker_protocol | one complete result record, consistent seed/exit, no stderr/process error | early exit 0 without a result record |
| founder_population | nine catalog species, 72 living founders, configured four male/four female per faction | remove a real founder |
| founder_links | unit, faction, home, historical and demographic site/person references agree | corrupt a founder site reference |
| founder_cells | distinct positions, actual World.walkable and generated object passage | move a founder onto its blocking camp chest |
| camp_chests | real chest_wood object at each camp centre (current implementation) | remove one generated chest |
| camp_clearance | eight object-free neighbor cells per camp | place a blocking catalog boulder on a neighbor |
| food_reachable | per-founder same-layer access to catalog food-yield objects; fungal food below ground | remove generated food-source objects |
| water_reachable | per-founder same-layer access to drinkable catalog surface water / nonlava underground water | suppress observed water through real query APIs |
| light_reachable | reachable glow_caps for underground founders lacking SRD darkvision | remove generated underground glow caps |
| surface_kit | per-camp circular catalog radius/minimum object/ore counts (existing WorldGen kit checks) | remove surface berry bushes |

The starting-resource basis is `docs/VISION.md` V67/V134 and `docs/systems/UF_WorldGen.md`'s kit checks, observed independently from actual object grids. Underground access follows the existing `tools/sim/test_underground_year0.js` contract, with actual registered World/Fluid passability. Preferred spacing/biome placement heuristics are not treated as unconditional requirements. Every control must fail a matching seed/check/case that passed in the reference; unrelated pre-existing failures do not count.

Representative real output:

```text
SEED 288419699 PASS exits=0,0 ms=29821.62,31028.692 failedChecks=0
SEED 386902684 FAIL exits=1,1 ms=27915.536,27781.118 failedChecks=2
SEED 1870482165 PASS exits=0,0 ms=28767.961,28096.543 failedChecks=0
Checked 60 DEUS plugin files. Errors: 0
RESULT: 8803 passed, 538 failed; 20/20 provocations caught; exit=1
EXIT=1 ELAPSED_MS=1668653.0855
```

## Not done / known problems

- Seventeen roster seeds fail viability. [ESCALATION.md](ESCALATION.md) records concrete shortages, displaced founders, reproduction commands, and a source-supported likely connection to the already documented camp-under-hill problem. The root cause at every reported coordinate was not proved. No production fix was attempted or waived.
- Food/water access is explicitly same-layer and cardinal. It does not test complete 3D routes, actual gathering/drinking jobs, tools/capabilities, starting inventory sufficiency, long-term survival, building progress, save/load, or live simulation. Legal diagonal movement has orthogonal detours; ramps/stairs to other levels remain unmeasured.
- The runtime is a dependency-resolved generation subset, not exact NW.js application startup. Core's filesystem/companion `require` block is not executed. The five companions are loaded after their dependencies; this differs from Core's early loader and may affect startup wiring (notably Containers). Colonists conversion/AI, Doors/Floors/Ownership and other omitted gameplay/presentation listeners are not certified. The absent Colonists module also permits WorldGen's fallback pair events; those real emitted events are included in the hash, but not counted as founder units.
- RMMZ classes are a strict headless host; no scene updates, native rendering, asset loading, screenshots or audio run. Discard-only canvas/bitmap calls retain production metadata/shade-slot execution without retaining pixels or producing assets. The source regex is only host construction, not a proof of behavior.
- 161 warning strings were retained across the 20 primary baseline runs, including wildlife placed on blocked cells. They remain visible in the log and are not reported as successful wildlife viability; this lane checks settlement founders. The count excludes replay warning copies. No claim of full-game error freedom is made.
- Fresh processes bound retained memory and isolate seeds; this does not measure long-session leaks or repeated New Game transitions inside a single desktop process. The configured world is the current one-area, 256×256, Year-0 human-player profile; other player factions, historical starts and future configurations are not covered.
- PM rerun, independent Grok review and Owner acceptance remain external to this writer task.

## Try it in RMMZ

1. Optional Owner follow-up: open `game/game.rmmzproject`, press F5, and start a Year-0 human-player world with seed `386902684`.
2. Inspect the faction f3 camp at area `(0,0)`, Z0, `(57,192)` and its surroundings. Compare the physical resource supply with `surface_kit` case `site:3` in the log; examine F8 for errors.

Expected: the report identifies the seed, level, founder/site and failed condition to inspect. Editor F5/F8 playtest and visual acceptance were not checked by this headless task.

## Decisions needed

- None to implement/run this lane. Production findings require their owners; the writer will not change their code or decide pending faction/home-band questions.
