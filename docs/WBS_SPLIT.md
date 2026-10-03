# WBS-SPLIT: Sim/RMMZ separation

Owner plan recorded 2026-10-02 by Codex (PM). **PARKED.** Starts only after ORG-0.2 is green and the ORG-4.2 determinism hash is recorded. Saving this plan does not start a lane, approve an implementation, or certify the audit counts below. The loaded-world goal in [WBS-ORG](WBS_ORG.md) remains first.

## Rules and acceptance

Use the current roster, strongest approved single-agent models/effort, PM-selected actually-read GitHub references in each lane brief, cross-family review and a CONFIRMED Deus claim check before merge. One implementation lane at a time. The game must boot and load a world after every lane.

Every lane gate requires `run_tests.bat` green, the ORG-4.2 determinism hash unchanged, and no new RMMZ references in simulation files. Reports give Task ID, branch, origin-visible full SHA, changed files, named functions and callers, actual RESULT lines, hash, RMMZ reference counts before/after, inspected loaded-world screenshots and anything untested. Fix causes; propose any incorrect-test correction to the Owner before changing it. Keep engine core, libraries, art and other local work protected; DEC-037 remains in force.

DONE means the simulation runs headless in Node, RMMZ only renders and sends input, the hash is identical to the pre-split green world, and CI enforces the simulation boundary. The Owner's estimate is 1-2 weeks of reviewed lanes, not a completion commitment. SPLIT-3 is the risky lane: review must inspect real consumers and call sites, not merely newly added files.

## Deus coupling audit supplied by the Owner

Source: Deus's 2026-10-02 audit of the laptop working tree. These are reported observations, not independently reproduced by Codex and not measurements of the eventual green SHA.

- 72 plugin files, about 101,000 lines and 3,300 RMMZ references; 11 files have none.
- Simulation-side files with approximately zero direct map/event coupling: `DEUS_Colonists`, `DEUS_WorldGen`, `DEUS_History`, `DEUS_Items`, `DEUS_Objects`. `DEUS_Jobs` has two map calls.
- Reported hotspots: `DEUS_Simulation_Core.js` (9,106 lines; 17 event calls, 19 map-tile calls, 363 RMMZ references), `DEUS_World.js` (5,062 lines; 16 event calls, 19 map-tile calls, 196 references), `DEUS_Wildlife.js` (six event calls, three map-tile calls).
- UI/render files such as `DEUS_Levels`, `DEUS_Depth`, `DEUS_Select`, `DEUS_FactionMenus`, `DEUS_Fog` and `DEUS_Camera` are expected to use RMMZ and stay.

The earlier SIM-0.3 summary proposed extracting map/tile/event access from Simulation_Core, World and Wildlife behind a plain-data world store. This WBS supplies the actual future lane sequence. SPLIT-0 must establish exact counts, function names and line numbers on the accepted green code; the working-tree summary is not an implementation instruction or a substitute for that map.

## Lane sequence

### SPLIT-0: Coupling map

Writer: Claude. Reviewer: Grok. No code changes.

For `DEUS_Simulation_Core.js`, `DEUS_World.js` and `DEUS_Wildlife.js`, list every function that reads/writes `$gameMap`, `$dataMap`, `Game_Event` or tile IDs. Classify each as SIM (state/logic) or RENDER (display).

Output: `docs/architecture/COUPLING_MAP.md`, with exact function names and line numbers. The Owner sees it before SPLIT-1.

### SPLIT-1: WorldStore

Writer: Claude. Reviewer: Grok.

Create the plain-data module `game/js/src/sim/world_store.js` with width, height, typed arrays for terrain/tile layers, objects and regions. No RMMZ imports. An adapter makes the RMMZ tilemap read WorldStore instead of `$dataMap.data`.

Acceptance: identical world rendering by determinism hash and inspected screenshot comparison; WorldStore loads in a Node test.

### SPLIT-2: Move World tile reads/writes

Writer: Claude. Reviewer: Gemini, relayed by the Owner.

Replace the approximately 19 `DEUS_World` map-tile calls with WorldStore access. Keep RMMZ access only in the adapter. SPLIT-0 supplies the actual call list and count.

### SPLIT-3: Move Simulation_Core tile/event use

Writer: Claude. Reviewer: Grok. Largest lane; may be proposed as SPLIT-3a/3b, with exact disjoint scope recorded before starting the split.

Map-tile calls move to WorldStore. Event-based entities become plain records (`id`, `type`, `x`, `y`, `state`) in `game/js/src/sim/entities.js`. A render adapter creates and updates their sprites. No colonist or creature may be a `Game_Event` after this lane. The reviewer checks consumers and live call paths.

### SPLIT-4: Wildlife onto entities

Writer: Grok. Reviewer: Claude. This is the Owner's explicit assignment for this lane.

Replace the reported six event calls and three tile calls with `entities.js` and WorldStore. Use the actual SPLIT-0 inventory to prove all call sites moved.

### SPLIT-5: Fixed-tick simulation loop

Writer: Claude. Reviewer: Grok. Corresponds to SIM-0.2; do not implement duplicate authorities or run a parallel version of that task.

The simulation updates on its own tick using plain data. RMMZ `Scene_Map.update` only calls `sim.tick()` and the render adapter.

### SPLIT-6: Guard rail

Writer: Grok. Reviewer: Claude.

Create `tools/ci/check_sim_imports.js`. CI fails if a file under `game/js/src/sim/` references `$game*`, `$data*`, `Game_*`, `Sprite_*`, `Scene_*`, `Window_*` or `PIXI`. Demonstrate the check rejects an intentional violation.

Node test: load a seed, generate the world, run 1,000 headless ticks and check the hash against the accepted pre-split deterministic contract.

## Before any lane starts

Codex writes the bounded brief and manifest with the green base SHA, exact allowed files, generated/source boundaries, verified GitHub references, commands and stop conditions. No lane starts until both prerequisite gates are evidenced. After them, SPLIT-0 is the first separation lane. Broader ORG-4.4 design and parked WBS-SIM work must not duplicate this sequence; any overlap is resolved in the brief before implementation.
