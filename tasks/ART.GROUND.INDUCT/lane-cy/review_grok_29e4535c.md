# Independent Grok review — ART.GROUND.INDUCT / lane-cy

- **Writer**: gemini
- **Reviewer**: grok
- **Reviewed commit**: `29e4535c47debc03a50914026f0e66e81afd0114`
- **Merge base**: `a3b2c3ed9dc497b50af63b6e4b8e2e627c4eea78`
- **Branch**: `task/lane-cy`
- **Worktree**: `C:\Users\snewt\.deus_worktrees\lane-cy`
- **Isolated clone**: `C:\Users\snewt\AppData\Local\Temp\lane-cy-review-clone` (detached at `29e4535c`)
- **Date**: 2026-09-30
- **Node**: v24.19.0
- **Authority**: DEC-034 independent cross-family review; `docs/CANONICAL_ROLES.md`; BRIEF `tasks/ART.GROUND.INDUCT/lane-cy/BRIEF.md`
- **Art**: no art generated this session (DEC-007). Existing PNGs were opened and described.

## 1. Identity

```text
git rev-parse HEAD
29e4535c47debc03a50914026f0e66e81afd0114

git merge-base HEAD origin/main
a3b2c3ed9dc497b50af63b6e4b8e2e627c4eea78

git log -3 --oneline
29e4535c [gemini] ART.GROUND.INDUCT: add reviewer brief for Grok
df0d03b6 [gemini] ART.GROUND.INDUCT: restore full tool implementations and meadow variants 1-5
52234374 [gemini] ART.GROUND.INDUCT induct all 42 PixelLab ground tiles and build F5 demonstration
```

Writer commits on this tip, in order: empty tool files plus tileset/map/source-set payloads (`52234374`); tool bodies plus meadow `variant_1`..`variant_5` (`df0d03b6`); reviewer brief (`29e4535c`).

## 2. Path boundary

`git diff --name-only a3b2c3ed HEAD` is entirely inside `lane.json` `allowedPaths`:

- `art/masters/source_sets/SURFACE_SHARED_TERRAIN_*` and `UNDERGROUND_FLOOR_*` (42 directories)
- `game/data/Map001.json`
- `game/data/Tilesets.json`
- `game/img/tilesets/Outside_A1.png`, `Outside_A2.png`, `Dungeon_A2.png`, `Outside_D.png`, `DEUS_GroundVar_D.png`
- `tools/art/induct_all_ground_tiles.js`, `verify_specimens_rgb.js`, `build_ground_demo_map.js`
- `tools/test_pixellab_ground_tiles_f5.js`
- `tasks/ART.GROUND.INDUCT/lane-cy/BRIEF.md`, `lane.json`

Zero `game/js/rmmz_*.js`. Zero Group 3 cliff/edge/ramp/A4 paths.

## 3. Gate tests (isolated clone, foreground)

Clone: `git clone -c core.autocrlf=false --local <worktree> <temp>` then `git checkout --detach 29e4535c`. Commands run with cwd = clone.

### `node tools/check_deus_syntax.js`

- **Exit**: 0
- **Output**: `Checked 62 DEUS plugin files. Errors: 0`

This lane does not edit plugins. The check is green on the tip.

### `node tools/art/verify_specimens_rgb.js`

- **Exit**: 0
- **Output**: 42 `[OK]` lines, then `All 42 specimens verified successfully.`

The 42 includes `dirt_dry` (`deb74b6c-92d9-41fe-a518-2ca4d09c78d4`, avg `[147, 113, 92]` from the PixelLab backup). The gate reads source files and prints mean RGB. It does not load `game/img/tilesets/*`, does not snap to `deus_master_world_palette_v1.hex`, and does not encode the DEC-056 NAY list.

## 4. Independent artifact checks (this session)

Opened and measured the committed sheets with `tools/png_read.js`. Looked at the six local F5 PNGs under `art/review/ground_f5_*.png` in the live worktree.

