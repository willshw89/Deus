# ART_CHECK (tools/art_check.js, tools/png_read.js)

The automated half of `docs/ART_STANDARD.md` §6 ("Automated: palette colors only; alpha 0 or 255; scaling the master 3× reproduces the export; frame size and anchor as the sidecar says; the sidecar exists with the right frame counts"), plus two crude stand-ins for the by-eye items "upright, no lean" and feet on the ground. It reads PNGs, prints one `PASS` / `WARN` / `FAIL` / `SKIP` line per check with what it measured, and exits 1 when anything FAILs. Status: built 2026-09-18; its own `--selftest` (47 expectations, every check seen failing) passes; run on the three reference files below.

It is a Node script, not a plugin: nothing runs in the game. Owner: Claude Code. Gemini runs it on every delivery before writing `DELIVERED` (GEMINI.md: "open it and check it against ART_STANDARD" — this is the tool half of that), and Claude Code runs it again before `CHECKED` (`docs/ASSET_REQUESTS.md` → Status flow). It never writes into `game/`.

## Purpose
One command that says whether a sheet is on the 16-px-native / 3× grid, fully opaque-or-transparent, within the palette budget, the right size for its slot, described by a valid sidecar, and (for people and creatures) centred and grounded in its S frame, so an asset that breaks a measurable rule never reaches `game/img/` on a "looks fine" (ART_STANDARD §1: "An image that breaks a rule here doesn't go into `game/img/`, however good it looks").

