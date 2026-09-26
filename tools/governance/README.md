# DEUS Governance Tooling
Scripts for validating WBS leaf immutability, protocol compliance, mailbox integrity, and defect lifecycle rules.

| File | What it does | Details |
|---|---|---|
| `check_claims.js` | Checks one commit (the staged index, `--commit`, `--range`) against rules 4.1 to 4.4 (evidence, zero self-certification, WBS revision, single-writer whitelist) and scans ledgers for backfilled stamps. | Header comment of the file |
| `test_check_claims.js` | Its self-test: fixture repository, cases, unit checks, read-only real-history checks and source mutants. `RESULT: <n> passed, <m> failed`. | |
| `merge_gate.js` | The strict merge gate for lane branches (manifest, scope, review, tests, push state, clean `main`). | `MERGE_GATE.md` |
| `test_merge_gate.js` | Its self-test. | `MERGE_GATE.md` §10 |

## The PM (WG.00.12b)
Owner directive 0028-AC A0 (2026-09-26, about 01:50 CT) made the PM (Grok Bot, main chat) the agent that opens lanes, launches workers and merges. The PM commits with the subject tag `[pm]`:
- a lane-opening commit that adds `tasks/<id>/<lane>/BRIEF.md` and `lane.json` on the lane branch (examples: `d9766aa2` on `task/lane-r`, `147bf517` on `task/lane-s`, `41d24474` on `task/lane-g1`);
- claim commits that add or update rows of `docs/STATUS.md` on `main` (example: `f5c1dfd2`).

### `merge_gate.js`: `[pm]` may write `lane.json`
Check (a) MANIFEST trusts `lane.json` when every commit that changed it is a single-parent commit tagged `[gemini]`/`[antigravity]` or `[pm]`. Any other change (`[claude]`, `[grok]`, `[codex]`, `[ops]`, untagged, look-alikes such as `[grok_pm]`, and every merge commit) is `MANIFEST_TAMPERED` and stops the gate before scope, review and tests. `[pm]` is trusted for manifest provenance only. It is no agent family, so a `[pm]` commit is never a review (`REVIEW_TAG_UNKNOWN`), and `pm` is not a valid manifest `writer` or `reviewer`. See `MERGE_GATE.md` §4 and §5 (a).

### `check_claims.js`: the `pm` agent
- `pm` is an agent of its own (`AGENT_ALIASES`), not an alias of `grok`. The older aliases `grok_pm` and `grok_bot` still mean `grok`.
- It is recognised where an agent name stands alone: the subject tag `[pm]`, `--agent pm`, `DEUS_AGENT=pm`, `--lane pm`, and a `closedBy: pm` value. It is not matched inside free text (`EXACT_ONLY_AGENTS`), because "PM" also appears in clock times and in names such as "PM Grok Bot" (which still reads as `grok`). So a `docs/STATUS.md` row whose label or writer cell says "PM" does not become a `pm` lane.
- **Rule 4.4 whitelist.** For every other agent the checker reads the whitelist from the File-Ownership table of `docs/STATUS.md` as of the parent commit (`parseLaneMatrix`), so a commit cannot widen its own whitelist. The PM writes `docs/STATUS.md` itself, so a STATUS row would let one `[pm]` commit widen what the next may touch. Its whitelist is therefore built in (`PM_WHITELIST`) and added to the parsed table as the lane `PM (built-in whitelist)` (`withBuiltInLanes`):
  - `tasks/*/*/BRIEF*.md` (`BRIEF.md`, `BRIEF_REV2.md`, …),
  - `tasks/*/*/lane.json`,
  - `docs/STATUS.md`.

  `*` stays inside one path segment, so review files, reports, `launches/` prompts and anything outside a lane folder stay out of reach, as does any code (`game/**`, `tools/**`). The FROZEN / READ-ONLY row of STATUS still applies to these paths. With no whitelist table in STATUS at all, 4.4 fails for the PM as for everyone. Rule 4.4 works on paths, so within `docs/STATUS.md` it cannot limit the PM to claim rows. Rules 4.1 and 4.2 still check every closure written anywhere in STATUS.
- **Lane hints.** The PM opens each lane on that lane's own branch, so for `pm` a branch name (`task/lane-<x>`), a merge hint or a `--range` head-ref hint never picks the lane; the built-in lane is used. An explicit `--lane` or `DEUS_LANE` still counts: `--lane c2` with `DEUS_AGENT=pm` fails 4.4 with "does not hold".
- **Rule 4.2.** `pm` is never a valid closer (`NON_CLOSERS`). A `closedBy: pm`, a `Reviewer` cell or a "reviewed by pm" in a WBS, STATUS, AUDIT_LOG or issues record, and a ledger line with `closedBy: pm`, fail 4.2, even with a review artifact committed by `[pm]`. So the PM cannot certify its own work or anyone else's. It may still commit a closure that another agent made and backed (for example `closedBy: grok` citing a `[grok]` review file).
- **Staged checks.** Before a `[pm]` commit: `node tools/governance/check_claims.js --agent pm` (or `DEUS_AGENT=pm`). On a lane branch the branch name is ignored for `pm`, as above.

Tests: `test_check_claims.js` cases `pass_pm_*`, `fail44_pm_*`, `fail42_pm_*`, `fail42_ledger_closedby_pm`, unit `unit_pm_agent`, real-history check `real_pm_claim_and_lane_opening_commits_pass` (`f5c1dfd2`, `d9766aa2`, `41d24474`), and ten `pm_*` source mutants. `test_merge_gate.js`: see `MERGE_GATE.md` §10.
