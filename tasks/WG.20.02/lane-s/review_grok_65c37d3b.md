# WG.20.02 Lane S independent review (Grok)

Reviewed commit, pasted from `git rev-parse`:

```
65c37d3b0d76127dfb56bc4e1e7ff80b6f533fdb
```

Reviewer: Grok. This file is the review. Catalogue content, the brief, fixtures, and art were not modified. No art was generated, requested, or integrated.

`tasks/WG.20.02/lane-s/escalation.md` is not present.

## Git confirmation

Command in the live worktree: `git rev-parse HEAD origin/task/lane-s; git log -8 --format="%H %an %s"`

```
65c37d3b0d76127dfb56bc4e1e7ff80b6f533fdb
65c37d3b0d76127dfb56bc4e1e7ff80b6f533fdb
65c37d3b0d76127dfb56bc4e1e7ff80b6f533fdb deus-claude [claude] WG.20.02 REPORT.md: figures, raw evidence, known problems (stale-source merge hazard), Owner questions
20e52e00733f13e58f759511883a8df4d5e83ccf deus-claude [claude] WG.20.02 evidence regenerated in fresh clones of 51d3915a (gates x2 checkouts, 47 provocations, tamper, scope)
51d3915af6beee1476c5b78df76b7c23dceb6a01 deus-claude [claude] WG.20.02 WIP: evidence runner script (fresh clone, gates, provocations, tamper, scope)
5d99a96244cdd177ace5bd31633fafb87bed2a5e snewt [ops] WG.20.02 lane-s launch prompt 20260926_034739
7f3e650b8060ee42fb35d2b1c84a2c5b314555dd deus-pm [pm] WIP checkpoint after Claude usage limit
84189d5472aa91e94b30b58644fd49c289c9f52b deus-claude [claude] WG.20.02 conflicts: Q-STRATA wording (targets depend on stratum order)
a3fd773dd4fc86a701b1b76691e43301a308b81d deus-claude [claude] WG.20.02 references: HASH_MATCH verification value; schema doc
a328d9ee6e12256a956f063bc3ccf8604a139bd7 deus-claude [claude] WG.20.02 WIP: children cite the SMALL frame row, style-anchor packs, SCHEMA.md updates
```

HEAD and `origin/task/lane-s` were both `65c37d3b0d76127dfb56bc4e1e7ff80b6f533fdb`.

## Clone

```
git clone -c core.autocrlf=false C:\Users\snewt\.deus_worktrees\lane-s $env:TEMP\lanes_review_65c37d3b
CLONE_EXIT=0
```

Then, in that clone:

```
git checkout --detach 65c37d3b0d76127dfb56bc4e1e7ff80b6f533fdb
CHECKOUT_EXIT=0
git rev-parse HEAD
65c37d3b0d76127dfb56bc4e1e7ff80b6f533fdb
REV_EXIT=0
git config --get core.autocrlf
false
AUTOCRLF_EXIT=0
git status --porcelain
STATUS_EXIT=0
```

Porcelain was empty. The clone was removed after the measurements (`CLONE_EXISTS=False`).

## Scope

Command, in the clone: `git diff --name-status b612bc7217349bce695e15395bd041f63673b89b 65c37d3b0d76127dfb56bc4e1e7ff80b6f533fdb`

`DIFF_EXIT=0`. `git diff --name-only` count `COUNT=72`, `NAMEONLY_EXIT=0`. Status letters: `A=72`. Paths outside `lane.json` `allowedPaths`: `OUTSIDE_COUNT=0`. Image names (`png`, `jpg`, `jpeg`, `gif`, `bmp`, `webp`, `tga`, `psd`, `aseprite`): `IMAGE_COUNT=0`. `git diff --numstat` lines that start with `-` (binary): none. `NUMSTAT_EXIT=0`.

Every path is an add under `art/catalogue/**`, `docs/art/catalogue/**`, `tools/art/build_catalogue.js`, `tools/art/test_catalogue.js`, `tools/art/fixtures/catalogue/**`, or `tasks/WG.20.02/lane-s/**`. The diff is catalogue JSON, generated catalogue docs, the builder, the test, JSON fixtures, and lane task files. It contains no painted sprite, tile, or other image.

