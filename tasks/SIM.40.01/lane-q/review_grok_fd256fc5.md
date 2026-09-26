# SIM.40.01 Fix1 review (Grok) of fd256fc5316adf70e8ba4fb0540014a87ca82fb7

Independent re-review of Lane Q after the failed review of `9d5b40d32f96a38803b1f32f78287a902d2bead8` (`review_grok_9d5b40d3.md`: 0 BLOCKER, 1 MAJOR, 5 MINOR). The design, trace, report, escalation, briefs and lane manifest were not edited. Checks ran in a fresh temporary clone (`git clone -c core.autocrlf=false` of this worktree, then `git checkout --detach fd256fc5316adf70e8ba4fb0540014a87ca82fb7`). The clone was deleted after the checks. No art was generated.

Reviewed writer tip: `fd256fc5316adf70e8ba4fb0540014a87ca82fb7`.

## Identity

Worktree, one invocation. Raw:

```text
git rev-parse HEAD
fd256fc5316adf70e8ba4fb0540014a87ca82fb7
HEAD_EXIT=0

git rev-parse origin/task/lane-q
fd256fc5316adf70e8ba4fb0540014a87ca82fb7
ORIGIN_EXIT=0

git log -8 --format="%H %an %s"
fd256fc5316adf70e8ba4fb0540014a87ca82fb7 deus-claude [claude] SIM.40.01 Fix1 REPORT.md: findings and changes, gate in a temp clone of b2ca032a, checker controls
b2ca032a1ccc5af226be11095766f436f5db2a34 deus-claude [claude] SIM.40.01 Fix1 one fall-length rule (dropTop) for unit falls; kg rounding rule and table fixes; ice, lava, WBS cite
d7127d1ddea909013841820cd24a5a9c871d07fd snewt [ops] SIM.40.01 lane-q launch prompt 20260926_045201
44f868a70b72b88dca6152475a43c91eb1618ee4 snewt [pm] SIM.40.01 Fix1 brief after Grok VERDICT FAIL at 9d5b40d3
77a80a854bd0c06aa498534ef19f952c1d3ab169 deus-grok [grok] SIM.40.01 review 9d5b40d3
9d5b40d32f96a38803b1f32f78287a902d2bead8 deus-claude [claude] SIM.40.01 REPORT.md: commands, exit codes, gate output, counts
17c346d50ebc7a9867625314fac802fc7cc7c277 deus-claude [claude] SIM.40.01 reconcile with Lanes R and W (section 9.7); escalation: three ledger mass units
a76b1512fd9643e12f5e0fb93330e15946ec6abd deus-claude [claude] SIM.40.01 proof-read fixes: governing material of a member, cross references, examples within spans
LOG_EXIT=0
```

HEAD matched `origin/task/lane-q`. The review continued. Re-checked immediately before this file was written: both refs were still `fd256fc5316adf70e8ba4fb0540014a87ca82fb7` (`HEAD_EXIT=0`, `ORIGIN_EXIT=0`).

Clone, after detach:

```text
HEAD is now at fd256fc5 [claude] SIM.40.01 Fix1 REPORT.md: findings and changes, gate in a temp clone of b2ca032a, checker controls
CHECKOUT_EXIT=0
git rev-parse HEAD
fd256fc5316adf70e8ba4fb0540014a87ca82fb7
REVPARSE_EXIT=0
```

`tasks/SIM.40.01/lane-q/evidence/` is not in the tip. `git ls-tree -r --name-only HEAD -- tasks/SIM.40.01/lane-q` (`LSTREE_EXIT=0`) lists BRIEF.md, BRIEF_FIX1.md, REPORT.md, SIM.40.01_STRUCTURAL_SUPPORT.md, escalation.md, lane.json, three launch prompts (`20260926_032106`, `20260926_034605`, `20260926_045201`), review_grok_9d5b40d3.md, and trace.json.

## Scope

