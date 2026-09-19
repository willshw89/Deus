# UF 8-Directional Standard Charset Architecture (All Factions)

**Binding standard established 2026-09-19 per user directive.**
Reference image: `docs/design/STANDARD_8D_CHARSET_TEMPLATE.png`.

Every creature and faction in Ultima Fortress (Human, Dwarf, Elf, Orc, Goblin, Gnome, Kobold, wildlife, and monsters) conforms to this exact structural matrix.

---

## 1. Sheet Dimensions & Grid Geometry

- **Cell Resolution**: 48 × 48 px (Native RPG Maker MZ grid).
- **Sub-Charset Size**: 144 × 384 px (3 Columns × 8 Directional Rows).
- **Master Composite Sheet Size**: 864 × 384 px (18 Columns × 8 Directional Rows) or 960 × 384 px (20 Columns for AR-600 with idle).
- **Grounding & Alignment**:
  - Footprint: `[1, 1]` (one 48 px tile).
  - Ground anchor: `[24, 47]` (center of column 24, bottom contact on row 47).
  - Standing silhouette: 36–42 px tall, leaving 6–12 px overhead margin.

---

## 2. The 8 Directional Rows (Row 0 .. 7)

Every charset in the system shares the exact same row-to-direction ordering. Engine controllers and AI switch animation sets dynamically with zero coordinate remapping.

| Row | Direction | RMMZ Facing Code | Perspective & Silhouette | Derivation Rule |
|:---:|:---:|:---:|:---|:---|
| **0** | **South (S)** | `2` | Front view looking directly toward camera | Primary Keyframe |
| **1** | **South-West (SW)** | `1` | Three-quarter front-left diagonal turn | Primary Keyframe |
| **2** | **West (W)** | `4` | True side profile facing left | Primary Keyframe |
| **3** | **North-West (NW)** | `7` | Three-quarter back-left diagonal turn | Primary Keyframe |
| **4** | **North (N)** | `8` | Back view looking directly away from camera | Primary Keyframe |
| **5** | **North-East (NE)** | `9` | Three-quarter back-right diagonal turn | **Horizontal Mirror of Row 3 (NW)** |
| **6** | **East (E)** | `6` | True side profile facing right | **Horizontal Mirror of Row 2 (W)** |
| **7** | **South-East (SE)** | `3` | Three-quarter front-right diagonal turn | **Horizontal Mirror of Row 1 (SW)** |

> **Architectural Guarantee**: Because Rows 5, 6, and 7 are mathematically mirrored from the west-side primary keyframes (NW, W, SW), character silhouettes, equipment handings, and costume proportions are 100% symmetrical and physically cannot face the wrong direction.

---

## 3. The 6 Standard Action Sets (Columns 0 .. 17)

Every humanoid and creature delivers 6 standardized action charsets. Each action set consists of 3 sequential animation frames (48 px each = 144 px width).

```text
[--------------------------------- 18 COLUMNS TOTAL (864 px) ---------------------------------]
[ SET 1: WALK ] [ SET 2: MELEE ] [ SET 3: RANGED ] [ SET 4: MAGIC ] [ SET 5: WORK ] [ SET 6: DEAD ]
  C0   C1   C2     C3   C4   C5     C6   C7   C8      C9  C10  C11    C12 C13  C14   C15  C16  C17
```

### Set 1: MOVEMENT / WALK (Columns 0, 1, 2)
- **File**: `$UF_<Species>_8D.png` (and `$UF_<Species>_<Gender>_8D.png`)
- **Col 0 (`Step L`)**: Left foot forward kinematic stride with knee bend.
- **Col 1 (`Stand / Pass`)**: Neutral standing / passing stance (bob center, vertical grounding).
- **Col 2 (`Step R`)**: Right foot forward kinematic stride with knee bend.

### Set 2: MELEE ATTACK (Columns 3, 4, 5)
- **File**: `$UF_<Species>_Attack_8D.png` (and `$UF_<Species>_Attack_Sword_8D.png`)
- **Col 3 (`Windup`)**: Weapon raised, combat stance leaning slightly back in preparation to strike.
- **Col 4 (`Strike`)**: Powerful lunging forward swing in the target direction with curved slashing blade arc.
- **Col 5 (`Recover`)**: Follow-through guard stance with weapon lowered.

### Set 3: RANGED ATTACK (Columns 6, 7, 8)
- **File**: `$UF_<Species>_Ranged_8D.png` (and `$UF_<Species>_Bow_8D.png`)
- **Col 6 (`Aim`)**: Bow / crossbow raised in off-hand pointing toward target direction.
- **Col 7 (`Draw`)**: Dominant hand pulls string and arrow back under full tension.
- **Col 8 (`Release`)**: Bowstring released, body recoil and weapon follow-through. (No flying projectile on sprite canvas).

