# WG.65.15 lane-l1 REPORT: per-material-class mass ledger and long-run conservation harness

| | |
|---|---|
| Task | WG.65.15, widened to a per-material-class conserved-total ledger (SIM.50.01 audit §6 step 2; PM directive 0035-AJ §2(d)) |
| Lane / branch | lane-l1 / `task/lane-l1` |
| Writer | Claude. The reviewer is Grok, in a review the PM launches later. This report states what was done and gives raw evidence. It certifies nothing. |
| Base | `origin/main` `9cba41eaf6378048d50004dcf243defbfe7f17f4` |
| Code and evidence commit | `6b15462c3732755377f8491fec763586746c29bc`: every gate below ran on this commit. Later commits add only `tasks/WG.65.15/lane-l1/REPORT.md` and `tasks/WG.65.15/lane-l1/evidence/*` (§10) |
| Art | none generated, requested, edited or integrated (DEC-007) |
| Gameplay files changed | none; `game/js/plugins/**`, `game/js/plugins.js` and `game/data/**` are untouched (§5) |

## 1. What changed

- `game/js/sim/ledger.js` (new): the ledger module.
  - A CommonJS-subset, host-agnostic module (ADR-003 Rev 3 §2.3-§2.5, PROPOSED). It keeps integer totals per `(class, form)` and conserved totals per family.
  - Totals change through `transform`, `recipe` (alloys), and named `source`/`sink`. It also provides `audit`/`assertBalanced` against a caller's recount, the per-interval identity, a bounded log, `snapshot`/`restore` and an FNV-1a `checksum`.
  - An ore class is refused as an output when the config loads and again at call time. Every transform must keep the class composition (element or family).
- `game/js/sim/ledger_defaults.js` (new): the default tables, data only and frozen.
  - 9 families, 7 forms, 27 classes, 119 allowed transform moves, 2 recipes (electrum alloying and parting).
  - Sources `magic`, `world-edge`, `debug-explicit` and `rain`; sinks `magic`, `world-edge`, `debug-explicit` and `evaporation`. Every source and sink is marked `ownerConfirmed: false`.
- `tools/sim/test_ledger.js` (new): the unit, purity and mutation tests.
  - 60 unit checks, run with the module in a bare `vm` context (ECMAScript built-ins only; `Math.random` throws; `Date` and `console` deleted).
  - A static token scan of every `game/js/sim/ledger*` file for the ADR §2.3 identifiers. It skips comments, strings and regex bodies but scans template `${}` expressions.
  - 11 probes of the purity scanner itself.
  - 42 source mutants applied to in-memory copies (the files on disk are never edited).
- `tools/sim/test_ledger_longrun.js` (new): the deterministic long-run harness.
  - A sparse toy world of 32×32-cell chunks on layers −16..+15 (5-ft cells, 10-ft layers, five 2-ft slices), seeded with mulberry32.
  - 100,000 operations per seed, of 45 kinds.
  - An independent recount every 1,000 operations, plus the checks for determinism, snapshot continuity and pinned checksums.
  - 7 injected faults, each run as a child process that must exit 1 with a named check, plus one clean control child.
- `tools/sim/fixtures/ledger/longrun_expected.json` (new): the pinned final checksums of the four long runs.
- `tasks/WG.65.15/lane-l1/LEDGER_API.md` (new): the API, the model, where each Owner rule is enforced, the error codes, the default tables (generated), the hook-up plan with the audit F-04 leaks each hook would catch, and alignment with Lanes R and Q.
- `tasks/WG.65.15/lane-l1/gen_ledger_tables.js` (new): renders LEDGER_API.md §8 from `createLedger().describe()`. `--check` exits 1 if the doc and the code differ.
- `tasks/WG.65.15/lane-l1/evidence/*` (new): the raw gate outputs, from the worktree and from a fresh clone.

## 2. How the brief's requirements map to the code and tests

