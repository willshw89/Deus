# Completion Report: NAT.04.01 Soil Engine Bridge (lane-cf) — Attempt 2

- Task: NAT.04.01
- Lane: lane-cf
- Author: Gemini (deus-ops <deus-ops@local.invalid>)
- Date: 2026-09-29
- Scope: Engine Bridge connecting Soil Geomorphology Simulation Kernel to RPG Maker MZ Runtime
- Status: Repaired per Independent Grok Review `review_grok_fb8ffd36.md` (Attempt 2)

---

## 1. Summary of Attempt 2 Changes (Addressing Defects D1–D8)

1. **D1 — Fed Strata Loose Mass & Solid Rock Exclusion:**
   `DEUS_SimBridge.feedColumnFromLevels` now ingests soil and loose strata only; solid rock, air, wood, water, and lava stay out of the engine. Surface soil is ingested per `HORIZON_SPECS['O/A']` (bulk 3750, porosity 4500, field capacity 3500) as bonded solid (`solidMassCp = 187,500`, `looseMassCp = 0`). Buried soil is ingested per `HORIZON_SPECS.B` (bulk 4750, porosity 3800, field capacity 4000) as bonded solid (`solidMassCp = 237,500`, `looseMassCp = 0`). Loose materials (sand, gravel, rubble, regolith) use Horizon C (bulk 6000) with `loose: true`, `solidMassCp = 0`, and `looseMassCp = 300,000 cp` so that sediment can freely cascade.

2. **D2 — Cascade Mirroring & Event Emission:**
   Instead of waiting for a return value from `processSlopeStability` (which returns `void`), `tickArea` tracks `eng.stats.sedimentTransfers` and loose-mass deltas before and after the tick. When sediment moves, target strata that received loose mass are mirrored to `soil` in `DEUS_Levels.setStratumMaterial`, completely emptied donor strata are mirrored to `air`, and `UF.Events.emit("soil:cascade", lastCascadeEvent)` is emitted. Moisture movements emit `soil:moisture`.

3. **D3 — Ground Elevation Provider Datum & Null for Unknown Ground:**
   `groundElevationProvider` returns exact kernel datum elevation in feet `(e + 1) * 2` for a known solid floor retrieved via `DEUS_Levels.worldStrataElevationAt(area, x, y, 0)`. When no solid floor exists or `surfaceHeightAt === -1`, it returns `null` (not 158 or 0). In `soil.js`, a `null` floor signifies unknown ground that receives zero cascading sediment.

4. **D4 — Real Event Hooks, Frame Ticking, Save/Load & Look Wiring:**
   - Hooks real game event `interact:dug` (emitted by `DEUS_Interact.js` line 262 with `(area, x, y, kindId)`). Loosens topsoil (`loose = true`, `looseMassCp = solidMassCp`, `solidMassCp = 0`) and marks dirty for slope settling.
   - Hooks `levels:strataDestroyed` and `world:levelTileChanged`.
   - Reads `soil.tickFrames` (default 10) from `$ufWorldCatalog` and advances `tickArea` on frame intervals under `domain: "action"` via `Scene_Map.prototype.update` only when dirty queues are non-empty (zero full-map scans).
   - Persistence: hooks `DataManager.makeSaveContents` and `DataManager.extractSaveContents` to serialize/deserialize all area engines into `World.state.soil` with `World.state.soilSchemaVersion = 1`.
   - `UF.Look`: hooks `UF.Look.cellAt` to append live soil telemetry: `Soil: [Horizon] · Moist: [X]bp · Loose: [Y]cp · Solid: [Z]cp · Slope: [Stable/Active]`.

5. **D5 — Boot Check Log Detection & Real Negative Controls:**
   `tools/check_plugin_boot.js` updated to detect real core log lines: `[CORE] Synchronously loaded companion plugin ${name}` and `[CORE] Companion plugin ${name} NOT loaded:`. Detects duplicate companion loads. `--self-test` verifies negative controls for missing plugins, failed companions, duplicate companion loads, and missing/empty logs.

6. **D6 — Stratum Material Mutation Preserves HP and Constructed Bits:**
   `DEUS_Levels.js` `setStratumMaterial(ref, s, material, opts)` preserves raw material bytes (including constructed flag `M_BUILT = 0x80`) and existing HP for all unmodified strata $k \neq s$. Solid strata preserve their existing HP instead of resetting to 255.

7. **D7 / D8 — Real Physical Gate Assertions & Level 2 In-Engine Scenario:**
   Eliminated flag-gated tautological checks in `tools/test_soil_bridge.js`. The test sets up a 4-ft steep loose bank at `(10, 10, s=3)` adjacent to a stone floor at `(11, 10, s=1)`. During ticks, sediment cascades to `(11, 10)`. The test directly asserts `DEUS_Levels.strataMaterialsAt(11, 10)[2] === "soil"`. Under mutant `no_mirror`, this naturally fails because Levels was not updated. All 5 mutants caught with real physical failures.

