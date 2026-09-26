# WG.00.09b Lane K: Fix 1 report (after Grok FAIL on 86bf49a9)

Date: 2026-09-26. Writer: Claude (Lane K). Branch `task/lane-k`.
- Brief: `BRIEF_FIX1.md`. The review is `review_grok_86bf49a9.md`, reviewed tip `86bf49a926ea0ed6a546b31c94de66dd6863628d`.
- **Code commit: `eb446e06`** (`eb446e068f42051253ec02a1dfb3047a073eb2c0`). Every gate run, the provocations, the "after"
  evidence and the final benchmark ran in fresh temp clones of this commit.
- The commits after it change only `tasks/WG.00.09b/lane-k/**` and `docs/systems/DEUS_Depth.md`.
  `git diff --stat eb446e06 HEAD -- game tools` printed nothing, EXIT=0 (run before this report was committed).
- The branch tip is the commit that adds this report; its SHA is the session's final output line.
- This report does not certify anything. The independent Grok review decides.

## 1. Findings, fixes and where the evidence is

| ID | Finding | What Fix 1 did | Evidence |
|---|---|---|---|
| **B1** | `depth.entities_drawn` red on one fresh world (0 item stacks on the +1 plane), green on the next | **Reproduced first (§2): a renderer bug, not asset timing.** On a view near the area's north edge the display origin wraps (y 255.5). The plane's item query was `UF.Items.find` around the unwrapped window centre (y 261.5), so an item at y 3 was never found. The wall window was clamped to the area, so wall faces past the seam were dropped too. Fixed in `DEUS_Depth.js`: items, walls and connectors are read in up to four window pieces inside the area (`windowPieces`). New check `entities_at_seam` with provocation `depth.entities_at_seam` (the old reads). The fixed 6-frame wait became a condition wait (item/tree/unit sheets loaded), and the fixtures are fixture-scene cells (B2) | `evidence/b1_repro_86bf49a9/`; `entities_drawn` 27/27 in all runs of §3; `entities_at_seam` caught in `evidence/provoke_eb446e06/provoke_depth.log` |
| **B2** | Suites ran on an unpinned world | Fixture route: a seed pin needs DEUS_Test.js (escalation.md E5). Both suites build one **fixture scene** explicitly, on all five levels, and verify it (`proof_scene` / `fixtures`); every probe cell is a named fixture cell. The scene holds a terrace with a hole, a summit, a deck, painted low ground and the Z-2 cut. The simulation is paused except for the unit step. Checks that read world content before, and how they read the fixture now: `test_changes.md` "Fix 1" tables | §3: 5 + 5 + 5 runs on 15 different world seeds, and 8 loaded runs on 8 more, every required check PASS |
| **M1** | `every_view_sees_through` failed closed when +2 had no non-open cell | Each view has a fixture reference cell that is not open: the +2 summit floor, a +1 terrace floor, the ground floor next to the cut, and −1 rock next to the cut. A fixture cell not as built is a `HARNESS` stop. Assertion strength kept: open cell = the planes' pixel with alpha 255; reference cell unchanged with the planes off | Every result line names 4 reference cells (e.g. `evidence/after_eb446e06/results_layers_flat_eb446e06.txt`); caught under `depth.every_view_sees_through` |
| **M2** | escalation.md cited figures not in the committed data, and a false 0-byte lane.json note | Rewritten. Every figure is printed by `perf/escalation_figures.js` from committed JSON and cited by ID (file, field, phase/run, rounding). `perf/check_escalation_citations.js` checks every cited ID and number (§6). The lane.json note is replaced by a correction. The old K3/K4 baselines are labelled "taken under contention, load not recorded (pre-Fix 1)" | escalation.md; `perf/escalation_figures_output.txt`; checker output in §6 |
| **m1** | After evidence named `4da2e734` but added with a probe change | Regenerated on the code commit, in `evidence/after_eb446e06/`. The evidence commit changes nothing under game/ or tools/. The old `after_4da2e734/` is kept as history | §7; `git diff --stat eb446e06 HEAD -- game tools` empty |
| **m2** | `unit_step_same_frame` allowed `unitStepFrames + 1` displayed frames | Judged on the simulation clock (`UF.World._frame`, the clock the walk uses), with bound `unitStepFrames` ticks and no +1. Every frame 1..15 ticks after the step is between the cells; every frame 16+ ticks after it is on the new cell. The target is set in the step's frame, and the walk starts on the step's tick. The displayed-frame count is printed, not gated | `test_changes.md` (unit and bound); e.g. "7 frame(s) drawn 1..15 ticks after it, each between the cells; 2 frame(s) drawn 16+ ticks after it" in the after evidence |
| **m3** | Provocations claimed, no report | This report. Both `--provoke` runs on eb446e06 with raw logs | §4, `evidence/provoke_eb446e06/` |
| **m4** | `preset_filters` renamed without a record | Name kept, rename recorded with its reason | `test_changes.md` "Renames (m4)" |
| **m5** | Before evidence at `3a9daa0f`, not the branch base | Diff below | §6 |
| **P1** | `repaint_cost` / `planes_cost` gated on wall-clock time | Both print their milliseconds as "(reported, not gated)". Gated only on non-timing facts: each refresh repainted the plane by the next frame; in every sampled frame the planes were off or on as set | `grep` in §6 |
| **P2** | Fixed snapshot folders | `tools/test_layer_render_flat.js` uses `%TEMP%\uf_snapshots\lanek_<suite>_<pid>_<time>`, prints it and deletes it (`--keep` keeps it). `lane.json` gate 2 is now `node tools/test_layer_render_flat.js --suite depth`: the same suite, the same 27 required checks. The old command still passes, but its fixed folder is a hazard I can't fix (tools/test_snapshot.js is outside the lane) | §3: 2 rounds of 4 gate runs started together from two clones, all exit 0, 4 different folders each round |
| **P3** | Benchmark taken under contention, no load data | `machineLoad` on every run (CPU per phase and overall, AI workers, other nw.exe, label), a 30 s `--load-probe` before each run, reruns normal ×2 and stress ×2 on eb446e06 | §5 |

