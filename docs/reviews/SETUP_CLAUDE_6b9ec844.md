# Claude cross-family review of org/setup-2026-10-02 at 6b9ec844

Reviewed source: `6b9ec844158c969a144ffae67f2061ebcb7b4f9a` (branch `org/setup-2026-10-02`, also on origin at that SHA). Base: `565dc5aead7e068230528d573c395ea21ed5cf5d` (= `origin/main` at review time). Review date: 2026-10-03 CT. Reviewer: Claude (Anthropic family; model claude-fable-5-1, max effort), launched from `scratchpad/setup-claude-review/BRIEF.md`, run `setup-claude-review_20261003_012202`. Review branch: `task/setup-crossfamily-review`, same base and tip as the source; this file is its only committed change. The Owner's `org/setup-2026-10-02` branch and its worktree were not modified (checked before and after: tip `6b9ec844`, `git status --porcelain` empty).

Scope: read-only assessment of the setup branch as the Owner's PR candidate. No native run was launched, no CI scan of the full tree was executed locally, nothing was deleted, no writer file was edited, no PR opened, no merge. Figures marked "read" come from retained logs or the GitHub API; figures marked "computed" come from `git ls-tree` / `git diff` / `git check-ignore` on the tree objects at `6b9ec844`.

## 1. Verdicts

| Item | Verdict |
|---|---|
| Codex/GPT additions `56a888d4` (HANDOFF template + review of `2ffa0d3a`) and `6b9ec844` (design records, AGENTS rule 7) | **PASS, minor findings (M1-M13 below); none is a factual error that changes a decision.** The one integration item inside the Codex files is the dangling `docs/ops/USAGE.md` reference (B3), which Codex itself listed as a branch blocker. |
| Owner CI repair `da9e6906` | **PASS.** Closes the Codex MAJOR as described; one allowlisted fixture, verified invalid; GitHub `ci` run green at the tip. Comment wording nit (G6). |
| Grok (Deus) setup commits `81547e97`, `53ce4ec8`, `869479d3`, `2ffa0d3a` | Codex's cross-family review stands for these. This review re-checked them and confirms its findings; adds one MAJOR on the un-anchored ignore patterns (C1) and a stale decision range (M12). |
| **Overall PR readiness at `6b9ec844`** | **NOT READY.** Blockers B1-B3 are confirmed and still open; Deus CONFIRMED is missing (B4). The native expected-red exemption applies to this CI/hygiene/docs branch (section 6) and is not a blocker. |

No Deus native certification is given or implied by this document. No claim here rests on chat memory; every statement cites a file, a SHA, a command, or a retained log.

## 2. Source and authorship

All seven branch commits carry the git identity `deus-pm <deus-pm@local.invalid>`; authorship below comes from the subject tags and the Owner's attribution in the BRIEF, not from git metadata.

| SHA | Author family (per Owner / tag) | Subject | Files |
|---|---|---|---|
| `81547e97` | Grok (Deus), `[deus-org]` | `.gitignore`: ORG-2.3 patterns, track `.github/` and `.clinerules` | `.gitignore` +13 |
| `53ce4ec8` | Grok (Deus), `[deus-org]` | AGENTS.md single rulebook; pointers (ORG-3.1) | `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.clinerules` |
| `869479d3` | Grok (Deus), `[deus-org]` | WBS index, DECISIONS, WBS-ORG/SIM/SPLIT (ORG-2.1) | 5 docs, +115 |
| `2ffa0d3a` | Grok (Deus), `[deus-org]` | CI workflow + syntax/root checks (ORG-1.2, ORG-2.4) | `ci.yml`, `tools/ci/*.js` |
| `56a888d4` | Codex/GPT, `[codex]` | Review of `2ffa0d3a` + HANDOFF template | `docs/reviews/ORG_SETUP_2ffa0d3a_CODEX.md`, `docs/ops/HANDOFF_TEMPLATE.md` |
| `da9e6906` | Owner, `ci:` | Close fixtures exclusion gap; cover sim and plugins.js | `ci.yml`, `tools/ci/syntax_check.js` |
| `6b9ec844` | Codex/GPT, `[codex]` | Owner design decisions and parked WBS acceptance gates | `AGENTS.md` (rule 7) + 9 docs, +111/-23 |

