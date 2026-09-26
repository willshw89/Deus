# SIM.60.05 Lane AB: independent review of 1057a448 (Claude)

- Reviewer: claude (Claude Opus 5.5). Writer: grok. Date: 2026-09-26.
- Reviewed commit, pasted from `git rev-parse`: `1057a4487f1f4a362d5af4da1a1aa10e0f927af1` on `task/lane-ab`.
- Base: `092c0181949c8cb2568d86546e7e03132445df9c`.
- Nothing in this review generated, requested or integrated art (DEC-007).

## 1. Tip confirmation (live worktree, raw)

```
$ git rev-parse HEAD origin/task/lane-ab
1057a4487f1f4a362d5af4da1a1aa10e0f927af1
1057a4487f1f4a362d5af4da1a1aa10e0f927af1
EXIT=0
$ git log -12 --format="%H %an %s"
1057a4487f1f4a362d5af4da1a1aa10e0f927af1 deus-grok [grok] SIM.60.05 SRD 5.1 rules engine
819ef62d93027f221c8e8c24245679d164d500be snewt [pm] Open lane-ab (SIM.60.05): BRIEF.md and lane.json
092c0181949c8cb2568d86546e7e03132445df9c snewt [gemini] Record Lane X completion and WBS WG.33.01 DONE
176bffe42ad80725e7c497793e3edad7fe2cb9dc snewt Merge task/lane-x: WG.33.01 world-state registry integrity checker (PM manual merge; merge_gate TEST_FAILED on pre-existing main catalogue pin: test_catalogue 46/47 and build_catalogue --check also fail on main fb5391fa; Grok VERDICT CLEAN PASS at b07087d5; review 85ffe5e7)
85ffe5e75e422ef20fc40f08196daca9b1aa733c deus-grok [grok] WG.33.01 review b07087d5
fb5391fa64992359487b7eb7988b2f0c288adc9d snewt [gemini] Record DEC-023..028 and WBS Rev 26 (SIM.40.00/.11, SIM.50.11-.13, SIM.60.05/.06, SIM.10.05)
5a68fd5ab8b3ce4aaf20d8d778cdac434335447c snewt Merge task/lane-v at 3e12866cdd55636f0b704a3de4c96e3d43bbe8d2 (SIM.60.02 lane-v) via merge_gate
b07087d5a043bda344cdb9790269e6a4458b78ad deus-claude [claude] WG.33.01 REPORT.md: record the report commit and the scope check
d132d007d5638ea2ac179294bbd2b45967d81ce0 deus-claude [claude] WG.33.01 REPORT.md and raw evidence (worktree and CRLF clone gates at 66641f1c, determinism, rebuilt-catalogue gate, section 7 cross-check)
3e12866cdd55636f0b704a3de4c96e3d43bbe8d2 deus-grok [grok] SIM.60.02 review 2ce93a0a
66641f1c960af36fb7ac3ee0b3355b882e8f1112 deus-claude [claude] WG.33.01 tests: reportOf() asserts a report exists, so a mutant that makes the tool exit 2 fails on an assertion, not a TypeError
9288f1f2c274ce176cedb866481a8ad028f09c22 deus-claude [claude] WG.33.01 WIP: fixes from a pre-review pass: refuse seed rows outside tables; WSR-03 on every visualStateId; only classes that may display a world state resolve; real source ids for WSR-04; value in the gate key; placement slot/entry checks and discovery; scope enum, required-string, sidecar, map and geometry checks; strict baseline reasons
EXIT=0
```

HEAD equals the requested tip and `origin/task/lane-ab`.

## 2. Method

- Fresh clone: `git clone -c core.autocrlf=false C:/Users/snewt/.deus_worktrees/lane-ab %TEMP%/lab_rev_1057a448` (EXIT=0), then `git checkout --detach 1057a4487f1f4a362d5af4da1a1aa10e0f927af1` (EXIT=0). `git rev-parse HEAD` in the clone printed the same hash. `core.autocrlf` was `false`, `rules.js` had 0 CR bytes, and `git status --short` was empty.
- Node v24.19.0. Every command ran in the foreground.
- Scratch scripts (a mutation driver and four probes) lived in `%TEMP%`, outside the repository. The clone and the scratch folder were deleted at the end. Nothing in the live worktree was edited except this file.
- In-engine runs: `node tools/run_tests.js <suite> --game <clone>/game`. That harness kills only its own `nw.exe` child. `Get-Process nw` found no `nw.exe` running before my first run (`count=0`). Base runs used the same clone after `git checkout --detach 092c0181949c8cb2568d86546e7e03132445df9c`, and then it went back to the tip.

