# GROK-19B-RISK-REVIEW

Read-only review of `docs/handoffs/HANDOFF_DEUS_TSK_FABLE_19B_CUTS_CAVES.md` against the frozen strata authority in `game/js/plugins/DEUS_Levels.js` and the column/fluid consumers in `game/js/plugins/DEUS_WorldGen.js`, `DEUS_Fluid.js`, `DEUS_World.js`, and `DEUS_Floors.js`. No files were modified.

Repository facts that every failure mode below hangs on:

- A column is 25 strata. Elevation is `e = (z + 2) * 5 + s`, with `s` in `0..4` bottom to top. Z0 S0 is e=10 and sits on Z-1 S4 (e=9). Z-1 S0 is e=5 and sits on Z-2 S4 (e=4). The top of the world is Z+2 S4 (e=24). There is no Z+3.
- `fillOf` / `heightStateAt` count only the solid prefix from S0. `HEIGHT_k_OF_5` means k bottom-packed solid strata, not “a cut k strata deep.”
- `toStrata` can only emit fills 0, 1 (floor/stairs), 3 (ramp), and 5 (solid). `HEIGHT_2_OF_5` and `HEIGHT_4_OF_5` cannot be represented as shape codes.
- `derivePacked` classifies a standing surface as `floor` once it sees 4 non-solid strata of headroom, then stops. At Z+2, air that reaches S4 is forced to headroom 10 (`head = STRATA * 2`) without reading a cap.
- `standaloneInto`, which the foundation checksum uses, collapses every fill 1..4 with no connector to `floor`. It never sees headroom, roofs, or 2-vs-4.
- Macro surface `S ∈ {0,1,2}` (`surfaceElevation`, `surfaceGrid`, `surfaceElevationAt`) is a second authority. It does not read strata. `columnReader.under` and object anchoring follow `S`.
- `getStrataFluidPassage` capacity is `STRATA_TO_FLUID[open] = [0, 1, 3, 4, 6, 7]`. Down requires this cell’s S0 open and the cell below’s S4 open. Up is forced on at Z+2 whenever S4 is open. Lateral lips in `fluidCanPassLaterally` use `round(solidFraction * 5)`, which equals floor height only while rock is bottom-packed.
- Live generator constant is `GEN = 4`. The `gen >= 4` baseline is shared. There is no generator-5 branch in `generateBaseline`. `test_strata_foundation.js` check `generation_deterministic` compares live checksums to the pre-strata plugin.

## 1. Executive Risk Matrix

| Risk | Severity | Likelihood | Root mechanism |
|---|---|---|---|
| Partial heights faked with shape codes; 2/5 and 4/5 never exist, or exist only as checksum-invisible prefix tweaks | Critical | High | `toStrata` / `recordFromPacked` quantize to fills {0, 1, 3, 5}. `standaloneInto` maps fills 1..4 to `floor`. |
| Cut depth measured from S4 of the macro cell, so valley floors (rock only at S0) are no-op “cuts” | Critical | High | Surface cells at `z === S` are already `HEIGHT_1` (S0 solid, S1–S4 air). Clearing S4 clears air. |
| Cross-Z shelf: one side of a boundary pair stays solid (Z0 S0 or Z-1 S4; Z-1 S0 or Z-2 S4) | Critical | High | Elevations are adjacent only as those pairs. Shape `open` on the upper cell still stands on a solid S4 below. |
| `continuousAirHeight` copies `derivePacked` and saturates at 4, treats non-solid (water/lava) as air, or inherits the Z+2 sky shortcut | Critical | High | Headroom loop stops at `head >= 4`. `SOLID_B` is 0 for fluids. Z+2 sets `head = 10` when air reaches S4. |
| 4 ft void reported as a full walkable cave because derived shape is `floor` | Critical | High | Fill 1 + 4 air yields `head >= 4` → `floor`. `standableShape` is true. Clearance is still 4 ft. |
| Z+2 cap stored beside the strata (flag, extra level, new material id) | Critical | High | `hasOpaqueOverburden`, damage, and fluid Up read material bytes only. Unknown material ids are non-solid. |
| Cap written onto ordinary Z+2 sky cells, or written at S3 with S4 left air | Critical | Medium | Sky shortcut plus Up-at-Z+2. A cap at S4 over a `HEIGHT_1` surface leaves 3 ft of air and `derivePacked` returns `solid`. |
| Hill floor left floating when the solid column under `S` is carved | Critical | High | For `S = 2`, Z+2 is a 1-stratum floor over solid Z+1 and Z0. Carving Z0/Z+1 without clearing Z+2 S0 disconnects that slab. |
| Stacked chambers that share XY counted as one multi-Z cave | Critical | High | Z-1 and Z-2 caves are independent noise (`uf.levels.v3.${z}`). A solid diaphragm at the boundary still leaves both cells non-`solid` as shapes. |
| Connectivity taken from ramps/stairs or the pathfinder | High | High | A ramp is fill 3 plus a connector. Pathing steps a whole macro-Z (`curShape === 4`). It does not test air adjacency. `open` is not enterable. |
| Deep cuts sampled from low-frequency noise, producing rare but huge canyons | High | Medium | `valueNoise` is spatially correlated. A high threshold still floods a region once it crosses. |
| Carves applied by mutating another level’s cached baseline, or by `setStrata` after generation | Critical | High | `baseline()` is memoized and evicted (keep 12). Regeneration does not replay foreign mutations. `setStrata` writes save deltas and emits fluid events. |
| Generator bumped or geometry changed so `generation_deterministic` fails, or checksums stay green while derived shapes change | Critical | High | Checksums use `standaloneInto`, not `derivePacked`. Live `L.GEN` is compared to the pre-strata plugin. Old saves keep `levels[z].gen`. |
| New roofs break fluid lips; excess volume dropped; water bytes double-counted with the 0..7 grid | High | High | Lip height is total solid count, not the S0 prefix. `reconcileCellWithStrata` discards excess that cannot move. Baseline pools also write `M_WATER` into S1–S2. |
| Start disk `dist <= 30` carved, or macro `S` left stale so objects and `columnReader` ignore the cut | High | Medium | `surfaceElevation` forces `S = 0` inside r ≤ 30. `surfaceElevationAt` never reads strata. `under()` is `S >= 1`. |
| Module scratch (`rdM`, `qZ`, `cellQuery`) clobbered by a nested adapter inside the new query | High | Medium | `locate` / `cellQuery` keep one global cursor. Nested `surfaceHeightAt` / `hasOpaqueOverburden` overwrite it. |

