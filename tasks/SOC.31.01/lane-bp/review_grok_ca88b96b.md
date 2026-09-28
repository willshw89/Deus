# SOC.31.01 re-review (Grok) of ca88b96b

Independent re-review of lane-bp after the failed review `27a9a7491a7b105cd6bda9c7ff7abff3749b2034`. The correction writer tip is `3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b`. This review commit's parent, and therefore the merge-gate target, is `ca88b96b38346849cda0d6b23cd9618d67c195fb`. That parent only adds the reviewer launch prompt. The treasury module blob `d4377baf19ce3aab6831645195db4ba5e988b42b` and the treasury test blob `40ecced1cdca9cd2c148161ca697b150de5e3036` are identical at the writer tip and at that parent.

The prior review failed because an accepted treasury could carry a cross-account sum outside the safe-integer range, `serialize` would persist it, and `audit` / `balanceSheet` then threw. That failure is closed. The four minors from that review are closed. This file is the only review write.

## Identity

```text
git rev-parse HEAD
ca88b96b38346849cda0d6b23cd9618d67c195fb

git rev-parse 3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b
3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b

git merge-base 3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b main
368632d629bb65a773ee8c204578d7bf1ab74c61

git log --format="%H %s" 27a9a7491a7b105cd6bda9c7ff7abff3749b2034..3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b
3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b [codex] SOC.31.01 fix aggregate safe-integer review
17e0bf3a526cd9ddd9f0154cadd2f9cd561d6a18 [ops] SOC.31.01 lane-bp launch prompt 20260927_194311 (writer codex)
```

`git diff --stat 3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b HEAD` is one file: `tasks/SOC.31.01/lane-bp/launches/20260927_201348_prompt.txt` (5 lines). Commands ran in this worktree at `ca88b96b38346849cda0d6b23cd9618d67c195fb`. `git hash-object` for `game/js/sim/society/DEUS_Treasury.js` and `tools/society/test_treasury.js` matched the writer-tip blobs above, so the executed sources are the corrected tip.

The correction commit is `3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b`, author `deus-codex`, date `2026-09-27T20:04:27-05:00`, subject `[codex] SOC.31.01 fix aggregate safe-integer review`.

## Scope

Correction delta `git diff --name-status 27a9a7491a7b105cd6bda9c7ff7abff3749b2034 3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b` (8 files, 550 insertions, 121 deletions). Every path matches `tasks/SOC.31.01/lane-bp/lane.json` `allowedPaths`.

| Status | Path | Allowed |
|---|---|---|
| M | `docs/systems/DEUS_Treasury.md` | yes |
| M | `game/js/sim/society/DEUS_Treasury.js` | yes |
| M | `tasks/SOC.31.01/lane-bp/BRIEF.md` | yes |
| M | `tasks/SOC.31.01/lane-bp/REPORT.md` | yes |
| M | `tasks/SOC.31.01/lane-bp/lane.json` | yes |
| A | `tasks/SOC.31.01/lane-bp/launches/20260927_194311_prompt.txt` | yes |
| M | `tasks/SOC.31.01/lane-bp/state.md` | yes |
| M | `tools/society/test_treasury.js` | yes |

Full lane `git diff --name-status 368632d629bb65a773ee8c204578d7bf1ab74c61 3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b` adds the same product files plus `game/data/society/treasury.schema.json`, `tasks/SOC.31.01/lane-bp/AUTHORITY_GAPS.md`, the earlier launch prompts, and `tasks/SOC.31.01/lane-bp/review_grok_6a6cd351.md`. Each of those paths is inside `allowedPaths`. `17e0bf3a` adds only the correction launch prompt. No path is `DEUS_Mint.js`, `game/js/plugins.js`, `game/js/plugins/`, or `docs/STATUS.md`.

`git diff --name-only 368632d629bb65a773ee8c204578d7bf1ab74c61 3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b -- art game/audio game/img game/effects` printed no paths. A name filter for `.png`, `.ogg`, `.wav`, `.mp3`, `.jpg`, and `.flac` from the merge base through HEAD printed no paths. `git grep -n -e DEUS_Treasury -e treasury.schema 3eddf8f6 -- game/js/plugins.js game/js/plugins` exited 1. No art or audio file changed.