## 3. Scope

`git diff --name-status 092c0181949c8cb2568d86546e7e03132445df9c 1057a4487f1f4a362d5af4da1a1aa10e0f927af1` (EXIT=0):

| Status | Path | Matching allowedPaths entry | Inside |
|---|---|---|---|
| A | docs/systems/DEUS_Rules.md | docs/systems/DEUS_Rules.md | yes |
| M | docs/systems/UF_Combat.md | docs/systems/UF_Combat.md | yes |
| M | game/js/plugins/DEUS_Combat.js | game/js/plugins/DEUS_Combat.js | yes |
| A | game/js/sim/rules/dice.js | game/js/sim/rules/** | yes |
| A | game/js/sim/rules/rules.js | game/js/sim/rules/** | yes |
| A | game/js/sim/rules/srd_index.js | game/js/sim/rules/** | yes |
| A | tasks/SIM.60.05/lane-ab/BRIEF.md | tasks/SIM.60.05/** (PM commit 819ef62d) | yes |
| A | tasks/SIM.60.05/lane-ab/REPORT.md | tasks/SIM.60.05/** | yes |
| A | tasks/SIM.60.05/lane-ab/lane.json | tasks/SIM.60.05/** (PM commit 819ef62d) | yes |
| A | tools/rules/bind.js | tools/rules/** | yes |
| A | tools/rules/test_srd_rules.js | tools/rules/** | yes |
| M | tools/test_d20_equipment_slots.js | tools/test_d20_equipment_slots.js | yes |
| M | tools/test_srd_combat_proof.js | tools/test_srd_combat_proof.js | yes |
| M | tools/test_srd_equipment_proof.js | tools/test_srd_equipment_proof.js | yes |
| M | tools/test_srd_rules_proof.js | tools/test_srd_rules_proof.js | yes |

- The writer's commit alone (`git diff --name-status 819ef62d93027f221c8e8c24245679d164d500be 1057a4487f1f4a362d5af4da1a1aa10e0f927af1`, EXIT=0) has 13 paths. BRIEF.md and lane.json are not among them.
- Forbidden areas: `git diff --name-only <base> <tip> -- docs/STATUS.md docs/OWNER_DECISIONS.md docs/VISION.md game/data art game/js/plugins.js docs/adr docs/audits tools/ops tools/governance tools/sim tools/run_tests.js tools/bench_render_layers.js ':(glob)**/*WBS*'` printed nothing (EXIT=0). No WBS file, no STATUS, no OWNER_DECISIONS, nothing under `game/data/**` or `art/**`, and no tool outside the allowed set.
- DEC-007: there is no image, art or asset path in the diff.
- Retired path: `hitChance`, `maxHitFor`, `maxHitOf`, `attackRollOf`, `defenceRoll`, `roll()`, `Combat.useRules`, `o.legacy` and the legacy branch of `resolveAttack` are deleted. The `zero_retired_formula_in_deus_combat` check passes, and my mutant M09 shows that it can fail. When the caller names no outcome, `resolveAttack` goes only through `Rules.attack` and `Rules.damage` (`DEUS_Combat.js:858-893`). The remnants are covered by MINOR-3 and MINOR-4.

## 4. Gate tests (lane.json gateTests, fresh clone at the tip)

Raw, one command at a time (full logs were kept in the scratch folder):

