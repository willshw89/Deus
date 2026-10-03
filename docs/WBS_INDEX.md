# DEUS WBS index

Every work-breakdown file in the repo, with its status. Updated 2026-10-02. Status: **Active** (work allowed now), **Parked** (no work until the Owner reopens it), **Unknown** (not re-audited; treat as parked under the 2026-10-02 priority reset).

Current runtime priority: ORG-0.2 worldgen green, with already-authorized isolated support lanes. Owner decisions at 2026-10-02 21:56-22:15 CT authorize DESIGN RECORDING only: all new implementation remains parked until ORG-0.2 green; DEC-037 still freezes faction/society code. Before leaving worldgen, the hard gates in WBS_ORG must also pass. Next gameplay priority is WBS_SIM SIM-8: arrive, gather, build a hut, survive a night, then Owner fun assessment before more systems. See [DECISIONS.md](DECISIONS.md) D-2026-10-02-8 through -15.

| WBS | Path | Status |
|---|---|---|
| WBS-ORG: repo organization and architecture | `docs/WBS_ORG.md` | Existing ORG-0.2 and authorized support work active; new exit-gate/art/licensing entries design only |
| WBS-SIM: simulation core | `docs/WBS_SIM.md` | Design updated: scale/parity/benchmark, backgrounds/feats, tech tree, save migrations and playable slice; implementation parked |
| WBS-SPLIT: sim/RMMZ separation | `docs/WBS_SPLIT.md` | Soft first-follow-on design recorded; implementation parked |
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
