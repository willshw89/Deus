# DEUS — Biome Identity & Material Differentiation Standard (DW.01.04)

**Document ID:** `DEUS-ART-BIOME-01`  
**Task:** `DW.01.04 — Freeze Biome Identity & Material Differentiation Standard`  
**WBS Phase:** `DW.01 — World-Art Foundation Standards`  
**Prerequisites:** `DW.01.01` (Visual Charter, commit `42f0169`), `DW.01.02` (Native Resolution, commit `faeee9e`), `DW.01.03` (Scale Standard, commit `474aa57`), `DEUS-WORLD-WBS-v1.0` (commit `6e6a964`)  
**Status:** CANONICAL & FROZEN  
**Authority:** Project Owner Directive (2026-09-24)  

---

## 1. Executive Summary & Separation of Concerns

This standard formalizes the canonical **material, geological, and ecological identities** of the five Project DEUS biomes based on the approved visual charter (`art/reference/DEUS_BIOME_STUDIES_V1.*` and `art/reference/DEUS_GAMEPLAY_PERSPECTIVE_MASTER_V1.*`).

$$\textbf{A BIOME IS A PHYSICAL SYSTEM, NOT A PALETTE RECOLOR.}$$

Future art generation must never produce biome assets by simply tinting, hue-shifting, or recoloring existing sprites. Each biome possesses its own unique geological fracturing, soil substrate, moisture dynamics, ecological density, and botanical morphology.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              SEPARATION OF ARCHITECTURAL AUTHORITY                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. BIOME IDENTITY (THIS STANDARD / DW.01.04):                                          │
│    Establishes WHAT each biome physically is: substrate, geology, flora, forms,         │
│    densities, forbidden cues, vertical Z hooks, and horizontal transition axes.        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. PALETTE ARCHITECTURE (DW.01.05):                                                    │
│    Establishes the cohesive color ramp tokens, contrast curves, and master hex palette  │
│    snapping (art/palette/uf.hex). Exact RGB/hex color ramps are NOT frozen here.       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. WORLD GENERATION (DEUS_WorldGen.js & Catalog):                                      │
│    Governs procedural noise algorithms, seed isolation, and macro continental mapping.  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. TILE PACKING & BITMASKING (DW.01.06+):                                              │
│    Governs RMMZ A1-A5/B-E sheet layout, autotile 48px bitmasking, and sprite borders.  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Cardinal Ecological Rules:**
> 1. **THERE IS NO FROZEN / SNOW BIOME IN PROJECT DEUS.**
>    Highland and mountain terrain is characterized by sheer granite mass, cleft slate scree, and windswept alpine conifers—**never snow, ice, frost, or glaciers**.
> 2. **LAVA IS A FOCAL FEATURE, NOT WALLPAPER.**
>    Volcanic terrain is dominated by dark charcoal basalt, porous scoria, and powdery ash drifts. Molten lava is a localized accent hazard, never full-screen glowing red terrain.

---

## 2. The Five Canonical Biomes

```
┌──────┬───────────────────────┬──────────────────────────────────┬──────────────────────┐
│ ID   │ Canonical Display Name│ Signature Geology                │ Moisture & Drainage  │
├──────┼───────────────────────┼──────────────────────────────────┼──────────────────────┤
│ TEMP │ Temperate / Verdant   │ Rounded fieldstone, limestone    │ Moderate (Well-drain)│
│ WET  │ Wetland / Riverland   │ Slick river stones, dark slate   │ High (Poor drainage) │
│ ARID │ Arid / Steppe / Desert│ Layered sandstone, caliche shale │ Low (Rapid runoff)   │
│ HIGH │ Highland / Mountain   │ Fractured granite, slate scree   │ Variable (Grav. run) │
│ VOLC │ Volcanic / Ashland    │ Columnar basalt, porous scoria   │ Low (Porous internal)│
└──────┴───────────────────────┴──────────────────────────────────┴──────────────────────┘
```

---

### 2.1 `TEMP` — Temperate / Verdant

- **Core Concept:** The fertile, grounded cradle of human civilization and agriculture. Mild, sun-dappled, living landscape with comfortable negative tactical space.
- **Dominant Ground:** Lush verdant meadow turf, compacted dirt walking trails, dark woodland floor.
- **Exposed Soil:** Rich dark brown loam, crumbly organic humus, compact garden earth.
- **Geology:** Rounded field stones, weathered limestone ledges with softened contours, grey granite boulders.
- **Moisture & Drainage:** Moderate moisture; balanced, well-drained topsoil.
- **Ecological Density:** Grass: `DENSE`, Shrubs: `MODERATE`, Trees: `MODERATE_TO_DENSE`, Low Flora: `MODERATE`, Debris: `MODERATE`.
- **Vegetation Form:** Billowing broadleaf deciduous canopies, soft rounded shrub masses, upright leafy herbs.
- **Flora Vocabulary:**
  - *Trees:* Standard Oak (~84 px), Slender Birch (~88 px), Upland Pine (~92 px), Orchard Fruit Trees.
  - *Shrubs:* Small berry bush, medium foliage bush, dense perimeter thicket.
  - *Low Flora:* Ankle-high meadow turf, clover patches, tall meadow grass, wild poppies, buttercups, woodland ferns.