| Check | Result |
|---|---|
| `Outside_A2.png` | 768×576, 32/32 autotile blocks occupied, 0 off-palette pixels. Bayer-weighted circular A2 edges are visible on every block. |
| `Dungeon_A2.png` | 768×576, 16/32 blocks occupied (rows 0–1). Slots 0–2 match cave / dug-earth / mined-stone fills. |
| `Outside_D.png` / `DEUS_GroundVar_D.png` | Identical SHA-256 `d1911cda…`. 768×768. Occupancy is the left 8 columns × 6 rows, 42 cells (8+8+8+8+8+2). Right half empty. This is RMMZ dual-block (`rmmz_core.js` `_addNormalTile`: `sx = ((floor(id/128)%2)*8 + (id%8))*w`). |
| `Outside_A1.png` | SHA-256 identical to `art/stock_rmmz/Outside_A1.png`. Stock water restored. |
| Palette | Meadow, dirt-dry, full `Outside_A2`, and `Outside_D` opaque pixels: 0 off `deus_master_world_palette_v1.hex` (226 colours). |
| `Map001.json` | 50×40, `tilesetId` 2, `data.length` 12000, 6 signposts, 5 props. `System.json` already starts map 1 at (25, 20). Gallery layer-1 IDs 512–553 on y=38 line up with the dual-block occupancy. |
| `Tilesets.json` | Pretty-print of the merge-base blob (49267 insertions / 7 deletions). Flags arrays are byte-equal. Semantic change: tileset 2 D slot `""` → `"Outside_D"`; tileset 4 D slot `""` → `"Outside_D"`. |
| Props | `!Switch1`, `!UF_GraniteBoulder_V8`, `!UF_RocksSmall_V8`, `!UF_BerryBush_V8`, `!UF_FallenLog_V8`, `!$UF_Wildflowers` all exist under `game/img/characters/`. F5 zone-1 screenshot shows the berry bush, fallen log, and wildflowers on their patches. |
| F5 screenshots | Six files on the live worktree disk (2026-09-30 21:12–21:13). **Absent from `git ls-files` and from the isolated clone.** `.gitignore` line 30 is `/art/review/`. |

F5 frames at zoom 1.0×, inspected:

- `ground_f5_center_plaza.png`: meadow field, tan road cross and plaza, two `!Switch1` signs, sand SW, dark peat SE.
- `ground_f5_zone1_grasslands_nw.png`: distinct grass / shrub / forest / needle patches; berry bush, log, wildflowers seated on them.
- `ground_f5_zone2_earth_shore_sw.png`: dirt / sand / marsh / swamp patches and a stock-cyan A1 water basin.
- `ground_f5_zone3_rock_peaks_ne.png`: stony / scree / bedrock / peak-rock patches; small rocks and granite boulder.
- `ground_f5_zone4_subterranean_se.png`: cave, dug-earth, mined-stone D-stamps (hard 48 px repeat; the map is tileset 2 so Dungeon_A2 autotiles cannot draw here).
- `ground_f5_zone5_gallery_runway.png`: 48×48 D-sheet strip along the south road, many distinct swatches visible in the viewport.

## 5. Findings

### BLOCKER 1 — PM NAY `dirt_dry` (`deb74b6c`) is in the game

BRIEF Art Standards: exclude PM NAY sets `dirt dry deb74b6c` and `fresh water b95d8185`. `art/APPROVALS.md` 2026-09-30: Dirt dry `deb74b6c-92d9-41fe-a518-2ca4d09c78d4` is **PM NAY (DEC-056)** ("Pink and smooth: reads as a different material, not dry dirt. The dirt base stands in until run 1.11 passes.").

Evidence on this tip:

- `tools/art/induct_all_ground_tiles.js` specimen `dirt_dry` uses that PixelLab id, `fillTile: 0`.
- `OUTSIDE_A2_SLOTS` slot 19 is `dirt_dry`. Inner fill of A2 slot 19 vs `SURFACE_SHARED_TERRAIN_DIRT-DRY_V1_DEFAULT/variant_0.png` MSE 141 (vs dirt-base 1978).
- D-sheet index 34 (tile id 546) is in the y=38 gallery (`512..553`).
- `build_ground_demo_map.js` paints Zone 2 "Loam Dirt Dry" as A2 id 3728 (slot 19).
- `art/masters/source_sets/SURFACE_SHARED_TERRAIN_DIRT-DRY_V1_DEFAULT/manifest.json` records `pixellabId: "deb74b6c-92d9-41fe-a518-2ca4d09c78d4"`.
- Opened `variant_0.png`: smooth warm pink-brown speckled fill.

Fresh-water NAY `b95d8185` is absent; A1 is the stock sheet. Dirt-dry is the remaining NAY.

### MAJOR 2 — Restored induction tool does not reproduce the committed sheets

`52234374` added `induct_all_ground_tiles.js` at 0 bytes. `df0d03b6` wrote the current body. The committed PNGs were packed by a run that is not this file.

