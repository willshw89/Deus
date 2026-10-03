# ORG-0.2 / lane-worldgen-green: writer report, checkpoint (a)/(c)

**Task:** ORG-0.2 "Baseline green" (Owner GO 2026-10-02 20:25 CT; resume dispatches 2026-10-02 21:04 and 21:17 CT). **Branch:** `task/org-0.2-worldgen-green`, base `565dc5ae`. **Writer:** Claude (claude-fable-5-1, per-command identity `deus-claude <deus-claude@local.invalid>`). **Reviewer:** Grok (not yet run). **Status: PARTIAL / RED checkpoint.** Items (a) and (c) each have one runtime fix commit with a fresh controlled native RESULT; nothing is green; no merge, tag, self-review or world-load acceptance is claimed. Times are CT.

## 1. SHAs (all origin-visible, `git ls-remote origin refs/heads/task/org-0.2-worldgen-green` checked after each push)

| What | SHA | Note |
|---|---|---|
| Base (origin/main at dispatch) | `565dc5aead7e068230528d573c395ea21ed5cf5d` | PM brief commit `3f704dc0` on top; `game/` identical to the base |
| Item (a) fix, tested | `248fc691633a96308a34bfb3a639ce6b674078c4` | `[claude] ORG-0.2 (a): factionId() reads the faction without the lazy colony setup` |
| PM / Codex records (not mine) | `5d333825`, `3f7e1a22`, `4811cda0`, `997528e2` | docs, recovery evidence, usage SOP; pushed with my next push because they are ancestors |
| Item (c) fix, tested | `093a1f41b9f379aafbef0a42bb613a517951c7fc` | `[claude] ORG-0.2 (c): riverModels over the carved hydrology network; river test reads it again` |
| Final (this report + evidence) | the commit carrying this file; named in the final push line of NOTES.md and in the PM return message | evidence only, no runtime change |

Pre-restart runs: R0 (reproduction on `3f704dc0`, `game/` = base) and D1 (instrumented diagnostic snapshot) were checkpointed by the PM in `4811cda0`. Post-restart runs: F1 (source `248fc691`) and F2 (source `093a1f41`).

## 2. Files changed by the writer

- `game/js/plugins/DEUS_Colonists.js` (248fc691): `factionId()` rewritten.
- `docs/systems/DEUS_Colonists.md` (248fc691): section 7, the rule and its evidence pointer.
- `game/js/plugins/DEUS_WorldGen.js` (093a1f41): `WorldGen.riverModels`, `WorldGen.riverModel`, `waterModels` (`net` kept in `waterCache`), `WorldGen.waterModel` doc comment, and the worldgen suite's river input line (the only test change, Owner-approved).
- `docs/systems/DEUS_WorldGen.md` (093a1f41): API rows for `riverModels` / `waterModel`, a known-limits note.
- `tasks/ORG-0.2/lane-worldgen-green/**`: this report, `PROPOSAL_river_checks.md`, `evidence/` (R0, D1, F1, F2, C_rivers).

Not changed: any `tools/test_*.js`, `tools/run_tests.js`, `game/js/plugins/DEUS_Test.js` (watchdog, default suites, assertions, thresholds), `tools/ops/gate_tests.json`, the tracked `game/js/plugins.js`, `DEUS_History.js` (its guard stays), `game/js/sim/**`, art, engine core, `lane.json`, main, stashes, the backup branch, other worktrees. `docs/STATUS.md` carried my scoped claim in the working copy from 21:21 CT until this report and was restored to HEAD; it was never committed (DEC-085 item 8: lane status is not kept on that page).

## 3. Exact new or changed symbols and their existing callers