| Status | Path |
|---|---|
| A | art/catalogue/.gitattributes |
| A | art/catalogue/catalogue.json |
| A | art/catalogue/catalogue.schema.json |
| A | art/catalogue/conflict_claims.json |
| A | art/catalogue/conflicts.md |
| A | art/catalogue/geometry.json |
| A | art/catalogue/mapping.json |
| A | art/catalogue/reference_inputs.json |
| A | art/catalogue/references.json |
| A | art/catalogue/scale_chart.json |
| A | art/catalogue/size_classes.json |
| A | art/catalogue/size_inputs.json |
| A | art/catalogue/strip_transcription.json |
| A | docs/art/catalogue/.gitattributes |
| A | docs/art/catalogue/BAND_ALL.md |
| A | docs/art/catalogue/BAND_LOWER1.md |
| A | docs/art/catalogue/BAND_LOWER2.md |
| A | docs/art/catalogue/BAND_SURFACE.md |
| A | docs/art/catalogue/BAND_UPPER1.md |
| A | docs/art/catalogue/BAND_UPPER2.md |
| A | docs/art/catalogue/INDEX.md |
| A | docs/art/catalogue/SCHEMA.md |
| A | tasks/WG.20.02/lane-s/BRIEF.md |
| A | tasks/WG.20.02/lane-s/REPORT.md |
| A | tasks/WG.20.02/lane-s/evidence/check_tamper_and_invalid_geometry.txt |
| A | tasks/WG.20.02/lane-s/evidence/gate_autocrlf_false.txt |
| A | tasks/WG.20.02/lane-s/evidence/gate_build_check.txt |
| A | tasks/WG.20.02/lane-s/evidence/gate_test_catalogue.txt |
| A | tasks/WG.20.02/lane-s/evidence/provocations.txt |
| A | tasks/WG.20.02/lane-s/evidence/scope_and_counts.txt |
| A | tasks/WG.20.02/lane-s/lane.json |
| A | tasks/WG.20.02/lane-s/launches/20260926_022202_prompt.txt |
| A | tasks/WG.20.02/lane-s/launches/20260926_034739_prompt.txt |
| A | tasks/WG.20.02/lane-s/run_evidence.sh |
| A | tools/art/build_catalogue.js |
| A | tools/art/fixtures/catalogue/.gitattributes |
| A | tools/art/fixtures/catalogue/cases/derived_derived_base.json |
| A | tools/art/fixtures/catalogue/cases/derived_missing_base.json |
| A | tools/art/fixtures/catalogue/cases/dup_id.json |
| A | tools/art/fixtures/catalogue/cases/dup_slot.json |
| A | tools/art/fixtures/catalogue/cases/geom_height.json |
| A | tools/art/fixtures/catalogue/cases/missing_anchor.json |
| A | tools/art/fixtures/catalogue/cases/missing_envelope.json |
| A | tools/art/fixtures/catalogue/cases/missing_footprint.json |
| A | tools/art/fixtures/catalogue/cases/missing_ramp.json |
| A | tools/art/fixtures/catalogue/cases/missing_size.json |
| A | tools/art/fixtures/catalogue/cases/no_source.json |
| A | tools/art/fixtures/catalogue/cases/oos_no_reason.json |
| A | tools/art/fixtures/catalogue/cases/paperdoll_anchor.json |
| A | tools/art/fixtures/catalogue/cases/paperdoll_frames.json |
| A | tools/art/fixtures/catalogue/cases/ramp_unknown.json |
| A | tools/art/fixtures/catalogue/cases/scalerow_unknown.json |
| A | tools/art/fixtures/catalogue/cases/sheet_not_grid.json |
| A | tools/art/fixtures/catalogue/cases/sheet_too_large.json |
| A | tools/art/fixtures/catalogue/cases/size_outside_row.json |
| A | tools/art/fixtures/catalogue/cases/slot_off_grid.json |
| A | tools/art/fixtures/catalogue/cases/slot_outside_sheet.json |
| A | tools/art/fixtures/catalogue/cases/slot_overlap.json |
| A | tools/art/fixtures/catalogue/cases/slot_too_small.json |
| A | tools/art/fixtures/catalogue/cases/source_dropped.json |
| A | tools/art/fixtures/catalogue/cases/variant_has_slot.json |
| A | tools/art/fixtures/catalogue/cases/z_out_of_range.json |
| A | tools/art/fixtures/catalogue/geometry/nine_layers.json |
| A | tools/art/fixtures/catalogue/geometry/readability_floor_on.json |
| A | tools/art/fixtures/catalogue/geometry/stratum_invalid_sum.json |
| A | tools/art/fixtures/catalogue/geometry/stratum_invalid_zero.json |
| A | tools/art/fixtures/catalogue/geometry/stratum_reordered.json |
| A | tools/art/fixtures/catalogue/geometry/stratum_skewed.json |
| A | tools/art/fixtures/catalogue/geometry/tall_medium_on.json |
| A | tools/art/fixtures/catalogue/mini/catalogue.json |
| A | tools/art/fixtures/catalogue/mini/context.json |
| A | tools/art/test_catalogue.js |

