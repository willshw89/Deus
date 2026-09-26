# OPS.70.02 Lane Z review (Grok) of a98d31c5e1314b4dbed243a5097092ea7d1159f1

Independent review of writer tip `a98d31c5e1314b4dbed243a5097092ea7d1159f1` on `task/lane-z`. This review did not modify production code, briefs, fixtures, or tools. Checks ran in a fresh temporary clone (`git clone -c core.autocrlf=false` of this worktree, then `git checkout --detach a98d31c5e1314b4dbed243a5097092ea7d1159f1`). The clone was deleted after the checks. No art was generated.

Reviewed writer tip, pasted from `git rev-parse`: `a98d31c5e1314b4dbed243a5097092ea7d1159f1`.

BRIEF_RESUME1 wins over BRIEF.md where they differ. `lane.json` allowedPaths are `tools/security/**` and `tasks/OPS.70.02/**`. The three STATUS-granted security-fix paths for SEC-2026-09-26-01 are `tools/generate_nano_banana_pro.js`, `docs/archive/STATUS_LEDGER_20260925.md`, and `docs/telemetry/security_incidents.json`.

## Identity

Worktree `C:\Users\snewt\.deus_worktrees\lane-z`, before the review commit. Raw:

```text
git rev-parse HEAD origin/task/lane-z
a98d31c5e1314b4dbed243a5097092ea7d1159f1
a98d31c5e1314b4dbed243a5097092ea7d1159f1
EXIT=0

git log -12 --format="%H %an %s"
a98d31c5e1314b4dbed243a5097092ea7d1159f1 deus-claude [claude] OPS.70.02 REPORT.md and raw gate/real-repo evidence (gates at 1408390f: all five EXIT=0)
1408390ffcf6db9fc189adcb721b8a4fe8ddb991 deus-claude [claude] OPS.70.02 WIP: second pre-review fixes (typeof/postfix regressions, member requires, export lists, regex cap; bounded secret regexes, human-value redaction, per-line hash withholding, addedIn-only baseline scope, text under binary extensions, gitlinks, escaped paths) + tests (156 and 80)
dd07898a264c843d9cca8ae5b4e6a42af7490bc1 deus-claude [claude] OPS.70.02 WIP: dependency checker review fixes (lexer escapes/spaces/comment ends/postfix, call shapes, indirect require, export default, folder specs, libs flags and ignored files) + tests (70 checks)
6907cec0865d17a1d38768e203534d1a88869ba5 deus-claude [claude] OPS.70.02 WIP: scanner review fixes (binary names, NUL files, short-value redaction, path redaction, message split, baseline integrity/inactive, entropy thresholds, credential assignments) + tests (133 checks, 52 mutants)
ca4b1f44fae438fa41f3737baba01b71d5c7460b deus-claude [claude] OPS.70.02 WIP: header docs, git status rename parsing in the libs check (+ test and mutant)
90c24b2c4d647f23d43c0287d3a53e54d58c5d5b deus-claude [claude] OPS.70.02 WIP: check_dependencies tests (23 checks, 15 mutants)
c5f04e4f14faff78a730235ca803d6a11d33b01f deus-claude [claude] OPS.70.02 WIP: scan_secrets tests (86 checks, 27 mutants), shared test support, empty allowlist
2e50148710aa7fbb886d24273140dc0eeb540232 deus-claude [claude] OPS.70.02 WIP: check_dependencies.js, libs baseline at 425b594c, known-defect dependency baseline
c2a472a98db176422d4419c18daf8760dc97bf5c deus-claude [claude] OPS.70.02 WIP: scanner entropy tuning, batched range reads, fingerprint baseline
bbe29c07798e033ee171f64486933403d0a965d9 snewt [pm] OPS.70.02 lane-z: BRIEF_RESUME1.md (resume after SECURITY escalation)
abad39c78a327cfa62932358ea85cebc4d4b8f8a snewt [lane-z] security: incident record cites fix commit e8375c90
e8375c904a8287fd7afd1c76bc63ab94d9dd6a62 snewt [lane-z] security: remove hard-coded API key literal + incident record
EXIT=0
```

HEAD matched `origin/task/lane-z`. The review continued.

Clone, after detach:

```text
git clone -c core.autocrlf=false C:\Users\snewt\.deus_worktrees\lane-z C:\Users\snewt\AppData\Local\Temp\lanez-review-a98d31c5
EXIT=0
git checkout --detach a98d31c5e1314b4dbed243a5097092ea7d1159f1
HEAD is now at a98d31c5 [claude] OPS.70.02 REPORT.md and raw gate/real-repo evidence (gates at 1408390f: all five EXIT=0)
EXIT_CHECKOUT=0
git rev-parse HEAD
a98d31c5e1314b4dbed243a5097092ea7d1159f1
EXIT_REVPARSE=0
node -v
v24.19.0
EXIT_NODE=0
```

## Scope

Command (temp clone):

```text
git diff --name-status 425b594c146d5f353c10faa11f4b5d47f499b45f a98d31c5e1314b4dbed243a5097092ea7d1159f1
EXIT_DIFF=0
```

204 paths. Classification against `lane.json` allowedPaths plus the three granted paths:

| Class | Count |
|---|---|
| `tools/security/**` or `tasks/OPS.70.02/**` | 30 |
| STATUS-granted security-fix path | 3 |
| Any other path | 171 |

Raw name-status (status, tab, path):

