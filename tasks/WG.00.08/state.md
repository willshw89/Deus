# Task State: WG.00.08 / FABLE-19B — Natural Cuts & All-Z Caves on Strata

- **Task ID:** `WG.00.08`
- **WBS ID:** `WG.00.08`
- **Role:** Writer: Claude / Fable (Lane H, Directive 001-I §B; earlier checkpoints were Lane A) | Reviewer: Grok
- **Branch / Worktree:** `task/lane-h` (`C:\Users\snewt\.deus_worktrees\lane-h`)
- **Base Commit:** `a12f94a7` (main when Lane H launched). Main has since moved to `f21e3bb5`; `git diff a12f94a7 f21e3bb5` touches `docs/STATUS.md` only, and `git diff main -- game/` is empty in this worktree, so the game code under test is main's.
- **Current Gate:** Directive 001 §2.2. 2.2a (the targeted Z-2 proof) **re-delivered by Lane H 2026-09-25: exits 0 on main's game code, 8/8 mutants caught (this checkpoint), awaiting Grok / PM review.** 2.2b and 2.2c delivered at `9f320da`; the 001-F `shaft_prescan_removed` follow-up delivered at `a14ee832` (both merged to main). DEC-001 (2.2d): Option 1 accepted in principle, SUSPENDED pending a passing proof; the Owner's fluid ruling is recorded. 2.2e (Grok closure verdict) is still owed.

## Owned File Set (Lane H whitelist, `BRIEF.md` §1)
- `tools/test_generated_z2_cut_proof.js`
- `tasks/WG.00.08/*` (documentation, logs, evidence only)

No engine, game data or plugin file changed in this checkpoint. No engine defect was found.

## Lane H: Z-2 Cut Proof Hardening & Fluid Ruling Alignment (Directive 001-I §B)

### The defect
The test as committed on main (`a12f94a7`, blob `c664372b`) exits 1: `[FAIL] fluid_preserved_no_under_carves: 44 air carves found under fluid columns`. Log: `evidence/z2proof_original_test_a12f94a.log` (2026-09-25T23:18:17-05:00, exit 1, 17 s).

Why it failed: for every fluid stratum in the 61 × 61 cells round (194, 89) it counted every **non-solid** stratum anywhere below it, so it counted fluid under fluid and voids behind solid rock as "carves". Its 44 hits are 12 fluid columns at (209–210, 74–75), (209–210, 87–88) and (220–221, 87–88). Each column is 2 water strata (6 ft and 7 ft) on rock at 5 ft:
- 12 hits: the 7 ft water over the 6 ft water (fluid on fluid, normal under DEC-001).
- 32 hits: in the 4 columns (209–210, 87–88), the 6 ft and 7 ft water over a void at 1–4 ft with rock at 5 ft between (4 columns × 2 × 4; compliant under DEC-001).
- 0 hits of fluid directly on air.

The new audit reports the same 24 fluid strata in that 61 × 61 window: on fluid 12, on solid 12 (4 of them over a lower void), directly on air 0 (baseline log §4).

### Binding ruling
Owner, 2026-09-25, `docs/OWNER_DECISIONS.md` DEC-001: *Fluid may sit above a void only with >= 1 solid layer between; fluid directly on air is a defect; fluid on fluid is normal.*

### What changed in `tools/test_generated_z2_cut_proof.js` (blob `c664372b` → `1a8d963a`)
It runs the real plugins in Node vms with RMMZ stubs, three times on seed 18 (generator 5):
- **natural:** the sources as they are.
- **probed:** three read-only probe calls in `carveNaturalFeatures` (before any feature, before the cut carve, after it) copy the strata and the cut plan. The probed run's final strata and descriptors must equal the natural run's (`probe_read_only`).
- **fixture:** before the cut carve, water is planted on the rock top of 6 ravine columns the cut is about to carve. Seed 18 puts no fluid in the ravine's path by itself (ravine footprint: 0 fluid strata), so without the fixture the carve's fluid skip is never reached.

Probes, fixture and mutants are in-memory source edits. Nothing under `game/` is written except the map PNG.

