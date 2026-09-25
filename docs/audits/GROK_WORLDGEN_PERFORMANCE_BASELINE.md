# GROK-WORLDGEN-PERFORMANCE-BASELINE

Read-only static audit of `DEUS_WorldGen.js`, `DEUS_Levels.js`, and `DEUS_World.js` at generator **GEN = 4**, default world **1 × 1 area, 256 × 256, five levels (Z−2…Z+2)**. No implementation files were modified, and the pipeline was not re-timed. Operation counts below are taken from the source. The only wall-clock gate in these files is the worldgen check `build_time`: median of three ground `buildArea` calls ≤ **1500 ms**. Published 19A figures (owner review, 2026-09-24) are the numbers 19B must report deltas against: **0.012 ms/frame** added work, **0.41 ms/frame** shape queries, **1.22 ms** per path plan, **2,129,920 bytes** per five-level area.

`tools/bench_underground_gen.js` is pinned to `const GEN = 3` and fails closed on this tree. It is not a GEN 4 measurement.

---

## 1. Executive Summary & Hotspot Heatmap

Generation is eager and then inert. `ensureWorldLevels` builds all five baselines before the first frame. After that, `Game_Map.update` only calls `World.update` (units and a path queue of 4 plans per update). `Scene_Map.update` in Levels only handles level keys and follow. No generator, noise field, or strata walk runs on a timer.

The cost is paid up front, and a large share of it is the same 256×256 field computed over and over. Surface height is a full climate evaluation (`fieldsFor`: 14 `valueNoise` samples) plus two uncached Levels noises. That function runs as its own grid inside cliff mouths on Z−1, again as `surfaceGridFor` on Z0, again inside cliff mouths on Z0, and again once per cell during ground object placement. Z+1 and Z+2 reuse the cached surface grid for shape, then the object pass evaluates surface height a fifth time if those maps are built.

The one true quadratic loop is the Z−1 cliff-mouth connector: each accepted mouth scans almost the whole map for the nearest floor, then throws the result away unless it is inside 30 cells.

Five-strata storage is inside the memory budget only because unchanged terrain stores **no HP byte**. The five material bytes per cell already exist. A 1/5…5/5 cut is a write into that row, not a new buffer.

| Rank | Hotspot | Where | Complexity | Class |
|---|---|---|---|---|
| 1 | Cliff mouth → nearest cave floor | `generateBaseline`, Z−1 only | **O(K·N)** full-map scans; connect limit is 30 but the search is not | Critical |
| 2 | Repeated `surfaceElevation` / `fieldsFor` | cliff mouths ×2, `surfaceGridFor`, object loop | 3–5 full 256² climate passes per area | Critical |
| 3 | Uncached `hash32(...parts)` in cave noise | `generateUnderground` GEN ≥ 3, Z−1 and Z−2 | ~1.52×10⁶ rest-array hashes per level | High |
| 4 | `Map.get` corner lookups | `WorldGen.valueNoise` via `fieldsFor` | ~56 map lookups per cell per climate pass | High |
| 5 | Full climate rebuild on Z+1 and Z+2 | `uf_worldgen` registered for `[0,1,2]` | Another 256² `resolve` even though `paintLevel` already drew the level | High |
| 6 | First `packedGridOf` | `shapeGrid` / `paintLevel` | One 256² `derivePacked`, then cached | Medium stall, once |
| 7 | `paintGround` return object | ground paint | 65,536 short objects | Medium GC |
| 8 | `cellAt` per cell | `generateUnderground` in WorldGen | 65,536 result objects; only when Z−1/−2 is built | Medium, lazy |
| 9 | `nearWater` radius 3 | spore reeds on those builds | ~49 probes on dry cells that reach that plant | Low–medium |
| 10 | Voronoi (16 sites), 4-pass water distance, `toStrata`, kit rings, Mulberry32 | various | Linear, small constants | Low |

