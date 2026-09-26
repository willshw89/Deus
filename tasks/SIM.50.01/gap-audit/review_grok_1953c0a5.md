# SIM.50.01 review (Grok) of 1953c0a5544f327a921b50ec4d66c69935c31ce3

Independent review of the living-world gap audit. The audit, the evidence note, and the two helper scripts were not edited. Checks ran in a fresh temporary clone (`git clone -c core.autocrlf=false` of this worktree, then `git checkout --detach`), against code at `75cf2ff399e5fdbce1f69e7178e4cb4329374eee`. The clone was deleted after the checks.

## Identity

Worktree commands, raw:

```text
git rev-parse HEAD origin/task/gap-audit
1953c0a5544f327a921b50ec4d66c69935c31ce3
1953c0a5544f327a921b50ec4d66c69935c31ce3
EXIT=0

git log -3 --format="%H %an %s"
1953c0a5544f327a921b50ec4d66c69935c31ce3 deus-claude [claude] SIM.50.01: Living world gap audit
75cf2ff399e5fdbce1f69e7178e4cb4329374eee snewt [gemini] Telemetry: record Lane N writer exit 0 at tip 2f2a1ff2
56bcd0badf3f20ff544a823908777f46faf588ca snewt [gemini] Telemetry: update tips for active workers Lane K (983a9e46) and Lane N (b4f89753)
EXIT=0
```

Reviewed writer tip: `1953c0a5544f327a921b50ec4d66c69935c31ce3`. HEAD matched `origin/task/gap-audit`. The review continued.

Clone, after detach:

```text
HEAD is now at 1953c0a5 [claude] SIM.50.01: Living world gap audit
git rev-parse HEAD
1953c0a5544f327a921b50ec4d66c69935c31ce3
EXIT=0
```

## Scope

```text
git diff --name-status 75cf2ff399e5fdbce1f69e7178e4cb4329374eee 1953c0a5544f327a921b50ec4d66c69935c31ce3
Adocs/audits/LIVING_WORLD_GAP_AUDIT.md
Atasks/SIM.50.01/gap-audit/EVIDENCE.md
Atasks/SIM.50.01/gap-audit/probe_fluid_require_binding.js
Atasks/SIM.50.01/gap-audit/verify_citations.js
EXIT=0
```

`git diff --name-status 75cf2ff399e5fdbce1f69e7178e4cb4329374eee 1953c0a5544f327a921b50ec4d66c69935c31ce3 -- game tools` printed no paths. EXIT=0.

| Path | Diff | Inside allowedPaths | Judgment |
|---|---|---|---|
| `docs/audits/LIVING_WORLD_GAP_AUDIT.md` | A | yes (`docs/audits/LIVING_WORLD_GAP_AUDIT.md`) | The audit deliverable |
| `tasks/SIM.50.01/gap-audit/EVIDENCE.md` | A | yes (`tasks/SIM.50.01/gap-audit/**`) | Run log for the helpers and the lane gate |
| `tasks/SIM.50.01/gap-audit/verify_citations.js` | A | yes | Read-only evidence helper. It `git show`s the named commit and compares citations. It does not write the repo |
| `tasks/SIM.50.01/gap-audit/probe_fluid_require_binding.js` | A | yes | Read-only evidence helper. It loads `DEUS_Fluid.js` from `git show` into a temp file under the OS temp directory, requires that copy, then deletes it. It is not loaded by the game |
| `game/` | no change | — | Clear |
| `tools/` | no change | — | Clear |

The two `.js` files are evidence helpers, not product code. `lane.json` allows `tasks/SIM.50.01/gap-audit/**`. Untracked `BRIEF.md` and `lane.json` are not in the commit.

## Citation sample

Each row was read with `git show 75cf2ff399e5fdbce1f69e7178e4cb4329374eee:<path>` in the clone. TRUE means that line exists and the text is the line the audit cites.

