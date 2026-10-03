# DEUS WBS index

Every work-breakdown file in the repo, with its status. Updated 2026-10-02. Status: **Active** (work allowed now), **Parked** (no work until the Owner reopens it), **Unknown** (not re-audited; treat as parked under the 2026-10-02 priority reset).

Current priority: world loading green (`docs/WBS_ORG.md`). See `docs/DECISIONS.md`.

| WBS | Path | Status |
|---|---|---|
| WBS-ORG: repo organization and architecture | `docs/WBS_ORG.md` | Active (only ORG-0.1, 0.2, 1.1, 1.2, 4.2) |
| WBS-SIM: simulation core | `docs/WBS_SIM.md` | Parked |
| WBS-SPLIT: sim/RMMZ separation | `docs/WBS_SPLIT.md` | Parked |
| WorldGen WBS (WG) | `docs/worldgen/DEUS_WORLDGEN_WBS.md` | Unknown (bounded by WBS-ORG reset) |
| World-Art WBS (DW) | `docs/art/DEUS_WORLD_WBS.md` | Unknown (no art work authorized) |
| Society WBS (SOC) | `docs/society/DEUS_SOCIETY_WBS.md` | Parked (DEC-037 freeze) |
| Geology & Fauna ECS (Phase 3) | `tasks/WBS_GEOLOGY_AND_FAUNA.md` | Unknown |
| Render optimizations (Phase 6) | `tasks/WBS_RENDER_OPTIMIZATIONS.md` | Unknown |
| WorldGen completion | `tasks/WBS_WORLDGEN_COMPLETION.md` | Unknown |
| WBS registry (machine-readable) | `tasks/wbs_registry.json` (checked by `tools/governance/check_wbs_integrity.js`) | Unknown |
| Engine optimizations (Phase 7) | `WBS_OPTIMIZATION_PHASE.md` (repo root of the main checkout, **untracked**, not in git) | Unknown; target location `docs/optimization/WBS_OPTIMIZATION_PHASE.md` once the Owner adds it to git |
