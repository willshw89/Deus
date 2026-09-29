# DEUS_SimBridge — Simulation Kernel Engine Bridge

Bridge plugin connecting Project DEUS headless physics/geomorphology simulation kernels to the RPG Maker MZ runtime environment (`DEUS_Levels`, `DEUS_World`, `UF.Look`).
Authority: Owner Directive 2026-09-28 (Package 4), DEC-037 (Soil precedes Climate), DEC-040 (Universal Closed-Mass Ledger Invariant).

**File:** `game/js/plugins/DEUS_SimBridge.js`  
**Load order:** after `DEUS_Levels.js`, before `DEUS_Test.js` in `game/js/plugins.js`.  
**Namespace:** `window.DEUS.SimBridge` / `UF.SimBridge`

---

## 1. Overview & Architectural Role

Prior to `DEUS_SimBridge`, simulation physics kernels (`game/js/sim/**`, such as `game/js/sim/geomorphology/soil.js`) operated as Level 1 headless simulation engines with zero runtime game attachment. 

`DEUS_SimBridge` establishes the canonical Level 2 engine bridge pattern:
1. **Script-level kernel loading:** Loads pure simulation kernels via standard page script inclusion (`PluginManager.loadScript`) or browser runtime attachment (`window.DEUS.Sim.Soil`), without node-only `require()` calls that break RMMZ web builds.
2. **Area engine management:** Allocates and manages exactly one `GeomorphologyEngine` instance per loaded active world area.
3. **Continuous physical sync:** Converts `DEUS_Levels` 5-strata volumetric columns into physical `SoilStratum` simulation records, feeds baseline elevations, and mirrors slope cascades and erosion back into `DEUS_Levels` strata codes.
4. **Conservation enforcement:** Enforces integer centipound closed-mass conservation invariants across all simulation steps.

---

## 2. Authority & Contracts

### Simulation Authority
`game/js/sim/geomorphology/soil.js` (`GeomorphologyEngine`) is the sole physical authority for soil strata mass, moisture transport, and slope stability cascades. `DEUS_Levels` acts as the spatial presentation and derived collision mirror.

### Strata Material Ingestion
When an area is initialized or loaded, `DEUS_SimBridge` scans the active area's columns and populates soil strata:
- **Topsoil (`material: 2`, Horizon O/A):** Initialized with bulk density 100 cp/cu.ft, field capacity 3000 bp.
- **Subsoil (Horizon B):** Initialized with bulk density 120 cp/cu.ft, field capacity 2000 bp.
- **Regolith / Loose Gravel / Sand (Horizon C):** Initialized with loose flag set (`loose: true`), bulk density 130 cp/cu.ft, angle of repose 32°.
- **Solid Rock (`material: 1`) & Air (`material: 0`):** Excluded from the soil engine; solid rock provides boundary floors.

### Ground Elevation Provider Contract
The bridge supplies `engine.groundElevationProvider = (x, y) => elevationInFeet`, retrieving the bedrock/strata floor elevation directly from `DEUS_Levels.worldStrataElevationAt(area, x, y, 0)`. Cascading sediment landing in columns without prior soil strata accurately deposits upon the structural floor.

---

## 3. Time Domains & Execution Model

Adhering strictly to AGENTS.md Rule 14 (Explicit Multi-Domain Time & Zero Global Scans):
- **Domain:** Runs under `domain: "action"` on an interval of `UF_WorldCatalog.json` `soil.tickFrames` (defaulting to 10 frames).
- **Quiescent Ticking:** Zero computation when the world is quiet. If `engine.dirtyColumns.size === 0` and both moisture and slope queues are empty, the bridge exits immediately without scanning cells or iterating units.
- **Ticking Sequence:**
  1. `engine.processMoistureTick()`: Diffuses pore water and capillary action across dirty columns.
  2. `engine.processSlopeStability()`: Resolves shear stresses exceeding the material angle of repose, cascading loose sediment downhill.
  3. **Mirroring:** Any loose sediment transfers across columns are reflected back into `DEUS_Levels.setStratumMaterial()` so RMMZ autotiles, minimaps, and collision caches reflect the physical movement.

---

## 4. Event Interface

### Inbound Events (Triggers)
The bridge listens for player and world mutations to mark localized columns dirty:
- **Dig / Excavation (`UF.Interact.dig`, `levels:strataDestroyed`):** Marks the excavation cell and its orthogonal neighbors dirty in the engine, triggering slope checks.
- **Level Tile / Shape Mutation (`levels:shapeChanged`, `world:levelTileChanged`):** Re-evaluates ground elevation and flags column instability.
- **Hydrology Events (`water:tableChanged`):** Marks affected columns dirty for moisture intake.

### Outbound Events
- `UF.Events.emit("soil:cascade", { areaKey, x, y, z, s, massCp, toX, toY })`: Fired whenever a slope cascade relocates sediment mass.
- `UF.Events.emit("soil:moisture", { areaKey, x, y, z, s, moistureBp })`: Fired when significant soil moisture shifts occur.

---

## 5. Persistence & Invariants

### Closed-Mass Conservation Invariant (DEC-040)
Before and after every engine tick, `engine.getTotalMass().total` is evaluated:
$$\Delta M_{\text{world}} = M(t) - M(t_0) \equiv 0 \quad (\text{centipounds})$$
Any drift in total solid or water mass throws a fatal simulation exception, halting drift before corrupting saves.

### Save / Load Serialization
- Serialized into `UF.World.state.soil[areaKey] = engine.serialize()`.
- On `world:loaded`, `DEUS_SimBridge` reconstitutes engines via `new GeomorphologyEngine().deserialize(state.soil[areaKey])`.
- Re-binds `groundElevationProvider`, rebuilds column spatial indexes, and re-attaches listener hooks.
- Save Schema Version: `soilSchemaVersion: 1`.

---

## 6. Observability & Diagnostics

- **`UF.Look` Tooltip Integration:** Hovering any terrain cell displays live physical soil telemetry:
  `Soil: [Horizon] | Moisture: [X]% | Loose: [Y] cp | Solid: [Z] cp | Slope: [Stable/Active]`
- **Headless Test Suite:** `tools/test_soil_bridge.js` verifies provider attachment, strata conversion, quiescent skipping, slope cascading, DEUS_Levels mirroring, and serialization round-trips.
- **Mutation Sweep:** Verified against 5 intentional mutants (`no_mirror`, `tick_when_quiet`, `skip_provider`, `save_without_engine`, `double_load`), catching 100% of mutations.
