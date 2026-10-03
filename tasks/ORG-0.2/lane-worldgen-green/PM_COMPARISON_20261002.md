# PM controlled comparison and count reconciliation

Recorded 2026-10-02 by Codex/GPT. Runtime writer: Claude; assigned independent reviewer: Grok, queued after STUB-HUNT. Deus verdict: NOT ISSUED. This is a red checkpoint, not lane acceptance.

## Exact baseline protocol rerun

The original protocol is docs/baseline/BASELINE_565dc5ae.md in the lane-baseline worktree, documentation commit 249a5a27. Fresh disposable snapshots include game/, tools/ and run_tests.bat from each exact SHA. Only DEUS_World.parameters.Seed in the disposable game/js/plugins.js is overridden to 1920951434, as in the original protocol. No main checkout switch or mutation. No suite flag or Z-range override. From each snapshot root:

```powershell
$env:DEUS_TEST_YEAR = '500'
.\run_tests.bat
```

| Source | CT start/end | Raw RESULT | Last entered suite | Last completed check before watchdog |
|---|---|---|---|---|
| 565dc5ae, original recorded run | 18:54:26 start | 118 passed, 19 failed (exit 2) | objects | see original baseline evidence |
| 565dc5aead7e068230528d573c395ea21ed5cf5d, fresh | 21:41:07-21:44:09 | 157 passed, 25 failed (exit 2) | jobs (14 suites entered) | jobs.describe_text |
| 997528e2834f7dd83b97ea75ca4dd29a57f89af9, fresh | 21:44:09-21:47:10 | 224 passed, 15 failed (exit 2) | biomes (7 suites entered) | biomes.deterministic |
| 248fc691, Claude F1 | 21:20:01-21:23:03 | 244 passed, 16 failed (exit 2) | ground (9 suites entered) | ground.diag_seam |
| 093a1f41, Claude F2, river adapter | 21:34:58-21:37:59 | 243 passed, 17 failed (exit 2) | ground (9 suites entered) | see F2 evidence |

F1/F2 ran the same native runner through its supported --game snapshot argument. The matched fresh comparison above uses the exact baseline command without --game. The game/ tree at 248fc691 and 997528e2 is identical (`git diff --name-only 248fc691 997528e2 -- game` is empty).

Raw comparison evidence is preserved in C:/Users/snewt/.deus_worktrees/org-setup/scratchpad/org-setup-review/native_comparison_565dc5ae/ and native_comparison_997528e2/: run.txt, stdout.txt, stderr.txt, results.txt, screenshots/. A copy of run/results text is committed beside this report in evidence/PM_comparison/.

## Why totals differ

The counts are executed assertions, not a fixed-size list of unique tests. DEUS_Test.js:280-310 builds rendered event-name groups and calls t.check(event_drawn.<name>) once per visible group. Smoke has 7 PASS before the fix and 150 afterward: 2 versus 145 event-group assertions, plus five other smoke checks. The allocation repair materializes 145 colonists instead of the fallback two. This alone adds 143 assertions.

The runner and harness blobs are identical between 565dc5ae and 997528e2:

| File | Git blob |
|---|---|
| run_tests.bat | ca2addac274bef7fdbf2c8cd50ce619845041195 |
| tools/run_tests.js | 5bd3fbc7f4bafbab1877f6154629ddff174728cc |
| game/js/plugins/DEUS_Test.js | d843a827180d6b9a20092bb9a21db4688d9899f2 |

No different default suite selection, runner revision, timeout change or assertion weakening explains the totals. Coverage differs before the wall-clock cutoff; timing-sensitive checks also vary. The original baseline ran alongside Node gate work, while the fresh native runs had an exclusive NW.js slot. The exact contribution of machine scheduling/background workload has not been isolated. Same source and seed do not produce a stable assertion total under this incomplete protocol.

Per-suite assertions through the first RESULT only (PASS/FAIL):

| Suite | Original 565dc5ae | F1 248fc691 | Fresh 565dc5ae | Fresh 997528e2 |
|---|---|---|---|---|
| smoke | 7/0 | 150/0 | 7/0 | 150/0 |
| ownership | 9/0 | 9/0 | 9/0 | 8/1 |
| ecology | 10/2 | 10/2 | 10/2 | 11/1 |
| colonists | 4/1 | 5/0 | 4/1 | 5/0 |
| world | 26/4 | 26/4 | 26/4 | 26/4 |
| worldgen | 13/5 | 17/5 | 13/5 | 17/5 |
| biomes | 8/4 | 8/4 | 8/4 | 7/4 |
| tiles | 10/1 | 10/1 | 10/1 | not reached |
| ground | 10/0 | 9/0 | 10/0 | not reached |
| factions | 17/0 | not reached | 17/0 | not reached |
| history | 0/2 | not reached | 0/2 | not reached |
| objects | 4/0 | not reached | 14/3 | not reached |
| items | not reached | not reached | 18/2 | not reached |
| jobs | not reached | not reached | 11/1 | not reached |

