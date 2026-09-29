# DEUS Governance Tooling
Scripts for validating WBS leaf immutability, protocol compliance, mailbox integrity, and defect lifecycle rules.

| File | What it does | Details |
|---|---|---|
| `check_claims.js` | Checks one commit (the staged index, `--commit`, `--range`) against rules 4.1 to 4.4 (evidence, zero self-certification, WBS revision, single-writer whitelist) and scans ledgers for backfilled stamps. | Header comment of the file |
| `test_check_claims.js` | Its self-test: fixture repository, cases, unit checks, read-only real-history checks and source mutants. `RESULT: <n> passed, <m> failed`. | |
| `merge_gate.js` | The strict merge gate for lane branches (manifest, scope, review, tests, push state, clean `main`). The only door into `main` (DEC-042). | `MERGE_GATE.md` |
| `test_merge_gate.js` | Its self-test. | `MERGE_GATE.md` §10 |

## The PM
Since DEC-042 (Owner, 2026-09-29) the PM is **Claude Code**. It records Owner decisions in `docs/OWNER_DECISIONS.md`, opens and closes lanes, routes review and presents QA-passed art to the Owner. Between 2026-09-26 (Owner directive 0028-AC A0) and 2026-09-28 the PM was Grok Bot (main chat); the example commits below date from then and remain valid history. The PM commits with the subject tag `[pm]`:
- a lane-opening commit that adds `tasks/<id>/<lane>/BRIEF.md` and `lane.json` on the lane branch, before the first edit in the worktree (examples: `d9766aa2` on `task/lane-r`, `147bf517` on `task/lane-s`, `41d24474` on `task/lane-g1`);
- claim commits that add or update rows of `docs/STATUS.md` on `main` (example: `f5c1dfd2`).

The PM is not an agent family. It never reviews, never certifies, and a `[pm]` commit is never a review. Zero self-certification applies to the PM as to everyone: Claude Code as PM does not review Claude-family code.

### `merge_gate.js`: `[pm]` may write `lane.json`
Check (a) MANIFEST trusts `lane.json` when every commit that changed it is a single-parent commit tagged `[gemini]`/`[antigravity]` or `[pm]`. Any other change (`[claude]`, `[grok]`, `[codex]`, `[ops]`, untagged, look-alikes such as `[grok_pm]`, and every merge commit) is `MANIFEST_TAMPERED` and stops the gate before scope, review and tests. `[pm]` is trusted for manifest provenance only. It is no agent family, so a `[pm]` commit is never a review (`REVIEW_TAG_UNKNOWN`), and `pm` is not a valid manifest `writer` or `reviewer`. See `MERGE_GATE.md` §4 and §5 (a).

An `[ops]` commit that touches `lane.json` is tampering too. `tools/ops/launch_worker.ps1` commits its prompt as `[ops]` unless it is run with `-NoCommitPrompt`; on 2026-09-27 the launch-prompt commit `645967cc` on lane-bp touched `lane.json` and threw the lane's PASS away. Launch with `-NoCommitPrompt` (tools/ops/ANTIGRAVITY.md §3).

### Requirement: commit author family must match the subject tag (tool change pending)
Documented 2026-09-29 from the lane-execution audit; not yet implemented in `merge_gate.js` (§9 of `MERGE_GATE.md` still lists "agent identity is the commit subject tag" as a known limit).

