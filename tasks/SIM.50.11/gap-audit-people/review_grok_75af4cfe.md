# SIM.50.11 review (Grok) of 75af4cfe273d8b51d20b6ab1f66b5b98786e8bb0

Independent review of the people-side gap audit at writer tip `75af4cfe273d8b51d20b6ab1f66b5b98786e8bb0`. The audit, the table, the brief, the report, and `escalation.md` were not edited. Checks ran in a fresh temporary clone (`git clone -c core.autocrlf=false` of this worktree, then `git checkout --detach 75af4cfe273d8b51d20b6ab1f66b5b98786e8bb0`). The clone was deleted after the checks. No art was generated.

`tasks/SIM.50.11/gap-audit-people/evidence/` is not in the tree.

## Identity

Worktree, raw:

```text
git rev-parse HEAD
75af4cfe273d8b51d20b6ab1f66b5b98786e8bb0
EXIT=0
git rev-parse origin/task/gap-audit-people
75af4cfe273d8b51d20b6ab1f66b5b98786e8bb0
EXIT=0

git log -8 --format="%H %an %s"
75af4cfe273d8b51d20b6ab1f66b5b98786e8bb0 deus-claude [claude] SIM.50.11 REPORT with raw command output, gate result and counts
e2c354fd3b7382a62d7a45abea2cdf5239578a60 deus-claude [claude] SIM.50.11 limits: cite origin/main 9f9954e5 for the unchanged-WBS check
80655177bcb8a448df65ebc549c353e768abc168 deus-claude [claude] SIM.50.11 audit sections complete; people_gap_table.json generated from the audit
6d5c12980cd73fd5feaac8c8cf99ed5877bc0f93 deus-claude [claude] SIM.50.11 WIP: interactions, order of work, Owner questions, mismatches, defects, method
a28d577c99b94caea9d80181c7d76bbd146301a0 deus-claude [claude] SIM.50.11 WIP: Lane P/M review status, G1-9/MIND-10, G8-8, OQ links, gov count fix
eb2eb6a8a99241f25e5cf91c0121f50b24ffa23f snewt [ops] SIM.50.11 lane-o2 launch prompt 20260926_034545
3ef0d154603a1fa6ed32dfc3c705cf7d8f3662e4 deus-pm [pm] WIP checkpoint after Claude usage limit
029a5bafa45c0038be8528390d34d2ca07761931 deus-claude [claude] SIM.50.11 WIP: areas 4-7
EXIT=0
```

HEAD matched `origin/task/gap-audit-people` at `75af4cfe273d8b51d20b6ab1f66b5b98786e8bb0`. The review continued.

Clone, after detach:

```text
git rev-parse HEAD
75af4cfe273d8b51d20b6ab1f66b5b98786e8bb0
EXIT=0
git rev-parse 75af4cfe273d8b51d20b6ab1f66b5b98786e8bb0^
e2c354fd3b7382a62d7a45abea2cdf5239578a60
EXIT=0
```

The parent is the commit `REPORT.md` names as HEAD before the report commit.

## Scope

`lane.json` allowedPaths: `tasks/SIM.50.11/gap-audit-people/**`, `tasks/SIM.50.11/lane-o2/**`.

```text
git diff --name-status 790387090083848959ce0b95bc560a395336fa3d 75af4cfe273d8b51d20b6ab1f66b5b98786e8bb0
A	tasks/SIM.50.11/gap-audit-people/BRIEF.md
A	tasks/SIM.50.11/gap-audit-people/PEOPLE_GAP_AUDIT.md
A	tasks/SIM.50.11/gap-audit-people/REPORT.md
A	tasks/SIM.50.11/gap-audit-people/escalation.md
A	tasks/SIM.50.11/gap-audit-people/lane.json
A	tasks/SIM.50.11/gap-audit-people/people_gap_table.json
A	tasks/SIM.50.11/lane-o2/launches/20260926_030812_prompt.txt
A	tasks/SIM.50.11/lane-o2/launches/20260926_034545_prompt.txt
EXIT=0

git diff --name-status 790387090083848959ce0b95bc560a395336fa3d 75af4cfe273d8b51d20b6ab1f66b5b98786e8bb0 -- game tools docs art
EXIT=0

git diff --stat e2c354fd3b7382a62d7a45abea2cdf5239578a60 75af4cfe273d8b51d20b6ab1f66b5b98786e8bb0
 tasks/SIM.50.11/gap-audit-people/REPORT.md | 281 +++++++++++++++++++++++++++++
 1 file changed, 281 insertions(+)
EXIT=0
```

