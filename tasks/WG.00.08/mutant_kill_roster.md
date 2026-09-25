# WG.00.08: 27-mutant kill roster (exit criterion 2.2b)

- **Leaf:** WG.00.08 / DEUS-TSK-FABLE-19B (natural cuts and all-Z caves on strata)
- **Writer:** Claude / Fable (Lane A, branch `task/lane-a`)
- **Date:** 2026-09-25
- **Suite:** `tools/test_strata_cuts_and_caves.js`, whose `MUTANTS` table holds 27 exact in-memory source edits. Nothing on disk is changed.

## The cited run

One run supplies every kill result below.

| Item | Value |
|---|---|
| Command | `node tools/test_strata_cuts_and_caves.js --mutants` |
| Worktree / HEAD | `C:\Users\snewt\.deus_worktrees\lane-a` at `d1fbeab84a9ca07fce905f65d5bbffc6148c566c` (clean tree) |
| Started | 2026-09-25T16:33:08-05:00 |
| Duration | 1387 s by the driver's own clock (`real 23m6.862s` from `time`, which includes the `--expose-gc` re-spawn) |
| Driver exit | 0: `MUTANTS: 27/27 caught by a named check (exit 1)` |
| Sources under test | `DEUS_Levels.js` blob `f500eb49`, `DEUS_WorldGen.js` blob `56b232ed`, test blob `373aed6b`. `git diff 2e4571a HEAD` on these three files is empty, so the run tests the ATK-19B-001/002 fix commit `2e4571a` exactly. |
| Raw log | `tasks/WG.00.08/evidence/mutants_run_d1fbeab.log` (copied from `game/test_output/wg0008_mutants_run.log`) |

The rule the driver applies (test lines 130–159) is as follows. Each mutant runs in its own process with `--mutant=<name> --quiet`, six at a time. A mutant counts as **caught** only if the process exits 1 **and** at least one line matches `^FAIL <check>`. A crash cannot count as a kill, because an uncaught error exits 2 (test line 170) and a missing mutant target is also a harness exit 2 (line 197). Mutant runs skip the P/Q child suites (`noSuites = … || !!mutant`, line 88), so `fluid_suite` and `foundation_suite` never run under a mutant.

## Roster

"Designated killing check" is the check written to catch that fault, per the test header (lines 14–56) and the ATK-19B defect records. "All failed checks" is copied verbatim from the cited log.

