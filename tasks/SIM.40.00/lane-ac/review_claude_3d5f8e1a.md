# SIM.40.00 FIX1 re-review (Claude) of 3d5f8e1aaead9a165864d8123af9257a41474f8b (writer FIX1 tip 899f0679922ecf74e3a976dc59ac09e2e441167d)

Independent re-review of Lane AC (SIM.40.00: material catalogue, mass tables, pure reader) after `review_claude_cfcf7633.md` (FAIL: MAJOR-1 plus 7 MINORs). Writer: grok (`deus-grok`). Reviewer: Claude Opus, not the writer. Authorities: `BRIEF.md`, with `BRIEF_FIX1.md` winning where they differ.

- Reviewed target (merge gate: last non-review commit): `3d5f8e1aaead9a165864d8123af9257a41474f8b` (deus-pm, `lane.json` reviewer -> claude).
- Writer FIX1 tip, parent of the target: `899f0679922ecf74e3a976dc59ac09e2e441167d` (deus-grok).

Every check ran in a fresh temporary clone (`git clone -q -c core.autocrlf=false <worktree> %TEMP%/lane-ac-fix1-UnEbju/c`, then `git checkout -q --detach 3d5f8e1aaead9a165864d8123af9257a41474f8b`; `git rev-parse HEAD` printed `3d5f8e1aaead9a165864d8123af9257a41474f8b`). Code mutants were written to the clone's copy of `game/js/sim/materials.js` and restored byte for byte after each run (`restored byte-identical: true`; clone `git status --short` empty, EXIT=0). The clone was then deleted (`rm -rf` EXIT=0; existence test EXIT=1). Node v24.19.0. In the live worktree the only file written is this one. No art was generated, requested or integrated.

Reviewer probe scripts (outside the repo, not committed): `%TEMP%/lane-ac-review-EzfiWQ/work/` (earlier: `fixtures_probe.js`, `attack_probe.js`, `probe2.js`, `conserve_audit.js`, `ice_demo.js`, `gold_demo.js`; new for FIX1: `fix1_probe.js`, `fix1_mutants.js`, `fix1_extra.js`, `fix1_forms.js`).

## 1. Identity (live worktree, raw)

```
$ git rev-parse HEAD origin/task/lane-ac
3d5f8e1aaead9a165864d8123af9257a41474f8b
3d5f8e1aaead9a165864d8123af9257a41474f8b
EXIT=0
$ git log -8 --format="%H %an %s"
3d5f8e1aaead9a165864d8123af9257a41474f8b deus-pm [pm] SIM.40.00 lane-ac: lane.json reviewer -> claude for the FIX1 review of 899f0679 (Owner 11:24 CT: spend Claude's last ~2% on one Opus-high review; Gemini Pro out of quota)
899f0679922ecf74e3a976dc59ac09e2e441167d deus-grok [grok] SIM.40.00 book the water family in du and close the Claude review findings
3d727c146e2d22a598051731b59b4f7e11a6b87b deus-pm [ops] SIM.40.00 lane-ac launch prompt 20260926_105753 (writer grok)
32a1edd1839fb86ad711294bd5288950b7f57ad1 snewt [pm] SIM.40.00 lane-ac: BRIEF_FIX1.md (Claude review FAIL at cfcf7633: MAJOR-1 water family in du + 7 MINORs) and lane.json reviewer -> gemini (Owner crossload ruling 10:19 CT)
22dd1a5c9f12748efb45c83fa207d2c4f7d18c0d deus-claude [claude] SIM.40.00 review cfcf7633
cfcf7633ab9a80d9507227e942d179c312957cae deus-grok [grok] SIM.40.00 record gate output in the lane report
ddbc3b8d2a542d8014373bc2c577aa2eeb70aeb1 deus-grok [grok] SIM.40.00 material catalogue, mass tables, and reader
27ef76773ce86e9367f6ecbce4ed55fb21266170 snewt [pm] Open lane-ac (SIM.40.00): BRIEF.md and lane.json
EXIT=0
$ git show --stat 3d5f8e1a
commit 3d5f8e1aaead9a165864d8123af9257a41474f8b
Author: deus-pm <deus-pm@local>
Date:   Sat Sep 26 11:35:27 2026 -0500

    [pm] SIM.40.00 lane-ac: lane.json reviewer -> claude for the FIX1 review of 899f0679 (Owner 11:24 CT: spend Claude's last ~2% on one Opus-high review; Gemini Pro out of quota)

 tasks/SIM.40.00/lane-ac/lane.json | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
EXIT=0
```