| Path | Diff | Inside allowedPaths |
|---|---|---|
| `tasks/SIM.50.11/gap-audit-people/BRIEF.md` | A | yes |
| `tasks/SIM.50.11/gap-audit-people/PEOPLE_GAP_AUDIT.md` | A | yes |
| `tasks/SIM.50.11/gap-audit-people/REPORT.md` | A | yes |
| `tasks/SIM.50.11/gap-audit-people/escalation.md` | A | yes |
| `tasks/SIM.50.11/gap-audit-people/lane.json` | A | yes |
| `tasks/SIM.50.11/gap-audit-people/people_gap_table.json` | A | yes |
| `tasks/SIM.50.11/lane-o2/launches/20260926_030812_prompt.txt` | A | yes |
| `tasks/SIM.50.11/lane-o2/launches/20260926_034545_prompt.txt` | A | yes |
| `game/`, `tools/`, `docs/`, `art/` | no change | — |

`git log --name-only 790387090083848959ce0b95bc560a395336fa3d..75af4cfe273d8b51d20b6ab1f66b5b98786e8bb0` (EXIT=0) lists only paths under those two allowed prefixes. No intermediate commit touches anything else. The report's own `git diff --name-only` omits `REPORT.md` because that command was run before the report commit; the tip diff above includes it, and the report commit changes only that file.

## Gate

`lane.json` `gateTests[0]`, run from the clone root. Result line and exit:

```text
areas 10 bad 0 mdBytes 172250
EXIT=0
```

This is the same result line `REPORT.md` records for the final audit at `e2c354fd3b7382a62d7a45abea2cdf5239578a60`. The report commit does not change `PEOPLE_GAP_AUDIT.md` (172250 bytes measured again on the tip).

## Citation verifier (spot-check of the report)

```text
node tasks/SIM.50.01/gap-audit/verify_citations.js --commit 790387090083848959ce0b95bc560a395336fa3d --doc tasks/SIM.50.11/gap-audit-people/PEOPLE_GAP_AUDIT.md
413 citations checked, 172 verbatim excerpts checked against 790387090083848959ce0b95bc560a395336fa3d: 0 failure(s)
EXIT=0

node tasks/SIM.50.01/gap-audit/verify_citations.js --commit 790387090083848959ce0b95bc560a395336fa3d --doc tasks/SIM.50.11/gap-audit-people/PEOPLE_GAP_AUDIT.md --selftest
SELFTEST: 3/3 doctored citations reported as failures (3 failures total)
EXIT=0
```

Both lines match `REPORT.md`.

## Ten-area contract

Read from `people_gap_table.json` and checked against `PEOPLE_GAP_AUDIT.md` at the tip, and against the base `790387090083848959ce0b95bc560a395336fa3d` for ids and `file:line`.

