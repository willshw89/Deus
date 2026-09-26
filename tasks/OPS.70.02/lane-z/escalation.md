# SECURITY escalation: OPS.70.02 lane-z (2026-09-26)

**SECURITY.** The first real-repository run of the work-in-progress scanner found a string that looks like a real credential. Following BRIEF.md privacy rule 4, this file records only location, rule and length. No value, prefix or hash of the value is written here or anywhere else. Lane work stopped here.

## Findings (HEAD of task/lane-z = origin/main 425b594c146d5f353c10faa11f4b5d47f499b45f + the [pm]/[ops] lane-open commits)

| # | File | Line | Rule | Matched length | Context (no value) |
|---|---|---|---|---|---|
| 1 | `tools/generate_nano_banana_pro.js` | 14 | HIGH_ENTROPY (5.09 bits/char) | 50 chars (the string literal is 53 chars: a 3-character prefix, then the 50-character token) | The hard-coded fallback in `const API_KEY = process.env.GEMINI_API_KEY \|\| '<literal>'`, so it is presumably a Gemini / Google API key. |
| 2 | `docs/archive/STATUS_LEDGER_20260925.md` | 3682 | HIGH_ENTROPY (5.09 bits/char) | 50 chars | Inside a quoted user directive in the 2026-09-19 "Adult Male Human ... 12-Sprite Action Suite" entry. |

Findings 1 and 2 are the **same token**. I checked this by comparing sha256 digests in memory; the digest is not recorded. I also ran a `git grep` over HEAD for the same prefix followed by a 20+ character body, printing locations only. It matches only these two lines.

Both files are on `main` and on origin, so under `docs/SECURITY_AND_SECRETS.md` section 1 (line 14) and section 6 (lines 60-64) this is a committed-secret incident: revocation, history purge and an incident record. The PM and the Owner handle that. This lane cannot, because both files are outside its allowedPaths and the brief forbids acting on it.

## What was and was not done
- Scanned: every tracked file at HEAD (git ls-tree + git cat-file; 4361 text files scanned, 6258 binary skipped). No provider-format rule (OpenAI, Anthropic, Google `AIza`, xAI, GitHub, GitLab, JWT, PEM, .netrc, cookie, bearer) matched anything. The other 182 HIGH_ENTROPY hits are, judging by their redacted 4-character prefixes and locations, file paths (176, mostly under `docs/migration/`), URLs in `game/js/libs/pixi.js` (3) and the base64 alphabet table in three vendored libs (3). They are tuning work for the detector, not credentials.
- Not scanned: git history (earlier commits and other branches). The same key may also sit in older commits.
- Nothing outside the repository was read. No value was printed to the console, a log or any file.
- The scanner source `tools/security/scan_secrets.js` is still **uncommitted** (untracked) in the lane worktree `C:\Users\snewt\.deus_worktrees\lane-z`. Rule 4 says this commit holds this file alone. It is left there for the PM to keep or discard; nothing else was written.
- The scanner has no dedicated rule for this key format. The generic entropy detector caught it. A provider rule for this format is proposed as follow-up work, to be added only after the Owner decides how to proceed.

## Needed from the PM / Owner
1. Revoke the key in the provider console (policy section 6 step 1).
2. Decide on the history purge (section 6 step 2) and the incident record in `docs/telemetry/security_incidents.json` (section 6 step 4).
3. Tell this lane whether to resume OPS.70.02 once the key is revoked. On resume, the real-repo scan will keep reporting these two lines until the files are cleaned or the PM approves allowlist entries for them.
