# ORG-0.2 lane-worldgen-green — independent Grok review

**VERDICT: FAIL**

| | |
|---|---|
| Lane | `tasks/ORG-0.2/lane-worldgen-green` |
| Branch | `task/org-0.2-worldgen-green` |
| Reviewed source | `d8b36c53e3264a49146b756147b95aaa4faff4e2` |
| Base | `565dc5aead7e068230528d573c395ea21ed5cf5d` (merge-base of this branch) |
| Runtime commits reviewed | `248fc691633a96308a34bfb3a639ce6b674078c4` (a), `093a1f41b9f379aafbef0a42bb613a517951c7fc` (c) |
| Report body commit | `__REPORT_BODY_SHA__` |
| Reviewer | grok-4.7 at xhigh |
| Deus | **NOT ISSUED** |

Lane goal: restore generated-world contracts with unchanged assertions and reach complete native green. This checkpoint is red on (a) and (c). This review does not repair code.

Acceptance is red. The single controlled native run is `RESULT: 259 passed, 16 failed (exit 2)`. The harness watchdog stopped the run inside `factions`. The gate list was not run. Two river row checks remain red on the approved carved-network input. History was not entered.

The narrow review of `248fc691` and `093a1f41` finds no blocking defect in those two repairs. The failures below are lane-acceptance findings. The notes after them are code-review notes. They are separate.

## What was reviewed

Read: `AGENTS.md`, `docs/ops/USAGE.md`, this lane's `BRIEF.md` (Owner river-input approval at the "Specific Owner approval for later item (c)" section), `lane.json`, `REPORT.md`, `PM_COMPARISON_20261002.md`, `PROPOSAL_river_checks.md`, `OWNER_FOLLOWUP.md`, and the independent stub-hunt notes at `.deus_worktrees/stub-hunt/scratchpad/stub-hunt/STUBS.md` as leads only.

`HEAD` at review time matched `origin/task/org-0.2-worldgen-green` at `d8b36c53`. Working tree of tracked files was clean before the native run. `git diff --name-only 093a1f41 d8b36c53 -- game tools run_tests.bat` is empty. Runtime bytes after `093a1f41` are unchanged through the reviewed SHA. Later commits `3a8f982d` (writer report) and `d8b36c53` (PM counts) are docs and evidence.

`git diff --stat` of `game/` for the two runtime commits:

- `248fc691` — `game/js/plugins/DEUS_Colonists.js`, 12 insertions, 1 deletion. 2026-10-02 20:50:43 -0500.
- `093a1f41` — `game/js/plugins/DEUS_WorldGen.js`, 44 insertions, 7 deletions. 2026-10-02 21:34:21 -0500.

`DEUS_History.js` blob is identical at the base and at `d8b36c53` (`c01a9ea995c51a3740ffb760354b42ea17eb5171`). `run_tests.bat`, `tools/run_tests.js`, and `DEUS_Test.js` blobs are identical at the base, at `997528e2`, and at `d8b36c53`.

Local `main` is `038a02c35922df825fd7d47d948d7747d4e56755` (docs only). `origin/main` is still `565dc5ae`. This review does not touch `main`.

## Native run (G1)

One real `run_tests.bat`. A first launch was refused because the slot was busy; that process was not killed and did not execute this lane's suite.

Slot: at 2026-10-02 22:06 CT a foreign `node tools/run_tests.js` was already running against `C:\Users\snewt\.deus_worktrees\org-setup\game` (parent node PID 21768, nine `nw.exe` children). Left running. Slot clear at 2026-10-02 22:09:20 -05:00. This lane launched with `nw.exe` count 0.

| | |
|---|---|
| Source | `d8b36c53e3264a49146b756147b95aaa4faff4e2`, clean tracked tree |
| Snapshot | `git archive` of that SHA's `game/` into `scratchpad/lane-worldgen-green/reviewer/snap_G1_d8b36c53/` (4347 blobs). The only blob that differs is snapshot `game/js/plugins.js`: `DEUS_World` parameters `{}` replaced with `"Seed": "1920951434"`. |
| Year | `DEUS_TEST_YEAR=500`. Harness printed `HARNESS New Game year 500 (requested 500)`. |
| Overrides absent | No `DEUS_Z_RANGE`, no suite filter, no timeout override. The shell also had `DEUS_RUN_ID=lane-worldgen-green_20261002_215859`. `game/js` does not read `DEUS_RUN_ID`. |
| Command | `.\run_tests.bat --game C:\Users\snewt\OneDrive\Desktop\UF\.deus_worktrees\org-0.2-worldgen-green\scratchpad\lane-worldgen-green\reviewer\snap_G1_d8b36c53\game` |
| Start | 2026-10-02 22:10:23 -05:00 (harness `2026-10-03T03:10:24.019Z`; snapshot `game_runtime.log` boots at `2026-10-03T03:10:23.774Z`) |
| End | 2026-10-02 22:13:25 -05:00 |
| Shell exit | 2 |
| stderr | empty |
| `nw.exe` after | 0 |

