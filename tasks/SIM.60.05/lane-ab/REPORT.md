# SIM.60.05 lane-ab report

Writer: grok. Branch: `task/lane-ab`. Base: `092c0181949c8cb2568d86546e7e03132445df9c`.

SRD 5.1 combat math lives in `game/js/sim/rules/` (`dice.js`, `srd_index.js`, `rules.js`). `DEUS_Combat.resolveAttack` calls `UF.Rules.attack` and `UF.Rules.damage`. The V64 accuracy and max-hit formulas are gone from that plugin. An independent review decides the lane. This file is the evidence.

## Counts

From `node tools/rules/test_srd_rules.js` (raw log below):

- Checks: `RESULT: 61 passed, 0 failed`
- Creature stat blocks walked: `CREATURES 317`
- Attack actions resolved: `COVERAGE 514` of `ATTACK_ACTIONS 514`
- Worked SRD examples in that file include the goblin scimitar (`srd:creature:goblin`), longsword versatile (`srd:weapon:longsword`), dagger finesse (`srd:weapon:dagger`), shortbow (`srd:weapon:shortbow`), halberd reach (`srd:weapon:halberd`), leather / chain shirt / plate / shield, goblin hit points `2d6` average 7, and a poison-immune stat block (`srd:creature:chuul` on this catalogue)
- Mutants killed, each on an in-memory copy: crit modifier doubled, natural 1 allowed to hit, resistance rounded up, finesse forced to Strength, advantage ignored, missing rng replaced with `Math.random`
- Purity scan of `game/js/sim/rules/**` was clean, and the same scan caught a copy that named `window` and `Math.random`
- The index printed `OPEN_QUESTIONS 5` and no `DISAGREE` lines

Other gate totals, from the same log: rules proof 49/0, combat proof 41/0, equipment proof 25/0, slot proof 21/0, conditions 55/0, native closure 18/0, dying integration 30/0, syntax `Checked 52 DEUS plugin files. Errors: 0`.

`tools/run_tests.js` is a generic NW.js harness (`--deus-test=<suite>`). It does not name a DEUS_Combat suite. No NW.js run was started, and no throwaway clone was made. `tools/validate_srd_catalog.js` was not run; the brief records that it exits 1 at base (37/1) and is out of this lane.

## Result keys

`resolveAttack` still returns an object (or `null` when the attack does not happen: bad arguments, different area, a unit that cannot act, or the 6-second action round).

| Key | Meaning now | Readers |
|---|---|---|
| `hit`, `damage`, `rolled`, `killed` | Hit flag, hit points removed, damage after resistance and the conditions multiplier, whether the target died | `tools/test_conditions_system.js` reads `rolled` (petrified half of a named damage). `tools/test_combat_dying_integration.js` reads `killed`. |
| `critical`, `fumble`, `advantage`, `disadvantage` | Natural 20, natural 1, and the flags passed in from `DEUS_Conditions` | Dying integration reads `advantage` and `critical`. Combat proof reads them on the result. |
| `style`, `attackType`, `speed`, `weapon`, `weaponKey` | Catalog timing and the SRD weapon key | In-plugin `combat:hit` checks. Combat proof checks `attackType` indirectly through the event. |
| `attackRoll` | The d20. Previously this was the V64 maximum attack roll. | Returned to callers. No tool outside this lane reads the old meaning. |
| `defenceRoll` | Effective Armor Class. Previously this was the V64 maximum defence roll. | Same as `attackRoll`. |
| `maxHit` | Maximum of the SRD damage expression before resistance, or `null` on a named outcome. `Combat.describe` returns `maxHit: null`. | The combat proof no longer reads it. |
| `rolls` | `{ a: d20, d: effective AC }` | Returned to callers. |
| `sameZViolation`, `error` | Set when the two units are on different Z, before damage | Combat proof. |
| `totalCover` | Set when `coverBonus` is not finite (the caller’s signal for total cover) | Not required by an existing reader. |

Dropped from the result: `chance` (the V64 hit probability). Nothing outside the removed self-test read it.

`combat:hit` still carries `attacker`, `target`, `damage`, `hit`, `style`, `attackType`, `critical`, `fumble`, `advantage`, `disadvantage`, `roll`. `combat:kill` still carries `attacker` and `target`. `tools/bench_render_layers.js` calls `resolveAttack` and does not read these keys (that file was not edited).

`opts.hit` and `opts.damage` still name an outcome for the conditions and dying suites. They are not a second combat law. `opts.extraDamage` is added inside `UF.Rules.damage` before resistance.

