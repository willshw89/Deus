# ART.GROUND.FIX lane-gn review

- Reviewer: Codex, OpenAI GPT-6 family; writer family: Gemini.
- Reviewed TIP: `0f0e357b323be328828949c65b632ce53552a4d4` on `task/lane-gn`.
- Review time: 2026-10-02 02:46 UTC.
- Brief: `tasks/ART.GROUND.FIX/lane-gn/BRIEF.md`; manifest: `tasks/ART.GROUND.FIX/lane-gn/lane.json`.
- Tests used a fresh shared clone of this TIP at `%TEMP%/deus-lane-gn-review-0f0e357b`. Only that temporary clone's tile was changed for the physical mutation. This review covers the named TIP, not any later writer commit.

## 1. Scope and file integrity

The specified comparison to `15a6fe4c12eb15237f3c0d496d75d119a41d4940` fails the `lane.json` whitelist. The allowed paths are `tools/art/verify_specimens_rgb.js` and `tasks/ART.GROUND.FIX/lane-gn/**` (`lane.json:8-11`). Three of eight changed paths are outside them:

```text
> git diff --name-status 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD
M       docs/STATUS.md
A       tasks/ART.GROUND.FIX/lane-gn/BRIEF.md
A       tasks/ART.GROUND.FIX/lane-gn/REPORT.md
A       tasks/ART.GROUND.FIX/lane-gn/lane.json
A       tasks/ART.GROUND.FIX/lane-gn/review_codex_7386317e.md
A       tasks/WG.65.04/lane-fi/BRIEF.md
A       tasks/WG.65.04/lane-fi/lane.json
M       tools/art/verify_specimens_rgb.js
> count against allowedPaths
total=8 allowed=5 outside=3
M       docs/STATUS.md
A       tasks/WG.65.04/lane-fi/BRIEF.md
A       tasks/WG.65.04/lane-fi/lane.json
> git merge-base 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD
15a6fe4c12eb15237f3c0d496d75d119a41d4940
```

