# DEUS — World-Cell Stack, Structural Support & Volumetric Terrain Architecture
**Document ID:** `DEUS-SYS-STRUCT-01`  
**Status:** Authoritative Architecture Standard (Frozen System Model V1)  
**Authority:** Gemini (Full-Stack Coordinator & Art Authority) & Fable / Claude Code (Engine Authority)  
**Applicability:** `DEUS_Levels.js`, `DEUS_WorldGen.js`, `DEUS_Walls.js`, `DEUS_Floors.js`, `DEUS_Fluid.js`, `DEUS_Fire.js`, and all art generation pipelines  

---

## 1. Executive Summary & Core Principle

$$\textbf{Terrain rendering, digging, building, liquids, Z-levels, collapse, and art generation}$$
$$\textbf{depend on the exact same physical world model.}$$

In Project DEUS, a world cell is **never** merely "this tile is grass" or "this tile is wall." Instead, every $(x, y, z)$ coordinate in the simulated world is an ordered stack of orthogonal physical layers.

Water and lava are **one kind of layer** (`FLUID`). Walls, floors, slabs, caves, and natural geology require a **deeper structural layer model** underneath them.

---

## 2. The DEUS World-Cell Stack

Every $(x, y, z)$ location in the world comprises the following eight-layer stack (evaluated from top/sky to bottom/ground):

```text
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 1. VFX / TRANSIENT                                                     │
  │    Fire flames, smoke columns, sparks, spell auras, falling dust.      │
  ├────────────────────────────────────────────────────────────────────────┤
  │ 2. CONDITION / DECAL                                                   │
  │    Blood spatters, soot, wetness, moss, scorch marks, ash, snow.       │
  ├────────────────────────────────────────────────────────────────────────┤
  │ 3. FLUID                                                               │
  │    Water, lava, brine, contaminated runoff. Depth 0–7, flow state.     │
  │    (Fluids occupy OPEN space; they do NOT replace underlying terrain). │
  ├────────────────────────────────────────────────────────────────────────┤
  │ 4. OBJECT / ENTITY                                                     │
  │    Colonists, wildlife, monsters, trees, loose items, corpses,         │
  │    furniture, chests, anvils, looms.                                   │
  ├────────────────────────────────────────────────────────────────────────┤
  │ 5. CONSTRUCTION                                                        │
  │    Constructed walls, floor slabs, roofs, bridges, stairs, ramps,      │
  │    doors, barricades, scaffolding, mine support beams.                 │
  ├────────────────────────────────────────────────────────────────────────┤
  │ 6. SURFACE / FINISH                                                    │
  │    Living grass turf, road gravel, stone paving, wooden floorboards,   │
  │    plaster finish, roof shingles, loam.                                │
  ├────────────────────────────────────────────────────────────────────────┤
  │ 7. STRUCTURAL VOLUME                                                   │
  │    AIR (open room/sky), SOIL, SOLID NATURAL STONE (granite/limestone), │
  │    CONSTRUCTED SOLID (hearth masonry, pillar).                         │
  ├────────────────────────────────────────────────────────────────────────┤
  │ 8. LOWER Z CONNECTIVITY                                                │
  │    Physical foundation, ceiling of the room below, or vertical shaft.  │
  └────────────────────────────────────────────────────────────────────────┘
```

### Layer Interaction Examples:

#### A. Standard Grass Field ($Z0$)
- `fluid`: `none` (depth 0)
- `object`: `none`
- `construction`: `none`
- `surface`: `grass`
- `structural volume`: `soil` (or solid bedrock)

#### B. Flooded Stream Meadow ($Z0$)
- `fluid`: `water` (depth 3, flow vector $[1, 0]$)
- `object`: `none`
- `construction`: `none`
- `surface`: `grass` (submerged)
- `structural volume`: `soil`

#### C. Second-Story Wooden Bedroom ($Z+1$ over $Z0$)
- **At $Z+1$**:
  - `object`: `bed_wood` (sleeping colonist)
  - `construction`: `horizontal_slab` (`material: timber`)
  - `surface`: `wood_floor_finish`
  - `structural volume`: `open_air`
- **At $Z0$ (Room Below)**:
  - `structural volume`: `open_air` (living room / kitchen)
  - `ceiling`: supported horizontal slab of $Z+1$ overhead

