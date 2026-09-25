# GROK-19B-ADVERSARIAL-TEST-PLAN

Read-only specification for `tools/test_strata_cuts_and_caves.js`. It audits an implementation of FABLE-19B against the handoff and the strata/fluid contracts already in `DEUS_Levels.js` and `DEUS_Fluid.js`. The suite is there to fail incomplete generators and oracles that treat legacy floors, shape codes, or a 4 ft void as a finished cave system.

No implementation file is modified by this document. Mutants below are in-memory source patches applied by the harness, the same way `tools/test_strata_foundation.js` applies `MUTANTS`. A missing patch anchor exits **2**. A patch that leaves every assertion green exits **1** (the control is blind). A correct build exits **0**.

## Geometry the oracles are pinned to

These are the current authorities. Tests recompute them from `Levels.strataAt` bytes. They do not ask `shapeAt` whether a cave exists.

| Fact | Value |
|---|---|
| Macro-Z | `-2..+2`. `inWorld(ax, ay, 3)` is false. There is no `levels["3"]`. |
| Stratum | `S0` bottom .. `S4` top, 1 ft each. |
| Column elevation | `e = (z + 2) * 5 + s`, range `0..24`. |
| Bands | Z-2 `e0..4`, Z-1 `e5..9`, Z0 `e10..14`, Z+1 `e15..19`, Z+2 `e20..24`. |
| Cliff lip / floor pair | **Z0 S0 is `e10`. Z-1 S4 is `e9`.** Adjacent slices. |
| `heightStateAt` | `HEIGHT_k_OF_5` means `fillOf`: solid bytes stacked from S0 until the first non-solid. It does not mean "k solids anywhere in the cell". |
| `worldStrataElevationAt` | Top of that prefix, or, when the prefix is empty and `z > -2` and the cell below has S4 solid, `(z + 2) * 5 - 1` (the lip). |
| 19A headroom | `derivePacked` stands a unit when non-solid strata above the floor are `>= 4` (`head >= 4` → shape `floor`). `World.walkable` follows that shape. |
| Air vs fluid vs solid | Material id `0` is air. Water `4` and lava `5` are non-solid and are not air. `M_BUILT` is `0x80`. |
| Capacity | `STRATA_TO_FLUID = [0, 1, 3, 4, 6, 7]` indexed by **count of non-solid strata**, not by `5 - fillOf`. Passage bits: capacity `0..7`, `DOWN = 8`, `UP = 16`, `SIDE = 32`. |
| Open-strata → capacity | 5→7, 4→6, 3→4, 2→3, 1→1, 0→0. |
| Host surface | Private `surfaceElevation` / `baseline(z).surface`: macro `S ∈ {0,1,2}`, camp disk radius 30 forced to `S = 0`, then `eff >= 0.58 → 2`, `>= 0.44 → 1`, else `0`. Pre-cut floor stratum is `e_host = (S + 2) * 5`. |
| Legacy negative-Z floor | `toStrata` writes floor as S0 solid and S1..S4 air. Clearance above that floor is **4 ft**, and it stops because the cell above has a solid S0. |

**Legacy false-pass.** A generator that never carves 19B still has Z-1 and Z-2 floors, cliff-mouth floors, and stair codes. Those floors are roofed 4 ft voids. `shapeAt === "floor"` and `hasOpaqueOverburden === true` are both true on them. Stair codes do not open the `e9`/`e10` pair. Any test that counts those cells as 19B passages, or counts a stair as a shaft, passes an implementation that did no work.

---

## 1. Test Suite Architecture & Fixtures Matrix

### Harness

- Node vm, same plugin set as `tools/test_strata_foundation.js`, plus `DEUS_Fluid.js`.
- Worlds are New Game seeds. Area under test is `(0,0)` unless a case says otherwise. Size comes from `World.state.size` (256).
- Two contexts per seed:
  - **Host.** `__DEUS_SKIP_CUTS_CAVES = true` before generation. 19B must leave this seam at the top of the cut/cave pass and skip that pass entirely.
  - **Feature.** Flag unset.
- Stratum diff `featureBytes !== hostBytes` is the set of cells 19B actually carved. Existence tests run on that diff. A missing seam exits **2**. An empty diff fails every existence assertion.
- Surgical fixtures call `Levels.setStrata` on a third vm and never satisfy "generated feature" assertions. `strataAt().changed === false` is required on scanner hits.
- Checksums cover the 25 material bytes of every column, plus connector nibbles. Shape-grid checksums stay in the 19A suite. A roofed void and an open floor both derive as `floor`.
- Oracle functions live in the test file. They read `strataAt().bytes` and the frozen tables above. `Levels.continuousAirHeight` (documented alias allowed only if `docs/systems/UF_Levels.md` names exactly one) must return the oracle's integer. A missing function fails the clearance block.
- Exit codes: `0` pass, `1` assertion failed, `2` harness or missing mutant anchor.
- Invocation: `node tools/test_strata_cuts_and_caves.js [--seed=20260923] [--mutant=<name>] [--sweep] [--quiet]`.

### Shared oracles

**Air run.** From standing elevation `e_floor = worldStrataElevationAt` (recomputed from bytes, then compared to the API), count consecutive material-id `0` at `e_floor+1, e_floor+2, …` up to `24`. Water, lava, and solid stop the run. No floor (`e_floor = -1`) yields clearance `0`.

**Passage class** (test predicate, and the required 19B predicate):

| Clearance | Class | Enclosed (`hasOpaqueOverburden` true and a solid or cap above the run) |
|---|---|---|
| 0..3 | `LOW` | void, crawl, or sealed crack |
| 4 | `LOW` | **low void.** Full-height passage flag is false. |
| 5 | `PASSAGE` | minimum full-height passage |
| ≥ 6 | `TALL` | multi-Z void |

`World.walkable` is recorded and is not the passage oracle. A 4 ft open shelf is a 19A floor.

**Sky-open cut column.** Some `e <= e_host` is air in the feature world and solid in the host world, and the air run above the new floor reaches the sky (overburden false, no cap). `cutDepth = e_host - e_floor`.

