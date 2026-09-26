# Grok review: WG.32.02 Lane T blank template tilesets

Reviewed commit: 9e0b6fc201316aaf74f9d80e795d0da66ade76fa

That commit is `[claude] WG.32.02 REPORT and raw evidence logs for d383958c` on `task/lane-t`. `HEAD` and `origin/task/lane-t` both pointed at it when this review started. The code under test is the parent `d383958ccff8551a203349c773c262441614db26`; `9e0b6fc201316aaf74f9d80e795d0da66ade76fa` adds `REPORT.md` and `evidence/` only.

## Tip check

Command: `git rev-parse HEAD origin/task/lane-t` then `git log -8 --format="%H %an %s"` in the live worktree.

```
9e0b6fc201316aaf74f9d80e795d0da66ade76fa
9e0b6fc201316aaf74f9d80e795d0da66ade76fa
9e0b6fc201316aaf74f9d80e795d0da66ade76fa deus-claude [claude] WG.32.02 REPORT and raw evidence logs for d383958c
d383958ccff8551a203349c773c262441614db26 deus-claude [claude] WG.32.02 Point the fixture's ATLAS note at escalation.md E1
b910fb2063cc208da92ed32a2663c6d01f9394ce deus-claude [claude] WG.32.02 Case-insensitive sheet id check, art/templates README, escalation notes
ea7f2d5ffb77bc4af97c97616625889b4be59ed0 deus-claude [claude] WG.32.02 WIP: blank template generator, fixture and tests
0ab4836303090caa9106164a5e892ad96d0525e4 snewt [ops] WG.32.02 lane-t launch prompt 20260926_022404
728737e7307128dfb190ce7be339f16b83d04ab1 deus-pm [pm] Open lane-t (WG.32.02): BRIEF.md and lane.json
b612bc7217349bce695e15395bd041f63673b89b deus-pm [pm] Register write-set claims for PM-launched lanes S, T, U, P, M Rev 3 and the Lane N review in docs/STATUS.md
099b68785b06a02b82753157f4ffbaba296082a3 deus-pm Merge task/lane-i: WG.00.12 Lane I automated merge gate (PM manual merge)
```

Exit code of that command: 0.

## How this was run

Fresh clone, not the live worktree:

`git clone -c core.autocrlf=false C:\Users\snewt\.deus_worktrees\lane-t C:\Users\snewt\AppData\Local\Temp\lane-t-review-9e0b6fc2`

`CLONE_EXIT=0`

`git checkout --detach 9e0b6fc201316aaf74f9d80e795d0da66ade76fa`

```
HEAD is now at 9e0b6fc2 [claude] WG.32.02 REPORT and raw evidence logs for d383958c
CHECKOUT_EXIT=0
9e0b6fc201316aaf74f9d80e795d0da66ade76fa
REV_PARSE_EXIT=0
```

Node in that clone: `v24.19.0` (`NODE_VER_EXIT=0`). The clone was deleted after these commands.

## Scope

`git diff --name-status b612bc7217349bce695e15395bd041f63673b89b 9e0b6fc201316aaf74f9d80e795d0da66ade76fa`

`DIFF_EXIT=0`

| Status | Path | Inside allowedPaths |
|---|---|---|
| A | `art/templates/README.md` | yes (`art/templates/**`) |
| A | `tasks/WG.32.02/lane-t/BRIEF.md` | yes |
| A | `tasks/WG.32.02/lane-t/REPORT.md` | yes |
| A | `tasks/WG.32.02/lane-t/escalation.md` | yes |
| A | `tasks/WG.32.02/lane-t/evidence/gate_fresh_clone.txt` | yes |
| A | `tasks/WG.32.02/lane-t/evidence/gate_worktree.txt` | yes |
| A | `tasks/WG.32.02/lane-t/evidence/generator_runs.txt` | yes |
| A | `tasks/WG.32.02/lane-t/evidence/provoke_all.txt` | yes |
| A | `tasks/WG.32.02/lane-t/evidence/provoke_census_full_suite.txt` | yes |
| A | `tasks/WG.32.02/lane-t/evidence/provoke_stratum_param_full_suite.txt` | yes |
| A | `tasks/WG.32.02/lane-t/evidence/tested_head.txt` | yes |
| A | `tasks/WG.32.02/lane-t/lane.json` | yes |
| A | `tasks/WG.32.02/lane-t/launches/20260926_022404_prompt.txt` | yes |
| A | `tools/art/fixtures/templates/build_fixture.js` | yes |
| A | `tools/art/fixtures/templates/catalogue.fixture.json` | yes |
| A | `tools/art/fixtures/templates/geometry.fixture.json` | yes |
| A | `tools/art/make_blank_templates.js` | yes |
| A | `tools/art/test_blank_templates.js` | yes |

