# WG.00.08: 28-mutant kill roster (exit criterion 2.2b)

- **Leaf:** WG.00.08 / DEUS-TSK-FABLE-19B (natural cuts and all-Z caves on strata)
- **Writer:** Claude / Fable (Lane A, branch `task/lane-a`)
- **Date:** 2026-09-25
- **Suite:** `tools/test_strata_cuts_and_caves.js`, whose `MUTANTS` table holds 28 exact in-memory source edits. Nothing on disk is changed.
- **Revision 2 (Directive 001-F §3):** adds mutant #28 `shaft_prescan_removed`. On the old check it **survived** (exit 0), so `shafts_keep_fluid` was strengthened, and the whole roster was re-run. See "#28 `shaft_prescan_removed`" below. Revision 1 (27/27, commit `9f320da`, accepted by the Owner) is kept under "Revision history". Rows 1–27 keep their numbers. Row 28 is new.

## The cited run

One run supplies every kill result below.

| Item | Value |
|---|---|
| Command | `node tools/test_strata_cuts_and_caves.js --mutants` |
| Worktree / HEAD | `C:\Users\snewt\.deus_worktrees\lane-a` at `9f320da22d8956a026012a093b9ec4dc7f5ad964`, with the test file as committed in this revision (the only modified tracked file under test) |
| Started | 2026-09-25T17:56:26-05:00, ended 18:15:32 |
| Duration | 1146 s by the driver's own clock (`real 19m5.977s` from `time`, which includes the `--expose-gc` re-spawn) |
| Driver exit | 0: `MUTANTS: 28/28 caught by a named check (exit 1)` |
| Sources under test | `DEUS_Levels.js` blob `f500eb49`, `DEUS_WorldGen.js` blob `56b232ed` (both unchanged since fix commit `2e4571a`), test blob `47052c30` |
| Raw log | `tasks/WG.00.08/evidence/mutants_run_47052c3.log` (start/end times: `evidence/run_times_47052c3.txt`) |

The driver (test lines 133–163) applies this rule. Each mutant runs in its own process with `--mutant=<name> --quiet`, six at a time. A mutant counts as **caught** only if the process exits 1 **and** at least one line matches `^FAIL <check>`. A crash cannot count as a kill: an uncaught error exits 2 (test line 173), and so does a missing mutant target (a harness exit, line 200). Mutant runs skip the P/Q child suites (`noSuites = … || !!mutant`, line 89), so `fluid_suite` and `foundation_suite` never run under a mutant.

## Roster

"Designated killing check" is the check written to catch that fault, per the test header (lines 14–57) and the ATK-19B defect records. "All failed checks" is copied verbatim from the cited log.

