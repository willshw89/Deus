# Lane Z REPORT: OPS.70.02 secrets scanner and dependency checker

**NO ART GENERATION BY ANYONE (DEC-007).** Governance tooling only. Writer: claude. Reviewer: grok (independent; not run yet). This report states what was done and the raw evidence. It does not certify anything.

Inputs:
- `tasks/OPS.70.02/lane-z/BRIEF.md`, and `tasks/OPS.70.02/lane-z/BRIEF_RESUME1.md`, which wins where the two differ.
- `docs/SECURITY_AND_SECRETS.md` and `docs/DEPENDENCY_POLICY.md`.
- `docs/CONSOLIDATION_PLAN_V1.md:122-123` (Phases 11E/11F) and `docs/worldgen/DEUS_WORLDGEN_WBS.md:468` (the OPS.70.02 row).

The policy files and the plan are unchanged between the lane base `425b594c` and HEAD: `git diff --stat 425b594c HEAD -- docs/SECURITY_AND_SECRETS.md docs/DEPENDENCY_POLICY.md docs/CONSOLIDATION_PLAN_V1.md` printed nothing. So the `file:line` citations below hold at the base.

**Gates ran at `1408390ffcf6db9fc189adcb721b8a4fe8ddb991`** (`evidence/gates_head.txt`), the last code commit. The commit that adds this REPORT and `evidence/` is its child and changes nothing else. Its sha is printed as `FINAL SHA` when the session ends; a commit cannot contain its own sha.

## 1. What was built (all inside `tools/security/**`)

| File | What it is |
|---|---|
| `tools/security/scan_secrets.js` | Secrets scanner, with no npm packages. It reads git-tracked content only, in four modes: the HEAD tree (`git ls-tree` + `git cat-file --batch`); the staged diff (`--staged`, `git diff --cached`); a commit range (`--range a..b`: `git log -p --cc` in batches of 64 commits, plus commit messages via `git log -z`); or one tracked file inside the repository (`--path`). Output is redacted, `--json` is available, and the exit code is 0 clean, 1 findings or stale entries, 2 usage or git error. |
| `tools/security/secrets_allowlist.json` | Allowlist of `{ path, rule, lineSha256, reason }` entries. It is **empty**: the rules were tuned so that policy text and look-alikes are not findings (tests `policy_text_is_not_a_finding`, `look_alikes_are_not_findings`, `clean_tree_exit_0`). |
| `tools/security/secrets_baseline.json` | Known-incident baseline (BRIEF_RESUME1 item 1). One entry, SEC-2026-09-26-01, keyed by the sha256 fingerprint of the value. |
| `tools/security/check_dependencies.js` | Dependency checker for `docs/DEPENDENCY_POLICY.md`, with no npm packages. A small JS lexer extracts module references; it also checks npm artifacts, the frozen `game/js/libs/` and `node -v`. It reads the HEAD tree plus the working-tree state of `game/js/libs/`. Supports `--json`, exits 0/1/2, and has `--make-libs-baseline <commit>`. |
| `tools/security/libs_baseline.json` | sha256 of the 6 files under `game/js/libs/` at `425b594c146d5f353c10faa11f4b5d47f499b45f` (`evidence/libs_baseline_remake.txt`: remade by the tool with a `diff` exit of 0, and cross-checked with `git cat-file blob … \| sha256sum`). `git diff --name-only 425b594c 96483c51 -- game/js/libs` is empty, so the lane base and the merge base give the same baseline. |
| `tools/security/dependency_baseline.json` | 17 known pre-existing require findings (19 occurrences) on main. See section 4 and Decisions. |
| `tools/security/test_scan_secrets.js`, `tools/security/test_check_dependencies.js`, `tools/security/test_support.js` | Tests and mutation checks. Fixtures are throwaway git repositories under `os.tmpdir()`, with hermetic git settings (no system or user config, fixed identity and dates), deleted at the end. Every fake credential is built at run time. Mutants are in-memory copies of the tool source compiled with `Module#_compile`; the file on disk is never written. |

In this session the lane wrote nothing outside `tools/security/**` and `tasks/OPS.70.02/**`, and installed no hook. Nothing outside the repository was read, except the test fixtures under `os.tmpdir()` and my helper scripts under `%TEMP%\lanez`, which read this repository's tracked content only.

## 2. Secret rules and their policy sources

| Rule | Matches | Policy source |
|---|---|---|
| `PRIVATE_KEY_PEM` | `-----BEGIN … PRIVATE KEY-----` headers (RSA, OPENSSH, EC, ENCRYPTED, PGP … BLOCK) | `docs/SECURITY_AND_SECRETS.md:23` (private SSH keys) |
| `ANTHROPIC_KEY` | `sk-ant-<2-12 alnum>-<32+ body>`; the body must hold upper, lower and digit | `:21` |
| `OPENAI_KEY` | `sk-[<2-10 lower>-]<32+ body>` (not `sk-ant-`), with the same body test | `:21`, `:53` |
| `GOOGLE_API_KEY` | `AIza` + exactly 35 `[0-9A-Za-z_-]` | `:21`, `:53` |
| `GOOGLE_OAUTH_TOKEN` | `ya29.` / `1//0` + a 30+ generated body | `:22` (OAuth access/refresh tokens), `:34` (Gemini auth) |
| `XAI_KEY` | `xai-` + a 32+ generated body | `:21`, `:53` |
| `GITHUB_TOKEN` | `gh[pousr]_` + 36-251 alnum; `github_pat_<22>_<59>` | Git-host token, justified: `origin` is a GitHub remote, and a GitHub token grants push/read access to this repository, so it is an authentication token (`:22`). Distinctive prefix, near-zero false-positive cost. |
| `GITLAB_TOKEN` | `glpat-` + 20+ | Git-host token (the `:22` category), justified as the second common git host with a fixed prefix. There is no GitLab remote today, so it is cheap insurance. |
| `JWT` | `eyJ<8+>.eyJ<8+>.<8+>` | `:22` |
| `NETRC_PASSWORD` | `machine <host> [login …] [account …] password <value>`; placeholders such as `<PASSWORD>`, `$VAR` and `xxx` are not findings | `:23` (`.netrc` entries) |
| `SESSION_COOKIE` | `Cookie:`/`Set-Cookie:` header with a `sess`/`sid`/`token`/`auth`/`jwt`/`login` cookie whose value is 16+ chars with letters and digits | `:24` |
| `BEARER_TOKEN` | `bearer <20+ chars with letters and digits>` (any case) | `:22`, `:53` |
| `HIGH_ENTROPY` | See the constants below | `:52` |
| `CREDENTIAL_ASSIGNMENT` | A credential-named assignment with `=`, `:`, `:=` or `=>`. Names: `password`, `secret`, `token`, `api_key`, `access_key`, `private_key`, `credential`, `auth…` (`authorization` yes, `author…` no), or an upper-case `<X>_KEY` (`GEMINI_KEY`, `GEMINI_KEY_2`; not `cache_key`). A quoted value may hold any character except white space. The value must be 16+ chars with letters and digits and at least 3.0 bits. It runs after the entropy detector, on spans nothing else took. | `:12` (passwords, private credentials), `:52` |
| `CREDENTIAL_FILE` | A tracked file named `.env`, `.env.*`, `*.pem`, `id_rsa*`/`id_dsa*`/`id_ecdsa*`/`id_ed25519*`, `.netrc`/`_netrc`, `credentials.json`, `.claude.json`, `.git-credentials`, `oauth_creds.json`, `*.p12` or `*.pfx`. Checked for every file, binary or not. | `:36`, `:54` (and `:35` for `.claude.json`) |

Every rule is also applied to **file names**, submodule (gitlink) paths included. A value used as a path segment is a finding at line 0 (`:23`, "personal paths containing credentials"). A path that holds a value is printed with that value redacted, for example `keys/[Ab12... (40 chars)].txt`. Control characters in a path are printed as `\xNN`, so a file name cannot forge an output line.

Constants (`tools/security/scan_secrets.js`):
- `REDACT_KEEP = 4`.
- A value shorter than `REDACT_MIN_LEN_FOR_PREFIX = 16`, or a value a person may have chosen (rules `NETRC_PASSWORD` and `CREDENTIAL_ASSIGNMENT`, `HUMAN_VALUE_RULES`), shows **no** characters. The `lineSha256` of its line is `null` in the output on every finding of that line: a password could otherwise be recovered from a prefix plus a line hash.
- `ENTROPY_MIN_LEN = 32` and `ENTROPY_MAX_LEN = 256`. A longer run, measured before any `/` split, is a data blob and is skipped.
- `ENTROPY_MIN_BITS = 4.5` (Shannon bits per character). The run must also hold upper, lower and digit.
- `ENTROPY_SHORT_MAX_LEN = 47` and `ENTROPY_SHORT_MIN_BITS = 4.2`, for runs made of letters and digits only (the common API-key shape: 32 random alnum characters rarely reach 4.5 bits).
- `ENTROPY_HEX_MIN_BITS = 3.0`. Pure hex counts only as the value of a credential-named assignment found within `ENTROPY_CONTEXT_WINDOW = 60` characters before the run.
- `ENTROPY_SEQ_RUN = 6`.
- `ASSIGN_MIN_LEN = 16` and `ASSIGN_MIN_BITS = 3.0`.
- `EXT_SNIFF_MAX_BYTES = 65536`.
- Every quantifier in the name-based rules is bounded, so a long line costs linear time (test `scan_time_linear_on_long_lines`).

