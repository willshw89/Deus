# Task State: DEUS-TSK-FABLE-19C / WG.00.09 — Five-Z Depth Renderer

- **Task ID:** `DEUS-TSK-FABLE-19C`
- **WBS ID:** `WG.00.09`
- **Role:** Writer: Grok (Directive 001-B, Lane E) | Reviewer: Claude CLI session (verdict CHANGES REQUESTED, 2026-09-25)
- **Branch / Worktree:** `task/lane-e` (`C:\Users\snewt\.deus_worktrees\lane-e`)
- **Last Commit:** `[claude] WG.00.09 Independent review of UF_Depth_Attack_Plan.md` (on top of Grok's `c846fc7c`)
- **Current Gate:** Specification review returned **CHANGES REQUESTED** (Claude, 2026-09-25). The plan goes back to Grok for revision. Engine implementation is not started and stays blocked.

## Owned File Set
- `docs/systems/UF_Depth_Attack_Plan.md` (Grok)
- `tasks/DEUS-TSK-FABLE-19C/state.md`
- `tasks/DEUS-TSK-FABLE-19C/claude_review.md` (Claude, reviewer)

Plugins, harnesses, and `game/data` stay read-only for this lane.

## What is Done (with Evidence)
1. **Attack plan authored** at `docs/systems/UF_Depth_Attack_Plan.md` (2026-09-25). It specifies:
   - Five macro-planes `Z-2` through `Z+2`, with up to four lower planes under the camera and none when the camera is on `Z-2`.
   - Exposure as a downward solid-stratum ray (`dHit`), and the shape-grid / `hasOpaqueOverburden` / `continuousAirHeight` reads that must fail as oracles.
   - Integer pixel steps off a 48 px camera tile (at `H = 120`: 46, 44, 43, 41), pad 96 px, no production blur, no `ColorMatrixFilter`.
   - Shade as a load-time lookup onto `art/palette/deus_master_world_palette_v1.hex` (226 colors). Void texel `#0C0D12` (`NEUT_VOID_CAP`). `#08080C` is not in that file.
   - A 16×16 pooled solid-word cache, HP-only `levels:strataChanged` ignored, zero heap allocation inside the depth update.
   - Oracle ids, twenty mutants, and tick bars for a future `tools/test_global_depth_renderer.js`.
2. **Code freeze held.** No edit under `game/js/`, `tools/`, or `game/data/` in this checkpoint. The review confirmed this: `git diff --stat c846fc7c^ c846fc7c -- game tools run_tests.bat` is empty.
3. **Independent review done** (Claude, 2026-09-25): `tasks/DEUS-TSK-FABLE-19C/claude_review.md`. Verdict **CHANGES REQUESTED**: 1 BLOCKER, 8 MAJOR, 9 MINOR. Evidence: a vm probe of the real `DEUS_Levels` on seed 18 (generator 5), a simulation of the §5.2 shade table on `DEUS_PaletteRegistry.json`, and code citations. No harness, mutant, screenshot, or frame time was produced or claimed.

## Exact Next Step
- Grok revises `docs/systems/UF_Depth_Attack_Plan.md` against `claude_review.md`, starting with CR-19C-B1, then resubmits for review.
- The owner / coordinator answers the decisions in `claude_review.md` §4: live-layer transparency ownership and lip banding (B1), how value recession works on short ramps (M1), quantising stand-in art (M2), a new `DEUS_Levels` column-word export (M8), and Rule 13 vs the master void ramp (m7).
- Implementation of `DEUS_Depth.js` and `tools/test_global_depth_renderer.js` stays blocked until a revised spec is accepted and the engine freeze for Lane E is lifted.

## Open Defects / Questions
- **CR-19C-B1 (BLOCKER):** the plan assumes the live tilemap is see-through exactly where `dHit ≥ 1`, but the live tilemap is painted from the derived shape. Seed 18, generator 5: every exposed column on `V = 0` (1,368) and `V = −1` (344) sits under an opaque live tile. On `+1`, 127 cave-roof columns with `dHit = 0` are transparent and would show the void. The lip cases (`O-LIP`, "Roof one level down") are drawn as opaque live floors. The fix lives in files that are read-only for 19C, or is a new `DEUS_Depth` duty.
- **MAJOR:**
  - M1: the shade table changes 0 of 226 colours at depths 1–2 and passes `S-PAL` when it never shades.
  - M2: quantising at paint conflicts with ADR-002 §2.2.
  - M3: the per-repaint shading pass is unbudgeted.
  - M4: the GPU mask is a `SpriteMaskFilter` pass.
  - M5: mutant/check mismatches, including one mutant that can never be killed (`cache_ignores_destroy`) and ten undefined checks.
  - M6: zero-allocation is tested only at `exposed = 0`.
  - M7: the picture gate is narrower than handoff §10.3.
  - M8: block fill needs a `DEUS_Levels` export that doesn't exist.
- MINOR m1–m9: see the review.
- Not updated by this review: `tasks/DEUS-TSK-FABLE-19C/messages.jsonl`, `docs/STATUS.md`, `docs/AUDIT_LOG.md` (outside the file set in `REVIEW_BRIEF.md`).
- 60 FPS, mutant kills, and screenshot contents are still not claimed. The harness was not created and was not run.

## Relevant Commands
```bash
git diff --stat -- docs/systems/UF_Depth_Attack_Plan.md tasks/DEUS-TSK-FABLE-19C/state.md
```
No test command applies to this checkpoint. The future harness, once written, is `node tools/test_global_depth_renderer.js`.
