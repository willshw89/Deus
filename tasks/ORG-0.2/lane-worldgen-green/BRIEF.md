# ORG-0.2 / lane-worldgen-green

Owner GO: 2026-10-02 20:25 CT. Codex is PM. Claude is the sole writer at strongest available single-agent model/max effort; Grok is the independent cross-family reviewer at strongest model/highest effort. No subagents, swarms or self-certification. The newest Owner instructions override older role/model rules in this checkout. This is the active main lane; art, pillar, architecture, performance and society work remain parked.

## Goal, base, branch and worktree

Restore the existing generated-world contracts and reach a complete green native test result. Base is origin/main at 565dc5aead7e068230528d573c395ea21ed5cf5d. Branch is exactly task/org-0.2-worldgen-green. Worktree: C:\Users\snewt\OneDrive\Desktop\UF\.deus_worktrees\org-0.2-worldgen-green. Do not touch the canonical main checkout, any stash, the backup branch or another worktree. The prior task/lane-baseline work is preserved, inactive and unreviewed; do not cherry-pick its bundled repair commit wholesale.

## Priority and bounded dispatches

Fix in order, one runtime-fix commit per item:
1. (a) DEUS_History.js:536 allocation guard error that aborts worldgen.
2. (b) nw.exe exiting before the RESULT line.
3. (c) rivers = 0.
4. (d) objects 1,741 versus the existing 2,500 expectation (the controlled PM baseline observed 1,727).
5. (e) camps 5/8.
6. (f) area map, regrow timers, arena, colonist count, kit stone/straw.

Initial dispatch is **item (a) only**. Produce a narrow cause repair, its commit and controlled native test evidence, then return to PM for the next dispatch. Other items remain authorized but sequential. A commit is not a completion claim. Evidence-only report commits may follow a fix commit so the report can name the tested SHA; never bundle different runtime fixes.

## Controlled runs: mandatory for every run

Seed **1920951434**, year **500**, no Z-range override. Source: ORG-0.1 report at C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/lane-baseline/docs/baseline/BASELINE_565dc5ae.md (PM documentation commit 249a5a272f7d74b4cfe587bdbd104549ebd8fef9). Its controlled baseline was RESULT: 118 passed, 19 failed (exit 2), incomplete at the stock 180-second watchdog. Untouched runs also exited without RESULT; neither was green.

The current harness has no seed flag. Create a disposable game snapshot of the tested commit beneath this lane's scratchpad/lane-worldgen-green/. Set only DEUS_World.parameters.Seed in the snapshot's game/js/plugins.js to 1920951434. Set DEUS_TEST_YEAR=500 in the run's environment. Verify the generated world's actual seed/year, and record the fixture override and source SHA. Never change the tracked plugins.js or source seed default. Use the real run_tests.bat entry point with its supported --game <snapshot/game> argument. Do not substitute a custom NW runner for required acceptance runs.

After each fix commit run, from this lane root:

    $env:DEUS_TEST_YEAR = '500'
    .\run_tests.bat --game <absolute-controlled-snapshot-game-path>

Record raw stdout/stderr, actual process exit and the complete RESULT line, including failures. If no RESULT exists, report exactly that and retain partial output. Do not alter watchdogs, time limits, fixtures, assertions, thresholds or default suite selection to get a pass. The seed fixture above is the sole already-authorized fixture override. Supplemental diagnostics also use this seed/year. No random-seed or Year 0 runs in this dispatch.

## Scope and protections

Only paths in lane.json may change, and only for reproduced defects in the ordered task. Initial dispatch runtime scope is DEUS_Colonists.js and/or DEUS_History.js plus their corresponding docs and task evidence. Read all relevant local rules, but explicit Owner instructions prevail.

No new plugins; no images or art changes; no faction/society implementation; no engine-core or game/js/libs/ edits; no PROVIDER_USAGE_STATUS.json edits; no tracked plugins.js edits. No changes to gate_tests.json, merge governance, CI or repository organization. No force push, reset --hard, deletions, branch moves or stash operations. Use explicit git-add paths and per-command writer identity deus-claude <deus-claude@local.invalid>; never change shared Git configuration. Only this lane's own child processes may be stopped.

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


The same ORG-0.2 PM-selected references are reused from the completed lane search. Open/read each before code; do not conduct a separate writer search. Baseline local evidence and the prior writer's report are diagnostic leads, not accepted proof. The old report's random-seed, lifted-watchdog results do not satisfy this brief.

## Steps and escalation

1. Read the brief, manifest and Owner/local rules. Review the prior report read-only at C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/lane-baseline/tasks/ORG-0.2/lane-baseline/REPORT.md, especially the allocator call chain. Verify the suspected World.addUnit -> world:unitAdded -> isColonist -> factionId -> colonyState -> setupColony reentrancy on this base. Do not copy unrelated repairs.
2. Reproduce item (a) under the controlled seed/year using a focused diagnostic if necessary. Fix the allocating caller; retain History's guard. Do not invent a fix for failures that do not reproduce.
3. Commit only this fix, push only task/org-0.2-worldgen-green normally, and verify the exact SHA on origin. Run the mandatory controlled run_tests.bat and retain evidence after this commit.
4. Write REPORT.md with the required evidence and return. The PM will check the diff/results before issuing item (b).
5. If a test looks wrong, stop the dependent work and write the exact proposed change, current code/line and reason for Owner approval. Never change test input or assertions first. This includes replacing a hardcoded empty river-test input, changing camp/object expectations, stumps or timeouts. Prior writer proposals have not been approved.
6. Record attempt count per item. After two unsuccessful rounds, stop that item and hand PM the exact notes, evidence and ruled-out causes. The Owner now authorizes handoff to another model; the PM assigns it. Do not start another writer yourself.

## Acceptance and review

Final lane acceptance: complete run_tests.bat all green at the controlled seed/year, every existing tools/ops/gate_tests.json gate passing, boot into a generated world with rivers/objects/camps at the expected counts, and an inspected loaded-world screenshot. Run the gate with node tools/ops/run_gate.js --root . --log-dir <unique-evidence-directory>. Keep intentional selftest FAIL evidence separate from acceptance. No relaxed assertions or omitted default suites.

Grok must read the exact pushed SHA/diff, verify real callers and give VERDICT: PASS | PASS_WITH_NITS | FAIL with BLOCKING findings. Only PASS plus passing gates plus Deus CONFIRMED permits later PM integration. Deus checks the laptop before any merge. Writer must never review itself, merge main, tag green or claim world-load acceptance early.

## Required report

Task ID; exact branch; origin-visible tested and final SHAs; files changed; exact new/changed symbols and existing callers; reference pattern used by each new function; seed 1920951434/year 500 and snapshot override; every command and raw RESULT line/pass/fail counts; attempt counts; screenshots actually opened with observed content; remaining failures/untested paths. No performance claim without before/after measurements. Use CT times. End the dispatch with a small factual checkpoint, not a green claim if anything is red.

## GAME TRANSLATION

Player/world effect: the generated world finishes creation and can be displayed with its existing population and natural-world content. Trigger: New Game / default native test startup. Authority: existing World/History/Colonists and their event listeners. Item (a) path to verify: History materialization -> World.addUnit -> world:unitAdded listeners -> factionId classification; read the faction without lazily creating another colony during the reserved-ID allocation. Bridge: existing World state -> Scene_Map/events/sprite consumers. Persistence: existing save/load contracts; no new schema. Visible result and screenshot: generated world after successful boot, with actual counts reported. Until observed, simulation/engine bridge/presentation/input/save-load repair status and playable verification are NOT VERIFIED. Headless proof alone does not establish playable acceptance.
