# DEUS — RUNTIME PERFORMANCE ARCHITECTURE v1
**Authoritative Architectural Standard & Engineering Manual**
**Integration Authority:** Gemini / Antigravity (DEUS Coordinator)
**Approved by Owner Directive:** 2026-09-25

---

## 1. Canonical Principle

> **"DEUS spends runtime work in proportion to what can currently affect the player or simulation. Invisible, unchanged, dormant, unloaded, occluded, and irrelevant state should approach zero recurring CPU/GPU cost. Systems should be event-driven, spatially bounded, aggressively culled, lazily loaded, and measured against repeatable performance baselines."**

### Supporting Rules
1. **Do not load what is not needed:** Avoid eager initialization or loading of unrequested assets, catalogues, or scenes.
2. **Do not update what has not changed:** Static terrain, dormant actors, and undisturbed fluids must incur near-zero recurring update computation.
3. **Do not simulate inactive things at full frequency:** Remote entities and background systems simulate on tiered, event-driven cadences.
4. **Do not render what cannot contribute to the visible result:** Aggressively cull offscreen entities, occluded lower-Z geometry, and offscreen sprite animations.
5. **Do not repeatedly calculate answers that can safely be cached:** Derived exposure masks, topological connectivity, and minimap chunks belong in derived, invalidatable caches.
6. **Avoid unnecessary temporary allocations in frequently executed code:** Hot paths must eliminate GC pressure caused by temporary object literals, arrays, closures, and string concatenations.
7. **Measure performance before and after substantive changes:** Architectural and gameplay improvements must produce repeatable benchmark evidence.
8. **A feature that functions correctly but causes an unacceptable unexplained performance regression is not integration-ready:** Correctness and performance are co-equal acceptance gates.

---

## 2. Plain-Language Performance Terminology

For all contributors and stakeholders, performance discussions adhere to these plain-language definitions:

- **FRAME**: One single screen redraw. In DEUS, the screen redraws up to 60 times every second.
- **FRAME TIME**: How long the computer takes to compute and draw one single frame (measured in milliseconds, `ms`).
- **FPS (Frames Per Second)**: The number of full screen updates completed each second. 60 FPS is the locked target.
- **FRAME BUDGET**: At 60 FPS, the computer has exactly **16.67 milliseconds** to run all game logic, physics, entity AI, and rendering before the frame deadline.
- **HOT PATH**: A section of code that runs thousands or millions of times every frame or second (such as per-pixel rendering, per-cell raycasting, or coordinate lookups).
- **CULLING**: The practice of completely skipping the processing or drawing of things that the player cannot currently see.
- **CACHE**: A temporary memory shelf that saves the result of an expensive calculation so the game can reuse the answer instantly without recalculating it.
- **CACHE INVALIDATION**: The process of marking a cached answer as "stale" or "outdated" when the underlying world actually changes, forcing a recalculation only when next needed.
- **DIRTY REGION**: A localized bounding box or coordinate area marked as having changed, ensuring that only that specific small area is recomputed.
- **ACTIVE SET / ACTIVE QUEUE**: A tight list containing only the entities, fluid cells, or jobs that currently need active processing, ignoring the tens of thousands of dormant items.
- **LAZY LOADING**: Waiting to read a file, load an image, or initialize a database from disk until the exact moment it is first requested by the player.
- **ALLOCATION**: Asking the computer's operating system for new temporary memory (creating objects `{}`, arrays `[]`, or strings).
- **GARBAGE COLLECTION (GC)**: The automatic background janitor in JavaScript that halts or slows execution periodically to clean up discarded temporary allocations. Heavy allocations trigger GC "spikes" and visible micro-stutter.
- **PROFILING**: Using precision measurement tools to inspect where the computer's CPU, GPU, and RAM are actually spending time.
- **REGRESSION**: A code change that unintentionally makes existing game speed, frame rate, or memory consumption worse.

---

## 3. Performance Domains

DEUS isolates, benchmarks, and tracks performance across nine distinct domains. No domain's cost may be hidden inside another:

| Domain | Scope | Primary Metrics | Budget Target |
|---|---|---|---|
| **A. BOOT** | Process launch → Title screen display | Wall-clock time (ms), heap at title | `< 2,500 ms` |
| **B. NEW GAME** | Title click → Playable Year-0 world | WorldGen + levels + spawn time (ms) | `< 18,000 ms` |
| **C. LOAD** | Save slot selected → Playable map rendered | JSON parse + cache rebuild time (ms) | `< 1,500 ms` |
| **D. RENDER** | Drawing visible terrain, lower-Z, entities, UI | Draw calls, GPU fill-rate, frame ms | `< 6.0 ms / frame` |
| **E. SIMULATION** | Ticking AI, ecology, fluids, jobs, combat | Tick execution duration (ms) | `< 4.0 ms / frame` |
| **F. WORLDGEN** | Initial procedural world synthesis | Generation time per area, memory delta | `< 3,000 ms / area` |
| **G. MEMORY** | Runtime RAM, V8 heap, cached bitmaps | Working set size (MB), leak rate | `< 350 MB RAM` |
| **H. SAVE** | State capture → JSON disk persistence | Serialization duration (ms), save size | `< 300 ms`, `< 2 MB` |
| **I. SHIPPING FOOTPRINT**| Shipped game directory on disk | Shipped file size, asset count | Lean, zero orphan assets |

---

## 4. Active-Work Architecture (Event-Driven vs. Full Scans)

DEUS forbids recurring full-world scans. The runtime operates on a strict **Active-Work** pattern:

```text
[ WORLD MUTATION ]
        │
        ▼
[ Mark Local Region / Cell Dirty ]
        │
        ▼
[ Push to Bounded Active Queue ]
        │
        ▼
[ Process Bounded Work in Tick ]
        │
        ▼
[ Queue Empty → Dormant (0 recurring cost) ]
```

### Subsystem Operational Rules:
- **FLUID SIMULATION (`DEUS_Fluid.js`)**: Only cells with active fluid velocity, pressure gradients, or unfilled lower neighbors sit in the active tick queue. Settled lakes, calm rivers, and full aquifers consume **0 ms** of recurring simulation time.
- **STRATA & ELEVATION (`DEUS_Levels.js`)**: Static geological strata remain completely inert in memory (`Uint8Array`). Digging, collapsing, or cutting marks only the local $(x,y,z)$ column dirty.
- **STRUCTURAL SUPPORT (`DEUS_Walls.js`, `DEUS_Floors.js`)**: Roof and cave ceiling stability is recomputed only within the localized radius of a removed support or breached stratum.
- **MINIMAP (`DEUS_Minimap.js`)**: Minimap tiles are cached in chunk textures ($16 \times 16$ or $32 \times 32$). Only player discovery or terrain modification redraws the affected chunk.
- **DEPTH COMPOSITOR (`DEUS_Depth.js`)**: Exposure calculation runs only when camera viewport coordinates change or when local geometry is dug or built.
- **PATHFINDING (`DEUS_Spatial.js`, `DEUS_Jobs.js`)**: Path requests are bounded, queued, and amortized across frames. No actor re-plans an active path every frame.

---

## 5. Simulation Update Tiers

To support large-scale settlements and 1,000+ simulated entities, simulation frequency is decomposed into four dynamic tiers:

| Tier | Name | Target Population / Scope | Cadence | Characteristics |
|---|---|---|---|---|
| **TIER A** | **Visible / Engaged** | Screen viewport + 2-tile margin; actors in active combat or immediate player interaction | Every frame ($60\text{ Hz}$) | Full sensory checks, precise kinematics, real-time animation. |
| **TIER B** | **Nearby / Relevant** | Current settlement active working radius ($\le 48$ tiles from camera) | Staggered ($15\text{–}20\text{ Hz}$) | Job execution, path following, localized needs evaluation. |
| **TIER C** | **Remote** | Offscreen entities in loaded active areas | Low frequency ($1\text{–}2\text{ Hz}$) | Coarse movement, statistical production, macro task progression. |
| **TIER D** | **Dormant / Stable** | Distant wildlife, sleeping colonists, settled resources, deep underground | Event-driven ($\sim 0\text{ Hz}$) | Awoken only by proximity, alarms, schedule triggers, or area events. |

> **Conservation Invariant:** Lower simulation frequencies must **never** alter authoritative simulation outcomes. Systems operating on reduced tiers accumulate elapsed physical time ($\Delta t$) and resolve state changes mathematically rather than dropping calculations.

---

## 6. Rendering Architecture & Five-Z Depth

Rendering computational cost must scale strictly with **Visible / Exposed Screen Content**, never with Total World Size.

