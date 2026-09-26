# Task State: DEUS-TSK-FABLE-19C / WG.00.09 — Five-Z Depth Renderer

- **Task ID:** `DEUS-TSK-FABLE-19C`
- **WBS ID:** `WG.00.09`
- **Role:** Writer: Grok (Lane E, owner ruling R1 = D and R2–R11) | Reviewer: Claude CLI session (re-review of `37fc1473`: CHANGES REQUESTED; this revision is the fold of Section 4)
- **Branch / Worktree:** `task/lane-e` (`C:\Users\snewt\.deus_worktrees\lane-e`)
- **Last Commit:** `[grok] WG.00.09 Update depth attack plan with Owner ruling R1=D and items R2-R11`
- **Current Gate:** Owner ruling recorded and R2–R11 folded into `docs/systems/UF_Depth_Attack_Plan.md`. Awaiting Claude diff review of this revision. Engine implementation is not started and stays blocked.

## Owned File Set
- `docs/systems/UF_Depth_Attack_Plan.md` (Grok)
- `tasks/DEUS-TSK-FABLE-19C/state.md`
- `tasks/DEUS-TSK-FABLE-19C/claude_review.md` (Claude, reviewer; Section 4 re-review added 2026-09-25)

Plugins, harnesses, and `game/data` stay read-only for this lane.

## What is Done (with Evidence)
1. **Attack plan authored** at `docs/systems/UF_Depth_Attack_Plan.md` (2026-09-25), revised against Claude's first review (`37fc1473`), then updated in this commit against the re-review (`claude_review.md` Section 4) and the owner's ruling.
2. **Owner ruling R1 = D recorded** in §5.2 and §9. Scale-only depth separation. No color darkening until tile art is migrated to the master palette. Shading is revisited after that migration. The identity table is the production table until then. `S-STEP` requires a zero change-count. Mutant `shade_stepped` fails it. The deferred candidate (one ramp step at depths 1–2, a second at 3–4, void ids excluded as step targets for non-void colours) is recorded, not built.
3. **R2–R11 folded** (re-review Section 4.2):
   - **R2.** `S-RELATIVE` runs on the stub. It reads `plane.scale.x * 48` for `z = 0` from `V = +1` then `+2` (46, then 44) and for `d = 1` from two cameras (both 46).
   - **R3.** B1, M2, and M8 are labelled **Plan decision (within handoff §9 authority)**. R1 is the owner ruling.
   - **R4.** A still camera still rebuilds live spots every 30 frames. The wrapper allocates nothing. `C-LIVE-ALLOC` runs stock `_addAllSpots` with the wrapper (8 rebuilds in 240 frames). The pan-benchmark GC exemption for the wrapper is dropped.
   - **R5.** Window summary is keyed on the depth-canvas start tile (live start − 2). Rebuild in `updateTilemap`. Wrapper indexes `(x + 2, y + 2)`. `mx, my` wrap before `shapeCodeAt`. `P-CUTOUT` samples `r < 20` and a surgical seam roof.
   - **R6.** Roof fallback and plane-owned `open` cells use the solid look: stone → `rock`, soil → `soil`, wood → `rock`.
   - **R7.** Shade checks paint `tools/test_fixtures/depth_shade_master.png` (missing file exits 2). Future step targets exclude the three void ids for non-void colours.
   - **R8.** `C-STILL`, `C-HP`, `C-ALLOC`, `C-ONE`, `S-PAD`, `S-RELATIVE` are stub. Export `UF.Depth.blockWord`. `O-ROOF-V` builds `V−1` `S4` as air and requires shape `open` (exit 2 otherwise). `C-WRAP` picks a row where `(size−1, y)` differs from `(size−1, y−1)`.
   - **R9.** Eight canvases are 32,219,136 bytes. Shaded copies are 0 under R1 = D. After migration, share equal table columns, skip sheets with no master texel, build at scene start. Tileset 92 four sheets = 8,110,080 bytes per copy.
   - **R10.** Preset `off` keeps the cutout and the roof fallback; holes show the void texel. Handoff §10.1's pure-Node request vs the nw.js render harness is logged in §9.
   - **R11.** Fill follows `deltaLevels` on unknown schema and unreadable records. Wide sprites crop to the largest axis-aligned rectangle of matching `dHit` that includes the foot cell; L-shaped remainder is dropped.
4. **Code freeze held.** This commit edits only `docs/systems/UF_Depth_Attack_Plan.md` and this state file. No edit under `game/js/`, `tools/`, or `game/data/`.
5. **Independent review** (Claude, 2026-09-25) at `tasks/DEUS-TSK-FABLE-19C/claude_review.md`. Verdict on `c846fc7c`: **CHANGES REQUESTED** (1 BLOCKER, 8 MAJOR, 9 MINOR).
6. **Re-review of `37fc1473`** (Claude, 2026-09-25), `claude_review.md` Section 4. Verdict: **CHANGES REQUESTED** (0 BLOCKER, 1 MAJOR, 10 MINOR). B1 and M2–M8 were already resolved in the design. M1 awaited the owner (R1). R2–R11 were text edits.

## Exact Next Step
- **Claude:** diff review of this revision against `claude_review.md` Section 4. No new probes are expected unless the ray, the cutout, or the fill reader changes.
- **Coordinator:** m7 remains an open art decision (Rule 13 cap range vs the master void ramp). The shade revisit waits on master-palette tile art.
- Implementation of `DEUS_Depth.js` and `tools/test_global_depth_renderer.js` stays blocked until the spec is accepted and the engine freeze for Lane E is lifted.

## Open Defects / Questions
- **CR-19C-R1:** resolved by owner as option D. Recorded in the plan.
- **CR-19C-R2–R11:** folded into the plan in this commit.
- **m7 (still open):** Rule 13's cap range (`#08080C`–`#121218`) against the master void ramp (`#060709`, `#0C0D12`, `#14161C`).
- Not updated in this lane: `tasks/DEUS-TSK-FABLE-19C/messages.jsonl`, `docs/STATUS.md`, `docs/AUDIT_LOG.md`. Those belong to the coordinator.
- 60 FPS, mutant kills and screenshot contents are still not claimed. The harness has not been created or run.

## Relevant Commands
```bash
git diff --stat -- docs/systems/UF_Depth_Attack_Plan.md tasks/DEUS-TSK-FABLE-19C/state.md
```
No test command applies to this checkpoint. The future harness, once written, is `node tools/test_global_depth_renderer.js`.
