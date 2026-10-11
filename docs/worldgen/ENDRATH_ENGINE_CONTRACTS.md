# Endrath world engine — data contracts and extension points

**Companion to:** `ENDRATH_ENGINE_PLAN.md` (the staged build plan). This file is the part an implementer keeps open while coding: the records, arrays, units, file formats and the read/write rules between stages and later systems.
**Status:** proposal for Owner/PM approval, 2026-10-11. Nothing here is in code. Where this document and `AGENTS.md` or `docs/OWNER_DECISIONS.md` disagree, those win; the disagreement is listed in the plan's open-decisions table.
**Conventions:** all simulation numbers are integers. Feet for heights, centipounds (cp) for mass, per-mille (0..1000) for climate proxies, basis points where the existing kernels already use them. Pixels never appear in a contract. Every contract has a `schema` string; every change to a contract bumps it and adds a migration row.

---

## 0. Locked constants (one module, `game/js/sim/endrath/constants.js`)

| Constant | Value | Source | Note |
|---|---|---|---|
| `LAYERS` | 8 | AGENTS.md depth rule, STATUS.md | Data-driven; every loop reads this, nothing hard-codes 8 |
| `LAYER_FT` | 10 | AGENTS.md | One z-layer is ten feet |
| `SURFACE_DEPTH_FT` | 1 | AGENTS.md | One surface depth unit is one foot |
| `DEPTH_MAX` | 10 | AGENTS.md, STATUS.md | Depth units a cell holds before it climbs one z |
| `OVERFLOW_DIVISOR_CP` | 31200 | AGENTS.md | Water depth units = `floor(cp / 31200)`; 10 units = 312,000 cp, the existing `units.WATER_CP_PER_STRATUM` |
| `CELL_FT` | 5 | DEC-013, `UF.Space.GRID_SIZE_FEET` | Tile is 5 ft × 5 ft |
| `TILE_PX` | 48 | RMMZ | Presentation only; never read by sim code |
| `AREA_TILES` | 256 | DEUS_World `AreaSize` | |
| `GRID_AREAS` | 3 × 3 | DEC-030 | Data (`areasX`, `areasY`), extensible |
| `CELL_TILES` | 8 (default; 16 allowed) | this plan, OD-C1 | Coarse cell edge in tiles |
| `Z_RANGE_NEW_WORLD` | `-3..+4` (default) | this plan, OD-C2 | 8 layers; L1..L8 = z −3..+4; legacy saves keep their own range |
| `NATURAL_TOP_LAYER` | 7 (default) | this plan, OD-C3 | Natural terrain never fills layer 8 (open build air), elevation max = 69 ft |
| `HEIGHT_MAX` | 9 | AGENTS.md | Per-tile height 0..9, presentation and stepping only |

Layer numbering: physical layers are counted **1..8 from the bottom** (AGENTS.md). The engine's z is `z = L − 1 + zMin` (with `zMin = −3`: L1 = −3 … L8 = +4). Art depth steps `z0..z7` are **relative**: z0 is the open surface of a column as drawn, each closed step down takes the next shade (AGENTS.md: "Layer 1 is not z0"). The three numberings are never mixed in one variable; helper functions `layerOfZ`, `zOfLayer`, `shadeStep(viewZ, cellZ)` convert.

---

## 1. Seed streams (`game/js/sim/endrath/seeds.js`)

```
WorldSeed      = { text: string, value: uint32 }            // value = hashString(text) when text given, else the number
StreamSeed(k)  = hash32(world.value, STREAM_SALT[k])         // k ∈ STREAMS
STREAMS        = terrain | hydrology | geology | classify | features | names | spawn | realize | history
Derived(k, ax, ay, z, attempt) = hash32(StreamSeed(k), ax, ay, (z - zMin) & 0xff, attempt)
Rng(seedValue) = mulberry32(seedValue)  // the existing DEUS_World primitive; returns a stream OBJECT, never a global
```