## Public API
Command line, from anywhere (paths are taken as given, relative to the shell's folder):

```
"C:\Program Files\nodejs\node.exe" tools\art_check.js <png> [<png>...] [--sidecar] [--json] [--summary] [--type <t>]
"C:\Program Files\nodejs\node.exe" tools\art_check.js --selftest
```

| Option | Effect |
|---|---|
| (none) | For each file: a `== <file> (<size>, <sheet type>, <frames>)` header, then one line per check, then `FILE PASS|WARN|FAIL <file>: ...` with the failed and warned check names. Last line: `RESULT PASS|FAIL <n>/<files> files without a FAIL (art_check)`. |
| `--sidecar` | A missing `<name>.json` next to a character or object PNG is a FAIL. Without it, a missing sidecar is SKIP; a sidecar that is present is checked either way. |
| `--summary` | Only the `FILE` lines and the `RESULT` line. |
| `--json` | One JSON array instead of the lines: per file `file, width, height, type, typeWhy, frame {width, height, columns, rows, source}, sidecar, colors, leanPx, checks [{name, status, detail, ...}], status, failed [], warned []`. |
| `--type <t>` | Force the sheet type for every file given: `character`, `object`, `tileset`, `icon`, `face`, `system`, `image`. |
| `--selftest` | Builds sheets under `%TEMP%\uf_art_check_selftest\` that must trip each check, runs them, prints `PASS|FAIL selftest.<case>.<check>: expected X, got Y: <detail>` and `RESULT PASS|FAIL 47/47 expectations`. |
| `--help` | Usage. No files at all is also usage, exit 2; an unknown option is exit 2. |

Exit code: 0 when no check on any file FAILed (WARN and SKIP don't count), 1 otherwise, 2 for bad arguments.

Module exports (for other tools): `checkFile(file, {sidecar, type})` → the per-file report object above; `classify(file, sidecar, forcedType)`; `frameGrid(img, cls, sidecar)`; `selftest()`.

`tools/png_read.js` (`readPNG(file)`, `decodePNG(buffer, label)`) is the decoder: Node's `zlib` only, no other dependency. Returns `{ width, height, data (Buffer, width×height×4 RGBA), colorType, bitDepth, interlaced, px(x, y) → [r, g, b, a], alpha(x, y) }`. Handles gray 1/2/4/8/16-bit, RGB 8/16, palette 1/2/4/8 (with `tRNS` alphas), gray+alpha 8/16, RGBA 8/16, all five scanline filters, colour-key `tRNS` on gray and RGB, and Adam7 interlace; 16-bit samples keep their high byte. CRCs are not verified. Throws with the file name on a bad signature, truncated chunk, unknown filter byte, missing PLTE, or a palette index outside PLTE. `node tools/png_read.js <png> '[[x,y],...]'` prints the size, colour type, depth and the listed pixels. Companion of `tools/png_util.js` (`writePNG`).

### Sheet type (what decides which checks apply)
First rule that matches, in this order; `--type` overrides all of them. The header line and `typeWhy` say which fired.

| Type | Rule | Frame grid without a sidecar |
|---|---|---|
| `icon` | file name starts with `IconSet` | 32×32 (AR-800: 32-px icons) |
| `tileset` | folder `tilesets`, or name ends `_A1`…`_A5`, `_B`…`_E` (the slot is remembered) | 48×48 tiles |
| `face` | folder `faces` | 144×144 (AR-700: 4 columns × 2 rows) |
| `system` | folder `system` | none |
| `object` | folder `characters` (or a `$`/`!` prefix) and the name starts with `!`; also a `$` sheet whose sidecar has exactly one facing | `$`: 3×4 frames of width/3 × height/4; no `$`: 12×8 (ENGINE_RULES §4) |
| `character` | folder `characters` or a `$` prefix, not `!` | same as object; `$` = one character, no `$` = 8 characters per sheet, each 3×4 |
| `image` | anything else | none (only the multiple-of-48 rule) |

When a sidecar with integer `frameWidth`/`frameHeight` exists, it defines the grid for every type that has sidecars (character, object) and the header says `(sidecar)`.

## Checks (one line each, in this order)
| Check | What it measures | FAILs when | WARN / SKIP |
|---|---|---|---|
| `read` | (only printed when the file can't be checked) | the file doesn't exist or `png_read` throws; the other checks are not run | — |
| `alpha` | every pixel's alpha, counting opaque, transparent and in-between (ART_STANDARD F5 "pixels fully opaque or fully transparent") | any pixel has alpha 1–254; reports how many and the first one `(x,y) alpha a` | — |
| `grid` | every 3×3 block aligned to the sheet origin is one RGBA colour (F2: 16×16 native at exactly 3×; §6 "scaling the master 3× reproduces the export"); two alpha-0 pixels count as equal whatever their RGB | width or height isn't a multiple of 3, or any block mixes colours; reports the first differing pixel, its colour, the block's top-left colour, and how many blocks are broken. A figure pasted at an offset that isn't a multiple of 3 fails here even if it was scaled 3× | SKIP for `icon` (32 isn't a multiple of 3, so 32-px icons can't be on the 3× grid) |
| `palette` | the number of distinct opaque (alpha 255) RGB colours on the whole sheet (F5: 16–32 per sheet) | more than 64, or no opaque pixel at all | WARN at 33–64 |
| `size` | the sheet size for its type, and that the frame grid divides it into whole frames | tileset `_A1`/`_A2` not 768×576 (AR-001); other tileset slots not a multiple of 48 both ways; icon sheet not 512 wide or height not a multiple of 32 (AR-800); face sheet not 576×288 (AR-700); character/object/image not a multiple of 48 both ways, or the frame (sidecar or RMMZ layout) doesn't divide the sheet | WARN when a character/object frame isn't 48×48 (F3, V44: everyone fits one 48×48 frame; the 96×96 U7 sheets trip this). SKIP for `system` (no size rule) |
| `sidecar` | `<same name>.json` next to the PNG (ART_STANDARD §3): `frameWidth`, `frameHeight` positive integers dividing the sheet; `anchor` = `[x, y]` integers with 0 ≤ x ≤ frameWidth and 0 ≤ y ≤ frameHeight; `facings` a non-empty array of `S/W/E/N` (or `south/…`), no repeats, at most one per row; `animations` a non-empty object whose values are non-empty integer arrays with every index < columns. Reports whether the optional `layer`, `species`, `stage` are present | the JSON is missing (only with `--sidecar`), unparsable, not an object, or any rule above breaks (all problems are listed) | SKIP for tileset / icon / face / system (no sidecar in §3), and for a missing sidecar without `--sidecar` |
| `lean` | in the S stand frame (row = index of `S` in the sidecar's `facings`, else row 0; column = sidecar `animations.stand[0]`, else the middle column of a 3-column sheet, else column 0), the horizontal centre of mass of the opaque pixels against the frame's centre; every one of the 8 characters on an 8-per-sheet file (F3 "upright … anchor at the bottom-centre"; a crude stand-in for §6 "upright, no lean") | the worst frame is more than 2 px off centre, the frame is empty, or there is no whole frame grid | SKIP for every type but `character` |
| `margin` | the same S stand frame's bottom row and top row (F3 "feet on the bottom row of the cell") | the bottom row has no opaque pixel (reports the lowest opaque row), or the top row has any, or the frame is empty | SKIP for every type but `character` |

The `--selftest` cases, each a sheet built with `tools/png_util.js` (`writePNG`) and the expectation it proves: `clean` (7 PASS with a sidecar), `alpha`, `grid`, `palette_warn` (40 colours), `palette_fail` (70), `palette_empty` (all transparent: palette, lean and margin FAIL), `size_odd` (100×100: size and grid FAIL), `size_a2` (768×576 PASS, lean/margin/sidecar SKIP), `size_a2_short` (768×384), `size_icon` (512×64 PASS, grid SKIP), `size_icon_narrow` (500×64), `sidecar_missing`, `sidecar_anchor` (`[24,60]` in a 48 frame), `sidecar_anim` (walk index 5 of 3 columns), `sidecar_frame` (frameWidth 50 vs width 144: sidecar and size FAIL), `sidecar_facing` (`NE`, 5 facings for 4 rows), `sidecar_json` (`{ not json`), `lean` (figure 1 native px right: off by 3 px), `margin_float` (1 native px up), `margin_top` (head on row 0), `object_skips` (`!$` sheet: lean and margin SKIP), `eight_sheet` (12×8 frames, all 8 centred), `read_not_png`, `read_missing`.

## Events
None (not a plugin).

## Save data
None. It writes nothing except the self-test sheets under `%TEMP%\uf_art_check_selftest\`.

## Status (run on 2026-09-18)
`node tools/art_check.js --selftest`: `RESULT PASS 47/47 expectations (art_check selftest, sheets in C:\Users\snewt\AppData\Local\Temp\uf_art_check_selftest)`; every check was seen to FAIL on the case built for it.

`node tools/art_check.js game/img/characters/People1.png game/img/tilesets/Outside_A2.png "game/img/characters/$U7_Wolf.png"` printed exactly (exit code 1):

```
== game/img/characters/People1.png (576x384, character (8 per sheet), 12x8 frames of 48x48)
PASS alpha: every pixel is alpha 0 or 255 (221184 px: 96717 opaque, 124467 transparent)
FAIL grid: pixel (354,2) is #1d2134 but its block's top-left (354,0) is #00000000; 12202 of 24576 blocks broken
FAIL palette: 255 opaque colours: over 64 (limit 32)
PASS size: 576x384: a multiple of 48 both ways; 12x8 frames of 48x48 (RMMZ 8-character sheet, 12x8 frames)
SKIP sidecar: none next to the PNG (only required with --sidecar)
PASS lean: character 1: mass centre x 23.3 of 48, centre 24, off by -0.7 px; character 2: mass centre x 23.3 of 48, centre 24, off by -0.7 px; character 3: mass centre x 23.5 of 48, centre 24, off by -0.5 px; character 4: mass centre x 23.8 of 48, centre 24, off by -0.2 px; character 5: mass centre x 23.5 of 48, centre 24, off by -0.5 px; character 6: mass centre x 24 of 48, centre 24, off by 0 px; character 7: mass centre x 23.4 of 48, centre 24, off by -0.6 px; character 8: mass centre x 23.4 of 48, centre 24, off by -0.6 px [S row 0, column 0, limit 2]
PASS margin: character 1: bottom row 5 opaque px, top row 0; character 2: bottom row 11 opaque px, top row 0; character 3: bottom row 6 opaque px, top row 0; character 4: bottom row 6 opaque px, top row 0; character 5: bottom row 6 opaque px, top row 0; character 6: bottom row 6 opaque px, top row 0; character 7: bottom row 6 opaque px, top row 0; character 8: bottom row 8 opaque px, top row 0
FILE FAIL game/img/characters/People1.png: 576x384, character (8 per sheet), 12x8 frames of 48x48, 255 colours; 4/6 checks pass; failed: grid, palette; 1 skipped
== game/img/tilesets/Outside_A2.png (768x576, tileset A2, 16x12 frames of 48x48)
FAIL alpha: 39301 of 442368 px have alpha between 1 and 254 (first at (156,0) alpha 254)
FAIL grid: pixel (1,0) is #80c142 but its block's top-left (0,0) is #87c938; 38360 of 49152 blocks broken
FAIL palette: 188 opaque colours: over 64 (limit 32)
PASS size: 768x576: the A2 sheet size 768x576 (16x12 tiles of 48)
SKIP sidecar: tileset sheets have no sidecar in ART_STANDARD §3
SKIP lean: only for character sheets (this is a tileset sheet)
SKIP margin: only for character sheets (this is a tileset sheet)
FILE FAIL game/img/tilesets/Outside_A2.png: 768x576, tileset A2, 16x12 frames of 48x48, 188 colours; 1/4 checks pass; failed: alpha, grid, palette; 3 skipped
== game/img/characters/$U7_Wolf.png (288x384, character, 3x4 frames of 96x96, sidecar $U7_Wolf.json)
PASS alpha: every pixel is alpha 0 or 255 (110592 px: 26940 opaque, 83652 transparent)
FAIL grid: pixel (153,1) is #35312d but its block's top-left (153,0) is #000000; 3081 of 12288 blocks broken
PASS palette: 19 opaque colours (limit 32)
WARN size: 288x384: a multiple of 48; 3x4 frames of 96x96 (sidecar), not the 48x48 frame of ART_STANDARD F3
PASS sidecar: $U7_Wolf.json: frame 96x96 (3x4), anchor [48,96], facings SWEN, animations stand,walk (highest index 2 of 3 columns); layer absent, species absent, stage absent
FAIL lean: S stand frame is off centre by 4.8 px (limit 2); S stand frame (col 1, row 0): mass centre x 52.8 of 96, centre 48, off by 4.8 px [S row 0, sidecar stand[0], limit 2]
FAIL margin: S stand frame (col 1, row 0): bottom row is empty (lowest opaque row is 93 of 95: the feet float); S stand frame (col 1, row 0): top row has 3 opaque px (the figure touches the frame top)
FILE FAIL game/img/characters/$U7_Wolf.png: 288x384, character, 3x4 frames of 96x96, sidecar $U7_Wolf.json, 19 colours; 3/7 checks pass; failed: grid, lean, margin; warn: size
RESULT FAIL 0/3 files without a FAIL (art_check)
```

What that says about the three files:
- `People1.png` (stock RMMZ, an 8-bit palette PNG): alpha is clean and all eight figures are centred (worst 0.7 px) with feet on the bottom row and an empty top row. It fails `grid` because stock RMMZ art is drawn at 48 px natively, not as a 3× export of 16-px pixels (half its blocks mix colours), and `palette` with 255 colours. Stock art is the placeholder set (ART_STANDARD §2); it is not expected to pass the original-art rules, and this run shows what "not on our grid" measures as.
- `Outside_A2.png` (stock RMMZ A2): right size for the slot; 39,301 pixels of partial alpha, not on the 3× grid, 188 colours.
- `$U7_Wolf.png` (U7 stand-in, RGBA): alpha clean, 19 colours, sidecar valid. Its S stand frame's mass centre is 4.8 px right of centre (the U7 lean that VISION's "Rejected" list names), its lowest opaque row is 93 of 95 (feet float 2 px), 3 opaque pixels sit on the top row, and 3,081 of its 3×3 blocks mix colours (the 3×-scaled shape is not aligned to the sheet's 3-px grid: an opaque black row at y=0 over a different colour at y=1). Its 96×96 frame is the pre-V44 size, hence the size WARN.

Also run: `game/img/system/IconSet.png` (stock) → 512×640, size PASS, grid SKIP, alpha FAIL (2 px of partial alpha, first at (288,446)), palette FAIL (253 colours).

`png_read.js` round trips (session scratchpad script, 2026-09-18): RGBA 8 and 16-bit with every filter type in rotation, both plain and Adam7; RGB 8 with a colour key; palette 4-bit with `tRNS` (plain and Adam7) and 1-bit; gray 8 with a colour key, gray 2-bit; gray+alpha 8 and 16; plus the three error paths (bad signature, truncated chunk, filter byte 9): `RESULT PASS 15/15 (png_read round trips)`. The encoder script lives in the session scratchpad, not in the repo.

## Known limits
- `lean` and `margin` look at one frame per character (the S stand frame). A figure that leans only when walking, or clips the frame top only in the N row, passes. They are stand-ins for the by-eye items of §6, not replacements.
- The lean measure is a centre of mass, so an upright figure holding something out to one side reads as leaning; 2 px is less than one native pixel, so an asymmetric pose can trip it. Read the reported offset before deciding.
- `grid` requires the 3× blocks to be aligned to the sheet origin, which a 3× export of a 1× master always is. It cannot tell a 3× export from a drawing made at 48 px that happens to use 3-px blocks.
- The anchor rule accepts both the pixel convention (`[83, 83]` in an 84 frame, AR-600) and the edge convention (`[48, 96]` in a 96 frame, the delivered stand-ins). Lock one when `UF_Sprites` (AR-600 engine side) lands, then tighten this check.
- `palette` counts colours per sheet, as F5 says, so an A2 sheet holding 22 ground kinds (AR-100) is held to the same 32 as a single sprite. If the user relaxes F5 for tile sheets, change `PALETTE_LIMIT` per type.
- `facings` names are accepted in either spelling (`S` or `south`), because both are on disk (`$U7_Wolf.json`, `$Adam.json`). Row order isn't checked against RMMZ's S, W, E, N beyond finding the S row.
- The project palette file `art/palette/uf.hex` (F5 "one project palette once locked") is not read: the check counts colours, it doesn't compare them to the locked palette. Add that when the palette exists.
- Not covered: "same character in every frame", "reads at 1× and at night", "no stray pixels" (all by eye, §6), and the 3× master-to-export comparison (`art/masters` doesn't exist yet).
