# SIM.60.05 Lane AB: Independent Review of b1a612e8 (Gemini FIX1 Re-Review)

- Reviewer: gemini (Gemini 3.8 Flash fallback model under FALLBACK-MODEL RULES)
- Writer: grok
- Date: 2026-09-26
- Reviewed commit tip (FIX1 FINAL SHA): `b1a612e83e822804a2bdcce1db5932cfea3dd8c3` on `task/lane-ab`
- Base: `092c0181949c8cb2568d86546e7e03132445df9c`
- Prior review: `b8d399320a60b198c96582c993dd1f40a4f6b20e`, file `tasks/SIM.60.05/lane-ab/review_claude_1057a448.md` (VERDICT: FAIL at commit 1057a448)
- Compliance: No art generated, requested, or integrated (DEC-007). No production code or documentation modified by reviewer.

---

## 1. Tip Confirmation (Live Worktree, Raw Output)

```
$ git rev-parse HEAD origin/task/lane-ab
b1a612e83e822804a2bdcce1db5932cfea3dd8c3
b1a612e83e822804a2bdcce1db5932cfea3dd8c3
EXIT=0

$ git log -12 --format="%H %an %s"
b1a612e83e822804a2bdcce1db5932cfea3dd8c3 deus-grok [grok] SIM.60.05 FIX1 SRD hit points, species map, printed saves
8736c6ca09a9a0c2564dfcedd9a087593010e67d deus-pm [ops] SIM.60.05 lane-ab launch prompt 20260926_105756 (writer grok)
26fdfbd9dc472e185e9a19dbaabe77717b6ed0ce snewt [pm] SIM.60.05 lane-ab: BRIEF_FIX1.md (Claude review FAIL at 1057a448: 5 MAJOR + 9 MINOR; SRD 5.1 authority, V64 retired per DEC-027) and lane.json reviewer -> gemini (Owner crossload ruling 10:19 CT)
b8d399320a60b198c96582c993dd1f40a4f6b20e deus-claude [claude] SIM.60.05 review 1057a448: independent review of the SRD 5.1 rules engine
1057a4487f1f4a362d5af4da1a1aa10e0f927af1 deus-grok [grok] SIM.60.05 SRD 5.1 rules engine
819ef62d93027f221c8e8c24245679d164d500be snewt [pm] Open lane-ab (SIM.60.05): BRIEF.md and lane.json
092c0181949c8cb2568d86546e7e03132445df9c snewt [gemini] Record Lane X completion and WBS WG.33.01 DONE
176bffe42ad80725e7c497793e3edad7fe2cb9dc snewt Merge task/lane-x: WG.33.01 world-state registry integrity checker (PM manual merge; merge_gate TEST_FAILED on pre-existing main catalogue pin: test_catalogue 46/47 and build_catalogue --check also fail on main fb5391fa; Grok VERDICT CLEAN PASS at b07087d5; review 85ffe5e7)
85ffe5e75e422ef20fc40f08196daca9b1aa733c deus-grok [grok] WG.33.01 review b07087d5
fb5391fa64992359487b7eb7988b2f0c288adc9d snewt [gemini] Record DEC-023..028 and WBS Rev 26 (SIM.40.00/.11, SIM.50.11-.13, SIM.60.05/.06, SIM.10.05)
5a68fd5ab8b3ce4aaf20d8d778cdac434335447c snewt Merge task/lane-v at 3e12866cdd55636f0b704a3de4c96e3d43bbe8d2 (SIM.60.02 lane-v) via merge_gate
b07087d5a043bda344cdb9790269e6a4458b78ad deus-claude [claude] WG.33.01 REPORT.md: record the report commit and the scope check
EXIT=0
```

HEAD is `b1a612e83e822804a2bdcce1db5932cfea3dd8c3`, matching `origin/task/lane-ab`.

---

## 2. Scope Verification

Merge base:
`git merge-base origin/main b1a612e83e822804a2bdcce1db5932cfea3dd8c3` -> `092c0181949c8cb2568d86546e7e03132445df9c`

### Total Branch Scope vs `origin/main` merge base:
`git diff --name-status 092c0181949c8cb2568d86546e7e03132445df9c b1a612e83e822804a2bdcce1db5932cfea3dd8c3`

