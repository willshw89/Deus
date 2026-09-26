# Lane U report: WG.41.01 art placement + validator

Writer: claude. Branch `task/lane-u`, base main `b612bc7217349bce695e15395bd041f63673b89b`. Date 2026-09-26.
No art was generated, requested, drawn, edited or integrated. Every image the tests use is a synthetic solid-colour cell the test writes into the OS temp folder at run time and deletes afterwards. No PNG is committed. `art/APPROVALS.md` was not written.

Code commit tested (fresh clone, provoke sweep, CLI examples): `4132e8586e37e852aa268ae58b2a089bcbc8a927`. The commit that adds this report changes only `tasks/WG.41.01/lane-u/**`.

## What changed

- `tools/art/validate_art.js` (new): validates one PNG against its catalogue slot. It checks the SHA-256 ledger approval, file size, binary alpha, master palette, template residue and the slot rect against the template sidecar. Per frame it checks the scale envelope and the GROUND/CEILING anchor. It also checks tile-class opacity, the frame class from `geometry.json`, and geometry-derived heights from `stratumPx`/`layerPx`. Exit 0 accepted, 1 refused (with pixel coordinates), 2 usage or I/O error. It is also a module that `place_art.js` uses.
- `tools/art/place_art.js` (new): validates every input, then copies the RGBA bytes 1:1 into the slot rects of the catalogue sheets. It exports RMMZ runtime sheets per `entries[].runtime` and writes `placement_report.json` and `coverage_report.json`/`.md`. It is all or nothing, so a refusal leaves `--out` unchanged. It has the `--replace` overwrite guard, `DERIVED_PENDING` reporting, and checks of the earlier state in `--out` (hashes, empty unfilled slots, current approvals).
- `tools/art/test_place_art.js` (new): the gate. 135 checks, 15 source mutants, `UF_TEST_PROVOKE=place.<check>` for every check, and a `--provoke-sweep` mode.
- `tools/art/fixtures/place/{geometry,palette,catalogue}.fixture.json` (new, JSON only):
  - geometry: the contract geometry.
  - palette: 12 colours copied from the master palette.
  - catalogue: 19 `TEST_` entries on 4 sheets (ATLAS 576x576, A2 768x576, B 768x768, `$` character 144x192).
- `docs/art/APPROVALS_FORMAT.md` (new): the Owner's ledger format: heading, columns, how the tools read it, what counts as malformed, how to get a hash, how to withdraw an approval.
- `tasks/WG.41.01/lane-u/evidence/`: raw outputs: `gate_fresh_clone.txt`, `provoke_sweep.txt`, `cli_examples.txt`.

## How I tested it (commands and raw exit codes)

```text
$ git clone --branch task/lane-u --single-branch <worktree> <tmp>/laneu_fresh      clone EXIT=0
$ (in the clone) node tools/art/test_place_art.js
fresh clone of task/lane-u at 4132e8586e37e852aa268ae58b2a089bcbc8a927
RESULT: 135 passed, 0 failed
EXIT=0
$ node tools/art/test_place_art.js --provoke-sweep      (worktree at 4132e858...)
SWEEP baseline: exit 0, 135 checks
SWEEP RESULT: 135 of 135 checks fail when provoked, 0 do not
EXIT=0
$ git diff --name-only b612bc7217349bce695e15395bd041f63673b89b..HEAD   (before this report commit)
docs/art/APPROVALS_FORMAT.md
tasks/WG.41.01/lane-u/BRIEF.md                       (PM commit)
tasks/WG.41.01/lane-u/lane.json                      (PM commit)
tasks/WG.41.01/lane-u/launches/20260926_022424_prompt.txt   (ops commit)
tools/art/fixtures/place/catalogue.fixture.json
tools/art/fixtures/place/geometry.fixture.json
tools/art/fixtures/place/palette.fixture.json
tools/art/place_art.js
tools/art/test_place_art.js
tools/art/validate_art.js
$ git diff --name-only b612bc72..HEAD | grep -ic '\.png$'        -> 0
$ git diff b612bc72..HEAD -- art/APPROVALS.md | wc -l            -> 0
```

The gate run takes about 4 s on this machine; the sweep about 2 min 45 s (135 child runs, 4 at a time).

