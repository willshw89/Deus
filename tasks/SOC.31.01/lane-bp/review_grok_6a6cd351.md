# SOC.31.01 review (Grok) of 6a6cd351

Independent review of lane-bp at Codex writer tip `6a6cd351fc07d11e7d749e25ae3381abb531c7e9`. The merge base is main `368632d629bb65a773ee8c204578d7bf1ab74c61`. This file is the only review write. The tip fails because an accepted treasury can leave the safe-integer domain, `serialize` will persist it, and `audit` / `balanceSheet` then throw.

Commands ran in this worktree at `3c88050f88bcfc9744b8e8c7404e764177770221`. That commit is the reviewer launch prompt after the tip. `git diff --stat 6a6cd351fc07d11e7d749e25ae3381abb531c7e9 HEAD` is only `tasks/SOC.31.01/lane-bp/launches/20260927_191327_prompt.txt`. The treasury module, schema, test, and system doc executed here are the blobs at the writer tip.

## Identity

```text
git rev-parse 6a6cd351
6a6cd351fc07d11e7d749e25ae3381abb531c7e9

git merge-base 6a6cd351fc07d11e7d749e25ae3381abb531c7e9 main
368632d629bb65a773ee8c204578d7bf1ab74c61

git log --format="%H %s" 368632d629bb65a773ee8c204578d7bf1ab74c61..6a6cd351fc07d11e7d749e25ae3381abb531c7e9
6a6cd351fc07d11e7d749e25ae3381abb531c7e9 [codex] SOC.31.01 deterministic treasury ledger
e922b5e8da26e274c957c291aaff1ffec1821588 [ops] SOC.31.01 lane-bp launch prompt 20260927_184732 (writer codex)
645967ccf007cfc94c6b4dbe752b11b9b03f18be [ops] SOC.31.01 lane-bp launch prompt 20260927_184635 (writer gemini)
4392464348a26cd2abb5877dca322aef9dd99253 [ops] Register SOC.31.01 lane-bp
```

The writer commit is `6a6cd351fc07d11e7d749e25ae3381abb531c7e9`, author `deus-codex`, date `Sun Sep 27 19:09:53 2026 -0500`.

## Scope

`git diff --name-status 368632d629bb65a773ee8c204578d7bf1ab74c61 6a6cd351fc07d11e7d749e25ae3381abb531c7e9` (11 files, 2161 insertions). Every path is inside `tasks/SOC.31.01/lane-bp/lane.json` `allowedPaths`.

| Status | Path | Allowed |
|---|---|---|
| A | `docs/systems/DEUS_Treasury.md` | yes |
| A | `game/data/society/treasury.schema.json` | yes |
| A | `game/js/sim/society/DEUS_Treasury.js` | yes |
| A | `tasks/SOC.31.01/lane-bp/AUTHORITY_GAPS.md` | yes |
| A | `tasks/SOC.31.01/lane-bp/BRIEF.md` | yes |
| A | `tasks/SOC.31.01/lane-bp/REPORT.md` | yes |
| A | `tasks/SOC.31.01/lane-bp/lane.json` | yes |
| A | `tasks/SOC.31.01/lane-bp/launches/20260927_184635_prompt.txt` | yes |
| A | `tasks/SOC.31.01/lane-bp/launches/20260927_184732_prompt.txt` | yes |
| A | `tasks/SOC.31.01/lane-bp/state.md` | yes |
| A | `tools/society/test_treasury.js` | yes |

`git diff --name-only` from the merge base to the tip for `art/`, `game/audio/`, `game/img/`, `game/js/plugins.js`, `game/js/plugins/`, `docs/STATUS.md`, and `*.png` / `*.ogg` / `*.wav` / `*.mp3` printed no paths. `game/js/plugins.js` has no `DEUS_Treasury` or `treasury.schema` reference. No art or audio file is in the change. `DEUS_Mint.js` is not in the change and the module has no `require`.

## Recorded gates

Both gates were rerun in the foreground from the repository root.

