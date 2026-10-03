# Independent review — ORG-0.2 lane-worldgen-green

Reviewer: Grok 4.7 / xhigh. No other model and no subagent produced this verdict.
Reviewed writer checkpoint: `4eccbbec833af8d1b56bc7b7e93268aedce74a69`
Branch: `task/org-0.2-worldgen-green`
Base: `565dc5aead7e068230528d573c395ea21ed5cf5d`
Prior Grok review anchor: `d8b36c53`
Review written: 2026-10-03, after the run below. HEAD was reconfirmed as `4eccbbec833af8d1b56bc7b7e93268aedce74a69` before this file was added.
Deus: **NOT CHECKED**. No Owner F5/F8 and no Deus acceptance are part of this review.
Lane gate (`node tools/run_tests.js`, `node tools/ops/run_gate.js`): **not run**.

**Overall lane acceptance: FAIL.** There is no green SHA. Selected checks that passed do not make the world acceptable.

Runtime identity: `git diff --stat d5d641bfc83da15bc21a80c8abd115c8aa53cecb 4eccbbec833af8d1b56bc7b7e93268aedce74a69 -- game tools/run_tests.js` is empty. The game and `tools/run_tests.js` at this checkpoint are the `d5d641bf` safety correction (2026-10-03 04:10 CT). Commits after that (`888e59de`, `1de6d1a7`, `4eccbbec`) are evidence and lane documents. This review did not change source.

## Goal

Independent review and evidence of the stopped writer checkpoint. Claude Fable 5.1/max stopped and handed the lane over. Codex PM notes are leads. This assignment does not repair, does not extend implementation, and does not dispatch another runtime writer.

Authorized scope is the later Owner overnight and PERF_NOW direction, which is wider than the original brief item (a). The reviewed changes since `d8b36c53` include the per-suite watchdog, the river course contract and zero-mask work, retain mode, river datum and ramp skip, kit minima, camp datum and water, PERF_NOW, the anim layer rounds through `48cd2f8a`, and the `d5d641bf` save-guard and perf-lifecycle changes. Report-only commits are separated from that runtime.

## This run

This is the independent acceptance run. It is not a replay of W15. W15 ran the same runtime with perf counters off. This run followed `scratchpad/org-0.2/run_controlled4.ps1`, which sets `DEUS_PERF=1` and `DEUS_TEST_DISPOSABLE_SAVES=1` before boot.

| Field | Value |
| --- | --- |
| Command | `.\run_tests.bat --game C:\Users\snewt\OneDrive\Desktop\UF\.deus_worktrees\org-0.2-worldgen-green\scratchpad\lane-worldgen-green\snap_GROK_4eccbbec\game` |
| Suite argument | none (full default; no subset) |
| Source at launch | `4eccbbec833af8d1b56bc7b7e93268aedce74a69` |
| Working tree at launch | 34 untracked paths, the pre-existing writer `*_game_runtime.log` files. No tracked source edits. |
| Snapshot | fresh `scratchpad/lane-worldgen-green/snap_GROK_4eccbbec\game` |
| Seed / year / Z / world | `1920951434` / year 500 / no Z override / 1x1 |
| Retain | `DEUS_TEST_RETAIN=1`. Profile kept: `C:\Users\snewt\AppData\Local\Temp\uf_test_profile_26448_1791021323820` |
| Start CT | 2026-10-03 04:55:23 -05:00 |
| End CT | 2026-10-03 05:08:45 -05:00 |
| `run_tests.bat` exit | 1 |
| Wrapper exit | 0 |
| Raw RESULT | `RESULT: 472 passed, 57 failed (exit 1)` |
| Counted lines | 472 PASS, 57 FAIL, 0 LATE. 529 counted checks. |
| Hardware | AMD Ryzen 7 8845HS, 16 logical CPUs, 31.3 GB RAM, AMD Radeon 780M and NVIDIA GeForce RTX 4060 Laptop |
| Editor | `RPGMZ.exe` pid 17220, started 2026-10-02 23:24, was the only such process before launch and was still that process after this review was written. It was not stopped. |
| nw | 0 before launch. The wrapper recorded 2 `nw.exe` processes at the end of its own run. Those processes had exited by the time this review was written. No process was killed by the reviewer. |

