# SIM.40.05 review (Grok) of 9a2908fbe7741d22cacf2fe18b84ecb4c272526d

Independent Fix 1 re-review of Lane R after VERDICT FAIL on `6613418ff5539c4156c5f42d589913d479dc0853` (`tasks/SIM.40.05/lane-r/review_grok_6613418f.md`: 0 BLOCKER, 1 MAJOR, 4 MINOR). The brief for this pass is `tasks/SIM.40.05/lane-r/BRIEF_FIX1.md`. The design, `trace.json`, `REPORT.md`, `BRIEF.md`, `BRIEF_FIX1.md`, and `lane.json` were not edited. Checks ran in a fresh temporary clone (`git clone -c core.autocrlf=false` of this worktree, then `git checkout --detach`), never in the live worktree. The clone was deleted after the checks. No art was generated.

## Identity

Worktree, before the clone. Raw:

```text
git rev-parse HEAD
9a2908fbe7741d22cacf2fe18b84ecb4c272526d
EXIT=0

git rev-parse origin/task/lane-r
9a2908fbe7741d22cacf2fe18b84ecb4c272526d
EXIT=0

git log -8 --format="%H %an %s"
9a2908fbe7741d22cacf2fe18b84ecb4c272526d deus-claude [claude] SIM.40.05 Fix1 REPORT.md: findings and changes, gate in a temp clone of 6ff05cfe, checks and counts
6ff05cfee2357fe3a5d1e0a481789a65989371e1 deus-claude [claude] SIM.40.05 Fix1 re-sample Lane Q tip (fd256fc5) in the header; section 9.7 unchanged
5a0627aec679f0ec443c1d474d65fd4a80bc28cc deus-claude [claude] SIM.40.05 Fix1 stone maxHP cited at DEUS_Levels.js:1005; deterministic vegetation stand-in; trace deps kept inline
49a96d079812d34afb83694197176eda8b4a0439 deus-claude [claude] SIM.40.05 Fix1 WIP acceptance tests, ADR-003 amendments and disagreements, Not checked; trace.json notes, packages and fix1 block
a98a9af133587245ec979143397ea6aaf772eb9d deus-claude [claude] SIM.40.05 Fix1 WIP instant keys and two drains (R-08.5), exact FX-R-01 instants, MR-15/MR-16, record layouts and memory/save arithmetic
27688ca573777f0fc15b0da1038a90c8476c4c8b deus-claude [claude] SIM.40.05 Fix1 WIP items/remains clocks, collapse contract atYt and instant barrier, explicit rebase in R-05.4, visitor years cite wR 50 fixture
c3acb0db8e7a5b540c49552f9ba980f75ac6b9ad deus-claude [claude] SIM.40.05 Fix1 WIP decay clock replaces per-day rateMilli (R-01.2), rebase rule, R-01.6 example recomputed, header and sibling tips
8d23c64c278f057c81e6a9a13968819d2cb3c6f7 snewt [ops] SIM.40.05 lane-r launch prompt 20260926_044230
EXIT=0
```

HEAD matched `origin/task/lane-r` at `9a2908fbe7741d22cacf2fe18b84ecb4c272526d`. The review continued.

Clone, then detach. Raw:

```text
git clone -c core.autocrlf=false <worktree> <temp>
EXIT_CLONE=0

git checkout --detach 9a2908fbe7741d22cacf2fe18b84ecb4c272526d
HEAD is now at 9a2908fb [claude] SIM.40.05 Fix1 REPORT.md: findings and changes, gate in a temp clone of 6ff05cfe, checks and counts
EXIT_CHECKOUT=0

git rev-parse HEAD
9a2908fbe7741d22cacf2fe18b84ecb4c272526d
EXIT_REVPARSE=0
```

`git diff b2cc93610b7478b407eb05944f433ac8fcd9424e HEAD -- tasks/SIM.40.05/lane-r/review_grok_6613418f.md` printed nothing. EXIT_DIFF_REVIEW=0. That file's only commit is `b2cc93610b7478b407eb05944f433ac8fcd9424e`. The prior review was left untouched.

`git diff --name-only 6ff05cfee2357fe3a5d1e0a481789a65989371e1 9a2908fbe7741d22cacf2fe18b84ecb4c272526d` printed only `tasks/SIM.40.05/lane-r/REPORT.md`. EXIT=0. The design document at this tip is the blob reviewed under the gate below.

## Scope

