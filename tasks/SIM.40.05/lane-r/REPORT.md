# Lane R report: SIM.40.05 decay cycle design (docs only)

Writer: Claude. Reviewer: Grok (independent, launched later by the PM). This report states what was done and the raw evidence. It does not certify the work; the independent review decides.

Run context: PM relaunch #1 on 2026-09-26 after a usage-limit stop. The previous run had committed nothing beyond the launch prompt, so all deliverables were written in this run.

## What changed

- `tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md` (new, 118,179 bytes): the design. It has the 13 required headings and sections R-01..R-12, a conventions section (geometry, mass units and ledger, D-1-neutral time units, flat rendering), a disagreements table (R-12.4) and a "Not checked" list.
- `tasks/SIM.40.05/lane-r/trace.json` (new): 12 requirement records R-01..R-12 in order, 12 proposed packages PROPOSED-R-01..R-12 with real dependency IDs and acceptance tests that each name a mutant that must fail, and 9 Owner questions OQ-R-01..OQ-R-09 with options.
- `tasks/SIM.40.05/lane-r/REPORT.md` (this file).

Nothing else was written. No code, scripts, tests or art were committed. No art was generated, requested or integrated (DEC-007). The two ad-hoc check scripts described below were run from the Git Bash temp directory and are not in the repository.

## How I tested it

This is a documents-only lane, so the checks are about the documents: the lane gate, citation resolution, verbatim excerpts and the write set.

1. **Lane gate** (the `gateTests[0]` command in `lane.json`, run from the repo root by spawning `cmd` with `args` exactly as stored):

```text
task SIM.40.05 reqs 12 missing none bad none missingHeadings none ownerQuestions 9 mdBytes 118179
EXIT=0
```

2. **The gate can fail.** The same gate was run on a scratch copy of the lane folder (in the Git Bash temp directory) whose `trace.json` had R-12 removed:

```text
task SIM.40.05 reqs 11 missing R-12 bad none missingHeadings none ownerQuestions 9 mdBytes 118179
EXIT=1
```

3. **Citation check** (ad-hoc Node script, not committed). It finds every backticked `path:line` or `path:start-end` citation to a `.js`, `.json` or `.md` file in the design doc, resolves bare plugin names under `game/js/plugins/`, and fails if a file or line does not exist. For every table row of the form `| file:line | code | finding |` it checks that the code excerpt appears verbatim on the cited line.

```text
$ node /tmp/chk_r.js
citations 171 bad 0 excerptRows 34 excerptBad 0
EXIT=0
```

   The first run of this script failed with EXIT=1: 17 bare SRD file names did not resolve, and a backslash in the script's excerpt-unescape regex was mangled by the shell heredoc, so all 34 excerpt rows were reported as mismatches. The doc was changed to use full `game/data/srd51/...` paths, and the script was fixed with `String.fromCharCode(92)`. That first failing run also shows the check can fail.

4. **SRD phrase check** (ad-hoc `node -e`): each of 21 SRD citations must contain a key phrase from the quoted text.

```text
srd checks 21 bad 0
EXIT=0
```

   Its first run found 3 wrong lines (`rules.json:7016`, `creatures.json:28401`, `:28733` pointed at the header or ability-name line, not the text). They were corrected to `rules.json:7025`, `creatures.json:28402` and `:28734`.

5. **Planning and code keyword check** (ad-hoc `node -e`): 55 cited WBS, VISION, OWNER_DECISIONS, RISK, INVARIANT, design-doc, catalog and plugin lines must contain a keyword. The first run found one wrong line (`DEUS_Anim.js:1260`), which was corrected to `:1261` (`list.splice(i, 1);`). Re-run after the fix:

```text
checked 55 bad 0
EXIT=0
```

6. **Arithmetic re-checks** (ad-hoc `node -e`): the D-1 calendar mapping table (sy × DPY × 240 s for DPY = 1, 20 and 336) and the band-by-band wall failure years used in R-01.6 and R-09.3. Output, copied:

```text
H1 band fail years: 1397, 2523, 3480, 4293
WE band fail years: 2718, 4977, 6897, 8529
H2 band fail years: 62, 95
H4 band fail years: 563, 920, 1163, 1328, 1441, 1517, 1569
```

7. **Write set and base:**

