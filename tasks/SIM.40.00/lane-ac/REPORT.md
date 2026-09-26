# SIM.40.00 lane-ac report

Writer: grok. Branch: `task/lane-ac`. Base named by the brief: `092c0181949c8cb2568d86546e7e03132445df9c`.

This file records what was written and the command output. It does not decide the review.

## What was written

- `game/data/sim/materials.json` — 71 material records (29 natural, 16 loose, 25 constructed, 1 massless air). 54 of them carry a strata id in 0..53 (SIM.40.01 §2.7). Ids 38-42 are the five ore hosts with mass left null. Ids 43-47, 15 (snow) and 31 (stairs) are reserved.
- `game/data/sim/mass_tables.json` — 61 item rows and 87 object rows, one per id in `game/data/DEUS_WorldCatalog.json`.
- `game/data/sim/interactions.json` — bearing, burning, rust, erosion, and the SIM.40.01 §8.3 blast table.
- `game/data/sim/README.md` — units, the half-height conversion, how a consumer calls the reader.
- `game/js/sim/materials.js` — `createMaterials` with `material`, `massOf`, `yieldOf`, `reclaimTarget`, `billOfMaterials`, `validate`, `checksum`, `describe`.
- `tools/sim/test_materials.js` and 26 fixtures under `tools/sim/fixtures/materials/`.
- `docs/systems/DEUS_Materials.md`.

No plugin, no ledger file, and no file outside the brief's allowedPaths was edited. The exemption in DEC-028.3 is stored with `implemented: false`.

## Counts

| Item | Count |
|---|---|
| Materials | 71 |
| Strata ids used | 54 (0..53) |
| Item rows | 61 |
| Object rows | 87 |
| Massless object rows | 2 |
| Checks in `test_materials.js` | 67 |
| Negative fixture files | 26 |
| In-memory data mutants killed by `validate` (on top of the fixtures) | 8 |
| Source mutants killed by the purity scan | 4 (`LAYER_COUNT`, `STRATA_FT`, `window`, `Math.random`) |

Massless rows and reasons:

- `stockpile` — a designation of ground. The catalogue build consumes no items.
- `farm_plot` — marks soil already in the strata. The catalogue places no items.

## Value-status census

Counted by walking every field whose name ends in `status` in the three JSON files.

| Status | Count |
|---|---|
| SOURCED | 41 |
| PM_DEFAULT | 450 |
| PM_DEFAULT_UNCONFIRMED | 98 |
| OWNER_OPEN | 37 |
| PLACEHOLDER | 92 |

`PM_DEFAULT_UNCONFIRMED` is the mu proposal and every mass that is the proposal times a kilogram figure, plus the assumption that a catalogue `weight` is kilograms. `OWNER_OPEN` is the calendar (`dpy` and `tickHz` are absent), water's per-slice mass, and the ungraded ore ids. `PLACEHOLDER` is a stand-in density or a reserved id with no mass.

## Disagreements (not resolved)

Stored on the records and in `materials.json` `disagreements`. The applied number is the one the ledger can book. The other number stays on the record.

