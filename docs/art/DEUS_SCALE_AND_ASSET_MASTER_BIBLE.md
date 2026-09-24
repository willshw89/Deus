# DEUS — Scale, Dimensions & Visual Asset Master Technical Bible
**Document ID:** `DEUS-SCALE-BIBLE-01`  
**Status:** Authoritative Architectural Framework & Candidate Baseline (V1 Golden Pack Input)  
**Authority:** Gemini (Full-Stack Coordinator & Art Authority)  
**Applicability:** Every AI agent, human developer, test harness, art generation prompt, and asset pipeline on Project DEUS  

---

## 1. Core Principle: Packaging Dimensions vs. Physical World Scale

The central law of Project DEUS visual engineering is:

$$\textbf{RMMZ file dimensions are packaging envelopes, NOT identical physical scales.}$$

- A **144×144 pixel face portrait** is **NOT** a person three times taller than a 48px world tile. It is a high-resolution, semantically detailed UI representation of the exact same human phenotype.
- A **576×384 pixel side-view sheet** does **NOT** describe a 12×8-tile monster. It is a multi-cell container packing 54 distinct 64×64 animation frames.
- A **768×768 pixel B-tileset sheet** is **NOT** a 768×768 panoramic landscape illustration. It is a discrete warehouse storage grid packing 256 independent 48×48 tile cells.
- A **144×192 pixel character sheet** (`$filename.png`) is **NOT** a mini poster. It is a rigid 3×4 matrix packing 12 exact animation frames for directional movement or action.

Every asset in Project DEUS belongs strictly to one of six **Scale Domains**. Mixing scale domains within an art generation prompt or engine calculation produces fatal visual defects.

---

## 2. The Fundamental DEUS / RMMZ Ruler: One Map Tile ($T = 48\text{ px}$)

The fundamental unit of physical world reasoning across all terrain, architecture, furniture, and simulation logic is the standard RPG Maker MZ map tile:

$$\mathbf{T = 48 \times 48 \text{ pixels}}$$

> [!IMPORTANT]
> **Authoritative Size Specification:** For exact pixel bounds, size bands, clutter caps, and the 3-tier tree classification hierarchy, refer to the authoritative standard: [DEUS_TILESET_SCALE_STANDARD.md](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/art/DEUS_TILESET_SCALE_STANDARD.md).

All world-space entities are specified, prompted, and validated in **Tile Units ($T$)**:

| Tile Module | Pixel Dimensions | World Meaning & Usage |
|---|---|---|
| **$0.25 \times 0.25\ T$** | $12 \times 12\text{ px}$ | Micro-item: coins, berries, small flowers, scattered pebbles, dropped keys. |
| **$0.5 \times 0.5\ T$** | $24 \times 24\text{ px}$ | Small prop: bucket, stool, burlap sack, flagon, lantern, loaf of bread. |
| **$1 \times 1\ T$** | $48 \times 48\text{ px}$ | Standard single tile: human footprint, chest, barrel, crate, single door width, chair, forge anvil. |
| **$2 \times 1\ T$** | $96 \times 48\text{ px}$ | Narrow horizontal multi-tile: sleeping bed, wooden bench, butcher counter, trough. |
| **$1 \times 2\ T$** | $48 \times 96\text{ px}$ | Standard 2-grid vertical wall piece (48px lower material face + 48px upper wall-top cap). |
| **$2 \times 2\ T$** | $96 \times 96\text{ px}$ | Large object / Large creature: horse, dire wolf, stone hearth, communal well, smelter furnace. |
| **$1.5 \times 2\ T$** | $72 \times 96\text{ px}$ | **Standard Common Tree** (72–96 px tall, 1×1 footprint, canopy overhang; see [DEUS_TILESET_SCALE_STANDARD.md](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/art/DEUS_TILESET_SCALE_STANDARD.md)). |
| **$2 \times 2.5\ T$** | $96 \times 120\text{ px}$ | **Large Accent Tree** (96–124 px tall, old-growth copse, clearing focal point). |
| **$3 \times 3\ T$** | $144 \times 144\text{ px}$ | Large structure module, watchtower base, ancient stone altar. |
| **$3 \times 4\ T$** | $144 \times 192\text{ px}$ | **Hero / Landmark Tree** (120–160+ px, rare landmark), fortress gateway, communal shelter facade module. |

---

## 3. The Three Distinct Scaling Validations

Visual quality control cannot rely on a single blunt measurement. Scale is validated across three orthogonal metrics:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        THE THREE SCALING VALIDATION AXES                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. WORLD SCALE:   tile ↔ creature ↔ architecture ↔ vegetation                          │
│                   Does a human look believable standing in a doorway, next to a        │
│                   barrel, under an oak tree, or climbing a cliff face?                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. BODY SCALE:    body ↔ weapon ↔ shield ↔ tool ↔ clothing                             │
│                   Does a dagger look like a dagger and a spear look like a spear       │
│                   relative to that specific species/rig's anatomy?                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. TEXTURE SCALE: object size ↔ pixel-feature frequency                                │
│                   Are grass blades 1-3px rather than 14px? Are cobblestones tightly   │
│                   fitted rather than bowling balls? Is wood grain proportional?        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Characters: The Extended Presentation Envelope (48×48 is NOT an Impermeable Box)

