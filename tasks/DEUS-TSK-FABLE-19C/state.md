# Task State: DEUS-TSK-FABLE-19C / WG.00.09 — Five-Z Depth Renderer

- **Task ID:** `DEUS-TSK-FABLE-19C`
- **WBS ID:** `WG.00.09`
- **Role:** Writer: Grok (Directive 001-F revision, Lane E) | Reviewer: Claude CLI session (re-review of `37fc1473`: CHANGES REQUESTED, 2026-09-25)
- **Branch / Worktree:** `task/lane-e` (`C:\Users\snewt\.deus_worktrees\lane-e`)
- **Last Commit:** `[claude] WG.00.09 Re-review of revised UF_Depth_Attack_Plan.md`
- **Current Gate:** Re-review done: **CHANGES REQUESTED** (0 BLOCKER, 1 MAJOR, 10 MINOR; `claude_review.md` Section 4). B1 and M2–M8 are resolved. M1's shade rule needs an owner decision (R1). R2–R11 are text edits for Grok. Engine implementation is not started and stays blocked.

## Owned File Set
- `docs/systems/UF_Depth_Attack_Plan.md` (Grok)
- `tasks/DEUS-TSK-FABLE-19C/state.md`
- `tasks/DEUS-TSK-FABLE-19C/claude_review.md` (Claude, reviewer; Section 4 re-review added 2026-09-25)

Plugins, harnesses, and `game/data` stay read-only for this lane.

## What is Done (with Evidence)
1. **Attack plan authored** at `docs/systems/UF_Depth_Attack_Plan.md` (2026-09-25), then revised in this commit against Claude's review. The revision resolves CR-19C-B1 and M1–M8:
   - **B1.** A hit on `S4` of the band below belongs to the band above (`zHit = floor((e + 1) / 5) - 2`, `dHit = max(0, V - zHit)`), so lip floors stay on the live map and on that level's entity list. The live WebGL tilemap is not see-through where the ray passes. `DEUS_Depth` wraps the live tilemap's `_addSpot` (that instance only): `dHit ≥ 1` adds no rect on either layer, and a `dHit = 0` cell whose stock tile is transparent (`V > 0`, shape `open`) draws an opaque floor tile of the hit material at scale 1. No PIXI mask, no new shader, no edit to `DEUS_Levels.js` or `DEUS_WorldGen.js`. Screen check `P-CUTOUT` samples roof, hole, void, and live columns at cameras `+2`, `+1`, `0`, and `−1`.
   - **M1.** Nearest-luminance at 4% changes 0 of 226 colours at depths 1–2 on `DEUS_PaletteRegistry.json` (review §3.2). The pixel formula is retired. Depths 1–2 take one ramp step darker, depths 3–4 take a second, clamped at the dark end. Void ids stay identity. Checks: `S-SHADE-ORACLE`, `S-MONO`, `S-STEP` (an identity table fails).
   - **M2.** Master texels use the step table. Non-master texels (stock `Dungeon_A2` / `Outside_A2`, tileset 91) pass through unchanged, counted as art debt (ADR-002 §2.2). Alpha `< 128` becomes 0, alpha `≥ 128` becomes 255. The stock `rgba(0,0,0,0.5)` shadow quad is not drawn on a depth plane.
   - **M3.** Shaded sheet copies are built once per `(sheet, depth)`. A plane repaint is `clearRect` + `drawImage` + `baseTexture.update` on buffers that already exist. No `getImageData` on the repaint path. The 256-bitmap entity pool is gone; sprites `setFrame` on the shared sheet. A pan benchmark reports GC and repaint ms after the sheets are warm.
   - **M4.** No sprite mask and no `SpriteMaskFilter`. Tile ownership is baked into the canvas paint (`draw` only where `dHit = d`). Entities crop with `setFrame`. Mutant `sprite_mask_production` fails `no_sprite_mask`.
   - **M5.** `cache_ignores_destroy` ignores both `cellChanged` and `strataDestroyed` (`strataDestroyed` alone cannot kill `C-DIG`, because `writeCell` emits `cellChanged` first). `max_depth_clamped_2` fails `O-SHAFT-DRAW` (plane 4 bound and drawn). `absolute_z_scale` fails `S-RELATIVE`. `palette_lerp` fails `S-PAL-CANVAS`. `float_scale` fails `S-SCALE-INT` on the applied `plane.scale`. Every check name in the scenario table has a build and an expected result. Node, PIXI-stub, and nw.js harnesses are split. A mutant's exit code comes only from its checks; the driver fails an exit of 0 or a named check missing from the `FAIL` lines. World replacement is on the invalidation list (`world:created`, save load, `strataSchemaVersion`), and the LRU is keyed by world-state identity.
   - **M6.** `C-LIVE-ALLOC` runs with a five-level opening (`exposed > 0`), camera still, and one unit walking on a lower plane. It measures heap growth and GC with `--expose-gc`. `C-ALLOC` at `exposed = 0` remains and is not sufficient. `alloc_unwired` fails the heap side, not the self-reported counter.
   - **M7.** The picture gate is handoff §10.3 again: cameras `−2`, `−1`, `0`, `+1`, `+2`, plus one frame with all five levels visible. Each shot names the column class it samples. No remaining reduction is logged in §9.
   - **M8.** No new `DEUS_Levels` export. Block fill reads `UF.Levels.baseline().strata.m` and the public 22-hex delta at `state.levels[z].strata`, and writes a pooled `Uint32Array`. The 256-column loop allocates nothing. `strataAt` stays off that path.
