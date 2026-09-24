# DEUS — Palette Architecture & Family Material Ramps Standard (DW.01.05)

**Document ID:** `DEUS-ART-PALETTE-01`  
**Task:** `DW.01.05 — Freeze Palette Architecture & Family Material Ramps`  
**WBS Phase:** `DW.01 — World-Art Foundation Standards`  
**Prerequisites:** `DW.01.01` (Visual Charter, commit `42f0169`), `DW.01.02` (Native Resolution, commit `faeee9e`), `DW.01.03` (Scale Standard, commit `474aa57`), `DW.01.04` (Biome Identity, commit `157cdb1`), `DEUS-WORLD-WBS-v1.0` (commit `6e6a964`)  
**Status:** CANONICAL & FROZEN (OWNER APPROVED)  
**Authority:** Project Owner Directive (2026-09-24)  

---

## 1. Executive Summary & Policy Evolution

This standard formalizes the canonical **palette architecture, material color ramps, contrast curves, headroom reserve policy, controlled versioning, and automated quality-control rules** for all world art, structures, items, and environmental effects in Project DEUS.

Art Direction: **Grounded late-16-bit proportions, mature Western fantasy, high-readability pixel art, restrained grimdark.**

### 1.1 Cardinal Policy Change: Elimination of the 32-Color Tileset Sheet Cap

> [!IMPORTANT]
> **THE 32-COLOR SHEET-WIDE LIMIT IS OFFICIALLY RETIRED FOR PACKED TILESET CONTAINERS.**
>
> In legacy specifications, an arbitrary limit of $\le 32$ unique colors was applied indiscriminately across entire sprite and tileset sheets. While an individual character or prop sprite benefits from a tight 16–32 color budget, imposing this limit on a **packed multi-tile container** (such as an RMMZ `Outside_A2` or `Outside_B` sheet of 768×576 pixels) was technically counterproductive. A single packed biome sheet must represent rich loam, fresh grass, clover, fieldstone boulders, limestone cliffs, birch bark, pine needles, clear streams, and constructed timber. Enforcing $\le 32$ colors across the entire sheet forced artificial monochrome compromises, destroyed material readability, and led to muddy, posterized terrain.

Under the **DEUS Two-Tier Palette Architecture**, color discipline is strictly enforced at two levels:

1. **Global Master Palette Ceiling & Headroom Reserve ($\le 256$ colors, $\ge 16$ reserved)**: Every opaque pixel in every world tileset sheet must belong to the canonical Global Master World Palette (`art/palette/deus_master_world_palette_v1.hex`). The master palette contains exactly **226 active canonical colors**, leaving **30 reserved slots** of unallocated capacity for real asset production discoveries.
2. **Material Family Ramps (typically 4–6 tones per material)**: Color discipline is enforced at the **material and asset level**, not by suffocating the container sheet. Each distinct substance (e.g. Oak Bark, Fertile Loam, Basalt Rock, Sandstone) uses a disciplined 4–6 tone ramp (`deepShadow`, `shadow`, `body`, `light`, `highlight`). Ramps are not arbitrarily forced into an artificial 5-tone template; materials that read cleanest with 4 tones (e.g. sulfur, charred wood, wet mud, caliche bone, rapids foam) use 4 tones.
3. **Strategic Color Sharing Across Families**: Cohesive global neutrals, bark crevices, rock shadows, and highlight glints are shared across related material ramps, maximizing world cohesion while preserving individual material identities.
4. **Character & Prop Budgets Preserved**: Individual characters, creatures, and discrete prop sprites continue to operate under tight local color budgets (16–32 colors per character frame) to maintain readability.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DEUS TWO-TIER PALETTE ARCHITECTURE                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TIER 1: GLOBAL MASTER PALETTE (art/palette/deus_master_world_palette_v1.hex)           │
│   • Ceiling: ≤ 256 unique canonical colors                                            │
│   • Version 1 Active Colors: 226 unique colors (Target Range: 220–240)                 │
│   • Headroom Reserve: 30 deliberate reserved slots (Policy: ≥ 16 reserved)             │
│   • Enforces cohesive restrained grimdark / mature Western fantasy aesthetic          │
│   • Eliminates neon primaries, duplicated DOS VGA legacy noise, and garish hues        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ TIER 2: DISCIPLINED MATERIAL RAMPS (game/data/DEUS_PaletteRegistry.json)               │
│   • 58 canonical material ramps across 9 categories (Neutrals, 5 Biomes, Water,        │
│     Construction, Supernatural/VFX)                                                    │
│   • Natural variable ramp lengths (3, 4, 5, or 6 tones depending on physical substance)│
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
2. **Character Pop**: Characters use deep shadow baselines (`#101014`, `#1B1612`) and crisp edge definition so they never dissolve into foliage or dark loam. Proportions follow grounded late-16-bit standards (~3.0 to 3.2 heads tall, ~42 px Adult Human; mature Western fantasy proportions).
3. **Black Wall-Top Occlusion Line**: In accordance with AGENTS.md Rule 13, two-grid-high walls and doors use the universal flat near-black top cap (`#08080C` to `#121218`) creating an unbroken horizontal occlusion boundary.