| # | Mutant | What the edit breaks (test line) | Exit | Designated killing check | All failed checks (verbatim) |
|---|---|---|---|---|---|
| 1 | `no_features` | `carveNaturalFeatures` returns an empty descriptor at entry, so nothing is carved (94) | 1 | `carve_only_removes` (needs `removed > 0`) | different_seeds_differ, carve_only_removes, partial_heights, z0_to_z1_exposure, z1_to_z2_exposure, feature_reaches_z2, shallow_more_common, caves_on_all_levels, cave_overburden, cave_void_minimum, roof_breach, clearance_4_5_more, multi_z_connectivity, shafts_keep_fluid, ground_holes, save_load |
| 2 | `nondeterministic` | Depth-class and cave rolls (salts 204, 101) come from `Math.random` (95) | 1 | `deterministic_same_seed` | deterministic_same_seed, shafts_keep_fluid, save_load |
| 3 | `seed_ignored` | Feature hash drops the seed (96) | 1 | `different_seeds_differ` | different_seeds_differ, feature_reaches_z2, multi_z_connectivity, shafts_keep_fluid |
| 4 | `old_gen_cut` | Generator 4 also gets the natural features (97) | 1 | `old_generator_unchanged` | old_generator_unchanged, carve_only_removes |
| 5 | `adds_mass` | `carveVoid` writes stone into a non-solid stratum above the void (98–99) | 1 | `carve_only_removes` | carve_only_removes |
| 6 | `flat_cuts` | Cut floors rounded to whole levels, so no partial heights (100) | 1 | `partial_heights` | partial_heights, z1_to_z2_exposure, feature_reaches_z2, multi_z_connectivity |
| 7 | `no_exposure` | Cut floors held at or above e 10 (ground S0), and every skylight skipped (101–102) | 1 | `z1_to_z2_exposure` | z1_to_z2_exposure, feature_reaches_z2 |
| 8 | `z2_everywhere` | Class odds shallow 0.60→0.02, z2 0.03→0.61 (103–104) | 1 | `shallow_more_common` | shallow_more_common |
| 9 | `underground_caves_only` | Cave networks only on -1 and -2 (105) | 1 | `caves_on_all_levels` | caves_on_all_levels, roof_breach |
| 10 | `swiss_cheese` | Cave lattice spacing 64 → 20 (106) | 1 | `cave_free_terrain` | cave_free_terrain, shafts_keep_fluid |
| 11 | `cuts_in_start` | Start-valley protection radius 40 → 0 (107) | 1 | `traversable_terrain` | traversable_terrain |
| 12 | `no_roof` | Void carved to the rock top, leaving no roof (108) | 1 | `cave_overburden` | shallow_more_common, cave_overburden, multi_z_connectivity, protections |
| 13 | `cap_ignored` | `hasOpaqueOverburden` ignores the ceiling cap (109) | 1 | `roof_breach` | cave_overburden, roof_breach |
| 14 | `clearance_off_by_one` | `continuousAirHeight` starts counting at 1 (110–111) | 1 | `clearance_4_5_more`, `clearance_stops_at_fluid` | cave_overburden, roof_breach, clearance_4_5_more, clearance_stops_at_fluid |
| 15 | `air_through_fluid` | `continuousAirHeight` stops only on solid, so fluid counts as air (the pre-`2e4571a` line; ATK-19B-001) (112–113) | 1 | `clearance_stops_at_fluid` | clearance_stops_at_fluid |
| 16 | `airrun_through_fluid` | `airRunAt` stops only on solid (pre-`2e4571a`; ATK-19B-001) (114–115) | 1 | `clearance_stops_at_fluid` | clearance_stops_at_fluid |
| 17 | `void_min_1` | Minimum cave void 3 ft → 1 ft (116) | 1 | `cave_void_minimum` | cave_void_minimum |
| 18 | `shaft_through_fluid` | Pre-`2e4571a` shaft: no `fluidIn` pre-scan; solid **or fluid** strata become air (ATK-19B-002) (117–118) | 1 | `shafts_keep_fluid` | shafts_keep_fluid |
| 19 | `skylight_through_fluid` | Pre-`2e4571a` skylight: carves bottom-up and returns only on reaching a fluid, after the rock below it is gone (ATK-19B-002) (121–122) | 1 | `shafts_keep_fluid` | shafts_keep_fluid |
| 20 | `no_multi_z` | `multiZChance` 0, `shaftChance` 0, natural ramps never written (123–124) | 1 | `multi_z_connectivity` | multi_z_connectivity, shafts_keep_fluid |
| 21 | `keep_floating` | Unconnected-solid removal skipped (125) | 1 | `no_floating_mass` | different_seeds_differ, no_floating_mass |
| 22 | `pockets_unprotected` | Founding squares and pools get no cave lock and no cut floor limit (126) | 1 | `protections` | cave_overburden, protections |
| 23 | `water_ignored` | `nearWater` ignores surface water (127) | 1 | `protections` | protections |
| 24 | `open_ground_grass` | WorldGen no longer paints open ground cells (natural holes) as rock face (128) | 1 | `ground_holes` | ground_holes |
| 25 | `plants_in_cuts` | WorldGen places plants on cut (non-floor) cells (129) | 1 | `ground_holes` | ground_holes |
| 26 | `feature_grid_kept` | A per-cell `cutTop` grid is kept on the baseline (130) | 1 | `no_parallel_authority` | no_parallel_authority |
| 27 | `error_injected` | `console.error` at `carveNaturalFeatures` entry (131) | 1 | `no_errors` | no_errors |
| 28 | `shaft_prescan_removed` | Shaft `fluidIn` pre-scan (DEUS_Levels.js 2498) deleted; the write stays SOLID-only, so the water survives and the rock under it is carved (Directive 001-F) (119–120) | 1 | `shafts_keep_fluid` | shafts_keep_fluid |

