# AI Architecture & Colonist Decision Engine (Project DEUS)

**Formal Document:** `docs/systems/AI_ARCHITECTURE.md`  
**System Owner:** Claude Code & Gemini  
**Applicability:** Colonist AI, Settler NPC AI, Wildlife & Threat AI  
**Status:** Living Design Specification (Updated 2026-09-20)

---

## 1. Executive Summary & Core Philosophy

In Project **DEUS**, colonists and autonomous settlers are not mere abstract sprites or code timers. They are living, physical inhabitants of a dynamic 2.5D simulation inspired by *Dwarf Fortress* and *Ultima VII*.

### Core Principles
1. **Every Act Is a Physical Interaction**:
   - Zero telepathic building or instantaneous material consumption.
   - Every log, stone block, and fiber bundle must be physically harvested, hauled in hands or backpacks, and placed on-site over real labor frames.
2. **True Structural Enclosure**:
   - Colonists must understand **rooms and buildings**, not loose arrays of individual wall coordinates.
   - Buildings must progress logically: **Clear Foundation $\rightarrow$ Perimeter Walls with Door Opening $\rightarrow$ Floor & Hearth $\rightarrow$ Upper Roof Deck $\rightarrow$ Furnishings**.
3. **Vocational Specialization & Teamwork**:
   - Rather than 8 colonists all competing to chop the same tree or lay the same brick, colonists organize into complementary **Callings** (Builders, Woodcutters, Miners, Haulers, Cooks, Crafters) with coordinated site workflows.
4. **Circadian Rhythm & Social Cohesion**:
   - Daily life flows with the sun: morning work, noon gathering, afternoon labor, evening campfire socialization, and night rest in assigned beds.

---

## 2. Analysis of the Current Priority System

### Current 12-Tier Decision Loop (`UF_Colonists.js: decide(u)`)
Whenever an idle colonist requests a new task, the engine currently evaluates the following waterfall:

```
[1. Infant Check (age < 2)] ────► Idle / Inactive
       │
[2. Child Check (age < 15)] ────► Restricted to Needs, Home, Play
       │
[3. Family Rendezvous] ────────► Nightly Partner Mating
       │
[4. Settlement Pillars] ───────► Communal Meal Hour / Night Sentry Watch
       │
[5. Urgent Needs (needJob)] ───► Thirst (≥55) ──► Hunger (≥55) ──► Waste (≥65) ──► Sleep (≥75) ──► Social ──► Nature
       │
[6. Fire Safety] ──────────────► Respond to Fire / Extinguish
       │
[7. Household Needs] ──────────► Family Home Build / Homestead Repairs
       │
[8. Sanitation] ───────────────► Treat Sick / Clean Waste Pits
       │
[9. Player Designations] ──────► Open Drag-Box Mining, Chopping, Wall Orders
       │
[10. Agriculture] ─────────────► Till, Plant, Tend, Harvest Crops
       │
[11. Catalog Society Plan] ────► Static Plan Steps from UF_WorldCatalog.json (Shelter, Hearth, Beds)
       │
[12. Idle Routines] ───────────► Stroll (within 12 tiles), Explore (within 30 tiles), Speech Thoughts
```

### Why This System Produces Visual & Behavioral Flaws

1. **Disconnected Blueprint Steps (The "15-Wall Line" Problem)**:
   - In `UF_WorldCatalog.json`, the `shelter` plan step is defined simply as a list of static coordinate tuples:
     `cells: [[-2,2], [-1,2], [0,2], [1,2], [2,2], [-2,3], [2,3], [-2,4], [2,4], [-2,5], [-1,5], [1,5], [2,5]]`
   - The colonist AI evaluates this as 13 separate, independent wall jobs.
   - Colonists take whichever wall coordinate happens to be free without spatial coordination. If terrain, trees, water, or thirst interruptions occur, colonists build disjointed rows of walls or straight lines without ever enclosing a room.
