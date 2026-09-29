# BRIEF: NAT.04.01 — Soil engine bridge and first in-game proof (lane-cf)

## 1. Objective and authority
- **WBS ID:** `NAT.04.01` Package 4, the engine-bridge half. The kernel (`game/js/sim/geomorphology/soil.js`) merged at `e1554c63` after Grok PASS `148f048b` on `94e89cff`; it is Level 1 (headless) only. This lane takes it to Level 2 (bridged, automated Playtest evidence) and prepares Level 3 (Owner sees it in F5).
- **Lane / branch:** `lane-cf` / `task/lane-cf`, worktree `C:\Users\snewt\.deus_worktrees\lane-cf`, based on main `809d119a`.
- **Writer:** `gemini` (Antigravity; commits tagged `[gemini]`, authored by the account that ran the model). **Reviewer:** `grok`. PM: Claude Code (DEC-042).
- **Authority:** Owner Directive 2026-09-28 (Package 4), DEC-037 (Soil precedes Climate), DEC-040 as clarified 2026-09-29 (weight ledger for world material and water), AGENTS.md Rules 9 (engine core read-only) and 12 (no runtime motion). The DEC-007 amendment applies: this lane generates no art; any presentation uses existing tiles or test-harness renders.

## 2. Ground truth (measured 2026-09-29)
- `soil.js` exports `GeomorphologyEngine` with `addStratum`, `markDirty`, `processMoistureTick`, `processSlopeStability`, `applyWeathering`, `applyWaterErosion`, `depositSuspendedSediment`, `applyThermalDegradation`, `getTotalMass`, `serialize`/`deserialize`, and the bridge hook `groundElevationProvider(x, y) -> ft | null`. Strata ids are `x,y,z,s`; elevations are feet above the bottom of Z = −16 (10 ft per Z, 2 ft per stratum). It publishes `window.DEUS.Sim.Soil` and `.Geomorphology` when loaded as a page script. See `tasks/NAT.04.01/lane-by/REPORT_attempt3.md`.
- **No plugin loads any `game/js/sim/**` kernel today** (grep of `game/js/plugins` for `sim/hydrology`, `DEUS.Sim.` returns nothing). Packages 1–3 are in the same state; this lane sets the pattern.
- Plugins load through `game/js/plugins.js` only. `DEUS_Core.js` (~line 73) also `require()`s a "companion" list; that path runs in Node scope, cannot see RMMZ classes, and logs only the last error ("Cannot find module") — do not add anything to it. Adding a plugin to `plugins.js` needs the RMMZ editor closed (AGENTS.md editor rule); ask the Owner for that window through the PM and say exactly which line changes.
- World state and save: `UF.World.state` is saved as `contents.ufWorld` (`DEUS_World.js:3338-3345`). Strata data lives in `DEUS_Levels` (`getStrata`/`shapeCodeAt`/`surfaceHeightAt` family; see `docs/systems/UF_Levels.md` and `tools/test_strata_foundation.js`); the 32-Z substrate (`WG.00.41`) gives per-column, per-stratum material codes.
- Time domains: tag every timer (`domain: "action" | "historical" | "presentation" | "engine"`, AGENTS Rule 14). Never scan the whole world per frame; the kernel's own queues are the dirty set.

## 3. Scope (exactly this)
1. **`game/js/plugins/DEUS_SimBridge.js`** (new, registered in `plugins.js` after `DEUS_Levels`): loads `game/js/sim/geomorphology/soil.js` as a page script (no `require`), owns one `GeomorphologyEngine` per loaded area, and:
   - **Feeds strata:** for each column in the active area, builds `SoilStratum` records from `DEUS_Levels` material codes for the strata that are soil or loose material (horizon by material: topsoil → O/A, subsoil → B, regolith/gravel/sand → C, loose flag for sand/gravel/rubble), rock and air excluded; sets `engine.groundElevationProvider` from `DEUS_Levels` surface height so cascades into columns without soil strata land on the right floor.
   - **Ticks:** `processMoistureTick` then `processSlopeStability` once per engine tick under a named `domain: "action"` timer (one call per N frames, N in `UF_WorldCatalog.json` `soil.tickFrames`), only while the area has dirty strata; zero work when quiet.
   - **Events in:** `markDirty` on excavation (`DEUS_Interact` dig), water-table change (`DEUS_Fluid`/aquifer events if present), and level reshapes (`world:levelTileChanged`). Events out: `UF.Events.emit("soil:cascade", {x,y,z,s,massCp,toX,toY})` and `"soil:moisture"`.
   - **Writes back:** when the kernel moves loose mass between columns, mirror the result into `DEUS_Levels` (raise/lower the loose stratum code) so the world's strata and the kernel agree; closed mass holds because the kernel is the authority and Levels is the mirror. `getTotalMass().total` before and after every tick is logged at debug level and asserted in the test.
   - **Persistence:** `engine.serialize()` per area into `World.state.soil[areaKey]`; rebuilt on load with `deserialize`, then the column index and provider re-attached. Save schema version bump documented.
   - **Observability:** `UF.Look` on a cell shows kind, horizon, moisture bp, loose cp, solid cp, last cascade; `UF_Sheet` unaffected.
