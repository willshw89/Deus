# SIM.40.05 review (Grok) of 6613418ff5539c4156c5f42d589913d479dc0853

Independent review of Lane R (decay cycle design, SIM.40.05 covering SIM.40.05-.08 and the long-run needs of SIM.40.09). The design, `trace.json`, `REPORT.md`, `BRIEF.md`, and `lane.json` were not edited. Checks ran in a fresh temporary clone (`git clone -c core.autocrlf=false` of this worktree, then `git checkout --detach`), never in the live worktree. The clone was deleted after the checks. No art was generated.

## Identity

Worktree, before the clone. Raw:

```text
git rev-parse HEAD origin/task/lane-r
6613418ff5539c4156c5f42d589913d479dc0853
6613418ff5539c4156c5f42d589913d479dc0853
EXIT=0

git log -8 --format="%H %an %s"
6613418ff5539c4156c5f42d589913d479dc0853 deus-claude [claude] SIM.40.05 REPORT.md: commands, exit codes, gate output, counts
3b3a00f2186b4f9f98dcc0d90675b9c7f1e41302 deus-claude [claude] SIM.40.05 trace.json: 12 requirements, 12 proposed packages, 9 Owner questions
cb07a3c1e8162ba1977ad0580844008533bd2f98 deus-claude [claude] SIM.40.05 WIP walls lose height band by band (ADR-003 per-column sky rule); recomputed fixture timelines; consistency fixes
1985c9bfa5c280c219638eb8abdd37823de237cc deus-claude [claude] SIM.40.05 WIP fix citations (full SRD paths, SRD object HP and ooze lines, Anim splice line)
041675bb8de5cff12d0f0326231d8041a6930caf deus-claude [claude] SIM.40.05 WIP design doc part 4: sparse storage and cost, acceptance tests, WBS impact, Owner questions
47cb914f380ae4aa92e823cc3478385463794f5e deus-claude [claude] SIM.40.05 WIP design doc part 3: ruins and re-founding, deep history and LOD, long-run ledger test
1f0851d821e08cf5aa8f07b503606d05c6073758 deus-claude [claude] SIM.40.05 WIP design doc part 2: metals and items, fire residue, collapse contract, reclaiming
71bd7fa6caa8b2e98cbc26d373ebf7e107193d55 deus-claude [claude] SIM.40.05 WIP design doc part 1: conventions, decay drivers, structure stages
EXIT=0
```

HEAD matched `origin/task/lane-r` at `6613418ff5539c4156c5f42d589913d479dc0853`. The review continued.

Clone, then detach. Raw:

```text
git clone -c core.autocrlf=false <worktree> <temp>
EXIT=0

git checkout --detach 6613418ff5539c4156c5f42d589913d479dc0853
HEAD is now at 6613418f [claude] SIM.40.05 REPORT.md: commands, exit codes, gate output, counts
EXIT_CHECKOUT=0

git rev-parse HEAD
6613418ff5539c4156c5f42d589913d479dc0853
EXIT_REVPARSE=0
```

## Scope

`git diff --name-status 84ee3b55f3f8c1b8a16710ccf3878795d98d1683 6613418ff5539c4156c5f42d589913d479dc0853` (tab between status and path). EXIT=0.

```text
A	tasks/SIM.40.05/lane-r/BRIEF.md
A	tasks/SIM.40.05/lane-r/REPORT.md
A	tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md
A	tasks/SIM.40.05/lane-r/lane.json
A	tasks/SIM.40.05/lane-r/launches/20260926_033114_prompt.txt
A	tasks/SIM.40.05/lane-r/launches/20260926_034659_prompt.txt
A	tasks/SIM.40.05/lane-r/trace.json
```

`git diff --name-status 84ee3b55f3f8c1b8a16710ccf3878795d98d1683 6613418ff5539c4156c5f42d589913d479dc0853 -- game tools art docs` printed no paths. EXIT=0.

`git diff --stat 84ee3b55f3f8c1b8a16710ccf3878795d98d1683 HEAD -- game/ docs/ tools/ art/` printed no paths. EXIT=0.

`git diff --name-only --diff-filter=A 84ee3b55f3f8c1b8a16710ccf3878795d98d1683 HEAD -- "*.png" "*.jpg" "*.jpeg" "*.gif" "*.webp" "*.psd" "*.svg"` printed no paths. EXIT=0.

