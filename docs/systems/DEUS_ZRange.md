# DEUS_ZRange

The Z range: which levels (layers) a world has, held as one setting. New worlds have 32 layers, -16..+15 (the ground is 0). A save made before WG.00.17 keeps its five levels, -2..+2. Every level list, level check, map id, label, view-stepping bound, elevation and per-plugin validator reads the range from here; no plugin keeps its own copy of the bounds.

- **Owner decisions.** DEC-013 (as amended, `docs/OWNER_DECISIONS.md`): 32 layers; 1 square = 5 ft x 5 ft, 1 layer = 10 ft, 5 strata a layer = 2 ft a stratum; sparse storage in memory and in saves; the 9-layer test mode (-4..+4) keeps working. The split -16..+15 is the PM's default and is still open for the Owner, which is why the range is data and never a literal. DEC-011: every layer renders 1:1 (no change here: DEUS_Depth still draws at most `MaxDepth` (2) levels below the view).
- **Inputs.** ADR-003 Rev 3 (`docs/adr/ADR-003_sim_render_split_and_lod.md`, PROPOSED) section 15 (the range object, the chunk format, the save rule) and its open question Q16 (old saves).

**Owner:** Claude Code (lane AA, WG.00.17) · **Files:** `game/js/plugins/DEUS_World.js` (the authority), `DEUS_Levels.js` (levels, strata, sparse storage), `DEUS_Fluid.js` (sparse fluid grids); the other consumers are listed in section 5 · **Tests:** `tools/test_zrange.js`, `tools/zrange/**`.

## 1. The range object

`UF.World` holds it. A range is a frozen `{ zMin, zMax }`.

| Call | Returns |
|---|---|
| `UF.World.zRange()` | The live world's range. With no world yet (boot, title), the range a New Game would get. |
| `UF.World.levels()`, `UF.World.LEVELS` | Every level of the live world, lowest first (one frozen array, replaced when a new world state is read). `UF.Levels.LEVELS` is the same array. |
| `UF.World.levelCount()` | The number of levels (32, 9 or 5). |
| `UF.World.levelIndex(z)` | `z - zMin` for a level; -1 for anything else. |
| `UF.World.isLevel(z)`, `UF.Levels.isLevel(z)` | `true` for an integer `zMin <= z <= zMax`. |
| `UF.World.inWorld(ax, ay, z)` | An area of the world grid and a level of the range. |
| `UF.World.Z_RANGES` | The named ranges (below). |
| `UF.World.parseZRange(v)` | `{ zMin, zMax }` from `"zMin..zMax"` (`"-4..4"`, `"-16..+15"`), a name of `Z_RANGES`, or an object; `null` when the range isn't usable. |
| `UF.World.newWorldZRange()` | The range a New Game gets now. |
| `UF.World.mapIdSlot(z)` | A level's map id slot (section 4). |
| `UF.World.onZRange(f)` | Calls `f(range)` whenever the range of a new `UF.World.state` is read (a plugin that keeps its own copy of the level list). |
| `UF.Levels.CORE_LEVELS` | `[-2, -1, 0, 1, 2]`: the generated core (section 6). |

A usable range holds the core -2..+2 and has at most 256 layers (`Z_RANGE_MAX_LAYERS`: packed keys keep `z - zMin` in 8 bits, ADR-003 15.2).

