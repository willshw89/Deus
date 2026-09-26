# OPS.30.01 lane-y re-review (Grok, xhigh)

Re-review at xhigh (supersedes the version at cecdea37)

Reviewed writer tip, pasted from `git rev-parse HEAD^^` on `task/lane-y`:

```
d07396bc2b11881b7a36e05831d910b8c41e352b
```

This review grades `d07396bc2b11881b7a36e05831d910b8c41e352b` only. The branch tip at review time is the PM commit on top of the earlier high-effort review. No production code, brief, fixture, or tool was edited. No art was generated.

## Tip check

`git rev-parse HEAD`, `git rev-parse HEAD^`, `git rev-parse HEAD^^`, then `git diff-tree --no-commit-id --name-status -r HEAD`, then `git log -8 --format="%H %an %s"`:

```
16dea77ca4e124548276747cd1ebddce92754447
cecdea3704c242b76d31023807f06aa06b9cc569
d07396bc2b11881b7a36e05831d910b8c41e352b
M	tasks/OPS.30.01/lane-y/BRIEF.md
16dea77ca4e124548276747cd1ebddce92754447 deus-pm [pm] OPS.30.01 lane-y: BRIEF records the PM CRLF ruling on escalation.md (10:40 CT): hand merge after the LF-clone suite proof
cecdea3704c242b76d31023807f06aa06b9cc569 deus-grok [grok] OPS.30.01 review d07396bc
d07396bc2b11881b7a36e05831d910b8c41e352b deus-claude [claude] OPS.30.01 REPORT.md: record the report commit hash
20b8a5455f1065311ed760b29aefb1882894f524 deus-claude [claude] OPS.30.01 REPORT.md (gate tests, CRLF finding, scope) and escalation.md: gate suites fail on CRLF checkouts made like merge_gate.js's
e5f1dafc42defd88590a703f45393607b4a868c5 deus-claude [claude] OPS.30.01 REPORT.md draft (census tables spliced in; gate tests and scope still to paste)
d0165dfd42fa7c2f3f49a21bd2d2205479c3b3b6 deus-claude [claude] OPS.30.01 quarantine.json (3-run census of 425b594c plus test_run_gate.js), census tables, raw logs, supplementary 580 s run of the timed-out suites
2d9f513c40c683338d50c6ea3dc945b5fb4687c5 deus-claude [claude] OPS.30.01 test_run_gate.js: --screen check; census run 3 evidence
f0008ce45b0177e78a973b94edd1e94e307e0a52 deus-claude [claude] OPS.30.01 WIP census runs 1 and 2 (fresh clones of 425b594c, runner 33357307)
```

HEAD is `16dea77ca4e124548276747cd1ebddce92754447`. Its parent is `cecdea3704c242b76d31023807f06aa06b9cc569`. That commit's parent is `d07396bc2b11881b7a36e05831d910b8c41e352b`. `git diff-tree` for HEAD lists only `tasks/OPS.30.01/lane-y/BRIEF.md`. `git diff --stat d07396bc2b11881b7a36e05831d910b8c41e352b HEAD` is that brief plus the previous copy of this review file (5 + 760 lines). The runner, the test, the fixtures, and `quarantine.json` at the tip are the writer tip.

Untracked launch prompts under `tasks/OPS.30.01/lane-y/launches/` were left unstaged.

## How this was run

Fresh clone, then detach (not the live worktree):

```
git clone -c core.autocrlf=false C:\Users\snewt\.deus_worktrees\lane-y C:\Users\snewt\AppData\Local\Temp\deus-lane-y-rereview-d07396bc
CLONE_EXIT=0
git checkout --detach d07396bc2b11881b7a36e05831d910b8c41e352b
CHECKOUT_EXIT=0
HEAD is now at d07396bc [claude] OPS.30.01 REPORT.md: record the report commit hash
d07396bc2b11881b7a36e05831d910b8c41e352b
core.autocrlf=false
```

Byte check on that tree (`cr` = 0x0D count): `tools/test_historical_carrying_capacity.js` 50572 bytes, cr 0, lf 608; `tools/test_new_game_year0.js` 27395 / 0 / 490; `tools/test_strata_cuts_and_caves.js` 85055 / 0 / 1166; `tools/ops/run_gate.js` 66326 / 0 / 1213; `game/js/plugins/DEUS_HistoricalDemographics.js` 52898 / 0 / 608. The frozen length in the carrying-capacity suite is `CANDIDATE_BYTES = 52898` (`tools/test_historical_carrying_capacity.js:18`). The LF plugin file is that length.

The clone was deleted after the commands below. There is no `BRIEF_*.md` beside `BRIEF.md`.

`git diff --stat e5f1dafc42defd88590a703f45393607b4a868c5 d07396bc2b11881b7a36e05831d910b8c41e352b` touches only `REPORT.md`, `escalation.md`, `analysis/scope_check.js`, and four evidence logs. `git diff --stat 2d9f513c40c683338d50c6ea3dc945b5fb4687c5 d07396bc2b11881b7a36e05831d910b8c41e352b -- tools/ops/run_gate.js tools/ops/test_run_gate.js tools/ops/fixtures` is empty. The writer's gate-test commit and the three `test_run_gate.js` census runs are the same runner and test as the tip.

## Scope

In the LF clone:

```
git merge-base origin/main d07396bc2b11881b7a36e05831d910b8c41e352b
MERGE_BASE=425b594c146d5f353c10faa11f4b5d47f499b45f
MERGE_BASE_EXIT=0
git rev-parse origin/main
8325325d82831402f45ea94561efc41a5ec7a9d6
ORIGIN_MAIN_EXIT=0
git diff --name-status 425b594c146d5f353c10faa11f4b5d47f499b45f d07396bc2b11881b7a36e05831d910b8c41e352b
DIFF_EXIT=0
SCOPE_LINES=522
```

