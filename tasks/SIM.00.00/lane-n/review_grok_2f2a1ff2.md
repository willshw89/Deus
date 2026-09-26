# Grok review: SIM.00.00 Lane N (in-place layer switch and area prewarm)

Reviewed tip: `2f2a1ff2fb6a79b417fe1ff75a2aa50772032c86` on `task/lane-n`.
Review ran in a fresh clone, `C:\Users\snewt\AppData\Local\Temp\lane-n-review-2f2a1ff2`, checked out detached at that commit. The clone was deleted after the runs below. No game file, test, BRIEF, or REPORT was modified.

## Tip confirmation

Worktree, before the clone:

```
git rev-parse HEAD origin/task/lane-n
2f2a1ff2fb6a79b417fe1ff75a2aa50772032c86
2f2a1ff2fb6a79b417fe1ff75a2aa50772032c86
EXIT=0

git log -8 --format="%H %an %s"
2f2a1ff2fb6a79b417fe1ff75a2aa50772032c86 deus-claude [claude] SIM.00.00 point the docs at the baseline folder
2f00bcf21d23648a16be87858a7749398b69f48c deus-claude [claude] SIM.00.00 keep the pre-change main baselines (random seeds) cited in test_changes.md
ce53903298187092fda63cd957dddd5187e6227d deus-claude [claude] SIM.00.00 evidence packet: gate run, mutants, main vs tip perf, existing suites, report
7fab34b17d5cd561e3c3c056fd5898638083497b deus-claude [claude] SIM.00.00 fog timing in lastSwitch, console.error in no_errors, suite runner for main vs tip
b4f89753f0bcf732a66a83d70e49556f4426836b deus-claude [claude] SIM.00.00 WIP rebind timing split, fog refresh on switch, two-pass suite, load waits for the new scene
00e36e32cb6b638d22416cdfd969b8414f952d98 deus-claude [claude] SIM.00.00 WIP in-place level switch, prewarm, test harness
3c2b88ecff79253c89c25c7b410b8b8095e47376 snewt [gemini] Record Lane N launch prompt 20260926_002426
f31cd2e1f996638c47b7a670ed857fad9b106790 snewt [gemini] Record Lane N launch prompt 20260926_001010
EXIT=0
```

HEAD equals `origin/task/lane-n` and equals `2f2a1ff2fb6a79b417fe1ff75a2aa50772032c86`. Review continued.

Clone:

```
git clone -c core.autocrlf=false <worktree> <temp>
EXIT=0
git checkout --detach 2f2a1ff2fb6a79b417fe1ff75a2aa50772032c86
HEAD is now at 2f2a1ff2 [claude] SIM.00.00 point the docs at the baseline folder
DETACH_EXIT=0
git rev-parse HEAD
2f2a1ff2fb6a79b417fe1ff75a2aa50772032c86
REV_EXIT=0
```

Plugin and test sources at this tip are the same as `7fab34b17d5cd561e3c3c056fd5898638083497b`. `git diff --name-only 7fab34b17d5cd561e3c3c056fd5898638083497b 2f2a1ff2fb6a79b417fe1ff75a2aa50772032c86` lists only files under `tasks/SIM.00.00/lane-n/` (report, evidence, perf, suites, `test_changes.md`). The gate evidence was committed after that code commit and still matches the code under review.

## Scope

```
git merge-base origin/main 2f2a1ff2fb6a79b417fe1ff75a2aa50772032c86
8592b07aa9315c1cdd2c8d29e1a6d37d3d055deb
BASE_EXIT=0
```

`git diff --name-status 8592b07aa9315c1cdd2c8d29e1a6d37d3d055deb 2f2a1ff2fb6a79b417fe1ff75a2aa50772032c86` (each line JSON-encoded so the tab is visible). `DIFF_EXIT=0`.