Harness header: `HARNESS New Game year 500 (requested 500)`. `HARNESS: 26 suite(s) x 180 s budget`. Selected and entered: smoke, ownership, ecology, colonists, world, worldgen, biomes, tiles, ground, factions, history, objects, items, jobs, wildlife, stance, combat, anim, fog, daynight, timespeed, camera, look, fire, environment, faction_menus. `perf_overlay` is `isDefault: false` (`DEUS_Test.js:980`) and was not selected. Entering 26 suites is not the same as every assertion inside them running.

Snapshot validation, 2026-10-03 04:54:57 -05:00 CT, `git ls-tree -r 4eccbbec… -- game` against `git hash-object` of the snapshot, excluding `test_output/`, `save/`, and `game_runtime.log`:

- blobs in commit 4347; files in snapshot 4347; hashes 4347
- entries not matching: 1
- `game/js/plugins.js` commit `81bdd308f1d74c5f856d10b8508ffafd387f14b3`, snapshot `272df7806ae3784766564edeb7a8a6b1c78cbe76`
- differing lines: 4, the documented `"Seed": "1920951434"` block only

The snapshot directory, its `game.tar`, `test_output`, and save files were left in place. Evidence copies are copies.

### Watchdog and omitted coverage

`HARNESS late: suite look ended 181.6 s after it started with "suite look watchdog: wait abandoned"; 0 late check(s) not counted.`

`HARNESS watchdog: 1 suite(s) exceeded 180 s: look`

`look.suite_completed` is a counted FAIL. `look.no_errors` (`DEUS_Look.js:637`, after `Look.runChecks`) does not appear in this run's results or stdout. W15 counted `PASS look.no_errors`. W15 has no `look.suite_completed` line. The counted total stays 529 because the omitted pass is replaced by the watchdog fail. Zero LATE lines means nothing after the cancel was still recorded. It does not mean the cancelled tail ran.

`combat.suite_completed` failed its own 8000 ms wait for the action-bar cooldown (`DEUS_Test.js:137`). `faction_menus.suite_completed` failed its own 5000 ms wait for `UF_Menu_deus` and `UF_Faces_deus_1`. Those two are not the 180 s harness watchdog.

### Counted FAILs (57)

1. `ecology.renewable_timer`
2. `ecology.bounded_work` — 100 capped attempts in 22.075 ms, budget 20 ms
3. `world.path_blocked_fast`
4. `world.path_gives_up_when_crowded`
5. `world.faces_eight_ways`
6. `world.no_path_is_true`
7. `worldgen.autotile_shapes` — 270 wrong shapes; first `(217,4)` ground shape 34, expected 0
8. `biomes.ocean_rim` — 14 of 128 edge cells ocean (11%, want >= 60%)
9. `biomes.objects_dense` — 1795 objects in the start area, want >= 2500
10. `biomes.camps_cleared` — 5 bare camps, want 8
11. `tiles.tileset_names` — A5 name empty
12. `factions.areas`
13. `history.generated_with_world`
14. `history.no_years`
15. `history.founders` — 0 founders for 9 factions
16. `history.campfire_start`
17. `history.stats_and_ranks`
18. `history.add_event`
19. `history.settle_off`
20. `history.legacy_switchable`
21. `objects.apply_chop`
22. `objects.perf_dense`
23. `items.images_exist` — missing `waterskin -> !$UF_Icon_143.png`
24. `items.find_sorted`
25. `jobs.travel_and_work`
26. `jobs.hunt`
27. `jobs.mine_built_wall`
28. `jobs.mine_subterranean_wall`
29. `wildlife.by_biome`
30. `wildlife.start_kit_herd`
31. `wildlife.kit_every_area`
32. `wildlife.none_too_near_start`
33. `wildlife.wanders`
34. `wildlife.flees_hunter`
35. `wildlife.saved`
36. `wildlife.perf`
37. `combat.suite_completed`
38. `anim.no_code_motion`
39. `anim.death_frames_and_remains`
40. `anim.state_frames`
41. `anim.pooled_and_perf`
42. `daynight.wall_blocks_glowing_light`
43. `timespeed.speeds_up` — 18 updates/s at x1, 13 at x4
44. `timespeed.no_speedup_while_paused` — 65 updates/s at x4 while paused
45. `look.asset_line_names_status`
46. `look.menu_creates_designation`
47. `look.menu_precedence`
48. `look.build_submenu`
49. `look.dig_and_fish`
50. `look.designation_done_by_colonist`
51. `look.hunt_and_haul_options`
52. `look.saved`
53. `look.suite_completed`
54. `environment.diurnal_cycle` — midnight 5.9°C, midday 5.9°C
55. `environment.hypothermia_recovering`
56. `faction_menus.factions_list_12`
57. `faction_menus.suite_completed`

