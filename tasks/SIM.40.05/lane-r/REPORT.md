# Lane R report: SIM.40.05 decay cycle design (docs only), Fix 1

Writer: Claude. Reviewer: Grok (independent, launched later by the PM). This report states what was done and gives the raw evidence. It does not certify the work; the independent review decides.

Run context: Fix 1, 2026-09-26. The Grok review of `6613418ff5539c4156c5f42d589913d479dc0853` (`review_grok_6613418f.md`) returned VERDICT FAIL: 0 BLOCKER, 1 MAJOR, 4 MINOR. The work followed `BRIEF_FIX1.md`, with `BRIEF.md` still the authority for scope. Branch HEAD when Fix 1 started: `8d23c64c278f057c81e6a9a13968819d2cb3c6f7`. The review file was not edited. No art was generated, requested or integrated (DEC-007). No code, scripts or tests were committed.

## Findings and what changed

Every finding was fixed in the design document. None needed an Owner ruling, so there is no `escalation.md`.

| Finding | What changed (file, section) |
|---|---|
| **MAJOR-1** `rateMilli` does not preserve the life table | `SIM.40.05_DECAY_CYCLE.md`. See the four rows below. |
| | **R-01.2.** Rewritten. ADR-003's per-day `rateMilli` form (L1653) is no longer used. Every decaying record now carries a **decay clock**: `t0` is an instant in year-ticks (1 yt = 1/2,400 sy, which is exactly DPY ticks), `rem0` is the life left in millionths, and `lifeYt` is the life in yt. The closed forms `rem(t)`, `cross(p)` and `failYt` are integer and invert exactly. The HP byte is derived from the clock and is never the schedule. That section also covers four points: <br>• why the per-day form fails, with numbers at maxHP 120; <br>• how lives longer than 1,000 × maxHP game days are held (u32 `lifeYt`, up to about 1.79 million sy); <br>• the exactness bounds; <br>• D-1 neutrality (DPY appears in no formula). |
| | **Recomputed examples.** R-01.6 (worked example as a band table in yt), R-02.4 (ASHLAR row) and R-09.3 (FX-R-01 instants for S1-S4 and every band failure, in yt, plus a worked H1 first band). |
| | **Section 0.3, R-09.1 and R-08.5.** Schedules are instants. The DPY 1 and DPY 20 runs compare instants and whole-year checkpoint states, not the calendar year in which an event is processed. The checkpoint identity is shown in R-08.5. |
| | **Tests, layouts and ADR-003.** AT-R-01 adds a 20,000-sy life and a rebase case. AT-R-20 adds mutants MR-15 (per-day rate) and MR-16 (rebase at the processing day). R-10 layouts and arithmetic are updated. R-12.3 proposes the ADR-003 §17 amendments and R-12.4 flags the disagreement. |
| **MINOR-1** visitor years cite the wrong example | R-07.3: the visitor table now cites FX-R-01's H1 timeline at wR 50 (R-09.3), counted from the abandonment at y11. It says why R-01.6 (wR 90: 2,718 and 8,529) is not the source. Its rows were re-derived from the exact instants. The first row moved from 10 years to 15, because S1 is at about 11 years. |
| **MINOR-2** sub-day lives have no key | R-08.5: every record is keyed by its instant `dueYt`. A **short heap** (remains and FOOD, the only lives under 1 sy) drains every tick, at tick `dueYt × DPY`, exactly. The **long heap** stays drained at day boundaries on purpose, and the section says so: whole-year checkpoints do not depend on DPY. Also changed: R-03.3 (FOOD note), R-03.4 (sub-day stages and the *gentle repose* pause), AT-R-08 (sub-day placement plus a mutant), R-10.2 (12-B heap entry, clock fields in the item and remains records). |
| **MINOR-3** stale Lane Q and Lane W tips | The header's "Limits" row, the R-05 intro, R-03.4 and "Not checked" now say the first version was written against the briefs, and that this was stale by `6613418f`. They give the re-sampled tips (Lane Q `fd256fc5316adf70e8ba4fb0540014a87ca82fb7`, which moved three times during Fix 1; Lane W `63b6f20707fbb20cee5d77928aa3128098dce89d`, merged to main at `8997e238a97c7a4a2405d5e7249f587b4d8b298d`) and tell the reader to read the current tips. Lane Q's §9.7 is cited as the reconciliation record, which Lane Q owns. Its text is identical at `9d5b40d3` and `fd256fc5`. No Q or W design was copied. R-05 stays PARTIAL. |
| **MINOR-4** exposure change does not assign the baseline | R-01.2 now has a "Rebase" rule: `rem0 ← rem(t1)`, `t0 ← t1`, `lifeYt ←` the new exposure's life, and the heap entry is replaced. `t1` is the instant of the cause, not the processing day. The rule also covers a change during the grace period, external damage and repair. R-05.4 step 3 spells out the assignment for the wall top at the roof's `failYt`. R-05.3 C-3 adds `atYt` to the collapse event, and C-6 adds an instant barrier (both ASSUMED Lane Q interface items). |