| # | Mutant | What the edit breaks (test line) | Exit | Designated killing check | All failed checks (verbatim) |
|---|---|---|---|---|---|
| 1 | `no_features` | `carveNaturalFeatures` returns an empty descriptor at entry, so nothing is carved (93) | 1 | `carve_only_removes` (needs `removed > 0`) | different_seeds_differ, carve_only_removes, partial_heights, z0_to_z1_exposure, z1_to_z2_exposure, feature_reaches_z2, shallow_more_common, caves_on_all_levels, cave_overburden, cave_void_minimum, roof_breach, clearance_4_5_more, multi_z_connectivity, shafts_keep_fluid, ground_holes, save_load |
| 2 | `nondeterministic` | Depth-class and cave rolls (salts 204, 101) come from `Math.random` (94) | 1 | `deterministic_same_seed` | deterministic_same_seed, cave_void_minimum, shafts_keep_fluid, save_load |
| 3 | `seed_ignored` | Feature hash drops the seed (95) | 1 | `different_seeds_differ` | different_seeds_differ, feature_reaches_z2, multi_z_connectivity, shafts_keep_fluid |
| 4 | `old_gen_cut` | Generator 4 also gets the natural features (96) | 1 | `old_generator_unchanged` | old_generator_unchanged, carve_only_removes |
| 5 | `adds_mass` | `carveVoid` writes stone into a non-solid stratum above the void (97–98) | 1 | `carve_only_removes` | carve_only_removes |
| 6 | `flat_cuts` | Cut floors rounded to whole levels, so no partial heights (99) | 1 | `partial_heights` | partial_heights, z1_to_z2_exposure, feature_reaches_z2, multi_z_connectivity |
| 7 | `no_exposure` | Cut floors held at or above e 10 (ground S0), and every skylight skipped (100–101) | 1 | `z1_to_z2_exposure` | z1_to_z2_exposure, feature_reaches_z2 |
| 8 | `z2_everywhere` | Class odds shallow 0.60→0.02, z2 0.03→0.61 (102–103) | 1 | `shallow_more_common` | shallow_more_common |
| 9 | `underground_caves_only` | Cave networks only on -1 and -2 (104) | 1 | `caves_on_all_levels` | caves_on_all_levels, roof_breach |
| 10 | `swiss_cheese` | Cave lattice spacing 64 → 20 (105) | 1 | `cave_free_terrain` | cave_free_terrain |
| 11 | `cuts_in_start` | Start-valley protection radius 40 → 0 (106) | 1 | `traversable_terrain` | traversable_terrain |
| 12 | `no_roof` | Void carved to the rock top, leaving no roof (107) | 1 | `cave_overburden` | shallow_more_common, cave_overburden, multi_z_connectivity, protections |
| 13 | `cap_ignored` | `hasOpaqueOverburden` ignores the ceiling cap (108) | 1 | `roof_breach` | cave_overburden, roof_breach |
| 14 | `clearance_off_by_one` | `continuousAirHeight` starts counting at 1 (109–110) | 1 | `clearance_4_5_more`, `clearance_stops_at_fluid` | cave_overburden, roof_breach, clearance_4_5_more, clearance_stops_at_fluid |
| 15 | `air_through_fluid` | `continuousAirHeight` stops only on solid, so fluid counts as air (the pre-`2e4571a` line; ATK-19B-001) (111–112) | 1 | `clearance_stops_at_fluid` | clearance_stops_at_fluid |
| 16 | `airrun_through_fluid` | `airRunAt` stops only on solid (pre-`2e4571a`; ATK-19B-001) (113–114) | 1 | `clearance_stops_at_fluid` | clearance_stops_at_fluid |
| 17 | `void_min_1` | Minimum cave void 3 ft → 1 ft (115) | 1 | `cave_void_minimum` | cave_void_minimum |
| 18 | `shaft_through_fluid` | Pre-`2e4571a` shaft: no `fluidIn` pre-scan; solid **or fluid** strata become air (ATK-19B-002) (116–117) | 1 | `shafts_keep_fluid` | shafts_keep_fluid |
| 19 | `skylight_through_fluid` | Pre-`2e4571a` skylight: carves bottom-up and returns only on reaching a fluid, after the rock below it is gone (ATK-19B-002) (118–119) | 1 | `shafts_keep_fluid` | shafts_keep_fluid |
| 20 | `no_multi_z` | `multiZChance` 0, `shaftChance` 0, natural ramps never written (120–121) | 1 | `multi_z_connectivity` | multi_z_connectivity, shafts_keep_fluid |
| 21 | `keep_floating` | Unconnected-solid removal skipped (122) | 1 | `no_floating_mass` | different_seeds_differ, no_floating_mass |
| 22 | `pockets_unprotected` | Founding squares and pools get no cave lock and no cut floor limit (123) | 1 | `protections` | cave_overburden, protections |
| 23 | `water_ignored` | `nearWater` ignores surface water (124) | 1 | `protections` | protections |
| 24 | `open_ground_grass` | WorldGen no longer paints open ground cells (natural holes) as rock face (125) | 1 | `ground_holes` | ground_holes |
| 25 | `plants_in_cuts` | WorldGen places plants on cut (non-floor) cells (126) | 1 | `ground_holes` | ground_holes |
| 26 | `feature_grid_kept` | A per-cell `cutTop` grid is kept on the baseline (127) | 1 | `no_parallel_authority` | no_parallel_authority |
| 27 | `error_injected` | `console.error` at `carveNaturalFeatures` entry (128) | 1 | `no_errors` | no_errors |

**Totals:** 27 mutants, 27 with exit 1, 27 with at least one named FAIL, 0 harness exits (2), 0 survivors. In every row the designated check appears in the observed failed list.

