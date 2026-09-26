# Lane M (SIM.00.01) report: ADR-003 Rev 3

- Writer: Claude (Lane M), 2026-09-26, 02:25–03:05 CT. Branch `task/lane-m`, worktree `C:\Users\snewt\.deus_worktrees\lane-m`.
- Brief: `tasks/SIM.00.01/lane-m/BRIEF_REV3.md`. Review answered: `tasks/SIM.00.01/lane-m/review_grok_c456cb73.md` (VERDICT: FAIL on Rev 2).
- ADR status: **PROPOSED, Rev 3**. It needs an independent Grok review and Owner plus PM sign-off. This report certifies nothing.
- No code, no art: nothing under `game/` or `tools/` changed. No image was generated, requested or edited (DEC-007).

## What changed

- `docs/adr/ADR-003_sim_render_split_and_lod.md`: Rev 3. The top has a change log that maps each review finding to the section and lines that answer it. The main changes:
  - 32 layers (−16..+15) and the amended bands (§5.1, §15);
  - 2-layer LOD slabs (§5.1), with only regions that hold state scheduled (§5.5);
  - the governing scale: 5 ft cell, 10 ft layer, 2 ft stratum (§15.0);
  - storage budgets at 9 and 32 layers that grow with MIXED chunks (§9.1), and time budgets still PENDING-K3, each naming the K3 field that fills it (§9.2);
  - DEC-017 as the engine exit path (§13);
  - cross-layer blasts, volume damage, targeting and spell primitives (§18);
  - DEC-016 and DEC-019 to DEC-021 at the sim/render boundary (§19);
  - Appendix C, the citation re-check;
  - every FALSE and IMPRECISE Rev 2 citation corrected.
- `docs/adr/README.md`: the index line now reads Rev 3, PROPOSED.
- `tasks/SIM.00.01/lane-m/cite_check.js`: a citation extractor. It dumps each `file:line` in the ADR with the cited lines at a commit, and with `--compare` it reports drift. It judges nothing.
- `tasks/SIM.00.01/lane-m/rev3/`: the evidence.
  - `cites_rev2_at_b612bc72.{md,json}` and `cites_rev3_at_b612bc72.md` / `cites_rev3_final.json`: the dumps.
  - `cites_rev3_snapshot_judged.json` and `slices/`: exactly what the Rev 3 sub-agents judged.
  - `verdicts_rev2.md` and `verdicts_rev3.md`: the per-citation verdicts.
  - `compare_e27e8be5.txt`: drift against the new `main`.
- `tasks/SIM.00.01/lane-m/escalation.md`: four non-blocking findings in read-only files (E1–E4, below).
- The review file `review_grok_c456cb73.md` was not touched (evidence below).

## Finding → fix

| # | Review finding | Fix | Where in the ADR (Rev 3 lines) |
|---|---|---|---|
| 1 | Checklist 1: 9 levels, −4..+4, old bands in §0, §5.1, §15, §8 row Z | 32 layers, −16..+15, 320 ft; amended bands held as data; 9 layers only as the test range, −2..+2 only as legacy | §0 items 4, 7 (L64, L75); §5.1 (L667-L714); §8 row Z (L1008); §15 (L1421-L1550) |
| 2 | Checklist 1: no 32-layer region count or band table | 2-layer slabs, 16 slabs, 1,024 regions per area; band table; how it scales past 32 | §5.1 (bands L683, past 32 L706); §15.2; §15.3 |
| 3 | Checklist 1: fixtures only at −2..+2 and −4..+4 | every core test at −4..+4 and −16..+15, plus −2..+2 for migration; Q16 retargeted | §15.2 (L1470-L1487); §9 (L1028); §16.6; §17.6; §18.8; Q16 (L1259) |
| 4 | Checklist 1: no 32-layer memory or save budget; worst case × 9 | formulas in MIXED, wet and damaged chunks; 32-layer worst case; 9-vs-32 sparse-fixture checks; seed-fixture ceiling; UNIFORM rule kept | §9.1 (L1030-L1049); §15.3–§15.5 (L1488-L1538) |
| 5 | Checklist 2: scale not stated; 1 ft comments not reconciled | 5 ft / 10 ft / 2 ft; the 1 ft code and comments listed with who changes them; integer half-feet in the core | §15.0 (L1432-L1453); §0 item 8 (L79) |
| 6 | Checklist 3: no floor attenuation or breach rule | §18: today's box, sphere, falloff and resist as input; attenuation by material × thickness; shell-by-shell breach; fire vs impact; LOS and 3D range; spell primitives | §18 (L1710-L1856) |
| 7 | Checklist 4 (PASS): keep §16; state −16..+15 | kept; range statement; 9/32 tests; zMin mutant | §16 (L1555, L1574-L1590, L1612-L1627) |
| 8 | Checklist 5 (PASS): keep §17 | kept; range statement; 9/32 tests | §17 (L1632, L1645-L1667, L1698-L1709) |
| 9 | Checklist 6 (PASS): band geometry and 32-layer §9 rows missing | as rows 2 and 4 | §5.1; §9.1 |
| 10 | 7.1: `applyVolumeDamage` cited at the JSDoc for its call | JSDoc `:1783-1794`, signature `:1795`, calls `:1815` and `:1849`; `damageCell` `:1709-1725` | §16.1 (L1557-L1569); §18.1 |
| 11 | 7.2: ecology "each hour" cited to the six-hour header | hourly `:876`, `:888-905`; six-hourly `:907-914`, `:22-27`, `:45` | §1.3 (L218); §6 (L805); A.8 (L1889) |
| 12 | Minor: WBS pointer `:509` | `docs/worldgen/DEUS_WORLDGEN_WBS.md:519` | header (L16) |
| 13 | Minor: Factions `:631-632` | `DEUS_Factions.js:632` | §1.2 (L183); §3.3 (L436) |
| 14 | Stale tip name `0c1baf8d` | baseline `b612bc72`, with the identity check, and the later move of `main` stated | header (L18-L21) |
| 15 | Revision required 1–5 | as rows 1–8; §2–§4 and §7–§8 kept, with their Z assumptions generalised | §4.3 (L587); §7.7 (L906); §8 row Z |
| 16 | Not in the review: the full Rev 2 re-check | 6 FALSE and 22 IMPRECISE corrected, including a wrong claim about Factions counters | Appendix C; §1.4 (L249); §7.4 (L877) |

