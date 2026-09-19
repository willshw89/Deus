# Production Brief for Fable: 16×16 Pixel Art Asset Generation

**Target Audience:** Fable (Narrative & Visual Direction Generator)  
**Author:** Pair Programmer (Art Specialist)  
**Approved Anchor:** Adult Human Settler Male (`art/masters/settler_male_16x16.png`)  
**Style Standard:** Final Fantasy V (Super Famicom) Pixel Art Architecture  
**Color Palette:** Ultima VII Daylight Palette (`PALETTES.FLX` Record 0 / `art/palette/uf.hex`)  
**Date:** 2026-09-18  

---

## 1. Executive Summary & Core Mandate

Fable's mission is to narrate the exacting visual descriptions, material textures, lighting cues, and interaction states for all upcoming game assets. 

Every asset narrated by Fable must strictly adhere to the project's visual standard: **authentic Final Fantasy V 16-bit console RPG aesthetics** mapped to the **earthy, naturalistic Ultima VII daylight color palette**.

### The Golden Rule: Exactly One Asset Square
> [!IMPORTANT]
> **Every single entity in the world occupies exactly ONE asset square (16×16 native pixels).**  
> In accordance with Dwarf Fortress design philosophy (VISION V44):
> - An ancient oak tree, a draft horse, a mountain troll, a stone palisade wall, a camp boulder, an iron outcrop, a simple apple, and a human colonist ALL fit inside a single 16×16 pixel square (exported at 3× nearest-neighbor to 48×48 px).
> - **Zero multi-tile footprints.** Scale and mass are conveyed through internal silhouette weight, contrast, and Fable's narrative card, NOT through sprawling multi-cell dimensions.

---

## 2. Technical & Mathematical Guardrails