| Brief item | Check(s) | What it asserts (node `assert`; each prints PASS or FAIL) |
|---|---|---|
| 1. Fluid rule | `fluid_rests_on_support` | No fluid stratum at e with air at e − 1, over the whole start area (256 × 256), in the natural and fixture runs. Fluid on fluid, and fluid on solid with a void lower down, pass. It fails if the area holds no fluid. |
| 2. Ravine identity | `ravine_identity` | Exactly one cut descriptor has (194, 89) as its deepest cell. It must be: kind `cut`, type `ravine`, depthClass `z2`, floorLevel −2, minFloor = the column's first air (3 ft), form `line`, profile `u`, a family with a ravine weight, cells > 0, anchor inside the area. Every descriptor's id must equal its index, and the probed run's cut plan must give (194, 89) to the same id. |
| 3a. Whole footprint | `ravine_footprint_matches_plan` | Every column the plan gives the ravine is air from its planned floor to its rock top and unchanged below, or wholly unchanged if it holds a fluid in that interval. No column outside every cut's plan changed. Carved columns = the descriptor's `cells`. Checked on the probed and fixture runs; all planted columns must be kept. |
| 3b. Fluid conservation | `fluid_conserved_across_cut` | Every fluid stratum before the cut carve is the same byte after generation, and none is added. Checked over the whole area, from before any feature, before the cut carve and after it (probed run), and in the fixture run with its 6 planted strata counted in the footprint. |
| 3c. No floating solids | `no_floating_solids` | Every solid stratum is joined through solid strata (6 faces) to bedrock (e = 0) or the area edge, which is the generator's own floating-mass rule, computed independently. It fails if there is no overhang round the ravine to audit. |
| Column / Z state | `first_air_is_3ft`, `z_minus2_is_floor`, `z_minus1_is_open`, `z0_is_open`, `z_plus1_z_plus2_open` | (194, 89): first air 3 ft; Z-2 floor HEIGHT_3_OF_5; Z-1 and Z0 open HEIGHT_0_OF_5; Z+1 and Z+2 open. |
| Harness | `probe_read_only`, `no_vm_errors` | The probes change nothing. No `console.error` in any of the 3 runs. |
| 4. Visual proof | (output gate) | `game/test_output/z2_cut_proof_seed18_194_89.png` is written only when every check passes, with PASS stamped top left. A failing non-mutant run deletes a stale copy. Mutant runs never touch it. |
| 5. Mutants | `--mutant=<name>`, `--mutants` | 8 built-in mutants: the brief's 5, plus `pool_undercut`, `probe_perturbs` and `error_injected`, so every check has a mutant. `--mutants` runs each in its own process (4 at a time). A mutant counts as caught only when it exits 1 **and** its designated check is among the FAIL lines. |

Exit codes: 0 all passed; 1 a check failed (with `--mutants`: a mutant not caught); 2 harness problem (a mutant or probe target not found or not unique in the source, a probe that did not fire, an uncaught error).

### Evidence table (runs of 2026-09-25, test blob `1a8d963a`, node v24.19.0, game/ = main `f21e3bb5`)

**Baseline:** `node tools/test_generated_z2_cut_proof.js`, started 23:25:40-05:00, **exit 0** (39 s), `RESULT: 12 passed, 0 failed (exit 0)`. Log: `evidence/z2proof_baseline_1a8d963a.log`.

| Check | Baseline detail (copied from the log) |
|---|---|
| `first_air_is_3ft` | PASS - first air at 3 ft (Z-2 S3) |
| `z_minus2_is_floor` | PASS - Z-2 shape=floor height=HEIGHT_3_OF_5 |
| `z_minus1_is_open` | PASS - Z-1 shape=open height=HEIGHT_0_OF_5 |
| `z0_is_open` | PASS - Z0 shape=open height=HEIGHT_0_OF_5 |
| `z_plus1_z_plus2_open` | PASS - Z+1 shape=open, Z+2 shape=open |
| `ravine_identity` | PASS - cut #6: kind cut, type ravine, depthClass z2, family TEMP, floorLevel -2, minFloor 3 ft, deepest (194, 89), anchor (201, 96), 257 cells, length 56, line/u |
| `ravine_footprint_matches_plan` | PASS - probed: cut #6, 257 planned columns, 257 carved to plan (= descriptor), 0 kept for a fluid, 0 off plan, 0 changed outside the plans; fixture: 251 carved, 6 kept (the 6 planted), 0 off plan |
| `fluid_rests_on_support` | PASS - natural: 406 fluid strata, 0 on air (on fluid 203, on solid 203 of which 66 over a lower void through >= 1 solid; 61 x 61: 24 strata, 4 over a lower void); fixture: 412 strata, 0 on air |
| `fluid_conserved_across_cut` | PASS - probed: 406 fluid strata before the cut carve (61 x 61: 24, ravine footprint: 0), the same after generation (0 lost, 0 added, also from before any feature); fixture: 412 strata incl. 6 planted in the ravine's carve path, 0 lost, 0 added |
| `no_floating_solids` | PASS - 60463 solid strata with air or fluid right under them in the area (2688 round the ravine and the 61 x 61), all grounded; 0 floating |
| `probe_read_only` | PASS - 1638400 strata and the feature descriptors identical |
| `no_vm_errors` | PASS - 0 errors (warnings: 0/0/0) |

