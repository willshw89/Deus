# ART.GROUND.INDUCT lane-cy2 review (grok)

Reviewed commit `5703d10926c6a1c6737c3739370beba14b71c1d6` on `task/lane-cy2` (the worktree `HEAD` at review time). Writer family codex. This tip is the prior review of `ec55f2d72faa2c8f23651653479a71a048b27cd3`; the sheets and the checks under review are that writer's tree.

```text
git rev-parse HEAD
5703d10926c6a1c6737c3739370beba14b71c1d6

git log --format="%h %an | %s" origin/main..HEAD
```

That range was taken before `git fetch origin`. It listed the branch:

```text
5703d109 deus-grok | [grok] ART.GROUND.INDUCT lane-cy2 review: review_grok_ec55f2d7.md (VERDICT: CLEAN PASS)
ec55f2d7 deus-codex | [codex] ART.GROUND.INDUCT place Owner base grasses
5cd00b0d deus-pm | [pm] lane-cy2 brief: meadow and tropical grass are placed from the Owner masters (clarifies 'unchanged'; Grok REJECT of f35297c6)
0a6ca0f2 deus-grok | [grok] ART.GROUND.INDUCT lane-cy2 review: review_grok_f35297c6.md (VERDICT: REJECT)
f35297c6 deus-codex | [codex] ART.GROUND.INDUCT place full ground table and load D sheet
73fffbb8 deus-gemini | [ops] ART.GROUND.INDUCT lane-cy2 launch prompt 20261001_173423 (writer codex)
86c51fd9 deus-codex | [codex] ART.GROUND.INDUCT: place 2026-10-01 ground sets
88c67d1a deus-ops | [ops] ART.GROUND.INDUCT lane-cy2 launch prompt 20261001_161100 (writer codex)
a9f78cd0 deus-ops | [ops] ART.GROUND.INDUCT lane-cy2 launch prompt 20261001_161017 (writer codex)
a5255704 deus-pm | [pm] Open lane-cy2 (ART.GROUND.INDUCT re-cut): the Owner's 43 kept ground sets only; no Map001 demo, no Tilesets reformat
```

After fetch, `origin/main` is `ee38f9bc1d63d3b646b0af4d873a1acdc5716754` (`Merge task/lane-cy2 at 5703d10926c6a1c6737c3739370beba14b71c1d6 (ART.GROUND.INDUCT lane-cy2) via merge_gate`). `git log origin/main..HEAD` is empty because this tip is already on main.

The two defects from `86c51fd9` stay fixed. Meadow and tropical grass are the Owner masters, cut the same way lane-cy cut them, and they differ from `f35297c6` and from the pre-merge sheet. The specimen gate does not pass against current `origin/main`. That is a blocker.

## 1. Scope

At the start of the review, `git merge-base origin/main HEAD` was `eb1c1c9dc5757545dc30f60cc84b3669a5d65ba6`. After fetch, the same command prints the tip, and the required name-status command is empty:

```text
git fetch origin
FETCH_EXIT:0

git merge-base origin/main HEAD
5703d10926c6a1c6737c3739370beba14b71c1d6

git diff --name-status $(git merge-base origin/main HEAD) HEAD
NAMESTATUS_DONE
```

The lane's changes are the diff from that earlier base. `git diff --name-status eb1c1c9dc5757545dc30f60cc84b3669a5d65ba6 HEAD` prints 113 paths. Every path matches `tasks/ART.GROUND.INDUCT/lane-cy2/lane.json` `allowedPaths` (exact file, or a directory prefix ending in `/**`). `game/data/Map001.json` is absent. A path check over that list reported `SCOPE paths=113 outside=0`.

