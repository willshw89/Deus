# Grok review: WG.65.15 Lane L1 per-class mass ledger

Reviewed commit: 4c590491efe55dc71d554ca3ede874d9b9dcb28d

Independent review of the Lane L1 tip. No production code, tests, fixtures, BRIEF, or API docs were modified. No art was generated, requested, or integrated (DEC-007).

## Worktree identity

Commands run in `C:\Users\snewt\.deus_worktrees\lane-l1` before the review clone.

```text
$ git rev-parse HEAD origin/task/lane-l1
4c590491efe55dc71d554ca3ede874d9b9dcb28d
4c590491efe55dc71d554ca3ede874d9b9dcb28d
EXIT=0

$ git log -8 --format="%H %an %s"
4c590491efe55dc71d554ca3ede874d9b9dcb28d deus-claude [claude] WG.65.15 REPORT.md: record the report commit hash
ec70730d19d33d43f05c25932385d6ca3a6e8260 deus-claude [claude] WG.65.15 REPORT.md and raw gate evidence (worktree and fresh CRLF clone at 6b15462c)
6b15462c3732755377f8491fec763586746c29bc deus-claude [claude] WG.65.15 WIP: LEDGER_API.md citation fixes (F-04 line, ADR lines, tamper count)
34dda72129cf860bb4ebb883e87b75de1410dd89 deus-claude [claude] WG.65.15 WIP: LEDGER_API.md with generated default tables and hook-up notes
d63b901c9b0d431aa23b27fcb50a45b48f4f5324 deus-claude [claude] WG.65.15 WIP: freeze shared defaults; amount errors name class and cause
3304ca2e88de9a861b058513569c164959948489 deus-claude [claude] WG.65.15 WIP: deterministic long-run conservation harness, faults and pinned checksums
3900a050fe4b60fcccd5ff6b3bb220be75f8efad deus-claude [claude] WG.65.15 WIP: unit, purity and mutation tests (115 checks, 41 mutants)
d06afa27c7c2bcc4380d225bf59efa862297324c deus-claude [claude] WG.65.15 WIP: host-agnostic mass ledger module and default tables
EXIT=0
```

HEAD equals `origin/task/lane-l1`. Both print `4c590491efe55dc71d554ca3ede874d9b9dcb28d`.

## Fresh clone

```text
$ git clone -c core.autocrlf=false C:\Users\snewt\.deus_worktrees\lane-l1 $TEMP\wg6515-review-4c590491
CLONE_EXIT=0
$ git checkout --detach 4c590491efe55dc71d554ca3ede874d9b9dcb28d
HEAD is now at 4c590491 [claude] WG.65.15 REPORT.md: record the report commit hash
CHECKOUT_EXIT=0
$ git rev-parse HEAD
4c590491efe55dc71d554ca3ede874d9b9dcb28d
REVPARSE_EXIT=0
$ git status --short
STATUS_EXIT=0
$ git config --get core.autocrlf
false
AUTOCRLF_EXIT=0
$ node --version
v24.19.0
NODE_EXIT=0
```

Every command below ran in that detached clone (`C:\Users\snewt\AppData\Local\Temp\wg6515-review-4c590491`). The clone was deleted after these commands.

## Scope

Base `9cba41eaf6378048d50004dcf243defbfe7f17f4` to tip `4c590491efe55dc71d554ca3ede874d9b9dcb28d`.

```text
$ git diff --name-status 9cba41eaf6378048d50004dcf243defbfe7f17f4 4c590491efe55dc71d554ca3ede874d9b9dcb28d
NAMESTATUS_EXIT=0
```

The status/path separator is a tab. Split on that tab, every row is status `A`:

```text
STATUS=A PATH=game/js/sim/ledger.js
STATUS=A PATH=game/js/sim/ledger_defaults.js
STATUS=A PATH=tasks/WG.65.15/lane-l1/BRIEF.md
STATUS=A PATH=tasks/WG.65.15/lane-l1/LEDGER_API.md
STATUS=A PATH=tasks/WG.65.15/lane-l1/REPORT.md
STATUS=A PATH=tasks/WG.65.15/lane-l1/evidence/clone_doc_tables_check.txt
STATUS=A PATH=tasks/WG.65.15/lane-l1/evidence/clone_gate1_test_ledger.txt
STATUS=A PATH=tasks/WG.65.15/lane-l1/evidence/clone_gate2_test_ledger_longrun.txt
STATUS=A PATH=tasks/WG.65.15/lane-l1/evidence/clone_gate3_check_deus_syntax.txt
STATUS=A PATH=tasks/WG.65.15/lane-l1/evidence/clone_vs_worktree.txt
STATUS=A PATH=tasks/WG.65.15/lane-l1/evidence/doc_tables_check.txt
STATUS=A PATH=tasks/WG.65.15/lane-l1/evidence/gate1_test_ledger.txt
STATUS=A PATH=tasks/WG.65.15/lane-l1/evidence/gate2_test_ledger_longrun.txt
STATUS=A PATH=tasks/WG.65.15/lane-l1/evidence/gate3_check_deus_syntax.txt
STATUS=A PATH=tasks/WG.65.15/lane-l1/evidence/scope_check.txt
STATUS=A PATH=tasks/WG.65.15/lane-l1/gen_ledger_tables.js
STATUS=A PATH=tasks/WG.65.15/lane-l1/lane.json
STATUS=A PATH=tasks/WG.65.15/lane-l1/launches/20260926_042828_prompt.txt
STATUS=A PATH=tools/sim/fixtures/ledger/longrun_expected.json
STATUS=A PATH=tools/sim/test_ledger.js
STATUS=A PATH=tools/sim/test_ledger_longrun.js
TABLE_EXIT=0
```

| Status | Path | allowedPaths |
| --- | --- | --- |
| A | `game/js/sim/ledger.js` | `game/js/sim/ledger*` |
| A | `game/js/sim/ledger_defaults.js` | `game/js/sim/ledger*` |
| A | `tasks/WG.65.15/lane-l1/BRIEF.md` | `tasks/WG.65.15/**` |
| A | `tasks/WG.65.15/lane-l1/LEDGER_API.md` | `tasks/WG.65.15/**` |
| A | `tasks/WG.65.15/lane-l1/REPORT.md` | `tasks/WG.65.15/**` |
| A | `tasks/WG.65.15/lane-l1/evidence/clone_doc_tables_check.txt` | `tasks/WG.65.15/**` |
| A | `tasks/WG.65.15/lane-l1/evidence/clone_gate1_test_ledger.txt` | `tasks/WG.65.15/**` |
| A | `tasks/WG.65.15/lane-l1/evidence/clone_gate2_test_ledger_longrun.txt` | `tasks/WG.65.15/**` |
| A | `tasks/WG.65.15/lane-l1/evidence/clone_gate3_check_deus_syntax.txt` | `tasks/WG.65.15/**` |
| A | `tasks/WG.65.15/lane-l1/evidence/clone_vs_worktree.txt` | `tasks/WG.65.15/**` |
| A | `tasks/WG.65.15/lane-l1/evidence/doc_tables_check.txt` | `tasks/WG.65.15/**` |
| A | `tasks/WG.65.15/lane-l1/evidence/gate1_test_ledger.txt` | `tasks/WG.65.15/**` |
| A | `tasks/WG.65.15/lane-l1/evidence/gate2_test_ledger_longrun.txt` | `tasks/WG.65.15/**` |
| A | `tasks/WG.65.15/lane-l1/evidence/gate3_check_deus_syntax.txt` | `tasks/WG.65.15/**` |
| A | `tasks/WG.65.15/lane-l1/evidence/scope_check.txt` | `tasks/WG.65.15/**` |
| A | `tasks/WG.65.15/lane-l1/gen_ledger_tables.js` | `tasks/WG.65.15/**` |
| A | `tasks/WG.65.15/lane-l1/lane.json` | `tasks/WG.65.15/**` |
| A | `tasks/WG.65.15/lane-l1/launches/20260926_042828_prompt.txt` | `tasks/WG.65.15/**` |
| A | `tools/sim/fixtures/ledger/longrun_expected.json` | `tools/sim/fixtures/ledger/**` |
| A | `tools/sim/test_ledger.js` | `tools/sim/test_ledger*.js` |
| A | `tools/sim/test_ledger_longrun.js` | `tools/sim/test_ledger*.js` |

