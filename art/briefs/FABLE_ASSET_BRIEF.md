> **SUPERSEDED SPEC NOTICE (2026-09-19):** This 16×16 2.5D brief template is superseded by `docs/asset_briefs/INDEX.md` and `docs/ART_STANDARD.md` (HD FF6 48px standard).  
> **PROJECT-WIDE BINDING MANDATES:**  
> 1. **ALL GENERATION TASKS ARE TO UTILIZE GOOGLE NANO BANANA PRO** (`generate_image`, model id `gemini-3-pro-image`, Gemini 3 Pro Image model; AGENTS.md Rule 11, VISION V69, V70, V79, V109). Nano Banana Pro utilizes advanced reasoning ("Thinking") to follow complex instructions, maintain brand consistency, and render high-fidelity text and pixel details. No other model is allowed.  
> 2. **ALL ANIMATION MUST HAPPEN THROUGH THE SPRITE; NO AFTER-EFFECT ANIMATIONS** (AGENTS.md Rule 12, VISION V60, V108). All motion must be delivered as discrete sprite animation frames on the sheets.

# Production Brief for Fable: 16×16 Pixel Art Asset Generation (Ultima VII 2.5D Square Standard)

**Target Audience:** Fable (Narrative & Visual Direction Generator)  
**Author:** Pair Programmer (Art Specialist)  
**Approved Anchor:** Adult Human Settler Male (`art/masters/settler_male_16x16.png`)  
**Projection Standard:** Ultima VII Oblique 2.5D (45° Up-and-Left Lean, Top/South/East Faces Visible)  
**Color Palette:** Strictly Ultima VII Daylight Palette (`PALETTES.FLX` Record 0 / `art/palette/uf.hex`)  
**Canvas Constraint:** Exactly ONE Asset Square (16×16 native pixels, exported at 3× nearest-neighbor to 48×48 px)  
**Date:** 2026-09-18  


---

## 1. Executive Summary & Core Mandate

Fable's mission is to narrate exacting visual descriptions, material textures, volumetric lighting cues, and interaction states for all game assets.

Per the user's explicit directive:
> **"Actually, lets do 2.5D graphics like U7, keep the U7 color scheme, but make sure everything fits into a square"**

Every asset narrated by Fable must strictly adhere to the project's visual formula: **authentic Ultima VII 2.5D oblique projection** mapped to the **naturalistic Ultima VII daylight color palette**, strictly contained within **exactly one asset square** (16×16 native pixels).

---

## 2. The 2.5D Square Formula (Mathematical & Geometric Principles)

In original Ultima VII, world entities could sprawl across 30×30 or 40×60 pixels. In our engine, **every entity must fit within a single 16×16 tile** while preserving the authentic 2.5D oblique look:

1. **Orthogonal Square Ground Grid**:
   - The terrain is viewed from straight above (orthogonal square cells).
2. **Oblique 45° Lean**:
   - Every unit of vertical elevation shifts diagonally **up and to the left** at a 1:1 slope (\(dx = -1, dy = -1\)).
3. **Three Visible Faces (Never North or West)**:
   - **Top Face**: Seen looking down; receives diffuse sky/overhead sun light.
   - **South Face**: Front vertical surface facing the camera.
   - **East Face**: Right-hand lateral profile connecting the grounded base to the elevated top face. Gives authentic volumetric depth.
4. **The Square Footprint & Containment**:
   - The ground contact base sits at the bottom-right of the 16×16 box (rows 12–15, cols 8–15).
   - As height increases, the silhouette leans diagonally towards the upper-left of the box (rows 1–5, cols 2–8).
   - **Zero pixel clipping or spillover**: The entire entity (head, canopy, peak, base) fits completely inside the 16×16 canvas.
5. **Transparency**:
   - Background is solid `#FF00FF` magenta for clean zero-loss extraction.

---

## 3. The Visual Standard: The Approved 2.5D Settler Anchor

The benchmark asset for all future generation is the **Adult Settler Male** (`art/masters/settler_male_16x16.png`):

