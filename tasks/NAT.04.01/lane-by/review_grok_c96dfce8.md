# Independent Grok Review — NAT.04.01 / lane-by

- Writer: MiniMax / Gemini repair
- Reviewer: Grok (Grok 4.7)
- Target Commit: c96dfce8afbdb986c655c0a07cd3194a465390fb
- Reviewed Commit: c96dfce8afbdb986c655c0a07cd3194a465390fb
- Merge Base: 5cb93343bf2e3026f42f9606d69233a9bbfaaf0b
- Branch: task/lane-by
- Worktree: C:\Users\snewt\.deus_worktrees\lane-by
- Review Date: 2026-09-28

Authority: DEC-034 independent adversarial review, DEC-035 merge-gate isolation, DEC-037 natural-world phase lock, DEC-038 integer units and signed residual flow, DEC-039 rules hierarchy, DEC-040 closed mass. No product code was edited. No art was generated. Probes ran from a temporary script against the committed module and were deleted. This review does not certify the lane.

## 1. Commit & Diff Verification

Commands run in `C:\Users\snewt\.deus_worktrees\lane-by`:

```text
git rev-parse HEAD
213a6b51f85539f9ba73b5237326e11d6d2760c9

git merge-base HEAD origin/main
5cb93343bf2e3026f42f9606d69233a9bbfaaf0b

git log -1 --oneline
213a6b51 [ops] NAT.04.01 lane-by launch prompt 20260928_235038 (reviewer grok)

git rev-parse --abbrev-ref HEAD
task/lane-by
```

The assigned tip exists and is the parent of HEAD:

```text
c96dfce8afbdb986c655c0a07cd3194a465390fb
author=deus-ops <deus-ops@local.invalid>
subject=[gemini] NAT.04.01 Resolve Grok review findings: implement authentic GeomorphologyEngine physics, closed-mass transfers, downward percolation, and real test suite
parent=50c08991
date=2026-09-28 23:48:45 -0500
```

HEAD is one ops commit above that tip. The ops commit does not touch the kernel:

```text
git diff --stat c96dfce8 HEAD
tasks/NAT.04.01/lane-by/launches/20260928_235038_prompt.txt | 107 +++++++++++++++++++++
1 file changed, 107 insertions(+)
```

Blob hashes of the three kernel files at HEAD match `c96dfce8` (`git hash-object` equals `git rev-parse c96dfce8:<path>` for `soil.js`, `index.js`, and `tools/test_soil_geomorphology.js`). The bytes reviewed below are the assigned tip.

Repair diff, parent review commit to the tip:

```text
git diff --stat 50c08991 c96dfce8
 game/js/sim/geomorphology/index.js |  41 +-
 game/js/sim/geomorphology/soil.js  | 860 +++++++++++++++++++++++++------------
 tools/test_soil_geomorphology.js   | 497 +++++++++++++--------
 3 files changed, 918 insertions(+), 480 deletions(-)
```

Lane diff against the merge base:

```text
git diff --stat 5cb93343 c96dfce8
 game/js/sim/geomorphology/index.js                 |  16 +
 game/js/sim/geomorphology/soil.js                  | 802 +++++++++++++++++++++
 tasks/NAT.04.01/lane-by/BRIEF.md                   | 139 ++++
 tasks/NAT.04.01/lane-by/lane.json                  |  21 +
 .../lane-by/launches/20260928_231858_prompt.txt    |  82 +++
 tasks/NAT.04.01/lane-by/prompt_minimax_soil.txt    |  63 ++
 tasks/NAT.04.01/lane-by/prompt_soil_impl.txt       |  66 ++
 tasks/NAT.04.01/lane-by/prompt_soil_test.txt       |  29 +
 tasks/NAT.04.01/lane-by/review_grok_ace19c25.md    | 321 +++++++++
 tools/test_soil_geomorphology.js                   | 348 +++++++++
 10 files changed, 1887 insertions(+)
```

`git status` at review time was clean except one untracked file, `tasks/NAT.04.01/lane-by/prompt_review_grok.txt`. That file is not in `c96dfce8` and was not staged for this review commit.