There is no O(N³) loop in the generation path. The pocket scorer looks nested (window inside a tile span inside a province grid) but the spans partition the map, so it is O(N).

---

## 2. Step-by-Step Generation Pipeline Latency & Cost Breakdown

N = 65,536 cells. Interior cave cells ≈ 252² = 63,504. Default world width is 256, so climate lattices are tiny (elevation scale 150 → 2×2 corners, detail scale 24 → 11×11). Hashing of corners is amortized. The per-cell tax is call overhead, `Map.get`, and interpolation, repeated for every cell anyway.

### Phase A — New Game, before the first frame (`ensureWorldLevels`)

For each Z in `[-2,-1,0,1,2]`, `baseline()` → `generateBaseline` → `toStrata`. Cache: 12 baselines, 4 surface grids. One area stores 5 baselines, so nothing is evicted.

| Step | What runs | Dominant work |
|---|---|---|
| A1. Z−2 cavern | GEN ≥ 3 branch | 16-site Voronoi over N. Then 6 uncached `valueNoise` × 4 `hash32` rest-calls per interior cell ≈ **1.52×10⁶ hashes**. 4×4 pocket search, 7×7 score window, step 2. |
| A2. Z−1 cavern | same | Same ≈ **1.52×10⁶ hashes**, 6×6 pockets. |
| A3. Z−1 cliff mouths | `cliffCaveMouthsForArea` | **Full** `surfaceElevation` into `S_cache` (climate + 2 uncached noises). Second full scan for cave noise > 0.72. Then each kept mouth walks ~63,504 cells with `Math.hypot`. |
| A4. Z0 surface | `surfaceGridFor` | **Full** `surfaceElevation` again. Result kept and shared with Z+1 and Z+2. |
| A5. Z0 ramps | interior loop | One cached-salt `valueNoise` only on floor cells that pass > 0.65, then a 4-neighbor height check. |
| A6. Z0 cliff mouths | `cliffCaveMouthsForArea` again | **Full** `surfaceElevation` a third time. Does not read the grid A4 just built. Carves a 3-cell tunnel. No nearest-floor search on Z0. |
| A7. Z+1, Z+2 | `surfaceGridFor` hit + ramps | Surface scan skipped. Ramp noise still walks the interior. |
| A8. `toStrata` × 5 | existing bytes | Per cell: solid→5, ramp→3, floor/stairs→1, open→0. Pools write fluid into S1–S2. Working `shape` / `material` / `water` arrays are then dropped. |
| A9. Checksums | `checksumOf` | Z0: 32×32 `cellInfo`. Each call runs `geologyAt` (another `fieldsFor`) and `resolve` (another `fieldsFor`): **1,024 double climate samples**. Other Z: one linear walk of strata bytes. |

`surfaceElevation` also calls `hashString("uf.levels.plateau")` and `hashString("uf.levels.relief")` on every invocation. The ramp and cliff salts are hoisted. These two are not. The camp disc (local radius ≤ 30, about 2,800 cells, ~4%) returns early and skips climate.

### Phase B — `World.buildArea` of the map being shown

`buildArea` always regenerates. `peekArea` keeps 6 finished maps. Generators for a level run in order.

**Ground (Z0).** `paintLevel` returns immediately. `uf_worldgen` (`generate`, order 10):

1. **Classify.** N × `resolve` → `fieldsFor` (14 noises) + a conditional lake sample. One reused `cell` record, but `fieldsFor` allocates a fresh `{e,r,t,d,v,sav,al,sal}` every cell.
2. **Column.** `groundColumns` → `shapeGrid(0)` → first `packedGridOf`: N × `derivePacked` (each cell may also read the level above and below). Then an extra 64 KB copy, masked down to shape codes 0–7.
3. **Paint.** N × `paintGround`, each returning a new object and sampling 8 neighbors.
4. **Water distance.** 4 full passes × 8 neighbors. Linear.
5. **Objects.** N again. Per cell: `surfaceElevationAt` (climate pass number four; it does **not** read `b.surface`), `shapeCodeAt` (cheap once the grid exists), then the biome plant list in catalog order until the first hit. A clumped plant adds another `valueNoise`.
6. **Kit.** One ring of radius 20 per camp, Mulberry32 for the ore id and for placement. Not a map-sized cost.

