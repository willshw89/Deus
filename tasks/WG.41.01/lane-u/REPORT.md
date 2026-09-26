# Lane U report: WG.41.01 art placement + validator

Writer: claude. Branch `task/lane-u`, base main `b612bc7217349bce695e15395bd041f63673b89b`. Date 2026-09-26.
No art was generated, requested, drawn, edited or integrated. Every image the tests use is a synthetic solid-colour cell that the test writes into the OS temp folder at run time and deletes afterwards. No PNG is committed. `art/APPROVALS.md` was not written.

Tested commit: `adb993565cf0e40ef008d7062e2161707a1bf887`, used for the fresh-clone gate, the provoke sweep and the CLI examples. `tools/` has not changed since `bf0fc4f0ae21c88987478f470826226863c9cbf7` (`git diff bf0fc4f0 HEAD -- tools/` is empty). Later commits change only `tasks/WG.41.01/lane-u/**`: `82466dc8d3d3bcd960f3bb963d2a85d9e99a7422` (evidence) and the commit that adds this report.

This run resumes the lane after the Claude usage limit stopped it. The earlier draft of this report and its evidence were written at `4132e858` (135 checks). The code commit `bf0fc4f0` that followed changed the tools and tests, so the gate, sweep and CLI examples were run again at the commit above. Every figure below comes from that run.

## What changed

- `tools/art/validate_art.js` (new) validates one PNG against its catalogue slot. It exits 0 when it accepts, 1 when it refuses (with pixel coordinates) and 2 on a usage or I/O error. It is also the module that `place_art.js` uses. Checks, in order:
  - Before decoding, the PNG chunks are walked. A header far larger than the slot is refused. So is image data that inflates past what its header allows (inflate is capped). Colour-management chunks (`gAMA`, `iCCP`, ...) give a warning.
  - The file's SHA-256 must be in a YEA row of the ledger for this entry or slot. Approval by slot id only gives a warning.
  - File size, binary alpha, master palette and template residue.
  - The slot rect must match the template sidecar.
  - Per frame: the scale envelope and the GROUND/CEILING anchor.
  - Tile-class slots must be fully opaque.
  - The frame class comes from `geometry.json`. A sized creature with no frame class is refused.
  - Geometry-derived pieces take their heights from `stratumPx`/`layerPx`. This covers both the envelope and the drawn height of each frame.
- `tools/art/place_art.js` (new) validates every input, then copies the RGBA bytes 1:1 into the slot rects of the catalogue sheets. Then:
  - It exports RMMZ runtime files per `entries[].runtime`, using the Lane S kinds `NONE`, `RMMZ_TILESET`, `RMMZ_CHARACTER` and `RMMZ_FACE`.
  - A target with no file, `tileId` or `index` is reported `RUNTIME_PENDING`. Runtime files that hold only some of their tiles are marked `partial` and give a warning.
  - It writes `placement_report.json` and `coverage_report.json`/`.md`.
  - It is all or nothing: after a refusal, `--out` is unchanged.
  - It has the `--replace` overwrite guard and reports `DERIVED_PENDING`.
  - It checks the earlier state in `--out`: file hashes, empty unfilled slots, current approvals, and unchanged template sidecars.
- `tools/art/test_place_art.js` (new) is the gate: 154 checks, 19 source mutants, `UF_TEST_PROVOKE=place.<check>` for every check, and a `--provoke-sweep` mode.
- `tools/art/fixtures/place/{geometry,palette,catalogue}.fixture.json` (new, JSON only):
  - `geometry`: the contract geometry.
  - `palette`: 12 colours copied from the master palette.
  - `catalogue`: 23 `TEST_` entries on 4 sheets. The sheets are an ATLAS of 576x864, an A2 of 768x576, a B of 768x768 and a `$` character sheet of 144x192. The runtime kinds used are `NONE`, `RMMZ_TILESET`, `RMMZ_CHARACTER` and `RMMZ_FACE`. The entries include ramps `GEOM_RAMP_1..5`, strips `GEOM_STRATUM_1/3`, a wall face, an overlay rim, an A2 autotile and a face sheet.
