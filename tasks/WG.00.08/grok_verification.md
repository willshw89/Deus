# WG.00.08: adversarial verification (Grok)

- **Reviewer:** Grok
- **Date:** 2026-09-25T22:46-05:00
- **Reviewed commit:** `a14ee83268028e5084f5c595c54c868cde736ddb` on `task/lane-a` (`[fable] WG.00.08 Add and prove shaft_prescan_removed mutant (Directive 001-F)`)
- **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-a`. The tree was clean at the start of this review. The two live runs below are on that commit.
- **Scope:** Revision 2 of `mutant_kill_roster.md` (28/28, Directive 001-F §3) and the revision-2 additions in `skylight_through_fluid_proof.md` (point 5 items 5–6, Limits 6, runs R8–R15).

## Verdict

| Item | Verdict |
|---|---|
| Directive 001-F §3 (`shaft_prescan_removed` caught by `shafts_keep_fluid`) | **PASS** |
| Revision 2 roster, 28/28 from the cited run | **PASS** |
| Proof point 5 items 5–6, and Limits 6 as an observation | **ACCEPT** |
| ATK-19B-002 on test blob `47052c30` | **REMAINS CLOSED** |
| **Overall** | **PASS** |

2.2d (Owner ruling DEC-001) is outside this review. This lane does not set WBS status.

## Live runs

### 1. `shaft_prescan_removed`

`node tools/test_strata_cuts_and_caves.js --mutant=shaft_prescan_removed`

Driver `TIME 179.5 s`. The process result line is `RESULT: 25 passed, 1 failed (exit 1) - shafts_keep_fluid`. Node's exit code was 1. The only failed check is `shafts_keep_fluid`:

```
FAIL shafts_keep_fluid - seed 18: 2 shafts (2 with rock under water), 0 skylights (0 with rock under water); seed 3: 3 shafts (0 with rock under water), 10 skylights (10 with rock under water); total rock strata under water: 38 (shafts 8, skylights 30), carved 8; after the carve: shaft (41,206) rock at 5 ft carved below the water; shaft (41,206) rock at 6 ft carved below the water; shaft (41,206) rock at 7 ft carved below the water; shaft (41,206) rock at 8 ft carved below the water; shaft (41,207) rock at 5 ft carved below the water; shaft (41,207) rock at 6 ft carved below the water; shaft (41,207) rock at 7 ft carved below the water; shaft (41,207) rock at 8 ft carved below the water
```

That line matches `evidence/mutant_shaft_prescan_removed_47052c3.log`. Timing fields differ (`TIME 179.5 s` here, `251.8 s` in the cited log; the `cost` and `clearance_4_5_more` query times differ). The world results match: checksums `-2: dcfbb91b -1: 433f2728 1: eaf389b9 2: 9998ffb2`, 57026 solid strata carved, 5345 massif-fill strata, and the same eight named rock strata. The failure text lists rock carved under the water. It does not list a planted water stratum changing. `cost` passed (features 446 ms, bound 3000).

### 2. Baseline

`node tools/test_strata_cuts_and_caves.js`

Driver `TIME 212.5 s`. Process exit 0. `RESULT: 28 passed, 0 failed (exit 0)`.

`shafts_keep_fluid`: `total rock strata under water: 38 (shafts 8, skylights 30), carved 0`. `fluid_suite`: `PASSED: 36; FAILED: 0; MUTANT VERIFICATION: 5/5 mutants detected` (child exit 0, 213 s). `foundation_suite`: `RESULT: 26 passed, 0 failed (exit 0)` (213 s). `cost` passed (features 664 ms). `clearance_4_5_more` reported 1084 ns per query, under the 2000 ns bound.

The cited baseline (`evidence/baseline_run_47052c3.log`, `TIME 222.9 s`) has the same value results, including carved 0 of 38 and the same checksums and carve counts. `no_parallel_authority` printed `feature descriptors 11897 chars` in this run and `11898 chars` in the cited log. That count is `JSON.stringify` of the feature object (test line 1133), and the object carries the generation time, so a one-character swing between runs is expected. The check's bound is 200000. The check passed in both runs.

## Code under the mutant

Blobs at `a14ee832`:

| File | Blob | Roster prefix |
|---|---|---|
| `game/js/plugins/DEUS_Levels.js` | `f500eb496cf7f4ef155d4315d4b7707d4542355d` | `f500eb49` |
| `game/js/plugins/DEUS_WorldGen.js` | `56b232ed73aeafffcd0aad75775ec284474aebed` | `56b232ed` |
| `tools/test_strata_cuts_and_caves.js` | `47052c301a9c98093343fc132110299907aa5285` | `47052c30` |

`git diff 2e4571a a14ee832` on `DEUS_Levels.js` and `DEUS_WorldGen.js` is empty. The game code is the ATK-19B fix.

The shaft guard is still the pre-scan at DEUS_Levels.js 2498, then the SOLID-only write at 2500. The find string of `shaft_prescan_removed` (test lines 119–120) is that pre-scan plus the write, and it occurs once. The replacement drops the pre-scan and keeps the SOLID-only write, which is the edit in `BRIEF.md`. `git show 2e4571a` shows the fix adding that pre-scan and narrowing the old `SOLID_B || FLUID_B` write to `SOLID_B`.

The check (test 954–1018) plants water at `hi - 1` and, in columns that pass the shaft's own gate (`NO_CAVE`, `wt < 1`), records the solid strata in `[sh.from, e)`. It passes only when `totalShafts > 0 && totalShaftWithRock > 0 && totalWithRock > 0 && bad.length === 0`. The live failure is `bad.length > 0` with `carved 8`, so the kill is the carved rock, and the fixture is present (seed 18: 2 shaft columns with rock; seed 3: 10 skylight columns with rock). The planting is inserted immediately before `for (const sh of out.shafts)`, and every recorded solid lies in the write interval `[sh.from, hi)`. With the pre-scan gone, that write turns those solids to air and leaves the water, because the predicate is `SOLID_B === 1`.

On the old check the mutant survived. I read `evidence/mutant_shaft_prescan_removed_old_check_bb32c44.log` and did not re-run it: `RESULT: 26 passed, 0 failed (exit 0)`, and `shafts_keep_fluid` passed with `total rock strata under water: 30`. In test blob `373aed6b` the condition is line 1005, `totalShafts > 0 && totalWithRock > 0 && bad.length === 0`, with no shaft-rock term. The strengthening is what makes this kill possible. A mutant run executes 26 checks (the P and Q suites are skipped, test line 89); 25 passed and 1 failed is that set.

## The 28/28 roster

I compared the 28 `MUTANTS` keys, the 28 rows of the roster table, and `evidence/mutants_run_47052c3.log`.

- 28 keys, 28 log rows, none missing, none extra.
- Every log row is exit 1 with at least one `FAIL <check>` name.
- Every roster row's exit and failed-check list matches the log.
- Every designated check is in that row's failed list.
- The log ends `MUTANTS: 28/28 caught by a named check (exit 1) (1146 s)` and `exit=0`.

I did not re-run `node tools/test_strata_cuts_and_caves.js --mutants`. The live `#28` line reproduces the cited kill, and the live baseline reproduces the cited value results. That is the corroboration this session has for the other 27 rows.