`node --check game/js/sim/society/DEUS_Treasury.js` exited 0. `node --check tools/society/test_treasury.js` exited 0. The repository syntax gate scans registered `game/js/plugins/DEUS_*.js` only, so these checks cover the unregistered module and its harness.

`node tools/society/test_treasury.js` exited 0.

```text
RESULT: 102 passed, 0 failed
```

`node tools/check_deus_syntax.js` exited 0.

```text
Checked 60 DEUS plugin files. Errors: 0
```

`git diff --check 368632d629bb65a773ee8c204578d7bf1ab74c61 6a6cd351fc07d11e7d749e25ae3381abb531c7e9` exited 2. See MINOR 4. The writer's `git diff --cached --check` claim of exit 0 does not reproduce against the committed blobs under default whitespace rules.

## Negative fixtures and provocations

The treasury gate ran all 24 targeted fixtures. All 22 exported `VALIDATION_RULES` were covered. Exact fixture lines:

```text
PASS negative.unknown_top_level_field - caught E_SHAPE
PASS negative.wrong_schema_version - caught E_SCHEMA
PASS negative.malformed_explicit_id - caught E_ID
PASS negative.physical_store_account - caught E_STORE_DOMAIN
PASS negative.store_category_as_financial_account - caught E_FINANCIAL_ACCOUNT
PASS negative.duplicate_transaction_identity - caught E_DUPLICATE_ID
PASS negative.floating_amount_leakage - caught E_INTEGER
PASS negative.implicit_wall_clock - caught E_TIME
PASS negative.two_sided_posting - caught E_POSTING
PASS negative.unbalanced_postings - caught E_IMBALANCE
PASS negative.posting_to_unknown_account - caught E_ACCOUNT
PASS negative.orphan_transaction - caught E_LINK
PASS negative.revenue_credits_expense - caught E_REVENUE
PASS negative.approval_exceeds_request - caught E_AUTH_DECISION
PASS negative.denied_authorization_has_execution - caught E_UNAUTHORIZED
PASS negative.execution_exceeds_approval - caught E_AUTH_LIMIT
PASS negative.authorization_execution_total_drift - caught E_AUTH_RECONCILIATION
PASS negative.execution_outside_account_scope - caught E_EXPENDITURE
PASS negative.implicit_overdraft - caught E_INSUFFICIENT_FUNDS
PASS negative.debt_uses_non_liability_account - caught E_DEBT
PASS negative.debt_principal_reconciliation_drift - caught E_DEBT_RECONCILIATION
PASS negative.settled_debt_reopened_by_state - caught E_DEBT_TRANSITION
PASS negative.repay_already_settled_debt - caught E_DEBT_TRANSITION
PASS negative.partial_debt_cannot_claim_settled - caught E_DEBT_TRANSITION
PASS negative.every_substantive_rule_has_fixture - 22 rules covered by 24 fixtures
```

Exact provocation lines from the same run:

```text
PASS provocation.imbalance.killed - targeted detector fired
PASS provocation.duplicate_transaction_ids.killed - targeted detector fired
PASS provocation.unauthorized_expenditure.killed - targeted detector fired
PASS provocation.invalid_debt_transition.killed - targeted detector fired
PASS provocation.float_rounding_leakage.killed - targeted detector fired
PASS provocation.stores_treated_as_money.killed - targeted detector fired
PASS provocation.hidden_input_mutation.killed - mutation detector observed state and nested input changes
PASS provocation.returned_state_mutation_blocked - deep freeze blocks hidden post-return mutation
PASS provocation.runtime_float_refused - got E_INTEGER
```

The six named detectors `imbalance` through `stores_treated_as_money` alias the fixture of the same rule and do call `validate` or the public API. `returned_state_mutation_blocked` and `runtime_float_refused` also call the module. `provocation.hidden_input_mutation.killed` does not. See MINOR 2.

## Independent checks

An uncommitted harness required `game/js/sim/society/DEUS_Treasury.js` from this tip and drove the public API. `Date.now`, `Math.random`, and `performance.now` were replaced with functions that throw. A full lifecycle still completed and those counters stayed at 0.

