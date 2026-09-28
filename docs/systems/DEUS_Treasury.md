# DEUS treasury ledger

## Purpose

`game/js/sim/society/DEUS_Treasury.js` is the SOC.31.01 owner of persisted faction financial records. It produces auditable balance sheets, records externally determined public revenue, records expenditure authorization decisions before execution, and tracks principal-only debt issuance and repayment. It is a deterministic, host-agnostic CommonJS module: it reads no engine global, clock, filesystem, UI, random source, Quartermaster inventory, physical coin store, or mint state.

INV-SOC-06 is a type boundary, not a naming convention. Every account has `domain: "FINANCIAL"`; the only categories are `ASSET`, `LIABILITY`, `NET_POSITION`, `REVENUE`, and `EXPENSE`. The schema contains no store, item, food, material, denomination, or physical-quantity field. A posting records a financial event. It is not evidence that a coin item or other physical good moved.

## Bookkeeping identity

Every transaction contains exactly two one-sided postings and must satisfy:

```text
sum(debit) = sum(credit)
```

The derived balance sheet uses the neutral expanded accounting identity:

```text
assets + expenses = liabilities + net position + revenue
```

Assets and expenses have debit-normal balances. Liabilities, net position, and revenue have credit-normal balances. Balances are derived by replaying transactions; they are not separately persisted and cannot drift from the journal. All amounts are JavaScript safe integers (`0..9007199254740991`). Validation checks each posting accumulation, each account balance, every cross-account category aggregate, and both complete equation-side sums before a state is accepted. A state accepted by `create`, a transition, or `deserialize` is therefore safe for `validate`, `balanceSheet`, `audit`, `serialize`, and a subsequent `deserialize`. Floats, `NaN`, infinities, negative amounts, rounding, and overflow are refused with `E_INTEGER` before policy-limit or debt-transition checks.

New treasuries start at zero. There is no generic posting escape hatch: the only transaction kinds are produced by the revenue, authorized expenditure, debt issuance, and authorized debt-repayment transitions below. This prevents an `ADJUSTMENT` transaction from bypassing authorization or debt reconciliation.

## Persisted state

The strict JSON Schema is `game/data/society/treasury.schema.json`. The top-level record is:

| Field | Meaning |
|---|---|
| `schemaVersion` | Persisted schema version, currently integer `1`. |
| `treasuryId` | Stable treasury identifier supplied by the caller. |
| `factionId` | Stable owning faction identifier supplied by the caller. |
| `unitOfAccountId` | Opaque caller-supplied financial unit identifier. It is not a coin denomination or exchange standard. |
| `accounts` | Financial account definitions only. |
| `transactions` | Append-only balanced journal transactions. |
| `revenueEntries` | Public revenue facts and their policy/source references. |
| `expenditureAuthorizations` | External office/policy decisions and the amount consumed by executions. |
| `expenditureExecutions` | Executed general expenditures and debt repayments. |
| `debts` | Principal issue/outstanding/repayment records. |

All objects reject unknown properties. All primary IDs and posting IDs are explicit strings; duplicate account, transaction, posting, revenue, authorization, decision, execution, debt, and repayment IDs are rejected in their namespaces. Cross-record IDs must resolve exactly. Each accepted transition returns a new deeply frozen state and leaves all caller inputs unchanged.

Every persisted event uses an explicit time point:

```js
{ domain: "historical", tick: 120 }
```

`domain` must be one of `action`, `historical`, `presentation`, or `engine`. The caller chooses it and supplies the non-negative integer tick. The module does not invent accounting periods or read wall-clock time.

## Transactions and records

### Revenue

`recordRevenue` debits an `ASSET` account and credits a `REVENUE` account for the exact caller-supplied integer amount. `revenueTypeId` and `policyId` are opaque identifiers. The module does not calculate a tax, tariff, fee, rate, assessment, or collection schedule.

### Expenditure authorization and execution

`authorizeExpenditure` receives two separate caller objects:

- a request naming the purpose, subject, debit account, settlement account, and requested amount;
- an external decision naming the policy, decision, authorizing office, approved amount, decision time, and `authorized` boolean.

Authority is recorded against `authorizerOfficeId`, not inferred from a person, title, rank, or current office holder. A denied decision is persisted with zero approval. A general expenditure can execute only against a matching non-denied `GENERAL_EXPENDITURE` authorization, cannot exceed its unused approval, debits the authorized `EXPENSE` account, and credits the authorized `ASSET` settlement account. The authorization becomes `EXHAUSTED` exactly when its approval is consumed.

Implicit overdrafts are unavailable: an execution that would make the settlement asset negative is rejected. No credit limit was found in tracked authority, so credit must be represented as explicit debt rather than an invented negative-balance policy.

### Debt

