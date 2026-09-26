# TEST_ World-State Registry (fixture for tools/test_verify_world_state_registry.js)

Synthetic fixture. Every id here is a `TEST_` placeholder; nothing is game content. The schema block is a copy of section 2 of docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md (DEUS-WSR-v1.0).

## 2. World-State Entry JSON Schema

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

## 3. Seed Registry

| State ID | System | Authoritative Source | Visual Class | Semantic Asset Family | Visual State ID | Performance Class | Description | Visible | Transition States | Save Required |
|---|---|---|---|---|---|---|---|---|---|---|
| `STATE_TEST_SOIL_DRY` | `SOIL_FERTILITY` | TEST moisture index `< 0.20` | `VISUAL_REQUIRED` | `FAM_TEST_SOIL` | `test_soil_dry` | `REGIONAL_DIRTY` | TEST dry soil | `true` | `STATE_TEST_MOSS_DEEP` | `true` |
| `STATE_TEST_SPRING` | `HYDROLOGY_GROUNDWATER` | TEST surface breach | `VISUAL_REQUIRED` | `FAM_TEST_WATER` | `test_spring` | `STATIC_TERRAIN` | TEST spring pool | `true` | | `true` |
| `STATE_TEST_MOSS_DEEP` | `ECOLOGY_SUCCESSION` | TEST moss cover | `VISUAL_REQUIRED` | `FAM_TEST_SOIL` | `test_moss_deep` | `STAGGERED_TICK` | TEST deep moss (a derived variant) | `true` | `STATE_TEST_SOIL_DRY` | `true` |
| `STATE_TEST_BOULDER` | `GEOLOGY` | TEST boulder | `VISUAL_REQUIRED` | `FAM_TEST_ROCK` | `test_boulder` | `STATIC_TERRAIN` | TEST boulder | `true` | | `true` |
| `STATE_TEST_FLAME` | `ECOLOGY_WILDFIRE` | TEST active combustion | `VFX_REQUIRED` | `FAM_TEST_FIRE_VFX` | `test_flame` | `ACTIVE_FRONT_QUEUE` | TEST flame | `true` | | `false` |
| `STATE_TEST_TRAIL` | `ECOLOGY_WILDLIFE` | TEST trampled path | `VISUAL_OPTIONAL` | `FAM_TEST_SOIL` | `test_trail` | `SEASONAL_CATCHUP` | TEST game trail | `true` | | `true` |
| `STATE_TEST_AQUIFER` | `HYDROLOGY_GROUNDWATER` | TEST water in rock | `SIMULATION_ONLY` | *None* | *None* | `STATIC_TERRAIN` | TEST aquifer | `false` | | `true` |
| `STATE_TEST_ARCH` | `LANDMARKS_HISTORY` | TEST detected rock bridge | `VISUAL_REQUIRED` | *Compositional Assembly* | *None (Composed)* | `STATIC_TERRAIN` | TEST landmark | `true` | | `true` |

## 5. Rules

The fixture is checked by the same WSR-01..05 rules as the real registry.
