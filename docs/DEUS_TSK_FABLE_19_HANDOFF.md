# DEUS-TSK-FABLE-19: Canonical Five-Strata Architecture & Multi-Z World Exposure

**Document ID:** `DEUS-TSK-FABLE-19`  
**Delegated by:** Gemini (DEUS Integration Coordinator)  
**Assigned to:** Fable (Claude Code — Systems, Autonomous Behavior & Depth Specialist)  
**Authority:** Project Owner Directive (2026-09-24)  
**Execution Model:** Strict Three-Phase Sequential Gating (`19A` → `19B` → `19C`)  
**Status:** READY FOR 19A EXECUTION  

---

## SECTION 0: Canonical Five-Strata Architecture

### 0.1 The Problem with Legacy One-Shape-Per-Cell Geometry
In legacy Project DEUS architecture (`game/js/plugins/DEUS_Levels.js`), each macro coordinate `(x, y, z)` stores a single packed 32-bit integer representing one coarse shape (`floor`, `solid`, `slope`, `stairs`, etc.). This coarse 1-block abstraction caused severe design and simulation bottlenecks:
1. It could not represent natural within-tile elevation gradients, terraces, sunken stream beds, or partial-height soil/rock layers.
2. Natural caves could only be hollowed out on negative Z levels, falsely assuming any negative Z is automatically a "cave" while positive Z could not have cave roofs or hollow overhangs.
3. Lower-layer vertical rendering had to operate at coarse 48×48 px whole-tile steps, requiring complex visual offsets rather than clean volumetric occlusion.

### 0.2 The Five-Strata Model
Project DEUS replaces the single packed shape per cell with the **Five-Strata Volumetric Geometry Authority**:
- **Macro Z Grid:** Exactly 5 physically adjacent Z levels are supported:
  - `Z+2`: Highest mountain peaks, alpine cliffs, caldera rims, high canopy tops
  - `Z+1`: Upper terraces, rock shelves, hills, raised ground
  - `Z0`: Canonical ground surface
  - `Z-1`: Shallow subterranean, caverns, cellars, bedrock
  - `Z-2`: Deep subterranean, magma-adjacent strata, deep solid foundations
- **Macro Cell Geometry:** 48×48 px in RMMZ (5 ft × 5 ft horizontal) by 5 ft vertical.
- **Micro Strata Structure:** Every macro cell `(x, y, z)` is subdivided vertically into **five 1-foot strata**:
  - `S4` (Top stratum: 4 ft to 5 ft height)
  - `S3` (Upper-mid stratum: 3 ft to 4 ft height)
  - `S2` (Center stratum: 2 ft to 3 ft height)
  - `S1` (Lower-mid stratum: 1 ft to 2 ft height)
  - `S0` (Bottom stratum: 0 ft to 1 ft height)
- **Full Column Coordinate Space:** Across the 5 macro Z levels, an XY column contains exactly **25 addressable vertical strata**:
  - `Z+2`: Strata 24 (S4) down to 20 (S0)
  - `Z+1`: Strata 19 (S4) down to 15 (S0)
  - `Z0`:  Strata 14 (S4) down to 10 (S0)
  - `Z-1`: Strata 9 (S4) down to 5 (S0)
  - `Z-2`: Strata 4 (S4) down to 0 (S0)
- **Global Invariant:** Five strata are the **single mutable authority** for all physical world matter, void, and durability in DEUS. Legacy cell-level APIs remain strictly as derived, read-only compatibility views.

---

## SECTION 1: Verified Terrain Reader Dependency Map

The DEUS Integration Coordinator and Fable conducted an exhaustive source-code audit across all subsystems consuming terrain geometry at current HEAD. Below is the authoritative dependency matrix:

| Subsystem / Reader | File & Exact Location | Current Consumed API | Classification for FABLE-19 | Required Adapter / Behavior in 19A |
|---|---|---|---|---|
| **Level Generation & Storage** | `DEUS_Levels.js` ~708 (`generateBaseline`), ~867 (`baseline`), ~884 (`shapeGrid`), ~943 (`packedAt`) | Single packed integer per cell (`shape`, `mat`, `construct`) | **19A PRIMARY TARGET** | Replaced by canonical compact strata typed arrays (`material`, `hp`, `flags`). |
| **Save / Load / Migration** | `DEUS_Levels.js` ~931 (`unpack`), ~934 (`changesOf`), ~2127 (`ensureWorldLevels`), ~2147 (`migrate`), ~2185 (`verifyLevels`) | Sparse cell delta array, generator version, checksum | **19A PRIMARY TARGET** | Preserves sparse-delta save model & checksums. Migrates legacy saves to strata format. |
| **Geometry Edit Events** | `DEUS_Levels.js` ~1114 (`setShape`), ~1229 (`notifyWorldCellChanged`) | Emits `levels:shapeChanged`, `levels:cellChanged` | **19A MUST ADAPT** | Strata mutations emit compatibility events to invalidate pathing, minimap, exposure caches, and lighting. |
| **Support & Exposure** | `DEUS_Levels.js` ~1191 (`isExposedSurface`), ~1207 (`exposedFacesAround`) | Checks neighboring 6 cell shapes | **19A MUST ADAPT** | Derives exposure and vertical contact from adjacent strata fullness. |
| **Cliff Wall Identification** | `DEUS_Levels.js` ~1949 (`naturalWallCells`) | Solid cell adjacent to non-solid cell | **19A MUST ADAPT** | Interprets partial-height strata into legacy wall bounds until partial-height art arrives. |
| **Pathfinding Planner** | `DEUS_World.js` ~1981 (`planner`), ~2150+ (ramps/stairs) | `shapeCodeAt(ax, ay, x, y, z)` | **19A PRESERVE VIA ADAPTER** | Preserves `shapeCodeAt` compatibility adapter. No pathfinding rewrite. |
| **Walkability Checker** | `DEUS_World.js` ~2637 (`walkable`) | `shapeCodeAt` + floor flags | **19A DERIVE FROM STRATA** | Returns walkable when surface stratum is traversable and overhead clearance $\ge 4$ strata. |
| **Spawn Free Cell** | `DEUS_World.js` ~939 (`cellFree`) | Tile passage flags from RMMZ `$gameMap` | **D. NO CHANGE REQUIRED** | Reads tile flags, not shapes. Untouched. |
| **Fluid Simulation** | `DEUS_Fluid.js` ~50 (`DEPTH_MAX`), ~217 & ~255 (`shapeAt`) | Fluid depth 0..7 and coarse `shapeAt` | **19A ADAPTER ONLY** | 19A provides compatibility adapter. Gemini owns fluid simulation; zero fluid rewrites in 19A. |
| **Roofs & Rain Shelter** | `DEUS_Floors.js` ~190 (`isRoofed`) | `z < 0` or cell above is solid | **19A MUST ADAPT** | Replaces `z < 0` hardcoding with canonical `hasOpaqueOverburden(x,y,z)` strata query. |
| **Minimap Renderer** | `DEUS_Minimap.js` ~292 (`shapeAt`) | `Levels.shapeAt` | **19A PRESERVE VIA ADAPTER** | Consumes derived `shapeAt` adapter. Zero minimap redesign. |
| **Ground Painter** | `DEUS_WorldGen.js` ~959 (`groundColumns`), ~993 (`columnReader`), ~1021 (`paintGround`), ~1052 (`groundTilesAt`) | Surface grid & coarse shape codes | **19A PRESERVE VIA ADAPTER** | Exposes derived top surface. No premature DW.01.06 terrain assembly changes. |
| **Plant & Flora Placement** | `DEUS_WorldGen.js` ~1239, ~1296 | `surfaceElevationAt === z` | **19A MUST ADAPT** | Exposes `surfaceHeightAt(x, y, z)` capable of returning exact stratum height (0..4). |
| **Cell Info Query** | `DEUS_WorldGen.js` ~711 (`cellInfo`) | Climate at Z0, `cellAt` on other Z | **19A DERIVE FROM STRATA** | Adapts cell info to return surface stratum properties. |
| **Cave Wildlife Placement** | `DEUS_Wildlife.js` ~446 (`planUnderground`) | Baseline underground chamber list | **B. CAN REMAIN VIA ADAPTER** | Consumes derived chamber list in 19A. Full 19B consumer when multi-Z caves land. |
| **Depth Compositor** | `DEUS_Depth.js` ~325 | `Levels.openCells` (2-plane limit) | **B. CAN REMAIN VIA ADAPTER** | Consumes strata mask in 19A. Full 5-layer rewrite deferred to 19C. |
| **Job Standing Clearance** | `DEUS_Jobs.js` ~245 (`standableIn`) | `World.walkable`, `WorldGen.cellInfoLocal`, `$gameMap.isPassable` | **B. CAN REMAIN VIA ADAPTER** | Fully satisfied by `World.walkable` and `WorldGen.cellInfo` adapters in 19A. Zero edits to `DEUS_Jobs.js`. |
| **Ecology Regrowth** | `DEUS_Ecology.js` ~621, ~839, ~842 (`shapeAt === "floor"`) | `WorldGen.cellInfo`, `World.walkable`, `Levels.shapeAt` | **B. CAN REMAIN VIA ADAPTER** | Fully satisfied by `Levels.shapeAt` returning `"floor"` for open surface with solid substrate. Zero edits in 19A. |
| **History Site Placement** | `DEUS_History.js` ~278, ~303, ~324 (`discWalkable`) | `WorldGen.cellInfo(gx, gy).walkable` | **B. CAN REMAIN VIA ADAPTER** | Reads `info.walkable` from derived adapter. Zero edits to `DEUS_History.js` in 19A. |