Check counts in the gate output: fixture 3, static 1, unit 5, validate 7, neg 64, cli 6, place 34, mutant 15 (total 135).

## Negative cases (BRIEF list; each must refuse with exactly the listed codes)

| BRIEF case | Check(s) | Codes required |
| :--- | :--- | :--- |
| off-by-one rect (x±1, y±1) | `neg.rect_x_plus_1`, `neg.rect_x_minus_1`, `neg.rect_y_plus_1`, `neg.rect_y_minus_1` (catalogue rect shifted against the template sidecar); `place.pixel_diff_sees_off_by_one` (the pixel-diff comparator sees the chest shifted x+1, x-1, y+1, y-1); mutants `copy_offset_x_plus_1` and `copy_offset_x_plus_1_self_check_off` | `SLOT_RECT_MISMATCH` |
| 47x48 input | `neg.dims_47x48` | `DIMS_MISMATCH` |
| stray alpha 128 | `neg.alpha_128` at (24,40); `neg.alpha_owner_open_still_binary` | `ALPHA_NOT_BINARY` |
| one off-palette pixel | `neg.off_palette_pixel` at (25,41) | `OFF_PALETTE` |
| template-grid-colour pixel | `neg.template_grid_colour_pixel` at (20,30); also label colour, magenta background, and `neg.template_residue_isolated` (grid colour inside the palette, so only residue fires) | `TEMPLATE_RESIDUE` (+ `OFF_PALETTE` when the colour is off-palette) |
| missing approval | `neg.approval_missing` | `APPROVAL_MISSING` |
| NAY approval | `neg.approval_nay`, `neg.approval_conflict_yea_nay` | `APPROVAL_NAY` (+ `APPROVAL_MISSING` / `APPROVAL_CONFLICT`) |
| hash of a different file | `neg.approval_hash_of_other_file`, `neg.approval_for_other_entry` | `APPROVAL_MISSING` |
| envelope 1 px over chart max | `neg.envelope_w_1px_over_max`, `neg.envelope_h_1px_over_max`; also 1 px under min, and one frame of 12 | `SCALE_OUT_OF_ENVELOPE` |
| GROUND baseline 1 px high | `neg.ground_baseline_1px_high` | `ANCHOR_GROUND` |
| CEILING anchor 1 px low | `neg.ceiling_anchor_1px_low` | `ANCHOR_CEILING` |
| tile with a hole | `neg.tile_with_hole` at (20,20) | `TILE_NOT_OPAQUE` |
| LARGE_TALL supplied at 48x48 or 96x96 | `neg.large_tall_file_at_48x48`, `neg.large_tall_file_at_96x96` (file); `neg.large_tall_slot_48x48`, `neg.large_tall_slot_96x96` (catalogue slot) | `DIMS_MISMATCH` / `FRAME_CLASS_MISMATCH` |
| LARGE_LONG supplied at 48x96 | `neg.large_long_file_at_48x96`, `neg.large_long_slot_48x96` | `DIMS_MISMATCH` / `FRAME_CLASS_MISMATCH` |
| 48x64 TALL_MEDIUM while disabled | `neg.tall_medium_48x64_while_disabled`; `validate.tall_medium_enabled_accepts` shows that switching the parameter on changes the result | `FRAME_CLASS_DISABLED` |
| ramp height ignores `stratumPx` | `neg.ramp_height_ignores_stratumPx`, `neg.stratumPx_changed_old_ramp_refused`, `neg.wall_face_height_ignores_layerPx` | `GEOM_HEIGHT_MISMATCH` |
| `stratumPx` changed or invalid | `validate.stratumPx_changed_slots_follow` ([20,19,19,19,19] gives ramp slots 20,39,58,77,96, which are accepted); `neg.stratumPx_zero_stratum` ([24,24,24,24,0]), `neg.stratumPx_sum_not_layerPx`, `neg.stratumPx_wrong_count` | `GEOMETRY_INVALID` |

The other negative checks cover the ledger (malformed hash, decision, date and header; legacy rows only; code fence; heading twice or near-miss; HTML comment; indented row), PNG format (16-bit, corrupt, oversized header), template sidecar (missing, wrong size), geometry and palette hashes, the `--geometry` override, unknown entry, derived row and HUGE with no slot.

## Placement checks (from the BRIEF)

