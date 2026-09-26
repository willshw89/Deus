# SIM.50.11 REPORT: people-side gap audit (lane-o2)

| | |
|---|---|
| Task | SIM.50.11, people-side gap audit (docs only). Brief: `tasks/SIM.50.11/gap-audit-people/BRIEF.md`. |
| Writer | Claude. Reviewer: Grok (independent, launched later by the PM). This report states what was done and the raw evidence. It certifies nothing. |
| Branch | `task/gap-audit-people`, worktree `C:\Users\snewt\.deus_worktrees\lane-o2` |
| Base | `790387090083848959ce0b95bc560a395336fa3d` (the brief's base; every `file:line` in the audit is read at this commit) |
| Sessions | Session 1 (2026-09-26, stopped by the Claude usage limit) committed `1c3b5849`, `161b2043`, `a8f167c1`, `029a5baf`; the PM checkpointed its uncommitted edits as `3ef0d154`. Session 2 (this one, PM relaunch #1) finished the audit. Session 1's raw command outputs were not saved, so every check below was re-run in session 2. |

## What changed

All files are inside the allowedPaths (`tasks/SIM.50.11/gap-audit-people/**`). No file in `game/`, `tools/`, `docs/` or `art/` was changed. No code, script or test was committed. No art was requested, made or described as something to generate (DEC-007).

- `PEOPLE_GAP_AUDIT.md`: the audit. Header, rating rules, summary, shared foundation, ten areas (requirements, WBS coverage, code today, gaps, proposed packages with dependencies, acceptance tests, mutants and tick cost), interactions (section 4), order of work and cost roll-up (section 5), 26 Owner questions (section 6), 14 documentation mismatches (section 7), 8 defects found in passing (section 8), method and limits (section 9).
- `people_gap_table.json`: the machine-readable table, generated from the audit (see "The JSON table" below).
- `escalation.md`: E1 (three WBS rows cite the wrong DEC or V row), E2 (V87's eleven peoples against DEC-013's nine races), E3 (DEC-017 battle screens against ADR-001). Committed in session 1; unchanged here.
- `REPORT.md`: this file.

Session 2 changes to text written in session 1, found while finishing:
- The summary counts written in session 1 (58 gaps, BLOCKER 7, 57 packages, 12 mismatches) did not match the finished sections. They are now computed from the table: 73 gaps (BLOCKER 6, MAJOR 48, MINOR 19), 59 packages, 14 mismatches.
- Government coverage was stated as "five of thirteen" (section 3.2) and "five of twelve" (section 1.1); the table in section 3.2 has six of thirteen rows covered. Both now say six of thirteen. The law row now notes that SOC.20.01 stores an office's jurisdiction but no laws.
- Lane P's audit and Lane M's ADR-003 were marked "unreviewed" in session 1. Both received a Grok `VERDICT: PASS` and were merged to main during session 2, after this lane's base. The header now says so, and cites them by section only because neither file exists at the base.
- Added G1-9 with PROPOSED-MIND-10 (mind-affecting and mind-reading spells) and G8-8 (resurrection and records) with a revival test in PROPOSED-REC-01; linked new Owner questions OQ-04, OQ-07, OQ-08, OQ-11, OQ-15, OQ-17, OQ-22, OQ-25 and OQ-26 from the packages they block; corrected REC-01's tick-cost arithmetic (it now counts the social events that memories point to).
- Section 0 now explains that short forms such as `GOV-01` mean `PROPOSED-GOV-01` and are not IDs, because the real IDs `INV-GOV-01..05` and `DEF-OPS-LOG-01` contain the same characters.

## Commits on the branch

```text
$ git log --oneline origin/main..HEAD      (run before this report was committed)
e2c354fd [claude] SIM.50.11 limits: cite origin/main 9f9954e5 for the unchanged-WBS check
80655177 [claude] SIM.50.11 audit sections complete; people_gap_table.json generated from the audit
6d5c1298 [claude] SIM.50.11 WIP: interactions, order of work, Owner questions, mismatches, defects, method
a28d577c [claude] SIM.50.11 WIP: Lane P/M review status, G1-9/MIND-10, G8-8, OQ links, gov count fix
eb2eb6a8 [ops] SIM.50.11 lane-o2 launch prompt 20260926_034545
3ef0d154 [pm] WIP checkpoint after Claude usage limit
029a5baf [claude] SIM.50.11 WIP: areas 4-7
a8f167c1 [claude] SIM.50.11 WIP: audit header, foundation, areas 1-3
161b2043 [claude] SIM.50.11 escalation E3: DEC-017 battle screens vs ADR-001
1c3b5849 [claude] SIM.50.11 escalation: WBS DEC/V cross-reference errors; V87 vs DEC-013
6c0a8008 [ops] SIM.50.11 lane-o2 launch prompt 20260926_030812
7ec8b131 [pm] Open lane-o2 (SIM.50.11): BRIEF.md and lane.json
```

## Commands and raw output (session 2)

Run from the worktree root in Git Bash, 2026-09-26. Each block is copied from the terminal; `EXIT=` lines are raw `$?` values.

### Session start

```text
$ git log --oneline origin/main..HEAD && git status
eb2eb6a8 [ops] SIM.50.11 lane-o2 launch prompt 20260926_034545
3ef0d154 [pm] WIP checkpoint after Claude usage limit
029a5baf [claude] SIM.50.11 WIP: areas 4-7
a8f167c1 [claude] SIM.50.11 WIP: audit header, foundation, areas 1-3
161b2043 [claude] SIM.50.11 escalation E3: DEC-017 battle screens vs ADR-001
1c3b5849 [claude] SIM.50.11 escalation: WBS DEC/V cross-reference errors; V87 vs DEC-013
6c0a8008 [ops] SIM.50.11 lane-o2 launch prompt 20260926_030812
7ec8b131 [pm] Open lane-o2 (SIM.50.11): BRIEF.md and lane.json
On branch task/gap-audit-people
Your branch is ahead of 'origin/task/gap-audit-people' by 1 commit.
nothing to commit, working tree clean
```

### Citation verifier (SIM.50.01's `verify_citations.js`) and its self-test

```text
$ node tasks/SIM.50.01/gap-audit/verify_citations.js --commit 790387090083848959ce0b95bc560a395336fa3d --doc tasks/SIM.50.11/gap-audit-people/PEOPLE_GAP_AUDIT.md
413 citations checked, 172 verbatim excerpts checked against 790387090083848959ce0b95bc560a395336fa3d: 0 failure(s)
EXIT=0
$ node tasks/SIM.50.01/gap-audit/verify_citations.js --commit 790387090083848959ce0b95bc560a395336fa3d --doc tasks/SIM.50.11/gap-audit-people/PEOPLE_GAP_AUDIT.md --selftest
SELFTEST: 3/3 doctored citations reported as failures (3 failures total)
EXIT=0
```

The verifier checks that every `path:line` names an existing line at the base, and that every evidence-table excerpt is on its cited line. For citations outside evidence tables it checks only that the line exists; their content was checked by reading, not mechanically.

### Gate check (`lane.json` `gateTests[0]`)

First run (before the last audit edit), then the run on the final audit at `e2c354fd`:

```text
$ node -e "<lane.json gateTests[0] one-liner, verbatim>"
areas 10 bad 0 mdBytes 172177
EXIT=0
$ node -e "<lane.json gateTests[0] one-liner, verbatim>"      (final audit, e2c354fd)
areas 10 bad 0 mdBytes 172250
EXIT=0
```

Control, run on a copy in `%TEMP%\o2\gatecheck` where area 4's rating was changed to `"PLANNED"` (the real files are untouched):

```text
$ gate on a copy with area 4 rating set to "PLANNED"
areas 10 bad 1 mdBytes 172177
EXIT=1
```

This report adds no bytes to the audit or the table, so the final gate result stands after the report commit.

### The JSON table

`people_gap_table.json` is generated from `PEOPLE_GAP_AUDIT.md` by an ad-hoc Node script kept in `%TEMP%\o2\gen_table.js`. It is not committed, because this lane commits no scripts. It parses the summary table, each area's gap table, package outlines, "What exists in code" citations, the Owner-question table and the interaction tables. Per-area DEC IDs and SRD references are hand-written in the script. It stops with exit 1 if any of these fail: a gap names a package that is not defined in its area, or a package does not list the gap back; a package lacks scope, dependencies, tests, a mutant or a tick cost; a package or `OQ-` ID is used but not defined; an Owner question belongs to no area; an area's section rating or priority differs from the summary; an area has no living-world or no spell interaction; the priorities are not 1 to 10.

```text
$ node gen_table.js 790387090083848959ce0b95bc560a395336fa3d   (writes people_gap_table.json)
{"areas":10,"gaps":73,"gapsBySeverity":{"BLOCKER":6,"MAJOR":48,"MINOR":19},"proposedPackages":59,"ownerQuestions":26,"documentationMismatches":14,"defectsInPassing":8}
per area: 1:9g/10p/4q 2:6g/6p/5q 3:7g/6p/3q 4:7g/5p/4q 5:6g/5p/2q 6:10g/7p/5q 7:8g/5p/2q 8:8g/5p/3q 9:5g/4p/5q 10:7g/6p/4q
OK: cross-references consistent
EXIT=0
$ GEN_DIR=<copy: MIND-01 mutant removed, G2-6 -> GOV-09, OQ-24 -> OQ-27> node gen_table.js ...
{"areas":10,"gaps":73,"gapsBySeverity":{"BLOCKER":6,"MAJOR":48,"MINOR":19},"proposedPackages":59,"ownerQuestions":26,"documentationMismatches":14,"defectsInPassing":8}
per area: 1:9g/10p/4q 2:6g/6p/5q 3:7g/6p/3q 4:7g/5p/4q 5:6g/5p/2q 6:10g/7p/5q 7:8g/5p/2q 8:8g/5p/3q 9:5g/4p/5q 10:7g/6p/4q
FAIL
PROPOSED-MIND-01: no mutant
G2-6: package PROPOSED-GOV-09 not defined in area 2
referenced but undefined OQ-27
referenced but undefined PROPOSED-GOV-09
EXIT=1
```

After the first run, `git status --short` showed only the audit as modified: regenerating left the committed JSON byte-identical.

### Cited IDs exist; proposed IDs do not collide

Ad-hoc script `%TEMP%\o2\check_ids.js` (not committed). It collects every ID in `wbsIds[]` and in package `deps[]` (other than `PROPOSED-`, `OQ-` and `DEC-`), requires exactly one table row (or `### Block` heading for `WB-`) in `docs/worldgen/DEUS_WORLDGEN_WBS.md`, `docs/society/DEUS_SOCIETY_WBS.md` or `docs/WORK_QUEUE.md` at the base, and requires zero `PROPOSED-<AREA>-NN` strings anywhere at the base.

```text
$ node check_ids.js
distinct WBS/queue/OD ids cited: 75; not exactly one row: 0
PROPOSED-* occurrences at the base: 0
EXIT=0
$ TABLE=<copy with fake SOC.99.01> node check_ids.js
distinct WBS/queue/OD ids cited: 76; not exactly one row: 1 -> SOC.99.01=0
PROPOSED-* occurrences at the base: 0
EXIT=1
```

Short forms, for section 0 of the audit:

```text
$ git grep -n -w -E '(MIND|GOV|WAR|CUL|KNOW|HEALTH|LOG|REC|MODE|DEEP)-[0-9]{2}' 790387090083848959ce0b95bc560a395336fa3d -- docs tasks game/data tools | grep -v 'tasks/SIM.50.11' | cut -c1-200 | head -20
...:docs/INVARIANT_REGISTRY.md:73:| **INV-GOV-01** | **Gemini Integration Authority** | ...
...:docs/INVARIANT_REGISTRY.md:74:| **INV-GOV-02** | **One Primary Writer Per File Set** | ...
...:docs/INVARIANT_REGISTRY.md:75:| **INV-GOV-03** | **Independent Review Precedence** | ...
...:docs/INVARIANT_REGISTRY.md:76:| **INV-GOV-04** | **Durable Task State** | ...
...:docs/INVARIANT_REGISTRY.md:77:| **INV-GOV-05** | **Evidence Precedes Claims** | ...
...:docs/STATUS.md:148:| **DEF-OPS-LOG-01** | `WG.00.12` | `MINOR` | ...
...:docs/agents/mailboxes/README.md:3:... (`INV-GOV-04`)
...:tasks/WG.00.08/defects.jsonl:19:{"defectId":"DEF-OPS-LOG-01",...
EXIT=0
```

(`...` stands for the base SHA prefix and the rest of each long line, trimmed by `cut`.)

### Word searches behind "zero hits" in sections 3.2 and 3.4

```text
$ git grep -w -i -c -E "office|council|law|crime|theft|murder|justice|punish|jail|prison|heir|rebel|tax" 790387090083848959ce0b95bc560a395336fa3d -- game/js/plugins
EXIT=1
$ git grep -w -i -c -E "god|temple|ritual|festival|holiday|taboo|belief|worship" 790387090083848959ce0b95bc560a395336fa3d -- game/js/plugins
EXIT=1
$ git grep -w -i -c -E "leader" 790387090083848959ce0b95bc560a395336fa3d -- game/js/plugins   (control: must match)
790387090083848959ce0b95bc560a395336fa3d:game/js/plugins/DEUS_Callings.js:3
790387090083848959ce0b95bc560a395336fa3d:game/js/plugins/DEUS_Colonists.js:2
790387090083848959ce0b95bc560a395336fa3d:game/js/plugins/DEUS_Core.js:1
790387090083848959ce0b95bc560a395336fa3d:game/js/plugins/DEUS_HistoricalDemographics.js:2
790387090083848959ce0b95bc560a395336fa3d:game/js/plugins/DEUS_History.js:34
790387090083848959ce0b95bc560a395336fa3d:game/js/plugins/DEUS_Speech.js:1
790387090083848959ce0b95bc560a395336fa3d:game/js/plugins/DEUS_Talk.js:29
790387090083848959ce0b95bc560a395336fa3d:game/js/plugins/UF_Households.js:1
EXIT=0
```

`git grep` exits 1 when nothing matches.

### SRD counts used in sections 3.10 and 4.2

```text
$ grep -c -i underdark game/data/srd51/*.json
game/data/srd51/catalogue_manifest.json:0
game/data/srd51/character_options.json:0
game/data/srd51/creatures.json:0
game/data/srd51/equipment.json:0
game/data/srd51/magic_items.json:0
game/data/srd51/rules.json:0
game/data/srd51/spells.json:0
EXIT=1
$ node -e (SRD creature senses count)
creatures 317 darkvisionInSenses 175 sunlightSensitivity 7 fields id,category,kind,name,source,text,data,dice,readiness,notes,icon
EXIT=0
$ node -e (SRD races with darkvision)
Dwarf:DV, Elf:DV, Halfling:-, Dragonborn:-, Human:-, Gnome:DV, Half-Elf:DV, Half-Orc:DV, Tiefling:DV
EXIT=0
```

Counting "darkvision" anywhere in a creature record gives 176. The extra record is the Darkmantle, whose darkness trait says darkvision cannot penetrate it. The audit's 175 counts the `senses` field only.

### Lane P counts used in sections 1.3 and 4.2

```text
$ git show c9d1ed86:docs/audits/srd_spell_effect_audit.json | node -e (counts)
records 319 NONE 208 physical 111 crossLayer {"targets-through-openings":206,"none":85,"falls/flows-down":15,"breaches-floor":13} LIGHT 26
EXIT=0
```

The per-group `NONE` counts (8, 19, 21, 13, 5, 12, 5, 48, 25, 14, 21, 6, 11; sum 208) are copied from Lane P's §2.9 table at `c9d1ed86`.

### What changed on main after the base

```text
$ git diff --name-only 790387090083848959ce0b95bc560a395336fa3d HEAD
tasks/SIM.50.11/gap-audit-people/BRIEF.md
tasks/SIM.50.11/gap-audit-people/PEOPLE_GAP_AUDIT.md
tasks/SIM.50.11/gap-audit-people/escalation.md
tasks/SIM.50.11/gap-audit-people/lane.json
tasks/SIM.50.11/gap-audit-people/people_gap_table.json
tasks/SIM.50.11/lane-o2/launches/20260926_030812_prompt.txt
tasks/SIM.50.11/lane-o2/launches/20260926_034545_prompt.txt
EXIT=0
$ git rev-parse origin/main
9f9954e579ffc20d8850420d67f1a0127f776b43
EXIT=0
$ git diff --stat 790387090083848959ce0b95bc560a395336fa3d origin/main -- docs/worldgen/DEUS_WORLDGEN_WBS.md docs/society/DEUS_SOCIETY_WBS.md docs/art/DEUS_WORLD_WBS.md docs/OWNER_DECISIONS.md docs/VISION.md
EXIT=0
$ git diff --stat 790387090083848959ce0b95bc560a395336fa3d origin/main -- docs/ game/
 docs/STATUS.md                               |    16 +-
 docs/adr/ADR-003_sim_render_split_and_lod.md |  1972 +++
 docs/adr/README.md                           |     1 +
 docs/audits/SRD_SPELL_EFFECT_AUDIT.md        |  1543 +++
 docs/audits/srd_spell_effect_audit.json      | 18273 +++++++++++++++++++++++++
 5 files changed, 21799 insertions(+), 6 deletions(-)
EXIT=0
$ git diff --stat 2e32f5968f7ed1178ca41602bf74550e4338fff5 origin/main -- docs/adr/ADR-003_sim_render_split_and_lod.md
EXIT=0
$ git diff --stat c9d1ed864cbd1ca0d6f5249e2607e2c833830f01 origin/main -- docs/audits/SRD_SPELL_EFFECT_AUDIT.md docs/audits/srd_spell_effect_audit.json
EXIT=0
```

The empty diffs show that the WBS files, `docs/OWNER_DECISIONS.md` and `docs/VISION.md` are the same on main as at the base, and that the merged ADR-003 and Lane P audit are the texts this audit read.

## Counts

| Item | Count |
|---|---|
| Areas rated | 10 (all PARTLY PLANNED) |
| Gaps | 73: BLOCKER 6, MAJOR 48, MINOR 19 |
| Proposed packages | 59 (`PROPOSED-<AREA>-NN`; none minted) |
| Owner questions | 26 (OQ-01 to OQ-26; none answered; OQ-19 and OQ-20 are Overlord mode) |
| Documentation mismatches | 14 (audit section 7) |
| Defects found in passing | 8 (audit section 8) |
| Escalations | 3 (E1 to E3 in `escalation.md`, session 1) |

Individual minds is priority 1, with the most packages (10, PROPOSED-MIND-01 to -10).

## Not done / known problems

- Nothing was run in NW.js, the RMMZ editor or F5, and there are no screenshots. This is a docs-only task and nothing visual is claimed.
- Whether the `require()`-loaded companions (Conditions, Households, DeathForensics and others) bind to `window` under NW.js was not probed. The code-today notes assume they do (audit section 2.1).
- No performance was measured. Every tick cost is arithmetic from the assumptions in audit section 2.5.
- The generator and the ID check are not committed (docs-only lane), so the reviewer cannot rerun them from the branch. The verifier and the gate are committed and can be rerun. The JSON can also be spot-checked against the audit by hand.
- Outside evidence tables, the verifier proves only that a cited line exists. The content of those citations was checked by reading.
- The provenance of `game/data/df_lexicon.json` was not checked (audit M-13). Two tools write that file, one of them from Dwarf Fortress raws.
- Lanes Q, R and W (SIM.40.01, SIM.40.05, SIM.40.10 design) were registered on main during this run. Their designs may change the couplings in audit section 4.3.
- `escalation.md` E1 to E3 are still open for the coordinator and the Owner.
- Overlord mode is flagged, not designed (audit section 3.9, OQ-19, OQ-20).

## Try it in RMMZ

Not applicable: no game file changed.

## Decisions needed

- The 26 Owner questions in audit section 6, each with options and none answered.
- `escalation.md` E1 (WBS cross-references; coordinator), E2 (V87 against DEC-013; Owner or coordinator), E3 (DEC-017 against ADR-001; Owner).
- The coordinator records SIM.50.11 in the WBS and decides which proposed packages to mint (audit section 5).

## Final state

HEAD before the commit that adds this report: `e2c354fd3b7382a62d7a45abea2cdf5239578a60` (pasted from `git rev-parse HEAD`). A commit cannot contain its own SHA. The SHA of the commit that adds this report, and the result of `git push origin task/gap-audit-people`, are in the run's final output (`FINAL SHA:` line) and in the PM's lane log.