HEAD is `3d5f8e1aaead9a165864d8123af9257a41474f8b` and its parent is `899f0679922ecf74e3a976dc59ac09e2e441167d`, as required. The PM commit touches only `tasks/SIM.40.00/lane-ac/lane.json`.

## 2. Scope

```
$ git merge-base origin/main 3d5f8e1a
092c0181949c8cb2568d86546e7e03132445df9c
EXIT=0
$ git diff --name-status 092c0181949c8cb2568d86546e7e03132445df9c 3d5f8e1a
A	docs/systems/DEUS_Materials.md
A	game/data/sim/README.md
A	game/data/sim/interactions.json
A	game/data/sim/mass_tables.json
A	game/data/sim/materials.json
A	game/js/sim/materials.js
A	tasks/SIM.40.00/lane-ac/BRIEF.md
A	tasks/SIM.40.00/lane-ac/BRIEF_FIX1.md
A	tasks/SIM.40.00/lane-ac/REPORT.md
A	tasks/SIM.40.00/lane-ac/lane.json
A	tasks/SIM.40.00/lane-ac/launches/20260926_105753_prompt.txt
A	tasks/SIM.40.00/lane-ac/review_claude_cfcf7633.md
A	tools/sim/fixtures/materials/bad_alloy.json
[... 53 further "A	tools/sim/fixtures/materials/bad_*.json" lines, 54 fixtures in all ...]
A	tools/sim/test_materials.js
EXIT=0
```

| Path | Files | Status | allowedPaths entry (`lane.json`) | In scope |
|---|---|---|---|---|
| `docs/systems/DEUS_Materials.md` | 1 | A | `docs/systems/DEUS_Materials.md` | yes |
| `game/data/sim/README.md`, `interactions.json`, `mass_tables.json`, `materials.json` | 4 | A | `game/data/sim/**` | yes |
| `game/js/sim/materials.js` | 1 | A | `game/js/sim/materials.js` | yes |
| `tasks/SIM.40.00/lane-ac/` BRIEF, BRIEF_FIX1, REPORT, lane.json, launch prompt, earlier review | 6 | A | `tasks/SIM.40.00/**` | yes |
| `tools/sim/fixtures/materials/bad_*.json` | 54 | A | `tools/sim/fixtures/materials/**` | yes |
| `tools/sim/test_materials.js` | 1 | A | `tools/sim/test_materials.js` | yes |
| **Total** | **67** | all A | | 67 of 67 |

FIX1 delta (`git diff --name-status cfcf7633 899f0679`, EXIT=0): M `docs/systems/DEUS_Materials.md`, `game/data/sim/README.md`, `mass_tables.json`, `materials.json`, `game/js/sim/materials.js`, `REPORT.md`, `lane.json` (the PM commit 32a1edd1), `tools/sim/test_materials.js`; A `BRIEF_FIX1.md`, the launch prompt `20260926_105753_prompt.txt`, `review_claude_cfcf7633.md` (PM, ops and review commits), and 28 new fixtures (`bad_alloy_multiple`, `bad_ash_class`, `bad_bulk`, `bad_class_by_element`, `bad_decay_key`, `bad_decay_ore`, `bad_duplicate_strata`, `bad_erode_ore`, `bad_extra_item`, `bad_item_class`, `bad_item_count`, `bad_item_type`, `bad_lava_ratio`, `bad_line_class`, `bad_mass_zero`, `bad_massless_amount`, `bad_mu_ref`, `bad_mu_scale`, `bad_null_mass`, `bad_path`, `bad_posting_form`, `bad_rust_ore`, `bad_species`, `bad_status_open`, `bad_status_word`, `bad_unit_mineral`, `bad_unit_record`, `bad_unit_water`). `interactions.json` is unchanged by FIX1.

