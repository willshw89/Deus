# Project DEUS — Test Classification & Execution Authority

Generated: 2026-09-26
Total scripts audited: 711

## Summary
- **Headless Automated Proofs/Suites (CI/Regression)**: 157
- **Playtest / In-Game Live Suites (Browser/Canvas)**: 23
- **Art Production & Verification Pipeline**: 16
- **Diagnostic & Build Utilities**: 515
- **Legacy / Stale Scripts**: 0

### HEADLESS_AUTOMATED (157)
| File | Purpose / Reason |
|---|---|
| `test_19b_performance_determinism.js` | Automated headless Node test script |
| `test_adam_res.js` | Automated headless Node test script |
| `test_adam_scales.js` | Automated headless Node test script |
| `test_aging_and_lifespan.js` | Automated headless Node test script |
| `test_agriculture.js` | Automated headless Node test script |
| `test_all_faction_menus.js` | Automated headless Node test script |
| `test_all_object_charsets.js` | Automated headless Node test script |
| `test_all_walk_cycles.js` | Automated headless Node test script |
| `test_ally_movement_exclusive_action_square.js` | Automated headless Node test script |
| `test_autonomous_project_dispatch.js` | Automated headless Node test script |
| `test_autonomous_settlement_closure.js` | Automated headless Node test script |
| `test_autonomous_work_recovery.js` | Automated headless Node test script |
| `test_biome_standard.js` | Automated headless Node test script |
| `test_birth_rate_halved.js` | Automated headless Node test script |
| `test_callings_system.js` | Automated headless Node test script |
| `test_chest_left_click_info.js` | Automated headless Node test script |
| `test_clean_attack_sheet.js` | Automated headless Node test script |
| `test_clean_bow_sheet.js` | Automated headless Node test script |
| `test_clean_downed_sheet.js` | Automated headless Node test script |
| `test_clean_haul_sheet.js` | Automated headless Node test script |
| `test_clean_magic_sheet.js` | Automated headless Node test script |
| `test_clean_u7_composites.js` | Automated headless Node test script |
| `test_clean_walk_sheet.js` | Automated headless Node test script |
| `test_clean_walk_sheet2.js` | Automated headless Node test script |
| `test_clean_walk_sheet3.js` | Automated headless Node test script |
| `test_clean_work_sheet.js` | Automated headless Node test script |
| `test_column_landforms.js` | Automated headless Node test script |
| `test_combat_dying_integration.js` | Automated headless Node test script |
| `test_conditions_native_closure.js` | Automated headless Node test script |
| `test_conditions_system.js` | Automated headless Node test script |
| `test_container_item_interactions.js` | Automated headless Node test script |
| `test_continuous_frontier_progression.js` | Automated headless Node test script |
| `test_cooperative_building_and_offspring_pairbonding.js` | Automated headless Node test script |
| `test_cooperative_homestead_construction.js` | Automated headless Node test script |
| `test_creatures_ingame.js` | Automated headless Node test script |
| `test_culling_native.js` | Automated headless Node test script |
| `test_culture_growth.js` | Automated headless Node test script |
| `test_d20_equipment_slots.js` | Automated headless Node test script |
| `test_deer_action_boxes.js` | Automated headless Node test script |
| `test_diagonal_corners_and_doorways.js` | Automated headless Node test script |
| `test_duplicate_registration.js` | Automated headless Node test script |
| `test_dwarves_ingame.js` | Automated headless Node test script |
| `test_dynamic_armor_reflection.js` | Automated headless Node test script |
| `test_ecology.js` | Automated headless Node test script |
| `test_elves_ingame.js` | Automated headless Node test script |
| `test_extraction_difficulty.js` | Automated headless Node test script |
| `test_eye_variations.js` | Automated headless Node test script |
| `test_facing_detection.js` | Automated headless Node test script |
| `test_faction_construction_and_homes.js` | Automated headless Node test script |
| `test_faction_founder_pairbonding.js` | Automated headless Node test script |
| `test_faction_menus_clean.js` | Automated headless Node test script |
| `test_faction_reproduction.js` | Automated headless Node test script |
| `test_faction_starting_gear.js` | Automated headless Node test script |
| `test_family_compounds_and_shops.js` | Automated headless Node test script |
| `test_family_integration.js` | Automated headless Node test script |
| `test_farm_view.js` | Automated headless Node test script |
| `test_female_u7_composites.js` | Automated headless Node test script |
| `test_ff5_candidates.js` | Automated headless Node test script |
| `test_ff5_proportions_and_footsteps.js` | Automated headless Node test script |
| `test_fire_safety.js` | Automated headless Node test script |
| `test_fix_facings.js` | Automated headless Node test script |
| `test_fixed_cycle.js` | Automated headless Node test script |
| `test_fixed_walk_playback.js` | Automated headless Node test script |
| `test_gen3_metrics.js` | Automated headless Node test script |
| `test_generated_z2_cut_proof.js` | Automated headless Node test script |
| `test_generator_combinations.js` | Automated headless Node test script |
| `test_geology_strata.js` | Automated headless Node test script |
| `test_goals.js` | Automated headless Node test script |
| `test_ground_shades_prototype.js` | Automated headless Node test script |
| `test_hare_action_boxes.js` | Automated headless Node test script |
| `test_haul_builder.js` | Automated headless Node test script |
| `test_hazard_reflex.js` | Automated headless Node test script |
| `test_hearth_containment_and_provenance.js` | Automated headless Node test script |
| `test_hist_metadata_contracts.js` | Automated headless Node test script |
| `test_historical_carrying_capacity.js` | Automated headless Node test script |
| `test_history_materialization_and_world_age.js` | Automated headless Node test script |
| `test_households.js` | Automated headless Node test script |
| `test_human_inheritance.js` | Automated headless Node test script |
| `test_layer_switch_inplace.js` | Automated headless Node test script |
| `test_liquid_depth_simulation.js` | Automated headless Node test script |
| `test_ludeon_planning.js` | Automated headless Node test script |
| `test_material_recipes.js` | Automated headless Node test script |
| `test_material_refining_and_tech_pacing.js` | Automated headless Node test script |
| `test_material_substitution.js` | Automated headless Node test script |
| `test_menu_ingame.js` | Automated headless Node test script |
| `test_minimap.js` | Automated headless Node test script |
| `test_multi_deficit_settlement.js` | Automated headless Node test script |
| `test_native_resolution_standard.js` | Automated headless Node test script |
| `test_native_survival_soak.js` | Automated headless Node test script |
| `test_natural_connections.js` | Automated headless Node test script |
| `test_new_game_year0.js` | Automated headless Node test script |
| `test_object_art.js` | Automated headless Node test script |
| `test_perf_benchmark.js` | Automated headless Node test script |
| `test_physical_inventory_proof.js` | Automated headless Node test script |
| `test_population_growth_and_immigration.js` | Automated headless Node test script |
| `test_portrait_clothing_offsets.js` | Automated headless Node test script |
| `test_post_town_hall_progression.js` | Automated headless Node test script |
| `test_process_human_12.js` | Automated headless Node test script |
| `test_production_history_demographics.js` | Automated headless Node test script |
| `test_profile_tabs.js` | Automated headless Node test script |
| `test_project_construction_loop.js` | Automated headless Node test script |
| `test_r4c2_foreshorten.js` | Automated headless Node test script |
| `test_regrowth_construction_guard.js` | Automated headless Node test script |
| `test_resize_face.js` | Automated headless Node test script |
| `test_resource_economy_standard.js` | Automated headless Node test script |
| `test_resource_node_materials.js` | Automated headless Node test script |
| `test_round_world.js` | Automated headless Node test script |
| `test_sanitation_system.js` | Automated headless Node test script |
| `test_scale_standard.js` | Automated headless Node test script |
| `test_seamless_map_edges.js` | Automated headless Node test script |
| `test_second_by_second_history.js` | Automated headless Node test script |
| `test_settlement_domestic_housing.js` | Automated headless Node test script |
| `test_settlement_expansion_multi_dwelling.js` | Automated headless Node test script |
| `test_settlement_pillars.js` | Automated headless Node test script |
| `test_settlement_projects.js` | Automated headless Node test script |
| `test_sheep_action_boxes.js` | Automated headless Node test script |
| `test_side_combos.js` | Automated headless Node test script |
| `test_slice_human.js` | Automated headless Node test script |
| `test_snapshot.js` | Automated headless Node test script |
| `test_srd_character_presentation.js` | Automated headless Node test script |
| `test_srd_combat_proof.js` | Automated headless Node test script |
| `test_srd_equipment_proof.js` | Automated headless Node test script |
| `test_srd_parity.js` | Automated headless Node test script |
| `test_srd_rules_proof.js` | Automated headless Node test script |
| `test_stabilization.js` | Automated headless Node test script |
| `test_standard_4d_ingame.js` | Automated headless Node test script |
| `test_standard_8d_ingame.js` | Automated headless Node test script |
| `test_starter_kit_and_stockpile.js` | Automated headless Node test script |
| `test_stockpiles_designation.js` | Automated headless Node test script |
| `test_strata_cuts_and_caves.js` | Automated headless Node test script |
| `test_strata_fluid_reconciliation.js` | Automated headless Node test script |
| `test_strata_foundation.js` | Automated headless Node test script |
| `test_survival_needs_loop.js` | Automated headless Node test script |
| `test_survival_regressions.js` | Automated headless Node test script |
| `test_time_domains_proof.js` | Automated headless Node test script |
| `test_title_menu.js` | Automated headless Node test script |
| `test_u7_modular_composition.js` | Automated headless Node test script |
| `test_underground_room.js` | Automated headless Node test script |
| `test_unified_capability_proof.js` | Automated headless Node test script |
| `test_unpartnered_shelter_progression.js` | Automated headless Node test script |
| `test_upper_elevation_terrain.js` | Automated headless Node test script |
| `test_v2_clean_u7_composites.js` | Automated headless Node test script |
| `test_var_suite.js` | Automated headless Node test script |
| `test_var2_suite.js` | Automated headless Node test script |
| `test_vertical_worldgen_proof.js` | Automated headless Node test script |
| `test_volumetric_terrain_column.js` | Automated headless Node test script |
| `test_walk_triplets.js` | Automated headless Node test script |
| `test_walls_ingame.js` | Automated headless Node test script |
| `test_water_ingame.js` | Automated headless Node test script |
| `test_wolf_cleanup.js` | Automated headless Node test script |
| `test_z_cavern_gen.js` | Automated headless Node test script |
| `test_z_doors.js` | Automated headless Node test script |
| `test_z_fire.js` | Automated headless Node test script |
| `test_z_floors.js` | Automated headless Node test script |
| `test_z_flora.js` | Automated headless Node test script |
| `test_z_ownership.js` | Automated headless Node test script |
| `test_z_walls.js` | Automated headless Node test script |

