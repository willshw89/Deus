# DEUS — Physical World Simulation Specification
**Document ID:** `DEUS-SYS-PHYS-01`  
**Status:** Authoritative Engineering Specification (Frozen Physical World Standard)  
**Authority:** Gemini (Full-Stack Coordinator & Art Authority) & Fable / Claude Code (Engine Authority)  
**Applicability:** `DEUS_Levels.js`, `DEUS_Walls.js`, `DEUS_Floors.js`, `DEUS_Fluid.js`, `DEUS_Fire.js`, `DEUS_Projects.js`, `DEUS_WorldGen.js`, and all AI systems.

---

## 1. Executive Overview

This specification establishes the **complete, unified physical world simulation architecture** for Project DEUS. 

In Project DEUS, digging, mining, structural support, building, roofs, fluids, fire, weather, and AI pathfinding operate on a single shared physical model across five persistent vertical Z-levels ($Z \in \{-2, -1, 0, 1, 2\}$).

### Core Architectural Laws
1. **One Physical World Model:** Terrain layers, fluid depths, constructed walls, roofs, and objects share orthogonal cell state; no system invents its own spatial reality.
2. **Zero Full-World Scans:** Bounded local recomputation, event-driven queues, and dirty-region sets guarantee 60 FPS even on $256 \times 256 \times 5$ multi-Z worlds at $4\times$ speed.
3. **Explicit Physical Geometry:** Roofs, floors, and slabs are real physical horizontal elements occupying world coordinates; shelter is derived from coverage, never granted by metadata.
4. **Conservation of Mass:** Collapsed walls and mined rock convert to falling physical debris and rubble; material is never deleted into thin air.
5. **Legibility & Explainability:** The physical rules are deterministic and visual. The player and AI can inspect any tile to understand why a ceiling is safe, why water is flowing, or why a room is drafty.

---

## 2. Section A: World Physics Rules

### 2.1 Cell Ontology (The Standardized Physical State of a Coordinate)
Every integer coordinate $(x, y, z)$ in the simulated world possesses orthogonal layers:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        DEUS CELL ONTOLOGY                              │
├────────────────────────────────────────────────────────────────────────┤
│ 1. BASE VOLUME GEOMETRY (shapeCode: 1..7):                             │
│    - SOLID (1):      Full mass of natural stone, soil, or masonry.    │
│                      Blocks passage, vision, fluid, and objects.       │
│    - FLOOR (2):      Horizontal slab plane at cell bottom.             │
│                      Walkable; allows air/fluid above; blocks fall.    │
│    - OPEN (3):       Open room air / sky. Free passage for entities.   │
│    - RAMP (4):       Slanted plane connecting Z and Z+1 smoothly.     │
│    - STAIR_UP (5):   Vertical stair portal linking to Z+1.             │
│    - STAIR_DOWN (6): Vertical stair portal linking to Z-1.             │
│    - STAIR_BOTH (7): Continuous 3-level vertical stairwell shaft.      │
├────────────────────────────────────────────────────────────────────────┤
│ 2. MATERIAL CLASS (materialCode: 0..6):                                │
│    - STONE (0):      Granite, basalt, slate, limestone.                │
│    - SOIL (1):       Loam, clay, peat, sand.                           │
│    - TIMBER (2):     Hewn logs, seasoned planks.                       │
│    - THATCH (3):     Dry straw, reeds, rush bundles.                   │
│    - METAL (4):      Iron, bronze, worked steel.                       │
│    - MASONRY (5):    Dressed ashlar, bonded brick, mortar.             │
│    - ORGANIC (6):    Flesh, bone, living root.                         │
├────────────────────────────────────────────────────────────────────────┤
│ 3. CONSTRUCTION OVERLAY (built object / architectural feature):         │
│    - None | Wall | Door | Window | Beam/Post | RoofSlab | Bridge       │
├────────────────────────────────────────────────────────────────────────┤
│ 4. FLUID OVERLAY:                                                      │
│    - Type: None (0), Water (1), Lava (2)                               │
│    - Depth: 0..7 (0 = Dry, 1-2 = Shallow, 3-4 = Wading, 5-7 = Deep)    │
│    - Quiescent: Boolean (true = dormant, false = actively flowing)     │
├────────────────────────────────────────────────────────────────────────┤
│ 5. HAZARD / FIRE OVERLAY:                                              │
│    - Burning: Boolean                                                  │
│    - FuelTicks: Integer (remaining burn duration)                      │
│    - SourceType: ContainedHearth | OpenCampfire | Wildfire             │
├────────────────────────────────────────────────────────────────────────┤
│ 6. OCCUPANT ENTITIES & DECORATION:                                     │
│    - Units, furniture, chests, loose items, ground decals.             │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 2.2 Exact Structural Support & Collapse Rules