$$\textbf{The Fundamental Rig Law: Body Rig Geometry } + \textbf{ Item Geometry } + \textbf{ Stable Ground Origin}$$

A common error is treating the $48 \times 48\text{ px}$ tile as an absolute prison where every visual pixel must be contained. 

- **Simulation Cell**: The character occupies a single logical $48 \times 48\text{ px}$ tile on the map for pathfinding, collision, and presence.
- **Base Body Envelope**: The unequipped humanoid body fits inside the $48 \times 48\text{ px}$ cell with baseline contact at $y = 47$.
- **Extended Visual Presentation**: Weapons (especially spears, halberds, greatswords), cloaks, flowing hair, horns, plumes, and casting gestures **can and must visually extend outside the 48px cell** when physically appropriate.
- **Ground Origin Invariant**:
  $$\mathbf{x_{\text{anchor}} = \text{Center} \quad (\approx 24\text{ px}), \quad y_{\text{anchor}} = \text{Foot Contact} \quad (y = 47\text{ px})}$$
  Expanded action sheets ($64 \times 64$ or $96 \times 96\text{ px}$) preserve this exact ground anchor coordinate, so characters never shift or pop when drawing a spear or casting a spell.

```
     y=0  ┌──────────────────────────────────────────────┐
          │  TRANSPARENT HEADROOM (Rig-specific clearance)│ <- Headwear, horns, plumes
    y=12  ├──────────────────────────────────────────────┤
          │  HEAD: Serious brow, determined eyes (~12 px)│ <- ~3.0-3.2 heads tall
    y=24  ├──────────────────────────────────────────────┤
          │  TORSO: Armor, tunic, belt, straps (~14 px)  │ <- Shoulder width ~14 px
    y=36  ├──────────────────────────────────────────────┤
          │  LEGS: Articulated boots, scabbard (~15 px)  │ <- Grounded battle stance
    y=47  └──────────────────────────────────────────────┘ <- GROUND CONTACT (Baseline)
```

### Provisional Golden Pack Candidate Heights (To Be Visually Proofed):
- **Adult Human**: $H \approx 40 \text{ to } 44\text{ px}$ (Nominal candidate: 42 px)
- **Adult Dwarf**: $H \approx 34 \text{ to } 38\text{ px}$ (Nominal candidate: 36 px, broader shoulder silhouette 18–20 px)
- **Adult Elf**: $H \approx 42 \text{ to } 45\text{ px}$ (Nominal candidate: 43 px, slender silhouette)
- **Adult Halfling**: $H \approx 28 \text{ to } 32\text{ px}$ (Nominal candidate: 30 px)
- **Human Child**: $H \approx 24 \text{ to } 28\text{ px}$ (Nominal candidate: 26 px, head proportion ~2.2 heads)

---

## 5. Body-Relative Equipment & Weapon Proportions

Equipment scales relative to the **visible height of the specific actor rig ($H$)**, not static pixel numbers across all races:

| Equipment Family | Proportion of Body Height ($H$) | Example Human ($H \approx 42\text{ px}$) | Example Dwarf ($H \approx 36\text{ px}$) | Example Child ($H \approx 26\text{ px}$) |
|---|---|---|---|---|
| **Dagger / Knife** | $0.25 \dots 0.40\ H$ | $11 \dots 17\text{ px}$ | $9 \dots 14\text{ px}$ | $7 \dots 10\text{ px}$ |
| **One-Hand Blade** | $0.55 \dots 0.75\ H$ | $23 \dots 32\text{ px}$ | $20 \dots 27\text{ px}$ | $14 \dots 20\text{ px}$ |
| **Two-Hand Blade** | $0.85 \dots 1.15\ H$ | $36 \dots 48\text{ px}$ | $31 \dots 41\text{ px}$ | N/A (unwieldable) |
| **Great Hammer** | $0.80 \dots 1.10\ H$ | $34 \dots 46\text{ px}$ | $29 \dots 40\text{ px}$ | N/A |
| **Quarterstaff** | $0.90 \dots 1.20\ H$ | $38 \dots 50\text{ px}$ | $32 \dots 43\text{ px}$ | $23 \dots 31\text{ px}$ |
| **Spear / Pike** | $1.00 \dots 1.50\ H$ | $42 \dots 63\text{ px}$ (extends outside cell) | $36 \dots 54\text{ px}$ | $26 \dots 39\text{ px}$ |
| **Round Shield** | $0.35 \dots 0.50\ H$ | $15 \dots 21\text{ px}$ diameter | $13 \dots 18\text{ px}$ diameter | $9 \dots 13\text{ px}$ |
| **Kite Shield** | $0.50 \dots 0.70\ H$ | $21 \dots 29\text{ px}$ tall | $18 \dots 25\text{ px}$ tall | N/A |

