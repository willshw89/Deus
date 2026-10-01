# Independent Grok review — ART.GROUND.INDUCT / lane-cy

- **Writer**: gemini
- **Reviewer**: grok
- **Reviewed commit**: `e94fba3c00249a8d530cb804f91c765bd696d1d8`
- **Prior review**: `12d97ab2` on `f0634c77b54426213406ad675f392255ca4b18c7` (recorded a failure: the six F5 frames were not Map001)
- **Merge base**: `a3b2c3ed9dc497b50af63b6e4b8e2e627c4eea78`
- **Branch**: `task/lane-cy`
- **Worktree**: `C:\Users\snewt\.deus_worktrees\lane-cy`
- **Isolated clone**: `C:\Users\snewt\AppData\Local\Temp\lane-cy-review-clone-e94fba3c` (detached at `e94fba3c00249a8d530cb804f91c765bd696d1d8`)
- **Date**: 2026-09-30
- **Node**: v24.19.0
- **Authority**: DEC-034 independent cross-family review; BRIEF `tasks/ART.GROUND.INDUCT/lane-cy/BRIEF.md`
- **Art**: no art generated this session (DEC-007). Committed PNGs were decoded with `tools/png_read.js` and measured. NW.js was not re-launched.

## 1. Identity

```text
git rev-parse HEAD
e94fba3c00249a8d530cb804f91c765bd696d1d8

git merge-base HEAD origin/main
a3b2c3ed9dc497b50af63b6e4b8e2e627c4eea78

git log -5 --oneline
e94fba3c [gemini] ART.GROUND.INDUCT: replace F5 frames with verified Map001 zone captures (exits 0, MSE verified)
12d97ab2 [grok] ART.GROUND.INDUCT independent review of f0634c77: VERDICT FAIL
f0634c77 [gemini] ART.GROUND.INDUCT: remediate Grok review findings (purge PM NAY deb74b6c, dual-block D, force-add F5 screenshots)
1578ead4 [grok] ART.GROUND.INDUCT independent review of 29e4535c: VERDICT FAIL
29e4535c [gemini] ART.GROUND.INDUCT: add reviewer brief for Grok
```

`git diff --name-only f0634c77 HEAD -- game tools/art art/masters` is empty. Sheets, Map001, Tilesets.json, source sets, and the induction tools are the same blobs the prior review measured. This tip replaces the six `art/review/ground_f5_*.png` files and rewrites `tools/test_pixellab_ground_tiles_f5.js`.

## 2. Path boundary

`git diff --name-only a3b2c3ed HEAD` is 110 paths. Every path matches `lane.json` `allowedPaths`. Zero paths outside that list. Zero `game/js/rmmz_*.js`. Zero Group 3 cliff, edge, ramp, or A4 paths.

The six F5 frames are tracked (`git ls-files art/review/ground_f5_*.png` lists all six).

## 3. Gate tests (isolated clone, foreground)

Clone: `git clone -c core.autocrlf=false --local <worktree> <temp>` then `git checkout --detach e94fba3c00249a8d530cb804f91c765bd696d1d8`. Commands run with cwd = clone.

### `node tools/check_deus_syntax.js`

- **Exit**: 0
- **Output**: `Checked 62 DEUS plugin files. Errors: 0`

### `node tools/art/verify_specimens_rgb.js`

- **Exit**: 0
- **Output**: `[OK] 0 banned PM NAY IDs present in SPECIMENS.` then 42 `[OK]` lines, five tileset dimension lines, `[OK] Dual-block layout verified on Outside_D`, then `All 42 specimens and tilesets verified successfully with 0 errors.`

`dirt_dry` and `dirt_base` both report average `[93, 75, 53]`. The banned id `deb74b6c-92d9-41fe-a518-2ca4d09c78d4` is still only a ban entry in `verify_specimens_rgb.js` and a comment in `induct_all_ground_tiles.js`. Fresh-water NAY `b95d8185` is only on that ban list.

## 4. Prior blocker — F5 frames now show Map001

The six committed frames are 816×624, 8-bit RGBA, not interlaced. Each carries the engine HUD (zoom panel with 1.0× selected, calendar strip). They are not the grey duplicate set from `f0634c77`.

Pairwise MSE over the full frame (`tools/png_read.js`, same channel formula as the harness):

| Pair | MSE |
|---|---|
| center vs zone 1 | 2067.35 |
| center vs zone 2 | 3119.44 |
| center vs zone 3 | 1767.52 |
| center vs zone 4 | 2009.52 |
| center vs zone 5 | 1827.71 |
| zone 1 vs zone 2 | 3082.40 |
| zone 1 vs zone 3 | 955.61 |
| zone 1 vs zone 4 | 1636.00 |
| zone 1 vs zone 5 | 2062.94 |
| zone 2 vs zone 3 | 2853.58 |
| zone 2 vs zone 4 | 3134.27 |
| zone 2 vs zone 5 | 3370.30 |
| zone 3 vs zone 4 | 1485.44 |
| zone 3 vs zone 5 | 1742.03 |
| zone 4 vs zone 5 | 2008.66 |