Forbidden paths: `git diff --name-only 092c0181949c8cb2568d86546e7e03132445df9c 3d5f8e1a -- game/js/plugins game/js/plugins.js game/js/sim/ledger.js game/js/sim/ledger_defaults.js tools/sim/test_ledger.js docs/STATUS.md docs/VISION.md docs/OWNER_DECISIONS.md '*WBS*' art game/img` printed nothing, EXIT=0. No plugin, no ledger file, no STATUS, no WBS, and no tool outside the two allowed tool paths.

## 3. Gate (`lane.json` gateTests, run in the clone at 3d5f8e1a, foreground)

| Command | RESULT line | EXIT |
|---|---|---|
| `node tools/sim/test_materials.js` | `RESULT: 107 passed, 0 failed` | `EXIT=0` |
| `node tools/sim/test_ledger.js` | `RESULT: 117 passed, 0 failed` (`mutants: 42; run time 11886 ms`) | `EXIT=0` |
| `node tools/check_deus_syntax.js` | `Checked 52 DEUS plugin files. Errors: 0` | `EXIT=0` |

Raw lines from the `test_materials.js` run (the thaw check `BRIEF_FIX1` item 4 asks for):

```
iceDu from massOf = 1
water family after fluid 7 = 7
water family after one ice slice = 8
after thaw water/fluid = 8 water/ice = 0 water family = 8
family ag = 0
family au = 0
family cu = 0
family fe = 0
family gem = 0
family mineral = 0
family organic = 0
family pt = 0
family water = 8
balanced = true
PASS water_thaw_du
PASS yield_lists_post
RESULT: 107 passed, 0 failed
```

`test_ledger.js` is still at its base count of 117.

## 4. Findings closure (review_claude_cfcf7633)