## 2. Detailed Analysis of the 10 Failure Modes

### 1. Partial-height cuts (1/5..5/5)

`HEIGHT_k_OF_5` is the solid prefix length, not the depth removed.

| State | Bytes from S0 | What a surface cut actually is |
|---|---|---|
| `HEIGHT_5_OF_5` | five solid | Uncut column cell (`z < S`) |
| `HEIGHT_4_OF_5` | S0–S3 solid, S4 air | 1 ft removed from a solid cell |
| `HEIGHT_3_OF_5` | S0–S2 solid | Same profile as today’s ramp body |
| `HEIGHT_2_OF_5` | S0–S1 solid | Not representable by any current shape |
| `HEIGHT_1_OF_5` | S0 solid | Today’s floor, stair, and hilltop |
| `HEIGHT_0_OF_5` | no solid prefix | Open, or a roof with air at S0 |

Today’s hilltop is already `HEIGHT_1`. The rock is S0. S1–S4 are air. An implementer who “cuts the top stratum” by clearing S4 changes nothing. Real relief on a valley floor has to remove S0 and then continue into Z-1 S4. Real relief on a hill has to start from the solid cell at `z = S - 1`, whose S4 is the top of that macro cell, and also delete the old floor cell above it.

`derivePacked` then mislabels the result whenever the new prefix is used as a ramp:

- The connector is honored before headroom. Fill 4 with a leftover ramp nibble still derives as `ramp`.
- Fill 5 is returned as `solid` before the connector is read. A ramp nibble on a full cell is invisible.
- `setStrata` keeps the existing connector when `connector` is omitted. Carving a former ramp without writing `connector: 0` leaves the nibble.
- Connectors are packed two cells per byte (`conn[i >> 1]`, 4-bit shift). A byte write on one cell wipes the neighbor. `|=` merges ramp with stair into a value outside `4..7`. `standableShape` treats any code `>= 4` as standable, so a corrupt nibble is walkable and is not a ramp to the pathfinder (`curShape === 4` only).

Ramp means a macro-Z step in `DEUS_World.js` (`curShape === 4` steps to `z + 1` on an orthogonal neighbor). A 1 ft terrace that stamps `ramp` becomes a link into the next level, including into solid rock or open sky. Intra-cell steps have to stay connector-free floors. Both ends derive `floor` if the sky supplies headroom, and the pathfinder will walk a 3 ft stratum step with no height check. That is the current walker. 19B does not fix it by overloading `ramp`.

`solidFraction` counts every solid bit. `heightStateAt` counts the prefix. A cave roof (S0–S2 air, S3–S4 solid) is `HEIGHT_0_OF_5` with fraction 0.4. A test that accepts `solidFraction >= 0.2` as “a partial cut” will count roofs, arches, and real terraces as the same population.

Headroom on a real terrace: a `HEIGHT_2` cell under open sky looks upward, reaches 4, and derives `floor`. The same `HEIGHT_2` under a solid S0 above derives `solid` (3 ft of air in-cell, blocked immediately above). Both have the same `heightStateAt`. Acceptance has to record prefix, derived shape, and the cell above, or the suite will bless unwalkable pockets as terraces.