$$\textbf{RULE: Upper mass must trace a path of load-bearing support to solid bedrock.}$$

```text
                 THE TWO MODES OF STRUCTURAL SUPPORT
  
  [MODE 1: DIRECT VERTICAL SUPPORT]
  Cell (x, y, z) has direct vertical support IF:
  - Cell (x, y, z-1) is SOLID rock, packed soil, or a load-bearing wall, OR
  - Cell (x, y, z-1) contains a structural support post / pillar / ashlar column.
  Support Strength: 100% (Maximum).

  [MODE 2: LATERAL ADJACENCY SPAN]
  A horizontal slab (Floor, Roof, Bridge, Rock Ceiling) at (x, y, z) that
  lacks direct vertical support beneath it is STABLE IF AND ONLY IF:
  - It connects to an orthogonal neighbor on the same Z plane that traces
    to a vertically supported anchor within its material's maxHorizontalSpan.
```

#### Material Structural Support Table:
| Material Class | Direct Load Bearing? | Max Horizontal Span ($S$) | Undermined Reaction | Resulting Debris |
|---|---|---|---|---|
| **Natural Granite / Basalt** | Yes (Infinite) | $3\dots 4\ T$ (Arched ceiling) | Brittle fracture | Rock rubble boulders, stone dust |
| **Loose Sand / Gravel** | No (Compresses) | $0\ T$ (Zero cohesion) | Instant granular slide | Loose dirt pile, dust cloud |
| **Packed Loam / Clay** | Low | $1\ T$ | Clod shearing | Packed earth clods |
| **Constructed Stone Ashlar** | Yes (High) | $2\dots 3\ T$ | Mortar failure | Chipped ashlar blocks, mortar |
| **Engineered Timber Beams** | Yes (Moderate) | $4\dots 5\ T$ (Framed) | Splintering snap | Splintered timbers, planks |
| **Thatch / Reeds** | No (Cannot bear) | $2\ T$ (Needs timber rafter) | Tearing / collapse | Thatch straw litter |
| **Mine Timber Prop (Object)** | Transmits load | N/A (Vertical column) | Buckles under overload | Broken post fragments |

#### Collapse Execution Cascade:
```text
  Trigger: Support cell at (x0, y0, z0) destroyed (mined, blasted, or burned).
                 │
                 ▼
  Step 1: Invalidate neighborhood within Chebyshev distance max(S) = 5.
                 │
                 ▼
  Step 2: Execute Bounded BFS from affected upper cells (max depth 5).
  Does a path of connected structural cells reach a vertically supported anchor?
         ┌───────┴───────┐
       YES               NO
        │                │
        ▼                ▼
     STABLE          UNSUPPORTED COLLAPSE!
  (No action)            │
                         ▼
  Step 3: Transform cell geometry: (x, y, z) becomes OPEN_AIR.
                 │
                 ▼
  Step 4: Spawn falling debris entity descending to lowest open cell (z_floor < z).
                 │
                 ▼
  Step 5: Impact on z_floor:
  - Living units suffer Falling Object Bludgeoning Damage (SRD 5.1 dice: 2d6 per Z).
  - Standing objects/furniture damaged or crushed.
  - Cell receives physical debris object (0.5x movement speed or impassable).
                 │
                 ▼
  Step 6: Queue cells above (z+1, z+2) for recursive upward dependency evaluation!
```

