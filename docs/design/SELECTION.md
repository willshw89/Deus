# SELECTION: drag boxes, group selection and area tools

Status: **design only, 2026-09-19** (Claude Code). Nothing here is built. The build is `game/js/plugins/UF_Select.js`, its page `docs/systems/UF_Select.md`, the catalog key `select`, and new rows in `docs/ASSET_REQUESTS.md`. Every hook into another plugin is an alias or a runtime wrap made from `UF_Select.js`.

Decisions it implements (docs/VISION.md): **V86** (drag boxes to mark areas and select units, like the modern mouse-driven DF), V5 (DF-style designations and orders), V33 (Space pauses; the view still works), V34/V38 (everything clickable, with options), V52 (ranks; the player's orders enter at the top, `docs/design/CHAIN_OF_COMMAND.md` §5.3), V59/V62 (the live action shows in the selected profile, never over heads), V68 (nothing stands on a cell it can't move through), V77/V84 (unlocks and skill gates), V80 (five levels; `docs/design/VERTICAL_WORLD.md`).

---

## 0. In short

- **Left-drag on the map draws a box of whole cells**, from the cell where the button went down to the cell under the pointer. A press only becomes a drag once the pointer reaches another cell. Anything shorter is a plain click, and a plain click does what it does now.
- **With no tool on, the box selects every one of your units inside it**, fliers included, and never anyone else's. Shift adds to the selection. Each selected unit gets the selection corners. A strip above the colonist card lists the group, and the card shows one of them.
- **Orders go to the whole group.** A left-click on the ground moves the group there, spread over free cells around the click. The right-click menu gains "Move here (N)" at the top. Drink, fish and hunt apply to every selected unit. Every other option stays a designation for the band, as it does now.
- **Eleven tools**, picked by key or from a small toolbar left of the speed widget: Chop (C), Gather (G), Pick up (P), Mine (M), Quarry (R), Dig (V), Dismantle (T), Build floor (L), Build wall (B), Mark stockpile (O), Cancel (N). A box drawn with a tool marks every eligible cell in it.
- **A tool uses the same code as the right-click menu.** For each candidate cell it asks `UF.Interact.optionsFor(x, y)` for the tool's option and runs that option. So unlocks and skill gates (V77, V84) apply exactly as they do in the menu, and every skipped cell is counted with the menu's reason.
- **Right-click or Esc backs out one step:** first the box being drawn, then the tool. Esc with no tool clears the selection.
- **Boxes apply to the level on screen** (V80). If the level changes during a drag, the drag is cancelled. Boxes that span several levels are not in this design (§9).
- **Big boxes never stall a frame.** Counting and marking run in time-budgeted batches across frames. Open designations are capped (2,000 by default, in the catalog), because UF_Jobs sorts and copies its whole list (§10).
- **What is saved:** stockpile zones and any area marking still in progress, in `UF.World.state.select`. The selection and the chosen tool are view state and are not saved.

---

## 1. The input side as of 2026-09-19 (what the code does, with evidence)

Line numbers were read on 2026-09-19, early afternoon. UF_Jobs, UF_Interact, UF_Look, UF_Camera and UF_Colonists are claimed by other runs, so their lines may have moved since.

### 1.1 Mouse and keys by plugin

