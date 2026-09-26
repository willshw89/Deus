# OPS.30.01 lane-y independent review (Grok)

Reviewed commit: `d07396bc2b11881b7a36e05831d910b8c41e352b`

HEAD on `task/lane-y` matched that commit before this review. Raw `git rev-parse HEAD origin/task/lane-y` and `git log -8 --format="%H %an %s"` from the worktree:

```
d07396bc2b11881b7a36e05831d910b8c41e352b
d07396bc2b11881b7a36e05831d910b8c41e352b
d07396bc2b11881b7a36e05831d910b8c41e352b deus-claude [claude] OPS.30.01 REPORT.md: record the report commit hash
20b8a5455f1065311ed760b29aefb1882894f524 deus-claude [claude] OPS.30.01 REPORT.md (gate tests, CRLF finding, scope) and escalation.md: gate suites fail on CRLF checkouts made like merge_gate.js's
e5f1dafc42defd88590a703f45393607b4a868c5 deus-claude [claude] OPS.30.01 REPORT.md draft (census tables spliced in; gate tests and scope still to paste)
d0165dfd42fa7c2f3f49a21bd2d2205479c3b3b6 deus-claude [claude] OPS.30.01 quarantine.json (3-run census of 425b594c plus test_run_gate.js), census tables, raw logs, supplementary 580 s run of the timed-out suites
2d9f513c40c683338d50c6ea3dc945b5fb4687c5 deus-claude [claude] OPS.30.01 test_run_gate.js: --screen check; census run 3 evidence
f0008ce45b0177e78a973b94edd1e94e307e0a52 deus-claude [claude] OPS.30.01 WIP census runs 1 and 2 (fresh clones of 425b594c, runner 33357307)
3335730734b7676bc6830ced8c974a82830df395 deus-claude [claude] OPS.30.01 WIP failure rules: .NET FileNotFoundException and 'must be loaded'; gate fresh-clone and broken-suite runs; classify_tests output at base
7c38950effd94977b4b3f7bc6ddd2d471460a319 deus-claude [claude] OPS.30.01 WIP gate-mode default timeout 600 s; census run 1 evidence; leftover check helper
```

All commands below ran in fresh temporary clones, not in the live worktree. LF clone: `git clone -c core.autocrlf=false` of the worktree, then `git checkout --detach d07396bc2b11881b7a36e05831d910b8c41e352b`. That clone's local `core.autocrlf` was `false`. Node was `v24.19.0`. Both clones were deleted after these results were recorded.

## Scope

Merge base, from `git merge-base origin/main d07396bc2b11881b7a36e05831d910b8c41e352b` in the LF clone:

```
425b594c146d5f353c10faa11f4b5d47f499b45f
```

`git diff --name-status 425b594c146d5f353c10faa11f4b5d47f499b45f d07396bc2b11881b7a36e05831d910b8c41e352b` is 522 paths, every one status `A`. Zero paths fall outside `lane.json` `allowedPaths`. Zero paths are images or under `art/`.

| allowedPaths glob | paths | status |
|---|---:|---|
| `tools/ops/run_gate.js` | 1 | A |
| `tools/ops/test_run_gate.js` | 1 | A |
| `tools/ops/quarantine.json` | 1 | A |
| `tools/ops/fixtures/run_gate/**` | 43 | A |
| `tasks/OPS.30.01/**` | 476 | A |
| outside allowedPaths | 0 | |

Full name-status list:

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

## Gate tests

Run in the LF clone, cwd = clone root, exactly the `lane.json` `gateTests` commands. `node tools/ops/run_gate.js` was run in the foreground (wall clock 619961 ms, under the 1800 s limit).

### a. `node tools/ops/test_run_gate.js`

`RESULT: 97 passed, 0 failed`

`EXIT=0`

The 97 lines include the broken-suite check, the NW.js refusal checks, and all 11 mutants. Each mutant's baseline passed and the mutant failed the check named below:

```
PASS gate_one_suite_broken_exit_1
PASS gate_refuses_nwjs_in_list_exit_2_runs_nothing
PASS gate_refuses_nwjs_suite_named_exit_2
PASS gate_refuses_transitive_nwjs_exit_2
PASS census_needs_nwjs_never_spawned
PASS mutant_gate_ignores_failing_exit_killed
    mutant gate_ignores_failing_exit caught by: gate_one_suite_broken_exit_1
PASS mutant_timeout_removed_killed
    mutant timeout_removed caught by: gate_timeout_exit_1, gate_timeout_killed_suite_and_child
PASS mutant_needs_nwjs_screen_removed_killed
    mutant needs_nwjs_screen_removed caught by: gate_refuses_nwjs_suite_named_exit_2
PASS mutant_missing_module_rule_swapped_killed
    mutant missing_module_rule_swapped caught by: census_missing_module_category
PASS mutant_check_lists_duplicate_check_removed_killed
    mutant check_lists_duplicate_check_removed caught by: check_lists_duplicate_in_gate
PASS mutant_tree_kill_removed_killed
    mutant tree_kill_removed caught by: census_timeout_tree_killed_before_sweep
PASS mutant_transitive_screen_removed_killed
    mutant transitive_screen_removed caught by: gate_refuses_transitive_nwjs_exit_2
PASS mutant_gate_nwjs_refusal_removed_killed
    mutant gate_nwjs_refusal_removed caught by: gate_refuses_nwjs_suite_named_exit_2
PASS mutant_runtime_guard_removed_killed
    mutant runtime_guard_removed caught by: census_runtime_guard_blocks_launch
PASS mutant_leftover_sweep_removed_killed
    mutant leftover_sweep_removed caught by: census_leftover_child_swept
PASS mutant_check_lists_unlisted_check_removed_killed
    mutant check_lists_unlisted_check_removed caught by: check_lists_unlisted_suite
PASS run_gate_on_disk_unchanged
PASS no_leftover_processes
```

Five of those kills were re-checked against the source of `tools/ops/test_run_gate.js`: the unmutated check must pass, and the same check must fail after a single in-memory replacement. The live run shows that for `gate_ignores_failing_exit`, `timeout_removed`, `needs_nwjs_screen_removed`, `missing_module_rule_swapped`, and `check_lists_duplicate_check_removed`.

### b. `node tools/ops/run_gate.js --check-lists`

```
run_gate: check-lists, root C:\Users\snewt\AppData\Local\Temp\deus-lane-y-grok-review-d07396bc, gate list C:\Users\snewt\AppData\Local\Temp\deus-lane-y-grok-review-d07396bc\tools\ops\gate_tests.json, quarantine C:\Users\snewt\AppData\Local\Temp\deus-lane-y-grok-review-d07396bc\tools\ops\quarantine.json
NOTE: tools/test_generated_z2_cut_proof.js is on the gate_tests.json quarantine list but quarantine.json records it passing in every run
CHECK-LISTS: OK (9 gate, 117 quarantined, 63 passingNotGated, 188 tracked suites)
EXIT=0
```

The NOTE is the writer's PROPOSED-Y-02. It is not a violation. The "188 tracked suites" count is `git ls-files` of `tools/test_*.js` and `tools/**/test_*.js` (188, including `tools/ops/test_run_gate.js`). `tools/check_deus_syntax.js` is a gate entry and is not named `test_*.js`, so 9 + 117 + 63 = 189 listed paths.

### c. `node tools/ops/run_gate.js`

```
run_gate: gate mode, 9 suites from C:\Users\snewt\AppData\Local\Temp\deus-lane-y-grok-review-d07396bc\tools\ops\gate_tests.json, root C:\Users\snewt\AppData\Local\Temp\deus-lane-y-grok-review-d07396bc, HEAD d07396bc2b11881b7a36e05831d910b8c41e352b, timeout 600 s each, one at a time
GATE tools/check_deus_syntax.js EXIT=0 3031ms
GATE tools/test_palette.js EXIT=0 48ms
GATE tools/governance/test_check_claims.js EXIT=0 189639ms
GATE tools/test_strata_cuts_and_caves.js EXIT=0 190001ms
GATE tools/test_new_game_year0.js EXIT=0 12479ms
GATE tools/test_history_materialization_and_world_age.js EXIT=0 102824ms
GATE tools/test_historical_carrying_capacity.js EXIT=0 19745ms
GATE tools/test_geology_strata.js EXIT=0 15031ms
GATE tools/test_strata_foundation.js EXIT=0 86592ms
LEFTOVERS: none
RESULT: 9 passed, 0 failed
EXIT=0
```

