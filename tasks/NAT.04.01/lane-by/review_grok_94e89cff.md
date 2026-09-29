# Independent Grok Review — NAT.04.01 / lane-by (attempt 3)

- Writer: Claude Code
- Reviewer: Grok
- Target Commit: 94e89cffb7981d6e0c82adf2199d52f6b8495955
- Reviewed Commit: 94e89cffb7981d6e0c82adf2199d52f6b8495955
- Merge Base: 5cb93343bf2e3026f42f9606d69233a9bbfaaf0b
- Branch: task/lane-by
- Worktree: C:\Users\snewt\.deus_worktrees\lane-by
- Review Date: 2026-09-29

Authority: DEC-034 independent adversarial review, DEC-035 merge-gate isolation, DEC-037 natural-world phase lock, DEC-038 integer units and signed residual flow, DEC-039 rules hierarchy, DEC-040 closed mass as scoped by the Owner on 2026-09-29 (weight ledger for world material and water; type, volume and density may change; weight may not; plants, creatures and gases outside the rule; journal pairing and sub-centipound residual bookkeeping are non-blocking on their own). `docs/OWNER_DECISIONS.md` DEC-040 body has no "Owner Clarification" subsection; the 2026-09-29 scope used here is the text in the review assignment.

No product code was edited. Probes ran from temporary scripts under `%TEMP%` against the committed module and were deleted. This review does not certify the lane.

## 1. Commit & Diff Verification

Commands run in `C:\Users\snewt\.deus_worktrees\lane-by`:

```text
git rev-parse HEAD
94e89cffb7981d6e0c82adf2199d52f6b8495955

git merge-base HEAD origin/main
5cb93343bf2e3026f42f9606d69233a9bbfaaf0b

git log --oneline 5cb93343bf2e3026f42f9606d69233a9bbfaaf0b..HEAD
94e89cff [claude] NAT.04.01 attempt 3: closed-mass slope cascade, two work queues, column index, self-driving capillary
8eb7202a [pm] NAT.04.01 lane-by: attempt 3, writer claude, mutation sweep added to gate tests
97432c21 [grok] NAT.04.01 Independent review of soil geomorphology simulation (commit c96dfce8)
213a6b51 [ops] NAT.04.01 lane-by launch prompt 20260928_235038 (reviewer grok)
c96dfce8 [gemini] NAT.04.01 Resolve Grok review findings: implement authentic GeomorphologyEngine physics, closed-mass transfers, downward percolation, and real test suite
50c08991 [grok] NAT.04.01 Independent review of soil geomorphology simulation (commit ace19c25)
085e22ba [ops] NAT.04.01 lane-by launch prompt 20260928_231858 (reviewer grok)
ace19c25 [minimax] NAT.04.01 implement soil geomorphology simulation and test suite
3056cf86 Merge branch 'main' into task/lane-by
d837e6d1 [pm] Open lane-by (NAT.04.01 Lean Geomorphology & Soil Kernel): BRIEF.md and lane.json
```

HEAD is the assigned tip. Author of `94e89cff` is `deus-ops <deus-ops@local.invalid>`, subject as above, parent `8eb7202a`, date 2026-09-29 12:05:34 -0500.

`8eb7202a` (`[pm]`) rewrites `tasks/NAT.04.01/lane-by/lane.json`: writer `claude`, second gate test `node tools/test_soil_geomorphology.js --mutation-sweep` (`timeoutSec` 600), `push: true`. `allowedPaths` unchanged. BRIEF.md writer line updated in the same commit.

Attempt-3 product diff (`8eb7202a..94e89cff`):

```text
 game/js/sim/geomorphology/soil.js          | 439 ++++++++++++++++------
 tasks/NAT.04.01/lane-by/REPORT_attempt3.md | 108 ++++++
 tools/test_soil_geomorphology.js           | 584 ++++++++++++++++++++++++-----
 3 files changed, 920 insertions(+), 211 deletions(-)
```

Lane diff against the merge base:

