# WG.00.08: `skylight_through_fluid` six-point proof (exit criterion 2.2c)

- **Leaf:** WG.00.08 / DEUS-TSK-FABLE-19B. **Defect:** ATK-19B-002 (shafts and skylights carve rock below a fluid or destroy it).
- **Writer:** Claude / Fable (Lane A, branch `task/lane-a`). **Date:** 2026-09-25.
- **Code under proof:** `game/js/plugins/DEUS_Levels.js` at HEAD `d1fbeab`. It is byte-identical to fix commit `2e4571a`: `git diff 2e4571a HEAD` on DEUS_Levels.js, DEUS_WorldGen.js and the test is empty. Line numbers below are from that file.
- **The six points.** The text of Directive 001 that defines criterion 2.2c is not in this repository (searched `docs/`, `tasks/`, `prompts/` and the canonical checkout). The six points therefore follow the scope in `BRIEF.md`, in this order: (1) what the mutant is, (2) seed 18, (3) seed 3, (4) the kill, (5) the shaft and skylight guards, (6) fluid conservation across the whole generator and the clearance queries.

## Evidence runs (all on HEAD `d1fbeab`, 2026-09-25; no tracked file modified; the only extra files were this task's new, untracked files under `tasks/WG.00.08/`)
| Tag | Command | Result | Log (committed copy) |
|---|---|---|---|
| **R1** | `node tools/test_strata_cuts_and_caves.js --mutants` | 27/27 caught; `skylight_through_fluid: exit 1; failed: shafts_keep_fluid` | `evidence/mutants_run_d1fbeab.log` |
| **R2** | `node tools/test_strata_cuts_and_caves.js` | 28 passed, 0 failed (exit 0) | `evidence/baseline_run_d1fbeab.log` |
| **R3** | `node tools/test_strata_cuts_and_caves.js --mutant=skylight_through_fluid` | 25 passed, 1 failed (exit 1): `shafts_keep_fluid` | `evidence/mutant_skylight_through_fluid_d1fbeab.log` |
| **R4** | `node tools/test_strata_cuts_and_caves.js --seed2=18 --no-suites` | 24 passed, 2 failed (exit 1): `different_seeds_differ`, `shafts_keep_fluid` | `evidence/seed2_18_vacuity_d1fbeab.log` |
| **R5** | `node tasks/WG.00.08/probe_skylight_through_fluid.js --seeds=18,3,21,4` | exit 0 | `evidence/probe_skylight_d1fbeab.log` |
| **R6** | `node tasks/WG.00.08/probe_skylight_through_fluid.js --seeds=18 --census-mutant=probe_self_test` | exit 1 (the census failing, as intended) | `evidence/probe_census_self_test_d1fbeab.log` |
| **R7** | `node tasks/WG.00.08/probe_skylight_through_fluid.js --seeds=18,3,21,4 --census-mutant=pockets_unprotected` | exit 0 | `evidence/probe_census_pockets_unprotected_d1fbeab.log` |

The probe (`tasks/WG.00.08/probe_skylight_through_fluid.js`, new in this commit) changes nothing on disk. At run time it slices the suite file and reuses the suite's own vm `setup`/`newWorld`, its `MUTANTS` table and the exact water-planting text of `shafts_keep_fluid`, so its numbers are the check's own numbers, split by seed. It adds one diagnostics block that records, per skylight, which eligibility condition refused it. It also adds a fluid census of the uninstrumented worlds.

---

## Point 1: the mutant is the pre-fix skylight and differs from the fix only where a fluid lies in the column