| Class | Rule |
|---|---|
| Uncut | `cutDepth = 0` |
| Shallow | `cutDepth ∈ {1,2,3,4}` |
| One macro | `cutDepth ∈ {5..9}` and `e_floor >= 10` |
| Expose Z-1 | `e_floor ∈ {5..9}` |
| Expose Z-2 | `e_floor ∈ {0..4}` |

On a host valley (`S = 0`, `e_host = 10`), depth 1 already stands on `e9`. That column is **expose Z-1**, not shallow. Shallow relief is what hills can spare (`e_host` 15 or 20) and what partial fills inside a macro band produce.

**Interior cave cell.** Feature-world air run `>= 1`, overburden true, and the cell is in the 19B diff or its air run is `>= 5`. Legacy 4 ft floors stay in the host world and do not count.

**Vertical link** at one XY between `z` and `z-1`. Let the upper cell's S0 and the lower cell's S4 be the boundary pair `e` and `e-1`. The link exists when both bytes are air and each side's air run contains that byte. A connector code, a shared XY, or air somewhere else in either cell does not create a link.

**Lateral link.** Same `z`, 4-neighbors, the two air-elevation intervals overlap.

**Cave graph.** Nodes are interior cave cells. Edges are lateral and vertical links.

**Floating natural solid.** 6-connected components of natural solid voxels (material solid, `M_BUILT` clear). Seeds are natural solids on the area perimeter and natural solids at `e = 0`. A component with no path to a seed is a floating island. A ceiling, arch, ledge, or overhang whose voxels reach a seed is legal. The detector is not a span simulator.

**Z+2 cap.** Overburden for an enclosed Z+2 void is a solid voxel at `e20..24` above the air run, or a Z+2-only sidecar that stores material, thickness `>= 1` ft, opacity, and HP, and that `hasOpaqueOverburden` reads. `z = 3`, elevation `>= 25`, a sixth `Uint8Array` of `size*size*5`, and `Fluid` grids outside `-2..2` are a sixth plane. A boolean `isCaveRoof` is not a cap.

**Capacity oracle.** `open = count(byte is not solid)` over the five bytes. Expected `Fluid.fluidCapacityAt = getStrataFluidPassage & 7 = STRATA_TO_FLUID[open]`. `DOWN` is set only when S0 is non-solid, `z > -2`, and the cell below has S4 non-solid.

### Fixtures

| Id | Kind | Build | Isolates |
|---|---|---|---|
| H0 | Host vm | skip-cuts seam, seed `20260923` | pre-cut `S` grid, legacy 4 ft floors |
| F0 | Feature vm | same seed, carve enabled | generated diffs |
| FX | Pair | H0 and F0 byte diff | "19B did this" vs legacy |
| SW | Sweep | 32 + 16 seeds, both vms, area `(0,0)` | frequency |
| LIP | Surgical column | Z-1 and Z0 all stone; then delete exactly `e10` | lip pair `e9`/`e10` |
| OPEN-Z1 | Surgical | Z0..Z+2 air, Z-1 five stone | sky-open floor at `e9` |
| OPEN-Z2 | Surgical | Z-1..Z+2 air, Z-2 five stone | floor at `e4` |
| P1 | Surgical Z0 | `[stone, air, air, air, air]`, above air | `HEIGHT_1_OF_5`, clearance 4, capacity 6 |
| P4 | Surgical Z0 | `[stone, stone, stone, stone, air]`, above air | `HEIGHT_4_OF_5`, clearance 1, capacity 1 |
| P2, P3, P5 | Surgical | fills 2, 3, and 5 | the rest of the height ladder |
| TRAP | Surgical | `[stone, air, stone, stone, stone]` | `HEIGHT_1_OF_5` with clearance 1, capacity 3, in-cell roof |
| M5 | Surgical | Z-1 S4 solid, Z0 five air, Z+1 S0 stone | clearance 5, enclosed |
| M6 | Surgical | Z-1 `[stone, air, air, air, air]`, Z0 `[air, air, stone, stone, stone]` | clearance 6 across `e6..e11` |
| SEAL | Surgical | Z-1 `[stone, air, air, stone, stone]`, Z0 `[stone, air, air, stone, stone]` | same XY, two voids, no vertical link |
| SHAFT | Surgical | Z-1 `[stone, air, air, air, air]`, Z0 `[air, air, stone, stone, stone]` | true shaft, `DOWN` on Z0 |
| RAMP | Surgical 3 cells | sky-open floors at `e14`, `e13`, `e12` stepping south | ramp vs shaft |
| CAP5 | Surgical | Z+1 `[stone, stone, stone, air, air]`, Z+2 `[air, air, air, stone, stone]` | 5 ft passage, cap inside `e23..24` |
| CAP4 | Surgical | Z+1 five stone, Z+2 `[air, air, air, air, stone]` | 4 ft under a legal cap |
| CAP6 | Surgical illegal | Z+2 five air plus a `z=3` solid or a roof boolean | sixth plane / fake roof |
| FLOAT | Surgical | one natural stone voxel at Z+1 S4, six neighbors air | detector fires |
| ARCH | Surgical | Z0 S4 stone bridge whose ends join two solid columns | detector stays quiet |
| FLUID | Surgical basin | known water volume, then `applyVolumeDamage` opens `e10` and `e9` | mass, capacity, `DOWN` |
| BREACH | F0 cave or CAP5 | damage only the roof voxels | exposure follows strata |

### Handoff A–Q map

| Handoff | Suite ids |
|---|---|
| A Determinism | A1 |
| B Seed differs | A2 |
| C Partials 1/5..5/5 | P-GEN |
| D Z0→Z-1 | D1 |
| E Z-1→Z-2 | D2 |
| F Trace to Z-2 | D3 |
| G Shallow ≫ Z-2 | D4, sweep |
| H Caves on five Z | C1–C5 |
| I Cave-free substantial | C6 |
| J Traversable substantial | C7 |
| K Overburden | S1 |
| L Roof breach | S2 |
| M 4 ft / 5 ft / >5 ft | M1–M4 |
| N Multi-Z connectivity | N1–N4 |
| O No floating islands | S3 |
| P Fluid suite still passes | R1 |
| Q Foundation suite still passes | R2 |

---

## 2. Detailed Test Specifications

Each case: **Setup**, **Invariant**, **Failure signature** (the wrong implementation this assertion is built to catch).

### A. Determinism and authority