Path check against `tasks/NAT.04.01/lane-by/lane.json` `allowedPaths`. Every name from `5cb93343` to HEAD:

| Path | Allowed |
|---|---|
| `game/js/sim/geomorphology/index.js` | yes (`game/js/sim/geomorphology/**`) |
| `game/js/sim/geomorphology/soil.js` | yes |
| `tools/test_soil_geomorphology.js` | yes |
| `tasks/NAT.04.01/lane-by/**` (brief, lane file, prompts, launch records, prior review) | yes |

Rule 9: that name list contains no `game/js/rmmz_*.js`, no `game/js/main.js`, and no `game/js/libs/`.

DEC-037: the same name list contains no civilization, faction, or farming paths. A content search of `game/js/sim/geomorphology/` found no farm, faction, crop, or civilization symbols.

## 2. Gate Test Execution & Results

Working directory: `C:\Users\snewt\.deus_worktrees\lane-by`.

```text
node tools/test_soil_geomorphology.js
RESULT: 57 passed, 0 failed
exit 0
```

The 57 assertions are inside 14 scenario functions. Counts: horizon stratification 11, capillary 3, same-cell gravity 3, cross-Z gravity 1, signed residual 2, pore clamp 1, repose angles 8, slope 3, weathering 3, erosion 3, thermal 4, quiescence 4, serialization 9, total mass 2.

The suite imports `GeomorphologyEngine` through `game/js/sim/geomorphology/index.js` and calls `processMoistureTick`, `processSlopeStability`, `applyWeathering`, `applyWaterErosion`, `applyThermalDegradation`, `accumulateFractionalTransfer`, `serialize`, and `getTotalMass`. The old stub-only gate is gone.

`tools/test_soil_geomorphology.js` calls `process.exit` once, at line 344, and only when `failed > 0`.

Mutant commands, each a fresh process:

```text
node tools/test_soil_geomorphology.js --mutant=no_donor_debit
FAIL: test_capillary_rise_closed_mass - Capillary transfer must strictly conserve water mass (zero creation). Expected 88920, got 90349
RESULT: 56 passed, 1 failed
exit 1

node tools/test_soil_geomorphology.js --mutant=reverse_drainage
FAIL: test_gravity_downward_drainage - Downward neighbor (s-1) must receive percolating water
FAIL: test_gravity_downward_drainage - Upper stratum excess water must drain downward
FAIL: test_gravity_drainage_across_z_boundary - Water must drain across Z boundary from s=0 down to z-1, s=4
RESULT: 54 passed, 3 failed
exit 1

node tools/test_soil_geomorphology.js --mutant=bypass_pore_clamp
FAIL: test_receiver_side_clamping_pore_space - Receiver pore space must clamp moisture to <= 10000 bp
RESULT: 56 passed, 1 failed
exit 1

node tools/test_soil_geomorphology.js --mutant=discard_signed_residuals
FAIL: test_signed_residual_sub_centipound_accumulation - 10 ticks of 0.35 cp must yield exactly 3 integer centipounds. Expected 3, got 0
FAIL: test_signed_residual_sub_centipound_accumulation - Final signed residual must hold exactly 0.5 cp remainder
RESULT: 55 passed, 2 failed
exit 1

node tools/test_soil_geomorphology.js --mutant=unbalanced_weathering
FAIL: test_weathering_closed_mass_balance - Weathering must conserve 100% of mass into regolith sediment. Expected 300000, got 297000
FAIL: test_weathering_closed_mass_balance - Fractured rock must be deposited as loose regolith
RESULT: 55 passed, 2 failed
exit 1
```

`no_donor_debit`, `reverse_drainage`, and `unbalanced_weathering` fail on `GeomorphologyEngine` mass and direction assertions. The 1,429 cp gap in the capillary mutant is the same one-tick pulse measured in section 3. The weathering mutant drops the 3,000 cp fracture on the floor (1% of 300,000). `discard_signed_residuals` fails on `accumulateFractionalTransfer(edge, 0.35)` called directly by the test. `bypass_pore_clamp` fails in `simulateWaterTransfer` plus `clampMoisture`. With that flag set, `processMoistureTick` still stopped a receiver at exactly 140,400 cp (section 3). The flag is wired to the moisture getter, the moisture setter, and `clampMoisture`, and the percolation clamp in `processMoistureTick` does not read it.