Files changed after the evidence base `51d3915af6beee1476c5b78df76b7c23dceb6a01` (`SINCE_EXIT=0`) are only:

```
tasks/WG.20.02/lane-s/REPORT.md
tasks/WG.20.02/lane-s/evidence/check_tamper_and_invalid_geometry.txt
tasks/WG.20.02/lane-s/evidence/gate_autocrlf_false.txt
tasks/WG.20.02/lane-s/evidence/gate_build_check.txt
tasks/WG.20.02/lane-s/evidence/gate_test_catalogue.txt
tasks/WG.20.02/lane-s/evidence/provocations.txt
tasks/WG.20.02/lane-s/evidence/scope_and_counts.txt
```

`BRIEF.md` is unchanged in that range, so the builder inputs under test match the evidence commit.

## Gate commands

`lane.json` `gateTests`, run in the clone at `65c37d3b0d76127dfb56bc4e1e7ff80b6f533fdb` with `core.autocrlf=false`.

### `node tools/art/test_catalogue.js`

```
PASS catalogue.schema: $id deus-art-catalogue/1.1.0; unsupported keywords 0; 10089 entries, 207 sheets: 0 schema errors; broken copy rejected with 2 errors
PASS catalogue.entry_fields: 10089 entries checked; 0 bad
PASS catalogue.rebuild_identical: 12 outputs; run1 vs run2 differ: none; fresh build vs committed differ: none; catalogue.json sha256 eb5a0fc1ebbf28b8...
PASS catalogue.rule_derived_derived_base: a derivedFrom pointing at a derived base: baseline fixture 0 errors; patched fixture -> 1 DERIVED_BAD_BASE (SURFACE_SHARED_RAMP_MEADOW_N-C3_DEFAULT: derivedFrom LOWER1_SHARED_EDGE_MEADOW_S-H2_DEFAULT is itself derived)
PASS catalogue.rule_derived_missing_base: a derivedFrom pointing at a missing base: baseline fixture 0 errors; patched fixture -> 1 DERIVED_BAD_BASE (LOWER1_SHARED_EDGE_MEADOW_S-H2_DEFAULT: derivedFrom SURFACE_SHARED_EDGE_NOSUCH_S-H2_DEFAULT is missing)
PASS catalogue.rule_dup_id: a duplicate id: baseline fixture 0 errors; patched fixture -> 1 DUP_ID (ALL_SHARED_ITEM_LOG_V1_DEFAULT: duplicate entry id)
PASS catalogue.rule_dup_slot: a duplicate slotId: baseline fixture 0 errors; patched fixture -> 1 DUP_SLOT (ALL_SHARED_ITEM_LOG_V1_DEFAULT: duplicate slotId ATLAS_SURFACE_SHARED_PROP_01:0036)
PASS catalogue.rule_geom_height: a geometry-derived slot height that is not computed from stratumPx/layerPx: baseline fixture 0 errors; patched fixture -> 1 GEOM_HEIGHT (SURFACE_SHARED_EDGE_MEADOW_S-H2_DEFAULT: height 38/48/48 is not 38/38/39 from stratumPx/layerPx)
PASS catalogue.rule_missing_anchor: a missing anchor: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing anchor)
PASS catalogue.rule_missing_envelope: a missing envelope: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing envelope)
PASS catalogue.rule_missing_footprint: a missing footprint: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing footprint)
PASS catalogue.rule_missing_ramp: a missing palette ramp: baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing palette ramp)
PASS catalogue.rule_missing_size: a missing size (frames): baseline fixture 0 errors; patched fixture -> 1 MISSING_FIELD (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: missing size (frames))
PASS catalogue.rule_no_source: an entry that traces to no source: baseline fixture 0 errors; patched fixture -> 1 NO_SOURCE (ALL_SHARED_ITEM_LOG_V1_DEFAULT: entry traces to no source)
PASS catalogue.rule_oos_no_reason: an outOfScope row without a reason: baseline fixture 0 errors; patched fixture -> 1 OOS_NO_REASON (skins:human: outOfScope row without a reason)
PASS catalogue.rule_paperdoll_anchor: a paper-doll part whose anchor differs from its bodyType base: baseline fixture 0 errors; patched fixture -> 1 PAPERDOLL_MISMATCH (ALL_SHARED_EQUIPMENT_STONE-AXE_LAYER_DEFAULT: anchor differs from ALL_SHARED_CHARACTER_HUMAN_MALE-T0_DEFAULT)
PASS catalogue.rule_paperdoll_frames: a paper-doll part whose frame layout differs from its bodyType base: baseline fixture 0 errors; patched fixture -> 1 PAPERDOLL_MISMATCH (ALL_SHARED_EQUIPMENT_STONE-AXE_LAYER_DEFAULT: frame layout [16,4,["S","W","E","N"]] differs from ALL_SHARED_CHARACTER_HUMAN_MALE-T0_DEFAULT [3,4,["S","W","E","N"]])
PASS catalogue.rule_ramp_unknown: a ramp id not in the palette registry: baseline fixture 0 errors; patched fixture -> 1 RAMP_UNKNOWN (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: ramp NOT_A_REGISTRY_RAMP is not in the palette registry)
PASS catalogue.rule_scalerow_unknown: a scaleRow not in scale_chart.json: baseline fixture 0 errors; patched fixture -> 1 SCALEROW_UNKNOWN (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: scaleRow TREE_NOT_IN_THE_CHART is not in scale_chart.json or size_classes.json)
PASS catalogue.rule_sheet_not_grid: a sheet side not a multiple of 48: baseline fixture 0 errors; patched fixture -> 1 SHEET_NOT_GRID (ATLAS_SURFACE_SHARED_PROP_01: atlas 2880x150 is not a multiple of 48)
PASS catalogue.rule_sheet_too_large: an atlas side over 4096: baseline fixture 0 errors; patched fixture -> 1 SHEET_TOO_LARGE (ATLAS_SURFACE_SHARED_PROP_01: atlas 4128x144 is over 4096)
PASS catalogue.rule_size_outside_row: a size outside its chart row min/max: baseline fixture 0 errors; patched fixture -> 1 SIZE_OUTSIDE_ROW (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: envelope outside TREE_COMMON_OAK min/max)
PASS catalogue.rule_slot_off_grid: a slot off the 48 grid: baseline fixture 0 errors; patched fixture -> 1 SLOT_OFF_GRID (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: slot 2071,0 96x96 is off the 48 grid)
PASS catalogue.rule_slot_outside_sheet: a slot outside its sheet: baseline fixture 0 errors; patched fixture -> 1 SLOT_OUTSIDE_SHEET (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: slot leaves ATLAS_SURFACE_SHARED_PROP_01 (2880x144))
PASS catalogue.rule_slot_overlap: overlapping slot rects in a sheet: baseline fixture 0 errors; patched fixture -> 1 SLOT_OVERLAP (SURFACE_SHARED_EDGE_MEADOW_S-H2_DEFAULT: overlaps SURFACE_SHARED_RAMP_MEADOW_N-C3_DEFAULT in ATLAS_SURFACE_SHARED_TILE_01)
PASS catalogue.rule_slot_too_small: a slot smaller than the chart envelope: baseline fixture 0 errors; patched fixture -> 1 SLOT_TOO_SMALL (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: slot cell 96x48 is smaller than the envelope 80x96)
PASS catalogue.rule_source_dropped: a source id dropped without an outOfScope reason: baseline fixture 0 errors; patched fixture -> 1 SOURCE_DROPPED (objects:fixture_only_id: catalog source id "objects:fixture_only_id" maps to no entry and has no outOfScope reason)
PASS catalogue.rule_variant_has_slot: a variant (derivedFrom set) with a paint slot: baseline fixture 0 errors; patched fixture -> 1 VARIANT_HAS_SLOT (LOWER1_SHARED_EDGE_MEADOW_S-H2_DEFAULT: a variant row owns a paint slot)
PASS catalogue.rule_z_out_of_range: a zMin/zMax outside the geometry range: baseline fixture 0 errors; patched fixture -> 1 Z_OUT_OF_RANGE (SURFACE_SHARED_TREE_OAK_V1_DEFAULT: z 0..40 outside -16..15)
PASS catalogue.rule_coverage: 19 FAIL rules, 26 fixture cases; rules without a case: none
PASS catalogue.live_catalogue_valid: real build: 10089 entries, 0 rule errors
PASS catalogue.scale_chart_vs_registry: 39 registry rows for 39 registry classes; 17 STRIP rows (+ 1 tile label); 0 problems
PASS catalogue.geometry_stratum_sum: stratumPx [19,19,19,19,20] sums to 96 (layerPx 96); geometry errors 0; stratum_invalid_zero rejected, stratum_invalid_sum rejected
PASS catalogue.geometry_stratum_changes_slots: [40,14,14,14,14]: 4/4 slot heights changed (EDGE_MEADOW_S-H2 48->96, WALLFACE_OPENING_H2 48->96, RAMP_MEADOW_N-C2 96->144, RAMPSIDE_MEADOW_E-H2 48->96); [20,19,19,19,19]: 3/3 target heights changed (19->20, 57->58, 124->125)
PASS catalogue.geometry_no_literal_layer_count: 0 lines with a literal 9 or 32 in build_catalogue.js
PASS catalogue.geometry_nine_layers: 9-layer fixture (z -4..4): build OK, 10089 entries, 0 outside z range, 5 bands
PASS catalogue.size_srd: 9 race rows checked against SRD Size traits and 7 px/ft; 6 ft human = 42 px (humanPx 42); 7 frame-class rows; 0 problems
PASS catalogue.size_footprint_frame_separate: 129 creature/character/equipment entries carry footprint (squares) and frameClass (px frame) separately; e.g. ALL_SHARED_CREATURE_GIANT-SPIDER_V1_DEFAULT footprint 2x2 squares, frame 96x48 px; 0 problems
PASS catalogue.size_frame_classes: TINY 8 / LARGE_TALL 6 / LARGE_LONG 6 entries with the right cells; 96x96 Large frames: 0; HUGE/GARGANTUAN null frames without slots; TINY footprint 24x24 in a 48x48 frame: true; 0 problems
PASS catalogue.size_optional_params: defaults OFF: true; TALL_MEDIUM entries default 0, enabled 5 (slots 144x384); readability floor on: GNOME 21/25/28 -> 26/27/28, HALFLING 21/21/21 -> 26/27/28
PASS catalogue.size_character_blocks: 129 character/creature/equipment slots in 3x4-frame blocks (144x192, 144x384, 288x192); RMMZ character sheets not 3x4: 0; 0 problems
PASS catalogue.coverage: WorldCatalog ids 246/246; brief anchor/ui/eq/face ids 36/36; manifest rows 18/18; open AR rows 49/49; addendum family x band cells: 65/65
PASS catalogue.references_hash: 27 references, 26 tracked re-hashed and matching; 1 untracked (UNVERIFIED_ABSENT); entries with unknown references: 0; 0 problems
PASS catalogue.depth_no_colours: 7595 DEPTH_<band> rows: 0 colour values, 0 colour keys; 5 depth palette placeholders, 0 with colours; variant rows with a paint slot: 0
PASS catalogue.no_image_data: image files under art/catalogue, docs/art/catalogue, tools/art/fixtures/catalogue: 0; outputs with embedded image data: 0
PASS catalogue.schema_doc_terrains: 29 terrains used; SCHEMA.md lists 30; missing none; extra none
PASS catalogue.conflicts_required: 19/19 required topics present; conflicts.md 134 lines

47/47 checks passed
EXIT=0
```