```
"M\tgame/js/plugins/DEUS_Levels.js"
"M\tgame/js/plugins/DEUS_World.js"
"A\ttasks/SIM.00.00/lane-n/BRIEF.md"
"A\ttasks/SIM.00.00/lane-n/REPORT.md"
"A\ttasks/SIM.00.00/lane-n/docs_update.md"
"A\ttasks/SIM.00.00/lane-n/escalation.md"
"A\ttasks/SIM.00.00/lane-n/evidence/layer_switch_inplace.1_p1.png"
"A\ttasks/SIM.00.00/lane-n/evidence/layer_switch_inplace.2_p2.png"
"A\ttasks/SIM.00.00/lane-n/evidence/layer_switch_inplace.3_Ground.png"
"A\ttasks/SIM.00.00/lane-n/evidence/layer_switch_inplace.4_m1.png"
"A\ttasks/SIM.00.00/lane-n/evidence/layer_switch_inplace.5_Ground.png"
"A\ttasks/SIM.00.00/lane-n/evidence/layer_switch_inplace.6_before_save_p1.png"
"A\ttasks/SIM.00.00/lane-n/evidence/layer_switch_inplace.7_after_load.png"
"A\ttasks/SIM.00.00/lane-n/evidence/layer_switch_inplace.fog_on_Ground.png"
"A\ttasks/SIM.00.00/lane-n/evidence/layer_switch_perf.json"
"A\ttasks/SIM.00.00/lane-n/evidence/results.txt"
"A\ttasks/SIM.00.00/lane-n/evidence/run_output.txt"
"A\ttasks/SIM.00.00/lane-n/lane.json"
"A\ttasks/SIM.00.00/lane-n/launches/20260926_001010_prompt.txt"
"A\ttasks/SIM.00.00/lane-n/launches/20260926_002426_prompt.txt"
"A\ttasks/SIM.00.00/lane-n/mutants_output.txt"
"A\ttasks/SIM.00.00/lane-n/perf/main/layer_switch_inplace.fog_on_Ground.png"
"A\ttasks/SIM.00.00/lane-n/perf/main/layer_switch_perf.json"
"A\ttasks/SIM.00.00/lane-n/perf/main/results.txt"
"A\ttasks/SIM.00.00/lane-n/perf/main/run_output.txt"
"A\ttasks/SIM.00.00/lane-n/perf/summarize.js"
"A\ttasks/SIM.00.00/lane-n/perf/summary.md"
"A\ttasks/SIM.00.00/lane-n/perf/tip/layer_switch_perf.json"
"A\ttasks/SIM.00.00/lane-n/perf/tip/results.txt"
"A\ttasks/SIM.00.00/lane-n/perf/tip/run_output.txt"
"A\ttasks/SIM.00.00/lane-n/run_existing_suites.js"
"A\ttasks/SIM.00.00/lane-n/suites/baseline_main_random_seed/main_flooding.txt"
"A\ttasks/SIM.00.00/lane-n/suites/baseline_main_random_seed/main_natural_walls.txt"
"A\ttasks/SIM.00.00/lane-n/suites/baseline_main_random_seed/main_spawn.txt"
"A\ttasks/SIM.00.00/lane-n/suites/baseline_main_random_seed/main_strata.txt"
"A\ttasks/SIM.00.00/lane-n/suites/baseline_main_random_seed/main_vertical.txt"
"A\ttasks/SIM.00.00/lane-n/suites/baseline_main_random_seed/main_world.txt"
"A\ttasks/SIM.00.00/lane-n/suites/main_flooding.txt"
"A\ttasks/SIM.00.00/lane-n/suites/main_natural_walls.txt"
"A\ttasks/SIM.00.00/lane-n/suites/main_spawn.txt"
"A\ttasks/SIM.00.00/lane-n/suites/main_strata.txt"
"A\ttasks/SIM.00.00/lane-n/suites/main_vertical.txt"
"A\ttasks/SIM.00.00/lane-n/suites/main_world.txt"
"A\ttasks/SIM.00.00/lane-n/suites/tip_flooding.txt"
"A\ttasks/SIM.00.00/lane-n/suites/tip_natural_walls.txt"
"A\ttasks/SIM.00.00/lane-n/suites/tip_spawn.txt"
"A\ttasks/SIM.00.00/lane-n/suites/tip_strata.txt"
"A\ttasks/SIM.00.00/lane-n/suites/tip_vertical.txt"
"A\ttasks/SIM.00.00/lane-n/suites/tip_world.txt"
"A\ttasks/SIM.00.00/lane-n/test_changes.md"
"A\ttools/test_layer_switch_inplace.js"
```