- **Rock Outcrops:** Rounded fieldstone piles, chest-height granite boulders (~42 px), stepped limestone ridges.
- **Debris & Clutter:** Leaf litter, fallen branches, timber logs, stumps, loose pebbles.
- **Water-Edge Behavior:** Clean gradual pebble and loam slope into clear freshwater streams and ponds; clean sand/gravel bars with gentle ripples.
- **Elevation Character:** Gentle rolling hills, earthen berms, layered limestone/granite bluffs (1–2 grid vertical).
- **Atmospheric Feel:** Mild, temperate, clear air, gentle sunbeams, soft morning meadow haze.
- **Signature Materials:** Rich dark brown loam, broadleaf oak canopy, fieldstone masonry, clover meadow turf.
- **Shared Materials:** Grey granite, clear freshwater, pine, birch, compact dirt, timber logs.
- **Forbidden Visual Cues:** Snow, ice, frost, desert hardpan, alkali dust, peat swamp saturation everywhere, volcanic ash/basalt, glowing lava.

---

### 2.2 `WET` — Wetland / Riverland

- **Core Concept:** Saturated, waterlogged lowland basin where water and organic matter intertwine. Tangled, lush, heavy, and treacherous underfoot.
- **Dominant Ground:** Waterlogged spongy grass, peat mounds, dark mud flats, submerged marsh turf.
- **Exposed Soil:** Dark saturated organic muck, dense peat, soft dark river silt.
- **Geology:** Water-smoothed river cobbles, dark damp slate slabs, low moss-covered rocks.
- **Moisture & Drainage:** High moisture; poor, sluggish drainage with high surface water tables.
- **Ecological Density:** Grass: `DENSE`, Shrubs: `DENSE`, Trees: `SPARSE_TO_MODERATE`, Low Flora: `VERY_DENSE`, Debris: `DENSE`.
- **Vegetation Form:** Upright vertical reeds and cattails, weeping willow fronds, tangled root buttresses, floating aquatic lily pads.
- **Flora Vocabulary:**
  - *Trees:* Water-tolerant weeping willow, swamp alder, bog birch, stunted cypress forms.
  - *Shrubs:* Waterlogged marsh bush, dense swamp tangle, bog myrtle, tangled briar.
  - *Low Flora:* Tall cattails, marsh reeds, rushes, water lilies, duckweed, spongy bog moss.
- **Rock Outcrops:** Water-slicked river boulders, submerged stepping stones, moss-blanketed low rock slabs.
- **Debris & Clutter:** Waterlogged driftwood, exposed gnarly root systems, rotting timber snags, peat chunks.
- **Water-Edge Behavior:** Indistinct saturated shoreline: water grades into mud, peat, and floating reed beds; stagnant ponds and murky oxbow channels.
- **Elevation Character:** Depressed basin, shallow swales, riverbanks, low mud shelves, raised natural peat levees.
- **Atmospheric Feel:** Humid, heavy, damp, low-hanging river mist, stagnant air.
- **Signature Materials:** Saturated dark peat, upright cattail/reed beds, waterlogged driftwood snags, murky slow water, dark swamp silt.
- **Shared Materials:** Freshwater, bog birch, river stones, wooden planks/docks, marsh ferns.
- **Forbidden Visual Cues:** Bright neon tropical jungle greens, dry sand dunes, arid hardpan, sharp dry granite scree, snow/ice, volcanic lava.

---

### 2.3 `ARID` — Arid / Steppe / Desert

- **Core Concept:** Sun-baked, wind-scoured open terrain where water is precious. Defined by horizontal sedimentary geology, drought-adapted ecology, and wide-open visibility.
- **Dominant Ground:** Dry steppe earth, sun-baked hardpan, loose coarse sand, cracked clay washes.
- **Exposed Soil:** Caliche-rich pale dry earth, cracked sun-baked clay, powdery mineral dust.
- **Geology:** Layered red/buff sandstone, horizontal sedimentary strata, eroded mesa caps, warm weathered rock.
- **Moisture & Drainage:** Low moisture; rapid flash-flood runoff with high surface evaporation.
- **Ecological Density:** Grass: `SPARSE`, Shrubs: `SPARSE`, Trees: `VERY_SPARSE`, Low Flora: `SPARSE`, Debris: `SPARSE_TO_MODERATE`.
- **Vegetation Form:** Isolated spiky bunchgrass clumps, twisted drought-stunted wood, thorny succulents, flat-topped umbrella canopies.
- **Flora Vocabulary:**
  - *Trees:* Acacia-like thorny trees, drought-adapted juniper, dead sun-bleached snags, twisted mesquite.
  - *Shrubs:* Spiny thorn scrub, dry sagebrush, drought tumble-bushes, creosote scrub.
  - *Low Flora:* Spiky bunchgrass, desert succulents/agave, dry ground lichen, opportunistic wash blooms.