---

### 2.3 Terrain Generation Across Multi-Z Levels

$$\textbf{INVARIANT: Natural elevated terrain begins life as a filled solid volume.}$$

1. **Solid Foundation Beneath Hills:**
   - If world generation places a hill or plateau surface at $Z+1$:
     - Surface plane at $Z+1$: `FLOOR` (grass/dirt/stone finish, walkable).
     - Underneath at $Z0$: **`SOLID` rock/soil mass** (blocks horizontal movement, passability = false).
     - Underneath at $Z-1$: **`SOLID` rock/soil mass**.
   - If a mountain peak surface is at $Z+2$:
     - $Z+2$: `FLOOR` (snow/crag).
     - $Z+1$: `SOLID` rock.
     - $Z0$: `SOLID` rock.
2. **Intentional Cliff Transitions:**
   - Exposed vertical cliff faces on $Z0$ are rendered via the **Dwarf Fortress Black Wall-Top Convention** ($48\times 96\text{ px}$, lower 48px natural rock face, upper 48px near-black `#08080C` to `#121218` cap).
   - Natural ramps (`RAMP = 4`) are generated at intentional slope intervals (elevation gradient = 1) to provide natural wildlife and colonist connectivity between Z-levels.

---

### 2.4 Digging, Mining, Channeling & Blasting Mechanics

