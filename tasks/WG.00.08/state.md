# Task State: WG.00.08 / FABLE-19B — Natural Cuts & All-Z Caves on Strata

- **Task ID:** `WG.00.08`
- **WBS ID:** `WG.00.08`
- **Role:** Writer: Claude / Fable (Lane A; Gemini ceased writing in this lane per `BRIEF.md`) | Reviewer: Grok
- **Branch / Worktree:** `task/lane-a` (`C:\Users\snewt\.deus_worktrees\lane-a`)
- **Base Commit:** `d1fbeab`. The 2.2b/2.2c checkpoint is the `[fable] WG.00.08 Criteria 2.2b/2.2c …` commit on `task/lane-a`. The code under test is byte-identical to fix commit `2e4571a` (`git diff 2e4571a HEAD` on DEUS_Levels.js, DEUS_WorldGen.js and the test is empty).
- **Current Gate:** Directive 001 §2.2. 2.2a met (`8d1c7c3`). **2.2b and 2.2c delivered 2026-09-25 (this checkpoint), awaiting Grok review.** 2.2d (Owner ruling DEC-001) and 2.2e (Grok closure verdict) are still owed.

## Owned File Set
- `game/js/plugins/DEUS_Levels.js`
- `game/js/plugins/DEUS_WorldGen.js`
- `tools/test_strata_cuts_and_caves.js`
- `tools/test_generated_z2_cut_proof.js`
- `tasks/WG.00.08/*` (new in this checkpoint: `mutant_kill_roster.md`, `skylight_through_fluid_proof.md`, `probe_skylight_through_fluid.js`, `evidence/*.log`)

No game code, test or data file was changed in this checkpoint.

## What is Done (with Evidence)
1. **Physical clearance & continuous air run**: `continuousAirHeight` and `airRunAt` stop at solid and fluid strata (`!== M_AIR`, DEUS_Levels.js 2906 / 2928). Caught by `clearance_stops_at_fluid`, which kills `air_through_fluid`, `airrun_through_fluid` and `clearance_off_by_one` (commit `2e4571a`, merged `31676cf`).
2. **Fluid-safe carving**: shafts and skylights refuse columns holding fluid strata (`fluidIn` pre-scan at 2498 / 2514, before any write) and turn only solid strata to air (commit `2e4571a`).
3. **Targeted Z-2 Cut Proof (2.2a)**: `tools/test_generated_z2_cut_proof.js`, seed 18, ravine #4 at (194, 89), all 7 checks passed (exit 0). Map proof `game/test_output/z2_cut_proof_seed18_194_89.png`. Carried over from the previous checkpoint and not re-run in this session.
4. **2.2b: 27-mutant roster** → `tasks/WG.00.08/mutant_kill_roster.md`.
   - One cited run: `node tools/test_strata_cuts_and_caves.js --mutants` on `d1fbeab`, 2026-09-25T16:33:08-05:00, 1387 s. Result: `MUTANTS: 27/27 caught by a named check (exit 1)`, driver exit 0. Log `evidence/mutants_run_d1fbeab.log`.
   - Every mutant exits 1 with at least one named FAIL, and in every row the designated check appears in the observed failed list. Examples: `clearance_stops_at_fluid` for `air_through_fluid` / `airrun_through_fluid` / `clearance_off_by_one`; `shafts_keep_fluid` for `shaft_through_fluid` / `skylight_through_fluid`.
   - Baseline on the same HEAD: `node tools/test_strata_cuts_and_caves.js` → `RESULT: 28 passed, 0 failed (exit 0)`, 247.4 s. That includes `fluid_suite` (36/36, 5/5 mutants) and `foundation_suite` (26/26). Log `evidence/baseline_run_d1fbeab.log`.