Rules:
- A generator takes an `Rng` (or a `Derived(...)` value) as an **argument**. No module reads a global stream, no module keeps a module-level stream between calls.
- Every per-cell value that must be chunk-independent is a hash of **absolute** coordinates `(StreamSeed, gx, gy, z)` (the existing `hash4` discipline), not a draw from a sequential stream.
- Rejection retries use `attempt` (0, 1, 2 …) in the key. The accepted `attempt` is saved in the coarse header so a reload rebuilds the same world without re-running rejected attempts.
- `Math.random` is banned in `game/js/sim/**` (the existing seam test already instruments it).
- The `history` stream is reserved and unused in this plan (Year-0 contract, INV-SIM-01).

Hash quality: the existing FNV-1a + xorshift mix (`DEUS_World.hash32`) is adequate for coordinates. If artefacts appear in large noise fields, swap the mixer for a 32-bit murmur3 fmix in **one place** (`seeds.js`); nothing else changes.

---

## 2. The coarse world (`CoarseWorld`, schema `endrath.coarse/1`)

The complete, globe-topology world at coarse resolution. Built in full at New Game before any tile exists. Everything a later stage needs about the world as a whole lives here.

### 2.1 Header (saved)

```json
{
  "schema": "endrath.coarse/1",
  "seed": { "text": "…", "value": 123456789 },
  "attempt": 0,
  "grid": { "areasX": 3, "areasY": 3, "areaTiles": 256, "cellTiles": 8, "w": 96, "h": 96 },
  "vertical": { "layers": 8, "layerFt": 10, "zMin": -3, "zMax": 4, "naturalTopLayer": 7 },
  "climate": { "latitudeModel": "band", "equatorRow": 48, "polarRows": 8 },
  "water":   { "budgetCp": 0, "placedCp": 0, "aquiferCp": 0, "returnCp": 0, "seaLevelFt": 0 },
  "checks":  { "passed": ["…"], "repairs": ["…"], "bypassed": [] },
  "checksums": { "fields": "xxxxxxxx", "hydrology": "xxxxxxxx", "geology": "xxxxxxxx", "records": "xxxxxxxx" },
  "migrations": []
}
```

Only the header is saved (`contents.ufWorld.endrath.coarse`). The arrays below are **regenerated from the header** on load and verified against the checksums; a mismatch is reported, never silently accepted (the Levels rule).

### 2.2 Base fields (structure of arrays, one `Int16Array(w*h)` each, index `cy * w + cx`)

| Field | Range | Unit | Written by | Meaning |
|---|---|---|---|---|
| `elevFt` | 0 .. `layers*layerFt - 1` (69 at the default) | feet | S1 fields, edited by S2 carving and S3 repairs | Column surface elevation above the world floor |
| `moisture` | 0..1000 | ‰ | S1 | Rainfall proxy; S2 adds orographic and lake adjustments |
| `temp` | 0..1000 | ‰ proxy | S1 | Temperature proxy after latitude and lapse; `data/sim/endrath/climate.json` maps it to centi-°F for DEUS_Environment |
| `drainage` | 0..1000 | ‰ | S1 | Runoff vs. retention; swamps are low drainage + high moisture |
| `volcanism` | 0..1000 | ‰ | S1 | Drives Ash/volcanic classification, lava reservoirs, igneous stacks |
| `wildness` | 0..1000 | ‰ | S1 | DEC-038 continuum; drives WILD classification and spawn danger tiers |

Rules: fields are integers; the generator works on `Float32Array` scratch and quantises once at the end of each stage. Fields wrap on both axes (torus): `cx − 1` of column 0 is column `w − 1`.

### 2.3 Derived fields (cached `TypedArray`s, never saved, rebuilt by `recomputeDerived(coarse)`)