---

## SECTION 2: Phase 19A Scope, Files, Tests & Return Package

### 2.1 Explicit 19A Scope
Phase 19A is the **pure physical data and authority migration**. It creates the strata storage, migrates world generation to write directly to strata, implements the volumetric damage/HP API, and exposes derived legacy adapters so all existing gameplay, jobs, ecology, and pathfinding continue working with zero regression.

**In Scope for 19A:**
1. **Compact TypedArray Storage:**
   - 2 bytes per stratum: `materialId` (Uint8, 0 = AIR, 1..255 = catalog materials) and `hpFraction` (Uint8, 0..255 indicating 0% to 100% of material max HP).
   - Total uncompressed footprint per 256×256 area across all 5 Z levels: $256 \times 256 \times 5 \times 5 \times 2\text{ bytes} = 3.28\text{ MB}$.
2. **Canonical Strata Authority:**
   - Implement in `game/js/plugins/DEUS_Levels.js`. Strata are the single source of truth.
3. **Deterministic Baseline Strata Generation:**
   - World generation seeds strata directly: full rock columns generate 5 solid strata per cell; open air generates 5 air strata.
4. **Sparse Save & Delta Migration:**
   - Save only modified strata cells (sparse map of `(x, y, z) -> Uint8Array(10)`). Unmodified terrain regenerates deterministically from seed and generator version.
   - Implement `migrateSaveToFiveStrata(legacySave)`: converts legacy solid shapes to 5 solid strata of that material; converts air to 5 air strata.
5. **Volumetric Damage & Material HP API:**
   - `Levels.applyStrataDamage(area, x, y, z, stratumIndex, damageAmount, damageType)`: damages an exact 1-foot stratum.
   - `Levels.applyVolumeDamage(area, minX, minY, minZ, minStratum, maxX, maxY, maxZ, maxStratum, damageAmount, damageType)`: damages a 3D bounding box spanning multiple cells and Z levels.
   - Destruction of a stratum (HP drops to 0) converts it to AIR and emits `levels:strataDestroyed` and `levels:cellChanged`.
6. **Derived Legacy Adapters:**
   - `Levels.shapeAt(area, x, y, z)`: returns legacy string (`"solid"`, `"floor"`, `"open"`) derived from strata configuration:
     * 5/5 solid strata $\rightarrow$ `"solid"`
     * 0/5 solid strata with solid substrate below $\rightarrow$ `"floor"`
     * 0/5 solid strata with air below $\rightarrow$ `"open"` (or `0`)
     * 1/5 to 4/5 solid strata $\rightarrow$ returns `"floor"` with surface height metadata.
   - `Levels.surfaceHeightAt(area, x, y, z)`: returns the top physical stratum index (0..4) and world stratum elevation (0..24).
   - `Floors.hasOpaqueOverburden(area, x, y, z)`: returns true if any solid stratum exists above `(x, y, z)` across the 25-strata column.
7. **Fluid Compatibility Adapter:**
   - Expose `Levels.getStrataFluidPassage(area, x, y, z)` answering open vertical and horizontal bounds for `DEUS_Fluid.js`.
8. **Automated Test Suite:**
   - Create `tools/test_strata_foundation.js` covering storage, generation, damage, save migration, and adapters.

**Explicitly Excluded from 19A:**
- DO NOT generate ravines, canyons, sinkholes, or chasms (deferred to 19B).
- DO NOT generate multi-Z cave networks (deferred to 19B).
- DO NOT rewrite the depth renderer to 5 planes (deferred to 19C).
- DO NOT rewrite `DEUS_Fluid.js` (owned by Gemini; deferred to fluid milestone).
- DO NOT modify `DEUS_Jobs.js`, `DEUS_Ecology.js`, `DEUS_History.js`, or `DEUS_Wildlife.js`.
- DO NOT generate new art assets.

