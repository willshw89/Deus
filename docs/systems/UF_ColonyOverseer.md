# UF_ColonyOverseer
The overseer's view of the colony: a free camera (WASD / arrows), left-click to select a colonist and open its card, left-click on the ground to order the selected colonist there, right-click to deselect; the card reads `UF.Colonists.describe` (name, gender, mood, faction · site, job, hunger/thirst/sleep/social, tool and clothes, latest thought, plan progress) and, under the job, what the colonist carries (`UF.Sheet.loadOf`: "Carrying 3 logs to the woodpile"; blank when it carries nothing; VISION V89, 2026-09-19: loads are written in the profile, never drawn on the sprite). Rewritten 2026-09-18: the old `Colonist` class, needs ticker, glade setup, `colony` suite and the `Window_UFLookLabel` block are gone (UF_Colonists and UF_Look own them). Status: built 2026-09-18, checks: `overseer` (6 checks, on request; all PASS on a snapshot 2026-09-18). The load line (2026-09-19) is checked by the `sheet` suite (`card_shows_load`, see `docs/systems/UF_Sheet.md`).

**The card** (380 × 320 since 2026-09-19, was 300; bottom-left, 16 px from the edges): name, gender, age, mood; faction · site; `Job: <UF.Jobs.describe>`; the load line (y 60 of the contents, font 14, the colour of UF_Sheet's "Doing" line; fewer item kinds named when it is too wide); hunger, thirst, sleep, social gauges; tool and clothes; the latest thought; the plan (3 lines); `[F] factions · [H] chronicle`. Everything under the load line moved down 22 px.

**Owner:** Claude Code (colonists agent) · **File:** `game/js/plugins/UF_ColonyOverseer.js` · **Load order:** early (before `UF_World`, as registered in `game/js/plugins.js`); it only reads `UF.Colonists` / `UF.Jobs` / `UF.World` at runtime.

## API
- `window.$colonyManager` (adapter over `UF.Colonists`, for older callers such as UF_Construction, UF_Fog, UF_Stance): `colonists` (getter → one stable adapter per colonist: `{ id, name, gender ("Male"/"Female"), mood, hunger, thirst, fatigue (= sleep), social, currentJob (UF.Jobs.describe or "Idle"), event (its Game_Event or null), unit, visionRadius, thoughts, drafted: false, assignMoveTo(x, y, onArrival) → UF.Colonists.order(move), addThought(text, strength) }`), `selectedColonist`, `select(adapter | unitId)`, `deselect()`, `cameraFollowUnit` (an adapter; the view centres on its event), `isOverseerMode`, `societyProgress` (getter → `{ steps: UF.Colonists.planStatus(), text: UF.Colonists.planText() }`).
- `UF.Overseer`: `card()` → the card window, `cardLoadText()` → the load line as last drawn on the card ("" when it carries nothing or no card is shown), `loadRect()` → the band of the card's contents where the load line's letters are (`{ x, y, w, h }`, for checks that count its pixels), `colonistAt(mapX, mapY)` → the adapter under a map cell or null, `CARD_W`, `CARD_H`, `LOAD_Y`.
- `Scene_Map.prototype.updateOverseerControls()` (per frame), `Scene_Map.prototype.isAnyWindowUnderMouse()`.
- `Game_System.prototype.isTileExplored(mapId, x, y)` / `exploreTile` / `getExploredGrid` (wrappers over `UF.Fog`; with fog off everything is explored).

## State it saves
None of its own. Selection and camera follow are view state (not saved).

## Events (emits / listens)
None. It reads `UF.Colonists` every frame it needs to.

## Keys and mouse
- W/A/S/D and the arrow keys pan the camera (0.35 cells per frame).
- Left-click on a colonist: select it and open the card (the UF_Stance corners follow the selection). Left-click on the ground with a colonist selected: `UF.Colonists.order(id, { type: "move", target })` (buzzer when the cell can't be reached). Clicks over the card, the faction ledger or the chronicle are ignored.
- Right-click: deselect and close the card, unless `UF.Interact.tookCancel()` or `UF.Interact.isOpen()` reports that the context menu took the click.
- The card refreshes every 30 frames while open.

## Assets used
None of its own (windows use the system skin). Colonist sprites are UF_Colonists' (`docs/systems/UF_Colonists.md`).

## Checks (suite `overseer`, on request: `--suite overseer`)
| Check | FAILs when |
|---|---|
| `adapter_lists_colonists` | fewer than 2 adapters, or one lacks an event, a name or numeric needs |
| `click_selects_and_card_opens` | the mouse over a colonist's cell doesn't resolve to it, `select` doesn't set it, the card isn't visible, or the description lacks its name or faction (screenshot `card`) |
| `ground_click_orders_move` | `assignMoveTo` doesn't produce a `move` job owned by the colonist that is its active job |
| `society_progress` | `societyProgress` has no steps or no text with a ":" |
| `deselect_hides_card` | the card stays visible after `deselect` |
| `no_errors` | an uncaught error during the suite |

## Replaced core methods
`Game_Player.prototype.moveByInput` (no protagonist walking), `Game_Player.prototype.updateScroll` (free camera / follow), `Scene_Map.prototype.createMenuButton`, `Scene_Map.prototype.isMenuEnabled`, `Scene_Map.prototype.callMenu` (no menu), `Scene_Map.prototype.processMapTouch` (clicks are orders), `Window_MapName.prototype.open` (no banner), `Sprite_Destination.prototype.update` (no click pulse). Aliases: `Scene_Map.start/update/createAllWindows`, `Sprite_Character.update` (hides events on unexplored cells; colonists always drawn), `Scene_Boot.start`.

## Known limits
- The `EdgePanSpeed` parameter is kept for older settings but there is no edge panning.
- UF_Interact's API for "the menu took this right-click" is assumed (`tookCancel()` / `isOpen()`); until it exists, a right-click that opens the menu also deselects.
- The card's plan line shows at most 3 wrapped lines of the plan text.
- The load line needs UF_Sheet (it words the load); without UF_Sheet the line stays blank.