```text
M	docs/STATUS.md
M	docs/archive/STATUS_LEDGER_20260925.md
M	docs/systems/DEUS_Depth.md
M	docs/systems/DEUS_Minimap.md
A	docs/telemetry/security_incidents.json
M	game/js/plugins.js
M	game/js/plugins/DEUS_Depth.js
M	game/js/plugins/DEUS_Minimap.js
A	tasks/OPS.70.02/lane-z/BRIEF.md
A	tasks/OPS.70.02/lane-z/BRIEF_RESUME1.md
A	tasks/OPS.70.02/lane-z/REPORT.md
A	tasks/OPS.70.02/lane-z/escalation.md
A	tasks/OPS.70.02/lane-z/evidence/gate1_test_scan_secrets.txt
A	tasks/OPS.70.02/lane-z/evidence/gate2_test_check_dependencies.txt
A	tasks/OPS.70.02/lane-z/evidence/gate3_scan_secrets.txt
A	tasks/OPS.70.02/lane-z/evidence/gate4_check_dependencies.txt
A	tasks/OPS.70.02/lane-z/evidence/gate5_check_deus_syntax.txt
A	tasks/OPS.70.02/lane-z/evidence/gates_head.txt
A	tasks/OPS.70.02/lane-z/evidence/libs_baseline_remake.txt
A	tasks/OPS.70.02/lane-z/evidence/node_version.txt
A	tasks/OPS.70.02/lane-z/evidence/real_lane_diff_scan.txt
A	tasks/OPS.70.02/lane-z/evidence/real_other_refs.txt
A	tasks/OPS.70.02/lane-z/evidence/real_range_224b1b36.txt
A	tasks/OPS.70.02/lane-z/evidence/real_range_full_history.txt
A	tasks/OPS.70.02/lane-z/evidence/real_root_tree.txt
A	tasks/OPS.70.02/lane-z/evidence/real_staged_scan.txt
A	tasks/OPS.70.02/lane-z/evidence/scope_diff.txt
A	tasks/OPS.70.02/lane-z/lane.json
A	tasks/OPS.70.02/lane-z/launches/20260926_071010_prompt.txt
A	tasks/WG.00.09b/lane-k/BRIEF.md
A	tasks/WG.00.09b/lane-k/BRIEF_FIX1.md
A	tasks/WG.00.09b/lane-k/BRIEF_FIX2.md
A	tasks/WG.00.09b/lane-k/REPORT.md
A	tasks/WG.00.09b/lane-k/determinism_runs.js
A	tasks/WG.00.09b/lane-k/escalation.md
A	tasks/WG.00.09b/lane-k/evidence/after_4da2e734/depth.canvas_depth1_4da2e734.png
A	tasks/WG.00.09b/lane-k/evidence/after_4da2e734/depth.canvas_depth2_4da2e734.png
A	tasks/WG.00.09b/lane-k/evidence/after_4da2e734/depth.planes_only_plus2_4da2e734.png
A	tasks/WG.00.09b/lane-k/evidence/after_4da2e734/depth.planes_only_plus2_tiles_4da2e734.png
A	tasks/WG.00.09b/lane-k/evidence/after_4da2e734/depth.plus1_flat_4da2e734.png
A	tasks/WG.00.09b/lane-k/evidence/after_4da2e734/depth.plus1_off_4da2e734.png
A	tasks/WG.00.09b/lane-k/evidence/after_4da2e734/depth.plus2_flat_4da2e734.png
A	tasks/WG.00.09b/lane-k/evidence/after_4da2e734/depth.plus2_off_4da2e734.png
A	tasks/WG.00.09b/lane-k/evidence/after_4da2e734/layers_flat.ground_flat_4da2e734.png
A	tasks/WG.00.09b/lane-k/evidence/after_4da2e734/layers_flat.ground_off_4da2e734.png
A	tasks/WG.00.09b/lane-k/evidence/after_4da2e734/layers_flat.minus1_flat_4da2e734.png
A	tasks/WG.00.09b/lane-k/evidence/after_4da2e734/layers_flat.minus1_off_4da2e734.png
A	tasks/WG.00.09b/lane-k/evidence/after_4da2e734/results_depth_4da2e734.txt
A	tasks/WG.00.09b/lane-k/evidence/after_4da2e734/results_layers_flat_4da2e734.txt
A	tasks/WG.00.09b/lane-k/evidence/after_4da2e734/results_test_minimap_4da2e734.txt
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/depth.canvas_depth1_eb446e06.png
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/depth.canvas_depth2_eb446e06.png
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/depth.planes_only_plus2_eb446e06.png
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/depth.planes_only_plus2_tiles_eb446e06.png
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/depth.plus1_flat_eb446e06.png
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/depth.plus1_off_eb446e06.png
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/depth.plus2_flat_eb446e06.png
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/depth.plus2_off_eb446e06.png
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/driver_depth_eb446e06.log
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/driver_layers_flat_eb446e06.log
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/layers_flat.ground_flat_eb446e06.png
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/layers_flat.ground_off_eb446e06.png
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/layers_flat.minus1_flat_eb446e06.png
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/layers_flat.minus1_off_eb446e06.png
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/results_depth_eb446e06.txt
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/results_layers_flat_eb446e06.txt
A	tasks/WG.00.09b/lane-k/evidence/after_eb446e06/results_test_minimap_eb446e06.txt
A	tasks/WG.00.09b/lane-k/evidence/b1_repro_86bf49a9/DEUS_B1Repro.js.txt
A	tasks/WG.00.09b/lane-k/evidence/b1_repro_86bf49a9/DEUS_Depth_trace.diff
A	tasks/WG.00.09b/lane-k/evidence/b1_repro_86bf49a9/repro_b1_interior_seam.log
A	tasks/WG.00.09b/lane-k/evidence/b1_repro_86bf49a9/repro_b1_seam_interior.log
A	tasks/WG.00.09b/lane-k/evidence/b1_repro_86bf49a9/repro_b1v2_interior_seam.log
A	tasks/WG.00.09b/lane-k/evidence/b1_repro_86bf49a9/repro_b1v2_seam_interior.log
A	tasks/WG.00.09b/lane-k/evidence/b1_repro_86bf49a9/repro_depth_1.log
A	tasks/WG.00.09b/lane-k/evidence/b1_repro_86bf49a9/repro_patch.js
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.canvas_depth1_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.canvas_depth2_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.planes_only_plus2_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.planes_only_plus2_tiles_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.plus1_A_eye190_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.plus1_D_oneLevelBlur_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.plus1_off_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.plus1_tune_D_full_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.plus2_A_eye120_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.plus2_A_eye190_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.plus2_A_eye30_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.plus2_A_eye60_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.plus2_B_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.plus2_C_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.plus2_D_oneLevelBlur_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.plus2_off_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.tune_A_baseline_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.tune_B_scale_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.tune_C_scale_color_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/depth.tune_D_full_3a9daa0f.png
A	tasks/WG.00.09b/lane-k/evidence/before_3a9daa0f/results_depth_3a9daa0f.txt
A	tasks/WG.00.09b/lane-k/evidence/determinism_eb446e06/gate1_layers_flat_x5.log
A	tasks/WG.00.09b/lane-k/evidence/determinism_eb446e06/gate2_depth_driver_x5.log
A	tasks/WG.00.09b/lane-k/evidence/determinism_eb446e06/gate2_old_test_snapshot_depth_x5.log
A	tasks/WG.00.09b/lane-k/evidence/determinism_eb446e06/gate3_minimap_x5.log
A	tasks/WG.00.09b/lane-k/evidence/determinism_eb446e06/loaded_round1_4_parallel.log
A	tasks/WG.00.09b/lane-k/evidence/determinism_eb446e06/loaded_round2_4_parallel.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_base_00ff1c59/README.md
A	tasks/WG.00.09b/lane-k/evidence/fix2_base_00ff1c59/provoke_canvases_freed.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/README.md
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/depth_provoke_only_canvases_freed.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate1_layers_flat_x3.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate1_provoke_layers_flat.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate2_depth.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate2_provoke_depth.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate3_minimap.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate4_layer_switch_inplace.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate5_check_deus_syntax.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/gate6_test_palette.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_00ff1c59/console.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_00ff1c59/layer_switch_perf.json
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_00ff1c59/results.txt
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_c2184c94/console.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_c2184c94/layer_switch_inplace.2_p2.png
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_c2184c94/layer_switch_inplace.3_Ground.png
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_c2184c94/layer_switch_perf.json
A	tasks/WG.00.09b/lane-k/evidence/fix2_c2184c94/inplace_perf_c2184c94/results.txt
A	tasks/WG.00.09b/lane-k/evidence/fix2_repro_3538594d/README.md
A	tasks/WG.00.09b/lane-k/evidence/fix2_repro_3538594d/repro_layers_flat.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_wip_c98e80a2/README.md
A	tasks/WG.00.09b/lane-k/evidence/fix2_wip_c98e80a2/depth.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_wip_c98e80a2/layers_flat.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_wip_c98e80a2/provoke_depth.log
A	tasks/WG.00.09b/lane-k/evidence/fix2_wip_c98e80a2/provoke_layers_flat.log
A	tasks/WG.00.09b/lane-k/evidence/provoke_eb446e06/provoke_depth.log
A	tasks/WG.00.09b/lane-k/evidence/provoke_eb446e06/provoke_layers_flat.log
A	tasks/WG.00.09b/lane-k/lane.json
A	tasks/WG.00.09b/lane-k/launches/20260926_000920_prompt.txt
A	tasks/WG.00.09b/lane-k/launches/20260926_002423_prompt.txt
A	tasks/WG.00.09b/lane-k/launches/20260926_034016_prompt.txt
A	tasks/WG.00.09b/lane-k/launches/20260926_055850_prompt.txt
A	tasks/WG.00.09b/lane-k/perf/append_cost.js
A	tasks/WG.00.09b/lane-k/perf/append_cost.json
A	tasks/WG.00.09b/lane-k/perf/baseline_5c6641e1.json
A	tasks/WG.00.09b/lane-k/perf/baseline_8592b07a.json
A	tasks/WG.00.09b/lane-k/perf/baseline_8dbd0bdc.json
A	tasks/WG.00.09b/lane-k/perf/baseline_c2184c94.json
A	tasks/WG.00.09b/lane-k/perf/baseline_e3896d76.json
A	tasks/WG.00.09b/lane-k/perf/baseline_eb446e06.json
A	tasks/WG.00.09b/lane-k/perf/baseline_f19b23bf.json
A	tasks/WG.00.09b/lane-k/perf/check_escalation_citations.js
A	tasks/WG.00.09b/lane-k/perf/compare_k4.js
A	tasks/WG.00.09b/lane-k/perf/escalation_figures.js
A	tasks/WG.00.09b/lane-k/perf/escalation_figures_output.txt
A	tasks/WG.00.09b/lane-k/perf/fix2_switch_cost.js
A	tasks/WG.00.09b/lane-k/perf/fix2_switch_cost_output.txt
A	tasks/WG.00.09b/lane-k/perf/logs_8dbd0bdc/bench_normal_1.log
A	tasks/WG.00.09b/lane-k/perf/logs_8dbd0bdc/bench_normal_2.log
A	tasks/WG.00.09b/lane-k/perf/logs_8dbd0bdc/probe_normal_1.jsonl
A	tasks/WG.00.09b/lane-k/perf/logs_8dbd0bdc/probe_normal_2.jsonl
A	tasks/WG.00.09b/lane-k/perf/logs_c2184c94/bench_normal_1.log
A	tasks/WG.00.09b/lane-k/perf/logs_c2184c94/bench_normal_2.log
A	tasks/WG.00.09b/lane-k/perf/logs_c2184c94/bench_stress_1.log
A	tasks/WG.00.09b/lane-k/perf/logs_c2184c94/bench_stress_2.log
A	tasks/WG.00.09b/lane-k/perf/logs_c2184c94/probe_normal_1.jsonl
A	tasks/WG.00.09b/lane-k/perf/logs_c2184c94/probe_normal_2.jsonl
A	tasks/WG.00.09b/lane-k/perf/logs_c2184c94/probe_stress_1.jsonl
A	tasks/WG.00.09b/lane-k/perf/logs_c2184c94/probe_stress_2.jsonl
A	tasks/WG.00.09b/lane-k/perf/logs_e3896d76/bench_normal_1.log
A	tasks/WG.00.09b/lane-k/perf/logs_e3896d76/bench_normal_2.log
A	tasks/WG.00.09b/lane-k/perf/logs_e3896d76/bench_stress_1.log
A	tasks/WG.00.09b/lane-k/perf/logs_e3896d76/bench_stress_2.log
A	tasks/WG.00.09b/lane-k/perf/logs_e3896d76/probe_normal_1.jsonl
A	tasks/WG.00.09b/lane-k/perf/logs_e3896d76/probe_normal_2.jsonl
A	tasks/WG.00.09b/lane-k/perf/logs_e3896d76/probe_stress_1.jsonl
A	tasks/WG.00.09b/lane-k/perf/logs_e3896d76/probe_stress_2.jsonl
A	tasks/WG.00.09b/lane-k/perf/logs_eb446e06/bench_normal_1.log
A	tasks/WG.00.09b/lane-k/perf/logs_eb446e06/bench_normal_2.log
A	tasks/WG.00.09b/lane-k/perf/logs_eb446e06/bench_stress_1.log
A	tasks/WG.00.09b/lane-k/perf/logs_eb446e06/bench_stress_2.log
A	tasks/WG.00.09b/lane-k/perf/logs_eb446e06/probe_normal_1.jsonl
A	tasks/WG.00.09b/lane-k/perf/logs_eb446e06/probe_normal_2.jsonl
A	tasks/WG.00.09b/lane-k/perf/logs_eb446e06/probe_stress_1.jsonl
A	tasks/WG.00.09b/lane-k/perf/logs_eb446e06/probe_stress_2.jsonl
A	tasks/WG.00.09b/lane-k/perf/rank_k4.js
A	tasks/WG.00.09b/lane-k/perf/rank_k4_eb446e06.txt
A	tasks/WG.00.09b/lane-k/perf/stress_baseline_5c6641e1.json
A	tasks/WG.00.09b/lane-k/perf/stress_baseline_8592b07a.json
A	tasks/WG.00.09b/lane-k/perf/stress_baseline_c2184c94.json
A	tasks/WG.00.09b/lane-k/perf/stress_baseline_e3896d76.json
A	tasks/WG.00.09b/lane-k/perf/stress_baseline_eb446e06.json
A	tasks/WG.00.09b/lane-k/perf/stress_baseline_f19b23bf.json
A	tasks/WG.00.09b/lane-k/review_grok_86bf49a9.md
A	tasks/WG.00.09b/lane-k/review_grok_95c18bfa.md
A	tasks/WG.00.09b/lane-k/review_grok_abdb6bbe.md
A	tasks/WG.00.09b/lane-k/test_changes.md
A	tools/bench_render_layers.js
M	tools/generate_nano_banana_pro.js
A	tools/security/check_dependencies.js
A	tools/security/dependency_baseline.json
A	tools/security/libs_baseline.json
A	tools/security/scan_secrets.js
A	tools/security/secrets_allowlist.json
A	tools/security/secrets_baseline.json
A	tools/security/test_check_dependencies.js
A	tools/security/test_scan_secrets.js
A	tools/security/test_support.js
A	tools/test_layer_render_flat.js
M	tools/test_minimap.js
```

