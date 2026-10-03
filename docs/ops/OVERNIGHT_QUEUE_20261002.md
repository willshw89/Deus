# Overnight queue, 2026-10-02 to 2026-10-03 CT

Authority: Owner's overnight directive; approximately 23:15–07:00 America/Chicago. Codex PM will write `MORNING_REPORT.md` at 07:00 CT from retained evidence. No merges, force pushes, deletes or main pushes. Normal lane pushes may target only `task/*` and `org/*`. One writer per lane and different-family reviewers. Blocked items are parked rather than waiting for the sleeping Owner. No expansion beyond this queue or the existing approved ORG-0.2 scope.

| Order / lane | Assignment | Branch / checkpoint at recovery | Dispatch / blocker |
|---|---|---|---|
| 1 ORG-0.2 | Claude Fable 5.1 max writer; Grok 4.7 xhigh reviewer | `task/org-0.2-worldgen-green`, `c58d0a460a65316d5a4bfa3965047863995d4e22` | Writer launched 2026-10-02 23:24:44 CT. Split watchdog per suite, approved river contract/NaN clearance, full seed 1920951434/year 500 suites, then individual real failures. One fix/commit/run; park after two unsuccessful fixes. |
| 2 ORG-0.2 triage | GPT-6-sol ultra, analysis only | Same source; output `scratchpad/org-0.2/triage/` | Runtime read-only. Reconcile when full-run failures arrive; no independent-review verdict from triage. |
| 3 ART-SCALE-1 docs | Codex PM source recovery | `task/art-scale-1-docs`, `0c94cb23a2b7484ec6e1bf6d6d585be4257fee7a` | PARKED: exact 22:42 CT ship/spell-surface/water trim wording was not recovered from decision files, lane notes, mailboxes or available session records. No inferred change. Earlier approved matter/art documentation is already pushed. |
| 4 Research inventory / sprite findings | Codex/GPT research assistants, separate files | `task/github-tech-inventory`, base `0c94cb23` | Runtime/history read-only; only requested research documents change. No evidence yet for a million animated sprite benchmark; real smaller fixtures must not be substituted for that claim. |
| 5 ORG-0.3 | Grok 4.7 xhigh writer; Codex/GPT reviewer | `task/lane-plugin-audit`, `7a7bf3d4868fb8c4c7e8c714b0fae68e5f3c9da7` | Writer stopped 23:24:50 CT after audit `566eb5ec`. Native attempt ended 23:03:34 CT without RESULT; full acceptance remains blocked. Gemini remains parked after prior unsupported-client and API spending-cap failures. |
| 6 Setup | Grok (Deus) original setup writer; Codex/GPT reviewer of that work | `org/setup-2026-10-02`, `6b9ec844158c969a144ffae67f2061ebcb7b4f9a` | Recheck remaining findings and prepare PR text. Later Codex-authored design documents need a different-family reviewer. No merge. |

The report lane is `task/overnight-2026-10-02`, based on `0c94cb23`, with a sparse documentation worktree at `.deus_worktrees/overnight-report`. It does not change main or the runtime. Native runs are serialized and ORG-0.2 has priority. Runtime stays frozen outside approved repairs; DEC-037 faction/society restrictions remain.

## Preserved refs and direct-main incident

Read at 2026-10-02 23:26 CT: main `038a02c35922df825fd7d47d948d7747d4e56755`; stash 0 `2005b4d9be9318d082b344475e6365fc406e362f`; stash 1 `4699f7b28df96b84a311f1ea91b9c216de2185ca`; backup `3c6e2bbab70b7cc0b9d2604a0d10bcecf9a05caf`. No ref was moved during this recovery.

Commit `038a02c3` was made by Codex PM, recorded as `deus-pm <deus-pm@local.invalid>` at 2026-10-02 20:59:51 CT, subject `[codex] Record depth presentation after world-load green`. Its entire diff adds four lines to `docs/STATUS.md` and nine to `docs/VISION.md`. It records the queued depth direction; it changes no runtime code. It went directly to main rather than through a lane/PR, which was a PM process error. Git proves the author, changes and direct-main history; it does not record a separate justification for bypassing review. No revert or force operation is authorized or performed. All subsequent work in this run uses lane branches.

## Evidence policy

Record real command output, exact tested SHA, seed/year, CT start/end, exit status and all RESULT lines. A missing RESULT is written as missing, never replaced with counted partial PASS lines. A zero-error or green claim needs a full result. Provider usage is reported from actual logs where available; missing totals and subscription headroom stay unknown. A model switch requires the fallback SOP checkpoint, normal task-branch push, handoff, preserved logs, and a newly eligible cross-family reviewer. No model is impersonated and no provider switch has occurred in this overnight dispatch as of this initial record.
