# OPS.30.06 lane-ai report

Writer: grok. Branch: `task/lane-ai`. No art was generated (DEC-007). No WBS id was minted. This lane does not self-certify; Gemini reviews later.

## Root cause

The catalogue pin was stale. `tools/art/build_catalogue.js` is deterministic and line-ending stable. A fresh build matches a second build byte for byte. The committed generated files had fallen behind three cited inputs whose text changed after the catalogue was last written.

Those outputs were last generated on lane-s:

| File | Last commit | When |
|---|---|---|
| `art/catalogue/catalogue.json` | `a3fd773d` | 2026-09-26 03:25 CT |
| `art/catalogue/conflicts.md` | `84189d54` | 2026-09-26 03:30 CT |
| `docs/art/catalogue/INDEX.md` | `b04382bb` | 2026-09-26 03:21 CT |

At `a3fd773d` the three source hashes stored in `catalogue.json` matched the files on that commit. Every later disagreement is an input edit that landed without a rebuild.

`catalogue.json` `sources[]` embeds a sha256 of each cited file. Text hashes normalize CRLF to LF before hashing (`build_catalogue.js` `hashFile`). `conflicts.md` and `INDEX.md` cite the first line that contains a literal phrase (`lineOf` / `conflict_claims.json`). When a cited document gains or loses lines above that phrase, the citation number moves. When the literal itself is gone, the builder writes `NOT FOUND` and the search text. That rule is stated in `art/catalogue/conflict_claims.json` (`about`).

### Which inputs moved

A fresh build against this worktree (parent `6b4f533c`, base `4ce80fa8`) differed from the committed pin in exactly three source hashes. The other 52 pinned sources matched.

| Path | Hash at the pin (`a3fd773d`, still stored before this lane) | Hash of the file now |
|---|---|---|
| `docs/OWNER_DECISIONS.md` | `ef626c0f27cb2493c27e7078ebabc260bcde9b37f833e204289a0b73a13bbeee` | `56980df554ad8433c40ced1fd75926f8df48e143f58a6754437d1b2972874028` |
| `docs/art/DEUS_WORLD_WBS.md` | `b2576c2fd4ee7051ced6dcf19796b1ac5915250f611bcd818a9dace5642ca536` | `186b722ac92bdbf553f28d5ee57105095114a52c01348860718e295cfe627eaf` |
| `docs/worldgen/DEUS_WORLDGEN_WBS.md` | `50c7dae4fdad6bbf431e4669a16bae77451b987e15e7787a717e2a0c24500f3d` | `0281b6b34039d4e5f21f3cf8f14422ad6e14fa44d99a7f59fa27d3e92b7e6a7e` |

`docs/VISION.md` also differs from its bytes at `a3fd773d`, and the family anchors in it stayed on the same lines (`intact -> weathered...` at line 132, the §19 cues at line 411). The builder records `VISION.md` only after it has already snapshotted `sources[]`, so that file's hash is not a catalogue pin. `INDEX.md` rows that cite it were already current.

### When the pin broke

Compared each commit's own `catalogue.json` pins to the files in that commit (LF-normalized sha256, same rule as the builder):

- `a3fd773d`: all three hashes match. The ST-01 find literal (DW.01.06 wrapped in backticks) is on `docs/art/DEUS_WORLD_WBS.md:84`.
- `9cba41ea` (merge of lane-s, WG.20.02): `docs/worldgen/DEUS_WORLDGEN_WBS.md` already hashes differently (prefix `c6f4cf11e0f3` versus pin `50c7dae4fdad`). The WG.20.01 + WG.20.02 art-catalogue row moves 678 → 679 and the OD-17 DW.01.06 autotile-standard row moves 718 → 719. The art WBS and `OWNER_DECISIONS.md` still match. The committed catalogue was already stale at the merge, because main's worldgen WBS was not the file lane-s had hashed.
- `fb5391fa` / `176bffe4`: the recorded failure. `OWNER_DECISIONS.md` has diverged (edge/ramp anchors 278 → 281 and 289 → 292). The worldgen WBS has diverged further. The art WBS still matches, and the ST-01 find literal is still line 84. `176bffe4` says the lane-x merge gate failed on this pre-existing main pin (`test_catalogue` 46/47, `build_catalogue.js --check` failing on `fb5391fa`).
- `0536d392` corrupts `docs/art/DEUS_WORLD_WBS.md` (the DW.01.06 literals are absent). `b9abee29` restores them, including the ST-01 find literal at line 84.
- `9c0e7b57` drops that find literal again. The row is now a bold DW.01.06 cell (line 35 there) and a new legacy crosswalk cell (line 87 there). `8325325d` moves that legacy cell to line 90. Later decision/WBS edits (`894e9a61`, `605cff06`, and the commits between `fb5391fa` and those) keep shifting the other anchors.