Every terrain alteration command has precise, deterministic geometric consequences:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                    DIGGING & DEMOLITION MATRIX                         │
├────────────────────────────────────────────────────────────────────────┤
│ ACTION             │ TARGET CELL (Z)     │ GEOMETRIC CONSEQUENCE       │
├────────────────────┼─────────────────────┼─────────────────────────────┤
│ 1. Mine Horizontal │ SOLID (Z0)          │ Z0: SOLID -> OPEN.          │
│                    │                     │ Floor formed at cell base.   │
│                    │                     │ Yields mined ore/stone.      │
│                    │                     │ Evaluates support for Z+1!  │
├────────────────────┼─────────────────────┼─────────────────────────────┤
│ 2. Channel Down    │ FLOOR (Z0)          │ Z0: FLOOR -> OPEN.          │
│                    │                     │ Pierces ceiling of Z-1!     │
│                    │                     │ Z-1 becomes OPEN or RAMP.   │
│                    │                     │ Fluids on Z0 drop to Z-1!   │
├────────────────────┼─────────────────────┼─────────────────────────────┤
│ 3. Carve Ramp      │ SOLID or CLIFF      │ Cell converts to RAMP (4).  │
│                    │                     │ Connects Z to Z+1 smoothly. │
├────────────────────┼─────────────────────┼─────────────────────────────┤
│ 4. Carve Stairs    │ SOLID or FLOOR      │ Cell converts to STAIR (5/6)│
│                    │                     │ Links Z <-> Z+1 or Z-1.     │
├────────────────────┼─────────────────────┼─────────────────────────────┤
│ 5. Remove Roof     │ ROOF SLAB (Z+1)     │ Z+1: ROOF -> OPEN_AIR.      │
│                    │                     │ Drops shelter of Z0 below.  │
├────────────────────┼─────────────────────┼─────────────────────────────┤
│ 6. Blast Explosive │ Sphere radius R     │ Converts SOLID/WALL to OPEN;│
│                    │                     │ Breaks horizontal slabs;    │
│                    │                     │ Wakes local collapse queue! │
└────────────────────┴─────────────────────┴─────────────────────────────┘
```

---

### 2.5 Explicit Constructible Roofs & Derived Shelter

$$\textbf{RULE: A building has NO roof until colonists physically build it.}$$

1. **Roof as Explicit Geometry at $Z+1$:**
   - A roof is a constructed horizontal slab occupying $Z+1$ (or higher) over an open room volume on $Z0$.
   - Supported by the load-bearing exterior walls on $Z0$ up to the material's `maxHorizontalSpan`.
2. **Derived Shelter Status:**
   - A cell $(x, y, z)$ is **`SHELTERED`** if and only if:
     1. An intact, weatherproof horizontal slab exists directly overhead at $Z+1$ (or natural rock ceiling in a cave).
     2. The cell is bounded by a continuous perimeter of walls and closed doors.
   - Beds under unroofed sections remain exposed to rain, wind, and temperature penalties.
3. **Roof Damage & Collapse:**
   - If fire, siege engines, or structural failure destroys supporting walls, the roof slab loses support and collapses downward into $Z0$, crushing furniture and extinguishing or spreading hearth fires.

---

### 2.6 Fluid Mechanics: Volumetric 0..7 Depth with Active Dirty Queues

```text
┌────────────────────────────────────────────────────────────────────────┐
│                         FLUID DYNAMICS ENGINE                          │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Volumetric Depth (0..7):                                            │
│    - 0: Dry                                                            │
│    - 1-2: Puddle / Shallow (Passable, x1.1 movement cost)              │
│    - 3-4: Wading (Passable, x2.0 movement cost, extinguishes sparks)   │
│    - 5-6: Deep / Swimming (Impassable to non-swimmers; drowning risk)  │
│    - 7: Submerged / Full (Complete immersion, pressurized flow)        │
│                                                                        │
│ 2. Lava Hazards:                                                       │
│    - Lethal at depth >= 1. Deals 4d10 fire damage/tick.                │
│    - Ignites any flammable object or creature entering cell.           │
│                                                                        │
│ 3. Water + Lava Reaction:                                              │
│    - Water (>=1) meets Lava (>=1) in adjacent/same cell:               │
│      -> Consumes 1 Water + 1 Lava.                                     │
│      -> Spawns 1 tile of solid Obsidian / Basalt rock.                 │
│      -> Emits boiling steam particle burst (temporary smoke hazard).   │
│                                                                        │
│ 4. Flow Priority:                                                      │
│    - Priority 1: Vertical Gravity Downward into Z-1 (instant transfer).│
│    - Priority 2: Lateral Equalization across 4 orthogonal neighbors.   │
│                                                                        │
│ 5. Active Dirty Set (Performance Invariant):                           │
│    - Dormant bodies (calm lake, enclosed reservoir) cost 0 CPU.        │
│    - Only cells actively transferring fluid sit in the dirty queue.    │
│    - Bounded budget: Max 512 cells processed per simulation tick.      │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 2.7 Fire, Heat & Structural Hazard Simulation

1. **Fire Sources & Containment:**
   - **Contained Source (`hearth`, `kitchen_hearth`, indoor enclosed stove):** Strict containment invariant (`escapeChance = 0`). Safe for indoor heating and cooking.
   - **Open Fire Source (`campfire`, lightning strike, fire arrow):** Radiates heat and rolls per second to ignite adjacent flammable materials.
2. **Flammability Classes:**
   - *Incombustible:* Stone, ashlar masonry, dirt, metal, water ($0\%$ burn chance).
   - *Combustible Timber:* Hewn logs ($20\%$), timber planks ($50\%$).
   - *Highly Flammable:* Thatch ($90\%$), dried straw, cloth, paper ($95\%$).
3. **Structural Destruction via Fire:**
   - Burning timber walls lose structural HP per tick.
   - Upon burnout (HP $\le 0$), the wall collapses into ash and charcoal $\to$ triggers `world:geometryChanged` $\to$ may trigger overhead roof collapse!
4. **AI Hazard Avoidance Hooks:**
   - Burning cells incur an extreme pathfinding penalty ($+1000$ cost).
   - Colonists flee burning rooms and autonomously post/douse fires using water buckets.

