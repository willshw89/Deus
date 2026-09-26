# Grok review: SIM.40.10 lane-w population lifecycle design

Independent review of writer tip `bed949e839c4b9a06d467a6f36be50891fd70be5`. This file does not change the design. No art was generated, requested, or integrated.

## Tip check (live worktree, before the temp clone)

`git rev-parse HEAD origin/task/lane-w` then `git log -8 --format="%H %an %s"`:

```
bed949e839c4b9a06d467a6f36be50891fd70be5
bed949e839c4b9a06d467a6f36be50891fd70be5
bed949e839c4b9a06d467a6f36be50891fd70be5 deus-claude [claude] SIM.40.10 population design: REPORT with gate output
9a231cd80ec39c0e2efa55842dcd6532f3cc500b deus-claude [claude] SIM.40.10 WIP: read-back corrections (SRD weights, water family, bone, arithmetic)
4ae8c941ead9bc39dec604c3df48f4b90740d047 deus-claude [claude] SIM.40.10 WIP: trace.json and citation path fixes
2d24a7499f80c5b4ce6c590489cce9afc0723f51 deus-claude [claude] SIM.40.10 WIP: population design part 3 (dormant code, hooks, cost, tests, WBS, Owner questions)
ca2c3c11e7761fdfe74ec7a3ddafc90533af2900 deus-claude [claude] SIM.40.10 WIP: population design part 2 (capacity, nine races, LOD, migration)
a86d43e30970c597cd7e2f74d1033a6df532efb3 deus-claude [claude] SIM.40.10 WIP: population design part 1 (lifecycle, lineage, reproduction and mass)
4f2ea274ecbcbb7602eb0709bbf61af0548d5743 snewt [ops] SIM.40.10 lane-w launch prompt 20260926_034719
e1712246d740792861382a1939b222a7d28de1f9 snewt [ops] SIM.40.10 lane-w launch prompt 20260926_033122
```

HEAD equals `origin/task/lane-w` at `bed949e839c4b9a06d467a6f36be50891fd70be5`. Review continued.

`escalation.md` is not in the tip. `evidence/` is not in the tip. `git ls-tree -r --name-only HEAD -- tasks/SIM.40.10/lane-w` lists the seven paths in the scope table below.

## Temp clone

```
git clone -c core.autocrlf=false <lane-w worktree> C:\Users\snewt\AppData\Local\Temp\lane-w-review-bed949e8
EXIT=0
```

Detached in that clone (not the live worktree):

```
git rev-parse HEAD
bed949e839c4b9a06d467a6f36be50891fd70be5
HEAD_EXIT=0
git checkout --detach bed949e839c4b9a06d467a6f36be50891fd70be5
DETACH_EXIT=0
git rev-parse HEAD
bed949e839c4b9a06d467a6f36be50891fd70be5
HEAD_EXIT=0
```

## Scope

`git diff --name-status 84ee3b55f3f8c1b8a16710ccf3878795d98d1683 bed949e839c4b9a06d467a6f36be50891fd70be5` (`DIFF_EXIT=0`). Tabs shown as `TAB`:

```
A TAB tasks/SIM.40.10/lane-w/BRIEF.md
A TAB tasks/SIM.40.10/lane-w/REPORT.md
A TAB tasks/SIM.40.10/lane-w/SIM.40.10_POPULATION_LIFECYCLE.md
A TAB tasks/SIM.40.10/lane-w/lane.json
A TAB tasks/SIM.40.10/lane-w/launches/20260926_033122_prompt.txt
A TAB tasks/SIM.40.10/lane-w/launches/20260926_034719_prompt.txt
A TAB tasks/SIM.40.10/lane-w/trace.json
DIFFTAB_EXIT=0
```

| Status | Path | Inside `tasks/SIM.40.10/lane-w/**` |
|---|---|---|
| A | `tasks/SIM.40.10/lane-w/BRIEF.md` | yes |
| A | `tasks/SIM.40.10/lane-w/REPORT.md` | yes |
| A | `tasks/SIM.40.10/lane-w/SIM.40.10_POPULATION_LIFECYCLE.md` | yes |
| A | `tasks/SIM.40.10/lane-w/lane.json` | yes |
| A | `tasks/SIM.40.10/lane-w/launches/20260926_033122_prompt.txt` | yes |
| A | `tasks/SIM.40.10/lane-w/launches/20260926_034719_prompt.txt` | yes |
| A | `tasks/SIM.40.10/lane-w/trace.json` | yes |

No path is outside `allowedPaths`. Filtering the name-only diff for paths that do not start with `tasks/SIM.40.10/lane-w/` printed no lines. No `game/`, `tools/`, `docs/`, or `art/` path is in the diff. The diff is markdown, JSON, and the two launcher prompts. No image, binary, script, or code file.