### PLAYTEST_IN_GAME (23)
| File | Purpose / Reason |
|---|---|
| `build_rocks_small_delivery.js` | Requires live RMMZ / browser environment |
| `profile_live_frames.js` | Requires live RMMZ / browser environment |
| `smoke_19a_playtest.js` | Requires live RMMZ / browser environment |
| `test_all_animated_objects_live.js` | Requires live RMMZ / browser environment |
| `test_building_variety_live.js` | Requires live RMMZ / browser environment |
| `test_callings_and_clearing_live.js` | Requires live RMMZ / browser environment |
| `test_factions_live.js` | Requires live RMMZ / browser environment |
| `test_fog_z_level_live.js` | Requires live RMMZ / browser environment |
| `test_golden_art_review_live.js` | Requires live RMMZ / browser environment |
| `test_greater_z_roof_live.js` | Requires live RMMZ / browser environment |
| `test_hazard_torture_live.js` | Requires live RMMZ / browser environment |
| `test_human_dwarf_8d_live.js` | Requires live RMMZ / browser environment |
| `test_human_female_variations_live.js` | Requires live RMMZ / browser environment |
| `test_human_male_live_ingame.js` | Requires live RMMZ / browser environment |
| `test_human_male_variations_live.js` | Requires live RMMZ / browser environment |
| `test_light_wall_occlusion_live.js` | Requires live RMMZ / browser environment |
| `test_live_town_center_progression.js` | Requires live RMMZ / browser environment |
| `test_round_world_live.js` | Requires live RMMZ / browser environment |
| `test_seamless_seam_live.js` | Requires live RMMZ / browser environment |
| `test_temperate_arid_transition_live.js` | Requires live RMMZ / browser environment |
| `test_tilesets_live.js` | Requires live RMMZ / browser environment |
| `test_town_hall_ai_live.js` | Requires live RMMZ / browser environment |
| `verify_all_face_deliveries.js` | Requires live RMMZ / browser environment |

