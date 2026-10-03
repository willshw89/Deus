# WBS-SPLIT: Simulation / RMMZ separation

**Status: Parked** until ORG-0.2 is green and the ORG-4.2 determinism hash is recorded. Recorded 2026-10-02. One lane at a time; the game must boot and load a world after every lane.

Every lane gate: `run_tests.bat` green, determinism hash unchanged, no new RMMZ references in simulation files. Done means: the simulation runs headless in Node, RMMZ only renders and sends input, and CI enforces the boundary.

| ID | Task |
|---|---|
| SPLIT-0 | Coupling map (no code): every function touching `$gameMap`, `$dataMap`, `Game_Event` or tile IDs, classified SIM or RENDER, with line numbers, in `docs/architecture/COUPLING_MAP.md`. Reported counts to confirm: `DEUS_Simulation_Core.js` 9,106 lines, 17 event + 19 map-tile calls; `DEUS_World.js` 5,062 lines, 16 event + 19 tile calls; `DEUS_Wildlife.js` 6 event + 3 tile calls. |
| SPLIT-1 | Plain-data `WorldStore` (width, height, typed arrays for tile layers, objects, regions; no RMMZ) + RMMZ tilemap adapter reading it. Identical render by hash and screenshot; loads in a Node test. |
| SPLIT-2 | `DEUS_World.js` tile reads/writes move to WorldStore; RMMZ access only in the adapter. |
| SPLIT-3 | `DEUS_Simulation_Core.js` tiles to WorldStore and events to plain entity records (`id`, `type`, `x`, `y`, `state`); a render adapter owns sprites. No colonist or creature remains a `Game_Event`. May split into 3a/3b. |
| SPLIT-4 | `DEUS_Wildlife.js` onto entity records and WorldStore. |
| SPLIT-5 | Fixed-tick simulation loop on plain data; `Scene_Map.update` only calls `sim.tick()` and the render adapter (same task as SIM-0 tick, no duplicate). |
| SPLIT-6 | Guard rail: `tools/ci/check_sim_imports.js` fails CI if sim sources reference `$game*`, `$data*`, `Game_*`, `Sprite_*`, `Scene_*`, `Window_*` or `PIXI`; Node headless test: seed -> generate -> 1,000 ticks -> hash check. |

Note: `DEUS_Simulation_Core.js` is not tracked on `origin/main` at 565dc5ae (it exists only as an untracked file in the main checkout); SPLIT-0 must establish which copy is canonical.
