# Grok review: NAT.03.01 / lane-cw fluid correctness

Reviewer: Grok (xAI), independent of the Codex writer.
Worktree: `C:\Users\snewt\.deus_worktrees\lane-cw`
Branch: `task/lane-cw`
Node: v24.19.0
Date: 2026-09-30

Reviewed tip (`git rev-parse HEAD`): `28fe2614d20b518617116855c5d1fb004435f449`
Implementation commit: `9d8515d86b548c5a84d2fee6259198f3b615677e`
Merge-base with `origin/main`: `f3f5288a51675ecaa20804775f55e0cbdd8c624d`

The launch text named `28fe2614bdfc25983711904e54228965809dfaee`. `git cat-file -t 28fe2614bdfc25983711904e54228965809dfaee` failed: that object is not in this repository. The eight-character prefix `28fe2614` is HEAD. This review is of `28fe2614d20b518617116855c5d1fb004435f449` and of implementation commit `9d8515d86b548c5a84d2fee6259198f3b615677e`. No source file was modified for the review.

`9d8515d8` changes the plugin, `sim/hydro/index.js`, the Fluid doc, the lane manifest, the work log, and `tools/test_fluid_correctness_lane_cw.js`. `28fe2614` adds the writer report, evidence logs, and the work-log handoff note only.

## Commands

Run in this worktree on the tip above.

| Command | Exit |
|---|---|
| `node tools/check_deus_syntax.js` | 0 (62 plugin files, 0 syntax errors) |
| `node tools/test_fluid_correctness_lane_cw.js` | 0 (`RESULT: 46 passed, 0 failed`, 23 cases and 23 killed mutants) |
| `node tools/test_strata_fluid_reconciliation.js` | 0 (36 passed, 0 failed, 5/5 mutants) |
| `node tools/sim/test_water_dynamics.js` | 0 (`RESULT: PASS (0 failed)`, 9-layer and 32-layer) |
| `node tools/sim/test_fluid_attach.js` | 0 (`RESULT: PASS (0 failed)`) |
| `node tools/test_fluid_correctness_lane_cw.js --case=i_real_mass_deletion --mutant=mass_delete` | 1 |

The deletion run printed `FAIL i_real_mass_deletion: destination lost mass under deletion mutant` and `4 !== 5`. That is the expected conservation failure. The unmutated suite's same case passed.

These are worktree runs. An untracked `tasks/NAT.03.01/lane-cw/launches/20260930_141833_prompt.txt` was present and was not part of HEAD. The suites load committed sources.

## Scope

`git diff --name-only f3f5288a51675ecaa20804775f55e0cbdd8c624d HEAD` is 15 paths. Each matches `lane.json` `allowedPaths`:

- `game/js/plugins/DEUS_Fluid.js`
- `game/js/sim/hydro/index.js` (`game/js/sim/hydro/**`)
- `docs/systems/DEUS_Fluid.md`
- `tools/test_fluid_correctness_lane_cw.js` (`tools/test_fluid*.js`)
- `tasks/NAT.03.01/lane-cw/**` (brief, report, work log, lane manifest, writer launch prompt, six evidence logs)

`game/js/sim/hydro/` still contains only `index.js` and `permeability.js`. `permeability.js` is unchanged. No `sim/hydrology` path is in the diff. `tools/test_strata_fluid_reconciliation.js` is unchanged. `docs/STATUS.md` and `docs/VISION.md` are unchanged.

## Item review

### (a) Work budget

`tick` takes one nonnegative budget. Explicit `0` returns before `syncRange`, area walks, and `beginTick`, and clears hydro cost if a session already exists (`DEUS_Fluid.js` `tick` / `step`). `workBudget` maps non-finite and negative values to 0.

Dirty areas sit in `activeAreas`. The tick pulls from that set, subtracts cells actually dequeued from the shared remainder, and visits each area that was active at the start at most once. `depthAt` on 2,000 empty areas does not make `tick` iterate `areas`. Lake cells are indexed in `rebuildLakeIndex` at define/import/`setEvap` time. A dry season with `evap === 0` consults the empty evaporation list and does not walk lake definitions during the tick.