- **Rock Outcrops:** Stepped sandstone ledges, horizontal canyon walls, wind-eroded hoodoos, loose sandstone rubble.
- **Debris & Clutter:** Bleached animal skulls/bones, sun-cracked branches, loose shale/sandstone fragments, windblown tumble-debris.
- **Water-Edge Behavior:** Ephemeral dry washes (arroyos) with cracked mud beds; rare isolated oasis/springs with narrow high-contrast verdant fringe.
- **Elevation Character:** Flat-topped mesas, steep sandstone canyons, stepped rock benches, eroded escarpments.
- **Atmospheric Feel:** Dry, sun-bleached, intense thermal shimmer, cloudless high sky, crisp starry nights.
- **Signature Materials:** Layered sandstone, cracked caliche hardpan, spiky drought bunchgrass, bleached bones, dry wash silt.
- **Shared Materials:** Stone rubble, common dirt (dry), coarse sand, scrub wood, rare oasis freshwater.
- **Forbidden Visual Cues:** Temperate grass recolored yellow, continuous lush green carpet, mossy forest loam, standing marsh peat, snow/ice, volcanic basalt.

---

### 2.4 `HIGH` — Highland / Mountain

- **Core Concept:** Imposing, windswept elevated massif defined by sheer physical rock mass, angular fracture planes, and rugged alpine survival.
- **Dominant Ground:** Thin hardy turf, rock-strewn upland earth, angular gravel scree, bare bedrock.
- **Exposed Soil:** Shallow stony upland loam, weathered gravelly soil, coarse crushed rock.
- **Geology:** Sharp fractured grey granite, dark cleft slate, angular scree talus, massive bedrock cliffs.
- **Moisture & Drainage:** Variable moisture; rapid gravitational runoff along steep rock faces.
- **Ecological Density:** Grass: `MODERATE`, Shrubs: `SPARSE_TO_MODERATE`, Trees: `SPARSE_TO_MODERATE`, Low Flora: `MODERATE`, Debris: `DENSE`.
- **Vegetation Form:** Wind-pruned krummholz conifers, low-growing cushion plants, hardy upright tussocks tucked in rock crevices.
- **Flora Vocabulary:**
  - *Trees:* Mountain pine, slender high-elevation birch, wind-twisted larch/conifer, stunted fir.
  - *Shrubs:* Tough upland heath, crevice-dwelling alpine juniper, wind-flattened dwarf scrub.
  - *Low Flora:* Rock-cleft hardy flowers (WITHOUT snow association), cushion moss, tough upland fescue, cliffside lichens.
- **Rock Outcrops:** Vertical fractured granite faces, jagged slate columns, tumbling talus/scree fields, carved stone mountain steps.
- **Debris & Clutter:** Freshly fractured stone chips, rockfall boulders, weathered mountain timber, gravel scree.
- **Water-Edge Behavior:** Fast-flowing cascading mountain brooks, narrow rocky rapids over clean granite, crystalline pool basins with zero mud.
- **Elevation Character:** Steep vertical 2-grid and multi-level cliff walls, narrow shelf passes, high plateaus, jagged ridges.
- **Atmospheric Feel:** Cool, crisp, windswept, thin clear air, dynamic fast-moving mountain clouds.
- **Signature Materials:** Fractured angular granite, cleft slate scree, wind-shaped mountain conifer, rock-ledge cushion flora, crystalline cascade water.
- **Shared Materials:** Pine, birch, fieldstone, freshwater, coarse gravel.
- **Forbidden Visual Cues:** **SNOW OF ANY KIND, ICE, GLACIERS, FROST CRUSTING**, standing swamp mud, desert sand dunes, volcanic lava.

---

### 2.5 `VOLC` — Volcanic / Ashland