```text
M | art/catalogue/catalogue.json
A | art/masters/source_sets/ALL_SHARED_TERRAIN_CAVE-FLOOR_A2_DEFAULT/manifest.json
A | art/masters/source_sets/ALL_SHARED_TERRAIN_CAVE-FLOOR_A2_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_DIRT-BASE_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_DIRT-BASE_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_DIRT_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_DIRT_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_DIRT_V3_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_DIRT_V3_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_DRY-GRASS-BASE_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_DRY-GRASS-BASE_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_DRY-GRASS_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_DRY-GRASS_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_FOREST-FLOOR-BASE_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_FOREST-FLOOR-BASE_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_FOREST-FLOOR-DRY_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_FOREST-FLOOR-DRY_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_FOREST-FLOOR_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_FOREST-FLOOR_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_MEADOW_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_MEADOW_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_MEADOW_V1_DEFAULT/variant_1.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_MEADOW_V1_DEFAULT/variant_2.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_MEADOW_V1_DEFAULT/variant_3.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_MEADOW_V1_DEFAULT/variant_4.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_MEADOW_V1_DEFAULT/variant_5.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_MUD-DAMP_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_MUD-DAMP_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_MUD_V2_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_MUD_V2_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_MUD_V3_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_MUD_V3_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_NEEDLE-FLOOR-BASE_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_NEEDLE-FLOOR-BASE_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_NEEDLE-FLOOR-DRY_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_NEEDLE-FLOOR-DRY_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_NEEDLE-FLOOR_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_NEEDLE-FLOOR_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_PEAK-ROCK-BASE_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_PEAK-ROCK-BASE_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_ROAD_A2_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_ROAD_A2_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_ROCK-BASE_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_ROCK-BASE_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_ROCK-DRY_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_ROCK-DRY_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_ROCK_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_ROCK_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SAND-BASE_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SAND-BASE_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SAND_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SAND_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SAND_V3_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SAND_V3_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SCREE-BASE_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SCREE-BASE_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SCREE-DAMP_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SCREE-DAMP_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SCREE-DRY_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SCREE-DRY_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SHRUB-SOIL-BASE_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SHRUB-SOIL-BASE_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SHRUB-SOIL-DAMP_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SHRUB-SOIL-DAMP_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SHRUB-SOIL-DRY_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SHRUB-SOIL-DRY_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_STONY-BASE_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_STONY-BASE_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_STONY-DAMP_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_STONY-DAMP_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_STONY_V3_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_STONY_V3_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SWAMP-MUD-DAMP_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_SWAMP-MUD-DAMP_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_TROPICAL-GRASS_V1_DEFAULT/manifest.json
A | art/masters/source_sets/SURFACE_SHARED_TERRAIN_TROPICAL-GRASS_V1_DEFAULT/variant_0.png
A | art/masters/source_sets/UNDERGROUND_FLOOR_MINED-STONE_A2_DEFAULT/manifest.json
A | art/masters/source_sets/UNDERGROUND_FLOOR_MINED-STONE_A2_DEFAULT/variant_0.png
M | docs/art/catalogue/BAND_ALL.md
M | docs/art/catalogue/BAND_SURFACE.md
M | docs/art/catalogue/INDEX.md
M | game/data/Tilesets.json
A | game/img/tilesets/DEUS_GroundVar_D.png
M | game/img/tilesets/Dungeon_A2.png
M | game/img/tilesets/Outside_A1.png
M | game/img/tilesets/Outside_A2.png
M | game/img/tilesets/Outside_D.png
A | tasks/ART.GROUND.INDUCT/lane-cy2/BRIEF.md
A | tasks/ART.GROUND.INDUCT/lane-cy2/DEUS_GroundEvidence.js
A | tasks/ART.GROUND.INDUCT/lane-cy2/REPORT.md
A | tasks/ART.GROUND.INDUCT/lane-cy2/WRITER_REPORT.md
A | tasks/ART.GROUND.INDUCT/lane-cy2/evidence/new_game_damp_dry_fix_2x.png
A | tasks/ART.GROUND.INDUCT/lane-cy2/evidence/new_game_ground_kinds_fix_2x.png
A | tasks/ART.GROUND.INDUCT/lane-cy2/evidence/outside_a2_all_32_2x.png
A | tasks/ART.GROUND.INDUCT/lane-cy2/evidence/snapshot_results_fix.txt
A | tasks/ART.GROUND.INDUCT/lane-cy2/evidence/source_solid_pairs_2x.png
A | tasks/ART.GROUND.INDUCT/lane-cy2/lane.json
A | tasks/ART.GROUND.INDUCT/lane-cy2/launches/20261001_161017_prompt.txt
A | tasks/ART.GROUND.INDUCT/lane-cy2/launches/20261001_161100_prompt.txt
A | tasks/ART.GROUND.INDUCT/lane-cy2/launches/20261001_173423_prompt.txt
A | tasks/ART.GROUND.INDUCT/lane-cy2/new_game_damp_dry_2x.png
A | tasks/ART.GROUND.INDUCT/lane-cy2/new_game_ground_kinds_2x.png
A | tasks/ART.GROUND.INDUCT/lane-cy2/regression_86.js
A | tasks/ART.GROUND.INDUCT/lane-cy2/render_ground_boards.js
A | tasks/ART.GROUND.INDUCT/lane-cy2/review_grok_ec55f2d7.md
A | tasks/ART.GROUND.INDUCT/lane-cy2/review_grok_f35297c6.md
A | tasks/ART.GROUND.INDUCT/lane-cy2/set_outside_d.js
A | tasks/ART.GROUND.INDUCT/lane-cy2/snapshot_results.txt
A | tasks/ART.GROUND.INDUCT/lane-cy2/source_solid_board.png
A | tools/art/ground_kept_sets.json
A | tools/art/induct_all_ground_tiles.js
A | tools/art/test_ground_kept_sets.js
A | tools/art/verify_specimens_rgb.js
COUNT:113
```