### Core Rendering Rules:
1. **Viewport Culling**: Sprites outside the camera viewport (+ 2 tile padding) are culled before matrix transforms, texture binds, or draw calls.
2. **Entity Culling**: Hidden, underground, or occluded actors are excluded from the render list.
3. **Five-Z Layer Culling**:
   - When the camera is at $Z=0$ and no holes, cuts, or ravines exist: **0 lower levels are drawn** (zero overhead for $Z=-1, Z=-2$).
   - When a partial ravine exposes $Z=-1$: **Only the clipped bounding region** of $Z=-1$ is rendered.
   - When a deep chasm exposes $Z=-2$: **Only the clipped pixels** of $Z=-2$ are drawn.
   - **Hard Rule**: The renderer *never* renders five complete maps and layers them over each other.
4. **No Full-Map Canvas Bitmaps**: Never allocate full-map ($256 \times 256$ tile = $12288 \times 12288\text{ px}$) render targets. All visual surfaces use tiled chunk bitmaps or direct WebGL sprites.
5. **Production Blur Disabled**: Dynamic canvas blur filters remain strictly OFF in production builds due to massive mobile/integrated GPU fill-rate penalties.

---

## 7. Animation Performance & Metadata

Visual animation must originate strictly from sprite sheets (Rule 12), but offscreen animation must incur near-zero computational cost.

### Animation Governance:
- **Global Frame Master**: Animated environmental decorations (water waves, wind-blown grass, torch flames) do not run per-sprite update timers. They read from a single, shared global tick counter (`$deusAnimationMaster.frame3`).
- **Offscreen Suppression**: Sprites outside the camera viewport suspend texture swapping and matrix updates completely.
- **Catalogue Animation Metadata**:
  ```json
  {
    "animated": true,
    "frameCount": 3,
    "animationFamily": "flora_wind_sway",
    "phaseSeed": 42,
    "visibilityState": "cullable"
  }
  ```
- **Phase Desynchronization**: Flora and ripples apply deterministic phase offsets derived from their spatial coordinate hash, creating natural visual waves across forests without independent timer objects.

---

## 8. Cache Architecture & Invalidation

Caches are essential for high-performance 60 FPS gameplay, but **caches must remain strictly derived and never authoritative**:

1. **One Source of Truth**: The raw physical world (strata typed arrays, entity registries) is authoritative.
2. **Derived and Discardable**: Any cache (exposure mask, walkable graph, lightmap, minimap chunk) can be purged from memory at any moment and rebuilt bit-for-bit from authoritative state.
3. **Local Invalidation**: When an authoring event occurs (e.g. colonist cuts down an oak tree):
   - Invalidate only the spatial grid bucket for that cell.
   - Mark the containing minimap chunk dirty.
   - Do *not* purge or rebuild the global world cache.
4. **Save Hygiene**: **Never serialize caches into save files.** Saves store truth only. Caches are lazily rebuilt upon loading.

---

## 9. Hot-Path Allocation Rule (Zero-Garbage Principle)

Hot paths (methods called $\ge 1,000$ times per frame or in tight loops over entities/tiles) must generate **zero temporary memory allocations**:

### Forbidden in Hot Paths:
- Object literal creation (`{ x, y }`, `{ r, g, b }`)
- Dynamic array allocations (`[]`, `new Array()`, `.push()` in loops)
- Functional iterator closures (`.map()`, `.filter()`, `.forEach()`, `.reduce()`)
- String concatenation or template literals (`"cell_" + x + "_" + y`)
- Regular expression evaluation or JSON serialization
- Coordinate sorting without in-place indexed arrays

### Approved High-Performance Patterns:
- **Typed Arrays**: `Uint8Array`, `Int32Array`, `Float32Array` for grid storage.
- **Numeric Spatial Keys**: Pack $(x, y, z)$ into a single 32-bit integer: `(z << 20) | (y << 10) | x`.
- **Preallocated Scratch Objects**: Shared module-level scratch structs reused across sequential queries.
- **Direct Primitive For-Loops**: `for (let i = 0; i < len; i++)` avoiding function call overhead.

---

## 10. Loading Architecture & Closed-World Integration

DEUS integrates performance with the **Closed-World Runtime Directive**:
- **Demand-Driven Loading**: Assets load when required. The engine does not preload future or unrequested biome packs.
- **Stock RMMZ Asset Pruning**: Unused RPG Maker default audio, animations, side-view battlers, and titles are excluded from runtime loading.
- **Zero Orphan Database Queries**: Plugins do not load parallel JSON configuration files if the data belongs in `UF_WorldCatalog.json`.

---

## 11. Plugin Update-Hook Audit Framework

During the post-19B consolidation window, all plugin hooks extending core RMMZ update methods are audited and catalogued:

```text
Target Methods:
- Scene_Map.prototype.update
- Game_Map.prototype.update
- Spriteset_Map.prototype.update
- Sprite_Character.prototype.update
- SceneManager.updateScene
```

Each hook must document:
1. **Plugin Authority**: Which subsystem owns this tick?
2. **Frequency**: Does it need every-frame execution or can it run staggered?
3. **Conditionality**: Does it immediately exit if no relevant world change occurred?
4. **Allocations**: Does it allocate temporary objects during idle execution?

---

## 12. Performance Instrumentation (`tools/performance/`)

Development-only automated benchmarks provide repeatable profiling without polluting shipping builds:

- `tools/performance/bench_boot.js`: Measures clean process launch to title scene latency and baseline memory.
- `tools/performance/bench_worldgen.js`: Profiles New Game generation across canonical seeds (`18`, `20260923`).
- `tools/performance/bench_ticks.js`: Simulates 1,000 ticks across active scenarios and measures average, median, p95, and p99 frame times.
- `tools/performance/bench_allocations.js`: Uses Node's V8 heap profiler to count allocations per tick in hot paths.

---

## 13. Development Performance Overlay

Project DEUS provides an optional, lightweight development HUD (toggled via `F3` or diagnostic command):

```text
┌──────────────────────────────────────────────┐
│ DEUS PERF MONITOR (DEV BUILD)                │
│ FPS: 60.0 (16.2 ms)  [Median: 15.8  p99: 17.1]│
│ SIM:  3.2 ms | RENDER: 4.8 ms | GPU: 2.1 ms  │
│ ENTITIES: Active: 48 / Total: 412 (Cull: 364)│
│ FLUID: Active: 12 cells (Sleeping: 18,400)   │
│ Z-PLANES: Vis: [0, -1] | Exposure Rebuild: 0 │
│ HEAP: 112.4 MB (GC Latency: 4.1 ms)          │
└──────────────────────────────────────────────┘
```

*In production builds, the overlay code is completely stripped.*

---

## 14. Canonical Performance Benchmark Scenarios

Performance is evaluated against standardized test scenarios:

1. `PERF_QUIET_WORLD`: Freshly generated Year-0 temperate world, player character stationary, minimal wildlife. (Baseline idle cost).
2. `PERF_BUSY_SETTLEMENT`: 25 active colonists, multiple workstations, hauling tasks, farming, and active cooking.
3. `PERF_1000_CREATURE`: Long-term stress test with 1,000 simulated faction creatures across active and remote areas. (*Status: NOT_YET_AVAILABLE*).
4. `PERF_LARGE_COMBAT`: 40 active combatants engaged with tactical spells, melee, and ranged projectiles. (*Status: NOT_YET_AVAILABLE*).
5. `PERF_HEAVY_FLUID`: Breached aqueduct cascading water across 500 active fluid cells through natural caves.
6. `PERF_FIVE_Z_EXPOSURE`: Deep chasm exposing all five physical Z levels simultaneously on screen ($Z=+2$ down to $Z=-2$).
7. `PERF_ANIMATED_FOREST`: Dense temperate forest with 300+ visible wind-swayed trees, shrubs, and water ripples.
8. `PERF_SAVE_LOAD`: Mature settlement save serialization, compression, and rehydration verification.

---

## 15. Golden Performance Baselines

Baselines are versioned, repeatable, and locked to reference environments:

| Scenario | Version / Commit | Avg Frame Time | p99 Frame Time | Heap Usage | Status |
|---|---|---|---|---|---|
| `PERF_QUIET_WORLD` | Pre-Migration (`19fcf0e`) | 3.8 ms | 6.2 ms | 108 MB | Recorded |
| `PERF_HEAVY_FLUID` | WG.00.07 (`2f47203`) | 7.4 ms | 11.2 ms | 124 MB | Recorded |
| `PERF_FIVE_Z_EXPOSURE`| WG.00.08 Baseline | *Pending 19B Closeout* | - | - | Pending |
| `PERF_BUSY_SETTLEMENT`| Settlement Milestone | *Deferred* | - | - | Queued |

---

## 16. Development Reference Hardware Environment

Performance baselines must explicitly state the reference hardware environment to prevent misleading comparisons:

```text
Reference Platform:
- OS: Microsoft Windows 11 Home (x64)
- CPU: AMD Ryzen / Intel Core i7 Class Multi-Core Processor
- GPU: Dedicated Direct3D 11 / OpenGL Hardware Acceleration
- RAM: 16.0 GB Physical System Memory
- Storage: High-Speed NVMe SSD (Local Storage Target: C:\Dev\DEUS)
- Display Resolution: 1920 x 1080 (Game Viewport: 816 x 624 @ 1.00x)
- Runtime: NW.js v0.84+ / Chromium Engine / RMMZ Core 1.8.0
```