Entropy tuning for the false positives listed in `escalation.md` (176 of the 184 first-run hits were paths or URLs, and 3 were base64 alphabet tables). These are rule changes, not allowlist entries:
- `/` separates path and URL segments. A run containing `/` is judged per `/`-free segment. It is judged whole only when it shows a base64 sign that paths lack (`+` or `=` padding), or when it is the value of a credential-named assignment.
- A run holding 6 or more consecutive ascending characters (`ABCDEF`, `012345`) is an alphabet or lookup table.
- A run longer than 256 characters is skipped whole (inline data URIs).

Each new threshold and rule was measured on HEAD plus every commit in `git rev-list --all` (965 commits, 2.88 M added lines) before it was adopted (`%TEMP%\lanez\measure.js`):
- The 4.2-bit alnum-only threshold, the credential-assignment rule, NUL-stripped scanning and file-name scanning added **0** hits.
- A lower threshold for all short runs would have added the `effekseer.min.js` emscripten identifiers and the `SEG-…` catalogue IDs (all contain `_` or `-`), so the lower threshold is limited to letters and digits.
- Before the 256-character skip was moved ahead of the `/` split, an inline base64 image in `art/review/human_male_showcase_widget.html:37` had segments at up to 4.50 bits: a false positive waiting to happen.

The real-repo runs in section 5 confirm the final rule set: 0 findings at HEAD and in all history.

Binary handling:
- A file with a listed binary extension (images, audio, fonts, archives, engine formats) is skipped and counted, unless it is text. In HEAD and `--path` modes, one of at most 64 KB with no NUL byte is scanned as `BINARY_EXTENSION_TEXT`. In `--range` and `--staged` modes the patch already holds its added lines, so any size is checked the same way. At HEAD, reading all 905 MB of binary-extension blobs would be too slow; the 5,094 files up to 64 KB are 63.7 MB.
- A file with NUL bytes (UTF-16 text, or a binary with an unlisted extension) is scanned with its NUL bytes removed and listed as `NUL_FILE`.

## 3. Baseline of the known incident (BRIEF_RESUME1 item 1)

I chose a **separate file**, `tools/security/secrets_baseline.json`, rather than extending the allowlist format, because the two key on different things:
- An allowlist entry keys on a **line** at a path (`lineSha256`) and applies to the current content of that file.
- A baseline entry keys on a **value** (`fingerprint` = sha256 of the matched value) and applies only to **history before a fix commit**.

Folding one into the other would let an allowlist entry match a value anywhere, or a baseline entry match current content, which is exactly what BRIEF_RESUME1 forbids. When both could match, the baseline is checked first.

Entry fields: `{ fingerprint, rule, incident, onlyInHistoryBefore, addedIn, reason }`. `addedIn`, the commits that added the value, is my addition to BRIEF_RESUME1's example.

Behaviour, each point with a test (the two mutants named in BRIEF_RESUME1 are killed):
- **Baselined in history.** The value is BASELINED (redacted like every finding) and the run passes only when:
  - the scan is `--range`;
  - the rule matches the entry;
  - the commit is listed in `addedIn`; and
  - every `addedIn` commit is a strict ancestor of `onlyInHistoryBefore` (checked when the baseline is loaded, with `git merge-base --is-ancestor`, never the fix itself).

  BRIEF_RESUME1's condition ("only when … an ancestor of onlyInHistoryBefore") therefore holds. Limiting the scope to `addedIn` came from pre-review 2: without it, a value removed, added again and removed again by a later fix would pass its second addition. Tests: `baseline_historical_finding_passes`, `baseline_only_in_addedIn_commits`.
- **Re-added later: fails.** The same value added again is a finding, whose FINDING line says the fingerprint is baselined only in the history before the fix. Tests: `baseline_readded_later_commit_fails`, `baseline_whole_history_fails_on_readd_only`.
- **Different value: fails.** Test: `baseline_different_value_fails`.
- **Not in other modes.** At HEAD, in `--staged` and in `--path`, the baseline never applies. Tests: `baseline_head_occurrence_fails`, `baseline_staged_occurrence_fails`, `baseline_path_occurrence_fails`.
- **Stale entries fail.** An entry is STALE (exit 1) when a `--range` scan includes one of its `addedIn` commits but did not baseline the value there: `baseline_stale_entry_fails`. It is not judged when its `addedIn` commit is outside the range: `baseline_staleness_only_when_addedIn_scanned`.
- **Checks on the baseline itself:**
  - The tree of `onlyInHistoryBefore` must no longer contain the value, otherwise exit 2; a wrong sha would silently widen the scope. Test: `baseline_fix_commit_must_remove_the_value`. The real entry passes this check against `e8375c90`.
  - An entry whose commits are missing from the clone (a shallow clone) becomes **inactive**. It prints `BASELINE_INACTIVE`, its value fails like any finding, and unrelated scans still run. Test: `baseline_missing_commits_make_the_entry_inactive`.
  - A malformed entry, or an `addedIn` commit that is not in the history before the fix, is exit 2. Test: `baseline_bad_ancestry_or_shape_exit_2`.
- **Baseline before allowlist.** Test: `baseline_wins_over_allowlist_in_history`.
- **The baseline file matches no rule.** Test: `baseline_file_has_no_rule_match`.
- **Mutants killed:**
  - `mutant_baseline_ignores_scope_killed` (baseline applied in every mode and every commit)
  - `mutant_baseline_off_killed`
  - `mutant_baseline_ignores_ancestry_killed`
  - `mutant_baseline_scope_not_limited_to_addedIn_killed`
  - `mutant_baseline_staleness_off_killed`
  - `mutant_baseline_fix_tree_check_off_killed`
  - `mutant_baseline_missing_commits_not_inactive_killed`

The real entry:
- fingerprint `6717051db5d36025cfa8d757d75264ef427722889a17420311c497828eee8027`
- rule `HIGH_ENTROPY`, incident `SEC-2026-09-26-01`
- `onlyInHistoryBefore` `e8375c904a8287fd7afd1c76bc63ab94d9dd6a62`
- `addedIn` `224b1b36dad8c3c77a7aef3a46e7980790361a2a` and `d1fbeab84a9ca07fce905f65d5bbffc6148c566c`

How the fingerprint was computed: in memory, by a helper outside the repository (`%TEMP%\lanez\find_token.js`). It ran the scanner's own `scanLine` over line 14 of `git show 224b1b36:tools/generate_nano_banana_pro.js`, and printed only the rule, the length (50) and the sha256. It then searched the added lines of every commit in `git log --all` (938 commits at the time) and every commit message for the same value, printing locations only. Found:
- `224b1b36dad8 tools/generate_nano_banana_pro.js:14`
- `224b1b36dad8 docs/STATUS.md:12`
- `d1fbeab84a9c docs/archive/STATUS_LEDGER_20260925.md:3682`
- no commit message

The value, its prefix and any substring were never printed, logged or written. The scanner's own output for the required `--range 224b1b36^..224b1b36` run shows the 4-character redaction the brief permits. In every copy committed with this report, those 4 characters are replaced with `####`; the reviewer can re-run the command locally.

Why the rule is `HIGH_ENTROPY`: the literal is a 3-character prefix followed by a 50-character token (escalation.md). It is not an `AIza…` key, so no provider rule matches it; the entropy detector matched the 50-character token. That is what PROPOSED-Z-03 is for.

Note for the incident owner (not acted on, because `docs/telemetry/**` is read-only for this lane): the incident record lists 2 locations. History holds a third occurrence, `docs/STATUS.md:12` at `224b1b36`, and that line later moved into the archive ledger in `d1fbeab8`.

## 4. Dependency checker design notes

**Scope.** The require check covers tracked `tools/**/*.js` and `game/js/**/*.js` at HEAD, including the frozen libs. `.mjs`/`.cjs` files in the same folders are read too, but their results are `NOTE` lines only: they are outside the brief's `*.js` scope. Today that is one file, `tools/srd_extract/optional/render_pages.mjs:33`, which requires the npm package `@napi-rs/canvas` through `createRequire` (PROPOSED-Z-04c).