Map001 blobs:

```text
git rev-parse HEAD:game/data/Map001.json
705c5d8d325106e42d76e1c66a945126438d3384
git rev-parse origin/main:game/data/Map001.json
705c5d8d325106e42d76e1c66a945126438d3384
```

Same hash. The file is byte-identical to current main.

`game/data/Tilesets.json` versus current `origin/main` is the same blob, `0344bccc723fcd8934a93ba1725e6cf773309121`, because the merge already brought this tip. Versus the branch-point blob `5b0a1279aca7eeacb4412497ef569fa2a69b6829` (that blob is also `13f78e2a:game/data/Tilesets.json` and `6eedfd33:game/data/Tilesets.json`, the two pre-merge main tips):

```text
baseLen 246718 headLen 246736 equal false
line 4 base 41125 head 41134
 at 41118 base "...Outside_C\",\"\",\"\"]}," head "...Outside_C\",\"Outside_D\",\"\"]},"
line 6 base 41115 head 41124
 at 41108 base "...Dungeon_C\",\"\",\"\"]}," head "...Dungeon_C\",\"Outside_D\",\"\"]},"
id 2 baseNames7 "" head "Outside_D"
id 4 baseNames7 "" head "Outside_D"
```

Parsed field diffs against `eb1c1c9d`:

```text
[2].tilesetNames[7] "" -> "Outside_D"
[4].tilesetNames[7] "" -> "Outside_D"
```

Both files are RMMZ's one object per line: 9 lines, no CRLF, no newline at end of file. Lines 4 and 6 are ids 2 and 4. No other field differs.

## 2. Owner grasses and the set table

`git diff --stat origin/task/lane-cy HEAD -- art/masters/source_sets/SURFACE_SHARED_TERRAIN_MEADOW_V1_DEFAULT art/masters/source_sets/SURFACE_SHARED_TERRAIN_TROPICAL-GRASS_V1_DEFAULT` is empty. Both folders match lane-cy, including `variant_0.png`.

Rebuilding with `buildA2Block` and lane-cy's edge colors (`#26421C` / `#5D7139` and `#1B3B18` / `#6E8A38`):

```text
SLOT0 equals master block true
SLOT1 equals master block true
SLOT0 equals lane-cy true
SLOT1 equals lane-cy true
SLOT0 equals f35297c6 false
SLOT1 equals f35297c6 false
DSW0 equals meadow master true
DSW1 equals tropical master true
DSW0 equals lane-cy true
DSW1 equals lane-cy true
DSW0 equals f35297c6 false
DSW1 equals f35297c6 false
outside equals pre-merge main 13f78e2a slots 16
D sw0 equals pre-merge false
D sw1 equals pre-merge false
outside differs f35297c6 slots 0,1
D swatch differs from f35297c6 0,1
SLOT0 equals main true
SLOT1 equals main true
DSW0 equals main true
DSW1 equals main true
```

Slots 0 and 1 and D swatches 0 and 1 are the Owner masters. They differ from `f35297c6` and from pre-merge main `13f78e2a` (Outside A2 blob `08b366ef2f669085f0a7b77dd9a962f3d88bdc4e` on `eb1c1c9d`, `13f78e2a`, and `6eedfd33`). The only Outside slot still equal to that pre-merge sheet is slot 16. They are byte-identical to current `origin/main` because that main merged this tip. `DEUS_GroundVar_D.png` equals `Outside_D.png`. `Dungeon_A2.png` equals `f35297c6`. Slots 2–31 are unchanged from `f35297c6`.