Branch total (`git diff --stat 565dc5ae 6b9ec844`): 19 files, 572 insertions, 226 deletions. The runtime is untouched: tree `game` is `cce69276` at both `565dc5ae` and `6b9ec844`; blobs `tools/run_tests.js` (`5bd3fbc7`) and `run_tests.bat` (`ca2addac`) are identical at both SHAs (computed).

Review eligibility: Claude is a different family from Codex/GPT (OpenAI) and from Grok/Deus (xAI), so this review is cross-family for every agent-authored commit on the branch. Grok did not and must not review this branch (it wrote four of the seven commits; Owner instruction). Codex's statements about its own template and design records are not independent certification and are not treated as such here.

Inputs read (not verdict sources): `docs/reviews/ORG_SETUP_2ffa0d3a_CODEX.md` and `docs/ops/HANDOFF_TEMPLATE.md` at `6b9ec844`; `docs/ops/SETUP_PR_PREPARATION.md` and `docs/ops/evidence/setup_ci_negative_probes_20261002.md` at `bddb3a80` on `task/overnight-2026-10-02`; `docs/ops/OVERNIGHT_QUEUE_20261002.md` and `docs/ops/PROCESS_INCIDENTS_20261003.md` at `ff6e91ae` on the same branch; `docs/ops/USAGE.md` at `349851e1` on `task/org-0.2-worldgen-green` (blob `68bcacc7`); retained Codex evidence in the Owner's setup worktree `C:\Users\snewt\.deus_worktrees\org-setup\scratchpad\org-setup-review\` (`ci_probes.json`, `native_snapshot_2ffa0d3a\{run,results}.txt`, `native_comparison_565dc5ae\{run,results}.txt`). No `docs/ops/SETUP_REVIEW*` file exists at `6b9ec844` (`git ls-tree 6b9ec844 docs/ops/` lists only `HANDOFF_TEMPLATE.md`).

## 3. Known PR blockers, confirmed at 6b9ec844

**B1. `.gitignore` lines 85-97 are CRLF in an LF file (Grok, `81547e97`).** Blob `90500121` (unchanged through `6b9ec844`) contains 13 CR bytes (`git show 6b9ec844:.gitignore | tr -cd '\r' | wc -c` = 13; base blob `a4f0834f` = 0). `cat -A` shows `^M$` on exactly lines 85-97. `git diff --check 565dc5ae 6b9ec844` exits 2 listing `.gitignore:85` to `:97`; per commit, only `81547e97^..81547e97` exits 2, the other six exit 0. Every file touched by Codex or the Owner has 0 CR bytes. There is no `.gitattributes` at `565dc5ae`, `6b9ec844` or local main `038a02c3`, and `core.autocrlf=false` here, so nothing prevents a recurrence; whether to add EOL normalization is an Owner decision, not demanded by this review.

**B2. AGENTS.md carries superseded staffing policy, and its priority line now disagrees with the decisions it points to.** At `6b9ec844`: line 17 "Reached only through the Owner's relay; agents do not launch or message Gemini directly"; line 28 "One or two lanes at a time. No swarms ... no parallel lanes that share files". Both conflict with the Owner's 21:16/21:20 CT directives as recorded in `docs/ops/USAGE.md` on the ORG-0.2 branch ("authorize isolated concurrent lanes and direct Gemini dispatch by Codex PM ... supersede the earlier single-lane and Owner-relay restrictions") and with this branch's own `D-2026-10-02-7` rewrite ("Later Owner instructions authorize isolated support lanes"). Additionally (new in this review): AGENTS.md line 6 still reads "active: ORG-0.1, ORG-0.2, ORG-1.1, ORG-1.2, ORG-4.2 ... Do not start other work", while `docs/WBS_ORG.md:5` at the same SHA says the Owner "separately authorized isolated support lanes (setup/CI review, STUB-HUNT and ORG-0.3 plugin audit)" and `WBS_ORG.md:59` moves ORG-4.2 to "Planned execution after ORG-0.2 green". Commit `6b9ec844` updated DECISIONS and WBS_ORG but not the rulebook line. These are current-policy conflicts to reconcile in the Owner's fix pass; this review changes none of them.

