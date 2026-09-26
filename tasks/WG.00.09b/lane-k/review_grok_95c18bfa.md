# Grok review: WG.00.09b Lane K Fix 2 (switch_same_frame after Lane N in-place switch)

Reviewed tip, pasted from `git rev-parse HEAD origin/task/lane-k` and `git log -12 --format="%H %an %s"` in the live worktree before any review command:

```
95c18bfa4ac02b3a662fe28710aaedc52f99f1ad
95c18bfa4ac02b3a662fe28710aaedc52f99f1ad
95c18bfa4ac02b3a662fe28710aaedc52f99f1ad deus-claude [claude] WG.00.09b Fix2: REPORT.md Fix 2 section (root cause confirmed and corrected, drawn-frame measurement, the change, gates on c2184c94, bench, switch cost, scope)
11868308df08353526a17f41c808ca806594ab4a deus-claude [claude] WG.00.09b Fix2: DEUS_Depth.md (in-place switch order: planes bound, painted and units placed inside rebindSpriteset before levels:viewChanged; canvases across map transfers; status on c2184c94), test_changes.md Fix 2 table
609c2e4f18860e564a50726ee1572f9851f6c5cd deus-claude [claude] WG.00.09b Fix2: evidence (reproduction on 3538594d, canvases_freed on 00ff1c59, WIP and final gate logs on c2184c94), bench normal x2 and stress x2 with machineLoad, switch-cost comparison
c2184c949650765a4fe8237eccc09c9106537e86 deus-claude [claude] WG.00.09b Fix2 WIP: canvases_freed tests the pool through two map transfers (in-place switches make no spriteset; its provocation was not caught after the Lane N merge) and the planes bound when the new scene starts
c98e80a244190aaa04deed01cee7227f5d2f8d74 deus-claude [claude] WG.00.09b Fix2 WIP: an in-place level switch binds, paints and places the planes, their entities and units inside UF.World.rebindSpriteset (world:levelBuilt / world:areaBuilt), before levels:viewChanged; comments for the in-place switch
3538594d7f19eb564c8939ac180a3d2394ad195e deus-claude [claude] WG.00.09b Fix2 WIP: switch_same_frame judges the planes' levels, a paint since bound, units on their cell foot, no stale sprites, and the first drawn frame after each switch (test only, renderer unchanged)
43d61f1f13b510e8d207e2794d5cffcaf483412d snewt [ops] WG.00.09b lane-k launch prompt 20260926_055850
d137fe1338b3c643756ef04e48ec594868b83efc snewt [pm] WG.00.09b lane-k: BRIEF_FIX2.md after post-merge gate FAIL (layers_flat.switch_same_frame with Lane N in-place switch e27e8be5); main 1f683b94 merged into lane
00ff1c599a672b27adfb1d56e32ff8bf86afc7a4 snewt [pm] Merge main 1f683b94 into task/lane-k for WG.00.09b Fix2 (main now has Lane N SIM.00.00 in-place level switch e27e8be5, plus Q/R/L1)
0315c84ab713dc4854da588efbf76feed78eb14c deus-grok [grok] WG.00.09b review abdb6bbe
1f683b948288abfb21bdfee7c33de44799c61af6 snewt Merge task/lane-l1: WG.65.15 per-class mass ledger (PM manual merge; Grok VERDICT CLEAN PASS at 4c590491; merge_gate MANIFEST_TAMPERED on [pm] open, expected until G1)
7f07ee48ed9bfad81391344d73f207724393f8e9 snewt Merge task/lane-r: SIM.40.05 decay cycle design (PM manual merge; Grok VERDICT PASS at 9a2908fb; merge_gate MANIFEST_TAMPERED on [pm] open, expected until G1)
```

HEAD equals `95c18bfa4ac02b3a662fe28710aaedc52f99f1ad` and `origin/task/lane-k`. Review continued. Authority for this pass is `BRIEF_FIX2.md`.

Commands below ran in a fresh clone (`git clone -c core.autocrlf=false` of this worktree to `%TEMP%\lanek-review-95c18bfa`, then `git checkout --detach 95c18bfa4ac02b3a662fe28710aaedc52f99f1ad`). Clone confirm:

```
CHECKOUT_EXIT=0
HEAD is now at 95c18bfa [claude] WG.00.09b Fix2: REPORT.md Fix 2 section (root cause confirmed and corrected, drawn-frame measurement, the change, gates on c2184c94, bench, switch cost, scope)
95c18bfa4ac02b3a662fe28710aaedc52f99f1ad
REVPARSE_EXIT=0
STATUS_EXIT=0
```

The clone status was empty. The clone was deleted afterwards (`CLONE_DELETED`).

`git diff --stat c2184c949650765a4fe8237eccc09c9106537e86 95c18bfa4ac02b3a662fe28710aaedc52f99f1ad -- game tools` printed nothing. DIFF_GAME_TOOLS_EXIT=0. The renderer and tools at this tip are the code commit the report measured.

## Scope

`git diff --name-status 00ff1c59 95c18bfa4ac02b3a662fe28710aaedc52f99f1ad` in the clone. DIFF_EXIT=0. 45 paths. Every path is inside `lane.json` `allowedPaths`. A name-only diff of `game/js/plugins/DEUS_Levels.js`, `game/js/plugins/DEUS_World.js`, and `tools/test_layer_switch_inplace.js` printed nothing. LANE_N_DIFF_EXIT=0.

| Status | Path | Inside allowedPaths |
|---|---|---|
| M | docs/systems/DEUS_Depth.md | yes |
| M | game/js/plugins/DEUS_Depth.js | yes |
| A | tasks/WG.00.09b/lane-k/BRIEF_FIX2.md | yes |
| M | tasks/WG.00.09b/lane-k/REPORT.md | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_base_00ff1c59/README.md | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_base_00ff1c59/provoke_canvases_freed.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/README.md | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/depth_provoke_only_canvases_freed.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate1_layers_flat_x3.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate1_provoke_layers_flat.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate2_depth.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate2_provoke_depth.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate3_minimap.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate4_layer_switch_inplace.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate5_check_deus_syntax.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate6_test_palette.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_00ff1c59/console.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_00ff1c59/layer_switch_perf.json | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_00ff1c59/results.txt | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_c2184c94/console.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_c2184c94/layer_switch_inplace.2_p2.png | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_c2184c94/layer_switch_inplace.3_Ground.png | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_c2184c94/layer_switch_perf.json | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_c2184c94/results.txt | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_repro_3538594d/README.md | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_repro_3538594d/repro_layers_flat.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_wip_c98e80a2/README.md | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_wip_c98e80a2/depth.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_wip_c98e80a2/layers_flat.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_wip_c98e80a2/provoke_depth.log | yes |
| A | tasks/WG.00.09b/lane-k/evidence/fix2_wip_c98e80a2/provoke_layers_flat.log | yes |
| A | tasks/WG.00.09b/lane-k/launches/20260926_055850_prompt.txt | yes |
| A | tasks/WG.00.09b/lane-k/perf/baseline_c2184c94.json | yes |
| A | tasks/WG.00.09b/lane-k/perf/fix2_switch_cost.js | yes |
| A | tasks/WG.00.09b/lane-k/perf/fix2_switch_cost_output.txt | yes |
| A | tasks/WG.00.09b/lane-k/perf/logs_c2184c94/bench_normal_1.log | yes |
| A | tasks/WG.00.09b/lane-k/perf/logs_c2184c94/bench_normal_2.log | yes |
| A | tasks/WG.00.09b/lane-k/perf/logs_c2184c94/bench_stress_1.log | yes |
| A | tasks/WG.00.09b/lane-k/perf/logs_c2184c94/bench_stress_2.log | yes |
| A | tasks/WG.00.09b/lane-k/perf/logs_c2184c94/probe_normal_1.jsonl | yes |
| A | tasks/WG.00.09b/lane-k/perf/logs_c2184c94/probe_normal_2.jsonl | yes |
| A | tasks/WG.00.09b/lane-k/perf/logs_c2184c94/probe_stress_1.jsonl | yes |
| A | tasks/WG.00.09b/lane-k/perf/logs_c2184c94/probe_stress_2.jsonl | yes |
| A | tasks/WG.00.09b/lane-k/perf/stress_baseline_c2184c94.json | yes |
| M | tasks/WG.00.09b/lane-k/test_changes.md | yes |

`game/js/plugins.js`, `DEUS_Minimap.js`, `DEUS_Fog.js`, `DEUS_DayNight.js`, `tools/test_layer_render_flat.js`, `tools/bench_render_layers.js`, and `tools/test_minimap.js` are absent from this range. No path under `game/img/`.