---

## 3. The Global Master Palette V1 (`226 Active Colors / 30 Reserved Slots`)

The Global Master Palette is generated deterministically by `tools/build_palette_registry.js` and stored at:
- Hex Palette: `art/palette/deus_master_world_palette_v1.hex`
- Machine-Readable Registry: `game/data/DEUS_PaletteRegistry.json` (and `docs/art/DEUS_PaletteRegistry.json`)
- Visual Reference Board: `art/reference/DEUS_PALETTE_BOARD_V1.png`

### 3.1 Color Allocations by Category

| Category | Ramps | Unique Colors | Key Material Families |
|---|---|---|---|
| **Shared Neutrals** | 4 | 17 | Void occlusion, cool slate grays, warm stone grays, pale crests |
| **Temperate Biome** | 9 | 34 | Fertile turf, dry grass, loam, woodland floor, oak/birch bark, limestone |
| **Wetland Biome** | 8 | 32 | Saturated moss, reeds, peat soil, anaerobic mud, river silt, driftwood |
| **Arid Biome** | 8 | 33 | Bunchgrass, hardpan caliche, clay, sand, sandstone, thorn scrub, bone |
| **Highland Biome** | 7 | 29 | Alpine scrub, stony loam, scree, cold granite, slate, conifer needle/bark |
| **Volcanic Biome** | 9 | 36 | Ash drift, scorched earth, basalt, scoria, pumice, obsidian, sulfur, lava |
| **Water & Fluids** | 4 | 18 | Shallow clear, deep freshwater, murky wetland bog, foam & rapids |
| **Construction** | 5 | 22 | Fresh timber, aged timber, dressed stone, worked iron, tanned leather |
| **Supernatural VFX** | 4 | 17 | Divine gold, arcane cyan, astral violet, healing emerald |
| **Total Global** | **58** | **226** | *(Ceiling: 256 \| Reserved Headroom: 30 slots)* |

