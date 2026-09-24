# DEUS — Environmental, Material & Dynamic World Art Standard
**Document ID:** `DEUS-ART-ENV-01`  
**Status:** Authoritative Environmental Art Standard  
**Authority:** Gemini (Full-Stack Coordinator & Art Authority)  
**Companion Documents:**
- [`docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md)
- [`docs/systems/DEUS_WORLD_STRUCTURAL_ARCHITECTURE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/systems/DEUS_WORLD_STRUCTURAL_ARCHITECTURE.md)
- [`docs/art/DEUS_VISUAL_QUALITY_CONTROL_STANDARD.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/art/DEUS_VISUAL_QUALITY_CONTROL_STANDARD.md)
- [`docs/art/DEUS_FACTION_ARCHITECTURE_STANDARD.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/art/DEUS_FACTION_ARCHITECTURE_STANDARD.md)

---

## 1. Executive Summary & Purpose

In Project DEUS, the physical world is dynamic, historical, and living. The environment is not a collection of static, painted backdrops. Instead, every tree grows and sheds leaves, every road is worn into existence by footsteps, every building weathers and catches fire, and every biome shares a coherent geological and lighting vocabulary.

This document defines the technical and visual rules governing:
1. **Global Lighting & Material Response** (Light direction, ambient shading, daylight/twilight/night transitions, torchlight).
2. **Weather & Atmospheric Overlays** (Rain, snow, frost, wet sheen, mud, wind, and smoke).
3. **Seasonal Variation System** (Spring/Summer baseline, Autumn shifts, Winter dormancy via procedural shaders and decal layers—zero tileset duplication).
4. **Damage, Destruction & Fire States** (Healthy → Damaged → Ruined → Debris; charring and soot mechanics).
5. **Interior/Exterior Transition & Cutaway Rules** (Volumetric roof removal, south-wall dithering/transparency, multi-story Z-level visibility).
6. **Biome Art Grammar** (Geological coherence, soil frequencies, vegetation density).
7. **Road & Path Evolution** (Trampled grass → Dirt path → Gravel road → Paved street).
8. **Agricultural Lifecycle Art** (Planted → Sprout → Growing → Mature → Harvested stubble).
9. **Decal System Architecture** (Blood, soot, footprints, scorch, mud, persistence, and weathering decay).

---

## 2. Global Lighting Standard

To guarantee visual coherence across all independently generated assets (terrain, flora, architecture, items, characters), all DEUS world artwork adheres to a single frozen lighting convention.

### 2.1 The Canonical Light Vector
```text
           LIGHT SOURCE (Sun / Key Light)
                 \
                  \  315° Azimuth (Top-Left)
                   \ 45° Elevation
                    v
          ┌───────────────────┐
          │  TOP/LEFT EDGES:  │  <-- Primary Highlight / Key Tone
          │  Brightest tint   │
          │                   │
          │  FACING PLANE:    │  <-- Diffuse Base Material Tone
          │  Neutral value    │
          │                   │
          │  BOTTOM/RIGHT:    │  <-- Cast Shadow & Ambient Occlusion
          └───────────────────┘
```
- **Light Angle**: Directional sun/sky light originates from the **top-left** ($315^\circ$ azimuth in 2D space, $45^\circ$ elevation angle).
- **Highlight Placement**: Exposed horizontal tops and north/west-facing vertical edges receive the primary highlight tone.
- **Shadow Placement**: South and east-facing vertical edges receive the core shadow. Ground contact ambient occlusion is grounded directly beneath horizontal baselines ($y = 47$ of the cell).
- **Rule of No Baked Directional Shadows on Ground Tiles**: Seamless ground tiles (grass, dirt, sand, rock) must NEVER contain long baked cast shadows from imaginary trees or off-screen mountains. Ground tiles receive flat, diffuse ambient lighting so they tile seamlessly in all directions.

### 2.2 Time-of-Day & Dynamic Lighting via Color Matrices
$$\textbf{RULE: Never generate separate tilesets for Night, Dawn, Dusk, or Eclipse.}$$

All world assets are painted under **Neutral Daylight** calibrated to `art/palette/uf.hex`. The engine (`UF_DayNight.js`, WebGL color-matrix filters) transforms the ambient presentation globally:

| Time State | Ambient Color Matrix / Filter Tint | Visual Character | Material Response |
|---|---|---|---|
| **High Noon** | Neutral daylight, $1.0\times$ RGB | Maximum contrast, crisp shadows | True material colors (`uf.hex`) |
| **Golden Hour** | Amber warmth ($+15\%\text{ R}, +5\%\text{ G}, -15\%\text{ B}$) | Long warm highlights, deep violet shadows | Wood and stone take on golden ochre glow |
| **Twilight** | Dusky mauve / indigo ($ -20\%\text{ R}, -15\%\text{ G}, +10\%\text{ B}$) | Soft contrast, low key light, blue skyfill | Whites become lavender, greens mute |
| **Deep Night** | Deep navy desaturation (Value $-55\%$, Saturation $-40\%$, Blue $+25\%$) | High mystery, silhouette dominance | Distant objects recede into dark navy void |
| **Eclipse / Blood Moon** | Desaturated carmine (Red $+30\%$, Green $-40\%$, Blue $-30\%$) | Uncanny dread, supernatural tension | Arcane glyphs and eyes pop with high emissive contrast |

### 2.3 Localized Dynamic Point Lights
- **Torchlight / Lanterns / Fireplaces**: Dynamic circular point lights with radial falloff, rendering in additive/screen blend mode. Emits warm amber/yellow light ($2800\text{K}$) that restores daylight color value and saturation to surrounding pixels, piercing through nighttime ambient indigo filters.
- **Arcane / Divine Spells**: High-saturation cyan, violet, or emerald point lights that cast cold emissive highlights over neighboring tiles without blowing out pixel cluster contrast.

---

## 3. Weather & Atmospheric Overlay Pipeline

Weather in Project DEUS is simulated dynamically. Rain, snow, and storms are rendered via **procedural screen-space overlays and transient ground decals**, not duplicate baked weather tiles.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      ATMOSPHERIC WEATHER STACK                         │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 5: Screen Precipitation Particles (Rain streaks, snowflakes, dust)│
│ Layer 4: Fog / Mist Cloud Layer (Scrolling soft alpha cloud shadows)   │
│ Layer 3: Dynamic Ground Sheen / Puddles (Screen-space gloss overlay)   │
│ Layer 2: Decal Surface Accumulation (Snow drifts, mud splatters)       │
│ Layer 1: Base World Geometry (Terrain, Architecture, Flora, Entities)  │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Precipitation Types & Rules
1. **Rain**:
   - Visual: 16-bit diagonal rain streaks (2–4 px length, semi-transparent cool gray-blue) moving down-right at $60^\circ$.
   - Impact: Ground impact splashes (3-frame $8\times 8\text{ px}$ circular ripple sprites) spawned at random surface coordinates.
   - Wetness Sheen: Water darkens porous surfaces (dirt, unpolished wood, stone) by 15–20% value while increasing specular highlight sharpness on flat stone and metal.
2. **Snow**:
   - Visual: Slow-drifting, oscillating multi-frame white flakes (1–2 px) falling with gentle wind drift.
   - Accumulation: Procedural snow fringe decals accumulate on roof ridges, upper wall caps, tree canopies, and grass edges.
3. **Wind & Storms**:
   - Flora Response: All animated trees, bushes, and crops increase wind-sway animation speed and frame deflection.
   - Debris Particles: Drifting leaves, pine needles, dust clouds, and embers carried horizontally across the camera viewport.

---

## 4. Seasonal Variation System

Project DEUS tracks the calendar year through four seasons. To eliminate explosive asset bloat, **seasons are implemented via shared plant frame indices and global color LUT shifts**, not four distinct asset libraries.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                  FOUR-SEASON BEHAVIORAL MATRIX                         │
├────────────────────────────────────────────────────────────────────────┤
│ SPRING:  Lush bright green turf, blooming floral decals, young crops.   │
│ SUMMER:  Deep rich green foliage, heavy crop yields, dry dust roads.   │
│ AUTUMN:  Foliage shifts to amber/ochre/rust, leaf-litter decals,       │
│          harvested fields.                                             │
│ WINTER:  Deciduous trees switch to bare-branch frames, evergreen trees │
│          retain needles, dormant crop plots, frozen water edges.       │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Deciduous Trees & Flora Seasonal Frames
Every deciduous tree sprite sheet contains dedicated interaction state rows:
- **Row 0**: Spring/Summer Full Leaf Canopy (Lush green foliage).
- **Row 1**: Autumn Canopy (Amber, ochre, and rust foliage).
- **Row 2**: Winter Bare Branches (Skeletal limbs, zero leaves, subtle frost rim).
- **Row 3**: Stump / Felled Remains (Weathered wood core, sawdust chips).

### 4.2 Evergreen / Conifer Flora
Conifers (Pine, Fir, Spruce) do not shed needles. In winter, they receive a snow-dusted canopy overlay rather than a bare branch frame, maintaining their defensive windbreak silhouette.

---

## 5. Damage, Destruction & Fire Progression

In a physical simulation with structural support and combat, physical assets must visually communicate integrity, damage, and fire destruction.