$$\textbf{Solid Volume vs. Horizontal Slab:}$$
A **Solid Volume** fills the entire vertical height of the cell, blocking horizontal passage and fluid flow. A **Horizontal Slab** is a walkable floor plane at elevation $Z$ that spans an open, walkable room volume at $Z-1$ below.

---

## 3. Walls in the Structural Model

A wall is **not** an arbitrary painted tile graphic. A wall is a physical entity:

```text
wall_state = {
    geometry:     SOLID_WALL,
    material:     "stone" | "timber" | "brick" | "granite",
    finish:       "rough_masonry" | "hewn_logs" | "dressed_ashlar",
    condition:    "pristine" | "cracked" | "scorched" | "wet",
    exposedFaces: derivedFromNeighbors(x, y, z)
}
```

### Exposed Face Derivation:
```text
            OPEN
  SOLID  [ WALL ]  SOLID
            OPEN
```
The renderer evaluates orthogonal neighbors to determine which faces are visible:
- North neighbor is `OPEN` $\longrightarrow$ North wall face (if viewed from north).
- South neighbor is `OPEN` $\longrightarrow$ South wall front face (48px lower portion).
- West neighbor is `SOLID` $\longrightarrow$ West interior seam hidden.
- Top Cap $\longrightarrow$ Upper 48px cap (rendered according to architecture standard).

### Material Kit Generation Principle:
Nano Banana Pro is prompted to produce **material kits**, not disconnected individual wall tiles. For each structural material (e.g. `granite`, `timber`, `rough_stone`), the kit defines:
1. Horizontal walkable surface
2. Vertical wall front face
3. Wall-top / cap transition
4. Inside and outside corners
5. Ramp / slope transition
6. Rubble and debris pile
7. Cracked / damaged overlay
8. Wet and soot/scorch condition overlays

---

## 4. Natural Elevated Terrain: The Solid Volume Invariant

$$\textbf{INVARIANT: Natural elevated terrain begins life as a filled, solid volume.}$$

Upper natural terrain **never begins life floating**:
- If natural terrain surface is at $Z+2$:
  - $Z+2$: Exposed surface plane (grass/snow)
  - $Z+1$: **SOLID** geological rock/soil mass
  - $Z0$: **SOLID** geological rock/soil mass
- If natural terrain surface is at $Z+1$:
  - $Z+2$: `OPEN_AIR`
  - $Z+1$: Exposed surface plane
  - $Z0$: **SOLID** geological rock/soil mass

Caves, mines, tunnels, and blast craters create empty space **after** the solid mass exists. This guarantees that mountains and plateaus represent true physical mass that can be excavated, tunneled into, or collapsed.

---

## 5. Structural Support V1 & Undermining Mechanics

$$\textbf{Removing direct support does NOT automatically destroy everything above.}$$
$$\textbf{It triggers an event-driven structural support evaluation.}$$

When a miner or explosive removes $Z0$ from beneath a natural rock column ($Z+2, Z+1, Z0$):
```text
  BEFORE MINING:                   AFTER MINING Z0:
  Z+2  [ SOLID ROCK ]              Z+2  [ SOLID ROCK ]
  Z+1  [ SOLID ROCK ]              Z+1  [ SOLID ROCK ]   <- Re-evaluated for support!
  Z0   [ SOLID ROCK ]              Z0   [ OPEN AIR   ]
```

### The Two Modes of Support:
1. **Direct Vertical Support**: The cell directly underneath ($Z-1$) contains a `SOLID_VOLUME`, load-bearing wall, or pillar. (Maximum support strength).
2. **Lateral / Spanning Support**: The cell is connected horizontally to adjacent cells that have direct vertical support, forming an arch, ceiling, or cantilevered slab within the material's **Maximum Horizontal Span** (`maxHorizontalSpan`).

```text
  CASE A: VALID LATERAL SUPPORT (CAVE / TUNNEL FORMED)
  Z+2      █████████████           <- Supported by Z+1
  Z+1    █████████████████         <- Supported laterally by nearby solid rock walls
  Z0     ███   OPEN   ███          <- Excavated passage
  Result: Stable cave ceiling. Nothing collapses.

  CASE B: ISOLATED / OVER-SPANNED (COLLAPSE TRIGGERED)
  Z+2          ███                 <- Lost support from Z+1
  Z+1          ███                 <- Unsupported span exceeded! UNSTABLE!
  Z0           AIR
  Result: Z+1 collapses downward into Z0; Z+2 follows in upward dependency cascade.
```

---

## 6. Material Support & Span Properties

Support strength is parameterized per material rather than simulated via expensive finite-element math:

| Material | Support Strength | Max Horizontal Span | Collapse Behavior | Resulting Debris |
|---|---|---|---|---|
| **Sand / Loose Soil** | Negligible | $0\ T$ (collapses immediately) | Granular slide downward | Soil mound, loose dirt |
| **Cohesive Soil / Clay**| Low | $1\ T$ | Clod fall, dust puff | Packed soil clods |
| **Natural Granite / Rock**| Very High | $3 \dots 4\ T$ | Brittle fracture, heavy impact | Rock rubble, boulders, dust |
| **Constructed Stone Masonry**| High | $2 \dots 3\ T$ | Block separation, masonry fall | Stone blocks, chipped mortar |
| **Timber Beams / Floor**| Moderate | $3 \dots 5\ T$ (engineered) | Splintering, snapping | Timber planks, splintered logs |
| **Mine Support Prop (Wood)**| High (Vertical) | Transmits vertical load to $Z0$ | Buckles when overloaded | Broken timber posts |

---

## 7. Collapse Mechanics & Physical Consequences

$$\textbf{Upper tiles NEVER vanish into thin air. Material is physically conserved.}$$

When structural support fails, the collapse propagates downward with real physical and simulation consequences:

```
  STEP 1: SUPPORT FAILURE
  Cell at (x, y, z) detected as UNSTABLE.
                    ↓
  STEP 2: PHYSICAL TRANSFORMATION & FALL
  Cell geometry converts to falling debris (rubble / soil / splintered timber).
  Falling mass descends to the lowest open cell below.
                    ↓
  STEP 3: IMPACT & HAZARDS
  - Creatures underneath suffer Falling Object Damage (SRD 5.1 bludgeoning dice).
  - Standing creatures above transition to CHARART `FALL` / `LAND` action states.
  - Placed objects/furniture underneath are crushed or buried.
                    ↓
  STEP 4: DEBRIS SETTLING & TERRAIN MUTATION
  Destination cell receives rubble/debris obstacle (blocks movement or becomes difficult terrain).
  Original upper cell becomes `OPEN_AIR`.
                    ↓
  STEP 5: UPWARD CASCADE EVALUATION
  Cells above (z+1, z+2) that depended on the collapsed cell are queued for support evaluation.
```

---

## 8. Fluid Interaction with Structural Geometry

Fluids and structural geometry maintain strict layer boundaries:
- **Fluids occupy `OPEN` space**; they cannot enter `SOLID` rock or constructed walls.
- When a wall or rock barrier is mined, breached, or collapsed, the geometry mutation fires `world:geometryChanged`.
- The fluid system (`UF.Fluid` / `DEUS.Fluid`) wakes up, detects the newly opened cells, and executes gravity cascades and lateral flow.
- Collapses can bury waterways, block channels, redirect rivers, or breach underground reservoirs.

---

## 9. Performance: Event-Driven Support Recalculation

$$\textbf{Stable state costs zero CPU cycles. Change creates work.}$$

The engine **never scans all five levels every frame** to test for collapse. Support recalculation is strictly event-driven:

```text
  Dig / Build / Blast / Fire Damage
                ↓
  Geometry Mutation at (x, y, z)
                ↓
  Emit `world:geometryChanged`
                ↓
  Wake Local Support Queue (cells above + laterally connected within maxSpan)
                ↓
  Evaluate Support Connectivity
                ↓
  Execute Collapse (if unstable) → Wake Fluids & Pathfinding
```

If nobody digs, builds, or blasts, **structural support CPU overhead is 0.00%**.

---

## 10. The Ten Frozen World Rules

1. **Natural elevated terrain starts as filled solid volume.** No generated upper terrain floats in air.
2. **Walls, floors, roofs, bridges, ramps, and natural terrain share a common structural-support authority.**
3. **Solid volume and horizontal slabs are distinct physical concepts.**
4. **Removing direct support triggers support evaluation, NOT automatic destruction.**
5. **Lateral support permits caves, rooms, bridges, and floors within material-dependent spans.**
6. **Unsupported structures collapse downward into physical debris, never vanishing.**
7. **Support recalculation is event-driven, never globally simulated per frame.**
8. **Fluids occupy open volume and respond to geometry changes; fluids do not replace underlying terrain.**
9. **Rendering derives visible surfaces and faces from structural geometry + material + overlays.**
10. **The same structural model governs digging, construction, mining props, blasting, fire damage, caves, and collapse.**