2. **Debris Litter & Logistics Vacuum (The Purple Marker Problem)**:
   - When a tree is felled or a rock quarried, logs and stone chunks drop on the ground as physical items.
   - Because `haul` jobs are treated as low-priority sub-tasks or left until building materials are requested, loose items litter the building site indefinitely.
3. **Generalist Worker Chaos**:
   - Without assigned vocational callings, all 8 colonists simultaneously try to gather materials, start separate wall segments, or get thirsty at the same time.
   - Work is fragmented, and no single structure ever gets completed swiftly.
4. **History Generation vs. Live Play Disparity**:
   - `UF_History.js` (world generator) uses structured algorithmic geometry to place 7x7 communal lodges, 1-square separated private homes, and connecting roads.
   - `UF_Colonists.js` (live game loop at 1x–8x speed) relies on the primitive catalog step list, resulting in chaotic live colonies.

---

## 3. The New Unified AI Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DEUS COLONIST BRAIN                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    ▼                                                               ▼
┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
│       1. PHYSIOLOGICAL & SAFETY      │        │          2. SOCIAL & CIRCADIAN       │
│  - Acute Threat / Combat Flee / Fire │        │  - Night Rest & Wake Preference      │
│  - Critical Thirst (<20% hydration)  │        │  - Noon Communal Meal Gathering      │
│  - Starvation & Emergency Foraging   │        │  - Evening Campfire Storytelling     │
│  - Medical Treatment & Quarantine    │        │  - Family Courting & Partner Mating  │
└──────────────────┬───────────────────┘        └──────────────────┬───────────────────┘
                   │                                               │
                   └───────────────────────┬───────────────────────┘
                                           │
                                           ▼
                        ┌──────────────────────────────────────┐
                        │      3. VOCATIONAL ROLE ASSIGNMENT   │
                        │  Colonist Callings (Skill & Quota)   │
                        │  - Builders / Masons   (2)           │
                        │  - Woodcutters/Miners  (2)           │
                        │  - Haulers / Larder    (2)           │
                        │  - Forager / Farmer    (1)           │
                        │  - Artisan / Crafter   (1)           │
                        └──────────────────┬───────────────────┘
                                           │
                                           ▼
                        ┌──────────────────────────────────────┐
                        │     4. STRUCTURED SETTLEMENT PLANNER │
                        │  Adaptive Architectural Enclosure    │
                        │  - Phase 1: Site Survey & Clearing   │
                        │  - Phase 2: Perimeter Walls & Door   │
                        │  - Phase 3: Hearth & Flooring        │
                        │  - Phase 4: Z+1 Upper Roof Deck      │
                        │  - Phase 5: Furniture (Beds, Racks)  │
                        │  - Phase 6: Road/Trail Connection    │
                        └──────────────────┬───────────────────┘
                                           │
                                           ▼
                        ┌──────────────────────────────────────┐
                        │       5. CLEAN LOGISTICS PROTOCOL    │
                        │  - Designated Stockpiles First       │
                        │  - Clean Build Footprint Before Work │
                        │  - Coordinated Staging of Materials  │
                        └──────────────────────────────────────┘