## Gate

`lane.json` `gateTests[0]` spawned unchanged from the temp clone root (`node` with the `-e` script in `lane.json`):

```
task SIM.40.10 reqs 12 missing none bad none missingHeadings none ownerQuestions 11 mdBytes 91749
GATE_EXIT=0
```

Node also printed a `NO_COLOR` / `FORCE_COLOR` warning on stderr. The gate status is 0.

Independent recount of the same files: `mdBytes 91749`; requirements `W-01`..`W-12` in order; status counts `COVERED` 10, `PARTIAL` 2 (`W-04`, `W-06`), `OWNER_QUESTION` 0; packages `PROPOSED-W-01`..`PROPOSED-W-10`; owner questions `OQ-W-01`..`OQ-W-11`. `COUNT_EXIT=0`. This matches REPORT.md.

## Spot checks against the design and the base commit

Base used for `git show` / `git grep`: `84ee3b55f3f8c1b8a16710ccf3878795d98d1683`.

Citation existence. Every backticked `path:line` or `path:line-line` in the design was resolved at that base (bare plugin names under `game/js/plugins/`).

```
backtickSpans 152
uniqueLineCites 85 ok 85 bad 0
CITE_EXIT=0
```

That matches the report's "unique full-path citations 85 bad 0". Sampled line text also matches the claims:

- `DEUS_Colonists.js:2315` is `if (pop >= 200) return 0.0;`; `:2886` is `if (pop >= 200) continue;`; `:2640` is `age: 2`; `:2540` is `progressPregnancies`; `:2547` decrements `secondsLeft`; `:2799` is `progressAging`; `:2806` is `age++`; `:2807-2816` assign `elder` / `adult` / `teen` / `child` / `baby`; `:2828` is `checkOldAgeMortality`; `:1521` is `FOOD_LB_PER_DAY = 1`; `:3243` uses elder at 55.
- `DEUS_HistoricalDemographics.js:128-136` match the design table (human `[60, 90]`, elf `[350, 750]` birthChance 0.025, dwarf `[250, 350]` 0.09, gnome `[350, 500]` 0.05, tiefling `[70, 110]`, and the other five rows).
- `DEUS_Ecology.js:46-47` are `PREY_FLOOR = 8` and `MONSTER_FLOOR = 2`; `:509` is `attemptSpawn`; `:548` is `W.addUnit`; `:661` is `stepBreeding`; `:684` is `count >= 2`.
- `DEUS_Wildlife.js:1158` defines `tick`; a search for `.tick(`, `Wildlife.tick`, or `tick: tick` in `DEUS_Wildlife.js` and `UF_Wildlife.js` at the base returned no match (`CALL_EXIT=1`). `:1197` says the AI update loop was wiped. `:543` is `ai: null`. `:525-526` plan underground herds at `-1` and `-2` (surface comes from `planArea` on `:523`).
- `DEUS_World.js:255` is `Z_STEP_FEET: 5`; `:1550` is `World.moveUnitToLevel`; `:1809` is the off-screen goal step.
- `DEUS_WorldCatalog.json` people stats: human `:7322` `{}`, elf `:7329-7331` `dex 2, con -1`, dwarf `:7339-7341` `con 2, cha -1`, gnome `:7349-7351` `int 2, str -2`, half-elf `cha 2, dex 1, con 1`. `factions.layers` `:7413-7429` is layer 0 human/elf/halfling/half-elf/half-orc, `-1` dwarf/gnome, `-2` tiefling/dragonborn. Cultures (`:9306`): human Settlers, elf Grove-keepers, dwarf Stone-holders, gnome Tinkers, plus goblin, orc, automaton. Deer `:6261` yields `meat_raw 3, hide 1, bone 2`. `remainsHours` `:9922` is 12. Wildlife species count is 23: 7 grazer, 1 vermin, 7 predator, 3 flier, 5 monster.
- SRD race ids sit on the cited `character_options.json` lines (45, 123, 197, 366, 525, 626, 692, 810, 882). Kind `race` is exactly those nine names. `rules.json:4403` contains the one-pound food rule, the half-ration sentence, the `3 + Constitution modifier (minimum 1)` limit, and the gallon water rule. `rules.json:10533` is the SRD 5.1 exhaustion condition: six levels, level 6 death. `rules.json:9005` is the size-category table (Tiny 2½×2½ through Gargantuan). `creatures.json` lines 33428, 35073, 37834, and 42377 are troll, zombie, draft-horse, and goat.
- `docs/VISION.md:339-341` is the V123 stage table, 240-second year, and the mortality curve the design quotes. `docs/design/PEOPLES.md:5` is the eleven-faction note; `:575` is PE11. `docs/OWNER_DECISIONS.md:172-191` band ranges match section 4.4 exactly (Lower-2 `-16..-9`, Lower-1 `-8..-1`, Surface `0..+3`, Upper-1 `+4..+9`, Upper-2 `+10..+15`). Home-range mapping is OPEN there. `DEUS_Objects.js:162` is the `12` month × `28` day hour formula.
- Worldgen WBS row `SIM.40.10` (line 543) depends only on `SIM.40.02`. `SIM.50.04` exists as a PLANNED row (line 547). `SIM.40.08` exists (line 541).