### Difference from W15 on the same runtime

W15 (`d5d641bf`, 04:18:43–04:30:49, perf off): `RESULT: 473 passed, 56 failed (exit 1)`, also 529 counted checks.

- This run only: `ecology.bounded_work` FAIL at 22.075 ms. W15 PASS at 16.960 ms. Perf was on for this whole suite and off for W15. That protocol difference is recorded. It is not proof that the 2.075 ms overrun is the counter overhead.
- W15 only: `objects.regrow` FAIL (`entry MISSING`). This run PASS at the same bush cell `(123,133)`, due hour 4040124. Same runtime, so this flip is run variance.
- Look coverage, above.

W14 on older `48cd2f8a` (04:33:26–04:45:29, 473/55) and M6 on `d5d641bf` (04:45:36–04:46:16, 11/2, intentional no-opt-in refusal) are writer evidence. They are not this rerun. M5 and M6 were not launched again. Prepared snapshots for the pre-`d5` unsafe source were not launched.

## Narrow findings

Each item below is a code or evidence finding. None of them turns the lane acceptance to pass.

### 1. Camp spacing is a real live-home failure

`factions.areas` PROBLEMS on this run, verbatim:

`The Solmarwyn Burrow and The Pela Tribe only 29.2 cells apart; seed 1920951434 regenerated gives other areas: The Pela Tribe (half-orc) live:{"area":{"x":0,"y":0},"x":167,"y":102,"z":0} vs again:{"area":{"x":0,"y":0},"x":195,"y":114,"z":0}`

Solmarwyn is `(156,75)`. Pela live is `(167,102)`. `hypot(11, 27)` is 29.15, printed 29.2. The minimum is `AREA_DEFAULTS.minGap` 40 (`DEUS_Factions.js:264`), applied to live homes on the same area and layer (`DEUS_Factions.js:828–834`).

The player's printed distance is 0.0 from the centre, and the want is `<= 6`. That clause is in the summary line. It is not in PROBLEMS. `history.player_faction` PASS agrees: Arar home `(128,128)`, 0.0 from the centre.

The second problem is also real. `Factions.generate(fresh())` (`DEUS_Factions.js:841–852`) rebuilds faction homes and does not run History's camp move. Live Pela `(167,102)` differs from generated Pela `(195,114)`. Generated Pela would be about 55 cells from Solmarwyn, which clears 40. The live pair does not. The stage difference explains the mismatch. It does not erase the live 29.2.

Cause of the live coordinate: `History.campCell` (`DEUS_History.js:615–681`) searches for a flat datum block, then drinkable climate water, then a flat block without water, then returns the clamped original home with no block, water, or datum check (`DEUS_History.js:680–681`). Drinkability is `cellInfo(...).water` plus `onDatum` (`DEUS_History.js:651–656`), not a read of the painted tile. `found()` then writes that cell onto the live faction:

`DEUS_History.js:785` `f.home = { ...f.home, area: { ...site.area }, x: site.x, y: site.y, z: site.z };`

`DEUS_Factions.js` is outside `allowedPaths` and is not in the runtime diff. The home write that the areas check then measures is in `DEUS_History.js`, which is in scope. Two camp rounds are already spent. This review does not repair it.

W8 at `d66aa1c9` reported Pela `(167,107)`, closest 33.8. W9 at `c702a0bc`, W15, and this run report Pela `(167,102)`, closest 29.2. Both stages are real. 33.8 is the earlier checkpoint. 29.2 is the current one.

Narrow verdict: the areas check fails for a true spacing breach and a true regenerate mismatch. Parking it is consistent with the two-attempt rule. The check stays red.

### 2. Same-type off-hand and main-hand collapse to one drawn layer

`SLOTS` drawing order includes `offHand`, `shield`, `mainHand`, `weapon` (`DEUS_Anim.js:96`). `wantedLayers` (`DEUS_Anim.js:553–588`):

- An empty `mainHand` is skipped so it does not mirror `weapon` (`DEUS_Anim.js:566–568`).
- Any later slot whose resolved type equals a type already chosen is skipped (`DEUS_Anim.js:577–583`). The comparison is the type, not the item id.

`Items.equip` writes the slot, then mirrors `mainHand` onto `weapon` and `tool`, and `offHand` onto `shield` (`DEUS_Items.js:848–852`). `Items.isSlotCompatible` accepts a weapon or a tool in `mainHand` and in `offHand` (`DEUS_Items.js:890–900`). `stone_knife` is stack 1, tags `tool` and `knife`, and `weapon.hands` 1 (`DEUS_WorldCatalog.json:3633–3672`). `Items.give` creates one record per stack (`DEUS_Items.js:768–785`), so two knives are two ids.

