# DEUS — Palette Architecture & Family Material Ramps Standard (DW.01.05)

**Document ID:** `DEUS-ART-PALETTE-01`  
**Task:** `DW.01.05 — Freeze Palette Architecture & Family Material Ramps`  
**WBS Phase:** `DW.01 — World-Art Foundation Standards`  
**Prerequisites:** `DW.01.01` (Visual Charter, commit `42f0169`), `DW.01.02` (Native Resolution, commit `faeee9e`), `DW.01.03` (Scale Standard, commit `474aa57`), `DW.01.04` (Biome Identity, commit `157cdb1`), `DEUS-WORLD-WBS-v1.0` (commit `6e6a964`)  
**Status:** CANONICAL & FROZEN  
**Authority:** Project Owner Directive (2026-09-24)  

---

## 1. Executive Summary & Policy Evolution

This standard formalizes the canonical **palette architecture, material color ramps, contrast curves, and automated quality-control rules** for all world art, structures, items, and environmental effects in Project DEUS.

### 1.1 Cardinal Policy Change: Elimination of the 32-Color Tileset Sheet Cap

> [!IMPORTANT]
> **THE 32-COLOR SHEET-WIDE LIMIT IS OFFICIALLY RETIRED FOR PACKED TILESET CONTAINERS.**
>
> In legacy specifications, an arbitrary limit of $\le 32$ unique colors was applied indiscriminately across entire sprite and tileset sheets. While an individual character or prop sprite benefits from a tight 16–32 color budget, imposing this limit on a **packed multi-tile container** (such as an RMMZ `Outside_A2` or `Outside_B` sheet of 768×576 pixels) was technically counterproductive. A single packed biome sheet must represent rich loam, fresh grass, clover, fieldstone boulders, limestone cliffs, birch bark, pine needles, clear streams, and constructed timber. Enforcing $\le 32$ colors across the entire sheet forced artificial monochrome compromises, destroyed material readability, and led to muddy, posterized terrain.

Under the **DEUS Two-Tier Palette Architecture**, color discipline is strictly enforced at two levels:

1. **Global Master Palette Ceiling ($\le 256$ colors)**: Every opaque pixel in every world tileset sheet must belong to the canonical Global Master World Palette (`art/palette/deus_master_world_palette_v1.hex`). The master palette contains exactly **254 unique colors**, leaving room for engine reserve indices.
2. **Material Family Ramps (4–6 tones per material)**: Color discipline is enforced at the **material and asset level**, not by suffocating the container sheet. Each distinct substance (e.g. Oak Bark, Fertile Loam, Basalt Rock, Sandstone) uses a disciplined 4–6 tone ramp (`deepShadow`, `shadow`, `body`, `light`, `highlight`).
3. **Character & Prop Budgets Preserved**: Individual characters, creatures, and discrete prop sprites continue to operate under tight local color budgets (16–32 colors per character frame) to maintain readability.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DEUS TWO-TIER PALETTE ARCHITECTURE                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TIER 1: GLOBAL MASTER PALETTE (art/palette/deus_master_world_palette_v1.hex)           │
│   • Ceiling: ≤ 256 unique canonical colors (Version 1: exactly 254 unique colors)       │
│   • Enforces cohesive grimdark / serious chibi aesthetic across the entire game        │
│   • Eliminates neon primaries, duplicated DOS VGA legacy noise, and garish hues        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TIER 2: DISCIPLINED MATERIAL RAMPS (game/data/DEUS_PaletteRegistry.json)               │
│   • 58 canonical material ramps across 9 categories (Neutrals, 5 Biomes, Water,        │
│     Construction, Supernatural/VFX)                                                    │
│   • Each ramp has 4–6 distinct tones: deepShadow, shadow, body, light, highlight       │
│   • Assets pull only their designated material ramps, guaranteeing harmony             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ CONTAINER SHEETS (Outside_A1–A5, Outside_B–E):                                         │
│   • Evaluated as multi-material containers: NO blind 32-color limit                     │
│   • 100% of opaque pixels must map to the Master Palette                               │
│   • Unregistered rogue RGB colors are strictly rejected by tools/art_check.js          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Value Hierarchy & Contrast Grammar

