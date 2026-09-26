# SIM.40.01 review (Grok) of 9d5b40d32f96a38803b1f32f78287a902d2bead8

Independent review of Lane Q (structure, material and support/collapse design). The design, trace, report, escalation, brief and lane manifest were not edited. Checks ran in a fresh temporary clone (`git clone -c core.autocrlf=false` of this worktree, then `git checkout --detach 9d5b40d32f96a38803b1f32f78287a902d2bead8`). The clone was deleted after the checks. No art was generated.

Reviewed writer tip: `9d5b40d32f96a38803b1f32f78287a902d2bead8`.

## Identity

Worktree, one invocation. Raw:

```text
git rev-parse HEAD origin/task/lane-q
9d5b40d32f96a38803b1f32f78287a902d2bead8
9d5b40d32f96a38803b1f32f78287a902d2bead8
EXIT=0

git log -8 --format="%H %an %s"
9d5b40d32f96a38803b1f32f78287a902d2bead8 deus-claude [claude] SIM.40.01 REPORT.md: commands, exit codes, gate output, counts
17c346d50ebc7a9867625314fac802fc7cc7c277 deus-claude [claude] SIM.40.01 reconcile with Lanes R and W (section 9.7); escalation: three ledger mass units
a76b1512fd9643e12f5e0fb93330e15946ec6abd deus-claude [claude] SIM.40.01 proof-read fixes: governing material of a member, cross references, examples within spans
a2af763c918d47cab1767b6d709635c5a140bdc3 deus-claude [claude] SIM.40.01 trace.json: 12 requirements, 8 proposed packages, 14 Owner questions
065e8dfbb292c9768da056ad93410b7e43fc09b0 deus-claude [claude] SIM.40.01 WIP: acceptance tests, WBS impact, Owner questions; citation fixes
88ffa615f4d0d7a9596a679636ce820d43eff373 deus-claude [claude] SIM.40.01 WIP: blasts, mass ledger, sparse storage and cost, hooks
940355a25ddada14729f0a6e311cadc51cd130c7 deus-claude [claude] SIM.40.01 WIP: support model, local recheck, sudden and decay-driven collapse
dfb1544f0a4ed9bb5eb1314f55d8e9cf6f206053 deus-claude [claude] SIM.40.01 WIP: header, material model, buildings as strata
EXIT=0
```

HEAD matched `origin/task/lane-q`. The review continued. Re-checked immediately before this file was written: both refs were still `9d5b40d32f96a38803b1f32f78287a902d2bead8` (`EXIT=0`).

Clone, after detach:

```text
HEAD is now at 9d5b40d3 [claude] SIM.40.01 REPORT.md: commands, exit codes, gate output, counts
git rev-parse HEAD
9d5b40d32f96a38803b1f32f78287a902d2bead8
CHECKOUT_EXIT=0
REVPARSE_EXIT=0
```

`tasks/SIM.40.01/lane-q/evidence/` is not in the tip. The lane directory at this commit is BRIEF.md, REPORT.md, SIM.40.01_STRUCTURAL_SUPPORT.md, escalation.md, lane.json, launches/ (two prompt files), and trace.json.

## Scope

In the clone. Tabs in the raw name-status are shown below as ` | `.

```text
git diff --name-status 84ee3b55f3f8c1b8a16710ccf3878795d98d1683 9d5b40d32f96a38803b1f32f78287a902d2bead8
A | tasks/SIM.40.01/lane-q/BRIEF.md
A | tasks/SIM.40.01/lane-q/REPORT.md
A | tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md
A | tasks/SIM.40.01/lane-q/escalation.md
A | tasks/SIM.40.01/lane-q/lane.json
A | tasks/SIM.40.01/lane-q/launches/20260926_032106_prompt.txt
A | tasks/SIM.40.01/lane-q/launches/20260926_034605_prompt.txt
A | tasks/SIM.40.01/lane-q/trace.json
DIFF_EXIT=0
```