| Requirement | Where | Evidence (check names) |
|---|---|---|
| Pure, host-agnostic, CommonJS subset, relative `./ledger*` requires only | `ledger.js:16` is its only `require` | `purity_static_ledger_js`, `purity_static_ledger_defaults_js`, `load_in_bare_vm_context`, `purity_dynamic_context_is_bare`; probes `purity_mutant_{window,math_random,math_random_computed,date,require_fs,global_in_template,math_sin,rmmz_global,facade,function_constructor}_detected`; `purity_static_ignores_comments_strings_regex`; mutant `hidden_math_random_caught_dynamically` (the static scan misses it and the bare context catches it) |
| Integer units only; refuse floats, NaN, negatives, non-numbers and results beyond `MAX_SAFE_INTEGER`, naming class and cause | `isAmount`, `checkAmount`, and `apply()` checks every key, family and counter | `amount_rejects_non_integers` (16 bad values × 5 calls, messages must name class or recipe and cause), `amount_overflow_rejected` (key, family, composite key, source, recipe); mutants `float_accepted`, `negative_accepted`, `overflow_unchecked`, `family_overflow_unchecked` |
| Per-material-class totals with forms as a second axis | 27 classes × 7 forms = 68 pairs; `total`, `amount`, `familyTotal`, `totals` | `defaults_minimum_classes_and_forms`, `register_and_totals` |
| `register` / `seal`, and only transforms, sources and sinks after seal | `register`, `seal`, `needSealed` | `seal_enforced`; mutants `seal_not_enforced_for_register`, `seal_not_enforced_for_calls` |
| `transform` must be a table row, keeps the total, keeps the element | `transform`; load-time row checks in `normalize` | `transform_conserves_totals`, `transform_needs_a_table_row`, `transform_element_change_refused_at_call`, `config_rejects_cross_element_row`; mutants `transform_drops_1_unit`, `transform_adds_1_unit`, `element_check_removed_at_load`, `element_check_removed_at_call` |
| Ore never produced: refused at config load and at call time | `normalize` (rows, recipes, source lists); `transform`, `source` | `config_rejects_ore_output_row`, `config_rejects_ore_output_recipe`, `config_rejects_ore_source_list`, `transform_ore_output_refused_at_call`, `source_ore_refused_at_call`, `ore_moves_form_and_only_decreases`, `defaults_no_row_outputs_ore`; mutants `ore_output_allowed_at_load`, `ore_output_allowed_at_call`, `ore_source_allowed_at_load`, `ore_source_allowed_at_call`, `ore_recipe_output_allowed`, `defaults_ore_sprout_row`; long-run `fault_ore_created_detected`, `fault_ore_via_ledger_detected` |
| Rust keeps the element (an Fe item becomes an Fe trace; Fe and ore totals unchanged); electrum conserved against Au and Ag | `rust` rows to `fe_trace`, `cu_trace`, `ag_trace`; `electrum` composition `{au:1, ag:1}`; balanced recipes | `rust_keeps_element`, `defaults_rust_rows_keep_element`, `electrum_recipe_conserves_gold_and_silver`, `config_rejects_unbalanced_recipe`, `composite_amounts_are_multiples`; mutants `rust_changes_element_in_defaults`, `recipe_balance_unchecked`, `composite_multiple_unchecked` |
| Decay chain ruin → rubble → soil/sediment → rock conserves mass; skip or reverse only where the table says so | default rows `decay`, `break`, `weather`, `erode`, `pedogenesis`, `lithify` | `decay_chain_conserves_mass`, `decay_chain_skip_and_reverse_refused`, `defaults_decay_chain_rows`; mutant `defaults_decay_skip_row` |
| Sources and sinks named and data-driven; undeclared names refused; `magic` logged with cause and flagged unconfirmed | `sources`/`sinks` tables; `source`, `sink`, `unconfirmed()` | `source_undeclared_name_refused`, `source_finite_refused`, `source_sink_scope`, `magic_source_and_sink_logged_with_cause`, `defaults_magic_flagged_unconfirmed`, `config_sources_are_data_driven`, `config_finite_source_needs_flag`; mutants `source_skips_name_check`, `sink_skips_name_check`, `finite_source_allowed_at_{load,call}`, `defaults_magic_marked_confirmed`, `defaults_magic_allows_finite` |
| `audit(recount)` returns a structured diff; `assertBalanced` throws | `audit`, `assertBalanced` | `audit_clean_recount`, `audit_detects_every_class_and_form` (all 68 pairs), `audit_detects_form_shift`, `audit_class_level_recount`, `audit_missing_counts_as_zero_and_unknown_keys`, `audit_rejects_bad_recount_values`; mutants `audit_ignores_a_class`, `audit_ignores_families` |
| Per-interval identity delta(total) = sum(sources) − sum(sinks) | `interval`, `closeInterval`, `check` | `interval_identity_and_close`; mutants `interval_family_identity_disabled`, `interval_class_identity_disabled`, `closure_check_disabled` |
| A bounded or summarised log | a ring of `logLimit` entries; an interval summary keyed by row, not cause | `log_is_bounded` (2,000 calls, 16-entry ring); mutant `log_unbounded` |
| `snapshot`/`restore` (JSON-safe) and a deterministic `checksum` | `snapshot`, `restore`, `checksum` (FNV-1a over canonical JSON) | `snapshot_is_json_safe`, `restore_round_trip_and_continue`, `restore_ignores_key_order`, `restore_rejects_tampering` (20 cases plus another config), `restore_unsealed_snapshot`, `checksum_deterministic_and_pure`, `checksum_sees_every_class`, `checksum_sees_which_class_holds_what`; mutants `checksum_ignores_key_order`, `checksum_commutative`, `checksum_ignores_a_class`, `restore_accepts_bad_amounts`, `restore_skips_closure` |
| Refused calls leave no trace | `apply()`: validate everything, then commit | `transform_insufficient_is_atomic`, `sink_can_lower_ore_and_is_atomic`; mutant `refused_call_leaves_trace` |
| Long run: ≥100,000 operations on ≥3 seeds; independent recount every K operations; element and ore checks; fails on each injected fault | `tools/sim/test_ledger_longrun.js` | seeds 1, 2 and 3 at −16..+15 and seed 4 at −4..+4, 100,000 operations each, 101 recounts per run; `determinism_*` ×4; `continuity_longrun_seed_2_snapshot_at_50000`; `fixture_checksums_match`; `fault_*_detected` ×7; `fault_control_clean_child` |