`git diff --name-status 84ee3b55f3f8c1b8a16710ccf3878795d98d1683 9a2908fbe7741d22cacf2fe18b84ecb4c272526d` (tab between status and path). EXIT_DIFF=0.

```text
A	tasks/SIM.40.05/lane-r/BRIEF.md
A	tasks/SIM.40.05/lane-r/BRIEF_FIX1.md
A	tasks/SIM.40.05/lane-r/REPORT.md
A	tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md
A	tasks/SIM.40.05/lane-r/lane.json
A	tasks/SIM.40.05/lane-r/launches/20260926_033114_prompt.txt
A	tasks/SIM.40.05/lane-r/launches/20260926_034659_prompt.txt
A	tasks/SIM.40.05/lane-r/launches/20260926_044230_prompt.txt
A	tasks/SIM.40.05/lane-r/review_grok_6613418f.md
A	tasks/SIM.40.05/lane-r/trace.json
```

`git diff --name-status 84ee3b55f3f8c1b8a16710ccf3878795d98d1683 9a2908fbe7741d22cacf2fe18b84ecb4c272526d -- game tools art docs` printed no paths. EXIT_FORBIDDEN=0.

`git diff --stat 84ee3b55f3f8c1b8a16710ccf3878795d98d1683 HEAD -- game/ docs/ tools/ art/` printed no paths. EXIT_DIFF_STAT=0.

`git diff --name-only --diff-filter=A 84ee3b55f3f8c1b8a16710ccf3878795d98d1683 HEAD -- "*.png" "*.jpg" "*.jpeg" "*.gif" "*.webp" "*.psd" "*.svg"` printed no paths. EXIT_ART=0.

| Path | Diff | Inside `tasks/SIM.40.05/lane-r/**` |
|---|---|---|
| `tasks/SIM.40.05/lane-r/BRIEF.md` | A | yes |
| `tasks/SIM.40.05/lane-r/BRIEF_FIX1.md` | A | yes |
| `tasks/SIM.40.05/lane-r/REPORT.md` | A | yes |
| `tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md` | A | yes |
| `tasks/SIM.40.05/lane-r/lane.json` | A | yes |
| `tasks/SIM.40.05/lane-r/launches/20260926_033114_prompt.txt` | A | yes |
| `tasks/SIM.40.05/lane-r/launches/20260926_034659_prompt.txt` | A | yes |
| `tasks/SIM.40.05/lane-r/launches/20260926_044230_prompt.txt` | A | yes |
| `tasks/SIM.40.05/lane-r/review_grok_6613418f.md` | A | yes |
| `tasks/SIM.40.05/lane-r/trace.json` | A | yes |
| `game/**` | no change | — |
| `tools/**` | no change | — |
| `docs/**` | no change | — |
| `art/**` | no change | — |

No path sits outside `allowedPaths`. No code under `game/**` or `tools/**` was committed. No image or other art file was committed. There is no `escalation.md` and no `evidence/` directory in the commit. Art needs in the design are text lines of the form `art slot needed: <name>, <purpose>`.

`git merge-base HEAD origin/main` printed `84ee3b55f3f8c1b8a16710ccf3878795d98d1683`. EXIT_MERGEBASE=0. That matches `trace.json` `baseCommit`.

`git diff --name-only 8d23c64c278f057c81e6a9a13968819d2cb3c6f7 6ff05cfee2357fe3a5d1e0a481789a65989371e1` printed the design document and `trace.json` only. EXIT=0. That matches the report's write-set claim for the commits before the report.

## Gate

`lane.json` `gateTests[0]`, spawned from the temp clone root with `cmd` and `args` as stored. Raw:

```text
task SIM.40.05 reqs 12 missing none bad none missingHeadings none ownerQuestions 9 mdBytes 151534
(node:22356) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
EXIT_GATE=0
```

The result line matches `REPORT.md` (`mdBytes 151534`, `EXIT_GATE=0`), which recorded the gate at `6ff05cfe`. Re-running it at `9a2908fbe7741d22cacf2fe18b84ecb4c272526d` gives the same line, which is what the report asked the reviewer to do. The `NO_COLOR` warning is this shell's Node.

## Prior FAIL, remeasured