In the clone. Tabs in the raw name-status are shown below as ` | `.

```text
git diff --name-status 84ee3b55f3f8c1b8a16710ccf3878795d98d1683 fd256fc5316adf70e8ba4fb0540014a87ca82fb7
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
DIFF_EXIT=0
```

`lane.json` `allowedPaths` is `tasks/SIM.40.01/lane-q/**` only.

| Path | Diff | Inside allowedPaths |
|---|---|---|
| `tasks/SIM.40.01/lane-q/BRIEF.md` | A | yes |
| `tasks/SIM.40.01/lane-q/BRIEF_FIX1.md` | A | yes |
| `tasks/SIM.40.01/lane-q/REPORT.md` | A | yes |
| `tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md` | A | yes |
| `tasks/SIM.40.01/lane-q/escalation.md` | A | yes |
| `tasks/SIM.40.01/lane-q/lane.json` | A | yes |
| `tasks/SIM.40.01/lane-q/launches/20260926_032106_prompt.txt` | A | yes |
| `tasks/SIM.40.01/lane-q/launches/20260926_034605_prompt.txt` | A | yes |
| `tasks/SIM.40.01/lane-q/launches/20260926_045201_prompt.txt` | A | yes |
| `tasks/SIM.40.01/lane-q/review_grok_9d5b40d3.md` | A | yes |
| `tasks/SIM.40.01/lane-q/trace.json` | A | yes |

No path is outside `tasks/SIM.40.01/lane-q/**`. `git diff --name-only 84ee3b55f3f8c1b8a16710ccf3878795d98d1683 HEAD -- game tools art docs` printed no paths (`OUTSIDE_EXIT=0`). No file under `game/`, `tools/`, `docs/`, or `art/` is in the diff. The worktree also has untracked `tasks/SIM.40.01/lane-q/launches/20260926_043657_prompt.txt` and `tasks/SIM.40.01/lane-q/launches/20260926_051620_prompt.txt`; neither is in `fd256fc5316adf70e8ba4fb0540014a87ca82fb7`.

`git diff --stat 77a80a854bd0c06aa498534ef19f952c1d3ab169 HEAD -- tasks/SIM.40.01/lane-q/review_grok_9d5b40d3.md` was empty (`REVIEW_DIFF_EXIT=0`). The prior review file is unchanged.

The design commit and this tip share the design and the trace. Raw:

```text
git rev-parse b2ca032a1ccc5af226be11095766f436f5db2a34:tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md
9c1389fe9fd89bd0eea1c9410d590e438b76e729
BLOB_DESIGN_B2_EXIT=0
git rev-parse HEAD:tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md
9c1389fe9fd89bd0eea1c9410d590e438b76e729
BLOB_DESIGN_HEAD_EXIT=0
git rev-parse b2ca032a1ccc5af226be11095766f436f5db2a34:tasks/SIM.40.01/lane-q/trace.json
5f7fc57e9d54e5a2ef5f8c88b3399a338613709c
BLOB_TRACE_B2_EXIT=0
git rev-parse HEAD:tasks/SIM.40.01/lane-q/trace.json
5f7fc57e9d54e5a2ef5f8c88b3399a338613709c
BLOB_TRACE_HEAD_EXIT=0
git diff --name-status b2ca032a1ccc5af226be11095766f436f5db2a34 HEAD
M | tasks/SIM.40.01/lane-q/REPORT.md
DIFF_TIP_EXIT=0
```

REPORT.md's gate, run on `b2ca032a1ccc5af226be11095766f436f5db2a34`, therefore read the same design and trace as this tip.

## Gate

`lane.json` `gateTests[0]`, run from the clone root at `fd256fc5316adf70e8ba4fb0540014a87ca82fb7`:

```text
node -e "<lane.json gateTests[0].args>"
task SIM.40.01 reqs 12 missing none bad none missingHeadings none ownerQuestions 14 mdBytes 131242
GATE_EXIT=0
```