The clone's `origin/main` is the source repo's `refs/heads/main` (`8325325d82831402f45ea94561efc41a5ec7a9d6`). In the live worktree, `git rev-parse origin/main` is `9c0e7b57e93dee27ccc163f669531b348456955c` and `git merge-base origin/main d07396bc2b11881b7a36e05831d910b8c41e352b` is still `425b594c146d5f353c10faa11f4b5d47f499b45f` (`WT_MB_EXIT=0`). `425b594c146d5f353c10faa11f4b5d47f499b45f` is an ancestor of both the writer tip and the worktree's `origin/main` (both ancestor checks `EXIT=0`). The name-status below is that merge-base to the writer tip.

| Allowed glob | Paths | Outside? |
|---|---:|---|
| `tools/ops/run_gate.js` | 1 | no |
| `tools/ops/test_run_gate.js` | 1 | no |
| `tools/ops/quarantine.json` | 1 | no |
| `tools/ops/fixtures/run_gate/**` | 43 | no |
| `tasks/OPS.30.01/**` | 476 | no |
| any other path | 0 | |
| total | 522 | |

Every line is status `A`. Extensions: `.md` 4, `.js` 29, `.json` 29, `.log` 458, `.txt` 1. No `.png`, `.jpg`, `.gif`, `.bmp`, `.webp`, `.psd`, or `.svg`. `tools/ops/gate_tests.json` is not in the diff.

### Full name-status

