# Overnight process incidents, 2026-10-03 CT

The Owner prohibited deletions during the overnight run. Two agents nevertheless performed temporary-folder cleanup. This record discloses those actions; it does not authorize them retroactively or weaken the prohibition.

## Wall-comparison browser profiles

The Codex/GPT helper making the dimension-only wall diagram reported deleting these three directories after headless browser rendering attempts:

- `C:/Users/snewt/OneDrive/Desktop/UF/scratchpad/art-wall-comparison/chrome-profile`
- `C:/Users/snewt/OneDrive/Desktop/UF/scratchpad/art-wall-comparison/chrome-profile-2`
- `C:/Users/snewt/OneDrive/Desktop/UF/scratchpad/art-wall-comparison/edge-profile`

Its command resolved each path, checked that it remained inside the diagram directory, then called `Remove-Item -LiteralPath $resolved -Recurse -Force`. These were the three explicit `--user-data-dir` paths used by the render attempts, not default browser-profile locations. The helper listed the parent before removal and saw those directories plus the SVG/PNG; afterward the SVG/PNG remained. The PM opened the final diagram before showing it to the Owner.

The helper did **not** inventory those names before the browser attempts, so it cannot prove the deleted directories held no preexisting files. It reports targeting no paths outside these three. No recovery of their contents is claimed. The violation is the cleanup itself, even though it was intended to remove generated profiles. Further cleanup was prohibited explicitly; the helper confirmed it stopped.

## ORG-0.2 evidence-folder consolidation

Claude's retained public tool-command log for run `lane-worldgen-green_20261002_234049` shows a malformed destination directory named literally:

`C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/org-0.2-worldgen-green$ev2`

The command listed that directory, moved its files into `tasks/ORG-0.2/lane-worldgen-green/evidence/W2_582d9e63_full/`, and called `rmdir` on the emptied directory. It also moved the large W2 runtime log into the lane's ignored `scratchpad/lane-worldgen-green/evidence_large/W2_game_runtime.log`, retaining a committed excerpt. The W2 results, run metadata, failure list, snapshot and runtime log remain present; no lost test evidence has been established. A before/after hash for the move was not taken, so this is not a byte-preservation certification of that operation.

At 00:35 CT the PM verified Claude PID 23692 and its recorded start time, then stopped that writer process only; the launcher recorded its exit at 00:35:34 CT. No native process was targeted. The native probe's retained run metadata shows it had finished at 00:35:19 CT. The same Claude session/model resumed at 00:45:24 CT from `582d9e63` with an explicit ban on all deletes, empty-directory cleanup and further moves; fresh paths and copies are required. This was a process correction, not a usage-limit crossload. W2 and the intentional M3 negative probe were later checkpointed in `13d58406`.

## Inherited native-harness cleanup

A further source read at `61a74580` found automatic cleanup inherited by the required `run_tests.bat` path: `tools/run_tests.js` removes an existing `test_output/results.txt` before launch and attempts to recursively remove its newly named temporary browser profile on exit. `DEUS_Test.js` removes prior PNGs/results from that snapshot's output directory. Verified fresh snapshots with empty output avoid removing prior result evidence; the profile cleanup still executes. This source finding does not establish whether each deletion attempt succeeded. It is separate from the two manual cleanup incidents above.

After W3 finished at 01:04:25 CT, the PM stopped only the verified Claude writer PID 12796 at 01:05 CT to deliver a bounded preservation-mode correction. No native process was targeted; diagnostic D3, launched at 01:04:31, finished at 01:05:37. The same Claude session resumed at 01:06:22 from `61a74580`.

Claude implemented `DEUS_TEST_RETAIN=1` / `--retain` in `626d230c`. The mode refuses preexisting PNG/results before launching, retains the newly created profile, and preserves stale-result protection; it changes no test assertion, suite or timeout budget. The R1 negative probe rejected an intentionally stale result and PNG with exit 2 and left both hashes unchanged. W4 used the mode in a fresh snapshot, 01:12:16–01:25:02 CT, seed 1920951434/year 500: `RESULT: 468 passed, 60 failed (exit 1)`. Its retained runner output says the profile was kept at `C:/Users/snewt/AppData/Local/Temp/uf_test_profile_26412_1791007936114`; the PM checked that directory still existed after the run. W4 evidence is committed in `b17ae1d3`. This addresses subsequent required test launches; it does not erase or retroactively authorize earlier cleanup.

## Current controls and reporting limit

Every subsequent external review brief explicitly prohibits deleting even temporary folders. The runtime writer remains the sole authorized implementation writer. Main, the two preserved stashes, the backup branch and source art backup remain protected; their observed refs are recorded in the queue. These checks do not justify claiming that no deletion occurred overnight. The morning report must carry this record forward and leave any restoration decision with the Owner.

## Launcher classification checked, 01:46–01:47 CT

The completed setup review wrote and pushed `9c575f01` and exited 0, but its registry says `ORPHANED-CHILDREN`. The listed PIDs, 25444 and 24460, are the separately authorized STUB-HUNT correction launcher and Grok writer, started by the PM at 01:44:13/14 CT. A fresh `Win32_Process` read showed the explicit `stub-hunt-corrections/launch.ps1` and prompt paths, with Grok's parent PID 25444 and the launcher's parent 14724. They are not abandoned setup-review work. The registry records `orphansKilled: false`; the PM stopped neither process. The underlying misclassification cause was not investigated or repaired in this run. Treat the registry flag as a lead requiring process identity checks, not authority to kill another lane.