**What a reference resolves to:**
- **Node built-ins** (`module.isBuiltin`, the `node:` prefix; subpaths count as their parent). Policy 2C built-ins (`fs, path, v8, perf_hooks, child_process, crypto`, `docs/DEPENDENCY_POLICY.md:34`) pass silently. Other built-ins are counted and reported as `NOTE BUILTIN_OUTSIDE_POLICY`: the policy does not forbid them.
- **`nw.gui`** is an NW.js runtime module. It is accepted in `game/` and is an `NPM_REQUIRE` finding in `tools/`.
- **Relative paths** must name a tracked file the way Node loads it: the exact name, `.js/.json/.mjs/.cjs/.node`, a folder's `index.*`, or a folder's `package.json` `main`. A spec, or a `main`, ending in `/` names a folder only. Paths resolve against the file's folder and, for game code, also against the NW.js app root `game/`.
- **`__dirname` folding.** `path.join(__dirname, "…")`, `path.resolve(__dirname, "…")` and `__dirname + "/…"` with literal parts are folded into a relative path.
- **Unresolved.** Anything else computed, and `require` used as a value rather than called (`r = require`, `(0, require)(…)`, `require.call`), is `NOTE UNRESOLVED_DYNAMIC`. It is never guessed.
- **Absolute and bare.** Absolute paths and `file:` URLs are `ABSOLUTE_REQUIRE`. Bare names are `NPM_REQUIRE`.

**Call shapes read:**
- `require("x")`, `require("x",)`, `require("x", extra)`, `require(("x"))`, `require?.("x")` and `typeof require("x")`.
- Any member call: `module.require`, `require.main.require`, `module.parent.require`, `this.require`, `(window).require` and `obj["require"]("x")`. The tracked tree has no other `.require(` method, so a missed loader is the bigger risk.
- `import … from`, `import "x"`, `import("x")`, `export * [as n] from` and `export { … } from` (any names inside the braces, `default`/`async`/`function` included).

**npm artifacts** (`docs/DEPENDENCY_POLICY.md:35`). Tracked `node_modules/` content, a `package.json` with `dependencies`/`devDependencies`/`optionalDependencies`/`peerDependencies` (or one that does not parse), and lockfiles are findings under `game/`. Anywhere else, the repository root included, they are `NOTE` lines (the brief: "report any at repo root"). Main has none: `game/package.json` is the NW.js manifest and has no dependency fields.

**Frozen libs** (`docs/DEPENDENCY_POLICY.md:23`). Two finding kinds cover this folder, and neither can be baselined:
- `LIBS_CHANGED`: any file under `game/js/libs/` at HEAD that was added, removed or changed against `libs_baseline.json`.
- `LIBS_WORKTREE_CHANGED`: anything in the working tree that differs from HEAD there:
  - any `git status` entry (modified, untracked, staged rename);
  - a file flagged assume-unchanged or skip-worktree (`git ls-files -v`), because those flags hide edits from `git status`;
  - any untracked file, ignored ones included (`git ls-files --others`).

**Node** (`docs/DEPENDENCY_POLICY.md:20,70`). `node -v` is printed; `NODE_TOO_OLD` only below 18.

**The lexer:**
- It drops comments (a line comment ends at LF, CR, U+2028 or U+2029).
- It reads strings, templates (`${}` nesting and braces inside), regular expressions, Unicode white space, and identifier escapes (`requ\u0069re` is `require`).
- A slash after a postfix `++`/`--` (two touching signs after an operand) is a division.
- A regex literal is capped at 2000 characters, so a line full of `[/` costs linear time.

I cross-checked it against a naive regex over all 874 in-scope files (`%TEMP%\lanez\lexcheck.js`). Every difference is explained:
- Only the lexer sees the folded `path.join/resolve(__dirname, …)` requires in 5 files.
- Only the naive regex sees `require(` text that is not code:
  - `tools/sim/test_ledger.js:46`: an error-message string;
  - `tools/test_callings_and_clearing_live.js:55`: a template of injected test code;
  - `tools/security/test_check_dependencies.js`: fixture strings.

**Known defects on main: the dependency baseline (my decision; see Decisions).** On the real tree, 19 relative requires name files that do not exist. All of them point at `UF_*` plugins that the DEUS rename commit `0544ef02` (2026-09-22) removed, and all were already absent at the lane base `425b594c`:
- 9 are try/catch fallbacks in `game/js/plugins/DEUS_Colonists.js` and `DEUS_World.js`, which can never load;
- 10 are in 6 legacy tools, which throw MODULE_NOT_FOUND when run.

The brief needs both "fails on a missing relative require" and "passes on main". BRIEF_RESUME1 set a precedent for the secret: known items don't block, new ones still fail. Following it, `tools/security/dependency_baseline.json` lists the 17 `(path, kind, spec)` keys, each with a reason, generated from the checker's own `--json`:
- a matching finding is reported as `BASELINED`;
- any new finding still fails;
- an entry that no longer matches fails as `STALE_BASELINE`;
- frozen-lib, npm-artifact and Node findings can never be baselined.

Tests: `dep_baseline_hides_only_its_entry`, `dep_baseline_needs_path_and_kind`, `dep_baseline_stale_entry_fails`, `dep_baseline_cannot_hide_frozen_libs`. Fixing them is PROPOSED-Z-05.

## 5. Real-repository results (raw evidence in `evidence/`)

- **HEAD secret scan (gate 3):** 4491 files scanned (0 with NUL bytes, 0 text with a binary extension), 6304 binary skipped, **0 findings**, 0 allowed, 0 baselined, 0 stale. EXIT=0.
- **`--range 224b1b36^..224b1b36`:** 2 BASELINED (`docs/STATUS.md:12`, `tools/generate_nano_banana_pro.js:14`), 0 findings. EXIT=0.
- **Full history of HEAD** (`--range <root>..HEAD`, root `940ac917`): 8066 file-commits scanned, 7735 binary skipped, **0 findings**, **3 BASELINED** (the three known occurrences), 0 stale. EXIT=0. The root commit's own tree (a range cannot include it) was scanned with the scanner's rules by a helper: 106 text files, 0 findings.
- **Every local and origin ref with commits not in HEAD** (21 ranges, including 28 new `main` commits and lanes aa/ab/ac): 0 findings in each, EXIT=0 each.

  **Only one incident.** No credential other than SEC-2026-09-26-01 was found anywhere in the reachable history, so no new escalation was needed.
- **The lane's own commits** (`--range origin/main..HEAD`, 46 file-commits): 0 findings. EXIT=0. No secret-shaped literal was committed by this lane.
- **`--staged`:** nothing staged, EXIT=0.
- **Dependency check (gate 4):**
  - 874 script files, 2950 module references, **0 findings**, 19 BASELINED (MISSING_RELATIVE), 311 notes (BUILTIN_OUTSIDE_POLICY 270, UNRESOLVED_DYNAMIC 40, NPM_REQUIRE 1 in the out-of-scope `.mjs`). EXIT=0.
  - Policy built-ins: child_process=189 crypto=32 fs=777 path=710 perf_hooks=20 v8=4. Outside the policy list: assert=30 buffer=1 http=5 https=1 module=3 net=2 os=137 timers=2 url=1 vm=79 zlib=9.
  - Libs: 6 files, baseline 425b594c. Node v24.19.0.

## 6. Tests and mutants

| Suite | Checks | Mutants (all killed) | Total `PASS` lines | Wall time (one run, this machine) |
|---|---|---|---|---|
| `test_scan_secrets.js` | 87 | 69 | 156 passed, 0 failed | 38.6 s |
| `test_check_dependencies.js` | 29 | 51 | 80 passed, 0 failed | 19.5 s |

- **Fake keys.** Every content rule has a fake key planted in a fixture and detected (`detects_<RULE>`, 14 rules plus `CREDENTIAL_FILE`). This is the WBS DoD: "a fake key planted in a fixture is detected".
- **Clean tree.** It exits 0 (`clean_tree_exit_0`).
- **Added lines only.** `--staged` and `--range` see only added lines (`staged_sees_only_added_lines`, `range_sees_only_added_lines`, `range_merge_lines_new_against_every_parent_only`).
- **Redaction.** It never prints more than 4 characters of a match: every 5-character window of each generated secret is checked against text and JSON output, and short or human-chosen values print none (`redaction_*`).
- **Other behaviour covered:** allowlist and stale-allowlist; binary skip; a tracked `.env`; an npm require; a missing relative require; a changed lib (`npm_require_detected`, `missing_relative_detected_literal_and_folded`, `libs_changed_removed_added_detected`).
- **Mutants the brief asks for:** one per secret rule switched off (`mutant_rule_<ID>_off_killed` ×12, plus `entropy_off` and `rule_CREDENTIAL_ASSIGNMENT_off`), `redaction_off`, `allowlist_staleness_off`, `npm_require_off` and `libs_baseline_off`.
- **Mutants BRIEF_RESUME1 asks for:** `mutant_baseline_ignores_scope_killed` and `mutant_baseline_off_killed`.
- **Every mutant must apply.** Each one is an exact, unique text replacement, so a mutant whose target is missing fails the suite ("mutation did not apply"). Each is killed by the check named after "killed by" in the output below.

## 7. Pre-review by independent read-only agents (not the Grok review)

Before the gates, two independent read-only review agents attacked the tools. Review 1 ran at `ca4b1f44`; review 2 re-checked the fixes and attacked the new code at `dd07898a`. They wrote only under `%TEMP%`, did not read the history of the incident files, and read nothing outside the repository. All 21 fixes that review 1 prompted held under review 2. What each review found, and what I did:

| Review | Finding | Disposition |
|---|---|---|
| 1 | BUG: binary files skipped the credential-name check (`.p12`/`.pfx`; a UTF-16 `.env` got neither the name check nor a content scan) | Fixed: names are checked for every file; NUL files are scanned with NUL bytes removed. Tests `credential_file_binary_p12_detected`, `nul_files_scanned_without_nul_bytes`, `path_mode_utf16_file`, `range_utf16_file_scanned`. |
| 1 | EVASION: one NUL byte hid the whole file; a text file with a binary extension was skipped unread | Fixed: NUL-stripped scanning, plus `BINARY_EXTENSION_TEXT` (HEAD ≤ 64 KB, range and staged at any size). Tests `binary_extension_text_scanned`, `range_odd_cases_all_found`. |
| 1 | LEAK: a 4-character netrc password was printed in full; a short value could be brute-forced from the `--json` `lineSha256` | Fixed: short values show their length only, and the line hash is withheld. |
| 1 | EVASION: the entropy detector missed many realistic key shapes | Improved, and each change measured at 0 new hits over all history: the 4.2-bit alnum-only threshold for 32-47 characters, and `CREDENTIAL_ASSIGNMENT`. The limits that remain are in PROPOSED-Z-06. |
| 1 | BUG: a history-only allowlist entry was STALE at HEAD | Fixed for `<commit-message>` entries. A line that exists only in the history of a still-tracked file is left to the baseline. |
| 1 | EVASION: a `\x03` byte in a commit message hid the rest of the message | Fixed: `git log -z`. |
| 1 | EVASION: file names were never scanned | Fixed, with the value redacted in every printed path. |
| 1 | NIT: allowlist/baseline order; `onlyInHistoryBefore` not checked; a shallow clone gave exit 2 | Fixed: baseline first, the fix-tree check, and inactive entries. |
| 1 | EVASION: lexer bypasses (trailing comma, parentheses, member globals, `?.()`, escapes, Unicode spaces, CR/U+2028 comment ends, postfix division, indirect require) | Fixed; tests `lexer_call_shapes`, `lexer_regex_division_comments_and_lines`, `lexer_indirect_require_reported`. |
| 1 | BUG: `export { default } from` was missed | Fixed. |
| 1 | BUG: `require('./lib/')` was a false MISSING_RELATIVE | Fixed: folder-only resolution. |
| 1 | EVASION: `assume-unchanged`, `skip-worktree` and ignored files hid frozen-lib edits | Fixed (`ls-files -v`, `ls-files --others`). |
| 1 | TEST-GAP: surviving mutants (parsing, thresholds, allowlist path, `--path` staleness, lexer, resolution) | Each now has a fixture and a named mutant, all killed. |
| 2 | EVASION, regression: `typeof require("x")` skipped | Fixed: only a non-call `typeof require` is skipped. Mutants `typeof_skips_calls_too`, `typeof_require_reported`. |
| 2 | EVASION, regression: `a + +/'/` and `i++ + /'/` were read as postfix | Fixed: the signs must touch and follow an operand. Mutant `postfix_adjacency_off`. |
| 2 | EVASION: `export { async } from`, `export { function as fn } from` | Fixed: brace-matched export lists, and `export * as n from`. |
| 2 | EVASION: `require.main.require`, `module.parent.require`, `module["require"]`, `(window).require`, `this.require`, extra arguments | Fixed: any member call and `["require"]` count, and extra arguments are ignored as Node does. |
| 2 | NIT: `"main": "lib/"`; quadratic lexing on `"[/".repeat(80000)` (11 s) | Fixed: folder-only `main`, and a 2000-character regex cap (0.3 s for 60 KB; test `lexer_time_linear_on_slash_lines`). |
| 2 | BUG: `ASSIGN_RE` was quadratic (`"token".repeat(32000)` took 2.9 s) | Fixed: bounded quantifiers (1.3 ms). The same measurement found `SESSION_COOKIE` quadratic too (386 ms at 40 KB); fixed the same way. Test `scan_time_linear_on_long_lines`. |
| 2 | EVASION: CREDENTIAL_ASSIGNMENT value charset and operators (`:=`, `=>`, `authorization`, `GEMINI_KEY_2`, symbols in quoted passwords) | Fixed. Not fixed: lower-case `gemini_key` (kept out on purpose: `cache_key`, `sort_key`), a password with a space, and XML `value="…"` with no credential name (PROPOSED-Z-06). |
| 2 | LEAK: a CREDENTIAL_ASSIGNMENT value can be a human password, and its prefix plus line hash allow a dictionary attack | Fixed: `HUMAN_VALUE_RULES` (`NETRC_PASSWORD`, `CREDENTIAL_ASSIGNMENT`) show no characters and no line hash. |
| 2 | LEAK, low: the line hash was withheld per finding, not per line | Fixed: withheld for every finding on that line. Mutant `line_sha_withheld_per_finding_only`. |
| 2 | EVASION: baseline scope widened between an `addedIn` commit and a later fix | Fixed: BASELINED only in `addedIn` commits. |
| 2 | EVASION trade-offs: long blobs, a key joined by `/`, a key followed by 260 characters, a value after a NUL in a hand-made commit object | Documented (PROPOSED-Z-06). |
| 2 | TEST-GAP: surviving mutants (`ENTROPY_SHORT_MAX_LEN`, `ASSIGN_MIN_BITS`, `ASSIGN_MIN_LEN`, run skip in assignments, NUL_FILE path; lexer U+205F/U+1680/U+2029, skip-worktree tag, postfix `--`, and others) | Each now has a test and a named mutant, all killed. Every white-space code is tested one by one. |
| 2 | NIT: gitlink names; the fix-tree error printed a raw path; SHA-256 repositories; a newline in a file name could forge an output line | Fixed (tests `gitlink_name_checked`, `control_chars_in_paths_escaped`). |

## 8. PROPOSED follow-ups (not WBS IDs; for the PM and Owner)

- **PROPOSED-Z-01 (OPS.30.03 hook wiring, Owner-gated on DEC-004).** A pre-commit hook would run `node tools/security/scan_secrets.js --staged`: exit 1 blocks the commit, and exit 2 should also block. `node tools/security/check_dependencies.js` reads HEAD, so a pre-push hook is its natural place. No hook was installed here.
- **PROPOSED-Z-02 (OPS.30.02 CI use).** `gate.yml` would run:
  - both test suites;
  - `scan_secrets.js` at HEAD;
  - `scan_secrets.js --range origin/main..HEAD` for pushes to `task/*`;
  - `check_dependencies.js`.

  The checkout should be a full clone: in a shallow clone the baseline entry is inactive, so the historical value would fail any range that reaches `224b1b36`.
- **PROPOSED-Z-03 (provider rule for the SEC-2026-09-26-01 token format).** The entropy detector caught this key only because no provider rule knows its format. `escalation.md` describes the shape as a 3-character prefix followed by a 50-character token. The rule should come from the provider's published key-format documentation, not from the leaked value, and be added only after the Owner decides. When it lands, regenerate the baseline entry: the new rule's match (prefix included) has a different value, rule id and fingerprint, and the stale check will flag the old entry on any range that includes `224b1b36`.
- **PROPOSED-Z-04 (policy and document disagreements found):**
  - (a) `docs/CONSOLIDATION_PLAN_V1.md:122` names `tools/governance/verify_dependencies.js`; the WBS row and the brief name `tools/security/check_dependencies.js`. The brief settles the path; the plan text should follow it.
  - (b) `docs/DEPENDENCY_POLICY.md:34` lists 6 built-ins. The tooling at HEAD uses 11 more: os 137, vm 79, assert 30, zlib 9, http 5, module 3, net 2, timers 2, buffer 1, https 1, url 1. The policy should list them or say "Node built-ins".
  - (c) `docs/DEPENDENCY_POLICY.md:33,35` say "wherever possible", and `tools/srd_extract/optional/render_pages.mjs` uses an npm package. Decide whether `.mjs`/`.cjs` join the checked scope and whether optional tooling may use npm.
  - (d) `docs/SECURITY_AND_SECRETS.md:62` prescribes a history purge; the Owner declined it (BRIEF_RESUME1). The policy could record the accepted-incident path: revoke, then a fingerprint baseline scoped to the commits that added the value.
  - (e) `docs/telemetry/security_incidents.json` says "never record a value, prefix or hash here". By PM instruction (BRIEF_RESUME1), the baseline file holds a sha256 of the value. The policy should say fingerprints are allowed in the baseline only.
  - (f) The incident record lists 2 locations; history also has `docs/STATUS.md:12` at `224b1b36` (section 3).
