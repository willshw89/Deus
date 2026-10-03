# ORG-0.2 / lane-baseline

```text
BUDGET UPDATE (Owner, Fri Oct 2 6:53 PM CT): Owner has max/pro plans on all providers. Loosen budget, not process.
- PM (Codex): strongest OpenAI model at its highest single-agent effort.
- Writers: strongest model at highest effort for every lane except trivial mechanical ones (those stay High).
- Reviewers: strongest model, highest effort. Gemini Pro preferred over Flash.
- Parallel lanes: up to 3–4 at once after pillars-v1, still only with zero shared files.
- Unchanged: one writer per lane, cross-family review, Deus claim check before merge, tests must reach RESULT, no multi-agent "swarm" modes, no self-certification.
```

Owner authorization: the Codex PM handoffs, claims/reference/budget rules, WBS-ORG amendment and priority reset supplied on 2026-10-02. The reset at 19:09 CT takes precedence: one goal is a correctly loaded/rendered world on main. Codex is PM. Claude writes this lane with its strongest available model and highest single-agent effort. Grok is the designated independent reviewer; the Owner also permits Gemini. No subagents or multi-agent modes. After the baseline report, this is the main active lane; light ORG-1.1/1.2 follows, then ORG-4.2 on the green world. All other work waits.

## Goal and base

Restore the generated world's existing contracts and truthful complete harness results. Repair in the Owner's order: (a) History.js:536 worldgen error; (b) nw.exe exit before RESULT; (c) rivers=0; (d) object density below 2,500; (e) camps 5/8; (f) area map, regrow timers, arena, colonist count and kit stone/straw. The earlier handoff reports 1,741 objects; this session observed 1,727 under the recorded seed/year. Arena and area-map failures did not reproduce there; do not invent a fix without reproducing them.

Branch: `task/lane-baseline`. Base: `565dc5aead7e068230528d573c395ea21ed5cf5d`. Historical comparison: `056323db0f7c4e0c3795287d8a1479cd3bdc68f7`.

Bootstrap exception: the Owner explicitly requested this lane to repair a red baseline. Neither starting commit has yet been proved green; neither is represented as satisfying the normal green-base requirement.

Input evidence: `docs/baseline/BASELINE_565dc5ae.md` in the canonical working copy and the PM documentation branch. It records 19 named current failures and a watchdog/incomplete run under seed 1920951434/year 500. Untouched committed-copy runs exited before RESULT. Read the raw logs, enumerate all required default suites and fix every failure that prevents the complete native/gate runs from passing. A test can be retired only with the Owner's explicit sign-off and written reason.

## Allowed and forbidden files

The diagnosis may read history and run isolated committed snapshots. Permitted repair paths are exactly those in `lane.json`, and only for reproduced baseline defects. Existing canonical edits are owned by another/unknown writer and must be preserved. The canonical game is not a test snapshot.

PM bootstrap records (`docs/WBS_ORG.md`, `docs/VISION.md`, `docs/STATUS.md`, `docs/baseline/**`, the reusable brief template and its README link) appear in the manifest only so the gate can account for this branch's initial documentation commit. The writer must preserve those records and write its own evidence in `tasks/ORG-0.2/lane-baseline/REPORT.md`. Test files are listed to allow diagnosis; no assertion or fixture correction is authorized until the Owner accepts the specific wrong-test proposal. No edits to `tools/ops/gate_tests.json` or merge governance are allowed.

Forbidden: engine core `game/js/rmmz_*.js`, `game/js/main.js`, `game/js/libs/**`; all images and art, including `art/sprites/**`; `PROVIDER_USAGE_STATUS.json`; pre-existing worktree files, saves, telemetry and local patch scripts. No faction, civilization, farming or society feature development. No pillar generation or optimization work in this lane. A change to worldgen output must be presented to the Owner before integration. No history rewriting or deletion.

## REFERENCES (required for any non-trivial technique)

- PM selects 1–3 real GitHub repos or files before the lane starts and lists them here with exact URLs and the specific file/function to learn from.
- Writer must open and read each reference before writing code, and cite in REPORT.md which reference pattern each new function follows.
- References are for patterns only: no copying code from GPL/AGPL repos (e.g. OpenFrontIO); MIT/BSD/Apache code may be adapted with attribution in a comment.
- If no suitable reference exists, the writer says so and stops for PM guidance instead of inventing one.
- Writers must not cite a repo they did not actually open.

PM searched GitHub and opened the following three files on 2026-10-02 before the Claude writer launch:

1. https://github.com/git/git/blob/master/bisect.c — `bisect_next_all`, `check_good_are_ancestors_of_bad`, `error_if_skipped_commits`: classify a reproducible predicate, verify the good ancestor and retain skip uncertainty. GPL: patterns only, no copied/adapted source. Supplement: https://git-scm.com/docs/git-bisect. Incomplete/access-denied runs are not game-regression verdicts.
2. https://github.com/nodejs/node/blob/main/doc/api/child_process.md — `child_process.spawn`, `ChildProcess` events `error`, `exit`, `close`, and `kill`: explicit cwd/argument arrays, bounded owned-child execution and truthful result collection. Confirm license and attribute any permitted code adaptation; none has been copied by the PM.
3. https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/js_protocol.pdl — `Profiler.enable`, `Profiler.start`, `Profiler.stop`, `Profile`, `ProfileNode`: retain actual samples/time deltas and identify hot call sites. Supplement: https://developer.chrome.com/docs/devtools/performance. Confirm license before adaptation; none has been copied by the PM.

- Local authorities: `tools/run_tests.js`, `game/js/plugins/DEUS_Test.js`, `tools/ops/run_gate.js`, `tools/ops/gate_tests.json`, `docs/ENGINE_RULES.md` and `docs/systems/DEUS_Test.md`.

