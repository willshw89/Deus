# DEUS — Tileset Asset Size, Dimensions & Proportions Standard v1
**Document ID:** `DEUS-TILE-SCALE-01`  
**Status:** Authoritative Dimension & Proportions Specification (Frozen V1 Standard)  
**Authority:** Gemini (Full-Stack Coordinator & Art Authority) & Project DEUS Art Direction  
**Applicability:** Master Charter Task Family `WORLDART-BIOMES`, Google Nano Banana Pro generation prompts, `tools/art_check.js`, `tools/pack_deus_tileset.js`  

---

## 1. Executive Summary & Core Principle

$$\textbf{SCALE READABILITY TRUMPS ILLUSTRATIVE SET-PIECES AT 1.00x CAMERA.}$$

> [!WARNING]
> **SUPERSEDED SPECIFICATIONS NOTICE:**
> Any previous pilot report, candidate matrix, or draft prompt describing the initial ~140 px (3-tile) oak as an approved "common tree" standard is **STALE AND FORMALLY SUPERSEDED**. That ~140 px asset is reclassified strictly as a rare **Hero / Landmark Tree** ($\le 3\%$ map density). The authoritative common overworld tree standard is locked at **72–96 px** (canonical reference: **~84 px Oak**, **~88 px Birch**, **~92 px Pine**; $\approx 1.75\times$ to $2.25\times$ the 42 px Human). Nano Banana Pro prompt compilation must never retrieve the obsolete 140 px common tree scale.

At the official locked **1.00x camera**, the overworld must read cleanly as a playable tactical simulation map. Trees, rocks, and clutter must never overpower the ground or swallow the silhouettes of colonists and items.

Forests in Project DEUS feel expansive through **natural clustering, size variation, and density gradients**—NOT through giant, screen-smothering individual trees.

---

## 2. Core Geometric & Physical Assumptions

| Parameter | Value | Engine Context |
| :--- | :--- | :--- |
| **Grid Tile Size** | **48 × 48 px** | Canonical RMMZ base grid unit. |
| **Official Camera Distance** | **1.00x (LOCKED)** | Native 1:1 pixel rendering at 48×48 px per square. |
| **Human Colonist Reference** | **40–44 px (Target: 42 px)** | Anchored at bottom baseline ($y=47$), centered at $x=24$. |
| **Common Tree Rule** | **1.75× to 2.25× Human Height** | **72–96 px total height** (never 3×+ unless a rare landmark). |
| **Common Clutter Cap** | **$\le 32$ px tall** | Small ground clutter must not obscure human feet. |
| **Common Bush Cap** | **$\le 44$ px tall** | Bushes should stay under human chest/head height. |
| **Common Tree Cap** | **$\le 104$ px tall** | Upper bound for any standard forest tree. |

### Two Size Concepts Separated
Every asset explicitly distinguishes:
1. **Gameplay Footprint:** The logical collision grid it occupies ($1\times 1$, $1\times 2$, $2\times 2$ tiles).
2. **Visual Envelope:** The pixel dimensions of the sprite, including canopy, branch overhang, roof eaves, and drop shadows.

*Example:* A standard deciduous tree has a **$1\times 1$ gameplay footprint** (anchored at its root base), but a **$64 \times 88$ px visual envelope** (its canopy overhangs neighboring air tiles).

---

## 3. Human Relative Scale Benchmark (Reference: 42 px Adult)

$$\text{Human Colonist} = \mathbf{42\text{ px}}$$

- **Ankle-High Clutter (Pebbles, moss, small clovers):** $6–10\text{ px}$
- **Knee-High Flora (Grass tufts, wildflowers, mushrooms):** $12–20\text{ px}$
- **Waist-High Objects (Small shrubs, medium rocks, stumps):** $20–28\text{ px}$
- **Chest-High Obstacles (Medium bushes, large boulders):** $28–34\text{ px}$
- **Head-Height Features (Saplings, large thickets, fences):** $38–44\text{ px}$
- **$1.5\times$ Human Height (Small young trees, low cave mouths):** $\sim 63\text{ px}$
- **$2.0\times$ Human Height (Ideal standard overworld tree):** $\sim 84\text{ px}$
- **$2.5\times$ Human Height (Large accent tree / rocky bluff):** $\sim 105\text{ px}$
- **$3.0\times$ Human Height (Hero landmark / ancient oak):** $\sim 126–160\text{ px}$

