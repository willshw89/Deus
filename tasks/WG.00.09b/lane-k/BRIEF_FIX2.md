# Lane K Fix 2 Brief: switch_same_frame fails once main's in-place level switch (Lane N) is merged

From: PM (Grok Bot), 2026-09-26 ~06:00 CT. Task WG.00.09b (flat 1:1 layers, DEC-011, and the layer-switch lag fixes).
Branch: `task/lane-k`. Base for this fix: `00ff1c59` = your Fix1 tip `abdb6bbe` + Grok review `0315c84a` (VERDICT: CLEAN PASS) + a PM merge of current `main` `1f683b94` into the lane branch. You already have main's code; do NOT merge or rebase again unless main moves and you get a conflict.

Authority order: this file > `BRIEF_FIX1.md` > `BRIEF.md`. Every Fix1 rule still applies (deterministic gates, temp clones for heavy NW runs, foreground commands, raw exit codes in REPORT.md, scope = `lane.json` allowedPaths, NO ART - DEC-007).

## 1 What happened

Your Fix1 tip passed its own gates and an independent Grok review. The PM then merged it into `main` (`--no-ff`, temp commit `6aa1a332`, backed out, never pushed) and the post-merge gate failed. The PM re-ran everything in a scratch worktree (logs: `C:\Users\snewt\.deus_worktrees\logs\pm_ops\kdiag_20260926_054547\`):

| Tree | Command | Result |
|---|---|---|
| main `1f683b94` alone | `node tools/test_layer_render_flat.js` (your test file copied in) | N/A: `HARNESS no suite named "layers_flat"` (the suite lives in your DEUS_Depth.js) |
| main `1f683b94` alone | `node tools/test_layer_switch_inplace.js` (Lane N) | 3/3 runs exit 0, 7/7 checks |
| K tip `abdb6bbe` alone | `node tools/test_layer_render_flat.js` | 3/3 runs exit 0, 12/12 checks |
| `1f683b94` + `abdb6bbe` merged (`c2a93925`) | `node tools/test_layer_render_flat.js` | 3/3 runs exit 1, 11/12: FAIL `layers_flat.switch_same_frame` (every run) |
| same merged tree | `--suite depth` / `tools/test_minimap.js` / `tools/test_layer_switch_inplace.js` | exit 0 (27/27) / exit 0 (24/24) / exit 0 (7/7) |
| K merged onto `4614dbfa` (main just BEFORE Lane N's merge) | `node tools/test_layer_render_flat.js` | exit 0, 12/12 |
| K merged onto `e27e8be5` (Lane N merge: SIM.00.00 layer-switch-inplace) | `node tools/test_layer_render_flat.js` | exit 1, 11/12, same FAIL |

So it is not a flake and not a main regression: it is the interaction between your DEUS_Depth.js and Lane N's in-place level switch (`e27e8be5`). Lanes Q, R, L1 are not involved.

Failure output (merged tree, run 1; runs 2 and 3 identical in shape):

```
FAIL layers_flat.switch_same_frame - 0->2 (frame 88): planes 1:shown 2 paint(s), 0:shown 4 paint(s); 1 unit(s) in the window, WITHOUT a frame: TEST_flat_A#5216@1; 2->1 (frame 181): planes 0:shown 10 paint(s), -1:shown 12 paint(s); 1 unit(s) in the window, WITHOUT a frame: TEST_flat_B#5217@-1; 1->0 (frame 202): planes -1:shown 14 paint(s), -2:shown 16 paint(s); 1 unit(s) in the window, WITHOUT a frame: TEST_flat_B#5217@-1; 0->-1 (frame 229): planes -2:shown 19 paint(s); 0 unit(s) in the window, all with a frame; -1->0 (frame 256): planes -1:shown 24 paint(s), -2:shown 21 paint(s); 1 unit(s) in the window, WITHOUT a frame: TEST_flat_B#5217@-1
required checks: 11/12 PASS
```

The planes are bound, shown and painted at `levels:viewChanged`; what is missing is the unit sprites on the planes' levels (no sprite / no frame at that moment).

Repro (in a temp clone of this branch, as Fix1 rule 5 says):

```
git clone --no-hardlinks <lane-k worktree> %TEMP%\k_fix2_repro && cd %TEMP%\k_fix2_repro && git checkout 00ff1c59
node tools/test_layer_render_flat.js            # exit 1, FAIL layers_flat.switch_same_frame
node tools/test_layer_render_flat.js --only switch_same_frame
```

## 2 Suspected interaction (PM reading; confirm or correct it in REPORT.md)

- Before Lane N, a level switch was a map transfer: a new `Spriteset_Map` was built, your `Spriteset_Map.createCharacters` alias made the root and called `this._ufDepth.update()` with units (K2), and only then did `levels:viewChanged` fire. So planes AND unit sprites were ready in the switch frame. Your own comments still say "A level switch is a map transfer" (DEUS_Depth.js ~line 122).
- Lane N (`game/js/plugins/DEUS_Levels.js`, `DEUS_World.js`, SIM.00.00) switches in place: no new Scene_Map or Spriteset. `DEUS_Levels` aliases `Spriteset_Map.prototype.update` and, at the START of the spriteset's update, calls `finishSwitch` -> `UF.World.rebindSpriteset(ss)` (which emits `world:levelBuilt` / `world:areaBuilt` -> your `root.rebuild()`), refreshes fog, then emits `levels:viewChanged`. Your root's per-frame work (`update()` from `updateTilemap`, and the units in `lateUpdate()` after `Scene_Map.update`, because `_lateSeen` is already true) runs AFTER that event. So at `levels:viewChanged` the planes are rebuilt but `scanUnits`/`placeUnits` for the new plane levels has not run: units on the planes' levels have no sprite/frame yet.
- Unknown: whether the frame actually DRAWN after the switch is already correct (lateUpdate may fill the units before render) or whether the lag is visible for one or more rendered frames. Measure it and report it. Either way the check stays as it is (see 3.2).

## 3 What to do

1. **Fix in `game/js/plugins/DEUS_Depth.js` (and docs) only.** When the view changes in place, the depth root must bind the planes AND place every unit on the planes' levels (membership, sprite, bitmap ready, frame, position) before or at `levels:viewChanged`, in the same frame, exactly as it did on the map-transfer path. Possible routes (your choice, justify it): a DEUS_Depth listener on the in-place rebind (`world:levelBuilt` / `world:areaBuilt` when the view level changed, or `levels:viewChanged` registered at plugin load so it runs before later listeners) that runs a full `update` including units regardless of `_lateSeen` and refreshes the unit candidate list (`unitPlaceStamp`); or an alias of `UF.World.rebindSpriteset` from DEUS_Depth. Do not rely on listener order you have not proven. Keep the map-transfer path (area edges and loads still transfer) working too.
2. **Do not weaken the gate.** `switch_same_frame` must keep judging the state at `levels:viewChanged`, all 5 transitions, units A and B included. You MAY add a second, stricter observation: the state in the first rendered frame after each switch (e.g. sampled after `SceneManager.updateMain` / before `Graphics` renders), and report both. Every changed check goes in `test_changes.md` with a provocation that still makes it FAIL (`--provoke`).
3. **Owner rule DEC-011 and the lag fix are the product requirement:** all layers render 1:1, no filters, and sprites on other layers must not lag after a layer change. A known failure in `switch_same_frame` is not acceptable.
4. **Must stay green on your final tip (each in a fresh temp clone, raw output + exit code in REPORT.md):**
   - `node tools/test_layer_render_flat.js` - 12/12, **3 consecutive runs**, plus `--provoke` once.
   - `node tools/test_layer_render_flat.js --suite depth` - 27/27.
   - `node tools/test_minimap.js` - exit 0.
   - `node tools/test_layer_switch_inplace.js` (Lane N's gate; you may not edit it or DEUS_Levels.js / DEUS_World.js) - 7/7, exit 0. If your fix needs a change in a Lane N file, stop and write the exact need in `escalation.md`.
   - `node tools/check_deus_syntax.js` and `node tools/test_palette.js` - exit 0.
   - Bench: rerun `tools/bench_render_layers.js` normal x2 on the final tip with machineLoad recorded (the switch path changed under you); stress x2 only if the fix touches the per-frame unit path.
5. **Docs:** update `docs/systems/DEUS_Depth.md` (and the code comments) for the in-place switch: which event binds the planes and places the units, and the order relative to Lane N's `finishSwitch`.
6. **REPORT.md:** add a "Fix 2" section: root cause as you found it (confirm/correct section 2), the drawn-frame measurement, the change, and all results above.

## 4 Rules for this run

- Write only inside `tasks/WG.00.09b/lane-k/lane.json` allowedPaths. Never edit `lane.json` or any `review_grok_*.md`.
- Commit early (WIP allowed). Commit messages start with `[claude] WG.00.09b Fix2`.
- When finished: commit, then `git push origin task/lane-k`. Never push any other branch, never main, never force, never set DEUS_INTEGRATOR. If the push is refused, say so in REPORT.md and stop.
- Do not merge into main. Do not self-certify; the PM launches an independent Grok review afterwards.
- Final output line exactly: `FINAL SHA: <sha>` (from `git rev-parse HEAD` after the push).