The prior MAJOR was that `rateMilli = ceil(1000 × maxHP / (lifeYears × DPY))` with a byte of HP cannot hold the life table and disagrees between DPY 1 and DPY 20. Fix 1 retires that formula. R-01.2 stores a decay clock (`t0` in year-ticks, `rem0` in millionths, `lifeYt`) and schedules `failYt = t0 + ceilDiv(rem0 × lifeYt, R)` with `R = 1,000,000`. DPY is absent from `rem`, `cross`, and `failYt`. The HP byte is `ceilDiv(maxHP × rem, R)` and is not read back as the schedule. `lifeYt` is a u32 (about 1.79 million sy). A 20,000 sy ASHLAR SHELTERED life with no modifier is `lifeYt = 48,000,000`, and `failYt` from `rem0 = R` at `t0 = 0` is 48,000,000 yt at either DPY. That is the AT-R-01 long-life case. `(lifeYt × R)` at the u32 cap is 4,294,967,295,000,000, which is under 2^53.

An independent BigInt implementation of that closed form and of the rebase rule (`rem0 ← rem(t1)`, `t0 ← t1`, `lifeYt ←` the new life, `t1` = the causing instant) reproduced the printed instants. Masonry and TIMBER clocks start at y13 (`t0 = 31,200`); THATCH and LIGHTWOOD at y12 (`t0 = 28,800`). Raw band rows (rebase yt, rem0, fail yt, year):

```text
R-01.6 ASHLAR wR 90, roof fail 144000
[[1,"144000","996626","6522407","2717.670"],[2,"6522407","847132","11944052","4976.688"],[3,"11944052","720062","16552449","6896.854"],[4,"16552449","612052","20469582","8528.993"]]
H1 wR 50, roof fail 175200
[[1,"175200","993251","3353604","1397.335"],[2,"3353604","844263","6055246","2523.019"],[3,"6055246","717623","8351640","3479.850"],[4,"8351640","609980","10303576","4293.157"]]
H2, roof fail 57600, wall t0 31200
[[1,"57600","958750","149640","62.350"],[2,"149640","814938","227875","94.948"]]
H4, roof fail 88800, wall t0 31200
[[1,"88800","985600","1350368","562.653"],[2,"1350368","670208","2208235","920.098"],[3,"2208235","455742","2791585","1163.160"],[4,"2791585","309904","3188263","1328.443"],[5,"3188263","210735","3458004","1440.835"],[6,"3458004","143299","3641427","1517.261"],[7,"3641427","97444","3766156","1569.232"]]
```

Those integers and the three-decimal years are the figures in R-01.6, R-02.4, and R-09.3, including the worked H1 first band (`lost 6,749`, `rem0 993,251`, `add 3,178,404`, `fail 3,353,604`). H1's sheltered remainder at y1,000 is 888,963, as the report states. The same implementation of MR-15 (per-day `rateMilli`, maxHP 120, piecewise rebase on the fail day) and MR-16 (rebase at the processing-day boundary) produced:

```text
MR15 DPY 1 rates 14 90 2000 roofYear 73 bands 1407, 2530, 3475, 4275
MR15 DPY 20 rates 1 5 100 roofYear 73 bands 1263, 2213, 2973, 3583
MR16 DPY 1 band2 fail 6056602
MR16 DPY 20 band2 fail 6055276
```

Those are the counterexample years in R-01.2 and the mutant instants in AT-R-20 and R-09.4. The life-table clock and the rejected per-day schedule are now different numbers, and the oracle is specified as the clock.

R-09.1 states the remaining DPY difference in the open: H1's first band, instant 3,353,604 yt, is drained at day 1,398 (calendar year 1,398) when DPY is 1, and at day 27,947 (calendar year 1,397) when DPY is 20. Both runs include it at the y1,398 checkpoint and neither at y1,397. Recomputed: `ceilDiv(3353604 × DPY, 2400)` is 1398 and 27947; `3353604 ≤ 2400 × 1397` is false; `3353604 ≤ 2400 × 1398` is true. The checkpoint identity `ceilDiv(dueYt × DPY, 2400) ≤ Y × DPY` iff `dueYt ≤ 2400 × Y` held for DPY 1, 20, and 336 at the year boundaries that were tried (0 mismatches). AT-R-20 compares instants and whole-year checkpoint state. That is the closure the Fix 1 brief asked for: a closed form both runs share, with the day-keyed long heap called out as intentional.

The four prior MINORs are closed in the same document:

