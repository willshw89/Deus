# DEUS — Master Semantic World-State Registry Specification
**Authoritative Data Schema & Simulation-to-Asset Registry**  
**Document ID:** `DEUS-WSR-v1.0`  
**Integration Authority:** Gemini / Antigravity (DEUS Coordinator)  
**Approved by Owner Directive:** 2026-09-25  

---

## 1. Executive Purpose & Scope

The **DEUS World-State Registry** is the central semantic metadata bridge connecting the physical simulation systems (`DEUS_Levels.js`, `DEUS_Fluid.js`, `DEUS_World.js`, `DEUS_WorldGen.js`) with the Master Semantic Asset Catalogue (`WG.20`) and permanent atlas sheets (`WG.30`).

### Binding Design Principles
1. **Metadata Documentation, Not Parallel Authority:** The registry does **NOT** store or duplicate runtime simulation state. Runtime truth lives strictly inside typed arrays, bitmasks, and baseline strata buffers. The registry defines what those numeric states *mean*, which systems own them, whether they are visible, and which asset families display them.
2. **Strict Single Ownership:** Every world state has exactly one authoritative simulation system owner.
3. **Bi-Directional Traceability:** Enables instant resolution of:
   - *"Why does this tile asset exist in the atlas?"* $\rightarrow$ Traces to exact World State and System Owner.
   - *"Which visual states are missing for this system?"* $\rightarrow$ Audits all `VISUAL_REQUIRED` entries lacking atlas allocations.
4. **Zero Orphan States:** Every `VISUAL_REQUIRED` state must map to an asset family and permanent atlas slot. Every atlas slot must map to a consuming world state.

---

## 2. World-State Entry JSON Schema

