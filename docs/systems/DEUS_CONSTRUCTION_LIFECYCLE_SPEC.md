# DEUS — Universal Construction Lifecycle Specification
**Document ID:** `DEUS-SYS-CONST-01`  
**Status:** Authoritative Construction Lifecycle Standard  
**Authority:** Gemini (Full-Stack Coordinator & Art Authority) & Fable / Claude Code (Engine Authority)  
**Applicability:** `DEUS_Projects.js`, `DEUS_Jobs.js`, `DEUS_Walls.js`, `DEUS_Floors.js`, `DEUS_Colonists.js`, `DEUS_BuildingGrammar.md`, and all player designation systems.

---

## 1. Executive Summary & Core Law

$$\textbf{Nothing appears simply because the player or AI decided it should exist.}$$
$$\textbf{First the world contains an intention; then it contains a construction site; only then does it contain the thing.}$$

In Project DEUS, every buildable physical element—from an individual wall segment, floor tile, roof slab, door, bed, and forge to an entire civic settlement—adheres to a **Universal Construction Lifecycle**:

$$\mathbf{Intent\ to\ Build\ (PLANNED) \longrightarrow Under\ Construction\ (BUILDING) \longrightarrow Completed\ Construction\ (COMPLETE)}$$

### Key Architectural Pillars:
1. **Universal Application:** Applies to *every* individually constructible entity (walls, floors, roofs, stairs, ramps, bridges, pillars, doors, furniture, containers, workshops, fences, and roads).
2. **Component-Based Architecture:** A "building" is never a monolithic single object; it is an aggregated collection of discrete, constructible components.
3. **Strict Physical Logistics:** Materials are never subtracted from an abstract bank counter. Physical logs, stone blocks, and thatch bundles are reserved in stockpiles, hauled to the construction site, visibly staged, and consumed by worker labor.
4. **Deterministic Structural Physics:** Unfinished components provide **zero structural support** and **zero functional benefits** (an unfinished wall provides no support or cover; an unfinished roof provides no shelter; an unfinished bed cannot be slept in).
5. **Player & AI Parity:** Player designations and autonomous colony AI use the exact same lifecycle, jobs, and visual presentation. Only historical simulation uses coarse past materialization.

---

## 2. The Universal Lifecycle States

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   UNIVERSAL CONSTRUCTION STATE MACHINE                 │
├────────────────────────────────────────────────────────────────────────┤
│ 1. PLANNED (Intent to Build):                                          │
│    - Blueprint / ghost designation placed on grid.                     │
│    - Footprint reserved; prevents conflicting designations.            │
│    - Physical material requirements calculated; hauling jobs posted.   │
│    - Collision: NONE (entities walk through freely).                   │
│    - Support: ZERO. Functionality: ZERO.                               │
│    - Cancellation: 100% free; blueprint cleared; reservations dropped. │
├────────────────────────────────────────────────────────────────────────┤
│ 2. MATERIAL_READY (Internal State - Staged for Labor):                 │
│    - 100% of required physical materials delivered to site footprint.  │
│    - Materials visible as physical piles (logs, stone, thatch).        │
│    - Construction labor jobs unlocked for workers.                     │
├────────────────────────────────────────────────────────────────────────┤
│ 3. BUILDING (Under Construction, progress: 0.01 .. 0.99):             │
│    - Workers perform tactile construction animations (hammer, saw).    │
│    - Warcraft-style visual framing / scaffolding appears.              │
│    - Materials visibly consumed as progress bar advances.              │
│    - Collision: Configurable (`NONE`, `SOFT`, `BLOCKING`).             │
│    - Support: ZERO. Functionality: ZERO.                               │
│    - Vulnerability: Can be damaged, burned, interrupted, or rained on. │
│    - Cancellation: Dismantling labor required; salvage drops as items. │
├────────────────────────────────────────────────────────────────────────┤
│ 4. COMPLETE (Authoritative Finished Entity):                           │
│    - Progress reaches 100%; materials fully consumed.                  │
│    - Scaffolding disappears; finished authoritative asset renders.     │
│    - Full physical activation: enters support graph, blocks LOS/path,  │
│      provides shelter, accepts crafting jobs, stores items.            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Post-Completion Physical Condition Lifecycle

