# REPORT: DEUS-TSK-ZRANGE-HARNESS (lane-bd)

Writer: grok. Reviewer: gemini (not run by this lane). Status: stopped on a scope-3 escalation. Not DONE. Gemini marks DONE.

## Root cause

Both suites exited 1 on main `ecc7b8984a0ab1a919595c792f98a60f18872f73` while loading `DEUS_Levels.js`, before any check:

```
DEUS_Levels.js:72
    const CORE = window.UF.World.Z_RANGES.legacy;
TypeError: Cannot read properties of undefined (reading 'legacy')
```

WG.00.17, commit `bdf45b4c` (2026-09-26, "Z range authority in DEUS_World"), made `DEUS_Levels.js` read `UF.World.Z_RANGES.legacy` at load and `UF.Space.GRID_SIZE_FEET` / `STRATUM_FEET` later. Each harness installed a hand-written `UF.World` with no `Z_RANGES` and no `UF.Space`, then loaded `DEUS_Levels.js`. Both files were last changed in `27d509c6` (2026-09-22). Confirmed by reading the two tests and `DEUS_Levels.js` line 72 and line 1132.

## What changed

Harness only. No plugin, data, or assertion edit.

Both tests now run the plugins in a Node `vm`, same shape as `setup()` in `tools/test_strata_foundation.js` and Lane BB's `tools/test_geology_strata.js` on `origin/task/lane-bb`. `DEUS_World.js` loads before `DEUS_WorldGen.js` and `DEUS_Levels.js`. RMMZ stubs are only the engine objects those plugins touch at load (Tilemap constants from `rmmz_core.js`, the `UF.Events` bus from `DEUS_Core.js`). Each file is still dependency-free: `node tools/<test>.js` from the repo root.

The world state is the one each suite was written against. It has no `zRange`. `docs/systems/DEUS_ZRange.md` line 44: a state without `zRange` is a legacy world and gets `-2..+2`. Line 39: `legacy` is `-2..+2`, five layers, and the core every generator fills. The five level entries stay generator 4 (`gen: 4`), which is what the checks exercise. `UF.World.newWorld()` is not called, so a New Game's default `-16..+15` (line 43) is not this fixture.

Live API on both green and failing runs:

```
zRange -2..2 (state has no zRange: legacy)
space 5 ft cell, 2 ft stratum, 10 ft layer
```

That matches `DEUS_ZRange.md` lines 39, 44, and 90 (`GRID_SIZE_FEET` 5, `STRATUM_FEET` 2, `Z_STEP_FEET` 10). No check expectation was rewritten. The only failure is the scope-3 case in `escalation.md`.

`tools/test_column_landforms.js`

- Plugins: `DEUS_World.js`, `DEUS_WorldGen.js`, `DEUS_Items.js`, `DEUS_Levels.js`, `DEUS_Jobs.js` (and `DEUS_Households.js` only when that plugin is on disk and enabled; it is not).
- Load guard: a plugin that throws while loading exits 1 with `HARNESS plugin failed to load: <file>: <message>`. After a clean load, missing `Z_RANGES.legacy`, `UF.Space`, Levels, Items, Jobs, or Events also exits 1.
- `--mutant=no_world` skips `DEUS_World.js`. `--mutant` is still the camp-clearing failure. An unknown `--mutant=<name>` exits 1.
- `UF.Skills.qualityRoll` remains the miner `skillQuality` roll the mine checks were written against. `DEUS_Skills.js` is archived and is not in `plugins.js`. Jobs stamps quality only when that function exists. This is not a World stub and does not loosen the quality assertions (soft stone q=4, bare-handed hard stone unstamped, metal pick q=4). Those assertions passed on granite.

`tools/test_vertical_worldgen_proof.js`

- Same sandbox, plus `DEUS_NaturalConnections.js`.
- Same load guard and mutants.
- Household doubles (`Objects`, `Floors`, `Colonists`) are installed only when `DEUS_Households.js` is active, and only before that plugin loads. It is not active. Test 4 still skips with the 2026-09-22 reason.

