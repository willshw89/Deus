# RISK REGISTER — Project DEUS

**Risk Management Authority:** Owner Terminal (Gemini)  
**Last Updated:** 2026-09-22  

---

## 1. Active Risk Log

| Risk ID | Category | Description | Severity | Probability | Impact | Mitigation Strategy | Status |
|---|---|---|---|---|---|---|---|
| `RISK-001` | Architecture / Persistence | `JsonEx` circular serialization crash (`Error: Object too deep` at depth 100). | `CRITICAL` | `MEDIUM` | Crashes save/load completely; corrupts user saves. | Strict architectural boundary: **Save truth, rebuild cache**. Never serialize UI windows, Bitmaps, Pixi objects, or circular object graphs in `$gameSystem` or world state. Schema versioning (`saveSchemaVersion: 1`). | `CONTROLLED` (Audited in smoke suite) |
| `RISK-002` | Editor Safety | RMMZ editor (`RPGMZ.exe`) overwrites disk files on save if kept open while agents modify `game/data/*.json` or `plugins.js`. | `CRITICAL` | `HIGH` | Reverts plugin registrations, map properties, and system parameters silently. | Binding protocol: Agents must confirm RMMZ editor is CLOSED before modifying `game/data/*.json` or `plugins.js`. Notify owner to restart editor immediately after edits. | `ACTIVE_MONITORING` |
| `RISK-003` | Performance | Global full-world entity, item, or tile iteration per frame violating the 16.6ms frame budget (60 FPS). | `MAJOR` | `MEDIUM` | Frame stutter, lag on 144Hz displays, severe drop below 30 FPS at 8x speed. | Strict ban on full-world scans per frame. Spatial hash bucketing for entity/item lookups. Interleaved or staggered ticking (250 entities per slice) when entity count exceeds 1,000. Measured in `tools/run_tests.js`. | `CONTROLLED` |
| `RISK-004` | Provenance / IP | Unlicensed, ripped, or reference-game art (U7 `SHAPES.VGA`, U8, Dwarf Fortress raws) shipping in production. | `CRITICAL` | `LOW` | Legal exposure, copyright infringement, asset rejection. | Binding Rule 8 & 11: All shipped art must originate from Google Nano Banana Pro or authentic original sources. Every asset passes `tools/originality_check.js`. Stand-ins prefixed with `U7_` and listed in `docs/STATUS.md`. | `CONTROLLED` |
| `RISK-005` | Model Availability | Worker model unavailability (credit exhaustion on Astra/Fable) halting feature delivery. | `MAJOR` | `HIGH` | Blocks planned implementation blocks, stalls roadmap progress. | Explicit model availability tracking (`docs/MODEL_AVAILABILITY.md`). Fallback to Gemini for architecture reviews, test writing, data catalogs, and art production. Mark affected blocks `WAITING_FOR_MODEL_CREDITS` without faking handoffs. | `ACTIVE_MONITORING` |
| `RISK-006` | Multi-Agent Coordination | Overlapping edits across multiple agent sessions corrupting files or overwriting uncommitted work. | `MAJOR` | `MEDIUM` | Loss of progress, merge conflicts, inconsistent system states. | Mandatory task claiming in `docs/STATUS.md` and `docs/WORK_QUEUE.md` before touching code. Strict branch/worktree isolation. Governed by [`docs/AGENT_COMMUNICATION_PROTOCOL.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_COMMUNICATION_PROTOCOL.md), [`docs/AGENT_QUALITY_LEARNING_LOOP.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_QUALITY_LEARNING_LOOP.md), and [`docs/AGENT_UTILIZATION_POLICY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/AGENT_UTILIZATION_POLICY.md). Never run `git add -A` or `git commit -a`. | `CONTROLLED` |
| `RISK-007` | Rendering / Assets | Image loading race condition causing fatal `ImageManager.isReady()` crash on startup. | `MAJOR` | `LOW` | Infinite loading spinner, game fails to reach title scene. | Register fallback placeholder bitmaps (`$Standin_48x48.png`) in `DEUS_Core.js`. Continuous audit via `tools/generate_asset_inventory.js`. | `CONTROLLED` |

---

## 2. Canonical Performance Risks (PERF-001 to PERF-006)
*Governed by [`docs/PERFORMANCE_ARCHITECTURE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/PERFORMANCE_ARCHITECTURE.md)*

### Status Vocabulary:
`OPEN` | `ARCHITECTURALLY_MITIGATED` | `BENCHMARK_PENDING` | `BENCHMARK_VERIFIED` | `REGRESSION` | `CLOSED`

