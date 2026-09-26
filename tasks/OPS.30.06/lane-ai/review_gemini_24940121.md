# OPS.30.06 Independent Review: Catalogue test repair / pin rebuild

**Reviewer:** Gemini (Independent Reviewer)  
**Lane:** `lane-ai`  
**Task ID:** `OPS.30.06`  
**Writer:** Grok  
**Reviewed SHA:** `24940121652cc06ff11575608dc44a806257af99`  

---

## 1. Commit and Branch Verification

### Git Rev-Parse and Log Confirmation
```
git rev-parse HEAD origin/task/lane-ai
24940121652cc06ff11575608dc44a806257af99
24940121652cc06ff11575608dc44a806257af99
```

```
git log -12 --format="%H %an %s"
24940121652cc06ff11575608dc44a806257af99 deus-grok [grok] OPS.30.06 record the catalogue pin repair
b06cd26e05723099e0881da9b9f72bcfc4b82f6e deus-grok [grok] OPS.30.06 regenerate the stale catalogue pin
6b4f533ca4a167c747535dd918a53975c9eaa7aa deus-pm [pm] Open lane-ai (OPS.30.06): BRIEF.md and lane.json
4ce80fa8b1844ff2eeae86dc437a0d9e1aa25871 deus-pm [gemini] STATUS: record Lane AB merged at 343191b5 per Directive 0088-CK
a3b3ed0052bfe9f52f1996abfe5ade2d7ab0befc deus-pm [pm] Register write-set claim for Lane AH (SIM.60.06 combat stress benchmark)
343191b5557d6943524792820c23bdc19238e7e4 deus-pm Merge task/lane-ab: SIM.60.05 SRD 5.1 combat rules engine FIX1 (PM merge; Gemini VERDICT CLEAN PASS at b1a612e83e822804a2bdcce1db5932cfea3dd8c3 / tip f0544dfd; writer grok FIX1 b1a612e8)
fb4c1a210d94a5397aeaff3d987f1ea81406452b snewt [gemini] STATUS: update lane states for merged AC/Z/Y and AB review CLEAN PASS
f0544dfd63b65f8a735ddbd43b750450cb36c857 deus-gemini [gemini] SIM.60.05 review b1a612e8 (FIX1 re-review)
33da622fe21a5c881b743c73dc3dd7c73185ac14 deus-pm Merge task/lane-y: OPS.30.01 run_gate + test_run_gate (PM merge; Grok VERDICT PASS at d07396bc / tip 57600187; writer claude tip d07396bc2b11881b7a36e05831d910b8c41e352b)
af729f62a5ff74c8f8b0892afe073771e119aabe deus-pm Merge task/lane-z: OPS.70.02 secret scanner + dependency checker (PM merge; Grok VERDICT PASS at a98d31c5 / tip 01726c93; writer claude tip a98d31c5)
5760018735d61d18b0de5fb8673a7740fe309b9d deus-grok [grok] OPS.30.01 review d07396bc (xhigh re-review)
b1a612e83e822804a2bdcce1db5932cfea3dd8c3 deus-grok [grok] SIM.60.05 FIX1 SRD hit points, species map, printed saves
```

---

## 2. Scope Verification

Merge-base against `origin/main`: `4ce80fa8b1844ff2eeae86dc437a0d9e1aa25871`.

### Changed Files
```
git diff --name-status 4ce80fa8b1844ff2eeae86dc437a0d9e1aa25871 24940121652cc06ff11575608dc44a806257af99
M	art/catalogue/catalogue.json
M	art/catalogue/conflicts.md
M	docs/art/catalogue/INDEX.md
A	tasks/OPS.30.06/lane-ai/BRIEF.md
A	tasks/OPS.30.06/lane-ai/REPORT.md
A	tasks/OPS.30.06/lane-ai/lane.json
```

### Scope Compliance Table

| Path | Status | In `lane.json` `allowedPaths`? | Forbidden Check |
|---|---|---|---|
| `art/catalogue/catalogue.json` | Modified | YES (`art/catalogue/*.json`) | PASS (JSON manifest text only; no images) |
| `art/catalogue/conflicts.md` | Modified | YES (`art/catalogue/*.md`) | PASS (Markdown report text only; no images) |
| `docs/art/catalogue/INDEX.md` | Modified | YES (`docs/art/catalogue/**`) | PASS (Markdown doc text only) |
| `tasks/OPS.30.06/lane-ai/BRIEF.md` | Added | YES (`tasks/OPS.30.06/**`) | PASS |
| `tasks/OPS.30.06/lane-ai/REPORT.md` | Added | YES (`tasks/OPS.30.06/**`) | PASS |
| `tasks/OPS.30.06/lane-ai/lane.json` | Added | YES (`tasks/OPS.30.06/**`) | PASS |

- Zero edits outside `allowedPaths`.
- Zero edits to `docs/STATUS.md`, WBS files, `docs/OWNER_DECISIONS.md`, `art/masters/**`, `art/templates/**`, or any image file.
- Zero tools modified (tools directory unmodified from merge base).
- DEC-007 compliance verified: no art generated, requested, or modified.

---

