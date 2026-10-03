# WBS-SPLIT: Simulation / RMMZ separation

**Status: DESIGN ONLY; implementation PARKED.** Updated 2026-10-02 from Owner decisions at 21:56-22:15 CT ([DECISIONS.md](DECISIONS.md), D-2026-10-02-12). Nothing new is built until ORG-0.2 is green; all WBS_ORG worldgen exit gates must pass before leaving worldgen. DEC-037 still freezes faction/society code. The first-follow-on work below is soft, not a new hard worldgen exit gate. The game must boot and load a world after every future implementation lane.

Every lane gate: `run_tests.bat` green, determinism hash unchanged, no new RMMZ references in simulation files. Done means: the simulation runs headless in Node, RMMZ only renders and sends input, and CI enforces the boundary.

| ID | Task |
|---|---|
| SPLIT-0.1 | First-follow-on data contract design: freeze the worldgen input/output contract, add weight fields sourced from SRD data, and make world densities tunable in data. Define provenance/units and compatibility, without inventing missing SRD numbers. Coordinate with SPLIT-0 and the adapter plan to decouple from RMMZ. Data/schema values remain unimplemented; draft proposals need Owner approval. |
| SPLIT-0 | Coupling map (no code): every function touching `$gameMap`, `$dataMap`, `Game_Event` or tile IDs, classified SIM or RENDER, with line numbers, in `docs/architecture/COUPLING_MAP.md`. Reported counts to confirm: `DEUS_Simulation_Core.js` 9,106 lines, 17 event + 19 map-tile calls; `DEUS_World.js` 5,062 lines, 16 event + 19 tile calls; `DEUS_Wildlife.js` 6 event + 3 tile calls. |
| SPLIT-1 | Plain-data `WorldStore` (width, height, typed arrays for tile layers, objects, regions; no RMMZ) + RMMZ tilemap adapter reading it. Identical render by hash and screenshot; loads in a Node test. |
| SPLIT-2 | `DEUS_World.js` tile reads/writes move to WorldStore; RMMZ access only in the adapter. |
| SPLIT-3 | `DEUS_Simulation_Core.js` tiles to WorldStore and events to plain entity records (`id`, `type`, `x`, `y`, `state`); a render adapter owns sprites. No colonist or creature remains a `Game_Event`. May split into 3a/3b. |
| SPLIT-4 | `DEUS_Wildlife.js` onto entity records and WorldStore. |
| SPLIT-5 | Fixed-tick simulation loop on plain data; `Scene_Map.update` only calls `sim.tick()` and the render adapter (same task as SIM-0 tick, no duplicate). |
| SPLIT-6 | Guard rail: `tools/ci/check_sim_imports.js` fails CI if sim sources reference `$game*`, `$data*`, `Game_*`, `Sprite_*`, `Scene_*`, `Window_*` or `PIXI`; Node headless test: seed -> generate -> 1,000 ticks -> hash check. |

Why the player cares: stable world data should load and save predictably while rendering can change without a second simulation; tunable densities and traceable weights should use explicit data. The Owner's first post-worldgen gameplay priority remains WBS-SIM SIM-8 (arrive, gather, hut, night, fun assessment). These soft architecture tasks do not authorize postponing that loop behind a full engine rewrite. The precise bounded first implementation brief is still to be approved.

Note: `DEUS_Simulation_Core.js` is not tracked on `origin/main` at 565dc5ae (it exists only as an untracked file in the main checkout); SPLIT-0 must establish which copy is canonical.
