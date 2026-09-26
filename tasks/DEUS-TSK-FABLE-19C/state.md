# Task State: DEUS-TSK-FABLE-19C / WG.00.09 — Five-Z Depth Renderer

- **Task ID:** `DEUS-TSK-FABLE-19C`
- **WBS ID:** `WG.00.09`
- **Role:** Writer: Grok (Lane E) | Reviewer: Claude CLI session (re-review of `87c1e5b8`: CHANGES REQUESTED, `claude_review.md` Section 5; N1–N4 folded, awaiting diff review)
- **Branch / Worktree:** `task/lane-e` (`C:\Users\snewt\.deus_worktrees\lane-e`)
- **Last Commit:** `[grok] WG.00.09 Address Claude review findings N1-N4` (plan and this state file)
- **Current Gate:** Section 5 findings N1–N4 are folded into the plan. The Section 5 verdict on `87c1e5b8` was **CHANGES REQUESTED** (0 BLOCKER, 0 MAJOR, 4 MINOR). Claude's next step is a diff review of this revision. Engine implementation has not started and stays blocked.

## Owned File Set
- `docs/systems/UF_Depth_Attack_Plan.md` (Grok)
- `tasks/DEUS-TSK-FABLE-19C/state.md`
- `tasks/DEUS-TSK-FABLE-19C/claude_review.md` (Claude, reviewer; Section 4 and Section 5 re-reviews added 2026-09-25)

Plugins, harnesses, and `game/data` stay read-only for this lane.

## What is Done (with Evidence)
1. **Attack plan authored** at `docs/systems/UF_Depth_Attack_Plan.md` (2026-09-25), revised against Claude's first review (`37fc1473`), then updated in `87c1e5b8` against the re-review (`claude_review.md` Section 4) and the owner's ruling. N1–N4 are item 8.
2. **Owner ruling R1 = D recorded** in §5.2 and §9. Scale-only depth separation. No color darkening until tile art is migrated to the master palette. Shading is revisited after that migration. The identity table is the production table until then. `S-STEP` requires a zero change-count. Mutant `shade_stepped` fails it. The deferred candidate (one ramp step at depths 1–2, a second at 3–4, void ids excluded as step targets for non-void colours) is recorded, not built.
3. **R2–R11 folded** (re-review Section 4.2):
   - **R2.** `S-RELATIVE` runs on the stub. It reads `plane.scale.x * 48` for `z = 0` from `V = +1` then `+2` (46, then 44) and for `d = 1` from two cameras (both 46).
   - **R3.** B1, M2, and M8 are labelled **Plan decision (within handoff §9 authority)**. R1 is the owner ruling.
   - **R4.** A still camera still rebuilds live spots every 30 frames. The wrapper allocates nothing. Section 5 found the 240-frame stock-layer budget could not pass on a correct build. N1 (item 8) replaces that budget.
   - **R5.** Window summary is keyed on the depth-canvas start tile (live start − 2). Rebuild in `updateTilemap`. Wrapper indexes `(x + 2, y + 2)`. `mx, my` wrap before `shapeCodeAt`. `P-CUTOUT` samples `r < 20` and a surgical seam roof.
   - **R6.** Roof fallback and plane-owned `open` cells use the solid look: stone → `rock`, soil → `soil`, wood → `rock`.
   - **R7.** Shade checks paint `tools/test_fixtures/depth_shade_master.png` (missing file exits 2). Future step targets exclude the three void ids for non-void colours.
   - **R8.** `C-STILL`, `C-HP`, `C-ALLOC`, `C-ONE`, `S-PAD`, `S-RELATIVE` are stub. Export `UF.Depth.blockWord`. `O-ROOF-V` builds `V−1` `S4` as air and requires shape `open` (exit 2 otherwise). `C-WRAP` picks a row where `(size−1, y)` differs from `(size−1, y−1)`.
   - **R9.** Eight canvases are 32,219,136 bytes. Shaded copies are 0 under R1 = D. After migration, share equal table columns, skip sheets with no master texel, build at scene start. Tileset 92 four sheets = 8,110,080 bytes per copy.
   - **R10.** Preset `off` keeps the cutout and the roof fallback; holes show the void texel. Handoff §10.1's pure-Node request vs the nw.js render harness is logged in §9.
   - **R11.** Fill follows `deltaLevels` on unknown schema and unreadable records. Wide sprites crop to the largest axis-aligned rectangle of matching `dHit` that includes the foot cell; L-shaped remainder is dropped. Section 5 found `entity_clip` disagreed with that rectangle and the rule had no tie-break. N3 (item 8) pins both.
