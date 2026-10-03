# DISPLAY-16x9 parked-plan review — Claude Fable 5.1

VERDICT: PASS (report-level). Two MINOR wording imprecisions and one advisory note; none changes the Owner scope, ordering, staffing, freeze, or evidence conditions, and none blocks the filing. A one-line correction pass is recommended, not required.

| Field | Value |
|---|---|
| Reviewer | Claude Fable 5.1 (`claude-fable-5-1`, Anthropic). Independent cross-family reviewer. Not the writer. Launched 2026-10-03 07:25:27 CT by `tools/ops/launch_worker.ps1` as provider `claude`, role `reviewer` (`scratchpad/display-16x9-plan/review_workers.json`, run `display-16x9-plan_20261003_072527`). |
| Writer | Grok 4.7 at xhigh (xAI), per `scratchpad/display-16x9-plan/writer_workers.json` and `launch_writer.ps1` (`--model grok-4.7 --reasoning-effort xhigh`): exit 0, `newCommits` 1, `outOfScope` empty, `headCommit` e3f6a703. Commit identity `deus-grok <deus-grok@local.invalid>`, subject `[grok] File parked DISPLAY-16x9 plan ahead of DATA-RNG`. |
| Reviewed SHA | `e3f6a703e8afc1fbf4816c6f7babc8c06b66317a` |
| Base / parent | `60d6456dda4f2f714ec944db22d1d34b11a945f3` (`[grok] CORE/DATA docs re-review 25ac0cfa (VERDICT: CLEAN PASS)`) |
| Source authority cited by the stub | `038a02c3` (local `main`, `[codex] Record depth presentation after world-load green`) |
| Branch | `task/display-16x9-plan` |
| Worktree | `C:\Users\snewt\OneDrive\Desktop\UF\.deus_worktrees\display-16x9-plan` |
| Review date | 2026-10-03 |
| Working tree at review start | Clean (`git status --porcelain` empty). `docs/STATUS.md` equals HEAD; its SHA-256 equals the `beforeSha256` in `scratchpad/display-16x9-plan/pm_claim.json`, so the PM's temporary claim was already removed before this review began. Nothing was touched. |

This review covers the documentation delta `60d6456d..e3f6a703` only. It does not certify a native test run, a screenshot, a Deus laptop check, an implementation, or a runtime change. The stubs stay PARKED. A provider exit 0 is not a verdict; the verdict below comes from the diff and the source checks recorded here.

## Scope and controlling limits

Controlling limits, from `AGENTS.md`, `.agents/rules/deus-governance.md`, `.agents/rules/deus-review-policy.md`, `scratchpad/display-16x9-plan/BRIEF.md`, and `lane.json`: review only `docs/plans/core-tech/DISPLAY-16x9.md`, `README.md`, and `DATA-INSPECT.md`; write only this file; no edit of writer files; no runtime, data, test, art, or `System.json` change; no baseline image update; no native, benchmark, or screenshot run; no provider or subagent launch; no merge, main, force, rebase, delete, move, or cleanup; no edit of the PM-owned STATUS claim. Explicit own-file staging, per-command Claude identity, normal push of `task/display-16x9-plan` only.

Not reviewed here: the README paragraphs this delta does not touch (`DEUS_World.findPath`, `DEUS_Movement8D.js`, `DEUS_FlowFields.js`); they were reviewed by Grok at `60d6456d` and are inherited. The overnight MORNING_REPORT and provider-usage records are not part of this filing. No GAME TRANSLATION block is required: the diff touches nothing under `game/` (DEC-085 item 5 and DEC-087 item 7 scope in `.agents/rules/deus-game-translation.md`), and the BRIEF says the same.

## Commit boundary

Commands run in this worktree (Git Bash), outputs trimmed:

