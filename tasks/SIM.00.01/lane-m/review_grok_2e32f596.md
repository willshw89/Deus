# Grok independent review — SIM.00.01 ADR-003 Rev 3

Reviewed commit: `2e32f5968f7ed1178ca41602bf74550e4338fff5`
Branch: `task/lane-m`
Reviewer: Grok
Date: 2026-09-26

This review does not edit the ADR, the briefs, or the report. ADR-003 stays **PROPOSED**.

## Tip check

`git rev-parse HEAD origin/task/lane-m` and `git log -8 --format="%H %an %s"` at the start of the review:

```
2e32f5968f7ed1178ca41602bf74550e4338fff5
2e32f5968f7ed1178ca41602bf74550e4338fff5
EXIT=0
2e32f5968f7ed1178ca41602bf74550e4338fff5 deus-claude [claude] SIM.00.01 Rev 3 report: finding-to-fix table, citation counts, raw evidence
647457b292ddbf5a8ba2802659aea4855454a721 deus-claude [claude] SIM.00.01 Rev 3: ADR-003 for 32 layers, scale, blasts, DEC-017 exit path; citations re-checked at b612bc72
84d0404de1459e9681e4e2b34ba71ea921bf1d1f deus-claude [claude] SIM.00.01 Rev 3 WIP: 32-layer storage, blasts (s18), boundary (s19), Rev 2 verdicts, escalation
b824114360fa8a432e62c258559623bb9bb826b9 deus-claude [claude] SIM.00.01 Rev 3 WIP: change log, 32-layer slabs, budgets, DEC-017 exit path
823838c064cce6f376f390370cd781e319b82ef7 deus-claude [claude] SIM.00.01 Rev 3 WIP: citation extractor and Rev 2 citation dump at b612bc72
bb0fd19da15909c27e4aea437b4e5b4ebe04670c snewt [ops] SIM.00.01 lane-m launch prompt 20260926_022504
9edc8f6c7ffd8f526ec964a5a3fe2ecd7a810334 deus-pm [pm] SIM.00.01 lane-m: BRIEF_REV3.md for ADR-003 Rev 3 after Grok FAIL (review_grok_c456cb73.md)
8e2fed138cf4ef822bb4d7adc34f3b509ebe3563 deus-grok [grok] SIM.00.01 review c456cb73: FAIL
EXIT=0
```

HEAD matched `2e32f5968f7ed1178ca41602bf74550e4338fff5`. A later `git fetch origin main task/lane-m` left the lane tip on that hash. `origin/main` at the close of the review was `84ee3b55f3f8c1b8a16710ccf3878795d98d1683`. `git diff --stat b612bc7217349bce695e15395bd041f63673b89b origin/main -- docs/OWNER_DECISIONS.md` was empty (EXIT=0), so DEC-013 and DEC-016 through DEC-022 read the same at the citation baseline and on current `origin/main`.

Commit `2e32f5968f7ed1178ca41602bf74550e4338fff5` itself adds only `tasks/SIM.00.01/lane-m/REPORT_REV3.md` (`git diff-tree --name-status`, EXIT=0).

## Scope (fresh clone)

Clone: `git clone --no-checkout` of the local repository into `%TEMP%\lane-m-rev3-scope-2e32f596` (EXIT=0). Detached checkout of `2e32f5968f7ed1178ca41602bf74550e4338fff5` (EXIT=0). Merge-base with that clone's `origin/main`:

```
ebeec89227a6aadb8bd955668cd4c8bc6594aca2
EXIT=0
```

`git diff --name-status ebeec89227a6aadb8bd955668cd4c8bc6594aca2 HEAD` (EXIT=0):

