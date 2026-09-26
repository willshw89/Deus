# Lane K Fix 1 Brief: deterministic gates after Grok FAIL (WG.00.09b)

Issued by the PM (main-chat ops), 2026-09-26 ~03:45 CT. Branch `task/lane-k`, worktree `C:\Users\snewt\.deus_worktrees\lane-k`.
Reviewed writer tip: `86bf49a926ea0ed6a546b31c94de66dd6863628d`. Review: `tasks/WG.00.09b/lane-k/review_grok_86bf49a9.md`
(commit `423c775454ff380104b4e7a1fc2f48e65f46433e`), VERDICT FAIL (1 BLOCKER, 2 MAJOR, 5 MINOR).

The original `BRIEF.md` stays the authority for scope and for the product behaviour (DEC-011 flat 1:1 layers; K1-K4).
This brief adds the fix work and **overrides BRIEF.md in two places only**: (a) you now push your own branch at the end
(`git push origin task/lane-k`; never any other branch, never main, never force), and (b) the gate/perf rules in section 3.

The review found **no DEC-011 regression**: flat checks (`projection_origin`, `parallax_bounded`, `no_filters_any_state`,
`flat_transform`, `no_blends`, `flat_position`, `flat_crisp`, `flat_no_filters`) passed on every run, and the renderer
diff is in scope. The FAIL is about gates whose pass/fail depends on the generated world, on asset-load timing and on the
machine's load, plus evidence numbers that are not in the committed data. Fix the tests and the evidence; change renderer
code only where a reproduction proves a real renderer bug.

