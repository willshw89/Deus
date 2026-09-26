# Task State: WG.00.12 Lane C2 — Machine-Enforced Governance (`check_claims.js`)

- **Task ID:** `WG.00.12` (Lane C2)
- **Role:** Writer: Claude (Lane C2) | Reviewer: Grok (Lane D(b))
- **Branch / Worktree:** `task/lane-c2` (`C:\Users\snewt\.deus_worktrees\lane-c2`)
- **Base commit:** `d1fbeab`
- **Brief:** `BRIEF.md` in the worktree. Governing directives: DEUS Directive 001, 001-A, 001-B. The directive texts are not in the repository, so the rules below come from `BRIEF.md`, `docs/CANONICAL_ROLES.md` §2-§3, `docs/STATUS.md` §3 and `docs/OWNER_DECISIONS.md` DEC-004.
- **Updated:** 2026-09-25

## Owned File Set (per `BRIEF.md`)
- `tools/governance/check_claims.js`
- `tools/governance/test_check_claims.js`
- `tasks/WG.00.12/c2_governance_state.md`
- `.git/hooks/pre-commit`: install command delivered, hook **not installed** (see Decisions needed)

## What Is Done (with Evidence)
1. **`tools/governance/check_claims.js`** checks one commit (the staged index, `--commit <rev>`, or `--range a..b`) against:
   - **4.1 Evidence required.** A WBS leaf, defect-ledger record or defect-table row that moves to a closing state must cite, in the record itself, either a commit hash that exists and is reachable from the new commit's parents, or a test run: the path of a script that exists in the new tree plus a passing outcome (`exit 0`, `N/N passed`, `N passed, 0 failed`, `RESULT: PASS`, `ALL ... PASSED`). Closing states: `DONE`, `CLOSED`, `COMPLETE`, `COMPLETED`, `RESOLVED`, `FIXED`, `VERIFIED`, `FROZEN`, `FINAL`, `ACCEPTED`, `APPROVED`, taken from the first word of the status cell (so `✅ Done`, `**COMPLETED**` and `~~OPEN~~ CLOSED` all count).
   - **4.2 Zero self-certification.** Ledger: `closedBy` must exist and not be a fixer (`fixedBy`, FIX_READY actors, the `[agent]` of `fixCommit`), and a fixer may not commit the closure. If the committing agent is unknown, the closure is rejected. WBS: a closing leaf must name an independent reviewer (`closedBy: grok`, `verdict: grok`, `reviewed by grok`) who is neither an owner (old or new Owner cell) nor the author of a commit the row cites. STATUS/AUDIT_LOG defect rows: checked against the ledger record when one exists, otherwise treated like a WBS row.
   - **4.3 WBS revision and immutability.** Adding a leaf needs `Rev` to go up, plus a Revision Log row for the new Rev when the file keeps a log. A leaf is never deleted, renamed or retitled, and no ID is used twice (including a single row inside a range row such as `WG.22.01–25`). Replacing a range row with one row per ID is allowed. Any other non-status edit (owner, scope) also needs `Rev` to go up. `Rev` may never go down or disappear.
   - **4.4 Single-writer whitelist.** Every touched path must be in the committer's lane whitelist, read from `docs/STATUS.md` **in the parent commit**, so a commit cannot widen its own whitelist. No touched path may be on the FROZEN / READ-ONLY row. Renames count as delete plus add. In a merge, only paths that differ from every parent count.
   - **`--check-backfill`** scans `tasks/*/defects.jsonl`, `tasks/**/messages.jsonl` and `docs/agents/mailboxes/**/*.jsonl` (or files given). It flags: **B1**, two different agents acting on one item less than 1000 ms apart; **B2**, two or more items given a certifying stamp (FIX_READY, VERIFY_*, CLOSED, …) less than 1000 ms apart; **A1-A4**, closures with no `closedBy`, closed by a fixer, closed before the fix or with no readable time, or with no evidence.
   - **`--install-hook` / `--uninstall-hook`.** Writes `.git/hooks/pre-commit`, which runs the branch's own copy of the checker and **fails closed** when that copy is missing. The installer refuses to overwrite a hook it did not write, and refuses a hooks path outside the repository (`core.hooksPath`), unless `--force` is given.
   - Identity: lane from `--lane`, `DEUS_LANE`, or branch `task/lane-<x>`; agent from `--agent`, `DEUS_AGENT`, the lane row, or (audits only) the `[agent]` subject prefix. With neither lane nor agent, the commit is rejected. Environment identity never applies to `--commit` audits.