**Z+1 / Z+2.** Order 5 `paintLevel` derives the packed grid and paints. Order 10 `generate` then classifies climate and runs the water-distance and object loops anyway. Tiles of those levels are not painted by WorldGen.

**Z−1 / Z−2.** Built only when that map is requested, not during `ensureWorldLevels`. `paintLevel` first. Then `generateUnderground`: `cellAt` on every cell (large result object; the grid is already built), a mineral roll, natural flora, and a bounded BFS per camp. `spore_reeds` (`nearWater: 3`) is the only plant that scans a neighborhood, and it scans per candidate cell rather than from the water mask.

### Phase C — After the map exists

| Hook | Per frame |
|---|---|
| `Game_Map.update` | `World.update`: unit steps, ≤ 4 new path plans. No worldgen. |
| `Scene_Map.update` (Levels) | Key queue, follow check, switch timeout. O(1). |
| Level plate `update` | Position and a Z compare. Redraws only when Z changes. |
| Strata / shape | Read on demand. A warm shape read is one array index. `refreshPacked` re-derives the edited cell and the cells above and below it, only after a write. |

Cold stalls that are not per-frame: first `packedGridOf` for a level, a baseline eviction past 12 entries, a peek-cache eviction past 6 maps (full `buildArea` again). The default 1×1 world holds 5 baselines and at most 5 shape grids (`GRID_KEEP` is 15), so play inside that world does not evict them.

---

## 3. Allocation & Memory Profile (Area / Heap Analysis)

### Resident geometry after New Game (1 area, HP still null)

| Buffer | Bytes | Notes |
|---|---|---|
| Strata material, 5 levels × N × 5 | 1,638,400 | `Uint8Array`, HP pointer is null |
| Connectors, 5 × 32,768 | 163,840 | 4-bit ramp/stair code, packed |
| Biome ids, Z−1 and Z−2 | 131,072 | Kept on the baseline |
| Surface S grid | 65,536 | One `Int8Array`, referenced by Z0, Z+1, and Z+2 |
| **Unique typed total** | **1,998,848** | |

The published **2,129,920** byte figure is this total plus the surface grid counted twice more (once per extra level that holds the same reference). `strataMemory()` dedupes by object identity and will report the unique total, plus any packed grids and any legacy views that have been forced.

Legacy views (`b.shape`, `b.material`, `b.water`) are getters. They allocate N bytes on first read and then stick. Checksums use a reused scratch triple and do not pin them. Leaving them lazy saves about 2 × 65,536 × 5 = 655,360 bytes, plus 65,536 for water on each underground level.

### Five strata versus the old one-code-per-cell view

| Model | Per cell | Per level | Five levels |
|---|---|---|---|
| Legacy shape + material + water | 3 bytes | 196,608 | 983,040 |
| 19A baseline material only | 5 bytes | 327,680 | 1,638,400 |
| 19A if HP were stored too | 10 bytes | 655,360 | 3,276,800 |

The handoff formula 256×256×5×5×2 = 3.28 MB assumes HP is stored. The approved 19A deviation (full HP derived, `hp === null`) is what keeps the area under the **3.5 MB** cap. A fully materialized HP plane would land near **3.64 MB** unique before shape grids, pockets, and cliff-mouth objects.

Packed shape grids are a cache, not the authority: 65,536 bytes each, at most 15 kept (**983,040** max). They are empty until a level is painted or queried.

### Churn during a ground build (eligible for GC, but it is the hitch)