Every path is inside the BRIEF's allowedPaths. `BRIEF.md`, `lane.json` and the launch prompt are the PM/ops commits under `tasks/WG.32.02/lane-t/**`.

`git diff --name-status d383958ccff8551a203349c773c262441614db26 9e0b6fc201316aaf74f9d80e795d0da66ade76fa` (`DIFF_REPORT_EXIT=0`) is only `REPORT.md` and `evidence/*.txt`. `git diff b910fb2063cc208da92ed32a2663c6d01f9394ce d383958ccff8551a203349c773c262441614db26` (`DIFF_D383_STAT_EXIT=0`, `DIFF_D383_EXIT=0`) is one comment line in `build_fixture.js`, pointing the 4096 note at `escalation.md` E1. The report's "comment only since the CRLF comparison" claim matches that diff.

Image extensions added between the base and the tip: none. `PNG_DIFF_EXIT=0` and the name-status list has no `.png`. `art/templates/` in this commit is `README.md` only.

## DEC-007

No violation. `renderSheet` in `make_blank_templates.js` paints a flat background, 1 px grid lines, 1 px slot rectangles, stratum ticks in the grid colour, and a 3x5 bitmap font defined in the file. `writePNG` in `tools/png_util.js` (read-only) writes IHDR, one IDAT, and IEND. The test's extra pixels are `solidBlock` (one RGBA repeated) or a single pixel `[1, 2, 3, 255]`. Painted-template and unknown-PNG cases use solid blocks `[200, 30, 30, 255]` and `[30, 200, 30, 255]`. Output directories in the log are under `os.tmpdir()`. `git status --porcelain` in the clone after the gate and after the provocations was empty (`STATUS_EXIT=0`, `STATUS2_EXIT=0`).

A search of `art/palette/deus_master_world_palette_v1.hex` for `00FFFF`, `FFFF00` and `FF00FF` returned no matches. The gate reported `opaque colours in templates: #00FFFFFF, #FFFF00FF, #FF00FFFF; master palette 226 colours`.

## Commands

| Command | Raw result |
|---|---|
| `node --check tools/art/make_blank_templates.js` | `CHECK_MAKE_EXIT=0` |
| `node --check tools/art/test_blank_templates.js` | `CHECK_TEST_EXIT=0` |
| `node --check tools/art/fixtures/templates/build_fixture.js` | `CHECK_BUILD_EXIT=0` |
| `node tools/art/fixtures/templates/build_fixture.js --check` | `catalogue.fixture.json matches build_fixture.js output` / `FIXTURE_CHECK_EXIT=0` |
| `node tools/art/test_blank_templates.js` | `RESULT: 77 passed, 0 failed` / `RESULT_EXIT=0` / `DURATION_MS=36687` / `DURATION_S=36.687` |
| `node tools/art/test_blank_templates.js --provoke-all` | `RESULT: 23 passed, 0 failed` / `PROVOKE_ALL_EXIT=0` / `PROVOKE_ALL_S=56.984` |
| `UF_TEST_PROVOKE=templates.census node tools/art/test_blank_templates.js` | `FAIL templates.census: 1 problem(s): TEST_ATLAS_SURFACE: 1 pixel(s) outside {bg #00000000, grid #00FFFFFF, label #FFFF00FF}, e.g. (4094,4094) #010203FF` / `RESULT: 76 passed, 1 failed` / `PROVOKE_CENSUS_EXIT=1` / `PROVOKE_CENSUS_S=31.586` |
| `UF_TEST_PROVOKE=templates.stratum_param node tools/art/test_blank_templates.js` | three FAIL lines below / `RESULT: 74 passed, 3 failed` / `PROVOKE_STRATUM_EXIT=1` / `PROVOKE_STRATUM_S=30.456` |

Gate sha256 lines (same values on run 1 and run 2):

```
INFO run1 sha256 TEST_ATLAS_SURFACE.png 1437d21c8d95d5c18feffef644ea98c54c11821d733e4dc50a0797e35aa871cf
INFO run1 sha256 TEST_A2_SURFACE.png b4ee04a59b6a47265b362b101e7f54415afca885560273b4ec6aa948e8536244
INFO run1 sha256 $TEST_Human.png a542c5fde1718221c316606cfed3648d7b9359cea7f9cc1d306d3da5e2b3e9b4
INFO run1 sha256 $TEST_Ogre.png bbf6ff2432161400f5325bb3cec99775db4ab78f0841c368f4f9a78db0064f1d
INFO run1 sha256 $TEST_Horse.png 8cdcbee81a4675d6428792926ef68ddd516fa67ffe28c72044dccc3a3daef05d
INFO literal scan: 113 numeric literals checked against 8,9,10,15,16,19,20,24,26,28,32,42,48,64,96,144,192,288,384
INFO fixture: 5 sheets, 28 paint slots, 31 entries, geometry text sha256 a1b95e7eb35208a0d1406a49e04fd7f977999e7751b5f96d20d45bc0a1b60235
```

