# DEUS-WORLDGEN-WBS-v1.0 — Canonical WorldGen Work Breakdown Structure

**Document ID:** `DEUS-WORLDGEN-WBS-v1.0`  
**Status:** ACTIVE / CANONICAL BASELINE  
**Integration Authority:** Gemini  
**Bounded Implementation Agent:** Fable  
**Date:** 2026-09-24  
**Permanent Project-Control Anchor:** WBS IDs are immutable. Never silently renumber, merge, or reuse them.

---

## 1. Executive Mandate & Production Principles

This document defines the authoritative, step-by-step path from the initial five-strata physical world foundation all the way to **DEUS WORLDGEN v1 — COMPLETE**.

### Binding Production Rules
1. **Strict Linear WBS Execution:** Only ONE implementation leaf may be active at any given time across all agents. No overlapping implementation agents.
2. **Repository Facts Over Assumptions:** Every leaf begins by verifying repository facts and dependencies.
3. **Strict Separation of Concerns:**
   - **Gemini:** Integration Coordinator, Architecture/Standard Authority, Pipeline & Tooling Author, QC & Verification Auditor.
   - **Fable:** Bounded Engine Systems Implementation Agent (executing explicit copy-paste prompts).
   - **Nano Banana Pro (`gemini-3-pro-image`):** Source art generator only. Never chooses atlas positions. Never renders UI frames or borders. Never creates approval mockups.
4. **Actual RMMZ Runtime Verification:** Definition of Done requires running in actual RMMZ Playtest (NW.js / F5). Automated test harnesses must prove capability to fail (Rule 4).
5. **No Blind Mass Art Generation:** Every asset must possess an explicit semantic ID, metadata specification, and pre-allocated permanent atlas slot before generation.
6. **Production Blur Elimination:** Depth compositing utilizes physical geometry, scale recession, subtle parallax, and restrained brightness/saturation/contrast steps. **Blur is OFF for production.**

---

## 2. Master WBS Matrix

```text
WG.00 — Foundation & Physical-World Gates
WG.10 — World Visual Topology & Layer Architecture
WG.11 — Environmental Animation Standard & Frame Cadence
WG.20 — Master Semantic Asset Catalogue Architecture
WG.21 — Authored Ecological & Geological Variety Standard
WG.22 — 25 Biome/Z Environment Expression Catalogue
WG.23 — Shared-World & Neutral Asset Catalogue
WG.24 — 10 Horizontal Pairwise Transition Catalogues
WG.25 — Vertical Inter-Strata & Cliff Transition Catalogue
WG.30 — Permanent RMMZ Atlas Sheet Topology & Geometry
WG.31 — Companion Animated Sheet Slot Reservation Standard
WG.32 — Developer Diagnostic Slotmap Specification (*_SLOTMAP.png)
WG.33 — Manifest ↔ Atlas Bi-Directional Integrity Checker
WG.40 — Nano Banana Pro Source Art Generation Pipeline
WG.41 — Asset Approval, Palette Snapping & Integration Pipeline
WG.50 — Temperate Z0 Golden Biome Production Pack
WG.51 — Remaining Z0 Biomes Production Pack (WET, ARID, HIGH, VOLC)
WG.52 — 10 Horizontal Transition Packs
WG.53 — Positive-Z (Z+1, Z+2) Alpine & Canopy Production Pack
WG.54 — Negative-Z (Z-1, Z-2) Subterranean & Underworld Production Pack
WG.55 — All-Z Physical Cave & Rupture Production Pack
WG.56 — Partial-Height Terrain & Micro-Relief Art Pack
WG.57 — Volumetric Fluid Depth & Hazard Art Pack
WG.60 — Geological Mineral & Finite Material Visual Pack
WG.61 — Deterministic 3D Vein & Resource WorldGen Implementation
WG.62 — Canonical Initial Racial Spawn WorldGen Implementation
WG.70 — Multi-Scale Visual Placement (Macro/Meso/Micro Density)
WG.71 — Environmental Sprite Animation Runtime Integration
WG.72 — Five-Z Visual Compositing & Occlusion Integration
WG.73 — Organic Grid-Disappearance & Anti-Tiling Pass
WG.80 — Atlas Completeness & Transparency Hole Audit
WG.81 — 25 Environment Verification Matrix
WG.82 — 10 Horizontal Transition Verification Matrix
WG.83 — Cave, Shaft & Vertical Cut Verification Matrix
WG.84 — Multi-Seed Procedural WorldGen QA
WG.85 — Engine Performance, Heap & Load Budget QA
WG.86 — Golden Master WorldGen Regression Freeze
WG.90 — DEUS WORLDGEN v1 — COMPLETE
```

