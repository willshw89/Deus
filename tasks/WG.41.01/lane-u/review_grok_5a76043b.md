# Grok review: WG.41.01 Lane U art placement + validator

Reviewed commit: 5a76043be592484fc5264816641e5d94172a353b

Independent review of the Lane U tip. No code, tests, fixtures, or BRIEF were modified. No art was generated, requested, or integrated. Synthetic cells exist only as temp output of `tools/art/test_place_art.js` and were deleted with the clone.

## Worktree identity

Commands run in `C:\Users\snewt\.deus_worktrees\lane-u` before the review clone.

```text
$ git rev-parse HEAD origin/task/lane-u
5a76043be592484fc5264816641e5d94172a353b
5a76043be592484fc5264816641e5d94172a353b
EXIT=0

$ git log -8 --format="%H %an %s"
5a76043be592484fc5264816641e5d94172a353b deus-claude [claude] WG.41.01 REPORT.md: record the report commit hash
889aa3256b54aeffa8543ea69f2461ba8054d4b7 deus-claude [claude] WG.41.01 REPORT.md updated to the adb99356 gate, sweep and CLI evidence (154 checks, 19 mutants)
82466dc8d3d3bcd960f3bb963d2a85d9e99a7422 deus-claude [claude] WG.41.01 evidence: fresh-clone gate, provoke sweep and CLI examples re-run at adb99356
adb993565cf0e40ef008d7062e2161707a1bf887 snewt [ops] WG.41.01 lane-u launch prompt 20260926_034626
4bef75eb031ab958306e1b08e76562bf49aa216c deus-pm [pm] WIP checkpoint after Claude usage limit
7204d020a81f4e406b815f4fad20a82135e19ce4 deus-claude [claude] WG.41.01 escalation: Lane S interface points (geometry rows, tile class, runtime targets, OWNER_OPEN alpha); ledger doc update
bf0fc4f0ae21c88987478f470826226863c9cbf7 deus-claude [claude] WG.41.01 WIP: align geometry rows, tile class and runtime kinds with the Lane S schema; review fixes
4132e8586e37e852aa268ae58b2a089bcbc8a927 deus-claude [claude] WG.41.01 test: print how each mutant's kill case failed
EXIT=0
```

HEAD equals `origin/task/lane-u`. The same pair was read again immediately before this file was written; both still printed `5a76043be592484fc5264816641e5d94172a353b`, EXIT=0.

## Fresh clone

```text
$ git clone -c core.autocrlf=false C:\Users\snewt\.deus_worktrees\lane-u $TEMP\laneu-review-5a76043b
CLONE_EXIT=0
$ git checkout --detach 5a76043be592484fc5264816641e5d94172a353b
HEAD is now at 5a76043b [claude] WG.41.01 REPORT.md: record the report commit hash
CHECKOUT_EXIT=0
$ git rev-parse HEAD
5a76043be592484fc5264816641e5d94172a353b
REVPARSE_EXIT=0
```

Node v24.19.0 (`node --version`, EXIT=0). Every command below ran in that detached clone unless noted.

## Scope

Base `b612bc7217349bce695e15395bd041f63673b89b` to tip `5a76043be592484fc5264816641e5d94172a353b`.

```text
$ git diff --name-status b612bc7217349bce695e15395bd041f63673b89b 5a76043be592484fc5264816641e5d94172a353b
A	docs/art/APPROVALS_FORMAT.md
A	tasks/WG.41.01/lane-u/BRIEF.md
A	tasks/WG.41.01/lane-u/REPORT.md
A	tasks/WG.41.01/lane-u/escalation.md
A	tasks/WG.41.01/lane-u/evidence/cli_examples.txt
A	tasks/WG.41.01/lane-u/evidence/gate_fresh_clone.txt
A	tasks/WG.41.01/lane-u/evidence/provoke_sweep.txt
A	tasks/WG.41.01/lane-u/lane.json
A	tasks/WG.41.01/lane-u/launches/20260926_022424_prompt.txt
A	tasks/WG.41.01/lane-u/launches/20260926_034626_prompt.txt
A	tools/art/fixtures/place/catalogue.fixture.json
A	tools/art/fixtures/place/geometry.fixture.json
A	tools/art/fixtures/place/palette.fixture.json
A	tools/art/place_art.js
A	tools/art/test_place_art.js
A	tools/art/validate_art.js
NAMESTATUS_EXIT=0
```