### 2. Cross-Z carving and phantom shelves

These pairs are one continuous foot:

| Cut | Must both be air | Elevations |
|---|---|---|
| Z0 → Z-1 | Z0 S0 and Z-1 S4 | 10 and 9 |
| Z-1 → Z-2 | Z-1 S0 and Z-2 S4 | 5 and 4 |
| Z+1 → Z0 | Z+1 S0 and Z0 S4 | 15 and 14 |
| Z+2 → Z+1 | Z+2 S0 and Z+1 S4 | 20 and 19 |

`derivePacked`, when fill is 0, adopts the cell below’s S4 as the floor. Setting the upper cell to all air while leaving the lower S4 solid does not open the lower level. It produces a floor on the boundary, and `getStrataFluidPassage` does not set Down. The shelf is one foot thick and invisible to any test that only checks “upper shape is not solid.”

The same phantom appears if the lower S4 is carved and the upper S0 is left solid. Down stays clear. `continuousAirHeight` stops. A query that sums “air strata in Z0” plus “air strata in Z-1” reports a multi-Z void the rock still divides.

Generation order makes this likely. `generateBaseline` builds one Z at a time. Z≥0 uses the macro column. Z<0 uses a separate cave field. Nothing in that function writes both sides of a boundary together. The safe construction is a pure 25-strata column function of `(seed, gx, gy)` that each level slices into its own five bytes. The unsafe one is `generateBaseline(0)` calling `baseline(-1)` and poking `strata.m`. That cache entry is keyed only by seed, gen, z, and area. Eviction regenerates Z-1 from `generateBaseline` and the poke is gone. Whichever level is built first wins, so the world depends on visit order.

Existing cliff mouths are not Z0→Z-1 exposure. They set shape `floor` / `stairDown` on Z0 and `stairUp` on Z-1, which `toStrata` turns into S0 plus a connector. The boundary pair stays solid on the Z0 side. A regression seed that cites those mouth coordinates has not demonstrated a strata cut.

### 3. `continuousAirHeight`: 4 ft, 5 ft, and >5 ft

The physical quantity is the number of **air** strata (`material byte === 0`) strictly above the standing surface, walking `e` upward until a solid or fluid byte, or until the column opens through Z+2 S4 into the unmodeled sky.

Standing surface is `worldStrataElevationAt`: top of the S0 prefix, or the cell below’s S4 when the prefix is empty. Clearance starts at the next elevation. Inclusive subtraction of the two endpoints (`lastAir - floorE + 1`) reports 5 for a 4 ft gap.

Concrete fixtures the query has to separate:

| Fixture | Air above the floor | Required result |
|---|---|---|
| S0 solid, S1–S4 air, Z+1 S0 solid | 4 | 4. Derived shape will still be `floor`. That must not be rewritten as 5 or as “full passage.” |
| S0 solid, S1–S4 air, Z+1 S0 air, Z+1 S1 solid | 5 | 5 |
| Those 5 plus another air stratum | 6 or more | The exact count, not “at least 4” |
| Same gap filled with `M_WATER` / `M_LAVA` | 0 air | 0. `SOLID_B` is 0 for both fluids, so a headroom loop copied from `derivePacked` counts them as clearance. |
| Z+2 surface, S0 solid, S1–S4 air, no cap | open sky | A documented unbounded sentinel |
| Z+2 cave, floor then air, S4 stone | finite, usually ≤ 4 inside this cell | The finite count. `head = STRATA * 2` must not run before the S4 test. |

`derivePacked` stops once `head >= 4` and, on Z+2, substitutes 10 as soon as air reaches the top of the cell. Either shortcut makes 4, 5, 6, and open sky indistinguishable. A cached clearance invalidated only by `refreshPacked` (±1 Z) goes stale when a breach at Z-2 extends a void that started at Z0.

Nested calls are unsafe. `surfaceHeightAt`, `hasOpaqueOverburden`, and `cellQuery` all overwrite `rdM`, `rdO`, `qZ`, and `qI`. A scan that calls an adapter in the middle of a column and then reads `rdM[rdO + s]` is reading the adapter’s cell.

19B is required to expose clearance only. A helper that returns true for “upright walkable” at 4 ft fails the task even if the foot count is stored beside it. Creature heights stay out of this change.

### 4. Cave roof overburden and roof breach

`hasOpaqueOverburden` is already a live mask, not a flag:

- Solid bits above the S0 prefix in this cell count.
- Any solid bit in each cell above, through Z+2, counts.
- A fully solid cell (`fill === 5`) reports false, because the query cell is the rock. Probe the void under the roof, not the roof cell.
- Fill 0 with any solid remaining in the cell reports true. A breached cap that leaves one upper stratum solid is still a roof. Breach means every solid bit above the void is now `M_AIR`.
- Damage already does this. `damageStratum` at HP 0 writes `M_AIR` and HP 0 through `writeCell`. The next `hasOpaqueOverburden` sees the bytes. No `isCaveRoof` bit is required, and a bit that is not cleared by `applyStrataDamage` will disagree with the query.

