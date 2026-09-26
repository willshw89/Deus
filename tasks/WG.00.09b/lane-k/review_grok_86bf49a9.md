# Grok review: WG.00.09b Lane K (flat layers DEC-011 and performance)

Reviewed tip, pasted from `git rev-parse HEAD origin/task/lane-k` and `git log -8 --format="%H %an %s"` in the live worktree before any review command:

```
86bf49a926ea0ed6a546b31c94de66dd6863628d
86bf49a926ea0ed6a546b31c94de66dd6863628d
86bf49a926ea0ed6a546b31c94de66dd6863628d deus-claude [claude] WG.00.09b: mask_order probes a floor over painted ground; DEUS_Depth.md; after evidence
4da2e7345cf987671a0a0d5661be1b153654bfee deus-claude [claude] WG.00.09b K3/K4 evidence: baselines, ranking, escalation, test changes
f19b23bf598ccacf95c80c6e975bf05a14018c31 deus-claude [claude] WG.00.09b K4: lane-side fixes ranked by the K3 baselines
5c6641e151e2568ef15a445ba674ac9e77d9f747 deus-claude [claude] WG.00.09b K3: bench_render_layers.js (normal + 0019-T stress scenario)
983a9e46e3bd2eae0eb129e72f746d8ce6dbb2eb deus-claude [claude] WG.00.09b K2 WIP: minimap per-Z bitmaps, tab samples its own level; provocation fixes
a6b4a47d62e6027beb10cfece08deaa7065ad3a3 deus-claude [claude] WG.00.09b K1+K2 WIP: flat 1:1 layers, see-through on every view, lag fixes
ef866f105d4082e3d68a6a4cffe9361ab6aa9277 snewt [gemini] Record Lane K launch prompt 20260926_002423
c5a61e90af093d6d97123dc4d292898ec35020f6 snewt [gemini] 0019-T §2 Lane K brief addition: worst-case combat stress scenario
```

HEAD equals `86bf49a926ea0ed6a546b31c94de66dd6863628d` and `origin/task/lane-k`. No REPORT file exists under `tasks/WG.00.09b/lane-k/`.

Review commands ran in a fresh clone (`git clone -c core.autocrlf=false` of this worktree, then `git checkout --detach 86bf49a926ea0ed6a546b31c94de66dd6863628d`). `git rev-parse HEAD` in that clone printed `86bf49a926ea0ed6a546b31c94de66dd6863628d`.

## Scope

`git diff --name-status 8592b07aa9315c1cdd2c8d29e1a6d37d3d055deb 86bf49a926ea0ed6a546b31c94de66dd6863628d` (tabs written as `TAB`). DIFF_EXIT=0.