| # | System | Citation | Result | Line at 75cf2ff3 |
|---|---|---|---|---|
| 1 | Water | `DEUS_Fluid.js:44` | TRUE | `var UF = UF \|\| {};` |
| 2 | Water | `DEUS_Fluid.js:224` | TRUE | `if (data.inQueue[cellId] === 1) return; // Already dirty and queued` |
| 3 | Water | `DEUS_Fluid.js:398` | TRUE | `if (canDrainDown(ax, ay, x, y, z)) {` |
| 4 | Water | `DEUS_WorldGen.js:748` | TRUE | `WorldGen.isWaterAt = (gx, gy, z = 0) => z === 0 ? waterModels(UF.World.state).isWater(gx, gy) : !!((WorldGen.cellInfo(gx, gy, z) \|\| {}).water);` |
| 5 | Water | `DEUS_Levels.js:3389` | TRUE | `gridMinus1[i] = liq0 === "lava" ? FLOOD_LAVA : FLOOD_WATER;` |
| 6 | Erosion | `DEUS_Levels.js:2053` | TRUE | `water_channel: { form: "line", len: [24, 60], half: [1.0, 2.0], profile: "u", bend: 1.3, deep: false },` |
| 7 | Erosion | `DEUS_WorldGen.js:683` | TRUE | `// Arid, dry or well-drained basins form sedimentary sandstone` |
| 8 | Vegetation | `DEUS_Ecology.js:606` | TRUE | `const spreadRate = isTree ? 0.20 : (isBush ? 0.35 : 0.50);` |
| 9 | Vegetation | `DEUS_Ecology.js:739` | TRUE | `{ sprout: "rocks_small", matures: ["ironstone", "copper_outcrop", "granite_boulder", "gold_outcrop"], weights: [4, 3, 2, 1], delay: 150 },` |
| 10 | Vegetation | `DEUS_Ecology.js:998` | TRUE | `stepBeat();` (called from `Game_Map.prototype.update` every 60 frames) |
| 11 | Fire | `DEUS_Fire.js:531` | TRUE | `const keys = Object.keys(f.burning);` |
| 12 | Fire | `DEUS_Fire.js:442` | TRUE | `for (const it of I.atIn(p.area, p.x, p.y)) if (I.remove(it.id)) destroyed++;` |
| 13 | Seasons | `DEUS_Core.js:359` | TRUE | `if (h >= 6 && h < 12) return "Spring";` |
| 14 | Seasons | `DEUS_Core.js:324` | TRUE | `this.year++; // 1 day/night cycle per year` |
| 15 | Seasons | `DEUS_Environment.js:114` | TRUE | `const roll = (hash >>> 0) % 100;` (roll assigns only clear, overcast, rain, downpour) |
| 16 | Migration | `DEUS_Wildlife.js:1197` | TRUE | `// AI update loop wiped per Objective 2` |
| 17 | Migration | `DEUS_Wildlife.js:543` | TRUE | `ai: null,` |
| 18 | Land | `DEUS_Jobs.js:459` | TRUE | `const yields = mat === "soil" ? { stone: 1 } : { stone: 2 };` |
| 19 | Land | `DEUS_Interact.js:53` | TRUE | `const DIG_STONE_ONE_IN = 4; // a dig drops a stone 1 time in 4 (seeded)` |
| 20 | Settlements | `DEUS_Projects.js:135` | TRUE | `const PHASES = ["camp", "village", "town"];` |
| 21 | Settlements | `DEUS_HistoricalDemographics.js:521` | TRUE | abandonment year is recorded when population is 0; `isRuined` is not set |
| 22 | Geology | `DEUS_Levels.js:2051` | TRUE | `karst_sinkhole: { form: "round", r: [2.5, 5.5], profile: "funnel", deep: true },` |
| 23 | Support | `DEUS_Levels.js:1941` | TRUE | `*  collapse rules in 19A). */` on `effectiveSupport`, comment says diagnostic |
| 24 | Reproduction | `DEUS_Colonists.js:5754` | TRUE | live `Game_Map.update` calls `tickNeeds()` and then `scan()`; it does not call `progressPregnancies` |
| 25 | Plans | `game/data/DEUS_WorldCatalog.json:8158` | TRUE | `"plans": {` |
| 26 | Invariants | `DEUS_Levels.js:61` | TRUE | `const LEVELS = Object.freeze([-2, -1, 0, 1, 2]);` |
| 27 | Invariants | `DEUS_Levels.js:993` | TRUE | `const STRATA = 5, CELL_FT = 5;` |
| 28 | Invariants | `DEUS_Levels.js:1037` | TRUE | dense `Uint8Array(n * STRATA)` |
| 29 | VISION | `docs/VISION.md:84` | TRUE | V74 ends with finite mineral deposits not silently respawning |
| 30 | Archive | `archive/plugins/DEUS_Time.js:314` | TRUE | day-of-year seasons comment |

Sample count: 30. FALSE count: 0. A wider pull of 70 cited lines in the same clone also resolved (0 out of range).

Committed verifier, run in the clone:

```text
node tasks/SIM.50.01/gap-audit/verify_citations.js
353 citations checked, 231 verbatim excerpts checked against 75cf2ff3: 0 failure(s)
EXIT=0

node tasks/SIM.50.01/gap-audit/verify_citations.js --selftest
SELFTEST: 3/3 doctored citations reported as failures (3 failures total)
EXIT=0
```

Fluid probe, same clone (the script is read-only toward the repo):