### 2.2 Files Owned by Fable in 19A
- `game/js/plugins/DEUS_Levels.js` (Strata engine, storage, adapters, damage API)
- `tools/test_strata_foundation.js` (New test suite for 19A)
- `docs/systems/DEUS_Levels.md` (Updated system documentation)
- Minor adapter hooks in `game/js/plugins/DEUS_Floors.js` (for `isRoofed` overburden query)

---

## SECTION 3: Phase 19A → 19B Authorization Gate

Before Fable is authorized to begin Phase 19B, Fable must stop and return the 19A package to Gemini for Coordinator Review. All of the following must be verified:
1. `node tools/test_strata_foundation.js` passes all tests with 0 failures.
2. Memory footprint benchmarks confirm $\le 4\text{ MB}$ per 256×256 area for all 5 macro Z levels.
3. Old save migration test proves legacy saves load without corrupting terrain.
4. Independent stratum damage test proves destroying stratum $S2$ does not destroy $S3$ or $S1$, and damage properly crosses macro Z boundaries (e.g. from $Z0:S0$ to $Z-1:S4$).
5. Foundation test suites pass with zero regressions:
   - `node tools/test_palette_standard.js` (503 checks)
   - `node tools/test_biome_standard.js` (334 checks)
   - `node tools/test_scale_standard.js` (26 checks)
   - `node tools/test_native_resolution_standard.js` (23 checks)
   - `node tools/art_check.js --selftest` (80 expectations)
6. Gemini Integration Coordinator reviews and issues `19A APPROVED / PROCEED TO 19B`.

---

## SECTION 4: Phase 19B Scope (Meso-Scale Natural Cuts & Multi-Z Caves)

Once 19A is approved, Phase 19B activates within `game/js/plugins/DEUS_WorldGen.js`:
1. **Meso-Scale Natural Terrain Cuts:**
   - Carves coherent, multi-tile ravines, canyons, river valleys, arroyos, karst sinkholes, volcanic fissures, and stepped terraces into the 25-strata column.
   - Carving strictly removes strata; it never creates floating, unsupported upper natural terrain slabs.
   - Cut depth distribution: Shallow (1 Z cut, ~60%), Medium (2 Z cut, ~25%), Deep (3 Z cut, ~12%), Rare Deep (Z+2 down to Z-2, ~3%).
2. **Multi-Z Cave Networks:**
   - Caves can now exist on **any Z level** (`Z+2`, `Z+1`, `Z0`, `Z-1`, `Z-2`), with real physical strata roofs and overburden.
   - Natural vertical shafts, sinkholes, and ramps connect cave layers.
3. **Biome Fidelity:**
   - Cuts strictly respect the canonical 5-biome identities (`TEMP`, `WET`, `ARID`, `HIGH`, `VOLC`) from `docs/art/DEUS_BIOME_IDENTITY_STANDARD.md` and vertical hooks from `DEUS_BiomeRegistry.json`.
4. **Deterministic Golden Proof Seed:**
   - Delivers a deterministic world seed demonstrating all cut types while leaving flat settlement terrain intact nearby.
5. **Tests:**
   - Creates `tools/test_worldgen_cuts.js` proving determinism, physical mass validity, and depth bounds.

---

## SECTION 5: Phase 19B → 19C Authorization Gate

Before Fable is authorized to begin Phase 19C:
1. `node tools/test_worldgen_cuts.js` passes all tests with 0 failures.
2. Determinism test proves identical seed generates identical strata cuts across repeated runs.
3. Physical mass tests prove zero unsupported upper slabs exist in the generated world.
4. Foundation test suites continue passing with zero regressions.
5. Gemini Integration Coordinator reviews and issues `19B APPROVED / PROCEED TO 19C`.

---

## SECTION 6: Phase 19C Scope (Global Five-Layer Depth Compositor)

Once 19B is approved, Phase 19C activates within `game/js/plugins/DEUS_Depth.js`:
1. **Full Five-Layer Depth Compositing:**
   - Expands `DEUS_Depth.js` beyond the 2-plane limit to support all 5 physical Z planes (`this.planes[0..3]` for up to 4 lower visible planes beneath active Z).
2. **Volumetric Occlusion Rule:**
   - Downward line-of-sight traces down the 25-strata column; stops at the first opaque stratum or completed floor/roof structure.