Every path is inside `lane.json` `allowedPaths` (`DEUS_Levels.js`, `DEUS_World.js`, `tools/test_layer_switch_inplace.js`, `tasks/SIM.00.00/lane-n/**`).

Lane K files, same range, `git diff --name-only` on `game/js/plugins/DEUS_Depth.js`, `game/js/plugins/DEUS_Minimap.js`, `game/js/plugins.js`, `game/js/plugins/DEUS_Fog.js`, `game/js/plugins/DEUS_DayNight.js`: no output. `FORBIDDEN_EXIT=0`. The full name-status list above also contains none of those paths, and no world-generator file. The test harness rewrites `plugins.js` only inside its temp snapshot (seed and the test-only plugin).

### Functions touched

Diff of the two plugins against the merge-base. Each function is a view-switch, transfer, or area-cache path.

`DEUS_Levels.js`:

| function | path |
|---|---|
| `setView` | view-switch: tries `switchViewInPlace`, records `state.view` immediately, transfer only as the fallback |
| `placeCamera` | view-switch and transfer: camera after a switch |
| `Game_Player.prototype.performTransfer` | transfer: calls `placeCamera` |
| `Spriteset_Map.prototype.update` | view-switch: completes the switch at the start of the next spriteset update |
| `finishSwitch` | view-switch: rebind, fog refresh, `lastSwitch`, `levels:viewChanged` |
| `Scene_Map.prototype.start` | view-switch: existing transfer completion, plus a `BlueSky` parallax preload so +1/+2 can show their sky |
| `Scene_Map.prototype.update` | view-switch keys, plus one `prewarmStep` a frame while no switch is pending |

`DEUS_World.js`:

| function | path |
|---|---|
| `remember` | area-cache: eviction skips pinned keys |
| `showable` | area-cache: a build may be shown only if it was on screen or prewarmed, for this world |
| `World.peekArea` | area-cache: counts cache-miss builds |
| `World.clearPeekCache` | area-cache: also clears `warmView` |
| `ringOf` | area-cache prewarm: z±1, z±2 |
| `areaLevelsOf` | area-cache prewarm: ring plus farther levels of the area |
| `pinView` | area-cache: pins the view level and its ring |
| `preloadImages` | area-cache prewarm: tileset, parallax, and character sheets for a warm level |
| `warmLevel` | area-cache prewarm: one build, else its walk grid, else its images |
| `World.prewarmStep` | area-cache prewarm |
| `World.coldLevels` | area-cache prewarm |
| `World.prewarmStats` | area-cache prewarm |
| `World.prewarmConfig` | area-cache prewarm |
| `World.switchViewInPlace` | view-switch |
| `World.rebindSpriteset` | view-switch |
| `World.viewSwitchStats` | view-switch |
| `DataManager.loadMapData` | transfer and area-cache: a showable prewarmed build can be reused on a real load |
| `Scene_Map.prototype.isReady` | area-cache prewarm: a map load waits until the view's area is warm, one step a call |
| `Spriteset_Map.prototype.createTilemap` | view-switch: records `_ufBoundMap` so the rebind can see a later `$dataMap` swap |

No other function in either plugin is modified. `buildArea`, the generators, and the Z-2 cut are not edited. `rebindSpriteset` emits the existing `world:areaBuilt` / `world:levelBuilt` events. `finishSwitch` calls the existing `UF.Fog.refresh()`. `DEUS_Depth.js`, `DEUS_Fog.js`, and `DEUS_Minimap.js` are not patched.

## Commands

All of these were run in the detached clone, foreground, one exit code each.

