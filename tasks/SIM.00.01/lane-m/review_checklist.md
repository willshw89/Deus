# Grok Review Checklist: ADR-003 Sim/Render Split and LOD Simulation (Lane M / SIM.00.01)

The independent Grok review for ADR-003 must verify that the architectural decision record satisfies all core architectural requirements and recent Owner rulings:

1. **Nine Z Layers (DEC-013 / Directive 0021-V §1 & §3):**
   - ADR-003 must address 9 continuous vertical Z layers (default `-4..+4`: surface 0, four underground layers `-1..-4`, four upper layers `+1..+4`).
   - Architectural strategy for memory footprint, save file size, and LOD representation across 9 layers, including fast handling of empty sky (+1..+4) and solid rock (-1..-4).

2. **Structural Integrity & Change-Driven Collapse (Directive 0021-V §6 / V137):**
   - ADR-003 must place structural support modeling in the headless sim core.
   - Recomputation of structural load and downward support propagation must be change-driven (V133) near mutations (dig, damage, build, decay), never scanned globally per tick.
   - Mass conservation (LIFE-001) and impact damage (V95) integration.

3. **Urban Decay & Nature Reclamation (Directive 0021-V §7 / V138):**
   - ADR-003 must cover physical structure decay (roofs fail before walls, feeding into collapse) and nature reclamation (sediment, vegetation invasion, burial stages).
   - Sim systems must be slow, change-driven, LOD-aware, scheduled in coarse/slow ticks without per-frame global scans.
   - Strict conservation of mass (LIFE-001), zero ore generation (LIFE-002), and deep-history lasting trace retention (LIFE-003).

4. **All 9 Required ADR-003 Sections (Directive 0018-R §3):**
   - Context & Motivation
   - Sim/Render Boundary & Module Layout (zero DOM/PIXI/RMMZ globals in sim core)
   - Tick Model & Sub-tick Accumulator (fixed 10 Hz tick decoupled from presentation frames)
   - Snapshot Read Interface & Change Feed (immutable view, single command queue)
   - LOD Region Model (region grid, focus set, summary schema)
   - Summary Simulation (coarse simulation of unviewed regions)
   - Promotion & Demotion with Conservation Invariants
   - Incremental Migration Sequence (Increment 0: Lane N in-place switch; incremental migration of live systems)
   - Performance Budgets (allocations, heap, tick limits based on Lane K baseline)

5. **Fact Verification:**
   - Every claim about current engine code cites exact file and line on `main` (commit `ebeec892` or later).