```
===== node tools/rules/test_srd_rules.js
RESULT: 61 passed, 0 failed
EXIT=0
===== node tools/test_srd_rules_proof.js
Results: 49 passed, 0 failed
EXIT=0
===== node tools/test_srd_combat_proof.js
Results: 41 passed, 0 failed
EXIT=0
===== node tools/test_srd_equipment_proof.js
Results: 25 passed, 0 failed
EXIT=0
===== node tools/test_d20_equipment_slots.js
Results: 21 passed, 0 failed
EXIT=0
===== node tools/test_conditions_system.js
RESULT: 55 passed, 0 failed (exit 0)
EXIT=0
===== node tools/test_conditions_native_closure.js
RESULT: 18 passed, 0 failed (exit 0)
EXIT=0
===== node tools/test_combat_dying_integration.js
Results: 30 passed, 0 failed
EXIT=0
===== node tools/check_deus_syntax.js
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

The tail of `test_srd_rules.js` was `OPEN_QUESTIONS 5`, `CREATURES 317`, `ATTACK_ACTIONS 514`, `COVERAGE 514`, `RESULT: 61 passed, 0 failed`, with 61 `PASS` lines, 0 `FAIL` lines and no `DISAGREE` line. All nine gates match the REPORT's totals. The mutation driver's control pass ran all nine again, and all exited 0 (4856 ms).

## 5. Mutants and negative fixtures (sample of FAIL cases)

The driver in the throwaway clone replaced one exact string per mutant (the string had to occur exactly once), ran all nine gates, and restored the file. Afterwards `git status --porcelain` in the clone was empty (exit 0). 24 mutants: 22 killed, 2 survived.

| Id | File | Change | Killed by |
|---|---|---|---|
| M01 | rules.js | hit needs total > AC | test_srd_rules (2 FAIL), combat proof (9 FAIL) |
| M02 | rules.js | natural 20 is never a crit | test_srd_rules (3), rules proof (3), combat proof (1) |
| M03 | rules.js | weapon ability modifier doubled on a crit | test_srd_rules: crit_doubles_longsword_dice_not_modifier |
| M04 | rules.js | immunity ignored | test_srd_rules: immunity_is_zero, stat_block_poison_immunity_srd_creature_chuul |
| M05 | rules.js | vulnerability ignored | test_srd_rules: vulnerability_doubles |
| M06 | dice.js | advantage and disadvantage do not cancel | test_srd_rules: advantage_and_disadvantage_cancel |
| M07 | srd_index.js | half cover hard-coded to 3 | test_srd_rules: cover_bonus_added_to_ac_srd_rule_combat_cover |
| M08 | rules.js | `Date.now()` added | test_srd_rules: purity_scan_clean |
| M09 | DEUS_Combat.js | `const hitChance = null;` added | test_srd_rules: zero_retired_formula_in_deus_combat |
| M10 | DEUS_Combat.js | `mod.attach(window, rules);` removed | test_d20_equipment_slots only, as a crash: `TypeError: Cannot read properties of undefined (reading 'D20_EQUIPMENT_SLOTS')` (MINOR-5) |
| M11 | rules.js | stat-block AC replaced by 10 | test_srd_rules: two goblin checks |
| M12 | rules.js | ranged weapon uses Strength | test_srd_rules (1), equipment proof (2) |
| M13 | DEUS_Combat.js | auto-crit on a paralyzed or unconscious target dropped | combat proof (1), dying integration (3) |
| M14 | DEUS_Combat.js | default rng replaced by `Math.random` | **survived**: every gate exited 0 (MINOR-6) |
| M15 | DEUS_Combat.js | advantage not passed to UF.Rules | combat proof (1), dying integration (1) |
| M16 | rules.js | a magical attack no longer bypasses "nonmagical" resistance | **survived**: every gate exited 0 (MINOR-6) |
| M17 | rules.js | stat-block immunities ignored | test_srd_rules: stat_block_poison_immunity_srd_creature_chuul |
| M18 | dice.js | a crit does not double the dice | test_srd_rules: crit_doubles_longsword_dice_not_modifier |
| M19 | rules.js | hitPoints average + 1 | test_srd_rules: goblin_hit_points_average_7_srd_creature_goblin |
| M20 | rules.js | an unmapped unit gets 10s instead of NO_SRD_MAPPING | test_srd_rules: unmapped_unit_fails_loudly |
| M21 | rules.js | an unknown weapon silently does 0 | test_srd_rules: unknown_weapon_fails_loudly |
| M22 | dice.js | target text of the writer's crit mutant moved | test_srd_rules: mutant_crit_doubles_modifier_killed |
| M23 | rules.js | target text of the writer's fumble mutant moved | test_srd_rules: mutant_natural_1_hits_killed |
| M24 | dice.js | target text of the writer's rng mutant moved | test_srd_rules: mutant_unseeded_rng_killed |

Raw excerpt (trimmed):

```
M01_hit_needs_beat_ac (game/js/sim/rules/rules.js): KILLED by 2 gate(s)
  tools/rules/test_srd_rules.js EXIT=1 RESULT: 59 passed, 2 failed
    FAIL goblin_scimitar_hits_own_ac_srd_creature_goblin
    FAIL goblin_scimitar_damage_1d6_plus_2_srd_creature_goblin
  tools/test_srd_combat_proof.js EXIT=1 Results: 32 passed, 9 failed
    FAIL: Attack roll 11 + 5 = 16 vs AC 16 hits
M03_weapon_mod_doubled_on_crit (game/js/sim/rules/rules.js): KILLED by 1 gate(s)
  tools/rules/test_srd_rules.js EXIT=1 RESULT: 60 passed, 1 failed
    FAIL crit_doubles_longsword_dice_not_modifier