### 3.2 Palette Economy & Strategic Color Sharing
To provide rich material depth across 58 distinct ramps while respecting the strict 220–240 active color budget, the palette shares key foundational anchor tones across families:
- `SHARED.VOID_OCCLUSION` (`#14161C`): Universal DF wall-cap corner occlusion, cavern depths, basalt crevice, and wet mud crevice.
- `SHARED.VOID_CAP` (`#0C0D12`): Universal wall cap and charred wood crevice shadow.
- `SHARED.COOL_SHADOW_01` (`#1C2126`): Shared cool shadow across cool gray neutral, highland granite, and basalt rock.
- `SHARED.WARM_STONE_01` (`#23211D`): Shared bedrock base tone across warm gray, fieldstone, limestone, and pumice dark.
- `SHARED.WARM_STONE_02` (`#3D3833`): Shared warm stone shadow across fieldstone, pumice, and driftwood.
- `SHARED.PALE_CREST_MAX` (`#EDE9DE`): Shared specular highlight for pale crest, white birch bark, and sun-bleached bone.
- `SHARED.BARK_DEEP` (`#1B1714`): Deep bark crevice shared across oak bark, conifer bark, woodland floor, and driftwood.
- `SHARED.BARK_SHADOW` (`#312820`): Shared bark shadow across oak, conifer, and woodland floor.
- `SHARED.BARK_DARK_BODY` (`#4E3E33`): Shared dark wood body across oak bark, conifer bark, and hardpan caliche.
- `SHARED.FOLIAGE_DEEP` (`#142216`): Shared deep vegetative under-shadow across fertile turf, oak foliage, willow leaves, and alpine fescue.
- `SHARED.CONIFER_BOG_DEEP` (`#111F1B`): Shared deep evergreen shadow across conifer needles and saturated bog turf.

---

## 4. Headroom Reserve & Versioning Policy

### 4.1 Headroom Reserve Policy
- **Canonical Master Ceiling**: 256 unique colors.
- **Active V1 Count**: 226 unique colors (cleanly within the 220–240 target range).
- **Reserved Headroom Capacity**: 30 slots (strictly $\ge 16$ slots).
- **Rationale**: The V1 foundation palette must not be frozen at 100% capacity before mass asset production has tested it. Unallocated slots are deliberately preserved for natural discoveries during actual production (new mineral veins, unique crop pigments, architectural masonry, ruin patinas, and transition blending).

### 4.2 Controlled Palette Versioning Process
No agent may silently inject arbitrary RGB colors into Project DEUS. Any proposed addition to the master palette must complete the **8-step controlled change process**:
1. **Demonstrated Production Need**: Proven requirement in actual game asset context where existing ramps fail.
2. **Near-Duplicate Audit**: Verification that no existing master color within $\Delta E < 4.0$ RGB distance can fulfill the need.
3. **Material Assignment**: Explicit assignment to a material family and functional ramp.
4. **Transition Impact Review**: Verification that the new tone does not break horizontal biome transition bridges.
5. **Registry Update**: Official registration in `game/data/DEUS_PaletteRegistry.json` and `docs/art/DEUS_PaletteRegistry.json`.
6. **Board Regeneration**: Deterministic code-only update of `art/reference/DEUS_PALETTE_BOARD_V1.png`.
7. **Automated Verification**: Clean pass across all 5 test suites (`tools/test_palette_standard.js` etc.).
8. **Documented Record**: Explicit version bumping and entry in `docs/STATUS.md` and standard documentation.

---

## 5. Material Family Ramps Structure

Material ramps define natural, variable-length color sequences based on the physical requirements of each substance:
- **3-Tone Ramps**: Structural voids and occlusion (`NEUT_VOID_BLACK`).
- **4-Tone Ramps**: Compact substances that read best without artificial intermediate steps (`NEUT_PALE_CREST`, `WET_MUD_ANAEROBIC`, `ARID_BONE_CALICHE`, `VOLC_MINERAL_SULFUR`, `VOLC_WOOD_CHARRED`, `WATER_FOAM_RAPIDS`, `MAGIC_HEALING_EMERALD`).
- **5-Tone Ramps**: Full-volume natural materials (`deepShadow`, `shadow`, `body`, `light`, `highlight`).

### 5.1 Shared Neutrals (4 Ramps)

| Ramp ID | Tones | Tone 1 | Tone 2 | Tone 3 | Tone 4 | Tone 5 |
|---|---|---|---|---|---|---|
| `NEUT_VOID_BLACK` | 3 | `#060709` | `#0C0D12` | `#14161C` | — | — |
| `NEUT_COOL_GRAY` | 5 | `#1C2126` | `#333B45` | `#525D6B` | `#798797` | `#A7B4C2` |
| `NEUT_WARM_GRAY` | 5 | `#23211D` | `#3D3833` | `#5F5851` | `#867E75` | `#B4ABA1` |
| `NEUT_PALE_CREST` | 4 | `#6D6961` | `#9B968C` | `#C8C3B7` | `#EDE9DE` | — |