`--provoke-all` printed `PASS provoke.<check>` for all 23 checks. Each child printed one FAIL for its own check and no other check. The census full suite's only FAIL is the line in the table. The stratum full suite's FAIL lines:

```
FAIL templates.stratum_param[changed_split]: split [19,19,19,19,20]: no ramp/strip slot height moved from the base split [19,19,19,19,20]; wall face ticks [20,39,58,77] did not move from the base split
FAIL templates.stratum_param[stale_catalogue_refused]: exit 0
FAIL templates.stratum_param[stale_rects_refused]: exit 0
```

Those three are the provocation. The other stratum cases in that run passed, including the invalid splits and `layerPx_param`.

A separate generator run in the clone, building the fixture with `stratumPx` `[20,19,19,19,19]` and with `[24,24,24,24,0]`:

```
WROTE $TEST_Horse.png 288x192 slots=1 sha256=8cdcbee81a4675d6428792926ef68ddd516fa67ffe28c72044dccc3a3daef05d
WROTE $TEST_Human.png 144x192 slots=1 sha256=a542c5fde1718221c316606cfed3648d7b9359cea7f9cc1d306d3da5e2b3e9b4
WROTE $TEST_Ogre.png 144x384 slots=1 sha256=bbf6ff2432161400f5325bb3cec99775db4ab78f0841c368f4f9a78db0064f1d
WROTE TEST_A2_SURFACE.png 768x576 slots=2 sha256=b4ee04a59b6a47265b362b101e7f54415afca885560273b4ec6aa948e8536244
WROTE TEST_ATLAS_SURFACE.png 4096x4096 slots=23 sha256=50afca57a224aa0e808257f7668c36b84afa58433dcf556ac0274fb6e9cd01ad
TEMPLATES: 5 sheet(s), 28 slot(s)
CHANGED_SPLIT_EXIT=0
REFUSED GEOMETRY_INVALID: stratumPx[4] must be a positive integer (got 0)
REFUSED: 1 problem(s); nothing written
INVALID_SPLIT_EXIT=2
INVALID_OUT_EXISTS=false
SCRIPT_EXIT=0
```

`tools/art/make_blank_templates.js` reads `stratumPx`, `layerPx`, `tilePx` and frame sizes from the geometry object in `geometryParams`. A search of that file for the geometry integers the literal scan forbids found only `ATLAS_MAX_SIDE = 4096` (the contract cap, not a geometry-fixture value) and the digits inside the bitmap-font strings. The `hardcoded_stratum` mutant, which replaces the read with `[19, 19, 19, 19, 20]`, was killed by the suite (`literal scan: 19,19,19,19,20` plus `STRATUM_HEIGHT_MISMATCH`).

## Fixture coverage

`FIXTURE_DUMP_EXIT=0` against the committed fixture at this commit. `templates.fixture_contract` and `templates.fixture_drift` passed in the gate.

| BRIEF item | Measured |
|---|---|
| Catalogue contract `deus-art-catalogue/1.1.0` | `schema deus-art-catalogue/1.1.0`, `tileSizePx` 48 |
| 32 layers, z −16..15 | `layerCount` 32, `zMin` −16, `zMax` 15 |
| `stratumPx` parameter, default `[19,19,19,19,20]`, `layerPx` 96 | geometry fixture matches; ramp/edge slot heights 19, 38, 57, 76, 96 |
| 4096x4096 ATLAS | `TEST_ATLAS_SURFACE` 4096x4096, grid 48, 23 slots |
| A2 768x576 RMMZ_TILESET | `TEST_A2_SURFACE` 768x576, two 96x144 slots |
| `$` character sheets 144x192, 144x384, 288x192 | `$TEST_Human` 144x192, `$TEST_Ogre` 144x384, `$TEST_Horse` 288x192, each one 3x4 block |
| 2x2-footprint slot | bed `ARCH_BED` footprint 2x2, slot 96x96, no frame class |
| LARGE_TALL 48x96 on a 2x2 footprint | ogre frame 48x96, footprint 2x2; walk block 144x384 |
| LARGE_LONG 96x48 on a 2x2 footprint | horse frame 96x48, footprint 2x2; walk block 288x192 |
| TINY 24x24 drawn footprint in a 48x48 frame | geometry `drawnFootprintPx` `[24,24]`, frame `[48,48]`, slot 48x48 |
| TALL_MEDIUM 48x64 off by default | `{"frame":[48,64],"enabled":false}`, no TALL_MEDIUM entry. Gate `tall_medium[on_adds_slots]` passed |
| Readability floor off | `{"value":[26,28],"races":["GNOME","HALFLING"],enabled":false}`. Gate `readability_floor` passed |
| RMMZ 3x4 blocks 144x192, 144x384, 288x192 | present on the atlas paper-doll row (144x192) and the three `$` sheets |
| Paper-doll group | three `RACE_HUMAN` slots, 144x192, 3x4 |
| Ramp run of 5, heights from `stratumPx` | `GEOM_STRATUM_1..5` at 48x19, 48x38, 48x57, 48x76, 48x96 |
| Edge/cliff strip for differences 1..5 | `GEOM_STRATUM_1..5` at 96x19 through 96x96 |
| CEILING-anchored hanging prop | `TEST_PROP_HANGING`, anchor CEILING, slot 48x96 |
| Derived variant `slot: null` | bed flip, `derivedFrom` the bed id, slot null |
| HUGE and GARGANTUAN, no paint slot | both entries, slot null, frames null in geometry |
| Entries / paint slots | 31 entries, 28 slots, 3 without a slot |

