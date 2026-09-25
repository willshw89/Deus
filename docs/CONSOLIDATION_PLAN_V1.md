# DEUS — ONE-TIME REPOSITORY & RUNTIME CONSOLIDATION PLAN (V1)
**Authoritative Migration Specification**
**Integration Authority:** Gemini / Antigravity
**Approved by Owner Directive:** 2026-09-25 (Post-19B Consolidation Window)

---

## 1. Executive Principles & Boundaries
1. **Timing Window**: Begins ONLY after `WG.00.08 / FABLE-19B` is accepted, committed, and verified.
2. **Behavioral Equivalence Only**: Zero feature additions, zero balance tweaks, zero speculative refactors during migration.
3. **Ironclad Acceptance Gate**: Every phase is verified by automated test suites, golden seeds (`18`, `20260923`), and native NW.js playtest smoke verification.
4. **OneDrive Elimination**: Live multi-agent development relocates from `c:\Users\snewt\OneDrive\Desktop\UF` to local NVMe SSD `C:\Dev\DEUS`.

---

## 2. Companion Module Architecture & Loaders
Per Owner Directive (Prompt 8), companion modules are classified into two strict categories:

### A. RMMZ_PLUGIN (Registered in `game/js/plugins.js`)
These 4 plugins contain RMMZ hooks, command listeners, or scene/sprite method aliasing. They belong in `game/js/plugins.js` and are loaded via RMMZ's canonical `PluginManager`.
1. `DEUS_Select.js` (Entity selection, click/hover interaction, canvas overlay)
2. `DEUS_Containers.js` (Container inventory, container window hooks)
3. `DEUS_Fluid.js` (Fluid simulation, tilemap rendering reconciliation)
4. `DEUS_Households.js` (Renamed from legacy `UF_Households.js`; colonist household hooks)
*(Plus orphaned `DEUS_Minimap.js`, which should be registered alongside `DEUS_Camera`)*

**De-duplication Rule**: When these 4 modules are added to `game/js/plugins.js`, their names MUST be removed from `DEUS_Core.js` `companionPlugins` array to prevent double-initialization.

### B. INTERNAL_MODULE (Internal Subsystem Computation)
These 6 modules are pure computational libraries with zero RMMZ hooks and zero aliasing. They remain internal modules loaded explicitly by their authoritative parent subsystem:
1. `DEUS_Stockpiles.js` → Owned & loaded by `DEUS_Items.js`
2. `DEUS_Conditions.js` → Owned & loaded by `DEUS_Core.js`
3. `DEUS_Dnd5e.js` → Owned & loaded by `DEUS_Core.js`
4. `DEUS_Callings.js` → Owned & loaded by `DEUS_Colonists.js`
5. `DEUS_HistoricalDemographics.js` → Owned & loaded by `DEUS_History.js`
6. `DEUS_DeathForensics.js` → Owned & loaded by `DEUS_Combat.js`

---

## 3. Backward Compatibility Shim Prune Manifest
Of the 41 legacy `UF_*.js` shims:
- **KEEP (23 shims)**: Referenced in `game/data/*.json` or save schemas. Must NOT be deleted until future save schema migration:
  `UF_ActivityOverlay.js`, `UF_AdvancedJobs.js`, `UF_Architecture.js`, `UF_Camera.js`, `UF_Civilization.js`, `UF_Colonists.js`, `UF_Construction.js`, `UF_Core.js`, `UF_Depth.js`, `UF_DynamicLighting.js`, `UF_Ecology.js`, `UF_Factions.js`, `UF_Floors.js`, `UF_History.js`, `UF_Items.js`, `UF_Jobs.js`, `UF_Levels.js`, `UF_Objects.js`, `UF_Player.js`, `UF_Spatial.js`, `UF_Tiles.js`, `UF_Walls.js`, `UF_World.js`.
- **NEEDS_MIGRATION (17 shims)**: Referenced by test harnesses in `tools/` via `require('../game/js/plugins/UF_xxx.js')`. Update test paths to `DEUS_*.js`, verify tests pass, then prune:
  `UF_BiomeLayers.js`, `UF_ColonySim.js`, `UF_Combat.js`, `UF_Containers.js`, `UF_Culling.js`, `UF_Fluid.js`, `UF_Hills.js`, `UF_Look.js`, `UF_NaturalConnections.js`, `UF_Perspective25D.js`, `UF_ProjectDeusTheme.js`, `UF_RegionNames.js`, `UF_Select.js`, `UF_Sheet.js`, `UF_Visuals.js`, `UF_Wildlife.js`, `UF_WorldGen.js`.
- **PROVEN_SAFE_TO_DELETE (1 shim)**: Zero references anywhere in repo:
  `UF_Minimap.js`.

---

## 4. Hash & PRNG Separation Invariant
- `DEUS_World.js` `hash32` uses FNV-1a *without* the final mixer.
- `DEUS_Levels.js` and `DEUS_WorldGen.js` `hash32` *includes* the final mixer (`xor-shift-multiply`).
- **Strict Invariant**: These implementations MUST NOT be merged, unified, or modified during structural consolidation. Preserving deterministic world generation byte-for-byte is non-negotiable.
- Grok's `hash32_4` zero-allocation optimization is strictly isolated to Phase 10 as an independent performance task.

---

## 5. Ten-Phase Execution Sequence