Fixture plantings (baseline log §3): (189, 77), (192, 82), (193, 87), (200, 91) and (204, 97) at 15 ft; (199, 114) at 10 ft. Each is water on rock that the cut is about to carve.

**Map:** `game/test_output/z2_cut_proof_seed18_194_89.png`, 4744 bytes, 512 × 512, written by the baseline run at 23:26:19-05:00. A byte-identical copy (sha256 `e75b6251…`) is committed as `evidence/z2_cut_proof_seed18_194_89_1a8d963a.png`, because `game/test_output/` is git-ignored. I opened it. Top left: a green "PASS" on a black box. Centre: a dark-purple strip (exposed Z-2 floor) runs from NW to SE through the yellow target cell and its red crosshair at (194, 89). Grey-brown strips (exposed Z-1) continue the ravine north and south and form a second channel to the SE. Around them: green Z0 / +1 ground and light-grey +2 massifs. No blue: seed 18's water near the target lies under rock (6–7 ft, rock above), so the top-down map does not show it. The 8 mutant runs that followed did not touch the file (timestamp unchanged).

**Mutant sweep:** `node tools/test_generated_z2_cut_proof.js --mutants`, started 23:25:43-05:00 (it ran concurrently with the baseline), driver **exit 0** (91 s), `MUTANTS: 8/8 caught by their designated check (exit 1) (92 s)`. Log: `evidence/z2proof_mutants_1a8d963a.log`.

**Per-mutant full runs:** `node tools/test_generated_z2_cut_proof.js --mutant=<name>`, started 23:27:25–23:28:16-05:00, 4 at a time. Logs: `evidence/z2proof_mutant_<name>_1a8d963a.log`. The sweep prints check names only; the FAIL details below come from these runs (same blob, separate processes). In both the sweep and the individual runs, every mutant exits 1 with the same failed-check list.

| # | Mutant (`--mutant=`) | Edit (in memory, DEUS_Levels.js on main) | Designated check | Exit | RESULT | All failed checks | Designated FAIL detail (trimmed from the log) |
|---|---|---|---|---|---|---|---|
| 1 | `cut_carve_disabled` | cut carve loop (2649–2650) skips every column | `ravine_footprint_matches_plan` | 1 | 5 passed, 7 failed | first_air_is_3ft, z_minus2_is_floor, z_minus1_is_open, z0_is_open, z_plus1_z_plus2_open, ravine_identity, ravine_footprint_matches_plan | probed: ravine columns off plan [(190, 72) planned air 13..15 ft, stratum 13 ft is 1 (was 1); …]: 257, expected 0 |
| 2 | `floor_capped_zminus1` | carve floor clamped to Z-1 S0, `max(cutTop, 5)` (2649) | `z_minus2_is_floor` | 1 | 7 passed, 5 failed | first_air_is_3ft, z_minus2_is_floor, z_minus1_is_open, ravine_identity, ravine_footprint_matches_plan | Z-2 shape: "solid", expected "floor" |
| 3 | `fluid_skip_removed` | `if (fluid) continue;` (2653) deleted | `fluid_conserved_across_cut` | 1 | 10 passed, 2 failed | ravine_footprint_matches_plan, fluid_conserved_across_cut | fixture, before the cut carve -> final: fluid strata lost 6, added 0 [(199, 114) 10 ft 4 -> 0; (189, 77) 15 ft 4 -> 0; …]: 6, expected 0 |
| 4 | `cut_type_renamed` | descriptor (2563) reports type `canyon`, depthClass `deep` | `ravine_identity` | 1 | 11 passed, 1 failed | ravine_identity | type: "canyon", expected "ravine" |
| 5 | `floating_slab_left` | a 1 ft stone slab set in the z2 cut's open air, after the floating-mass removal (before 2725) | `no_floating_solids` | 1 | 11 passed, 1 failed | no_floating_solids | solid strata not grounded (1 of them with air or fluid right under) [(190, 72) 16 ft over air]: 1, expected 0 |
| 6 | `pool_undercut` | a fluid column (2653) gets the rock under its fluid carved | `fluid_rests_on_support` | 1 | 10 passed, 2 failed | ravine_footprint_matches_plan, fluid_rests_on_support | fixture: fluid strata directly on air [(189, 77) fluid at 15 ft on air at 14 ft; … (199, 114) fluid at 10 ft on air at 9 ft]: 6, expected 0 |
| 7 | `probe_perturbs` (harness) | the probe writes one stratum (cell 0, 24 ft) | `probe_read_only` | 1 | 11 passed, 1 failed | probe_read_only | strata differing between the natural and probed runs first at (0, 0) 24 ft: 1, expected 0 |
| 8 | `error_injected` (harness) | `carveNaturalFeatures` (2123) logs a `console.error` | `no_vm_errors` | 1 | 11 passed, 1 failed | no_vm_errors | natural run console.error count [MUTANT error_injected]: 1, expected 0 |