- **Core Concept:** Stark, geological wasteland shaped by subterranean heat and tectonic violence. Dark charcoal basalt and ash punctuated by localized geothermal features.
- **Dominant Ground:** Powdery grey-black ash drifts, scorched earth, dark volcanic gravel, crusted basalt rock.
- **Exposed Soil:** Fine mineral ash, burnt clay, sulfur-stained dark soil, heat-hardened crust.
- **Geology:** Vesicular scoria, dark columnar basalt, obsidian glass shards, porous pumice blocks.
- **Moisture & Drainage:** Low moisture except localized geothermal sumps; highly porous internal drainage.
- **Ecological Density:** Grass: `VERY_SPARSE`, Shrubs: `VERY_SPARSE`, Trees: `VERY_SPARSE`, Low Flora: `SPARSE`, Debris: `DENSE`.
- **Vegetation Form:** Charred skeletal trunks, stunted fire-adapted brush, pioneering geothermal moss, cracked root remnants.
- **Flora Vocabulary:**
  - *Trees:* Charred deadwood trunks, standing burned snags, rare heat-adapted resinous ironwood.
  - *Shrubs:* Brittle scorched scrub, sulfur-tolerant dwarf brush, blackened briar.
  - *Low Flora:* Fireweed recovery sprouts, geothermal sulfur lichen, tough volcanic tuft-grass in cool rock cracks.
- **Rock Outcrops:** Columnar basalt pillars, jagged cooling fissures, vesicular scoria boulders, caldera crater walls.
- **Debris & Clutter:** Charcoal chunks, pumice gravel, black obsidian flakes, ash drifts, burned timber logs.
- **Water-Edge Behavior:** Steaming geothermal pools, sulfurous mineral springs with vibrant yellow-green encrusted rims; acid ponds; localized molten lava channels with cooled black rock crusts.
- **Elevation Character:** Fractured volcanic cones, terraced basalt steps, sudden tectonic fissures, crater rims.
- **Atmospheric Feel:** Smoky, haze-choked, thermal updrafts, glowing embers on wind, sulfur scent.
- **Signature Materials:** Columnar basalt, fine black/grey ash, porous scoria, charred snags, focal molten lava (accent only), sulfur crust.
- **Shared Materials:** Dark stone, gravel, deadwood, mineral earth.
- **Forbidden Visual Cues:** Entire screen glowing red/orange wallpaper, lush green grass, healthy broadleaf oaks, swamp peat, snow/ice.

---

## 3. Signature vs. Shared Materials Taxonomy

To prevent unnecessary asset duplication while preserving distinct biome identities, materials are categorized into three operational classes:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               MATERIAL TAXONOMY MODEL                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ A. BIOME-SIGNATURE MATERIALS:                                                          │
│    Exclusive to one biome. Immediate visual anchor that defines identity.              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ B. SHARED MATERIALS WITH DIFFERENT PREVALENCE & FORM:                                  │
│    Present across multiple biomes, but changes structural form, frequency, or density. │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ C. UNIVERSAL / SYSTEMIC MATERIALS:                                                     │
│    Shared globally across the entire simulation (water, timber planks, dirt roads).     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Taxonomy Matrix
| Material Class | Temperate (`TEMP`) | Wetland (`WET`) | Arid (`ARID`) | Highland (`HIGH`) | Volcanic (`VOLC`) |
|---|---|---|---|---|---|
| **Dominant Rock** | Rounded fieldstone | Smooth river cobble | Stepped sandstone | Angular fractured granite | Columnar basalt / scoria |
| **Dominant Soil** | Crumbly dark loam | Saturated black peat | Sun-baked caliche | Shallow gravelly grit | Powdery mineral ash |
| **Vegetation Type**| Broadleaf oak / meadow | Upright cattails / reeds| Spiky bunchgrass / scrub | Wind-pruned krummholz pine| Charred deadwood / fireweed |
| **Water Form** | Clear flowing brook | Murky stagnant marsh | Ephemeral dry wash / oasis| White water cascade | Steaming geothermal pool |
| **Primary Debris** | Leaf litter / branches | Driftwood / roots | Bleached animal bones | Angular scree chips | Charcoal / pumice / obsidian |

---

## 4. Material Form Differences (Form, Not Just Color)

When generating artwork for different biomes, instructions must declare structural, geometric, and silhouette variations:

1. **Rock Morphology:**
   - `TEMP`: Softly rounded by rainfall and biological weathering. Soft corners, moss patches, moderate jointing.
   - `WET`: Polished smooth by perpetual water action. Slick surfaces, low profile, submerged stepping stones.
   - `ARID`: Pronounced horizontal bedding planes. Flat stepped shelves, sharp 90-degree undercut edges, wind-faceted planar facets.
   - `HIGH`: Sheer, crystalline, jagged fracture lines. Acute cleavage angles, vertical jointing, sharp scree talus.
   - `VOLC`: Hexagonal columnar jointing (basalt), highly pitted vesicular surfaces (scoria), sharp conchoidal glass edges (obsidian).