| Id | Sources | What the data stores |
|---|---|---|
| D-MU-UNIT | Lane Q kilograms; Lane R 1/16 lb; Lane W grams; ledger size unset (`ledger_defaults.js` lines 9-10) | Proposal 1 mu = 1 g, `confirmed: false` |
| D-SOIL-SPLIT | Lane Q §9.1 950/50 per mille; ledger soil is mineral and humus is organic | Full mass on class `soil`. Split stored with `applied: false` |
| D-FIRE-SINK | Lane R AIR sink; ledger burn keeps ash and charcoal (LEDGER_API §7) | Gas fraction retained as charcoal. Lane R fractions `applied: false` |
| D-RECLAIM-ORGANIC | DEC-028 says soil; ledger `rot` / `litter` end at `humus` | `dec028: soil`, `ledgerClass: humus` |
| D-RECLAIM-RUBBLE | DEC-028 one step to solid stone; ledger has weather then lithify, no rubble-to-stone row | Path `rubble → sediment → stone` |
| D-NOBLE | DEC-028 allows trace; Lane R NOBLE never corrodes; no `au_trace` or `pt_trace` | Same-class scrap |
| D-TIN | Catalogue tin and bronze; ledger has no `sn` (LEDGER_API §10) | Tin mu unmapped. Bronze copper share 880/1000 is `cu_metal` |
| D-BONE | Lane R bone family; ledger has none | Class `biomass` |
| D-ASH-MASS | Lane Q 850 kg; Lane R 40 lb/ft³ | 850 kg |
| D-CHARCOAL-MASS | No Lane Q figure; Lane R 15 lb/ft³ | 340 kg by the kilogram rounding rule |
| D-WATER-SLICE | 7 du per layer (`DEUS_Fluid.js:50`); 5 slices | Per-slice water null |
| D-SALVAGE-RATE | Registry masonry 0.8; Lane Q 75 percent | Whole mass returned on each alternative path. Neither fraction deletes matter |
| D-OBJECT-VOXEL | Catalogue prop bills; Lane Q voxel fills | Prop bill is the object mass. Not forced equal to a voxel count |
| D-CATALOG-YIELD | Wall quarry that also leaves rubble; door dismantle that returns half; chop that drops hardware or fruit | Those counts are on `catalogNotApplied` |
| D-GOLD-NUGGET | Outcrop yields item `gold` (`au_metal`) | Source mu is `au_ore`. Path is `mine` then `smelt`, equal mu |
| D-RUBBLE-OBJECT | Prop pick yields stone | Class stays `rubble` |
| D-GRAVEL-OBJECT | Prop pick yields stone; strata material gravel is `rubble` | The prop is booked as stone |
| D-CLAY-ACTIONS | `clay_deposit` gather 2 and quarry 3, both remove the prop | Quarry count is the mass |
| D-CAMPFIRE-RUIN | Catalogue ruin is `bones_pile` | Collapse follows the log and stone bill |
| D-TIMBER-INFILL | Lane Q names mineral infill; published kg is 0.12 of the species | No infill mass added |
| D-WOOD-COLLAPSE | Lane Q broken timber in place; no wood object-to-strata row | Salvage to a wood item of equal mu |
| D-SCRAP-FORM | Loose scrap; metal classes have no strata form | Form `item` |
| D-TREE-CLASS | LEDGER_API §9.2 calls trees biomass; chop yield is wood | Class `wood` |
| D-GLASS | Lane R glass, ceramic, lead, specials | No stand-in class and no mass row |
| D-SNOW | Id 15 reserved; class water has no snow form | No ledger class |
| D-ICE-BULK | Loose bulk is 607 kg; the slice load is 1,011 kg | A broken slice deposits 1,011 kg |

## Owner / PM questions

Not answered here. The data keeps the open value null, or marks the proposal `PM_DEFAULT_UNCONFIRMED`.

1. **Mu size.** Options: (A) 1 mu = 1 g, the proposal loaded in `materials.json`; (B) 1 mu = 1 kg, the example in the brief; (C) 1 mu = 1/16 lb, Lane R's assumption. `confirmed` is false.
2. **D-1 calendar.** `calendar.dpy` and `calendar.tickHz` are null, status `OWNER_OPEN`. Options remain the ones in SIM.40.01 §7.6 and SIM.40.05 §0.3. No option is selected. Decay lives are milli-years of simulated time, which do not need DPY.
3. **Water slices.** A layer is 7 du and holds 5 slices. Options: (A) leave per-slice water null, which is what the file does; (B) an integer pattern of du across the five slices that sums to 7; (C) a different du definition. No pattern is stored.
4. **Catalogue `weight` unit.** The field does not name a unit. Options: (A) kilograms, which is what `catalogWeightTimes1000` assumes; (B) pounds. Status on those item masses is `PM_DEFAULT_UNCONFIRMED`.
5. **One-action salvage split.** Registry `masonry_structures` is 0.8. Lane Q cites 75 percent. Options: (A) returned items and debris split 80/20; (B) 75/25; (C) the yield path returns the whole bill as items and the collapse path is a separate whole-mass debris path, which is what the tables do. A and B still have to sum to the element's mu. Neither fraction is stored as a deletion.
6. **`clay_deposit`.** Gather yields 2 clay. Quarry yields 3. Both remove the prop. The quarry figure is the PM default on the row. The gather figure is recorded and not applied.
7. **Vein grade** for strata ids 38-47. Mass is null, status `OWNER_OPEN`, until WG.61 sets a grade. Putting the host-rock kilogram onto `fe_ore` would inflate the finite family.
8. **Props with no catalogue bill, and items with no weight.** `bridge` is four logs and `well` is four stone (PM default). Unweighed items use the carried masses on their rows (log 8 kg, stone 15 kg, and the other raw rows). Those are PM defaults, not measurements.