### 5.2 Temperate Biome (9 Ramps)

| Ramp ID | Tones | Tone 1 | Tone 2 | Tone 3 | Tone 4 | Tone 5 |
|---|---|---|---|---|---|---|
| `TEMP_GRASS_FERTILE` | 5 | `#142216` | `#26421C` | `#3E6328` | `#628C38` | `#91B851` |
| `TEMP_GRASS_DRY` | 5 | `#1D2315` | `#353C20` | `#565E31` | `#82884A` | `#B1B26C` |
| `TEMP_SOIL_LOAM` | 5 | `#1F1610` | `#38291C` | `#55432D` | `#7C6142` | `#A3845F` |
| `TEMP_WOODLAND_FLOOR` | 5 | `#1B1714` | `#312820` | `#4D3F2C` | `#6B5A3E` | `#8A7653` |
| `TEMP_BARK_OAK` | 5 | `#1B1714` | `#312820` | `#4E3E33` | `#6F5948` | `#8F7663` |
| `TEMP_BARK_BIRCH` | 5 | `#28231E` | `#564F45` | `#8A8376` | `#C2BBB0` | `#EDE9DE` |
| `TEMP_FOLIAGE_OAK` | 5 | `#142216` | `#1F3D20` | `#325C2C` | `#4F823F` | `#78AD5B` |
| `TEMP_STONE_FIELDSTONE` | 5 | `#23211D` | `#3D3833` | `#59594F` | `#7C7C6E` | `#A1A190` |
| `TEMP_STONE_LIMESTONE` | 5 | `#23211D` | `#423E32` | `#66604E` | `#8F8770` | `#BAB095` |

### 5.3 Wetland Biome (8 Ramps)

| Ramp ID | Tones | Tone 1 | Tone 2 | Tone 3 | Tone 4 | Tone 5 |
|---|---|---|---|---|---|---|
| `WET_GRASS_SATURATED` | 5 | `#111F1B` | `#203320` | `#314D2E` | `#4A6E42` | `#6C935D` |
| `WET_REED_RUSH` | 5 | `#181E11` | `#2B361A` | `#445427` | `#667A3A` | `#8EA353` |
| `WET_SOIL_PEAT` | 5 | `#171210` | `#261D18` | `#3B2E25` | `#544234` | `#735B49` |
| `WET_MUD_ANAEROBIC` | 4 | `#14161C` | `#212325` | `#3E3E44` | `#606568` | — |
| `WET_SILT_RIVER` | 5 | `#171813` | `#2A2722` | `#3F4030` | `#5A5B45` | `#797A5F` |
| `WET_STONE_DAMP_SLATE` | 5 | `#161B20` | `#252F36` | `#37464F` | `#4E626E` | `#6B8291` |
| `WET_WOOD_DRIFTWOOD` | 5 | `#1B1714` | `#2A2722` | `#3D3833` | `#564F45` | `#766B5B` |
| `WET_FOLIAGE_WILLOW` | 5 | `#142216` | `#293B22` | `#415C32` | `#618247` | `#8AA864` |

### 5.4 Arid Biome (8 Ramps)