- **PROPOSED-Z-05 (fix or retire the 17 baselined missing requires).**
  - Six legacy tools require `UF_*` plugins removed by `0544ef02`: `tools/benchmark_performance.js`, `tools/test_callings_system.js`, `tools/test_physical_inventory_proof.js`, `tools/test_srd_equipment_proof.js`, `tools/test_srd_rules_proof.js`, `tools/test_unified_capability_proof.js`.
  - The try/catch fallbacks in `game/js/plugins/DEUS_Colonists.js` (lines 86, 92, 787-789, 2755-2756) and `game/js/plugins/DEUS_World.js` (lines 1282-1283) can never load.
  - Each fix removes one entry from `dependency_baseline.json`, and the stale check fails until that entry is deleted.
- **PROPOSED-Z-06 (known limits of the secrets scanner).** Not flagged:
  - a standard-base64 value that contains `/`, has no `+`, no `=` padding and no credential-named assignment before it, and whose `/`-free pieces are all under 32 characters;
  - runs over 256 characters, so a key glued to 260 more token characters is missed too;
  - runs with a 6-character ascending sequence;
  - generated values under 32 characters that carry no provider prefix and no credential-named assignment;
  - a lower-case `<x>_key` name, a quoted password with a space, and XML `value="…"` with no credential name;
  - a text file over 64 KB under a binary extension, in HEAD mode;
  - `SESSION_COOKIE` where the session cookie comes more than 400 characters into the header;
  - a value after a NUL byte inside a hand-made commit object, which git itself cuts off.

  The provider rules still catch their formats.
- **PROPOSED-Z-07 (untracked `game/node_modules`).** The dependency checker reads tracked content only, apart from the frozen-libs folder. An untracked `game/node_modules/` in a working tree would ship if a package is built from disk. The release-packaging step should check for it.
- **PROPOSED-Z-08 (`.env.example`-style templates).** These are `CREDENTIAL_FILE` findings, the conservative reading of `docs/SECURITY_AND_SECRETS.md:36,54`. If templates are wanted, decide the rule: a name exception or allowlist entries.
- **PROPOSED-Z-09 (lexer limits).** The regex-versus-division guess is a heuristic. These known cases hide the rest of a line when the regex holds a quote:
  - a regex right after `)` (`if (s) /"/.test(s)`);
  - a regex right after `}`;
  - a regex after a keyword used as a name (`obj.in /`);
  - HTML-like comments (`<!--`, `-->`) in CommonJS.

  None occurs in the tracked tree. A real fix needs a full JS parser, which the no-npm policy rules out unless one is hand-written.

## 9. Gate runs (`tasks/OPS.70.02/lane-z/lane.json` `gateTests`, run exactly as written, in the foreground, from the worktree root, at `1408390f`)

Gate 1:
```text
$ node tools/security/test_scan_secrets.js
PASS fixture_values_built_at_run_time
PASS detects_PRIVATE_KEY_PEM
PASS detects_ANTHROPIC_KEY
PASS detects_OPENAI_KEY
PASS detects_GOOGLE_API_KEY
PASS detects_GOOGLE_OAUTH_TOKEN
PASS detects_XAI_KEY
PASS detects_GITHUB_TOKEN
PASS detects_GITLAB_TOKEN
PASS detects_JWT
PASS detects_NETRC_PASSWORD
PASS detects_SESSION_COOKIE
PASS detects_BEARER_TOKEN
PASS detects_HIGH_ENTROPY
PASS detects_CREDENTIAL_ASSIGNMENT
PASS detects_CREDENTIAL_FILE_tracked_env
PASS credential_file_binary_p12_detected
PASS file_name_scanned_even_when_unread
PASS credential_file_names
PASS head_findings_exit_1_and_counts
PASS crlf_line_detected_without_cr
PASS nul_files_scanned_without_nul_bytes
PASS binary_extension_skipped_and_counted
PASS binary_extension_text_scanned
PASS gitlink_name_checked
PASS control_chars_in_paths_escaped
PASS head_ignores_untracked_files
PASS redaction_text_output_keeps_4_chars
PASS redaction_json_output_keeps_4_chars
PASS redaction_short_and_human_values_show_length_only
PASS redact_function_contract
PASS clean_tree_exit_0
PASS policy_text_is_not_a_finding
PASS look_alikes_are_not_findings
PASS entropy_slash_run_judged_whole_with_plus_or_context
PASS entropy_long_segment_in_path_detected
PASS entropy_data_blob_over_256_skipped
PASS entropy_hex_needs_credential_context
PASS entropy_alphabet_table_skipped
PASS entropy_thresholds_at_the_boundaries
PASS credential_assignment_thresholds
PASS scan_time_linear_on_long_lines
PASS credential_assignment_names
PASS staged_sees_only_added_lines
PASS staged_clean_change_exit_0
PASS range_sees_only_added_lines
PASS range_commit_message_scanned
PASS range_quoted_path_decoded
PASS range_merge_lines_new_against_every_parent_only
PASS range_odd_cases_all_found
PASS range_line_after_no_newline_marker
PASS range_name_with_space_b_slash
PASS range_crlf_line_sha_matches_head_form
PASS range_binary_extension_skipped
PASS range_utf16_file_scanned
PASS range_message_control_byte_not_a_separator
PASS range_usage_errors_exit_2
PASS path_mode_one_file
PASS path_mode_utf16_file
PASS path_outside_or_untracked_exit_2
PASS allowlist_matching_entries_allowed
PASS allowlist_partial_still_fails
PASS allowlist_entry_needs_the_right_path
PASS allowlist_stale_entry_fails
PASS allowlist_staleness_only_in_scope
PASS allowlist_stale_in_path_mode_for_that_file
PASS allowlist_commit_message_entry
PASS allowlist_malformed_exit_2
PASS committed_allowlist_is_valid_and_reasoned
PASS baseline_historical_finding_passes
PASS baseline_readded_later_commit_fails
PASS baseline_whole_history_fails_on_readd_only
PASS baseline_different_value_fails
PASS baseline_head_occurrence_fails
PASS baseline_staged_occurrence_fails
PASS baseline_path_occurrence_fails
PASS baseline_wins_over_allowlist_in_history
PASS baseline_stale_entry_fails
PASS baseline_staleness_only_when_addedIn_scanned
PASS baseline_bad_ancestry_or_shape_exit_2
PASS baseline_fix_commit_must_remove_the_value
PASS baseline_missing_commits_make_the_entry_inactive
PASS baseline_file_has_no_rule_match
PASS baseline_only_in_addedIn_commits
PASS baseline_real_history_224b1b36_baselined
PASS usage_errors_exit_2
PASS cli_exit_codes
PASS mutant_rule_PRIVATE_KEY_PEM_off_killed (killed by detects_PRIVATE_KEY_PEM)
PASS mutant_rule_ANTHROPIC_KEY_off_killed (killed by detects_ANTHROPIC_KEY)
PASS mutant_rule_OPENAI_KEY_off_killed (killed by detects_OPENAI_KEY)
PASS mutant_rule_GOOGLE_API_KEY_off_killed (killed by detects_GOOGLE_API_KEY)
PASS mutant_rule_GOOGLE_OAUTH_TOKEN_off_killed (killed by detects_GOOGLE_OAUTH_TOKEN)
PASS mutant_rule_XAI_KEY_off_killed (killed by detects_XAI_KEY)
PASS mutant_rule_GITHUB_TOKEN_off_killed (killed by detects_GITHUB_TOKEN)
PASS mutant_rule_GITLAB_TOKEN_off_killed (killed by detects_GITLAB_TOKEN)
PASS mutant_rule_JWT_off_killed (killed by detects_JWT)
PASS mutant_rule_NETRC_PASSWORD_off_killed (killed by detects_NETRC_PASSWORD)
PASS mutant_rule_SESSION_COOKIE_off_killed (killed by detects_SESSION_COOKIE)
PASS mutant_rule_BEARER_TOKEN_off_killed (killed by detects_BEARER_TOKEN)
PASS mutant_entropy_off_killed (killed by detects_HIGH_ENTROPY)
PASS mutant_rule_CREDENTIAL_ASSIGNMENT_off_killed (killed by detects_CREDENTIAL_ASSIGNMENT)
PASS mutant_assignment_key_case_off_killed (killed by credential_assignment_names)
PASS mutant_assignment_author_excluded_off_killed (killed by credential_assignment_names)
PASS mutant_assignment_operators_basic_only_killed (killed by credential_assignment_names)
PASS mutant_assignment_quoted_values_ignored_killed (killed by credential_assignment_names)
PASS mutant_assignment_key_suffix_word_boundary_killed (killed by credential_assignment_names)
PASS mutant_assignment_min_bits_zero_killed (killed by credential_assignment_thresholds)
PASS mutant_assignment_min_len_lowered_killed (killed by credential_assignment_thresholds)
PASS mutant_assignment_sequence_skip_off_killed (killed by credential_assignment_thresholds)
PASS mutant_assign_regex_unbounded_killed (killed by scan_time_linear_on_long_lines)
PASS mutant_cookie_regex_unbounded_killed (killed by scan_time_linear_on_long_lines)
PASS mutant_entropy_short_max_len_raised_killed (killed by entropy_thresholds_at_the_boundaries)
PASS mutant_ext_text_sniff_off_killed (killed by binary_extension_text_scanned)
PASS mutant_range_ext_text_off_killed (killed by range_odd_cases_all_found)
PASS mutant_gitlink_names_off_killed (killed by gitlink_name_checked)
PASS mutant_printable_paths_off_killed (killed by control_chars_in_paths_escaped)
PASS mutant_nul_file_path_unredacted_killed (killed by redaction_text_output_keeps_4_chars)
PASS mutant_credential_file_off_killed (killed by detects_CREDENTIAL_FILE_tracked_env)
PASS mutant_name_checks_skip_unread_files_killed (killed by file_name_scanned_even_when_unread)
PASS mutant_file_names_off_killed (killed by file_name_scanned_even_when_unread)
PASS mutant_display_path_off_killed (killed by redaction_text_output_keeps_4_chars)
PASS mutant_redaction_off_killed (killed by redaction_text_output_keeps_4_chars)
PASS mutant_short_value_prefix_shown_killed (killed by redaction_short_and_human_values_show_length_only)
PASS mutant_human_values_show_prefix_killed (killed by redaction_text_output_keeps_4_chars)
PASS mutant_short_value_line_sha_shown_killed (killed by redaction_short_and_human_values_show_length_only)
PASS mutant_line_sha_withheld_per_finding_only_killed (killed by redaction_short_and_human_values_show_length_only)
PASS mutant_allowlist_staleness_off_killed (killed by allowlist_stale_entry_fails)
PASS mutant_allowlist_off_killed (killed by allowlist_matching_entries_allowed)
PASS mutant_allowlist_ignores_path_killed (killed by allowlist_entry_needs_the_right_path)
PASS mutant_commit_message_entries_judged_at_head_killed (killed by allowlist_commit_message_entry)
PASS mutant_path_mode_staleness_off_killed (killed by allowlist_stale_in_path_mode_for_that_file)
PASS mutant_baseline_ignores_scope_killed (killed by baseline_readded_later_commit_fails)
PASS mutant_baseline_ignores_ancestry_killed (killed by baseline_readded_later_commit_fails)
PASS mutant_baseline_scope_not_limited_to_addedIn_killed (killed by baseline_only_in_addedIn_commits)
PASS mutant_baseline_off_killed (killed by baseline_historical_finding_passes)
PASS mutant_baseline_staleness_off_killed (killed by baseline_stale_entry_fails)
PASS mutant_baseline_fix_tree_check_off_killed (killed by baseline_fix_commit_must_remove_the_value)
PASS mutant_baseline_missing_commits_not_inactive_killed (killed by baseline_missing_commits_make_the_entry_inactive)
PASS mutant_nul_files_not_scanned_killed (killed by nul_files_scanned_without_nul_bytes)
PASS mutant_range_nul_files_not_scanned_killed (killed by range_utf16_file_scanned)
PASS mutant_entropy_slash_split_off_killed (killed by clean_tree_exit_0)
PASS mutant_entropy_sequence_skip_off_killed (killed by entropy_alphabet_table_skipped)
PASS mutant_entropy_long_run_skip_off_killed (killed by entropy_data_blob_over_256_skipped)
PASS mutant_entropy_min_bits_raised_killed (killed by entropy_thresholds_at_the_boundaries)
PASS mutant_entropy_min_len_raised_killed (killed by entropy_thresholds_at_the_boundaries)
PASS mutant_entropy_short_threshold_off_killed (killed by entropy_thresholds_at_the_boundaries)
PASS mutant_entropy_short_threshold_for_all_killed (killed by entropy_thresholds_at_the_boundaries)
PASS mutant_staged_scans_whole_tree_killed (killed by staged_sees_only_added_lines)
PASS mutant_patch_removed_lines_scanned_killed (killed by staged_sees_only_added_lines)
PASS mutant_merge_single_parent_lines_scanned_killed (killed by range_merge_lines_new_against_every_parent_only)
PASS mutant_no_newline_marker_ends_hunk_killed (killed by range_line_after_no_newline_marker)
PASS mutant_header_symmetric_split_off_killed (killed by range_name_with_space_b_slash)
PASS mutant_patch_cr_not_stripped_killed (killed by range_crlf_line_sha_matches_head_form)
PASS mutant_range_extension_skip_off_killed (killed by range_binary_extension_skipped)
PASS mutant_range_messages_off_killed (killed by range_commit_message_scanned)
PASS mutant_message_control_byte_separator_killed (killed by range_message_control_byte_not_a_separator)
RESULT: 156 passed, 0 failed
EXIT=0
```