**B3. Fallback SOP is referenced but absent on this branch.** `docs/ops/HANDOFF_TEMPLATE.md:55` ("The PM logs the switch in docs/ops/USAGE.md") and `docs/reviews/ORG_SETUP_2ffa0d3a_CODEX.md:9` point at `docs/ops/USAGE.md`, which does not exist at `6b9ec844` (`git cat-file -e` fails). It exists on `task/org-0.2-worldgen-green` (commit `349851e1`, blob `68bcacc7`) and contains the MODEL FALLBACK / CROSSLOAD SOP the template cites as its authority. AGENTS.md has no link to the SOP or to the template. Resolution is coordination (copy or link after the ORG-0.2 writer releases its files), as the preparation doc says; nothing was cherry-picked here.

**B4. Review and claim-check gap.** Cross-family review of the Codex additions: now provided by this document. Cross-family review of Grok's work: Codex review at `56a888d4` (verified below). Deus claim check: none found for `6b9ec844` in the repo or the retained evidence; required before merge regardless of review (AGENTS §2).

Observation, not a finding: the Owner's `da9e6906` subject (`ci: ...`) has no `[lane]` tag; AGENTS rule 10 binds agents, and the Owner's commit stands as is.

## 4. CI scope versus promised hygiene (brief item 1)

### 4.1 What the tip actually checks (computed from the tree, not executed here)

`tools/ci/syntax_check.js` at `6b9ec844` collects `game/js/plugins.js`, non-recursive `game/js/plugins/*.js`, recursive `game/js/sim/**/*.js` and recursive `tools/**/*.js`, skips `node_modules`/`.git` and `game/js/libs`, and skips exactly the paths in `INTENTIONALLY_INVALID` (one entry).

| Set | Files at 6b9ec844 |
|---|---|
| `game/js/plugins.js` | 1 |
| `game/js/plugins/*.js` (top level) | 71 (0 `.js` in subdirectories) |
| `game/js/sim/**/*.js` | 74 |
| `tools/**/*.js` | 1021 (53 of them under `fixtures/` dirs; 0 `node_modules`) |
| Allowlisted invalid | 1: `tools/governance/fixtures/invariants/INV-GOV-02/tools/governance/check_claims.js` |
| **Checked** | **1 + 71 + 74 + 1020 = 1166** |

This matches the "syntax 1166 checked / 0 failed" recorded in `USAGE.md` (ORG-0.2 branch) and `SETUP_PR_PREPARATION.md`. I found no retained raw log of that 1166 run in the setup worktree scratchpad (only the five pre-fix probes in `ci_probes.json`); the figure is corroborated by the census above and by the GitHub run below, not by a local rerun. Codex's pre-fix numbers (1039 = 71 plugins + 968 tools, 53 fixture files skipped) are likewise consistent with this census (1021 - 53 = 968).

The single allowlisted fixture is genuinely invalid: a one-file `node --check` on a temp copy (Node v24.19.0) exits 1 with `SyntaxError: Illegal continue statement: no surrounding iteration statement`. It is consumed as text by `tools/governance/check_invariants.js:426` and `tools/governance/test_check_invariants.js:47`, as the allowlist comment says. `syntax_check.js` prints `WARN allowlisted path not found` if the entry goes stale, and `SKIP` when it is present (seen in the retained post-fix probes).

**Remote CI evidence (read from the public GitHub API, anonymous):** workflow `ci` ran on every pushed setup SHA and succeeded each time: run 37082558311 at `2ffa0d3a`, 37091664703 at `56a888d4`, 37092069090 at `da9e6906`, and **37093237965 at `6b9ec844`** (created 2026-10-03T03:27:07Z = 2026-10-02 22:27 CT, `ubuntu-latest`, steps "Syntax check ..." and "Root hygiene ..." both `success`). This is the only full-tree syntax evidence at the tip used by this review; CI uses `actions/setup-node@v4` with `node-version: 20`, while all local probes used Node 24.19.0.

### 4.2 Owner repair `da9e6906` against the Codex MAJOR

