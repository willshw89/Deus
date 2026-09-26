# WG.00.17 lane AA report

Writer resume: Grok, after the Claude writer was lost. Parent of the launch commit: `574e5c2b681763761af82a8ad593d8a1b5a03541`. Commands below ran from a throwaway clone of `63d4156f6e986c5680e2c0246f20b47e4e26a3db` (`node tools/zrange/clone.js`), not from the worktree. `DEUS_Z_RANGE` unset means the game's default range (-16..+15). Base of the lane: `5255f1a58a9d95bb7bc08377ef055c366610e486`.

The code, docs, literal map, and test driver were already on the branch (Claude WIP through `bcfc8d8f`). This session did not redo those commits. It ran the gates, finished the tip stress bench the checkpoint had left at the first snapshot line, and wrote this file.

`git diff 575c5fdb2e346fff91ddc3b643854875aea1b817 HEAD -- game` is empty. Benches that name `575c5fdb` measure the same game bytes as this branch.

## Frozen-path exception

`docs/STATUS.md` lists `DEUS_Levels.js`, `DEUS_World.js`, `DEUS_WorldGen.js`, and `DEUS_Fluid.js` under Frozen / Read-Only Paths. The brief grants this lane an exception for Z-range, sparse storage, generation of the new layers, and the feet conversion, the same kind of exception Lane N had. No other frozen path was edited. `game/js/plugins.js`, `DEUS_Test.js`, `game/js/sim/**`, and the gate tools were not edited.

## PM ruling E1-A

`game/js/plugins/DEUS_Depth.js`, `switchState` inside `layers_flat.switch_same_frame`. One line. The renderer was not edited.

Before:

```js
const r = D.root(), out = { frame, root: !!r, want: [to - 1, to - 2].filter(z => L.isLevel(z)), planes: [], planesOk: false, units: [], missing: [], stale: [] };
```

After:

```js
const r = D.root(), out = { frame, root: !!r, want: [to - 1, to - 2].filter(z => L.isLevel(z) && (z === to - 1 || (config.exposes(to - 1) && openCells(area.x, area.y, to - 1).open > 0))), planes: [], planesOk: false, units: [], missing: [], stale: [] }; // depth 2 only under rebuild's rule (PM ruling E1-A, WG.00.17)
```

`git diff --stat 5255f1a58a9d95bb7bc08377ef055c366610e486 HEAD -- game/js/plugins/DEUS_Depth.js` is `2 +-`. Regression log from the earlier commit, still the same line: `evidence/e1a/test_switch_depth2_083d70dc.log` ends `RESULT: 12 of 12 as required (plain variants PASS, provocations CAUGHT)` and `EXIT=0`.

## lane.json gates

Exact commands, clone `gates_63d4156f`, logs in `evidence/grok/`.

```
node tools/test_zrange.js
DEUS_Z_RANGE=unset
EXIT=1
```

That run's three sim phases each stopped with `HARNESS watchdog: whole run took longer than 180 s` (182-183 s, three NW.js processes at once). `matter_unchanged` then had no census. The other nine checks printed PASS. Log: `63d4156f_lanejson_test_zrange.log`.

Retry of the same command, CPU median 3%, 16 logical processors, no other `nw.exe`:

```
node tools/test_zrange.js
DEUS_Z_RANGE=unset
EXIT=0
```

`RESULT: 10 passed, 0 failed (exit 0)`. Log: `63d4156f_lanejson_test_zrange_retry.log`.

```
node tools/test_layer_render_flat.js
DEUS_Z_RANGE=unset
EXIT=0
```

`run: RESULT: 12 passed, 0 failed (exit 0)`

```
node tools/test_layer_render_flat.js --suite depth
DEUS_Z_RANGE=unset
EXIT=0
```

`run: RESULT: 27 passed, 0 failed (exit 0)`

```
node tools/test_minimap.js
DEUS_Z_RANGE=unset
EXIT=0
```

`RESULT: 24 passed, 0 failed (exit 0)`

```
node tools/test_layer_switch_inplace.js
DEUS_Z_RANGE=unset
EXIT=0
```

`RESULT: 7 passed, 0 failed (exit 0)`

```
node tools/check_deus_syntax.js
DEUS_Z_RANGE=unset
EXIT=0
```

`Checked 52 DEUS plugin files. Errors: 0`

```
node tools/test_palette.js
DEUS_Z_RANGE=unset
EXIT=0
```

