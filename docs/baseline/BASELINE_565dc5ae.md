# ORG-0.1: Baseline at 565dc5ae

Recorded 2026-10-02 by Codex (PM). This is a diagnostic report, not a passing-baseline or gameplay completion claim.

Repository: `willshw89/Deus`. Runtime/source SHA: `565dc5aead7e068230528d573c395ea21ed5cf5d`. `git ls-remote origin refs/heads/main` returned this exact SHA during this session. Historical source: `056323db0f7c4e0c3795287d8a1479cd3bdc68f7`.

## Scope and commands

Tests ran in new shared diagnostic clones under `scratchpad/codex-phase0-20261002/`; no canonical game file was edited by Codex. Pre-existing/current local game edits are excluded from these snapshots. Existing worktrees, the backup branch and stash were preserved.

Untouched committed-copy command, from each clone root: `.\run_tests.bat`. Both unrestricted runs exited before RESULT; the cause of the exits is unknown. Earlier sandboxed attempts encountered EPERM resolving `C:\Users\snewt` and are not game-regression evidence.

Controlled comparison, from each separate controlled clone root:

```powershell
$env:DEUS_TEST_YEAR = '500'
.\run_tests.bat
```

Fixture override: only the disposable copies' `DEUS_World.parameters.Seed` in `game/js/plugins.js` was set to `1920951434`. These are source-SHA tests with a recorded fixture override, not untouched-tree tests. No Z-range override was set. Runner: installed Steam NW.js. Node: v24.19.0. Controlled old run began 18:49:43 CT; controlled current run began 18:54:26 CT. Native runs overlapped separate Node gate activity; their timing assertions are diagnostic only, not standalone performance profiles.

## Raw native results

- 056323db controlled: `RESULT: 224 passed, 11 failed (exit 2)`; [full output](evidence/056323db_native_seed1920951434_year500.txt).
- 565dc5ae controlled: `RESULT: 118 passed, 19 failed (exit 2)`; [full output](evidence/565dc5ae_native_seed1920951434_year500.txt).
- 056323db untouched unrestricted: `No RESULT line`; [full output](evidence/056323db_native_unmodified_partial.txt).
- 565dc5ae untouched unrestricted: `No RESULT line`; [full output](evidence/565dc5ae_native_unmodified_partial.txt).

Both controlled runs reached their computed RESULT line because the native harness's 180-second watchdog fired. Exit 2 means harness failure/incomplete coverage; neither result is a pass. The PowerShell execution tool reported shell exit 1 for these failed commands; the RESULT's explicit harness exit is 2.

## Every executed suite in the current controlled run

| Suite | PASS | FAIL |
|---|---:|---:|
| smoke | 7 | 0 |
| ownership | 9 | 0 |
| ecology | 10 | 2 |
| colonists | 4 | 1 |
| world | 26 | 4 |
| worldgen | 13 | 5 |
| biomes | 8 | 4 |
| tiles | 10 | 1 |
| ground | 10 | 0 |
| factions | 17 | 0 |
| history | 0 | 2 |
| objects | 4 | 0 |

## Observed expected-red candidate

These 19 named failures plus the watchdog/incomplete-coverage condition are the observed candidate for ORG-1/2/3 only. They do not authorize ignored failures in game-logic lanes. Owner receipt/acceptance must be recorded before calling this list frozen. A missing/unreached check is not an expected PASS, and a new incomplete run must not silently earn a regression PASS.