- `docs/art/APPROVALS_FORMAT.md` (new) describes the Owner's ledger format: heading, columns, how the tools read it, what counts as malformed (including pipe-less rows and second tables), how to get a hash, and how to withdraw an approval. It advises using entry ids rather than slot ids.
- `tasks/WG.41.01/lane-u/escalation.md`: the interface points with Lane S (see "Open points" below).
- `tasks/WG.41.01/lane-u/evidence/` holds the raw outputs: `gate_fresh_clone.txt`, `provoke_sweep.txt` and `cli_examples.txt`, all at `adb99356`.

## How I tested it (commands and raw exit codes)

```text
$ git clone --branch task/lane-u --single-branch C:/Users/snewt/.deus_worktrees/lane-u %TEMP%/laneu_fresh2
clone EXIT=0
$ git -C %TEMP%/laneu_fresh2 rev-parse HEAD
adb993565cf0e40ef008d7062e2161707a1bf887
$ (in the clone) node tools/art/test_place_art.js
RESULT: 154 passed, 0 failed
EXIT=0
$ git -C %TEMP%/laneu_fresh2 status --short | wc -l      (after the run: the test writes nothing into the repo)
0
$ node tools/art/test_place_art.js --provoke-sweep      (worktree at adb993565cf0e40ef008d7062e2161707a1bf887)
SWEEP baseline: exit 0, 154 checks
SWEEP RESULT: 154 of 154 checks fail when provoked, 0 do not
real	4m18.136s
EXIT=0
$ git diff --name-only b612bc7217349bce695e15395bd041f63673b89b..HEAD      (at 82466dc8, before this report commit)
docs/art/APPROVALS_FORMAT.md
tasks/WG.41.01/lane-u/BRIEF.md                               (PM commit)
tasks/WG.41.01/lane-u/REPORT.md                              (earlier draft, PM checkpoint 4bef75eb)
tasks/WG.41.01/lane-u/escalation.md
tasks/WG.41.01/lane-u/evidence/cli_examples.txt
tasks/WG.41.01/lane-u/evidence/gate_fresh_clone.txt
tasks/WG.41.01/lane-u/evidence/provoke_sweep.txt
tasks/WG.41.01/lane-u/lane.json                              (PM commit)
tasks/WG.41.01/lane-u/launches/20260926_022424_prompt.txt    (ops commit)
tasks/WG.41.01/lane-u/launches/20260926_034626_prompt.txt    (ops commit)
tools/art/fixtures/place/catalogue.fixture.json
tools/art/fixtures/place/geometry.fixture.json
tools/art/fixtures/place/palette.fixture.json
tools/art/place_art.js
tools/art/test_place_art.js
tools/art/validate_art.js
$ git diff --name-only b612bc72..HEAD | grep -ic '\.png$'        -> 0
$ git diff b612bc72..HEAD -- art/APPROVALS.md | wc -l            -> 0
```

On this machine the gate run takes about 5 s and the sweep 4 min 18 s (154 child runs, 4 at a time).

Check counts in the gate output:

| Group | Checks |
| :--- | ---: |
| fixture | 3 |
| static | 1 |
| unit | 7 |
| validate | 9 |
| neg | 71 |
| cli | 6 |
| place | 38 |
| mutant | 19 |
| **Total** | **154** |

Checks added since the `4132e858` draft:
- unit: `face_targets`, `character_targets`.
- validate: `overlay_exempt_from_opacity`, `colour_chunk_warned`. Two were renamed: `slot_id_approval_warned` (was `slot_id_approval`) and `stratumPx_changed_heights_follow` (was `stratumPx_changed_slots_follow`).
- neg: `ramp_envelope_ignores_stratumPx`, `ramp_drawn_height_not_a_run`, `autotile_with_hole`, `frame_class_missing`, `ledger_row_without_leading_pipe`, `ledger_pipeless_second_table`, `png_inflate_bomb`.
- place: `runtime_pending_reported`, `runtime_partial_flagged`, `runtime_tile_zero_refused`, `template_change_makes_out_stale`.
- mutants: `geom_height_check_disabled` was split into `geom_envelope_check_disabled` and `geom_drawn_height_check_disabled`. New: `tile_class_rows_reduced_to_geom_tile`, `pipeless_row_check_disabled`, `inflate_cap_removed`.