`Palette loaded successfully`

## Repeats, other ranges, provocations

Three consecutive layers_flat runs at the default range, each `EXIT=0`, each `12 passed, 0 failed` (32.0 s, 31.2 s, 28.1 s). Three consecutive depth runs, each `EXIT=0`, each `27 passed, 0 failed` (38.5 s, 34.0 s, 34.7 s).

```
node tools/test_layer_render_flat.js
DEUS_Z_RANGE=-4..4
EXIT=0

node tools/test_layer_render_flat.js --suite depth
DEUS_Z_RANGE=-4..4
EXIT=0

node tools/test_minimap.js
DEUS_Z_RANGE=-4..4
EXIT=0

node tools/test_layer_switch_inplace.js
DEUS_Z_RANGE=-4..4
EXIT=0

node tools/test_layer_render_flat.js
DEUS_Z_RANGE=-16..15
EXIT=0

node tools/test_layer_render_flat.js --suite depth
DEUS_Z_RANGE=-16..15
EXIT=0

node tools/test_layer_render_flat.js
DEUS_Z_RANGE=-2..2
EXIT=0
```

Each of those printed 12, 27, 24, or 7 passed and 0 failed, matching the suite.

```
node tools/test_layer_render_flat.js --provoke --jobs 3
DEUS_Z_RANGE=unset
EXIT=0
```

`RESULT: all required checks passed, 8 provocation(s) run (exit 0)`. The eight lines are `CAUGHT`, including `depth.switch_same_frame`.

```
node tools/test_layer_render_flat.js --suite depth --provoke --jobs 3
DEUS_Z_RANGE=unset
EXIT=0
```

`RESULT: all required checks passed, 16 provocation(s) run (exit 0)`. Sixteen `CAUGHT` lines, no `NOT CAUGHT`.

```
node tools/test_layer_switch_inplace.js --mutants
DEUS_Z_RANGE=unset
EXIT=0
```

`MUTANTS: 8/8 caught`.

```
node tools/test_zrange.js --provoke-all
DEUS_Z_RANGE=unset
EXIT=0
```

`PROVOCATIONS: 11/11 caught`.

```
node tools/test_zrange.js --phase=core --commit=5255f1a58a9d95bb7bc08377ef055c366610e486
DEUS_Z_RANGE=unset
EXIT=0
```

Same-session base New Game timing is in the section below.

## Memory, saves, feet, matter

From the retry's `sparse_memory` / `sparse_save` / `feet_2ft_10ft` / `matter_unchanged` / `legacy_save_loads` / `old_layers_identical` lines (seed 18):

| | -2..+2 (5) | -4..+4 (9) | -16..+15 (32) |
|---|---:|---:|---:|
| Baseline store | 1,622,552 B | (inside the same check) | 1,693,592 B |
| JS heap after New Game | 103,000,000 B | 109,000,000 B | 109,000,000 B |
| Terrain + fluid save parts | (legacy shape) | 5,879 B | 5,881 B |

Difference of the baseline store, 32 minus 5: 71,040 B. The check's bound is the same 71,040 B: `(32 - 5) x 64 x 2 B = 3,456 B` of directory plus `12 x 5,632 B = 67,584 B` of MIXED mountain rock above +2. Outer layers are UNIFORM. A first write splits one chunk.

Fresh-world terrain and fluid parts differ by 2 B between -16..+15 and -4..+4. The stated bound is 256 B.

Feet: stratum 2 ft, layer 10 ft, square 5 ft, `Z_STEP_FEET` 10. Blast strata at the tip: radii 3, 5, 7 ft destroy 3, 9, 27 strata. The base fixture destroys 7, 15, 51 (the 1 ft table).

`old_layers_identical`: checksums of -2..+2 at all three ranges equal the base fixture `34c59783 eaf389b9 9998ffb2 dcfbb91b 433f2728`.

`matter_unchanged`: ledger `f09726b0` at base and at the tip, New Game and after 1500 updates, all three ranges. Rock above +2: 5,160 strata at every range.

`legacy_save_loads`: the base save loads at -2..+2, `zRange` absent, 3,302 items, 1,240 units, cells identical to the save and to the base commit's own load. A second save/load stays at -2..+2 with `zRange` absent.

`path_scratch_bounded`: one ground route allocated scratch for 1 level, not 9 or 32.

`extreme_layers_work`: a unit stood, walked, and pathed on +15 and -16 (and on the ends of the other two ranges). Stepping past the ends was refused.