| Field | Type | Meaning | Rebuilt when |
|---|---|---|---|
| `fillFt` | Int16 | Water surface elevation over the cell, or −1 if dry | any `elevFt` edit or water budget change |
| `basinId` | Int32 | Id into `basins[]` of the depression the cell drains to; on a torus every cell belongs to exactly one basin, so there is no −1 | `elevFt` edit |
| `flowDir` | Uint8 | 0 = pit, 1..8 = D8 direction on the filled surface | `elevFt` edit |
| `flowAcc` | Int32 | Moisture-weighted upstream cell count | `elevFt` or `moisture` edit |
| `salinity` | Int16 0..1000 | 1000 at sea cells, decays by Chebyshev distance to a sea (DF T6 idea), 0 for fresh | `fillFt` change |
| `surfaceZ` | Int8 | `zMin + floor(elevFt / layerFt)` | `elevFt` edit |
| `surfaceH` | Uint8 0..9 | `elevFt mod layerFt` — the coarse cell's own partial height (tiles refine it) | `elevFt` edit |
| `parentA`, `parentB` | Uint8 0..5 | Two nearest biome parents (see §4) | climate/elevation edit |
| `blend` | Uint8 0..255 | Weight of `parentB` (0 = pure A) | as above |
| `vegetation` | Int16 0..1000 | Derived from moisture, temp, drainage, `fillFt` | as above |
| `surfaceMat` | Uint8 | Material id of the surface cell (soil, sand, rock, gravel, ash, snow, …) from `materials.json` strata ids | geology or classify edit |
| `geoStack` | Uint16 | Index into `geoStacks[]` | geology edit |

"Biome is derived, never stored" means: `parentA/B/blend` are a **cache** of `classify()`; any consumer may call `classify(cellFields, depthBand)` directly and must get the same answer.

### 2.4 Records (saved only where marked)

```
Basin   { id, sinkCell, spillLevelFt, spillToBasin, outletCell, areaCells, volumeFt3BelowSpill, fillFt, waterCp, kind: lake|sea|dry }
                                                   // saved: none (recomputed); waterCp lives in the fluid state
River   { id, class: brook|stream|river|major, sourceCell, mouthBasin, cells: [cellIdx…],
          crossings: [{ cellIdx, entrySide, entryOffset, exitSide, exitOffset }], flowAtMouth }
                                                   // entry/exit side ∈ N|E|S|W, offset 0..cellTiles-1 — the DF "exit tile" idea
Region  { id, kind: parent-id, cells (RLE runs), bbox, histogram[6], nameSlot }   // name filled by the names stream later
Site    { id, type, cell, z, faction, state, stream }                            // saved; DEC-070 home sites written at New Game
Feature { id, type, anchorCell, zMin, zMax, params{}, stream }                   // cave system, spring, vent, karst, lair… saved only if mutated
Reservoir { id, kind: aquifer|magma|core|return, basinId?, cp }                  // saved (mass ledger truth)
GeoStack  { id, layers: [{ material, fromLayer, toLayer }], veins: [{ material, density, bandLo, bandHi }] }
```

Records are plain objects with integer fields and arrays, sorted by `id`, so checksums are stable. `cells` are stored run-length encoded `[start, length, …]`.

### 2.5 Checksums

`xxhash32`-style (or the existing FNV chain) over each array in a fixed order, hex-8. The four header checksums let a load prove the regenerated world matches; the per-(area, z) checksums of the existing Levels machinery (`areaSums`) continue to prove local realisation.

---

## 3. Vertical model: cells, surface height, fluids

### 3.1 The cell (block)

A cell `(gx, gy, z)` is one whole block, 5 × 5 × 10 ft, of **one material** (DEC-083 Minecraft-style block updates). It is stored in the existing Levels baseline/change format — five strata records per cell — written **uniformly** (all five strata the same material) by the new generator. This keeps every existing reader (`shapeGrid`, `dominantMaterial`, strata damage API, structural reader, fluid capacity) working unchanged while the sim treats the cell as one block. Collapsing the record to one byte per cell is a later storage lane, not part of this plan.

Shapes stay the Levels set: `solid | floor | open | ramp | stairUp | stairDown | stairBoth`. The generator writes `solid` below the surface, `floor` at the surface cell when the column's top is flat ground, `open` above, `ramp` where the surface steps a whole layer between neighbours along a walkable gradient (WG.00.20), and water/lava **as fluid state, not as material** (the Levels `M_WATER` / `M_LAVA` materials are not written by the new generator; a later lane may retire them).

