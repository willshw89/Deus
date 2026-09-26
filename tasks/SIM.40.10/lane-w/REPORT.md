# Lane W report: SIM.40.10 population design (docs only)

| | |
|---|---|
| Task | SIM.40.10: lineage, lifecycle, carrying capacity, nine races (docs only) |
| Branch | `task/lane-w` |
| Base | `84ee3b55f3f8c1b8a16710ccf3878795d98d1683` |
| Writer | Claude. An independent Grok review decides; nothing here certifies the work. |
| Run | PM relaunch #1 (2026-09-26 03:45 CT). The previous session stopped at the usage limit during research and had committed nothing past the launch prompt, so all deliverables were written in this run. |

## What changed
- `tasks/SIM.40.10/lane-w/SIM.40.10_POPULATION_LIFECYCLE.md`: the design document (91,749 bytes at the gate run below), with the 13 required headings.
- `tasks/SIM.40.10/lane-w/trace.json`: 12 requirement records W-01..W-12, 10 proposed packages, 11 Owner questions.
- `tasks/SIM.40.10/lane-w/REPORT.md`: this file.

No file outside `tasks/SIM.40.10/lane-w/` was changed. No code, script, test or art was written or committed. No WBS status was changed, no WBS ID was minted, and no Owner question was answered.

## Commits on the branch (oldest first)
```
a86d43e3 [claude] SIM.40.10 WIP: population design part 1 (lifecycle, lineage, reproduction and mass)
ca2c3c11 [claude] SIM.40.10 WIP: population design part 2 (capacity, nine races, LOD, migration)
2d24a749 [claude] SIM.40.10 WIP: population design part 3 (dormant code, hooks, cost, tests, WBS, Owner questions)
4ae8c941 [claude] SIM.40.10 WIP: trace.json and citation path fixes
9a231cd8 [claude] SIM.40.10 WIP: read-back corrections (SRD weights, water family, bone, arithmetic)
```
Plus this REPORT commit on top (its own SHA cannot appear inside it; it is the branch tip after the push and is printed as `FINAL SHA` in the run output).

## How I tested it (commands and raw exit codes)

**Branch state at resume.**
```
$ git log --oneline origin/main..HEAD
4f2ea274 [ops] SIM.40.10 lane-w launch prompt 20260926_034719
e1712246 [ops] SIM.40.10 lane-w launch prompt 20260926_033122
31892ae7 [pm] Open lane-w (SIM.40.10): BRIEF.md and lane.json
$ git status
On branch task/lane-w ... nothing to commit, working tree clean
```