3. **Chunk-Local Exposure Cache & Invalidation:**
   - Viewport-bounded chunk cache storing pre-evaluated lower-layer visibility masks.
   - Dirty-region invalidation when strata are excavated, damaged, or built.
   - Zero full-world 5-map renders per frame.
4. **Visual Depth Conditioning:**
   - Progressive scaling about viewport center (camera focus origin).
   - Progressive value cues (brightness, contrast, desaturation).
   - **BLUR IS OFF BY DEFAULT** (preserving 60 FPS performance as proven in performance audit).
5. **Native RMMZ Proof & Screenshot:**
   - Captures an official 1.00x native screenshot showing visible portions of all 5 levels (`Z+2`, `Z+1`, `Z0`, `Z-1`, `Z-2`) in one view on actual generated world geometry.
6. **Performance Benchmark:**
   - Frame times maintain $\le 16.7\text{ ms}$ (60 FPS) with 5 planes active in test harness.

---

## SECTION 7: Fluid Ownership Boundary

- **Gemini Owns Fluids:** `game/js/plugins/DEUS_Fluid.js`, the fluid propagation algorithms, evaporation, pressure models, and bucket jobs are owned by Gemini.
- **Fable Boundary in 19A/19B/19C:** Fable MUST NOT rewrite `DEUS_Fluid.js`.
- **Adapter Contract:** In 19A, Fable exposes `Levels.getStrataFluidPassage(area, x, y, z)` in `DEUS_Levels.js`. `DEUS_Fluid.js` continues to operate on its current `0..7` depth scale using this adapter.
- A future Gemini task will formally reconcile the `0..7` fluid depth with the canonical 5-strata physical volume.

---

## SECTION 8: Old-Save Migration Policy

1. **Format Versioning:**
   - The levels state introduces `strataSchemaVersion: 1`.
2. **Sparse Save Preservation:**
   - Unchanged generated terrain is never saved; it is regenerated deterministically from seed, generator version, and `strataSchemaVersion`.
   - Modified cells store sparse delta records: `changes[key] = { m: Uint8Array(5), hp: Uint8Array(5) }`.
3. **Legacy Save Ingestion (`migrateSaveToFiveStrata`):**
   - Solid stone/soil cell $\rightarrow$ 5 solid strata of that material at 100% HP.
   - Air/open cell $\rightarrow$ 5 AIR strata.
   - Legacy floor $\rightarrow$ S0 solid floor stratum, S1..S4 AIR strata.
   - Legacy ramp/stairs $\rightarrow$ compatibility stepped strata profile.
4. **Validation:**
   - If an unrecognized legacy save format is encountered, clean diagnostic error is emitted without silent world corruption.

---

## SECTION 9: Memory & Performance Requirements

1. **Storage Budget:**
   - $\le 3.5\text{ MB}$ uncompressed memory per 256×256 area across all 5 macro Z levels.
   - Use flat TypedArrays (`Uint8Array`), avoid nested JS object graphs for individual strata.
2. **Query Performance:**
   - `surfaceHeightAt(x, y, z)`: $O(1)$ bit-shift or single array index lookup.
   - `shapeAt(x, y, z)` adapter: $O(1)$ evaluation over 5 strata.
   - `hasOpaqueOverburden(x, y, z)`: bitwise mask check over upper strata in column.
   - Zero dynamic memory allocation during query calls.
3. **Engine Frame Time:**
   - Adapter queries must introduce $< 0.2\text{ ms}$ total overhead per frame in standard gameplay.

---

## SECTION 10: Overall Stop & Gating Policy

1. Work proceeds strictly one sub-task at a time (`19A` $\rightarrow$ Gate $\rightarrow$ `19B` $\rightarrow$ Gate $\rightarrow$ `19C`).
2. Fable must NOT begin 19B or 19C during 19A.
3. Gemini must NOT begin `DW.01.06` during this engineering track.
4. Each phase terminates with automated test proofs, git commit, and handoff report to Gemini for Coordinator Review.

---

## COPY-PASTE ASSIGNMENT: DEUS-TSK-FABLE-19A

Copy and paste the block below directly into Fable's (Claude Code's) terminal/agent session:

```text
================================================================================
DEUS CONCRETE TASK ASSIGNMENT: DEUS-TSK-FABLE-19A
FIVE-STRATA GEOMETRY AUTHORITY & FOUNDATION MIGRATION
================================================================================
Role: Systems & Core Architecture Specialist (Fable)
Co-Engineer / Coordinator: Gemini (World Art Authority & Integration Coordinator)
Working Directory: c:\Users\snewt\OneDrive\Desktop\UF
Authority Documents:
- docs/DEUS_TSK_FABLE_19_HANDOFF.md (Full Canonical Specification)
- docs/STATUS.md
- docs/systems/DEUS_Levels.md
================================================================================

1. OBJECTIVE & BOUNDARY FOR 19A
Implement Phase 19A only:
  - Migrate DEUS_Levels.js to the canonical Five-Strata Volumetric Geometry model.
  - Five strata per macro cell (25 addressable strata across Z+2 through Z-2) become
    the single, authoritative mutable source of truth for physical matter and void.
  - Expose derived legacy compatibility adapters (shapeAt, shapeCodeAt, surfaceHeightAt,
    hasOpaqueOverburden) so all existing consumers (pathing, jobs, ecology, minimap,
    history) continue working with zero code regressions.
  - Implement volumetric damage API and material HP state.
  - Implement sparse delta save model and legacy save migration.

DO NOT IMPLEMENT IN 19A:
  - DO NOT generate ravines, canyons, or sinkholes in DEUS_WorldGen.js (deferred to 19B).
  - DO NOT generate multi-Z cave networks (deferred to 19B).
  - DO NOT rewrite DEUS_Depth.js to 5 planes (deferred to 19C).
  - DO NOT rewrite DEUS_Fluid.js (Gemini owns fluids; provide adapter only).
  - DO NOT edit DEUS_Jobs.js, DEUS_Ecology.js, DEUS_History.js, or DEUS_Wildlife.js.

================================================================================
2. SPECIFIC DELIVERABLES FOR 19A
================================================================================

1. COMPACT STRATA STORAGE IN DEUS_Levels.js:
   - 5 strata per cell: S4 (top), S3, S2, S1, S0 (bottom).
   - 2 bytes per stratum: materialId (Uint8) and hpFraction (Uint8).
   - Flat TypedArray backing per area level. Total footprint <= 3.5 MB across all 5 Z.

2. DETERMINISTIC BASELINE GENERATION:
   - World generation seeds strata directly: solid rock columns generate 5 solid
     strata per cell; open air generates 5 AIR strata.

3. VOLUMETRIC DAMAGE & MATERIAL HP API:
   - Levels.applyStrataDamage(area, x, y, z, stratumIndex, damage, damageType)
   - Levels.applyVolumeDamage(area, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType)
   - Destroying a stratum converts it to AIR and emits levels:strataDestroyed and levels:cellChanged.

4. DERIVED LEGACY COMPATIBILITY ADAPTERS:
   - Levels.shapeAt(area, x, y, z): derives "solid", "floor", or "open" from strata.
   - Levels.surfaceHeightAt(area, x, y, z): returns stratum height 0..4 and world elevation 0..24.
   - Floors.hasOpaqueOverburden(area, x, y, z): evaluates opaque strata above cell.
   - Levels.getStrataFluidPassage(area, x, y, z): fluid passage adapter for DEUS_Fluid.

5. SAVE ARCHITECTURE & MIGRATION:
   - Unchanged terrain regenerates from seed/version; modified strata saved as sparse deltas.
   - migrateSaveToFiveStrata: converts legacy solid shapes to 5 solid strata; air to 5 air strata.

6. AUTOMATED TEST SUITE:
   - Create tools/test_strata_foundation.js verifying:
     1. Storage compaction (<= 3.5 MB footprint)
     2. Deterministic baseline generation into strata
     3. Independent stratum damage (damaging S2 leaves S1/S3 intact)
     4. Damage crossing macro-Z boundaries (Z0:S0 down to Z-1:S4)
     5. Derived shapeAt / surfaceHeightAt accuracy
     6. hasOpaqueOverburden query accuracy
     7. Old save migration without data loss
     8. Event emission upon strata destruction

================================================================================
3. STOP CONDITION FOR 19A
================================================================================
After:
  - DEUS_Levels.js is migrated to canonical strata authority
  - Derived legacy adapters are functioning
  - tools/test_strata_foundation.js passes all tests
  - Foundation regression suites (palette, biome, scale, native_resolution, art_check) pass
  - Commit changes with message starting: [fable] DEUS-TSK-FABLE-19A ...

STOP.
Do NOT proceed to 19B.
Return the 19A completion package to Gemini for Integration Coordinator Review.
================================================================================
```