---

## 4. Prescribed Asset Size Standards by Category

### 4.1 Terrain & Ground (A2 / A5 Sheets)
- **Base Ground Autotiles (Grass, dirt, sand, stone, ash, snow):** $48 \times 48\text{ px}$, $100\%$ seamless.
- **Ground Overlays (Leaf scatter, pebbles, dry soil patches):** $10–28\text{ px}$ visual cluster, covers $\le 35\%$ of the tile.
- **Paths & Roads:**
  - *Narrow Trail / Game Path:* $20–28\text{ px}$ clear center track.
  - *Normal Colony Road:* $28–36\text{ px}$ track width.
  - *Main Paved Highway:* $36–44\text{ px}$ track width.

### 4.2 Low Vegetation & Ground Clutter (Sheet B)
- **Grass Tufts (Animated 3 frames, 3 variations):**
  - *Visual Size:* $14–24\text{ px wide} \times 12–24\text{ px tall}$. Footprint: $1\times 1$. Anchored at $y=47$.
- **Tall Grass / Reeds (Animated 3 frames, 3 variations):**
  - *Visual Size:* $16–28\text{ px wide} \times 20–36\text{ px tall}$. Footprint: $1\times 1$. Anchored at $y=47$.
- **Wildflowers (Animated 3 frames, 3 variations):**
  - *Cluster Size:* $10–20\text{ px wide} \times 12–22\text{ px tall}$. Footprint: $1\times 1$. Anchored at $y=47$.
- **Mushrooms / Fungi (Static):**
  - *Size:* $8–18\text{ px wide} \times 8–16\text{ px tall}$. Clusters of 2–4 caps.

### 4.3 Shrubs & Bushes (Sheet B)
- **Small Bush (Animated 3 frames, 3 variations):**
  - *Visual Size:* $20–32\text{ px wide} \times 14–24\text{ px tall}$ (Knee height). Footprint: $1\times 1$.
- **Medium Bush (Animated 3 frames, 3 variations):**
  - *Visual Size:* $28–44\text{ px wide} \times 20–32\text{ px tall}$ (Waist to chest height). Footprint: $1\times 1$.
- **Large Thicket (Animated 3 frames, 3 variations):**
  - *Visual Size:* $40–60\text{ px wide} \times 28–42\text{ px tall}$ (Head height). Footprint: $1\times 1$ (rare $2\times 1$ visual). Use sparingly.

### 4.4 Rocks & Geological Debris (Sheet B / E)
- **Pebble Cluster (Static):** $8–16\text{ px wide} \times 4–10\text{ px tall}$. Footprint: $1\times 1$.
- **Small Field Stone (Static):** $14–24\text{ px wide} \times 10–18\text{ px tall}$. Footprint: $1\times 1$.
- **Medium Rock (Static):** $22–36\text{ px wide} \times 16–28\text{ px tall}$. Footprint: $1\times 1$.
- **Large Boulder (Static):** $32–48\text{ px wide} \times 24–40\text{ px tall}$. Footprint: $1\times 1$.
- **Hero Outcrop / Crag Fragment (Static):** $48–80\text{ px wide} \times 32–56\text{ px tall}$. Footprint: $2\times 1$ or $2\times 2$. Rare.

### 4.5 Woodland Objects (Sheet B)
- **Tree Stumps (Static):** $16–24\text{ px wide} \times 12–18\text{ px tall}$. Footprint: $1\times 1$.
- **Fallen Branch / Log Fragment (Static):** $24–40\text{ px wide} \times 8–16\text{ px tall}$. Footprint: $1\times 1$.
- **Full Fallen Log (Static):** $40–72\text{ px wide} \times 12–20\text{ px tall}$. Footprint: $1\times 1$ small, $2\times 1$ large.