`UF.Floors.isRoofed` is the wrong oracle. After the strata query it still returns true for an enclosed room, and on Z0 that path can call `applyRoofedUpperDeck` and **write** a deck. Acceptance calls `UF.Levels.hasOpaqueOverburden` only.

Opacity in this table is solidity. Air, water, and lava are not overburden. A new “roof” material id outside `STRATA_MATERIALS` (ids 0..5) has `SOLID_B === 0`, so the query ignores it, `setStrata` rejects it, and a saved record that contains it is skipped on load.

The pre-strata roof rule (`z < 0` is roofed) is gone. A Z-1 chamber whose Z0 crust has been removed must report false. A chamber under an intact hill (Z0 still solid) must report true. Those two columns are the regression pair.

### 5. Z+2 ceiling cap

The cap is one or more top strata of a Z+2 cell that actually has a cave under it, written as ordinary stone (or the host rock) in `strata.m`. Thickness is how many of S4, S3, … are solid. HP is the implicit baseline 255 until damage copies the cell into an 11-byte delta. Support is the existing `effectiveSupport` sum. Exposure is `hasOpaqueOverburden` from the void. Nothing else should exist: no `z = 3`, no elevation 25, no parallel `ceilingCaps[]`.

Failure shapes:

- Cap on every Z+2 cell. Today a hilltop at Z+2 is S0 solid and S1–S4 air, and it is the walkable surface. Filling S4 makes in-cell headroom 3, `derivePacked` returns `solid`, and the entire upland becomes impassable. Checksums can still say `floor`, because `standaloneInto` ignores the cap bits above the prefix.
- Cap at S3 with S4 left air. The sky shortcut and the fluid Up bit (`qZ === 2 && S4 open`) both treat the cell as open sky. Fluid and sight leak through the 1 ft gap above the “roof.”
- Cap only in metadata. Mining never clears it, and `hasOpaqueOverburden` stays false, so the cave reads as open sky.
- Walkable 5 ft room entirely inside one capped Z+2 cell. Five strata cannot hold a floor, 5 ft of air, and a 1 ft cap. The extra feet have to come from air in Z+1, with Z+2 S0–S3 air and S4 solid. That carve changes Z+1’s legacy shape from `solid` to a shorter prefix and will move the non-ground checksum.

A mouth is a deliberate hole in that lid: those cells keep S4 air, and their side-neighbors that are still cave must be solid at the strata that would otherwise connect to sky. `fluidCanPassLaterally` does not use the passage `SIDE` bit; it uses capacity and solid count. A lid that is only S4, with S0–S3 air connecting to an all-air neighbor, spills volume sideways onto the surface.

### 6. Disconnected floating terrain

Legitimate overhangs are face-connected to surrounding rock. The illegal case is a solid component that never touches anchored mass. “Solid directly below” is the wrong test: it condemns every cave ceiling, arch, and ledge.

Anchor test that matches the handoff:

- Vertex = one solid stratum.
- Edge = a shared face at the same elevation: ±1 stratum in the column (including Z S0 against (Z-1) S4), or the same stratum index in an orthogonal XY neighbor.
- Diagonal and “both cells contain some solid” links are not edges. A ceiling corner-touching a floor would look supported and is not.
- A component is grounded when it reaches the area’s solid border ring, or rock that itself reaches that ring. Running the flood per macro-Z only will flag a ceiling that is held by the Z above, and will miss a pillar that is stacked across Z and loose in XY.

The current column creates a specific floating slab as soon as a deep cut is naive:

- `S = 2`: Z+2 is `HEIGHT_1` soil, Z+1 is five solid, Z0 is five solid.
- Carving Z0 and Z+1 to air and leaving Z+2 S0 yields a 1 ft soil sheet with air under it.
- Carving only Z0 under a solid Z+1 yields the same kind of sheet one level down.

Macro `S` will still say 2. `columnReader.under` will still paint the cell as carved rock (`S >= 1`) even when the derived shape is `open`. `surfaceElevationAt`, which places surface objects, will keep planting them on the pre-cut level. The strata can be physically anchored while the props hover, or the reverse.

`columnReader.solid` is “derived shape code === 1”, not “any solid stratum.” A `HEIGHT_4` terrace under open sky derives `floor` and will not draw a cliff. A `HEIGHT_4` pocket that fails the 4 ft headroom test derives `solid` and draws `peak_rock`. Same prefix, opposite rendering, depending on the cell above.

### 7. Coherent multi-Z cave connectivity

Two air strata are connected when they share a face on the elevation scale and both bytes are air. A network is one connected component of that graph, plus its mouths. Chambers that share an XY and are separated by any solid boundary stratum are two networks.

