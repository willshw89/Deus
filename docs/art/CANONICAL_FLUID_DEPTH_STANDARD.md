# CANONICAL DEUS FLUID DEPTH STANDARD
**5 Visual Depth Bands for Water & Lava Grounded in 5-Strata Physical Geometry**
**Integration Authority:** Gemini / Antigravity
**Authoritative Directive:** VISION V135 (2026-09-25)
**Status:** CANONICAL ART & SIMULATION SPECIFICATION

---

## 1. Physical & Visual Alignment (The 5-Step Invariant)

Project DEUS enforces strict physical-to-visual symmetry across all systems:
- **World Macro Depth:** Exactly 5 persistent elevation levels (Z-2, Z-1, Z0, Z+1, Z+2).
- **Cell Strata Volume:** Exactly 5 internal 1-foot physical strata per 5-foot cube.
- **Fluid Depth Resolution:** Exactly 5 visible, semantic depth states for both **Water** and **Lava**.

$$\begin{matrix}
\text{Physical Fluid Inundation} & \longleftrightarrow & \text{Visual Depth State} & \longleftrightarrow & \text{Gameplay Trait} \\
\hline
\text{1 Stratum (1 ft)} & \longleftrightarrow & \textbf{Depth 1: Wet Edge / Thin Seep} & \longleftrightarrow & \text{Cosmetic wet / ankle film / heat edge} \\
\text{2 Strata (2 ft)} & \longleftrightarrow & \textbf{Depth 2: Shallow Flow} & \longleftrightarrow & \text{Shallow wade (-25\% move) / minor burn} \\
\text{3 Strata (3 ft)} & \longleftrightarrow & \textbf{Depth 3: Mid-Depth Pool} & \longleftrightarrow & \text{Knee-to-waist (-50\% move) / severe heat} \\
\text{4 Strata (4 ft)} & \longleftrightarrow & \textbf{Depth 4: Deep Hazard} & \longleftrightarrow & \text{Swim required / drown risk / lethal burn} \\
\text{5 Strata (5 ft / full cell)} & \longleftrightarrow & \textbf{Depth 5: Abyssal / Core Molten} & \longleftrightarrow & \text{Deep water / instant immersion hazard}
\end{matrix}$$

---

## 2. Water: The 5 Semantic Depth States

> [!IMPORTANT]
> **Not Merely a Color Ramp:** Depth is communicated through a combination of **transparency, bed visibility, saturation, edge softness, surface wavelets, and shimmer**, ensuring instant gameplay recognition at the locked 1.00× camera view.

### Depth 1: Wet Edge / Puddle / Film
- **Gameplay Meaning:** Shoreline film, splash puddle, shallow receding tide. Ankle water.
- **Movement Cost:** Normal (0% penalty).
- **Visual Traits:**
  - High transparency (~85–90% transmission); ground/sand/stone bed is completely sharp underneath.
  - Soft, feathered edge blending into dry terrain.
  - Lightest cyan-blue tint (`#89D8E6` / `#A3E8E2`).
  - Minimal animation: faint surface glint, tiny ripple pulses along the shore.

### Depth 2: Shallow Flow
- **Gameplay Meaning:** Ankle-to-knee water. Wadeable stream or pond edge. Natural reed and cattail bed.
- **Movement Cost:** Light penalty (-25% movement speed).
- **Visual Traits:**
  - Clear bed visibility with soft refraction distortion (~65–70% transmission).
  - Defined shoreline wavelets and rhythmic lapping.
  - Crisp cerulean/teal body (`#4DA8C8` / `#3690B4`).
  - Active 3-frame wave animation showing lateral movement.

### Depth 3: Mid-Depth Pool
- **Gameplay Meaning:** Knee-to-waist water. Ford crossing, deep marsh, canal.
- **Movement Cost:** Heavy penalty (-50% movement speed); carts and pack animals immobilized.
- **Visual Traits:**
  - Bed partially obscured; bed features appear dark and shadowy (~35–40% transmission).
  - Deeper sapphire-blue body (`#256898` / `#1A4E7A`).
  - Slower, heavier surface swells with subtle white-water foam flecks at boundaries.

### Depth 4: Deep Hazard
- **Gameplay Meaning:** Chest-to-overhead water. River channel, deep lake, moat.
- **Movement Cost:** Swimming required; non-swimmers begin breath-holding / drowning checks.
- **Visual Traits:**
  - Subsurface bed is invisible (~10–15% transmission).
  - Deep cobalt/indigo body (`#12345A` / `#0C2442`).
  - Subdued edge transparency; distinct dark boundary line against shallow zones.
  - Broad rolling swells with occasional white crests.

### Depth 5: Abyssal / Ocean Trench
- **Gameplay Meaning:** Full 5 ft inundation or multi-Z oceanic drop. Deepest subterranean lake.
- **Movement Cost:** Extreme drowning hazard; strong currents; full immersion.
- **Visual Traits:**
  - Zero bed visibility; opaque abyss (`#061426` to `#040C18`).
  - Inky deep blue-black body with high-contrast, specular crest shimmers.
  - Visually unmistakable void language connecting with Project DEUS darkness convention.

---

## 3. Lava: The 5 Molten Depth States