### 3.2 Per-tile height (`TileHeight`, derived, not saved)

For the surface cell of each column: `h ∈ 0..9` feet of rock above the cell floor. `h = elevFt_tile mod 10`, where `elevFt_tile` is the refined tile elevation (§6). Uses:
- **Presentation:** y-offset of ground tiles, props and units standing on the tile: `offsetPx = round(h * PX_PER_FT)` with `PX_PER_FT` a presentation parameter (default 2 → at most 18 px, inside one tile). No new colours, no new rock parent: the shade is the layer's.
- **Stepping:** a move between neighbours with `|Δh| ≤ STEP_FT` (default 3) is a normal step; `≤ CLIMB_FT` (default 6) a climb; a layer change needs a ramp/stair/slope cell (WG.00.19/20). Pathfinding reads `h` through `DEUS.Realize.heightAt(gx, gy)`.
- **Fluid capacity:** the surface cell holds `DEPTH_MAX − h` depth units of water before it is full (§3.3). Every non-surface open cell holds `DEPTH_MAX`.

Digging the surface cell sets its material to air, the column's surface becomes the cell below with `h = 9` (a full block top) — `h` is recomputed from the column, never stored.

### 3.3 Fluid cell (`FluidCell`)

Owner rule (AGENTS.md): one surface depth is one foot; `DEPTH_MAX` 10; a full cell climbs one z; the overflow divisor is 31200; lava stays centipounds.

```
water:  store cp (integer centipounds) sparse per (area, z, x, y)   — the existing open.js store
        depth(cell) = min(DEPTH_MAX, floor(cp / 31200))              — a VIEW, never a store
        capacityUnits(cell) = isSurfaceCell ? DEPTH_MAX − h : DEPTH_MAX
        overflow: cp beyond capacity moves to the cell above (z+1), then lateral equalisation (the existing rule)
lava:   store cp sparse; no depth unit, no foot scale (Owner: "Lava stays centipounds")
        presentation picks one of the 5 molten states by cp thresholds in data/sim/endrath/fluids.json
```

Conservation: the generator never creates cp. Year-0 water comes from `water.budgetCp` in the coarse header (an Owner parameter, OD-C5), split by the generator into placed cells, aquifer reservoirs and the return inventory, and posted to the ledger as initial reservoir allocations (DEC-040 "placement of water that is already counted"). Lava comes from the `magma`/`core` reservoirs (DEC-040 item 5), allocated the same way.

Note on physical scale: 312,000 cp is the mass of a 2-ft stratum of water in the existing kernel (50 ft³ × 6240 cp/ft³). The Owner's rule reuses it as the mass of a **full 10-ft cell**. That is a game-scale unit (one depth unit ≈ 5 ft³ of water), not a physical density; it is consistent as long as every consumer uses the one constant. The plan does not "correct" it; it records it (OD-C6).

### 3.4 Bands (data, `data/sim/endrath/bands.json`)

With 8 layers and a surface that may lie on any of layers 1..7, depth bands are **relative to the local surface** for classification and spawning, and **absolute** for the world floor:

| Band id | Rule (default) | Used by |
|---|---|---|
| `SURFACE` | the column's surface cell | biome parent, vegetation, surface material |
| `SHALLOW` | 1..2 cells below the surface | soil/regolith stack, shallow caves, aquifers |
| `DEEP` | 3+ cells below the surface | stone stacks, veins, deep caves |
| `FLOOR` | layer 1 (absolute) | bedrock; magma vents and lava basins in high-volcanism cells |
| `SKY` | layer 8 (absolute, when `naturalTopLayer` = 7) | never natural terrain |

The DEC-030/DEC-038 five absolute bands do not fit 80 ft; this table is the 8-layer replacement and is an Owner decision (OD-C4). The existing `bandOf(z)` consumers read it through one function, `bandAt(gx, gy, z)`.

---

## 4. Biome parents, palette and classification

### 4.1 Parents and the palette registry (`game/data/endrath/palette.json`, Owner-owned)

