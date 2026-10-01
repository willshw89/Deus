# Independent Grok review — ART.GROUND.INDUCT / lane-cy

- **Writer**: gemini
- **Reviewer**: grok
- **Reviewed commit**: `f0634c77b54426213406ad675f392255ca4b18c7`
- **Prior review**: `1578ead4` on `29e4535c` (VERDICT FAIL)
- **Merge base**: `a3b2c3ed9dc497b50af63b6e4b8e2e627c4eea78`
- **Branch**: `task/lane-cy`
- **Worktree**: `C:\Users\snewt\.deus_worktrees\lane-cy`
- **Isolated clone**: `C:\Users\snewt\AppData\Local\Temp\lane-cy-review-clone-f0634c77` (detached at `f0634c77`)
- **Date**: 2026-09-30
- **Node**: v24.19.0
- **Authority**: DEC-034 independent cross-family review; BRIEF `tasks/ART.GROUND.INDUCT/lane-cy/BRIEF.md`
- **Art**: no art generated this session (DEC-007). Sheet and screenshot measurements were read-only. The induction tool was executed in-process with `fs.writeFileSync` intercepted, and every captured buffer was discarded.

## 1. Identity

```text
git rev-parse HEAD
f0634c77b54426213406ad675f392255ca4b18c7

git merge-base HEAD origin/main
a3b2c3ed9dc497b50af63b6e4b8e2e627c4eea78

git log -4 --oneline
f0634c77 [gemini] ART.GROUND.INDUCT: remediate Grok review findings (purge PM NAY deb74b6c, dual-block D, force-add F5 screenshots)
1578ead4 [grok] ART.GROUND.INDUCT independent review of 29e4535c: VERDICT FAIL
29e4535c [gemini] ART.GROUND.INDUCT: add reviewer brief for Grok
df0d03b6 [gemini] ART.GROUND.INDUCT: restore full tool implementations and meadow variants 1-5
```

This tip is the remediation of the three fixes required on `29e4535c`.

## 2. Path boundary

`git diff --name-only a3b2c3ed HEAD` is 109 paths. Every path matches `lane.json` `allowedPaths`. Zero `game/js/rmmz_*.js`. Zero Group 3 cliff, edge, ramp, or A4 paths.

The branch adds 42 source-set directories under `art/masters/source_sets/` (33 directories were already on the merge base; the worktree holds 75).

## 3. Gate tests (isolated clone, foreground)

Clone: `git clone -c core.autocrlf=false --local <worktree> <temp>` then `git checkout --detach f0634c77`. Commands run with cwd = clone.

### `node tools/check_deus_syntax.js`

- **Exit**: 0
- **Output**: `Checked 62 DEUS plugin files. Errors: 0`

### `node tools/art/verify_specimens_rgb.js`

- **Exit**: 0
- **Output**: `[OK] 0 banned PM NAY IDs present in SPECIMENS.` then 42 `[OK]` lines, five tileset dimension lines, `[OK] Dual-block layout verified on Outside_D`, then `All 42 specimens and tilesets verified successfully with 0 errors.`

`dirt_dry` on this tip reports the dirt-base backup average `[93, 75, 53]`, the same line as `dirt_base`. The banned id `deb74b6c-92d9-41fe-a518-2ca4d09c78d4` is rejected by the gate if it appears in `SPECIMENS`.

## 4. Prior blockers

### PM NAY `deb74b6c` — cleared

`SPECIMENS.dirt_dry` now uses pixellab id `58e1a2c9-7ad0-48ad-bd6f-c0b2a79d1ebd`, fill tile 15, the same source as `dirt_base`, with `standIn: true`. The string `deb74b6c` remains only as a ban entry and a comment. Fresh-water NAY `b95d8185` is still absent from specimens. `Outside_A1.png` SHA-256 matches `art/stock_rmmz/Outside_A1.png`.

Measured:

- `DIRT-DRY/variant_0.png` vs `DIRT-BASE/variant_0.png`: MSE 0 (mean `[89, 71, 49]`).
- `Outside_A2` slot 19 vs slot 17: MSE 0.
- D-sheet index 34 (tile id 546) is that same stand-in. Manifests for all 42 canonical ids: 0 hits on `deb74b6c` or `b95d8185`.

Map001 still paints twelve cells with A2 id 3728 (slot 19) and still lists tile 546 in the gallery. Those cells render the dirt-base stand-in. The zone-2 sign still says "Loam Dirt: Base, Damp, Dry". The dry patch is a second copy of the base.

### Induction tool vs committed sheets — cleared

`induct_all_ground_tiles.js` now places swatch `i` at

```text
gx = (floor(i / 128) % 2) * 8 + (i % 8)
gy = floor((i % 256) / 8) % 16
```

and writes that buffer to both `DEUS_GroundVar_D.png` and `Outside_D.png`. `tropical_grass.sourcePath` is `SURFACE_SHARED_TERRAIN_TROPICAL-GRASS_V1_DEFAULT/variant_0.png`.

An in-memory replay (writes intercepted, nothing left on disk) produced 88 files. SHA-256 matched the committed sheets, `variant_0.png` files, and manifests: **0 mismatches**. `git status` after the replay was clean apart from the untracked `launches/` directory.

Committed sheets, measured directly:

| Check | Result |
|---|---|
| `Outside_A2.png` | 768×576, 32/32 blocks occupied, 0 off-palette opaque pixels (442368). |
| `Dungeon_A2.png` | 768×576, slots 0–15 occupied, slots 16–31 empty, 0 off-palette. |
| `Outside_D.png` / `DEUS_GroundVar_D.png` | Identical SHA-256 `26dfc3ab…`. 768×768. Occupied cells are columns 0–7, rows 0–4, plus row 5 columns 0–1 (42 cells). Right half empty. 0 off-palette. |
| Each D cell vs its `variant_0.png` | MSE 0 for all 42 keys. |
| Tropical vs meadow `variant_3.png` | MSE 845. The D cell is the tropical master. |
| `Outside_A1.png` | Stock RMMZ water. |