| Behavior | Committed artifact | Current `induct_all_ground_tiles.js` |
|---|---|---|
| D packing | Left 8 columns, 42 cells (dual-block) | `gx = swatchIdx % 16` (16-wide row-major) |
| `Outside_D.png` | Written (hash-identical to `DEUS_GroundVar_D.png`) | Writes only `DEUS_GroundVar_D.png` |
| `tropical_grass` | `TROPICAL-GRASS/.../variant_0.png` is dense leafy cover; D(1,0) MSE 0 against that file | `sourcePath` = meadow `variant_3.png` (dark turf; MSE 845 vs tropical) |

Re-running the committed tool would rewrite both D sheets as 16-wide (RMMZ would then show the wrong 48×48 cells for ids 520+), leave `Outside_D.png` stale, and replace tropical with meadow variant 3. Header comment still says "all 55 sets".

### MAJOR 3 — F5 screenshot deliverable is outside the git object

BRIEF deliverable: 6 in-engine screenshots in `art/review/ground_f5_*.png` (an `allowedPaths` glob). The six files exist on the live worktree and match the harness names. `.gitignore` `/art/review/` excludes them. `git ls-files art/review/ground_f5_*.png` is empty. The isolated clone has none of them.

`git add -f` of those six paths is available without editing `.gitignore`. The mergeable tree currently carries no F5 evidence.

### MINOR 4 — `verify_specimens_rgb.js` is an existence printer

It regex-extracts `SPECIMENS` and `eval`s it, then prints mean RGB if the backup or `owner_master` path exists. Exit 0 on this tip includes the NAY dirt-dry file. It does not compare snapped game sheets, dual-block occupancy, or the NAY list.

### MINOR 5 — `Tilesets.json` pretty-print

49 267 insertions, 7 deletions. The only semantic edits are the two D-slot name fills in section 3. Flags are unchanged. The diff is almost entirely whitespace.

### MINOR 6 — `Map001.json` dropped two RMMZ fields

Merge-base map had `disableDashing` and `autoplayBgs`. The rebuilt map keeps the non-schema `dorphan` field and omits those two. RMMZ treats missing `disableDashing` as falsy (dashing on).

### MINOR 7 — Meadow sidecar records the dry-grass PixelLab id

`SURFACE_SHARED_TERRAIN_MEADOW_V1_DEFAULT/manifest.json` has `pixellabId: "a7bfcf27-55e9-4cab-9ff3-2992cfd89f59"`, which `APPROVALS.md` lists as Dry grass base. Current tool would write `owner_anchor`. The PNG itself is meadow (blue-flower turf) and matches D(0,0) with MSE 0.

### MINOR 8 — F5 harness cannot fail on missing shots

`tools/test_pixellab_ground_tiles_f5.js` swallows every `robocopy` exception, `console.warn`s missing `smoke.*.png`, and always prints `Completed Successfully`. Screenshot copy is best-effort.

### MINOR 9 — `peak_rock_dry` source is mossy vegetation

`SURFACE_SHARED_TERRAIN_PEAK-ROCK-DRY_V1_DEFAULT/variant_0.png` (PixelLab `19506eac`) is green moss with brown patches, mean `[78, 87, 49]`. It occupies Dungeon_A2 slot 3. PM YEA for peak rock is the base id `38ff1be9`. This is a mis-assigned dry variant, not a NAY id.

## 6. What holds

- Allowed-path boundary holds.
- Both listed gate commands exit 0 in a fresh clone of `29e4535c`.
- 32/32 `Outside_A2` autotiles are filled with Euclidean/Bayer edges; opaque pixels are on the master palette.
- `Outside_D` / `DEUS_GroundVar_D` committed packing matches RMMZ dual-block; Map001 gallery ids 512–553 address those 42 cells.
- Stock `Outside_A1` water is restored; NAY fresh water `b95d8185` is not used.
- Demo map is 50×40, tileset 2, five zones, six inspection signs, five named props. F5 frames at 1.0× show those zones in the live worktree.
- Group 3 cliff/edge/ramp art is untouched.

## 7. Verdict

VERDICT: FAIL

Fix required before re-review: drop `deb74b6c` from SPECIMENS, A2 slot 19, D-sheet, source_set, and Map001 (stand in dirt-base per the NAY row); make `induct_all_ground_tiles.js` emit the dual-block D layout and write both D sheets so a re-run matches the committed PNGs; `git add -f` the six `art/review/ground_f5_*.png` files (or otherwise get them into the git object). Gate tests remain necessary on the fix tip, in a fresh clone.