## Standing rules (unchanged except push)
1. NO ART GENERATION BY ANYONE (DEC-007). Harness screenshots are evidence, not art.
2. Write only inside the allowedPaths of `BRIEF.md` / `lane.json` (DEUS_Depth.js, the DEUS_Depth entry of plugins.js,
   DEUS_Minimap.js, DEUS_Fog.js/DEUS_DayNight.js only if K4 ranks them, docs/systems/DEUS_Depth.md, docs/systems/DEUS_Minimap.md,
   tools/test_layer_render_flat.js, tools/bench_render_layers.js, tools/test_minimap.js, tasks/WG.00.09b/lane-k/**).
   Do NOT edit `review_grok_*.md`. If a fix needs a forbidden file (for example tools/test_snapshot.js, DEUS_Test.js,
   DEUS_World.js, DEUS_Levels.js), stop that item and write the exact need to `escalation.md`.
3. Capture every exit code (`EXIT=$LASTEXITCODE`) and paste raw output in `REPORT.md`.
4. FOREGROUND: run tests in the foreground; never end your turn while child processes run. Commit early (WIP commits OK).
5. Heavy NW.js suites and the benchmark run in a **fresh temp clone** of your committed tip
   (`git clone -c core.autocrlf=false <worktree> %TEMP%\lanek-fix1-<sha8>-<n>`; delete it afterwards), not in the live worktree.
6. Do not merge. Do not self-certify (no DONE/VERIFIED/PASS claims about your own work). An independent Grok review decides.
7. Commit messages start `[claude] WG.00.09b Fix1`.

## 1. Root causes found by the PM (confirm or correct them with evidence)

| # | Symptom in the review | Root cause (PM reading of the code at 86bf49a9) | Class |
|---|---|---|---|
| RC1 | Proof window, cut and fixtures differ run to run: `(66,0)` vs `(98,148)`; cut `(98,116)` vs `(26,196)` | The `depth` and `layers_flat` suites run on whatever world the harness New Game generates; nothing pins the seed (the bench pins `0x5eed0019`, the suites do not). Every check that needs world content can pass on one world and fail on the next. | test design (seed-dependent) |
| RC2 | BLOCKER `depth.entities_drawn`: item stone x3 created at (77,3) but the +1 plane counted 0 item stacks; next run 1 | `entityCounts()` counts only *visible* item sprites. `placeEntities` keeps an item sprite hidden until `itemFrame()` finds its sheet `isReady()` (async `ImageManager.loadCharacter`). The check waits a fixed `t.waitFrames(6)` after `I.create`. First run in a fresh clone = cold file cache and a loaded machine (46.2 s run vs 34.3 s repeat), so the sheet was most likely not ready in 6 frames. Secondary suspect to rule out: that world's proof window sat on the north edge (`wy = 0`, item at y 3, entity window `y0 < 0`); check that `rebuildItems`' `UF.Items.find({near, radius})` finds items there. | timing-dependent test (probable); edge case to rule out |
| RC3 | MAJOR `layers_flat.every_view_sees_through`: `+2: ... no solid cell` -> FAIL although the open cell drew the planes' pixel | The check looks for a pre-existing non-open cell of the viewed level in a +/-7 x +/-5 box and fails closed if the world has none (`opaque = !!solidHere && ...`). In the (26,196) world the +2 view had none. The renderer behaved correctly; the fixture was missing. | test design (seed-dependent) |
| RC4 | `repaint_cost` (worst repaint < 16 ms) and `planes_cost` (planes +x ms, bound 8) are pass/fail on wall-clock time | Both passed in the review, but they are wall-clock gates: under CPU contention they can fail with no code change. | timing-dependent gate |
| RC5 | `unit_step_same_frame` arrival 16 frames on one run, 17 on another; code allows `unitStepFrames + 1` | The tween runs on simulation ticks (`simNow`), the check counts `Graphics.frameCount`. RMMZ runs 0, 1 or 2 updates per displayed frame, so frame counts drift with load. | timing-dependent assertion |
| RC6 | K3/K4 baselines (`perf/*_5c6641e1.json`, `*_f19b23bf.json`) have `machine` (host, cpus, cpu, GL) but no CPU load or concurrent-worker count | They ran ~02:05-02:20 CT while PM post-merge suites and other AI workers were running (the Owner reports CPU ~94%). DEC-017's hygiene rule (`docs/OWNER_DECISIONS.md:247`, ADR-003 section 9.2 and 13.3) requires every perf record to carry the concurrent worker count and CPU %. These numbers are contention-contaminated and can't be judged. | CPU contention / missing hygiene data |
| RC7 | Fixed snapshot directories: `test_snapshot.js` defaults to `%TEMP%\uf_snapshots\<name>` and `test_layer_render_flat.js` uses `uf_snapshots\lanek_<suite>` | Two runs at the same time (writer and reviewer, or two clones) overwrite each other's snapshot and results.txt. | cross-run interference hazard |

## 2. Every review finding, with the required fix and acceptance

| ID | Review finding | Required fix | Acceptance |
|---|---|---|---|
| B1 | BLOCKER: `depth.entities_drawn` red on one fresh world, green on the next (RC1, RC2) | (a) Reproduce first: run the `depth` suite from a fresh clone on a cold snapshot, and log per frame after `I.create` whether the item sheet `isReady()`, whether `rebuildItems` found the item, and whether its sprite is visible. Record the finding in REPORT.md (asset timing, edge/seam, or other). (b) Replace the fixed 6-frame wait with a readiness condition: preload the item/tree/unit sheets before placing fixtures and `await t.waitUntil(<sheets ready and plane sprites built>, <generous timeout>)`, then a fixed small number of frames. A timeout is a HARNESS failure with a clear message, never a silent pass. (c) If the reproduction shows a real renderer bug (for example items near the map edge or loop seam never found), fix it in DEUS_Depth.js and add a check that puts an item fixture at the edge case. (d) Place fixtures so the check never depends on the world (RC1 fix below). | `entities_drawn` passes on 5/5 consecutive fresh-clone runs AND on 2 runs made while the machine is loaded (section 3.4); provocation `depth.entities_drawn` still fails it; REPORT.md states which root cause the reproduction showed. |
| B2 | (implied by B1 and M1) Suites use an unpinned world (RC1) | Make both suites deterministic: either pin the world seed through a mechanism reachable from your allowedPaths, or (preferred if a seed can't be pinned without a forbidden file) build every fixture a check needs (terrace, hole, deck, cut, solid reference cells, item/tree/unit spots) explicitly, as `proofWindow`'s synthetic hill already does, so that pass/fail no longer depends on what the generator produced. If pinning needs DEUS_Test/test_snapshot/World changes, write that to escalation.md and use the fixture route. | Every required check of both suites prints the same PASS on 5/5 consecutive runs; REPORT.md lists which checks read world content and how each is now fixture-driven or seed-pinned. |
| M1 | MAJOR: `every_view_sees_through` fails closed when the +2 view has no non-open cell (RC3) | On each viewed level (+2, +1, 0, -1) create (or pin) a known solid/floor reference cell inside the probe box before judging, like the cut fixture. A missing fixture is a harness error, not a pass and not a silent fail. Keep the assertion strength: open cell equals the planes' pixel with alpha 255; solid cell unchanged with planes off. | Passes 5/5 fresh-clone runs and 2 loaded runs; provocation `depth.every_view_sees_through` still fails it; the result line always names a solid reference cell for all four views. |
| M2 | MAJOR: `escalation.md` cites figures not in the committed baselines (hazard rank "24.5"/"23.0", depth "was 0.63/1.06", pre-K4 log 1.5/3.0, env pre-K4 27.6/48.8, `update.map.world` 4.8/8.1, events 2.3/4.9, steady 30-90 ms, stress 108-146 ms, 44-48 events / 25-28 listeners / 118 max, `lastPeekMs` range, unit count range) and a false "lane.json is 0 bytes" note | Regenerate every figure from committed JSON with a committed script (extend `perf/rank_k4.js` or add `perf/escalation_figures.js`) and paste its output. Each number in escalation.md cites file + field (+ phase/run). Figures from the new Fix 1 baselines replace old ones where they supersede them; keep old ones only if labelled with their file. Remove or correct the 0-byte lane.json note (it is 1018 bytes at HEAD and in the worktree). | A reviewer running the script reproduces every number in escalation.md exactly (after the stated rounding); no uncited figure remains. |
| m1 | MINOR: after-evidence named `4da2e734` but added in `86bf49a9` together with the `mask_order` probe change | Regenerate the after evidence (screenshots + results txt) on the Fix 1 tip's renderer and name it with that tip's sha8 (a file can't carry its own commit hash: use the sha of the commit whose renderer and tests you ran, state it in REPORT.md, and make the evidence commit change nothing under game/ or tools/). | Evidence folder name equals the sha whose code produced it; `git diff <that sha> <tip> -- game tools` is empty. |
| m2 | MINOR: `unit_step_same_frame` allows `unitStepFrames + 1`; brief says within `unitStepFrames` (RC5) | Measure the step in simulation ticks (the clock the tween uses), assert target set in the step's frame and arrival `<= unitStepFrames` ticks. If you keep a displayed-frame figure, report it, don't gate on it. If `+1` is genuinely required, justify it in test_changes.md with the tick arithmetic. | Deterministic across the 5 + 2 runs; test_changes.md states the unit and the bound. |
| m3 | MINOR: test_changes.md says provocations were seen failing and points to a missing REPORT | Write `tasks/WG.00.09b/lane-k/REPORT.md`. Run `node tools/test_layer_render_flat.js --provoke` and `node tools/test_layer_render_flat.js --suite depth --provoke` in a temp clone; commit the raw logs under `tasks/WG.00.09b/lane-k/evidence/provoke_<sha8>/`. | Every provocable check is shown FAILING under its provocation; exit codes pasted. |
| m4 | MINOR: `preset_filters` renamed to `no_filters_any_state` although the brief said update in place | Either restore the old name, or keep the new name and record the rename plus reason in test_changes.md (the reviewer accepted the assertion). | test_changes.md has an explicit rename line. |
| m5 | MINOR: before-evidence sha `3a9daa0f` is not the branch base `8592b07a` | State in REPORT.md that `git diff --stat 3a9daa0f 8592b07a -- game/js/plugins/DEUS_Depth.js game/js/plugins.js` is empty (paste it), so the before shots show branch-base code. No re-shoot needed. | Line present with the pasted command output. |
| P1 | (PM) wall-clock pass/fail in `repaint_cost` and `planes_cost` (RC4) | Keep measuring and printing the numbers, but they must not decide the gate. Make them report-only lines (always PASS if the measurement ran, e.g. `repaint_cost - measured ... (reported, not gated)`), or move them out of the required list into a perf section of results.txt. Keep a non-timing assertion where one exists (e.g. repaint happened, planes present). | No required check in either suite compares elapsed time to a bound; grep for `< 16`, `bound 8`, `performance.now()`-based pass/fail in the checks returns only report lines. |
| P2 | (PM) fixed snapshot dirs (RC7) | `tools/test_layer_render_flat.js`: use a unique per-run snapshot dir (suite + pid + timestamp) and clean it up afterwards; print it. For gate 2 (`node tools/test_snapshot.js --name depth ...`) you may not edit test_snapshot.js: note the collision hazard in REPORT.md. You may change `lane.json` gate 2 to `node tools/test_layer_render_flat.js --suite depth` only if that command runs the same suite with the same required-check list; keep the old command passing too. | Two gate runs started at the same time from two clones both finish with correct, separate results. |
| P3 | (PM) benchmark taken under contention without load data (RC6) | See section 3.3. | See section 3.3. |

## 3. Gate and performance rules for this fix (override BRIEF.md where they differ)

### 3.1 Deterministic gates
- A gate check passes or fails on state, pixels, counts, frame/tick ordering and fixture content only. No required check may
  pass or fail on elapsed wall-clock time, and none may depend on which world the generator produced.
- Waits are condition waits (`t.waitUntil(cond, timeout)`), not "N frames and hope". Timeouts only catch hangs: set them
  generously (>= 10x the observed time) and make a timeout a harness failure that names the condition.
- Frame counts are allowed only where the order of events in a frame is the thing under test (for example `switch_same_frame`,
  "target set in the step's frame"). Durations use the simulation's own clock.

### 3.2 Performance numbers: reported, judged separately
- `repaint_cost`, `planes_cost`, `lastPaintMs`, `lastSwitch.ms`, frame times and the bench outputs are reported with their method
  and the machine load, and are judged separately by the PM/Owner (DEC-017 go/no-go, ADR-003 section 9.2 PENDING-K3). They are not
  part of the pass/fail gate.

### 3.3 Benchmark rerun with machine load recorded
- Add a `machineLoad` block to every output of `tools/bench_render_layers.js` (normal and `--scenario=stress`):
  - CPU % sampled about once per second during each phase (Windows: e.g. `Get-CimInstance Win32_Processor` LoadPercentage via a
    child `powershell`, or `typeperf "\Processor(_Total)\% Processor Time"`), reported as min / median / max per phase and overall;
  - the concurrent AI worker count at start and end, using the PM's filter:
    `@(Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'claude.exe' -and $_.CommandLine -match ' -p ') -or $_.Name -eq 'grok.exe' -or ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'codex\.js.* exec') }).Count`
    (your own session counts as 1; say so);
  - the count of other `nw.exe` processes at start and end;
  - start/finish timestamps (UTC, as today) and a `label`: `quiet` if overall median CPU <= 25% and no other nw.exe ran,
    otherwise `loaded`.
- Rerun on the Fix 1 tip in a temp clone: normal baseline x2 and stress x2 (0019-T requires two stress runs). Commit them as
  `perf/baseline_<sha8>.json` and `perf/stress_baseline_<sha8>.json` (one file per scenario may hold both runs, as today).
- Before each run, sample CPU for 30 s. If median CPU > 25% or another nw.exe is running, wait (poll every 2 minutes, up to 30 minutes)
  for a quieter machine; then run anyway and label it `loaded`. Never kill or pause another process to get a quiet machine.
- Mark the old K3/K4 baselines in escalation.md as "taken under contention, load not recorded (pre-Fix 1)"; do not delete them.
- The K4 ranking (`perf/rank_k4.js`) is re-run on the new baselines and its output pasted; state whether the ranking changed.

### 3.4 Evidence of determinism (in REPORT.md, raw)
- From fresh temp clones of the final code commit: `node tools/test_layer_render_flat.js`, the depth gate command, and
  `node tools/test_minimap.js`, **5 consecutive runs each**, every run exit 0. Paste the RESULT line, counts, duration and the
  CPU % / worker count sampled at the start of each run.
- **2 further runs of each NW.js gate while the machine is loaded** (for example, both gates started together from two clones,
  which also proves P2). Record CPU %. They must also exit 0.
- Both `--provoke` runs (m3) with every provocation caught.
- Syntax: `node --check` on every changed .js.
- Scope: `git diff --name-status 8592b07aa9315c1cdd2c8d29e1a6d37d3d055deb HEAD` is inside allowedPaths.

## 4. Deliverables
- Test and (only if proven necessary) renderer fixes inside allowedPaths.
- `tasks/WG.00.09b/lane-k/test_changes.md` updated (every changed check: old -> new assertion, and why).
- `tasks/WG.00.09b/lane-k/REPORT.md` (new): finding-by-finding table (B1, B2, M1, M2, m1-m5, P1-P3) with the fix and evidence
  location; the reproduction result for B1; the determinism runs; provoke results; the new bench numbers with their `machineLoad`
  and label; what is not done.
- `escalation.md` corrected (M2); new baselines (3.3); evidence regenerated (m1).
- Push: `git push origin task/lane-k`. Your final output line must be exactly `FINAL SHA: <sha>` pasted from
  `git rev-parse HEAD` after the push. If the push is refused, say so in REPORT.md and stop.
