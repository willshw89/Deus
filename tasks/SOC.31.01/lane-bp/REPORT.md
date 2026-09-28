## What changed
- `game/data/society/treasury.schema.json`: added the strict version-1 persisted financial state schema with closed object shapes, safe-integer amounts, explicit IDs/time domains, financial-only accounts, journal records, authorizations, executions, and principal debt records.
- `game/js/sim/society/DEUS_Treasury.js`: added the deterministic CommonJS treasury owner with balanced revenue, externally authorized expenditure, debt issuance/repayment, derived balance sheets, strict validation, canonical serialization, and immutable copy-on-write transitions.
- `docs/systems/DEUS_Treasury.md`: documented the bookkeeping identity, persisted shape, public API, save boundary, checks, authority inputs, physical-store separation, and integration limits.
- `tools/society/test_treasury.js`: added deterministic positive coverage, schema checks, a targeted negative fixture for each of 22 exported substantive validation rules, and the required seven adversarial provocations plus returned-state mutation blocking.
- `tasks/SOC.31.01/lane-bp/AUTHORITY_GAPS.md`: recorded the fiscal, authority, debt, currency, period, physical-settlement, migration, and retention decisions absent from tracked authority without inventing values.
- `tasks/SOC.31.01/lane-bp/state.md`: recorded the allowed-path claim constraint, isolation boundary, and handoff state.
- `tasks/SOC.31.01/lane-bp/REPORT.md`: recorded this writer evidence and known limits.

## How I tested it
- `node tools/society/test_treasury.js` (foreground): `RESULT: 102 passed, 0 failed`; `EXIT=0`.
- `node tools/check_deus_syntax.js` (foreground): `Checked 60 DEUS plugin files. Errors: 0`; `EXIT=0`.
- The treasury suite required and executed `game/js/sim/society/DEUS_Treasury.js`; the syntax gate scans the registered `game/js/plugins/DEUS_*.js` set and therefore does not substitute for the targeted module gate.
- Inspected the complete staged diff, then ran `git diff --cached --check`: `EXIT=0`.
- Audited every staged path against `lane.json` `allowedPaths`: `ALLOWED_PATHS_PASS`; no staged art or audio paths were present.

## Evidence
- Screenshot: not produced. SOC.31.01 is a headless, unregistered data/module lane with no visual acceptance criterion or authorized runtime plugin integration.
- Log excerpt (copied from the real foreground output, trimmed):

```text
PASS module.accounting_equation - {"balanced":true,"left":1000,"right":1000}
PASS negative.every_substantive_rule_has_fixture - 22 rules covered by 24 fixtures
PASS provocation.imbalance.killed - targeted detector fired
PASS provocation.duplicate_transaction_ids.killed - targeted detector fired
PASS provocation.unauthorized_expenditure.killed - targeted detector fired
PASS provocation.invalid_debt_transition.killed - targeted detector fired
PASS provocation.float_rounding_leakage.killed - targeted detector fired
PASS provocation.stores_treated_as_money.killed - targeted detector fired
PASS provocation.hidden_input_mutation.killed - mutation detector observed state and nested input changes
RESULT: 102 passed, 0 failed
EXIT=0

Checked 60 DEUS plugin files. Errors: 0
EXIT=0
```

## Not done / known problems
- RMMZ editor F5 Playtest was not run. The brief forbids runtime plugin registration and this module is not loaded by RMMZ.
- F8 developer-console observation was not run for the same reason; no runtime integration was authorized.
- Financial execution does not assert physical coin/item movement. Minting, Quartermaster stores, inventory reconciliation, payroll, tax calculation/collection, office-schema integration, save-host registration, and plugin registration remain out of scope.
- Interest, maturity, collateral, default, forgiveness, refinancing, restructuring, credit limits, fiscal periods, rates, denominations, exchange values, and opening-balance migration remain unavailable pending tracked authority; see `AUTHORITY_GAPS.md`.
- The repository syntax gate checks registered plugins, not this CommonJS module. The targeted gate is the executable syntax and behavior evidence for the new module.
- `docs/STATUS.md` was not edited because it is coordinator-owned and outside this lane's exact `allowedPaths`; `lane.json`, `BRIEF.md`, and `state.md` are the durable claim/handoff records.
- Independent Grok review and PM fresh-clone gate reproduction have not occurred in this writer session.

## Try it in RMMZ
1. No RMMZ test step is available for this isolated lane; do not register the module as a plugin or alter `game/js/plugins.js`.
2. From the repository root, run `node tools/society/test_treasury.js`.
3. Run `node tools/check_deus_syntax.js`.

Expected: the targeted gate prints `RESULT: 102 passed, 0 failed`, and the syntax gate prints `Checked 60 DEUS plugin files. Errors: 0`. RMMZ behavior remains unchanged until a later authorized integration task loads the module.

## Decisions needed
- No decision is required to review or merge the bounded SOC.31.01 module.
- Any later integration that needs currency standards, rates, fiscal periods, office jurisdiction rules, debt terms beyond principal, physical settlement, opening-balance migration, or audit compaction requires tracked authority first; the unresolved list is in `AUTHORITY_GAPS.md`.