Follow-up, same clone:

```text
git merge-base origin/main HEAD
96483c517a95b10c5d52aec85d3b18ea01e599b4
EXIT_MERGEBASE=0

git diff --name-only 96483c517a95b10c5d52aec85d3b18ea01e599b4 a98d31c5e1314b4dbed243a5097092ea7d1159f1
```

That second diff is 33 paths. All 33 are in the allowed set or are one of the three grants. None of the 171 other paths appear in it. `git log --format="%H %s" 96483c517a95b10c5d52aec85d3b18ea01e599b4..a98d31c5e1314b4dbed243a5097092ea7d1159f1 -- <those 171 paths>` printed nothing (`EXIT_LOG=0`).

The 171 paths are the tree difference between lane base `425b594c146d5f353c10faa11f4b5d47f499b45f` and merge-base `96483c517a95b10c5d52aec85d3b18ea01e599b4`. They entered this branch in:

```text
git log --merges --format="%H %an %s" 425b594c146d5f353c10faa11f4b5d47f499b45f..a98d31c5e1314b4dbed243a5097092ea7d1159f1
86c074dad67a3db51082301d3571ef2675bf7c54 snewt Merge origin/main (96483c51) into task/lane-z: PM STATUS grant of the OPS.70.02 security-fix paths
5255f1a58a9d95bb7bc08377ef055c366610e486 snewt Merge task/lane-k: WG.00.09b Fix2 in-place switch paint/order (PM manual merge; Grok VERDICT CLEAN PASS at 95c18bfa)
00ff1c599a672b27adfb1d56e32ff8bf86afc7a4 snewt [pm] Merge main 1f683b94 into task/lane-k for WG.00.09b Fix2 (main now has Lane N SIM.00.00 in-place level switch e27e8be5, plus Q/R/L1)
EXIT_MERGES=0
```