ADR-003 Rev 3 was read with `git show 9e0ef94d36ace947ea30426a107e0a80e434f3be:docs/adr/ADR-003_sim_render_split_and_lod.md` (`origin/task/lane-m`, `ADR_REF_EXIT=0`). It states a region of 32×32 cells × a 2-layer slab, 64 regions per slab, 1,024 regions at 32 layers, 320 at 9 layers, 192 at 5 levels, L0 every tick, L1 every 10, L2 every 100 ticks (1 game hour), `MAX_L0 = 64`, the `ledger.transform(fromForm, toForm, family, massUnits, cause)` signature, Q-POP / Q-FACTPOP / Q-MASS, owned-or-tamed animals tracked, crowd LOD for people as Q14, and time budgets PENDING-K3. The design's region, LOD, ledger, and stale-model arithmetic match that text, and those uses are marked PROPOSED.

Required content. All 13 headings the gate names are present. Lifecycle, lineage, food-mass reproduction, and carrying capacity are specified per species class, with SRD age text for the nine races and zoology defaults flagged where the SRD is silent. Each race has a culture-plan slot; D-6 is tagged; `plan.homeRange` stays OPEN. LOD section 6.3 has an exact conservation table for counts, mass, tracked ids, faction population, and people lineage counts. Migration dependencies M-1..M-10 name movement (SIM.00.04), seasons blocked on D-1, and regions (SIM.30.01-.02). D-1 is not chosen: section 0.1 maps durations under both options, and only `HOURS_PER_YEAR` depends on it. D-4 is tagged on the drink entry and the water ratio. Ledger steps name from-form, to-form, family, and cause. No lifecycle row creates ore; `remains.bone` is kept out of ore and T-MASS-3 is the mutant for `bone → ore`. `spawn:<id>` is the only source. Sparse forms are stated for memory and for the save (section 10.3). Triggers are due-date queue, region coarse steps for regions that hold state, and mutation events. Worked arithmetic is in sections 1.4, 2.2, 4.6, 6.5, and 10 (the 12.5 events/s and 0.037/s figures, the 3.8 MB stub bound, `ceil(1024/100) = 11`, and `200/100 = 2` all recompute). Sixteen acceptance tests each have a mutant. Packages are `PROPOSED-W-01`..`PROPOSED-W-10`, not minted WBS ids. Owner questions OQ-W-01..OQ-W-11 have options; section 13 says none is answered there. W-04 and W-06 are PARTIAL for the reasons the trace gives (unsourced forage and predation constants; budget and people crowd LOD still open). The writer files do not call this work done.

No livestock string at the base:

```
git grep -n -i livestock 84ee3b55f3f8c1b8a16710ccf3878795d98d1683 -- game/js/plugins game/data/DEUS_WorldCatalog.json
LIVESTOCK_EXIT=1
```

No output. Matches the report.

## DEC-007

This tip adds no art. The seven-path diff has no image or binary. The design states that no art was written and does not ask for image generation, a palette, or a drawing. Population stages are data names and ledger forms, not render instructions.

## Findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

1. REPORT.md says `git show 84ee3b55:<WBS file> | grep -c "^| **<id>"` returned exactly one row for each of the 17 `proposedPackages` dependency ids. Re-run at `84ee3b55f3f8c1b8a16710ccf3878795d98d1683`: the bold pattern `| **<id>` hits once for `WG.62.02`, `WG.65.15`, `SOC.10.01`, `SOC.10.02`, and `SOC.10.03`, and hits zero times for all twelve `SIM.*` ids. Those worldgen rows are `| SIM.xx.yy |` with the id not bolded. The unbolded pattern `| <id> |` hits exactly once for each of those twelve. The dependencies are real WBS rows. The command string in the report does not reproduce for the SIM ids.

## Result

Scope is inside the lane. The gate exits 0 with the reported line. Sampled code, SRD, DEC-013, WBS, and ADR-003 citations resolve. No art.

VERDICT: PASS
