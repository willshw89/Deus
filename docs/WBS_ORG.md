# WBS-ORG: Repo Organization & Architecture Hardening
Recorded 2026-10-02 by Codex (PM). Authority: the Owner explicitly adopted the attached WBS and supplied the amendment in this conversation. WBS-ORG plus that amendment supersede the earlier PART 2 pillar-merge plan. This file records approved scope and dependencies; it does not certify any lane complete.

**Current priority (Owner, 2026-10-02 19:09 CT):** one goal: the world loads and renders correctly on main. Active sequence: ORG-0.1 baseline report -> ORG-0.2 worldgen green (Claude writer; Grok or Gemini reviewer) -> light ORG-1.1/1.2 gatekeeping -> ORG-4.2 determinism on the green world. Everything else waits. The reset overrides the earlier parallel organization schedule below.

**ORG-0.2 repair order:** (a) DEUS_History.js:536 error that stops worldgen; (b) nw.exe exit before RESULT; (c) rivers=0; (d) objects below 2,500 (handoff: 1,741; this session: 1,727); (e) camps 5/8; (f) area map, regrow timers, arena, colonist count and kit stone/straw. Fix causes; never loosen a test to obtain PASS. If a test is wrong, propose the change to the Owner with a written reason before changing it.

**Parked:** WBS-SIM in full, including SIM-3.2 and SIM-4.5 professions; ORG-4.1 pillar merge; ORG-4.3 performance budget; ORG-4.4 sim/render design; ORG-2.6 pruning; ORG-2.7 OneDrive move; and the 15 performance lanes. Other organization work not in the active sequence waits too. ORG-1.1 is an Owner branch-protection action; ORG-1.2 is a small Grok lane for node --check plus the WBS check.

**Goal acceptance:** run_tests.bat all green on main; boot into a generated world with rivers, objects and camps at expected counts; the Owner sees it in-game. The report gives branch, exact SHA, actual RESULT lines and an inspected screenshot of the loaded world. A documentation commit or passing selected suite is not this acceptance.

**Architecture gates retained for later:** expected red is limited to non-game-logic ORG-1/2/3 work when resumed; ORG-0.2 must be green before ORG-4.1/4.2/4.3. After pillars-v1, editable code lives in game/js/src/<pillar>/ and the nine plugin files are generated output. Retiring any test requires Owner sign-off with a written reason.

**Current observation:** see [ORG-0.1 baseline report](baseline/BASELINE_565dc5ae.md). The tests are red/incomplete; no baseline-green or pillars-v1 tag has been created. The WBS_INDEX entry is deferred to ORG-2.1, which creates that index.

Owner-approved scope. You are PM. Assign writers per roster (Claude = hard lanes, Grok = mechanical lanes, Gemini = narrow lanes with references). Review always by a different model family than the writer. Nothing merges to main without passing gate tests + cross-family PASS review + a CONFIRMED Deus claim check. Every lane report must include: branch, final SHA, exact test command, and pasted RESULT output. Standing rules still apply: no force-push or branch deletion without Owner OK; do not touch game/js/libs/, art/sprites/, PROVIDER_USAGE_STATUS.json; DEC-037 freeze (no faction/society work) stays in force.

Save this WBS as docs/WBS_ORG.md and add it to docs/WBS_INDEX.md (created in ORG-2.1).

=== PHASE ORG-0: Baseline (report gates organization; green gates architecture) ===
ORG-0.1  Baseline report (Codex, no writer)
  - On origin/main 565dc5ae: run run_tests.bat, record every suite pass/fail, list the ~10 failing tests (arena, regrow timers, colonist count, area map, rivers=0, kit stone/straw, objects 1741 vs 2500, camps 5/8, worldgen error at DEUS_History.js:536, nw.exe exits before RESULT).
  - Output: docs/baseline/BASELINE_565dc5ae.md with SHA + raw RESULT lines.
  - Done when: Owner has the report; known-failing list is frozen as the "expected red" list for ORG-1, ORG-2 and ORG-3 lanes ONLY; those lanes must not touch game logic. Unreached suites remain explicitly unchecked.

ORG-0.2  Baseline green — Claude (hard), review: Grok
  - Fix every test on the expected-red list on top of 565dc5ae, or obtain Owner sign-off to formally retire a test with a written reason. No silent retirement or weakened assertion.
  - Done when run_tests.bat shows all suites passing; report branch, origin-visible SHA, commands and real RESULT lines. Full gate tests also pass.
  - ORG-4.1, ORG-4.2 and ORG-4.3 may not start before this is green. Golden hash and performance baseline are recorded on the green SHA.