| Finding | State | Evidence at 899f0679 |
|---|---|---|
| MAJOR-1 water family in du | **CLOSED** | `ice`: `ledger.unit` `du` (`materials.json:2673`), `ledgerForm` `ice` (`:2675`), `massPerSlice` 1 (`:2678`), `duPerSlice` 1 (`:2680`), yield and collapse postings `"du": 1` (`:2729`, `:2742`), support load kept apart as `supportLoadKgPerSlice` 1011 / `supportLoadMuPerSlice` 1011000 (`:2758`, `:2761`) with "Not a ledger posting" (`:2763`). `lava` `ledger.unit` `mu` (`:2276`). Validator: posting unit must equal family unit (`materials.js:353-359`, `E_UNIT`), record `ledger.unit` must equal it (`:478`), item rows too (`:597`); `familyUnit` reads `ledger_defaults` families (`:219-234`). Reviewer census: 2 water-family postings in both tables (ice yield and collapse, both `{"du":1}`), 0 water postings with mu, 0 non-water postings with du. `massOf("ice","strata",1)` = 1. Earlier demo `ice_demo.js` now prints `after thawing ONE ice slice: water/fluid = 8 du, water/ice = 0, water family total = 8 du`; gate check `water_thaw_du` (`test_materials.js:309`) shows 7 -> 8 and every family balanced. Recorded as `D-WATER-DU` (`REPORT.md:87`, `:386-398`; `materials.json:144`). Negative fixtures `bad_unit_water`, `bad_unit_mineral`, `bad_unit_record` fail with `E_UNIT`; mutants F01, F02, F03, F04 killed (section 5). |
| MINOR-1 test strength | **PARTLY** | Every earlier survivor re-aimed at the FIX1 code is killed except the item-branch overflow guard: K04-K16, K20-K26, K29 killed (section 5.2); P-LAYERS killed by `mutant_layer_product_killed` / `mutant_layer_160_killed` (`purity()` at `test_materials.js:88-95` now matches `32 * 5` and `160`); K20 killed by `determinism_checksum` (`:136`). **K19 as defined in the earlier review (the `massOf` item overflow guard) still survives** (F16): REPORT maps K19 to the slice/object/ruin overflow checks, which do not exercise the item branch. New FIX1 rules also lack killing tests: see N2. |
| MINOR-2 status handling | **CLOSED** | `statusOk` descends into arrays and checks every `status` / `*Status` key (`materials.js:237-251`); interactions are walked too (`:254`). Probes A1-A6 from the earlier review are now all rejected with `E_STATUS` / `E_OWNER_OPEN`. `OWNER_OPEN` enforced for water and strata ids 38-47 (`:458-460`; probes B12, B13 rejected; fixture `bad_status_open`). Relabel: all 85 massful object rows have `massStatus` `PM_DEFAULT_UNCONFIRMED`; 61 item rows carry that word. Census recomputed by the reviewer over every key ending in `status`: `{"PM_DEFAULT_UNCONFIRMED":200,"PM_DEFAULT":351,"OWNER_OPEN":37,"SOURCED":43,"PLACEHOLDER":92}`, equal to `REPORT.md:42-48`. (The validator does not require `PM_DEFAULT_UNCONFIRMED` on mu-scaled masses: probe B15, relabelling `wall_stone` to `PM_DEFAULT`, is accepted. BRIEF_FIX1 asks for the relabel, not for that rule, so this is not a finding.) |
| MINOR-3 reader | **PARTLY** | Overflow guarded on every branch: `massOf(granite,strata,2^52)` and `(wall_stone,object,2^52)` now throw `E_AMOUNT` (earlier R1, R2); `sliceOf` guard `materials.js:91-98`, object guard `:123`. `massOf("iron","strata",1)` and `massOf(51,"strata",1)` throw `E_FORM`; zero `massPerSlice` fails with `E_MASS` (`:457`; P1 and B22 rejected; fixture `bad_mass_zero`). **Still open:** the object/ruin branch falls back to any material's slice mass without a form check (N1). |
| MINOR-4 untyped item remainders | **CLOSED** | Reviewer count: 21 item-form postings name no item type. 19 are `bulk: true` identity item->item reference voxels (enforced at `materials.js:377-381`), and 2 are `gap: "D-AU-ORE-ITEM"` (`gold_outcrop` yield and collapse `mine`, recorded at `REPORT.md:74`, `:112`, `:415`). `E_ITEM_TYPE` rule killed by fixture `bad_item_type` (F11); probes B18 and B19 rejected. Strata id 51: `strataForm.bookable false` with a gap string is required (`:479-482`); `D-BONE-FORM` recorded; `massOf(bone,"strata",1)` throws `E_FORM`. |
| MINOR-5 `gold_outcrop` | **CLOSED** | Posting order is `mine` au_ore object->item 100 (`mass_tables.json:5196-5204`), then `smelt` 100 (`:5208-5213`). `gold_demo.js` against the real ledger: `ok mine ...`, `ok smelt ...`. Gate check `yield_lists_post` (`test_materials.js:385`) posts every material and object yield list in order on the real ledger. The reviewer also posted every collapse list: `collapse lists posted: 141, failed 0`. Validator order check: B16 (mine removed) and B17 (mine and smelt swapped) rejected. |
| MINOR-6 validator shape | **CLOSED** | `reclaim.path` steps checked against ledger rows (`reclaimStepOk`, `materials.js:409-430`; `E_PATH` at `:549-554`; fixture `bad_path`; probes A16, B20, B21 rejected). `ledger.unit` checked (MAJOR-1). `masses.muRef` must equal `mu.id` (`:256`; fixture `bad_mu_ref`; A23 rejected). `statusNote` moved to `catalogue.decayStatusNote` (`materials.json:6687`), and a decay class must be an object (`:489`; fixture `bad_decay_key`). Mutants F03, F08, F09, F10, F23 killed. |
| MINOR-7 Owner question 1 | **CLOSED** | `REPORT.md:93` adds the headroom trade-off with the WG.65.15 Q2 and SIM.40.01 §9.7 citations and the 4.3 × 10^13 mu / about 209 areas figures, and ends "No option is selected." |