- **Finding.** The gate judges a review by its subject tag only. Six `[grok]` review commits authored by `deus-ops`, made seconds after the writer commit, passed the gate on 2026-09-27 and 2026-09-28 (`git log --all --format="%an %s" | grep "^deus-ops \[grok\]"` lists nine such commits across all refs, checked 2026-09-29). A tag is text anyone can type; it is not identity.
- **Rule (in force now, checked by hand).** A review commit must be authored by the reviewer's own account. `tools/ops/launch_worker.ps1` sets `GIT_AUTHOR_NAME` and `GIT_COMMITTER_NAME` to `deus-<provider>` (`deus-claude`, `deus-grok`, `deus-codex`, `deus-gemini`), so a review produced through the launcher carries the right author. `deus-ops` is the shared shell identity of the coordinator and the PM; it belongs to no agent family and can never author a review. Until the gate enforces this, the integrator runs `git log --format="%an %s" -1 <tip>` before every merge and refuses a review whose author is not in the tag's family.
- **Planned check.** Check (b) review will map the review commit's author name to a family (`deus-claude`/`deus-fable` = claude; `deus-grok` = grok; `deus-codex` = codex; `deus-gemini`/`deus-antigravity` = gemini; anything else, `deus-ops` included, = none) and refuse a mismatch with a new reason code (working name `REVIEW_AUTHOR_FAMILY`; final name set by the lane that implements it). It needs a `MUTANTS` entry, a `KILLS` case and a `test_merge_gate.js` case that builds a `[grok]` review authored by `deus-ops` (`MERGE_GATE.md` §10, "Maintaining the gate"). Whether the same check extends to writer commits and to `[pm]` manifest commits is decided in that lane's brief, since coordinator and PM commits on `main` are currently authored `deus-ops`.
- **MiniMax.** MiniMax runs manually through `tools/ops/minimax_cli.js` and its results are committed by `deus-ops` as `[minimax]`. It is not a gate family; a MiniMax result is never relabelled `codex` or any other provider (lane-bv's writer was relabelled `codex` to `minimax` on `main` after merge; the manifest must name the real writer before the gate runs).

### `check_claims.js`: the `pm` agent
- `pm` is an agent of its own (`AGENT_ALIASES`), not an alias of `grok`. The older aliases `grok_pm` and `grok_bot` still mean `grok`.
- It is recognised where an agent name stands alone: the subject tag `[pm]`, `--agent pm`, `DEUS_AGENT=pm`, `--lane pm`, and a `closedBy: pm` value. It is not matched inside free text (`EXACT_ONLY_AGENTS`), because "PM" also appears in clock times and in names such as "PM Grok Bot" (which still reads as `grok`). So a `docs/STATUS.md` row whose label or writer cell says "PM" does not become a `pm` lane.
- **Rule 4.4 whitelist.** For every other agent the checker reads the whitelist from the File-Ownership table of `docs/STATUS.md` as of the parent commit (`parseLaneMatrix`), so a commit cannot widen its own whitelist. The PM writes `docs/STATUS.md` itself, so a STATUS row would let one `[pm]` commit widen what the next may touch. Its whitelist is therefore built in (`PM_WHITELIST`) and added to the parsed table as the lane `PM (built-in whitelist)` (`withBuiltInLanes`):
  - `tasks/*/*/BRIEF*.md` (`BRIEF.md`, `BRIEF_REV2.md`, …),
  - `tasks/*/*/lane.json`,
  - `docs/STATUS.md`.

  `*` stays inside one path segment, so review files, reports, `launches/` prompts and anything outside a lane folder stay out of reach, as does any code (`game/**`, `tools/**`). The FROZEN / READ-ONLY row of STATUS still applies to these paths. With no whitelist table in STATUS at all, 4.4 fails for the PM as for everyone. Since 2026-09-29 the table is `docs/STATUS.md` section E (`Lane | Writer | Whitelist`, one row per open lane plus the FROZEN / READ-ONLY row); it mirrors each lane's `lane.json` `allowedPaths` until a tooling lane teaches 4.4 to read `allowedPaths` directly (`docs/STATUS.md` F). Rule 4.4 works on paths, so within `docs/STATUS.md` it cannot limit the PM to claim rows. Rules 4.1 and 4.2 still check every closure written anywhere in STATUS.
- **Lane hints.** The PM opens each lane on that lane's own branch, so for `pm` a branch name (`task/lane-<x>`), a merge hint or a `--range` head-ref hint never picks the lane; the built-in lane is used. An explicit `--lane` or `DEUS_LANE` still counts: `--lane c2` with `DEUS_AGENT=pm` fails 4.4 with "does not hold".
- **Rule 4.2.** `pm` is never a valid closer (`NON_CLOSERS`). A `closedBy: pm`, a `Reviewer` cell or a "reviewed by pm" in a WBS, STATUS, AUDIT_LOG or issues record, and a ledger line with `closedBy: pm`, fail 4.2, even with a review artifact committed by `[pm]`. So the PM cannot certify its own work or anyone else's. It may still commit a closure that another agent made and backed (for example `closedBy: grok` citing a `[grok]` review file).
- **Staged checks.** Before a `[pm]` commit: `node tools/governance/check_claims.js --agent pm` (or `DEUS_AGENT=pm`). On a lane branch the branch name is ignored for `pm`, as above.

Tests: `test_check_claims.js` cases `pass_pm_*`, `fail44_pm_*`, `fail42_pm_*`, `fail42_ledger_closedby_pm`, unit `unit_pm_agent`, real-history check `real_pm_claim_and_lane_opening_commits_pass` (`f5c1dfd2`, `d9766aa2`, `41d24474`), and ten `pm_*` source mutants. `test_merge_gate.js`: see `MERGE_GATE.md` §10. The author-family check above has no test yet.