The fixed skylight (DEUS_Levels.js 2513–2518):
```js
if (!solidE(i, nd.F - 1) || fluidIn(i, nd.F, top[i])) return;                       // 2514: scan first, write nothing
let changed = false;
for (let e = nd.F; e < top[i]; e++) if (SOLID_B[getE(i, e)] === 1) { setE(i, e, M_AIR); changed = true; }   // 2516: solid only
```
The mutant (test line 118–119) restores, character for character, the lines that `git show 2e4571a` removes:
```js
if (!solidE(i, nd.F - 1)) return;
let changed = false;
for (let e = nd.F; e < top[i]; e++) if (getE(i, e) !== M_AIR) { if (FLUID_B[getE(i, e)] === 1) return; setE(i, e, M_AIR); changed = true; }
```
The old loop walks up from the chamber floor and turns every non-air stratum to air. It stops only when it reaches a fluid, and by then every rock stratum below that fluid is already air. On a column with no fluid in `[nd.F, top[i])` the two versions write the same strata, because every non-air stratum there is solid. **The mutant is therefore observable only on a skylight column that passes the eligibility gate (2509–2512), has a solid floor stratum `nd.F − 1`, and holds a fluid above at least one rock stratum inside `[nd.F, top[i])`.** On the two seeds the check uses, no natural fluid lies in a skylight column. The real generator carved every disc column of every eligible skylight: 15 on seed 18 (point 2) and 10 on seed 3 (point 3). `fluidIn` would have skipped any column holding fluid. So `shafts_keep_fluid` plants the fluid itself (test 951–1008). It copies the skylight gate (test 964), then plants water in the top rock stratum `e = top[i] − 1` of each disc cell. It does this only when `e > from = nd.F + nd.h`, meaning at least one rock stratum lies between the chamber's planned roof and the planted water (test 968–973). It records those rock strata as `solid`.

## Point 2: seed 18 never reached a skylight carve with fluid in the column

**This corrects the brief's wording.** Seed 18 does reach the skylight carve loop: the real generator carves three skylights of 5 columns each. What seed 18 never reaches is a skylight carve with water in the column, which is the only case in which the mutated line behaves differently (point 1).

R5, seed 18 (copied):
```
CARVED seed 18 (real, uninstrumented): cave networks 15, shafts 1, skylights carved 3 [{"network":4,"x":73,"y":155,"floor":15,"cells":5},{"network":7,"x":30,"y":206,"floor":10,"cells":5},{"network":11,"x":215,"y":208,"floor":5,"cells":5}]
SKYLIGHTS seed 18: networks 15 (by level {"0":3,"1":3,"2":2,"-1":4,"-2":3}), rolled a skylight 4, eligible 3
  network #4 level 1: node (73,155) floor F 15 ft, h 5 ft; overburden top-(F+h) per disc cell [1,1,1,1,1] (skylightMax 10); ELIGIBLE: the carve loop runs
  network #7 level 0: node (30,206) floor F 10 ft, h 5 ft; overburden top-(F+h) per disc cell [1,1,1,1,1] (skylightMax 10); ELIGIBLE: the carve loop runs
  network #10 level -1: node (85,208) floor F 6 ft, h 6 ft; overburden top-(F+h) per disc cell [13,13,13,13,13] (skylightMax 10); REFUSED before the carve loop: skylightMax 5/5
  network #11 level -1: node (215,208) floor F 5 ft, h 7 ft; overburden top-(F+h) per disc cell [-1,-1,-1,-1,-1] (skylightMax 10); ELIGIBLE: the carve loop runs
REAL seed 18: planted 2 shaft + 0 skylight water strata (0 skylight columns with rock under the water, 0 rock strata); after the carve: planted water no longer water 0, rock under it carved 0; console.error 0
MUTANT skylight_through_fluid seed 18: planted 2 shaft + 0 skylight water strata (0 skylight columns with rock under the water, 0 rock strata); after the carve: planted water no longer water 0, rock under it carved 0; console.error 0
```
- Four networks rolled a skylight (`skylightChance` 0.25, line 2344). Network #10 is refused by the gate before any carve: 13 ft of rock over its chamber exceeds `skylightMax` 10 in all 5 disc cells (line 2510).
- Networks #4, #7 and #11 pass the gate, and their 15 columns are carved. Their overburden `top − (F + h)` is 1, 1 and −1. The top rock stratum `e = top − 1` is therefore at or below `from = F + h`, the planting rule `e > from` is false in every column, and no skylight water is planted. None of the 15 columns holds a natural fluid either, since the real generator carved all 5 cells of each skylight and `fluidIn` would have skipped a column with fluid.
- As a result the mutated line never meets a fluid on seed 18, and the mutant writes exactly what the fix writes: "rock under it carved 0" in both the REAL and MUTANT rows. **Seed 18 alone cannot kill `skylight_through_fluid`.**
- The check does not pass vacuously on such a seed set. Its condition is `totalShafts > 0 && totalWithRock > 0 && bad.length === 0` (test 1005). R4 runs the suite with seed 18 as both seeds and the check fails:
  `FAIL shafts_keep_fluid - seed 18: 2 shafts, 0 skylights (0 with rock under water); seed 18: 2 shafts, 0 skylights (0 with rock under water); total rock strata under water: 0; after the carve: every planted water stratum still water, no rock under it carved`
  This is why the check runs on `[SEED, SEED2]` = seeds 18 and 3 (test 981).