```
A	docs/adr/ADR-003_sim_render_split_and_lod.md
M	docs/adr/README.md
A	tasks/SIM.00.01/lane-m/BRIEF.md
A	tasks/SIM.00.01/lane-m/BRIEF_REV3.md
A	tasks/SIM.00.01/lane-m/REPORT_REV3.md
A	tasks/SIM.00.01/lane-m/cite_check.js
A	tasks/SIM.00.01/lane-m/escalation.md
A	tasks/SIM.00.01/lane-m/lane.json
A	tasks/SIM.00.01/lane-m/launches/20260926_002434_prompt.txt
A	tasks/SIM.00.01/lane-m/launches/20260926_022504_prompt.txt
A	tasks/SIM.00.01/lane-m/notes.md
A	tasks/SIM.00.01/lane-m/rev3/cites_rev2_at_b612bc72.json
A	tasks/SIM.00.01/lane-m/rev3/cites_rev2_at_b612bc72.md
A	tasks/SIM.00.01/lane-m/rev3/cites_rev3_at_b612bc72.md
A	tasks/SIM.00.01/lane-m/rev3/cites_rev3_final.json
A	tasks/SIM.00.01/lane-m/rev3/cites_rev3_snapshot_judged.json
A	tasks/SIM.00.01/lane-m/rev3/compare_e27e8be5.txt
A	tasks/SIM.00.01/lane-m/rev3/slices/r3_slice1.md
A	tasks/SIM.00.01/lane-m/rev3/slices/r3_slice2.md
A	tasks/SIM.00.01/lane-m/rev3/slices/r3_slice3.md
A	tasks/SIM.00.01/lane-m/rev3/slices/r3_slice4.md
A	tasks/SIM.00.01/lane-m/rev3/verdicts_rev2.md
A	tasks/SIM.00.01/lane-m/rev3/verdicts_rev3.md
A	tasks/SIM.00.01/lane-m/review_checklist.md
A	tasks/SIM.00.01/lane-m/review_grok_c456cb73.md
```

Every path is inside `docs/adr/ADR-003_sim_render_split_and_lod.md`, `docs/adr/README.md`, or `tasks/SIM.00.01/lane-m/**`.

`git diff --name-status 8e2fed138cf4ef822bb4d7adc34f3b509ebe3563 2e32f5968f7ed1178ca41602bf74550e4338fff5 -- tasks/SIM.00.01/lane-m/review_grok_c456cb73.md` produced no paths (EXIT=0). The writer tip does not modify `review_grok_c456cb73.md`. The Add in the merge-base diff is the earlier reviewer commit `8e2fed13`.

## What was judged

- `docs/adr/ADR-003_sim_render_split_and_lod.md` at this tip. Status line: "Rev 3, PROPOSED". The author does not self-certify.
- `docs/adr/README.md`: one index line, PROPOSED, Rev 3, 32 layers, DEC-017 as the exit path.
- `tasks/SIM.00.01/lane-m/BRIEF.md`, `BRIEF_REV3.md`, `REPORT_REV3.md`.
- `tasks/SIM.00.01/lane-m/review_grok_c456cb73.md` (prior fail). No finding in it is left unanswered, and none is disputed.
- `docs/OWNER_DECISIONS.md` at `b612bc7217349bce695e15395bd041f63673b89b` (same text as `origin/main`): DEC-013 at lines 172–195 (32 layers −16..+15, surface 0, 320 ft, 5 ft cell, 10 ft layer, 2 ft stratum, sparse storage, cross-layer blasts, bands LOWER2 −16..−9, LOWER1 −8..−1, SURFACE 0..+3, UPPER1 +4..+9, UPPER2 +10..+15). DEC-016 lines 230–235, DEC-017 lines 239–247, DEC-018 lines 251–263, DEC-019 lines 267–278, DEC-020 lines 282–289, DEC-021 lines 293–300, DEC-022 lines 304–312. Those line numbers match the ADR's pins.

Engine lines below were read with `git --no-pager show b612bc7217349bce695e15395bd041f63673b89b:<path>` (EXIT=0).

## Acceptance criteria (BRIEF_REV3)

| Criterion | Result |
|---|---|
| No 9-layer default remains except as the named legacy or test configuration | Met. −16..+15 is the default for new worlds (§0 item 7, §5.1, §15.2). −4..+4 is labeled the test range. −2..+2 is labeled legacy saves. Remaining "5 levels" and "9 layers" sentences describe today's code or that test range. |
| 32-layer memory and save budgets, and harnesses at 9 and at 32 layers; §13 DEC-017 exists | Met. §9.1 budgets grow with MIXED, wet, and damaged chunks. The sparse fixture requires `grid_bytes(32) − grid_bytes(9)` to equal the directory delta. §15.2, §16.6, §17.6, and §18.8 run every core fixture at both ranges. §13 keeps RMMZ for menus, dialogue, save, database, and battle; the fallback is a PixiJS map renderer inside `Scene_Map` only; go/no-go is Lane K normal plus the 0019-T stress baseline and the 32-vs-5 occlusion benchmark (DEC-017 line 243, DEC-021 line 300). §13.2 shows the swap reads `SimView` and sends the same commands, so the sim core is unchanged. |
| Every finding in `review_grok_c456cb73.md` is addressed or disputed | Met. See the table. No row is a dispute. |
| Sampled engine `file:line` citations are true at `b612bc7217349bce695e15395bd041f63673b89b` | Met. 16 of 16 sampled engine citations are true. One adjacent paraphrase of the resist table is wrong and is MINOR 1; the sentence that cites `:1005-1007` is true. |
| No path outside allowedPaths; ADR stays PROPOSED; the writer does not self-certify | Met. Scope diff above. Status is PROPOSED in the ADR and the index. The report says it certifies nothing. Appendix C's 646/646 count is labeled the writer's own check. |