---

### 2.8 Settlement Construction Logic & Physical Build Sequence

To eliminate issues where colonists stall after the first communal room, construction adheres to an explicit physical dependency graph:

```text
              THE PHYSICAL BUILDING DEPENDENCY GRAPH
  
  [STAGE 1: SITE CLEARANCE]
  Clear trees, boulders, loose debris from reserved parcel.
                 │
                 ▼
  [STAGE 2: FOUNDATION & SUB-FLOOR]
  Lay floor slabs / curbs at Z0. Provides clean, even footing.
                 │
                 ▼
  [STAGE 3: VERTICAL WALLS & SUPPORT COLUMNS]
  Construct 2-grid walls (48x96 px) and corner posts at Z0.
  Walls provide vertical support anchors for roof above.
                 │
                 ▼
  [STAGE 4: OPENINGS & DOORS]
  Hang doors in wall portals. Secures the enclosed perimeter.
                 │
                 ▼
  [STAGE 5: EXPLICIT HORIZONTAL ROOF SLABS]
  Erect tie-beams and lay roof slabs at Z+1.
  Completes 100% roof coverage -> Triggers SHELTERED status!
                 │
                 ▼
  [STAGE 6: INTERIOR FITTINGS & PROPS]
  Construct kitchen hearth, beds, tables, and storage chests.
  Now safe from weather exposure and rain burnout!
```

#### Physical Parcel Selection & Settlement Growth:
- **Autonomous Dwelling Expansion:** When existing sheltered beds $< \text{Population}$ or unhoused married households form, the settlement planner searches for an adjacent expansion parcel ($5\times 5$ to $6\times 6$ footprint within $R = 24\dots 40\ T$ of the town center).
- **Physical Road Connection:** Expansion parcels automatically trace a path to the central road network, reserving pedestrian access corridors.

---

## 3. Section B: Data Model

To achieve high-speed execution with zero garbage-collection thrashing, the physical world data model combines **flat typed arrays for static baselines** with **sparse hashtables for mutations**.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PHYSICAL DATA MODEL                             │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Per-Level Static Baseline (Generated from Seed, Never Saved):       │
│    - baseline.shape:    Uint8Array(256 * 256) [shapeCode 1..7]         │
│    - baseline.material: Uint8Array(256 * 256) [materialCode 0..6]      │
│                                                                        │
│ 2. Dynamic Level State (Sparse Map in Save Game):                      │
│    UF.World.state.levels[z].cells[packedKey(x, y)] = {                 │
│        shape:       1..7,                                              │
│        material:    0..6,                                              │
│        constructed: Boolean,                                           │
│        supportId:   Integer (cached anchor ID),                        │
│        roofed:      Boolean (derived & cached),                        │
│        integrity:   0..100 (structural HP)                             │
│    }                                                                   │
│                                                                        │
│ 3. Fluid State (Sparse Typed Map):                                     │
│    UF.Fluid.state.cells[packedKey(x, y, z)] = (type << 4) | (depth & 0xF)│
│                                                                        │
│ 4. Fire State (Sparse Active Records):                                 │
│    UF.World.state.fire.burning[packedKey(x, y, z)] = {                 │
│        fuel:       Integer,                                            │
│        sourceType: String,                                             │
│        provenance: { fireId, startedAt, originCell }                   │
│    }                                                                   │
│                                                                        │
│ 5. Structural Support Registry (Spatial Index):                        │
│    - Cached load-bearing columns (x, y, z).                            │
│    - Invalidated locally upon any geometryChanged event.               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Section C: Update Model & Performance Architecture

$$\textbf{CORE PRINCIPLE: Stable state costs zero CPU cycles. Change creates work.}$$