Project DEUS utilizes a strict **5-tier value and contrast hierarchy** to ensure gameplay readability, tactical clarity, and visual depth from the locked 1.00x top-down perspective.

```
┌──────┬────────────────────────┬───────────────────┬─────────────────────────────────────┐
│ Tier │ Visual Layer           │ Contrast & Chroma │ Gameplay & Aesthetic Function       │
├──────┼────────────────────────┼───────────────────┼─────────────────────────────────────┤
│ 1    │ Ground / Substrate     │ Lowest Contrast   │ Calm, readable foundational canvas; │
│      │ (Turf, Loam, Sand)     │ Subdued Chroma    │ never competes with occupants.      │
├──────┼────────────────────────┼───────────────────┼─────────────────────────────────────┤
│ 2    │ Props & Flora          │ Moderate Contrast │ Distinct silhouettes, grounded      │
│      │ (Bushes, Rocks, Trees) │ Medium Chroma     │ anchors, natural world volume.      │
├──────┼────────────────────────┼───────────────────┼─────────────────────────────────────┤
│ 3    │ Characters & Wildlife  │ High Contrast     │ Immediate tactical readability;     │
│      │ (Humans, Colonists)    │ Controlled Chroma │ crisp separation from terrain.      │
├──────┼────────────────────────┼───────────────────┼─────────────────────────────────────┤
│ 4    │ Interactive / Structures│ Crisp Contrast   │ Distinct door frames, workbenches,  │
│      │ (Doors, Beds, Chests)  │ Clear Edges       │ craft stations, and haul targets.   │
├──────┼────────────────────────┼───────────────────┼─────────────────────────────────────┤
│ 5    │ Supernatural & VFX     │ Highest Contrast  │ Active spellcraft, divine auras,   │
│      │ (Magic, Ruptures)      │ High Saturation   │ planar ruptures; focal visual pop.  │
└──────┴────────────────────────┴───────────────────┴─────────────────────────────────────┘
```

### Contrast Principles:
1. **Ground Is a Stage**: Turf, soil, sand, and stone floor tiles must never contain high-contrast micro-speckles or noisy 1-pixel checkerboard patterns. Contrast delta within a ground tile is kept between 10% and 25%.
2. **Character Pop**: Characters use deep shadow baselines (`#101014`, `#1B1612`) and crisp edge definition so they never dissolve into foliage or dark loam.
3. **Black Wall-Top Occlusion Line**: In accordance with AGENTS.md Rule 13, two-grid-high walls and doors use the universal flat near-black top cap (`#08080C` to `#121218`) creating an unbroken horizontal occlusion boundary.

---

## 3. The Global Master Palette V1 (`254 Colors`)

The Global Master Palette is generated deterministically by `tools/build_palette_registry.js` and stored at:
- Hex Palette: `art/palette/deus_master_world_palette_v1.hex`
- Machine-Readable Registry: `game/data/DEUS_PaletteRegistry.json` (and `docs/art/DEUS_PaletteRegistry.json`)
- Visual Reference Board: `art/reference/DEUS_PALETTE_BOARD_V1.png`

### 3.1 Color Allocations by Category

| Category | Ramps | Unique Colors | Key Material Families |
|---|---|---|---|
| **Shared Neutrals** | 4 | 18 | Void occlusion, cool slate grays, warm stone grays, pale crests |
| **Temperate Biome** | 9 | 38 | Fertile turf, dry grass, loam, woodland floor, oak/birch bark, limestone |
| **Wetland Biome** | 8 | 37 | Saturated moss, reeds, peat soil, anaerobic mud, river silt, driftwood |
| **Arid Biome** | 8 | 36 | Bunchgrass, hardpan caliche, clay, sand, sandstone, thorn scrub, bone |
| **Highland Biome** | 7 | 34 | Alpine scrub, stony loam, scree, cold granite, slate, conifer needle/bark |
| **Volcanic Biome** | 9 | 40 | Ash drift, scorched earth, basalt, scoria, pumice, obsidian, sulfur, lava |
| **Water & Fluids** | 4 | 19 | Shallow clear, deep freshwater, murky wetland bog, foam & rapids |
| **Construction** | 5 | 23 | Fresh timber, aged timber, dressed stone, worked iron, tanned leather |
| **Supernatural VFX** | 4 | 18 | Divine gold, arcane cyan, astral violet, healing emerald |
| **Total Global** | **58** | **254** | *(Fully deduplicated master palette ceiling: $\le 256$)* |

