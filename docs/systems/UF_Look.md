# UF_Look
A small text tooltip beside the mouse pointer says what is on the cell under it (a unit with its stance and job, the items, the object with its actions, or the site), what land it is (biome, region character, ground kind, water), and which art file draws it with the file's status (user decision 2026-09-18: a tooltip next to the cursor, not a box in a corner). `UF.Assets` gives the status of any image or tile from `data/UF_AssetIndex.json` when that file exists, else from name rules.
Status: built 2026-09-18, checks: `look` (21 checks together with UF_Interact; 7 of them are this plugin's, see below). Not yet registered in the real `game/js/plugins.js` (Claude Code registers it after `UF_Camera`, before `UF_Interact`; WORLD_ARCHITECTURE §5). Tested on a snapshot with `--plugins UF_Tiles,UF_Objects,UF_Items,UF_Jobs,UF_Colonists,UF_Wildlife,UF_Stance,UF_Look,UF_Interact`.

**File:** `game/js/plugins/UF_Look.js` · **Load order:** after `UF_World`, `UF_Objects`, `UF_Items`, `UF_Jobs`, `UF_Stance`, `UF_Camera` (all optional except UF_World), before `UF_Interact` and `UF_Test`. Contract: `docs/design/WORLD_ARCHITECTURE.md` §5.10.

## API (`UF.Look`)
| Member | Description |
|---|---|
| `describeCell(x, y)` | `[line1, line2, line3]` (strings; `""` for an empty line) for a cell of the map on screen; `null` off the map. Line 1 = the first of: unit (`name · stance · job` for colonists, `name · stance` otherwise), items (`3 × Log, Stone` from `UF.Items.describe`), object (`Oak — chop`; a building without actions says `— dismantle`), site (`UF.History.describeSite`), else `""`. Line 2 = `Biome · Savagery, Alignment · Ground kind` plus ` · water: kind` on water (names from the catalog's `biomes`, `regions`, `groundKinds`; the ground kind is read from the tile actually on the map, so a dug cell says Dirt). Line 3 = `UF.Assets.describe(file).text` for the subject's image, else the ground sheet (`UF_GenGround_A2`) or the water sheet (`Outside_A1`). Over an unexplored fog cell: `["Unexplored", "", ""]` (fog is off, so this never shows today). |
| `inspect(x, y)` | The structured version: `{ x, y, lines, subject: { kind: "unit"\|"items"\|"object"\|"site", text, file, hit\|items\|object }, cell: { text, biome, biomeId, region: {savagery, alignment}, ground, water, file }, art: { file, status, request, text }, unexplored }` or `null` |
| `unitAt(x, y)` | `{ unit, event, name, image, colonist, creature, person, adapter }` for the non-transparent unit event on the cell (`UF.World.unitOfEvent`), or a pre-Colonists start event whose note contains `<colonist` (`unit: null`); `adapter` is the Overseer's `$colonyManager.colonists` entry for it when there is one; `null` when nobody stands there |
| `subjectAt(x, y)` / `cellAt(x, y)` | Line 1 / line 2 as objects (see `inspect`) |
| `cellUnderMouse()` | `{ x, y }` from `$gameMap.canvasToMapX/Y(TouchInput.x/y)` (zoom-aware through UF_Camera), or `null` when that cell is off the map |
| `isOverUI()` | True when the mouse is inside a visible, open window of the scene's window layer (the colonist card, the ledger, the chronicle, UF_Interact's menu, the Overseer's old corner label, ...) |
| `show(x, y, seconds = 3, lines?)` | Pins the cell's lines (or the given lines) beside that cell for `seconds`; then the tooltip follows the mouse again. Emits `look:shown`. Used by UF_Interact's "Look" and "Info". |
| `hide()` | Drops a pin and hides the tooltip until the next frame decides otherwise |
| `text()` / `lines()` / `isPinned()` / `anchor()` / `sprite()` | What the tooltip shows now (`text()` = the drawn lines joined by `\n`, `""` while hidden), the point it was placed for, the sprite itself (tests) |
| `enabled` | `false` hides the tooltip (development toggle, not saved) |
| `runChecks(t)` / `cleanup(fx)` | The suite body and its cleanup, called by UF_Interact's combined `look` suite (or by this plugin's own registration when UF_Interact is absent) |

How it draws: `Scene_Map.createAllWindows` (alias) adds one `Sprite_UFLookTip` to the scene after the window layer, so it draws over every window. Each frame it reads the mouse cell; when the cell changes, or every 20 frames while it stays (units walk, jobs change), it re-reads `inspect` and redraws its bitmap: 13 px font, 16 px lines, 7/5 px padding, dark background at 82 % alpha with a 1 px light border, no window frame; line 1 white, line 2 grey, line 3 sky blue. It sits 14 px right of and below the pointer and flips to the left/top side when the box would leave the screen. Hidden off the map, over a UI window, or when there is nothing to say.

### `UF.Assets`
| Member | Description |
|---|---|
| `describe(ref)` | `ref` = an image name (`"$U7_Deer"`, `"!$TimberOak"`), `"Sheet#id"` (`"Outside_B#237"`), `{ sheet, id }` or `{ image }` → `{ file, status, request, fromIndex, text }`, `text` = `<file> — <status> (<request id>)`. The index entry is looked up under the name, `<name>.png`, `img/characters/<name>.png`, `img/tilesets/<name>.png`, `img/system/<name>.png` (and for tiles also the sheet alone and `img/tilesets/<sheet>.png#<id>`); `status`/`request` come from it when found (`request` = `"none yet"` when the entry has none). Without an entry: the name rules. |
| `statusByName(name)` | The name rules alone: `U7_` (after any `!`/`$`) → `"U7 stand-in"`, `UF_Gen` → `"code-drawn placeholder"`, a stock RPG Maker MZ file name → `"stock RMMZ"`, else `"original"` |
| `index()` / `setIndex(obj)` | The loaded `$ufAssetIndex` (`data/UF_AssetIndex.json`), or what a test set (`null` = pretend there is none, `undefined` = back to the file) |
| `indexFileListed()` | Whether the index file existed at boot and was added to `DataManager._databaseFiles` (NW.js `fs.existsSync`; in a browser it is never loaded) |
| `isStockName(name)` / `stockNames()` / `STATUS` | The stock list (default MZ characters, tilesets and system images) and the four status strings |

## State it saves
None. Everything is read from the map, `UF.World.state` (through the other plugins' APIs) and the catalog whenever asked. `$ufAssetIndex` is a database file loaded at boot, not saved.

## Events
Emits: `look:shown(x, y, lines)` when `show` pins a cell. Listens: none.

## Keys and mouse
Mouse move only: the tooltip follows the pointer (`TouchInput.x/y`). No keys.

## Assets used
| Asset | What for | Status |
|---|---|---|
| none drawn by this plugin | The tooltip is text on a code-drawn bitmap (`Sprite_UFLookTip`, not an image file) | — |
| `data/UF_AssetIndex.json` | Statuses and request ids for line 3 (written by `tools/generate_asset_inventory.js`; optional) | data, not art |
| `!$TimberOak`, `!$U7_Flat-toptree`, `Outside_B#237` (palm), `$U7_Ranger` | Fixtures of the `look` suite only | as listed in `docs/ASSET_INVENTORY.md` |

## Checks (suite `look`, this plugin's part; the rest are in `docs/systems/UF_Interact.md`)
| Check | What would make it FAIL |
|---|---|
| `look_ready` | Not on an area map, or `UF.Objects`, `UF.Items`, `UF.Tiles` or the tooltip sprite is missing |
| `cell_lines` | With an oak, a fresh-water tile and a colonist-kind test unit placed in view: the oak's lines aren't `Oak — chop` / a line with its biome and ground kind names / `!$TimberOak — ...`; the water line 2 lacks `water: fresh` or line 3 doesn't start `Outside_A1 — `; the unit's line 1 isn't `TEST_looker · Friendly · Idle` or its line 3 doesn't start `$U7_Ranger — U7 stand-in` |
| `asset_line_names_status` | With the index set aside: a `!$U7_` object doesn't say `U7 stand-in`, the ground (`UF_GenGround_A2`) doesn't say `code-drawn placeholder`, a stock B-sheet tile doesn't say `stock RMMZ` |
| `asset_index_used` | With a test index `{ "!$TimberOak": { status, request } }`: `describe` doesn't return `!$TimberOak — original (AR-021)` from the index, a name not in it doesn't fall back to the name rules, or the real index isn't restored afterwards |
| `window_follows_mouse` | With `TouchInput._x/_y` on the oak's cell then on the water cell (2 frames each): the tooltip isn't visible, its text doesn't change from `Oak — chop...` to a line with `water: fresh`, its corner isn't 14 px right/below the pointer (or 14 px left/above when flipped at the edge), or its font isn't 13 px |
| `edges_and_ui` | At the bottom-right corner of the screen the tooltip leaves the screen or isn't flipped; with a 200×80 test window at (40,40) and the mouse at (60,60), `isOverUI` is false or the tooltip stays visible |
| `show_pins_lines` | `show(oak, 0.5 s)` with the mouse elsewhere doesn't pin the oak's lines, or the pin isn't released after 0.5 s |
| `no_errors` (standalone registration only) | Any uncaught error |
Screenshot: `look.look_label.png` (the tooltip beside the oak's cell at zoom 1; the old corner label of UF_ColonyOverseer is still visible until the colonists agent removes it). During the checks the real pointer is locked out (`TouchInput._onHover/_onMove/_onTrigger/_onCancel/_onRelease` are no-ops, restored by `cleanup`), because a moving mouse over the test window overwrote the simulated position in one run on 2026-09-18.

## Replaced core methods
None, aliases only (`Scene_Map.prototype.createAllWindows`, `Scene_Boot.prototype.start` for the checks). `DataManager._databaseFiles` gets one entry when the index file exists.

## Known limits
- Line 1 shows one thing: the first of unit, items, object, site. A unit standing on items over an object hides the other two (the context menu still lists everything).
- The tooltip can't tell that the pointer left the game window (RMMZ keeps the last position), so it stays at the last cell until the mouse comes back.
- `UF_ColonyOverseer`'s `Window_UFLookLabel` (top-left corner, added by Gemini 2026-09-18) still exists until the colonists agent removes it; this plugin doesn't use it.
- The index lookup keys are guesses at what `tools/generate_asset_inventory.js` writes (name, `.png`, `img/<folder>/<name>.png`, `Sheet#id`); if the tool writes other keys, only the name rules apply until the keys are aligned.
- Not yet registered in `game/js/plugins.js`; the editor's Playtest doesn't load it until Claude Code adds it.