Current underground generation will produce a large false-positive set. Z-1 and Z-2 each carve their own halls with `hashString("uf.levels.v3." + z)`. Overlap in XY is common. The Z-1 floor profile keeps S0 solid, so the Z-1/Z-2 boundary is closed. A test of “both macro cells are `floor`” reports a link. A test of `continuousAirHeight` across that boundary reports a stop.

Further false links:

- Legacy cliff stairs and surface ramps. The pathfinder crosses Z. The air graph does not.
- A ramp body is only S3–S4 air. It is not a shaft.
- `open` is not enterable (`shape` must be 2 or ≥ 4). A true shaft derives `open` on the upper cell and is a physical connection that units do not walk. Scoring connectivity with `planPath` misses shafts and accepts stairs.
- Summing air counts in a column without a lateral component test. A one-column pothole is not a network that “connects” two cave systems.

The existing Z-1 mouth digger also searches the whole map for the nearest floor and stamps a corridor. Copying that for multi-Z links will join unrelated chambers with a straight gallery and will dominate generation time. A coherent link is a shaft or ramp whose air (or legal connector, for walk links only) actually touches both components.

### 8. Deep-cut rarity

Desired distribution, measured on generated columns, not on a hand-placed fixture:

- Common: prefix changes of 1–4 strata that stay inside one macro-Z.
- Less common: a cut that crosses exactly one boundary pair.
- Uncommon: sky or walkable surface looking into Z-1 rock.
- Rare and present: a traceable feature whose air reaches Z-2.

`surfaceElevation` only returns 0, 1, or 2, and inside `hypot(lx - mid, ly - mid) <= 30` it returns 0 always. Nothing in the current generator exposes Z-2 to the sky. Z-2’s own caves are not exposures.

The Grand Canyon failure is a smooth noise field with a rare threshold. `valueNoise` is correlated at the scale passed in. Once a region crosses 0.98, the deep band is a blob hundreds of cells wide. Cell-count ratios then say “deep cuts dominate” even if the roll was rare, or a feature-count ratio says “only one deep feature” while that feature is a quarter of the map. Gemini’s statistic has to include feature count, median feature area, and max feature area, with shallow area much larger than Z-2 area.

The opposite failure is a camp-safe implementation that never places the regression feature inside the tested window, or a special case `if (seed === N) digChasm(x, y)`. The feature has to fall out of the same function that carves every other seed. The start disk stays at macro `S = 0` and keeps its kit floor: the volumetric camp invariant and the founders’ kit both assume that disk is uncut. Deep samples belong outside r ≈ 36.

Biome tendencies (karst, arroyo, fault, peat hollow, lava-tube collapse) are weights. A seed that is entirely `TEMP` must still be able to contain a non-limestone cut at low probability, and an arid seed must not be forced into a canyon. Exclusivity rules fail the “tendencies, not laws” clause and make the rarity histogram a biome histogram.

### 9. Determinism and seed invariance

The stable primitives are `hash32` / `unit4` / `valueNoise(seed, salt, gx, gy, scale, wrapW, wrapH)` and `mulberry32(hash32(...))` with a **new** salt. `unit()` does not consume a stream. `mulberry32` does. Appending cuts to the kit’s mulberry stream moves every kit object. Reusing `SALT.kit`, `SALT.geology`, or `uf.levels.v3.${z}` shifts existing caves and ores.

Order hazards that change the hash stream or the bytes:

- Iterating `Map`/`Set` entries whose insertion order depends on which level was visited first.
- Sorting candidates by noise without a stable tie-break (`id`, then `x`, then `y`).
- `Math.random`, `Date.now`, or frame number inside the carve.
- Reading `baseline(otherZ)` during `generateBaseline` and writing into it (section 2).
- Emitting `levels:strataChanged` during generation. `DEUS_Fluid` listens and runs `reconcileCellWithStrata`. If any fluid is already queued, generation order changes volume placement.
- Storing the carve only as `setStrata` deltas. The baseline checksum misses it; the save grows by 22 hex digits per cell; a later baseline tweak no longer matches `sameAsBaseline`, so the delta and the seed disagree.

Cache hazards already in the file:

- `baselines` keeps 12 entries, keyed `seed:gen:z:ax,ay:size:areas`. Pure generation is safe. In-place edits are not.
- `surfaceGrids` is keyed `seed:ax,ay:size:widthxheight` and then compared with `e.cl === cl`. Generator version is not in the key. A gen-4 grid and a later gen share heights. That is harmless only while `surfaceElevation` stays gen-independent.
- `corner()` memoizes per process. The value is `unit4`, so a cache hit is the same number. The key `(iy + 64) * 65536 + (ix + 64)` collides if a lattice index spans 65536. World-scale indexes with a small scale stay inside that range today. A cut that passes unwrapped indexes into `corner` will silently alias noise.

