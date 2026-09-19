# UF_Sheet
The selection panel (VISION V59, extending V49; user 2026-09-19: "The player should be able to select anything in the game world and see it's inventory grid"). Left-click anything on the map (a colonist, a stranger, an animal, a stockpile, a pile of items, a workshop, a building, any object) and a panel on the right of the screen shows its inventory as a grid of item icons with stack counts, plus equipment slots, face and stats for creatures and contents, state and actions for things. Your own colonists get Drop and Pick up buttons.
Status: built 2026-09-19 by Claude Code, checks: `sheet` (13 checks, all PASS on a fresh snapshot of game/ with UF_Sheet registered after UF_Interact; each seen failing once, see Checks). On the same snapshot: `smoke` 9/9, `overseer` 6/6, `items` 15/15, `look` 20/21 (`hunt_and_haul_options` fails the same way without UF_Sheet: a control snapshot without it failed identically). **Not yet registered in the real `game/js/plugins.js`** (the RMMZ editor is open; registration goes after `UF_Interact`, before `UF_Test`, when the editor is closed). Not run in the editor's Playtest yet.

**File:** `game/js/plugins/UF_Sheet.js` · **Load order:** after `UF_World`, `UF_Items`, `UF_Objects`, `UF_Jobs`, `UF_ColonyOverseer`, `UF_Look`, `UF_Interact`; before `UF_Test`. Catalog key `sheet` (added by `tools/add_sheet_catalog.js`). Contract: `docs/design/WORLD_ARCHITECTURE.md` §2.3, §2.4, §2.10 (character sheet), §4, §6.

## What the panel shows
The panel is a `Window_Base` (the window skin in use, `img/system/Window.png`) at the right edge of the screen: width `max(boxWidth / 3, columns × slot + 2 × padding)` (312 px with the default 8 × 36 grid), top at y 82 (below UF_DayNight's clock and UF_TimeSpeed's controls), height fitted to what it shows (at most down to 4 px above the bottom). It sits at the bottom of the window layer, so menus, the ledger and the chronicle draw over it.