## 3. Gate Test Executions in Fresh Temporary Clone

Executed in fresh temporary clone at `$env:TEMP\uf_review_lane_ai_24940121` (`core.autocrlf=false`) detached at `24940121652cc06ff11575608dc44a806257af99`.

### Gate Test 1: `node tools/art/test_catalogue.js`
Raw Command: `node tools/art/test_catalogue.js`  
EXIT: `0`

Output:
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

### Gate Test 2: `node tools/art/build_catalogue.js --check`
Raw Command: `node tools/art/build_catalogue.js --check`  
EXIT: `0`

Output:
```
WARN UNVERIFIED_ABSENT reference/u7_shapes_0_31.png (untracked third-party reference not present in this checkout)
CHECK: OK (12 generated files match)
```

### Gate Test 3: `node tools/check_deus_syntax.js`
Raw Command: `node tools/check_deus_syntax.js`  
EXIT: `0`

Output:
```
Checked 52 DEUS plugin files. Errors: 0
```

---

## 4. Independent Verification and Spot Checks

### Claim 1: Determinism and Multi-Build Stability
- Executed `node tools/art/build_catalogue.js` twice consecutively in the detached temporary clone.
- Both runs completed with EXIT: `0`.
- `git status --porcelain` showed 0 modified files after both builds; fresh build output matches second build byte-for-byte and matches committed files byte-for-byte.

### Claim 2: Line Endings and CRLF Stability
- Checked all 3 regenerated files (`art/catalogue/catalogue.json`, `art/catalogue/conflicts.md`, `docs/art/catalogue/INDEX.md`) on `core.autocrlf=false`.
- All 3 files contain 0 CRLF line endings (`has CRLF: false`).

### Claim 3: Explanation of Drifted Files and Pinned Hashes
Spot-checked LF-normalized SHA-256 hashes of cited inputs against values stored in `art/catalogue/catalogue.json`:
- `docs/OWNER_DECISIONS.md`:
  - Computed: `56980df554ad8433c40ced1fd75926f8df48e143f58a6754437d1b2972874028`
  - In `catalogue.json`: `56980df554ad8433c40ced1fd75926f8df48e143f58a6754437d1b2972874028` (MATCH: true)
- `docs/art/DEUS_WORLD_WBS.md`:
  - Computed: `186b722ac92bdbf553f28d5ee57105095114a52c01348860718e295cfe627eaf`
  - In `catalogue.json`: `186b722ac92bdbf553f28d5ee57105095114a52c01348860718e295cfe627eaf` (MATCH: true)
- `docs/worldgen/DEUS_WORLDGEN_WBS.md`:
  - Computed: `0281b6b34039d4e5f21f3cf8f14422ad6e14fa44d99a7f59fa27d3e92b7e6a7e`
  - In `catalogue.json`: `0281b6b34039d4e5f21f3cf8f14422ad6e14fa44d99a7f59fa27d3e92b7e6a7e` (MATCH: true)

Line citations in `docs/art/catalogue/INDEX.md` and `art/catalogue/conflicts.md`:
- `docs/OWNER_DECISIONS.md:283` matches DEC-019 item 4 (edge/cliff-face strips and height shading).
- `docs/OWNER_DECISIONS.md:294` matches DEC-020 item 3 (ramps and slopes as traversable connectors).
- `docs/worldgen/DEUS_WORLDGEN_WBS.md:146` matches WG.20.01.
- `docs/worldgen/DEUS_WORLDGEN_WBS.md:151` matches WG.22.01–25.
- `docs/worldgen/DEUS_WORLDGEN_WBS.md:703` matches Stage 1 art catalogue row.
- `docs/worldgen/DEUS_WORLDGEN_WBS.md:743` matches OD-17 DW.01.06 row.
- ST-01 search literal `| `DW.01.06` |`: Verified that `docs/art/DEUS_WORLD_WBS.md` no longer contains that exact literal (line 35 has `| **DW.01.06** |` and line 90 has `| Legacy `DW.01.06` |`), which properly triggers the documented `NOT FOUND ("| `DW.01.06` |")` fallback without error.

### Claim 4: Integrity of `rebuild_identical` Test
- Diff of `tools/` against merge-base `4ce80fa8` is completely empty. `tools/art/test_catalogue.js` and `tools/art/build_catalogue.js` were unmodified. The `rebuild_identical` check was not touched or weakened in any way.

### Negative Testing
- Restored stale pin `catalogue.json` from commit `6b4f533ca4a167c747535dd918a53975c9eaa7aa` into the temp clone:
  - `node tools/art/build_catalogue.js --check` immediately failed with EXIT: `1` (`CHECK: FAILED (1 file(s) differ from a fresh build)`).
  - `node tools/art/test_catalogue.js` failed with EXIT: `1` (`FAIL catalogue.rebuild_identical`, `46/47 checks passed`).
- Provocation test via `UF_TEST_PROVOKE=catalogue.rebuild_identical node tools/art/test_catalogue.js` properly failed with EXIT: `1`.

---

## 5. Findings

- **BLOCKER:** None.
- **MAJOR:** None.
- **MINOR:** None.

---

VERDICT: CLEAN PASS
