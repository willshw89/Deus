# Fix 2 gates on the final code commit c2184c94 (2026-09-26)

Each `gate*.log` starts with the fresh clone it ran in and `git rev-parse HEAD`, and ends with `EXIT=` and `DURATION_MS=`.
- `gate1_layers_flat_x3.log`: 3 consecutive runs of `node tools/test_layer_render_flat.js` through
  `tasks/WG.00.09b/lane-k/determinism_runs.js` (load sampled before each run).
- `gate1_provoke_layers_flat.log`, `gate2_depth.log`, `gate2_provoke_depth.log`, `gate3_minimap.log`,
  `gate4_layer_switch_inplace.log`, `gate5_check_deus_syntax.log`, `gate6_test_palette.log`: one fresh clone each.
- `depth_provoke_only_canvases_freed.log`: `--suite depth --provoke --only canvases_freed` on c2184c94 (a clone made right
  after the commit), the changed check caught.
- `inplace_perf_00ff1c59/`, `inplace_perf_c2184c94/`: `node tools/test_layer_switch_inplace.js --evidence=<dir>` (Lane N's
  gate, world seed 18) on the merge base and on c2184c94, for the switch-cost comparison
  (`perf/fix2_switch_cost.js` -> `perf/fix2_switch_cost_output.txt`). The two PNGs are that tool's own screenshots on
  c2184c94, taken 2 frames after the switch to +2 and to the ground (round 1).