- One `{e,r,t,…}` per `fieldsFor` call. Four climate passes ≈ **250,000** of these, plus 65,536 from classify, plus 2,048 from the Z0 checksum.
- 65,536 `paintGround` result objects.
- Underground GEN ≥ 3: ~1.52×10⁶ rest arrays per level from `hash32(...parts)`, on both Z−1 and Z−2. WorldGen’s hot path already has a fixed-arity `hash4` that does not do this. Levels noise does not.
- `World.buildArea` allocates `new Array(N × 6).fill(0)` (393,216 tile numbers) and a `Uint16Array` object grid (128 KB). Six cached maps dominate process heap. Strata do not.
- Mulberry32 is a handful of closures per kit centre. It is not a per-cell allocator.
- Corner caches stay small (hundreds of entries at these scales, cleared at 65,536). The cost is the lookup, not the heap.
- Working `shape` / `material` / `water` arrays inside `generateBaseline` die after `toStrata`. Do not start retaining them.

---

## 4. Pre-19B Algorithmic Inefficiencies & Anti-Patterns Found

1. **Same surface field, three writers.** `surfaceGridFor` caches S. `cliffCaveMouthsForArea` ignores it and fills its own `S_cache`. Z−1 runs before Z0 (`LEVELS` is `[-2,-1,0,1,2]`), so the Z−1 pass cannot see the later cache, and the Z0 pass does not read the cache it just built. Object placement calls `surfaceElevationAt`, which also ignores `b.surface`.

2. **Quadratic connect with a radius that is only applied after the scan.** The mouth linker accepts a floor only when `nearestDist < 30`, but the search is the whole interior. A 61×61 window is the entire legal result set.

3. **Two noise stacks that do not share a cache.** WorldGen memoizes lattice corners per `(seed, salt)`. Levels `valueNoise` rehashes four corners per sample, and `hash32` allocates a rest array. Cave generation (6 octaves) and relief/plateau sit on the expensive stack. Climate sits on the cheap stack and is then called so often that the memoization barely matters.

4. **GEN ≥ 3 caves are already a 2D noise carve, with no cellular automata.** Halls, corridors, and pillars are six thresholded samples. `bench_underground_gen.js` records cellular smoothing as `not_present`. Adding a CA pass on top of those six octaves is a second full-map algorithm, not a replacement.

5. **Binary shape expanded to five bytes, then thrown away as a place to store height.** `toStrata` can already write 0–5 material bytes. Macro shape is only solid / floor / open / ramp. Partial height does not need a new data model. It needs a fill count in that loop.

6. **Z+1 and Z+2 pay surface climate twice.** Their geometry comes from the S grid. `uf_worldgen` is still registered for those levels and runs a full classify, a 4-pass water distance, and a per-cell surface recompute to place objects.

7. **`cellInfo` / `cellAt` allocate.** The Z0 checksum and any cut sampler that goes through them will. `shapeCodeAt`, `surfaceHeightAt`, and `worldStrataElevationAt` are the allocation-free reads.

8. **Synchronous grid build.** The first shape read of a level derives all N cells on the caller’s stack. Fine once. A 19B pass that dirties every cell after the grid exists will rebuild through `refreshPacked` one cell at a time, each touching three levels.

9. **Caches that thrash only when the world grows.** 12 baselines and 15 grids fit the default world. A multi-area world (5 baselines each) evicts after two areas and will regenerate GEN 4 caves, including the quadratic mouth search, on the next visit.

---

## 5. Concrete Performance Acceptance Thresholds for 19B Integration

19B carves into strata that already exist. These are the gates that keep that carve inside the baseline above.

### Where to insert, and what not to call

Put cuts and caves in `generateBaseline`, after the macro column is known and before `toStrata`. Write a per-cell fill of 0…5 into the existing material row.