Same-session New Game (`setupNewGameMs`, forced GC heap), base core phase versus the tip retry's core phase:

| | setupNewGameMs | heap |
|---|---:|---:|
| Base `5255f1a5`, this session | 13,665.3 | 123,000,000 |
| Tip -2..+2 | 16,074.8 | 103,000,000 |
| Tip -16..+15 | 19,314.2 | 109,000,000 |

-16..+15 setup time is 19,314.2 / 13,665.3 - 1 = +41% against the brief's +20% New Game budget. Heap is 109/123 - 1 = -11%. The 5-level tip is already 16,074.8 ms (+18% vs the base): that is chunkify of the same five levels. The 32-level tip adds about 3.2 s on top of that (outer directories and the mountain caps). I did not change generation to chase the 3.2 s. The +41% figure is the miss.

## Bench

Normal x2 and base stress x2 were already in `perf/` from the lost run (measured `575c5fdb` and `5255f1a5`). JSON copied from those clones into `perf/`. The tip stress log in the checkpoint stopped after the snapshot line. It was run again.

```
node tools/bench_render_layers.js --load-probe (tip stress)
DEUS_Z_RANGE=unset
EXIT=3
```

Four probes, all `loaded` (other `nw.exe` 7, then 0 on the last sample, CPU median 24.5-40%). Exit 3 is the tool's "540 s used up: call --load-probe again". The bench was started after that, not after a quiet probe.

```
node tools/bench_render_layers.js --scenario stress --runs 2 --pre-log
DEUS_Z_RANGE=unset
EXIT=0
```

Run 1 machine load `loaded` (CPU median 26.6%). Run 2 `quiet` (CPU median 23.7%, other nw.exe 0). Log: `perf/bench_tip_stress.log`.

```
node tools/bench_render_layers.js --load-probe (tip -4..4)
DEUS_Z_RANGE=-4..4
EXIT=0
```

`QUIET`, CPU median 14.8%, other nw.exe 0.

```
node tools/bench_render_layers.js --scenario normal --runs 1 --pre-log
DEUS_Z_RANGE=-4..4
EXIT=0
```

Paused +2 tick median on that run: 1.295 ms and 1.06 ms (planes on), 0.895 ms and 0.75 ms (planes off).

```
node tools/zrange/bench_compare.js normal
EXIT=0

node tools/zrange/bench_compare.js stress
EXIT=0
```

Full tables: `perf/compare_normal.md`, `perf/compare_stress.md`. The compare script prints `CPU median ?` because it reads `machineLoad.overall`, and the bench JSON stores CPU on the phase rows and the worker counts under `machineLoad.start` / `end`. The log lines above are the CPU figures.

Stress, both phases, median and p95 of render, render.depth, render.tilemap_layers, update.spriteset, drawCalls, and update.map median: the compare script's budget column is `within` on every row. Several render p95 numbers are lower on the tip than on the base.

Normal: the compare script lists 66 budget rows as OVER. Pattern, not a second table:

- Paused +2 phases. Absolute gaps are 0.003 ms to 0.24 ms on timers of about 0.02 ms to 1.5 ms, so a small step is more than 10%. Tick median stays under 2.5 ms (tip 1.465, 0.948, 1.090, 0.858 on the four paused +2 phases). Draw calls match (15.5 and 13).
- Steady and switch p95 of `render.depth` moves from about 0.15-0.27 ms to about 1.7-1.9 ms on some phases (steady_+1, minimap_tabs, switch_2_to_1, switch_0_to_1, switch_1_to_2). Median `render.depth` on those phases stays about 0.11-0.17 ms. `update.map` on the same phases is 40-100 ms, which is the frame. A single slow sample moves p95 by about 1.5 ms.
- `drawCalls` median +2 or +3 on steady_+1 (17.5 to 19.5) and on switch_2_to_1 / switch_0_to_1 / switch_1_to_0.
- `update.map` median is inside +10% except switch_1_to_0 (77.115 to 89.47, +16%) and switch_0_to_-1 (53.065 to 59.328, +12%).

Normal runs on both sides were labeled quiet in the bench logs (tip normal: CPU median 22.7% and 23.8%, other nw.exe 0). Base normal and base stress logs are the checkpoint files, `EXIT=0`.

## Whole suite

`DEUS_Test.js` (read only) stops a run at 180 s. `node tools/run_tests.js` with no suite name does not finish inside that.