```text
  [PRISTINE: 100% HP]
          │
          ▼  Impact / Siege / Weapon strike
  [DAMAGED: 25% - 75% HP]
  - Cracks in stone masonry
  - Splintered timber beams, missing thatch clumps
  - Visible chinking loss
          │
          ▼  Structural failure / HP <= 0%
  [RUINED / BREACHED: 1% - 24% HP]
  - Jagged breached wall section (navigable breach)
  - Exposed structural rafters, collapsed roof sections
          │
          ▼  Complete Collapse
  [DEBRIS PILE / COLLAPSED: 0% HP]
  - Low rubble pile (48x48 px, height 16 px, navigable at 0.5x speed)
  - Recovers raw stone/timber salvage
```

### 5.1 Fire & Scorched Progression
```text
  [UNIGNITED]
      │
      ▼  Ignition (Flint, torch, fire arrow, lightning)
  [BURNING STATE]
  - Multi-frame sprite flame loops ($16\times 32\text{ px}$ to $32\times 48\text{ px}$) attached to cell
  - Drifting smoke particle puffs
  - Dynamic warm flickering light source emitted at tile center
      │
      ▼  Combustion completes / Extinguished
  [SCORCHED / CHARRED STATE]
  - Timber: Blackened charcoal texture with chalky gray ash highlights
  - Thatch: Burned away entirely, leaving blackened skeleton rafters
  - Stone: Survives structurally, but covered in heavy soot decals spreading upwards above door/window openings
```

---

## 6. Interior / Exterior Transition & Cutaway Rules

Because Project DEUS features explicit constructible roofs at $Z+1$ and multi-story buildings, indoor visibility must never be obstructed by roof geometry during gameplay.

```text
                 VIEWING CUTAWAY CONTRACT
  
  [PLAYER OUTSIDE DWELLING]
  - Z+1 Roof Slab: 100% Opacity. Full architectural shingles/thatch visible.
  - Chimney smoke puffs rendered above roof.
  - Windows show subtle interior hearth glow.

  [PLAYER STEPS OVER THRESHOLD (INTO INTERIOR)]
  - Z+1 Roof Slab: Dynamic fade to 0% Alpha (0.2s smooth crossfade).
  - Interior Z0 Revealed: Furniture, hearth, flooring, beds, colonists.
  - Exterior Walls: East, West, and North walls remain fully visible.
  - South Walls (Occluding Camera): Drop to 30% Alpha or 50% dither pattern
    so colonists standing directly behind the southern wall are never hidden.
```

### 6.1 Multi-Story Vertical Visibility ($Z > 0$)
- When player focus is on $Z0$, any upper structural floors ($Z+1, Z+2$) are culled from rendering unless the player climbs a ladder, stairs, or pans the tactical camera to higher elevations.
- Exterior ground viewed from an upper balcony or watchtower ($Z+1 \to Z0$) remains fully visible below, but receives a subtle depth atmospheric haze to reinforce vertical elevation.

---

## 7. Biome Art Grammar & Geological Discipline

To prevent different regions from looking like mismatched asset packs, all biomes adhere to a single **Geological & Soil Matrix**.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   DEUS BIOME GEOLOGICAL MATRIX                         │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Temperate Forest: Rich brown loam, granite boulders, mossy bark.    │
│ 2. Highland Crags:   Cold gray basalt, sparse scree, dwarf pine, lichen│
│ 3. Peat Marsh:       Dark peat muck, brackish reeds, waterlogged oak.  │
│ 4. River Plains:     Golden silt, sedimentary sandstone, wild barley.  │
│ 5. Coastal Shoals:   Pebbled gravel, wave-beaten limestone, drift log. │
│ 6. Subterranean:     Dark diorite/slate bedrock, subterranean fungi.   │
└────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Soil & Rock Visual Rules
- **Stone Consistency**: All rock formations within a geological stratum use the same edge-break geometry and palette ramp (e.g., Granite uses cool charcoal-to-pearl ramps; Sandstone uses warm ochre-to-buff ramps).
- **Texture Frequency**: Ground autotiles use subtle, low-contrast 2–4 pixel grain clusters. High-contrast features (large stones, flower bunches, puddles) are placed as separate scatter entities, never baked into repeating ground tiles.

---

## 8. Road & Path Evolution

In Project DEUS, civilization leaves physical marks on the terrain. Roads are not merely painted during map generation; they evolve dynamically through colonist and wildlife traffic simulation.