### Open Owner values stay open

- mu: `materials.json:4-7` `"id": "MU_SIZE"`, `"confirmed": false`, status `PM_DEFAULT_UNCONFIRMED` (`describe()`: `{"id":"MU_SIZE","proposal":"1 mu = 1 g","proposalMuPerKg":1000,"confirmed":false,"status":"PM_DEFAULT_UNCONFIRMED"}`). Probes B10 (`confirmed=true`) and B11 (status `SOURCED`) are rejected with `E_MU_STATUS`. REPORT question 1 selects no option.
- Calendar: `materials.json:23-26` `{"status": "OWNER_OPEN", "ref": "D-1"}`, no `dpy` or `tickHz`. Probe B9 (`dpy=360`) is rejected with `E_OWNER_OPEN`. REPORT question 2 selects no option.
- Safe-integer headroom: represented under question 1 and not decided (MINOR-7).
- `au_ore` catalogue item: still a gap (`D-AU-ORE-ITEM`, `PROPOSED-AC-10`). No item type was invented. The two mine postings carry `gap` instead.
- Water per slice null and `OWNER_OPEN`; strata ids 38-47 null and `OWNER_OPEN`; the water family's du unit is recorded as a PM ruling (BRIEF_FIX1), not as an Owner decision.

## 5. Negative fixtures and mutants

### 5.1 Fixtures (reviewer applies each to fresh clean data; full error list)

`fixtures_probe.js`: `clean errors: []`, and **54 of 54** print `FAILS-AS-CLAIMED`. Sample (raw):

```
FAILS-AS-CLAIMED bad_unit_water.json expect=E_UNIT n=3 :: ["E_FAMILY_MASS: materials.ice yield water","E_UNIT: materials.ice yield water","E_YIELD_MASS: materials.ice yield"]
FAILS-AS-CLAIMED bad_unit_mineral.json expect=E_UNIT n=1 :: ["E_UNIT: materials.granite yield stone"]
FAILS-AS-CLAIMED bad_unit_record.json expect=E_UNIT n=1 :: ["E_UNIT: materials.granite ledger.unit"]
FAILS-AS-CLAIMED bad_status_open.json expect=E_OWNER_OPEN n=1 :: ["E_OWNER_OPEN: materials.water mass"]
FAILS-AS-CLAIMED bad_status_word.json expect=E_STATUS n=1 :: ["E_STATUS: catalogue.materials[1].massStatus"]
FAILS-AS-CLAIMED bad_path.json expect=E_PATH n=1 :: ["E_PATH: materials.granite transmute:stone->gold"]
FAILS-AS-CLAIMED bad_decay_ore.json expect=E_ORE_OUTPUT n=1 :: ["E_ORE_OUTPUT: materials.granite decay"]
FAILS-AS-CLAIMED bad_rust_ore.json expect=E_ORE_OUTPUT n=2 :: ["E_METAL_RECLAIM: rust fe_metal","E_ORE_OUTPUT: rust fe_ore"]
FAILS-AS-CLAIMED bad_mass_zero.json expect=E_MASS n=4 :: ["E_COLLAPSE_MASS: materials.granite collapse","E_MASS: materials.granite","E_MU_SCALE: materials.granite","E_YIELD_MASS: materials.granite yield"]
FAILS-AS-CLAIMED bad_item_type.json expect=E_ITEM_TYPE n=2 :: ["E_ITEM_TYPE: materials.granite yield stone","E_YIELD_MASS: materials.granite yield"]
EXIT=0
```

### 5.2 Code mutants on `game/js/sim/materials.js` (`fix1_mutants.js`, 48 mutants, one exact snippet each, restored after each)