No finding is disputed.

**Brief items:**

| Item | Where |
|---|---|
| 1 | change log at the top of the ADR |
| 2 | 32 layers: §5.1, §15 |
| 3 | budgets: §9.1, §9.2; harnesses at 9 and 32: §15.2 |
| 4 | DEC-017: §13 |
| 5 | DEC-016, DEC-018 to DEC-022: §18, §19 |
| 6 | citations: Appendix C |
| 7 | README |
| 8 | this report |

## Citations re-checked (at `b612bc7217349bce695e15395bd041f63673b89b`)

| Text | Citations | TRUE | IMPRECISE | FALSE |
|---|---:|---:|---:|---:|
| Before: Rev 2 (`c456cb73`) | 476 | 448 | 22 | 6 |
| After: Rev 3 (HEAD) | 646 | 646 | 0 | 0 |

**Method.**
- `cite_check.js` extracted every citation and printed the cited lines.
- **Rev 2:** six read-only sub-agents judged all 476 (first pass: 449 / 20 / 7). The writer re-checked every non-TRUE verdict and the review's flags:
  - C058, C188 and C410 were moved to IMPRECISE, agreeing with the review;
  - C210 and C383 were judged at the `0c1baf8d` pin their text states.
- **Rev 3:**
  - 350 citations are unchanged from Rev 2 and keep its verdict (all TRUE);
  - four read-only sub-agents judged the 286 new or changed ones. Their first pass gave 282 TRUE and 4 IMPRECISE, and all 4 were rewritten;
  - 49 citations on lines edited after that pass were checked by the writer against printed spans.
- Full lists: `rev3/verdicts_rev2.md` (every non-TRUE with its fix) and `rev3/verdicts_rev3.md`.

**Caveat.** These verdicts come from this lane's sub-agents and its writer, not from an independent reviewer. They are a check, not a certification.

**Drift.** `main` moved to `e27e8be5` during the run, when Lane N merged. That merge changes only `DEUS_Levels.js` and `DEUS_World.js`. At `e27e8be5`, 602 of the 641 unpinned citations read the same text; 39 differ (6 in `DEUS_Levels.js`, 33 in `DEUS_World.js`, listed in `rev3/compare_e27e8be5.txt`). The ADR stays pinned to `b612bc72`, as the brief requires.

## How I tested it

This is a docs-only package, so there was no game run, no Playtest (F5) and no screenshot. The checks were:
- the lane's gate tests;
- the identity of the baseline;
- the write set against allowedPaths;
- the citation dumps and verdicts above;
- the Lane K state behind PENDING-K3.

All commands ran in the foreground in the lane-m worktree. Raw output, trimmed only where marked:

```
$ git rev-parse HEAD
647457b292ddbf5a8ba2802659aea4855454a721
EXIT=0
$ git rev-parse b612bc7217349bce695e15395bd041f63673b89b
b612bc7217349bce695e15395bd041f63673b89b
EXIT=0
$ git rev-parse 8e2fed13 bb0fd19d
8e2fed138cf4ef822bb4d7adc34f3b509ebe3563
bb0fd19da15909c27e4aea437b4e5b4ebe04670c
EXIT=0
$ git log --oneline bb0fd19d..HEAD
647457b2 [claude] SIM.00.01 Rev 3: ADR-003 for 32 layers, scale, blasts, DEC-017 exit path; citations re-checked at b612bc72
84d0404d [claude] SIM.00.01 Rev 3 WIP: 32-layer storage, blasts (s18), boundary (s19), Rev 2 verdicts, escalation
b8241143 [claude] SIM.00.01 Rev 3 WIP: change log, 32-layer slabs, budgets, DEC-017 exit path
823838c0 [claude] SIM.00.01 Rev 3 WIP: citation extractor and Rev 2 citation dump at b612bc72
EXIT=0
$ git diff --name-only bb0fd19d HEAD
docs/adr/ADR-003_sim_render_split_and_lod.md
docs/adr/README.md
tasks/SIM.00.01/lane-m/cite_check.js
tasks/SIM.00.01/lane-m/escalation.md
tasks/SIM.00.01/lane-m/rev3/cites_rev2_at_b612bc72.json
tasks/SIM.00.01/lane-m/rev3/cites_rev2_at_b612bc72.md
tasks/SIM.00.01/lane-m/rev3/cites_rev3_at_b612bc72.md
tasks/SIM.00.01/lane-m/rev3/cites_rev3_final.json
tasks/SIM.00.01/lane-m/rev3/cites_rev3_snapshot_judged.json
tasks/SIM.00.01/lane-m/rev3/compare_e27e8be5.txt
tasks/SIM.00.01/lane-m/rev3/slices/r3_slice1.md
tasks/SIM.00.01/lane-m/rev3/slices/r3_slice2.md
tasks/SIM.00.01/lane-m/rev3/slices/r3_slice3.md
tasks/SIM.00.01/lane-m/rev3/slices/r3_slice4.md
tasks/SIM.00.01/lane-m/rev3/verdicts_rev2.md
tasks/SIM.00.01/lane-m/rev3/verdicts_rev3.md
EXIT=0
$ git diff --name-only bb0fd19d HEAD | grep -vE "^(docs/adr/ADR-003_sim_render_split_and_lod\.md|docs/adr/README\.md|tasks/SIM\.00\.01/lane-m/)" | grep -c . (paths outside allowedPaths)
0
EXIT=1
$ git diff --name-only bb0fd19d HEAD -- tasks/SIM.00.01/lane-m/review_grok_c456cb73.md (review file untouched)
EXIT=0
$ git diff --stat ebeec892 b612bc72 -- game
EXIT=0
$ git diff --name-only ebeec892 b612bc72 -- tools | grep -vE "^tools/(governance|ops)/" | grep -c .
0
EXIT=0
$ git rev-parse origin/main
e27e8be5ec78de557a426c7d36ef4313dda2998d
EXIT=0
$ git diff --stat b612bc72 origin/main -- game docs/OWNER_DECISIONS.md docs/VISION.md docs/worldgen docs/RISK_REGISTER.md docs/INVARIANT_REGISTRY.md docs/systems/UF_History.md
 game/js/plugins/DEUS_Levels.js |  60 +++++++++-
 game/js/plugins/DEUS_World.js  | 243 ++++++++++++++++++++++++++++++++++++++++-
 2 files changed, 295 insertions(+), 8 deletions(-)
EXIT=0
$ git -C ../lane-k rev-parse HEAD
86bf49a926ea0ed6a546b31c94de66dd6863628d
EXIT=0
$ git -C ../lane-k merge-base --is-ancestor 4da2e7345cf987671a0a0d5661be1b153654bfee HEAD
EXIT=0
$ git ls-remote origin refs/heads/task/lane-k
983a9e46e3bd2eae0eb129e72f746d8ce6dbb2eb	refs/heads/task/lane-k
EXIT=0
$ node tasks/SIM.00.01/lane-m/cite_check.js --adr c456cb73:docs/adr/ADR-003_sim_render_split_and_lod.md --rev b612bc72... --out /tmp/r2.md
citations 476  NO_FILE 0  OUT_OF_RANGE 0
EXIT=0
$ node tasks/SIM.00.01/lane-m/cite_check.js --adr HEAD:docs/adr/ADR-003_sim_render_split_and_lod.md --rev b612bc72... --out /tmp/r3.md --compare e27e8be5... (2>&1 | head -2)
EXIT=0
citations 646  NO_FILE 0  OUT_OF_RANGE 0
compare e27e8be5ec78de557a426c7d36ef4313dda2998d: same text 602, changed 39
$ cmp /tmp/r3.md tasks/SIM.00.01/lane-m/rev3/cites_rev3_at_b612bc72.md (ignoring the header line naming the ADR source)
EXIT=0
$ node tools/check_deus_syntax.js
EXIT=0
Checked 52 DEUS plugin files. Errors: 0
$ node tools/governance/check_wbs_integrity.js
EXIT=0
INTEGRITY AUDIT SUMMARY: 15 passed, 0 failed
$ grep -c "^Status\|PROPOSED" docs/adr/README.md; grep -o "PROPOSED, Rev 3" docs/adr/README.md docs/adr/ADR-003_sim_render_split_and_lod.md
PROPOSED, Rev 3
Rev 3, PROPOSED
EXIT=0
```