## Point 3: seed 3 reaches the carve with 30 rock strata under planted water

R5, seed 3 (copied):
```
CARVED seed 3 (real, uninstrumented): cave networks 12, shafts 1, skylights carved 2 [{"network":2,"x":103,"y":216,"floor":11,"cells":5},{"network":3,"x":190,"y":232,"floor":15,"cells":5}]
SKYLIGHTS seed 3: networks 12 (by level {"0":2,"1":3,"2":1,"-1":2,"-2":4}), rolled a skylight 3, eligible 2
  network #2 level 1: node (103,216) floor F 11 ft, h 4 ft; overburden top-(F+h) per disc cell [6,6,6,6,6] (skylightMax 10); ELIGIBLE: the carve loop runs
  network #3 level 1: node (190,232) floor F 15 ft, h 4 ft (stub); overburden top-(F+h) per disc cell [2,2,2,2,2] (skylightMax 10); ELIGIBLE: the carve loop runs
  network #11 level -2: node (119,218) floor F 2 ft, h 6 ft; overburden top-(F+h) per disc cell [13,13,13,13,13] (skylightMax 10); REFUSED before the carve loop: skylightMax 5/5
REAL seed 3: planted 3 shaft + 10 skylight water strata (10 skylight columns with rock under the water, 30 rock strata); ...
  (103,215) water at 20 ft over rock [15,16,17,18,19]      (and (102,216), (103,216), (104,216), (103,217) the same)
  (190,231) water at 20 ft over rock [19]                  (and (189,232), (190,232), (191,232), (190,233) the same)
```
- Two skylights pass the gate. For network #2 (chamber F 11, h 4, void 11–14) the rock top is at 21, so water is planted at 20 ft (+2's S0) over rock strata 15–19, which is +1's S0–S4. That gives 5 columns × 5 strata = 25.
- Network #3 (F 15, h 4, void 15–18) has water at 20 ft over rock stratum 19. That gives 5 columns × 1 stratum = 5.
- **Total: 30 rock strata under planted water, in 10 columns.** These are the same two skylights the uninstrumented generator carves (the CARVED row), so the fixture exercises real skylights of a real world. The suite's own count agrees. R2: `seed 3: 3 shafts, 10 skylights (10 with rock under water); total rock strata under water: 30`.

## Point 4: the mutant carves all 30 on seed 3, and the named check fails