### ART_PIPELINE (16)
| File | Purpose / Reason |
|---|---|
| `build_12_sprite_action_viewer.js` | Art pipeline / image processing tool |
| `build_interactive_sprite_viewer.js` | Art pipeline / image processing tool |
| `build_palette_board.js` | Art pipeline / image processing tool |
| `build_palette_registry.js` | Art pipeline / image processing tool |
| `check_furniture_originality.js` | Art pipeline / image processing tool |
| `deploy_human_sprites.js` | Art pipeline / image processing tool |
| `design_settler_sprite.js` | Art pipeline / image processing tool |
| `inspect_sprites.js` | Art pipeline / image processing tool |
| `originality_check.js` | Art pipeline / image processing tool |
| `palette_resolver.js` | Art pipeline / image processing tool |
| `prepare_12_sprite_references.js` | Art pipeline / image processing tool |
| `render_12_sprites_grid.js` | Art pipeline / image processing tool |
| `test_foliage_sprite_animations.js` | Art pipeline / image processing tool |
| `test_object_originality.js` | Art pipeline / image processing tool |
| `test_palette_standard.js` | Art pipeline / image processing tool |
| `test_palette.js` | Art pipeline / image processing tool |

### UTILITY_TOOL (515)
| File | Purpose / Reason |
|---|---|
| `add_ambient_catalog.js` | General utility script |
| `add_anim_catalog.js` | General utility script |
| `add_combat_chains.js` | General utility script |
| `add_doors_catalog.js` | General utility script |
| `add_ecology_catalog.js` | General utility script |
| `add_floors_catalog.js` | General utility script |
| `add_furniture_kitchen_shop_catalog.js` | General utility script |
| `add_peoples_catalog.js` | General utility script |
| `add_select_catalog.js` | General utility script |
| `add_sheet_catalog.js` | General utility script |
| `add_skills_catalog.js` | General utility script |
| `add_skins_faces_catalog.js` | General utility script |
| `add_speech_catalog.js` | General utility script |
| `add_srd_food_data.js` | General utility script |
| `add_tech_catalog.js` | General utility script |
| `add_test_plugin.js` | Diagnostic, benchmark, or build utility |
| `analyze_decomposition_cells.js` | General utility script |
| `analyze_doors_v2_cells.js` | General utility script |
| `analyze_human_male_sources.js` | General utility script |
| `analyze_stances.js` | General utility script |
| `analyze_strides.js` | General utility script |
| `analyze_wolf_raw.js` | General utility script |
| `apply_deus_rename.js` | General utility script |
| `apply_ground_shades_catalog.js` | General utility script |
| `apply_underground_catalog.js` | General utility script |
| `art_check.js` | General utility script |
| `assemble_approved_master_chest.js` | General utility script |
| `assemble_deus_windowskin.js` | General utility script |
| `assemble_final_chest_sheet.js` | General utility script |
| `audit_all_human_sheets.js` | General utility script |
| `audit_chest_frames.js` | General utility script |
| `bake_generator_pool.js` | General utility script |
| `bench_history_demographics.js` | Diagnostic, benchmark, or build utility |
| `bench_history_sim.js` | Diagnostic, benchmark, or build utility |
| `bench_shades.js` | Diagnostic, benchmark, or build utility |
| `bench_species_biology.js` | Diagnostic, benchmark, or build utility |
| `bench_underground_gen.js` | Diagnostic, benchmark, or build utility |
| `bench_vertical_worldgen.js` | Diagnostic, benchmark, or build utility |
| `bench_viewport_culling.js` | Diagnostic, benchmark, or build utility |
| `benchmark_live_perf.js` | Diagnostic, benchmark, or build utility |
| `benchmark_performance.js` | Diagnostic, benchmark, or build utility |
| `biome_resolver.js` | General utility script |
| `build_action_showcases.js` | General utility script |
| `build_all_42_charsets_widget.js` | General utility script |
| `build_all_42_dwarf_male_showcase.js` | General utility script |
| `build_all_creatures_complete_8d_actions.js` | General utility script |
| `build_all_dozen_faces.js` | General utility script |
| `build_all_faction_faces_and_menus.js` | General utility script |
| `build_all_faction_menus.js` | General utility script |
| `build_all_lineages_complete_8d_actions.js` | General utility script |
| `build_all_lineages_footsteps_showcase.js` | General utility script |
| `build_all_object_icons.js` | General utility script |
| `build_all_uniform_walk_masters.js` | General utility script |
| `build_all_window_skins.js` | General utility script |
| `build_all_world_object_charsets.js` | General utility script |
| `build_all_world_objects_showcase.js` | General utility script |
| `build_animated_doors.js` | General utility script |
| `build_animated_water_a1.js` | General utility script |
| `build_arid_z0_pilot_sheets.js` | General utility script |
| `build_authentic_ff5_settler.js` | General utility script |
| `build_authentic_human_pair_ar600.js` | General utility script |
| `build_authentic_lineages_8d.js` | General utility script |
| `build_batch1_bushes_rmmz.js` | General utility script |
| `build_batch1_items.js` | General utility script |
| `build_batch1_showcase.js` | General utility script |
| `build_batch1_stones_rmmz.js` | General utility script |
| `build_batch1_stones.js` | General utility script |
| `build_batch2_crystals_ores.js` | General utility script |
| `build_batch2_items_showcase.js` | General utility script |
| `build_batch2_items.js` | General utility script |
| `build_batch2_minerals_rmmz.js` | General utility script |
| `build_batch3_and_cave_assets.js` | General utility script |
| `build_batch3_items_showcase.js` | General utility script |
| `build_batch3_items.js` | General utility script |
| `build_batch4_items_showcase.js` | General utility script |
| `build_batch4_items.js` | General utility script |
| `build_batch4_plants_minerals.js` | General utility script |
| `build_batch5_items_showcase.js` | General utility script |
| `build_batch5_items.js` | General utility script |
| `build_batch6_items_showcase.js` | General utility script |
| `build_batch6_items.js` | General utility script |
| `build_batch6_objects_and_faces.js` | General utility script |
| `build_biome_charsets_and_faces.js` | General utility script |
| `build_boar.js` | General utility script |
| `build_campfire_package.js` | General utility script |
| `build_cave_style_walls.js` | General utility script |
| `build_chat_friendly_8d_strips.js` | General utility script |
| `build_clean_settler.js` | General utility script |
| `build_clean_two_square_walls.js` | General utility script |
| `build_compact_8d_walker.js` | General utility script |
| `build_comparison_widget.js` | General utility script |
| `build_composite_transition_tileset.js` | General utility script |
| `build_construction_floors.js` | General utility script |
| `build_creator_review_board.js` | General utility script |
| `build_deer_action_sheets.js` | General utility script |
| `build_df_chipset_walls.js` | General utility script |
| `build_doors_original.js` | General utility script |
| `build_doors_showcase.js` | General utility script |
| `build_dwarf_orc_cursors.js` | General utility script |
| `build_elf_demographics_standard_charsets.js` | General utility script |
| `build_elf_standard_charsets.js` | General utility script |
| `build_faction_creature_walk_masters.js` | General utility script |
| `build_female_42_charsets_widget.js` | General utility script |
| `build_female_settler_walk.js` | General utility script |
| `build_ff5_architecture_showcase.js` | General utility script |
| `build_ff5_proportions_showcase.js` | General utility script |
| `build_ff5_u7_settler.js` | General utility script |
| `build_fox.js` | General utility script |
| `build_furniture_review_montage.js` | General utility script |
| `build_generator_prompts.js` | General utility script |
| `build_generator_showcase.js` | General utility script |
| `build_hare.js` | General utility script |
| `build_human_genetics_showcase.js` | General utility script |
| `build_human_male_showcase_widget.js` | General utility script |
| `build_ingame_widget.js` | General utility script |
| `build_interactive_walker_html.js` | General utility script |
| `build_log_first_asset.js` | General utility script |
| `build_log_showcase.js` | General utility script |
| `build_male_settler_ar600.js` | General utility script |
| `build_male_variations_widget.js` | General utility script |
| `build_master_generator.js` | General utility script |
| `build_master_showcase.js` | General utility script |
| `build_master_u7_chipsets.js` | General utility script |
| `build_modular_charset_layers.js` | General utility script |
| `build_nano_b_sheets.js` | General utility script |
| `build_nano_banana_batch2_showcase.js` | General utility script |
| `build_nano_banana_batch3_showcase.js` | General utility script |
| `build_nano_banana_batch4_showcase.js` | General utility script |
| `build_nano_banana_world_showcase.js` | General utility script |
| `build_nano_boar_actions.js` | General utility script |
| `build_nano_boar.js` | General utility script |
| `build_nano_c_sheets.js` | General utility script |
| `build_nano_cursors.js` | General utility script |
| `build_nano_deer_actions.js` | General utility script |
| `build_nano_deer.js` | General utility script |
| `build_nano_floors_a5.js` | General utility script |
| `build_nano_flow_water_a1.js` | General utility script |
| `build_nano_ground_a2.js` | General utility script |
| `build_nano_hare_actions.js` | General utility script |
| `build_nano_hare.js` | General utility script |
| `build_nano_roofs_a3.js` | General utility script |
| `build_nano_sapling.js` | General utility script |
| `build_nano_sheep_actions.js` | General utility script |
| `build_nano_sheep.js` | General utility script |
| `build_nano_tilesets_v2.js` | General utility script |
| `build_nano_walls_a4.js` | General utility script |
| `build_nano_water_and_gradient.js` | General utility script |
| `build_nano_wolf_actions.js` | General utility script |
| `build_nano_wolf.js` | General utility script |
| `build_nature_menu_themes.js` | General utility script |
| `build_oak_sway_sheet.js` | General utility script |
| `build_perfect_chest_sheet.js` | General utility script |
| `build_perfect_female_dwarf.js` | General utility script |
| `build_perfect_female_human.js` | General utility script |
| `build_perfect_female_orc.js` | General utility script |
| `build_perfect_male_dwarf.js` | General utility script |
| `build_perfect_male_elf.js` | General utility script |
| `build_perfect_male_human.js` | General utility script |
| `build_perfect_male_orc.js` | General utility script |
| `build_pink_chest_master.js` | General utility script |
| `build_pointy_cursors_and_default_menu_showcase.js` | General utility script |
| `build_pointy_cursors_and_default_menu.js` | General utility script |
| `build_pro_human_female.js` | General utility script |
| `build_pro_human_male.js` | General utility script |
| `build_rmmz_generator_demo.js` | General utility script |
| `build_scale_lineup.js` | General utility script |
| `build_seamless_doors.js` | General utility script |
| `build_self_contained_showcase.js` | General utility script |
| `build_serious_chibi_comparison.js` | General utility script |
| `build_showcase.js` | General utility script |
| `build_site_pieces_batch2_showcase.js` | General utility script |
| `build_site_pieces_batch2.js` | General utility script |
| `build_srd_catalog.js` | General utility script |
| `build_srd_character_presentation.js` | General utility script |
| `build_standard_template_spec_image.js` | General utility script |
| `build_straw_bed_and_stockpile.js` | General utility script |
| `build_temperate_grass_batch1_sheets.js` | General utility script |
| `build_temperate_z0_pilot_sheets.js` | General utility script |
| `build_three_lineages_8d_walk_showcase.js` | General utility script |
| `build_u7_attire_tiers.js` | General utility script |
| `build_u7_chipsets.js` | General utility script |
| `build_u7_cursors.js` | General utility script |
| `build_u7_face_frames.js` | General utility script |
| `build_u7_window_skin_native.js` | General utility script |
| `build_u7_window_skin.js` | General utility script |
| `build_verified_masters.js` | General utility script |
| `build_vertical_layers_showcase.js` | General utility script |
| `build_walk_cycle_verification.js` | General utility script |
| `build_wildlife_tree_faces.js` | General utility script |
| `build_wolf.js` | General utility script |
| `capture_pre_migration_baseline.js` | General utility script |
| `check_120.js` | General utility script |
| `check_area_biomes.js` | General utility script |
| `check_briefs.js` | General utility script |
| `check_catalog_containers.js` | General utility script |
| `check_catalog.js` | General utility script |
| `check_deus_syntax.js` | General utility script |
| `check_generator_alignment.js` | General utility script |
| `check_resource_manifest.js` | General utility script |
| `check_unready_bitmaps.js` | General utility script |
| `check_walk_diff.js` | General utility script |
| `check_walk_facings.js` | General utility script |
| `check_wolf_cat.js` | General utility script |
| `classify_tests.js` | Diagnostic, benchmark, or build utility |
| `clean_deus_window_skin.js` | General utility script |
| `clean_hearth_top.js` | General utility script |
| `clean_packed_sheet.js` | General utility script |
| `clean_prop_fringe.js` | General utility script |
| `clean_staging_game.js` | General utility script |
| `commit_batch4.js` | General utility script |
| `commit_batch6.js` | General utility script |
| `compare_stances.js` | General utility script |
| `compile_all_42_dwarf_male_charsets.js` | General utility script |
| `compile_all_42_female_charsets.js` | General utility script |
| `compile_all_6_male_variations.js` | General utility script |
| `compile_all_furniture_and_shops.js` | General utility script |
| `compile_decomposition_nano_pro.js` | General utility script |
| `compile_doors_48x96_nano_pro.js` | General utility script |
| `compile_doors_nano_pro.js` | General utility script |
| `compile_doors_v2_nano_pro.js` | General utility script |
| `compile_female_var2.js` | General utility script |
| `compile_furniture_kitchen_shops.js` | General utility script |
| `compile_male_variation.js` | General utility script |
| `compile_perfect_orc_male.js` | General utility script |
| `compile_pro_female_walk.js` | General utility script |
| `compile_pro_walk.js` | General utility script |
| `compile_var2_suite.js` | General utility script |
| `compile_var3_suite.js` | General utility script |
| `compile_var4_suite.js` | General utility script |
| `compile_var5_suite.js` | General utility script |
| `compile_var6_suite.js` | General utility script |
| `convert_batches.js` | General utility script |
| `creature_pipeline.js` | General utility script |
| `crop_ingame_showcase.js` | General utility script |
| `crop_raw_cells.js` | General utility script |
| `crop_sapling_candidate.js` | General utility script |
| `crop_sheep_eat_row1.js` | General utility script |
| `crop_showcase_2x.js` | General utility script |
| `crop_wolf_row1.js` | General utility script |
| `debug_boot_trace.js` | General utility script |
| `debug_facing.js` | General utility script |
| `decode_u7_samples.js` | General utility script |
| `deploy_adam_eve.js` | General utility script |
| `deploy_batch1.js` | General utility script |
| `deploy_campfire.js` | General utility script |
| `deploy_chest.js` | General utility script |
| `deploy_complete_u7_portrait_generator.js` | General utility script |
| `deploy_human_genetics_assets.js` | General utility script |
| `deploy_pro_human_male_suite.js` | General utility script |
| `deploy_u7_standin_graphics.js` | General utility script |
| `design_ff5_u7_settler.js` | General utility script |
| `design_realistic_settler.js` | General utility script |
| `deus_usage_telemetry.js` | General utility script |
| `diagnose_all_raw_walks.js` | General utility script |
| `diagnose_frame_spikes.js` | General utility script |
| `diagnose_hotspots.js` | General utility script |
| `diagnose_walk_cycles.js` | General utility script |
| `ensure_male_aliases.js` | General utility script |
| `execute_chest_repair.js` | General utility script |
| `explore_settler_designs.js` | General utility script |
| `export_u7_style_dataset.js` | General utility script |
| `extract_approved_chest_master.js` | General utility script |
| `extract_cells.js` | General utility script |
| `extract_modular_generator_layers.js` | General utility script |
| `extract_modular_u7_portrait_parts.js` | General utility script |
| `extract_stock_characters.js` | General utility script |
| `extract_stock_icons.js` | General utility script |
| `extract_u7_nature_standins.js` | General utility script |
| `fetch_ff5_bartz.js` | General utility script |
| `fetch_ff5_townsperson.js` | General utility script |
| `fetch_ff6_locke.js` | General utility script |
| `find_pine_candidates.js` | General utility script |
| `find_u7_colors.js` | General utility script |
| `find_wolf_boxes.js` | General utility script |
| `fix_all_walk_facings.js` | General utility script |
| `fix_colonists_checks.js` | General utility script |
| `fix_remaining_sheets.js` | General utility script |
| `generate_all_u7_assets.js` | General utility script |
| `generate_asset_inventory.js` | Diagnostic, benchmark, or build utility |
| `generate_audit_contact_sheet.js` | General utility script |
| `generate_boar_actions.js` | General utility script |
| `generate_chest_review_package.js` | General utility script |
| `generate_context_preview.js` | General utility script |
| `generate_decomposition_nano_pro.js` | General utility script |
| `generate_deer_actions.js` | General utility script |
| `generate_df_factions_flora.js` | General utility script |
| `generate_df_nodes.js` | General utility script |
| `generate_df_resources.js` | General utility script |
| `generate_df_wildlife.js` | General utility script |
| `generate_doors_nano_pro.js` | General utility script |
| `generate_doors_v2_nano_pro.js` | General utility script |
| `generate_dwarf_male_variations.js` | General utility script |
| `generate_dwarf_orc_cursors.js` | General utility script |
| `generate_dwarf_suite.js` | General utility script |
| `generate_female_dwarf_suite.js` | General utility script |
| `generate_female_orc_suite.js` | General utility script |
| `generate_female_variations.js` | General utility script |
| `generate_furniture_props.js` | General utility script |
| `generate_hare_actions.js` | General utility script |
| `generate_male_variation_actions.js` | General utility script |
| `generate_nano_banana_pro.js` | General utility script |
| `generate_orc_suite.js` | General utility script |
| `generate_original_25d_art.js` | General utility script |
| `generate_perfect_settlers.js` | General utility script |
| `generate_pointy_cursors_and_default_menu.js` | General utility script |
| `generate_scale_strip.js` | General utility script |
| `generate_settler_variations.js` | General utility script |
| `generate_sheep_actions.js` | General utility script |
| `generate_walk_cycle_review.js` | General utility script |
| `generate_water_terrain_nano_pro.js` | General utility script |
| `health_audit.js` | Diagnostic, benchmark, or build utility |
| `import_standard_8d_charset.js` | General utility script |
| `inspect_65_40_sim.js` | General utility script |
| `inspect_65_40.js` | General utility script |
| `inspect_all_boar.js` | General utility script |
| `inspect_all_females_r0.js` | General utility script |
| `inspect_all_females_r1.js` | General utility script |
| `inspect_all_haul_side.js` | General utility script |
| `inspect_all_males_r1.js` | General utility script |
| `inspect_all_males_r2.js` | General utility script |
| `inspect_all_side_frames.js` | General utility script |
| `inspect_border_tiles.js` | General utility script |
| `inspect_catalog.js` | General utility script |
| `inspect_clusters_boar.js` | General utility script |
| `inspect_clusters_deer.js` | General utility script |
| `inspect_combo2_4x.js` | General utility script |
| `inspect_creatures.js` | General utility script |
| `inspect_current_sheets.js` | General utility script |
| `inspect_cursors.js` | General utility script |
| `inspect_door_boxes.js` | General utility script |
| `inspect_east_legs.js` | General utility script |
| `inspect_faces.js` | General utility script |
| `inspect_female_dwarf_grids.js` | General utility script |
| `inspect_female_variation_frames.js` | General utility script |
| `inspect_females_haul.js` | General utility script |
| `inspect_gen_c32.js` | General utility script |
| `inspect_haul_legs.js` | General utility script |
| `inspect_human_chars.js` | General utility script |
| `inspect_human_male_frames.js` | General utility script |
| `inspect_m1_walk.js` | General utility script |
| `inspect_male_frames.js` | General utility script |
| `inspect_modular_layers.js` | General utility script |
| `inspect_oak.js` | General utility script |
| `inspect_orc_grids.js` | General utility script |
| `inspect_profile.js` | General utility script |
| `inspect_props_cells.js` | General utility script |
| `inspect_props_raw.js` | General utility script |
| `inspect_r0_r1.js` | General utility script |
| `inspect_raw_nano_banana.js` | General utility script |
| `inspect_raw_wildlife_actions.js` | General utility script |
| `inspect_sheep_eat_cells.js` | General utility script |
| `inspect_sheep_eat_row1.js` | General utility script |
| `inspect_sheets.js` | General utility script |
| `inspect_songbird.js` | General utility script |
| `inspect_u7_flat_shapes.js` | General utility script |
| `inspect_u7_modular_sheet.js` | General utility script |
| `inspect_u7_pointers.js` | General utility script |
| `inspect_walk_cells.js` | General utility script |
| `inspect_walk_legs.js` | General utility script |
| `inspect_wall.js` | General utility script |
| `inspect_wolf.js` | General utility script |
| `jpg_to_png.js` | General utility script |
| `lock_in_chest.js` | General utility script |
| `make_25d.js` | General utility script |
| `measure_attack_grid.js` | General utility script |
| `measure_baselines.js` | General utility script |
| `measure_modular_u7_boxes.js` | General utility script |
| `measure_pro_walk.js` | General utility script |
| `measure_props_cells.js` | General utility script |
| `measure_raw_scales.js` | General utility script |
| `native_smoke_19a.js` | General utility script |
| `pack_deus_tileset.js` | General utility script |
| `pack_nano_banana_icons_to_iconset.js` | General utility script |
| `png_read.js` | General utility script |
| `png_util.js` | General utility script |
| `preview_all_raw_human_male.js` | General utility script |
| `preview_all_raw_orc_male.js` | General utility script |
| `preview_extracted_cells.js` | General utility script |
| `preview_raw_human_male.js` | General utility script |
| `preview_raw_orc_male.js` | General utility script |
| `preview_raw_sheep.js` | General utility script |
| `print_man1_grid.js` | General utility script |
| `process_batch2_plants.js` | General utility script |
| `process_camp_assets.js` | General utility script |
| `process_deus_cursors.js` | General utility script |
| `process_dwarf_8d_suite.js` | General utility script |
| `process_dwarf_faces_batch.js` | General utility script |
| `process_dwarf_faction_assets.js` | General utility script |
| `process_elf_8d_suite.js` | General utility script |
| `process_elf_faces_batch.js` | General utility script |
| `process_elf_faction_assets.js` | General utility script |
| `process_gnome_faction_assets.js` | General utility script |
| `process_goblin_faction_assets.js` | General utility script |
| `process_human_8d_suite.js` | General utility script |
| `process_human_faces_batch.js` | General utility script |
| `process_human_male_faces.js` | General utility script |
| `process_nano_banana_4d_charsets.js` | General utility script |
| `process_nano_banana_8way_stand.js` | General utility script |
| `process_nano_banana_batch2.js` | General utility script |
| `process_nano_banana_batch3.js` | General utility script |
| `process_nano_banana_batch4.js` | General utility script |
| `process_nano_banana_blood.js` | General utility script |
| `process_nano_banana_boar.js` | General utility script |
| `process_nano_banana_bog_horror.js` | General utility script |
| `process_nano_banana_deer.js` | General utility script |
| `process_nano_banana_dust.js` | General utility script |
| `process_nano_banana_equipment_batch1.js` | General utility script |
| `process_nano_banana_equipment_batch2.js` | General utility script |
| `process_nano_banana_face.js` | General utility script |
| `process_nano_banana_female_settler.js` | General utility script |
| `process_nano_banana_giant_spider.js` | General utility script |
| `process_nano_banana_grand_oak.js` | General utility script |
| `process_nano_banana_hit_flash.js` | General utility script |
| `process_nano_banana_meadow.js` | General utility script |
| `process_nano_banana_oak.js` | General utility script |
| `process_nano_banana_sand_stalker.js` | General utility script |
| `process_nano_banana_settler.js` | General utility script |
| `process_nano_banana_stone_axe.js` | General utility script |
| `process_nano_banana_stone_chips.js` | General utility script |
| `process_nano_banana_troll.js` | General utility script |
| `process_nano_banana_wall_stone_set.js` | General utility script |
| `process_nano_banana_wall_wood_set.js` | General utility script |
| `process_nano_banana_wall.js` | General utility script |
| `process_nano_banana_wood_chips.js` | General utility script |
| `process_nano_banana_world_assets.js` | General utility script |
| `process_orc_faction_assets.js` | General utility script |
| `process_u7_face.js` | General utility script |
| `process_u7_facesets.js` | General utility script |
| `process_wildlife_monsters.js` | General utility script |
| `profile_historical_demographics.js` | General utility script |
| `quick_verify_humans.js` | General utility script |
| `read_png.js` | General utility script |
| `refine_all_three_wildlife.js` | General utility script |
| `refine_pointy_cursors.js` | General utility script |
| `refine_wildlife_monsters.js` | General utility script |
| `refine_window_cursor.js` | General utility script |
| `register_world_plugins.js` | Diagnostic, benchmark, or build utility |
| `render_b_previews.js` | General utility script |
| `render_birds_eye_showcase.js` | General utility script |
| `render_blood_review.js` | General utility script |
| `render_boar_showcase.js` | General utility script |
| `render_bow_inspect.js` | General utility script |
| `render_candidates.js` | General utility script |
| `render_dungeon_b_preview.js` | General utility script |
| `render_effects_batch1_review.js` | General utility script |
| `render_female_dwarf_previews.js` | General utility script |
| `render_floor_review.js` | General utility script |
| `render_foliage_animation_showcase.js` | General utility script |
| `render_giant_spider_review.js` | General utility script |
| `render_ground_raw_previews.js` | General utility script |
| `render_hare_charset.js` | General utility script |
| `render_hit_flash_review.js` | General utility script |
| `render_human_tree_wall_scale.js` | General utility script |
| `render_magic_inspect.js` | General utility script |
| `render_nature_menus_preview.js` | General utility script |
| `render_outside_b_preview.js` | General utility script |
| `render_palm_pine_preview.js` | General utility script |
| `render_raw_grid.js` | General utility script |
| `render_raw_previews_2.js` | General utility script |
| `render_raw_previews.js` | General utility script |
| `render_roofs_raw_preview.js` | General utility script |
| `render_settler_v10_v15.js` | General utility script |
| `render_tilesets_bc_review.js` | General utility script |
| `render_tilesets_showcase.js` | General utility script |
| `render_troll_review.js` | General utility script |
| `render_two_square_standard.js` | General utility script |
| `render_walk_zoom.js` | General utility script |
| `render_water_review.js` | General utility script |
| `render_wildlife_actions_showcase.js` | General utility script |
| `replay_edits.js` | General utility script |
| `run_all_suites.js` | General utility script |
| `run_batch6_tests.js` | General utility script |
| `run_tests.js` | General utility script |
| `scale_resolver.js` | General utility script |
| `scan_all_character_sheets.js` | General utility script |
| `scan_u7_scenery.js` | General utility script |
| `scratch_describe_vars.js` | General utility script |
| `scratch_hair_colors.js` | General utility script |
| `scratch_inspect_hair.js` | General utility script |
| `scratch_inspect_walk.js` | General utility script |
| `scratch_inspect.js` | General utility script |
| `setup_256_middle_start.js` | General utility script |
| `setup_showcase_save.js` | General utility script |
| `stage_action_assets.js` | General utility script |
| `stage_batch1_containers.js` | General utility script |
| `switch_things_to_stock.js` | General utility script |
| `sync_save_events.js` | General utility script |
| `transform_boar_to_bear.js` | General utility script |
| `update_catalog_batch3.js` | General utility script |
| `update_catalog_batch4.js` | General utility script |
| `update_catalog_batch6.js` | General utility script |
| `update_catalog_trees.js` | General utility script |
| `update_embed_with_base64.js` | General utility script |
| `update_male_walk_strides.js` | General utility script |
| `update_materials_catalog.js` | General utility script |
| `update_pair_showcase.js` | General utility script |
| `update_review_and_artifacts.js` | General utility script |
| `update_showcase.js` | General utility script |
| `update_world_catalog.js` | General utility script |
| `validate_materials.js` | General utility script |
| `validate_srd_catalog.js` | General utility script |
| `verify_all_42_dwarf_male_charsets.js` | General utility script |
| `verify_all_42_female_charsets.js` | General utility script |
| `verify_all_42_male_charsets.js` | General utility script |
| `verify_all_6_male_variations.js` | General utility script |
| `verify_all_gen_charsets.js` | General utility script |
| `verify_and_export_settler.js` | General utility script |
| `verify_batch3_assets.js` | General utility script |
| `verify_batch4_assets.js` | General utility script |
| `verify_batch6_assets.js` | General utility script |
| `verify_biome_assets.js` | General utility script |
| `verify_furniture_and_shops_charsets.js` | General utility script |
| `verify_human_card.js` | General utility script |
| `verify_human_male_suite.js` | General utility script |
| `verify_nature_and_cursors.js` | General utility script |

### LEGACY_OR_STALE (0)
| File | Purpose / Reason |
|---|---|