## Follow-ups

Not WBS ids.

- **PROPOSED-AC-01.** SIM.40.11 posts `yieldOf`, collapse, and `billOfMaterials` through the ledger at the strata, item and object writers, and applies DEC-028.3 from the exemption record.
- **PROPOSED-AC-02.** SIM.50.02 reads `porosity.perm` and replaces the null fraction.
- **PROPOSED-AC-03.** WG.61 sets ore grade for strata ids 38-47 before those slices get a mu.
- **PROPOSED-AC-04.** Composite items (sword, spear, stone axe, shields, mail) need component masses. The whole mu is on the dominant class.
- **PROPOSED-AC-05.** Ledger classes for tin, bone, glass, ceramic and lead, if those families are wanted. This package did not invent them.
- **PROPOSED-AC-06.** Reconcile a catalogue prop's bill with the Lane Q voxels that prop will occupy (`D-OBJECT-VOXEL`).
- **PROPOSED-AC-07.** Assign 7 du across 5 water slices (question 3).
- **PROPOSED-AC-08.** SIM.50.06 gives snow a form and a mass. Strata id 15 is reserved for that.

## Gate commands

Run from the worktree root after implementation commit `ddbc3b8d2a542d8014373bc2c577aa2eeb70aeb1`. Each command is a `gateTests` entry from `tasks/SIM.40.00/lane-ac/lane.json`. Raw output follows.

### node tools/sim/test_materials.js

```
PASS clean_validate
PASS determinism_checksum
PASS purity_clean
PASS mutant_layer_count_killed
PASS mutant_one_ft_killed
PASS mutant_host_killed
PASS mutant_random_killed
PASS slice_mass_conserved
PASS ore_not_emitted
PASS bills_sum
PASS catalog_items_covered
PASS catalog_objects_covered
PASS mu_unconfirmed
PASS calendar_open
PASS no_save_migration
PASS no_layer_count_field
PASS granite_slice
PASS granite_by_strata_id
PASS stone_item
PASS stockpile_massless
PASS water_slice_open
PASS masonry_bill
PASS wall_stone_bill
PASS reclaim_iron_trace
PASS reclaim_gold_scrap
PASS reclaim_wood_both
PASS electrum_matches_ledger
PASS lava_ratio
PASS yield_of_granite_sums
PASS rubble_both_shapes
PASS bad_count_throws
PASS zero_count
PASS fixtures_present
PASS fixture_bad_alloy
PASS fixture_bad_blast
PASS fixture_bad_bom
PASS fixture_bad_calendar
PASS fixture_bad_class
PASS fixture_bad_collapse
PASS fixture_bad_combustion
PASS fixture_bad_coverage_item
PASS fixture_bad_coverage_object
PASS fixture_bad_family
PASS fixture_bad_family_mass
PASS fixture_bad_gap
PASS fixture_bad_item_weight
PASS fixture_bad_layer
PASS fixture_bad_mass_float
PASS fixture_bad_mass_negative
PASS fixture_bad_massless
PASS fixture_bad_metal_reclaim
PASS fixture_bad_migration
PASS fixture_bad_mu_status
PASS fixture_bad_noble
PASS fixture_bad_ore_reclaim
PASS fixture_bad_ore_yield
PASS fixture_bad_strata_id
PASS fixture_bad_transform
PASS fixture_bad_yield
PASS mutant_yield_short
PASS mutant_collapse_short
PASS mutant_ore_yield
PASS mutant_bom
PASS mutant_coverage_item
PASS mutant_metal_reclaim
PASS mutant_mu_confirmed
PASS mutant_combustion
RESULT: 67 passed, 0 failed
EXIT=0
```