Opened at nearest-neighbor 2x, and the two masters at 8x. The meadow master is detailed olive grass with small blue flowers and pale pink-white flowers. Outside A2 slot 0 is that tile inside the autotile, flowers still visible inside the dark edge ring. D swatch 0 is the same master tile. The tropical master is dense green leaves with dark red berries. Slot 1 is that tile as an autotile, and D swatch 1 is the raw master.

Set table. All 34 selected rows are in `tools/art/ground_kept_sets.json` with the brief's id and fillTile. Each source PNG exists in exactly one backup folder (`PROV bad=0 selected=34 allowed=36`). The 13 rows marked new, plus the two unused alternatives `248a876d` and `ba56457f`, are only under `C:/Users/snewt/DEUS_backups/pixellab_2026-10-01/tiles_pro`. The older rows are only under `C:/Users/snewt/DEUS_backups/pixellab_2026-09-30/tiles_pro`. Chosen solid versus the other solid: for every selected id the chosen tile is the named ground and the other solid is the greener partner (or, for road and mined stone, the other terrain). `sand_damp` tile 0 is tan `rgb(183,167,124)` and tile 15 is green `rgb(102,128,76)`.

Every Outside A2 slot the table maps is opaque (`transparent=0/13824`). Slot 16, `swamp_mud_base`, is fully transparent (`13824/13824`) and equals the pre-lane block. That row has no set.

Variants with no set of their own:

- Outside slot 6 `dry_grass_dry` equals slot 2, the `dry_grass_base` block (`a7bfcf27` tile 0). `STAND slot6 equals slot2 true`.
- Dungeon slots 3 and 4 equal each other and equal Outside slot 14, the `peak_rock_base` block (`38ff1be9` tile 0).
- Dungeon slot 6 `swamp_mud_dry` equals the stock block (opaque near-black, `rgb(5,5,5)`).
- Dungeon slot 1 `dug_earth` equals the stock brick floor.

The 16 deleted ids are absent from `tools/art/induct_all_ground_tiles.js` and `tools/art/ground_kept_sets.json` (`DELETED in converter=` empty, `DELETED in kept json=` empty). `git grep` of `0c163850` in `art/masters`, the converter, and the kept-set file exits 1. The ids are named in the brief and in the denylist inside `tools/art/test_ground_kept_sets.js`. The converter does not open those files.

## 3. Sheets at 2x

Opened nearest-neighbor 2x copies of `game/img/tilesets/Outside_A2.png` (768x576), `Dungeon_A2.png` (768x576) and `Outside_D.png` (768x768), plus each A2 row and the used D swatches at 4x.

Outside A2, eight columns by four rows. Every placed block has the converter's dotted autotile edge and a circular corner marker. Slot 0 is the flowered meadow. Slot 1 is the berry leaves. Row 0 continues as tan dry grass, brown soil with green flecks, dark leaf litter, darker needle litter, the same tan dry grass again (the dry stand-in), and a darker olive damp grass. Row 1 is pale tan dry shrub soil, medium brown damp soil, very pale sand, reddish soil with pebbles, dark brown soil with pebbles, light gray rock, dark blue-gray cracked peak rock, and medium brown marsh mud. Row 2 starts with a fully empty black cell (slot 16). Then dark dirt, medium dirt, light dirt, very dark leaf litter, gray cobbles, a flat tan road, and brown leaves. Row 3 is wavy tan sand, pale sand, dark cobbles, light cobbles, dark cracked rock, smooth light gray rock, brown mud with pebbles, and near-black soil with green moss specks. Slot 16 is the only empty Outside cell.

Seams that are in the placed art, matching notes already in the brief: the cobble pattern on scree base, damp, and dry breaks across the tile; forest-floor dry's leaves do the same; rock base, rock damp, and the cracked peak show the crack grid meeting the tile edge; mined stone's dungeon block has a hard vertical division. Those are the source sets the brief already flags.