```
node --check game/js/plugins/DEUS_Levels.js
LEVELS_EXIT=0
node --check game/js/plugins/DEUS_World.js
WORLD_EXIT=0
node --check tools/test_layer_switch_inplace.js
TEST_EXIT=0
node --check tasks/SIM.00.00/lane-n/run_existing_suites.js
SUITES_EXIT=0
node --check tasks/SIM.00.00/lane-n/perf/summarize.js
SUM_EXIT=0
```

Gate (`node tools/test_layer_switch_inplace.js`). Process wall time 37.75s. `EXIT=0`.

```
running suite layer_switch_inplace on C:\Users\snewt\AppData\Local\Temp\deus_layer_switch\tip_24236, seed 18
PASS layer_switch_inplace.same_scene_and_spriteset - Ground->+1: scene same, spriteset same, Scene_Map made 0, Spriteset_Map made 0; +1->+2: scene same, spriteset same, Scene_Map made 0, Spriteset_Map made 0; +2->Ground: scene same, spriteset same, Scene_Map made 0, Spriteset_Map made 0; Ground->-1: scene same, spriteset same, Scene_Map made 0, Spriteset_Map made 0; -1->Ground: scene same, spriteset same, Scene_Map made 0, Spriteset_Map made 0; [fog on] Ground->+1: scene same, spriteset same, Scene_Map made 0, Spriteset_Map made 0; [fog on] +1->+2: scene same, spriteset same, Scene_Map made 0, Spriteset_Map made 0; [fog on] +2->Ground: scene same, spriteset same, Scene_Map made 0, Spriteset_Map made 0; [fog on] Ground->-1: scene same, spriteset same, Scene_Map made 0, Spriteset_Map made 0; [fog on] -1->Ground: scene same, spriteset same, Scene_Map made 0, Spriteset_Map made 0
PASS layer_switch_inplace.ticks_never_skipped - Ground->+1: 4 updates, 0 without exactly one UF.Time tick, 0 without exactly one World frame, 0 paused; ticks +4, World frames +4; +1->+2: 4 updates, 0 without exactly one UF.Time tick, 0 without exactly one World frame, 0 paused; ticks +4, World frames +4; +2->Ground: 4 updates, 0 without exactly one UF.Time tick, 0 without exactly one World frame, 0 paused; ticks +4, World frames +4; Ground->-1: 4 updates, 0 without exactly one UF.Time tick, 0 without exactly one World frame, 0 paused; ticks +4, World frames +4; -1->Ground: 4 updates, 0 without exactly one UF.Time tick, 0 without exactly one World frame, 0 paused; ticks +4, World frames +4; [fog on] Ground->+1: 4 updates, 0 without exactly one UF.Time tick, 0 without exactly one World frame, 0 paused; ticks +4, World frames +4; [fog on] +1->+2: 4 updates, 0 without exactly one UF.Time tick, 0 without exactly one World frame, 0 paused; ticks +4, World frames +4; [fog on] +2->Ground: 4 updates, 0 without exactly one UF.Time tick, 0 without exactly one World frame, 0 paused; ticks +4, World frames +4; [fog on] Ground->-1: 4 updates, 0 without exactly one UF.Time tick, 0 without exactly one World frame, 0 paused; ticks +4, World frames +4; [fog on] -1->Ground: 4 updates, 0 without exactly one UF.Time tick, 0 without exactly one World frame, 0 paused; ticks +4, World frames +4 (speed 1x, from the request to 2 frames after the switch completed)
PASS layer_switch_inplace.no_sync_build_after_prewarm - prewarm: cold ring levels [] after 125.44 ms, 4 prewarm builds (1218.94 ms, worst 339.41 ms), 12 steps while the map loaded; Ground->+1: UF.World.buildArea calls 0, +1->+2: UF.World.buildArea calls 0, +2->Ground: UF.World.buildArea calls 0, Ground->-1: UF.World.buildArea calls 0, -1->Ground: UF.World.buildArea calls 0, [fog on] Ground->+1: UF.World.buildArea calls 0, [fog on] +1->+2: UF.World.buildArea calls 0, [fog on] +2->Ground: UF.World.buildArea calls 0, [fog on] Ground->-1: UF.World.buildArea calls 0, [fog on] -1->Ground: UF.World.buildArea calls 0 (levels built: [])
PASS layer_switch_inplace.switch_within_one_frame - Ground->+1: frames 0, renderFrames 1, ms 18.07 (work 10.22: swap 4.18, rebind 6.02, fog 0.01), in place true, reused true; worst update 115.25 ms; +1->+2: frames 0, renderFrames 1, ms 17.84 (work 14.59: swap 11.67, rebind 2.91, fog 0.01), in place true, reused true; worst update 46.7 ms; +2->Ground: frames 0, renderFrames 1, ms 35.66 (work 27.76: swap 19.49, rebind 8.27, fog 0.01), in place true, reused true; worst update 36.52 ms; Ground->-1: frames 0, renderFrames 1, ms 17.27 (work 15.95: swap 10.31, rebind 5.62, fog 0.02), in place true, reused true; worst update 71.42 ms; -1->Ground: frames 0, renderFrames 1, ms 28.22 (work 24.63: swap 15.33, rebind 9.3, fog 0), in place true, reused true; worst update 100.77 ms; [fog on] Ground->+1: frames 0, renderFrames 1, ms 12.74 (work 7.15: swap 2.87, rebind 2.65, fog 1.63), in place true, reused true; worst update 67.77 ms; [fog on] +1->+2: frames 0, renderFrames 1, ms 6.59 (work 4.14: swap 1.66, rebind 1.75, fog 0.73), in place true, reused true; worst update 40.82 ms; [fog on] +2->Ground: frames 0, renderFrames 1, ms 1333.13 (work 1332.54: swap 6.96, rebind 8.04, fog 1317.54), in place true, reused true; worst update 1376.87 ms; [fog on] Ground->-1: frames 0, renderFrames 1, ms 18.64 (work 17.44: swap 12.25, rebind 4.32, fog 0.87), in place true, reused true; worst update 22.65 ms; [fog on] -1->Ground: frames 0, renderFrames 1, ms 1249.84 (work 1247.8: swap 5.9, rebind 7.14, fog 1234.76), in place true, reused true; worst update 1257.54 ms
PASS layer_switch_inplace.new_level_shown_at_once - Ground->+1: ok (1 unit events for 1 units; fog hidden (disabled in play); minimap activeZ 1, HUD kept); +1->+2: ok (1 unit events for 1 units; fog hidden (disabled in play); minimap activeZ 2, HUD kept); +2->Ground: ok (769 unit events for 769 units; fog hidden (disabled in play); minimap activeZ 0, HUD kept); Ground->-1: ok (241 unit events for 241 units; fog hidden (disabled in play); minimap activeZ -1, HUD kept); -1->Ground: ok (769 unit events for 769 units; fog hidden (disabled in play); minimap activeZ 0, HUD kept); [fog on] Ground->+1: ok (1 unit events for 1 units; fog hidden above ground; minimap activeZ 1, HUD kept); [fog on] +1->+2: ok (1 unit events for 1 units; fog hidden above ground; minimap activeZ 2, HUD kept); [fog on] +2->Ground: ok (769 unit events for 769 units; fog own cell alpha 150, other levels' cells 255/255/255/255, observers clear 6/6; minimap activeZ 0, HUD kept); [fog on] Ground->-1: ok (241 unit events for 241 units; fog own cell alpha 150, other levels' cells 255/255/255/255, observers clear 0/0; minimap activeZ -1, HUD kept); [fog on] -1->Ground: ok (769 unit events for 769 units; fog own cell alpha 150, other levels' cells 255/255/255/255, observers clear 6/6; minimap activeZ 0, HUD kept)
PASS layer_switch_inplace.save_load_keeps_view_and_world - saved on +1 after 22 switches (5908904 characters of JSON); world after the load: units (cells, levels), tile and object diffs, level strata, seed and next unit id the same; view before {"z":1,"mapId":1001,"px":128,"py":128,"dx":120,"dy":122,"record":"{\"x\":128,\"y\":128,\"z\":1}","plate":"+1"} after {"z":1,"mapId":1001,"px":128,"py":128,"dx":120,"dy":122,"record":"{\"x\":128,\"y\":128,\"z\":1}","plate":"+1"} (same); saved view record matches the view; 1 units on the loaded level, 0 without an event; load to map 4422 ms; then +1->Ground in place, scene kept
PASS layer_switch_inplace.no_errors - harness errors during the suite: none (0 before it); console.error calls: none
RESULT: 7 passed, 0 failed (exit 0)
SUMMARY: 7/7 checks passed; 35 s
EXIT=0
```