`lane.json` `allowedPaths` is `tasks/SIM.40.01/lane-q/**` only.

| Path | Diff | Inside allowedPaths |
|---|---|---|
| `tasks/SIM.40.01/lane-q/BRIEF.md` | A | yes |
| `tasks/SIM.40.01/lane-q/REPORT.md` | A | yes |
| `tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md` | A | yes |
| `tasks/SIM.40.01/lane-q/escalation.md` | A | yes |
| `tasks/SIM.40.01/lane-q/lane.json` | A | yes |
| `tasks/SIM.40.01/lane-q/launches/20260926_032106_prompt.txt` | A | yes |
| `tasks/SIM.40.01/lane-q/launches/20260926_034605_prompt.txt` | A | yes |
| `tasks/SIM.40.01/lane-q/trace.json` | A | yes |

No path is outside `tasks/SIM.40.01/lane-q/**`. No file under `game/`, `tools/`, `docs/`, or `art/` is in the diff. The worktree also has an untracked `tasks/SIM.40.01/lane-q/launches/20260926_043657_prompt.txt`; it is not in `9d5b40d32f96a38803b1f32f78287a902d2bead8`.

## Gate

`lane.json` `gateTests[0]`, run from the clone root:

```text
node -e "<lane.json gateTests[0].args>"
task SIM.40.01 reqs 12 missing none bad none missingHeadings none ownerQuestions 14 mdBytes 125981
GATE_EXIT=0
```

That matches REPORT.md (task, 12 requirements, no missing ids, no bad sections, no missing headings, 14 owner questions, 125,981 bytes). Node also printed a `NO_COLOR`/`FORCE_COLOR` warning on stderr; the gate process still exited 0.

## Spot checks that held

- Required headings are present: Material model, Buildings as strata, Support model, Localized support recheck, Sudden collapse, Decay-driven collapse, Blasts across layers, Mass ledger, Sparse storage and cost, Hooks and events, Acceptance tests, WBS impact, Owner questions. `trace.json` has Q-01..Q-12 in order. Statuses: COVERED 11 (Q-01..Q-07, Q-09..Q-12), PARTIAL 1 (Q-08). Proposed packages: PROPOSED-Q-01..08, each naming real WBS ids or an earlier PROPOSED-Q package, each with a mutant. Owner questions: OQ-Q-01..14, each with options. The design says none of them is answered (line 908).
- Q-08 PARTIAL matches the document and `escalation.md`. At the cited sibling commits, Lane R §0.2 says it assumes 1 mu = 1/16 lb (`6613418ff5539c4156c5f42d589913d479dc0853`, decay doc line 27) and Lane W §0 states Assumption A-MASS as integer grams (`bed949e839c4b9a06d467a6f36be50891fd70be5`, population doc line 31). Both commits exist (`git rev-parse` printed those full hashes, `SIBLING_REV_EXIT=0`, `git cat-file -t` was `commit` for each, `EXIT=0`).
- Geometry in the design is 32 layers, -16..+15, 5 ft cells, 10 ft layers, 2 ft slices. The 5-level / 1 ft model is marked `[STALE-1FT]` where a number would differ.
- Buildings are constructed strata (section 3), with the constructed flag cited at `DEUS_Levels.js:1602`. Support rechecks are event-driven with a stated bound (section 5.5). Sudden and decay collapse convert to loose debris of equal kg and enqueue a local recheck (sections 6.3, 6.6, 7). Blasts use half-feet geometry (cell 10, stratum 4, layer 20) and keep SRD damage as the rules-layer number (section 8). Ledger rows cover build, dig, quarry, collapse, blast, clearing, salvage and conjured matter (section 9.2). LAND-1 closures name a mutant each (section 9.3). Ore ids 38-47 are generation-only (section 9.6). D-1 is left open with both mappings (section 7.6). D-4 and D-6 are flagged (section 13.2). Sparse structures say whether they are saved (section 10.1). Idle support work is 0 (section 5.5, T6).
- Rock kg/voxel and spanBase columns in section 2.3 reproduce from the stated formula. Recomputed in the clone with `rho` from the cited catalogue densities, `sigma` from section 4.3, `g = 9.81`, `spanBase = min(12, floor(sqrt(t × 0.6096 × sigma / (3 rho g)) / 1.524))`:

```text
granite kg 3894 spans 2,3,3,4,6,9,12
basalt kg 4106 spans 2,3,3,4,6,9,12
slate kg 3752 spans 1,2,3,4,5,8,11
marble kg 3823 spans 1,2,3,4,5,8,11
limestone kg 3256 spans 1,2,3,3,5,7,11
sandstone kg 2973 spans 1,2,2,3,4,6,9
ice kg 1298 spans 2,3,3,4,6,9,12
soil kg 2265 spans 0,0,0,0,1,1,2
CHECK_EXIT=0
```

  Those match section 2.3. Catalogue `fractureResistance` values (limestone 40, sandstone 35, granite 85, basalt 80, slate 70, marble 50) give the table's maxHP as `180 × fractureResistance / 60` exactly. The section 8.5 worked blast bases match the integer form in section 8.2 (`energy × (1024 - isqrt(d2)×1024/radiusHf) / 1024`, then resist per mille). Memory arithmetic in section 10.2 matches the stated products (20 perimeter columns, 32 records, 9,830 cave ceilings, 315 KB, about 5 MB). The gram bound `65,536 × 160 × 3,894,000 = 40,831,549,440,000` is about `4.1 × 10^13`. Acceptance-test rows matching `^| T[0-9]` number 18 (T1-T18), `COUNT_EXIT=0`.
- Citation sample at `84ee3b55f3f8c1b8a16710ccf3878795d98d1683`. Twenty-two `| cite | code |` rows were compared to `git show`. Four failed a raw substring check because the markdown escapes `|` as `\|` (`DEUS_Levels.js:1005`, `:1602`, `DEUS_Doors.js:91`, `DEUS_Colonists.js:3733`). With that escape removed, the quoted code is on the cited line. Other lines opened and matching the claim: `DEUS_Levels.js:61` (`LEVELS` -2..+2), `:993` (`STRATA = 5, CELL_FT = 5`), `:1007` (wood `blast: 1.2`), `:1558` (`levels:strataChanged`), `:1697` (HP byte loss), `:1702` (destroyed stratum becomes air), `:1791` (stratum 1 ft high), `:1795` (`applyVolumeDamage`), `:1805` (0..24 cap), `:1942` (`effectiveSupport`), `:2010` (`E_TOP = 25`), `:2696` and `:2699` (edge / `N = n * E_TOP`), `:5732` (self-test caller), `DEUS_Jobs.js:459` (soil 1 stone, else 2), `:465` (`geologyAt`), `DEUS_Interact.js:53` and `:167` (1-in-4 stone), `DEUS_Floors.js:276` (constructed floor from nothing), `DEUS_Fluid.js:943` (`levels:strataChanged`, inside the cited 941-944 range), `DEUS_Objects.js:313-314`, `DEUS_WorldCatalog.json:2104` / `:2204` / `:2225` (stone 2), `:4611` (oak density 0.75), `:4754` (granite 2.75), `:4893` (iron corrosion 30), `rules.json:4390`, `:6950`, `:7013`, `:7155`, `spells.json:5855`, `:6379`, `:7539`, `:17309`, `docs/OWNER_DECISIONS.md:178`, `:287`, `:312`, `docs/VISION.md:131` (V137), `:338` (V123 log), `:365` (V128 log), `docs/INVARIANT_REGISTRY.md:52-53`, `docs/RISK_REGISTER.md:60` (LIFE-001) and `:74` (NAT-003). WBS rows cited for SIM.40.01 (`:534`), SIM.40.02 (`:535`), SIM.40.04 (`:537`), SIM.40.05 (`:538`), SIM.50.02 (`:545`), SIM.50.08-10 (`:551-553`), SIM.60.03 (`:561`), GP.07.02 (`:578`), WG.65.15 (`:254`) are those rows. `git diff --stat 75cf2ff3 84ee3b55 -- game/` is the two files and the `295 insertions` the report quotes (`STAT_EXIT=0`). With `-U0`, the first `DEUS_Levels.js` hunk is `@@ -4178`, so lines below 4175 are unchanged. The report's "hunks start at line 4175" is three lines earlier than the first changed line; the conclusion that citations below that point still match the audit's commit holds.
- The design does not call its own work DONE, PASS, VERIFIED or CLOSED. "PASS or FAIL" in section 12.1 is the later test harness's output. Art in the design is three "art slot needed" text lines (section 3.6). No image, palette or generated art file is in the diff.