`issueDebt` requires an affirmative external decision for the exact principal and records that decision's explicit time. It debits an `ASSET` proceeds account and credits a `LIABILITY` account. Debt repayment first requires a matching `DEBT_REPAYMENT` expenditure authorization; it then debits that liability and credits the authorized asset account.

Only principal is modeled. A debt is `OPEN` while principal remains and changes to `SETTLED` only when exact repayments reduce outstanding principal to zero. Reopening, overpayment, repayment after settlement, negative principal, and a persisted status/outstanding mismatch are invalid transitions. Interest, maturity, collateral, default, forgiveness, refinancing, restructuring, and credit limits are unavailable until tracked authority supplies them; see `tasks/SOC.31.01/lane-bp/AUTHORITY_GAPS.md`.

## Public API

All transition inputs are strict objects: missing or unknown keys are rejected. Errors have `name: "TreasuryError"`, stable `code`, `path`, and (for state validation) an `errors` array.

| Call | Result |
|---|---|
| `create({ treasuryId, factionId, unitOfAccountId, accounts })` | Creates a zero-balance, deeply frozen version-1 state. Accounts are sorted by deterministic JavaScript UTF-16 code-unit order, independent of host locale. |
| `validate(state)` | Returns `{ ok, errors }` without mutating or throwing. Performs shape, type, integer, duplicate-ID, balanced-posting, cross-link, authorization, debt, and replay checks. |
| `recordRevenue(state, input)` | Returns a new state with one revenue record and matching balanced transaction. |
| `authorizeExpenditure(state, request, decision)` | Returns a new state with an `APPROVED` or `DENIED` external policy decision. Makes no policy decision itself. |
| `executeExpenditure(state, input)` | Returns a new state with an authorized general expenditure, or throws on absent/denied/mismatched/exhausted authority, insufficient funds, or invalid amount. |
| `issueDebt(state, terms, decision)` | Returns a new state with one externally authorized principal-only debt and balanced issuance. |
| `repayDebt(state, input)` | Returns a new state with an authorized principal repayment and derived debt status. |
| `balanceSheet(state)` | Returns a deeply frozen, account-sorted derived sheet containing debit/credit totals, normal balances, category totals, and both sides of the accounting equation. |
| `audit(state)` | Returns validation errors without throwing, or the derived balanced sheet. |
| `serialize(state)` | Validates and returns canonical JSON with recursively sorted object keys. |
| `deserialize(jsonOrObject)` | Strictly validates, copies, and deeply freezes persisted state. No migration is invented. |

Exported constants include `SCHEMA_VERSION`, `MAX_SAFE_AMOUNT`, the category/time/transaction/purpose enumerations, and `VALIDATION_RULES`. `VALIDATION_RULES` is mechanically checked against the targeted negative-fixture table.

## Events

None. SOC.31.01 is a pure module. A later integration layer may emit domain events only after it reconciles this financial record with the authoritative physical transaction; this task does not register a plugin or event listener.

## Save data

The complete state object is save truth. Store the object under a future SOC.60.02-owned save key only after that integration is authorized. Derived balance sheets and lookup indexes are not saved. `serialize`/`deserialize` prove a deterministic round trip for this version. There is no implicit migration from old saves or existing physical currency.

## Checks

`node tools/society/test_treasury.js` covers:

- strict schema acceptance/rejection and module/schema agreement for representative failures;
- deterministic revenue, partial/exhaustive expenditure, debt issue, authorized debt repayment, balance-sheet derivation, audit, and canonical save round trip;
- safe-integer boundary rejection for cross-account category aggregation and for both full accounting-equation sides, including transition atomicity and all accepted-state API surfaces;
- deterministic code-unit account ordering and precise `E_INTEGER` transition errors for fractional numeric inputs;
- copy-on-write and deep-freeze behavior for state, request, decision, terms, and record inputs;
- one named negative fixture for every exported substantive validation rule;
- explicit provocations for unbalanced postings, duplicate transaction identities, unauthorized expenditure, invalid debt transitions, float/rounding leakage, cross-account/category and equation-side overflow, physical stores presented as money, and hidden input mutation through the real module API;
- deterministic replay equality.

The repository-wide recorded syntax gate is `node tools/check_deus_syntax.js`. It scans registered `game/js/plugins/DEUS_*.js`; SOC.31.01 does not register or edit a runtime plugin, so its executable syntax and behavior are exercised by the targeted treasury gate.

## Status and limits

Implementation is isolated from minting, Quartermaster inventories, payroll, tax assessment/collection, office-schema integration, plugin registration, and save-host registration. A financial expenditure record does not assert that physical settlement occurred. No RMMZ editor Playtest or F8 console check is part of this headless, unregistered module lane; those remain integration work after a runtime host is authorized.

Exact gate output and any observed problems are recorded in `tasks/SOC.31.01/lane-bp/REPORT.md` after the foreground runs.