The green gate does not cover a second slope tick, an empty neighbor column, world total mass during a cascade, or a capillary run that continues until field capacity.

## 3. Technical Evaluation of Soil Kernel

Constants at the top of `soil.js`: volume 50 cu ft, water density 6,240 cp/cu ft, `MAX_WATER_MASS_PER_STRATUM` = 312,000 cp. `getTotalMass()` on one dry C-horizon cell returned `{rock: 300000, sediment: 0, water: 0, total: 300000}`. An O/A cell at 5,000 bp moisture reports 187,500 cp solid and 70,200 cp water, and `140400 * 5000 / 10000 = 70200`. The old basis-point term in the mass report is gone. Mass fields stayed integers across the weathering and thermal probes.

O/A max pore water is `floor(50 * 0.45 * 6240) = 140,400` cp. Field-capacity water is `floor(140400 * 0.35) = 49,140` cp. C-horizon max pore water is 93,600 cp.

### Hydrology — capillary

One tick, the gate's own pair. Donor C at `(0,0,z=-1,s=4)` moisture 8,000 bp (74,880 cp). Receiver O/A at `(0,0,z=0,s=0)` moisture 1,000 bp (14,040 cp). An extra cell at `s=1` started empty. Downward id of the receiver is `0,0,-1,4`.

| | Water cp |
|---|---:|
| Sum before | 88,920 |
| Donor delta | -1,429 |
| Receiver delta | +1,429 |
| Cell at s=1 | 0 |
| Sum after | 88,920 |
| `getTotalMass` delta | 0 |
| Receiver field capacity | 49,140 |
| Receiver after the tick | 15,469 |
| Short of field capacity | 33,671 |

The donor debit is real. This tick creates no water. `ledgerMassSoilWater` increased by 1,429. That field is a journal credit. `getTotalMass()` does not add it, and the stratum sum stayed 88,920.

The same engine then ran 29 more ticks with no external `markDirty`. `quiescentTicks` rose by 29. Water did not move. Capillary does not put the receiver back into `dirtyColumns`, so the wick stops after a single pulse of at most 2,000 cp. Re-marking the receiver from outside for 80 further ticks reached 47,927 cp, still 1,213 cp short of 49,140, with the stratum sum still 88,920. The approach is exponential because the rate is `round(2000 * deficit / fieldCapacity)`. The engine's own dirty set treats the job as finished on pulse one.

A topsoil cell at `s=4` over an aquifer at `z=-1,s=4` moved 0 cp. Its downward neighbor is `s=3`. The 10 ft jump from the previous revision is gone.

A 10 cp deficit on a 49,140 cp field capacity has unrounded rate `2000 * 10 / 49140 = 0.407` cp. `Math.round` makes that 0 before `accumulateFractionalTransfer`. After the tick the residual map was empty, the dirty set was empty, and both cells were unchanged. A 20 cp deficit has unrounded rate 0.814 cp, moved 1 cp, and stored residual `0` on key `3,0,0,1:3,0,0,2`. The colon-separated undirected key matches `aquifer.js`. The value stored from a real moisture tick is the remainder of an integer. DEC-038's accumulator in `aquifer.js` (raw flow plus the old residual, then `Math.trunc`) is there to keep a 0.407 cp flow alive until it becomes a centipound. The soil tick rounds that flow away and then drops the cell.

### Hydrology — gravity

Five O/A strata in one column, only `s=4` wet (126,360 cp, 9,000 bp), plus an empty cell at `z=1,s=0` and an empty cell at `z=-1,s=4`. Only `s=4` was marked dirty. The loop stopped on its own after 3 ticks.

