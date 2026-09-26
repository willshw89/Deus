# Grok review: WG.33.01 Lane X world-state registry integrity checker

Reviewed commit, pasted from `git rev-parse HEAD` and `git rev-parse origin/task/lane-x`:

```
b07087d5a043bda344cdb9790269e6a4458b78ad
b07087d5a043bda344cdb9790269e6a4458b78ad
```

Reviewer: Grok. This file is the review. No production code, BRIEF, fixtures, tools, or other docs were modified. No art was generated, requested, or integrated. Checks ran in a fresh temporary clone (`git clone -c core.autocrlf=false` of this worktree, then `git checkout --detach b07087d5a043bda344cdb9790269e6a4458b78ad`), never in the live worktree. The clone was deleted after the checks.

## Worktree identity

Command in the live worktree, before the clone: `git rev-parse HEAD origin/task/lane-x; git log -12 --format="%H %an %s"`.

```
b07087d5a043bda344cdb9790269e6a4458b78ad
b07087d5a043bda344cdb9790269e6a4458b78ad
b07087d5a043bda344cdb9790269e6a4458b78ad deus-claude [claude] WG.33.01 REPORT.md: record the report commit and the scope check
d132d007d5638ea2ac179294bbd2b45967d81ce0 deus-claude [claude] WG.33.01 REPORT.md and raw evidence (worktree and CRLF clone gates at 66641f1c, determinism, rebuilt-catalogue gate, section 7 cross-check)
66641f1c960af36fb7ac3ee0b3355b882e8f1112 deus-claude [claude] WG.33.01 tests: reportOf() asserts a report exists, so a mutant that makes the tool exit 2 fails on an assertion, not a TypeError
9288f1f2c274ce176cedb866481a8ad028f09c22 deus-claude [claude] WG.33.01 WIP: fixes from a pre-review pass: refuse seed rows outside tables; WSR-03 on every visualStateId; only classes that may display a world state resolve; real source ids for WSR-04; value in the gate key; placement slot/entry checks and discovery; scope enum, required-string, sidecar, map and geometry checks; strict baseline reasons
d1b2291aae4afba61f95d6d11850327c808aac6f deus-claude [claude] WG.33.01 WIP: --work-dir isolates the generator temp folder (tests no longer share the OS temp folder); --strict prints the severity; gate runner script
cc3cd03136658d4328bf5b8e7a52f787abb8310d deus-claude [claude] WG.33.01 WIP: read every seed table; tests for the remaining finding codes; section 7 cross-check evidence
3b05d205421185f338a3d8f557a74be19b1ad1f4 deus-claude [claude] WG.33.01 WIP: tests with fixtures and mutants, known-gaps baseline, committed report
ef290dc06757560331f5630f0539a32eb04f8aac deus-claude [claude] WG.33.01 WIP: verify_world_state_registry.js, scope and map parameters
cbeafc01056203e95fd2c0c2ca59e3bc292493f7 deus-claude [claude] WG.33.01 escalation.md: catalogue --check stale at base; template generator refuses the real catalogue (non-blocking)
03efb90b107abc4b6b7f01022eb2e291f499e9bf snewt [ops] WG.33.01 lane-x launch prompt 20260926_070940 (writer claude)
6ecec0f2c56719c2fd46705f3f1d6f1de57d54f0 snewt [pm] Open lane-x (WG.33.01): BRIEF.md and lane.json
425b594c146d5f353c10faa11f4b5d47f499b45f snewt Merge task/lane-g1: WG.00.12b merge-gate/check_claims/launcher trust (PM manual merge; Grok VERDICT CLEAN PASS at c51ebb4e)
```

HEAD equals `origin/task/lane-x`. Both are `b07087d5a043bda344cdb9790269e6a4458b78ad`.

## Fresh clone

Node v24.19.0. Clone: `git clone -c core.autocrlf=false` of `C:\Users\snewt\.deus_worktrees\lane-x` into `%TEMP%\lane-x-review-b07087d5`, then `git checkout --detach b07087d5a043bda344cdb9790269e6a4458b78ad`.

```
b07087d5a043bda344cdb9790269e6a4458b78ad
HEAD is now at b07087d5 [claude] WG.33.01 REPORT.md: record the report commit and the scope check
```

A later `git rev-parse HEAD` in that clone printed the same hash. `REVPARSE_EXIT=0`.

`git show --stat --format="%H%n%s" b07087d5a043bda344cdb9790269e6a4458b78ad` (`SHOW_EXIT=0`):

```
b07087d5a043bda344cdb9790269e6a4458b78ad
[claude] WG.33.01 REPORT.md: record the report commit and the scope check

 tasks/WG.33.01/lane-x/REPORT.md | 1 +
 1 file changed, 1 insertion(+)
```

That commit only adds one line to `tasks/WG.33.01/lane-x/REPORT.md`.

## Scope

Base `425b594c146d5f353c10faa11f4b5d47f499b45f` to tip `b07087d5a043bda344cdb9790269e6a4458b78ad`. Raw `git diff --name-status` from the clone (`NAMESTATUS_EXIT=0`). Every line is an addition. 47 paths.

```
A	tasks/WG.33.01/lane-x/BRIEF.md
A	tasks/WG.33.01/lane-x/REPORT.md
A	tasks/WG.33.01/lane-x/escalation.md
A	tasks/WG.33.01/lane-x/evidence/clone_crlf/gate_1.txt
A	tasks/WG.33.01/lane-x/evidence/clone_crlf/gate_2.txt
A	tasks/WG.33.01/lane-x/evidence/clone_crlf/gate_3.txt
A	tasks/WG.33.01/lane-x/evidence/clone_crlf/gate_4.txt
A	tasks/WG.33.01/lane-x/evidence/clone_crlf/gate_5.txt
A	tasks/WG.33.01/lane-x/evidence/clone_crlf/gate_6.txt
A	tasks/WG.33.01/lane-x/evidence/clone_crlf/strict_main.txt
A	tasks/WG.33.01/lane-x/evidence/clone_crlf_summary.txt
A	tasks/WG.33.01/lane-x/evidence/determinism.txt
A	tasks/WG.33.01/lane-x/evidence/natsys_section7_crosscheck.txt
A	tasks/WG.33.01/lane-x/evidence/rebuilt_catalogue_gate.txt
A	tasks/WG.33.01/lane-x/evidence/worktree/gate_1.txt
A	tasks/WG.33.01/lane-x/evidence/worktree/gate_2.txt
A	tasks/WG.33.01/lane-x/evidence/worktree/gate_3.txt
A	tasks/WG.33.01/lane-x/evidence/worktree/gate_4.txt
A	tasks/WG.33.01/lane-x/evidence/worktree/gate_5.txt
A	tasks/WG.33.01/lane-x/evidence/worktree/gate_6.txt
A	tasks/WG.33.01/lane-x/evidence/worktree/strict_main.txt
A	tasks/WG.33.01/lane-x/evidence/worktree_summary.txt
A	tasks/WG.33.01/lane-x/lane.json
A	tasks/WG.33.01/lane-x/launches/20260926_070940_prompt.txt
A	tasks/WG.33.01/lane-x/make_baseline.js
A	tasks/WG.33.01/lane-x/run_gates.sh
A	tools/test_verify_world_state_registry.js
A	tools/verify_world_state_registry.js
A	tools/wsr/.gitattributes
A	tools/wsr/fixtures/clean/approvals.md
A	tools/wsr/fixtures/clean/catalogue.json
A	tools/wsr/fixtures/clean/geometry.json
A	tools/wsr/fixtures/clean/known_gaps.json
A	tools/wsr/fixtures/clean/map.json
A	tools/wsr/fixtures/clean/placement_report.json
A	tools/wsr/fixtures/clean/registry.md
A	tools/wsr/fixtures/clean/scope.json
A	tools/wsr/fixtures/clean/templates/ATLAS_ALL_TEST_CHARACTER_01.json
A	tools/wsr/fixtures/clean/templates/ATLAS_ALL_TEST_PROP_01.json
A	tools/wsr/fixtures/clean/templates/ATLAS_SURFACE_TEST_TILE_01.json
A	tools/wsr/fixtures/clean/templates/RMMZ_TEST_A2.json
A	tools/wsr/fixtures/clean/world_catalog.json
A	tools/wsr/known_gaps.json
A	tools/wsr/report/WSR_REPORT.md
A	tools/wsr/report/wsr_report.json
A	tools/wsr/scope.json
A	tools/wsr/visual_state_map.json
```