BRIEF_RESUME1 required the merge of main `96483c517a95b10c5d52aec85d3b18ea01e599b4`. The review rule for this pass still flags every path outside allowedPaths and the three grants. See BLOCKER.

Report commit versus its parent:

```text
git diff --name-only 1408390ffcf6db9fc189adcb721b8a4fe8ddb991 a98d31c5e1314b4dbed243a5097092ea7d1159f1
tasks/OPS.70.02/lane-z/REPORT.md
tasks/OPS.70.02/lane-z/evidence/gate1_test_scan_secrets.txt
tasks/OPS.70.02/lane-z/evidence/gate2_test_check_dependencies.txt
tasks/OPS.70.02/lane-z/evidence/gate3_scan_secrets.txt
tasks/OPS.70.02/lane-z/evidence/gate4_check_dependencies.txt
tasks/OPS.70.02/lane-z/evidence/gate5_check_deus_syntax.txt
tasks/OPS.70.02/lane-z/evidence/gates_head.txt
tasks/OPS.70.02/lane-z/evidence/libs_baseline_remake.txt
tasks/OPS.70.02/lane-z/evidence/node_version.txt
tasks/OPS.70.02/lane-z/evidence/real_lane_diff_scan.txt
tasks/OPS.70.02/lane-z/evidence/real_other_refs.txt
tasks/OPS.70.02/lane-z/evidence/real_range_224b1b36.txt
tasks/OPS.70.02/lane-z/evidence/real_range_full_history.txt
tasks/OPS.70.02/lane-z/evidence/real_root_tree.txt
tasks/OPS.70.02/lane-z/evidence/real_staged_scan.txt
tasks/OPS.70.02/lane-z/evidence/scope_diff.txt
EXIT_PARENT_DIFF=0
```

16 paths, all under `tasks/OPS.70.02/**`. That matches the report's statement that the report commit adds the report and `evidence/` and changes nothing else. `204 - 16 = 188`, which is the count the report prints for `425b594c..HEAD`.

Granted-file numstat from `425b594c146d5f353c10faa11f4b5d47f499b45f` to the tip (`EXIT_NUMSTAT=0`):

```text
1	1	docs/archive/STATUS_LEDGER_20260925.md
42	0	docs/telemetry/security_incidents.json
12	1	tools/generate_nano_banana_pro.js
```

Fix commits touch only those paths:

```text
git show --name-status --format="COMMIT %H%nAUTHOR %an%nSUBJECT %s" e8375c904a8287fd7afd1c76bc63ab94d9dd6a62
COMMIT e8375c904a8287fd7afd1c76bc63ab94d9dd6a62
AUTHOR snewt
SUBJECT [lane-z] security: remove hard-coded API key literal + incident record
M	docs/archive/STATUS_LEDGER_20260925.md
A	docs/telemetry/security_incidents.json
M	tools/generate_nano_banana_pro.js
EXIT_SHOW_FIX=0

git show --name-status --format="COMMIT %H%nAUTHOR %an%nSUBJECT %s" abad39c78a327cfa62932358ea85cebc4d4b8f8a
COMMIT abad39c78a327cfa62932358ea85cebc4d4b8f8a
AUTHOR snewt
SUBJECT [lane-z] security: incident record cites fix commit e8375c90
M	docs/telemetry/security_incidents.json
EXIT_SHOW_CITE=0
```

## Gate commands

Run from the temp clone root with cmd redirection (byte-preserving). Exit codes are the cmd `ERRORLEVEL` printed on the next line.

### a. `node tools/security/test_scan_secrets.js`

`EXIT_gate1=0`

156 `PASS` lines, 0 `FAIL` lines, stderr empty.