`tools/test_strata_cuts_and_caves.js` took 190001 ms. A 180 s gate timeout would have killed a suite that passed. The documented 600 s gate default matches that measurement.

### d. `node tools/check_deus_syntax.js`

```
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

### One suite broken exits 1

Independent of the fixture test, a throwaway root with `tools/test_pass.js` (exit 0) and `tools/test_fail.js` (exit 1) was passed to `run_gate.js --gate-list`:

```
GATE tools/test_pass.js EXIT=0 38ms
GATE tools/test_fail.js EXIT=1 38ms FAIL_OTHER
    | decided by other: OPS.30.01 deliberate break
LEFTOVERS: none
RESULT: 1 passed, 1 failed
EXIT=1
```

The same behaviour is `PASS gate_one_suite_broken_exit_1` in gate test (a).

## CRLF escalation

`escalation.md` says three gate suites fail on a checkout made the way `merge_gate.js` clones (`git clone --shared --no-checkout` of the common git dir, then `checkout --detach`; `tools/governance/merge_gate.js` lines 605-608) when system `core.autocrlf` is `true` and the repo has no `.gitattributes`, and that they pass after the working tree is forced back to LF.

This review repeated that clone method at `d07396bc2b11881b7a36e05831d910b8c41e352b`. System `core.autocrlf` was `true`. The clone had no local `core.autocrlf`. Effective `core.autocrlf` was `true`. There is no `.gitattributes`.

A/B on `tools/test_historical_carrying_capacity.js` (one of the three). The suite hashes `game/js/plugins/DEUS_HistoricalDemographics.js` on disk against a frozen candidate of 52898 bytes (`tools/test_historical_carrying_capacity.js` lines 15-18 and 93-95).

Before, CRLF working tree: file was 53506 bytes, 608 CRLF, 0 bare LF.

```
GATE tools/test_historical_carrying_capacity.js EXIT=1 378ms FAIL_OTHER
    | decided by other: FAIL: Error: CANDIDATE_MISMATCH: working plugin differs from frozen candidate
