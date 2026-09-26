# DEUS WorldGen Work Breakdown Structure

**Namespace:** WG  
**Rev:** 26  
**IDs:** Stable. Next free in WG.00 is WG.00.25  
**Canonical Authority:** the Owner approves; the Coordinator records; the PM signs off.  
**Status:** CANONICAL ON MAIN  
**Permanent Project-Control Anchor:** WBS IDs are immutable. Never silently renumber, merge, or reuse them. Once committed, a leaf changes only by status (`PLANNED` → `DONE`) or retirement via `SUPERSEDED`.

---

## 1. Executive Mandate & Production Principles

This document defines the authoritative, step-by-step path from the initial five-strata physical world foundation all the way to **DEUS WORLDGEN v1 — COMPLETE**.

### Binding Production Rules
1. **Linear vs Parallel Execution:** Formerly strictly linear; superseded by parallel-lane policy ([`docs/STATUS.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/STATUS.md) §3). Multiple independent lanes may execute concurrently with non-overlapping write sets under the merge gate.
2. **Repository Facts Over Assumptions:** Every leaf begins by verifying repository facts and dependencies.
3. **Strict Separation of Concerns (Canonically defined in [`docs/CANONICAL_ROLES.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/CANONICAL_ROLES.md)):**
   - **Gemini:** Coordinator, Integration Authority, WBS Controller. Manages task routing, merges, origin pushes. Zero engine code edits; no QC or self-certification authority.
   - **Fable / Claude:** Primary implementer for engine, simulation, and society leaves.
   - **Grok:** Independent adversarial review, mutation testing, invariant attacks, and verification sign-offs.
   - **Nano Banana Pro:** [FROZEN per DEC-007] Zero art generation without direct Owner involvement.
4. **Actual RMMZ Runtime Verification:** Definition of Done requires running in actual RMMZ Playtest (NW.js / F5) for visual leaves. Automated test harnesses must prove capability to fail (Rule 4); non-visual leaves verify via automated proof gates (DEC-001).
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
WG.56 — Partial-Height Terrain & Micro-RelIEF Art Pack
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

| WBS Leaf | Title | Owner | Scope & Deliverables | Status | closedBy |
| :--- | :--- | :---: | :--- | :---: | :---: |
| **WG.00.01** | World-Art Visual Charter | Gemini | Flat 3/4 top-down 2D, serious chibi (3.0–3.2 heads), grounded, no isometric walls. | `DONE` (DW.01.01) | |
| **WG.00.02** | Native 1:1 Resolution Standard | Gemini | Native 48px tile grid, 1:1 pixel density, binary alpha, anti-fraud checks. | `DONE` (DW.01.02) | |
| **WG.00.03** | Human / World Scale Standard | Gemini | 42px Adult Human yardstick, 39 canonical scale classes, locked 1.00x camera. | `DONE` (DW.01.03) | |
| **WG.00.04** | Biome Identity Standard | Gemini | 5 canonical biomes (`TEMP`, `WET`, `ARID`, `HIGH`, `VOLC`), physical-Z hooks, 10 transitions. | `DONE` (DW.01.04) | |
| **WG.00.05** | Palette Architecture & Material Ramps | Gemini | Master Palette V1 (226 active, 30 reserve), 58 material ramps, 0 near-duplicates. | `DONE` (DW.01.05) | |
| **WG.00.06** | Five-Strata Geometry Foundation | Fable / Gemini | Strata storage (5x1ft/cell), derived cached shapes, damage API, native smoke gate. | `DONE` (FABLE-19A / edba004) | |
| **WG.00.07** | Fluid ↔ Strata Reconciliation | Gemini | Resolve fluid depth adapter (0..7) with physical strata (0..4, S0-S4), buoyancy, saturation. | `DONE` (2f47203) | |
| **WG.00.08** | Cuts + Caves on All Five Z | Fable / Gemini | Partial-height terrain, chasms, sinkholes, Z0→Z-1 & Z-1→Z-2 deep cuts, cave roofs. | `REVIEWED-PASS-WITH-MINORS` (Merged 0016-P) | Grok (`tasks/WG.00.08/grok_verification.md` @ `e3af4cfa`) |
| **WG.00.09** | Global Five-Z Depth Renderer | Fable | Five-plane compositor, physical scale recession, no blur, chunk exposure cache. | `QUEUED` (FABLE-19C / DEFINE/PRE-ATTACK active in Lane E) | |
| **WG.00.10** | Startup & Load Performance Baseline | Gemini / Fable | 256x256x5 area memory budget (<3.5MB), tick budget (<0.2ms), load time benchmarks. | `QUEUED` | |
| **WG.00.11** | Incarnation & Command Layer | Fable / Gemini | Player avatar direct possession vs top-down RTS colonist command switching, input arbitration, camera follow. | `QUEUED` | |
| **WG.00.12** | Consolidation Without Moving Files | Codex / Claude Subagent | Non-moving consolidation tooling, boot/load census, RMMZ battle stack audit, tested external backup. | `IN_PROGRESS` (C2b; C1/C2/C3/F merged) | |
| **WG.00.13** | Master Palette Engine Migration | Fable / Gemini | Planned engine, shader, and tooling migration from runtime uf.hex to deus_master_world_palette_v1.hex (226 colors); dedicated harness & tests. | `PLANNED` | |
| **WG.00.14** | Year-0 Contract (INV-SIM-01) | Claude | No pre-Year-0 simulated history at new game. Alias note: work filed under `tasks/WG.00.11/` (commits `37ac57da`, `0859ed3c`, `a8e42502`); folder not renamed. | `DONE-unverified` | |
| **WG.00.15** | M-GEN-01: Vertical Biome Coupling | Claude | M-GEN-01: vertical biome coupling, plus raising `survey.tested` cap from 12 to 64. | `PLANNED` | |
| **WG.00.16** | Depth-Shading Revisit After Palette Migration | Claude / Owner | Options memo with harness renders; Owner ruling recorded as update to DEC-006. | `PLANNED` | |
| **WG.00.17** | Z-Range Configurable Setting & Expansion to 32 Layers | Claude | Make Z-range a single configurable setting in engine core, then expand to 32 layers (-16..+15: surface 0, 16 underground -1..-16, 15 upper +1..+15, 320 ft total height, 10 ft layers, 2 ft strata). Refactor hardcoded spots (DEUS_Levels.js L1137 fixed maps, L1805 +2 offset/slice cap 24, all +2/5/24 assumptions). Mandatory sparse storage: memory and save size scale with occupied cells, not 32 × area (empty sky and solid rock cost near zero). Must maintain support for running at 9 layers in automated tests. Depends on Lanes K and N merging; inputs: ADR-003. Do NOT open code lane yet. | `PLANNED` | |
| **WG.00.18** | Layer-View Presentation (Owner-Led) | Owner / Claude | Depth presentation (lighting, fog, atmosphere, colour grading of lower layers, parallax or none) designed directly with Owner after Lanes K, N, and WG.00.17 land. Governed by visual goal "looking down layers must be beautiful and breathtaking". DEC-011 governs until opened with Owner. | `PLANNED` | |
| **WG.00.19** | In-Layer Height Presentation & Multi-Strata Movement | Claude / Grok | Characters/objects drawn raised by fixed pixel offset per stratum of ground height (straight shift, no scale; DEC-011/DEC-016 compliant). Movement: 1 stratum (2 ft) normal step, 2 strata (4 ft) climb/jump, full layer (10 ft) requires stairs/ladder/ramp. Falling damage, melee reach, LOS use real height differences. | `PLANNED` | |
| **WG.00.20** | Seamless Inter-Layer Ramps & Camera-Follow Connector | Claude / Grok | Run of cells rising one stratum per cell (5 cells = one 10 ft layer); unit's Z becomes Z+1 at top stratum with zero transfer/fade/pause. Camera follows player automatically (default Owner decision). Non-player units transfer layer memberships. Multi-Z pathfinding traversable connector. Colonist construction. (DEC-017; dep: Lane N, WG.00.19). | `PLANNED` | |
| **WG.00.21** | Layer Occlusion Culling Rule & Exposed-Area Bound | Claude / Grok | Anything covered by opaque upper layer is not drawn (tiles, units, effects). Draw cost bounded by exposed visible screen area (V133). Traverses from viewed layer down to first opaque surface; cells under solid cover cost zero. Benchmark: 32-layer stress scene costs approx same as 5 layers when solid. (DEC-018; dep: Lane K follow-up, WG.00.17). | `PLANNED` | |
| **WG.00.22** | Multi-Depth Presentation Catalogue Slots & Asset Placeholders | Gemini / Codex | Catalogue entries and blank tile/sprite slots for depth cues 1–6: visible inner side walls of openings, rim shadows cast onto lower layers, darker baked tile palettes, height edges and ramps, hanging/falling props (roots, vines, stalactites, waterfalls, dust, light shafts), deep light sources against darkness. Data manifests and blank slots only; zero art generation (DEC-007; DEC-011 amendment). | `PLANNED` | |
| **WG.00.23** | Overlook Zoom-Out Multi-Layer View (Owner-Led Placeholder) | Owner / Claude | Future overlook zoom-out view where units on multiple layers are visibly moving. Sequenced post-K, post-N, post-32-layer refactor, and post-benchmark headroom proof. Simplified/low-detail sprites and capped animation rates at far zoom. DEC-011 1:1 scale lock governs now. | `PLANNED` | |
| **WG.00.24** | Custom Multi-Layer PixiJS Map Renderer (Fallback) | Owner / Claude | Benchmark-gated fallback map renderer inside RMMZ Scene_Map. Replaces stock Spriteset_Map/Tilemap if stock renderer cannot meet 32 layers, occlusion culling, and 1:1 flat rendering within frame budget. Menus, dialogue, save, database, and battle remain stock RMMZ. Gated on Lane K normal + 0019-T stress baselines, §18 occlusion benchmark, and Owner go/no-go. Zero code opened before benchmarks. (DEC-017; Directive 0028-AC §4). | `PLANNED` | |


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
| **WG.20.01** | Semantic Asset Schema & Naming Spec | Gemini | Schema: `BIOME_Z_CATEGORY_TYPE_VARIANT_STATE`; consumes all `VISUAL_REQUIRED` states from natural systems. **NO ART GENERATION, BY ANYONE**. | `PLANNED` |
| **WG.20.02** | Unified Art Catalogue (Lane S) | Claude / Grok | Machine-readable manifest (`art/catalogue/**`, `docs/art/catalogue/**`, `tools/art/build_catalogue.js`, `tools/art/test_catalogue.js`, `tools/art/fixtures/catalogue/**`). Governed by DEC-016 scale chart and DEC-013 geometry (5 ft cells, 10 ft layers, 5 strata of 2 ft per layer, 32 layers -16..+15 in `art/catalogue/geometry.json`). Organised across 25 biomes in 5 vertical bands. Adds slots for edge/cliff strips (1–5 strata), ramps/slopes, decay-stage overlays, opening wall faces, rim shadows, depth palettes, hanging props, deep light sources. Schema `deus-art-catalogue/1.1.0`, deterministic `build_catalogue.js --check`, 100% coverage, ≥10 Grok mutants killed. Contains entries/slots only, status MISSING, zero image data. **NO ART GENERATION, BY ANYONE**. | `PLANNED` |
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
| **WG.32.01** | Diagnostic Slotmap Generation (`*_SLOTMAP.png`)| Gemini | Build CLI tool to render transparent grid maps with labeled asset IDs and status overlays. **NO ART GENERATION, BY ANYONE**. | `PLANNED` |
| **WG.32.02** | Blank Template Sheets (Lane T) | Claude / Grok | Blank template generator (`tools/art/make_blank_templates.js`, `tools/art/test_blank_templates.js`, `tools/art/fixtures/templates/**`, `art/templates/**`). Consumes catalogue; generates one empty template sheet per catalogue sheet with grid, slot IDs, background outside master palette; byte-identical on rerun. **NO ART GENERATION, BY ANYONE**. | `PLANNED` |
| **WG.33.01** | Manifest   Atlas Bi-Directional Integrity Checker | Gemini | Automated tool asserting 100% agreement between JSON manifest, World-State Registry (`DEUS_WORLD_STATE_REGISTRY.md`), and atlas slots. | `DONE` |