### Set 4: MAGIC CAST (Columns 9, 10, 11)
- **File**: `$UF_<Species>_Magic_8D.png` (and `$UF_<Species>_Cast_8D.png`)
- **Col 9 (`Ready`)**: Hands brought to chest level in focus.
- **Col 10 (`Glow`)**: Hands raised with glowing radiant mana aura (elemental glow).
- **Col 11 (`Thrust`)**: Palms thrust forward in target direction channeling magic power. (No full-screen beams/tornadoes on sprite canvas; spell effects spawn via engine particle systems).

### Set 5: WORK / HARVEST / USE (Columns 12, 13, 14)
- **File**: `$UF_<Species>_Work_8D.png`
- **Col 12 (`Reach`)**: Crouching / reaching down toward workpiece or ground.
- **Col 13 (`Work`)**: Active hand work (carving wood with knife, swinging pickaxe, or gathering plants).
- **Col 14 (`Gather`)**: Standing back upright holding harvested material / tool recovered.

### Set 6: DOWNED / SLEEP / DEATH (Columns 15, 16, 17)
- **File**: `$UF_<Species>_Dead_8D.png`
- **Col 15 (`Hurt`)**: Sudden recoil flinch clutching wound.
- **Col 16 (`Collapse`)**: Incapacitated, buckling knees, falling onto ground.
- **Col 17 (`Sleep / Dead`)**: Lying flat horizontally on ground (rows 40..47). Peaceful sleeping pose in bed, or dead remains on map.

---

## 4. Master AR-600 Composite (20 Columns × 8 Rows)

The 6 action sets map directly into the full AR-600 engine master sheet (`$UF_<Species>_AR600.png`, 960 × 384 px):

| AR-600 Col | Content | Source | Engine Animation Hook |
|:---:|:---|:---|:---|
| **0** | Neutral Stand | Set 1, Col 1 (`Stand`) | `stand: [0]` |
| **1 .. 3** | Walk Cycle | Set 1, Cols 0, 1, 2 | `walk: [1, 2, 3]` |
| **4 .. 6** | Work Cycle | Set 5, Cols 12, 13, 14 | `work: [4, 5, 6]` |
| **7** | Stand / Carry | Set 1, Col 1 (`Stand`) | `carry: [7]` (V89 rule) |
| **8 .. 10** | Melee Attack | Set 2, Cols 3, 4, 5 | `attack: [8, 9, 10]` |
| **11 .. 13** | Magic Cast | Set 4, Cols 9, 10, 11 | `cast: [11, 12, 13]` |
| **14** | Hurt Flinch | Set 6, Col 15 (`Hurt`) | `hurt: [14]` |
| **15 .. 17** | Downed / Death | Set 6, Cols 15, 16, 17 | `death: [15, 16, 17]` |
| **18 .. 19** | Idle Stance | Set 1, Col 1 (`Stand`) | `idle: [18, 19]` |

---

## 5. Outfit Consistency & Layering Protocol

1. **First Charset As Reference**: The initial walk cycle (`Set 1: Movement`) serves as the permanent canonical appearance reference for the character. All subsequent action sets pass this reference into the generation pipeline (`ImagePaths`).
2. **Armor / Attire Sets**: When a colonist equips a new tier of armor (leather, iron chainmail, steel plate), an entire new standardized 6-set suite is generated/instantiated for that tier.
3. **No Mismatched Assets**: Outfits, hairstyles, skin tones, and palettes must never drift between actions.

---

## 6. Universal Import Tool (`tools/import_standard_8d_charset.js`)

Any template or master sheet conforming to this matrix can be directly ingested into the game with a single command:

```powershell
& "C:\Program Files\nodejs\node.exe" tools\import_standard_8d_charset.js <image-path> <Species> [Gender]
```

### Supported Image Inputs:
1. **Native 18-Column Grid (`864 × 384 px`)**: Clean master composite containing the 18 columns × 8 rows of 48×48 px cells.
2. **Labeled Specification Sheet (`2040 × 918 px`)**: The annotated template image (`docs/design/STANDARD_8D_CHARSET_TEMPLATE.png`). The tool automatically detects the layout, crops the 18 columns × 8 rows of cells, and discards background borders/labels.
3. **AR-600 Composite Sheet (`960 × 384 px`)**: Full 20-column master engine sheet.

### Outputs Generated:
- 6 standard 144×384 px sub-charsets in `game/img/characters/`:
  - `$UF_<Species>_8D.png` (Movement)
  - `$UF_<Species>_Attack_8D.png` (Melee)
  - `$UF_<Species>_Bow_8D.png` (Ranged)
  - `$UF_<Species>_Magic_8D.png` (Magic)
  - `$UF_<Species>_Work_8D.png` (Work)
  - `$UF_<Species>_Dead_8D.png` (Dead/Sleep)
- Master 20-col AR-600 composite: `$UF_<Species>_AR600.png` (960×384 px).
- Matching `.json` sidecars for every sheet with anchor `[24, 47]`, footprint `[1, 1]`, facings `['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE']`, and RMMZ animation frame mappings.
- Automatic palette enforcement (`art/palette/uf.hex`, ≤ 32 colors) and binary alpha (0/255).

