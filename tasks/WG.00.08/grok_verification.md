# WG.00.08 Lane H — independent verification

**Verdict: PASS**

Reviewer: Grok. Date: 2026-09-25. Subject: `task/lane-h` at `c8694f01cfce9c65301b83b49a1bc35d709a7f67` (blob of `tools/test_generated_z2_cut_proof.js`: `1a8d963aee035cfbee17d9decbd713fe547cfce7`). Node: v24.19.0.

The Z-2 proof matches DEC-001, the baseline and the eight mutants reproduce on the committed file bytes, and the committed evidence matches those runs. The check was aligned to the Owner ruling. It was not loosened past that ruling to force a green baseline.

## 1. `fluid_rests_on_support` vs DEC-001

Owner ruling (`docs/OWNER_DECISIONS.md`, DEC-001, 2026-09-25): fluid may sit above a void only with >= 1 solid layer between; fluid directly on air is a defect; fluid on fluid is normal.

The check (`tools/test_generated_z2_cut_proof.js`, `fluidSupport` + `fluid_rests_on_support`) classifies every fluid stratum in the whole start area:

- Fluid at elevation `e` whose byte at `e - 1` is neither solid nor fluid increments `onAir`. The check fails when `onAir` is not 0, on the natural run and on the fixture run.
- Fluid on fluid increments `onFluid` and passes.
- Fluid on solid increments `onSolid` and passes, including when a non-solid, non-fluid stratum sits lower in the column (`onSolidOverVoid`). One solid stratum at `e - 1` is the required layer between the fluid and that lower void.
- The predicates match `DEUS_Levels.js` `SOLID_B` / `FLUID_B` for ids 1–5: solid is stone/soil/wood, fluid is water/lava, and the constructed bit `0x80` and the `0x40` bit are excluded from fluid, as in the engine.

The assertion is over all 256 × 256 columns, with `strata > 0` and at least one planted fixture column required, so an empty area cannot pass. Seed 18's natural area has 406 fluid strata: 203 on fluid, 203 on solid, 66 of those over a lower void, 0 on the model floor, 0 on air. The 61 × 61 window has 24 strata: 12 on fluid, 12 on solid, 4 over a lower void, 0 on air.

The previous proof (`a12f94a7`, blob `c664372b`, log `evidence/z2proof_original_test_a12f94a.log`) counted every non-solid stratum anywhere below a fluid and printed it as "air". Its 44 hits are the 12 fluid columns in that window, two water strata each (6 ft and 7 ft). Fresh baseline column strings:

| Columns | Strata `e = 0..24` | What is under the water |
|---|---|---|
| (209, 74), (210, 74), (209, 75), (210, 75), (220, 87), (221, 87), (220, 88), (221, 88) | `######~~..######.........` or `######~~..#..............` | 7 ft water on 6 ft water on rock |
| (209, 87), (210, 87), (209, 88), (210, 88) | `#....#~~..#..............` | 6 ft water on rock at 5 ft; air at 1–4 ft below that rock |

That is 12 hits of fluid on fluid, plus 4 columns × 2 water strata × 4 air feet under the rock = 32 hits of a void behind solid. 12 + 32 = 44. Zero of the 44 are fluid with air at `e - 1`. The same 24 strata are what the new audit reports. Rejecting those 44 was stricter than DEC-001. Counting only air at `e - 1` is the ruling.

`pool_undercut` carves the rock under a fluid and is caught by this check (fixture: 6 strata directly on air, including `(189, 77)` fluid at 15 ft on air at 14 ft and `(199, 114)` fluid at 10 ft on air at 9 ft).

Two boundaries are real and do not carry the pass on seed 18:

- A fluid at `e = 0` is counted as on the model floor, because there is no stratum at `e - 1`. Seed 18 has 0.
- `no_floating_solids` treats the area edge as ground. That is the generator's own rule (`DEUS_Levels.js` floating-mass removal, the same 6-connected flood from bedrock `e = 0` and the area edge). An interior slab is still a failure: `floating_slab_left` leaves stone at `(190, 72)` 16 ft over air and fails `no_floating_solids`.

## 2. Fresh runs

Clean clone: `C:\Users\snewt\AppData\Local\Temp\lane-h-c8694f01`, `git clone --shared --branch task/lane-h` of the DEUS repo, detached at `c8694f01`. This machine's system Git config has `core.autocrlf=true`. The DEUS repo config has `core.autocrlf=false`, and a clone does not copy that local setting. There is no `.gitattributes` `eol` rule.

### 2a. Checkout as the clone created it (CRLF working tree)

`game/js/plugins/DEUS_Levels.js` on disk: 351578 bytes, 5719 CR. The git blob is LF, 345859 bytes, 0 CR (`f500eb496cf7`).

| Run | Process exit | Result |
|---|---|---|
| `node tools/test_generated_z2_cut_proof.js` | **0** (43.5 s) | `RESULT: 12 passed, 0 failed (exit 0)` |
| `--mutant=cut_carve_disabled` | **2** | `HARNESS mutant cut_carve_disabled: target not found in DEUS_Levels.js` (the anchor contains a LF newline). No named check ran. |
| `--mutant=floor_capped_zminus1` | **2** | Same harness miss. |
| `--mutant=fluid_skip_removed` | **2** | Same harness miss (`if (fluid) continue;\n`). |
| `--mutant=cut_type_renamed` | **1** | `RESULT: 11 passed, 1 failed (exit 1) - ravine_identity`. Detail: `type: "canyon", expected "ravine"`. |
| `--mutant=floating_slab_left` | **1** | `RESULT: 11 passed, 1 failed (exit 1) - no_floating_solids`. Detail: `(190, 72) 16 ft over air`. |
| `--mutants` | **1** (49.5 s) | `MUTANTS: 3/8 caught by their designated check (exit 1) (49 s)`. Caught: `cut_type_renamed`, `floating_slab_left`, `probe_perturbs`. The other five exited 2 because their anchors contain a LF newline. |