```
A	tasks/OPS.30.01/lane-y/BRIEF.md
A	tasks/OPS.30.01/lane-y/REPORT.md
A	tasks/OPS.30.01/lane-y/analysis/report_tables.js
A	tasks/OPS.30.01/lane-y/analysis/scope_check.js
A	tasks/OPS.30.01/lane-y/escalation.md
A	tasks/OPS.30.01/lane-y/evidence/census_run1.json
A	tasks/OPS.30.01/lane-y/evidence/census_run1.log
A	tasks/OPS.30.01/lane-y/evidence/census_run2.json
A	tasks/OPS.30.01/lane-y/evidence/census_run2.log
A	tasks/OPS.30.01/lane-y/evidence/census_run3.json
A	tasks/OPS.30.01/lane-y/evidence/census_run3.log
A	tasks/OPS.30.01/lane-y/evidence/census_slow_580s.json
A	tasks/OPS.30.01/lane-y/evidence/census_slow_580s.log
A	tasks/OPS.30.01/lane-y/evidence/census_slow_580s_chunk2.log
A	tasks/OPS.30.01/lane-y/evidence/census_slow_580s_chunk3.log
A	tasks/OPS.30.01/lane-y/evidence/census_tip_run1.json
A	tasks/OPS.30.01/lane-y/evidence/census_tip_run1.log
A	tasks/OPS.30.01/lane-y/evidence/census_tip_run2.json
A	tasks/OPS.30.01/lane-y/evidence/census_tip_run2.log
A	tasks/OPS.30.01/lane-y/evidence/census_tip_run3.json
A	tasks/OPS.30.01/lane-y/evidence/census_tip_run3.log
A	tasks/OPS.30.01/lane-y/evidence/check_lists_worktree.log
A	tasks/OPS.30.01/lane-y/evidence/classify_tests_output_at_425b594c.md
A	tasks/OPS.30.01/lane-y/evidence/classify_tests_run.log
A	tasks/OPS.30.01/lane-y/evidence/crlf_ab.log
A	tasks/OPS.30.01/lane-y/evidence/gate_broken_suite.log
A	tasks/OPS.30.01/lane-y/evidence/gate_fresh_clone.log
A	tasks/OPS.30.01/lane-y/evidence/gatetests_clone.log
A	tasks/OPS.30.01/lane-y/evidence/gatetests_clone_gate.log
A	tasks/OPS.30.01/lane-y/evidence/gatetests_worktree.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__art__test_blank_templates.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__art__test_catalogue.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__art__test_place_art.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__check_deus_syntax.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__governance__test_check_claims.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__governance__test_merge_gate.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__sim__test_ledger.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__sim__test_ledger_longrun.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_19b_performance_determinism.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_adam_res.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_adam_scales.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_aging_and_lifespan.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_agriculture.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_all_object_charsets.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_all_walk_cycles.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_autonomous_project_dispatch.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_autonomous_settlement_closure.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_autonomous_work_recovery.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_biome_standard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_birth_rate_halved.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_callings_system.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_clean_attack_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_clean_bow_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_clean_downed_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_clean_haul_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_clean_magic_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_clean_u7_composites.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_clean_walk_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_clean_walk_sheet2.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_clean_walk_sheet3.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_clean_work_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_column_landforms.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_combat_dying_integration.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_conditions_native_closure.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_conditions_system.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_cooperative_building_and_offspring_pairbonding.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_culture_growth.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_d20_equipment_slots.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_deer_action_boxes.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_diagonal_corners_and_doorways.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_duplicate_registration.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_dynamic_armor_reflection.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_ecology.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_extraction_difficulty.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_eye_variations.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_facing_detection.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_faction_construction_and_homes.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_faction_founder_pairbonding.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_faction_reproduction.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_faction_starting_gear.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_family_compounds_and_shops.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_family_integration.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_farm_view.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_female_u7_composites.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_ff5_candidates.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_ff5_proportions_and_footsteps.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_fire_safety.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_fix_facings.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_fixed_cycle.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_fixed_walk_playback.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_foliage_sprite_animations.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_gen3_metrics.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_generated_z2_cut_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_generator_combinations.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_geology_strata.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_goals.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_ground_shades_prototype.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_hare_action_boxes.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_haul_builder.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_hazard_reflex.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_hazard_torture_live.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_hearth_containment_and_provenance.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_hist_metadata_contracts.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_historical_carrying_capacity.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_history_materialization_and_world_age.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_households.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_human_inheritance.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_liquid_depth_simulation.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_material_recipes.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_material_refining_and_tech_pacing.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_material_substitution.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_minimap.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_multi_deficit_settlement.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_native_resolution_standard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_native_survival_soak.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_natural_connections.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_new_game_year0.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_object_art.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_object_originality.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_palette.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_palette_standard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_physical_inventory_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_population_growth_and_immigration.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_portrait_clothing_offsets.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_process_human_12.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_production_history_demographics.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_profile_tabs.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_project_construction_loop.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_r4c2_foreshorten.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_regrowth_construction_guard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_resize_face.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_resource_economy_standard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_resource_node_materials.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_round_world.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_sanitation_system.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_scale_standard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_seamless_map_edges.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_second_by_second_history.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_settlement_domestic_housing.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_settlement_expansion_multi_dwelling.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_settlement_pillars.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_settlement_projects.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_sheep_action_boxes.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_side_combos.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_slice_human.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_srd_character_presentation.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_srd_combat_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_srd_equipment_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_srd_parity.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_srd_rules_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_stabilization.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_starter_kit_and_stockpile.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_stockpiles_designation.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_strata_cuts_and_caves.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_strata_fluid_reconciliation.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_strata_foundation.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_survival_needs_loop.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_survival_regressions.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_time_domains_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_u7_modular_composition.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_unified_capability_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_upper_elevation_terrain.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_v2_clean_u7_composites.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_var2_suite.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_var_suite.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_vertical_worldgen_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_volumetric_terrain_column.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_walk_triplets.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_wolf_cleanup.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_z_cavern_gen.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_z_doors.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_z_fire.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_z_floors.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_z_flora.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_z_ownership.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run1/tools__test_z_walls.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__art__test_blank_templates.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__art__test_catalogue.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__art__test_place_art.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__check_deus_syntax.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__governance__test_check_claims.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__governance__test_merge_gate.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__sim__test_ledger.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__sim__test_ledger_longrun.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_19b_performance_determinism.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_adam_res.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_adam_scales.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_aging_and_lifespan.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_agriculture.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_all_object_charsets.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_all_walk_cycles.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_autonomous_project_dispatch.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_autonomous_settlement_closure.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_autonomous_work_recovery.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_biome_standard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_birth_rate_halved.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_callings_system.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_clean_attack_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_clean_bow_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_clean_downed_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_clean_haul_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_clean_magic_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_clean_u7_composites.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_clean_walk_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_clean_walk_sheet2.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_clean_walk_sheet3.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_clean_work_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_column_landforms.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_combat_dying_integration.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_conditions_native_closure.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_conditions_system.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_cooperative_building_and_offspring_pairbonding.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_culture_growth.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_d20_equipment_slots.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_deer_action_boxes.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_diagonal_corners_and_doorways.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_duplicate_registration.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_dynamic_armor_reflection.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_ecology.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_extraction_difficulty.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_eye_variations.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_facing_detection.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_faction_construction_and_homes.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_faction_founder_pairbonding.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_faction_reproduction.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_faction_starting_gear.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_family_compounds_and_shops.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_family_integration.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_farm_view.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_female_u7_composites.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_ff5_candidates.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_ff5_proportions_and_footsteps.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_fire_safety.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_fix_facings.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_fixed_cycle.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_fixed_walk_playback.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_foliage_sprite_animations.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_gen3_metrics.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_generated_z2_cut_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_generator_combinations.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_geology_strata.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_goals.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_ground_shades_prototype.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_hare_action_boxes.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_haul_builder.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_hazard_reflex.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_hazard_torture_live.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_hearth_containment_and_provenance.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_hist_metadata_contracts.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_historical_carrying_capacity.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_history_materialization_and_world_age.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_households.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_human_inheritance.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_liquid_depth_simulation.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_material_recipes.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_material_refining_and_tech_pacing.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_material_substitution.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_minimap.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_multi_deficit_settlement.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_native_resolution_standard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_native_survival_soak.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_natural_connections.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_new_game_year0.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_object_art.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_object_originality.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_palette.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_palette_standard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_physical_inventory_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_population_growth_and_immigration.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_portrait_clothing_offsets.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_process_human_12.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_production_history_demographics.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_profile_tabs.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_project_construction_loop.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_r4c2_foreshorten.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_regrowth_construction_guard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_resize_face.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_resource_economy_standard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_resource_node_materials.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_round_world.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_sanitation_system.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_scale_standard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_seamless_map_edges.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_second_by_second_history.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_settlement_domestic_housing.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_settlement_expansion_multi_dwelling.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_settlement_pillars.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_settlement_projects.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_sheep_action_boxes.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_side_combos.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_slice_human.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_srd_character_presentation.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_srd_combat_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_srd_equipment_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_srd_parity.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_srd_rules_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_stabilization.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_starter_kit_and_stockpile.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_stockpiles_designation.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_strata_cuts_and_caves.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_strata_fluid_reconciliation.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_strata_foundation.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_survival_needs_loop.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_survival_regressions.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_time_domains_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_u7_modular_composition.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_unified_capability_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_upper_elevation_terrain.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_v2_clean_u7_composites.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_var2_suite.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_var_suite.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_vertical_worldgen_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_volumetric_terrain_column.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_walk_triplets.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_wolf_cleanup.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_z_cavern_gen.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_z_doors.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_z_fire.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_z_floors.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_z_flora.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_z_ownership.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run2/tools__test_z_walls.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__art__test_blank_templates.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__art__test_catalogue.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__art__test_place_art.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__check_deus_syntax.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__governance__test_check_claims.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__governance__test_merge_gate.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__sim__test_ledger.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__sim__test_ledger_longrun.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_19b_performance_determinism.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_adam_res.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_adam_scales.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_aging_and_lifespan.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_agriculture.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_all_object_charsets.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_all_walk_cycles.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_autonomous_project_dispatch.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_autonomous_settlement_closure.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_autonomous_work_recovery.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_biome_standard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_birth_rate_halved.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_callings_system.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_clean_attack_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_clean_bow_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_clean_downed_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_clean_haul_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_clean_magic_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_clean_u7_composites.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_clean_walk_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_clean_walk_sheet2.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_clean_walk_sheet3.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_clean_work_sheet.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_column_landforms.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_combat_dying_integration.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_conditions_native_closure.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_conditions_system.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_cooperative_building_and_offspring_pairbonding.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_culture_growth.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_d20_equipment_slots.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_deer_action_boxes.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_diagonal_corners_and_doorways.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_duplicate_registration.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_dynamic_armor_reflection.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_ecology.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_extraction_difficulty.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_eye_variations.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_facing_detection.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_faction_construction_and_homes.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_faction_founder_pairbonding.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_faction_reproduction.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_faction_starting_gear.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_family_compounds_and_shops.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_family_integration.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_farm_view.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_female_u7_composites.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_ff5_candidates.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_ff5_proportions_and_footsteps.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_fire_safety.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_fix_facings.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_fixed_cycle.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_fixed_walk_playback.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_foliage_sprite_animations.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_gen3_metrics.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_generated_z2_cut_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_generator_combinations.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_geology_strata.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_goals.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_ground_shades_prototype.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_hare_action_boxes.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_haul_builder.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_hazard_reflex.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_hazard_torture_live.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_hearth_containment_and_provenance.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_hist_metadata_contracts.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_historical_carrying_capacity.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_history_materialization_and_world_age.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_households.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_human_inheritance.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_liquid_depth_simulation.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_material_recipes.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_material_refining_and_tech_pacing.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_material_substitution.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_minimap.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_multi_deficit_settlement.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_native_resolution_standard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_native_survival_soak.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_natural_connections.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_new_game_year0.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_object_art.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_object_originality.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_palette.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_palette_standard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_physical_inventory_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_population_growth_and_immigration.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_portrait_clothing_offsets.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_process_human_12.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_production_history_demographics.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_profile_tabs.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_project_construction_loop.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_r4c2_foreshorten.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_regrowth_construction_guard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_resize_face.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_resource_economy_standard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_resource_node_materials.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_round_world.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_sanitation_system.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_scale_standard.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_seamless_map_edges.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_second_by_second_history.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_settlement_domestic_housing.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_settlement_expansion_multi_dwelling.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_settlement_pillars.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_settlement_projects.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_sheep_action_boxes.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_side_combos.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_slice_human.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_srd_character_presentation.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_srd_combat_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_srd_equipment_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_srd_parity.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_srd_rules_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_stabilization.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_starter_kit_and_stockpile.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_stockpiles_designation.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_strata_cuts_and_caves.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_strata_fluid_reconciliation.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_strata_foundation.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_survival_needs_loop.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_survival_regressions.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_time_domains_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_u7_modular_composition.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_unified_capability_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_upper_elevation_terrain.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_v2_clean_u7_composites.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_var2_suite.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_var_suite.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_vertical_worldgen_proof.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_volumetric_terrain_column.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_walk_triplets.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_wolf_cleanup.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_z_cavern_gen.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_z_doors.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_z_fire.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_z_floors.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_z_flora.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_z_ownership.js.log
A	tasks/OPS.30.01/lane-y/evidence/logs/run3/tools__test_z_walls.js.log
A	tasks/OPS.30.01/lane-y/evidence/merge.log
A	tasks/OPS.30.01/lane-y/evidence/strata_cuts_standalone.log
A	tasks/OPS.30.01/lane-y/evidence/superseded/census_run1_rules_v1.json
A	tasks/OPS.30.01/lane-y/evidence/superseded/census_run1_rules_v1.log
A	tasks/OPS.30.01/lane-y/lane.json
A	tasks/OPS.30.01/lane-y/launches/20260926_070955_prompt.txt
A	tasks/OPS.30.01/lane-y/leftover_check.js
A	tasks/OPS.30.01/lane-y/wait_for_exit.js
A	tools/ops/fixtures/run_gate/README.md
A	tools/ops/fixtures/run_gate/helpers/api.js
A	tools/ops/fixtures/run_gate/helpers/harness_helper.js
A	tools/ops/fixtures/run_gate/helpers/launcher.js
A	tools/ops/fixtures/run_gate/helpers/plugin_notes.js
A	tools/ops/fixtures/run_gate/helpers/sleeper.js
A	tools/ops/fixtures/run_gate/lists/cl_gate_duplicate.json
A	tools/ops/fixtures/run_gate/lists/cl_gate_in_both.json
A	tools/ops/fixtures/run_gate/lists/cl_gate_missing_path.json
A	tools/ops/fixtures/run_gate/lists/cl_gate_nw.json
A	tools/ops/fixtures/run_gate/lists/cl_gate_ok.json
A	tools/ops/fixtures/run_gate/lists/cl_gate_quarantined_in_gate_tests.json
A	tools/ops/fixtures/run_gate/lists/cl_quarantine_bad_schema.json
A	tools/ops/fixtures/run_gate/lists/cl_quarantine_duplicate.json
A	tools/ops/fixtures/run_gate/lists/cl_quarantine_no_nw.json
A	tools/ops/fixtures/run_gate/lists/cl_quarantine_nw_as_pass.json
A	tools/ops/fixtures/run_gate/lists/cl_quarantine_nw_stale.json
A	tools/ops/fixtures/run_gate/lists/cl_quarantine_ok.json
A	tools/ops/fixtures/run_gate/lists/cl_quarantine_unlisted.json
A	tools/ops/fixtures/run_gate/lists/gate_all_pass.json
A	tools/ops/fixtures/run_gate/lists/gate_empty.json
A	tools/ops/fixtures/run_gate/lists/gate_invalid.json
A	tools/ops/fixtures/run_gate/lists/gate_missing_suite.json
A	tools/ops/fixtures/run_gate/lists/gate_names_nw.json
A	tools/ops/fixtures/run_gate/lists/gate_one_fails.json
A	tools/ops/fixtures/run_gate/suites/dotnet_missing_file.js
A	tools/ops/fixtures/run_gate/suites/enoent.js
A	tools/ops/fixtures/run_gate/suites/fail.js
A	tools/ops/fixtures/run_gate/suites/guard_evasion.js
A	tools/ops/fixtures/run_gate/suites/hang.js
A	tools/ops/fixtures/run_gate/suites/harness_runner_ref.js
A	tools/ops/fixtures/run_gate/suites/leak.js
A	tools/ops/fixtures/run_gate/suites/missing_module.js
A	tools/ops/fixtures/run_gate/suites/missing_plugin.js
A	tools/ops/fixtures/run_gate/suites/nw_binary_ref.js
A	tools/ops/fixtures/run_gate/suites/pass.js
A	tools/ops/fixtures/run_gate/suites/plugin_comment.js
A	tools/ops/fixtures/run_gate/suites/plugin_not_loaded.js
A	tools/ops/fixtures/run_gate/suites/stderr_decides.js
A	tools/ops/fixtures/run_gate/suites/stdout_only.js
A	tools/ops/fixtures/run_gate/suites/type_error.js
A	tools/ops/fixtures/run_gate/suites/via_helper.js
A	tools/ops/fixtures/run_gate/suites/via_spawned_script.js
A	tools/ops/quarantine.json
A	tools/ops/run_gate.js
A	tools/ops/test_run_gate.js
```