2. **Soil Geometry:**
   - `TEMP`: Crumbly, aggregate soil clumps with visible humus and rootlets.
   - `WET`: Cohesive, glistening organic mud and dense fibrous peat mounds.
   - `ARID`: Polygonal shrinkage cracks in hardpan, windblown ripples in dust.
   - `HIGH`: Loose coarse gravel and crushed stone chips with zero cohesive binding.
   - `VOLC`: Soft powdery drift banks of air-fall ash, brittle heat-baked mineral crusts.

3. **Flora Morphology:**
   - `TEMP`: Full, rounded, billowing organic volumes. Upright leafy stalks.
   - `WET`: Long, vertical sword-like blades, weeping droops, sprawling surface root networks.
   - `ARID`: Spiky radial tufts, fleshy flattened succulent leaves, gnarled twisted wood.
   - `HIGH`: Low hemispherical cushion cushions, one-sided wind-sheared canopies, crevice hugs.
   - `VOLC`: Leafless skeletal branches, charred snags, low basal recovery rosettes.

---

## 5. Ecological Density Profiles

Density is specified using a standardized 5-tier vocabulary: `VERY_SPARSE`, `SPARSE`, `MODERATE`, `DENSE`, `VERY_DENSE`.

| Biome ID | Ground Turf | Shrubs & Bushes | Trees & Canopies | Low Flora / Forage | Debris & Clutter |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **`TEMP`** | `DENSE` | `MODERATE` | `MODERATE_TO_DENSE` | `MODERATE` | `MODERATE` |
| **`WET`** | `DENSE` | `DENSE` | `SPARSE_TO_MODERATE` | `VERY_DENSE` | `DENSE` |
| **`ARID`** | `SPARSE` | `SPARSE` | `VERY_SPARSE` | `SPARSE` | `SPARSE_TO_MODERATE` |
| **`HIGH`** | `MODERATE` | `SPARSE_TO_MODERATE` | `SPARSE_TO_MODERATE` | `MODERATE` | `DENSE` |
| **`VOLC`** | `VERY_SPARSE` | `VERY_SPARSE` | `VERY_SPARSE` | `SPARSE` | `DENSE` |

---

## 6. Biome Differentiation Quality Gates

Before any world-art asset is accepted into Project DEUS, it must satisfy four objective differentiation criteria:

1. **The Grayscale Material Test:**
   - If saturation is reduced to 0, can an observer distinguish the biome immediately from structural forms, fracture geometry, and substrate texture alone?
   - *Pass:* Stepped sandstone vs. rounded fieldstone vs. sharp granite cliffs vs. columnar basalt are clearly distinguishable in black and white.
2. **The Silhouette / Edge Test:**
   - Do tree, rock, and shrub contours display authentic biome silhouettes (e.g. billowing oak crown vs. spiky acacia vs. krummholz conifer)?
3. **The Ecological Density Test:**
   - Does asset clustering reflect real moisture and soil capacity (e.g. continuous lush carpet in Temperate vs. isolated clumps in Arid)?
4. **The Bare Substrate Test:**
   - If all trees, rocks, and buildings are removed, does the bare ground tile clearly communicate its substrate (crumbly loam vs. peat muck vs. caliche hardpan vs. mountain gravel vs. volcanic ash)?

---

## 7. Vertical Z Continuity Hierarchy

The five physical Z levels express biome identities with vertical consistency:

| Level | Role | Temperate (`TEMP`) | Wetland (`WET`) | Arid (`ARID`) | Highland (`HIGH`) | Volcanic (`VOLC`) |
|---|---|---|---|---|---|---|
| **Z+2** | Highest / Exposed | Exposed high ridge crest, shallow upland soil, sparse wind vegetation | Elevated wetland knoll crests, raised peat ridges, exposed saturated margins | Mesa summit, exposed sandstone caprock, wind-scoured dry surface | Sheer jagged granite summits, mountain horn peaks, windswept crests | Smoking caldera rims, jagged basalt spires, fumarole crests |
| **Z+1** | Upland / Terrace | Upper terrace meadows, elevated limestone ledges, rolling upland turf | Natural levee crest, raised peat hummock, elevated saturated ground | Upper sandstone terrace shelves, canyon rims, stepped rock ledges | Upper cliff shelves, alpine scree terraces, high rocky saddles | Upper cooling lava terraces, raised basalt ledges, obsidian outcrops |
| **Z0** | Canonical Surface | Rolling verdant meadow, clear streams, woodland floor, loam flats | Marsh pools, reed shallows, peat meadows, slow river channels | Steppe flats, gravel plains, arroyo washes, sandstone benches | Upland valley floor, rocky plateaus, cascading torrent banks, boulder flats | Ash fields, active basalt fissures, geothermal pools, scorched bedrock |
| **Z-1** | Substrate / Roots | Rich loam subsoil, taproot horizons, compact clay, alluvial gravel | Deep anaerobic black mud, waterlogged peat strata, submerged taproots | Hardpan caliche sub-layer, dry sedimentary shale, parched gravel | Fractured granite bedrock, natural fault fissures, coarse stone strata | Porous basalt crust, subterranean magma vents, heated rock tubes |
| **Z-2** | Deep Bedrock | Solid limestone and granite bedrock, natural caverns, aquifers | Flooded subterranean caverns, silt-choked aquifers, drainage sumps | Deep sandstone aquifer caverns, dry mineral/salt chambers, hollows | Massive solid granite deep chambers, natural fissure chasms, faults | Deep magma-adjacent caverns, molten rock conduits, obsidian seams |

