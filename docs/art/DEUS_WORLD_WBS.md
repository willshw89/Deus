# DEUS — World-Art Work Breakdown Structure (DEUS-WORLD-WBS-v1.0)

**Document ID:** `DEUS-WORLD-WBS-v1.0`  
**Authority:** Project Owner Directive (2026-09-24)  
**Maintained by:** Gemini & Claude Code  
**Status:** CANONICAL & FROZEN HIERARCHY  

---

## 1. Project-Control Rule: Stable WBS Identifiers

1. **WBS IDs are Immutable**: Every WBS ID (`DW.xx.yy`) possesses exactly one permanent, approved scope.
2. **Zero Silent Renumbering**: Agents may **never** reorder, renumber, overwrite, or reassign WBS leaves to different tasks.
3. **Sequential Execution Gate**: Slices and leaves proceed strictly in authorized order. No downstream generation begins without explicit owner approval.
4. **Authority Separation**:
   - Visual references (`DEUS_GAMEPLAY_PERSPECTIVE_MASTER_V1`, `DEUS_BIOME_STUDIES_V1`, `DEUS_SCALE_LANGUAGE_V1`) control aesthetics, camera grammar, and proportional harmony.
   - Code, schemas, and technical standards control exact pixel geometry, grid alignment (48×48), and validation gates.

---

## 2. Phase DW.01 — World-Art Foundation Standards

The foundation phase establishes machine-enforceable rules, scales, and references before mass asset generation.

| WBS ID | Leaf Name | Deliverables & Scope | Status | Commit / Ref |
|---|---|---|---|---|
| **DW.01.01** | **Freeze World-Art Visual Charter** | Establish 3-part visual conditioning triad: Reference A (camera/density/loam), Reference B (5-biome material identity), Reference C (proportional scale lineup). | **COMPLETED / FROZEN** | `42f0169` |
| **DW.01.02** | **Freeze Native-Resolution / Pixel-Density Standard** | Enforce `1 source art pixel = 1 logical gameplay pixel` at 1.00x zoom; decouple grid (48px) vs object size vs pixel density; reject 16px→3× enlarged art; isolate legacy U7 stand-ins. | **COMPLETED / FROZEN** | `faeee9e` |
| **DW.01.03** | **Freeze Human / World Scale Strip** | Formalize proportional scale hierarchy using `DEUS_SCALE_LANGUAGE_V1`: 48×48 tile, ~42 px Adult Human, grass/bush classes, rock/boulder classes, common trees (~84 px oak), ordinary doors (~58 px), beds, architectural anchors. | **COMPLETED / FROZEN** | Owner Approved |
| **DW.01.04** | **Freeze Biome Identity & Material Differentiation Standard** | Formalize material identities, geological transitions, and soil/rock/water boundaries across the 5 core biomes (Temperate, Wetland, Arid, Highland, Volcanic) based on Reference B. | **COMPLETED / FROZEN** | `157cdb1` |
| **DW.01.05** | **Freeze Palette Architecture & Family Material Ramps** | Two-tier palette architecture: 226-color master (30 reserved headroom slots, <= 256 ceiling; `art/palette/deus_master_world_palette_v1.hex`) + 58 cohesive family material ramps (variable 3–5 tone lengths); container sheet policy in art_check.js; VFX exception. | **FINAL FROZEN / OWNER APPROVED** | `f208000` |
| **DW.01.06** | **Freeze Seamless Autotile & Terrain Assembly Standard** | Standardize 48×48 autotile bitmasking, border blending, corner logic, and multi-layer elevation edges to eliminate repetitive grid notches and hard tile seams. | **AUTHORIZED (PAUSED AT GATE)** | Pending FABLE-19 track |

---

## 3. Phase DW.02 — Core Biome Ground & Water Assemblies (Temperate First)

Mass production begins with one core biome to achieve golden visual quality before expanding.

| WBS ID | Leaf Name | Description | Status |
|---|---|---|---|
| **DW.02.01** | **Temperate Verdant Turf Autotile Suite** | Seamless base loam, swale meadow, sunlit rise, clover turf (Outside_A2). | QUEUED |
| **DW.02.02** | **Temperate Flora & Groundcover Elements** | Slender blades, clover clusters, wild flowering tufts, low bushes (Outside_B). | QUEUED |
| **DW.02.03** | **Temperate Freshwater & Shore Progression** | Shallow pebble stream, deep water, shoreline mud/gravel transitions (Outside_A1). | QUEUED |
| **DW.02.04** | **Temperate Cliff & Elevation Strata** | 2-grid vertical rock cliffs, shelf ledges, cut stone steps. | QUEUED |
| **DW.02.05** | **Temperate Common Trees Suite** | Multi-tile Common Oak (~84 px), Birch (~88 px), Pine (~92 px) with stumps/logs. | QUEUED |

---

## 4. Phase DW.03 — Architectural & Settlement Structures

| WBS ID | Leaf Name | Description | Status |
|---|---|---|---|
| **DW.03.01** | **DF Black Wall-Top Structural Standard** | 48×96 px two-grid-high walls with flat near-black upper cap (`#08080C`–`#121218`). | QUEUED |
| **DW.03.02** | **Doors, Portals & Gateways** | South, West, East, North doors aligned with black top line; open/closed states. | QUEUED |
| **DW.03.03** | **Roofs, Floors & Ceilings** | Walkable upper decks on Z+1; interior timber/stone flooring on Z=0. | QUEUED |
| **DW.03.04** | **Basic Furnishings & Workstations** | Straw bedding, wooden beds, hearths, storage chests, butcher/carpenter benches. | QUEUED |

---

## 5. Phase DW.04 — Secondary Biomes (Expansion)

| WBS ID | Leaf Name | Description | Status |
|---|---|---|---|
| **DW.04.01** | **Wetland / Swamp Biome Suite** | Peat soil, murky water, cypress/willow trees, reeds, mossy hummocks. | QUEUED |
| **DW.04.02** | **Arid / Badlands Biome Suite** | Red clay, sandstone strata, scrub brush, dry wash gravel. | QUEUED |
| **DW.04.03** | **Highland / Mountain Foothills Suite** | Craggy slate/granite, scree slopes, alpine scrub (zero snow). | QUEUED |
| **DW.04.04** | **Volcanic / Deep Subterranean Suite** | Basalt slabs, ash loam, obsidian outcroppings, glowing magma seams. | QUEUED |