Mutants 1–5 are the brief's five (§3.5). Each check in the file has at least one mutant that makes it FAIL: the Z-state checks under 1 and 2, `ravine_footprint_matches_plan` under 1, 2, 3 and 6. No run printed a `HARNESS` line (exit 2).

### Limits / not done
- Not run in the RMMZ editor (F5). Under DEC-001 Option 1 the Node run plus the map is the gate, and the interactive check moves to the Slice 1 review. That option is still SUSPENDED pending this passing proof and PM review.
- One seed (18), one area (the start area, 256 × 256). The fluid audit, fluid conservation and floating-solid checks cover that whole area. The table's 61 × 61 figures are only a reporting window.
- Seed 18's ravine holds no fluid by itself (footprint: 0 fluid strata), so the carve's fluid skip is exercised only by the fixture's 6 planted columns. It is the fixture that makes `fluid_skip_removed` and `pool_undercut` fail.
- `no_floating_solids` counts the area edge as ground (the generator's rule). A mass joined only to the edge would pass.
- A fluid stratum at e = 0 is reported as "on the model floor", not as on air or on solid. Seed 18 has none.
- The mutant table's line numbers are those of DEUS_Levels.js on main (`a12f94a7` = `f21e3bb5` for that file). The mutants find their targets by exact text, not by line.
- The `--mutants` driver's own total (92 s, from `Date.now`) and the wrapper's (91 s, whole seconds from `date +%s`) differ by rounding.
- Proposed A-2.2c-2 still stands: the comment at DEUS_Levels.js 2646 says the cut carve takes "fluids included", but the code skips any column with a fluid (2651–2653, the skip this proof tests). The fix is an engine comment edit, outside this lane's whitelist.

## What is Done (with Evidence; earlier checkpoints, Lane A)
1. **Physical clearance & continuous air run:** `continuousAirHeight` and `airRunAt` stop at solid and fluid strata (`!== M_AIR`, DEUS_Levels.js 2906 / 2928). Caught by `clearance_stops_at_fluid`, which kills `air_through_fluid`, `airrun_through_fluid` and `clearance_off_by_one` (commit `2e4571a`, merged `31676cf`).
2. **Fluid-safe carving:** shafts and skylights refuse columns holding fluid strata (`fluidIn` pre-scan at 2498 / 2514, before any write) and turn only solid strata to air (commit `2e4571a`).
3. **Targeted Z-2 Cut Proof (2.2a):** superseded by the Lane H section above. The earlier version exited 1 on main (44 false "under-carves"; PM verdict REJECT, DEC-001).
4. **2.2b: mutant roster, now 28** → `tasks/WG.00.08/mutant_kill_roster.md` (revision 2; revision 1's 27/27 is kept in its history table).
   - One cited run: `node tools/test_strata_cuts_and_caves.js --mutants` on `9f320da` with test blob `47052c30`, 2026-09-25T17:56:26-05:00, 1146 s. Result: `MUTANTS: 28/28 caught by a named check (exit 1)`, driver exit 0. Log `evidence/mutants_run_47052c3.log`.
   - Every mutant exits 1 with at least one named FAIL, and in every row the designated check appears in the observed failed list.
   - Baseline on the same sources: `RESULT: 28 passed, 0 failed (exit 0)`, 222.9 s, including `fluid_suite` (36/36, 5/5 mutants) and `foundation_suite` (26/26). Log `evidence/baseline_run_47052c3.log`.
   - Not re-run in the Lane H session.
5. **2.2c: `skylight_through_fluid` six-point proof** → `tasks/WG.00.08/skylight_through_fluid_proof.md`. Seed 3's two eligible skylights carry 30 rock strata under planted water, and the mutant carves all 30 (`evidence/mutant_skylight_through_fluid_d1fbeab.log`). Not re-run in the Lane H session.
6. **Directive 001-F §3: `shaft_prescan_removed`**: caught by the strengthened `shafts_keep_fluid` (`evidence/mutant_shaft_prescan_removed_47052c3.log`), commit `a14ee832`, merged to main. Not re-run in the Lane H session.

## Exact Next Step
- Grok / PM: review `task/lane-h` (the Lane H section above: the fluid rule, the checks, and the 8 mutants), then give the 2.2a verdict and the 2.2e closure verdict.
- Owner: with a passing proof, lift DEC-001's suspension (Option 1) or keep it.
- Gemini: integrate `task/lane-h` if approved. The coordinator sets WBS status; this lane does not.

## Open Defects / Questions
- ATK-19B-001: CLOSED by Grok on `2e4571a` / `689aff8`.
- ATK-19B-002: after its CLOSED records, `defects.jsonl` reopens it (OPEN, 2026-09-25T21:05Z, "Shaft guard untested (F2)"). Its closure criterion is `shaft_prescan_removed` caught on `test_strata_cuts_and_caves.js`, delivered at `a14ee832` and awaiting Grok's closure.
- **Proposed A-2.2c-1 (MINOR, not filed):** `carveVoid`'s fluid pre-scan covers `[F, C)` only. A fluid lying exactly at the void's planned top `C` under rock would not be seen. Not observed on seeds 18/3/21/4. Fix idea: scan `[F, C]` inclusive (a code change needing a task).
- **Proposed A-2.2c-2 (MINOR, comment only):** see Lane H Limits.
- **Observation (not filed):** the unconnected-solid removal (DEUS_Levels.js 2695–2724) has no fluid test of its own (`evidence/diag_swiss_cheese_floating_47052c3.log`). Lane H's `no_floating_solids` checks that removal's result (no floating solid), not its effect on fluid. On seed 18 the whole-area fluid conservation holds across it (0 lost, 0 added from after the cut carve to the final strata).
- **Test-strength gaps (from the roster):** `z0_to_z1_exposure` fails only under `no_features`; `cost` and `save_load` have no dedicated mutant; the shaft half of `shafts_keep_fluid` rests on seed 18 alone.
- The +2 massif fill (DEUS_Levels.js 2402) has no fluid test. It relies on generation putting no fluid at e ≥ 21 (none on the four seeds).

## Relevant Commands
```bash
node tools/test_generated_z2_cut_proof.js                                        # 2.2a (Lane H): 12/12, exit 0, ~40 s, writes the PASS map
node tools/test_generated_z2_cut_proof.js --mutants                              # 8/8 caught, driver exit 0, ~90 s
node tools/test_generated_z2_cut_proof.js --mutant=fluid_skip_removed            # one mutant, full output, exit 1
node tools/test_strata_cuts_and_caves.js --mutants                               # 2.2b: 28/28, ~19-23 min
node tools/test_strata_cuts_and_caves.js                                         # baseline incl. P/Q suites, ~4 min
node tools/test_strata_cuts_and_caves.js --mutant=shaft_prescan_removed          # 001-F kill, exit 1
node tasks/WG.00.08/probe_skylight_through_fluid.js --seeds=18,3,21,4            # per-seed numbers (skylight + shaft) + fluid census
```