Counterexample: equip knife A to `offHand` and knife B to `mainHand`. `offHand` is earlier, so its type is kept. `mainHand` resolves to the same type and is skipped. `weapon` is the same id as `mainHand` and is skipped too. Two legal one-handed records become one drawn type. That is slot cardinality, not a duplicate-layer sampling artifact.

This run's `PASS anim.layers_equip_api` equips one axe to `mainHand` and accepts `stone_axe@mainHand`. The result text says exactly one stone_axe layer. That fixture does not construct the two-record case. The `48cd2f8a` change widened the accepted label to `mainHand` or `weapon`. It did not change the dedup.

`anim.no_code_motion`, `anim.death_frames_and_remains`, `anim.state_frames`, and `anim.pooled_and_perf` still fail on their own assertions. Those failures are separate from the two-knife cardinality bug.

Narrow verdict: the one-axe alias check can pass while the two-item same-type case stays broken. A third runtime repair was parked under the two-attempt rule. This review does not start one.

### 3. Save/load map transition still throws on a null BGM

`perf_overlay` (`DEUS_Test.js:954–961`) calls `DataManager.saveGame(1)`, `DataManager.loadGame(1)`, `SceneManager.goto(Scene_Map)`, and `$gameSystem.onAfterLoad()` without `$gameSystem.onBeforeSave()`.

`Game_System.initialize` sets `_bgmOnSave = null` and `_bgsOnSave = null` (`game/js/rmmz_objects.js:189–190`). `onBeforeSave` is what stores `AudioManager.saveBgm()` / `saveBgs()` (`rmmz_objects.js:351–356`). `onAfterLoad` calls `AudioManager.playBgm(this._bgmOnSave)` then `playBgs` (`rmmz_objects.js:359–362`).

`AudioManager.isCurrentBgm` returns false when nothing is current, without reading `bgm` (`rmmz_managers.js:1191–1196`). The else branch then evaluates `bgm.name` (`rmmz_managers.js:1169`). A null `bgm` throws `Cannot read property 'name' of null`. `playBgs` has the same `bgs.name` read (`rmmz_managers.js:1239`). `onAfterLoad` hits `playBgm` first. `AudioManager.saveBgm` returns an empty object with `name: ""` when called, so `onBeforeSave` before the save would store a non-null value.

`DEUS_Projects.js:1763` does call `onBeforeSave` before `saveGame`, and its comment at `1753–1757` says a following `SceneManager.goto(Scene_Map)` ended the test process on 2026-09-23, so Projects omits that goto. The perf fixture does the opposite pair: goto without `onBeforeSave`.

The throw is synchronous in `onAfterLoad`, before the map-draw wait, so the old scene remains. `load_data_recorded` can pass on the resolved load Promise while `load_to_map_recorded` fails. Writer P3 on `d5d641bf` (04:16:27–04:17:08) is that result: data load 347.23 ms, map transition null-name, old scene in the capture. This default-suite run never entered `perf_overlay`, so it supplies no new save/load certificate.

The engine files are outside `allowedPaths`. The caller that skips `onBeforeSave` is `DEUS_Test.js`, which is in scope. A narrow repair would call `onBeforeSave` before `saveGame`, matching Projects. It was not made. Do not treat a resolved `loadGame` Promise or a screenshot of the pre-load scene as a successful load.

Narrow verdict: load-to-first-map-draw is still unproven, and the current fixture code still throws. The lane stays red on save/load.

### 4. The disposable-save guard covers one fixture

The guard (`DEUS_Test.js:938–954`) refuses the write unless `DEUS_TEST_DISPOSABLE_SAVES` is exactly `"1"`, `readdirSync` of the save directory is empty (metadata and backups count), and `DataManager.savefileExists(1)` is false. Refusal skips `saveGame` and fails both load checks with the reason. It does not delete. The opt-in is a caller declaration. It does not check that the directory is a fresh copy of the repo.

This default suite set the flag and still did not run `perf_overlay`, so this run is not a negative or positive execution of that guard. M6 remains the writer evidence for refusal with the flag absent. It was not re-run here.

The flag does not stop the rest of the harness or the engine. During this run the snapshot gained:

- `save/file0.rmmzsave`, 1,321,479 bytes, 2026-10-03 05:00:03 CT
- `save/global.rmmzsave`, 211 bytes, same timestamp