## 2. B1 reproduction (on 86bf49a9, before any fix)
Temp clone of 86bf49a9 with two scratch additions (not committed as code; the instrumentation is kept in
`evidence/b1_repro_86bf49a9/`):
- per-frame `TRACE` lines in the depth suite after `I.create`;
- a scratch suite `b1_repro` that puts a stone stack on +1 near the north seam and one in the interior, seen from +2, and
  traces for 60 frames: the sheet's `isReady()`, whether the plane's own item query finds it, whether it is tracked, and
  whether its sprite is visible.

Load at the start of the runs: `cpu=65 workers=7 nw=0`, `cpu=57 workers=7 nw=0`, `cpu=62 workers=7 nw=0`, `cpu=6 workers=7 nw=0`.

- **Depth suite, natural world, first run in the fresh clone** (`repro_depth_1.log`, EXIT=0, 49407 ms): the item sheet was
  not ready before `I.create`, was ready one displayed frame later, and the item was drawn from then on. The check reads
  the counts 28 updates later. Asset timing does not explain a 0.
  ```
  TRACE b1 world seed 2034507779; proof window (146,172) centre (154,178); item sheet !$UF_Item_Stone ready before I.create: false
  TRACE b1 after I.create +0 frame 136 world 129: item sheet !$UF_Item_Stone ready false; rebuildItems query finds it true (near 153.5,177.5 radius 19.3, 1 hit(s)); tracked false; visible -; ...
  TRACE b1 after I.create +1 frame 138 world 131: item sheet !$UF_Item_Stone ready true; rebuildItems query finds it true (...); tracked true; visible true; ...
  TRACE b1 at the check +0 frame 164 world 157: ... tracked true; visible true; ...
  ```
