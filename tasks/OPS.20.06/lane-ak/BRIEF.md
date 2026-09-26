# Lane AK Brief: OPS.20.06 launch_worker review effort and gemini provider

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-ak | **Task ID:** OPS.20.06 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`) | **Branch:** task/lane-ak | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-ak` | **Writer:** grok (grok-4.7, reasoning effort xhigh, multi-agent on) | **Reviewer:** gemini (gemini-3.8-flash thinking HIGH before 19:05 CT; gemini-3.1-pro-preview HIGH after) | **Size:** S | **Base:** origin/main `4ce80fa8b1844ff2eeae86dc437a0d9e1aa25871` | **Source:** Directive 0080-CC (minted by Gemini 9c0e7b57); PM ruling on Gemini review paths; DEC-032 model standard (Owner 11:23 CT). PM brief 2026-09-26 12:3x CT (main-chat ops for the Owner). Launch gate: none (WBS deps met; write set disjoint from live Lanes AA and AH).

## Facts (PM)
- `tools/ops/launch_worker.ps1` (OPS.20.01, merged 62067d1c; hardened by WG.00.12b 425b594c) is called LIVE by the PM launchers for every running worker (lanes AA, AH). It already accepts `-ProviderExe`/`-ProviderArgs`/`-ProviderStdinPrompt`; the PM wrappers compute the model and effort outside the repo.
- Owner model standard (DEC-032, 11:23 CT): Claude standard `claude-opus-5-5[1m]` effort high, big `claude-fable-5-1` max; Codex standard `gpt-5.6-sol` xhigh, big `gpt-6-astra` ultra; Gemini `gemini-3.1-pro-preview` thinking HIGH; Grok `grok-4.7` xhigh. Effort floor: never below the tier standard; Grok never below xhigh. Multi-agent on by default.

## Scope
1. Add an optional `-Effort` parameter (low|medium|high|xhigh|max|ultra) that maps to each provider's CLI flag when `-ProviderArgs` is not given, applying the DEC-032 floor (raise, never lower). Explicit `-ProviderArgs` keeps working unchanged (backward compatible: every existing invocation must behave byte-identically).
2. Add `gemini` as a provider (writer and reviewer roles): default exe `gemini`, model and thinking level passed via args, prompt via stdin or file as the CLI requires. Document it; do not hard-code paths outside the repo.
3. Extend test_launch_worker.ps1 with cases for the effort mapping, the floor, the gemini provider and backward compatibility, each with a mutant that is killed. Tests must never launch a real model (stub exe only).
4. Do not change registry format, timeouts, or the pre-push guard.

## allowedPaths (exact; mirrored in lane.json)
- `tools/ops/launch_worker.ps1`, `tools/ops/test_launch_worker.ps1`, `tools/ops/README.md`, `tasks/OPS.20.06/**`
**FORBIDDEN:** everything else, including anything outside the repo (pm_ops scripts), `merge_gate.js`, `check_claims.js`, every `*WBS*.md`, `docs/STATUS.md`.

## Acceptance
- test_launch_worker.ps1 passes (no fewer cases than on main); output pasted in REPORT.md.
- REPORT.md: what changed, evidence, open Owner questions (e.g. whether reviews should route through the PM start_review wrapper), PROPOSED-AK-NN follow-ups.
## Gate tests
- `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_launch_worker.ps1`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art (no images of any kind), and never tell anyone to.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AK-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Throwaway clones only under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/OPS.20.06/lane-ak/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing.
7. Do not merge; do not self-certify. An independent review by a different AI family (Gemini, launched later by the PM) decides.
8. Push only your own branch (`git push origin task/lane-ak`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
9. Multi-agent is on: use subagents for independent research/verification where it helps, but you own every commit.