> [!CAUTION]
> **Lava Has Its Own Visual Language:** Lava is NOT "orange water." Its depth is governed by **crust-to-molten ratios, convection churn, incandescent glow, and viscosity**.

### Depth 1: Thin Seep / Crust-Broken Glow
- **Gameplay Meaning:** Shallow magma bleed, cooling edge crust, volcanic ash seepage.
- **Gameplay Hazard:** 1d6 fire damage on contact; ignites flammable footwear.
- **Visual Traits:**
  - Dominated by dark, solidified basalt crust (~75% black rock / `#1A1214`).
  - Thin, glowing molten veins (`#FF9900` / `#FFCC00`) spiderwebbing through jagged crack lines.
  - Faint thermal shimmer; slow, occasional smoke puff.

### Depth 2: Shallow Molten Flow
- **Gameplay Meaning:** Active magma rivulet, shallow caldera lip.
- **Gameplay Hazard:** 2d6 fire damage; burns unarmored units immediately.
- **Visual Traits:**
  - Exposed molten red-orange base with drifting black crust plates (~50% crust / 50% liquid).
  - Bright yellow-gold borders where crust plates collide and pull apart.
  - Low-viscosity, slow crawling flow across 3 frames.

### Depth 3: Medium Molten Pool
- **Gameplay Meaning:** Sustained liquid lava lake, volcanic channel.
- **Gameplay Hazard:** 4d6 fire damage per turn; destroys standard gear; high radiant heat radius.
- **Visual Traits:**
  - Dominant liquid molten surface (~25% small floating crust rafts).
  - Deep fiery orange-red body (`#CC3300` / `#E65500`) with glowing yellow thermal centers.
  - Visible convection churn and popping magma bubbles (3-frame bursting loop).

### Depth 4: Deep Lava
- **Gameplay Meaning:** Subterranean magma reservoir, main volcanic conduit.
- **Gameplay Hazard:** 10d6 fire damage; immediate destruction of non-magical items; fatal to biological life.
- **Visual Traits:**
  - Minimal crust; expansive, thick, boiling liquid volume.
  - Heavy incandescent yellow-white thermal glow (`#FFEE66`) bursting through thick dark-red magma swells.
  - Heavy thermal distortion effect and large churning lava geysers.

### Depth 5: Core Molten Magma
- **Gameplay Meaning:** Primordial planetary core magma, Z-2 deep geothermal breach.
- **Gameplay Hazard:** 20d6 fire damage / instant disintegration; supernatural geological hazard.
- **Visual Traits:**
  - Blinding, incandescent white-gold core heat (`#FFFFEE` to `#FFDD44`) surrounded by deep volcanic crimson.
  - Violent magma churning; zero solid crust surviving the heat.
  - Maximum visual contrast warning the player: *Absolute Lethal Boundary*.

---

## 4. Production Asset Matrix (Nano Banana Pro / RMMZ Format)

Per **Rule 11** (Google Nano Banana Pro) and **Rule 12** (All animation comes from the sprite):
- Every depth state is delivered as a **3-frame animation loop** on a rigid 48×48 px grid.
- Output filenames follow the canonical naming convention:

| Asset ID | Fluid Type | Depth Level | Frames | Grid Dimensions | Delivery Target |
|---|:---:|:---:|:---:|:---:|---|
| `Water_01` | Water | 1 (Wet Edge) | 3 | 144×48 px (3 cols × 1 row) | `game/img/tilesets/` |
| `Water_02` | Water | 2 (Shallow) | 3 | 144×48 px | `game/img/tilesets/` |
| `Water_03` | Water | 3 (Mid-Depth) | 3 | 144×48 px | `game/img/tilesets/` |
| `Water_04` | Water | 4 (Deep) | 3 | 144×48 px | `game/img/tilesets/` |
| `Water_05` | Water | 5 (Abyssal) | 3 | 144×48 px | `game/img/tilesets/` |
| `Lava_01` | Lava | 1 (Thin Seep) | 3 | 144×48 px | `game/img/tilesets/` |
| `Lava_02` | Lava | 2 (Shallow Flow) | 3 | 144×48 px | `game/img/tilesets/` |
| `Lava_03` | Lava | 3 (Medium Pool) | 3 | 144×48 px | `game/img/tilesets/` |
| `Lava_04` | Lava | 4 (Deep Lava) | 3 | 144×48 px | `game/img/tilesets/` |
| `Lava_05` | Lava | 5 (Core Molten) | 3 | 144×48 px | `game/img/tilesets/` |

---

## 5. Runtime Engine Hookup (`DEUS_Fluid.js`)

In `game/js/plugins/DEUS_Fluid.js`:
```javascript
// Fluid volume (0..7 units in legacy, 1..5 physical strata in 19A/19B)
// Directly maps contained fluid volume to visual depth state (1..5):
function getVisualDepthState(fluidType, containedStrata) {
    if (containedStrata <= 0) return 0; // Dry
    return Math.min(5, Math.max(1, containedStrata));
}
```
- A cell with 1 stratum of water automatically renders `Water_01`.
- A cell with 3 strata of water renders `Water_03`.
- A completely inundated cell (5 strata) renders `Water_05`.
- Dynamic fluid displacement (pumping, draining, evaporation, damming) automatically steps through the 5 visible states smoothly as water volume rises and falls.