```text
Row 0:  . . . . . . . . . . . . . . . .  <- Empty top row
Row 1:  . . O O O O O O . . . . . . . .  <- Crown of hair (x: 2..7)
Row 2:  . O H H H h h h d O . . . . . .  <- Top face of hair (sun highlight left)
Row 3:  . O H H H h h h h D . . . . . .  <- Layered bangs & hair volume
Row 4:  . O h W E S s W E d O . . . . .  <- Crisp 2x2 eyes (W=sclera, E=pupil), warm bridge
Row 5:  . O h E E S s E E d O . . . . .  <- Lower eye pupils & nose bridge
Row 6:  . . O s k k k c K D O . . . . .  <- Chin & jawline
Row 7:  . O T T T T S t u u u O . . . .  <- Tilted shoulder plane & V-neck collar notch
Row 8:  . O T T T T T t u u u U o O . .  <- Chest (south face) + East flank depth (u, U)
Row 9:  . O k T T T T t u u u U o O . .  <- Left hand (k) at hip + waist folds
Row 10: . . O B B B b B b b U o O . . .  <- Rope/leather belt with knot
Row 11: . . O T T T b t u u u o O . . .  <- Tunic hem skirt
Row 12: . . . . . O P P p p q q O . . .  <- Trousers (angled down-right)
Row 13: . . . . . O P p q . O P p q . .  <- Stride / calf parting
Row 14: . . . . . O L L . . O L l o . .  <- Dark leather boots
Row 15: . . . . O L L L . . O L l o o .  <- Boot soles grounded on bottom row 16
```

### Anatomical & Aesthetic Hallmarks:
1. **Soulful, Crisp 2×2 Eyes**: 1px pure `#FFFFFF` sclera catchlight paired with 1px `#201408` inward pupil, separated by a 2px warm peach `#EFDFD7` / `#E3C2B2` bridge. Looks directly at the viewer with personality and life.
2. **Authentic 45° Diagonal Lean**: The head at `(4, 3)` connects down-right to the feet at `(6, 15)` and `(12, 15)`, perfectly matching Ultima VII's townsman frame 16.
3. **Volumetric East Face**: Columns 10–13 exhibit the east-facing shadow planes (`#BA9A71`, `#9A7141`, `#3D240C`, `#201408`) creating authentic 2.5D depth.

---

## 4. Master Ultima VII Palette Swatches (100% Verified Against art/palette/uf.hex)

All color ramps must strictly use verified indices from `art/palette/uf.hex`:

| Material Ramps | Verified Indices & Hex Codes | Usage Rules |
| :--- | :--- | :--- |
| **Deep Silhouette** | `147` `#201408`, `146` `#2D1C08` | Silhouette contours, dark pupils, deep shadow crevices. |
| **Skin / Flesh Ramp** | `102` `#F7EBE7` (specular), `103` `#EFDFD7` (forehead), `105` `#E3C2B2` (mid), `107` `#D2A692` (shadow), `111` `#9A6D59` (jaw) | Human facial planes, snouts, noses. |
| **Dark Brown Bark / Hair** | `141` `#7D4D18` (highlight), `142` `#6D3D0C` (mid), `143` `#5D350C` (dark mid), `144` `#4D2D0C` (shadow), `145` `#3D240C` (deep) | Hair domes, tree trunks, kindling logs, boar bristles. |
| **Linen / Light Wood** | `134` `#EBE3D7` (highlight), `136` `#CAB292` (mid), `137` `#BA9A71` (shadow fold), `139` `#9A7141` (crease) | Undyed tunic, cut timber ends, growth rings. |
| **Oak Foliage** | `201` `#86B200` (sun highlight), `242` `#189218` (mid), `243` `#006D00` (shadow), `70` `#005100` (deep under-line) | Lobed broadleaf oak tree canopy. |
| **Fruit Tree Foliage** | `200` `#86D200` (sun highlight), `241` `#45B645` (mid), `242` `#189218` (shadow), `243` `#006D00` (deep rim) | Rounded fruit tree canopy. |
| **Ruby Apples** | `21` `#FF394D` (sun highlight), `23` `#DF1428` (body) | Individual 1–2px ruby apples on branches. |
| **Granite / Neutral Stone** | `120` `#CECECE` (top plane), `121` `#BEBEBE` (top mid), `123` `#9E9E9E` (south face), `124` `#8E8E8E` (south lower), `126` `#6D6D6D` (east shadow), `128` `#515151` (crevice) | Faceted granite boulders, river cobbles, hearth stones. |
| **Ironstone & Rust** | `150` `#CEC6BE` (sedimentary top), `158` `#514945` (lit stone), `159` `#453D39` (south face), `160` `#35312D` (ash/shadow), `122` `#AEAEAE` (raw iron), `183` `#9E5124` (rust stain), `184` `#8E3D0C` (rust vein) | Sedimentary mineral deposits, ash beds. |
| **Campfire Flame Core** | `250` `#FFD200` (spark/core), `251` `#FFAE00` (flame body), `235` `#FF8E10` (orange), `236` `#FF5100` (tongue tips) | Ascending fire core leaning up-left. |
| **Trousers / Muted Cloth** | `158` `#514945` (lit), `159` `#453D39` (mid), `160` `#35312D` (shadow) | Settler trousers, deep textile folds. |