| Check | Evidence detail (full line in raw log) | Also failed in old controlled run? |
|---|---|---|
| ecology.renewable_timer | chop -> oak_stump; occupied pass due/grown/held 0/0/0; clear pass grown 0; final oak_stump | No observed failure; coverage/fixture still matters |
| ecology.native_regrow_single | UF_Objects timers 0; Ecology timers 0; cell berry_bush_bare | No observed failure; coverage/fixture still matters |
| colonists.colonists_exist | 2 colonists present | No observed failure; coverage/fixture still matters |
| world.path_blocked_fast | goal (175,37) inside the ring with its gap closed; TEST_pather outside at (175,48): no world:unitBlocked within 90 frames; now at (181,49), goal still set; wall cells stood on: 0 | No observed failure; coverage/fixture still matters |
| world.path_gives_up_when_crowded | gaps at (175,33) and (175,41), each held by a unit standing still; TEST_pather from (182,49) sent to (175,37) inside: no give-up within 728 frames (goal still set), 31 steps, now at (173,42); cells inside … | Yes |
| world.faces_eight_ways | 8-row scratch sheet made; steps not facing their direction 0; rows checked 161 (8-row) / 184 (stock) / 180 (rounder, stock), wrong 6: SE: row 3 (want 2) \| SE: row 3 (want 2) \| SE: row 3 (want 2) \| SE: row … | Yes |
| world.no_path_is_true | 0 "no path" give-ups re-tested at that moment with a flood fill over $gameMap.isPassable (out of the cell and into the next, no water): 0 could reach the goal after all;  | Yes |
| worldgen.rivers_count | 0 river(s) (catalog count 1-2) at columns  | No observed failure; coverage/fixture still matters |
| worldgen.kit_per_area | 5 factions; 5 area centre(s), kit within 20 cells, drinkable water within 30: Arar Freehold (128,128): berry_bush 8/8, oak 8/8, rocks_small 10/10, grass_tuft 60/60, reeds 4/4, granite_boulder 4/4, fruit_tr… | Yes |
| worldgen.kit_covers_plan | first stage (hearth, larder, knives, clothes, axe, pick, food, woodpile, shelter, beds, workstone) for 8 founders, the most any of 7 cultures needs, plus 8 meals: log 26, stone 60, fiber 58, straw 16, food… | Yes |
| worldgen.kit_fair | minimums for every area: berry_bush 8, oak 8, rocks_small 10, grass_tuft 60, reeds 4, granite_boulder 4, fruit_tree 1, ore 1-2 of ironstone/copper_outcrop; per area: Arar Freehold: berry_bush 8, oak 8, roc… | Yes |
| worldgen.suite_completed | History: unitAdded listener allocated inside the historical ID range [at chrome-extension://njgcanhfjdabfmnlmpmdedalocpafnhl/js/plugins/DEUS_History.js:536:74 \| at withWorldState (chrome-extension://njgcan… | No observed failure; coverage/fixture still matters |
| biomes.ocean_rim | 14 of 128 cells 2 in from the world edge are ocean (11 %, want >= 60 %) | No observed failure; coverage/fixture still matters |
| biomes.objects_dense | 1727 objects in the start area (want >= 2500); biomes by cells: forest_temperate_conifer 14666, forest_temperate_broadleaf 11326, taiga 10749, marsh_temperate_fresh 8071, ocean_temperate 5950, grassland_te… | No observed failure; coverage/fixture still matters |
| biomes.kit_present | 5 area centre(s), kit within 20 cells, drinkable water within 30: Arar Freehold (128,128): berry_bush 8/8, oak 8/8, rocks_small 10/10, grass_tuft 60/60, reeds 4/4, granite_boulder 4/4, fruit_tree 1/1, ore … | No observed failure; coverage/fixture still matters |
| biomes.camps_cleared | 5 sites in area (0,0): 5 bare camps (want 8), 0 older sites stamped; every bare camp's disc is free of objects | No observed failure; coverage/fixture still matters |
| tiles.tileset_names | A1 Outside_A1, A2 Outside_A2, A5 , B Outside_B, C Outside_C, E UF_GenShade_E | No observed failure; coverage/fixture still matters |
| history.generated_with_world | history version 6, 9 camps, 9 events, founders for 9 factions, seed 1920951434 (22.6 ms) | No observed failure; coverage/fixture still matters |
| history.suite_completed | History: unitAdded listener allocated inside the historical ID range [at chrome-extension://njgcanhfjdabfmnlmpmdedalocpafnhl/js/plugins/DEUS_History.js:536:74 \| at withWorldState (chrome-extension://njgcan… | No observed failure; coverage/fixture still matters |

The handoff's ownership.arena and world.in_area_map failures did not reproduce under this controlled seed/year: ownership checks passed and world.in_area_map passed at map 1000. Density was 1,727, not the handoff's 1,741. Do not substitute the handoff's counts for this session's output.

## Unreached and partial coverage

The current watchdog fired during objects; this suite is partial. Other available suites not entered: `selftest`, `perf`, `native_starting_gear`, `native_survival_dying`, `native_perf_4x_benchmark`, `select`, `natural_connections`, `projects`, `settlement`, `overseer`, `spawn`, `skins`, `walls`, `doors`, `items`, `dig_through_floor`, `jobs`, `floors`, `wildlife`, `wildlife_seeds`, `stance`, `combat`, `anim`, `fog`, `daynight`, `timespeed`, `camera`, `culling`, `speech`, `overhead`, `look`, `sheet`, `talk`, `fire`, `vertical`, `natural_walls`, `flooding`, `strata`, `sparse_outer`, `environment`, `faction_menus`, `title`, `load`, `setup`, `depth`, `layers_flat`. Some available suites are intentionally non-default; availability does not imply that the default run was supposed to select them. The writer must enumerate default registration and complete the required suite coverage before ORG-0.2 can pass. Old controlled run stopped during worldgen.

## Historical Node gate

Command in the untouched 056323db clone: `node tools/ops/run_gate.js --root . --log-dir evidence/codex-phase0-gates`. This commit's gate list has nine suites; the current list additionally has tools/test_control_board.js. Real aggregate output:

```text
LEFTOVER CHECK FAILED: could not list processes
RESULT: 4 passed, 5 failed
```

The process census was denied in the sandbox. All nine suite logs were retained; no clean-process verdict is claimed. The current ten-entry Node gate has not been run by the PM in this session.

- [tools/check_deus_syntax.js](evidence/056323db_gate_tools__check_deus_syntax.js.txt): Checked 61 DEUS plugin files. Errors: 0
- [tools/governance/test_check_claims.js](evidence/056323db_gate_tools__governance__test_check_claims.js.txt): RESULT: 279 passed, 0 failed
- [tools/test_geology_strata.js](evidence/056323db_gate_tools__test_geology_strata.js.txt): # tools/test_geology_strata.js  category=FAIL_API_DRIFT  exit=1  ms=57  decided by api_drift (stderr)
- [tools/test_historical_carrying_capacity.js](evidence/056323db_gate_tools__test_historical_carrying_capacity.js.txt): # tools/test_historical_carrying_capacity.js  category=FAIL_OTHER  exit=1  ms=332  decided by other (stderr)
- [tools/test_history_materialization_and_world_age.js](evidence/056323db_gate_tools__test_history_materialization_and_world_age.js.txt): RESULT: 29 passed, 0 failed
- [tools/test_new_game_year0.js](evidence/056323db_gate_tools__test_new_game_year0.js.txt): # tools/test_new_game_year0.js  category=FAIL_OTHER  exit=1  ms=3152  decided by other (stderr)
- [tools/test_palette.js](evidence/056323db_gate_tools__test_palette.js.txt): See raw output
- [tools/test_strata_cuts_and_caves.js](evidence/056323db_gate_tools__test_strata_cuts_and_caves.js.txt): RESULT: 12 passed, 6 failed (exit 2)
- [tools/test_strata_foundation.js](evidence/056323db_gate_tools__test_strata_foundation.js.txt): RESULT: 18 passed, 8 failed (exit 1) - generation_deterministic, baseline_roundtrip, fills_0_to_5, floor_on_substrate, legacy_shapes_match, surface_elevation_matches, sphere_aoe, unchanged_terrain_regenerates

## Evidence inspected

All 66 generated capture files were inventoried into six test-evidence contact sheets, and all six sheets were opened. One file, current-default-sandbox/harness.on_failure.png, is a three-byte invalid PNG and could not be inspected as an image. The other captures show crowded historical starts, sparse two-colonist current starts with a banner/nearby pond, rainy terrain, walls/path-test rings, trees/wildlife, rock/void borders and a faction ledger. They do not prove a stable playable baseline. Several seam/path captures show a dark or rock-filled view with little visible unit context.

Contact sheets/index: `scratchpad/lane-baseline/screenshot-contact-sheets/`. The controlled current `smoke.map.png` was also opened individually for the final record: two colonists, a red banner and nearby shrubs/rocks are visible. Literal editor F5, F8 console walk-through, title-load profile and z+8/zoom-out profile: NOT RUN.

## Diagnosis and remaining work

Static history identifies 2c23b61b as the change that made WorldGen.riverModels return [] and changed the suite's river list to a literal []; the >=1 assertion remains. This proves an unconditional test failure, not that the replacement hydrology has no rendered rivers. A controlled introducing-commit bisect for the other failures has not been completed. The History unitAdded allocation guard existed before 056323db; exact allocator provenance remains unproved.

ORG-0.2 writer: Claude; reviewer: Grok. All expected-red failures must be corrected on top of 565dc5ae, or each retired test must have explicit Owner sign-off and a written reason. No runtime fix, green tag, determinism golden hash, performance baseline or pillar build has been made. New runtime functions/symbols in this PM report: none; no new game call path exists.

Pre-existing canonical leftovers observed: modified DEUS_WorldGen.js and game/package.json; untracked DEUS_Simulation_Core.js and tools/ops/patch_worldgen.js, patch_worldgen2.js, patch_worldgen3.js. Their owner remains unconfirmed and Codex preserved them. No branch protection, root move, deletion, push or merge is claimed by this report.