## In-place switch

Read on this tip, not edited.

`DEUS_Levels.js` `finishSwitch` calls `UF.World.rebindSpriteset`, then `UF.Fog.refresh`, then `emit("levels:viewChanged")`. `DEUS_World.rebindSpriteset` rebinds the tilemap and character sprites, then emits `world:areaBuilt` (ground) or `world:levelBuilt`. DEUS_Depth listens to both and calls `Sprite_DepthRoot.levelShown`: `rebuild()` then `sync()` (`update(false)` plus `updateUnits`), unless the `switch_same_frame` provocation sets `_unitsLate` and returns. That places plane units before `rebindSpriteset` returns, so before `levels:viewChanged`, without depending on listener order. `rootOf()` is null during `Scene_Map.create`, so a map transfer still binds, paints, and places from `createCharacters`. The report's dependence on `finishSwitch` statement order matches the file and is stated in REPORT.md and `DEUS_Depth.md`.

`bind()` records `_paintsAtBind` after `refresh()` and clears entity sprites. `switch_same_frame` requires a paint since that mark, units on their cell foot, and no sprite of another level, at the event and again inside a wrapped `Graphics.app.render` (restored after the suite). The sequence required is `0->2 2->1 1->0 0->-1 -1->0`.

## DEC-011

In `DEUS_Depth.js` at this tip, `updatePlane` uses scale 1 except `REPROJECT` (0.97 or 0.80) for the projection and parallax provocations. `applyLook` sets `filters` null and alpha 1. The only `ColorMatrixFilter` construction is behind `INJECT_FILTER`. The file has no `BlurFilter` construction.

The clone depth run passed `projection_origin` (centre `(408,312)`, left edge `(0,312)`, scale 1), `parallax_bounded` (edge shift 0 px, a 2-tile pan moved −96 px), `no_filters_any_state` (none in six states), `flat_transform` (scale 1, filters empty, no blur/colour filter), `no_blends` (0 of 53504), and `crisp_nearest` (`smooth false`, `scaleMode 0`). The clone `layers_flat` runs passed `flat_position` (off by `(0,0)` before and after the pan), `flat_crisp` (0 foreign colours), and `flat_no_filters`.

## DEC-007

This review generated no art. The two PNGs in the diff are harness screenshots under `tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_c2184c94/`.

## Gate tests

Each command ran in the clone, in the foreground, one after another. `node --check game/js/plugins/DEUS_Depth.js` was an extra syntax check. EXIT values are the process exit codes.

```
node --check game/js/plugins/DEUS_Depth.js
EXIT=0
DURATION_MS=97

node tools/test_layer_render_flat.js
EXIT=0
DURATION_MS=28037
run: RESULT: 12 passed, 0 failed (exit 0) in 28.0 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat_14616_1790424148835 (deleted)
required checks: 12/12 PASS
RESULT: all required checks passed (exit 0)

node tools/test_layer_render_flat.js
EXIT=0
DURATION_MS=40419
run: RESULT: 12 passed, 0 failed (exit 0) in 40.3 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat_26112_1790424176880 (deleted)
required checks: 12/12 PASS
RESULT: all required checks passed (exit 0)

node tools/test_layer_render_flat.js
EXIT=0
DURATION_MS=33427
run: RESULT: 12 passed, 0 failed (exit 0) in 33.3 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat_11616_1790424217315 (deleted)
required checks: 12/12 PASS
RESULT: all required checks passed (exit 0)

node tools/test_layer_render_flat.js --provoke
EXIT=0
DURATION_MS=278926
run: RESULT: 12 passed, 0 failed (exit 0) in 29.0 s
required checks: 12/12 PASS
RESULT: all required checks passed, 8 provocation(s) run (exit 0)

node tools/test_layer_render_flat.js --suite depth
EXIT=0
DURATION_MS=30816
run: RESULT: 27 passed, 0 failed (exit 0) in 30.7 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_11616_1790424529696 (deleted)
required checks: 27/27 PASS
RESULT: all required checks passed (exit 0)

node tools/test_minimap.js
EXIT=0
DURATION_MS=75
RESULT: 24 passed, 0 failed (exit 0)

node tools/test_layer_switch_inplace.js
EXIT=0
DURATION_MS=36046
RESULT: 7 passed, 0 failed (exit 0)
SUMMARY: 7/7 checks passed; 33 s

node tools/check_deus_syntax.js
EXIT=0
DURATION_MS=2646
Checked 52 DEUS plugin files. Errors: 0

node tools/test_palette.js
EXIT=0
DURATION_MS=81
Palette loaded successfully
```

