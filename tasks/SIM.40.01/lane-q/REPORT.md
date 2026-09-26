# REPORT: lane-q, SIM.40.01 structure, material and support/collapse design (docs only)

| | |
|---|---|
| Writer | Claude (lane-q). The original design was written in PM relaunch #1 (tip `9d5b40d3`). This file now also covers **Fix 1**, written after the Grok review of that tip returned VERDICT FAIL (0 BLOCKER, 1 MAJOR, 5 MINOR), under `tasks/SIM.40.01/lane-q/BRIEF_FIX1.md` |
| Branch | `task/lane-q`, base `84ee3b55f3f8c1b8a16710ccf3878795d98d1683` |
| Review | Fix 1 is not reviewed. Grok reviews independently; nothing here certifies the work. `review_grok_9d5b40d3.md` was not edited (its diff from `77a80a85` is empty, below) |
| Art | None generated, drawn, requested or integrated (DEC-007). The design names catalogue slots as text only |
| Code | None. No script, test or code file is committed. Three ad-hoc checkers were run from the temp folder (`%TEMP%\laneq\cite_check.js`, `bare_check.js`, and for Fix 1 `num_check.js`) and are not in the repo |

## Fix 1 (after the Grok review of `9d5b40d3`)

### What changed

Only `tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md` and `tasks/SIM.40.01/lane-q/trace.json` (commit `b2ca032a1ccc5af226be11095766f436f5db2a34`), and this REPORT. Nothing was escalated: every finding was fixed in the document. `escalation.md` is unchanged (the mass-unit question in it is separate from this review).