## Steps

1. Preserve canonical changes; run the original default harness at both SHAs in isolated copies. Record launch, seed, year, suite coverage and whether RESULT exists.
2. Control comparison conditions. Both versions support `DEUS_TEST_YEAR`; neither has a seed argument/environment variable. In disposable snapshots only, set `DEUS_World.parameters.Seed` to `1920951434`. Record this fixture override; never call the resulting files untouched commits. Use year 500 for the historical default comparison, and separately test the actual Year 0 start.
3. Run each full gate list against its own historical snapshot. The old list has nine entries; the current list adds `tools/test_control_board.js`. Keep exact per-suite logs and exit codes.
4. Address the History.js:536 error and early NW exit first, then the remaining defects in the Owner's order. Locate regressions with independently reproducible predicates. Use `git bisect` only in disposable repositories; retain the bisect log. A historical test whose assertion was changed to an unconditional failing constant needs a runtime contract check before proposing a correction.
5. Make small in-scope cause repairs on this branch. Do not mask failures, reduce gate scope, weaken thresholds or manufacture results. If a test itself is wrong, report the evidence and propose the exact correction to the Owner before changing it. Record fixture mismatches separately from runtime defects. After two unsuccessful repair attempts on one defect, stop that repair and ask the Owner a concrete question.
6. Run the complete native harness and current gate list. Demonstrate relevant failing test paths. Inspect every screenshot. Record the seed/year and any fixture override. Golden determinism hashes belong to ORG-4.2 and title-load/z+8/zoom-out performance baselines belong to ORG-4.3; neither starts in this lane or before this lane is green.
7. Commit only explicit lane paths as Claude with per-command identity; never change shared git config. Push only this lane branch with no force option before any completion claim, then check the exact SHA on origin. The Owner relays the self-contained review request to a reviewer of another family and to Deus. Do not transcribe a reply as an independently authored review commit. The writer does not merge, review or tag.
8. Hold until the designated reviewer's PASS, passing gates and a CONFIRMED Deus claim check. Integration uses `merge_gate.js` and `--no-ff`; rerun both full suites on main. Acceptance also requires a generated world with rivers, objects and camps at expected counts, an inspected screenshot and the Owner seeing it in-game. Create `baseline-green` only for the proved passing integrated commit. Light ORG-1.1/1.2 then ORG-4.2 follow. Pillar merge, perf budget, sim/render design, branch pruning, OneDrive move, WBS-SIM and the 15 performance lanes remain parked.

## Acceptance commands

From an isolated snapshot/lane root:

```powershell
.\run_tests.bat
node tools/ops/run_gate.js --root . --log-dir <unique-evidence-directory>
.\run_tests.bat selftest
```

The default native suite must reach a computed `RESULT` with zero failed checks and exit 0; no harness error is allowed. The selftest must show its intentional FAIL with exit 1. Every entry of the gate list must finish and pass. Same seed/year/Z configuration must be recorded. Do not replace the default suite with selected suites to claim baseline completion. Literal editor F5 and Owner-visible baseline are separate pending acceptance steps.

## Report and claim requirements

Provide task ID, branch, origin-visible head SHA, changed files, exact new symbols and their callers (or explicitly no new runtime symbols), commands, real RESULT lines, per-gate output, inspected screenshots, before/after performance method and numbers, and every untested or failing item. Report times in CT. Keep a self-contained manual review block requiring `VERDICT: PASS | PASS_WITH_NITS | FAIL`, followed by BLOCKING, NON-BLOCKING and OWNER DECISION NEEDED. Deus PARTIAL/FALSE holds integration regardless of a review verdict.

## Stop and escalate

The Owner resolved the WBS conflict and then set the active priority at 19:09 CT on 2026-10-02. Expected-red exceptions never waive this lane's green requirement. Everything outside the four active steps waits. Do not start pillars, profiling budgets, architecture design or simulation/profession work. Future source-module/build-output rules remain recorded in WBS-ORG but are not work in this lane.

Hold overlapping canonical edits while ownership is unknown. Hold game-output changes for Owner disposition before integration. Stop after two failed repairs of one defect or two failed reviews of this lane. Do not claim GREEN, FIXED, DONE, WORKING or PUSHED until the exact corresponding evidence exists. Do not continue into the pillar merge.

## GAME TRANSLATION (planned, not observed completion)

Player / World Effect: restore reliable boot and existing natural-world contracts without new features.
Trigger: New Game, baseline suite and existing object/world interactions.
Runtime Authority: existing `DEUS_World`, `DEUS_History`, `DEUS_Objects`, `DEUS_Ecology`, `DEUS_WorldGen` and `DEUS_Items`; no replacement authority.
Simulation Path: reproduced defect paths will be named in the report before repairs are represented as complete.
Engine Bridge: the existing DataManager New Game hook, Scene_Map and sprite consumers; each repair must name its actual caller.
Visible Result: stable map startup and preserved existing interactions; not yet proved for the final lane.
Persistence: existing World state serialization; relevant round trips must pass, with no save-schema invention.
Failure Without This Lane: a merge can preserve or obscure broken behavior because no trustworthy comparison exists.
Automated Proof: full native harness, full gate list, controlled regression predicates, and observed failure paths at exact SHAs.
In-Game Proof: real NW.js runs and inspected captures, followed by Owner editor F5; the final lane has not reached either acceptance step.
Consumed by game systems: World state -> Scene_Map/events/object layers; object changes -> Ecology/Objects timers; History -> World unit registry; worldgen fields -> terrain and object placement. Final report must prove repaired consumers receive the right data.
Bridge status: simulation, engine bridge, presentation, input and save/load repairs are NOT VERIFIED; playable verification NOT PERFORMED for a final lane commit.