```text
git diff --stat 5cb93343bf2e3026f42f9606d69233a9bbfaaf0b HEAD
 game/js/sim/geomorphology/index.js                 |   16 +
 game/js/sim/geomorphology/soil.js                  | 1017 ++++++++++++++++++++
 tasks/NAT.04.01/lane-by/BRIEF.md                   |  139 +++
 tasks/NAT.04.01/lane-by/REPORT_attempt3.md         |  108 +++
 tasks/NAT.04.01/lane-by/lane.json                  |   30 +
 .../lane-by/launches/20260928_231858_prompt.txt    |   82 ++
 .../lane-by/launches/20260928_235038_prompt.txt    |  107 ++
 tasks/NAT.04.01/lane-by/prompt_minimax_soil.txt    |  63 ++
 tasks/NAT.04.01/lane-by/prompt_soil_impl.txt       |  66 ++
 tasks/NAT.04.01/lane-by/prompt_soil_test.txt       |  29 +
 tasks/NAT.04.01/lane-by/review_grok_ace19c25.md    |  321 ++++++
 tasks/NAT.04.01/lane-by/review_grok_c96dfce8.md    |  297 ++++++
 tools/test_soil_geomorphology.js                   |  734 ++++++++++++++
 13 files changed, 3009 insertions(+)
```

Path check against `tasks/NAT.04.01/lane-by/lane.json` `allowedPaths` (`game/js/sim/geomorphology/**`, `tools/test_soil_geomorphology.js`, `tasks/NAT.04.01/lane-by/**`). Every name from `5cb93343` to HEAD:

| Path | Allowed |
|---|---|
| `game/js/sim/geomorphology/index.js` | yes |
| `game/js/sim/geomorphology/soil.js` | yes |
| `tools/test_soil_geomorphology.js` | yes |
| `tasks/NAT.04.01/lane-by/**` (brief, report, lane file, prompts, launch records, prior reviews) | yes |

Rule 9: that name list contains no `game/js/rmmz_*.js`, no `game/js/main.js`, and no `game/js/libs/`.

DEC-037: the same name list contains no civilization, faction, or farming paths. A content search of `game/js/sim/geomorphology/` for those domains produced only the substring `faction` inside the word `liquefaction` at `soil.js:495`.

`git status` at review time: branch `task/lane-by` at `94e89cff`, tracking `origin/task/lane-by`. Untracked files `tasks/NAT.04.01/lane-by/launches/20260929_120624_prompt.txt`, `prompt_review_grok.txt`, `prompt_review_grok_attempt3.txt` were left unstaged.

## 2. Gate Test Execution & Results

Working directory: `C:\Users\snewt\.deus_worktrees\lane-by`.

```text
node tools/test_soil_geomorphology.js
RESULT: 136 passed, 0 failed
exit 0
```

27 test functions. The suite imports `GeomorphologyEngine` through `game/js/sim/geomorphology/index.js` and drives `processMoistureTick`, `processSlopeStability`, `simulateQuiescence`, `applyWeathering`, `applyWaterErosion`, `depositSuspendedSediment`, `applyThermalDegradation`, `accumulateFractionalTransfer`, `serialize`/`deserialize`, and `getTotalMass`. Closed-mass checks compare `engine.getTotalMass().total` on repeated ticks in the slope, capillary, weathering, erosion, thermal, and save/continue cases.

`tools/test_soil_geomorphology.js` calls `process.exit` at line 707 (`failed > 0` after `runAll`) and line 727 (`survived > 0` after the sweep). The sweep (lines 713–728) spawns one child per `MUTANTS` key with `--mutant=<name>`, counts lines that start with `FAIL:`, and treats a mutant as caught only when `status === 1` and `failLines.length > 0`.

```text
node tools/test_soil_geomorphology.js --mutation-sweep
MUTATION SWEEP: 14 mutants
CAUGHT  no_donor_debit             exit=1 fails=4  test_capillary_rise_closed_mass - World total unchanged by a capillary tick. Expected 576420, got 577848
CAUGHT  reverse_drainage           exit=1 fails=3  test_gravity_downward_drainage - Downward neighbor (s-1) must receive percolating water
CAUGHT  bypass_pore_clamp          exit=1 fails=2  test_receiver_side_clamping_pore_space - Receiver pore space must clamp moisture to <= 10000 bp
CAUGHT  discard_signed_residuals   exit=1 fails=4  test_capillary_residual_sees_unrounded_rate - A fractional remainder was carried between ticks
CAUGHT  unbalanced_weathering      exit=1 fails=3  test_weathering_closed_mass_balance - Weathering must conserve 100% of mass into regolith sediment. Expected 300000, got 297000
CAUGHT  mint_on_deposit            exit=1 fails=18  test_slope_stability_cascade_conservation - world total changed on slope tick 1: 425000 -> 612500 cp
CAUGHT  empty_neighbor_as_floor    exit=1 fails=12  test_slope_stability_cascade_conservation - The low column received exactly the 50,000 cp that left. Expected 50000, got 0
CAUGHT  moisture_clears_slope      exit=1 fails=6  test_slope_settles_at_angle_of_repose - Final step 2.000 ft is within the stable 1.820 ft
CAUGHT  round_before_residual      exit=1 fails=4  test_capillary_reaches_field_capacity_unaided - Receiver reaches field capacity by itself (took 190 ticks). Expected 49140, got …
CAUGHT  capillary_single_pulse     exit=1 fails=3  test_capillary_reaches_field_capacity_unaided - Receiver reaches field capacity by itself (took 1 ticks). Expected 49140, got …
CAUGHT  stale_surface              exit=1 fails=1  test_emptied_cell_is_not_surface - The surface is the base again, not the empty shell
CAUGHT  global_surface_scan        exit=1 fails=1  test_slope_lookups_are_column_local - Strata scanned bounded by those columns (10000)
CAUGHT  deposition_no_debit        exit=1 fails=2  test_water_erosion_sediment_wash - The suspended reservoir was debited. Expected 0, got 9375
CAUGHT  load_without_index         exit=1 fails=2  test_save_load_serialization_roundtrip - The column index is rebuilt on load

SWEEP RESULT: 14 caught, 0 survived
exit 0
```