```
baseline: exit 0 RESULT: 107 passed, 0 failed
KILLED   F01 E_UNIT posting du-branch off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_unit_water
KILLED   F02 E_UNIT posting mu-branch off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_unit_mineral
KILLED   F03 E_UNIT record ledger.unit off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_unit_record
KILLED   F04 familyUnit always mu | exit 1 | RESULT: 106 passed, 1 failed | FAIL clean_validate
KILLED   F05 statusOk *Status suffix off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_status_word
KILLED   F06 statusOk array descent off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_status_word
KILLED   F07 OWNER_OPEN mass rule off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_status_open
KILLED   F08 muRef check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_mu_ref
KILLED   F09 E_PATH off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_path
KILLED   F10 reclaimStepOk always true | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_path
KILLED   F11 E_ITEM_TYPE off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_item_type
SURVIVED F12 massOf form!=ledgerForm E_FORM off | exit 0 | RESULT: 107 passed, 0 failed
KILLED   F13 sliceReadable always true | exit 1 | RESULT: 105 passed, 2 failed | FAIL massof_rejects_iron_strata, FAIL massof_rejects_bone_strata
KILLED   F14 sliceOf overflow off | exit 1 | RESULT: 106 passed, 1 failed | FAIL massof_slice_overflow
KILLED   F15 object/ruin overflow off | exit 1 | RESULT: 105 passed, 2 failed | FAIL massof_object_overflow, FAIL massof_ruin_overflow
SURVIVED F16 item overflow off | exit 0 | RESULT: 107 passed, 0 failed
KILLED   F17 massPerSlice<1 check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_mass_zero
SURVIVED F18 ordered-holdings (applied) check off | exit 0 | RESULT: 107 passed, 0 failed
KILLED   F19 covered-sum check off | exit 1 | RESULT: 103 passed, 4 failed | FAIL fixture_bad_collapse, FAIL fixture_bad_yield, FAIL mutant_yield_short, FAIL mutant_collapse_short
SURVIVED F20 famEqual(taken) off | exit 0 | RESULT: 107 passed, 0 failed
SURVIVED F21 famEqual(holdings) off | exit 0 | RESULT: 107 passed, 0 failed
SURVIVED F22 supportLoad scale check off | exit 0 | RESULT: 107 passed, 0 failed
KILLED   F23 decayClasses isObj reverted to key test | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_decay_key
SURVIVED F24 object line form E_FORM off | exit 0 | RESULT: 107 passed, 0 failed
SURVIVED F25 material strata-form E_FORM off | exit 0 | RESULT: 107 passed, 0 failed
SURVIVED F26 item row unit check off | exit 0 | RESULT: 107 passed, 0 failed
SURVIVED F27 checkItemCounts du/mu read reverted to mu | exit 0 | RESULT: 107 passed, 0 failed
KILLED   K04 status-word check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_status_word
KILLED   K05 posting form check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_posting_form
KILLED   K06 kg*perKg scale check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_mu_scale
KILLED   K07 decay output ore check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_decay_ore
KILLED   K08 combustion ash class check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_ash_class
KILLED   K09 rust-row ore check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_rust_ore
KILLED   K10 erode-row ore check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_erode_ore
KILLED   K11 alloy multiple check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_alloy_multiple
KILLED   K12 item count x mass check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_item_count
KILLED   K13 open-mass status check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_null_mass
KILLED   K14 bulk lineage check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_bulk
KILLED   K15 lava solidify check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_lava_ratio
KILLED   K16 species scale check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_species
KILLED   K20 checksum constant | exit 1 | RESULT: 106 passed, 1 failed | FAIL determinism_checksum
KILLED   K21 classByElement ore check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_class_by_element
KILLED   K22 item class check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_item_class
KILLED   K23 object line class check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_line_class
KILLED   K24 coverage item-extras check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_extra_item
KILLED   K25 material massless check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_massless_amount
KILLED   K26 duplicate-strata check off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_duplicate_strata
KILLED   K29 reclaimTarget ignores strata id | exit 1 | RESULT: 106 passed, 1 failed | FAIL reclaim_by_strata_id
killed 38, survived 10, skipped 0
restored byte-identical: true
EXIT=0
```