Dungeon A2 row 0: light gray cave pebbles, then the stock brick floor (dug earth, a different drawing from the new blocks), gray mined rock with that vertical division, two copies of the dark cracked peak rock, flat tan-gray stony dry, an opaque black cell (swamp mud dry, the stock block), and brown marsh mud. Row 1: cracked gray rock, darker cracked rock, smooth light gray rock, dark dirt, medium dirt, pale sand, wavy tan sand, gray cobbles. Rows 2 and 3 are the stock lower half, byte-identical to the pre-lane sheet: brown dirt, an orange cliff face, gray stone brick, and dark rough rock, the four-pattern group repeated on each row. No empty cell in those rows.

Outside D is empty black except 48px swatches in the top left. Swatch 0 is the flowered meadow. Swatch 1 is the berry leaves. The rest are the placed solids: dry grass, soils, litter, sand, pebbles, cracked rock, mud, cobbles, the tan road, gray cave, and one gray mined-stone swatch. Black gaps sit where the gallery index is unassigned (between marsh-mud dry and swamp-mud damp, between swamp-mud damp and dirt, and between cave floor and mined stone). The rest of the 768x768 sheet is empty.

## 4. Gate tests

Each command was run in the foreground in this worktree, one at a time.

```text
node tools/check_deus_syntax.js
Checked 62 DEUS plugin files. Errors: 0
EXIT:0

node tools/art/verify_specimens_rgb.js
[FAIL] Outside_A2.png slot 0 still equals origin/main
EXIT:1

node tools/art/test_ground_kept_sets.js
[OK] 34 table sets, two alternatives, deleted-ID exclusion and master sidecars
[OK] Map001 Git blob byte-identical to a5255704
[OK] Tilesets 2/4 load Outside_D; diff touches only those two one-line entries and their D names
EXIT:0

node tools/art/build_catalogue.js --check
WARN UNVERIFIED_ABSENT reference/u7_shapes_0_31.png (untracked third-party reference not present in this checkout)
CHECK: OK (12 generated files match)
EXIT:0

node tools/art/test_catalogue.js
50/50 checks passed
EXIT:0
```

`verify_specimens_rgb.js` reads `origin/main:game/img/tilesets/Outside_A2.png` and fails when slot 0 or 1 equals that sheet. Current `origin/main` is the merge of this tip, so the slot equals itself.

### 4b. The same checks on older files

In this worktree, `git checkout 86c51fd9 --` replaced `game/img/tilesets/Outside_A2.png`, `Dungeon_A2.png`, `Outside_D.png`, `DEUS_GroundVar_D.png`, and `game/data/Tilesets.json` with that commit's blobs. The tip's scripts were run against those files. The same five paths were then replaced from `f35297c6` for the grass check. After both runs, `git restore --staged --worktree --` those paths; the working-tree hashes of the three sheets that differed match `HEAD` again (`Outside_A2.png` `a37011d77c51b9d166ba72580b09abcd662f060b`, `Outside_D.png` and `DEUS_GroundVar_D.png` `8ac8b4bbda220504ec76677e9538bf443e233b5e`).

```text
node tools/art/verify_specimens_rgb.js
[FAIL] Outside_A2.png slot 4 fully transparent
VERIFY_EXIT:1

node tools/art/test_ground_kept_sets.js --only=tilesets
[FAIL] Tilesets 2 D sheet must be Outside_D and be the only name change
TILESETS_EXIT:1
```

The specimen check against the `f35297c6` sheets:

```text
node tools/art/verify_specimens_rgb.js
[FAIL] Outside_A2.png slot 0 is not meadow
VERIFY_EXIT:1
```

The `86c51fd9` report's claim holds: both new checks fail on that commit's files. The grass check fails on `f35297c6` and does not pass on this tip.

## 5. Merge with origin/main

```text
git fetch origin
FETCH_EXIT:0

git merge-tree --write-tree origin/main HEAD
b15097af8e6ca1336b5fc11259df54f2a9168cdf
MERGE_TREE_EXIT:0
```

## Findings

**BLOCKER.** `node tools/art/verify_specimens_rgb.js` exits 1 with `[FAIL] Outside_A2.png slot 0 still equals origin/main`.

The check requires Outside A2 slots 0 and 1, and Outside D swatches 0 and 1, to differ from `origin/main`. Those four placements are the Owner masters (section 2), and they differ from pre-merge main `13f78e2a` and from `f35297c6`. They equal current `origin/main` because `ee38f9bc` merged this tip. The gate compares against the live `origin/main` ref, so it fails once the sheet is on main. The other four gate commands exit 0.

VERDICT: REJECT
