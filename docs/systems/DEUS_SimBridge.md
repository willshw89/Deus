# DEUS_SimBridge — Simulation Kernel Engine Bridge

Bridge plugin connecting Project DEUS headless physics/geomorphology simulation kernels to the RPG Maker MZ runtime environment (`DEUS_Levels`, `DEUS_World`, `UF.Look`).
Authority: Owner Directive 2026-09-28 (Package 4), DEC-037 (Soil precedes Climate), DEC-040 (Universal Closed-Mass Ledger Invariant).

**File:** `game/js/plugins/DEUS_SimBridge.js`  
**Load order:** after `DEUS_Levels.js` in `game/js/plugins.js`.  
**Namespace:** `window.DEUS.SimBridge` / `UF.SimBridge`

---

## 1. Overview & Architectural Role

Prior to `DEUS_SimBridge`, simulation physics kernels (`game/js/sim/**`, such as `game/js/sim/geomorphology/soil.js`) operated as Level 1 headless simulation engines with zero runtime game attachment. 

`DEUS_SimBridge` establishes the canonical Level 2 engine bridge pattern:
1. **Script-level kernel loading:** Loads pure simulation kernels via standard page script inclusion (`PluginManager.loadScript`) or browser runtime attachment (`window.DEUS.Sim.Soil`), with fallback to CommonJS `require()` in test environments.
2. **Area engine management:** Allocates and manages exactly one `GeomorphologyEngine` instance per loaded active world area.
3. **Continuous physical sync:** Converts `DEUS_Levels` 5-strata volumetric columns into physical `SoilStratum` simulation records, feeds baseline elevations, and mirrors slope cascades and erosion back into `DEUS_Levels` strata codes.
4. **Conservation enforcement:** Enforces integer centipound closed-mass conservation invariants across all simulation steps.

---

## 2. Authority & Contracts

### Simulation Authority
`game/js/sim/geomorphology/soil.js` (`GeomorphologyEngine`) is the sole physical authority for soil strata mass, moisture transport, and slope stability cascades. `DEUS_Levels` acts as the spatial presentation and derived collision mirror.

### Strata Material Ingestion
When an area is initialized or loaded, `DEUS_SimBridge.feedColumnFromLevels(area, x, y, z)` feeds soil and loose strata into the engine (excluding stone, air, wood, water, lava):
- **Topsoil (Horizon O/A):** Initialized per `HORIZON_SPECS['O/A']` with bulk density 3,750 cp/cu.ft, porosity 4,500 bp, field capacity 3,500 bp (sand 4,000, silt 3,000, clay 1,000, organic 2,000). Bonded solid matrix (`solidMassCp = 187,500 cp`, `looseMassCp = 0`).
- **Subsoil (Horizon B):** Initialized per `HORIZON_SPECS.B` with bulk density 4,750 cp/cu.ft, porosity 3,800 bp, field capacity 4,000 bp (sand 3,000, silt 4,000, clay 2,500, organic 500). Bonded solid matrix (`solidMassCp = 237,500 cp`, `looseMassCp = 0`).
- **Regolith / Loose Gravel / Sand (Horizon C):** Initialized per `HORIZON_SPECS.C` with bulk density 6,000 cp/cu.ft, porosity 3,000 bp, field capacity 2,500 bp (sand 6,000, silt 2,500, clay 1,500, organic 0). Loose sediment matrix (`loose: true`, `solidMassCp = 0`, `looseMassCp = 300,000 cp`, angle of repose 34°).
- **Solid Rock & Air:** Excluded from the soil engine; solid rock provides boundary floors via the ground elevation provider.

### Ground Elevation Provider Contract
The bridge supplies `engine.groundElevationProvider = (x, y) => elevationInFeet`, retrieving the bedrock/strata floor elevation directly from `DEUS_Levels.worldStrataElevationAt(area, x, y, 0)`.
- If a solid floor exists at stratum index `e`, returns `(e + 1) * 2` ft in the kernel datum (where 0 ft is bottom of Z = -16).
- If no solid floor exists or column is unknown (`surfaceHeightAt === -1`), returns `null`. Unknown ground never receives cascading sediment.