## Task-local normalization

`BRIEF.md` and `lane.json` were compared as blobs at `27a9a7491a7b105cd6bda9c7ff7abff3749b2034` and `3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b`. After converting CRLF to LF and trimming trailing whitespace, both files are byte-identical (`normalized_equal true`).

| File | At the failed review | At the writer tip |
|---|---|---|
| `lane.json` | 679 bytes, 32 CR, 32 LF | 647 bytes, 0 CR, 32 LF |
| `BRIEF.md` | 2683 bytes, 2 CR, 30 LF, trailing blank line | 2680 bytes, 0 CR, 29 LF |

`git diff --ignore-cr-at-eol --numstat` lists only `BRIEF.md` as `0 1` (the trailing blank line) and omits `lane.json`. Parsed contract fields (`lane`, `taskId`, `branch`, `writer`, `reviewer`, `allowedPaths`, `gateTests`) are unchanged by this correction. `git diff --check` from the failed review to the writer tip exited 0, and from the merge base to the writer tip exited 0.

`git log --format="%H %s" 3eddf8f6 -- tasks/SOC.31.01/lane-bp/lane.json` lists `3eddf8f6` `[codex]`, `645967cc` `[ops]`, and `43924643` `[ops]`. `tools/governance/merge_gate.js` trusts a manifest commit only when it has one parent and a `[gemini]`-family or `[pm]` subject. Those three commits are outside that set, so a merge-gate run on this history will refuse `MANIFEST_TAMPERED`. The codex blob change is the line-ending normalization above. The earlier `[ops]` commit `645967cc` is the one that set `"writer": "codex"` and reformatted `gateTests`; that content was already in the blob the failed review saw.

## Recorded gates

Both gates were rerun in the foreground from the repository root.

`node --check game/js/sim/society/DEUS_Treasury.js` exited 0. `node --check tools/society/test_treasury.js` exited 0.

`node tools/society/test_treasury.js` exited 0.

```text
RESULT: 131 passed, 0 failed
```

The run includes the new boundary lines `aggregate.category_boundary.*`, `aggregate.equation_boundary.*`, `aggregate.category_transition_rejected`, `aggregate.equation_transition_rejected`, `provocation.cross_account_category_aggregation.killed`, `provocation.equation_left_overflow.killed`, `provocation.equation_right_overflow.killed`, `integer.execute_fraction_reports_E_INTEGER`, `integer.repay_fraction_reports_E_INTEGER`, `integer.bigint_reports_E_INTEGER`, `ordering.persisted_accounts_code_unit`, `ordering.balance_sheet_accounts_code_unit`, and `provocation.hidden_input_mutation.killed - real module call completed with frozen caller input unchanged`. `negative.every_substantive_rule_has_fixture` reports 22 rules covered by 26 fixtures.

`node tools/check_deus_syntax.js` exited 0.

```text
Checked 60 DEUS plugin files. Errors: 0
```

## Prior failure

`validate` now calls `aggregateAccounts` (`DEUS_Treasury.js` lines 487-543 and 633-635) before `finish` accepts a transition (lines 700-703). Category totals and both equation sides use `Number.isSafeInteger` on the sum. `serialize` and `deserialize` call `assertValid`. `balanceSheet` calls `assertValid` and then the same aggregation. `audit` (lines 923-928) returns `{ ok: false, errors, balanceSheet: null }` when `validate` fails, and calls `balanceSheet` only after that succeeds.

Measured with an uncommitted harness that required `game/js/sim/society/DEUS_Treasury.js` from this worktree. `Number.MAX_SAFE_INTEGER` is `9007199254740991`. `Number.isSafeInteger` of that value is true, and of the next unit is false. For every accepted state below, `validate` returned ok, `balanceSheet` and `audit` returned a balanced sheet whose category totals and both equation sides were safe integers equal to a BigInt replay, `serialize` returned, `deserialize` validated, and `serialize(deserialize(text))` reproduced the same bytes. Sheet account order matched UTF-16 code-unit order.