2. **Code freeze held.** This commit edits only `docs/systems/UF_Depth_Attack_Plan.md` and this state file. No edit under `game/js/`, `tools/`, or `game/data/`.
3. **Independent review** (Claude, 2026-09-25) at `tasks/DEUS-TSK-FABLE-19C/claude_review.md`. Verdict on `c846fc7c`: **CHANGES REQUESTED** (1 BLOCKER, 8 MAJOR, 9 MINOR).
4. **Re-review of `37fc1473`** (Claude, 2026-09-25), `claude_review.md` Section 4. Verdict: **CHANGES REQUESTED** (0 BLOCKER, 1 MAJOR, 10 MINOR).
   - **Resolved:** B1, M2, M3, M4, M6, M7, M8, and m1–m6, m8, m9. m7 is recorded as open.
   - **Partly resolved:** M1 (its checks now work; the decision is R1). M5 (except R2 and R8).
   - **Evidence, all rerun in this session:** the seed-18 probe on the plan's lip ray, seeds 3, 21 and 4, the public-bytes reader against `strataAt`, the step table on the registry, and a master-texel scan of `game/img/tilesets`.
   - No harness, mutant, screenshot or frame time was produced or claimed.

## Exact Next Step
- **Coordinator / owner (R1):** decide the value-recession rule. The measured facts, from Section 4.4.2–4.4.3 of the review:
  - The plan's ramp-step rule darkens depths 1–2 to a median 0.67 of source luminance, and depths 3–4 to 0.47. Depth 1 equals depth 2, and depth 3 equals depth 4.
  - The user's brief (`docs/VISION.md:383`) asks for about 96 / 92 / 88 / 84 %.
  - Only 0.01 % of current tileset texels are master hexes, so on today's art `deus` renders the same as `deus_scale`.
  - The plan's "Owner decision" labels have no owner record.
- **Grok:** edit the plan for R1 (relabel §5.2 and §9 as a proposal) and R2–R11:
  - R2: move `S-RELATIVE` to the stub.
  - R3: relabel the B1, M2 and M8 "owner" choices as plan decisions.
  - R4: the live tilemap repaints every 30 frames; put the wrapper under a heap check.
  - R5: pin the spot-to-summary index; wrap at the seam.
  - R6: the roof-fallback look.
  - R7: a master-palette fixture; void-id step targets.
  - R8: harness labels, a block-word export, and the `O-ROOF-V` precondition.
  - R9: shaded-copy memory.
  - R10: the `off` preset, and the handoff §10.1 departure.
  - R11: reader edge cases and wide-sprite crop.
- **Claude:** diff review of that edit. No new probes are expected unless the ray, the cutout, or the fill reader changes.
- Other open art questions:
  - Rule 13's cap range (`#08080C`–`#121218`) against the master void ramp (`#060709`, `#0C0D12`, `#14161C`) (m7).
  - Which tile a natural roof shows (R6).
- Implementation of `DEUS_Depth.js` and `tools/test_global_depth_renderer.js` stays blocked until the spec is accepted and the engine freeze for Lane E is lifted.

## Open Defects / Questions
- **CR-19C-R1 (MAJOR):** M1's shade rule is labelled an owner decision without an owner record, and it departs from the recorded 2026-09-24 brief. Awaiting the owner.
- **CR-19C-R2–R11 (MINOR):** text edits, listed in `claude_review.md` Section 4.2.
- Not updated in this lane: `tasks/DEUS-TSK-FABLE-19C/messages.jsonl`, `docs/STATUS.md`, `docs/AUDIT_LOG.md`. Those belong to the coordinator.
- 60 FPS, mutant kills and screenshot contents are still not claimed. The harness has not been created or run.

## Relevant Commands
```bash
git diff --stat -- docs/systems/UF_Depth_Attack_Plan.md tasks/DEUS-TSK-FABLE-19C/state.md
```
No test command applies to this checkpoint. The future harness, once written, is `node tools/test_global_depth_renderer.js`.
