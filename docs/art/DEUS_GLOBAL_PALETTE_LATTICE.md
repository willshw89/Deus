# DEUS — Global Biome Palette Lattice & 15-Boundary Transition Architecture
**Document ID:** `DEUS-PAL-LATTICE-01`  
**Status:** Authoritative Palette Architecture & Production Specification (Phase A Revision)  
**Authority:** Gemini (Full-Stack Coordinator & Art Authority) & Project DEUS Art Direction  
**Applicability:** Master Charter Task Family `WORLDART-BIOMES`, Google Nano Banana Pro generation prompts, `tools/art_check.js`  

---

## 1. Executive Summary & Core Principle

$$\textbf{NO BIOME EXISTS AS A DISCONNECTED COLOR ISLAND.}$$

The DEUS overworld is **one continuous physical world**, not a mosaic of jarring, hard-bordered board-game tiles. From the canonical fixed gameplay camera and zoomed-out strategic view, the terrain transitions smoothly like a natural, harmonious landscape.

Every biome at every Z level ($Z+2, Z+1, Z0, Z-1, Z-2$) comprises:
1. **One Canonical Core Package (`_CORE`):** The uncompromised environmental heart of the biome.
2. **Five Neighbor-Biased Edge Packages (`_TO_<NEIGHBOR>`):** Exactly one package tailored to transition toward each of the other five major biomes.
3. **Internal Multi-Shade Variation:** Each individual package contains 3–6 internal compatible shades for ground, foliage, soil, and rocks, with its overall chromatic and ecological bias directed toward the core or the selected neighbor.
4. **100% Strict Containment:** All colors originate in and conform to the canonical DEUS 16-bit master palette (`art/palette/uf.hex`).

$$\text{6 Biomes} \times \text{5 Z Levels} \times \text{6 Packages (1 Core + 5 Edges)} = \mathbf{180\text{ Full Tileset Packages}}.$$

---

## 2. The Biome Boundary Transition Model

Transitions between adjacent biomes never rely on abrupt borders or generic edge tiles. Every boundary between Biome A and Biome B is executed as a **coordinated 5-step ecological corridor**:

$$\mathbf{A\text{\_CORE} \longrightarrow A\text{\_TO\_}B \longrightarrow \text{Shared Ecotone / Transition Overlays} \longrightarrow B\text{\_TO\_}A \longrightarrow B\text{\_CORE}}$$

- **$A\text{\_CORE}$:** Pure expression of Biome A (e.g. `TEMP_Z0_CORE`: dense deciduous loam meadow).
- **$A\text{\_TO\_}B$:** Biome A terrain exhibiting early environmental stress/influence from Biome B (e.g. `TEMP_Z0_TO_ARID`: grass drying to olive/straw, soil thinning to reddish clay, sparser vegetation).
- **Shared Ecotone / Overlays:** D-sheet transition fringe overlays and autotile edge dither blending between $A\text{\_TO\_}B$ and $B\text{\_TO\_}A$.
- **$B\text{\_TO\_}A$:** Biome B terrain exhibiting early environmental influence from Biome A (e.g. `ARID_Z0_TO_TEMPERATE`: desert sand with hardy bunchgrass tufts, alluvial dry soil, occasional hardy shrubs).
- **$B\text{\_CORE}$:** Pure expression of Biome B (e.g. `ARID_Z0_CORE`: wind-scoured dunes and cracked sun-baked clay).

---

## 3. The 15 Pairwise Biome Boundaries & Coordinated Edge Packages

With 6 major biomes, exactly $\frac{6 \times 5}{2} = 15$ unique geographic boundary relationships exist:

| # | Biome Boundary ($A \leftrightarrow B$) | Coordinated Edge Packages ($A\text{\_TO\_}B \leftrightarrow B\text{\_TO\_}A$) | Physical Ecotone Corridor | Shared Bridge Colors (Hex) | Ecological & Material Markers |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **01** | **Temperate $\leftrightarrow$ Wetland** | `TEMP_TO_WETLAND` $\longleftrightarrow$ `WET_TO_TEMPERATE` | Lowland Floodplain & Sedge Marsh | `#26402E`, `#4A6042`, `#38523A` | Loam softens to dark humus; standing pools form; clovers give way to rushes and cattails. |
| **02** | **Temperate $\leftrightarrow$ Arid** | `TEMP_TO_ARID` $\longleftrightarrow$ `ARID_TO_TEMPERATE` | Dry Steppe & Savanna Scrub | `#88A654`, `#865A2C`, `#A87A3E` | Lush turf turns olive, thins to bunchgrass; exposed clay patches appear; thorny scrub. |
| **03** | **Temperate $\leftrightarrow$ Highland** | `TEMP_TO_HIGHLAND` $\longleftrightarrow$ `HIGH_TO_TEMPERATE` | Rocky Foothills & Escarpment Slopes | `#446E32`, `#3C4452`, `#555F70` | Rolling loam breaks over stone shelves; loose scree; stunted birch replace oaks. |
| **04** | **Temperate $\leftrightarrow$ Cold** | `TEMP_TO_COLD` $\longleftrightarrow$ `COLD_TO_TEMPERATE` | Boreal Ecotone & Frost Heath | `#2E5224`, `#3E5268`, `#607A94` | Deciduous trees yield to hardy pines; grasses take on pale hoarfrost rims; needle-ice loam. |
| **05** | **Temperate $\leftrightarrow$ Volcanic**| `TEMP_TO_VOLCANIC` $\longleftrightarrow$ `VOLC_TO_TEMPERATE` | Scorched Forest & Ash Fringe | `#446E32`, `#3C2824`, `#221C22` | Living vegetation wilts into charred trunks; black ash drifts over green moss; warm fissures. |
| **06** | **Wetland $\leftrightarrow$ Arid** | `WET_TO_ARID` $\longleftrightarrow$ `ARID_TO_WETLAND` | Alkali Flats & Salt Marshes | `#5C6B44`, `#865A2C`, `#C89E58` | Standing water evaporates into cracked salt crusts; pickleweed and salt-tolerant scrub. |
| **07** | **Wetland $\leftrightarrow$ Highland**| `WET_TO_HIGHLAND` $\longleftrightarrow$ `HIGH_TO_WETLAND` | Mountain Bog & Cascading Tarns | `#26402E`, `#3C4452`, `#727E90` | Peat hummocks step up wet granite tiers; mossy waterfalls carve channels through alpine rock. |
| **08** | **Wetland $\leftrightarrow$ Cold** | `WET_TO_COLD` $\longleftrightarrow$ `COLD_TO_WETLAND` | Frozen Palsa Bog & Arctic Muskeg | `#182C20`, `#3E5268`, `#8CA8C2` | Brackish pools freeze into black swamp ice; peat hummocks lock in permafrost; brittle frost spires. |
| **09** | **Wetland $\leftrightarrow$ Volcanic**| `WET_TO_VOLCANIC` $\longleftrightarrow$ `VOLC_TO_WETLAND` | Thermal Mud Pots & Solfataras | `#182C20`, `#5C2818`, `#3C2824` | Stagnant bogs boil with geothermal steam; sulfur mud bubbling pits; blackened reed skeletons. |
| **10** | **Arid $\leftrightarrow$ Highland** | `ARID_TO_HIGHLAND` $\longleftrightarrow$ `HIGH_TO_ARID` | Desert Canyon Rim & Scree Benches| `#A87A3E`, `#555F70`, `#727E90` | Sand sheets terminate against talus slopes; red sandstone walls transition into dark igneous crags. |
| **11** | **Arid $\leftrightarrow$ Cold** | `ARID_TO_COLD` $\longleftrightarrow$ `COLD_TO_ARID` | Cold Desert & Dry Polar Steppe | `#C89E58`, `#607A94`, `#8CA8C2` | Parched dunes give way to wind-scoured gravel plains; dry freezing winds; absence of moisture. |
| **12** | **Arid $\leftrightarrow$ Volcanic** | `ARID_TO_VOLCANIC` $\longleftrightarrow$ `VOLC_TO_ARID` | Black Cinder Dunes & Basalt Flats| `#A87A3E`, `#3C2824`, `#100E12` | Yellow/red sand mixes with black basaltic ash; volcanic bomb fields strewn across arid plains. |
| **13** | **Highland $\leftrightarrow$ Cold**| `HIGH_TO_COLD` $\longleftrightarrow$ `COLD_TO_HIGHLAND` | Glacial Horns & Firn Basins | `#555F70`, `#727E90`, `#C4DCF0` | Sheer granite precipices enter eternal snowline; blue glacial crevasses split jagged mountain rock. |
| **14** | **Highland $\leftrightarrow$ Volcanic**| `HIGH_TO_VOLCANIC` $\longleftrightarrow$ `VOLC_TO_HIGHLAND` | Magmatic Faults & Obsidian Crags | `#3C4452`, `#221C22`, `#8A3414` | Alpine granite cut by basalt dikes; sulfur plumes venting from high rocky clefts. |
| **15** | **Cold $\leftrightarrow$ Volcanic** | `COLD_TO_VOLCANIC` $\longleftrightarrow$ `VOLC_TO_COLD` | Subglacial Volcanoes & Steam Fumaroles | `#607A94`, `#C4DCF0`, `#8A3414` | Snowfields melt into thermal meltwater rills; black cinder erupts through blue ice shelves. |