| Symbol | File | Change | Existing callers |
|---|---|---|---|
| `factionId()` (module-private) | DEUS_Colonists.js:333 at 248fc691 | Pure read: `state.colony.factionId` when the colony exists, else `UF.Factions.playerId()`; never calls `colonyState()` (which runs `setupColony` lazily) | `isColonist` (:345), `cultureOf` (:384), the `isPlayer` fallback (:3125), `DEUS.Colonists.faction()` (:5756); `isColonist` is called by the `world:unitAdded` listener (:5869) |
| `WorldGen.riverModels(state)` | DEUS_WorldGen.js:407 at 093a1f41 | Returns `[{ id, anchorX, halfWidth, terminal, course, center(gy), isWater(gx, gy) }]` built from `waterCache.net.rivers`, `micro.course(id)` and `micro.rasterizeChunk` | the worldgen suite (:2262), `WorldGen.riverModel` |
| `WorldGen.riverModel(state)` | DEUS_WorldGen.js:446 | `riverModels(state)[0] \|\| null` again | no caller in `game/js/plugins` (kept for older callers, as documented) |
| `waterModels(state)` (module-private) | DEUS_WorldGen.js:465 | `net` (the `createRiverNetwork` result) is kept in `waterCache` beside `micro` | `riverModels`, `WorldGen.waterModel`, `columnClimate`, the area builders, `isWaterAt` (unchanged callers; the cache shape gains one field) |
| worldgen suite input | DEUS_WorldGen.js:2262 | `const rivers = WorldGen.riverModels(st);` (was the literal `[]` since 2c23b61b) | `river_not_through_start`, `rivers_count`, `river_continuous` (unchanged) |

No new game call path, event, plugin, save key or schema. `center(gy)` returns the course's wrapped column where it first crosses world row `gy` and `NaN` on a row the course never crosses; it is documented as such in code and in DEUS_WorldGen.md.

## 4. Reference patterns (PM references; all three opened and read before code; licenses confirmed from the repositories' COPYING / LICENSE files)

- git `bisect.c` (`bisect_next_all`, `check_good_are_ancestors_of_bad`, `error_if_skipped_commits`; GPL-2.0, patterns only, nothing copied): used for the method, not for code. Every item got a reproducible predicate before any change (R0 for (a); the `diag_rivers.js` measurement and F2 for (c)); the "good" reference was the PM's recorded controlled baseline rather than a bisect run (the causes were reachable by inspection: `git blame -w -M` names 2c23b61b for the river input); item (b), which did not reproduce in four controlled runs, is reported as "not reproduced under this protocol" and not as a verdict, in the spirit of `error_if_skipped_commits`.
- Node `child_process.md` (`spawn`, `exit`/`close`/`error`, `kill`; MIT, nothing copied or adapted): followed by `scratchpad/lane-worldgen-green/run_controlled.ps1`, which only wraps the real `run_tests.bat --game <snapshot>`: explicit argument list, the harness's own 180 s watchdog and 240 s kill left untouched, the shell exit of the batch file and the harness's RESULT line recorded separately and truthfully (a missing RESULT would be written as "NONE"). No custom NW runner was used for any acceptance run.
- DevTools `js_protocol.pdl` (`Profiler.*`, `Profile`, `ProfileNode`; BSD-3-Clause): read, not applied. No performance work was done; the two timing checks that fail are reported with their raw numbers only (section 7).

## 5. Controlled protocol, every run

Seed **1920951434**, year **500**, no Z-range override. Each run: a disposable snapshot of the tested commit's `game/` tree under `scratchpad/lane-worldgen-green/` (R0/D1 copied from the clean working tree at `3f704dc0`; F1/F2 extracted with `git archive <sha> game`), with only `DEUS_World.parameters.Seed` set to `"1920951434"` in the snapshot's `js/plugins.js`; then, from the lane root, `$env:DEUS_TEST_YEAR = '500'; .\run_tests.bat --game <snapshot>\game`. Snapshot validation (F1, F2): every file hashed with `git hash-object --stdin-paths` against `git ls-tree -r <sha> -- game` (4,347 blobs each); the only differing file is `game/js/plugins.js`, by the four Seed lines (`evidence/F1_*/F1_snapshot_validation.txt`, `evidence/F2_*/F2_snapshot_validation.txt`). The generated world's seed and year are in every results file: `HARNESS New Game year 500 (requested 500)`, `PASS world.in_area_map - area (0,0), map 1000, seed 1920951434`, `PASS factions.generated_with_world - 9 factions (yours among them), seed 1920951434` (R0) / `PASS biomes.world_variety ... (seed 1920951434)`.