Gate 2:
```text
$ node tools/security/test_check_dependencies.js
PASS lexer_ignores_strings_comments_templates_regexes
PASS lexer_reads_every_import_form
PASS lexer_call_shapes
PASS lexer_regex_division_comments_and_lines
PASS lexer_indirect_require_reported
PASS export_default_reexports
PASS lexer_time_linear_on_slash_lines
PASS clean_repo_exit_0
PASS clean_repo_notes_reported_not_failed
PASS policy_builtins_counted
PASS npm_require_detected
PASS missing_relative_detected_literal_and_folded
PASS absolute_require_detected
PASS npm_artifacts_under_game_detected
PASS bad_repo_finding_total
PASS libs_changed_removed_added_detected
PASS libs_worktree_change_detected
PASS make_libs_baseline_roundtrip
PASS committed_libs_baseline_matches_425b594c
PASS real_repo_exit_0
PASS node_version_policy
PASS dep_baseline_hides_only_its_entry
PASS dep_baseline_needs_path_and_kind
PASS dep_baseline_stale_entry_fails
PASS dep_baseline_cannot_hide_frozen_libs
PASS committed_dep_baseline_valid_and_reasoned
PASS usage_errors_exit_2
PASS text_output_result_line
PASS cli_exit_codes
PASS mutant_npm_require_off_killed (killed by npm_require_detected)
PASS mutant_missing_relative_off_killed (killed by missing_relative_detected_literal_and_folded)
PASS mutant_absolute_require_off_killed (killed by absolute_require_detected)
PASS mutant_libs_baseline_off_killed (killed by libs_changed_removed_added_detected)
PASS mutant_libs_added_file_off_killed (killed by libs_changed_removed_added_detected)
PASS mutant_libs_worktree_off_killed (killed by libs_worktree_change_detected)
PASS mutant_libs_status_rename_misread_killed (killed by libs_worktree_change_detected)
PASS mutant_npm_artifact_off_killed (killed by npm_artifacts_under_game_detected)
PASS mutant_node_version_off_killed (killed by node_version_policy)
PASS mutant_builtins_treated_as_npm_killed (killed by clean_repo_exit_0)
PASS mutant_dynamic_not_reported_killed (killed by clean_repo_notes_reported_not_failed)
PASS mutant_lexer_reads_comments_killed (killed by lexer_ignores_strings_comments_templates_regexes)
PASS mutant_line_comment_ends_only_at_lf_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_unicode_spaces_off_killed (killed by lexer_call_shapes)
PASS mutant_identifier_escape_start_off_killed (killed by lexer_call_shapes)
PASS mutant_identifier_escapes_off_killed (killed by lexer_call_shapes)
PASS mutant_postfix_division_off_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_regex_after_keyword_off_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_regex_after_literal_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_template_brace_depth_off_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_block_comment_line_count_off_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_string_continuation_line_count_off_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_optional_call_off_killed (killed by lexer_call_shapes)
PASS mutant_member_require_off_killed (killed by lexer_call_shapes)
PASS mutant_bracket_require_off_killed (killed by lexer_call_shapes)
PASS mutant_typeof_skips_calls_too_killed (killed by lexer_call_shapes)
PASS mutant_typeof_require_reported_killed (killed by lexer_ignores_strings_comments_templates_regexes)
PASS mutant_postfix_minus_off_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_postfix_adjacency_off_killed (killed by lexer_regex_division_comments_and_lines)
PASS mutant_regex_length_uncapped_killed (killed by lexer_time_linear_on_slash_lines)
PASS mutant_export_brace_scan_off_killed (killed by export_default_reexports)
PASS mutant_export_star_as_off_killed (killed by export_default_reexports)
PASS mutant_package_main_trailing_slash_kept_killed (killed by clean_repo_exit_0)
PASS mutant_skip_worktree_tag_off_killed (killed by libs_worktree_change_detected)
PASS mutant_require_parens_off_killed (killed by lexer_call_shapes)
PASS mutant_extra_arguments_off_killed (killed by lexer_call_shapes)
PASS mutant_indirect_not_reported_killed (killed by lexer_indirect_require_reported)
PASS mutant_function_require_guard_off_killed (killed by lexer_ignores_strings_comments_templates_regexes)
PASS mutant_dirname_fold_off_killed (killed by missing_relative_detected_literal_and_folded)
PASS mutant_folder_only_off_killed (killed by missing_relative_detected_literal_and_folded)
PASS mutant_trailing_slash_kept_killed (killed by clean_repo_exit_0)
PASS mutant_extension_resolution_js_only_killed (killed by clean_repo_exit_0)
PASS mutant_file_url_not_absolute_killed (killed by absolute_require_detected)
PASS mutant_package_json_parse_error_off_killed (killed by npm_artifacts_under_game_detected)
PASS mutant_libs_flag_check_off_killed (killed by libs_worktree_change_detected)
PASS mutant_libs_ignored_files_off_killed (killed by libs_worktree_change_detected)
PASS mutant_dep_baseline_ignores_kind_killed (killed by dep_baseline_needs_path_and_kind)
PASS mutant_dep_baseline_ignores_path_killed (killed by dep_baseline_needs_path_and_kind)
PASS mutant_nw_app_root_base_off_killed (killed by clean_repo_exit_0)
PASS mutant_dep_baseline_off_killed (killed by dep_baseline_hides_only_its_entry)
PASS mutant_dep_baseline_staleness_off_killed (killed by dep_baseline_stale_entry_fails)
RESULT: 80 passed, 0 failed
EXIT=0
```

