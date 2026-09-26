# Lane Z Brief: OPS.70.02 secrets scanner and dependency checker

**NO ART GENERATION BY ANYONE (DEC-007).** Governance tooling only.

**Lane:** lane-z | **Task ID:** OPS.70.02 (Secrets scanner and dependency checker; `docs/worldgen/DEUS_WORLDGEN_WBS.md` M0.7 table, line ~468; Consolidation Phases 11E/11F) | **Branch:** task/lane-z | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-z` | **Writer:** claude | **Reviewer:** grok (independent attack/mutation review, launched later by the PM; the task is not DONE until that review passes) | **Base:** origin/main `425b594c146d5f353c10faa11f4b5d47f499b45f` | **Source:** Owner-authorised main-chat ops 2026-09-26 (PM launches and merges, 0028-AC A0). The row lists no dependency.

**allowedPaths** (exact; mirrored in `tasks/OPS.70.02/lane-z/lane.json`):
- `tools/security/**` (the path `docs/SECURITY_AND_SECRETS.md` section 5 names: `tools/security/scan_secrets.js`; plus `check_dependencies.js`, tests, fixtures, allowlist and baseline files)
- `tasks/OPS.70.02/**` (your REPORT and evidence; the launcher also writes its saved prompt under `tasks/OPS.70.02/lane-z/launches/`; leave that alone)

**FORBIDDEN:** everything else. In particular `.gitignore`, `.githooks/**`, `tools/ops/**` (including hooks and `install_lane_hooks.ps1`), `tools/governance/**`, `docs/**` (read only: the policies you implement), `game/**`, `art/**`. **Installing a pre-commit hook is NOT in scope** (OPS.30.03 is OWNER-GATED on DEC-004); provide a `--staged` mode a future hook can call, and stop there. You do NOT mint WBS IDs, change WBS statuses or answer Owner questions; proposed follow-up work is written `PROPOSED-Z-NN`.

## Privacy and safety rules for this lane (non-negotiable)
1. Scan **only git-tracked content of this repository** (`git ls-files`, `git show <rev>:<path>`, `git diff --cached`) and test fixtures your tests create at run time. Never open, list or read anything outside the repository: no user-profile files (`~/.claude.json`, `~/.gemini/`, `~/.codex/`, `.netrc`, SSH keys), no credential vault, no environment dump, no browser data.
2. **Never print, log or commit a matched secret value.** Output shows `file:line`, rule id, the first 4 characters and the length only (for example `AIza… (39 chars)`). Reports and the allowlist store a sha256 of the matched line, never the text.
3. **No realistic key strings in git.** GitHub push protection and our own scanner must not trip on your fixtures: build every fake key at run time in the test (concatenation of harmless fragments, obviously fake bodies such as `EXAMPLE`/`0000`), never as a committed literal that matches a provider format.
4. If the real-repo scan finds something that looks like a real credential, **do not paste it anywhere**: record only file, line, rule and length in `tasks/OPS.70.02/lane-z/escalation.md` (marked SECURITY), commit and push that file alone, and stop. The PM and Owner handle revocation.

## What to build
1. **`tools/security/scan_secrets.js`** (no npm dependencies, deterministic):
   - Rules from `docs/SECURITY_AND_SECRETS.md` sections 2 and 5: provider keys (OpenAI `sk-`, Anthropic `sk-ant-`, Google `AIza`, xAI `xai-`), bearer tokens, JWTs, private-key PEM headers, `.netrc`-style `machine … password` entries, session-cookie headers, plus common git-host tokens you justify in REPORT.md; a high-entropy detector (Shannon entropy over a length/charset window) with its thresholds as named constants; tracked `.env` / credential-file names (`.env`, `*.pem`, `id_rsa*`, `.netrc`, `credentials.json`, `.claude.json`) are findings.
   - Modes: default scans every tracked file at HEAD; `--staged` scans `git diff --cached` added lines (for a future hook); `--range <a>..<b>` scans added lines in a commit range; `--path <p>` for one file. Binary files (by NUL byte / extension list) are skipped and counted.
   - Allowlist `tools/security/secrets_allowlist.json`: `{ path, rule, lineSha256, reason }` entries; an allowlisted finding is reported as allowed; a stale allowlist entry (no longer matching) fails. Docs that mention prefixes as policy text (for example `docs/SECURITY_AND_SECRETS.md` quoting `sk-`) should not match at all if the rule requires a realistic body; tune rules so policy text is not a finding rather than allowlisting it, and show that in tests.
   - Exit 0 clean, 1 findings, 2 usage/git error. Output as redacted lines plus `RESULT: <files scanned>, <findings>, <allowed>`; `--json` for machines.
2. **`tools/security/check_dependencies.js`** (no npm dependencies), implementing `docs/DEPENDENCY_POLICY.md`:
   - No `node_modules/`, `package.json` `dependencies`/`devDependencies`, or lockfile under `game/` (and report any at repo root).
   - Every `require()` / `import` in tracked `tools/**/*.js` and `game/js/**/*.js` resolves to a Node built-in (policy section 2C lists fs, path, v8, perf_hooks, child_process, crypto; report other built-ins used, do not fail them unless the policy says so) or to a relative/project path that exists; any bare npm package name is a finding. Dynamic requires are reported as `UNRESOLVED_DYNAMIC`, not guessed.
   - `game/js/libs/` is frozen (policy 2B): a committed baseline `tools/security/libs_baseline.json` (sha256 per file at `425b594c146d5f353c10faa11f4b5d47f499b45f`) and a check that fails on any added, removed or changed lib file.
   - `node -v` >= 18 (policy 2A) reported; failure only below 18.
   - Exit 0 clean, 1 findings, 2 usage error; redacted-free plain output plus `RESULT:`; `--json`.
3. **Tests** `tools/security/test_scan_secrets.js` and `tools/security/test_check_dependencies.js`: one `PASS <name>` / `FAIL <name>` line per check and `RESULT: <n> passed, <m> failed`; exit 0 only if all pass. They create throwaway git repos under `os.tmpdir()` (delete them afterwards) with run-time-built fixtures: a planted fake key of each rule is detected (the WBS DoD: "a fake key planted in a fixture is detected"); the clean tree exits 0; staged/range modes see only added lines; redaction never prints more than 4 chars of a match; allowlist and stale-allowlist behaviour; binary skip; tracked `.env` detected; an npm package require detected; a missing relative require detected; a changed lib file detected. **Mutation checks**: apply each mutant to an in-memory copy of the tool source (never edit the real file on disk) and show the suite kills it (`PASS mutant_<name>_killed`): one per secret rule switched off, entropy detector off, redaction off (prints the full match), allowlist staleness off, npm-require check off, libs-baseline check off.

## Inputs (read; cite `file:line` at your base commit)
- `docs/SECURITY_AND_SECRETS.md`, `docs/DEPENDENCY_POLICY.md`, `docs/CONSOLIDATION_PLAN_V1.md` (Phases 11E, 11F), `docs/worldgen/DEUS_WORLDGEN_WBS.md` OPS.70.02 and OPS.30.03 rows; `.gitignore` (read only); `tools/ops/hooks/pre-push`, `tools/ops/install_lane_hooks.ps1` (read only: how hooks are wired today).

## Tests and commands
- In the FOREGROUND from the worktree root: `node tools/security/test_scan_secrets.js`, `node tools/security/test_check_dependencies.js`, `node tools/security/scan_secrets.js`, `node tools/security/check_dependencies.js`, `node tools/check_deus_syntax.js`. Light; **do not run the NW.js harness (`tools/run_tests.js`).**
- Before your final commit, run every `gateTests` entry of `tasks/OPS.70.02/lane-z/lane.json` exactly as written and paste raw output with `EXIT=` lines in REPORT.md.
- Prove scope: paste `git diff --name-only 425b594c146d5f353c10faa11f4b5d47f499b45f..HEAD` and show every path matches allowedPaths.

## Deliverables
1. The two tools, their tests, the allowlist (every entry with a reason; expected to be very short or empty) and the libs baseline.
2. `tasks/OPS.70.02/lane-z/REPORT.md`: every command with raw `EXIT=` lines; real-repo results (files scanned, binaries skipped, findings and allowed counts, redacted only; dependency findings by kind; libs baseline count); rule list with the source line in the policy for each; test counts and mutants killed; PROPOSED-Z-NN follow-ups (hook wiring for OPS.30.03, CI use for OPS.30.02, any policy/doc disagreement found); the scope diff; the final `git rev-parse HEAD`.

## Acceptance criteria (the independent Grok reviewer will check these)
- No file outside allowedPaths changed; no hook installed; nothing outside the repository read.
- A planted fake key of every rule is detected in a fixture; the clean tree exits 0; no secret-shaped literal is committed (the scanner run over the lane's own diff is clean); output is always redacted.
- The dependency checker fails on an npm require, a missing relative require and a changed frozen lib, and passes on main; every mutant is killed; all suites exit 0.
- Nothing self-certified; REPORT evidence is raw.

Commit messages start `[claude] OPS.70.02`.

## Standing rules (verbatim, every lane)
1. One primary writer per file set. Your write set is exactly the allowedPaths above. It is disjoint from every other live lane (table below), the merged governance/ops tools (`tools/governance/**`, `tools/ops/**`: read only) and the coordinator's files (`docs/STATUS.md`, `docs/VISION.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, `docs/telemetry/**`: read only).
2. Capture the exit code of every command, one per command (`"EXIT=$LASTEXITCODE"` in PowerShell, `echo EXIT=$?` in bash). Put raw values in your reports. Never type or paraphrase a commit hash: paste it from `git rev-parse` output.
3. Run commands in the FOREGROUND. Never end your turn while background jobs or child processes are running. Commit early (WIP commits allowed on your branch). Do not merge. Write only inside allowedPaths.
4. Commit and push to your own branch only: `git push origin task/lane-z` after your final commit (never any other branch, never `main`, never force). If the push is refused, do not work around it (never set `DEUS_INTEGRATOR`); write the refusal in your REPORT and stop; the PM pushes.
5. Do not merge. Do not self-certify: never write DONE, PASS, VERIFIED or CLOSED about your own work in any file (test-runner `PASS <check>` lines are fine). Your REPORT states what you did and the raw evidence. An independent Grok review decides; the PM merges.
6. Stop and write `tasks/OPS.70.02/lane-z/escalation.md` (then commit and push it) if you need a file outside your allowedPaths, find a bug in a read-only shared file, or find two sources that disagree in a way the brief does not settle. Never resolve an Owner question yourself.
7. Your very last output line must be `FINAL SHA: <sha>`, with the sha pasted from `git rev-parse HEAD` after a successful push (or `FINAL SHA: <sha> (push refused)`).

## Live lanes at preparation (write sets are disjoint; do not touch another lane's paths)
| Lane | Task | Role | Write set |
|---|---|---|---|
| K | WG.00.09b depth renderer Fix 2 | Grok reviewer running (writer done) | per `tasks/WG.00.09b/lane-k/lane.json` (`game/js/plugins/DEUS_Depth.js`, `game/js/plugins.js`, minimap/fog/daynight plugins and docs, `tools/test_layer_render_flat.js`, `tools/bench_render_layers.js`, `tools/test_minimap.js`, `tasks/WG.00.09b/lane-k/**`); its reviewer runs NW.js suites on this machine |
| V | SIM.60.02 spell-effect schema | Claude writer | `docs/schemas/spells/**`, `tools/spells/**`, `tasks/SIM.60.02/**` |
| X | WG.33.01 registry/catalogue/atlas integrity checker | Claude writer | `tools/verify_world_state_registry.js`, `tools/test_verify_world_state_registry.js`, `tools/wsr/**`, `tasks/WG.33.01/**` |
| Y | OPS.30.01 GATE runner and quarantine census | Claude writer | `tools/ops/run_gate.js`, `tools/ops/test_run_gate.js`, `tools/ops/quarantine.json`, `tools/ops/fixtures/run_gate/**`, `tasks/OPS.30.01/**` |
| Z | OPS.70.02 secrets scanner and dependency checker | Claude writer | `tools/security/**`, `tasks/OPS.70.02/**` |
| E | WG.00.09a attack plan | PAUSED (do not touch) | `docs/systems/UF_Depth_Attack_Plan.md`, `tasks/DEUS-TSK-FABLE-19C/*` |