```json
{
  "schema": "endrath.palette/1",
  "parents": [
    { "id": "OLIVE",   "climate": "TEMPERATE", "swatches": ["#…", "…"] },
    { "id": "OCHRE",   "climate": "ARID",      "swatches": [] },
    { "id": "CRIMSON", "climate": "WILD",      "swatches": [] },
    { "id": "ASH",     "climate": "VOLCANIC",  "swatches": [] },
    { "id": "NAVY",    "climate": "WET",       "swatches": [] },
    { "id": "ICY",     "climate": "COLD",      "swatches": [] }
  ],
  "shared": ["#…"],
  "shadeSteps": 8,
  "rules": { "alpha": [0, 255], "noPureBlack": true, "ditherIsTwoExistingColours": true,
             "childIsNearestLockedSwatchOfTwoParentMix": true }
}
```

- The **hex values are the Owner's** (AGENTS.md: "A colour is not a ground until the Owner names it … An agent does not pick the six."). The generator and the sim never read a hex. They emit parent ids, blend weights, material ids and shade steps; only the renderer resolves colours, through this file.
- The parent ↔ climate-class mapping above is a **proposed default** (OD-C7). The six climate classes are DEC-030's VOLCANIC, WET, ARID, TEMPERATE, COLD, WILD.
- Depth shading: 8 shade steps per palette, each darker, no `#000000`; a hold is a repeated stop. The renderer picks `swatch[shadeStep]` where `shadeStep = clamp(viewZ − cellZ, 0, 7)` for a cell seen through open cells above it.
- Transitions: same number of colours, mixed from two parents. A transition tile set for the pair `(A, B)` at blend `b` uses the locked child swatches of the `A×B` mix; dithering uses two existing colours. The generator's `blend` byte is quantised by the renderer to the number of transition steps the art provides (data: `transitionSteps`, default 3).

### 4.2 `classify(fields, band)` (pure, `game/js/sim/endrath/classify.js`)

Input: one cell's `{ elevFt, moisture, temp, drainage, volcanism, wildness, fillFt, salinity }` and the band id. Output: `{ parentA, parentB, blend, vegetation, surfaceMat, waterKind }`.

Method (the DEC-038 continua, DF T1 "derived, never stored", Minecraft multi-noise parameter space, the existing `DEUS_Biomes.idwTop2`):
1. Each parent has a centroid in `(temp, moisture, drainage, volcanism, wildness)` space in `data/sim/endrath/classify.json` (data, not code). Distance is weighted Euclidean; the two nearest give `parentA/B`; `blend = w_B / (w_A + w_B)` by inverse-distance power 2, with a dead-band so a cell near one centroid is pure.
2. Band modifiers: `SHALLOW`/`DEEP` cells use the surface column's parents (vertical coupling, WG.00.15) with material from the geo stack; `FLOOR` under high volcanism is ASH regardless.
3. `vegetation = f(moisture, temp, drainage, fillFt)` — zero under water or above the tree line proxy; the DF rule shape (rain when warm, a fraction of rain when cold, zero on very high drainage) with Endrath's own constants in data.
4. `surfaceMat` from a small table `(parent, slope class, moisture class) → material`, materials from `game/data/sim/materials.json` ids.
5. `waterKind` for a wet cell: `sea | lake_fresh | lake_salt | river | brook` from `fillFt`, `salinity`, river class.

Thresholds and centroids live in `classify.json` (Owner-tunable, OD-C8). The function is total: every input maps to exactly one output; a test sweeps the parameter space and asserts all six parents and all bands are reachable.

---

## 5. Hydrology contracts

### 5.1 Basin analysis (torus priority flood)

`analyseBasins(elevFt, w, h) → { fillFt (for a given budget), basins[], flowDir, flowAcc }` — Barnes et al. priority-flood on the wrapped grid: every cell gets its spill elevation; depressions become `Basin` records with a spill tree (which basin overflows into which). No edge cells, no edge oceans: a torus has no outside, so **every** basin is closed until water leaves by evaporation (the return cycle), which is exactly the finite-water model.

### 5.2 Finite water placement ("water on the lowest open cells")