21 paths, 0 outside allowedPaths. No gameplay file (`game/js/plugins/**`, `game/js/plugins.js`, `game/data/**`) is in the diff. No `docs/**` or `art/**` path is in the diff.

```text
$ git diff --name-only 9cba41eaf6378048d50004dcf243defbfe7f17f4 4c590491efe55dc71d554ca3ede874d9b9dcb28d -- art game/js/plugins game/js/plugins.js game/data docs
FORBIDDEN_EXIT=0
```

No output. Image and art-path filter over the same name list: `IMG_MATCHES=0`, `IMG_EXIT=0`.

`git diff --name-only 6b15462c3732755377f8491fec763586746c29bc 4c590491efe55dc71d554ca3ede874d9b9dcb28d` is only `tasks/WG.65.15/lane-l1/REPORT.md` and ten files under `tasks/WG.65.15/lane-l1/evidence/`. The ledger, defaults, tests, and fixture at the tip are the bytes the recorded gates ran on. `SINCE_CODE_EXIT=0`, `STAT_EXIT=0`.

## Gate tests

### 1. `node tools/sim/test_ledger.js`

```text
WG.65.15 ledger tests; node v24.19.0; files: game/js/sim/ledger.js, game/js/sim/ledger_defaults.js
PASS load_in_bare_vm_context (ECMAScript built-ins only; Math.random throws; Date removed)
PASS purity_dynamic_context_is_bare (undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,threw)
PASS defaults_minimum_classes_and_forms
PASS defaults_no_row_outputs_ore
PASS defaults_rows_keep_elements
PASS defaults_sources_never_ore_or_finite
PASS defaults_magic_flagged_unconfirmed
PASS defaults_decay_chain_rows
PASS defaults_rust_rows_keep_element
PASS defaults_module_is_frozen
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
mutants: 42; run time 10533 ms
RESULT: 117 passed, 0 failed
EXIT=0
```

Counted from that output: `G1_PASS=117`, `G1_FAIL=0`, `G1_MUTANT_PASS=42`.

### 2. `node tools/sim/test_ledger_longrun.js`

