# Grok review: WG.00.09b Lane K Fix 1 (after FAIL on 86bf49a9)

Reviewed tip, pasted from `git rev-parse HEAD origin/task/lane-k` and `git log -8 --format="%H %an %s"` in the live worktree before any review command:

```
abdb6bbefb3ae128b1647f5ef3af4b6c6e44a7f2
abdb6bbefb3ae128b1647f5ef3af4b6c6e44a7f2
abdb6bbefb3ae128b1647f5ef3af4b6c6e44a7f2 deus-claude [claude] WG.00.09b Fix1: REPORT.md (finding table, B1 reproduction, determinism and loaded runs, provocations, bench with machine load, scope)
f32d8984e85fcf267484b809761b01d8357af2d5 deus-claude [claude] WG.00.09b Fix1: test_changes.md (every changed check, rename line, step unit and bound), DEUS_Depth.md (seam, fixture scene, deterministic gates, status on eb446e06)
7e57bb4253d46c146b3e20aaf388c693a48c3408 deus-claude [claude] WG.00.09b Fix1: escalation.md regenerated from committed JSON (every figure cited by ID), citation checker, figures output
95a6ddb95fd2ef2d1f1f63b8773697c7a1ea8d74 deus-claude [claude] WG.00.09b Fix1: after evidence, determinism runs (5x each gate, 2 loaded rounds of 4 parallel runs) and provocation logs on eb446e06
7d43a9987fa66d80ee16d264ecb770c9d2e17e64 deus-claude [claude] WG.00.09b Fix1: bench baselines on the final code eb446e06 (normal x2, stress x2, machineLoad); 8dbd0bdc normal x2
eb446e068f42051253ec02a1dfb3047a073eb2c0 deus-claude [claude] WG.00.09b Fix1: bench machineLoad counts nw.exe descended from its own run as its own and lists any other with its command line
8dbd0bdc3467788b664e04064859e6a07ce1345c deus-claude [claude] WG.00.09b Fix1: items of a plane found by one query per seam piece (the per-cell lookup cost more on sparse levels); escalation figures and append-cost scripts
5fb94682958e70fd659a44d7960bf244b473f615 deus-claude [claude] WG.00.09b Fix1: bench baselines on e3896d76 with machineLoad (normal x2, stress x2)
```

HEAD equals `abdb6bbefb3ae128b1647f5ef3af4b6c6e44a7f2` and `origin/task/lane-k`. Review continued.

Commands below ran in a fresh clone (`git clone -c core.autocrlf=false` of this worktree to `%TEMP%\lanek-review-abdb6bbe`, then `git checkout --detach abdb6bbefb3ae128b1647f5ef3af4b6c6e44a7f2`). Clone confirm:

```
CHECKOUT_EXIT=0
HEAD is now at abdb6bbe [claude] WG.00.09b Fix1: REPORT.md (finding table, B1 reproduction, determinism and loaded runs, provocations, bench with machine load, scope)
abdb6bbefb3ae128b1647f5ef3af4b6c6e44a7f2
REVPARSE_EXIT=0
```

The clone was deleted afterwards (`CLONE_DELETED`).

## Scope

`git diff --name-status 8592b07aa9315c1cdd2c8d29e1a6d37d3d055deb abdb6bbefb3ae128b1647f5ef3af4b6c6e44a7f2` in the clone. DIFF_EXIT=0. 127 paths: 6 modified, 121 added. A filter for paths outside `lane.json` `allowedPaths` printed nothing (`OUTSIDE_DONE`).