```text
$ git diff --stat 60d6456d e3f6a703
 docs/plans/core-tech/DATA-INSPECT.md |  2 +-
 docs/plans/core-tech/DISPLAY-16x9.md | 57 ++++++++++++++++++++++++++++++++++++
 docs/plans/core-tech/README.md       | 29 +++++++++---------
 3 files changed, 73 insertions(+), 15 deletions(-)

$ git diff --name-status 60d6456d e3f6a703 -- game/ art/ tools/ PROVIDER_USAGE_STATUS.json
(empty)

$ git diff --name-status 038a02c3 e3f6a703 -- game/ art/ tools/ PROVIDER_USAGE_STATUS.json
(empty)

$ git diff --quiet 038a02c3 e3f6a703 -- game/data/System.json && echo identical
identical

$ git diff --check 60d6456d e3f6a703
(no whitespace errors)

$ git ls-files --eol docs/plans/core-tech/
(all 15 files i/lf w/lf)
```

The delta is exactly the three whitelisted paths. `game/js/libs/`, `game/js/rmmz_*.js`, `game/js/main.js`, `game/data/System.json`, `art/sprites/`, `tools/`, and `PROVIDER_USAGE_STATUS.json` are byte-identical from the cited source authority `038a02c3` through the writer tip. The plan is documentation, not a runtime activation.

## Owner conditions (BRIEF) against the stub

| Owner condition | Where the stub records it | Check |
|---|---|---|
| Docs filing only; runtime PARKED until ORG-0.2 green and WORLD-3x3 complete | `DISPLAY-16x9.md` Status line; README Status line; "Not started. Every evidence item below is pending."; "Limits of this page" | Present. No claim of a pass count, screenshot, or playtest. |
| DISPLAY immediately after WORLD-3x3, ahead of DATA-RNG, before further visual baselines | README Status sentence; README table row 1 (DISPLAY) under "Order after WORLD-3x3", DATA-RNG at row 2; `DISPLAY-16x9.md` Status line | Present. Rows 2-13 are the former 1-12 in the same relative order (diff read line by line). |
| Staffing: Grok writer / Claude reviewer now and for the future runtime lane | `DISPLAY-16x9.md` Status line; README row 1 "Grok / Claude" | Present. Matches the launch records and the commit author. |
| DATA-INSPECT early/parallel exception kept behind the display gate; README and DATA-INSPECT agree | README: "only behind the DISPLAY-16x9 baseline gate ... That gate waits on ORG-0.2 green and a completed WORLD-3x3." DATA-INSPECT: "only behind the DISPLAY-16x9 baseline gate in that sequence, and only for an idle non-overlapping writer." | Agree. Both drop the former "only after ORG-0.2 green" wording in favour of the display gate; README states what the gate waits on, DATA-INSPECT links to it. |
| 1. Only four `System.json` values become 1920/1080/1920/1080; all other bytes unchanged; valid RMMZ JSON | Future behavior item 1; Acceptance bullet 1 | Present. `screenScale` and `tileSize` named as untouched. `game/package.json` 816/624 surfaced for a ruling rather than folded in. |
| 2. Replace all 816/624 display fallbacks with live `Graphics` values; no magic-number substitute; end report lists the literal search, every file changed, in-scope confirmation; unrelated matches classified and surfaced | Item 2; Acceptance bullet 2; "Tools and docs contain further matches. This page does not give those a total, and it does not treat them as cleared." | Present. No zero-literal claim. |
| 3. Integer outer scale, nearest neighbour, no smoothing, 1x at 1080p, 2x at 4K, letterbox otherwise; distinct from world zoom 0.5/1/2 | Item 3; "World zoom is a different control" paragraph; Acceptance bullet 3 | Present. Outer scale (`_realScale`, `screenScale`, `adjustWindow`) separated from the logical tilemap extent (`DEUS_Camera.js:219-220`). |
| Below-base display: flag the boundary for an implementation-time policy; invent no fractional scaling or cropping | Item 4; Acceptance bullet 3 ("a written below-base policy before fit code") | Present and flagged, not chosen. |
| 4. Camera/culling counts at 0.5/1/2 on 48 px tiles; 80x45, 40x22.5, 20x11.25 as theoretical targets; UI-obscured viewport verified separately; same-seed before/after overlay at 1x start area, seed 1920951434, year 500, same machine/run method/content/camera, named SHA; no invented measurements | Item 5; Acceptance bullet 4 | Present. Arithmetic checked: 1920/48 = 40, 1080/48 = 22.5; doubled at 0.5 and halved at 2. The stub labels them "targets. They are not measurements from this filing." See F3 for the one advisory. |
| 5. Edge-anchor menus, HUD, action bar, inventory/containers, main windows; opened screenshot of each plus 1x and 2x map views | Item 6; Acceptance bullet 5 | Present. |
| 6. Fixed-coordinate tests become Graphics-relative, checks preserved; screenshots re-recorded once, prior evidence retained; native `run_tests.bat` green at the same starting pass count plus the explicitly updated coordinate tests; ids and counts recorded; dynamic visible-unit counts do not weaken the gate or drop asserts | Item 7; Acceptance bullet 6 | Present. "They do not relax the gate or drop asserts." |
| Engine-core protection, `art/sprites/`, `PROVIDER_USAGE_STATUS.json` untouched now and in the future lane | Item 3; consumers paragraph | Present. |
| Queued fullscreen/camera/culling work taken by explicit ownership; DEC-037 still applies | Consumers paragraph | Present. DEC-037 exists at `docs/OWNER_DECISIONS.md:547`. |
| Reference format: Why the player cares; named future consumers; acceptance/report checklist; current source baseline; limitations; planned vs observed kept distinct | Sections "Why the player cares", "What main `038a02c3` does now", "Owner-approved future behavior" (consumers paragraph), "Acceptance still pending", "Limits of this page" | Present. Shape matches `CORE-PQ.md` and `DATA-INSPECT.md`. |
| Closure later needs green native counts, cross-family review, Deus laptop confirmation, Owner gate | Acceptance bullet 6 | Present. |

