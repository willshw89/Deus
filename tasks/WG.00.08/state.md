# Task State: WG.00.08 / FABLE-19B — Natural Cuts & All-Z Caves on Strata

- **Task ID:** `WG.00.08`
- **WBS ID:** `WG.00.08`
- **Role:** Writer: Claude / Fable (Lane A; Gemini ceased writing in this lane per `BRIEF.md`) | Reviewer: Grok
- **Branch / Worktree:** `task/lane-a` (`C:\Users\snewt\.deus_worktrees\lane-a`)
- **Base Commit:** `9f320da` (the 2.2b/2.2c checkpoint, `[fable] WG.00.08 Criteria 2.2b/2.2c …`, whose 27/27 roster the Owner accepted per `BRIEF.md`). This checkpoint is the `[fable] WG.00.08 Add and prove shaft_prescan_removed mutant (Directive 001-F)` commit on `task/lane-a`. The game code under test is still byte-identical to fix commit `2e4571a` (`git diff 2e4571a HEAD` on DEUS_Levels.js and DEUS_WorldGen.js is empty). The test file changed in this checkpoint (blob `47052c30`).
- **Current Gate:** Directive 001 §2.2. 2.2a met (`8d1c7c3`). 2.2b and 2.2c delivered at `9f320da`. **Directive 001-F §3 follow-up (`shaft_prescan_removed`) delivered 2026-09-25 (this checkpoint), awaiting Grok review.** 2.2d (Owner ruling DEC-001) and 2.2e (Grok closure verdict) are still owed.

## Owned File Set
- `game/js/plugins/DEUS_Levels.js`
- `game/js/plugins/DEUS_WorldGen.js`
- `tools/test_strata_cuts_and_caves.js`
- `tools/test_generated_z2_cut_proof.js`
- `tasks/WG.00.08/*` (`mutant_kill_roster.md`, `skylight_through_fluid_proof.md`, `probe_skylight_through_fluid.js`, `evidence/*`)