`lakeShare` gives idle fluid queues the whole budget and, when fluid is queued, half (budget 1 alternates). Unused lake visits return to the fluid remainder because `beginTick` returns the visit count. `cost().work` is processed cells plus lake visits. `examined` counts probes inside those items, including refused seep/delivery reads. `a_cost_counts_probes` sees examined 2 and work 1 for one evaporating lake visit.

`a_shared_budget_all_areas` caps `tick(3)` at 3 across 20 areas and then drains the off-view remainder. The water-dynamics quiescent and `cost_bound` cases still pass after the scheduler change (settled examined/processed 0; 32-layer full-scan mutant still trips 32,768 examines).

### (b) Range rebasing

Load keeps integer `z` outside the live range: `extractSaveContents` stores the record and `enqueueCell` parks occupied out-of-range cells on `dormant` instead of dropping them. `b_load_preserves_outer_layers` round-trips `z=-16` water and `z=15` lava, leaves them unchanged across `tick(10)` while the range is still `-2..2`, then schedules them after the range opens. Volumes stay 6 and 5.

`syncRange` runs when the live `zMin`/`zMax` differ. It shifts queued ids by `(oldZMin - newZMin) * n`, resets `head`, rebuilds `inQueue`, and wakes dormant cells that entered range. `b_rebase_queued_coordinates` expands to `-4` and to `-16`, checks `queueZMin`, and finds the 5 water moved from `z=0` to `z=-1` with volume preserved. Re-entry is safe: `knownRange` is updated before the walk.

### (c) Overloads and caller z

`parseCoords` treats a following numeric argument as `(area, x, y, z)` and a lone object as nested `area` or flat `{ax, ay, x, y, z}`. Area fields prefer `ax`/`ay`, then `x`/`y`. `c_query_overloads` checks `depthAt`, `typeAt`, and `fluidFillFractionAt` for numeric coordinates, both area spellings, nested area, and the flat ax/ay form (area 3,4, cell 2,5, z -1, lava 3, fill 0.5). `setCell` reads `ax` or `x` and clamps depth to live capacity, including capacity 0. `c_set_capacity` covers caps 0, 1, 3, 6, and 7.

`walkable` uses a numeric z argument or `opts.z`, including the `(area, x, y, z)` form. `c_walkable_caller_z` requires the deep water at `z=-1` to block, allows `canSwim`, and treats `z=0` as dry.

### (d) Typed liquid

Reconciliation moves excess only into an empty cell or the same type, upward and laterally. Leftover calls `receiveDisplaced(excess, typeName)`. Hydro v2 stores lava in `displacedLava` and keeps v1 `displaced` as water. If `require` of hydro fails, the same excess goes to `pendingDisplaced` and save/load restores it. `mass().total` stays a water total; lava is `displacedByType.lava` and `diagnostics().totalLavaMass`. The displaced fixture keeps water 5 and lava 7 through ticks and through a no-hydro round trip. A v1 blob `{displaced: 11}` reloads as water with lava 0.

### (e) Save resilience

`DataManager.extractSaveContents` always calls `Fluid.extractSaveContents`. A missing `deusFluid`/`ufFluid` key resets grids, queues, pending displacement, and the hydro session. `e_absent_save_keys_reset` drops a live aquifer of 100 and both typed masses to 0.

When hydro's `require` throws, the blob is deep-copied into `pendingHydro` and `makeSaveContents` emits that copy while `session` is null. `e_failed_require_payload_preserved` keeps atmosphere 900, displaced lava 8, aquifer 31, and `futureField` for both save-key aliases, and a mutated returned object does not stick to the next save. `loadHydroModule` caches the failed require, so the opaque payload remains the save source for the rest of the process.

### (f) Mass totals

`asInt` accepts any JavaScript integer and rejects non-integers. `mass().total` is `grid + aquifers + atmosphere + displaced` with no `| 0`. Import uses `asInt` on atmosphere, both displaced fields, and aquifer rows. `f_large_mass_totals` round-trips grid `2^31+9` and `2^32+17` plus aquifer `2^32+5`, atmosphere `2^31+7`, water displaced `2^32+3`, and lava `2^32+11`.