No `file1`. No `game/save` in the repo. Both snapshot files are preserved. No non-disposable save test was run.

Narrow verdict: the fail-closed guard is a real improvement for the `perf_overlay` path and still does not make a save/load proof. Engine slot 0 inside a disposable snapshot is a separate fact. It is not a repo-save overwrite.

### 5. Perf counters recorded a new game and never a load

`DEUS_PERF=1` called `Perf.setEnabled(true)` at Core load (`DEUS_Core.js:741–744`). The overlay stayed on through the run. 69 `[PERF]` lines were copied to `GROK_perf_log_lines.txt`.

First line, 2026-10-03T09:55:49.727Z: `new game sync 22264.5 ms, first map draw n/a ms; load n/a`.
Next line, 2026-10-03T09:56:00.016Z: `first map draw 26817.3 ms`.
Last line, 2026-10-03T10:08:44.453Z: the same new-game numbers and `load n/a`.

Every inspected map screenshot shows that overlay text. The numbers are a real boot measurement. They are not a load measurement.

`wrapLifecycle` (`DEUS_Core.js:673–708`) runs at the start of Perf's `Scene_Boot.start`, before the earlier boot logger body. The logger then replaces `DataManager.setupNewGame` with a wrapper around the Perf wrapper (`DEUS_Core.js:146–152`). The two `log()` calls sit outside the measured span. Reported `syncMs` is the inner setup. The gap is those two log lines, so the 22264.5 ms figure slightly undercounts the final method. Later source did not move the logger inside the measurement.

`pendingLoad` completes when a later started `Scene_Map` differs from both the entry scene and the resolve scene (`DEUS_Core.js:659–662`). The pending record has no save id. One global pending load is replaced by the next load. This default suite never completed a load, which matches `load n/a`.

Pause lifecycle in the fixture, which this default run did not execute: `pause(true)` is followed by `pausedByUs = true` even though `TS.pause` is not checked for "already paused" (`DEUS_Test.js:885–888`). The happy path then calls `pause(false)` (`DEUS_Test.js:894`). An exception before that still `resume()`s in `finally` (`DEUS_Test.js:973–975`). Starting the suite while already paused can clear a pause the suite did not create. `TS` is declared at suite scope (`DEUS_Test.js:856`), outside the try. The suite calls `P.setEnabled(true)` at entry (`DEUS_Test.js:861`) and does not disable it at the end.

The off/on sample check (`newSamples === own3 - 1`, interval cleared on enable) is present at `DEUS_Test.js:905–918`. It did not run in this default suite.

Narrow verdict: enable-before-boot produced a real new-game sync and first-map-draw pair. Load association, the logger sitting outside the span, the pause restore, and "the suite leaves perf on" remain. None of those were closed by `d5d641bf` beyond the off/on math and the `finally` structure already in this source.

### 6. River course contract passed on this 1x1 world

This run:

- `PASS worldgen.river_not_through_start` — both rivers more than 14 cells from the start (keep 14)
- `PASS worldgen.rivers_count` — 2 rivers, columns 235 and 28, half-width 1 each (catalog count 1–2)
- `PASS worldgen.river_continuous` — 625 carved cells in area `(0,0)`, all water, each river one connected body
- `PASS worldgen.water_near_start` — nearest water 10.3 cells

`river_continuous_between_areas` is gated by `W.inWorld(a.x, a.y + 1)` (`DEUS_WorldGen.js:2329`). On this 1x1 world that check is not entered. There is no 3x3 acceptance claim.

The continuity oracle rasterizes with `micro.rasterizeChunk`, which the comment states is the same raster the builder paints from (`DEUS_WorldGen.js:2282–2293`). It checks built water against the planned course. It is not an independent hydrology proof. The zero-mask negative was not re-run.

`surfaceElevation` returns 0 when `riverAt` is true (`DEUS_Levels.js:819`). The natural-ramp loop `continue`s on those cells (`DEUS_Levels.js:1059`). The cave stamp `continue`s when `S < 1` (`DEUS_Levels.js:865`), so that pass does not stamp a datum-0 river cell. Lake and sea are not forced to datum 0. Their suppression stays a separate question from the river contract that passed here.

Narrow verdict: the approved positive river contract holds for seed `1920951434`, year 500, 1x1. That is the contract's result. It is not a claim that the rivers are hydrologically correct, and it is not a multi-area result.

### 7. Kit minima passed on this seed