| Subject | Header | Sections |
|---|---|---|
| Your colonist (`data.kind` colonist, faction the player's) | face, name, `Colonist · <species> · <gender>`, faction with the stance colour square, `Doing: <intent.text, else UF.Jobs.describe(job), else Walking/Idle>` | equipment (5 slots), stats, needs (hunger, thirst, sleep, social, nature) and mood, inventory grid, **Drop** and **Pick up** buttons |
| A stranger (a person or colonist of another faction) / a person of your faction who isn't a colonist | same | equipment, stats, inventory grid; read-only |
| An animal (`data.kind` creature) | face or code-drawn silhouette, `Animal · <species name> (<kind>)`, `No faction · Indifferent/Hostile` | stats, `Drops when killed` (the species' catalog `yields` as icons with counts), inventory grid; read-only; no equipment |
| A stockpile (object tag `stockpile`) | the object's picture, name, `Stockpile · <tags>` | state lines (walkable or not, number of cells and the colony's `stores` tags), actions, `Stored here`: every item on its cells (the 4-connected cells holding the same stockpile object, up to 64) |
| A workshop (object tag `workplace`) | same | state, actions, `Materials on it`: the items on its cell |
| A pile of items (no stockpile or workshop under it) | the first item's icon, `Log × 2` or `3 stacks`, `Items on the ground · on <object>` | `Lying here`: every stack on the cell |
| Any other object (tree, bush, stone, wall, bed...) | picture, name, `<Object/Building> · <tags>` | state (blocks the way or not, `Grows back into X in N h` from UF_Objects' regrow list, `Built from ...`, `Marked: <designations>`), actions (every catalog action: `Chop down: 3 Log · leaves Stump`, and `Dismantle` for buildings); no grid |

- **Grid:** `sheet.grid` columns × rows of slot × slot px (default 8 × 4 of 36 × 36). Stacks fill it in order (a unit's `data.inventory` order: pick-up order); more stacks than slots show as `(40 stacks, 32 shown)`. Each icon is the item type's catalog image: the frame UF_Items draws on the ground (sidecar `frameWidth/frameHeight`, else column 1, row 0 of the 3 × 4 sheet), trimmed to its opaque pixels, drawn at the art's own size (one art pixel = one screen pixel, VISION V2 as of 2026-09-19 late morning) and shrunk (nearest neighbour) only when larger than 32 × 32, tinted like the ground sprite (multiply, alpha kept). If the look goes back to a 3× style, whole-pixel enlargement is one line in `renderIcon`. Counts above 1 in the bottom-right corner; an equipped stack has an `E`.
- **Equipment:** the catalog's `sheet.slots` (head, weapon, shield, torso, legs). A slot's value may be an item record id (UF_Items/UF_Jobs) or an item type id (UF_Combat's test units); `sheet.slotAliases` shows the older keys until every reader moves: `equipment.tool` in the weapon slot, `equipment.clothes` in the torso slot, when those slots are empty.
- **Stats:** the six scores of `data.stats` with modifiers `floor((score − 10) / 2)` (`INT 9 −1`, `CHA 5 −3`); `Stats: not rolled yet` when a unit has none (wildlife has none until V53 reaches UF_Wildlife).
- **Face:** `data.face = { sheet, index }` when set; else `sheet.faces[species]` by `<stage>_<gender>`, `<gender>`, then `any`: `[faceSheet, index]` pairs from `img/faces` (stock RPG Maker sheets, 4 × 2 faces of 144 × 144, drawn at 72 × 72); the pick is `unit.id mod list length` (stable, no randomness); a species with no usable entry gets `UF_GenFace`, a code-drawn head-and-shoulders (people) or animal-head (creatures) silhouette in the unit's tint.
- **Footer:** clicking a slot shows `<name> × <count> · <tags>` (`· equipped` for an equipped stack), an equipment slot `Weapon: Stone axe × 1 · tool, axe`, a drop `Drops Raw meat × 3 · ...`; otherwise a hint.
- **Drop / Pick up** (your colonists only): Drop puts the selected stack on the colonist's cell with `UF.Items.putDown(itemId, unit.area, unit.x, unit.y)` (it merges into stacks there); it is disabled for an equipped stack (there is no unequip API yet). Pick up takes the first stack lying on the colonist's cell with `UF.Items.pickUp` (disabled when nothing lies there or the grid is full; the label says how many stacks are there).

## Selecting: how clicks are read
- **Left-click on the map** (`Scene_Map.prototype.update`, aliased in this file): whether the pointer is over a window (`isAnyWindowUnderMouse` or `UF.Look.isOverUI`) is judged **before** the original update, on the windows the player saw when clicking; then the original update runs, which includes UF_ColonyOverseer's `updateOverseerControls` (select a colonist, or order the selected one to move) and UF_Interact's menu handling; then, if the click is still set (nothing on screen consumed it), the menu is not open and did not take this frame, and the click was on the map, the panel opens for what the cell holds: a unit first; then a stockpile or workshop (the items on it are its contents); then the items on the cell; then the object. Bare ground opens nothing. Map clicks are only read, never consumed: the Overseer still selects colonists (and the panel opens for them too) and still orders moves (the panel stays on the colonist).
- **Clicks on the panel** belong to the panel: its window update (inside the original update, before the Overseer's controls) handles a left-click on a slot, an equipment slot, a drop, a button or the close box, or a right-click anywhere on it (close), and clears that frame's `triggered`/`cancelled` flags, the way RMMZ's own windows consume input. So a click on the panel never becomes a move order, and a right-click on it neither deselects the Overseer's colonist nor opens UF_Interact's menu. Clicks are ignored while UF_Interact's menu is open, and where another window covers the panel.
- **Escape** closes the panel (not while UF_Interact's menu is open or took the frame).
- **UF_Interact's menu gains "Inventory"** (before "Look") on every cell that holds something; choosing it opens the panel for that cell.

## API (`UF.Sheet`)
| Member | Description |
|---|---|
| `open(what)` | `what` = a unit id, `{ kind: "unit", unitId }` or `{ kind: "cell", area?, x, y }` (area defaults to the one on screen). Shows it; returns `true` when something is shown. Emits `sheet:opened(subject)`. |
| `openAt(x, y)` | Opens the panel for what a click on that cell of the map on screen selects; `false` on bare ground. |
| `close(withSound?)` | Hides the panel (the window, its contents bitmap and the icon cache are kept for the next opening). Emits `sheet:closed`. |
| `isOpen()`, `subject()`, `model()`, `layout()`, `footer()`, `pending()` | Whether it's open; the subject; what it shows (`{ kind, readOnly, title, subtitle, faction, stance, doing, picture, equipment, stats, needs, mood, drops, stateLines, actions, grid: { title, slots: [{ itemId, typeId, count, equipped } or null], total, overflow }, buttons, sig }`); the layout rectangles (contents coordinates); the footer line; how many images were still loading at the last draw. |
| `subjectAt(x, y)` | `{ kind: "unit", unitId }`, `{ kind: "cell", area, x, y }` or `null` (bare ground). |
| `buildModel(subject)`, `layoutFor(model, innerWidth, config)` | The model and layout, without a window. |
| `selectSlot(i)`, `drop()`, `pickUp()` | The panel's slot click and buttons as calls. `drop()` returns the ground stack or `null`; `pickUp()` the picked item or `null`. Both only for the player's colonists. Emit `sheet:dropped(unit, stack)` / `sheet:pickedUp(unit, item)`. |
| `screenRect(kind, which)` | A panel rectangle in screen pixels `{ x, y, w, h, cx, cy }`: `("slot", i)`, `("equip", slotName)`, `("drop", i)`, `("button", "drop" or "pickup")`, `("close")`, or a section (`"stats"`, `"footer"`, ...). |
| `opaqueCount(rect, minAlpha = 200)` | Pixels drawn in a layout rectangle of the contents (what the checks read). |
| `itemIcon(typeId, size?)`, `itemIconSpec(typeId)`, `objectIconSpec(type)`, `iconCacheSize()` | The cached icon of an item type (`{ state: "loading" or "ready" or "error", bitmap }`). |
| `perf()`, `resetPerf()`, `bitmapsMade()` | Per-frame cost: `{ openFrames, openAvgMs, closedFrames, closedAvgMs, checks, redraws, bitmapsMade }` since `resetPerf()` (performance.now around the panel's update and the scene hook). |
| `withInventoryOption(options, x, y)` | Adds the `Inventory` option to a UF_Interact option list when the cell holds something (idempotent). |
| `config()` | `{ columns, rows, slot, slots, aliases, faces }` from `catalog.sheet` with defaults. |
| `Window`, `CHECK_EVERY` (15), `PANEL_TOP` (82), `installWraps()` | The window class and constants. |

## Efficiency (VISION V50)
- Closed: the window's update returns at once and the scene hook reads two flags: no model, no signature, no drawing (measured 2026-09-19 on a fresh snapshot of game/: 0.0028 ms per frame over 120 frames, 0 checks, 0 redraws, 0 new bitmaps; performance.now around the panel's update and the scene hook).
- Open: every 15 frames the model is rebuilt from the state (inventory ids and counts, equipment, stats, needs, mood, job text, the stacks on the unit's cell) and compared by a signature string; the contents are redrawn only when the signature changed, the player clicked something, or an image that was still loading has arrived. Worst case measured with a need changing before every check (8 full redraws in 120 frames, world running at ×1): 0.111 ms per frame.
- No Bitmap per frame: one window per map scene (created with the map's windows, at its largest height; resizing moves the frame, not the contents); one icon bitmap per item type and size and per object type, one silhouette per kind and colour, all cached for the session. Face sheets come from ImageManager's cache.
- Missing image files never reach ImageManager (checked with `fs.existsSync` in NW.js; a failed load would throw a LoadError at the next scene change): the slot shows `?`, the face falls back to the silhouette.

## State it saves
None. The panel is view state (not saved); everything it shows is read from `UF.World.state` and `unit.data` (`inventory`, `equipment`, `stats`, `needs`, `mood`, `moodScore`, `intent`, `face`, `species`, `gender`, `stage`, `age`, `faction`).

## Events (UF.Events)
Emits `sheet:opened(subject)`, `sheet:closed()`, `sheet:dropped(unit, stack)`, `sheet:pickedUp(unit, item)`. Listens: none (it polls its subject every 15 frames while open).

## Keys and mouse
Left-click on the map: open the panel for the cell (units first). Left-click on a slot: select it (footer). Drop / Pick up buttons (your colonists). Close box, Escape, or a right-click on the panel: close. Right-click menu (UF_Interact): `Inventory` on any cell that holds something.

## Catalog (`sheet`, written by `tools/add_sheet_catalog.js`)
`grid: { columns: 8, rows: 4, slot: 36 }`, `slots: ["head", "weapon", "shield", "torso", "legs"]`, `slotAliases: { tool: "weapon", clothes: "torso" }`, `faces: { <species id>: { male | female | <stage>_<gender> | any: [[faceSheet, index], ...] } }`. The tool inserts the block as text before the catalog's closing brace, re-reads the file right before writing (recomputing if it changed), and refuses to write unless every other top-level key parses back unchanged and in order. It never overwrites an existing `sheet` key. `node tools/add_sheet_catalog.js [--game <folder>] [--check]`.

## Assets used
| Asset | What for | Status |
|---|---|---|
| `img/system/Window.png` | The panel's window skin | AR-033 delivery (dark carved oak, gold trim; listed under Stand-ins in STATUS); fits V2 as of 2026-09-19 late morning (the U7 manner). Requests for the panel's own pieces: `docs/handoffs/HANDOFF_sheet.md` |
| `img/faces/People1`, `People2`, `People3`, `People4`, `Nature`, `Monster`, `Evil` (the indices in `catalog.sheet.faces`) | Placeholder faces: humans, elves, dwarves, gnomes, automata; wolf, foxes, jackal, boar, wildcat, restless dead | stock RMMZ; AR-700 (people) pending; creature portraits need a request (handoff) |
| `UF_GenFace` (person and beast silhouettes, 72 × 72) | Faces for species without a usable entry (goblins, orcs, most wildlife) | code-drawn placeholder |
| Slot frames, equipment slot frames, close box, buttons, need bars, stance square | Panel parts drawn in code on the window's contents | code-drawn placeholders for AR-701 |
| Every `items.types[].image` (icons), every `objects[].image` / `tile` / `gen` (pictures) | Grid icons and the header picture | as listed in `docs/ASSET_INVENTORY.md` (no new files) |
| `People1` (character sheet), the catalog's `people[species].images[0]` and the deer's `image` | Test units of the `sheet` suite only | as listed for their own uses |

## Checks (suite `sheet`, run it by name: `run_tests.bat sheet`, or `node tools/test_snapshot.js --name sheet --plugins UF_Sheet --suite sheet`)
Clicks go through the real input path: the suite writes `TouchInput._newState` and the pointer position and waits a frame (the real pointer's handlers are replaced for the suite and restored after). The world is paused and colonist decisions are off while it runs (restored after), except in `perf`.
| Check | What would make it FAIL | Seen failing (2026-09-19, source mutants in a snapshot) |
|---|---|---|
| `sheet_ready` | World, Objects, Items, Jobs, Factions, Interact, the Overseer, an area map or the panel window is missing | panel window replaced by null |
| `fixtures` | No 9 × 7 arena of open land (no water, units, items; walkable tiles) near the centre, or a fixture cell isn't left of the panel, above the colonist card and below y 82, or doesn't map back to its own cell | view shifted 8 cells: cells under the panel |
| `colonist` | A click on the colonist's cell doesn't open the panel on it, or the grid isn't exactly `data.inventory`'s stacks in order (ids, types, counts), or the filled/empty slots drawn don't match (opaque pixels), or weapon/torso don't show the axe/wrap given as `tool`/`clothes` (and head/shield/legs empty, drawn and undrawn), or a stat or modifier is wrong or not drawn, or needs/mood are wrong, or the face isn't drawn, or the panel isn't in the right part of the screen below y 82 | modifiers rounded instead of floored (`INT 9 +0`) |
| `overseer_intact` | The click didn't select the colonist in the Overseer or show its card; a click on bare ground with it selected didn't make a `move` job owned by it to that cell; the panel didn't stay on the colonist; a click on an empty panel slot changed its job or selection | panel clicks not consumed and not counted as a window: `job unchanged false` |
| `stranger_readonly` | Another faction's person: not kind `stranger`, not read-only, has buttons, grid differs from its inventory, equipment given as type ids not resolved, the slot footer lacks the item name, or clicking where Drop would be changes its inventory or puts items on its cell | strangers editable: `read-only false, buttons 2` |
| `animal` | Not kind `animal`, not read-only, equipment shown, species name missing, a stat or modifier wrong (`INT 2 −4`, `CHA 5 −3`), drops differ from the catalog yields or aren't drawn, face not drawn | modifiers rounded (`CHA 5 −2`); drops +1 each |
| `stockpile` | 3 stacks dropped on a stockpile cell: not kind `stockpile`, not exactly those 3 item ids in the grid, or the drawn slots aren't `###` then empty | first stack of each cell skipped: 2 shown |
| `object` | An oak: not kind `object`, a grid shown, or a catalog action missing from the list, or the actions not drawn | grid given to every object: `grid SHOWN` |
| `menu_option` | `UF.Interact.optionsFor` lacks `Inventory` on the unit's cell or the items cell, or has it on bare ground; the menu opened on the pile doesn't list it; choosing it doesn't close the menu and open the panel on that pile | label changed to `Contents` |
| `drop_pickup` | Selecting the stone slot doesn't show its name, count and tags; Drop doesn't put exactly that stone on the colonist's cell (holder null, same cell) with the grid one stack shorter; Pick up doesn't bring it back (cell empty, grid full again); Drop on the equipped axe removes it | stone put down one cell east |
| `close` | Escape doesn't close it; a right-click on the panel doesn't close it, or deselects the Overseer's colonist, or opens UF_Interact's menu; the close box doesn't close it; reopening uses a different window or contents bitmap | Escape read from a key that is never pressed |
| `perf` | Open (world running at ×1, a need changed before every check): average above 0.5 ms per frame, fewer than 4 redraws, or a new bitmap; closed: average above 0.05 ms, or any signature check, redraw or new bitmap | a 1 ms busy wait in the window update: 1.109 ms |
| `no_errors` | Any error recorded during the suite | a recorded error entry pushed before the check. (A real uncaught error or unhandled rejection stops RMMZ's game loop: the run then ends with the `ERROR` line and `suite_completed` FAIL, seen with a provoked rejection.) |
Screenshots: `sheet.colonist.png`, `sheet.animal.png`, `sheet.stockpile.png` (zoom 1, the look tooltip hidden for the shot).

## Replaced core methods
None, aliases only: `Scene_Map.prototype.update`, `Scene_Map.prototype.createAllWindows`, `Scene_Boot.prototype.start`. Runtime wraps of other plugins' public functions, installed at `Scene_Boot.start` (each calls the original first): `Scene_Map.prototype.isAnyWindowUnderMouse` (UF_ColonyOverseer, wrapped by UF_TimeSpeed too: also true over the panel), `UF.Interact.optionsFor` and `UF.Interact.open` (add `Inventory`), `UF.Interact.MenuWindow.prototype.setOptions` (keeps `Inventory` after the build submenu's `Back`). No other plugin file is edited.

## Known limits
- Selecting a colonist and then left-clicking a cell with an object or items orders the move (Overseer) **and** switches the panel to that cell's contents; bare ground keeps the panel on the colonist. Grass tufts and flowers are objects, so a move onto them switches the panel too (decision asked of the user).
- Strangers show their whole inventory (V59); V49 said strangers show only what can be seen (decision asked of the user).
- Equipped stacks can't be dropped from the panel (no unequip API in UF_Items); there is no drag and drop between slots, no dropping onto a chosen cell, and no pages.
- Stacks beyond the grid's slots aren't reachable from the panel (the title says how many are hidden).
- A grid larger than the screen allows (a catalog change) is cut off at the panel's maximum height.
- Slot frames, buttons and the close box are code-drawn until AR-701 (nothing reads `img/system/UF_SheetUI.png` yet).
- Icons are drawn at the art's own size (V2: one pixel density), so the smallest item stand-ins (the stone axe, the woven wrap) are only a few pixels wide in their slots. Faces, by contrast, are stock 144 × 144 cells shrunk into the 72 × 72 box (the portrait size is an open question, `docs/handoffs/HANDOFF_sheet.md`).
- Faces are stock anime-style RPG Maker portraits by species and gender (elves use the fairy and princess faces of `Nature`); animals mostly get the silhouette.
- Test runs start a New Game with a random seed, so the species, faction and face in the screenshots change from run to run.
