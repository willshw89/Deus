# DEUS — Human / World Scale Standard (DW.01.03)

**Document ID:** `DEUS-ART-SCALE-01`  
**Task:** `DW.01.03 — Freeze Human / World Scale Strip`  
**WBS Phase:** `DW.01 — World-Art Foundation Standards`  
**Prerequisites:** `DW.01.01` (Visual Charter, commit `42f0169`), `DW.01.02` (Native Resolution Standard, commit `faeee9e`), `DEUS-WORLD-WBS-v1.0` (commit `6e6a964`)  
**Status:** CANONICAL & FROZEN  
**Authority:** Project Owner Directive (2026-09-24)  

---

## 1. Executive Summary & Core Baselines

This standard converts the approved proportional language of `art/reference/DEUS_SCALE_LANGUAGE_V1.*` into a precise, machine-enforceable technical world-scale hierarchy for Project DEUS.

$$\textbf{THE CANONICAL ADULT HUMAN (~42 PX) IS THE PRINCIPAL VISUAL YARDSTICK.}$$

All environmental features, vegetation, geology, furniture, architecture, and creature assets must be proportioned relative to the Human at the exact same native pixel density.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             CANONICAL GAMEPLAY BASELINES                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Official Camera:             1.00x (LOCKED) — fixed tactical elevation, 1:1 pixels     │
│ World Grid Size:             48 × 48 screen pixels per tile ($T = 48\text{ px}$)       │
│ Canonical Adult Human:       ~42 native rendered pixels tall ($H \approx 42\text{ px}$)│
│ Ground Anchor Invariant:     Centered at $x = 24$, baseline contact at $y = 47$        │
│ Pixel Density Rule:          NATIVE_1_TO_1 ($1\text{ source art px} = 1\text{ screen px}$)│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Authority Separation Rule:**
> - `DEUS_SCALE_LANGUAGE_V1.*` governs **proportional harmony, aesthetic character, and silhouette readability**. It is a visual comparison reference, not a drafting ruler.
> - `game/data/DEUS_ScaleRegistry.json`, `tools/scale_resolver.js`, and this standard govern **exact pixel measurements, numerical tolerances, and automated QC gates**.

---

## 2. The Three Measurements Model

To avoid confusion between collision cells and visual artwork, every environmental asset is evaluated across three distinct parameters:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE THREE MEASUREMENT AXES                                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ A. VISUAL ENVELOPE:        Actual pixel dimensions of the source sprite                │
│                            (width × height in pixels, with min/target/max bounds).      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ B. GAMEPLAY FOOTPRINT:     Integer tile area occupied for navigation and collision     │
│                            ($1\times 1$, $1\times 2$, $2\times 1$, $2\times 2$ tiles). │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ C. CONTACT ANCHOR:         Ground point where the physical object meets the world cell │
│                            (e.g. BOTTOM_CENTER trunk base, BOTTOM_LEFT, CENTER).       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Overhang Allowance Invariant
- **Standard Common Trees** have a **$1\times 1$ gameplay footprint** (their trunk blocks one 48×48 tile at ground level), but possess an **extended visual envelope** of $\sim 68 \times 84\text{ px}$ (their foliage canopy overhangs neighboring sky/ground tiles).
- Visual overhang is **permitted and encouraged** for foliage, roofs, and large rock outcrops, and must **never** be forced or squeezed into an impermeable 48px box.

---

## 3. Preserved Tree Classification Hierarchy

The previous ~140 px common oak is **permanently superseded** (retained strictly as a rare Hero / Landmark Tree). The canonical overworld tree standard is locked at **$1.75\times$ to $2.25\times$ Human height**:

| Tree Class | Visual Height Target | Permitted Range | Canopy Width Target | Footprint | Relative to Human | Deployment Density |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **Standard Common Oak** | **~84 px** | 72–96 px | ~68 px | $1\times 1$ | $\approx 2.0\times$ | **Common (85%)** — Core overworld deciduous tree |
| **Standard Common Birch** | **~88 px** | 76–100 px | ~56 px | $1\times 1$ | $\approx 2.1\times$ | **Common** — Slender trunk, airy highland canopy |
| **Standard Common Pine** | **~92 px** | 80–104 px | ~52 px | $1\times 1$ | $\approx 2.2\times$ | **Common** — Tiered conifer boreal evergreen |
| **Large Accent Tree** | **~105 px** | 96–124 px | ~88 px | $1\times 1$ | $\approx 2.5\times$ | **Uncommon (12%)** — Old-growth copses, focal groves |
| **Hero / Landmark Tree** | **~140 px** | 120–160+ px | ~120 px | $2\times 2$ | $\approx 3.3\times$ | **Rare ($\le 3\%$)** — Ancient sacred monuments |

---

## 4. Master Canonical Scale Table

All asset classes registered in `game/data/DEUS_ScaleRegistry.json`:

### 4.1 Characters & Humanoids
| Class ID | Target W×H | Min W×H | Max W×H | Footprint | Anchor | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `CHARACTER_HUMAN_ADULT` | **18×42 px** | 14×40 px | 22×44 px | $1\times 1$ | BOTTOM_CENTER | Canonical yardstick, ~3.0–3.2 heads tall. |
| `CHARACTER_DWARF_ADULT` | **20×36 px** | 18×34 px | 24×38 px | $1\times 1$ | BOTTOM_CENTER | Broader silhouette, ~2.8 heads tall. |
| `CHARACTER_ELF_ADULT` | **16×43 px** | 14×42 px | 18×46 px | $1\times 1$ | BOTTOM_CENTER | Slender silhouette, ~3.3 heads tall. |
| `CHARACTER_CHILD` | **14×26 px** | 12×24 px | 16×28 px | $1\times 1$ | BOTTOM_CENTER | Youth colonist, ~2.2 heads tall. |
| `CREATURE_LARGE_2TILE` | **64×80 px** | 48×64 px | 88×96 px | $2\times 2$ | BOTTOM_CENTER | Large mount/beast (bear, elk, dire wolf). |

### 4.2 Micro Vegetation & Low Groundcover
| Class ID | Target W×H | Min W×H | Max W×H | Footprint | Anchor | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `MICRO_SHORT_GRASS` | **18×12 px** | 12×8 px | 24×16 px | $1\times 1$ | BOTTOM_CENTER | Ankle-high ground turf blades and clover. |
| `MICRO_TALL_GRASS` | **22×28 px** | 16×20 px | 28×36 px | $1\times 1$ | BOTTOM_CENTER | Knee-to-waist meadow grass, wind-swayed. |
| `MICRO_REEDS` | **24×34 px** | 16×28 px | 32×42 px | $1\times 1$ | BOTTOM_CENTER | Waterline marsh reeds and cattails. |
| `MICRO_FLOWERS` | **16×15 px** | 10×10 px | 22×20 px | $1\times 1$ | BOTTOM_CENTER | Ankle-to-knee meadow blooms and poppies. |
| `MICRO_FUNGI` | **12×12 px** | 8×8 px | 18×16 px | $1\times 1$ | BOTTOM_CENTER | Ground mushrooms and fungal caps. |

### 4.3 Shrubs & Thickets
| Class ID | Target W×H | Min W×H | Max W×H | Footprint | Anchor | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `SHRUB_SMALL_BUSH` | **26×18 px** | 20×14 px | 32×24 px | $1\times 1$ | BOTTOM_CENTER | Knee-high low bush and berry brush. |
| `SHRUB_MEDIUM_BUSH` | **36×26 px** | 28×20 px | 44×32 px | $1\times 1$ | BOTTOM_CENTER | Waist-to-chest foliage shrub. |
| `SHRUB_LARGE_THICKET` | **48×36 px** | 40×28 px | 60×42 px | $1\times 1$ | BOTTOM_CENTER | Dense hedge/thicket, up to Human eye level. |

### 4.4 Stone & Geological Formations
| Class ID | Target W×H | Min W×H | Max W×H | Footprint | Anchor | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `STONE_PEBBLES` | **12×6 px** | 8×4 px | 18×10 px | $1\times 1$ | BOTTOM_CENTER | Scattered pebbles and gravel, ankle height. |
| `STONE_SMALL_ROCK` | **18×14 px** | 14×10 px | 24×18 px | $1\times 1$ | BOTTOM_CENTER | Shin-height loose fieldstone pickup. |
| `STONE_MEDIUM_ROCK` | **28×22 px** | 22×16 px | 36×28 px | $1\times 1$ | BOTTOM_CENTER | Waist-height minable stone outcrop node. |
| `STONE_LARGE_BOULDER` | **42×38 px** | 32×28 px | 48×44 px | $1\times 1$ | BOTTOM_CENTER | Chest-to-Human height granite boulder. |
| `STONE_HERO_OUTCROP` | **64×46 px** | 48×36 px | 80×56 px | $2\times 1$ | BOTTOM_CENTER | Spans 2 tiles wide, rocky crag bluff. |

### 4.5 Wood Debris
| Class ID | Target W×H | Min W×H | Max W×H | Footprint | Anchor | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `DEBRIS_STUMP` | **22×16 px** | 16×12 px | 28×20 px | $1\times 1$ | BOTTOM_CENTER | Knee-height felled tree base. |
| `DEBRIS_FALLEN_BRANCH` | **30×10 px** | 20×6 px | 40×14 px | $1\times 1$ | BOTTOM_CENTER | Dead wood branch, foragable sticks. |
| `DEBRIS_FALLEN_LOG` | **58×16 px** | 44×12 px | 72×22 px | $2\times 1$ | BOTTOM_CENTER | Felled timber trunk, spans 1–2 tiles. |