| Run | Source | Snapshot | Start-end CT | Batch exit | RESULT line | Coverage |
|---|---|---|---|---|---|---|
| R0 (reproduction, pre-fix) | `3f704dc0` (`game/` = base 565dc5ae) | `snap_R0_3f704dc0` | 20:42:55-20:46:01 | 2 | `RESULT: 117 passed, 20 failed (exit 2)` | watchdog inside `objects` (12 suites entered) |
| D1 (diagnostic; `World.addUnit` re-entry tracer added to the snapshot only) | `3f704dc0` + tracer | `snap_D1_3f704dc0` | 20:46:22-20:49:24 | 2 | `RESULT: 143 passed, 24 failed (exit 2)` | diagnostic, not acceptance |
| F1 (post-fix (a)) | `248fc691` | `snap_F1_248fc691` | 21:20:01-21:23:03 | 2 | `RESULT: 244 passed, 16 failed (exit 2)` | watchdog after `ground` (9 of the 26 default suites) |
| F2 (post-fix (c)) | `093a1f41` | `snap_F2_093a1f41` | 21:34:58-21:37:59 | 2 | `RESULT: 243 passed, 17 failed (exit 2)` | watchdog after `ground` (9 suites) |

Every run reached its RESULT line through the harness's own watchdog; `nw.exe` never exited early (both stderr files are empty; no `HARNESS: nw.exe exited ... before the harness finished` line). Raw stdout, stderr, the results file, the capture inventory, the run metadata and a `world:created` listener-timing excerpt of the game's runtime log are retained per run under `evidence/`. The complete runtime logs (3 MB each) and a mechanically invalid first validation attempt (a BOM broke the hash input; 470 KB of false "DIFFERS" lines) are kept on disk under `scratchpad/lane-worldgen-green/evidence_large/`, not committed.

## 6. Items, in the Owner's order

### (a) `DEUS_History.js:536` allocation guard: 1 fix round, repaired on the New Game path

- **Reproduced (R0):** `FAIL worldgen.suite_completed - History: unitAdded listener allocated inside the historical ID range [at ...DEUS_History.js:536:74 ...]`, the same for `history.suite_completed`, and `FAIL colonists.colonists_exist - 2 colonists present`.
- **Cause, verified statically and dynamically (D1):** `World.addUnit` emits `world:unitAdded` synchronously after taking its ID; the Colonists listener (DEUS_Colonists.js:5858 at base) classifies the unit with `isColonist -> factionId -> colonyState`, and `colonyState()` ran `setupColony` lazily because `state.colony` did not exist yet while `DEUS_History.materialize` was still adding the historical people inside `world:created`; with fewer than two residents, `setupColony`'s fallback `W.addUnit` took the next reserved ID. D1's tracer logged exactly that nested stack three times (boot, worldgen suite, history suite): `World.addUnit <- setupColony (DEUS_Colonists.js:964) <- colonyState (:269) <- factionId (:333) <- isColonist (:334) <- listener (:5858) <- UF.Events.emit (DEUS_Core.js:307) <- World.addUnit (DEUS_World.js:1948)`, with `colonyExists=false`, `nextUnitId=4654`, `kind=person faction=f1` (`evidence/D1/D1_nested_addUnit.log`).
- **Fix (248fc691):** `factionId()` reads the faction without the lazy setup. History's guard is untouched.
- **Result (F1):** no "historical ID range" message anywhere in the run; `worldgen.suite_completed` no longer fails; `PASS colonists.colonists_exist - 145 colonists present` (R0: 2). The `history` suite was not reached before the watchdog in F1 or F2 (R0 reached it only because the broken world made the earlier suites faster), so the history suite's own regeneration path is **not checked** post-fix.

### (b) `nw.exe` exiting before the RESULT line: not reproduced