**Code at the base is the code the audit cited, except two files.**
```
$ git diff --stat 75cf2ff3 84ee3b55 -- game/
 game/js/plugins/DEUS_Levels.js |  60 +++++++++-
 game/js/plugins/DEUS_World.js  | 243 ++++++++++++++++++++++++++++++++++++++++-
 2 files changed, 295 insertions(+), 8 deletions(-)
EXIT=0
```
`DEUS_World.js` citations in the design use base-commit lines (for example unit stepping moved from the audit's `:1699` to `:1809`, `moveUnitToLevel` from `:1440` to `:1550`).

**Scope: nothing outside allowedPaths.**
```
$ git diff --name-only 84ee3b55 HEAD
tasks/SIM.40.10/lane-w/BRIEF.md
tasks/SIM.40.10/lane-w/SIM.40.10_POPULATION_LIFECYCLE.md
tasks/SIM.40.10/lane-w/lane.json
tasks/SIM.40.10/lane-w/launches/20260926_033122_prompt.txt
tasks/SIM.40.10/lane-w/launches/20260926_034719_prompt.txt
tasks/SIM.40.10/lane-w/trace.json
EXIT=0
$ git diff --name-only 84ee3b55 HEAD | grep -v "^tasks/SIM.40.10/lane-w/" | wc -l
0
EXIT=0
```
(`BRIEF.md`, `lane.json` and `launches/` were written by the PM and the launcher, not by this run.)

**"No livestock in code or catalog" (design section 1.1).** `git grep -c` prints nothing and exits 1 when there is no match:
```
$ git grep -c -i livestock 84ee3b55 -- game/js/plugins game/data/DEUS_WorldCatalog.json
EXIT=1
```

**SRD race text extraction** (the source of the tables in design sections 1.3 and 5.1; run from the repo root):
```
node -e "const d=JSON.parse(require('fs').readFileSync('game/data/srd51/character_options.json','utf8'));const races=d.entries.filter(e=>e.kind==='race');for(const r of races){...print Age, Size, Speed, Darkvision paragraphs...}"
EXIT=0
node -e "...print 'Ability Score Increase' for kind race and subrace..."
EXIT=0
```
Output, trimmed to the Age lines as quoted in the design: Dwarf "…live about 350 years", Elf "…can live to be 750 years old", Halfling "…middle of his or her second century", Dragonborn "…reach adulthood by 15. They live to be around 80", Human "…live less than a century", Gnome "…350 to almost 500 years", Half-Elf "…often exceeding 180 years", Half-Orc "…rarely live longer than 75 years", Tiefling "…live a few years longer". SRD creature entries carry no age or lifespan text (a regex over all 317 `creatures.json` entries for "lives/lifespan/years old" found 0).

**Citation self-check.** An ad-hoc `node -e` one-liner (not committed) extracts every backticked `path:line` or `path:line-line` citation from the design, expands bare plugin names to `game/js/plugins/`, reads the file with `git show 84ee3b55:<path>`, and fails if the file is missing or shorter than the cited line. It checks existence of the line, not its content; content was checked by reading each cited line with `sed -n` while writing.
```
unique full-path citations 85 bad 0
EXIT=0
```
The first run of this check found 4 bad citations (shorthand `creatures.json:`, `rules.json:`, `character_options.json:`, `DEUS_WorldCatalog.json:` that the convention would read as plugin paths). They were rewritten as full paths before the run above.

**Every proposed-package dependency is a real WBS row at the base.** For each of the 17 distinct IDs in `trace.json` `proposedPackages[].deps`, `git show 84ee3b55:<WBS file> | grep -c "^| **<id>"` over the worldgen and society WBS files gave exactly 1 row each (SIM.00.01, .02, .05, .06; SIM.30.01-.03; SIM.40.01, .05, .10; SIM.50.02, .04; SOC.10.01-.03; WG.62.02; WG.65.15). `EXIT=0`.

## Gate check (from `tasks/SIM.40.10/lane-w/lane.json`, run from the repo root at `9a231cd80ec39c0e2efa55842dcd6532f3cc500b`)
The command was run by reading `gateTests[0]` from `lane.json` and spawning it unchanged.
```
task SIM.40.10 reqs 12 missing none bad none missingHeadings none ownerQuestions 11 mdBytes 91749
EXIT=0
```
**The gate can fail.** The same gate run on two mutated copies in a temp directory (the repo was not touched):
```
mutant a: '## Owner questions' renamed
task SIM.40.10 reqs 12 missing none bad none missingHeadings ## Owner questions ownerQuestions 11 mdBytes 91742
mutant a EXIT=1
mutant b: last requirement (W-12) removed from trace.json
task SIM.40.10 reqs 11 missing W-12 bad none missingHeadings none ownerQuestions 11 mdBytes 91749
mutant b EXIT=1
```
This REPORT is not read by the gate, so committing it does not change the gate result.

## Counts
- Requirements by status: COVERED 10 (W-01, W-02, W-03, W-05, W-07, W-08, W-09, W-10, W-11, W-12), PARTIAL 2 (W-04, W-06), OWNER_QUESTION 0.
- Proposed packages: 10 (PROPOSED-W-01..W-10).
- Owner questions: 11 (OQ-W-01..OQ-W-11).
- Acceptance tests specified for later lanes: 16, each with a mutant that must fail.
- Dormant or conflicting code items with a recommendation: 26 (D-08-01..D-08-26).

## Findings a reviewer may want to check first
- The live mortality curve (`DEUS_Colonists.js:2828-2847`) is human-only (V123) but applies to every species; the history profiles (`DEUS_HistoricalDemographics.js:128-136`) give dwarves 250-350 years and humans [60, 90]. Two sources for human life in code.
- Four catalog `people` stats differ from SRD ability increases (`game/data/DEUS_WorldCatalog.json:7322`, `:7329`, `:7339`, `:7349`): human `{}`, elf `con -1`, dwarf `cha -1`, gnome `str -2`. The BRIEF names the SRD as the rules bible, so this is recorded as a data defect (D-08-17), not as an unsettled conflict.
- The catalog already has a race-to-layer map (`game/data/DEUS_WorldCatalog.json:7413-7429`) that predates DEC-013; the design treats it as a stale stand-in and keeps home ranges OPEN.
- `attemptSpawn` (`DEUS_Ecology.js:509`, `:548`) creates prey and monsters from nothing today (LIFE-001); the audit's §6 step 1 (rule-breach fixes) could take it early.
- The WBS row SIM.40.10 depends only on SIM.40.02 (collapse); the design recommends WG.65.15, SIM.00.05, SIM.30.02 and SIM.40.05 instead (section 12).

## Not done / known problems
- Nothing was run in NW.js, the RMMZ editor or a headless core; all costs are arithmetic with stated assumptions (ADR-003 time budgets are PENDING-K3).
- W-04 is PARTIAL: forage productivity, predation constants and the allometric intake exponent have no SRD or repository source; they are tuning parameters pinned by tests. Vegetation supply depends on SIM.50.04, which does not exist.
- W-06 is PARTIAL: the individual budget numbers wait for benchmarks, and people crowd LOD waits for the Owner (ADR-003 Q14, DEC-014 OPEN).
- The design depends on ADR-003 Rev 3, which is PROPOSED and not on `main`; if its region size, LOD levels or tracked-unit rules change, sections 0, 6 and 10 change with it.
- Lane R and Lane Q have no deliverables yet, so the decay and support interfaces are assumptions IA-R1..R3 and IA-Q1..Q2 (section 3.6). Lane O2's people-side audit was read at a WIP checkpoint (`3ef0d154`) and is unreviewed.
- The SRD half-ration rule reads two ways (death on day 18 or day 12); the design picks the first as an interpretation and flags it (section 4.3).
- Gestation, litter sizes and animal lifespans are zoology defaults, not SRD, and are not sourced to a specific reference.
- The citation self-check verifies that each cited line exists, not that its content matches; content was checked by hand while writing and could still contain a slip.
- No escalation file was written: the conflicts found (V123 vs SRD for humans, catalog stats vs SRD, PEOPLES.md's eleven peoples vs DEC-013 and D-6, the stale layer map) are either settled by the BRIEF (SRD is the baseline; D-6 applies) or listed as Owner questions.

## Decisions needed
- The 11 Owner questions in the design's `## Owner questions` section (also in `trace.json`), among them: per-race lifespans (OQ-W-01), cross-race offspring (OQ-W-02), named-individual budget (OQ-W-03), the D-6 slot list and the three non-SRD cultures (OQ-W-04), people crowd LOD (OQ-W-05), monster origins (OQ-W-06).
- D-1 (calendar) stays OWNER_OPEN; only `HOURS_PER_YEAR` depends on it.
- D-4 and D-6 are PM decisions the Owner may overturn; dependent parts are tagged in the design.

## Push
See the run output: `git push origin task/lane-w` result and `FINAL SHA`.