| Check | Result |
|---|---|
| `task` | `SIM.50.11` |
| `baseCommit` | `790387090083848959ce0b95bc560a395336fa3d` |
| Areas | 10, `n` 1–10, names and order match the brief |
| Ratings | all `PARTLY PLANNED` (one of the three allowed words); summary table matches the JSON |
| `codeToday` | all `PARTIAL` (allowed enum) |
| Priorities | 1, 4, 6, 10, 8, 2, 5, 7, 9, 3. Area 1 (Individual minds) is priority 1 |
| Packages | 10, 6, 6, 5, 5, 7, 5, 5, 4, 6. Area 1 has the most (10) |
| Gaps | 73: BLOCKER 6, MAJOR 48, MINOR 19. Markdown gap rows match JSON ids and severities |
| Owner questions | 26 (`OQ-01`–`OQ-26`). Per-area counts 4, 5, 3, 4, 2, 5, 2, 3, 5, 4, matching the report |
| Mismatches / defects | markdown `M-01`–`M-14` (14), `D-1`–`D-8` (8) |
| Packages | 59, ids `PROPOSED-<AREA>-NN`, each with scope, non-empty deps, acceptance tests containing a mutant, and a tick-cost string |
| Gap coverage | every gap is closed by a package in its own area, except `G9-5` (Overlord), which has no package |
| WBS / queue / OD ids in `wbsIds` and package `deps` | 75 distinct; each has exactly one table row (or a `### Block` heading for `WB-002`) in the worldgen WBS, the society WBS, or `docs/WORK_QUEUE.md` at the base |
| `PROPOSED-(MIND\|GOV\|WAR\|CUL\|KNOW\|HEALTH\|LOG\|REC\|MODE\|DEEP)-NN` at the base | `git grep` EXIT=1, 0 lines |
| JSON `codeCitations` | 140 of 140 resolve to a line at the base |
| `interactions` | every area has non-empty `livingWorld` and `spells`. Section 4.1 names SIM.50.02 through SIM.50.10. Section 4.2 covers DEC-018, including disease vs Lesser Restoration, crime vs Charm Person and Detect Thoughts, war vs Fireball, and underground light vs Light, Daylight, and Continual Flame |
| Overlord | OQ-19 and OQ-20 only. No package text contains "overlord". Options are listed and not chosen |
| Owner questions | section 6 lists options and does not mark one as the answer |

The shared cost model (section 2.5) states 32 layers, sparse storage, the DEC-014 planning point, and the DEC-012 / ADR-003 LOD tiers. Section 5.2 rolls memory up per named person, per settlement, and per layer. Per-package lines that say "event-driven" or give microseconds are using that model. Minds stay first in the order of work (section 5.1).

## Claim sample at the base

Each line was read with `git show 790387090083848959ce0b95bc560a395336fa3d:<path>`.

