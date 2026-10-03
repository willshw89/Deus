# DEUS WBS index

Every work-breakdown file in the repo, with its status. Updated 2026-10-02. Status: **Active** (work allowed now), **Parked** (no work until the Owner reopens it), **Unknown** (not re-audited; treat as parked under the 2026-10-02 priority reset).

Current runtime priority: ORG-0.2 worldgen green on **1×1**, with already-authorized isolated support lanes. Owner decisions at 2026-10-02 21:56-23:25 CT record later designs; the performance overlay/log is the only new pre-green performance work. [WORLD-3x3](WBS_ORG.md) is the first planned M1 item after ORG-0.2 green, with defaults 3×3 areas of 256 and wrap on every edge; it has not shipped. Re-run every worldgen hard gate at 3×3 before leaving worldgen. Optimization and other new implementation remain parked; DEC-037 still freezes faction/society code. The next gameplay priority after worldgen exit is WBS-SIM SIM-8: arrive, gather, build a hut, survive a night, then Owner fun assessment. See [DECISIONS.md](DECISIONS.md) D-2026-10-02-8 through -25.

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
| ART-SCALE-1 reference/plan | `docs/art/srd_sizes/SIZES.md`; `docs/DECISIONS.md` D-2026-10-02-16/-17 | Owner-approved tables and item-art design recorded; implementation parked until world loads green |
| UI-FULLSCREEN / depth-plan | `docs/art/CAMERA_DEPTH_PLAN.md`; D-2026-10-02-18/-19 | Camera/input and two-level shaded-depth design queued behind ORG-0.2; no runtime work authorized |
| WBS registry (machine-readable) | `tasks/wbs_registry.json` (checked by `tools/governance/check_wbs_integrity.js`) | Unknown |
| Engine optimizations (Phase 7) | `WBS_OPTIMIZATION_PHASE.md` (repo root of the main checkout, **untracked**, not in git) | Unknown; target location `docs/optimization/WBS_OPTIMIZATION_PHASE.md` once the Owner adds it to git |