## 3. How I tested it

All in the foreground, from the worktree root, on `6b15462c3732755377f8491fec763586746c29bc`:

1. `node tools/sim/test_ledger.js`, `node tools/sim/test_ledger_longrun.js` and `node tools/check_deus_syntax.js`: the three `gateTests` of `tasks/WG.65.15/lane-l1/lane.json`, exactly as written.
2. `node tasks/WG.65.15/lane-l1/gen_ledger_tables.js --check`: the doc tables against the code.
3. The same four commands in a throwaway sparse clone of the same commit under `%TEMP%`, deleted afterwards. The clone's files were checked out with CRLF line endings (the global `core.autocrlf=true`), so the tests' CRLF folding was exercised.
4. `git diff --name-only 9cba41eaf6378048d50004dcf243defbfe7f17f4..HEAD`: the scope check (§5).

The NW.js harness (`tools/run_tests.js`) and the heavy repo suites were **not** run, as the brief instructs; no gameplay file changed. Nothing was run in the RMMZ editor.

## 4. Evidence

### 4.1 Counts

- **Unit and mutation file** (`tools/sim/test_ledger.js`): 117 passed, 0 failed.
  - 1 load check.
  - 14 purity checks: the bare context, 2 static file scans, 10 scanner probes, and 1 no-false-positive check.
  - 60 unit checks.
  - 42 of 42 mutants killed.
  - Run time about 11 s.