| Status | Path | allowedPaths |
| --- | --- | --- |
| A | `tasks/WG.33.01/lane-x/BRIEF.md` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/REPORT.md` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/escalation.md` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/clone_crlf/gate_1.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/clone_crlf/gate_2.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/clone_crlf/gate_3.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/clone_crlf/gate_4.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/clone_crlf/gate_5.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/clone_crlf/gate_6.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/clone_crlf/strict_main.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/clone_crlf_summary.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/determinism.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/natsys_section7_crosscheck.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/rebuilt_catalogue_gate.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/worktree/gate_1.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/worktree/gate_2.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/worktree/gate_3.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/worktree/gate_4.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/worktree/gate_5.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/worktree/gate_6.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/worktree/strict_main.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/evidence/worktree_summary.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/lane.json` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/launches/20260926_070940_prompt.txt` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/make_baseline.js` | tasks/WG.33.01/** |
| A | `tasks/WG.33.01/lane-x/run_gates.sh` | tasks/WG.33.01/** |
| A | `tools/test_verify_world_state_registry.js` | exact |
| A | `tools/verify_world_state_registry.js` | exact |
| A | `tools/wsr/.gitattributes` | tools/wsr/** |
| A | `tools/wsr/fixtures/clean/approvals.md` | tools/wsr/** |
| A | `tools/wsr/fixtures/clean/catalogue.json` | tools/wsr/** |
| A | `tools/wsr/fixtures/clean/geometry.json` | tools/wsr/** |
| A | `tools/wsr/fixtures/clean/known_gaps.json` | tools/wsr/** |
| A | `tools/wsr/fixtures/clean/map.json` | tools/wsr/** |
| A | `tools/wsr/fixtures/clean/placement_report.json` | tools/wsr/** |
| A | `tools/wsr/fixtures/clean/registry.md` | tools/wsr/** |
| A | `tools/wsr/fixtures/clean/scope.json` | tools/wsr/** |
| A | `tools/wsr/fixtures/clean/templates/ATLAS_ALL_TEST_CHARACTER_01.json` | tools/wsr/** |
| A | `tools/wsr/fixtures/clean/templates/ATLAS_ALL_TEST_PROP_01.json` | tools/wsr/** |
| A | `tools/wsr/fixtures/clean/templates/ATLAS_SURFACE_TEST_TILE_01.json` | tools/wsr/** |
| A | `tools/wsr/fixtures/clean/templates/RMMZ_TEST_A2.json` | tools/wsr/** |
| A | `tools/wsr/fixtures/clean/world_catalog.json` | tools/wsr/** |
| A | `tools/wsr/known_gaps.json` | tools/wsr/** |
| A | `tools/wsr/report/WSR_REPORT.md` | tools/wsr/** |
| A | `tools/wsr/report/wsr_report.json` | tools/wsr/** |
| A | `tools/wsr/scope.json` | tools/wsr/** |
| A | `tools/wsr/visual_state_map.json` | tools/wsr/** |

A path is allowed when it is `tools/verify_world_state_registry.js`, `tools/test_verify_world_state_registry.js`, `tools/wsr/**`, or `tasks/WG.33.01/**`. A node check of the same name-only list printed `PATHS=47`, `OUTSIDE_ALLOWED=0`, `SCAN_EXIT=0`.

`git diff --name-only 425b594c146d5f353c10faa11f4b5d47f499b45f b07087d5a043bda344cdb9790269e6a4458b78ad -- art docs game tools/art tools/check_deus_syntax.js docs/STATUS.md` printed no paths. `FORBIDDEN_TREE_EXIT=0`. Nothing under `game/**`, `art/**`, `docs/**` (including `docs/STATUS.md` and WBS files), or `tools/` outside the allowed set changed.

`git diff --stat` ended with `47 files changed, 11339 insertions(+)`. `STAT_EXIT=0`.

## Gate commands

Each command ran in the detached clone, foreground, working directory = clone root. Stderr files were 0 bytes. `EXIT=` is the process exit code appended after the command's own stdout.

### a. `node tools/test_verify_world_state_registry.js`

```
PASS clean_fixture_passes: 0 gating findings, 1 exempt
PASS clean_fixture_strict_passes: exit 0
PASS clean_resolution_methods: ID, SOURCE, MAP and derived-variant resolution
PASS clean_counts: rows 8, art 5, slots 9, natural 4/4 traced, 9/9 agree
PASS neg_wsr01_duplicate_state: WSR-01 DUPLICATE_STATE STATE_TEST_BOULDER
PASS neg_wsr01_two_systems: WSR-01 MULTIPLE_SYSTEMS STATE_TEST_SPRING
PASS neg_wsr01_system_not_in_enum: WSR-01 SYSTEM_NOT_IN_ENUM STATE_TEST_TRAIL
PASS neg_wsr01_no_system: WSR-01 NO_SYSTEM STATE_TEST_AQUIFER
PASS neg_wsr02_visual_state_null_family: WSR-02 ASSET_FAMILY_MISSING STATE_TEST_BOULDER
PASS neg_wsr02_visual_state_null_id: WSR-02 VISUAL_STATE_ID_MISSING STATE_TEST_BOULDER
PASS neg_wsr02_visual_state_id_not_an_id: WSR-02 VISUAL_STATE_ID_INVALID STATE_TEST_BOULDER
PASS neg_wsr02_vfx_null_family: WSR-02 ASSET_FAMILY_MISSING STATE_TEST_FLAME
PASS neg_wsr02_simulation_has_visual: WSR-02 SIMULATION_HAS_VISUAL STATE_TEST_AQUIFER
PASS neg_wsr02_composed_other_system: WSR-02 COMPOSED_NOT_ALLOWED STATE_TEST_ARCH
PASS neg_wsr02_composed_incomplete: WSR-02 COMPOSED_INCOMPLETE STATE_TEST_ARCH
PASS neg_wsr03_visual_state_without_entry: WSR-03 NO_CATALOGUE_ENTRY STATE_TEST_BOULDER
PASS neg_wsr03_entry_without_slot: WSR-03 NO_SLOT STATE_TEST_SPRING
PASS neg_wsr03_slot_not_in_template: WSR-03 SLOT_NOT_IN_TEMPLATE STATE_TEST_SPRING
PASS neg_wsr03_slot_rect_differs_in_template: WSR-03 SLOT_NOT_IN_TEMPLATE STATE_TEST_SPRING
PASS neg_wsr03_template_unavailable: WSR-03 TEMPLATE_UNAVAILABLE STATE_TEST_FLAME
PASS neg_wsr03_not_in_world_catalog: WSR-03 NOT_IN_WORLD_CATALOG STATE_TEST_SPRING
PASS neg_wsr03_family_not_in_catalogue: WSR-03 FAMILY_NOT_IN_CATALOGUE FAM_TEST_WATER
PASS neg_wsr03_proposed_mapping_not_used: WSR-03 NO_CATALOGUE_ENTRY STATE_TEST_FLAME
PASS neg_wsr03_map_target_unknown: WSR-03 MAP_TARGET_UNKNOWN test_flame
PASS neg_wsr03_map_unused: WSR-03 MAP_UNUSED test_unused
PASS neg_wsr03_optional_state_without_entry: WSR-03 NO_CATALOGUE_ENTRY STATE_TEST_TRAIL
PASS neg_wsr03_optional_state_unknown_family: WSR-03 FAMILY_NOT_IN_CATALOGUE FAM_TEST_UNKNOWN
PASS neg_wsr03_item_icon_does_not_display_a_state: WSR-03 NO_CATALOGUE_ENTRY STATE_TEST_BOULDER (item match rejected)
PASS neg_wsr04_natural_slot_without_state: WSR-04 SLOT_NO_STATE ATLAS_ALL_TEST_PROP_01:0003
PASS neg_wsr04_class_undeclared: WSR-04 SLOT_CLASS_UNDECLARED ATLAS_ALL_TEST_PROP_01:0002
PASS neg_wsr04_empty_source_id: WSR-04 SLOT_SOURCE_UNDECLARED ATLAS_ALL_TEST_CHARACTER_01:0001
PASS neg_wsr04_unknown_catalog_source: WSR-04 SLOT_SOURCE_UNDECLARED ATLAS_ALL_TEST_PROP_01:0002
PASS neg_wsr04_non_world_slot_without_source: WSR-04 SLOT_SOURCE_UNDECLARED ATLAS_ALL_TEST_CHARACTER_01:0001
PASS neg_wsr05_missing_performance_class: WSR-05 PERFORMANCE_CLASS_MISSING STATE_TEST_SPRING
PASS neg_wsr05_invalid_performance_class: WSR-05 PERFORMANCE_CLASS_INVALID STATE_TEST_SPRING
PASS neg_wsr05_no_column: WSR-05 PERFORMANCE_CLASS_MISSING x8
PASS neg_schema_column_missing: WSR-SCHEMA COLUMN_MISSING description
PASS neg_schema_visual_class_not_in_enum: WSR-SCHEMA ENUM_INVALID STATE_TEST_TRAIL
PASS neg_schema_state_id_format: WSR-SCHEMA STATE_ID_FORMAT State_Test_Aquifer
PASS neg_schema_transition_unknown: WSR-SCHEMA TRANSITION_UNKNOWN STATE_TEST_SPRING
PASS neg_schema_required_string_empty: WSR-SCHEMA VALUE_MISSING STATE_TEST_SPRING
PASS neg_schema_boolean_invalid: WSR-SCHEMA TYPE_INVALID STATE_TEST_SPRING
PASS neg_mt_slot_rect_differs: MANIFEST-TEMPLATE SLOT_RECT_DIFFERS ATLAS_ALL_TEST_PROP_01:0002
PASS neg_mt_template_slot_missing_from_catalogue: MANIFEST-TEMPLATE SLOT_NOT_IN_CATALOGUE ATLAS_ALL_TEST_PROP_01:0009
PASS neg_mt_catalogue_slot_missing_from_template: MANIFEST-TEMPLATE SLOT_NOT_IN_TEMPLATE ATLAS_ALL_TEST_PROP_01:0002
PASS neg_mt_sheet_missing_from_template: MANIFEST-TEMPLATE SHEET_NOT_IN_TEMPLATE RMMZ_TEST_A2
PASS neg_mt_sheet_missing_from_catalogue: MANIFEST-TEMPLATE SHEET_NOT_IN_CATALOGUE RMMZ_TEST_B
PASS neg_mt_sheet_geometry_differs: MANIFEST-TEMPLATE SHEET_GEOMETRY_DIFFERS RMMZ_TEST_A2
PASS neg_mt_slot_entry_differs: MANIFEST-TEMPLATE SLOT_ENTRY_DIFFERS ATLAS_ALL_TEST_PROP_01:0002
PASS neg_mt_slot_on_other_sheet: MANIFEST-TEMPLATE SLOT_SHEET_DIFFERS ATLAS_ALL_TEST_PROP_01:0002
PASS neg_mt_slot_id_not_of_its_sheet: MANIFEST-TEMPLATE SLOT_ID_SHEET_MISMATCH ATLAS_ALL_TEST_OTHER_01:0002
PASS neg_mt_slot_on_unknown_sheet: MANIFEST-TEMPLATE SLOT_SHEET_UNKNOWN ATLAS_ALL_TEST_GONE_01:0001
PASS neg_mt_duplicate_template_slot: MANIFEST-TEMPLATE DUPLICATE_TEMPLATE_SLOT ATLAS_ALL_TEST_PROP_01:0002
PASS neg_mt_duplicate_entry_id: MANIFEST-TEMPLATE DUPLICATE_ENTRY_ID ALL_SHARED_ITEM_TEST-LOG_V1_DEFAULT
PASS neg_mt_slot_outside_its_sheet: MANIFEST-TEMPLATE SLOT_OUTSIDE_SHEET ATLAS_ALL_TEST_PROP_01:0002
PASS neg_mt_sheet_grid_not_tile: MANIFEST-TEMPLATE SHEET_GRID_MISMATCH ATLAS_ALL_TEST_PROP_01
PASS neg_mt_sheet_too_large: MANIFEST-TEMPLATE SHEET_TOO_LARGE ATLAS_ALL_TEST_PROP_01
PASS neg_mt_sidecar_not_json: MANIFEST-TEMPLATE TEMPLATE_SIDECAR_INVALID BROKEN.json
PASS neg_mt_duplicate_catalogue_slot: MANIFEST-TEMPLATE DUPLICATE_SLOT_ID ATLAS_ALL_TEST_PROP_01:0002
PASS neg_placed_region_outside_slot: PLACED-IN-SLOT PLACED_OUTSIDE_SLOT ATLAS_ALL_TEST_PROP_01:0002
PASS neg_placed_region_larger_than_slot: PLACED-IN-SLOT PLACED_OUTSIDE_SLOT ATLAS_SURFACE_TEST_TILE_01:0006
PASS neg_placed_unknown_slot_outside: PLACED-IN-SLOT PLACED_OUTSIDE_SLOT ATLAS_ALL_TEST_PROP_01@144,0,48x48
PASS neg_placed_unknown_slot_id_no_fallback: PLACED-IN-SLOT PLACED_SLOT_UNKNOWN ATLAS_ALL_TEST_PROP_01:0009
PASS neg_placed_entry_not_slot_owner: PLACED-IN-SLOT PLACED_ENTRY_MISMATCH ATLAS_ALL_TEST_PROP_01:0002
PASS neg_placed_ledger_unknown_id: PLACED-IN-SLOT LEDGER_ID_UNKNOWN ATLAS_ALL_TEST_PROP_01:0007
PASS neg_placed_ledger_malformed: PLACED-IN-SLOT LEDGER_MALFORMED approvals.md
PASS neg_placed_report_invalid: PLACED-IN-SLOT PLACEMENT_REPORT_INVALID placement_0.json
PASS placed_region_inside_without_slot_id: exit 0
PASS placed_none_reported: ledger ABSENT, 0 regions
PASS baseline_new_gap_fails: exit 1, 1 new
PASS baseline_baselined_gap_passes: exit 0
PASS baseline_stale_entry_fails: exit 1, 1 stale
PASS strict_fails_on_baselined_gap: exit 1
PASS baseline_exempt_is_not_baselinable: exit 1
PASS baseline_reason_required: exit 2
PASS baseline_duplicate_rejected: exit 2
PASS baseline_value_is_part_of_the_key: same value: exit 0; other value: NEW + STALE, exit 1
PASS scope_value_not_in_schema_enum: exit 2
PASS map_of_wrong_shape_refused: exit 2, no crash
PASS report_deterministic: wsr_report.json 4dc7ec4e6239f087fb4759bf0555e2b675041d32533e24b200c6fb903ff479fb; WSR_REPORT.md 8c945dc5432477530a91243938442dda63d6e42071d0b794ff8dc2c29c439646
PASS report_has_no_paths_or_times: no temp path, timestamp or Windows path
PASS report_lists_every_finding: 4 findings in both files
PASS check_matches_committed_report: exit 0
PASS check_detects_changed_report: edited: exit 1; missing: exit 1
PASS check_detects_stale_input: exit 1
PASS check_folds_crlf: exit 0
PASS parse_error_names_the_line: registry.md:109
PASS parse_bad_schema_names_the_line: registry.md:7
PASS parse_every_seed_table_read: 2 tables, 9 rows; second-table row and its missing columns reported
PASS parse_row_without_leading_pipe_refused: exit 2 at registry.md:114
PASS parse_row_after_blank_line_refused: exit 2 at registry.md:115
PASS parse_row_after_comment_refused: exit 2 at registry.md:108
PASS parse_indented_row_refused: exit 2 at registry.md:114
PASS parse_short_separator_accepted: exit 0
PASS parse_no_seed_table: exit 2
PASS usage_errors: unknown 2, --check --strict 2, --help 0
PASS gen_lane_t_fixture_agrees: 5 sheets, 28/28 slots agree
PASS gen_refusals_recorded_and_rest_compared: 2 refusals, 3 sheets / 4 slots still compared
PASS gen_split_run_keeps_slots: 3 sheets identical (slots and template sha256)
PASS gen_catalogue_refusal_blocks_all: 1 run, 5 sheets unavailable
PASS gen_temp_folder_removed: no wsr-templates-* folder left in the work folder
PASS gen_work_dir_missing: exit 2
PASS cli_exit_codes: clean 0, strict 0, negative 1, bad argument 2
PASS placements_discovered_when_not_given: DISCOVERED, 0 tracked report(s) under art/
PASS real_baseline_valid: 1248 entries, every one with a reason
PASS mutation_control: the unmutated source compiled in memory passes all 102 checks
PASS mutant_wsr01_off_killed: by neg_wsr01_duplicate_state (want exit 1 and WSR-01/DUPLICATE_STATE/STATE_TEST_BOULDER; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_wsr02_off_killed: by clean_fixture_passes (want one COMPOSED_EXEMPT for STATE_TEST_ARCH; got exit 0; findings: none)
PASS mutant_wsr03_off_killed: by neg_wsr03_visual_state_without_entry (want exit 1 and WSR-03/NO_CATALOGUE_ENTRY/STATE_TEST_BOULDER; got exit 1; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH, WSR-04/SLOT_NO_STATE/ATLAS_SURFACE_T)
PASS mutant_wsr04_off_killed: by neg_wsr04_natural_slot_without_state (want exit 1 and WSR-04/SLOT_NO_STATE/ATLAS_ALL_TEST_PROP_01:0003; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_wsr05_off_killed: by neg_wsr05_missing_performance_class (want exit 1 and WSR-05/PERFORMANCE_CLASS_MISSING/STATE_TEST_SPRING; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_schema_off_killed: by neg_schema_column_missing (want exit 1 and WSR-SCHEMA/COLUMN_MISSING/description; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_manifest_template_off_killed: by neg_mt_slot_rect_differs (want exit 1 and MANIFEST-TEMPLATE/SLOT_RECT_DIFFERS/ATLAS_ALL_TEST_PROP_01:0002; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_placed_off_killed: by neg_placed_region_outside_slot (want exit 1 and PLACED-IN-SLOT/PLACED_OUTSIDE_SLOT/ATLAS_ALL_TEST_PROP_01:0002; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_baseline_staleness_ignored_killed: by baseline_stale_entry_fails (want exit 1 with one STALE line; got RULE PLACED-IN-SLOT: 0 violation(s), 0 gap(s), 0 exempt / BASELINE known_gaps.json: 1 entry, 0 matched, 0 new, 0 stale / GA)
PASS mutant_baseline_new_gaps_ignored_killed: by neg_wsr01_duplicate_state (want exit 1 and WSR-01/DUPLICATE_STATE/STATE_TEST_BOULDER; got exit 0; findings: WSR-01/DUPLICATE_STATE/STATE_TEST_BOULDER, WSR-02/COMPOSED_EXEMPT/STATE_TEST_AR)
PASS mutant_strict_uses_baseline_killed: by strict_fails_on_baselined_gap (want exit 1 from --strict; got BASELINE known_gaps.json: 1 entry, 1 matched, 0 new, 0 stale / GATE: OK (every violation and gap is baselined; no stale entry))
PASS mutant_slot_ids_only_no_rects_killed: by neg_wsr03_slot_rect_differs_in_template (want exit 1 and WSR-03/SLOT_NOT_IN_TEMPLATE/STATE_TEST_SPRING; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_sheet_geometry_ignored_killed: by neg_mt_sheet_geometry_differs (want exit 1 and MANIFEST-TEMPLATE/SHEET_GEOMETRY_DIFFERS/RMMZ_TEST_A2; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_template_to_catalogue_direction_off_killed: by neg_mt_template_slot_missing_from_catalogue (want exit 1 and MANIFEST-TEMPLATE/SLOT_NOT_IN_CATALOGUE/ATLAS_ALL_TEST_PROP_01:0009; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_refusals_dropped_killed: by gen_refusals_recorded_and_rest_compared (MANIFEST-TEMPLATE findings ["SHEET_NOT_IN_TEMPLATE $TEST_Horse","SHEET_NOT_IN_TEMPLATE TEST_ATLAS_SURFACE"])
PASS mutant_work_dir_ignored_killed: by gen_work_dir_missing (want exit 2; got WSR: registry.md: 8 rows, 8 states; tools/art/fixtures/templates/catalogue.fixture.json: 5 sheets, 28 slots / TEMPLATES: GENERATED (tools/art/m)
PASS mutant_temp_folder_kept_killed: by gen_temp_folder_removed (temp folders left behind: wsr-templates-bo174Y)
PASS mutant_composed_exempt_any_system_killed: by neg_wsr02_composed_other_system (want exit 1 and WSR-02/COMPOSED_NOT_ALLOWED/STATE_TEST_ARCH; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_proposed_mapping_resolves_killed: by neg_wsr03_proposed_mapping_not_used (want exit 1 and WSR-03/NO_CATALOGUE_ENTRY/STATE_TEST_FLAME; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_derived_variant_base_ignored_killed: by clean_fixture_passes (want exit 0; got exit 1; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH, WSR-03/NO_SLOT/STATE_TEST_MOSS_DEEP, WSR-04/SLOT_NO_STATE/ATLAS_SURFACE_TEST_TILE_01:)
PASS mutant_world_catalog_leg_off_killed: by neg_wsr03_not_in_world_catalog (want exit 1 and WSR-03/NOT_IN_WORLD_CATALOG/STATE_TEST_SPRING; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_family_leg_off_killed: by neg_wsr03_family_not_in_catalogue (want exit 1 and WSR-03/FAMILY_NOT_IN_CATALOGUE/FAM_TEST_WATER; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_undeclared_class_allowed_killed: by neg_wsr04_class_undeclared (want exit 1 and WSR-04/SLOT_CLASS_UNDECLARED/ATLAS_ALL_TEST_PROP_01:0002; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_baseline_reason_not_required_killed: by baseline_reason_required (want exit 2 naming the reason; got WSR: registry.md: 8 rows, 8 states; catalogue.json: 4 sheets, 9 slots / TEMPLATES: DIR (templates); sidecars read; 4 template)
PASS mutant_check_always_matches_killed: by check_detects_changed_report (want exit 1 and a DIFF line; got DIFF rep3108/WSR_REPORT.md / CHECK: FAILED (1 report file(s) differ from a fresh run; rerun with --report rep3108))
PASS mutant_report_timestamped_killed: by report_deterministic (wsr_report.json differs between two runs: a4d1395996602853678aa1b95c5f7e59450e655b86f130d7f9eb75ae89da4df4 vs 44424f8fa4145f9f6b4b820ecb585951d9649867b5b1d078b0)
PASS mutant_later_seed_tables_ignored_killed: by parse_every_seed_table_read (want a report (the second table must parse); got exit 2: ERROR: registry.md:123: line looks like a seed-table row (a state id followed by "|") but is not inside)
PASS mutant_row_outside_table_accepted_killed: by parse_row_without_leading_pipe_refused (want exit 2 naming registry.md:114; got WSR: registry.md: 8 rows, 8 states; catalogue.json: 4 sheets, 9 slots / TEMPLATES: DIR (templates); sidecars read; 4 tem)
PASS mutant_wsr03_art_required_rows_only_killed: by neg_wsr03_optional_state_without_entry (want exit 1 and WSR-03/NO_CATALOGUE_ENTRY/STATE_TEST_TRAIL; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_any_class_displays_a_state_killed: by neg_wsr03_item_icon_does_not_display_a_state (want NO_CATALOGUE_ENTRY naming the rejected item match; got exit 1; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH, WSR-04/SLOT_NO_STATE/ATLAS_SURFACE_TEST_TI)
PASS mutant_source_ids_not_checked_real_killed: by neg_wsr04_empty_source_id (want exit 1 and WSR-04/SLOT_SOURCE_UNDECLARED/ATLAS_ALL_TEST_CHARACTER_01:0001; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_value_not_in_gate_key_killed: by baseline_value_is_part_of_the_key (a different value must be NEW + STALE; got RULE PLACED-IN-SLOT: 0 violation(s), 0 gap(s), 0 exempt / BASELINE known_gaps.json: 1 entry, 1 matched, 0 new, 0 stal)
PASS mutant_placed_unknown_slot_falls_back_killed: by neg_placed_unknown_slot_id_no_fallback (want exit 1 and PLACED-IN-SLOT/PLACED_SLOT_UNKNOWN/ATLAS_ALL_TEST_PROP_01:0009; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_scope_enums_not_checked_killed: by scope_value_not_in_schema_enum (want exit 2 naming the typo; got WSR: registry.md: 8 rows, 8 states; catalogue.json: 4 sheets, 9 slots / TEMPLATES: DIR (templates); sidecars read; 4 template s)
PASS mutant_required_strings_not_checked_killed: by neg_schema_required_string_empty (want exit 1 and WSR-SCHEMA/VALUE_MISSING/STATE_TEST_SPRING; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_geometry_dimensions_off_killed: by neg_mt_sheet_grid_not_tile (want exit 1 and MANIFEST-TEMPLATE/SHEET_GRID_MISMATCH/ATLAS_ALL_TEST_PROP_01; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_parse_line_dropped_killed: by parse_error_names_the_line (want exit 2 naming registry.md:109; got ERROR: registry.md: seed table row has 10 cells; the header has 11)
PASS mutants_left_tool_untouched: the tool file on disk is unchanged
PASS repo_untouched: git status is the same before and after the run
RESULT: 145 passed, 0 failed
EXIT=0
```

### b. `node tools/verify_world_state_registry.js`

```
WSR: docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md: 49 rows, 49 states; art/catalogue/catalogue.json: 207 sheets, 2494 slots
TEMPLATES: GENERATED (tools/art/make_blank_templates.js); run 1: 207 sheet(s) exit 2, 963 refusal(s); run 2: 187 sheet(s) exit 0; 187 template sheet(s), 542 slot(s) compared, 542 agree
RULE WSR-01: 9 violation(s), 0 gap(s), 0 exempt
RULE WSR-02: 0 violation(s), 0 gap(s), 2 exempt
RULE WSR-03: 0 violation(s), 93 gap(s), 0 exempt
RULE WSR-04: 0 violation(s), 110 gap(s), 0 exempt
RULE WSR-05: 49 violation(s), 0 gap(s), 0 exempt
RULE WSR-SCHEMA: 4 violation(s), 0 gap(s), 0 exempt
RULE MANIFEST-TEMPLATE: 0 violation(s), 983 gap(s), 0 exempt
RULE PLACED-IN-SLOT: 0 violation(s), 0 gap(s), 0 exempt
BASELINE tools/wsr/known_gaps.json: 1248 entries, 1248 matched, 0 new, 0 stale
GATE: OK (every violation and gap is baselined; no stale entry)
EXIT=0
```

### c. `node tools/verify_world_state_registry.js --check`

```
WSR: docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md: 49 rows, 49 states; art/catalogue/catalogue.json: 207 sheets, 2494 slots
TEMPLATES: GENERATED (tools/art/make_blank_templates.js); run 1: 207 sheet(s) exit 2, 963 refusal(s); run 2: 187 sheet(s) exit 0; 187 template sheet(s), 542 slot(s) compared, 542 agree
RULE WSR-01: 9 violation(s), 0 gap(s), 0 exempt
RULE WSR-02: 0 violation(s), 0 gap(s), 2 exempt
RULE WSR-03: 0 violation(s), 93 gap(s), 0 exempt
RULE WSR-04: 0 violation(s), 110 gap(s), 0 exempt
RULE WSR-05: 49 violation(s), 0 gap(s), 0 exempt
RULE WSR-SCHEMA: 4 violation(s), 0 gap(s), 0 exempt
RULE MANIFEST-TEMPLATE: 0 violation(s), 983 gap(s), 0 exempt
RULE PLACED-IN-SLOT: 0 violation(s), 0 gap(s), 0 exempt
CHECK: OK (tools/wsr/report matches a fresh run)
EXIT=0
```

### d. `node tools/art/test_catalogue.js`

```
PASS catalogue.schema: $id deus-art-catalogue/1.1.0; unsupported keywords 0; 10089 entries, 207 sheets: 0 schema errors; broken copy rejected with 2 errors
PASS catalogue.entry_fields: 10089 entries checked; 0 bad
FAIL catalogue.rebuild_identical: 12 outputs; run1 vs run2 differ: none; fresh build vs committed differ: art/catalogue/catalogue.json, art/catalogue/conflicts.md; catalogue.json sha256 9bc98b86a8c8e504...
PASS catalogue.rule_derived_derived_base: a derivedFrom pointing at a derived base: baseline fixture 0 errors; patched fixture -> 1 DERIVED_BAD_BASE (SURFACE_SHARED_RAMP_MEADOW_N-C3_DEFAULT: derivedFrom LOWER1_SHARED_EDGE_MEADOW_S-H2_DEFAULT is itself derived)
PASS catalogue.rule_derived_missing_base: a derivedFrom pointing at a missing base: baseline fixture 0 errors; patched fixture -> 1 DERIVED_BAD_BASE (LOWER1_SHARED_EDGE_MEADOW_S-H2_DEFAULT: derivedFrom SURFACE_SHARED_EDGE_NOSUCH_S-H2_DEFAULT is missing)
PASS catalogue.rule_dup_id: a duplicate id: baseline fixture 0 errors; patched fixture -> 1 DUP_ID (ALL_SHARED_ITEM_LOG_V1_DEFAULT: duplicate entry id)
PASS catalogue.rule_dup_slot: a duplicate slotId: baseline fixture 0 errors; patched fixture -> 1 DUP_SLOT (ALL_SHARED_ITEM_LOG_V1_DEFAULT: duplicate slotId ATLAS_SURFACE_SHARED_PROP_01:0036)
PASS catalogue.rule_geom_height: a geometry-derived slot height that is not computed from stratumPx/layerPx: baseline fixture 0 errors; patched fixture -> 1 GEOM_HEIGHT (SURFACE_SHARED_EDGE_MEADOW_S-H2_DEFAULT: height 38/48/48 is not 38/38/39 from stratumPx/layerPx)
PASS catalogue.rule_missing_anchor: a missing anchor: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing anchor)
PASS catalogue.rule_missing_envelope: a missing envelope: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing envelope)
PASS catalogue.rule_missing_footprint: a missing footprint: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing footprint)
PASS catalogue.rule_missing_ramp: a missing palette ramp: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing palette ramp)
PASS catalogue.rule_missing_size: a missing size (frames): baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing size (frames))
PASS catalogue.rule_no_source: an entry that traces to no source: baseline fixture 0 errors; patched fixture -> 1 NO_SOURCE (ALL_SHARED_ITEM_LOG_V1_DEFAULT: entry traces to no source)
PASS catalogue.rule_oos_no_reason: an outOfScope row without a reason: baseline fixture 0 errors; patched fixture -> 1 OOS_NO_REASON (skins:human: outOfScope row without a reason)
PASS catalogue.rule_paperdoll_anchor: a paper-doll part whose anchor differs from its bodyType base: baseline fixture 0 errors; patched fixture -> 1 PAPERDOLL_MISMATCH (ALL_SHARED_EQUIPMENT_STONE-AXE_LAYER_DEFAULT: anchor differs from ALL_SHARED_CHARACTER_HUMAN_MALE-T0_DEFAULT)
PASS catalogue.rule_paperdoll_frames: a paper-doll part whose frame layout differs from its bodyType base: baseline fixture 0 errors; patched fixture -> 1 PAPERDOLL_MISMATCH (ALL_SHARED_EQUIPMENT_STONE-AXE_LAYER_DEFAULT: frame layout [16,4,["S","W","E","N"]] differs from ALL_SHARED_CHARACTER_HUMAN_MALE-T0_DEFAULT [3,4,["S","W","E","N"]])
PASS catalogue.rule_ramp_unknown: a ramp id not in the palette registry: baseline fixture 0 errors; patched fixture -> 1 RAMP_UNKNOWN (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: ramp NOT_A_REGISTRY_RAMP is not in the palette registry)
PASS catalogue.rule_scalerow_unknown: a scaleRow not in scale_chart.json: baseline fixture 0 errors; patched fixture -> 1 SCALEROW_UNKNOWN (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: scaleRow TREE_NOT_IN_THE_CHART is not in scale_chart.json or size_classes.json)
PASS catalogue.rule_sheet_not_grid: a sheet side not a multiple of 48: baseline fixture 0 errors; patched fixture -> 1 SHEET_NOT_GRID (ATLAS_SURFACE_SHARED_PROP_01: atlas 2880x150 is not a multiple of 48)
PASS catalogue.rule_sheet_too_large: an atlas side over 4096: baseline fixture 0 errors; patched fixture -> 1 SHEET_TOO_LARGE (ATLAS_SURFACE_SHARED_PROP_01: atlas 4128x144 is over 4096)
PASS catalogue.rule_size_outside_row: a size outside its chart row min/max: baseline fixture 0 errors; patched fixture -> 1 SIZE_OUTSIDE_ROW (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: envelope outside TREE_COMMON_OAK min/max)
PASS catalogue.rule_slot_off_grid: a slot off the 48 grid: baseline fixture 0 errors; patched fixture -> 1 SLOT_OFF_GRID (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: slot 2071,0 96x96 is off the 48 grid)
PASS catalogue.rule_slot_outside_sheet: a slot outside its sheet: baseline fixture 0 errors; patched fixture -> 1 SLOT_OUTSIDE_SHEET (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: slot leaves ATLAS_SURFACE_SHARED_PROP_01 (2880x144))
PASS catalogue.rule_slot_overlap: overlapping slot rects in a sheet: baseline fixture 0 errors; patched fixture -> 1 SLOT_OVERLAP (SURFACE_SHARED_EDGE_MEADOW_S-H2_DEFAULT: overlaps SURFACE_SHARED_RAMP_MEADOW_N-C3_DEFAULT in ATLAS_SURFACE_SHARED_TILE_01)
PASS catalogue.rule_slot_too_small: a slot smaller than the chart envelope: baseline fixture 0 errors; patched fixture -> 1 SLOT_TOO_SMALL (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: slot cell 96x48 is smaller than the envelope 80x96)
PASS catalogue.rule_source_dropped: a source id dropped without an outOfScope reason: baseline fixture 0 errors; patched fixture -> 1 SOURCE_DROPPED (objects:fixture_only_id: catalog source id "objects:fixture_only_id" maps to no entry and has no outOfScope reason)
PASS catalogue.rule_variant_has_slot: a variant (derivedFrom set) with a paint slot: baseline fixture 0 errors; patched fixture -> 1 VARIANT_HAS_SLOT (LOWER1_SHARED_EDGE_MEADOW_S-H2_DEFAULT: a variant row owns a paint slot)
PASS catalogue.rule_z_out_of_range: a zMin/zMax outside the geometry range: baseline fixture 0 errors; patched fixture -> 1 Z_OUT_OF_RANGE (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: z 0..40 outside -16..15)
PASS catalogue.rule_coverage: 19 FAIL rules, 26 fixture cases; rules without a case: none
PASS catalogue.live_catalogue_valid: real build: 10089 entries, 0 rule errors
PASS catalogue.scale_chart_vs_registry: 39 registry rows for 39 registry classes; 17 STRIP rows (+ 1 tile label); 0 problems
PASS catalogue.geometry_stratum_sum: stratumPx [19,19,19,19,20] sums to 96 (layerPx 96); geometry errors 0; stratum_invalid_zero rejected, stratum_invalid_sum rejected
PASS catalogue.geometry_stratum_changes_slots: [40,14,14,14,14]: 4/4 slot heights changed (EDGE_MEADOW_S-H2 48->96, WALLFACE_OPENING_H2 48->96, RAMP_MEADOW_N-C2 96->144, RAMPSIDE_MEADOW_E-H2 48->96); [20,19,19,19,19]: 3/3 target heights changed (19->20, 57->58, 124->125)
PASS catalogue.geometry_no_literal_layer_count: 0 lines with a literal 9 or 32 in build_catalogue.js
PASS catalogue.geometry_nine_layers: 9-layer fixture (z -4..4): build OK, 10089 entries, 0 outside z range, 5 bands
PASS catalogue.size_srd: 9 race rows checked against SRD Size traits and 7 px/ft; 6 ft human = 42 px (humanPx 42); 7 frame-class rows; 0 problems
PASS catalogue.size_footprint_frame_separate: 129 creature/character/equipment entries carry footprint (squares) and frameClass (px frame) separately; e.g. ALL_SHARED_CREATURE_GIANT-SPIDER_V1_DEFAULT footprint 2x2 squares, frame 96x48 px; 0 problems
PASS catalogue.size_frame_classes: TINY 8 / LARGE_TALL 6 / LARGE_LONG 6 entries with the right cells; 96x96 Large frames: 0; HUGE/GARGANTUAN null frames without slots; TINY footprint 24x24 in a 48x48 frame: true; 0 problems
PASS catalogue.size_optional_params: defaults OFF: true; TALL_MEDIUM entries default 0, enabled 5 (slots 144x384); readability floor on: GNOME 21/25/28 -> 26/27/28, HALFLING 21/21/21 -> 26/27/28
PASS catalogue.size_character_blocks: 129 character/creature/equipment slots in 3x4-frame blocks (144x192, 144x384, 288x192); RMMZ character sheets not 3x4: 0; 0 problems
PASS catalogue.coverage: WorldCatalog ids 246/246; brief anchor/ui/eq/face ids 36/36; manifest rows 18/18; open AR rows 49/49; addendum family x band cells: 65/65
PASS catalogue.references_hash: 27 references, 26 tracked re-hashed and matching; 1 untracked (UNVERIFIED_ABSENT); entries with unknown references: 0; 0 problems
PASS catalogue.depth_no_colours: 7595 DEPTH_<band> rows: 0 colour values, 0 colour keys; 5 depth palette placeholders, 0 with colours; variant rows with a paint slot: 0
PASS catalogue.no_image_data: image files under art/catalogue, docs/art/catalogue, tools/art/fixtures/catalogue: 0; outputs with embedded image data: 0
PASS catalogue.schema_doc_terrains: 29 terrains used; SCHEMA.md lists 30; missing none; extra none
PASS catalogue.conflicts_required: 19/19 required topics present; conflicts.md 134 lines

46/47 checks passed
EXIT=1
```

### e. `node tools/art/build_catalogue.js --check`

```
WARN UNVERIFIED_ABSENT reference/u7_shapes_0_31.png (untracked third-party reference not present in this checkout)
DIFF art/catalogue/catalogue.json
DIFF art/catalogue/conflicts.md
CHECK: FAILED (2 file(s) differ from a fresh build)
EXIT=1
```

### f. `node tools/check_deus_syntax.js`

```
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

Commands a, b, c, and f exit 0. Commands d and e exit 1. That pair is the pre-existing catalogue pin described under spot checks. This lane's checker gates exit 0.

## Spot checks against REPORT.md

Live `node tools/verify_world_state_registry.js` printed the same counts the report states: 49 rows, 49 states, 207 sheets, 2494 slots; template run 1 exits 2 with 963 refusals; run 2 exits 0 on 187 sheets; 542 slots compared and 542 agree; WSR-01 9 violations; WSR-02 2 exempt; WSR-03 93 gaps; WSR-04 110 gaps; WSR-05 49 violations; WSR-SCHEMA 4 violations; MANIFEST-TEMPLATE 983 gaps; PLACED-IN-SLOT 0; baseline 1248 matched, 0 new, 0 stale; `GATE: OK`. Those gating counts sum to 1248 (9+93+110+49+4+983).

Independent of the checker, the registry markdown has 49 seed rows (a line whose first cell is a STATE_ id), and 9 of them name `CREATURE_ECOLOGY`. The section 2 `system` enum lists `ECOLOGY_WILDLIFE` and does not list `CREATURE_ECOLOGY`. `scrub_dense` is the visual state on both `STATE_SUCC_SCRUB_DENSE` (line 145) and `STATE_REGION_OVERGRAZED` (line 161). The two composed landmark rows are `STATE_LM_WATERFALL_GREAT` and `STATE_LM_GREAT_ARCH` (lines 175-176). The four snow and ice rows are lines 162-165.

`tools/wsr/known_gaps.json` parses to 1248 entries and 0 reasons shorter than 10 characters. Code counts: SHEET_NOT_IN_TEMPLATE 20, TEMPLATE_REFUSED_SHEET_INVALID 15, TEMPLATE_REFUSED_STRATUM_HEIGHT_MISMATCH 948, SYSTEM_NOT_IN_ENUM 9, FAMILY_NOT_IN_CATALOGUE 13, NOT_IN_WORLD_CATALOG 40, NO_CATALOGUE_ENTRY 40, SLOT_NO_STATE 110, PERFORMANCE_CLASS_MISSING 49, COLUMN_MISSING 4. The test line `PASS real_baseline_valid: 1248 entries, every one with a reason` matches.

The committed report's per-class slot table sums to the reported scopes: NATURAL_WORLD 110 (TERRAIN 42, WATER 10, TREE 16, FLORA 22, STONE 12, VEIN 4, REMAINS 4), addendum families 2122, other non-world-state classes 262, total 2494, tracing 0.

Determinism. `node tools/verify_world_state_registry.js --report <temp>/det_a`:

```
WSR: docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md: 49 rows, 49 states; art/catalogue/catalogue.json: 207 sheets, 2494 slots
TEMPLATES: GENERATED (tools/art/make_blank_templates.js); run 1: 207 sheet(s) exit 2, 963 refusal(s); run 2: 187 sheet(s) exit 0; 187 template sheet(s), 542 slot(s) compared, 542 agree
RULE WSR-01: 9 violation(s), 0 gap(s), 0 exempt
RULE WSR-02: 0 violation(s), 0 gap(s), 2 exempt
RULE WSR-03: 0 violation(s), 93 gap(s), 0 exempt
RULE WSR-04: 0 violation(s), 110 gap(s), 0 exempt
RULE WSR-05: 49 violation(s), 0 gap(s), 0 exempt
RULE WSR-SCHEMA: 4 violation(s), 0 gap(s), 0 exempt
RULE MANIFEST-TEMPLATE: 0 violation(s), 983 gap(s), 0 exempt
RULE PLACED-IN-SLOT: 0 violation(s), 0 gap(s), 0 exempt
WROTE wsr_report.json and WSR_REPORT.md
BASELINE tools/wsr/known_gaps.json: 1248 entries, 1248 matched, 0 new, 0 stale
GATE: OK (every violation and gap is baselined; no stale entry)
EXIT=0
```

`node tools/verify_world_state_registry.js --report <temp>/det_b`:

```
WSR: docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md: 49 rows, 49 states; art/catalogue/catalogue.json: 207 sheets, 2494 slots
TEMPLATES: GENERATED (tools/art/make_blank_templates.js); run 1: 207 sheet(s) exit 2, 963 refusal(s); run 2: 187 sheet(s) exit 0; 187 template sheet(s), 542 slot(s) compared, 542 agree
RULE WSR-01: 9 violation(s), 0 gap(s), 0 exempt
RULE WSR-02: 0 violation(s), 0 gap(s), 2 exempt
RULE WSR-03: 0 violation(s), 93 gap(s), 0 exempt
RULE WSR-04: 0 violation(s), 110 gap(s), 0 exempt
RULE WSR-05: 49 violation(s), 0 gap(s), 0 exempt
RULE WSR-SCHEMA: 4 violation(s), 0 gap(s), 0 exempt
RULE MANIFEST-TEMPLATE: 0 violation(s), 983 gap(s), 0 exempt
RULE PLACED-IN-SLOT: 0 violation(s), 0 gap(s), 0 exempt
WROTE wsr_report.json and WSR_REPORT.md
BASELINE tools/wsr/known_gaps.json: 1248 entries, 1248 matched, 0 new, 0 stale
GATE: OK (every violation and gap is baselined; no stale entry)
EXIT=0
```

sha256 of those files and of `tools/wsr/report/` (`DET_HASH_EXIT=0`):

```
WSR_REPORT.md
  committed b83825de407981deef3f0387edf3a2eca576c4c04d1b5144883a37b055c904fc
  run_a     b83825de407981deef3f0387edf3a2eca576c4c04d1b5144883a37b055c904fc
  run_b     b83825de407981deef3f0387edf3a2eca576c4c04d1b5144883a37b055c904fc
  equal=true
wsr_report.json
  committed 3b9cf7ba959e849738ff1d18b80def56a9041abea2312dc953f87a7341a5ba84
  run_a     3b9cf7ba959e849738ff1d18b80def56a9041abea2312dc953f87a7341a5ba84
  run_b     3b9cf7ba959e849738ff1d18b80def56a9041abea2312dc953f87a7341a5ba84
  equal=true
```

`det_a` and `det_b` each exited 0. Those digests are the ones in `tasks/WG.33.01/lane-x/evidence/determinism.txt`. `--check` also exited 0 against the committed report.

Rebuilt catalogue, in memory via `tools/art/build_catalogue.js` `build({root})`, nothing written under `art/` (`REBUILD_DIFF_EXIT=0`):

```
BUILD_OK=true ERRORS=0 WARNINGS=1
art/catalogue/catalogue.json committed_lines=11865 rebuilt_lines=11865 differing_lines=1
  first_diffs=65
art/catalogue/conflicts.md committed_lines=134 rebuilt_lines=134 differing_lines=2
  first_diffs=88,90
```

Catalogue line 65 is the pinned sha256 of `docs/worldgen/DEUS_WORLDGEN_WBS.md`, `50c7dae4fdad6bbf431e4669a16bae77451b987e15e7787a717e2a0c24500f3d`. The file on disk hashes to `c6f4cf11e0f35252e7b1e3afb27637e2099b909d57179115551446cbe1a386ca`. `conflicts.md` lines 88 and 90 are the citations of that WBS at lines 678 and 718. Gating the rebuilt catalogue (written only under `%TEMP%`) against the committed baseline:

```
WSR: docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md: 49 rows, 49 states; rebuilt_catalogue.json: 207 sheets, 2494 slots
TEMPLATES: GENERATED (tools/art/make_blank_templates.js); run 1: 207 sheet(s) exit 2, 963 refusal(s); run 2: 187 sheet(s) exit 0; 187 template sheet(s), 542 slot(s) compared, 542 agree
RULE WSR-01: 9 violation(s), 0 gap(s), 0 exempt
RULE WSR-02: 0 violation(s), 0 gap(s), 2 exempt
RULE WSR-03: 0 violation(s), 93 gap(s), 0 exempt
RULE WSR-04: 0 violation(s), 110 gap(s), 0 exempt
RULE WSR-05: 49 violation(s), 0 gap(s), 0 exempt
RULE WSR-SCHEMA: 4 violation(s), 0 gap(s), 0 exempt
RULE MANIFEST-TEMPLATE: 0 violation(s), 983 gap(s), 0 exempt
RULE PLACED-IN-SLOT: 0 violation(s), 0 gap(s), 0 exempt
BASELINE tools/wsr/known_gaps.json: 1248 entries, 1248 matched, 0 new, 0 stale
GATE: OK (every violation and gap is baselined; no stale entry)
EXIT=0
```

Same 1248 matched, 0 new, 0 stale, exit 0. A rebuild at this base does not change a finding. The checker does not read `sources[]`.

`--strict` on the real repo was not launched as a seventh process. The live gate counted 1248 gating findings, all baselined. The tool returns exit 1 from `--strict` when that count is non-zero. The committed `evidence/worktree/strict_main.txt` in the clone is 1260 lines and ends with:

```
STRICT: FAILED (1248 violation(s) or gap(s); the baseline is ignored)
EXIT=1
```

Placed art: `git ls-files "*placement_report.json"` lists only `tools/wsr/fixtures/clean/placement_report.json`. Both `art/*placement_report.json` and `:(glob)art/**/placement_report.json` list nothing. The test line `DISCOVERED, 0 tracked report(s) under art/` matches. On this Git, `art/*catalogue.json` matches the nested `art/catalogue/catalogue.json`, so the checker's `art/*placement_report.json` pathspec reaches nested paths. There is no tracked placement report under `art/` for it to miss.

DEC-007: the 47-path diff has `IMAGE_EXT=0`, `PNG_MAGIC=0`, `B64_PNG=0`. The one `data:image` substring is the words in `REPORT.md` describing that scan, not an image payload. `git status --porcelain` in the clone after every gate, both report runs, and the rebuilt-catalogue gate printed no lines (`STATUS_EXIT=0`). The blank-template generator writes grid PNGs into a fresh temp folder; the checker deletes that folder. The suite's `gen_temp_folder_removed` passed, and `mutant_temp_folder_kept` was killed because that mutant left `wsr-templates-bo174Y` behind. Nothing was written under `art/`.

## Fixtures and mutants

The suite prints `PASS` when a negative fixture makes the checker fail the way the test requires (exit 1 and the named finding), and `PASS mutant_<name>_killed` when that mutant makes a check throw. It printed no line starting with `FAIL`. `RESULT: 145 passed, 0 failed`.

Seven fixture cases from that output. Each line is the suite recording that the checker rejected the fixture:

```
PASS neg_wsr01_duplicate_state: WSR-01 DUPLICATE_STATE STATE_TEST_BOULDER
PASS neg_wsr02_visual_state_null_family: WSR-02 ASSET_FAMILY_MISSING STATE_TEST_BOULDER
PASS neg_wsr03_visual_state_without_entry: WSR-03 NO_CATALOGUE_ENTRY STATE_TEST_BOULDER
PASS neg_wsr04_natural_slot_without_state: WSR-04 SLOT_NO_STATE ATLAS_ALL_TEST_PROP_01:0003
PASS neg_mt_slot_rect_differs: MANIFEST-TEMPLATE SLOT_RECT_DIFFERS ATLAS_ALL_TEST_PROP_01:0002
PASS neg_placed_region_outside_slot: PLACED-IN-SLOT PLACED_OUTSIDE_SLOT ATLAS_ALL_TEST_PROP_01:0002
PASS neg_wsr05_missing_performance_class: WSR-05 PERFORMANCE_CLASS_MISSING STATE_TEST_SPRING
```

Five mutant kills from that output. The parenthetical text is the assertion that failed against the mutated source:

```
PASS mutant_wsr01_off_killed: by neg_wsr01_duplicate_state (want exit 1 and WSR-01/DUPLICATE_STATE/STATE_TEST_BOULDER; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_baseline_staleness_ignored_killed: by baseline_stale_entry_fails (want exit 1 with one STALE line; got RULE PLACED-IN-SLOT: 0 violation(s), 0 gap(s), 0 exempt / BASELINE known_gaps.json: 1 entry, 0 matched, 0 new, 0 stale / GA)
PASS mutant_slot_ids_only_no_rects_killed: by neg_wsr03_slot_rect_differs_in_template (want exit 1 and WSR-03/SLOT_NOT_IN_TEMPLATE/STATE_TEST_SPRING; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
PASS mutant_strict_uses_baseline_killed: by strict_fails_on_baselined_gap (want exit 1 from --strict; got BASELINE known_gaps.json: 1 entry, 1 matched, 0 new, 0 stale / GATE: OK (every violation and gap is baselined; no stale entry))
PASS mutant_manifest_template_off_killed: by neg_mt_slot_rect_differs (want exit 1 and MANIFEST-TEMPLATE/SLOT_RECT_DIFFERS/ATLAS_ALL_TEST_PROP_01:0002; got exit 0; findings: WSR-02/COMPOSED_EXEMPT/STATE_TEST_ARCH)
```

The same output kills one mutant per rule switched off (`wsr01_off` through `placed_off`, plus `schema_off` and `manifest_template_off`), `baseline_staleness_ignored`, and `slot_ids_only_no_rects`. `PASS mutation_control` says the unmutated source compiled in memory passes all 102 in-process checks. `PASS mutants_left_tool_untouched` and `PASS repo_untouched` passed. 37 `mutant_*_killed` lines, all PASS.

## Findings

BLOCKER: none.

MAJOR: none.

MINOR: none.

Commands d and e exit 1 because `art/catalogue/catalogue.json` still pins the WBS sha `50c7dae4fdad6bbf431e4669a16bae77451b987e15e7787a717e2a0c24500f3d` while the file on disk is `c6f4cf11e0f35252e7b1e3afb27637e2099b909d57179115551446cbe1a386ca`. The in-memory rebuild differs from the committed catalogue at line 65 only, and from `conflicts.md` at lines 88 and 90 only. `git diff` of `art/`, `docs/`, `game/`, and `tools/art/` between the base and this tip is empty, so this lane did not cause that mismatch. It is X-E1 in `escalation.md`. The fix writes `art/` and `docs/`, which are outside this lane. The checker gates on this tip exit 0, and gating the rebuilt catalogue against the committed baseline also exits 0.

VERDICT: CLEAN PASS