## Expectation changes

None. No doc line in `DEUS_ZRange.md` sections 1-3 or 7 rewrites a number in either suite. The vertical dry-landing failure is recorded in `escalation.md` and left failing.

## Open Owner questions (not answered)

From the sections this lane was told to read:

- `docs/systems/DEUS_ZRange.md` line 5: the split `-16..+15` is the PM default and is still open for the Owner. This lane did not choose it. The fixtures have no `zRange`, so the live range is legacy (line 44).
- Line 45: ADR-003 Q16 is open. There is no upgrade path from 5 levels to 32. This lane did not add one.

## Gate tests

### `node tools/test_column_landforms.js`

EXIT 0

```
INFO plugins loaded: DEUS_World.js, DEUS_WorldGen.js, DEUS_Items.js, DEUS_Levels.js, DEUS_Jobs.js (27 ms)
INFO world seed 98765, size 256, areas 1x1, generator 4, zRange -2..2 (state has no zRange: legacy)
INFO space 5 ft cell, 2 ft stratum, 10 ft layer
INFO view map 1000 (areaMapId 0,0,0 = 1000)

--- Running Volumetric Column Landforms & Universal Mining Suite  ---

Test 1: Surface Elevation S(gx, gy) Distribution & Determinism
  PASS: Contains valley/plains datum S=0 (found 779 samples)
  PASS: Contains plateau/hill S=1 (found 1718 samples)
  PASS: Contains mountain ridge S=2 (found 1599 samples)
  PASS: Deterministic elevation at (45,67): 1 === 1
  Info: Elevation distribution sampled: S0=779, S1=1718, S2=1599

Test 2: Guaranteed Flat Camp Clearing (r <= 12 at Datum S=0)
  PASS: All 441 cells within camp radius r<=12 are strictly datum S=0

Test 3: Volumetric Topography Across Z-Levels
  PASS: Located representative coordinates for S=0, S=1, S=2
  PASS: Datum coordinate (S=0) at z=0 is FLOOR (got floor)
  PASS: Datum coordinate (S=0) at z=1 is OPEN sky (got open)
  PASS: Datum coordinate (S=0) at z=2 is OPEN sky (got open)
  PASS: Plateau coordinate (S=1) at z=0 is SOLID rock mass (got solid)
  PASS: Plateau coordinate (S=1) at z=1 is FLOOR or RAMP (got floor)
  PASS: Plateau coordinate (S=1) at z=2 is OPEN sky (got open)
  PASS: High ridge coordinate (S=2) at z=0 is SOLID rock mass (got solid)
  PASS: High ridge coordinate (S=2) at z=1 is SOLID rock mass (got solid)
  PASS: High ridge coordinate (S=2) at z=2 is FLOOR or RAMP (got floor)

Test 4: Natural Ramps at Single-Step Transitions
  PASS: Natural ramp generated connecting elevation transition (found at z=0)

Test 5: Universal Mining on Surface Rock (z = 0)
  PASS: Found surface cliff cell at (10, 10, z=0)
  PASS: Mine job handler registered
  PASS: Surface cliff mining planned successfully: stand=(9, 10)
  PASS: Mining work ticks calculated based on stone fracture resistance: 340 ticks
  PASS: Target cell is SOLID before mining
  PASS: Surface cliff mutated to FLOOR after mining (got floor)
  PASS: Mining dropped stone items on mined cell (count: 1)
  PASS: Dropped item is stone (got stone)
  PASS: Dropped stone has typed geological material: granite
  PASS: Hard stone granite mined bare-handed leaves quality unstamped (got undefined)
  PASS: Miner given a metal pick via Items.give (item 2, mat iron)
  PASS: Found second surface cliff cell at (11, 10, z=0)
  PASS: Second mining job planned with metal pick: stand=(10, 10)
  PASS: Second mining dropped stone (count: 1)
  PASS: Stone mined with a metal pick is stamped with miner quality 4 (got 4, mat granite)

Test 6: World-Mutation Invalidation & Exposed Faces
  PASS: levels:cellChanged emitted exactly once (count: 1)
  PASS: cellChanged contains correct coordinates
  PASS: cellChanged contains correct cause: excavation_test
  PASS: levels:faceExposed emitted for all 6 orthogonal neighbors (count: 6)
  SKIP: Room enclosure invalidation triggered upon world cell mutation - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)
  SKIP: Invalidated room at correct mutation coordinate - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)

Test Suite Summary: 35 passed, 0 failed, 2 skipped.
```

