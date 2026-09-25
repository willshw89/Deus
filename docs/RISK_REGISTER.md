# PROJECT DEUS — MASTER RISK REGISTER

**Governing Standard:** [`docs/QUALITY_ENGINEERING_POLICY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/QUALITY_ENGINEERING_POLICY.md)  
**Maintained By:** Gemini / Antigravity (DEUS Coordinator)  
**Last Updated:** 2026-09-25  

---

## 1. Overview & Operating Protocol

The DEUS Master Risk Register tracks architectural, physical geometry, performance, simulation, persistence, and art-pipeline risks across all subsystems. Available AI compute capacity is continuously deployed against high-impact, high-likelihood risks in the backlog.

### Recognized Risk Statuses
- `OPEN`: Risk identified and analyzed; mitigation pending.
- `MITIGATING`: Active task underway addressing the risk.
- `ACCEPTED`: Known constraint within approved architecture.
- `CLOSED`: Mitigated, verified by automated test, and evidenced in repository.

---

## 2. Active Risk Matrix

| Risk ID | Subsystem | Description | Likelihood | Impact | Detection Method | Mitigation Strategy | Owner | Status | Related WBS |
|---|---|---|:---:|:---:|---|---|:---:|:---:|---|
| **RISK-WG-01** | WorldGen / Strata | Partial-height cut depth ambiguity: measuring from S4 on a `HEIGHT_1` valley floor creates no-op cuts. | HIGH | CRITICAL | Automated prefix assertions in `test_strata_cuts_and_caves.js`. | Require cuts to carve physical strata prefix bytes from standing floor downwards across macro bands. | Fable | `MITIGATING` | `WG.00.08` |
| **RISK-WG-02** | WorldGen / Strata | Cross-Z phantom shelf: carving Z0 S0 without opening Z-1 S4 leaves 1-ft solid barrier between levels. | HIGH | CRITICAL | Boundary pair continuity checks (`e10` vs `e9`). | Couple macro-boundary cell generation; assert both boundary strata are air for open vertical passage. | Fable | `MITIGATING` | `WG.00.08` |
| **RISK-WG-03** | WorldGen / Strata | 4 ft void classified as walkable cave: legacy 19A `head >= 4` deriving `floor` rather than requiring 5 ft upright clearance. | HIGH | HIGH | `continuousAirHeight` oracle prober and Rule 4 mutant suite. | Strict separation: 4 ft void labeled `LOW` void; full passage requires `>= 5` air strata. | Fable | `MITIGATING` | `WG.00.08` |
| **RISK-WG-04** | WorldGen / Strata | Z+2 cave ceiling cap leaking into open sky cells: cap placed beside strata or corrupting unmodeled sky. | MEDIUM | HIGH | Sky sentinel test asserting non-capped Z+2 surface cells report unbounded air. | Enclose Z+2 caves with physical top overburden at S4 without introducing a 6th macro level. | Fable | `MITIGATING` | `WG.00.08` |
| **RISK-PERF-01** | WorldGen / Engine | New Game generation CPU latency hotspot: 6.7s spent in `Levels.hash32` during 256x256 map construction. | HIGH | MEDIUM | CPU profiling harness and step-by-step latency benchmarks. | Optimize hash32 bitwise operations; inline Mulberry32 generator; eliminate redundant noise calls. | Grok / Fable | `OPEN` | `WG.00.08` |
| **RISK-REN-01** | Depth / Renderer | Production depth compositor using `BlurFilter` passes on lower planes, violating no-blur visual directive. | HIGH | HIGH | Static code audit of `game/js/plugins/DEUS_Depth.js` and WebGL filter inspection. | Replace PIXI `BlurFilter` with camera-centered physical scale recession, luminance drop, and saturation reduction. | Grok / Gemini | `OPEN` | `WG.00.09` |
| **RISK-ART-01** | Art Pipeline | Style, scale, and palette drift across distributed image providers (Nano Banana Pro, Grok, Astra). | HIGH | HIGH | Automated mechanical QC, palette snapping tool, and actual RMMZ Golden Review scenes. | Enforce WBS-catalogue lineage, coherent family ownership per provider, rigid 48px grids, and owner visual gate. | Gemini | `OPEN` | `WG.10` / `WG.20` |
| **RISK-FLUID-01** | Fluids / Strata | Cave passage creation corrupting fluid volume conservation or leaking lateral fluid lips. | MEDIUM | CRITICAL | Automated mass conservation check in `test_liquid_depth_simulation.js`. | Reconcile `STRATA_TO_FLUID` capacity updates; assert zero net volume delta across seed sweeps. | Fable | `MITIGATING` | `WG.00.08` |
| **RISK-SAVE-01** | Save / Persistence | Strata delta serialization bloating save files or failing schema migration across generator versions. | MEDIUM | HIGH | Save roundtrip fuzz test and schema migration test suite. | Store only delta masks for modified cells; rebuild static baselines upon map load. | Gemini | `OPEN` | `ARCH.SAVE` |

---

## 3. Risk Mitigation Backlog & Work Routing

When primary milestone implementation is claimed or blocked at a gate, available AI worker capacity is automatically assigned to mitigate open risks in descending order of Severity × Likelihood:
1. `RISK-PERF-01`: Grok benchmarking and algorithm optimization for `hash32`.
2. `RISK-REN-01`: Pre-19C no-blur mathematical compositor specification (completed by Grok Task D).
3. `RISK-WG-02` / `RISK-WG-03`: Automated 1,000-seed invariant validation protocol (completed by Grok Task E).
