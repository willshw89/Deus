## What changed
- `game/js/sim/society/DEUS_Treasury.js`: rejected unsafe cross-account category aggregates and unsafe left/right accounting-equation totals during validation, before transition acceptance or serialization; reused that aggregation in balance-sheet derivation; replaced locale-sensitive ordering with explicit UTF-16 code-unit ordering; and classified non-integer numeric/BigInt transition amounts as `E_INTEGER` before policy-limit checks.
- `tools/society/test_treasury.js`: added boundary states, transition atomicity checks, negative fixtures, and independent provocations for cross-account category overflow and both equation-side overflows; exercised every public state-consuming API on accepted boundary states; checked deterministic ordering and precise integer errors; and replaced the synthetic hidden-mutation check with a frozen caller input passed to the real module.
- `docs/systems/DEUS_Treasury.md`: documented aggregate-safe validation, accepted-state API closure, code-unit ordering, and integer-error precedence.
- `tasks/SOC.31.01/lane-bp/BRIEF.md` and `tasks/SOC.31.01/lane-bp/lane.json`: normalized task-local CRLF line endings to LF and removed only `BRIEF.md`'s terminal blank line; normalized-content comparison reports no non-whitespace change.
- `tasks/SOC.31.01/lane-bp/state.md`: recorded the correction handoff and foreground gate results.
- `tasks/SOC.31.01/lane-bp/REPORT.md`: replaced the pre-review writer evidence with this correction evidence for failed independent review `review_grok_6a6cd351.md` at review commit `27a9a749`.

## How I tested it
- `node --check game/js/sim/society/DEUS_Treasury.js` (foreground preflight): no output; `EXIT=0`.
- `node --check tools/society/test_treasury.js` (foreground preflight): no output; `EXIT=0`.
- `node tools/society/test_treasury.js` (required foreground gate): `RESULT: 131 passed, 0 failed`; `EXIT=0`.
- `node tools/check_deus_syntax.js` (required foreground gate): `Checked 60 DEUS plugin files. Errors: 0`; `EXIT=0`.
- Ran `git diff --check` and audited every path changed from review commit `27a9a7491a7b105cd6bda9c7ff7abff3749b2034` against `lane.json` `allowedPaths`; the final audit result is recorded below.
- Compared both task-local files with their review-commit blobs after normalizing CRLF to LF and terminal newlines: both reported `FORMAT_ONLY_PASS`; `TASK_LOCAL_FORMAT_ONLY_EXIT=0`.
- Ran `git diff --check 368632d6 --` across the full SOC.31.01 task delta after removing the terminal blank line: `FULL_TASK_DIFF_CHECK_EXIT=0`.

## Evidence
- Screenshot: not produced. SOC.31.01 remains an isolated, unregistered CommonJS data/module lane with no visual acceptance criterion or authorized RMMZ integration.
- Log excerpt (copied from the real foreground output, trimmed):