| Status | Path | Matching allowedPaths pattern | Within Scope |
|---|---|---|---|
| A | docs/systems/DEUS_Rules.md | `docs/systems/DEUS_Rules.md` | YES |
| M | docs/systems/UF_Combat.md | `docs/systems/UF_Combat.md` | YES |
| M | game/js/plugins/DEUS_Combat.js | `game/js/plugins/DEUS_Combat.js` | YES |
| A | game/js/sim/rules/dice.js | `game/js/sim/rules/**` | YES |
| A | game/js/sim/rules/rules.js | `game/js/sim/rules/**` | YES |
| A | game/js/sim/rules/species_map.js | `game/js/sim/rules/**` | YES |
| A | game/js/sim/rules/srd_index.js | `game/js/sim/rules/**` | YES |
| A | tasks/SIM.60.05/lane-ab/BRIEF.md | `tasks/SIM.60.05/**` | YES |
| A | tasks/SIM.60.05/lane-ab/BRIEF_FIX1.md | `tasks/SIM.60.05/**` | YES |
| A | tasks/SIM.60.05/lane-ab/REPORT.md | `tasks/SIM.60.05/**` | YES |
| A | tasks/SIM.60.05/lane-ab/lane.json | `tasks/SIM.60.05/**` | YES |
| A | tasks/SIM.60.05/lane-ab/launches/20260926_105756_prompt.txt | `tasks/SIM.60.05/**` | YES |
| A | tasks/SIM.60.05/lane-ab/review_claude_1057a448.md | `tasks/SIM.60.05/**` | YES |
| A | tools/rules/bind.js | `tools/rules/**` | YES |
| A | tools/rules/test_srd_rules.js | `tools/rules/**` | YES |
| M | tools/test_d20_equipment_slots.js | `tools/test_d20_equipment_slots.js` | YES |
| M | tools/test_srd_combat_proof.js | `tools/test_srd_combat_proof.js` | YES |
| M | tools/test_srd_equipment_proof.js | `tools/test_srd_equipment_proof.js` | YES |
| M | tools/test_srd_rules_proof.js | `tools/test_srd_rules_proof.js` | YES |

Every path is inside `allowedPaths` declared in `lane.json`.

### FIX1 Delta (`git diff --name-status 1057a448 b1a612e8`):
```
M	docs/systems/DEUS_Rules.md
M	docs/systems/UF_Combat.md
M	game/js/plugins/DEUS_Combat.js
M	game/js/sim/rules/rules.js
A	game/js/sim/rules/species_map.js
M	game/js/sim/rules/srd_index.js
A	tasks/SIM.60.05/lane-ab/BRIEF_FIX1.md
M	tasks/SIM.60.05/lane-ab/REPORT.md
M	tasks/SIM.60.05/lane-ab/lane.json
A	tasks/SIM.60.05/lane-ab/launches/20260926_105756_prompt.txt
A	tasks/SIM.60.05/lane-ab/review_claude_1057a448.md
M	tools/rules/test_srd_rules.js
M	tools/test_d20_equipment_slots.js
M	tools/test_srd_combat_proof.js
```
The writer's FIX1 commit `b1a612e8` touched only the 10 lane files required for the FIX1 remediation.

### Forbidden Paths Check:
`git diff --name-only 092c0181949c8cb2568d86546e7e03132445df9c b1a612e83e822804a2bdcce1db5932cfea3dd8c3 -- docs/STATUS.md docs/OWNER_DECISIONS.md docs/VISION.md game/data art game/js/plugins.js docs/adr docs/audits tools/ops tools/governance tools/sim tools/run_tests.js tools/bench_render_layers.js ':(glob)**/*WBS*'`
Output: `(empty)` (EXIT=0).
No edits to `docs/STATUS.md`, WBS files, `docs/OWNER_DECISIONS.md`, `game/data/**`, `art/**`, or unlisted tools.
DEC-007 compliant: 0 art assets generated, requested, or modified.

---

## 3. Gate Tests (Executed in Fresh Isolated Clone)

Clone created with `git clone -c core.autocrlf=false C:/Users/snewt/.deus_worktrees/lane-ab $env:TEMP/lab_rev_b1a612e8`, detached at `b1a612e83e822804a2bdcce1db5932cfea3dd8c3`.
All 9 gate tests from `lane.json` were executed in the foreground:

| # | Command | Output Summary | EXIT |
|---|---|---|---|
| a | `node tools/rules/test_srd_rules.js` | `OPEN_QUESTIONS 5`<br>`CREATURES 317`<br>`ATTACK_ACTIONS 514`<br>`COVERAGE 514`<br>`RESULT: 81 passed, 0 failed` | 0 |
| b | `node tools/test_srd_rules_proof.js` | `Results: 49 passed, 0 failed`<br>`SRD Rules Resolver Proof Suite PASSED (100%).` | 0 |
| c | `node tools/test_srd_combat_proof.js` | `Results: 43 passed, 0 failed`<br>`SRD Combat Proof Suite PASSED (100%).` | 0 |
| d | `node tools/test_srd_equipment_proof.js` | `Results: 25 passed, 0 failed`<br>`SRD Equipment & AC Proof Suite PASSED (100%).` | 0 |
| e | `node tools/test_d20_equipment_slots.js` | `KNOWN_GAP sheet_clothes_alias_has_no_torso_slot PROPOSED-AB-03`<br>`Results: 20 passed, 0 failed` | 0 |
| f | `node tools/test_conditions_system.js` | `RESULT: 55 passed, 0 failed (exit 0)` | 0 |
| g | `node tools/test_conditions_native_closure.js` | `RESULT: 18 passed, 0 failed (exit 0)` | 0 |
| h | `node tools/test_combat_dying_integration.js` | `Results: 30 passed, 0 failed`<br>`All integration checks PASSED (100%).` | 0 |
| i | `node tools/check_deus_syntax.js` | `Checked 52 DEUS plugin files. Errors: 0` | 0 |

All 9 gate tests pass cleanly with EXIT=0.

---

## 4. Findings Closure Table (Review 1057a448 Remediation)