| Prior finding | Where it stands at this tip |
|---|---|
| MINOR-1, visitor years cited R-01.6 | R-07.3 cites FX-R-01's H1 timeline at wR 50 (R-09.3), counted from abandonment at y11, and says R-01.6 (wR 90, years 2,718 and 8,529) is the other example. Offsets match the instants: roof fail y73 is 62 years after y11; top band 1,397.335 is about 1,386 years after; S4 at 4,293.157 is about 4,282 years after. |
| MINOR-2, integer `nextDay` cannot place sub-day lives | R-08.5 keys every record by `dueYt`. The short heap (remains and FOOD) drains every tick when `dueYt × DPY ≤ tick`. The long heap stays on the day boundary on purpose. AT-R-08: at DPY 1 a SKY death at tick `k` is SKELETAL at `k + 600` and a sky loaf rots at `k + 240`; at DPY 20 those deltas are 12,000 and 4,800. `0.25 × 2400 = 600` and `0.1 × 2400 = 240`. |
| MINOR-3, stale Lane Q and Lane W tips | The header Limits row, the R-05 intro, and "Not checked" name `fd256fc5316adf70e8ba4fb0540014a87ca82fb7` and `63b6f20707fbb20cee5d77928aa3128098dce89d`, tell the reader to read the current tips, and leave R-05 PARTIAL. No Q or W design was copied. |
| MINOR-4, exposure change did not assign the baseline | R-01.2 writes the four-step rebase, with `t1` equal to the causing `dueYt` for a decay cause. R-05.4 step 3 repeats the assignment for the wall top at the roof's `failYt`. The band tables above are that assignment. |

Sibling claims that were rechecked from objects already in the repo (no fetch):

```text
git log -1 --format="%H %s" fd256fc5316adf70e8ba4fb0540014a87ca82fb7
fd256fc5316adf70e8ba4fb0540014a87ca82fb7 [claude] SIM.40.01 Fix1 REPORT.md: findings and changes, gate in a temp clone of b2ca032a, checker controls
EXIT_Q=0

git log -1 --format="%H %s" 63b6f20707fbb20cee5d77928aa3128098dce89d
63b6f20707fbb20cee5d77928aa3128098dce89d [grok] SIM.40.10 review bed949e8
EXIT_W=0

section 9.7 at 9d5b40d32f96a38803b1f32f78287a902d2bead8 vs fd256fc5316adf70e8ba4fb0540014a87ca82fb7
bytes 6032 6032 identical true

git rev-parse origin/task/lane-q
fd256fc5316adf70e8ba4fb0540014a87ca82fb7
EXIT_Q=0

git rev-parse origin/task/lane-w
63b6f20707fbb20cee5d77928aa3128098dce89d
EXIT_W=0

git merge-base --is-ancestor bed949e839c4b9a06d467a6f36be50891fd70be5 8997e238a97c7a4a2405d5e7249f587b4d8b298d
EXIT_W_ANCESTOR=0

git merge-base --is-ancestor 8997e238a97c7a4a2405d5e7249f587b4d8b298d origin/main
EXIT_W_MERGE_ANC=0

git diff --stat 9e0ef94d36ace947ea30426a107e0a80e434f3be:docs/adr/ADR-003_sim_render_split_and_lod.md origin/main:docs/adr/ADR-003_sim_render_split_and_lod.md
(empty)
EXIT_ADR_DIFF=0

git merge-base --is-ancestor 3b33faa5b1ce77ce2de52773064d865d017489cb origin/main
EXIT_ADR_ANC=0
```

`origin/main` at this check is `be11aaf69953592618cade751ea23f986e3a68e3`. ADR-003 there is byte-identical to the Lane M tip, and L3 still says the ADR stays PROPOSED. Sampled ADR lines L58, L1047, L1653, L1659, L1683, L1689, L1690, and L1694 match the phrases the design cites. Lane Q C2 at `9d5b40d3` line 505 still generalises `failDay` into a `nextBandDay` heap. Lane W IA-R1 at `8997e238` line 277 is `decay.enqueueRemains(ref, {organicG, boneG}, cell, cause)`. `9103799e` contains only Lane Q's `BRIEF.md` and `lane.json`. `31892ae7` contains only Lane W's `BRIEF.md` and `lane.json`. R-12.4 records that Lane Q's §9.7 predates this clock, and the report leaves `atYt`, the instant barrier, and the clock as Lane Q's reconciliation. That PARTIAL is still an honest label.

`DEUS_Levels.js:1005` is stone `maxHP: 120`. Line 1006 is soil. The design's correction of the prior review's line number is right. Limestone `weatherResistance` is at `DEUS_WorldCatalog.json:4721`, `"density": 2.3` at `:4717`, elm `rotResistance` at `:4680`. `DEUS_Core.js:324` is the `year++` line.