## lane.json gateTests (LF clone of d07396bc)

Commands were the four `lane.json` entries, from the clone root. Shell exit is `EXIT=`.

### a. `node tools/ops/test_run_gate.js`

```
test_run_gate: fixtures in C:\Users\snewt\AppData\Local\Temp\deus-test-run-gate-cyLYqP
PASS gate_all_pass_exit_0
PASS gate_default_timeout_600
PASS gate_line_format
PASS gate_one_suite_broken_exit_1
PASS gate_failure_shows_deciding_line
PASS gate_refuses_nwjs_in_list_exit_2_runs_nothing
PASS gate_refuses_nwjs_suite_named_exit_2
PASS gate_refuses_transitive_nwjs_exit_2
PASS gate_timeout_exit_1
PASS gate_timeout_killed_suite_and_child
PASS gate_empty_list_exit_2
PASS gate_invalid_list_exit_2
PASS gate_missing_suite_exit_2
PASS screen_mode_runs_nothing
PASS usage_unknown_flag_exit_2
PASS usage_concurrency_above_3_exit_2
PASS usage_census_without_out_exit_2
PASS census_complete_exit_0
PASS census_rows_are_the_tracked_suites
PASS category_test_pass_PASS
PASS category_test_pass_nested_PASS
PASS category_test_fail_FAIL_OTHER
PASS category_test_hang_KILLED_TIMEOUT
PASS category_test_leak_PASS
PASS category_test_missing_module_FAIL_MISSING_DEPENDENCY
PASS category_test_missing_plugin_FAIL_MISSING_REFERENCE
PASS category_test_enoent_FAIL_MISSING_REFERENCE
PASS category_test_type_error_FAIL_API_DRIFT
PASS category_test_stdout_only_FAIL_MISSING_REFERENCE
PASS category_test_stderr_decides_FAIL_OTHER
PASS category_test_nw_binary_ref_NEEDS_NWJS
PASS category_test_harness_runner_ref_NEEDS_NWJS
PASS category_test_via_helper_NEEDS_NWJS
PASS category_test_via_spawned_script_NEEDS_NWJS
PASS category_test_plugin_comment_PASS
PASS category_test_guard_evasion_NEEDS_NWJS
PASS category_test_dotnet_missing_file_FAIL_MISSING_REFERENCE
PASS category_test_plugin_not_loaded_FAIL_MISSING_REFERENCE
PASS census_needs_nwjs_never_spawned
PASS census_every_other_suite_ran
PASS census_nwjs_rows_carry_screen_evidence
PASS census_hang_killed_with_its_child
PASS census_leak_child_swept
PASS census_guard_evasion_blocked
PASS census_deciding_lines
PASS census_row_fields
PASS census_gate_flag
PASS census_lines_hide_root_path
PASS census_log_dir_one_log_per_run_suite
PASS census_defaults_180s_3_at_once
PASS census_budget_partial_exit_3
PASS census_resume_completes_exit_0
PASS census_refuses_to_overwrite_complete_exit_2
PASS census_refuses_nwjs_suite_named_exit_2
PASS check_lists_ok_exit_0
PASS check_lists_default_gate_list_exit_0
PASS check_lists_duplicate_in_gate
PASS check_lists_unlisted_suite
PASS check_lists_duplicate_in_quarantine
PASS check_lists_missing_path
PASS check_lists_suite_in_gate_and_quarantine
PASS check_lists_suite_in_gate_and_gate_tests_quarantine
PASS check_lists_bad_schema
PASS check_lists_needs_nwjs_in_gate
PASS check_lists_needs_nwjs_recorded_passing
PASS check_lists_stale_needs_nwjs
PASS check_lists_invalid_gate_list
PASS check_lists_missing_quarantine_file
PASS check_lists_runs_no_suite
PASS merge_three_agreeing_runs
PASS merge_output_passes_check_lists
PASS merge_flaky_suite_is_fail_other
PASS merge_refuses_partial_census_exit_2
PASS merge_refuses_missing_run_exit_2
PASS stdin_baseline_setGateFail
PASS mutant_gate_ignores_failing_exit_killed
    mutant gate_ignores_failing_exit caught by: gate_one_suite_broken_exit_1
PASS stdin_baseline_setTimeoutKill
PASS mutant_timeout_removed_killed
    mutant timeout_removed caught by: gate_timeout_exit_1, gate_timeout_killed_suite_and_child
PASS stdin_baseline_setScreenGate
PASS mutant_needs_nwjs_screen_removed_killed
    mutant needs_nwjs_screen_removed caught by: gate_refuses_nwjs_suite_named_exit_2
PASS stdin_baseline_setMissingModule
PASS mutant_missing_module_rule_swapped_killed
    mutant missing_module_rule_swapped caught by: census_missing_module_category
PASS stdin_baseline_setDuplicate
PASS mutant_check_lists_duplicate_check_removed_killed
    mutant check_lists_duplicate_check_removed caught by: check_lists_duplicate_in_gate
PASS stdin_baseline_setTreeKill
PASS mutant_tree_kill_removed_killed
    mutant tree_kill_removed caught by: census_timeout_tree_killed_before_sweep
PASS stdin_baseline_setTransitive
PASS mutant_transitive_screen_removed_killed
    mutant transitive_screen_removed caught by: gate_refuses_transitive_nwjs_exit_2
PASS mutant_gate_nwjs_refusal_removed_killed
    mutant gate_nwjs_refusal_removed caught by: gate_refuses_nwjs_suite_named_exit_2
PASS stdin_baseline_setGuard
PASS mutant_runtime_guard_removed_killed
    mutant runtime_guard_removed caught by: census_runtime_guard_blocks_launch
PASS stdin_baseline_setLeak
PASS mutant_leftover_sweep_removed_killed
    mutant leftover_sweep_removed caught by: census_leftover_child_swept
PASS stdin_baseline_setUnlisted
PASS mutant_check_lists_unlisted_check_removed_killed
    mutant check_lists_unlisted_check_removed caught by: check_lists_unlisted_suite
PASS run_gate_on_disk_unchanged
PASS no_leftover_processes
RESULT: 97 passed, 0 failed
EXIT=0
```