| Finding | Severity | Status | Evidence (file:line at b1a612e8) | Analysis & Verification Notes |
|---|---|---|---|---|
| **MAJOR-1** | MAJOR | **CLOSED** | `DEUS_Combat.js:368-378`<br>`tools/rules/test_srd_rules.js:432-446`<br>`docs/systems/UF_Combat.md:2`<br>`docs/systems/DEUS_Rules.md:28` | Runtime creature HP is computed via `Rules.hitPoints(creature).hp`, which uses the SRD printed average. All 23 catalog species verified (`catalog_species_maxhp_is_srd_average`). A mutant restoring catalog HP lookup (`hitpoints`) returns 24 for wolf instead of 11 and is killed (`mutant_catalog_hitpoints_killed`). Plugin header and docs updated. |
| **MAJOR-2** | MAJOR | **CLOSED** | `game/js/sim/rules/species_map.js:6-30`<br>`game/js/sim/rules/rules.js:93-119`<br>`game/js/sim/rules/rules.js:382-386`<br>`tools/rules/test_srd_rules.js:452-520`<br>`tools/test_srd_combat_proof.js:324-345` | All 23 catalog species mapped to SRD stat blocks in `species_map.js` (9 direct, 14 proxy with `PM_DEFAULT`). Natural attacks on proxies resolve via `primaryWeaponAction(creature)`. Units without stats or with only `combatLevels` (e.g. `TEST_anim_fighter` and bench stress units) resolve via SRD **Commoner** default (`AC 10`, `HP 4`, Club). Tested by `species_map_covers_23_and_commoner_default` and `catalog_species_weapons_and_armor_resolve` across all 529 species pairs. |
| **MAJOR-3** | MAJOR | **CLOSED** | `DEUS_Combat.js:2352-2388`<br>`REPORT.md:710-745` | NW.js `combat` and `anim` runs were performed and documented by writer. `anim` tip passes 5/5 base passes (5 passed, 5 failed, identical to base `819ef62d`). In-engine check `srd_creatures` rewritten to expect SRD stat block (wolf HP 11, hare HP 1, boar 11, etc.), resolving all attacks without errors. |
| **MAJOR-4** | MAJOR | **CLOSED** | `game/js/sim/rules/srd_index.js:20`<br>`tools/rules/test_srd_rules.js:527-544` | `armor_leather: "leather"` added to `ITEM_ALIASES` in `srd_index.js`. All catalog torso/clothes/shield items resolve to SRD armor or are listed in `NON_ARMOR`. Tested by `catalog_armor_slots_resolve_or_are_listed_non_armor`. Mutant dropping `armor_leather` alias throws `UNKNOWN_ARMOR` and is killed (`mutant_armor_leather_alias_dropped_killed`). |
| **MAJOR-5** | MAJOR | **CLOSED** | `game/js/sim/rules/rules.js:636-644`<br>`tools/rules/test_srd_rules.js:547-568` | `savingThrow` now checks `creature.savingThrows[key]` and uses the printed bonus when present. Verified across all 315 printed creature saving throws (`printed_saves_315_equal_10_plus_bonus`, including Adult Red Dragon Con save at roll 10 = 23). Mutant ignoring printed saves is killed (`mutant_printed_saves_ignored_killed`). |
| **MINOR-1** | MINOR | **CLOSED** | `game/js/sim/rules/rules.js:573-591`<br>`tools/rules/test_srd_rules.js:571-584` | Resistance then vulnerability applied in order per SRD sentence (`amount = Math.floor(amount / 2); amount = amount * 2`). 25 fire yields 24. Tested by `resistance_then_vulnerability_srd_rule_combat_damage_and_healing` and mutant killed. Open question 8 closed. |
| **MINOR-2** | MINOR | **CLOSED** | `game/js/sim/rules/srd_index.js:647-710`<br>`game/js/sim/rules/rules.js:531-558`<br>`tools/rules/test_srd_rules.js:586-613` | 63 unconditional `plus N (XdY)` riders and 19 save-gated damage riders parsed and applied with resistance/vulnerability adjustments. Giant spider 2d8 poison applies on DC 11 Con save. 119 non-hit damage gaps classified and logged. Mutant dropping rider loop killed (`mutant_riders_dropped_killed`). |
| **MINOR-3** | MINOR | **CLOSED** | `DEUS_Combat.js:342-364`<br>`tools/rules/test_srd_rules.js:374-382` | OSRS remnants removed: `combatLevel`, `level()`, `bonusesOf`, `levelOffset`, `magicDefence`, and style fields deleted. Target ranking uses SRD CR for creatures and character level for characters. Chronicle updated. Verified by `zero_retired_formula_in_deus_combat` scanning 9 retired identifiers. |
| **MINOR-4** | MINOR | **CLOSED** | `DEUS_Combat.js:814-825`<br>`REPORT.md:85` | Named-outcome branch (`opts.hit` / `opts.damage`) routes through `Rules.damage` when hit to apply trait adjustments (resistances/immunities/vulnerabilities). `DEUS_Test.js:490 legacy: true` recorded as `PROPOSED-AB-04`. |
| **MINOR-5** | MINOR | **CLOSED** | `DEUS_Combat.js:235-244`<br>`tools/rules/test_srd_rules.js:632-639` | Direct loader proof `plugin_publishes_window_uf_rules` loads real `DEUS_Combat.js` and asserts `window.UF.Rules` publication. `rulesApi()` throws `RULES_NOT_PUBLISHED` if unpublished. Mutant dropping `mod.attach(window, rules)` killed (`mutant_plugin_attach_removed_killed`). |
| **MINOR-6** | MINOR | **CLOSED** | `DEUS_Combat.js:777-783`<br>`game/js/sim/rules/rules.js:476-477`<br>`tools/rules/test_srd_rules.js:615-623, 640-675` | Added `magical_bypasses_nonmagical_resistance` check; mutant killed (`mutant_magical_bypass_ignored_killed`). Default plugin RNG verified seeded (mulberry32 without Math.random; `plugin_default_rng_is_seeded`, `mutant_plugin_unseeded_rng_killed`, `plugin_default_rng_repeats_for_the_same_seed`). |
| **MINOR-7** | MINOR | **CLOSED** | `tools/test_d20_equipment_slots.js:326` | `sheet_clothes_alias_has_no_torso_slot` logged as `KNOWN_GAP ... PROPOSED-AB-03` instead of counting UI omission as a test pass. |
| **MINOR-8** | MINOR | **CLOSED** | `game/js/sim/rules/srd_index.js:245-246, 264, 621`<br>`game/js/sim/rules/rules.js:242-244`<br>`tools/rules/test_srd_rules.js:625-630` | Code and text unified on `data.unarmoredDefense`. Death-save thresholds and long-jump distance parsed from SRD 5.1 JSON. Monk Unarmored Defense forbids shield per SRD rule (`monk_unarmored_defense_forbids_shield` tested). `AMBIGUOUS_ATTACK` documented in REPORT open questions. |
| **MINOR-9** | MINOR | **CLOSED** | `REPORT.md:86` | `DEUS_Wildlife.js:1117-1124` catalog attack subtraction recorded as `PROPOSED-AB-05` follow-up. Live file was not edited. |