### 3.2 Palette Economy & Strategic Color Sharing
To provide rich material depth across 58 distinct ramps while respecting the strict 256-color ceiling, the palette shares key foundational anchor tones across families:
- `SHARED.VOID_OCCLUSION` (`#08080C`): Universal DF wall-cap, cavern depths, and deep crevices.
- `SHARED.SHADOW_BASE` (`#121218`): Standard under-footing contact shadow.
- `SHARED.BARK_DEEP` (`#1B130E`): Deep crevice shadow shared between Oak and Pine.
- `SHARED.STONE_DEEP` (`#16181D`): Shared bedrock base tone across Fieldstone, Granite, and Basalt.
- `SHARED.PALE_CREST` (`#E6E6DC`): Shared specular highlight for limestone, bone, and rapids foam.

---

## 4. Material Family Ramps Structure

Every canonical material ramp defines **5 progressive tones**:
1. `deepShadow` (Index 0): Ambient occlusion crevices, contact seams, and deep undercuts.
2. `shadow` (Index 1): Self-shadowing mass, underside of volumes, and secondary recesses.
3. `body` (Index 2): The canonical diffuse color and dominant surface tone (defines material identity).
4. `light` (Index 3): Primary directional illumination, sunlit facets, and upward-facing planes.
5. `highlight` (Index 4): Specular glints, sharp edge crests, mineral flecks, and surface crests.

### 4.1 Shared Neutrals (4 Ramps)

| Ramp ID | deepShadow | shadow | body | light | highlight |
|---|---|---|---|---|---|
| `NEUT_VOID_BLACK` | `#08080C` | `#101015` | `#181820` | `#22222C` | `#2E2E3A` |
| `NEUT_COOL_GRAY` | `#14171C` | `#252B33` | `#3C444F` | `#586270` | `#7C8796` |
| `NEUT_WARM_GRAY` | `#181615` | `#2E2A27` | `#48423E` | `#675E59` | `#8C817A` |
| `NEUT_PALE_CREST` | `#52524E` | `#787870` | `#A4A498` | `#C8C8BC` | `#E6E6DC` |

### 4.2 Temperate Biome (9 Ramps)

| Ramp ID | deepShadow | shadow | body | light | highlight |
|---|---|---|---|---|---|
| `TEMP_GRASS_FERTILE` | `#172312` | `#273D1E` | `#3D5C2E` | `#5B8244` | `#81AA62` |
| `TEMP_GRASS_DRY` | `#212314` | `#383C22` | `#545A34` | `#757B4A` | `#999F65` |
| `TEMP_SOIL_LOAM` | `#1B1612` | `#2D231A` | `#453528` | `#634D3A` | `#826750` |
| `TEMP_WOODLAND_FLOOR` | `#181410` | `#282017` | `#3E3123` | `#574633` | `#735E46` |
| `TEMP_BARK_OAK` | `#1B130E` | `#2E2018` | `#463326` | `#624939` | `#80634F` |
| `TEMP_BARK_BIRCH` | `#232221` | `#423F3D` | `#706C68` | `#A8A39C` | `#D6D1CA` |
| `TEMP_FOLIAGE_OAK` | `#13200F` | `#21351A` | `#345229` | `#4E733D` | `#6D9757` |
| `TEMP_STONE_FIELDSTONE` | `#181B1C` | `#2B3133` | `#444B4E` | `#636C70` | `#869196` |
| `TEMP_STONE_LIMESTONE` | `#20211D` | `#3B3C35` | `#5B5C52` | `#7E8072` | `#A3A694` |

### 4.3 Wetland Biome (8 Ramps)