---

## 17. Frame Budget Allocation (60 FPS = 16.67 ms)

Provisional budget allocation across runtime subsystems:

```text
TOTAL AVAILABLE: 16.67 ms (100%)
├── RENDER (Terrain, Characters, UI): 6.00 ms (36%)
├── SIMULATION (AI, Jobs, Physics):   4.50 ms (27%)
├── FLUID & DYNAMICS:                 2.00 ms (12%)
├── ENGINE OVERHEAD & I/O:            1.50 ms (9%)
└── SAFETY SPIKE BUFFER:              2.67 ms (16%)
```

---

## 18. Frame-Time Spikes & Jitter Governance

Average FPS is an incomplete metric; visible micro-stutter destroys retro-CRPG immersion. The engineering standard tracks:
- **Average Frame Time**
- **Median Frame Time (p50)**
- **95th Percentile (p95)**
- **99th Percentile (p99)**: Must not exceed **16.67 ms** during standard gameplay.
- **Maximum Frame Spike**: Must not exceed **33.3 ms** ($30\text{ FPS}$ equivalent) during active play.

### Owner-Facing Reporting Translation:
- **Technical**: *"p99 increased 17.4% due to allocation pressure in path queries."*
- **Plain-Language**: *"Most frames are still running at full 60 FPS speed, but about 1 out of every 100 frames had a small stutter because the pathfinding system was creating too many temporary memory objects. We need to preallocate those objects to eliminate the stutter."*

---

## 19. Performance Regression Gate (CI & Acceptance)

Every performance-sensitive WBS leaf must declare:
```text
PERFORMANCE IMPACT: N/A | MEASURED
```
If **MEASURED**:
- Before and after timings must be recorded against a canonical scenario.
- Any regression $> 5\%$ requires Coordinator classification:
  - **A. Defect / Inefficiency**: `FIX_REQUIRED` back to implementer.
  - **B. Justified Tradeoff**: Documented architectural necessity approved by Owner/Coordinator.
  - **C. Measurement Noise**: Verification across 5 repeated runs.

---

## 20. Subsystem Performance Contracts

Each DEUS engine subsystem adheres to an architectural contract:

1. **`DEUS_Levels` / Strata**: Static geometry incurs **0 ms** recurring cost. Slice queries $\le 1\ \mu\text{s}$.
2. **`DEUS_Fluid`**: Settled fluid incurs **0 ms** recurring cost. Cost scales strictly with active cells.
3. **`DEUS_Depth`**: Renders only exposed viewport surfaces. 0 exposed planes = 0 lower-level draw calls.
4. **`DEUS_Colonists` / `DEUS_Wildlife`**: Offscreen entities operate on tiered/coarse simulation intervals.
5. **`DEUS_Visuals`**: Offscreen animated decorations are culled. Shared frame phase eliminates per-sprite logic.
6. **`DEUS_Minimap`**: Chunk-cached. Recomputed only on discovery or cell change.
7. **`DEUS_Items` / Stockpiles**: Spatial indexing for item queries. Zero full-world container scans per frame.

---

## 21. 1,000+ Creature Scaling Architecture

To support large-scale living worlds:
- **Spatial Partitioning**: Entities register in coarse spatial cells ($16 \times 16$ tiles).
- **Staggered Ticking**: Entities tick in interleaved round-robin batches rather than all 1,000 on the same frame.
- **Needs Evaluation**: Physiological needs (hunger, thirst, sleep) tick on minute/hour boundaries, not per frame.
- **Hierarchical Pathing**: Offscreen entities travel along abstract regional node graphs; precise A* pathing is reserved for visible local navigation.

---

## 22. Pathfinding Performance Standard

- **Topology Caching**: Walkable connection grids are precomputed and cached.
- **Bounded Searches**: Path searches are hard-capped at max iteration depths.
- **Path Reuse**: Entities follow existing path corridors until obstructed.
- **Asynchronous Time-Slicing**: Long paths compute across multiple frames without blocking the main render loop.

---

## 23. Shipping vs. Development Build Distinction

