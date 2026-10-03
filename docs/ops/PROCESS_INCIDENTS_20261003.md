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

## Current controls and reporting limit

Every subsequent external review brief explicitly prohibits deleting even temporary folders. The runtime writer remains the sole authorized implementation writer. Main, the two preserved stashes, the backup branch and source art backup remain protected; their observed refs are recorded in the queue. These checks do not justify claiming that no deletion occurred overnight. The morning report must carry this record forward and leave any restoration decision with the Owner.