- **Seam vs interior** (`repro_b1v2_*.log`, one world per run; the view passes through the ground between cases). The
  first `repro_b1_*.log` pair did not move the camera for its second case (re-requesting +2 doesn't recentre), so only the
  first case of each of those logs is valid.
  ```
  ORDER=seam,interior EXIT=1 DURATION_MS=44183
  TRACE b1r seam: view centre (128,6), display (119.5,255.5); +1 shape at the item cell floor; sheet !$UF_Item_Stone ready before I.create false
  TRACE b1r seam +1 frame 82: sheet ready true; rebuildItems query finds it false (0 hit(s), near 127.5,261.5); tracked false; visible -; plane level 1; window y 246..271; item (131,3,1)
  TRACE b1r seam +60 frame 182: sheet ready true; rebuildItems query finds it false (0 hit(s), near 127.5,261.5); tracked false; ...
  FAIL b1_repro.seam_item_drawn - item stone x3 at (131,3,+1), view centre (128,6): sheet ready at +1, found by the plane's query at +-1, sprite visible at +-1 frame(s) (-1: never in 60)
  PASS b1_repro.interior_item_drawn - item stone x3 at (131,125,+1), view centre (128,128): sheet ready at +0, found by the plane's query at +0, sprite visible at +1 frame(s) (-1: never in 60)
  ORDER=interior,seam EXIT=1 DURATION_MS=32337
  PASS b1_repro.interior_item_drawn - ... sheet ready at +1, found by the plane's query at +0, sprite visible at +1 frame(s)
  FAIL b1_repro.seam_item_drawn - ... sheet ready at +0, found by the plane's query at +-1, sprite visible at +-1 frame(s) (-1: never in 60)
  ```
- **Result: an edge/seam renderer bug.**
  - At the seam the item is never found, with a cold or a warm sheet.
  - In the interior it is drawn one frame after creation, even with a cold sheet.
  - The review's failing world had its proof window at (66,0), so the view was centred at y 6: this geometry.
- **Fix:** see B1 above.
- **A cost found on the way:** a first fix looked the items up per window cell (code e3896d76). Its `rebuildItems` peaked
  at 4.56 ms in one tick [fix1a.B.depth.plane.rebuildItems.max]. It became one `UF.Items.find` per window piece: 0.7 ms
  largest [fix1.B.depth.plane.rebuildItems.max], against 0.6 post-K4 [postK4.B.depth.plane.rebuildItems.max]. The IDs
  are lines of `perf/escalation_figures_output.txt`.

## 3. Determinism runs (section 3.4), fresh clones of eb446e06
Runner: `node tasks/WG.00.09b/lane-k/determinism_runs.js`. Before each run it samples the whole machine's CPU for 3 s
(os.cpus() deltas), counts the AI workers (PM filter; this session counts as 1) and counts nw.exe. It keeps the raw output.
Logs: `evidence/determinism_eb446e06/`. The lines below are the runner's own summary lines, copied.

**Gate 1, `node tools/test_layer_render_flat.js`, 5 consecutive runs** (`gate1_layers_flat_x5.log`):
```
RUN 1 | ... | load at start: CPU 27.3 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=31487 | RESULT: all required checks passed (exit 0) | required checks: 12/12 PASS | passed 12, failed 0 | world seed 113731977
RUN 2 | ... | load at start: CPU 18 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=29666 | RESULT: all required checks passed (exit 0) | required checks: 12/12 PASS | passed 12, failed 0 | world seed 1451709876
RUN 3 | ... | load at start: CPU 15 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=40195 | RESULT: all required checks passed (exit 0) | required checks: 12/12 PASS | passed 12, failed 0 | world seed 803063961
RUN 4 | ... | load at start: CPU 16.9 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=32255 | RESULT: all required checks passed (exit 0) | required checks: 12/12 PASS | passed 12, failed 0 | world seed 1931391504
RUN 5 | ... | load at start: CPU 15.1 % (3 s), AI workers 4, nw.exe 0 | EXIT=0 DURATION_MS=32390 | RESULT: all required checks passed (exit 0) | required checks: 12/12 PASS | passed 12, failed 0 | world seed 1047224077
=== every run exited 0 ===
```
**Gate 2 (new), `node tools/test_layer_render_flat.js --suite depth`, 5 consecutive runs** (`gate2_depth_driver_x5.log`):
```
RUN 1 | ... | load at start: CPU 18.9 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=35734 | RESULT: all required checks passed (exit 0) | required checks: 27/27 PASS | passed 27, failed 0 | world seed 879647546
RUN 2 | ... | load at start: CPU 4 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=37480 | RESULT: all required checks passed (exit 0) | required checks: 27/27 PASS | passed 27, failed 0 | world seed 1353914113
RUN 3 | ... | load at start: CPU 10 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=33998 | RESULT: all required checks passed (exit 0) | required checks: 27/27 PASS | passed 27, failed 0 | world seed 859954249
RUN 4 | ... | load at start: CPU 14.4 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=33852 | RESULT: all required checks passed (exit 0) | required checks: 27/27 PASS | passed 27, failed 0 | world seed 1519803009
RUN 5 | ... | load at start: CPU 12 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=39874 | RESULT: all required checks passed (exit 0) | required checks: 27/27 PASS | passed 27, failed 0 | world seed 161246641
=== every run exited 0 ===
```
**Gate 2 (old command), `node tools/test_snapshot.js --name depth --plugins DEUS_Depth --suite depth`, 5 consecutive runs** (`gate2_old_test_snapshot_depth_x5.log`):
```
RUN 1 | ... | load at start: CPU 4.8 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=40161 | RESULT: 27 passed, 0 failed (exit 0) | passed 27, failed 0 | world seed 678103549
RUN 2 | ... | load at start: CPU 11.6 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=37750 | RESULT: 27 passed, 0 failed (exit 0) | passed 27, failed 0 | world seed 1268678319
RUN 3 | ... | load at start: CPU 6.7 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=33118 | RESULT: 27 passed, 0 failed (exit 0) | passed 27, failed 0 | world seed 2295247
RUN 4 | ... | load at start: CPU 5.7 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=30769 | RESULT: 27 passed, 0 failed (exit 0) | passed 27, failed 0 | world seed 1097967592
RUN 5 | ... | load at start: CPU 8.6 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=35563 | RESULT: 27 passed, 0 failed (exit 0) | passed 27, failed 0 | world seed 833941871
=== every run exited 0 ===
```
**Gate 3, `node tools/test_minimap.js`, 5 consecutive runs** (`gate3_minimap_x5.log`):
```
RUN 1 | node tools/test_minimap.js | load at start: CPU 4.3 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=61 | RESULT: 24 passed, 0 failed (exit 0) | passed 24, failed 0
RUN 2 | node tools/test_minimap.js | load at start: CPU 4.2 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=45 | RESULT: 24 passed, 0 failed (exit 0) | passed 24, failed 0
RUN 3 | node tools/test_minimap.js | load at start: CPU 3.4 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=45 | RESULT: 24 passed, 0 failed (exit 0) | passed 24, failed 0
RUN 4 | node tools/test_minimap.js | load at start: CPU 4.1 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=46 | RESULT: 24 passed, 0 failed (exit 0) | passed 24, failed 0
RUN 5 | node tools/test_minimap.js | load at start: CPU 4.1 % (3 s), AI workers 5, nw.exe 0 | EXIT=0 DURATION_MS=45 | RESULT: 24 passed, 0 failed (exit 0) | passed 24, failed 0
=== every run exited 0 ===
```
**Loaded runs, P2.** In each round, four gate runs started at the same moment from two clones (det1 and det2): layers_flat
in both and depth in both. The CPU was sampled every second while they ran (`loaded_round1_4_parallel.log`,
`loaded_round2_4_parallel.log`):
```
CPU while the 4 command(s) ran: min 15.7 / median 44.9 / max 82.2 % over 49 1-s samples
RUN P1 | node ...lanek-fix1-eb446e06-det1\tools\test_layer_render_flat.js | ... | EXIT=0 DURATION_MS=50147 | ... | required checks: 12/12 PASS | ... | world seed 50556632
RUN P2 | node ...lanek-fix1-eb446e06-det2\tools\test_layer_render_flat.js | ... | EXIT=0 DURATION_MS=42903 | ... | required checks: 12/12 PASS | ... | world seed 262651326
RUN P3 | node ...lanek-fix1-eb446e06-det1\tools\test_layer_render_flat.js --suite depth | ... | EXIT=0 DURATION_MS=49172 | ... | required checks: 27/27 PASS | ... | world seed 822471539
RUN P4 | node ...lanek-fix1-eb446e06-det2\tools\test_layer_render_flat.js --suite depth | ... | EXIT=0 DURATION_MS=40594 | ... | required checks: 27/27 PASS | ... | world seed 1117155383
=== every run exited 0 ===
CPU while the 4 command(s) ran: min 5.5 / median 48.4 / max 84 % over 46 1-s samples
RUN P1 | ...det1\tools\test_layer_render_flat.js | ... | EXIT=0 DURATION_MS=34439 | ... | required checks: 12/12 PASS | ... | world seed 395830690
RUN P2 | ...det2\tools\test_layer_render_flat.js | ... | EXIT=0 DURATION_MS=38194 | ... | required checks: 12/12 PASS | ... | world seed 354868336
RUN P3 | ...det1\tools\test_layer_render_flat.js --suite depth | ... | EXIT=0 DURATION_MS=43286 | ... | required checks: 27/27 PASS | ... | world seed 523682778
RUN P4 | ...det2\tools\test_layer_render_flat.js --suite depth | ... | EXIT=0 DURATION_MS=47155 | ... | required checks: 27/27 PASS | ... | world seed 2140790266
=== every run exited 0 ===
```
Each concurrent run had its own snapshot folder, printed and deleted. From the driver output in those logs:
```
run: RESULT: 12 passed, 0 failed (exit 0) in 50.1 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat_26584_1790416777141 (deleted)
run: RESULT: 12 passed, 0 failed (exit 0) in 42.8 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat_26212_1790416777147 (deleted)
run: RESULT: 27 passed, 0 failed (exit 0) in 49.1 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24736_1790416777153 (deleted)
run: RESULT: 27 passed, 0 failed (exit 0) in 40.5 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_10656_1790416777156 (deleted)
```
The old gate-2 command was not run concurrently: its fixed folder would collide (escalation.md E5).

## 4. Provocations (m3), fresh clone of eb446e06, `--jobs 3`
`node tools/test_layer_render_flat.js --provoke --jobs 3`: EXIT=0, DURATION_MS=155045 (`evidence/provoke_eb446e06/provoke_layers_flat.log`). Trimmed:
```
required checks: 12/12 PASS
CAUGHT depth.flat_no_filters: FAIL layers_flat.flat_no_filters - plus2: planes on levels [1, 0], Container filters [ColorMatrixFilter]; ...
CAUGHT depth.flat_position: FAIL layers_flat.flat_position - before the pan depth 1 off by (1,0), depth 2 off by (1,0); ...
CAUGHT depth.flat_crisp: FAIL layers_flat.flat_crisp - 53504 opaque samples of the +2 planes' tile render, 14835 colour(s) not in the 71-colour source set, ...
CAUGHT depth.switch_same_frame: FAIL layers_flat.switch_same_frame - 0->2 (frame 70): ...; 1 unit(s) in the window, WITHOUT a frame: TEST_flat_A#5504@1; ...
CAUGHT depth.unit_step_same_frame: FAIL layers_flat.unit_step_same_frame - step (173,173) -> (174,173) in frame 110, tick 76: sprite target 173,173 set in frame 73, walk from tick -Infinity; ...
CAUGHT depth.every_view_sees_through: FAIL layers_flat.every_view_sees_through - ...
CAUGHT depth.scan_candidates_only: FAIL layers_flat.scan_candidates_only - 1195 unit(s) tested per frame; 707 on the planes' levels, 1195 in the world; ...
CAUGHT depth.item_change_scoped: FAIL layers_flat.item_change_scoped - ... a stone given to unit A (held): [{"items":false,"all":true,...
RESULT: all required checks passed, 8 provocation(s) run (exit 0)
```
`node tools/test_layer_render_flat.js --suite depth --provoke --jobs 3`: EXIT=0, DURATION_MS=292341 (`provoke_depth.log`). Trimmed:
```
required checks: 27/27 PASS
CAUGHT depth.planes_present: FAIL depth.planes_present - view 2; depth 1 -> none; depth 2 -> none; ...
CAUGHT depth.projection_origin: FAIL depth.projection_origin - centre -> (408.03999999999996,311.92) want (408,312); left edge -> (12.280000000000001,311.92) want (0,312) ...
CAUGHT depth.exposure_by_upper_geometry: FAIL depth.exposure_by_upper_geometry - floor cell (180,189) CHANGED by the planes; open cell (173,188) shows the level below ...
CAUGHT depth.mask_order: FAIL depth.mask_order - deck cell (207,166) at screen (384,240): drawn #71864d, depth 1 texels {#351d16 #492a19 #d89a55 #8e4d30}, ground texel under it #71864d/255 ...
CAUGHT depth.depth2_through_depth1: FAIL depth.depth2_through_depth1 - low ground (188,186) at screen (624,432): drawn #000000/255, ... depth 1 alpha there 255; ...
CAUGHT depth.entities_drawn: FAIL depth.entities_drawn - ... +1 plane draws 0 object(s), 0 unit(s), 0 item stack(s), 0 wall/ramp frame(s); ...
CAUGHT depth.crisp_nearest: FAIL depth.crisp_nearest - 53504 opaque samples, 12026 colour(s) not in the 65-colour source set, ...
CAUGHT depth.parallax_bounded: FAIL depth.parallax_bounded - edge shift measured depth 1 81.2 px, depth 2 81.2 px (want 0); ...
CAUGHT depth.no_filters_any_state: FAIL depth.no_filters_any_state - maxDepth 1: Container[ColorMatrixFilter], ...
CAUGHT depth.void_beyond: FAIL depth.void_beyond - low ground (188,186) at screen (624,432): planes render #000000/0, screen #a3effc, void #08080c ...
CAUGHT depth.no_blends: FAIL depth.no_blends - 9923 of 53504 sampled pixels are blends (want 0), ...
CAUGHT depth.flat_transform: FAIL depth.flat_transform - depth 1 scale 1 at (-24,-24) filters [] entities [ColorMatrixFilter] alpha 1; ...
CAUGHT depth.entities_inherit_treatment: FAIL depth.entities_inherit_treatment - ... filters on it and its 3 container(s): Container[ColorMatrixFilter]; ...
CAUGHT depth.ground_draws_through_openings: FAIL depth.ground_draws_through_openings - view 0: depth 1 none, depth 2 none ...
CAUGHT depth.entities_at_seam: FAIL depth.entities_at_seam - view on +2 centred on (2,2), display (249.5,251.5) (wrapped); +1 plane level 1: item (1,1) NOT TRACKED; item (253,1) NOT TRACKED; item (1,253) NOT TRACKED; item (253,253) drawn at (192,120); wall face (254,4) NOT TRACKED; wall face (4,254) NOT TRACKED; unit (3,3) drawn at (480,408)
CAUGHT depth.canvases_freed: FAIL depth.canvases_freed - 4 canvas layers in use, 20 canvases made since boot, 16 destroyed, 0 pooled, after 4 level switches (want 4 / 4 / 0 / 0) ...
RESULT: all required checks passed, 16 provocation(s) run (exit 0)
```
`--jobs 3` runs three provocations at the same time, each in its own folder, so the whole suite fits in one foreground
command. The brief's command without `--jobs` runs the same provocations one after another.

## 5. Benchmark rerun with machine load (P3), fresh clone of eb446e06
- **Procedure.** Before each run: `node tools/bench_render_layers.js --load-probe --log <file>` (30 s of CPU samples, the
  other nw.exe; wait and poll if loaded). All four probes were quiet at once. Then one run:
  `--scenario normal|stress --runs 1 [--append] --pre-log <file>`.
- **Files.** `perf/baseline_eb446e06.json` and `perf/stress_baseline_eb446e06.json` (2 runs each). Console logs and probe
  logs are in `perf/logs_eb446e06/`.
- **Machine load** (from `perf/escalation_figures_output.txt`, which reads `runs[].machineLoad`):
  ```
  fix1.normal.r1.load  quiet;  CPU min/median/max 3.8/16.6/34.8 % (104 1-s samples); AI workers 4 start, 4 end; other nw.exe 0 start, max 0, 0 end; 2026-09-26T09:39:04.711Z to 2026-09-26T09:40:50.228Z; pre-run probe: 4.5 % median over 30 s, other nw.exe 0/0, quiet
  fix1.normal.r2.load  quiet;  CPU min/median/max 1.8/14.7/38.3 % (95 1-s samples); AI workers 4 start, 5 end; other nw.exe 0 start, max 0, 0 end; 2026-09-26T09:41:21.911Z to 2026-09-26T09:42:58.722Z; pre-run probe: 3.9 % median over 29 s, other nw.exe 0/0, quiet
  fix1.stress.r1.load  quiet;  CPU min/median/max 9.6/15.6/31.1 % (102 1-s samples); AI workers 5 start, 5 end; other nw.exe 0 start, max 0, 0 end; 2026-09-26T09:43:37.054Z to 2026-09-26T09:45:20.336Z; pre-run probe: 3 % median over 30 s, other nw.exe 0/0, quiet
  fix1.stress.r2.load  loaded; CPU min/median/max 10.4/26.8/45 % (107 1-s samples); AI workers 5 start, 5 end; other nw.exe 0 start, max 0, 0 end; 2026-09-26T09:45:51.983Z to 2026-09-26T09:47:40.783Z; pre-run probe: 3.4 % median over 30 s, other nw.exe 0/0, quiet
  ```
- **Stress (0019-T: median, p95, worst, fps)**, copied from `perf/logs_eb446e06/bench_stress_*.log` (the per-phase CPU
  min/median/max at the end):
  ```
  run 1 stress_day_30s    frame median  72.375 p95 200.025 worst 390.425 ms (13.817 fps at the median)  tick 68.735 ms  draws 159  CPU 10.9/15.5/28.1 %
  run 1 stress_night_30s  frame median  93.215 p95 217.875 worst 389.935 ms (10.728 fps at the median)  tick 89.595 ms  draws 156  CPU 10.4/13.4/23.9 %
  run 2 stress_day_30s    frame median   92.63 p95 258.805 worst  483.88 ms (10.796 fps at the median)  tick 87.72 ms   draws 182  CPU 12.4/27/43.5 %
  run 2 stress_night_30s  frame median   108.7 p95 260.715 worst  379.79 ms (9.2 fps at the median)    tick 104.205 ms draws 183  CPU 19.9/26.9/35.9 %
  ```
- **Normal, steady views**, copied from `perf/logs_eb446e06/bench_normal_*.log`:
  ```
  run 1 steady_+2      frame median 16.105 p95  93.405 worst 172.24  ms  tick 14.17 ms   CPU 9.1/10.6/16.2 %
  run 1 steady_+1      frame median  52.77 p95  171.35 worst 297.625 ms  tick 50 ms      CPU 10.8/13/22.1 %
  run 1 steady_Ground  frame median  75.49 p95 185.675 worst 375.515 ms  tick 70.37 ms   CPU 16.6/22.4/30.3 %
  run 1 steady_-1      frame median 94.975 p95 348.475 worst 552.825 ms  tick 92.725 ms  CPU 12.8/22.5/29.5 %
  run 2 steady_+2      frame median  16.16 p95 155.825 worst 327.875 ms  tick 12.665 ms  CPU 10.8/11.8/15.7 %
  run 2 steady_+1      frame median 47.555 p95 177.315 worst  358.17 ms  tick 48.06 ms   CPU 10.6/16.1/27.7 %
  run 2 steady_Ground  frame median 58.025 p95 169.765 worst  298.52 ms  tick 52.83 ms   CPU 8.1/10.4/13.8 %
  run 2 steady_-1      frame median 90.975 p95  220.22 worst 297.165 ms  tick 82.68 ms   CPU 10.9/14.3/33.2 %
  ```
  With the simulation paused, the +2 frame is 15.495–15.67 ms and the tick 1.53–2.365 ms [fix1.frames.paused]
  [fix1.ticks.paused]. The display ran at a different refresh rate than in the pre-Fix 1 runs, where the paused frame was
  6.94–6.95 ms; see escalation.md.
- **K4 ranking rerun on the new baselines.** The full output is in `perf/rank_k4_eb446e06.txt` (EXIT=0). Section A:
  ```
      47.56 worst   27.79 mean (12 windows)  Environment wetness/thermal -> Floors.isRoofed/roomAt/computeRoom -> Objects.atIn  [DEUS_Environment + DEUS_Floors + DEUS_Objects (forbidden)]
      44.45 worst   28.37 mean (12 windows)  DEUS_Objects.js self  [DEUS_Objects (forbidden)]
      17.95 worst    9.64 mean (12 windows)  DEUS_World.js self  [DEUS_World (forbidden)]
      15.14 worst    9.49 mean (7 windows)  Colonists scan/decide  [DEUS_Colonists (forbidden)]
      11.20 worst   11.20 mean (1 windows)    of which hazard reflex -> Jobs.safeCellNear -> standableIn -> World.walkable  [...]
       4.97 worst    2.81 mean (12 windows)  DEUS_Floors.js self  [DEUS_Floors (forbidden)]
       4.56 worst    2.31 mean (12 windows)  Garbage collector  [(engine)]
       3.03 worst    1.45 mean (12 windows)  Synchronous log writes (...)  [DEUS_Core (forbidden)]
       2.72 worst    0.86 mean (12 windows)  Effekseer (wasm)  [RMMZ libs (read-only)]
       2.33 worst    1.23 mean (12 windows)  DEUS_Jobs.js self  [DEUS_Jobs (forbidden)]
       1.64 worst    0.72 mean (12 windows)  pixi.js self  [PIXI (read-only)]
       0.45 worst    0.27 mean (12 windows)  DEUS_Depth.js self  [DEUS_Depth (lane K)]
       0.07 worst    0.02 mean (12 windows)  DEUS_Minimap.js self  [DEUS_Minimap (lane K)]
      (n/a) worst   (n/a) mean (0 windows)  World.update (unit stepping, paths)  [DEUS_World (forbidden)]
       0.00 worst    0.00 mean (12 windows)  DEUS_Fog.js self  [DEUS_Fog (lane K, only if ranked)]
       0.00 worst    0.00 mean (12 windows)  DEUS_DayNight.js self  [DEUS_DayNight (lane K, only if ranked)]
  ```
- **Did the ranking change?**
  - The top four rows (Environment, DEUS_Objects self, DEUS_World self, Colonists) are in the same order as the post-K4
    ranking of `*_f19b23bf.json`. That older data was taken under contention, with no load record.
  - The garbage collector moved above the log writes (4.56 vs 3.03 worst).
  - The intermediate e3896d76 data put Colonists first.
  - What did not change: every top row is outside Lane K, and DEUS_Fog and DEUS_DayNight are 0.00. The K4 rule still says
    don't touch them.
- **Other benchmark files** (kept, labelled in escalation.md):
  - `*_e3896d76.json` and `baseline_8dbd0bdc.json` are intermediate Fix 1 code.
  - The first runs of both carry a `loaded` label: one other nw.exe was seen at one 15 s check (PID 18596 in 8dbd0bdc
    run 1). That tool version could not tell whether it was a helper process of the run's own nw.exe.
  - The final tool counts nw.exe processes descended from its own nw.exe as its own, and lists any other with its command
    line. None was seen in the final four runs.
  - The old K3/K4 baselines are "taken under contention, load not recorded (pre-Fix 1)".

## 6. Syntax, scope, m5, P1 grep, citations
- **Syntax**, `node --check` on every changed .js (and the lane's scripts):
  ```
  node --check game/js/plugins/DEUS_Depth.js EXIT=0
  node --check game/js/plugins.js EXIT=0
  node --check game/js/plugins/DEUS_Minimap.js EXIT=0
  node --check tools/test_layer_render_flat.js EXIT=0
  node --check tools/bench_render_layers.js EXIT=0
  node --check tools/test_minimap.js EXIT=0
  node --check tasks/WG.00.09b/lane-k/determinism_runs.js EXIT=0
  node --check tasks/WG.00.09b/lane-k/perf/escalation_figures.js EXIT=0
  node --check tasks/WG.00.09b/lane-k/perf/append_cost.js EXIT=0
  node --check tasks/WG.00.09b/lane-k/perf/check_escalation_citations.js EXIT=0
  node --check tasks/WG.00.09b/lane-k/perf/rank_k4.js EXIT=0
  node --check tasks/WG.00.09b/lane-k/perf/compare_k4.js EXIT=0
  ```
- **Scope.** `git diff --name-status 8592b07aa9315c1cdd2c8d29e1a6d37d3d055deb HEAD`, EXIT=0, run before this report was
  committed. This report (`tasks/WG.00.09b/lane-k/REPORT.md`) and `perf/rank_k4_eb446e06.txt` are added after it. The
  paths under `evidence/`, `perf/` and `launches/` are counted, not listed:
  ```
        1 A	tasks/WG.00.09b/lane-k/BRIEF.md
        1 A	tasks/WG.00.09b/lane-k/BRIEF_FIX1.md
        1 A	tasks/WG.00.09b/lane-k/determinism_runs.js
        1 A	tasks/WG.00.09b/lane-k/escalation.md
       69 A	tasks/WG.00.09b/lane-k/evidence/...
        1 A	tasks/WG.00.09b/lane-k/lane.json
        3 A	tasks/WG.00.09b/lane-k/launches/...
       38 A	tasks/WG.00.09b/lane-k/perf/...
        1 A	tasks/WG.00.09b/lane-k/review_grok_86bf49a9.md
        1 A	tasks/WG.00.09b/lane-k/test_changes.md
        1 A	tools/bench_render_layers.js
        1 A	tools/test_layer_render_flat.js
        1 M	docs/systems/DEUS_Depth.md
        1 M	docs/systems/DEUS_Minimap.md
        1 M	game/js/plugins.js
        1 M	game/js/plugins/DEUS_Depth.js
        1 M	game/js/plugins/DEUS_Minimap.js
        1 M	tools/test_minimap.js
  ```
  - Every path is inside the allowed paths.
  - `plugins.js` still differs from the base only in the DEUS_Depth parameters (`{"MaxDepth": "2"}`, unchanged since K1).
  - `DEUS_Fog.js` / `DEUS_DayNight.js` are not touched.
  - `review_grok_86bf49a9.md` is not edited: `git diff --stat 423c7754 HEAD -- tasks/WG.00.09b/lane-k/review_grok_86bf49a9.md`
    printed nothing, EXIT=0.
- **m5.** The before shots (3a9daa0f) show branch-base depth code:
  ```
  $ git diff --stat 3a9daa0f 8592b07a -- game/js/plugins/DEUS_Depth.js game/js/plugins.js
  EXIT=0
  ```
  (No output: no difference in those files.)
- **P1.** Neither `repaint_cost` nor `planes_cost` compares elapsed time to a bound. Their assertions are
  `repainted.every(Boolean)` and `offAsSet && onAsSet`; their detail strings say "reported, not gated".
  `grep -n "< 16\|bound 8\|dPlanes <\|worstPaint" game/js/plugins/DEUS_Depth.js` finds only colour bit-shifts:
  ```
  1561:            const colorsOf = bmp => { ... set.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); return set; };
  1570:                    const c = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
  1909:            const colorsOf = bmp => { ... set.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); return set; };
  1920:                const c = (rd[i] << 16) | (rd[i + 1] << 8) | rd[i + 2];
  ```
  `performance.now()` feeds only `stats.*Ms`, the fixture's `ms` and the printed `planes_cost` numbers.
- **M2 citations.** `node tasks/WG.00.09b/lane-k/perf/check_escalation_citations.js`:
  ```
  297 figure lines; cited IDs missing: 0; numbers not found in their cited lines: 0; rank numbers skipped: 6
  ```
  EXIT=0.

## 7. What changed
- `game/js/plugins/DEUS_Depth.js`:
  - **Renderer (B1):** item, wall and connector reads split at the loop seam (`seamRanges`, `windowPieces`); items with one
    `UF.Items.find` per piece; provocation `entities_at_seam`.
  - `preloadsPending()` added to the API (a condition for the checks).
  - **Checks:** the fixture scene (`buildScene`, `sceneCentre`, `SCENE_*`), `harnessStop` / `need` / `sheetsReady`
    condition waits, and a paused simulation. Every check reads fixture cells. `repaint_cost` and `planes_cost` are
    report-only for time. `unit_step_same_frame` is judged in ticks. `every_view_sees_through` has reference cells on
    every view. New `entities_at_seam`. The world seed is printed.
- `tools/test_layer_render_flat.js`: a snapshot folder per run, printed and deleted (`--keep`); `--jobs n` for
  provocations; `HARNESS` lines and a stopped suite give exit 2; `entities_at_seam` required and provocable.
- `tools/bench_render_layers.js`: the `machineLoad` block on every run, per-phase wall spans, the `--load-probe` pre-run
  wait, `--append`, `--pre-log`, a snapshot folder per run (deleted), and nw.exe of the run's own process tree counted as
  its own.
- `tasks/WG.00.09b/lane-k/`:
  - `lane.json`: gate 2 → `node tools/test_layer_render_flat.js --suite depth`.
  - Docs: `escalation.md` (rewritten, M2), `test_changes.md` (Fix 1 tables, rename line), `REPORT.md` (this file).
  - Scripts: `determinism_runs.js`; `perf/escalation_figures.js`, `perf/check_escalation_citations.js`, `perf/append_cost.js`.
  - Data: `perf/append_cost.json`, `perf/*_eb446e06.json`, `perf/*_e3896d76.json`, `perf/baseline_8dbd0bdc.json`, the
    `perf/logs_*` folders, `perf/rank_k4_eb446e06.txt`, `perf/escalation_figures_output.txt`.
  - Evidence: `evidence/b1_repro_86bf49a9/`, `evidence/after_eb446e06/`, `evidence/determinism_eb446e06/`,
    `evidence/provoke_eb446e06/`.
- `docs/systems/DEUS_Depth.md`: the seam, items per piece, the fixture scene, deterministic gates, the commands, and
  status on eb446e06.

## 8. Evidence: the screenshots (all opened; `evidence/after_eb446e06/`, fixture scene of eb446e06)
- `depth.plus2_off_eb446e06.png`: +2 with the planes off. The sky parallax fills the screen except the fixture summit (rock) at the top right, partly under the minimap panel.
- `depth.plus2_flat_eb446e06.png`: +2 with the planes on. Seen at 1:1 through +2's open air:
  - the +1 terrace, with the oak, the stone stack, the test unit, the hole, and the wooden deck;
  - the meadow low ground;
  - the cut as a black 3 × 2 block (the void: open on +1 and the ground);
  - black wall caps above the terrace and the summit.
- `depth.plus1_off_eb446e06.png`: +1 with the planes off. Sky everywhere except the +1 terrace (oak, stone, unit with its health bar), the deck and the summit's +1 rock; the hole shows the sky.
- `depth.plus1_flat_eb446e06.png`: +1 with the planes on. The meadow ground through +1's open cells. In the cut, the −1 floor cell at its top left and black (the void) elsewhere.
- `depth.planes_only_plus2_eb446e06.png` / `..._tiles_eb446e06.png`: the planes alone on +2.
  - With the entities, the hole is black: the cap of the ground wall south of it.
  - Tiles only, the hole shows the meadow.
  - The summit is transparent (masked: +2 floor), the cut is the void.
- `depth.canvas_depth1_eb446e06.png`: the +1 plane's canvas. The terrace with a transparent hole, the deck, and the summit's +1 rock drawn as a wooden-looking wall tile.
- `depth.canvas_depth2_eb446e06.png`: the ground plane's canvas. Meadow over the box, transparent under the terrace, summit and cut (rock ground has no art, AUDIT_LOG A9; the cut is open), meadow at the hole.
- `layers_flat.ground_off_eb446e06.png`: Ground with the planes off. Meadow, the terrace and summit ground walls with dark caps and wood-like faces, and the cut solid black.
- `layers_flat.ground_flat_eb446e06.png`: Ground with the planes on. Through the cut: unit B on the −1 floor (top left) and the −2 floor in the rest of the top row. The bottom row is covered by the caps of the −1 rock south of it.
- `layers_flat.minus1_off_eb446e06.png` / `minus1_flat_eb446e06.png`: −1 with the planes off / on. Unit B on the −1 floor. With the planes on, the −2 floor shows in the cut's open top-row cells.
- The result texts next to them: `results_depth_eb446e06.txt` 27 passed, `results_layers_flat_eb446e06.txt` 12 passed, `results_test_minimap_eb446e06.txt` 24 passed.

## Not done / known problems
- **Not tried in the RMMZ editor's Playtest (F5)** in this session. Every run was the nw.exe harness.
- **The fixture scene is a test construct.** The screenshots show it, not a natural world. The natural terrain beyond the
  box (bottom rows) shows the A9 art gaps as dithered or transparent tiles.
- **On the ground and −1 views, the cut's lower row is covered by the black wall caps of the rock south of it.** This is the
  rule-13 wall-cap convention, drawn by the lower level's wall-face sprites. The checks judge the upper row on
  tile-only renders.
- **The display refresh rate differed between the Fix 1 runs and the pre-Fix 1 runs** (paused frame 15.5 vs 6.95 ms). Why
  was not checked. Frame intervals near the refresh interval are not comparable between those sets.
- **Harness hazards outside Lane K** (escalation.md E5):
  - DEUS_Test's 180 s whole-run watchdog could fire under much heavier load than in §3. The longest gate run was 50.1 s.
  - The old gate-2 command's fixed snapshot folder.
  - No seed pin.
- **Temp clones and snapshot folders.** Deleted before this report was committed: 74 items. They were the 11
  `%TEMP%\lanek-fix1-*` clones, my `%TEMP%\lanek_*` scratch files, and every `%TEMP%\uf_snapshots\lanek_*` folder,
  including the fixed-name ones from K1–K4.
  - Junctions were unlinked, never entered. Afterwards `game/img/characters` in the worktree still held 1726 files, and
    `git status` showed no change outside this report.
  - Three `%TEMP%\uf_test_profile_*` folders were left alone; I can't tell whether they are mine.
- **Lower-level combat is still invisible, and a switch is still a map transfer** (E4, E5).
- **The viewed level's own natural wall sprites were not checked at the loop seam.**

## Try it in RMMZ
1. Close the RMMZ editor, open the project, and start a Playtest (F5), New Game.
2. Walk the camera to a place where a hill meets low ground. Switch to +2, +1, Ground and −1 (the level buttons at the top).
3. Expected on every view:
   - Open cells show the level below at the same scale and position: no blur, no shrink, no colour shift.
   - Units on the lower level walk from cell to cell with their walk frames.
   - Solid cells stay solid.
4. Pan to the area's north or west edge (the map loops) and look down from +2. Expected: items, walls and units of +1
   are still drawn past the seam.

## Decisions needed
- **Seed pin for the harness.** A `--deus-seed` / `DEUS_TEST_SEED` in DEUS_Test.js would let a failing run be reproduced
  exactly. That needs a lane that owns DEUS_Test.js. Lane K's suites no longer depend on it.
- **The simulation costs (escalation.md E1–E4)** are for their owners, as before.