### Performance Claim Rule:
- **DESIGN CLAIM**: Architectural property (e.g., *"Architecture avoids full-world recurring scans via active queues"*).
- **MEASURED CLAIM**: Empirically verified against repeatable scenarios (e.g., *"PERF_HEAVY_FLUID measured 7.4 ms avg / 11.2 ms p95 on reference hardware"*).  
*Strict Rule: Only measured claims may be designated benchmark-verified.*

| Risk ID | Title | Category | Threat Description | Severity | Impact | Architectural Mitigation | Status |
|---|---|---|---|---|---|---|---|
| `PERF-001` | Full-World Recurring Scans | Simulation | Scanning 65,536 world cells every frame for fluids, growth, or needs. | `CRITICAL` | Massive frame drop (<10 FPS) at scale. | Strict Active-Work queue and dirty-region architecture. Settled state = 0 ms. | `ARCHITECTURALLY_MITIGATED` (Benchmark pending) |
| `PERF-002` | Offscreen Sprite Animation | Rendering | Thousands of offscreen flora, water, and fire sprites ticking animation loops. | `MAJOR` | Wasteful GPU/CPU matrix updates. | Global shared animation tick (`frame3`) + aggressive viewport culling. | `ARCHITECTURALLY_MITIGATED` (Benchmark pending 19C) |
| `PERF-003` | Five-Z Overdraw | Rendering | Rendering five full world maps stacked vertically, overwhelming fill-rate. | `CRITICAL` | Severe GPU bottleneck on integrated graphics. | Exposed-region culling; render only visible hole/ravine geometry. No production blur. | `BENCHMARK_PENDING` (Queued 19C) |
| `PERF-004` | 1,000-Creature Update Saturation | Simulation / AI | 1,000 AI agents evaluating A* paths and decision trees concurrently. | `CRITICAL` | Frame freeze on high-population maps. | Staggered 4-tier simulation (A/B/C/D); spatial partitioning; coarse offscreen AI. | `ARCHITECTURALLY_MITIGATED` (Benchmark pending) |
| `PERF-005` | Garbage Collection Stutter | Memory / Engine | Object literal and array allocations in hot paths triggering periodic GC freezes. | `MAJOR` | Periodic micro-stutters and p99 frame spikes. | Zero-allocation hot path rule; typed arrays; preallocated scratch memory structs. | `ARCHITECTURALLY_MITIGATED` (Benchmark pending) |
| `PERF-006` | Startup & Plugin Growth | Boot / Loading | Cumulative plugin registration and asset preloading inflating launch latency. | `MAJOR` | Slow boot times (>5s), high baseline memory. | Closed-world runtime catalog; demand-driven lazy asset loading. | `BENCHMARK_PENDING` (Queued Consolidation) |

---