Save compatibility: `levelGen` uses the gen stored on the save when present. Old worlds must keep the gen-4 `generateBaseline` byte-identical. New worlds stamp a new gen. Editing the gen-4 branch in place rewrites every existing save’s regenerated ground and caves. The foundation check `generation_deterministic` compares the **live** gen’s checksum to the pre-strata plugin, and for Z≠0 that checksum is `standaloneInto` (shape, material, water, biome). Two honest outcomes:

- Gen 4 is untouched and still matches. The new gen fails that comparison. The suite as written goes red unless the live test world still runs gen 4.
- The new geometry is checksum-invisible (prefix edits that `standaloneInto` still calls `floor`). The suite stays green and the feature can be fake. Section 1 is the way that fake is built. Z+2 caps above an unchanged S0 are exactly this case: checksum says `floor`, `derivePacked` says `solid`.

`tools/test_strata_foundation.js` is outside the allowed edit list. Weakening `generation_deterministic` to hide that conflict is a review failure. The honest report is: gen 4 checksums unchanged, new-gen checksums documented, suite result stated before any test edit.

Ground checksums do not guard any of this. Z0’s checksum is a 32×32 lattice of `WorldGen.cellInfo` (`ground|water|peak`), not strata. Canyon geometry can change every Z0 stratum while the ground checksum stays put.

### 10. WG.00.07 fluid interaction

Capacity of a carved cell is `STRATA_TO_FLUID` of the count of non-solid strata, not the count itself and not the air-prefix length:

| Open strata | Capacity (depth units) |
|---|---|
| 0 | 0 |
| 1 | 1 |
| 2 | 3 |
| 3 | 4 |
| 4 | 6 |
| 5 | 7 |

A one-stratum dig into solid rock creates capacity 1. A two-stratum dig jumps to 3. A test that expects `capacity === airFeet` will reject a correct carve. Down stays closed unless both boundary bytes are non-solid. Up is open on any Z+2 cell whose S4 is non-solid, capped caves included if the cap is not S4. Z-2 never sets Down, so a shaft ends in a pool on Z-2 rather than deleting volume off the map.

The lip bug fires as soon as roofs exist. `fluidCanPassLaterally` estimates floor height as `round(solidFraction * 5)`. That equals `fillOf` only for bottom-packed rock. A cave with S0 and S4 solid has solid count 2, the same as a `HEIGHT_2` bank. The lip check is skipped when counts are equal, so water at floor elevation 1 crosses into a neighbor whose real floor is elevation 2. The opposite error: the roof inflates the count, the check thinks the cave floor is high, and a legal downhill spill is blocked. Numeric conservation can still pass. The water is simply on the wrong side of the wall. `DEUS_Fluid.js` is not on the 19B allow-list. Shipping cave roofs without a bounded lip fix, or without an explicit accepted limitation, leaves WG.00.07 wrong on the new geometry. Gemini should treat an unannounced Fluid edit as a scope break and an absent note as an open defect.

Conservation holes already in `reconcileCellWithStrata`:

- It runs on `levels:strataChanged`. Baseline carving that does not emit events never reconciles. That is correct if the fluid grids are filled **after** the final strata exist.
- If a cut reduces capacity under volume that was seeded earlier, excess moves up, then sideways, and any remainder is discarded. The comment says mass is preserved. The remainder is not written back.
- Seeding pools by writing `M_WATER` into strata **and** pouring 0..7 depth creates two sources. `fluidStateAt` prefers the live grid when depth > 0, and otherwise counts fluid bytes. The diagnostic string and the conserved grid diverge. Natural pools today are exactly `toStrata` writing fluid into S1–S2 when `water[i]` is set and `fill < 2`. A cut that changes fill after that write, or that leaves the water flag on a cell whose S0 became air, parks fluid over a drain. Down then pulls it to the next open S4. Volume survives only if the destination capacity can hold it.
- New air must not be pre-filled. Capacity growth with unchanged depth is the conservation-safe outcome. Auto-filling new caves to their capacity creates water.

`SIDE` is set whenever any stratum is open, including a 1 ft floor crack beside a 1 ft ceiling crack. The simulator does not consult that bit today; the lip function does the real gate, with the defect above. Acceptance still asserts the Down/Up bits directly, because those are what `canDrainDown` uses.

## 3. Concrete Acceptance Checks and Invariant Assertions

Gemini runs these against Fable’s commit. A check that reads shape codes, `Floors.isRoofed`, pathfinder reachability, or `standaloneInto` as a substitute for strata fails the review even if the assertion is green.

**Process gates**

1. Diff is limited to the allow-list. Any touch of `DEUS_Fluid.js`, `plugins.js`, the depth renderer, or `test_strata_foundation.js` is a stop-and-report. A Fluid lip fix is accepted only with that report and with the reconciliation suite still at its real baseline.
2. State the suite baselines **before** the change, then after. Required commands:
   - `node tools/test_strata_foundation.js` (handoff expects 26 checks, 23/23 mutants)
   - `node tools/test_strata_fluid_reconciliation.js` (36 checks, 5/5 mutants)
   - `node tools/test_liquid_depth_simulation.js` (21 checks, 7/7 mutants)