| Input | Who reads it | Where | What happens |
|---|---|---|---|
| Left press | UF_ColonyOverseer | `UF_ColonyOverseer.js:188` `TouchInput.isTriggered()` | On the press frame, not the release: selects the colonist under the pointer (`colonistAt`, :170), or orders the selected colonist to that cell (`UF.Colonists.order` "move", :197). |
| Left press | UF_Sheet | `UF_Sheet.js:1260-1270` | After the whole `Scene_Map.update`, if the trigger is still set and the pointer was not over UI: opens the panel for what the cell holds. |
| Left press on a window | UF_Sheet panel, UF_TimeSpeed widget, Window_Selectable lists | `UF_Sheet.js:1077` `consumeClick()`; `UF_TimeSpeed.js:265-291` `TouchInput.clear()` | The window takes the click and clears the frame's trigger, so the map code never sees it. |
| Right press | UF_Interact | `UF_Interact.js:691-702` `handleMouse`, run before the Overseer through an alias of `updateOverseerControls` (:850-855) | Opens the context menu at the cell. Every cell has at least two options. |
| Right press | UF_ColonyOverseer | `UF_ColonyOverseer.js:204-211` | Deselects, but only when the menu did not open. In practice that means over a window. |
| Mouse wheel | UF_Camera | `UF_Camera.js:154-163` | Zooms (1, 2/3, 1/3), with a 12-frame cooldown. |
| W A S D, arrow keys | UF_ColonyOverseer | `UF_ColonyOverseer.js:127-134, 182-185` | Pans the view, inside `updateOverseerControls`. |
| - = and numpad - + | UF_Camera | `UF_Camera.js:143-146` | Zoom. |
| ] [ | UF_TimeSpeed | `UF_TimeSpeed.js:166-167` | Faster and slower. |
| Space | UF_TimeSpeed (document keydown), UF_Talk (capture phase while a talk is open) | `UF_TimeSpeed.js:192-195`, `UF_Talk.js:1907` | Pause. Turns the page while talking. |
| F, H, I, K | UF_Factions, UF_History, UF_Gumps, UF_Combat | `UF_Factions.js:612`, `UF_History.js:1869`, `UF_Gumps.js:347`, `UF_Combat.js:1017` | Faction ledger, chronicle, paperdoll, test raid. |
| Esc (also X, Insert, numpad 0) | UF_Sheet, UF_Gumps, menus, UF_Talk | `UF_Sheet.js:1268`, `UF_Gumps.js:335`, Window_Selectable | Closes the panel, the paperdoll or the open list. Ends a talk. |
| Shift | UF_DFWorld (legacy) | `UF_DFWorld.js:490` | On press, shows the profile of an event with `_dfProfile` in front of the invisible player. |
| Tab, Enter, Z, Q | RMMZ core | `rmmz_core.js` `Input.keyMapper` | tab, ok, ok, pageup (Q). W's core "pagedown" was replaced by cameraUp. |

### 1.2 What is missing, and what matters for a drag

- **There is no drag-to-pan and no edge scrolling.** The Overseer's `EdgePanSpeed` parameter is "kept for older settings" (`UF_ColonyOverseer.js:10-14`). UF_Camera only zooms. The view moves by WASD and the arrow keys, or by following a unit (`UF_ColonyOverseer.js:223-227`).
- **Clicks act on press.** Both the Overseer and UF_Sheet act on the press frame, so nothing can currently tell a click from the start of a drag. §3 fixes this.
- **The right button has no release in RMMZ.** `TouchInput._onRightButtonDown` only sets `cancelled` (`rmmz_core.js:6291`). A right-drag is impossible without new DOM listeners. The middle button is ignored (:6287). **Left is the only button that can drag.**
- **The pointer only updates after 10 px while the button is held.** `TouchInput._onMove` updates `x/y` only after the pointer has moved more than `moveThreshold` (10 px) from the press point (:6385-6396). `isClicked()` is "released and not moved".
- **"Is the pointer over UI?" has three parts now:**
  - `Scene_Map.isAnyWindowUnderMouse()`: the Overseer's card, the ledger and the chronicle (`UF_ColonyOverseer.js:217`), extended by UF_TimeSpeed (the widget, :306) and UF_Sheet (the panel, :1309).
  - `UF.Look.isOverUI()`: any open window in the window layer (`UF_Look.js` Look.isOverUI). UF_Talk wraps it to return true while a talk is open (`UF_Talk.js:1875`).
  - `UF.Interact.handleMouse()`: true while the menu is open or has just taken a click. UF_Talk wraps it to return true while a talk is open (:1866).
- **Legacy windows sit outside the window layer.** UF_Gumps' container and paperdoll, UF_Dialogue, UF_Crafting and UF_DFWorld's profile are added straight to the scene (`SceneManager._scene.addChild`, e.g. `UF_Gumps.js:312, 326`), so none of the three tests above sees them. UF_Select also scans the scene's direct children for open `Window`s (§3.6).
- **Only one unit can be selected.** `$colonyManager.selectedColonist` holds one colonist (`UF_ColonyOverseer.js:95-121`). UF_Stance draws one selection-corner sprite for it (`UF_Stance.js:316-337`). UF_Stance's `selection_square` check already fails before this work, with and without the spawn guard (`docs/systems/UF_World.md:151`); the cause is not recorded. UF_Stance is Gemini's file, so UF_Select neither changes it nor relies on that check (§5.3).
- **UF_Construction's click mode is dead code.** It aliases `processMapTouch`, which the Overseer replaced with a no-op. Its dock was removed (`UF_Construction.js:178-200`), so it can't collide.

---

## 2. The control map (final)

### 2.1 Mouse

| Gesture | No tool | A tool on | While a box is being drawn |
|---|---|---|---|
| Left press and release in one cell (a click) | Unchanged from the current behaviour. On your unit: select it (the card opens, the panel shows it). On anything else: with 0–1 selected, the Overseer moves the selected colonist and the panel opens for what the cell holds; with 2 or more selected, the **group moves** there (§6.1) and the panel opens as usual. **Shift-click on your unit** adds it to or removes it from the selection. | The tool on that one cell (a 1×1 box). | — |
| Left drag (the pointer reaches another cell) | **Box select**: your units inside replace the selection. **Shift**: they are added to it. An empty box without Shift clears the selection. | **Box mark**: every eligible cell inside gets the tool's job (§7). | The box follows the pointer. WASD and the arrow keys still pan, the wheel still zooms, and the box's first corner stays on its map cell, so boxes larger than the screen are made by panning while holding the button. |
| Right click | The context menu, as it does now. With units selected it also offers "Move here (N)" first, and drink, fish and hunt for the whole group (§6.2). Over a window it deselects, as it does now. | **Leaves the tool.** No menu opens. | **Cancels the box.** The tool stays on. |
| Wheel | Zoom (unchanged). | Zoom. | Zoom; the box keeps its first cell. |
| Press on any UI (toolbar, speed widget, panel, card, group strip, menus, ledger, chronicle, gumps, a talk) | The UI gets the press, as it does now. **Nothing happens on the map for the whole gesture**, even if the pointer is then dragged over the map and released there. | Same. | — |
| Pointer leaves the game canvas while dragging | — | — | **The box is cancelled** ("left the map"). So is a lost button (window blur) or a view level change. |
| Release over a window after a drag that started on the map | — | — | The box is applied. It is made of map cells, and a window drawn over them doesn't change that. |

### 2.2 Keys (all new keys are free; checked in `select.keys_free`)

| Key | Code | Action | Notes |
|---|---|---|---|
| C | 67 | Chop | |
| G | 71 | Gather | |
| P | 80 | Pick up | |
| M | 77 | Mine | |
| R | 82 | Quarry | Q is RMMZ's "pageup" (core `keyMapper[81]`), so it isn't used. |
| V | 86 | Dig | D, I and G are taken (camera, paperdoll, Gather). |
| T | 84 | Dismantle | |
| L | 76 | Build floor | F is the faction ledger. |
| B | 66 | Build wall | Opens the wall-material picker when more than one wall is offered (§7.4). |
| O | 79 | Mark stockpile | S is the camera. |
| N | 78 | Cancel | Cancels designations and removes stockpile-zone cells. |
| The same tool's key again | | Leaves the tool | A toggle, like clicking the lit toolbar button. |
| Esc (and X, Insert, numpad 0, RMMZ's "escape") | 27 | One step back: cancel the box → leave the tool → close the wall picker → (the Sheet panel closes itself, as it does now) → clear the selection | UF_Select acts only when no menu, talk, message or list window is open (§3.7). When it acts, it consumes that Esc so one press does one thing. |
| Shift (held) | 16 | Adds to the selection (drag or click) | UF_DFWorld's Shift profile (§1.1) can still fire when a `_dfProfile` event stands in front of the invisible player. That is a legacy collision, recorded in §15. |

Tool keys are ignored while a drag is in progress, a menu, list window or talk is open, a message is showing, or the scene is not active. That is the same busy test UF_TimeSpeed uses for Space (`UF_TimeSpeed.js:178-190`).

**Keys reserved for the five-level run:** `,` `.` PageUp PageDown Home End. UF_Select never binds them. Note for UF_Levels: RMMZ maps Q to "pageup" as well, so a level change bound to "pageup" also fires on Q.

### 2.3 The toolbar

- A row of 12 buttons, 26×26 at a 28 px pitch, in a 344×32 bar placed **directly left of the speed widget on the same row**. The widget is at (Graphics.width − 200, 42), 192×32 (`UF_TimeSpeed.js:203-204`). On the 816×624 screen the bar is at (264, 42).
- The positions come from the widget's actual `x/y` at creation, with those numbers as the fallback.
- Buttons in order: Select (no tool), Chop, Gather, Pick up, Mine, Quarry, Dig, Dismantle, Build floor, Build wall, Mark stockpile, Cancel. Each shows a code-drawn glyph (the tool's UF_Interact marker colour and glyph where one exists, `UF_Interact.js:73-94`) and its key letter in a corner. The lit button is the current tool.
- **One status line under the bar**, at (264, 78), 232 px wide, up to two 13 px lines. It stays clear of the Sheet panel, which starts at x 500, y 82 on this screen. It shows the tool's hint while a tool is on ("Chop: drag over trees. Right-click or Esc to stop."), and after each box a summary for `summarySeconds` (§7.2).
- The bar is a Sprite on the scene, like the speed widget. It handles its own clicks in its update and clears that frame's trigger (UF_Sheet's `consumeClick` technique). It counts as UI in `isAnyWindowUnderMouse` and in `UF.Look.isOverUI` (§13).
- It is hidden while a talk is open, when not on a world map, and while a message is showing.
- **The pointer:** while a tool is on, the canvas CSS cursor becomes that tool's cursor, a code-drawn 32×32 data URL with a crosshair and the glyph, hotspot (15, 15). It returns to the default cursor when the tool is left. It is not in canvas screenshots, so checks read `Graphics._canvas.style.cursor`.

---

## 3. The gesture engine: how a press becomes a click or a box

### 3.1 States

`idle` → `pending` (a press was claimed) → `dragging` (the pointer reached another cell) → back to `idle`, either applied (release) or cancelled (right-click, Esc, left the canvas, focus lost, level or area changed, scene ended). Area markings that were applied then run as **commits** in a queue (§10), independent of the gesture.

### 3.2 The claim: which presses the map gets

A left press is claimed for the map only when **all** of these hold on its trigger frame, evaluated *after* the windows have updated. That is where the check sits in the frame (§3.8), so a window that took the click has already cleared the trigger.

1. `TouchInput.isTriggered()` is still true and `TouchInput.isPressed()` is true: a real held button.
2. The pointer is not over UI (§3.6).
3. The map is not busy: no context menu open or just closed this frame (`UF.Interact.isOpen()`, `swallowedFrame()`), no talk open, no busy message, the scene is active, and no list window is active (the busy test of §2.2).
4. The pointer is over a valid map cell (`UF.Look.cellUnderMouse()`).

**Claiming clears the trigger for every later reader in the frame.** It is the same `_currentState` swap UF_Sheet uses (`UF_Sheet.js:1077-1079`). So neither the Overseer's select/move nor UF_Sheet's panel acts on the press. UF_Select records `{ sx, sy, cell, z, area, frame, shift }`.

**A trigger without a held button is never claimed.** Examples: a very fast click whose mousedown and mouseup fell in one frame, the synthetic clicks other suites inject by setting `_newState.triggered` (`UF_Sheet.js:1455-1459`), and UF_Select's own replay (§3.4). UF_Select treats these as **complete clicks** and handles them through the click table (§3.5), in the same frame.

### 3.3 Click or drag

- The gesture becomes a **drag** the first time the cell under the pointer differs from the press cell. It stays a drag even if the pointer comes back, which then gives a 1×1 box.
- This rule works the same at every zoom: at zoom 1 a cell is 48 px, at zoom 1/3 it is 16 px. RMMZ's own 10 px threshold is implicit, because the pointer doesn't update before it.
- A release before that is a **slow click**. It goes through the click table (§3.5) at the release frame.

### 3.4 Replaying a slow click

Some slow clicks need the current behaviour (Overseer select or move, the Sheet panel). UF_Select **replays** those: on the next frame, in its outermost `Scene_Map.update` alias before any other reader, it sets that frame's trigger again at the press point (`_currentState.triggered = true`, `TouchInput._x/_y` = the press point). At the end of that frame it restores the pointer position it saved.

The Overseer, UF_Sheet and anything added later then see an ordinary click and run their own code. That is why UF_Select doesn't call them directly: the Sheet's reader lives in its own `Scene_Map.update` alias and reads the trigger *before* the update (`UF_Sheet.js:1261-1262`), so only a real frame trigger reaches it. The replay has no held button, so it isn't claimed again. The cost is one frame (about 17 ms) of latency on slow clicks. Fast clicks don't pay it.

### 3.5 The click table (complete clicks: fast, replayed or synthetic)

Handled in UF_Select's `updateOverseerControls` alias, before the inner chain (UF_Interact, then the Overseer). The table applies only to clicks that pass the claim's conditions 2–4 (§3.2): not over UI, map not busy, a valid cell. Any other click is left alone. For example, a fast click on the colonist card with a tool on marks nothing.

| Condition | UF_Select does | The trigger afterwards |
|---|---|---|
| A tool is on | The tool on the one cell (a 1×1 commit) | Cleared for everyone |
| Shift held, no tool, your unit under the pointer | Toggles it in the selection | Cleared for everyone |
| No tool, 2 or more selected, **not** your unit under the pointer | Group move to that cell (§6.1) | Hidden from the inner Overseer call only, then restored, so UF_Sheet still opens the cell's panel as it does now |
| Anything else | Nothing | Left as it is. The Overseer selects or moves, UF_Sheet opens its panel, and `$colonyManager.select` is wrapped so the selection follows (§5.2) |

For a slow click, "Anything else" and the group-move row replay (§3.4). The first two rows act at the release frame without a replay.

### 3.6 "Over UI", in one helper

`UF.Select.pointerOverUI()` is true when any of these holds:

- `scene.isAnyWindowUnderMouse()`: the card, ledger, chronicle, speed widget and Sheet panel, plus UF_Select's toolbar, group strip and wall picker, which UF_Select adds by alias.
- `UF.Look.isOverUI()`: any open window in the window layer. It is true while a talk is open.
- An open, visible `Window` among the scene's direct children contains the pointer: the legacy gumps, dialogue, crafting and profile windows (§1.2).

The helper is evaluated at the press. A press that fails it is not claimed, so the whole gesture belongs to the UI.

### 3.7 Right-click and Esc precedence

UF_Select's alias of `updateOverseerControls` sees the right-click (`isCancelled`) before UF_Interact's `handleMouse` does:

1. The menu is already open: UF_Select does nothing. The menu closes itself, as it does now.
2. A box is being drawn, with or without a tool: cancel the box and consume the cancel. No menu opens, and the Overseer doesn't deselect.
3. A tool is on: leave the tool and consume the cancel.
4. Otherwise: nothing. UF_Interact opens the menu (with the group options of §6.2), and over a window the Overseer deselects, as it does now.

**UF_Select always calls the inner `updateOverseerControls`**, even when it consumed the click. It only hides the input from it. So WASD panning, which lives inside that function (`UF_ColonyOverseer.js:182-185`), never stops for a frame.

Esc is read in UF_Select's outermost `Scene_Map.update` alias, *before* UF_Sheet and UF_Gumps read it. The steps are in §2.2. UF_Select consumes the Esc it acts on by setting `Input._latestButton = null`, so `Input.isTriggered("escape"/"cancel"/"menu")` is false for the rest of that frame only. It is the key-side twin of UF_Sheet's `consumeClick`. When a menu, list window, talk or message is open, UF_Select leaves Esc to it.

### 3.8 Frame order (who reads what, in order)

```text
SceneManager.updateMain
  Input.update, TouchInput.update            this frame's triggered / released / cancelled
  Scene_Map.update, outermost alias first:
    UF_Select (pre)     replay injection (§3.4); Esc and tool keys (§2.2); lost-button check
    UF_Talk ... UF_Sheet (reads click + over-UI now, acts after) ... UF_TimeSpeed, UF_Camera
      core Scene_Map.update → windows and HUD sprites update:
          Sheet panel, context menu, gumps, speed widget, UF_Select toolbar take their own clicks
      UF_ColonyOverseer: updateOverseerControls()
          UF_Select alias    claim (§3.2), right-click (§3.7), release → click table (§3.5)
            UF_Interact alias   handleMouse (menu)
              UF_ColonyOverseer pan keys; select / move; deselect
    UF_Sheet (post)     map click → panel, only if the trigger is still set
    UF_Select (post)    drag tracking, preview budget (§4.3), commit batches (§10), restore the replayed pointer
  Spriteset_Map.update  → UF_Select selection markers and box/zone overlay (after the character sprites)
```

UF_Select loads **after UF_Interact, UF_Sheet and UF_Talk** (§13). UF_Fire and UF_Test load after it, but neither aliases `Scene_Map.update` or `updateOverseerControls` (checked 2026-09-19), so both of UF_Select's aliases are the outermost ones.

For future plugins: one that reads the left mouse button or Esc on the map must either load before UF_Select, or check `UF.Select.box()` and `UF.Select.tool()` before acting.

---

## 4. The box

### 4.1 Shape

- Whole cells, from the first cell (a map cell on the level and area the drag started on) to the cell under the pointer, both included: `x0 = min, x1 = max`, the same for y, `w = x1 − x0 + 1`.
- Always clipped to the map. The pointer can't reach a cell off the map without leaving the canvas, and leaving the canvas cancels the box.
- The first corner is stored as a map cell, not a screen point. Panning with WASD, zooming with the wheel, or a followed unit moving the view never moves it.

### 4.2 Drawing (interface drawing, no sprite motion)

- **One screen-space overlay sprite**, a child of the Spriteset_Map above the tilemap and below the window layer, with a bitmap the size of the screen.
- It is redrawn only when something changes: the box, the display position, the zoom, the preview's version, or the zone set while a zone tool is on.
- Contents:
  - The box outline, 2 px `#f8fafc`, with a dark 1 px edge so it reads on snow and sand.
  - A light fill: the tool's colour at 10%, or white at 8% when selecting.
  - The **eligible cells in view** tinted in the tool's marker colour at 35%, inset 2 px, from the preview cache.
  - When selecting, a thin outline on each of your units inside the box.
  - **The size label**, 14 px right of and below the pointer and flipped at the screen edges like UF_Look's tooltip. Line 1: `12 × 8`. Line 2: `37 cells` (a tool), `37 marks` (Cancel) or `3 units` (selecting), with `, counting…` until the preview has finished.
- Only cells in view are drawn: at most about 51 × 39 = 1,989 at zoom 1/3 on this screen. The full box is never drawn.
- UF_Look's tooltip is hidden while a box is drawn (`UF.Look.enabled` is set false for the drag and restored after), so it can't cover the label.

### 4.3 The preview count (capped work)

- The count on line 2 is the number of **candidate cells not already marked** (§7.1). For selection it is the number of your units inside.
- Units are counted with one pass over `UF.World.unitsInArea` each time the box changes. That is a few hundred units at most, never the cells.
- Cells are counted **incrementally with a time budget** of `budgets.previewMs` (2 ms) per frame, and at least `minCellsPerFrame` (16) per frame. Results go in a per-drag cache: a `Uint8Array` of 256×256 for the level (unknown / candidate / already marked / not a candidate), cleared when a drag starts. Growing the box only evaluates the new cells.
- A 256×256 box finishes counting over a few dozen frames, and the label says "counting…" until then.
- The preview only runs the cheap candidate test and the already-marked index, never `optionsFor`. Cells refused by a lock or skill gate are counted in the summary after release (§7.2), not in the preview. In the normal case, with no gate, the preview count equals the number marked (`select.tool_chop_area` asserts this).

### 4.4 When a box is cancelled

Right-click, Esc, the pointer leaving the canvas, the button lost without a release (window blur: `TouchInput._onLostFocus` clears the state, `rmmz_core.js:6365`), the view level or area changing, the scene ending, or a talk or message opening. The status line says why ("Box cancelled: the pointer left the map."). Nothing is selected or marked.

---

## 5. Unit selection

### 5.1 Who can be selected

- **Your units only.** `UF.Select.isPlayerUnit(u)` is true when `UF.Colonists.isColonist(u)`, or `u.data.kind === "colonist"`, or `u.data.faction` is `"player"` or the player's faction id (`UF.Factions.player().id`).
- Allied and friendly factions are never selected, even though UF_Stance paints them green (`UF_Stance.js:97-108`). Wildlife and monsters are never selected either.
- A unit is inside the box when its **logical cell** (`unit.x, unit.y` from UF_World) is inside, it is in the same area, and its level (`unit.z`, 0 when absent) is the box's level.
- **Fliers are included.** Selection never looks at standability, passability, event priority or through-flags, so a flier over water or a tree is selected by its cell like anyone else. Transparent or hidden units of yours are selected too; only the marker waits until they're drawn.

### 5.2 The selection model

- `UF.Select` holds an ordered list of unit ids, the **group**. The Overseer's `selectedColonist` stays the **primary**: the first colonist of the group, or the one clicked last. So the card, UF_Interact's personal jobs (`selectedColonistId`, `UF_Interact.js:307`) and UF_Talk's "your portrait" keep working unchanged.
- A group with no colonist in it (other player units only) has no primary. The card hides, and the strip still lists the group.
- UF_Select wraps `$colonyManager.select` and `deselect` on the instance's prototype, so selections made elsewhere keep the group in step:
  - The Overseer's click, UF_Interact's "Select", "Follow with camera" and "Info" all call `select`. When UF_Select didn't make that call itself, the group becomes that one unit.
  - `deselect()` clears the group.
- Box without Shift: the group becomes the units inside. The first colonist in reading order (top row first, then left to right) is the primary. An empty box clears the group.
- Box with Shift: the units inside are added. The primary doesn't change unless there was none.
- Shift-click toggles one unit. Removing the primary makes the next colonist the primary.
- Every 60 frames the group is pruned: units that left the world (`UF.World.unit(id)` null), stopped being yours, or died are removed. Units on another level stay selected, but they get no marker while that level isn't shown.
- **Not saved.** Like the Overseer's selection, it is view state.

### 5.3 What the player sees

- **Selection corners on each selected unit**, drawn by UF_Select in a pooled layer inside the tilemap. Each uses UF_Stance's own bitmap and look: `UF.Stance.selectBitmap()`, `UF.Stance.pulse(frame)` for the same opacity pulse, `UF.Stance.footY`, and z = that unit's stance square z + 1.
- The one unit UF_Stance already marks (`Stance.selectionMarker()` visible with `.character` equal to that unit's event) is skipped, so no unit gets two sprites. If UF_Stance is disabled or absent, UF_Select marks every selected unit.
- Only selected units in view are touched each frame. The cost is O(selected), never O(units on the map).
- **The group strip** is a small `Window_Base` directly above the colonist card (the card's own `x/y`, `UF.Overseer.card()`), 380 px wide and two or three lines tall. It is shown only when 2 or more units are selected.
  - Line 1: `5 selected · Esc clears`.
  - The next lines: the names in group order, separated by " · ", at most 12, then `+N more`. The primary's name is drawn in the system colour.
  - Clicking a name makes that unit the primary (the card switches to it, V59). Shift-clicking a name removes it from the group.
  - The strip counts as UI. It is refreshed every 30 frames and on every group change.
- The card keeps showing one person in full, with the live job (V59). Nothing floats over heads (V62).

---

## 6. Orders for a selection

All unit orders go through `UF.Colonists.order(unitId, spec)`, which is the player's direct order in CHAIN_OF_COMMAND §5.3 point 3: it outranks commanders, survival pre-empts it, and UF_Command records it when that lands. For a player unit that isn't a colonist, UF_Select falls back to `UF.Jobs.create({ ..., owner: id, params: { ordered: true } })`, the same fallback UF_Interact's `personalJob` uses (`UF_Interact.js:327-340`). Designations (tools, and the work options in the menu) stay open jobs for the band. They are the player's orders to the head (§5.3 point 1), so V52 is kept: nothing in this design skips the chain for designated work.

### 6.1 Group move (V68: every unit gets its own free cell)

- **Target cell T** is the clicked cell on the level on screen.
- **Free cells:** a breadth-first search from T over cells that are standable and connected to T. It steps in 8 directions with no corner cutting (V3), in rings of growing Chebyshev distance up to `limits.formationRadius` (12). Within a ring the order is by distance to T, then y, then x, so the result is the same every time.
  - A cell is standable when `UF.Jobs.standable(area, x, y, id)` is true (`UF_Jobs.js:117-137`: ground, no blocking object, no water, nobody there). Pass the id of the group member standing on that cell, if any, so the group's own cells count as free.
  - If T itself can't be stood on (a tree), the search starts from its standable neighbours.
  - The search stops as soon as it has found one cell per member.
- **Assignment:** members sorted by distance to T, then id. The i-th member gets the i-th cell. So the nearest member takes the cell nearest T.
  - Each gets `order(id, { type: "move", target: { area, x, y, z } })`.
  - Members with no cell left are counted: "5 moving; 1 found no free cell."
  - Members on another level get the same order with the target's z. Whether they can get there is UF_Levels' routing; if they can't, the job fails with UF_Jobs' "can't reach it".
- **Shape:** a compact block around the click. The group's formation shape is not kept. Doing that is in §16.
- One sound: `playOk` when at least one order was made, `playBuzzer` when none was.

### 6.2 The right-click menu with units selected

UF_Select augments the menu with the same three wraps UF_Floors and UF_Doors use: `UF.Interact.optionsFor`, `open` and `run` (`UF_Doors.js:366-388`, `UF_Floors.js:376-395`). The wraps apply only when 1 or more of your units are selected.

| Option | With a group selected | Why |
|---|---|---|
| **Move here (N)**, new, first and preselected | Group move (§6.1) | V86: orders apply to all selected. It stays inside the menu because V34/V38 make right-click the options menu. A bare right-click can't also be a move. |
| Drink here | One `drink` order per selected unit: "Drink here (N)" | Personal, each unit drinks |
| Fish here | One `fish` order per selected unit: "Fish here (N)" | Each fishes from its own stand cell (`J.standFor`) |
| Hunt X | One `hunt` order per selected unit on the same prey: "Hunt hare (N)" | A group hunt. When one kills it, the others' plans fail with "nothing to hunt" |
| Eat X | Unchanged (the primary) | One item |
| Chop, Gather, Pick up, Quarry, Mine, Dismantle, Dig, Floor here, Build here, Stockpile here, Haul | Unchanged: a designation for the band | Work on one cell is one job. V52 and CHAIN_OF_COMMAND §5.3: designations are orders to the head |
| Select, Follow with camera, Info, Talk, Inventory, Look, Cancel designation, door options | Unchanged | Not orders to the group |

With exactly one unit selected, "Move here" is offered too, as the same one-unit move the left-click makes. The other rows behave as they do now.

---

## 7. The tools

### 7.1 One pipeline for every marking tool

For each cell of the box, in reading order, within the commit budget (§10):

1. **Candidate test (cheap, per tool, below).** Cells that are not candidates are "not for this tool" and are never listed as skipped. The test may accept too much, because step 4 has the final say, but it must never reject a cell the menu would mark (`select.tool_skips_ineligible` compares them).
2. **Already marked:** a designation of the same job type is already at the cell (for walls, the same `objectId`). Checked against an index built once per commit with one pass over `UF.Jobs.list`. This is not `designationsAt` per cell, which filters the whole job list each time (`UF_Interact.js:275-280`). Such a cell is skipped as "already marked". This is the one rule the area tool adds to the menu, which does allow a second identical designation. That gap goes to UF_Interact's owner as a note (§15).
3. **Limit:** the player's open designations have reached `limits.openMarks`. Skipped as "limit reached".
4. **The menu's own answer:** `opts = UF.Interact.optionsFor(x, y)`, find the tool's option by id.
   - If it isn't there: skipped, "not offered here".
   - If it's disabled (`enabled === false`): skipped with the menu's reason. That is `opt.reason` when it has one, otherwise the text in the label's final brackets, e.g. `Dig (solid rock)` gives "solid rock".
   - Otherwise `opt.run()` creates the job exactly as choosing it in the menu would, including every wrapper other plugins install and whatever faction and z tagging UF_Interact adds.
   - The tool calls `opt.run()` directly, not `UF.Interact.run`, so the menu's per-choice event `interact:chosen` isn't fired thousands of times. UF_Select fires one `select:areaCommitted` per commit instead.

| Tool | Key | Option id it runs | Candidate test | Notes |
|---|---|---|---|---|
| Chop | C | `action:chop` | the object on the cell (`UF.Objects.atIn`) has `actions.chop` | the same test the menu builds its list from (`UF_Interact.js:444-449`), plus the job handler existing |
| Gather | G | `action:gather` | `actions.gather` | |
| Pick up | P | `action:pick` | `actions.pick` | |
| Mine | M | `action:mine` | `actions.mine` | when UF_Levels adds its `mine` designation for solid cells (VERTICAL_WORLD §5.1), the tool's option id list in the catalog gets that id as a second entry |
| Quarry | R | `action:quarry` | `actions.quarry` | |
| Dig | V | `dig` | not water and no blocking object, the condition under which the menu offers Dig (`UF_Interact.js:475-480`) | `diggable()` decides and gives the reason ("solid rock", "no ground to dig") |
| Dismantle | T | `dismantle` | the object has `build` or `ruin` | |
| Build floor | L | `floor:lay` | not water, object absent or passable, the ground not already a floor kind (`UF.Floors.kindAt`, `FLOOR_IDS`) | material: the culture's floor, as the menu's "Floor here (…)" option (`UF_Floors.js:357-371`). If the menu ever offers several floor materials, the picker of §7.4 lists them |
| Build wall | B | `build:<wallId>` from the build list (§7.4) | not water and no blocking object, the condition for "Build here" | the wall chosen in the picker |
| Mark stockpile | O | `stockpile` ("Stockpile here") | not water and no blocking object | also makes a zone (§8). A cell that already holds a stockpile object joins the zone without a job |
| Cancel | N | the equivalent of `cancel` | one pass over the job list, not a per-cell test | §7.5 |

Tool labels are plain verbs (V86). Tools, option ids, keys, candidate tests, colours and hint texts live in the catalog key `select.tools` (§12), so a new menu option can become a tool without code when an existing candidate test fits it.

### 7.2 What the player is told

- After each box: `Chop: 37 marked. Skipped 5: 3 already marked, 2 needs Woodcutting 15.`
- At the limit: `Stopped at the limit of 2,000 marks: 1,204 cells left unmarked.`
- Cancel: `Cancel: 37 marks removed, 6 stockpile cells cleared.`
- Stockpile: `Stockpile 3: 11 cells (1 skipped: not offered here).`
- Group move: `5 moving; 1 found no free cell.`
- Reasons are grouped and counted, largest first. At most three are named, then "and N more". The full per-reason counts are in `UF.Select.lastSummary()` for checks and the system page.
- The summary is shown on the status line for `summarySeconds` (6) and fired as `select:areaCommitted`.
- One sound per commit: `playOk` if anything was marked, else `playBuzzer`.

### 7.3 Unlocks and skill gates (V77, V84)

- **UF_Select never decides a gate itself.** It reads gates from the same places the menu does, so an area tool and the right-click menu can't disagree:
  - the option's `enabled` flag and reason in `UF.Interact.optionsFor` (the DF-mechanics run's UF_Tech greys out locked buildings in the build menu; its skill gates show as disabled options with a reason, or remove the option);
  - `UF.Interact.buildOptions(target)`, the exported function, for the wall list;
  - when present, the query functions the DF-mechanics run exposes. The names asked for are `UF.Tech.canBuild(objectId) → { ok, reason }` and `UF.Skills.canWork(action, objectTypeId) → { ok, reason }`. When those exist, a cell they refuse is skipped with their reason even if a menu wrapper was missed.
- **The dependency (for the DF-mechanics run, also in §15):** a lock must be visible through `UF.Interact.buildOptions` or `UF.Tech.canBuild`, not only in the menu window. UF_Floors and UF_Doors augment submenus only while a menu window is open (`UF_Doors.js:378-386`). A lock added the same way would be invisible to any caller without a window, including this tool.
- The wall picker (§7.4) shows each locked wall greyed out with its reason. Choosing one is refused on the status line and the tool doesn't turn on.
- If a wall locks after the tool was armed, every cell is skipped with the lock's reason. `select.tool_obeys_unlocks` provokes this.

### 7.4 The wall picker

- Pressing B, or clicking Build wall, reads `UF.Interact.buildOptions({ area, x, y, z })` at the view's centre cell and keeps the entries whose object has the `wall` tag. On 2026-09-19 those are `wall_wood` (1 log) and `wall_stone` (2 stone) in the catalog.
- With exactly one enabled wall, the tool turns on at once with that wall.
- With several, a small `Window_Command` opens under the button: `Wooden wall — 1 log`, `Stone wall — 2 stone (locked: …)` with the locked ones disabled. The culture's wall is first, as in the menu (`UF_Interact.js:389-400`). Esc or a right-click closes it.
- The chosen wall stays chosen for the session (not saved). Pressing B again leaves the tool.

### 7.5 Cancel

- One pass over `UF.Jobs.list` collects the designations inside the box on its area and level. Designations are the same set `cancelAt` cancels: owner null, state open, travel or work (`UF_Interact.js:269, 289-295`).
- They are then cancelled in budgeted batches with `UF.Jobs.cancel(id, "cancelled by the player")`, the same call and reason as the menu.
- Jobs that belong to someone (direct orders) are never touched, the same as the menu.
- In the same commit, every stockpile-zone cell inside the box is removed from its zone. A zone left with no cells is deleted. Built stockpile objects stay; removing them is the Dismantle tool's job.
- It is the per-cell `cancelAt` done once for the box, instead of once per cell. That would be O(cells × jobs). `select.cancel_area` checks the result is the same.

---

## 8. Zones

- **Kinds:** only `stockpile` now. V86's "other zone" kinds need a user decision, because no other zone is approved and AGENTS rule 7 says not to invent the game. The code keeps a `kind` field and a catalog table `select.zones`, so a new kind is data plus a candidate test.
- **Record**, in `UF.World.state.select.zones`: `{ id, kind, name, area: { x, y }, z, x0, y0, w, h, cells: "<base64 bitset over w×h>", stores: [] }`.
  - `name` is `Stockpile <n>`, numbered per kind.
  - A 10×10 zone is 13 bytes of bitset. A 256×256 zone is 8 KB, which is about 11 KB of base64.
- **How it works with the game now:** each zone cell is the same job as "Stockpile here", a `build` job for the `stockpile` object (no items, work 20; catalog `objects.stockpile`). When the job is done, UF_Colonists adds the cell to `colony.stockpiles` exactly as it does for the menu (the `build` case of its job-done handler, `UF_Colonists.js` near line 1346 on 2026-09-19; the file is being edited by another run, so the line moves). Hauling and the larder use it with no change anywhere. `stores` is passed in `params.stores` when a zone has a filter. Setting filters is not in this design (§16), so it is empty, which means "anything".
- **Each drag makes one zone.** Zones are not merged.
- **The overlay** is drawn only while Mark stockpile or Cancel is on: each zone on the area and level on screen gets its cells in view tinted `#86efac` at 25%, and its name at its first cell. It uses the same overlay bitmap as the box and is redrawn on change.
- The built stockpile objects are always visible (UF_Objects' `UF_GenStockpile`). The zone overlay adds the grouping and the name.

---

## 9. Five levels (V80)

- **One helper, `UF.Select.viewZ()`.** It returns `UF.Levels.viewZ()` when UF_Levels exposes it. Otherwise it returns `UF.World.state.view.z` when that is a number (VERTICAL_WORLD §3.1 names `state.view = { x, y, z }`), and 0 otherwise. Every z UF_Select reads or writes goes through it. Units, jobs and zones without a `z` count as 0.
- **A box belongs to one level:** the level on screen when the drag started. Units are selected only on that level. Marks are made through `optionsFor`, which answers for the level on screen, and UF_Levels is adding z to UF_Interact.
- **If the level on screen changes during a drag, the drag is cancelled** ("Box cancelled: the level changed."). It never quietly spans levels (VERTICAL_WORLD §8: "Multi-level designations are explicit start/end level selections. They never silently affect all five.").
- **A commit only runs while its area and level are on screen**, because `optionsFor` answers for the view. If the player changes level while one is running, it pauses ("Paused: 1,203 cells left on level −1") and continues when that level is shown again. It is saved, so a save in between resumes it (§11).
- **Boxes across several levels are not built.** The design for them, when wanted: hold the button, change level with UF_Levels' keys, release; the box then covers the start and end levels inclusive, its label says "3 levels", and each level's cells get that level's eligibility. It needs UF_Levels' slice 3 (mine, channel, stairs), and it is in §16.

---

## 10. Batching and budgets (no frame stalls)

### 10.1 What runs each frame

| Work | When | Cost bound |
|---|---|---|
| Gesture tracking | every frame while pressed | O(1) |
| Unit count for the label | when the box changes | O(units in the area) |
| Cell preview | while counting | `budgets.previewMs` (2 ms), at least 16 cells |
| Overlay redraw | on change only | O(cells in view) ≤ about 2,000 fills, plus O(selected units in view) |
| Selection markers | every frame | O(selected units in view) |
| Commit (marking or cancelling) | while the queue isn't empty and its level is on screen | `budgets.commitMs` (3 ms), at least 16 cells |
| Group strip refresh | every 30 frames, and on change | O(group) |
| Group pruning | every 60 frames | O(group) |

Nothing scans the whole map or all five levels per frame. The only O(jobs) passes are once per commit: the already-marked index and the cancel collection. Commits are FIFO. A box drawn while another commit runs waits behind it, and the status line shows the remaining count.

Commits run from `Scene_Map.update`, not `Game_Map.update`, so they work while the game is **paused** (V33). The pause stops the world, not the view, and marking while paused is how DF is planned. UF_Time timers are not used for batching, because they stop while paused.

### 10.2 Why there is a cap on open designations

A 256×256 Dig box on open land is about 60,000 candidate cells. UF_Jobs keeps all jobs in one array:

- `update()` copies it every tick: `st.list.slice()`, `UF_Jobs.js:895`. That is up to 8 times per frame at 8x speed.
- `take()` filters it and sorts every open candidate by distance on every call (`UF_Jobs.js:729-734`).
- `of()` does a linear `find` (:621).
- UF_Interact's marker layer filters it every frame (`UF_Interact.js:778`).
- It is saved whole.

So `limits.openMarks` (default **2,000**, provisional) caps the player's open designations from any source. Cells over the limit are skipped as "limit reached" and counted. The build measures the real cost at the cap and lowers the default if needed, all in `select.big_rect_frame_time`:

- `take()` time;
- the frame time at 1x and 8x with colonists idle and taking jobs;
- the marker sync with the view full of marks at zoom 1/3.

Designations that feed out of a pending area as workers free up (DF-style) would remove the cap. They are in §16, because they need pending cells that are not jobs, and V86 asks for the same jobs as the menu.

---

## 11. Saving

- `UF.World.state.select` is saved with the world:
  - `{ version: 1, nextZone: { stockpile: n }, zones: [...], commits: [{ tool, option, params, area, z, x0, y0, x1, y1, cursor, made, skipped: { reason: n } }] }`
  - Plain JSON: bitsets are base64 strings, not typed arrays, so `JsonEx` round-trips them.
- Created on first use. An old save without it gets an empty one. With UF_Levels, zones and commits without `z` are read as 0, which matches VERTICAL_WORLD §9's migration rule (old things go to z = 0).
- Not saved: the group, the primary (already not saved), the chosen tool, the chosen wall, the preview cache, the status line.
- The designations themselves are UF_Jobs' jobs in `state.jobs`, saved as they are now.

---

## 12. Catalog key `select` (proposed shape; written by the build with a layout-preserving script)

```json
"select": {
  "about": "Drag selection and area tools (UF_Select; docs/design/SELECTION.md). Labels are player text; numbers are limits and per-frame budgets.",
  "limits": { "openMarks": 2000, "formationRadius": 12, "stripNames": 12 },
  "budgets": { "previewMs": 2, "commitMs": 3, "minCellsPerFrame": 16 },
  "summarySeconds": 6,
  "colors": { "box": "#f8fafc", "boxFill": 0.10, "selectFill": 0.08, "eligible": 0.35, "zones": { "stockpile": "#86efac" }, "zoneAlpha": 0.25 },
  "tools": [
    { "id": "chop", "key": "C", "label": "Chop", "options": ["action:chop"], "candidates": "objectAction", "hint": "Chop: drag over trees." },
    { "id": "gather", "key": "G", "label": "Gather", "options": ["action:gather"], "candidates": "objectAction", "hint": "Gather: drag over bushes and plants." },
    { "id": "pick", "key": "P", "label": "Pick up", "options": ["action:pick"], "candidates": "objectAction", "hint": "Pick up: drag over loose stones and sticks." },
    { "id": "mine", "key": "M", "label": "Mine", "options": ["action:mine"], "candidates": "objectAction", "hint": "Mine: drag over rock and ore." },
    { "id": "quarry", "key": "R", "label": "Quarry", "options": ["action:quarry"], "candidates": "objectAction", "hint": "Quarry: drag over stone." },
    { "id": "dig", "key": "V", "label": "Dig", "options": ["dig"], "candidates": "openLand", "hint": "Dig: drag over ground." },
    { "id": "dismantle", "key": "T", "label": "Dismantle", "options": ["dismantle"], "candidates": "built", "hint": "Dismantle: drag over buildings." },
    { "id": "floor", "key": "L", "label": "Build floor", "options": ["floor:lay"], "candidates": "floorable", "hint": "Build floor: drag over ground." },
    { "id": "wall", "key": "B", "label": "Build wall", "options": ["build:<wall>"], "candidates": "openLand", "picker": "wall", "hint": "Build wall: drag where the walls go." },
    { "id": "stockpile", "key": "O", "label": "Mark stockpile", "options": ["stockpile"], "candidates": "openLand", "zone": "stockpile", "hint": "Mark stockpile: drag over free ground." },
    { "id": "cancel", "key": "N", "label": "Cancel", "options": ["cancel"], "candidates": "designations", "hint": "Cancel: drag over marked work." }
  ],
  "zones": { "stockpile": { "label": "Stockpile", "option": "stockpile" } }
}
```

Code defaults mirror this, so the plugin works when the key is missing. `select.keys_free` validates the keys at boot. A key another plugin already uses is refused, and the check shows it.

---

## 13. Hooks (aliases and runtime wraps only) and load order

- **Load order:** `UF_Select` goes directly after `UF_Talk`, which puts it after UF_Interact and UF_Sheet, and before UF_Fire and UF_Test. Header: `@base UF_World`, `@base UF_Jobs`, `@base UF_Interact`, `@orderAfter UF_Interact`, `@orderAfter UF_Sheet`, `@orderAfter UF_Talk`.
- **The build reports these two edits.** It does not make them in `game/`, because the RMMZ editor is open:
  - The `plugins.js` entry: `{"name":"UF_Select","status":true,"description":"[UF Select] Drag a box to select your people, or pick a tool and drag to mark every eligible cell (chop, gather, pick up, mine, quarry, dig, dismantle, build, stockpile, cancel).","parameters":{}}`.
  - `tools/register_world_plugins.js`: `"UF_Select"` inserted in `ORDER` between `"UF_Talk"` and `"UF_Fire"`, and the same description in `DESCRIPTIONS`.
- **Aliases at load:**
  - `Scene_Map.prototype.update`: pre part (replay, keys, Esc) and post part (drag, preview, commits).
  - `Scene_Map.prototype.updateOverseerControls`: claim, right-click, click table. Guarded: when UF_ColonyOverseer is absent, the same handler runs from the `Scene_Map.update` alias, the way UF_Interact does it (`UF_Interact.js:856-862`).
  - `Scene_Map.prototype.createDisplayObjects`: the toolbar, the status line, the group strip, the wall picker's holder.
  - `Scene_Map.prototype.isAnyWindowUnderMouse`: the toolbar, strip and picker count as UI.
  - `Scene_Map.prototype.terminate`: drop the gesture and restore the cursor and `UF.Look.enabled`.
  - `Spriteset_Map.prototype.createCharacters`: the marker layer and the overlay.
  - `Spriteset_Map.prototype.update`: sync them.
  - `Scene_Boot.prototype.start`: install the runtime wraps and register the suite.
- **Runtime wraps at `Scene_Boot.start`,** when every plugin has loaded:
  - `UF.Interact.optionsFor`, `open` and `run`: the group options of §6.2, in the UF_Doors/UF_Floors pattern.
  - `UF.Look.isOverUI`: the toolbar and strip count as UI.
  - `$colonyManager`'s prototype `select` and `deselect`: keep the group in step.
- **Changes to RMMZ's input state:** the same two local techniques other UF plugins already use. The trigger/cancel swap on `TouchInput._currentState` is UF_Sheet's `consumeClick`. The one-frame key consume is `Input._latestButton = null`. Beyond that, UF_Select only sets the frame's trigger and `x/y` for a replay (§3.4). It never calls `TouchInput.clear()` or `Input.clear()`.
- **Nothing in RMMZ's core or `libs/` is touched.** No other plugin file is edited. UF_Stance, UF_TimeSpeed and UF_Visuals (Gemini), UF_Walls, UF_Doors, UF_Floors and UF_Ownership (Codex), and the files the five-level and DF-mechanics runs claim are used only through their public APIs.

**Public API (for the system page):**

- `UF.Select.viewZ()`, `isPlayerUnit(u)`, `pointerOverUI()`;
- `selected()` (ids), `primary()`, `setSelection(ids, { add })`, `clearSelection()`;
- `tool()`, `setTool(id, params)`, `tools()`;
- `box()` (the live box or null), `groupMove(cell)`;
- `commits()`, `zones()`, `zoneAt(x, y, z)`, `lastSummary()`, `stats()`: `{ previewMs, commitMs, worstFrameMs, frames }`.

**Events:** `select:changed`, `select:toolChanged`, `select:boxStarted`, `select:boxCancelled` (reason), `select:areaCommitted` (summary), `select:zoneCreated`, `select:zoneChanged`.

---

## 14. Checks (UF_Test suite `select`, not in the default set)

### 14.1 Rules for this suite

- **Real mouse path.** Every gesture is driven by dispatching DOM events on `document`: `mousedown`, `mousemove` and `mouseup` `MouseEvent`s with `button` and `clientX/clientY`. These reach TouchInput's own listeners, the same handlers the browser calls (`rmmz_core.js:6254-6316`).
  - Page coordinates are the inverse of `Graphics.pageToCanvasX/Y`: `page = canvas × Graphics._realScale + canvas.offsetLeft/Top` (:674-697).
  - A move is sent in steps that cross RMMZ's 10 px threshold, with `await t.waitFrames(1)` between events.
  - Keys (C, Shift, Esc) are `KeyboardEvent`s with `keyCode` on `document`, which reach `Input`'s listener.
  - No check calls UF_Select's functions in place of a gesture. Functions may only be read to judge the result.
- **The real pointer can't interfere.** While the suite runs, a capture-phase listener on `window` drops *trusted* mouse events, so the tester's own mouse can't change the result. It is removed in cleanup.
  - UF_Look instead replaces TouchInput's handlers (`UF_Look.js:516-520`). That would bypass the path these checks must use, so it is not used here.
- **Fixtures:**
  - A fixed seed, a fresh world, and an arena of cleared land near the home site, found like UF_Sheet's (`UF_Sheet.js:1430-1447`).
  - Units: the player's colonists from the start, placed in the arena; `TEST_` units of the player's faction (one with `data.flies: true`); 1 `TEST_` person of an allied faction; 1 wild animal.
  - Oaks placed at known cells, one water cell.
  - Colonist decisions off (`UF.Colonists.setEnabled(false)`) and the world paused, except where a check needs units to walk.
  - Zoom 1 for gestures, 1/3 for the big box.
- **Cleanup** restores objects, units, jobs made, zones, the view, the zoom, the pause and the colonists' decisions. It also removes the input guard.
- **Provoking FAIL:** a plugin parameter `TestProvoke` (a comma list of check names, or "all"), read only when `UF.Test.active`. It is set only in a snapshot's `plugins.js`, never in `game/`. This is UF_Talk's pattern (`UF_Talk.js:121-123`). The build runs the suite once with each provocation and quotes each FAIL line in its report.

### 14.2 The checks

| Check | Driven by | Passes when | Provoked FAIL (`TestProvoke`) | Screenshot |
|---|---|---|---|---|
| `select.box_units` | Left-drag over a box holding 3 of the player's units (2 colonists and the `TEST_` flier), the allied person, the wild animal; 1 player unit outside | The group is exactly the 3 (flier included; allied, wild and outside never). The primary is a colonist and the card shows it. The strip lists 3 names. Each of the 3 has exactly one visible selection-corner sprite at its feet (`x = screenX`, `y = footY`, z = its stance square z + 1), UF_Stance's or UF_Select's. Mid-drag, the label read from the overlay's model says `W × H` and `3 units`. | `box_units`: the faction filter is skipped, so the allied person is selected | `select.box_drag` (mid-drag, label visible), `select.group_selected` |
| `select.shift_adds` | Box A (2 units), then Shift held + box B (1 unit); then box B without Shift; then Shift-click on a unit of the group | {A, B} after the Shift box; {B} after the plain box; the Shift-click toggles one unit out and back in. The markers follow the group each time. | `shift_adds`: Shift is ignored, so box B replaces the group | — |
| `select.plain_click` | No tool: a slow click (down, wait 5 frames, up) and a fast click (down and up before the next frame) on a colonist; then a click on ground with that one colonist selected | Both clicks select the colonist through the Overseer: `$colonyManager.selectedColonist`, card visible, UF_Sheet panel open for that unit, group = [that unit]. The ground click makes one `move` job (`params.ordered`) for that colonist to that cell. The Overseer's and UF_Sheet's behaviour is unchanged by the deferral. | `plain_click`: the replay is dropped, so nothing is selected | — |
| `select.group_move` | 5 selected; left-click a ground cell T with a boulder on one neighbour and water on another; then right-click another cell and click the menu's first row | Each of the 5 has a `move` job from `UF.Colonists.order` (or the non-colonist fallback) to **distinct** cells. Every target was standable at order time and connected to T within the radius, T included. Blocked and water cells are not used. The primary's job is its own cell, so the Overseer didn't also send it to T. After unpausing, all 5 stand on distinct cells within 30 s. The menu's first row reads `Move here (5)`, and choosing it does the same. `Drink here (5)` makes 5 drink orders. | `group_move`: every unit is sent to T itself, so the distinct-cells test fails | `select.group_moved` |
| `select.tool_chop_area` | Key C (keydown), drag over a 12×8 box holding N oaks and bare cells, release, wait for the commit | Exactly N `chop` designations (owner null, state open) at exactly the oak cells, each with a visible UF_Interact marker (`UF.Interact.markerAt`). The mid-drag label said `12 × 8` and `N cells`, and the preview count equals N. The summary says `N marked`. The canvas cursor is the chop cursor while the tool is on. | `tool_chop_area`: the commit skips the box's last row, so the count is off | `select.chop_marked` |
| `select.tool_skips_ineligible` | Chop over a box with: an oak already designated; an oak whose chop option a test wrapper on `UF.Interact.optionsFor` disables with reason `TEST_gate`; a stump; water; bare ground. Then Dig over rock. | Marked = only the eligible oaks. Skipped counts by reason are exactly `already marked: 1`, `TEST_gate: 1`, and (dig) `solid rock: k`. Stump, water and bare ground are not listed. For every cell of the box, "the menu offers an enabled `action:chop`" ⇔ "marked, or already marked": the candidate test never rejects a cell the menu would mark. The status text names the reasons. | `tool_skips_ineligible`: disabled options are run anyway, so a job appears at the `TEST_gate` oak | `select.skips_summary` |
| `select.tool_obeys_unlocks` | Build wall: with UF_Tech present, a wall the fresh faction hasn't unlocked; without it, a test wrapper on `UF.Interact.buildOptions` disabling `wall_stone` with `locked: TEST`. Press B, try to pick it, then drag with an unlocked wall after locking it mid-way. Mine on a cell whose option is skill-gated (the real V84 gate when UF_Skills exposes one, else a wrapper with `needs Mining 15 (TEST)`). | The picker shows the locked wall disabled with its reason. Choosing it leaves the tool off and puts the reason on the status line. The drag after locking makes 0 `build` jobs, and every candidate is skipped with the lock's reason. The Mine box skips the gated cell with the gate's reason and marks the others. The detail says which gate path was used (real or test wrapper). | `tool_obeys_unlocks`: `enabled === false` is ignored, so build jobs appear | — |
| `select.zone_saved` | Key O, drag a 4×3 box holding one water cell and one existing stockpile object | One zone `Stockpile n` with 11 cells: water skipped, "not offered here". 10 `build` jobs with `objectId: "stockpile"`, the existing stockpile cell joining without a job. The overlay is visible while the tool is on (a pixel inside the zone differs from the same pixel with the tool off, toward `#86efac`) and hidden with the tool off. After a `JsonEx` round-trip of `UF.World.state`, and after swapping `state.select` for the copy, the zone reads back identical and draws again. | `zone_saved`: the zone isn't written to the state, so the round-trip loses it | `select.stockpile_zone` |
| `select.cancel_area` | Designations (chop, dig, build) inside and outside a box, an **owned** move job inside, zone cells inside; key N, drag, release | Every designation inside is `failed` with "cancelled by the player", and its marker is gone. Every one outside is untouched. The owned job is untouched. The zone cells inside are removed, and a zone left empty is deleted. The result equals calling `UF.Interact.cancelAt` on each inside cell of a copy of the state (compared by job id). | `cancel_area`: the box is shrunk by one row, so an inside designation survives | — |
| `select.no_clickthrough` | Presses on the toolbar, the speed widget, the open Sheet panel, the colonist card, the group strip, the open context menu, and a legacy gump window; each dragged across units and oaks and released on the map; the same with the Chop tool on | No change to the group, no new jobs, no Overseer move, no change of panel subject, no zone, no box drawn. Each window still got its own press (e.g. the toolbar button changed the tool, the speed widget changed the speed). | `no_clickthrough`: the over-UI test is skipped at the press, so a box selects units | — |
| `select.leave_tool` | Chop on; right-click on the map → the tool is off and no menu opened. Chop on, drag started, right-click → the box is cancelled and the tool stays on. Esc → the tool is off. Esc with no tool → the group is cleared. The same key twice → on, then off. | Each step as stated. The context menu never opened. The Overseer didn't deselect on the tool right-clicks. WASD panning ran on every frame of these steps (the display position changed while D was held). | `leave_tool`: the right-click isn't consumed, so the menu opens | — |
| `select.level_scope` | With UF_Levels: start a drag on level 0 and change the level with its API; mark a box and check the jobs' z. Without it: the same with `state.view.z` set for the test and restored. | The drag is cancelled with "the level changed". Every job made has `z === viewZ()` (or no z, with viewZ 0). Units on another level are not selected. A commit pauses while its level isn't shown and resumes when it is. | `level_scope`: the level change is ignored, so the drag survives | — |
| `select.keys_free` | Boot | Each tool key maps to UF_Select's own name in `Input.keyMapper`, and no key UF_Select binds was bound before it loaded (recorded at load). | `keys_free`: for the test, the Chop key is set to 75, the code UF_Combat already binds (K), so the collision must show | — |
| `select.big_rect_frame_time` | Zoom 1/3, Chop on, mousedown at the map's top-left cell, pan to the far corner with held D and S keydowns while the pointer sits at the canvas's bottom-right, mouseup over cell (255, 255); record `requestAnimationFrame` intervals for 120 idle frames before and through the whole preview and commit; then the same with Cancel over the whole map | UF_Select's own work per frame (`performance.now` around its update and overlay): worst ≤ 8 ms. No frame interval during the preview and commit is over max(50 ms, 1.5 × the idle worst). Jobs made ≤ `openMarks`, and the "limit reached" count = candidates − made − other skips, exactly. The commit finishes. The report quotes the method: average and worst over the run, units on screen, the machine (ENGINE_RULES §6). | `big_rect_frame_time`: the budgets are ignored and the whole box is done in one frame | `select.big_box` |
| `select.no_errors` | Whole suite | `t.errorsSoFar()` gained nothing during the suite | `no_errors`: a thrown error inside a guarded update once | — |

### 14.3 What else the build must run

The suites whose code paths UF_Select sits in front of:

- `overseer`, `look` (UF_Interact's checks), `sheet`, `timespeed`, `stance`, `talk`, `floors`, `doors`, and `smoke`;
- all on a snapshot with UF_Select added (`node tools/test_snapshot.js --name <label> --plugins UF_Select --no-run`, then `node tools/run_tests.js <suite> --game <dir>`);
- the real title flow (`repro_title.js newgame <name>`) on that snapshot;
- `node --check` on the plugin.

Suites that already fail on a snapshot without UF_Select (e.g. stance `selection_square`) are listed as "fails the same way without it", with both runs quoted.

---

## 15. Risks, dependencies and questions

- **UF_Tech hook (DF-mechanics run).** Locks must be readable without an open menu window: through `UF.Interact.buildOptions` returning `enabled: false` and a reason, or through `UF.Tech.canBuild(objectId) → { ok, reason }`. A submenu augmented only inside `I.run` while a window is open (the UF_Floors/UF_Doors pattern) is invisible to the area tool. Skill gates (V84) should likewise show as disabled options with a reason, or through `UF.Skills.canWork`.
- **UF_Levels API (five-level run).** `UF_Select` needs `UF.Levels.viewZ()`, or `state.view.z`; an event when the view level changes (optional, since UF_Select also polls `viewZ()`); `optionsFor` answering for the level on screen; and z on job targets from `designate`. The keys in §2.2 are reserved for them.
- **The cap (2,000) is not measured yet.** UF_Jobs' `take()` sorts every open candidate on every call. For whoever edits UF_Jobs next (the DF-mechanics run has it claimed), a nearest-k selection there would lift this limit more than anything in UF_Select could.
- **Marker cost in UF_Interact.** The marker layer filters the whole job list every frame and draws one sprite per designation in view. At zoom 1/3 a full-screen box of trees could mean hundreds of sprites. `select.big_rect_frame_time` measures it. If it fails, the fix belongs in UF_Interact (claimed by the five-level run now), not in UF_Select.
- **Duplicate designations from the menu.** The right-click menu offers "Chop down oak" again on an oak that is already designated, and makes a second job. The area tool skips such cells. A note for UF_Interact's owner.
- **UF_DFWorld's Shift.** A legacy plugin opens a profile on a Shift press when a `_dfProfile` event stands in front of the invisible player (`UF_DFWorld.js:490-496`). It can collide with Shift-select, rarely. Retiring that key is the user's call.
- **UF_Stance's `selection_square` fails as of 2026-09-19** (`docs/systems/UF_World.md:151`). UF_Select reuses UF_Stance's bitmap and pulse but has its own marker check. Gemini owns the fix.
- **An empty box without Shift clears the selection** (the RTS convention). If the user prefers that an empty box leaves the selection alone, it is one condition.
- **Right-click never moves units by itself.** V34/V38 make right-click the options menu. If the user wants RTS-style "right-click moves", that changes V34/V38 for the case where units are selected, and needs their decision.

## 16. Not in this design (Backlog candidates, each needs the user's go-ahead)

- Boxes across several levels (§9).
- Pending area designations fed as workers free up, instead of a cap (§10.2).
- Edge scrolling while dragging, and a middle-button drag-to-pan. Neither exists, and neither was asked for; WASD panning during a drag covers big boxes.
- Formations that keep the group's shape.
- Zone settings (what a stockpile stores), and other zone kinds (need approval, AGENTS rule 7).
- Hunt and haul tools, and saved control groups (Ctrl + number).

## 17. Art the tools need (rows the build appends to `docs/ASSET_REQUESTS.md`; code-drawn placeholders until delivered)

| Asset | Spec (short; the build writes the full row) | Placeholder name |
|---|---|---|
| Toolbar icons | 12 icons, 24×24 each, one sheet `img/system/UF_ToolIcons.png` (288×24): Select, Chop, Gather, Pick up, Mine, Quarry, Dig, Dismantle, Build floor, Build wall, Mark stockpile, Cancel; a lit and an unlit look (a second row, 288×48 total) | `UF_GenToolIcon_<tool>` |
| Tool cursors | 11 cursors, 32×32 PNG with a transparent background, crosshair hotspot at (15, 15), the tool's glyph at the lower right: `img/system/UF_Cursor_<tool>.png` | `UF_GenCursor_<tool>` (CSS data URL) |
| Box frame | 9-slice frame, 24×24 with 8 px corners, `img/system/UF_SelectBox.png`, drawn at screen scale over the map | `UF_GenSelectBox` |
| Stockpile zone overlay | 48×48 tile, translucent (reads over grass, sand, snow and dirt), tiled over zone cells, `img/system/UF_Zone_stockpile.png` | `UF_GenZone_stockpile` |
| Selection corners | Already requested as AR-031. No new row. | UF_Stance's `UF_GenSelect` |

No stock RMMZ asset is used, so no stock-replacement row is needed. The group strip and the wall picker use the current window skin.