| Status | Path | Inside allowedPaths |
|---|---|---|
| M | docs/systems/DEUS_Depth.md | yes |
| M | docs/systems/DEUS_Minimap.md | yes |
| M | game/js/plugins.js | yes; the whole file delta is the DEUS_Depth parameters block |
| M | game/js/plugins/DEUS_Depth.js | yes |
| M | game/js/plugins/DEUS_Minimap.js | yes |
| M | tools/test_minimap.js | yes |
| A | tools/bench_render_layers.js | yes |
| A | tools/test_layer_render_flat.js | yes |
| A | tasks/WG.00.09b/lane-k/** (119 files: BRIEF, BRIEF_FIX1, REPORT, test_changes, escalation, lane.json, determinism_runs.js, evidence, perf, launches, review_grok_86bf49a9.md) | yes |

`game/js/plugins/DEUS_Fog.js` and `game/js/plugins/DEUS_DayNight.js` are absent from the diff. `perf/rank_k4_eb446e06.txt` prints their self time as `0.00` worst / `0.00` mean over 12 windows.

`plugins.js` diff (the whole file delta), DIFF_PLUGINS_EXIT=0, DIFFSTAT_PLUGINS_EXIT=0:

```
 game/js/plugins.js | 4 +---
 1 file changed, 1 insertion(+), 3 deletions(-)
-      "Preset": "deus",
-      "MaxDepth": "2",
-      "EyeHeightFt": "140"
+      "MaxDepth": "2"
```

Renderer and tools after the code commit are unchanged. `git diff --stat eb446e068f42051253ec02a1dfb3047a073eb2c0 abdb6bbefb3ae128b1647f5ef3af4b6c6e44a7f2 -- game tools` printed nothing. DIFF_GAME_TOOLS_EXIT=0. The after-evidence folder `evidence/after_eb446e06/` therefore matches the renderer at the tip.

m5, branch-base depth code versus the before-evidence sha. `git diff --stat 3a9daa0f 8592b07aa9315c1cdd2c8d29e1a6d37d3d055deb -- game/js/plugins/DEUS_Depth.js game/js/plugins.js` printed nothing. DIFF_M5_EXIT=0.

`git cat-file -s HEAD:tasks/WG.00.09b/lane-k/lane.json` printed `949`. CAT_EXIT=0. The escalation correction quotes the prior review's measurement of 1018 bytes at `86bf49a9`, which is what `review_grok_86bf49a9.md` recorded. The 0-byte note is gone.

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

## DEC-011

In `DEUS_Depth.js` at this tip:

- `Depth.project` is `(d, sx, sy) => ({ x: sx, y: sy })`. `Depth.edgeShift` is `() => 0`.
- `Sprite_DepthPlane.updatePlane` sets `s = 1` and `this.x` / `this.y` from `unprojected`. `scale.set` applies that `s`. `REPROJECT` (0.97 or 0.80) is set only for `depth.projection_origin` and `depth.parallax_bounded`.
- `applyLook` sets `this.filters = null` and `this.alpha = 1`. The only `ColorMatrixFilter` construction is behind `INJECT_FILTER`, which is set for the filter provocations. The file has no `BlurFilter` construction.
- The plugin parameter is `MaxDepth` only. `plugins.js` matches the diff above.

The clone depth run passed `projection_origin` (centre `(408,312)`, left edge `(0,312)`, scale 1), `parallax_bounded` (edge shift 0 px, a 2-tile pan moved −96 px), `no_filters_any_state` (none in six states), `flat_transform` (scale 1, filters empty, no blur/colour filter, terrace pixel equal to its texel), `no_blends` (0 of 53504), and `crisp_nearest` (`smooth false`, `scaleMode 0`, plane at `(-24,-24)`). The clone `layers_flat` run passed `flat_position` (off by `(0,0)` before and after the pan), `flat_crisp` (0 foreign colours), and `flat_no_filters`.

## DEC-007

This review generated no art. The diff's PNG files are all under `tasks/WG.00.09b/lane-k/evidence/` (harness screenshots named by the driver `SHOT` lines). No path under `game/img/` is in the diff.

## Gate tests

Timeouts from `lane.json`: 900 s, 900 s, 300 s. Each finished well inside that.

### 1. `node tools/test_layer_render_flat.js` (clone)

RESULT line: `RESULT: all required checks passed (exit 0)`. Counts: 12 passed, 0 failed. Duration: 33875 ms. EXIT=0. World seed `329861131`. Snapshot `lanek_layers_flat_7904_1790418648303` (deleted).

```
=== DEUS_Depth suite "layers_flat" (WG.00.09b Lane K) ===
run: RESULT: 12 passed, 0 failed (exit 0) in 33.8 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat_7904_1790418648303 (deleted)
  PASS layers_flat.preconditions - world true, levels true, view 0, screen 816x624, world seed 329861131
  PASS layers_flat.fixtures - fixture scene centred at (160,160) in area (0,0), world seed 329861131: 144 columns x 5 levels (424 cell(s) written, 296 already as specified), 112 ground tile(s) set (meadow, tile 2816), 70 object(s) cleared, 3955 ms; 0 refused, 0 cell(s) not as specified; cut 6 cells from (159,159), -1 floor (159,159); unit A (157,157) +1; unit B (159,159) -1
  PASS layers_flat.flat_position - before the pan depth 1 off by (0,0), depth 2 off by (0,0); after a 2-tile pan depth 1 off by (0,0), depth 2 off by (0,0) (want 0 px); unit A drawn at (288,216) for its cell's foot (288,216)
  PASS layers_flat.flat_crisp - 52928 opaque samples of the +2 planes' tile render, 0 colour(s) not in the 59-colour source set
  PASS layers_flat.unit_step_same_frame - step (157,157) -> (158,157) in frame 109, tick 75: sprite target 158,157 set in frame 109, walk from tick 75; 9 frame(s) drawn 1..15 ticks after it, each between the cells; 3 frame(s) drawn 16+ ticks after it, each on the new cell's foot (336,216); walk frames shown: true (columns 1/2, stand 1); reported, not gated: first drawn on the new cell 16 tick(s), 16 frame update(s) after the step (bound 16 ticks); unit E outside the window at x 172, stepped to (171,160) in frame 139: sprite made in frame 139
  PASS layers_flat.scan_candidates_only - 783 unit(s) tested per frame; 783 on the planes' levels, 1271 in the world; candidate lists made 7 time(s) since boot
  PASS layers_flat.item_change_scoped - before [{"items":false,"all":false,"objects":false},{"items":false,"all":false,"objects":false}]; a stone given to unit A (held): [{"items":false,"all":false,"objects":false},{"items":false,"all":false,"objects":false}]; a stone on the ground of level 1 at (158,157): [{"items":true,"all":false,"objects":false},{"items":false,"all":false,"objects":false}]
  PASS layers_flat.every_view_sees_through - +2: open cell (159,159) draws #08080c, planes #08080c/255, planes off #000000; floor cell (164,157) unchanged (#352d24 / #352d24 planes off); planes on levels [1, 0]; +1: open cell (159,159) draws #352d24, planes #352d24/255, planes off #000000; floor cell (156,156) unchanged (#352d24 / #352d24 planes off); planes on levels [0, -1]; Ground: open cell (159,159) draws #352d24, planes #352d24/255, planes off #000000; floor cell (158,159) unchanged (#71864d / #71864d planes off); planes on levels [-1, -2]; -1: open cell (160,159) draws #35312d, planes #35312d/255, planes off #000000; solid cell (158,159) unchanged (#573a07 / #573a07 planes off); planes on levels [-2]
  PASS layers_flat.flat_no_filters - plus2: planes on levels [1, 0], flat; plus1: planes on levels [0, -1], flat
  PASS layers_flat.switch_same_frame - 0->2 (frame 78): planes 1:shown 1 paint(s), 0:shown 1 paint(s); 1 unit(s) in the window, all with a frame; 2->1 (frame 167): planes 0:shown 1 paint(s), -1:shown 1 paint(s); 1 unit(s) in the window, all with a frame; 1->0 (frame 189): planes -1:shown 1 paint(s), -2:shown 1 paint(s); 1 unit(s) in the window, all with a frame; 0->-1 (frame 217): planes -2:shown 1 paint(s); 0 unit(s) in the window, all with a frame; -1->0 (frame 245): planes -1:shown 1 paint(s), -2:shown 1 paint(s); 1 unit(s) in the window, all with a frame
  PASS layers_flat.screenshots_written - layers_flat.ground_off.png 61786 B, layers_flat.ground_flat.png 68920 B, layers_flat.minus1_off.png 114424 B, layers_flat.minus1_flat.png 117554 B
  PASS layers_flat.no_errors - none
required checks: 12/12 PASS

RESULT: all required checks passed (exit 0)
EXIT=0
DURATION_MS=33875
```

`every_view_sees_through` names a non-open reference cell on all four views (floor, floor, floor, solid), each unchanged, and each open cell matches the planes' pixel at alpha 255. `unit_step_same_frame` gates on simulation ticks with bound 16. The displayed-frame count is printed as reported.

### 2. `node tools/test_layer_render_flat.js --suite depth` (clone)

RESULT line: `RESULT: all required checks passed (exit 0)`. Counts: 27 passed, 0 failed. Duration: 36229 ms. EXIT=0. World seed `1696749759` (a different seed from gate 1 and from the seeds in `evidence/determinism_eb446e06/`). Snapshot `lanek_depth_15236_1790418846615` (deleted).

```
=== DEUS_Depth suite "depth" (WG.00.09b Lane K) ===
run: RESULT: 27 passed, 0 failed (exit 0) in 36.2 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_15236_1790418846615 (deleted)
  PASS depth.preconditions - world true, levels true, view 0, surface grid true, screen 816x624, world seed 1696749759
  PASS depth.proof_scene - fixture scene centred at (216,184) in area (0,0), world seed 1696749759: 144 columns x 5 levels (305 cell(s) written, 415 already as specified), 139 ground tile(s) set (meadow, tile 2816), 78 object(s) cleared, 3651 ms; 0 refused, 0 cell(s) not as specified; hole (211,181), deck 3 cells from (214,182)
  PASS depth.planes_present - view 2; depth 1 -> level 1, 1 paint(s), 9546 opaque samples; depth 2 -> level 0, 1 paint(s), 48160 opaque samples; last paint 3.3 ms, last peek 0.0 ms
  PASS depth.repaint_cost - 4 of 4 refreshes of one 912x720 plane repainted it by the next frame; repaint times 3.3 / 0.6 / 0.8 / 0.4 / 0.3 ms (reported, not gated: wall-clock time, this machine, nw.exe harness)
  PASS depth.projection_origin - centre -> (408,312) want (408,312); left edge -> (0,312) want (0,312) (identity, DEC-011); plane scale 1
  PASS depth.exposure_by_upper_geometry - floor cell (220,181) unchanged by the planes; open cell (213,180) shows the level below
  PASS depth.mask_order - deck cell (215,182) at screen (384,240): drawn #d89a55, depth 1 texels {#351d16 #492a19 #d89a55 #8e4d30}, ground texel under it #71864d/255
  PASS depth.depth2_through_depth1 - low ground (220,186) at screen (624,432): drawn #71864d/255, ground texel #71864d/255, ground texels {#71864d}, depth 1 alpha there 0; under the hole (211,181) the ground draws #71864d/255 (tiles 2816/0/0)
  PASS depth.entities_drawn - fixtures: oak placed at (209,180), item stone x3 at (210,181), unit added; +1 plane draws 1 object(s), 1 unit(s), 1 item stack(s), 10 wall/ramp frame(s); item sheet !$UF_Item_Stone ready true, tracked by the plane true, visible true; unit at (212,182) probed at screen (240,244): drawn (#fbdcc8 vs #35312d without units)
  PASS depth.crisp_nearest - 53504 opaque samples, 0 colour(s) not in the 62-colour source set; smooth false, baseTexture scaleMode 0 (0 nearest, 1 linear), sprite texture is the bitmap's, plane at (-24,-24)
  PASS depth.parallax_bounded - edge shift measured depth 1 0 px, depth 2 0 px (want 0); a pan of 2 tiles moved a low-ground point on depth 1 from x 624 to 528 (-96 px, want -96); the point under the centre stays at x 408; display back at 207.5 (was 207.5)
  PASS depth.tunables_take_effect - maxDepth 1 [1:1 2:-] void true; maxDepth 2 [1:1 2:0]; enabled false [1:- 2:-] void false; enabled true [1:1 2:0] void true
  PASS depth.no_filters_any_state - maxDepth 1: none; maxDepth 2: none; off: none; on: none; entities off: none; entities on: none
  PASS depth.one_level_below - maxDepth 1: depth 1 level 1, depth 2 hidden, void shown
  PASS depth.void_beyond - low ground (220,186) at screen (624,432): planes render #08080c/255, screen #08080c, void #08080c
  PASS depth.no_blends - 0 of 53504 sampled pixels are blends (want 0)
  PASS depth.flat_transform - depth 1 scale 1 at (-24,-24) filters [] entities [] alpha 1; depth 2 scale 1 at (-24,-24) filters [] entities [] alpha 1; blur/colour filters in the subtree: none; active tilemap scale 1, filters none, alpha 1; terrace pixel #352d24, its source texel #352d24/255
  PASS depth.entities_inherit_treatment - unit sprite in the +1 plane: child of the plane, world scale 1 x 1, filters on it and its 3 container(s): none; tint #ffffff (the unit's own)
  PASS depth.visual_settings_no_physics - unchanged: {"unit":{"x":212,"y":182,"z":1},"shapeUnit":"floor","shapeChain":"open","walkChain":false,"walkUnit":true,"objects":1}
  PASS depth.config_deterministic - the same after maxDepth 1 / 0 / 2 and off / on: {"describe":"2 level(s) below, drawn 1:1 (DEC-011), void #08080c","planes":[{"z":1,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]},{"z":0,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]}]}
  PASS depth.planes_cost - sampled 2 x 60 frames per condition: planes off none shown in every frame, on both bound in every frame; reported, not gated: GL renderer "ANGLE (NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0)"; median engine tick (update + render submit): planes off 1.5 ms, on 1.9 ms (the planes +0.3 ms); median frame intervals off 16, on 16 ms; worst tick off 2.4, on 7.5 ms; this machine, nw.exe harness, simulation paused
  PASS depth.screenshots_written - depth.plus2_off.png 293892 B, depth.plus2_flat.png 77817 B, depth.plus1_off.png 285741 B, depth.plus1_flat.png 120896 B
  PASS depth.ground_draws_through_openings - view 0, depth 1 -> -1, depth 2 -> -2, void shown; floor ground cell (214,183) unchanged by the planes (its own art's lowest alpha 255); open cell (217,183) over the -2 floor draws #352d24 (planes #352d24, -2 texels {#514945 #35312d #352d24}, -1 alpha 0; planes off #000000); open cell (215,183) over the -1 floor draws #352d24 (-1 texels {#514945 #35312d #352d24}; planes off #000000)
  PASS depth.entities_at_seam - view on +2 centred on (2,2), display (249.5,251.5) (wrapped); +1 plane level 1: item (1,1) drawn at (384,312); item (253,1) drawn at (192,312); item (1,253) drawn at (384,120); item (253,253) drawn at (192,120); wall face (254,4) drawn at (240,456); wall face (4,254) drawn at (528,168); unit (3,3) drawn at (480,408)
  PASS depth.canvases_freed - 4 canvas layers in use, 4 canvases made since boot, 0 destroyed, 0 pooled, after 4 level switches (want 4 / 4 / 0 / 0)
  PASS depth.hotkey_free - keyMapper[118] (F7) is undefined: the preset hotkey is gone and the key is free
  PASS depth.no_errors - none
required checks: 27/27 PASS

RESULT: all required checks passed (exit 0)
EXIT=0
DURATION_MS=36229
```

`repaint_cost` asserts that 4 of 4 refreshes repainted by the next frame. `planes_cost` asserts planes off in every off frame and both bound in every on frame. Both lines say `reported, not gated`. In `DEUS_Depth.js` those checks are `repainted.every(Boolean)` and `offAsSet && onAsSet`.

`entities_drawn` on this seed: 1 item stack, sheet ready, tracked, visible, unit drawn. `entities_at_seam`: display wrapped `(249.5,251.5)`, all four seam items, both wall faces, and the unit drawn on their cell feet.

### 3. `node tools/test_minimap.js` (clone)

RESULT line: `RESULT: 24 passed, 0 failed (exit 0)`. Counts: 24 passed, 0 failed. Duration: 48 ms. EXIT=0.

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
DURATION_MS=48
```

The four checks named in `test_changes.md` (`z_switch_back_no_full_redirty`, `z_switch_keeps_offtab_changes`, `tab_samples_its_own_level`, `overlay_throttled`) passed with the comparisons printed above.

## Prior FAIL, re-checked

### `depth.entities_drawn` (BLOCKER on 86bf49a9)

The reproduction log `evidence/b1_repro_86bf49a9/repro_b1v2_seam_interior.log` matches the report. At the seam the sheet is ready by frame +1 and the plane's query still returns 0 hits for 60 frames (`near 127.5,261.5`, window `y 246..271`, item at `(131,3,1)`). In the interior the same sheet is found at +0 and the sprite is visible at +1. That is the seam query, and the log shows the sheet being ready while the item stays untracked.

`rebuildItems` now calls `UF.Items.find` once per `windowPieces` range inside `0..size-1`, then keeps hits whose cell is inside that piece. `SEAM_FAULT` (provocation `depth.entities_at_seam`) restores the single unwrapped window. The depth suite preloads the item, tree, and unit sheets with `sheetsReady` before `I.create`, and the fixture cells are named terrace cells in `buildScene`.

This clone's depth run, seed `1696749759`, passed `entities_drawn` with 1 item stack tracked and visible, and passed `entities_at_seam` with all seven seam sprites drawn. The committed determinism logs (`evidence/determinism_eb446e06/`) show `PASS depth.entities_drawn` with 1 item stack, sheet ready, tracked, and visible on each of the 5 driver runs, each of the 5 old-command runs, and each of the 4 loaded depth runs. Those seeds differ from each other and from this review's seed. Each of those logs ends with `=== every run exited 0 ===`.

### `layers_flat.every_view_sees_through` (MAJOR on 86bf49a9)

The check now uses fixture open and reference cells. A fixture cell that is open when it must be solid, or off screen, calls `harnessStop`. The result line names the reference cell. This clone's run names four (floor `(164,157)`, floor `(156,156)`, floor `(158,159)`, solid `(158,159)`), each unchanged, with the open cell at alpha 255. The five `gate1_layers_flat_x5.log` lines and both loaded rounds do the same, on other seeds, with no `no solid cell` line.

### Escalation figures (MAJOR on 86bf49a9)

`node tasks/WG.00.09b/lane-k/perf/check_escalation_citations.js` in the clone:

```
297 figure lines; cited IDs missing: 0; numbers not found in their cited lines: 0; rank numbers skipped: 6
EXIT_CITE=0
```

The six skipped numbers are the rank column 1–6 in the summary table. The costs in that table match `perf/rank_k4_eb446e06.txt` (worst / mean): Environment 47.56 / 27.79, Objects self 44.45 / 28.37, World self 17.95 / 9.64, Colonists 15.14 / 9.49, GC 4.56 / 2.31, log 3.03 / 1.45, Effekseer 2.72 / 0.86, Depth self 0.45 / 0.27, Minimap self 0.07 / 0.02, Fog and DayNight 0.00 / 0.00.

Direct read of `runs[].machineLoad` in `perf/baseline_eb446e06.json` and `perf/stress_baseline_eb446e06.json`:

```
baseline run 1  label=quiet  cpu=3.8/16.6/34.8 n=104  workers=4->4  nw=0/0/0  end 2026-09-26T09:40:50.228Z
baseline run 2  label=quiet  cpu=1.8/14.7/38.3 n=95   workers=4->5  nw=0/0/0  end 2026-09-26T09:42:58.722Z
stress run 1    label=quiet  cpu=9.6/15.6/31.1 n=102  workers=5->5  nw=0/0/0  end 2026-09-26T09:45:20.336Z
stress run 2    label=loaded cpu=10.4/26.8/45 n=107   workers=5->5  nw=0/0/0  end 2026-09-26T09:47:40.783Z
```

Those are the four load lines in REPORT.md section 5 and in `fix1.normal.r1.load` / `fix1.stress.r2.load`. Stress run 2 is labelled `loaded` because its median CPU is 26.8%. The pre-K4 environment line is now `mean 27.41 / worst 41.93` (`preK4.A.env`). The hazard line is `mean 19.49 / worst 25.58`, worst in `normal#1:steady_-1`, with `stress#1:stress_night` at 13.99 (`preK4.A.hazard`). Depth self post-K4 is `0.36 / 0.65` (`postK4.A.depthSelf`). Those are the figures the previous review measured in the JSON, and they replace the figures that review could not find.

### Provocations (MINOR on 86bf49a9)

`tools/test_layer_render_flat.js` requires every provocable check to FAIL (`caught` is false increments `bad`, exit 1). The committed logs:

- `evidence/provoke_eb446e06/provoke_layers_flat.log`: 8 `CAUGHT` lines, each a `FAIL` of that check, then `RESULT: all required checks passed, 8 provocation(s) run (exit 0)` and `EXIT=0 DURATION_MS=155045`.
- `evidence/provoke_eb446e06/provoke_depth.log`: 16 `CAUGHT` lines, including `depth.entities_drawn` (0 item stacks) and `depth.entities_at_seam` (seam items and wall faces `NOT TRACKED`), then `RESULT: all required checks passed, 16 provocation(s) run (exit 0)` and `EXIT=0 DURATION_MS=292341`.

Those 8 and 16 names are the driver's `provocable` lists for `layers_flat` and `depth`. `test_changes.md` has the rename line: `preset_filters` → `no_filters_any_state`.

### REPORT spot checks

- Gate counts in the committed determinism logs match what this clone printed on new seeds: layers_flat 12/12, depth 27/27, minimap 24/0, each run exit 0, distinct snapshot directories.
- `evidence/after_eb446e06/results_depth_eb446e06.txt` records `entities_drawn` with 1 item stack and `entities_at_seam` with the same seven drawn positions this clone printed.
- `docs/systems/DEUS_Depth.md` paused-tick range 2.065–2.365 ms on and 1.53–1.67 ms off is the on and off subsets of `fix1.ticks.paused` in `escalation_figures_output.txt`.
- `fix1.B.depth.plane.rebuildItems.max` in that file is `largest 0.7 ms`, the figure REPORT.md cites.

## Findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

None.

VERDICT: CLEAN PASS