### `node tools/art/build_catalogue.js --check`

```
WARN UNVERIFIED_ABSENT reference/u7_shapes_0_31.png (untracked third-party reference not present in this checkout)
CHECK: OK (12 generated files match)
EXIT=0
```

After both gates and the two provocations below, `git status --porcelain` in the clone was empty. `STATUS_EXIT=0`.

## Spot-check of REPORT.md against this clone

Measured with a node read of the committed JSON at this commit (`SPOT_EXIT=0`). REPORT figures match.

| Claim in REPORT.md | Measured here |
|---|---|
| entries 10089 | 10089 |
| paint slots 2494 | 2494 |
| derived, no paint slot 7595 | 7595 |
| sheets 207 (ATLAS 26, RMMZ_CHARACTER 172, RMMZ_TILESET 9) | 207, same split |
| largest atlas ATLAS_SURFACE_SHARED_TILE_01 4080x2592, largest side 4080 | same; no atlas side over 4096; no atlas side off the 48 grid |
| outOfScope 243 | 243 |
| sources pinned 55 | 55 |
| statuses MISSING 9792, EXISTING_UNAPPROVED 196, STAND_IN 52, STOCK 49, APPROVED 0 | same |
| scale rows STRIP+REGISTRY 17, REGISTRY_ONLY 22, RMMZ_SPEC 6, GEOMETRY 17 | same; no other `source` |
| catalogue.json sha256 eb5a0fc1ebbf28b8c07ada4ef85b984950f8c7cea840af37f3f61570ec3e727c | same |
| conflicts.md `wc -l` 133, test split 134 | split on `\n` is 134; file ends in a newline so a `wc -l` count is 133 |
| Owner questions 25 | 25 distinct `Q-*` marks, same ids as REPORT § Owner questions |
| coverage 246/246, 36/36, 18/18, 49/49, 65/65 | gate line above |
| `--check` OK and one UNVERIFIED_ABSENT warning | gate output above |
| 47/47 | gate output above |