Wall time about 60 s. Eleven mutants, each killed on an in-memory copy (`node -`). The on-disk runner hash check passed.

### b. `node tools/ops/run_gate.js --check-lists`

```
run_gate: check-lists, root C:\Users\snewt\AppData\Local\Temp\deus-lane-y-rereview-d07396bc, gate list C:\Users\snewt\AppData\Local\Temp\deus-lane-y-rereview-d07396bc\tools\ops\gate_tests.json, quarantine C:\Users\snewt\AppData\Local\Temp\deus-lane-y-rereview-d07396bc\tools\ops\quarantine.json
NOTE: tools/test_generated_z2_cut_proof.js is on the gate_tests.json quarantine list but quarantine.json records it passing in every run
CHECK-LISTS: OK (9 gate, 117 quarantined, 63 passingNotGated, 188 tracked suites)
EXIT=0
```

The NOTE is the writer's PROPOSED-Y-02. It is not a violation. 9 + 117 + 63 = 189 list entries. Tracked `test_*.js` suites are 188 because `tools/check_deus_syntax.js` is on the gate list and is not a `test_*.js` file. 117 + 63 = 180 non-gate entries, which is 188 tracked suites minus the 8 gated `test_*.js` files.

### c. `node tools/ops/run_gate.js`

Foreground, about 744 s, under the 1800 s lane timeout. LF clone, HEAD `d07396bc2b11881b7a36e05831d910b8c41e352b`.

