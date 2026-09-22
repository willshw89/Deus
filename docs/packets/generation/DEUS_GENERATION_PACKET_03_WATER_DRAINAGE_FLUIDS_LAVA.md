# DEUS GENERATION PACKET 03: WATER, DRAINAGE, FLUIDS & LAVA

**System Identifier:** `DEUS_GENERATION_PACKET_03_WATER_DRAINAGE_FLUIDS_LAVA`  
**Integration Authority:** Owner Terminal (Gemini)  
**Creation Date:** 2026-09-22  
**Target Repository:** `C:\Users\snewt\OneDrive\Desktop\UF`  
**Classification:** Hydrology, Drainage & Multi-Level Fluid Dynamics Audit  

---

## 1. Layman's Guide: How Flooding and Lava Work in DEUS

### 1.1 The Golden Rule of Fluids: Water Flows Down, Walls Hold It Back
Think of Project DEUS as a layered cake of three underground floors:
- **Surface ($Z = 0$):** Where rivers, ponds, and rain collect.
- **Upper Caverns ($Z = -1$):** Shallow caves, underground lakes, and mining shafts.
- **Deep Caverns ($Z = -2$):** Deep magma chambers, crystal halls, and lava lakes.

### 1.2 Downward Breaching (The Ceiling Collapse)
- If you have water on the surface (like a river or lake) and dig a hole or remove solid rock beneath it on $Z=-1$:
  - Water breaches downward into the opening.
  - The cell directly beneath the water becomes **Flooded (Fresh water)**.
  - If you dig further down into $Z=-2$, water cascades down a second level, filling the deep chamber.

### 1.3 Lateral Spreading & Containment (BFS Water Expansion)
- Once liquid breaches into a cavern, it spreads outward horizontally across the floor using a **Breadth-First Search (BFS)** flood algorithm.
- Liquid flows until it hits an obstruction:
  - **Natural solid rock:** Completely blocks water and lava.
  - **Constructed walls:** Any solid wall stops water from advancing.
  - **Closed doors:** A closed door acts as a watertight seal. If opened, water rushes through!
  - **Maximum Travel Distance:** Natural viscosity limits how far unpressurized liquid pools spread from the breach point.

### 1.4 Lava Behavior & The Magma Sea ($Z = -2$)
- On $Z = -2$, natural underground water pools are generated as **Lava Pools** (`isLavaAtRaw`, `bMinus2.water[idx] = 1`).
- Lava behaves identically to water for lateral spreading and wall blocking, but:
  - It glows with radiant red/orange illumination (`Sprite_UFFloodOverlay` paints red at `rgba(215, 38, 16, 0.55)`).
  - Hovering over it reports **"Flooded (Lava)"** or **"Lava pool"**.

### 1.5 The Magma-Water Collision: Solidification
- What happens when a surface water breach pours down directly into a deep magma chamber?
- In `DEUS_Levels.js:1220-1235`, when water contacts lava:
  - Liquid interaction triggers instant solidification: `FLOOD_SOLIDIFIED = 3`.
  - The cell turns into solid stone (obsidian/rock), permanently sealing the breach!
  - This prevents an infinite flooding loop from destroying the subterranean world.

---

## 2. Technical Implementation Architecture

### 2.1 Hydrology Synthesis in `DEUS_WorldGen.js`
- **Autotiled Water Bodies:** 9 distinct water kinds (`fresh`, `pond`, `marsh`, `swamp`, `icy`, `brackish`, `salt`, `deep`, `blighted`) mapped to RMMZ A1 autotile shapes (`DEUS_WorldGen.js:1008-1045`).
- **Meandering Rivers:** Dual-frequency sinusoidal paths (`0.7 \sin(\omega d) + 0.3 \sin(2\omega d)`) continuous across area borders (`DEUS_WorldGen.js:392-446`).
- **Starter Pond:** Guaranteed fresh-water pond generated at distance 8..22 from start camp (`DEUS_WorldGen.js:451-473`).
- **Drainage Noise:** Determines soil saturation, marshland formation, and plant water-avoidance dilation grids (`waterDist`).
- **Status:** `IMPLEMENTED & VERIFIED` (`worldgen.river_continuous`, `worldgen.rivers_count`, `worldgen.water_near_start`, `biomes.lakes_or_rivers`).

### 2.2 Subterranean Flooding Engine in `DEUS_Levels.js`
- **Liquid Penetration Engine:** `getFloodGrid(area, z)` evaluates liquid sources on current and upper levels (`DEUS_Levels.js:1195-1670`).
- **Wall & Door Barriers:** `buildWallGrid` reads tile shapes and door states, marking impassable barriers.
- **Visual Presentation:** `Sprite_UFFloodOverlay` renders animated WebGL water/lava ripples across visible tiles without performance degradation.
- **Verification Evidence:** `node tools/run_tests.js flooding` passed 8/8 tests with 0 errors (`flooding.downward_breach_water`, `flooding.lateral_flood_bounded`, `flooding.wall_blocks_breach`, `flooding.cascading_breach_to_minus2`, `flooding.lava_flooding`, `flooding.describe_flooded_cells`, `flooding.flood_overlay_rendered`).
- **Status:** `IMPLEMENTED & VERIFIED`.

### 2.3 Status of `DEUS_Fluid.js`
- `game/js/plugins/DEUS_Fluid.js` was planned as a standalone plugin, but its entire functionality was integrated directly into `DEUS_Levels.js` and `DEUS_NaturalConnections.js`.
- **Status:** `SUBSUMED INTO DEUS_LEVELS & DEUS_NATURALCONNECTIONS`.
