# DEUS WBS index

Every work-breakdown file in the repo, with its status. Updated 2026-10-03. Status: **Active** (work allowed now), **Parked** (no work until the Owner reopens it), **Unknown** (not re-audited; treat as parked under the 2026-10-02 priority reset).

Current runtime priority: ORG-0.2 worldgen green on **1×1**, with already-authorized isolated support lanes. Owner decisions from 2026-10-02 21:56 CT and the later depth/wall addenda record later designs; the performance overlay/log is the only new pre-green performance work. [WORLD-3x3](WBS_ORG.md) is the first planned M1 item after ORG-0.2 green, with defaults 3×3 areas of 256 and wrap on every edge; it has not shipped. Re-run every worldgen hard gate at 3×3 before leaving worldgen. Optimization and other new implementation remain parked; DEC-037 still freezes faction/society code. The next gameplay priority after worldgen exit is WBS-SIM SIM-8: arrive, gather, build a hut, survive a night, then Owner fun assessment. See [DECISIONS.md](DECISIONS.md) D-2026-10-02-8 through -26 and D-2026-10-03-1.

| WBS | Path | Status |
|---|---|---|
| WBS-ORG: repo organization and architecture | `docs/WBS_ORG.md` | ORG-0.2 1×1 active; WORLD-3x3 first planned M1 item after green; worldgen hard gates apply at 3×3 |
| WBS-SIM: simulation core | `docs/WBS_SIM.md` | Performance overlay/log is the pre-green exception; later measured optimizations, scale/parity/benchmark, backgrounds/feats, tech, saves and playable slice are parked |
| WBS-SPLIT: sim/RMMZ separation | `docs/WBS_SPLIT.md` | Soft first-follow-on design and later plain-data worker boundary recorded; implementation parked |
| WorldGen WBS (WG) | `docs/worldgen/DEUS_WORLDGEN_WBS.md` | Owner exit-gate addendum recorded; older completion/status claims not re-audited |
| World-Art WBS (DW) | `docs/art/DEUS_WORLD_WBS.md` | Throughput/placeholder planning cross-reference only; no art production authorized |
| Society WBS (SOC) | `docs/society/DEUS_SOCIETY_WBS.md` | Design cross-references recorded; implementation parked under DEC-037 |
| Geology & Fauna ECS (Phase 3) | `tasks/WBS_GEOLOGY_AND_FAUNA.md` | Unknown |
| Render optimizations (Phase 6) | `tasks/WBS_RENDER_OPTIMIZATIONS.md` | Unknown |
| WorldGen completion | `tasks/WBS_WORLDGEN_COMPLETION.md` | Unknown |
| Research/proposal intake (not a WBS or runtime lane) | `docs/research/README.md` | Gemini drafts/research are proposals only; each item needs Owner approval |
| ART-SCALE-1 reference/plan | `docs/art/srd_sizes/SIZES.md`; `docs/DECISIONS.md` D-2026-10-02-16/-17/-21 | Owner-approved tables and item-art design, with ship-map supersession, recorded; implementation parked until world loads green |
| UI-FULLSCREEN / depth-plan | `docs/art/CAMERA_DEPTH_PLAN.md`; D-2026-10-02-18/-19/-26 and D-2026-10-03-1 | Camera/input and two-level depth design with later rim, cliff faces, cached grade and Owner shaft screenshot queued behind ORG-0.2; wall choice resolved to 48 px face + 48 px cap = 96 px frame; no runtime work authorized |
| M1/M2 CORE and DATA lane stubs | [Parked plan index at 60d6456d](https://github.com/willshw89/Deus/blob/60d6456dda4f2f714ec944db22d1d34b11a945f3/docs/plans/core-tech/README.md) on separate `task/core-tech-plan-docs` | After ORG-0.2 green and WORLD-3x3: DATA-RNG, DATA-SAVE, DATA-TICK, DATA-EVENTS, CORE-PQ, CORE-SPATIAL, DATA-ECS, DATA-SCHED, DATA-JOBS, CORE-HPA, CORE-CHUNKCACHE, DATA-INSPECT. DATA-CONTRACT is separately parked with no order assigned. Stubs are not merged into this branch or main; no implementation or vendor copy authorized |
| WBS registry (machine-readable) | `tasks/wbs_registry.json` (checked by `tools/governance/check_wbs_integrity.js`) | Unknown |
| Engine optimizations (Phase 7) | `WBS_OPTIMIZATION_PHASE.md` (repo root of the main checkout, **untracked**, not in git) | Unknown; target location `docs/optimization/WBS_OPTIMIZATION_PHASE.md` once the Owner adds it to git |