```
placeWater(basins, budgetCp):
    order basins by sink elevation ascending
    pour: for each basin, fill to min(spill level, what the remaining budget allows) — cp → fillFt via column volumes
    when a basin reaches its spill level, merge it with its spill target and continue (lakes join into seas)
    stop when the budget is spent; the highest fill level among the largest merged body is seaLevelFt (the height that leaves)
    leftover (none here; the generator gives the budget) → aquifer reservoirs per basin in proportion to basin area × moisture, and the return inventory
```

Rock is "raised around it": the generator does not edit elevation to make shorelines; the fill produces them. The repair pass (§7) may shift elevation bands when checks fail, and water is re-placed after every elevation edit.

### 5.3 Rivers

Rivers are circulation, not creation: flow accumulation on the filled surface, seeded by `moisture`, with the macro A* bed-carving planner already in `game/js/sim/worldgen/DEUS_Hydrology.js` reused for the long valleys (its `wrapX/wrapY` is the torus). Output: `River` records with per-cell **crossings** so an area realised alone knows where the river enters and leaves each coarse cell (the DF exit-tile idea, T5). Carving lowers `elevFt` along the bed by at most `CARVE_MAX_FT` per cell (data); after carving, `recomputeDerived` runs and water is re-placed (principle 2: carving shapes elevation; it never creates water).

### 5.4 Interface to the fluid kernels

The generator writes **initial state only**, through one function in `DEUS_WaterInit`:
- for each wet cell of each realised `(area, z)`: `authority.place(areaKey, z, x, y, "water", cp)` with `cp = depthUnits * 31200` and `depthUnits = min(capacity, fillFt − cellFloorFt)`;
- reservoirs: `authority.registerSource(id, kind, cp)` for aquifers (finite springs), magma (finite vents), return inventory (the rain cycle);
- lava cells in `FLOOR`-band volcanic basins: `place(…, "lava", cp)` from the magma reservoir.
Nothing else in the generator touches fluids. Runtime flow, pressure and conservation are the kernels' (DEC-024, DEC-067, DEC-101).

---

## 6. Local realisation contract (`realizeArea(coarse, ax, ay, z, streams) → AreaLayer`)

Pure function; the same inputs give the same bytes whether called at New Game or years later (DEC-070 condition C). It is what the worker pool runs.