2. **`game/js/plugins/DEUS_Levels.js`**: only the minimal accessor the bridge needs (read strata materials per column; set loose stratum code), no behaviour change.
3. **`tools/check_plugin_boot.js`** (new, headless): reads `game/js/plugins.js` and the latest launch in `game/game_runtime.log`; fails if any registered plugin is missing on disk, if any `[CORE] Companion plugin ... NOT loaded` line appears, or if any plugin loads twice (both `require` and `loadScript`). Added to `tools/ops/gate_tests.json`. This is the check that would have caught the bag plugin.
4. **`tools/test_soil_bridge.js`** (new, headless, gate): with a mocked `DEUS_Levels` column set (three columns, one steep loose bank), the bridge builds the engine, ticks until quiet, mirrors the cascade into Levels, conserves `getTotalMass().total` every tick, serializes into a fake `World.state`, reloads into a fresh bridge and continues identically; dig event marks dirty; no work when nothing is dirty (tick counter unchanged). `--mutation-sweep`: mutants (`no_mirror`, `tick_when_quiet`, `skip_provider`, `save_without_engine`, `double_load`) each fail on an assertion.
5. **In-game proof (Level 2):** an automated NW.js Playtest run (pattern: `tools/native_smoke_19a.js` / `tools/test_snapshot.js`) that starts a fixed-seed New Game, digs one cell at the foot of a loose bank via the `UF.Interact` API, advances engine ticks, and screenshots before/after; the screenshot is opened and described in the report; F8 console clean. Scenario coordinates and seed recorded. Level 3 is the Owner repeating it in F5 with the same seed.
6. **Docs:** `docs/systems/DEUS_SimBridge.md` (six sections), `docs/systems/UF_Levels.md` updated, `docs/ASSET_REQUESTS.md` untouched (no art).

Out of scope: climate, flora, erosion by surface water (no surface-water authority yet), UI beyond `UF.Look`, art.

## 4. Acceptance
1. Gate tests in `lane.json` pass in a fresh clone; every mutant caught by an assertion.
2. `check_plugin_boot.js` passes on the writer's own launch log and fails when a plugin is deliberately removed from `plugins.js` (show it).
3. World total mass unchanged across every bridged tick in the test and in the Playtest log.
4. Level-2 screenshot opened and described; F8 clean; the six YES/NO game-translation lines filled honestly.
5. Grok review PASS, then `merge_gate`.

## 5. GAME TRANSLATION
```text
WBS / Lane:                 NAT.04.01 / lane-cf (engine bridge)
Approved scope:             Owner Directive 2026-09-28 Package 4; kernel merged e1554c63
Writer SHA / evidence date: (at report time)
Translation Class:          B WORLD-BEHAVIOR VISIBLE
Player / World Effect:      Dig at the foot of a loose bank and the bank slides and settles; topsoil over a water table wets up; the world keeps the same weight of earth.
Trigger:                    Dig, level reshape, water-table change; engine tick while dirty.
Runtime Authority:          game/js/sim/geomorphology/soil.js via DEUS_SimBridge.js
Simulation Path:            Levels strata -> SoilStratum -> moisture tick -> slope tick -> mirror to Levels -> events
Engine Bridge:              DEUS_SimBridge.js (registered in plugins.js), DEUS_Levels accessor
Visible Result:             Loose stratum tiles move between columns after a dig; UF.Look shows moisture and cascade
Persistence:                World.state.soil[areaKey] = engine.serialize(); rebuilt on load
Failure Without This Lane:  Soil is a headless kernel nobody sees; Package 4 cannot pass its Owner gate; Climate has no live moisture
Automated Proof:            tools/test_soil_bridge.js (+ --mutation-sweep), check_plugin_boot.js
In-Game Proof:              automated Playtest screenshot (Level 2); Owner F5 with the recorded seed (Level 3)
CONSUMED BY GAME SYSTEMS: UF_Look, Package 5 Climate (moisture), Package 6 Flora, excavation yields
```