Checked lifecycle, with caller-supplied ids and ticks: revenue 1000, general authorization requested 400 and approved 250, executions 100 then 150, debt principal 300, repayment 100 then 200. Derived sheet:

```text
ASSET 750, EXPENSE 250, LIABILITY 0, NET_POSITION 0, REVENUE 1000
left 1000, right 1000, balanced true
```

After the 100 repayment the debt was `OPEN` with outstanding 200. After the 200 repayment it was `SETTLED`, outstanding 0, `settledAt.tick` 80. Both authorizations ended `EXHAUSTED`. The opening state stayed at zero transactions. Each returned state was deeply frozen and did not alias the previous state.

| Check | Result |
|---|---|
| Schema | Draft 2020-12. Ten `type: object` nodes, each with `additionalProperties: false`. Amount maximum is `9007199254740991`, equal to `MAX_SAFE_AMOUNT`. Domain const is `FINANCIAL`. Categories are `ASSET`, `LIABILITY`, `NET_POSITION`, `REVENUE`, `EXPENSE`. Schema text has no `quantity`, `itemId`, `storeId`, `interest`, `denomination`, `food`, `coin`, `wage`, `taxRate`, or `maturity`. |
| Safe integers, per account | A second revenue of 1 into an asset that already holds `MAX_SAFE_INTEGER` throws `E_INTEGER` and does not return a new state. Splitting `MAX_SAFE_INTEGER - 1` and `1` across two asset accounts produces a sheet whose `ASSET` total is `9007199254740991`, `balanced true`, and `Number.isSafeInteger` true. |
| Safe integers, across accounts | Failed. See MAJOR 1. |
| Double-entry | Public transitions build exactly two one-sided postings with equal debit and credit. The lifecycle equation above holds. A crafted one-unit imbalance returns `E_IMBALANCE`. There is no generic post export. |
| Immutability | A `Proxy` on a revenue input recorded zero writes. A failed `executeExpenditure` left `serialize` bytes unchanged. Writing a frozen posting debit throws `TypeError`. |
| Transaction identity | Duplicate revenue id / transaction id throws `E_DUPLICATE_ID`. Reusing a decision id across debt and expenditure throws `E_DUPLICATE_ID`. A copied transaction inside an otherwise valid state returns `E_DUPLICATE_ID`. |
| Revenue evidence | Changing a stored revenue amount without the journal returns `E_LINK`. A revenue that credits an expense account is `E_REVENUE` in the recorded fixture. |
| Authorization limits | Approval above the request is `E_AUTH_DECISION` in the recorded fixture. After the 250 approval was consumed, another execution of 1 threw `E_AUTH_LIMIT` and added no execution. |
| Insufficient funds | Spend of 1 from a zero asset throws `E_INSUFFICIENT_FUNDS`. Spend of the exact cash balance succeeds; the next 1 throws `E_INSUFFICIENT_FUNDS`. Debt proceeds placed in `asset.bank` do not fund a repayment whose settlement account is empty `asset.cash` (`E_INSUFFICIENT_FUNDS`, outstanding unchanged). |
| Unauthorized spend | Missing authorization, a persisted `DENIED` decision, `executeExpenditure` against a `DEBT_REPAYMENT` authorization, and `repayDebt` against another debt's authorization all throw `E_UNAUTHORIZED`. |
| Debt lifecycle | Denied issue and a principal that disagrees with `approvedPrincipalAmount` throw `E_UNAUTHORIZED`. Repayment above outstanding, and repayment after `SETTLED`, throw `E_DEBT_TRANSITION`. A crafted `DEFAULTED` status is `E_DEBT_TRANSITION`. A crafted reopen is `E_DEBT_RECONCILIATION` and `E_DEBT_TRANSITION`. An `interestRate` field is `E_SHAPE`. Two debts on one liability account, after one was repaid, left liability 40, asset 40, and a balanced equation. |
| Canonical serialization | `serialize(deserialize(shuffleKeys(parse(serialize(state)))))` reproduced the same bytes. Object-key order is sorted. Account array order is not code-point order. See MINOR 1. |
| Audit on ordinary states | `audit` on the lifecycle state returned `ok: true` and a balanced sheet. `deserialize` freezes the loaded state. |
| INV-SOC-06 | Preserved on this tip. Exports are the financial API only. Module source has no `require(`, `Date.`, `Math.random`, `performance.`, `DEUS_Mint`, `quartermaster`, or `fs.`. `global.QuartermasterStores.grain` stayed 5000 and `global.$gameParty.gold` stayed 99999 while the financial asset total followed the journal. `domain: "STORE"`, `category: "FOOD"`, `itemQuantity`, and a revenue payload carrying `itemId` plus `quantity` are rejected (`E_STORE_DOMAIN`, `E_FINANCIAL_ACCOUNT`, or `E_SHAPE`). An extra balanced revenue-shaped transaction with no revenue record is `E_LINK`. A financial posting does not read or write a physical store. |
| Wall clock and randomness | The patched clock and RNG threw if called. They were not called. A time domain of `wall` is `E_TIME` in the recorded fixture. Ticks are caller-supplied. A spend tagged at tick 2 after revenue tagged at tick 50 is accepted: funds follow journal order. No monotonic-tick rule was present in tracked authority, and none was added. |