| Feature | Development Build | Shipping Build |
|---|---|---|
| In-Game Performance HUD | Available (`F3`) | Completely removed |
| Diagnostic Tracing & Logging | Active | Stripped |
| Runtime Integrity Assertions | Active (Throws error) | Graceful recovery |
| Hot-Path Allocation Profiling | Optional flag | Compiled out |
| Memory Leak Detectors | Active | Disabled |

---

## 24. Canonical Performance Risk Register

The following performance risks are formally tracked:

| Risk ID | Title | Threat Description | Architectural Mitigation | Status |
|---|---|---|---|---|
| `PERF-001` | Full-World Recurring Scans | Iterating all 65,536 world cells every frame for fluids or updates. | Strict Active-Work queue and dirty-region architecture. | `MITIGATED` |
| `PERF-002` | Offscreen Sprite Animation | Thousands of offscreen foliage and water sprites ticking update loops. | Shared global animation tick + aggressive viewport culling. | `ACTIVE_DESIGN` |
| `PERF-003` | Five-Z Overdraw | Rendering five full world maps stacked vertically, overwhelming fill-rate. | Exposed-region culling; render only visible hole geometry. | `QUEUED` (19C) |
| `PERF-004` | 1,000-Creature Update Saturation | Hundreds of AI agents evaluating A* paths and decision trees concurrently. | Staggered 4-tier simulation; spatial partitioning; coarse offscreen AI. | `ACTIVE_DESIGN` |
| `PERF-005` | Garbage Collection Stutter | Temporary object and array allocations in hot paths triggering periodic GC freezes. | Zero-allocation hot path rule; typed arrays; preallocated scratch memory. | `MITIGATED` |
| `PERF-006` | Startup & Plugin Growth | Cumulative plugin registration and asset preloading inflating launch latency. | Closed-world runtime catalog; demand-driven lazy asset loading. | `QUEUED` (Consolidation) |

---

## 25. Performance Ownership in WBS Tasks

Every substantive WBS task card must evaluate the **Seven Performance Questions**:
1. Does this task introduce recurring update work?
2. Does this task introduce new rendering passes or draw calls?
3. Does this task introduce temporary allocations in hot paths?
4. Does this task load new assets, textures, or audio into memory?
5. Does this task introduce a new cache? (Is it derived and invalidatable?)
6. Does this task increase save file serialization size?
7. Does this task lengthen startup or New Game initialization?

*If YES to any: Performance impact must be measured, benchmarked, and documented.*

---

## 26. Multi-Agent Performance Review Workflow

Performance-critical systems undergo independent multi-agent adversarial analysis:
- **Primary Implementer**: Delivers correct, functional implementation adhering to architectural contracts.
- **Adversarial Red Team (Grok)**: Conducts algorithmic stress tests, identifies worst-case complexity, and attacks hot-path allocations.
- **Coordinator / Integrator (Gemini)**: Benchmarks execution timings, verifies zero-allocation invariants, profiles memory footprint, and gates canonical merge.

---

## 27. Implementation Timing & Sequencing

1. **Current Gate (WG.00.08 / FABLE-19B Active)**: Specification and architectural documentation only. Active worktree implementation paths remain completely untouched.
2. **Post-19B Consolidation Window (`CONSOLIDATION_PLAN_V1`)**:
   - Establish `tools/performance/` test runners and scenario benchmarks.
   - Execute Plugin Update-Hook Audit.
   - Capture pre- and post-migration performance baselines.
   - Deploy dev-only performance telemetry.
3. **Subsequent Milestones (WG.00.09 / FABLE-19C Five-Z Depth)**: Performance Architecture v1 serves as a binding constraint during depth compositor implementation.

---

## 28. Evidence-Driven Discipline ("Do Not Over-Optimize")

Performance engineering must remain disciplined and pragmatic:
- **Profile First**: Never optimize code that has not been measured as a bottleneck.
- **Preserve Readability**: Clean, maintainable code is preferred outside of measured hot paths.
- **No Monolithic Merges**: Do not combine separate, elegant plugins into giant unmaintainable scripts under the false pretext of "file count optimization."
- **Focus on High-Impact Leverage**: Algorithmic complexity ($O(1)$ vs $O(N)$), spatial culling, and GC elimination deliver 95% of performance gains.

---

## 29. Canonical Binding Summary

> **"DEUS performance architecture is demand-driven. The runtime loads only required resources, processes changed or active state rather than repeatedly scanning stable state, reduces simulation frequency for remote/dormant work, renders only visible/exposed content, caches expensive derived answers with local invalidation, and minimizes allocation in measured hot paths. Major systems are benchmarked against repeatable scenarios, and unexplained performance regressions block integration."**