## Finding-to-fix table (`review_grok_c456cb73.md`)

| # | Prior finding | Where Rev 3 answers it | Reviewer |
|---|---|---|---|
| 1 | Checklist 1: §0, §5.1, §15, and §8 row Z use 9 levels, −4..+4, and the old bands. No 32-layer region count or amended band table. | §0 items 4 and 7; §5.1 (32×32 × 2-layer slab: 16 slabs, 1,024 regions; band table −16..−9, −8..−1, 0..+3, +4..+9, +10..+15); §8 row Z; §15. Storage and LOD are sized from `zMin..zMax`, including past 32. | Addressed. Band counts and slab alignment check out. E4 records that DEC-013's summary states the band ranges while the brief calls them OPEN; the ADR keeps both texts and hard-codes neither. |
| 2 | Checklist 1: fixtures only at −2..+2 and −4..+4; Q16 asks about 5 → 9. | §15.2 three configurations; every core suite at −4..+4 and −16..+15; legacy −2..+2 for save migration. Q16 asks 5 → 32. §16.6, §17.6, §18.8 repeat the dual range. | Addressed. |
| 3 | Checklist 1: budgets only at 5 and 9 levels; worst case multiplies by 9. | §9.1 formula `2×C + 7,680×M + 1,024×W + 5,120×H + 16 KiB`. Worst case at 32 layers is 17 MiB undamaged and 27 MiB damaged, matching the formula within rounding to 1 MiB. Sparse-fixture delta is directory bytes only. UNIFORM chunks kept (§15.3). | Addressed. The per-chunk bytes match the §15.4 table (5,120 + 512 + 2,048 = 7,680). |
| 4 | Checklist 2: no foot scale; 1 ft stratum comments not reconciled. | §15.0: cell 5 ft, layer 10 ft, stratum 2 ft. Engine still says 1 ft at `DEUS_Levels.js:985-986` and `:1790-1791`. Core uses integer half-feet. Who edits the legacy comments is named (WG.00.17 or SIM.00.05/terrain). | Addressed. Both engine lines say what the ADR says. |
| 5 | Checklist 3: no floor-thickness blast rule; box, falloff, and resist not taken as design. | §18. Today's box (`:1815`), sphere (`:1849`), falloff, and resist are design input (§18.1). §18.2 attenuates by material and damage type along a parent chain, so thickness is the number of strata; a stratum destroyed earlier in the event counts as air; distance is in half-feet (cell 10, stratum 4); fire and impact use different tables. | Addressed. The rule matches DEC-013 item 4 and DEC-022. Coefficients stay with SIM.40.01 (Q18). MINOR 1 is a wrong parenthetical inside this section, not a missing rule. |
| 6 | Checklist 4 (keep): state that the support queue runs on −16..+15. | §16 kept. Range sentence at the head of §16. §16.3 bounds the downward search with the UNIFORM-chunk cache. §16.6 runs at 9 and at 32, including a mutant that stops at −4 or −2 instead of `zMin`. | Addressed. |
| 7 | Checklist 5 (keep): §17. | §17 kept, with the same range sentence and 9/32 tests (§17.6). | Addressed. |
| 8 | Checklist 6: nine sections present, but 32-layer §5 geometry and §9 rows were missing. | Sections 1–9 are still present. §5.1 and §9.1 supply the missing rows. §13, §18, and §19 are the Rev 3 additions the brief requires. | Addressed. |
| 9 | Checklist 7.1: `applyVolumeDamage` cited at the JSDoc for its call to `damageCell`. | §16.1 and §18.1 split JSDoc `:1783-1794`, signature `:1795`, box call `:1815`, sphere call `:1849`. `damageCell` is `:1709-1725`. | Addressed. Sample rows 4–9. |
| 10 | Checklist 7.2: ecology "each game hour" cited to the six-hour header. | §1.3 and Appendix A.8: hourly plants and breeding at `:876` and `:888-905`; six-hour population roll at `:907-914`, `:45`, and header `:22-27`. | Addressed. Sample rows 10–12. |
| 11 | Minor: WBS pointer `:509` is the table header. | Header cites `docs/worldgen/DEUS_WORLDGEN_WBS.md:519`. | Addressed. At `b612bc72`, line 519 is the SIM.00.01 row. |
| 12 | Minor: Factions contact span `:631-632` includes `CONTACT_CELLS`. | §1.2 and §3.3 cite `DEUS_Factions.js:632` only. | Addressed. Line 632 is `CONTACT_EVERY = 120`. Line 631 is `CONTACT_CELLS = 12`. |
| 13 | Stale tip name `0c1baf8d` as current `main`. | Header pins code and documents to `b612bc72`, with the empty `game/` diff against `ebeec892`, and states that `main` later moved. | Addressed. |
| 14 | Revision required, items 1–5 (32 layers, occupied-cell budgets, scale, blasts and the two citation fixes, keep §2–§4 and §7–§8 and extend their Z assumptions). | Rows 1–10 above. §4.3, §7.7, and §8 row Z speak of any range rather than nine layers. | Addressed. |