---

## 4. Internal Color Variation Within Each Package

A package is **never** a single flat hue. Within every package, terrain contains a palette cluster of multiple harmonized values and textures:

- **Grass / Ground Cover:** 3–4 stepped values (base shade, sun highlight, deep clump shadow, contact occlusion).
- **Soil / Dirt Paths:** 3 values (packed travel line, loose verge dirt, moisture/organic rim).
- **Stone / Exposed Geology:** 3–4 values (highlight facet, mid-tone mineral body, shadow crevice, contact outline).
- **Flora / Foliage:** Multi-shade foliage clusters for trees, bushes, and flowers.

### Example: Temperate Z0 Package Internal Palette Biases
1. **`TEMP_Z0_CORE`:**
   - Grass: Emerald/Forest greens (`#1E3A18`, `#2E5224`, `#446E32`).
   - Soil: Deep organic brown loam (`#342216`, `#4A3222`).
   - Stone: Weathered gray limestone (`#484C54`, `#626874`).
2. **`TEMP_Z0_TO_WETLAND`:**
   - Grass: Dark saturated moss greens (`#142416`, `#1E3420`, `#2B4428`).
   - Soil: Black waterlogged peat/humus (`#1A1612`, `#26201A`).
   - Stone: Algae-covered damp stone (`#2E3A32`, `#3E4C42`).
3. **`TEMP_Z0_TO_ARID`:**
   - Grass: Sun-bleached olive and dry straw greens (`#586E38`, `#748A46`, `#92A45C`).
   - Soil: Dry reddish clay and silt (`#6E4A28`, `#8A6036`).
   - Stone: Sun-baked warm sandstone pebbles (`#7C644E`, `#9C826A`).
4. **`TEMP_Z0_TO_HIGHLAND`:**
   - Grass: Cold alpine greens (`#26442E`, `#36583E`, `#4E7456`).
   - Soil: Gritty decomposed granite scree (`#3A3C42`, `#50545C`).
   - Stone: Jagged slate and granite fractures (`#282D38`, `#3C4452`, `#555F70`).
5. **`TEMP_Z0_TO_COLD`:**
   - Grass: Frost-rimmed blue-greens and yellowing tundra heath (`#244034`, `#385848`, `#5A7A68`, `#7E9E8C`).
   - Soil: Cold needle-ice soil (`#282A30`, `#3A3E48`).
   - Stone: Hoarfrost-dusted dark stone (`#323846`, `#4A5466`).
6. **`TEMP_Z0_TO_VOLCANIC`:**
   - Grass: Heat-stressed scorched dark olive with soot dusting (`#222C1A`, `#323E26`, `#464228`).
   - Soil: Dark cinder loam and ash-drift dirt (`#1E1C1A`, `#2E2A28`).
   - Stone: Porous pumice and dark basalt fragments (`#18161A`, `#28242A`).

---

## 5. RMMZ Sheet Geometry Standards (Verified Ground Truth)

Every sheet generated for the 180 packages conforms strictly to RPG Maker MZ's native tilemap architecture:

| Sheet | Purpose | Sheet Dimensions | Tile Grid | Layout & Slicing Specifications |
| :--- | :--- | :--- | :--- | :--- |
| **A1** | Liquids & Animated Ground | **768 × 576 px** | 16 × 12 tiles | 16 autotile blocks. Left block: Ocean/Deep/Shoal; Right block: Rivers/Waterfalls (waterfalls animate vertically). |
| **A2** | Ground Autotiles | **768 × 576 px** | 16 × 12 tiles | 32 autotile blocks (each 96×144 px: 2×3 tiles). Full floor + inner/outer corner transitions. |
| **A3** | Roofs & Canopy Overhangs | **768 × 384 px** | 16 × 8 tiles | 32 autotiles (each 96×96 px: 2×2 tiles; 4 rows of 8 autotiles). |
| **A4** | Elevation Walls & Cliffs | **768 × 720 px** | 16 × 15 tiles | 48 autotiles (each 96×120 px: 2×2.5 tiles). Top 48 px cap strictly adheres to the **DF Black Wall-Top Convention**. |
| **A5** | Normal Static Terrain | **384 × 768 px** | 8 × 16 tiles | 128 single static 48×48 tiles. Base fills, stone stairs, natural pits. |
| **B – E** | Objects, Clutter & Transitions | **768 × 768 px** | 16 × 16 tiles | 256 tiles per sheet. Cell [0,0] on B reserved transparent. Flora anchored at $y=47$. |