Inputs: the coarse world (read-only), `(ax, ay, z)`, `Derived("realize", ax, ay, z, attempt)`.
Steps:
1. **Tile elevation.** Bicubic interpolation of `elevFt` at tile centres across the torus (the coarse cell's four/sixteen neighbours, wrapped), plus a hashed tile-scale displacement `±DISP_FT` (data, default 2) from absolute `(gx, gy)`, then a slope limiter: neighbouring tiles differ by at most `MAX_STEP_FT` (default 3) except where the coarse gradient demands a whole layer (then a ramp run of `RAMP_RUN_TILES`, default 4, carries the step). Quantise to integer feet. Rivers: tiles within the river's half-width of the crossing polyline (midpoint-displaced from the crossings, hashed from absolute coordinates — the existing micro course method) are lowered to the bed elevation.
2. **Column write.** For each tile: `surfaceZ = zMin + floor(elev/10)`, `h = elev mod 10`; cells below `surfaceZ` are `solid` with the geo stack's material for their band; the surface cell is `floor` (or `ramp`); cells above are `open`. Caves: the void manifold (`sim/geology/caves.js`, re-banded to 8 layers) decides open pockets below the surface from `(seed, gx, gy, z)`; vein cells from the stack's vein rules; every decision hashed from absolute coordinates.
3. **Fluids.** Wet tiles (tile elevation below `fillFt` of the coarse cell, interpolated) emit water placement intents `{ x, y, z, depthUnits }`; the bridge posts them (§5.4). Lava likewise in volcanic floor basins.
4. **Output.** `AreaLayer = { materials: Uint8Array(65536), shapes: Uint8Array(65536), heightTop: Uint8Array(65536) (h for surface cells, 255 otherwise), fluidIntents: [...], checksum }` handed to the existing Levels baseline sealer (`seal/chunkify` → UNIFORM/MIXED 32×32 chunks). Nothing per-tile is saved; edits go into the existing sparse change records.

Seams: because every value is a function of absolute wrapped coordinates and the coarse world, two areas realised separately agree at their shared edge, including across the x = 767 | 0 and y = 767 | 0 wraps. The seam test (§8) proves it for all 12 segments.

---

## 7. Rejection checklist (`data/sim/endrath/checks.json` + `checks.js`)

```json
{ "id": "land_fraction", "stage": "hydrology", "test": "landFraction", "min": 0.35, "max": 0.80,
  "repair": "shiftElevation", "repairStep": 5, "repairPasses": 3, "allowBypass": false, "restart": "fields" }
```

- `test` names a pure function returning a **shortfall** (0 = pass). `repair` names an in-place repair tried before failing (elevation band shift by `repairStep` ft, water budget nudge within Owner bounds, re-roll of one record stream). `restart` names the stage to re-run with `attempt + 1`: `fields` (everything), `hydrology` (keep fields, redo water), `records` (keep terrain, redo sites/features).
- The checker runs the list in order, logs `{ id, shortfall, repaired, attempt }` to the generation log, and stops at the first unrepairable failure. The UI/CLI may set `allowBypass` for a check (DF's "allow this rejection type"); bypasses are recorded in the header.
- Default checks: land fraction; water fraction; at least one closed lake basin and one sea body; every parent present with ≥ `minCells`; every layer 1..7 has surface cells; max slope; river count ≥ min; nine race-start candidates exist with parity scores within tolerance (DEC-070 item 2, metric from DESIGN-NW-1 when it lands; until then a placeholder resource-count metric); seam continuity (always passes by construction, kept as a tripwire).

---

## 8. Side-files and save format

- **Saved in the RMMZ save** (`contents.ufWorld`): the coarse **header** (§2.1), the saved records (sites, reservoirs, mutated features), `zRange`, the generator version `gen: 7`, and the existing sparse Levels/fluid records. No field arrays, no tile arrays.
- **Disk cache (optional, never authoritative):** `game/save/endrath_cache/<seedvalue>-<attempt>.bin` — a little-endian binary with a JSON index and raw typed-array sections, written by the headless CLI and the game to skip regeneration on load. Its absence must change nothing but load time. Not an RMMZ data file; the editor never touches it.
- **Versioning:** every schema string is `name/N`. A load that meets an older `N` runs the migration chain in `migrations.js`, appends `{ rule, from, to }` to the header's `migrations`, and never rewrites a save silently (the Levels WG.00.43 pattern). Unknown higher `N` refuses to load that save with a clear message.
- **Legacy worlds:** a save with `gen ≤ 6` or a 32-layer `zRange` loads exactly as today; the Endrath generator is only used for new worlds (OD-C9).

---

## 9. Events (through `DEUS.Events`)

| Event | Payload | Emitted by |
|---|---|---|
| `endrath:coarseStage` | `{ stage, attempt, ms }` | coarse pipeline, per completed stage (progress UI) |
| `endrath:coarseReady` | `{ header }` | when the coarse world passed its checks |
| `endrath:areaRealized` | `{ ax, ay, z, checksum, ms }` | after an `(area, z)` baseline is sealed |
| `endrath:year0Fluids` | `{ placedCp, reservoirs }` | after Year-0 fluid placement is posted |
| `endrath:checkFailed` | `{ id, shortfall, attempt }` | checker |

Existing events keep their meaning: `levels:areaGenerated`, `world:created`, `world:initializing`.

---

## 10. Extension points: who may read and write what

| Contract | Later system may READ | Later system may WRITE | Through |
|---|---|---|---|
| Base fields (§2.2) | anything (weather, effects, spawner tiers, history) | **nothing** — base fields are generator truth; a system that needs a new base field proposes it in `fields.json` and a generator stage computes it | `DEUS.Coarse.fieldAt(name, gx, gy)` |
| Derived fields (§2.3) | anything | nothing; call `recomputeDerived` after an elevation edit through the one API | `DEUS.Coarse.derivedAt(name, gx, gy)` |
| `classify()` | anything | nothing; a new biome parent or threshold is data in `classify.json` | `DEUS.Coarse.classifyAt(gx, gy, z)` |
| Records (§2.4) | anything | a later system may **add its own record type** (`features[]` with a new `type`, `sites[]` with a new `type`) under its own schema suffix and may mutate records of its own type; it never edits another type | `DEUS.Coarse.records(type)`, `DEUS.Coarse.addRecord(type, rec)` (validates, assigns id, marks saved) |
| River crossings | realisation, effects (mist, sound), pathfinding (fords/bridges) | nothing | `DEUS.Coarse.riversNear(cell)` |
| Tile height (§3.2) | renderer, pathfinding, fluids | nothing; it is derived from the column | `DEUS.Realize.heightAt(gx, gy)` |
| Cells (§3.1) | anything | digging, building, collapse and fluids through the existing Levels write API (`setStrata`, `applyVolumeDamage`), never directly | `DEUS.Levels.*` |
| Fluid state (§3.3) | anything | only the fluid authority; the generator only at Year 0 through `DEUS_WaterInit` | `DEUS.Fluid.*`, water authority |
| Palette (§4.1) | renderer only | Owner only (data file) | `DEUS.Palette.resolve(parent, shadeStep, swatchIndex)` |
| Checks (§7) | CLI, UI | a later system may **append** a check with its own `id` prefix; it cannot remove or reorder core checks | `checks.json` |
| Seed streams (§1) | anything | a later system **adds a stream name** to `STREAMS` and gets its own `StreamSeed`; it never reuses another stream | `DEUS.Seeds.derived(name, ax, ay, z, attempt)` |

Worked examples:
- **A new effect that needs a moisture field** (ground mist): reads `DEUS.Coarse.fieldAt("moisture", gx, gy)` and `derivedAt("fillFt", …)`, draws through its own presentation plugin, saves nothing. Touches no generator file.
- **A new area type that adds a feature record** (a sacred grove): registers `type: "grove"` in its own plugin, calls `addRecord("features", { type: "grove", anchorCell, zMin, zMax, params, stream: Derived("features", …) })` during its own New Game hook (after `endrath:coarseReady`), and realises its tiles in a `DEUS.World.registerGenerator` of order > 100 that reads the record. The coarse pipeline, `realizeArea` and the checks are untouched.
- **A history system** consumes `regions[]`, `sites[]`, `rivers[]` and the `history` stream; it writes `sites[].state` of its own site types and adds event records under its own schema. It never edits terrain fields.

---

## 11. Module and plugin ownership (summary; the plan has the full table)

| Concern | Pure module (`game/js/sim/endrath/`) | Thin MZ binding (`game/js/plugins/`) |
|---|---|---|
| constants, seeds, checksums, side-file codec | `constants.js`, `seeds.js`, `hash.js`, `sidefile.js` | — |
| coarse fields | `fields.js`, `noise.js`, `climate.js` | `DEUS_Coarse.js` (loads, runs time-sliced, saves header, read API) |
| hydrology | `basins.js`, `water.js`, `rivers.js` | — |
| geology & resources | `geology.js`, `veins.js`, `caves8.js` | — |
| classification | `classify.js`, `bands.js` | — |
| checks & pipeline | `checks.js`, `pipeline.js`, `log.js` | — |
| records | `records.js` | — |
| local realisation | `realize/column.js`, `realize/area.js`, `realize/worker.js` | `DEUS_Realize.js` (generator 7 registration, worker pool, height API) |
| Year-0 fluids | `fluids_init.js` | `DEUS_WaterInit.js` (posts to the authority and ledger) |
| presentation | — | `DEUS_Palette.js` (registry), `DEUS_HeightPresentation.js` (optional offsets), changes inside `DEUS_Depth`/`DEUS_Tiles` for shade steps |
| commands & headless | `headless/run.js` | plugin commands in `DEUS_Coarse.js`; `tools/endrath/*.js` |