```text
node tasks/SIM.50.01/gap-audit/probe_fluid_require_binding.js
DEUS_Fluid.js at 75cf2ff3
A require():      window.UF.Fluid set: false; module.exports is the Fluid API: true; UF.Events listeners attached: 0; Game_Map.update patched: true
B classic script: window.UF.Fluid set: true; UF.Events listeners attached: 7; Game_Map.update patched: true
RESULT: require() leaves window.UF.Fluid unset; a classic script sets it
EXIT=0

node tasks/SIM.50.01/gap-audit/probe_fluid_require_binding.js --control
RESULT: unexpected (the contrast did not hold)
EXIT=1
```

The control exit 1 matches the script's contract. Lane gate in the clone:

```text
node tools/governance/check_wbs_integrity.js
INTEGRITY AUDIT SUMMARY: 15 passed, 0 failed
EXIT=0
```

Appendix A line numbers are not in the verifier's `` `file:line` `` form. Twenty of them were opened anyway (`DEUS_Levels.js` 150, 1137, 1805, 1835, 5019; `DEUS_World.js` 155, 156, 255; `DEUS_Minimap.js` 59; `DEUS_Depth.js` 166; `DEUS_DayNight.js` 64; `DEUS_History.js` 4060; `DEUS_Colonists.js` 132; `DEUS_Fire.js` 255; `DEUS_Objects.js` 68; `UF_Households.js` 58; `DEUS_Environment.js` 191, 226; `DEUS_WorldGen.js` 1444; `DEUS_Fluid.js` 57). Each line is a 5-level literal, a range check, or a feet-per-level constant, as the appendix says.

## Grade checks

The audit's words map onto the brief as PRESENT = exists, PARTIAL = partial, ABSENT = missing. DORMANT is an extra word for code that exists and is not on the live path. Grades below were checked against the code at `75cf2ff3`, and against the WBS rows in `docs/worldgen/DEUS_WORLDGEN_WBS.md` (SIM.50.02–.10 at lines 537–545, SIM.40.01–.02, SIM.40.05, SIM.40.10).

| System | Audit grade | Code read | Grade holds |
|---|---|---|---|
| SIM.50.02 water | PARTIAL | Dirty queue, gravity-first drop, and lateral equalisation exist (`DEUS_Fluid.js:224`, `:398`, `:462`). `git grep` of `porosit\|permeab` in `game/js/plugins` at this commit: 0 hits. Surface water is a worldgen predicate (`DEUS_WorldGen.js:748`). Legacy flood fill writes water with no volume (`DEUS_Levels.js:3389`). Drinking (`DEUS_Jobs.js:923`) only lowers thirst. | Yes. Partial |
| SIM.50.03 erosion | ABSENT | Channel carve is a generator shape (`DEUS_Levels.js:2053`). `git grep` of erosion/sediment/alluvial/silt in `game/js/plugins`: two "sedimentary" rock comments in `DEUS_WorldGen.js` (683, 687). | Yes. Missing |
| SIM.50.04 vegetation | PARTIAL | Hourly spread, density cap, and sapling delay exist (`DEUS_Ecology.js:581`, `:606`, `:639`, `:642`). `stepBeat()` runs from map update and matures `rocks_small` into iron, copper, granite, and gold (`:739`, `:785`, `:998`). Header at line 20 says ore is finite. | Yes. Partial, and LIFE-002 is a live path |
| SIM.50.05 fire | PARTIAL | Burning-cell list, 4-neighbour catalog spread, fuel countdown, item deletion (`DEUS_Fire.js:531`, `:61`, `:554`, `:442`). Word-boundary `wind` in `DEUS_Fire.js` and `DEUS_Environment.js`: 0 hits. The only `wind` hits in `game/js/plugins` are the month `Ash-Wind` (`DEUS_Core.js:240`) and the feat `Second Wind` (`DEUS_Dnd5e.js:175`). | Yes. Partial |
| SIM.50.06 seasons | PARTIAL | `seasonName` is the quarter of the hour (`DEUS_Core.js:357-362`). `year++` once per day/night (`:324`). `monthIndex` writes are init, reset, save/load, and an Anim test helper (`DEUS_Anim.js:1884`). `time:season` is emitted once (`DEUS_Core.js:328`) and has no other hit in `game/js`. `getWeather` stores one roll and never selects snow (`DEUS_Environment.js:116-120`). `UF.Agriculture` is only called, never defined, in `game/js`. | Yes. Partial |
| SIM.50.07 migration | ABSENT (movement DORMANT) | Herds spawn on `world:created` (`DEUS_Wildlife.js:1311`) with `ai: null` (`:543`). `function tick()` at 1158 is the only `tick()` hit in that file. The map-update hook at 1194-1198 does not call it. `moveUnitToLevel` is not called from `DEUS_Wildlife.js`. | Yes. Migration missing; the movement AI is dormant |
| SIM.50.09 settlements | PARTIAL | Phases are camp, village, town (`DEUS_Projects.js:135`). Town threshold is 16 (`:65`). `isRuined` is initialized false (`DEUS_HistoricalDemographics.js:319`) and read at `DEUS_History.js:547`. No assignment sets it true. `game/data/plans` is absent (`git cat-file` EXIT=128). See MINOR below on the "never steps back" sentence. The PARTIAL grade still matches: no hamlet/city/capital, no ruins, no re-founding. | Yes. Partial |
| SIM.50.10 geology | ABSENT | Sinkholes and volcanic features are generator tables (`DEUS_Levels.js:2051`, `:2042`). Lava on z = -2 is a generation material (`:1038`). No earthquake or eruption function in `game/js/plugins`. | Yes. Missing |
| SIM.40.01–04 support | ABSENT | `effectiveSupport` is commented as a diagnostic with no collapse rules (`DEUS_Levels.js:1940-1947`). `applyVolumeDamage` calls in `game/js` are the definition, the export, comments, and the self-test at line 5682. | Yes. Missing |
| SIM.40.10 reproduction | PARTIAL / DORMANT | Herd birth runs when count is at least 2 (`DEUS_Ecology.js:684`). `progressPregnancies` and `progressAging` are called from the history loop (`DEUS_History.js:2383`, `:2386`). The live colonist hook calls `tickNeeds` and `scan` only (`DEUS_Colonists.js:5754-5755`). | Yes |

