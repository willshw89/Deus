# Independent Review: Lane AH (SIM.60.06)

- **Reviewer:** Gemini (deus-gemini)
- **Writer:** Grok (deus-grok)
- **Lane:** lane-ah
- **Task:** SIM.60.06 (Combat stress benchmark with real SRD combat)
- **Reviewed Writer Tip SHA:** `9b8033b5e343779b93708dfac4db6185a5f8de23`
- **Merge Base (`origin/main`):** `343191b5557d6943524792820c23bdc19238e7e4`

---

## 1. SHA Verification

Verification from live worktree git commands:
- `git rev-parse HEAD origin/task/lane-ah`:
  ```
  9b8033b5e343779b93708dfac4db6185a5f8de23
  9b8033b5e343779b93708dfac4db6185a5f8de23
  ```
- Recent log:
  ```
  9b8033b5e343779b93708dfac4db6185a5f8de23 deus-grok [grok] SIM.60.06: SRD combat stress measurement
  6ef74ab5d0ff08a79c8ef062c28850577eceb68f deus-grok [grok] SIM.60.06: log bench lines through UF.Test.write
  2a8ff210b3fea03c94b5194373c41b51b1661d3a deus-grok [grok] SIM.60.06 WIP: SRD combat stress bench
  824d9868d254df7d28472f5ad6d18e878f93f34d deus-pm [pm] Open lane-ah (SIM.60.06): BRIEF.md and lane.json
  343191b5557d6943524792820c23bdc19238e7e4 deus-pm Merge task/lane-ab: SIM.60.05 SRD 5.1 combat rules engine FIX1 (PM merge; Gemini VERDICT CLEAN PASS at b1a612e83e822804a2bdcce1db5932cfea3dd8c3 / tip f0544dfd; writer grok FIX1 b1a612e8)
  ```

---

## 2. Scope Verification

Diff against merge base `343191b5557d6943524792820c23bdc19238e7e4` verified in fresh temporary clone (`git diff --name-status 343191b5557d6943524792820c23bdc19238e7e4 9b8033b5e343779b93708dfac4db6185a5f8de23`):

| File Path | Status | Allowed by `lane.json`? | Notes |
|---|---|---|---|
| `tasks/SIM.60.06/lane-ah/BRIEF.md` | Added | Yes (`tasks/SIM.60.06/**`) | PM brief |
| `tasks/SIM.60.06/lane-ah/REPORT.md` | Added | Yes (`tasks/SIM.60.06/**`) | Writer report |
| `tasks/SIM.60.06/lane-ah/lane.json` | Added | Yes (`tasks/SIM.60.06/**`) | Lane configuration |
| `tasks/SIM.60.06/lane-ah/perf/combat_srd_6ef74ab5.json` | Added | Yes (`tasks/SIM.60.06/**`) | 30 s NW.js benchmark output |
| `tools/bench/combat_srd/DEUS_BenchCombatSrd.js` | Added | Yes (`tools/bench/combat_srd/**`) | Benchmark harness plugin |
| `tools/bench/combat_srd/account.js` | Added | Yes (`tools/bench/combat_srd/**`) | Time accounting separation |
| `tools/bench/combat_srd/load.js` | Added | Yes (`tools/bench/combat_srd/**`) | Machine load sampler |
| `tools/bench/combat_srd/roster.js` | Added | Yes (`tools/bench/combat_srd/**`) | SRD stat-block roster builder |
| `tools/bench/combat_srd/schedule.js` | Added | Yes (`tools/bench/combat_srd/**`) | Due-bucket scheduler |
| `tools/bench/combat_srd/self_test.js` | Added | Yes (`tools/bench/combat_srd/**`) | Self-test suite |
| `tools/bench_combat_srd.js` | Added | Yes (`tools/bench_combat_srd.js`) | CLI benchmark entrypoint |

**Negative checks confirmed:**
- NO modifications to `docs/STATUS.md`, WBS files, `docs/OWNER_DECISIONS.md`.
- NO modifications to `game/js/plugins.js` or `game/js/sim/ledger*`.
- NO modifications to `art/**` (DEC-007 art freeze respected).
- NO modifications to `tools/bench_render_layers.js` or `game/js/plugins/DEUS_Test.js` in the worktree.
- NO modifications to production combat engine (`game/js/plugins/DEUS_Combat.js`, `game/js/plugins/UF_Rules.js`).

---

## 3. Gate Test Executions (Fresh Temp Clone)

All tests rerun directly in fresh temporary clone checked out at `9b8033b5e343779b93708dfac4db6185a5f8de23`:

### Gate Test 1: `node tools/bench_combat_srd.js --self-test`
```
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
```
**Raw Exit Code:** 0

### Gate Test 2: `node tools/rules/test_srd_rules.js`
```
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
```
**Raw Exit Code:** 0

### Gate Test 3: `node tools/check_deus_syntax.js`
```
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```
**Raw Exit Code:** 0

---

## 4. Evidence Verification & Spot Checks

1. **Measurement JSON & measuredSha narrative:**
   - JSON file exists at `tasks/SIM.60.06/lane-ah/perf/combat_srd_6ef74ab5.json`.
   - `measuredSha`: `6ef74ab5d0ff08a79c8ef062c28850577eceb68f`. Matches the git commit preceding `9b8033b5`.
2. **Zero per-frame full scans:**
   - In `combat_srd_6ef74ab5.json`, `resolution.fullScans` is 0 across all 2044 frames.
   - Self-test verifies that `scheduler.step()` keeps `fullScans === 0` over 600 frames, and deliberate `scheduler.scanAll()` increments `fullScans` from 0 to 1 with 221 reads.
3. **Separation of simulation resolution vs rendering:**
   - `account.js` and `DEUS_BenchCombatSrd.js` accumulate `sim.rules` (time within `UF.Rules.attack` and `UF.Rules.damage`) and `render` (engine render submission) independently.
   - SRD day: `sim.rules` median 0.260 ms, `render` median 7.250 ms.
   - SRD night: `sim.rules` median 0.185 ms, `render` median 6.230 ms.
4. **Stat-block calls & host errors:**
   - Total `rulesCalls`: 3395; `fromStatBlock`: 3395 (100%).
   - `hostErrors`: 0.
   - Verified directly against `runs[0].resolution` in the JSON.
5. **60 FPS miss & machine load:**
   - Accurately reported as missed (median frame interval 74.3 ms to 102.0 ms; 9.8 to 13.5 FPS).
   - Accurately labeled `loaded`: overall median CPU 61.2% (min 33.7%, max 87.2%, 173 samples), 4 active AI workers, peak 28 other `nw.exe` processes.
   - Resolution overhead itself is minimal (0.185-0.260 ms median), well below the 16.667 ms budget. Frame interval bottleneck is in `SceneManager.updateMain` / `UF.World.update`.

---

## 5. Findings

- **BLOCKER:** None
- **MAJOR:** None
- **MINOR:** None

---

## 6. Verdict

VERDICT: CLEAN PASS
