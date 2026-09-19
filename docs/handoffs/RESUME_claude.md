# Resume: Claude Code's paused work (stopped 2026-09-19, about 15:10, before the session limit)

The game boots and plays at the checkpoint commit `ad04828`. On a fresh copy of `game/`, every plugin passed `node --check`. The suites gave smoke 13/13, world 29/29, stance 22/22 and anim 9/10 (pooled_and_perf: 21 death sprites at once, limit 20). New Game through the title screen reached the map with 8 colonists and no error. F5 Playtest was not checked.

## Paused jobs
Each job is a Claude Code workflow. It resumes from where it stopped with `Workflow({ scriptPath: "<file>", resumeFromRunId: "<run>" })` from the project root. The script copies are git-ignored dot files in the project root. Finished agents replay from cache; only unfinished ones run again. The "state" column says what was known when the jobs stopped.

| Job (VISION) | Script, run | State |
|---|---|---|
| Five levels, slices 1-2 (V80) | `.vertical_resume.js`, `wf_fdaae6fb-ce3` | Plan and placeholder assets done (`VERTICAL_BUILD_PLAN.md`, `HANDOFF_vertical.md`). Slice 1 build was in its snapshot; `UF_Levels.js` has not landed. |
| DF mechanics (V74-V77, V84, V85) | `.df_wave_resume.js`, `wf_4c4b3d12-7fb` | Gap map and designs done. `UF_Ecology.js` landed (not registered). Remains and tech builds were in progress; work timing not started. |
| Drag selection (V86) | `.select_resume.js`, `wf_3c562c19-aaa` | Design done (`SELECTION.md`); build in progress; `UF_Select.js` not landed. |
| Eleven peoples (V87) | `.peoples_resume.js`, `wf_7b200811-e8c` | Design and name proposals done (`PEOPLES.md`); critic or build in progress. |
| Carry and combat sprites (V89) | `.carry_resume.js`, `wf_34471b1c-5a0` | Carry step landed (profile shows the load; no carry pose). Combat pass in progress. |
| Drag-drop and terrain designs (V90, V91) | `.designs_resume.js`, `wf_d23fbca3-b39` | `DRAG_DROP.md` and `TERRAIN_LEVELS.md` written; critics may be unfinished. |
| 8-way movement (V3) | `.eightway_resume.js`, `wf_960d62ba-cba` | Build landed (UF_World, UF_Movement8D, UF_Anim, UF_Jobs); review and fix not run. |
| Rolling ground colours (V93) | `.ground_resume.js`, `wf_a08fa535-420` | Design done (`GROUND_SHADES.md`); build in progress. |
| Personality (V94) | `.personality_resume.js`, `wf_1b9dea90-d2c` | Design done (`PERSONALITY.md`); build in progress. |
| HP, tools, yields design (V95-V98) | `.durability_resume.js`, `wf_be146887-6e3` | `DURABILITY.md` written; critic may be unfinished. |
| Circle markers (V32) | `.markers_resume.js`, `wf_5d20ea78-7a0` | Build landed (filled circles, selection ring); review not run. |
| Skins and face styles (V99, V100) | `.skins_resume.js`, `wf_8ff7383d-07d` | Build landed in UF_Factions, UF_Talk, UF_Sheet; review not run. |
| Sliding units (bug) | `.sliding_resume.js`, `wf_f48ca742-ca9` | Diagnosis was in progress; nothing landed. |
| One global tick design (V101, V102) | `.tick_resume.js`, `wf_954ea8bb-5c9` | Audit or design in progress; `GLOBAL_TICK.md` may not exist yet. |
| World density (V103) | `.density_build_resume.js`, `wf_8ffb0db8-059` | Design in progress; nothing landed. |

## Queued, not started
- One global tick build (V101, V102), after the jobs above land. It includes one attack per tick and movement on the tick.
- The stacked-terrain build (V91), after five-level slices 1-2.
- Drag-and-drop build (V90), after UF_Select lands.
- Classes and abilities build (V88; `CLASSES.md`, `ABILITIES.md`), after UF_Tech lands.
- The durability build (V95-V98), after work timing.
- Bands, society and daily life, then the chain of command (V51, V52).
- Register new plugins in `plugins.js` once each lands and passes. The editor must be closed, or the user must be told to reopen the project. `UF_Ecology.js` is on disk but not registered.
- Move the unlock text of level-ups from over heads to the profile once the tech build lands (V92).

## Waiting on the user
- Rank-name sets (`CHAIN_OF_COMMAND.md` §10) and the chain-of-command questions (§9).
- Names for the new peoples (`PEOPLES.md`), the class and ability names (`CLASSES.md`, `ABILITIES.md`), the crafting proposals P1-P20 (`CRAFTING.md`) and the theme brief (`THEME.md`).
- Audit A5: remove Gemini's 12 unprefixed U7-derived images from git (and purge history or not); whether Gemini may keep art tools in `tools/`.
- DF-style injuries on top of hitpoints, or hitpoints only.
- The meadow style anchor: keep or redraw.
