# SIM.00.00 Lane N report: in-place layer switch and area prewarm

Writer: Claude (claude-opus-5-5), branch `task/lane-n`, 2026-09-26. Not pushed, not merged. Reviewer per lane.json: Grok.

## What changed

- `game/js/plugins/DEUS_World.js`: a level switch can happen in place (no map transfer); prewarm of the levels a
  switch can land on; the peek cache keeps them.
- `game/js/plugins/DEUS_Levels.js`: `setView` switches in place and falls back to the transfer only without a started
  map scene; the Spriteset rebinds at the start of its next update; a prewarm step each frame in play.
- `tools/test_layer_switch_inplace.js` (new): the Done Tests as an NW.js suite on a snapshot copy of `game/`, with 7
  checks, 8 mutants, a perf JSON and `--ref=main` for the bench on main.
- `tasks/SIM.00.00/lane-n/`: `run_existing_suites.js` (existing suites on main vs tip, same seed), `perf/`
  (`summarize.js`, `summary.md`, the main and tip perf JSONs), `suites/` (12 results files), `evidence/` (final gate
  run), `mutants_output.txt`, `test_changes.md`, `escalation.md`, `docs_update.md`, this report.

### Every function touched

DEUS_World.js (only area-cache, view-switch and map-load code):

| function | change |
|---|---|
| `remember` (peek cache) | eviction skips pinned keys (the view's level and its ring) |
| `World.peekArea` | counts cache-miss builds (`cacheStats.peekBuilds`) |
| `World.clearPeekCache` | also forgets the prewarmed view (`warmView`) |
| `showable` (new) | a build may be shown: on screen before (`_ufShown`) or prewarmed (`_ufWarm`), for this world state |
| `pinView`, `ringOf`, `areaLevelsOf`, `preloadImages`, `warmLevel` (new) | prewarm internals |
| `World.prewarmStep`, `World.coldLevels`, `World.prewarmStats`, `World.prewarmConfig` (new) | prewarm API |
| `World.switchViewInPlace` (new) | the in-place swap of `$dataMap` / `$gameMap` for another level |
| `World.rebindSpriteset`, `World.viewSwitchStats` (new) | tilemap and event-sprite rebind of a kept Spriteset |
| `DataManager.loadMapData` alias | reuses any showable cached build (prewarmed ones too) and marks it shown |
| `Scene_Map.prototype.isReady` alias (new) | a map load holds its start until every level of the view's area is warm |
| `Spriteset_Map.prototype.createTilemap` alias (new) | records the map a Spriteset draws (`_ufBoundMap`) |

DEUS_Levels.js (only view-switch code):

| function | change |
|---|---|
| `setView` | tries `UF.World.switchViewInPlace` first; records `state.view` at once; transfer only as the fallback |
| `placeCamera` (new) | the camera after a switch (kept, or centred on a followed unit); shared with the transfer path |
| `Game_Player.prototype.performTransfer` alias | uses `placeCamera` (same behaviour) |
| `Spriteset_Map.prototype.update` alias (new), `finishSwitch` (new) | rebinds before any layer updates, refreshes the fog, records `lastSwitch` (now with `renderFrames`, `inPlace`, `swapMs`, `rebindMs`, `fogMs`, `workMs`, `syncBuilds`, `events`), emits `levels:viewChanged` |
| `Scene_Map.prototype.start` alias | also asks for the `BlueSky` parallax (the sky of +1 / +2) |
| `Scene_Map.prototype.update` alias | one prewarm step a frame in play while no switch is pending |

Not touched: DEUS_Depth, DEUS_Minimap, plugins.js, DEUS_Fog, DEUS_DayNight, world generation, the Z-2 cut carve, every
other plugin, `docs/`.

## How I tested it

Every command was run in the foreground from the worktree root, one exit code each (raw):

| command | exit |
|---|---|
| `node --check game/js/plugins/DEUS_World.js` / `DEUS_Levels.js` / `tools/test_layer_switch_inplace.js` | 0 / 0 / 0 |
| `node tools/test_layer_switch_inplace.js --evidence=tasks/SIM.00.00/lane-n/evidence` (gate, final code 7fab34b1) | 0 |
| `node tools/test_layer_switch_inplace.js --mutants` (final code) | 0 |
| `node tools/test_layer_switch_inplace.js --ref=main --evidence=tasks/SIM.00.00/lane-n/perf/main` | 1 (expected: main is the transfer) |
| `node tools/test_layer_switch_inplace.js --evidence=tasks/SIM.00.00/lane-n/perf/tip` | 0 |
| `node tasks/SIM.00.00/lane-n/run_existing_suites.js --sides=main vertical natural_walls flooding strata` | 0 |
| `node tasks/SIM.00.00/lane-n/run_existing_suites.js --sides=tip vertical natural_walls flooding strata` | 0 |
| `node tasks/SIM.00.00/lane-n/run_existing_suites.js --sides=main world spawn` | 0 |
| `node tasks/SIM.00.00/lane-n/run_existing_suites.js --sides=tip world spawn` | 0 |
| `node tasks/SIM.00.00/lane-n/run_existing_suites.js --sides=tip vertical` (final code) | 0 |
| `node tasks/SIM.00.00/lane-n/run_existing_suites.js --compare vertical natural_walls flooding strata world spawn` | 0 |
| `node tasks/SIM.00.00/lane-n/perf/summarize.js` | 0 |

(The runner's exit is about the main-vs-tip comparison; each suite's own RESULT line is in `test_changes.md`.) Before any
change, baselines on main with random seeds: `node tools/run_tests.js <suite> --game <main snapshot>` exit 1 for vertical
(8/3), world (25/5), spawn (4/2); exit 0 for natural_walls (6/0), flooding (8/0), strata (6/0).

## Evidence

Gate run `evidence/results.txt` (copied from the real output, trimmed):

```
PASS layer_switch_inplace.same_scene_and_spriteset - Ground->+1: scene same, spriteset same, Scene_Map made 0, Spriteset_Map made 0; ...
PASS layer_switch_inplace.ticks_never_skipped - Ground->+1: 4 updates, 0 without exactly one UF.Time tick, 0 without exactly one World frame, 0 paused; ticks +4, World frames +4; ...
PASS layer_switch_inplace.no_sync_build_after_prewarm - prewarm: cold ring levels [] after 40.66 ms, 4 prewarm builds (1221.68 ms, worst 352.34 ms), 12 steps while the map loaded; Ground->+1: UF.World.buildArea calls 0, ...
PASS layer_switch_inplace.switch_within_one_frame - Ground->+1: frames 0, renderFrames 1, ms 10.61 (work 9.08: swap 4.54, rebind 4.54, fog 0), in place true, reused true; ...
PASS layer_switch_inplace.new_level_shown_at_once - ... [fog on] +2->Ground: ok (769 unit events for 769 units; fog own cell alpha 150, other levels' cells 255/255/255/255, observers clear 6/6; minimap activeZ 0, HUD kept); ...
PASS layer_switch_inplace.save_load_keeps_view_and_world - saved on +1 after 22 switches (5908834 characters of JSON); world after the load: units (cells, levels), tile and object diffs, level strata, seed and next unit id the same; view before ... after ... (same); ...
PASS layer_switch_inplace.no_errors - harness errors during the suite: none (0 before it); console.error calls: none
RESULT: 7 passed, 0 failed (exit 0)
```

Mutants (`mutants_output.txt`): 8/8 caught, each by its designated check; 7 of them fail that check alone
(`transfer_switch` fails 5 checks: a transfer makes a new scene, skips ticks and replaces the view's sprite).

Performance (`perf/summary.md`, seed 18, fog as in play, median / max of 3 rounds, `lastSwitch.ms`):
0 → +1 main 101 / 550 ms, tip 6 / 13 ms; +1 → +2 62 / 475 vs 4 / 18; +2 → 0 76 / 102 vs 13 / 31; 0 → -1 130 / 378 vs
15 / 21; -1 → 0 96 / 136 vs 10 / 27. `frames`: main 1, tip 0 (renderFrames 1). Level builds during switches: main 3
(first visits of +1, +2, -1), tip 0. Updates without exactly one tick: main 20 over 15 switches, tip 0.

Screenshots (opened and checked):

- `evidence/layer_switch_inplace.1_p1.png`: plate "+1", minimap tab +1. The ground's people show through +1's open air as
  Depth planes without health bars; the +1 TEST unit, with its bar, stands on a wooden floor at the centre.
- `evidence/layer_switch_inplace.2_p2.png`: plate "+2", levels below blurred (Depth `deus` preset); the +2 TEST unit on
  its floor, the +1 TEST unit seen below it.
- `evidence/layer_switch_inplace.3_Ground.png` and `5_Ground.png`: plate "Ground", minimap tab 0, the settlement's
  people with health bars, trees and the chest; the two frames match.
- `evidence/layer_switch_inplace.4_m1.png`: plate "-1", minimap tab -1, dark rock and soil placeholders with a blue
  water region; the -1 TEST unit is behind wall caps at the centre, only its health bar showing.
- `evidence/layer_switch_inplace.6_before_save_p1.png` and `7_after_load.png`: plate "+1" before the save and after
  the load, same camera; more of the people below have walked off between the two (the simulation ran on).
- `evidence/layer_switch_inplace.fog_on_Ground.png`: fog forced on, the frame after switching to the ground; the view
  around the settlement is clear.
- `perf/main/layer_switch_inplace.fog_on_Ground.png` (main, same moment): the whole view is dark.

## Not done / known problems

- Not run in the RMMZ editor's Playtest (F5). Every run above used RPG Maker MZ's own `nw.exe` through the test
  harness on snapshot copies of `game/`. Also not checked: F8 console in a Playtest.
- `docs/systems/UF_World.md` and `UF_Levels.md` not updated: `docs/` is outside this lane's allowed paths. Ready-to-paste
  text is in `docs_update.md`. `docs/STATUS.md` was not claimed or updated for the same reason.
- A map load now takes longer. With seed 18, New Game held the map's start for 12 frames: 4 prewarm builds, 1221.68 ms,
  worst 352.34 ms. The save/load in the suite took 4089 ms on the tip against 1907 ms on main. That load ran from inside
  a running map scene, so it also includes 4 peekArea builds while the old scene faded out, which the prewarm then
  replaced.
- In play, a prewarm step is a whole level build in one frame (300-550 ms here). It only happens when a ring level is
  missing, which never happened in the default 1x1 world after the load. A level build can't be split across frames
  without changing the generators, which is world generation and out of scope.
- With the fog enabled, a switch to the ground spends about 1.3 s in `UF.Fog.refresh()` (fog is off in play;
  `escalation.md` E2). The minimap redraws a level's picture over 32 frames after a switch (E1, Lane K).
- Event sprites of the level that leaves are removed, not destroyed. DEUS_Anim keeps a unit-to-sprite map that could
  otherwise hand destroyed sprites back to its pool. Memory over many switches was not measured.
- The slowest `SceneManager.updateMain` inside a switch window on the tip was 12-129 ms, while the switch's own work
  (`workMs`) was 2-30 ms (rounds 1, 3 and 4 of the `perf/tip` and `evidence` runs). Ordinary frames with 1240 units also
  spike: the world suite on the same seed measured `UF.World.update` worst 78.69 ms. The two were not separated here.
- The new suite was run on seed 18 only. The existing suites were compared on seed 18; random-seed runs exist for main
  only.
- The lane's BRIEF.md and lane.json were found emptied and restored from HEAD (`escalation.md` E4).

## Try it in RMMZ

1. Close the RPG Maker MZ editor if it is open, reopen the project from this branch, press F5, start a New Game.
2. On the map press `,` (up) twice, `.` (down) three times, then Home; or click the arrows on the level plate.
3. Press F8 and run `UF.Levels.stats().lastSwitch` and `UF.World.viewSwitchStats()`.

Expected: each level appears at once with no fade and no loading pause; units and the clock keep moving through the
switch; the plate and the minimap tab show the new level. `lastSwitch` shows `inPlace: true`, `frames: 0`,
`renderFrames: 1`, `ms` in the tens; `viewSwitchStats().syncBuilds` stays 0. The New Game load itself may take about a
second longer than before (the prewarm).

## Decisions needed

- Is holding the map's start for the prewarm (about 1.2 s at New Game here, and on every load) acceptable? The
  alternative is to start the map at once and build the other levels in play, one per frame: 4 visible hitches of
  300-550 ms each.
- Should the switch keep calling `UF.Fog.refresh()`? It makes the fog correct in the switch's first frame, but costs
  about 1.3 s on the ground at Fog's current cost if the fog is re-enabled. Without the call the fog is up to 20 frames
  stale, as on main.
- Who applies `docs_update.md` to `docs/systems/`?