```text
$ git merge-base HEAD origin/main
84ee3b55f3f8c1b8a16710ccf3878795d98d1683
EXIT=0
$ git diff --stat 84ee3b55 HEAD -- game/ docs/ tools/ art/
EXIT=0            (empty: nothing under game/, docs/, tools/ or art/ changed)
$ git diff --name-only 0026c89c HEAD      (0026c89c = the launcher's last commit)
tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md
tasks/SIM.40.05/lane-r/trace.json
EXIT=0
```

   (This report is added by the final commit.)

8. **Commits and pushes** on `task/lane-r`. Every commit and every `git push origin task/lane-r` in this run printed EXIT=0. WIP commits, in order:
   - `71bd7fa6` part 1
   - part 2
   - part 3
   - part 4
   - citation fixes
   - wall-band revision
   - `3b3a00f2` trace.json

## Evidence

- No screenshots: nothing visual was built or claimed (documents-only lane).
- Counts from `trace.json`, via `node -e`:

```text
{"COVERED":11,"PARTIAL":1} packages 12 ownerQuestions 9
EXIT=0
```

  - Requirements by status: COVERED 11 (R-01..R-04, R-06..R-12), PARTIAL 1 (R-05), OWNER_QUESTION 0.
  - Proposed packages: 12 (PROPOSED-R-01..R-12).
  - Owner questions: 9 (OQ-R-01..OQ-R-09).
- `git rev-parse HEAD` before the commit that adds this report: `3b3a00f2186b4f9f98dcc0d90675b9c7f1e41302`. The final SHA (the commit adding this report) is printed as the lane's `FINAL SHA` line after the push. It cannot be written inside the commit it identifies.

## Not done / known problems

- **R-05 is PARTIAL.** Lane Q (SIM.40.01) had pushed only its brief (`origin/task/lane-q` at `9103799e`), so the collapse contract uses ASSUMED names: `collapse.breakElement`, `capacityThresholdsHP`, and the collapse event. They must be reconciled with Lane Q's design once it is reviewed. The Lane W hand-off for remains (R-03.4) is assumed the same way (`origin/task/lane-w` at `31892ae7`, brief only).
- **ADR-003 is PROPOSED.** Every mechanism marked [ADR-003] depends on it:
  - tick and day cadence;
  - L0/L1/L2;
  - chunk storage;
  - the ledger transform API;
  - the support queue.
  
  A search pass reported that ADR-003 was merged to `origin/main` after this lane's base (`3b33faa5`). The writer only read it from `origin/task/lane-m` (tip `9e0ef94d`) and did not re-check main.
- **Unmeasured numbers.** Every rate, fraction and duration is a design default from real-world orders of magnitude, not balanced or measured. Memory and CPU figures are arithmetic from stated assumptions. DEC-014 has no population numbers, so scenario L is an assumption. The 1-10 µs per event is also an assumption.
- **Wall rule revised mid-run.** The walls-lose-height-band-by-band rule was adopted during this run to match ADR-003's per-column "open to the sky" definition, and the fixture's expected-stage table was recomputed. That table is approximate by design: the SIM.40.09 oracle computes exact days.
- **Not resolved, only flagged** (R-12.4): the ADR-003 L1683 "buried mound" floor against the brief's chain to rock; `DURABILITY.md:320` (items have no HP); the REMAINS.md and PEOPLES.md remains timings; the REMAINS.md stage tints against DEC-011; the dismantle-yield conflicts; "permanent ash beds"; the SRD damage threshold. These are routed to Owner questions or PROPOSED-R-12.
- **Dependencies on decisions not yet final:** D-4 and D-6 (PM decisions the Owner may overturn), DEC-010 (OPEN), and D-1 (OWNER_OPEN). Durations are given under both D-1 options, and neither is chosen.
- **No escalation file.** Every disagreement found is one the brief says to flag, and no file outside the allowed paths was needed.

## Try it in RMMZ

Not applicable. This lane changes no game file, so there is nothing to run in the editor.

## Decisions needed

- Owner: OQ-R-01..OQ-R-09 (decay speed, ruin retention, lithification scope, item weathering against DURABILITY.md:320, special materials, remains timings and anchors, exposed ash beds, re-founding policy, SRD damage threshold). Full options are in the doc's "Owner questions" and in `trace.json`.
- Coordinator: whether to adopt PROPOSED-R-01..R-12, and the recommended dependency and overlap changes in R-12.3. These cover SIM.40.05, .07 and .08, SIM.50.05, WG.65.10 and the other WG.65.x overlaps, WG.61.02, and the stale geometry text in WG.65.02, SIM.30.01 and INV-GEO-01/02.