---

### WG.40 — Nano Banana Pro Source Art Generation Pipeline (SUSPENDED under DEC-007; WG.40.02 limited to Owner-supplied art)

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **WG.40.01** | Prompt Compilation Architecture | Gemini | Standardized prompt format declaring exact slot dimensions, palette ramps, and references. (SUSPENDED under DEC-007) | `PLANNED` |
| **WG.40.02** | Automated Source Extraction & Palette Snapper | Gemini | Python/Node pipeline to extract raw cells and snap strictly to `deus_master_world_palette_v1.hex` (limited to Owner-supplied art). | `PLANNED` |
| **WG.41.01** | Placement & Validator Tooling (Lane U) | Claude / Grok | Tooling pipeline (`tools/art/place_art.js`, `tools/art/validate_art.js`, `tools/art/test_place_art.js`, `tools/art/fixtures/place/**`, `docs/art/APPROVALS_FORMAT.md`). `art/APPROVALS.md` is Owner-only. Validates Owner-approved art against scale chart (DEC-016), master palette, dimensions, template residue; places pixels 1:1 into template slots; DERIVED_PENDING for variants. Tests use synthetic run-time blocks only. **NO ART GENERATION, BY ANYONE**. | `PLANNED` |
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
| **WG.62.02** | Race Home-Layer Assignment in WorldGen | Fable | Procedural spawn placement and native habitat generation for 9 races across 32 Z layers (-16..+15) and 5 vertical biome bands (Lower-2 -16..-9, Lower-1 -8..-1, Surface 0..+3, Upper-1 +4..+9, Upper-2 +10..+15). Soft home layer ranges with cross-layer travel/trade/war. Depends on WG.00.17 and race design doc. | `PLANNED` |

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

---

---

## 5. Master WBS packages (Rev 18, Owner-approved 2026-09-26)

### 5.1 ID Scheme & Namespaces

3. **New non-world namespaces.** The format is `NS.BB.LL`. An ID is immutable once minted and can only be retired via `SUPERSEDED`.
   - **OPS.BB.LL**: operations and governance. 10 = integration gates, 20 = worker pipeline, 30 = tests and CI, 40 = governance docs and protocol, 50 = machine, backup and migration, 60 = repo hygiene and salvage, 70 = governance tooling.
   - Art labels `ART-A` and `ART-B` are the existing `docs/SLICES.md` "Art phase A/B" names. They are kept as labels, not minted.
   - **SIM.BB.LL**: simulation work with no existing leaf. 00 = sim architecture (sim/render split, headless core, snapshot interface, migration; *Owner-ordered 2026-09-26*), 10 = history and population, 20 = death forensics, 30 = level-of-detail simulation (*Owner-ordered 2026-09-26*), 90 = defects.
   - **GP.BB.LL**: gameplay slice gates with no WB block. GP.03–GP.08 are Slices 3–8; GP.10 is SRD crafting.
   - **REL.BB.LL**: release. 10 = content legality, 20 = engineering gates, 30 = sign-off gates.
4. **Sub-packages of an in-flight leaf** use `<leaf>/<lane>` (e.g. `WG.00.12/C2b`) or `<leaf>a/b/c` (WG.00.09a–c). These are PM work-package labels, not new WBS leaves.

---

### M0 — Operations & Governance

#### M0.1 WG.00.12 Consolidation Without Moving Files Sub-Packages
*Parent leaf: WG.00.12 Consolidation Without Moving Files (see §3 WG.00 table; also WB-004).*

| ID | Title | Status (evidence) | Source | Depends on | Writer → Reviewer | Definition of done | Size | Gate |
|---|---|---|---|---|---|---|---|---|
| WG.00.12/C1 | External backup script `tools/backup_project.ps1` | DONE-unverified. Merged `e07c86ea`; no independent review found [OPS §7] | STATUS §2 Lane C1; commit `4a3a56f8` | — | Claude → Grok | Grok artifact `tasks/WG.00.12/review_grok_4a3a56f8.md` including a restore drill: back up, restore into `%TEMP%`, then `node tools/test_strata_foundation.js` exits 0 there | S | — |
| WG.00.12/C2 | `check_claims.js` v1 | SUPERSEDED by C2b. Merged `83bcc1a7`. It has about 40 bypasses and rejects 62 of 82 real commits [OPS R2] | `tasks/WG.00.12/c2_governance_state.md` | — | — | Closes when C2b closes | — | — |
| WG.00.12/C2b | Governance checker hardening (Directive 001-I §C) | IN_PROGRESS on `task/lane-c2b` (at `a12f94a7`; no commit seen as of 23:12) | STATUS §1 and §2 Lane C2b; [MD M2] (path conflict) | C2 | Claude → Grok (re-attack) | `node tools/governance/test_check_claims.js` exits 0, including the PM bypass cases. `check_claims.js --range HEAD~71..HEAD` rejects only true positives, each listed. Every new rule is seen to fail. Grok re-attack artifact says PASS. The write-set path conflict (`c2_governance_state.md` vs `c2b_governance_hardening.md`) is resolved [MD M2] | M | — |
| WG.00.12/C3 | ADR-002 Rev 2: palette canonicalization (`uf.hex` canonical for runtime) | REVIEW. Merged `8db39b0b`; the ADR says PROPOSED; no Grok review recorded [MD M11] | `docs/adr/ADR-002-Palette-Canonicalization.md:3`; `tasks/WG.00.12/c3_state.md` | — | Claude → Grok | Grok review artifact on `70dad277`; Coordinator acceptance line in the ADR; ADR index in `docs/adr/README.md` [MD m4] | S | — |
| WG.00.12/F | OneDrive link rewrite prep | DONE-unverified. Merged `d09a1295`. Prepared but **not applied**; the lane brief named no reviewer | `tasks/lane-f/state.md`; `docs/migration/*` | — | Claude → Grok | Grok review of `23559316`; the diff itself is applied in OPS.50.04 | S | — |
| WG.00.12/CENSUS | Boot/load census `tools/performance/census_boot_load.js` | DONE-unverified (authored per `tasks/WG.00.12/state.md`, "What is Done" item 2) | `tasks/WG.00.12/state.md` | — | Claude → Grok | Grok re-runs it on a fresh clone and checks the output against the plugin list | S | — |
| WG.00.12/ADR-001 | RMMZ battle-stack audit | DONE-unverified. ACCEPTED with Gemini as reviewer [MD M16] | `docs/adr/ADR-001-RMMZ-Battle-Stack-Audit.md:5` | — | Claude (doc owner) → Grok | Grok review artifact; the ADR status line names an independent reviewer | S | — |

#### M0.2 Integration gates (OPS.10)

| ID | Title | Status | Source | Depends on | Writer → Reviewer | Definition of done | Size | Gate |
|---|---|---|---|---|---|---|---|---|
| OPS.10.01 | **Merge gate** `tools/ops/merge_gate.ps1` (planned Lane I), plus a script-generated board hash table | PLANNED | [OPS] R1 fix, §4 Flow step 5, §6 Workers | OPS.30.01 (gate list; a stub is fine at first); WG.00.12/C2b (for the check_claims clause) | Claude → Grok (mutation) | In a fresh-clone harness the gate **refuses** 4 fixture branches: (a) no review artifact; (b) review by the same agent prefix; (c) a failing GATE suite; (d) a file outside the lane whitelist. It merges a clean fixture branch with `--no-ff`. It prints raw `git rev-parse` and `git ls-remote` output with `EXIT=` lines. A Grok mutation artifact shows every refusal clause is load-bearing | M | — |
| OPS.10.02 | Bring the independent review artifacts to main: `16fec107` (`tasks/WG.00.08/grok_verification.md`) and `ed757456` (`tasks/WG.00.11/review_8d1c7c37.md`), **without** the lane-a `state.md` edits | PLANNED (needs PM approval) | [MD] M9, C10 | OPS.10.01 (preferred) | Gemini (integration only) → PM | `git show main:tasks/WG.00.08/grok_verification.md` and `git show main:tasks/WG.00.11/review_8d1c7c37.md` both succeed; `tasks/WG.00.08/state.md` still reads "exit 1, not reproduced" | S | — |
| OPS.10.03 | Scheduled integration pass: Task Scheduler runs `merge_gate --all-ready` every 30 min; plus an inbox toast watcher | PLANNED | [OPS] §4 Cadence | OPS.10.01; OD-11 | Claude → Grok | The task shows in `schtasks /query`; a dry-run log shows a ready fixture lane merged and a not-ready one skipped with a reason | S | **OWNER-GATED** (decision: target organization, OD-11) |

#### M0.3 Worker pipeline (OPS.20)

| ID | Title | Status | Source | Depends on | Writer → Reviewer | Definition of done | Size | Gate |
|---|---|---|---|---|---|---|---|---|
| OPS.20.01 | **Standard worker launcher** `tools/ops/launch_worker.ps1` (planned Lane J) | PLANNED | [OPS] R8, §4 Flow step 2 | — | Claude → Grok | The launcher: refuses an empty or missing BRIEF; writes a non-empty `logs/<lane>/<runid>.jsonl` (stream-json); writes an exit-code file; enforces a hard timeout on a `sleep` fixture; heartbeats on log mtime; writes the `active_workers.json` entry at start and at exit; states the headless bypass flag explicitly. Grok mutants (timeout removed, registry not written) are caught | M | — |
| OPS.20.02 | Pre-push role guard: `DEUS_ROLE=worker` blocked, integrator allowed (Lane J) | PLANNED | [OPS] R6 | dep: OPS.20.01 | Claude → Grok | In a throwaway repo, a push as worker exits non-zero with a message, and a push as integrator succeeds. Grok's bypass attempts (env unset, renamed hook) are listed and handled | S | — |
| OPS.20.03 | Per-agent git identity: `GIT_AUTHOR_NAME/EMAIL` and committer set per agent (Lane J) | PLANNED | [OPS] R6 (all 631 commits are authored "snewt") | dep: OPS.20.01 | Claude → Grok | A commit made through the launcher shows the agent's identity in `git log --format='%an %ae'`, and the `[agent]` subject prefix matches the author | S | — |
| OPS.20.04 | Track BRIEFs as `tasks/<lane>/BRIEF.md` with a machine-readable write-set block, and save the launch prompt verbatim (`.gitignore` already whitelists `/tasks/`) | PLANNED | [MD] M10; [OPS] R5 | — | Gemini (brief author) → PM | Every active lane branch has a non-empty, committed `tasks/<lane>/BRIEF.md` and `tasks/<lane>/PROMPT.txt`; superseded briefs are marked | S | — |
| OPS.20.05 | Watchdog every 5 min, and a truthful `docs/telemetry/sessions/active_workers.json` | PLANNED. The registry read `[]` while 3–4 workers were running | [OPS] R8; [MD] C9 | dep: OPS.20.01 | Claude → Grok | Killing a fixture worker gets it flagged within 5 min, followed by one auto-resume with the same BRIEF. Registry fields: lane, provider, task id, PID, worktree, branch, start time, brief path | S | — |

#### M0.4 Tests & CI (OPS.30)