| Status | Path | Inside allowedPaths |
|---|---|---|
| M | docs/systems/DEUS_Depth.md | yes |
| M | docs/systems/DEUS_Minimap.md | yes |
| M | game/js/plugins.js | yes; diff is only the DEUS_Depth parameters block |
| M | game/js/plugins/DEUS_Depth.js | yes |
| M | game/js/plugins/DEUS_Minimap.js | yes |
| A | tasks/WG.00.09b/lane-k/** (BRIEF, escalation, evidence, lane.json, launches, perf, test_changes) | yes |
| A | tools/bench_render_layers.js | yes |
| A | tools/test_layer_render_flat.js | yes |
| M | tools/test_minimap.js | yes |

`game/js/plugins/DEUS_Fog.js` and `game/js/plugins/DEUS_DayNight.js` are not in the diff. `rank_k4.js` on the post-K4 baselines prints their self time as `0.00` worst / `0.00` mean over 12 windows, so leaving them untouched matches the K4 rule.

`plugins.js` diff (the whole file delta):

```
-      "Preset": "deus",
-      "MaxDepth": "2",
-      "EyeHeightFt": "140"
+      "MaxDepth": "2"
```

That is `{"MaxDepth": "2"}` and nothing else in the DEUS_Depth entry.

## Syntax

In the clone, each changed `.js` under `game/` and `tools/`:

```
node --check game/js/plugins.js
EXIT_plugins=0
node --check game/js/plugins/DEUS_Depth.js
EXIT_depth=0
node --check game/js/plugins/DEUS_Minimap.js
EXIT_minimap=0
node --check tools/bench_render_layers.js
EXIT_bench=0
node --check tools/test_layer_render_flat.js
EXIT_flat=0
node --check tools/test_minimap.js
EXIT_testminimap=0
```

## DEC-011 spot check

In `DEUS_Depth.js` at this tip:

- `Depth.project` is `(d, sx, sy) => ({ x: sx, y: sy })`. `Depth.edgeShift` is `() => 0`.
- `Sprite_DepthPlane.updatePlane` sets `s = 1` and `this.x/this.y` from `unprojected`. `scale.set` runs only to apply that `s`. The only other scale is `REPROJECT`, set to `0.97` or `0.80` when `UF_TEST_PROVOKE` is `depth.projection_origin` or `depth.parallax_bounded`. There is no preset or eye-height camera scale on the production path.
- `applyLook` sets `this.filters = null` and `this.alpha = 1`. The only `ColorMatrixFilter` construction is `INJECT_FILTER`, which is set for the filter provocations. There is no `BlurFilter` construction in the file.
- Plugin header parameter is `MaxDepth` only. `plugins.js` matches, as above.

Both depth runs below passed `projection_origin`, `parallax_bounded`, `no_filters_any_state`, `flat_transform`, and `no_blends`. The clone `layers_flat` run passed `flat_position`, `flat_crisp`, and `flat_no_filters`.

## Gate tests

### `node tools/test_layer_render_flat.js` (clone)

RESULT line: `RESULT: all required checks passed (exit 0)`. Counts: 12 passed, 0 failed. Duration: 32505 ms. EXIT=0.

```
=== DEUS_Depth suite "layers_flat" (WG.00.09b Lane K) ===
run: RESULT: 12 passed, 0 failed (exit 0) in 32.5 s (snapshot exit 0); results C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat\test_output\results.txt
  PASS layers_flat.preconditions - world true, levels true, view 0, screen 816x624
  PASS layers_flat.fixtures - cut 6 cells from (98,116), -1 floor (98,116); unit A (95,114) +1; unit B (98,116) -1
  PASS layers_flat.flat_position - before the pan depth 1 off by (0,0), depth 2 off by (0,0); after a 2-tile pan depth 1 off by (0,0), depth 2 off by (0,0) (want 0 px); unit A drawn at (240,216) for its cell's foot (240,216)
  PASS layers_flat.flat_crisp - 45248 opaque samples of the +2 planes' tile render, 0 colour(s) not in the 41-colour source set
  PASS layers_flat.unit_step_same_frame - step to (96,114) in frame 123: sprite target 96,114 set in frame 123; drawn on the new cell's foot (288,216) in frame 139 (16 frame(s) later, bound 17); between cells on the way: true; walk frames shown: true (columns 1/2, stand 1); unit E outside the window at x 111, stepped to (110,117) in frame 169: sprite made in frame 169
  PASS layers_flat.scan_candidates_only - 746 unit(s) tested per frame; 746 on the planes' levels, 1235 in the world; candidate lists made 8 time(s) since boot
  PASS layers_flat.item_change_scoped - before [{"items":false,"all":false,"objects":false},{"items":false,"all":false,"objects":false}]; a stone given to unit A (held): [{"items":false,"all":false,"objects":false},{"items":false,"all":false,"objects":false}]; a stone on the ground of level 1 at (96,114): [{"items":true,"all":false,"objects":false},{"items":false,"all":false,"objects":false}]
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat\test_output\layers_flat.ground_off.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat\test_output\layers_flat.ground_flat.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat\test_output\layers_flat.minus1_off.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat\test_output\layers_flat.minus1_flat.png
  PASS layers_flat.every_view_sees_through - +2: open cell (98,116) draws #08080c, planes #08080c, planes off #000000; floor cell (92,112) unchanged; planes on levels [1, 0]; +1: open cell (98,116) draws #6d4d3d, planes #6d4d3d, planes off #000000; solid cell (92,112) unchanged; planes on levels [0, -1]; Ground: open cell (98,116) draws #6d4d3d, planes #6d4d3d, planes off #000000; solid cell (92,112) unchanged; planes on levels [-1, -2]; -1: open cell (99,116) draws #352d24, planes #352d24, planes off #000000; floor cell (92,112) unchanged; planes on levels [-2]
  PASS layers_flat.flat_no_filters - plus2: planes on levels [1, 0], flat; plus1: planes on levels [0, -1], flat
  PASS layers_flat.switch_same_frame - 0->2 (frame 95): planes 1:shown 1 paint(s), 0:shown 1 paint(s); 4 unit(s) in the window, all with a frame; 2->1 (frame 202): planes 0:shown 1 paint(s), -1:shown 1 paint(s); 4 unit(s) in the window, all with a frame; 1->0 (frame 228): planes -1:shown 1 paint(s), -2:shown 1 paint(s); 1 unit(s) in the window, all with a frame; 0->-1 (frame 262): planes -2:shown 1 paint(s); 0 unit(s) in the window, all with a frame; -1->0 (frame 296): planes -1:shown 1 paint(s), -2:shown 1 paint(s); 1 unit(s) in the window, all with a frame
  PASS layers_flat.screenshots_written - layers_flat.ground_off.png 85750 B, layers_flat.ground_flat.png 92207 B, layers_flat.minus1_off.png 103893 B, layers_flat.minus1_flat.png 106185 B
  PASS layers_flat.no_errors - none
required checks: 12/12 PASS

RESULT: all required checks passed (exit 0)
EXIT=0
DURATION_MS=32505
```

Same command, same SHA, run once before the shell was in the clone (live worktree still at this commit). RESULT: `RESULT: 2 problem(s), 0 harness problem(s) (exit 1)`. Counts: 11 passed, 1 failed. Duration: 47121 ms. EXIT=1. The failing line:

```
FAIL layers_flat.every_view_sees_through - +2: open cell (26,196) draws #08080c, planes #08080c, planes off #000000; no solid cell; planes on levels [1, 0]; +1: open cell (26,196) draws #35312d, planes #35312d, planes off #000000; ramp cell (20,192) unchanged; planes on levels [0, -1]; Ground: open cell (26,196) draws #35312d, planes #35312d, planes off #000000; solid cell (20,192) unchanged; planes on levels [-1, -2]; -1: open cell (27,196) draws #35312d, planes #35312d, planes off #000000; solid cell (20,192) unchanged; planes on levels [-2]
```

The open cell's pixels matched the planes. The +2 view had no non-open cell inside the probe box, and the check requires one (`opaque = !!solidHere && ...` in `every_view_sees_through`).

### `node tools/test_snapshot.js --name depth --plugins DEUS_Depth --suite depth` (clone, first run)

RESULT line: `RESULT: 25 passed, 1 failed (exit 1)`. Counts: 25 passed, 1 failed. Duration: 46232 ms. EXIT=1.

```
snapshot: C:\Users\snewt\AppData\Local\Temp\uf_snapshots\depth
plugins: DEUS_Core > DEUS_Visuals > DEUS_Movement8D > DEUS_Perspective25D > DEUS_ColonyOverseer > DEUS_World > DEUS_WorldGen > DEUS_Tiles > DEUS_Factions > DEUS_History > DEUS_Objects > DEUS_Walls > DEUS_Doors > DEUS_Items > DEUS_Jobs > DEUS_Floors > DEUS_Generator > DEUS_Colonists > DEUS_Projects > DEUS_Wildlife > DEUS_Ecology > DEUS_Stance > DEUS_Combat > DEUS_Anim > DEUS_Fog > DEUS_DayNight > DEUS_TimeSpeed > DEUS_Camera > DEUS_Culling > DEUS_Speech > DEUS_Look > DEUS_Interact > DEUS_Sheet > DEUS_Talk > DEUS_Fire > DEUS_Levels > DEUS_Ownership > DEUS_Environment > DEUS_NaturalConnections > DEUS_FactionMenus > DEUS_Depth > DEUS_Test > UF_Test
Running --deus-test=depth on C:\Users\snewt\AppData\Local\Temp\uf_snapshots\depth
UF_Test run 2026-09-26T08:16:31.552Z args=[]
DEBUG_SHEET: Scene_Boot.start called
AVAILABLE SUITES: selftest, smoke, perf, native_starting_gear, native_survival_dying, native_perf_4x_benchmark, select, minimap, natural_connections, ownership, ecology, projects, settlement, colonists, overseer, world, spawn, worldgen, biomes, tiles, ground, factions, skins, history, objects, walls, doors, items, jobs, floors, wildlife, wildlife_seeds, stance, combat, anim, fog, daynight, timespeed, camera, culling, speech, overhead, look, sheet, talk, fire, vertical, natural_walls, flooding, strata, environment, faction_menus, title, load, setup, depth, layers_flat, select
SUITE depth
PASS depth.preconditions - world true, levels true, view 0, surface grid true, screen 816x624
PASS depth.proof_scene - natural window at (66,0): ground 59, +1 95, +2 67 cells; hole (74,1), deck 3 cells from (72,1)
PASS depth.planes_present - view 2; depth 1 -> level 1, 1 paint(s), 70766 opaque samples; depth 2 -> level 0, 1 paint(s), 11443 opaque samples; last paint 7.3 ms, last peek 0.0 ms
PASS depth.repaint_cost - repaints of one 912x720 plane: 7.3 / 4.5 / 1.4 / 1.3 / 1.4 ms (bound 16; this machine, nw.exe harness)
PASS depth.projection_origin - centre -> (408,312) want (408,312); left edge -> (0,312) want (0,312) (identity, DEC-011); plane scale 1
PASS depth.exposure_by_upper_geometry - floor cell (79,1) unchanged by the planes; open cell (73,1) shows the level below
SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\depth\test_output\depth.planes_only_plus2.png
SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\depth\test_output\depth.planes_only_plus2_tiles.png
SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\depth\test_output\depth.canvas_depth1.png
SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\depth\test_output\depth.canvas_depth2.png
PASS depth.mask_order - added deck cell (71,2) at screen (288,144): drawn #d89a55, depth 1 texels {#351d16 #492a19 #d89a55 #8e4d30}, ground texel under it #6d6d6d/255
PASS depth.depth2_through_depth1 - low ground (70,2) at screen (240,144): drawn #6d6d6d/255, ground texel #6d6d6d/255, ground texels {#6d6d6d}, depth 1 alpha there 0; under the hole (74,1) the ground draws #000000/0 (tiles 3488/786/3488): the solid ground cell has no art (see AUDIT_LOG)
FAIL depth.entities_drawn - fixtures: oak placed at (74,3), item stone x3 at (77,3), unit added; +1 plane draws 1 object(s), 1 unit(s), 0 item stack(s), 33 wall/ramp frame(s); unit at (71,6) probed at screen (288,340): drawn (#fbdcc8 vs #35312d without units)
PASS depth.crisp_nearest - 39744 opaque samples, 0 colour(s) not in the 60-colour source set; smooth false, baseTexture scaleMode 0 (0 nearest, 1 linear), sprite texture is the bitmap's, plane at (-24,-24)
PASS depth.parallax_bounded - edge shift measured depth 1 0 px, depth 2 0 px (want 0); a pan of 2 tiles moved a low-ground point on depth 1 from x 240 to 144 (-96 px, want -96); the point under the centre stays at x 408; display back at 65.5 (was 65.5)
PASS depth.tunables_take_effect - maxDepth 1 [1:1 2:-] void true; maxDepth 2 [1:1 2:0]; enabled false [1:- 2:-] void false; enabled true [1:1 2:0] void true
PASS depth.no_filters_any_state - maxDepth 1: none; maxDepth 2: none; off: none; on: none; entities off: none; entities on: none
PASS depth.one_level_below - maxDepth 1: depth 1 level 1, depth 2 hidden, void shown
PASS depth.void_beyond - low ground (70,2) at screen (240,144): planes render #08080c/255, screen #08080c, void #08080c
PASS depth.no_blends - 0 of 39744 sampled pixels are blends (want 0)
PASS depth.flat_transform - depth 1 scale 1 at (-24,-24) filters [] entities [] alpha 1; depth 2 scale 1 at (-24,-24) filters [] entities [] alpha 1; blur/colour filters in the subtree: none; active tilemap scale 1, filters none, alpha 1; terrace pixel #352d24, its source texel #352d24/255
PASS depth.entities_inherit_treatment - unit sprite in the +1 plane: child of the plane, world scale 1 x 1, filters on it and its 3 container(s): none; tint #ffffff (the unit's own)
PASS depth.visual_settings_no_physics - unchanged: {"unit":{"x":71,"y":6,"z":1},"shapeUnit":"floor","shapeChain":"open","walkChain":false,"walkUnit":true,"objects":1}
PASS depth.config_deterministic - the same after maxDepth 1 / 0 / 2 and off / on: {"describe":"2 level(s) below, drawn 1:1 (DEC-011), void #08080c","planes":[{"z":1,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]}]}
PASS depth.planes_cost - GL renderer "ANGLE (NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0)"; median engine tick (update + render submit) over 2 x 60 frames: planes off 1.7 ms, on 2.0 ms (the planes +0.4 ms, bound 8); median frame intervals off 16, on 16 ms; worst tick off 3.0, on 4.3 ms; this machine, nw.exe harness, simulation paused
SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\depth\test_output\depth.plus2_off.png
SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\depth\test_output\depth.plus2_flat.png
SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\depth\test_output\depth.plus1_off.png
SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\depth\test_output\depth.plus1_flat.png
PASS depth.screenshots_written - depth.plus2_off.png 265314 B, depth.plus2_flat.png 134504 B, depth.plus1_off.png 207527 B, depth.plus1_flat.png 215224 B
PASS depth.ground_draws_through_openings - view 0, depth 1 -> -1, depth 2 -> -2, void shown; solid ground cell (68,2) unchanged by the planes (its own art's lowest alpha 0); open cell (71,3) over the -2 floor draws #35312d (planes #35312d, -2 texels {#615551 #453d39 #6d615d}, -1 alpha 0; planes off #000000); open cell (69,3) over the -1 floor draws #352d24 (-1 texels {#514945 #35312d #352d24}; planes off #000000)
PASS depth.canvases_freed - 4 canvas layers in use, 4 canvases made since boot, 0 destroyed, 0 pooled, after 4 level switches (want 4 / 4 / 0 / 0)
PASS depth.hotkey_free - keyMapper[118] (F7) is undefined: the preset hotkey is gone and the key is free
PASS depth.no_errors - none
RESULT: 25 passed, 1 failed (exit 1)
results: C:\Users\snewt\AppData\Local\Temp\uf_snapshots\depth\test_output\results.txt; screenshots in C:\Users\snewt\AppData\Local\Temp\uf_snapshots\depth\test_output
EXIT=1
DURATION_MS=46232
```

Immediate repeat of the same command in the same clone. RESULT line: `RESULT: 26 passed, 0 failed (exit 0)`. Counts: 26 passed, 0 failed. Duration: 34270 ms. EXIT=0. `entities_drawn` on that world: `+1 plane draws 8 object(s), 1 unit(s), 1 item stack(s), 26 wall/ramp frame(s)`. Proof window was `(98,148)`, not the north edge.

### `node tools/test_minimap.js` (clone)

RESULT line: `RESULT: 24 passed, 0 failed (exit 0)`. Counts: 24 passed, 0 failed. Duration: 96 ms. EXIT=0.

```
=== DEUS Minimap (TASK UI-MAP-01) Headless Verification Suite ===
PASS minimap.api_loaded - Minimap API is present and loaded
PASS minimap.discovery_initial_unexplored - Cell (100,100,0) starts as UNKNOWN
PASS minimap.discovery_revealed - Cell (100,100,0) is DISCOVERED after explore()
PASS minimap.discovery_radius_explored - Radius explore correctly marked neighbour (102,102,0)
PASS minimap.z_layer_isolation_neg1 - Discovery on Z0 does NOT reveal Z-1
PASS minimap.z_layer_isolation_pos1 - Discovery on Z0 does NOT reveal Z+1
PASS minimap.z_layer_neg1_discovered - Z-1 cell becomes discovered independently
PASS minimap.z_layer_neg2_still_unexplored - Z-2 remains unexplored
PASS minimap.initial_chunks_flushed - Initial startup chunks cleanly flushed to base bitmap
PASS minimap.geometry_invalidation_dirty - Building wall at (60,60,0) dirties exactly 1 chunk (1 dirty chunk)
PASS minimap.chunk_rebuild_success - Dirty chunk successfully rebuilt (1 chunk rebuilt)
PASS minimap.chunk_now_clean - All chunks are clean after rebuild
PASS minimap.destruction_invalidation - Digging cell dirties exactly 1 chunk (16x16)
PASS minimap.camera_pan_no_rebuild - Camera panning triggered 0 base rebuilds (258 == 258)
PASS minimap.save_state_contains_minimap - Save contents include minimapDiscovery bitset
PASS minimap.reload_restores_exact_state - Reload accurately restored saved discovery state and discarded unsaved cells
PASS minimap.hostile_out_of_sight - Hostile at (200,200,0) is outside line of sight
PASS minimap.z_switch_back_no_full_redirty - first visit of the -1 tab dirties 256 chunk(s) (want 256, built once); back on the built Z0 tab: 0 dirty chunk(s) (want 0)
PASS minimap.z_switch_keeps_offtab_changes - a Z0 cell changed while the -1 tab was shown: 1 dirty chunk(s) on returning to Z0 (want 1)
PASS minimap.tab_samples_its_own_level - (60,60): Z0 tab 148,163,184 (want the wall 148,163,184); -1 tab 71,85,105 (want the -1 rock 71,85,105, never Z0's wall)
PASS minimap.overlay_throttled - 12 updates with a still camera redrew the overlay 3 time(s) (want 2-3, every 4th update); a camera move redrew it 1 time(s) in that update (want 1)
PASS minimap.negative_coords_safe - Negative coordinates (-10,-50) handled safely without crash
PASS minimap.z_clamped_high - Z=15 correctly clamped to +2
PASS minimap.z_clamped_low - Z=-99 correctly clamped to -2

======================================================
RESULT: 24 passed, 0 failed (exit 0)
======================================================
EXIT=0
DURATION_MS=96
```

The four checks named in `test_changes.md` (`z_switch_back_no_full_redirty`, `z_switch_keeps_offtab_changes`, `tab_samples_its_own_level`, `overlay_throttled`) are real comparisons, and they passed. `negative_coords_safe` is `check("negative_coords_safe", true, ...)`, which matches the note in `test_changes.md`.

## Done-test claims vs the suite

`tools/test_layer_render_flat.js` lists 26 `depth` checks and 12 `layers_flat` checks. Those names match `test_changes.md`. Each brief item has a real assertion:

| Brief item | Check | Assertion |
|---|---|---|
| (1) filters null, scale 1, alpha 1, no Blur/ColorMatrix, tilemap scale 1 | `flat_no_filters` | Walks the subtree; `filters` must be null or undefined; scale and alpha 1 on root, planes, entity containers; main tilemap scale 1 and no filters. Both +2 and +1 must have two bound planes. |
| (2) observed position equals the tilemap, ±0, including a 2-tile pan | `flat_position` | `dx === 0 && dy === 0` on both planes before and after the pan, and the unit sprite's global position equals the cell foot. |
| (3) crisp | `flat_crisp` | `sampled >= 1000 && foreign === 0` against the plane canvases plus the void. |
| (4) same frame as `levels:viewChanged` | `switch_same_frame` | Every recorded plane visible with `paints > 0`, no unit in the window missing a ready frame, and units A and B present on the +2 and ground switches. |
| (5) step target in that frame, drawn within `unitStepFrames`, no 60-frame wait | `unit_step_same_frame` | Target frame equals the move frame. Arrival bound in code is `unitStepFrames + 1` (`reachedAt - m.frame <= dur + 1`). |

The depth renames and folds in `test_changes.md` are present: `no_filters_any_state`, `no_blends`, `flat_transform`, `planes_cost`, `ground_draws_through_openings`, four screenshots, `hotkey_free` on `Input.keyMapper[118]`. `repaint_cost` on this machine printed a `912x720` plane, which matches the test-changes note. I did not run `--provoke`. There is no stored provocation log in the lane directory, so the "seen failing, see the report" column is not something I reproduced.

## Evidence and escalation numbers

PNG byte sizes named in `evidence/after_4da2e734/results_depth_4da2e734.txt` and `results_layers_flat_4da2e734.txt` match `git diff --stat` for those blobs (plus2_off 295297, plus2_flat 164806, plus1_off 252324, plus1_flat 180113, ground_off 89066, ground_flat 99704, minus1_off 154241, minus1_flat 160597). Minimap evidence text matches the 24/0 result I measured. The stored depth and layers_flat logs are one passing seed each. They are not what a fresh run always prints: the depth gate exited 1 on the first clone run.

`node tasks/WG.00.09b/lane-k/perf/rank_k4.js` on `baseline_f19b23bf.json` plus `stress_baseline_f19b23bf.json` (EXIT_RANK=0) and the same tool on the `5c6641e1` pair, plus direct reads of `frameMs`, `worldEventsPerFrame`, and `switches`:

Reproduced from the committed JSON (rounded the way the escalation rounds):

- Post-K4 environment inclusive 36.62 mean / 60.60 worst (claimed 36.6 / 60.6).
- Post-K4 `DEUS_World.js` self 7.90 / 15.60 (claimed 7.9 / 15.6).
- Post-K4 log self (`open`/`close`/`writeBuffer`/`writeString`/`fsync`) 1.81 / 4.24 (claimed 1.8 / 4.2).
- Post-K4 Effekseer 1.21 / 4.36 (claimed 1.2 / 4.4). GC 2.32 / 3.69 (claimed 2.3 / 3.7).
- Post-K4 `DEUS_Depth.js` self 0.361 / 0.651 (claimed 0.36 / 0.65). `DEUS_Minimap.js` self 0.03 / 0.09. Fog and DayNight self 0.00 / 0.00.
- Post-K4 `Scene_Map.updateMain` share of `updateEnvironment` is 62.6–74.4% over 12 windows (claimed 63–74).
- Post-K4 switch `requestToStartedMs` 89.8–168.5 over 12 switches (claimed 90–169). `lastSwitch.ms` 69.8–145.2 (claimed 70–145). Pre-K4 90.4–208.0 and 70.5–183.6 (claimed 90–208 and 70–184). Branch base 103.4–290.4 and 85.8–266.9 (claimed 103–290 and 86–267).
- One paused +2 frame median is 6.95 ms. GL string matches the escalation.
- Post-K4 unit counts in the four runs: 1191, 1264, 1262, 1199.

Not reproduced from those files:

| Claim in escalation.md | What the JSON measures |
|---|---|
| Rank 3, post-K4 table: hazard reflex "up to 24.5 (stress, night)" | `hazardReflexJob` is absent from the post-K4 top-60. Pre-K4 stress night run 1 is 13.987 ms. Pre-K4 worst is 25.579 ms on steady_-1 run 1, not a stress-night window. |
| Body: that reflex "is 23.0 ms" on stress night, pre-K4 run 1 | 13.987 ms in `stress_baseline_5c6641e1.json` run 1 `stress_night`. |
| Pre-K4 environment inclusive 27.6 / 48.8 | `rank_k4.js`: 27.41 mean / 41.93 worst. |
| `DEUS_Depth` "was 0.63 / 1.06" | Pre-K4 self over 12 windows: 0.756 mean / 1.323 worst. |
| Pre-K4 log self 1.5 / 3.0 | 2.20 mean / 5.22 worst. |
| `update.map.world` 4.8 mean / 8.1 worst ms per tick | Post-K4 window medians: mean 6.267, worst 16.230. |
| Wrapped `events` 2.3 mean / 4.9 worst | Post-K4 window medians: mean 2.726, worst 6.150. |
| Steady frames 30–90 ms; stress medians 108–146 ms (post-K4 paragraph) | Post-K4 steady medians include 7.14, 8.55, and 92.02. Post-K4 stress medians are 108.075, 114.465, 121.095, 139.87. 146.265 is pre-K4 stress night run 1. |
| Paused +2 tick 1.0–1.4 ms | Planes-on paused tick medians include 1.44 and 1.46. |
| Under stress, 44–48 `world:*` events per frame, 25–28 listener calls, 118 at most | Post-K4 stress medians are 32, 31, 46, 46. Listener medians 19, 18, 24, 26. Max listener calls 112, 111, 154, 158. |
| `lastPeekMs` 0.005–0.015 on post-K4 switches | Range in the 12 switches is 0.000–0.015. `lastPaintMs` is 1.675–2.905, and the text says about 2–3 ms. |
| Every run has about 1,190–1,265 units | Pre-K4 runs include 1094. |
| `lane.json` is 0 bytes in the lane worktree | `Get-Item` length and `git cat-file -s HEAD:tasks/WG.00.09b/lane-k/lane.json` are both 1018. |

## Findings

### BLOCKER

The depth gate is red on a fresh world and green on the next one. The required clone command `node tools/test_snapshot.js --name depth --plugins DEUS_Depth --suite depth` printed `RESULT: 25 passed, 1 failed (exit 1)` and EXIT=1. `depth.entities_drawn` failed: the fixture text says the stone stack was created at (77,3), the oak and the unit drew, and the +1 plane reported 0 item stacks (`ec.items >= 1` is false). The proof window was the north edge, `(66,0)`. An immediate repeat in the same clone printed `RESULT: 26 passed, 0 failed (exit 0)` and EXIT=0, with 1 item stack, on an interior window `(98,148)`. The stored evidence log is a passing seed (`results_depth_4da2e734.txt`, 26 passed). The check does not hold on every New Game the harness generates. DEC-011 flatness checks passed on the failing run.

### MAJOR

`layers_flat.every_view_sees_through` fails closed when the generated +2 view has no non-open cell in the ±7 by ±5 box around the cut. The assertion is `seesThrough && opaque`, and `opaque` is false when `solidHere` is missing. A run at this SHA exited 1 with `+2: ... no solid cell` while the open cell still drew the planes' pixel (`#08080c`). The clone run of the same command exited 0 because that world had a +2 floor cell. The brief's see-through behavior held in the failing log. The gate still depends on the seed.

`escalation.md` cites figures the committed baselines do not contain. The headline costs that `rank_k4.js` reprints (environment 36.6/60.6, world self 7.9/15.6, depth self 0.36/0.65, minimap 0.03/0.09, Fog and DayNight at 0) match. The hazard rank, the "was 0.63/1.06" depth figure, the pre-K4 log figure, `update.map.world` 4.8/8.1, events 2.3/4.9, the 30–90 ms steady band, the 146 ms stress end, and the stress event counts do not. The 0-byte `lane.json` note is not true of this worktree or of HEAD (1018 bytes).

### MINOR

The after evidence is named `4da2e734`, the parent. Commit `86bf49a926ea0ed6a546b31c94de66dd6863628d` adds those files and rewrites the `mask_order` probe in the same commit. The renderer diff between `4da2e734` and the tip is empty; the plugin diff is the probe. The stored `mask_order` line says `deck cell`. The first tip run here said `added deck cell`, which is the new probe. The screenshots still match the tip's renderer. They are not a log of the tip's `mask_order` check.

`unit_step_same_frame` allows `unitStepFrames + 1` frames (`bound 17` with a 16-frame step). The brief says within `unitStepFrames`. The clone run arrived in 16 frames. The other run at this SHA arrived in 17 and still passed.

`test_changes.md` says provocations were seen failing and points at a report. No REPORT file is in the lane directory. I did not run `--provoke`.

`preset_filters` was renamed to `no_filters_any_state`. The brief said to update that check in place. The assertion (no filters in six states) is real and is listed in `test_changes.md`.

`3a9daa0f` (the before-evidence sha) is not the branch base `8592b07a`. `git diff --stat` of `DEUS_Depth.js` and `plugins.js` between those two commits is empty, and both have 28 `t.check` calls, so the before shots are of the branch-base depth plugin.

VERDICT: FAIL
