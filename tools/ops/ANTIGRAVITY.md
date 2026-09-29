# DEUS orchestration for the coordinator (Gemini / Antigravity)

Rewritten 2026-09-29 under DEC-042. It replaces the 2026-09-28 setup guide. Read order at session start is the one in `AGENTS.md`: `AGENTS.md` -> `docs/DECISIONS_DIGEST.md` -> `docs/STATUS.md` -> the lane brief; `docs/OWNER_DECISIONS.md` is reference, and the five `.agents/rules/deus-*.md` files are trigger stubs that point back at `AGENTS.md`. This file is procedure, not authority: it opens no lane, changes no WBS status and grants no merge right.

## 1. Roles (DEC-042, 2026-09-29)
| Who | Does | Never |
|---|---|---|
| Claude Code (PM) | records Owner decisions; opens and closes lanes with `[pm]` commits; routes review; presents QA-passed art to the Owner | reviews its own family's code; certifies anything |
| Gemini / Antigravity (coordinator) | runs its worker fleet through lanes; integrates through the merge gate | commits runtime code to `main`; opens or widens a lane without a `[pm]` `lane.json`; self-certifies |
| Grok | independent cross-family review by default, mutation design, defect closure; writes when `lane.json` names it (`AGENTS.md` -> Roles) | reviews its own family's code |
| Codex | bounded tooling, harnesses, telemetry under `tools/` and `docs/telemetry/`; plugin code only when a lane assigns it (`AGENTS.md` -> Roles) | reviews its own family's code |
| MiniMax | manual only, one chat call through `tools/ops/minimax_cli.js`; results are committed as `[minimax]` | is relabelled as another provider, before or after merge |

Engine core (`game/js/rmmz_*.js`, `game/js/main.js`, `game/js/libs/`) is read-only for everyone. Art: DEC-007 as amended 2026-09-29 only (PixelLab OBJECTS and MAPS tools for natural-world tilesets, charsets and chipsets; no Creator or Character prompts; catalogue record first; prompt per `docs/art/DEUS_ASSET_STANDARD.md`; QA vetting; camera high top-down, AS-VIEW-002; the PM presents each asset and the Owner signs it off). Order of work: DEC-037 (Physical Space, Matter, Water, Soil, Climate, Flora, Fauna); civilization, farming and factions stay frozen (DEC-043 is a recorded design, not a lane). Rule 12 (animation is sprite frames), Rule 8 (`U7_` stand-ins only) and Rule 10 (two failed fixes, then stop and ask) stand.

## 2. Open a lane
1. Owner approval for the scope exists. A backlog row, a plan, a free provider or a Teamwork task is not approval.
2. The PM commits `tasks/<id>/<lane>/BRIEF.md` and `lane.json` on `task/<lane>` with a `[pm]` subject before the first edit in the worktree. Nobody else ever touches `lane.json`; the gate refuses the whole lane (`MANIFEST_TAMPERED`). Ask the PM for a `[pm]` update instead.
3. The brief carries the GAME TRANSLATION block from `tools/ops/GAME_TRANSLATION_TEMPLATE.md` (ten fields, six YES/NO lines). Keep the rest of the brief short; the 2026-09-25..29 audit found briefs shorter than their reviews and 149 mailbox directives in one day. One brief, one worker, one answer.
4. `lane.json` names one writer, one reviewer of another family, `allowedPaths`, and `gateTests` that exercise production code. Gates that only exercise stubs were the most common FAIL cause in that audit (6 of 15 failing lanes).
5. One worktree per lane under `%USERPROFILE%\.deus_worktrees\<lane>`. Never reset, reuse or repurpose another lane's worktree.

## 3. Launch (`tools/ops/launch_worker.ps1`)
```powershell
& "$repo\tools\ops\launch_worker.ps1" -Lane <lane> -Provider <claude|grok|codex|gemini> -Role <writer|reviewer> `
    -Worktree <lane worktree> -BriefPath <BRIEF.md in that worktree> -PromptFile <reviewed prompt> `
    -ResumeFromSha <writer SHA for a reviewer> -TimeoutMinutes 240 -NoCommitPrompt `
    -ProviderExe <executable> -ProviderArgs '<DEC-032 model and effort>'
