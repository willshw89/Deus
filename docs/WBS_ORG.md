# WBS-ORG: Repo organization and architecture hardening

**Status: Active.** Recorded 2026-10-02. Replaces the earlier pillar-merge plan (`docs/DECISIONS.md` D-2026-10-02-2).

**Runtime priority: ORG-0.2 worldgen green.** The Owner separately authorized isolated support lanes (setup/CI review, STUB-HUNT and ORG-0.3 plugin audit). The 2026-10-02 21:56-22:15 CT decisions below are **DESIGN ONLY**: no new implementation starts until ORG-0.2 is green. DEC-037 remains in force for faction/society code. ORG-4.2 and all newly planned exit-gate work are held behind that first prerequisite; their planning status is not a launch instruction.

Rules: lane rules in `AGENTS.md` apply. Fix causes, never tests. The ORG-0.1 expected-red list only gates ORG-1/2/3 (CI, hygiene, docs) lanes.

## ORG-0: Baseline
| ID | Task | Status |
|---|---|---|
| ORG-0.1 | Baseline report on `565dc5ae`: run `run_tests.bat`, record every suite and raw RESULT lines, freeze the expected-red list. Output `docs/baseline/BASELINE_565dc5ae.md`. | Active |
| ORG-0.2 | Worldgen green on top of 565dc5ae. Fix, in order: DEUS_History.js:536 error that stops worldgen; nw.exe exiting before RESULT; rivers = 0; objects 1,741 vs 2,500; camps 5/8; then area map, regrow timers, arena, colonist count, kit stone/straw. Fix causes, not tests. Done when `run_tests.bat` is all green and a generated world loads with rivers, objects and camps (inspected screenshot). | Active |

### Hard gates before leaving worldgen (Owner design, D-2026-10-02-12)

ORG-0.2 green is the first prerequisite, not the entire phase exit. These requirements are recorded now; no new runtime/test lane is launched by this design update. All must be evidenced before leaving worldgen:

| Requirement | Planned evidence / boundary | Status |
|---|---|---|
| STUB-FIX | Repair fake/stubbed checks identified by STUB-HUNT and independent review; demonstrate checks can fail on genuine defects. Preserve the full suite inventory. No unconditional passes, fake input/counts or skipped assertions count as green. Existing Owner approval rules for changing/retiring tests still apply. | Planned lane, NOT STARTED by this record |
| Multi-seed green | All suites green on 5-10 recorded seeds at an exact source/data SHA, with full coverage and raw results for each seed. An incomplete watchdog run is not a pass. Exact seed set and suite inventory remain to be fixed in the approved brief; no silent omissions. | Planned; after ORG-0.2 green and honest checks |
| Deterministic world hash | ORG-4.2: repeated generation of the same inputs reproduces the recorded hash. Hash scope/version and golden evidence explicitly recorded. | Required phase exit evidence; not yet claimed |
| Load-time budget | A real load-time budget test with a stated start/end definition, scenario, hardware and numeric threshold. Threshold/procedure TBD for Owner approval; no invented pass limit. | Planned; hard exit gate |
| Save/load identical hash | Save the generated world, reload it and reproduce the IDENTICAL canonical world hash. Record seed, source/data SHA, save version, scenario and before/after hashes. | Planned; hard exit gate |

The first follow-on work in WBS-SPLIT (worldgen data contract, SRD weight fields, tunable densities, RMMZ separation) is **soft**, not another hard worldgen exit gate. The first gameplay priority is the WBS-SIM SIM-8 arrival/gather/hut/night slice and Owner fun assessment. Neither opens faction/society code under DEC-037.

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
| ORG-3.2 | Plan art throughput and a placeholder art policy for the playable slice: required asset categories, Owner production/review capacity, ordering, placeholder provenance/readability and replacement/approval criteria. Proposed rates and placeholder choices need Owner approval. No new art generation, integration or DW IDs. | DESIGN ONLY; implementation/production parked |
| ORG-3.3 | Plan a licensing register for EVERY reused repo or asset, its source/version/license and attribution obligations, including the SRD CC-BY credit line. Deus keeps watch on licensing and checks claims against sources. Link existing REL.10.03/REL.10.04 instead of creating a second provenance authority. No GPL/AGPL code copying. | DESIGN ONLY; no legal-compliance or reuse approval claim |

## ORG-4: Architecture (after ORG-0.2 green)
| ID | Task | Status |
|---|---|---|
| ORG-4.1 | Pillar merge as a build step: source modules in `game/js/src/<pillar>/`, `tools/build/merge_pillars.js` bundles them into the pillar plugin files, `tools/build/check_pillars.js` verifies (in CI). Old monoliths move to `_legacy/`. No-change proof: same tests, same determinism hash. Tag `pillars-v1`. | Parked |
| ORG-4.2 | Determinism hash: fixed seed -> hash of terrain, rivers, objects, camps, history; two runs match; stored golden hash; a lane that changes it declares it and gets Owner OK. Recorded on the green SHA and reused by the identical-hash save/load gate. This is a HARD gate before leaving worldgen. | Planned execution after ORG-0.2 green; no implementation opened by the design record |
| ORG-4.3 | Performance budget: title load, frame time at z+8 and zoomed out on a fixed seed; baseline in `tools/tests/perf/baseline.json`; >10% regression fails. | Parked |
| ORG-4.4 | Sim/render split design doc (`docs/architecture/SIM_RENDER_SPLIT.md`), design only. Detailed lanes in `docs/WBS_SPLIT.md`. | Parked |

Current order: existing ORG-0.2 repair/review first, with already-authorized isolated support work. After ORG-0.2 green, satisfy ALL worldgen exit gates above before leaving worldgen. Then prioritize the playable SIM-8 slice, with soft first-follow-on WBS-SPLIT work planned to support it; do not stack the rest of WBS-SIM or the older pillar program ahead of the fun assessment. Frozen implementation still needs Owner release under DEC-037. Pillar merge, cleanup, art production and other parked work do not reopen automatically.

Why the player cares: the world must load reproducibly, preserve itself through save/load and be checked by real tests before a small playable loop is judged. Licensing and art plans keep that loop's assets traceable without authorizing production now. Research/draft content stays under [docs/research/](research/README.md) until explicit Owner approval.