---

## 8. Horizontal Transition Matrix (All 10 Biome Pairs)

When two biomes meet, transitions occur along six continuous physical material axes:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               THE SIX TRANSITION AXES                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Grass Density:        Continuous turf ─── Thinning patches ─── Isolated clumps      │
│ 2. Soil Substrate:       Loam ─── Saturated peat ─── Caliche clay ─── Gravel ─── Ash   │
│ 3. Geology:              Rounded fieldstone ─── Sandstone ─── Granite ─── Basalt       │
│ 4. Moisture Profile:     High stagnant ─── Moderate ─── Dynamic ─── Low ─── Geothermal │
│ 5. Vegetation Form:      Broadleaf ─── Reeds/willow ─── Thorn scrub ─── Conifer ─── Ash│
│ 6. Topography:           Rolling hills ─── Marsh basin ─── Mesas ─── Cliffs ─── Vents  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Transition Specifications
1. **`TEMP <-> WET`:**
   - *Grass:* Dense verdant turf $\rightarrow$ increasingly saturated, spongy tussocks and reed clusters.
   - *Soil:* Rich brown loam $\rightarrow$ damp dark organic earth $\rightarrow$ soft saturated black peat/mud.
   - *Geology:* Rounded dry fieldstones $\rightarrow$ damp slick stone $\rightarrow$ half-submerged river pebbles.
   - *Moisture:* Moderate $\rightarrow$ High (water table breaks surface).
   - *Flora:* Broadleaf oak/meadow $\rightarrow$ water-tolerant alders, weeping willows, upright cattails.
   - *Topography:* Rolling meadows $\rightarrow$ low drainage basin and marsh pockets.
2. **`TEMP <-> ARID`:**
   - *Grass:* Continuous dense turf $\rightarrow$ thinning patch grass $\rightarrow$ isolated dry bunchgrass clumps.
   - *Soil:* Rich dark brown loam $\rightarrow$ pale sandy loam $\rightarrow$ sun-baked clay and caliche hardpan.
   - *Geology:* Grey granite/limestone $\rightarrow$ warm sandstone and sedimentary rock ledges.
   - *Moisture:* Moderate $\rightarrow$ Low (evaporative drying).
   - *Flora:* Lush broadleaf woodland $\rightarrow$ drought-stunted scrub, thorn bushes, open steppe.
   - *Topography:* Rolling loam hills $\rightarrow$ broad flat steppe plains, dry wash arroyos, and sandstone shelves.
3. **`TEMP <-> HIGH`:**
   - *Grass:* Soft meadow grass $\rightarrow$ thinner, tougher alpine fescue and crevice moss.
   - *Soil:* Deep fertile topsoil $\rightarrow$ shallow stony upland soil $\rightarrow$ coarse gravel scree.
   - *Geology:* Weathered fieldstones $\rightarrow$ massive fractured granite cliffs and angular slate.
   - *Moisture:* Moderate $\rightarrow$ Variable (rapid downhill runoff, well-drained slopes).
   - *Flora:* Broadleaf oak/birch forest $\rightarrow$ wind-shaped mountain pines, hardy alpine scrub (**NO SNOW**).
   - *Topography:* Gentle valley floor $\rightarrow$ steep rocky slopes, 2-grid vertical cliffs, and high passes.
4. **`TEMP <-> VOLC`:**
   - *Grass:* Verdant green turf $\rightarrow$ yellowing scorched grass $\rightarrow$ barren ash drifts with rare pioneer fireweed.
   - *Soil:* Living dark loam $\rightarrow$ heat-desiccated earth $\rightarrow$ powdery dark ash and scorched gravel.
   - *Geology:* Sedimentary/granite boulders $\rightarrow$ heat-fractured dark rock $\rightarrow$ porous scoria and columnar basalt.
   - *Moisture:* Moderate $\rightarrow$ Low (geothermal heat drying substrate).
   - *Flora:* Living broadleaf forest $\rightarrow$ dead charred standing timber $\rightarrow$ bare volcanic rock with rare scrub.
   - *Topography:* Soft rolling hills $\rightarrow$ rugged tectonic fissures, volcanic break-slopes, and basalt ridges.
