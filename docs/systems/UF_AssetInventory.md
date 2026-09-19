# UF_AssetInventory (tools/generate_asset_inventory.js)

Lists every image and tile the engine uses, with what uses it, the interaction states the art needs, its status (missing / stock RMMZ / U7 stand-in / generated / original) and its request row, so Gemini works from one list instead of reading code. Writes `docs/ASSET_INVENTORY.md` for people and `game/data/UF_AssetIndex.json` for UF_Look's tooltip. Status: built 2026-09-18, checks: the tool's own `inventory` run (18 checks since 2026-09-19, printed PASS/FAIL, exit code 1 on any FAIL). Contract: `docs/design/WORLD_ARCHITECTURE.md` §1.11 and §5.12.

It is a Node script, not a plugin: nothing runs in the game. Owner: Claude Code. Gemini runs it (GEMINI.md → How to find what needs art) and never edits it or its two outputs.

## API
Command line, from the project root or anywhere (paths are resolved from the script's own folder):
- `"C:\Program Files\nodejs\node.exe" tools\generate_asset_inventory.js` → rewrites both outputs, prints one `PASS|FAIL inventory.<check>: <detail>` line per check and `RESULT PASS|FAIL <passed>/<total> checks (inventory)`; exit code 0 when all pass, 1 otherwise.
- `--game <game folder>` (2026-09-19): read the catalog, plugins and images of another copy of `game/` (a test snapshot or a scratch copy). Git is not consulted then (`git_baseline` FAILs, stock status by name rules and verified stock cuts). `--out <folder>`: write `ASSET_INVENTORY.md` and `UF_AssetIndex.json` into that folder instead of `docs/` and `game/data/`. Together they let a check be shown failing on a tampered copy without touching the real outputs.

Inputs it reads (never writes): `game/data/UF_WorldCatalog.json` (version 3), `game/js/plugins/UF_*.js`, `game/img/**`, `docs/STATUS.md` (only the `## Stand-ins` section), `docs/ASSET_REQUESTS.md` (only the `| AR-nnn |` rows), and git (`git ls-tree -r 8e5fdc1 -- game/img`, `git log --name-only 8e5fdc1..HEAD -- game/img`, `git diff --name-only HEAD -- game/img`; tries `git` on PATH, then `C:\Program Files\Git\bin\git.exe` and `cmd\git.exe`). When git is unavailable the run still completes; `git_baseline` FAILs and stock status falls back to RMMZ name rules.

`game/data/UF_AssetIndex.json` shape (one entry per asset, keys sorted by status then name; no metadata key, so consumers may iterate it):
```
{ "<key>": { status: "missing" | "stock RMMZ" | "U7 stand-in" | "generated" | "original",
             request: "AR-nnn" | "none yet",          // the primary row (open rows first)
             requests: ["AR-nnn", "AR-mmm (withdrawn)", ...],
             usedBy: ["object oak \"Oak\"", "plugin UF_Jobs.js (test suite)", ...],
             states: ["oak: chop: Oak → Stump (yields 3 Log)", ...],
             category: "tiles" | "objects" | "items" | "creatures" | "people" | "ui" | "generated",
             file: "img/characters/!$TimberOak.png" | "img/tilesets/Outside_B.png (tile 237)" | "(drawn in code)",
             exists: bool, sidecar: bool, statusWhy: "in 8e5fdc1 and unchanged since" } }
```
Keys (what `UF.Assets.describe(name)` looks up; UF_Look tries `name`, `name.png`, `img/<folder>/name.png` and `sheet#id`):
| Asset | Key | Example |
|---|---|---|
| character sheet (objects, items, creatures, people) | the RMMZ name, prefixes included | `!$TimberOak`, `$U7_Deer` |
| one tile of a B/C sheet | `<sheet>#<tile id>` | `Outside_B#237` |
| water kind | `<A1 sheet>#<catalog water.surface id>` | `Outside_A1#2048` |
| ground kind | `UF_GenGround_A2#<2816 + index × 48>` (= `UF.Tiles.groundBase(kindId)`) | `UF_GenGround_A2#2816` |
| whole tileset sheet | the sheet name | `Outside_B`, `UF_GenGround_A2` |
| system / face image | its path | `img/system/Window.png` |
| bitmap drawn in code | its `UF_Gen*` name (`gen: "stockpile"` → `UF_GenStockpile`) | `UF_GenStance_friendly` |

## Where each column comes from
- **Used by**: catalog objects (`image` / `tile` / `gen`, with `tint`), `items.types[].image`, `wildlife.species[].image`, `people.<species>.images`, `start.pair[].image` and `tiers`, `tilesets.surface`, `groundKinds` (plus the biomes whose `ground` is that kind and the cursed/blessed swaps), `water.surface` (plus the biomes using that water); plugins: `characterName: "..."`, `ImageManager.load<System|Character|Tileset|Picture|Face>("...")`, `loadBitmap("img/<f>/", "...")`, `drawFace("...")`, `"img/<folder>/<name>"`, every `UF_Gen*` name in code or comments (a name that is only a prefix of another, `UF_GenStance_` + stance, is dropped), and any other string literal equal to an existing `img/characters` (`$`/`!` names only), `img/system` or `img/faces` file, except on lines holding four or more quoted names (UF_Look's stock-name table). A reference at or after the first `UF.Test.suite(` in the file is marked "(test suite)". Four RMMZ core system images (Window, IconSet, Balloon, ButtonSet) are always listed.
- **States**: per object, each `actions.<verb>` → "verb: Name → Becomes-or-gone (yields …)", `regrow` → "regrows into X after n h", `build` → "unbuilt (needs …) / built", `ruin` → "ruined → X", tag `fire` → "unlit / lit", and the reverse links "is the after-state of …", "is the regrown state of …", "is the ruin of …"; `under`/`passable` → flat / walk-through / blocks movement. Items: on the ground, `food` → eaten, `tool` → held (AR-600 held layer), `wear` → worn tier n, and the recipes that make or use them. Creatures: 4 facings × stand/walk, `hunt` → alive / dead with the drops, flier, monster, region limits. People: 4 facings × stand/walk, faction member / colonist work. Pair tiers: worn tier n = the item with `wear.tier` n. Ground kinds: 47-shape autotile, impassable, placeholder pattern and colors. Water kinds: 3-frame 47-shape autotile. When several catalog kinds share one image, each kind's states carry its id; format facts shared by all of them appear once.
- **Status** (first rule that applies): `generated` for `UF_Gen*`; `missing` when the file is not under `game/img`; `U7 stand-in` when the bare name starts with `U7_`/`u7_` or the file (name, path or a `*` glob) is listed under `## Stand-ins` in `docs/STATUS.md`; `stock RMMZ` for a **stock cut** whose pixels equal its stock source (2026-09-19, VISION V9): `$UF_Stock_<Sheet>_<i>` = character i of the 8-character sheet `<Sheet>` (block at column i % 4, row i / 4 of 144×192), `$UF_Stock_BigMonster<n>_r<r>` = row r of `$BigMonster<n>` in all four facing rows, `!$UF_Icon_<n>` = IconSet icon n copied to (8, 8) of every 48×48 frame of a 144×192 sheet with nothing else opaque, and a `$` sheet with a `<name>.u7bak.png` beside it that equals a character of a stock 8-character sheet (the `--alias` names `$Adam` / `$Eve`); the source must itself be stock (in `8e5fdc1` and unchanged, or a stock name without git). A file named like a cut whose pixels differ is `original` and fails `stock_cuts_verified`. Then `stock RMMZ` when git says the file is in the `8e5fdc1` tree and no commit or working-tree change has touched it since; else `original`. `statusWhy` records which rule fired.
- **Request**: rows of `docs/ASSET_REQUESTS.md` that mention the asset. Strength: the row names the file (backticked, or in plain text for names that can't be ordinary words: prefixed, or containing `_`/digits) or the tile (sheet name plus the tile number) = 3; a backticked glob with at least 6 literal characters (`!$U7_Item_*`; a bare `$U7_*` is ignored) = 2.5; the catalog id as a whole word (also with `_` → space) = 2; the display name, when it has two words or 7+ letters = 1 (used only when nothing stronger matches). A bare-id match in a row that matches nothing else of the same category is dropped as incidental ("oak" in the window-skin row). Order: rows that are still open (not DELIVERED / CHECKED / APPROVED / INTEGRATED / WITHDRAWN) first, then strength, then how many assets of the category the row covers, then file order; the first non-withdrawn one is `request`, all of them are `requests`. Range tokens like `$U7_Adam_T1..T3` expand.

## State it saves
None. It writes two files and touches nothing in `UF.World.state`.

## Events
None (not a plugin).

## Keys and mouse
None. The art line the index feeds is UF_Look's (hover a cell in Playtest).

## Assets used
None of its own: it lists the others'. Every asset in `docs/ASSET_INVENTORY.md` comes from the catalog or a plugin reference as described above.

## Checks (the tool's own run; each prints what it measured)
| Check | FAILs when |
|---|---|
| `catalog_loaded` | the catalog is unreadable or lacks `objects`, `items.types`, `wildlife.species`, `people`, `groundKinds`, `water.surface` or `tilesets.surface` (the run stops) |
| `git_baseline` | no git binary answered, or `ls-tree` of `8e5fdc1` failed (the run continues with name rules) |
| `standins_parsed` | `docs/STATUS.md` has no `## Stand-ins` section or no `- ` lines under it |
| `requests_parsed` | `docs/ASSET_REQUESTS.md` has no `| AR-nnn |` rows |
| `plugins_scanned` | no `UF_*.js` in `game/js/plugins`, or none of them references an image or a `UF_Gen*` bitmap |
| `objects_have_art` | a catalog object has neither `image`, `tile` nor `gen` |
| `assets_listed` | fewer than 100 assets were found (the catalog alone yields about 120) |
| `status_counts` | the per-status counts don't add up to the asset count |
| `every_asset_marked` | an asset has no status, no `statusWhy`, or nothing in `usedBy` |
| `missing_files` | a referenced file (image or tile sheet) doesn't exist under `game/img` |
| `states_present` | a catalog-backed object, item, creature or person sheet has no state line |
| `stock_detected` | no stock RMMZ asset is in use, or one marked stock is neither in the baseline tree (with git) nor a verified stock cut |
| `stock_cuts_verified` | a stock cut in use (`$UF_Stock_*`, `!$UF_Icon_*`, or an alias with a `.u7bak.png`) differs from its stock source, or its source is not stock (shown failing 2026-09-19 on a scratch copy with one pixel of `$UF_Stock_People1_4` changed) |
| `standins_detected` | a U7_ character sheet, or a U7-derived one without the prefix (its sidecar names SHAPES.VGA, or its bytes equal a U7_ file anywhere under `img/`), is not classed "U7 stand-in" (so an unprefixed one missing from STATUS.md → Stand-ins fails it; verified stock cuts are exempt); or there are none at all (shown failing 2026-09-19 with a copy of `!$U7_TimberOak.png` planted under a new name) |
| `catalog_no_standins` | a catalog entry (object, item, creature, people, start.pair, tileset, ground or water kind) draws a U7 stand-in: VISION V9 (shown failing 2026-09-19 with the wolf set to `$U7_Wolf` in a scratch catalog) |
| `request_ids_exist` | an asset's `request` names an id that isn't a row |
| `json_valid` | the written JSON doesn't parse, has a different number of keys than assets, or an entry lacks `status`/`request`/`usedBy`/`states` |
| `md_sections` | the written markdown lacks the summary, one of the seven category tables, "Needs a request" or "Missing files" |

Run on 2026-09-18 (33 plugins on disk, UF_Look and UF_Interact included): 16/16 PASS; 142 assets (35 tiles, 38 objects, 22 items, 18 creatures, 13 people, 9 UI, 7 generated), 0 missing, 32 stock RMMZ, 81 U7 stand-ins, 29 generated, 0 original, 131 matched to a request row and 11 with none (RMMZ core system sheets, the A5 slot, the test walker `People1`, UF_Gumps/UF_Dialogue's U7 gump and face images, `UF_GenStockpile`). The counts move as other plugins land; the tool is the source, this line is a snapshot.

Run on 2026-09-19 after the stock swap (VISION V9; 43 plugins on disk): 18/18 PASS; 219 assets, 0 missing, 141 stock RMMZ (52 stock files and tiles, 89 verified stock cuts: 50 `$UF_Stock_*`, 37 `!$UF_Icon_*`, `$Adam`, `$Eve`), 15 U7 stand-ins (all named only by plugins: test units, UF_Look test data, UF_Gumps/UF_Dialogue gumps and faces, the window skin), 39 generated, 24 original (Gemini's `!$UF_*` drawings, the wall sets, the life-stage sheets); 192 matched to a request row, 27 with none.

## Replaced core methods
None (not a plugin; the game never loads it).

## Known limits
- It lists what is *referenced*, not what is drawn: a stock B-tile used through the catalog counts, a file nobody names doesn't (those are summarized under "Files on disk that nothing references").
- The plugin scan is textual. A sheet name built at runtime (`"$UF_" + species`) is invisible to it until the catalog names the file; a literal that merely mentions a file (in a comment) counts as a use. Lines with four or more quoted file names are skipped as tables (until 2026-09-19 it was four quoted strings of any kind, which hid UF_Combat's three-way pick of `$U7_Wolf` / `$U7_CaveSpider` / `$U7_Townsman`).
- Request matching is by words. A row that lists ids in prose links; one that says "the trees" doesn't. Secondary matches from short ids ("ice", "sand", "stone") can be incidental; the primary pick prefers rows that cover the whole category.
- "stock RMMZ" trusts git: a stock file replaced in place by an original of the same name and committed shows as `original` (no commit changed it → still `stock`; changed → `original`). Gemini's replacements go under new names, per ART_STANDARD, so this stays right in practice.
- The index's `status` values are the contract's five words; UF_Look's own fallback wording for `UF_Gen*` is "code-drawn placeholder", so a generated bitmap reads "generated" with the index and "code-drawn placeholder" without it.
- Not checked by this tool: whether an image's frame grid or sidecar is right (ART_STANDARD §6 is the artist's checklist; the `objects`/`items`/`wildlife` suites check existence and drawing).