```
node tools/run_tests.js
DEUS_Z_RANGE=unset
EXIT=2
```

Base clone: `nw.exe exited after 168.3 s with code 0 before the harness finished` during worldgen. No `RESULT` line. Seed 35512787.

```
node tools/run_tests.js
DEUS_Z_RANGE=unset
EXIT=2
```

Tip clone: `HARNESS watchdog: whole run took longer than 180 s`, then `RESULT: 256 passed, 25 failed (exit 2)`. Seed 936317840. `objects.drawn_in_view` in that log is the frame the watchdog cut (sprite missing, anchor NaN).

Suites run alone afterwards, so a cut run is not the only evidence:

| Command | Where | EXIT | What failed |
|---|---|---:|---|
| `node tools/run_tests.js world` | tip, seed 225237620 | 1 | `path_blocked_fast`, `path_gives_up_when_crowded`, `faces_eight_ways`, `no_path_is_true`, `frame_cost`. Walk checks passed (14 steps). `RESULT: 25 passed, 5 failed` |
| `node tools/run_tests.js biomes` | base, seed 433621342 | 1 | `world_variety`, `ocean_rim`, `objects_dense`, `kit_present`, `camps_cleared` |
| `node tools/run_tests.js tiles` | base | 1 | `tileset_names` |
| `node tools/run_tests.js objects` | base | 1 | `tile_object_drawn`, `blocks_passage`, `sorted_with_units`, `apply_chop`, `regrow`, `perf_dense`. `persists` and `drawn_after_reload` passed |
| `node tools/run_tests.js objects` | tip, first | 1 | also `persists` and `drawn_after_reload` (boulder diff missing) |
| `node tools/run_tests.js objects` | tip, second | 1 | `apply_chop`, `regrow`, `tile_object_drawn`, `blocks_passage`, `sorted_with_units`, `perf_dense`. `persists` passed (`objectDiffs["0,0"][31878] = 35`). `drawn_in_view` passed |
| `node tools/run_tests.js worldgen` | tip, second seed | 1 | `river_continuous`, `kit_per_area`, `kit_covers_plan`, `kit_fair`, `autotile_shapes` |
| `node tools/run_tests.js history` | base, seed 1015141096 | 1 | the eight history checks the tip's cut run also failed (`generated_with_world`, `no_years`, `founders`, `campfire_start`, `stats_and_ranks`, `add_event`, `settle_off`, `legacy_switchable`) |

The world-suite failures on the dedicated tip run are the same names the base full run failed, except `no_corner_cut` (base failed it, the tip world run passed it). The full-run tip failures of `single_area_world`, `faces_its_steps`, and `unit_walks_to_goal` were seed 936317840 finding no 16-cell open row (`walk from x null`). Seed 225237620 walked 14 steps.

`kit_per_area` / `kit_fair` passed on the base seed and failed on two tip seeds when a camp had no objects (one of them at x=12). Seed 18's -2..+2 cells match the base (`old_layers_identical`). `kit_covers_plan`, `river_continuous`, and `autotile_shapes` failed on the base full run and on the tip.

`objects.persists` failed on one tip seed and passed on the next, with the diff present. I did not treat that as a storage change to fix.

Biomes, tiles, history, and the shared objects failures are on the base commit as well.

## Functions touched

Z-range, sparse storage, outer-layer generation, or the feet conversion. Test-only edits inside these files are listed in `test_changes.md`.