## Unit mapping

- `data.srdId`, `data.creature`, or `data.species` matching a `creatures.json` id or name selects that stat block (AC, to-hit, damage expression, resistances, hit-point average). `wolf` matches Wolf. A survey of `UF_WorldCatalog.json` wildlife found 9 species names that match a creature and 14 that do not: aurochs, wild_horse, wild_sheep, hare, fowl, fox, arctic_fox, wildcat, serpent, songbird, bog_horror, sand_stalker, restless_dead, ice_wraith. An attack by one of those, with no ability scores, throws `NO_SRD_MAPPING`. The combat loop records that on `UF.Combat.errors` and skips the swing.
- `data.stats` / `abilities` / `scores` with no creature match is a character. Unarmored AC is 10 + Dexterity. Armor and shields come from `equipment.json`. `mail_iron`, `plate_iron`, `shield_iron`, and `shield_wood` name Chain Mail, Plate, and Shield. A worn item that is not armor is ignored.
- No `data.level` and no `data.dnd.level` uses the level-1 proficiency row (+2). A stat-block attack uses the printed to-hit.
- `data.combatLevels` alone is not a stat block. The combat proof’s old formula fixture now throws `NO_SRD_MAPPING`.
- The weapon key is `DEUS_Combat.resolveWeaponKey`. A creature action whose name matches that key (Bite, Claw, Scimitar, …) supplies the to-hit and the damage expression. If the key matches none of the actions, the attack throws `UNKNOWN_WEAPON` rather than picking one.

## Proof assertions that changed

- All four proofs loaded `game/js/plugins/UF_Rules.js`, which is not on main. They now build `UF.Rules` from `game/js/sim/rules` (`tools/rules/bind.js`) or, for the combat proof, by loading `DEUS_Combat.js`.
- `UF_Conditions.js` is not on main. The proofs load `DEUS_Conditions.js` and call `add` instead of `apply`.
- Rules proof: critical damage is given an rng (`() => 0`) because the module refuses to roll without one. The `--mutant` branch that expected `1d8` on a crit was removed; mutation checks live in `tools/rules/test_srd_rules.js`. The doubled-dice assertion (`2d8`) is unchanged.
- Rules proof: the advantage/disadvantage cancel check passes an rng. Both flags cancel before the d20, so the roll is a single seeded roll.
- Combat proof: each scripted `resolveAttack` passes `bypassGcd: true` so the 6-second action round does not swallow the later swings. The suite is checking the d20, not the timer.
- Combat proof section 8 no longer expects the retired formula. A unit with only `combatLevels` must throw `NO_SRD_MAPPING`.
- Slot proof: `DEUS_Sheet` renders 12 slots in 2 rows of 6. It ignores the catalog’s 14-name list (the sheet requires length 12 and no `eyes`). The catalog assertions that the list is 14 are unchanged and still hold. `clothes` is aliased to `torso` in the catalog, and the sheet has no torso slot, so mail on `clothes` is not shown. `weapon` still lands on `mainHand`. Combat now also reads `clothes` / `torso` / `armor` as the body slot, so the defence bonus is summed.

## Disagreements

The rules index compared `equipment.json` armor bases with the Armor table in `srd:rule:equipment-armor`, and character-level proficiency with the challenge-rating table for levels 1–20. The test printed no `DISAGREE` lines.

Separate from those tables: the world catalog lists 14 equipment slots, and both `DEUS_Sheet` and `DEUS_Combat` walk 12. That is recorded above and under PROPOSED-AB-03. This lane did not edit the sheet or the catalog.

## Open questions

Not decided here:

1. Class Unarmored Defense (barbarian adds Constitution, monk adds Wisdom, and only while unarmored) is not applied unless `data.unarmoredDefense` is set. The baseline used is 10 + Dexterity, the number those class entries start from.
2. A finesse weapon uses the higher of Strength and Dexterity. The SRD leaves the choice to the creature.
3. DEUS materials are not marked silvered, adamantine, or magical unless the caller passes `opts.silvered`, `opts.adamantine`, or `opts.magical`. A weapon attack is therefore nonmagical, and a stat-block line about nonmagical attacks applies.
4. When a creature has several weapon actions and the weapon key matches none of their names, the attack throws `UNKNOWN_WEAPON`.
5. Jumping returns only the distance in the jumping sentences. The GM may still call for an Athletics check to clear a low obstacle or to jump higher.
6. Some printed attacks have no damage dice (25 actions in this catalogue, including ongoing grapple damage and flat averages such as the sprite’s longsword). Damage is the printed average when that is a number, otherwise 0. The prose is not parsed into a second damage roll.
7. The Net (`srd:weapon:net`) has no damage expression in `equipment.json`.
8. If a target is both resistant and vulnerable to the same type, the two cancel and the amount is unchanged. No creature in this catalogue has both for one type.

