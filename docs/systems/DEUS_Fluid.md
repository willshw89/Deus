# DEUS Fluid (`DEUS_Fluid.js`)

Status: NAT.03.01 / lane-cw correctness implementation, 2026-09-30; awaiting independent review. RMMZ F5 playtest: **NOT RUN** in this lane. Headless checks do not establish playability or frame rate.

## Purpose and authority boundary

`game/js/plugins/DEUS_Fluid.js` owns its sparse 0..7 water/lava grids and dirty queues. `game/js/sim/hydro/index.js` holds that solver's aquifers, atmosphere, displaced liquid, lake definitions and seep visit counters. The separate `sim/hydrology` kernel and Levels' legacy flood data still exist. **Design D2 must settle their authority and integration.** This lane does not merge those systems, implement liquid reactions, change displaced-water return behavior, or change waiter/spring wakeup policy.

A nonzero cell stores depth in bits 0..2 and type in bits 4..7 (`1` water, `2` lava). Grids and visual caches are allocated per occupied area/layer. An empty level may share a read-only zero flood grid. Geometry comes from `UF.Levels`; range comes from `UF.World.zRange()` with a -2..+2 fallback before World is available.

## Work scheduling and diagnostics

`tick(budget)` shares one nonnegative integer budget across **all queued areas** and registered lake visits, regardless of view. `step(area, budget)` restricts both to the requested area. The default is 512. An explicit zero returns zero without processing cells, probing geometry, evaluating weather input, or advancing hydro time. `tick` visits each initially active area at most once; newly queued work resumes on subsequent ticks. Areas rotate in a dirty-area Set so off-view work progresses without enumerating every allocated area each frame.

One scheduler work item is one dequeued fluid cell or one scheduled lake-cell visit. A fluid item includes the fixed cardinal checks, spring feeding and a seep walk bounded by the current Z span. A lake item includes bounded local delivery/spill and evaporation. This is a count of bounded cell operations, **not** a CPU-time limit or a count of individual JavaScript instructions. A deep seep item can cost more than a dry queue entry. Lakes receive at most half the budget when fluid is queued; budget-one calls alternate the available share. Unused lake allowance remains available to fluid.

Lake definitions build all-cell and evaporation-only indexes, globally and per area. Definitions, replacement and `setEvap` rebuild these derived indexes; ticks use cursors into the chosen index. A dry season with no evaporation does not enumerate lake cells. Definition/import work, save serialization and diagnostic volume sums are explicit operations outside the tick budget.

`hydro().cost()` reports:

- `processed`: dirty cells dequeued, including dry entries.
- `lakeVisits`: scheduled lake entries visited.
- `work`: `processed + lakeVisits`, bounded by the caller's budget.
- `examined`: actual hydro lake visits, evaporation reads, delivery/passage probes and seep column probes, including refused attempts. This is additional detail within the work items; it is not capped to the same number as `work`.
- `tick`, `aquifers`, `springs`, `lakes`: hydro sequence and registry counts.

Idle queues and inactive lake indexes perform no cell work. Bookkeeping remains. No engine frame-time or garbage-collection performance claim has been measured here. Queue compaction and index construction allocate memory.

## Flow, capacity and passage

Gravity checks the source DOWN passage bit and destination capacity. Lateral flow checks source/destination object barriers, capacity and strata height lips. Transfers require the same liquid type or an empty destination. Water and lava do not react in this solver.

Hydro delivery uses the same Fluid object/geometry barrier checks. Rain cannot enter or spill from a closed door or wall cell; lateral spill uses Fluid's lateral passage helper; upward spill requires the UP bit and an unblocked destination. Seepage still traverses permeable solid **terrain** (its existing purpose), but refuses constructed wall/closed-door objects at the source, intermediate plugs and receiver. Open doors admit the same passage as Fluid. No new permeability law is introduced.

