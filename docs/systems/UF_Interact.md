# UF_Interact
Right-click any cell of the map for a menu of everything that can be done there; every cell offers at least two options (user decision 2026-09-18: every tile is interactive). Choosing one creates an open job with no owner (a designation) that any colonist may take, with a code-drawn marker on the cell until it is done or cancelled. Adds the `dismantle`, `dig` and `fish` job types to UF_Jobs.
Status: built 2026-09-18, checks: `look` (21 checks together with UF_Look; 14 of them are this plugin's). Not yet registered in the real `game/js/plugins.js` (Claude Code registers it after `UF_Look`, before `UF_Test`; WORLD_ARCHITECTURE §5). Tested on a snapshot with `--plugins UF_Tiles,UF_Objects,UF_Items,UF_Jobs,UF_Colonists,UF_Wildlife,UF_Stance,UF_Look,UF_Interact`.

**File:** `game/js/plugins/UF_Interact.js` · **Load order:** after `UF_World`, `UF_Objects`, `UF_Items`, `UF_Jobs`, `UF_Look`, `UF_ColonyOverseer` (and `UF_Colonists` when present), before `UF_Test`. Contract: `docs/design/WORLD_ARCHITECTURE.md` §4 (marker z) and §5.10.

## API (`UF.Interact`)
| Member | Description |
|---|---|
| `optionsFor(x, y)` | `[{ id, label, enabled, run() }]` for a cell of the map on screen (`[]` off the map or without UF_Jobs). Ids: `action:<chop\|gather\|pick\|quarry\|mine>` (`"Chop down oak"`, `"Gather berry bush"`, `"Pick up loose stones"`, ...: one per catalog action the object has), `dismantle` (a building: an object with `build` or `ruin`), `haul` (items on the cell; disabled with the label `"Haul to stockpile (none built)"` when no stockpile exists), `eat` (a food item), `hunt` (a creature), `select` / `follow` / `info` (a colonist), `info` (any other unit), `build` (land without a blocking object: opens the submenu), `stockpile` (build a `stockpile`), `dig` (disabled with the reason in the label on water, rock face or under a blocking object), `fish` and `drink` (water), `cancel` (`"Cancel designation"` / `"Cancel N designations"` when open jobs target the cell), and always `look`. `run()` returns the job(s) it made, `{ submenu, header }` for a submenu, or whatever the action did. |
| `buildOptions(target)` | The submenu list: `"Back"` then every catalog object with `build`, labelled `"<name> — <cost>"` (`"Wooden wall — 1 log"`), the player's culture wall first (`UF.Colonists.culture().wall`, else `catalog.cultures[player species].wall`) |
| `open(x, y, at?)` | Opens the menu for a cell at a screen point (default the mouse); returns the `Window_UFContextMenu` or `null` (no scene, no options). Replaces an open menu. |
| `choose(labelOrIndex)` | Runs an option of the open menu by exact or prefix label (case-insensitive), id, or index; returns what `run()` returned (tests, scripts) |
| `pick()` / `run(opt)` | The window's "pick" handler and the runner: a submenu result keeps the menu open with the new list, anything else closes it and emits `interact:chosen` |
| `close(fromCancel?)` | Closes the menu (removed and destroyed on the next frame, never inside its own update); emits `interact:menuClosed` |
| `isOpen()` / `menu()` | Whether a menu is open on the current scene / the window (`labels()`, `options()`, `header()`, `cell()`) |
| `handleMouse()` | The per-frame handler (run before the Overseer's controls): returns `true` when the menu is open, opened on this right-click, or consumed a click this frame; opens the menu on `TouchInput.isCancelled()` when the pointer is on a map cell and not over a UI window (`UF.Look.isOverUI`) |
| `swallowedFrame()` | The `Graphics.frameCount` of the last consumed input (the flag the Overseer can't know about) |
| `designate({ type, target, params, priority })` | Creates the open job (`owner: null`) through `UF.Jobs.create`; emits `interact:designated(job)` |
| `designations()` / `designationsAt(x, y, area?)` | Open-owner jobs in state `open`, `travel` or `work` (all / on a cell) |
| `cancelAt(x, y, area?)` | Cancels every designation on the cell (`UF.Jobs.cancel`, reason `"cancelled by the player"`); returns the count |
| `diggable(area, x, y)` / `digCell(area, x, y)` | Whether a cell can be dug (`{ ok, reason }`: land, an A2 ground kind that isn't `passable: false`, no blocking object, not water) / turn it into `dirt` now (the tile becomes `UF.Tiles.groundBase("dirt") + autotile shape`, and the 8 neighbours' shapes are recomputed against their own kinds; emits `interact:dug`) |
| `autotileShape(same)` | The 47-shape derivation (delegates to `UF.WorldGen.autotileShape` when present) |
| `stockpileFor(item, target)` | The haul destination: the colony's stockpiles (`state.colony.stockpiles`, when UF_Colonists keeps them) plus `stockpile` objects within 80 cells; the nearest whose `stores` has one of the item's tags, else the nearest of any |
| `selectedColonistId()` / `nearestColonistId(x, y, area)` | Who does "Drink here" and "Eat": the Overseer's selected colonist (its event's unit), else the nearest colonist unit within 120 cells; with neither, the job is an open designation |
| `bitmap(jobType)` / `markers()` / `markerAt(x, y)` / `markerOf(jobId)` / `markerStats()` / `markersEnabled` | The generated `UF_GenDesignation_<type>` bitmap; the visible marker sprites (`jobId`, `jobType`, `cell`); per-frame cost `{ frames, ms, shown }`; a development toggle |
| `jobTypes` (`["dismantle", "dig", "fish"]`), `defineJobTypes()`, `DISMANTLE_WORK` 60, `DIG_WORK` 80, `FISH_WORK` 200, `DIG_STONE_ONE_IN` 4, `FISH_CATCH_OF` 3, `Z_BELOW_FEET` 49, `MenuWindow`, `MarkerSprite` | Constants and classes |

### The job types (registered with `UF.Jobs.define`; UF_Jobs is not edited)
| Type | plan | work | apply |
|---|---|---|---|
| `dismantle` | the object on the target has `build` or `ruin`; stand beside it (on it when passable) | 60 | its `build.items` are dropped on the cell (`UF.Items.drop`), the object is removed; `job.result = { from, yields, items }`. Card text "Dismantling a wooden wall". |
| `dig` | `diggable` true; stand on the cell | 80 | `digCell`: the ground kind becomes `dirt`; a `stone` drops when `hash32(seed, 0xd16, x, y, jobId) % 4 === 0`; `job.result = { ground: "dirt", from, tileId, shape, stone, roll }`. "Digging the ground". |
| `fish` | the target is water (`UF.Jobs.isWaterAt`); stand on an adjacent cell | 200 | a `fish` item drops on the fisher's cell when `hash32(seed, 0xf15, x, y, jobId) % 3 !== 0`; `job.result = { caught, roll, at, items }` (a miss is reported as `caught: false`). "Fishing". |
Nothing is random: both rolls hash the world seed, the cell and the job id.

### The menu window
`Window_UFContextMenu` (a `Window_Command`): a header row (the cell's look line 1, else its ground kind; not selectable) then one row per option, 18 px font, 30 px rows, left-aligned, at least 190 px wide, at most 14 rows visible (scrolls), placed at the pointer and kept inside the box. Mouse hover selects, left-click chooses, right-click or Esc cancels; Enter/Z choose too. Disabled options are greyed and buzz. A submenu ("Build here") replaces the list in place with "Back" first.

**Precedence over the Overseer** (contract): `Scene_Map.prototype.updateOverseerControls` is aliased; `handleMouse()` runs first and the original is skipped for the frame whenever the menu is open, just opened on this right-click, or just consumed a click or a cancel (`swallowedFrame() === Graphics.frameCount`). So the Overseer's right-click deselect fires only when the menu did not open (pointer off the map, or over a window such as the colonist card), and its left-click select/move never sees clicks on the menu. Without an Overseer, `Scene_Map.update` is aliased instead.

### Designation markers
`Spriteset_Map.createCharacters` (alias) adds a pool of `Sprite_UFDesignation` to the tilemap; `Spriteset_Map.update` (alias, after the core update) shows one per designation whose target is on the current map and within the view plus 2 cells, at the cell's bottom-centre with `z = max(6, footY − 49)` (`footY = round((cellY + adjustY(0) + 1) × 48)`): just above the stance square (footY − 50) and the flat "under" objects (footY − 100), below units, items and standing objects. Bitmaps `UF_GenDesignation_<jobType>` (48×48, generated, cached): a 2 px outline inset 2 px, a 12 % fill, and a 7×7 glyph at 3 px per cell (axe, sprig, stones, pick, X, walled square, spade, hook, arrow, double arrow, bowl, drop, cross; a dot for other types) in a colour per type.

## State it saves
None of its own. Designations are ordinary jobs in `UF.World.state.jobs` (saved by UF_World); the three job types' `job.result` objects are plain data. The dig's tile changes go through `UF.World.setTile` (saved as diffs). The open menu is view state and is not saved.

## Events
Emits: `interact:menuOpened(x, y, options)`, `interact:menuClosed(fromCancel)`, `interact:chosen(optionId, result)`, `interact:designated(job)`, `interact:cancelled(x, y, count)`, `interact:dug(area, x, y, fromKind)`. Listens: none (jobs are read from `UF.Jobs.list` every frame; the list is short).

## Keys and mouse
Right mouse button on a map cell: open the menu (over a UI window or off the map: nothing, the Overseer's deselect runs). Left-click on a row: choose. Right-click or Esc while open: close. Enter/Z: choose the highlighted row. The Overseer maps the arrow keys and WASD to camera panning, so the menu cursor moves by mouse hover, not by arrows.

## Assets used
| Asset | What for | Status |
|---|---|---|
| `UF_GenDesignation_<jobType>` (chop, gather, pick, quarry, mine, dismantle, build, dig, fish, hunt, haul, eat, drink, move, default) | 48×48 designation markers: outline + glyph in a colour per type | generated (code-drawn, `UF.Interact.bitmap`); candidates for a small icon set later (a request would go in `docs/ASSET_REQUESTS.md`) |
| `Window` (img/system) | The menu's window skin | stock RMMZ (already listed for every window) |
| `!$TimberOak`, `!$U7_TallGrass`, Outside_B #80 (`wall_wood`), `$U7_Hare`, `$U7_Townsman`, `!$U7_Item_WoodLog`, `UF_GenStockpile` | Fixtures of the `look` suite only | as listed in `docs/ASSET_INVENTORY.md` |

## Checks (suite `look`, this plugin's part; UF_Look's part is in `docs/systems/UF_Look.md`)
| Check | What would make it FAIL |
|---|---|
| `job_types_defined` | `UF.Jobs.handler("dismantle" / "dig" / "fish")` is missing |
| `every_cell_has_options` | Any of 20 sampled cells (an oak, tall grass, bare ground, water, a log stack, a hare, a colonist, a wooden wall, and 12 seeded cells across the whole map including the ocean rim) lists fewer than 2 enabled options, or fewer than 20 cells were sampled |
| `menu_lists_actions` | `open()` on the oak's cell makes no window in the scene's window layer, it isn't visible and active, it isn't near the pointer, its header isn't `Oak — chop`, or its options lack a label starting `Chop down` or `Look` |
| `menu_creates_designation` | `choose("Chop down")` doesn't return an open `chop` job with `owner null` at the oak's cell, the menu stays open, or 2 frames later there is no visible marker in the tilemap at that cell with `z = footY − 49`, bitmap `UF_GenDesignation_chop`, an opaque outline pixel, and a z below the oak's own sprite |
| `menu_precedence` | With the Overseer's first colonist selected and `TouchInput._currentState.cancelled = true` on the oak's cell (not over the card): `Scene_Map.updateOverseerControls()` doesn't open the menu or the selection is lost; then with the pointer over the colonist card (or a probe window): the menu opens, or the Overseer doesn't deselect |
| `cancel_designation` | The designated cell offers no `Cancel designation`, running it doesn't cancel exactly 1 job (state `failed`), the marker stays, or the option is still offered afterwards |
| `build_submenu` | `choose("Build here")` isn't a submenu whose first row is `Back` with at least 2 buildables after it, the culture's wall isn't first, `choose(1)` doesn't make an open `build` job with that `objectId`, or its marker isn't `UF_GenDesignation_build` |
| `dig_and_fish` | At ×8 with a test worker taking the designations (`UF.Jobs.take`): the dig job doesn't finish, the meadow cell doesn't become `dirt` with the autotile shape the neighbours require, the stone on the cell doesn't match the seeded roll; the fish job doesn't finish from a cell adjacent to the water, or the fish on the stand cell doesn't match `result.caught` (a miss must be reported as such) |
| `dismantle` | The wall's option isn't `Dismantle wooden wall`, the job doesn't finish, the wall is still there, or the cell doesn't hold exactly 1 log |
| `designation_done_by_colonist` | A fresh chop designation on the oak isn't taken (by a colonist unit when UF_Colonists has made some, waiting up to 60 s; else by the test worker through `UF.Jobs.take`), the oak doesn't become a stump with 3 logs, or the marker doesn't go away when the job is done. The detail names which path ran. |
| `hunt_and_haul_options` | The hare's cell doesn't offer `Hunt hare` making an open `hunt` job with the hare's unit id; with a stockpile 2 cells from the log stack, `Haul to stockpile` is disabled or its `haul` job doesn't carry that item to a stockpile cell (the colony's woodpile when it lists one that stores wood, else the test stockpile) |
| `markers_perf` | The marker sync averages more than 0.5 ms per frame over 60 frames (detail gives the ms, markers shown, jobs in the list) |
| `saved` | The finished dig job doesn't survive a `JsonEx` round-trip of the world state with `result.ground === "dirt"` |
| `no_errors` | Any uncaught error during the look/interact checks |
Screenshot: `look.context_menu.png` (the menu open on the oak's cell at zoom 1: header `Oak — chop`, rows `Chop down oak`, `Look`). Results 2026-09-18 on a snapshot with UF_Colonists loaded: 21 passed, 0 failed; `smoke` on the same kind of snapshot: 10 passed, 1 failed (`colony_state_in_save`, the known failure).

## Replaced core methods
None, aliases only (`Scene_Map.prototype.updateOverseerControls` when it exists, else `Scene_Map.prototype.update`; `Spriteset_Map.prototype.createCharacters`, `Spriteset_Map.prototype.update`, `Scene_Boot.prototype.start` for the job types and the checks).

## Known limits
- "Drink here" and "Eat" go to the selected or nearest colonist (`UF.Colonists.order` when present, else a job with `owner` set); without any colonist unit they become open designations like everything else.
- "Info" on another faction's person shows the look lines plus the faction and its tier toward the player for 3 s (there is no card for non-colonists).
- Space while the menu is open both chooses the row (RMMZ "ok") and toggles the pause (UF_TimeSpeed's keydown listener); use Enter, Z or the mouse.
- Digging changes only layer 0 and the ground kind; it doesn't lower anything or make a hole (one surface layer). Fish lands on the fisher's cell, not in the inventory.
- The designation marker follows the job's target cell; a `hunt` job's target moves with the prey on each re-plan, so its marker walks with the animal.
- In test runs on 2026-09-18 UF_Colonists made no colonist units (it hooks `world:created` at boot, after the harness has already started the new game), so `designation_done_by_colonist` ran its test-worker path; the colonist path is written but not yet observed.
- Not yet registered in `game/js/plugins.js`; the editor's Playtest doesn't load it until Claude Code adds it.