| Ramp ID | Tones | Tone 1 | Tone 2 | Tone 3 | Tone 4 | Tone 5 |
|---|---|---|---|---|---|---|
| `ARID_GRASS_BUNCHGRASS` | 5 | `#262316` | `#473E24` | `#6F5F34` | `#9C8449` | `#CBB06A` |
| `ARID_SOIL_HARDPAN` | 5 | `#2F271C` | `#4E3E33` | `#77634A` | `#A28968` | `#CFB38D` |
| `ARID_SOIL_CLAY` | 5 | `#2C1B16` | `#4E2E23` | `#764432` | `#A16147` | `#CF8667` |
| `ARID_SAND_COARSE` | 5 | `#2F271C` | `#55432D` | `#7D6642` | `#A88C5D` | `#D3B680` |
| `ARID_STONE_SANDSTONE` | 5 | `#331F18` | `#583224` | `#834A34` | `#B06A4B` | `#DC906B` |
| `ARID_SCRUB_THORN` | 5 | `#1D221A` | `#343C2D` | `#505B44` | `#738162` | `#9AA986` |
| `ARID_WOOD_BLEACHED` | 5 | `#2A2722` | `#4A443A` | `#706A5B` | `#9C9282` | `#CAC0AF` |
| `ARID_BONE_CALICHE` | 4 | `#36332C` | `#6A6354` | `#A39984` | `#EDE9DE` | — |

### 5.5 Highland Biome (7 Ramps)

| Ramp ID | Tones | Tone 1 | Tone 2 | Tone 3 | Tone 4 | Tone 5 |
|---|---|---|---|---|---|---|
| `HIGH_GRASS_ALPINE` | 5 | `#142216` | `#273827` | `#3D523A` | `#5B7353` | `#809C73` |
| `HIGH_SOIL_STONY_LOAM` | 5 | `#1D1B18` | `#322F29` | `#4D463D` | `#706A5B` | `#938E7C` |
| `HIGH_GRAVEL_SCREE` | 5 | `#212325` | `#3A3E42` | `#5A5D63` | `#7C8389` | `#A4ABB1` |
| `HIGH_STONE_GRANITE` | 5 | `#1C2126` | `#30383E` | `#4B555D` | `#6E7A85` | `#97A3AF` |
| `HIGH_STONE_SLATE` | 5 | `#161B20` | `#252F36` | `#3C474F` | `#55636F` | `#758593` |
| `HIGH_FOLIAGE_CONIFER` | 5 | `#111F1B` | `#1B332D` | `#2A4E43` | `#3E6E5D` | `#5A927C` |
| `HIGH_BARK_CONIFER` | 5 | `#1B1714` | `#312820` | `#4E3E33` | `#6F5948` | `#947762` |

### 5.6 Volcanic Biome (9 Ramps)

| Ramp ID | Tones | Tone 1 | Tone 2 | Tone 3 | Tone 4 | Tone 5 |
|---|---|---|---|---|---|---|
| `VOLC_ASH_DRIFT` | 5 | `#161618` | `#27272B` | `#3E3E44` | `#5A5D63` | `#7D7D88` |
| `VOLC_SOIL_SCORCHED` | 5 | `#171210` | `#261D18` | `#412A23` | `#5E3C32` | `#805345` |
| `VOLC_STONE_BASALT` | 5 | `#14161C` | `#1C2126` | `#2F303A` | `#464754` | `#636474` |
| `VOLC_STONE_SCORIA` | 5 | `#171210` | `#2B1B1E` | `#44292E` | `#623C43` | `#85545D` |
| `VOLC_STONE_PUMICE` | 5 | `#23211D` | `#3D3833` | `#605C56` | `#867E75` | `#B4ABA1` |
| `VOLC_STONE_OBSIDIAN` | 5 | `#090A0D` | `#14161C` | `#1F2430` | `#353E52` | `#5E6A88` |
| `VOLC_MINERAL_SULFUR` | 4 | `#272810` | `#4E501C` | `#82852B` | `#DEDF5E` | — |
| `VOLC_WOOD_CHARRED` | 4 | `#0C0D12` | `#1D1B18` | `#362D2A` | `#635753` | — |
| `VOLC_LAVA_HAZARD` | 5 | `#300705` | `#6D1109` | `#B5280D` | `#F26018` | `#FFB833` |