**A1 — same seed, raw strata.** Setup: two feature vms, seed `20260923`, area `(0,0)`, all five Z. Invariant: material bytes and connector nibbles are identical, including cells where the derived shape is unchanged. Failure signature: checksum covers `shape` only, so a ceiling edit hashes clean, or `Math.random` / iteration-order carve moves a mouth.

**A2 — seed + 1.** Setup: feature vm at `20260930`. Invariant: the 25-byte column hash differs, and both worlds still satisfy C6 and C7. Failure signature: the carve salt ignores the world seed, so both worlds match.

**A3 — baselines, not edits.** Setup: scanner hits from F0. Invariant: every reported feature cell has `strataAt().changed === false`, and those bytes are present in a vm that never called `setStrata`. Failure signature: acceptance coordinates were written after generation.

**A4 — host surface frozen.** Setup: H0 `baseline(0).surface`, `baseline(1).surface`, `baseline(2).surface`. Invariant: the three grids are equal, and each value matches the camp-and-threshold function (`r <= 30 → 0`, else `0.58 / 0.44`). Feature-world host grid is the same array. Failure signature: the carve pass writes the post-cut floor back into `surface`, so deep holes are reclassified as ordinary valleys.

**A5 — no second terrain.** Setup: static read of `DEUS_WorldGen.js` and `DEUS_Levels.js` after the run; runtime probe asks `cellAt` and `strataAt` only. Invariant: cut and cave results are stratum material bytes. Shape grids are derived. Failure signature: a parallel mask or cave graph is what the scanner had to read to find a void the strata do not contain.

**A6 — pipeline is generation-time.** Setup: record `stats.generated` and the column hash, invoke one map update, query `continuousAirHeight` and `hasOpaqueOverburden` 100 times. Invariant: generation count and bytes stay put. Source of the carve pass is reachable from world creation, not from `Scene_Map.prototype.update`. Failure signature: a per-frame rescan or a regen on query.

### B. Boundary and off-by-one

**B1 — lip pair identity.** Setup: LIP, delete only the byte at `e10`. Invariant: Z0 bytes are `[air, stone, stone, stone, stone]`; Z-1 bytes are five stone; `surfaceHeightAt(Z0) === -1`; `worldStrataElevationAt(Z0) === 9`; Z-1 S3 (`e8`) still stone; HP of `e9` still 255. Failure signature: the writer uses `e = (z + 2) * 5 + s + 1` or `s - 1`, so the air lands on `e9` or `e11`.

**B2 — one-foot exposure.** Setup: OPEN-Z1. Invariant: floor elevation is exactly 9; `e10` is air; `e9` is stone; `cutDepth` from a host `e_host = 10` is 1 and the class is expose Z-1. Failure signature: "remove the Z0 floor" also clears Z-1 S4 (floor falls to `e8`) or clears Z0 S1..S4 and leaves S0 (elevation stays 10, class stays uncut).

**B3 — damage box matches the pair.** Setup: a solid column. `applyVolumeDamage` from `(z=-1,s=4)` to `(z=0,s=0)` at 500 blast, the existing 19A box. Invariant: destroyed strata are exactly `e9` and `e10`; `e8` and `e11` stay at full HP. Failure signature: `levelOfElevation` uses `Math.ceil`, so the box walks into the wrong cell and the lip survives or the floor below dies. This is the same defect as the 19A mutant `no_cross_z`, re-aimed at cut boundaries.

**B4 — rim continuity.** Setup: two adjacent surgical columns. West is uncut host floor `e_host = 10` (Z0 S0 stone). East is OPEN-Z1. Invariant: west standing elevation 10, east standing elevation 9, difference 1, shared face is the solid/air pair `(e10 west, e10 east)` with east's floor at `e9`. Failure signature: the rim and the cut share an elevation (overlap) or differ by 2 (a missing slice).

**B5 — bottom of the world.** Setup: OPEN-Z2, and a second column with Z-2 S0 also air. Invariant: floor at `e4` reports elevation 4; the fully open Z-2 column reports `worldStrataElevationAt === -1` and derived shape `open`. `getStrataFluidPassage` at `z = -2` has `DOWN` clear. Failure signature: the carver invents `z = -3` to hold a floor, or sets `DOWN` on Z-2.

**B6 — top of the world.** Setup: CAP5 and a query at `z = 2`. Invariant: the air run stops at the cap voxel `e23`; elevation addresses stop at 24; `Fluid` has grids for `-2..2` only. Failure signature: the cap is stored as `e25` / `z = 3`.

**B7 — partials are bottom-justified.** Setup: P1 and P4. Invariant: P1 bytes are S0 stone and S1..S4 air; P4 bytes are S0..S3 stone and S4 air. `heightStateAt` is `HEIGHT_1_OF_5` and `HEIGHT_4_OF_5`. Clearance is 4 and 1. Capacity is 6 and 1. Failure signature: solids are packed from S4 downward, so "1 of 5" becomes a one-stratum ceiling, `fillOf` reports `HEIGHT_0_OF_5`, and the capacity pair swaps toward 0 and 7.

**B8 — area edge.** Setup: F0 columns `x = 0` and `x = size - 1`. Invariant: the underground border (`BORDER = 2`) remains host-solid where the host was solid; carve diffs inside `x < 2` or `x >= size - 2` are empty on Z-1 and Z-2. Failure signature: an inclusive/exclusive bound carves `x = size` (dropped) or eats the border and splits the bedrock seed ring.

### P. Partial fills and the 4 ft rule

**M1 — numeric 4.** Setup: P1, sky above. Invariant: `continuousAirHeight === 4`, class `LOW`, passage flag false, `heightStateAt === "HEIGHT_1_OF_5"`, `solidFraction === 0.2`, capacity 6. `World.walkable` may be true. Failure signature: the query returns 5 (floor stratum counted), returns 4 and then rounds "walkable headroom" up to a passage, or uses `head >= 4` as the cave predicate.

**M2 — numeric 1 on the twin fill.** Setup: P4. Invariant: clearance 1, class `LOW`, capacity 1, `surfaceHeightAt === 3`, elevation `(z + 2) * 5 + 3`. Failure signature: `HEIGHT_4_OF_5` is implemented as "4 air", so this cell reports clearance 4 and capacity 6.