F20 and F21 are a redundant pair. Disabling both (`fix1_extra.js`) is killed: `KILLED F20+F21 both family-equality calls off | exit 1 | RESULT: 106 passed, 1 failed | FAIL fixture_bad_family_mass`. The family-equality rule is therefore tested. The other eight survivors are listed in N2.

### 5.3 Data and reader probes (`fix1_probe.js`, `fix1_forms.js`; clean data plus one change)

```
clean :: []
REJECTED B1 ice massPerSlice back to 1011000 (du postings unchanged) :: ["E_COLLAPSE_MASS: materials.ice collapse","E_FAMILY_MASS: materials.ice collapse water","E_FAMILY_MASS: materials.ice yield water","E_YIELD_MASS: materials.ice yield"]
REJECTED B2 ice yield posting du:1 -> mu:1 :: ["E_FAMILY_MASS: materials.ice yield water","E_UNIT: materials.ice yield water","E_YIELD_MASS: materials.ice yield"]
REJECTED B3 ice supportLoadMuPerSlice 1011001 :: ["E_MU_SCALE: materials.ice supportLoad"]
ACCEPTED B4 ice supportLoad fields deleted :: []
REJECTED B6 ice ledger.unit mu :: ["E_UNIT: materials.ice ledger.unit"]
REJECTED B7 lava ledger.unit du :: ["E_UNIT: materials.lava ledger.unit"]
REJECTED B8 granite yield posting carries both mu and du :: ["E_UNIT: materials.granite yield stone"]
REJECTED B16 gold_outcrop yield: remove mine step (smelt first) :: ["E_FAMILY_MASS: objects.gold_outcrop yield au","E_YIELD_MASS: objects.gold_outcrop yield"]
REJECTED B17 gold_outcrop yield: swap mine and smelt order :: ["E_YIELD_MASS: objects.gold_outcrop yield"]
R4 massOf(ice,strata,1) -> 1
R6 massOf(ice,fluid,1) -> threw E_FORM
R8 massOf(granite,ice,1) -> threw E_FORM
R10 massOf(iron,strata,1) -> threw E_FORM
R12 massOf(51,strata,1) -> threw E_FORM
R13 massOf(granite,strata,2^53-1) -> threw E_AMOUNT
water-family postings: 2 :: mat ice yield identity {"du":1} | mat ice collapse identity {"du":1}
water postings with mu: 0; non-water postings with du: 0
collapse lists posted: 141, failed 0
water forms=["fluid","ice","item","creature"]
fe_metal forms=["item","object","ruin"]
biomass forms=["item","object","creature"]
massOf(ice,object,1) -> 1
massOf(ice,ruin,1) -> 1
massOf(iron,item,1) -> null
massOf(iron,object,1) -> 11143000
massOf(bone,ruin,1) -> 2690000
```

Conservation: the validator now treats a posting list as an ordered script. Amounts taken from the original source must sum to the source mass (`covered`), each step must be covered by current holdings (`applied`), and families must match both on the amounts taken and on the final holdings (`materials.js:330-389`). The gate posts every yield list on the real ledger, and the reviewer posted every collapse list (141, 0 failed). My earlier `conserve_audit.js` summed each posting as a parallel split in `mu`, so it now reports 8 artefact "problems" (the du postings of ice, and `gold_outcrop` counted twice across mine and smelt). Those are limits of the old probe, not data defects; the ledger postings above are the authority. The kilogram rule is unchanged for non-water families (`E_MU_SCALE` skipped only for du classes, `:461`; fixture `bad_mu_scale`, K06 killed).

## 6. DEC-007