The baseline PASS lines match `evidence/z2proof_baseline_1a8d963a.log` exactly, including the fluid-support line (406 strata, 0 on air, 66 over a lower void; fixture 412, 0 on air). The map SHA-256 matches the committed proof PNG:

`E75B62515E538AA8A567C18010A467E68FEF96780756F8C39E26CD60EFA34A8D` (4744 bytes), both `game/test_output/z2_cut_proof_seed18_194_89.png` from this run and `evidence/z2_cut_proof_seed18_194_89_1a8d963a.png`.

CRLF makes the newline anchors miss. The harness then exits 2, and `--mutants` exits 1. A smudged checkout does not produce a green mutant sweep.

### 2b. Same clone, `game/js` rewritten to the commit blobs (LF)

`core.autocrlf` set false in the clone and `game/js` checked out again. `DEUS_Levels.js`: 345859 bytes, CR = 0, LF = 5719, same size as the worktree file whose `git hash-object` equals the blob. Mutant anchors then match.

| Run | Process exit | Named checks that failed | Designated check |
|---|---|---|---|
| `--mutant=cut_carve_disabled` | **1** (child close code in the `--mutants` parent; RESULT line also says exit 1) | `first_air_is_3ft`, `z_minus2_is_floor`, `z_minus1_is_open`, `z0_is_open`, `z_plus1_z_plus2_open`, `ravine_identity`, `ravine_footprint_matches_plan` | `ravine_footprint_matches_plan` (257 columns off plan; first air at (194, 89) is 16 ft) |
| `--mutant=floor_capped_zminus1` | **1** | `first_air_is_3ft`, `z_minus2_is_floor`, `z_minus1_is_open`, `ravine_identity`, `ravine_footprint_matches_plan` | `z_minus2_is_floor` (`Z-2 shape: "solid", expected "floor"`; first air 5 ft) |
| `--mutant=fluid_skip_removed` | **1** | `ravine_footprint_matches_plan`, `fluid_conserved_across_cut` | `fluid_conserved_across_cut` (fixture lost 6 fluid strata, added 0) |
| `--mutant=cut_type_renamed` | **1** (also observed with `Start-Process -Wait` on the CRLF tree, where this single-line anchor still matches) | `ravine_identity` | `ravine_identity` |
| `--mutant=floating_slab_left` | **1** (same direct observation on the CRLF tree) | `no_floating_solids` | `no_floating_solids` |
| `--mutants` | **0** (`Start-Process -Wait`) | — | `MUTANTS: 8/8 caught by their designated check (exit 1) (101 s)` |

The parent's close codes for the other three mutants on that sweep were also 1, with the designated check in the failed list: `pool_undercut` → `fluid_rests_on_support`, `probe_perturbs` → `probe_read_only`, `error_injected` → `no_vm_errors`. No `HARNESS` line on the LF runs.

The five required RESULT lines and the 8/8 summary match `evidence/z2proof_mutant_*_1a8d963a.log` and `evidence/z2proof_mutants_1a8d963a.log`. The evidence header says those logs were taken in the lane-h worktree (LF, repo `core.autocrlf=false`) against this test blob while `game/` was still `a12f94a7`. `git diff a12f94a7 f21e3bb5` and `git diff c8694f01 f21e3bb5 -- game/js/plugins` are empty for the plugins and catalog the proof loads. `c8694f01` itself changes no file under `game/`.

## 3. Directive 001-K

The integrity rule forbids loosening, skipping, or special-casing checks so a failing baseline on real terrain goes green.

What changed is the fluid predicate, from "any non-solid anywhere below a fluid" to "air immediately under a fluid". That is the Owner ruling the lane was told to implement (`BRIEF.md` §3.1), and section 1 shows the 44 old hits are the configurations the ruling allows. The new check is wider in area (the whole 256 × 256, not only the 61 × 61) and it still fails closed: no fluid in the area fails it, and `pool_undercut` fails it.

No coordinate allow-list, no mutant-only skip, no check wrapped so the baseline cannot fail. Every check uses `node:assert` and all twelve run on every non-harness execution. The PNG is written only when every check passes; the fresh PNG matches the committed one. No plugin, engine, or game-data file is in the `c8694f01` diff.

## 4. Limits (do not change the verdict)

- A Windows clone that keeps the system `core.autocrlf=true` checks out CRLF, and five mutants then exit 2. The sweep exits 1. Reproducing the committed 8/8 result needs the blob bytes (LF), which is what this repo's own `core.autocrlf=false` worktree has.
- One seed (18), one start area. Interactive F5 was not part of this verification. DEC-001 Option 1 remains suspended until the Owner lifts it; this file is the proof review, not that lift.
- `e = 0` fluids and edge-grounded solids are outside the strict "air at `e - 1`" / interior-float reading. Seed 18 has no `e = 0` fluid, and the interior-float mutant is caught.
