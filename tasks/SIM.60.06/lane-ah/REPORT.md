# SIM.60.06 lane-ah report

Writer: grok. Reviewer: gemini. Branch: `task/lane-ah`. Base: `343191b5557d6943524792820c23bdc19238e7e4`. Measurement commit: `6ef74ab5` (the NW.js run's `measuredSha`). An independent review decides this lane.

`tools/bench_render_layers.js` was left as it is. The stress scene is re-run by `tools/bench_combat_srd.js` on a throwaway copy of `game/` under `%TEMP%`. That copy is deleted when the run finishes. The copy's `DEUS_Test.js` watchdog is raised from 180 s to 600 s so a day/night base pass and a day/night SRD pass fit in one process. The worktree copy of `DEUS_Test.js` is unchanged.

## What changed

- `tools/bench_combat_srd.js` — `--self-test` and the NW.js runner.
- `tools/bench/combat_srd/roster.js` — 14 SRD stat-block fighters (13 creature ids; goblin is both scimitar and shortbow). A `combatLevels`-only unit is refused.
- `tools/bench/combat_srd/schedule.js` — due-bucket clock. `fullScans` increments only when the roster is walked.
- `tools/bench/combat_srd/account.js` — `sim.rules` and `render` are separate series. The 60 FPS line is a median frame interval of at most 16.7 ms.
- `tools/bench/combat_srd/load.js` — machine CPU and the other `nw.exe` count.
- `tools/bench/combat_srd/DEUS_BenchCombatSrd.js` — plugin written only into the snapshot.
- `tools/bench/combat_srd/self_test.js` — the gate.
- `tasks/SIM.60.06/lane-ah/perf/combat_srd_6ef74ab5.json` — the 30 s measurement.

No art was generated. Flying arrows and spell orbs are the same kind of solid-color placeholders the WG.00.09b stress already uses. Character sheets are the existing AR-600 names.

## How a fighter is resolved

Each unit carries `data.srdId` from `game/data/srd51/creatures.json`. None carry `combatLevels`. Hit points are `UF.Rules.hitPoints` of that block (the printed average).

Host `resolveAttack` (with `bypassGcd`) is used when the catalog weapon key is the printed action: wolf bite, giant spider bite, guard spear, hobgoblin longsword, goblin shortbow, skeleton shortbow. The other actions (goblin scimitar, orc greataxe, boar tusk, scout longbow, bandit light crossbow, barbed devil hurl flame, will-o'-wisp shock, specter life drain) call `UF.Rules.attack` and `UF.Rules.damage` directly, because `resolveWeaponKey` has no catalog item for those names. Spell actions are the printed to-hit and damage. `fromStatBlock` was true on every rules call in the run (3395/3395). Host errors: 0.

The AI combat tick is left off (`Combat.enabled = false`) so that tick does not swing a second time. The bench replaces `onUnitDeath` for the window: a killing blow is counted and the unit is restored to its printed hit-point maximum so the screen stays full. The real `onUnitDeath` still removes the unit in play. This run counted 29 killing blows.

The driver wakes only the fighters whose move or attack is due. Over 2044 driver frames, `fullScans` stayed 0. The busiest frame woke 23 of 221 fighters.

`UF.World.update` still walks every unit. This run called it 2066 times and called `unitsInArea` 4771 times. Those counts are in the JSON under `engine`. They are outside the resolution counter. Changing `DEUS_World.js` is outside this lane.

## Same-session measurement

One NW.js process, seed `0x5eed0019`, zoom 1, 221 units (z+2: 82, z+1: 87, z0: 52; melee 112, archer 64, caster 45). Base passes play the walk, swings, arrows and orbs with resolution off. SRD passes resolve through `UF.Rules`. Each pass is 30 s at noon and 30 s at night. Machine load for the whole process is in the JSON.

| Phase | Frames | Frame median | FPS at median | Target | sim.rules median | render median | update median | World.update median | fullScans |
|---|---:|---:|---:|---|---:|---:|---:|---:|---:|
| base_day_30s | 292 | 74.330 ms | 13.454 | missed | 0 ms | 6.795 ms | 63.305 ms | 7.995 ms | 0 |
| base_night_30s | 250 | 88.545 ms | 11.294 | missed | 0 ms | 6.790 ms | 76.980 ms | 9.770 ms | 0 |
| srd_day_30s | 228 | 101.950 ms | 9.809 | missed | 0.260 ms | 7.250 ms | 90.695 ms | 12.740 ms | 0 |
| srd_night_30s | 217 | 93.205 ms | 10.729 | missed | 0.185 ms | 6.230 ms | 84.185 ms | 12.355 ms | 0 |

SRD day also recorded 1692 rules calls (841 through `resolveAttack`, 851 direct), 17 killing blows, peak 42 projectiles. SRD night: 1618 rules calls (806 host, 812 direct), 11 killing blows. Draw-call medians were 212–220.

The 60 FPS target was missed on this run. The label is `loaded`: CPU median 61.2% (min 33.7, max 87.2, 173 samples), 4 AI workers, other `nw.exe` 26 at the start and 28 at the peak. Render submission stayed under 16.7 ms (worst single frame in the SRD day phase was 19.760 ms). `UF.Rules` stayed under 2 ms (SRD day worst 1.495 ms, median 0.260 ms). The frame interval tracks `SceneManager.updateMain` (median 63–91 ms). Turning resolution on moves `sim.rules` from 0 to about 0.2 ms and leaves render near 7 ms.

Headless, 221 of the same stat blocks over 600 frames: resolution full scans 0, max due 23, sim median 0.010 ms against a 16.667 ms budget. A deliberate roster walk moves `fullScans` from 0 to 1.

## Open questions

Not decided here. They are the SIM.60.05 questions this bench still runs under:

1. Class Unarmored Defense is applied only when `data.unarmoredDefense` is `"barbarian"` or `"monk"`.
2. A finesse weapon uses the higher of Strength and Dexterity. The SRD leaves that choice to the creature.
3. This bench does not pass `opts.silvered`, `opts.adamantine`, or `opts.magical`. A weapon attack is nonmagical.
4. No matching action throws `UNKNOWN_WEAPON`. More than one match throws `AMBIGUOUS_ATTACK`.
5. Jump distance is the distance in the jumping sentences. An Athletics check to clear an obstacle is still a GM call.
6. Some printed attacks have no damage dice. Damage is the printed average when that is a number, otherwise 0.
7. The net has no damage expression in `equipment.json`.

`node tools/rules/test_srd_rules.js` still prints `OPEN_QUESTIONS 5`.

## Follow-ups

- PROPOSED-AH-01: The frame miss is `SceneManager.updateMain` (median 63–91 ms on this loaded run). `UF.World.update` is 8–13 ms of that and walks every unit (`DEUS_World.js` around the `units()` loop in `World.update`). That file is outside this lane.
- PROPOSED-AH-02: `unitsInArea` walks the full unit list (`DEUS_World.js`). This stress called it 4771 times. Callers include depth and other plugins, outside this lane.
- PROPOSED-AH-03: Spell and unmatched weapon names do not come out of `resolveWeaponKey`. Those swings call `UF.Rules` directly. Spell law remains PROPOSED-AB-02 / SIM.60.03.
- PROPOSED-AH-04: Run this bench again when `otherNwExe` is 0. This session stayed loaded (peak 28 other `nw.exe`). The numbers above are that session.

## Scope

Paths written on this branch:

- `tools/bench_combat_srd.js`
- `tools/bench/combat_srd/**`
- `tasks/SIM.60.06/lane-ah/REPORT.md`
- `tasks/SIM.60.06/lane-ah/perf/combat_srd_6ef74ab5.json`

`game/`, `docs/`, and `tools/bench_render_layers.js` were not edited.

## Gate log

Commands from `tasks/SIM.60.06/lane-ah/lane.json`, run from the worktree root after the measurement.

```
===== node tools/bench_combat_srd.js --self-test =====
PASS stat_block_wolf-bite - srd:creature:wolf hp 11 bite dmg 5
PASS stat_block_spider-bite - srd:creature:giant-spider hp 26 bite dmg 20
PASS stat_block_guard-spear - srd:creature:guard hp 11 spear dmg 0
PASS stat_block_hobgoblin-longsword - srd:creature:hobgoblin hp 11 longsword dmg 0
PASS stat_block_goblin-scimitar - srd:creature:goblin hp 7 scimitar dmg 0
PASS stat_block_orc-greataxe - srd:creature:orc hp 15 greataxe dmg 0
PASS stat_block_boar-tusk - srd:creature:boar hp 11 tusk dmg 9
PASS stat_block_goblin-shortbow - srd:creature:goblin hp 7 shortbow dmg 7
PASS stat_block_skeleton-shortbow - srd:creature:skeleton hp 13 shortbow dmg 4
PASS stat_block_scout-longbow - srd:creature:scout hp 16 longbow dmg 7
PASS stat_block_bandit-crossbow - srd:creature:bandit hp 11 light crossbow dmg 2
PASS stat_block_devil-flame - srd:creature:barbed-devil hp 110 hurl flame dmg 0
PASS stat_block_wisp-shock - srd:creature:will-o-wisp hp 22 shock dmg 0
PASS stat_block_specter-drain - srd:creature:specter hp 22 life drain dmg 0
PASS fourteen_distinct_specs - 14 specs
PASS roster_covers_stat_blocks - 13 stat blocks
PASS refused_combat_levels_only
PASS combat_levels_detector
PASS commoner_block_exists_and_is_not_on_the_roster
PASS roster_does_not_use_commoner_fallback
PASS zero_per_frame_full_scans - fullScans 0 over 600 frames
PASS scheduler_does_not_touch_the_roster - index/iterator reads 0
PASS due_bucket_fired - 2216 attacks, 8289 moves, maxDue 23 of 221
PASS no_frame_woke_every_fighter - maxDue 23 population 221
PASS due_set_stays_a_fraction - maxDue 23
PASS every_scheduled_attack_used_the_stat_block - non-stat 0
PASS one_setup_walk - setupWalks 1
PASS resolution_fits_in_a_60hz_frame - sim median 0.01 ms, budget 16.667 ms
PASS full_scan_counter_trips_on_a_roster_walk - fullScans 1, reads 221
PASS fps_target_classifier - {"under":true,"onLine":true,"over":false,"slow":false}
PASS sim_and_render_are_separate - sim 0.5 render 8.6
PASS cost_block_matches_the_series
PASS fixture_frame_meets_60 - fps 60.241
PASS plugin_syntax - node -c
PASS drive_steps_the_scheduler
PASS drive_does_not_walk_the_roster
PASS syntax_roster.js - node -c
PASS syntax_schedule.js - node -c
PASS syntax_account.js - node -c
PASS syntax_load.js - node -c
PASS snapshot_watchdog_needle_present
SELF-TEST PASS
EXIT=0

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
PASS catalog_species_maxhp_is_srd_average
PASS mutant_catalog_hitpoints_killed
PASS species_map_covers_23_and_commoner_default
PASS catalog_species_weapons_and_armor_resolve
PASS catalog_armor_slots_resolve_or_are_listed_non_armor
PASS mutant_armor_leather_alias_dropped_killed
PASS printed_saves_315_equal_10_plus_bonus
PASS mutant_printed_saves_ignored_killed
PASS resistance_then_vulnerability_srd_rule_combat_damage_and_healing
PASS mutant_resistance_and_vulnerability_cancel_killed
PASS unconditional_and_save_riders_apply
PASS mutant_riders_dropped_killed
RIDER_APPLIED unconditional 63
RIDER_APPLIED save 19
RIDER_GAPS 119
RIDER_GAP srd:creature:aboleth Tentacle | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:solar Slaying Longbow | instant-death effect, not dice damage
RIDER_GAP srd:creature:ankheg Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:azer Warhammer | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:behir Constrict | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:bugbear Javelin | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:chuul Pincer | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:cloaker Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:cockatrice Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:couatl Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:couatl Constrict | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:darkmantle Crush | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:balor Whip | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:glabrezu Pincer | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:marilith Tail | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:quasit Claws (Bite in Beast Form) | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:barbed-devil Hurl Flame | prose effect with no parsed damage rider
RIDER_GAP srd:creature:bearded-devil Beard | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:bearded-devil Glaive | ongoing damage or a later-turn effect, not damage on the hit
RIDER_GAP srd:creature:bone-devil Sting | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:chain-devil Chain | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:erinyes Longsword | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:erinyes Longbow | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:horned-devil Tail | ongoing damage or a later-turn effect, not damage on the hit
RIDER_GAP srd:creature:horned-devil Hurl Flame | prose effect with no parsed damage rider
RIDER_GAP srd:creature:pit-fiend Bite | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:tyrannosaurus-rex Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:dragon-turtle Tail | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:drider Longsword | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:dryad Club | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:duergar War Pick | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:duergar Javelin | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:fire-elemental Touch | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:elf-drow Hand Crossbow | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:ettercap Bite | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:djinni Scimitar | the rider names a choice of damage type
RIDER_GAP srd:creature:ghast Claws | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:ghoul Claws | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:stone-giant Rock | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:gibbering-mouther Bites | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:gnoll Spear | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:clay-golem Slam | hit point maximum reduction, not damage on the hit
RIDER_GAP srd:creature:gnome-deep-svirfneblin Poisoned Dart | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:half-red-dragon-veteran Longsword | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:hobgoblin Longsword | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:homunculus Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:kraken Bite | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:kraken Tentacle | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:lich Paralyzing Touch | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:werebear Bite (Bear or Hybrid Form Only) | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:wereboar Tusks (Boar or Hybrid Form Only) | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:wererat Bite (Rat or Hybrid Form Only) | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:weretiger Bite (Tiger or Hybrid Form Only) | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:werewolf Bite (Wolf or Hybrid Form Only) | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:werewolf Spear (Humanoid Form Only) | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:magmin Touch | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:merfolk Spear | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:merrow Harpoon | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:mimic Pseudopod | prose effect with no parsed damage rider
RIDER_GAP srd:creature:mummy Rotting Fist | ongoing damage or a later-turn effect, not damage on the hit; hit point maximum reduction, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:mummy-lord Rotting Fist | ongoing damage or a later-turn effect, not damage on the hit; hit point maximum reduction, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:oni Glaive | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:otyugh Bite | ongoing damage or a later-turn effect, not damage on the hit; hit point maximum reduction, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:otyugh Tentacle | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:pseudodragon Sting | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:purple-worm Bite | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:rakshasa Claw | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:remorhaz Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:roc Talons | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:sahuagin Spear | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:salamander Spear | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:salamander Tail | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:shadow Strength Drain | ability score reduction, not damage on the hit
RIDER_GAP srd:creature:specter Life Drain | hit point maximum reduction, not damage on the hit
RIDER_GAP srd:creature:sprite Shortbow | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:stirge Blood Drain | ongoing damage or a later-turn effect, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:tarrasque Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:tarrasque Tail | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:vampire Unarmed Strike (Vampire Form Only) | prose effect with no parsed damage rider
RIDER_GAP srd:creature:vampire Bite (Bat or Vampire Form Only) | hit point maximum reduction, not damage on the hit
RIDER_GAP srd:creature:vampire-spawn Claws | prose effect with no parsed damage rider
RIDER_GAP srd:creature:vampire-spawn Bite | hit point maximum reduction, not damage on the hit
RIDER_GAP srd:creature:wight Life Drain | hit point maximum reduction, not damage on the hit
RIDER_GAP srd:creature:wight Longsword | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:wraith Life Drain | hit point maximum reduction, not damage on the hit
RIDER_GAP srd:creature:constrictor-snake Constrict | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:crocodile Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:death-dog Bite | ongoing damage or a later-turn effect, not damage on the hit; hit point maximum reduction, not damage on the hit; condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:dire-wolf Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:giant-centipede Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:giant-constrictor-snake Constrict | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:giant-crab Claw | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:giant-crocodile Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:giant-crocodile Tail | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:giant-frog Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:giant-octopus Tentacles | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:giant-scorpion Claw | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:giant-spider Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:giant-toad Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:giant-wasp Sting | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:giant-wolf-spider Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:mastiff Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:octopus Tentacles | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:phase-spider Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:swarm-of-bats Bites | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:swarm-of-insects Bites | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:swarm-of-poisonous-snakes Bites | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:swarm-of-quippers Bites | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:swarm-of-rats Bites | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:swarm-of-ravens Beaks | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:winter-wolf Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:wolf Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:worg Bite | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:druid Quarterstaff | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:gladiator Spear | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:gladiator Shield Bash | condition, grapple, or forced movement; this lane does not apply conditions
RIDER_GAP srd:creature:guard Spear | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:tribal-warrior Spear | alternate primary damage, not an extra rider
RIDER_GAP srd:creature:veteran Longsword | alternate primary damage, not an extra rider
PASS magical_bypasses_nonmagical_resistance
PASS mutant_magical_bypass_ignored_killed
PASS monk_unarmored_defense_forbids_shield
PASS plugin_publishes_window_uf_rules
PASS mutant_plugin_attach_removed_killed
PASS plugin_default_rng_is_seeded
PASS mutant_plugin_unseeded_rng_killed
PASS plugin_default_rng_repeats_for_the_same_seed
OPEN_QUESTIONS 5
CREATURES 317
ATTACK_ACTIONS 514
COVERAGE 514
RESULT: 81 passed, 0 failed
EXIT=0

===== node tools/check_deus_syntax.js =====
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```