## Negative cases (BRIEF list; each must refuse with exactly the listed codes)

| BRIEF case | Check(s) | Codes required |
| :--- | :--- | :--- |
| off-by-one rect (x±1, y±1) | Catalogue rect shifted against the template sidecar: `neg.rect_x_plus_1`, `neg.rect_x_minus_1`, `neg.rect_y_plus_1`, `neg.rect_y_minus_1`. The pixel-diff comparator sees the chest shifted x+1, x-1, y+1 and y-1: `place.pixel_diff_sees_off_by_one`. Mutants: `copy_offset_x_plus_1`, `copy_offset_x_plus_1_self_check_off` | `SLOT_RECT_MISMATCH` |
| 47x48 input | `neg.dims_47x48` | `DIMS_MISMATCH` |
| stray alpha 128 | `neg.alpha_128` at (24,40); `neg.alpha_owner_open_still_binary` | `ALPHA_NOT_BINARY` |
| one off-palette pixel | `neg.off_palette_pixel` at (25,41) | `OFF_PALETTE` |
| template-grid-colour pixel | `neg.template_grid_colour_pixel` at (20,30). Also the label colour, the magenta background, and `neg.template_residue_isolated` (grid colour inside the palette, so only the residue rule fires) | `TEMPLATE_RESIDUE`, plus `OFF_PALETTE` when the colour is off-palette |
| missing approval | `neg.approval_missing` | `APPROVAL_MISSING` |
| NAY approval | `neg.approval_nay`, `neg.approval_conflict_yea_nay` | `APPROVAL_NAY`, plus `APPROVAL_MISSING` / `APPROVAL_CONFLICT` |
| hash of a different file | `neg.approval_hash_of_other_file`, `neg.approval_for_other_entry` | `APPROVAL_MISSING` |
| envelope 1 px over chart max | `neg.envelope_w_1px_over_max`, `neg.envelope_h_1px_over_max`. Also 1 px under the minimum, and one frame of 12 | `SCALE_OUT_OF_ENVELOPE` |
| GROUND baseline 1 px high | `neg.ground_baseline_1px_high` | `ANCHOR_GROUND` |
| CEILING anchor 1 px low | `neg.ceiling_anchor_1px_low` | `ANCHOR_CEILING` |
| tile with a hole | `neg.tile_with_hole` at (20,20) (`GEOM_TILE`); `neg.autotile_with_hole` at (50,70) (`RMMZ_AUTOTILE_A2`) | `TILE_NOT_OPAQUE` |
| LARGE_TALL supplied at 48x48 or 96x96 | File: `neg.large_tall_file_at_48x48`, `neg.large_tall_file_at_96x96`. Catalogue slot: `neg.large_tall_slot_48x48`, `neg.large_tall_slot_96x96` | `DIMS_MISMATCH` / `FRAME_CLASS_MISMATCH` |
| LARGE_LONG supplied at 48x96 | `neg.large_long_file_at_48x96`, `neg.large_long_slot_48x96` | `DIMS_MISMATCH` / `FRAME_CLASS_MISMATCH` |
| 48x64 TALL_MEDIUM while disabled | `neg.tall_medium_48x64_while_disabled`. `validate.tall_medium_enabled_accepts` shows that switching the parameter on changes the result. `neg.frame_class_missing` covers a sized creature with no frame class | `FRAME_CLASS_DISABLED` / `FRAME_CLASS_MISSING` |
| ramp height ignores `stratumPx` | Envelope set to a literal 96: `neg.ramp_height_ignores_stratumPx`. Envelope 86..96: `neg.ramp_envelope_ignores_stratumPx`. Split [16,20,20,20,20], ramp cell drawn 66 px, which is not a run: `neg.ramp_drawn_height_not_a_run`. Also `neg.stratumPx_changed_old_ramp_refused` and `neg.wall_face_height_ignores_layerPx` | `GEOM_HEIGHT_MISMATCH` |
| `stratumPx` changed or invalid | `validate.stratumPx_changed_heights_follow`: with split [16,20,20,20,20] the rebuilt strips and ramps are drawn at 16, 56, 64, 84, 104, 124 and 144 px, all accepted. The default split gives 19, 57, 67, 86, 105, 124 and 144. Refused: `neg.stratumPx_zero_stratum` ([24,24,24,24,0]), `neg.stratumPx_sum_not_layerPx`, `neg.stratumPx_wrong_count` | `GEOMETRY_INVALID` |

