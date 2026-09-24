# DEUS — World-Art Visual Charter (DW.01.01)

Authoritative visual-reference standard for all future Project DEUS world art generation.
Frozen and approved: 2026-09-24.

---

## 1. The Three-Part Visual Charter Hierarchy

Project DEUS separates visual art direction into three independent, uncompromised reference images rather than forcing camera grammar, biome diversity, and scale geometry into a single infographic.

```text
┌────────────────────────────────────────────────────────────────────────┐
│               DEUS WORLD-ART VISUAL CONDITIONING TRIAD                 │
├────────────────────────────────────────────────────────────────────────┤
│ A. GAMEPLAY PERSPECTIVE MASTER (DEUS_GAMEPLAY_PERSPECTIVE_MASTER_V1)   │
│    - Primary visual conditioning for all environment generation.       │
│    - Controls: World camera, 2D top-down / high 3/4 perspective,       │
│      composition, terrain calmness, tactical space, lighting.         │
├────────────────────────────────────────────────────────────────────────┤
│ B. FIVE BIOME MATERIAL STUDIES (DEUS_BIOME_STUDIES_V1)                 │
│    - Secondary visual conditioning for regional/biome generation.      │
│    - Controls: Material identities, geological strata, soil textures,  │
│      ecological clustering, distinct biome color palettes.             │
├────────────────────────────────────────────────────────────────────────┤
│ C. SCALE LANGUAGE (DEUS_SCALE_LANGUAGE_V1)                             │
│    - Visual proportion reference for character & prop harmony.         │
│    - Controls: Relative silhouette scale, Human-to-prop visual         │
│      relationships, canopy proportions, boulder massing.               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Reference Details & File Locations

### Reference A — Gameplay Perspective Master
- **File**: `art/reference/DEUS_GAMEPLAY_PERSPECTIVE_MASTER_V1.png` (and `.jpg`)
- **Source Generator ID**: `deus_gameplay_perspective_1790284685809`
- **Role**: Primary visual conditioning image.
- **Governs**:
  - **Camera Perspective**: High three-quarter / top-down 2D RPG world view (matching classic late-16-bit RPGs and RPG Maker MZ). Flat ground plane viewed from above; vertical surfaces (cliff faces, wall fronts, tree trunks, upright characters) face directly forward toward the viewer.
  - **Environment Composition**: Calm, low-contrast ground terrain; organic dirt paths; clustered vegetation rather than grid stamps; ample open tactical negative space for colonist traversal.
  - **Lighting & Palette**: Soft directional natural daylight from the upper-left (North-West); mature, grounded Western fantasy atmosphere; restrained grimdark palette with vibrant accents reserved for living and magical elements.
  - **Cleanliness**: Pure game-world art. Zero text, labels, infographic boxes, UI, borders, or floating diorama cutaways.

### Reference B — Five Biome Material Studies
- **File**: `art/reference/DEUS_BIOME_STUDIES_V1.png` (and `.jpg`)
- **Source Generator ID**: `deus_biome_studies_1790284725047` (header band cropped deterministically at $1376 \times 653\text{ px}$)
- **Role**: Secondary biome conditioning image.
- **Governs**:
  - **Temperate**: Fertile meadow grass, moist dark loam, broadleaf oak foliage, field stone, small wildflowers.
  - **Wetland / Riverland**: Dark peat soil, thick mud, stagnant murky blue-green water, tall water reeds, saturated marsh shrubs.
  - **Arid / Steppe**: Dry cracked hardpan, reddish clay, warm sandstone rock outcrops, dry yellowish-olive bunchgrass, desert scrub. Genuinely distinct geology and ecology (not merely yellow-tinted grass).
  - **Highland / Mountain**: Cool slate-gray and granite rock slabs, angular scree/rubble, sparse wind-sculpted hardy shrubs, thin alpine soil. Strictly rocky and rugged mountain terrain (**zero snow, zero ice, zero permafrost**).
  - **Volcanic / Ashland**: Porous dark basalt crags, powdery charcoal ash, scorched earth, sulfur-tinted fissures, localized molten lava accents.
  - **Cleanliness**: 100% clean environmental art without typography, titles, or layout frames.

### Reference C — Scale Language
- **File**: `art/reference/DEUS_SCALE_LANGUAGE_V1.png` (and `.jpg`)
- **Source Generator ID**: `deus_scale_language_1790285049163`
- **Role**: Visual proportion reference.
- **Governs**:
  - Continuous single-baseline alignment across a neutral dark slate ground plane.
  - Proportional hierarchy: Human remains central and visually prominent; common trees are modest (~$2\times$ Human height, not towering screen-hogging monoliths); boulders match Human height; bushes and grasses occupy grounded, readable height bands.
  - Clean silhouettes with identical native pixel density.

---

## 3. Important Authority Rule

> **Visual references govern aesthetic language, camera grammar, material rendering, and proportional harmony.**  
> **Technical documents and engine code govern exact pixel dimensions, grid bounds, collision footprints, anchors, and RMMZ sheet packing.**

Generated images are never treated as authoritative for deterministic pixel measurements.

### Canonical Technical Implementation Targets

| Element | Target Dimension / Class | Technical Standard Authority |
|---|---|---|
| **World Tile** | $48 \times 48\text{ px}$ | `docs/RMMZ_ASSET_SPEC.md` |
| **Adult Human** | $\sim 42\text{ px}$ tall | `docs/RMMZ_ASSET_SPEC.md` |
| **Short Grass** | $16\text{--}20\text{ px}$ | `docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md` |
| **Tall Grass / Reeds** | $28\text{--}32\text{ px}$ | `docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md` |
| **Small Bush** | $24 \times 24\text{ px}$ | `docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md` |
| **Medium Bush** | $36 \times 36\text{ px}$ | `docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md` |
| **Medium Rock** | $\sim 28\text{ px}$ | `docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md` |
| **Large Boulder** | $40\text{--}48\text{ px}$ class | `docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md` |
| **Common Oak** | $\sim 84\text{ px}$ target | `docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md` |
| **Common Birch** | $\sim 88\text{ px}$ target | `docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md` |
| **Common Pine** | $\sim 92\text{ px}$ target | `docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md` |

---

## 4. Historical Archive

- **`art/reference/DEUS_WORLD_ART_STYLE_EXPLORATION_01.jpg`**:
  Initial single-board infographic exploration generated on 2026-09-24. Preserved as a design and material study only. It is **explicitly excluded** from the generative conditioning hierarchy to prevent isometric diorama perspectives or typographical artifacts from contaminating future model outputs.

---

## 5. Milestone & Task Status

- **Task**: `DW.01.01 — Freeze World-Art Visual Charter`
- **Status**: **DONE / FROZEN** (Approved by Owner Directive 2026-09-24).
- **Next Boundary**: STOP. Do not begin individual biome asset generation or downstream WBS tasks until explicitly authorized by the project owner.