| Ramp ID | deepShadow | shadow | body | light | highlight |
|---|---|---|---|---|---|
| `WET_GRASS_SATURATED` | `#101D13` | `#1A3020` | `#284832` | `#3B6547` | `#558763` |
| `WET_REED_RUSH` | `#182012` | `#2A351E` | `#41502F` | `#5D7044` | `#7E935E` |
| `WET_SOIL_PEAT` | `#14100E` | `#201815` | `#322521` | `#473630` | `#5F4A42` |
| `WET_MUD_ANAEROBIC` | `#111311` | `#1A1F1B` | `#262E28` | `#37413A` | `#4C574F` |
| `WET_SILT_RIVER` | `#171815` | `#262822` | `#3B3E35` | `#53574B` | `#6E7364` |
| `WET_STONE_DAMP_SLATE` | `#13181B` | `#20282C` | `#313B41` | `#46545B` | `#5F707A` |
| `WET_WOOD_DRIFTWOOD` | `#181918` | `#292C2A` | `#3E433F` | `#585E59` | `#757C76` |
| `WET_FOLIAGE_WILLOW` | `#132115` | `#203423` | `#324F37` | `#486E4E` | `#64906A` |

### 4.4 Arid Biome (8 Ramps)

| Ramp ID | deepShadow | shadow | body | light | highlight |
|---|---|---|---|---|---|
| `ARID_GRASS_BUNCHGRASS` | `#201E13` | `#37321F` | `#544B30` | `#756A44` | `#998B5D` |
| `ARID_SOIL_HARDPAN` | `#221B14` | `#392C21` | `#554332` | `#765E47` | `#997C60` |
| `ARID_SOIL_CLAY` | `#251712` | `#40241C` | `#62372A` | `#874E3C` | `#AD6852` |
| `ARID_SAND_COARSE` | `#242016` | `#3E3625` | `#5C5037` | `#7E6E4D` | `#A39067` |
| `ARID_STONE_SANDSTONE` | `#261B14` | `#422D21` | `#654533` | `#8C6148` | `#B27F60` |
| `ARID_SCRUB_THORN` | `#1E1F16` | `#323424` | `#4C4F37` | `#6A6D4E` | `#8B8E67` |
| `ARID_WOOD_BLEACHED` | `#211F1C` | `#383430` | `#56504A` | `#777067` | `#9C9388` |
| `ARID_BONE_CALICHE` | `#2B2824` | `#4B453E` | `#746B60` | `#A09587` | `#C8BBB0` |

### 4.5 Highland Biome (7 Ramps)

| Ramp ID | deepShadow | shadow | body | light | highlight |
|---|---|---|---|---|---|
| `HIGH_GRASS_ALPINE` | `#192015` | `#2B3724` | `#415237` | `#5D734F` | `#7D986B` |
| `HIGH_SOIL_STONY_LOAM` | `#191715` | `#2B2623` | `#413B36` | `#5C544E` | `#796F67` |
| `HIGH_GRAVEL_SCREE` | `#191A1C` | `#2B2D31` | `#42454B` | `#5E6269` | `#7E838B` |
| `HIGH_STONE_GRANITE` | `#1A1B1D` | `#2D2F33` | `#44474D` | `#61656D` | `#828791` |
| `HIGH_STONE_SLATE` | `#14171A` | `#22272C` | `#353D44` | `#4D5761` | `#687482` |
| `HIGH_FOLIAGE_CONIFER` | `#0E1B15` | `#182C23` | `#264336` | `#395E4D` | `#507E68` |
| `HIGH_BARK_CONIFER` | `#191412` | `#2B201D` | `#41322D` | `#5B4640` | `#775D55` |

### 4.6 Volcanic Biome (9 Ramps)