| ID | Title | Status | Source | Depends on | Writer → Reviewer | Definition of done | Size | Gate |
|---|---|---|---|---|---|---|---|---|
| OPS.30.01 | **GATE suite list and quarantine list**: `tools/ops/gate_suites.json`, `tools/ops/quarantine.json`, `tools/ops/run_gate.js` | PLANNED | [OPS] R9; §5 gate suites | — | Claude → Grok | GATE holds the 9 suites that exit 0 on a fresh clone [OPS §5], plus `test_generated_z2_cut_proof.js` once WG.00.08 lands. Quarantine lists the 68 failing and 9 killed suites, each with a category (missing dependency, API drift, missing reference, other). `run_gate.js` on a fresh clone exits 0, and exits 1 when one suite is deliberately broken. It no longer relies on the `tools/classify_tests.js` heuristic | M | — |
| OPS.30.02 | CI workflow `.github/workflows/gate.yml`: node-only GATE suites on pushes to `main` and `task/*`, plus branch protection | PLANNED (no `.github/` exists) | [OPS] R2; §6 Owner item 6 | dep: OPS.30.01 | Claude → Grok; the Owner applies the GitHub settings | A probe push shows a green run; a deliberately failing probe shows a red run; branch protection on `main` requires the status check and forbids force-push; the repo is confirmed private | S | **OWNER-GATED** (decision plus GitHub admin, OD-12) |
| OPS.30.03 | Install hooks: pre-commit `check_claims`; pre-push range gate plus role guard | BLOCKED until Grok passes C2b **and** Lane E merges (001-I §C) | STATUS §1 (Lane C2 line); [MD M1] | WG.00.12/C2b, WG.00.09a, OPS.20.02 | Claude → Grok | `core.hooksPath` is set or the hook files exist; a commit that breaks Rule 4.1 is rejected; a `--no-verify` attempt is handled per DEC-004 | S | **OWNER-GATED** (decision: DEC-004 bypass policy) |
| OPS.30.04 | Fix the rotted tests (68 fail, 9 killed), and migrate test paths off the 17 NEEDS_MIGRATION UF_* shims (Consolidation Phase 6) | PLANNED | [OPS] R9; `docs/CONSOLIDATION_PLAN_V1.md` §3 and Phase 6 | dep: OPS.30.01 | Claude → Grok | Each quarantined suite is either fixed and promoted, archived with a reason, or kept in quarantine with a named owner. The fresh-clone pass count is reported before and after, from sequential runs with a per-command exit code | L | — |
| OPS.30.05 | NW.js harness (`run_tests.bat`) baseline run | PLANNED (neither audit ran it) | [OPS] §5 last bullet, §7 | a quiet window (no live workers) | Claude → Grok | Log and exit code committed under `tasks/OPS.30.05/`; each failure filed as a defect | S | — |

#### M0.5 Governance docs & protocol (OPS.40)

