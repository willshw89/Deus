# RMMZ Asset Specifications (measured from stock files)

Binding specification for standard RPG Maker MZ asset formats (VISION Rules V70, V108, V109; AGENTS.md Rules 11, 12). **ALL GENERATION TASKS ARE TO UTILIZE GOOGLE NANO BANANA PRO (`gemini-3-pro-image` / `generate_image`).** All animation must happen through distinct sprite frames authored on the sheets; **NO AFTER-EFFECT ANIMATIONS** (no programmatic distortion, squashing/stretching, sine-wave sway, or shader warps).

---

## 1. Core Grid & Unit Standards

| Property | Standard Value | Description |
| :--- | :--- | :--- |
| **Grid Tile Size** | **48 × 48 px** | The fundamental screen pixel grid of RPG Maker MZ. |
| **Art Definition** | **1 : 1 Native** | One art pixel = one screen pixel at zoom level 1 (48×48 per square). |
| **Image Generator** | **Google Nano Banana Pro** | Mandatory generator model (`generate_image` / `gemini-3-pro-image`, Gemini 3 Pro Image model). No other model allowed. |
| **Canvas Generation** | **4× Scale (192 × 192 px)** | Google Nano Banana Pro generates at 4× (192×192 per cell) for clean pixel clustering, then tools reduce by 4 to 48×48 native. |
| **Animation Standard** | **Distinct Sprite Frames** | All animation happens via sprite frames; no after-effects or procedural warps allowed. |
| **Palette** | `art/palette/uf.hex` | 256-color daylight palette. Snapped during reduction. |
| **Background / Alpha** | `#FF00FF` Magenta | Raw generators use solid flat magenta `#FF00FF`. Final exports use true transparency (Alpha 0 or 255). |


---

## 2. Character Sprite Sheets (`game/img/characters/`)

RPG Maker MZ recognizes character sheet configurations based on file naming conventions:

### A. Single Character Sheets (`$filename.png`)
Used for standalone units, custom creatures, and equipment layer overlays.
- **Dimensions**: **144 × 192 px** (3 columns × 4 rows of 48×48 px frames).
- **Row Layout (Facings)**:
  - Row 0 (top): **South / Down** (facing viewer)
  - Row 1: **West / Left**
  - Row 2: **East / Right**
  - Row 3 (bottom): **North / Up** (back to viewer)
- **Column Layout (Animation)**:
  - Col 0: Left step
  - Col 1: Middle / Stand frame
  - Col 2: Right step
  - Playback sequence: `1 -> 0 -> 1 -> 2` (looping).
- **Multi-tile Beings**: Sheets prefixed with `$` can have larger frame sizes as long as the entire sheet is exactly `(3 × frameWidth) × (4 × frameHeight)`.
  - 2-square creature (96×96 frames): **288 × 384 px**.
  - 2.5-square tall creature (96×144 frames): **288 × 576 px**.

### B. Standard Multi-Character Sheets (`filename.png` without `$`)
- **Dimensions**: **576 × 384 px** (8 characters arranged in a 4 × 2 grid).
- Each character block is **144 × 192 px** (3 columns × 4 rows of 48×48 px).

### C. Equipment Layer Overlays (`$UF_Layer_<itemId>.png`)
Equipment layers are drop-in single character sheets rendered as child sprites over the base body.
- **Dimensions**: **144 × 192 px** (or 8-way AR-600 master `144 × 384 px`).
- **Registration**: Anchor `[24, 47]` centered at the bottom of the 48×48 frame.
- **Z-Order Stack**:
  1. `legs` (breeches, greaves)
  2. `torso` (tunic, leather armor, mail)
  3. `head` (cap, helmet)
  4. `back` (cloak, quiver)
  5. `shield` (wooden shield, iron shield)
  6. `weapon` / `tool` (stone axe, knife, pick, swords, bows)
- **Layer Visibility & Grip**: Pixels where the body's hand grips the haft/hilt are left transparent on the layer so the character's fingers wrap visibly in front.

---

## 3. Tileset Specifications (`game/img/tilesets/`)

All tileset sheets are standard 48×48 grid composites:

| Sheet | Purpose | Sheet Dimensions | Tile Grid | Layout Details |
| :--- | :--- | :--- | :--- | :--- |
| **A1** | Animation (Water/Lava) | **768 × 576 px** | 16 × 12 tiles | 16 autotile blocks (each 96×144 px, 3 animation frames side by side). |
| **A2** | Ground Autotiles | **768 × 576 px** | 16 × 12 tiles | 32 autotile blocks (each 96×144 px: 2×3 tiles). Top-left is floor center, top-right is inner corners, lower 2×2 are edges. |
| **A3** | Building Roofs & Walls | **768 × 576 px** | 16 × 12 tiles | 32 building autotiles (roof tops and wall faces). |
| **A4** | Walls & Cliffs | **768 × 576 px** | 16 × 12 tiles | 48 wall/cliff autotiles (top ceiling/walkway + front vertical face). |
| **A5** | Normal Floor/Ground | **384 × 768 px** | 8 × 16 tiles | 128 single static 48×48 tiles (impassable/passable base terrain). |
| **B – E** | Upper Layer Objects | **768 × 768 px** | 16 × 16 tiles | 256 static 48×48 decoration/structure tiles per sheet (trees, rocks, furniture, workshops). |