`switch_same_frame` on the three required runs and on the unprovoked half of `--provoke`. Each of the five switches is painted since bound, with units on their cell, at `levels:viewChanged` and in the first drawn frame. No `NOT PAINTED`, `NOT DRAWN`, or `STALE`.

```
PASS layers_flat.switch_same_frame - switches 0->2 2->1 1->0 0->-1 -1->0: 0->2 at levels:viewChanged (frame 86): planes 1:shown painted since bound (3 paint(s)), 0:shown painted since bound (3 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 87): planes 1:shown painted since bound (3 paint(s)), 0:shown painted since bound (3 paint(s)); 1 unit(s) in the window, all with a frame on their cell; 2->1 at levels:viewChanged (frame 171): planes 0:shown painted since bound (11 paint(s)), -1:shown painted since bound (11 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 171): planes 0:shown painted since bound (11 paint(s)), -1:shown painted since bound (11 paint(s)); 1 unit(s) in the window, all with a frame on their cell; 1->0 at levels:viewChanged (frame 192): planes -1:shown painted since bound (15 paint(s)), -2:shown painted since bound (15 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 192): planes -1:shown painted since bound (15 paint(s)), -2:shown painted since bound (15 paint(s)); 1 unit(s) in the window, all with a frame on their cell; 0->-1 at levels:viewChanged (frame 219): planes -2:shown painted since bound (20 paint(s)); 0 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 219): planes -2:shown painted since bound (20 paint(s)); 0 unit(s) in the window, all with a frame on their cell; -1->0 at levels:viewChanged (frame 246): planes -1:shown painted since bound (25 paint(s)), -2:shown painted since bound (20 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 246): planes -1:shown painted since bound (25 paint(s)), -2:shown painted since bound (20 paint(s)); 1 unit(s) in the window, all with a frame on their cell
```

```
PASS layers_flat.switch_same_frame - switches 0->2 2->1 1->0 0->-1 -1->0: 0->2 at levels:viewChanged (frame 83): planes 1:shown painted since bound (3 paint(s)), 0:shown painted since bound (3 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 83): planes 1:shown painted since bound (3 paint(s)), 0:shown painted since bound (3 paint(s)); 1 unit(s) in the window, all with a frame on their cell; 2->1 at levels:viewChanged (frame 163): planes 0:shown painted since bound (11 paint(s)), -1:shown painted since bound (11 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 163): planes 0:shown painted since bound (11 paint(s)), -1:shown painted since bound (11 paint(s)); 1 unit(s) in the window, all with a frame on their cell; 1->0 at levels:viewChanged (frame 184): planes -1:shown painted since bound (15 paint(s)), -2:shown painted since bound (15 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 184): planes -1:shown painted since bound (15 paint(s)), -2:shown painted since bound (15 paint(s)); 1 unit(s) in the window, all with a frame on their cell; 0->-1 at levels:viewChanged (frame 211): planes -2:shown painted since bound (20 paint(s)); 0 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 211): planes -2:shown painted since bound (20 paint(s)); 0 unit(s) in the window, all with a frame on their cell; -1->0 at levels:viewChanged (frame 238): planes -1:shown painted since bound (25 paint(s)), -2:shown painted since bound (20 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 238): planes -1:shown painted since bound (25 paint(s)), -2:shown painted since bound (20 paint(s)); 1 unit(s) in the window, all with a frame on their cell
```