Ordinary-path accounting, authorization, debt principal, canonical key order, and store separation hold. The acceptance boundary for safe-integer sums does not.

## Findings

### BLOCKER

None.

### MAJOR

1. Cross-account safe-integer sums are accepted, then `audit` throws.

`validate` / `replayAccounts` (`game/js/sim/society/DEUS_Treasury.js` lines 444-466) safe-adds each account's own debit and credit totals and rejects a negative asset. It never adds those balances across accounts, and it never forms `assets + expenses` or `liabilities + net position + revenue`. `finish` accepts a transition when `validate` returns `ok`. `balanceSheet` (lines 831-843) is the first place those sums are formed, and `audit` (lines 856-860) calls it without a catch. `docs/systems/DEUS_Treasury.md` says every sum is checked before it is accepted and that `audit` returns validation errors without throwing.

Measured from the public API:

- Revenue of `9007199254740991` into `asset.cash` / `revenue.public`, then revenue of `1` into `asset.bank` / `revenue.other`. `validate` returned `ok: true` with zero errors. `serialize` returned. `balanceSheet` and `audit` both threw `TreasuryError` `E_INTEGER` at `/transactions`: `balance sheet overflow`. `deserialize` of that serialization validated, and `audit` threw the same error.
- Debt principal `9007199254740991` into `asset.cash` / `liability.debt`, then an authorized spend of `1` from `asset.cash`, then revenue of `1` into `asset.bank` / `revenue.public`. Per-account balances stayed safe integers: cash `9007199254740990`, bank `1`, expense `1`, liability `9007199254740991`, revenue `1`. Category totals were also safe: `ASSET 9007199254740991`, `EXPENSE 1`, `LIABILITY 9007199254740991`, `REVENUE 1`, `NET_POSITION 0`. The equation sides were both `9007199254740992`, which is not a safe integer. `validate().ok` was true. `balanceSheet` threw `E_INTEGER` at `/transactions`: `accounting equation overflow`.

Journal postings remain exact. The sheet does not return a rounded total; it throws. Both measured states were returned by `recordRevenue`, and `serialize` persisted them. In the debt scenario the issue and the spend of 1 were still auditable; the following revenue of 1 crossed the safe sum. `issueDebt`, `executeExpenditure`, and `repayDebt` use this same `validate` gate, so a state the gate has accepted is a legal input and a legal save. A later `audit` of that save throws. The same-account overflow guard does work: one more unit on the account that already holds the maximum is refused before acceptance.

### MINOR