That matches REPORT.md (task, 12 requirements, no missing ids, no bad sections, no missing headings, 14 owner questions, 131,242 bytes). Node also printed a `NO_COLOR`/`FORCE_COLOR` warning on stderr; the gate process still exited 0.

## Prior FAIL, measured again

Fix1 acceptance: one length for unit fall damage, T10 and worked examples recomputed to that rule, the T10 mutant attacks that rule, SRD dice kept, and MINOR-1..5 closed in the document. Each was checked in the clone.

### MAJOR-1 closed: one unit length, `dropTop`

Section 6.2 step 3 now states one rule. A falling surface drops from where it was to the top of `landing`, both read before the collapse deposits anything. It defines:

- `dropTop = e1 − landing`: drop of the member's top surface. Units, objects and items on that surface fall this far. The sentence **Unit fall damage uses `dropTop` and no other length** is in §6.2.
- `dropGap = e0 − (landing + 1)`: air gap under the member. It sets only the debris addition.

`dropTop = dropGap + t` holds for a one-stratum floor. Section 6.5 sets `ft = 2 × dropTop` and dice `min(20, floor(ft / 10))` = `min(20, floor(dropTop / 5))`. One layer (S0 of z+1 onto S0 of z) is 5 strata, 10 ft, 1d6. The old unit formula `h = e0 − (landing + 1)` and the phrase `strata fallen` are gone from the design (they remain only in BRIEF_FIX1.md and the previous review, which Fix1 was told to leave untouched).

For ground at S0 of layer 0 and a one-stratum floor at S0 of layer +k, `e = 5k`. Recomputed:

| Floor | `dropTop` | ft | dice | `dropGap` | debris ft |
|---|---|---|---|---|---|
| S0 of +1 | 5 | 10 | 1 | 4 | 8 |
| S0 of +2 | 10 | 20 | 2 | 9 | 18 |
| S0 of +3 | 15 | 30 | 3 | 14 | 28 |

Section 6.5's table and T10 print those three passes: `ft` 10, 20 and 30 and dice 1, 2 and 3. The +2 case that used to be 18 ft / 1d6 under the air gap and 20 ft / 2d6 under the foot drop is now 20 ft / 2d6 for the unit, and 18 ft is labeled debris only. The vault case at S0 of +1 keeps 5d6: `dropGap` 4 strata is 8 ft, and `5 + max(0, floor(4 / 5) − 1) = 5`, so the height adds nothing.

T10's mutants attack that rule. (a) measuring the unit by `dropGap` gives 8, 18, 28 ft and 0, 1, 2 dice. (b) a 1 ft stratum height on the same index gaps gives 5, 10, 15 ft and 0, 1, 1 dice. (c) burial not applied. SRD dice stay 1d6 per 10 ft, cap 20d6 (`rules.json:4390` is the entry id `srd:rule:adventuring-the-environment`; the quoted falling sentence is in that entry's text at line 4403).

The same length is what §7.3 (roof debris labeled `dropGap` 4 strata, 8 ft), §8.6 item 4 (units on a destroyed voxel fall `dropTop`), §8.7 (a projectile uses the lowest-surface drop of §6.2), §11.1 row 6 (`ft` is `2 × dropTop` for a fall and `2 × dropGap` for debris), OQ-Q-08, and `trace.json` Q-05 / PROPOSED-Q-07 use.

Independent recompute in the clone (`NUM_EXIT=0`, `bad 0`): `fall+1 5,10,1,4`, `fall+2 10,20,2,9`, `fall+3 15,30,3,14`, `mutantA 0,1,2`, `mutantB 0,1,1`, `vaultAdd 5`.

### MINOR-1..5 closed

Recomputed with the stated rule (nearest integer kg, halves up, once; derived rows multiply the source integer). `NUM_EXIT=0`.