### 4.6 Tree Classification Standard (Sheet C)

$$\textbf{CRITICAL REVISION: TREES ARE DIVIDED INTO THREE RIGID CLASSES.}$$

| Tree Class | Total Height | Canopy Width | Trunk Width | Gameplay Footprint | Relative Scale to 42 px Human | Deployment & Frequency |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **1. Standard Overworld Tree** *(Default)* | **$72–96\text{ px}$** | **$56–80\text{ px}$** | $14–20\text{ px}$ | **$1\times 1$** | $1.75\times$ to $2.25\times$ | **Common ($85\%$ of all trees)**. The workhorse tactical overworld tree. |
| **2. Standard Birch / Light Tree** | **$76–100\text{ px}$** | **$48–72\text{ px}$** | $12–18\text{ px}$ | **$1\times 1$** | $1.8\times$ to $2.3\times$ | **Common in highland/cold ecotones**. Slender trunk, airy canopy. |
| **3. Standard Conifer / Pine** | **$80–104\text{ px}$** | **$42–64\text{ px}$** | $12–18\text{ px}$ | **$1\times 1$** | $1.9\times$ to $2.4\times$ | **Common in cold/boreal ecotones**. Vertical tiered evergreen boughs. |
| **4. Large Accent Tree** | **$96–124\text{ px}$** | **$72–104\text{ px}$** | $20–28\text{ px}$ | **$1\times 1$ or $2\times 2$** | $2.3\times$ to $2.9\times$ | **Uncommon ($12\%$)**. Old-growth copses, focal clearings, grove edges. |
| **5. Hero / Landmark Tree** | **$120–160+\text{ px}$** | **$96–144+\text{ px}$** | $28–44\text{ px}$ | **$2\times 2$ to $3\times 3$** | $3.0\times$ to $4.0\times$ | **Rare ($3\%$)**. Sacred trees, ancient monuments, quest landmarks. |

---

## 5. RMMZ Sheet Allocations & Geometry Enforcement

| Sheet | Purpose | Dimensions | Grid | Layout Rules & Anchor Standards |
| :--- | :--- | :--- | :--- | :--- |
| **A1** | Water / Liquids | **768 × 576 px** | 16 × 12 tiles | 16 autotile blocks. 3-frame animation. Waterfalls animate vertically. |
| **A2** | Ground Autotiles | **768 × 576 px** | 16 × 12 tiles | 32 autotiles (96×144 px each). Seamless terrain and edge blends. |
| **A3** | Roofs / Overhangs | **768 × 384 px** | 16 × 8 tiles | 32 autotiles (96×96 px each). Eaves overhang 4–8 px. Medium pattern frequency. |
| **A4** | Walls & Cliffs | **768 × 720 px** | 16 × 15 tiles | 48 autotiles (96×120 px each). 48 px top cap obeys **DF Black Wall-Top Convention**. |
| **A5** | Normal Ground | **384 × 768 px** | 8 × 16 tiles | 128 single static tiles of 48×48 px. Stone shelves, stairs, pits. |
| **B** | Clutter, Flora, Rocks | **768 × 768 px** | 16 × 16 tiles | Cell [0,0] strictly transparent `rgba(0,0,0,0)`. Flora grounded at baseline $y=47$. |
| **C** | Modular Trees | **768 × 768 px** | 16 × 16 tiles | Standard trees ($72–96\text{ px}$), composite trunks and canopies. |
| **D** | Biome Edge Overlays | **768 × 768 px** | 16 × 16 tiles | 48×48 dithered transition fringes bridging neighbor biomes. |
| **E** | Micro-Geology / Ruins | **768 × 768 px** | 16 × 16 tiles | Stalagmites, crystals, mineral seams, neutral ruins. |