The diff from the merge-base contains no image or audio path (`git diff --name-only ... | grep -iE '\.(png|jpe?g|gif|webp|ogg|m4a|wav|psd)$'` EXIT=1). Nothing under `art/` or `game/img/` changed (forbidden-path diff empty). No image generator is named in the FIX1 delta. No art was generated, requested or integrated, by the writer or by this review.

## 7. New findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

**N1. `massOf` object/ruin branch skips the form check that FIX1 added for slices** (`game/js/sim/materials.js:118-129`). When no object row matches, the branch returns any material's slice mass whatever the class's ledger forms. So `massOf("ice","object",1)` and `massOf("ice","ruin",1)` return 1 (du), although class `water` has no object or ruin form. `massOf("bone","ruin",1)` returns 2,690,000, although `biomass` has no ruin form. Meanwhile `massOf("iron","item",1)` returns null, although iron's `ledgerForm` is `item`: the item branch looks only at `masses.items`. The one non-throwing way to read a metal reference voxel is therefore `form: "object"`. BRIEF_FIX1 MINOR-3 asks that a form the material does not have be rejected. The slice branch does that, but this branch does not. No caller is wired yet (SIM.40.11 will be the first), so the impact is latent. Fix: in the fallback, require that `form` is one of `formsOf(m.ledger.class)`, and let `form === m.ledgerForm` read the slice for `item`.

**N2. Eight FIX1 rules have no killing test** (mutants in section 5.2, all `RESULT: 107 passed, 0 failed`, exit 0). F16 is the `massOf` item overflow guard, which is exactly K19 of the earlier review: `REPORT.md` credits K19 to the slice/object/ruin overflow checks, which never reach the item branch. F12 is the `massOf` form-vs-`ledgerForm` `E_FORM`. F18 is the ordered-holdings check: probe B17, which swaps mine and smelt, is rejected only by this check, and no fixture covers it. F22 is the `supportLoad` scale check (probe B3 shows the rule works). F24 is the object-line `E_FORM`. F25 is the material strata-form `E_FORM` (the bone rule). F26 is the item-row `E_UNIT`. F27 is the du-aware item count. Each rule works when probed, but deleting it goes unnoticed, and the BRIEF's "at least one mutant per rule killed" still applies. This is why MINOR-1 is PARTLY.

**N3. The support-load fields are optional in the validator.** Deleting `supportLoadKgPerSlice` and `supportLoadMuPerSlice` from `ice` is accepted (probe B4). The check at `materials.js:462-464` runs only when either field is present. BRIEF_FIX1 item 1 says to keep the 1,011 kg load as a separate field. The data does this (`materials.json:2758`, `:2761`), but nothing stops it from being dropped. SIM.40.01 reads the load from here, so a water-family material with a strata-like slice would need both fields.

## 8. Not checked

- The NW.js harness (`tools/run_tests.js`) was not run; the BRIEF excludes it.
- The SIM.40.01 §8.3 blast per-mille values were not compared with the design (`interactions.json` is unchanged since the earlier review).
- The 87 object rows and 61 item rows were not read by eye. They were checked mechanically: the validator, the real-ledger posting of every yield and collapse list, and the status census.
- ledger_defaults' family units were read through `require` in the probes, and `LEDGER_API.md` and SIM.40.01 were not reopened for this re-review. The earlier review cites the lines.
- `DEUS_Materials.md` was spot-read only (lines 31, 39, 51, 76, 99-109, 129-157), not read in full.

## 9. Result

MAJOR-1 is closed. The water family is booked in du, the unit check exists and is killed by mutation, and the thaw demo on the real ledger goes from 7 to 8 du with every family balanced. MINOR-2 and MINOR-4 to MINOR-7 are closed. MINOR-1 and MINOR-3 are partly closed. The remaining gaps are N1 (object/ruin form fallback), N2 (eight untested FIX1 rules, including the original K19) and N3 (optional support-load fields). Result: 0 BLOCKER, 0 MAJOR, 3 MINOR. The scope is 67 of 67 inside allowedPaths, all three gates exit 0, the Owner values stay open, and no art was added.

VERDICT: PASS