## 3. Organizational & Operational Risks (ORG-001 to ORG-003)
*Governed by [`docs/DEUS_ORGANIZATIONAL_OPERATING_SYSTEM.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/DEUS_ORGANIZATIONAL_OPERATING_SYSTEM.md)*

| Risk ID | Title | Category | Threat Description | Severity | Impact | Mitigation Strategy | Status |
|---|---|---|---|---|---|---|---|
| `ORG-001` | Process Bloat & Bureaucracy | Governance | Accumulating procedural overhead, redundant templates, and synthetic gates that impede development velocity. | `MAJOR` | Slower iteration, token inflation, agent confusion. | Anti-Goodhart rule; explicit 6-question anti-bloat gate; bounded process experiments with mandatory evaluate/revert cycles. | `CONTROLLED` |
| `ORG-002` | Environment & Dependency Drift | Infrastructure | Differing local Node.js, NW.js, or OS configurations producing non-reproducible test or runtime failures. | `MAJOR` | "Works on my machine" failures, broken builds. | Canonical version-locking in [`docs/DEPENDENCY_POLICY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/DEPENDENCY_POLICY.md); automated pre-flight environment checks. | `CONTROLLED` |
| `ORG-003` | Credential Leakage in Telemetry | Security | Accidental logging or committing of provider API tokens, session headers, or private paths in task mailboxes or git. | `CRITICAL` | Security breach, unauthorized account drain. | Zero-secrets invariant in [`docs/SECURITY_AND_SECRETS.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/SECURITY_AND_SECRETS.md); automated pre-commit scanning. | `CONTROLLED` |

---

## 4. World Lifecycle & Geomorphology Risks (LIFE-001 to LIFE-004)
*Governed by `WG.65` in [`docs/worldgen/DEUS_WORLDGEN_WBS.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/worldgen/DEUS_WORLDGEN_WBS.md) and [`docs/INVARIANT_REGISTRY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/INVARIANT_REGISTRY.md)*

| Risk ID | Title | Category | Threat Description | Severity | Impact | Mitigation Strategy | Status |
|---|---|---|---|---|---|---|---|
| `LIFE-001` | Physical Matter Leakage in Lifecycle | Simulation | Matter silently deleted or leaked when constructions collapse, erode, or naturalize. | `CRITICAL` | Breaks mass-conservation; world hollows out over centuries. | Closed-loop geomass accounting (`WG.65.15`); material transfer state machine preserving volume in strata. | `ARCHITECTURALLY_MITIGATED` |
| `LIFE-002` | Accidental Finite Resource Respawning | Simulation / Economy | Naturalization or pedogenesis accidentally fabricating fresh metal ore veins (Fe, Cu, Ag, Au, Pt). | `CRITICAL` | Destroys economic scarcity; invalidates finite resource gameplay. | Strict invariant `INV-SIM-03`; depleted veins marked permanently exhausted in world state; zero regeneration. | `ARCHITECTURALLY_MITIGATED` |
| `LIFE-003` | Historical Over-Erasure | Narrative / World | Naturalization erasing meaningful player/faction historical geography too rapidly or completely. | `MAJOR` | World history feels impermanent; ruins feel generic. | Material-differentiated decay rates (`WG.65.10`); monumental stone leaves permanent foundation remnants. | `ARCHITECTURALLY_MITIGATED` |
| `LIFE-004` | Catch-Up Nondeterminism | WorldGen / Simulation | Century-scale long-time catch-up simulation producing divergent terrain states across repeated runs. | `CRITICAL` | Divergent multiplayer/simulation history; breaks replayability. | Pure-function deterministic equation driven strictly by seed, elapsed delta, and local geology (`WG.65.13`). | `ARCHITECTURALLY_MITIGATED` |

---

## 5. Natural World Systems & Catalogue Risks (NAT-001 to NAT-004)
*Governed by [`docs/worldgen/DEUS_NATURAL_WORLD_SYSTEMS.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/worldgen/DEUS_NATURAL_WORLD_SYSTEMS.md) and [`docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/worldgen/DEUS_WORLD_STATE_REGISTRY.md)*

| Risk ID | Title | Category | Threat Description | Severity | Impact | Mitigation Strategy | Status |
|---|---|---|---|---|---|---|---|
| `NAT-001` | Visual State & Catalogue Explosion | Art Pipeline / Assets | Generating unique tiles for continuous simulation parameters (e.g. moisture 1..100, fertility 1..100) inflating atlas memory beyond budget. | `CRITICAL` | Heap saturation, V8 crashes, unmaintainable asset catalogues. | Strict semantic banding (`DRY`, `NORMAL`, `MOIST`, `SATURATED`); compositional layering; mandatory visual-state inventory (`DEUS_NATURAL_WORLD_SYSTEMS.md`). | `ARCHITECTURALLY_MITIGATED` |
| `NAT-002` | WorldGen vs. Simulation Authority Drift | Architecture / Simulation | Divergence between initial worldgen representations and live simulation logic creating duplicate world models. | `CRITICAL` | Desynchronization, corrupted save games, split state authority. | Single Authoritative World Invariant (`INV-ENG-02`); Worldgen and Simulation both read/write the same five-strata model (`DEUS_Levels.js`, `DEUS_Fluid.js`). | `ARCHITECTURALLY_MITIGATED` |
| `NAT-003` | Full-World Recurring Ecological Scanning | Performance / Simulation | Background natural systems (aquifers, soil moisture, wildfire, wildlife) iterating 65,536 cells per frame. | `CRITICAL` | Severe frame rate collapse (<10 FPS) at scale. | Multi-timescale execution (action, daily, seasonal, century); active-front queues; dirty bounding boxes; stable wilderness = 0 ms CPU. | `ARCHITECTURALLY_MITIGATED` |
| `NAT-004` | Premature Ad-Hoc Art Generation | Governance / Pipeline | Generating artwork before semantic catalogue entry, atlas coordinate allocation, and visual classification are completed. | `MAJOR` | Orphan assets, wasted model credits, atlas fragmentation. | Catalogue-First Rule (`WBS -> SYSTEM -> VISIBLE STATE -> CATALOGUE -> ATLAS -> READY`); automated bi-directional validation tool (`WG.33`). | `CONTROLLED` |

---

## 6. Risk Escalation Protocol

If any risk reaches an active failure state:
1. **Freeze Execution**: Immediately halt dependent work blocks.
2. **Issue Incident Notice**: Log incident with exact stack trace, failing files, and reproduction steps.
3. **Escalate to Owner**: Present bounded recovery options directly in Owner Terminal.
4. **Deploy Recovery Plan**: Execute git rollback or restore verified backup archive before resuming work.