```text
PASS fixture_values_built_at_run_time
PASS detects_PRIVATE_KEY_PEM
PASS detects_ANTHROPIC_KEY
PASS detects_OPENAI_KEY
PASS detects_GOOGLE_API_KEY
PASS detects_GOOGLE_OAUTH_TOKEN
PASS detects_XAI_KEY
PASS detects_GITHUB_TOKEN
PASS detects_GITLAB_TOKEN
PASS detects_JWT
PASS detects_NETRC_PASSWORD
PASS detects_SESSION_COOKIE
PASS detects_BEARER_TOKEN
PASS detects_HIGH_ENTROPY
PASS detects_CREDENTIAL_ASSIGNMENT
PASS detects_CREDENTIAL_FILE_tracked_env
PASS credential_file_binary_p12_detected
PASS file_name_scanned_even_when_unread
PASS credential_file_names
PASS head_findings_exit_1_and_counts
PASS crlf_line_detected_without_cr
PASS nul_files_scanned_without_nul_bytes
PASS binary_extension_skipped_and_counted
PASS binary_extension_text_scanned
PASS gitlink_name_checked
PASS control_chars_in_paths_escaped
PASS head_ignores_untracked_files
PASS redaction_text_output_keeps_4_chars
PASS redaction_json_output_keeps_4_chars
PASS redaction_short_and_human_values_show_length_only
PASS redact_function_contract
PASS clean_tree_exit_0
PASS policy_text_is_not_a_finding
PASS look_alikes_are_not_findings
PASS entropy_slash_run_judged_whole_with_plus_or_context
PASS entropy_long_segment_in_path_detected
PASS entropy_data_blob_over_256_skipped
PASS entropy_hex_needs_credential_context
PASS entropy_alphabet_table_skipped
PASS entropy_thresholds_at_the_boundaries
PASS credential_assignment_thresholds
PASS scan_time_linear_on_long_lines
PASS credential_assignment_names
PASS staged_sees_only_added_lines
PASS staged_clean_change_exit_0
PASS range_sees_only_added_lines
PASS range_commit_message_scanned
PASS range_quoted_path_decoded
PASS range_merge_lines_new_against_every_parent_only
PASS range_odd_cases_all_found
PASS range_line_after_no_newline_marker
PASS range_name_with_space_b_slash
PASS range_crlf_line_sha_matches_head_form
PASS range_binary_extension_skipped
PASS range_utf16_file_scanned
PASS range_message_control_byte_not_a_separator
PASS range_usage_errors_exit_2
PASS path_mode_one_file
PASS path_mode_utf16_file
PASS path_outside_or_untracked_exit_2
PASS allowlist_matching_entries_allowed
PASS allowlist_partial_still_fails
PASS allowlist_entry_needs_the_right_path
PASS allowlist_stale_entry_fails
PASS allowlist_staleness_only_in_scope
PASS allowlist_stale_in_path_mode_for_that_file
PASS allowlist_commit_message_entry
PASS allowlist_malformed_exit_2
PASS committed_allowlist_is_valid_and_reasoned
PASS baseline_historical_finding_passes
PASS baseline_readded_later_commit_fails
PASS baseline_whole_history_fails_on_readd_only
PASS baseline_different_value_fails
PASS baseline_head_occurrence_fails
PASS baseline_staged_occurrence_fails
PASS baseline_path_occurrence_fails
PASS baseline_wins_over_allowlist_in_history
PASS baseline_stale_entry_fails
PASS baseline_staleness_only_when_addedIn_scanned
PASS baseline_bad_ancestry_or_shape_exit_2
PASS baseline_fix_commit_must_remove_the_value
PASS baseline_missing_commits_make_the_entry_inactive
PASS baseline_file_has_no_rule_match
PASS baseline_only_in_addedIn_commits
PASS baseline_real_history_224b1b36_baselined
PASS usage_errors_exit_2
PASS cli_exit_codes
PASS mutant_rule_PRIVATE_KEY_PEM_off_killed (killed by detects_PRIVATE_KEY_PEM)
PASS mutant_rule_ANTHROPIC_KEY_off_killed (killed by detects_ANTHROPIC_KEY)
PASS mutant_rule_OPENAI_KEY_off_killed (killed by detects_OPENAI_KEY)
PASS mutant_rule_GOOGLE_API_KEY_off_killed (killed by detects_GOOGLE_API_KEY)
PASS mutant_rule_GOOGLE_OAUTH_TOKEN_off_killed (killed by detects_GOOGLE_OAUTH_TOKEN)
PASS mutant_rule_XAI_KEY_off_killed (killed by detects_XAI_KEY)
PASS mutant_rule_GITHUB_TOKEN_off_killed (killed by detects_GITHUB_TOKEN)
PASS mutant_rule_GITLAB_TOKEN_off_killed (killed by detects_GITLAB_TOKEN)
PASS mutant_rule_JWT_off_killed (killed by detects_JWT)
PASS mutant_rule_NETRC_PASSWORD_off_killed (killed by detects_NETRC_PASSWORD)
PASS mutant_rule_SESSION_COOKIE_off_killed (killed by detects_SESSION_COOKIE)
PASS mutant_rule_BEARER_TOKEN_off_killed (killed by detects_BEARER_TOKEN)
PASS mutant_entropy_off_killed (killed by detects_HIGH_ENTROPY)
PASS mutant_rule_CREDENTIAL_ASSIGNMENT_off_killed (killed by detects_CREDENTIAL_ASSIGNMENT)
PASS mutant_assignment_key_case_off_killed (killed by credential_assignment_names)
PASS mutant_assignment_author_excluded_off_killed (killed by credential_assignment_names)
PASS mutant_assignment_operators_basic_only_killed (killed by credential_assignment_names)
PASS mutant_assignment_quoted_values_ignored_killed (killed by credential_assignment_names)
PASS mutant_assignment_key_suffix_word_boundary_killed (killed by credential_assignment_names)
PASS mutant_assignment_min_bits_zero_killed (killed by credential_assignment_thresholds)
PASS mutant_assignment_min_len_lowered_killed (killed by credential_assignment_thresholds)
PASS mutant_assignment_sequence_skip_off_killed (killed by credential_assignment_thresholds)
PASS mutant_assign_regex_unbounded_killed (killed by scan_time_linear_on_long_lines)
PASS mutant_cookie_regex_unbounded_killed (killed by scan_time_linear_on_long_lines)
PASS mutant_entropy_short_max_len_raised_killed (killed by entropy_thresholds_at_the_boundaries)
PASS mutant_ext_text_sniff_off_killed (killed by binary_extension_text_scanned)
PASS mutant_range_ext_text_off_killed (killed by range_odd_cases_all_found)
PASS mutant_gitlink_names_off_killed (killed by gitlink_name_checked)
PASS mutant_printable_paths_off_killed (killed by control_chars_in_paths_escaped)
PASS mutant_nul_file_path_unredacted_killed (killed by redaction_text_output_keeps_4_chars)
PASS mutant_credential_file_off_killed (killed by detects_CREDENTIAL_FILE_tracked_env)
PASS mutant_name_checks_skip_unread_files_killed (killed by file_name_scanned_even_when_unread)
PASS mutant_file_names_off_killed (killed by file_name_scanned_even_when_unread)
PASS mutant_display_path_off_killed (killed by redaction_text_output_keeps_4_chars)
PASS mutant_redaction_off_killed (killed by redaction_text_output_keeps_4_chars)
PASS mutant_short_value_prefix_shown_killed (killed by redaction_short_and_human_values_show_length_only)
PASS mutant_human_values_show_prefix_killed (killed by redaction_text_output_keeps_4_chars)
PASS mutant_short_value_line_sha_shown_killed (killed by redaction_short_and_human_values_show_length_only)
PASS mutant_line_sha_withheld_per_finding_only_killed (killed by redaction_short_and_human_values_show_length_only)
PASS mutant_allowlist_staleness_off_killed (killed by allowlist_stale_entry_fails)
PASS mutant_allowlist_off_killed (killed by allowlist_matching_entries_allowed)
PASS mutant_allowlist_ignores_path_killed (killed by allowlist_entry_needs_the_right_path)
PASS mutant_commit_message_entries_judged_at_head_killed (killed by allowlist_commit_message_entry)
PASS mutant_path_mode_staleness_off_killed (killed by allowlist_stale_in_path_mode_for_that_file)
PASS mutant_baseline_ignores_scope_killed (killed by baseline_readded_later_commit_fails)
PASS mutant_baseline_ignores_ancestry_killed (killed by baseline_readded_later_commit_fails)
PASS mutant_baseline_scope_not_limited_to_addedIn_killed (killed by baseline_only_in_addedIn_commits)
PASS mutant_baseline_off_killed (killed by baseline_historical_finding_passes)
PASS mutant_baseline_staleness_off_killed (killed by baseline_stale_entry_fails)
PASS mutant_baseline_fix_tree_check_off_killed (killed by baseline_fix_commit_must_remove_the_value)
PASS mutant_baseline_missing_commits_not_inactive_killed (killed by baseline_missing_commits_make_the_entry_inactive)
PASS mutant_nul_files_not_scanned_killed (killed by nul_files_scanned_without_nul_bytes)
PASS mutant_range_nul_files_not_scanned_killed (killed by range_utf16_file_scanned)
PASS mutant_entropy_slash_split_off_killed (killed by clean_tree_exit_0)
PASS mutant_entropy_sequence_skip_off_killed (killed by entropy_alphabet_table_skipped)
PASS mutant_entropy_long_run_skip_off_killed (killed by entropy_data_blob_over_256_skipped)
PASS mutant_entropy_min_bits_raised_killed (killed by entropy_thresholds_at_the_boundaries)
PASS mutant_entropy_min_len_raised_killed (killed by entropy_thresholds_at_the_boundaries)
PASS mutant_entropy_short_threshold_off_killed (killed by entropy_thresholds_at_the_boundaries)
PASS mutant_entropy_short_threshold_for_all_killed (killed by entropy_thresholds_at_the_boundaries)
PASS mutant_staged_scans_whole_tree_killed (killed by staged_sees_only_added_lines)
PASS mutant_patch_removed_lines_scanned_killed (killed by staged_sees_only_added_lines)
PASS mutant_merge_single_parent_lines_scanned_killed (killed by range_merge_lines_new_against_every_parent_only)
PASS mutant_no_newline_marker_ends_hunk_killed (killed by range_line_after_no_newline_marker)
PASS mutant_header_symmetric_split_off_killed (killed by range_name_with_space_b_slash)
PASS mutant_patch_cr_not_stripped_killed (killed by range_crlf_line_sha_matches_head_form)
PASS mutant_range_extension_skip_off_killed (killed by range_binary_extension_skipped)
PASS mutant_range_messages_off_killed (killed by range_commit_message_scanned)
PASS mutant_message_control_byte_separator_killed (killed by range_message_control_byte_not_a_separator)
RESULT: 156 passed, 0 failed
```

