# SOC.31.01 authority gaps

Recorded 2026-09-27 from the tracked WBS, invariant registry, person/institutions specification, and lane brief. These are deliberately not guessed by the treasury package.

| Gap | SOC.31.01 treatment |
|---|---|
| Currency, denomination, exchange rate, and physical coin standard | Unavailable here. `unitOfAccountId` is an opaque caller-supplied identifier. No conversion or denomination table exists. |
| Tax, tariff, fee, wage, or other revenue/expenditure rate | Unavailable here. Callers supply an already-decided exact integer amount plus a `policyId`. |
| Fiscal/accounting period length and calendar mapping | Unavailable here. Every record carries a caller-supplied explicit `{ domain, tick }`; the module creates no periods or schedules. |
| Office authority and jurisdiction policy | Unavailable here. Authorization calls must carry the deciding `authorizerOfficeId`, `policyId`, and `decisionId`. The module records the decision and never infers authority from a person, title, rank, or office token. |
| Opening-balance migration policy | Unavailable here. A new treasury begins with zero financial account balances. Legacy import belongs to SOC.60.02 or another explicitly authorized migration. |
| Credit limits and overdraft policy | Unavailable here. Implicit negative asset balances are refused; credit must be represented by an explicit debt record. |
| Interest, maturity, collateral, default, forgiveness, refinancing, and restructuring | Unavailable here. Debt records cover principal issuance and exact principal repayment only, with the structural lifecycle `OPEN` to `SETTLED`. |
| Automatic fiscal policy, budget allocation, and authorization thresholds | Unavailable here. The module records external policy decisions but does not make them. |
| Physical coin custody, mint output, inventories, Quartermaster stores, payroll, and tax collection | Out of scope. The financial ledger neither reads nor writes physical stores and does not claim that a financial posting moved an item. Later integration must reconcile financial execution with the authoritative physical system without merging the two domains. |
| Audit-history retention/closing policy | Unavailable here. SOC.31.01 preserves the complete append-only transaction history; no period close, compaction, or archival rule is invented. |
