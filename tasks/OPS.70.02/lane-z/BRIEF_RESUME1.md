# Lane Z RESUME 1: OPS.70.02 after the SECURITY escalation (PM, 2026-09-26 ~07:45 CT)

**NO ART GENERATION BY ANYONE (DEC-007).** This file adds to `tasks/OPS.70.02/lane-z/BRIEF.md`; that BRIEF stays the authority for everything not changed here (allowedPaths, privacy rules, deliverables, acceptance criteria, standing rules).

## State of the branch (paste-checked by the PM)
- Your escalation `7fe90dd20418cb3517ac116ace26d0f87988566e` (`tasks/OPS.70.02/lane-z/escalation.md`) is handled. Keep that file as the historical record; do not edit it.
- Main `96483c517a95b10c5d52aec85d3b18ea01e599b4` ([pm] STATUS grant) was merged into task/lane-z at `86c074dad67a3db51082301d3571ef2675bf7c54`.
- Your untracked work-in-progress `tools/security/scan_secrets.js` was committed unchanged as `04828aa4084bb72f30e7cafedc83d61cb90bb95c` (`[wip] checkpoint before resume`). Continue from it.
- **The finding is already removed from the tree on this branch** by the PM-applied commit `e8375c904a8287fd7afd1c76bc63ab94d9dd6a62` (`[lane-z] security: remove hard-coded API key literal + incident record`), plus `abad39c78a327cfa62932358ea85cebc4d4b8f8a` (incident record cites the fix sha):
  - `tools/generate_nano_banana_pro.js`: reads `process.env.GEMINI_API_KEY` only; exits 1 with a clear error if unset.
  - `docs/archive/STATUS_LEDGER_20260925.md` line 3682: literal replaced by a redaction marker (single-line change).
  - `docs/telemetry/security_incidents.json`: sanitized incident record `SEC-2026-09-26-01` (no value, prefix or hash).
- These three paths were granted to Lane Z in `docs/STATUS.md` (main `96483c51`) **for that fix only**. They are NOT in your `lane.json` allowedPaths. **Do NOT touch the three fix files again** (no edit, no revert, no reformat). If you believe one of them is wrong, write escalation.md and stop.
- Key revocation is with the Owner. History purge is DECLINED (no history rewrite, no force push). The token therefore remains in git history (first added in `224b1b36`, and in the trees of older commits and older branches): this is a **known, accepted incident**.

## What changes in your work
1. **Baseline of known findings, keyed by fingerprint (hash, never the value).** Add `tools/security/secrets_baseline.json` (or extend the allowlist format, your choice; justify in REPORT.md) with entries like `{ "fingerprint": "<sha256 hex of the matched token>", "rule": "...", "incident": "SEC-2026-09-26-01", "onlyInHistoryBefore": "e8375c904a8287fd7afd1c76bc63ab94d9dd6a62", "reason": "..." }`.
   - A finding whose fingerprint is in the baseline is reported as `BASELINED` (redacted like every finding) and does not fail the run **only** when it is found in a commit that is an ancestor of `onlyInHistoryBefore` (history scans, `--range`).
   - The same fingerprint found at HEAD, in `--staged`, `--path`, or in any commit that is not such an ancestor still **fails** (a revoked key re-added is a new finding). Any other finding still fails. A baseline entry that matches nothing in its scope is reported (stale) as the allowlist rule says.
   - Compute the real fingerprint in memory from tracked content (for example `git show 224b1b36:tools/generate_nano_banana_pro.js`); never print, log or commit the value, its prefix beyond the BRIEF's 4-char redaction, or any substring. The fingerprint (sha256) is the only thing written.
   - Tests (run-time fixtures only, no realistic literal committed): baselined historical finding passes; the same fake token re-added in a later commit fails; a different fake token fails; staged/HEAD occurrence of a baselined fingerprint fails; the baseline file itself contains no rule match; mutants `mutant_baseline_ignores_scope_killed` (baseline applied everywhere) and `mutant_baseline_off_killed` are killed.
2. **Real-repo runs** (foreground, paste raw output with `EXIT=`): `node tools/security/scan_secrets.js` at HEAD must now exit 0 for this finding (tune the entropy detector for the other false positives listed in escalation.md; do not allowlist them wholesale); `node tools/security/scan_secrets.js --range 224b1b36^..224b1b36` must show the finding as `BASELINED` and exit 0.
3. **Scope proof:** paste `git diff --name-only origin/main...HEAD` (merge base is now `96483c51`). Every path must match your allowedPaths except the three PM-granted fix files from `e8375c90`/`abad39c7`; say so explicitly in REPORT.md. The libs baseline stays at `425b594c146d5f353c10faa11f4b5d47f499b45f` as the BRIEF says (`git diff --name-only 425b594c 96483c51 -- game/js/libs` is empty, so it equals the merge base).
4. **Finish the rest of the original BRIEF** with tests and mutation checks: `scan_secrets.js` (all modes), `check_dependencies.js`, both test suites, allowlist, libs baseline, REPORT.md with every gate in `lane.json` run exactly as written, PROPOSED-Z-NN follow-ups (include a provider rule for this token format, the one the entropy detector caught), final `git rev-parse HEAD`.

## Rules repeated
- Write only inside `tools/security/**` and `tasks/OPS.70.02/**`. Never read anything outside the repository. Never print, log or commit a secret value.
- Commit early (WIP commits fine). Commit messages start `[claude] OPS.70.02`.
- Push only your own branch: `git push origin task/lane-z`. Never main, never another branch, never force, never set DEUS_INTEGRATOR.
- Do not merge; do not self-certify. An independent Grok review decides; the PM merges.
- Last output line: `FINAL SHA: <sha>` pasted from `git rev-parse HEAD` after the push.