2. **`tools/governance/test_check_claims.js`**: 88 checks. It builds a throwaway git repository in `%TEMP%`, stages one change per case and runs the checker:
   - 5 parser unit checks; 14 clean cases that must pass; 37 forbidden changes that must fail under exactly the named rules (4.1 ×9, 4.2 ×9 (one also fails 4.4), 4.3 ×10, 4.4 ×9); 6 backfill cases, including the 999 ms / 1000 ms window edge; 1 hook case (install, reject out-of-lane commit, accept in-lane commit, fail closed without checker, refuse a foreign hook, uninstall); 1 text-format check; 2 read-only real-history checks.
   - **22 mutants**, each switching one check off. Every one must make a case fail, which shows the checks can fail (AGENTS.md rule 4).
   - Run 2026-09-25: `node tools/governance/test_check_claims.js` → `RESULT: 88 passed, 0 failed`, exit 0, about 30 s.
   - Harness failure check: a copy of the test file with one expectation changed (`fail41_done_without_evidence` expecting 4.2) printed `FAIL fail41_done_without_evidence: exit 1, failing rules [4.1], expected [4.2] …` and `RESULT: 72 passed, 1 failed`, exit 1. The copy was deleted afterwards. It ran outside the repository, so the two real-history checks were skipped, which is why its total is lower.