=== PHASE ORG-1: Gatekeeping (do first) ===
ORG-1.1  Branch protection on main (Owner action, Codex writes instructions)
  - Require PR, 1 approving review, required status check "ci", no direct pushes, no force-push.
  - Done when: Owner confirms settings screenshot; a test direct push is rejected.

ORG-1.2  Basic CI — Grok (mechanical), review: Claude
  - Add .github/workflows/ci.yml on push + PR:
    a) node --check on every game/js/plugins/*.js and tools/**/*.js
    b) WBS integrity check (existing script, or new tools/ci/check_wbs.js)
    c) pillar check (tools/build/check_pillars.js once ORG-4.1 lands; skip-if-missing until then)
  - Done when: CI green on a no-op PR, red on a PR that adds a syntax error.

ORG-1.3  Headless tests in CI — Claude (hard), review: Grok or Gemini
  - Investigate running NW.js headless on a GitHub runner (windows-latest or xvfb on ubuntu). If feasible, run run_tests and compare against the ORG-0.1 expected-red list; fail only on new failures.
  - If not feasible, document why in docs/ci/HEADLESS.md and propose a self-hosted runner on the Owner's laptop.
  - Done when: either CI runs the suite, or the doc + proposal is delivered.

ORG-1.4  Report standard — Codex
  - Add to AGENTS.md: every lane report states branch, SHA, test command, pasted RESULT. Reports without these are rejected.

=== PHASE ORG-2: Repo hygiene (mechanical, Grok, review: Claude or Gemini) ===
ORG-2.1  One WBS index
  - Create docs/WBS_INDEX.md linking every WBS (docs/worldgen, docs/society, docs/art, root WBS_OPTIMIZATION_PHASE.md → move to docs/optimization/). Mark status per WBS.
  - Retire update_wbs*.js scripts (move to archive/); WBS files are edited directly from now on.

ORG-2.2  Root cleanup
  - Move ~90 stray root files (fix*.js, patch*.js, replace_script*.js, update_*.js, temp*, test_*.js, stray PNGs, zips, _procs.txt) to archive/root-2026-10/ with git mv where tracked. Nothing deleted.
  - Done when: root contains only project files (game/, docs/, tools/, art/, AGENTS.md, README, package files, run_tests.bat, etc.) and tests are unchanged vs baseline.

ORG-2.3  .gitignore
  - Add: scratch/, scratchpad/, tmp/, temp_*, test_wang*, *.log, test_output/, game/error_stack.txt. Keep .pixellab_token ignored.
  - Done when: git status is clean after a test run.

ORG-2.4  Script location rule
  - AGENTS.md: agents may only create scripts under tools/ (permanent) or scratchpad/<lane-id>/ (throwaway). CI check (tools/ci/check_root.js) fails if new .js/.png/.zip appear in root.

ORG-2.5  Deus.exe out of git
  - git rm --cached Deus.exe, add to .gitignore, add a release step (docs/RELEASE.md) that attaches the build to GitHub Releases. Do NOT rewrite history (no filter-repo) without Owner OK; propose it separately with size savings estimate.

ORG-2.6  Branch pruning plan (Owner approval required before executing)
  - List all 212 branches + worktrees; classify merged / unmerged / backup. Never touch backup/pre-rollback-gemini-swarm-2026-10-02 or stash@{0}.
  - Output: docs/ci/BRANCH_PRUNE_PLAN.md. Execution only after pillars-v1 and Owner OK; tag each tip as archive/<branch> before deleting.

ORG-2.7  Move repo out of OneDrive (Owner action, Codex writes steps)
  - Steps to clone/move to C:\dev\Deus, re-point worktrees, verify run_tests.bat, then remove OneDrive copy only after Owner confirms.

=== PHASE ORG-3: Agent rules consolidation (Codex writes, Claude reviews) ===
ORG-3.1  AGENTS.md is the only rulebook
  - Rewrite for current setup: Codex = PM; writer roster; cross-family review; Gemini narrow-lane writer and cross-family reviewer; Owner relays to Gemini; standing rules; report standard; script location rule; GitHub references rule (1–3 repos per lane, no GPL/AGPL copying).
  - Remove old Gemini-coordinator and Nano Banana rules.
  - CLAUDE.md, GEMINI.md, .clinerules become one line: "Read AGENTS.md. It is the only rulebook."