3. Gen 4 `generateBaseline` is byte-identical. `checksum(z, seed, 4)` matches the parent commit for at least two seeds, all five Z. New worlds use a new gen. Old saves with `levels[z].gen === 4` regenerate the old column.
4. Cuts live in the baseline `strata.m` produced by `generateBaseline` for the new gen. They are not `setStrata` deltas, not a second grid, and not a post-pass that mutates another Z’s cache entry.
5. Pipeline order is written down and is a function of seed and coordinates: host geology, biome, macro `S`, then the 25-strata column, then readers. No `Math.random`, no event emission during the carve, no new salt reused from kit/geology/v3 caves.

**Partial height**

6. For one generated world, `heightStateAt` actually returns each of `HEIGHT_1_OF_5` … `HEIGHT_5_OF_5` at recorded coordinates. The bytes match the prefix (S0..S(k-1) solid, everything above the prefix air). `HEIGHT_2_OF_5` and `HEIGHT_4_OF_5` are present. A world whose only fills are 0, 1, 3, 5 fails.
7. Those cells were not produced by `setShape`. `recordFromPacked` cannot emit 2 or 4.
8. On a valley cell whose pre-cut state is S0 solid, a claimed 1 ft cut has removed that S0 (and Z-1 S4 if the cut continues). A diff that only clears S4 on a floor cell is a no-op and fails.
9. No new ramp connector sits on a cell whose fill is not the macro-Z step the pathfinder assumes. Terrace steps of 1–4 strata have connector 0. Neighbor connector nibbles are unchanged.
10. `heightStateAt` and `solidFraction` are both recorded. A roof (air prefix, solid cap) is not counted as a partial-height cut.

**Cross-Z exposure**

11. Published coordinates for Z0→Z-1: Z0 S0 and Z-1 S4 are both air, the next solid below is inside Z-1, and `getStrataFluidPassage` on Z0 has Down set. Same for Z-1 S0 and Z-2 S4.
12. A control column with only the upper cell opened does **not** satisfy check 11. `worldStrataElevationAt` on the upper cell is the lower cell’s S4, and Down is clear.
13. The cited coordinates are outside the cliff-mouth stair list (`baseline(0).cliffCaves` / `baseline(-1)` stair cells).
14. One traceable feature, defined as one face-connected air component, includes the Z0→Z-1 opening and the Z-1→Z-2 opening.

**Clearance**

15. `continuousAirHeight` (final name, documented) on a synthetic column:
    - 4 air above the floor, blocked by solid → 4
    - 5 → 5
    - 6 across a macro-Z boundary → 6
    - the 4 ft case’s derived shape may be `floor`; the clearance value is still 4
    - replacing those air bytes with water yields 0 air, not 4
    - open sky above Z+2 S4 returns the documented unbounded sentinel and is not equal to 6 or to 10
16. A mutant that stops at 4, that counts `!solid` rather than air, or that applies `head = 10` on every Z+2 cell, fails check 15.
17. No creature id, body height, or “upright” boolean is hard-coded. If one exists and is true at 4 ft, the commit fails.

**Roofs**

18. Intact cave: from the void cell, `Levels.hasOpaqueOverburden` is true, and the bytes above the void are host rock with HP 255 in the baseline.
19. `applyStrataDamage` / `applyVolumeDamage` on exactly those roof strata until they are air: the same query is false, with no flag cleared by hand. A mutant that only flips `isCaveRoof` while leaving stone bytes fails this.
20. The probe is not `Floors.isRoofed`. Calling `isRoofed` must not be part of the setup (it can write a deck).
21. A fully solid roof cell is not the probe. Fill 5 reports no overburden.

**Z+2 cap**

22. The written representation is the top solid prefix of specific Z+2 cave cells in `strata.m`. The commit message or `UF_Levels.md` states material, thickness, HP, and that opacity and support are the existing stratum fields.
23. No `z > 2`, no sixth `levels` entry, no new material id, no cap array in the save.
24. An ordinary Z+2 hilltop (`S = 2`, not a cave) keeps S1–S4 air, derives `floor` when headroom allows, and `hasOpaqueOverburden` is false.
25. A capped cave cell: S4 solid, `hasOpaqueOverburden` true from the void, `continuousAirHeight` finite, fluid Up bit **clear**. The adjacent sky cell: Up bit set, clearance unbounded.
26. Damaging the cap stratum to air clears overburden and sets Up. That is the breach test for Z+2.

**Floating mass**