1. Persisted account order uses the host locale. `create` sorts ids with `String.prototype.localeCompare` and no locale argument (`DEUS_Treasury.js` lines 635-637). On this host (`en-US`) that order differed from UTF-16 code-point order. The same ids under locale `tr` place `asset.I` before `asset.i`; `en-US` places `asset.i` before `asset.I`. `balanceSheet` then sorts with `Object.keys(rows).sort()` (line 850), so the derived sheet order and the persisted account order already disagree on this host. No sampled pair of distinct ids compared equal, so this is locale dependence, not an unstable tie. Balances and the equation do not depend on that order. Replay on one locale is stable: the recorded `module.deterministic_replay` check passed, and a second `serialize` of one state matched.

2. `provocation.hidden_input_mutation.killed` does not exercise the module. `tools/society/test_treasury.js` lines 517-528 clone a state, mutate that clone and a local input inside `hiddenMutationMutant`, and treat the self-inflicted change as a kill. The gate still prints `PASS`. Separate coverage does hold: every happy-path `*.inputs_unchanged` check passed, the freeze provocation passed, and an independent `Proxy` around `recordRevenue`'s input recorded zero writes.

3. Some non-integers miss `E_INTEGER` as the thrown code. `executeExpenditure` of `0.2` throws `E_AUTH_LIMIT` (lines 702-704). `repayDebt` of `1.2` throws `E_DEBT_TRANSITION` (lines 775-777). Both refuse the transition. `recordRevenue` of `0` throws `E_POSTING` first; the attached `errors` array also contains `E_INTEGER` on the revenue amount. A `BigInt` amount throws `TypeError: Do not know how to serialize a BigInt` from `JSON.stringify` inside `clone`, not `TreasuryError`. `0.1`, `1.5`, `NaN`, `Infinity`, `-1`, the string `"10"`, and `9007199254740992` on `recordRevenue` throw `E_INTEGER`. None of these values was stored.

4. Two task files are CRLF. The `lane.json` blob at the tip is 32 CRLF lines. `BRIEF.md` ends in `CRLF CRLF`. The module, schema, test, system doc, report, authority gaps, and state file are LF. `git diff --check` from the merge base to the tip exited 2 because of that CR. `REPORT.md` records `git diff --cached --check` as exit 0.

## Unresolved owner-gated authority gaps

`tasks/SOC.31.01/lane-bp/AUTHORITY_GAPS.md` records these as unavailable. The module does not fill them in. No rate, denomination table, fiscal period, interest formula, default status, credit limit, wage, tax, or office-jurisdiction rule appears in the schema or the module. Debt status is only `OPEN` or `SETTLED`. `unitOfAccountId`, `policyId`, and `authorizerOfficeId` are caller-supplied opaque ids. A new treasury starts at zero. Implicit negative assets are refused.

| Gap | What this tip does |
|---|---|
| Currency, denomination, exchange rate, physical coin standard | Opaque `unitOfAccountId`. No conversion table. |
| Tax, tariff, fee, wage, or other rate | Caller supplies the integer amount and a `policyId`. |
| Fiscal period and calendar mapping | Caller supplies `{ domain, tick }`. No period is created. |
| Office authority and jurisdiction | The decision's `authorizerOfficeId` is stored. No office registry is consulted. |
| Opening-balance migration | Create starts at zero. `schemaVersion` other than 1 is `E_SCHEMA`. |
| Credit limits and overdraft | No negative asset balance and no invented credit limit. Credit is an explicit debt. |
| Interest, maturity, collateral, default, forgiveness, refinancing, restructuring | Principal only. `DEFAULTED` and an `interestRate` field are rejected. |
| Automatic fiscal policy and authorization thresholds | `authorizeExpenditure` records an external boolean decision. It does not decide. |
| Physical custody, mint, stores, payroll, tax collection | Out of scope. No read or write of those systems. |
| Audit retention and period close | Full append-only history. No compaction rule. |

## Verdict

The recorded treasury gate passed at 102/0 and the syntax gate passed at 60 plugins, 0 errors. Store separation, ordinary double-entry, authorization limits, insufficient funds, and the principal-only debt lifecycle held under independent calls. Accepted states can still carry a cross-account sum outside the safe-integer range, and `audit` throws on those states.

VERDICT: FAIL