Every roster mutant failed on a `FAIL:` assertion line. `mint_on_deposit` reproduces the attempt-2 faucet on the gate fixture itself (+187,500 cp on tick 1). `global_surface_scan` scanned 10,000 entries in a 2,000-stratum map.

`bypass_pore_clamp` is caught by `simulateWaterTransfer` + `clampMoisture` (`test_receiver_side_clamping_pore_space`). The engine drain path uses `getAvailablePoreCapacity()` (`soil.js:472–476`) and does not read that flag. Independent engine-path measurement below: a lower cell with 50 cp of room received exactly 50 cp and stopped at `getMaxWaterMass()` 140,400.

## 3. Technical Evaluation (attempt-2 findings)

Constants at `soil.js:18–24`: volume 50 cu ft, water density 6,240 cp/cu ft. A dry C-horizon cell reports `{rock: 300000, total: 300000}`. O/A max pore water is 140,400 cp; field capacity `floor(140400 * 0.35) = 49,140` cp. Constructor still fills a new `SoilStratum` with `solidMassCp = round(bulkDensity * 50)` (`soil.js:139–140`). `SoilStratum.deposit` then zeros solid, loose, and water unless `MUTANTS.mint_on_deposit` (`soil.js:148–157`).

Independent probes (temporary `probe_nat0401_attempt3.js`, 117 assertions, exit 0) called `engine.getTotalMass().total` on every tick of each scenario below.

### Attempt-2 finding: new strata minted `bulkDensity * 50` solid

**Fixed.** Gate fixture (high O/A at `(0,0,z=2,s=0)` with 50,000 cp loose, low O/A at `(1,0,z=-2,s=0)`): start 425,000 cp. 24 calls of `processSlopeStability` held 425,000 every tick. Source solid stayed 187,500; all 50,000 loose left; the low column held 50,000; new cells had 0 solid; max solid in the map was 187,500; `dirtySlope` size 0; 3 strata, 1 transfer. The `mint_on_deposit` mutant on this same fixture moved the world to 612,500 on tick 1 (caught).

### Attempt-2 finding: empty cardinal neighbours read as elevation 0

**Fixed.** Lone loose face 237,500 cp, 12 slope ticks: total unchanged, 1 stratum, 0 transfers, loose still 50,000, queue empty (`soil.js:558–559` skips `neighborElev === null`). Same cell with `groundElevationProvider` returning 162 ft for `(1,0)` only: total 237,500 held, deposit at `(1,0,z=0,s=1)` with 0 solid and 50,000 loose, 2 strata, queue empty. Other cardinals stayed unknown.

### Attempt-2 finding: source solid leaves sideways; emptied shell stays the surface

**Fixed.** Gate fixture source solid stayed 187,500. Emptied-shell probe: 30,000 cp loose on C at `(0,0,z=1,s=1)` over a solid base, neighbour far below. After 12 slope ticks the pile's `looseMassCp` was 0, `getHighestStratumAt(0,0)` returned the base (`soil.js:351–353` skips `!hasGround()`), base solid stayed 300,000, world total unchanged, queue empty.

### Attempt-2 finding: cascade never settles; dirty set grows