Stdout is 312 lines. The first `RESULT` is line 311. Lines before it: 259 `PASS`, 16 `FAIL`. No `PASS` or `FAIL` after that line. The harness total matches the line count.

```
RESULT: 259 passed, 16 failed (exit 2)
```

Suites entered, in order: smoke, ownership, ecology, colonists, world, worldgen, biomes, tiles, ground, factions.

Last completed check: line 307 `PASS factions.unmet_not_listed`. Line 308 `HARNESS watchdog: whole run took longer than 180 s` (`DEUS_Test.js:234`, `setTimeout` 180000 ms, `finish(2, ...)`). Line 309 `HARNESS current scene: Scene_Map`. Line 310 shot `harness.on_failure.png`.

Coverage: ten suites entered. `factions` did not finish. `history` was not entered. No coverage percentage exists in the transcript. The global watchdog is the 180 s timer above. Outer Node `tools/run_tests.js` `TIMEOUT_MS` is 240000 and did not fire. The gate list (`node tools/ops/run_gate.js`) was not run. It was left unrun because acceptance is already red; rerunning the gate list would only rediscover that.

Evidence committed with this review: `tasks/ORG-0.2/lane-worldgen-green/evidence/G1_reviewer_d8b36c53/` (`G1_run.txt`, `G1_stdout.txt`, `G1_stderr.txt`, `G1_results.txt`, `G1_png_inventory.txt`, `G1_diag_rivers.txt`, `G1_snapshot_validation.txt`, and `shots/` — 21 PNGs). The helper `run_controlled.ps1` overwrote its scratch copy of `game_runtime.log` with a pre-existing lane-root log after the snapshot copy. That clobbered file is not in this packet. The snapshot log that matches the boot timestamp remains at `scratchpad/lane-worldgen-green/reviewer/snap_G1_d8b36c53/game/game_runtime.log` and is gitignored. The counted transcript is `G1_stdout.txt`.

## Lane acceptance — BLOCKING

These are the 16 failing checks, at the `t.check` that printed them. They block complete native green. They are not, by themselves, a finding that `248fc691` or `093a1f41` implemented the wrong repair.

| Check | File:line | Observed |
|---|---|---|
| `ecology.renewable_timer` | `game/js/plugins/DEUS_Ecology.js:1092` | chop did not return the oak on the clear pass (`FAIL` text: occupied pass due/grown/held 1/0/1; clear pass grown 1; final oak) |
| `world.path_blocked_fast` | `game/js/plugins/DEUS_World.js:4372` | no `world:unitBlocked` within 90 frames; pather moved from (187,237) to (194,246) |
| `world.path_gives_up_when_crowded` | `game/js/plugins/DEUS_World.js:4405` | no give-up within 494 frames, 24 steps, now (187,234) |
| `world.faces_eight_ways` | `game/js/plugins/DEUS_World.js:4101` | 6 wrong facing rows; SE row 3 wanted row 2 |
| `world.no_path_is_true` | `game/js/plugins/DEUS_World.js:4515` | 0 "no path" give-ups re-tested |
| `worldgen.river_not_through_start` | `game/js/plugins/DEUS_WorldGen.js:2264` | gaps `NaN, NaN`; keep-away 14. `NaN > 14` is false |
| `worldgen.river_continuous` | `game/js/plugins/DEUS_WorldGen.js:2284` | 465 breaks; first: river at column 235, row 0 dry |
| `worldgen.kit_per_area` | `game/js/plugins/DEUS_WorldGen.js:2330` | Pela Tribe at (195,114) has an empty kit and water NONE |
| `worldgen.kit_covers_plan` | `game/js/plugins/DEUS_WorldGen.js:2350` | kit minimums short of the plan (stone 47/60, straw 8/16) and empty camps including Pela |
| `worldgen.kit_fair` | `game/js/plugins/DEUS_WorldGen.js:2367` | Pela Tribe all zeros |
| `worldgen.autotile_shapes` | `game/js/plugins/DEUS_WorldGen.js:2431` | 7111 sampled, 470 water, 270 wrong; first (217,4) shape 34 expected 0 |
| `biomes.ocean_rim` | `game/js/plugins/DEUS_WorldGen.js:2486` | 14 of 128 edge cells ocean (11%, want >= 60%) |
| `biomes.objects_dense` | `game/js/plugins/DEUS_WorldGen.js:2525` | 1706 objects, want >= 2500 |
| `biomes.kit_present` | `game/js/plugins/DEUS_WorldGen.js:2528` | same Pela Tribe empty kit |
| `biomes.camps_cleared` | `game/js/plugins/DEUS_WorldGen.js:2562` | 5 bare camps, want 8 (`bareWanted` is the ground-faction count when history founders exist, line 2561) |
| `tiles.tileset_names` | `game/js/plugins/DEUS_Tiles.js:1324` | A5 empty; E is `UF_GenShade_E` |

