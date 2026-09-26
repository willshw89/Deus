# Lane AJ Brief: OPS.10.04 merge_gate LF clones

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-aj | **Task ID:** OPS.10.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`) | **Branch:** task/lane-aj | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-aj` | **Writer:** grok (grok-4.7, reasoning effort xhigh, multi-agent on) | **Reviewer:** gemini (gemini-3.8-flash thinking HIGH before 19:05 CT; gemini-3.1-pro-preview HIGH after) | **Size:** S | **Base:** origin/main `4ce80fa8b1844ff2eeae86dc437a0d9e1aa25871` | **Source:** Directive 0080-CC (minted by Gemini 9c0e7b57); Lane Y escalation; PM CRLF ruling 10:40 CT (16dea77c). PM brief 2026-09-26 12:3x CT (main-chat ops for the Owner). Launch gate: none (WBS deps met; write set disjoint from live Lanes AA and AH).

## Facts (PM)
- `merge_gate.js` runs each gate test in a fresh clone (`makeClone`: `git clone --quiet --shared --no-checkout <commonDir> <dest>` then checkout). On this Windows machine the clone inherits `core.autocrlf` from the user/global config, so byte-sensitive suites see CRLF files and fail (Lane Y: escalation.md, PM ruling 10:40 CT; Lane Z 12:00 CT gate run refused with TEST_FAILED while the same suites passed on an LF worktree of the same merge tree).
- Baseline: `node tools/governance/test_merge_gate.js` -> `RESULT: 105 passed, 0 failed` on main a3b3ed00 (236 s).

## Scope
1. Make every clone/checkout merge_gate creates LF-faithful: pass `-c core.autocrlf=false` (and neutralise `core.eol`/`core.safecrlf` if needed) on the clone and set it in the clone's local config before checkout, so the checked-out bytes equal the committed blobs regardless of the caller's global config.
2. Add a regression test in test_merge_gate.js that sets `core.autocrlf=true` in the environment the gate runs under (e.g. `GIT_CONFIG_GLOBAL` pointing at a temp config, never the real user config) and proves (a) a byte-sensitive fixture test passes through the gate and (b) a mutant that drops the flag is killed.
3. Document the behaviour in MERGE_GATE.md. Change nothing else in the gate's decisions (scope, review, tests, pushed, main checks stay identical).
4. Never modify the real user/global git config; use temp configs only.

## allowedPaths (exact; mirrored in lane.json)
- `tools/governance/merge_gate.js`, `tools/governance/test_merge_gate.js`, `tools/governance/MERGE_GATE.md`, `tasks/OPS.10.04/**`
**FORBIDDEN:** everything else, including `check_claims.js`, `launch_worker.ps1`, every `*WBS*.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`.

## Acceptance
- test_merge_gate.js passes with the new regression cases (count >= 105 + new); output pasted in REPORT.md.
- REPORT.md: what changed, evidence (including a run under a temp autocrlf=true global config), open Owner questions, PROPOSED-AJ-NN follow-ups.
## Gate tests
- `node tools/governance/test_merge_gate.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art (no images of any kind), and never tell anyone to.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AJ-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Throwaway clones only under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/OPS.10.04/lane-aj/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing.
7. Do not merge; do not self-certify. An independent review by a different AI family (Gemini, launched later by the PM) decides.
8. Push only your own branch (`git push origin task/lane-aj`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
9. Multi-agent is on: use subagents for independent research/verification where it helps, but you own every commit.