Once completed, an object's operational life transitions from the **Construction Lifecycle** to the **Physical Condition Lifecycle**:

```text
  [COMPLETE: 100% HP]
          │
          ▼  Combat, fire, weathering, structural overload
  [DAMAGED: 25% - 75% HP]
  - Chipped stone, cracked timber, missing thatch clumps.
  - Still functional, but reduced defense and structural stability.
  - Generates REPAIR maintenance jobs (requires small material patch).
          │
          ▼  Structural failure / HP reaches 0
  [RUINED / COLLAPSED: 0% HP]
  - Breached walls, collapsed roof beams, crushed furniture.
  - Loses all functional shelter, support, and utility.
  - Generates CLEAR RUBBLE salvage jobs.
          │
          ▼  Player / AI Deconstruction
  [DEMOLISHED]
  - Deconstruction labor cleanly disassembles structure; yields salvage.
```

---

## 4. Buildings are Derived Collections of Components

$$\textbf{A building is an assembly of parts, not a single monolithic box.}$$

A house or communal hall is modeled as a composite project managing individual component records:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   HOUSEHOLD COTTAGE PROJECT MANIFEST                   │
├────────────────────────────────────────────────────────────────────────┤
│ Component Key      │ Coordinate │ Material   │ Lifecycle State         │
├────────────────────┼────────────┼────────────┼─────────────────────────┤
│ `floor_01..16`     │ Z0 cells   │ Timber     │ COMPLETE (16/16)        │
│ `wall_perimeter`   │ Z0 cells   │ Stone/Wood │ COMPLETE (12/12)        │
│ `door_entry`       │ (12, 18, 0)│ Hewn Oak   │ COMPLETE (1/1)          │
│ `support_post_01`  │ (10, 16, 0)│ Pine Log   │ COMPLETE (1/1)          │
│ `roof_slab_01..08` │ Z+1 cells  │ Shingle    │ BUILDING (3/8 COMPLETE) │
│ `kitchen_hearth`   │ (10, 15, 0)│ Fieldstone │ PLANNED (Hauling wood)  │
│ `bed_straw_01..03` │ Z0 cells   │ Straw/Wool │ PLANNED (Waiting roof)  │
└────────────────────┴────────────┴────────────┴─────────────────────────┘
```

### Derived Settlement Contracts:
The settlement planner (`DEUS_Projects.js`) queries aggregated component status:
- **Walls Complete:** $100\%$ ($12/12$).
- **Door Complete:** $100\%$ ($1/1$).
- **Roof Coverage:** $37.5\%$ ($3/8$).
- **Shelter Contract:** **`UNSHELTERED`** (Requires $100\%$ roof coverage over interior floor).
- **Usable Beds:** $0/3$ (Beds are `PLANNED` and cannot be constructed until roof is sealed).

```text
  [COMMENCING BUILD]                [MID-CONSTRUCTION]               [COMPLETED COTTAGE]
  
     □ □ □ □ □                         ■ ■ ■ ■ ■                         ■ ■ ■ ■ ■
     □ . . . □                         ■ ▨ ▨ . ■                         ■ ▣ ▣ ▣ ■
     □ . H . □                         ■ . H . ■                         ■ . H . ■
     □ . . . □                         ■ . . . ■                         ■ ▣ ▣ . ■
     □ □ D □ □                         ■ ■ D ■ ■                         ■ ■ D ■ ■
  All PLANNED (Ghost)               Walls Done, Roof 50%              100% COMPLETE & Sheltered
