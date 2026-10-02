# ART.GROUND.FIX lane-gn review

- Reviewer: Codex, OpenAI GPT-6 family; writer: Gemini.
- Review time: 2026-10-02 02:36 UTC.
- Reviewed writer TIP: `7386317e1fc3a3faa1cb80da33597814e6ff83a8` on `task/lane-gn`. This review does not certify a later writer commit.
- Scope: `tasks/ART.GROUND.FIX/lane-gn/BRIEF.md` and `lane.json`. Tests ran in a fresh shared clone at the TIP, under `%TEMP%/deus-lane-gn-review-7386317e`, before the temporary tile mutation.

## 1. Scope and file integrity

The required comparison to `15a6fe4c12eb15237f3c0d496d75d119a41d4940` **does not** stay within `lane.json` `allowedPaths` (`tools/art/verify_specimens_rgb.js`, `tasks/ART.GROUND.FIX/lane-gn/**`): 82 paths total, 4 allowed, 78 outside. Representative exact output:

```text
> git diff --name-status 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD
M       .agents/rules/deus-game-translation.md
M       docs/AUDIT_LOG.md
M       docs/OWNER_DECISIONS.md
D       docs/design/COLLAPSE_REPLAN_DEC083.md
A       docs/systems/ORIGINALITY_CHECK.md
M       game/data/sim/mass_tables.json
A       tasks/ART.GROUND.FIX/lane-gn/BRIEF.md
A       tasks/ART.GROUND.FIX/lane-gn/REPORT.md
A       tasks/ART.GROUND.FIX/lane-gn/lane.json
M       tools/art/verify_specimens_rgb.js
M       tools/build_female_settler_walk.js
... 82 paths total
> count against lane.json allowedPaths
total=82 allowed=4 outside=78
```

This is a base mismatch, not evidence that the Gemini lane commits edited 78 unrelated paths. `git merge-base 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD` returned `df911859f6c6adbfeb3a43d043d8fed2f6fd55db`; the supplied `15a6fe4c...` is later main, outside this branch's ancestry. The lane-side comparison was:

```text
> git diff --name-status origin/main...HEAD
A       tasks/ART.GROUND.FIX/lane-gn/BRIEF.md
A       tasks/ART.GROUND.FIX/lane-gn/REPORT.md
A       tasks/ART.GROUND.FIX/lane-gn/lane.json
M       tools/art/verify_specimens_rgb.js
> git diff --numstat df911859f6c6adbfeb3a43d043d8fed2f6fd55db HEAD -- tools/art/verify_specimens_rgb.js
4       4       tools/art/verify_specimens_rgb.js
```

No whole-file rewrite of the lane's code file is present: its four replacements leave 49 LF lines in both blobs, zero CRLF and no UTF-8 BOM (`df911859 bytes=4442 BOM=false CRLF=0 LF=49`; `7386317e bytes=4496 BOM=false CRLF=0 LF=49`). `git diff --check df911859... HEAD -- tools/art/verify_specimens_rgb.js` exited 0 with no output. The required comparison against `15a6fe4c...` does show large reverse-main diffs, including `tools/build_female_settler_walk.js` at `298/297` lines; those are outside the lane-side diff.

## 2. Brief deliverables at TIP

The brief has no numbered `Scope` section; these are its Change and Tests requirements checked individually.

1. Pin `mainSheet` to the `baseline()` revision: `tools/art/verify_specimens_rgb.js:11-12` both use `a5255704:game/img/tilesets/`. The diff replaces `origin/main` on line 12 only.
2. Reword references to the moving ref: `tools/art/verify_specimens_rgb.js:32` (Outside_A2 failure), `:45` (Outside_D failure), and `:48` (OK line) say `the pre-lane sheets (a5255704)`. The brief's count of three messages *and* an OK line does not match the source: there were two failure messages and one OK line. Along with `mainSheet`, four source lines changed, not five.
3. Keep all other code and art unchanged in the lane-side diff: the four paths quoted in check 1 are the complete `origin/main...HEAD` output; no `game/` path changed on this branch.
4. Run the three gate tests: all exited 0 in the fresh clone, as quoted in check 3.
5. Demonstrate a red baseline-tile replacement with the newly worded message: **not met**. The 96x144 slot-0 block from `git show a5255704:game/img/tilesets/Outside_A2.png` was copied into a temporary clone's sheet and the checker exited 1, but printed the generic expected-tile failure. `tools/art/verify_specimens_rgb.js:31` checks `got.equals(expected)` before the new baseline comparison at `:32`; the same ordering occurs for the swatch at `:44-45`.
6. Demonstrate a green run after later main commits: met. `git fetch origin` returned exit 0, and `origin/main` was later than `a5255704` when the fresh branch clone was made. The clean clone's checker exited 0. It had no `origin/main` ref (`git rev-parse --verify origin/main` exited 1 with `fatal: Needed a single revision`), which also shows this check no longer needs that moving ref.

## 3. Tests and mutations

The fresh clone resolved `HEAD` to `7386317e1fc3a3faa1cb80da33597814e6ff83a8`. The three manifest gate tests each exited 0:

```text
> node tools/check_deus_syntax.js
Checked 62 DEUS plugin files. Errors: 0
> node tools/art/verify_specimens_rgb.js
[OK] Outside_A2.png 32 slots match table sets, stand-ins or named baseline exceptions
[OK] Dungeon_A2.png 32 slots match table sets, stand-ins or named baseline exceptions
[OK] gallery and Outside_D match all 34 kept sets, two Owner masters and three stand-in swatches
[OK] Outside A2 slots 0/1 and Outside D swatches 0/1 derive from Owner masters and differ from the pre-lane sheets (a5255704)
> node tools/art/test_ground_kept_sets.js
[OK] 34 table sets, two alternatives, deleted-ID exclusion and master sidecars
[OK] Map001 Git blob byte-identical to a5255704
[OK] Tilesets 2/4 load Outside_D; diff touches only those two one-line entries and their D names
```

All five named `verify_specimens_rgb.js` mutants exited 1 (5/5 red), and all four named `test_ground_kept_sets.js` mutants exited 1 (4/4 red):

```text
> node tools/art/verify_specimens_rgb.js --mutant=outside-source
[FAIL] Outside_A2.png slot 4 is not forest_floor_base
> node tools/art/verify_specimens_rgb.js --mutant=grass-slot-0
[FAIL] Outside_A2.png slot 0 is not meadow
> node tools/art/verify_specimens_rgb.js --mutant=grass-slot-1
[FAIL] Outside_A2.png slot 1 is not tropical_grass
> node tools/art/verify_specimens_rgb.js --mutant=grass-d-0
[FAIL] gallery swatch 0 meadow
> node tools/art/verify_specimens_rgb.js --mutant=grass-d-1
[FAIL] gallery swatch 1 tropical_grass
> node tools/art/test_ground_kept_sets.js --mutant=source-id
[FAIL] deleted source in allowlist
> node tools/art/test_ground_kept_sets.js --mutant=map
[FAIL] Map001 Git blob differs byte-for-byte from lane base
> node tools/art/test_ground_kept_sets.js --mutant=tilesets
[FAIL] Tilesets non-name field 2 modified
> node tools/art/test_ground_kept_sets.js --mutant=d-name
[FAIL] Tilesets 2 D sheet must be Outside_D and be the only name change
```

Physical mutation, also in the temporary clone, exited 1 (1/1 red) but failed the brief's exact diagnostic requirement:

```text
> node review_mutate_tmp.js
replaced Outside_A2.png slot 0 with a5255704 block (96x144)
> node tools/art/verify_specimens_rgb.js
[FAIL] Outside_A2.png slot 0 is not meadow
```

## 4. REPORT.md audit

`REPORT.md`'s numeric output matches this review's run: 62 files / 0 syntax errors, 32 slots per A2 sheet, 34 kept sets, two Owner masters, three stand-in swatches, slots/swatches 0/1, and pinned `a5255704`. Its two recorded command outputs match the fresh-clone output above. The report explicitly says `ground_kept_sets.js` was not checked by the writer; this review ran it successfully. The report omits the brief's required temporary-tile mutation and later-main clone evidence. It does not claim those were run, but its unqualified “stop check failing once masters are merged to main” was not itself demonstrated in the report. No RMMZ playtest was reported or run for this tooling-only lane.

## 5. Five-line confirmation

Cannot confirm five touched lines. The exact `git diff df911859... HEAD -- tools/art/verify_specimens_rgb.js` has four `-` and four `+` lines: `mainSheet` at line 12 and the three strings at lines 32, 45, 48. `git diff --numstat` prints `4 4 tools/art/verify_specimens_rgb.js`. No other line in that file was edited.

## N. Integration tree

After `git fetch origin` exited 0, `git merge-tree --write-tree origin/main HEAD` exited 0 and printed tree `e11695e33652f695409e06ce37289a4323a91b47` when `origin/main` was `15a6fe4c12eb15237f3c0d496d75d119a41d4940`. Main advanced during this review to `a702810371b35ecf348f1f8fede487fd899dce95`; repeating the merge-tree command against that ref exited 0 and printed `346bb7bb9b0183aad85f2625bb4840bdf8736a7f`. The authorized integrator still needs `merge_gate`; no gate or merge was run here.

## Findings

- **MAJOR — required scope assertion fails at the specified base.** The exact `git diff 15a6fe4c... HEAD` has 78 paths outside `allowedPaths`. The lane-side diff is in scope, so this is a review-base/branch-age issue, not 78 writer edits. The requested criterion cannot be signed off as true at this TIP.
- **MAJOR — required baseline mutation diagnostic is not observed.** The physical slot-0 replacement and `grass-slot-0` both exit 1 with `slot 0 is not meadow`, because line 31 fails before line 32's newly worded check. The analogous Outside_D comparison is also after its expected-tile check. The brief explicitly requests the new message.
- **MINOR — five-line claim is inaccurate.** Four source lines changed, with no BOM or line-ending rewrite. The brief's message count also exceeds the number of moving-ref messages present in the source.
- **MINOR — REPORT.md lacks the mutation and post-main clone evidence required by the brief.** Its recorded numeric output is accurate and its unrun kept-sets check is labeled honestly.

VERDICT: REJECT