**M3 — the height-state trap.** Setup: TRAP. Invariant: `heightStateAt === "HEIGHT_1_OF_5"` while clearance is 1, overburden is true, open count is 1, capacity is **1** (`STRATA_TO_FLUID[1]`), not 6. Failure signature: clearance is computed as `5 - k` from the height-state index, so every `HEIGHT_1_OF_5` becomes a 4 ft passage, including this roofed crack. Capacity computed as `STRATA_TO_FLUID[5 - fillOf]` returns 6.

**M4 — 5 ft and 6 ft.** Setup: M5 and M6. Invariant: M5 clearance is 5 and class `PASSAGE`; M6 clearance is 6 and class `TALL`; the run on M6 includes `e6..e11` and crosses the Z-1/Z0 boundary. Failure signature: the counter stops at the macro-Z wall, so M6 reports 4 (the Z-1 portion) or 2 (the Z0 portion). A second signature: M5 is rejected because the implementation only accepts voids that sit inside one cell.

**M5w — walkable is a different question.** Setup: P1 and the 19A headroom fixture (fill 2 under a slab four strata up, clearance 3). Invariant: clearance 3 derives shape `solid` and `walkable === false`. Clearance 4 on P1 derives `floor`. The passage flag is false on both. Failure signature: 19B changes `head >= 4` to `head >= 5` and breaks the frozen 19A floor, or changes it to `head >= 0` and turns the 3 ft cell into a passage.

**P-GEN — generated ladder.** Setup: FX diff, sky-open cut columns only. Invariant: the feature world contains at least one sky-open cut column whose new surface fill is each of 1, 2, 3, 4, and a neighboring wall whose fill is 5. Fill 1 counts only where the host cell was solid (a carved lip), not where the host was already a one-stratum floor. Failure signature: the carver only emits full 5 ft steps, so fills 2, 3, and 4 are absent; or the default valley floor is offered as the `HEIGHT_1_OF_5` cut.

**P-LEDGE — shoulders.** Setup: a generated cut feature with at least 16 cells (4-connected sky-open cut cells). Invariant: that feature contains at least two distinct `e_floor` values. Failure signature: every cut is a flat-bottomed hole of one depth.

### D. Macro-Z drops

**D1 — Z0 → Z-1.** Setup: F0 scanner. Invariant: at least one sky-open column with `e_floor ∈ {5..9}`, `e10` air, host byte at `e_floor` solid, and `changed === false`. Log the coordinate. Failure signature: the deepest sky-open floor in the area is `e >= 10`.

**D2 — Z-1 → Z-2.** Setup: F0 scanner. Invariant: at least one sky-open column with `e_floor ∈ {0..4}`, the strata `e5..e9` air along the void, host bytes at those elevations solid. Failure signature: Z-2 air exists only under a roof (a cave) while every sky-open floor stays in Z-1, and the test that only checks "some Z-2 air" passes.

**D3 — one feature from the upper world to Z-2.** Setup: 4-connect sky-open cut cells, plus cave-graph links, into features. Invariant: one feature includes a cell whose host `S >= 0` and a voxel at `e <= 4`. The path is a chain of lateral overlaps or vertical boundary pairs, each pair checked as air. Failure signature: a column at Z-2 and a distant surface cut are reported as one feature because they share a seed, or the chain crosses a solid `e9`/`e10` pair.

**D4 — rarity shape on one seed.** Setup: F0 column classes. Invariant, pre-registered, not fit to this seed: uncut columns `>= 70%`; `count(shallow) >= 4 * count(expose Z-2)`; `count(expose Z-2) >= 1` on this seed only because D2 already required existence here. The sweep, not D4, enforces "not in every world". Failure signature: every valley (`S = 0`) is driven to `e <= 4`, so Z-2 columns outnumber shallow hill nibbles.

**D5 — coherent planform.** Setup: cut features of size `>= 9`. Invariant: fewer than half of them equal their filled bounding box; at least one feature has aspect `max(w,h) / min(w,h) >= 3` and length `>= 8`; at least one feature has bbox `<= 12` and fill ratio `>= 0.45` (compact hollow). Failure signature: the carver stamps 5×5 squares, or it stamps only 1×1 shafts.

**D6 — biome tendency, without exclusivity.** Setup: `WorldGen.cellInfo` / `geologyAt` on surface cells, priority VOLC (`stone === "basalt"` or `fields.v > 0.62`), HIGH (`granite` or `mountain` or `fields.e > 0.60`), WET (biome id prefix `swamp_`, `marsh_`, `mangrove`), ARID (`desert_*` or sandstone with `fields.r < 0.38`), TEMP (limestone remainder). A class with fewer than 512 columns is skipped and logged. Invariant: each present class has cut-cell rate `> 0` and `<= 8×` the median class rate; the area contains both an elongated feature and a compact feature; at least one class contains a feature geometry that is also present in a different class. Failure signature: cuts exist only on `desert_*`, or a class filter refuses to carve limestone at all.

### C. Caves on all five Z, cap, and anti-swiss-cheese

**C1–C5 — physical presence.** Setup: F0, one assertion per `z ∈ {2, 1, 0, -1, -2}`. Invariant: a cell at that `z` has clearance `>= 5`, overburden true, the floor voxel solid, the roof voxel solid or a Z+2 cap, and the cell is either in the FX diff or its clearance is strictly greater than the host world at the same coordinate. Log coordinates. Failure signature: Z-1 and Z-2 pass by counting legacy 4 ft floors; Z0 passes by counting cliff-mouth floors; Z+1 and Z+2 pass by counting sky `open` cells.

**C5b — Z+2 cap is inside the finite column.** Setup: the C5 cell, plus CAP5 as a control. Invariant: `hasOpaqueOverburden` is true; the supporting solid is at `e20..24` or in a Z+2-only sidecar with material, thickness `>= 1`, opacity, and HP `>= 1`; damaging that solid until it is gone makes overburden false; `z = 3` does not exist. A Z+2 cell whose five bytes are air has overburden false unless that sidecar exists and is damageable. Failure signature: `isCaveRoof = true` while all five Z+2 bytes are air and no damage API can clear it; or the roof is a full extra macro-Z.