Gate 3:
```text
$ node tools/security/scan_secrets.js
RESULT: 4491 files scanned (0 with NUL bytes, 0 text with a binary extension), 6304 binary skipped, 0 findings, 0 allowed, 0 baselined, 0 stale allowlist entries, 0 stale baseline entries
EXIT=0
```

Gate 4 (the raw output is complete in `evidence/gate4_check_dependencies.txt`; here the 311 `NOTE` lines are left out and the 19 `BASELINED` lines are kept):
```text
$ node tools/security/check_dependencies.js
BASELINED MISSING_RELATIVE game/js/plugins/DEUS_Colonists.js:86 ./UF_SettlementPillars.js (no tracked file at game/js/plugins/UF_SettlementPillars.js or game/UF_SettlementPillars.js) reason: Pre-existing on main (already at lane base 425b594c): UF_SettlementPillars.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). The require sits in a try/catch fallback, so the game never loads it; the plugin gets the module from window.UF instead. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE game/js/plugins/DEUS_Colonists.js:92 ./UF_Sanitation.js (no tracked file at game/js/plugins/UF_Sanitation.js or game/UF_Sanitation.js) reason: Pre-existing on main (already at lane base 425b594c): UF_Sanitation.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). The require sits in a try/catch fallback, so the game never loads it; the plugin gets the module from window.UF instead. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE game/js/plugins/DEUS_Colonists.js:787 ./UF_Callings.js (no tracked file at game/js/plugins/UF_Callings.js or game/UF_Callings.js) reason: Pre-existing on main (already at lane base 425b594c): UF_Callings.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). The require sits in a try/catch fallback, so the game never loads it; the plugin gets the module from window.UF instead. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE game/js/plugins/DEUS_Colonists.js:788 ./js/plugins/UF_Callings.js (no tracked file at game/js/plugins/js/plugins/UF_Callings.js or game/js/plugins/UF_Callings.js) reason: Pre-existing on main (already at lane base 425b594c): UF_Callings.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). The require sits in a try/catch fallback, so the game never loads it; the plugin gets the module from window.UF instead. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE game/js/plugins/DEUS_Colonists.js:789 ./game/js/plugins/UF_Callings.js (no tracked file at game/js/plugins/game/js/plugins/UF_Callings.js or game/game/js/plugins/UF_Callings.js) reason: Pre-existing on main (already at lane base 425b594c): UF_Callings.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). The require sits in a try/catch fallback, so the game never loads it; the plugin gets the module from window.UF instead. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE game/js/plugins/DEUS_Colonists.js:2755 ./UF_Callings.js (no tracked file at game/js/plugins/UF_Callings.js or game/UF_Callings.js) reason: Pre-existing on main (already at lane base 425b594c): UF_Callings.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). The require sits in a try/catch fallback, so the game never loads it; the plugin gets the module from window.UF instead. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE game/js/plugins/DEUS_Colonists.js:2756 ./game/js/plugins/UF_Callings.js (no tracked file at game/js/plugins/game/js/plugins/UF_Callings.js or game/game/js/plugins/UF_Callings.js) reason: Pre-existing on main (already at lane base 425b594c): UF_Callings.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). The require sits in a try/catch fallback, so the game never loads it; the plugin gets the module from window.UF instead. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE game/js/plugins/DEUS_World.js:1282 ./UF_Callings.js (no tracked file at game/js/plugins/UF_Callings.js or game/UF_Callings.js) reason: Pre-existing on main (already at lane base 425b594c): UF_Callings.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). The require sits in a try/catch fallback, so the game never loads it; the plugin gets the module from window.UF instead. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE game/js/plugins/DEUS_World.js:1283 ./game/js/plugins/UF_Callings.js (no tracked file at game/js/plugins/game/js/plugins/UF_Callings.js or game/game/js/plugins/UF_Callings.js) reason: Pre-existing on main (already at lane base 425b594c): UF_Callings.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). The require sits in a try/catch fallback, so the game never loads it; the plugin gets the module from window.UF instead. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE tools/benchmark_performance.js:41 ../game/js/plugins/UF_Proficiency.js (no tracked file at game/js/plugins/UF_Proficiency.js) reason: Pre-existing on main (already at lane base 425b594c): UF_Proficiency.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). This legacy script throws MODULE_NOT_FOUND when run. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE tools/test_callings_system.js:14 ../game/js/plugins/UF_Callings.js (no tracked file at game/js/plugins/UF_Callings.js) reason: Pre-existing on main (already at lane base 425b594c): UF_Callings.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). This legacy script throws MODULE_NOT_FOUND when run. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE tools/test_callings_system.js:159 ../game/js/plugins/UF_ProfileTabs.js (no tracked file at game/js/plugins/UF_ProfileTabs.js) reason: Pre-existing on main (already at lane base 425b594c): UF_ProfileTabs.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). This legacy script throws MODULE_NOT_FOUND when run. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE tools/test_physical_inventory_proof.js:98 ../game/js/plugins/UF_Containers.js (no tracked file at game/js/plugins/UF_Containers.js) reason: Pre-existing on main (already at lane base 425b594c): UF_Containers.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). This legacy script throws MODULE_NOT_FOUND when run. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE tools/test_physical_inventory_proof.js:99 ../game/js/plugins/UF_Resources.js (no tracked file at game/js/plugins/UF_Resources.js) reason: Pre-existing on main (already at lane base 425b594c): UF_Resources.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). This legacy script throws MODULE_NOT_FOUND when run. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE tools/test_srd_equipment_proof.js:20 ../game/js/plugins/UF_Conditions.js (no tracked file at game/js/plugins/UF_Conditions.js) [folded from a __dirname path] reason: Pre-existing on main (already at lane base 425b594c): UF_Conditions.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). This legacy script throws MODULE_NOT_FOUND when run. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE tools/test_srd_equipment_proof.js:21 ../game/js/plugins/UF_Rules.js (no tracked file at game/js/plugins/UF_Rules.js) [folded from a __dirname path] reason: Pre-existing on main (already at lane base 425b594c): UF_Rules.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). This legacy script throws MODULE_NOT_FOUND when run. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE tools/test_srd_rules_proof.js:26 ../game/js/plugins/UF_Conditions.js (no tracked file at game/js/plugins/UF_Conditions.js) [folded from a __dirname path] reason: Pre-existing on main (already at lane base 425b594c): UF_Conditions.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). This legacy script throws MODULE_NOT_FOUND when run. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE tools/test_srd_rules_proof.js:27 ../game/js/plugins/UF_Rules.js (no tracked file at game/js/plugins/UF_Rules.js) [folded from a __dirname path] reason: Pre-existing on main (already at lane base 425b594c): UF_Rules.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). This legacy script throws MODULE_NOT_FOUND when run. Fix or retire: PROPOSED-Z-05.
BASELINED MISSING_RELATIVE tools/test_unified_capability_proof.js:98 ../game/js/plugins/UF_Proficiency.js (no tracked file at game/js/plugins/UF_Proficiency.js) reason: Pre-existing on main (already at lane base 425b594c): UF_Proficiency.js was removed by the DEUS rename commit 0544ef02 (2026-09-22). This legacy script throws MODULE_NOT_FOUND when run. Fix or retire: PROPOSED-Z-05.
NODE v24.19.0 (policy minimum v18.0.0)
BUILTINS in policy: child_process=189 crypto=32 fs=777 path=710 perf_hooks=20 v8=4
BUILTINS outside policy (reported, not failed): assert=30 buffer=1 http=5 https=1 module=3 net=2 os=137 timers=2 url=1 vm=79 zlib=9
LIBS 6 files under game/js/libs/ checked against tools/security/libs_baseline.json (425b594c146d)
RESULT: HEAD 1408390ffcf6, 874 script files, 2950 module references, 0 findings (none), 19 baselined (MISSING_RELATIVE=19), 311 notes (BUILTIN_OUTSIDE_POLICY=270 NPM_REQUIRE=1 UNRESOLVED_DYNAMIC=40)
EXIT=0
(311 NOTE lines left out here; see evidence/gate4_check_dependencies.txt)
```