Four controlled runs (R0, D1, F1, F2) all ended with the harness's watchdog and a computed RESULT; the batch exit was 2 each time (the harness's "incomplete" code), stderr empty. The PM's earlier RESULT-less runs were unrestricted (no `DEUS_TEST_YEAR`), which this dispatch forbids; no cause was found on this protocol and no fix was invented. What does reproduce is the coverage limit behind it: at year 500 the materialized world makes the default suites slow, and 9 of the 26 default suites finish inside the stock 180 s watchdog (R0's broken two-colonist world got further). That is a harness/time-limit decision for the Owner (section 9), not a change this lane may make.

### (c) rivers = 0: 1 fix round; `rivers_count` repaired, two row-based checks fail for real

- **Attribution, rechecked:** `git blame -w -M -L 2225,2225 565dc5ae -- game/js/plugins/DEUS_WorldGen.js` and `git log -L` both name `2c23b61b68dc53b73b6a764cbc6de2c43579bb0a` as the commit that replaced `const rivers = WorldGen.riverModels(st);` with `const rivers = [];` and made `riverModels` return `[]` (2026-10-02 09:23:13 CT; subject `[astra] WG.WORLDGEN.06 Engine Bridge`; author and committer `deus-pm <deus-pm@local.invalid>`; a single-parent direct commit; the lane manifest `tasks/WG.WORLDGEN.06/lane-bridge/lane.json` names writer `claude`; no launch record exists in STATUS, VISION or OWNER_DECISIONS). The executing model is not established by this evidence; three labels disagree.
- **PM stub audit (`TEST_INPUT_AUDIT_PM.md`), confirmed read-only:** the river input finding as above; `tools/test_agriculture.js:11` `const mutations = {};` with the `--mutant=` branch reading it (an empty mutation registry; frozen scope, untouched). No other disconnected live-world input was found by me beyond the PM's list; I did not repeat the PM's scan.
- **Fix (093a1f41):** `WorldGen.riverModels(st)` reads the carved network (section 3); the suite's input is restored; nothing else in the test changed.
- **Measured before the run** (`evidence/C_rivers/`, headless, same plugin code): two rivers planned at this seed (sources at macro nodes with elevation 0.834 and 0.709, both ending at the sea; 56 of 256 nodes at or above the 0.6 source floor, so the floor is not a problem on this seed); river #0 covers x 156..235, rows 41..118; river #1 x 28..90, rows 182..222; neither crosses row 128.
- **Result (F2):** `PASS worldgen.rivers_count - 2 river(s) (catalog count 1-2) at columns 235 (half-width 1), 28 (half-width 1)`; `FAIL worldgen.river_not_through_start - river(s) pass NaN, NaN cells from the start (keep away 14)`; `FAIL worldgen.river_continuous - 465 break(s); first: river at column 235: row 0 dry`. The two failures are real failures of the row-by-row contract (a river crossing every row of the start area, the pre-hydrology design) against a world that follows the hydrology design (source to sea). Per the brief's step 5 the dependent work stops here: the exact proposal with current lines and replacement text is `PROPOSAL_river_checks.md` (option A recommended; a world-side alternative needs `DEUS_Hydrology.js`, outside this lane). Not a failed fix round: the adapter does what the Owner approved, and no test was loosened.

### (d) objects 1,706 / 2,500, (e) camps 5 / 8, (f) the rest: untouched

Measured only: `FAIL biomes.objects_dense - 1706 objects in the start area (want >= 2500)` (R0: 1727; the PM baseline: 1727), `FAIL biomes.camps_cleared - 5 sites in area (0,0): 5 bare camps (want 8)`. The (f) list after the fixes: `ecology.renewable_timer` (now `final oak`, the timer works and the check's literal fails), `kit_per_area` / `kit_covers_plan` / `kit_fair` / `kit_present`, `tiles.tileset_names`, `world.path_blocked_fast`, `world.path_gives_up_when_crowded`, `world.faces_eight_ways`, `world.no_path_is_true`, `worldgen.autotile_shapes` (270 wrong shapes; first reached in F1, it was behind the (a) abort before), `biomes.ocean_rim` (11 %, want 60 %), `ecology.bounded_work` (21.7 ms in F1, 23.4 ms in F2 against a 20 ms budget; raw numbers, no profiling). `world.in_area_map` and the `ownership` suite pass in every run (the handoff's "area map" and "arena" items did not reproduce). `colonists.colonists_exist` passes since (a).