## Citation sample at `b612bc7217349bce695e15395bd041f63673b89b`

Claim text is the ADR's. The shown line is from `git show` of that commit. `git --no-pager show` of `DEUS_Levels.js` exited 0; the other files were shown in the same way and exited 0.

| # | Citation | ADR claim | Line at b612bc72 | True? |
|---|---|---|---|---|
| 1 | `game/js/plugins/DEUS_Levels.js:993` | `STRATA = 5`, `CELL_FT = 5` | `const STRATA = 5, CELL_FT = 5;` | true |
| 2 | `game/js/plugins/DEUS_Levels.js:985-986` | Header: every 5 ft cell is five 1 ft strata | `Every 5 ft cell of every level is five 1 ft strata` | true |
| 3 | `game/js/plugins/DEUS_Levels.js:1790-1791` | Sphere JSDoc: a cell is 5 ft across, a stratum 1 ft high | `a cell is 5 ft across, a stratum 1 ft high` | true |
| 4 | `game/js/plugins/DEUS_Levels.js:1795` | Signature of `applyVolumeDamage` | `function applyVolumeDamage(a, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact", opts = {})` | true |
| 5 | `game/js/plugins/DEUS_Levels.js:1805` | Box elevation `e = (z + 2) * STRATA + s`, clipped to 0..24 | `const e0 = Math.max(0, (minZ + 2) * STRATA + minS), e1 = Math.min(24, (maxZ + 2) * STRATA + maxS);` | true |
| 6 | `game/js/plugins/DEUS_Levels.js:1815` | Box form calls `damageCell` | `addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);` | true |
| 7 | `game/js/plugins/DEUS_Levels.js:1821` | `sphereDamage` starts here | `function sphereDamage(spec) {` | true |
| 8 | `game/js/plugins/DEUS_Levels.js:1833` and `:1845` | Horizontal distance uses 5 ft cells; vertical distance counts strata as feet | `:1833` builds `px`/`py` with `CELL_FT` and `pe` in strata; `:1845` is `d2 = h2 + de * de` with `de` in strata | true |
| 9 | `game/js/plugins/DEUS_Levels.js:1849` | Sphere form calls `damageCell` | `addResults(sum, damageCell(...), x, y, z);` | true |
| 10 | `game/js/plugins/DEUS_Levels.js:1709-1725` | `damageCell` writes the cell and emits `levels:strataDamaged` / `levels:strataDestroyed` | Function starts at 1709; emits at 1717 and 1721; returns at 1725 | true |
| 11 | `game/js/plugins/DEUS_Ecology.js:22-27` | Header describes the population roll every six game hours | `Every six game hours, the current area and one rotating world area get a deterministic population roll.` | true |
| 12 | `game/js/plugins/DEUS_Ecology.js:876` and `:888-905` | Hourly driver; `tickHour` spreads plants and breeds on the current and rotating areas | `:876` `Hourly driver: resources every hour, populations every six hours.` `:903-904` call `spreadPlants` and `stepBreeding` inside `:888-905`. The population roll starts at `:907`, outside that span. | true |
| 13 | `game/js/plugins/DEUS_Factions.js:632` | Contact interval is 120 | `const CONTACT_EVERY = 120; // frames (2 s at x1)` | true |
| 14 | `game/js/plugins/DEUS_World.js:155` | Today's levels are −2..+2 | `const LEVELS = Object.freeze([-2, -1, 0, 1, 2]);` | true |
| 15 | `game/js/plugins/DEUS_Fluid.js:56-58` | `Z_MIN = -2`, `Z_MAX = 2`, `Z_LEVELS = 5` | Those three assignments, with the comment `-2, -1, 0, 1, 2` | true |
| 16 | `game/js/plugins/DEUS_Levels.js:1005-1007` | §18.1: stone takes fire × 0.1, wood takes fire × 2, and impact, dig, and blast differ | stone `fire: 0.1`; wood `fire: 2`; impact, dig, and blast differ by material | true |

