# ADR-003: Sim/Render Split and Level-of-Detail (LOD) Simulation

**Status:** Rev 3, PROPOSED (Lane M, 2026-09-26). Written by Claude, the Lane M writer. Grok reviews it adversarially. It stays PROPOSED until the Owner and the PM sign it off. The author does not self-certify.
- Rev 1 (`ddd1b865`) predates the Lane M review checklist (`tasks/SIM.00.01/lane-m/review_checklist.md`).
- Rev 2 (`c456cb73`) added DEC-013 at nine layers (§15), structural integrity and collapse, V137 (§16), decay and reclamation, V138 (§17), regions of one vertical band (§5.1) and the mass-per-material invariant (§7.8). The independent Grok review of Rev 2 (`tasks/SIM.00.01/lane-m/review_grok_c456cb73.md`, committed as `8e2fed13`) returned FAIL.
- Rev 3 answers that review finding by finding (change log below) and follows `tasks/SIM.00.01/lane-m/BRIEF_REV3.md`. It adds:
  - 32 layers, the governing scale and the amended bands (§5.1, §15);
  - memory and save budgets that grow with MIXED and changed chunks, not with 32 × area, and harnesses at 9 and at 32 layers (§9, §15);
  - cross-layer blasts, volume damage and targeting (§18);
  - DEC-017 as the engine exit path (§13);
  - the other Owner decisions that touch the sim/render boundary, DEC-016 and DEC-019 to DEC-022 (§19);
  - every citation re-checked at `b612bc72` (Appendix C).

**Decision authority:** DEC-012 (Owner, 2026-09-26 00:00 CT, directive 0018-R), recorded in `docs/OWNER_DECISIONS.md:161-168`. This ADR is the detailed design that DEC-012 asks for. It does not reopen DEC-012, and it does not restate or change any other Owner decision; it cites them by id and heading.