4. **Code freeze held.** The R2–R11 commit and this N1–N4 commit each edit only `docs/systems/UF_Depth_Attack_Plan.md` and this state file. No edit under `game/js/`, `tools/`, or `game/data/`.
5. **Independent review** (Claude, 2026-09-25) at `tasks/DEUS-TSK-FABLE-19C/claude_review.md`. Verdict on `c846fc7c`: **CHANGES REQUESTED** (1 BLOCKER, 8 MAJOR, 9 MINOR).
6. **Re-review of `37fc1473`** (Claude, 2026-09-25), `claude_review.md` Section 4. Verdict: **CHANGES REQUESTED** (0 BLOCKER, 1 MAJOR, 10 MINOR). B1 and M2–M8 were already resolved in the design. M1 awaited the owner (R1). R2–R11 were text edits.
7. **Re-review of `87c1e5b8`** (Claude, 2026-09-25, Directive 001-H), `claude_review.md` Section 5. Verdict: **CHANGES REQUESTED** (0 BLOCKER, 0 MAJOR, 4 MINOR).
   - **R1: resolved.** DEC-006 in `docs/OWNER_DECISIONS.md` (`eefd1f2c`, now in this branch via the merge of `main`) records Option D, and the plan implements it.
   - **Also resolved:** R2, R3 and R5–R10.
   - **Partly resolved at that review:** R4 and R11(b), which became N1 and N3.
   - **New at that review (N2):** an ordering gap.
   - **Evidence:** a heap probe of stock `Tilemap.Layer.addRect` (311,544 B over 8 rebuilds; an empty measurement window is 616 B), plus a code read of the update order.
8. **N1–N4 folded** into `docs/systems/UF_Depth_Attack_Plan.md` (this commit). Text only. No harness was created or run.
   - **N1.** `C-LIVE-ALLOC` uses two recording layers (`addRect` writes a pooled typed array; `clear` resets a count). Stock `_addAllSpots` through `_readMapData` stay stock. Stock `addRect` allocation is outside the depth budget. The check is three windows after `global.gc()`, least window judged, zero collections, under 1 byte per frame, with `framesPerWindow` at least 100 times the same-run empty-window growth (61,620 frames at the reviewed 616 B floor), matching `tools/test_strata_foundation.js` `no_allocation_queries` (`:768-787`). The pan benchmark reports live-rebuild collections and judges a depth-canvas flush net of an empty sample pair.
   - **N2.** The `cellChanged` handler only marks the block dirty. The depth update sets `_needsRepaint` after it rebuilds the summary for a dirty in-window block, or because `V` or `H` changed. New stub check `C-DIG-REPAINT`. New mutant `repaint_left_to_handler`.
   - **N3.** Section 7 tie-break: greater height, then greater width, then the foot row as the bottom edge, then the left edge closer to the foot. `entity_clip` expects the one-sided 96×48 frame, the two-sided 48×48 foot cell, and the tie's 48×96 column.
   - **N4.** Header, §5.2, and the §9 row cite DEC-006 in `docs/OWNER_DECISIONS.md`. `art/palette/uf.hex` is cited as 256 lines and 250 distinct colors.

## Exact Next Step
- **Claude:** diff review of this revision. No new probe is expected unless the cutout ordering or the allocation check changes shape.
- **Grok:** wait for that diff review. Do not start `DEUS_Depth.js` or `tools/test_global_depth_renderer.js`.
- **Coordinator:**
  - `main` is merged into `task/lane-e` (`6633993d`), so DEC-006 (`eefd1f2c`) and ADR-002 Rev 2 are in the branch.
  - m7 is still an open art decision (Rule 13 cap range vs the master void ramp). If ADR-002 Rev 2 is accepted, it also decides the void texel (Section 5.3 item 1).
  - The shade revisit waits on master-palette tile art.
- Implementation of `DEUS_Depth.js` and `tools/test_global_depth_renderer.js` stays blocked until the spec is accepted and the engine freeze for Lane E is lifted.

## Open Defects / Questions
- **CR-19C-R1:** resolved. Owner ruling DEC-006 = Option D (`docs/OWNER_DECISIONS.md`, `eefd1f2c`); the plan implements it and cites it.
- **CR-19C-R2–R11:** resolved in the plan. R4 and R11(b) continued as N1 and N3 and are folded below.
- **CR-19C-N1 (MINOR):** folded. `C-LIVE-ALLOC` uses recording layers and a long window sized like `no_allocation_queries`. The pan benchmark reports live-rebuild collections.
- **CR-19C-N2 (MINOR):** folded. The depth update sets `_needsRepaint` after the post-dig summary rebuild. `C-DIG-REPAINT` and `repaint_left_to_handler` cover it.
- **CR-19C-N3 (MINOR):** folded. Section 7 has a height-first tie-break, and `entity_clip` expects the frames that rule produces.
- **CR-19C-N4 (MINOR):** folded. DEC-006 is cited in the header, §5.2, and §9. `uf.hex` is 256 lines and 250 distinct colors.
- **ADR-002 Rev 2 (PROPOSED, in this branch since the merge of `main`):** `uf.hex` becomes canonical for runtime, but the plan's void texel `#0C0D12` is a master colour. This is for the coordinator.
- **m7 (still open):** Rule 13's cap range (`#08080C`–`#121218`) against the master void ramp (`#060709`, `#0C0D12`, `#14161C`).
- Not updated in this lane: `tasks/DEUS-TSK-FABLE-19C/messages.jsonl`, `docs/STATUS.md`, `docs/AUDIT_LOG.md`. Those belong to the coordinator.
- 60 FPS, mutant kills and screenshot contents are still not claimed. The harness has not been created or run.

## Relevant Commands
```bash
git diff --stat -- docs/systems/UF_Depth_Attack_Plan.md tasks/DEUS-TSK-FABLE-19C/state.md tasks/DEUS-TSK-FABLE-19C/claude_review.md
git show main:docs/OWNER_DECISIONS.md   # DEC-006 / R1
```
No test command applies to this checkpoint. The future harness, once written, is `node tools/test_global_depth_renderer.js`.