`worldgen.kit_per_area`, `kit_covers_plan`, `kit_fair`, and `kit_seeded` passed. Fair minimums include reeds 8 and granite_boulder 7. Seeded kit objects: 389 on `1920951434`, identical on a second build; 360 on the next seed. Pela's kit water is fresh at 29.7 cells, inside the 30-cell drinkable check, while the faction spacing check still fails. Kit success does not clear camps.

`biomes.camps_cleared` still wants 8 bare camps and sees 5.

## Screenshots

All 64 PNGs under `evidence/GROK_4eccbbec_full/shots/` were opened and looked at. They are copies of the snapshot `test_output`. The snapshot originals were not moved. No art was changed. Tiles and fog ran and did not write a PNG of their own; this list is the whole capture.

Shared limits: outdoor frames carry diagonal white rain streaks. Map frames carry the perf overlay with the same `22264.5 / 26817.3 / load n/a` numbers, the Ground/time/zoom chrome, and the bottom `C G P M R V T L B O J U N` bar. Many frames are the same crowded start camp at 0.5x, 1.0x, or 2.0x. A character sheet covers the right side of several captures. These are harness fixtures. They are not Owner play and not Deus acceptance. A passing code check is not a pixel proof of the two-knife case, and a failing code check is not always visible as a missing sprite.