Also blocking for the lane's written acceptance (`BRIEF.md`, "Acceptance and review"), because the run never produced the required green evidence:

- Incomplete native run. Watchdog at `game/js/plugins/DEUS_Test.js:234`. Last suite `factions`, last completed check `factions.unmet_not_listed`. Suites after `factions` in the default order, including `history`, were not entered.
- `river_continuous_between_areas` (`DEUS_WorldGen.js:2290`) was not printed. The check is inside `if (W.inWorld(a.x, a.y + 1))`. Absence means that branch did not run. It is not a pass.
- Gate list not run. No `tools/ops/run_gate.js` log in this review.
- Loaded-world screenshots were opened (below). They do not show rivers, an ocean rim, or 2500 objects. Object count on the transcript is 1706. Camps on the transcript are 5 of 8.

The two river failures are the real row-contract misses the Owner told the lane to report. `PROPOSAL_river_checks.md` is a proposal. Nothing in it was applied. Assertions and thresholds were left as they are. The only test edit on this branch, in `DEUS_WorldGen.js`, is line 2262: `const rivers = []` became `const rivers = WorldGen.riverModels(st)`. Predicates at 2263–2267, 2268–2284, and 2285–2290 are unchanged. This review does not treat the red rows as permission to edit tests.

## Narrow code review — items (a) and (c)

### (a) `248fc691` — allocation re-entry

`factionId` at `DEUS_Colonists.js:340-344` reads `W.state.colony.factionId` when a colony record exists, otherwise `UF.Factions.playerId()`. It does not call `colonyState()` or `setupColony()`. The previous path was `World.addUnit` → `world:unitAdded` → `isColonist` → `factionId` → `colonyState` → `setupColony`, and `setupColony`'s fallback `W.addUnit` ran while `History.materialize` held reserved ids. History's guard remains at `DEUS_History.js:536` (`unit.id !== id || state.nextUnitId !== id + 1`). `DEUS_History.js` itself was not edited.

On the New Game path the transcript supports a completed materialization of the player people: `PASS colonists.colonists_exist` — 145 colonists (`DEUS_Colonists.js` counts `data.kind === "colonist"`, not `isColonist`). `PASS colonists.player_faction` — `f1 (colony: f1)`. Grep of G1 stdout finds no "historical ID" guard text. `worldgen.suite_completed` is also absent. That name is emitted only from the suite `catch` at `DEUS_Test.js:225`, so the worldgen function returned.

`isColonist` (`DEUS_Colonists.js:345`) still requires `u.data.faction === factionId()`. History sets `kind: "colonist"` when `p.factionId === state.factions.playerId` (`DEUS_History.js:512`), and it reads `state.factions` before `addUnit`, so `Factions.generate` does not run on that path (see the nit below). `skipStartingGear` is set before `addUnit` and cleared after (`DEUS_History.js:533-535`), so the Items `unitAdded` starting-kit listener does not add another unit during materialize.

No blocking defect in this commit. The History suite was not reached, so a later regeneration through the same guard is untested. That is an acceptance coverage gap, recorded above, not a New Game defect in `factionId`.

### (c) `093a1f41` — `riverModels` from the carved network

`WorldGen.riverModels` (`DEUS_WorldGen.js:407-434`) builds one model per `waterCache.net.rivers` entry. `course` is `micro.course(r.id)`. `anchorX` is the wrapped source column. `halfWidth` is `micro.halfWidth`. `terminal` is the network river's terminal. `center(gy)` walks course segments. `isWater` compares `rasterizeChunk(gx, gy, 1, 1).river[0]` to `r.id + 1`. Empty array only when state, catalog, `net`, or `micro` is missing.

`waterModels` (`DEUS_WorldGen.js:463-520`) is the same cache the area builder paints from. One module-level slot, key `` `${seed}:${areasX}x${areasY}x${size}@${startArea.x},${startArea.y}` ``. A different world replaces the slot. `net` and `micro` sit on that object. `createRiverNetwork` is called with catalog `rivers.count` and `halfWidth[0]` (line 502). On this seed the catalog range is `[1, 2]` and `[1, 2]`; the carved half-width is 1, which is `halfWidth[0]`.