The two outside-scope PM commits appear between the specified base and the lane commits (`449abbd2` for `docs/STATUS.md`, `a7028103` for lane-fi's brief and manifest). This is a branch-scope failure at the requested base, not evidence that Gemini edited those files. The lane-side comparison itself contains five allowed paths:

```text
> git diff --name-status origin/main...HEAD
A       tasks/ART.GROUND.FIX/lane-gn/BRIEF.md
A       tasks/ART.GROUND.FIX/lane-gn/REPORT.md
A       tasks/ART.GROUND.FIX/lane-gn/lane.json
A       tasks/ART.GROUND.FIX/lane-gn/review_codex_7386317e.md
M       tools/art/verify_specimens_rgb.js
> git diff --numstat 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD -- tools/art/verify_specimens_rgb.js
6       4       tools/art/verify_specimens_rgb.js
> blob byte check, git show 15a6fe4c:... and HEAD:...
15a6fe4c12eb15237f3c0d496d75d119a41d4940 bytes=4442 BOM=false CRLF=0 LF=49
HEAD bytes=4503 BOM=false CRLF=0 LF=51
```

There is no whole-file rewrite, BOM insertion, or LF-to-CRLF rewrite of the checker. The two extra LF lines are whitespace-only lines. The required diff check itself reports them, plus existing new-file whitespace:

```text
> git diff --check 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD
exit 1
tasks/ART.GROUND.FIX/lane-gn/REPORT.md:23: trailing whitespace.
tasks/WG.65.04/lane-fi/BRIEF.md:17: trailing whitespace.
tasks/WG.65.04/lane-fi/lane.json:26: trailing whitespace.
tools/art/verify_specimens_rgb.js:33: trailing whitespace.
tools/art/verify_specimens_rgb.js:47: trailing whitespace.
```

## 2. Brief requirements at TIP

The brief has `Change` and `Tests` sections, not numbered `Scope` items (`BRIEF.md:19-29`). Checked each instruction:

1. **Pin the comparison:** done in `tools/art/verify_specimens_rgb.js:11-12`; both `baseline()` and `mainSheet()` use `a5255704`.
2. **Reword the moving-ref diagnostics and OK line:** done at `tools/art/verify_specimens_rgb.js:31`, `:45`, and `:50`. The brief says three messages and an OK line, but the prior source contained two failure messages and one OK line. The new output is quoted in check 3.
3. **Change nothing else; do not reformat:** not fully met. The writer also moved the normal expected-value checks to lines 32 and 46 so the baseline diagnostic can fire first, and inserted whitespace-only lines 33 and 47. The reordering satisfies the required physical-mutation diagnostic; the trailing whitespace adds no behavior.
4. **Three fresh-clone gate tests:** done, all exit 0 (check 3).
5. **Physical slot-0 baseline mutation must exit 1 with the new message:** done, exit 1 with the pinned-baseline diagnostic (check 3).
6. **Green clone after later main commits:** done. `origin/main` is 138 commits after `a5255704`, the clean shared clone at the TIP ran the checker with exit 0, and that clone did not have an `origin/main` ref:

```text
> git rev-list --count a5255704..origin/main
138
> git -C %TEMP%/deus-lane-gn-review-0f0e357b rev-parse HEAD
0f0e357b323be328828949c65b632ce53552a4d4
> git -C %TEMP%/deus-lane-gn-review-0f0e357b rev-parse --verify origin/main
fatal: Needed a single revision
origin/main ref exit=128
> node tools/art/verify_specimens_rgb.js   (clean clone)
[OK] Outside A2 slots 0/1 and Outside D swatches 0/1 derive from Owner masters and differ from the pre-lane sheets (a5255704)
exit 0
```

No `game/` path is in the lane-side diff, so this tooling lane is outside the game-translation proof requirement.

## 3. Tests and mutations

All three `lane.json` gate tests passed in the clean shared clone at the reviewed TIP. These are the actual outputs:

```text
> node tools/check_deus_syntax.js                 exit 0
Checked 62 DEUS plugin files. Errors: 0
> node tools/art/verify_specimens_rgb.js          exit 0
[OK] Outside_A2.png 32 slots match table sets, stand-ins or named baseline exceptions
[OK] Dungeon_A2.png 32 slots match table sets, stand-ins or named baseline exceptions
[OK] gallery and Outside_D match all 34 kept sets, two Owner masters and three stand-in swatches
[OK] Outside A2 slots 0/1 and Outside D swatches 0/1 derive from Owner masters and differ from the pre-lane sheets (a5255704)
> node tools/art/test_ground_kept_sets.js         exit 0
[OK] 34 table sets, two alternatives, deleted-ID exclusion and master sidecars
[OK] Map001 Git blob byte-identical to a5255704
[OK] Tilesets 2/4 load Outside_D; diff touches only those two one-line entries and their D names
```

All five named specimen mutants and all four named kept-set mutants exited 1: **5/5 and 4/4 red**. The failure lines below are from the corresponding `--mutant=` commands:

```text
> node tools/art/verify_specimens_rgb.js --mutant=outside-source   exit 1
[FAIL] Outside_A2.png slot 4 is not forest_floor_base
> node tools/art/verify_specimens_rgb.js --mutant=grass-slot-0     exit 1
[FAIL] Outside_A2.png slot 0 still equals the pre-lane sheets (a5255704)
> node tools/art/verify_specimens_rgb.js --mutant=grass-slot-1     exit 1
[FAIL] Outside_A2.png slot 1 still equals the pre-lane sheets (a5255704)
> node tools/art/verify_specimens_rgb.js --mutant=grass-d-0        exit 1
[FAIL] Outside_D swatch 0 still equals the pre-lane sheets (a5255704)
> node tools/art/verify_specimens_rgb.js --mutant=grass-d-1        exit 1
[FAIL] Outside_D swatch 1 still equals the pre-lane sheets (a5255704)
> node tools/art/test_ground_kept_sets.js --mutant=source-id       exit 1
[FAIL] deleted source in allowlist
> node tools/art/test_ground_kept_sets.js --mutant=map             exit 1
[FAIL] Map001 Git blob differs byte-for-byte from lane base
> node tools/art/test_ground_kept_sets.js --mutant=tilesets        exit 1
[FAIL] Tilesets non-name field 2 modified
> node tools/art/test_ground_kept_sets.js --mutant=d-name          exit 1
[FAIL] Tilesets 2 D sheet must be Outside_D and be the only name change
```

For the separate physical mutation, `review_mutate_tmp.js` in the temporary clone used the checker's `block()` implementation to copy slot 0's 96x144 RGBA block from `git show a5255704:game/img/tilesets/Outside_A2.png` into that clone's sheet. The setup succeeded and the actual check went red with the requested diagnostic, **1/1 red**:

```text
> node review_mutate_tmp.js
replaced Outside_A2.png slot 0 with a5255704 block (96x144)
mutation setup exit=0
> node tools/art/verify_specimens_rgb.js
[FAIL] Outside_A2.png slot 0 still equals the pre-lane sheets (a5255704)
physical mutation check exit=1
```

## 4. REPORT.md audit

Every numeric output in `REPORT.md:10-14` matches this review's clean-clone run: 62 plugin files, 0 syntax errors, 32 slots in each A2 sheet, 34 kept sets, two Owner masters, three stand-in swatches, slots and swatches 0/1, and baseline `a5255704`. The corresponding command output is quoted in check 3. The report's `Not checked: ground_kept_sets.js` (`:17`) describes the writer's tests; this reviewer ran it and got exit 0. `Not checked` for RMMZ (`:20`) is accurate for this tooling-only diff. Its statement that pinning stops the post-merge failure is supported by the clean shared-clone run quoted in check 2.

```text
> rg -n '^Checked|^\[OK\]|^\- Not checked|^Not checked' tasks/ART.GROUND.FIX/lane-gn/REPORT.md
10:Checked 62 DEUS plugin files. Errors: 0
11:[OK] Outside_A2.png 32 slots match table sets, stand-ins or named baseline exceptions
12:[OK] Dungeon_A2.png 32 slots match table sets, stand-ins or named baseline exceptions
13:[OK] gallery and Outside_D match all 34 kept sets, two Owner masters and three stand-in swatches
14:[OK] Outside A2 slots 0/1 and Outside D swatches 0/1 derive from Owner masters and differ from the pre-lane sheets (a5255704)
17:- Not checked: ground_kept_sets.js
20:Not checked.
```

The report omits the later writer commit's check reordering, the named mutant results, the physical tile mutation, and the later-main clone demonstration. It does not claim those tests were run by the writer; no number is overstated. The report also has trailing whitespace at line 23, as quoted in check 1.

## 5. Five-line confirmation

Cannot confirm that the checker edit touched only five lines. The exact base-to-TIP diff reports `6 4 tools/art/verify_specimens_rgb.js`; it replaces the `mainSheet` line, relocates two expected-value checks before/after the pinned-baseline checks, replaces the OK line, and adds two whitespace-only lines. The source grows from 49 to 51 LF lines. The concrete failure and success checks pass, but the requested five-line limit and the brief's `Change nothing else in the file. Do not reformat` wording are not literally met.

```text
> git diff --numstat 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD -- tools/art/verify_specimens_rgb.js
6       4       tools/art/verify_specimens_rgb.js
> git diff --check 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD -- tools/art/verify_specimens_rgb.js
tools/art/verify_specimens_rgb.js:33: trailing whitespace.
tools/art/verify_specimens_rgb.js:47: trailing whitespace.
exit 1
```

## N. Integration tree

```text
> git fetch origin
exit 0
> git rev-parse origin/main
257b77841f741fe675b2d84a568b3ca8085a2973
> git merge-tree --write-tree origin/main HEAD
5a7dfdab4916b353d118beec9cb9433fdec23462
exit 0
```

No merge gate or merge was run in this review.

## Findings

- **MAJOR — exact requested scope check fails.** The specified base-to-TIP diff has three paths outside `allowedPaths` (`docs/STATUS.md` and lane-fi's brief and manifest). They entered this branch through PM commits before the lane commits, but the requested criterion is false at the reviewed TIP.
- **MINOR — checker edit exceeds the stated line limit and adds trailing whitespace.** `git diff --numstat` is `6 4`, and `git diff --check` identifies lines 33 and 47 in the checker. The validation reorder is needed to make the brief's red diagnostic observable; the whitespace-only lines are unnecessary.
- **MINOR — REPORT.md omits the later fix and required mutation/clone evidence.** Its logged numbers are accurate and its unrun checks are labeled honestly, but its `What changed` section predates the check reorder at this TIP.

VERDICT: REJECT