### b. `node tools/security/test_check_dependencies.js`

`EXIT_gate2=0`

80 `PASS` lines, 0 `FAIL` lines, stderr empty.

```text
PASS lexer_ignores_strings_comments_templates_regexes
PASS lexer_reads_every_import_form
PASS lexer_call_shapes
PASS lexer_regex_division_comments_and_lines
PASS lexer_indirect_require_reported
PASS export_default_reexports
PASS lexer_time_linear_on_slash_lines
PASS clean_repo_exit_0
PASS clean_repo_notes_reported_not_failed
PASS policy_builtins_counted
PASS npm_require_detected
PASS missing_relative_detected_literal_and_folded
PASS absolute_require_detected
PASS npm_artifacts_under_game_detected
PASS bad_repo_finding_total
PASS libs_changed_removed_added_detected
PASS libs_worktree_change_detected
PASS make_libs_baseline_roundtrip
PASS committed_libs_baseline_matches_425b594c
PASS real_repo_exit_0
PASS node_version_policy
PASS dep_baseline_hides_only_its_entry
PASS dep_baseline_needs_path_and_kind
PASS dep_baseline_stale_entry_fails
PASS dep_baseline_cannot_hide_frozen_libs
PASS committed_dep_baseline_valid_and_reasoned
PASS usage_errors_exit_2
PASS text_output_result_line
PASS cli_exit_codes
PASS mutant_npm_require_off_killed (killed by npm_require_detected)
PASS mutant_missing_relative_off_killed (killed by missing_relative_detected_literal_and_folded)
PASS mutant_absolute_require_off_killed (killed by absolute_require_detected)
PASS mutant_libs_baseline_off_killed (killed by libs_changed_removed_added_detected)
PASS mutant_libs_added_file_off_killed (killed by libs_changed_removed_added_detected)
PASS mutant_libs_worktree_off_killed (killed by libs_worktree_change_detected)
PASS mutant_libs_status_rename_misread_killed (killed by libs_worktree_change_detected)
PASS mutant_npm_artifact_off_killed (killed by npm_artifacts_under_game_detected)
PASS mutant_node_version_off_killed (killed by node_version_policy)
PASS mutant_builtins_treated_as_npm_killed (killed by clean_repo_exit_0)
PASS mutant_dynamic_not_reported_killed (killed by clean_repo_notes_reported_not_failed)
PASS mutant_lexer_reads_comments_killed (killed by lexer_ignores_strings_comments_templates_regexes)
PASS mutant_line_comment_ends_only_at_lf_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_unicode_spaces_off_killed (killed by lexer_call_shapes)
PASS mutant_identifier_escape_start_off_killed (killed by lexer_call_shapes)
PASS mutant_identifier_escapes_off_killed (killed by lexer_call_shapes)
PASS mutant_postfix_division_off_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_regex_after_keyword_off_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_regex_after_literal_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_template_brace_depth_off_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_block_comment_line_count_off_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_string_continuation_line_count_off_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_optional_call_off_killed (killed by lexer_call_shapes)
PASS mutant_member_require_off_killed (killed by lexer_call_shapes)
PASS mutant_bracket_require_off_killed (killed by lexer_call_shapes)
PASS mutant_typeof_skips_calls_too_killed (killed by lexer_call_shapes)
PASS mutant_typeof_require_reported_killed (killed by lexer_ignores_strings_comments_templates_regexes)
PASS mutant_postfix_minus_off_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_postfix_adjacency_off_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_regex_length_uncapped_killed (killed by lexer_time_linear_on_slash_lines)
PASS mutant_export_brace_scan_off_killed (killed by export_default_reexports)
PASS mutant_export_star_as_off_killed (killed by export_default_reexports)
PASS mutant_package_main_trailing_slash_kept_killed (killed by clean_repo_exit_0)
PASS mutant_skip_worktree_tag_off_killed (killed by libs_worktree_change_detected)
PASS mutant_require_parens_off_killed (killed by lexer_call_shapes)
PASS mutant_extra_arguments_off_killed (killed by lexer_call_shapes)
PASS mutant_indirect_not_reported_killed (killed by lexer_indirect_require_reported)
PASS mutant_function_require_guard_off_killed (killed by lexer_ignores_strings_comments_templates_regexes)
PASS mutant_dirname_fold_off_killed (killed by missing_relative_detected_literal_and_folded)
PASS mutant_folder_only_off_killed (killed by missing_relative_detected_literal_and_folded)
PASS mutant_trailing_slash_kept_killed (killed by clean_repo_exit_0)
PASS mutant_extension_resolution_js_only_killed (killed by clean_repo_exit_0)
PASS mutant_file_url_not_absolute_killed (killed by absolute_require_detected)
PASS mutant_package_json_parse_error_off_killed (killed by npm_artifacts_under_game_detected)
PASS mutant_libs_flag_check_off_killed (killed by libs_worktree_change_detected)
PASS mutant_libs_ignored_files_off_killed (killed by libs_worktree_change_detected)
PASS mutant_dep_baseline_ignores_kind_killed (killed by dep_baseline_needs_path_and_kind)
PASS mutant_dep_baseline_ignores_path_killed (killed by dep_baseline_needs_path_and_kind)
PASS mutant_nw_app_root_base_off_killed (killed by clean_repo_exit_0)
PASS mutant_dep_baseline_off_killed (killed by dep_baseline_hides_only_its_entry)
PASS mutant_dep_baseline_staleness_off_killed (killed by dep_baseline_stale_entry_fails)
RESULT: 80 passed, 0 failed
```