**Totals:** 28 mutants, 28 with exit 1, 28 with at least one named FAIL, 0 harness exits (2), 0 survivors. In every row the designated check appears in the observed failed list.

**Changes from revision 1's run.** The two runs differ in three rows only. The other 25 failed lists are identical, as a script comparing the two logs line by line showed.
- #2 `nondeterministic` no longer lists `cave_void_minimum`. The mutant draws its rolls from `Math.random`, so its secondary failures differ from run to run by design. Its designated check fails in both runs.
- #10 `swiss_cheese` now also fails `shafts_keep_fluid`. The strengthened check reports 5 rock strata "carved below the water" on seed 18 in the 5 columns of the shaft at (144,204). This is **not** the shaft guard failing. That shaft (from 15 ft to 20 ft) carved 0 cells, because its `fluidIn` scan saw the planted water at 19 ft. The stratum at 15 ft, below an air run at 16–18 ft (cave void), stayed rock through the shafts, the skylights and the cuts. It was removed by the **unconnected-solid removal** (DEUS_Levels.js 2695–2724), because once the shaft refused, it was a 1 ft slab between two air runs with no solid path to bedrock or the area edge. The instrumented world removes 40 floating strata and the uninstrumented one 35: the 5 extra are these columns. The water itself is kept. Evidence: `evidence/mutant_swiss_cheese_47052c3.log` (the check's detail) and `evidence/diag_swiss_cheese_floating_47052c3.log` (snapshots of that stratum between the passes, with the diagnostic code that produced them). This happens only under this mutant: in the real configuration the baseline carves 0 of 38 rock strata under the planted water.
- #28 is new.

### #28 `shaft_prescan_removed` (Directive 001-F §3)

The mutant (test lines 119–120) removes exactly the brief's line from the fixed shaft (DEUS_Levels.js 2498–2500):
```js
// fixed                                                   // mutant
if (fluidIn(i, sh.from, hi)) return;                       /* MUTANT: shaft pre-scan removed */
let changed = false;                                       let changed = false;
for (let e = sh.from; e < hi; e++) if (SOLID_B[getE(i, e)] === 1) { setE(i, e, M_AIR); changed = true; }   // same in both
```
Unlike #18 (`shaft_through_fluid`), the write loop still turns only solid strata to air. A fluid in the shaft's path is therefore never destroyed. What the mutant breaks is the rock **under** that fluid: every solid stratum in `[sh.from, hi)` below it becomes air, and the fluid is left over a void.

**1. On the old check it survived.** Run with the mutant added and `shafts_keep_fluid` unchanged (test blob `bb32c44f`, 2026-09-25T17:43:02-05:00): `RESULT: 26 passed, 0 failed (exit 0)` in 189.5 s. The check line was `PASS shafts_keep_fluid - seed 18: 2 shafts, 0 skylights (0 with rock under water); seed 3: 3 shafts, 10 skylights (10 with rock under water); total rock strata under water: 30; …`. Log: `evidence/mutant_shaft_prescan_removed_old_check_bb32c44.log`. The cause is the old instrumentation, which pushed shaft plantings with `solid: []`. For a shaft, the check tested only that the planted water was still water. The mutant keeps the water, so nothing it did was looked at. The check's own header already promised "no rock of those columns is carved", and for shafts that was not tested.