| Constraint | Exact Specification | Rationale & Strict Enforcement |
| :--- | :--- | :--- |
| **Native Canvas** | **16 × 16 pixels** | 1 art pixel = 1 image pixel. Do not upscale or antialias. |
| **Export Canvas** | **48 × 48 pixels** | Exactly 3× nearest-neighbor integer scaling for RPG Maker MZ. |
| **Footprint** | **1 × 1 tile** | Every object, creature, and person occupies a single cell. |
| **Ground Anchor** | **Bottom-center `[8, 15]`** | Feet/bases touch row 16 (y=15); columns 0 and 15 remain empty. |
| **Color System** | **Ultima VII 256 VGA Palette** | Strictly sampled from `art/palette/uf.hex`. No modern hex values. |
| **Color Count** | **Max 16–20 colors per square** | Classic 16-bit SNES hardware memory discipline. |
| **Lighting** | **Upper-Left (10:30 o'clock)** | Highlights on top & west; shadows on bottom & east. |
| **Background** | **Solid Magenta `#FF00FF`** | Clean zero-loss chroma key extraction without green fringes. |
| **Shading Technique** | **Cluster Shading (Anti-Slop)** | 3–4 discrete tonal steps per material; zero gradients; zero blur. |
| **Outlines** | **Selective Dark Outlines** | Dark umber `#201408` or `#2D1C08` on silhouettes; no pure `#000000`. |

---

## 3. The Visual Standard: The Approved Settler Anchor

The benchmark asset for all future generation is the **Adult Settler Male** (`settler_male_16x16.png`):

```text
Row 0:  . . . . . . . . . . . . . . . .  <- Empty top row
Row 1:  . . . . . O O O O O O . . . . .  <- Hair crown outline
Row 2:  . . . . O h H H H h h O . . . .  <- Highlight on upper-left
Row 3:  . . . O h H H H H H H h O . . .  <- Full hair volume
Row 4:  . . . O H H h H H H H H H O . .  <- Layered bangs
Row 5:  . . . O H h s h h H H H O . . .  <- Forehead skin peek
Row 6:  . . . O H h s s s h h H H O . .  <- Brow bridge
Row 7:  . . . O h W O s s O W H O . . .  <- FF5 Eyes: 1px White + Dark Pupil
Row 8:  . . . O O W O S S O W O O . . .  <- 2x2 Eye structure + Nose bridge
Row 9:  . . O T T O O S S S S O t t O .  <- SSSS Chin + Linen shoulders
Row 10: . O T T T T O s s O T T u u O .  <- Linen tunic chest & V-neck collar
Row 11: . O s T T O T T T t t T u T s O  <- Hands at sides, tunic waist
Row 12: . . O O B B b b b b B O O . . .  <- Brown rope belt with knot
Row 13: . . O T T T T T t t t t t u O .  <- Mid-thigh tunic skirt hem
Row 14: . . . O P P P q . O P p q O . .  <- Dark grey-brown trousers
Row 15: . . . O L L l l . O L L l O . .  <- Boots touching bottom row 16
```

### Key Anatomical & Aesthetic Rules Established:
1. **No Chibi Balloon Heads**: Head is ~40% of total height (rows 1–9), balanced by a broad 12–14px shoulder plane and sturdy legs.
2. **Soulful 2×2 Eyes**: 1px crisp `#FFFFFF` sclera paired with dark inward pupil `#201408`, separated by a 2px `#E3C2B2` skin bridge. Not giant shiny anime circles; not faceless stick figures.
3. **Upper-Left Tonal Logic**: Natural linen tunic uses `#EBE3D7` (highlight) on the upper-left, `#CAB292` (midtone) across the chest, and `#AA8659` (shadow) in lower-right folds.

---

## 4. Master Ultima VII Palette Swatches (Verified Against art/palette/uf.hex)

All color ramps must strictly use verified indices from `art/palette/uf.hex`:

| Material Ramps | Verified Indices & Hex Codes | Usage Rules |
| :--- | :--- | :--- |
| **Deep Silhouette** | `147` `#201408`, `146` `#2D1C08` | Silhouette contours, dark pupil outlines, deep crevices. |
| **Dark Brown Bark / Wood** | `142` `#6D3D0C`, `143` `#5D350C`, `144` `#4D2D0C`, `145` `#3D240C` | Tree trunks, kindling, log walls, dark fur/hide. |
| **Light Wood / Cut Grain** | `134` `#EBE3D7`, `136` `#CAB292`, `137` `#BA9A71`, `139` `#9A7141` | Axe-hewn wood faces, growth rings, log wall binding bands. |
| **Bright Fruit / Sun Apples** | `21` `#FF394D` (sun highlight), `23` `#DF1428` (body) | Ruby apples on fruit trees, warning points. |
| **Foliage (Fruit Tree)** | `200` `#86D200` (sun), `241` `#45B645` (mid), `242` `#189218` (shadow), `243` `#006D00` (deep rim) | Round broadleaf fruit tree canopy. |
| **Foliage (Oak)** | `201` `#86B200` (highlight), `242` `#189218` (mid), `243` `#006D00` (shadow), `70` `#005100` (deep under-line) | Broad lobed oak tree canopy. |
| **Granite / Neutral Stone** | `120` `#CECECE` (top), `123` `#9E9E9E` (front), `126` `#6D6D6D` (right), `128` `#515151` (cracks), `129` `#454545` (shadow) | Granite boulders, loose rocks, cobbles. |
| **Warm Ore Stone (Ironstone)** | `150` `#CEC6BE` (top edge), `158` `#514945` (lit), `159` `#453D39` (mid), `160` `#35312D` (shadow/ash) | Layered ironstone outcrop, hearth ash patch. |
| **Metallic Iron & Rust** | `122` `#AEAEAE` (iron fleck), `183` `#9E5124` (rust stain), `184` `#8E3D0C` (rust vein) | Raw iron veins cutting through sedimentary stone. |
| **River Cobbles (Campfire)** | `121` `#BEBEBE` (lit tops), `124` `#8E8E8E` (body), `126` `#6D6D6D` (shadow) | Elliptical hearth stones. |
| **Campfire Flame & Core** | `250` `#FFD200` (core/spark), `251` `#FFAE00` (mid), `235` `#FF8E10` (outer), `236` `#FF5100` (tongues), `137` `#BA9A71` (glow) | Teardrop flame and heated stone inner glow. |
| **Boar Hide & Features** | `141` `#7D4D18` (lit back), `142` `#6D3D0C` (mid), `143` `#5D350C` (shadow), `145` `#3D240C` (belly/legs), `111` `#9A6D59` (snout), `15` `#FFFFFF` (tusks) | Stocky wild boar front-facing anatomy. |

---

## 5. Asset Categories & Detailed Briefing Requirements

Fable will author briefs across the following 7 core asset domains. Every single asset description must account for its **Primary State** and its **Engine Interaction State**.

### Domain 1: Settlers, Factions & People (AR-400, AR-010/AR-011)
- **Constraint**: Must use the exact FF5 settler proportions (14px wide, 15px tall footprint, grounded on row 16).
- **Required Details**:
  - **Species Features**: Distinctive silhouette shifts within the 16×16 box (Dwarf = broad 14px shoulders, long beard to row 12; Elf = slight 11px torso, swept hair; Goblin = forward-hunched brow, tattered wraps).
  - **Attire Tiers (T0 to T3)**:
    - *Tier 0*: Unclad body (simple loincloth/wrap, bare chest, barefoot).
    - *Tier 1*: Plant-fiber woven wraps (`#CAB292` / `#AA8659`) bound with grass cord.
    - *Tier 2*: Cured animal hides (`#8A5D2D` / `#4D2D0C`) with crude shoulder lacing.
    - *Tier 3*: Tailored linen tunic with dyed border and dark trousers.
  - **Facings**: South (front facing camera), West (profile left), East (profile right), North (back view showing hair dome and mantle).

### Domain 2: Flora, Biome Trees & Gathering (AR-020, AR-021, AR-102, AR-103)
- **Constraint**: Must represent the entire tree inside ONE 16×16 tile.
- **Required Details**:
  - **Oak / Broadleaf**: Rounded leafy canopy filling rows 1–11, sturdy trunk (3px wide) on rows 12–14, root flares touching row 15.
  - **Pine / Conifer**: Tiered triangular foliage clumps with frosted tips, narrow trunk.
  - **Fruit Tree**: Leaf canopy dotted with 1px ruby-red apple highlights (`#D82818` / `#A01808`).
  - **State Transition (MANDATORY)**:
    - *Standing*: Majestic living canopy with upper-left sun sheen.
    - *Stump / Felled*: Rows 0–11 become empty background; rows 12–15 show a clean, axe-hewn wood ring with growth rings (`#EBE3D7` center, `#6D3D0C` bark rim) and woodchips scattered on ground.
    - *Berry Bush*: Full (lustrous berry clusters) vs. Picked (bare green bramble branches).

### Domain 3: Geology, Boulders & Mining Outcrops (AR-022, AR-044)
- **Constraint**: Solid grounded mass fitting within 14×13 pixels of the 16×16 square.
- **Required Details**:
  - **Granite Boulder**: Faceted weathered rock with angular planar breaks, moss on upper rim.
  - **Iron Ore Vein**: Dark sedimentary stone shot through with heavy metallic iron bands and rust stains (`#8A4D2D`).
  - **Malachite Outcrop**: Rich turquoise-green mineral crystal growths emerging from limestone.
  - **Gold Outcrop**: Quartz matrix embedded with brilliant sparkling gold flecks.
  - **State Transition (MANDATORY)**:
    - *Intact Outcrop*: Towering mineral deposit ready for pickaxe.
    - *Worked-Out / Depleted*: Low pile of cracked rubble, scree, and empty pit depression.

### Domain 4: Wildlife, Livestock & Monsters (AR-401, AR-402, AR-403)
- **Constraint**: 16×16 square containment. A huge wild boar or bear is drawn stocky and dense; a hare is drawn nimble and compact.
- **Required Details**:
  - **Wild Boar**: Heavy bristled spine, prominent white tusks (1px `#FFFFFF`), forward snuffling snout.
  - **Grey Wolf**: Alert pointed ears, bushy tail resting against hindquarters, silver-grey pelt.
  - **Forest Deer**: Slender legs, graceful neck, white tail-tuft, velvet antler tips.
  - **Mountain Troll**: Hunched moss-covered stonehide, lumbering knuckles touching row 15.
  - **State Transition (MANDATORY)**:
    - *Alive / Standing*: Upright lateral or 3/4 pose facing viewer.
    - *Hunted Carcass*: Horizontal collapsed game carcass, limp legs, skin/fur ready for butchery.

### Domain 5: Settlement Construction & Camp Life (AR-104, AR-105, AR-300)
- **Constraint**: Modular 16×16 square pieces that tile cleanly edge-to-edge.
- **Required Details**:
  - **Campfire**:
    - *State A (Unlit)*: Circular ring of river cobblestones enclosing stacked dry kindling.
    - *State B (Lit)*: Roaring flame core (`#FFD700` / `#FF6D00`) casting warm light onto stone rim.
    - *State C (Burnt)*: Ash-filled stone ring with black charcoal embers (`#201408`).
  - **Timber Palisade Wall**: Vertically sharpened oak logs bound with iron strapping, grain running vertically.
  - **Stone Masonry Wall**: Mortared ashlar stone blocks with crisp edge highlights.
  - **Straw Bedding Pallet**: Fluffy dried thatch tied with twine, hollowed sleeping impression.

### Domain 6: Loose Ground Resources & Tools (AR-200, AR-201)
- **Constraint**: Small iconographic items resting on the ground, centered in the lower half of the 16×16 square.
- **Required Details**:
  - **Rough Timber Log**: Peeled wood log with bark sides and concentric ring ends.
  - **Chipped Stone Chunk**: Sharp-edged knapped flint with gleaming specular facets.
  - **Raw Animal Hide**: Stretched, salted cowhide folded with fur peeking out.
  - **Stone Axe / Pick**: Hardwood handle bound with leather lashings to a knapped stone head.

---

## 6. Standardized Fable Output Template

For each requested asset, Fable must produce its narration following this exact schema:

```markdown
### [ASSET_ID] [Asset Name]
- **Category**: [People / Flora / Geology / Wildlife / Building / Item]
- **Dimensions**: Exactly 16×16 pixels (1 asset square)
- **Anchor**: Bottom-center `[8, 15]`
- **Palette Ramps**: [List of 3–5 specific U7 palette color ramps used]

#### Primary State Visual Description:
[2–3 vivid sentences detailing the exact silhouette, upper-left lighting highlights, midtone volumes, and selective shadow outlines. Describe what pixels go where.]

#### Interaction / Transformed State Description:
[2 sentences detailing the secondary state (e.g. Stump, Picked, Carcass, Depleted, Unlit, Ruined).]

#### Readability Check:
[1 sentence describing how this asset immediately distinguishes itself on a busy 256×256 map at 1× zoom.]
```

---

## 7. Immediate Action Item for Fable

Fable is requested to begin generating the narration briefs for **Wave 1 Priority Assets**:
1. `AR-020`: **Fruit Tree** (Standing full with apples vs. Picked)
2. `AR-021`: **Wild Oak** (Standing full canopy vs. Cleared stump)
3. `AR-022`: **Granite Boulder & Iron Deposit** (Intact outcrop vs. Worked-out rubble)
4. `AR-105`: **Campfire** (Unlit stone ring vs. Lit roaring flame vs. Cold ash)
5. `AR-401`: **Wild Boar** (Alive snuffling vs. Hunted carcass)
6. `AR-104`: **Timber Palisade Wall** (Intact vertical log segment vs. Ruined splintered)