This worktree has `core.autocrlf=false`. `art/catalogue/.gitattributes` and `docs/art/catalogue/.gitattributes` set `* text eol=lf`. The three drifted files had zero CRLF both on disk and in the fresh build. Run 1 and run 2 of the builder were identical before and after the rebuild. The failure mode is stale generated text after input edits.

### What the fresh build changed, and why that is the whole diff

Structural compare of the fresh `catalogue.json` to the committed one, before this lane's rebuild: entries 0 diffs, sheets 0 diffs, `outOfScope` 0 diffs. The only catalogue field diffs were the three sha256 values in the table above. Counts stayed 10089 entries, 207 sheets, 243 outOfScope.

Nine other generated files were already byte-identical to a fresh build: `scale_chart.json`, `size_classes.json`, `references.json`, and `BAND_ALL.md`, `BAND_LOWER1.md`, `BAND_LOWER2.md`, `BAND_SURFACE.md`, `BAND_UPPER1.md`, `BAND_UPPER2.md`.

`docs/art/catalogue/INDEX.md` changed in four cells, all line numbers, counts unchanged:

| Family | Was | Now |
|---|---|---|
| EDGE, SHADE, TOP | `docs/OWNER_DECISIONS.md:278` | `docs/OWNER_DECISIONS.md:283` |
| RAMP | `docs/OWNER_DECISIONS.md:289` | `docs/OWNER_DECISIONS.md:294` |

`art/catalogue/conflicts.md` stayed 134 lines. Ten lines changed. Nine of them are the same sentences with the anchor line updated:

| Anchor | Was | Now |
|---|---|---|
| `The 25 pipeline biomes are partitioned into 5 vertical bands` | `docs/OWNER_DECISIONS.md:186` | `:188` |
| `Biome Assignment per Band` | `docs/OWNER_DECISIONS.md:195` | `:197` |
| DEC-016 strip-vs-registry cite | `docs/OWNER_DECISIONS.md:234` | `:239` |
| `Exactly 9 races exist in the world` (PE-01) | `docs/OWNER_DECISIONS.md:184` | `:186` |
| WG.22.01–25 row | `docs/worldgen/DEUS_WORLDGEN_WBS.md:139` | `:151` |
| WG.20.01 row (NM-01) | `:134` | `:146` |
| WG.20.01 + WG.20.02 art-catalogue row (NM-02) | `:678` | `:703` |
| OD-17 DW.01.06 autotile-standard row (ST-01 side B) | `:718` | `:743` |

BI-01, BI-02 and NM-03 repeat those same anchors on later lines of `conflicts.md`.

The tenth line is ST-01 side A. The claim's find literal in `conflict_claims.json` is the table cell whose id is DW.01.06 wrapped in backticks. That literal was on line 84 at the pin and is absent now. The builder therefore cites `docs/art/DEUS_WORLD_WBS.md` as NOT FOUND and prints the missing search text. The same document still has a bold DW.01.06 row at line 35 (status AUTHORIZED (PAUSED AT GATE)) and a legacy crosswalk cell at line 90 (status AUTHORIZED / PAUSED AT GATE). Side B still resolves, at `docs/worldgen/DEUS_WORLDGEN_WBS.md:743`. Choosing which of the two remaining rows replaces the old literal is an Owner question (below). The claim contract already says a missing literal is reported as NOT FOUND, so the rebuild records that fact and leaves the find string as it was.

## What changed