| File | What is actually on the frame |
| --- | --- |
| `smoke.map.png` | Dense colonist grid on green grass, lion banner, berry bush, boulder, green health bars. Readable UI. A camp crowd, not an empty wilderness. |
| `ownership.owned_bed.png` | Same crowd, two straw-bed sprites, tooltip "Straw bed". |
| `ecology.replenished_monster.png` | Patchwork dirt and snow pines, tooltip "Troll", small green crosses, rain. A troll sprite is in frame. |
| `ecology.replenished_prey.png` | Snow pines, two deer (one labeled "Deer"), and a large blue water body along the bottom and left. |
| `world.eight_way.png` | Dark dirt pad, "NE" and "S" labels, a row of trees, one figure. Direction fixture. |
| `world.path_around_wall.png` | Empty U-shaped stone wall on dirt. The wall graphic is present. The pathing fail is a behavior timeout. |
| `world.round_seam_wrap.png` | Cracked dark rock, two spiders with health bars at the lower left, rain. |
| `world.unit_in_view.png` | The same cracked rock field, empty of units in this frame. |
| `worldgen.start_area.png` | Crowded grass camp, zoom 2.0, banner and sacks. No river in frame. |
| `biomes.start_zoom_0.png` | Whole camp from zoom 0.5, grass, scattered trees and rocks, a small blue pond at the top center. |
| `biomes.start_zoom_1.png` | Same camp at 1.0x, banner, sacks, boulder. |
| `biomes.start_zoom_2.png` | Same camp tighter. No river channel crossing the camp. |
| `biomes.corner.png` | Solid cracked dark rock. No ocean and no objects. Matches the ocean-rim failure being rock rather than water. |
| `ground.terrain_gradient_wide.png` | Crowded grass camp, zoom 2.0. |
| `ground.terrain_gradient_medium.png` | Same camp at 1.0x with pink selection tints on many colonists. |
| `ground.terrain_gradient_closeup.png` | Camp at 0.5x and the small blue pond at the top. The pond is the clearest surface water next to the start camp. It reads as a pond, not a river through the camp. |
| `ground.terrain_gradient_border.png` | Cracked rock filling the frame, with a block of wooden and pale tiles cut off at the left edge. |
| `factions.ledger.png` | "Factions you know (3 not yet met)". Arar 83 yours, Wennoreth 72 hostile, Solmarwyn 146 hostile, Irquina 130 hostile, Ethmaric 129 neutral, Pela 151 hostile. All say area 0,0. |
| `history.home_area.png` | Crowded camp plus many sack icons, rain. No river. |
| `history.other_area.png` | Brown forest camp, snow pines, a stone edge on the left, black unfilled tiles at the lower right, a few figures along the bottom. The black region is an unfilled boundary in the shot. |
| `history.start_other.png` | Same other camp, paused, zoom 0.5, black void and a wooden structure at the lower left, green field at the lower right. |
| `history.start_zoom1.png` | Start camp, paused, zoom 0.5, pond at top. |
| `history.start_zoom23.png` | Same paused start camp. The filename's 2/3 is not a different zoom on screen; the control shows 0.5x. |
| `history.chronicle.png` | "Chronicle, year 501", page 1 of 2. Nine factions with home names and leaders. "What happened" is a long list of year 501 "died of wounds." Year 501 after a year-500 start is the harness clock (`history.chronicle_opens` says year now 501). |
| `history.chronicle_founders.png` | Page 2, "The founders". All nine factions say "no founder alive". That matches `history.founders` failing with 0 founders. |
| `objects.objects_in_view.png` | Start camp, trees, sacks, animals at the edges, pond at top. |
| `objects.objects_zoomed_out.png` | Solid cracked rock, same family as `biomes.corner`. No objects in frame. |
| `items.items_in_view.png` | Start camp at 0.5x with many item icons among the colonists. |
| `items.items_zoomed_out.png` | Zoom 2.0 crop of colonists and item icons (sacks, meat, leaves, a coin). |
| `jobs.jobs_working.png` | Zoom 0.5, a loose group of colonists and tools on grass, wolf at the left, rain. |
| `wildlife.herd_in_view.png` | Tan grass, three canids with health bars, reeds, a berry bush, forest edge, and a checker of purple and brown test tiles. |
| `wildlife.df_behaviors.png` | Start camp at 0.5x, pond at top. The behavior failure is not a missing sprite in this frame. |
| `wildlife.test_herd.png` | Same camp family, deer and a wolf visible at the left edge. |
| `stance.rings_zoom_1.png` | Camp at 0.5x with yellow, green, and red cell tints and a large tree creature near the lower center. |
| `stance.rings_zoom_13.png` | Zoom 2.0 crop: troll, tree creature, wolf, colonists, colored cell borders. |
| `stance.rings_zoom_23.png` | Zoom 1.0 of that same colored-cell cluster. Rings are drawn. The filename does not match a 2.3 zoom; the control shows 1.0x. |
| `stance.selection_ring.png` | Wider camp shot, same tree creature, colored cells. |
| `stance.stance_markers.png` | Same camp with stance tints, zoom 0.5. |
| `anim.layers.png` | Zoom 0.5, night, scattered figures and item sprites. It does not show which item is in which hand. The layers pass is a count, not this picture. |
| `anim.no_code_motion.png` | Night camp, figures, dropped tools, a small animal. The fail is column/offset accounting. |
| `anim.death_frames.png` | Same night camp a few sim ticks later. No corpse is identifiable in the frame. |
| `anim.no_carry_pose.png` | Same night camp. A pale vertical sprite near the bottom reads as a figure or remnant; the shot does not label it. |
| `anim.object_frames.png` | Same night camp with a short row of red banners or posts near the center. |
| `anim.remains.png` | Same night camp. Remains are not distinguishable from the other small sprites. |
| `anim.state_frames.png` | Same night camp, a few colored posts and a purple-clad figure. |
| `anim.perf_view.png` | Zoom 2.0 grid of colonists with axes or tools on green ground, one tree, one purple-tinted colonist, rain. Perf frame line is about 226 ms. |
| `daynight.noon.png` | Lit grass, figures, a wolf, rocks, item icons. |
| `daynight.night.png` | The same composition in dark blue. |
| `daynight.night_wall_occlusion.png` | Visually the same night composition. No wall is obvious in frame, which fits a glow check that saw 0 at the center, the open side, and behind the wall. |
| `daynight.cave_minus1_noon.png` | Level label "-1", dark brick interior, a grid of figures, a glowing blue pool on the right. |
| `daynight.cave_minus2_noon.png` | Level "-2", dark interior, a banner, a blue pool and a blue creature. Underground renders. |
| `daynight.ground_after_caves.png` | Back on grass: rocks, trees, a campfire, axes in the ground, a few figures at the top. |
| `camera.zoom_3_options.png` | Cracked rock, zoom control showing 1.0x, and a partial tile mosaic at the lower left. The three zoom buttons are on screen. |
| `look.look_label.png` | Night, tooltip "Oak" over empty ground, a blue cursor square. |
| `look.context_menu.png` | Menu "Oak — chop" with Chop down oak, Build above/below, Set on fire, Inventory, Look. The menu does open in this capture. Later look checks still failed (designation marker missing, right-click did not open, hunt option missing). |
| `look.on_timeout.png` | Night, zoom 0.5, 8x, character sheet for a colonist "Elem…", Druid of The Arar Freehold, age 72, shivering, sleeping, carrying a pouch and 15 gold. This is the watchdog frame. |
| `fire.grass_fire_spreading.png` | Paused night, several fire patches, the same Druid sheet, idle. Fire sprites are visible. |
| `fire.perf_100_cells.png` | Zoom 2.0, the screen is full of flame sprites, the Druid sheet open, idle, shivering. |
| `environment.environment_overview.png` | Night woods, character sheet, "Eating raw meat", shivering. No separate temperature readout beyond the sheet. The diurnal check failed with a 0.0°C day/night gap, which a night screenshot cannot show. |
| `timespeed.paused.png` | Camp and items, control reads PAUSED. |
| `timespeed.time_controls.png` | Same view, still PAUSED. |
| `timespeed.time_controls_16x.png` | Same composition, control reads 16x Speed. |
| `timespeed.time_controls_32x.png` | Same composition, control reads 32x Speed. The label changes. `timespeed.speeds_up` still failed on update counts. |
| `faction_menus.menu_clean_default.png` | Stock RPG Maker menu: Overseer, Swordsman, Lv 1, HP 544, Item/Skill/Equip/Status/Formation/Options/Save/Game End. The Deus faction menu assets this suite waited for are not on this frame. |