**Fixed on the measured slope paths.** Gate fixture `dirtySlope` 0 after 24 ticks. Three-column-plus chain (loose 180,000 on x=0, pedestals at x=1,2,3): 20 `simulateQuiescence` ticks held 1,380,000 cp, 3 sediment transfers, both queues empty, all 180,000 loose ended on x=3, 8 strata. Six-column mud ramp, 40 slope ticks: 2,100,000 cp held, `dirtySlope` 0, all 300,000 loose accounted. Competing neighbours: 1,390,000 cp held across 16 ticks, east filled to 300,000, west received the rest, 490,000 loose accounted, queue empty. Exhausted donor: 1,000 cp all moved, matrix stayed, 376,000 cp held, queue empty. Receiver at s=4: deposit at `(1,0,z=1,s=0)` with 0 solid and 40,000 loose, neighbour matrix unchanged, 415,000 cp held, queue empty.

### Attempt-2 finding: moisture pass clears the flag slope needs

**Fixed.** Two sets (`soil.js:284–287`, `401–411`, `534–541`). Dry cliff, `simulateQuiescence` (moisture then slope): 1 sediment transfer, cliff loose 0, total unchanged. `MUTANTS.moisture_clears_slope` is caught by the settle test (final step stayed 2.000 ft).

### Attempt-2 finding: capillary stops after one pulse, 33,671 cp short

**Fixed.** Donor C at 9,000 bp / receiver O/A at 1,000 bp, only the initial `markDirty`: receiver reached 49,140 cp, donor stayed at or above its own field capacity, water sum unchanged, `dirtyMoisture` empty. Gate report: 199 ticks unaided.

Short-donor probe (donor available 4,680 cp, receiver deficit 35,100 cp): world total 529,620 unchanged; donor stopped at field capacity; receiver gained exactly 4,680 (ended 18,720, still short of 49,140); queue empty after donor exhaustion.

### Attempt-2 finding: 0.407 cp rate rounded away before the residual

**Fixed in effect; implementation is a 1 cp floor plus unrounded residual for rates > 1.** `soil.js:430–435` does `rate = Math.max(1, rate)` on the live path. A 10 cp deficit closed in 10 ticks with donor loss exactly 10; `sawFrac` was false and the stored residual was 0 (the floor turns 0.407 into 1). A 100 cp deficit (gate) moved exactly 100 cp, carried a fractional remainder, and finished in 58 ticks. `MUTANTS.round_before_residual` is caught (field capacity missed). Owner scope: residual bookkeeping is non-blocking; the deficit closes in integer centipounds.

`dt = 0` still moved 1 cp of capillary water (measured). World total unchanged. Inferred: the floor ignores a zero timestep. Callers in this lane use `dt = 1`.

### Attempt-2 finding: `getHighestStratumAt` walks every stratum

**Fixed.** Column index (`soil.js:282`, `319–334`, `347–374`). 2,000-stratum world, one dirty face: 5 column lookups, 25 strata scanned, map size stayed 2,000, total unchanged. `MUTANTS.global_surface_scan` scanned 10,000 and failed the bound.

### Attempt-2 finding: gate asserted two loose fields after one tick

**Fixed.** Gate fixture asserts `getTotalMass().total` for 8 ticks, source solid, received loose, zero-solid deposits, and an empty slope queue. Independent 24-tick run of the same objects held 425,000. Save in the middle of the chain cascade, load, continue 18 ticks: totals matched the 20-tick straight run, and the sorted serialize snapshot matched.

### Attempt-2 finding: `index.js` alone does not publish the kernel