Remaining `| 0` uses are coordinate packing, cell depth/capacity (0..7), or the test-only full-scan size. The Fluid doc states the ceiling: Number safe integers, not a 64-bit BigInt. That matches the brief's ban on bitwise narrowing and the values the suite actually uses. `2^32+17` is the case `| 0` used to destroy.

### (g) Barriers

Hydro `blockedAt` is Fluid `isBarrier`. Lateral rain/spill calls `fluidCanPassLaterally` with the neighbor coordinates and a defined 8th argument so small absolute coordinates stay absolute (`nz === undefined` is what selects delta mode). `upOpen` rejects an object barrier on the source and a barrier on `z+1`, then still requires the strata UP bit. `seepFrom` returns on an object barrier at the source and at every column step, and porous terrain with capacity 0 still seeps.

`g_rain_closed_door_and_wall`, `g_spill_shared_barriers` (east and up), and `g_seep_shared_barriers` (barrier at `z` 0, -1, and -2) keep destination depth 0 and preserve atmosphere or source depth. Removing the barrier, or opening the rain door, lets the liquid move. Water-dynamics `flood_refuses_solid`, `lava_not_seeped`, and both layer ranges still pass.

`canDrainDown` also treats an object barrier on the source cell as closed. The waterfall fixtures have no door there, and they still drain.

### (h) Documentation and game translation

`docs/systems/DEUS_Fluid.md` describes the shared budget, dormant outer layers, typed `pendingDisplaced` / `displacedLava`, safe-integer mass, barrier sharing, and D2's open authority, return path, and reactions. It records F5 playtest as NOT RUN and names `DEUS_Levels.js` (including `Sprite_UFFloodOverlay`), `DEUS_World.js` `walkable`, and `DataManager`. It states that inspection did not find a Fluid query in `DEUS_Visuals.js`. A search of that plugin hits only its own name. `sim/hydrology` is named as still separate. The header comment in `DEUS_Fluid.js` no longer claims a 60 FPS guarantee.

`h_documentation_status` rejects `COMPLETED`, `VERIFIED`, `60 FPS`, and `zero GC`, and requires the bridge/status tokens. The writer `REPORT.md` GAME TRANSLATION block is tied to `9d8515d86b548c5a84d2fee6259198f3b615677e`, class C, with playable proof NOT RUN. The handoff commit does not contradict that: it adds the report and logs only.

### (i) Real mass deletion

Vertical and lateral transfers debit the source by the full amount and then, only when `_configure({ _mutantDelete: true })`, subtract one from the destination depth that is packed. The default flag is false. `i_real_mass_deletion` places 5 water over an open cell below, steps once, and requires the source to empty and the total to stay 5. With the flag on, the same step leaves 4. The suite applies that flag only for `--mutant=mass_delete`; the other mutants are source substitutions in a VM copy and must fail the named assertion rather than throw.

The old pattern reduced `transferAmt` on both sides and still conserved. The committed write is an actual one-unit loss.

## Residuals that do not change the verdict

- Strata reconciliation's emergency shove (`reconcileCellWithStrata`) still picks an above/side cell by capacity and type only. It does not call `fluidCanPassLaterally` or `isObjectBarrier`. That loop was already the displacement path; this commit added the same-type guard. Item (g) and the `g_*` cases cover hydro rain, tick spill, and seep, and those call the shared barrier helpers.
- `fluidCanPassLaterally`'s public wrapper still omits the 8th argument and relies on the pre-existing `|dx|<=1` heuristic. The strata lip calls use neighbor `(17, 10)` and passed. Hydro's adapter passes `z`, so its absolute neighbors are not interpreted as deltas.
- World-range shrink (as opposed to expansion) is not an acceptance case. The id shift math is the same operation the expansion test exercises.
- Editor F5/F8 playtest is NOT RUN, which is the lane's stated foundation boundary.

## VERDICT: CLEAN PASS