| Status | Path | allowedPaths |
| --- | --- | --- |
| A | `docs/art/APPROVALS_FORMAT.md` | exact |
| A | `tasks/WG.41.01/lane-u/BRIEF.md` | `tasks/WG.41.01/lane-u/**` |
| A | `tasks/WG.41.01/lane-u/REPORT.md` | `tasks/WG.41.01/lane-u/**` |
| A | `tasks/WG.41.01/lane-u/escalation.md` | `tasks/WG.41.01/lane-u/**` |
| A | `tasks/WG.41.01/lane-u/evidence/cli_examples.txt` | `tasks/WG.41.01/lane-u/**` |
| A | `tasks/WG.41.01/lane-u/evidence/gate_fresh_clone.txt` | `tasks/WG.41.01/lane-u/**` |
| A | `tasks/WG.41.01/lane-u/evidence/provoke_sweep.txt` | `tasks/WG.41.01/lane-u/**` |
| A | `tasks/WG.41.01/lane-u/lane.json` | `tasks/WG.41.01/lane-u/**` |
| A | `tasks/WG.41.01/lane-u/launches/20260926_022424_prompt.txt` | `tasks/WG.41.01/lane-u/**` |
| A | `tasks/WG.41.01/lane-u/launches/20260926_034626_prompt.txt` | `tasks/WG.41.01/lane-u/**` |
| A | `tools/art/fixtures/place/catalogue.fixture.json` | `tools/art/fixtures/place/**` |
| A | `tools/art/fixtures/place/geometry.fixture.json` | `tools/art/fixtures/place/**` |
| A | `tools/art/fixtures/place/palette.fixture.json` | `tools/art/fixtures/place/**` |
| A | `tools/art/place_art.js` | exact |
| A | `tools/art/test_place_art.js` | exact |
| A | `tools/art/validate_art.js` | exact |

A filter of that name-list for `.png`, `game/img/`, `art/masters/`, `art/reference/`, and `art/APPROVALS.md` printed nothing (EXIT=0). Fixtures under `tools/art/fixtures/place/` are three JSON files. Blank-template and synthetic-block rules do not arise: no template PNG and no image file is in the diff.

`git diff --stat bf0fc4f0ae21c88987478f470826226863c9cbf7 5a76043be592484fc5264816641e5d94172a353b -- tools/` printed no files (EXIT=0). The report's claim that `tools/` is unchanged since `bf0fc4f0ae21c88987478f470826226863c9cbf7` holds at this tip.

`git diff --name-status 889aa3256b54aeffa8543ea69f2461ba8054d4b7 5a76043be592484fc5264816641e5d94172a353b` is only `M tasks/WG.41.01/lane-u/REPORT.md` (EXIT=0). That delta records `889aa3256b54aeffa8543ea69f2461ba8054d4b7` in the Final HEAD section.

After the gate and the sweep, `git status --short` in the clone printed nothing (EXIT=0).

## Syntax

```text
$ node --check tools/art/place_art.js
CHECK_PLACE_EXIT=0
$ node --check tools/art/validate_art.js
CHECK_VALIDATE_EXIT=0
$ node --check tools/art/test_place_art.js
CHECK_TEST_EXIT=0
```

## Gate

```text
$ node tools/art/test_place_art.js
RESULT: 154 passed, 0 failed
RESULT_EXIT=0
DURATION_MS=4696
DURATION=00:00:04.6962869
```

The 154 lines are 3 `fixture`, 1 `static`, 7 `unit`, 9 `validate`, 71 `neg`, 6 `cli`, 38 `place`, 19 `mutant`. That is the report's table. All 19 `PASS mutant.*_killed` lines are present. The detail lines match `evidence/gate_fresh_clone.txt`, including:

```text
neg.png_inflate_bomb on the mutant: codes [ANCHOR_GROUND,SCALE_OUT_OF_ENVELOPE], expected [PNG_INVALID]: SCALE_OUT_OF_ENVELOPE: 1 of 1 frame(s) outside envelope w 20..32 h 16..24 (scaleRow TEST_CHART_CHEST): frame 0: nothing drawn | ANCHOR_GROUND: 1 frame(s) not standing on the baseline: frame 0: nothing drawn, baseline is 47
place.all_good_exit0 on the mutant: exit 1, refusals ["INTERNAL_COPY_MISMATCH", ... INTERN...
place.pixel_diff_zero_sheets on the mutant: pixels differ: ATLAS_TEST_SURFACE_B1: 8030, TS_TEST_SURFACE_B1_A2: 288, TS_TEST_SURFACE_B1_B: 152, CHR_TEST_SURFACE_B1_RAT: 241
```