---

## 2. Gate Verification Results

| Suite / Command | Exit | Result |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | 63 DEUS plugin files checked, 0 errors |
| `node tools/test_soil_geomorphology.js` | 0 | 136 passed, 0 failed |
| `node tools/test_soil_bridge.js` | 0 | 23 passed, 0 failed |
| `node tools/test_soil_bridge.js --mutation-sweep` | 0 | 5/5 mutants caught (`no_mirror`, `tick_when_quiet`, `skip_provider`, `save_without_engine`, `double_load`) |
| `node tools/check_plugin_boot.js --self-test` | 0 | 4/4 negative controls caught; Self-test PASSED |
| `node tools/check_plugin_boot.js` | 0 | 42 active plugins confirmed existing on disk; 0 boot errors |

---

## 3. GAME TRANSLATION

```text
GAME TRANSLATION

WBS / Lane: NAT.04.01 / lane-cf (engine bridge)
Approved scope / Owner authorization reference: Owner Directive 2026-09-28 Package 4; PM Directives 0158-D & 0165-K
Writer SHA / evidence date: 2026-09-29
Translation Class: B WORLD-BEHAVIOR VISIBLE

Player / World Effect:
Digging into a soil or sand bank loosens earth that slides downhill and settles at its natural angle of repose. Adjacent columns receive loose sediment, updating their ground strata and autotiles in real time without creating or destroying matter.

Trigger:
Player/colonist dig interaction (`interact:dug`), strata destruction (`levels:strataDestroyed`), or terrain modification; periodic simulation tick while queues are dirty.

Runtime Authority:
`game/js/sim/geomorphology/soil.js` (`GeomorphologyEngine`) via `DEUS_SimBridge.js` owning soil mass, moisture, and slope stability. `DEUS_Levels` acts as spatial geometry and collision mirror.

Simulation Path:
Levels strata -> `feedColumnFromLevels` -> `SoilStratum` (Horizon O/A, B, C) -> `processMoistureTick` -> `processSlopeStability` -> `setStratumMaterial` -> `UF.Events.emit("soil:cascade")`

Engine Bridge:
`DEUS_SimBridge.js` (ordered after `DEUS_Levels.js`), `DEUS_Levels.setStratumMaterial()`, `UF.Look.cellAt()`.

Visible Result:
Hovering any cell with `UF.Look` displays: `Soil: [Horizon] · Moist: [X]bp · Loose: [Y]cp · Solid: [Z]cp · Slope: [Stable/Active]`. Loose sediment moving down slopes visibly changes ground tiles from rock/air to soil.

Persistence:
Saved to `World.state.soil[areaKey] = engine.serialize()` with `soilSchemaVersion = 1` inside `contents.ufWorld`. Reconstituted on load via `SimBridge.deserialize()`, re-attaching `groundElevationProvider` and column spatial indexes.

Failure Without This Lane:
Soil physics would remain an isolated Level 1 headless script with zero connection to the playable game. Digging would not trigger landslides, soil moisture would not exist, and Package 4 would fail completion.

Automated Proof:
- `node tools/test_soil_bridge.js`: 23/23 tests PASS.
- `node tools/test_soil_bridge.js --mutation-sweep`: 5/5 mutants caught.
- `node tools/test_soil_geomorphology.js`: 136/136 tests PASS.
- `node tools/check_plugin_boot.js --self-test`: 4/4 negative controls caught.

In-Game Proof:
In-engine Playtest suite `tools/test_package_proofs_ingame.js` with seed 1337 executes dig at foot of loose bank, captures `proof_pkg4_soil_before_dig.png`, processes slope cascade, verifies closed-mass balance, and captures `proof_pkg4_soil_after_cascade.png`.

CONSUMED BY GAME SYSTEMS:
- `UF.Look`: Tooltip telemetry displays soil horizons and stability.
- `DEUS_Levels`: Receives stratum material updates.
- Package 5 (Climate): Receives soil moisture for evapotranspiration coupling.
- Package 6 (Flora): Uses soil horizon, field capacity, and moisture for plant growth.

GAME BRIDGE STATUS
Simulation implemented: YES - GeomorphologyEngine active and tested.
Engine bridge implemented: YES - DEUS_SimBridge binds kernel to DEUS_Levels.
Presentation implemented: YES - Levels stratum reflection and UF.Look telemetry.
Input/player interaction implemented: YES - interact:dug hooks loosen earth and mark dirty.
Save/load implemented: YES - serialized into World.state.soil (soilSchemaVersion = 1).
Playable verification performed: YES - automated in-engine proof scenario verified.
```