```
PASS layers_flat.switch_same_frame - switches 0->2 2->1 1->0 0->-1 -1->0: 0->2 at levels:viewChanged (frame 83): planes 1:shown painted since bound (3 paint(s)), 0:shown painted since bound (3 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 83): planes 1:shown painted since bound (3 paint(s)), 0:shown painted since bound (3 paint(s)); 1 unit(s) in the window, all with a frame on their cell; 2->1 at levels:viewChanged (frame 164): planes 0:shown painted since bound (11 paint(s)), -1:shown painted since bound (11 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 164): planes 0:shown painted since bound (11 paint(s)), -1:shown painted since bound (11 paint(s)); 1 unit(s) in the window, all with a frame on their cell; 1->0 at levels:viewChanged (frame 185): planes -1:shown painted since bound (15 paint(s)), -2:shown painted since bound (15 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 185): planes -1:shown painted since bound (15 paint(s)), -2:shown painted since bound (15 paint(s)); 1 unit(s) in the window, all with a frame on their cell; 0->-1 at levels:viewChanged (frame 212): planes -2:shown painted since bound (20 paint(s)); 0 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 212): planes -2:shown painted since bound (20 paint(s)); 0 unit(s) in the window, all with a frame on their cell; -1->0 at levels:viewChanged (frame 239): planes -1:shown painted since bound (25 paint(s)), -2:shown painted since bound (20 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 239): planes -1:shown painted since bound (25 paint(s)), -2:shown painted since bound (20 paint(s)); 1 unit(s) in the window, all with a frame on their cell
```

```
PASS layers_flat.switch_same_frame - switches 0->2 2->1 1->0 0->-1 -1->0: 0->2 at levels:viewChanged (frame 88): planes 1:shown painted since bound (3 paint(s)), 0:shown painted since bound (3 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 89): planes 1:shown painted since bound (3 paint(s)), 0:shown painted since bound (4 paint(s)); 1 unit(s) in the window, all with a frame on their cell; 2->1 at levels:viewChanged (frame 178): planes 0:shown painted since bound (11 paint(s)), -1:shown painted since bound (15 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 178): planes 0:shown painted since bound (12 paint(s)), -1:shown painted since bound (15 paint(s)); 1 unit(s) in the window, all with a frame on their cell; 1->0 at levels:viewChanged (frame 199): planes -1:shown painted since bound (17 paint(s)), -2:shown painted since bound (19 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 199): planes -1:shown painted since bound (17 paint(s)), -2:shown painted since bound (19 paint(s)); 1 unit(s) in the window, all with a frame on their cell; 0->-1 at levels:viewChanged (frame 226): planes -2:shown painted since bound (22 paint(s)); 0 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 226): planes -2:shown painted since bound (22 paint(s)); 0 unit(s) in the window, all with a frame on their cell; -1->0 at levels:viewChanged (frame 253): planes -1:shown painted since bound (27 paint(s)), -2:shown painted since bound (24 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 253): planes -1:shown painted since bound (27 paint(s)), -2:shown painted since bound (24 paint(s)); 1 unit(s) in the window, all with a frame on their cell
```

Provocation `depth.switch_same_frame` still fails the check (driver EXIT=0 because the failure was caught). All five events are `NOT PAINTED`. The four events with a unit in the window are `NOT DRAWN ON THEIR CELL` at the event and in the first drawn frame. `0->-1` has no unit in the window. Nine `NOT PAINTED`, eight `NOT DRAWN`.

```
CAUGHT depth.switch_same_frame: FAIL layers_flat.switch_same_frame - switches 0->2 2->1 1->0 0->-1 -1->0: 0->2 at levels:viewChanged (frame 79): planes 1:shown NOT PAINTED since bound (2 paint(s)), 0:shown NOT PAINTED since bound (2 paint(s)) (want levels [1, 0], shown and painted); 1 unit(s) in the window, NOT DRAWN ON THEIR CELL: TEST_flat_A#5381@1; first drawn frame (frame 79): planes 1:shown painted since bound (3 paint(s)), 0:shown painted since bound (3 paint(s)); 1 unit(s) in the window, NOT DRAWN ON THEIR CELL: TEST_flat_A#5381@1; 2->1 at levels:viewChanged (frame 172): planes 0:shown NOT PAINTED since bound (10 paint(s)), -1:shown NOT PAINTED since bound (10 paint(s)) (want levels [0, -1], shown and painted); 1 unit(s) in the window, NOT DRAWN ON THEIR CELL: TEST_flat_B#5382@-1; first drawn frame (frame 172): planes 0:shown painted since bound (11 paint(s)), -1:shown painted since bound (11 paint(s)); 1 unit(s) in the window, NOT DRAWN ON THEIR CELL: TEST_flat_B#5382@-1; 1->0 at levels:viewChanged (frame 193): planes -1:shown NOT PAINTED since bound (14 paint(s)), -2:shown NOT PAINTED since bound (14 paint(s)) (want levels [-1, -2], shown and painted); 1 unit(s) in the window, NOT DRAWN ON THEIR CELL: TEST_flat_B#5382@-1; first drawn frame (frame 193): planes -1:shown painted since bound (15 paint(s)), -2:shown painted since bound (15 paint(s)); 1 unit(s) in the window, NOT DRAWN ON THEIR CELL: TEST_flat_B#5382@-1; 0->-1 at levels:viewChanged (frame 220): planes -2:shown NOT PAINTED since bound (19 paint(s)) (want levels [-2], shown and painted); 0 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 220): planes -2:shown painted since bound (20 paint(s)); 0 unit(s) in the window, all with a frame on their cell; -1->0 at levels:viewChanged (frame 247): planes -1:shown NOT PAINTED since bound (24 paint(s)), -2:shown NOT PAINTED since bound (19 paint(s)) (want levels [-1, -2], shown and painted); 1 unit(s) in the window, NOT DRAWN ON THEIR CELL: TEST_flat_B#5382@-1; first drawn frame (frame 247): planes -1:shown painted since bound (25 paint(s)), -2:shown painted since bound (20 paint(s)); 1 unit(s) in the window, NOT DRAWN ON THEIR CELL: TEST_flat_B#5382@-1 [RESULT: 11 passed, 1 failed (exit 1), 28.2 s]
```

