# ARCHITECTURE: the subsystem map (Project DEUS)

Rewritten 2026-09-29 from the files that exist in the tree. The rules are in `docs/ENGINE_RULES.md`; this file says what is where, how sim and render split, and who writes what. Canonical copy: `C:\Users\snewt\OneDrive\Desktop\UF`, branch `main`; the merge gate is the only way in (ENGINE_RULES §6).

## 1. Two kinds of code
- `game/js/plugins/DEUS_*.js`: 62 RMMZ plugins, 86,462 lines. They hook the engine, hold live game state, draw, and bridge to the sim modules. 42 are registered in `game/js/plugins.js`. 20 are not, and reach the game only through DEUS_Core's `require()` companion list, a `loadScript` chain, or not at all: Bag, Callings, CombatRT, CombatUI, Conditions, Containers, DeathForensics, DepthCues, DepthDemo, Dnd5e, Fluid, HistoricalDemographics, LayerOverlays, Minimap, Mint, Move8, Select, Stockpiles, Taming, WorldItems (ENGINE_RULES §3).
- `game/js/sim/**`: 49 host-agnostic CommonJS files. No RMMZ global, no clock, no `Math.random`; data, time and rng are passed in. Node tests and plugins both `require()` them. The design is ADR-003 (`docs/adr/ADR-003_sim_render_split_and_lod.md`, still PROPOSED).
- `game/js/plugins/UF_*.js`: 43 files. 41 are 16-line forwarders to the `DEUS_` file of the same name. `UF_Households.js` (1,073 lines) is a real plugin loaded only by DEUS_Core's companion list. `UF_Time.js` (589 lines) is loaded by nothing in the game.

## 2. Subsystems
| Subsystem | Plugins (`DEUS_`) | Sim modules (`game/js/sim/`) | System docs (`docs/systems/`) |
|---|---|---|---|
| CORE | Core (`window.DEUS` = `window.UF`, `$deusTime` calendar saved as `deusTime`, RNG, `UF.Events`, save hooks), TimeSpeed (speed, pause) | none | none for Core; `UF_TimeSpeed.md` |
| WORLD (physical space) | World (Z-range authority, areas, unit registry, paths), Levels (layers, five strata, sparse storage), NaturalConnections | none | `UF_World.md`, `UF_Levels.md`, `DEUS_ZRange.md`, `UF_NaturalConnections.md` |
| WORLDGEN | WorldGen, History, HistoricalDemographics | none | `UF_WorldGen.md`, `UF_History.md`; none for HistoricalDemographics |
| MATTER (closed mass, DEC-040) | Items, WorldItems, Containers, Stockpiles, Bag, Objects, Mint | `ledger.js`, `ledger_defaults.js`, `materials.js`, `reclaim.js`, `decay/*`, `world_items/*` | `UF_Items.md`, `DEUS_WorldItems.md`, `UF_Objects.md`, `DEUS_Materials.md`, `DEUS_Decay.md`, `DEUS_Reclamation.md`, `DEUS_MintingEngine.md`; none for Containers, Stockpiles, Bag, Mint |
| STRUCTURE | Walls, Floors, Doors | `structural/*` (support, cascading collapse) | `UF_Walls.md`, `UF_Floors.md`, `UF_Doors.md`, `DEUS_WORLD_STRUCTURAL_ARCHITECTURE.md` |
| WATER | Fluid (cell depth 0..7, active queues) | `hydro/*` (cross-layer water ledger), `hydrology/*` (aquifer, Darcy seepage) | `DEUS_Fluid.md`, `DEUS_WaterDynamics.md` |
| CLIMATE, FIRE, FLORA | Environment, Fire, Ecology, DayNight | none | `UF_Environment.md`, `UF_Fire.md`, `UF_Ecology.md`, `UF_DayNight.md` |
| FAUNA | Wildlife, Taming | `taming/*` | `UF_Wildlife.md`, `DEUS_Taming.md` |
| RULES (SRD 5.1) | Dnd5e, Conditions, Combat, CombatRT, CombatUI, Stance | `rules/*` (dice, attacks, species map), `combat_rt/*` | `DEUS_Rules.md`, `DEUS_Conditions.md`, `UF_Combat.md`, `UF_Stance.md`; none for Dnd5e, CombatRT, CombatUI |
| MOVEMENT | Movement8D (octile A*), Move8 | `combat_rt/move8.js` | none |
| PEOPLE (frozen, DEC-037) | Colonists, Jobs, Projects, Callings, Ownership, Factions, FactionMenus, Talk, Speech, DeathForensics; `UF_Households.js` | `society/*` (identity, Militia, Quartermaster, Treasury) | `DEUS_Colonists.md`, `UF_Jobs.md`, `DEUS_Projects.md`, `UF_Ownership.md`, `UF_Factions.md`, `UF_Talk.md`, `UF_Speech.md`, `UF_Households.md`, `DEUS_PersonIdentity.md`, `DEUS_Militia.md`, `DEUS_Quartermaster.md`, `DEUS_Treasury.md`; none for Callings, FactionMenus, DeathForensics |
| RENDER | Visuals, Perspective25D (now "pure 2D top-down" by its own header; the `plugins.js` description still says 2.5D), Tiles, Anim, Depth, DepthCues, DepthDemo, LayerOverlays, Culling, Fog, Camera, Generator | none | `UF_Tiles.md`, `UF_Anim.md`, `DEUS_Depth.md`, `DEUS_DepthDemo.md`, `DEUS_LayerOverlays.md`, `UF_Camera.md`, `DEUS_OcclusionCulling.md`; none for Visuals, Perspective25D, DepthCues, Culling, Fog, Generator |
| INPUT and UI | Select, Interact, ColonyOverseer, Sheet, Look, Minimap | none | `UF_Select.md`, `UF_Interact.md`, `UF_ColonyOverseer.md`, `UF_Sheet.md`, `UF_Look.md`, `DEUS_Minimap.md` |
| TEST | Test | none | `UF_Test.md` |

