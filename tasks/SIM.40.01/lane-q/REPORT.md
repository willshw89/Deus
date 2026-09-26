# REPORT: lane-q, SIM.40.01 structure, material and support/collapse design (docs only)

| | |
|---|---|
| Writer | Claude (lane-q). This run is PM relaunch #1: the previous session stopped at the usage limit during research and had committed nothing but the launch prompt |
| Branch | `task/lane-q`, base `84ee3b55f3f8c1b8a16710ccf3878795d98d1683` |
| Review | Not reviewed. Grok reviews independently; nothing here certifies the work |
| Art | None generated, drawn, requested or integrated (DEC-007). The design names catalogue slots as text only |
| Code | None. No script, test or code file is committed. Two ad-hoc citation checkers were run from the temp folder (`%TEMP%\laneq\cite_check.js`, `bare_check.js`) and are not in the repo |

## What changed

All inside `tasks/SIM.40.01/lane-q/` (the allowedPaths):
- `SIM.40.01_STRUCTURAL_SUPPORT.md` (125,981 bytes): the design. Header with task, base commit, inputs, method, limits and the ADR-003 dependency list (A1-A9); the 13 required headings; §9.7 reconciliation with Lanes R and W.
- `trace.json`: 12 requirement records Q-01..Q-12, 8 proposed packages PROPOSED-Q-01..08, 14 Owner questions OQ-Q-01..14.
- `escalation.md`: the three sibling design lanes chose three ledger mass units (Lane Q kg, Lane R 1/16 lb, Lane W g) and two family lists; one ledger needs one of each. Raised for the PM with a proposal (1 g; Lane R's family list). Not an Owner question.
- `REPORT.md`: this file.

## How I tested it

Every command below ran in the foreground in `C:\Users\snewt\.deus_worktrees\lane-q` (Git Bash). Output is pasted raw, trimmed only where marked.

### Base and write set

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

### Citations hold at the base (the audit cites `75cf2ff3`)

```text
$ git diff --stat 75cf2ff3 84ee3b55 -- game/
 game/js/plugins/DEUS_Levels.js |  60 +++++++++-
 game/js/plugins/DEUS_World.js  | 243 ++++++++++++++++++++++++++++++++++++++++-
 2 files changed, 295 insertions(+), 8 deletions(-)
EXIT=0
```

The `DEUS_Levels.js` hunks start at line 4175, so its lines below 4175 are the same in both commits; the document cites every line at `84ee3b55`.

### Absence claims

```text
$ git grep -n -E "fallDamage|unitFell|fallThrough" 84ee3b55 -- game/js/plugins
EXIT=1
$ git grep -n -E "porosit|permeab|loadCapacity|maxLoad" 84ee3b55 -- game/js/plugins
EXIT=1
$ git grep -n -E "M_RUBBLE|key: \"rubble\"" 84ee3b55 -- game/js/plugins/DEUS_Levels.js
EXIT=1
```

### Citation checks (ad hoc, not committed)

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

### The numbers in the material and span tables

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

These match the §2.3 table. (The ice row in §2.3 lists 1,011 kg, one fluid depth unit, because the ledger counts water in depth units, §9.1; 1,298 kg is solid ice.)

### Gate (from `tasks/SIM.40.01/lane-q/lane.json`, run from the repo root before the final commit)

```text
$ node -e "<gateTests[0] from tasks/SIM.40.01/lane-q/lane.json>"
task SIM.40.01 reqs 12 missing none bad none missingHeadings none ownerQuestions 14 mdBytes 125981
EXIT=0
$ same gate code with d = a temp copy whose trace.json drops Q-12 and mis-names Q-01's section   (control)
task SIM.40.01 reqs 11 missing Q-12 bad Q-01 missingHeadings none ownerQuestions 14 mdBytes 125981
EXIT=1
```

### Counts

```text
$ node -e "<counts from trace.json>"
requirements 12 {"COVERED":11,"PARTIAL":1} proposedPackages 8 ownerQuestions 14 packages with a mutant in tests 8
EXIT=0
$ grep -c "^| T[0-9]" tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md
18
EXIT=0
```

- Requirements by status: COVERED 11 (Q-01..Q-07, Q-09..Q-12), PARTIAL 1 (Q-08: the ledger unit and family list are not reconciled across Lanes Q, R and W), OWNER_QUESTION 0.
- Proposed packages: 8 (PROPOSED-Q-01..08), each with real dependency IDs and at least one acceptance test naming a mutant that must fail it.
- Owner questions: 14 (OQ-Q-01..14), none answered.
- Acceptance tests in the design: 18 (T1-T18), each with at least one mutant.

### Commits on the branch

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

Each WIP commit was pushed to `origin/task/lane-q` as it was made. The last content commit before this report is `17c346d50ebc7a9867625314fac802fc7cc7c277` (from `git rev-parse HEAD` above). The commit that adds this REPORT is the branch tip; its sha is the `FINAL SHA` line of the run's output, pasted from `git rev-parse HEAD` after the push.

## Evidence

- No screenshot: a document-only task with nothing visual to show.
- The outputs above are the evidence: citations resolve at the base (140 full, 22 excerpt rows, 122 bare), the checker and the gate each fail on a doctored copy, the table numbers reproduce, and the write set is only the lane folder.

## Not done / known problems

- **Nothing was run in a game or a headless core.** All memory and CPU figures are arithmetic from stated assumptions, not measurements.
- **Most numbers are extrapolated** and marked so: every DT, the pass and resist tables of §8.3 (apart from three values the SRD or today's code fixes), rock tensile strengths, soil and rammed-earth values, iron HP, the collapse damage addition, the warning ticks. OQ-Q-02, -03, -08, -09 and -10 ask the Owner for the feel.
- **Ledger unit and families are unreconciled** across Lanes Q (kg), R (1/16 lb) and W (g). Raised in `escalation.md`; Q-08 is PARTIAL for this reason. The design's own kg figures are unchanged.
- **Sibling designs are unreviewed.** §7 and §9.7 adopt some Lane R names (`capacityThresholdsHP`, `collapse.breakElement`, build-time roles, fire residue in ORGANIC); if Lane R's review changes them, §7 and §9.7 change.
- **ADR-003 is PROPOSED** (not on main at the base; a Grok review commit `9e0ef94d` exists on `task/lane-m`). This design proposes two amendments to it: the support queue runs every tick at every LOD level (§5.7, against ADR §16.5's coarse tick in L2), and an `aroundCorners` blast propagation for SRD spells that spread around corners (§8.2, OQ-Q-10). A1-A9 in §0.4 list every assumption taken from it.
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
