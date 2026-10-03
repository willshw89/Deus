# Setup PR preparation, 2026-10-02 CT

Branch: `org/setup-2026-10-02`. Prepared against `6b9ec844158c969a144ffae67f2061ebcb7b4f9a`. No PR has been opened: the Owner's instruction to open it once it passes is not yet satisfied. No merge is authorized overnight.

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
| Current staffing policy | `AGENTS.md:17` still requires Owner relay for Gemini; `:28` limits lanes to one or two. The 21:16/21:20 Owner instructions authorize isolated concurrent lanes and direct Codex dispatch. | Reconcile these lines with the current instruction, without overwriting unrelated Owner edits. |
| Fallback SOP link | Setup has `docs/ops/HANDOFF_TEMPLATE.md`, but lacks `docs/ops/USAGE.md` and the requested AGENTS link. The SOP is on the ORG-0.2 branch. | Coordinate the policy copy/link after the ORG-0.2 writer releases its files; do not merge or cherry-pick overnight. |
| Native acceptance | At original setup source `2ffa0d3a`, seed 1920951434/year 500, `RESULT: 152 passed, 25 failed (exit 2)`; the global 180-second watchdog interrupted jobs. Runtime/runner bytes have not changed between that source and `6b9ec844`. | A complete green native result remains required. Do not relabel this incomplete result as a CI regression or success. |
| Independent review | Codex's existing review covers Grok (Deus) source `2ffa0d3a`. Owner repair `da9e6906` and Codex-authored template/design docs followed. | Refresh review at the final SHA; an independent family must review Codex's additions. The six fresh probes validate the specific checker repair, not the entire branch. |
| Laptop claim check | No Deus verdict found for the final setup branch. | Deus must return CONFIRMED before any later merge. |

The Owner previously said they would fix setup findings on this branch. This preparation therefore preserves its clean files and records the remaining work rather than making competing edits while the Owner is asleep.

## CI coverage boundaries

The GitHub workflow runs syntax and root hygiene only. It does **not** run behavioral tests, `run_tests.bat`/NW.js, controlled seed/year acceptance, RMMZ F5/F8 checks, JSON/schema/data/asset correctness, WBS/claim invariants, or `merge_gate`. The fixture omission within the promised syntax scope was reproduced before the repair and is now fixed in the six local probes. That distinction does not broaden this workflow into a game-acceptance gate.

## Probe evidence

See [commands, output and exit codes](evidence/setup_ci_negative_probes_20261002.md). All six cases used the actual `tools/ci/syntax_check.js` from the setup worktree, with synthetic roots under the canonical repository's scratchpad. No setup file or runtime was edited; no native run was launched. The setup branch was clean after the checks.