Document pin checked because the prior review flagged it: `docs/worldgen/DEUS_WORLDGEN_WBS.md:519` at the same commit is the SIM.00.01 row (the header of that table is line 517). `docs/worldgen/DEUS_WORLDGEN_WBS.md:105` is the WG.00.17 row and does say 32 layers, sparse storage, and a 9-layer test mode.

16 engine citations sampled, 16 true.

## Checked, and not findings

- **Slabs.** A region is 32×32 × two layers. At −16..+15 that is 16 slabs and 1,024 regions. Default band edges fall on slab edges. The 9-layer test range ends in a one-layer slab, which the text says, and its test band table deliberately splits a slab. Scaling past 32 is stated.
- **Sparse storage.** UNIFORM chunks hold one packed value and no cell arrays. Save bytes are diffs. A fresh world writes no terrain or fluid bytes at either range. The directory is 2 bytes × 2,048 chunks = 4 KiB at 32 layers.
- **DEC-017.** §13 matches the decision's heading and ruling: shell stays, map drawing inside `Scene_Map` is the only fallback, no renderer lane before the benchmarks, hygiene note at line 247.
- **DEC-016 and DEC-019 through DEC-022.** §19 assigns each to core or host without changing the ruling. Rises of 3–4 strata are Q21, which DEC-019 does not decide. Conjured matter stays Q19, which DEC-018 leaves open.
- **`MAX_L0 = 64`.** A 2×2 view through 16 open slabs is 64 regions, so the cap equals a full shaft and other focus sources drop to L1. The priority order is written down. It does not contradict DEC-012's camera-at-full-fidelity rule.
- **Self-certification.** The words PASS in the change log quote the prior review's checklist marks. The report's citation totals are this lane's count, and both the report and Appendix C say so.

## Findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

1. **§18.2 attributes blast resist to impact as well.** The fire bullet cites `DEUS_Levels.js:1005-1007` and is right: wood `fire: 2`, stone `fire: 0.1`. The previous bullet says impact and blast use "today's resist: stone 1, soil 1.5, wood 1.2". Those three numbers are the **blast** column (stone `blast: 1`, soil `blast: 1.5`, wood `blast: 1.2`). Impact on the same lines is stone `0.5`, soil `1`, wood `1`. §18.1 already says the types differ and does not quote this triple. Q18 still assigns the core's `passPm` numbers to SIM.40.01, so the rule in §18.2 does not adopt the triple. The parenthetical should not be copied as today's impact resist.

2. **§5.5 names the wrong region count.** The scheduler bound is `⌈R/10⌉` and `⌈R/100⌉`, "where R is the regions in the area (103 and 11 at 32 layers)". R at 32 layers is 1,024 (§5.1). 103 and 11 are `⌈1024/10⌉` and `⌈1024/100⌉`, not R. The formula is right if R is 1,024.

3. **§15.3 overstates what grows with the layer count.** The chunk directory is "the only per-area structure whose size follows the layer count". §5.1 also sizes a region bitset and one level byte per region from the slab count (1 KiB of level bytes at 1,024 regions, 320 bytes at the 9-layer test range). §9.1 already allows the sparse-fixture heap delta to exceed the directory by 64 KiB, so the budget is the tighter statement. The word "only" in §15.3 is not.

4. **Change-log row 1 points one line early for §0 item 7.** It says "§0 items 4, 7 (L64, L75)". Line 64 is item 4. Line 75 is the last bullet of item 4. Item 7, the 32-layer default, starts at line 76. The section it names is the right one.

5. **The report's new-citation count does not match the evidence file.** `REPORT_REV3.md` says sub-agents judged 286 new or changed citations. `rev3/verdicts_rev3.md` and Appendix C say 350 unchanged, 247 judged by sub-agents, and 49 checked by the writer after later edits (350 + 247 + 49 = 646). 350 + 286 = 636, which is not the reported total. The appendix matches the verdict file. The 286 in the report does not.

VERDICT: PASS
