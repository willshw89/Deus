# Lane M Brief: Architectural Decision Record — Sim/Render Split & LOD Architecture (SIM.00.01)

## Standing rules
1. One primary writer per file set. Lane M's write set is disjoint from all other active lanes.
2. Workers never push. Only the integrator pushes.
3. Capture the exit code of every command, one per command ("EXIT=$LASTEXITCODE"). Put raw values in your reports.
4. FOREGROUND rule: Run tests in the FOREGROUND. Never end your turn while background jobs or child processes are running. Commit early (WIP commits allowed on your branch). Do not push. Do not merge. Write only inside allowedPaths.
5. NO ART of any kind (DEC-007). Never generate, request or integrate art, and never tell anyone to.
6. Nothing merges to main without PM sign-off in the mailbox.
7. **ZERO CODE RULE**: Pure architecture and specification. No modifications to `game/` or `tools/`.

**allowedPaths** (exact):
- `docs/adr/ADR-003_sim_render_split_and_lod.md`
- `docs/adr/README.md`
- `tasks/SIM.00.01/lane-m/**`

**Forbidden**: Everything else. `game/**`, `tools/**`, `docs/worldgen/**`, `docs/art/**`, `docs/society/**`.

## Objective
Author the definitive Architectural Decision Record (ADR-003) governing the complete separation of simulation state from presentation rendering, and establishing the Level-of-Detail (LOD) hierarchical simulation engine for Project DEUS.

Every claim about current engine code MUST cite exact `file:line` on `main` (`ebeec892`).

## The Nine Required Sections in ADR-003
1. **Context & Motivation**:
   - Current coupling: 32 `Scene_Map`/`Game_Map` update aliases across 26 plugins. Sim ticks directly tied to RMMZ `updateMain` frames (`SceneManager.determineRepeatNumber`/`update`).
   - Fragile approximations: Fluid simulation active in view only (`DEUS_Fluid.js` L736-745); Ecology rotating area (`DEUS_Ecology.js` L22-27); off-screen units stepping 1 cell per 16 frames (`DEUS_World.js` L1699-1701).
   - Violation of physics: lack of mass and entity conservation during area switches or off-screen stepping.
2. **Sim/Render Boundary & Module Layout**:
   - Layout of headless simulation modules in `game/js/sim/` (or designated clean directory).
   - Zero globals: Complete isolation from `window`, `document`, `PIXI`, `$game*`, `$data*`, `Game_*`, `Scene_*`, `Sprite*`.
   - Node VM testability: 100% headless execution via Node CLI harnesses.
3. **Tick Model & Sub-tick Accumulator**:
   - Fixed tick rate: 10 Hz canonical sim tick decoupled from variable display refresh rates (30/60/144 FPS).
   - Frame accumulator pattern with fixed step consumption and remainder carry-forward.
   - Determinism: identical PRNG sequences yield bit-exact state histories regardless of rendering cadence.
4. **Snapshot Interface & Change Feed**:
   - Versioned, immutable state snapshots provided to presentation layer.
   - Zero-allocation delta/change feed for animations, visual effects, and UI observers.
   - Inverted control: Command queue for player inputs, designations, and orders; presentation never writes directly to sim state.
5. **LOD Region Model**:
   - Spatial partition: 256×256×5 Z divided into uniform coarse regions (e.g. 16×16 or 32×32 chunks).
   - Focus set: Active simulation bubbles around camera view, player character, active colony sites, and active jobs.
   - Non-focus regions: Coarse summary simulation.
6. **Summary Simulation**:
   - Compact aggregate state representations for coarse regions: population buckets by species/caste, bulk fluid volume per basin, biomass/flora density, ambient heat/moisture.
   - Low-frequency stepping for background regions preserving macroeconomic and ecological momentum.
7. **Promotion & Demotion with Conservation Invariants**:
   - Promotion: Seamless, deterministic expansion of a coarse summary into fine grid cells upon entering the focus set (same seed + summary state = identical fine representation).
   - Demotion: Lossless condensation of active grid cells back into summary aggregates upon exiting the focus set.
   - Conservation laws: Zero loss or spontaneous generation of water mass, mineral quantities, or tracked entities.
8. **Migration Increments**:
   - Step-by-step decoupling roadmap across Milestone M3:
     - `SIM.00.02`: Headless core with fixed tick.
     - `SIM.00.03`: Snapshot/read interface and command queue.
     - `SIM.00.04`: Entity movement model migration.
     - `SIM.00.05`: Subsystem-by-subsystem migration (Fluid, Ecology, Fire, Colonists, Jobs, Combat, Calendar).
     - `SIM.00.06`: Unified sim save schema and migration.
9. **Performance Budgets**:
   - Allocation targets: Zero per-tick heap allocations in inner loops.
   - Execution time budgets: Full-detail tick budget, coarse tick budget, and transition prewarm budget to guarantee 60 FPS presentation headroom.
   - Reference Lane K K3 benchmark numbers where applicable.

## Verification & Gate
- `node tools/check_deus_syntax.js`
- `node tools/governance/check_wbs_integrity.js`
- Reviewed independently by Grok (attack plan / review verdict in `tasks/SIM.00.01/lane-m/review_grok_<sha8>.md`).

## Commits
Commit messages start `[claude] SIM.00.01`. Commit early on `task/lane-m`. Do not push or merge.