M08_purity_Date_now (game/js/sim/rules/rules.js): KILLED by 1 gate(s)
  tools/rules/test_srd_rules.js EXIT=1 RESULT: 60 passed, 1 failed
    FAIL purity_scan_clean
M13_plugin_drops_auto_crit (game/js/plugins/DEUS_Combat.js): KILLED by 2 gate(s)
  tools/test_srd_combat_proof.js EXIT=1 Results: 40 passed, 1 failed
    FAIL: Attack within 5 ft against paralyzed defender automatically crits
  tools/test_combat_dying_integration.js EXIT=1 Results: 27 passed, 3 failed
    FAIL adjacent_hit_on_unconscious_is_crit - critical=false
M14_plugin_unseeded_rng (game/js/plugins/DEUS_Combat.js): SURVIVED (every gate exit 0)
M16_magic_ignores_nonmagical_clause (game/js/sim/rules/rules.js): SURVIVED (every gate exit 0)
M20_unmapped_unit_gets_default_scores (game/js/sim/rules/rules.js): KILLED by 1 gate(s)
  tools/rules/test_srd_rules.js EXIT=1 RESULT: 60 passed, 1 failed
    FAIL unmapped_unit_fails_loudly
M22_meta_writer_crit_mutant_cannot_apply (game/js/sim/rules/dice.js): KILLED by 1 gate(s)
  tools/rules/test_srd_rules.js EXIT=1 RESULT: 60 passed, 1 failed
    FAIL mutant_crit_doubles_modifier_killed