5. **`WET <-> ARID`:**
   - *Grass:* Dense marsh reeds $\rightarrow$ rapid drop-off to sparse spiky bunchgrass around shrinking salt pans.
   - *Soil:* Dark saturated peat and black mud $\rightarrow$ alkaline drying mud $\rightarrow$ cracked sun-baked clay hardpan and salt crust.
   - *Geology:* Damp dark river stones $\rightarrow$ salt-encrusted shale $\rightarrow$ warm layered sandstone.
   - *Moisture:* High $\rightarrow$ Low (extreme moisture gradient: evaporation terminal basin).
   - *Flora:* Waterlogged willows and cattails $\rightarrow$ desiccated reed stalks $\rightarrow$ spiny drought scrub.
   - *Topography:* Low marsh basin $\rightarrow$ drying alluvial fan $\rightarrow$ flat sun-baked playa and eroded arroyos.
6. **`WET <-> HIGH`:**
   - *Grass:* Spongy bog turf and reeds $\rightarrow$ cold rushing mountain brook moss $\rightarrow$ tough crevice alpine grass.
   - *Soil:* Deep organic peat and mud $\rightarrow$ coarse alluvial gravel $\rightarrow$ thin stony mountain soil and bare bedrock.
   - *Geology:* Silt-covered river stones $\rightarrow$ tumbled granite river boulders $\rightarrow$ sheer angular granite/slate walls.
   - *Moisture:* High stagnant $\rightarrow$ High dynamic (stagnant bog transitions to high-velocity mountain drainage).
   - *Flora:* Bog alders and weeping willows $\rightarrow$ mountain conifers and water-hugging birch along gorge.
   - *Topography:* Flat low marsh $\rightarrow$ steep rocky gorge, waterfalls, and towering granite cliffs (**NO SNOW**).
7. **`WET <-> VOLC`:**
   - *Grass:* Dense reed beds $\rightarrow$ scalded swamp tussocks $\rightarrow$ steaming mineral mud with sulfur algae.
   - *Soil:* Organic peat muck $\rightarrow$ steaming sulfur mud $\rightarrow$ hot black ash and mineral encrustations.
   - *Geology:* Dark wet river gravel $\rightarrow$ thermal fractured stone $\rightarrow$ porous dark scoria and basalt vents.
   - *Moisture:* High ambient $\rightarrow$ Extreme localized geothermal boiling/steaming.
   - *Flora:* Lush swamp greenery $\rightarrow$ scalded deadwood snags $\rightarrow$ geothermal algae and sulfur lichen.
   - *Topography:* Flat marsh basin $\rightarrow$ steaming hot springs, bubbling mud pots, and basalt crater rim.
8. **`ARID <-> HIGH`:**
   - *Grass:* Sparse bunchgrass on steppe $\rightarrow$ tough alpine cushion grass and rock lichen on windward slopes.
   - *Soil:* Sun-baked caliche and sand $\rightarrow$ coarse alluvial scree $\rightarrow$ shallow rocky mountain soil.
   - *Geology:* Warm horizontal sandstone strata $\rightarrow$ transitional conglomerate $\rightarrow$ massive vertical grey granite and slate.
   - *Moisture:* Low $\rightarrow$ Variable (dry rain shadow transitions to cooler, windward slopes).
   - *Flora:* Thorny desert scrub $\rightarrow$ sparse mountain juniper $\rightarrow$ wind-pruned mountain pines (**NO SNOW**).
   - *Topography:* Desert flat and canyon washes $\rightarrow$ steep rugged escarpment, rock scree talus, and mountain peaks.
9. **`ARID <-> VOLC`:**
   - *Grass:* Sparse drought bunchgrass $\rightarrow$ scorched brittle scrub $\rightarrow$ bare ash drifts and lava crust.
   - *Soil:* Pale caliche clay and sand $\rightarrow$ burnt red/brown earth $\rightarrow$ dark powdery volcanic ash.
   - *Geology:* Sedimentary sandstone ledges $\rightarrow$ dark heat-altered shale $\rightarrow$ black columnar basalt and obsidian.
   - *Moisture:* Low $\rightarrow$ Low/Arid thermal.
   - *Flora:* Drought-adapted spiny scrub $\rightarrow$ dead bleached/charred branches $\rightarrow$ bare volcanic rock.
   - *Topography:* Desert mesas and dry washes $\rightarrow$ jagged tectonic fault scarps, basalt plains, and volcanic cones.