| Ramp ID | deepShadow | shadow | body | light | highlight |
|---|---|---|---|---|---|
| `VOLC_ASH_DRIFT` | `#161718` | `#25272A` | `#393C40` | `#52565C` | `#70747C` |
| `VOLC_SOIL_SCORCHED` | `#161312` | `#251F1D` | `#382E2B` | `#4F423E` | `#685854` |
| `VOLC_STONE_BASALT` | `#121215` | `#1F2024` | `#2F303A` | `#434552` | `#5B5E6E` |
| `VOLC_STONE_SCORIA` | `#161413` | `#25201E` | `#39312E` | `#514541` | `#6D5C57` |
| `VOLC_STONE_PUMICE` | `#1C1C1B` | `#30302E` | `#484845` | `#666662` | `#878782` |
| `VOLC_STONE_OBSIDIAN` | `#0C0E12` | `#141820` | `#202632` | `#30394A` | `#455268` |
| `VOLC_MINERAL_SULFUR` | `#242210` | `#3F3C1A` | `#615C25` | `#8A8333` | `#B5AB42` |
| `VOLC_WOOD_CHARRED` | `#101012` | `#1C1C20` | `#2A2A30` | `#3D3D45` | `#54545E` |
| `VOLC_LAVA_HAZARD` | `#300D08` | `#5C160C` | `#912411` | `#CC4316` | `#FF7B24` |

> [!CAUTION]
> **Cardinal Invariant — Lava Hazard Restriction:**
> `VOLC_LAVA_HAZARD` is strictly reserved for localized 1-tile fluid hazard seams, vents, and bubbling calderas. It is strictly prohibited from being applied as broad wallpaper or flooding standard tilesets. Basalt rock (`VOLC_STONE_BASALT`) is charcoal grey-black, NOT glowing red.

### 4.7 Water & Fluids (4 Ramps)

| Ramp ID | deepShadow | shadow | body | light | highlight |
|---|---|---|---|---|---|
| `WATER_SHALLOW_CLEAR` | `#112328` | `#1C3B43` | `#2A5762` | `#3E7887` | `#579DAF` |
| `WATER_DEEP_FRESH` | `#0C1822` | `#142938` | `#1E3D53` | `#2D5572` | `#407296` |
| `WATER_MURKY_WETLAND` | `#131C16` | `#1F2F25` | `#2F4537` | `#425F4C` | `#597C64` |
| `WATER_FOAM_RAPIDS` | `#334B52` | `#4E6E78` | `#7097A3` | `#9DC4D1` | `#D3E9F0` |

### 4.8 Construction & Settler Crafting (5 Ramps)

| Ramp ID | deepShadow | shadow | body | light | highlight |
|---|---|---|---|---|---|
| `CONSTRUCT_TIMBER_FRESH`| `#211811` | `#38281C` | `#533C2A` | `#74543B` | `#966E4F` |
| `CONSTRUCT_TIMBER_AGED` | `#1A1816` | `#2C2925` | `#433E39` | `#5D5750` | `#7B746B` |
| `CONSTRUCT_STONE_DRESSED`| `#181A1C`| `#292D30` | `#3F454A` | `#596168` | `#77818A` |
| `CONSTRUCT_METAL_IRON`   | `#131518` | `#212429` | `#33373E` | `#494E57` | `#636975` |
| `CONSTRUCT_FABRIC_LEATHER`| `#211612`| `#38251E` | `#53382D` | `#724D3E` | `#946552` |

### 4.9 Supernatural & Magic VFX (4 Ramps)

| Ramp ID | deepShadow | shadow | body | light | highlight |
|---|---|---|---|---|---|
| `MAGIC_DIVINE_GOLD` | `#33220A` | `#593C11` | `#8A5E19` | `#C28725` | `#F5B63D` |
| `MAGIC_ARCANE_CYAN` | `#0A2B33` | `#114754` | `#196C7F` | `#2498B2` | `#37CEF0` |
| `MAGIC_ASTRAL_VIOLET`| `#261033` | `#401B54` | `#632A7F` | `#8B3DB2` | `#BA59ED` |
| `MAGIC_HEALING_EMERALD`| `#0A2E1A`| `#114C2B` | `#1A7342` | `#26A15D` | `#39D680` |

---

## 5. Horizontal Biome Transition Bridges (All 10 Pairs)

To prevent harsh, unnatural checkerboard borders when two biomes meet on the world map, `DW.01.05` defines exact **color transition bridges** across all 10 pairwise biome combinations (from `DW.01.04`).