`center(gy)` (`DEUS_WorldGen.js:416-427`): for each segment, compute the integer world-height shifts whose unwrapped Y span contains `gy`, then interpolate X and `wrapX`. No crossing returns `NaN`. A horizontal segment (`by === ay`) returns the source endpoint (`t = 0`). Course points are unwrapped; the comment at 401-402 states these rivers do not cross every row.

Independent node diagnostic, same arithmetic as `evidence/C_rivers/diag_rivers.js`, lane root pointed at this worktree, seed 1920951434, areas 1×1, size 256. Full text: `evidence/G1_reviewer_d8b36c53/G1_diag_rivers.txt`. Prefix matches the writer's diagnostic:

- 2 rivers. Sources (14,7) elevation 0.834 and (1,11) elevation 0.709. Both terminal sea, eroded 0. Failed sources 0.
- `riverModels` length 2. `rivers_count` would pass. Native G1 did pass: `2 river(s) (catalog count 1-2) at columns 235 (half-width 1), 28 (half-width 1)`.
- River 0: course 70 points, x 156..235, y 41..118, 78 of 256 rows have a center, `center(128)` is `NaN`.
- River 1: course 48 points, x 28..90, y 182..222, 41 rows have a center, `center(128)` is `NaN`.
- Start gaps stringify as `null` because `JSON.stringify(NaN)` is `null`. The native check prints `NaN, NaN`.
- Proxy `isWater` break counts: 185 and 217. The native check uses painted tiles and reported 465. Both say the row contract fails. The native number is the acceptance number.

Live callers of `riverModels`: the worldgen suite at `DEUS_WorldGen.js:2262`, the singular wrapper `riverModel` at line 436 (no other plugin caller), `tools/test_seamless_map_edges.js:203`, and `tools/test_seamless_seam_live.js:47`. The archive pre-rename copy is not live. The two tools are not in the default native suite. The writer's caller table omitted them. See nits.

Catalog `rivers.about` (`DEUS_WorldCatalog.json:1230`) still says rivers run north-south through the whole world. That string was not edited. The adapter does not invent catalogue polylines to satisfy it.

No blocking defect in this commit against the Owner approval: the API reads the carved network, and the suite now passes that network into the unchanged count, distance, and continuity predicates. The distance and continuity predicates fail for real.

## Code-review notes (non-blocking)

1. `Factions.playerId` (`DEUS_Factions.js:533`) calls `data()` (`DEUS_Factions.js:524-528`), and `data()` calls `Factions.generate(W.state)` when `state.factions` is missing. `factionId` reaches that only when `state.colony` is absent (`DEUS_Colonists.js:343`). History materialize already has `state.factions` (`DEUS_History.js:512`). The New Game path observed here does not generate factions from inside `unitAdded`.

2. `isWater` (`DEUS_WorldGen.js:431`) allocates a 1×1 raster on every call. The worldgen suite uses `center`, not `isWater`. This is not a per-frame path in the reviewed run. No before/after timing was measured, so this review states no performance win or regression for the adapter.

3. `tools/test_seamless_map_edges.js:208-221` treats continuity as `Math.abs(c0 - cH) > 1e-5`. `Math.abs(NaN - NaN)` is `NaN`, and `NaN > 1e-5` is false, so a river that misses row 0 does not fail that tool's continuity flag. `tools/test_seamless_seam_live.js:50` does `Math.round(rivers[0].center(0))`, which is `NaN` when row 0 is not crossed, and that value can become a camera X. Neither tool is in the default native suite. Seed in the edge tool's river loop is 9999, not 1920951434.

4. Horizontal `center()` returns the segment's source X (`DEUS_WorldGen.js:424`). This seed's courses span many rows (y 41..118 and 182..222). The red rows are uncrossed rows, not that horizontal case.

5. `waterCache` is a single slot (`DEUS_WorldGen.js:465-468`). Replacing the world drops the previous net. The diagnostic and the native run agree on two rivers for seed 1920951434, so the cache served the same network the suite counted.

## Writer and PM claims checked