A scan of backticked `path:line` citations in the design, including `origin/...:path:line` and `<sha>:path:line`, found 181 citation occurrences, 130 unique targets, 0 missing files and 0 out-of-range lines. EXIT_CITE=0. `game/` and `docs/` are unchanged since `84ee3b55f3f8c1b8a16710ccf3878795d98d1683`, so those targets resolve at the base as well.

## Report claims that were remeasured

| Claim in REPORT.md | Remeasured | Result |
|---|---|---|
| Gate line and EXIT_GATE=0 at the Fix 1 design | same command at `9a2908fb` | matches, EXIT_GATE=0, mdBytes 151534 |
| Requirements COVERED 11, PARTIAL 1 (R-05) | `trace.json` | `{"COVERED":11,"PARTIAL":1}` |
| Proposed packages 12, Owner questions 9 | `trace.json` | 12 and 9 |
| Design and `trace.json` only, between `8d23c64` and `6ff05cfe` | `git diff --name-only` | those two paths, EXIT=0 |
| Empty diff under `game/`, `docs/`, `tools/`, `art/` | `git diff --stat` | empty, EXIT=0 |
| Merge-base `84ee3b55f3f8c1b8a16710ccf3878795d98d1683` | `git merge-base` | matches, EXIT=0 |
| H1 / H2 / H4 / R-01.6 instants | closed form above | each printed fail yt matches |
| MR-15 years and MR-16 second-band yt | same models | match AT-R-20 |
| Scenario Y0 about 113 KB; scenario L about 23-25 MB; save about 10.9 MB | the stated products | 112,600 B; 22.782 MB at the low residue figure (the 5.1 MB residue upper bound reaches about 25.2 MB); save 10.921 MB |
| Salvage 4,667 lb, 74,672 mu, 93 stones, remainder 272 | `50 × 0.65 × 143.6` and `93 × 800` | matches |
| §9.7 identical at `9d5b40d3` and `fd256fc5` | extracted text | identical, 6,032 bytes each |
| Prior review file not edited | `git diff` from `b2cc9361` | empty, EXIT=0 |

`trace.json` has R-01..R-12 in order. Status strings are unchanged from the reviewed tip: R-05 PARTIAL, the other eleven COVERED. Packages stay `PROPOSED-R-01`..`PROPOSED-R-12`. Owner questions stay OQ-R-01..OQ-R-09. The thirteen required headings are present. The `fix1` block names the prior review, the brief, and one line per finding.

## Requirements

Sampled against the original brief, the sections that were already specified are still specified: per-material lives and exposure, maintenance and abandonment, stages S0-S7, organics to soil plus an AIR sink, metals to OXIDE with the ore guard, ash and charcoal, vegetation on abandoned cells, underground bands, the site machine that sets `isRuined`, trace rules TR-1..TR-8, salvage by mass, re-founding, cohort decay, both D-1 mappings with neither option chosen, FX-R-01 to y12,000, sparse layouts, and AT-R-01..AT-R-22. Fix 1 adds MR-15 and MR-16, the short heap, and the instant barrier. D-4, D-6, and DEC-010 stay flagged. The writer does not call the work done. The report's "Not done" list matches the document: R-05 remains PARTIAL, Lane W's grams hand-off is unresolved here, ADR-003 amendments are proposals, S5 stays approximate, and the memory figures are arithmetic.

## Findings

### BLOCKER

None.

### MAJOR

None. The prior MAJOR (R-01.2 `rateMilli` versus the life table, and DPY 1 versus DPY 20) is closed by the decay clock, the shared oracle instants, and the checkpoint identity above.

### MINOR

1. **Cave fungus is outside the closed form that Fix 1 made the schedule.** R-01.2 defines `life = lifeYears / (M_ft × M_root × M_fire)` and `lifeYt = ceilDiv(lifeYears × 2,400 × fieldNum × 512, fieldDen × ft8 × root8 × fire8)`. The constant 512 is 8³ for those three eighths factors. A rebase runs when the exposure class or a quantized R-01.5 modifier changes, and R-01.5 lists freeze-thaw, roots, and fire. R-05.5 and R-06.4 set `M_fungus = 2` and halve TIMBER and LIGHTWOOD lives in CAVE where fungus is present. Fungus spreads onto a member after the clock has started. AT-R-12 requires that halving. The published FX-R-01 band instants do not use those props, and the H1–H4 figures above stand without it. A clock implemented from R-01.2 alone keeps the unhalved CAVE life and has no rebase step when fungus arrives.

## Art and code

No art was generated, requested, or integrated for this review. The commit contains no art files. The commit contains no files under `game/**` or `tools/**`.

VERDICT: PASS