**C5c — 4 ft under a legal cap.** Setup: CAP4. Invariant: overburden true, clearance 4, passage flag false, cap voxel is Z+2 S4 only. Failure signature: "any roofed Z+2 air is a full passage".

**C6 — cave-free columns.** Setup: F0, interior-cave definition, border excluded. Invariant: `>= 55%` of XY columns have no interior cave cell on any Z; each single Z is `< 22%` interior-cave cells. Failure signature: the threshold is lowered until the noise field fills every non-border cell (Swiss cheese). Legacy 4 ft floors are not interior caves under the `>= 5` rule, so they do not inflate this numerator. A carver that upgrades every legacy floor to 5 ft fails C6.

**C7 — ordinary traversable ground.** Setup: Z0 cells with derived `floor` or `ramp`, clearance `>= 4`, overburden false, not an interior cave. Invariant: `>= 40%` of Z0. The camp disk (`r <= 30`) stays at host `S = 0` and walkable. Failure signature: the surface is converted into chasms and mouths, and the start disk drops.

**C8 — network parts exist once.** Setup: cave graph on F0. Invariant: the graph has a degree-1 node (dead end), a degree-`>= 3` node (branch), a node with at least five cave neighbors in its 8-neighborhood (chamber), a lateral run of length `>= 6` (passage), and a node adjacent across a lateral link to a sky-open cut or surface cell (mouth). Failure signature: the graph is a single straight corridor, or "chamber" is every cave cell.

**C9 — multi-Z networks are rare inside one area.** Setup: count connected components that use at least one vertical link, versus components that do not. Invariant on the sweep sums (section 4). On F0 specifically, vertical-link components `>= 1` (the pinned world must contain one) and single-Z components are more numerous. Failure signature: every cave cell is drilled into a shaft, so the multi-Z count dominates.

### S. Overburden, breach, floating mass

**S1 — intact roof.** Setup: each C1–C5 cell, plus TRAP and CAP5. Invariant: `hasOpaqueOverburden` is true; `Floors.hasOpaqueOverburden` agrees; the true bit comes from a solid byte above the air run (in-cell mask or a higher macro-Z, or the Z+2 cap). A sky-open P1 cell is false. An open shaft from Z0 through Z-2 is false at the standing cell. Failure signature: the function returns true for every non-surface Z ("underground means roofed") or returns the generation-time flag after the bytes have changed.

**S2 — breach.** Setup: BREACH. Record roof coordinates and floor HP. `applyStrataDamage` / `applyVolumeDamage` on roof voxels only, enough to reach HP 0 (stone dig: 120 HP at resist 1). Invariant: those bytes become air; floor bytes and HP are unchanged; `hasOpaqueOverburden` on the void becomes false; a neighbor cave whose roof was not hit stays true; `levels:strataDestroyed` fires for the roof strata; no `isCaveRoof` remains true. Failure signature: overburden stays true from a cached boolean, or the damage splash (the 19A `damage_neighbour` defect) zeros the floor.

**S3 — floating mass.** Setup: F0 detector, plus FLOAT and ARCH controls in the surgical vm. Invariant: F0 reports zero unanchored natural components; FLOAT reports one; ARCH reports zero. Constructed decks (`M_BUILT`) are ignored. Failure signature: the detector requires a solid voxel directly underneath, so every cave ceiling fails; or it never runs, so FLOAT is quiet.

**S4 — in-cell gap.** Setup: TRAP. Invariant: overburden is true with nothing solid in `z + 1`. Failure signature: the in-cell mask check is gone (`overburden_no_gap`), so only the cell above can roof a cave, and a Z+2 cap stratum fails with it.

### N. Connectivity discriminator

**N1 — sealed stack.** Setup: SEAL. Invariant: both cells are interior voids, overburden is true on both, clearance is 2 on both, vertical link is false, graph has two components, `DOWN` is clear on Z0 because Z0 S0 is stone. Failure signature: `airAnywhere(z) && airAnywhere(z-1)` returns connected.

**N2 — shaft.** Setup: SHAFT. Invariant: vertical link is true; the boundary bytes Z-1 S4 and Z0 S0 are air; clearance is 6; `getStrataFluidPassage(Z0) & 8` is set; capacity of Z0 is `STRATA_TO_FLUID[2] = 3` (S0 and S1 air, S2..S4 stone), not 7. Failure signature: the shaft is claimed from a stair code while S0 stays stone, or opening the boundary is treated as deleting the whole cell (capacity 7, roof gone).