```text
  [VIRGIN TERRAIN: 0 - 10 Crossings]
  - 100% Native grass / forest floor autotile.
          │
          ▼  Colonist foot traffic
  [TRAMPLED PATH: 11 - 50 Crossings]
  - Vegetation thins; subtle flattened grass overlay decals appear.
          │
          ▼  Repeated daily hauling / wagon traffic
  [BEATEN DIRT TRACK: 51 - 250 Crossings]
  - Grass fully worn away in central 16-24 px rut; exposed brown soil.
  - Provides +10% colonist movement speed bonus.
          │
          ▼  Engineered settlement construction (Labor + Gravel)
  [GRAVEL / CRUSHED STONE ROAD]
  - Compacted fieldstone and gravel curb; water drainage ditches.
  - Provides +25% colonist movement speed bonus; immune to mud.
          │
          ▼  Civic paved avenue (Labor + Dressed Stone Slabs)
  [DRESSED COBBLESTONE / STONE SLAB HIGHWAY]
  - Interlocking granite paving stones with drainage gutters.
  - Provides +40% colonist movement speed bonus; durable for centuries.
```

---

## 9. Agricultural Lifecycle Art Standard

Farming in DEUS is simulated stage-by-stage. A crop field must visually reflect its exact biological growth state to inform player management and peon AI harvesting decisions.

```text
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│   STAGE 0    │   STAGE 1    │   STAGE 2    │   STAGE 3    │   STAGE 4    │
│  TILLED SOIL │ GREEN SPROUT │ VEGETATIVE   │ MATURE YIELD │  HARVESTED   │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ Furrowed     │ Tiny 4-6 px  │ Half-height  │ Full-tile    │ Cut stubble, │
│ dark loam,   │ pale green   │ dense foliage│ golden grain,│ loose straw, │
│ seed mounds  │ shoots       │ (20-24 px)   │ ripe heads   │ spent stalks │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

- **Stage 0 (Tilled / Seeded)**: Distinct furrowed dark earth tile. Seed markers visible as small earth mounds.
- **Stage 1 (Sprout)**: Sparse, delicate pale green seedling clusters protruding 4–6 px above the furrow.
- **Stage 2 (Vegetative)**: Robust green stalks reaching half-tile height ($20\dots 24\text{ px}$), showing leaf development.
- **Stage 3 (Mature / Flowering / Harvest-Ready)**: Full-size crop asset ($32\dots 44\text{ px}$ height) displaying harvestable fruit, golden wheat heads, or ripe vegetables. Triggers AI harvest job.
- **Stage 4 (Harvested / Stubble)**: Low, dry stalk residue ($6\dots 8\text{ px}$) indicating depleted crop ready for replowing.
- **Blight / Frost Death**: Brown, wilted, blackened foliage indicating crop failure due to extreme cold or disease.

---

## 10. Decal System Architecture & Persistence Rules

Decals are independent visual overlays rendered onto world cells between the terrain layer and entity sprites. They allow dynamic combat, weather, and labor consequences without altering base terrain tiles.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        DEUS DECAL REGISTRY                             │
├────────────────────────────────────────────────────────────────────────┤
│ Decal Class       │ Max Per Cell │ Decay Trigger & Lifespan            │
├───────────────────┼──────────────┼─────────────────────────────────────┤
│ `blood_fresh`     │ 3 splatters  │ Oxidizes to `blood_dried` in 4 hrs. │
│ `blood_dried`     │ 2 stains     │ Washed away by rain; 72 hrs dry.    │
│ `soot_scorch`     │ 1 per cell   │ Rain washes in 48 hrs; 7 days dry.  │
│ `footprint_mud`   │ 4 prints     │ Dries and vanishes in 2 hrs.        │
│ `rubble_dust`     │ 1 cloud/pile │ Disperses in 30 seconds.            │
│ `puddle_water`    │ 1 per cell   │ Evaporates in sun; absorbed in 6 hr.│
└────────────────────────────────────────────────────────────────────────┘
```

- **Memory & Pooling Safety**: Maximum 5 active decals per world cell. New decals displace the oldest low-priority decal.
- **Indoor Cleaning**: Domestic rooms designated as living quarters trigger autonomous colonist sweeping jobs, clearing dust and blood stains.
- **Weather Interaction**: Heavy precipitation accelerated decal washing by $10\times$, cleansing muddy roads and battlegrounds naturally.

---

## 11. Acceptance & Verification Checklist

Before any environmental asset, biome tileset, or weather feature is accepted into `game/`, it must pass:
- [ ] **Lighting Verification**: Highlights top-left ($315^\circ$), shadows bottom-right, zero baked directional ground shadows.
- [ ] **Palette Exactness**: Conforms 100% to `art/palette/uf.hex`.
- [ ] **Day/Night Verification**: Verified under Neutral Noon, Golden Hour, Twilight, and Deep Night color-matrix filters.
- [ ] **Cutaway Verification**: Roof assets fade cleanly to 0% alpha upon interior entry; south walls dither when occluding characters.
- [ ] **Lifecycle States**: Trees, crops, and architecture include all required interaction frames (healthy, damaged, ruined, charred).
- [ ] **Road & Decal Blending**: Seamless edge alpha blending with zero sharp rectangular boundary clipping.