```

---

## 4. Detailed Architectural Specifications

### Specification 1: Adaptive Architectural Construction Planner
Instead of reading hardcoded `[x, y]` coordinate offsets, settlements construct buildings via the **Architectural Construction Engine**:

1. **Founding Phase: 7x7 Communal Great Hall**:
   - Centered around the original faction focal fire at `(site.x, site.y)`.
   - Dimensions: $7 \times 7$ tiles (Interior: $5 \times 5$).
   - Perimeter: 24 wall tiles, with 1 South-facing doorway cell.
   - Interior:
     - Central focal campfire.
     - 8 straw/wood beds arranged along the East and West interior alcoves.
     - Timber or stone floor laid across all 25 interior tiles.
   - Enclosure Verification:
     - When all 24 perimeter wall/door tiles are standing, the structure triggers `UF_Floors.applyRoofedUpperDeck()`.
     - Cells on `z = 1` become a solid, walkable roof deck.
     - The interior receives `isRoofed = true`, shielding all 8 colonists from rain and dampness penalties.

2. **Growth Phase: Private Two-Room Homesteads**:
   - Built when founder couples partner up and prepare to move out.
   - Separation Rule: Enforces a strict buffer of **$\ge 1$ vacant tile** from all existing structures.
   - Layout: Two distinct rooms:
     - Room 1: Communal Living Room ($4 \times 4$ interior) with an exterior door and private indoor hearth.
     - Room 2: Master Bedroom ($3 \times 3$ interior) with an interior door and double bed.
   - Connecting Road: Paves a stone or gravel trail directly from the home's exterior door to the settlement road network and communal hall.

### Specification 2: Vocational Calling & Labor Quotas
Colonists allocate into dedicated **Callings** based on their highest skills and personality facets, preventing generalist chaos:

| Calling | Founder Quota (of 8) | Primary Responsibilities |
|---|:---:|---|
| **Architect / Builder** | 2 | Foundations, wall assembly, floor laying, roof decking, door installation |
| **Forester / Quarryman** | 2 | Tree felling, boulder quarrying, clay/ore extraction |
| **Quartermaster / Hauler** | 2 | Build site clearing, hauling resources to stockpiles, hauling materials to build staging |
| **Provisioner / Cook** | 1 | Crop tending, berry foraging, meat hunting, meal preparation at focal fire |
| **Artisan / Smith** | 1 | Tool forging (axes, picks, hammers), weapon crafting, clothing tailoring |

### Specification 3: Site Clearing & Logistics Protocol
Before a single wall piece is erected:
1. **Footprint Survey**: The bounding box of the planned structure $+ 1$ tile perimeter is scanned for obstacles.
2. **Debris Evacuation**:
   - Standing trees are marked for felling by the Forester.
   - Loose logs, stone chunks, sticks, and fibers are tagged with high-priority `haul` jobs by Haulers.
   - Items are hauled directly to designated stockpiles (Woodpile, Stone Depot, Larder).
3. **Material Staging**: Haulers bring the exact required quantity of building materials (e.g., 24 logs for perimeter walls) to a staging square next to the construction site before assembly begins.

### Specification 4: Circadian Rhythm & Campfire Culture
Colonists synchronize their daily schedules to create a living community:

- **06:00 – 07:00 (Dawn Awakening)**: Waking up, personal hygiene/relieve, breakfast at larder.
- **07:00 – 12:00 (Morning Labor Shift)**: Active calling tasks (logging, building, quarrying, crafting).
- **12:00 – 13:00 (Noon Communal Gathering)**: All colonists assemble at the focal campfire / Great Hall for a shared meal, chatting, and social need recovery.
- **13:00 – 18:00 (Afternoon Labor Shift)**: Site cleanup, construction, crop tending, tool maintenance.
- **18:00 – 21:00 (Evening Campfire & Culture)**: Communal dinner, instrument playing, storytelling, courting, and partner relationship building around the fire.
- **21:00 – 06:00 (Night Rest)**: Retreating to assigned private beds; sentry watches maintain perimeter vigilance.

---

## 5. Implementation & Migration Plan

1. **Step 1: Formal Documentation**: Commit `docs/systems/AI_ARCHITECTURE.md` into the DEUS project documentation repository.
2. **Step 2: Calling & Role Assignment Engine (`UF_Callings.js`)**: Implement vocational assignment logic and priority weighting so colonists focus on specialized tasks.
3. **Step 3: Adaptive Architectural Construction Engine (`UF_Construction.js`)**: Transition live construction from static catalog coordinate lists to autonomous 4-wall room enclosure with doorway, hearth, and roof deck integration.
4. **Step 4: Logistics & Site Clearing Protocol**: Introduce pre-construction site clearing so felled materials are neatly stockpiled rather than abandoned as ground clutter.
5. **Step 5: Verification & Acceptance**: Verify across automated unit tests (`node tools/run_tests.js colonists`, `setup`, `smoke`), 60 FPS performance benchmarks, and live in-engine screenshots of colonists building cohesive homes.