```text
┌──────────────────┬──────────────────────┬──────────────────────────────┐
│ SIMULATION EVENT │ IMMEDIATE ACTIONS    │ QUEUED ASYNC WORK            │
├──────────────────┼──────────────────────┼──────────────────────────────┤
│ 1. Dig / Mine    │ - Cell -> OPEN.      │ - Push Z+1 neighbors to      │
│                  │ - Spawn dropped item.│   Support Queue.             │
│                  │ - Update path grid.  │ - Wake adjacent fluids.      │
│                  │                      │ - Invalidate local lighting. │
├──────────────────┼──────────────────────┼──────────────────────────────┤
│ 2. Wall Built    │ - Cell -> SOLID/WALL.│ - Push Z+1 into Support Queue│
│                  │ - Update passability.│   (now provides support!).   │
│                  │ - Wall cap rendered. │ - Re-evaluate room enclosure.│
├──────────────────┼──────────────────────┼──────────────────────────────┤
│ 3. Support Check │ - BFS depth <= 5.    │ - If failed: queue Collapse  │
│    (from queue)  │                      │   Animation & Damage event.  │
├──────────────────┼──────────────────────┼──────────────────────────────┤
│ 4. Fluid Tick    │ - Process max 512    │ - Re-enqueue active moving   │
│    (dirty queue) │   dirty cells.       │   cells. Quiescent cells sleep│
├──────────────────┼──────────────────────┼──────────────────────────────┤
│ 5. Fire Beat     │ - Decrement fuel.    │ - Roll spread to neighbors.  │
│    (1s cadence)  │ - Apply burn damage. │ - If HP <= 0: trigger break. │
└──────────────────┴──────────────────────┴──────────────────────────────┘
```

- **Zero Global Frame Scans:** No loop ever iterates over $256 \times 256$ cells during a render frame or simulation step.
- **Dirty Region Bounding Boxes:** Render updates and pathfinding grid updates are restricted to the axis-aligned bounding box $[x_{\min}-2, y_{\min}-2, x_{\max}+2, y_{\max}+2]$ of altered cells.

---

## 5. Section D: Player-Facing Rules & Legibility

1. **Digging & Building Designations:**
   - Distinct, unmistakable 16-bit cursor overlays:
     - `Mine Rock`: Flashing pickaxe icon over cell.
     - `Channel Down`: Downward chevron drill icon.
     - `Build Wall`: White blueprint preview with corner alignment.
     - `Construct Roof`: Translucent amber framing preview at $Z+1$.
2. **Structural Hazard Warning System:**
   - When the player or AI designates an excavation that will undermine an overhead structure, the target cell displays an **Unstable Structural Warning** (blinking yellow/red hazard crosshatch).
   - If mined anyway, cracking dust particles appear 1 second before catastrophic collapse, providing a brief reflex window.
3. **Derived Shelter Legibility:**
   - The UI Inspection Tool (`UF_Look` / cursor hover) displays exact cell physics:
     `"Dwelling Room — Sheltered (Stone Slab Z+1) — Temperature: Warm (Hearth) — Dry"`
   - Unroofed rooms clearly display:
     `"Exposed to Weather (Unroofed) — Temperature: Cold — Muddy"`

---

## 6. Section E: AI Hooks & Colony Brain APIs

Colony autonomous AI (`DEUS_Jobs.js`, `DEUS_Colonists.js`, `DEUS_Projects.js`) relies on clear, lightweight physical query APIs:

```javascript
// --- Physical Query APIs for Autonomous AI ---

// 1. Hazard Avoidance
UF.Physics.isHazardous(area, x, y, z);
// Returns true if cell is burning, contains lethal lava, or fluid depth >= 5.

// 2. Structural Safety Guard
UF.Physics.isSafeToExcavate(area, x, y, z);
// Returns true if removing cell (x, y, z) will NOT trigger an immediate collapse onto the worker.

// 3. Derived Shelter Status
UF.Physics.isSheltered(area, x, y, z);
// Returns true if valid weatherproof roof exists overhead AND room is enclosed.

// 4. Physical Build Pre-requisites
UF.Physics.canConstruct(area, x, y, z, blueprintKind);
// Validates footing, support span, and vertical clearance before workers haul materials.

// 5. Expansion Siting Query
UF.Physics.findExpansionParcel(area, centerRef, footprintW, footprintH, options);
// Returns candidate coordinates for new dwellings with slope <= 1, dry land, and road proximity.
```

