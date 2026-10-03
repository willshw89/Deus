# Setup PR preparation, 2026-10-02 CT

Branch: `org/setup-2026-10-02`. Prepared against `6b9ec844158c969a144ffae67f2061ebcb7b4f9a`. No PR has been opened: hygiene and review findings remain. No merge is authorized overnight. **Owner clarification: inherited expected-red game failures do not block hygiene/CI/docs lanes under WBS-ORG.** Native results remain disclosed evidence, not a requirement to repair the game on this branch.

Update 2026-10-03 01:46 CT: independent Claude Fable 5.1/max review is committed on separate `task/setup-crossfamily-review` at `9c575f015d6fb55cad577c2113a923f79a9d3576`: [review artifact](https://github.com/willshw89/Deus/blob/9c575f015d6fb55cad577c2113a923f79a9d3576/docs/reviews/SETUP_CLAUDE_6b9ec844.md). Codex additions pass with minor findings; overall PR readiness remains NOT READY. The Owner's branch is still clean at `6b9ec844`. The review also read GitHub CI run `37093237965` at that exact SHA as successful (Node 20); it did not rerun native acceptance.

## Proposed title

Establish lane governance, scoped syntax CI, and parked Owner design records

## Proposed body

The repository's lane rules and WBS plans were scattered, and the first syntax job skipped executable fixture code. This branch consolidates the rulebook and WBS index, adds root hygiene and JavaScript syntax CI, and limits the syntax exception to one deliberately invalid governance fixture. Syntax coverage includes `game/js/plugins.js`, plugin files, simulation modules and tools, including executable fixtures.

It also records the Owner's approved scale, backgrounds and feats, technology-tree direction, worldgen exit gates, research policy, art/licensing planning and first playable slice as design only. ORG-0.2 and DEC-037 continue to gate implementation. The fallback handoff template is included.

Validation currently available: syntax checked 1,166 files with zero failures and root hygiene passed in the recorded branch checks. Fresh negative probes against the repaired checker rejected malformed executable fixtures, simulation files, `plugins.js` and a malformed neighbor of the allowed invalid fixture. The exact allowed fixture was skipped; valid input passed. These probes used local Node 24.19.0, while GitHub CI uses Node 20. The controlled native result remains `RESULT: 152 passed, 25 failed (exit 2)` at seed 1920951434, year 500, interrupted by the global watchdog. The documentation and CI changes are not a native game fix.

Do not publish this body as a passing review. Resolve the preparation blockers below, rerun the affected checks and replace this validation paragraph with results for the final reviewed SHA before opening the requested PR.

## Remaining preparation blockers

| Item | Observed evidence | Required next step |
|---|---|---|
| Whitespace | `git diff --check 038a02c3 6b9ec844` reports the added `.gitignore:85–97` CRLF lines as trailing whitespace. | Owner's setup repair pass must normalize the affected additions and rerun the diff check. No unrelated normalization. |
| Evidence ignored by broad patterns (Claude C1) | New unanchored `.gitignore` patterns match 740 additional already-tracked paths: 721 logs, 17 `temp_*` art source files and two nested test-output files. Existing tracked files remain tracked, but future evidence additions require `-f`. | Owner to choose location-anchored patterns or an evidence carve-out before integration; preserve all existing evidence and art. |
| Current staffing policy | `AGENTS.md:17` still requires Owner relay for Gemini; `:28` limits lanes to one or two. The 21:16/21:20 Owner instructions authorize isolated concurrent lanes and direct Codex dispatch. Claude also flags `:6` as listing ORG-4.2 active while WBS-ORG parks it after ORG-0.2. | Reconcile these lines with the current instruction, without overwriting unrelated Owner edits. |
| Fallback SOP link | Setup has `docs/ops/HANDOFF_TEMPLATE.md`, but lacks `docs/ops/USAGE.md` and the requested AGENTS link. The SOP is on the ORG-0.2 branch. | Coordinate the policy copy/link after the ORG-0.2 writer releases its files; do not merge or cherry-pick overnight. |
| Native expected-red disclosure (not a PR blocker) | At original setup source `2ffa0d3a`, seed 1920951434/year 500, `RESULT: 152 passed, 25 failed (exit 2)`; the global 180-second watchdog interrupted jobs. Fresh main baseline `565dc5ae` produced `RESULT: 157 passed, 25 failed (exit 2)` with the same named failures, stopping later in jobs. Runtime/runner bytes have not changed between setup sources. | Keep the inherited result visible. Under the Owner's WBS-ORG clarification this CI/docs lane need not wait for ORG-0.2 game green. No runtime failure is excused in ORG-0.2 or other game-logic lanes. |
| Independent review | Codex's existing review covers Grok (Deus) source `2ffa0d3a`. Claude's independent review at `9c575f01` covers the later Owner repair and Codex additions at `6b9ec844`; Codex additions PASS with minors, branch NOT READY. | Refresh the affected review at the Owner's next fix SHA. The current review closes the family gap without clearing the substantive findings. |
| Laptop claim check | No Deus verdict found for the final setup branch. | Deus must return CONFIRMED before any later merge. |

The Owner previously said they would fix setup findings on this branch. This preparation therefore preserves its clean files and records the remaining work rather than making competing edits while the Owner is asleep.

After Owner CI commit `da9e6906`, there is exactly one setup-branch commit: `6b9ec844`, `deus-pm`, subject `[codex] Record Owner design decisions and parked WBS acceptance gates`, written by Codex/GPT. It changes AGENTS plus nine docs/WBS files (111 additions, 23 deletions), not runtime or CI. Codex's `56a888d4` review/template commit preceded `da9e6906` and is not a later addition.

## CI coverage boundaries

The GitHub workflow runs syntax and root hygiene only. It does **not** run behavioral tests, `run_tests.bat`/NW.js, controlled seed/year acceptance, RMMZ F5/F8 checks, JSON/schema/data/asset correctness, WBS/claim invariants, or `merge_gate`. The fixture omission within the promised syntax scope was reproduced before the repair and is now fixed in the six local probes. That distinction does not broaden this workflow into a game-acceptance gate.

## Probe evidence

See [commands, output and exit codes](evidence/setup_ci_negative_probes_20261002.md). All six cases used the actual `tools/ci/syntax_check.js` from the setup worktree, with synthetic roots under the canonical repository's scratchpad. No setup file or runtime was edited; no native run was launched. The setup branch was clean after the checks.