**Notes on the output:**
- The "paths outside allowedPaths" line counts 0 and exits 1. That exit is `grep -c` finding no line, which is the expected result.
- The last block's `$` label is mistyped. The commands that actually ran were `grep -o "PROPOSED, Rev 3" docs/adr/README.md` and `grep -o "Rev 3, PROPOSED" docs/adr/ADR-003_sim_render_split_and_lod.md | head -1`, and the two output lines are theirs.
- The raw file is not committed: it lived in the temp folder, `%TEMP%\final_evidence.txt`.

## Evidence

- **No screenshot:** there is no runtime claim in this package.
- **Lane K state behind PENDING-K3.** Lane K's K3 baselines exist on its local branch: HEAD `86bf49a926ea0ed6a546b31c94de66dd6863628d` descends from `4da2e7345cf987671a0a0d5661be1b153654bfee`, which added `tasks/WG.00.09b/lane-k/perf/*.json`. `origin/task/lane-k` is still `983a9e46e3bd2eae0eb129e72f746d8ce6dbb2eb`, so the baselines are unpushed and unreviewed. §9.2 names their fields but adopts no number.

## Not done / known problems

- **Time budgets are still PENDING-K3** (§9.2). They must be amended from reviewed K3 baselines before SIM.00.03, as the WBS row allows. The storage budgets are set (§9.1), but the seed-fixture memory ceiling (8 MiB per area at 32 layers) and `sim.heap_mib` wait for a first measurement.
- **The citation verdicts are this lane's own** (sub-agents plus the writer), not independent. Sub-agent verdicts can miss things: the Rev 2 first pass rated C410, which the review had flagged, as TRUE.
- **`main` moved during the run.** 39 citations into `DEUS_Levels.js` and `DEUS_World.js` read differently at `e27e8be5`. The ADR stays pinned to `b612bc72` per the brief.
- **New design choices for the reviewer to attack:**
  - regions are 2-layer slabs, not Rev 2's bands (§5.1, Q13);
  - `MAX_L0` goes from 32 to 64 (§5.4);
  - the §18.2 shell-by-shell blast propagation approximates straight lines with parent chains;
  - the renderer-independent exposure module (§13.2).
- **Escalations** (`escalation.md`), none blocking:
  - E1: WBS rows WG.00.20, WG.00.21 and GP.07.02 cite the wrong DEC and VISION ids;
  - E2: V135's 1 ft fluid-depth labels conflict with DEC-013's 2 ft strata (Q17);
  - E3: `main` moved;
  - E4: DEC-013 lists the band ranges as decided, while the brief and 0028-AC call them PM defaults, OPEN.
- **Open questions added or retargeted:** Q13 (slabs), Q16 (5 → 32), Q17 (V135 feet), Q18 (blast numbers), Q19 (conjured matter, DEC-018), Q20 (the WBS DEC ids), Q21 (rises of 3–4 strata, DEC-019). Owner questions are listed, not answered.
- **Temp files.** Scratch files went to the system temp folder outside the repo. One stray file I created in `C:\tmp` (`new_ids.txt`) was deleted. `C:\tmp\sessions` was already there and was not touched.

## Try it in RMMZ

Not applicable: this package contains no code. To check the text:
1. Open `docs/adr/ADR-003_sim_render_split_and_lod.md` and read the Rev 3 change log (lines 25–48).
2. Pick any citation and check it: `git show b612bc7217349bce695e15395bd041f63673b89b:<path> | sed -n '<a>,<b>p'`.
3. Or rerun the extractor: `node tasks/SIM.00.01/lane-m/cite_check.js --adr-file docs/adr/ADR-003_sim_render_split_and_lod.md --rev b612bc7217349bce695e15395bd041f63673b89b`.

Expected: the cited lines show what the text says. The change log's line numbers land on the named sections.

## Decisions needed

- **Grok:** an independent review of this revision (the reviewed tip is the commit that adds this report).
- **Owner and PM:** sign-off on ADR-003, which stays PROPOSED until then. The Owner's questions: Q3–Q7, Q12, Q14, Q16, Q17, Q19, Q21, and DEC-017's go/no-go after the benchmarks (§13.3).
- **Coordinator:** E1 and E4 in `escalation.md`; Q9 and Q20.

## Final HEAD

The content commit is `647457b292ddbf5a8ba2802659aea4855454a721` (output of `git rev-parse HEAD` above). This report is committed on top of it, and the push result is in the writer's session report.