### The fluid mutants and their checks (the ATK-19B-001/002 closure criteria)
| Mutant | Killing check | Why the check fails (evidence in `skylight_through_fluid_proof.md`) |
|---|---|---|
| `air_through_fluid` | `clearance_stops_at_fluid` | Fixture: stone + 4 water under solid must give 0 ft, and the mutant counts the water as 4 ft of air |
| `airrun_through_fluid` | `clearance_stops_at_fluid` | Same fixture read through `airRunAt(6)` |
| `clearance_off_by_one` | `clearance_stops_at_fluid` (and `clearance_4_5_more`, `cave_overburden`, `roof_breach`) | Every clearance is 1 ft too high, including the 0 ft fluid cases |
| `shaft_through_fluid` | `shafts_keep_fluid` | Planted shaft water turned to air: seed 18 2 strata, seed 3 3 strata (probe) |
| `skylight_through_fluid` | `shafts_keep_fluid` | Seed 3: all 30 rock strata under the planted water carved. Seed 18 contributes 0 (proof points 2–4). |

## Checks that no mutant in this run made fail

The baseline run below passes all 28 checks. These checks, however, were not seen failing in this run, so this run does not show that they can fail:
- `cost`: no mutant targets it. Its bounds are features < 3000 ms and the memory delta < 256 KiB.
- `fluid_suite`, `foundation_suite`: skipped in every mutant run by design (line 88). Their own suites carry mutants. The baseline run reports `MUTANT VERIFICATION: 5/5 mutants detected` for the fluid suite. The foundation suite's 23 mutants were **not run** in this session.
- `z0_to_z1_exposure` fails only under `no_features`. The `no_exposure` mutant (7) does not make it fail. Under that mutant, generated sky-open columns with a first air at 5–9 ft still exist. The quiet mutant run does not print the check's detail, and I did not investigate why in this session. One possibility, not verified: a cut held at `floorMin` 10 removes the roof of a -1 cave void below it. So this run does not show that `z0_to_z1_exposure` can fail except when all features are removed. A narrower mutant is an open item (see `state.md`).
- `save_load` fails only under `no_features` and `nondeterministic`, and has no dedicated mutant.

## Baseline (no mutant) run on the same HEAD
- Command: `node tools/test_strata_cuts_and_caves.js`, started 2026-09-25T16:56:25-05:00 after the mutant sweep had finished, with nothing else running. Log: `tasks/WG.00.08/evidence/baseline_run_d1fbeab.log`.
- Result: `RESULT: 28 passed, 0 failed (exit 0)`, `TIME 247.4 s`. `fluid_suite`: `exit 0 in 247 s; PASSED: 36; FAILED: 0; MUTANT VERIFICATION: 5/5 mutants detected.` `foundation_suite`: `exit 0 in 247 s; RESULT: 26 passed, 0 failed (exit 0)`.
- `shafts_keep_fluid` line (copied): `PASS shafts_keep_fluid - seed 18: 2 shafts, 0 skylights (0 with rock under water); seed 3: 3 shafts, 10 skylights (10 with rock under water); total rock strata under water: 30; after the carve: every planted water stratum still water, no rock under it carved`

## Load during the cited run
While the sweep ran, the evidence probe (`probe_skylight_through_fluid.js`, up to 2 processes) also ran on the same 16-core machine. The only timing-bound checks are `cost` and the per-query bound in `clearance_4_5_more`. `cost` failed in no mutant run. `clearance_4_5_more` failed only under `no_features` and `clearance_off_by_one`, where its value checks are the expected failure. So the load did not add any failure to the table.

## Reproduce
```bash
node tools/test_strata_cuts_and_caves.js --mutants            # ~23 min, 6 mutants at a time; exit 0 = 27/27 caught
node tools/test_strata_cuts_and_caves.js --mutant=<name>      # one mutant with full check details; exit 1 expected
node tools/test_strata_cuts_and_caves.js                      # baseline incl. P/Q suites; exit 0 expected
```
