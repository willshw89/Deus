# ENGINEERING_STANDARD.md — Permanent Engineering Standard for Project DEUS

**Project Formal Name**: DEUS  
**Authority**: User Directive 2026-09-21. Binding on all AI agents (Gemini, Claude Code, etc.) and human contributors.  
**Purpose**: Keep Project DEUS understandable, organized, performant, testable, reproducible, easy to extend, resistant to regressions, safe for AI-assisted development, stable across save/load, and healthy as simulation complexity scales.

This is not a one-time cleanup task. Treat project health as an ongoing system.

---

## 1. One Canonical Project
- Maintain exactly one authoritative working copy of Project DEUS at `c:\Users\snewt\OneDrive\Desktop\UF`.
- Parallel agents may inspect, research, test, review, and work in isolated branches/worktrees, but only one integration authority decides what enters the canonical project.
- No competing "final" copies.

## 2. One Source of Truth Per Concept
Every major concept has one authoritative subsystem module:
- **WORLD** (`UF_World.js`): XYZ coordinates, terrain, solid/void, chunks, world mutation.
- **WORLDGEN** (`UF_WorldGen.js`, `UF_Levels.js`): Climate, biome, geology, elevation, caves, natural resources.
- **ENTITIES** (`UF_World.js` registry, `UF_Colonists.js`): Creature identity, persistent entity state.
- **TIME** (`UF_Time.js`, `UF_TimeSpeed.js`): Engine clock, action clock, historical clock, sky/presentation clock.
- **CAPABILITIES** (`UF_Proficiency.js`): Ability scores, bounded proficiencies, traits, checks, work rate.
- **JOBS** (`UF_Jobs.js`): Job requests, job assignment, work state, reservations.
- **INVENTORY** (`UF_Items.js`, `UF_Containers.js`): Physical item placement, creature inventories, containers, weight, finite slots.
- **RESOURCES** (`UF_Resources.js`, `UF_WorldCatalog.json`): Material definitions, material properties, resource resolution, resource knowledge.
- **CONSTRUCTION** (`UF_Construction.js`, `UF_Walls.js`, `UF_Floors.js`, `UF_Doors.js`): Building plans, block construction, room recognition, structural project state.
- **PATHFINDING** (`UF_Movement8D.js`, `UF_NaturalConnections.js`): Route finding, Z transitions, movement cost.
- **AI / PLANNING** (`UF_Colonists.js`, `UF_Households.js`, `UF_Goals.js`): Needs, household goals, settlement goals, project generation.
- **COMBAT** (`UF_Combat.js`, `UF_DFCombat.js`): Initiative, tactical rounds, attacks, reactions, conditions.
- **RENDERING** (`UF_Tiles.js`, `UF_Anim.js`, `UF_Perspective25D.js`, `UF_Fog.js`, `UF_DayNight.js`): Visual presentation, sprites, fog/LOS, Z rendering.
- **SAVE** (`UF_Core.js`, `DataManager`): Serialization, schema versions, migrations.
- **DIAGNOSTICS** (`UF_Sheet.js`, `UF_Look.js`, `UF_Test.js`): Inspectors, overlays, profiling, debug traces.

Do not allow multiple systems to independently implement the same responsibility.

## 3. Logic Must Be Separate from Content (System + Data = Content)
- No hardcoding materials, weapons, recipes, professions, or buildings in simulation code.
- Systems read from data catalogs (`game/data/UF_WorldCatalog.json`). Adding content requires adding or modifying data, not rewriting engine logic.

## 4. Avoid Giant God-Files
- Do not let a single file accumulate unrelated responsibilities.
- Avoid files combining worldgen, inventory, combat, AI, time, construction, and save/load.
- Organize by coherent responsibility with clean public APIs.