---

## 5. Wave 1 Delivered 2.5D Masters (Ready for In-Game Integration)

All 13 Wave 1 assets have been fully rendered in 2.5D oblique projection, verified against `art/palette/uf.hex`, and stored in `art/masters/` (1× native) and `art/review/` (3× RMMZ and 16× inspection):

1. **`settler_male_16x16` (AR-400)**: Human Male Settler (2.5D Style Anchor). 45° diagonal stance, soulful 2×2 eyes, linen tunic, rope belt, sturdy boots.
2. **`oak` (AR-021)**: Ancient Broadleaf Oak. Grounded root flare at bottom-right, trunk leaning up-left at 45°, broad lobed canopy in upper-left.
3. **`stump` (AR-021)**: Felled Tree Stump. Angled cut surface showing growth rings and axe marks, rugged bark cylinder, spreading root anchors.
4. **`fruit_tree` (AR-020)**: Ancient Fruit Tree. Leaning trunk, rounded broadleaf canopy with scattered ruby apples.
5. **`fruit_tree_bare` (AR-020)**: Fruit Tree (Harvested). Same canopy with all fruit picked.
6. **`granite_boulder` (AR-022)**: Volumetric Weathered Granite. Top horizontal facet, vertical south face, east shadow face, lichen speck.
7. **`rocks_small` (AR-022)**: Small Cobble Cluster. Three faceted river stones with distinct top, south, and east facets.
8. **`ironstone` (AR-022)**: Ironstone Deposit. Layered sedimentary rock cut with heavy diagonal rust veins and raw metallic iron flecks.
9. **`campfire` (AR-105)**: Campfire Hearth (Unlit). Oval ring of cobblestones enclosing crossed dry oak logs and charcoal bed.
10. **`campfire_lit` (AR-105)**: Campfire Hearth (Lit). Roaring flame leaping upward and leaning up-left, casting amber light on north stones.
11. **`boar` (AR-401)**: Wild Boar. 2.5D 3/4 pose, bristled spine, snout with nostrils, gleaming white tusk, stocky torso, 4 hooves.
12. **`wall_wood` (AR-104)**: Timber Palisade Wall. Three vertical sharpened oak logs, dual iron binding straps, east profile on right.
13. **`rubble` (AR-104)**: Timber Wall Rubble. Collapsed shattered logs, split wood ends, iron fragments, and scattered chips.

---

## 6. Standardized Fable Output Template for Upcoming Assets

When authoring future asset descriptions, Fable must follow this exact format:

```markdown
### [ASSET_ID] [Asset Name]
- **Category**: [People / Flora / Geology / Wildlife / Building / Item]
- **Dimensions**: Exactly 16×16 pixels (1 asset square)
- **Anchor**: Bottom-right / collision footprint `[12, 15]`
- **Projection**: Ultima VII 2.5D Oblique (45° lean up-and-left, dx = -1, dy = -1)
- **Palette Ramps**: [Verified color indices from art/palette/uf.hex]

#### Primary State Visual Description:
[3–4 sentences detailing how the top face (overhead light), south face (front vertical), and east face (lateral depth) are arranged within the 16×16 grid. Must detail which pixel coordinates correspond to the ground base, elevation lean, and upper crest.]

#### Interaction / Transformed State Description:
[2–3 sentences detailing the alternate state (e.g. Stump, Picked, Carcass, Depleted, Unlit, Ruined).]

#### Readability Check:
[1 sentence describing how this asset immediately distinguishes itself in 2.5D oblique view on a busy 256×256 map at 1× and 3× zoom.]
```