The other negative checks cover:
- the ledger: malformed hash, decision, date or header; legacy rows only; the section only in a code fence; the heading twice or a near-miss heading; rows inside an HTML comment, or a comment hiding the whole section; an indented row; a row with no leading pipe; a second pipe-less table;
- PNG format: 16-bit, corrupt, header far larger than the slot, and an inflate bomb (48x48 header, 8 MiB of zeros);
- the template sidecar: missing or the wrong size;
- geometry and palette hashes, and the `--geometry` override;
- an unknown entry, a derived row, and HUGE with no slot.

## Placement checks (from the BRIEF)

- **Pixel diff 0.** The test builds the expected composite pixel by pixel.
  - `place.pixel_diff_zero_sheets` covers 4 sheets.
  - `place.pixel_diff_zero_runtime` covers 8 runtime files: `$` Horse/Human/Ogre, a 4x2 Critters sheet, a face sheet, and A2, A5 and B tilesets.
  - `place.transparent_pixel_bytes_kept` checks that the colour bytes (1,2,3) of alpha-0 pixels survive the copy.
- **Coverage report exact.** `place.coverage_report_exact` compares the full JSON with an object built by hand. Per sheet it covers filled, empty, unexpected, not in template and stray pixels. Per band it covers filled, empty, derived pending, no slot and unexpected. `place.coverage_markdown` checks the table rows.
- **Rerun sha256 equal.**
  - `place.rerun_sha256_equal`: every output file written into a second folder is byte-identical.
  - `place.rerun_same_folder_unchanged`: placing again into the same folder reports every slot `UNCHANGED` and leaves the images unchanged.
- **Runtime export sizes** against docs/RMMZ_ASSET_SPEC.md.
  - `place.runtime_dims_rmmz_spec` checks the file sizes: A5 384x768, A2 768x576, B 768x768, `$` 144x192 / 144x384 / 288x192, 8-block 576x384, faces 576x288.
  - `unit.tileset_targets` checks 35 tile ids against positions I worked out by hand from `Tilemap._addNormalTile` / `_addAutotile` in `game/js/rmmz_core.js`, including all 16 A1 kinds.
  - `unit.character_targets` and `unit.face_targets` check block positions, pending cases and errors.
- **Runtime pending and partial.**
  - `place.runtime_pending_reported`: an entry with no runtime file is placed in the atlas and reported `RUNTIME_PENDING`. Nothing is exported for it.
  - `place.runtime_partial_flagged`: 4 of the 8 runtime files are `partial: true`, each with a warning.
  - `place.runtime_tile_zero_refused`: tile id 0 is refused `RUNTIME_INVALID`.
- **DERIVED_PENDING.**
  - `place.derived_pending_reported`: the row is reported, `ledgerApprovedVariant` is true from the chest's ledger row, and no file or slot is written.
  - `place.derived_row_input_refused`.
- **`--replace` works and silent overwrite is refused.**
  - `place.replace_overwrites_slot`: new bytes land in the slot, the neighbour is untouched, and the action is `REPLACED`.
  - `place.overwrite_refused`: exit 1 with `OVERWRITE_REFUSED`, and the `--out` snapshot is unchanged.
  - `place.replace_unused_refused`, `place.replace_unknown_slot_refused`.