Gate 5:
```text
$ node tools/check_deus_syntax.js
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

Extra real-repo runs:
```text
$ node tools/security/scan_secrets.js --range 224b1b36^..224b1b36   (4 redaction characters masked as ####)
BASELINED 224b1b36dad8 docs/STATUS.md:12 HIGH_ENTROPY ####... (50 chars) fingerprint=6717051db5d3 incident: SEC-2026-09-26-01
BASELINED 224b1b36dad8 tools/generate_nano_banana_pro.js:14 HIGH_ENTROPY ####... (50 chars) fingerprint=6717051db5d3 incident: SEC-2026-09-26-01
RESULT: 22 files scanned (0 with NUL bytes, 0 text with a binary extension), 42 binary skipped, 0 findings, 0 allowed, 2 baselined, 0 stale allowlist entries, 0 stale baseline entries
EXIT=0
$ node tools/security/scan_secrets.js --range 940ac9172c21cddb2d5f3f15aa4512d4d274408b..HEAD   (root commit 940ac9172c21cddb2d5f3f15aa4512d4d274408b; NUL_FILE lines none; 4 redaction characters masked as ####)
BASELINED 224b1b36dad8 docs/STATUS.md:12 HIGH_ENTROPY ####... (50 chars) fingerprint=6717051db5d3 incident: SEC-2026-09-26-01
BASELINED 224b1b36dad8 tools/generate_nano_banana_pro.js:14 HIGH_ENTROPY ####... (50 chars) fingerprint=6717051db5d3 incident: SEC-2026-09-26-01
BASELINED d1fbeab84a9c docs/archive/STATUS_LEDGER_20260925.md:3682 HIGH_ENTROPY ####... (50 chars) fingerprint=6717051db5d3 incident: SEC-2026-09-26-01
RESULT: 8066 files scanned (0 with NUL bytes, 0 text with a binary extension), 7735 binary skipped, 0 findings, 0 allowed, 3 baselined, 0 stale allowlist entries, 0 stale baseline entries
EXIT=0
$ node %TEMP%/lanez/scan_root.js <repo> 940ac9172c21cddb2d5f3f15aa4512d4d274408b   (helper outside the repo: the scanner's scanLine over the root commit's tree, which a range cannot include)
ROOT TREE 940ac9172c21 scanned 106 binary skipped 1258 findings 0
EXIT=0
$ node tools/security/scan_secrets.js --range origin/main..HEAD
RESULT: 46 files scanned (0 with NUL bytes, 0 text with a binary extension), 0 binary skipped, 0 findings, 0 allowed, 0 baselined, 0 stale allowlist entries, 0 stale baseline entries
EXIT=0
$ node tools/security/scan_secrets.js --staged   (nothing staged)
RESULT: 0 files scanned (0 with NUL bytes, 0 text with a binary extension), 0 binary skipped, 0 findings, 0 allowed, 0 baselined, 0 stale allowlist entries, 0 stale baseline entries
EXIT=0
$ node -v
v24.19.0
EXIT=0
```
The per-ref history scans (21 ranges, every one `0 findings`, `EXIT=0`) are in `evidence/real_other_refs.txt`.

Libs baseline:
```text
$ node tools/security/check_dependencies.js --make-libs-baseline 425b594c146d5f353c10faa11f4b5d47f499b45f | diff - tools/security/libs_baseline.json
EXIT(make)=0
EXIT(diff)=0
$ git diff --name-only 425b594c 96483c51 -- game/js/libs
EXIT=0
$ for f in <6 libs>; do git cat-file blob 425b594c:game/js/libs/$f | sha256sum; done
49d8f79328495bfd9f47fce8378aa7d898adfb4238c36abc5801c78586d11dc9 game/js/libs/effekseer.min.js
7f144a3cc4cae65c4e2b9806483e565cc3b7123448c4b2311ece33b15f3f653d game/js/libs/effekseer.wasm
1ff66c1e32922549d0c824076703e69fb5535857934c8faa8023f51a4881f732 game/js/libs/localforage.min.js
29cfa0542b9864b6640cfdcc8f15b184db6431b532db2702a3ce97e5f2a7fc1c game/js/libs/pako.min.js
9cf328099f50e4ceca874d875abd3065e8189133e01e5f054bf7627eb6a960e6 game/js/libs/pixi.js
5024fbb4606a89caeeedcd57c94e7f633fba40277d4c1d1b2277ee7d60905498 game/js/libs/vorbisdecoder.js
```

## 10. Scope (BRIEF_RESUME1 item 3)

```text
$ git rev-parse origin/main; git merge-base origin/main HEAD
0536d3920ae4ac6dd65364565583bcf69db20a60
96483c517a95b10c5d52aec85d3b18ea01e599b4
$ git diff --name-only origin/main...HEAD
docs/archive/STATUS_LEDGER_20260925.md
docs/telemetry/security_incidents.json
tasks/OPS.70.02/lane-z/BRIEF.md
tasks/OPS.70.02/lane-z/BRIEF_RESUME1.md
tasks/OPS.70.02/lane-z/escalation.md
tasks/OPS.70.02/lane-z/lane.json
tasks/OPS.70.02/lane-z/launches/20260926_071010_prompt.txt
tools/generate_nano_banana_pro.js
tools/security/check_dependencies.js
tools/security/dependency_baseline.json
tools/security/libs_baseline.json
tools/security/scan_secrets.js
tools/security/secrets_allowlist.json
tools/security/secrets_baseline.json
tools/security/test_check_dependencies.js
tools/security/test_scan_secrets.js
tools/security/test_support.js
EXIT=0
$ git diff --name-only 425b594c146d5f353c10faa11f4b5d47f499b45f..HEAD | wc -l
188
$ comm -3 <(git diff --name-only 425b594c..HEAD | sort) <( (git diff --name-only 425b594c 96483c51; git diff --name-only origin/main...HEAD) | sort -u )   (empty = every other path came in with the main merge 86c074da)
EXIT=0
```

- **Merge base.** `origin/main` has moved on to `0536d392`, but the merge base is still `96483c51`, as BRIEF_RESUME1 says.
- **Every path in `git diff --name-only origin/main...HEAD` matches allowedPaths** (`tools/security/**` or `tasks/OPS.70.02/**`), except the three PM-granted fix files from `e8375c90`/`abad39c7`:
  - `tools/generate_nano_banana_pro.js`
  - `docs/archive/STATUS_LEDGER_20260925.md`
  - `docs/telemetry/security_incidents.json`

  I did not touch them. `git log --format='%h %s' origin/main..HEAD -- <those three>` lists only `e8375c90` and `abad39c7`.
- **The brief's own command,** `git diff --name-only 425b594c..HEAD`, lists 188 paths. The `comm -3` check prints nothing, so every path beyond the 17 above came in with the main merge `86c074da` (`425b594c..96483c51`), not from this lane.
- **Untracked:** `tasks/OPS.70.02/lane-z/launches/20260926_074003_prompt.txt` (the launcher's saved prompt). Left alone, as the brief says.

## Decisions needed
- **The dependency baseline of 17 known missing requires (section 4).** Without it, `check_dependencies.js` exits 1 on main: that is what it is for, but the brief also wants "passes on main". I applied the BRIEF_RESUME1 pattern (known items reported but not blocking; new ones and stale entries fail). If the PM prefers main to fail until PROPOSED-Z-05 is done, delete the file: the tool treats a missing default baseline as empty.
- **The CREDENTIAL_ASSIGNMENT rule, file-name scanning, and text sniffing under binary extensions go beyond the brief's rule list.** They came out of the pre-reviews and were measured at 0 hits over all history. Each can be switched off by removing a few lines, if unwanted.
- The Owner questions already listed: revocation (Owner), the provider rule for the incident's key format (PROPOSED-Z-03), and the policy texts (PROPOSED-Z-04).

## Not done / known problems
- The Grok review has not run. Nothing here is certified.
- The known limits in PROPOSED-Z-06 and Z-09.
- `check_dependencies.js` reads HEAD, not the working tree (apart from the frozen libs). An uncommitted require in a working file is only checked after commit.
- The test suites read this repository's own history in two checks: `baseline_real_history_224b1b36_baselined` and `committed_libs_baseline_matches_425b594c`. In a shallow clone they fail; everything else uses fixtures.
- The timing checks (`scan_time_linear_on_long_lines`, `lexer_time_linear_on_slash_lines`) use wide margins: about 2 ms and 300 ms here, against limits of 1000 ms and 2000 ms. A much slower machine could still trip them.

## Try it
1. `node tools/security/test_scan_secrets.js` then `node tools/security/test_check_dependencies.js`. Expected: `RESULT: 156 passed, 0 failed` and `RESULT: 80 passed, 0 failed`, exit 0.
2. `node tools/security/scan_secrets.js`. Expected: `0 findings`, exit 0.
3. `node tools/security/scan_secrets.js --range 224b1b36^..224b1b36`. Expected: 2 `BASELINED` lines for SEC-2026-09-26-01, exit 0.
4. `node tools/security/check_dependencies.js`. Expected: `0 findings`, 19 baselined, exit 0.