```
run_gate: gate mode, 9 suites from C:\Users\snewt\AppData\Local\Temp\deus-lane-y-rereview-d07396bc\tools\ops\gate_tests.json, root C:\Users\snewt\AppData\Local\Temp\deus-lane-y-rereview-d07396bc, HEAD d07396bc2b11881b7a36e05831d910b8c41e352b, timeout 600 s each, one at a time
GATE tools/check_deus_syntax.js EXIT=0 3124ms
GATE tools/test_palette.js EXIT=0 43ms
GATE tools/governance/test_check_claims.js EXIT=0 218484ms
GATE tools/test_strata_cuts_and_caves.js EXIT=0 223696ms
GATE tools/test_new_game_year0.js EXIT=0 15037ms
GATE tools/test_history_materialization_and_world_age.js EXIT=0 102880ms
GATE tools/test_historical_carrying_capacity.js EXIT=0 20521ms
GATE tools/test_geology_strata.js EXIT=0 21504ms
GATE tools/test_strata_foundation.js EXIT=0 137816ms
LEFTOVERS: none
RESULT: 9 passed, 0 failed
EXIT=0
```

`tools/test_strata_cuts_and_caves.js` passed in 224 s. That is the suite the census killed at the 180 s census timeout in two of three runs. Gate mode's 600 s default holds.

### d. `node tools/check_deus_syntax.js`

```
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

## One broken suite exits 1

Independent of the test file, using the on-disk runner and `tools/ops/fixtures/run_gate/lists/gate_one_fails.json` (pass + fail):

```
GATE tools/test_pass.js EXIT=0 48ms
GATE tools/test_fail.js EXIT=1 42ms FAIL_OTHER
    | decided by other: FAIL second_check: expected 2, got 3
LEFTOVERS: none
RESULT: 1 passed, 1 failed
EXIT=1
```

The same list, with the in-memory mutant that sets `const ok = true`, returned `RESULT: 2 passed, 0 failed` and `EXIT=0`. The real check `gate_one_suite_broken_exit_1` fails on that mutant and passes on the unmutated runner. The official test records `mutant gate_ignores_failing_exit caught by: gate_one_suite_broken_exit_1`.

On the LF clone, after the nine-suite run, `tools/test_palette.js` was prefixed with `process.exit(1)` and run with `--suite` (clone only; the clone was then deleted):

```
GATE tools/test_palette.js EXIT=1 51ms FAIL_OTHER
    | decided by other: (no output; exit 1)