- Writer F2 (`evidence/F2_093a1f41_r1`) is a real run on the same runtime bytes: start 2026-10-02 21:34:58 -05:00, end 21:37:59 -05:00, `RESULT: 243 passed, 17 failed (exit 2)`, last completed check `ground.diag_seam`, then the 180 s watchdog. G1 is 259/16 because it reached further and because one timing check flipped. Name diff of checks before each RESULT: G1 adds `ecology.bounded_work` (F2 failed it at 23.350 ms; G1 passed at 10.260 ms), `ground.no_errors`, and the 14 `factions.*` passes through `unmet_not_listed`. No other pass or fail name differs. 243 + 16 = 259 and 17 − 1 = 16. The PM note that totals move under the incomplete 180 s protocol matches these two transcripts. F2 was not fabricated.
- `ecology.bounded_work` moving between 23.350 ms and 10.260 ms is timing variance on an unchanged check. It is not a code change between F2 and G1 (`game/` diff from `093a1f41` to `d8b36c53` is empty).
- The approved test correction is the single `const rivers = WorldGen.riverModels(st)` line. Confirmed by `git diff` of `DEUS_WorldGen.js` against the base.
- "Runtime tree unchanged after `093a1f41`" holds for `game/`, `tools/`, and `run_tests.bat`.
- Local `main` `038a02c3` is the local branch. `origin/main` remains the parent `565dc5ae`.
- This review does not adopt a "9 of 26" suite fraction. G1 entered 10 suites and stopped inside the 10th. `AVAILABLE SUITES` on G1 stdout line 5 lists many suites, including ones registered with `isDefault: false` (`DEUS_Test.js` treats `options.isDefault !== false` as default). Smoke check count is one `t.check` per on-screen event-name group (`DEUS_Test.js:307-312`) and is included in the 259.

## Screenshots

All 21 PNGs under `evidence/G1_reviewer_d8b36c53/shots/` were opened. No contact sheet was made. No art was edited. Descriptions are the pixels, not the filenames.

- `smoke.map.png` — zoom 1.0, speed 1x, dense colonist grid, red lion banner, green bars, bushes, rock, bread.
- `history.start_zoom1.png` and `history.start_zoom23.png` — both a 0.5x paused meadow crowd and a small blue pond at top center. File sizes differ (216789 and 216723 bytes). No distinct 2.3 framing is visible.
- `history.start_other.png` — 0.5x paused, brown soil, snow pines, a formation of green-clad sprites, grey rock at the left, black void and patterned ground at the lower right, wooden fences.
- `harness.on_failure.png` — 1.0x, speed shown as 1x, same crowd with selection boxes, rain, bread, rock, bush, a small mushroom-like sprite.
- `worldgen.start_area.png` and `biomes.start_zoom_2.png` — 2.0x close-ups of the banner and colonists, selection boxes, rain, bread.
- `biomes.corner.png` — 2.0x dark cracked rock and rain. No ocean in frame.
- `biomes.start_zoom_0.png` — 0.5x, running, pond, crowd, rain.
- `biomes.start_zoom_1.png` — 1.0x, same crowd as the harness shot.
- `ecology.replenished_monster.png` — 1.0x snow pines, a labeled Troll, brown and rock ground, rain.
- `ecology.replenished_prey.png` — 1.0x two deer (one labeled Deer) by snow pines, water along the bottom, rock and wood to the right.
- `ground.terrain_gradient_border.png` — 1.0x rock face with a built wood and stone edge at the left.
- `ground.terrain_gradient_closeup.png` — 0.5x populated meadow, pond, pink selection frames, rain.
- `ground.terrain_gradient_medium.png` — 1.0x crowd, pink frames, banner.
- `ground.terrain_gradient_wide.png` — 2.0x crowd close-up, pink frames, banner.
- `ownership.owned_bed.png` — 1.0x meadow, two straw beds, tooltip "Straw bed", crowd to the right.
- `world.eight_way.png` — 1.0x brown dirt, a hedge row, a red-haired sprite at the hedge end, blue and grey blocks labeled NE and S. The facing check failed.
- `world.path_around_wall.png` — 1.0x an empty stone U-shaped wall. No walker in frame. The path checks failed.
- `world.round_seam_wrap.png` — 1.0x rock face, two spiders at the lower left.
- `world.unit_in_view.png` — 1.0x rock and rain. No figure in frame. The check name is not among the 16 failures.
- No river column is visible in any shot. The small pond is visible in the zoomed-out start shots.

## Stop

Reviewed source remains `d8b36c53e3264a49146b756147b95aaa4faff4e2`. The report-only commit is `__REPORT_BODY_SHA__`. Native counts from the single controlled run: 259 passed, 16 failed, exit 2, ten suites entered, stopped inside `factions` by the 180 s watchdog. Gate not run. Reviewer model grok-4.7. Deus **NOT ISSUED**. No F5, F8, or Deus verdict is claimed. Plugin audit is not started.