**Addressed for `soil.js`; `index.js` in a window-only realm still leaves `Geomorphology` unset.** `soil.js:1012–1017` assigns both `window.DEUS.Sim.Soil` and `.Geomorphology`. Measured: `soil.js` alone publishes both; `soil.js` then `index.js` aliases; `index.js` alone does not throw and does not publish. `test_browser_realm_entry_points` asserts the first load order and that `index.js` alone does not throw. No plugin on this tip loads either file (writer report; inferred from this lane's tree, not a full-repo plugin audit).

### Attempt-2 finding: ledger journal credit with no debit; residual entries 0

**Unchanged, in scope as non-blocking.** Slope tick of the gate fixture: `ledgerMassSediment` went 0 → 50,000 with no paired debit. `getTotalMass()` omits the journals (`soil.js:701–725`; probe with journals at ±999,999 left `total` equal to strata + reservoirs). Gravity residual of an integer drain is 0. Owner 2026-09-29: journal pairing and sub-centipound residual bookkeeping are not blocking on their own.

### Weathering, erosion, thermal, gravity direction

Eight exposed `applyWeathering` calls plus an unexposed call: rock + loose = original 300,000, `bulkDensity` stayed 6,000, world total unchanged. Erosion 9,375 cp into the suspended reservoir; `depositSuspendedSediment` debited the reservoir and credited downstream loose; total unchanged. 300 K thermal inert; 1,200 K split solid + ceramic + ash/gas equalled the original solid; total unchanged. Gravity from `z=0,s=0` reached `z-1,s=4`; the `z+1` decoy stayed 0; source ended at or below field capacity.

Water on a sliding pile stayed in the source cell (70,200 cp still there after the 50,000 loose moved). World water sum unchanged.

### Additional measurements (not attempt-2 FAIL items)

**Over-full fill-height cap.** `fillHeightFt` is `min(2, volume/25)` (`soil.js:217–218`). Adjacent full O/A cells at the same band, source carrying 200,000 extra loose: both surfaces 162 ft, 0 transfers, loose still 200,000 on the source, world total unchanged. Extra loose above 50 cu ft does not raise the surface, so an equal-height neighbour does not receive it. Writer's report already names this model. Weight is conserved. Inferred for a future bridge: callers should avoid feeding over-full cells if they want that extra loose to cascade.

**Moisture dirty set when drain has no destination.** O/A at `z=-16,s=0` with 9,000 bp and no downward neighbour: water unchanged, `dirtyMoisture` size 1 after 10 ticks. Upper excess over a pore-full lower cell: water unchanged, `dirtyMoisture` size 1 after 8 ticks. Opening 1,000 cp of room on that lower cell (external write) then produced a 1,000 cp drain on the next tick, so the requeue is live (`soil.js:487–490`). Weight conserved. The world-bottom case has nowhere to go and stays dirty. Inferred: a later climate tick that always calls `processMoistureTick` will keep visiting that id.

**`SoilStratum.deserialize` omitted `solidMassCp`.** Payload with the field deleted produced `solidMassCp = 187,500` (`soil.js:272`). Engine `serialize` always writes the field. Live save/continue on this tip used complete payloads.

### Uncaught mutants (copied suite, patched `soil.js` in `%TEMP%`, original tests otherwise unchanged)

| Patch | Gate result | What the product currently does (measured on the committed file) |
|---|---|---|
| Disable `reposeAngleDeg` cohesion/liquefaction (`soil.js:496–506`) | 136 passed, 0 failed | Dry 34°, moist O/A 45°, wet O/A 20°. A wet O/A pile shed until step 1.820 ft (`tan(20°)*5`). Gate cascade fixtures are dry; `tools/test_soil_geomorphology.js` never names `reposeAngleDeg`. `checkCollapse` compares two numbers on a POJO. |
| Drop excess-water requeue (`soil.js:487–490`) | 136 passed, 0 failed | Product requeues; blocked-drain probe kept `dirtyMoisture` at 1 and drained after space opened. |
| Uncap `fillHeightFt` | 136 passed, 0 failed | Product caps at 2 ft. Over-full plateau probe is the observable. |
| Drain without `getAvailablePoreCapacity` on the engine path | 136 passed, 0 failed | Product clamped a 50 cp gap to 140,400 on `processMoistureTick`. Gate pore test hits `clampMoisture` only. |

These are gate-coverage gaps. They did not produce a live closed-mass failure on the committed kernel. The 14 roster mutants that restore the attempt-2 defect classes are all caught.

## 4. Verdict

HEAD is `94e89cffb7981d6e0c82adf2199d52f6b8495955`. The merge-base diff stays inside `lane.json` `allowedPaths`. Gate: `RESULT: 136 passed, 0 failed`, exit 0. Sweep: `SWEEP RESULT: 14 caught, 0 survived`, exit 0, every mutant on a `FAIL:` line.

Every attempt-2 blocking item was re-measured on this tip and holds: deposit cells start at 0 solid, unknown ground is skipped, solid matrix stays, slope queues empty, moisture and slope queues are separate, capillary runs until field capacity or donor exhaustion, a 10 cp deficit closes, surface lookup is column-local, and `getTotalMass().total` is asserted (and independently re-asserted) on every tick of the required fixtures, including a 24-tick gate cascade, a provider floor, a 4-column chain with save/continue, competing neighbours, an exhausted donor, an s=4 → z+1 deposit, and a short-donor wick. No probe found a stratum with `solidMassCp > bulkDensity * 50` on an engine path. No probe found a slope cascade that was still dirty after 40 ticks.

Coverage gaps remain (engine repose-vs-moisture, engine pore clamp, excess-water requeue, fill-height cap). The over-full height cap hides extra loose from equal-height neighbours. Journals still credit without debit. Those sit inside the Owner's 2026-09-29 non-blocking bucket or are model notes with conserved weight. Created or destroyed material was not observed.

VERDICT: PASS