| Cell | Water cp after |
|---|---:|
| `z=1,s=0` (above) | 0 |
| `z=0,s=4` | 49,140 (field capacity) |
| `z=0,s=3` | 49,140 (field capacity) |
| `z=0,s=2` | 28,080 (below field capacity, retained) |
| `z=0,s=1` | 0 |
| `z=0,s=0` | 0 |
| `z=-1,s=4` | 0 |
| Sum | 126,360 |

`126360 - 49140 - 49140 = 28080`. World delta 0. Two transfers. Both residual entries are 0. Nothing moved to `z+1`.

Cross-Z fixture from the gate, with decoys at `z=1,s=0` and `z=0,s=1`: the `s=0` source ended at 49,140 cp, `z=-1,s=4` received 77,220 cp, both decoys stayed at 0. Downward id was `2,0,-1,4`.

Pore clamp, engine path: lower cell held `140400 - 50` cp, upper cell was over field capacity. One tick moved 50 cp. The lower cell ended at 140,400 cp. The upper cell kept 77,170 cp of excess and both ids stayed dirty. The cell at `z+1` stayed at 0. World delta 0. Setting `MUTANTS.bypass_pore_clamp` and repeating the engine tick still ended the lower cell at 140,400 cp. The helper the gate calls did not clamp: after `simulateWaterTransfer(stratum, 8000)` and `clampMoisture`, water was 182,520 cp and the moisture getter reported 13,000 bp.

A lone over-capacity cell with no lower neighbor kept 126,360 cp across 5 ticks, executed 0 transfers, and remained dirty. The water is still in the cell. That column never becomes quiescent.

### Closed mass — weathering, erosion, thermal

| Operation | World delta | What moved |
|---|---:|---|
| `applyWeathering(..., exposedSurface=false)` | 0 | solid stayed 300,000, loose stayed 0 |
| `applyWeathering` once, exposed | 0 | 3,000 cp solid became loose; ledger rock -3,000, sediment +3,000; bulk density 5,940 |
| `applyWeathering` a second time | 0 | solid 294,030 + loose 5,970 = 300,000; bulk density 5,881, still an integer |
| `applyWaterErosion` at 10 ft/s | 0 | solid 187,500 → 178,125; suspended reservoir +9,375; water unchanged; particles 5,000 → 4,750 |
| `applyThermalDegradation` at 300 K and at 0 K | 0 | solid stayed 187,500 |
| `applyThermalDegradation` at 1,200 K | 0 | solid 186,600 + ceramic 300 + ash/gas 600 = 187,500; composition sum returned to 10,000 bp |

Erosion's suspended reservoir is the destination. No second stratum receives alluvium. The sediment journal increases by 9,375 with no paired soil debit; `getTotalMass()` still balances because the suspended reservoir is inside it.

### Slope cascade — mass is created, and the angle does not settle

`processSlopeStability` compares cardinal neighbors. Source elevation is `(z - (-16)) * 10 + s * 2 + 2`. A missing neighbor is elevation 0. For a loose O/A face at `z=0,s=0` that is a 162 ft cliff. `tan(34°) * 5` is 3.37 ft, so any loose cell with an empty cardinal neighbor fails the repose test.

The gate fixture is the one in `test_slope_stability_cascade_conservation`: loose 50,000 cp on `(0,0,z=2,s=0)`, existing loose cell at `(1,0,z=-2,s=0)`, one call. Extended to eight calls of `processSlopeStability` with no further `markDirty`:

| Tick | Strata | World total cp | Delta from 425,000 | Where the live solid went |
|---:|---:|---:|---:|---|
| 0 | 2 | 425,000 | 0 | source solid 187,500 + loose 50,000; low solid 187,500 |
| 1 | 3 | 425,000 | 0 | source shell is 0/0 and still the surface at elevation 182; low holds loose 50,000; new `(-1,0,z=2,s=0)` holds loose 187,500 at elevation 182 |
| 2 | 5 | 612,500 | +187,500 | new `(2,0,z=-2,s=0)` solid 187,500 + loose 50,000 |
| 3 | 7 | 800,000 | +375,000 | carrier walks to x=3 |
| 8 | 17 | 1,737,500 | +1,312,500 | carrier is `(8,0,z=-2,s=0)` solid 187,500 + loose 50,000 |