Rebuilt with `node tools/art/build_catalogue.js` and committed the three drifted outputs. `git diff --stat` against the pre-rebuild pin:

```
art/catalogue/catalogue.json |  6 +++---
art/catalogue/conflicts.md   | 20 ++++++++++----------
docs/art/catalogue/INDEX.md  |  8 ++++----
3 files changed, 17 insertions(+), 17 deletions(-)
```

`tools/art/build_catalogue.js` and `tools/art/test_catalogue.js` are unchanged, and every existing assertion is unchanged. The rebuild adds no image, slot, or catalogue entry. The Owner's 12:12 CT slope/ramp slot flag was left for the WBS note Gemini is recording.

The builder needed no fix. Evidence it is EOL-stable: in a throwaway clone (`git clone -c core.autocrlf=false`, deleted before the report commit), 55 text inputs were rewritten to CRLF (every pinned source except `art/palette/uf.hex`, which is already 256 CRLF lines in this checkout, plus `docs/VISION.md`). `node tools/art/build_catalogue.js --check` still printed `CHECK: OK (12 generated files match)`.

## Evidence

Worktree before the rebuild: `core.autocrlf=false`, `eol=lf` on the catalogue paths, zero CRLF in the three drifted files. Fresh build `BUILD: OK (10089 entries, 207 sheets, 243 outOfScope, 12 files written)` with the single pre-existing warning `UNVERIFIED_ABSENT reference/u7_shapes_0_31.png` (the third-party reference is absent; this lane did not add that file).

LF checkout of this branch at the rebuild commit `b06cd26e`, clone under `%TEMP%` with `core.autocrlf=false`: the three regenerated files had zero CRLF, `build_catalogue.js --check` exited 0 (`CHECK: OK (12 generated files match)`), and `test_catalogue.js` exited 0 (`47/47 checks passed`, `catalogue.json` sha256 prefix `6019c043c20248f8`). The clone was deleted before this report commit.

Gate commands below were run in this worktree on commit `b06cd26e` (regenerated outputs committed, this report not yet committed). Exits: 0, 0, 0.

### `node tools/art/test_catalogue.js`

```
PASS catalogue.schema: $id deus-art-catalogue/1.1.0; unsupported keywords 0; 10089 entries, 207 sheets: 0 schema errors; broken copy rejected with 2 errors
PASS catalogue.entry_fields: 10089 entries checked; 0 bad
PASS catalogue.rebuild_identical: 12 outputs; run1 vs run2 differ: none; fresh build vs committed differ: none; catalogue.json sha256 6019c043c20248f8...
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
```

### `node tools/art/build_catalogue.js --check`

```
WARN UNVERIFIED_ABSENT reference/u7_shapes_0_31.png (untracked third-party reference not present in this checkout)
CHECK: OK (12 generated files match)
```

### `node tools/check_deus_syntax.js`

```
Checked 52 DEUS plugin files. Errors: 0
```

## Open Owner questions

Listed only. This lane does not answer them.

1. Slope/ramp slot flag, Owner 12:12 CT. The brief says Gemini is recording it in the WBS. This lane added no slope or ramp entries.
2. ST-01's art-WBS anchor. The find literal (a table cell whose id is wrapped in backticks: DW.01.06) is gone from `docs/art/DEUS_WORLD_WBS.md` as of `9c0e7b57`. Two rows remain: line 35, bold DW.01.06, status AUTHORIZED (PAUSED AT GATE); and line 90, legacy DW.01.06, status AUTHORIZED / PAUSED AT GATE. Which row should the claim cite? Until that is chosen, the generated conflicts line stays NOT FOUND for side A, which is what the existing claim contract specifies.

## PROPOSED-AI-NN follow-ups

- PROPOSED-AI-01: After the Owner names the successor row for ST-01, update that claim's `find` in `art/catalogue/conflict_claims.json` and rebuild `conflicts.md`.
- PROPOSED-AI-02: Rebuild the catalogue in the same change that edits a file listed in `catalogue.json` `sources[]`. The pin was already stale at the lane-s merge `9cba41ea` and was still stale when `fb5391fa` / `176bffe4` recorded `test_catalogue` 46/47.