### node tools/sim/test_ledger.js

```
WG.65.15 ledger tests; node v24.19.0; files: game/js/sim/ledger.js, game/js/sim/ledger_defaults.js
PASS load_in_bare_vm_context (ECMAScript built-ins only; Math.random throws; Date removed)
PASS purity_dynamic_context_is_bare (undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,threw)
PASS defaults_minimum_classes_and_forms
PASS defaults_no_row_outputs_ore
PASS defaults_rows_keep_elements
PASS defaults_sources_never_ore_or_finite
PASS defaults_magic_flagged_unconfirmed
PASS defaults_deterministic_describe_and_checksum
PASS config_rejects_ore_output_row
PASS config_rejects_ore_output_recipe
PASS config_rejects_ore_source_list
PASS config_finite_source_needs_flag
PASS config_rejects_cross_element_row
PASS config_rejects_unbalanced_recipe
PASS config_rejects_malformed
PASS config_is_copied_at_load
PASS config_sources_are_data_driven
PASS register_and_totals
PASS seal_enforced
PASS register_rejects_unknown_class_and_form
PASS amount_rejects_non_integers
PASS amount_zero_allowed
PASS amount_overflow_rejected
PASS composite_amounts_are_multiples
PASS transform_conserves_totals
PASS transform_needs_a_table_row
PASS transform_insufficient_is_atomic
PASS transform_ore_output_refused_at_call
PASS transform_element_change_refused_at_call
PASS ore_moves_form_and_only_decreases
PASS rust_keeps_element
PASS decay_chain_conserves_mass
PASS decay_chain_skip_and_reverse_refused
PASS fire_leaves_ash_and_charcoal
PASS water_freezes_and_thaws
PASS electrum_recipe_conserves_gold_and_silver
PASS cause_required
PASS source_undeclared_name_refused
PASS source_ore_refused_at_call
PASS source_finite_refused
PASS source_sink_scope
PASS magic_source_and_sink_logged_with_cause
PASS sink_can_lower_ore_and_is_atomic
PASS audit_clean_recount
PASS audit_detects_every_class_and_form
PASS audit_detects_form_shift
PASS audit_class_level_recount
PASS audit_missing_counts_as_zero_and_unknown_keys
PASS audit_rejects_bad_recount_values
PASS interval_identity_and_close
PASS snapshot_is_json_safe
PASS restore_round_trip_and_continue
PASS restore_ignores_key_order
PASS restore_rejects_tampering
PASS restore_unsealed_snapshot
PASS checksum_deterministic_and_pure
PASS checksum_sees_every_class
PASS checksum_sees_which_class_holds_what
PASS log_is_bounded
PASS purity_static_ledger_js (no ADR-003 §2.3 identifier, only ./ledger* requires, Math within §10.4)
PASS purity_static_ledger_defaults_js (no ADR-003 §2.3 identifier, only ./ledger* requires, Math within §10.4)
PASS purity_mutant_window_detected (forbidden identifier window)
PASS purity_mutant_math_random_detected (Math.random is not on the ADR-003 §10.4 list)
PASS purity_mutant_math_random_computed_detected (Math used other than as Math.<exact function>)
PASS purity_mutant_date_detected (forbidden identifier Date)
PASS purity_mutant_require_fs_detected (require() of something other than a ./ledger* string)
PASS purity_mutant_global_in_template_detected (forbidden identifier process)
PASS purity_mutant_math_sin_detected (Math.sin is not on the ADR-003 §10.4 list)
PASS purity_mutant_rmmz_global_detected (forbidden identifier $gameMap)
PASS purity_mutant_facade_detected (forbidden identifier UF)
PASS purity_mutant_function_constructor_detected (forbidden identifier Function)
PASS purity_static_ignores_comments_strings_regex (names inside comments, strings, template text and a regex are not flagged)
PASS mutant_transform_drops_1_unit_killed (12 check(s) fail, e.g. amount_zero_allowed, composite_amounts_are_multiples, transform_conserves_totals [E_INSUFFICIENT: transform "stone"/"object" -> "stone"/"ruin": stone|ruin holds 0, cannot r])
PASS mutant_transform_adds_1_unit_killed (11 check(s) fail, e.g. amount_zero_allowed, composite_amounts_are_multiples, transform_conserves_totals [zero changes nothing: expected 10500, got 10501])
PASS mutant_source_skips_name_check_killed (2 check(s) fail, e.g. config_sources_are_data_driven, source_undeclared_name_refused [magic removed from the table: expected E_UNKNOWN_SOURCE, got  Cannot read properties of un])
PASS mutant_sink_skips_name_check_killed (1 check(s) fail, e.g. source_undeclared_name_refused [sink "nowhere": expected E_UNKNOWN_SINK, got  Cannot read properties of undefined (reading])
PASS mutant_ore_output_allowed_at_load_killed (1 check(s) fail, e.g. config_rejects_ore_output_row [row stone -> fe_ore: expected E_ORE_OUTPUT, got E_FAMILY E_FAMILY: transform row 83 (sprou])
PASS mutant_ore_output_allowed_at_call_killed (2 check(s) fail, e.g. config_is_copied_at_load, transform_ore_output_refused_at_call [transform: expected E_ORE_OUTPUT, got E_FAMILY E_FAMILY: transform "stone"/"strata" -> "fe])
PASS mutant_ore_source_allowed_at_call_killed (4 check(s) fail, e.g. config_finite_source_needs_flag, config_is_copied_at_load, ore_moves_form_and_only_decreases [ore is never allowed: expected E_ORE_OUTPUT, got E_SOURCE_SCOPE E_SOURCE_SCOPE: source "ma])
PASS mutant_ore_source_allowed_at_load_killed (1 check(s) fail, e.g. config_rejects_ore_source_list [magic listing fe_ore: expected E_ORE_OUTPUT, got E_FINITE_SOURCE E_FINITE_SOURCE: source m])
PASS mutant_ore_recipe_output_allowed_killed (1 check(s) fail, e.g. config_rejects_ore_output_recipe [recipe: expected E_ORE_OUTPUT, nothing was thrown])
PASS mutant_rust_changes_element_in_defaults_killed (58 check(s) fail, e.g. defaults_minimum_classes_and_forms, defaults_no_row_outputs_ore, defaults_rows_keep_elements [E_FAMILY: transform row 80 (rust) changes the element/family mix: fe_metal [["fe",1]] -> c])
PASS mutant_element_check_removed_at_load_killed (1 check(s) fail, e.g. config_rejects_cross_element_row [fe_metal -> cu_trace: expected E_FAMILY, nothing was thrown])
PASS mutant_element_check_removed_at_call_killed (1 check(s) fail, e.g. transform_element_change_refused_at_call [fe -> cu: expected E_FAMILY, got E_NO_ENTRY E_NO_ENTRY: transform "fe_metal"/"item" -> "cu])
PASS mutant_recipe_balance_unchecked_killed (1 check(s) fail, e.g. config_rejects_unbalanced_recipe [au 1 + ag 1 -> electrum 4: expected E_FAMILY, nothing was thrown])
PASS mutant_finite_source_allowed_at_call_killed (1 check(s) fail, e.g. source_finite_refused [magic fe_metal: expected E_FINITE_SOURCE, got E_SOURCE_SCOPE E_SOURCE_SCOPE: source "magic])
PASS mutant_finite_source_allowed_at_load_killed (2 check(s) fail, e.g. defaults_sources_never_ore_or_finite, config_finite_source_needs_flag [source debug-explicit allows finite ag_metal|item])
PASS mutant_seal_not_enforced_for_register_killed (1 check(s) fail, e.g. seal_enforced [register after seal: expected E_SEALED, nothing was thrown])
PASS mutant_seal_not_enforced_for_calls_killed (1 check(s) fail, e.g. seal_enforced [transform before seal: expected E_NOT_SEALED, got  Cannot read properties of null (reading])
PASS mutant_float_accepted_killed (3 check(s) fail, e.g. amount_rejects_non_integers, amount_overflow_rejected, audit_rejects_bad_recount_values [register 1.5: expected E_AMOUNT, got E_MULTIPLE E_MULTIPLE: register "stone"/"strata" (cau])
PASS mutant_negative_accepted_killed (3 check(s) fail, e.g. amount_rejects_non_integers, audit_rejects_bad_recount_values, restore_rejects_tampering [register -1: expected E_AMOUNT, got E_INSUFFICIENT E_INSUFFICIENT: register "stone"/"strat])
PASS mutant_overflow_unchecked_killed (1 check(s) fail, e.g. amount_overflow_rejected [electrum key beyond MAX: expected E_OVERFLOW, nothing was thrown])
PASS mutant_family_overflow_unchecked_killed (1 check(s) fail, e.g. amount_overflow_rejected [family mineral: expected E_OVERFLOW, nothing was thrown])
PASS mutant_insufficient_unchecked_killed (3 check(s) fail, e.g. transform_insufficient_is_atomic, electrum_recipe_conserves_gold_and_silver, sink_can_lower_ore_and_is_atomic [too much: expected E_INSUFFICIENT, nothing was thrown])
PASS mutant_composite_multiple_unchecked_killed (1 check(s) fail, e.g. composite_amounts_are_multiples [register 3 electrum: expected E_MULTIPLE, nothing was thrown])
PASS mutant_cause_unchecked_killed (2 check(s) fail, e.g. register_rejects_unknown_class_and_form, cause_required [empty cause: expected E_CAUSE, nothing was thrown])
PASS mutant_audit_ignores_a_class_killed (3 check(s) fail, e.g. audit_clean_recount, audit_detects_every_class_and_form, audit_missing_counts_as_zero_and_unknown_keys [every (class, form) checked: expected 68, got 64])
PASS mutant_audit_ignores_families_killed (1 check(s) fail, e.g. audit_detects_every_class_and_form [family diffs for ag_metal differ:])
PASS mutant_closure_check_disabled_killed (1 check(s) fail, e.g. restore_rejects_tampering [tamper closure: amount: expected E_SNAPSHOT, nothing was thrown])
PASS mutant_interval_family_identity_disabled_killed (1 check(s) fail, e.g. restore_rejects_tampering [tamper interval family identity: expected E_SNAPSHOT, nothing was thrown])
PASS mutant_interval_class_identity_disabled_killed (1 check(s) fail, e.g. restore_rejects_tampering [tamper interval class identity: expected E_SNAPSHOT, nothing was thrown])
PASS mutant_checksum_ignores_key_order_killed (1 check(s) fail, e.g. restore_ignores_key_order [checksum after restoring reversed keys: expected "20f79ada", got "7a4b911a"])
PASS mutant_checksum_commutative_killed (1 check(s) fail, e.g. checksum_sees_which_class_holds_what [swapped amounts give the same checksum])
PASS mutant_checksum_ignores_a_class_killed (1 check(s) fail, e.g. checksum_sees_every_class [checksum ignores gem|strata])
PASS mutant_restore_accepts_bad_amounts_killed (1 check(s) fail, e.g. restore_rejects_tampering [tamper negative pair: expected E_SNAPSHOT, nothing was thrown])
PASS mutant_restore_skips_closure_killed (1 check(s) fail, e.g. restore_rejects_tampering [tamper closure: amount: expected E_SNAPSHOT, nothing was thrown])
PASS mutant_log_unbounded_killed (1 check(s) fail, e.g. log_is_bounded [events kept: expected 16, got 2001])
PASS mutant_refused_call_leaves_trace_killed (4 check(s) fail, e.g. transform_insufficient_is_atomic, electrum_recipe_conserves_gold_and_silver, sink_can_lower_ore_and_is_atomic [no trace of the refused call: expected "2a8469f1", got "4f22a7e0"])
PASS mutant_defaults_ore_sprout_row_killed (56 check(s) fail, e.g. defaults_minimum_classes_and_forms, defaults_no_row_outputs_ore, defaults_rows_keep_elements [E_ORE_OUTPUT: transform row 16 (sprout) outputs ore class fe_ore from stone (LIFE-002: ore])
PASS mutant_defaults_decay_skip_row_killed (2 check(s) fail, e.g. defaults_decay_chain_rows, decay_chain_skip_and_reverse_refused [skip/reverse row rubble|strata>stone|strata must not exist])
PASS mutant_defaults_magic_marked_confirmed_killed (1 check(s) fail, e.g. defaults_magic_flagged_unconfirmed [magic ownerConfirmed: expected false, got true])
PASS mutant_defaults_magic_allows_finite_killed (3 check(s) fail, e.g. defaults_sources_never_ore_or_finite, config_finite_source_needs_flag, source_finite_refused [source magic allows finite ag_metal|item])
PASS mutant_defaults_not_frozen_killed (1 check(s) fail, e.g. defaults_module_is_frozen [a defaults object is not frozen])
PASS mutant_hidden_math_random_caught_dynamically_killed (59 check(s) fail, e.g. defaults_minimum_classes_and_forms, defaults_no_row_outputs_ore, defaults_rows_keep_elements [PURITY: Math.random called]; static scan of the mutant: clean, so only the bare vm context catches it)
mutants: 42; run time 14410 ms
RESULT: 117 passed, 0 failed
EXIT=0
```