Tick 1 conserves world mass and already fails the repose end state. The source elevation stays 182 ft and the low cell stays 142 ft (40 ft, against a 3.37 ft stable step). The source's entire solid matrix leaves in that same tick, sideways to `x=-1` at the same elevation, because the three empty cardinals were scored as elevation 0. `getHighestStratumAt(0,0)` still returns the zero-mass shell, so the cliff remains.

Tick 2 is the faucet. The low cell still has bulk density 3,750 when its loose cap is given to a new neighbor. `new SoilStratum(...)` sets `solidMassCp = round(bulkDensity * 50)` before the transferred loose is added, which mints 187,500 cp. The original solid is then moved onto a second new cell after bulk density has been zeroed, so that carrier is created at 0 solid. Each later tick repeats the mint and walks one column in +x. The dirty set grows by 2 and is never cleared. Eight ticks produced 1,312,500 cp.

The gate assertion sums `looseMassCp` of the two fixtures only, and only after one tick. After that tick those two loose fields are 0 and 50,000. The assertion passes while the source solid has already left and while tick 2 of the same objects mints a stratum.

Empty-column case, one loose face, no pre-existing neighbor, one tick:

| Cell | Solid cp | Loose cp | Elevation |
|---|---:|---:|---:|
| Start, source only | 187,500 | 50,000 | 182 |
| Source after | 0 | 0 | 182 |
| New `(1,0,z=2,s=0)` | 187,500 | 50,000 | 182 |
| New `(-1,0,z=2,s=0)` | 0 | 187,500 | 182 |

World total 237,500 → 425,000. Delta +187,500 cp on tick 1. Both deposits sit at the source elevation. The repose test used 0.

A column whose highest stratum is `s=4` mints the same 187,500 cp cap: the new cell is built at `z+1,s=0` while bulk density is still 3,750, then the loose transfer is added. Measured world delta +187,500 in one tick.

### Dirty set — moisture consumes the flag slope needs

Dry gate fixture, `processMoistureTick` then `processSlopeStability`. Moisture visited the cell, found no lower donor and no excess, and cleared `dirtyColumns`. Slope then moved 0 cp. The 50,000 cp loose cap was still on the cliff.

The same order with the cliff starting at 9,000 bp: moisture drained the excess to field capacity and left dirty only the wet cell below. Slope moved 0 cp of sediment. The cascade runs when `processSlopeStability` is called alone, which is what the gate does. The brief's order is moisture, then slope. That order drops a dry collapse.

`getHighestStratumAt` walks every stratum. One dirty column in a 2,003-stratum map called it 4 times and read 8,010 stratum entries. The quiescence test passes because its dirty set is empty, and an empty set does skip both passes (`strataVisited` 0). A dirty loose face with an absent neighbor is not a local update.

### Serialization

Engine roundtrip and `serializeStratum` / `deserializeStratum` both preserved id, x, y, z, s, horizon, sand, silt, clay, organic, bulk density, porosity, field capacity, water, solid, loose mass, loose flag, angle of repose, and particles, using values that are not the constructor defaults (including water 777, solid 88,888, loose 999, particles 42, angle 20, composition 1,111/2,222/3,333/3,334). The engine payload also preserved both residual entries (0.42 and -0.25), the dirty id, both ledgers, and the ceramic, ash/gas, and suspended reservoirs. Mismatch list was empty. `stats` is absent from the JSON. The persistent parameters the brief names are in the payload and come back.

### Browser load

`index.js` calls `require("./soil.js")` only inside `typeof module !== "undefined" && module.exports`. In a fresh `vm` realm whose only global was `window`:

| Load | Result |
|---|---|
| `index.js` alone | no throw; `window.DEUS.Sim.Geomorphology` unset |
| `soil.js` alone | no throw; `window.DEUS.Sim.Soil` has 28 keys, including `GeomorphologyEngine` |
| `soil.js` then `index.js` | no throw; `Geomorphology` is the same object as `Soil` |
| `index.js` with no `window` and no `module` | no throw |

