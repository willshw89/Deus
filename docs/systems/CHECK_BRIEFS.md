# CHECK_BRIEFS (tools/check_briefs.js)

**Owner:** Claude Code · **Files:** `tools/check_briefs.js` · **Checks:** `docs/asset_briefs/SEG-*.md` (the asset briefs for Gemini) · **Built:** 2026-09-18

It is a Node script, not a plugin: nothing runs in the game. It reads the briefs, `art/palette/uf.hex`, `game/data/UF_WorldCatalog.json` and `docs/ASSET_REQUESTS.md`, and writes nothing except its self-test files under `%TEMP%`.

## 1. Purpose
Every brief in `docs/asset_briefs/` is a prompt Gemini works from without reading code, so a brief that cites a palette index wrongly, names an id the catalog does not have, skips a section, or leaks a proper noun from the reference games sends Gemini the wrong way. The checker turns the brief format (`art/briefs/FABLE_ASSET_BRIEF.md` §6 with the 2026-09-18 night precisions: 48×48 at native resolution, anchor `[24, 47]`, U7 2.5D projection, palette-only ramps) into rules that can fail, and prints one line per problem. A writer runs it after editing a brief; the index task runs it with `--coverage` to prove every catalog id has a brief.

## 2. Public API
Command line, from the project root or anywhere (project files are found from the script's own location):

```
"C:\Program Files\nodejs\node.exe" tools\check_briefs.js [<file.md> ...] [--coverage] [--summary] [--verbose]
"C:\Program Files\nodejs\node.exe" tools\check_briefs.js --ids
"C:\Program Files\nodejs\node.exe" tools\check_briefs.js --selftest
```

| Option | Effect |
|---|---|
| (none) | Checks every `docs/asset_briefs/SEG-*.md` (sorted by name). Prints `FAIL <file> <brief id>: <message>` or `WARN …` per problem, then `RESULT PASS|FAIL <n> briefs, <f> fails, <w> warns`. |
| `<file.md> …` | Checks only these files (paths as given). |
| `--coverage` | After the briefs, one `FAIL (coverage) <id>: no brief in any segment file (<set>)` per catalog id without a brief in any file checked, plus `COVERAGE <covered>/<total> catalog ids have a brief`. Exit 1 if any id is missing. |
| `--summary` | Prints a table `| Segment | Briefs | Fails | Warns |` with one row per file before the RESULT line. |
| `--verbose` | Also prints `PASS <file> <id>: <name> (<AR-nnn>)` for every brief with no problem. |
| `--ids` | Prints the six catalog id sets a brief may be about, the allowed prefixes, and the AR rows found, then exits 0. Use it to see what still needs a brief. |
| `--selftest` | Writes one scratch segment per case under `%TEMP%\uf_check_briefs_selftest\`, runs the checker on each and asserts the expected fails, warns and messages. Prints `PASS|FAIL selftest.<case>: expected …, got …` and `RESULT PASS|FAIL <k>/<n> expectations`. |
| `--help` | Usage. |

Exit code: 0 when no FAIL (WARN never fails the run), 1 on any FAIL (including coverage misses), 2 on an unknown option or when there is nothing to check (no files given and no `SEG-*.md` exists).

Module exports (for other tools): `run(files, ctx, opts)` → `{ problems: [{level, file, id, msg}], perFile: [{file, briefs, fails, warns}], briefIds: Map id → file, briefs, fails, warns, coverage }`; `checkBrief(brief, ctx, briefIds)` → `[{level, msg}]`; `parseSegment(text)` → `{ briefs, prose }`; `loadContext()` → `{ palette, catalog: {sets, ids, vocab}, requests, banned }`; `selftest()`; `EXEMPLAR` (the oak brief as an array of lines).

### What counts as a brief
A segment file is split at every line starting with `# `, `## ` or `### `. A chunk whose first line starts with `### ` is a brief and runs from its heading to the next such line; everything else (the segment's introduction, section titles between briefs) is prose and is only scanned for banned proper nouns (as WARN, not FAIL). The brief's text is everything in its chunk, including the heading line.

## 3. Events
None (not a plugin).

## 4. Save data
None. The self-test writes `SEG-<case>.md` files under `%TEMP%\uf_check_briefs_selftest\` and leaves them for inspection.

## 5. Checks (the rules, in the order they run per brief)
| # | Rule | FAIL when | WARN when |
|---|---|---|---|
| 1 | **Structure.** The heading is `### <id> — <name> (<AR-nnn>)` (em dash, three-digit AR). Before the first `#### ` line, the bullets `- **Category**:`, `- **Dimensions**:`, `- **Anchor**:`, `- **Projection**:`, `- **Reference**:`, `- **Palette Ramps**:` appear in that relative order, each with text; `- **Sheet**:` is optional and may sit anywhere among them. Then the sections `#### Primary State Visual Description:`, `#### Interaction / Transformed State Description:`, `#### Readability Check:` in that order, each with at least one non-blank body line. Then a line starting `Deliver:` (bold allowed) after the last section. | the heading does not match; a required bullet is missing, empty, repeated or out of order; a bullet has another name; a section is missing, empty, repeated, out of order or has another title; no `Deliver:` line, or it comes before the last section | the Anchor bullet has neither `[24, 47]` nor the word `none`; the Dimensions bullet has no `<W>×<H>`; the Deliver line names no `art/masters/` path (a brief whose file another brief owns should say so) |
| 2 | **Palette.** Every `<index> `#HEX`` pair anywhere in the brief (backticks optional, index 0–255) is compared with line `<index>` of `art/palette/uf.hex` (0-based, case-insensitive). `#FF00FF` (the magenta background) is not a palette colour and is skipped. | the index is above 255, or the hex written differs from the file: the message gives the index, the file's hex and the brief's hex | a backticked `#HEX` without an index: the message says which index it is, or that it is not in the palette (fine only when it quotes an engine tint, such as the catalog's `tint` values or a stand-in's tint) |
| 3 | **Ids.** The heading id is in `game/data/UF_WorldCatalog.json` (`objects[].id`, `items.types[].id`, `wildlife.species[].id`, `people` keys except `about`, `groundKinds[].id`, `water.surface` keys) or starts with `ui_`, `eq_`, `face_` or `anchor_`. Every other backticked token that looks like an id (`[a-z][a-z0-9]*(_[a-z0-9]+)*`) must be a catalog id, a prefixed id, another brief's id, a state form `<catalog id>_lit` / `_bare` / `_unbuilt`, a key or string that occurs anywhere in the catalog (actions, tags, kinds, biome ids…), or a known word (`stand`, `walk`, `chop`, `regrow`, `becomes`, `lit`, `picked`…). | the heading id is unknown | a backticked token is unknown (once per token per brief) |
| 4 | **Request.** The heading's `AR-nnn` is a table row `| AR-nnn |` in `docs/ASSET_REQUESTS.md`. | — | no such row |
| 5 | **Words.** Whole-word, case-insensitive, plural allowed, on every line of the brief: the AGENTS.md list (Avatar, Britannia, Guardian, Lord British, Iolo, Dupre, Shamino, Fellowship, moongate, Urist, Armok, strange mood, fey mood, beholder, mind flayer, illithid, displacer beast, githyanki) plus Dwarf Fortress. `Ultima`, `Ultima VII` and `U7` (including in names such as `U7_Wolf.png`, `art/u7_reference_squares/`) are allowed only on the `- **Reference**:` and `- **Projection**:` bullet lines. The literal path `art/palette/uf.hex` is ignored everywhere. | a banned word anywhere in the brief; `Ultima` / `U7` on any other line | a banned word in the prose between briefs |
| 6 | **Colours.** Distinct palette indices cited as pairs in one brief. | — | more than 32 |
| 7 | **Coverage** (`--coverage` only). Every id of the six catalog sets has a brief in some file checked. | one FAIL per missing id | — |
| — | **Duplicates.** The same heading id in two briefs (any file). | — | on the second one, naming the first's file and line |
| — | **Unreadable file.** | `FAIL <file> (file): cannot read: …` | — |

Every FAIL and WARN above has a self-test case that produces it, and the clean exemplar (the oak brief from the task, embedded as `EXEMPLAR`) produces neither. Cases: `clean`, `heading_dash`, `heading_no_ar`, `bullet_order`, `bullet_missing`, `bullet_unknown`, `bullet_empty`, `bullet_twice`, `sheet_bullet_ok`, `anchor_warn`, `dimensions_warn`, `section_missing`, `section_order`, `section_empty`, `section_unknown`, `deliver_missing`, `deliver_early`, `deliver_path`, `palette_mismatch`, `palette_bare_pair`, `palette_range`, `hex_no_index`, `colours_many` (33 real indices), `id_unknown`, `id_prefix_ok`, `id_items_ok`, `id_water_ok`, `backtick_unknown`, `backtick_suffix_ok`, `ar_missing`, `banned_word`, `banned_phrase` (three in one line), `banned_df`, `u7_outside`, `ultima_outside`, `u7_standin_name`, `palette_path_ok`, `duplicate_id`, `prose_warn`, `two_briefs`, `coverage.missing` (the clean file alone: 136 of 137 ids missing, `oak` covered), and three runs of the command itself (`cli.clean` with `--summary`, exit 0; `cli.mismatch`, exit 1; `cli.unreadable`, exit 1).

## 6. Status (2026-09-18)
`node tools/check_briefs.js --selftest` printed 79 `PASS selftest.…` lines and, exit code 0:

```
RESULT PASS 79/79 expectations (check_briefs selftest, files in C:\Users\snewt\AppData\Local\Temp\uf_check_briefs_selftest)
```

Before the two test-case fixes the same run printed `RESULT FAIL 77/79 expectations` (the `section_unknown` case had put its stray section after the Deliver line, and the `cli.clean` summary-row pattern was wrong), so the self-test has been seen failing.

`node tools/check_briefs.js --summary --coverage` on the one segment that existed at the time (`docs/asset_briefs/SEG-00_in_the_world_now.md`, written by another writer the same night), exit code 1, printed:

```
WARN docs/asset_briefs/SEG-00_in_the_world_now.md boar: `#7A5A40` has no palette index (not in art/palette/uf.hex; fine only when it quotes an engine tint, not a colour to paint with)
FAIL (coverage) birch: no brief in any segment file (objects)
… (123 coverage lines, one per catalog id without a brief) …
FAIL (coverage) blighted: no brief in any segment file (water.surface)
| Segment | Briefs | Fails | Warns |
|---|---|---|---|
| docs/asset_briefs/SEG-00_in_the_world_now.md | 14 | 0 | 1 |
COVERAGE 14/137 catalog ids have a brief
RESULT FAIL 14 briefs, 123 fails, 1 warns
```

Without `--coverage` the same file gives `RESULT PASS 14 briefs, 0 fails, 1 warns` (exit 0). The one WARN is the boar brief's Reference bullet quoting the engine's tint on the current stand-in, which is what the message allows. The 123 coverage fails are expected until the other segments land.

### Known limits
- Rule 1 checks the presence, order and non-emptiness of the parts, not their content: it does not count sentences, verify the row/column numbers, or read the reference square. A brief can pass every rule and still describe the shape badly; the by-eye review of the brief against the composite stays with the writer.
- Rule 2 only pairs an index with a hex that stands right after it. A ramp written as "145 (bark)" without the hex is not checked, and an index used bare in the description (as the exemplar does: "in 145 with a 147 contact line") is never verified. Write the pair once in the Palette Ramps bullet so it is.
- Rule 3's "unknown id" is a warning, and its vocabulary is every id-looking key or string in the catalog, so a backticked catalog *field* such as `clump` passes as known. A real typo of an id (`granit_boulder`) is caught because it is nowhere in the catalog.
- Rule 5 is a word list. It cannot tell a described pose copied from a reference shape from an original one; AGENTS.md rule 8 (nothing copied ships) remains a review item.
- The Sheet bullet's position is not enforced beyond "among the header bullets", because the first delivered segment puts it between Reference and Palette Ramps and the format text only says "add a Sheet bullet for units".
- Nothing here reads `art/masters/`. Delivered PNGs are checked by `tools/art_check.js` (`docs/systems/ART_CHECK.md`), which still enforces the 16-px 3× grid and needs a 48-native mode (STATUS K17).