Mutants (`node tools/test_layer_switch_inplace.js --mutants`). The flag is `--mutants` (script header and `flag("mutants")`). Process wall time 324.45s. `EXIT=0`.

```
running suite layer_switch_inplace on C:\Users\snewt\AppData\Local\Temp\deus_layer_switch\mutant_transfer_switch_24604 (mutant transfer_switch), seed 18
MUTANT transfer_switch: CAUGHT by same_scene_and_spriteset (exit 1; RESULT: 2 passed, 5 failed (exit 1); failing: same_scene_and_spriteset, ticks_never_skipped, switch_within_one_frame, new_level_shown_at_once, save_load_keeps_view_and_world; 32 s)
running suite layer_switch_inplace on C:\Users\snewt\AppData\Local\Temp\deus_layer_switch\mutant_pause_during_switch_24604 (mutant pause_during_switch), seed 18
MUTANT pause_during_switch: CAUGHT by ticks_never_skipped (exit 1; RESULT: 6 passed, 1 failed (exit 1); failing: ticks_never_skipped; 35 s)
running suite layer_switch_inplace on C:\Users\snewt\AppData\Local\Temp\deus_layer_switch\mutant_no_prewarm_24604 (mutant no_prewarm), seed 18
MUTANT no_prewarm: CAUGHT by no_sync_build_after_prewarm (exit 1; RESULT: 6 passed, 1 failed (exit 1); failing: no_sync_build_after_prewarm; 52 s)
running suite layer_switch_inplace on C:\Users\snewt\AppData\Local\Temp\deus_layer_switch\mutant_slow_rebind_24604 (mutant slow_rebind), seed 18
MUTANT slow_rebind: CAUGHT by switch_within_one_frame (exit 1; RESULT: 6 passed, 1 failed (exit 1); failing: switch_within_one_frame; 36 s)
running suite layer_switch_inplace on C:\Users\snewt\AppData\Local\Temp\deus_layer_switch\mutant_stale_sprites_24604 (mutant stale_sprites), seed 18
MUTANT stale_sprites: CAUGHT by new_level_shown_at_once (exit 1; RESULT: 6 passed, 1 failed (exit 1); failing: new_level_shown_at_once; 36 s)
running suite layer_switch_inplace on C:\Users\snewt\AppData\Local\Temp\deus_layer_switch\mutant_no_fog_refresh_24604 (mutant no_fog_refresh), seed 18
MUTANT no_fog_refresh: CAUGHT by new_level_shown_at_once (exit 1; RESULT: 6 passed, 1 failed (exit 1); failing: new_level_shown_at_once; 34 s)
running suite layer_switch_inplace on C:\Users\snewt\AppData\Local\Temp\deus_layer_switch\mutant_save_view_stale_24604 (mutant save_view_stale), seed 18
MUTANT save_view_stale: CAUGHT by save_load_keeps_view_and_world (exit 1; RESULT: 6 passed, 1 failed (exit 1); failing: save_load_keeps_view_and_world; 36 s)
running suite layer_switch_inplace on C:\Users\snewt\AppData\Local\Temp\deus_layer_switch\mutant_error_injected_24604 (mutant error_injected), seed 18
MUTANT error_injected: CAUGHT by no_errors (exit 1; RESULT: 6 passed, 1 failed (exit 1); failing: no_errors; 37 s)
MUTANTS: 8/8 caught
EXIT=0
```