Verified: the pre-fix `syntax_check.js` at `2ffa0d3a` skips any directory named `fixtures` at line 30 (Codex wrote ":31"; off by one). `tools/art/test_blank_templates.js:37` does `require(... 'fixtures', 'templates', 'build_fixture.js')` and line 944 tells users to rerun it; `tools/fixtures/` holds the seven runnable `UF_*.js` plugins Codex named. The retained pre-fix probe (`ci_probes.json`, record "syntax error in runnable fixture directory") shows expected 1, actual exit 0. The six post-fix probes retained at `bddb3a80` show malformed executable fixture, sim file and `plugins.js` each exit 1, the exact allowlisted path skipped with exit 0, and a malformed neighbour of it exit 1. Read, not rerun.

### 4.3 Precise gaps versus the promised hygiene

- **G1.** `tools/srd_extract/optional/render_pages.mjs` is executable tool code under `tools/` but is not matched (`.js` suffix only), so it is never syntax-checked. Two `.cjs` files exist under `tasks/WG.20.02/lane-cs2/` (outside the promised roots). Only `.js` was promised; this is a scope edge, not a false claim.
- **G2.** The `game/js/plugins/` walk is non-recursive. Today 0 `.js` files sit in subdirectories, so coverage is complete; a future `game/js/plugins/<dir>/x.js` would be silently unscanned.
- **G3.** In a sparse or partial checkout (this review worktree has no `game/`), `syntax_check.js` still exits 0, reporting `0 plugins incl. plugins.js, 0 sim`; it only exits 2 when zero files are found overall. Not a CI defect (`actions/checkout@v4` is a full checkout) but it weakens AGENTS §6 "run both locally before pushing" as proof.
- **G4.** `check_root.js` passes in CI because only tracked root files exist there (no tracked `.js/.png/.zip` at the root of `6b9ec844`), and it passes in a worktree (`node tools/ci/check_root.js` here: 0 disallowed, exit 0). In the main checkout it fails today: `node tools/ci/check_root.js --root C:\Users\snewt\OneDrive\Desktop\UF` reports 63 disallowed `.js/.png/.zip` files, exit 1 (untracked local files hidden by the root-whitelist `.gitignore`; ORG-2.2 root cleanup is Parked). So "run both locally before pushing" is red in the main checkout until ORG-2.2 runs or the instruction says "from a worktree".
- **G5.** No end-of-line or whitespace check exists in CI; B1 was found only by a manual `git diff --check`, and CI at `6b9ec844` is green with the CRLF lines present. Noted as the current state, not as a demand for new CI.
- **G6.** Not scanned and not promised: `game/js/main.js` and six `game/js/rmmz_*.js` (protected engine core), `game/js/libs/` (6), `archive/**` (170 `.js`), `tasks/**` (about 40 evidence copies), `docs/archive/` (5). No JSON is checked and plugin registration is only parsed as JavaScript (`plugins.js`), not reconciled against `game/js/plugins/`. The `ci.yml` comment says behavioural `tools/**/test_*.js` are "gated locally by run_tests.bat"; `tools/run_tests.js` only launches `nw.exe`, so Node-side tools tests are actually run one by one (wording nit in the Owner's comment).
- **G7.** Node skew: local probes and `node --check` here used v24.19.0; CI pins 20. Local passes are not proof under Node 20; the GitHub run at `6b9ec844` is.

## 5. Hygiene finding on the ORG-2.3 ignore patterns

**C1 (MAJOR, Owner decision).** The eight patterns added at lines 90-97 are exactly the ones `docs/WBS_ORG.md` ORG-2.3 lists, but they are un-anchored and therefore apply at every depth. Against the tracked tree at `6b9ec844` (`git ls-tree -r | git check-ignore --no-index -v`):

| Pattern | Tracked files now matched |
|---|---|
| `*.log` (line 95) | 721, mostly `tasks/<WBS>/<lane>/evidence/**/game_runtime.log` (458 under `tasks/OPS.30.01` alone) |
| `temp_*` (line 93) | 17 under `art/source/biomes/*/raw/temp_*.png` and `.jpg` |
| `test_output/` (line 96) | 2 under `tasks/WG.00.44/lane-db/evidence/.../test_output/` |
| `scratch/`, `scratchpad/`, `tmp/`, `test_wang*`, `game/error_stack.txt` | 0 |

Total tracked-but-ignored paths rise from 1209 at `565dc5ae` to 1949 at `6b9ec844` (+740). Tracked files stay tracked, so nothing disappears, but from now on `git add tasks/<lane>/evidence/*.log` is refused without `-f`, which collides with the committed-evidence practice visible in those 721 files and with the `tasks/` evidence paths that lane reports cite. Options for the Owner: anchor the generated-output patterns to their real locations (for example `/tmp/`, `/scratch/`, `/game/test_output/`, `/game/*.log`, which already exists at line 75) or add a carve-out such as `!tasks/**`. This is as-specified by the WBS text, so it is a decision, not a writer error, and it should be settled before `.gitignore` merges. Related: `scratchpad/` being ignored means this lane's `scratchpad/setup-claude-review/**` (allowed by its `lane.json`) cannot be committed without `-f`; consistent with AGENTS rule 5 ("throwaway, gitignored"), so this review commits only this file.

## 6. Native expected-red disclosure (read-only; nothing rerun)

From the retained runs in the Owner's setup worktree (Codex, 2026-10-02):

| Source | Command (from `run.txt`) | CT window | RESULT line (from `results.txt`) |
|---|---|---|---|
| `2ffa0d3a` snapshot | `.\run_tests.bat --game ...\snapshot_2ffa0d3a\game`, seed fixture 1920951434, year 500, no suite or Z override | 21:47:10 to 21:50:12 | `RESULT: 152 passed, 25 failed (exit 2)` after `HARNESS watchdog: whole run took longer than 180 s` |
| `565dc5ae` baseline | `$env:DEUS_TEST_YEAR=500; .\run_tests.bat`, same seed | 21:41:07 to 21:44:09 | `RESULT: 157 passed, 25 failed (exit 2)` after the same watchdog line |

The 25 `FAIL` names in the `2ffa0d3a` file equal the 25 listed in the Codex review, and the first 25 `FAIL` names in the baseline file are the same set. Nuance not stated elsewhere: the baseline file has two more lines after its RESULT line (`PASS jobs.mine_built_wall`, `FAIL jobs.mine_subterranean_wall`), written by checks that finished after the watchdog cut; the `2ffa0d3a` run was cut earlier (after `jobs.equip_clothes`) and never reached them. So "same named failures" holds for the counted sets, and the baseline simply ran two checks further. Dynamic assertion counts and the wall-clock watchdog make raw totals non-comparable, as the Codex review already says.

Because the `game` tree and the runner are byte-identical between base and tip (section 2), this branch cannot alter native outcomes. Under `D-2026-10-02-3` and the Owner's clarification recorded in the preparation doc, inherited expected-red gates only CI, hygiene and docs lanes; it is not a blocker for this PR and it excuses nothing in game-logic lanes (ORG-0.2 or later). Native green is therefore not a prerequisite here, but a Deus CONFIRMED is. This review did not launch `nw.exe` and certifies no native result.

## 7. Codex additions, reviewed independently (brief item 2)

### 7.1 `docs/ops/HANDOFF_TEMPLATE.md` (`56a888d4`)

Checked against the SOP it cites (`docs/ops/USAGE.md` blob `68bcacc7`, section "MODEL FALLBACK / CROSSLOAD SOP", step 3): every field the SOP requires in `HANDOFF.md` is present (lane, branch, checkpoint and base SHA; goal and acceptance from the brief; done / in progress / untested; last `run_tests.bat` counts and failing names; seed/year; hazards and files not to touch). The template adds process evidence (PID, children stopped), origin-visible SHA with "PUSH BLOCKED" wording, screenshot provenance (native vs editor F5/F8) and a report row whose columns match the SOP's "Done means" report (lane, branch, SHA, test counts, reviewer, Deus verdict). The resume protocol matches SOP steps 4-6, including "first message restates the goal and checkpoint SHA" and "a returning writer may review but does not reclaim the lane". No lore, no completion claims, no banned phrases, absolute dates, 0 CR bytes.

- **M1.** Line 55 points at `docs/ops/USAGE.md`, absent on this branch (B3).
- **M2.** Line 3 names its authority ("Owner MODEL FALLBACK / CROSSLOAD SOP, 2026-10-02") without a path; once B3 is resolved, cite the file.
- **M3.** The template does not say that the AGENTS §9 completion report still applies when the lane finishes; a handoff is mid-lane and omits "Files changed" and "New symbols and their existing callers", which is the hook reviewers use to grep for call sites. One sentence would avoid two competing report formats.
- **M4.** Line 17 sends logs to `scratchpad/<lane-id>/evidence/`, which is gitignored, so handoff evidence does not travel with the pushed checkpoint. This mirrors SOP step 2 exactly, so it is an SOP property, not a template error; recorded for the Owner.

### 7.2 `docs/reviews/ORG_SETUP_2ffa0d3a_CODEX.md` (`56a888d4`)

Factual claims re-verified (all hold): fixtures-directory skip in the pre-fix checker (actual line 30, review says 31); 53 fixture `.js` skipped; 1039 = 71 + 968; `build_fixture.js` required at `test_blank_templates.js:37` and referenced at :944; seven `tools/fixtures/UF_*.js` runtime plugins; `git diff --check 565dc5ae 2ffa0d3a` exit 2 on `.gitignore:85-97`; native 152/25 and baseline 157/25 RESULT lines and the 25 failure names match the retained files; the review states it covers `2ffa0d3a` only and does not self-certify the template.

- **M5.** The "CI coverage" paragraph says the job "does not syntax-check game/js/sim/**, game/js/plugins.js". True at `2ffa0d3a`, false at `6b9ec844` after `da9e6906`. A one-line "superseded by da9e6906" pointer would stop readers at the tip from misreading it. Not changed here (writer file).
- **M6.** Evidence paths (`scratchpad/org-setup-review/ci_probes.json`, `native_snapshot_2ffa0d3a/...`) are gitignored and live only in the Owner's setup worktree; they exist there now and were read for this review, but they are not durable in git. The overnight branch transcribed the post-fix probes (`bddb3a80`); the pre-fix `ci_probes.json` has no committed transcript.
- **M7.** Line-number nit above (30 vs 31).

### 7.3 `6b9ec844` design records

Cross-checked against the Owner list in the BRIEF. Every ruling is present in `docs/DECISIONS.md` (D-2026-10-02-8 to -15) and mapped into `WBS_ORG`, `WBS_SIM`, `WBS_SPLIT`, `WBS_INDEX`, `docs/research/README.md` and addenda in the art, society and worldgen WBS files:

| Owner item | Where recorded | Design-only / gated wording present |
|---|---|---|
| 200 colonists per faction, about 1,800 across 9 factions; same data for full and totals simulation | D-8; SIM-4, SIM-5.1; society addendum | yes; "future targets, not observed performance" |
| Parity proof on at least 5 seeds; 1,800-colonist 60 FPS on the Owner's laptop, run in CI | D-8; SIM-5.2, SIM-5.3 | yes; margins, seeds, runner all marked TBD; "generic hosted hardware is not proof" |
| Backgrounds and homebrew racial feats, ASI/feat choice at 4, 8, 12, 16, 19, no extra ability-score bonuses | D-9; SIM-4.5, SIM-4.6; AGENTS rule 7; D-6 marked superseded | yes; "draft contents still require Owner approval" |
| About 60 techs, mutual exclusivity, scored AI choice, pure data + JSON schema | D-10; SIM-7 | yes; "no tech names, values or scoring weights are approved" |
| Research is input only; Gemini outputs are proposals | D-11, D-15; `docs/research/README.md` | yes |
| Worldgen hard gates: green on 5-10 seeds, no fake checks (STUB-FIX), deterministic hash, load budget, save/load identical hash | D-12; WBS_ORG gate table; ORG-4.2 reworded; worldgen addendum | yes; "requirements, not passing evidence" |
| Soft follow-on: data contract, SRD weight fields, tunable densities, RMMZ split | D-12; SPLIT-0.1 | yes; "soft, not another hard worldgen exit gate" |
| Save version from first save; art throughput and placeholder policy; licensing register with SRD CC-BY line | D-13; SIM-0.1; ORG-3.2, ORG-3.3; art addendum | yes; "no new art or reuse authorization" |
| First playable slice: arrive, gather, hut, survive a night; fun before more systems | D-14; SIM-8; WBS_INDEX | yes; "not a blanket lift of DEC-037" |

Facts checked: SRD 5.1 has exactly one feat (Grappler) and the standard ASI levels are 4, 8, 12, 16, 19, as D-9 states. "9 factions" agrees with `docs/VISION.md` V134 (9 factions x 8 founders). `DEUS_Simulation_Core.js` is indeed untracked at `565dc5ae` (WBS_SPLIT note). No code, data, schema or art changed in `6b9ec844` (10 files, all Markdown). No new WBS IDs were minted in the three "immutable ID" WBS files; the addenda say so and the diff confirms it. No invented names or lore; absolute dates and CT windows throughout; none of the banned report phrases appear in any Codex file.

- **M8.** AGENTS.md line 6 was not reconciled with the rewritten D-7 and WBS_ORG header in the same commit (detail in B2). The rulebook now says "Do not start other work" and lists ORG-4.2 as active while the decisions log it defers to says otherwise.
- **M9.** `docs/WBS_INDEX.md:3` still defines the status vocabulary as Active / Parked / Unknown, but the rows for WBS-ORG, WBS-SIM, WBS-SPLIT, WG, DW and SOC now hold free-text sentences; the legend no longer describes the cells.
- **M10.** `docs/WBS_ORG.md` rows ORG-1.2 "Active", ORG-2.3 "Parked", ORG-2.4 "Parked" describe work this very branch delivers (CI job, `.gitignore`, `check_root.js`); ORG-2.1 and ORG-3.1 at least say "done on org/setup-2026-10-02". These rows are Grok's text, untouched by `6b9ec844`; the status vocabulary lacks a "done on branch, pending merge" value. Reconcile in the fix pass or at merge.
- **M11.** SIM-5.3 "run in CI" on "the actual Owner laptop" implies a self-hosted runner, which is ORG-1.3 (Parked). The dependency is recorded as TBD in D-8's follow-up paragraph but not cross-linked to ORG-1.3; one reference would close the loop. Not a contradiction.
- **M12.** `docs/DECISIONS.md:3` says earlier decisions "DEC-001 to DEC-089" remain in `docs/OWNER_DECISIONS.md`; that file at `6b9ec844` runs to DEC-104. Grok's text from `869479d3`, left as is by `6b9ec844`; stale range.
- **M13.** `docs/WBS_SPLIT.md` SPLIT-0 states "DEUS_World.js 5,062 lines"; `git show 565dc5ae:game/js/plugins/DEUS_World.js | wc -l` = 5061 (`DEUS_Wildlife.js` = 2899, not stated). The row is explicitly "reported counts to confirm" (Grok text), so this is informational.

Current-policy conflicts identified and left unchanged: B2/M8 (rulebook vs decisions on concurrent support lanes, Gemini dispatch, ORG-4.2 status), B3 (SOP location), M10 (WBS statuses vs delivered work). Later Owner work on the 3x3 world, depth and art trims lives on other branches (`task/art-scale-1-docs` and others per the overnight queue) and on local main `038a02c3` (not on origin); this tip does not contain it and nothing here pretends otherwise.

## 8. Commands run for this review (all read-only except writing this file)

```text
git rev-parse HEAD                                      -> 6b9ec844158c969a144ffae67f2061ebcb7b4f9a
git status --porcelain                                  -> (empty) before and after writing this file
git merge-base main 6b9ec844                            -> 565dc5aead7e068230528d573c395ea21ed5cf5d
git ls-remote --heads origin main org/setup-2026-10-02  -> 565dc5ae / 6b9ec844
git log --format=fuller main..6b9ec844                  -> 7 commits, all deus-pm <deus-pm@local.invalid>
git diff --stat 565dc5ae 6b9ec844                       -> 19 files, +572/-226; -- game/ run_tests.bat tools/run_tests.js -> empty
git rev-parse 565dc5ae:game 6b9ec844:game               -> cce69276 both (tools/run_tests.js 5bd3fbc7 both; run_tests.bat ca2addac both)
git show 6b9ec844:.gitignore | tr -cd '\r' | wc -c      -> 13 (565dc5ae: 0); cat -A -> ^M on lines 85-97 only
git diff --check 565dc5ae 6b9ec844                      -> exit 2 (.gitignore:85-97); per commit: 81547e97 exit 2, others exit 0
git ls-tree -r --name-only 6b9ec844 | git check-ignore --no-index --stdin -v -> 1949 ignored tracked paths (base 1209); *.log 721, temp_* 17, test_output/ 2
git ls-tree census (plugins.js 1, plugins/*.js 71, sim 74, tools 1021, fixtures 53, .mjs/.cjs 3)
git cat-file -e 6b9ec844:docs/ops/USAGE.md              -> missing; task/org-0.2-worldgen-green:docs/ops/USAGE.md -> blob 68bcacc7
node --check <temp copy of INV-GOV-02 fixture>          -> exit 1, "Illegal continue statement" (Node v24.19.0)
node tools/ci/check_root.js                             -> 0 disallowed, exit 0 (this worktree)
node tools/ci/check_root.js --root C:\Users\snewt\OneDrive\Desktop\UF -> 63 disallowed, exit 1 (main checkout, untracked local files)
curl https://api.github.com/repos/willshw89/Deus/actions/runs?branch=org/setup-2026-10-02 -> 4 runs, all success; run 37093237965 at 6b9ec844, both steps success
read: org-setup\scratchpad\org-setup-review\{ci_probes.json, native_snapshot_2ffa0d3a, native_comparison_565dc5ae}
NOT run: run_tests.bat / nw.exe; full tools/ci/syntax_check.js over the tree (brief: ORG-0.2 owns the native slot; avoid heavy scans; sparse worktree has no game/)
```

Note: `gh` is not installed on this machine; GitHub data came from the anonymous REST API (the repository answers `"private": false`). That visibility is outside this review's scope and is recorded only because it is how the CI result was obtained.

## 9. What remains before a PR can pass

1. Owner fix pass on `org/setup-2026-10-02`: normalize `.gitignore:85-97` to LF (B1); reconcile AGENTS.md lines 6, 17, 28 with the current directives (B2/M8); land or link `docs/ops/USAGE.md` and reference it from AGENTS and the template (B3/M1/M2).
2. Owner decision on C1 (anchor the ORG-2.3 patterns or carve out `tasks/`), then re-run `git ls-tree -r | git check-ignore --no-index --stdin` to confirm the intended count.
3. Optional minors M3-M7, M9-M13 at the Owner's discretion.
4. At the new tip: `git diff --check <base> <tip>` exit 0; GitHub `ci` green; refresh this review (or append a delta section) at the final SHA; then Deus CONFIRMED; then the Owner's merge via PR. Native green is not required for this CI/hygiene/docs PR under D-2026-10-02-3; it remains required for ORG-0.2.

## 10. Lane report (AGENTS §9)

```text
Lane / task:      setup-claude-review (ORG-SETUP cross-family review)
Branch:           task/setup-crossfamily-review
Commit SHA:       see the commit that adds this file (recorded in the lane log and the push output)
Files changed:    docs/reviews/SETUP_CLAUDE_6b9ec844.md: this review (new file; only committed change)
New symbols:      none (documentation only)
Test command:     node tools/ci/check_root.js (exit 0 in this worktree); no run_tests.bat; no full syntax_check run (markdown-only change; brief forbids heavy scans)
RESULT:           not run in this review. Retained lines read: "RESULT: 152 passed, 25 failed (exit 2)" at 2ffa0d3a; "RESULT: 157 passed, 25 failed (exit 2)" at 565dc5ae
Evidence:         no screenshots opened or cited; GitHub run 37093237965 (ci, 6b9ec844, success) read via API
Not done / known problems / untested:
                  full local syntax_check not executed (relies on GitHub run + tree census); Deus verdict not obtained; CI step log text not readable anonymously
Decisions needed: C1 ignore-pattern anchoring; B2 rulebook wording; B3 SOP placement; whether to add .gitattributes EOL normalization
```