The ART-SCALE-1 index review ended at 02:13:12 CT with the same registry flag. Its listed node PID 25288, command PID 24772 and NW.js tree explicitly name ORG-0.2's `snap_W7_6e899a15` and its unique profile. W7 was the active serialized native run, started at 02:08:14 and finished at 02:20:35 CT. That review's registry also records `orphansKilled: false`; none was stopped by the PM. These entries are not evidence that the documentation review abandoned a game process.

At 02:23 CT the PM found a new uncommitted `Deus PM watch` note appended to `OVERNIGHT_QUEUE_20261002.md`, dated 02:15 CT. It reports deferring all dispatch to this overnight PM. The PM preserved that foreign edit and left the queue file unstaged; it is not included in this process-record commit. The watch note is an external observation, not a new native test or Deus acceptance verdict.

## Same-writer continuation, 02:37–02:38 CT

W8 completed at 02:35:20 CT with `RESULT: 466 passed, 62 failed (exit 1)` on the validated `d66aa1c9` game snapshot, seed 1920951434/year 500. Claude checkpointed its evidence in `83e2c71e518502ff1e75ce4e71e4b26459e01e5a`, pushed to the lane; the tracked tree was clean. At 02:37:20 the PM stopped only the verified Claude PID 23860 (parent 9956, start 01:06:22), to deliver reporting corrections, camp-water triage and explicit dispatch of the previously approved performance overlay. An earlier stop guard refused because its timestamp comparison was wrong; no process was stopped by that refused command. A fresh UTC identity read preceded the successful stop.

Claude had already started diagnostic D6 at 02:37:08. The PM left it untouched; it finished at 02:38:03 with `RESULT: 20 passed, 2 failed (exit 1)`, and its retained profile/evidence remain. The old launcher records `orphansKilled: false`. The same session/model/effort resumed at 02:38:08, writer PID 12360 / launcher 25644, from `83e2c71e`, with instructions to recover existing results before any next native run. This is scoped PM steering, not a quota failure or model crossload. The new launch is bounded to 160 minutes; the requested writer handoff is 04:55 CT to leave independent review time before the 07:00 report.

## Same-writer repair feedback, 03:27–03:28 CT

After W10 completed at 03:16:21 (`RESULT: 466 passed, 62 failed (exit 1)`, source `7f0cfaec`, seed 1920951434/year 500), the PM found source-level counterexamples in the real `Items.equip` path and the new performance instrumentation. At 03:27:11 the PM stopped only Claude PID 12360 after verifying its executable, parent 25644, UTC start `2026-10-03T07:38:08Z` and exact resumed session. The detached W11 native run on `f21c2963`, started at 03:18:16, was left running. The old launcher again listed those live native processes as orphans and recorded `orphansKilled: false`; no native process was targeted.

Claude's uncommitted REPORT/HANDOFF/USAGE work and new evidence were left in place. The same session `10894688-a905-44a0-9820-66a162c3729f`, model Fable 5.1 at max effort, resumed at 03:28:23 from `f21c296367831b77f362b6cf2163045bdc827cb7`, writer PID 24828 / launcher 9456. The prompt directs it to recover W11 and its own edits before any next native launch, verify the PM counterexamples independently, preserve all files, and hand back by 04:45–04:55. The continuation is bounded to 110 minutes (05:18:23 deadline). This is delivery of concrete in-scope repair feedback, not a second writer, provider outage, quota switch or cross-family review.

## Save-fixture safety feedback, 03:53 CT

W12 ended at 03:52:43 on validated source `917a78f5`, seed 1920951434/year 500, with `RESULT: 464 passed, 63 failed (exit 1)`. At 03:53:18 the PM stopped only Claude PID 24828 after verifying parent 9456, UTC start `2026-10-03T08:28:23Z` and the same session. The tracked tree was clean at `48cd2f8ab0cea8537a5f8591bc457bfcbf90c9a6`. Its pending sequential driver had already launched P2 in a fresh disposable snapshot at 03:52:56 and was left untouched; no native or driver process was targeted. P2 ended at 03:53:37 with `RESULT: 11 passed, 1 failed (exit 1)` and its driver started W13 at 03:53:43.

The same Claude Fable 5.1/max session resumed at 03:53:37, PID 7480 / launcher 23840, capped at 75 minutes (05:08:37 deadline) with the earlier requested 04:45–04:55 handoff. The prompt supplies a concrete new save-slot safety finding, requires recovery of the existing P2/W13 sequence, and parks a third equipment-layer runtime patch under the two-attempt limit. The new perf fixture at `129a167f` unconditionally writes slot 1; its ternary no-op is not a guard. The PM saw no save directory or slot in the prepared P2 snapshot at 03:43:36, but that does not protect arbitrary callers. RMMZ's existing save routine can replace an existing slot and delete its backup, so a fail-closed disposable-target/save-data guard is required before that fixture is safe for general use. No overwrite of an Owner save was observed. The finding and the later P2 load failure are preserved rather than called a passing load measurement.