$$\textbf{The Spear Invariant: A spear must look like a spear.}$$
Never shrink a weapon until it resembles a toothpick or toy merely to keep it inside a 48px square.

---

## 6. Anatomy-Relative Furniture Scaling

Furniture dimensions are governed by human ergonomic interaction:

- **Chair / Stool Seat**: $\approx$ Knee height ($\mathbf{10 \text{ to } 14\text{ px}}$ above floor).
- **Dining Table / Workbench Surface**: $\approx$ Waist height ($\mathbf{20 \text{ to } 24\text{ px}}$ above floor).
- **Blacksmith Anvil Face**: $\approx$ Thigh/waist working height ($\mathbf{18 \text{ to } 22\text{ px}}$ above floor).
- **Bed Length**: Greater than full human body height ($\mathbf{52 \text{ to } 64\text{ px}}$, spanning $2\times 1\ T$).
- **Door Height**: Greater than full human body height with helmet ($\mathbf{64 \text{ to } 80\text{ px}}$, spanning $1.5\text{ to } 2\ T$).
- **Storage Chest**: Knee-to-waist height ($\mathbf{16 \text{ to } 24\text{ px}}$ tall, $32\text{ to } 40\text{ px}$ wide).
- **Storage Barrel**: Waist-to-chest scale ($\mathbf{24 \text{ to } 32\text{ px}}$ tall, $22\text{ to } 26\text{ px}$ diameter).

---

## 7. The Universal Scale-Strip Reference Card

To provide Google Nano Banana Pro (`gemini-3-pro-image`) with an infallible visual ruler, a master scale strip asset—`art/reference/DEUS_SCALE_STRIP_V1.png`—is passed as an `ImagePaths` reference in every environment and equipment prompt. It lays out the canonical silhouettes side-by-side:

```text
[48px GRID TILE]
  ├── Human Adult Average (42 px)
  ├── Dwarf Adult Average (36 px)
  ├── Elf Adult Average (43 px)
  ├── Halfling Adult Average (30 px)
  └── Dragonborn Adult Average (46 px)
  ├── Weapons: Dagger, Sword, Shield, Spear, Pickaxe
  ├── Furniture: Chair, Table, Doorway, Bed, Barrel
  ├── Vegetation: Young Sapling, Mature Forest Oak
  └── Vertical Terrain: 1-Z Solid Cliff Face (96 px)
```

---

## 8. Multi-Tile Object Pipeline (Whole Generation First)

$$\textbf{NEVER generate individual 48×48 tiles of a multi-tile object in isolation.}$$

1. **Generate Whole Object**: Prompt Nano Banana Pro to produce the entire coherent object (e.g. complete 96×144 px oak tree or 96×48 px bed) with the canonical Human silhouette standing next to it for scale.
2. **Scale & Align Validation**: Verify trunk, canopy, branches, and height against the human yardstick. Crop away the scale reference silhouette.
3. **Deterministic Grid Snap**: Snap the base of the object to the 48px tile boundary.
4. **Deterministic Slicing & Packing**: Engine tooling slices the master image into discrete 48×48 px chunks and packs them into Tileset B, C, D, or E.

---

## 9. Single Canonical Gameplay Camera Standard: 1.00x (LOCKED)

### Policy
Project DEUS standardizes on **ONE FIXED CANONICAL GAMEPLAY WORLD RENDERING SCALE: 1.00x (LOCKED)** (User directive 2026-09-24). Camera pans freely via WASD/edge-pan; no continuous zoom in/out.

- **Magnification:** Exact 1:1 pixel rendering at 48×48 px per square.
- **Visual Balance:** Tactical colony management breadth with crisp pixel fidelity for colonists (~42 px) and objects.
- All interaction modes (Command, Combat, Incarnate) operate at this **same physical 1.00x magnification**, altering only UI, selection tools, and lighting.
- All asset scaling (trees, clutter, rocks, walls) is calibrated strictly for readability at this 1.00x vantage. See [DEUS_TILESET_SCALE_STANDARD.md](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/art/DEUS_TILESET_SCALE_STANDARD.md).

---

## 10. Runtime Performance Invariants
- **Memory Invariant**: VRAM and heap allocation must remain **bounded and stable after initial level warm-up, with zero sustained upward growth**.
- **Culling Invariant**: Viewport culling must bypass `Sprite_Character.update()` and render passes for entities outside the screen (+ 2 tile margin).
- **Target**: Rock-solid **60 FPS under 4× simulation speed** with up to 100 active simulated colonists.