## Mutant table

Caught means the designated check is FAIL and the RESULT line contains `(exit 1)`. Compared with `tasks/SIM.00.00/lane-n/mutants_output.txt`.

| mutant | designated check | this run | committed file |
|---|---|---|---|
| `transfer_switch` | `same_scene_and_spriteset` | CAUGHT, exit 1, 2 passed / 5 failed, 32 s | CAUGHT, same failing set, 33 s |
| `pause_during_switch` | `ticks_never_skipped` | CAUGHT, exit 1, 6/1, 35 s | CAUGHT, 6/1, 35 s |
| `no_prewarm` | `no_sync_build_after_prewarm` | CAUGHT, exit 1, 6/1, 52 s | CAUGHT, 6/1, 53 s |
| `slow_rebind` | `switch_within_one_frame` | CAUGHT, exit 1, 6/1, 36 s | CAUGHT, 6/1, 35 s |
| `stale_sprites` | `new_level_shown_at_once` | CAUGHT, exit 1, 6/1, 36 s | CAUGHT, 6/1, 35 s |
| `no_fog_refresh` | `new_level_shown_at_once` | CAUGHT, exit 1, 6/1, 34 s | CAUGHT, 6/1, 32 s |
| `save_view_stale` | `save_load_keeps_view_and_world` | CAUGHT, exit 1, 6/1, 36 s | CAUGHT, 6/1, 36 s |
| `error_injected` | `no_errors` | CAUGHT, exit 1, 6/1, 37 s | CAUGHT, 6/1, 36 s |

