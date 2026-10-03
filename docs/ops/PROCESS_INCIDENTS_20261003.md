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