- **A refusal writes nothing.** `place.refusal_writes_nothing` (no `--out` is created) and `place.refusal_keeps_existing_out`.
- **Earlier state in `--out`.**
  - `place.out_state_tampered`
  - `place.out_state_unlisted_sheet_refused`
  - `place.out_state_pixels_in_empty_slot_refused` (sheet and report edited together)
  - `place.out_state_stale`
  - `place.template_change_makes_out_stale` (the grid colour in a sidecar changed after placement)
  - `place.out_dir_not_empty_refused`
  - `place.out_dir_unsafe_refused`
  - `place.approval_revoked_refused` (a NAY added after placement)
- **Catalogue and runtime refusals:** overlapping slots, a runtime path escaping `--out`, a runtime size mismatch, an unknown runtime kind, and two entries on one runtime tile.
- **No input file changed.** `place.inputs_untouched` hashes the fixture `art/` tree (catalogue, geometry, palette, templates, approvals) and the cells, before and after all placement runs.

## Mutant kill table

Each mutant edits temp copies of both tools, and every find string must occur exactly once or the check fails. A mutant counts as killed only if its kill case passes on an unmutated copy and fails on the mutant. The "What the kill case saw" column is copied from `evidence/gate_fresh_clone.txt`. The first four rows are the mutants the BRIEF requires.