clone git status --porcelain: [] exit 0
```

The six in-memory mutants the REPORT claims are killed, and they cannot pass vacuously: M22 to M24 show that a check fails when its mutant can no longer be applied. The fail-loudly fixtures fail when the engine falls back silently (M20, M21).

## 6. In-engine runs (NW.js), base against tip

| Suite | Base 092c0181 | Tip 1057a448 | Reading |
|---|---|---|---|
| combat | 2 passed, 5 failed | 4 passed, 3 failed | `hitsplats` and `suite_completed` (`Combat.isActionActive is not a function`) fail on both, so they predate the lane. The writer's new `srd_creatures` fails (MAJOR-3). `srd_d20` prints `UF.Rules true`. |
| anim | 5 passed, 5 failed | 0 passed, 1 failed | The suite aborts at the first `resolveAttack` (MAJOR-2). |
| wildlife | 15 passed, 7 failed | 13 passed, 9 failed; rerun 12 passed, 10 failed | The world seed is random per run (71391952, 1198379837, 1696851138). The two checks that failed in tip run 1 (environmental_flee, herd_alarm) passed in the rerun. Not attributed to the lane. `no_errors` passes in all three runs. |
| native_survival_dying | 8 passed, 5 failed | 8 passed, 5 failed | The same five checks fail on both. |

Raw (trimmed):

```
tip  SUITE combat
PASS combat.srd_d20 - UF.Rules true; natural 20 hit true crit true damage 19; natural 1 hit false fumble true damage 0
PASS combat.srd_damage - longsword hit damage 8 (want 4..11); critical true damage 19 (want 5..19)
PASS combat.srd_styles - combat:hit styles aggressive, defensive, controlled, accurate (want ...)
PASS combat.srd_equipment - weapon keys true; bow with 3 arrows: arrows 3 -> 2 -> 1 -> 0 after each shot ...
FAIL combat.srd_creatures - 23 species, without a full combat block: none; hare hp true; attack types true; wolf hit true ; hare code UNKNOWN_WEAPON; veteran AC 18
FAIL combat.hitsplats - hit: damage 15, 1 splat(s) ...; miss: 0 splat(s) showing -, colour rgb(0,0,0): false; ...
FAIL combat.suite_completed - Combat.isActionActive is not a function [at Object.fn (.../js/plugins/DEUS_Combat.js:2508:46) | ...]
RESULT: 4 passed, 3 failed (exit 1)
EXIT=1
base SUITE combat (lines cut at 110 characters)
PASS combat.hit_chance - A 1850 D 576: 100000 rolls hit 84.54%, formula 84.39%; A 768 D 1344: 100000 rolls hit
FAIL combat.max_hit - formula: (71, 50) -> 13 want 13, (9, 0) -> 1 want 1, (110, 100) -> 28 want 28, (68, 24) 
FAIL combat.styles - long sword, levels 60: max hit accurate 9, aggressive 10; attack roll accurate 5822, aggr
FAIL combat.equipment - expected damage per tick vs a wolf, levels 40: stone knife 0.494, iron dagger 0.606, i
PASS combat.creatures - 23 species, without a full combat block: none; hare 1s and 2 hp true; fighting levels 
FAIL combat.hitsplats - hit: damage 7, 1 splat(s) showing 7 at (120,160) over the unit at (120,186), colour rg
FAIL combat.suite_completed - Combat.isActionActive is not a function [at Object.fn (chrome-extension://njgcan
RESULT: 2 passed, 5 failed (exit 1)
EXIT=1
tip  SUITE anim
FAIL anim.suite_completed - NO_SRD_MAPPING: armor class for TEST_anim_fighter needs ability scores or an SRD creature [at fail (C:\Users\snewt\AppData\Local\Temp\lab_rev_1057a448\game\js\sim\rules\rules.js:12:17) | at armorClass (C:\Users\snewt\AppData\Local\Temp\lab_rev_1057a448\game\js\sim\rules\rules.js:164:13) | at Object.attack (C:\Users\snewt\AppData\Local\Temp\lab_rev_1057a448\game\js\sim\rules\rules.js:354:89)]
RESULT: 0 passed, 1 failed (exit 1)
EXIT=1
base SUITE anim (lines cut at 90 characters)
FAIL anim.no_code_motion - arena (120,138) 10x5 free; scratch sheets: $TEST_AnimBody memor
FAIL anim.death_frames_and_remains - sheet with death frames ($TEST_AnimBody, facing W): r
FAIL anim.state_frames - work: 4,5,6,4,5,6,4,5,6,4,5 (want 4-6 cycling; state work); attac
PASS anim.no_carry_pose - $TEST_AnimBody (carry column 7 on the sheet, named in its sideca
PASS anim.missing_frames_plain - $TEST_AnimPlain (stand 0, walk 1-3 only): work 2,3,2,1,2,
PASS anim.object_frames - 8 sway objects in a row: columns 12012012012 / 12012012012 / 201
FAIL anim.layers - $UF_Layer_stone_axe (memory) on a unit with equipment.tool = item #3501
PASS anim.remains_saved - entry {"area":{"x":0,"y":0},"z":0,"x":123,"y":139,"image":"$TEST
FAIL anim.pooled_and_perf - 60 deaths on 10 cells: 20 death sprite(s) created (want <= 20)
PASS anim.no_errors - none
RESULT: 5 passed, 5 failed (exit 1)
EXIT=1
```

## 7. REPORT claims spot-checked

| REPORT claim (line) | Measured | Holds |
|---|---|---|
| Gate totals 61/0, 49/0, 41/0, 25/0, 21/0, 55/0, 18/0, 30/0; 52 files with 0 errors (L11, L19) | identical (section 4) | yes |
| `CREATURES 317`, `ATTACK_ACTIONS 514`, `COVERAGE 514` (L12-13) | identical. An independent count of `creatures.json` gives 317 creatures, 514 actions with an `attack` object, 0 attack-text actions without one, and no duplicate name slugs. | yes |
| Six in-memory mutants killed (L15) | PASS lines present; M22-M24 show those checks can fail | yes |
| Purity scan clean, and it catches `window` / `Math.random` (L16) | A grep of `game/js/sim/rules/*.js` for host globals, `Date`, `Math.random`, `process`, `console`, `$game`, `$data` and file I/O finds only a comment naming "global". The only requires are `./dice` and `./srd_index`. M08 is caught. | yes |
| `OPEN_QUESTIONS 5`, no `DISAGREE` (L17) | identical | yes |
| `run_tests.js` "does not name a DEUS_Combat suite. No NW.js run was started" (L21) | `DEUS_Combat.js:2163` registers `UF.Test.suite("combat", ...)`, and the harness lists `combat` and `anim` | no (MAJOR-3) |
| `chance` dropped and not read outside the removed self-test (L39) | A grep of `game/js` and `tools` outside this lane finds no reader of `.chance`, `.maxHit`, `.attackRoll`, `.defenceRoll`, `Combat.roll`, `Combat.defenceRoll`, `hitChance`, `maxHitFor` or `useRules`. | yes |
| The bench calls `resolveAttack` and reads no keys (L41) | true, but its units now throw (MAJOR-2) | incomplete |
| The stat block supplies the "hit-point average" (L47) | Runtime HP comes from the catalog (MAJOR-1) | no |
| 9 wildlife species match a creature, 14 do not (L47) | the same 9 and 14 from `UF_WorldCatalog.json` | yes |
| An attack by an unmapped species throws `NO_SRD_MAPPING` (L47) | true for 4 of 14; the other 10 throw `UNKNOWN_WEAPON`, and attacks on them throw too | no (MAJOR-3) |
| `mail_iron`, `plate_iron`, `shield_iron`, `shield_wood` map to SRD armor (L48) | true, but catalog `armor_leather` does not map (MAJOR-4) | incomplete |
| Scope list (L90-104) | matches the diff | yes |

## 8. Other checks requested

- **DEC-027** (`docs/OWNER_DECISIONS.md:366-373`): d20 against AC, natural 20 and 1, SRD damage dice and types, the V47 header and the retirement of V64 are in place. "SRD stat blocks/hit points" (item 1) is not met at runtime (MAJOR-1). Printed saving throws are ignored (MAJOR-5).
- **DEC-007**: no art in the diff, and none in this review.
- **ADR-003 purity**: holds for `game/js/sim/rules/**` (section 7). Dice take only an injected rng (`dice.js:13-18`), and the real engine refuses a missing rng (`missing_rng_is_refused`). `createSeededRng` is mulberry32.
- **SRD numbers from data**: these are parsed from `game/data/srd51` (`srd_index.js:91-253`): ability modifiers, proficiency by level and challenge rating, the DC ladder, passive-check numbers, reach, cover, the unarmed strike, falling, the high-jump base, damage types, armor, weapons and creature AC, to-hit and damage. The exceptions are runtime HP (MAJOR-1), printed saves (MAJOR-5), rider damage (MINOR-2), and the death-save and long-jump literals (MINOR-8).
- **window.UF.Rules wiring (LWGA F-05)**: it works under Node `require` and `eval` (the gates) and in NW.js (my `combat` run prints `UF.Rules true`). No named check proves that the plugin publishes it (MINOR-5).

## 9. Findings

### BLOCKER

None.

### MAJOR

**MAJOR-1. Creature hit points at runtime are the catalog's V64 numbers, not the SRD stat block, while the plugin header, both system docs and the REPORT say they come from `srd51`.**
- `maxHp` is `block ? pos(block.hitpoints, 1) : level(unit, "hitpoints")` (`DEUS_Combat.js:357-359`). `creatureBlock` is the catalog's `wildlife.species[].combat` (`DEUS_Combat.js:272-275`). The plugin never calls `Rules.hitPoints`.
- A probe through the real plugin with `UF_WorldCatalog.json` (the environment prefix of `test_d20_equipment_slots.js`) printed:
  - `wolf: Combat.maxHp 24 ... | SRD srd:creature:wolf hitPoints {"average":11,"formula":"2d8 + 2"} AC 13`
  - deer 12 against 4, jackal 12 against 3, boar 18 against 11, giant spider 30 against 26, troll 85 against 84.
  - AC does come from the SRD (13, 13, 12, 11, 14, 15).
- Text this contradicts:
  - `DEUS_Combat.js:18` ("creature hit points are read from game/data/srd51/")
  - `docs/systems/UF_Combat.md:2`
  - `docs/systems/DEUS_Rules.md:28` ("hit-point average come from that stat block")
  - `REPORT.md:47`
- Requirements missed: DEC-027 item 1 ("SRD stat blocks/hit points"), the BRIEF goal ("hit points from SRD stat blocks") and the acceptance line "Every SRD number at runtime comes from `game/data/srd51/`".

**MAJOR-2. The lane makes `resolveAttack` throw for units without SRD mapping, two callers outside allowedPaths build such units without catching, the in-engine `anim` suite now aborts, and nothing was escalated.**
- `DEUS_Anim.js:2034-2047` makes `TEST_anim_fighter` and `TEST_anim_guard` with `species: "human"` and no `stats`, then calls `C.resolveAttack`.
- NW.js `anim` at the tip gave `0 passed, 1 failed`: `NO_SRD_MAPPING: armor class for TEST_anim_fighter` (`rules.js:164` via `rules.js:354`). At base it gave `5 passed, 5 failed`. The five checks that pass at base (no_carry_pose, missing_frames_plain, object_frames, remains_saved, no_errors) are no longer reached.
- `tools/bench_render_layers.js:573-575` builds its stress units with `combatLevels` only, and `:610` calls `C.resolveAttack(s.u, s.target, { bypassGcd: true })` with no `hit` or `damage` and no catch. The writer's own combat proof (Proof 8) asserts that exactly such a unit throws `NO_SRD_MAPPING` from `resolveAttack`. I did not run the bench; this rests on code evidence.
- Two texts are wrong about the bench:
  - The comment at `DEUS_Combat.js:850` says "the render bench" names the outcome. It does not.
  - `REPORT.md:41` mentions the bench and omits that it now throws.
- BRIEF standing rule 6 requires an `escalation.md` when a file outside allowedPaths is needed. The branch has none, and the REPORT lists neither `DEUS_Anim.js:2045-2047` nor `DEUS_Test.js:490` among the `resolveAttack` callers.

**MAJOR-3. The required NW.js run was skipped, the writer's own rewritten in-engine check fails, and the REPORT's account of unmapped units is wrong.**
- The BRIEF ("Tests and commands", bullet 2) asks for any `tools/run_tests.js` suite that exercises DEUS_Combat to be run in a throwaway clone. `DEUS_Combat.js:2163` registers `combat`, but `REPORT.md:21` says no such suite exists and that no NW.js run was started.
- In my tip run, `combat.srd_creatures` fails with `hare code UNKNOWN_WEAPON`; the check wants `NO_SRD_MAPPING` (`DEUS_Combat.js:2393-2402`). The hare's natural stab maps to `bite`, and `rules.js:344-349` fails `UNKNOWN_WEAPON` before any score lookup.
- Measured over the 14 unmapped species:
  - `UNKNOWN_WEAPON` for 10: hare, fowl, fox, arctic_fox, wildcat, serpent, songbird, bog_horror, sand_stalker, restless_dead.
  - `NO_SRD_MAPPING` only for 4: aurochs, wild_horse, wild_sheep, ice_wraith.
- An attack *on* an unmapped unit throws too, because `rules.js:354` asks for the target's AC (`rules.js:160-165`). Probe: colonist shortbow → hare gives `NO_SRD_MAPPING`, and wolf bite → hare gives `NO_SRD_MAPPING`.
- The combat loop catches these errors and logs `console.error` on every swing (`DEUS_Combat.js:153-157`, `:1338-1343`). In live play, therefore, 14 of the 23 catalog species (including the monsters bog_horror, sand_stalker, restless_dead and ice_wraith) neither deal nor take combat damage, and the dev console fills with errors.
- Failing loudly is what the BRIEF asked for, but `REPORT.md:47` understates the effect and names the wrong error code.

**MAJOR-4. The catalog armor `armor_leather` makes its wearer untargetable.**
- `ITEM_ALIASES` (`srd_index.js:12-23`) maps `leather_armor` but not the catalog id `armor_leather`, whose slot is `torso`. Colonists craft it (`DEUS_Colonists.js:370` in the society plan, and `:4743` among the leatherworker recipes).
- `armorFromRaw` throws `UNKNOWN_ARMOR` for any unmapped id containing "leather" (`rules.js:137-139`), and `attack` asks for the target's AC (`rules.js:354`). Every attack on a colonist wearing it therefore throws, is caught and logged, and the swing is skipped.
- Probe: `armor_leather [slot "torso"] -> UNKNOWN_ARMOR`, while `mail_iron -> AC 16` and `shield_wood -> AC 13`.

**MAJOR-5. `savingThrow` ignores the printed saving throws of SRD creatures.**
- `rollTotal` adds proficiency only from `opts` or `unit.data.saveProficiencies` (`rules.js:514-524`). The stat block's `savingThrows` is normalised at `srd_index.js:516` and never read.
- Probe: for 315 of 315 printed save entries, the engine total differs from 10 + the printed bonus. Adult Red Dragon Con save at roll 10: engine 17 (+7), printed 23 (+13).
- Nothing outside `rules.js` calls `UF.Rules.savingThrow` today, so the defect is latent until spells or conditions call it. It breaks "SRD numbers come from the data" for a BRIEF-listed API, and the REPORT does not mention it.

### MINOR

- **MINOR-1.** Resistance plus vulnerability to one type "cancel" (`rules.js:450-451`). The authoritative data settles it the other way: `srd:rule:combat-damage-and-healing` contains "Resistance and then vulnerability are applied after all other modifiers to damage". Probe: 25 fire gives 25 in the engine and 24 by the SRD sentence. REPORT open question 8 treats it as undecided. No SRD creature has both for one type.
- **MINOR-2.** Rider damage in `attack.extra` is dropped: 60 unconditional "plus N (XdY) type damage" riders and 52 save or conditional dice riders. Adult Red Dragon bite max: engine 28 piercing, printed 2d10+8 plus 2d6 fire. The mapped DEUS giant_spider loses its 2d8 poison on a failed DC 11 Con save. REPORT open question 6 counts only the 25 actions with no dice.
- **MINOR-3.** OSRS remnants remain:
  - `combatLevel` (`DEUS_Combat.js:390-397`, the OSRS combat-level formula) still ranks "strongest" targets (`:1226`) and writes "fighting level" into the chronicle (`:1093`).
  - `level()`, `bonusesOf`, the style accuracy/strength/defence fields, and `levelOffset` / `magicDefence` (`:85-90`, `:254`) are still in the plugin.
  - The new `srd_creatures` check still requires every species to carry the OSRS block (attack, strength, defence, ranged, magic, maxHitBonus, bonuses) (`:2383-2390`).
  - The `zero_retired_formula` check (`test_srd_rules.js:371-379`) greps five names only.
  - The BRIEF's explicit deletion list is met, but the acceptance wording "no OSRS formula ... remains" is not fully met.
- **MINOR-4.** The named-outcome branch (`DEUS_Combat.js:850-857`) resolves without UF.Rules and without resistances when `opts.hit` or `opts.damage` is set. This is disclosed and needed by read-only suites. `DEUS_Test.js:490` still passes the dead `legacy: true`.
- **MINOR-5.** The loader proof is indirect:
  - `loader_vm_window_uf_rules` (`test_srd_rules.js:361-367`) calls `attach` itself and never loads `DEUS_Combat.js`.
  - With `mod.attach(window, rules)` removed (`DEUS_Combat.js:227`, mutant M10), only a `TypeError` crash in `test_d20_equipment_slots.js` catches it.
  - The vm path (`test_conditions_native_closure.js`) still passes, because `rulesApi()` (`:234`) rebuilds the engine on every call when nothing is published.
- **MINOR-6.** Two coverage gaps survive all nine gates:
  - M14: the plugin's default rng is not checked to be seeded.
  - M16: no check covers `opts.magical` bypassing "nonmagical" resistance.
- **MINOR-7.** `sheet_clothes_alias_has_no_torso_slot` (`test_d20_equipment_slots.js:324`) passes only while mail worn as `clothes` is missing from the sheet. It records a UI gap (PROPOSED-AB-03) as a pass, so fixing DEUS_Sheet would turn it red.
- **MINOR-8.** Text and small-rule mismatches:
  - The printed open question says `opts.unarmoredDefense` (`srd_index.js:249`), but the code reads `data.unarmoredDefense` (`rules.js:194-199`).
  - `DEUS_Rules.md:48` lists death saves and jumping under "from `game/data/srd51/`", but the death-save thresholds (`rules.js:643-659`) and long jump = Strength score (`rules.js:612`) are literals.
  - Monk Unarmored Defense still adds a shield (probe AC 18; the SRD feature requires no shield).
  - The index names `AMBIGUOUS_ATTACK` while REPORT open question 4 names only `UNKNOWN_WEAPON`.
- **MINOR-9.** There is a second damage law outside UF.Rules. It is outside this lane's paths and should be a follow-up: `DEUS_Wildlife.js:1117-1124` subtracts the catalog `combat.attack` from prey HP next to its `C.engage` call.

## 10. What holds

- Scope is clean, the writer's commit touches only its own paths, and there is no art.
- All nine gates exit 0 in a fresh LF clone, with the counts the REPORT gives.
- The rules module is pure and seeded, same seed gives the same transcript and different seeds differ, and every creature attack action resolves (514 of 514, confirmed independently).
- The writer's mutants and fail-loudly fixtures fail when they should (M20-M24). 22 of my 24 mutants are killed.
- `window.UF.Rules` is set in NW.js (`combat.srd_d20`, `UF.Rules true`), and four of the rewritten in-engine checks pass there.
- The V64 hit and max-hit formulas, their switches and their self-tests are gone.

## 11. Needed for a pass (not prescriptive about code)

1. Runtime creature HP from the SRD stat block, and the header and docs corrected. Alternatively, an Owner/PM ruling recorded in the REPORT if the catalog HP is to stay.
2. Escalation and a companion change for the callers outside allowedPaths (`DEUS_Anim.js` fixtures, `bench_render_layers.js` units, and the catalog species mapping). The REPORT must state the live-play effect: unmapped units neither deal nor take damage, with a console error per swing.
3. The `combat` suite run in a throwaway clone, with `srd_creatures` fixed or its expectation corrected.
4. An `armor_leather` mapping, and a check that walks every catalog armor-slot item.
5. Printed creature saving throws used by `savingThrow`.

VERDICT: FAIL
