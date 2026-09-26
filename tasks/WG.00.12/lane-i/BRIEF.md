# Lane I Brief: Automated Merge Gate (Task WG.00.12)

**Lane:** lane-i  
**Task ID:** WG.00.12  
**Branch:** task/lane-i  
**Writer:** claude  
**Reviewer:** grok  
**Allowed Paths:**
- `tools/governance/merge_gate.js`
- `tools/governance/test_merge_gate.js`
- `tools/governance/MERGE_GATE.md`
- `tasks/WG.00.12/lane-i/**`

---

## Standing Directives & Non-Negotiables
1. **NO ART (DEC-007):** Never generate, request or integrate art, and never tell anyone to.
2. **Execution Discipline:** Run tests in the FOREGROUND. Never end your turn while background jobs or child processes are running. Commit early (WIP commits allowed on your branch). Do not push. Do not merge. Write only inside allowedPaths.
3. **No External NPM Dependencies:** Plain Node.js standard library only (child_process, fs, path, etc.).

---

## Deliverables & Specification

### 1. `tools/governance/merge_gate.js`
CLI tool for validating and executing strict merge gates.
Usage:
```bash
node tools/governance/merge_gate.js --lane <lane> --manifest tasks/<id>/<lane>/lane.json [--dry-run]
```
The merge gate must REFUSE (exit non-zero, print clear named reason codes) unless ALL conditions hold:
- **(a) SCOPE:** Every file in `git diff --name-only <merge-base main>..<tip>` must match the manifest `allowedPaths`. The manifest must be verified as committed by the coordinator's `[gemini]` commit; any later modifications to `lane.json` by another tag/agent fail the gate immediately.
- **(b) REVIEW:** A review commit exists on the branch whose subject tag (`[claude]`, `[grok]`, `[fable]`) differs from the writer's agent tag. Note: `[claude]` and `[fable]` count as ONE family (both run on Claude CLI). The review commit must touch ONLY `tasks/<id>/<lane>/review_<agent>_<sha8>.md`. That file must hold the full 40-character commit hash of the reviewed commit, and a line with `VERDICT: CLEAN PASS` or `VERDICT: PASS`. The reviewed hash must be the last non-review commit on the branch (no writer commits may exist after the review commit).
- **(c) TESTS:** Each entry in `gateTests` runs as its own child process (`spawnSync`, no shell string chaining) in a fresh temporary clone created at the tip, with real captured exit codes; all must exit 0; any per-test timeout counts as failure. If a test is present on the quarantine list in `tools/ops/gate_tests.json` (if present), the gate fails.
- **(d) PUSHED:** After `git fetch origin`, verify `rev-parse <branch> == rev-parse origin/<branch> == git ls-remote origin refs/heads/<branch>`.
- **(e) MAIN INTEGRITY:** `main` must be clean (no uncommitted changes) and equal to `origin/main`.
- **(f) EXECUTION:** On success without `--dry-run`, it performs `git merge --no-ff <checked sha>` into `main` (it NEVER pushes). When `--dry-run` is passed, it executes every validation check and prints the summary table without merging.
- **(g) SUMMARY TABLE:** Outputs a machine-generated summary table (raw git rev-parse / ls-remote hashes, diff file list, reviewer file and verdict, each test command + exit code + duration, final `GATE: PASS/REFUSED` + exit code).

### 2. `tools/governance/test_merge_gate.js`
Comprehensive test suite using throwaway temporary repos with a local bare "origin" under `%TEMP%`.
Must prove refusal (exit non-zero with matching reason code) for at least:
1. Same-agent-tag review (e.g. `[claude]` reviewing `[claude]`).
2. `claude`-vs-`fable` review (`[fable]` reviewing `[claude]` or vice versa).
3. Review naming a different hash than the writer's tip.
4. Review with writer commits placed after it.
5. Missing verdict or non-PASS verdict (e.g. `FAIL` or incomplete).
6. A failing test command.
7. A test that exceeds its `timeoutSec`.
8. An out-of-scope file present in the branch diff.
9. Writer editing or tampering with `lane.json`.
10. Unpushed branch (local ahead or divergent).
11. Local branch != remote origin.
12. One valid passing case that exits 0 and prints `GATE: PASS`.
Must support `--mutant=<name>` flags disabling specific checks, where each mutant is verified caught by the self-tests.

### 3. `tools/governance/MERGE_GATE.md`
Clear architectural and usage documentation describing the gate's security model, checks, failure reason codes, and diagnostic steps.
