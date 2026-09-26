# Lane AH Brief: SIM.60.06 Combat stress benchmark with real SRD combat

**STATUS: OPEN. Launch gate met (SIM.60.05 / lane-ab merged 343191b5557d6943524792820c23bdc19238e7e4). Writer grok / reviewer gemini (Claude weekly>=97%, Codex exhausted).**

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-ah | **Task ID:** SIM.60.06 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`, Rev 26) | **Branch:** task/lane-ah | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-ah` | **Writer:** grok | **Reviewer:** gemini | **Size:** M | **Base:** origin/main `343191b5557d6943524792820c23bdc19238e7e4` (set at open time) | **Source:** Directive 0062-BK; DEC-027. WBS dep SIM.60.05. PM brief prepared 2026-09-26 by main-chat ops for the Owner.

## LAUNCH GATE (all must be true)
1. SIM.60.05 (Lane AB) merged to main with its independent review PASS.

**Provider at launch:** Claude writer / Grok reviewer after the Tue reset, or Grok writer / Claude reviewer if Lane AB merges earlier. Every worker runs the strongest model at max effort (pm_ops `top_models.ps1`: Claude `--model claude-opus-5-5[1m] --effort max`; Grok `--model grok-4.7 --reasoning-effort xhigh`; Codex `-m gpt-6-astra -c model_reasoning_effort=ultra`).

## allowedPaths (exact; mirrored in `tasks/SIM.60.06/lane-ah/lane.json`)
- `tools/bench_combat_srd.js`
- `tools/bench/combat_srd/**`
- `tasks/SIM.60.06/**`

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/sim/ledger*` (unless escalated and granted), `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool, and `art/**`.

## Scope
1. Re-run the WG.00.09b stress benchmark with real SRD combat (UF.Rules from SIM.60.05) and SRD stat-block units.
2. Report simulation resolution cost separately from rendering cost; verify the 60 FPS target; prove zero per-frame full scans (instrumented counters).
3. `tools/bench_render_layers.js` is read only: build a new `tools/bench_combat_srd.js`. Heavy NW.js runs only in %TEMP% clones, with machine load recorded and a same-session base rerun.

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-AH-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).

## Gate tests
- `node tools/bench_combat_srd.js --self-test`
- `node tools/rules/test_srd_rules.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art, and never tell anyone to.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AH-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/SIM.60.06/lane-ah/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing.
7. Do not merge; do not self-certify. An independent review by a different AI family (launched later by the PM) decides.
8. Push only your own branch (`git push origin task/lane-ah`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