## 7. Remaining failures at F2 (17) and untested paths

ecology.renewable_timer, ecology.bounded_work, world.path_blocked_fast, world.path_gives_up_when_crowded, world.faces_eight_ways, world.no_path_is_true, worldgen.river_not_through_start, worldgen.river_continuous, worldgen.kit_per_area, worldgen.kit_covers_plan, worldgen.kit_fair, worldgen.autotile_shapes, biomes.ocean_rim, biomes.objects_dense, biomes.kit_present, biomes.camps_cleared, tiles.tileset_names. Not reached in any post-fix run (watchdog): factions, history, objects, walls, doors, items, jobs, floors, wildlife, stance, combat, anim, fog, daynight, timespeed, camera, culling, speech, look, sheet, talk, fire, vertical, natural_walls, flooding, strata, sparse_outer, environment, faction_menus, title, load, setup, depth, layers_flat and the other registered non-default suites. The Node gate (`node tools/ops/run_gate.js`) was not run in this dispatch (it is part of final lane acceptance, not of the (a)/(c) checkpoint).

## 8. Screenshots opened

Every PNG of F1 (17) and F2 (20) was opened with the image reader. Meaningful acceptance evidence, copied under `evidence/F1_*/shots/` and `evidence/F2_*/shots/`:

- `F1_smoke.map.png`, `F2_smoke.map.png` (1.0x, identical scenes): a block of roughly 140 people with green health bars in rows around the red lion banner in the meadow, a few bushes and rocks, the Ground / speed HUD, the zoom window and the hotbar. This is the materialized 500-year population, the visible effect of (a); R0's `smoke.map.png` had two figures beside the banner.
- `F1_history.start_zoom1.png` (0.5x, PAUSED, written by History's own snap at boot): the same block with the pond at the top centre, trees and rocks around it.
- `F1_history.start_other.png` (0.5x): a second faction's camp, about 70 identical people in rows on dirt among snowy conifers, hemmed by rock face and black-capped wall rows at the left, with grass at the lower right.
- `F1_harness.on_failure.png` (0.5x, watchdog time): the populated start with a "Tall grass" object window still open on the right (a suite left it open); `F2_harness.on_failure.png` (1.0x): the ground suite's last view, wooden walls with black caps and light-blue tiles beside a rock face.
- `F1_biomes.corner.png` (2.0x at (24,24)) and the `world.unit_in_view` / `world.round_seam_wrap` captures: grey rock-face tiles only (the ground level inside a hill under the volumetric terrain; two spiders in the seam view). Not evidence of a defect by themselves; relevant to (d).
- The remaining captures are fixture views (the wall ring, the eight-way hedge fixture, a troll and a deer in snowy conifers with cut hillside tiles, straw beds, the crowd at three zooms, the ground gradient views with pink and yellow job cards). **No capture covers a river column** (235 or 28); the river evidence is the suite's own `rivers_count` output and the headless measurement.

## 9. Decisions needed (Owner / PM)

1. The two river checks: option A, B or C of `PROPOSAL_river_checks.md`.
2. Harness coverage: at year 500 only 9 of 26 default suites fit the 180 s watchdog, so a "complete green native result" cannot be observed on this protocol whatever the fixes; the lane may not change the watchdog. A ruling on the time limit (or on splitting the default run) is needed before items (d)-(f) can be judged on a complete run.
3. (d) objects and (e) camps are measured and untouched; the prior lane's PROPOSAL_test_corrections.md on them is still unapproved.

## 10. GAME TRANSLATION (DEC-087 scope: the diff loads in `game/js/plugins/**`)

- **Player / World Effect:** a New Game at any requested year materializes its whole historical population (not two fallback persons), and the world's rivers are reported from the water actually carved into the map. Class **B. WORLD-BEHAVIOR VISIBLE** for (a) (the crowd in the captures); **C. FOUNDATIONAL / INDIRECT** for (c) (an adapter consumed by the worldgen suite and by any caller of `riverModels`/`riverModel`; corruption would show as a river count or course that disagrees with the painted water).
- **Trigger:** New Game / the native test startup (`Scene_Boot.startNormalGame` -> `DataManager.setupNewGame` -> `World.newWorld` -> `world:created`); any caller of `WorldGen.riverModels`.
- **Runtime Authority:** existing `DEUS_World` (unit registry, `addUnit`), `DEUS_History` (materialization, its guard), `DEUS_Colonists` (classification, colony setup), `DEUS_WorldGen` + `game/js/sim/worldgen/DEUS_Hydrology.js` (river planning and rasterization). No new authority.
- **Simulation Path:** (a) `History.materialize` -> `World.addUnit` -> `world:unitAdded` -> Colonists listener -> `isColonist` -> `factionId` (pure read now) ; `setupColony` runs once, from Colonists' own `world:created` listener. (c) `waterModels` -> `Hydrology.createRiverNetwork` -> `net`/`micro` -> `riverModels` reads `net.rivers`, `micro.course`, `micro.rasterizeChunk`; the area build still paints water from `micro.rasterizeChunk` as before.
- **Engine Bridge:** existing: units become RMMZ events through `spawnUnitEvent` on the displayed area; river tiles are A1 water autotiles painted by the area build. No bridge was added or changed.
- **Visible Result:** the captures in section 8 (crowd, second camp); rivers not captured.
- **Persistence:** existing World state serialization; `riverModels` is derived data rebuilt per world (nothing saved); no schema change. Save/load of the materialized world was exercised only by `smoke.save_serializes` / `smoke.colony_state_in_save` (PASS in F1/F2), not by a fresh-process reload.
- **Failure Without This Lane:** every New Game started with two fallback colonists and an aborted materialization; the river checks measured an empty literal.
- **Automated Proof:** R0, D1, F1, F2 (section 5), the headless measurement (`evidence/C_rivers`).
- **In-Game Proof:** native `nw.exe` runs through `run_tests.bat` with inspected captures (section 8). **Editor F5 Playtest and an F8 console walk-through were not performed** (not observed); the Owner's laptop check is pending.
- **Consumed by game systems:** units -> Scene_Map events, Colonists jobs, Ownership beds, the History ledger; `riverModels` -> the worldgen suite and any later consumer (none other in the plugins today).
- **Status fields:** Simulation implemented: YES (both items, evidence above). Engine bridge implemented: YES (existing bridges exercised; none added). Presentation implemented: YES (existing; crowd captured, rivers not captured). Input/player interaction implemented: NOT APPLICABLE (no new interaction). Save/load implemented: PARTIAL (in-process save checks pass; no fresh-process reload in this dispatch). Playable verification performed: PARTIAL (native harness runs with captures; no editor F5, no Owner viewing).

## 11. Attempts and process notes

- (a): 1 fix round (248fc691), demonstrated by F1. (c): 1 fix round (093a1f41), demonstrated by F2 for `rivers_count`; the other two river checks are stopped for a ruling. (b): 0 (not reproduced). (d), (e), (f): 0.
- Mechanical notes for the next writer (also in `scratchpad/lane-worldgen-green/NOTES.md`): piping paths from PowerShell 5.1 into `git hash-object --stdin-paths` prefixes a BOM to the first path (use an ASCII file and a `cmd` redirect; `validate_snapshot.ps1` does); `git archive <sha> game | tar -x` must run under `cmd`, not PowerShell; the tool harness refuses any command text that contains a computed recursive delete, so snapshots are built into fresh folder names instead; the game writes `game_runtime.log` into the snapshot's game folder (nw.exe's cwd), not the lane root; the harness does not write a `SHOT` line for History's three boot captures.
- Checkpoint: **RED.** F2 on 093a1f41: `RESULT: 243 passed, 17 failed (exit 2)`, 9 of 26 default suites, items (d)-(f) untouched, Grok review and the Owner's laptop check pending.