> [!CAUTION]
> **Cardinal Invariant — Lava Hazard Restriction:**
> `VOLC_LAVA_HAZARD` is strictly reserved for localized 1-tile fluid hazard seams, vents, and bubbling calderas. It is strictly prohibited from being applied as broad wallpaper or flooding standard tilesets. Basalt rock (`VOLC_STONE_BASALT`) is charcoal grey-black, NOT glowing red.

### 5.7 Water & Fluids (4 Ramps)

| Ramp ID | Tones | Tone 1 | Tone 2 | Tone 3 | Tone 4 | Tone 5 |
|---|---|---|---|---|---|---|
| `WATER_SHALLOW_CLEAR` | 5 | `#162A36` | `#23445A` | `#356782` | `#4F8FB2` | `#7BC0E3` |
| `WATER_DEEP_FRESH` | 5 | `#0F1B26` | `#172C3D` | `#23445A` | `#356182` | `#5289B0` |
| `WATER_MURKY_WETLAND` | 5 | `#141B18` | `#202B24` | `#2F4035` | `#435A4B` | `#5D7C68` |
| `WATER_FOAM_RAPIDS` | 4 | `#304859` | `#597C93` | `#91B3CD` | `#E2EFF8` | — |

### 5.8 Construction & Settler Crafting (5 Ramps)

| Ramp ID | Tones | Tone 1 | Tone 2 | Tone 3 | Tone 4 | Tone 5 |
|---|---|---|---|---|---|---|
| `CONSTRUCT_TIMBER_FRESH`| 5 | `#281D13` | `#49331E` | `#734F2D` | `#A2713F` | `#D0995C` |
| `CONSTRUCT_TIMBER_AGED` | 5 | `#1D1B18` | `#322F29` | `#4D463D` | `#6E6457` | `#938676` |
| `CONSTRUCT_STONE_DRESSED`| 5 | `#212325` | `#3A3E42` | `#5A5D63` | `#7C8389` | `#A4ABB1` |
| `CONSTRUCT_METAL_IRON`   | 5 | `#14161C` | `#252B30` | `#3C474F` | `#606D78` | `#8C9DA9` |
| `CONSTRUCT_FABRIC_LEATHER`| 5 | `#261D18` | `#423023` | `#674A35` | `#91694A` | `#BA8C66` |

### 5.9 Supernatural & Magic VFX (4 Ramps)

| Ramp ID | Tones | Tone 1 | Tone 2 | Tone 3 | Tone 4 | Tone 5 |
|---|---|---|---|---|---|---|
| `MAGIC_DIVINE_GOLD` | 5 | `#3B2905` | `#78540D` | `#BE891B` | `#F7C03D` | `#FFF2A3` |
| `MAGIC_ARCANE_CYAN` | 5 | `#062B33` | `#0F5969` | `#1C95AD` | `#3DD4F2` | `#A8F3FF` |
| `MAGIC_ASTRAL_VIOLET`| 5 | `#220C30` | `#4A1E69` | `#8239B5` | `#BE65FA` | `#E6BAFF` |
| `MAGIC_HEALING_EMERALD`| 4 | `#092617` | `#1A5736` | `#2EA065` | `#57E095` | — |

---

## 6. Horizontal Biome Transition Bridges (All 10 Pairs)

To prevent harsh, unnatural checkerboard borders when two biomes meet on the world map, `DW.01.05` defines exact **color transition bridges** across all 10 pairwise biome combinations (from `DW.01.04`).