5. **2.2c: `skylight_through_fluid` six-point proof** → `tasks/WG.00.08/skylight_through_fluid_proof.md`.
   - Seed 18 **does** reach the skylight carve loop (3 skylights, 15 columns carved). It never reaches one with fluid in the column. Networks #4, #7 and #11 have ≤ 1 stratum of rock above the chamber's planned roof, so the suite plants no skylight water (0 strata), and #10 is refused by `skylightMax` (13 > 10). On seed 18 the mutant writes exactly what the fix writes. This corrects the brief's wording "never reached the carve".
   - Seed 3's two eligible skylights (#2 at (103,216), #3 at (190,232)) carry 10 planted water strata over 5×5 + 5×1 = **30** rock strata. The mutant carves all 30 and the water survives with nothing under it. The suite reports `FAIL shafts_keep_fluid … total rock strata under water: 30 … rock at 15 ft carved below the water` and `RESULT: 25 passed, 1 failed (exit 1)`. Log `evidence/mutant_skylight_through_fluid_d1fbeab.log`.
   - With seed 18 as both seeds (`--seed2=18`), `shafts_keep_fluid` FAILs as vacuous (0 rock strata under water), so the check cannot pass on a seed set without a skylight fixture. Log `evidence/seed2_18_vacuity_d1fbeab.log`.
   - Real code on seeds 18/3/21/4: every planted water stratum kept, 0 of 0/30/57/54 rock strata under it carved. Fluid census generator 4 → 5: 406/386/408/400 strata unchanged, 0 fluid resting on air, 0 strata carved below a fluid. The census was shown able to fail (self-test exit 1). Logs `evidence/probe_*.log`.
   - Evidence tool: `tasks/WG.00.08/probe_skylight_through_fluid.js` (read-only). It reuses the suite's own harness, mutants and water-planting text by slicing the test file at run time.

## Exact Next Step
- Grok: adversarial review of the 2.2b roster and the 2.2c proof (rerun the commands in each file's "Reproduce" section), then the closure verdict (2.2e).
- Owner: ruling on DEC-001 / A10-1 in `docs/OWNER_DECISIONS.md` (2.2d).
- Gemini: integrate `task/lane-a` and route the proposed findings below. The coordinator sets WBS status; this lane does not.

## Open Defects / Questions
- ATK-19B-001: CLOSED by Grok on `2e4571a` / `689aff8`.
- ATK-19B-002: CLOSED by Grok on `2e4571a` / `689aff8`.
- **Proposed A-2.2c-1 (MINOR, not filed in `defects.jsonl`):** `carveVoid`'s fluid pre-scan covers `[F, C)` only. A fluid lying exactly at the void's planned top `C` under rock would not be seen, and the strata under it would be carved. Not observed on seeds 18/3/21/4, including with the pocket locks removed (`pockets_unprotected` census clean). Fix idea: scan `[F, C]` inclusive. This is a code change needing a task.
- **Proposed A-2.2c-2 (MINOR, comment only):** DEUS_Levels.js 2646–2647 says a cut carves "fluids included", but the code skips a column holding a fluid. `UF_Levels.md` is correct.
- **Test-strength gaps (from the roster):** `z0_to_z1_exposure` fails only under `no_features`, because the `no_exposure` mutant does not make it fail (cause not investigated). `cost` and `save_load` have no dedicated mutant. `fluid_suite` and `foundation_suite` do not run under mutants by design, and the foundation suite's own 23 mutants were not run in this session.
- The +2 massif fill (DEUS_Levels.js 2402) has no fluid test. It relies on generation putting no fluid at e ≥ 21 (none on the four seeds).
- The 2.2c text of Directive 001 is not in this repository. The six points follow `BRIEF.md`'s scope. Grok or the coordinator should confirm they match the directive.

## Relevant Commands
```bash
node tools/test_strata_cuts_and_caves.js --mutants                               # 2.2b: 27/27, ~23 min
node tools/test_strata_cuts_and_caves.js                                         # baseline incl. P/Q suites, ~4 min
node tools/test_strata_cuts_and_caves.js --mutant=skylight_through_fluid         # 2.2c kill, exit 1
node tools/test_strata_cuts_and_caves.js --seed2=18 --no-suites                  # 2.2c: seed 18 alone -> shafts_keep_fluid FAIL
node tasks/WG.00.08/probe_skylight_through_fluid.js --seeds=18,3,21,4            # 2.2c per-seed numbers + fluid census
node tasks/WG.00.08/probe_skylight_through_fluid.js --seeds=18 --census-mutant=probe_self_test   # census can fail (exit 1)
node tools/test_generated_z2_cut_proof.js                                        # 2.2a
```
