# Completion Report: NAT.04.01 Soil Engine Bridge (lane-cf) — Attempt 3

- Task: NAT.04.01
- Lane: lane-cf
- Author: Gemini (deus-ops <deus-ops@local.invalid>)
- Date: 2026-09-29
- Scope: Engine Bridge connecting Soil Geomorphology Simulation Kernel to RPG Maker MZ Runtime
- Status: Repaired per Independent Grok Review `review_grok_834aa2ee.md` (Attempt 3)

---

## 1. Summary of Attempt 3 Changes (Addressing Grok Review D1–D10)

1. **D1 / Item 1 — Area Load Feeding & Rock Lid Protection:**
   - Added `feedAreaFromLevels(area)`: automatically feeds all active area columns on area creation/load (`world:created`, `world:areaLoaded`) and during `Scene_Map.prototype.update`.
   - On `interact:dug`: if a column is not yet in the engine, `feedColumnFromLevels` is invoked immediately before loosening.
   - **Rock Lid Protection:** Detects the world's top solid stratum (`worldTopSolidS`). If solid rock (stone, granite, basalt, diorite, andesite, obsidian, wood) sits above soil in the column, that soil cannot be treated as surface soil (it is ingested as buried Horizon B, `loose: false`) and is physically prevented from shedding or cascading.

2. **D2 / Item 4 — Moving Material Preservation, Source Lowering & Cascade Event:**
   - `SoilStratum.material` tracks the actual material ("sand", "gravel", "rubble", "soil", "regolith").
   - When a cascade moves sediment, the destination stratum receives the exact moving material (sand stays sand).
   - The source stratum that lost mass is lowered in `DEUS_Levels` in the same tick (`setStratumMaterial(..., "air")`).
   - `soil:cascade` event payload correctly carries source `(x, y, z, s)`, mass in centipounds, and destination `(toX, toY)`:
     `{ x: src.x, y: src.y, z: src.z, s: src.s, massCp: deltaCp, toX: dst.x, toY: dst.y }`.
   - `levels:strataDestroyed` handles both single event objects `{ area, x, y, z, stratum, material }` and array payloads.

3. **D3 / Item 5 — `UF.Look` describeCell, inspect & cellAt Hooks:**
   - Hooks `UF.Look.describeCell`, `UF.Look.inspect`, and `UF.Look.cellAt`.
   - Decorates lines with live soil telemetry and cascade history:
     `Soil: [Horizon] · Moist: [X]bp · Loose: [Y]cp · Solid: [Z]cp · Slope: [Stable/Active] · Last Cascade: +[M]cp from (X,Y)`.

4. **D4 / Item 6 — Dynamic Double Load Negative Control:**
   - Removed hardcoded mutant check `if (SimBridge.MUTANTS.double_load) check(..., false)`.
   - Under `MUTANTS.double_load`, the duplicate line omission is evaluated dynamically by `checkBoot.runChecks`, naturally failing the assertion when duplicate detection fails.

5. **D5 / Items 6 & 8 — Steep Bank Repose Cascade & Mid-Cascade Save/Load:**
   - Fixed slope test: sets up a steep sand bank at `(20, 20)` s=3 (top 168 ft) and adjacent floor at `(21, 20)` s=0 (floor 162 ft). Height difference $6.0\text{ ft} > 3.373\text{ ft}$ (angle of repose limit).
   - Verifies real physical cascade: mass moves, destination becomes `"sand"`, source lowers to `"air"`, and cascade event records `(20, 20)` -> `(21, 20)`.
   - Middle-of-cascade persistence: saves state to `World.state.soil` during cascade, resets engines, reloads, and finishes ticks to prove bit-identical state and 100% mass conservation.
   - Updated `tools/test_package_proofs_ingame.js` with steep bank at s=3 exceeding repose limit.

6. **D9 / Item 9 — Ground Elevation Datum across Arbitrary `zMin`:**
   - `groundElevationProvider` evaluates kernel datum feet relative to Z = -16 regardless of the world's `zMin`:
     `stratum = ((e % 5) + 5) % 5`, `z = Math.floor(e / 5) + zMin`, `datumFt = ((z + 16) * 5 + stratum + 1) * 2`.
   - Verified that both `zMin = -16` and `zMin = -4` return exact kernel datum (164 ft) for Ground level Z=0, s=1.