```
┌───────────┬────────────────────────────────────────────────────────┬──────────────────────────────────────────┐
│ Pair ID   │ Canonical Bridge Tones                                 │ Transition Palette Ramps                 │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ TEMP_WET  │ `#26421C` (Loam grass) → `#203320` (Saturated moss)    │ `TEMP_GRASS_FERTILE`, `WET_GRASS_SATURATED`,│
│           │ `#55432D` (Brown loam) → `#3B2E25` (Dark peat)         │ `TEMP_SOIL_LOAM`, `WET_SOIL_PEAT`        │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ TEMP_ARID │ `#353C20` (Dry grass) → `#473E24` (Bunchgrass)         │ `TEMP_GRASS_DRY`, `ARID_GRASS_BUNCHGRASS`,│
│           │ `#7C6142` (Loam) → `#77634A` (Hardpan caliche)         │ `TEMP_SOIL_LOAM`, `ARID_SOIL_HARDPAN`    │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ TEMP_HIGH │ `#273827` (Valley grass) → `#3D523A` (Alpine fescue)   │ `TEMP_GRASS_DRY`, `HIGH_GRASS_ALPINE`,   │
│           │ `#59594F` (Fieldstone) → `#4B555D` (Granite bedrock)   │ `TEMP_STONE_FIELDSTONE`, `HIGH_STONE_GRANITE`│
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ TEMP_VOLC │ `#353C20` (Meadow fringe) → `#3E3E44` (Ash drift)      │ `TEMP_GRASS_DRY`, `VOLC_SOIL_SCORCHED`,  │
│           │ `#261D18` (Loam scorch) → `#362D2A` (Charred wood)     │ `VOLC_ASH_DRIFT`, `VOLC_WOOD_CHARRED`    │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ WET_ARID  │ `#445427` (Reed rush) → `#473E24` (Bunchgrass)         │ `WET_REED_RUSH`, `ARID_GRASS_BUNCHGRASS`,│
│           │ `#3E3E44` (Anaerobic mud) → `#77634A` (Hardpan)        │ `WET_MUD_ANAEROBIC`, `ARID_SOIL_HARDPAN` │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ WET_HIGH  │ `#252F36` (Slate shadow) → `#273827` (Alpine turf)     │ `WET_STONE_DAMP_SLATE`, `HIGH_GRASS_ALPINE`,│
│           │ `#37464F` (Damp slate) → `#91B3CD` (Rapids foam)       │ `HIGH_STONE_SLATE`, `WATER_FOAM_RAPIDS`  │
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ WET_VOLC  │ `#212325` (Mud chip) → `#412A23` (Scorched soil)       │ `WET_MUD_ANAEROBIC`, `VOLC_SOIL_SCORCHED`,│
│           │ `#4E501C` (Sulfur shadow) → `#82852B` (Sulfur body)    │ `VOLC_MINERAL_SULFUR`, `VOLC_STONE_SCORIA`│
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ ARID_HIGH │ `#473E24` (Bunchgrass) → `#3D523A` (Alpine fescue)     │ `ARID_GRASS_BUNCHGRASS`, `HIGH_GRASS_ALPINE`,│
│           │ `#834A34` (Sandstone) → `#4B555D` (Granite bedrock)   │ `ARID_STONE_SANDSTONE`, `HIGH_STONE_GRANITE`│
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ ARID_VOLC │ `#4E3E33` (Hardpan/bark) → `#27272B` (Ash shadow)      │ `ARID_SOIL_HARDPAN`, `VOLC_ASH_DRIFT`,   │
│           │ `#583224` (Sandstone dark) → `#2F303A` (Basalt body)   │ `ARID_STONE_SANDSTONE`, `VOLC_STONE_BASALT`│
├───────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ HIGH_VOLC │ `#30383E` (Granite dark) → `#1C2126` (Basalt shadow)   │ `HIGH_STONE_GRANITE`, `VOLC_STONE_BASALT`,│
│           │ `#5A5D63` (Scree body) → `#3E3E44` (Ash body)          │ `HIGH_GRAVEL_SCREE`, `VOLC_ASH_DRIFT`    │
└───────────┴────────────────────────────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 7. Special Rendering Policies: VFX & Translucency

Project DEUS maintains a clear architectural line between physical world terrain/props and supernatural spell effects:

1. **Terrain & Props (Strict Palette Snapping)**:
   - All ground autotiles, walls, cliffs, water, vegetation, furniture, and structures **must 100% conform** to the Master Palette (`art/palette/deus_master_world_palette_v1.hex`).
   - Alpha transparency must be binary: `0` (transparent) or `255` (opaque). Anti-aliased semi-transparent alpha borders are strictly forbidden on standard terrain/character sprites.