```
┌───────────┬────────────────────────────────────────────────────────┬──────────────────────────────────────────┐
│ Pair ID   │ Canonical Bridge Tones                                 │ Transition Palette Ramps                 │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ TEMP_WET  │ `#3D5C2E` (Loam grass) → `#284832` (Saturated moss)    │ `TEMP_GRASS_FERTILE`, `WET_GRASS_SATURATED`,│
│           │ `#453528` (Brown loam) → `#322521` (Dark peat)         │ `TEMP_SOIL_LOAM`, `WET_SOIL_PEAT`        │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ TEMP_ARID │ `#3D5C2E` (Fertile grass) → `#544B30` (Bunchgrass)     │ `TEMP_GRASS_FERTILE`, `TEMP_GRASS_DRY`,  │
│           │ `#453528` (Brown loam) → `#554332` (Hardpan caliche)   │ `ARID_GRASS_BUNCHGRASS`, `ARID_SOIL_HARDPAN`│
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ TEMP_HIGH │ `#453528` (Brown loam) → `#413B36` (Stony upland loam) │ `TEMP_SOIL_LOAM`, `HIGH_SOIL_STONY_LOAM`,│
│           │ `#444B4E` (Fieldstone) → `#44474D` (Granite bedrock)   │ `TEMP_STONE_FIELDSTONE`, `HIGH_STONE_GRANITE`│
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ TEMP_VOLC │ `#3D5C2E` (Fertile grass) → `#393C40` (Ash drift)      │ `TEMP_GRASS_FERTILE`, `VOLC_ASH_DRIFT`,  │
│           │ `#453528` (Brown loam) → `#382E2B` (Scorched soil)     │ `TEMP_SOIL_LOAM`, `VOLC_SOIL_SCORCHED`   │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ WET_ARID  │ `#262E28` (Anaerobic mud) → `#62372A` (Terracotta clay)│ `WET_MUD_ANAEROBIC`, `ARID_SOIL_CLAY`,   │
│           │ `#41502F` (Reed rush) → `#4C4F37` (Thorn scrub)        │ `WET_REED_RUSH`, `ARID_SCRUB_THORN`      │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ WET_HIGH  │ `#2F4537` (Murky water) → `#42454B` (Highland scree)   │ `WET_MUD_ANAEROBIC`, `HIGH_SOIL_STONY_LOAM`,│
│           │ `#313B41` (Damp slate) → `#353D44` (Cold slate)        │ `WET_STONE_DAMP_SLATE`, `HIGH_STONE_SLATE`│
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ WET_VOLC  │ `#322521` (Dark peat) → `#382E2B` (Scorched earth)     │ `WET_SOIL_PEAT`, `VOLC_SOIL_SCORCHED`,   │
│           │ `#313B41` (Damp slate) → `#2F303A` (Basalt rock)       │ `WET_STONE_DAMP_SLATE`, `VOLC_STONE_BASALT`│
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ ARID_HIGH │ `#554332` (Hardpan caliche) → `#413B36` (Stony loam)   │ `ARID_SOIL_HARDPAN`, `HIGH_SOIL_STONY_LOAM`,│
│           │ `#654533` (Sandstone) → `#44474D` (Granite rock)       │ `ARID_STONE_SANDSTONE`, `HIGH_STONE_GRANITE`│
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ ARID_VOLC │ `#554332` (Hardpan) → `#393C40` (Ash drift)            │ `ARID_SOIL_HARDPAN`, `VOLC_ASH_DRIFT`,   │
│           │ `#654533` (Sandstone) → `#39312E` (Scoria crust)       │ `ARID_STONE_SANDSTONE`, `VOLC_STONE_SCORIA`│
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ HIGH_VOLC │ `#44474D` (Granite) → `#2F303A` (Basalt rock)          │ `HIGH_STONE_GRANITE`, `VOLC_STONE_BASALT`,│
│           │ `#42454B` (Scree gravel) → `#484845` (Pumice field)    │ `HIGH_GRAVEL_SCREE`, `VOLC_STONE_PUMICE` │
└───────────┴────────────────────────────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 6. Special Rendering Policies: VFX & Translucency

Project DEUS maintains a clear architectural line between physical world terrain/props and supernatural spell effects:

1. **Terrain & Props (Strict Palette Snapping)**:
   - All ground autotiles, walls, cliffs, water, vegetation, furniture, and structures **must 100% conform** to the Master Palette (`art/palette/deus_master_world_palette_v1.hex`).
   - Alpha transparency must be binary: `0` (transparent) or `255` (opaque). Anti-aliased semi-transparent alpha borders are strictly forbidden on standard terrain/character sprites.
2. **Supernatural & Magic VFX Exception**:
   - Spells, miracle glows, energy bursts, teleport rings, and supernatural planar ruptures can declare `paletteMode: "VFX"` and `alphaMode: "VFX"` in their asset sidecar metadata.
   - VFX assets are permitted smooth, multi-step alpha blending (`0 < alpha < 255`) and high-chroma illumination outside the strict 254-color master palette.
   - **Non-Abuse Rule**: Standard terrain, water tiles, trees, and mud are NEVER classified as VFX. The VFX exception cannot be used to bypass palette discipline on natural environment assets.

---

## 7. Machine-Enforceable Quality Control & Tooling

### 7.1 Automated Art Checker Integration (`tools/art_check.js`)

The project's authoritative art verification harness (`tools/art_check.js`) has been upgraded with the new palette architecture rules:
- **Container Sheet Exemption**: Files classified as `tileset` (e.g. `Outside_A2.png`, `Outside_B.png`) are exempt from the legacy 32-color sheet-wide ceiling.
- **Master Palette Adherence**: Every opaque pixel in a tileset sheet is matched against `art/palette/deus_master_world_palette_v1.hex`. Any unregistered color triggers an immediate hard `FAIL` naming the exact rogue hex code.
- **Character Budget Checking**: Character sheets continue to be checked against local color limits (`32` warning, `64` failure limit).
- **VFX Bypass**: Assets tagged with `paletteMode: "VFX"` or `alphaMode: "VFX"` cleanly pass without palette restrictions.
- **Verification**: `node tools/art_check.js --selftest` validates all 80 engine expectations.

### 7.2 Palette Resolver Tool (`tools/palette_resolver.js`)

A command-line and programmatic compiler tool is provided to resolve material ramps and colors for Nano Banana Pro prompts:

```bash
# Query all ramps in a biome
node tools/palette_resolver.js --biome TEMP

# Query all ramps in a material family
node tools/palette_resolver.js --material STONE

# Query transition bridge between two biomes
node tools/palette_resolver.js --pair TEMP WET

# Query a single canonical ramp
node tools/palette_resolver.js TEMP_GRASS_FERTILE

# Check color budgets and master palette count
node tools/palette_resolver.js --budget
```

### 7.3 Palette Reference Board (`art/reference/DEUS_PALETTE_BOARD_V1.png`)

A deterministic, native 1:1 RGBA reference graphic (1480×1440 px) is generated by `tools/build_palette_board.js`. It visually maps all 58 material ramps, swatch swatches, hex codes, and category groupings with crisp pixel-font typography.

### 7.4 Automated Test Suite (`tools/test_palette_standard.js`)

A dedicated regression test suite validates the standard across **493 individual checks**:
- Master palette count ($\le 256$ colors, exactly 254 unique colors).
- Hex string format validity (`#RRGGBB` uppercase).
- Contrast monotonicity (luminance strictly increases from `deepShadow` to `highlight`).
- Mandatory ramp existence across all 9 categories.
- Transition bridge specifications across all 10 pairs.
- Cardinal ecological invariants (zero snow/ice; lava restricted; basalt charcoal-black).
- Container sheet policy and unregistered color rejection in `art_check.js`.
- Resolver API and CLI functionality.

Run the test suite with:
```bash
node tools/test_palette_standard.js
```

---

## 8. Downstream Integration & Authorizations

With the freezing of `DW.01.05`:
1. Future generation tasks in `DW.02` (Temperate Core Biome) must draw their color ramps directly from `DEUS_PaletteRegistry.json` using `tools/palette_resolver.js`.
2. All generated tileset sheets will be strictly validated against `art/palette/deus_master_world_palette_v1.hex`.
3. The next foundation leaf in sequence is:
   - **`DW.01.06 — Freeze Seamless Autotile & Terrain Assembly Standard`**
   - *Requires explicit owner authorization before work begins.*
