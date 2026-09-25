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
7. **World Year 0 Starting Principle:** Every standard DEUS New Game begins at World Year 0. Worldgen creates the initial viable Year-0 physical world (geology, 5 macro-Z levels, 5 strata, hydrology, ecology, finite materials, 9 faction starting camps of 8 founders = 72 colonists). History is NOT pre-materialized (no pre-generating centuries of roads, abandoned towns, old kingdoms, historical mines, exhausted veins, battlefield debris, or ancient coins). All history emerges through live simulation. Simulating forward (100, 250, 500 years) is preserved as a developer / simulation / scenario tool, not a standard New Game starting option. The WG.90 completion gate requires a viable living Year-0 world ready for simulation, not pre-aged historical materialization.
8. **Performance Architecture Compliance:** All worldgen, levels, fluids, and depth rendering systems must comply with [`docs/PERFORMANCE_ARCHITECTURE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/PERFORMANCE_ARCHITECTURE.md). Work scales with visible/exposed screen content, not total world size. Hot paths must be zero-allocation. Unexplained performance regressions block canonical integration.

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
WG.63 — Natural Landmark Detection, Cultural Naming & Historical Events
WG.64 — Geology-Driven Features, Karst & Geothermal Systems
WG.65 — World Lifecycle, Geomorphology & Natural Reclamation Architecture
WG.66 — Natural Hydrology, Groundwater & Watershed Architecture
WG.67 — Soil Formation, Fertility & Microclimate Systems
WG.68 — Living Ecology, Flora Succession, Wildlife & Monster Systems
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
| **WG.11.01** | Environmental Animation Cadence | Gemini | Standardize 3 visual variants $\times$ 3 frames for wind sway, water ripple, flame loops, steam wisps, natural hydrology; offscreen culling = 0 CPU cost. | `PLANNED` |
| **WG.11.02** | Rigid Geometry Static Rule | Gemini | Enforce static rendering for stone, cliff faces, trunks, walls, floors, structural props. | `PLANNED` |

---

### WG.20 — Semantic Asset Catalogues & Variety Standards

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.20.01** | Semantic Asset Schema & Naming Spec | Gemini | Schema: `BIOME_Z_CATEGORY_TYPE_VARIANT_STATE`; consumes all `VISUAL_REQUIRED` states from natural systems (groundwater, drainage, soil moisture, succession, wildfire, snowpack, geomorphology, karst, geothermal). | `PLANNED` |
| **WG.21.01** | Ground Autotile & Macro-Variety Rules | Gemini | Min 1 core autotile + 3–6 subtle variants + 2–4 low-frequency breakups per biome; consumes 4 soil moisture bands (`DRY`, `NORMAL`, `MOIST`, `SATURATED`). | `PLANNED` |
| **WG.21.02** | Flora & Silviculture Variety Rules | Gemini | Min 3 micro-flora + 3 small/medium/large shrubs + 3 tree variants + stump + fallen log; accounts for pioneer succession weeds and charred tree skeletons. | `PLANNED` |
| **WG.21.03** | Geological Variety Rules | Gemini | Min 3 pebble clusters + 3 small + 3 medium rocks + 2–3 boulders + 2 outcrops + scree; consumes mineral patinas (Cu, Fe) and karst dissolution textures. | `PLANNED` |
| **WG.22.01–25**| 25 Biome/Z Environment Catalogues | Gemini | Explicit catalogue for each of the 25 combinations (5 biomes $\times$ 5 macro-Z); incorporates biome-specific natural states (VOLC geothermal, HIGH snowpack, WET saturated soil, ZM karst). | `PLANNED` |
| **WG.23.01** | Shared World & Neutral Asset Catalogue | Gemini | Common stone, excavation rubble, neutral soils, generic timber, loose sediment, ash beds, and talus scree. | `PLANNED` |
| **WG.24.01–10**| 10 Horizontal Transition Catalogues | Gemini | Explicit blend assets for all 10 pairwise biome transitions; accounts for natural boundaries (wet $\rightarrow$ dry soil, burned $\rightarrow$ regrowing forest, river $\rightarrow$ floodplain, snow $\rightarrow$ bare). | `PLANNED` |
| **WG.25.01** | Vertical Cliff & Ramp Transition Catalogue | Gemini | Step-down ramps, natural stair formations, vertical cliff faces, cliff seepages, wet rock, karst sinkholes, and cave mouths across all 5 strata. | `PLANNED` |

---

### WG.30 — Permanent RMMZ Atlas Topology & Slot Maps

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.30.01** | Master Sheet Allocation & Dimensions | Gemini | A1 (water/anim/depth 1..5), A2 (ground/moisture), A3 (buildings), A4 (walls/cliffs), A5 (floors), B–E (props/scatter); pre-allocates slots for all natural systems. | `PLANNED` |
| **WG.30.02** | Autotile Block Geometric Mapping | Gemini | Formal 2x3 mini-tile mapping for 48px RMMZ autotile reconstruction. | `PLANNED` |
| **WG.31.01** | Companion Animated Sheet Topology | Gemini | Strict matching coordinate geometry across frames F1, F2, F3 on separate sheets (water, lava, steam, fire). | `PLANNED` |
| **WG.32.01** | Diagnostic Slotmap Generation (`*_SLOTMAP.png`)| Gemini | Build CLI tool to render transparent grid maps with labeled asset IDs and status overlays. | `PLANNED` |
| **WG.33.01** | Manifest ↔ Atlas Bi-Directional Integrity Checker | Gemini | Automated tool asserting 100% agreement between JSON manifest, World-State Registry (`DEUS_WORLD_STATE_REGISTRY.md`), and atlas slots. | `PLANNED` |

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
| **WG.62.01** | Canonical Initial Racial Spawn WorldGen | Fable | Spawn placement: Z-2 Tiefling/Dragonborn, Z-1 Dwarf/Gnome, Z0 Human/Half-Orc, Z+1 Halfling/Half-Elf, Z+2 Elf; seeds 8 multi-hat founders per faction with minimal institutional coverage (cross-ref `SOC.21.01`). | `QUEUED` |

---

### WG.63 — Natural Landmark Detection, Cultural Naming & Historical Events

*Governed by Owner Directive (2026-09-25), [`docs/worldgen/DEUS_NATURAL_WORLD_SYSTEMS.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/worldgen/DEUS_NATURAL_WORLD_SYSTEMS.md), and [`docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md)*  
*Core Principle: Landmarks are algorithmically detected world compositions, not monolithic pre-drawn sprites. Physical entities exist independently of cultural naming.*

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.63.01** | Natural Landmark Detection Algorithm | Fable | Procedural detector identifying monumental waterfalls, natural arches, abyssal chasms, great cavern domes, ancient groves, and calderas from worldgen strata. | `PLANNED` |
| **WG.63.02** | Compositional Landmark Assembly Standard | Gemini | Assemble detected landmarks from standard catalogue tiles, strata ledges, autotiles, and VFX with zero monolithic single-use sprites. | `PLANNED` |
| **WG.63.03** | Persistent Natural Disaster Simulation | Fable | Rare catastrophic events: 100-year river floods, severe droughts, volcanic ash eruptions, earthquakes, and forest fires. | `PLANNED` |
| **WG.63.04** | Disaster Scar Geomorphic Modification | Fable | Disasters carve permanent physical consequences into strata: channel relocations, rock collapses, talus aprons, and burn scar ash beds. | `PLANNED` |
| **WG.63.05** | Decoupled Cultural Place Naming Framework | Gemini / Fable | Immutable physical geographic IDs (`River #83`) paired with subjective faction linguistic cultural names (Human, Dwarf, Elf, Goblin, Orc). | `PLANNED` |
| **WG.63.06** | Historical Lore & Toponymic Evolution | Fable | Factions name landmarks and geography based on historical events (battles, founder deaths, resource discoveries); lore integration with `UF_Look`. | `PLANNED` |

---

### WG.64 — Geology-Driven Features, Karst & Geothermal Systems

*Governed by Owner Directive (2026-09-25), [`docs/worldgen/DEUS_NATURAL_WORLD_SYSTEMS.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/worldgen/DEUS_NATURAL_WORLD_SYSTEMS.md), and [`docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md)*  
*Core Principle: Surface terrain provides visible geological clues (karst, staining, flora) hinting at subterranean strata and resources.*

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.64.01** | Karst Dissolution & Cave Architecture | Fable | Limestone/dolomite dissolution modeling: sinkhole funnels, disappearing streams, underground solution cavities, and stalactite formations. | `PLANNED` |
| **WG.64.02** | Structural Fault Fractures & Chasms | Fable | Tectonic stress fracturing generating all-Z vertical fissures, shear cliffs, and natural subterranean access ways. | `PLANNED` |
| **WG.64.03** | Surface Mineral Patinas & Indicator Flora | Gemini / Fable | Malachite (Cu) and hematite (Fe) mineral seepage staining on cliff faces; metallophyte indicator flora revealing underground veins. | `PLANNED` |
| **WG.64.04** | Geothermal Hot Springs & Mineral Evaporites | Fable | Volcanic/hydrothermal heated water pools, yellow sulfur mineral crusts, boiling mud pots, and mineral terracing. | `PLANNED` |
| **WG.64.05** | Volcanic Fumaroles & Steam Vents | Gemini / Fable | Pressurized steam fissures, porous basalt lava tubes, active volcanic ground variants, and animated steam loop VFX. | `PLANNED` |
| **WG.64.06** | Subterranean Geothermal Heat Transport | Fable | Magma chamber proximity heats surrounding rock strata and cave air; convective air currents and heated subterranean caverns. | `PLANNED` |

---

### WG.65 — World Lifecycle, Geomorphology & Conserved Natural Reclamation

*Governed by Owner Directive (2026-09-25), [`docs/PERFORMANCE_ARCHITECTURE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/PERFORMANCE_ARCHITECTURE.md), and [`docs/INVARIANT_REGISTRY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/INVARIANT_REGISTRY.md)*  
*Core Invariant: "Terrain matter may change form and location, but physical material is not silently deleted or magically respawned."*  
*Canonical Distinction: WorldGen owns initial Year-0 conditions; live world simulation owns post-Year-0 evolution.*

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.65.01** | Material-State Lifecycle Architecture | Gemini / Fable | Define state machine: Natural $\rightarrow$ Excavated $\rightarrow$ Construction/Tailings $\rightarrow$ Rubble $\rightarrow$ Sediment $\rightarrow$ Soil $\rightarrow$ Naturalized. | `PLANNED` |
| **WG.65.02** | Rubble & Debris Strata Representation | Fable | Model loose broken rock occupying physical 1 ft strata cells; support degradation and angle of repose. | `PLANNED` |
| **WG.65.03** | Loose Fill & Sediment Representation | Fable | Strata-level storage for gravel, silt, and alluvial sand deposited by gravity and runoff. | `PLANNED` |
| **WG.65.04** | Structural-Collapse Material Transfer | Fable | Structural ceiling/wall failure converts intact rock/timber strata into falling debris and rubble below. | `PLANNED` |
| **WG.65.05** | Geological Erosion Susceptibility | Gemini | Calculate per-cell weathering rates from slope gradient, rainfall, fluid exposure, and rock hardness. | `PLANNED` |
| **WG.65.06** | Sediment Transport Simulation | Fable | Water runoff and wind transport particulate sediment along hydraulic gradients without teleports. | `PLANNED` |
| **WG.65.07** | Sediment Deposition & Basins | Fable | Abandoned quarries, cuts, and depressions act as catchment basins, filling progressively over decades. | `PLANNED` |
| **WG.65.08** | Soil Formation & Pedogenesis | Fable | Weathering of compacted rubble and sediment into fertile topsoil layers supporting micro-vegetation. | `PLANNED` |
| **WG.65.09** | Vegetation Ecological Succession | Fable | Pioneer weeds $\rightarrow$ grasses $\rightarrow$ scrub $\rightarrow$ woodland $\rightarrow$ climax forest re-vegetation sequence over scars. | `PLANNED` |
| **WG.65.10** | Construction Degradation & Ruins | Fable | Maintained $\rightarrow$ Damaged $\rightarrow$ Ruined $\rightarrow$ Collapsed $\rightarrow$ Overgrown progression based on material longevity. | `PLANNED` |
| **WG.65.11** | Mine & Quarry Geomorphic Reclamation | Fable | Excavated pits stabilize into lakes, cliffs, or marshy depressions; abandoned shafts collapse into sinkholes. | `PLANNED` |
| **WG.65.12** | Water-Driven Landscape Reclamation | Fable | Groundwater pooling, aquifer breach flooding, and natural channel cutting through abandoned cuts. | `PLANNED` |
| **WG.65.13** | Long-Time Deterministic Catch-Up | Fable | Century-scale fast-forward simulation calculating accumulated landscape evolution without per-frame ticks. | `PLANNED` |
| **WG.65.14** | Disturbed-Region Active-Work Scheduler | Fable | Bounded tracking: only altered regions undergo reclamation work; stable natural regions consume 0 ms CPU. | `PLANNED` |
| **WG.65.15** | Closed-Loop Geomass & Resource Verifier| Gemini | Automated audit proving total geomass is conserved and finite metals (Fe, Cu, Ag, Au, Pt) never regenerate. | `PLANNED` |
| **WG.65.16** | Historical Terrain Provenance & Stratigraphy| Gemini / Fable | Sparse metadata recording whether strata are natural, excavated, constructed, collapsed, or naturalized. | `PLANNED` |
| **WG.65.17** | Emergent Archaeology & Subsurface Recovery| Fable | Subsurface excavation exposes genuine historical ruins, buried foundations, and forgotten artifacts. | `PLANNED` |
| **WG.65.18** | Naturalization Quality Assurance & Proof | Gemini / User | Multi-century stress test proving zero mass leaks, steady 60 FPS, and naturalistic landscape stabilization. | `PLANNED` |

---

### WG.66 — Natural Hydrology, Groundwater & Watershed Architecture

*Governed by Owner Directive (2026-09-25), [`docs/worldgen/DEUS_NATURAL_WORLD_SYSTEMS.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/worldgen/DEUS_NATURAL_WORLD_SYSTEMS.md), and [`docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md)*  
*Core Principle: Water stores, flows, and drains through physical five-strata geometry; surface drainage derives from real topography.*

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.66.01** | Subterranean Water Table & Aquifer Model | Fable | Physical strata-level pore water storage; hydrostatic pressure head, equilibrium water table depth across biomes. | `PLANNED` |
| **WG.66.02** | Hillside Springs & Weeping Rock Seeps | Fable | Natural water table emergence on hill slopes and cliff faces; spring head pools and trickling rock seeps. | `PLANNED` |
| **WG.66.03** | Subterranean Lakes, Rivers & Mine Flooding | Fable | Negative-Z cave lakes and underground streams; excavation breaches into aquifers trigger realistic mine flooding. | `PLANNED` |
| **WG.66.04** | Topographical Watershed & Ridgeline Solver | Fable | Elevation-derived drainage divides, gravity flow vectors, natural catchment basins, and runoff accumulation. | `PLANNED` |
| **WG.66.05** | River Channel, Tributary & Confluence Formation | Fable | Headwater streams converging into hierarchical tributaries and mainstem river channels carved into strata. | `PLANNED` |
| **WG.66.06** | Floodplains, Meanders & Delta Silt Deposition | Fable | Seasonal riverbank overflow, fertile silt deposits on valley floodplains, and braided sediment deltas. | `PLANNED` |
| **WG.66.07** | Seasonal Snowpack Accumulation & Melt Pulses | Fable | High-altitude winter snow accumulation (1..3 strata); spring thaw temperature pulses driving heavy runoff into rivers. | `PLANNED` |
| **WG.66.08** | Surface Freezing & Seasonal Wetland Cycles | Fable | Sub-freezing surface ice formation over water bodies; summer evaporation drying seasonal wetlands into cracked mud. | `PLANNED` |

---

### WG.67 — Soil Formation, Fertility & Microclimate Systems

*Governed by Owner Directive (2026-09-25), [`docs/worldgen/DEUS_NATURAL_WORLD_SYSTEMS.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/worldgen/DEUS_NATURAL_WORLD_SYSTEMS.md), and [`docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md)*  
*Core Principle: Soil derives from parent rock, sediment, and moisture; microclimates create rich localized variety without multiplying biomes.*

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.67.01** | Geological Pedogenesis & Soil Texture | Fable | Soil formation derived from underlying parent geology: limestone fertile loam, basalt rich clay, granite sandy soil. | `PLANNED` |
| **WG.67.02** | Four-Band Soil Moisture & Fertility Model | Gemini / Fable | Map continuous fertility/moisture into 4 discrete visual bands: `DRY`, `NORMAL`, `MOIST`, `SATURATED`; modulates farming yields. | `PLANNED` |
| **WG.67.03** | Agricultural Depletion & Silt Replenishment | Fable | Intensive farming depletes topsoil fertility; seasonal river flooding deposits nutrient-rich alluvium restoring yields. | `PLANNED` |
| **WG.67.04** | Topographical Elevation & Aspect Microclimates | Fable | Temperature lapse rate cooling with altitude; south-facing slopes receive higher solar warmth, north slopes remain moist/cool. | `PLANNED` |
| **WG.67.05** | Rain Shadows & Valley Cold Pooling | Fable | Mountain ridges block precipitation creating dry leeward microclimates; nocturnal dense cold air drains into frost pockets. | `PLANNED` |
| **WG.67.06** | Geothermal & Vegetative Thermal Havens | Fable | Hot spring warmth enables sub-tropical flora in cold biomes; dense forest canopies buffer ground from extreme heat and frost. | `PLANNED` |

---

### WG.68 — Living Ecology, Flora Succession, Wildlife & Monster Systems

*Governed by Owner Directive (2026-09-25), [`docs/worldgen/DEUS_CREATURE_ECOLOGY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/worldgen/DEUS_CREATURE_ECOLOGY.md), [`docs/worldgen/DEUS_NATURAL_WORLD_SYSTEMS.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/worldgen/DEUS_NATURAL_WORLD_SYSTEMS.md), and [`docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md)*  
*Core Principle: Wildlife and monsters share one underlying living-world ecology framework (habitat suitability, persistent populations, carrying capacity, food webs, lairs, migration); supernatural exceptions override specific biological rules without creating separate spawn architectures.*

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.68.01** | Multi-Stage Plant Ecological Succession | Fable | Deterministic recovery sequence over disturbed terrain: Bare $\rightarrow$ Pioneer Weeds $\rightarrow$ Grass $\rightarrow$ Scrub $\rightarrow$ Woodland $\rightarrow$ Climax. | `PLANNED` |
| **WG.68.02** | Biome-Specific Succession Pathways | Fable | Distinct ecological succession sequences tailored for Temperate, Wetland, Arid, Highland, and Volcanic biomes. | `PLANNED` |
| **WG.68.03** | Disturbance Reset & Pioneer Colonization | Fable | Logging, wildfire, overgrazing, or excavation resets local succession stage; pioneer species colonize bare mineral soil. | `PLANNED` |
| **WG.68.04** | Spatially Bounded Wildfire Simulation | Fable | Ignition from lightning, lava, or campfires; fire propagation driven by fuel moisture, fuel load, wind vector, and slope. | `PLANNED` |
| **WG.68.05** | Active-Front Fire Queue & Event-Driven Burning | Fable | Zero per-frame cost for dormant vegetation; simulation ticks only active combustion fronts in localized dirty bounding boxes. | `PLANNED` |
| **WG.68.06** | Burn Scars, Ash Beds & Fireweed Regrowth | Gemini / Fable | Post-fire charred tree skeletons, scorched earth, soot beds, and rapid colonization by specialized fireweed flora. | `PLANNED` |
| **WG.68.07** | Unified Creature Ecology Model | Fable | Common biological & ecological schema for wildlife, domestic animals, and biological monsters. | `PLANNED` |
| **WG.68.08** | Habitat Suitability & Carrying Capacity Solver | Fable | Physical terrain suitability determines creature presence; zero arbitrary timer-based spawn points. | `PLANNED` |
| **WG.68.09** | Food-Web Dynamics, Predation & Scavenging | Fable | Multi-tiered food web (Producers $\rightarrow$ Herbivores $\rightarrow$ Predators $\rightarrow$ Apex Beasts $\rightarrow$ Scavengers); trophic cascades. | `PLANNED` |
| **WG.68.10** | Territorial Home Ranges, Dens, Nests & Lairs | Fable | Physical creature habitations (burrows, dens, canopy nests, cave lairs, ruin lairs); territorial defense. | `PLANNED` |
| **WG.68.11** | Persistent Populations & Local Extirpation | Fable | Persistent population tracking; overhunting causes local extirpation; zero infinite magical respawning. | `PLANNED` |
| **WG.68.12** | Regional Seasonal Migration & Disturbance Fleeing| Fable | Coarse regional animal migration between altitudes and biomes; flight from wildfire, flood, or hunting. | `PLANNED` |
| **WG.68.13** | Monster Supernatural Overrides & Exceptions | Fable | Override framework for undead, elementals, constructs, summoned entities, slimes, and ancient dragons. | `PLANNED` |
| **WG.68.14** | Civilization Interactions & Ecological Feedback | Fable | 10 behavioral archetypes (human-avoidant, scavenger, livestock-predator, crop-pest, etc.); colonist pressure. | `PLANNED` |
| **WG.68.15** | Master Semantic Creature Catalogue & Gate | Gemini | Register all approved wildlife & monster species with dimensions, ecology profiles, and atlas destinations before art generation. | `PLANNED` |
| **WG.68.16** | Shared Creature Animation & Behavior Primitives | Gemini / Fable | Universal 12-sprite layout standard ($144\times 192$ or $288\times 384$ px); shared behavior tree primitives. | `PLANNED` |

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
| **WG.90.01** | DEUS WORLDGEN v1 — COMPLETE | User / Gemini | Formal Owner final acceptance and sign-off of complete Year-0 WorldGen subsystem (viable, solvable, living Year-0 world ready for simulation). | `PLANNED` |

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