2. **Supernatural & Magic VFX Exception**:
   - Spells, miracle glows, energy bursts, teleport rings, and supernatural planar ruptures can declare `paletteMode: "VFX"` and `alphaMode: "VFX"` in their asset sidecar metadata.
   - VFX assets are permitted smooth, multi-step alpha blending (`0 < alpha < 255`) and high-chroma illumination outside the strict 226-color master palette.
   - **Non-Abuse Rule**: Standard terrain, water tiles, trees, and mud are NEVER classified as VFX. The VFX exception cannot be used to bypass palette discipline on natural environment assets.
3. **Reference / Diagnostic Graphics**:
   - Visual reference boards (`DEUS_PALETTE_BOARD_V1.png`, `DEUS_HUMAN_SCALE_STRIP_V1.png`) are diagnostic tools with UI text and are not world terrain sprites; they are not subject to tileset checker constraints.

---

## 8. Machine-Enforceable Quality Control & Tooling

### 8.1 Automated Art Checker Integration (`tools/art_check.js`)

The project's authoritative art verification harness (`tools/art_check.js`) enforces the palette architecture:
- **Container Sheet Exemption**: Files classified as `tileset` (e.g. `Outside_A2.png`, `Outside_B.png`) are exempt from the legacy 32-color sheet-wide ceiling.
- **Master Palette Adherence**: Every opaque pixel in a tileset sheet is matched against `art/palette/deus_master_world_palette_v1.hex`. Any unregistered color triggers an immediate hard `FAIL` naming the exact rogue hex code.
- **Character Budget Checking**: Character sheets continue to be checked against local color limits (`32` warning, `64` failure limit).
- **VFX Bypass**: Assets tagged with `paletteMode: "VFX"` or `alphaMode: "VFX"` cleanly pass without palette restrictions.
- **Verification**: `node tools/art_check.js --selftest` validates all 80 engine expectations.

### 8.2 Palette Resolver Tool (`tools/palette_resolver.js`)

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

### 8.3 Palette Reference Board (`art/reference/DEUS_PALETTE_BOARD_V1.png`)

A deterministic, native 1:1 RGBA reference graphic (1480×1440 px) is generated by `tools/build_palette_board.js`. It visually maps all 58 material ramps, swatch sequences, hex codes, and category groupings with crisp pixel-font typography.

### 8.4 Automated Test Suite (`tools/test_palette_standard.js`)

A dedicated regression test suite validates the standard across **500+ individual checks**:
- Master palette count bounded within 220–240 active colors (exactly 226 active colors).
- Headroom reserve capacity locked $\ge 16$ slots (exactly 30 reserved slots under 256 ceiling).
- Variable ramp lengths supported (3-tone, 4-tone, 5-tone).
- Zero forbidden terminology across canonical art direction files (enforcing grounded late-16-bit mature proportions).
- Hex string format validity (`#RRGGBB` uppercase).
- Contrast monotonicity (luminance strictly increases from `deepShadow` to `highlight`).
- Mandatory ramp existence across all 9 categories.
- Transition bridge specifications across all 10 pairs.
- Cardinal ecological invariants (zero snow/ice; lava restricted; basalt charcoal-black).
- Container sheet policy and unregistered color rejection in `art_check.js`.
- Resolver API and CLI functionality.

---

## 9. Downstream Integration & Authorizations

With the freezing of `DW.01.05`:
1. Future generation tasks in `DW.02` (Temperate Core Biome) must draw their color ramps directly from `DEUS_PaletteRegistry.json` using `tools/palette_resolver.js`.
2. All generated tileset sheets will be strictly validated against `art/palette/deus_master_world_palette_v1.hex`.
3. The next foundation leaf in sequence is:
   - **`DW.01.06 — Freeze Seamless Autotile & Terrain Assembly Standard`**
   - *Requires explicit owner authorization before work begins.*