Schema contract (`deus-art-catalogue/1.1.0`):

- `catalogue.schema.json` `$schema` is `https://json-schema.org/draft/2020-12/schema` and `$id` is `deus-art-catalogue/1.1.0`. `catalogue.json` `schemaVersion` is that id and `tileSizePx` is 48.
- `geometry.json` matches the frozen numbers: `squareFt` 5, `layerFt` 10, `strataPerLayer` 5, `stratumFt` 2, `layerCount` 32, `zMin` -16, `zMax` 15, `tilePx` 48, `layerPx` 96, `stratumPx` [19,19,19,19,20], `humanPx` 42, `pxPerFootCreature` 7. Frame classes match the brief, including `LARGE_TALL` [48,96], `LARGE_LONG` [96,48] `PROPOSED`, and `HUGE` / `GARGANTUAN` `frame: null`, `OWNER_OPEN`, `future: true`. `TALL_MEDIUM.enabled` and `smallRaceReadabilityFloorPx.enabled` are false. Bands are LOWER2 -16..-9, LOWER1 -8..-1, SURFACE 0..3, UPPER1 4..9, UPPER2 10..15, each `ownerOpen: true`. Band display names are the names already in `docs/OWNER_DECISIONS.md`.
- Entry `required` is the frozen field list. Nothing frozen is missing and nothing extra is required on entries. `scaleRow` is null on 0 entries.
- Added fields are listed in `docs/art/catalogue/SCHEMA.md`, including `outOfScope[].kind` and scale row `RMMZ_FACE_144`. That face row is 144x144 and cites `docs/RMMZ_ASSET_SPEC.md` §4 (cell size 144×144). `RMMZ_AUTOTILE_A1` and `A2` are both 96x144, matching the spec rows for A1 and A2.
- The gate `geometry_stratum_changes_slots` line shows a skewed `stratumPx` changes strip, wall, and ramp slot heights, and a reorder changes target heights. `geometry_no_literal_layer_count` reports 0 lines with a literal 9 or 32 in `build_catalogue.js`.
- `conflicts.md` line 3 says `Nothing here is resolved`. The only match for "resolved" in that file is that sentence. The 25 Owner questions are asked there and copied into REPORT.md.