- Pixel diff 0 against an expected composite built pixel by pixel in the test: `place.pixel_diff_zero_sheets` (4 sheets) and `place.pixel_diff_zero_runtime` (7 runtime files). `place.transparent_pixel_bytes_kept` checks that the colour bytes (1,2,3) of alpha-0 pixels survive the copy.
- Coverage report exact: `place.coverage_report_exact` compares the full JSON (per sheet: filled, empty, unexpected, not in template, stray pixels; per band: filled, empty, derived pending, no slot, unexpected) with a hand-built object. `place.coverage_markdown` checks the table rows.
- Rerun sha256 equal: `place.rerun_sha256_equal` (every output file in a second folder is byte-identical); `place.rerun_same_folder_unchanged` (same folder again: all 15 slots `UNCHANGED`, images unchanged).
- Runtime export sizes against docs/RMMZ_ASSET_SPEC.md: `place.runtime_dims_rmmz_spec` (A5 384x768, A2 768x576, B 768x768, `$` 144x192 / 144x384 / 288x192, 8-block 576x384). `unit.tileset_targets` checks 35 tile ids against positions I worked out by hand from `Tilemap._addNormalTile` / `_addAutotile` in `game/js/rmmz_core.js`, including all 16 A1 kinds.
- DERIVED_PENDING: `place.derived_pending_reported` (reported; `ledgerApprovedVariant` true from the chest's ledger row; no file or slot written); `place.derived_row_input_refused`.
- `--replace` works and silent overwrite is refused: `place.replace_overwrites_slot` (new bytes in the slot, neighbour untouched, action `REPLACED`); `place.overwrite_refused` (exit 1 `OVERWRITE_REFUSED`, `--out` snapshot unchanged); `place.replace_unused_refused`; `place.replace_unknown_slot_refused`.
- Refusal writes nothing: `place.refusal_writes_nothing` (no `--out` created); `place.refusal_keeps_existing_out`.
- State in `--out`: `place.out_state_tampered`, `place.out_state_unlisted_sheet_refused`, `place.out_state_pixels_in_empty_slot_refused` (sheet and report edited together), `place.out_state_stale`, `place.out_dir_not_empty_refused`, `place.out_dir_unsafe_refused`, `place.approval_revoked_refused` (a NAY added after placement).
- Catalogue and runtime refusals: overlapping slots, runtime path escaping `--out`, runtime size mismatch, unknown runtime kind, two entries on one runtime tile.
- No input file changed: `place.inputs_untouched` hashes the fixture `art/` tree (catalogue, geometry, palette, templates, approvals) and the cells before and after all placement runs.

## Mutant kill table

Each mutant edits temp copies of both tools. Every find string must occur exactly once, or the check fails. A mutant counts as killed only if its kill case passes on an unmutated copy and fails on the mutant. The lines below are copied from `evidence/gate_fresh_clone.txt`. The first four rows are the mutants the BRIEF requires.

| Mutant | Edit | Kill case | What the kill case saw on the mutant |
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
| geom_height_check_disabled | `if (fh !== gs.h)` -> `if (false)` | neg.ramp_height_ignores_stratumPx | `accepted; expected GEOM_HEIGHT_MISMATCH` |
| stratum_sum_check_disabled | `if (sum !== g.layerPx)` -> `if (false)` | neg.stratumPx_sum_not_layerPx | `accepted; expected GEOMETRY_INVALID` |
| copy_offset_x_plus_1 | copy destination x+1 | place.all_good_exit0 | `exit 1, refusals ["INTERNAL_COPY_MISMATCH", ...]` (the tool's own self-check) |
| copy_offset_x_plus_1_self_check_off | copy x+1, and both self-checks off | place.pixel_diff_zero_sheets | `pixels differ: ATLAS_TEST_SURFACE_B1: 5663, TS_TEST_SURFACE_B1_A2: 432, TS_TEST_SURFACE_B1_B: 152, CHR_TEST_SURFACE_B1_RAT: 241` |

Gate lines: `PASS mutant.<name>_killed` for all 15 (evidence/gate_fresh_clone.txt).

## Provoked failures

`UF_TEST_PROVOKE=place.<check>` gives that check an input or expectation that must make it fail:
- negative cases get the valid cell, which must then be accepted;
- positive cases get a corrupted input or expectation;
- mutant checks run on the unmutated copy.

It never just flips the result. `--provoke-sweep` runs the whole suite once per check. Result (evidence/provoke_sweep.txt): `SWEEP RESULT: 135 of 135 checks fail when provoked, 0 do not`. No provoked run failed any other check. Two single runs, raw:

```text
$ UF_TEST_PROVOKE=place.neg.off_palette_pixel node tools/art/test_place_art.js
FAIL neg.off_palette_pixel: accepted; expected OFF_PALETTE
RESULT: 134 passed, 1 failed
EXIT=1
$ UF_TEST_PROVOKE=place.mutant.overwrite_guard_removed_killed node tools/art/test_place_art.js
FAIL mutant.overwrite_guard_removed_killed: mutant survived: place.overwrite_refused still passes
RESULT: 134 passed, 1 failed
EXIT=1
```

The first sweep (at 9d9d7a2a) found two provokes that had no effect: `fixture.catalogue_slots_valid` moved a slot to the x it already had, and `place.inputs_untouched` corrupted a key that does not exist. It also found one knock-on: `runtime_dims` shared its expectation object with `pixel_diff_zero_runtime`. All three were fixed before the final sweep.

## CLI evidence (excerpt from evidence/cli_examples.txt, at 4132e858)

```text
$ node tools/art/validate_art.js <world>/neg/off_palette.png --entry SURFACE_B1_PROP_TEST_CHEST_V1_CLOSED ...
REFUSE OFF_PALETTE: 1 non-transparent pixel(s) not in deus_master_world_palette_v1.hex; first at (25,41) #1C2127
  pixels (1): (25,41)
RESULT: REFUSED entry=SURFACE_B1_PROP_TEST_CHEST_V1_CLOSED file=<world>\neg\off_palette.png sha256=a94d75a2... reasons=OFF_PALETTE
EXIT=1
$ node tools/art/validate_art.js <world>/neg/tile_hole.png --entry SURFACE_B1_TERRAIN_TEST_SOIL_V1_BASE ...
REFUSE TILE_NOT_OPAQUE: tile-class slot (GEOM_TILE) must be 100% opaque; 1 pixel(s) are not; first at (20,20) alpha 0
NOT CHECKED anchor (CENTER anchors have no pixel rule)
EXIT=1
$ node tools/art/place_art.js ... --in <tmp>/demo_in2   (a different approved chest, no --replace)
REFUSE SURFACE_B1_PROP_TEST_CHEST_V1_CLOSED.png OVERWRITE_REFUSED: slot ATLAS_TEST_SURFACE_B1:0005 already holds ...; pass --replace ATLAS_TEST_SURFACE_B1:0005 to overwrite it
RESULT: REFUSED (1 refusal(s)); nothing under --out was changed
EXIT=1
```

Exit codes in that file, in order: seven refusals `EXIT=1`, unapproved file `EXIT=1`, approved file `EXIT=0`, placement `EXIT=0`, overwrite without `--replace` `EXIT=1`, with `--replace` `EXIT=0`.

## Internal review before hand-off

I ran a separate read-only review agent (not the Grok review) on `1d756cfb`. It reported two issues, both of which I confirmed by reading the code:
1. **Earlier state in `--out`:** a sheet file not listed in `placement_report.json` was not detected (it would have been overwritten silently). If a sheet and the report were edited together, pixels inside unfilled slots were carried forward.
2. **Ledger hidden by a comment:** a ledger section inside an HTML comment opened *before* the heading was still read. A reader of the rendered file cannot see such a section.

Both were fixed in `5b65a105`, with regression checks `place.out_state_unlisted_sheet_refused`, `place.out_state_pixels_in_empty_slot_refused` and `neg.ledger_inside_html_comment`. The same commit stopped a `--replace` whose input was itself refused from also reporting `REPLACE_UNUSED` (`place.replace_with_refused_input_reports_only_the_refusal`). Earlier self-review had added the refusal of rows inside HTML comments or indented four spaces, of PNG headers far larger than the slot (refused without decoding), and of duplicate input names.

## Interpretations the brief leaves open (for the PM / Lane S; not decided for the Owner)

1. **`GEOM_STRATUM_k` height:** implemented as the sum of the first k strata (`stratumPx[0] + ... + stratumPx[k-1]`): 19, 38, 57, 76, 96 by default, so `GEOM_STRATUM_5` equals `layerPx`. This fits "a ramp is a run of cells rising one stratum per cell" (DEC-020) and "an edge strip per stratum difference 1..5". If Lane S means the k-th stratum alone (19, 19, 19, 19, 20), `geometryRowSize()` in validate_art.js is the one place to change. The mismatch would show up as refusals, not as silent acceptance.
2. **Tile class:** only `scaleRow: GEOM_TILE` entries must be 100% opaque. Autotile blocks are covered by giving them `GEOM_TILE` frames, as the fixture does.
3. **`runtime` vocabulary:** `{kind: "TILESET", file, tileId}` (RMMZ tile id; autotiles as whole blocks with shape 0) and `{kind: "CHARACTER", file, index}` (3x4-frame slot). Any other kind is refused `RUNTIME_INVALID`. Lane S's catalogue has to use these names, or the PM decides otherwise.
4. **Frames:** a slot is split into `frames.cols` x `frames.rows` equal frames (`null` = 1x1). The envelope and anchor apply per frame.
5. **Template sidecar:** read from `<templates>/<sheetId>.json` (default `art/templates/`). The residue colours are `gridColour`, `labelColour` and an opaque `bg` (`"magenta"` = #FF00FF; `"transparent"` adds nothing). Colours may be `#RRGGBB`, `#RRGGBBAA`, `[r,g,b(,a)]` or `{r,g,b}`. The sidecar's slot rect must equal the catalogue's. Without a sidecar every file on that sheet is refused `TEMPLATE_SIDECAR_MISSING`, so nothing can be placed until Lane T's templates are on main.
6. **Scale envelope:** read from the entry's `envelope` (Lane S copies it from the chart row). The validator does not read `scale_chart.json` or `DEUS_ScaleRegistry.json` itself.
7. **alphaMode OWNER_OPEN:** there is no field for an Owner ruling yet, so binary alpha is enforced for every entry (`neg.alpha_owner_open_still_binary`). A ruling will need a code change and a test.
8. **`smallRaceReadabilityFloorPx`:** not read by these tools. If the Owner turns it on, Lane S's envelopes change and the validator follows them.

## Not done / known problems

- No test against a real `art/catalogue/catalogue.json`. That is the later PM-launched run after Lane S merges (BRIEF: "Not in this run").
- The runtime sheets have never been loaded in RMMZ, because there is no approved art to load. Tile positions come from reading `game/js/rmmz_core.js` and working positions out by hand; the tests check them against that hand-made table only. No Playtest (F5) was run: this task is offline tooling.
- `DUPLICATE_INPUT` (`X.png` and `X.PNG`) can only occur on a case-sensitive file system. On this NTFS machine it is checked by a unit test of `duplicateInputs()`, not end to end.
- A PNG with a normal header but a huge compressed stream is still inflated in full by `tools/png_read.js` (no output cap; that file is read-only for this lane). Headers far larger than the slot are refused before decoding.
- Any change to the catalogue, geometry or palette makes an existing `--out` stale (`OUT_STATE_STALE`); everything is then placed again into a new folder. This is by design, but costs a full re-place per catalogue change.
- The Lane J pre-push guard is not installed in this worktree (unchanged from earlier lanes); the push below uses plain `git push origin task/lane-u`.

## Try it

1. `node tools/art/test_place_art.js`
   Expected: last line `RESULT: 135 passed, 0 failed`, exit code 0.
2. `node tools/art/test_place_art.js --provoke-sweep` (about 3 minutes)
   Expected: `SWEEP RESULT: 135 of 135 checks fail when provoked, 0 do not`.
3. With real data, after Lanes S and T merge and the Owner adds ledger rows:
   `node tools/art/place_art.js --catalogue art/catalogue/catalogue.json --approvals art/APPROVALS.md --in <folder of <entryId>.png files> --out <new folder>`

## Decisions needed

- PM / Lane S: confirm or change interpretations 1 to 5 above before the real-catalogue run.
- Owner (when ready): how an `alphaMode` ruling is recorded; the TALL_MEDIUM, readability-floor, HUGE and GARGANTUAN parameters stay as the BRIEF leaves them.