## 5. Clean Dependency Direction
```text
CONTENT / DATA (UF_WorldCatalog.json)
      ↓
CORE WORLD + ENTITY MODEL (UF_World.js, UF_Levels.js)
      ↓
SIMULATION SERVICES (UF_Time.js, UF_Proficiency.js, UF_Items.js, UF_Resources.js)
      ↓
AI / JOBS / COMBAT (UF_Jobs.js, UF_Colonists.js, UF_Combat.js)
      ↓
PRESENTATION / UI (UF_Sheet.js, UF_Anim.js, UF_DayNight.js, UF_Look.js)
```
- UI never defines simulation truth.
- Renderer never defines game rules.
- Avoid circular subsystem ownership.

## 6. No Global Full-World Scans Every Frame
- Hard performance rule: **Never iterate all units, all objects, all items, or all tiles every frame**.
- Use spatial registries, localized queries, job queues, reservation registries, resource indexes, dirty flags, and incremental recalculation.
- Need timber → query nearby known timber sources, not full-world scan.
- Need a job → query available job registry, not every project in existence.

## 7. Decoupled Update Cadences
Update systems only as often as gameplay requires:
- Rendering / Visual movement: $60\text{ Hz}$.
- Tactical Action Processing: $10\text{ Hz}$ to $20\text{ Hz}$.
- Immediate Survival AI: $2\text{ Hz}$ to $5\text{ Hz}$.
- Job Selection: $1\text{ Hz}$ to $2\text{ Hz}$.
- Household Planning: $0.1\text{ Hz}$ (every $10\text{ s}$).
- Settlement Strategic Planning: $0.02\text{ Hz}$ (every $50\text{ s}$).
- Historical Biology & Ecology: batched per historical hour/day.

## 8. Event-Driven World Mutation & Localized Invalidation
- When world state changes, dependent systems are explicitly notified via `UF.Events`:
  - Rock mined $\rightarrow$ solid becomes void $\rightarrow$ localized invalidation of pathfinding, LOS, room detection, rendering.
  - Container changed $\rightarrow$ resource index update.
  - Creature died $\rightarrow$ household/social/job update.
- Localized invalidation rather than full-map rebuilds.

## 9. Build Observability Before Complexity
The simulation must explain itself:
- Selecting a creature exposes: Current Need, Goal, Project, Job; Why this goal/project/job; Resource required & selected; Capabilities used ($\text{Ability} + \text{Proficiency} + \text{Tools}$).
- Selecting a world cell exposes: XYZ, Biome, Ecology, Geology, Solid/Void/Water, Material, Exposed faces, Light, Mineable, Walkable, Room boundary.
- If the engine cannot answer "Why did this happen?", the simulation is too opaque.

## 10. Deterministic Seeds Where Practical
- Support reproducible testing via `World.state.seed` and deterministic PRNG (`w.hash32`).
- Reproduce bugs by seed + coordinates. No unnecessary unseeded randomness in tests.

## 11. Multi-Layer Testing
- Unit tests: math, grid conversion, weight limits, capability bounds.
- System tests: mining yields, container storage, recipe refinement.
- Integration tests: mining updating pathfinding + LOS + room enclosure.
- Zero-input tests: unscripted autonomous survival.
- Save/load tests: persistence, schema migration, zero duplication.
- Soak tests: multi-generational simulation stability.
- Performance tests: 8, 25, 50, 100, 250, 500 entity benchmarks.

## 12. Permanent Reference World (`DEUS_REFERENCE_WORLD`)
- Maintain a deterministic regression/test world containing cliffs, caves, Z-transitions, construction, housing, containers, mining, combat, farming, and workshops.

## 13. Set Performance Budgets
- Frame budget $\approx 16.7\text{ ms}$ ($60\text{ FPS}$).
- Population benchmarks: 8 (trivial) $\rightarrow$ 25 (trivial) $\rightarrow$ 50 (smooth) $\rightarrow$ 100 (smooth) $\rightarrow$ 250 (playable) $\rightarrow$ 500 (stress-test).
- Profile rather than guess.

## 14. Performance Test After Expensive Features
- Benchmark before piling additional systems on top. Record regressions immediately.