=== PHASE ORG-4: Architecture ===
ORG-4.1  Pillar merge as a build step — Claude (hard), review: Grok + Codex
  - Source stays as small modules under game/js/src/<pillar>/. Soft size limit is about 1,500 lines per module; split anything bigger. tools/build/merge_pillars.js bundles them into the 9 pillar files in game/js/plugins/. tools/build/check_pillars.js verifies the bundle matches the sources.
  - Old monolith files go to _legacy/ (not deleted).
  - No-change proof: game behaviour identical vs baseline (same test results, same determinism hash from ORG-4.2).
  - Tag pillars-v1 after the pillar merge and ORG-4.3 pass, in the amended order below. Lanes after this edit src modules only, never hand-edit the bundled pillar files. CI runs tools/build/check_pillars.js and fails a PR when bundles differ from a fresh source build.
  - Done when: build reproducible, CI runs check_pillars, tests match baseline.

ORG-4.2  Determinism test — Claude, review: Grok
  - tools/tests/determinism: fixed seed in → hash of terrain, rivers, objects, camps, history out. Run twice, hashes must match; compare against a stored golden hash. Any lane that changes the hash must declare it and get Owner OK.
  - Done when: in CI/gate, fails on an intentional worldgen change.

ORG-4.3  Performance budget test — Claude, review: Gemini or Grok
  - Measure title-screen load time, frame time at z+8, frame time zoomed out, on a fixed seed. Store baseline in tools/tests/perf/baseline.json.
  - Gate fails if any metric regresses >10%. Lanes claiming speed-ups must show before/after numbers from this test.

ORG-4.4  Sim/render separation plan — Claude (design only), review: Codex
  - Design doc docs/architecture/SIM_RENDER_SPLIT.md: sim state (world, colonists, jobs, items, mass ledger) as plain data + logic with no RMMZ objects; renderer reads only. Identify current couplings, propose migration in small lanes, define Node-only test path for sim.
  - No code in this task; follow-up lanes get scheduled after Owner review.

=== EARLIER ORDER / DEPENDENCIES (superseded for current scheduling by the 19:09 CT reset) ===
ORG-0.1 → (ORG-1.x, ORG-2.x, ORG-3.1 in parallel, gated by expected-red) and ORG-0.2 in parallel → ORG-0.2 green → ORG-4.2 → ORG-4.1 → ORG-4.3 → tag pillars-v1 → ORG-2.6 execution (Owner OK) → ORG-4.4 → resume the 15 performance lanes.

The earlier amendment allowed the organization lanes and baseline repair to proceed together; the 19:09 CT reset now requires the active sequence at the top of this file and parks other work. If parallel work is later resumed, file lists must remain disjoint. The budget update allows up to 3–4 parallel lanes after pillars-v1. No multi-agent swarm modes. Branch protection and moving the canonical repository are Owner actions; no settings or files have been changed by recording this WBS.

=== DELIVERABLE BACK TO OWNER ===
After each phase: one short report with lane IDs, writers, reviewers, SHAs, test RESULT lines, and anything needing Owner action or approval.
## Current model, reference and claim rules

```text
BUDGET UPDATE (Owner, Fri Oct 2 6:53 PM CT): Owner has max/pro plans on all providers. Loosen budget, not process.
- PM (Codex): strongest OpenAI model at its highest single-agent effort.
- Writers: strongest model at highest effort for every lane except trivial mechanical ones (those stay High).
- Reviewers: strongest model, highest effort. Gemini Pro preferred over Flash.
- Parallel lanes: up to 3–4 at once after pillars-v1, still only with zero shared files.
- Unchanged: one writer per lane, cross-family review, Deus claim check before merge, tests must reach RESULT, no multi-agent "swarm" modes, no self-certification.
```

Every brief includes the PM-selected REFERENCES section: 1–3 exact GitHub files/functions selected and opened before the writer starts; the writer reads them before coding and maps new functions to the reference patterns in REPORT.md. No GPL/AGPL copying. Permissively licensed adaptation requires attribution. Missing references stop the writer for PM guidance.

Every completion claim names task, branch, origin-visible SHA, files, exact new symbols and existing callers, real command/RESULT output, measurement method for performance, and all untested/unwired work. Deus PARTIAL/FALSE holds integration regardless of review. The Owner resolves disagreement between Deus and the reviewer.