---

## 3. Detailed Work Breakdown & Status Registry

### WG.00 — Foundation & Physical-World Gates

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.00.01** | World-Art Visual Charter | Gemini | Flat 3/4 top-down 2D, serious chibi (3.0–3.2 heads), grounded, no isometric walls. | `DONE` (DW.01.01) |
| **WG.00.02** | Native 1:1 Resolution Standard | Gemini | Native 48px tile grid, 1:1 pixel density, binary alpha, anti-fraud checks. | `DONE` (DW.01.02) |
| **WG.00.03** | Human / World Scale Standard | Gemini | 42px Adult Human yardstick, 39 canonical scale classes, locked 1.00x camera. | `DONE` (DW.01.03) |
| **WG.00.04** | Biome Identity Standard | Gemini | 5 canonical biomes (`TEMP`, `WET`, `ARID`, `HIGH`, `VOLC`), physical-Z hooks, 10 transitions. | `DONE` (DW.01.04) |
| **WG.00.05** | Palette Architecture & Material Ramps | Gemini | Master Palette V1 (226 active, 30 reserve), 58 material ramps, 0 near-duplicates. | `DONE` (DW.01.05) |
| **WG.00.06** | Five-Strata Geometry Foundation | Fable / Gemini | Strata storage (5x1ft/cell), derived cached shapes, damage API, native smoke gate. | `DONE` (FABLE-19A / edba004) |
| **WG.00.07** | Fluid ↔ Strata Reconciliation | Gemini | Resolve fluid depth adapter (0..7) with physical strata (0..5), buoyancy, saturation. | `DONE` (2f47203) |
| **WG.00.08** | Cuts + Caves on All Five Z | Fable | Partial-height terrain, chasms, sinkholes, Z0→Z-1 & Z-1→Z-2 deep cuts, cave roofs. | `ACTIVE` (FABLE-19B) |
| **WG.00.09** | Global Five-Z Depth Renderer | Fable | Five-plane compositor, physical scale recession, no blur, chunk exposure cache. | `QUEUED` (FABLE-19C) |
| **WG.00.10** | Startup & Load Performance Baseline | Gemini / Fable | 256x256x5 area memory budget (<3.5MB), tick budget (<0.2ms), load time benchmarks. | `QUEUED` |

---

### WG.10 — Visual Topology & Animation Standards

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.10.01** | Ground Layer Assembly Architecture | Gemini | Split ground into base substrate, material autotile, transition blend, and micro-scatter. | `PLANNED` |
| **WG.10.02** | Wall & Cliff Structural Architecture | Gemini | DF-style black wall-top convention (48px material + 48px black cap), vertical continuity. | `PLANNED` |
| **WG.10.03** | Canopy & Overhead Cover Architecture | Gemini | Multi-tile tree overhangs, roof transparency masks, interior shelter occlusion. | `PLANNED` |
| **WG.11.01** | Environmental Animation Cadence | Gemini | Standardize 3 visual variants $\times$ 3 frames for wind sway, water ripple, flame loops. | `PLANNED` |
| **WG.11.02** | Rigid Geometry Static Rule | Gemini | Enforce static rendering for stone, cliff faces, trunks, walls, floors, structural props. | `PLANNED` |

---

### WG.20 — Semantic Asset Catalogues & Variety Standards

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.20.01** | Semantic Asset Schema & Naming Spec | Gemini | Schema: `BIOME_Z_CATEGORY_TYPE_VARIANT_STATE` with strict metadata requirements. | `PLANNED` |
| **WG.21.01** | Ground Autotile & Macro-Variety Rules | Gemini | Min 1 core autotile + 3–6 subtle variants + 2–4 low-frequency breakups per biome. | `PLANNED` |
| **WG.21.02** | Flora & Silviculture Variety Rules | Gemini | Min 3 micro-flora + 3 small/medium/large shrubs + 3 tree variants + stump + fallen log. | `PLANNED` |
| **WG.21.03** | Geological Variety Rules | Gemini | Min 3 pebble clusters + 3 small + 3 medium rocks + 2–3 boulders + 2 outcrops + scree. | `PLANNED` |
| **WG.22.01–25**| 25 Biome/Z Environment Catalogues | Gemini | Explicit catalogue for each of the 25 combinations (5 biomes $\times$ 5 macro-Z). | `PLANNED` |
| **WG.23.01** | Shared World & Neutral Asset Catalogue | Gemini | Common stone, excavation rubble, neutral soils, generic timber, shared props. | `PLANNED` |
| **WG.24.01–10**| 10 Horizontal Transition Catalogues | Gemini | Explicit blend assets for all 10 pairwise biome transitions. | `PLANNED` |
| **WG.25.01** | Vertical Cliff & Ramp Transition Catalogue | Gemini | Step-down ramps, natural stair formations, vertical cliff faces across all 5 strata. | `PLANNED` |