---

## 7. Section F: Phased Implementation Plan

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   PHYSICAL SIMULATION IMPLEMENTATION                   │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 1: FOUNDATION & ONTOLOGY REFACTOR                                │
│ - Target: `game/js/plugins/DEUS_Levels.js`                             │
│ - Unify cell ontology across all 5 Z-levels.                           │
│ - Enforce solid volume invariant under Z0 hills during worldgen.       │
│ - Deliverables: `test_cell_ontology.js` + negative control mutants.    │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: EVENT-DRIVEN STRUCTURAL SUPPORT & COLLAPSE                    │
│ - Target: `game/js/plugins/DEUS_Levels.js` & `DEUS_Walls.js`           │
│ - Implement bounded BFS support check (maxHorizontalSpan per material).│
│ - Implement falling debris cascade and entity crushing damage.         │
│ - Deliverables: `test_structural_collapse.js`.                         │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: EXPLICIT CONSTRUCTIBLE ROOFS & DERIVED SHELTER               │
│ - Target: `game/js/plugins/DEUS_Floors.js` & `DEUS_Projects.js`        │
│ - Add Stage 5 (Roof Construction) to building project loop.            │
│ - Tie room shelter strictly to Z+1 roof slab coverage.                 │
│ - Deliverables: `test_explicit_roof_shelter.js`.                       │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: FLUID & FIRE STRUCTURAL INTEGRATION                           │
│ - Target: `game/js/plugins/DEUS_Fluid.js` & `DEUS_Fire.js`             │
│ - Water + Lava solid obsidian conversion reaction.                     │
│ - Fire burnout destroying timber supports and triggering collapse.     │
│ - Deliverables: `test_fluid_fire_hazards.js`.                          │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 5: AUTONOMOUS SETTLEMENT EXPANSION PARCELS                       │
│ - Target: `game/js/plugins/DEUS_Projects.js`                           │
│ - Autonomous dwelling siting and parcel reservation loop.              │
│ - Road connectivity generation.                                        │
│ - Deliverables: `test_settlement_expansion_multi_dwelling.js`.         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Section G: Decisions Resolved & Open Decisions

### Resolved by this Specification:
1. **Support Rule:** Direct vertical support for heavy mass; bounded lateral adjacency span ($S = 2\dots 5\ T$) for engineered slabs and rock ceilings; unsupported mass collapses immediately.
2. **Cell Ontology:** Orthogonal 6-layer stack (Shape, Material, Construction, Fluid, Hazard, Occupant) replaces primitive single-tile enums.
3. **Fluids:** Volumetric 0..7 depth overlay; fluids never replace underlying terrain; active dirty set eliminates full-world scans.
4. **Roofs:** Explicit physical horizontal slabs at $Z+1$; shelter is derived from coverage; roofs burn, take damage, and can collapse downward.
5. **Build Sequence:** 6-stage physical dependency graph (Clear $\to$ Floor $\to$ Walls $\to$ Doors $\to$ Roof $\to$ Interior Fittings).

### Open Decisions for Coordinator / User Confirmation:
1. **Water Freezing in Winter:** Should shallow water (depth 1–2) physically freeze into walkable ice slabs during deep winter, or remain liquid with a cosmetic ice-edge decal?
2. **Mine Cart / Track Logistics:** Should heavy stone hauling require wooden track and ore cart construction for long subterranean mine shafts, or do wheelbarrows and colonist hauling suffice for Slice 1?
3. **Dynamic Cave-in Dust Duration:** When a collapse occurs, should the blinding dust cloud persist for 10 seconds (blocking vision and causing coughing), or settle immediately?