The clean-browser `ReferenceError` from the previous tip is gone. A script-tag load of `index.js` alone still does not publish the kernel. `soil.js` is the file that registers `window.DEUS.Sim.Soil`. `soil.js` guards its `process.argv` / `process.env` reads with `typeof process !== "undefined"`.

### Prior defects, as measured on this tip

| Prior defect on ace19c25 | On c96dfce8 |
|---|---|
| Capillary created 25,740 cp | Stratum water sum unchanged (88,920 → 88,920). Debit is 1,429 cp. Wick stops 33,671 cp short of field capacity. |
| Gravity flowed to `z+1` | Above-cell water stayed 0. `s=0` drains to `z-1,s=4`. Excess above field capacity stops at field capacity when the next pore can take it. |
| Slope collapse was unreachable and every stratum was scanned | Collapse runs. Tick 2 of the gate fixture mints 187,500 cp and keeps minting. Elevations do not change. Empty neighbors are elevation 0. |
| Weathering, erosion, and heat deleted solid mass | World delta 0 for all three, into loose regolith, suspended sediment, and ceramic plus ash/gas. Exposed-surface false and 300 K are inert. |
| `index.js` threw on bare `require` | Clean `window` realm does not throw. |
| Tests called stubs | 57 assertions call the engine. The slope assertion is one tick and two loose fields. |
| `getTotalMass` mixed units and returned 8,000 | Dry C-horizon total is 300,000 cp. |
| Residual map stored excess basis points and was never read | Key format is `idA:idB` and the map is read. Moisture ticks store 0 because the rate is pre-rounded. A 0.407 cp rate vanishes. |
| Mutants exited through a hardcoded `process.exit(1)` | All five exit 1 because an assertion failed. The pore-clamp flag does not affect `processMoistureTick`. |

## 4. Verdict (PASS, PASS_WITH_FIXES, or FAIL)

FAIL

The branch tip is `213a6b51`, one allowed ops prompt above the reviewed commit `c96dfce8afbdb986c655c0a07cd3194a465390fb`. The repair diff stays inside `lane.json` `allowedPaths`, does not edit `rmmz_*.js` / `main.js` / `libs/`, and does not implement civilization, factions, or farming. `node tools/test_soil_geomorphology.js` exits 0 with `RESULT: 57 passed, 0 failed`. The five `--mutant=` commands exit 1 because assertions failed.

Water movement on this tip conserves stratum centipounds, and gravity moves them to `s-1` or to `z-1,s=4`. Weathering, erosion, and thermal degradation balance in `getTotalMass()`. The mass report for a dry C-horizon cell is 300,000 cp. Save/load returns every stored stratum field, both residuals, the dirty set, the journals, and the reservoirs. A clean browser realm can evaluate `index.js` and `soil.js` without `require`.

`PASS_WITH_FIXES` would require closed mass on the slope path the gate already calls. That path does not hold. The gate fixture starts at 425,000 cp. Tick 1 leaves a zero-mass shell at elevation 182 ft over a neighbor at 142 ft and parks 187,500 cp at the same elevation on `x=-1`. Tick 2 mints a new 187,500 cp body. Tick 8 is 1,737,500 cp, and the dirty set is still growing. One tick from a lone loose face mints 187,500 cp immediately. The constructor assigns `bulkDensity * 50` to every new stratum, and the loose-sediment branch creates that stratum while bulk density is still the parent's. Empty cardinals are elevation 0, so the repose test fires, and removing mass does not change `(z, s)`, so the test keeps firing.

A resubmission needs the world total of this fixture to stay constant across repeated slope ticks, new cells to start at 0 solid centipounds, the repose check to use the elevation of the cell that actually receives the sediment, and a finished cascade whose height step is within `tan(theta) * 5` or whose emptied shell no longer defines the surface. Capillary needs to stay dirty until field capacity or donor exhaustion, and the residual has to see the unrounded rate. The moisture pass has to leave a slope event runnable. The gate has to assert `getTotalMass().total` on those runs, including an empty neighbor.

VERDICT: FAIL
