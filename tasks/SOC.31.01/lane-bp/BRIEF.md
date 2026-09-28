# lane-bp Brief: SOC.31.01 Treasury & Financial Budgeting Ledger

**NO ART OR AUDIO WORK.**

**Lane:** lane-bp | **Task:** SOC.31.01 | **Branch:** task/lane-bp | **Writer:** Codex GPT-5.6 Sol MEDIUM (fallback after Gemini API credit exhaustion) | **Reviewer:** Grok | **Base:** main `368632d629bb65a773ee8c204578d7bf1ab74c61`

## Scope
Implement a deterministic, data-oriented faction treasury ledger for balance sheets, public revenue entries, expenditure authorizations, and debt records. Preserve INV-SOC-06: monetary accounts and Quartermaster physical stores are distinct. Use integer quantities and explicit transaction identities; reject unbalanced postings, duplicate transaction identities, unauthorized expenditure, malformed debt transitions, and silent mutation. Supply a strict JSON schema for persisted treasury state, documentation, and deterministic validation with a targeted failing fixture for every substantive rule.

Do not invent tax rates, wage rates, interest rates, credit limits, currencies, physical mint standards, accounting periods, office authority policy, or automatic fiscal policy absent from tracked authority. Expose inputs for those decisions or mark unavailable requirements in the task folder. Do not integrate with or edit SOC.30.01, DEUS_Mint.js, Quartermaster inventories, payroll, taxes, the office schema, or runtime plugin registration.

## Allowed paths
- `game/data/society/treasury.schema.json`
- `game/js/sim/society/DEUS_Treasury.js`
- `docs/systems/DEUS_Treasury.md`
- `tools/society/test_treasury.js`
- `tasks/SOC.31.01/**`

## Gates
- `node tools/society/test_treasury.js`
- `node tools/check_deus_syntax.js`

## Standing rules
1. Never generate, edit, request, catalogue, move, or integrate art or audio.
2. Write only in allowedPaths. Record absent authority or out-of-scope integration needs in this task folder rather than guessing.
3. Keep the ledger deterministic, pure, auditable, and free of wall-clock, random, filesystem, UI, or engine-global dependencies.
4. Preserve exact integer arithmetic and treasury/store separation. Every accepted state transition must conserve the accounting equation as defined from tracked authority or explicitly documented neutral bookkeeping identities.
5. Every validator rule needs a targeted negative fixture. Include provocations/mutants for unbalanced entries, duplicate IDs, unauthorized spending, stores-as-money, invalid debt state changes, rounding/floating values, and hidden mutation.
6. Run all gates in the foreground and record exact evidence in REPORT.md. Commit on this branch. Do not merge or push. Independent cross-family review follows PM fresh-clone verification.