Memory arithmetic in section 2.3 matches the allocations. Fluid per touched area is 5 grids + 5 flood grids + one `inQueue` of `5 * n` bytes = 983,040 bytes (`DEUS_Fluid.js:179-190`). Path scratch is 72 bytes per node (`DEUS_World.js:1893-1900`) times `5 * n` (`:1957`).

## Owner questions and self-certification

Section 9 lists D-1 through D-6 as open questions with options. None is recorded as an Owner decision. Section 6 says the writer does not change WBS statuses. The document does not certify the audit, the WBS leaves, or a review verdict. The verifier output in section 10 was re-run here and matched.

## Findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

1. Settlements, section 3.8. The evidence row for `DEUS_Projects.js:579` says nothing ever steps a phase back down. `phaseOf` (`DEUS_Projects.js:571-579`) is recomputed on each deficits pass (`:560`). It returns `"camp"` when population is 0 or when shelter, food, or storage is short (`:573`, `:578`), and `"village"` when population is below `townPopulation` (16, line 65). A later evaluation can report a lower phase than an earlier one. There is still no abandonment, ruin, or re-founding, so the PARTIAL grade and SET-1 (no live contraction of the settlement) stay correct. The monotonic-phase sentence does not.

## Follow-up coverage (not a FAIL)

Read from `git show origin/main:docs/OWNER_DECISIONS.md`. These decisions are later than the brief's required list. Absence here is a follow-up, not a failure of SIM.50.01.

| Decision | Covered by this audit? |
|---|---|
| DEC-019 stratum height and movement | No. D-2 records the 1 ft / 5 ft code against DEC-013's 2 ft / 10 ft layers, and SUP-4 notes that `fallDamage\|unitFell\|fallThrough` has no hits. The audit does not cover a pixel offset per stratum, the 2 ft step / 4 ft climb / 10 ft stair-ladder-ramp rules, melee reach, or line-of-sight elevation. |
| DEC-020 seamless ramps | No. No continuous ramp transfer, camera-follow on layer cross, or colonist-built ramps. A ramp appears only as a shape that keeps three strata (`DEUS_Levels.js:1361`). |
| DEC-022 cross-layer targeting | Incidental only. Section 2.4 and SUP-5 cover `applyVolumeDamage` (self-test caller only) and missing blast attenuation. The audit does not cover 3D targeting through openings, Euclidean range, falling-projectile impact, an upward range penalty, or a lower-layer targeting UI. |
| DEC-018 hyper-realistic SRD spell effects | No spell schema and no SIM.60 rows. The physical pieces those spells would drive are in the nine-system audit (fire spread, water, absent freeze in SEA-4, terrain writes, volume damage). The open sub-question on conjured matter versus LIFE-001 is not asked. |

## Required coverage

The nine systems SIM.50.02–.10 are each graded against code, with the WBS "Required" behaviour and the VISION rows the brief names (V133, V136/DEC-013, V137, V138, V139/DEC-014, V140, V141/DEC-015, V142, LIFE-001..003). Coupled systems SIM.40.01–.04, SIM.40.05–.09, SIM.40.10, and DEC-015 each have a section and a row in the summary table. The invariant matrix in section 5 covers 32 layers, sparse storage, DEC-014 / LOD, V133, and LIFE-001..003 for every system.

VERDICT: PASS