**Where the live range comes from.** `zSync()` in DEUS_World compares one object identity (the state the range was read for against `UF.World.state`); when the state object changed (a New Game, a load, a test's synthetic state) it reads the new state's range (`zResync`), rebuilds the level list and calls the `onZRange` hooks. `isLevel` does the identity check inline and then compares two plain numbers: it is the hottest range check. `UF.Levels` keeps its own per-level slot arrays sized to the range (`zrResync`).

## 2. The three configurations

| Name (`Z_RANGES`) | Range | Layers | Use |
|---|---|---|---|
| `default` | -16..+15 | 32 | Every New Game (DEC-013; 16 layers below the ground, 15 above; 320 ft). |
| `test` | -4..+4 | 9 | The 9-layer test mode (DEC-013 item 1): `DEUS_Z_RANGE=-4..4` or `DEUS_Z_RANGE=test`. |
| `legacy` | -2..+2 | 5 | A world whose state has no `zRange`: every save made before WG.00.17. Also the core every generator version fills. |

## 3. How a world gets its range

- **New Game** (`UF.World.newWorld`): `newWorldZRange()`. That is the environment variable `DEUS_Z_RANGE` when it names a usable range, else `Z_RANGES.default`. An unusable value is reported with `console.error` and the default is used. The range is written to `UF.World.state.zRange = { zMin, zMax }` and saved with the world. It never changes afterwards.
- **Load:** the state's own `zRange`. A state without one is a legacy world, so it gets -2..+2. A `zRange` that isn't usable is reported with `console.error` and read as the legacy range.
- **The legacy rule** (Owner fact 6; ADR-003 Q16 is open for the Owner): an old 5-level save loads at -2..+2 and plays as before. Nothing is generated into it, and saving it again writes no `zRange` (it stays legacy). New worlds use the default range. There is no upgrade path from 5 levels to 32. The range is kept per world in the save, so the Owner can still choose one later.

### The harness override: `DEUS_Z_RANGE`

A New Game in the game reads `process.env.DEUS_Z_RANGE` (NW.js exposes the environment of the process that started it). Tools that start the game (`tools/run_tests.js`, `tools/test_snapshot.js` and every gate built on them) pass their environment to `nw.exe`. So any existing test or bench runs at a given range without being edited:

```
DEUS_Z_RANGE=-4..4 node tools/test_layer_render_flat.js          (bash)
$env:DEUS_Z_RANGE = "-4..4"; node tools/test_layer_render_flat.js  (PowerShell)
```

Accepted forms: `zMin..zMax` (signs optional: `-16..+15`) or a name (`default`, `test`, `legacy`). An unset or empty variable means the default range. Only New Games read it; a loaded save keeps its own range.

## 4. Map ids

A level's map id is `MapIdBase + slot x areas + area index` (`UF.World.areaMapId`). The five legacy levels keep their slots, so a saved map id stays valid: ground 0, +1 1, +2 2, -1 3, -2 4. Beyond them, +z takes slot 2z - 1 (+3 → 5, +4 → 7, ..., +15 → 29) and -z takes slot 2z (-3 → 6, -4 → 8, ..., -16 → 32). A slot doesn't depend on the range, so a level has the same map id in every world. `levelOfMapId` inverts it (`zOfSlot`), and a slot outside the range is not a world map.

## 5. The consumers

Every one derives its levels from the authority. Each old literal is listed with its file and line at the base commit in `tasks/WG.00.17/lane-aa/literal_map.md`.

| Plugin | What reads the range |
|---|---|
| `DEUS_World` | `isLevel`, `inWorld`, level list, map id slots, the occupancy keys and 3D path cell ids (`z - zMin`), the 3D search bounds (ramps and stairs stop at `zMin`/`zMax`), `addUnit`'s refusal text, the prewarm ring and the load's warm reach (section 7). |
| `DEUS_Levels` | Level entries, labels (`labelOf`: `+z`, `Ground`, `-z`), `setView`/`step` bounds and the level plate's arrows, the elevation scale, the derivation's bottom (`zMin`: nothing below to stand on) and top (`zMax`: the sky or a cap), every per-level cache (index `z - zMin`), `applyVolumeDamage`, `airRunAt`, `continuousAirHeight`, caps on the top level, the generator of an outer level (the ground's). |
| `DEUS_Fluid` | The range of its grids and queue ids (`zRange()`: `UF.World.zRange()`, else the legacy range when loaded without the World, a node test of the file alone); the bottom for drain-down, the top for displacement. |
| `DEUS_Minimap` | `activeZ` clamps to the range; the tab row shows 5 levels round the active one (`tabLevels`); a tab's base bitmap exists once it is shown. |
| `DEUS_DayNight` | `underground`: every level below the ground. |
| `DEUS_Environment` | Temperature cache key per level; the layers below -2 take the deep-cavern rule, the layers above +2 the peak rule, until the biome bands of DEC-013 exist (WG.62.02; the band table is an open Owner question). |
| `DEUS_WorldGen` | `cellInfo` and `kitCentres` accept a level of the range. |
| `DEUS_History`, `DEUS_Wildlife` (their checks), `DEUS_WorldGen` (its check) | A synthetic world state for a regeneration check carries the world's `zRange`. |
| `DEUS_Colonists`, `DEUS_Doors`, `DEUS_Fire`, `DEUS_Floors`, `DEUS_Items`, `DEUS_Jobs`, `DEUS_Objects`, `DEUS_Ownership`, `DEUS_Walls`, `UF_Households` | Their level validators call `UF.World.isLevel` (or `inWorld`). `DEUS_Floors` refuses a floor above the top level. `UF_Households` falls back to the legacy range with an older World. |
| `DEUS_HistoricalDemographics` | A site's `zRange` must lie in the world's range. |

The static half of `tools/test_zrange.js`'s `single_authority` check (`tools/zrange/scan_z_literals.js`) scans these 22 plugins for level bounds, `z + 2` slots, five-level lists and caches, the elevation cap 24, fixed Z constants and five-level texts. Every hit must match an entry of `tools/zrange/z_literal_allowlist.json` (file, text, reason), and every entry must still match a line. The remaining hits are the authority's own data, fallbacks for an older World, the generator's frozen core frame, DEUS_Depth's reach (at most 2 levels below the view), text and numbers that aren't levels.

## 6. Levels and what they hold

- **The core (-2..+2)** is generated exactly as before WG.00.17, for every generator version and at every range. Generator 5 generates and carves the five core levels together in its own frame (elevation 0..24, the core index `z + 2`: frozen with the generator). The checksums are those of the base commit (`old_layers_identical`). Only the core levels have entries in `UF.World.state.levels` from New Game (generator, checksum, changes).
- **Below the core:** solid stone. **Above the core:** open air. Generation adds nothing else there: no biomes, caves, veins or bands (WG.62.02 and the band work come later). One exception is the mountain rock that rises above +2. Generator 5's ceiling caps are the record of that rock, and at a range taller than +2 they become strata of +3 and up (`materializeCaps`: a cap of t strata fills S0.. of +3 upward). What doesn't fit under `zMax` stays a cap above the top level. At -16..+15 every cap fits (3..12 strata). At -2..+2 every cap stays a cap, as before. Matter is unchanged: the rock above +2 is 5,160 strata at every range for seed 18 (`matter_unchanged`).
- **Lava on -2.** The core's lava rule is unchanged (natural pools: water on -1, lava on -2). Whether lava belongs lower now that levels exist below -2 is an open Owner question.
- **A level outside the core** has no entry in the save until it changes. Its first change writes the entry (`levelEntry`: `{ z, gen: <the ground's>, strata: {} }`), and reverting its last change removes it again (`dropEmptyOuterEntry`).

## 7. Scale and elevation (DEC-013 item 2)

`UF.Space` is the scale authority: `GRID_SIZE_FEET` 5, `STRATUM_FEET` 2 (1 before WG.00.17), `STRATA_PER_LAYER` 5, `Z_STEP_FEET` 10 (derived: 5 x 2; it was 5). A strata record is still five strata a cell (the format is unchanged); only the feet a stratum stands for changed.

- **Elevation:** `e = (z - zMin) x 5 + s` over the whole column: 0 at the bottom stratum of the lowest level, `levels x 5 - 1` at the top (24 at -2..+2, 44 at -4..+4, 159 at -16..+15). There is no cap at 24 (`applyVolumeDamage`, `worldStrataElevationAt`, `airRunAt`).
- **Sphere damage** (`applyVolumeDamage({ center, radius })`): positions are in feet. A stratum's middle is at `(e + 0.5) x STRATUM_FEET`, and a cell's middle at `(x + 0.5) x 5` across. A radius now reaches half as many strata up and down. Before/after fixture: `tools/zrange/blast_tables.js` computes both tables from the geometry. The suite's blast fixture destroys exactly the 1 ft table at the base commit (radii 3, 5, 7 ft: 7, 15, 51 strata) and the 2 ft table at the tip (3, 9, 27 strata).
- **`UF.Space.rulesDistanceFeet`:** a level apart is `Z_STEP_FEET` (10 ft).
- **Clearance** (`continuousAirHeight`, `airRunAt`) and **cap thickness** are counts of strata. Multiply by `STRATUM_FEET` for feet (before WG.00.17 the count was also the feet).

## 8. Storage (sparse, ADR-003 15.3)

Memory and save size follow the occupied and changed cells, not 32 x the area.

**Baselines** (`DEUS_Levels`). A level's baseline keeps its strata in chunks of 32 x 32 cells (64 chunks per 256 x 256 area level).
- A **UNIFORM** chunk is one cell code (five material bytes and a connector) for all its cells, with no arrays.
- A **MIXED** chunk holds arrays: 5 bytes a cell of materials and 4 bits a cell of connectors, 5,632 B a chunk.
- The directory `b.dir` (a `Uint16Array`, 2 B a chunk) says which: `0xffff` for MIXED, else an index into the palette of uniform codes. The palette is shared by every baseline.
- The generator still works on dense arrays. It converts them to the chunk store when the baseline is made (`seal`/`chunkify`) and drops them. The directory is a cache and is never saved.
- A level outside the core is all UNIFORM (`outerBaseline`: stone below, air above): its directory only, 128 B per area level.

Reads go through `storeLocate` (a mask and a shift for power-of-two sizes; no allocation). The dense `b.strata.m` and `b.conn` of before are compat copies, built only when something reads them (diagnostics, older tools).

**Changes.** A baseline never changes once made. A change is an 11-byte record (connector, five materials, five HP) laid over it in the decoded change maps. A level's map exists once it has a change, and an area's once that area has one. The record is saved as 22 hex digits in `UF.World.state.levels[z].strata["ax,ay"][cell]`. The live kind of a chunk (`UF.Levels.chunkInfo(ax, ay, z)`) is MIXED once its baseline is MIXED or any of its cells has a record. So the first write to a UNIFORM chunk "splits" it at the cost of that one record: it is not expanded into arrays.

**Other per-level state:**

| Cache or grid | Sparse rule |
|---|---|
| Packed shape grids (65,536 B each) | The last `GRID_KEEP` (15) levels read. |
| Baselines | 12 kept. |
| Generator-5 volumes | 3 areas kept. |
| Per-level slots | Arrays of the range's length (a few bytes a level). |
| `hasOpaqueOverburden` | Uses a per-chunk-column top (`colTops`) so it never walks 32 levels of air. |
| Fluid (`DEUS_Fluid`) | An area's level grid and its flood cache are made on the first write of fluid to that level (`gridFor`). A level without fluid reads as a shared zero grid (`getFloodGrid`). The queued-cell flags are a `Set` of cell ids (`inQueue`), not a byte per cell of every level. `UF.Fluid.diagnostics()` reports `gridsAllocated` and `bytes`. |
| Map builds (`DEUS_World`) | Only for the viewed level, the ring a switch or DEUS_Depth needs (z±1, z±2), and on a map load the levels within `LOAD_WARM_REACH` (4) of the view. Lane N's load warmed every level of a 5-level area, which is every level within 4 of any view. The build cache keeps `PEEK_CACHE` (9). Builds follow the view, never the layer count. |
| Minimap | One base bitmap per tab shown (the WG.00.09b K2 rule); the tab row shows 5 levels. |
| 3D path search | Scratch is flat per-level slots (`g`, `parent`, `seen`, `closed`, `goal`: 20 B a cell). A level gets its slot the first time a search reaches it, so a route within one level allocates one level of scratch. `UF.World.pathScratchStats()` reports `layersAllocated`, `lastSearchLayers`, `bytes`. |

**Measured** (`tools/test_zrange.js`, seed 18, the start area, 2026-09-26):
- Baseline store (directories, MIXED arrays and caps): -16..+15 1,693,592 B against -2..+2 1,622,552 B.
- The difference is 71,040 B: 27 more directories (3,456 B) and the 12 MIXED chunks of mountain rock above +2 (67,584 B). That equals the bound `(levels - 5) x 64 x 2 B + outer MIXED chunks x 5,632 B` (`tools/zrange/bounds.js`).
- The dense layout before WG.00.17 held 1,802,240 B for five levels.
- The shape grids cached and the JS heap after New Game are reported beside it (not judged): 9 grids against 5; heap +6 MB, mostly the four more map builds a load warms.

## 9. The save format

| Key | Content |
|---|---|
| `ufWorld.zRange` | `{ zMin, zMax }` for a world made since WG.00.17. Absent: a legacy world (-2..+2). |
| `ufWorld.levels[z]` | The core levels always; a level outside the core only while it has a change. `{ z, gen, checksum (core), strata: { "ax,ay": { cell: "<22 hex digits>" } }, caps (top level only) }`. |
| `ufWorld.levels[zMax].caps` | Changed ceiling caps (6 hex digits: material, thickness, HP; `"000000"` = breached). `levels["2"].caps` at the legacy range, as before. |
| `deusFluid` / `ufFluid` | Unchanged: `[ax, ay, z, x, y, type, depth]` records of cells with fluid only. |

- Nothing is saved for an unchanged cell, an unchanged chunk, a level without changes, the chunk directory or the palette.
- A fresh world's terrain and fluid parts (levels + `zRange` + fluid) measured 5,881 B at -16..+15 against 5,879 B at -4..+4. The 2 B difference is the range's digits; the bound is 256 B (ADR-003 15.5).
- A change on +12 and one on -14 each add only their record.
- A save made by the base commit (5 levels, no `zRange`) loads at -2..+2 with every cell, unit and item identical (`legacy_save_loads`, fixture `tools/zrange/fixtures/legacy_save_5255f1a5_seed18.json.gz`).

## 10. Tests

- `node tools/test_zrange.js` runs the game in NW.js on snapshot copies at -4..+4, -16..+15 and -2..+2 (seed 18) and reports 10 checks: `single_authority`, `elevation_math`, `feet_2ft_10ft`, `sparse_memory`, `sparse_save`, `legacy_save_loads`, `old_layers_identical`, `matter_unchanged`, `extreme_layers_work`, `path_scratch_bounded`. Each has a provocation (`--provoke=<name>`, `--provoke-all`; `tools/zrange/provocations.js`) that must make it FAIL. The base commit's data are fixtures under `tools/zrange/fixtures/` (`--refresh-base`, `--make-legacy-fixture`).
- `node tools/zrange/test_switch_depth2.js` is the regression test of PM ruling E1-A. `layers_flat.switch_same_frame` wants the depth-2 plane only under the renderer's own rule, and the test runs the unchanged gate with a probe:
  - the open-cell case: depth 2 bound and wanted, including on the new level -3;
  - the closed-cell case: depth 2 neither bound nor wanted;
  - provocations: an unbound depth-2 plane, a spurious one, and the expectation before E1-A.
- `node tools/zrange/run_gates.js [--z-range=...] [--repeat=n] [--provoke]` runs the lane's gates, each in a fresh throwaway clone, and keeps their raw logs.
- `tools/zrange/scan_z_literals.js` is the static literal scan (above). `tools/zrange/clone.js` makes throwaway clones for heavy runs. `tools/zrange/bench_queries.js` and `prof_top.js` measure the hot range checks (diagnostics).

## 11. Open questions (for the Owner; not answered here)
- The default split -16..+15 (DEC-013 records it as a PM default).
- ADR-003 Q16: old saves stay at 5 levels (the rule implemented here, the proposed answer) or get another treatment later.
- The lava rule: today's natural lava stays on -2; whether it belongs deeper now.
- The band table: what the layers beyond -2..+2 hold (temperature, biomes, ores). Until then they are plain rock and air, and DEUS_Environment gives them the nearest band's temperature rule.