`setCell` is explicit placement/replacement, not a conserved transfer: it clamps the requested depth to the cell's capacity and accepts both area spellings. Callers transferring counted mass must debit only the accepted amount. Reconciliation after capacity loss tries compatible liquid cells above and beside the source, then retains the remainder in a typed store. It never replaces water with lava or lava with water at a receiving cell.

**D2 pending item:** the long-term displaced-liquid store and its return behavior remain undecided. Hydro preserves water in its existing `displaced` field and lava separately in `displacedLava`; neither is deleted or automatically returned. If hydro cannot load, Fluid retains both types in `pendingDisplaced`. This is conservation bookkeeping, not a choice of the future world reservoir. Lava is excluded from every water total.

## Public API

Query overloads use `(ax, ay, x, y, z)`, `(area, x, y, z)`, a nested `{area, x, y, z}` ref, or a flat `{ax, ay, x, y, z}` ref. An `area` accepts `{x, y}` or `{ax, ay}`. Omitted z defaults to 0.

| Method | Contract |
|---|---|
| `depthAt`, `fluidVolumeAt` | Integer depth 0..7; retained out-of-range records remain readable. |
| `typeAt`, `fluidTypeAt` | `water`, `lava`, or null. |
| `fluidCapacityAt` | Strata-derived capacity 0..7; zero outside the live world range. |
| `fluidFillFractionAt` | Depth / capacity clamped to 0..1; zero when capacity is zero. |
| `fluidPhysicalHeightStateAt`, `fluidPhysicalHeightStringAt` | Existing lookup conversion to 0..5 fluid strata and `FLUID_k_OF_5`. |
| `fluidCanPassDown` | Whether source gravity passage and receiving space are available. |
| `fluidCanPassLaterally` | Existing numeric/ref neighbor passage query, including object barriers and strata lips. |
| `rawAt(ax, ay, x, y, z)` | Packed grid value for numeric coordinates. |
| `setCell(area, x, y, z, type, depth)` | Set a cell within live range, clamped to capacity; wake the cell and neighbors. |
| `walkable(ax, ay, x, y, opts)` | Uses `opts.z`; also accepts `(ax, ay, x, y, z, opts)`, `(area, x, y, z, opts)` and `(ref, opts)`. |
| `movementClass(ref)` | `dry`, `shallow` (1..2 water), `wading` (3..4), `deep` (5..6), `submerged` (7), `lethal` (lava). |
| `isFlooded(ref)`, `isSubmerged(ref)` | Flooded/type/depth tuple, or full-depth predicate. |
| `getFloodGrid(area, z)` | Visual type grid; shared zero grid if unallocated; null outside range. |
| `tick(budget)`, `step(area, budget)` | Work items executed (dirty fluid cells plus lake visits). |
| `enqueueCell`, `wakeCellAndNeighbors` | Numeric area/cell coordinates; local dirty scheduling. |
| `diagnostics(ax?, ay?)` | Grid counts, queue size, grid water/lava volumes, global storage added to mass totals, dirty-cell counts and timing. `queueZMin` reports a requested area's current queue origin. Volume queries with area arguments are local; hydro stores remain global. |
| `hydro()` | Optional API below, or null if require failed. |
| `makeSaveContents`, `extractSaveContents` | Fluid payload serialization and state replacement. |
| `reset`, `attach` | Clear state, or bind to the live namespace/event bus. |

Water depth >=5 requires `canSwim`; lava requires `lavaImmune`. These are passability predicates. Movement-speed penalties, burns, drowning, splash audio and item destruction are not implemented by these predicates.

The optional hydro API exposes `defineAquifer(id, du)`, `defineSpring({ax,ay,x,y,z,aquifer,rate})`, `defineLake({id,evap,cells})`, `setEvap(id,n)`, `setSeasonInput(fn)`, `seedAtmosphere(n)`, `storedAt(id)`, `columnId`, `mass()` and `cost()`. `mass()` retains water-only `grid`, `aquifers`, `atmosphere`, `displaced`, `total`; `displacedByType` names water and lava separately. Amounts use JavaScript Numbers without signed 32-bit narrowing; integer precision is limited to the Number safe-integer range. Season callbacks are not saved. The tick is not a calendar integration.