---

### WG.30 — Permanent RMMZ Atlas Topology & Slot Maps

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.30.01** | Master Sheet Allocation & Dimensions | Gemini | A1 (water/anim), A2 (ground), A3 (buildings), A4 (walls/cliffs), A5 (floors), B–E (props). | `PLANNED` |
| **WG.30.02** | Autotile Block Geometric Mapping | Gemini | Formal 2x3 mini-tile mapping for 48px RMMZ autotile reconstruction. | `PLANNED` |
| **WG.31.01** | Companion Animated Sheet Topology | Gemini | Strict matching coordinate geometry across frames F1, F2, F3 on separate sheets. | `PLANNED` |
| **WG.32.01** | Diagnostic Slotmap Generation (`*_SLOTMAP.png`)| Gemini | Build CLI tool to render transparent grid maps with labeled asset IDs and status overlays. | `PLANNED` |
| **WG.33.01** | Manifest ↔ Atlas Bi-Directional Integrity Checker | Gemini | Automated tool asserting 100% agreement between JSON manifest and atlas slots. | `PLANNED` |

---

### WG.40 — Nano Banana Pro Pipeline & Approval Gates

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.40.01** | Prompt Compilation Architecture | Gemini | Standardized prompt format declaring exact slot dimensions, palette ramps, and references. | `PLANNED` |
| **WG.40.02** | Automated Source Extraction & Palette Snapper | Gemini | Python/Node pipeline to extract raw generated cells and snap strictly to `deus_master_world_palette_v1.hex`. | `PLANNED` |
| **WG.41.01** | Runtime Sheet Insertion & Versioning | Gemini | Scripted insertion into pre-assigned blank sheet slots; update status in manifest. | `PLANNED` |
| **WG.41.02** | Owner Review & Approval Pipeline | Gemini / User | Playtest inspection; user explicit YEA / NAY gate for every visual pack. | `PLANNED` |

---

### WG.50–57 — Visual Asset Production Packs

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.50.01** | Temperate Z0 Ground & Cliff Golden Pack | Gemini | Core loam, fertile grass, limestone cliffs, dirt road, fieldstone. | `PLANNED` |
| **WG.50.02** | Temperate Z0 Flora & Silviculture Golden Pack | Gemini | Common Oak, White Birch, shrubs, reeds, wildflowers, stumps, logs. | `PLANNED` |
| **WG.50.03** | Temperate Z0 Geology & Scatter Golden Pack | Gemini | Limestone boulders, fieldstone clusters, flint pebbles, loose rubble. | `PLANNED` |
| **WG.51.01–04**| Remaining Z0 Biome Packs (WET, ARID, HIGH, VOLC)| Gemini | Complete visual packs for Wetland, Arid, Highland, and Volcanic surface Z0. | `PLANNED` |
| **WG.52.01–10**| 10 Horizontal Pairwise Transition Packs | Gemini | Boundary tiles and transitional scatter across all 10 biome borders. | `PLANNED` |
| **WG.53.01–02**| Positive-Z Alpine & Canopy Packs (Z+1, Z+2) | Gemini | Dwarf pines, scree, alpine meadows, jagged granite crags, cloud margins. | `PLANNED` |
| **WG.54.01–02**| Negative-Z Cavern & Deep Packs (Z-1, Z-2) | Gemini | Subterranean stalagmites, damp slate, basalt floors, magma hazard shores. | `PLANNED` |
| **WG.55.01** | All-Z Physical Cave & Rupture Pack | Gemini | Cave entrances, physical rock arches, rock breaches, vertical shafts. | `PLANNED` |
| **WG.56.01** | Partial-Height Terrain & Micro-Relief Pack | Gemini | 1/5, 2/5, 3/5, 4/5 step-down ledges, eroded gullies, drainage ditches. | `PLANNED` |
| **WG.57.01** | Fluid Depth & Animated Hazard Pack | Gemini | Multi-depth water, shoreline foam, sulfur vents, boiling mud, flowing lava. | `PLANNED` |