| ID | Title | Status | Source | Depends on | Writer → Reviewer | Definition of done | Size | Gate |
|---|---|---|---|---|---|---|---|---|
| OPS.40.01 | **Rewrite the instruction files** (`AGENTS.md`, `GEMINI.md`, `CLAUDE.md`; optionally a new `GROK.md`). Suspend or remove art Rules 11 and 13, `GEMINI.md:52` and `AGENTS.md:105-113`. Add a "Global process rules" block: containment; `EXIT=$LASTEXITCODE` after each command; only the integrator pushes; reviewers form an independent first verdict; a `-p` session reads its prompt only at launch | PARTIAL. The DEC-007 banner landed in `1d3bce06`; the rules under it are unchanged | [MD] C1, C2, M6, M7, m3 | — | PM drafts → Owner approves; Grok checks for consistency | `rg -n "Nano Banana\|generate_image" AGENTS.md GEMINI.md CLAUDE.md` finds hits only inside a SUSPENDED block; `GEMINI.md:52` is replaced; the Global process rules section exists in AGENTS.md and is mirrored in CANONICAL_ROLES §4 | M | **OWNER-GATED** (these files belong to the Owner/PM) |
| OPS.40.02 | Align the governance docs. CANONICAL_ROLES: add a PM row, remove the art bullet and "or Gemini", fix the pulse cadence. DIVISION_OF_LABOR: SUPERSEDED banner. MODEL_AVAILABILITY: image cells FROZEN. AGENT_UTILIZATION §3: suspended. ORG OS, QUALITY_ENG and the communication protocol: pointer banners. RELEASE_CHECKLIST G5: art-source text. SUSPENDED banners on `docs/asset_briefs/README.md`, `docs/asset_briefs/INDEX.md`, `docs/RMMZ_ASSET_SPEC.md` and `docs/packets/DEUS_BOOTSTRAP_PACKET_08_*` | PLANNED | [MD] C3, C4, C5, M16; `docs/RELEASE_CHECKLIST.md` G5 | dep: OPS.40.01 | PM drafts → Owner approves (Gemini writes MODEL_AVAILABILITY) | Every hit of `rg -n "Nano Banana\|generate_image" docs --glob '!docs/archive/**'` is either removed or sits under a SUSPENDED banner; CANONICAL_ROLES has a PM row | M | **OWNER-GATED** (these files belong to the Owner/PM) |
| OPS.40.03 | Coordinator doc refresh. STATUS: M1, M2, C7 (matrix), C9. WORK_QUEUE: M3, C6 (reassign WB-003 to Claude plus Grok; set it PARKED). WBS rows: M4 (WG.00.09 and WG.00.12 status text; notes on rules 1, 3 and 4; a closure-reviewer column) | PLANNED | [MD] C6, C7, C9, M1–M4 | — | Gemini → PM | Each listed [MD] finding closed with line evidence; `node tools/governance/check_wbs_integrity.js` exits 0 | M | — |
| OPS.40.04 | OWNER_DECISIONS: add `SUSPENDED` to the schema. Add DEC-007 (art freeze, DECIDED), DEC-008 (heavy-job cap lifted, plus the tripwire, DECIDED) and DEC-009 (`uf.hex` before release, OPEN). Note the pending off-laptop zip copy under DEC-005. Cross-reference the fluid ruling | PLANNED (DEC-007 exists only as the banner) | [MD] M5; `docs/OWNER_DECISIONS.md` | — | Gemini → PM | Entries follow the schema; `rg "DEC-007" docs/OWNER_DECISIONS.md` finds a hit | S | — |
| OPS.40.05 | **WBS ID fixes, Rev 17** (see §6) | PLANNED | §6 of this proposal; [MD] M4, M14, m10 | PM and Owner approve §6 | Gemini → PM | Rev 17 row present; header reads "next free WG.00.17"; `check_wbs_integrity.js` exits 0; DW crosswalk corrected | S | — |
| OPS.40.06 | Lessons and mistakes log, `docs/LESSONS_AND_MISTAKES.md` | PLANNED (no such log exists anywhere) | [MD] m18, §3 | — | PM → Grok | The file exists with at least these seed entries, each citing a commit or path: the fabricated hash `ed757456…`; SyntaxError output taken as proof; 27 vs 28 mutants; exit codes lost inside `powershell -Command`; merge before review (`0f7f26cd` landed before `16fec107`); self-certification (`59573b81`, `4b9673c6`) | S | — |
| OPS.40.07 | Mailbox protocol v2: `NNNN.md` numbering, addenda as new numbers, `sha256` acks in boards, an append-only outbox with a hash log. Retire or merge the in-repo bus (`docs/agents/mailboxes/`) | PLANNED | [OPS] R10, §9 lesson; [MD] m8 | — | PM → Grok | README v2 in `.deus_pm`; the next board echoes the sha256 of every directive it processed; the in-repo mailbox README is marked not in use | S | — |
| OPS.40.08 | Canonicalize the defect ledger: one path; lifecycle OPEN / FIX_READY / CLOSED; append a corrected DEF-COORD-INJECT-01 record; audit the ATK-19B-001/002 closures. Bus messages at `20:31:42.641Z` through `.746Z` go from defect to fix to close within about 100 ms, a backfill pattern CANONICAL_ROLES §3.3 forbids | PLANNED | [MD] M12; `tasks/WG.00.08/defects.jsonl`; `tasks/messages.jsonl` | — | Gemini (records) → Grok (closure lines) | STATUS names one ledger path; the `RECORDED` entry has a corrected record appended; a Grok artifact states whether the ATK-19B closures stand | S | — |
| OPS.40.09 | Correction board for the fabricated `task/lane-b` hash, plus defect records (fabricated hash, merge before review, 0-byte logs) | PLANNED | [MD] C8; [OPS] R1 | — | Gemini → PM | The board pastes raw `git rev-parse task/lane-b` and `git ls-remote origin task/lane-b` output with `EXIT=` lines, showing `ed75745694e1…`; defect lines appended | S | — |
| OPS.40.10 | Doc hygiene minors: broken STATUS archive link (m1); ADR index (m4); 0-byte `GROK_PROMPT_TASK_F.md` (m5); 4.1 MB `UF_History_Profile.md` (m6); move `tasks/active/ARCHITECTURE-CLEANUP-001.md` to the archive (m7); move Stand-ins out of STATUS, after checking with the tool owner (m14); CONSOLIDATION "one heavy job" note (m15) | PLANNED | [MD] §2.3 | — | Mixed, per the [MD] fix-owner column (Gemini, PM or Claude) → PM | Each item closed with a file:line citation | S | — |
| OPS.40.11 | Agent configs outside the repo: remove `generate_image` from the 8 Gemini subagent `agent.md` files; retire `deus-implementation`; fill or delete the 0-byte `~/.codex/AGENTS.md` | PLANNED | [MD] M15, §3 | — | Owner → PM | `rg generate_image` over the subagent folder finds 0 hits | S | **OWNER-GATED** (files in the Owner's profile, outside the repo) |

#### M0.6 Machine, backup & migration (OPS.50)

| ID | Title | Status | Source | Depends on | Writer → Reviewer | Definition of done | Size | Gate |
|---|---|---|---|---|---|---|---|---|
| OPS.50.01 | Copy `C:\Users\snewt\DEUS_backups\deus_untracked_2026-09-25.zip` off the laptop | OPEN | STATUS §4 BLOCKER-BACKUP ("pending Owner off-disk copy"); [OPS] §6 Owner item 1 | — | Owner → PM | The Owner reports where it went, and the SHA256 of the copy equals `D3A49004…C0CD1` | S | **OWNER-GATED** (Owner action) |
| OPS.50.02 | Find the cause of the laptop instability (7 unexpected shutdowns on 9/25, 12 in 7 days), and add a post-boot `git fsck` plus worktree reconcile routine | OPEN | [OPS] R3 | — | Owner (hardware); Claude (fsck script) → PM | Cause identified or mitigated; 7 days with no Event 6008; an fsck script log after each boot | M | **OWNER-GATED** (Owner hardware action) |
| OPS.50.03 | Enable Windows long paths and `core.longpaths` | DONE (PM, 2026-09-25, Owner-approved admin) | [OPS] §5 (`LongPathsEnabled=0`); §6 Owner item 5 | — | Owner → PM | Registry value is 1; `git config --global core.longpaths` returns true | S | done |
| OPS.50.04 | **Move the repo to `C:\Dev\DEUS`**: Consolidation Phases 1–2, plus applying the Lane F diff at the freeze point | FROZEN until a quiet window | `docs/CONSOLIDATION_PLAN_V1.md` §1 and Phases 1–2; STATUS §1 Migration Freeze; `tasks/lane-f/state.md` (Freeze-Point Procedure) | OPS.50.01; OPS.60.01 pushed; all active lanes (H, C2b, E) committed | Claude → Grok; Gemini runs the freeze | `node tools/capture_pre_migration_baseline.js` run before and after; golden seed checksums (18, 20260923) identical; `git fsck` clean in `C:\Dev\DEUS`; GATE suites exit 0 there; `rewrite_onedrive_links.js --check` exits 0 after the diff is applied | M | **OWNER-GATED** (decision: quiet-window timing, OD-10) |
| OPS.50.05 | Consolidation after the move, Phases 3–9: clutter removal, loose files, companion plugin registration, shim prune, `tools/` reorganization, full regression, metric comparison, freeze of Repository Layout v1 | PLANNED | `docs/CONSOLIDATION_PLAN_V1.md` §2–§5, Phases 3–9 | OPS.50.04, OPS.30.04 | Claude → Grok | Phase 9 assertions hold: zero checksum drift on the golden seeds, latency equal or better, zero console errors. The RMMZ editor is closed during the `plugins.js` edit | L | — |
| OPS.50.06 | Nightly job: full headless suite, `git fsck`, and a push-all-refs parity report | PLANNED | [OPS] §4 Cadence | dep: OPS.30.01 | Claude → Grok | Three consecutive nightly reports logged with exit codes | S | — |

#### M0.7 Repo hygiene & salvage (OPS.60); governance tooling (OPS.70)

| ID | Title | Status | Source | Depends on | Writer → Reviewer | Definition of done | Size | Gate |
|---|---|---|---|---|---|---|---|---|
| OPS.60.01 | **Salvage the scratch worktrees**: wt13 (+240/−9); wt14 (+353/−21, including an untracked `DEUS_DeathForensics.js`); wt16 (+1304/−278); wt18 (+1046/−186); wt19b@`c33143d3` (+1076/−60); wthead (`tools/_probe_eat.js`) | OPEN (TRIAGE-SCRATCH-TEMP) | STATUS §4; [OPS] R5 | Owner triage (keep or discard) | Claude (commits to `salvage/<name>`) → PM | For every "keep", `origin/salvage/<name>` exists with a diffstat matching the [OPS] R5 numbers. Nothing in `%TEMP%` is deleted until the push is verified | M | **OWNER-GATED** (decision: triage, OD-13) |
| OPS.60.02 | Retire the merged lanes' worktrees and branches (a, b, c1, c2, c3, f, g). Push local `lane-c1..c3`, which are 1 commit ahead. Decide on `astra/DEUS-TSK-ASTRA-01` (177 behind, 1 ahead) | PLANNED | [MD] m16, m17; [OPS] §5 Branches | OPS.10.02 (preserve the lane-a/b artifacts first) | Gemini → PM | `git worktree list` shows only the active lanes and the scratch worktrees awaiting salvage; the parity report is clean | S | — |
| OPS.70.01 | Invariant checker `tools/governance/check_invariants.js` | PLANNED | `docs/CONSOLIDATION_PLAN_V1.md` Phase 11B; `docs/INVARIANT_REGISTRY.md` | dep: OPS.30.01 | Claude → Grok | Every invariant has a check that is seen to fail on a mutant; the checker joins the GATE list | M | — |
| OPS.70.02 | Secrets scanner and dependency checker | PLANNED ([OPS] ran a manual scan: 0 hits) | Phases 11E and 11F; `docs/SECURITY_AND_SECRETS.md`; `docs/DEPENDENCY_POLICY.md` | — | Claude → Grok | A fake key planted in a fixture is detected; the clean tree exits 0 | S | — |
| OPS.70.03 | Performance instrumentation (`bench_boot`, `bench_worldgen`, `bench_ticks`, `bench_allocations`) and an update-hook audit | PLANNED | Phase 10 | dep: OPS.50.04 | Claude → Grok | Bench outputs committed; the hook audit lists every alias on `Scene_Map.update`, `Game_Map.update`, `Spriteset_Map.update` and `Sprite_Character.update` | M | — |

---

### M1 — World Generation Foundation

*Milestone membership: WG.00.06, WG.00.07, WG.00.08, WG.00.10, WG.00.14, WG.00.15, WG.00.17, WG.61.01, WG.61.02, WG.62.01, WG.62.02, WG.84.01, WG.86.01, WG.90.01 (defined in §3 tables above).*

| ID | Title | Status (evidence) | Source | Depends on | Writer → Reviewer | Definition of done | Size | Gate |
|---|---|---|---|---|---|---|---|---|
| SIM.90.01 | Defect backlog A10-3 and A10-4, plus open A10-1 | OPEN / backlog | STATUS defect section; `tasks/*/defects.jsonl` | — | Claude → Grok | Each defect has a repro test that fails before the fix and passes after; closed by Grok in the canonical ledger | M | — |

---

### M2 — Rendering & Depth

*Milestone membership: WG.10.01, WG.10.02, WG.10.03, WG.11.01, WG.11.02, WG.70.01, WG.71.01, WG.72.01, WG.73.01, WG.00.13, WG.00.16, WG.83.01, WG.85.01 (defined in §3 tables above).*

| ID | Title | Status (evidence) | Source | Depends on | Writer → Reviewer | Definition of done | Size | Gate |
|---|---|---|---|---|---|---|---|---|
| WG.00.09a | Global Five-Z Depth Renderer: plan / attack plan (Lane E, FABLE-19C) | CHANGES_REQUESTED. 8 commits on `task/lane-e`, unmerged; latest Grok `5964f772`; Claude review `6a71a4c4` CHANGES REQUESTED (N5/N6) | lane-e `docs/systems/UF_Depth_Attack_Plan.md`; `tasks/DEUS-TSK-FABLE-19C/*`; DEC-006 | — | Claude → Grok | N5/N6 addressed; Grok re-attack says PASS; the PM rules the document an attack plan, not a spec (PM-1); merged through the gate | M | — |
| WG.00.09b | Global Five-Z Depth Renderer: implementation (flat 1:1 layers per DEC-011 (no blur/scale/zoom/filter); depth effects deferred (WG.00.16); chunk mask cache) | QUEUED | WG WBS WG.00.09; DEC-011 | WG.00.09a, WG.00.08; OPS.50.04 (Gap 8) | Claude → Grok | The harness suites named in the plan exit 0; per-frame cost within the WG.85 budget; the mutation list from the attack plan is all caught | L | — |
| WG.00.09c | Depth rendering picture gate: F5 screenshots of all 5 Z | PLANNED | WG WBS rule 4 (F5 required); DEC-006 | WG.00.09b | Claude captures the harness renders → Owner judges | The Owner approves the F5 screenshots (test-harness renders, which DEC-007 says are not art) | S | **OWNER-GATED** (Owner visual approval) |

---

### M3 — Simulation (natural world, population, history)

Several WG.63–68 leaves have a visual side (burn scars, patinas, steam vents, landmark assembly). **Only their simulation and data side is in M3.** Any sprite or tile they need goes into the M5 Stage 1 catalogue, and is produced only through M5 Stage 3 (Owner-gated).

*Milestone membership: WG.63.01–06, WG.64.01–04, WG.65.01–15, WG.66.01–08, WG.67.01–04, WG.68.01–16 (defined in §3 tables above).*

#### M3.1 Sim/render split and level-of-detail simulation (SIM.00, SIM.30). Owner-ordered 2026-09-26

The Owner ordered these on 2026-09-26 (00:00 CT, "Follow the WBS", plus two architecture changes). DEC-012 records them.
- **A. Sim/render split.** The simulation is plain JS modules with no RPG Maker, PIXI or DOM dependency. It runs headless in node on its own fixed tick. RPG Maker only reads state or snapshots, and draws.
- **B. LOD simulation.** The region around the camera or player simulates in full detail. Distant regions simulate as coarse summaries at a lower frequency. A region that comes into focus expands from its summary deterministically, with totals conserved. A region that is demoted collapses back without losing any conserved quantity.

Why (survey 2026-09-26, `main` `d1f9cec5`):
- **The sim runs on the render loop.** 32 `Game_Map/Scene_Map.prototype.update` aliases sit in 26 plugins. Sim ticks = RMMZ `updateMain` calls, multiplied per frame by DEUS_TimeSpeed (`SceneManager.determineRepeatNumber`/`update`, L147-173).
- **On-screen units are RMMZ events.** Their position is copied from the `Game_Event` (DEUS_World L1686-1698).
- **Detail already depends on the view, with no conservation.**
  - Off-screen units step one cell every 16 frames (L1699-1701).
  - DEUS_Fluid steps only the viewed area (L736-745).
  - DEUS_Ecology rolls the current area plus one rotating area (header L22-27).

Rows are numbered in the SIM namespace. **SIM.10 is already history and population** (SIM.10.01/.02), LOD uses band **SIM.30**, the architecture band is **SIM.00**, and structural integrity, collapse & decay use band **SIM.40** (Directive 0021-V §6–§7).

| ID | Title | Status (evidence) | Source | Depends on | Writer → Reviewer | Definition of done | Size | Gate |
|---|---|---|---|---|---|---|---|---|
| SIM.00.00 | **In-place layer switch & area prewarm** (Lane N). Changes viewed Z without map restart; swaps tilemap data in-place; prewarms z±1/z±2 areas asynchronously; exit 0 | DONE | Directive 0017-Q; DEC-012 | — | Claude → Grok | tools/test_layer_switch_inplace.js passes (7/7 tests, 8/8 mutants killed); Grok review artifact tasks/SIM.00.00/lane-n/review_grok_2f2a1ff2.md approves CLEAN PASS (commit 14777983); merged e27e8be5; closedBy: grok | M | — |
| SIM.00.01 | **ADR-003 sim/render boundary and LOD simulation** (Lane M, docs only). Covers boundary, module layout, tick model, snapshot format, LOD region size and levels, summary state per system, promotion and demotion, conservation invariants, determinism, migration increments, and perf budgets | PLANNED (directive 0018-R §3) | Owner order 2026-09-26; DEC-012; this survey | — (writing can start now; it builds on Lane N's in-place layer switch as increment 0) | Claude → Grok (attack) → PM sign-off | `docs/adr/ADR-003_sim_render_split_and_lod.md` has every section listed in 0018-R §3, and each claim about current code cites file:line on `main`. Grok verdict file `tasks/SIM.00.01/lane-m/review_grok_<sha8>.md` says PASS or CLEAN PASS. Perf budgets are filled from Lane K's K3 `baseline_<sha8>.json`, or marked PENDING-K3 and amended before SIM.00.03 starts. PM sign-off is in the mailbox. **No code in this package** | M | — (PM sign-off; Owner already ordered) |
| SIM.00.02 | **Headless sim core with a fixed tick.** Engine-free modules (layout per ADR), with `sim.step()` on a fixed tick decoupled from frames. The RMMZ side feeds an accumulator | PLANNED | ADR-003 | SIM.00.01 PM sign-off; OPS.10.01 merge gate merged; OPS.50.04 (repo at `C:\Dev\DEUS`) | Claude → Grok | 1. `node tools/sim/run_headless.js --seed 18 --ticks 36000` exits 0 in a vm context with **no** `window`, `document`, `PIXI`, `$game*`, `$data*`, `Game_*`, `Scene_*` or `Sprite*` globals. 2. Two runs give identical state checksums. 3. The state checksum after N ticks is identical whether driven as 1, 2, 4 or 8 sub-ticks per frame or with simulated dropped frames. 4. A static check (`tools/sim/check_sim_purity.js`) fails if any file under the sim core references an engine global, and is seen to fail on a mutant. 5. The game still boots and plays: GATE suites stay green | L | — |
| SIM.00.03 | **Snapshot/read interface for the renderer.** A versioned read-only view of sim state (per area and Z: terrain, objects, units, fluids, fire, time) plus a change feed. Render plugins read only through it. Commands (player orders) go in through one command queue | PLANNED | ADR-003 | SIM.00.02; Lane N (in-place layer switch) merged; Lane K flat render merged | Claude → Grok | 1. A contract test: the snapshot is frozen or immutable to consumers, and a write attempt throws. 2. A lint lists every render plugin's reads, and none bypasses the interface (mutant proves it). 3. Commands replayed from a log reproduce the same checksum. 4. A layer switch reads the snapshot with no map transfer and no synchronous area build (uses Lane N's prewarm) | M | — |
| SIM.00.04 | **Units and movement into the core.** `Game_Event` becomes a view puppet. One movement model for all units, replacing the on-screen RMMZ-driven versus off-screen 1-cell/16-frame split (DEUS_World L1611-1704) | PLANNED | ADR-003 migration increment | dep: SIM.00.03 | Claude → Grok | 1. The same seed and command log give the same unit positions whether the player watches the area or not (a test runs it both ways). 2. Pathing and stuck rules are covered by headless tests. 3. The render tween (Lane K K2a) still animates. 4. `world`, `jobs` and `colonists` suites stay green or are migrated with a listed diff | L | — |
| SIM.00.05 | **Remaining live systems into the core, one per increment.** Fluid, Ecology, Fire, Environment, NaturalConnections (fluids and creatures now run on `Graphics.frameCount` in `Scene_Map.update`, L507-515), Colonists needs, Jobs, Projects, Combat step, Factions contact, and the calendar (`$ufTime.update` in `Scene_Map.update`, DEUS_Core L505-510) | PLANNED | ADR-003 | SIM.00.04 (units); each system is its own sub-lane `SIM.00.05/<system>` | Claude → Grok per system | Each system: its tick hook is removed from `Game_Map/Scene_Map.update`; it runs headless; its suite is green headless and in NW.js; pause and speed come from the core tick, not frames; the game is playable after each increment (PM smoke run noted in the board) | L | — |
| SIM.00.06 | **Save format owned by the core.** A single versioned sim save (today split into `contents.ufWorld`, `contents.deusFluid`/`ufFluid` and `contents.deusTime`: DEUS_World L2900-2916, DEUS_Fluid L994-1011, DEUS_Core L447-490), plus migration | PLANNED | ADR-003; REL.20.02 | dep: SIM.00.05 | Claude → Grok | Old-save fixtures load and migrate. Save, load and save again is byte-identical. A headless save loads in NW.js and vice versa | M | — |
| SIM.10.01 | History and population simulation (`DEUS_History.js` 249 KB; `DEUS_HistoricalDemographics.js`) | DONE-unverified (code on main; spec `docs/systems/UF_History.md`; no WBS leaf) | `docs/systems/UF_History.md`; `tools/bench_history_sim.js` | WG.00.14 (Year-0 contract) | Claude → Grok (retro) | Retro Grok review; `bench_history_sim.js` meets the budget; the Year-0 strict test stays green; demographics suite in GATE | M | — |
| SIM.10.02 | Simulate-forward as a dev-only tool (must not run at new game) | PLANNED | INV-SIM-01; `docs/INVARIANT_REGISTRY.md` | SIM.10.01, WG.00.14 | Claude → Grok | The CLI runs N years on a save copy; a guard test proves the new-game path never calls it | S | — |
| SIM.10.05 | **Underground Year-0 viability** (resolve PGA DEEP-06: ensure deep/underground factions have viable food, water, light, and pathing at Year 0 start) | PLANNED | Directive 0062-BK; PGA DEEP-06 | SIM.10.01, WG.00.17 | Claude → Grok | Underground races start with viable subterranean ecology, fungal foraging, and water access; zero instant starvation in Year 0. Grok review artifact approves | M | — |
| SIM.20.01 | Death forensics: spec, WBS leaf and tests for `DEUS_DeathForensics.js` (23.6 KB, on main, loaded by Combat). The untracked copy in wt14 differs | PLANNED (code exists; no spec, no leaf) | `game/js/plugins/DEUS_DeathForensics.js`; CONSOLIDATION_PLAN; [OPS] R5 (wt14) | OPS.60.01 (wt14 diff triaged) | Claude → Grok | Spec in `docs/systems/`; the wt14 differences are reconciled or discarded, recorded in writing; unit tests for cause-of-death attribution in GATE | M | — |
| SIM.30.01 | **LOD region model.** Region grid (size and levels per ADR) over 256×256×5 Z, a focus set (camera, player, active colonists and jobs), and a summary schema per system (population by species and age band, resources by type, water volume per basin and Z, fire and fuel, history counters) | PLANNED | ADR-003 | dep: SIM.00.03 | Claude → Grok | Schema doc plus validators. Every conserved quantity is named with its unit. Focus-set tests on fixtures | M | — |
| SIM.30.02 | **Coarse summary simulation** for regions out of focus, at a lower frequency (aggregate populations, resources, water, history). Replaces the ad-hoc rules (Fluid view-only, Ecology rotating area, off-screen unit stepping) | PLANNED | ADR-003 | SIM.30.01, SIM.00.05 (per system) | Claude → Grok | Deterministic per seed and state (checksum). Conserved totals are exact per coarse tick. Cost per coarse region is within the ADR budget (bench) | L | — |
| SIM.30.03 | **Promotion and demotion with conservation.** Expand a region from its summary to full detail, and collapse it back | PLANNED | ADR-003 | dep: SIM.30.02 | Claude → Grok (mutation) | 1. Property test over 1000 random promote and demote cycles on 3 seeds: every conserved total is exactly equal before and after. 2. `promote(s)` twice from the same seed and state is byte-identical. 3. Named units and history persons are never lost or duplicated. 4. Mutants that leak 1 unit of water, ore or population, or that use unseeded randomness, are caught | L | — |
| SIM.30.04 | **LOD scheduler and perf budget.** Tick-budget allocation between full and coarse regions, hysteresis on focus changes, and prewarm on approach (shares Lane N's prewarm) | PLANNED | ADR-003; Lane K K3 harness | dep: SIM.30.03 | Claude → Grok | Bench on the reference laptop: full-detail tick and coarse-region tick meet the ADR budgets at 1x and 8x. No frame spike above the budget when focus moves across a region border (Lane K harness) | M | — |
| SIM.30.05 | **Long-run LOD QA:** mixed-LOD versus all-full detail | PLANNED | ADR-003 | dep: SIM.30.04 | Claude → Grok | On a small fixture world over 100 game years, conserved quantities match exactly, and aggregate statistics (population, resources, water) are within ADR tolerances. Joins GATE as a nightly (OPS.50.06) | M | — |
| SIM.40.00 | **Material and constructed-strata model** (mass, volume, structural support load limits per material, interaction matrix for stone, wood, soil, metals) | PLANNED | Directive 0062-BK; DEC-028 | — | Claude → Grok | Data-driven material properties catalog in `game/data/` or sim core; mass/support values defined; Grok review artifact approves | M | — |
| SIM.40.01 | **Support model design & blast propagation** (materials, vertical propagation, span limits, cross-layer blast attenuation, V128 natural rock, V133 change-driven). Load-bearing rules, span capacities, and vertical blast propagation | PLANNED | Directive 0021-V §6, §12; V137; ADR-003 | WG.00.17, dep: SIM.00.01 | Claude → Grok (attack) | Support model spec in docs/systems/: which materials bear load, downward propagation through strata and Z layers, span limits for floors/bridges/roofs, cross-layer blast damage and material attenuation (applyVolumeDamage), natural rock support (V128). Recomputes only near mutations (V133; zero per-tick full-world scans). Grok review artifact approves | M | — |
| SIM.40.02 | **Collapse event simulation** (downward cascading, rubble/talus mass conservation LIFE-001, V95 impact damage, deep-history DEC-012) | PLANNED | Directive 0021-V §6; V137; LIFE-001; V95 | dep: SIM.40.01 | Claude → Grok | Unsupported cells collapse and cascade downward through Z layers. Conserves mass into rubble or talus (LIFE-001). Damages or kills units and objects below (V95). Leaves physical traces for deep-history (DEC-012). Grok review artifact approves | L | — |
| SIM.40.03 | **Colonist structural behaviour** (props, pillars, avoid dangerous excavation) | PLANNED | Directive 0021-V §6; V137 | dep: SIM.40.02 | Claude → Grok | Colonist builders and miners respect structural support limits: erect props/pillars, maintain supported spans, and avoid unsafe digging unless overridden. Grok review artifact approves | M | — |
| SIM.40.04 | **Collapse QA & fixtures** (deterministic cave-in, tall tower +1..+4, mass conservation, perf bound) | PLANNED | Directive 0021-V §6; V137 | dep: SIM.40.02 | Claude → Grok (mutation) | Automated test suite: deterministic cave-in fixture, tall tower collapse across +1..+4, exact mass conservation assertions, and perf benchmark proving zero full-world scan per tick. Mutants for leaked mass and missed triggers caught. Exits 0 | M | — |
| SIM.40.05 | **Decay model** (unmaintained structure HP loss by material/exposure, roofs fail first, walls fail, feeds collapse) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | SIM.40.01, dep: SIM.00.01 | Claude → Grok | Decay simulation: unmaintained structures lose HP based on material (wood fast, stone slow, metal rusts) and exposure. Roofs fail before walls, feeding into SIM.40.02 collapse. Change-driven, LOD-aware, scheduled in slow ticks. Grok review artifact approves | M | — |
| SIM.40.06 | **Nature reclaiming** (vegetation invasion, soil/sediment burial, visible stages: intact -> weathered -> overgrown -> collapsed -> buried mound) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | dep: SIM.40.05 | Claude → Grok | Nature reclamation: vegetation spreads into abandoned cells; sediment slowly buries low ruins. Structures progress visibly: intact -> weathered -> overgrown -> collapsed -> buried mound. Grok review artifact approves | M | — |
| SIM.40.07 | **Item weathering & burial** (rot, rust, sediment burial, durable relics, LIFE-001 mass conservation, LIFE-002 no ore creation) | PLANNED | Directive 0021-V §7; V138; LIFE-001; LIFE-002 | dep: SIM.40.05 | Claude → Grok | Item weathering: loose organic items decompose into soil; metals rust; durable relics become buried finds. Mass strictly conserved (LIFE-001); mineral ore is never generated (LIFE-002). Grok review artifact approves | M | — |
| SIM.40.08 | **Deep-history decay integration** (summary-level decay for fast-forward, LIFE-003 trace retention) | PLANNED | Directive 0021-V §7; V138; DEC-012; LIFE-003 | SIM.40.05, dep: SIM.30.02 | Claude → Grok | Deep-history fast-forward executes summary decay so ancient sites appear in appropriate decay stages upon discovery. Recognizable traces preserved (foundations, mounds, vaults; LIFE-003). Grok review artifact approves | M | — |
| SIM.40.09 | **Decay QA & fixtures** (deterministic aging fixture, mass conservation, no ore creation, perf bound) | PLANNED | Directive 0021-V §7; V138 | SIM.40.06, SIM.40.07, dep: SIM.40.08 | Claude → Grok (mutation) | Automated test suite: deterministic fixture aging an abandoned site through all stages, exact mass conservation assertions, zero ore generation verification, and perf benchmark proving zero per-frame scan. Mutants caught. Exits 0 | M | — |
| SIM.40.10 | **Shared reproduction and lifecycle system** (people, livestock, wildlife, monsters). Per-species mating, gestation, growth, lifespan, litter size, heritable traits; young built from food eaten, bodies decay to soil (LIFE-001); wild counts at summary LOD | PLANNED | Directive 0021-V Addendum §9; V140; LIFE-001 | dep: SIM.40.02 | Claude → Grok | Simulation implementation: unified biological lifecycle across people, animals, and monsters. Food mass converted to offspring growth; natural death and decay to soil (LIFE-001). Summary LOD reproduction for non-focus regions. Grok review artifact approves | L | — |
| SIM.40.11 | **Matter-conserving ledger integration & world reclamation** (single accounting authority `game/js/sim/ledger*`, matter conservation by weight on mining, building, collapse, decay, and terrain reclamation of loose items; fixes LWGA F-03, F-04) | PLANNED | Directive 0063-BL; DEC-028 | WG.65.15, SIM.40.01, SIM.40.05, SIM.40.00 | Claude → Grok | Single accounting ledger tracks all material mass/weight; terrain reclamation converts accumulated outdoor waste/ruins to soil/stone blocks; zero creation/deletion; Grok review artifact approves | L | — |
| SIM.50.01 | **Living world gap audit** (`docs/audits/LIVING_WORLD_GAP_AUDIT.md`). Read-only gap audit mapping all 9 living-world systems, structural support, decay, reproduction, and faction plans to existing code, VISION rows, and WBS rows | DONE | Directive 0021-V Addendum §14 | dep: SIM.00.01 | Claude → Grok | Exhaustive audit report in docs/audits/LIVING_WORLD_GAP_AUDIT.md mapping existing code, partial implementations, and missing systems across all 9 areas; zero code modifications; Grok review artifact tasks/SIM.50.01/gap-audit/review_grok_1953c0a5.md approves PASS (commit 15745e41); merged 4614dbfa; closedBy: grok | M | — |
| SIM.50.02 | **Cross-layer water dynamics** (seepage, vertical drops, flooding, springs, lake cycling across 32 layers) | PLANNED | Directive 0021-V Addendum §14; V142 | SIM.50.01, dep: WG.00.17 | Claude → Grok | Fluid simulation handles seepage through porous strata, vertical water drops/waterfalls, seasonal flooding, subterranean aquifers/springs, and lake filling/drying. Mass conserved (LIFE-001); change-driven (V133) | L | — |
| SIM.50.03 | **Erosion and sediment deposition** (slope wash, alluvial deposits, channel shifting, feeding strata elevation) | PLANNED | Directive 0021-V Addendum §14; V142; LIFE-001 | dep: SIM.50.02 | Claude → Grok | Flowing water erodes soil and softer rock strata, transporting sediment to lower basins and deltas. Changes strata elevation over slow ticks; mass conserved into soil/sediment (LIFE-001) | M | — |
| SIM.50.04 | **Vegetation spread and succession** (seed dispersal, canopy competition, biome spread across layers) | PLANNED | Directive 0021-V Addendum §14; V142 | SIM.50.01, dep: SIM.40.06 | Claude → Grok | Plants spread by seed dispersal, pioneer species pave way for climax forest, canopy density limits understory. Fire/clearing resets succession; slow-clock scheduled (NAT-003) | M | — |
| SIM.50.05 | **Combustible fire spread simulation** (combustible fuel, wind propagation, soil dryness, ash beds) | PLANNED | Directive 0021-V Addendum §14; V142 | SIM.50.01, dep: SIM.50.04 | Claude → Grok | Fire ignites from lightning/sparks/lava, spreads along combustible materials, driven by wind direction and weather dryness. Produces smoke and permanent ash beds (WG.63.04). Conserves carbon mass | M | — |
| SIM.50.06 | **Seasons and dynamic weather** (seasonal temperatures, precipitation, winter freezing, agricultural calendar) | PLANNED | Directive 0021-V Addendum §14; V142 | SIM.50.01, dep: WG.00.17 | Claude → Grok | Annual seasonal cycle shifts temperature and rainfall across all 32 layers. Winter freezes shallow water into ice and produces snow; spring thaw triggers runoff; seasons drive crop growth cycles | M | — |
| SIM.50.07 | **Animal migration and herd movement** (seasonal herd travel across layers and biome bands) | PLANNED | Directive 0021-V Addendum §14; V142 | SIM.50.01, dep: SIM.40.10 | Claude → Grok | Wildlife herds migrate seasonally between upland summer grazing and lowland/sheltered winter valleys across Z layers. Summary LOD herd movement off-camera; individuals materialize near focus | M | — |
| SIM.50.08 | **Anthropic land reshaping** (roads, clearing, mining, dams, terraces, irrigation canals) | PLANNED | Directive 0021-V Addendum §14; V142 | SIM.50.01, dep: SOC.10.03 | Claude → Grok | Civilizations physically alter terrain: worn footpaths become paved roads, forests are cleared for fields, stone is quarried, rivers are dammed or channeled. Strata mutations conserve mass | L | — |
| SIM.50.09 | **Settlement lifecycle and ruins resettlement** (growth, abandonment, re-founding on ruins) | PLANNED | Directive 0021-V Addendum §14; V142; LIFE-003 | SIM.50.08, dep: SIM.40.08 | Claude → Grok | Factions expand camps into towns, contract or abandon under war/famine/disease. Later settlers found new homes on existing stone ruins, reusing foundations and materials | M | — |
| SIM.50.10 | **Catastrophic geological events** (earthquakes, karst sinkholes, volcanic eruptions, caldera breaches) | PLANNED | Directive 0021-V Addendum §14; V142; WG.63.03 | SIM.50.01, dep: SIM.40.02 | Claude → Grok | Rare catastrophic events alter geology: earthquakes trigger mass cave-ins, underground karst cavities collapse into surface sinkholes, volcanic fissures erupt lava. Leaves geomorphic scars (WG.63.04) | M | — |
| SIM.50.11 | **People-side gap audit** (`tasks/SIM.50.11/gap-audit-people/PEOPLE_GAP_AUDIT.md`). Audit people/colonist systems against living world, needs, and reproduction | PLANNED | Directive 0035-AJ | dep: SIM.50.01 | Claude → Grok | Audit report mapping people-side mechanics; zero code modifications; Grok review artifact approves | M | — |
| SIM.50.12 | **Living-world rule-breach fix package** (fix LWGA findings F-01 through F-05: rule breach enforcement across 32 layers) | PLANNED | Directive 0062-BK; LWGA | dep: SIM.50.01 | Claude → Grok | Resolves LWGA critical findings F-01 through F-05; automated tests verify rule compliance; Grok review artifact approves | M | — |
| SIM.50.13 | **Ore sprouting & fluid solver attachment bugfixes** (fix LWGA F-03 loose stones turning into ore, fix F-05/D-4 fluid solver not attaching and flood fill creating water) | PLANNED | Directive 0062-BK; DEC-023, DEC-024 | dep: SIM.50.02 | Claude → Grok | Ore never sprouts from loose stone; fluid solver attaches cleanly to DEUS_Fluid; no water creation via flood fill; Grok review artifact approves | M | — |

#### M3.4 Hyper-realistic SRD spell effects (SIM.60). Owner-ordered 2026-09-26 (DEC-018, Directive 0028-AC §5)

| ID | Title | Status (evidence) | Source | Depends on | Writer → Reviewer | Definition of done | Size | Gate |
|---|---|---|---|---|---|---|---|---|
| SIM.60.01 | **SRD spell-effect audit** (`docs/audits/SRD_SPELL_EFFECT_AUDIT.md`, `docs/audits/srd_spell_effect_audit.json`). Classify all 327 spells in `game/data/srd51/spells.json` by world systems needed: heat, force, water, cold, earth, light, life, NONE. Quotes SRD baseline fields, names WBS deps, drafts primitive list. Docs only; no dependencies; Lane P (PM) | PLANNED | Directive 0028-AC §5; DEC-018 | — | Claude → Grok | Exhaustive audit report and 100% JSON classification of all 327 spells; drafts primitive list; zero code modifications; Grok review artifact approves | M | — |
| SIM.60.02 | **Spell-effect schema** (data-driven JSON Schema of reusable primitives: ignite, heat flux, impulse/blast via SIM.40.01, fluid source/sink, temperature/freeze, mass-conserving terrain edit, light, growth/decay) | PLANNED | Directive 0028-AC §5; DEC-018 | dep: SIM.60.01 | Claude → Grok | Validated JSON Schema in docs/schemas/spells/ and data fixtures; zero per-spell code; Grok review artifact approves | M | — |
| SIM.60.03 | **Spell-effect runtime in headless sim core** (physical propagation of heat, impulse, fluids, freezing, terrain alteration decoupled from presentation frames) | PLANNED | Directive 0028-AC §5; DEC-018 | SIM.60.02, SIM.00.03, SIM.50.05, SIM.50.02, SIM.40.01–.02, GP.07.02, SIM.50.06 | Claude → Grok | Core headless runtime processes spell effects physically; SRD baseline stats untouched; mass conserved into rubble/water/ice; Grok review artifact approves | L | — |
| SIM.60.04 | **Spell-effect QA fixtures** (fireball floor breach, flood down stairwell, lake freeze, stone wall vs mass ledger, SRD stat invariance) | PLANNED | Directive 0028-AC §5; DEC-018 | dep: SIM.60.03 | Claude → Grok (mutation) | Automated test suite: fireball ignites wooden floor and breaches to layer below, flood cascades down stairwell, lake freezes, wall of stone matches mass ledger, SRD damage/range unchanged. Mutants caught. Exits 0 | M | — |
| SIM.60.05 | **SRD 5.1 combat rules engine** (load `srd51` data; attack, damage, saves, conditions, and initiative resolution behind pure headless `UF.Rules`; deterministic seeded dice; wire into `DEUS_Combat.js` `resolveAttack`; tests against SRD examples) | PLANNED | Directive 0062-BK; DEC-027; V47 | dep: SIM.60.02 | Claude → Grok | Pure headless combat rules engine resolves attacks via d20 vs AC, SRD damage dice, conditions; zero OSRS formula fallback; automated test suite against SRD 5.1 examples. Grok review artifact approves | L | — |
| SIM.60.06 | **Combat stress benchmark** (re-run `WG.00.09b` benchmark with real SRD combat and SRD stat-block units; separate simulation resolution cost from rendering cost) | PLANNED | Directive 0062-BK; DEC-027 | dep: SIM.60.05 | Claude → Grok | Benchmark report with real SRD combat resolution timings; verifies 60 FPS target; zero per-frame full scans. Grok review artifact approves | M | — |

---


### M4 — Civilization & Gameplay (slices, society, player layer)

*Milestone membership: WB-001, WB-002, WG.00.11, SOC.10–13, SOC.20–23, SOC.30–33, SOC.40–42, SOC.50–51, SOC.60–70 (defined in `docs/WORK_QUEUE.md` and `docs/society/DEUS_SOCIETY_WBS.md`).*

| ID | Title | Status (evidence) | Source | Depends on | Writer → Reviewer | Definition of done | Size | Gate |
|---|---|---|---|---|---|---|---|---|
| GP.03.01 | Slice 3: Items and U7-style handling | DRAFT | `docs/SLICES.md` §Slice 3 | WB-002 | Claude → Grok; Owner approves | Spec approved; tests green; Owner slice approval recorded | L | **OWNER-GATED** (Owner slice approval) |
| GP.04.01 | Slice 4: Designations, jobs, gathering (`DEUS_Jobs.js`, Projects) | DRAFT | `docs/SLICES.md` §Slice 4 | dep: GP.03.01 | Claude → Grok; Owner approves | as GP.03.01 | L | **OWNER-GATED** (Owner slice approval) |
| GP.05.01 | Slice 5: Construction and crafting | DRAFT | `docs/SLICES.md` §Slice 5 | GP.04.01, GP.10.01 decision | Claude → Grok; Owner approves | as GP.03.01 | L | **OWNER-GATED** (Owner slice approval) |
| GP.06.01 | Slice 6: World generation (player-facing), reconciled with M1 | DRAFT (the slice text predates the WG WBS; Gap 2) | `docs/SLICES.md` §Slice 6 | dep: WG.90.01 | PM reconciles; Claude → Grok; Owner approves | Slice text maps onto the M1 leaves; Owner slice approval | M | **OWNER-GATED** (Owner slice approval) |
| GP.07.01 | Slice 7: Creatures and combat (`DEUS_Combat.js`, Wildlife) | DRAFT | `docs/SLICES.md` §Slice 7 | GP.06.01, WG.68.07–14 | Claude → Grok; Owner approves | as GP.03.01 | L | **OWNER-GATED** (Owner slice approval) |
| GP.07.02 | **Cross-layer 3D targeting, ballistics & volume damage** (spells, arrows, thrown items through multi-Z openings, true 3D Euclidean range, vertical impact bonus / upward range penalty, cross-layer volume blast damage) | PLANNED | Directive 0021-V Addendum §20; DEC-019; V148 | dep: WG.00.17, SIM.00.00 (Lane N), SIM.40.01 | Claude → Grok | Spells/ranged attacks target visible cells on lower/upper layers with clear 3D LOS. Range uses 3D Euclidean distance (5 ft squares, 10 ft layers). Impact damage increases with height fallen; shooting upward incurs range penalty. Area blast damage propagates downward through floor materials. Exits 0 | M | — |
| GP.08.01 | Slice 8: Population and peoples (`DEUS_Factions.js`; diplomacy has no leaf, Gap 16) | DRAFT | `docs/SLICES.md` §Slice 8 | GP.07.01, WG.62.01, SOC.20–23 | Claude → Grok; Owner approves | as GP.03.01 | L | **OWNER-GATED** (Owner slice approval) |
| GP.10.01 | SRD crafting (CRFT) branch integration | OPEN decision (DEC-003) | `docs/OWNER_DECISIONS.md` DEC-003 | OD-2; OPS.50.04 | Claude → Grok | Per the decision; if deferred, parked until after the migration | M | **OWNER-GATED** (DEC-003, OD-2) |

---

### M5 — Content & Art: the 4-stage art pipeline

The Owner clarified this on 2026-09-25 at 23:41 CT. **Art is a stream of its own, in exactly four stages. Only Stage 3 needs the Owner.** Stages 1, 2 and 4 are data and tooling. They produce no art, and workers can build them in parallel starting now.

- **Stage 1 — ART CATALOGUE (not art; workers may build):** WG.00.22, WG.20.01, WG.20.02, WG.21.01–03, WG.22.01–25, WG.23.01, WG.24.01–10, WG.25.01, WG.30.01, WG.30.02, WG.31.01, WG.68.15, DW.01.06 (defined in §3 tables above).
- **Stage 2 — BLANK TILESETS (not art; workers may build):** WG.32.01, WG.32.02, WG.33.01 (defined in §3 tables above).
- **Stage 3 — ART GENERATION (OWNER-GATED: requires Owner involvement):** ART-A, WG.50.01–03, WG.51.01–04, WG.52.01–10, WG.53.01–02, WG.54.01–02, WG.55.01, WG.56.01, WG.57.01, WG.60.01, DW.03.01–04, ART-B (defined in §3 tables above).
- **Stage 4 — PLACEMENT & VALIDATION (not art; workers may build):** WG.41.01, WG.40.02, WG.80.01 (defined in §3 tables above).

---

### M6 — Release

| ID | Title | Status | Source | Depends on | Writer → Reviewer | Definition of done | Size | Gate |
|---|---|---|---|---|---|---|---|---|
| REL.10.01 | Remove the U7 stand-ins (5 in the inventory, plus the STATUS Stand-ins list) and replace them with stock or placeholder art already licensed per VISION V9. **Not new art**: swap to licensed stock or Owner-approved assets | PLANNED | `docs/STATUS.md` Stand-ins; `docs/ASSET_INVENTORY.md`; VISION V9; AGENTS rule 8 | WG.41.02/EXIST | Claude → Grok | `tools/originality_check.js` reports zero U7-derived files in `game/img`; the inventory shows 0 stand-ins | M | — |
| REL.10.02 | Decide `uf.hex` before release (DEC-009): ship on the master palette, or keep `uf.hex` | OPEN | ADR-002 §7.3 (`uf.hex` is the U7 palette) | OD-4 | PM memo → Owner | Decision recorded; if "yes", WG.00.13 is release-blocking | S | **OWNER-GATED** (Owner decision, OD-4) |
| REL.10.03 | Provenance gate: every shipped image has a catalogue row, an approval record (sha256) or a stock licence | PLANNED | `docs/RELEASE_CHECKLIST.md` G5; `art/APPROVALS.md` | WG.41.01, WG.41.02 | Claude → Grok | A script lists every `game/img/**` PNG with its provenance; zero unknowns | S | — |
| REL.10.04 | Legal and credits: SRD 5.1 CC-BY-4.0 attribution; stock licences; third-party plugin licences | PLANNED | `docs/LEGAL.md`; `docs/RELEASE_CHECKLIST.md` | dep: REL.10.03 | Claude drafts → PM → Owner | Credits file present; attribution text matches CC-BY-4.0 requirements; checklist line ticked with evidence | S | — |
| REL.20.01 | Reproducible Windows NW.js build (script, pinned versions, checksum) | PLANNED | `docs/RELEASE_ENGINEERING.md` | dep: OPS.50.05 | Claude → Grok | Two clean builds produce identical checksums, or each difference is explained; the build runs from `C:\Dev\DEUS` | M | — |
| REL.20.02 | Save schema freeze and migration tests (world, society, ecology) | PLANNED | SOC.60.02; `docs/RELEASE_ENGINEERING.md` | SOC.60–70, WG.61.02 | Claude → Grok | Versioned schema; old-save fixtures load after migration; test in GATE | M | — |
| REL.20.03 | Release performance gate (60 FPS, memory, load time on the reference laptop) | PLANNED | WG.85.01; `docs/RELEASE_CHECKLIST.md` | WG.85.01, OPS.70.03 | Claude → Grok | Bench numbers within budget on the release build | S | — |
| REL.30.01 | Playable demo = Slices 0–7 approved (per `docs/SLICES.md`), packaged as a Windows NW.js build | PLANNED | `docs/SLICES.md` ("Playable demo = Slices 0–7 approved") | WB-001, WB-002, GP.03–GP.07, REL.20.01 | PM → Owner | The Owner signs the demo; the build is archived with a checksum | M | **OWNER-GATED** (Owner sign-off, OD-18) |
| REL.30.02 | Release candidate: `docs/RELEASE_CHECKLIST.md` G1–G8 | PLANNED | `docs/RELEASE_CHECKLIST.md` | all of M6, WG.90.01, M5 Stage 3 packs in scope | PM compiles evidence → Owner | Every gate G1–G8 has linked evidence; the Owner signs | M | **OWNER-GATED** (Owner sign-off) |

### Package counts

| Milestone | Packages | of which OWNER-GATED | Notes |
|---|---|---|---|
| M0 Operations & Governance | 43 | 11 | 8 WG.00.12 sub-packages + 35 OPS |
| M1 World Generation Foundation | 18 | 1 | includes new WG.00.14, WG.00.15, WG.00.17, WG.00.19, WG.00.20, WG.62.02, SIM.90.01 |
| M2 Rendering & Depth | 20 | 6 | includes new WG.00.16, WG.00.18, WG.00.21, WG.00.23, WG.00.24 |
| M3 Simulation | 54 | 2 | band rows (e.g. WG.66.01–08) count as one package each; includes 12 SIM.00/SIM.30 rows (including SIM.00.00), 10 SIM.40.01–.10 collapse/decay/reproduction rows, 10 SIM.50.01–.10 living-world rows, plus 4 new SIM.60.01–.04 spell-effect rows (*Owner-ordered 2026-09-26, Directive 0028-AC §5*) |
| M4 Civilization & Gameplay | 17 | 16 | includes new GP.07.02 cross-layer 3D targeting; every package waits on an Owner decision, playtest or approval |
| M5 Content & Art (4 stages) | 33 | 15 | Stage 1: 13 (includes WG.00.22; 1 gated, a decision only) · Stage 2: 3 (0) · **Stage 3: 12 (all 12 "OWNER-GATED: requires Owner involvement")** · Stage 4: 5 (2 gated, Owner visual verification) |
| M6 Release | 9 | 3 | all new REL IDs |
| **Total** | **194** | **54** | Band rows stand for about 299 underlying WBS leaves |

A **package** here is one table row. Band rows (such as WG.22.01–25) keep their underlying leaf IDs and are split into leaf lanes when they start. The counts were produced by a script over this file's tables.

---

### 5.2 Critical path and next 10 parallel packages

#### Critical path (two chains; the art chain is probably the longer one)

**A. Engineering chain (fixed order):**
1. OPS.30.01 GATE list and OPS.10.01 merge gate
2. WG.00.08: Grok verifies `c8694f01`, merge, Z-2 proof exits 0 on main, DEC-001 un-suspended
3. WG.00.12/C2b: Grok PASS; and WG.00.09a (Lane E): N5/N6 fixed, merged
4. OPS.30.03 hooks (DEC-004)
5. OPS.60.01 salvage pushed and OPS.50.01 zip copied off the laptop
6. **OPS.50.04 migration to `C:\Dev\DEUS`** (quiet window)
7. WG.00.09b depth renderer
8. WG.61.01 → WG.61.02 veins and conservation (FABLE-20: must not start before 19B and 19C)
9. WG.62.01 racial spawn
10. WG.84.01 multi-seed QA
11. WG.86.01 golden master
12. WG.90.01 WorldGen v1 Owner sign-off
13. GP.06–GP.08 and SOC (DEC-002)
14. REL.30.01 demo, then REL.30.02 release candidate

**Owner-ordered 2026-09-26 (sim/render split and LOD) in the engineering chain:**
- **Now, in parallel (docs only):** SIM.00.01 ADR-003 (Lane M). It needs no merge and touches no code. Its perf-budget section takes Lane K's K3 baseline.
- **After steps 1–6** (merge gate merged, H/C2b/E dispositioned, repo moved to `C:\Dev\DEUS`) **and after Lane N** (in-place layer switch, 0017-Q) **and Lane K** (flat render, 0017-Q) are merged:
  - 7a. SIM.00.02 headless core and fixed tick, then SIM.00.03 snapshot interface. These run beside step 7 (render work) because they touch different files; the ADR assigns the write sets.
  - 7b. SIM.00.04 units into the core.
- **Step 8 (WG.61.01/.02) now depends on SIM.00.03,** so the veins and conservation ledger are written against the core, not against `Game_Map.update`.
- **SIM.00.05 (per-system migration) and SIM.30.01–.03 (LOD) run beside steps 8–11.** WG.65.13–14, WG.66 and WG.68 start only after SIM.30.03. WG.84.01's 20-seed QA runs headless on the core.
- **SIM.30.04–.05 and SIM.00.06 finish before step 12** (the WorldGen v1 sign-off evidence includes the long-run LOD QA).

Slices WB-001, WB-002 and GP.03–GP.05 run beside steps 7–12. Their pace is set by Owner playtests.

**B. Art chain (paced by the Owner):**
1. WG.20.01 schema
2. WG.20.02 catalogue
3. WG.30.01 allocation and WG.32.02 blank templates
4. **ART-A style lock (Owner)**
5. WG.41.01 validator in use
6. WG.50 Temperate golden packs (Owner)
7. WG.51–WG.57, WG.60 and ART-B (Owner)
8. WG.00.13 palette migration (T5 Owner)
9. WG.00.16 shading revisit
10. WG.81/WG.82 verification (Owner)
11. REL.10.03 provenance, then REL.30.02

Stages 1, 2 and 4 cost the Owner nothing, so starting them now takes the tooling off the art chain entirely. After that, the only thing gating art is the Owner's own time.

#### Next 10 packages to run in parallel (ranked; write sets are disjoint)

| Rank | Package | Why now | Writer → Reviewer | Write set (no overlap) |
|---|---|---|---|---|
| 1 | **OPS.10.01** merge gate | Every merge on 9/25 went ahead without an independent review [OPS R1]; the gate fixes this for all later work | Claude → Grok | `tools/ops/merge_gate.ps1`, `tools/ops/test_merge_gate.ps1`, `tasks/OPS.10.01/*` |
| 2 | **WG.00.08** Grok verification of `c8694f01` | Unblocks DEC-001, the migration and FABLE-20; reviewer time only | Grok (review only) | `tasks/WG.00.08/review_grok_c8694f01.md` (on the `task/lane-h` branch) |
| 3 | **WG.00.12/C2b** finish and Grok re-attack | Unblocks hooks (OPS.30.03) and the gate's check_claims clause | Claude → Grok | `tools/governance/check_claims.js`, `tools/governance/test_check_claims.js`, the state file named in the C2b brief |
| 4 | **WG.20.01 + WG.20.02** art catalogue (Stage 1) | Start of the art chain; costs the Owner nothing | Claude → Grok | `game/data/DEUS_ArtCatalogue.json`, `docs/art/catalogue/*`, `tools/art_catalogue/*`, `tasks/WG.20.02/*` |
| 5 | **OPS.20.01–03** launcher, pre-push guard, per-agent identity | Ends silent worker deaths and 0-byte logs [OPS R8] | Claude → Grok | `tools/ops/launch_worker.ps1`, `tools/ops/hooks/*`, `tasks/OPS.20/*` |
| 6 | **OPS.30.01** GATE and quarantine lists | Needed by the merge gate and CI | Claude → Grok | `tools/ops/gate_suites.json`, `tools/ops/quarantine.json`, `tools/ops/run_gate.js` |
| 7 | **WG.00.09a** Lane E N5/N6 | On the critical path; the review is already in hand | Claude → Grok | `docs/systems/UF_Depth_Attack_Plan.md`, `tasks/DEUS-TSK-FABLE-19C/*` (lane-e branch) |
| 8 | **WG.00.14** Year-0 Grok closure reviews | Closes ATK-YEAR0; unblocks WG.62 and SIM.10 | Grok (review only) | `tasks/WG.00.11/review_grok_37ac57da.md`, `…_0859ed3c.md`, `…_a8e42502.md` (folder name kept; §6.1) |
| 9 | **WG.41.01** placement plus validator (Stage 4) | Ready before the Owner's first art arrives | Claude → Grok | `tools/art_place/*` (its own synthetic fixtures under `tools/art_place/fixtures/`) |
| 10 | **WG.32.01 + WG.32.02** slotmaps and blank templates (Stage 2) | The Owner gets exact empty sheets to fill | Claude → Grok | `tools/art_templates/*`, `art/templates/*` |

Notes:
- Items 9 and 10 use private fixture catalogues until the WG.20.01 schema freezes. After that they read `DEUS_ArtCatalogue.json` and do not write to it.
- Items 2 and 8 are review-only for Grok, so they can overlap with Grok's attack duties on items 1, 3–7, 9 and 10 when Grok capacity allows. If Grok is the bottleneck, do the reviews in this order: 2, 3, 8, 1.
- **Alongside these, not as worker lanes:**
  - Gemini: OPS.40.03, 40.04, 40.05, 40.08, 40.09 (docs only; outside every write set above).
  - PM: OPS.40.06, 40.07, the 40.01 draft, and the PM-1 ruling.
  - Owner: OPS.50.01–03, WB-001 playtest, and the OD list in §5.
- **Known collision (wait):** `docs/STATUS.md` and the WBS files are Gemini-only during this wave. No worker writes to them.
- **Added (*Owner-ordered 2026-09-26*):** SIM.00.01 ADR-003, Lane M, Claude → Grok, docs only. Write set: `docs/adr/ADR-003_sim_render_split_and_lod.md`, `docs/adr/README.md` (one index line) and `tasks/SIM.00.01/lane-m/**`. This is disjoint from Lanes K and N (0017-Q), H, C2b, E, I and J.

---

### 5.3 Open Owner decisions (with recommended defaults)

| # | Decision | Blocks | Recommended default | Why | Status |
|---|---|---|---|---|---|
| OD-1 | DEC-002: approve the SOC WBS baseline (the "SOC skeleton awaiting approval") | SOC.10–70, GP.08 | **Approve** | Rev 2 is internally consistent; building still waits on M1 | `OPEN` |
| OD-2 | DEC-003: SRD crafting (CRFT) branch | GP.10.01, GP.05 | **Defer until after the migration** | Keeps the migration diff small | `OPEN` |
| OD-3 | DEC-004: `--no-verify` policy | dep: OPS.30.03 | **Zero bypass**; emergency bypass only by the integrator, with a defect record | C2 showed about 40 bypass routes; hooks are pointless if they can be bypassed | `OPEN` |
| OD-4 | DEC-009: move off `uf.hex` before release? | REL.10.02, WG.00.13 priority | **Yes**; WG.00.13 becomes release-blocking | `uf.hex` is the U7 palette (ADR-002 §7.3); a legal risk for shipping | `OPEN` |
| OD-5 | ADR-002 §1.4 interim: which palette new Owner art uses | Stage 3, Stage 4 validator | **New Owner art on the master palette; legacy stays on `uf.hex` until WG.00.13** | Avoids painting everything twice; the Stage 4 validator checks the master palette | `OPEN` |
| OD-6 | Biome count: 5 (WG.00.04) or 6 (production matrix) | WG.22, WG.51, Stage 1 | **5** | WG.00.04 is the canonical standard; the matrix JSON is a stale draft | `OPEN` |
| OD-7 | Style authority: ART_STANDARD F1 (pure 2D FF5/FF6) and the DW charter, vs the briefs' U7 oblique style (art/README) | ART-A, all of Stage 3 | **ART_STANDARD plus the DW.01 charter govern style; the briefs supply ids, sizes and anchors only** | The briefs mandate AI generation and `uf.hex`, both suspended | `OPEN` |
| OD-8 | Facings per character or creature | ART-B, WG.68.16 | **4** (ART_STANDARD F5) | Matches the 12-sprite layout (3 frames × 4 facings) | `OPEN` |
| OD-9 | The 163 original, 27 generated and 17 stock pre-DEC-007 images and the Arid pilot sheets | WG.41.02/EXIST, REL.10.03 | **Keep as placeholders, marked "needs Owner approval"; never ship without a YEA** | Nothing is lost; provenance stays clean | `OPEN` |
| OD-10 | Migration window (OPS.50.04) | the whole engineering chain | **Right after Lanes H, C2b and E merge**, with workers stopped | Smallest in-flight state | `OPEN` |
| OD-11 | Target organization (merge gate, integrator cadence, watchdog; [OPS] §4) | OPS.10.03, OPS.20 | **Approve** | Mechanical checks replace trust | `OPEN` |
| OD-12 | CI plus branch protection on GitHub (and confirm the repo is private) | dep: OPS.30.02 | **Approve** | No gate exists today | `OPEN` |
| OD-13 | Scratch salvage (wt13, 14, 16, 18, 19b, wthead) | OPS.60.01, SIM.20.01 | **Keep all on `salvage/*` branches; triage later** | Cheap; the scratch copies sit in `%TEMP%` on an unstable machine | `OPEN` |
| OD-14 | WB-003 authorization and predator-kill behavior | WB-003, WG.68.07+ | **Authorize with Claude as writer and Grok as reviewer; predator kills drop harvestable remains** | Removes the Gemini role conflict; fits the conserved-mass design | `OPEN` |
| OD-15 | WB-001 Slice 1 playtest | WB-002, all later slices | **Playtest this week** | The earliest item in the queue with a hard dependency | `OPEN` |
| OD-16 | VISION Q4: direct possession vs RTS command | WG.00.11, SOC.50.01 | **Both modes, switchable** (as WG.00.11 describes) | Matches the existing leaf | `OPEN` |
| OD-17 | DW.01.06 autotile standard | dep: WG.30.02 | **Freeze as is** | Unblocks Stage 1 geometry | `OPEN` |
| OD-18 | Definition of "shippable" | dep: REL.30.01 | **The Slices 0–7 demo as a Windows NW.js package** | Stated in `docs/SLICES.md` | `OPEN` |
| PM-1 | *(PM ruling, not Owner)* Is the Lane E document an attack plan or a spec? | WG.00.09a | **Attack plan**; the spec is a separate deliverable in WG.00.09b | Keeps reviewer independence | `PM ruling pending` |

---

## Revision Log

| Rev | Date | Change |
|:---:|:---:|:---|
| 26 | 2026-09-26 | Directives 0035-AJ, 0062-BK, 0063-BL: Minted SIM.40.00 (Material/strata model), SIM.40.11 (Matter ledger & reclamation), SIM.50.11 (People-side gap audit), SIM.50.12 (Living-world rule-breach fix), SIM.50.13 (Ore sprouting & fluid solver fixes), SIM.60.05 (SRD combat rules engine), SIM.60.06 (Combat stress benchmark), SIM.10.05 (Underground Year-0 viability). Recorded DEC-023..DEC-028. |
| 25 | 2026-09-26 | Directive 0030-AE: Minted SIM.00.00 (Lane N layer-switch in-place, merged e27e8be5; Grok CLEAN PASS 14777983); closed SIM.50.01 (Living world gap audit, merged 4614dbfa; Grok PASS 15745e41). Rev 25 (194 packages, 54 Owner-gated). |
| 24 | 2026-09-26 | Directive 0028-AC: New authority split (PM launches/merges directly); recorded DEC-016 (Scale chart governing authority), DEC-017 (RMMZ shell & custom PixiJS fallback), DEC-018 (Hyper-realistic SRD spells), DEC-019..022 (renumbered Addendum items); added SIM.60.01–SIM.60.04 (SRD spell effects), WG.00.24 (Custom multi-layer PixiJS map renderer fallback); updated Lanes S (WG.20.01/.02), T (WG.32.01/.02), U (WG.41.01) DoD and scope ('NO ART GENERATION, BY ANYONE'). Next free WG.00 is WG.00.25. |
| 23 | 2026-09-26 | Directive 0021-V Addendum (§§15–20): Added WG.00.19 (In-Layer Height Presentation & Multi-Strata Movement), WG.00.20 (Seamless Inter-Layer Ramps), WG.00.21 (Layer Occlusion Culling Rule), WG.00.22 (Multi-Depth Presentation Catalogue Slots), WG.00.23 (Overlook Zoom-Out Multi-Layer View), and GP.07.02 (Cross-Layer 3D Targeting, Ballistics & Volume Damage). Next free WG.00 is WG.00.24. |
| 22 | 2026-09-26 | Directive 0021-V Addendum (§14): Added WG.00.18 (Layer-View presentation Owner-led placeholder), SIM.50.01 (Living World Gap Audit), and SIM.50.02–SIM.50.10 (Nine living-world physical simulation systems across 32 layers). Next free WG.00 is WG.00.19. |
| 21 | 2026-09-26 | Directive 0021-V Addendum (§12–§13): DEC-013 amended (32 Z layers supersede 9, range -16..+15, 320 ft height, 10 ft layers, 2 ft strata); updated WG.00.17 (32-layer Z-range refactor with sparse storage and 9-layer test support), WG.62.02 (race home-layer ranges across 5 bands/32 layers), and SIM.40.01 (cross-layer blast propagation and material attenuation). |
| 20 | 2026-09-26 | Directive 0021-V Addendum (§9–§10) / Directive 0023-X: Added SIM.40.10 (Shared reproduction and lifecycle system), DEC-014 (Population budget & crowd LOD), DEC-015 (Faction Development Plans), Vision V139–V141. |
| 19 | 2026-09-26 | Directive 0021-V: Record DEC-013 (9 Z layers, 9 races, one home layer per race, 5 biome bands). Added WG.00.17 (Z-range configurable setting / 9 layers), WG.62.02 (Race home-layer assignment in WorldGen), SIM.40.01–SIM.40.04 (Structural integrity & collapse), and SIM.40.05–SIM.40.09 (Urban decay & nature reclamation). Next free WG.00 is WG.00.18. |
| 18 | 2026-09-26 | Owner approved master WBS ('Follow the WBS', 00:00 CT). Added §5 master packages (OPS, SIM, GP, REL); minted WG.00.14 (Year-0, alias tasks/WG.00.11), WG.00.15, WG.00.16, WG.20.02, WG.32.02; SIM.00/SIM.30 Owner-ordered 2026-09-26 (DEC-012); DW crosswalk fix; Rule 1/3/4 notes; closedBy column. OD-1..OD-18 OPEN (directive 0018-R). |
| 17 | 2026-09-25 | Rev 16 row misdescribed WG.00.13; WG.00.13 = Master Palette Engine Migration, consolidation is WG.00.12. Align roles with CANONICAL_ROLES, DEC-001 and DEC-007 (Directive 001-L). |
| 16 | 2026-09-25 | Add WG.00.13 (Consolidation, Machine Governance & Backup Infrastructure / Directive 001). |
| 15 | 2026-09-25 | WG.00.08 returned to REVIEW per DEUS Directive 001; WG.00.07 strata range corrected to 0..4 (S0-S4); WG.00.12 added. |
| 14 | 2026-09-25 | Add WG.00.11 (Incarnation & Command Layer). Adopt integer rev header and immutable ID governance. Next free in WG.00 is WG.00.12. |
| 13 | 2026-09-25 | Add WG.63–WG.68 (Historical Landmarks, Karst/Geology, Reclamation, Hydrology, Soils, Living Ecology). |
| 12 | 2026-09-25 | WG.00.08 marked DONE (Cuts and caves on all five Z / commit `2e4571a`). |
| 11 | 2026-09-24 | WG.00.07 marked DONE (Fluid reconciliation / commit `2f47203`). |
| 10 | 2026-09-24 | WG.00.06 marked DONE (Five-strata foundation / FABLE-19A / commit `edba004`). |