`_configure` and hydro `configure` are test mutation controls, not gameplay APIs. `_mutantDelete` removes one unit at a transfer destination while debiting the full source amount; conservation assertions must fail under it.

## Events and existing engine connections

Listens to `levels:cellChanged`, `levels:shapeChanged`, `levels:strataChanged`, and `levels:strataDestroyed` to reconcile and wake affected cells. `doors:opened`, `doors:closed`, and `doors:broken` wake the door and neighbors. `world:areaBuilt`, `world:levelBuilt` and aliased `Game_Map.setup` reattach the namespace. Aliased `Game_Map.update` calls `Fluid.tick`. No new events are emitted.

Existing consumers include:

- `DEUS_Levels.js`: calls Fluid volume/capacity/height/flood queries and exposes query aliases. It still contains legacy flood behavior, so this is not proof of one world water authority.
- `DEUS_World.js`: calls `Fluid.walkable` with the caller's z and swim/lava options.
- `DEUS_Levels.js` also implements `Sprite_UFFloodOverlay`, reading `getFloodGrid` and Fluid depth for tile overlays. The brief names `DEUS_Visuals.js`, but inspection found no fluid query there; it is not established as a fluid consumer. This lane does not replace or prove either renderer in playtest.
- `DataManager`: aliased save/load hooks carry both `deusFluid` and compatibility `ufFluid` keys.

The strata reconciliation suite exercises real Levels-to-Fluid query/event delivery in a headless engine fixture. The lane correctness suite exercises the Fluid/hydro boundary and DataManager aliases with controlled fixtures. Actual editor F5/F8 behavior and presentation: **NOT RUN**. D2 must settle the existing bridge overlap before a unified water/lava gameplay claim.

## Save data and range changes

Fluid retains `fluidSchemaVersion: 1` and records `[ax, ay, z, x, y, type, depth]`. Bare legacy arrays are accepted. Load preserves occupied records beyond the range available at load time; those cells remain dormant until that range opens. A World range change rebases queued IDs without changing their coordinates and wakes newly available saved cells. This range-change operation may traverse existing areas/queued work once; it is not a per-frame world scan.

Optional hydro payload v2 keeps v1 fields (`atmosphere`, `displaced`, `aquifers`, `springs`, `lakes`, `visits`) and adds `displacedLava`. Import migrates v1's `displaced` as water and defaults lava to zero. Fluid's optional additive `pendingDisplaced: {v:1,water,lava}` holds typed displacement when hydro is unavailable. It remains retained if hydro subsequently becomes available; D2 owns return policy.

Missing fluid keys reset grids, queues, pending payloads and hydro state. Missing hydro keys reset old hydro stores. If hydro require throws, its saved payload is deep-copied unchanged through the next save, including fields this code does not understand; it is not simulated or included in live hydro diagnostics while unavailable. Later loading in a process where hydro is available imports it. Unknown future-schema interpretation when hydro loads is not addressed here.

## Checks and remaining work

- `node tools/test_fluid_correctness_lane_cw.js`: budget/range/coordinate/conservation/save/passage/documentation assertions, each paired with a targeted failing runtime or document mutant.
- `node tools/test_strata_fluid_reconciliation.js`: existing real Levels fixture, capacity/flow/reconciliation/save assertions and mutation checks.
- `node tools/sim/test_water_dynamics.js`: existing 9-/32-layer hydro regressions.
- `node tools/sim/test_fluid_attach.js`: existing namespace/reattachment regression.
- `node tools/check_deus_syntax.js`: plugin syntax gate.

Evidence and exact outcomes belong in `tasks/NAT.03.01/lane-cw/REPORT.md`. Remaining: independent review, D2 authority/store/reaction design, coordinator integration and editor playtest with inspected visual evidence. No new art or presentation was produced by this lane.