Every registered world state adheres strictly to this canonical JSON schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "DEUS World State Entry",
  "type": "object",
  "required": [
    "stateId",
    "system",
    "description",
    "authoritativeSource",
    "visible",
    "visualClass",
    "visualStateId",
    "assetFamily",
    "transitionStates",
    "saveRequired",
    "performanceClass"
  ],
  "properties": {
    "stateId": {
      "type": "string",
      "description": "Unique uppercase identifier formatted as STATE_<SYSTEM>_<NAME>"
    },
    "system": {
      "type": "string",
      "enum": [
        "GEOLOGY",
        "HYDROLOGY_GROUNDWATER",
        "HYDROLOGY_DRAINAGE",
        "CLIMATE_MICROCLIMATE",
        "SOIL_FERTILITY",
        "ECOLOGY_SUCCESSION",
        "ECOLOGY_WILDFIRE",
        "ECOLOGY_WILDLIFE",
        "SEASONAL_SNOWPACK",
        "GEOMORPHOLOGY_EROSION",
        "GEOTHERMAL_VOLCANIC",
        "LANDMARKS_HISTORY",
        "CIVILIZATION_RECLAMATION"
      ]
    },
    "description": {
      "type": "string",
      "description": "Plain-language physical meaning of this simulation state"
    },
    "authoritativeSource": {
      "type": "string",
      "description": "Exact runtime data location (e.g., cell.strata, fluidDepth, bitmask)"
    },
    "visible": {
      "type": "boolean",
      "description": "True if this state alters the rendered visual presentation"
    },
    "visualClass": {
      "type": "string",
      "enum": [
        "SIMULATION_ONLY",
        "VISUAL_REQUIRED",
        "VISUAL_OPTIONAL",
        "VFX_REQUIRED",
        "AUDIO_REQUIRED",
        "UI_ONLY"
      ]
    },
    "visualStateId": {
      "type": ["string", "null"],
      "description": "Matching semantic visual state identifier in Master Asset Catalogue"
    },
    "assetFamily": {
      "type": ["string", "null"],
      "description": "Asset family grouping (e.g., FAM_SOIL_MOISTURE, FAM_FIRE_TERRAIN)"
    },
    "transitionStates": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Valid preceding or succeeding state IDs under natural evolution"
    },
    "saveRequired": {
      "type": "boolean",
      "description": "True if this state must be serialized into the save file"
    },
    "performanceClass": {
      "type": "string",
      "enum": [
        "STATIC_TERRAIN",
        "REGIONAL_DIRTY",
        "ACTIVE_FRONT_QUEUE",
        "STAGGERED_TICK",
        "SEASONAL_CATCHUP"
      ]
    }
  }
}
```

---

## 3. Initial Canonical World-State Seed Registry

The initial registry accounts for all fifteen natural-world systems across Project DEUS:

| State ID | System | Authoritative Source | Visual Class | Semantic Asset Family | Visual State ID |
|---|---|---|---|---|---|
| `STATE_HYDRO_AQUIFER_PRISTINE` | `HYDROLOGY_GROUNDWATER` | `strata[e].material === M_WATER` in rock | `SIMULATION_ONLY` | *None* | *None* |
| `STATE_HYDRO_SPRING_ACTIVE` | `HYDROLOGY_GROUNDWATER` | Ground surface breach + fluid pressure | `VISUAL_REQUIRED` | `FAM_WATER_GROUND` | `spring_pool` |
| `STATE_HYDRO_ROCK_SEEP` | `HYDROLOGY_GROUNDWATER` | Cliff strata exposure + fluid saturation | `VISUAL_REQUIRED` | `FAM_WATER_GROUND` | `rock_seep` |
| `STATE_HYDRO_CAVE_POOL` | `HYDROLOGY_GROUNDWATER` | Negative-Z floor + standing fluid (depth 1..3)| `VISUAL_REQUIRED` | `FAM_WATER_GROUND` | `cave_pool` |
| `STATE_DRAIN_STREAM_SOURCE` | `HYDROLOGY_DRAINAGE` | Topographic runoff origin cell | `VISUAL_REQUIRED` | `FAM_DRAINAGE_EDGE` | `stream_source` |
| `STATE_DRAIN_RIVER_CHANNEL` | `HYDROLOGY_DRAINAGE` | Continuous fluid conduit (depth 3..5) | `VISUAL_REQUIRED` | `FAM_DRAINAGE_EDGE` | `river_bank` |
| `STATE_DRAIN_FLOODPLAIN_MUD` | `HYDROLOGY_DRAINAGE` | Seasonally inundated valley soil | `VISUAL_REQUIRED` | `FAM_DRAINAGE_EDGE` | `floodplain_mud` |
| `STATE_SOIL_DRY` | `SOIL_FERTILITY` | Soil moisture index `< 0.20` | `VISUAL_REQUIRED` | `FAM_SOIL_MOISTURE` | `soil_dry` |
| `STATE_SOIL_NORMAL` | `SOIL_FERTILITY` | Soil moisture index `0.20..0.65` | `VISUAL_REQUIRED` | `FAM_SOIL_MOISTURE` | `soil_normal` |
| `STATE_SOIL_MOIST` | `SOIL_FERTILITY` | Soil moisture index `0.65..0.90` | `VISUAL_REQUIRED` | `FAM_SOIL_MOISTURE` | `soil_moist` |
| `STATE_SOIL_SATURATED_MUD` | `SOIL_FERTILITY` | Soil moisture index `> 0.90` | `VISUAL_REQUIRED` | `FAM_SOIL_MOISTURE` | `soil_saturated_mud` |
| `STATE_SOIL_ALLUVIAL_RICH` | `SOIL_FERTILITY` | Deposited river silt layer | `VISUAL_REQUIRED` | `FAM_SOIL_HORIZON` | `soil_alluvial_rich` |
| `STATE_SUCC_SCAR_BARE` | `ECOLOGY_SUCCESSION` | Disturbed subsoil, vegetation stripped | `VISUAL_REQUIRED` | `FAM_SUCCESSION_STAGE`| `scar_bare` |
| `STATE_SUCC_WEED_PIONEER` | `ECOLOGY_SUCCESSION` | Pioneer weeds / moss colonizing scar | `VISUAL_REQUIRED` | `FAM_SUCCESSION_STAGE`| `weed_pioneer` |
| `STATE_SUCC_GRASS_RECOVERY` | `ECOLOGY_SUCCESSION` | Dense wild grasses established | `VISUAL_REQUIRED` | `FAM_SUCCESSION_STAGE`| `grass_recovery` |
| `STATE_SUCC_SCRUB_DENSE` | `ECOLOGY_SUCCESSION` | Woody shrubs, brambles, saplings | `VISUAL_REQUIRED` | `FAM_SUCCESSION_STAGE`| `scrub_dense` |
| `STATE_SUCC_WOODLAND_YOUNG` | `ECOLOGY_SUCCESSION` | Pole-stage trees, dense canopy | `VISUAL_REQUIRED` | `FAM_SUCCESSION_STAGE`| `woodland_young` |
| `STATE_SUCC_FOREST_MATURE` | `ECOLOGY_SUCCESSION` | Climax species, open understory | `VISUAL_REQUIRED` | `FAM_SUCCESSION_STAGE`| `forest_mature` |
| `STATE_FIRE_SCORCHED_EARTH` | `ECOLOGY_WILDFIRE` | Thermally degraded organic topsoil | `VISUAL_REQUIRED` | `FAM_FIRE_TERRAIN` | `ground_scorched` |
| `STATE_FIRE_ASH_BED` | `ECOLOGY_WILDFIRE` | Loose carbon ash deposit | `VISUAL_REQUIRED` | `FAM_FIRE_TERRAIN` | `ground_ash_soot` |
| `STATE_FIRE_TREE_CHARRED` | `ECOLOGY_WILDFIRE` | Standing dead tree skeleton | `VISUAL_REQUIRED` | `FAM_FIRE_TERRAIN` | `tree_charred_trunk` |
| `STATE_FIRE_ACTIVE_FRONT` | `ECOLOGY_WILDFIRE` | Active combustion on cell | `VFX_REQUIRED` | `FAM_FIRE_VFX` | `vfx_flame_loop` |
| `STATE_FIRE_SMOKE_PLUME` | `ECOLOGY_WILDFIRE` | Upward particulate convection column | `VFX_REQUIRED` | `FAM_FIRE_VFX` | `vfx_smoke_plume` |
| `STATE_WILDLIFE_GRAZING_DENSITY`| `ECOLOGY_WILDLIFE` | Herbivore biomass per square mile | `SIMULATION_ONLY` | *None* | *None* |
| `STATE_WILDLIFE_PREDATOR_DENSITY`| `ECOLOGY_WILDLIFE` | Carnivore biomass per square mile | `SIMULATION_ONLY` | *None* | *None* |
| `STATE_WILDLIFE_GAME_TRAIL` | `ECOLOGY_WILDLIFE` | Trampled ground path from frequent travel | `VISUAL_REQUIRED` | `FAM_SUCCESSION_STAGE`| `game_trail_trampled`|
| `STATE_SNOW_LIGHT_DUSTING` | `SEASONAL_SNOWPACK` | Snow accumulation `0.1..0.5 ft` | `VISUAL_REQUIRED` | `FAM_SNOW_ACCUMULATION`| `snow_dusting` |
| `STATE_SNOW_DEEP_STRATUM` | `SEASONAL_SNOWPACK` | Snow accumulation `1.0..3.0 ft` (physical) | `VISUAL_REQUIRED` | `FAM_SNOW_ACCUMULATION`| `snow_deep_stratum` |
| `STATE_SNOW_SLUSH_THAW` | `SEASONAL_SNOWPACK` | Melting snowpack with mud pools | `VISUAL_REQUIRED` | `FAM_SNOW_ACCUMULATION`| `snow_slush_thaw` |
| `STATE_WATER_FROZEN_ICE` | `SEASONAL_SNOWPACK` | Solid ice surface stratum over fluid | `VISUAL_REQUIRED` | `FAM_SNOW_ACCUMULATION`| `water_frozen_ice` |
| `STATE_EROD_TALUS_SCREE` | `GEOMORPHOLOGY_EROSION` | Weathered cliff scree pile | `VISUAL_REQUIRED` | `FAM_GEOMORPHIC_DEPOSIT`| `gravel_scree` |
| `STATE_EROD_LANDSLIDE_DEBRIS`| `GEOMORPHOLOGY_EROSION` | Slope failure collapse mound | `VISUAL_REQUIRED` | `FAM_GEOMORPHIC_DEPOSIT`| `talus_apron` |
| `STATE_GEOL_ORE_VEIN_EXPOSED`| `GEOLOGY` | Metal ore exposed on natural cliff | `VISUAL_REQUIRED` | `FAM_GEOLOGICAL_EXPOSURE`| `ore_vein_exposed` |
| `STATE_GEOL_MINERAL_STAIN_CU`| `GEOLOGY` | Malachite/copper green rock patina | `VISUAL_REQUIRED` | `FAM_GEOLOGICAL_EXPOSURE`| `rock_stained_copper`|
| `STATE_GEOL_MINERAL_STAIN_FE`| `GEOLOGY` | Hematite/iron rust seepage patina | `VISUAL_REQUIRED` | `FAM_GEOLOGICAL_EXPOSURE`| `rock_stained_iron` |
| `STATE_GEOL_KARST_SINKHOLE` | `GEOLOGY` | Solution collapse funnel in limestone | `VISUAL_REQUIRED` | `FAM_GEOLOGICAL_EXPOSURE`| `karst_sinkhole_rim` |
| `STATE_GEOTH_HOT_SPRING` | `GEOTHERMAL_VOLCANIC` | Thermal pool with mineral rim | `VISUAL_REQUIRED` | `FAM_GEOTHERMAL_SURFACE`| `spring_hot_steaming`|
| `STATE_GEOTH_FUMAROLE_VENT` | `GEOTHERMAL_VOLCANIC` | Pressurized steam fissure | `VFX_REQUIRED` | `FAM_GEOTHERMAL_VFX` | `vfx_steam_vent_fumarole`|
| `STATE_GEOTH_SULFUR_CRUST` | `GEOTHERMAL_VOLCANIC` | Yellow mineral evaporite crust | `VISUAL_REQUIRED` | `FAM_GEOTHERMAL_SURFACE`| `crust_mineral_sulfur`|
| `STATE_LM_WATERFALL_GREAT` | `LANDMARKS_HISTORY` | Detected high-volume sheer river drop | `VISUAL_REQUIRED` | *Compositional Assembly*| *None (Composed)* |
| `STATE_LM_GREAT_ARCH` | `LANDMARKS_HISTORY` | Detected natural rock bridge spanning cut | `VISUAL_REQUIRED` | *Compositional Assembly*| *None (Composed)* |
| `STATE_RECL_RUBBLE_MOSS` | `CIVILIZATION_RECLAMATION`| Weathered building stone overgrown | `VISUAL_REQUIRED` | `FAM_HISTORICAL_RUIN` | `rubble_mossy` |
| `STATE_RECL_WALL_COLLAPSED` | `CIVILIZATION_RECLAMATION`| Degraded wall segment fallen into strata | `VISUAL_REQUIRED` | `FAM_HISTORICAL_RUIN` | `wall_collapsed` |

---

## 4. Bi-Directional Traceability Flow

```text
    ┌───────────────────────────┐
    │     WORLD SYSTEM          │  (e.g., Hydrology WG.66)
    └─────────────┬─────────────┘
                  │ defines & owns
                  ▼
    ┌───────────────────────────┐
    │     WORLD STATE           │  (e.g., STATE_HYDRO_SPRING_ACTIVE)
    └─────────────┬─────────────┘
                  │ classified as VISUAL_REQUIRED
                  ▼
    ┌───────────────────────────┐
    │  MASTER ASSET CATALOGUE   │  (WG.20: FAM_WATER_GROUND.spring_pool)
    └─────────────┬─────────────┘
                  │ allocated coordinates
                  ▼
    ┌───────────────────────────┐
    │   PERMANENT ATLAS SLOT    │  (WG.30: Sheet A1, Cell X=14, Y=8)
    └─────────────┬─────────────┘
                  │ rendered by
                  ▼
    ┌───────────────────────────┐
    │     RUNTIME CONSUMER      │  (DEUS_Levels.js / Sprite_Character.js)
    └───────────────────────────┘
```

---

## 5. Automated Validation & Integrity Rules

The bi-directional integrity tool (`WG.33` / `tools/verify_world_state_registry.js`) validates these rules:

1. **Rule WSR-01 (Single Ownership):** Every `stateId` must declare exactly one owning `system`. No shared state ownership.
2. **Rule WSR-02 (Visual Completeness):** If `visualClass === "VISUAL_REQUIRED"`, then `visualStateId` and `assetFamily` must not be null.
3. **Rule WSR-03 (Atlas Allocation):** Every `visualStateId` must match an active entry in `game/data/UF_WorldCatalog.json` and possess a valid atlas coordinate in `WG.30`.
4. **Rule WSR-04 (No Phantom Assets):** Every tile asset registered in the atlas must trace back to a valid `stateId` in this registry.
5. **Rule WSR-05 (Performance Classification):** Every state must declare a `performanceClass`. States marked `ACTIVE_FRONT_QUEUE` or `REGIONAL_DIRTY` must never be scanned globally per frame.