| Path | Diff | Inside `tasks/SIM.40.05/lane-r/**` |
|---|---|---|
| `tasks/SIM.40.05/lane-r/BRIEF.md` | A | yes |
| `tasks/SIM.40.05/lane-r/REPORT.md` | A | yes |
| `tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md` | A | yes |
| `tasks/SIM.40.05/lane-r/lane.json` | A | yes |
| `tasks/SIM.40.05/lane-r/launches/20260926_033114_prompt.txt` | A | yes |
| `tasks/SIM.40.05/lane-r/launches/20260926_034659_prompt.txt` | A | yes |
| `tasks/SIM.40.05/lane-r/trace.json` | A | yes |
| `game/**` | no change | — |
| `tools/**` | no change | — |
| `docs/**` | no change | — |
| `art/**` | no change | — |

No path sits outside `allowedPaths`. No code under `game/**` or `tools/**` was committed. No image, palette, or other art file was committed. Art needs in the design are text lines of the form `art slot needed: <name>, <purpose>`.

`git merge-base HEAD origin/main` printed `84ee3b55f3f8c1b8a16710ccf3878795d98d1683`. EXIT=0. That matches `trace.json` `baseCommit` and the brief's base.

## Gate

`lane.json` `gateTests[0]`, run from the temp clone root. Raw stdout (the `NO_COLOR` warning is this shell's Node, not part of the gate line):

```text
task SIM.40.05 reqs 12 missing none bad none missingHeadings none ownerQuestions 9 mdBytes 118179
(node:26292) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
EXIT_GATE=0
```

That result line matches `REPORT.md` (`task SIM.40.05 reqs 12 missing none bad none missingHeadings none ownerQuestions 9 mdBytes 118179`, `EXIT=0`).

## Report claims that were remeasured

| Claim in REPORT.md | Remeasured | Result |
|---|---|---|
| Gate line and EXIT=0 | same command | matches, EXIT=0 |
| mdBytes 118179 | gate `Buffer.byteLength` | 118179 |
| Requirements COVERED 11, PARTIAL 1 (R-05), OWNER_QUESTION 0 | `trace.json` | `{"COVERED":11,"PARTIAL":1}` |
| Proposed packages 12, Owner questions 9 | `trace.json` | 12 and 9 |
| Merge-base `84ee3b55f3f8c1b8a16710ccf3878795d98d1683` | `git merge-base` | matches, EXIT=0 |
| Empty diff under `game/`, `docs/`, `tools/`, `art/` | `git diff --stat` | empty, EXIT=0 |
| Band years `H1 1397, 2523, 3480, 4293`; `WE 2718, 4977, 6897, 8529`; `H2 62, 95`; `H4 563, 920, 1163, 1328, 1441, 1517, 1569` | piecewise life-table integration (below) | matches those integers |
| Citation check `citations 171 bad 0`, `excerptRows 34` | independent scan of backticked `path:line` citations | 171 citations, 0 missing files or out-of-range lines, 34 excerpt rows |

The band years were recomputed from the life table, not from `rateMilli`. Site abandonment at y11, element `d0` at y13 for masonry (abandon grace 2 sy) and y12 for THATCH, roof fail at d0+life, then each upper band weathers SHELTERED until the band above fails and SKY afterwards. Modifiers: ASHLAR `M_ft = 1.25` at wR 50 and `1.125` at wR 90; MUDBRICK and BRICK `M_ft = 1.5`. That reproduces the report's four series exactly, and it reproduces R-09.3's rounded table (about y1,400, 2,520, 3,480, 4,290). See MAJOR-1: those years are the unquantized lives. They are not what R-01.2's `rateMilli` formula produces.

Calendar cells checked as `sy × DPY × 240` seconds match the R-08.6 table (0.25 sy at DPY 1 is 60 s; 10,000 sy at DPY 1 is 2,400,000 s). The salvage example checks: `50 × 0.65 × 143.6 = 4,667` lb = 74,672 mu; `93 × 800 = 74,400`; remainder 272.

Citation spot check: bare plugin names resolve under `game/js/plugins/`. All 171 citations land on a real line at this commit, and `git diff` shows `game/` and `docs/` unchanged since `84ee3b55f3f8c1b8a16710ccf3878795d98d1683`, so they resolve at the base too. Four excerpt rows store a markdown-escaped `\|`; the source line contains `|`. One excerpt (`DEUS_Levels.js:1007`) uses `...` to skip fields; the line still has `M_WOOD`, `debris: "broken_timber"`, and `fire: 2`. Sampled SRD lines hold the quoted phrases, including `rules.json:7025` (object hit points), `rules.json:7167` (the damage-threshold sentence and the paper/cloth sentence are the same long line), `creatures.json:28402` and `:28734`, and `DEUS_Anim.js:1261` (`list.splice`). `DEUS_Levels.js:1940` is the comment the table quotes; `effectiveSupport` is the function on line 1942, which the finding column already says. Ecology lines 275, 313, 354, 627, 776, and 847 are `isConstructedOrPaved` guards. Limestone is `weatherResistance` 50 at `DEUS_WorldCatalog.json:4721` and `"density": 2.3` at `:4717`. WBS rows cited for SIM.40.05-.09, WG.65.15, WG.65.10, WG.65.02, and SIM.50.05's "permanent ash beds (WG.63.04)" match. `PEOPLES.md:215` does say rotting after 30 days and bone after 120 days.

ADR-003 Rev 3 on `origin/task/lane-m` at `9e0ef94d36ace947ea30426a107e0a80e434f3be` matches the citations that were sampled: L3 still says it stays PROPOSED until the Owner and the PM sign it off; L58 is 1 tick = 36 game-seconds (10 Hz is the parent bullet L57); L950 is the ore-output ban; L1047 is `decay.work_per_tick` ≤ ceil(active / 2,400); L1653 is the HP closed form; L1683 is the buried-mound floor; L1689-L1696 are the day boundary, LOD identity, and day jumps. `3b33faa5b1ce77ce2de52773064d865d017489cb` is an ancestor of `origin/main` (`git merge-base --is-ancestor`, EXIT=0) and is the ADR-003 merge. The same L3 and L1653 are on `origin/main`. The design's note that the merge was reported and not re-read past Lane M is accurate; the file on main still says PROPOSED.

`9103799ecbbd1b389b427c15ddbe7f5c814c806a` contains only `tasks/SIM.40.01/lane-q/BRIEF.md` and `lane.json`. `31892ae7afea6c4bdfaf5102e1e3740c87f603d6` contains only Lane W's brief and `lane.json`. Those two sentences in the design are true of those objects. See MINOR-3 for the tips at the time of this commit.

## Requirements

The 13 required headings are present. `trace.json` has R-01..R-12 in order. R-05 is PARTIAL; the other eleven are COVERED. That PARTIAL is an honest label: the eight-clause collapse contract is written, and the Lane Q names are marked ASSUMED.

Sampled against the brief, these are specified: per-material lives and exposure (rain, freeze-thaw, snow, standing water, burial, fire), maintenance and abandonment, stages S0-S7 through rock with roofs before walls and catalogue slot names only, organics to soil plus an AIR sink, metals to OXIDE with a four-rule ore guard, ash and charcoal with a remainder gas sink, vegetation on abandoned cells only, underground bands across -1..-16, the site machine that sets `isRuined`, trace rules TR-1..TR-8, salvage by mass, re-founding on missing slices, cohort decay, both D-1 mappings with neither option chosen, FX-R-01 to y12,000 with mutants MR-01..MR-14, sparse per-record memory and saves with arithmetic, and AT-R-01..AT-R-22 each naming a mutant. Packages are `PROPOSED-R-01`..`PROPOSED-R-12` with real dependency IDs. OQ-R-01..OQ-R-09 each have options. D-4, D-6, and DEC-010 are flagged. Geometry is 32 layers -16..+15, 5 ft squares, 10 ft layers, 2 ft slices; 1 ft strata are marked as the stale code state. No escalation file is in the commit. The writer does not call the work done.

## Findings

### BLOCKER

None.

### MAJOR

1. **R-01.2's `rateMilli` derivation does not preserve the life table, so AT-R-20 and the published stage years are not what that formula computes.** R-01.2 sets `rateMilli = ceil(1000 × maxHP / (lifeYears × DPY))` and `HP(day) = HP(d0) − floor(rateMilli × (day − d0) / 1000)`. Strata HP is a byte (`hp0 u8` in R-10.2; five HP bytes in the changed-cell record, `DEUS_Levels.js:997`). The cited stone material is `maxHP: 120` (`DEUS_Levels.js:1006`). `rateMilli` is an integer, and a decaying element has `rateMilli ≥ 1`, so the latest fail day is `1000 × maxHP`. At DPY = 20 that is 6,000 sy when maxHP is 120, and 12,750 sy even at the byte cap of 255. The life table goes past both (ASHLAR SHELTERED 20,000 sy, SILVER SKY 30,000 sy, and the fixture's own sheltered life of about 8,889 sy at wR 50).

   Worked with the cited stone `maxHP` 120:

   | Life | DPY | rateMilli | Fail (sy) | Life table (sy) |
   |---|---|---|---|---|
   | ASHLAR SHELTERED 20,000 | 1 | 6 | 20,000 | 20,000 |
   | ASHLAR SHELTERED 20,000 | 20 | 1 | 6,000 | 20,000 |
   | H1 top-band SKY, about 1,333.333 | 1 | 91 | 1,319 | 1,333.333 |
   | H1 top-band SKY, about 1,333.333 | 20 | 5 | 1,200 | 1,333.333 |
   | H1 SHELTERED, about 8,888.889 | 1 | 14 | 8,572 | 8,888.889 |
   | H1 SHELTERED, about 8,888.889 | 20 | 1 | 6,000 | 8,888.889 |
   | TIMBER roof 60 | 1 and 20 | 2000 and 100 | 60 | 60 |

   Short lives (the timber roof) round-trip. Multi-millennium lives do not, and DPY 1 and DPY 20 do not agree. R-09.1 and AT-R-20 require FX-R-01 at DPY 1 and DPY 20 to give identical stage years. R-09.3's expected years, and the report's band arithmetic, follow the unquantized lives (the integers above match that model). A faithful implementation of the `rateMilli` line will miss those years and fail AT-R-20 on H1. The due day has to be the integer day counted from `lifeYears × DPY` (the rate formula can stay only where it inverts exactly), and the oracle has to use that same day. Until that is true, SIM.40.09 cannot implement the long-run test as written.