| Mutant | Edit (in the tool named) | Kill case | What the kill case saw on the mutant |
| :--- | :--- | :--- | :--- |
| palette_check_disabled | validate_art.js `if (!ctx.palette.has(rgb)) offPal.add(` -> `if (false) ...` | neg.off_palette_pixel | `accepted; expected OFF_PALETTE` |
| approval_check_bypassed | validate_art.js `for (const r of approvalReasons(...)) add(...)` removed | neg.approval_missing | `accepted; expected APPROVAL_MISSING` |
| scale_check_disabled | validate_art.js envelope `if (bw < env.wMin \|\| ...)` -> `if (false)` | neg.envelope_w_1px_over_max | `accepted; expected SCALE_OUT_OF_ENVELOPE` |
| overwrite_guard_removed | place_art.js `if (prev && prev.sha256 !== res.sha256 && !replace.has(...))` -> `if (false)` | place.overwrite_refused | `second placement exit 0, codes []; expected exit 1 OVERWRITE_REFUSED` |
| alpha_check_disabled | alpha test -> `if (false)` | neg.alpha_128 | `accepted; expected ALPHA_NOT_BINARY` |
| template_residue_disabled | residue test -> `if (false)` | neg.template_residue_isolated | `accepted; expected TEMPLATE_RESIDUE` |
| slot_rect_check_disabled | sidecar rect comparison -> `else if (false)` | neg.rect_x_plus_1 | `accepted; expected SLOT_RECT_MISMATCH` |
| ground_anchor_disabled | GROUND test -> `if (false)` | neg.ground_baseline_1px_high | `accepted; expected ANCHOR_GROUND` |
| ceiling_anchor_disabled | CEILING test -> `if (false)` | neg.ceiling_anchor_1px_low | `accepted; expected ANCHOR_CEILING` |
| tile_opacity_disabled | tile opacity test -> `if (false)` | neg.tile_with_hole | `accepted; expected TILE_NOT_OPAQUE` |
| frame_class_check_disabled | frame size comparison -> `if (false)` | neg.large_tall_slot_96x96 | `accepted; expected FRAME_CLASS_MISMATCH` |
| geom_envelope_check_disabled | `if (env.hMin < lo \|\| env.hMax > hi) add('GEOM_HEIGHT_MISMATCH'` -> `if (false) ...` | neg.ramp_envelope_ignores_stratumPx | `accepted; expected GEOM_HEIGHT_MISMATCH` |
| geom_drawn_height_check_disabled | `if (geomHeights && !geomHeights.has(bh))` -> `if (false)` | neg.ramp_drawn_height_not_a_run | `accepted; expected GEOM_HEIGHT_MISMATCH` |
| tile_class_rows_reduced_to_geom_tile | `TILE_CLASS_ROWS = ['GEOM_TILE', 'RMMZ_AUTOTILE_A1'..'A4']` -> `['GEOM_TILE']` | neg.autotile_with_hole | `accepted; expected TILE_NOT_OPAQUE` |
| pipeless_row_check_disabled | the "line directly under the ledger table" test -> `if (false)` | neg.ledger_row_without_leading_pipe | `accepted; expected LEDGER_MALFORMED` |
| inflate_cap_removed | the capped `zlib.inflateSync(...)` removed | neg.png_inflate_bomb | `codes [ANCHOR_GROUND,SCALE_OUT_OF_ENVELOPE], expected [PNG_INVALID]` (the 8 MiB stream is decoded in full) |
| stratum_sum_check_disabled | `if (sum !== g.layerPx)` -> `if (false)` | neg.stratumPx_sum_not_layerPx | `accepted; expected GEOMETRY_INVALID` |
| copy_offset_x_plus_1 | copy destination x+1 | place.all_good_exit0 | `exit 1, refusals ["INTERNAL_COPY_MISMATCH", ...]` (the tool's own self-check) |
| copy_offset_x_plus_1_self_check_off | copy x+1, and both self-checks off | place.pixel_diff_zero_sheets | `pixels differ: ATLAS_TEST_SURFACE_B1: 8030, TS_TEST_SURFACE_B1_A2: 288, TS_TEST_SURFACE_B1_B: 152, CHR_TEST_SURFACE_B1_RAT: 241` |

All 19 lines in `evidence/gate_fresh_clone.txt` read `PASS mutant.<name>_killed`.

## Provoked failures

`UF_TEST_PROVOKE=place.<check>` gives that check an input or expectation that must make it fail. It never just flips the result:
- a negative case gets the valid cell, which must then be accepted;
- a positive case gets a corrupted input or expectation;
- a mutant check runs on the unmutated copy.

`--provoke-sweep` runs the whole suite once per check. Result (`evidence/provoke_sweep.txt`, at `adb99356`): `SWEEP RESULT: 154 of 154 checks fail when provoked, 0 do not`. No sweep line lists a knock-on failure, meaning another check that failed in the same provoked run.

Three single runs at `adb99356`, raw (trimmed to the FAIL line, the result line and the exit code):

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

The first sweep (at 9d9d7a2a) found two provokes that had no effect and one knock-on:
- `fixture.catalogue_slots_valid` moved a slot to the x it already had.
- `place.inputs_untouched` corrupted a key that does not exist.
- `runtime_dims` shared its expectation object with `pixel_diff_zero_runtime` (the knock-on).

All three were fixed before the `4132e858` sweep, and the sweep at `adb99356` shows none of them.

## CLI evidence (excerpt from evidence/cli_examples.txt, at adb99356)

The file shows 16 commands. The exit codes, in order:
- seven refusals (off-palette, alpha 128, grid colour, tile hole, GROUND 1 px high, CEILING 1 px low, 47x48): `EXIT=1`;
- an unapproved file: `EXIT=1`;
- an approved file: `EXIT=0`;
- four more refusals (ramp envelope literal 96, ramp drawn 66 px, A2 autotile hole, inflate bomb): `EXIT=1`;
- placement: `EXIT=0`;
- overwrite without `--replace`: `EXIT=1`;
- the same with `--replace`: `EXIT=0`.

```text
$ node tools/art/validate_art.js <ramp_literal>\cells\SURFACE_B1_RAMP_TEST_SOIL_V1_C2.png --entry SURFACE_B1_RAMP_TEST_SOIL_V1_C2 ...   (catalogue envelope for ramp cell 2 set to a literal 96 px)
REFUSE GEOM_HEIGHT_MISMATCH: envelope height 96..96 of SURFACE_B1_RAMP_TEST_SOIL_V1_C2 is not from geometry: GEOM_RAMP_2 (tilePx + a run of 2 of stratumPx [19,19,19,19,20] in geometry.json) allows {86, 87}
REFUSE GEOM_HEIGHT_MISMATCH: 1 frame(s) drawn at a height GEOM_RAMP_2 does not allow; geometry.json allows {86, 87}: frame 0: drawn 96 px tall
EXIT=1
$ node tools/art/validate_art.js <split_c_rebuilt>\neg\ramp_66.png --entry SURFACE_B1_RAMP_TEST_SOIL_V1_C1 ...   (stratumPx [16,20,20,20,20])
REFUSE GEOM_HEIGHT_MISMATCH: 1 frame(s) drawn at a height GEOM_RAMP_1 does not allow; geometry.json allows {64, 68}: frame 0: drawn 66 px tall
EXIT=1
$ node tools/art/validate_art.js <base>\neg\png_bomb.png --entry SURFACE_B1_PROP_TEST_CHEST_V1_CLOSED ...   (48x48 header, 8 MiB of zeros in IDAT)
REFUSE PNG_INVALID: <tmp>\w\base\neg\png_bomb.png: image data inflates past the 9264 bytes its 48x48 header allows (not decoded)
EXIT=1
$ node tools/art/place_art.js ... --in <tmp>/demo_in   (4 approved cells)
RUNTIME_PENDING ATLAS_TEST_SURFACE_B1:0006 (SURFACE_B1_PROP_TEST_LANTERN_V1_HANGING): RMMZ_CHARACTER, no runtime file named
WARN runtime/img/tilesets/TEST_Surface_A2.png is partial (1 placed part(s), the rest transparent); do not copy it over a complete sheet
RESULT: PLACED filled=4/21 empty=17 unexpected=1 derivedPending=1 sheets=2 runtime=2
EXIT=0
$ node tools/art/place_art.js ... --in <tmp>/demo_in2   (a different approved chest, no --replace)
REFUSE SURFACE_B1_PROP_TEST_CHEST_V1_CLOSED.png OVERWRITE_REFUSED: slot ATLAS_TEST_SURFACE_B1:0005 already holds ...; pass --replace ATLAS_TEST_SURFACE_B1:0005 to overwrite it
RESULT: REFUSED (1 refusal(s)); nothing under --out was changed
EXIT=1
```

## Internal reviews before hand-off (not the Grok review)

1. **A read-only review agent on `1d756cfb`** reported two issues, both of which I confirmed by reading the code. Both were fixed in `5b65a105` with regression checks.
   - A sheet file in `--out` that was not listed in `placement_report.json` was overwritten silently. If a sheet and the report were edited together, pixels inside unfilled slots were carried forward. Checks: `place.out_state_unlisted_sheet_refused`, `place.out_state_pixels_in_empty_slot_refused`.
   - A ledger section hidden by an HTML comment opened before the heading was still read. Check: `neg.ledger_inside_html_comment`.
2. **A second review pass on `4132e858`**, with scratch experiments in `%TEMP%` (not committed), compared the tools with Lane S's working tree and probed edge cases. The fixes are in `bf0fc4f0`:
   - Geometry rows, tile class and runtime kinds now follow the Lane S schema. escalation.md point 1 records that the first version would have refused every Lane S strip and ramp. See escalation points 1 to 3.
   - Refused: a pipe-less row directly under the ledger table, and a pipe-less second table. Markdown shows both as table rows.
   - The PNG inflate is capped by the header size before decoding (`tools/png_read.js` is read-only for this lane and has no cap).
   - A sized creature with no `frameClass` is refused `FRAME_CLASS_MISSING`, so its frame size cannot escape the frame-class check. One scratch probe was 48x64 creature frames with the frame class left out while TALL_MEDIUM is disabled.
   - Colour-management chunks give a warning.
   - Template sidecar hashes are kept in the placement state, so a changed sidecar makes `--out` stale.
   - Approval by slot id only gives a warning.
   - Tile id 0 is refused.

## Open points (details in escalation.md; for the PM / Lane S, and the Owner where marked)

1. **Geometry rows (Lane S SCHEMA.md reading).**
   - `GEOM_STRATUM_k` = a run of k consecutive strata.
   - `GEOM_RAMP_k` = tilePx + such a run. Lane S marks this PROPOSED; it may need the Owner.
   - `GEOM_LAYER_FACE` = layerPx.
   - The drawn height of each frame and the entry's envelope must fit these values; the slot only has to be tall enough.
2. **Tile class:** `GEOM_TILE` and `RMMZ_AUTOTILE_A1..A4`, except `groupType: OVERLAY`. Still open: whether any A2 autotiles are meant to have transparent parts.
3. **Runtime targets (Owner side).**
   - Which cells of a 3x4 character block a single-frame prop fills is not specified. Lane S maps 152 props and items to `!$` sheets. The tools report these `RUNTIME_PENDING`.
   - Runtime files hold only the placed parts, so they are marked `partial` and must not replace a complete sheet in `game/img`. No brief says who merges runtime exports into `game/img`, or how.
   - The Lane S working tree has 8 target clashes (stand-ins sharing one stock block) and 2 size mismatches. They refuse a run only if those entries are actually placed.
4. **Envelope source:** the tools read the envelope from the entry (Lane S copies it from the chart row). They do not read `scale_chart.json` or `DEUS_ScaleRegistry.json`.
5. **`alphaMode: OWNER_OPEN` (Owner):** there is no field or file for a ruling, so binary alpha is enforced for every entry (`neg.alpha_owner_open_still_binary`). Supporting a ruling needs a code change and a test.
6. **Template sidecar:**
   - It is read from `<templates>/<sheetId>.json` (default `art/templates/`).
   - The residue colours are `gridColour`, `labelColour` and an opaque `bg` (`"magenta"` = #FF00FF; `"transparent"` adds nothing).
   - The sidecar's slot rect must equal the catalogue's.
   - Without a sidecar, every file on that sheet is refused `TEMPLATE_SIDECAR_MISSING`, so nothing can be placed until Lane T's templates are on main.
7. **`smallRaceReadabilityFloorPx`:** not read by these tools. If the Owner turns it on, Lane S's envelopes change and the validator follows them.

## Not done / known problems

- There is no test against a real `art/catalogue/catalogue.json`. That belongs to the later PM-launched run after Lane S merges (BRIEF: "Not in this run"). The only contact with real Lane S data was the read-only probe in escalation.md point 4. It read Lane S's uncommitted working tree on 2026-09-26, which may have changed since.
- The runtime files have never been loaded in RMMZ, because there is no approved art to load.
  - Tile positions come from reading `game/js/rmmz_core.js` and working them out by hand, and the tests check them only against that hand-made table.
  - No Playtest (F5) was run: this task is offline tooling.
- `DUPLICATE_INPUT` (`X.png` and `X.PNG`) can only happen on a case-sensitive file system. On this NTFS machine a unit test of `duplicateInputs()` checks it, not an end-to-end run.
- The inflate cap allows up to twice the header's raw size before refusing. A file inside the cap is then inflated again by `tools/png_read.js`, so a valid file is inflated twice.
- Any change to the catalogue, geometry, palette or a template sidecar makes an existing `--out` stale (`OUT_STATE_STALE`), and everything must then be placed again into a new folder. This is by design, but every catalogue change costs a full re-place.
- The Lane J pre-push guard is not installed in this worktree (unchanged from earlier lanes). The push uses plain `git push origin task/lane-u`.

## Try it

1. `node tools/art/test_place_art.js`
   Expected: last line `RESULT: 154 passed, 0 failed`, exit code 0.
2. `node tools/art/test_place_art.js --provoke-sweep` (about 4 to 5 minutes)
   Expected: `SWEEP RESULT: 154 of 154 checks fail when provoked, 0 do not`.
3. With real data, after Lanes S and T merge and the Owner adds ledger rows:
   `node tools/art/place_art.js --catalogue art/catalogue/catalogue.json --approvals art/APPROVALS.md --in <folder of <entryId>.png files> --out <new folder>`

## Decisions needed

- PM / Lane S: confirm or change open points 1, 2, 3 and 6 before the real-catalogue run. Give shared stand-in runtime targets unique targets, or `NONE`.
- Owner (when ready): the single-frame layout in character blocks (point 3), how an `alphaMode` ruling is recorded (point 5), and the ramp convention (point 1). The TALL_MEDIUM, readability-floor, HUGE and GARGANTUAN parameters stay as the BRIEF leaves them.

## Final HEAD

```text
$ git rev-parse HEAD      (after the commit that adds this report)
889aa3256b54aeffa8543ea69f2461ba8054d4b7
```

The only later commit fills in this section. Its hash is printed in the session's final message.