`Map001.json` matches `build_ground_demo_map.js` byte for byte (116942 bytes), again with the writer intercepted. 50×40, `tilesetId` 2, `data.length` 12000, six `!Switch1` signs, five props (`!UF_GraniteBoulder_V8`, `!UF_RocksSmall_V8`, `!UF_BerryBush_V8`, `!UF_FallenLog_V8`, `!$UF_Wildflowers`), all of those character sheets present. Gallery layer-1 at y=38, x=4..45 is tile ids 512..553. `System.json` starts map 1 at (25, 20) on an 816×624 screen. `disableDashing` and `autoplayBgs` are present. Meadow manifest `pixellabId` is `owner_anchor`.

## 5. Findings

### BLOCKER 1 — The six committed F5 frames do not show the demonstration map

The six files are tracked (`git ls-files art/review/ground_f5_*.png` lists all six; mtimes 22:29, after the 22:27 sheet write). Each is 816×624. They are engine frames. They are not the five Map001 zones.

Full-frame comparison:

| Pair | MSE | Pixels that differ |
|---|---|---|
| zone1 grasslands vs zone2 earth/shore | 0.003 | 94 / 509184 |
| zone1 vs zone5 gallery | 44.0 | 15540 / 509184 |
| center vs zone1 | 2218 | 475171 / 509184 |
| zone3 vs zone4 | 1720 | 309011 / 509184 |

Zone 1, zone 2, and zone 5 are one picture. The harness calls `locate` at (10, 8), then (10, 29), then (25, 37). Those three Map001 neighborhoods are grasslands, the shore basin, and the 42-swatch runway. A 17×13 tile view of those neighborhoods cannot differ by 94 pixels.

Color of the committed frames:

| Frame | Dominant colors | Green pixels | Blue (water-like) pixels |
|---|---|---|---|
| center plaza | `#738162` 27.6% (near meadow) plus other greens | 57.6% | 8.6%, in a contiguous lower-left region |
| zone1 and zone2 | `#464754` 68.0%, `#2f303a` 10.5% | 0.0% | 1.5% |
| zone5 | `#464754` 66.5% | 0.2% | 1.5% |
| zone3 / zone4 | mixed brown, black, and the same grey | 13.2% / 12.9% | 1.9% / 4.0% |

Map001's A1 water is the rectangle x=5..10, y=32..35. The start camera on an 816×624, 48 px tile screen centered at (25, 20) shows about x=17..33, y=14..26. That view includes meadow, the road cross, and the top of the dirt patches. It does not include the basin. The center frame contains a pond-sized blue region (about 8.6% of the frame). Zone 1 contains no green. Zone 5 contains no swatch row.

`tools/test_pixellab_ground_tiles_f5.js` copies `smoke.ground_f5_*.png` after `run_tests.js` returns exit 0, and exits 1 if a file is missing. It does not check `$gameMap.displayName()`, and it does not notice that three of the six files are the same frame. A passing smoke suite (colony save, `Test.errors` empty) can still archive this set. This session did not re-launch NW.js.

The map JSON and the sheets are in place for an F5 pass. The archived frames are from a view that stayed on one grey field for the grassland, shore, and gallery captures.

### MINOR 2 — Dungeon tileset D slot

`Tilesets.json` flags match the merge base on every tileset. The name edits are tileset 2 (Outside) D `""` → `"Outside_D"`, and tileset 4 (Dungeon) D `""` → `"Outside_D"`. `game/data` has only `Map001.json`, on tileset 2. The pretty-printed flags remain the bulk of that file's diff against the merge base.

### MINOR 3 — `peak_rock_dry` reads as moss

`SURFACE_SHARED_TERRAIN_PEAK-ROCK-DRY_V1_DEFAULT` is PixelLab `19506eac`, mean `[76, 87, 50]` on the snapped swatch and `[78, 87, 49]` on the backup. It is Dungeon_A2 slot 3 and D tile 537. PM YEA peak rock in `art/APPROVALS.md` is the base id `38ff1be9`. This id is not on the DEC-056 NAY list.

### MINOR 4 — Tool header

The file comment still says the D sheet holds "all 55 sets" and names only `DEUS_GroundVar_D.png`. The body writes 42 swatches to both D sheets.

## 6. What holds

- Allowed-path boundary holds (109 paths, 0 outside).
- Both gate commands exit 0 on a fresh clone of `f0634c77`.
- `deb74b6c` is gone from specimens, manifests, and pixels. Dirt-dry is a byte-identical dirt-base stand-in. Stock A1 water is restored.
- A replay of `induct_all_ground_tiles.js` matches the committed PNGs and manifests. Dual-block occupancy is the 42 left-hand cells. Opaque pixels on `Outside_A2`, `Dungeon_A2`, and both D sheets are inside `deus_master_world_palette_v1.hex`.
- `Map001.json` is the 50×40 tileset-2 demo the builder emits: five zones, six signs, five props, gallery ids 512–553.
- Group 3 art is untouched.

## 7. Verdict

VERDICT: FAIL

The induction, the NAY purge, the dual-block sheets, and the map data hold. The F5 deliverable does not. Replace `art/review/ground_f5_*.png` with a run whose six frames are different views of Map001: center around the road plaza at (25, 20) with meadow and the dirt edge in frame and the water basin out of frame; zone 1 green patches; zone 2 dirt, sand, marsh, and the cyan A1 basin; zone 5 the 42-swatch strip. Gate tests on that tip, in a fresh clone, remain required.