**2. The check was strengthened** (test 954–1018; the only test change in this revision; no game code changed):
- The shaft planting (958–965) now records, for each planted column, the solid strata in `[sh.from, e)` under the water. It does so only in columns the shaft carve visits: the same gate as DEUS_Levels.js 2496, `NO_CAVE` lock and `wt < 1`. Where the water is planted is unchanged, so revision 1's kills of #18 and #19 rest on the same fixture.
- The pass condition (1015) also requires at least one shaft column with rock under the water (`totalShaftWithRock > 0`), in the same way `totalWithRock > 0` already required one for skylights. So neither half can pass without a fixture.
- The detail reports the rock per kind and a `carved` count, and names the kind in each failure line. Before this change, every failure line said "skylight".

**3. On the strengthened check it is caught.** `node tools/test_strata_cuts_and_caves.js --mutant=shaft_prescan_removed` (2026-09-25T17:48:15-05:00, test blob `47052c30`), exit 1 (copied, trimmed):
```
FAIL shafts_keep_fluid - seed 18: 2 shafts (2 with rock under water), 0 skylights (0 with rock under water); seed 3: 3 shafts (0 with rock under water), 10 skylights (10 with rock under water); total rock strata under water: 38 (shafts 8, skylights 30), carved 8; after the carve: shaft (41,206) rock at 5 ft carved below the water; shaft (41,206) rock at 6 ft carved below the water; shaft (41,206) rock at 7 ft carved below the water; shaft (41,206) rock at 8 ft carved below the water; shaft (41,207) rock at 5 ft carved below the water; … shaft (41,207) rock at 8 ft carved below the water
TIME 251.8 s
RESULT: 25 passed, 1 failed (exit 1) - shafts_keep_fluid
```
Log: `evidence/mutant_shaft_prescan_removed_47052c3.log`. `shafts_keep_fluid` is the only check that fails. The mutant carves all 8 recorded rock strata: seed 18's shaft columns (41,206) and (41,207), water at 9 ft over rock at 5–8 ft each. Seed 3's three planted shaft columns have no rock recorded under the water, so seed 18 supplies the whole shaft fixture of the suite's seed pair. The probe (`evidence/probe_skylight_47052c3.log`) gives the per-seed numbers: seed 18 8 of 8 carved, seed 4 9 of 9 (9 columns, water at 20 ft over rock at 19), seeds 3 and 21 0 of 0. In every case the water remains (byte 4).

**4. The strengthened check passes on the real code** (baseline below: `carved 0` of 38), and still fails on a seed set without a skylight fixture (`--seed2=18 --no-suites`: `FAIL shafts_keep_fluid - seed 18: 2 shafts (2 with rock under water), 0 skylights …; total rock strata under water: 16 (shafts 16, skylights 0), carved 0`, exit 1, `evidence/seed2_18_vacuity_47052c3.log`).

