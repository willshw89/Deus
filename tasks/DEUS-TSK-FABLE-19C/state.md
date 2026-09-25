# Task State: DEUS-TSK-FABLE-19C / WG.00.09 — Five-Z Depth Renderer

- **Task ID:** `DEUS-TSK-FABLE-19C`
- **WBS ID:** `WG.00.09`
- **Role:** Writer: Grok (Directive 001-B, Lane E) | Reviewer: Claude CLI session
- **Branch / Worktree:** `task/lane-e` (`C:\Users\snewt\.deus_worktrees\lane-e`)
- **Last Commit:** this checkpoint (`[grok] WG.00.09 Depth renderer specification and pre-attack plan`)
- **Current Gate:** Specification and pre-attack plan. Engine implementation is not started.

## Owned File Set
- `docs/systems/UF_Depth_Attack_Plan.md`
- `tasks/DEUS-TSK-FABLE-19C/state.md`

Plugins, harnesses, and `game/data` stay read-only for this lane.

## What is Done (with Evidence)
1. **Attack plan authored** at `docs/systems/UF_Depth_Attack_Plan.md` (2026-09-25). It specifies:
   - Five macro-planes `Z-2` through `Z+2`, with up to four lower planes under the camera and none when the camera is on `Z-2`.
   - Exposure as a downward solid-stratum ray (`dHit`), and the shape-grid / `hasOpaqueOverburden` / `continuousAirHeight` reads that must fail as oracles.
   - Integer pixel steps off a 48 px camera tile (at `H = 120`: 46, 44, 43, 41), pad 96 px, no production blur, no `ColorMatrixFilter`.
   - Shade as a load-time lookup onto `art/palette/deus_master_world_palette_v1.hex` (226 colors). Void texel `#0C0D12` (`NEUT_VOID_CAP`). `#08080C` is not in that file.
   - A 16×16 pooled solid-word cache, HP-only `levels:strataChanged` ignored, zero heap allocation inside the depth update.
   - Oracle ids, twenty mutants, and tick bars for a future `tools/test_global_depth_renderer.js`.
2. **Code freeze held.** No edit under `game/js/`, `tools/`, or `game/data/` in this checkpoint.

## Exact Next Step
- Claude review of `docs/systems/UF_Depth_Attack_Plan.md`.
- Implementation of `DEUS_Depth.js` and `tools/test_global_depth_renderer.js` stays blocked until this spec is accepted and the engine freeze for Lane E is lifted.

## Open Defects / Questions
- None filed against this spec yet. The plan records conflicts with the 19C handoff and `docs/audits/GROK_PRE_19C_ARCHITECTURE_REVIEW.md` in its section 9 (shader vs palette table, which event dirties the mask, raw fraction vs integer step).
- 60 FPS, mutant kills, and screenshot contents are not claimed. The harness was not created and was not run.

## Relevant Commands
```bash
git diff --stat -- docs/systems/UF_Depth_Attack_Plan.md tasks/DEUS-TSK-FABLE-19C/state.md
```
No test command applies to this checkpoint. The future harness, once written, is `node tools/test_global_depth_renderer.js`.
