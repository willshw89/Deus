# Lane AI Brief: OPS.30.06 Catalogue test repair on main

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-ai | **Task ID:** OPS.30.06 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`) | **Branch:** task/lane-ai | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-ai` | **Writer:** grok (grok-4.7, reasoning effort xhigh, multi-agent on) | **Reviewer:** gemini (gemini-3.8-flash thinking HIGH before 19:05 CT; gemini-3.1-pro-preview HIGH after) | **Size:** S | **Base:** origin/main `4ce80fa8b1844ff2eeae86dc437a0d9e1aa25871` | **Source:** Directive 0080-CC (minted by Gemini 9c0e7b57); failures first seen at fb5391fa / 176bffe4. PM brief 2026-09-26 12:3x CT (main-chat ops for the Owner). Launch gate: none (WBS deps met; write set disjoint from live Lanes AA and AH).

## Facts (PM, main a3b3ed00, 12:25 CT)
- `node tools/art/test_catalogue.js` -> `46/47 checks passed`; the failure is `catalogue.rebuild_identical`: run1 vs run2 differ none, but fresh build vs committed differ in `art/catalogue/catalogue.json`, `art/catalogue/conflicts.md`, `docs/art/catalogue/INDEX.md`.
- `node tools/art/build_catalogue.js --check` -> `CHECK: FAILED (3 file(s) differ from a fresh build)` (same three files).
- Lane S (WG.20.02) built the catalogue and was merged at 9cba41ea; later merges changed its inputs (or line endings) so the committed outputs are stale ("catalogue pin").

## Scope
1. Find the root cause of the drift (stale generated outputs after later input changes, CRLF vs LF, non-determinism, an input that moved). Record it with evidence in REPORT.md.
2. Fix it the honest way: if the committed outputs are merely stale, regenerate them with `build_catalogue.js` and show the diff is explained by the input change; if the builder is wrong or not EOL-stable, fix the builder (and add a regression check). Do not delete or weaken the rebuild_identical check.
3. Both tools must exit 0 on an LF checkout (`git clone -c core.autocrlf=false`) and on this worktree.
4. Catalogue data and tooling only. No image files, no art, no new slots or entries beyond what the builder derives from existing inputs. The Owner's 12:12 CT slope/ramp slot flag is being recorded in the WBS by Gemini; do NOT add slope/ramp entries here.

## allowedPaths (exact; mirrored in lane.json)
- `art/catalogue/*.json`, `art/catalogue/*.md` (generated/manifest text only; no images)
- `docs/art/catalogue/**`
- `tools/art/build_catalogue.js`, `tools/art/test_catalogue.js`, `tools/art/fixtures/catalogue/**`
- `tasks/OPS.30.06/**`
**FORBIDDEN:** everything else, including any `*.png`/image, `art/masters/**`, `art/templates/**`, every `*WBS*.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, gate tools.

## Acceptance
- Both tools exit 0; test_catalogue shows 47/47 (or more, never fewer checks). Output pasted in REPORT.md.
- REPORT.md: root cause, what changed, evidence, open Owner questions, PROPOSED-AI-NN follow-ups.
## Gate tests
- `node tools/art/test_catalogue.js`
- `node tools/art/build_catalogue.js --check`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art (no images of any kind), and never tell anyone to.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AI-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Throwaway clones only under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/OPS.30.06/lane-ai/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing.
7. Do not merge; do not self-certify. An independent review by a different AI family (Gemini, launched later by the PM) decides.
8. Push only your own branch (`git push origin task/lane-ai`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
9. Multi-agent is on: use subagents for independent research/verification where it helps, but you own every commit.