The three rows the roster says differ from revision 1 are the three the log supports: `nondeterministic` fails `deterministic_same_seed, shafts_keep_fluid, save_load`; `swiss_cheese` fails `cave_free_terrain, shafts_keep_fluid`; `shaft_prescan_removed` fails `shafts_keep_fluid`.

## `swiss_cheese` and Limits 6

I did not re-run `swiss_cheese`. I read `evidence/diag_swiss_cheese_floating_47052c3.log` and the removal pass at DEUS_Levels.js 2695–2722.

The instrumented snapshot of seed 18 (144,204), bytes at 15 ft and 19 ft, is `after shafts [1, 4]`, `before cuts [1, 4]`, `before floating removal [1, 4]`, `end [0, 4]`. The water byte stays 4. The shaft at (144,204) has `from 15`, `to 20`, `cells 0`. The removal pass sets every solid that is still unconnected to bedrock or the area edge to air. It has no fluid test. The extra `shafts_keep_fluid` failure is that removal, after the shaft scan had already refused the column. The designated kill remains `cave_free_terrain`, which the sweep log shows failing. The live baseline carves 0 of the 38 planted-rock strata, so the same report does not fire on the real configuration. Limits 6 stands as an observation. I am not filing it.

## Proof, point 5 items 5–6

The items match the code, the old-check log, the cited kill log, probe R12, and the live run.