| Accepted state | Measured totals | Equation |
|---|---|---|
| One revenue of `9007199254740991` | ASSET and REVENUE at that value | both sides `9007199254740991` |
| Two asset accounts of `4503599627370495` | ASSET `9007199254740990` | balanced |
| Those two plus one more unit | ASSET and REVENUE `9007199254740991` | both sides `9007199254740991` |
| Ten revenues of `900719925474099`, then one more unit | ASSET `9007199254740990`, then `9007199254740991` | balanced at the exact maximum |
| Debt `9007199254740991`, then an authorized spend of 1 | ASSET `9007199254740990`, EXPENSE `1`, LIABILITY `9007199254740991`, REVENUE `0`, NET_POSITION `0` | both sides `9007199254740991` |
| That boundary, then another authorized spend of 1 | ASSET `9007199254740989`, EXPENSE `2`, LIABILITY unchanged | both sides still `9007199254740991` |
| That boundary, then an authorized repayment of 1 | LIABILITY `9007199254740990`, EXPENSE `1`, ASSET `9007199254740989` | both sides `9007199254740990` |
| Ordinary lifecycle: revenue 1000, spend 250, debt 300, repay 300 | ASSET `750`, EXPENSE `250`, LIABILITY `0`, REVENUE `1000` | both sides `1000` |

The same closure held after `deserialize` of the category-maximum state and of the equation-boundary state, and after a later spend on each deserialized copy.

Rejected transitions threw `TreasuryError` `E_INTEGER` and left both the frozen caller state and an unfrozen `JSON.parse` copy byte-identical:

- One more unit on the account that already holds `9007199254740991`.
- Revenue of 1 into a second asset account and a second revenue account when the first pair already holds `9007199254740991`. Errors: `aggregate ASSET balance would exceed the safe integer range` and `aggregate REVENUE balance would exceed the safe integer range`, both `E_INTEGER` at `/transactions`.
- The eleventh unit after ten chunks had reached the exact category maximum.
- Revenue of 1 on the equation boundary, into either the empty bank account or the cash account. Errors: `left accounting equation total would exceed the safe integer range` and `right accounting equation total would exceed the safe integer range`. Each category total on that candidate stays inside the safe range (ASSET `9007199254740991`, EXPENSE `1`, LIABILITY `9007199254740991`, REVENUE `1`); a BigInt replay of the two sides is `9007199254740992`.
- A second debt of 1 when the liability account already holds `9007199254740991`.
- Two liability accounts holding `4503599627370495` each, then a further principal of 2.

A hand-built copy of the equation-boundary state plus that revenue of 1 is rejected by `validate`. `audit` returns `ok: false` and `balanceSheet: null` without throwing. `balanceSheet`, `serialize`, and `deserialize` throw `E_INTEGER`.

Later legal transitions on those accepted boundaries stay inside the safe range and themselves close under `validate`, `balanceSheet`, `audit`, `serialize`, and `deserialize`. The rejected follow-on revenue leaves the post-spend state serializable and unchanged.

## Ordering, integer errors, and the hidden-mutation fixture

`create` sorts account ids with `compareCodeUnits` (lines 182-186 and 712-714). `aggregateAccounts` sorts the same way (line 491), and `balanceSheet` emits that order. The module source contains no `localeCompare`.

Creating accounts `account.asset.i`, `account.asset.I`, `account.asset.b`, and `account.asset.B` persisted and reported this sheet order:

```text
code-unit and module: account.asset.B|account.asset.I|account.asset.b|account.asset.i
localeCompare en-US:  account.asset.b|account.asset.B|account.asset.i|account.asset.I
localeCompare tr:     account.asset.b|account.asset.B|account.asset.I|account.asset.i
localeCompare host:   account.asset.b|account.asset.B|account.asset.i|account.asset.I
```

`"account.asset.i" < "account.asset.I"` is false. `localeCompare("en-US")` of that pair returns `-1`. `localeCompare("tr")` returns `1`. The persisted order matches the code-unit comparator.