```text
WG.65.15 long-run ledger harness; node v24.19.0; geometry: cell 5 ft, layer 10 ft = 5 slices x 2 ft, chunk 32x32 cells, area 128x128 cells
== seed 1, layers -16..15 (32), 100,000 operations, recount every 1,000 ==
  world: after generation 6,195 cells in 388 chunks; now 22,159 cells in 462 of 512 possible chunks (Lower-2 128, Lower-1 128, Surface 64, Upper-1 71, Upper-2 71)
  class totals, start -> end (mass units; water in depth units):
    ag_metal 430 -> 41,551                ag_ore 769,350 -> 682,548             ag_trace 0 -> 37,830                  ash 0 -> 3,760                        
    au_metal 363 -> 64,760                au_ore 517,845 -> 453,531             biomass 75,470 -> 77,099              charcoal 990 -> 50,318                
    cu_metal 814 -> 73,192                cu_ore 1,374,568 -> 1,221,972         cu_trace 0 -> 67,055                  electrum 572 -> 406                   
    fe_metal 1,812 -> 150,848             fe_ore 2,648,317 -> 2,319,263         fe_trace 0 -> 135,235                 gem 383,477 -> 383,477                
    humus 30,249 -> 60,783                lava 928 -> 300                       pt_metal 142 -> 49,830                pt_ore 581,000 -> 531,312             
    rubble 2,227 -> 4,233,371             sediment 513,750 -> 1,577,425         soil 546,252 -> 1,090,588             steel 532 -> 19,994                   
    stone 22,073,489 -> 16,300,344        water 13,960 -> 49,850                wood 30,529 -> 17,474                 
  family totals, start + sources - sinks = end:
    mineral: 23,136,646 + 137,587 - 72,205 = 23,202,028
    organic: 137,238 + 102,764 - 30,568 = 209,434
    water:   13,960 + 58,716 - 22,826 = 49,850
    fe:      2,650,661 + 0 - 25,321 = 2,625,340  (finite)
    cu:      1,375,382 + 0 - 13,163 = 1,362,219  (finite)
    ag:      770,066 + 0 - 7,934 = 762,132  (finite)
    au:      518,494 + 0 - 0 = 518,494  (finite)
    pt:      581,142 + 0 - 0 = 581,142  (finite)
    gem:     383,477 + 0 - 0 = 383,477  (finite)
  ore totals at the end: fe_ore 2,319,263, cu_ore 1,221,972, ag_ore 682,548, au_ore 453,531, pt_ore 531,312
  operations: alloy=44 ash_weather=1,190 build=4,788 butcher=581 chop=13 collapse=1,989 creature_move=2,614 debug=997 decay_ruin=5,176 die=1,093 dig_fill=1,928 drink=1,983 eat=1,273 erode=3,703 evaporate=3,034 excrete=1,475 fell=999 fire=2,744 forge=405 freeze=2,992 grow=3,014 harvest=1,569 haul=5,630 kiln=310 lithify=1,984 litter=1,484 magic_sink=951 magic_source=998 migrant_arrives=936 mine_gem=525 mine_ore=3,878 mine_stone=4,822 part=73 pedogenesis=1,973 rain=3,046 rot=1,641 ruin_to_rubble=3,253 rust=3,218 salvage=1,795 smelt=2,601 solidify=59 thaw=2,076 trader_leaves=570 water_flow=9,926 weather=4,647
  operations performed 100,000, skipped draws 27,131, checkpoints 101 (seal, every 1,000, end)
  checksums: ledger 12a7e820, world ad4559df; run time 1661 ms
PASS longrun_seed_1 (100,000 operations, 101 recounts balanced)
== seed 2, layers -16..15 (32), 100,000 operations, recount every 1,000 ==
  world: after generation 6,117 cells in 368 chunks; now 22,433 cells in 461 of 512 possible chunks (Lower-2 128, Lower-1 128, Surface 64, Upper-1 63, Upper-2 78)
  class totals, start -> end (mass units; water in depth units):
    ag_metal 339 -> 37,227                ag_ore 716,450 -> 635,863             ag_trace 0 -> 37,043                  ash 0 -> 3,261                        
    au_metal 290 -> 58,326                au_ore 573,288 -> 515,275             biomass 59,869 -> 81,084              charcoal 725 -> 41,485                
    cu_metal 566 -> 63,133                cu_ore 1,335,056 -> 1,193,700         cu_trace 0 -> 67,652                  electrum 354 -> 308                   
    fe_metal 1,391 -> 142,979             fe_ore 2,702,898 -> 2,361,211         fe_trace 0 -> 155,811                 gem 394,279 -> 394,279                
    humus 29,926 -> 57,153                lava 1,041 -> 374                     pt_metal 105 -> 56,318                pt_ore 511,000 -> 454,787             
    rubble 1,750 -> 4,153,250             sediment 483,000 -> 1,674,196         soil 553,735 -> 1,083,050             steel 335 -> 18,501                   
    stone 21,832,929 -> 16,035,165        water 14,544 -> 51,640                wood 22,733 -> 12,510                 
  family totals, start + sources - sinks = end:
    mineral: 22,872,455 + 145,686 - 72,106 = 22,946,035
    organic: 113,253 + 116,234 - 33,994 = 195,493
    water:   14,544 + 60,213 - 23,117 = 51,640
    fe:      2,704,624 + 0 - 26,122 = 2,678,502  (finite)
    cu:      1,335,622 + 0 - 11,137 = 1,324,485  (finite)
    ag:      716,966 + 0 - 6,679 = 710,287  (finite)
    au:      573,755 + 0 - 0 = 573,755  (finite)
    pt:      511,105 + 0 - 0 = 511,105  (finite)
    gem:     394,279 + 0 - 0 = 394,279  (finite)
  ore totals at the end: fe_ore 2,361,211, cu_ore 1,193,700, ag_ore 635,863, au_ore 515,275, pt_ore 454,787
  operations: alloy=51 ash_weather=1,146 build=4,883 butcher=555 chop=21 collapse=2,015 creature_move=2,609 debug=972 decay_ruin=5,130 die=1,066 dig_fill=1,985 drink=1,957 eat=1,215 erode=3,738 evaporate=2,948 excrete=1,391 fell=978 fire=2,638 forge=457 freeze=2,987 grow=3,018 harvest=1,460 haul=5,804 kiln=326 lithify=1,889 litter=1,520 magic_sink=990 magic_source=997 migrant_arrives=1,042 mine_gem=548 mine_ore=3,941 mine_stone=4,937 part=55 pedogenesis=1,917 rain=3,024 rot=1,594 ruin_to_rubble=3,246 rust=3,084 salvage=1,794 smelt=2,543 solidify=67 thaw=2,111 trader_leaves=599 water_flow=9,928 weather=4,824
  operations performed 100,000, skipped draws 27,906, checkpoints 101 (seal, every 1,000, end)
  checksums: ledger 139ac6f0, world d494aeb7; run time 1409 ms
PASS longrun_seed_2 (100,000 operations, 101 recounts balanced)
== seed 3, layers -16..15 (32), 100,000 operations, recount every 1,000 ==
  world: after generation 6,134 cells in 368 chunks; now 22,356 cells in 449 of 512 possible chunks (Lower-2 128, Lower-1 128, Surface 64, Upper-1 47, Upper-2 82)
  class totals, start -> end (mass units; water in depth units):
    ag_metal 425 -> 29,233                ag_ore 679,650 -> 602,975             ag_trace 0 -> 40,490                  ash 0 -> 3,549                        
    au_metal 346 -> 62,721                au_ore 537,008 -> 474,659             biomass 64,360 -> 83,934              charcoal 944 -> 44,964                
    cu_metal 775 -> 87,622                cu_ore 1,345,596 -> 1,179,257         cu_trace 0 -> 65,747                  electrum 470 -> 418                   
    fe_metal 1,806 -> 139,303             fe_ore 2,673,548 -> 2,345,615         fe_trace 0 -> 140,471                 gem 356,472 -> 356,472                
    humus 30,795 -> 56,604                lava 1,075 -> 318                     pt_metal 101 -> 61,115                pt_ore 568,400 -> 507,386             
    rubble 2,595 -> 4,273,442             sediment 484,500 -> 1,578,213         soil 549,576 -> 1,133,372             steel 538 -> 22,569                   
    stone 22,007,965 -> 16,108,667        water 14,441 -> 51,656                wood 26,157 -> 16,417                 
  family totals, start + sources - sinks = end:
    mineral: 23,045,711 + 138,253 - 89,952 = 23,094,012
    organic: 122,256 + 111,932 - 28,720 = 205,468
    water:   14,441 + 59,193 - 21,978 = 51,656
    fe:      2,675,892 + 0 - 27,934 = 2,647,958  (finite)
    cu:      1,346,371 + 0 - 13,745 = 1,332,626  (finite)
    ag:      680,310 + 0 - 7,403 = 672,907  (finite)
    au:      537,589 + 0 - 0 = 537,589  (finite)
    pt:      568,501 + 0 - 0 = 568,501  (finite)
    gem:     356,472 + 0 - 0 = 356,472  (finite)
  ore totals at the end: fe_ore 2,345,615, cu_ore 1,179,257, ag_ore 602,975, au_ore 474,659, pt_ore 507,386
  operations: alloy=42 ash_weather=1,165 build=4,749 butcher=493 chop=10 collapse=2,091 creature_move=2,676 debug=986 decay_ruin=5,118 die=1,114 dig_fill=2,025 drink=1,893 eat=1,170 erode=3,711 evaporate=3,011 excrete=1,415 fell=1,062 fire=2,601 forge=507 freeze=2,942 grow=3,080 harvest=1,534 haul=5,785 kiln=323 lithify=1,946 litter=1,491 magic_sink=978 magic_source=1,000 migrant_arrives=991 mine_gem=494 mine_ore=3,989 mine_stone=5,001 part=49 pedogenesis=1,968 rain=2,956 rot=1,650 ruin_to_rubble=3,278 rust=3,033 salvage=1,801 smelt=2,580 solidify=65 thaw=2,080 trader_leaves=600 water_flow=9,859 weather=4,688
  operations performed 100,000, skipped draws 27,378, checkpoints 101 (seal, every 1,000, end)
  checksums: ledger 1edbfc9e, world 846ab612; run time 1881 ms
PASS longrun_seed_3 (100,000 operations, 101 recounts balanced)
== seed 4, layers -4..4 (9), 100,000 operations, recount every 1,000 ==
  world: after generation 1,878 cells in 139 chunks; now 15,014 cells in 144 of 144 possible chunks (Lower-2 0, Lower-1 64, Surface 64, Upper-1 16, Upper-2 0)
  class totals, start -> end (mass units; water in depth units):
    ag_metal 507 -> 18,374                ag_ore 97,750 -> 59,662               ag_trace 0 -> 17,226                  ash 0 -> 3,003                        
    au_metal 347 -> 32,996                au_ore 71,600 -> 39,028               biomass 65,963 -> 71,263              charcoal 1,011 -> 44,223              
    cu_metal 845 -> 39,207                cu_ore 269,248 -> 162,981             cu_trace 0 -> 58,904                  electrum 482 -> 328                   
    fe_metal 1,845 -> 123,704             fe_ore 718,832 -> 350,897             fe_trace 0 -> 182,571                 gem 73,874 -> 73,874                  
    humus 30,200 -> 66,176                lava 33 -> 0                          pt_metal 128 -> 23,689                pt_ore 56,000 -> 32,439               
    rubble 2,822 -> 1,591,531             sediment 147,750 -> 1,073,397         soil 553,704 -> 845,725               steel 498 -> 19,766                   
    stone 5,765,717 -> 2,977,867          water 4,842 -> 38,315                 wood 30,866 -> 15,668                 
  family totals, start + sources - sinks = end:
    mineral: 6,470,026 + 135,547 - 117,053 = 6,488,520
    organic: 128,040 + 98,287 - 25,994 = 200,333
    water:   4,842 + 54,931 - 21,458 = 38,315
    fe:      721,175 + 0 - 44,237 = 676,938  (finite)
    cu:      270,093 + 0 - 9,001 = 261,092  (finite)
    ag:      98,498 + 0 - 3,072 = 95,426  (finite)
    au:      72,188 + 0 - 0 = 72,188  (finite)
    pt:      56,128 + 0 - 0 = 56,128  (finite)
    gem:     73,874 + 0 - 0 = 73,874  (finite)
  ore totals at the end: fe_ore 350,897, cu_ore 162,981, ag_ore 59,662, au_ore 39,028, pt_ore 32,439
  operations: alloy=77 ash_weather=1,479 build=4,466 butcher=769 chop=26 collapse=1,769 creature_move=3,479 debug=918 decay_ruin=5,115 die=1,425 dig_fill=1,816 drink=1,801 eat=1,828 erode=3,654 evaporate=2,781 excrete=1,567 fell=1,269 fire=3,163 forge=595 freeze=2,682 grow=3,361 harvest=1,924 haul=5,028 kiln=473 lithify=1,845 litter=1,957 magic_sink=847 magic_source=985 migrant_arrives=923 mine_gem=203 mine_ore=3,153 mine_stone=4,421 part=100 pedogenesis=1,815 rain=2,747 rot=2,079 ruin_to_rubble=3,585 rust=3,572 salvage=1,801 smelt=2,367 solidify=6 thaw=2,044 trader_leaves=712 water_flow=9,006 weather=4,367
  operations performed 100,000, skipped draws 16,201, checkpoints 101 (seal, every 1,000, end)
  checksums: ledger a7cef426, world 9ed48901; run time 1337 ms
PASS longrun_seed_4_z-4..4 (100,000 operations, 101 recounts balanced)
PASS determinism_longrun_seed_1 (second run: ledger 12a7e820, world ad4559df)
PASS determinism_longrun_seed_2 (second run: ledger 139ac6f0, world d494aeb7)
PASS determinism_longrun_seed_3 (second run: ledger 1edbfc9e, world 846ab612)
PASS determinism_longrun_seed_4_z-4..4 (second run: ledger a7cef426, world 9ed48901)
PASS continuity_longrun_seed_2_snapshot_at_50000 (snapshot 1,490,316 bytes; resumed run ends at ledger 139ac6f0, world d494aeb7)
PASS fixture_checksums_match (seed1_z-16..15_ops100000_k1000 12a7e820/ad4559df; seed2_z-16..15_ops100000_k1000 139ac6f0/d494aeb7; seed3_z-16..15_ops100000_k1000 1edbfc9e/846ab612; seed4_z-4..4_ops100000_k1000 a7cef426/9ed48901)
PASS fault_control_clean_child (exit 0: PASS longrun_seed_7 (20,000 operations, 21 recounts balanced))
PASS fault_unreported_mutation_detected (exit 1, longrun_seed_7: at operation 8000: AUDIT E_UNBALANCED: 2 mismatch(es): stone|item ledger 446658 counted 446758 (+100); stone|strata ledger 20426716 counted 20426616 (-100))
PASS fault_ore_created_detected (exit 1, longrun_seed_7: at operation 8000: MASS mineral: counted 22888888, expected 22889388 (start 22885460 + sources 12572 - sinks 8644) | ELEMENT fe: counted 2573578, expected 2573078 (start 2573950 + sources 0 - sinks 872) | ORE_APPEARED fe_ore: counted 2554249, start 2572426 - smelted or sunk 18677 = 2553749 | AUDIT E_UNBALANCED: 4)
PASS fault_ore_via_ledger_detected (exit 1, longrun_seed_7: at operation 7777: LEDGER_REFUSED E_ORE_OUTPUT in fault ore_via_ledger: E_ORE_OUTPUT: transform "stone"/"strata" -> "fe_ore"/"strata": the output fe_ore is an ore class; ore is never produced (LIFE-002, cause "ecology:sprout"))
PASS fault_delete_one_unit_detected (exit 1, longrun_seed_7: at operation 8000: MASS organic: counted 128604, expected 128605 (start 120015 + sources 9681 - sinks 1091) | AUDIT E_UNBALANCED: 2 mismatch(es): biomass|item ledger 11125 counted 11124 (-1); family organic ledger 128605 counted 128604)
PASS fault_create_one_unit_detected (exit 1, longrun_seed_7: at operation 8000: MASS mineral: counted 22889389, expected 22889388 (start 22885460 + sources 12572 - sinks 8644) | AUDIT E_UNBALANCED: 2 mismatch(es): stone|item ledger 446658 counted 446659 (+1); family mineral ledger 22889388 counted 22889389)
PASS fault_fire_deletes_items_detected (exit 1, longrun_seed_7: at operation 8000: MASS organic: counted 128933, expected 128935 (start 120015 + sources 9940 - sinks 1020) | AUDIT E_UNBALANCED: 2 mismatch(es): charcoal|strata ledger 14712 counted 14710 (-2); family organic ledger 128935 counted 128933)
PASS fault_double_yield_detected (exit 1, longrun_seed_7: at operation 8000: MASS mineral: counted 22891911, expected 22889384 (start 22885460 + sources 12568 - sinks 8644) | AUDIT E_UNBALANCED: 2 mismatch(es): stone|item ledger 448210 counted 450737 (+2527); family mineral ledger 22889384 counted 22891911)
run time 16.8 s
RESULT: 18 passed, 0 failed
EXIT=0
```