| Finding | Printed now | Recomputed |
|---|---|---|
| MINOR-1 `conjured_stone` | 389 kg; T16 `10 × 10 × 389 = 38,900` | `0.10 × 3,894 = 389.4` → 389; `10 × 10 × 389 = 38,900` |
| MINOR-2 `timber_roof` | 139 | `60 × 2.322576 = 139.35456` → 139. Thatch `41 × 2.322576 = 95.225616` → 95 |
| MINOR-3 floating ice | `P = floor(7 × h² / 2)`; 13,023 and 52,094 | `floor(7 × 61² / 2) = 13,023`; `floor(7 × 122² / 2) = 52,094`. `3.5 × 3,721 = 13,023.5` truncates to 13,023; `3.5 × 14,884 = 52,094` |
| MINOR-4 lava → basalt | 2 du × 2,053 kg = one basalt voxel of 4,106 kg; an odd du becomes 2,053 kg of basalt-lineage rubble | `2 × 2,053 = 4,106`, the §2.3 basalt row. 2,053 is prime. No second basalt kg |
| MINOR-5 WBS Rev 25 | §0.1 cites `docs/worldgen/DEUS_WORLDGEN_WBS.md` Rev 25 (`:4`) | At `84ee3b55f3f8c1b8a16710ccf3878795d98d1683`, line 3 is `**Namespace:** WG` and line 4 is `**Rev:** 25` (`CITE_EXIT=0`) |

`DEUS_Fluid.js:50` at that base is `const DEPTH_MAX = 7;` (`CITE_EXIT=0`), which is the new line MINOR-4 cites. Stale strings `38,200`, `13,020`, `52,080`, `4,107`, and `2,738` are absent from the design. `timber_floor` 52 kg/m² is now 121 (`52 × 2.322576 = 120.773952`). The report discloses that extra correction. No other design line uses 120 as a timber-floor kg (the remaining 120s are limestone maxHP, the cited stone `maxHP: 120`, and bronze tin at 120 per mille).

The same recompute still matches the other stated rows that the new rounding sentence covers: granite 3,894, basalt 4,106, slate 3,752, marble 3,823, limestone 3,256, sandstone 2,973, soil 2,265, oak 1,062, solid ice 1,298, granite rubble 2,336, masonry 977, stone vault 1,140, foundation 1,954, timber wall 266 (265.5, halves up).

## Spot checks that held

- Required headings are present. `trace.json` has Q-01..Q-12. Statuses: COVERED 11 (Q-01..Q-07, Q-09..Q-12), PARTIAL 1 (Q-08). Owner questions: 14. Acceptance-test rows matching `^| T` number 18 (`tests 18` in the recompute).
- Q-08 stays PARTIAL. `escalation.md` is not in the Fix1 design diff; the three ledger mass units (Lane Q kg, Lane R 1/16 lb, Lane W g) remain an open PM question. Fix1 did not claim to close it. That carry is explicit in REPORT.md and in the Q-08 notes.
- REPORT.md records MAJOR-1 and MINOR-1..5 as fixed in the document, with section pointers that match the diff from `9d5b40d32f96a38803b1f32f78287a902d2bead8` to `b2ca032a1ccc5af226be11095766f436f5db2a34` (`DIFFSTAT_EXIT=0`: design 55 lines, trace 10 lines, plus the PM brief, the launch prompt, and the previous review file).
- The design does not call its own work DONE, VERIFIED or CLOSED. "PASS or FAIL" in §12.1 is the later test harness's output. Art in the design is three "art slot needed" text lines (§3.6). No image, palette or generated art file is in the diff.
- Two limits the report states are single rules, already written in §6.2: a unit that falls through fluid uses the same `landing` (the first solid or loose voxel), and a unit's `dropTop` is not shortened by its own member's debris pile. They do not restore a second unit-fall length.

## Findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

None.

## Art (DEC-007)

No art was generated, requested or integrated by this review. The commit under review adds no art file. The design's only art text is catalogue slot names.

VERDICT: CLEAN PASS