```text
PASS aggregate.category_boundary.validate - accepted state validates
PASS aggregate.category_boundary.balance_sheet - {"balanced":true,"left":9007199254740991,"right":9007199254740991}
PASS aggregate.category_boundary.audit - {"balanced":true,"left":9007199254740991,"right":9007199254740991}
PASS aggregate.category_boundary.serialize - canonical state serialized
PASS aggregate.category_boundary.deserialize - serialized state loaded and validates
PASS aggregate.category_transition_rejected - [{"code":"E_INTEGER","message":"aggregate ASSET balance would exceed the safe integer range","path":"/transactions"},{"code":"E_INTEGER","message":"aggregate REVENUE balance would exceed the safe integer range","path":"/transactions"}]
PASS provocation.cross_account_category_aggregation.killed - [{"code":"E_INTEGER","message":"aggregate ASSET balance would exceed the safe integer range","path":"/transactions"},{"code":"E_INTEGER","message":"aggregate REVENUE balance would exceed the safe integer range","path":"/transactions"}]
PASS aggregate.equation_boundary.validate - accepted state validates
PASS aggregate.equation_boundary.balance_sheet - {"balanced":true,"left":9007199254740991,"right":9007199254740991}
PASS aggregate.equation_boundary.audit - {"balanced":true,"left":9007199254740991,"right":9007199254740991}
PASS aggregate.equation_boundary.serialize - canonical state serialized
PASS aggregate.equation_boundary.deserialize - serialized state loaded and validates
PASS aggregate.equation_transition_rejected - [{"code":"E_INTEGER","message":"left accounting equation total would exceed the safe integer range","path":"/transactions"},{"code":"E_INTEGER","message":"right accounting equation total would exceed the safe integer range","path":"/transactions"}]
PASS provocation.equation_left_overflow.killed - [{"code":"E_INTEGER","message":"left accounting equation total would exceed the safe integer range","path":"/transactions"},{"code":"E_INTEGER","message":"right accounting equation total would exceed the safe integer range","path":"/transactions"}]
PASS provocation.equation_right_overflow.killed - [{"code":"E_INTEGER","message":"left accounting equation total would exceed the safe integer range","path":"/transactions"},{"code":"E_INTEGER","message":"right accounting equation total would exceed the safe integer range","path":"/transactions"}]
PASS integer.execute_fraction_reports_E_INTEGER - fraction is an integer-domain error, not an authority-limit error
PASS integer.repay_fraction_reports_E_INTEGER - fraction is an integer-domain error, not a debt-transition error
PASS integer.bigint_reports_E_INTEGER - non-Number integer cannot escape through JSON cloning
PASS ordering.persisted_accounts_code_unit - ["account.asset.I","account.asset.i"]
PASS ordering.balance_sheet_accounts_code_unit - ["account.asset.I","account.asset.i"]
PASS negative.every_substantive_rule_has_fixture - 22 rules covered by 26 fixtures
PASS provocation.hidden_input_mutation.killed - real module call completed with frozen caller input unchanged
RESULT: 131 passed, 0 failed
EXIT=0

Checked 60 DEUS plugin files. Errors: 0
EXIT=0
```

- Final allowed-path/full-diff audit from review commit: `CHANGED_PATHS=8`; `ALLOWED_PATHS_PASS`; `ART_AUDIO_SCOPE_PASS`; `DIFF_CHECK_EXIT=0`; `FULL_TASK_DIFF_CHECK_EXIT=0`; `TASK_LOCAL_FORMAT_ONLY_EXIT=0`.

## Not done / known problems
- RMMZ editor F5 Playtest was not run. The brief forbids runtime plugin registration and this module is not loaded by RMMZ.
- F8 developer-console observation was not run for the same reason; no runtime integration was authorized.
- No screenshot was produced because this correction has no authorized visual/runtime surface.
- Financial execution still does not assert physical coin/item movement. Minting, Quartermaster stores, inventory reconciliation, payroll, tax calculation/collection, office-schema integration, save-host registration, and plugin registration remain out of scope.
- Interest, maturity, collateral, default, forgiveness, refinancing, restructuring, credit limits, fiscal periods, rates, denominations, exchange values, and opening-balance migration remain unavailable pending tracked authority; see `AUTHORITY_GAPS.md`.
- The repository syntax gate checks registered plugins, not this CommonJS module. The targeted treasury gate is the executable behavior evidence for the corrected module.
- `docs/STATUS.md` was not edited because it is coordinator-owned and outside this lane's exact `allowedPaths`; task-local claim and handoff state remain in `lane.json`, `BRIEF.md`, and `state.md`.
- Fresh independent re-review and PM fresh-clone reproduction have not occurred in this correction session.

## Try it in RMMZ
1. No RMMZ test step is available for this isolated lane; do not register the module as a plugin or alter `game/js/plugins.js`.
2. From the repository root, run `node tools/society/test_treasury.js`.
3. Run `node tools/check_deus_syntax.js`.

Expected: the targeted gate prints `RESULT: 131 passed, 0 failed`, and the syntax gate prints `Checked 60 DEUS plugin files. Errors: 0`. RMMZ behavior remains unchanged until a later authorized integration task loads the module.

## Decisions needed
- No decision is required for independent re-review of this bounded correction.
- Any later integration needing currency standards, rates, fiscal periods, office jurisdiction rules, debt terms beyond principal, physical settlement, opening-balance migration, or audit compaction still requires tracked authority; the unresolved list remains in `AUTHORITY_GAPS.md`.
