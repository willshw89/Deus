# Grok Review Checklist: ADR-003 Sim/Render Split and LOD Simulation (Lane M / SIM.00.01)

The independent Grok review for ADR-003 must verify that the architectural decision record satisfies all core architectural requirements and recent Owner rulings:

1. **Thirty-Two Z Layers & Headroom (DEC-013 amended / Directive 0021-V Addendum §12–§13):**
   - Gameplay layer count targets 32 continuous vertical Z layers (default `-16..+15`, surface at 0, 320 ft total vertical height; supersedes 9-layer baseline).
   - Storage and LOD must scale to 32+ layers.
   - Mandatory sparse storage: memory footprint and save file size must scale with occupied cells, NOT with 32 × area. Empty sky and untouched solid rock must cost near zero.
   - 32-layer memory and save-size benchmark targets must be defined.
   - Tests and harnesses must be capable of running at both 9 layers and 32 layers.

2. **Governing Geometry & Scale (Directive 0021-V Addendum §12):**
   - 1 square / cell = 5 ft × 5 ft (D&D movement standard).
   - 1 Z layer = 10 ft tall (equivalent to 2 cubes).
   - 5 strata per layer = 2 ft per stratum (5 × 2 ft = 10 ft).

3. **Cross-Layer Blasts & Structural Damage (Directive 0021-V Addendum §12):**
   - Blasts (e.g. fireball) damage floors and propagate downward to the layer below based on floor material, thickness, and attenuation.
   - `applyVolumeDamage` propagates vertically with distance falloff and solid material attenuation (fire vs impact).

4. **Structural Integrity & Change-Driven Collapse (Directive 0021-V §6 / V137):**
   - ADR-003 must place structural support modeling in the headless sim core.
   - Recomputation of structural load and downward support propagation must be change-driven (V133) near mutations (dig, damage, build, decay), never scanned globally per tick.
   - Mass conservation (LIFE-001) and impact damage (V95) integration.

5. **Urban Decay & Nature Reclamation (Directive 0021-V §7 / V138):**
   - ADR-003 must cover physical structure decay (roofs fail before walls, feeding into collapse) and nature reclamation (sediment, vegetation invasion, burial stages).
   - Sim systems must be slow, change-driven, LOD-aware, scheduled in coarse/slow ticks without per-frame global scans.
   - Strict conservation of mass (LIFE-001), zero ore generation (LIFE-002), and deep-history lasting trace retention (LIFE-003).

6. **All Required ADR-003 Sections (Directive 0018-R §3):**
   - Context & Motivation
   - Sim/Render Boundary & Module Layout (zero DOM/PIXI/RMMZ globals in sim core)
   - Tick Model & Sub-tick Accumulator (fixed 10 Hz tick decoupled from presentation frames)
   - Snapshot Read Interface & Change Feed (immutable view, single command queue)
   - LOD Region Model (region grid, focus set, summary schema)
   - Summary Simulation (coarse simulation of unviewed regions)
   - Promotion & Demotion with Conservation Invariants
   - Incremental Migration Sequence (Increment 0: Lane N in-place switch; incremental migration of live systems)
   - Performance Budgets (allocations, heap, tick limits based on Lane K baseline)

7. **Fact Verification:**
   - Every claim about current engine code cites exact file and line on `main` (commit `ebeec892` or later).