## 15. Scalable Levels of Simulation Fidelity
- High fidelity: visible/nearby entities (precise movement, combat, animations).
- Medium fidelity: active settlement entities (jobs, needs, production).
- Coarse fidelity: distant regions and background wildlife (batched statistics).

## 16. Save Truth, Rebuild Cache
- Persist stable world truth (entity state, inventory, skills, building blocks, terrain mutations).
- Rebuild temporary caches (spatial indexes, route caches, room metadata) upon load.
- Version saves (`saveSchemaVersion`) and provide explicit migration functions (`v6 -> v7`).

## 17. Stable Persistent Identifiers
- Every persistent entity uses a stable ID (`Creature #1042`, `Household #83`, `Project #927`, `Chest #512`).
- Never rely on live JS object references across ticks or saves.

## 18. Data-Driven Assets
- Access art via asset manifest / index (`UF_AssetIndex.json`, `catalog.objects`). No hardcoded file paths scattered in plugins.

## 19. Small Set of Authoritative Documents
- `AGENTS.md` (binding rules)
- `ENGINEERING_STANDARD.md` (this file)
- `ARCHITECTURE.md` (subsystems & dependencies)
- `STATUS.md` (current state)
- `SLICES.md` (slice backlog)
- `VISION.md` (game design & decisions)
- `ENGINE_RULES.md` (RMMZ guardrails)
- `ART_STANDARD.md` (Nano Banana Pro art spec)

## 20. Version Control is the Archive
- No obsolete duplicate files (`UF_JobsV2.js`, `UF_Jobs_FINAL.js`). The live runtime contains only active code.

## 21. Periodic Dead-Code & Asset Audits
- Periodically identify unused plugins, duplicate definitions, and orphaned assets without deleting anything without proof.

## 22. Small Refactors Over Large Rewrites
- Address technical debt incrementally. No giant risky engine rewrites.

## 23. Freeze Shared Interfaces Before Parallel Writes
- Shared contracts (World, Entity, Inventory, Job, Time, Resource APIs) must be frozen before parallel agent writes. One file = one writer.

## 24. Definition of Done
Implemented + Integrated + Automated Tests Pass + No Known Regressions + Save/Load Verified + Performance Checked + Diagnostics Available + Playtest Verified + Documentation Updated.

## 25. Weekly / Periodic Health Audits
- Multi-agent read-only audit: architecture duplication, performance regressions, test coverage, save compatibility, dead code, incomplete TODOs.
- Lead agent synthesizes findings; one writer performs approved corrections.

## 26. Small Feature Scope
- Build complexity incrementally with small, visible, testable milestones.

## 27. Every Active Task Has an Owner
- Task, Owner, Files, Dependencies, Tests, Visible Result, Performance Risk, Save Impact, Status.

## 28. Centralize Shared Formulas
- 1 grid = 5 ft, weight, work rate, capability check, material matching, damage, time conversions live in one authoritative location.

## 29. Centralize Configuration
- No magic numbers scattered across files.

## 30. Evidence-Driven Optimization
- Profile first to identify real bottlenecks.

## 31. Profile Long-Run Memory Health
- Guard against event listener leaks, unbounded history arrays, stale caches, and unreleased reservations.

## 32. Bound History & Logging
- Use bounded buffers and event compaction.

## 33. Prevent Reservation Leaks
- Every reservation has owner, purpose, and expiration conditions. Released on cancel, death, or load.

## 34. Prevent Project Leaks
- Explicit project lifecycle states: `planned`, `active`, `blocked`, `complete`, `canceled`, `abandoned`. Clean up terminal states.

## 35. Batch Expensive Operations
- Spread path searches, room checks, ecology ticks, and worldgen across frames.

## 36. Localize Pathfinding
- Hierarchical routing, chunk borders, cached local routes, and unreachable-area caching.

## 37. Priority-Based Path Requests
- Emergency (flee/combat) > High (hunger/thirst) > Normal (jobs) > Low (relocation).

## 38. Chunk-Deterministic Worldgen
- Same seed + coords = identical untouched world. Persist mutations separately.