```

---

## 5. Physical Logistics & Material Staging

DEUS preserves authentic simulation logistics. Construction is grounded in real hauling:

```text
  [INTENT PLACED: PLANNED]
  Blueprint requires: 12 Oak Logs, 6 Fieldstone, 8 Thatch Bundles.
                 │
                 ▼
  [RESERVATION & DISPATCH]
  Settlement stockpiles reserve matching physical item stacks.
  Hauler peons assigned open `haul_to_site` jobs.
                 │
                 ▼
  [SITE STAGING]
  Haulers deposit items into the construction site footprint.
  Items visually render as stacked materials on site:
  - Logs stacked in neat piles ($16\times 16\text{ px}$).
  - Stone blocks arranged in pallets.
  - Bundles of thatch leaning against posts.
                 │
                 ▼
  [TRANSITION TO MATERIAL_READY]
  All 26 required items present on site.
  Scheduler transitions component from `PLANNED` to `MATERIAL_READY`.
                 │
                 ▼
  [CONSTRUCTION LABOR]
  Builders take `build_component` jobs.
  Workers swing hammers / pull saws.
  Materials are consumed one-by-one as progress increases:
  Progress = 25% -> 3 Logs consumed into frame.
  Progress = 50% -> 6 Logs consumed into walls.
  Progress = 100% -> All materials incorporated into finished structure.
```

---

## 6. Construction Collision & Passability Standard

To ensure workers can access sites without getting trapped, components declare explicit `constructionCollision` policies:

| Component Type | Planned Collision | Building Collision | Complete Collision | Rationale |
|---|---|---|---|---|
| **Floor / Sub-slab** | `NONE` | `NONE` | `NONE` | Walkable at all times; provides footing. |
| **Interior Furniture (Bed, Table)** | `NONE` | `SOFT` ($0.8\times$ speed) | `BLOCKING` / `USABLE` | Workers walk through/past while assembling. |
| **Roof Slab ($Z+1$)** | `NONE` | `NONE` (at $Z0$) | `NONE` (at $Z0$) | Built overhead; does not obstruct ground floor. |
| **Vertical Wall Segment** | `NONE` | `SOFT` ($0.5\times$ speed) | `BLOCKING` | Allows worker access until final closure. |
| **Heavy Stone Foundation** | `NONE` | `BLOCKING` | `BLOCKING` | Excavated trench; workers build from perimeter. |
| **Doorway Portal** | `NONE` | `NONE` | `PASSABLE` (Open) / `BLOCKING` (Closed) | Retains pedestrian access into interior. |

---

## 7. Structural Dependency & Physics Integration

$$\textbf{RULE: An upper component cannot be built until its lower support is COMPLETE.}$$

The project scheduler (`DEUS_Projects.js`) enforces strict construction dependencies:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   PHYSICAL DEPENDENCY GRAPH                            │
├────────────────────────────────────────────────────────────────────────┤
│ Component Type     │ Strict Pre-requisites to begin BUILDING           │
├────────────────────┼───────────────────────────────────────────────────┤
│ Foundation / Floor │ Cleared site ground (no trees, boulders, debris). │
│ Vertical Wall      │ Completed foundation or solid ground beneath.     │
│ Door / Window      │ Completed adjacent flanking wall posts.           │
│ Tie-Beams / Posts  │ Completed load-bearing walls beneath.             │
│ Roof Slab ($Z+1$)  │ Completed supporting walls within maxSpan.        │
│ Upper Floor ($Z+1$)│ Completed load-bearing walls/pillars on Z0.       │
│ Upper Wall ($Z+1$) │ Completed upper floor slab beneath on Z+1.        │
│ Interior Hearth    │ Completed floor + clearance from wooden walls.    │
│ Interior Bed       │ Completed floor (and sheltered roof preference).  │
└────────────────────┴───────────────────────────────────────────────────┘
```

- **Zero Support from Incomplete Structures:** A wall in `BUILDING` state has 0 support strength. Roof slabs cannot begin construction above an incomplete wall.
- **Fire & Structural Vulnerability:** If a wooden wall frame under construction catches fire, it burns rapidly ($100\%$ flammability) and collapses into charcoal embers, halting construction.

---