LEFTOVERS: none
RESULT: 0 passed, 1 failed
EXIT=1
```

## Negative checks and mutants

Five or more negative paths were run outside `test_run_gate.js`, against the same on-disk runner (or `node -` for mutants). Each one failed in the way the suite claims:

| Check | Raw result |
|---|---|
| Empty gate list | `LIST ERROR: no suite to run` / `EXIT=2` |
| `--suite tools/test_nw_binary_ref.js` | `REFUSED ... NEEDS_NWJS` / `EXIT=2` / `MARKER_EXISTS=false` |
| `--check-lists` duplicate gate list | `VIOLATION DUPLICATE: gate_tests.json gate lists tools/test_pass.js more than once` / `EXIT=1` |
| `--check-lists` missing path | `VIOLATION MISSING_PATH: ... tools/test_gone.js is not a tracked file` / `EXIT=1` |
| `--check-lists` unlisted quarantine | `VIOLATION UNLISTED: tools/test_fail.js ...` / `EXIT=1` |
| Mutant: `module_not_found` category swapped to `FAIL_API_DRIFT` | census `EXIT=0`, row `MUTANT_CATEGORY=FAIL_API_DRIFT`, line `Error: Cannot find module './fixture_helper_that_was_deleted'` |
| Mutant: gate treats every exit as success | `GATE tools/test_fail.js EXIT=1` then `RESULT: 2 passed, 0 failed` / `EXIT=0` |

The duplicate and missing-path probes also printed `VIOLATION UNLISTED` for `tools/test_missing_module.js`, because that probe repo contained an extra tracked suite the official small fixture repo does not. The official test's `check_lists_duplicate_in_gate` requires the violation set to be exactly `DUPLICATE`, and that check passed (`EXIT=0` on the suite). The product check is the strict one.

The suite itself kills all eleven mutants, including timeout removal, tree-kill removal, both NW.js refusals, the transitive screen, the runtime guard, the leftover sweep, and the unlisted check. Each baseline on unmutated source passed first (`stdin_baseline_*`).

## NW.js

`run_gate.js` spawns only `git`, `taskkill.exe`, `powershell.exe`, `ps`, and `node` (`process.execPath` plus the suite path, `shell: false`). There is no `shell: true`. The strings `nw.exe`, `nwjs`, `run_tests`, `test_snapshot`, and `game.exe` appear as screen and guard data. The static screen runs before any suite spawn. A named `NEEDS_NWJS` suite returns exit 2 and runs nothing. Every suite that does run gets `NODE_OPTIONS=--require` of a preload that wraps `child_process` spawn/exec/fork and throws instead of starting a harness command.

Checked on the writer tip:

- All 42 `quarantine.json` `NEEDS_NWJS` rows: the cited file and line contain the cited token. `NWJS 42 BAD 0`.
- `node tools/ops/run_gate.js --suite tools/test_title_menu.js` on the LF clone:

```
REFUSED tools/test_title_menu.js NEEDS_NWJS: static screen: tools/test_title_menu.js:48 names "nw.exe": childProcess.execSync('nw.exe game', { cwd: ROOT, timeout: 15000 });
RESULT: refused, no suite was run (1 NEEDS_NWJS)
EXIT=2
```

That is the quarantine row's screen line. The fixture `nw_binary_ref.js` only writes a marker if it is executed; the marker was absent. `census_needs_nwjs_never_spawned` passed. The guard-evasion fixture's spawned marker stayed absent (`census_guard_evasion_blocked`, `mutant_runtime_guard_removed_killed`).

## Report claims against the census files

Compared `evidence/census_run1.json`, `census_run2.json`, `census_run3.json` with `tools/ops/quarantine.json` by script (every non-gate suite, category, flaky flag, and deciding line). `PROBLEMS 0`.

| | run 1 | run 2 | run 3 |
|---|---:|---:|---:|
| suites | 188 | 188 | 188 |
| HEAD | `425b594c146d5f353c10faa11f4b5d47f499b45f` | same | same |
| partial | false | false | false |
| PASS | 70 | 70 | 72 |
| FAIL_MISSING_DEPENDENCY | 0 | 0 | 0 |
| FAIL_API_DRIFT | 19 | 19 | 19 |
| FAIL_MISSING_REFERENCE | 35 | 35 | 35 |
| FAIL_OTHER | 13 | 13 | 13 |
| KILLED_TIMEOUT | 9 | 9 | 7 |
| NEEDS_NWJS | 42 | 42 | 42 |

Agree 186 / disagree 2, same pair the report names:

- `tools/test_strata_cuts_and_caves.js` KILLED_TIMEOUT / KILLED_TIMEOUT / PASS (180165 / 180187 / 169427 ms), gate list, omitted from `quarantine.json`
- `tools/test_strata_fluid_reconciliation.js` KILLED_TIMEOUT / KILLED_TIMEOUT / PASS, stored as `FAIL_OTHER`, `flaky: true`, `runCategories` those three values

Same category and a different deciding line: 0 suites. `quarantine.json`: schema 1, `baseCommit` `425b594c146d5f353c10faa11f4b5d47f499b45f`, `measuredAt` `2026-09-26`, timeout 180, concurrency 3, runs 3, 117 suites, 63 `passingNotGated`. Non-gate counts: FAIL_OTHER 14 (the 13 stable plus the flaky row), KILLED_TIMEOUT 7, FAIL_API_DRIFT 19, FAIL_MISSING_REFERENCE 35, NEEDS_NWJS 42, PASS 63. No quarantine path is also on the gate list.

`census_tip_run1/2/3.json`: one suite, `tools/ops/test_run_gate.js`, HEAD `2d9f513c40c683338d50c6ea3dc945b5fb4687c5`, PASS, exit 0, ms 57770 / 61954 / 61256. `passingNotGated` records that path with `ms` 61954 and `measuredOn` `2d9f513c40c683338d50c6ea3dc945b5fb4687c5`.

Re-ran three quarantine rows on the LF clone with `run_gate.js --suite` (plus the NW.js row above):

```
GATE tools/test_19b_performance_determinism.js EXIT=1 83ms FAIL_API_DRIFT
    | decided by api_drift: TypeError: WA.initNewWorld is not a function