### `node tools/test_vertical_worldgen_proof.js`

EXIT 1. Scope-3 stop. See `escalation.md`. The dry-landing FAIL is the only failure. FAIL lines go to stderr and can show up ahead of the matching stdout header in a merged capture; the summary is the count.

```
INFO plugins loaded: DEUS_World.js, DEUS_WorldGen.js, DEUS_Items.js, DEUS_Levels.js, DEUS_Jobs.js, DEUS_NaturalConnections.js (28 ms)
INFO world seed 1234, size 96, areas 1x1, generator 4, zRange -2..2 (state has no zRange: legacy)
INFO space 5 ft cell, 2 ft stratum, 10 ft layer
INFO view map 1000 (areaMapId 0,0,0 = 1000)

--- Running Vertical Worldgen, Cliff Caves & Rock Enclosure Proof Suite  ---

Test 1: Natural Vertical Continuity Across 5 Z-Levels (Z = -2..+2)
  PASS: Baselines generated for all 5 vertical levels (-2..+2)
  PASS: Sampled columns include plateau (S=1: 1748) and ridge (S=2: 617) terrain, not only datum (S=0: 3411)
  PASS: All 5776 sampled vertical columns obey volumetric physical laws (5776/5776)

Test 2: Guaranteed Flat Camp Clearing (r <= 12 around Camp Center)
  PASS: Camp clearing (r <= 12, 441 cells) is 100% flat at datum S = 0

Test 3: Horizontal Cliff Cave Carving & Level Connection (Task 11)
  PASS: Generated 5 natural horizontal cliff cave mouths breaching cliffs
  PASS: Cliff cave mouth record contains entrance tunnel and inner terminus
  PASS: Cave mouth at (72, 24, z=0) breaches cliff face as traversable FLOOR (got floor)
  PASS: Cave mouth floor material is natural STONE
  PASS: Inner terminus at (72, 22, z=0) has STAIR_DOWN descent (got stairDown)
  PASS: Subterranean terminus at (72, 22, z=-1) has matching STAIR_UP (got stairUp)
  FAIL: Subterranean stair landing is dry after the fluid simulation (cellAt.water=true, flooded=true, floodType=water)
  PASS: Subterranean stair landing has natural water cleared in the z=-1 baseline (wet vestibule cells: 0)
  Info: landing cell at z=-1 after fluid simulation: water=true, flooded=true, floodType=water
  PASS: Subterranean stair landing has walkable vestibule (found 4 walkable neighbors)
  PASS: NaturalConnections generated passage links
  PASS: NaturalConnections registered cliff cave passage: id=cliff_cave_0_0_1
  PASS: Cliff cave link connects z=0 to z=-1

Test 4: Structural Natural Rock Enclosure & Hybrid Rooms (Task 12)
  SKIP: Created household for colonist - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)
  SKIP: All natural rock perimeter cells count as structural enclosure - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)
  SKIP: homeSteps requires 0 wall construction steps for rock boundary - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)
  SKIP: Cave room strictly enclosed with 100% natural rock boundary + door - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)
  SKIP: Cave room automatically roofed upon enclosure - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)
  SKIP: Cave dwelling satisfies bedroom demands - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)
  SKIP: Bed demands satisfied - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)
  SKIP: Hearth demand satisfied - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)
  SKIP: Hybrid room requires building only 10 wooden walls, omitting 5 natural cliff tiles - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)
  SKIP: Hybrid room enclosed successfully with combination of natural cliff and wooden walls - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)
  SKIP: Hybrid room roofed upon enclosure - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)
  SKIP: households:enclosureBreached event emitted when rock wall mined away - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)
  SKIP: strictEnclosure returns FALSE after rock wall breached - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)
  SKIP: isRoofed reset to FALSE after enclosure breached - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)
  SKIP: Household demands reflect missing bedroom after breach - Households subsystem retired 2026-09-22 (DEUS_Households.js archived, not registered)

Test Suite Summary: 15 passed, 1 failed, 15 skipped.
```