## Follow-ups

- PROPOSED-AB-01: SIM.60.06 benchmark hooks on `resolveAttack` (timing of the rules call, separate from the render bench).
- PROPOSED-AB-02: spells through SIM.60.03. This lane does not cast spells. Seven creature actions are `attackKind: "spell"` and resolve only as the printed to-hit and damage.
- PROPOSED-AB-03: map the 14 catalog species that have no SRD creature, and decide whether the catalog’s 14 slot names or the sheet’s 12 slots are the paper doll. `clothes` → `torso` does not appear on the sheet.

## Scope

`git diff --name-only 092c0181949c8cb2568d86546e7e03132445df9c` after this commit should be the files below plus the brief and `lane.json` already on the branch. Paths written here:

- `game/js/sim/rules/dice.js`
- `game/js/sim/rules/srd_index.js`
- `game/js/sim/rules/rules.js`
- `game/js/plugins/DEUS_Combat.js`
- `tools/rules/test_srd_rules.js`
- `tools/rules/bind.js`
- `tools/test_srd_rules_proof.js`
- `tools/test_srd_combat_proof.js`
- `tools/test_srd_equipment_proof.js`
- `tools/test_d20_equipment_slots.js`
- `docs/systems/UF_Combat.md`
- `docs/systems/DEUS_Rules.md`
- `tasks/SIM.60.05/lane-ab/REPORT.md`

`game/data/**`, `game/js/plugins.js`, and every other plugin were not edited.

## Gate log

Commands from `tasks/SIM.60.05/lane-ab/lane.json`, run from the worktree root. Raw output:

```
===== node tools/rules/test_srd_rules.js =====
PASS index_built_srd_rule_using_ability_scores
PASS ability_modifier_table_1_is_-5
PASS ability_modifier_table_10_and_11_are_0
PASS ability_modifier_table_30_is_10
PASS dc_ladder_srd_rule_ability_checks
PASS proficiency_level_1_and_cr_1_4
PASS goblin_scimitar_hits_own_ac_srd_creature_goblin
PASS goblin_scimitar_misses_one_short_srd_creature_goblin
PASS goblin_scimitar_damage_1d6_plus_2_srd_creature_goblin
PASS longsword_attack_mod_str_plus_prof_srd_weapon_longsword
PASS longsword_versatile_1d10_srd_weapon_longsword
PASS finesse_dagger_uses_dex_srd_weapon_dagger
PASS shortbow_uses_dex_srd_weapon_shortbow
PASS halberd_reach_10_feet_srd_weapon_halberd
PASS dagger_thrown_range_srd_weapon_dagger
PASS natural_20_hits_and_crits
PASS crit_doubles_longsword_dice_not_modifier
PASS natural_1_misses
PASS advantage_keeps_higher_d20
PASS disadvantage_keeps_lower_d20
PASS advantage_and_disadvantage_cancel
PASS resistance_halves_rounding_down
PASS vulnerability_doubles
PASS immunity_is_zero
PASS stat_block_poison_immunity_srd_creature_chuul
PASS str_save_10_plus_3_plus_2_meets_dc_15
PASS initiative_d20_plus_dex_srd_combat_order
PASS goblin_hit_points_average_7_srd_creature_goblin
PASS unarmored_10_plus_dex
PASS leather_11_plus_dex_srd_armor_leather
PASS chain_shirt_caps_dex_at_2_srd_armor_chain_shirt
PASS plate_and_shield_20_srd_armor_plate
PASS deus_mail_iron_reads_chain_mail_16
PASS different_z_is_rejected
PASS cover_bonus_added_to_ac_srd_rule_combat_cover
PASS total_cover_is_not_a_target
PASS ability_check_12_plus_3_plus_2_vs_medium
PASS passive_check_10_plus_mods_and_5
PASS check_advantage_disadvantage_cancel
PASS contest_higher_total_wins
PASS death_save_success_failure_and_nat_1
PASS death_save_nat_20_revives_at_1
PASS jumping_long_and_high_srd_rule_adventuring_movement
PASS falling_3d6_at_30_feet_srd_rule_adventuring_the_environment
PASS unmapped_unit_fails_loudly
PASS unknown_weapon_fails_loudly
PASS same_seed_same_transcript
PASS different_seeds_differ
PASS creature_attack_coverage_514_of_514
PASS purity_scan_clean
PASS purity_scan_catches_mutant
PASS mutant_crit_doubles_modifier_killed
PASS mutant_natural_1_hits_killed
PASS mutant_resistance_rounds_up_killed
PASS mutant_finesse_ignores_dex_killed
PASS mutant_advantage_ignored_killed
PASS mutant_unseeded_rng_killed
PASS missing_rng_is_refused
PASS loader_vm_window_uf_rules
PASS loader_require_does_not_publish
PASS zero_retired_formula_in_deus_combat
OPEN_QUESTIONS 5
CREATURES 317
ATTACK_ACTIONS 514
COVERAGE 514
RESULT: 61 passed, 0 failed
EXIT=0

===== node tools/test_srd_rules_proof.js =====
--- Running SRD 5.1 Rules Resolver Proof Suite (Mutant: false) ---
[Proof 1] Ability Scores, Modifiers & DC Ladder
PASS: Score 1 gives modifier -5
PASS: Score 10 gives modifier 0
PASS: Score 11 gives modifier 0
PASS: Score 12 gives modifier +1
PASS: Score 14 gives modifier +2
PASS: Score 18 gives modifier +4
PASS: Score 20 gives modifier +5
PASS: Score 30 gives modifier +10
PASS: Very Easy DC is 5
PASS: Easy DC is 10
PASS: Medium DC is 15
PASS: Hard DC is 20
PASS: Very Hard DC is 25
PASS: Nearly Impossible DC is 30
[Proof 2] Ability Checks, Advantage & Passive Checks
PASS: Check rolled test override 12
PASS: STR 16 modifier is +3
PASS: Proficiency bonus is +2
PASS: Total check is 12 + 3 + 2 = 17
PASS: Total 17 succeeds against DC 15 (Medium)
PASS: Margin of success is +2
PASS: Passive Perception is 10 + 2(wis) + 2(prof) = 14
PASS: Passive Perception with Advantage adds +5 (got 19)
PASS: Passive Perception with Disadvantage subtracts 5 (got 9)
PASS: Advantage and Disadvantage cancel to normal single roll
[Proof 3] Saving Throws & Condition Auto-Fails
PASS: STR save with prof succeeds: 10 + 3 + 2 = 15 vs DC 15
PASS: DEX save automatically fails while Paralyzed
PASS: autoFailed flag is set on condition failure
[Proof 4] Contested Checks
PASS: Orc wins grapple contest with higher total (14 vs 13)
[Proof 5] Armor Class (AC) Formulas
PASS: Unarmored AC is 10 + Dex (13)
PASS: Leather armor AC is 11 + 3(Dex) = 14
PASS: Chain shirt caps Dex bonus to +2 (AC 15)
PASS: Plate armor grants flat 18 AC with no Dex bonus
PASS: Plate + Shield gives 20 AC
[Proof 6] Combat Attack Resolution & Same-Z Invariant
PASS: Attack across different Z levels is strictly rejected by same-Z invariant
PASS: Attack hits when roll + attackMod >= target AC
PASS: Attack mod is +3(Str) + 2(prof) = +5
PASS: Attack total is 15 + 5 = 20 vs AC 12
PASS: Natural 20 hits regardless of high AC
PASS: Natural 20 is a critical hit
PASS: Damage resolution recognises critical hit
PASS: Critical hit rolls damage dice twice (2d8 for longsword)
[Proof 7] Heroic Death Saves at 0 HP
PASS: Roll 12 gives 1 death save success
PASS: Roll 5 gives 1 death save failure
PASS: Nat 1 adds 2 failures, reaching 3 failures and death
PASS: Nat 20 on death save revives unit immediately with 1 HP
[Proof 8] Jumping & Falling Rules
PASS: Running long jump equals STR score (16 ft)
PASS: Standing long jump is half STR score (8 ft)
PASS: Running high jump is 3 + STR mod (6 ft)
PASS: Falling 30 ft deals 3d6 bludgeoning damage and lands prone
Results: 49 passed, 0 failed
SRD Rules Resolver Proof Suite PASSED (100%).
EXIT=0

===== node tools/test_srd_combat_proof.js =====
--- Running SRD 5.1 Combat Proof Suite (Mutant: false) ---

[Proof 1] Weapon Key Mapping & Armor Class Integration
PASS: Long sword maps to SRD longsword
PASS: Short bow maps to SRD shortbow
PASS: Iron dagger maps to SRD dagger
PASS: Natural stab attack maps to bite
PASS: Natural slash attack maps to claws
PASS: Null weapon profile maps to unarmed
PASS: Unarmored unit AC is 10 + 3(Dex) = 13
PASS: Chain mail unit AC is 16
PASS: Plate armor + Shield AC is 18 + 2 = 20

[Proof 2] SRD 5.1 D20 Attack Roll Resolution vs AC
PASS: Attack roll 10 + 5 = 15 vs AC 16 misses
PASS: Damage on miss is 0
PASS: Defender HP unchanged after miss
PASS: Attack roll 11 + 5 = 16 vs AC 16 hits
PASS: Damage dealt on hit: 8
PASS: Defender HP reduced to 22

[Proof 3] Critical Hits & Fumbles
PASS: Natural 20 automatically hits
PASS: Natural 20 flagged as critical hit
PASS: Critical hit rolled damage >= 5 (got 19)
PASS: Natural 1 is an automatic miss (fumble)
PASS: Natural 1 flagged as fumble
PASS: Fumble deals 0 damage

[Proof 4] Same-Z Invariant Enforcement
PASS: Cross-Z attack is strictly rejected
PASS: Cross-Z attack flagged with sameZViolation
PASS: Defender on different Z suffers 0 damage

[Proof 5] Conditions Integration (Prone & Paralyzed)
PASS: Defender has prone condition
PASS: Melee attack against prone defender has Advantage
PASS: Defender has paralyzed condition
PASS: Attack hits paralyzed defender
PASS: Attack within 5 ft against paralyzed defender automatically crits

[Proof 6] Event Emission & Hitsplat Values
PASS: combat:hit event was emitted
PASS: Event specifies correct attacker
PASS: Event specifies correct target
PASS: Event damage matches resolution damage
PASS: Event hit flag is true
PASS: Event contains d20 roll

[Proof 7] Unit Death at 0 HP
PASS: Lethal attack hits
PASS: Lethal attack reports target killed
PASS: Target HP reduced to exactly 0
PASS: Target marked dead
PASS: combat:kill event was emitted

[Proof 8] Unmapped units fail loudly
PASS: A unit with only combat levels and no SRD mapping fails loudly (NO_SRD_MAPPING)

Results: 41 passed, 0 failed
SRD Combat Proof Suite PASSED (100%).
EXIT=0

===== node tools/test_srd_equipment_proof.js =====
--- Running SRD 5.1 Equipment & AC Proof Suite (Mutant: false) ---
[Proof 1] Weapon Properties, Ranges & Conversions
PASS: Dagger deals 1d4 piercing
PASS: Dagger has finesse and thrown properties
PASS: Dagger normal range 20 ft converts to 4 grid cells
PASS: Dagger long range 60 ft converts to 12 grid cells
PASS: Longsword is versatile: 1d8 (one-handed) / 1d10 (two-handed)
PASS: Halberd has reach property with 10 ft range (2 grid cells)
PASS: Halberd 10 ft range is 2 grid cells
PASS: Shortbow has normal range 80 ft (16 cells) and long range 320 ft (64 cells)
[Proof 2] Finesse & Ranged Attack Ability Routing
PASS: Finesse weapon automatically selects higher Dex modifier (+4)
PASS: Attack modifier is +4(Dex) + 2(prof) = +6
PASS: Ranged weapon strictly selects Dex modifier (+4)
[Proof 3] Armor Class Categories & Limits
PASS: Unarmored AC is 10 + Dex (13)
PASS: Studded leather gives 12 + 3(Dex) = 15 AC
PASS: Half plate caps Dex bonus to +2 (15 + 2 = 17)
PASS: Half plate imposes stealth disadvantage
PASS: Plate armor gives flat 18 AC
PASS: Plate armor grants 0 Dex modifier
PASS: Plate armor imposes stealth disadvantage
PASS: Plate (18) + Shield (+2) gives 20 AC
[Proof 4] Cover Bonuses to AC
PASS: Attack hits with total 16 vs AC 11
PASS: Half cover adds +2 to effective AC (13)
PASS: Total 16 hits against half cover AC 13
PASS: Three-quarters cover adds +5 to effective AC (16)
PASS: Total 16 hits against three-quarters cover AC 16
PASS: Total cover cannot be directly targeted or hit
Results: 25 passed, 0 failed
SRD Equipment & AC Proof Suite PASSED (100%).
EXIT=0

===== node tools/test_d20_equipment_slots.js =====
=== Testing 14 d20 Equipment Slots ===
PASS: catalog_combat_slots_14 (found 14 slots)
PASS: catalog_sheet_slots_14 (found 14 slots)
PASS: catalog_aliases_bidirectional (aliases weapon->mainHand, tool->mainHand, shield->offHand, legs->feet, clothes->torso, body->armor)
PASS: rules_d20_slots_exported (Rules.D20_EQUIPMENT_SLOTS length: 14)
PASS: rules_armor_class_unarmored (10 base + 2 dex mod = 12 AC)
PASS: rules_armor_class_chain_mail_heavy (16 base (heavy) + 0 effective dex = 16 AC)
PASS: rules_armor_class_torso_alias_and_shield (11 leather + 2 dex + 2 shield = 15 AC)
PASS: rules_armor_class_offHand_alias (10 base + 0 dex + 2 offHand shield = 12 AC)
PASS: rules_armor_class_item_id_resolution (resolves numerical item ID 99 to mail_iron -> 16 AC)
UF_World: no walkable cell within 24 of (5,5) in area (0,0) for "TEST_Unit_NoEq": left on the blocked cell it asked for
PASS: world_addUnit_initializes_equipment (unit.data.equipment is initialized to {})
UF_World: no walkable cell within 24 of (6,6) in area (0,0) for "TEST_Deer": left on the blocked cell it asked for
PASS: sheet_animal_has_12_equipment_slots (animal model equipment length: 12)
PASS: sheet_animal_equipped_item_in_slot (head slot contains antlers_burlap)
PASS: sheet_layout_equipment_exists (layout slots length: 12)
PASS: sheet_layout_2_rows_6_cols (row 0 y=92, row 1 y=142 (below row 0 h=34))
PASS: sheet_layout_columns_spaced (slots spaced horizontally across 6 columns)
UF_World: no walkable cell within 24 of (10,10) in area (0,0) for "TEST_CombatColonist": left on the blocked cell it asked for
PASS: combat_bonuses_sum_across_all_d20_slots (attack.slash=17 (axe 12 + ring 5), strength=11 (axe 8 + ring 3), def.slash=20)
PASS: combat_weaponOf_resolves_mainHand (weapon profile name=Stone Axe, speed=5)
UF_World: no walkable cell within 24 of (12,12) in area (0,0) for "TEST_LegacyColonist": left on the blocked cell it asked for
PASS: combat_legacy_aliases_bonuses (legacy weapon and clothes aliases resolved properly in combat)
PASS: sheet_weapon_alias_maps_to_mainHand (mainHand via weapon type stone_axe)
PASS: sheet_clothes_alias_has_no_torso_slot (12 slots, torso slot absent, mail_iron shown: false)
PASS: test_must_be_able_to_fail (verified test can detect inequality and throw)

Results: 21 passed, 0 failed
EXIT=0

===== node tools/test_conditions_system.js =====
=== DEUS SRD 5.1 Conditions System Headless Tests ===
PASS: conditions_module_loaded
PASS: all_15_conditions_defined
PASS: initial_clean_conditions
PASS: two_instances_added
PASS: non_stacking_disadvantage
PASS: remove_one_instance_leaves_other
PASS: remove_second_instance_clears
PASS: cancellation_blinded_vs_prone
PASS: advantage_invisible_vs_restrained
PASS: paralyzed_is_incapacitated
PASS: paralyzed_cannot_act
PASS: paralyzed_speed_zero
PASS: paralyzed_cannot_speak
PASS: unconscious_is_incapacitated
PASS: unconscious_is_prone
PASS: unconscious_cannot_act
PASS: paralyzed_auto_fails_str_save
PASS: paralyzed_auto_fails_dex_save
PASS: paralyzed_rolls_con_save_normally
PASS: blinded_auto_fails_sight_check
PASS: deafened_auto_fails_hearing_check
PASS: normal_speed_factor
PASS: prone_speed_factor_crawl
PASS: standing_up_clears_prone
PASS: grappled_speed_zero
PASS: restrained_speed_zero
PASS: frightened_rejects_moving_closer
PASS: frightened_allows_moving_away
PASS: charmed_cannot_harm_charmer
PASS: charmed_can_harm_others
PASS: combat_refuses_attack_against_charmer
PASS: prone_melee_grants_advantage
PASS: prone_ranged_gives_disadvantage
PASS: crit_within_5ft_paralyzed
PASS: no_crit_beyond_5ft_paralyzed
PASS: petrified_weight_x10
PASS: petrified_damage_resistance_half
PASS: combat_applies_half_damage_to_petrified
PASS: unconscious_drops_held_items
PASS: grapple_active_adjacent
PASS: grapple_breaks_when_grappler_moves_away
PASS: timed_condition_active_initially
PASS: timed_condition_still_active_before_expiry
PASS: timed_condition_expires_on_time
PASS: save_load_preserves_conditions
PASS: save_load_preserves_expiration
PASS: sheet_uses_12_slots
PASS: sheet_exact_12_slots_order
PASS: sheet_model_has_12_equipment_slots
PASS: alias_clothes_mapped_to_body
PASS: alias_waist_mapped_to_belt
PASS: alias_shoulders_mapped_to_cloak
PASS: alias_arms_mapped_to_bracers
PASS: rule4_mutant_test_able_to_fail
PASS: invalid_condition_rejected

RESULT: 55 passed, 0 failed (exit 0)
EXIT=0

===== node tools/test_conditions_native_closure.js =====
=== SRD 5.1 condition closure (DEUS_Conditions.js) headless checks ===
PASS conditions.plugins_load - Conditions with isStable/onUnitMoved/releaseGrapples/lineOfSight/socialCheckModifiers/fearSourceVisible; drops held: unconscious, petrified; Combat loaded, Dnd5e loaded
PASS conditions.unconscious_drops_held_items - axe #33 and club #34 on (31,29): true; slots {"mainHand":null,"offHand":null}; 1 drop event(s) with 2 items; cannot act, prone
PASS conditions.petrified_drops_held_items - axe #35 on (33,29): true; mainHand null; incapacitated, half damage
PASS conditions.incapacitated_stunned_paralyzed_keep_grip - incapacitated: grip held, cannot act or react; stunned: grip held, cannot act or react; paralyzed: grip held, cannot act or react
PASS conditions.downed_at_zero_hp_drops_items - after combat:downed the axe lies on (35,32): true; unconscious by the 0-hit-point rule: true
PASS conditions.grapple_ends_when_grappler_incapacitated - incapacitated: held -> ended at once; stunned: held -> ended at once; paralyzed: held -> ended at once; unconscious: held -> ended at once; petrified: held -> ended at once; poisoned grappler keeps it: true
PASS conditions.grapple_ends_when_grappler_dies_or_leaves - grappler dead -> released: true; second grappler removed from the world -> its hold released, the other kept: true
PASS conditions.grapple_ends_when_grappler_moves_away - onUnitMoved(grappler 3 cells away) ended 1; victim free: true; tick() after another move frees too: true
PASS conditions.frightened_cannot_approach_visible_or_hidden_source - source at (16,50), creature at (10,50): closer refused true, away true, sideways (same distance) true; behind a wall: closer still refused true, away true
PASS conditions.frightened_disadvantage_suspended_without_line_of_sight - in sight: attack disadvantage true, check disadvantage true; walls at x=13: seen false, attack false (none), check false; opts.fearSourceVisible forces true; walls gone: seen true
PASS conditions.charmer_social_advantage - charmer vs charmed: persuasion advantage true (option_advantage,charmer_social), deception true; vs a stranger false; another talker vs the charmed false; athletics false
PASS conditions.charmed_refuses_harm_to_charmer - charmed -> charmer refused true, charmed -> stranger allowed true, charmer -> charmed allowed true; DEUS_Combat.resolveAttack: on the charmer refused (null), on a stranger resolved
PASS conditions.stable_dying_skips_death_saves - stable patient after 5 rounds: saves 0/0 (was 0/0), hp 0, unconscious true, isStable true, reflected {"source":"zero_hp","dying":true,"stable":true}; the unstable control rolled: 0/0
PASS conditions.stable_stays_unconscious_until_revived - woke after 600 updates (1.0 h): hp 1, unconscious false, can act true
PASS conditions.multi_instance_non_stacking_and_isolated_removal - two poisons -> one disadvantage (poisoned); removed the bite -> the cloud remains (true); t+150 still poisoned true; t+301 expired true (expiry events 1); ids cond_poisoned_1, cond_poisoned_2
PASS conditions.save_load_round_trip - 1091 bytes, no Infinity/undefined: true; identical after the round trip: true; poison expires at 3031 (set at 2731+300), metadata {"potency":2,"tags":["needle","blue"]}, fear source #21 indefinite (null), charm DC 13 wis; the copy behaves (frightened, charmed, grappled): true; expiry at t+299/t+300: true/false; a new instance id cond_poisoned_5 is unique: true
PASS conditions.timers_tagged_action - 2 instances, domains action/action
PASS conditions.no_errors - no console errors during 2731 updates

RESULT: 18 passed, 0 failed (exit 0)
EXIT=0

===== node tools/test_combat_dying_integration.js =====
=== DEUS Combat, Dying, Exhaustion & Food Integration Checks (Mutant: none) ===

[Test 1] 0 HP Enters Dying System
UF_Colonists: the player's faction has no home site; no colonists made
UF_Colonists: the player's faction has no home site; no colonists made
PASS founder_unconscious_at_zero - founder HP=0, dead=undefined, killed=false
PASS founder_entered_dying_state - dying record: {"successes":0,"failures":0,"stable":false,"since":0,"nextRoundAt":360,"wakeAt":null}
PASS combat_downed_event_emitted - combat:downed event was emitted for founder
UF_Colonists: the player's faction has no home site; no colonists made
PASS unconscious_cannot_attack - unconscious founder at 0 HP cannot resolve an attack
UF_Colonists: the player's faction has no home site; no colonists made
PASS gcd_blocks_action - hostileAttacker is on 6-second GCD and cannot attack again before GCD expires

[Test 2] Damage at 0 HP & Death Save Failures
UF_Colonists: the player's faction has no home site; no colonists made
UF_Colonists: the player's faction has no home site; no colonists made
PASS attack_on_unconscious_has_advantage - advantage=true
PASS adjacent_hit_on_unconscious_is_crit - critical=true
PASS crit_at_zero_adds_two_failures - failures=2 (expected 2)
UF_Colonists: the player's faction has no home site; no colonists made
UF_Colonists: the player's faction has no home site; no colonists made
UF_Colonists: the player's faction has no home site; no colonists made
PASS third_failure_causes_death - founder dead=true

[Test 3] Massive Damage Instant Death
UF_Colonists: the player's faction has no home site; no colonists made
PASS massive_damage_instant_death - killed=true, dead=true

[Test 4] Non-Colonist Instant Death at 0 HP
PASS non_colonist_dies_instantly_at_zero - wolf killed=true, dead=true

[Test 5] Combat.heal Restores Consciousness
UF_Colonists: the player's faction has no home site; no colonists made
UF_Colonists: the player's faction has no home site; no colonists made
PASS founder3_downed - founder3 hp=0, dying=true
PASS heal_restores_hp - healed=5, hp=5
PASS heal_clears_dying_state - dying=undefined

[Test 6] Skill Proficiencies & Medicine Stabilization
PASS dnd_class_has_chosen_skills - skills: ["Persuasion","Religion"]
PASS dnd_class_has_lowercase_proficiencies - proficiencies: ["persuasion","religion"]
PASS proficient_medicine_check_has_bonus - doctor roll=10 + mod=3 + pb=2 = total=15
PASS untrained_medicine_check_lacks_bonus - layman roll=10 + mod=3 + pb=0 = total=13
PASS patient_stabilized - stabilize ok=true, stable=true
PASS stable_patient_remains_at_zero_hp - patient hp=0

[Test 7] Exhaustion Consumers Ladder
PASS exhaustion_lvl1_check_disadvantage - lvl 1 disadvantage=true
PASS exhaustion_lvl2_speed_halved - lvl 2 speed=3 (expected 3)
PASS exhaustion_lvl3_save_disadvantage - lvl 3 save disadvantage=true
PASS exhaustion_lvl4_hp_max_halved - lvl 4 maxHp=5 (expected 5)
PASS exhaustion_recovery_restores_max_hp - restored maxHp=10 (expected 10)
PASS exhaustion_lvl5_speed_zero - lvl 5 speed=0
PASS exhaustion_lvl5_sendUnit_refused - sendUnit refused=true

[Test 8] Save / Restart Persistence
PASS save_dying_progress_preserved - u101 dying failures=1, successes=1
PASS save_stable_state_preserved - u102 stable=true, hp=0
PASS save_exhaustion_and_needs_preserved - u103 exhaustion=3, foodLb=0.5

Results: 30 passed, 0 failed
All integration checks PASSED (100%).
EXIT=0

===== node tools/check_deus_syntax.js =====
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

## Head

This report is inside the commit on `task/lane-ab`. The hash after `git push origin task/lane-ab` is the session’s last line, copied from `git rev-parse HEAD`.