Counted from that output: `G2_PASS=18`, `G2_FAIL=0`, `G2_FAULT=7`.

### 3. `node tools/check_deus_syntax.js`

```text
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

`GATE1_EXIT=0`, `GATE2_EXIT=0`, `GATE3_EXIT=0`. After the three gates, `git status --short` in the clone printed nothing (`STATUS_EXIT=0`). The long-run did not rewrite the fixture.

## Spot checks against the report

`createLedger().describe()` in the clone:

```text
{"families":9,"forms":7,"classes":27,"pairs":68,"transforms":119,"recipes":2,"oreOutputMoves":0,"sourceOrePairs":0,"magicSourceConfirmed":false,"magicSinkConfirmed":false,"fe":10,"feOre":0,"feTrace":4,"feMetal":6,"sprout":"E_ORE_OUTPUT"}
SPOT_EXIT=0
```

That is the report's table size (9 families, 7 forms, 27 classes, 68 pairs, 119 moves, 2 recipes). No default transform outputs a different ore class. No source allows an ore pair. `magic` source and sink are `ownerConfirmed: false`. The report's try-it holds: 10 Fe registered, 4 rusted to `fe_trace`, `familyTotal("fe")` stays 10, ore stays 0, and `stone` to `fe_ore` throws `E_ORE_OUTPUT`.

```text
$ node tasks/WG.65.15/lane-l1/gen_ledger_tables.js --check
PASS LEDGER_API.md generated tables match createLedger().describe()
DOC_EXIT=0
```

Not a `lane.json` gate. It confirms the generated tables in `LEDGER_API.md` match the code.

Checksums and fault lines from this clone match `REPORT.md` §4.3 and `tools/sim/fixtures/ledger/longrun_expected.json`. Per-seed class totals, operation counts, skipped draws, and the 101 checkpoints match. Only the millisecond lines differ, which the report already treats as timing:

| Run | Ledger / world | Clone time | Report time |
| --- | --- | --- | --- |
| seed 1 | `12a7e820` / `ad4559df` | 1661 ms | 1800 ms |
| seed 2 | `139ac6f0` / `d494aeb7` | 1409 ms | 1622 ms |
| seed 3 | `1edbfc9e` / `846ab612` | 1881 ms | 1866 ms |
| seed 4 | `a7cef426` / `9ed48901` | 1337 ms | 1407 ms |
| total | 18 passed, 0 failed | 16.8 s | 18.1 s |

Determinism reruns repeat those four checksum pairs. Seed 2 restored at 50,000 operations ends at `139ac6f0` / `d494aeb7` (snapshot 1,490,316 bytes). All 7 faults exit 1 with the same named checks and the same counts as the report; `ore_via_ledger` is refused at operation 7777 with `E_ORE_OUTPUT`; the other six are caught at the next recount (operation 8000). The clean control child exits 0. Unit-test `RESULT: 117 passed, 0 failed` and `mutants: 42` match the report. This clone's unit run took 10533 ms; the report records 11220 ms in the writer's worktree.

Non-timing lines of this long-run match `tasks/WG.65.15/lane-l1/evidence/gate2_test_ledger_longrun.txt` except that evidence file's trailing `EXIT=0` line, which the node process does not print. The syntax line matches the evidence: `Checked 52 DEUS plugin files. Errors: 0`.

Code and docs read against the brief, not only the counts: `ledger.js` (integer amounts, seal, ore refusal at load and at call, element check, named sources and sinks, closure and interval identity, bounded log, snapshot/restore, FNV-1a checksum), `ledger_defaults.js` (frozen tables, rust of Fe/Cu/Ag/steel only, electrum 1:1 Au+Ag recipes, `ownerConfirmed: false` on every source and sink), both test files (in-memory mutants, bare `vm` context, independent cell recount, ore and family checks, seven faults). Citations that the hook-up notes rely on are at the lines named: `docs/OWNER_DECISIONS.md:262` (DEC-018 open sub-question), `DEUS_Fluid.js:50` (`DEPTH_MAX`), `DEUS_Levels.js:1558` (`levels:strataChanged`) and `:1700-1702` (destroyed stratum becomes air), `DEUS_Fire.js:442` (item remove on burnout), `DEUS_ResourceRegistry.json:471` (electrum), `:500` (conserved classes), `:512` (masonry 0.8). The report does not call the task DONE, VERIFIED, or CLOSED.

## Findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

None.

VERDICT: CLEAN PASS