Provocation spot-check (code since `51d3915a` is unchanged, so the committed `provocations.txt` still describes this tree). Two checks re-run here:

`UF_TEST_PROVOKE=catalogue.coverage node tools/art/test_catalogue.js`

```
FAIL catalogue.coverage: WorldCatalog ids 245/246; brief anchor/ui/eq/face ids 35/36; manifest rows 18/18; open AR rows 49/49; addendum family x band cells: 65/65; uncovered: catalog:objects:oak, brief:SEG-01:anchor_tree

46/47 checks passed (provoked: catalogue.coverage)
EXIT=1
```

`UF_TEST_PROVOKE=catalogue.no_image_data node tools/art/test_catalogue.js`

```
FAIL catalogue.no_image_data: image files under art/catalogue, docs/art/catalogue, tools/art/fixtures/catalogue: 1 (art/catalogue/provoked.png); outputs with embedded image data: 0

46/47 checks passed (provoked: catalogue.no_image_data)
EXIT=1
```

The other lines in both runs were the same PASS lines as the gate. Each provocation failed only its own check. Porcelain stayed empty, so the provoked image name was not written.

The other 45 provocations were not re-executed in this review. Their FAIL lines are in `tasks/WG.20.02/lane-s/evidence/provocations.txt`, produced from the same builder and test (`git diff --name-only 51d3915af6beee1476c5b78df76b7c23dceb6a01 65c37d3b0d76127dfb56bc4e1e7ff80b6f533fdb` lists no file under `tools/art/` or `art/catalogue/`).