The fresh baseline log contains one PASS and one FAIL after RESULT during the 200 ms delayed exit; they are preserved but excluded from the reported 157/25. Counting every PASS/FAIL line in the file would misstate the harness result.

## The 16 failures requested: F1 on 248fc691

1. ecology.renewable_timer
2. ecology.bounded_work
3. world.path_blocked_fast
4. world.path_gives_up_when_crowded
5. world.faces_eight_ways
6. world.no_path_is_true
7. worldgen.rivers_count
8. worldgen.kit_per_area
9. worldgen.kit_covers_plan
10. worldgen.kit_fair
11. worldgen.autotile_shapes
12. biomes.ocean_rim
13. biomes.objects_dense
14. biomes.kit_present
15. biomes.camps_cleared
16. tiles.tileset_names

The fresh 997528e2 run has 15 failures: add ownership.exhausted_uses_owned_bed; ecology.bounded_work passes this time; tiles.tileset_names is not reached. These are not three resolved defects.

## Watchdog details

DEUS_Test.js:234 sets `setTimeout(() => finish(2, "watchdog: whole run took longer than 180 s"), 180000)`. It is a GLOBAL whole-run timer, not a timeout assigned to one named test. The log says Scene_Map and shows the last completed check (table above); it does not name the currently pending async operation. F1 was in ground, fresh 565dc5ae in jobs, fresh 997528e2 in biomes.

A separate map-start wait at DEUS_Test.js:214 is also 180000 ms. The outer Node process timeout is 240000 ms (tools/run_tests.js:14,48-51). Neither fired in these runs. No timeout was altered. Exit 2 means incomplete/failed coverage, not a green run.

## Progress (a)-(f) and evidence limitations

- (a): Pure faction lookup at 248fc691 removes the observed New Game allocation re-entry; 145 colonists and no allocation error in F1/F2/fresh 997528e2. History's own suite remains unreached post-fix. Partial, review pending.
- (b): Early NW.js exit before RESULT was not reproduced by the controlled runs. The global watchdog is reproduced. Cause of the earlier unrestricted exits remains unknown.
- (c): 093a1f41 reads the actual carved hydrology network; rivers_count passes with two rivers. Unchanged river_not_through_start fails with NaN row distances and river_continuous fails with 465 dry-row breaks. Source-to-sea courses do not cross every row. PROPOSAL_river_checks.md is a proposal only; no assertion changes are authorized/applied. Independent review and Owner contract decision remain.
- (d): Density still red (F2 1706 versus minimum 2500); untouched.
- (e): Camps still red (5 versus 8); untouched.
- (f): Kit, ecology, pathfinding, animation-row, autotile, ocean-rim and tileset failures remain; coverage after watchdog unknown. Area-map and arena failure claims did not reproduce under this seed. No green acceptance or merge.

All comparison captures were opened in contact sheets: the old source has two colonists/banner amid grass, rain, bushes and rock; the repaired source shows a large rectangular crowd around the banner. Path/seam captures include rock-filled or dark views with little unit context. This does not prove playability. No editor F5 or F8 walkthrough, no fresh-process save/load, and no Deus laptop verdict.

## Main provenance and recovery

Main remains 038a02c35922df825fd7d47d948d7747d4e56755, parent 565dc5ae, not at 565dc5ae. It was authored/committed by deus-pm at 2026-10-02 20:59:51 CT, subject [codex] Record depth presentation after world-load green. Its 13 added lines are docs/STATUS.md (4) and docs/VISION.md (9): queued depth presentation decisions, no runtime edits. The prior Codex session log shows Codex checked out main, selectively staged these docs to preserve other changes, and used the task-end commit rule instead of a lane and PR. This was a workflow error; there is no runtime reason for direct main integration. Main was not reverted or rewritten. No further direct main commits are authorized.

Restart recovery found no uncommitted tracked ORG-0.2 code; 12 valid R0/D1 evidence files were committed at 4811cda0. On-disk snapshots/logs survived. No known on-disk loss; unsaved process state cannot be recovered or certified. Main's pre-existing dirty files were preserved. Stash 0 remains 2005b4d9 (unowned-gemini-leftovers-2026-10-02), stash 1 remains 4699f7b2, and backup/pre-rollback-gemini-swarm-2026-10-02 remains 3c6e2bba.