### MINOR

1. **R-07.3 attributes the limestone visitor years to the R-01.6 worked example.** The visitor table says the top band fell near year 1,400 and S4 begins about year 4,300, "from R-01.6". Those figures match the wR 50 fixture (exact fails 1,397 and 4,293). R-01.6's worked example is ASHLAR at wR 90 and fails near years 2,718, 4,977, 6,897, and 8,529, which R-02.4 repeats as about 2,700 and 8,500. R-09.3 states the wR 50 scaling and is the table the oracle should follow. The visitor sentence points at the other example.

2. **Sub-day lives have no key in an integer day heap.** R-08.5 runs decay at game-day boundaries and keys the heap by integer `nextDay`. FOOD lives include 0.1 and 0.05 sy, and a SKY corpse goes skeletal in 0.25 sy. R-08.6 maps 0.25 sy at DPY 1 to 0.25 game day (60 real seconds). An integer day key cannot place that event. Year-scale checkpoints in FX-R-01 still land, because the next checkpoint is y5. The remains and food clocks need a tick or fractional-day due time, which the member and remains layouts do not give them.

3. **The Lane Q and Lane W tips printed in the design were already behind at this commit.** `9103799e` and `31892ae7` are real, and each really holds only a brief. This commit is `2026-09-26 04:18:22 -0500`. By then `origin/task/lane-q` had design commits, including the decay-driven collapse section `940355a25ddada14729f0a6e311cadc51cd130c7` (04:09:13) and the mass-ledger section `88ffa615f4d0d7a9596a679636ce820d43eff373` (04:14:07). `origin/task/lane-w` had `bed949e839c4b9a06d467a6f36be50891fd70be5` (04:08:11). R-05 is correctly PARTIAL and the names are marked ASSUMED, and section 0.2 already says the mass unit is an assumption that scales by one constant and is owned by SIM.40.01 with WG.65.15. The printed SHAs still tell a reader that those branches had no design. Lane Q's later tip `9d5b40d32f96a38803b1f32f78287a902d2bead8` (after this commit) reads this tip and records the mass-unit, form-name, and event-name differences in its own §9.7. That reconciliation is Lane Q's, and it is unreviewed here.

4. **An exposure change says "reschedule" and does not assign the new closed-form baseline.** The band years require: on the day a band becomes SKY or BURIED, set `hp0` to HP at that day, set `d0` to that day, and recompute the rate for the new exposure. R-05.4 and R-10.4 say the member is split and rescheduled. The stored fields are `hp0`, `d0`, and `rateMilli`. The assignment itself is not written. Without it, continuing the original `d0` at the new rate does not produce the piecewise years in R-01.6 and R-09.3.

## Art and code

No art was generated, requested, or integrated for this review. The commit contains no art files. The commit contains no files under `game/**` or `tools/**`.

VERDICT: FAIL