| File | Functions |
|---|---|
| `DEUS_World.js` | `checkZRange`, `parseZRange`, `newWorldZRange`, `zResync`, `isLevel` (inline), `World.newWorld`, `World.buildArea`, `levelOfMapId`, `map id slot`, `setTile`/`setObject`/`getTile`/`getObject` via `levelKey`, `search3D`, `slot3D`, `growHeap3D`, `planPath`, `World.pathScratchStats`, `warmLevel`, load prewarm, `registerChecks` (`level_ids`) |
| `DEUS_Levels.js` | `zrResync`, chunk store (`chunkify`, `seal`, `storeLocate`, `splitChunk`, `uniformStore`, `outerBaseline`, `materializeCaps`), `elevationOf` / `levelOfElevation`, `applyVolumeDamage`, `sphereDamage`, `worldStrataElevationAt`, `airRunAt`, `continuousAirHeight`, `colTopsOf`, `hasOpaqueOverburden`, `volumeOf`, `step`, level plate, `verticalSuite`, `strataSuite` |
| `DEUS_Fluid.js` | `zRange`, `gridFor`, `zeroGrid`, `cellIdOf`, `decodeCellId`, `enqueueCell`, `canDrainDown`, `stepArea`, `reconcileCellWithStrata` |
| `DEUS_WorldGen.js` | `cellInfo`, `kitCentres`, synthetic state in `kit_seeded` |
| `DEUS_Minimap.js` | `zRange`, `tabLevels` |
| `DEUS_Depth.js` | `switchState` only (E1-A). No feet literal remained to change beyond what the range work already did not touch; the diff is the one line above |
| `DEUS_Environment.js` | `ambientTemperature` (per-level cache key; below -2 uses the deep rule, above +2 the peak rule) |
| `DEUS_DayNight.js` | `underground` (`z < 0`) |
| `DEUS_Fire.js` | `acceptsArea`, `parseKey` |
| `DEUS_Floors.js` | `supportedArea`, `applyRoofedUpperDeck` |
| `DEUS_Colonists.js` | `levelSupported` |
| `DEUS_Doors.js` | `validZ` |
| `DEUS_Items.js` | `validArea` |
| `DEUS_Jobs.js` | `validLevel` |
| `DEUS_Objects.js` | `validArea` |
| `DEUS_Ownership.js` | `supported` |
| `DEUS_Walls.js` | `baseAt` |
| `UF_Households.js` | `levelOk`, `context` |
| `DEUS_HistoricalDemographics.js` | `worldZRange`, `validate` |
| `DEUS_History.js` | `syntheticState` |
| `DEUS_Wildlife.js` | synthetic state in the seed check |

`DEUS_Ecology.js` had no Z literal to change.

## Docs

`docs/systems/DEUS_ZRange.md` is the range object, the three configurations, `DEUS_Z_RANGE`, map id slots, consumers, the 2 ft / 10 ft scale, sparse chunks, the save format, and the legacy rule. `UF_Levels.md`, `UF_World.md`, `UF_WorldGen.md`, and `DEUS_Fluid.md` were updated in the Claude WIP (`42754a9f`). I did not rewrite them.

`literal_map.md` and `test_changes.md` are the Claude WIP (`bcfc8d8f`).

## Open questions (copied, not answered)

- Lava on -2. Natural pools stay water on -1 and lava on -2. Whether lava belongs on the new layers below -2 is open.
- ADR-003 Q16 (Owner): when the range grows, are existing 5-level saves upgraded to 32 layers, or kept at 5? The ADR's proposed answer, which this lane implemented: keep old saves at 5; new worlds at 32. An upgrade path can come later.
- The band table. DEC-013's five bands and which biomes and races sit in them are `OPEN` (`docs/OWNER_DECISIONS.md` around the DEC-013 amendment). Until that is decided, layers outside -2..+2 are air above and solid rock below, plus the mountain rock already generated above +2. `DEUS_Environment` uses the nearest existing temperature rule.

The default split -16..+15 is the PM default and is still open for the Owner (DEC-013).

## Follow-ups

- PROPOSED-AA-01. `UF.World.units()` can return the previous world's units after a load. `_unitsCache` is cleared on add/remove, not when `state` is replaced. The legacy check reads `state.units` directly. Clearing the cache is not a Z-range change, so it is not in this lane. Noted in `escalation.md` F2.
- PROPOSED-AA-02. WG.00.21 occlusion. This lane does not change how many depth planes are drawn.
- PROPOSED-AA-03. WG.62.02 bands, after the Owner answers the band table.
- PROPOSED-AA-04. `DEUS_Test.js` 180 s watchdog. `node tools/run_tests.js` with no suite name does not finish. The file is read only here.

## Scope

`git diff --name-only 5255f1a58a9d95bb7bc08377ef055c366610e486 HEAD` is only under `docs/systems/` (the five files named in the brief), `game/js/plugins/` (the 21 plugins in the table above), `tools/test_zrange.js`, `tools/zrange/**`, and `tasks/WG.00.17/**`. This report and `evidence/grok/` are under `tasks/WG.00.17/**`.

Gate tools and `DEUS_Test.js` are not in that diff.

## SHA

Worktree at the start of these runs: `63d4156f6e986c5680e2c0246f20b47e4e26a3db`.

The commit that adds this report is recorded by the following `git rev-parse HEAD` after that commit is made. The line the launch prompt asks for is printed after `git push origin task/lane-aa`.
