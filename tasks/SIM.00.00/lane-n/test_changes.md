# SIM.00.00 (Lane N): test changes

## Existing tests updated

None. No existing suite, check, fixture or harness was edited. The Levels and World suites run unchanged against the new
in-place switch; their comparison with `main` is below.

## New

- `tools/test_layer_switch_inplace.js`: the Done Tests of the brief as one NW.js suite (`layer_switch_inplace`, written
  as a test-only plugin into a snapshot copy of `game/`), 7 checks, 8 mutants (exact source edits in the snapshot's
  plugin copies), a perf JSON per run, `--ref=<git ref>` to run the same suite on another commit's game files (the main
  bench). Header of the file: checks, mutants, options, exit codes.
- `tasks/SIM.00.00/lane-n/run_existing_suites.js`: runs existing suites on `main` and on the lane tip with the same
  world seed (DEUS_World parameter `Seed` set in each snapshot's `plugins.js`), saves each results file under
  `tasks/SIM.00.00/lane-n/suites/`, and with `--compare` lists every check whose PASS/FAIL differs between the sides.
- `tasks/SIM.00.00/lane-n/perf/summarize.js`: turns the two perf JSONs into `perf/summary.md`.

## Existing Levels / World suites: main vs lane tip (seed 18, 2026-09-26)

Commands (each side and batch in its own foreground run, then the comparison):

```
node tasks/SIM.00.00/lane-n/run_existing_suites.js --sides=main vertical natural_walls flooding strata
node tasks/SIM.00.00/lane-n/run_existing_suites.js --sides=tip vertical natural_walls flooding strata
node tasks/SIM.00.00/lane-n/run_existing_suites.js --sides=main world spawn
node tasks/SIM.00.00/lane-n/run_existing_suites.js --sides=tip world spawn
node tasks/SIM.00.00/lane-n/run_existing_suites.js --compare vertical natural_walls flooding strata world spawn
```

| suite | main (RESULT line) | lane tip (RESULT line) |
|---|---|---|
| vertical | 7 passed, 4 failed (exit 1) | 7 passed, 4 failed (exit 1) |
| natural_walls | 6 passed, 0 failed (exit 0) | 6 passed, 0 failed (exit 0) |
| flooding | 8 passed, 0 failed (exit 0) | 8 passed, 0 failed (exit 0) |
| strata | 6 passed, 0 failed (exit 0) | 6 passed, 0 failed (exit 0) |
| world | 24 passed, 6 failed (exit 1) | 24 passed, 6 failed (exit 1) |
| spawn | 4 passed, 2 failed (exit 1) | 4 passed, 2 failed (exit 1) |

`--compare`: "Checks that differ between main and tip: none" (exit 0). The failures are the same checks on both sides and
fail on `main` without this lane: vertical `underground_biomes`, `offscreen_state` (wolves on blocked cells), `save_size`
(6.7 MB of JSON against the 3 MB limit), `surface_migration` (hash of the pre-V80 fixture); world `path_blocked_fast`,
`path_gives_up_when_crowded`, `faces_eight_ways`, `no_corner_cut`, `no_path_is_true`, `frame_cost`; spawn
`all_units_on_standable_cells`, `after_play`. Earlier main runs with random seeds (before any lane change) also failed
vertical `offscreen_state`, `save_size`, `surface_migration`, world `path_blocked_fast`, `path_gives_up_when_crowded`,
`faces_eight_ways`, `no_path_is_true`, `frame_cost` and spawn `all_units_on_standable_cells`, `after_play`.

The existing vertical suite now drives the in-place switch through its own key presses: `switch_view` and `follow_view`
pass on the tip, and its `switch_time` reports ground -> -1 24 ms / -1 -> ground 23 ms, 0 map frames, builds reused
(main in the same seed: 463 ms / 136 ms, 1 map frame, the -1 build made during the switch).

These suite runs used commit b4f89753's plugin code; 7fab34b1 then added the `fogMs` field to `lastSwitch` and changed a
comment in DEUS_Levels.js. The vertical suite was run again on 7fab34b1 (`--sides=tip vertical`): 7 passed, 4 failed
(exit 1), the same four checks as main; `--compare` over all six suites again reports no differing check (exit 0);
`switch_time` 22 ms / 24 ms. `suites/tip_vertical.txt` is that final run.

## Known weaknesses of existing tests (not changed: outside this lane's code paths)

- The vertical suite's persistence check waits for `settled() && $gameMap.mapId() === ...` after `SceneManager.goto`; that
  can resolve on the old Scene_Map while it fades out, before the loaded game's scene exists. The new suite waits for a
  new Scene_Map instance instead (the flaw showed up in its first draft).
- The vertical suite's comment "An unhandled rejection is recorded by UF_Test without stopping the game" is out of date:
  RMMZ's `SceneManager.onReject` stops the game on an unhandled rejection too (seen 2026-09-26 with the first draft of the
  `error_injected` mutant). A thrown error or rejection during a suite ends it as `suite_completed` FAIL.