## Source facts in the stub, checked directly against `038a02c3`

Every read below is `git show 038a02c3:<path>` or `git grep ... 038a02c3 -- game/js/plugins`, run in this worktree. The canonical helper `scratchpad/display-16x9-plan/SOURCE_INVENTORY.md` exists in the main checkout (absent from this worktree's scratchpad); it was read as assistance only after these checks.

| Stub claim | Source read | Result |
|---|---|---|
| `System.json` is one line ending in a newline; `advanced.screenWidth`/`uiAreaWidth` 816, `screenHeight`/`uiAreaHeight` 624, `screenScale` 1, `tileSize` 48 | `wc -l` = 1, last byte `\n`, 6588 bytes; `JSON.parse` of the blob | Values confirmed. `tileSize` is a top-level key of the file's root object, not a member of `advanced` (see F1). |
| `git grep -n -E '\b(816\|624)\b' 038a02c3 -- game/js/plugins`: 19 lines, nine files, 20 literals (twelve 816, eight 624); 17 runtime fallbacks, 2 test preconditions; none comment-only | Same command; `-o` counts per literal; `-l` file count | 19 lines, 9 files, 12 + 8 = 20. The two preconditions are `DEUS_Depth.js:1936` and `:2385`; the other 17 are code fallbacks. No hit is a comment. |
| `Scene_Boot.resizeScreen` → `Graphics.resize`, `defaultScale` from screenScale; `adjustBoxSize` boxMargin 4; `adjustWindow` sizes the NW.js window to width×scale by height×scale | `rmmz_scenes.js` 348-381 | Confirmed. `resizeScreen` 348-355, `adjustBoxSize` 357-363 (boxMargin at 360), `adjustWindow` 365-373 via `resizeBy` deltas, `screenScale()` 375-381 reads `advanced.screenScale` or 1. Stub range ends are off by one line (see F4). |
| `Graphics.initialize` starts width/height/box at 0 | `rmmz_core.js` 480-519 | Confirmed (481-482, 509, 517). |
| NW.js turns stretch on; F3 toggles; `_realScale` = min of window-to-screen ratios, can be fractional | `rmmz_core.js` 490, 863-865, 967-970, 983-986, 823-832 | Confirmed. |
| `DEUS_Camera.js:33-36` and `58-62` set 0.5/1/2; `setZoom` clamps inside the closed range (line 93); header line 2 and help lines 13, 25 still say 0.5-3.0 and `[1.0, 0.75, 0.5]`; tilemap extent is `ceil(Graphics.width / zoom)` by `ceil(Graphics.height / zoom)` (215-224) | Lines 1-3, 11-27, 30-40, 55-65, 88-97, 212-226 | Confirmed. The ceil lines are 219-220. Lines 7, 19, 20 also carry the stale 3.0 text; the stub cites a subset, which is not a defect. |
| Fallback table rows: Bag 359-360; Camera 339, 474-475, slider memory 335-337; Fog 556-557; Levels 5179; Select 2221-2222; TimeSpeed 285; Depth 90/95/100/105; DepthDemo 453 with `smooth = false`; Containers 1495 with width 380 and origin (44, 82) at 1494-1496 | Each range read | All confirmed, including which rows are width-only, which prefer the box field, and that Bag keeps a live 0. DepthDemo `smooth = false` is line 454. See F2 on the Depth row's "divide by world zoom". |
| `DEUS_Depth.js:1936`, `2385`: `Graphics.width === 816`, then return; `depth` and `layers_flat` are `isDefault: false` at 2380 and 2685 | Lines 1933-1939, 2378-2388, 2682-2687 | Confirmed. Suite names `depth` and `layers_flat`; `if (!ok0) return;` follows each precondition. |
| `DEUS_Test.js:302` and `DEUS_Camera.js:601-608` read live `Graphics`; `DEUS_Select.js:3392-3400` and `DEUS_FactionMenus.js:724-742` use `_realScale` and the canvas rectangle; `DEUS_Fog.js:547` sets the fog bitmap `smooth` flag; `DEUS_DepthCues.js:788-794` `recommendScale` 2 at ≥ 1920, 3 at ≥ 2560, unapplied | Each range read | Confirmed. Fog sets `smooth = true` ("soft edges between cells"); the stub says "sets the flag" without the value, which is accurate. |
| `game/package.json:7-8` is the NW.js window 816 × 624 | Lines 1-12 | Confirmed. |
| "Tools and docs contain further matches" | `git grep -l -E '\b(816\|624)\b' 038a02c3 -- tools` and `-- docs` | 72 and 33 files respectively. The stub correctly gives no total and does not treat them as cleared. |

## Findings

- **F1 (MINOR, wording).** `DISPLAY-16x9.md` line 7: "`tileSize` on that same object is 48." The sentence follows four `advanced.*` facts, so "that same object" reads as `advanced`. In `038a02c3` `advanced` has no `tileSize`; `tileSize: 48` is a top-level key of `System.json`'s root object. The value and file are right; the object is not. The canonical inventory's wording ("tileSize is 48 elsewhere in System.json") is the accurate one. Suggested fix: "`tileSize`, a top-level key of the same file, is 48." Future item 1 is unaffected: it leaves every byte outside the four fields alone wherever they sit.
- **F2 (MINOR, wording).** Fallback table, "Box, then width" row for `DEUS_Depth.js:90, 95, 100, 105`: "then divide by world zoom." Lines 88-97 divide by the current zoom floored at 0.25. Lines 98-107 divide by `UF.Camera.MIN_ZOOM` (or 0.50) floored at 0.25 and add `2 * PAD`; they size the maximum depth tilemap, not the current view. Directionally right, imprecise about which zoom. Suggested fix: "then divide by the current zoom (90, 95) or by the minimum zoom plus padding (100, 105)."
- **F3 (ADVISORY, not a writer defect).** Future item 5 and Acceptance bullet 4 record the BRIEF's "same-seed before/after overlay" with the seed, year, start area, same-machine/run-method/content/camera condition, and named SHA, but neither the BRIEF nor the stub names the quantity the overlay compares. The review instruction calls this item "perf". Before the runtime lane opens, its brief should name the measured quantity (culling counts and frame interval are the natural reading of "camera/culling view counts" plus "same machine/run method") so "no invented measurements" is checkable. The stub is faithful to the BRIEF text as written.
- **F4 (TRIVIAL).** Line-range ends in the engine-core paragraph are off by one in three places: `rmmz_scenes.js:348-372` (the last function closes at 373), `adjustBoxSize` "lines 357-362" (closes at 363), F3 toggle "lines 968-985" (967-970 and 983-986). The queued lane the BRIEF names as "UI-FULLSCREEN" appears as "queued fullscreen ... edits" without the lane name. None of this changes a fact or a condition.

No finding concerns scope, ordering, staffing, the freeze, or the evidence conditions. No invented measurement, pass count, or zero-literal claim was found. The stub surfaces `game/package.json` and the tools/docs matches rather than dismissing them, as the BRIEF requires.

## Mechanical checks run

- Delta boundary: `git diff --stat` and `--name-status` base..tip (three docs paths only); `--name-status` for `game/`, `art/`, `tools/`, `PROVIDER_USAGE_STATUS.json` across base..tip and `038a02c3`..tip (both empty).
- Whitespace and EOL: `git diff --check` clean; `git ls-files --eol` shows LF for all 15 files in `docs/plans/core-tech/`.
- Markdown links: every relative link in the three files resolved (1 in DISPLAY-16x9, 14 in README, 1 in DATA-INSPECT; 16 OK, 0 missing).
- Ordering: README table rows read one by one; DISPLAY is row 1 under "Order after WORLD-3x3", DATA-RNG row 2, DATA-INSPECT row 13; the status sentence agrees.
- Sibling stubs: `grep` of `docs/plans/core-tech/*.md` for "first lane/job/after", "after WORLD-3x3", "immediately", and "DATA-RNG is/runs/comes" found no stale ordering statement outside README and DISPLAY-16x9.
- Source facts: the `git show` / `git grep` reads in the table above.
- Writer provenance: commit author and committer `deus-grok <deus-grok@local.invalid>`; `writer_workers.json` names provider `grok`, model `grok-4.7`, effort `xhigh`, exit 0, one new commit, no out-of-scope paths; the writer log lists the checks it ran (links, `git diff --check`, source reads) and states `run_tests.bat` was not run.

## Not run

`run_tests.bat`, any native or benchmark run, any screenshot or F5 playtest, any Deus laptop check. This is a docs-only filing; none of these was requested or appropriate. No provider or subagent was launched.

## Provenance notes for the PM

- At review start `git ls-remote origin refs/heads/task/display-16x9-plan` returned nothing: the branch did not exist on `origin`. The writer log records that its push "was blocked by the client before `git push` ran" and was not retried. The normal push of this review therefore creates the remote branch carrying both `e3f6a703` and the review commit. Not a writer defect; recorded so the remote history is understood.
- The temporary PM claim in `docs/STATUS.md` was already absent (hash equal to the PM's recorded before-hash). The writer log says it left that edit unstaged; the PM has since restored the file. Nothing in this review touched it.
- `scratchpad/display-16x9-plan/SOURCE_INVENTORY.md` is absent from this worktree and present at the canonical checkout path. Its facts match the source reads above; its wording on `tileSize` is more precise than the stub's (F1).

## Verdict

PASS at report level for writer SHA `e3f6a703e8afc1fbf4816c6f7babc8c06b66317a`. The filing records the Owner's scope, ordering (DISPLAY immediately after WORLD-3x3, ahead of DATA-RNG, before further visual baselines), staffing (Grok writer / Claude reviewer), the DEC-037 freeze, and every future evidence condition faithfully; it stays PARKED and claims no green proof. F1 and F2 are wording corrections the writer or PM may apply in a later docs touch; F3 belongs in the future runtime brief; F4 needs no action. Runtime, engine core, protected data, `System.json`, art, tools, and `PROVIDER_USAGE_STATUS.json` are unchanged from `038a02c3` through the reviewed tip. This review adds only this file.