### Phase 1: Pre-Migration Baseline Capture
- Run `node tools/capture_pre_migration_baseline.js`.
- Capture golden seeds (`18`, `20260923`) checksums, memory footprint, New Game generation latency, save file character counts.
- Record baseline metrics in `scratch/pre_migration_baseline.json`.

### Phase 2: Relocate Active Working Copy to C:\Dev\DEUS
- Create clean clone on local NVMe SSD: `git clone c:\Users\snewt\OneDrive\Desktop\UF C:\Dev\DEUS`.
- Verify clean git status and run `tools/test_strata_cuts_and_caves.js` on `C:\Dev\DEUS`.

### Phase 3: Root & Clutter Elimination
- Delete `uf_astra_bench/` (9,569 duplicate files, 412 MB).
- Delete transient `game_runtime.log` and ensure it is in `.gitignore`.

### Phase 4: Loose File Standardization
- Move loose handoffs into `docs/handoffs/`.
- Move retired documentation (`docs/GUIDE_25D.md`) to `docs/archive/`.
- Rename `game/js/plugins/UF_Households.js` → `game/js/plugins/DEUS_Households.js`.

### Phase 5: Companion Plugin Registration
- Ensure RMMZ editor is closed.
- Update `game/js/plugins.js` to register `DEUS_Select`, `DEUS_Containers`, `DEUS_Fluid`, `DEUS_Households`, and `DEUS_Minimap`.
- Remove these 4 registered plugins from `DEUS_Core.js` `companionPlugins` array.
- Move orphaned `UF_Time.js` to `tools/archive/legacy_time/`.

### Phase 6: Safe Shim Pruning & Test Path Migration
- Update `require()` paths in the 17 test suites from `UF_*.js` to `DEUS_*.js`.
- Run test suites to prove migration success.
- Delete `UF_Minimap.js` and the 17 migrated shims. Keep the 23 save-schema shims.

### Phase 7: Tools Directory Suborganization
- Subdivide `tools/` into `tests/`, `benchmarks/`, `art/`, `archive/`.
- Update `run_tests.bat` to reference new paths.
- Verify all automated test suites run cleanly.

### Phase 8: Full Regression & Native NW.js Verification
- Run full regression suite across all categories: strata, fluid, colony, combat.
- Run NW.js playtest smoke check: Title boot, New Game, area navigation, save/load.
- Capture live screenshot proof.

### Phase 9: Metric Comparison, Performance Baseline & Architecture Freeze
- Run post-migration baseline capture and compare against `scratch/pre_migration_baseline.json`.
- Execute performance scenario benchmarks per [`docs/PERFORMANCE_ARCHITECTURE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/PERFORMANCE_ARCHITECTURE.md) (`PERF_QUIET_WORLD`, `PERF_HEAVY_FLUID`, `PERF_FIVE_Z_EXPOSURE`).
- Assert: zero checksum drift on golden seeds, equal or faster latency, zero console errors, zero unexplained performance regressions.
- Freeze `Repository Layout v1` and `Agent Operating Model v1`.

### Phase 10: Performance Framework, Closed-World Census, Learning Telemetry & Communication Bus
- **Closed-World Runtime Census**: Implement boot census tracking every loaded module, plugin, JSON catalog, audio file, and RMMZ system to identify dead/orphaned code.
- **Performance Instrumentation**: Establish `tools/performance/` (`bench_boot.js`, `bench_worldgen.js`, `bench_ticks.js`, `bench_allocations.js`).
- **Learning Loop Telemetry**: Establish `docs/telemetry/` and logging tools (`log_task_outcome.js`, `audit_reviewer_findings.js`) per [`docs/AGENT_QUALITY_LEARNING_LOOP.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_QUALITY_LEARNING_LOOP.md).
- **Durable Communication Bus**: Deploy `tools/agents/bus.js` and `defect_router.js` per [`docs/AGENT_COMMUNICATION_PROTOCOL.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_COMMUNICATION_PROTOCOL.md) (crash-recoverable task mailboxes).
- **Plugin Update-Hook Audit**: Audit all hooks on `Scene_Map.update`, `Game_Map.update`, `Spriteset_Map.update`, `Sprite_Character.update`.
- **Grok Hash32 Optimization**: Deploy Grok's straight-line `hash32_4` kernel into `DEUS_Levels.js` with 100% bit-identical strata outputs across 1,000 seeds.

---

## 6. Authoritative Policy Cross-References
- **Agent Communication Protocol:** [`docs/AGENT_COMMUNICATION_PROTOCOL.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_COMMUNICATION_PROTOCOL.md) (Structured task mailbox & evidence bus)
- **Agent Quality & Continuous-Learning Standard:** [`docs/AGENT_QUALITY_LEARNING_LOOP.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_QUALITY_LEARNING_LOOP.md) (Evidence-based learning, corrections & telemetry)
- **Performance Architecture Standard:** [`docs/PERFORMANCE_ARCHITECTURE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/PERFORMANCE_ARCHITECTURE.md)
- **Quality Engineering Standard:** [`docs/QUALITY_ENGINEERING_POLICY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/QUALITY_ENGINEERING_POLICY.md)
- **Agent Utilization Standard:** [`docs/AGENT_UTILIZATION_POLICY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_UTILIZATION_POLICY.md)
- **Master Risk Register:** [`docs/RISK_REGISTER.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/RISK_REGISTER.md)

