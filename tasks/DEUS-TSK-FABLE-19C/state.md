# Task State: DEUS-TSK-FABLE-19C / WG.00.09 — Five-Z Depth Renderer

- **Task ID:** `DEUS-TSK-FABLE-19C`
- **WBS ID:** `WG.00.09`
- **Role:** Writer: Grok (Directive 001-F revision, Lane E) | Reviewer: Claude CLI session (prior verdict CHANGES REQUESTED, 2026-09-25)
- **Branch / Worktree:** `task/lane-e` (`C:\Users\snewt\.deus_worktrees\lane-e`)
- **Last Commit:** `[grok] WG.00.09 Revise depth attack plan resolving review findings (Directive 001-F)`
- **Current Gate:** Specification revised against `claude_review.md`. Awaiting Claude's re-review. Engine implementation is not started and stays blocked.

## Owned File Set
- `docs/systems/UF_Depth_Attack_Plan.md` (Grok)
- `tasks/DEUS-TSK-FABLE-19C/state.md`
- `tasks/DEUS-TSK-FABLE-19C/claude_review.md` (Claude, reviewer; not edited by this revision)

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
3. **Independent review** (Claude, 2026-09-25) remains at `tasks/DEUS-TSK-FABLE-19C/claude_review.md`. Verdict on the previous text was **CHANGES REQUESTED**. This revision has not been re-reviewed. No harness, mutant, screenshot, or frame time was produced or claimed.

## Exact Next Step
- Claude re-reviews `docs/systems/UF_Depth_Attack_Plan.md` against `claude_review.md`.
- One art question stays open and is logged in plan §9, not decided here: Rule 13's cap range (`#08080C`–`#121218`) against the master void ramp (`#060709`, `#0C0D12`, `#14161C`). The compositor does not invent `#08080C`.
- Implementation of `DEUS_Depth.js` and `tools/test_global_depth_renderer.js` stays blocked until the revised spec is accepted and the engine freeze for Lane E is lifted.

## Open Defects / Questions
- **Resolved in the plan, not yet re-reviewed:** CR-19C-B1 and M1–M8, as listed above. Minors m1 (lip entities), m2 (pad coverage and `H ≥ 90`), m3 (canvas 1104×912), m4 (presence mask), m5 (world identity and wrap), m6 (cap events ignored), m8 (handoff departures and the wall-cap crop), and m9 (wording) are corrected in the same pass because the rewritten sections would otherwise still say the false thing. **m7** is recorded in §9 as an open art conflict.
- Not updated by this revision: `tasks/DEUS-TSK-FABLE-19C/messages.jsonl`, `docs/STATUS.md`, `docs/AUDIT_LOG.md`.
- 60 FPS, mutant kills, and screenshot contents are still not claimed. The harness was not created and was not run.

## Relevant Commands
```bash
git diff --stat -- docs/systems/UF_Depth_Attack_Plan.md tasks/DEUS-TSK-FABLE-19C/state.md
```
No test command applies to this checkpoint. The future harness, once written, is `node tools/test_global_depth_renderer.js`.