### c. `node tools/security/scan_secrets.js`

`EXIT_gate3=0`

stderr empty. Full stdout:

```text
RESULT: 4507 files scanned (0 with NUL bytes, 0 text with a binary extension), 6304 binary skipped, 0 findings, 0 allowed, 0 baselined, 0 stale allowlist entries, 0 stale baseline entries
```

The report's gate 3 line is `4491` files scanned, captured at `1408390ffcf6db9fc189adcb721b8a4fe8ddb991`. This tip scans 16 more text files (`4507 - 4491 = 16`), the same 16 paths the report commit adds. Binary skipped stays `6304`. Findings stay 0.

### d. `node tools/security/check_dependencies.js`

`EXIT_gate4=0`

stderr empty. Counted from the stdout: 19 `BASELINED`, 311 `NOTE`, 0 `FINDING`. Summary lines:

```text
NODE v24.19.0 (policy minimum v18.0.0)
BUILTINS in policy: child_process=189 crypto=32 fs=777 path=710 perf_hooks=20 v8=4
BUILTINS outside policy (reported, not failed): assert=30 buffer=1 http=5 https=1 module=3 net=2 os=137 timers=2 url=1 vm=79 zlib=9
LIBS 6 files under game/js/libs/ checked against tools/security/libs_baseline.json (425b594c146d)
RESULT: HEAD a98d31c5e131, 874 script files, 2950 module references, 0 findings (none), 19 baselined (MISSING_RELATIVE=19), 311 notes (BUILTIN_OUTSIDE_POLICY=270 NPM_REQUIRE=1 UNRESOLVED_DYNAMIC=40)
```

The 19 baselined lines collapse to 17 distinct path/kind/spec keys. That matches the report (17 baseline entries, 19 occurrences) and `dependency_baseline.json` (`DEP_BASELINE_ENTRIES 17`, all `MISSING_RELATIVE`). Counts of scripts, references, builtins, notes, and libs match the report. The `HEAD` token in the RESULT line is this tip, as the tool prints the commit it read.

### e. `node tools/check_deus_syntax.js`

`EXIT_gate5=0`

stderr empty. Full stdout:

```text
Checked 52 DEUS plugin files. Errors: 0
```

## Spot-checks against the report

| Claim | Measured | EXIT |
|---|---|---|
| Secret tests `156 passed, 0 failed` | same | 0 |
| Dependency tests `80 passed, 0 failed` | same | 0 |
| HEAD scan 0 findings | 0 findings; 4507 text files at this tip, 4491 at the gate parent | 0 |
| Dependency check 0 findings, 19 baselined, 311 notes, 874 scripts, 2950 refs | same | 0 |
| `check_deus_syntax.js` 52 files, 0 errors | same | 0 |
| `--range 224b1b36^..224b1b36` 2 BASELINED, 0 findings, 22 scanned, 42 binary | same | 0 |
| `--range origin/main..HEAD` 46 file-commits, 0 findings | 46 at `origin/main..1408390ffcf6db9fc189adcb721b8a4fe8ddb991`; 63 at `origin/main..a98d31c5e1314b4dbed243a5097092ea7d1159f1` | 0 |
| `--staged` empty, exit 0 | `RESULT: 0 files scanned ... 0 findings ...` | 0 |
| Libs baseline is the 6 blobs at `425b594c146d5f353c10faa11f4b5d47f499b45f` | 6 of 6 sha256 MATCH (`LIB_BAD 0`) | 0 |
| Node `v24.19.0` | `v24.19.0` | 0 |