LEFTOVERS: none
RESULT: 0 passed, 1 failed
EXIT=1
```

Then, in that same clone: `git config core.autocrlf false`, `git rm -q --cached -r .`, `git reset -q --hard`. HEAD stayed `d07396bc2b11881b7a36e05831d910b8c41e352b`. The file was 52898 bytes, 0 CRLF, 608 LF.

```
GATE tools/test_historical_carrying_capacity.js EXIT=0 21528ms
LEFTOVERS: none
RESULT: 1 passed, 0 failed
EXIT=0
```

The only change between A and B was line endings. The same `CANDIDATE_MISMATCH` line is what the writer recorded. The suite file, the plugin, and `merge_gate.js` are outside this lane's allowedPaths. The lane wrote the escalation and did not patch those files, did not add `.gitattributes`, and did not change `merge_gate.js`. The LF gate run above exits 0, which is the checkout the brief required (`core.autocrlf=false`).

This is a pre-existing environment and merge-gate issue, not a defect of this lane's deliverables. It is not graded against the lane. The fix options in `escalation.md` (merge_gate autocrlf, `.gitattributes`, suite hardening, manual merge) stay a PM/Owner decision.

## Report claims checked against the committed census

The three full censuses were not re-run. Counts below were recomputed from `evidence/census_run1.json`, `census_run2.json`, `census_run3.json`, `census_tip_run1.json` through `census_tip_run3.json`, and `tools/ops/quarantine.json` at this commit. Each census file is `partial: false`, `head` `425b594c146d5f353c10faa11f4b5d47f499b45f`, `timeoutSec` 180, `concurrency` 3, 188 suites.

| Category | run 1 | run 2 | run 3 | quarantine.json suites |
|---|---:|---:|---:|---:|
| PASS | 70 | 70 | 72 | (63 in passingNotGated) |
| FAIL_MISSING_DEPENDENCY | 0 | 0 | 0 | 0 |
| FAIL_API_DRIFT | 19 | 19 | 19 | 19 |
| FAIL_MISSING_REFERENCE | 35 | 35 | 35 | 35 |
| FAIL_OTHER | 13 | 13 | 13 | 14 |
| KILLED_TIMEOUT | 9 | 9 | 7 | 7 |
| NEEDS_NWJS | 42 | 42 | 42 | 42 |
| total | 188 | 188 | 188 | 117 |

Those match the report's census table and the merge counts (117 quarantined + 63 passingNotGated + 9 gate = 189). Two suites disagree across the three runs, and zero suites share a category with a different deciding line:

- `tools/test_strata_cuts_and_caves.js` (gate, so not a quarantine row): KILLED_TIMEOUT / KILLED_TIMEOUT / PASS
- `tools/test_strata_fluid_reconciliation.js`: KILLED_TIMEOUT / KILLED_TIMEOUT / PASS, stored as `FAIL_OTHER`, `flaky: true`, `runCategories` that same triple

No quarantine category disagreed with the three runs. No non-flaky deciding line disagreed. Every `owner` is null. No path is in more than one of gate, quarantine, and passingNotGated. Every base-census path is listed. The only path listed beyond the base census is `tools/ops/test_run_gate.js`, PASS / PASS / PASS on the three tip runs, `measuredOn` `2d9f513c40c683338d50c6ea3dc945b5fb4687c5`.

### Three quarantine rows re-run

Same LF clone, `node tools/ops/run_gate.js --suite <path>`.

| Suite | recorded | re-run | EXIT |
|---|---|---|---|
| `tools/test_19b_performance_determinism.js` | FAIL_API_DRIFT, exit 1, `TypeError: WA.initNewWorld is not a function` | `GATE ... EXIT=1 78ms FAIL_API_DRIFT` decided by `TypeError: WA.initNewWorld is not a function` | 1 |
| `tools/test_adam_res.js` | FAIL_MISSING_REFERENCE, exit 1, ENOENT on `PALETTES.FLX` | `GATE ... EXIT=1 46ms FAIL_MISSING_REFERENCE` decided by that same ENOENT line | 1 |
| `tools/test_birth_rate_halved.js` | FAIL_OTHER, exit 1, `AssertionError [ERR_ASSERTION]: UF_Colonists.js must check roll < 0.5 for 50% conception rate` | `GATE ... EXIT=1 45ms FAIL_OTHER` decided by that same assertion | 1 |

A fourth, `tools/test_chest_left_click_info.js`, is recorded NEEDS_NWJS with the static-screen line at that file's line 12. Re-run:

```
REFUSED tools/test_chest_left_click_info.js NEEDS_NWJS: static screen: tools/test_chest_left_click_info.js:12 names "nwjs": const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe";
RESULT: refused, no suite was run (1 NEEDS_NWJS)
EXIT=2
```

There is no `GATE` line. The suite was not spawned.

## NW.js

`run_gate.js` starts a suite only with `spawn(process.execPath, [rel], { shell: false })` (`tools/ops/run_gate.js` around line 662). `process.execPath` is node. The other process starts in that file are `git`, `taskkill`, `powershell`, and `ps`. Gate mode returns exit 2 before any spawn when the static screen marks a suite NEEDS_NWJS. A preload guard wraps `child_process` spawn, spawnSync, exec, execSync, execFile, execFileSync, and fork, and throws if the command or arguments name the harness. The fixture census check `census_needs_nwjs_never_spawned` passed in gate test (a): the NW.js fixtures write a marker if they run, and the marker was absent. The live refusal above matches that.

## DEC-007

No art was generated, requested, or added by this review. The scope diff contains no `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.webp`, `.svg`, `.psd`, or `.tga` path and no path under `art/`.

## Findings

**BLOCKER:** none.

**MAJOR:** none.

**MINOR:** `test_run_gate.js` still leaves a runner scratch directory under `%TEMP%\deus-run-gate-*` when the timeout mutant's process is killed before cleanup. After this review's one run of that test, `deus-run-gate-ptRvC9` existed (created 2026-09-26 10:58:48) and no process named the clone or that prefix (`leftover_check.js` printed `LEFTOVER CHECK: 0 process(es)`, exit 0). The report already records this and left it, because editing the test would invalidate the three measured runs. It does not fail a gate test.

The CRLF failure of `tools/test_historical_carrying_capacity.js` is not in this list. It is the escalated shared-file behaviour above, and it is not graded against this lane.

## Verdict

VERDICT: PASS