R5 (copied):
```
MUTANT skylight_through_fluid seed 3: planted 3 shaft + 10 skylight water strata (10 skylight columns with rock under the water, 30 rock strata); after the carve: planted water no longer water 0, rock under it carved 30; console.error 0
  skylight (103,215): water at 20 ft now 4, 5 rock strata under it carved      (x5 columns of network #2)
  skylight (190,231): water at 20 ft now 4, 1 rock strata under it carved      (x5 columns of network #3)
```
R3, the suite itself with the mutant (copied, trimmed at the check's 8-item detail limit):
```
FAIL shafts_keep_fluid - seed 18: 2 shafts, 0 skylights (0 with rock under water); seed 3: 3 shafts, 10 skylights (10 with rock under water); total rock strata under water: 30; after the carve: skylight (103,215) rock at 15 ft carved below the water; skylight (103,215) rock at 16 ft carved below the water; ... skylight (102,216) rock at 17 ft carved below the water
RESULT: 25 passed, 1 failed (exit 1) - shafts_keep_fluid
```
R1: `MUTANT skylight_through_fluid: exit 1; failed: shafts_keep_fluid`.

**All 30 rock strata under the water become air.** The water itself survives (byte 4 = `M_WATER`) because the old loop returns on reaching it, but it is left with nothing under it. The whole fault is "rock carved under water", not "water destroyed", and that is exactly what the check's `solid` list catches (test 995–998). Only `shafts_keep_fluid` fails, so no other check masks or duplicates the kill.

The same mutant on the other two seeds of the set (R5, not part of the suite's check) carves 44 of 57 rock strata under planted water on seed 21 and 54 of 54 on seed 4. Seed 21's 13 uncarved strata lie in the 5 columns of network #1 (1 stratum each) and 2 columns of network #14 (4 each). These are columns the real generator also leaves unopened: it carves none of #1 and 3 cells of #14. The likely cause is the `!solidE(i, nd.F − 1)` early return that the mutant shares with the fix. On #1 the shaft's planted water sits at 14 ft = F − 1. I did not trace this further. It does not affect seeds 18 and 3, which are the seeds the check uses.

## Point 5: the fixed shaft and skylight guards carve zero rock under a fluid and destroy zero fluid

Both guards follow the same pattern:
```js
const fluidIn = (i, e0, e1) => { for (let e = e0; e < e1; e++) if (FLUID_B[getE(i, e)] === 1) return true; return false; };   // 2487
// shaft (2495–2502)
const hi = Math.min(sh.to, top[i] - CV.roofMin);
if (fluidIn(i, sh.from, hi)) return;                                                                            // 2498
for (let e = sh.from; e < hi; e++) if (SOLID_B[getE(i, e)] === 1) { setE(i, e, M_AIR); changed = true; }       // 2500
// skylight (2513–2518): fluidIn(i, nd.F, top[i]) at 2514, SOLID_B-only write at 2516
```
1. **The scan comes before any write.** `fluidIn` covers the whole interval the loop may write (`[sh.from, hi)` and `[nd.F, top[i])`). If a fluid stratum lies anywhere in it, the callback returns before the first `setE`, so no stratum of that column changes, and in particular no rock under the fluid.
2. **Only solid strata are written.** Even without the scan, the write loop's predicate is `SOLID_B[...] === 1`, and `FLUID_B` and `SOLID_B` never both hold for a byte (DEUS_Levels.js 1014–1020). A fluid byte can therefore never be set to air. The pre-fix shaft wrote `SOLID_B || FLUID_B` (the `shaft_through_fluid` mutant).
3. **Observed on all four seeds of the suite's set** (R5, REAL rows, planted water kept / rock under it carved): seed 18 2 shaft / 0 skylight strata planted, 0 lost, 0 carved; seed 3 3 / 10, **0 of 30** carved; seed 21 8 / 25, **0 of 57**; seed 4 9 / 20, **0 of 54**. No console.error in any world. In the suite, R2 prints `PASS shafts_keep_fluid - … total rock strata under water: 30; after the carve: every planted water stratum still water, no rock under it carved`.
4. **The shaft half can fail too.** Under `shaft_through_fluid` the planted shaft water becomes air: seed 18 2 of 2, seed 3 3 of 3, seed 21 8 of 8, seed 4 9 of 9 (R5). R1 records `MUTANT shaft_through_fluid: exit 1; failed: shafts_keep_fluid`.

## Point 6: zero fluid loss across the whole generator, and clearance ends at a fluid

**Every strata write in `carveNaturalFeatures`** (all six `setE` calls between lines 2123 and 2746, found by grep):
| Line | Site | What stops it from touching or undermining a fluid |
|---|---|---|
| 2402 | +2 massif fill (air → stone at e 21–24 on summit columns `S = 2`) | **No fluid test.** It relies on there being no fluid at e ≥ 21. The census below finds fluid only on -2 and -1 in all four seeds, and `carve_only_removes` would count a fluid → stone change as "solid material changed" (test 533). |
| 2428 | `carveVoid` (chambers, passages, dead ends, mouths) | Pre-scan 2422–2426 returns 0 on a fluid inside `[F, C)` before any write. A non-solid stratum truncates the void a stratum short (the 1 ft slab). |
| 2500 | shafts | `fluidIn(i, sh.from, hi)` at 2498, SOLID-only write (point 5) |
| 2516 | skylights | `fluidIn(i, nd.F, top[i])` at 2514, SOLID-only write (point 5) |
| 2654 | cuts | Pre-scan 2651–2653: a column holding a fluid in `[F, top)` is skipped (`continue`) before any write |
| 2719 | unconnected-solid removal | Only strata with `sol[v] === 1`, which is set from `solidE` (2700), so fluids are never candidates |

**Census of the uninstrumented worlds** (R5, generator 4 vs generator 5 of the same seed, whole area, all 25 strata):
```
FLUID seed 18: generator 4 fluid strata 406 {"-2":128,"-1":278}; generator 5 406 {"-2":128,"-1":278}; generator-4 fluid strata not the same fluid in generator 5: 0
UNDER-FLUID seed 18: fluid strata resting on air: generator 4 0, generator 5 0; strata carved (solid in 4, air in 5) below a fluid stratum of the same column: 0
FLUID seed 3: … 386 … 386 …: 0        UNDER-FLUID seed 3: … 0, … 0; …: 0
FLUID seed 21: … 408 … 408 …: 0       UNDER-FLUID seed 21: … 0, … 0; …: 0
FLUID seed 4: … 400 … 400 …: 0        UNDER-FLUID seed 4: … 0, … 0; …: 0
```
This gives zero fluid lost or moved, and zero strata carved beneath a fluid, on every seed of the suite's set. The suite's `carve_only_removes` agrees over the same four seeds: `fluid removed 0` (R2).

**The census can fail.** Under R6, the probe's own self-test injection (one fluid stratum set to air, and the solid stratum under another fluid set to air), it reports `generator-4 fluid strata not the same fluid in generator 5: 1`, `fluid strata resting on air: generator 4 0, generator 5 2`, `strata carved … below a fluid stratum …: 1 e.g. (14,8) e 0` and exits 1.

**Clearance queries.** The brief groups these with the `fluidIn` returns, but `continuousAirHeight` and `airRunAt` do not call `fluidIn`, and they write nothing. Each ends its air run at the first stratum that is not air: `if (rdM[rdO + s] !== M_AIR) return h;` (2906 and 2928; before `2e4571a` the test was `SOLID_B[...] === 1`). So water and lava count as 0 ft of clearance, and the air above a fluid is not counted from the floor. This is the query-side half of ATK-19B-001, not a carving guard. R2: `PASS clearance_stops_at_fluid` (stone + 4 water under solid 0 ft, stone + 2 air + 2 water 2 ft, -2 stone + 4 lava 0 ft, `airRunAt` agreeing, dry control 4 ft). R1: `air_through_fluid`, `airrun_through_fluid` and `clearance_off_by_one` all exit 1 with `clearance_stops_at_fluid` among the failed checks.

---

## Limits of this proof (not claimed)
1. **`carveVoid` does not structurally exclude a fluid lying exactly at the void's planned top `C`.** Its pre-scan covers `[F, C)`. A pool resting on the stratum `C − 1` under rock (`top − roofMin > C`) would not be seen, and strata `F … C − 1` would be carved from under it. In practice the column-wide `NO_CAVE` locks round the underground founding squares and pools (lines 2170–2176) prevent this. The census found no case on seeds 18, 3, 21 or 4, including with those locks removed (R7, `pockets_unprotected`: all four seeds clean). Scanning `[F, C]` inclusive would close the gap structurally. That is a code change outside this brief. Proposed as MINOR finding **A-2.2c-1** for Grok and Gemini.
2. **The massif fill (2402) has no fluid test**, and relies on generation putting no fluid at e ≥ 21 (point 6 table). Not observed to matter on the four seeds.
3. **Stale comment at 2646–2647.** "every stratum from the cut's floor to the rock's top becomes air (fluids included: none are left floating)" contradicts the code below it, which skips a column holding a fluid. `docs/systems/UF_Levels.md` (line 212) describes the code correctly. Proposed as MINOR finding **A-2.2c-2** (comment only).
4. The census is four seeds (18, 3, 21, 4), not all seeds. It covers generation only. Runtime digging (`applyStrataDamage`/`applyVolumeDamage`) is a different code path and is not covered here.
5. No in-game run (RMMZ F5) was made for this criterion. Every result above comes from the Node vm harness running the real plugins.

## Reproduce
```bash
node tools/test_strata_cuts_and_caves.js --mutant=skylight_through_fluid          # exit 1, FAIL shafts_keep_fluid
node tools/test_strata_cuts_and_caves.js --seed2=18 --no-suites                   # shafts_keep_fluid FAILs: seed 18 has no skylight fixture
node tasks/WG.00.08/probe_skylight_through_fluid.js                               # seeds 18,3 (default); add --seeds=18,3,21,4
node tasks/WG.00.08/probe_skylight_through_fluid.js --seeds=18 --census-mutant=probe_self_test   # exit 1: the census can fail
```