**N3 — ramp is not a shaft.** Setup: RAMP. Invariant: no vertical link at those XY (each column's `e` and `e-1` across a macro boundary is not the step); lateral air intervals overlap between neighbors; floor elevations decrease by 1 ft per step. A generated feature in F0 has a step sequence of at least three cells with `Δe_floor ∈ {1,2,3}`. Failure signature: every depth change is booked as a shaft at one XY, or a stair connector with solid strata is booked as a ramp.

**N4 — generated network.** Setup: F0 component that contains a vertical link. Invariant: every vertical edge in that component satisfies the boundary-byte rule, and the component touches at least two macro-Z values. Re-walk the published coordinates if a manifest exists; any coordinate that fails N2's byte rule fails the run. Failure signature: the manifest lists two sealed chambers.

### F. WG.00.07 fluid

**F1 — capacity ladder on carved profiles.** Setup: P5 (five air), P1, fill-3, fill-2, P4, five stone, and TRAP. Invariant: capacities `7, 6, 4, 3, 1, 0`, and TRAP is `1`. `Fluid.fluidCapacityAt` equals `getStrataFluidPassage & 7`. Failure signature: capacity follows `5 - fillOf` (TRAP returns 6) or a cave cell is hard-coded to 7.

**F2 — new passages are air.** Setup: FX voxels that flipped solid→empty. Invariant: the new byte is material `0`, not water or lava. `Fluid.depthAt` on those cells is 0 after generation. Pre-existing pool bytes (host water/lava in S1..S2) stay as they were where the diff is empty. Failure signature: the carver fills caves with `M_WATER` and also lets `Fluid` seed a depth, so the same water is stored twice.

**F3 — shaft gate.** Setup: SHAFT and SEAL. Invariant: SHAFT's upper cell has `DOWN`; SEAL's upper cell does not; neither sets `DOWN` at `z = -2`. Failure signature: `DOWN` is set for every non-solid cell, so SEAL drains through the rock slab.

**F4 — mass across a breach.** Setup: FLUID. Pour 7 water into a walled Z0 basin of five air (capacity 7). Sum depths. Destroy exactly `e10` and `e9` so the cell below can accept fluid. Step `Fluid` until the queue is idle or 20 budgets pass. Invariant: the integer sum of `depthAt` over the area is still 7; depth in the source is `<=` its new capacity; depth below is `<=` its capacity; no cell exceeds 7. Failure signature: the strata-destroyed handler zeros depth, or the duplicate mutant (`transferAmt += 1`) inflates the sum.

**F5 — partial cell does not swallow a lake.** Setup: P4 next to a capacity-7 cell holding 7 water, shared face open at S4 only. Step. Invariant: the P4 cell's depth is `<= 1`, the area sum is 7. Failure signature: `ignore_capacity` style transfer fills the 1-air cell past 1.

**F6 — ceiling cells use the frozen lateral rule.** Setup: two TRAP-like cells that share an air band, equal solid counts, and a third neighbor whose only air is S4 while the source's only air is S1 (equal solid count, disjoint bands). Invariant: volume is conserved whichever way the existing lip test moves it; the test records `fluidCanPassLaterally` and does not replace it with a cave-only solver. There is still one `Fluid` area map. Failure signature: 19B adds a second fluid volume for caves. The disjoint-band pass is the existing solid-count lip (`DEUS_Fluid.js` compares `solidFraction`, not per-stratum faces). This case records that result. It does not authorize a parallel simulator.

**F7 — carve increases capacity at runtime.** Setup: a fill-3 cell, capacity 4, holding 3 water. Destroy one solid stratum that is not holding the water up as a lip the suite still needs. Invariant: capacity becomes 6 or 7 according to the new open count, depth stays 3, sum unchanged, `levels:strataDestroyed` ran. Failure signature: the `destroy_creates_no_capacity` defect (open count frozen) so the new passage still reports the old capacity.

### R. Regressions and cost

**R1.** `node tools/test_strata_fluid_reconciliation.js` → 36 passed, 5/5 mutants exit 1.

**R2.** `node tools/test_strata_foundation.js` → 26 passed, 23/23 mutants exit 1.

**R3.** `node tools/test_liquid_depth_simulation.js` → 21 passed, 7/7 mutants exit 1.

If a baseline has moved, the suite prints the observed counts and exits 1. It does not edit the expected numbers inside the run.

**R4 — memory.** Setup: one area, five levels, after F0. Invariant: strata + connectors + shape grids stay within the 3.5 MB 19A budget, plus a Z+2 sidecar whose byte length is `<= size * size` (one extra byte per column at most, sparse maps smaller). A buffer of `size * size * 5` extra fails as a sixth plane.

**R5 — quiet frames.** Setup: A6's counter sample. Invariant: zero additional full-area scans registered on the update path. Generation cost is printed, not thresholded, except a carve that runs again on update, which fails.

---

## 3. Rule 4 Mutant Injections

Patches are exact string replacements in memory. Each must make the named assertions fail and the process exit 1. Anchors marked **seam** are lines 19B is required to leave in source so the injector can find them. Retargeting an anchor without keeping the failure is a harness break (exit 2), not a pass.

### M-LIP — shift the column by one foot

File: `DEUS_Levels.js`. Fails **B1, B2, B3, D1**.

```diff
- const levelOfElevation = e => Math.floor(e / STRATA) - 2;
+ const levelOfElevation = e => Math.ceil(e / STRATA) - 2; /* MUTANT M-LIP */
```

The blast box that should destroy `e9` and `e10` misses the pair. A carve that walks elevations through this function opens the wrong slice, so the lip floor is `e8` or the Z0 floor survives.

### M-PACK — partials inverted

**Seam** in the carver (WorldGen or Levels), required form:

```javascript
const partialFillFromS0 = k; // 1..4 solids written at S0..S(k-1)
```

```diff
- const partialFillFromS0 = k; // 1..4 solids written at S0..S(k-1)
+ const partialFillFromS0 = 5 - k; /* MUTANT M-PACK */
```

Fails **B7, M1, M2, P-GEN**. `HEIGHT_1_OF_5` and `HEIGHT_4_OF_5` exchange clearance and capacity (4 ft / cap 6 versus 1 ft / cap 1).

### M-WALK4 — 4 ft promoted to a passage

**Seam:**

```javascript
const CAVE_PASSAGE_MIN_FT = 5; // 4 ft is low clearance
```

```diff
- const CAVE_PASSAGE_MIN_FT = 5; // 4 ft is low clearance
+ const CAVE_PASSAGE_MIN_FT = 4; /* MUTANT M-WALK4 */
```

Fails **M1, C5c, C6**. Every legacy underground floor and every P1 shelf becomes a standard passage. Cave-free columns collapse.

### M-COUNTFLOOR — clearance includes the floor

**Seam** inside `continuousAirHeight`, the loop must start at `eFloor + 1`:

```javascript
for (let e = eFloor + 1; e <= 24; e++) {
```

```diff
- for (let e = eFloor + 1; e <= 24; e++) {
+ for (let e = eFloor; e <= 24; e++) { /* MUTANT M-COUNTFLOOR */
```

Fails **M1, M4**. P1 reports 5. M5 reports 6. The 4 / 5 / 6 split is gone.

### M-ISOLATED — air run stops at the macro-Z wall

**Seam:**

```javascript
const AIR_RUN_CROSSES_MACRO_Z = true;
```

```diff
- const AIR_RUN_CROSSES_MACRO_Z = true;
+ const AIR_RUN_CROSSES_MACRO_Z = false; /* MUTANT M-ISOLATED */
```

The function returns when `s` would advance past 4. Fails **M4** (M6 reports 4 or 2) and **N2** (shaft clearance stays inside one cell).

### M-FILLCAP — capacity uses the prefix

File: `DEUS_Levels.js`, inside `getStrataFluidPassage`. Fails **M3, F1, F7**.

```diff
- const open = STRATA - (SOLID_B[rdM[rdO]] + SOLID_B[rdM[rdO + 1]] + SOLID_B[rdM[rdO + 2]] + SOLID_B[rdM[rdO + 3]] + SOLID_B[rdM[rdO + 4]]);
+ const open = STRATA - fillOf(rdM, rdO); /* MUTANT M-FILLCAP */
```

TRAP (`fillOf = 1`, one air stratum, three solids above) reports capacity 6.

### M-ROOFBOOL — cached roof

**Seam** at the start of `hasOpaqueOverburden`, after the world-bounds check:

```javascript
/* roof is strata */
```

```diff
- /* roof is strata */
+ if (qRoofFlag && qRoofFlag[qI]) return true; /* MUTANT M-ROOFBOOL */
```

The carver sets `qRoofFlag` on cave cells and never clears it. Fails **S2**: after the roof bytes are air, overburden stays true. Also fails **S1** on OPEN-Z1 if the flag was set for every cut.

### M-NOINCELL — Z+2 cap ignored

File: `DEUS_Levels.js`. Fails **S4, C5b, CAP5**.

```diff
- if (f < STRATA && (solidMaskOf(rdM, rdO) >> f) !== 0) return true;
+ /* MUTANT M-NOINCELL */
```

A cap that is the top of the same cell stops counting. Higher macro-Z roofs still count, so a Z0 cave under Z+1 rock can stay green while Z+2 fails. That split is the point.

### M-Z3 — sixth plane

**Seam** in the Z+2 cap writer:

```javascript
const CAP_Z = 2; // cap lives at macro-Z +2 only
```

```diff
- const CAP_Z = 2; // cap lives at macro-Z +2 only
+ const CAP_Z = 3; /* MUTANT M-Z3 */
```

Fails **B6, C5b, R4**. A level key `"3"` or an elevation `>= 25` appears.

### M-NEGZ — caves only under the surface

**Seam:**

```javascript
const CAVE_Z = [-2, -1, 0, 1, 2];
```

```diff
- const CAVE_Z = [-2, -1, 0, 1, 2];
+ const CAVE_Z = [-2, -1]; /* MUTANT M-NEGZ */
```

Fails **C1, C2, C3** (Z+2, Z+1, Z0). Z-1 and Z-2 can still look occupied. The `>= 5` oracle keeps legacy 4 ft floors from hiding this on the negative levels too, if the mutant also skips the clearance deepen.

### M-NODEEP — clamp the sky-open floor

**Seam:**

```javascript
const MAX_CUT_DEPTH_FT = 24;
```

```diff
- const MAX_CUT_DEPTH_FT = 24;
+ const MAX_CUT_DEPTH_FT = 0; /* MUTANT M-NODEEP */
```

With the host floor left intact. Fails **D1, D2, D3, P-GEN**.

### M-ALLDEEP — every hill and valley goes to Z-2

**Seam:**

```javascript
const MAX_CUT_DEPTH_FT = 24;
```

Use a second mutant name `M-ALLDEEP` on a copy of the depth chooser:

```diff
- depthFt = chooseCutDepthFt(seed, x, y);
+ depthFt = 16; /* MUTANT M-ALLDEEP */
```

Fails **D4, C7**, and the sweep ratios in section 4. Shallow count falls to 0. Most `S = 0` columns land on `e_floor <= 4` (`e_host 10 - 16`, clamped at 0).

### M-SWISS — carve every interior cell

**Seam:**

```javascript
const CAVE_KEEP_OUTSIDE = 0.55;
```

```diff
- const CAVE_KEEP_OUTSIDE = 0.55;
+ const CAVE_KEEP_OUTSIDE = 0; /* MUTANT M-SWISS */
```

The pass marks every non-border cell as a `>= 5` ft void. Fails **C6, C7**.

### M-STACK — same XY means connected

**Seam:**

```javascript
function caveVerticallyConnected(upper, lower) {
    return upper.s0Air && lower.s4Air;
}
```

```diff
- return upper.s0Air && lower.s4Air;
+ return upper.anyAir && lower.anyAir; /* MUTANT M-STACK */
```

Fails **N1**. SEAL becomes one component. **N2** stays green, which is why N1 exists.

### M-STAIRSHAFT — connector stands in for air

**Seam:**

```javascript
const SHAFT_REQUIRES_AIR_PAIR = true;
```

```diff
- const SHAFT_REQUIRES_AIR_PAIR = true;
+ const SHAFT_REQUIRES_AIR_PAIR = false; /* MUTANT M-STAIRSHAFT */
```

A `stairDown` / `stairUp` code counts as a vertical link. Fails **N2** and **N4** wherever the only "shaft" is a legacy cliff stair with solid S0.

### M-FLOAT — leave a suspended voxel

**Seam** at the end of the natural-mass pass:

```javascript
/* anchored mass only */
```

```diff
- /* anchored mass only */
+ writeNaturalSolid(size >> 1, size >> 1, 1, 4); /* MUTANT M-FLOAT */
```

`writeNaturalSolid` sets one stone byte at mid-map Z+1 S4 and air in its six neighbors. Fails **S3**.

### M-DELFLUID — carving deletes the volume

File: `DEUS_Fluid.js`, in the `levels:strataDestroyed` / geometry handler, the branch that currently keeps depth and displaces overflow.

```diff
- // Displace excess fluid into open neighbor or cell above to preserve mass conservation
+ gridZ[idx] = 0; /* MUTANT M-DELFLUID */
```

Fails **F4, F7**. The sum drops to 0 when the lip is mined. This mutant is independent of the five WG.00.07 mutants; R1 still runs those five on an unpatched tree.

### M-SQUARE — axis-aligned flat holes only

**Seam:**

```javascript
const CUT_COHERENCE = "shoulders-bends-taper";
```

```diff
- const CUT_COHERENCE = "shoulders-bends-taper";
+ const CUT_COHERENCE = "rect"; /* MUTANT M-SQUARE */
```

The carver emits 8×8 rectangles of a single `e_floor`. Fails **D5, P-LEDGE**.

### M-RANDOM — non-deterministic carve

**Seam:**

```javascript
const carveRand = (...p) => hash32(seed, salt, ...p) / 4294967296;
```

```diff
- const carveRand = (...p) => hash32(seed, salt, ...p) / 4294967296;
+ const carveRand = () => Math.random(); /* MUTANT M-RANDOM */
```

Fails **A1**.

### M-SKIP — the whole pass gone

**Seam:**

```javascript
if (global.__DEUS_SKIP_CUTS_CAVES) { /* host oracle */ }
```

is the legal skip. The mutant forces the skip always:

```diff
- if (global.__DEUS_SKIP_CUTS_CAVES) {
+ if (global.__DEUS_SKIP_CUTS_CAVES || true) { /* MUTANT M-SKIP */
```

Fails **D1–D3, C1–C5, P-GEN, N4**. Host and feature bytes match. This is the incomplete-implementation control.

### Mutant scoreboard

| Mutant | Must fail (at least) |
|---|---|
| M-LIP | B1 B2 B3 D1 |
| M-PACK | B7 M1 M2 P-GEN |
| M-WALK4 | M1 C5c C6 |
| M-COUNTFLOOR | M1 M4 |
| M-ISOLATED | M4 N2 |
| M-FILLCAP | M3 F1 F7 |
| M-ROOFBOOL | S2 |
| M-NOINCELL | S4 C5b |
| M-Z3 | B6 C5b R4 |
| M-NEGZ | C1 C2 C3 |
| M-NODEEP | D1 D2 D3 P-GEN |
| M-ALLDEEP | D4 C7 sweep |
| M-SWISS | C6 C7 |
| M-STACK | N1 |
| M-STAIRSHAFT | N2 N4 |
| M-FLOAT | S3 |
| M-DELFLUID | F4 F7 |
| M-SQUARE | D5 P-LEDGE |
| M-RANDOM | A1 |
| M-SKIP | D1 D2 D3 C1–C5 P-GEN N4 |

Twenty mutants. A green suite that cannot name a failing assertion for one of these is incomplete. Run them one at a time. Do not combine.

---

## 4. Seed-Sweep Protocol

### Seed lists (fixed before any 19B run)

World salt `20260923` is the pinned seed (F0). It is included in the sweep and also scored alone so a rare Z-2 cut cannot hide in an average.

- **Sweep A (tuning-forbidden):** `seed(i) = (20260923 + i * 997) >>> 0` for `i = 0..31`.
- **Sweep B (held out):** `seed(i) = (20260923 + 50000 + i * 997) >>> 0` for `i = 0..15`.
- One area, `(0,0)`, host vm and feature vm each. No other areas in the statistical claim.
- Thresholds below are the contract. They are not refit if Sweep A misses them. Sweep B uses the same numbers. A pass on A and a fail on B exits 1.

### Per seed, record

Uncut fraction, shallow count, one-macro count, expose-Z-1 count, expose-Z-2 count, partial-fill sky-open counts for k = 1..4 (k = 1 only where the host cell was solid), interior-cave fraction per Z, cave-free column fraction, Z0 ordinary-traversable fraction, single-Z cave components, multi-Z components, floating-component count, generation milliseconds, sidecar bytes.

A column class uses the host grid from that seed's H0 vm, not the feature world's rewritten surface.

### Assertions on each sweep

Let sums and means be over the 32 (or 16) seeds.

| Check | Contract |
|---|---|
| Existence is not the mean | Pinned seed alone has `≥ 1` Z-1 exposure, `≥ 1` Z-2 exposure, `≥ 1` traced feature to `e ≤ 4`, and `≥ 1` interior cave on each of the five Z. Sweep seeds may lack a Z-2 cut. |
| Not every world | Sweep A: `≥ 8` of 32 seeds have zero expose-Z-2 columns. Sweep B: `≥ 4` of 16. |
| Shallow dominates deep | `sum(shallow) ≥ 8 * sum(expose Z-2)` and `sum(shallow) > sum(expose Z-1)`. |
| Order of the means | `mean(shallow) > mean(one macro) > mean(expose Z-1) > mean(expose Z-2)`. |
| Uncut ground | Every seed: uncut fraction `≥ 0.70`. |
| Partials actually occur | Every seed whose host grid has `≥ 100` cells with `S ≥ 1` has each of fills 2, 3, and 4 on a sky-open cut. Fill 1 as a carved lip appears at least once in the sweep. |
| Anti-Swiss | Every seed: cave-free columns `≥ 0.55`, each Z `< 0.22` interior cave, Z0 traversable ordinary `≥ 0.40`. |
| Multi-Z rarity | `sum(single-Z components) ≥ 3 * sum(multi-Z components)`, and the pinned seed has `≥ 1` multi-Z component. |
| Islands | Every seed: floating natural components `= 0`. |
| Determinism spot check | Seeds `i = 0` and `i = 17` of Sweep A are generated twice. Column hashes match. |
| Held-out | Sweep B must meet the same inequalities. Publishing coordinates from Sweep B and then loosening A is a fail. |

### What a fail looks like in the log

The runner prints one line per seed:

```text
SEED 20260923 uncut 0.81 shallow 1400 macro 90 z-1 40 z-2 3 caves +2/+1/0/-1/-2 = 12/40/80/100/70 free 0.74 walk 0.62 multiZ 2 float 0
```

Then the sums, then `FAIL D4-ratio shallow 100 z-2 90` or `PASS sweep-A`. A mutant run prints the mutant name in the header and must show a `FAIL` line. `M-ALLDEEP` drops shallow and pushes `z-2` to the tens of thousands. `M-NODEEP` prints `z-1 0 z-2 0` and fails the pinned existence lines. `M-SWISS` prints `free` below 0.55.

### Cost bound for the sweep itself

32 seeds × 2 vms × one 256² area × 25 bytes is a generation test, not a frame test. The harness prints wall time. It does not start a second sweep in parallel inside the same process (the levels baseline cache is world-state keyed; two worlds in one vm alias `baseSlots`). One vm per world, disposed after the hash is taken.

### Regression gate, same command session

After Sweep A is green and no mutant is selected:

```powershell
node tools/test_strata_foundation.js
node tools/test_strata_fluid_reconciliation.js
node tools/test_liquid_depth_simulation.js
node tools/test_strata_cuts_and_caves.js --seed=20260923
node tools/test_strata_cuts_and_caves.js --sweep
```

Expected legacy baselines remain 26/23, 36/5, and 21/7. The new file's own scoreboard is the assertions in this plan plus 20/20 mutants exiting 1. A mutant that exits 0 is a broken test. A missing anchor exits 2 and does not count as a detection.