| Citation | Line |
|---|---|
| `docs/worldgen/DEUS_WORLDGEN_WBS.md:4` | `**Rev:** 25` (the brief's "Rev 24" note is the mismatch M-14 records) |
| `docs/worldgen/DEUS_WORLDGEN_WBS.md:545` | `SIM.50.02` Cross-layer water dynamics |
| `docs/worldgen/DEUS_WORLDGEN_WBS.md:99` | `WG.00.11` Incarnation & Command Layer |
| `docs/OWNER_DECISIONS.md:184` | DEC-013 nine races (line exists; verifier covers the backtick citation) |
| `docs/OWNER_DECISIONS.md:243` | DEC-017 battle screens |
| `docs/adr/ADR-001-RMMZ-Battle-Stack-Audit.md:37` | Project DEUS does not use `Scene_Battle` |
| `docs/VISION.md:98` | V87 |
| `docs/VISION.md:126` | V132 spawn levels |
| `DEUS_Colonists.js:5111` | Objective 2 (2026-09-22) wiped needs, moods, wandering |
| `DEUS_Core.js:345` | `UF.Events.emit("time:year", this.year);` — `git grep time:year` in `game/js` at the base returns this one line (EXIT=0) |
| `DEUS_Factions.js:546` | `Factions.setRelation`. Callers found are test fixtures (`DEUS_Doors.js` reason `"TEST"`, `DEUS_Stance.js` "stance check", `DEUS_Talk.js` inside a test that spawns `TEST_partner`, `DEUS_Factions.js:1706` inside `skins.stranger_in_talk` which spawns `TEST_skinStranger`). `adjust` has no caller (`git grep` EXIT=1). `modifyStanding` is only the definition at `DEUS_Factions.js:669` |
| `DEUS_Conditions.js:1117` | `tick(unit, currentTick = now())`. `tickAll` (line 1159) is the only caller of `this.tick`, and `tickAll` itself has no caller (`git grep tickAll` returns only the definition, EXIT=0) |
| `DEUS_Jobs.js:1412` | `sameLevel(j.target, unit)` on haul candidates |
| `DEUS_History.js:869` | `eventsKept) \|\| 400` |
| `DEUS_Levels.js:1038` | `const fluid = z === -2 ? M_LAVA : M_WATER;` |
| `DEUS_DayNight.js:83` | `if (underground(z)) return KEYS[0].tone.slice();` |
| `game/data/srd51/character_options.json:82` | Dwarf Darkvision trait text |
| `game/data/srd51/spells.json:3415` | Charm Person |
| `game/data/srd51/spells.json:10490` | Lesser Restoration, "one disease or one condition" |
| `game/data/srd51/creatures.json:16444` | Duergar Sunlight Sensitivity text |

Recounts at the base:

- Creatures: 317 entries. `senses.darkvision` on 175. Sunlight Sensitivity trait on 7. One other record mentions darkvision outside `senses`: Darkmantle. Races: Dwarf, Elf, Gnome, Half-Elf, Half-Orc, Tiefling have a Darkvision trait; Halfling, Dragonborn, and Human do not.
- `git grep -c -i underdark 790387090083848959ce0b95bc560a395336fa3d -- game/data/srd51` EXIT=1, no lines.
- Word searches in `game/js/plugins` at the base, same patterns as the report: crime/law terms EXIT=1 (0 lines); religion terms EXIT=1 (0 lines); control word `leader` EXIT=0 with the same eight files and the same per-file counts the report prints.
- Lane P object `c9d1ed864cbd1ca0d6f5249e2607e2c833830f01` is a commit. `docs/audits/srd_spell_effect_audit.json` `meta.counts` says records 319, `bySystem.NONE` 208, `bySystem.LIGHT` 26. `crossLayer` on the 319 records: `targets-through-openings` 206, `none` 85, `falls/flows-down` 15, `breaches-floor` 13. That matches the report. 319 − 208 = 111 physical.

## Art (DEC-007)

The tip diff contains no `art/` path and no image, sprite, or model file. The only art language in the new files is the prohibition itself and text-only "art slot needed" lines (`PEOPLE_GAP_AUDIT.md` cultural-works package and the underground-package note). No package proposes a tint, fog filter, shading overlay, or scaling. Darkness on screen is recorded as defect D-6 and Owner question OQ-26.

```text
git grep -n -i -E "image_gen|generate art|art generation|make art|draw a sprite|art slot" 75af4cfe273d8b51d20b6ab1f66b5b98786e8bb0 -- tasks/SIM.50.11
```

EXIT=0. Hits are the brief's DEC-007 rules, the two launch prompts' "NO ART" lines, and the audit's "art slot needed" / "No images" sentences. Nothing asks for an image to be made.

## Findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

1. Section 3.9 says a case-insensitive search of the base for "overlord", excluding this lane's folder, finds only `docs/design/CRAFTING.md:71`, `docs/design/PEOPLES.md:53`, `docs/design/PEOPLES.md:278`, `game/data/df_entities.json:95`, and two tools. The same search also hits `docs/design/PEOPLES.md:43` (the "Never" cell that lists the Zerg unit name Overlord). The two tools are `tools/compile_world_data.ps1:135` and `tools/parse_df_raws.ps1:175`. Line 43 is another banned-name hit, not a player mode, so the Overlord conclusion (undefined, OQ-19 and OQ-20, no package) still holds. The "finds only" list is one line short.

```text
git grep -n -i overlord 790387090083848959ce0b95bc560a395336fa3d -- . ":(exclude)tasks/SIM.50.11"
EXIT=0
790387090083848959ce0b95bc560a395336fa3d:docs/design/CRAFTING.md:71
790387090083848959ce0b95bc560a395336fa3d:docs/design/PEOPLES.md:43
790387090083848959ce0b95bc560a395336fa3d:docs/design/PEOPLES.md:53
790387090083848959ce0b95bc560a395336fa3d:docs/design/PEOPLES.md:278
790387090083848959ce0b95bc560a395336fa3d:game/data/df_entities.json:95
790387090083848959ce0b95bc560a395336fa3d:tools/compile_world_data.ps1:135
790387090083848959ce0b95bc560a395336fa3d:tools/parse_df_raws.ps1:175
```

## Acceptance

The ten areas are rated with WBS and DEC citations that resolve at the base. Individual minds is priority 1 and has the fullest package outline. Every non-Overlord gap has a package with dependencies, a mutant test, and a tick-cost estimate under the 32-layer sparse model. SIM.50.02–.10 and DEC-018 are covered. Overlord is flagged and not designed. Owner questions are listed and not answered. Proposed ids do not collide with a real WBS id. No file outside allowedPaths changed. No code or art was committed. The audit does not certify itself.

VERDICT: PASS