`assertPositiveSafeInteger` / `assertNonNegativeSafeInteger` run before authorization-limit and debt-transition checks in `recordRevenue` (line 727), `authorizeExpenditure` (lines 741-742), `executeExpenditure` (line 775, limit check at line 783), `issueDebt` (lines 811-812), and `repayDebt` (line 845, transition check at line 859). On a funded treasury, these amounts all throw `TreasuryError` `E_INTEGER` from `recordRevenue`, `authorizeExpenditure`, `executeExpenditure`, `issueDebt`, and `repayDebt`: `0.2`, `1.2`, `1.5`, `0`, `-1`, `NaN`, `Infinity`, `-Infinity`, `9007199254740992`, `"10"`, `null`, `undefined`, `true`, `1n`, `{}`, and `[]`. A revenue of `0.2` leaves the caller serialize bytes unchanged. An integer execution of 11 against a remaining approval of 10 throws `E_AUTH_LIMIT`. An integer repayment of 5 against outstanding principal 4 throws `E_DEBT_TRANSITION`. An exact integer spend of the approved amount closes under the same API list.

`tools/society/test_treasury.js` no longer contains `hiddenMutationMutant`. `provocation.hidden_input_mutation.killed` calls `Treasury.recordRevenue(validState, guardedInput)` with the input and its time object frozen, then requires a successful call and unchanged caller snapshots. A Proxy around a revenue input, including its nested time object, counted zero `set`, `defineProperty`, and `deleteProperty` operations during `recordRevenue`. The returned state is deeply frozen; assigning `category` throws `TypeError` and the category stays `ASSET`.

A BigInt `tick` on an otherwise valid revenue input still throws `TypeError: Do not know how to serialize a BigInt` from `JSON.stringify` inside `clone` before tick validation. Amount fields do not take that path. The caller state is unchanged because the throw happens on the cloned input.

## INV-SOC-06, rates, and authority gaps

INV-SOC-06 separates faction monetary balance from Quartermaster physical stores. The schema domain const is `FINANCIAL`. Categories are `ASSET`, `LIABILITY`, `NET_POSITION`, `REVENUE`, and `EXPENSE`. Amount maximum is `9007199254740991`. The schema text has no `quantity`, `itemId`, `storeId`, `interest`, `denomination`, `food`, `coin`, `wage`, `taxRate`, or `maturity`. The module source has no `require(`, `Date.`, `Math.random`, `DEUS_Mint`, `quartermaster`, `interestRate`, `taxRate`, `wageRate`, `denomination`, `maturity`, `fiscalPeriod`, or `creditLimit`.

With `global.QuartermasterStores.grain` at 5000 and `global.$gameParty.gold` at 99999, a financial revenue of 40 left both values unchanged. Setting an account `domain` to `STORE` returns `E_STORE_DOMAIN`. Setting `category` to `FOOD` returns `E_FINANCIAL_ACCOUNT`. A revenue payload carrying `itemId` and `quantity` throws `E_SHAPE`. Debt status remains `OPEN` or `SETTLED`. `unitOfAccountId`, `policyId`, and `authorizerOfficeId` stay caller-supplied opaque ids. `tasks/SOC.31.01/lane-bp/AUTHORITY_GAPS.md` still records currency, rates, fiscal periods, office jurisdiction, opening balances, credit limits, interest and related debt terms, automatic fiscal policy, physical custody, and audit compaction as unavailable. The module does not fill those in.

`Date.now`, `Math.random`, and `performance.now` were replaced with functions that throw. A revenue, authorization, and spend completed with those counters at 0.

## Findings

### BLOCKER

None.

### MAJOR

None. The prior cross-account acceptance hole is rejected before `finish`, and the accepted boundary states stay safe for `validate`, `balanceSheet`, `audit`, `serialize`, `deserialize`, and the later spend and repayment transitions measured above.

### MINOR

None in the corrected behavior under review. The BigInt tick `TypeError` above is outside the amount checks this correction changed, and it does not persist a state.

## Verdict

The recorded treasury gate passed at 131/0 and the syntax gate passed at 60 plugins, 0 errors. Cross-account category totals and both accounting-equation sides are rejected at `9007199254740992` and accepted at `9007199254740991`. Rejection leaves the prior state unchanged. Account order follows UTF-16 code units on this host, where `en-US`, `tr`, and the host `localeCompare` orders differ. Fractional and non-Number amounts return `E_INTEGER`. The hidden-mutation fixture calls `recordRevenue`. Store separation holds, no rate or fiscal policy was added, every changed path is allowed, and no art or audio file changed. Task-local `BRIEF.md` and `lane.json` normalization does not change the brief text or the parsed lane contract.

VERDICT: PASS
