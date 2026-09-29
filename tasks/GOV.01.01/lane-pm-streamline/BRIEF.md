# BRIEF: lane-pm-streamline (GOV.01.01, provisional id)

Written 2026-09-29 by the PM (Claude Code, DEC-042). Branch `task/lane-pm-streamline`, base `5b300427`; main moved to `e1554c63` while the lane was written, so the lane is rebased onto `e1554c63` before the gate.

## Scope
Rewrite the process documents so that every agent reads one rulebook (`AGENTS.md`), one digest of live Owner decisions (`docs/DECISIONS_DIGEST.md`), one Now page (`docs/STATUS.md`) and its lane brief, with `docs/OWNER_DECISIONS.md` and `docs/ENGINE_RULES.md` as reference. Mark superseded art, engineering and ops documents with dated banners that name the replacing rule ids and DEC numbers. Correct `tasks/wbs_registry.json` to the Definition of Done vocabulary. No game code, no tools, no art. Six writer passes (rulebook, decisions, status, engineering, art, ops) plus one pass applying the two reviewers' findings, all by Claude on 2026-09-29.

## Owner authorization
Owner answers of 2026-09-29 relayed by the workflow harness ("1. purge history; 2. use judgement; 3. use judgement; 4. high topdown; 5. Yeah") and the Owner's 2026-09-29 statements recorded in `docs/OWNER_DECISIONS.md` (DEC-007 amendment, DEC-040 clarification, DEC-042, DEC-043, DEC-044). The WBS id GOV.01.01 is provisional: NOT YET APPROVED as a leaf under `AGENTS.md` Rule 6 (`docs/STATUS.md` D.10). Answer 1 was applied to the digest (no history in it), not to git history (DEC-029 stays LIVE; `docs/STATUS.md` D.9).

## Files
`lane.json` `allowedPaths` (63 files plus this folder). One writer per file set: this lane is the only writer of those files; the main working copy at `C:\Users\snewt\OneDrive\Desktop\UF` was never touched.

## Exit
L1 (docs lane): the four `gateTests` in `lane.json` pass on the writer tip in a fresh clone; an independent Grok review (never Claude) PASSes that SHA; `merge_gate.js` dry run, then the real run. Expected gate results on 2026-09-29 in the worktree: `check_deus_syntax.js` 62 files 0 errors, exit 0; `test_check_claims.js` 279 passed 0 failed, exit 0; `check_invariants.js` active=9 pass=9 fail=0, exit 0; registry parse PASS.

## Open questions for the Owner (recorded in `docs/STATUS.md` D)
Layer height (DEC-013 / DEC-038 vs the art SOP; D.5); the four `[grok]` reviews authored `deus-ops` (D.8); "purge history" and the governance-records-to-main boundary (D.9); provisional WBS ids (D.10); the DEC-019 stratum shift vs retired 2.5D offsets (digest line for DEC-019).

```text
GAME TRANSLATION

WBS / Lane: GOV.01.01 (provisional) / lane-pm-streamline
Approved scope / Owner authorization reference: Owner answers 2026-09-29 (above); DEC-042; leaf id NOT YET APPROVED
Writer SHA / evidence date: working tree on 2026-09-29 (no commit yet; the PM commits this manifest with a [pm] subject first)
Translation Class: C FOUNDATIONAL / INDIRECT

Player / World Effect:
None directly. Agents follow one rulebook and one decision digest, so lanes that do change the game are opened, reviewed and merged under the same rules.

Trigger:
Every agent session start (read order in AGENTS.md).

Runtime Authority:
None (documents and the WBS registry only).

Simulation Path:
None.

Engine Bridge:
None. N/A - documentation lane; no plugin, data or sim file changes.

Visible Result:
Nothing in the game. Observed: the rewritten files in the worktree; line counts within the caps (AGENTS.md 94 of 120, STATUS.md 72 of 80, DECISIONS_DIGEST.md 78 of 80, ENGINE_RULES.md within 150, ANTIGRAVITY.md within 100).

Persistence:
N/A - no save data.

Failure Without This Lane:
Agents keep reading five rule files that disagree (rule numbers, roles, art mandates, layer geometry), and the registry keeps calling headless-only leaves DONE.

Automated Proof:
lane.json gateTests (syntax, check_claims self-test, check_invariants, registry parse and no-DONE-without-F5 rule); results above; tested SHA to be filled by the reviewer.

In-Game Proof:
NOT RUN. N/A - no game change to show.

CONSUMED BY GAME SYSTEMS:
- None. Consumers are agents and the merge gate (tools/governance/merge_gate.js reads lane.json; tools/governance/check_claims.js reads docs/STATUS.md section E; tools/originality_check.js, tools/generate_asset_inventory.js and tools/switch_things_to_stock.js read the docs/STATUS.md Stand-ins section).

GAME BRIDGE STATUS
Simulation implemented: NO - N/A, documentation lane
Engine bridge implemented: NO - N/A, documentation lane
Presentation implemented: NO - N/A, documentation lane
Input/player interaction implemented: NO - N/A, documentation lane
Save/load implemented: NO - N/A, documentation lane
Playable verification performed: NO - N/A, documentation lane

Remaining step before player can experience it: none; this lane changes no gameplay.
```