## GAME TRANSLATION

The simulation changes under `game/js/plugins` are in the build that this harness booted. In this native session a player-visible map does come up: grassland camp, rain, colonists, items, a nearby pond, another forest camp, cracked rock at the world edge, underground rooms with blue water, a chronicle, a faction ledger, an oak context menu, fire, and the time controls. The perf overlay is an artifact of `DEUS_PERF=1` for this run.

What this session does not show as playable: founders are absent on the chronicle page; Pela and Solmarwyn are 29.2 cells apart; the ocean rim is rock in the corner shot; time acceleration does not meet its own update-count checks; the custom faction menu did not replace the stock menu before that suite gave up; save and load back onto a new map was not demonstrated. Rivers passed as data on columns 235 and 28 and were not framed in the start-camp shots. No art files were edited. Owner F5/F8 and Deus acceptance were not done. Observed harness rendering is not a playability acceptance.

## Writer evidence, distinguished

| Run | Source | Window CT | Result | Role here |
| --- | --- | --- | --- | --- |
| W15 | `d5d641bf` runtime, perf off | 04:18:43–04:30:49 | 473/56 exit 1 | Same runtime, different perf protocol. Compared above. |
| W14 | `48cd2f8a` | 04:33:26–04:45:29 | 473/55 exit 1 | Older than the runtime under review. |
| M6 | `d5d641bf` | 04:45:36–04:46:16 | 11/2 exit 1 | Intentional no-opt-in refusal. Not re-run. |
| P3 | `d5d641bf` | 04:16:27–04:17:08 | 12/1 exit 1 | Data load 347.23 ms, map transition null-name. Explained from source. Not re-run. |
| This review | `4eccbbec` tree, `d5d641bf` runtime, perf on | 04:55:23–05:08:45 | 472/57 exit 1 | The independent full default suite. |

## Evidence paths

Committed with this review, under `tasks/ORG-0.2/lane-worldgen-green/evidence/GROK_4eccbbec_full/`:

- `GROK_run.txt`, `GROK_snapshot_validation.txt`, `GROK_results.txt`, `GROK_stdout.txt`, `GROK_stderr.txt` (empty), `GROK_perf_log_lines.txt`, `GROK_png_inventory.txt`
- `shots/` — 64 PNGs, about 18.8 MB

Left untracked on purpose: `GROK_game_runtime.log` (10,992,177 bytes), matching the lane's practice of keeping full runtime logs out of git. It was not deleted. The snapshot under `scratchpad/lane-worldgen-green/snap_GROK_4eccbbec/` is scratch and stays untracked, including `file0.rmmzsave` and `global.rmmzsave`. Writer `*_game_runtime.log` files were not staged.

## Verdict

Overall lane acceptance is **FAIL** on `4eccbbec833af8d1b56bc7b7e93268aedce74a69`.

The blocking code findings are the live 29.2-cell Pela/Solmarwyn gap written by `DEUS_History.js:785`, the same-type hand dedup in `DEUS_Anim.js:577–583`, and the `perf_overlay` load path that calls `onAfterLoad` without `onBeforeSave` (`DEUS_Test.js:956–961` into `rmmz_managers.js:1169`). The full default suite is 472/57 with `look.no_errors` omitted. Deus is NOT CHECKED. The lane gate was not run.

Narrow results that hold and still do not accept the lane: the 1x1 river course contract, the kit minima on this seed, and a real perf new-game measurement with load left at n/a. No repair was made and none is dispatched from this review.