- R12 (`evidence/probe_skylight_47052c3.log`) seed 18, `shaft_prescan_removed`: water at 9 ft stays byte 4 on (41,206) and (41,207); 8 of 8 shaft-rock strata carved; 0 skylight rock carved. Seeds 3 and 21 record 0 shaft rock. Seed 4 carves 9 of 9. The REAL rows carve 0 shaft rock and 0 skylight rock on all four seeds.
- R13 (`evidence/seed2_18_vacuity_47052c3.log`), which I read and did not re-run: `FAIL shafts_keep_fluid` with `total rock strata under water: 16 (shafts 16, skylights 0), carved 0`, and `RESULT: 24 passed, 2 failed (exit 1) - different_seeds_differ, shafts_keep_fluid`. Duplicating seed 18 removes the skylight fixture and the check fails. It does not pass empty.
- The 33 census, `CARVED`, `SKYLIGHTS`, and per-network eligibility lines are identical in `probe_skylight_d1fbeab.log` and `probe_skylight_47052c3.log`. The proof's byte-for-byte claim on those lines holds.
- In blob `373aed6b`, `skylight_through_fluid` starts at line 118 and the old `shafts_keep_fluid` condition is line 1005. At `a14ee832` those are lines 121–122 and 1015. The proof says the older numbers belong to blob `373aed6b`. The header sentence that `git diff 2e4571a` is empty for the test as well is about HEAD `d1fbeab`. At `a14ee832` the two plugins are still identical to `2e4571a` and the test is not. The revision-2 paragraph says that.

Inside the suite's seed pair the shaft fixture is seed 18 alone: 2 columns, 8 strata. Seed 3 records no rock under its shaft water. The roster says so. The new `totalShaftWithRock > 0` term means a pair with no such column fails the check.

## ATK-19B-002

Remains **CLOSED** on test blob `47052c30`. The live baseline passes `shafts_keep_fluid` with 0 of 38 rock strata carved (8 under shaft water, 30 under skylight water). The cited sweep has `skylight_through_fluid` and `shaft_through_fluid` at exit 1, failed check `shafts_keep_fluid` only. The check change adds the shaft-rock record and `totalShaftWithRock > 0`. The skylight planting and `bad.length === 0` are unchanged, so the change cannot hide the skylight kill. `shaft_prescan_removed`, the case the old check missed, is caught in the live run. I did not re-execute `skylight_through_fluid` or `shaft_through_fluid` in this session.

## Accepted residuals

These are the gaps the roster already lists. They do not fail the 28/28 claim.

- `cost` and `save_load` have no dedicated mutant. `z0_to_z1_exposure` fails under `no_features` and did not fail under `no_exposure`.
- `fluid_suite` and `foundation_suite` do not run under a mutant. The foundation suite's own 23 mutants were not run. The live baseline did run both suites, and both exited 0.
- This session did not re-run `--mutants`, the `swiss_cheese` diagnosis, or `--seed2=18`.
- Proposed A-2.2c-1 and A-2.2c-2 stay as written. I am not filing them.

## Left open

- 2.2d / DEC-001, for the Owner.
- Integration of `task/lane-a`, for Gemini. The coordinator sets WBS status.