10. **`HIGH <-> VOLC`:**
    - *Grass:* Tough alpine crevice grass $\rightarrow$ blackened alpine moss $\rightarrow$ barren volcanic ash and basalt bedrock.
    - *Soil:* Shallow stony mountain gravel $\rightarrow$ sulfur-dusted gravel $\rightarrow$ dense black ash and scoria.
    - *Geology:* Sharp fractured grey granite and slate $\rightarrow$ heat-fractured igneous rock $\rightarrow$ columnar basalt and lava vents.
    - *Moisture:* Cool mountain drainage $\rightarrow$ hot dry geothermal vents.
    - *Flora:* Hardy mountain conifers (**NO SNOW**) $\rightarrow$ scorched timber snags $\rightarrow$ zero vegetation near volcanic crests.
    - *Topography:* Sheer granite mountain peaks $\rightarrow$ jagged volcanic caldera rims, smoking vents, and basalt slopes.

---

## 9. Prompt-Compiler Tooling (`tools/biome_resolver.js`)

All future art generation tasks resolve biome conditioning blocks deterministically:

```bash
# Query single biome specification
node tools/biome_resolver.js TEMP

# Query transition between two biomes
node tools/biome_resolver.js --pair TEMP ARID

# List all 5 biomes
node tools/biome_resolver.js --list

# List all 10 transition pairs
node tools/biome_resolver.js --all-pairs
```

### Prompt Block Output Example:
```text
=== CANONICAL BIOME SPECIFICATION (TEMP — Temperate / Verdant) ===
DOMINANT GROUND: Fertile meadow turf, compacted dirt paths, woodland floor
EXPOSED SOIL: Rich dark brown loam, organic humus, compact garden earth
GEOLOGY: Rounded field stones, weathered limestone, grey granite boulders
MOISTURE & DRAINAGE: MODERATE (WELL_DRAINED)
VEGETATION DENSITY: Grass [DENSE], Shrubs [MODERATE], Trees [MODERATE_TO_DENSE], Low Flora [MODERATE], Debris [MODERATE]
VEGETATION FORM: Broadleaf deciduous crowns, soft rounded shrub contours, upright leafy herbs
TREE VOCABULARY: oak, birch, pine (upland/mixed), apple/orchard
SHRUB VOCABULARY: small berry bush, medium foliage bush, dense green thicket
LOW FLORA VOCABULARY: meadow turf, clover patches, tall meadow grass, wildflowers (poppy, daisy, buttercup)
ROCK OUTCROPS: rounded fieldstones, chest-height granite boulders, stepped limestone ridges
DEBRIS & CLUTTER: leaf litter, fallen branches, timber logs, stumps, loose pebbles
WATER EDGE BEHAVIOR: Clean gradual pebble/loam slope into clear freshwater streams and lakes; shallow sand/gravel bars
ELEVATION CHARACTER: Gentle rolling hills, earthen berms, layered limestone/granite bluffs (1-2 grid vertical)
ATMOSPHERIC FEEL: Temperate, mild, sun-dappled, clear air with soft early morning haze
SIGNATURE MATERIALS: rich loam, broadleaf oak canopy, fieldstone masonry, clover meadow turf
SHARED MATERIALS: grey granite, clear freshwater, pine, birch, compact dirt, timber logs
FORBIDDEN VISUAL CUES: snow, ice, frost, desert hardpan, alkali dust, peat swamp saturation everywhere, volcanic ash/basalt, glowing lava
VERTICAL CONTINUITY HOOKS:
  Z+2 (Highest/Exposed): Exposed high ridge crest, shallow upland soil, sparse wind-exposed vegetation
  Z+1 (Upland/Terrace):   Upper terrace meadows, elevated limestone plateau ledges, rolling upland turf
  Z0  (Canonical Surface): Canonical surface: rolling verdant meadow, clear streams, woodland floor, natural loam flats
  Z-1 (Substrate/Roots): Rich loam subsoil, taproot horizons, compact clay earth, alluvial gravel strata
  Z-2 (Bedrock/Caverns): Solid limestone and granite bedrock, subterranean natural caverns, groundwater aquifers
NOTES: Canonical cradle of civilization and agriculture; baseline ecological balance across Project DEUS.
```

---

## 10. Automated Test Suite (`tools/test_biome_standard.js`)

Run the automated verification suite:
```bash
node tools/test_biome_standard.js
```
The suite verifies:
- Exactly 5 canonical biomes (`TEMP`, `WET`, `ARID`, `HIGH`, `VOLC`).
- Zero snow/ice biomes, and explicit exclusion of snow/ice in Highland.
- Restrained Volcanic identity (focal lava, zero 100% red wallpaper).
- 100% field completeness across all biomes (ground, soil, geology, moisture, drainage, flora/rock/debris vocabularies).
- Complete 5-tier vertical Z continuity hooks for all biomes.
- Complete 6-axis horizontal transition coverage for all 10 biome pairs.
- Resolver CLI and module API deterministic operation.
- Complete separation of concerns (zero premature raw hex palette ramps).