Minimum is 955. The harness floor is 200. The prior failure's zone-1 vs zone-2 MSE was 0.003.

Camera check against `build_ground_demo_map.js` and the harness `setDisplayPos` calls. A player-follow camera would center with `display = player - (8, 6)`. The harness uses `(16.5, 13.5)`, `(0, 0)`, `(0, 22)`, `(25, 0)`, `(25, 22)`, and `(16.5, 27)`.

| Sample | Harness camera | Measured RGB | Reading |
|---|---|---|---|
| Center road ring, map (22, 17) | screen (264, 168) | 156, 132, 73 uniform | Road. The player-follow rect at (240, 144) is mixed grass (green 0.74). |
| Center meadow island, map (23, 18) | screen (312, 216) | 110.3, 130.7, 97 (green 0.987) | Matches meadow specimen average `[110, 131, 97]`. |
| Center whole frame blue ratio | water basin is outside y=13.5..26.5 | 0.019 | No pond. Zone 2's whole-frame blue ratio is 0.084. |
| Zone 2 water, map x=5..10, y=32..33 | screen (240, 480) 288×96 | 45.3, 161.3, 204.4, blue ratio 1.000 | Stock cyan A1 basin. |
| Zone 3 and zone 4 left column | display x=25, so map x=25 is screen x=0 | 156, 132, 73 uniform over 48×200 | The north-south road. Player-follow would have started at x=28 and missed it. |
| Zone 4 cave, map (28, 23) | screen (144, 48) | 42.2, 39, 34 | Matches cave-floor average `[41, 40, 35]`. |
| Zone 1 meadow | display (0, 0) | 110.5, 130.7, 97 | Same meadow. Whole-frame green ratio 0.607 (harness floor 0.20). |
| Zone 1 forest floor, map (13, 7) | screen (624, 336) | 61.7, 49.5, 33.9 | Matches forest-floor average `[60, 49, 31]`. |

Zone 5 gallery. Map001 layer 1 at y=38, x=4..45 is tile ids 512..553, one step each. For display `(16.5, 27)` the row sits at screen y=528. Swatches i=13..28 are fully inside the 816×624 frame. Each full 48×48 cell matches `Outside_D.png` at MSE 0.000 (16/16, including the bottom 16 rows). The same cells against a player-follow origin of x=17 average MSE 2105. An unclamped origin of `(17, 32)` averages MSE 5142.

`Map001.json` on this tip: 50×40, `tilesetId` 2, `data.length` 12000, `displayName` `DEUS Natural World — PixelLab Ground Showcase`, `disableDashing` false, `autoplayBgs` false. Six `!Switch1` signs (26,18), (2,2), (2,22), (27,2), (27,22), (2,38). Five props: `!UF_GraniteBoulder_V8` (30, 8), `!UF_RocksSmall_V8` (30, 4), `!UF_BerryBush_V8` (5, 8), `!UF_FallenLog_V8` (15, 8), `!$UF_Wildflowers` (10, 4). Tileset 2 D slot is `Outside_D`.

## 5. Findings

No blocker. No major. The failure recorded on `f0634c77` is closed by the frames above.

### MINOR 1 — Harness checks are narrower than the frame proof

`tools/test_pixellab_ground_tiles_f5.js` now exits 1 when a screenshot is missing, when any of five pairs has MSE below 200, or when zone 1's green ratio is below 0.20. Those checks reject the previous duplicate grey set. They do not require the cyan basin, the road plaza, or a D-sheet blit. On this tip the committed pixels already meet those stronger conditions (section 4). This session did not re-launch NW.js.

### MINOR 2 — Carried from `f0634c77`, blobs unchanged

- `induct_all_ground_tiles.js` header still says the D sheet holds all 55 sets and names only `DEUS_GroundVar_D.png`. The body writes 42 swatches to both D sheets.
- Tileset 4 (Dungeon) D slot is `Outside_D`. Map001 is tileset 2. Flags were unchanged at `f0634c77`.
- `peak_rock_dry` still reports average `[78, 87, 49]` (green moss read). It is not on the DEC-056 NAY list. `dirt_dry` remains the dirt-base stand-in.

## 6. What holds

- Allowed-path boundary holds (110 paths, 0 outside).
- Both gate commands exit 0 on a fresh clone of `e94fba3c00249a8d530cb804f91c765bd696d1d8`.
- PM NAY `deb74b6c` stays out of specimens. Dirt-dry remains the dirt-base stand-in. Stock A1 water is the basin in the zone 2 frame.
- Sheets, source sets, and Map001 are the blobs accepted on content at `f0634c77`. This tip does not edit them.
- The six F5 frames are distinct engine views of that map: plaza road and meadow with the basin outside the frame, green zone 1, cyan basin in zone 2, rock zone 3, cave and dug earth in zone 4, and a zone 5 gallery whose on-screen cells match `Outside_D.png` at MSE 0.
- Group 3 art is untouched.

## 7. Verdict

VERDICT: PASS