3. **Real history (read-only runs):**
   - `node tools/governance/check_claims.js --commit 31676cf` (Gemini's merge that marked WG.00.08 DONE) → exit 1. FAIL 4.2: `WG.00.08 -> DONE: names no independent reviewer … owners and cited-commit authors are claude, gemini; the committer, gemini, is one of them`. FAIL 4.3: the owner cell changed with no `Rev` increase. FAIL 4.4: the parent's STATUS had no whitelist table. 4.1 passed (it cites `2e4571a`).
   - `node tools/governance/check_claims.js --check-backfill` on this tree → exit 1, 6 flags. **B1 ×4**: ATK-19B-001 and ATK-19B-002 each have DEFECT (grok) → FIX_READY (fable) 46-47 ms apart, and FIX_READY → DEFECT_CLOSED (grok) 48-52 ms apart, in `tasks/messages.jsonl` and `tasks/WG.00.08/defects.jsonl`. **B2 ×2**: the two `owner_review` closures at 20:55:37Z, and Grok's two closures at 21:01:30Z.
   - `--range 31676cf..d1fbeab` → 5 of 5 rejected, all on 4.4. The four commits before `fbb534f` have no whitelist table in the parent STATUS. `d1fbeab`'s parent matrix (lanes A-E, no coordinator row) gives Gemini lanes A+B only, so all 18 paths fall outside.
4. **This commit, self-checked:** see "Findings" F1. The checker rejects it on 4.4 for two of its three paths.

## Findings (for Gemini, Coordinator; STATUS is Gemini-exclusive)
- **F1 (MAJOR, blocks installing the hook): the Lane C2 whitelist does not match `BRIEF.md`.** `tools/governance/test_check_claims.js` is in no lane. `tasks/WG.00.12/c2_governance_state.md` falls under Lane C1's `tasks/WG.00.12/*`. `node tools/governance/check_claims.js` on this staged commit reports `FAIL 4.4` for both paths; `tools/governance/check_claims.js` passes. The files were committed as `BRIEF.md` and the user instructed. The hook is not installed, so nothing blocked the commit. Fix: add both paths to Lane C2 in STATUS §3 (and narrow C1 to exclude them).
- **F2 (MINOR): the matrix is titled "No Overlapping Write Sets" but has overlaps.** `tasks/WG.00.08/defects.jsonl` is in Lane A (`tasks/WG.00.08/*`) and Lane D. `tasks/WG.00.12/grok_adversarial_review.md` is in Lane C1 (`tasks/WG.00.12/*`) and Lane D.
- **F3 (MINOR): who commits closure lines.** STATUS gives Lane D (Grok) the defects.jsonl closure lines, but `8d1c7c3` shows Gemini committing Grok's closures. `check_claims.js` allows the relay: it bars fixers from committing a closure, and does not require the committer to be `closedBy`. A Gemini relay passes 4.4 only because of Lane A's `tasks/WG.00.08/*`.
- **F4 (for Grok): B2 also flags Grok's own 21:01:30Z pair.** The brief's rule is "stamped in a rapid burst (< 1 second)", and those two closures share one second. The detector does not judge intent; a reviewer has to rule on whether one review session signing two defects counts as backfill.
- **F5 (MINOR, Lane C1's file, not edited): `tools/governance/check_wbs_integrity.js` skips range rows.** Its leaf regex skips range rows such as `WG.22.01–25` (6 in the WG WBS). Its fallback `Rev[:\s]+(\d+)` can match "Rev" text outside the header.

## Interpretations for Review (Grok, Lane D(b), please attack these)
- Closing synonyms, the test-run citation format, and the "reachable from the parents" requirement are my reading of "explicit commit hash or test run citation".
- A closing WBS leaf must **name** an independent reviewer. That is stricter than "closer ≠ author", because the machine can only see independence when a reviewer is named (mechanizes CANONICAL_ROLES §2 "independent closure reviewer's verdict").
- Owner and scope edits need a Rev increase, and titles never change. The WBS header anchor says a leaf changes "only by status or retirement", yet Rev 15 corrected WG.00.07's scope, so edits with a Rev bump are allowed.
- Claude and Fable count as one agent, as do Gemini and Antigravity, for independence. In the current matrix that means an agent-only `claude` gets lanes B + C1 + C2 + E.
- `*` in a whitelist does not cross `/` (`tasks/WG.00.12/*` does not cover `tasks/WG.00.12/sub/x`); `**` does.
- "Status lines" for backfill are the message-bus JSONL lines. Markdown status tables carry dates only, so no sub-second burst can be measured there.

## Known Limits
- Identity is declared, not authenticated. A hook cannot know which agent is typing. `--commit` / `--range` audits use the `[agent]` subject prefix instead.
- `git commit --amend`: pre-commit compares the index with the commit being amended, so that commit's earlier changes are not rechecked. `--range` audits catch them.
- `--no-verify` skips any hook. DEC-004 (bypass policy) is still `OPEN`.
- Reviewer names are read from text, so "not reviewed by grok" counts as naming grok. Only table rows are parsed; bullet-list records are not.
- Renaming or moving a WBS file counts as deleting all its leaves (4.3).
- Git hooks live in the common `.git/hooks` (`C:/Users/snewt/OneDrive/Desktop/UF/.git/hooks`). Installing from any worktree turns the hook on for every lane and for the canonical checkout.
- The hook fails closed on any branch that does not yet contain `check_claims.js`.

## Exact Next Step
1. Grok (Lane D(b)): attack `check_claims.js` on this branch. Start with the Interpretations and Known Limits above, and add any bypass found as a failing case in `test_check_claims.js`.
2. Gemini: fix STATUS §3 (F1, F2), then merge `task/lane-c2` into `main`.
3. Owner: rule on DEC-004. Then install the hook once from the canonical checkout: `node tools/governance/check_claims.js --install-hook`. Do this only after the other lanes have `main` merged in; otherwise their commits are rejected because their branch has no checker.

## Open Defects / Questions
- F1-F5 above. No defect IDs assigned; the coordinator routes them.

## Relevant Commands
```bash
node tools/governance/test_check_claims.js                 # 88 checks incl. 22 mutants, ~30 s
node tools/governance/check_claims.js                      # check the staged index (lane from branch task/lane-<x>)
node tools/governance/check_claims.js --commit 31676cf     # audit one commit
node tools/governance/check_claims.js --range main..task/lane-c2
node tools/governance/check_claims.js --check-backfill     # ledgers + message bus
node tools/governance/check_claims.js --install-hook       # NOT run; see Exact Next Step 3
```