### The fluid mutants and their checks (the ATK-19B-001/002 closure criteria)
| Mutant | Killing check | Why the check fails (evidence in `skylight_through_fluid_proof.md`) |
|---|---|---|
| `air_through_fluid` | `clearance_stops_at_fluid` | Fixture: stone + 4 water under solid must give 0 ft, and the mutant counts the water as 4 ft of air |
| `airrun_through_fluid` | `clearance_stops_at_fluid` | Same fixture read through `airRunAt(6)` |
| `clearance_off_by_one` | `clearance_stops_at_fluid` (and `clearance_4_5_more`, `cave_overburden`, `roof_breach`) | Every clearance is 1 ft too high, including the 0 ft fluid cases |
| `shaft_through_fluid` | `shafts_keep_fluid` | Planted shaft water turned to air: seed 18 2 strata, seed 3 3 strata. It also carves seed 18's 8 rock strata under that water (probe) |
| `shaft_prescan_removed` | `shafts_keep_fluid` | Water kept, the rock under it carved: seed 18 8 of 8 strata (probe; the suite's detail lists them) |
| `skylight_through_fluid` | `shafts_keep_fluid` | Seed 3: all 30 rock strata under the planted water carved. Seed 18 contributes 0 (proof points 2–4). |

## Checks that no mutant in this run made fail

The baseline run below passes all 28 checks. These checks, however, were not seen failing in this run, so this run does not show that they can fail:
- `cost`: no mutant targets it. Its bounds are features < 3000 ms and the memory delta < 256 KiB.
- `fluid_suite`, `foundation_suite`: skipped in every mutant run by design (line 89). Their own suites carry mutants. The baseline run reports `MUTANT VERIFICATION: 5/5 mutants detected` for the fluid suite. The foundation suite's 23 mutants were **not run** in this session.
- `z0_to_z1_exposure` fails only under `no_features`. The `no_exposure` mutant (7) does not make it fail. Under that mutant, generated sky-open columns with a first air at 5–9 ft still exist. The quiet mutant run does not print the check's detail, and the cause has not been investigated. One possibility, not verified: a cut held at `floorMin` 10 removes the roof of a -1 cave void below it. So this run does not show that `z0_to_z1_exposure` can fail except when all features are removed. A narrower mutant is an open item (see `state.md`).
- `save_load` fails only under `no_features` and `nondeterministic`, and has no dedicated mutant.

## Baseline (no mutant) run on the same sources
- Command: `node tools/test_strata_cuts_and_caves.js`, started 2026-09-25T17:52:35-05:00, test blob `47052c30`, with none of my other runs in progress (it ran after the targeted mutant and before the sweep). Log: `tasks/WG.00.08/evidence/baseline_run_47052c3.log`.
- Result: `RESULT: 28 passed, 0 failed (exit 0)`, `TIME 222.9 s`. `fluid_suite`: `exit 0 in 223 s; PASSED: 36; FAILED: 0; MUTANT VERIFICATION: 5/5 mutants detected.` `foundation_suite`: `exit 0 in 223 s; RESULT: 26 passed, 0 failed (exit 0)`.
- `shafts_keep_fluid` line (copied): `PASS shafts_keep_fluid - seed 18: 2 shafts (2 with rock under water), 0 skylights (0 with rock under water); seed 3: 3 shafts (0 with rock under water), 10 skylights (10 with rock under water); total rock strata under water: 38 (shafts 8, skylights 30), carved 0; after the carve: every planted water stratum still water, no rock under it carved`

## Load during the cited run
The evidence probe (`probe_skylight_through_fluid.js --seeds=18,3,21,4`, one process) ran alongside the sweep from 17:57:01 for 356 s, on the same 16-core machine. The only timing-bound checks are `cost` and the per-query bound in `clearance_4_5_more` (< 2000 ns). `cost` failed in no mutant run. `clearance_4_5_more` failed only under `no_features` and `clearance_off_by_one`, where its value checks are the expected failure, the same as in revision 1. So the load added no failure to the table.

## Revision history
| Rev | Commit | Mutants | Test blob | Cited run | Result |
|---|---|---|---|---|---|
| 1 | `9f320da` (accepted by the Owner per `BRIEF.md`, Directive 001-F) | 27 | `373aed6b` | `--mutants` on `d1fbeab`, 2026-09-25T16:33:08-05:00, 1387 s; `evidence/mutants_run_d1fbeab.log`; baseline `evidence/baseline_run_d1fbeab.log` (28 passed) | 27/27 |
| 2 | this commit (Directive 001-F §3) | 28 (+ `shaft_prescan_removed`) | `47052c30` | `--mutants` on `9f320da` + this test, 2026-09-25T17:56:26-05:00, 1146 s; `evidence/mutants_run_47052c3.log`; baseline `evidence/baseline_run_47052c3.log` (28 passed) | 28/28 |

## Reproduce
```bash
node tools/test_strata_cuts_and_caves.js --mutants                          # ~19-23 min, 6 mutants at a time; exit 0 = 28/28 caught
node tools/test_strata_cuts_and_caves.js --mutant=shaft_prescan_removed     # exit 1, FAIL shafts_keep_fluid (8 rock strata carved)
node tools/test_strata_cuts_and_caves.js --mutant=<name>                    # one mutant with full check details; exit 1 expected
node tools/test_strata_cuts_and_caves.js                                    # baseline incl. P/Q suites; exit 0 expected
```