| Feature | Cheap insertion | Do not |
|---|---|---|
| 1/5…5/5 cuts | One linear pass over the existing S grid. One memoized octave (WorldGen `valueNoise`). Fill count replaces the solid→5 / floor→1 rule inside `toStrata`. | A `fieldsFor` sample per stratum, per Z, or per cell of a cut. That is up to 25× the climate cost. |
| Caves on Z+2…Z−2 | One `Uint8` mask per Z, dropped after `toStrata`. Z−1/−2 should reuse the mask GEN ≥ 3 already writes into `shape[]`. Upper levels get one new octave, then a roof rule: carve only where the column above is solid. | Copying the 6-octave uncached hasher onto three more levels (~3× the 3.05×10⁶ hashes). |
| Shafts, Z0→Z−1→Z−2 | Sparse stamps, same style as cliff mouths, search radius ≤ 30. | Another full-map nearest-floor loop. |
| Order | Hoist one `surfaceGridFor` before the Z loop and pass that `Int8Array` into cliff mouths and into the cut pass. | A fifth `surfaceElevation` scan. |

### Noise versus cellular automata

| Method | Work for one 256² level | GC | Use in 19B |
|---|---|---|---|
| Current GEN ≥ 3 (6 uncached octaves) | ~1.52×10⁶ `hash32` rest-calls | Heavy | Keep for Z−1/−2 only if the checksum must stay. Do not extend it. |
| One memoized octave + threshold | ~N interpolations, a few hundred hashes | None beyond the mask | Default for new cut and upper-cave masks. |
| 4-iteration Moore CA | ~4 × N × 8 integer reads, in-place `Uint8` | None | Cheaper than GEN ≥ 3 hashing, more expensive than one memoized octave. Legal only as a **replacement** of the six octaves, behind a generator-version bump. Not as an extra pass. |

### Hard gates

| Gate | Threshold |
|---|---|
| Ground `buildArea` | Median of 3 runs stays **≤ 1500 ms** (existing `build_time` check). |
| New climate work | **Zero** additional `fieldsFor` passes in `ensureWorldLevels` or `generate`. New masks are one memoized octave per Z. |
| Search | Any “nearest cell” walk examines **≤ 61×61** cells, or uses a bucket. No new O(K·N) scan. |
| Unique typed bytes per area | Stay **≤ 2.10 MB** for seeded terrain. Hard ceiling **3.5 MB** including metadata 19B keeps. |
| HP plane | Remains **null** on untouched and on freshly carved natural strata. Full HP stays derived. |
| Working masks | `shape`, fill, cave, and cut masks are dropped at the end of `generateBaseline`, the way `water` is dropped today. |
| Shape grids | Still built once, on first read. 19B writes strata **before** the first `packedGridOf`. It does not call `verifyPackedGrids` and does not rebuild five grids during the carve. |
| Queries | `shapeCodeAt` / `surfaceHeightAt` stay allocation-free. Cuts are not sampled through `cellAt` or `cellInfo`. |
| Frame, quiescent | **0** scans of 256×256 per frame from these three plugins. Report deltas against **0.012 ms**, **0.41 ms** shape queries, and **1.22 ms** per path. A cut must not add a tick. |
| Determinism | Cut and cave fields are pure `(seed, salt, x, y, z)`. Mulberry32 stays on the kit. No `Math.random`, no dependence on area-build order. |
| Generator identity | Geometry that changes GEN 4 bytes is a new gen number. GEN 1–3 branches stay byte-identical. |

### Quiescent budget

Confirmed for this pipeline. Once `ensureWorldLevels` and the viewed `buildArea` finish, world data sits in the baseline `Map`, the strata `Uint8Array`s, and (after first use) packed grids. Nothing in `World.update`, Levels’ `Scene_Map.update`, or the level plate walks those arrays unless a player write, a level switch, or a cache miss demands it. Cave simulation, fluid flow, and ecology are outside these three files; 19B must not add that kind of loop here to “keep caves alive.” A cave is a pattern of material bytes. After `toStrata`, its ongoing cost is zero.