- **Long run** (`tools/sim/test_ledger_longrun.js`): 18 passed, 0 failed; run time 18.1 s in the worktree.
  - Seeds 1, 2 and 3 at 32 layers (−16..+15) and seed 4 at 9 layers (−4..+4): 100,000 operations each, 400,000 in all, with 101 recounts per run (after seal, every 1,000 operations, and the last one at the end), all balanced.
  - Per-run time 1.4-1.9 s.
  - All 4 reruns reproduced identical ledger and world checksums, operation counts and flow tallies.
  - Seed 2 snapshotted at 50,000 and restored gives the same end checksums as the uninterrupted run.
  - The pinned fixture checksums match.
  - 7 of 7 faults detected, each by a child process exiting 1 with a named check, 0 to 223 operations after the fault; the clean control child exits 0.
- **Syntax gate**: `Checked 52 DEUS plugin files. Errors: 0`, EXIT=0.
- **Fresh clone**: the same results. After removing the header and timing lines, the unit output and the long-run output are identical to the worktree's, compared with `cmp` and `diff` (evidence files `clone_*.txt`).

### 4.2 Gate 1: `node tools/sim/test_ledger.js` (raw)

```text
$ node tools/sim/test_ledger.js   (worktree, HEAD 6b15462c3732755377f8491fec763586746c29bc)
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
mutants: 42; run time 11220 ms
RESULT: 117 passed, 0 failed
EXIT=0
```

### 4.3 Gate 2: `node tools/sim/test_ledger_longrun.js` (raw)

```text
$ node tools/sim/test_ledger_longrun.js   (worktree, HEAD 6b15462c3732755377f8491fec763586746c29bc)
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
  checksums: ledger 12a7e820, world ad4559df; run time 1800 ms
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
  checksums: ledger 139ac6f0, world d494aeb7; run time 1622 ms
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
  checksums: ledger 1edbfc9e, world 846ab612; run time 1866 ms
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
  checksums: ledger a7cef426, world 9ed48901; run time 1407 ms
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
run time 18.1 s
RESULT: 18 passed, 0 failed
EXIT=0
```

### 4.4 Gate 3: `node tools/check_deus_syntax.js` (raw)

```text
$ node tools/check_deus_syntax.js   (worktree, HEAD 6b15462c3732755377f8491fec763586746c29bc)
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

### 4.5 Doc tables against code (raw)

```text
$ node tasks/WG.65.15/lane-l1/gen_ledger_tables.js --check   (worktree, HEAD 6b15462c3732755377f8491fec763586746c29bc)
PASS LEDGER_API.md generated tables match createLedger().describe()
EXIT=0
```

### 4.6 The same gates in a fresh sparse clone of `6b15462c` under %TEMP% (tails; full files in `evidence/clone_*.txt`)

```text
$ node tools/sim/test_ledger.js   (fresh sparse clone under %TEMP%, HEAD 6b15462c3732755377f8491fec763586746c29bc, core.autocrlf=true, files checked out with CRLF)
...
mutants: 42; run time 10734 ms
RESULT: 117 passed, 0 failed
EXIT=0
$ node tools/sim/test_ledger_longrun.js   (fresh sparse clone under %TEMP%, HEAD 6b15462c3732755377f8491fec763586746c29bc)
...
run time 18.9 s
RESULT: 18 passed, 0 failed
EXIT=0
$ node tools/check_deus_syntax.js   (fresh sparse clone under %TEMP%, HEAD 6b15462c3732755377f8491fec763586746c29bc)
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
$ node tasks/WG.65.15/lane-l1/gen_ledger_tables.js --check   (fresh sparse clone under %TEMP%, HEAD 6b15462c3732755377f8491fec763586746c29bc)
PASS LEDGER_API.md generated tables match createLedger().describe()
EXIT=0