### `node tools/check_deus_syntax.js`

EXIT 0

```
Checked 60 DEUS plugin files. Errors: 0
```

## Mutants

Load guard (`--mutant=no_world`). `DEUS_World.js` is not loaded. `DEUS_Levels.js` then throws. Exit 1. Both files:

```
MUTANT no_world: DEUS_World.js is not loaded; plugin load must fail
HARNESS plugin failed to load: DEUS_Levels.js: Cannot read properties of undefined (reading 'Z_RANGES')
RESULT: 0 passed, 1 failed (exit 1)
```

The message says `Z_RANGES` rather than `legacy` because the whole `UF.World` object is missing. That is the load failure the guard is there to catch.

Existing camp mutant (`--mutant`), column. Exit 1. Summary: `34 passed, 1 failed, 2 skipped`. The single new failure is `MUTANT FAILURE: simulated camp elevation non-zero failure`. The healthy run was 35 passed.

Existing camp mutant (`--mutant`), vertical. Exit 1. Summary: `14 passed, 2 failed, 15 skipped`. Camp clearing fails, and the dry-landing check still fails. The healthy run was 15 passed, 1 failed.

Unknown name (`--mutant=not_a_mutant`). Both exit 1:

```
HARNESS unknown mutant "not_a_mutant"; known: no_world (bare --mutant is the camp-clearing mutant)
RESULT: 0 passed, 1 failed (exit 1)
```

## Follow-ups

Read-only search of `tools/**/*.js` for a hand-written `UF.World` that then runs `DEUS_Levels.js`.

PROPOSED-BD-01. `tools/bench_underground_gen.js` builds `UF.World` as `{ state }` only (around lines 166-167) and `vm.runInContext`s `DEUS_Levels.js` (around lines 185-190). No `Z_RANGES`, no `UF.Space`. Same load fault as this lane. The file also still requires `const GEN = 3` (around line 89); `DEUS_Levels.js` `GEN` is 5. Not fixed here.

`tools/test_geology_strata.js` on this branch has the same hand-written `World` and runs `DEUS_Levels.js` without `DEUS_World.js` (lines 76-100). That file is Lane BB, `DEUS-TSK-GEOLOGY-GATE`, already repaired on `origin/task/lane-bb` (`11e4d630`). Not a new lane.

PROPOSED-BD-02. The vertical dry-landing conflict in `escalation.md`. Task 11 says the carved z=-1 landing is dry. `DEUS_Levels.js` flood BFS reports it wet (`cellAt.water=true`, `flooded=true`, `floodType=water`) while the baseline 3x3 is dry. The assertion stays. A plugin lane has to decide which side moves. This lane does not.

Other `UF.World` stubs under `tools/` (`test_ecology.js`, `test_goals.js`, `test_minimap.js`, and the rest of that grep) do not load `DEUS_Levels.js`. `tools/bench_vertical_worldgen.js` loads real `DEUS_World` before `DEUS_Levels` (`MODULES` lists World first). It still asserts `const GEN = 3` (around line 96) and will fail closed on today's generator. That is a profiler anchor, not this stub. Left for whoever owns that bench.

## Registration

None. No new plugin.