This checkpoint changes `tools/test_strata_cuts_and_caves.js` (one mutant added; the `shafts_keep_fluid` check strengthened) and `tasks/WG.00.08/probe_skylight_through_fluid.js` (it reads the check's planting text, so its counts now separate shaft rock from skylight rock). No game code or data file changed.

## What is Done (with Evidence)
1. **Physical clearance & continuous air run**: `continuousAirHeight` and `airRunAt` stop at solid and fluid strata (`!== M_AIR`, DEUS_Levels.js 2906 / 2928). Caught by `clearance_stops_at_fluid`, which kills `air_through_fluid`, `airrun_through_fluid` and `clearance_off_by_one` (commit `2e4571a`, merged `31676cf`).
2. **Fluid-safe carving**: shafts and skylights refuse columns holding fluid strata (`fluidIn` pre-scan at 2498 / 2514, before any write) and turn only solid strata to air (commit `2e4571a`).
3. **Targeted Z-2 Cut Proof (2.2a)**: `tools/test_generated_z2_cut_proof.js`, seed 18, ravine #4 at (194, 89), exit 1, not reproduced (PM 2026-09-25). Map proof `game/test_output/z2_cut_proof_seed18_194_89.png`. Carried over from earlier checkpoints and not re-run in this session.
4. **2.2b: mutant roster, now 28** → `tasks/WG.00.08/mutant_kill_roster.md` (revision 2; revision 1's 27/27 is kept in its history table).
   - One cited run: `node tools/test_strata_cuts_and_caves.js --mutants` on `9f320da` with test blob `47052c30`, 2026-09-25T17:56:26-05:00, 1146 s. Result: `MUTANTS: 28/28 caught by a named check (exit 1)`, driver exit 0. Log `evidence/mutants_run_47052c3.log`.
   - Every mutant exits 1 with at least one named FAIL, and in every row the designated check appears in the observed failed list. Compared with revision 1's run, only 3 rows differ: `nondeterministic` (random by design), `swiss_cheese` (now also `shafts_keep_fluid`, explained in the roster), and the new #28.
   - Baseline on the same sources: `node tools/test_strata_cuts_and_caves.js` → `RESULT: 28 passed, 0 failed (exit 0)`, 222.9 s. That includes `fluid_suite` (36/36, 5/5 mutants) and `foundation_suite` (26/26). Log `evidence/baseline_run_47052c3.log`.
5. **2.2c: `skylight_through_fluid` six-point proof** → `tasks/WG.00.08/skylight_through_fluid_proof.md` (unchanged findings; revision 2 adds point 5 items 5–6, runs R8–R14 and Limits 6).
   - Seed 18 **does** reach the skylight carve loop (3 skylights, 15 columns carved). It never reaches one with fluid in the column. Seed 3's two eligible skylights carry **30** rock strata under planted water, and the mutant carves all 30. Log `evidence/mutant_skylight_through_fluid_d1fbeab.log`.
   - Revision 2 probe (R12): the skylight numbers and the fluid census lines are identical to R5. Real code: 0 of 0/30/57/54 skylight rock strata carved and 0 of 8/0/0/9 shaft rock strata carved on seeds 18/3/21/4. 0 fluid lost, 0 carved below a fluid.
6. **Directive 001-F §3: `shaft_prescan_removed`** (test lines 119–120; deletes the shaft's `fluidIn` pre-scan at DEUS_Levels.js 2498 and keeps the SOLID-only write).
   - **On the existing check it survived.** `--mutant=shaft_prescan_removed` with the check unchanged (test blob `bb32c44f`): `RESULT: 26 passed, 0 failed (exit 0)`. Log `evidence/mutant_shaft_prescan_removed_old_check_bb32c44.log`. The check recorded no rock under planted *shaft* water (`solid: []`), and the mutant keeps the water. This contradicts `BRIEF.md`'s expectation that the existing `shafts_keep_fluid` catches it.
   - **Check strengthened** (test 954–1018). Shaft plantings record the solid strata in `[sh.from, e)` under the water, in columns that pass the shaft's own gate. The check requires at least one shaft column with rock under water. Where water is planted is unchanged.
   - **Caught.** `--mutant=shaft_prescan_removed`, exit 1: `FAIL shafts_keep_fluid - … total rock strata under water: 38 (shafts 8, skylights 30), carved 8; after the carve: shaft (41,206) rock at 5 ft carved below the water; …`, `RESULT: 25 passed, 1 failed (exit 1) - shafts_keep_fluid`. Log `evidence/mutant_shaft_prescan_removed_47052c3.log`. The sweep: `MUTANT shaft_prescan_removed: exit 1; failed: shafts_keep_fluid`.
   - The check still fails on a seed pair with no skylight fixture (`--seed2=18 --no-suites`, exit 1, `evidence/seed2_18_vacuity_47052c3.log`).

## Exact Next Step
- Grok: adversarial review of revision 2 of the roster (#28 and the strengthened `shafts_keep_fluid`, including the new `swiss_cheese` failure) and of the proof's point 5 items 5–6 / Limits 6. Then the closure verdict (2.2e).
- Owner: ruling on DEC-001 / A10-1 in `docs/OWNER_DECISIONS.md` (2.2d).
- Gemini: integrate `task/lane-a` and route the proposed findings below. The coordinator sets WBS status; this lane does not.

## Open Defects / Questions
- ATK-19B-001: CLOSED by Grok on `2e4571a` / `689aff8`.
- ATK-19B-002: CLOSED by Grok on `2e4571a` / `689aff8`. Its closure criterion names `shafts_keep_fluid`. That check was strengthened in this checkpoint, so Grok may want to re-confirm the closure against test blob `47052c30`.
- **Proposed A-2.2c-1 (MINOR, not filed in `defects.jsonl`):** `carveVoid`'s fluid pre-scan covers `[F, C)` only. A fluid lying exactly at the void's planned top `C` under rock would not be seen, and the strata under it would be carved. Not observed on seeds 18/3/21/4, including with the pocket locks removed (`pockets_unprotected` census clean). Fix idea: scan `[F, C]` inclusive. This is a code change needing a task.
- **Proposed A-2.2c-2 (MINOR, comment only):** DEUS_Levels.js 2646–2647 says a cut carves "fluids included", but the code skips a column holding a fluid. `UF_Levels.md` is correct.
- **Observation (revision 2, not filed):** the unconnected-solid removal (DEUS_Levels.js 2695–2724) has no fluid test. Under `swiss_cheese` it removed a 1 ft rock slab 4 ft below planted shaft water, in the column of a shaft whose scan had refused. The water was kept, and it already rested on a void. It has not been seen on the real configuration (census clean on seeds 18/3/21/4). Evidence: `evidence/diag_swiss_cheese_floating_47052c3.log`; proof Limits 6.
- **Test-strength gaps (from the roster):** `z0_to_z1_exposure` fails only under `no_features`, because the `no_exposure` mutant does not make it fail (cause not investigated). `cost` and `save_load` have no dedicated mutant. `fluid_suite` and `foundation_suite` do not run under mutants by design, and the foundation suite's own 23 mutants were not run in this session. The shaft half of `shafts_keep_fluid` rests on seed 18 alone within the suite's pair: 2 columns, 8 rock strata. Seed 3 has no rock under its shaft water. A different `--seed` could leave the shaft half without a fixture, in which case the check FAILs; it does not pass vacuously.
- The +2 massif fill (DEUS_Levels.js 2402) has no fluid test. It relies on generation putting no fluid at e ≥ 21 (none on the four seeds).
- The 2.2c text of Directive 001 is not in this repository. The six points follow `BRIEF.md`'s scope. Grok or the coordinator should confirm they match the directive. The Directive 001-F text is not in this repository either. This checkpoint follows `BRIEF.md` §"Mandate & Scope".

## Relevant Commands
```bash
node tools/test_strata_cuts_and_caves.js --mutants                               # 2.2b: 28/28, ~19-23 min
node tools/test_strata_cuts_and_caves.js                                         # baseline incl. P/Q suites, ~4 min
node tools/test_strata_cuts_and_caves.js --mutant=shaft_prescan_removed          # 001-F kill, exit 1
node tools/test_strata_cuts_and_caves.js --mutant=skylight_through_fluid         # 2.2c kill, exit 1
node tools/test_strata_cuts_and_caves.js --seed2=18 --no-suites                  # 2.2c: seed 18 alone -> shafts_keep_fluid FAIL
node tasks/WG.00.08/probe_skylight_through_fluid.js --seeds=18,3,21,4            # per-seed numbers (skylight + shaft) + fluid census
node tasks/WG.00.08/probe_skylight_through_fluid.js --seeds=18 --census-mutant=probe_self_test   # census can fail (exit 1)
node tools/test_generated_z2_cut_proof.js                                        # 2.2a
```