## Findings

### BLOCKER

None.

### MAJOR

1. Fall distance for a unit is specified twice, and the two specifications change the dice. Section 6.2 defines fall height as `h = e0 − (landing + 1)` strata, `2h` feet. Section 6.5 says dice are `floor(ft / 10)` and that one full layer is 1d6. T10 (line 852) puts a unit on a timber floor at S0 of layer +2 over an open room down to the ground at layer 0, calls that 20 ft, and passes when the unit takes 2d6. Its mutant says a 1 ft stratum height yields 1d6, which is the half of 20 ft.

   For ground at S0 of layer 0 and the floor at S0 of layer +2, the elevation-index gap is 10 strata. The section 6.2 formula gives `h = 9` strata = 18 ft, and `floor(18/10) = 1` die. The same formula on a one-layer drop (S0 of z+1 onto S0 of z) gives `h = 4` strata = 8 ft and 0 dice, which is the opposite of "one full layer is 1d6". A unit whose feet drop from the top of S0(+2) to the top of S0(0) does fall 20 ft, so T10 and the "one full layer" sentence can be read as a foot-drop rule, while section 6.2 is the air gap under the member. The document never says which length the unit uses, and at this fixture the two lengths are 18 ft and 20 ft, so the pass condition is either 1d6 or 2d6. SUP-4's acceptance test cannot be implemented from both statements. Align section 6.2, section 6.5, and T10 on one length.

### MINOR

1. `conjured_stone` is "0.10 × granite" at 382 kg/voxel (section 2.5). Granite is 3,894 kg, and `0.10 × 3,894 = 389.4`, which rounds to 389. 382 is `0.10 × 2.70 t/m³ × 1,415.84`. T16 then locks the source at `10 × 10 × 382 = 38,200` kg. The product is right for 382; the fill sentence and the granite density are not.
2. `timber_roof` is 60 kg/m² and 138 kg/voxel. A 5 ft × 5 ft cell is `1.524² = 2.322576 m²`, and `60 × 2.322576 = 139.35`, which rounds to 139 and truncates to 139. The thatch row (41 kg/m² → 95) matches that area. The roof row is 1 kg low.
3. Floating ice (section 4.3) says `P = 3.5 × h²` with h = 61 cm and 122 cm, and gives 13,020 kg and 52,080 kg. `3.5 × 61² = 13,023.5` and `3.5 × 122² = 52,094`. The formula is marked extrapolated; the printed results do not match it.
4. Section 9.1 proposes 3 lava depth units of 2,738 kg become 2 basalt voxels of 4,107 kg (`3 × 2,738 = 8,214 = 2 × 4,107`). The material table's basalt voxel is 4,106 kg, and one id has one `kgPerVoxel`. `2 × 4,106 = 8,212`. The proposal says SIM.50.10 confirms the ratio; as written, the ratio and the basalt row are 2 kg apart.
5. The header cites WBS Rev 25 at `docs/worldgen/DEUS_WORLDGEN_WBS.md:3`. Line 3 is `**Namespace:** WG`. Line 4 is `**Rev:** 25`.

## Art (DEC-007)

No art was generated, requested or integrated by this review. The commit under review adds no art file. The design's only art text is catalogue slot names.

VERDICT: FAIL