## 8. Cancellation & Demolition Mechanics

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   CANCELLATION & SALVAGE POLICIES                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. CANCEL PLANNED:                                                     │
│    - Free, instantaneous, zero waste.                                  │
│    - Blueprint ghost removed from map.                                 │
│    - Reserved items in stockpiles released for general use.            │
│    - Any items already delivered to site footprint remain as loose     │
│      items on ground, generating hauling jobs back to stockpiles.      │
├────────────────────────────────────────────────────────────────────────┤
│ 2. CANCEL BUILDING:                                                    │
│    - Construction site halts immediately.                              │
│    - Dismantling job posted: Workers disassemble scaffolding.          │
│    - Salvage Yield: 100% of unconsumed materials + 50-75% of consumed  │
│      materials recovered as raw resources (logs, stone, thatch).       │
├────────────────────────────────────────────────────────────────────────┤
│ 3. DEMOLISH COMPLETE:                                                  │
│    - Player / AI marks structure with `DEMOLISH` designation.          │
│    - Requires physical demolition labor (pickaxes, crowbars).          │
│    - Structural collapse rules apply! Demolishing a load-bearing wall  │
│      without shoring will trigger collapse of overhead roof slabs.     │
│    - Salvage Yield: 50% of original materials recovered.               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Building Grammar Integration

Procedural Building Grammar does **not** inject finished structures directly into the simulation:
1. **Grammar Emits Plans:** When a household or faction requires a building, the grammar generates a **Component Construction Plan** (a manifest of `PLANNED` components tailored to local terrain, roads, and racial style).
2. **Live Simulation Builds the Plan:** Autonomous peons haul physical materials and construct the components in dependency order.
3. **Historical Simulation Exception:** Only the coarse world-history generator (Year 0–250 historical generation) materializes finished structures directly, representing centuries of elapsed civilization before live gameplay commences.

---

## 10. Visual Presentation Standard for Construction

To deliver the tactile, satisfying Warcraft-like construction feel:

```text
  [PLANNED STATE (GHOST)]
  - Semi-transparent (35% alpha) white/cyan wireframe blueprint.
  - Dashed yellow boundary outlining the reserved footprint.
  - Hovering cursor reveals required materials: "Oak Logs: 4/12 · Stone: 0/6".

  [BUILDING STATE (ACTIVE SITE)]
  - Authentic 16-bit wooden scaffolding and timber bracing frames.
  - Visual staging piles: neatly stacked logs and stone blocks on site.
  - Animated worker sprites: Hammering, sawing, hauling (AR-600 action cycles).
  - Tactile progress visualization: Frame fills progressively from bottom to top.
  - Construction dust puffs and woodchip particles emitted on hammer strikes.

  [COMPLETE STATE (FINAL TRANSITION)]
  - Scaffolding drops away with a crisp settling dust puff.
  - Authentic finished 16-bit asset pops into authoritative place.
  - Satisfying audio cue: Deep stone thud or timber settling knock.
```

---

## 11. Engineering API Contract (`UF.Construction`)

```javascript
// --- Universal Construction API ---

// 1. Plan a new component or composite structure
UF.Construction.plan(area, x, y, z, componentType, options);
// Creates a PLANNED record, reserves footprint, calculates required materials.

// 2. Query component status
UF.Construction.get(area, x, y, z);
// Returns { id, state: "PLANNED"|"MATERIAL_READY"|"BUILDING"|"COMPLETE", progress: 0..1, materials, collision }

// 3. Deliver material to site
UF.Construction.deliverMaterial(componentId, itemStack);
// Stages physical item at site; if all materials present -> transitions to MATERIAL_READY.

// 4. Apply construction labor work
UF.Construction.work(componentId, workerUnit, workDelta);
// Advances progress; plays worker animation; if progress >= 1.0 -> calls complete().

// 5. Complete construction
UF.Construction.complete(componentId);
// Consumes materials, removes scaffolding, renders finished entity, enters support graph.

// 6. Cancel or Demolish
UF.Construction.cancel(componentId);
UF.Construction.demolish(componentId);
```