---

### WG.60–62 — Economy, Resources & Racial Spawn WorldGen

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.60.01** | Mineral Vein & Ore Deposit Visual Pack | Gemini | Embedded ore textures (Iron, Copper, Silver, Gold, Platinum) across rock types. | `PLANNED` |
| **WG.61.01** | Deterministic 3D Vein WorldGen Generator | Fable | Inject 3D continuous vein clusters into strata matching Balance v0.1 targets. | `QUEUED` (FABLE-20) |
| **WG.61.02** | Closed-Loop Finite Conservation Ledger | Fable | Runtime tracking of mass conservation across mining, crafting, wear, and salvage. | `QUEUED` (FABLE-20) |
| **WG.62.01** | Canonical Initial Racial Spawn WorldGen | Fable | Spawn placement: Z-2 Tiefling/Dragonborn, Z-1 Dwarf/Gnome, Z0 Human/Half-Orc, Z+1 Halfling/Half-Elf, Z+2 Elf. | `QUEUED` |

---

### WG.70–73 — Runtime Placement, Occlusion & Anti-Tiling

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.70.01** | Multi-Scale Placement Algorithm | Fable | Deterministic macro (biomes), meso (groves/clusters), micro (pebbles/grass) scatter. | `PLANNED` |
| **WG.71.01** | Animated Sprite Engine Synchronization | Fable | Global tick-synchronized environmental animation loop with zero CPU heap allocation. | `PLANNED` |
| **WG.72.01** | Five-Z Downward Occlusion Masking | Fable | Terminate downward visibility at first opaque stratum; cache chunk masks. | `PLANNED` |
| **WG.73.01** | Grid-Disappearance & Anti-Tiling Pass | Fable / Gemini | Organic edging, corner jitter, and non-repeating sub-tile breaks. | `PLANNED` |

---

### WG.80–90 — Quality Assurance, Performance & Final Acceptance

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.80.01** | Atlas Completeness & Transparency Audit | Gemini | Verify zero unexpected blank holes, duplicate IDs, or out-of-bounds coordinates. | `PLANNED` |
| **WG.81.01** | 25 Environment Verification Matrix | Gemini / User | Playtest inspection and screenshot verification of all 25 biome/Z expressions. | `PLANNED` |
| **WG.82.01** | 10 Horizontal Transition Verification Matrix | Gemini / User | Visual proof of seamless blending across all 10 biome transition boundaries. | `PLANNED` |
| **WG.83.01** | Cave, Shaft & Vertical Cut Verification Matrix | Gemini / User | Proof of deep cuts (Z0→Z-1, Z-1→Z-2) and interior cave roof occlusion. | `PLANNED` |
| **WG.84.01** | Multi-Seed Procedural WorldGen QA | Gemini | Headless audit over 20 randomized seeds checking stability, viability, and errors. | `PLANNED` |
| **WG.85.01** | Engine Performance, Heap & Load QA | Gemini / Fable | Verify 60 FPS viewport rendering, zero frame spikes, and <3.5MB area memory. | `PLANNED` |
| **WG.86.01** | Golden Master WorldGen Regression Freeze | Gemini / Fable | Automated golden test suite locking worldgen seeds and baseline checksums. | `PLANNED` |
| **WG.90.01** | DEUS WORLDGEN v1 — COMPLETE | User / Gemini | Formal Owner final acceptance and sign-off of complete WorldGen subsystem. | `PLANNED` |

---

## 4. Production Execution Loop Protocol

For every subsequent leaf in this WBS:
```text
SELECT NEXT UNBLOCKED WBS LEAF
        ↓
VERIFY REPOSITORY FACTS
        ↓
DEFINE EXACT OWNERSHIP
        ↓
COMPILE BOUNDED FABLE PROMPT (if Fable)
        ↓
FABLE IMPLEMENTS & TESTS & COMMITS
        ↓
GEMINI REVIEWS DIFF & RUNS INTEGRATION
        ↓
NATIVE RMMZ PLAYTEST PROOF (F5 / NW.JS)
        ↓
OWNER YEA / NAY (when required)
        ↓
MARK LEAF DONE IN WBS & STATUS.md
        ↓
SELECT NEXT UNBLOCKED LEAF
```
*Constraint: Only one implementation leaf active at a time. No exceptions.*