Pinned-source note from REPORT known problem 1. This review did not merge and did not re-run `--check` on a merged tree. It did measure that the cited file differs from current `origin/main`:

```
git rev-parse origin/main
9f9954e579ffc20d8850420d67f1a0127f776b43
ORIGIN_MAIN_EXIT=0
git hash-object docs/worldgen/DEUS_WORLDGEN_WBS.md
6366ba1af336c575981ac82462d91a68b0df22f8
HASH_OBJECT_EXIT=0
git rev-parse origin/main:docs/worldgen/DEUS_WORLDGEN_WBS.md
514a3d0fe6fde091be4b3e844123142be9c6443d
MAIN_BLOB_EXIT=0
```

`catalogue.json` pins `docs/worldgen/DEUS_WORLDGEN_WBS.md` at sha256 `50c7dae4fdad6bbf431e4669a16bae77451b987e15e7787a717e2a0c24500f3d`. `--check` passes on this commit. The writer’s report already says a later main edit of that file makes a merged `--check` fail until the catalogue is rebuilt. That matches the blob difference above. It is the pinning rule working, and the brief tells this lane not to merge.

## Art (DEC-007)

No image file is in the diff. A directory walk of `art/catalogue`, `docs/art/catalogue`, and `tools/art/fixtures/catalogue` found no `png`, `jpg`, `jpeg`, `gif`, `bmp`, `webp`, `tga`, `psd`, or `aseprite` file. The twelve generated outputs contain no `data:image`, `iVBORw0KGgo`, or `/9j/4AAQ` payload. The gate check `catalogue.no_image_data` passed. This review did not generate or request art.

## Findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

None.

VERDICT: CLEAN PASS