27. A 6-connected stratum flood (face adjacency, including the cross-Z pairs in section 2) finds no solid component that fails to reach the area’s anchored border rock.
28. A planted arch and a cave ceiling with air beneath and solid shoulders are present in that world and are **not** reported.
29. A mutant slab at Z+2 S0 over air, with no lateral solid face, **is** reported.
30. For every published cut of macro depth ≥ 1, the old floor cell at `z === S` does not keep a solid S0 over the new void.
31. `surfaceElevationAt` / `surfaceGrid` disagreement with the strata surface is either updated or listed as a known limitation with object-anchor consequences. Silent disagreement fails the review.

**Networks**

32. Multi-Z “connected” means one air-face component touching both levels. Published coordinates for a network include a boundary pair that is air–air.
33. A same-XY pair of Z-1 and Z-2 halls with Z-1 S0 still solid is rejected by the same function.
34. Pathfinder reachability and stair/ramp connectors are not the oracle. A stair-only link fails the air test. A pure shaft may fail the pathfinder and still pass the air test.
35. Cave cells exist at Z+2, Z+1, Z0, Z-1, and Z-2 on the regression seed set, each with clearance recorded. Cave-free columns remain the majority. A mutant that marks every non-solid cell as a cave fails the “not Swiss cheese” count.

**Rarity**

36. Over the regression seed set, outside the start disk r ≤ 36: count of shallow partial-height cells ≫ cells whose air exposes Z-1 ≫ cells whose air exposes Z-2. Also report connected-feature counts and the maximum feature area. One Z-2 feature larger than the shallow set fails, even if it is the only deep feature.
37. The Z-2 sample is produced by the normal carve function on a published seed. A seed-equality special case fails review.
38. The start disk r ≤ 30 is still macro `S = 0` and its Z0 floors are still the kit’s uncut `HEIGHT_1` soil, unless the return explicitly accepts a gameplay change to the camp.

**Determinism**

39. Two `generateBaseline` runs, same seed and gen, any order of the five Z levels, produce identical `strata.m` and `conn` for all five. A third run after forcing baseline-cache eviction matches again.
40. Seed + 1 differs in carve placement and still satisfies the invariants.
41. New salts are new constants. Kit log, ore rolls, and gen-3 cave floors for an uncut seed match the parent commit.
42. `corner` / `surfaceGrids` keys used by the carve include every input that changes the bytes (seed, salt, gen if heights ever depend on gen, wrap size).

**Fluid**

43. For each new air prefix length 0..5, `fluidCapacityAt` matches `[0, 1, 3, 4, 6, 7]` and the Down/Up bits match the boundary bytes. A Z+2 cap keeps Up clear. A Z-2 floor of a shaft keeps Down clear and capacity > 0.
44. Carving does not increase `Fluid.diagnostics().totalWaterVolume` or `totalLavaVolume`. A before/after sum on a world with a seeded pool that the cut intersects is equal after the queue goes idle.
45. A capacity shrink under an existing pool displaces volume or the commit documents the existing drop-on-overflow and adds a regression that quantifies it. Silent deletion fails.
46. No new `M_WATER` / `M_LAVA` bytes are written into carved air. Pre-existing pool bytes still correspond to the same conserved depth as before, or the pool was intentionally drained by an open Down and the volume is found below.
47. Lateral case Gemini must actually step: cave cell S0 solid + S4 solid (count 2) beside a `HEIGHT_2` neighbor. State whether water crosses. If it crosses, that is the `solidFraction` lip defect and it is either fixed in an approved Fluid edit or written into the known limitations with this fixture. Leaving it untested fails the fluid section.
48. The five reconciliation mutants and seven liquid-depth mutants still fail their suites.

**Rule-4 mutants Gemini expects in `tools/test_strata_cuts_and_caves.js`**

Each mutant exits non-zero on the check named beside it:

| Mutant | Check that must go red |
|---|---|
| Quantize all fills through `toStrata` | 6 (2/5 and 4/5 disappear) |
| Leave Z0 S0 solid on a “Z-1 exposure” | 11 |
| Saturate clearance at 4, or count fluid as air | 15 |
| `isCaveRoof` flag cleared instead of strata | 19 |
| Invent Z+3 or skip writing S4 | 23, 25 |
| Require solid-below for every solid | 28 (arch/ceiling falsely illegal) |
| Treat same-XY non-solid shapes as connected | 33 |
| Force Z-2 depth on a common noise band | 36 |
| `Math.random` or shared kit mulberry | 39, 41 |
| Fill new caves to capacity | 44 |

**Evidence block the commit must contain**

Seed, gen, area, x, y, and the five material bytes of every Z involved, for: a shallow partial cut, a Z0→Z-1 cut, a Z-1→Z-2 cut, one feature reaching Z-2, a cave on each of the five levels, one multi-Z network, one intact roof, and the same roof after `applyStrataDamage`. Those cells come from `generateBaseline`, confirmed by a second process or a cache-cleared second call, not from a save delta.