| Finding | What changed (file, section) |
|---|---|
| **MAJOR-1** fall distance defined twice (§6.2 air gap 18 ft vs T10 foot drop 20 ft) | Design §6.2 step 3 now states one rule: a falling thing falls as far as its lowest surface drops, to the top surface of `landing`, read before the collapse deposits anything. It gives `dropTop = e1 − landing` (the drop of the member's top surface: what a unit standing on it falls) and `dropGap = e0 − (landing + 1)` (the air gap under the member: what its own debris falls). **Unit fall damage uses `dropTop` and no other length**; `dropGap` feeds only the debris addition. §6.5: `ft = 2 × dropTop`, dice `min(20, floor(dropTop / 5))`, one layer = 10 ft = 1d6, a worked table for falls from S0 of z+1, z+2, z+3 (1d6, 2d6, 3d6) and the cap; the debris addition is written as `min(20, 5 + max(0, floor(dropGap / 5) − 1))` dice; objects that fall use the same `dropTop`. §7.3 labels its 8 ft roof fall as `dropGap`; §8.6 item 4 and §8.7 use the same rule; §11.1 row 6 (`collapse:impact`) gains `kind` and `ft` so a test can read the length and dice. **T10** now has three falling units (floors at S0 of +1, +2, +3 over open air to the ground on the natural S0 of layer 0): pass is `ft` 10, 20, 30 and dice 1, 2, 3; the vault case keeps 5d6 (its `dropGap` is 8 ft, which adds nothing). T10's mutants now attack the rule: (a) the unit's fall measured as `dropGap` (0, 1, 2 dice), (b) a 1 ft stratum height (0, 1, 1 dice), (c) burial not applied. SRD dice are unchanged (1d6 per 10 ft, 20d6 cap, `rules.json:4390`). §12.3 fixture list and `trace.json` (Q-05 notes, PROPOSED-Q-07 test, OQ-Q-08 option (a) wording) follow |
| **MINOR-1** `conjured_stone` 382 vs 0.10 × granite | §2.5 row 30: 389 kg (0.10 × 3,894 = 389.4), fill explained as 6 in of a 5 ft cell; T16 source 10 × 10 × 389 = 38,900 kg |
| **MINOR-2** `timber_roof` 138 vs 60 kg/m² × 2.322576 m² | §2.5 row 26: 139 (139.35). **Also fixed, not in the review:** row 22 `timber_floor` printed 120 but 52 × 2.322576 = 120.77, which rounds to 121 like every other row; now 121. §2.3 now states one rounding rule for §2.3-§2.5 (nearest integer kg, halves up, once; derived rows multiply the source's integer kg); a new §2.5 bullet shows the worked roundings. Nothing else used 120 as a kg value |
| **MINOR-3** floating ice `3.5 × h²` printed 13,020 / 52,080 | §4.3 and the §2.3 ice row: `P = floor(7 × h² / 2)` kg (Gold's 3.5 × h² truncated), h = 61 whole cm per stratum: 13,023 kg (3.5 × 3,721 = 13,023.5) and 52,094 kg (3.5 × 14,884) |
| **MINOR-4** lava 3 du × 2,738 = 2 × 4,107, but basalt is 4,106 | §9.1: lava-born basalt is id 33 with its one `kgPerVoxel`, 4,106. Since 4,106 = 2 × 2,053 and 2,053 is prime, whole du convert exactly only at a multiple of 2,053 kg per du, so the proposal is 2 du of 2,053 kg per basalt voxel; one du is 1/7 of a 10 ft cell-layer (`DEUS_Fluid.js:50`, `DEPTH_MAX = 7`), so this is about 2.03 t/m³, marked **extrapolated**. An odd last du becomes 2,053 kg of basalt-lineage loose rubble. §9.2 row 18 and `trace.json` Q-08 notes follow |
| **MINOR-5** WBS Rev 25 cited at `:3` | §0.1: `docs/worldgen/DEUS_WORLDGEN_WBS.md` Rev 25 (`:4`) |

The design's header table gains a "Revision" row listing these sections.

### How I tested it (Fix 1)

Every command ran in the foreground (Git Bash). Output is pasted raw.

**Numeric checker.** `num_check.js` (temp folder, not committed) recomputes every kg/voxel of §2.3-§2.5 with the one rounding rule and checks the document prints each number in the right table row; it checks the T16 source, the §4.4 tower load, the floating-ice numbers, the lava ratio against the basalt row, the WBS citation, parses the three §6.5 fall rows and checks `dropTop`, ft, dice and `dropGap` against the formula, checks the T10 pass values and mutant values, and fails on the stale strings (`382`, `38,200`, `13,020`, `52,080`, `4,107`, the old `h` formula, "strata fallen", the old T10 mutant). Run in the worktree before the commit, then in the clone below.

**Commit and push:**

```text
$ git add tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md tasks/SIM.40.01/lane-q/trace.json && git commit ...
EXIT=0
$ git rev-parse HEAD
b2ca032a1ccc5af226be11095766f436f5db2a34
EXIT=0
$ git push origin task/lane-q
To https://github.com/willshw89/Deus.git
   44f868a7..b2ca032a  task/lane-q -> task/lane-q
EXIT=0
$ git rev-parse HEAD origin/task/lane-q
b2ca032a1ccc5af226be11095766f436f5db2a34
b2ca032a1ccc5af226be11095766f436f5db2a34
EXIT=0
```

**Gate in a fresh temp clone of the Fix 1 tip** (`%TEMP%\laneq\gateclone_fix1`, cloned from this worktree; the worktree was not edited while it ran):

```text
$ git clone -q -c core.autocrlf=false /c/Users/snewt/.deus_worktrees/lane-q gateclone_fix1
CLONE_EXIT=0
$ git checkout -q --detach b2ca032a1ccc5af226be11095766f436f5db2a34
CHECKOUT_EXIT=0
$ git rev-parse HEAD
b2ca032a1ccc5af226be11095766f436f5db2a34
REVPARSE_EXIT=0
$ node -e "<lane.json gateTests[0].args[1]>"
task SIM.40.01 reqs 12 missing none bad none missingHeadings none ownerQuestions 14 mdBytes 131242
GATE_EXIT=0
```

Same clone, other checks:

```text
$ git diff --name-status 9d5b40d3 HEAD
A | tasks/SIM.40.01/lane-q/BRIEF_FIX1.md
M | tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md
A | tasks/SIM.40.01/lane-q/launches/20260926_045201_prompt.txt
A | tasks/SIM.40.01/lane-q/review_grok_9d5b40d3.md
M | tasks/SIM.40.01/lane-q/trace.json
EXIT=0
$ git diff --name-status 84ee3b55 HEAD
A | tasks/SIM.40.01/lane-q/BRIEF.md
A | tasks/SIM.40.01/lane-q/BRIEF_FIX1.md
A | tasks/SIM.40.01/lane-q/REPORT.md
A | tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md
A | tasks/SIM.40.01/lane-q/escalation.md
A | tasks/SIM.40.01/lane-q/lane.json
A | tasks/SIM.40.01/lane-q/launches/20260926_032106_prompt.txt
A | tasks/SIM.40.01/lane-q/launches/20260926_034605_prompt.txt
A | tasks/SIM.40.01/lane-q/launches/20260926_045201_prompt.txt
A | tasks/SIM.40.01/lane-q/review_grok_9d5b40d3.md
A | tasks/SIM.40.01/lane-q/trace.json
EXIT=0
$ git diff --stat 77a80a85 HEAD -- tasks/SIM.40.01/lane-q/review_grok_9d5b40d3.md
EXIT=0
$ node num_check.js <doc>
lava 2 du x 2053 = 4106 vs 1 x 4106 = 4106 ok
drop from S0 of +1: foot 10 ft -> 1d6; air gap 8 ft -> 0d6; 1-ft strata 5 ft -> 0d6
drop from S0 of +2: foot 20 ft -> 2d6; air gap 18 ft -> 1d6; 1-ft strata 10 ft -> 1d6
drop from S0 of +3: foot 30 ft -> 3d6; air gap 28 ft -> 2d6; 1-ft strata 15 ft -> 1d6
fall row ok: z+1 5 10 1d6 gap 4
fall row ok: z+2 10 20 2d6 gap 9
fall row ok: z+3 15 30 3d6 gap 14
rounding: timber_floor 120.77395200000001 timber_roof 139.35456000000002 thatch 95.225616 conjured 389.40000000000003
checks 57 bad 0
EXIT=0
$ node num_check.js <9d5b40d3 doc>   (control: the reviewed tip)
MISMATCH | timber_floor expected cell 121
MISMATCH | timber_roof expected cell 139
MISMATCH | conjured_stone expected cell 389
MISSING T16 source "10 × 10 × 389 = 38,900 kg"
STALE old conjured kg "382"
STALE old T16 "38,200"
MISSING ice 1 stratum "13,023 kg"
MISSING ice 2 strata "52,094 kg"
STALE old ice "13,020"
STALE old ice "52,080"
lava 3 du x 2738 = 8214 vs 2 x 4106 = 8212 BAD
STALE lava-born basalt kg "4,107"
MISSING WBS rev cite "`docs/worldgen/DEUS_WORLDGEN_WBS.md` Rev 25 (`:4`)"
fall table rows 0
MISSING dropTop def "`dropTop = e1 − landing`"
MISSING dropGap def "`dropGap = e0 − (landing + 1)`"
MISSING single rule "**Unit fall damage uses `dropTop` and no other length**"
MISSING T10 pass "`ft` 10, 20 and 30 and `dice` 1, 2 and 3"
MISSING T10 mutant a "(8, 18, 28 ft: 0, 1 and 2 dice)"
MISSING T10 mutant b "(5, 10, 15 ft: 0, 1 and 1 dice)"
STALE old h "`h = e0 − (landing + 1)`"
STALE old mutant "fall height from 1 ft strata (1d6)"
STALE old length "strata fallen"
STALE old T10 fixture "(20 ft); remove"
checks 54 bad 24
EXIT=1
$ node cite_check.js <doc> 84ee3b55
citations 141 bad 0; excerpt rows 22 bad 0
EXIT=0
$ node bare_check.js <doc> 84ee3b55 (last line)
bare citations 122 out-of-range 0 unresolved 18
EXIT=0
$ gate on the clone with trace.json doctored (Q-12 dropped, Q-01 section renamed)   (control)
task SIM.40.01 reqs 11 missing Q-12 bad Q-01 missingHeadings none ownerQuestions 14 mdBytes 131242
GATE_EXIT=1
$ git checkout -q -- tasks/SIM.40.01/lane-q/trace.json; git status --short
RESTORE_EXIT=0
$ node -e "<counts from trace.json>"
requirements 12 {"COVERED":11,"PARTIAL":1} proposedPackages 8 ownerQuestions 14 packages with a mutant in tests 8
EXIT=0
$ grep -c "^| T[0-9]" <doc>
18
EXIT=0
```

(The control output lines are copied without the checker's trailing spaces.) The clone was then deleted (`rm -rf gateclone_fix1`, `RM_EXIT=0`). Citations: 141 now, one more than the original run (`DEUS_Fluid.js:50`, added for MINOR-4). The 18 unresolved bare citations are the same table rows as in the original run (read directly below).

**Counts after Fix 1:** requirements COVERED 11 (Q-01..Q-07, Q-09..Q-12), PARTIAL 1 (Q-08, the unreconciled ledger unit, unchanged), OWNER_QUESTION 0; proposed packages 8; Owner questions 14, none answered; acceptance tests 18 (T1-T18).

**The branch tip.** This REPORT is committed after `b2ca032a` in a commit that changes only `REPORT.md`, so the gate's inputs (`trace.json`, the design document, `lane.json`) are byte-identical at the final tip. The final tip's sha is the `FINAL SHA` line of the run's output, pasted from `git rev-parse HEAD` after the push.

## Original run (tip `9d5b40d3`)

The rest of this section is the report of the original run, unchanged except for heading levels. Its numbers are for `9d5b40d3` (the document was 125,981 bytes with 140 citations).

### What changed

All inside `tasks/SIM.40.01/lane-q/` (the allowedPaths):
- `SIM.40.01_STRUCTURAL_SUPPORT.md` (125,981 bytes): the design. Header with task, base commit, inputs, method, limits and the ADR-003 dependency list (A1-A9); the 13 required headings; §9.7 reconciliation with Lanes R and W.
- `trace.json`: 12 requirement records Q-01..Q-12, 8 proposed packages PROPOSED-Q-01..08, 14 Owner questions OQ-Q-01..14.
- `escalation.md`: the three sibling design lanes chose three ledger mass units (Lane Q kg, Lane R 1/16 lb, Lane W g) and two family lists; one ledger needs one of each. Raised for the PM with a proposal (1 g; Lane R's family list). Not an Owner question.
- `REPORT.md`: this file.

### How I tested it

Every command below ran in the foreground in `C:\Users\snewt\.deus_worktrees\lane-q` (Git Bash). Output is pasted raw, trimmed only where marked.

#### Base and write set

```text
$ git rev-parse HEAD 84ee3b55
17c346d50ebc7a9867625314fac802fc7cc7c277
84ee3b55f3f8c1b8a16710ccf3878795d98d1683
EXIT=0
$ git diff --name-only 84ee3b55 HEAD
tasks/SIM.40.01/lane-q/BRIEF.md
tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md
tasks/SIM.40.01/lane-q/escalation.md
tasks/SIM.40.01/lane-q/lane.json
tasks/SIM.40.01/lane-q/launches/20260926_032106_prompt.txt
tasks/SIM.40.01/lane-q/launches/20260926_034605_prompt.txt
tasks/SIM.40.01/lane-q/trace.json
EXIT=0
```

`BRIEF.md`, `lane.json` and the two launch prompts are the PM's and the launcher's commits; this run did not touch them.

#### Citations hold at the base (the audit cites `75cf2ff3`)

```text
$ git diff --stat 75cf2ff3 84ee3b55 -- game/
 game/js/plugins/DEUS_Levels.js |  60 +++++++++-
 game/js/plugins/DEUS_World.js  | 243 ++++++++++++++++++++++++++++++++++++++++-
 2 files changed, 295 insertions(+), 8 deletions(-)
EXIT=0
```

The `DEUS_Levels.js` hunks start at line 4175, so its lines below 4175 are the same in both commits; the document cites every line at `84ee3b55`. (The Grok review notes that with `-U0` the first changed line is 4178; the conclusion is the same.)

#### Absence claims

```text
$ git grep -n -E "fallDamage|unitFell|fallThrough" 84ee3b55 -- game/js/plugins
EXIT=1
$ git grep -n -E "porosit|permeab|loadCapacity|maxLoad" 84ee3b55 -- game/js/plugins
EXIT=1
$ git grep -n -E "M_RUBBLE|key: \"rubble\"" 84ee3b55 -- game/js/plugins/DEUS_Levels.js
EXIT=1
```

#### Citation checks (ad hoc, not committed)

`cite_check.js` resolves every backticked `file:line` citation (bare plugin names to `game/js/plugins/`, SRD files to `game/data/srd51/`), reads the file with `git show 84ee3b55:<path>`, fails on a line out of range, and for every `| cite | code |` table row fails when the quoted code is not on that line. `bare_check.js` resolves bare `:N` citations to the last full path on the same line.

```text
$ node cite_check.js <doc> 84ee3b55
citations 140 bad 0; excerpt rows 22 bad 0
EXIT=0
$ node cite_check.js <doctored copy> 84ee3b55   (control: one excerpt row moved to line 993, one line set to 999999)
RANGE `rules.json:999999` len 11507
EXCERPT MISMATCH DEUS_Levels.js:993 | const M_AIR = 0, M_STONE = 1, M_SOIL = 2, M_WOOD = 3, M_WATER = 4, M_LAVA = 5; | line: const STRATA = 5, CELL_FT = 5;
citations 140 bad 1; excerpt rows 22 bad 1
EXIT=1
$ node bare_check.js <doc> 84ee3b55
L133 UNRESOLVED bare :4773
... (L134-L187: :4791 :4810 :4717 :4736 :4611 :4616 :4893; L890-L900: :254 :535 :537 :538 :551 :552 :553 :578 :561 :534)
bare citations 122 out-of-range 0 unresolved 18
EXIT=0
```

The 18 unresolved bare citations are table rows whose file is named in the table's first row or header (the catalogue density table and the WBS dependency table). Read directly:

```text
$ git show 84ee3b55:game/data/DEUS_WorldCatalog.json | sed -n "4611p;4616p;4717p;4736p;4773p;4791p;4810p;4893p"
        "density": 0.75,
        "rotResistance": 75,
        "density": 2.3,
        "density": 2.1,
        "density": 2.9,
        "density": 2.65,
        "density": 2.7,
        "corrosionResistance": 30,
EXIT=0
$ git show 84ee3b55:docs/worldgen/DEUS_WORLDGEN_WBS.md | sed -n "254p;534p;535p;537p;538p;551p;552p;553p;561p;578p" | cut -c1-40
| **WG.65.15** | Closed-Loop Geomass & R
| SIM.40.01 | **Support model design & b
| SIM.40.02 | **Collapse event simulatio
| SIM.40.04 | **Collapse QA & fixtures**
| SIM.40.05 | **Decay model** (unmaintai
| SIM.50.08 | **Anthropic land reshaping
| SIM.50.09 | **Settlement lifecycle and
| SIM.50.10 | **Catastrophic geological
| SIM.60.03 | **Spell-effect runtime in
| GP.07.02 | **Cross-layer 3D targeting,
EXIT=0
```

#### The numbers in the material and span tables

```text
$ node -e <mass = density x 1.41584 m3; spanBase = floor(sqrt(t x 0.6096 x sigma / (3 rho g)) / 1.524), cap 12>
granite    kg/voxel 3894 spanBase t=1,2,3,5,10,20,40 (cap 12): 2,3,3,4,6,9,12
basalt     kg/voxel 4106 spanBase t=1,2,3,5,10,20,40 (cap 12): 2,3,3,4,6,9,12
slate      kg/voxel 3752 spanBase t=1,2,3,5,10,20,40 (cap 12): 1,2,3,4,5,8,11
marble     kg/voxel 3823 spanBase t=1,2,3,5,10,20,40 (cap 12): 1,2,3,4,5,8,11
limestone  kg/voxel 3256 spanBase t=1,2,3,5,10,20,40 (cap 12): 1,2,3,3,5,7,11
sandstone  kg/voxel 2973 spanBase t=1,2,3,5,10,20,40 (cap 12): 1,2,2,3,4,6,9
ice        kg/voxel 1298 spanBase t=1,2,3,5,10,20,40 (cap 12): 2,3,3,4,6,9,12
soil       kg/voxel 2265 spanBase t=1,2,3,5,10,20,40 (cap 12): 0,0,0,0,1,1,2
EXIT=0
```

These match the §2.3 table. (The ice row in §2.3 lists 1,011 kg, one fluid depth unit, because the ledger counts water in depth units, §9.1; 1,298 kg is solid ice.) That run did not check the §2.5 assembly rows; Fix 1's `num_check.js` does.

#### Gate (from `tasks/SIM.40.01/lane-q/lane.json`, run from the repo root before the final commit)

```text
$ node -e "<gateTests[0] from tasks/SIM.40.01/lane-q/lane.json>"
task SIM.40.01 reqs 12 missing none bad none missingHeadings none ownerQuestions 14 mdBytes 125981
EXIT=0
$ same gate code with d = a temp copy whose trace.json drops Q-12 and mis-names Q-01's section   (control)
task SIM.40.01 reqs 11 missing Q-12 bad Q-01 missingHeadings none ownerQuestions 14 mdBytes 125981
EXIT=1
```

#### Counts

```text
$ node -e "<counts from trace.json>"
requirements 12 {"COVERED":11,"PARTIAL":1} proposedPackages 8 ownerQuestions 14 packages with a mutant in tests 8
EXIT=0
$ grep -c "^| T[0-9]" tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md
18
EXIT=0
```

#### Commits on the branch (original run)

```text
$ git log --oneline origin/main..HEAD
17c346d5 [claude] SIM.40.01 reconcile with Lanes R and W (section 9.7); escalation: three ledger mass units
a76b1512 [claude] SIM.40.01 proof-read fixes: governing material of a member, cross references, examples within spans
a2af763c [claude] SIM.40.01 trace.json: 12 requirements, 8 proposed packages, 14 Owner questions
065e8dfb [claude] SIM.40.01 WIP: acceptance tests, WBS impact, Owner questions; citation fixes
88ffa615 [claude] SIM.40.01 WIP: blasts, mass ledger, sparse storage and cost, hooks
940355a2 [claude] SIM.40.01 WIP: support model, local recheck, sudden and decay-driven collapse
dfb1544f [claude] SIM.40.01 WIP: header, material model, buildings as strata
bedb03c2 [ops] SIM.40.01 lane-q launch prompt 20260926_034605
312ef0c9 [ops] SIM.40.01 lane-q launch prompt 20260926_032106
9103799e [pm] Open lane-q (SIM.40.01): BRIEF.md and lane.json
EXIT=0
```

## Evidence

- No screenshot: a document-only task with nothing visual to show.
- The outputs above are the evidence. Fix 1: the gate exits 0 in a fresh clone of `b2ca032a`; `num_check.js` passes 57 checks on the fixed document and fails 24 on the reviewed tip; citations resolve at the base (141 full, 22 excerpt rows, 122 bare); the gate fails on a doctored `trace.json`; the review file is untouched; the write set is only the lane folder.

## Not done / known problems

- **Nothing was run in a game or a headless core.** All memory and CPU figures are arithmetic from stated assumptions, not measurements.
- **Fix 1 went slightly beyond the review in two places,** both in the same kind of arithmetic: `timber_floor` 120 → 121 (the review checked the roof and thatch rows, not the floor row; `num_check.js` found it), and an odd last du of lava becoming loose basalt rubble (§9.1), so the new 2:1 ratio strands no lava.
- **The lava du mass of 2,053 kg (about 2.03 t/m³) is lighter than dense molten basalt** (about 2.7 t/m³). It is the only integer du mass near that range that converts exactly into basalt's 4,106 kg voxels; it is marked extrapolated and left to SIM.50.10 to confirm.
- **Falls into fluid:** §6.2 step 2 lets debris pass through fluid to the first solid or loose voxel, and `dropTop` uses the same `landing`, so a unit falling into a pool takes the dice of the drop to the pool's bed. The SRD 5.1 has no rule for falling into water. This was the rule before Fix 1 and was not changed; SIM.50.02 or an Owner question can change it.
- **A unit's fall ignores the height of its own member's debris pile** (§6.2 step 3, `dropTop = dropGap + t`). For one-stratum floors this is within a stratum of the physical drop; for a unit on top of a thick member that crumbles it overstates the fall.
- **Most numbers are extrapolated** and marked so: every DT, the pass and resist tables of §8.3 (apart from three values the SRD or today's code fixes), rock tensile strengths, soil and rammed-earth values, iron HP, the collapse damage addition, the warning ticks, the lava du mass. OQ-Q-02, -03, -08, -09 and -10 ask the Owner for the feel.
- **Ledger unit and families are unreconciled** across Lanes Q (kg), R (1/16 lb) and W (g). Raised in `escalation.md`; Q-08 is PARTIAL for this reason. Fix 1 did not change this. Lane W has since merged to main (`8997e238`) and main has a Lane L1 claim for WG.65.15. No ruling on the unit was found at `origin/main` `be11aaf69953592618cade751ea23f986e3a68e3` (fetched during Fix 1): `git grep -n -i -E "mass unit|ledger unit|1/16 lb|integer grams" origin/main -- docs/STATUS.md docs/OWNER_DECISIONS.md docs/worldgen/DEUS_WORLDGEN_WBS.md` gave `GREP_EXIT=1`, and ADR-003 on main still leaves the unit to "SIM.40.01 with WG.65.15" (`docs/adr/ADR-003_sim_render_split_and_lod.md:937` at that commit).
- **Sibling designs.** §7 and §9.7 adopt some Lane R names (`capacityThresholdsHP`, `collapse.breakElement`, build-time roles, fire residue in ORGANIC); if Lane R's review changes them, §7 and §9.7 change.
- **ADR-003 is PROPOSED** (not on main at the base; a Grok review commit `9e0ef94d` exists on `task/lane-m`). Since the base, Rev 3 has reached main (`647457b2` is in `origin/main`'s history); its status line still reads "Rev 3, PROPOSED" (`docs/adr/ADR-003_sim_render_split_and_lod.md:3` at `be11aaf6`). The design still cites it as PROPOSED at the base; Fix 1 did not re-cite it. This design proposes two amendments to it: the support queue runs every tick at every LOD level (§5.7, against ADR §16.5's coarse tick in L2), and an `aroundCorners` blast propagation for SRD spells that spread around corners (§8.2, OQ-Q-10). A1-A9 in §0.4 list every assumption taken from it.
- **DEC-010 is OPEN.** The natural-rock span bound is the design default until OQ-Q-01 is answered.
- **D-1 is OWNER_OPEN** and not chosen; §7.6 shows durations under both options. **D-4 and D-6** dependencies are flagged in §11.3 and §13.2.
- The design's lazy per-chunk support records (§5.4) rely on the world being support-stable at generation; that needs PROPOSED-Q-06 (and OQ-Q-13).
- Existing design documents that disagree with DEC-013, V137 or the audit are listed in §0.5 (VERTICAL_BUILD_PLAN, TERRAIN_LEVELS, VERTICAL_WORLD, DURABILITY, REMAINS); they were not edited (read only).

## Try it in RMMZ

Not applicable: this is a design document. Nothing in `game/` changed.

## Decisions needed

- **PM (or WG.65.15's owner):** one ledger mass unit and one family list for Lanes Q, R and W (`escalation.md`).
- **PM and the ADR-003 owner:** the two proposed ADR amendments above (§5.7, §8.2).
- **Coordinator:** whether PROPOSED-Q-04 is folded into SIM.40.02, and where the reviewed spec lands (SIM.40.01's DoD names `docs/systems/`), §13.
- **Owner:** OQ-Q-01..14 (§14 and `trace.json`), none answered here.