The four brief mutants (`palette_check_disabled`, `approval_check_bypassed`, `scale_check_disabled`, `overwrite_guard_removed`) are in that set and were killed. I read `MUTANTS` in `test_place_art.js`: each edit string occurs once, and a kill requires the case to pass on an unmutated copy and fail on the mutated copy.

## Provoke sweep

Documented mode from REPORT.md.

```text
$ node tools/art/test_place_art.js --provoke-sweep
SWEEP baseline: exit 0, 154 checks
SWEEP RESULT: 154 of 154 checks fail when provoked, 0 do not
SWEEP_EXIT=0
SWEEP_DURATION_MS=229925
SWEEP_DURATION=00:03:49.9256768
```

Every one of the 154 `SWEEP PROVOKED` lines is `exit=1 failed=yes`. The log contains no `NOT-PROVOKED` and no `knock-on`. The writer's sweep was `real 4m18.136s` with the same result line. This machine finished in 3m50s.

The three single runs quoted in REPORT.md, re-run here:

```text
$ UF_TEST_PROVOKE=place.neg.ramp_drawn_height_not_a_run node tools/art/test_place_art.js
FAIL neg.ramp_drawn_height_not_a_run: accepted; expected GEOM_HEIGHT_MISMATCH
RESULT: 153 passed, 1 failed
EXIT=1

$ UF_TEST_PROVOKE=place.mutant.inflate_cap_removed_killed node tools/art/test_place_art.js
FAIL mutant.inflate_cap_removed_killed: mutant survived: neg.png_inflate_bomb still passes
RESULT: 153 passed, 1 failed
EXIT=1

$ UF_TEST_PROVOKE=place.place.template_change_makes_out_stale node tools/art/test_place_art.js
FAIL place.template_change_makes_out_stale: exit 0 []
RESULT: 153 passed, 1 failed
EXIT=1
```

Those three transcripts match the report.

## CLI examples

`node tools/art/test_place_art.js --keep` (EXIT=0, `RESULT: 154 passed, 0 failed`) left a synthetic world at `%TEMP%\deus-place-art-test-h085oc`. Replayed the 16 commands from `evidence/cli_examples.txt` against that world. Refusal text, pixel coordinates, and file SHA-256 values match the evidence file. Exit codes, in the report's order:

| Example | EXIT |
| --- | --- |
| off-palette `(25,41)` | 1 |
| alpha 128 `(24,40)` | 1 |
| grid colour `#00FFFF` `OFF_PALETTE` + `TEMPLATE_RESIDUE` | 1 |
| tile hole `(20,20)` | 1 |
| GROUND lowest row 46, baseline 47 | 1 |
| CEILING highest row 1 | 1 |
| file 47x48 | 1 |
| ledger without the chest row | 1 |
| approved chest `3fb9f1d07648f8bdb765a1c423c7aa76e5c6c6aff9c0a3806d1c888a9cd2b131` | 0 |
| ramp envelope literal 96, allows `{86, 87}` | 1 |
| ramp drawn 66 px, allows `{64, 68}` | 1 |
| A2 hole `(50,70)` | 1 |
| inflate bomb, cap 9264 bytes | 1 |
| place four cells `filled=4/21 empty=17 unexpected=1 derivedPending=1 sheets=2 runtime=2` | 0 |
| second chest, no `--replace`, `OVERWRITE_REFUSED` | 1 |
| same with `--replace ATLAS_TEST_SURFACE_B1:0005`, `REPLACED` | 0 |

## DEC-007

The diff commits no PNG and does not touch `game/img/**`, `art/masters/**`, `art/reference/**`, or `art/APPROVALS.md`. `copyRect` in `place_art.js` copies RGBA rows with `Buffer.copy`. The gate's pixel-diff checks passed, and both copy-offset mutants were killed (one by the tool's own `INTERNAL_COPY_MISMATCH` self-check, one by the pixel diff when that self-check is also removed). `tilesetTarget` uses the same `sx`/`sy` formula as `Tilemap._addNormalTile` and the same autotile block origins as `Tilemap._addAutotile` in `game/js/rmmz_core.js`. I did not generate or request images.

`escalation.md` records Lane S interface points (geometry-row heights, tile-class set, runtime targets, `alphaMode: OWNER_OPEN`) and does not treat them as settled. The brief leaves the real-catalogue run for a later merge. Those open points are not failures of this fixture gate.

## Findings

BLOCKER: none.

MAJOR: none.

MINOR: none.

VERDICT: CLEAN PASS