The 20 plugins without a doc on 2026-09-29: Bag, Callings, CombatRT, CombatUI, Containers, Core, Culling, DeathForensics, DepthCues, Dnd5e, FactionMenus, Fog, Generator, HistoricalDemographics, Mint, Move8, Movement8D, Perspective25D, Stockpiles, Visuals (ENGINE_RULES §10).

## 3. Sim / render split
- Direction of dependency: `game/data/*.json` (content) -> `game/js/sim/**` (pure rules and ledgers) -> state-holding plugins (World, Levels, Items, Fluid, Colonists ...) -> render and UI plugins (Tiles, Anim, Depth, Sheet, Look ...). Lower layers never import higher ones.
- Presentation never defines truth: a hidden sprite, a closed window or a culled level cannot change a rule, a count or a mass. Simulation never reads the Pixi tree or a window.
- Units live in the world registry (`DEUS_World`), not on maps; the area on screen draws them as RMMZ events with stable IDs. The RMMZ map is a host container built in memory per area; the world is data (VISION V14, `UF_World.md`).
- Every change to the world goes through the owning plugin's API (`setTile`, the unit API, the ledger), so it is recorded and survives leaving the area and saving. Save truth, rebuild caches (ENGINE_RULES §7).
- The natural world is built upstream first: Physical Space -> Matter -> Water -> Soil -> Climate -> Flora -> Fauna (DEC-037). Civilization rows above are frozen except the Owner-authorized sack inventory and racial banners; DEC-043 records the build/craft design as deferred.

## 4. Ownership
- Roles (DEC-042, `docs/CANONICAL_ROLES.md`): Claude Code is PM; Gemini / Antigravity coordinates its worker fleet; Grok reviews by default; Codex does bounded tooling; any of the four families writes when a lane names it; MiniMax is manual-only. Zero self-certification: a reviewer is never the writer's model family.
- Inside a lane, ownership is the `allowedPaths` list in `tasks/<task>/<lane>/lane.json`: one writer per file set, and the launcher flags anything outside it (`OUT-OF-SCOPE`). Between lanes, the `**Owner:**` line at the top of `docs/systems/<name>.md` names the last writer.
- Nobody edits another lane's files, resets another worktree, or changes WBS status; the PM opens and closes lanes with `[pm]` commits (`.agents/rules/deus-governance.md`).