### 4.6 Architecture & Furniture Reference Anchors
| Class ID | Target W×H | Min W×H | Max W×H | Footprint | Anchor | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `ARCH_DOORWAY` | **32×72 px** | 28×64 px | 36×80 px | $1\times 2$ | BOTTOM_CENTER | Entryway portal clearing Human + helmet (~72 px). |
| `ARCH_WALL_2GRID` | **48×96 px** | 48×92 px | 48×96 px | $1\times 2$ | BOTTOM_CENTER | 48 px material face + 48 px flat black cap. |
| `ARCH_BED` | **28×58 px** | 24×52 px | 32×64 px | $1\times 2$ | BOTTOM_CENTER | Sleeping berth exceeding Human body height. |
| `ARCH_CHAIR` | **20×26 px** | 16×24 px | 24×30 px | $1\times 1$ | BOTTOM_CENTER | Seat surface at knee height (10–14 px). |
| `ARCH_TABLE` | **38×24 px** | 32×20 px | 44×26 px | $1\times 1$ | BOTTOM_CENTER | Dining/work surface at waist height (20–24 px). |
| `ARCH_CHEST` | **32×20 px** | 28×16 px | 36×24 px | $1\times 1$ | BOTTOM_CENTER | Storage trunk at knee-to-waist height. |
| `ARCH_BARREL` | **24×28 px** | 20×24 px | 26×32 px | $1\times 1$ | BOTTOM_CENTER | Liquid/grain barrel at waist-to-chest height. |
| `ARCH_WORKBENCH` | **44×26 px** | 40×24 px | 48×30 px | $1\times 1$ | BOTTOM_CENTER | Artisan bench at waist working height. |
| `ARCH_HEARTH` | **44×38 px** | 36×32 px | 48×44 px | $1\times 1$ | BOTTOM_CENTER | Stone hearth with chimney flu. |
| `ARCH_FENCE` | **48×22 px** | 44×18 px | 48×26 px | $1\times 1$ | BOTTOM_CENTER | Waist-height perimeter fence rail. |
| `ARCH_STAIR_RAMP` | **48×72 px** | 44×48 px | 48×96 px | $1\times 2$ | BOTTOM_CENTER | Vertical transition between Z=0 and Z=+1/Z-1. |

---

## 5. Technical Scale Strip Reference (`DEUS_HUMAN_SCALE_STRIP_V1.png`)

Generated deterministically by `tools/generate_scale_strip.js`:
- **File Location:** `art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png`
- **Dimensions:** $1340 \times 224\text{ px}$
- **Continuous Baseline:** $y = 180$
- **Ruler Milestones:**
  - $0\text{ px}$: Ground baseline
  - $12\text{ px}$: Ankle-high short grass
  - $24\text{ px}$: Table/chair seat height
  - $36\text{ px}$: Medium rock / Dwarf height
  - **$42\text{ px}$**: **CANONICAL ADULT HUMAN REFERENCE** (amber dashed guide)
  - $48\text{ px}$: **1 WORLD TILE HEIGHT** (cyan dashed guide)
  - $72\text{ px}$: Standard doorway lintel ($1.5\times$ tile height)
  - **$84\text{ px}$**: **STANDARD COMMON OAK** ($2.0\times$ Human height; amber dashed guide)
  - $96\text{ px}$: **2 TILES HEIGHT** / 2-grid wall cap (cyan dashed guide)
  - $105\text{ px}$: Large accent copse tree ($2.5\times$ Human height)
  - **$140\text{ px}$**: **HERO / LANDMARK TREE** ($3.33\times$ Human height; amber dashed guide)
  - $144\text{ px}$: **3 TILES HEIGHT** (cyan dashed guide)

---

## 6. Pipeline Integration & Tooling

### 6.1 Prompt Compilation via `tools/scale_resolver.js`
Any generation prompt for Google Nano Banana Pro resolves scale parameters mechanically via:
```bash
node tools/scale_resolver.js TREE_COMMON_OAK
```
**Output injected into prompts:**
```text
=== CANONICAL SCALE SPECIFICATION (TREE_COMMON_OAK) ===
YARDSTICK REFERENCE: Canonical Adult Human is ~42 native rendered pixels tall.
TARGET VISUAL ENVELOPE: 68 px wide × 84 px tall.
PERMITTED TOLERANCE: Width [56-80 px], Height [72-96 px].
PROPORTION TO HUMAN: Approximately 2.00x Adult Human height.
GAMEPLAY FOOTPRINT: 1×1 tiles (48×48 px).
GROUND ANCHOR: BOTTOM_CENTER.
TILE OVERHANG: PERMITTED (canopy/features may overhang footprint).
PIXEL DENSITY: 1:1 Native Resolution (1 source art pixel = 1 rendered screen pixel at 1.00x camera).
NOTES: Standard temperate deciduous tree, ~2.0x Human height (72-96 px, target ~84 px).
```

### 6.2 Quality Control via `tools/art_check.js`
Assets declaring `scaleClass` in their sidecar JSON are verified automatically:
- **PASS**: Dimensions fall within target envelope ($\pm 8\text{ px}$).
- **WARN**: Dimensions deviate from target but remain inside permitted $[min, max]$ envelope.
- **FAIL**: Dimensions exceed permitted $[min, max]$ envelope or declare an unknown class.

### 6.3 Automated Test Suite
Run the test suite via:
```bash
node tools/test_scale_standard.js
```
Validates mathematical bounds, required class coverage, tree standard preservation, scale resolver outputs, and scale strip assets.