---

## 4. Portraits & Facesets (`game/img/faces/`)

- **Dimensions**: **576 × 288 px** (4 columns × 2 rows = 8 face slots).
- **Cell Size**: **144 × 144 px** per portrait bust.
- **Framing**: Centered portrait bust. In the Ultima VII dialogue portrait standard, each 144×144 cell includes an ornate classical carved stone archway on midnight navy `#000035`.

---

## 5. System & UI Specifications (`game/img/system/`)

| File | Dimensions | Specifications |
| :--- | :--- | :--- |
| **`Window.png`** | **192 × 192 px** | Window frame, wallpaper background, cursor, scroll arrows, pause indicator, text color palette row. |
| **`IconSet.png`** | **512 × 640+ px** | 16 columns of **32 × 32 px** icons (ground items, inventory items, combat actions, labors). |
| **`Balloon.png`** | **384 × 720 px** | 8 animation frames × 15 emotion balloon rows of **48 × 48 px**. |
| **`ButtonSet.png`**| **528 × 96 px** | Touch/mouse UI action buttons. |

---

## 6. The Dual Pipeline: AR-600 Master to RMMZ Set

1. **Nano Banana Pro Generation (`gemini-3-pro-image` / `generate_image`)**:
   - Creates subject at 4× scale (192×192 per 48×48 tile) on magenta `#FF00FF`.
2. **Master Assembly (`art/masters/`)**:
   - Assembles native 48×48 cells into the full 8-facing AR-600 specification (8 rows: S, SW, W, NW, N, NE, E, SE; 20 columns: stand, walk, work, carry, attack, cast, hurt, death, idle).
3. **Drop-in RMMZ Set Export (`game/img/`)**:
   - Automated tool extracts the standard 4 facings (Down, Left, Right, Up) into drop-in `$UF_*.png` and `$UF_Layer_*.png` 144×192 sheets.
   - Result: Assets work immediately in standard RPG Maker MZ editor playtest (F5) and across all custom 8-way engine plugins.

---

## 7. Animated Effects & Combat FX (`game/img/characters/`)

In-world visual effects (combat hit flashes, blood splatters, dust puffs, projectile missiles, spell bursts) follow the standard RPG Maker MZ character sheet standard for animated events and overlay rendering:

### A. Single Effect Sheets (`$UF_fx_<name>.png`)
- **Dimensions**: **144 × 192 px** (3 columns × 4 rows of 48×48 px cells).
- **Column Layout (Animation)**:
  - Col 0: Start / Initial impact (e.g. sharp compact impact star).
  - Col 1: Middle / Peak flare (e.g. radiant expanded star burst).
  - Col 2: End / Dissipation (e.g. expanding ring of flying sparks/embers).
  - Playback sequence: `0 -> 1 -> 2` (one-shot effect sequence).
- **Row Layout (Facings)**:
  - Rows 0..3 (Down, Left, Right, Up): For omni-directional effects (hit flash, dust puff, bursts), all 4 rows repeat identical frames so the effect renders correctly regardless of facing. For directional missiles (arrows, spears, bolts), rows map to flight direction (Down=South, Left=West, Right=East, Up=North).
- **Background**: Full alpha transparency (RGBA 0,0,0,0).
- **Registration**: Anchor `[24, 47]`. Struck unit chest center is placed at `(24, 25)`.

### B. Master Effects (`art/masters/fx_<name>.png` / `art/masters/ui_fx_<name>.png`)
- **Dimensions**: **144 × 48 px** (1 row of 3 frames side-by-side) on flat magenta `#FF00FF`.
- **Sidecar JSON**:
  - `frameWidth: 48, frameHeight: 48`
  - `anchor: [24, 47]`
  - `facings: ["S"]`
  - `animations: { "stand": [0], "hit": [0, 1, 2] }`
  - `layer: "fx"`
  - `frameMs: 80`

### C. 4× Raw Delivery Canvas (`art/raw/fx_<name>.png`)
- **Dimensions**: **576 × 192 px** (3 frames of 192×192 px on flat magenta `#FF00FF`).
- Clean 4×4 pixel art blocks, snapped to `art/palette/uf.hex`.