Range of the introducing commit (four-character redaction prefix masked in this file as `####`; it was present in the tool's own redacted line):

```text
node tools/security/scan_secrets.js --range 224b1b36^..224b1b36
BASELINED 224b1b36dad8 docs/STATUS.md:12 HIGH_ENTROPY ####... (50 chars) fingerprint=6717051db5d3 incident: SEC-2026-09-26-01
BASELINED 224b1b36dad8 tools/generate_nano_banana_pro.js:14 HIGH_ENTROPY ####... (50 chars) fingerprint=6717051db5d3 incident: SEC-2026-09-26-01
RESULT: 22 files scanned (0 with NUL bytes, 0 text with a binary extension), 42 binary skipped, 0 findings, 0 allowed, 2 baselined, 0 stale allowlist entries, 0 stale baseline entries
EXIT_RANGE=0
```

`fingerprint=6717051db5d3` is the first 12 hex digits of baseline entry `6717051db5d36025cfa8d757d75264ef427722889a17420311c497828eee8027`.

Parent of the report, the commit the saved evidence was captured at:

```text
node tools/security/scan_secrets.js --range origin/main..1408390ffcf6db9fc189adcb721b8a4fe8ddb991
RESULT: 46 files scanned (0 with NUL bytes, 0 text with a binary extension), 0 binary skipped, 0 findings, 0 allowed, 0 baselined, 0 stale allowlist entries, 0 stale baseline entries
EXIT_range_parent=0
```

This tip:

```text
node tools/security/scan_secrets.js --range origin/main..HEAD
RESULT: 63 files scanned (0 with NUL bytes, 0 text with a binary extension), 0 binary skipped, 0 findings, 0 allowed, 0 baselined, 0 stale allowlist entries, 0 stale baseline entries
EXIT_LANE_RANGE=0
```

`63 - 46 = 17`. The report commit adds 16 paths plus that commit's message, which the range scanner counts as a scanned unit. Findings stay 0.

```text
node tools/security/scan_secrets.js --staged
RESULT: 0 files scanned (0 with NUL bytes, 0 text with a binary extension), 0 binary skipped, 0 findings, 0 allowed, 0 baselined, 0 stale allowlist entries, 0 stale baseline entries
EXIT_STAGED=0
```

### SEC-2026-09-26-01

No secret value is written here. An in-memory check loaded `scanLine` on the historical blobs and compared `sha256` to `tools/security/secrets_baseline.json`. `EXIT_FP=0`.

- Baseline: 1 entry, rule `HIGH_ENTROPY`, incident `SEC-2026-09-26-01`, `onlyInHistoryBefore` `e8375c904a8287fd7afd1c76bc63ab94d9dd6a62`, `addedIn` `224b1b36dad8c3c77a7aef3a46e7980790361a2a` and `d1fbeab84a9ca07fce905f65d5bbffc6148c566c`. Fingerprint is 64 lowercase hex.
- `224b1b36:tools/generate_nano_banana_pro.js` line 14: 1 hit, `HIGH_ENTROPY` length 50, fingerprint matches.
- `224b1b36:docs/STATUS.md` line 12: 1 hit, `HIGH_ENTROPY` length 50, fingerprint matches.
- `d1fbeab8:docs/archive/STATUS_LEDGER_20260925.md` line 3682: 1 hit, `HIGH_ENTROPY` length 50, fingerprint matches.
- The same two lines in the tree of `e8375c904a8287fd7afd1c76bc63ab94d9dd6a62`: 0 hits.
- Both `addedIn` commits are ancestors of the fix (`git merge-base --is-ancestor` status 0).
- The value is absent from `tools/security/**`, `tasks/OPS.70.02/**`, and the three granted files at this tip (`VALUE_PRESENT_IN none`).
- `docs/telemetry/security_incidents.json` does not contain the fingerprint. It contains `"value_recorded":  false`.
- `tools/generate_nano_banana_pro.js` at this tip assigns `const API_KEY = process.env.GEMINI_API_KEY;` and has no `GEMINI_API_KEY ||` fallback.
- Ledger line 3682 contains the marker `[REDACTED — revoked credential, see SECURITY incident 2026-09-26]` (line length 552).

`git merge-base --is-ancestor e8375c904a8287fd7afd1c76bc63ab94d9dd6a62 HEAD` exited 0. `git merge-base --is-ancestor e8375c904a8287fd7afd1c76bc63ab94d9dd6a62 origin/main` exited 1. The same fingerprint still matches line 14 of `origin/main:tools/generate_nano_banana_pro.js` and line 3682 of `origin/main:docs/archive/STATUS_LEDGER_20260925.md` (one `HIGH_ENTROPY` hit of length 50 on each). See MAJOR.

### DEC-007

This review generated no art. Files added between the merge-base and this tip are the lane's markdown, JSON, JavaScript, and text evidence, plus `docs/telemetry/security_incidents.json`. No image, audio, or `art/**` path is in that added set. The PNG files in the two-dot diff from `425b594c` are Lane K evidence that arrived with the main merge. The generator script was not run.

### Mutants and failing fixtures

The gate stdout has 0 lines that start with `FAIL`. A killed mutant is reported as `PASS mutant_<name>_killed (killed by <check>)`. The suite evaluates the check against an in-memory copy and records the check name when the check returns not-ok (`tools/security/test_support.js`). A second run of each suite, with that one line patched in memory only (the files on disk were not written), printed the failing check. Both reruns still ended `RESULT: 156 passed, 0 failed` and `RESULT: 80 passed, 0 failed`, exit 0.

Inner failures (token-like substrings of length 8 or more replaced with `[REDACTED]` before this file was written):

```text
MUTANT_INNER_FAIL name=rule_PRIVATE_KEY_PEM_off check=detects_PRIVATE_KEY_PEM why=threw: [REDACTED] 1 finding on planted.txt:2, got 0
MUTANT_INNER_FAIL name=rule_OPENAI_KEY_off check=detects_OPENAI_KEY why=threw: rule [REDACTED]
MUTANT_INNER_FAIL name=entropy_off check=detects_HIGH_ENTROPY why=threw: [REDACTED] 1 finding on planted.txt:14, got 0
MUTANT_INNER_FAIL name=redaction_off check=redaction_text_output_keeps_4_chars why=a [REDACTED] piece of a [REDACTED] [REDACTED] value is in the output
MUTANT_INNER_FAIL name=allowlist_staleness_off check=allowlist_stale_entry_fails why=threw: exit 0
MUTANT_INNER_FAIL name=baseline_off check=baseline_historical_finding_passes why=threw: exit 1, [REDACTED] 1
MUTANT_INNER_FAIL name=libs_baseline_off check=libs_changed_removed_added_detected why=threw: exit 0
MUTANT_INNER_FAIL name=npm_require_off check=npm_require_detected why=threw: [REDACTED]: [REDACTED].js:1 nw.gui
```

Those eight are the sample. The corresponding gate lines are `PASS mutant_rule_PRIVATE_KEY_PEM_off_killed`, `PASS mutant_rule_OPENAI_KEY_off_killed`, `PASS mutant_entropy_off_killed`, `PASS mutant_redaction_off_killed`, `PASS mutant_allowlist_staleness_off_killed`, `PASS mutant_baseline_off_killed`, `PASS mutant_libs_baseline_off_killed`, and `PASS mutant_npm_require_off_killed`.

Fixture checks that require the tool to fail, and that passed: `head_findings_exit_1_and_counts`, `allowlist_stale_entry_fails`, `baseline_readded_later_commit_fails`, `baseline_different_value_fails`, `baseline_head_occurrence_fails`, `npm_require_detected`, `missing_relative_detected_literal_and_folded`, `libs_changed_removed_added_detected`, `dep_baseline_stale_entry_fails`.

## Findings

### BLOCKER

The required diff `git diff --name-status 425b594c146d5f353c10faa11f4b5d47f499b45f a98d31c5e1314b4dbed243a5097092ea7d1159f1` contains 171 paths that are outside `tools/security/**`, outside `tasks/OPS.70.02/**`, and outside the three STATUS-granted paths. The review rule flags each of them. They are listed in the scope block above. Grouped: `docs/STATUS.md` (1), `docs/systems/**` (2), `game/js/**` (3), `tasks/WG.00.09b/**` (162), `tools/bench_render_layers.js` (1), `tools/test_layer_render_flat.js` (1), `tools/test_minimap.js` (1).

Those 171 paths match merge-base `96483c517a95b10c5d52aec85d3b18ea01e599b4` byte for byte. No commit in `96483c517a95b10c5d52aec85d3b18ea01e599b4..a98d31c5e1314b4dbed243a5097092ea7d1159f1` touches them. They arrived through the PM merge `86c074dad67a3db51082301d3571ef2675bf7c54`, which BRIEF_RESUME1 required. The lane's own diff against that merge-base stays inside the allowed set and the three grants.

### MAJOR

`docs/telemetry/security_incidents.json` says the credential was removed from the working tree on main in `e8375c904a8287fd7afd1c76bc63ab94d9dd6a62` and that verification is "main tree clean after the fix". `e8375c904a8287fd7afd1c76bc63ab94d9dd6a62` is an ancestor of this tip (ancestor check exit 0) and is not an ancestor of `origin/main` (ancestor check exit 1). Both recorded locations on `origin/main` still match the baseline fingerprint (`HIGH_ENTROPY`, length 50). This tip's copies do not. The incident file was written in `e8375c90` and `abad39c7`. BRIEF_RESUME1 tells the lane not to edit the three fix files again.

### MINOR

`REPORT.md` says `git diff --name-only 425b594c146d5f353c10faa11f4b5d47f499b45f..HEAD` lists 188 paths. At this tip that command lists 204 paths. The extra 16 are the report commit, all under `tasks/OPS.70.02/**`. The saved `evidence/scope_diff.txt` and the 188 count match the parent `1408390ffcf6db9fc189adcb721b8a4fe8ddb991`, which the report names as the gate commit. The out-of-scope set does not change between those two commits.

## Verdict

The scanner and the dependency checker match the reported gates: both suites exit 0, the HEAD scan and the dependency check exit 0 with no unbaselined findings, syntax check exits 0, the historical SEC-2026-09-26-01 value is fingerprinted and baselined only for the named history, and sampled mutants fail their killing checks. The required scope diff still contains 171 paths outside the allowed set and the three grants.

VERDICT: FAIL