`MUTANTS: 8/8 caught` matches the committed file. The per-mutant seconds differ by at most 2. Those are wall-clock. The failing-check sets match, including `transfer_switch` failing five checks and each other mutant failing only its designated check.

## Done tests

Read from `tools/test_layer_switch_inplace.js`. Checks 1–5 judge rounds 1 and 2 (the brief's sequence, fog as in play and fog forced on). Each assertion pushes a real failure; the message is not the assertion.

| brief check | assertion | provocation, shown failing |
|---|---|---|
| 1. No new `Scene_Map` or `Spriteset_Map`; same object identity | `sameScene && sameSpriteset && scenesMade === 0 && spritesetsMade === 0`, constructors wrapped | `transfer_switch` forces `swap = null` (the old transfer). Failed `same_scene_and_spriteset` |
| 2. Ticks keep advancing, none skipped | every sampled `updateMain` has `dTicks === 1`, `dW === 1`, not paused, and both counters moved | `pause_during_switch` pauses `UF.Time` from the request until the rebind. Failed `ticks_never_skipped` only |
| 3. No synchronous `buildArea` during a switch once prewarm has run | `cold.length === 0` and `builds === 0` in the switch window (`buildArea` wrapped) | `no_prewarm` sets `WARM.enabled` false. Failed `no_sync_build_after_prewarm` only |
| 4. `lastSwitch.frames` at most 1, and ms reported | new record, `to` matches, `inPlace === true`, `frames <= 1`, `renderFrames <= 1`, `Number.isFinite(ms)` | `slow_rebind` delays `finishSwitch` by 3 spriteset updates. Failed `switch_within_one_frame` only |
| 5. Player, units, fog, and minimap show the new level on the completing frame | `inspect()` pushes `bad` for view cell, player sprite identity, camera, unit events and sprites, objects/items/depth/plate, fog alphas or visibility, and minimap `activeZ` plus HUD bitmap identity | `stale_sprites` creates no sprites for the new level's events. `no_fog_refresh` removes `UF.Fog.refresh()`. Each failed `new_level_shown_at_once` only |
| 6. Save and load restore the same view and world | world keys (units, diffs, object diffs, strata, seed, next unit id), view fields, saved `state.view`, events on the loaded level, and the next switch in place on the same scene | `save_view_stale` does not write `state.view` on the in-place path. Failed `save_load_keeps_view_and_world` only |

The seventh check, `no_errors`, is outside the six brief tests. `error_injected` logs `console.error` from the rebind and failed that check only.

On the fog-on switch to -1 this run reported `observers clear 0/0`. `Fog.observers()` was empty, so that one clause did not constrain -1. The same switch still required own-cell alpha in `[0, 255)` and the other levels' cells at 255. Ground sampled `6/6`. `no_fog_refresh` still failed the check.

## Claims against what was measured

Re-ran here: the gate and `--mutants`. Not re-ran: `--ref=main`, `perf/tip` as a separate bench, and `run_existing_suites.js`. Those counts were checked against the committed logs and JSON instead.

Reproduced on this machine:

- Gate `RESULT: 7 passed, 0 failed (exit 0)`, `EXIT=0`. Same scene, same spriteset, zero constructors, zero skipped ticks, zero `buildArea` calls on the ten judged switches, `frames` 0, `renderFrames` 1, `inPlace` true, cold ring `[]`, 4 prewarm builds, 12 load steps.
- Mutants 8/8, same failing sets as `mutants_output.txt`.
- Fog forced on, a switch onto the ground is about 1.3 s inside `UF.Fog.refresh` (`fog` 1317.54 ms and 1234.76 ms here). `perf/tip` records 1332.3 ms and 1275.8 ms. Same shape. Fog-off switches stayed under 36 ms of `lastSwitch.ms`.
- Committed `perf/summary.md` rows for rounds 1–6 match `perf/main/layer_switch_perf.json` and `perf/tip/layer_switch_perf.json` at one decimal, including round 2 (fog on). Median/max for rounds 1, 3, and 4 match the summary's median table and the report's rounded sentence (101/550, 6/13, 62/475, 4/18, 76/102, 13/31, 130/378, 15/21, 96/136, 10/27). Builds during those 15 switches: main 3, tip 0. Skipped updates: main 20, tip 0. Load in those JSON files: main 1907.4 ms (4 builds), tip 4089.13 ms (9 builds).
- Committed suite `RESULT` lines match `test_changes.md` and `REPORT.md`: vertical 7/4 both sides (baseline random seed 8/3), natural_walls 6/0, flooding 8/0, strata 6/0, world 24/6 (baseline 25/5), spawn 4/2. Pairing check names, main vs tip, none differ. `suites/main_vertical.txt` switch_time is 463 ms / 136 ms; `suites/tip_vertical.txt` is 22 ms / 24 ms, 0 map frames, reused true.
- Screenshots opened: `evidence/layer_switch_inplace.1_p1.png` plate +1 and minimap tab +1, with a barred unit on a wooden floor; `evidence/layer_switch_inplace.4_m1.png` plate -1, minimap tab -1, dark rock and blue water, a health bar at the centre; `evidence/layer_switch_inplace.fog_on_Ground.png` plate Ground and the settlement visible; `perf/main/layer_switch_inplace.fog_on_Ground.png` plate Ground and the view dark.

Wall-clock figures that this run did not bit-match, and that are not treated as contradictions:

| claim | committed | this gate run |
|---|---|---|
| prewarm | evidence 1221.68 ms, worst 352.34 ms, wait 40.66 ms; perf tip 1232.4 / 350.5 | 1218.94 ms, worst 339.41 ms, wait 125.44 ms |
| first judged switch ms | evidence 10.61 | 18.07 |
| fog-on ground switches | perf tip 1348.6 and 1294.6 | 1333.13 and 1249.84 |
| save/load | evidence 4301 ms, 5908834 JSON chars; perf tip 4089.1 ms | 4422 ms, 5908904 chars |
| mutant seconds | 33, 35, 53, 35, 35, 32, 36, 36 | 32, 35, 52, 36, 36, 34, 36, 37 |

`REPORT.md` says "Not pushed, not merged." This commit is on `origin/task/lane-n`. It is not merged: merge-base with `origin/main` is `8592b07aa9315c1cdd2c8d29e1a6d37d3d055deb`. The status sentence predates the push of the commit that contains it.

## Findings

BLOCKER: none.

MAJOR: none.

MINOR: none.

VERDICT: CLEAN PASS
