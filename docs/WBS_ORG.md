# WBS-ORG: Repo organization and architecture hardening

**Status: Active.** Recorded 2026-10-02. Replaces the earlier pillar-merge plan (`docs/DECISIONS.md` D-2026-10-02-2).

**Priority reset (Owner, 2026-10-02):** the only goal now is the world loading green on main. **Active now: ORG-0.1, ORG-0.2, ORG-1.1, ORG-1.2, ORG-4.2.** Everything else below is parked until the Owner reopens it.

Rules: lane rules in `AGENTS.md` apply. Fix causes, never tests. The ORG-0.1 expected-red list only gates ORG-1/2/3 (CI, hygiene, docs) lanes.

## ORG-0: Baseline
| ID | Task | Status |
|---|---|---|
| ORG-0.1 | Baseline report on `565dc5ae`: run `run_tests.bat`, record every suite and raw RESULT lines, freeze the expected-red list. Output `docs/baseline/BASELINE_565dc5ae.md`. | Active |
| ORG-0.2 | Worldgen green on top of 565dc5ae. Fix, in order: DEUS_History.js:536 error that stops worldgen; nw.exe exiting before RESULT; rivers = 0; objects 1,741 vs 2,500; camps 5/8; then area map, regrow timers, arena, colonist count, kit stone/straw. Fix causes, not tests. Done when `run_tests.bat` is all green and a generated world loads with rivers, objects and camps (inspected screenshot). | Active |

## ORG-1: Gatekeeping
| ID | Task | Status |
|---|---|---|
| ORG-1.1 | Branch protection on main (Owner action): require PR, 1 approving review, required check `ci`, no direct pushes, no force-push. | Active |
| ORG-1.2 | Basic CI: `.github/workflows/ci.yml` with `node --check` on plugins and tools (`tools/ci/syntax_check.js`) and root hygiene (`tools/ci/check_root.js`). | Active |
| ORG-1.3 | Investigate headless NW.js tests in CI (xvfb / windows runner); else document in `docs/ci/HEADLESS.md` and propose a self-hosted runner. | Parked |
| ORG-1.4 | Report standard: branch, SHA, test command, pasted RESULT in every lane report (in `AGENTS.md`). | Parked (rule already in AGENTS.md) |

## ORG-2: Hygiene
| ID | Task | Status |
|---|---|---|
| ORG-2.1 | One WBS index: `docs/WBS_INDEX.md`. | Parked (initial index created) |
| ORG-2.2 | Root cleanup: stray one-off files to `archive/root-2026-10/` with `git mv`; nothing deleted. | Parked |
| ORG-2.3 | `.gitignore`: scratch/, scratchpad/, tmp/, temp_*, test_wang*, *.log, test_output/, game/error_stack.txt; keep `.pixellab_token` ignored. | Parked |
| ORG-2.4 | Script location rule (tools/ or scratchpad/<lane-id>/) + `tools/ci/check_root.js` in CI. | Parked |
| ORG-2.5 | Deus.exe out of git: `git rm --cached`, ignore it, ship via GitHub Releases (`docs/RELEASE.md`). No history rewrite without Owner OK. | Parked |
| ORG-2.6 | Branch prune plan (`docs/ci/BRANCH_PRUNE_PLAN.md`): classify merged / unmerged / backup. Executed only with Owner approval; tag tips `archive/<branch>` first. Never touch the backup branch or stashes. | Parked |
| ORG-2.7 | Steps to move the repo out of OneDrive (e.g. `C:\dev\Deus`), re-point worktrees, verify tests (Owner action). | Parked |

## ORG-3: Rules
| ID | Task | Status |
|---|---|---|
| ORG-3.1 | `AGENTS.md` is the single rulebook; `CLAUDE.md`, `GEMINI.md`, `.clinerules` point to it. | Parked (first version done on `org/setup-2026-10-02`) |

## ORG-4: Architecture (after ORG-0.2 green)
| ID | Task | Status |
|---|---|---|
| ORG-4.1 | Pillar merge as a build step: source modules in `game/js/src/<pillar>/`, `tools/build/merge_pillars.js` bundles them into the pillar plugin files, `tools/build/check_pillars.js` verifies (in CI). Old monoliths move to `_legacy/`. No-change proof: same tests, same determinism hash. Tag `pillars-v1`. | Parked |
| ORG-4.2 | Determinism hash: fixed seed -> hash of terrain, rivers, objects, camps, history; two runs match; stored golden hash; a lane that changes it declares it and gets Owner OK. Recorded on the green SHA. | Active (starts after ORG-0.2 green) |
| ORG-4.3 | Performance budget: title load, frame time at z+8 and zoomed out on a fixed seed; baseline in `tools/tests/perf/baseline.json`; >10% regression fails. | Parked |
| ORG-4.4 | Sim/render split design doc (`docs/architecture/SIM_RENDER_SPLIT.md`), design only. Detailed lanes in `docs/WBS_SPLIT.md`. | Parked |

Order: ORG-0.1 -> ORG-0.2 green -> ORG-1.1/1.2 -> ORG-4.2 -> (later, Owner OK) ORG-4.1 -> ORG-4.3 -> tag pillars-v1 -> ORG-2.6 -> ORG-4.4.