RESULT: 0 passed, 1 failed
EXIT=1

GATE tools/test_agriculture.js EXIT=1 46ms FAIL_MISSING_REFERENCE
    | decided by enoent: Error: ENOENT: no such file or directory, open '<root>\game\js\plugins\UF_Agriculture.js'
RESULT: 0 passed, 1 failed
EXIT=1

GATE tools/test_fix_facings.js EXIT=1 52ms FAIL_OTHER
    | decided by other: ReferenceError: testFiles is not defined
RESULT: 0 passed, 1 failed
EXIT=1
```

Those are the stored categories and deciding lines (`TypeError: WA.initNewWorld is not a function`, the `UF_Agriculture.js` ENOENT, `ReferenceError: testFiles is not defined`).

The full 188-suite census was not executed again. The committed run files, the merge counts, and these re-runs agree with `REPORT.md`.

## CRLF escalation (reproduced; not graded)

This is a pre-existing environment and merge-gate issue in files outside `allowedPaths`. The lane escalated it in `escalation.md` and did not edit `merge_gate.js`, `.gitattributes` (there is none), or the three suites. The fix options stay a PM/Owner decision. This review does not grade the lane down for that shared-file defect.

Reproduced with merge_gate's clone (`tools/governance/merge_gate.js` `makeClone`: `git clone --quiet --shared --no-checkout <common dir>` then `checkout --detach`), at `d07396bc2b11881b7a36e05831d910b8c41e352b`. The new clone's autocrlf came from the system file, not from the source repo's local `false`:

```
git config --show-origin --get core.autocrlf
EXIT=0
file:C:/Program Files/Git/etc/gitconfig	true
git config --get core.autocrlf
EXIT=0
true
```

Before (CRLF working tree): `DEUS_HistoricalDemographics.js` 53506 bytes, 608 CRLF, 0 bare LF. `CANDIDATE_BYTES` is 52898, so the file is longer by exactly those 608 CR bytes. `tools/test_historical_carrying_capacity.js` 51180 bytes, 608 CRLF. `tools/test_new_game_year0.js` 27885 bytes, 490 CRLF.

`node tools/ops/run_gate.js --suite tools/test_historical_carrying_capacity.js --suite tools/test_new_game_year0.js` on that tree. The logger wrote `$LASTEXITCODE` and then the captured stdout:

```
EXIT=1
GATE tools/test_historical_carrying_capacity.js EXIT=1 397ms FAIL_OTHER
    | decided by other: FAIL: Error: CANDIDATE_MISMATCH: working plugin differs from frozen candidate
GATE tools/test_new_game_year0.js EXIT=1 3259ms FAIL_OTHER
    | decided by other: Error: Override anchor found 0 times in DEUS_FactionMenus.js: this._factionIndex = 0;
LEFTOVERS: none
RESULT: 0 passed, 2 failed
```

Then, in that clone only: `git config core.autocrlf false` (`EXIT=0`), `git rm -q --cached -r .` (`EXIT=0`), `git reset -q --hard` (`EXIT=0`). HEAD stayed `d07396bc2b11881b7a36e05831d910b8c41e352b`. Config origin became `file:.git/config false`. The plugin was 52898 bytes, 0 CRLF, 608 LF, which is `CANDIDATE_BYTES`. The two test files were LF as well (50572 and 27395 bytes).

Same `run_gate` command after the reset:

```
EXIT=0
GATE tools/test_historical_carrying_capacity.js EXIT=0 22491ms
GATE tools/test_new_game_year0.js EXIT=0 19659ms
LEFTOVERS: none
RESULT: 2 passed, 0 failed
```

`tools/test_strata_cuts_and_caves.js` was not re-run here (about three to four minutes a side). The writer measured it on the same CRLF-vs-LF mechanism (`EXIT=2` harness anchor on CRLF, `EXIT=0` on LF). The two fast suites are enough to see the cause: the suites hash or search plugin source, and a `core.autocrlf=true` checkout changes those bytes. `run_gate.js` reported the non-zero suite exits. It did not cause them.

On the LF tree of that same clone, `node tools/ops/test_run_gate.js` ended `RESULT: 97 passed, 0 failed` with `EXIT=0`. The lane's own test is clean on LF. The merge-gate failure mode is gate test 3, `node tools/ops/run_gate.js`, because three pre-existing gate suites (`tools/test_strata_cuts_and_caves.js`, `tools/test_new_game_year0.js`, `tools/test_historical_carrying_capacity.js`) see CRLF bytes. Those paths are outside this lane. The PM note on `BRIEF.md` (`16dea77c`) is hand merge after an LF-clone proof.

## DEC-007

The diff from `425b594c146d5f353c10faa11f4b5d47f499b45f` to `d07396bc2b11881b7a36e05831d910b8c41e352b` adds no image file. This review did not generate, request, or integrate art. Census suites that rewrite `art/review/` were not re-run.

## Findings

**BLOCKER:** none. Scope is 522 paths, all inside `lane.json` `allowedPaths`. The four gate tests on an LF checkout of the writer tip exited 0. The runner refuses `NEEDS_NWJS` before spawn.

**MAJOR:** none. Census files, `quarantine.json`, and the three re-run suites agree. One broken suite exits 1. The eleven mutants are killed. The CRLF failure is outside the lane and was escalated; it is not graded.

**MINOR:** `test_run_gate.js` kills the `timeout_removed` mutant with its own watchdog, so that runner never reaches scratch cleanup. This review's two `test_run_gate.js` runs left two `%TEMP%\deus-run-gate-*` directories (created 11:39 and 11:42, stdout `hanging on purpose`, guard file plus one suite dir). No node process was left in them. `PASS no_leftover_processes` is about processes, and it passed. `REPORT.md` already records this and left it unfixed so the measured runs would stay valid. A normal `run_gate.js` completion removes its scratch (`LEFTOVERS: none` on the nine-suite run). This does not change the gate result.

VERDICT: PASS