Other changes made while fixing:
- **Wrong line citation.** `DEUS_Levels.js:1006` was cited for stone's `maxHP: 120`; the review used the same line. Line 1006 is soil. The doc now cites `:1005`, found by the phrase check below.
- **Deterministic vegetation stand-in.** FX-R-01's vegetation stand-in now has an exact schedule (first plant 1 sy after the later of S1 and loss of maintenance), so S2 has exact instants. The stage point is now a member event, so the event counts are 7 per member, not 6 (R-08.4, R-10.4).
- **Memory and save figures, recomputed for the clock fields:**

  | Figure | First version | Fix 1 |
  |---|---|---|
  | Scenario Y0 memory | under 100 KB | about 113 KB |
  | Scenario L memory | 19-22 MB | about 23-25 MB |
  | Scenario L save | 8.2 MB | about 10.9 MB |
- **`trace.json`.** A `fix1` block records the review, the brief and a one-line summary per finding. The notes for R-01..R-03 and R-05, R-07..R-12 are updated. So are the titles or tests of PROPOSED-R-01, R-02, R-04 and R-10. Statuses and section strings are unchanged. The `deps` arrays keep their original inline form.

## What changed (files)

- `tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md`: 118,179 bytes at `6613418f`, 151,534 bytes at `6ff05cfe` (`git cat-file -s` and the gate's `mdBytes`).
- `tasks/SIM.40.05/lane-r/trace.json`: as above.
- `tasks/SIM.40.05/lane-r/REPORT.md`: this file.

`git diff --name-only 8d23c64c278f057c81e6a9a13968819d2cb3c6f7 6ff05cfee2357fe3a5d1e0a481789a65989371e1` printed only the design doc and `trace.json` (EXIT=0). This report is added by the next commit. The untracked launcher file `launches/20260926_042158_prompt.txt` was left alone and not staged.

## How I tested it

This is a documents-only lane, so the checks are about the documents: the lane gate, citation resolution, the recomputed numbers and the write set. The scratch scripts ran from the temp directory and are **not** in the repository: `calc.js`, `chk_nums.js`, `chk_refs.js` and the first run's `chk_r.js`.

### 1. Lane gate in a fresh temp clone of the Fix 1 tip

This was run in the Git Bash shell. The clone is a fresh one; the live worktree was not edited while it ran. The gate is `lane.json` `gateTests[0]`, spawned with `cmd` and `args` exactly as stored. Raw output:

```text
$ git clone -q -c core.autocrlf=false . "C:\Users\snewt\AppData\Local\Temp\lr_fix1_gateclone2"
EXIT_CLONE=0
$ cd /tmp/lr_fix1_gateclone2 && git checkout -q --detach 6ff05cfee2357fe3a5d1e0a481789a65989371e1
EXIT_CHECKOUT=0
$ git rev-parse HEAD
6ff05cfee2357fe3a5d1e0a481789a65989371e1
EXIT_REVPARSE=0
$ node -e "const l=require('./tasks/SIM.40.05/lane-r/lane.json');const g=l.gateTests[0];const r=require('child_process').spawnSync(g.cmd,g.args,{encoding:'utf8'});process.stdout.write(r.stdout);process.stderr.write(r.stderr);console.log('EXIT_GATE='+r.status)"
task SIM.40.05 reqs 12 missing none bad none missingHeadings none ownerQuestions 9 mdBytes 151534
EXIT_GATE=0
```

The clone and the scratch copy were deleted afterwards (`rm -rf`, EXIT_RM=0; then `test ! -e` printed "temp clone and scratch copy deleted").

The commit that adds this report changes only `REPORT.md`, which the gate does not read. So the gate result above also holds for the final SHA. The reviewer should re-run it at the final SHA.

A procedural note, recorded because it happened. The first clone attempt in this run went to a mistyped path, `/tmp/lr_fix1clone`, because the shell ate a backslash. As a result, `cd` into the intended path failed. The next two commands, `git rev-parse` and the gate, then ran read-only in the live worktree, at the same commit `5a0627ae`. Neither writes anything. That run is not counted. The stray clone was deleted, and the gate was re-run correctly: first at `5a0627ae` (EXIT_GATE=0, `mdBytes 151336`), then at `6ff05cfe` (above) after the header's Lane Q tip was re-sampled.

### 2. The gate can fail

A scratch copy of the three lane files was made from the clone, with R-12 removed from `trace.json`, and the same gate was run on it:

```text
task SIM.40.05 reqs 11 missing R-12 bad none missingHeadings none ownerQuestions 9 mdBytes 151534
EXIT_GATE_MUTANT=1
```

### 3. The corrected model, scratch calculation (`calc.js`)

`calc.js` uses BigInt integer arithmetic. It implements R-01.2 (`lifeYt`, `rem`, `cross`, rebase). It also computes the first version's per-day `rateMilli` (MR-15) and a rebase at the processing day (MR-16), both at DPY 1 and DPY 20. Raw output:

```text
--- lives ---
R-01.6 ASHLAR wR90 m8=9: { SH: 42666667n, SKY: 6400000n, roof: 144000n }
H1 ASHLAR wR50 m8=10: { SH: 21333334n, SKY: 3200000n, roof: 144000n }
H2 MUDBRICK m8=12, THATCH roof: { SH: 640000n, SKY: 96000n, roof: 28800n }
H4 BRICK m8=12, LIGHTWOOD roof: { SH: 4000000n, SKY: 1280000n, roof: 60000n, floor: 144000n }
--- R-01.6 example: all abandoned (t0) at year 0 ---
roof S1 21600 yt = 9.000 sy (year 9) fail 144000 yt = 60.000 sy (year 60)
R-01.6 ASHLAR wR 90
  band 1: rebase at 144000 rem 996626 -> fail 6522407 yt = 2717.670 sy (year 2717)
  band 2: rebase at 6522407 rem 847132 -> fail 11944052 yt = 4976.688 sy (year 4976)
  band 3: rebase at 11944052 rem 720062 -> fail 16552449 yt = 6896.854 sy (year 6896)
  band 4: rebase at 16552449 rem 612052 -> fail 20469582 yt = 8528.993 sy (year 8528)
--- FX-R-01 (site abandoned y11; masonry/TIMBER t0 y13, THATCH/LIGHTWOOD t0 y12) ---
H1 roof S1 52800 yt = 22.000 sy (year 22) fail 175200 yt = 73.000 sy (year 73)
H1 ASHLAR wR 50
  band 1: rebase at 175200 rem 993251 -> fail 3353604 yt = 1397.335 sy (year 1397)
  band 2: rebase at 3353604 rem 844263 -> fail 6055246 yt = 2523.019 sy (year 2523)
  band 3: rebase at 6055246 rem 717623 -> fail 8351640 yt = 3479.850 sy (year 3479)
  band 4: rebase at 8351640 rem 609980 -> fail 10303576 yt = 4293.157 sy (year 4293)
H1 wall S1 point if sheltered: 3231201 yt = 1346.334 sy (year 1346)
H1 WALL-BASE rem at y1000 (SHELTERED from y13): 888963n
H2 roof S1 33120 yt = 13.800 sy (year 13) fail 57600 yt = 24.000 sy (year 24)
H2 MUDBRICK
  band 1: rebase at 57600 rem 958750 -> fail 149640 yt = 62.350 sy (year 62)
  band 2: rebase at 149640 rem 814938 -> fail 227875 yt = 94.948 sy (year 94)
H4 roof S1 37800 yt = 15.750 sy (year 15) fail 88800 yt = 37.000 sy (year 37)
H4 floor S1 50400 yt = 21.000 sy (year 21)
H4 BRICK
  band 1: rebase at 88800 rem 985600 -> fail 1350368 yt = 562.653 sy (year 562)
  band 2: rebase at 1350368 rem 670208 -> fail 2208235 yt = 920.098 sy (year 920)
  band 3: rebase at 2208235 rem 455742 -> fail 2791585 yt = 1163.160 sy (year 1163)
  band 4: rebase at 2791585 rem 309904 -> fail 3188263 yt = 1328.443 sy (year 1328)
  band 5: rebase at 3188263 rem 210735 -> fail 3458004 yt = 1440.835 sy (year 1440)
  band 6: rebase at 3458004 rem 143299 -> fail 3641427 yt = 1517.261 sy (year 1517)
  band 7: rebase at 3641427 rem 97444 -> fail 3766156 yt = 1569.232 sy (year 1569)
--- DPY 1 vs 20: processing day, year of processing, checkpoint inclusion ---
DPY 1: H1 band1 instant 3353604 -> drained at day 1398 (calendar year of drain 1398); included in checkpoint y1398? true; y1397? false
DPY 20: H1 band1 instant 3353604 -> drained at day 27947 (calendar year of drain 1397); included in checkpoint y1398? true; y1397? false
MR-16 (rebase at processing day), DPY 1, H1
  band 1: rebase at 175200 rem 993251 -> fail 3353604 yt = 1397.335 sy (year 1397)
  band 2: rebase at 3355200 rem 844188 -> fail 6056602 yt = 2523.584 sy (year 2523)
  band 3: rebase at 6057600 rem 717513 -> fail 8353642 yt = 3480.684 sy (year 3480)
  band 4: rebase at 8354400 rem 609851 -> fail 10305924 yt = 4294.135 sy (year 4294)
MR-16 (rebase at processing day), DPY 20, H1
  band 1: rebase at 175200 rem 993251 -> fail 3353604 yt = 1397.335 sy (year 1397)
  band 2: rebase at 3353640 rem 844261 -> fail 6055276 yt = 2523.032 sy (year 2523)
  band 3: rebase at 6055320 rem 717620 -> fail 8351704 yt = 3479.877 sy (year 3479)
  band 4: rebase at 8351760 rem 609974 -> fail 10303677 yt = 4293.199 sy (year 4293)
MR-15 rateMilli maxHP 120, DPY 1: rates SH 14 SKY 90 roof 2000; roof fail y73; bands fail at years 1407.00, 2530.00, 3475.00, 4275.00
MR-15 rateMilli maxHP 120, DPY 20: rates SH 1 SKY 5 roof 100; roof fail y73; bands fail at years 1263.00, 2213.00, 2973.00, 3583.00
ASHLAR SHELTERED 20000 sy fail 48000000 yt = 20000.000 sy (year 20000) L*R 48000000000000n < 2^53? true
SILVER SKY 30000 sy L 72000000n fits u32? true L*R < 2^53? true
u32 life bound in sy: 1789569.70625
EXIT=0
```

What the output shows:
- **The exact H1 instants reproduce the review's life-table years.** The review recomputed 1,397, 2,523, 3,480 and 4,293; the clock gives 1,397.335, 2,523.019, 3,479.850 and 4,293.157. The review's band-3 integer is rounded; the calendar year (the floor) is 3,479.
- **The first version's per-day rate misses those years, and it disagrees between DPY 1 and DPY 20.** That is MR-15.
- **A rebase on the processing day disagrees between DPY 1 and DPY 20 from band 2 on.** That is MR-16.
- **The first band is processed in different calendar years at the two DPYs, but both runs include it at the y1,398 checkpoint and neither at y1,397.**

The review's own table gives `rateMilli` 91 for the H1 SKY life. It used the rounded decimal life 1,333.333 sy. The exact `lifeYt` 3,200,000 gives 90.

### 4. Printed numbers against a fresh recomputation (`chk_nums.js`)

`chk_nums.js` recomputes 48 values: the lives, the S1/S2/S3 instants, every band `failYt`, the R-01.6 `rem0` values, the S4 years and the AT-R-01 long-life instant. It fails if any of them is missing from the doc. Run in the temp clone at `6ff05cfe`:

```text
numbers 48 missing 0
EXIT_NUMS=0
```

It can fail. On the scratch copy with `3,353,604` changed to `3,353,605`:

```text
MISSING H1 band 1 failYt 3,353,604
numbers 48 missing 1
EXIT_NUMS_MUTANT=1
```

Its first run in the worktree printed `MISSING H2 band 1 rem0 958,750` (EXIT=1). That was a bug in the checker: the H2 `rem0` values are not printed in the doc by design. The checker's filter was fixed, and the doc was not changed for it.

### 5. Citations

`chk_r.js` is the first run's checker, unchanged. It checks every backticked `path:line` citation, and every excerpt row verbatim. Run in the temp clone at `6ff05cfe`:

```text
citations 175 bad 0 excerptRows 34 excerptBad 0
EXIT_CITES=0
```

`chk_refs.js` is new in Fix 1. It resolves the git-ref citations (`origin/...:path:line` and `<sha>:path:line`). It also checks 14 phrases that Fix 1 quotes from specific lines, in ADR-003 L3, L1047, L1653, L1659, L1689, L1690 and L1694 on `origin/main`, Lane W IA-R1, Lane Q C2 and §9.7, the elm and limestone catalog lines, and stone's `maxHP`. It ran in the worktree, because a clone of the worktree has no `origin/main` of the real remote.

```text
refCitations 6 bad 0
phraseChecks 14 bad 0
EXIT=0
```

Its first run failed:

```text
PHRASE_MISS HEAD game/js/plugins/DEUS_Levels.js:1006 |         { id: M_SOIL, key: "soil", solid: true, fluid: false, maxHP: 40, ...
phraseChecks 14 bad 1
EXIT=1
```

The doc was corrected to `DEUS_Levels.js:1005`. The review had the same wrong line, and the doc now says so.

### 6. Sibling tips and ADR-003

These were run in the worktree after `git fetch origin` (EXIT=0). The ancestor and ADR-003 checks ran after this run's first fetch; the tip lines and the §9.7 diff ran after the last fetch, at the time printed:

```text
2026-09-26T10:08:12Z
task/lane-q fd256fc5316adf70e8ba4fb0540014a87ca82fb7 2026-09-26 05:04:23 -0500 deus-claude [claude] SIM.40.01 Fix1 REPORT.md: findings and changes, gate in a temp clone of b   (subject trimmed at 120 characters by cut)
task/lane-w 63b6f20707fbb20cee5d77928aa3128098dce89d 2026-09-26 04:26:33 -0500 deus-grok [grok] SIM.40.10 review bed949e8
$ git merge-base --is-ancestor origin/task/lane-w origin/main
lane-w in main EXIT=0
$ git merge-base --is-ancestor 3b33faa5 origin/main
adr003 merge in main EXIT=0
$ git show origin/main:docs/adr/ADR-003_sim_render_split_and_lod.md > /tmp/adr.md; diff <(git show origin/task/lane-m:docs/adr/ADR-003_sim_render_split_and_lod.md) /tmp/adr.md > /dev/null; echo "lane-m vs main ADR identical EXIT=$?"
lane-m vs main ADR identical EXIT=0
$ ext(){ git show $1:tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md | awk '/^### 9.7 /{f=1} /^## Sparse storage and cost/{f=0} f'; }; diff <(ext 9d5b40d3) <(ext fd256fc5) > /dev/null; echo "section 9.7 identical EXIT=$?"
section 9.7 identical EXIT=0
```

During this run Lane Q's tip went from `9d5b40d3` to `44f868a7` (its Fix 1 brief), then `b2ca032a`, then `fd256fc5`. It will keep moving; the doc tells the reader to read the current tip.

### 7. Write set and base

```text
$ git diff --name-only 8d23c64c278f057c81e6a9a13968819d2cb3c6f7 6ff05cfee2357fe3a5d1e0a481789a65989371e1
tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md
tasks/SIM.40.05/lane-r/trace.json
EXIT=0
$ git diff --stat 84ee3b55f3f8c1b8a16710ccf3878795d98d1683 6ff05cfee2357fe3a5d1e0a481789a65989371e1 -- game/ docs/ tools/ art/
EXIT=0            (empty)
$ git merge-base 6ff05cfee2357fe3a5d1e0a481789a65989371e1 origin/main
84ee3b55f3f8c1b8a16710ccf3878795d98d1683
EXIT=0
```

`git diff --name-status 6613418f 5a0627ae` also lists three files the lane did not write: `BRIEF_FIX1.md`, `review_grok_6613418f.md` and `launches/20260926_044230_prompt.txt`. They came from the PM, Grok and ops commits between the reviewed tip and Fix 1. None of them was edited.

### 8. Commits

Fix 1 commits on `task/lane-r`, in order. Each printed EXIT=0:
- `c3acb0db` decay clock, rebase rule, R-01.6, header
- `27688ca5` item and remains clocks, contract `atYt` and barrier, R-05.4, visitor years
- `a98a9af1` instant keys and two drains, FX-R-01 instants, MR-15/16, layouts
- `49a96d07` acceptance tests, ADR-003 amendments, trace.json
- `5a0627ae` stone line citation, vegetation stand-in, inline `deps`
- `6ff05cfe` Lane Q tip re-sampled
- then the commit that adds this report

## Evidence

- No screenshots: nothing visual was built or claimed (a documents-only lane).
- Counts from `trace.json`, via `node -e`:

```text
{"COVERED":11,"PARTIAL":1} packages 12 ownerQuestions 9
EXIT=0
```

- Requirements by status: COVERED 11 (R-01..R-04, R-06..R-12), PARTIAL 1 (R-05), OWNER_QUESTION 0. Proposed packages: 12 (PROPOSED-R-01..R-12). Owner questions: 9 (OQ-R-01..OQ-R-09, unchanged).
- The last commit before this report is `6ff05cfee2357fe3a5d1e0a481789a65989371e1` (`git rev-parse HEAD`). The final SHA is the commit that adds this report. It is printed as the lane's `FINAL SHA` line after the push, because it cannot be written inside the commit it identifies.

## Not done / known problems

- **R-05 is still PARTIAL.** The collapse contract uses ASSUMED Lane Q names. Fix 1 adds three ASSUMED items that Lane Q's §9.7 does not list yet:
  - `atYt` on collapse events;
  - the instant barrier (a decay-caused cascade settles before the next later-instant decay event);
  - the clock itself (Lane Q's C2 reads Lane R's heap as day-keyed).

  Reconciliation is Lane Q's.
- **Unreconciled Lane W names.** Lane W's merged design assumes `decay.enqueueRemains` in grams (IA-R1). R-03.4 still has Lane W booking `T(BODY→REMAINS)` in mu. This is routed to PROPOSED-R-04 and Lane Q's mass-unit escalation, and is not reconciled here.
- **ADR-003 amendments are proposals only.** R-12.3 proposes changing ADR-003 §17 (L1653, L1694, L1689-1690). ADR-003 is merged on main and still PROPOSED. The Fix 1 brief directs the design's form, but the ADR text itself is unchanged, and its owner and the PM decide.
- **FX-R-01 rests on assumptions.** The S1-S4 instants are exact under R-01.2 plus two ASSUMED Lane Q behaviours:
  - roofs fail at their own HP 0;
  - band rubble spills to the wall foot.

  If Lane Q's support rule breaks a roof earlier, every later instant moves. S5 stays approximate. No implementation or independent oracle exists; the instants come from the writer's scratch calculation.
- **Short-heap budget.** `B_short` = 16 per tick is a design default and is not measured. The short heap is a proposed addition to ADR-003's day-boundary cadence.
- **Unmeasured numbers.** Memory and save figures went up with the clock fields: Y0 about 113 KB, scenario L about 23-25 MB in memory and about 10.9 MB saved. They are arithmetic from the stated assumptions, not measurements. Every rate and duration is still a design default.
- **Scratch scripts.** `calc.js`, `chk_nums.js`, `chk_refs.js` and `chk_r.js` are not committed, per NO CODE. Their raw outputs are pasted above.
- **Stray clone.** The procedural slip in §1 is recorded above.
- **Dependencies on decisions not yet final:** D-4 and D-6 (PM decisions the Owner may overturn), DEC-010 (OPEN) and D-1 (OWNER_OPEN), as before. Durations are given under both D-1 options, and neither is chosen.

## Try it in RMMZ

Not applicable. This lane changes no game file, so there is nothing to run in the editor.

## Decisions needed

- **Owner:** OQ-R-01..OQ-R-09, unchanged by Fix 1. The options are in the doc's "Owner questions" and in `trace.json`.
- **PM and the ADR-003 owner:** whether to adopt the R-12.3 amendments to ADR-003 §17. They cover the decay clock in place of L1653's per-day form, the causing instant for decay-caused exposure changes (L1694), and the short heap (L1689-1690).
- **Coordinator:** whether to adopt PROPOSED-R-01..R-12 and the other R-12.3 recommendations.
- **Lane Q (via the PM):** reconcile `atYt`, the instant barrier and the instant-keyed heap in its §9.7.