The other seven `layers_flat` provocations were caught as `FAIL` of their own check (`flat_no_filters`, `flat_position`, `flat_crisp`, `unit_step_same_frame` with "unit A missing", `every_view_sees_through`, `scan_candidates_only`, `item_change_scoped`).

Depth `canvases_freed` on this clone:

```
PASS depth.canvases_freed - after 4 in-place level switches and 2 map transfer(s) (a new spriteset each): 4 canvas layers in use, 4 canvases made since boot, 0 destroyed, 0 pooled (want 4 / 4 / 0 / 0); at each new scene's start, view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]; view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]
```

Lane N's gate stayed green, including `switch_within_one_frame` (frames 0, renderFrames 1, in place true) and `same_scene_and_spriteset` (Scene_Map made 0, Spriteset_Map made 0).

## Report spot-check

Compared with the committed evidence, not re-run as the writer's bench.

- F2.2 table, gate 1 run 1 on `c2184c94`: `evidence/fix2_c2184c94/gate1_layers_flat_x3.log` has event/drawn frames 86/87, 180/180, 201/201, 228/228, 255/255, each painted since bound with units on their cell. Runs 2 and 3 of that log are the same shape (83/84 and 88/89 on the first switch, the other four switches sharing a frame number). The sentence that both moments are complete on every switch in all three runs matches that log. This clone's three runs are the same shape (one first switch at 86/87, two at 83/83). `Graphics.frameCount` increments in `SceneManager.updateMain`, and one tick can run more than one `updateMain` before `Graphics._onTick` calls `app.render`. A drawn frame number one higher than the event is that extra update, sampled at the first render, with the planes and units already complete.
- F2.1 reproduction: `evidence/fix2_repro_3538594d/repro_layers_flat.log` is `FAIL layers_flat.switch_same_frame`, `required checks: 11/12 PASS`, `EXIT=1`. The event half is not painted and the unit has no sprite; the first drawn frame in that log is complete and shares the event's frame number, as the table says.
- F2.4 provoke log: `gate1_provoke_layers_flat.log` `CAUGHT depth.switch_same_frame` has frames 80/81, 176/176, 197/197, 224/224, 251/251, nine `NOT PAINTED`, eight `NOT DRAWN`. The report's drawn-frame list 81, 176, 197, 251 and the empty 0→−1 frame 224 match. `EXIT=0` and `8 provocation(s)`.
- F2.5 `levelsLastSwitch.ms` in `perf/baseline_c2184c94.json`: 12 switches, min 8.86999999784166, max 29.2000000008557. `requestToStartedMs` min 34.6, max 179.1. Both ranges in the report match.
- F2.6 quotes `perf/fix2_switch_cost_output.txt` exactly: events median 1.24 → 7.31, rebind 5.81 → 12.35, work 11.36 → 19.46, maxUpdate 59.22 → 52.24, 23/23 switches.

## Findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

None.

VERDICT: CLEAN PASS