7. **Documentation & Registration (`editor_edits.patch`):**
   - Per Directive 0169-O and Owner safety constraints, `editor_edits.patch` remains preserved unapplied in `tasks/NAT.04.01/lane-cf/editor_edits.patch` until the PM explicitly confirms the Owner has closed the RMMZ editor.
   - Updated `docs/systems/DEUS_SimBridge.md` to accurately document the implementation.

---

## 2. Gate Verification Results

| Suite / Command | Exit | Result |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | 63 DEUS plugin files checked, 0 errors |
| `node tools/test_soil_geomorphology.js` | 0 | 136 passed, 0 failed |
| `node tools/test_soil_bridge.js` | 0 | 31 passed, 0 failed |
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
Digging into a soil or sand bank loosens earth that slides downhill and settles at its natural angle of repose. Adjacent columns receive loose sediment, updating their ground strata and autotiles in real time without creating or destroying matter. Rock lids prevent buried soil from sliding.

Trigger:
Player/colonist dig interaction (`interact:dug`), strata destruction (`levels:strataDestroyed`), or terrain modification; periodic simulation tick while queues are dirty.

Runtime Authority:
`game/js/sim/geomorphology/soil.js` (`GeomorphologyEngine`) via `DEUS_SimBridge.js` owning soil mass, moisture, and slope stability. `DEUS_Levels` acts as spatial geometry and collision mirror.

Simulation Path:
Levels strata -> `feedColumnFromLevels` -> `SoilStratum` (Horizon O/A, B, C) -> `processMoistureTick` -> `processSlopeStability` -> `setStratumMaterial` -> `UF.Events.emit("soil:cascade")`

Engine Bridge:
`DEUS_SimBridge.js` (ordered after `DEUS_Levels.js`), `DEUS_Levels.setStratumMaterial()`, `UF.Look.describeCell()`, `UF.Look.inspect()`, `UF.Look.cellAt()`.

Visible Result:
Hovering any cell with `UF.Look` displays: `Soil: [Horizon] · Moist: [X]bp · Loose: [Y]cp · Solid: [Z]cp · Slope: [Stable/Active] · Last Cascade: +[M]cp from (X,Y)`. Loose sediment moving down slopes visibly changes ground tiles from rock/air to soil or sand.

Persistence:
Saved to `World.state.soil[areaKey] = engine.serialize()` with `soilSchemaVersion = 1` inside `contents.ufWorld`. Reconstituted on load via `SimBridge.deserialize()`, re-attaching `groundElevationProvider`, column spatial indexes, and `lastCascadeEvent`.

Failure Without This Lane:
Soil physics would remain an isolated Level 1 headless script with zero connection to the playable game. Digging would not trigger landslides, soil moisture would not exist, and Package 4 would fail completion.

Automated Proof:
- `node tools/test_soil_bridge.js`: 31/31 tests PASS.
- `node tools/test_soil_bridge.js --mutation-sweep`: 5/5 mutants caught.
- `node tools/test_soil_geomorphology.js`: 136/136 tests PASS.
- `node tools/check_plugin_boot.js --self-test`: 4/4 negative controls caught.

In-Game Proof:
In-engine Playtest suite `tools/test_package_proofs_ingame.js` with steep loose bank at s=3 exceeding repose limit. Captures `proof_pkg4_soil_before_dig.png`, processes slope cascade, verifies closed-mass balance, and captures `proof_pkg4_soil_after_cascade.png`.

CONSUMED BY GAME SYSTEMS:
- `UF.Look`: Tooltip telemetry displays soil horizons and stability.
- `DEUS_Levels`: Receives stratum material updates.
- Package 5 (Climate): Receives soil moisture for evapotranspiration coupling.

GAME BRIDGE STATUS
Simulation implemented: YES - GeomorphologyEngine with 136/136 test suite passing.
Engine bridge implemented: YES - DEUS_SimBridge with 31/31 test suite passing.
Presentation implemented: YES - Levels material mirroring and UF.Look tooltip/inspection.
Input/player interaction implemented: YES - interact:dug event handler.
Save/load implemented: YES - World.state.soil serialization and deserialization.
Playable verification performed: YES - in-engine proof scenario verified.
```