"EXIT=$LASTEXITCODE"
```
- `-NoCommitPrompt` on every launch. The launcher still saves the prompt under `tasks/<id>/<lane>/launches/`, and Grok reads that saved file (`--prompt-file`). Without the flag the prompt lands on the lane branch as an `[ops]` commit above the writer's last commit; the gate then takes that commit as the review target (`REVIEW_FILE_NAME` refusals), and an `[ops]` commit that touches `lane.json` throws the lane's PASS away (lane-bp, launch-prompt commit `645967cc`, 2026-09-27).
- Check branch and HEAD before launching (`git -C <worktree> branch --show-current`, `git rev-parse HEAD` against the assignment). The launcher has no plan-only mode: invoking it starts work.
- Provider arguments: DEC-032 models and effort floors, DEC-035 routing. Do not pass `-Effort` together with `-ProviderArgs`. Use sandboxed or manual-permission arguments (`tools/ops/README.md` §2); never unrestricted execution to avoid prompts.
- Before a reviewer launch: every `gateTests` entry passes on the writer tip in a fresh clone (DEC-035); the PM runs them, or the coordinator for its own fleet (`AGENTS.md` Rule 18). Pin the reviewer to that SHA. A change after the review needs a new review at the new tip.

## 4. One writer per lane, one identity per commit
- One writer per lane and per file set. Reviews are read-only and start after the writer has stopped. Two writers in one lane is a defect, not parallelism.
- The coordinator's own code goes through a lane with a `[pm]` manifest and an independent cross-family review, like everyone's. No direct commits of runtime code (`game/**`, `tools/**` scripts, `game/data/**`) to `main`; the audit counted 61 direct commits to `main` since 2026-09-26, including coordinator feature code (`cd8e43b7`, `eb790a68`). Decision records, STATUS rows, WBS registry and telemetry may be committed to `main` as data (DEC-042: the gate is "the only way into `main` for reviewed code"; the boundary is pending Owner confirmation, `docs/STATUS.md` D.9).
- A review commit is authored by the reviewer's own account: `deus-grok`, `deus-codex`, `deus-gemini` (the launcher sets `GIT_AUTHOR_NAME`). The subject tag is not identity. Six `[grok]` reviews authored by `deus-ops` seconds after the writer commit passed the gate; the gate will refuse that once the author check lands (`tools/governance/MERGE_GATE.md` §11). Until then the integrator checks `git log --format="%an %s" -1 <tip>` by hand.
- Telemetry: every writer, the coordinator included, has a registry entry in `docs/telemetry/sessions/active_workers.json` (main checkout) with lane, PID, branch and tip SHA. A lane launched with another `-RegistryPath` records that path in its lane folder. Writing without an entry is a governance defect (27 of about 66 lanes were covered on 2026-09-29).

## 5. Merge: the gate is the only door
```powershell
node tools/governance/merge_gate.js --lane <lane> --manifest tasks/<id>/<lane>/lane.json --branch task/<lane> --dry-run
node tools/governance/merge_gate.js --lane <lane> --manifest tasks/<id>/<lane>/lane.json --branch task/<lane>   # only after PASS
```
- Dry run, then the real run. Never `git merge --no-ff` by hand after a refusal, never cherry-pick or squash a lane, never a mutant switch. Of 78 lane merges since 2026-09-25 only 10 went through the gate; that ends here.
- The `main` checkout must be clean (`MAIN_DIRTY`): commit or revert your own working-tree changes there before asking for a merge. Never delete protected untracked files to get a clean tree.
- A refusal goes back to the lane: fix, new review at the new tip, gate again. After two failed fixes, stop and ask the PM (Rule 10). Four review rounds without a merge (lane-e) is a stop condition, not a fifth round.
- Every lane ends in exactly one state: `MERGED`, `REJECTED`, `SUPERSEDED` or `PAUSED-BLOCKED` (DEC-041). A worker escalation that names a player-visible defect (lane-bj, camps without starter resources, unanswered about 42 h) gets an answer the same working day, recorded in the lane folder.
- `/teamwork-preview` and `/goal` are execution aids bound to an existing lane, branch and whitelist. They open nothing and certify nothing.

## 6. Failover (kept from the 2026-09-28 guide)
1. Capture the provider error, real exit status, branch and HEAD, uncommitted changes, logs, model and effort, and any observed retry time. Confirm the old writer and its child processes have stopped; keep their evidence and lock provenance.
2. Check current availability and DEC-032, DEC-034 and DEC-035 routing. A predicted quota-reset time is not evidence of recovery. Continue another approved lane while waiting; do not open a lane to fill capacity.
3. Before changing family, reconcile the manifest and reviewer against every contributor to the implementation. Never relabel a provider or impersonate a reviewer. A same-family reviewer makes that route ineligible; no eligible reviewer means hold.
4. Ask the PM for a `[pm]` manifest update, then launch a fresh provider-specific prompt in the same lane, citing the checkpoint SHA and telling the new writer to read the diff before editing. Do not reuse a prompt that assumes the former provider's identity.
5. Re-run the gate tests and obtain an independent review of the resulting tip. Restore preferred routing only after observed recovery; never rewrite the provider credited for prior work.
6. `resume_queue.ps1 -AllowFailover` is not the route: it reconciles neither manifest roles nor contributor history, and even `-DryRun` may touch lane locks. Do not add a second dispatcher.

## 7. Reports
- A completion report is the GAME TRANSLATION REPORT block of `tools/ops/GAME_TRANSLATION_TEMPLATE.md` with observed results and exact SHAs. In-game proof means the Owner saw it in RMMZ Playtest (F5); headless tests alone never close a lane.
- Reports stay shorter than briefs. Put findings in the review file, decisions in `docs/OWNER_DECISIONS.md` through the PM, and nothing in a mailbox that belongs in the lane folder.