---

## 3. Time Domains & Execution Model

Adhering strictly to AGENTS.md Rule 14 (Explicit Multi-Domain Time & Zero Global Scans):
- **Domain:** Runs under `domain: "action"` on an interval of `UF_WorldCatalog.json` `soil.tickFrames` (defaulting to 10 frames).
- **Quiescent Ticking:** Zero computation when the world is quiet. If `engine.dirtyMoisture.size === 0` and `engine.dirtySlope.size === 0`, `tickArea` exits immediately with `false` without scanning cells or iterating units.
- **Ticking Sequence:**
  1. `engine.processMoistureTick(1)`: Diffuses pore water and capillary action across dirty moisture columns.
  2. `engine.processSlopeStability(1, ledger)`: Resolves shear stresses exceeding the material angle of repose, cascading loose sediment downhill.
  3. **Mirroring:** Detects sediment movement from `stats.sedimentTransfers` and loose-mass deltas, calling `DEUS_Levels.setStratumMaterial()` to reflect physical movement in Levels without clearing constructed bits or resetting HP.

---

## 4. Event Interface

### Inbound Events (Triggers)
The bridge listens for player and world mutations to mark localized columns dirty:
- **Dig / Excavation (`interact:dug`):** Emitted by `DEUS_Interact.js` line 262 with `(area, x, y, kindId)`. Loosens solid topsoil into loose sediment (`loose = true`, `looseMassCp = solidMassCp`, `solidMassCp = 0`) and marks dirty for slope settling.
- **Strata Destruction (`levels:strataDestroyed`):** Emitted by `DEUS_Levels.js` line 2049 with `(destroyed, area)`. Marks damaged/destroyed strata dirty.
- **Level Tile Mutation (`world:levelTileChanged`):** Re-flags dirty column for slope stability check.

### Outbound Events
- `UF.Events.emit("soil:cascade", { x, y, z, s, massCp, toX, toY })`: Fired whenever a slope cascade relocates sediment mass.
- `UF.Events.emit("soil:moisture", { area, transfers })`: Fired when capillary/drainage moisture transfers occur.

---

## 5. Persistence & Invariants

### Closed-Mass Conservation Invariant (DEC-040)
Before and after every engine tick, `engine.getTotalMass().total` is evaluated:
$$\Delta M_{\text{world}} = M(t) - M(t_0) \equiv 0 \quad (\text{centipounds})$$
Logs before and after mass at debug level. Logs an error if drift occurs.

### Save / Load Serialization
- Serialized into `UF.World.state.soil[areaKey] = engine.serialize()`.
- Saved into save file via `DataManager.makeSaveContents` -> `contents.ufWorld = World.state`.
- On load via `DataManager.extractSaveContents` -> `World.state = contents.ufWorld`, `SimBridge.deserialize(World.state.soil)` reconstitutes all area engines.
- Re-binds `groundElevationProvider`, rebuilds column spatial indexes, and re-attaches listener hooks.
- Schema version: `World.state.soilSchemaVersion = 1`.

---

## 6. Observability & Diagnostics

- **`UF.Look` Tooltip Integration:** Hovering any terrain cell displays live physical soil telemetry:
  `Soil: [Horizon] · Moist: [X]bp · Loose: [Y]cp · Solid: [Z]cp · Slope: [Stable/Active]`
- **Headless Test Suite:** `tools/test_soil_bridge.js` verifies provider attachment, strata conversion, quiescent skipping, slope cascading, DEUS_Levels mirroring, and serialization round-trips (23/23 tests pass).
- **Mutation Sweep:** Verified against 5 intentional mutants (`no_mirror`, `tick_when_quiet`, `skip_provider`, `save_without_engine`, `double_load`), catching 100% of mutations.