Changing `stratumPx` to `[20,19,19,19,19]` changed only the atlas PNG, to `50afca57a224aa0e808257f7668c36b84afa58433dcf556ac0274fb6e9cd01ad`, and the gate's `changed_split` check passed (ramp/strip heights and wall-face ticks move, old tick rows are background). An invalid split is refused with exit 2 and no output directory.

## Report claims against this run

| Claim in REPORT.md | Measured here |
|---|---|
| Tested code commit `d383958ccff8551a203349c773c262441614db26` | `evidence/tested_head.txt` is that hash. The tip commit does not change the tools or the fixture |
| Gate `RESULT: 77 passed, 0 failed`, exit 0 | same RESULT, `RESULT_EXIT=0` |
| Gate duration 32–33 s | this clone: `DURATION_S=36.687`. Result and hashes match; the wall clock does not |
| `--provoke-all` `RESULT: 23 passed, 0 failed`, exit 0, about 57 s | `RESULT: 23 passed, 0 failed`, `PROVOKE_ALL_EXIT=0`, `PROVOKE_ALL_S=56.984`. FAIL lines match `evidence/provoke_all.txt` |
| Census full suite `76 passed, 1 failed`, exit 1 | same RESULT and the same FAIL line, `PROVOKE_CENSUS_EXIT=1` |
| Stratum full suite `74 passed, 3 failed`, exit 1 | same RESULT and the same three FAIL lines, `PROVOKE_STRATUM_EXIT=1` |
| Five template sha256 values, identical across two runs | the gate printed those five hashes on run 1 and run 2 |
| Changed split atlas sha `50afca57a224aa0e808257f7668c36b84afa58433dcf556ac0274fb6e9cd01ad`, other four sheets unchanged, exit 0 | reproduced, `CHANGED_SPLIT_EXIT=0` |
| Invalid split `stratumPx[4] must be a positive integer (got 0)`, exit 2, nothing written | reproduced, `INVALID_SPLIT_EXIT=2`, `INVALID_OUT_EXISTS=false` |
| Literal scan `113` against that integer list | same INFO line |
| Fixture 5 sheets, 28 slots, 31 entries | same INFO line and the dump |
| 13 mutants plus a control, each killed | gate and both full-suite provocations printed `PASS templates.mutants[...]` for the control and all 13, with the same kill lines as `evidence/gate_worktree.txt` |
| No PNG committed; templates only under the temp directory | scope diff has no PNG; clone status empty after the runs |
| CRLF checkout produces the same template hashes | this clone was `core.autocrlf=false` and produced the hashes in `evidence/gate_fresh_clone.txt`, which the report recorded from a `core.autocrlf=true` clone at `d383958c` |

E1–E4 in `escalation.md` match the code. The fixture ATLAS is 4096x4096, which is not a multiple of 48; the generator draws the partial last cell and says so in INDEX.md. `stratumPx[0]` is treated as the lowest stratum and `GEOM_STRATUM_<d>` as d strata high. A catalogue that disagrees is refused with `STRATUM_HEIGHT_MISMATCH`. Geometry-derived ticks are selected by `scaleRow`. Creature slots must match the frame class exactly, so TALL_MEDIUM stays 48x64. Those are the readings the escalation asks the PM to confirm before the Lane S run. They are fail-closed for a mismatched catalogue.

## Findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

1. The brief says to record the 5-versus-25 biome gap: `game/data/DEUS_BiomeRegistry.json` has five biomes (TEMP, WET, ARID, HIGH, VOLC) and the band model is 25 (5 bands × 5). The fixture uses placeholder ids such as `SURFACE_B1` and marks bands `ownerOpen: true`. `escalation.md` and the REPORT "Decisions needed" list do not mention that gap. The generator and the gate do not depend on it.

VERDICT: PASS