## 39. Base World vs Mutations
- Separate static worldgen generation from runtime mutations.

## 40. Rebuild Derived State Upon Load
- Save truth, rebuild caches.

## 41. Mandatory Schema Migrations
- Increment version on shape change; provide explicit migration functions.

## 42. Fail Loudly in Development, Gracefully in Production
- Surface invariant violations in dev; fall back gracefully in production.

## 43. Explicit Invariants
- Physical item uniqueness, reservation $\le$ stock, same-Z combat, 1 cell = 5 ft, zero faction-wide inventory.

## 44. Assertions in Dev Builds
- Enforce assertions on critical state in dev; strip or bypass in production hot loops.

## 45. Toggleable Debug Features
- Debug overlays and tracing must not impact release performance.

## 46. Repeatable Performance Regression Tests
- Baseline scenarios with measured frame and tick times.

## 47. Automated Long-Run Soak Testing
- Zero-input simulations tracking population, jobs, projects, memory, and tick time.

## 48. Reproducible Bug Reports
- World seed, sim seed, save, XYZ, entity ID, time, reproduction steps.

## 49. Regression Tests for Fixed Bugs
- Add test before/with fix so bugs never return.

## 50. Actionable, Centralized TODOs
- Track architectural debt in canonical docs, not random forgotten comments.

## 51. No Mixing Features with Mass Cleanup
- Change only what the feature requires.

## 52. Review Before Dependency Changes
- Assess dependents, save impact, and test impact before refactoring shared layers.

## 53. Multi-Agent Rule
- Parallelize audits, research, tests, reviews. Serialize shared architecture, shared files, save schema, and integration.

## 54. Permanent Development Loop
- Milestone $\rightarrow$ Audit $\rightarrow$ Design $\rightarrow$ Single Writer $\rightarrow$ Implement $\rightarrow$ Test $\rightarrow$ Full Regression $\rightarrow$ Profile $\rightarrow$ Review $\rightarrow$ Document $\rightarrow$ Commit.

## 55. Periodic Health Milestones
- Regular scheduled audits after feature clusters.

## 56. Measurable Health Metrics
- Test count, pass rate, tick times, memory usage, save version.

## 57. Root Fixes Over Defensive Bloat
- Fix ownership and invariants rather than piling on defensive patches.

## 58. Keep Hot Paths Lean
- Simple, allocation-free, cache-friendly code in per-frame and per-tick loops.

## 59. Cache Only with Clear Invalidation
- Every cache must declare what invalidates it.

## 60. No Hidden Global Mutable State
- Clear owner and controlled mutation API for all shared state.

## 61. Graceful Production Recovery
- Fall back safely for non-critical assets/errors without corrupting world truth.

## 62. Startup Content Validation
- Validate catalogs, materials, recipes, and items at boot time.

## 63. Asset Pipeline Validation
- Check manifest, file existence, frame dimensions, black top-caps, and palette compliance.

## 64. Clear Licensing Boundaries
- Isolate CC SRD 5.1, original DEUS content, and generated assets with proper attribution.

## 65. Performance Philosophy
- Events over polling. Indexes over global search. Local recalculation over full rebuilds. Coarse simulation over invisible detail. Batching over spikes. Profiling over guessing.

## 66. Maintainability Philosophy
- One source of truth per concept. Data over hardcoding. Small features over monolithic tasks. Clear ownership over shared mutation. Stable IDs over object references. Explicit time domains over ambiguous timers. Versioned saves over breaking changes.

## 67. Debugging Philosophy
- Deterministic when possible. Inspectable always. Reproducible bugs. Explicit invariants. Regression tests after fixes.

## 68. Final Health Standard
At any point, we must be able to answer:
- What system owns this?
- Where does this data live?
- Why did this creature do this?
- Why is this resource here?
- Why did this project fail?
- What changed this world cell?
- What clock does this timer use?
- Can this save migrate?
- What is the performance cost?
- How do we test it?
- Can we reproduce the bug?