$ cmp <(grep -v '^\$\|run time\|mutants:' gate1_test_ledger.txt) <(grep -v '^\$\|run time\|mutants:' clone_gate1_test_ledger.txt)
EXIT=0 (0 = identical apart from the command header and timing lines)
$ diff <(grep -v '^\$\|run time' gate2_test_ledger_longrun.txt | sed 's/; run time [0-9]* ms//') <(grep -v '^\$\|run time' clone_gate2_test_ledger_longrun.txt | sed 's/; run time [0-9]* ms//')
EXIT=0 (0 = identical apart from the command header and timing)
```

## 5. Scope

```text
$ git rev-parse HEAD
6b15462c3732755377f8491fec763586746c29bc
$ git diff --name-only 9cba41eaf6378048d50004dcf243defbfe7f17f4..HEAD
game/js/sim/ledger.js
game/js/sim/ledger_defaults.js
tasks/WG.65.15/lane-l1/BRIEF.md
tasks/WG.65.15/lane-l1/LEDGER_API.md
tasks/WG.65.15/lane-l1/gen_ledger_tables.js
tasks/WG.65.15/lane-l1/lane.json
tasks/WG.65.15/lane-l1/launches/20260926_042828_prompt.txt
tools/sim/fixtures/ledger/longrun_expected.json
tools/sim/test_ledger.js
tools/sim/test_ledger_longrun.js
EXIT=0
$ (each path matched against lane.json allowedPaths: game/js/sim/ledger*, tools/sim/test_ledger*.js, tools/sim/fixtures/ledger/**, tasks/WG.65.15/**)
IN   game/js/sim/ledger.js
IN   game/js/sim/ledger_defaults.js
IN   tasks/WG.65.15/lane-l1/BRIEF.md
IN   tasks/WG.65.15/lane-l1/LEDGER_API.md
IN   tasks/WG.65.15/lane-l1/gen_ledger_tables.js
IN   tasks/WG.65.15/lane-l1/lane.json
IN   tasks/WG.65.15/lane-l1/launches/20260926_042828_prompt.txt
IN   tools/sim/fixtures/ledger/longrun_expected.json
IN   tools/sim/test_ledger.js
IN   tools/sim/test_ledger_longrun.js
10 paths, 0 outside allowedPaths
EXIT=0
$ git diff --name-only 9cba41eaf6378048d50004dcf243defbfe7f17f4..HEAD -- game/js/plugins game/js/plugins.js game/data docs art tools/ops tools/governance
EXIT=0 (no output = no such path changed)
$ git log --format='%h %an %s' 9cba41eaf6378048d50004dcf243defbfe7f17f4..HEAD
6b15462c deus-claude [claude] WG.65.15 WIP: LEDGER_API.md citation fixes (F-04 line, ADR lines, tamper count)
34dda721 deus-claude [claude] WG.65.15 WIP: LEDGER_API.md with generated default tables and hook-up notes
d63b901c deus-claude [claude] WG.65.15 WIP: freeze shared defaults; amount errors name class and cause
3304ca2e deus-claude [claude] WG.65.15 WIP: deterministic long-run conservation harness, faults and pinned checksums
3900a050 deus-claude [claude] WG.65.15 WIP: unit, purity and mutation tests (115 checks, 41 mutants)
d06afa27 deus-claude [claude] WG.65.15 WIP: host-agnostic mass ledger module and default tables
99197924 snewt [ops] WG.65.15 lane-l1 launch prompt 20260926_042828
e2cbe558 deus-pm [pm] Open lane-l1 (WG.65.15): BRIEF.md and lane.json
EXIT=0
```

- `BRIEF.md`, `lane.json` and `launches/20260926_042828_prompt.txt` were committed by the PM and ops (`e2cbe558`, `99197924`), not by this lane.
- Every other path was written by this lane, and all of them are inside allowedPaths.
- No escalation was needed: no hook into a gameplay file was necessary, because the ledger is exercised by its own tests and the toy world.

## 6. Owner questions (not answered here)

| Id | Question | Options (none chosen) | Where the answer goes |
|---|---|---|---|
| **Q1** | **Conjured matter** (DEC-018 open sub-question, `docs/OWNER_DECISIONS.md:262`). The PM default is a named `magic` source and `magic` sink, logged like rain and evaporation. **The Owner has not confirmed it.** The shipped default follows the PM default; both rows carry `ownerConfirmed: false` and are listed by `unconfirmed()` | (a) keep the PM default: `magic` may add any non-ore, non-finite class (stone for *wall of stone*, water for *create water*) and may remove any class. (b) conjured matter must come from matter nearby: remove the `magic` source row, so spells use transforms only. (c) (a), and conjured finite metals too (SRD *creation* can make metal objects for a limited time): set `allowFinite` on `magic`. (d) conjured matter is temporary: every `magic` source must be matched by a `magic` sink when it expires; this needs provenance tags (PROPOSED-L1-06) | only the `sources.magic` / `sinks.magic` rows in `ledger_defaults.js` (tested by `config_sources_are_data_driven`) |
| **Q2** | **Mass units per 2-ft slice per material.** SIM.40.00/SIM.40.01 set them (ADR-003 §7.8, `docs/adr/ADR-003_sim_render_split_and_lod.md:937`). The ledger is unit-agnostic (integers per class; water in fluid depth units, `DEUS_Fluid.js:50`), but one world must use one unit per family. The three unreviewed designs disagree: Lane R assumes 1 mu = 1/16 lb, Lane Q's tables use kg and it proposes 1 g, and Lane W uses g | (a) grams (Lane Q's proposal; fine enough for small creatures; a fully solid 256×256×160-voxel granite area is about 4.1×10^13 g, below 2^53). (b) 1/16 lb (Lane R). (c) kg. (d) abstract load units, with item masses chosen so that today's recipes balance (Lane Q OQ-Q-06 (b)) | a mass table used by the hook-up package (PROPOSED-L1-03); the ledger does not change |
| **Q3** | **Is biomass and food held in creatures in scope now?** The audit counts "births create adults from nothing" under F-04 (`docs/audits/LIVING_WORLD_GAP_AUDIT.md:51`, §4.3) | (a) yes: eating, births and deaths become ledger moves now (`biomass` item → creature → humus). This needs body masses per species (Lane W). (b) not yet: the `creature` form exists, but the hook-up package leaves units out; ADR-003's Q-POP counters cover population until SIM.40.10. (c) partly: food and water taken in are counted, body mass is not | the hook-up package scope (PROPOSED-L1-01) |
| Q4 | May finite metals **enter across the world edge** (traders or migrants carrying iron)? | (a) no, the shipped default: `world-edge` may add only non-ore, non-finite classes. (b) yes: set `allowFinite` on `world-edge`. "Finite metals never regenerate" then means "never inside the world" | the `sources["world-edge"]` row |
| Q5 | **Outgassing.** Should fire, rot and breathing lose most organic mass to a named `air` sink? The unreviewed Lane R uses `sink(AIR, ORGANIC, gas, "fire.outgas")` and Lane Q adopts it. The brief's default list has no such sink, so the shipped table keeps all burned mass as ash and charcoal, and all rotted mass as humus. This may be a PM question rather than an Owner one | (a) add an `air` sink (organic only, with the named causes `fire.outgas`, `decay.rot.outgas`, `metabolism`). (b) keep the mass in the residue, as shipped | one sink row |

### For the PM (not Owner questions)

- **P1.** The brief cites "Owner ruling D-5 'ore never respawns'". At the base, `docs/OWNER_DECISIONS.md` has no D-5 entry: D-5 is a question in the audit (`docs/audits/LIVING_WORLD_GAP_AUDIT.md` §9). The rule itself is in V74 and V83 (`docs/VISION.md:84`, `:94`) and INV-SIM-03 (`docs/INVARIANT_REGISTRY.md:53`), so nothing here depends on the missing record. Consider recording D-5.
- **P2.** `game/data/DEUS_ResourceRegistry.json:512` has `"masonry_structures": 0.8` as a salvage recovery rate. Under the ledger, the other 20 % must be booked as rubble (a transform), not deleted. The hook-up package must do that.
- **P3.** `game/data/DEUS_ResourceRegistry.json:13-19` still describes a 5-level world with 1-ft strata (`"z": 1`), which is stale against DEC-013. The ledger does not read it.
- **P4.** The WBS row names Gemini as WG.65.15's owner (`docs/worldgen/DEUS_WORLDGEN_WBS.md:254`); directive 0035-AJ reassigns it to Claude, with Grok reviewing. The WBS may not record that yet.

## 7. Proposed follow-ups (PROPOSED-L1-NN; no WBS ids minted)

| Id | Package | What it does | Audit F-04 leaks it would catch or close |
|---|---|---|---|
| PROPOSED-L1-01 | **Hook-up** (LEDGER_API.md §9) | a legacy adapter, or `DEUS_SimHost.js` once it exists, creates one ledger per world, registers the generated world and seals it, and saves and restores the snapshot. It recounts Levels, Items, Objects and Fluid state for `assertBalanced` (test mode every 100 ticks; release on save and daily, logging only). It listens on `levels:strataChanged` (`DEUS_Levels.js:1558`) and wraps `Items.create`/`drop`/`remove` (`DEUS_Items.js:291`, `:325`, `:681`) and `setIn` (`DEUS_Objects.js:301`), so that every undeclared change is reported with its cell and cause | destroyed strata becoming air (`DEUS_Levels.js:1700-1702`); mining 4 strata for 2 stone (`DEUS_Jobs.js:458-459`); Dig's free stone (`DEUS_Interact.js:53`, `:167`); the 2-in, 4-out quarry (`game/data/DEUS_WorldCatalog.json:2225`, `:2204`, `:2104`); fire deleting items (`DEUS_Fire.js:442`); roof decks from nothing (`DEUS_Floors.js:276`); ore sprouts (`DEUS_Ecology.js:785`, refused as ore output); NaturalConnections `addFluid` (`DEUS_NaturalConnections.js:312`); Fluid reconciliation excess (`DEUS_Fluid.js:896-923`) |
| PROPOSED-L1-02 | **Leak fixes** (the SIM.50.12 rule-breach fixes proposed in 0035-AJ) | makes each writer above book its real transform: mining yield plus spoil, Dig as a strata edit, quarry and rubble by mass, fire residue, debris for destroyed strata, removal of the ore sprouts, fluid moves without creation. Each fix gets a ledger regression test modelled on the harness faults | closes the leaks listed for L1-01 |
| PROPOSED-L1-03 | **Mass tables** (with SIM.40.00/SIM.40.01; Q2) | an integer mass per material per 2-ft slice, per item type and per object type. Legacy 1-ft saves are converted at load as a unit change, not as a source | makes the recount exact in the real engine |
| PROPOSED-L1-04 | **Kernel move and shared purity check** (with SIM.00.02) | moves `ledger.js` and `ledger_defaults.js` to `game/js/sim/kernel/`; replaces this file's local purity scanner with `tools/sim/check_sim_purity.js`; compares module hashes between node and NW.js (ADR-003 §2.5) | – |
| PROPOSED-L1-05 | **Wider tables** | adds BONE, PB, Sn/Zn (bronze), SPECIAL (mithral, adamantine), GLASS, rock types as classes (Lane Q ids 32-37), ore-bearing rock ids 38-47 as ore classes, and an `air` sink if Q5 says so. Each is a data row | – |
| PROPOSED-L1-06 | **Provenance for conjured matter** (only if Q1 picks (d)) | tags each `magic` source by spell instance, so that its expiry sink removes exactly what is left (Lane Q §9.4) | – |
| PROPOSED-L1-07 | **Century-scale proof** (WG.65.18 with SIM.40.09) | runs the long-run test on the real core with day jumps and Lane R's FX-R-01 hamlet fixture, at 9 and 32 layers | end-to-end LIFE-001 proof over centuries |

## 8. Not done / known problems

- **Not wired into the game** (by design, per the brief). The audit F-04 leaks are still live in `game/js/plugins/**`. This package gives the tool that catches them and tests the tool; it fixes no leak.
- **NW.js not run.** The module has been loaded only in node, in a bare `vm` context. The ADR §2.5 loader and the node/NW.js module-hash comparison do not exist yet (PROPOSED-L1-04).
- **ADR-003 is PROPOSED.** The purity rules, the kernel layout and Q-MASS come from an ADR that is not signed off. If SIM.00.02 changes the forbidden list, the scanner in `tools/sim/test_ledger.js` changes with it.
- **The purity scanner is heuristic.** It tokenizes JS without a parser. Regex-versus-division is decided by the previous token, and Unicode identifiers are not handled. It found no false positive in the two module files or in the negative probe. The dynamic bare-context check covers what the scan cannot see, as mutant `hidden_math_random_caught_dynamically` shows.
- **The toy world is not the engine.** Its per-slice masses are placeholders (Q2), and its "recount" walks its own cells, not `DEUS_Levels`/`DEUS_Items`/`DEUS_Objects`/`DEUS_Fluid` state.
  - It starts sparse: seed 1 has 6,195 cells in 388 of 512 chunks.
  - It fills in over a run because toy water, items and creatures wander: seed 1 ends at 22,159 cells in 462 chunks, and seed 4 (9 layers) ends with all 144 chunks.
  - The ledger itself always holds 68 integers, whatever the world size.
- **The fixture was written by the harness itself**, at this code (`--write-fixture`). Its value is for later runs and other machines. It cannot show that the first run was right; the recounts do that. It must be regenerated whenever the ledger, its defaults or the harness change on purpose.
- **Checksums are 32-bit FNV-1a** (ADR-003 §10.6). Two different states can collide, with a chance of about 2^-32 per pair. The sensitivity tests compare specific pairs.
- **Faults are detected at the next recount**, up to K = 1,000 operations later (223 in the child runs). The `ore_via_ledger` fault is refused at once.
- **Mutation testing covers the two module files.** The harness is checked by its fault injections and its clean control child, not by mutants of its own code.
- **No performance claim.** One `createLedger()` takes about 0.5 ms in plain node, measured with a 200-iteration `hrtime` loop during development and not recorded as evidence. A 100,000-operation run, including 101 full recounts of the toy world, took 1.4-1.9 s. This is not a game-frame budget and was not measured in the game.
- **The shipped default table makes choices** a reviewer may want changed (LEDGER_API.md §7):
  - `break` skips the ruin stage for collapse and blasts;
  - rubble can be built into stone masonry;
  - fire and rot keep all their mass (Q5);
  - soil and humus are separate classes;
  - gold and platinum have no rust rows.
- **Class names differ** from the unreviewed Lane R and Lane Q designs (LEDGER_API.md §10). A single naming pass across the three lanes is not done here.

## 9. Try it

From the repository root, with Node.js 22.8 or later (the bare context uses `vm.constants.DONT_CONTEXTIFY` when it exists; older versions fall back to a contextified sandbox that is about 10 times slower):

1. `node tools/sim/test_ledger.js`. Expected: 117 `PASS` lines and `RESULT: 117 passed, 0 failed`, exit 0. Add `--quiet` to print only failures and the result.
2. `node tools/sim/test_ledger_longrun.js`. Expected: 18 `PASS` lines, the four runs' class and family tables, and `RESULT: 18 passed, 0 failed`, exit 0, in under a minute.
3. `node tools/sim/test_ledger_longrun.js --child --seeds=7 --ops=20000 --fault=ore_created --fault-at=7777`. Expected: `FAIL longrun_seed_7: at operation 8000: ... ORE_APPEARED fe_ore ...`, exit 1.
4. In node: `const L = require("./game/js/sim/ledger.js").createLedger(); L.register("fe_metal","item",10); L.seal(); L.transform("fe_metal","item","fe_trace","strata",4,"rust"); L.familyTotal("fe")`. Expected: `10`. Then `L.transform("stone","strata","fe_ore","strata",1,"sprout")` throws `E_ORE_OUTPUT`.

## 10. Commit record

- Code and evidence commit (all gates above): `6b15462c3732755377f8491fec763586746c29bc`.
- This report and the `evidence/` files are added in the commit after it. The commit that records this report's own hash comes after that.