---

## 5. Invariant and Architectural Verification

- **DEC-027 (SRD 5.1 Authority, V64 Retired)**:
  - SRD 5.1 d20 mechanics fully drive attack resolutions against Armor Class, critical hits, fumbles, ability checks, contests, death saves, jumping, and falling.
  - V64 formulas (`hitChance`, `maxHitFor`, `maxHitOf`, `combatLevel`, `levelOffset`, etc.) are completely eliminated from `DEUS_Combat.js`.
  - All combat numbers at runtime originate from `game/data/srd51/`.
- **DEC-007 (Art Freeze)**:
  - Confirmed zero art generation, requests, or additions.
- **ADR-003 Purity**:
  - `game/js/sim/rules/**` (`dice.js`, `srd_index.js`, `species_map.js`, `rules.js`) are pure modules free of host globals (`window`, `Date.now`, `Math.random`, `console`, `$game`, `$data`).
  - All RNG calls are deterministic and seeded.
  - Verified by `purity_scan_clean` and `purity_scan_catches_mutant`.
- **Wiring & Publishing**:
  - `window.UF.Rules` published cleanly on plugin startup and verified by direct loader tests.

---

## 6. Negative Fixtures and Mutation Testing (Empirical Sample)

In the isolated clone, 6 targeted mutants were injected and run against gate tests to empirically verify test sensitivity:

| Mutant ID | File | Mutation Injected | Expected Failing Gate | Observed Result | Killed? |
|---|---|---|---|---|---|
| **M1** | `game/js/sim/rules/rules.js` | Change `total >= effectiveAC` to `total > effectiveAC` | `test_srd_rules.js` | FAIL `goblin_scimitar_hits_own_ac...`, FAIL `goblin_scimitar_damage...`; `EXIT=1` | YES |
| **M2** | `game/js/sim/rules/rules.js` | Change `if (immune) {` to `if (false) {` | `test_srd_rules.js` | FAIL `immunity_is_zero`, FAIL `stat_block_poison_immunity...`; `EXIT=1` | YES |
| **M3** | `game/js/sim/rules/srd_index.js` | Drop `armor_leather: "leather",` alias | `test_srd_rules.js` | FAIL `catalog_species_weapons_and_armor_resolve`; `EXIT=1` | YES |
| **M4** | `game/js/sim/rules/rules.js` | Disable printed saving throw lookup (`if (false) printedSave = printed;`) | `test_srd_rules.js` | FAIL `printed_saves_315_equal_10_plus_bonus`, FAIL `mutant_printed_saves_ignored_killed`; `EXIT=1` | YES |
| **M5** | `game/js/sim/rules/species_map.js` | Remove `hare` mapping row from `SPECIES_MAP` | `test_srd_rules.js` | FAIL `catalog_species_maxhp_is_srd_average`, FAIL `species_map_covers_23...`, FAIL `catalog_species_weapons_and_armor_resolve`; `EXIT=1` | YES |
| **M6** | `game/js/plugins/DEUS_Combat.js` | Disable auto-crit on paralyzed/unconscious targets (`isAutoCrit = false`) | `test_srd_combat_proof.js` | FAIL: `Attack within 5 ft against paralyzed defender automatically crits`; `EXIT=1` | YES |

All 6 sampled mutants failed loudly with exit code 1.

---

## 7. Findings

### BLOCKER
None.

### MAJOR
None.

### MINOR
None.

---

## 8. Verdict

VERDICT: CLEAN PASS