### node tools/check_deus_syntax.js

```
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

## Scope

Command, at implementation HEAD:

```
git rev-parse HEAD
ddbc3b8d2a542d8014373bc2c577aa2eeb70aeb1

git diff --name-only 092c0181949c8cb2568d86546e7e03132445df9c..HEAD
docs/systems/DEUS_Materials.md
game/data/sim/README.md
game/data/sim/interactions.json
game/data/sim/mass_tables.json
game/data/sim/materials.json
game/js/sim/materials.js
tasks/SIM.40.00/lane-ac/BRIEF.md
tasks/SIM.40.00/lane-ac/lane.json
tools/sim/fixtures/materials/bad_alloy.json
tools/sim/fixtures/materials/bad_blast.json
tools/sim/fixtures/materials/bad_bom.json
tools/sim/fixtures/materials/bad_calendar.json
tools/sim/fixtures/materials/bad_class.json
tools/sim/fixtures/materials/bad_collapse.json
tools/sim/fixtures/materials/bad_combustion.json
tools/sim/fixtures/materials/bad_coverage_item.json
tools/sim/fixtures/materials/bad_coverage_object.json
tools/sim/fixtures/materials/bad_family.json
tools/sim/fixtures/materials/bad_family_mass.json
tools/sim/fixtures/materials/bad_gap.json
tools/sim/fixtures/materials/bad_item_weight.json
tools/sim/fixtures/materials/bad_layer.json
tools/sim/fixtures/materials/bad_mass_float.json
tools/sim/fixtures/materials/bad_mass_negative.json
tools/sim/fixtures/materials/bad_massless.json
tools/sim/fixtures/materials/bad_metal_reclaim.json
tools/sim/fixtures/materials/bad_migration.json
tools/sim/fixtures/materials/bad_mu_status.json
tools/sim/fixtures/materials/bad_noble.json
tools/sim/fixtures/materials/bad_ore_reclaim.json
tools/sim/fixtures/materials/bad_ore_yield.json
tools/sim/fixtures/materials/bad_strata_id.json
tools/sim/fixtures/materials/bad_transform.json
tools/sim/fixtures/materials/bad_yield.json
tools/sim/test_materials.js
```

`BRIEF.md` and `lane.json` are the PM's lane-open commit on this branch. Every path is under the brief's allowedPaths. The commit that adds this report adds `tasks/SIM.40.00/lane-ac/REPORT.md` only.

## Commit

```
git rev-parse HEAD
ddbc3b8d2a542d8014373bc2c577aa2eeb70aeb1
```

That is the implementation commit the gates ran against. The commit that adds this file is its child.