**WBS:** SIM.00.01, WBS Rev 24 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:519`). **This package contains no code.**

**Evidence baseline:** `main` at `b612bc72`, the commit the Rev 3 brief names.
- `git diff --stat ebeec892 b612bc72 -- game` is empty (EXIT=0). Under `tools/`, the only changes since the lane base are the merged governance and ops tools (`tools/governance/**`, `tools/ops/**`), which this ADR does not cite. So every code `file:line` below reads the same at the lane base and at `b612bc72`.
- Documents are cited at `b612bc72` unless a commit is named. That includes DEC-013 as amended, DEC-016 to DEC-022, V133 to V151 and WBS Rev 24.
- Plugin paths are relative to `game/js/plugins/` unless a directory is given. `rmmz_*.js` files are in `game/js/`.
- Commands and exit codes are in Appendix B, `tasks/SIM.00.01/lane-m/notes.md` (Rev 1 and 2) and `tasks/SIM.00.01/lane-m/REPORT_REV3.md` (Rev 3).

### Rev 3 change log

Each row is one finding of `review_grok_c456cb73.md`, in the review's order, with the Rev 3 answer and where it is. Line numbers are lines of this file. No finding is disputed.

| # | Finding (review heading) | Rev 3 answer | Where |
|---|---|---|---|
| 1 | Checklist 1 (32 layers): §0 item 7, §5.1, §15 and the §8 row Z specify 9 levels, −4..+4 and the old bands | Retargeted to 32 continuous layers, default −16..+15, surface 0, 320 ft, with the amended bands as PM defaults that stay OPEN for the Owner. A 9-layer range remains only as the named test configuration and −2..+2 as the legacy one | @@CL1@@ |
| 2 | Checklist 1: no 32-layer region count and no amended band table | Region = 32×32 cells × a 2-layer slab: 16 slabs and 1,024 regions per area at 32 layers. Band table added. Nothing in storage or LOD is sized by 32, and the text says how each part scales past it | @@CL2@@ |
| 3 | Checklist 1: fixtures at −2..+2 and −4..+4 only; Q16 asks 5 → 9 | Every core fixture and harness runs at 9 layers (−4..+4) and at 32 layers (−16..+15), plus the legacy −2..+2 for save migration. Q16 retargeted to 32 | @@CL3@@ |
| 4 | Checklist 1: budgets only at 5 and 9 levels; §15.4's worst case multiplies by 9; no 32-layer memory or save target | Budgets restated as formulas in MIXED, damaged and changed chunks, with a 32-layer worst case, 9-vs-32 sparsity checks and absolute targets on named fixtures. The UNIFORM-chunk rule is kept | @@CL4@@ |
| 5 | Checklist 2 (scale): no foot measure; `CELL_FT = 5` and the 1 ft stratum comments not reconciled | Governing scale stated: 5 ft × 5 ft cell, 10 ft layer, 2 ft stratum. The engine's 1 ft assumptions (`DEUS_Levels.js:985-986`, `:1790-1791` and the sphere math) are listed with who changes them. The core measures in integer half-feet | @@CL5@@ |
| 6 | Checklist 3 (blasts): no floor-thickness rule; the existing box, falloff and resist behaviour not taken as design | New §18: the existing behaviour cited as design input; attenuation by material, damage type and thickness along the line to each target; a floor destroyed by the blast lets the rest through; vertical falloff in true feet; fire versus impact; targeting and line of sight | @@CL6@@ |
| 7 | Checklist 4 (V137, PASS): keep, and state that the queue runs on −16..+15 | Kept. The range statement and 9/32 fixtures added | @@CL7@@ |
| 8 | Checklist 5 (V138, PASS): keep | Kept. The range statement and 9/32 fixtures added | @@CL8@@ |
| 9 | Checklist 6 (sections, PASS): §5 band geometry and the §9 32-layer rows missing | See rows 2 and 4 | @@CL9@@ |
| 10 | Checklist 7.1: `applyVolumeDamage` (`:1785-1795`) "calls `damageCell`" | Cited at the JSDoc `:1783-1794`, the signature `:1795`, the box call `:1815` and the sphere call `:1849`; `damageCell` at `:1709-1725` | @@CL10@@ |
| 11 | Checklist 7.2: ecology "each game hour" cited to the six-hour header `:22-27` | Hourly plants and breeding (`:876`, `:888-905`) and the six-hourly population roll (`:907-914`, header `:22-27`) cited separately | @@CL11@@ |
| 12 | Minor: WBS SIM.00.01 pointer `:509` is the table header | Now `docs/worldgen/DEUS_WORLDGEN_WBS.md:519` at `b612bc72` | @@CL12@@ |
| 13 | Minor: Factions "every 120 (`:631-632`)"; `:631` is `CONTACT_CELLS` | Cited as `:632` | @@CL13@@ |
| 14 | "current `main` (`0c1baf8d`)" is stale as a tip name | The baseline is `b612bc72`, with the identity check above | @@CL14@@ |
| 15 | Revision required, items 1 to 5 | Items 1 and 2: rows 1 to 4. Item 3: row 5. Item 4: rows 6, 10 and 11. Item 5: rows 7 and 8; §2 to §4 and §7 to §8 are kept and their Z assumptions now read "any range" (§4.3 key, §7.7 faces, §8 row Z) | @@CL15@@ |
| 16 | Not in the review: the Rev 3 re-check of all 476 Rev 2 citations found 7 FALSE and 23 IMPRECISE ones | Each is corrected, including a wrong claim about Factions counters (`DEUS_Factions.js:619-625`) | @@CL16@@ |

The Rev 3 brief's other items: DEC-017 → §13; DEC-016, DEC-018 to DEC-022 → §18 and §19; `docs/adr/README.md` → Rev 3, PROPOSED; report → `tasks/SIM.00.01/lane-m/REPORT_REV3.md`.

---

## 0. Decision summary

1. **Boundary.** The simulation moves into engine-free modules under `game/js/sim/`.
   - Those modules reference no host global (list in §2.3).
   - RPG Maker MZ (RMMZ) becomes the *host*. It runs the clock, reads a read-only view of sim state, and sends commands. Nothing else crosses the boundary.
2. **Tick.** One fixed tick of **10 Hz at 1x speed.**
   - **1 tick = 36 game-seconds**, so 100 ticks = 1 game hour. The Owner's time scale is unchanged.
   - An integer tick counter is the only clock. The calendar is derived from it.
   - Speed means ticks per real second (10 × the multiplier). A host accumulator runs once per displayed frame.
3. **Output and input.**
   - Out: a versioned, read-only `SimView` with no per-frame copy, plus a preallocated integer change feed.
   - In: one command queue.
4. **LOD.**
   - A region is 32×32 cells across one **slab** of two adjacent layers (§5.1). A 256×256 area has 64 regions per slab. At the DEC-013 default of 32 layers (−16..+15) that is 16 slabs and 1,024 regions per area. The same rule gives 320 at the 9-layer test range and 192 at today's 5 levels.
   - Three levels:
     - **L0 full:** every tick.
     - **L1 near:** fine state, stepped in batches every 10 ticks.
     - **L2 summary:** summary state (anonymous creatures as counts; fluid frozen in place), stepped every 100 ticks (1 game hour).
   - Only regions that hold state are ever scheduled. So LOD work grows with occupied regions, not with the layer count (§5.5).
5. **Conservation.** Every conserved quantity is an integer with a named unit. A ledger records explicit sources and sinks. Promotion and demotion are atomic and checked against the ledger.
6. **Migration.** The work lands in increments, and the game stays playable after each one.
   - Increment 0 is Lane N.
   - LOD stays in `full` mode (every region L0) until SIM.30.04.
7. **Thirty-two layers (DEC-013 as amended).** The core takes its Z range from data, not constants.
   - The default is DEC-013's: 32 continuous layers, −16..+15, surface 0, 320 ft. The range itself is OPEN with that PM default. 9 layers (−4..+4) is the second configuration every test runs; −2..+2 is the legacy range of today's saves.
   - Nothing in the core is sized by 32, so the same code runs past it (§15.2).
   - Storage is by 32×32 chunk per layer. A uniform chunk (all air, or untouched rock) holds no cell arrays. Memory and save size therefore grow with MIXED and changed chunks, not with 32 × area, and empty sky and deep rock cost almost nothing to store, save or step (§15).
8. **Scale (DEC-013).** A cell is 5 ft × 5 ft, a layer is 10 ft and a stratum is 2 ft. The core measures distance in integer half-feet. Today's engine comments and sphere damage assume 1 ft strata; the core doesn't (§15.0).
9. **Structure and decay (V137, V138).**
   - Support, collapse, decay and reclamation are core systems.
   - They are change-driven (dirty queues fed by mutations), never scanned per tick.
   - Decay is a closed-form function of elapsed time, so it gives the same result at any LOD and in deep history. The one exception is when an exposure change takes effect (§17.5); §16 and §17 cover the rest.
10. **Blasts, spells and targeting (DEC-013, DEC-018, DEC-022).** Volume damage is one core system (§18).
    - Damage falls off with true 3D distance.
    - Every solid stratum between the centre and a target attenuates it, by material and damage type, so a thicker floor stops more.
    - A floor the blast destroys lets the remainder through to the layer below.
    - Spell effects are data that call core primitives (ignite, blast, fluid source and sink, freeze, terrain edit), never per-spell code.
11. **Engine exit path (DEC-017).** RMMZ stays the application shell.
    - If its map drawing can't meet the goals, a custom multi-layer PixiJS map renderer replaces map drawing inside `Scene_Map` only.
    - The renderer only reads `SimView` and sends commands, so the swap touches no sim code (§13).
12. **Budgets.**
    - Storage budgets (memory and save size at 9 and 32 layers) follow from the storage design, so they are set now (§9).
    - Time budgets are design ceilings marked **PENDING-K3**. Each names the Lane K K3 measurement that will fill it. At the time of writing, Lane K's K3 baselines were on a local, unreviewed Lane K commit only, not on `main` (Appendix B).
    - The time ceilings must be amended with measured baselines before SIM.00.03 starts (§9).

### 0.1 Section crosswalk

The Lane M BRIEF lists nine sections. Directive 0018-R §3c lists sixteen items, and WBS SIM.00.01's Definition of Done points to 0018-R §3. This ADR covers both lists.

| ADR section | BRIEF section | 0018-R §3c item |
|---|---|---|
| §1 Context & Motivation | 1 | 1 (re-verified PM survey: Appendix A) |
| §2 Sim/Render Boundary & Module Layout | 2 | 2 (boundary), 3 (module layout) |
| §3 Tick Model & Sub-tick Accumulator | 3 | 4 |
| §4 Snapshot Interface & Change Feed | 4 | 5 |
| §5 LOD Region Model | 5 | 6 |
| §6 Summary Simulation | 6 | 7 |
| §7 Promotion & Demotion with Conservation Invariants | 7 | 8, 9 |
| §8 Migration Increments | 8 | 11 |
| §9 Performance Budgets | 9 | 12 |
| §10 Determinism | (3, 7) | 10 |
| §11 Save Format & Compatibility | — | 13 |
| §12 Alternatives, Risks, Open Questions | — | 14 |
| §13 Engine Exit Path (DEC-017) | — | 15; Rev 3 brief item 4 |
| §14 Deep-History World Generation | — | 16 |
| §15 Thirty-Two Z Layers and the Governing Scale (DEC-013) | — | review checklist items 1 and 2 |
| §16 Structural Integrity & Collapse (V137) | — | review checklist item 4 |
| §17 Decay & Reclamation (V138) | — | review checklist item 5 |
| §18 Cross-Layer Blasts, Volume Damage and Targeting | — | review checklist item 3; DEC-018; DEC-022 |
| §19 Owner Decisions at the Sim/Render Boundary | — | Rev 3 brief item 5: DEC-016, DEC-019, DEC-020, DEC-021 |

The checklist item numbers are those of `review_checklist.md` as the Rev 2 review applied it: 1 layers, 2 scale, 3 blasts, 4 support, 5 decay, 6 sections, 7 facts.

---

## 1. Context & Motivation

### 1.1 How the simulation runs today

**The frame loop.**
- On every PIXI tick, RMMZ's `SceneManager.update` calls `updateMain` n times (`rmmz_managers.js:1982-1991`).
- `determineRepeatNumber` smooths the PIXI `deltaTime` and clamps each sample to 2 (`rmmz_managers.js:1993-2010`). In practice it returns about one update per 60 Hz frame:
  - at refresh rates above 60 Hz it skips frames;
  - at 30 FPS it returns 2.
- `updateMain` increments `Graphics.frameCount` and updates the scene (`rmmz_managers.js:2102-2112`). The scene is updated only while the window has focus (`rmmz_managers.js:2146`, `:2157-2165`).
- `Scene_Map.update` calls `updateMainMultiply` (`rmmz_scenes.js:819-831`, the call at `:824`). That runs `updateMain` once, or twice under RMMZ's fast-forward (`rmmz_scenes.js:833-839`). `updateMain` calls `$gameMap.update(this.isActive())` (`rmmz_scenes.js:841-846`).

**The simulation is a chain of aliases.**
- There are 32 reassignments of `Game_Map.prototype.update` / `Scene_Map.prototype.update` across 26 plugins (§1.2; grep in Appendix B).
- Their run order is the `game/js/plugins.js` order (42 entries, all `"status": true`), plus companions that `DEUS_Core.js:74-98` loads with `require`.
- Code already depends on that order. `DEUS_Jobs.js:1778`: "UF_World moved the units first (its alias is below ours)".

**Speed.**
- `DEUS_TimeSpeed` multiplies n by the speed inside `determineRepeatNumber` (`DEUS_TimeSpeed.js:147-153`) and replaces `SceneManager.update` (`:158-173`).
- The speeds are 1, 2, 4, 8, 16 and 32. 16 and 32 are always added to the list, whatever the parameter says (`:45-50`).
- So one sim step equals one `updateMain`. At 8x there are 480 `Game_Map.update` calls per second at 60 Hz.
- On intermediate sub-ticks, TimeSpeed's `Scene_Map.update` runs only `updateMain` and the clock (`:231-241`). But every `Scene_Map.update` wrapper from a plugin loaded *after* TimeSpeed (`plugins.js:184`) still runs its own body on every sub-tick. Examples: Levels `:4287`, NaturalConnections `:508`, Depth `:834`.

**Pause.** Pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`). `SceneManager.updateMain` and every `Scene_Map.update` wrapper keep running.

**The clock.**
- `$ufTime.update` adds `1/60` per call and advances one game minute per `timeSpeed = 1/6` (`DEUS_Core.js:60-62`, `:304-311`). That is 10 calls per game minute (`ticksPerMinute`, `:376-378`).
- Probe (Appendix B): 600,000 calls gave 60,000 minutes, each exactly 10 calls apart. There is no float drift, but the clock counts calls, not time.
- The clock runs from `Scene_Map.update` (`DEUS_Core.js:505-510`) and, explicitly, on TimeSpeed sub-ticks (`DEUS_TimeSpeed.js:236`).
- It stops while a message is busy (`DEUS_Core.js:305`).
- The year advances once per game day (`DEUS_Core.js:321-325`). But `docs/systems/UF_History.md:1161` says a year "takes over 100 real hours at ×1". See Q12.

**The code disagrees about what a tick is.**
- `DEUS_Colonists.js:48`: `NEEDS_EVERY = 60; // ticks per needs tick (one game minute)`.
- `DEUS_Environment.js:52`: `TICKS_PER_STEP = 60; // 1 beat / 1 game second`.
- `DEUS_TimeSpeed.js:33`: "60 frames = 1 game minute".
- `DEUS_Core.js` (above): 10 frames = 1 game minute.
- `docs/ARCHITECTURE.md:18`: "Engine (20 Hz computation)".

**Gates differ between systems.**
- Ecology and Colonists skip their step while the scene is inactive (`DEUS_Ecology.js:994`, `DEUS_Colonists.js:5750`). World, Fluid, Fire and Jobs do not.
- The whole simulation stops in menus, because `Game_Map.update` is called only from `Scene_Map.updateMain`. It also stops when the window loses focus (above).

### 1.2 Tick-hook inventory (32 hooks in 26 plugins)

| Plugin:line | Hook | Role | Cadence / gate |
|---|---|---|---|
| DEUS_World.js:2932 | Game_Map.update | **sim**: `World.update` moves every unit (`:1677-1702`) | every call |
| DEUS_Fluid.js:1016 | Game_Map.update | **sim**: `Fluid.tick()` (`:731-752`) | every call; 512-cell budget (`:55`) |
| DEUS_Ecology.js:992 | Game_Map.update | **sim**: `stepBeat` sprouts (`:764-872`) | 60 calls, only while `sceneActive` (`:994-999`) |
| DEUS_Fire.js:617 | Game_Map.update | **sim**: `safeBeat` | `beatFrames()`, default 60 (`:138-140`) |
| DEUS_Environment.js:796 | Game_Map.update | **sim**: unit thermal. Also writes screen weather (`:690-710`) | unit id spread over 60 (`:730-744`) |
| DEUS_Colonists.js:5748 | Game_Map.update | **sim**: needs and job sweep | needs every 60 (`:48`), sweep every 30 (`:63`); skipped while inactive or paused (`:5750`) |
| DEUS_Jobs.js:1777 | Game_Map.update | **sim**: job step | every call |
| DEUS_Projects.js:1596 | Game_Map.update | **sim**: projects | cycle every `cadenceTicks: 3000` (`:38`) |
| DEUS_Combat.js:1414 | Game_Map.update | **sim**: `step()` | every call |
| DEUS_Factions.js:657 | Game_Map.update | **sim**: `checkContact` | every 120 (`DEUS_Factions.js:632`) |
| DEUS_Ownership.js:613 | Game_Map.update | **sim**: `scanSleep` / `reconcile` | own counters |
| DEUS_TimeSpeed.js:189 | Game_Map.update | **sim**: `UF.Time.after/every` timers (closures) | every call |
| DEUS_Anim.js:1506 | Game_Map.update | **render writing sim**: death queue calls `W.removeUnit` (`:1509-1522`) | every call |
| DEUS_Fog.js:638 | Game_Map.update | presentation: `Fog.refresh` (Fog is force-disabled, `:510-518`) | every 20 (`:53`) |
| DEUS_Wildlife.js:1195 | Game_Map.update | empty ("AI update loop wiped", `:1197`) | — |
| DEUS_Core.js:505 | Scene_Map.update | **sim**: calendar `$ufTime.update()` | every call, except while a message is busy |
| DEUS_Core.js:175 | Scene_Map.update | NW.js logging and autotest | every call |
| DEUS_NaturalConnections.js:508 | Scene_Map.update | **sim**: `updateFluids(); stepCreatures();` (`:512-515`) | `Graphics.frameCount % 30`; runs while paused (§A.4) |
| DEUS_TimeSpeed.js:232 | Scene_Map.update | host: sub-tick split and speed keys | every call |
| DEUS_Combat.js:1479 | Scene_Map.update | input: debug raid key | every call |
| DEUS_Factions.js:751, :1156 | Scene_Map.update | UI: ledger key, window skins | every call |
| DEUS_History.js:3662, :3780 | Scene_Map.update | UI: chronicle keys; test capture | every call |
| DEUS_Levels.js:4287 | Scene_Map.update | UI and input: level keys, `mapFrames++` | every call |
| DEUS_Depth.js:834 | Scene_Map.update | UI: preset key | every call |
| DEUS_ColonyOverseer.js:196, DEUS_Containers.js:1323, DEUS_Interact.js:885, DEUS_Select.js:2289, DEUS_Sheet.js:2252, DEUS_Talk.js:1938 | Scene_Map.update | input, UI and commands | every call |

That is 15 `Game_Map.update` hooks and 17 `Scene_Map.update` hooks.

### 1.3 Detail and outcomes depend on what is on screen

**Units** (`World.update`, `DEUS_World.js:1677-1702`).
- A unit on the viewed level that has an event copies its position *from* the `Game_Event` (`:1686-1698`). It moves with RMMZ movement: `stepOnscreen` / `stepDirect` (`:1633-1675`), dropping its goal after `STUCK_LIMIT = 300` frames (`:140`).
- Every other unit jumps one whole cell every `unitStepFrames = 16` frames (`:136`, `:1689`, `:1699-1701`), along a planned path or straight toward its goal (`:1613-1628`).
- **The two paths also differ in speed.**
  - On screen, speed follows `u.data.moveSpeed` and conditions (`unitMoveSpeed`, `:847-855`), through RMMZ's `2^speed / 256` cells per frame (`rmmz_objects.js:7062-7064`). The default speed 4 gives 1/16 cell per frame.
  - Off screen, every unit takes 16 frames per cell.
  - So a slowed or hasted unit moves at a different speed depending on whether it is watched.
- Every unit on view is a `Game_Event` with a `Sprite_Character` (`spawnUnitEvent`, `DEUS_World.js:888-911`).

**Fluid.**
- `Fluid.tick` steps only the viewed area when there is a view (`DEUS_Fluid.js:737-745`).
- *Correction to the PM survey:* by default `AreasX = AreasY = 1` (`DEUS_World.js:127-128`), and the `DEUS_World` parameters are `{}` (`plugins.js:58`). So there is exactly one area. `stepArea` works through that area's one queue, up to its budget per call (`DEUS_Fluid.js:356-376`), and the queue holds cells of all 5 levels (the level is decoded per cell, `DEUS_Fluid.js:380-383`). The view restriction only matters in multi-area worlds.

**Ecology.**
- Each game hour it spreads plants and steps breeding in the current area plus one rotating area (driver comment `DEUS_Ecology.js:876`; `tickHour`, `:888-905`; `cursorArea`, `:878-886`). Every sixth hour (`POPULATION_INTERVAL = 6`, `DEUS_Ecology.js:45`) the same two areas also get the population roll (`DEUS_Ecology.js:907-914`; header `:22-27`). The same 1×1 qualification applies.
- Its other view dependences do matter:
  - `currentArea()` is ground-only and returns null while another level is viewed (`DEUS_World.js:532`; header `:106-108`);
  - sprouts spawn only in the current area (`DEUS_Ecology.js:803`);
  - spawn protection uses the player cursor's position (`:452-453`).

**Fire.** Campfire escapes and accidental starts happen only in the viewed area and level, and they read `window.$dataMap.ufObjects` (`DEUS_Fire.js:488-494`, `:562-588`).

**Presentation plugins that change sim outcomes:**
- Opening a unit's Sheet assigns its D&D class, HP and AC if the unit has none yet (`DEUS_Sheet.js:833-846`).
- After a combat death, the unit is removed by DEUS_Anim: either by its `Game_Map.update` death queue (`DEUS_Anim.js:702`, `:714`, `:1504-1522`) or by its `onUnitDeath` wrapper (`:1605-1631`, removal at `:1624`).
- DEUS_Culling wraps `World.update`, `addUnit`, `removeUnit`, `moveUnitToLevel` and `reconcileEvents` so they run inside the spriteset (`DEUS_Culling.js:292-307`).
- DEUS_Tiles replaces `Tilemap.isWaterTile`, writes tileset passability into `$dataTilesets` (`DEUS_Tiles.js:505-512`), and wraps `World.buildArea` (`:1247-1256`).
- DEUS_Camera replaces `isNearTheScreen` (`DEUS_Camera.js:85-93`). That function gates RMMZ event self-movement (`rmmz_objects.js:9220-9224`).

**Terrain and the view level.**
- Terrain reads go through RMMZ-format `$dataMap` builds (`World.buildArea`, `DEUS_World.js:595-640`), cached 6 deep (`:801`, `:811-822`).
- Builds kept for off-screen reads "may be older than the generators' inputs" (`:2819-2820`).
- The viewed level *is* the RMMZ map id (`viewLevel`, `:535-539`), so a level switch is a map transfer (`DEUS_Levels.js:4179-4193` → `DEUS_World.js:2724-2730`). Lane N is removing that.

### 1.4 Conservation holes found

- **NaturalConnections creates water.** `addFluid` writes water into the lower cell without removing any from the upper cell (`DEUS_NaturalConnections.js:312-329`, called at `:352-353`). This happens every 30 frames for each wet link.
- **Fluid reconciliation loses water.** It moves excess fluid up and sideways, and any excess still left afterwards is dropped (`DEUS_Fluid.js:896-923`).
- **Ecology creates ore.** Sprouts turn `rocks_small` into ironstone, copper or gold outcrops (`DEUS_Ecology.js:736-752`). The file's own header says ore is finite (`:20`), and so does INV-SIM-03 (`docs/INVARIANT_REGISTRY.md:53`).
- **Destroying a stratum deletes its matter.** A destroyed stratum becomes air (`DEUS_Levels.js:1700-1702`). Its debris is only named in the `levels:strataDestroyed` event (`:1720-1722`); "no item drops in 19A" (`:1001-1002`). This is a LIFE-001 hole (`docs/RISK_REGISTER.md:60`) that §16 closes.
- **There is no material ledger.** Searching the plugins for `ledger|conserv` finds only:
  - Fluid's comments;
  - a barter-credit ledger (`DEUS_Colonists.js:648-670`);
  - a death log;
  - UI window names (Appendix B).
- **Faction counters depend on unit events.** Faction population goes up on `factions:born` and `factions:immigrated`, and down on `combat:kill` and on `world:unitRemoved` for a unit that is dead or dying (`DEUS_Factions.js:594-625`; the dead-or-dying test is at `:620`). It is a running counter, not a count of units, so LOD absorption must keep it equal to the members it stands for (§7.4, §7.8).
- **Save/load loses state that shapes future ticks:**
  - the clock's sub-minute `_timer` (the save holds hour..year only, `DEUS_Core.js:448-468`);
  - the Fluid queue order (cells are woken again in record order, `DEUS_Fluid.js:846-866`);
  - unit path plans (dropped on load, `DEUS_World.js:2915`);
  - TimeSpeed timers, which are closures held in a Map (`DEUS_TimeSpeed.js:54`, `:84-95`).

### 1.5 What exists to build on

- **Seeded primitives:**
  - `hash32` (FNV-1a) and `mulberry32` (`DEUS_World.js:187-211`);
  - `World.rngFor(ax, ay, salt)` (`:545-548`);
  - the generator rule "never Math.random" (`:556`).
- **Stable integer IDs:**
  - units (`nextUnitId`, `DEUS_World.js:429`, `:1133`);
  - items (`DEUS_Items.js:304`);
  - jobs (`DEUS_Jobs.js:101-107`);
  - fires (`DEUS_Fire.js:214`).
- **Integer fluid.** Depth is 0..7 (`DEPTH_MAX`, `DEUS_Fluid.js:50`), packed with the type into one byte (`:127-137`) in one `Uint8Array` grid per level (`:179`, `:187-189`). A dirty-queue stepper runs against a work budget (`:55`, `:356-376`).
- **Headless tools:**
  - 78 files under `tools/` use `vm` (Appendix B).
  - DEUS_Fluid runs alone in a vm (`tools/test_liquid_depth_simulation.js:121-125`) and exports `module.exports` (`DEUS_Fluid.js:1025-1026`).
  - World, WorldGen, Factions, History and Levels run in a vm with throwing engine stubs and a throwing `Math.random` (`tools/bench_history_sim.js:13`, `:37-122`, `:66-67`). But that tool exits 1 at `ebeec892` (§14.1).

### 1.6 Why change now

- **DEC-012.** The Owner ordered the split and LOD.
- **Cost.**
  - Today's model costs one full sim step per `updateMain`. At 8x that is 480 steps per real second, with no headroom and no ceiling.
  - The render work of sub-tick wrappers is repeated too (§1.1).
- **Correctness.**
  - What the player watches changes outcomes (§1.3).
  - Conserved quantities leak (§1.4).
  - The same code can't run headless for tests or for deep history (§14).

---

## 2. Sim/Render Boundary & Module Layout

### 2.1 What is sim and what is render

**Sim** is every piece of state that is saved *and* influences a future tick, plus the rules that change it. **Render** is everything derived for display, input interpretation, UI, audio or camera.

| Concern | Side | Notes |
|---|---|---|
| Terrain shapes, strata, tiles as data, objects, diffs | sim | Static layers are generated from the seed, plus diffs (§6) |
| Units: position, goal, path, movement progress, needs, health, inventory | sim | Stable IDs |
| Items, containers, stockpiles | sim | |
| Fluid, fire, environment (weather state, unit thermal), ecology, jobs, projects, combat, factions, households, ownership, natural connections | sim | |
| Calendar and game-time timers | sim | Timers become data, not closures (§10) |
| LOD regions and summaries | sim | |
| History (world creation) | sim | Headless already (§14) |
| Camera, view level, zoom, scroll | render (host) | The camera reaches the sim only as a logged focus command (§5.3) |
| RMMZ tile-ID map builds (`$dataMap` format), autotile shading | render | Projections of the view (§4.6) |
| Sprites, tweens and interpolation, animation frames, hitsplats, speech bubbles | render | Rule 12: frames come from sheets |
| Fog-of-war display, minimap discovery bitsets, selection, the UI state of plans and zones | render (saved in `deusView`, §11) | They move out of `World.state` (`DEUS_Fog.js:119`, `DEUS_Minimap.js:840-843`, `DEUS_Select.js:321`, `:3411` (a test path), `DEUS_Levels.js:4203-4204`) |
| Screen tone and weather particles | render | Driven from the view, never written by the sim (`DEUS_DayNight.js:121-127`, `DEUS_Environment.js:690-710` today) |
| Speed, pause, pause reasons | host | Not sim state: they change how many ticks run, never what a tick does |

### 2.2 The only two crossings

1. **Commands in.** `sim.command(record)` appends to one queue. Commands are applied at the start of the next tick in `(tick, seq)` order and logged (§4.4).
2. **View out.** `sim.view()` returns the read-only `SimView`, and `view.feed` is the change feed (§4.1, §4.3).

The host also calls `sim.step()` and `sim.save()` / `sim.load()`. Neither side holds a reference to the other's objects between frames, only IDs.

### 2.3 Identifiers forbidden in `game/js/sim/**`

These may not be named anywhere in the core, by reference or by property path on a global:
- the platform and host globals: `window`, `document`, `globalThis`, `self`, `global`, `process`, `require` (except the loader's injected `require`, §2.5), `nw`, `localStorage`, `setTimeout`, `setInterval`, `requestAnimationFrame`, `performance`, `Date`;
- the rendering and engine layer: `PIXI`, `Graphics`, `Input`, `TouchInput`, `SceneManager`, `DataManager`, `StorageManager`, `ImageManager`, `AudioManager`, `SoundManager`, `PluginManager`, `Utils`, `JsonEx`, `Tilemap`, `Bitmap`;
- the RMMZ data and game objects: `$game*`, `$data*`, `$uf*`, `$deus*`, and `Game_*`, `Scene_*`, `Sprite*`, `Spriteset_*`, `Window_*`;
- the facade: **`UF` and `DEUS`**. The core must not reach the facade it will eventually back;
- `Math.random`.

Everything else is ECMAScript built-ins: `Object`, `Array`, typed arrays, `Map`, `Set`, `Math` (limited by §10.4), `Number`, `String`, `JSON`, `Error` and `Symbol`.

### 2.4 Module layout

The core lives under `game/js/sim/`. It is plain JavaScript and purity-checked.

```
game/js/sim/
  kernel/   loader.js (CommonJS-subset loader; readSource and compile are injected)
            sim.js (createSim(config) -> { step, command, view, save, load, checksum })
            clock.js (tick and calendar)  schedule.js (system order and cadences)
            rng.js (hash32 and mulberry32, ported from DEUS_World.js:187-211; stream derivation)
            commands.js  feed.js  ledger.js  checksum.js  serialize.js
  world/    grid.js (area, level, cell and region math)  terrain.js (static layers from seed + diffs)
            tilecodes.js (a pure port of the RMMZ tile-ID helpers, rmmz_core.js:2672, :2682, :2694, :2726, :2793)
            units.js (registry, occupancy, spatial index)  paths.js (port of DEUS_World's A* planner)
  systems/  movement.js fluid.js fire.js environment.js ecology.js needs.js jobs.js projects.js
            combat.js factions.js ownership.js connections.js timers.js
  lod/      regions.js focus.js scheduler.js promote.js demote.js summary/<system>.js
```

The host side is one plugin plus node tools:
- **`game/js/plugins/DEUS_SimHost.js`** (new; it needs a `plugins.js` entry, so the editor must be closed):
  - loads the core;
  - owns the accumulator and the pause policy;
  - adapts the view to RMMZ objects (sprites, events as puppets, map builds);
  - turns input into commands;
  - keeps the legacy facades working (§2.6);
  - adds the save hooks.
- **`tools/sim/`:**
  - `run_headless.js` and `check_sim_purity.js` (SIM.00.02);
  - fixtures (§11.4).

### 2.5 How NW.js and node both load the core

- **Module format.** Every core file is a CommonJS subset:
  - `module.exports = …`;
  - `require("./relative/path")` only, and only for other files under `game/js/sim/`.
- **The loader.** `kernel/loader.js` is itself pure: `createLoader({ readSource, compile })`.
  - **Node (tools, tests):** `readSource = fs.readFileSync`. `compile` = `vm.runInContext` inside a context that contains only the allowed built-ins, with `Math.random` replaced by a throwing function. This is how `tools/bench_history_sim.js:66-67` already blocks `Math.random`.
  - **NW.js (game):** `DEUS_SimHost.js` gets `loader.js` through NW.js's `require` (the same mechanism `DEUS_Core.js:98` already uses). It passes `readSource` from `fs` and a `compile` built on `Function("module", "exports", "require", src)`, so the core objects live in the page's JS realm. PIXI never has to handle typed arrays from another realm.
  - Both runtimes execute the same source bytes. The loader records a SHA-256 of each module, and a test compares the node and NW.js module hash lists.
- **Deployment.** No build step, bundler or transpiler is needed. RMMZ deployment copies `game/js/` as it is.

### 2.6 Keeping the `UF.*` facades stable during migration

The facade objects (`UF.World`, `UF.Fluid`, `UF.Levels`, `UF.Time`, `UF.Jobs`, `UF.Items` and the rest) keep their names and signatures. During migration, `DEUS_SimHost.js` re-points each facade method, system by system:

| Facade method kind | Before its system migrates | After its system migrates |
|---|---|---|
| Read (`UF.World.unit(id)`, `unitsInArea`, `UF.Fluid.depthAt`, `UF.Levels.shapeAt`, …) | the plugin's own state | a thin wrapper over `SimView` (same return shape) |
| Write called by *legacy sim* plugins (for example Jobs moving a unit before Jobs migrates) | the plugin's own state | `sim.applyNow(command)`: applied synchronously *between* ticks, and logged like any command |
| Write called by *render or UI* plugins | direct write (the violations in §4.5) | `sim.command(...)`, applied at the next tick |
| Events (`UF.Events.emit("world:unitMoved", …)`) | emitted by the plugin | the host re-emits them from the change feed, once per frame, in feed order |

Rules for the facades:
1. **Scope.** `applyNow` exists only for the legacy sim plugins listed in the SimHost manifest. It is removed when the last one migrates (end of SIM.00.05).
2. **Two clocks.** During the hybrid period, legacy systems still run on `Game_Map.update` in the *engine-frame* time domain (60 × speed per second). Core systems run in the *sim-tick* domain (10 × speed per second). INV-SIM-02 (`docs/INVARIANT_REGISTRY.md:52`) requires every timer to name its domain. The determinism guarantees in §3.10 and §10 cover the core alone, not the hybrid.

### 2.7 Enforcing purity (SIM.00.02 DoD 4)

`tools/sim/check_sim_purity.js` runs two layers:
1. **Static.** It tokenizes every file under `game/js/sim/`, ignoring comments and strings, and fails on any identifier in §2.3.
2. **Dynamic.** It loads the whole core with the node loader into a context that has none of those globals, and runs 100 ticks on a fixture. Reading any other global throws a `ReferenceError`.

It must be shown to fail on two mutants: one that adds `window.x`, and one that adds `Math.random()`.

---

## 3. Tick Model & Sub-tick Accumulator

### 3.1 Tick rate: 10 Hz, one tick = 100 ms of 1x game-time

**Justification:**
1. **DEC-012 names it.** The Owner's order records 10 Hz.
2. **It maps today's cadences exactly.** Every sim cadence in §3.3 is a multiple of 6 frames at 60 Hz, which is one 10 Hz tick, except two:
   - the unit step (16 frames) moves to an integer progress accumulator (§3.9);
   - the calendar minute (10 frames) becomes derived (§3.2).
3. **It costs 1/6 of today's work.** Tick-driven systems do one sixth of today's per-second work at the same speed. 8x becomes 80 ticks per second instead of 480 steps.
4. **Latency is acceptable.** A command waits at most one tick, 100 ms at 1x. UI feedback such as ghost designations and selection is immediate, because it is render-side.

**Alternatives rejected:**
- **20 Hz** (`docs/ARCHITECTURE.md:18`) doubles the cost and still doesn't make 16- or 10-frame cadences integral.
- **60 Hz** (today) ties the simulation to the display's nominal rate, which is the thing being removed.

### 3.2 Calendar

- One tick is **36 game-seconds**. The Owner's scale is 1 real minute = 6 game hours (`DEUS_Core.js:60-61`), so:

  | Game period | Ticks | Real time at 1x |
  |---|---|---|
  | 1 game hour | 100 | 10 s |
  | 1 game day | 2,400 | 240 s |

- `clock.gameSeconds = tick × 36` is an exact integer.
  - Hour, day and season boundaries fall on whole ticks.
  - A game minute is 1⅔ ticks. `time:minute` fires on the tick where `floor(gameSeconds / 60)` changes, never twice in one tick (36 < 60).
- The calendar rules themselves (months, seasons, the current year-per-day rule at `DEUS_Core.js:321-325`) are not changed by this ADR. They are ported as they are. Q12 is about the conflicting year definition.

### 3.3 Converting today's cadences

| Constant | Today (frames at 60 Hz) | Evidence | Ticks at 10 Hz |
|---|---|---|---|
| Unit step | 16 | `DEUS_World.js:136` | speed 375 milli-cells per tick (3.75 cells/s, the same as today) |
| Stuck limit | 300 | `DEUS_World.js:140` | 50 |
| Ecology beat | 60 | `DEUS_Ecology.js:996` | 10 |
| Fire beat (default) | 60 | `DEUS_Fire.js:138-140` | 10 |
| Environment step | 60 | `DEUS_Environment.js:52` | 10 |
| Needs / sweep | 60 / 30 | `DEUS_Colonists.js:48`, `:63` | 10 / 5 |
| Faction contact | 120 | `DEUS_Factions.js:631-632` | 20 |
| NaturalConnections | 30 | `DEUS_NaturalConnections.js:512` | 5 |
| Projects cycle | 3000 | `DEUS_Projects.js:38` | 500 |
| Fluid budget | 512 cells per call | `DEUS_Fluid.js:55`, `:1016-1019` | 3072 cells per tick (same throughput) |
| Calendar minute | 10 | `DEUS_Core.js:60-62`, `:304-311` | derived: `tick × 36 s` |

- Each `SIM.00.05/<system>` sub-lane owns converting its own constants, and must show a before/after rate check. Examples: game-minutes per real second, fluid cells moved per real second on a fixture.
- Systems that run on every call today (Jobs, Combat) are expressed per tick. Their rule constants are retuned in their sub-lane.

### 3.4 The accumulator (host, once per displayed frame)

`DEUS_SimHost.js` wraps `SceneManager.update`, the outermost per-PIXI-tick entry, so it runs exactly once per rendered frame, however many `updateMain` calls follow.
- TimeSpeed replaces `SceneManager.update` without calling the function it captured (`DEUS_TimeSpeed.js:158-173`). So SimHost must load **after** TimeSpeed in `plugins.js` and wrap whichever function is current.
- The accumulator runs before the repeat loop.

```
// host state: acc (ms of scaled game time), lastMs, speed, pauseReasons (a set), dropped
onFrame(nowMs):
  dtReal = clamp(nowMs - lastMs, 0, MAX_FRAME_DT_MS)          // 250 ms; a stalled frame never becomes a burst
  lastMs = nowMs
  if pauseReasons is empty: acc += dtReal * speed
  n = 0; t0 = hostClock()
  while acc >= TICK_MS and n < MAX_TICKS_PER_FRAME and hostClock() - t0 < SIM_FRAME_BUDGET_MS:
      sim.step(); acc -= TICK_MS; n += 1                       // TICK_MS = 100
  if acc > MAX_BACKLOG_MS:                                     // catch-up guard (§3.7)
      dropped += floor((acc - MAX_BACKLOG_MS) / TICK_MS); acc = MAX_BACKLOG_MS
  alpha = min(acc / TICK_MS, 1)                                // render interpolation (§3.9)
```

- The time source is the host's `performance.now()`, not RMMZ's smoothed `deltaTime`. So 30, 60 and 144 FPS displays get the same number of ticks per real second.
- The frame-to-tick mapping may vary. The tick-to-state mapping may not (§3.10).

### 3.5 Speeds

- **Rate.** Ticks per real second = 10 × multiplier. The values required here are 1, 2, 4 and 8. §9 states budgets for 1x and 8x, as 0018-R asks.
- **16x and 32x.** Today they are forced into the list (`DEUS_TimeSpeed.js:46-47`). They stay "best effort": if the guard in §3.7 caps them, the HUD shows the effective rate. Whether to keep them is Q3.
- **Removing the repeat hack.** The `determineRepeatNumber` × speed hack (`DEUS_TimeSpeed.js:147-153`) and the sub-tick split (`:155-185`, `:231-241`) are removed *when the last legacy sim system has migrated* (§8, Increment 4.last). From then on, RMMZ updates presentation once per frame and the speed exists only in the accumulator.

### 3.6 Pause and host pause reasons

- Pause is a set of reasons on the host: `user` (Space), `menu` (a non-map scene), `unfocused`, `message` (`$gameMessage.isBusy()`) and `modal`.
- Today several of these pause the game implicitly (§1.1). Making them explicit keeps today's behaviour, and each one becomes testable.
- While paused:
  - `acc` does not grow and the core does not step;
  - the view stays valid, so the renderer keeps drawing and interpolation holds at `alpha`;
  - commands are still queued. Commands that take no game time, such as designations and orders, are applied at the current tick boundary on the next `sim.applyCommands()` call. They carry the current tick in the log, so a replay puts them in the same place.

### 3.7 The catch-up guard

| Constant | Value | Purpose |
|---|---|---|
| `MAX_TICKS_PER_FRAME` | 8 | covers 32x at 60 FPS (5.3 ticks per frame) |
| `SIM_FRAME_BUDGET_MS` | 6 (the 8x `sim.frame_ms` ceiling in §9; replaced when §9 is amended from K3) | the per-frame time cap on the tick loop |
| `MAX_BACKLOG_MS` | 500 | ticks beyond it are dropped |

- Dropped ticks are counted in `host.stats.dropped` and shown in diagnostics. Dropping lowers the effective speed. It never skips *inside* a tick.
- The wall-clock budget decides only *how many* ticks run this frame, never what a tick does. So determinism holds (§3.10).

### 3.8 Order of systems within a tick

`kernel/schedule.js` holds one explicit ordered list. It replaces the implicit alias order (§1.1).

1. Apply commands: queued, in `(tick, seq)` order.
2. Clock: advance the tick, emit calendar boundaries.
3. Movement and paths (L0 regions; L1 regions whose batch is due).
4. Fluid, then natural connections.
5. Fire.
6. Environment.
7. Ecology.
8. Needs.
9. Jobs, then projects.
10. Combat.
11. Factions contact.
12. Ownership.
13. Timers.
14. LOD phase (every 10 ticks, §5.5; transitions §7.1).
15. Ledger bookkeeping.
16. Seal the change feed for this tick.

Cadences are expressed as `(everyTicks, phaseOffset)`, for example needs `(10, 5)`, so work is spread across ticks as it is today.

### 3.9 Render interpolation and the movement model

- **Movement (SIM.00.04).**
  - Each unit has `speed` (milli-cells per tick; default 375) and `progress` (0 up to the cost of the next step).
  - A step costs 1000 when straight and 1400 when diagonal. That is exactly the 5:7 octile ratio the current A* planner uses (`DEUS_World.js:1709-1710`, "octile costs (5 straight, 7 diagonal)").
  - Each tick, `progress += speed`. While `progress >= cost(next)`, the unit steps one cell if the cell is free, and `progress -= cost`.
  - A blocked unit keeps `progress` capped at the cost and counts `stuckTicks`. It drops its goal at 50 ticks.
  - The same model runs for every unit, watched or not. It replaces the on-screen RMMZ movement / off-screen 16-frame jump split (§1.3).
- **Rendering.**
  - The view exposes `fromX/fromY/fromZ`, `x/y/z`, `progress`, `cost` and `speed`.
  - The host draws the sprite at `from + (to − from) × min(1, (progress + alpha × speed) / cost)`. The walk cycle steps through the sheet's frames (Rule 12). Translating a sprite between cells is movement, not an after-effect.
  - Lane K's K2a tween becomes this interpolation once SIM.00.04 lands. Until then it keeps its current source.

### 3.10 Testable statements (SIM.00.02)

1. `state(N ticks)` is the same whether the ticks were driven as 1, 2, 4 or 8 sub-ticks per frame, or with random frame gaps and dropped frames. The checksum is compared (SIM.00.02 DoD 3).
2. Two runs with the same seed and the same command log give identical checksums at every 600th tick (DoD 2).
3. `sim.step()` never reads the host clock. `check_sim_purity.js` enforces it (§2.7).

---

## 4. Snapshot Interface & Change Feed

### 4.1 `SimView`: versioned, read-only, no copying

- **One object.** `sim.view()` always returns the same object. Its fields:
  - `schema` (an integer, starting at 1);
  - `tick`;
  - accessors (below).
- **Consistency without copying.** JavaScript runs on one thread, and the core changes state only inside `sim.step()` and `sim.applyCommands()`. So any read between two host calls sees one consistent state at `view.tick`. Consistency comes from call discipline, not from a copy. Nothing is copied per frame.
- **Revision counters.** `view.rev(layer, ax, ay, z)` returns an integer that goes up on every change to that layer on that level. Fluid already keeps one (`data.revision`, `DEUS_Fluid.js:184`, `:671`). Renderers skip work while it is unchanged.
- **Immutable to consumers.**
  - Accessors return primitives, or fill a caller-owned `out` object or buffer. So reads allocate nothing and hand out no internal references.
  - Raw typed arrays are never returned.
  - In dev and test builds, the view object is frozen, and `view.record(kind, id)` returns frozen copies. A write attempt in strict mode throws (SIM.00.03 DoD 1).
- **Accessors** (signatures are provisional; SIM.00.03 fixes them):
  - cells: `shapeAt`, `materialAt`, `tileAt(layer)`, `objectAt`, `fluidAt` (packed `type<<4 | depth`), `fireAt` (fuel), `lodLevelAt`;
  - rows: `copyRow(layer, ax, ay, z, y, out)`, which fills 256 values;
  - units: `unitCount`, `unitIdAt(i)` (ascending ID), `unitInto(id, out)`, `unitsInRect(ax, ay, z, x0, y0, x1, y1, outIds)` (backed by a spatial index);
  - items and jobs: the same pattern;
  - time: `calendarInto(out)`.

### 4.2 Layers per (area, z)

| Layer | Content | Changes come from |
|---|---|---|
| `shape` / `material` | strata and open/solid (Levels) | seed + diffs; mining, building |
| `tile` (6 RMMZ layers as data) | tile IDs (`world/tilecodes.js`). Only tile *diffs* are held per cell. Full tile layers are produced for projections by the core's pure generator functions from seed + diffs, so they cost no core memory (§15.4). Walkability comes from shapes and objects, not from tileset flags | seed + diffs |
| `object` | object type per cell (the `Uint16Array` grid, today `ufObjects`, `DEUS_World.js:613`) | seed + `objectDiffs` |
| `fluid` | packed type and depth per cell | Fluid |
| `fire` | burning cells and fuel | Fire |
| `units` | records and the spatial index | Movement and all others |
| `items` | records by cell and holder | Items |
| `jobs` / designations | records | Jobs and Projects |
| `lod` | the level per region | LOD scheduler |
| `time` | tick, calendar, weather state | Clock, Environment |

### 4.3 Change feed: preallocated and allocation-free

- **Storage.** One `Int32Array` ring of `FEED_CAP = 65,536` records × 8 ints (2 MiB), laid out as `[seq, tick, kind, key, a, b, c, d]`.
  - `key` packs area and z.
  - Records are written in the order things happen within a tick. The ring is sealed at the end of each tick (§3.8, step 16).
- **Kinds (first set):**

  | Group | Kinds |
  |---|---|
  | Cells | `CELL_SHAPE`, `CELL_TILE`, `CELL_OBJECT`, `CELL_FLUID`, `CELL_FIRE` |
  | Units | `UNIT_ADDED`, `UNIT_REMOVED` (with cause), `UNIT_MOVED`, `UNIT_ANIM` (attack, hurt, cast, die) |
  | Effects | `PROJECTILE`, `EFFECT` |
  | Items and jobs | `ITEM`, `JOB` |
  | Other | `LOD_CHANGED`, `LEDGER`, `CMD_RESULT` (seq, status), `CALENDAR` |

- **Reading.** A consumer holds a `cursor` (the next seq). `feed.read(cursor, fn)` calls a pre-bound `fn(kind, key, a, b, c, d, tick)` for each record and returns the new cursor. There is no allocation.
- **Overflow.** When the writer overwrites records a consumer hasn't read yet, that consumer's next `read` returns `LOST`. The consumer then re-reads the layers it uses, using `rev()` to find what changed.
- **Legacy events.** `UF.Events` stays a presentation bus.
  - The host translates feed records into the legacy event names (`world:unitMoved`, `world:tileChanged`, …) for listeners that haven't migrated yet.
  - Today every listener call on a `world:*` event is timed and written to a log with `appendFileSync` (`DEUS_Core.js:256-272`, `:268`), and `world:unitMoved` fires on every unit step (`DEUS_World.js:1418-1420`). The translated path must not keep that per-event file write (§9).

### 4.4 Command queue

- **Record.** `{ seq, tick, kind, a..f (ints), payload? }`.
  - `payload` is optional, for rare structured commands. It is deep-copied and frozen when enqueued.
  - Allocating on input is acceptable: commands are rare.
- **The boundary rule.** `tick` is the boundary where the command is applied: `view.tick` at application, meaning after tick T finished and before tick T+1 runs.
  - This holds for commands applied at the start of a step (§3.8, step 1) and for commands applied while paused (§3.6).
  - A replay applies every command of boundary T, in `seq` order, before stepping to T+1.
  - `seq` is a global counter and is saved, so the order is total.
- **Application and results.**
  - The core validates each command when it is applied. A result goes out as `CMD_RESULT` in the feed.
  - Every applied command is appended to `sim.commandLog` (§10.6, §11).
- **Kinds (first set):**

  | Group | Kinds |
  |---|---|
  | Jobs and designations | `DESIGNATE` (job type, rect, z), `CANCEL_JOB` |
  | Orders | `ORDER_MOVE`, `ORDER_ATTACK`, `SET_STANCE` |
  | Items | `ITEM_EQUIP`, `ITEM_UNEQUIP`, `ITEM_DROP`, `ITEM_PICKUP`, `ITEM_CONSUME`, `CONTAINER_REORDER` |
  | Fire | `IGNITE`, `DOUSE` |
  | Projects | `PROJECT_*` |
  | LOD | `FOCUS_SET` (§5.3) |
  | Test only | `DEBUG_*` (refused unless `config.debug`) |

- **Not commands.** Speed, pause, view level, camera scroll and all UI state are host-only.
- **Presentation never writes sim state directly.**
  - SIM.00.03 adds a lint that lists every render plugin's reads and writes, and fails on any write that bypasses `sim.command` (DoD 2).
  - The lint carries a **violations allowlist**. Each entry names the increment that removes it. The list must be empty by the end of SIM.00.06.

### 4.5 What each render plugin reads today, and the writes to remove

| Plugin | Sim reads today (examples) | View layers | Writes into sim today → where they go |
|---|---|---|---|
| DEUS_Depth | `W.viewLevel` (`:765`), `W.peekArea` (`:756`), `W.unitsInArea` (`:544`), `L.shapeGrid` (`:801-803`) | shape, tile, object, units, items | `peekArea` may build synchronously and changes the World cache; temporary `$dataMap` swap (`:426-435`) → map projection (§4.6) |
| DEUS_Minimap | `L.view`/`W.viewLevel` (`:134-140`), `O.atIn` (`:259`, `:264`), `L.shapeAt` (`:292`), `W.units()` (`:674`) | object, shape, units | `minimapDiscovery` written into `contents.ufWorld` at save (`:840-843`) → `deusView` |
| DEUS_Fog | `W.units` (`:329-358`), `O.atIn` / `$dataMap.data` (`:173-204`) | units, object, shape | creates `W.state.fog` (`:119`) → `deusView` (Fog is force-disabled, `:510-518`) |
| DEUS_DayNight | `$ufTime` (`:80`, `:171-173`), `UF.Time.multiplier/paused` (`:156-157`) | time; host speed | `$gameScreen` tone (`:121-127`) → presentation only, outside the sim save |
| DEUS_Tiles | catalog, `UF.WorldGen` (`:555-595`) | tile, shape | `$dataTilesets` passability and `Tilemap.isWaterTile` (`:505-512`); `buildArea` wrap (`:1247-1256`) → passability becomes sim terrain data; shading becomes part of the projection |
| DEUS_Anim | `W.state.jobs` (`:249-258`), `W.state.units` (`:325`) | units, jobs, feed `UNIT_ANIM` | `W.removeUnit` (`:1516`, `:1624`) → the combat death lifecycle moves into the sim (SIM.00.05/combat); `W.state.anim` (`:1075`) → `deusView` |
| DEUS_Select | `W.currentArea`, `O.atIn`, `J.list` (`:735-768`, `:796`) | object, jobs, units | `W.state.select` (`:321`), `W.state.view` (`:3411`, a test path) → `deusView`; orders and jobs (`:1137`, `:2142-2177`) → commands |
| DEUS_Sheet | Jobs, Items, Environment, Factions accessors (`:506-944`) | units, items, jobs | D&D assignment (`:833-846`) → sim, when the unit is created; eat, equip, drop, pick up (`:1302-1314`, `:1330`, `:1343`, `:2139`, `:2157`) → commands |
| DEUS_Levels (render part) | `W.viewLevel`, `UF.Fluid.getFloodGrid` (`:3548-3551`), `depthAt` (`:3734-3735`) | fluid, shape | `setView` → transfer (Lane N); `W.state.view` (`:4203-4204`) → host / `deusView` |
| DEUS_Fire (render part) | `W.state.fire.burning` (`:264-276`) | fire | ignite and douse menu (`:1187`, `:1191`) → `IGNITE` / `DOUSE` |
| DEUS_Interact | `J.list` (`:271-273`, `:804`) | jobs | menu options create jobs → commands |
| DEUS_Combat (FX) | `u.data.hp` (`:1945-1991`) | units, feed | `u.data.actionRound = null` (`:2011`) → sim |
| DEUS_Containers | `Containers.get` (`:835`) | items | reorders `c.items` (`:839-841`) → `CONTAINER_REORDER` |
| DEUS_Culling | `$gameMap` display | — | wraps World methods (`:292-307`) → removed; the sim never runs in a spriteset scope |
| DEUS_Camera | `$gameMap` scroll | — | `isNearTheScreen` (`:85-93`) → irrelevant once unit events are puppets (SIM.00.04) |
| DEUS_Environment (render part) | — | time/weather | `$gameScreen.changeWeather` called from the sim step (`:690-710`) → the host reads the weather from the view |
| DEUS_Look | `eventsXy`, `J.of`, `O.at`, `Env.*` (`:166-367`) | all, read only | `Environment.weather` creates state lazily on a read (`DEUS_Environment.js:88`, `:120`) → the sim creates it on the tick |

### 4.6 RMMZ map builds are projections (links to Lane N)

- RMMZ's `Tilemap` draws from `$gameMap.data()`, which is the `$dataMap` tile array. After the split, that array is a **render projection**. The host builds it for each `(area, z)` from `copyRow` reads of the `tile` and `object` layers, then patches it from `CELL_*` feed records.
- Lane N's in-place layer switch and its z±1 / z±2 prewarm (increment 0) become prewarms of these projections. **This ADR does not re-specify Lane N.**
- It adds one requirement for SIM.00.03: the viewed level becomes a host variable that the core never reads. Today the view level *is* `$gameMap.mapId()` (`DEUS_World.js:535-539`).

---

## 5. LOD Region Model

### 5.1 The region grid

- **Size.** A region is 32×32 cells across one **slab** of two adjacent layers.
  - Slabs are counted up from the bottom of the world: `slab(z) = (z − zMin) >> SLAB_SHIFT`, with `SLAB_SHIFT = 1` a core constant. A range with an odd layer count ends in a one-layer slab.
  - Horizontal index within an area: `ri = (y >> 5) * 8 + (x >> 5)`, 64 per slab.
  - Regions per 256×256 area are 64 × slabs:

    | Configuration | Range | Layers | Slabs | Regions per area |
    |---|---|---|---|---|
    | DEC-013 default | −16..+15 | 32 | 16 | 1,024 |
    | test (every harness also runs it, §15.2) | −4..+4 | 9 | 5 | 320 |
    | legacy: today's saves (`DEUS_World.js:155`) | −2..+2 | 5 | 3 | 192 |
    | any range | zMin..zMax | L | ⌈L/2⌉ | 64 × ⌈L/2⌉ |

- **Region key.** `(ax, ay, slab, ri)`. The slab takes 8 bits in packed keys, so ranges up to 512 layers fit without a format change.
- **Chunk.** The *storage* unit is one `(region, z)`: 32×32 cells of one layer (§15.3).
- **Bands.** DEC-013 as amended (`docs/OWNER_DECISIONS.md:172-195`) splits the 32 layers into five vertical biome bands. The ranges are PM defaults and stay OPEN for the Owner, as does the assignment of biomes and races to bands:

  | Band | Layers | Count | Slabs at −16..+15 |
  |---|---|---|---|
  | LOWER2 (deep caverns) | −16..−9 | 8 | 0–3 |
  | LOWER1 (shallow underground) | −8..−1 | 8 | 4–7 |
  | SURFACE | 0..+3 | 4 | 8–9 |
  | UPPER1 (low sky, towers, canopy) | +4..+9 | 6 | 10–12 |
  | UPPER2 (high sky, peaks, cloud realm) | +10..+15 | 6 | 13–15 |

  - In the core the band table is **data**: `bands: [{ id, zMin, zMax }]` in world state, read by biome, home-layer and summary rules. The table above is not written into code.
  - Every default band boundary (−16, −8, 0, +4, +10) is an even offset from −16, so it falls on a slab boundary, and no default slab spans two bands. If the Owner picks a boundary that splits a slab, nothing breaks: band-keyed rules inside that slab work per layer.
  - The 9-layer test configuration carries its own test band table (the Rev 2 one: −4..−3, −2..−1, 0, +1..+2, +3..+4). Its slab 2 (0..+1) spans two bands, so the tests exercise the per-layer rule.
- **Why 32×32 × one slab:**
  1. **They align with the minimap.** The minimap chunk is 16×16 (`DEUS_Minimap.js:56-58`), so one region is exactly 2×2 chunks.
  2. **They cover the screen.**
     - The screen is 816×624 px with 48 px tiles (`game/data/System.json`: `advanced.screenWidth` / `screenHeight`, `tileSize`), which is 17×13 cells.
     - Zoom is locked at 1.0 (`DEUS_Camera.js:35-51`).
     - A 17×13 view touches at most 2×2 regions per slab.
  3. **Promotion work is bounded.** At most 32 × 32 × 2 = 2,048 cells per region (§9), whatever the layer count. UNIFORM chunks (all air, or untouched solid rock) cost nothing to promote (§15.3).
  4. **A slab, not a band or a column.** At 32 layers a band is 4 to 8 layers deep and a column is 32. Promoting by slab keeps L0 to the layers in play. A colony on the surface promotes slab 8 (layers 0 and +1) plus whatever the camera sees beneath it, not all 8 layers of LOWER1, and not all 32.
     - Vertical faces between slabs are handled like horizontal faces (§7.7): fluid falling across a slab border, and units taking stairs, ramps (DEC-020) or NaturalConnections links across it.
  5. **The index is cheap.** It is all shifts. The region set of one area at 32 layers (1,024 regions) fits in 32 `Uint32` words, and one level byte per region is 1 KiB per area.
- **Past 32 layers.** Nothing in the region model is sized by 32.
  - The slab count, the region table and the bitsets are sized from `zMin..zMax` when the world loads.
  - LOD cost doesn't grow with the slab count, because only regions that hold state are scheduled (§5.5) and the L0 cap is a work cap (§5.4).
- **Alternatives:**
  - **16×16** (one minimap chunk): finer promotions, but four times the borders and bookkeeping. `REGION_SHIFT` is a constant, so SIM.30.04's bench can choose 4 instead of 5 without a design change (Q10).
  - **One band per region** (Rev 2 of this ADR): bands are 4 to 8 layers deep at 32 layers, so a surface camera would promote SURFACE and all of LOWER1, 12 layers. The band ranges are also still OPEN, and a region grid shouldn't move when the Owner rules on them. Rejected.
  - **Full-height columns** (Rev 1 of this ADR): at 32 layers every focus promotes all 32 layers. Rejected.
  - **4-layer slabs:** half as many regions, but a 4-layer slab spans the default UPPER1/UPPER2 boundary at +10, and the per-region promotion bound doubles. `SLAB_SHIFT` is a constant, so SIM.30.04's bench may still revisit it (Q13).

### 5.2 Levels

| Level | State | Stepping |
|---|---|---|
| **L0 full** | fine: cells, individual units, fluid cells | every tick |
| **L1 near** | fine, the same as L0 | every 10 ticks, all systems, with Δ = 10 ticks batched (movement advances 10 ticks of progress; the fluid region queue gets a 10× budget) |
| **L2 summary** | summary state (§6): anonymous units become buckets; fluid cells are kept but frozen; static layers stay seed + diffs; tracked units stay individual, in *abstract* mode | every 100 ticks (1 game hour), coarse rules |

L1 exists for three reasons:
1. it is the hysteresis band;
2. fine state is ready before the camera or a colonist arrives, so L1 → L0 is a flag flip;
3. it is cheaper than L0.

### 5.3 Focus set

The LOD phase evaluates the focus sources every 10 ticks. Each source makes regions L0 (its core) or L1 (a ring). Unless the table says otherwise, "+1" means one region horizontally and one slab up and down.

| Source | L0 core | L1 ring | Input |
|---|---|---|---|
| Camera | every region that has an **exposed** cell inside the view rectangle plus a 4-cell margin. That is the viewed layer, and each layer beneath it that is drawn because no opaque surface covers it (DEC-021 occlusion; DEC-011 flat layers). The host computes the set from its visible-depth mask (§19) | +1 horizontally, ±1 slab vertically | **`FOCUS_SET` command** from the host (logged) |
| Player-controlled units | unit's region | +1 | sim state |
| Colonists (the player faction's persons) | unit's region | +1 | sim state |
| Active jobs and projects with an assigned worker | target and worker regions | +1 | sim state |
| Combat involving any tracked unit | regions of the combatants | +1 | sim state |
| Burning cells | the region | +1 | sim state (fire never exists in L2, §6) |

- **The camera enters only as a logged command.** The host sends `FOCUS_SET(ax, ay, regionKeys)` only when the camera's exposed *region set* changes. That happens on:
  - a scroll across a region border;
  - a layer switch, including the camera following the player over a ramp (DEC-020);
  - a dig, build or collapse that opens or closes a view downward (a `CELL_SHAPE` record the host's mask reads).

  So a replay reproduces every LOD decision (§10.6).
- **The core never reads the camera directly,** and it never computes occlusion. What is exposed is a presentation fact; the core only sees the logged region set.

### 5.4 Hysteresis

- **Promotion is immediate.** When a region's desired level is higher than its current level, it is promoted in the same LOD phase (L2 → L1 → L0, §7.1).
- **Demotion is slower.** It needs the desired level to stay lower for `DEMOTE_AFTER = 300` ticks in a row (30 s at 1x, 5 game hours). At most `MAX_DEMOTIONS_PER_PHASE = 1`.
- **Minimum dwell.** A promoted region stays at least 100 ticks.
- **Cap.** At most `MAX_L0 = 64` regions per area are L0 (of 1,024 at 32 layers).
  - The camera needs 2×2 regions in each slab where it sees an exposed cell. Looking down an open shaft through all 16 slabs, that is 64.
  - The cap is a safety net. What an L0 region costs is the work it holds (dirty cells, units, fires), not its volume. An exposed region whose chunks are all UNIFORM has no work.
  - If the focus set asks for more, the lowest-priority sources fall to L1. Priority order: camera > combat > fire > colonists > jobs. Within the camera, slabs nearer the viewed layer come first.
  - Collapse (§16) runs the same way at every level, so it isn't a focus source.
- **Prewarm on approach.** The host predicts the next camera region from scroll velocity. The core may *stage* an expansion ahead of time, in slices between ticks (§7.2). Staging never changes when or how a region is promoted. It only means the work may already be done.

### 5.5 Frequency per level, and scheduling

- L0 regions step on every tick.
- Let `rk = slab × 64 + ri`, the region's index within its area.
  - An L1 region steps its batch on ticks where `(tick + rk) % 10 == 0`.
  - An L2 region steps on ticks where `(tick + rk) % 100 == 0`.
- **Only regions that hold state are scheduled.** An L2 region is **dormant** when it has none of these: bucket members, tracked units, wet cells, inflow buffer or reservoir, and queued support, decay or reclamation work.
  - A dormant region is in no schedule list and costs nothing per tick.
  - It wakes on the same events that feed the dirty queues: a mutation, or a unit or fluid crossing into it.
  - Active L1 and L2 regions sit in 10 and 100 lists keyed by `rk % 10` and `rk % 100`. Each tick visits only the list that is due, in `rk` order. Nothing scans all regions.
- So the per-tick LOD work is at most ⌈active L1 / 10⌉ batches plus ⌈active L2 / 100⌉ coarse steps, whatever the layer count.
  - Example: 200 active L2 regions in an area give at most 2 coarse steps per tick at 9 layers and at 32 alike.
  - Sky above the tallest structure, and rock with no caves, veins or fluid, never becomes active.
- The LOD phase itself runs on `tick % 10 == 9`. It reads the focus sources and the region wake-ups, and doesn't scan all regions either.

### 5.6 Modes

- `lod.mode = "full"` makes every region L0. It is the default through SIM.30.03, and it is the oracle for SIM.30.05.
- `lod.mode = "lod"` enables §5.2 to §5.5. It is switched on in play only after SIM.30.04, with PM sign-off.
- `lod.cameraFocus` (default `true`, per DEC-012) can be set to `false` if the Owner prefers strict observer independence (§5.7, Q4).

### 5.7 What "does not depend on what the player watches" means

DEC-012 makes the camera a focus source: "The active player/camera region simulates at full tick fidelity". 0018-R item 10 asks that results not depend on what the player watches. Both are kept, at these strengths:

| Guarantee | `full` mode | `lod` mode |
|---|---|---|
| G1: conserved totals (§7.8) exactly equal, watched or not | yes | yes |
| G2: tracked units (§7.5) and history persons never lost or duplicated | yes | yes |
| G3: replay from the seed + command log (focus included) is bit-exact | yes | yes |
| G4: every unit position and all state is bit-identical whether or not the player watches | **yes**, for the core (SIM.00.04 DoD 1). During the hybrid period it is tested headless, with goals given as commands | only for regions whose L0 comes from non-camera sources |
| G5: aggregate statistics within tolerance of `full` mode | n/a | yes: SIM.30.05, tolerances in §7.9 |

In `lod` mode with `cameraFocus: true`, watching a remote region promotes it. That changes the dice for anonymous animals there, but never the physics or the totals. The Owner decides whether that trade-off is acceptable (Q4).

---

## 6. Summary Simulation

These are the aggregate representations for L2 regions. "Tracked" and "anonymous" are defined in §7.5.

| System | Fine state (L0/L1) | L2 summary state | Coarse rule (every 100 ticks) |
|---|---|---|---|
| **Tracked units and people** | full record: cell, `progress`, path, needs | the same record in *abstract* mode: `{cell, goal, remainingCost, needs}`. Individual, never aggregated. `remainingCost` is the sum of the plan's step costs left, or 1000 × the octile distance if there is no plan | `remainingCost −= speed × Δ` (integer). The abstract `cell` advances along the straight line from the cell where abstract mode began to the goal, in proportion to the cost used; it is only a position, and terrain is re-checked when the unit is placed (§7.3). Needs are integrated in closed form. A job accrues progress if the worker is at the site |
| **Wildlife and monsters** (anonymous) | unit records; herd membership lives on the unit (`u.data.herd`, `DEUS_Ecology.js:214`, `:672-678`) | **buckets** `count[species][ageBand][sex]` (`Uint16`) per region; herd records `{herdId, species, lastBirth, members per bucket}` keep today's fields (`:722`) | Ecology's rules applied to counts: its hourly breeding (`stepBreeding`, called from `tickHour`, `DEUS_Ecology.js:897-905`) and its six-hourly population roll with caps (`:907-914`); migration between adjacent L2 regions by a deterministic rule; every change goes through the ledger |
| **Flora and resources** | object grid (seed + `objectDiffs`); sprouts and regrowth records (`blankState`, `DEUS_Ecology.js:127`) | **no summary needed**: objects stay seed + diffs; sprout and regrowth records stay records; a derived per-region count per object type is kept for statistics | sprouts mature by beat count (today's rule, `:772-796`); the ore sprouts (`:736-752`) are Q7 |
| **Fluids** | packed depth grid (`DEUS_Fluid.js:127-137`); a dirty queue *per region* | **the fine cells are kept but frozen.** A region's grid is at most 2 layers × 32 × 32 = 2,048 bytes at any layer count, and none at all for a chunk with no fluid (§15.3), so dropping it would save nothing. What L2 drops is per-tick stepping. A derived **basin index** sits on top: 4-connected *wet* cells of one fluid type per z (types never mix, `:457`), each basin with its volume, free capacity, drain faces to z−1, and faces to neighbouring regions. It is rebuilt from the cells, so it isn't saved (§10.7) | drain through drain faces and settle across linked faces with integer amounts; each transfer is applied to cells in canonical order (a gaining basin fills its lowest-floor cells first, then row-major; a losing basin drains its highest cells first) as a paired integer subtract and add |
| **Fire** | `W.state.fire.burning` records, integer fuel (`DEUS_Fire.js:214`, `:389`) | **none**: a burning cell is a focus source, so its region is at least L0/L1; demotion waits until no cell burns | — |
| **Geology and terrain** | strata and shapes (Levels) from seed + diffs | **none**: resident in chunk storage at every level (§15.3). A new game or a load builds it from seed + diffs, as today's builds do (`World.buildArea`, `DEUS_World.js:599-689`: generators at `:650`, diffs replayed at `:682-685`; cache `:811-822`) | changes only through mutation: mining, building, collapse (§16), decay (§17) |
| **History** | aggregate already: sites, people, dynasties (`History.generate`, `DEUS_History.js:363-410`, which calls `D.step` once per year, `:390-395`; `step` is at `DEUS_HistoricalDemographics.js:468`) | L2-native. It runs at world creation, and nothing steps it during play (the demographics header says "No listeners, automatic generation, live units, terrain edits, or save hooks", `DEUS_HistoricalDemographics.js:8-9`) | §14 |
| **Jobs and projects** | records (`W.state.jobs`, `DEUS_Jobs.js:101-107`; projects, `DEUS_Projects.js:179-189`) | records unchanged. Jobs with an assigned worker are focus sources (L0). Unassigned jobs need no stepping | non-player factions' jobs (future) accrue abstract work per coarse tick |
| **Items and containers** | records with integer `count` (`DEUS_Items.js:304`) | **records unchanged**: never aggregated, and they need no stepping at rest | — |
| **Environment** | weather per area (`DEUS_Environment.js:88`, `:120`); thermal state per unit | ambient temperature is a boundary condition, derived from season and biome, not a stock; unit thermal stays with the (tracked) unit | re-derived |
| **Factions** | contact checks (`DEUS_Factions.js:656-660`); integer population counters (`:194`, `:594-625`) | contact between tracked units in the same L2 region is resolved at the coarse tick; counters must equal tracked + bucket members (§7.8) | co-location test |
| **Natural connections** | links (`W.state.naturalConnections`) | links are static. A link inside one slab is movement *within* the region; a link across a slab border is a border crossing (§7.7) | bucket z-distribution within a slab unchanged; cross-slab use by the migration rule |

*"Energy".* DEC-012 says demotion conserves "mass, energy and population". The code has no energy stock. This ADR maps "energy" to fuel (burnable objects and items, plus fire fuel) and to food and drink (items, needs). Temperature is a boundary condition. The Owner confirms or corrects this (Q5).

---

## 7. Promotion & Demotion with Conservation Invariants

### 7.1 Transition protocol

1. **When.** Transitions run only in the LOD phase (§3.8, step 14), after every system has stepped for the tick. No unit is ever half-way through a step at that point.
2. **Atomic.** Each transition works like this:
   - take ledger totals for the region, including its border buffers (§7.7);
   - apply the transition into staged structures;
   - take the totals again. On equality, commit and emit `LOD_CHANGED`.
3. **On mismatch:**
   - **dev and test:** throw, with a dump;
   - **release:** discard the staged result, keep the region at its old level, record the defect in diagnostics, and retry after `DEMOTE_AFTER`.
4. **Promotion is two steps.** L2 → L1 (expand), then L1 → L0 (a flag flip). A region wanted at L0 can do both in one phase.

### 7.2 Deterministic seeding

- **Stream.** Every expansion uses `rng = mulberry32(hash32(seed, STREAM_LOD, ax, ay, ri, epoch))`, the existing primitives (`DEUS_World.js:187-211`).
  - `epoch` is the region's `lodEpoch`, a saved `uint32` that goes up by 1 on every demotion.
  - So `promote(summary, seed, epoch)` is a pure function: the same seed and the same state give the same bytes (SIM.30.03 DoD 2).
- **Staged prewarm (§5.4).**
  - The staged result is keyed by `(region.revision, epoch)`. `region.revision` goes up on any change to the region's summary, its buffers, its terrain diffs, or the set and positions of the tracked units in it.
  - At commit, if the key has changed, the expansion is recomputed synchronously.
  - Either way, the committed state is `expand(summary@commit, seed, epoch)`, whatever the slicing was.
- **New unit IDs** come from `nextUnitId`, in canonical order: bucket order (species index, age band, sex), then placement order.

### 7.3 Promotion (L2 → L1)

- **Static layers.** Nothing to do. Terrain and objects stay resident in chunk storage at every level (§15.3). They are not part of the summary.
- **Fluids.** The fine cells never went away (§6), so there is nothing to expand: the water is where it was left.
  - Every wet cell in the region is queued in canonical order (z, then row-major) so fine stepping resumes.
  - The region's inflow buffer (§7.7) is released into its border cells in canonical order, up to each cell's capacity (0..7, `fluidCapacityAt`, `DEUS_Fluid.js:517-532`).
  - If a cell holds more than its capacity, for example because a wall was built while the region was L2, the excess is displaced the way Fluid's reconciliation does it (`DEUS_Fluid.js:896-923`). But an excess that finds no room is kept in the region's **reservoir counter** instead of being dropped. It is never deleted, and it is placed again at the next coarse tick.
  - Inflow buffers and the reservoir are part of Q-WATER / Q-LAVA.
- **Anonymous populations.** For each bucket count c, c individuals are spawned.
  - Candidate cells:
    - must be walkable, free, and in the right level for the species' habitat;
    - are chosen outside protected zones, reusing Ecology's `candidateValid` rules (`DEUS_Ecology.js:463-470`);
    - are drawn by `rng` from the canonical candidate list;
    - fall back to the nearest valid cells by BFS from the region centre.
  - If fewer than c valid cells exist, the remainder stays in the bucket. The region is then a *hybrid L1*: fine, plus a residual bucket that emits individuals as cells free up.
  - Counts are conserved in every case.
- **Tracked units in abstract mode.**
  - Placed at their abstract `cell` if it is valid. Otherwise they go to the nearest valid cell by canonical BFS.
  - Their path is replanned by the deterministic planner (§7.6).

### 7.4 Demotion (L1 → L2)

- **Preconditions:**
  - no focus source for `DEMOTE_AFTER` ticks;
  - no burning cell;
  - no combat;
  - no job with an assigned worker in the region.
- **Fluids.** Build the basin index over the region's wet cells. The cells keep their values. The region's fine queue is dropped. Any cell still in it is simply re-queued on promotion (§7.3), so no volume moves on demotion.
- **Anonymous units.** Absorbed into buckets:
  - `count += 1`;
  - the record is deleted and its ID *retired*, with reason `ABSORBED`. `nextUnitId` never reuses an ID (`DEUS_World.js:1133`).
  - Absorption **does not emit `world:unitRemoved`**. To legacy listeners that event means the unit has left the world, and Factions lowers its population for a removed unit that is dead or dying (`DEUS_Factions.js:619-625`). An absorbed unit is still in the world, as a bucket member counted in Q-FACTPOP (§7.8). The feed carries `UNIT_REMOVED` with cause `LOD_ABSORB` instead, and the legacy translation (§4.3) maps it to no legacy event.
- **Tracked units** switch to abstract mode.

### 7.5 Tracked units and named persons

A unit is **tracked**, meaning it is never aggregated, if **any** of these hold:
- its kind is `person` or `colonist`;
- it has `data.historicalPersonId` (`docs/systems/UF_History.md:102`);
- it has a household or ownership record;
- it is owned or tamed;
- it has a personal name: one that is neither its species label nor the default `TEST_unit_<id>`;
- it carries items or equipment (`data.inventory`, `data.equipment`, `DEUS_World.js:1136-1137`);
- it has health below maximum or an active condition;
- a job, combat target, relationship or herd leader role refers to it.

All other units are **anonymous**. Only anonymous units enter buckets. So named units and history persons are never lost or duplicated (SIM.30.03 DoD 3), and the set equality over their IDs is checked on every transition (§7.9).

Crowd LOD for people (0021-V addendum §9) is an open Owner question (Q14). The bucket keys in §6 can carry its identity axes if it is adopted.

### 7.6 In-flight jobs and paths

- **Jobs** are records and never change on a transition. A region with an assigned job is L0, so demotion can't happen while a worker is working (§7.4).
- **Path plans become saved data** (§10.7): `{goal, cells: Int32Array, i, legs}`. Today they live only in the runtime `pathCache` (`DEUS_World.js:1739`), and loading drops them (`:2915`).
- **On demotion,** a tracked unit's plan becomes `{goal, remainingCost}`, the integer sum of the step costs left.
- **On promotion,** the plan is recomputed by the deterministic planner from the unit's placed cell to the goal.

### 7.7 Units and fluid crossing region borders

- **A unit's region** is the region of its current cell and layer, which are integers.
- **Faces.** Regions meet at horizontal faces (same slab) and at vertical faces (between slabs, where the bottom layer of one slab sits on the top layer of the slab below). Every rule below applies to both kinds, at any layer count.
- **Ramps (DEC-020).** A unit walking up a ramp changes `z` to `z + 1` at the top stratum (§3.9). If that crosses a slab border, it is an ordinary border crossing under the rules below; there is no transfer and no pause.
- **A unit moves from an L0/L1 region into an L2 region:**
  - a tracked unit switches to abstract mode in the destination region;
  - an anonymous unit is absorbed at the next LOD phase (a ledger `ABSORB` event, as in §7.4).
- **A unit leaves an L2 region toward an L0/L1 region:**
  - a tracked unit materializes on the first valid border cell on its line toward the goal (canonical order);
  - an anonymous migration emits an individual on a border cell, with `bucket −= 1` and a new ID.
- **During a transition** nobody moves, because transitions run in the LOD phase.
- **Fluid across an L0/L1 ↔ L2 face.** The fine stepper doesn't write into frozen L2 cells. It treats the L2 side as a boundary:
  - volume that would flow across goes into the L2 region's **inflow buffer** for that face, an exact integer;
  - at the coarse tick the L2 region applies its inflow to the basin behind the face (§6 rule). A basin whose fill is above the fine neighbour's releases volume into the fine border cells, bounded by their capacity;
  - the buffers count toward Q-WATER / Q-LAVA.
- **Fluid across L0/L1 ↔ L0/L1** is ordinary fine flow, because the fine grid is shared.

### 7.8 Conserved quantities

| Id | Quantity | Unit | Integer representation (fine / summary) |
|---|---|---|---|
| Q-WATER | water volume | depth unit (1/7 of a full cell, `DEUS_Fluid.js:9-18`; `DEPTH_MAX = 7`, `:50`). Under DEC-013 a full cell is 5 × 5 × 10 ft, so one unit is 250/7 ft³; the integer unit does not change (§15.0) | low 3 bits of a `Uint8` per cell at every level (L2 keeps the cells, frozen), plus the `Uint32` reservoir and inflow buffers per region |
| Q-LAVA | lava volume | depth unit | same as Q-WATER |
| Q-POP[species, ageBand, sex] | anonymous creatures | individuals | unit records / `Uint16` buckets |
| Q-TRACKED | tracked units | set of IDs | records, fine or abstract |
| Q-UNITID | the unit ID space | IDs | `live ∪ retired = [1, nextUnitId)`, disjoint; every retired ID has a reason: `DIED`, `ABSORBED`, `REMOVED_BY_COMMAND` |
| Q-FACTPOP[f] | faction population counter | individuals | must equal tracked + bucket members of faction f |
| Q-ITEM[type, material] | items | count | integer `count` (`DEUS_Items.js:304`) |
| Q-OBJ[type] | placed objects: flora, boulders, outcrops, structures | objects | `Uint16` object grid + `objectDiffs` |
| Q-STRATA[material] | solid material in place | strata units | Levels strata + diffs |
| Q-FUEL | burning fuel | fuel units | integer per burning cell (`DEUS_Fire.js:389`) |
| Q-FOOD, Q-DRINK | nourishment held by units | milli-units | today `foodLb` / `waterGal` are floats rounded to 0.001 (`DEUS_Colonists.js:5389`, `:5410-5411`); the needs sub-lane converts them to integer milli-units |
| Q-HIST | history person IDs | set of IDs | History `people` records |
| **Q-MASS[family]** | **total matter per material family** (stone, soil and sediment, wood and organics, each metal element, water, …). This is LIFE-001 as restated by the Owner in 0021-V §8 | mass units (integer; one table per material and form, set by SIM.40.01 with WG.65.15) | Σ over every form the family takes: strata (+ diffs), placed objects, items, rubble and talus, sediment, fluid, and the matter held in creatures |

**Q-MASS is the umbrella invariant.**
- Every other quantity above is a *form* that matter takes.
- Forms change only by ledger **transforms**: `ledger.transform(fromForm, toForm, family, massUnits, cause)`. A transform leaves Q-MASS unchanged, for example:
  - stratum → rubble (collapse, §16);
  - wall → ruin stage → rubble → sediment → stratum (decay and geology, §17);
  - item → soil (rot);
  - metal item → oxidised sediment (rust);
  - food → body mass → soil (life cycle, 0021-V addendum §9).
- Only explicitly modelled flows may change Q-MASS[family] (0021-V §8). Rain and evaporation are the example. They are sources and sinks with a named cause.
- **Conjured matter** (*create water*, *wall of stone*) is DEC-018's open sub-question (`docs/OWNER_DECISIONS.md:262`). The ledger supports the PM default as it stands: a magical source or sink with its own cause, like rain. If the Owner rules otherwise, only the cause table changes (§18.6).
- **Blasts and freezing** are transforms too. A stratum a blast destroys becomes debris at the cell (§18.4). Water that freezes stays Q-MASS[water] in an ice form. Burning stays the named sink it already is (§7.9).
- **LIFE-002.** No transform may output an *ore* form (`docs/RISK_REGISTER.md:61`). Oxidised metal becomes a trace-mineral sediment form. A test fails any transform table entry whose output is an ore material.

### 7.9 Ledger checks and tolerances

- **Sources and sinks are explicit.** Every event that creates or destroys a conserved quantity calls `ledger.source(q, n, cause)` or `ledger.sink(q, n, cause)`, and the feed carries a `LEDGER` record. Examples:
  - birth, death, spawn, immigration;
  - mining (Q-STRATA → Q-ITEM);
  - felling (Q-OBJ → Q-ITEM);
  - crafting (Q-ITEM → Q-ITEM);
  - building (Q-ITEM → Q-OBJ / Q-STRATA);
  - burning (Q-FUEL, Q-OBJ);
  - eating and drinking (Q-ITEM → Q-FOOD/Q-DRINK → a metabolic sink);
  - regrowth (a Q-OBJ source);
  - springs, rain and drains, if they are ever added (Q-WATER).
- **Today's unledgered sources and sinks become defects** under `SIM.90`. Each is fixed or ledgered in its system's sub-lane:
  - NaturalConnections `addFluid`;
  - Fluid reconciliation excess;
  - Ecology ore sprouts;
  - strata destruction without debris (§1.4).
- **The checks:**
  - **Interval:** for every quantity q and every interval, `Δtotal(q) = Σsources(q) − Σsinks(q)`.
  - **Transition:** totals over the region, its summary and its buffers are exactly equal before and after every transition (§7.1).
  - **Test mode:** a full recount after every transition and every 100 ticks. It is O(cells + records), about 327,680 cells for one area.
  - **Release:** incremental counters, plus a full recount on save and once per game day. A mismatch is logged. Release never crashes on a mismatch.
- **Property test (SIM.30.03 DoD 1):** 1,000 random promote/demote cycles on 3 seeds, with every total equal. Mutants must be caught:
  - one that leaks 1 unit of water, ore or population;
  - one that uses unseeded randomness.
- **Tolerances for SIM.30.05** (mixed LOD vs `full`, same seed and command log, fixture world). These are provisional first values; SIM.30.05 may propose tighter ones by amending this ADR.

  | Measure | Tolerance |
  |---|---|
  | All conserved totals | exact |
  | Tracked unit and history ID sets | exact |
  | Anonymous population per species (mean over the last 10% of the run) | within ±10% |
  | Placed object count per type | within ±5% |
  | Water volume per z-level | exact (conserved) |
  | Water per region | not compared |
  | Run length | "100 game years" as the calendar defines them when SIM.30.05 starts (Q12). Today's code has 1 year = 1 game day = 2,400 ticks (`DEUS_Core.js:321-325`), which gives 240,000 ticks |

---

## 8. Migration Increments

Each increment is one lane and one merge. The game boots and plays after each one (a PM smoke run is noted on the board), and each has its own guard tests and rollback.

| Inc | WBS | Scope | Guard tests (beyond the WBS DoD) | Rollback |
|---|---|---|---|---|
| **0** | SIM.00.00 (Lane N, 0017-Q §5) | In-place layer switch and prewarmed areas. **In flight, not re-specified here.** Later increments build on it | its own (`tools/test_layer_switch_inplace.js`) | its own |
| **1** | SIM.00.02 | `game/js/sim/kernel/*`, `world/grid.js`, the RNG port, clock, schedule, command queue, feed, ledger and checksum; `DEUS_SimHost.js` with the accumulator and pause reasons; `tools/sim/run_headless.js` and `check_sim_purity.js`. **The calendar moves into the core here**, because a second clock is the drift this ADR removes (proposed WBS delta, Q1). `$ufTime` becomes a facade over `clock`. Legacy `UF.Time.ticksFor*` keep returning engine-frame values (10 per game minute) for unmigrated systems | the DoD 1-5 list; `time:minute/hour/day` counts per real minute equal today's at 1x and 8x (±1); the sim save round-trips | revert the merge; `DEUS_SimHost` off in `plugins.js` |
| **2** | SIM.00.03 | `SimView`, feed readers, commands; render plugins switched to the view (§4.5); map projections (§4.6); the lint with its violations allowlist | the DoD 1-4 list; every allowlist entry names its removing increment; host `UF.Events` translation parity (the event counts per kind match a legacy recording on a fixture) | revert; facades fall back to plugin state |
| **3** | SIM.00.04 | Units, paths and movement in the core (§3.9); `Game_Event` becomes a puppet; one movement model; path plans saved; D&D stats assigned at unit creation (removes the `DEUS_Sheet.js:833-846` write) | the DoD 1-4 list, with DoD 1 run headless and goals given as commands (Jobs is still legacy then); a default-speed unit covers 3.75 ±0.1 cells per real second at 1x on a straight corridor (today's rate both on and off screen at speed 4, §1.3); a speed-modified unit moves at the same rate watched or not | revert; flag `sim.systems.units = "legacy"` for one increment |
| **4.1…4.n** | SIM.00.05/`<system>` | One system per sub-lane, in dependency order: **terrain (the Levels strata writer, World diffs and objects; chunked storage §15.3) → fluid → natural connections → fire → environment → ecology → needs → jobs → projects → combat (with the Anim death lifecycle, `DEUS_Anim.js:1504-1522`, `:1605-1631`) → factions contact → ownership (`DEUS_Ownership.js:613`) → timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`)**. The last sub-lane removes the TimeSpeed repeat hack (§3.5). Terrain, ownership, timers and the Anim lifecycle are not in the WBS SIM.00.05 list (Q2). Terrain comes first because fluid capacity, support (§16) and decay (§17) all read strata | the DoD list; its hook is gone from `Game_Map`/`Scene_Map.update` (grep); its ledger sources and sinks are declared; its old unledgered holes (§1.4) are fixed or recorded as defects | `sim.systems.<name> = "legacy"` for one increment (the legacy code is deleted in the next sub-lane: no long-lived duplicates, Rule 14); revert |
| **5** | SIM.00.06 | One `deusSim` save; migration from legacy saves; presentation state in `deusView` (§11) | the DoD 1-3 list; legacy fixtures captured at Inc 1 load | revert; the loader still reads the legacy keys |
| **6** | SIM.30.01 | Region grid, focus computation, summary schemas and validators; mode stays `full` | the DoD list; focus tests include `FOCUS_SET` replay | revert (no behaviour change) |
| **7** | SIM.30.02 | L2 coarse rules per system (§6); tested headless on fixtures that start in L2; game mode stays `full` | the DoD list; per-rule mutants that leak 1 unit | revert |
| **8** | SIM.30.03 | Promotion, demotion, transactions, border buffers; game mode stays `full` | the DoD 1-4 list | revert |
| **9** | SIM.30.04 | Scheduler, hysteresis, cap, prewarm staging; budgets measured; `lod` mode offered in play after PM sign-off | the DoD list; no frame spike above the §9 budget when focus crosses a border (Lane K harness) | set `lod.mode = "full"` |
| **10** | SIM.30.05 | Long-run QA, mixed vs `full` (§7.9), as a nightly | the DoD list | — |
| **Z** | WG.00.17 (WBS Rev 24, `docs/worldgen/DEUS_WORLDGEN_WBS.md:105`) | Z range as one setting, then 32 layers (−16..+15) with sparse storage and a 9-layer test mode, as the row says. It lands on the legacy plugins after Lanes K and N. The core reads the range and the band table from world state from Increment 1 on (§15.2), so it needs no change of its own | WG.00.17's DoD; every core fixture runs at −4..+4 and at −16..+15, and the save-migration fixtures at −2..+2 (§15.2); the §9 storage rows at 9 and at 32 layers | WG.00.17's own |
| **S1** | SIM.40.01–.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:533-536`) | Support model and blast propagation (SIM.40.01 names both), collapse, colonist behaviour, collapse QA (§16, §18), in the core. Depends on SIM.00.05/terrain and WG.00.17 | §16.6, §18.8 | revert; support stays passive (no collapse) and volume damage stays today's (no attenuation), as today |
| **S2** | SIM.40.05–.09 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:537-541`) | Decay, reclamation, item weathering, deep-history decay, decay QA (§17), in the core. SIM.40.08 depends on SIM.30.02 | §17.6 | revert; nothing decays, as today |
| **E** | SIM.60.02–.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:559-561`) | The spell-effect schema (data), the runtime in the core that turns an effect into the §18.6 primitives, and the QA fixtures. SIM.60.03's dependencies are in its row (SIM.00.03, SIM.40.01–.02, fire, water, seasons, GP.07.02) | §18.8 and SIM.60.04's fixtures | revert; spells keep their SRD numbers and have no physical effect, as today |
| **T** | GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:577`) | Cross-layer targeting in the core: line of sight, 3D range and height modifiers (§18.5). The target picker is on the host side (§19) | §18.8 | revert |
| **P** | WG.00.19–.21 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:107-109`) | Stratum height, ramps and occlusion. The movement rules are core (§3.9); the draw offset, camera follow and occlusion are host (§19) | their own; the §19 boundary tests | their own |
| **R** | WG.00.24 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:112`) | The DEC-017 fallback map renderer, opened only after the Owner's go/no-go (§13) | §13.4 | the host goes back to the stock `Spriteset_Map` |

**Dependencies:** as WBS Rev 24.
- SIM.00.02 waits on the PM's sign-off of this ADR, the OPS.10.01 merge gate and OPS.50.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:520`).
- SIM.00.03 also waits for Lanes N and K (`:521`).
- WG.61.01/.02 are written against the core after SIM.00.03 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:650`).

---

## 9. Performance Budgets

There are two kinds. Storage budgets (§9.1) follow from the storage design, so they are set now. Time budgets (§9.2) need Lane K's K3 baselines and are PENDING-K3.
- Every figure must come with its method (`docs/ENGINE_RULES.md` §6).
- Reference machine: the Owner's laptop, identified by the GL renderer string and CPU that K3 records.
- **Both ranges.** Every row that depends on the layer count is measured at 9 layers (−4..+4) and at 32 layers (−16..+15), by the same harness with a `--z-range` argument (§15.2). A row that passes at only one range fails.

### 9.1 Storage budgets (set now; they follow from §15.3)

These don't depend on Lane K. They are ceilings the storage design already implies, so a lane that exceeds one has found a bug in the design or in the code, and amends this ADR rather than raising the number quietly.

**Terms** (per 256×256 area):
- `C`: chunks in the range: 64 × layers (2,048 at 32 layers, 576 at 9).
- `M`: MIXED chunks. `W`: MIXED chunks with a fluid array. `H`: MIXED chunks with an HP array (some stratum damaged).
- **The sparse fixture:** hand-built, generator-free. Terrain, fluid, units and a small colony on layers −1..+1; every other layer UNIFORM (air above, full-HP stone below). It exists at −4..+4 and at −16..+15 with identical content on −1..+1.
- **The seed fixture:** seed 18, Year 0, generated at each range, plus the 1-game-day play script of §11.4.

| Metric | Definition | Method | Budget |
|---|---|---|---|
| `sim.grid_bytes` | chunk storage of one area (§15.3) | headless: sum of the directory and all chunk array byte lengths; the harness also prints `C`, `M`, `W`, `H` | **Formula**, every fixture, both ranges: ≤ 2 × C + 7,680 × M + 1,024 × W + 5,120 × H + 16 KiB. **Worst case** (every chunk MIXED, wet and damaged): 27 MiB per area at 32 layers. Without damage it is 17 MiB at 32 layers and 4.8 MiB at 9. **Sparse fixture:** `grid_bytes(32) − grid_bytes(9) ≤ 2 × (2,048 − 576) = 2,944 B`. **Seed fixture:** ≤ 8 MiB at 32 layers (a ceiling; the first measurement confirms it or amends this row) |
| `save.bytes` | size of `deusSim` (§11.2) | headless save, JSON length in bytes | **Fresh world:** the terrain and fluid parts are 0 bytes at both ranges, because a fresh world has no diffs. **Sparse fixture after the play script:** `save.bytes(32) − save.bytes(9) ≤ 256 B` (the range, band table and header differ; untouched chunks aren't saved). **General:** grows only with changed cells, moved fluid and records (§15.5) |
| `sim.heap_mib` | retained heap of the whole core state (grids, records, history), after GC | headless: `v8.getHeapStatistics().used_heap_size` after `global.gc()` (`--expose-gc`), on the seed fixture at Year 0 and on an age-500 fixture | absolute value PENDING: the first measurement sets it. **Sparse fixture:** `heap(32) − heap(9) ≤ grid_bytes(32) − grid_bytes(9) + 64 KiB`. So no structure other than the chunk directory may be dense in the layer count |
| `lod.active_regions` | L1 and L2 regions in the schedule lists (§5.5) | core counter | **Sparse fixture:** the same count at 9 and at 32 layers. Dormant regions are never listed |
| `support.work_per_tick` | support cells re-evaluated in one tick | core counter | 0 while nothing changes (V133); ≤ `SUPPORT_BUDGET` (§16.3) otherwise; the same at 9 and 32 layers on the sparse fixture |
| `decay.work_per_tick` | structures stepped by decay in one tick | core counter | ≤ ⌈active decaying structures / 2,400⌉ (spread over a game day, §17.4) |
| `blast.strata_visited` | strata visited by one volume-damage event (§18.3) | core counter | ≤ the strata inside the blast's bounding box, clipped to the range; one visit each (no ray re-walks) |

### 9.2 Time budgets (PENDING-K3)

**Status: PENDING-K3.**
- The numbers below are design **ceilings**, not measurements.
- Lane K's K3 harness (`tools/bench_render_layers.js`, 0017-Q §4; the stress scenario, 0019-T §2) writes `tasks/WG.00.09b/lane-k/perf/baseline_<sha8>.json` (normal) and `stress_baseline_<sha8>.json` (stress).
- At the time of writing (2026-09-26, 02:40 CT), those files existed only on Lane K's local branch, at commit `4da2e734`. That commit wasn't on `origin` and hadn't been reviewed (Appendix B). This ADR doesn't adopt its numbers.
- The column "K3 measurement" names the field that fills each row. The field names are as in that commit. If the reviewed K3 schema renames them, the amendment uses the reviewed names.
- **Before SIM.00.03 starts,** this section must be amended with, for each row: the K3 value, the measured headless value, and the budget derived from them. Per 0018-R §3c item 12, the PM may sign off with PENDING-K3 only on that condition.
- **Benchmark hygiene (DEC-017, `docs/OWNER_DECISIONS.md:247`).** Each perf record notes the concurrent worker count and CPU %, and go/no-go evidence needs one quiet-machine rerun.

| Metric | Definition | Method | Ceiling at 1x | Ceiling at 8x | K3 measurement that fills it |
|---|---|---|---|---|---|
| `sim.tick.full_ms` | one `sim.step()`, all regions L0, on the seed fixture | headless: `performance.now()` around each step for 36,000 ticks → median, p95, worst; NW.js: SimHost timer. At 9 and at 32 layers | p95 ≤ 3.0, worst ≤ 8.0 | same per tick | today's sim step for comparison: `parts["update.map"]` (it wraps `Scene_Map.prototype.updateMain`, which runs `$gameMap.update`) `p95` and `mean`, in each `steady_*` phase of `baseline_<sha8>.json` and in `stress_day_30s` / `stress_night_30s` of `stress_baseline_<sha8>.json` |
| `sim.frame_ms` | sum of the ticks run in one displayed frame | SimHost per-frame timer, via the K3 harness | p95 ≤ 3.0 | p95 ≤ 6.0 (80 ticks/s ≈ 1.33 per frame; some frames run 2) | the render share R = `parts.render.p95` + `parts["update.spriteset"].p95` in the same phases. The amendment sets the ceiling so that `sim.frame_ms` + R ≤ 16.7 ms |
| `sim.tick.l1_region_ms` | one L1 region batch (Δ = 10) | headless bench, every region of the seed fixture × 1,000 batches, at 9 and at 32 layers | p95 ≤ 1.0 | same | — (headless only) |
| `sim.tick.coarse_region_ms` | one L2 region coarse step | headless bench, both ranges | p95 ≤ 0.5 | same | — (headless only) |
| `view.read_ms` | the renderer's view-interface cost per frame (accessor calls + feed reads + projection patches) | K3 harness timer around the SimHost adapters | p95 ≤ 1.0; on the DEC-021 solid-cover scene, the value at 32 layers ≤ 1.10 × the value at 5 layers | p95 ≤ 1.5 | today's render-side reads for comparison: `parts["depth.root.updateUnits"]`, `parts["update.minimap"]`, `parts["update.fog"]`, `parts["update.daynight_glow"]` p95 in the `steady_*` phases |
| `layer_switch` | Lane N's `UF.Levels.stats().lastSwitch` ms and frames | K3 / Lane N scenario | frames ≤ 1; ms ≤ 16.7 | same | `frameMs.worst` and `frames` of each `switch_<from>_to_<to>` phase |
| `lod.promote_ms` | L2 → L1 expansion of one region | headless + NW.js, both ranges | total ≤ 20 in ≤ 10 staged slices of ≤ 2.0 each; unstaged (synchronous) ≤ 16.7 | same | `frameMs.worst` in `stress_day_30s` / `stress_night_30s`: the headroom an unstaged promotion must fit |
| `lod.demote_ms` | L1 → L2 condensation of one region | same | ≤ 10, in the LOD phase | same | — |
| `sim.alloc` | heap allocation in steady state | inner loops (movement, fluid, feed write): 10⁶ iterations under `v8.GCProfiler` → **0 scavenges**; whole tick: scavenges × semi-space ÷ ticks over 10,000 steady ticks | inner loops 0; tick ≤ 2 KiB average | same | — |
| `host.dropped` | ticks dropped by the guard (§3.7) | SimHost counter over the K3 scenario | 0 | 0 at 8x on the stress scenario | an 8x run of the stress scenario. K3 runs at 1x, so that run doesn't exist yet |
| `blast.event_ms` | one volume-damage event of the largest radius the spell schema allows (§18.3) | headless bench on the seed fixture, both ranges | ≤ 2.0 | same | — (headless only) |

- **Speed coverage.** K3's scenario runs at 1x (0017-Q §4). So an 8x run of the same harness is needed. Until it exists, "8× today's `update.map` p95" serves as the implied 8x baseline, labelled as an estimate.
- **What K3 is expected to show.** Lane K's unreviewed note at `4da2e734` (`tasks/WG.00.09b/lane-k/escalation.md`) reports steady-view frame medians of 30–90 ms with the simulation running and 6.95 ms with it paused, mostly in Environment, World and Colonists code. If the reviewed baseline confirms that, today's sim step is far above every ceiling here. The ceilings, not today's cost, are then the target, and the DEC-017 go/no-go must use render-only fields (§13.3).
- **The logging path.** The legacy `UF.Events` bridge must not keep the per-listener synchronous log write on `world:*` events (`DEUS_Core.js:264-270`). Its cost must show up in `view.read_ms` if it stays.

---

## 10. Determinism

### 10.1 Random numbers

- **Nothing in the sim uses `Math.random`.** Today's uses:

  | Site | Side | What happens to it |
  |---|---|---|
  | `World.newWorld` seed pick (`DEUS_World.js:411`, `:418`) | sim | moves to the host. The host picks the seed, passes it to `createSim`, and records it in the save and the command log |
  | `DEUS_Dnd5e.js:415`, `:720`, `:800` fall back to `Math.random` when no `rng` is passed | sim | the core wrapper always passes a stream, and the lint fails any call from the core without one |
  | `DEUS_FactionMenus.js:442`, `:468`, `:478` (New Game seed roll) | presentation | stays, and its seed is passed in |
  | `DEUS_Visuals.js:151-171` (barks) | presentation | stays |

- **Per-tick decisions use counter-based hashing:** `hash32(seed, streamId, key..., tick, n)` → `uint32`.
  - It is stateless, so there is no stream state to save, and adding a consumer in one system never shifts another system's numbers.
  - Fire already works this way (`hash01(seed, SALT.escape, b, x, y, d)`, `DEUS_Fire.js:575`).
- **Batch operations** such as promotion and generation use `mulberry32` seeded by a hash (§7.2), as generators already do (`DEUS_World.js:545-548`, `:556`).

### 10.2 Order of iteration

- **Entities:** always in ascending ID. The registries keep dense ID-sorted lists. Integer-keyed objects enumerate in ascending order in ECMAScript, but the core doesn't rely on object keys.
- **Maps and Sets:** only where insertion order is itself deterministic. Never keyed by anything that depends on the view.
- **No reads that depend on a cache.** Today `peekArea`'s LRU (`DEUS_World.js:800-808`) holds builds whose freshness depends on viewing history (`:2819-2820`). In the core, caches are keyed by input revision, and a stale build is never readable.
- **System order** is the explicit schedule (§3.8), not plugin load order.

### 10.3 Wall clock

- `performance.now` and `Date` are forbidden in the core (§2.3). Today's uses are diagnostics only:
  - Fluid (`DEUS_Fluid.js:733`, `:747`);
  - Combat perf (`DEUS_Combat.js:1416-1422`);
  - Ecology stats (`DEUS_Ecology.js:68`).
- In the core they move to host-side profiling.
- Every work budget is a count, as with Fluid's 512 cells (`DEUS_Fluid.js:55`), never a time.

### 10.4 Floats

- **Integers only** for conserved quantities, positions, `progress`, counters and probabilities. A probability is an integer threshold compared with a `uint32` hash.
- **Allowed:**
  - `+`, `−`, `×` and `÷`, which IEEE-754 rounds correctly in every engine;
  - the exact `Math` functions: `abs`, `min`, `max`, `floor`, `ceil`, `round`, `trunc`, `sign`, `imul` and `clz32`.
- **`Math.sqrt`** may be used only inside an integer square root: `r = floor(sqrt(n))`, then corrected with integer checks until `r*r ≤ n < (r+1)*(r+1)`. A one-ulp difference between engines then can't change the result.
- **Forbidden in sim decisions:** `Math.sin/cos/tan/exp/log/pow` (non-integer)/`hypot/atan2/cbrt`, and the rest of the functions ECMAScript lets engines approximate. They may differ between node's V8 and NW.js's V8, and SIM.00.06 requires cross-runtime saves.
  - Example: Ecology's `Math.hypot` distance checks (`DEUS_Ecology.js:442-453`) become integer squared distances.
  - Example: sphere damage today uses float falloff functions and `Math.sqrt` (`DEUS_Levels.js:1764`, `:1846`). In the core, distance is an integer squared distance in half-feet and falloff is an integer table (§18.3).
- **No float state accumulated across ticks,** unless it is recomputed from integer state each tick.

### 10.5 Independence from the view

- The core never reads the camera, the view level, the player cursor or the screen.
- The camera's only effect is `FOCUS_SET` (§5.3), which is logged.
- The violations in §1.3 are each removed by the increment that migrates their system (§8).
- The guarantee is exactly §5.7.

### 10.6 Replay

- The command log holds every applied command with `(tick, seq)`, including `FOCUS_SET`.
- `replay(seed, log, N)` must reproduce `checksum(N)` bit-exactly (SIM.00.03 DoD 3).
- `checksum` is FNV-1a over the canonical serialization (§11.2).

### 10.7 Continuity across save and load

- **The rule:** state that influences a future tick is saved. A cache that isn't saved must be a pure function of saved state.
- The test: `run(N) == load(save(run(k))) + run(N − k)`, checksum-exact.
- **This fixes four gaps found today (§1.4):**
  - the calendar's sub-minute remainder is gone, because the calendar is derived from `tick`;
  - the Fluid queues are saved, in order;
  - path plans are saved;
  - timers are saved as data (`{systemId, due, every, args}`).

---

## 11. Save Format & Compatibility

### 11.1 Today

**The sim is saved under three keys:**
- `contents.ufWorld = World.state` (`DEUS_World.js:2901-2905`; load `:2907-2916`), a shared bag that many plugins write into. It includes presentation state:
  - `anim` (`DEUS_Anim.js:1075`)
  - `select` (`DEUS_Select.js:321`)
  - `view` (`DEUS_Levels.js:4203-4204`; also a Select test path, `DEUS_Select.js:3411`)
  - `fog` (`DEUS_Fog.js:119`)
  - `minimapDiscovery` (`DEUS_Minimap.js:840-843`)
- `contents.deusFluid` / `ufFluid`, as sparse records `[ax, ay, z, x, y, t, d]` (`DEUS_Fluid.js:821-844`, `:994-1011`).
- `contents.deusTime` / `ufTime`, holding hour through year without `_timer` (`DEUS_Core.js:448-468`, `:471-490`).

RMMZ's own contents are saved beside these (`rmmz_managers.js:389`, `:405`). They include `$gameScreen` tone, which DayNight writes.

### 11.2 Target

```
contents.deusSim  = { format: "deus-sim", saveSchemaVersion: 1,
                      core: { tick, seed, nextSeq, commandLogTail? },
                      world: { zMin, zMax, bands, scale: { cellFt, stratumFt, strataPerLayer } },   // §15
                      systems: { terrainDiffs, units, paths, items, jobs, projects, fluid, fire, environment,
                                 ecology, needs, factions, households, ownership, connections, timers, history },
                      lod: { mode, regions: [{ key, level, lodEpoch, since }], summaries, buffers },
                      ledger: { totals, retiredIds } }
contents.deusView = { viewLevel, camera, select, plans, fog, minimapDiscovery, anim }   // host only
```

- **Canonical encoding** (so save → load → save is byte-identical, SIM.00.06 DoD 2):
  - object keys sorted;
  - no `Map` or `Set` (converted to sorted arrays);
  - typed arrays as `{dtype, length, rle-base64}`;
  - integers only in the sim part. JSON number printing in V8 is deterministic.
- **The same object in both runtimes.** Headless tools write the same object to a file, and NW.js stores it through RMMZ's `DataManager` / `StorageManager` wrapper. So "a headless save loads in NW.js and vice versa" (SIM.00.06 DoD 3) is a matter of reading the file, with no conversion.

### 11.3 Migration and compatibility

- **Detecting a legacy save.** When `deusSim` is absent and `ufWorld` is present, the loader runs `migrateV0`:
  - calendar → `tick`. The calendar module turns the saved fields (minute precision) into total game-seconds, and `tick = floor(gameSeconds / 36)`. The sub-minute remainder was never saved, so up to 60 game-seconds (under 2 ticks) are lost. This is documented as lossy.
  - Fluid records → grids; the queues are woken in canonical order.
  - `World.state` sub-bags → systems.
  - Path plans → replanned once.
  - Presentation keys → `deusView`.
  - `world.zMin`/`zMax` = −2/+2 and the legacy band table: a legacy save stays a 5-level world. Whether an old world can be raised to 32 layers is Q16.
- **During the hybrid period (Inc 1-4)**, each increment may add a sub-record and bump `saveSchemaVersion`.
  - Loading accepts every older version.
  - Saving always writes the newest.
  - Downgrading isn't supported.
- **Unknown future versions are refused** with a clear message. They are never half-loaded.

### 11.4 Fixtures

- Legacy-save fixtures are captured from `main` **at Increment 1, before any sim state changes shape**. They are stored under `tools/sim/fixtures/`, one per seed: 18, 0 and 424242, at Year 0 and after a 5-minute play script. They are the "old-save fixtures" for SIM.00.06 DoD 1. They are 5-level (−2..+2) worlds.
- The range fixtures sit beside them in `tools/sim/fixtures/zrange/`: the sparse fixture and the seed fixture of §9.1, each at −4..+4 and at −16..+15.

---

## 12. Alternatives Considered, Risks, Open Questions

### 12.1 Alternatives

| Option | For | Against | Verdict |
|---|---|---|---|
| **A. Decouple the tick but stay in-engine**: keep the plugins, add only the accumulator | small; fixes frame-rate dependence | no headless purity; view dependence stays; history can't reuse the code; doesn't meet DEC-012 | rejected as an end state. It is effectively the hybrid state during Increments 1-4 |
| **B. Web Worker**: sim in a worker, view by `postMessage` or `SharedArrayBuffer` | parallel CPU; hard isolation | `SharedArrayBuffer` needs cross-origin isolation in Chromium, and NW.js support for it is **not checked**; `postMessage` copies every frame; the synchronous facades legacy plugins use (§2.6) can't cross threads, which forces a big-bang switch | **not now.** The purity boundary keeps it possible after SIM.00.06, as a future ADR |
| **C. Status quo** | no work | §1.3, §1.4; the 8x cost | rejected by DEC-012 |
| **D. Leave RMMZ first**, then split | one move | a big-bang rewrite of render, UI and sim together | rejected. DEC-017 keeps RMMZ as the shell in any case; §13 shows that even replacing its map renderer is a contained job *after* the split |
| **E. Region = one DEC-013 band** (Rev 2) or **full-height column** (Rev 1) | fewer regions | 4 to 32 layers promoted per focus at 32 layers; tied to an OPEN band table | rejected for 2-layer slabs (§5.1) |

### 12.2 Risks

- **R1. Two clocks during the hybrid period.** Mitigations: explicit time domains (INV-SIM-02), a one-increment grace per system, and rate-parity tests (§8).
- **R2. Behaviour drift from 10 Hz batching.** Fluid order, job timing and combat pacing will change. Mitigation: each sub-lane converts its constants and checks rates before and after (§3.3). New baselines are recorded, not hidden.
- **R3. The LOD observer effect in `lod` mode (§5.7).** This is a trade-off for the Owner (Q4).
- **R4. Losses in legacy save migration:** the sub-minute clock and replanned paths (§11.3).
- **R5. The cost of accessor calls** compared with direct array reads in hot render loops (the minimap samples 256 cells × 8 chunks per frame). Mitigations: `copyRow` bulk reads, and revision skipping.
- **R6. Hidden writes into the sim** through facade reads that create state lazily (`DEUS_Environment.js:88`, `:120`; `DEUS_Items.js:163`). The SIM.00.03 lint must also treat lazily created state as a write.
- **R7. Deep-history traces conflict with INV-SIM-01** (§14.3). The Owner decides.
- **R8. Differences between the node and NW.js V8 engines.** Mitigations: the float policy (§10.4) and a cross-runtime checksum test in SIM.00.06.
- **R9. Dead calls the survey found**, all silently guarded:
  - Minimap calls `UF.Fluid.getFluid`, `W.groundAt`, `UF.Projects.activeProjects`, `UF.NaturalConnections.listConnectors` and `UF.Select.selectedUnit`, none of which exist.
  - Tiles calls `UF.World.on`, which doesn't exist.
  - These are left for Lane K and later lanes. They don't block this design.
- **R10. Worldgen density at 32 layers.** The storage budgets grow with MIXED chunks (§9.1). If WorldGen fills most of the 28 non-surface layers with caves, veins and biome detail, memory approaches the 17 MiB-per-area worst case. Mitigations: the seed-fixture ceiling in §9.1 makes that visible at the first measurement, and a MIXED chunk whose arrays equal the generated baseline can be dropped and regenerated when its region is dormant (§15.4).
- **R11. The legacy plugins at 32 layers before the terrain sub-lane.** If WG.00.17 raises the legacy range before SIM.00.05/terrain, today's per-level arrays grow 32/5 times (§15.4). WG.00.17's row already requires sparse storage; §15.1 lists where the legacy stores are dense.
- **R12. Blast cost.** A large blast visits every stratum in its box (§18.3). Mitigations: one visit per stratum, a radius cap from the spell schema, and `blast.event_ms` (§9.2).
- **R13. Scale change in legacy numbers.** Today's 1 ft strata are baked into comments, sphere damage and V135's fluid depth labels (§15.0). Porting them to 2 ft changes blast reach and wading depths in feet. Each system's sub-lane records the change with a before/after fixture.

### 12.3 Open questions

| # | For | Question | Recommendation |
|---|---|---|---|
| Q1 | PM | Move the calendar into the core at SIM.00.02, rather than SIM.00.05 as WBS Rev 24 lists (`docs/worldgen/DEUS_WORLDGEN_WBS.md:523`)? | Yes (Increment 1) |
| Q2 | PM | Add to SIM.00.05: terrain (the Levels strata writer, World diffs and objects; first, §8), Ownership (`DEUS_Ownership.js:613`), TimeSpeed timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`), the Anim death lifecycle (`DEUS_Anim.js:1504-1522`, `:1605-1631`)? Households runs on events only | Yes |
| Q3 | Owner | Keep 16x and 32x? | Keep them as best-effort, with the effective rate shown |
| Q4 | Owner | In `lod` mode, may watching a region change anonymous micro-state (camera as a focus, per DEC-012), or should the camera never change fidelity (`cameraFocus: false`)? | DEC-012 as written (`true`), with the G1-G3 and G5 guarantees |
| Q5 | Owner | Is "energy" in DEC-012 = fuel + food/drink, with temperature as a boundary condition? | Yes |
| Q6 | Owner | Deep-history physical traces vs INV-SIM-01 / V134 and `UF_History.md:106` (§14.3) | An "aged world" option; the standard New Game stays at Year 0 |
| Q7 | Owner | Ecology ore sprouts (`DEUS_Ecology.js:736-752`) break INV-SIM-03: remove them, or ledger them as an approved source? | Remove the ore outcomes |
| Q8 | PM | `tools/bench_history_sim.js` exits 1 at `ebeec892` (§14.1). The WBS row SIM.10.01 cites it as meeting its budget | Fix it under the SIM.10.01 retro |
| Q9 | Coordinator | `docs/ARCHITECTURE.md:18` ("Engine (20 Hz)") contradicts DEC-012. The file is outside Lane M's write set | Update to 10 Hz, citing ADR-003 |
| Q10 | PM | Region size 32 (chosen) or 16 | 32; SIM.30.04's bench confirms |
| Q11 | PM | Fog-of-war memory: presentation (`deusView`) until a gameplay rule reads it? | Yes |
| Q12 | Owner/PM | What is a game year? The code has 1 per game day (`DEUS_Core.js:321-325`); `UF_History.md:1161` says over 100 real hours at 1x | The calendar owner settles it before SIM.30.05 |
| Q13 | PM | Regions per 2-layer slab (Rev 3, §5.1) rather than per DEC-013 band (Rev 2) or full-height column (Rev 1)? | Slabs; SIM.30.04's bench may change `SLAB_SHIFT` |
| Q14 | Owner | Crowd LOD for people (DEC-014, `docs/OWNER_DECISIONS.md:199-208`, OPEN with PM defaults): no population cap; a budget of fully simulated individuals; the rest as counts keyed by species, age band, sex, craft, civic office, class, obligation, faction and settlement. §7.5 keeps every person tracked by default. If the Owner adopts crowd LOD, persons with no history record, household role or reference could be bucketed under those keys, and promotion would rebuild them. History persons always stay individual | Keep persons tracked until the post-split benchmark sizes the budget |
| Q15 | PM | SIM.40 (§16, §17, §18) runs in the core, so it needs the terrain sub-lane of SIM.00.05 first. Should that dependency be added to SIM.40.01 and .05 (WBS Rev 24 lists WG.00.17 and SIM.00.01, and SIM.40.01 and SIM.00.01: `docs/worldgen/DEUS_WORLDGEN_WBS.md:533`, `:537`)? | Yes |
| Q16 | Owner | When WG.00.17 raises the range, are existing 5-level saves upgraded to 32 layers (the new layers generated from the seed), or kept at 5? | Keep old saves at 5; new worlds at 32. An upgrade path can come later: the core's range is data (§15.2) |
| Q17 | Owner | V135 labels the five fluid depth states 1 to 5 ft, for 1 ft strata (`docs/VISION.md:129`). With DEC-013's 2 ft strata the same five states are 2 to 10 ft deep. Keep the five states and relabel them in feet, or change the states? | Keep the states; the feet become 2, 4, 6, 8, 10 |
| Q18 | PM → Owner | Blast numbers: per material and damage type, the fraction that passes one stratum, and the fire ignition thresholds (§18.2). SIM.40.01 proposes them | SIM.40.01 proposes; the Owner approves the feel on the SIM.60.04 fixtures |
| Q19 | Owner | DEC-018's open sub-question: conjured matter versus LIFE-001 (`docs/OWNER_DECISIONS.md:262`) | None from this ADR. The ledger supports the PM default and the alternatives (§7.8) |
| Q20 | Coordinator | WBS rows WG.00.20, WG.00.21 and GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`, `:109`, `:577`) cite DEC-017, DEC-018 and "DEC-019; V148" for the decisions `docs/OWNER_DECISIONS.md` records as DEC-020 (`:282`), DEC-021 (`:293`) and DEC-022 (`:304`), and VISION as V151 (`docs/VISION.md:412`). This ADR cites `docs/OWNER_DECISIONS.md` | Correct the WBS references (`tasks/SIM.00.01/lane-m/escalation.md`) |

---

## 13. Engine Exit Path (DEC-017)

**The decision.** DEC-017, "Keep RMMZ for menus, dialogue, saving, database and battle; fallback map renderer is a custom multi-layer PixiJS renderer inside RMMZ, decided after demo benchmarks" (`docs/OWNER_DECISIONS.md:239-247`).
- It is DECIDED for the shell. The fallback trigger is OPEN until the benchmarks.
- This ADR adopts it as its exit path, as DEC-017's consequences ask (`:245`).
- It replaces Rev 2's recommendation, which left a later "leave RMMZ" decision open. DEC-017 has settled that: RMMZ stays, and at most its map drawing is replaced.

### 13.1 What stays RMMZ, and what the fallback replaces

| Part | Under DEC-017 | Touches the sim core? |
|---|---|---|
| Boot, title, menus and windows, dialogue and messages, battle screens, every scene other than `Scene_Map` | stock RMMZ, untouched | no. After the split they reach the sim only through commands and the view (§2.2) |
| Saving and loading | stock RMMZ `DataManager` / `StorageManager`. They store `deusSim` and `deusView` (§11.2) | no. The save *content* is the core's; RMMZ only stores it |
| Database JSON and catalogs | stock | no. `$dataMap` becomes a render projection either way (§4.6) |
| Input and audio | stock | no. Input becomes commands in the host (§4.4) |
| The `Scene_Map` shell: its update entry, the map's windows, input dispatch, the message window | stock. `DEUS_SimHost` wraps the frame there (§3.4) | no |
| **Map drawing:** `Spriteset_Map`, `Tilemap`, the `Sprite_Character` per unit, the DEUS_Depth planes | stock today. **Replaced by one custom multi-layer PixiJS map renderer, a child of `Scene_Map`, if the Owner says GO** | **no.** It is a reader of `SimView` and the feed, like the stock path after SIM.00.03 |

### 13.2 Why the boundary makes the swap sim-neutral

- **Two crossings only.** The core's only crossings are `sim.command` in and `sim.view()` plus the feed out (§2.2). Neither names a renderer.
- **The renderer is one more reader.** After SIM.00.03, every render plugin reads through the view (§4.5), and the RMMZ tile arrays are projections the host builds (§4.6). A custom renderer uses the same accessors:
  - `copyRow` for the tile, shape, object and fluid rows of each `(area, z)`;
  - `unitsInRect` and `unitInto`, with `from`, `to`, `progress` and `speed` for interpolation (§3.9);
  - feed records (`CELL_*`, `UNIT_*`, `EFFECT`, `PROJECTILE`);
  - `rev()` to skip what hasn't changed.
- **What the renderer computes itself** is presentation, never sim state:
  - DEC-011 flat 1:1 layers;
  - the DEC-019 stratum draw offset;
  - DEC-021 occlusion;
  - Rule 12 sprite frames.
- **Exposure and focus.** The exposed-region set, which drives `FOCUS_SET` (§5.3), is computed by one shared host module, not by the renderer. It is a pure function of the view's shape rows, the view rectangle and the viewed layer. Both renderers use it, so both send identical `FOCUS_SET` commands, and LOD decisions don't depend on which renderer runs. The camera and camera follow (DEC-020) are host state too.
- **Nothing on the sim side changes.** The core, the command set, the feed format and the save stay as they are. A test proves it (§13.4, guard 1).

### 13.3 The go/no-go

The Owner decides with the benchmarks DEC-017 names (`docs/OWNER_DECISIONS.md:243`):
- Lane K's normal baseline plus the 0019-T stress baseline;
- the 32-vs-5-layer occlusion benchmark (DEC-021, `:300`; WBS WG.00.21, `docs/worldgen/DEUS_WORLDGEN_WBS.md:109`).

This ADR adds one rule for reading them. **Judge the map renderer only on render-side measurements:**
- K3 `parts.render`, `parts["render.depth"]`, `parts["render.tilemap_layers"]`, `parts["update.spriteset"]` and `drawCalls`;
- or whole-frame numbers from phases with the simulation paused.

Whole-frame time with the simulation running includes today's sim step. Lane K's unreviewed note reports that step as most of the frame (§9.2). If whole-frame time were used, the stock renderer would be blamed for sim cost that SIM.00.02 to SIM.00.05 remove, whichever renderer draws.

DEC-017's hygiene rule applies: each perf record notes the concurrent worker count and CPU %, and the go/no-go evidence includes one quiet-machine rerun (`:247`).

### 13.4 Sequencing and guard tests (WG.00.24, `docs/worldgen/DEUS_WORLDGEN_WBS.md:112`)

- **When.** No renderer code opens before the go/no-go (DEC-017).
  - After a GO, the lane is best started after SIM.00.03, so it is written against `SimView` alone.
  - If the go/no-go comes earlier, the renderer reads through the `UF.*` facades (§2.6). SIM.00.03 later re-points those to `SimView` with no change to the renderer.
- **Where.** The renderer is a host plugin under `game/js/plugins/` (for example `DEUS_MapRenderer.js`), never under `game/js/sim/`.
- **Guard tests:**
  1. **Renderer independence:** the core's checksum over the fixture script is identical with the stock map renderer and with the custom one. The inputs are the same commands and the same `FOCUS_SET` records.
  2. The SIM.00.03 lint (§4.4) lists the renderer as a read-only consumer, with no allowlist entries.
  3. **DEC-021:** the stress scene at 32 layers with solid upper layers costs about the same as at 5 layers (WG.00.21's benchmark).
  4. **DEC-011:** screenshots of the fixture views match the stock renderer 1:1. The Owner judges them.
- **Rollback:** a host flag switches back to the stock `Spriteset_Map`. Both read the same view, so the sim doesn't notice.

### 13.5 RMMZ dependencies after the split (survey)

This survey sizes the fallback. It is the Rev 2 survey, re-read under DEC-017.

**Scope** (Appendix B):
- `game/js/plugins/` holds 95 files. 41 of the `UF_*.js` files are 16-line shims such as `UF_Core.js:13` `PluginManager.loadScript("DEUS_Core")`.
- 54 files contain real code. Of those, 48 reference at least one RMMZ global. The 6 that reference none are the first candidates to move into the core: `DEUS_Callings.js`, `DEUS_Conditions.js`, `DEUS_DeathForensics.js`, `DEUS_Dnd5e.js`, `DEUS_HistoricalDemographics.js` and `UF_Time.js` (which nothing loads).
- Only 5 files export `module.exports`:
  - `DEUS_Callings.js:404`
  - `DEUS_DeathForensics.js:542`
  - `DEUS_Fluid.js:1026`
  - `DEUS_Containers.js:1345`
  - `UF_Households.js:1067`

After the split (end of Increment 5), DEUS still uses these parts of RMMZ:

| What DEUS uses | Evidence | Under DEC-017 | If the fallback renderer is built |
|---|---|---|---|
| **NW.js runtime** (window, fs, argv) | `game/package.json:4-11` (`chromium-args`, `window`); `DEUS_Core.js:69`, `:98`, `:134`; `DEUS_FactionMenus.js:455` (`nw.gui`) | kept; NW.js is not RMMZ | unchanged |
| **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | kept | the renderer uses the same PIXI v5 and `Graphics` loop |
| **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3 either way | the renderer needs its own multi-layer tilemap for A1-A4 autotiles: size L, risk high (autotile correctness) |
| **Scene / Spriteset / Sprite_Character** | `rmmz_scenes.js` `Scene_Map` `:747`; `rmmz_sprites.js` `Spriteset_Map` `:3345`; `Scene_Map.prototype.*` overridden in 20 plugins, `Spriteset_Map.prototype.*` in 18, `Scene_Boot.start` in 39 | `Scene_Map` and `Scene_Boot` kept | `Spriteset_Map` and the unit `Sprite_Character`s are replaced for map drawing; the 18 `Spriteset_Map` overrides move into the renderer or are retired: size L, risk medium |
| **Input** (`Input`, `TouchInput`, `keyMapper`) | `rmmz_core.js` `:5652`, `:6021`; 18 plugins; private `_currentState` read ×73 | kept | unchanged |
| **Audio** (`AudioManager`, `SoundManager`) | `rmmz_managers.js:1103`, `:1491`; 8 plugins | kept | unchanged |
| **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | kept; they store `deusSim` + `deusView` (§11) | unchanged |
| **Database JSON** (`$dataMap`, `$dataTilesets`, `$dataSystem`; custom databases through `_databaseFiles`) | `$dataMap` in 21 plugins; `$dataTilesets` in 5; `$dataSystem` in 3; loaders `DEUS_WorldGen.js:45-46`, `DEUS_Look.js:93`, `DEUS_World.js:2813` | kept; `$dataMap` becomes a render projection (§4.6) | the renderer reads the view, not `$dataMap` |
| **Menus / windows** (`Window_*`, `Scene_MenuBase`) | 13 plugins use `Window_*`, 9 subclass them (e.g. `DEUS_Sheet.js:1158`, `DEUS_Interact.js:525`); the stock menu is disabled (`DEUS_ColonyOverseer.js:173`) | kept | unchanged |
| **Events / characters** (`Game_Event`, `Game_CharacterBase`, `Game_Player`) | every unit on view is a `Game_Event` (`DEUS_World.js:899`); `Game_CharacterBase` overrides in 11 plugins | after Inc 3 they are puppets fed by the view | the renderer draws units from the view; puppets stay only where RMMZ's event interpreter needs them (dialogue, common events) |
| **Main loop** (`SceneManager`) | `rmmz_managers.js:1982-2112`; TimeSpeed overrides (§1.1) | kept; `DEUS_SimHost` wraps it (§3.4) | unchanged |

**Size of the fallback.** It is the two map-drawing rows, a multi-layer tilemap and a unit and effect layer, about L + L. Nothing else in the table changes. The simulation needs no change for it at any increment, because it never reads a renderer.

---

## 14. Deep-History World Generation

On 2026-09-26 at 00:08 CT the Owner said: "that will let us generate worlds with old construction, fights, crafting, etc".

### 14.1 What exists today

**`History.generate` runs once, at world creation** (`DEUS_History.js:3396-3408` → `:363-410`).
- It steps one year at a time (`D.step`, called at `DEUS_History.js:390-395`, defined at `DEUS_HistoricalDemographics.js:468`).
- Nothing steps it during play (`DEUS_HistoricalDemographics.js:8-9`).

**It leaves no physical traces:**
- `materialize` places only camps and living units (`DEUS_History.js:428-557`).
- A site's `isRuined` is created false (`DEUS_HistoricalDemographics.js:319`) and validated as false (`:397`). So `site.ruined` (`DEUS_History.js:547`) never gets set.
- The docs confirm it: the graveyard is "not evidence of a physical grave" (`docs/systems/UF_History.md:93`), and no automatic grave, crypt or ruin placement is authorized (`:106`).

**Code that places traces exists but can't be reached:**
- `History.iterateWorldHistory` (`DEUS_History.js:1665-2732`; doc comment `:1658-1664`) writes objects and diffs (`:1704-1712`) and road tiles (`:1845-1862`), and saves `history.roads` and `history.structures` (`:2725-2726`).
- It runs only on the founders branch (`:3409-3426`).
- The catalog turns the legacy generator off with `history.simulate: false`, `settleYears: 0` (`game/data/UF_WorldCatalog.json:7670-7675`).
- Catalog kinds for traces already exist: `ruin` and `lair` (`UF_WorldCatalog.json:6128-6146`).

**Documented timings** (from the ASTRA runs; not measured by this lane):
- 500-year demographic trajectories took 8.9–10.6 s of simulation, with the worst year at 66–91 ms (`docs/systems/UF_History.md:192-201`).
- With materialization, a worker took 2.7–3.1 s at age 0 and 10.3–13.5 s at age 500, with about 5 MB world states (`:31-44`).

**Harnesses:**
- The live headless path runs through `tools/test_history_materialization_and_world_age.js`, `tools/bench_species_biology.js` and `tools/bench_history_demographics.js`.
- **`tools/bench_history_sim.js` exits 1 at `ebeec892`.** Observed in a temp snapshot (Appendix B): `History: HistoricalDemographics, Callings and Dnd5e must be loaded before New Game` at `DEUS_History:384`. The tool doesn't load those three modules.

### 14.2 Design: history on the headless core

1. **One engine.** The deep-history run *is* the core (§2), run headless at world creation in **history mode**:
   - `lod.mode = "lod"`, with every region L2 by default;
   - the camera is not a focus source, because there is no camera.
2. **Event bubbles.** The history scheduler's focus sources are *events*, not the camera: a battle at a site, a construction project, a mine being worked, a collapse. When such an event is due, the regions it touches are promoted to L1 (or L0, for a battle's resolution) for a bounded number of ticks, then demoted.
   - Everything else advances with coarse L2 rules at a history cadence. For example, one coarse step per game day in quiet periods is a schedule parameter.
3. **Traces are ordinary sim data, not flavour text.** A ruin is its `objectDiffs` (rubble, ruin variants, `bones_pile`); a road is its tile diffs; a mine is its strata diffs, plus the items it produced; a grave is an object with an anchor record (`personId`, site, xyz). HIST-11 already requires that anchor schema (`UF_History.md:106`).
   - Abandoned crafted items are item records with provenance.
   - Battle remains are items and objects.
   - Because they are normal state, they save, render and are conserved like anything else.
4. **Materials are conserved.** Every stone in a ruin was quarried from strata, and every ingot came from ore that the ledger accounted for (§7.9). The live world *starts from the history run's final state*. There is no second "trace generator" that could invent material. The ledger totals and the checksum at hand-off are recorded, and they must equal the live world's totals at tick 0.
5. **Deterministic.** The run is a pure function of `(seed, setup parameters)`. Its output checksum is tested twice per seed, as the history harnesses already do with repeat runs (`UF_History.md:192-201`).
6. **Time budget** (a ceiling; PENDING measurement):
   - world creation with 500 years of deep history on the reference laptop ≤ 60 s, with progress shown;
   - today's demographics-only run takes 10.3–13.5 s at age 500 (`UF_History.md:31-44`), and the traces must fit in the rest.
   - A new bench, a SIM.10 leaf, measures it. Budgets per event bubble come from `lod.promote_ms` / `lod.demote_ms` (§9).
7. **When.** After SIM.30.03 (promotion and demotion), and only after the Owner's decision on §14.3.

### 14.3 A conflict the Owner must resolve

- INV-SIM-01 (`docs/INVARIANT_REGISTRY.md:51`) says: "Standard New Game begins strictly at World Year 0 (V134). No pre-generated centuries of roads, ruined cities, or exhausted mines."
- `UF_History.md:106` does not authorize automatic ruin or grave placement.
- The New Game setup already has a year selector, `UF.NewGameSetup.year` (`DEUS_FactionMenus.js:280-292`).
- **Recommendation (Q6):** keep the *standard* New Game at Year 0. Offer deep history only for a world created with a setup year above 0 (an "aged world"). That needs an Owner amendment of INV-SIM-01 / V134, recorded in `docs/VISION.md` and `docs/OWNER_DECISIONS.md` (neither is in Lane M's write set).

---

## 15. Nine Z Layers (DEC-013)

DEC-013 was recorded on `main` at `0c1baf8d` (`docs/OWNER_DECISIONS.md:171-187`):
- **9 layers**, with a default range of −4..+4. The range itself is still OPEN, with the PM default.
- **Five vertical bands:** Lower-2 (−4, −3), Lower-1 (−2, −1), Surface (0), Upper-1 (+1, +2), Upper-2 (+3, +4).
- **One home layer per race.**

WG.00.17 does the legacy refactor (`docs/worldgen/DEUS_WORLDGEN_WBS.md:105` at `0c1baf8d`). It lists "ADR-003 9-layer memory/save/LOD design" as an input. This section is that input.

### 15.1 Where the range is fixed today

| Place | Evidence |
|---|---|
| DEUS_World | `LEVELS = [-2, -1, 0, 1, 2]` (`DEUS_World.js:155`), map-id slots for 5 levels (`:156`), `isLevel` bounds (`:158`) |
| DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`), `isLevel` (`:150`), `LEVEL_KEY` of 5 keys (`:998`), 5 fixed change maps (`:1137`, loop `:1141`), elevation index `(minZ + 2) * STRATA + minS` capped at 24 (`:1805`) |
| DEUS_Fluid | `Z_MIN = -2`, `Z_MAX = 2`, `Z_LEVELS = 5` (`DEUS_Fluid.js:56-58`), "Bottom of the world (-2)" (`:291`) |
| DEUS_Minimap | `Z_LEVELS = [2, 1, 0, -1, -2]`, `Z_COUNT = 5` (`DEUS_Minimap.js:59-60`) |

### 15.2 In the core the range is data

- `world/grid.js` takes `{ zMin, zMax }` from world state (`zRange`, which is saved).
  - Every level loop, index and band lookup derives from it: `elevation = (z − zMin) × STRATA + s`, `band(z)` from the DEC-013 table.
  - The core has no literal 5, 24 or ±2 level assumption.
  - Its fixtures run at −2..+2 and at −4..+4 (§8, row Z).
- **An existing 5-level save keeps −2..+2.** Raising an old world to 9 levels is a migration that generates the new levels from the seed. Whether old worlds are upgraded is Q16.
- **Strata per level stay at 5**, the DEC-013 default (`STRATA = 5`, `DEUS_Levels.js:993`). `STRATA` is a core constant too.

### 15.3 Chunked storage; empty sky and solid rock

**The chunk.** A chunk is one `(area, z, rx, ry)`: 32×32 cells of one level, which is one region's slice of one level. A chunk is one of two kinds:

| Kind | What it holds | Examples |
|---|---|---|
| **UNIFORM** | one packed value for every cell: one strata code (all air, or all one solid material at full HP), no objects, no fluid. **No arrays** | open sky on +1..+4; untouched rock deep in −1..−4 |
| **MIXED** | arrays: strata materials (`Uint8`, 5 per cell), connectors (4 bits), objects (`Uint16`), fluid (`Uint8`, allocated only once some cell has fluid), stratum HP (`Uint8` × 5, allocated only once some stratum is damaged) | everything else |

**Behaviour:**
- **Reads** from a UNIFORM chunk return the uniform value.
- **The first write** to any cell *splits* the chunk: it allocates MIXED arrays filled with the uniform value, then writes. That costs O(1,024), and it is deterministic.
- **Classification** happens after generation and after load (baseline from the seed, then saved diffs). It is a cache. It isn't saved.
- **Stepping.** A UNIFORM chunk has no dirty cells, so fluid, support and decay never visit it (V133).
- **Support.** A UNIFORM solid chunk is grounded if the chunk below is grounded.
- **Rendering.** The projection of a UNIFORM air chunk is empty; a UNIFORM rock chunk is one fill.

### 15.4 Memory

| | Today, per 256×256 level | Core, per MIXED chunk (1,024 cells) |
|---|---|---|
| Strata | `Uint8Array(n × 5)` + connectors `Uint8Array(n/2)` = 352 KiB (`DEUS_Levels.js:1037`) | 5,120 B + 512 B |
| Objects | inside each map build: `Uint16Array(cells)` (`DEUS_World.js:613`) | 2,048 B |
| Fluid | grid + flood cache + a share of `inQueue`: 3 × 64 KiB (`DEUS_Fluid.js:179-183`) | 1,024 B, only when fluid is present |
| Tiles | inside each map build: a 393,216-element array (`DEUS_World.js:605`); up to 6 builds cached (`:801`) | none: a render projection (§4.2) |

**Totals:**
- **Today:** strata + fluid are about 544 KiB per level. That is 2.7 MiB at 5 levels, and it would be 4.8 MiB at 9 with the same design. The map builds come on top.
- **Core worst case (every chunk MIXED):** 8.5 KiB × 64 per level. That is 2.7 MiB at 5 levels and 4.8 MiB at 9 (`sim.grid_mib`, §9).
- **Typical case:** sky above +2 and untouched deep rock are UNIFORM and cost about 0. So the four added levels add memory only where there is terrain detail, fluid or construction.
- **Render projections** (map builds) exist only for the levels the host shows: the viewed level, the levels drawn beneath it down to `MaxDepth`, and Lane N's prewarm. So their number doesn't grow with the layer count.

### 15.5 Save size

**Today:**
- Baselines aren't saved; they are regenerated from the seed.
- Strata changes are saved as one 22-hex-character record per changed cell (`REC = 11` bytes, `DEUS_Levels.js:997`; encoder `:1110-1114`) under `levels[z].strata["ax,ay"]` (`:990-991`).
- Fluid is saved as a 7-number array per wet cell, including water that is still where generation put it (`DEUS_Fluid.js:821-844`).

**Core (§11.2):**
- Diffs against the seed baseline, per chunk: strata, objects and tiles as today.
- Fluid per MIXED chunk, only where it differs from the generated baseline, RLE + base64.
- UNIFORM and unchanged chunks cost 0 bytes.
- So nine layers add save bytes only where play changed something. Budget `save.bytes`: at 9 levels ≤ 1.25 × the 5-level size for the same play script (§9).

### 15.6 LOD across 9 layers

- **Regions are per band (§5.1):** 64 × 5 = 320 per area.
- **Camera focus** covers the viewed level's band and the band(s) of the levels drawn beneath it (§5.3). So a surface view leaves Upper-2 and Lower-2 at L2 unless something there is in focus.
- **Promotion of sky or rock regions is nearly free,** because UNIFORM chunks have nothing to expand.
- **Home layers (DEC-013, WG.62.02).** A race's home band is simulated at L2 by coarse rules unless tracked units there are in focus.
- **Deep history (§14)** runs event bubbles per band.

---

## 16. Structural Integrity & Collapse (V137)

V137 was recorded on `main` at `0c1baf8d` (`docs/VISION.md:131`, from directive 0021-V §6). The WBS packages are SIM.40.01–.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:525-528` at `0c1baf8d`). SIM.40.01 sets the numbers (spans, capacities). This ADR fixes where the system lives, how it runs, and what it must conserve.

### 16.1 What exists

- **A strata material table** with `support` (0..1 at full HP), `maxHP` and `debris` for stone, soil and wood (`DEUS_Levels.js:1000-1010`).
- **Damage.** `applyVolumeDamage` (`:1785-1795`) calls `damageCell`, which writes the cell and emits `levels:strataDamaged` / `levels:strataDestroyed` (`:1708-1725`).
- **A destroyed stratum becomes air with no debris placed** (`:1001-1002`, `:1700-1702`; §1.4).
- **Construction refuses unsupported airborne builds** (`DEUS_Colonists.js:3736`).
- **Ledge rule.** DEC-010 (`docs/OWNER_DECISIONS.md:137`) is OPEN, with the default "lateral connectivity is sufficient".
- **Fluid already wakes** on `levels:*` geometry events (`DEUS_Fluid.js:941-944`).
- **No support propagation or collapse exists** (directive 0021-V §6).

### 16.2 Where it lives

`game/js/sim/systems/support.js` and `systems/collapse.js`, in the core. They read the chunked strata and objects (§15.3) and are the single owner of "is this cell supported". Colonist builders and miners (SIM.40.03) *query* support through it. They never compute it themselves.

### 16.3 Support is change-driven (V133)

- **The dirty queue.** A `supportDirty` queue of cell keys `(area, z, x, y)` is fed **only** by mutations:
  - a stratum destroyed, or damaged across a capacity threshold;
  - a stratum or object built or removed;
  - a decay failure (§17);
  - a collapse landing (the cascade).
- **Stable geometry means an empty queue** and zero work: `support.work_per_tick` = 0 (§9).
- **Each tick** processes at most `SUPPORT_BUDGET` cells (a count, set by SIM.40.01) in canonical order: FIFO by tick stamp, ties by elevation index, then cell index.
- **Evaluating a cell** recomputes its support locally. If its status changes, the cells it holds up go into the queue: the ones above, and lateral neighbours within span.
- **The rule's shape.** SIM.40.01 sets the numbers. All values are integers (§10.4).
  - A solid stratum is **grounded** if either:
    - a continuous path of solid strata leads down to the bottom stratum of `zMin` (natural rock counts, V128); or
    - it connects sideways to a grounded solid within `spanCells[material]` (DEC-010 default).
  - Each solid stratum carries at most `capacity[material]`, scaled by `hp / maxHP` with integer thresholds. Overload counts as unsupported.
- **Bounded work.** Span limits bound the sideways search. The downward search stops at the first grounded stratum. So one evaluation costs O(span² × strata), whatever the size of the world.

### 16.4 The collapse event

1. **Falling.** An unsupported solid stratum falls straight down to the first stratum that can hold it, within the same tick.
2. **Conversion.** It becomes rubble or talus of the same material family at the landing cell. It spills to neighbours in canonical order if the landing cell is full. This is `ledger.transform(stratum → rubble)`, and Q-MASS doesn't change (§7.8). It also closes today's "debris only named in an event" hole.
3. **Impact (V95).** Units and objects in the fall path take damage from mass × fall height, reduced by armour.
   - Objects break into their catalog remains, which is a transform. The Doors path already does this: `DEUS_Doors.js:444-445`.
   - Units get `UNIT_ANIM` hurt or die records in the feed.
4. **Cascade.** The landing load puts the cells below into the queue. Later ticks process them within the budget. So a collapse cascades through layers over several ticks, deterministically.
5. **Other effects.**
   - Capacity changes wake fluid (the existing hook).
   - The feed carries `CELL_SHAPE` and `EFFECT(collapse)`. Visuals come from sprite frames (Rule 12). No art is generated (DEC-007).

### 16.5 LOD and determinism

- **Support depends only on geometry, and geometry is fine at every LOD level** (static layers + diffs, §6). So the same algorithm runs in L0, L1 and L2. In L2 the queue is processed at the coarse tick.
- **Victims in an L2 region:**
  - A bucket loses `floor(count × collapsedWalkableCells / regionWalkableCells)` individuals, plus a hash-drawn remainder. These are ledger deaths, and the bodies become mass forms.
  - Tracked units in abstract mode on the collapsed cells take damage individually.
- **No `Math.random`.** Spill order and victim draws are canonical or hash-based (§10.1).
- **Deep history** (§14) uses the same collapse, triggered by decay (§17).

### 16.6 Tests (inputs to SIM.40.04)

- A deterministic cave-in fixture, run twice with identical checksums.
- A tall-tower fixture across +1..+4 (needs WG.00.17).
- Q-MASS exact per family before and after.
- `support.work_per_tick` = 0 over 10,000 ticks of stable geometry.
- Mutants that must fail the tests:
  - no enqueue on stratum destruction (a missed trigger);
  - 1 mass unit leaked in the transform;
  - a whole-world scan per tick (perf counter above the bound).

---

## 17. Decay & Reclamation (V138)

V138 was recorded on `main` at `0c1baf8d` (`docs/VISION.md:132`, from directive 0021-V §7-§8). The WBS packages are SIM.40.05–.09 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:529-533` at `0c1baf8d`). The risks are LIFE-001..003 (`docs/RISK_REGISTER.md:60-62`).

### 17.1 What exists

- **History marks abandonment only as a year.** It sets `abandonedYear` (`DEUS_HistoricalDemographics.js:521`), and `isRuined` stays false (§14.1). Nothing physical changes.
- **Broken objects become their catalog ruin.** `ruin` defaults to `rubble` (`DEUS_Doors.js:18`, `:444-451`). Catalog objects carry a `ruin` variant (for example `UF_WorldCatalog.json:2147`, `:2188`).
- **Regrowth exists.** Ecology keeps regrowth and sprout records, matured by beat count (`DEUS_Ecology.js:764-872`).
- **Nothing decays today.**

### 17.2 Where it lives

`game/js/sim/systems/decay.js` (structures), `reclaim.js` (vegetation and sediment) and `weathering.js` (items), in the core. They share the support model (§16), because a decay failure is just another mutation.

### 17.3 Decay in closed form: change-driven and LOD-invariant

**Maintenance.**
- Every built element has integer HP (V95) and a `lastMaintainedDay`. A built element is a built stratum (`M_BUILT`, `DEUS_Levels.js:995`) or a built object.
- Maintenance means a job touching the element, or its settlement's upkeep.
- An element is *abandoned* after `abandonDays[material]` days without maintenance.

**The decay formula.**
- `HP(day) = HP(d0) − floor(rateMilli[material][exposure] × (day − d0) / 1000)`, with integer rates per game day.
- Exposure comes from cached aggregates (V133): open to the sky (roofs), wet (next to fluid), buried.
- Roofs fail first because sky exposure has the highest rate.

**Scheduling.**
- Because HP is closed-form, the sim doesn't step elements day by day. Each abandoned element gets a precomputed **`failDay`**, the day its HP reaches 0.
- A min-heap keyed by `(failDay, elementId)` holds them. The decay system pops what is due.
- The cost is O(log n) per failure and zero for stable or maintained buildings.
- A change of exposure (a neighbour collapsed, sediment covered it) recomputes `failDay` for the affected elements only.

**At `failDay`.** The element breaks into its catalog remains (a Q-MASS transform, §7.8) and puts its cells into the support queue (§16). That produces the roof → wall → collapse sequence.

**Stages** (intact → weathered → overgrown → collapsed → buried mound) are *derived* per site. They come from the HP lost, the elements failed, vegetation cover and sediment depth. Stage changes go out in the feed for overlay rendering: moss, vines and crack overlays from the art catalogue. No art is generated.

### 17.4 Reclamation, items and the geology cycle

- **Vegetation.**
  - Ecology's sprout records extend to cells that are open to reclamation (abandoned floors, tops of rubble).
  - Growth spreads only from neighbouring vegetation, and matures by day counts.
  - New growth is Ecology's ledgered regrowth source. Nothing is created from nothing.
- **Sediment** burial is a transfer. Soil or rubble erodes at an exposed source cell in the same drainage (−k) and deposits at the low cell (+k). Its schedule is "next deposit day", in closed form like `failDay`.
- **Item weathering** is a set of form transforms, each on its own day, held in a min-heap:
  - organic → soil (rot);
  - iron and copper → oxidised trace-mineral sediment, never ore (LIFE-002, `docs/RISK_REGISTER.md:61`);
  - durable items (gold, stone) → **buried finds**: the item record gets `buried: true` and stays an item.
- **The end state is geology (0021-V §8).**
  - Rubble and sediment compact into strata on a century-scale schedule, and organics become soil and humus.
  - Every step is a transform, so Q-MASS[family] is exact across the whole cycle: built → ruin → rubble → sediment → stratum.
  - Deep history exercises it most (§14).
- **LIFE-003** (`docs/RISK_REGISTER.md:62`). Meaningful sites have a floor. History sites, monuments, and graves with anchor records never go past "buried mound". Their anchor records are never removed. They end as buried finds, not nothing.

### 17.5 LOD, time domain and cadence

- **Time domain.** All decay, reclamation and weathering times are in game days, the slow/historical domain (INV-SIM-02).
- **Cadence.**
  - The systems run at each game-day boundary (every 2,400 ticks, §3.2).
  - They process due events in bounded batches spread across the day: `decay.work_per_tick` ≤ ⌈due / 2,400⌉ (§9).
  - Nothing runs per frame, and nothing scans the whole world (NAT-003, `docs/RISK_REGISTER.md:74`).
- **LOD.**
  - The formulas are closed-form in days, so an element's HP on day D is the same at L0, L1, L2, or after a deep-history jump of many years. This is the LIFE-004 requirement (`docs/RISK_REGISTER.md:63`).
  - The exception is exposure changes caused by other events: those take effect on the day the causing event is *processed*. L2 processes collapses at its coarse tick (1 game hour), so results match unless such an event falls within an hour of a day boundary.
  - That is why the long-run QA compares stages and Q-MASS, not exact HP (§7.9).
- **Deep history (SIM.40.08).** It runs the same heaps with day jumps. So ancient sites appear in the right stage, and meaningful ones keep their floor (LIFE-003).

### 17.6 Tests (inputs to SIM.40.09)

- An abandoned-house fixture aged through all five stages, deterministic, run twice with identical checksums.
- Q-MASS exact per family across the whole cycle.
- The transform table produces no ore (LIFE-002).
- A maintained settlement does zero decay work over 10 game days.
- LOD invariance: the same fixture aged at L0, at L2 and in deep-history steps gives the same stages and Q-MASS.
- Mutants that must fail the tests: a transform leaking 1 mass unit; rust producing ore; a per-tick scan of all structures.

---

## Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)

The code in `game/` and `tools/` at `d1f9cec5` differs from `ebeec892` only in `tools/test_generated_z2_cut_proof.js` (Appendix B), so every plugin line below is the same at both commits.

| # | PM claim | Verdict | Evidence at `ebeec892` |
|---|---|---|---|
| A.1 | 32 `Game_Map`/`Scene_Map.prototype.update` aliases in 26 plugins | **Confirmed** | grep (Appendix B); table §1.2 |
| A.2 | Sim on `Game_Map.update`: World L2932, Fluid L1016, Ecology L992 (every 60), Fire L617, Environment L796, Colonists L5748, Jobs L1777, Projects L1596, Combat L1414, Factions L657 | **Confirmed.** Also sim-relevant and not listed: Anim `:1506` (unit removal), Ownership `:613`, TimeSpeed `:189` (timers). Fog `:638` is presentation. Wildlife `:1195` is empty | §1.2 |
| A.3 | Calendar on `Scene_Map.update`: Core L505 | **Confirmed** (`:505-510`). Also called on sub-ticks (`DEUS_TimeSpeed.js:236`) | §1.1 |
| A.4 | NaturalConnections runs fluids and creatures on `Graphics.frameCount % 30` in `Scene_Map.update` (L507-515), "so it ignores pause and speed" | **Partly corrected.** It ignores **pause**: pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`), while `SceneManager.updateMain` keeps incrementing `frameCount` (`rmmz_managers.js:2102-2112`) and the `Scene_Map.update` wrappers keep running. It does **not** ignore **speed**: NaturalConnections loads after TimeSpeed (`plugins.js:258` vs `:184`), so its wrapper runs on every sub-tick, and `frameCount` goes up once per `updateMain`. It therefore runs every 30 sub-ticks. New finding: `addFluid` creates water (`DEUS_NaturalConnections.js:312-329`, `:352-353`) | §1.1, §1.4 |
| A.5 | On-screen units are Game_Events whose position is copied into the sim (World L1686-1698; stepOnscreen/stepDirect L1633-1675) | **Confirmed** | `DEUS_World.js:1686-1698`, `:1633-1675` |
| A.6 | Off-screen units jump one cell every 16 frames (L1699-1701) | **Confirmed.** `unitStepFrames` default `:136`. Units on the viewed level that have no event also use it (`:1688-1689`) | §1.3 |
| A.7 | Fluid steps only the viewed area (L736-745) | **Confirmed, with a qualification.** The default world has one area (`DEUS_World.js:127-128`; `plugins.js:58`), so the viewed area is the whole world, all 5 levels (`DEUS_Fluid.js:356-376`). There is also no `sceneActive` gate (`:1016-1019`) | §1.3 |
| A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification.** Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
| A.9 | Terrain is read through RMMZ-format `$dataMap` builds (World.buildArea L595-640), cached 6 deep (peekArea L797-822) | **Confirmed** (`PEEK_CACHE = 6`, `:801`; `buildArea` `:599`) | §1.3 |
| A.10 | A layer switch is a map transfer (World.transferView L2724-2730) | **Confirmed** (`DEUS_Levels.js:4179-4193` → `DEUS_World.js:2728`) | §1.3 |
| A.11 | `bench_history_sim.js` runs World, WorldGen, Factions, History and Levels in a vm with throwing engine stubs and a throwing `Math.random` (L37-122) | **Confirmed as code** (`:13`, `:37-122`, `:66-67`). **But the tool exits 1 at `ebeec892`** (observed, Appendix B) | §14.1 |
| A.12 | `test_new_game_year0.js` uses the same pattern (L269-311) | **Confirmed** as a range. Unlike the bench, it passes the real `Math`, so `Math.random` isn't blocked (`tools/test_new_game_year0.js:284`) | — |
| A.13 | `test_strata_foundation.js` L154-237 | **Corrected:** the loader function spans `:156-243`, and its engine stubs are no-ops, not throwing (`:191-218`) | — |
| A.14 | `test_liquid_depth_simulation.js` runs DEUS_Fluid alone (L121-125); Fluid has `module.exports` at L1025 | **Confirmed** (`DEUS_Fluid.js:1025-1026`) | §1.5 |
| A.15 | 78 tools use `vm` | **Confirmed** for `tools/` recursively: 76 top-level files plus 2 in subfolders (Appendix B) | — |
| A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** L60-61 is the comment; the code is `:62`, `:304-311`, `:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
| A.17 | The TimeSpeed repeat hack is L147-173 | **Confirmed.** Also, 16x and 32x are forced into the list (`:45-50`) | §1.1 |
| A.18 | The only `Math.random` in sim paths is the `World.newWorld` seed pick (L411/L418) | **Confirmed for DEUS_World.** Also `DEUS_Dnd5e.js:415`, `:720`, `:800` fall back to `Math.random` without an `rng`. The FactionMenus and Visuals uses are presentation | §10.1 |
| A.19 | The save is split across `ufWorld`, `deusFluid`/`ufFluid` and `deusTime` | **Confirmed.** Also: `_timer`, the fluid queue and path plans are not preserved, and presentation state is inside `ufWorld` | §11.1 |

## Appendix B. Evidence commands and exit codes

These were run in the lane-m worktree (`C:\Users\snewt\.deus_worktrees\lane-m`, `task/lane-m`, `HEAD 477bb3bf`, whose `game/` and `tools/` equal `ebeec892`). Raw output is in `tasks/SIM.00.01/lane-m/notes.md`.

| Command | Result | EXIT |
|---|---|---|
| `git diff --stat ebeec892 HEAD -- game tools` | empty | 0 |
| `git diff --stat ebeec892 main -- game tools` (main = `2033e8db`) | empty | 0 |
| `git diff --stat ebeec892 0c1baf8d -- game tools` (main after 0021-V) | empty | 0 |
| `git show 0c1baf8d:docs/OWNER_DECISIONS.md`, `:docs/VISION.md`, `:docs/worldgen/DEUS_WORLDGEN_WBS.md` (DEC-013, V137, V138, WG.00.17, SIM.40 line numbers) | read | 0 |
| `git diff --stat d1f9cec5 ebeec892 -- game tools` | only `tools/test_generated_z2_cut_proof.js` | 0 |
| `grep -nE "(Game_Map\|Scene_Map)\.prototype\.update\s*=" DEUS_*.js UF_*.js` → count lines and files | 32 lines, 26 files | 0 |
| `grep -c '"status": true' game/js/plugins.js` | 42 (42 entries) | 0 |
| node probe: 600,000 calls of the `DEUS_Core` minute timer (`+= 1/60`, `>= 1/6`) | 60,000 minutes, every one 10 calls apart | 0 |
| `node -e` read of `game/data/System.json` | screen 816×624, `tileSize` 48 | 0 |
| `grep -il "ledger\|conserv"` in the plugins | 7 files, none a material ledger | 0 |
| `ls tasks/WG.00.09b/lane-k/perf` in the lane-k worktree | "No such file or directory" | 2 |
| `git archive ebeec892 tools/bench_history_sim.js game/js game/data \| tar -x` into `%TEMP%\deus_lane_m_probe_ebeec892` | extracted (16 MB) | 0 |
| `node tools/bench_history_sim.js --seed 0 --years 100 --runs 1` (in the temp snapshot) | `FAIL: … History: HistoricalDemographics, Callings and Dnd5e must be loaded before New Game at History.generate (DEUS_History:384:44)` | 1 |
| vm usage in `tools/` (survey), pattern `require\(['"]vm['"]\)\|vm\.createContext\|vm\.runInContext` | 76 top-level, 78 recursive | 0 |
