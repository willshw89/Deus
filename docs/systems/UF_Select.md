# UF_Select
Drag-box selection for units, Shift multi-selection toggle, plain-click ground movement with multi-unit group formation pathfinding, area job designations (chop, gather, pick, mine, quarry, dig, dismantle, floor, wall, stockpile, cancel), bitset stockpile zones, and toolbar UI.

Status: built 2026-09-19. Checks: `select` (15 checks, all PASS on snapshot `select_test`; provoked failure run 0/15 PASS; worst frame time 3.13 ms <= 25 ms budget).

**Owner:** Claude Code · **File:** `game/js/plugins/UF_Select.js` · **Load order:** after `UF_World`, `UF_Objects`, `UF_Items`, `UF_Jobs`, `UF_Floors`, `UF_Walls`, `UF_Colonists`, `UF_Interact`, `UF_Camera`; before `UF_Test`.

---

## 1. System Overview & Architecture

`UF_Select` implements player interaction for selecting units and issuing area designations over map geometry. It fulfills the requirements of VISION V86:
- Left-click drag boxes dynamically select player-controlled units or designate bulk jobs.
- Plain left-click on a colonist selects them; clicking on open ground with selected units dispatches movement.
- Shift modifier supports union/toggle selection behavior.
- Group movement uses Euclidean-sorted Chebyshev ring targets to dispatch non-overlapping destinations.
- Area designation tools support batch work orders (chop, gather, pick, mine, quarry, dig, dismantle, floor, wall, stockpile, cancel) with progressive frame budgets preventing hitching on large rectangles (up to $30\times 30$).
- Bitset-encoded stockpile zones persist in world state via `JsonEx`.
- Drag operations are scoped strictly to the current vertical Z-level (`SelectAPI.viewZ()`); switching levels immediately cancels any active drag.

---

## 2. Controls, Hotkeys & Toolbar

The top HUD contains a compact toolbar (`Window_UFSelectToolbar`) positioned alongside game speed controls. The toolbar presents active tool state, hotkey glyphs, and tooltips.

| Tool | Hotkey | Action / Effect | Eligible Targets |
|---|---|---|---|
| **Select** | `Space` / `Escape` | Box selection of player units | Colonists, pets, player-faction units |
| **Chop** | `C` | Mark trees for felling | `oak`, `pine`, `birch`, `willow`, etc. |
| **Gather** | `G` | Gather wild plants & crops | Harvestable plants, herbs, bushes |
| **Pick** | `P` | Pick up loose items | Ground items (`UF_Items`) |
| **Mine** | `M` | Mine natural stone/ore | Boulders, mineral veins, rock faces |
| **Quarry** | `R` | Quarry surface stone & gravel | Rubble, loose stones, quarry deposits |
| **Dig** | `V` | Excavate ditches / channels | Diggable soil & earthen terrain |
| **Dismantle**| `T` | Demolish built structures | Player walls, floors, doors, furniture |
| **Floor** | `L` | Lay designated flooring | Open passable terrain |
| **Wall** | `B` | Erect designated walls | Buildable perimeter tiles |
| **Stockpile**| `O` | Designate storage zones | Flat walkable ground |
| **Cancel** | `N` | Cancel pending designations | Open/unclaimed jobs, stockpile cells |

### Gesture & Click Handling
- **Plain Drag**: Initiates when mouse movement exceeds 5 screen pixels while holding Left Button. Draws a tinted selection or tool bounding box with live candidate count.
- **Shift + Drag / Shift + Click**:
  - Without tool: Toggles/unions units into the current selection set.
  - With tool: Appends designations to existing jobs.
- **Right-Click**: Cancels current drag; if no drag is active, clears the active tool and returns to unit selection. Does not bleed through to context menus (`UF_Interact`).
- **Clickthrough Guard**: Dragging or clicking starting over UI windows (`Window_UFSelectToolbar`, colonist cards) never triggers map selection or designations.

---

## 3. Group Movement Formation

When multiple units are selected and the player clicks a destination cell $T = (x_T, y_T)$:
1. Sorts selected units by Euclidean distance to $T$ so closest units claim nearest spots.
2. Iterates outward in concentric Chebyshev rings:
   $$\text{ring } r = 0, 1, 2, \dots, R$$
   where cell offset $(\Delta x, \Delta y)$ satisfies $\max(|\Delta x|, |\Delta y|) = r$.
3. Checks cell validity via `UF.World.isPassable(area, x, y, z)` and ensures no other unit in the group has claimed the slot.
4. Issues a direct `"move"` job to each unit via `UF.Jobs.create({ type: "move", owner: u.id, target: { area, x, y, z } })`.
5. Displays a temporary confirmation notification (e.g. `"5 moving"`).

---

## 4. Progressive Commit & Performance Budgets

To ensure silky frame rates when dragging large boxes (e.g. $30\times 30 = 900$ tiles):
- **Preview Budget (`previewMs = 2 ms`)**: Incremental candidate tile scanning and caching (`Uint8Array`) during drag so mouse movement remains 60 FPS.
- **Commit Budget (`commitMs = 3 ms`)**: Bulk job creation is segmented into batches processed across sequential frames via `commitBatches`.
- **Worst Frame Time**: Automated benchmark of a full $30\times 30$ box confirmed $3.13\text{ ms}$, well under the $25\text{ ms}$ budget.

---

## 5. Stockpile Zones & Persistence

- Stockpile zones are stored in `UF.World.state.select.zones`.
- Each zone records:
  - `id`: Unique zone ID (`zone_<timestamp>_<rand>`).
  - `name`: Display name (`"Stockpile 1"`).
  - `area`: Area coordinate object `{ x, y }`.
  - `z`: Vertical level index.
  - `bounds`: Bounding rectangle `{ x0, y0, x1, y1 }`.
  - `bitset`: Run-length / bitset array encoding cell inclusion within the bounding box.
- Zones render on screen whenever the Stockpile or Cancel tool is active, displaying a tinted overlay with cell borders and name badge.
- Fully serializable via `JsonEx` across game save/load cycles.

---

## 6. Public API Reference (`UF.Select`)

| Method / Property | Description |
|---|---|
| `selected()` | Returns array of selected unit IDs (`number[]`). |
| `select(ids, opts)` | Sets or updates current selection. `opts.shift` enables union/toggle. |
| `clear()` | Clears current unit selection. |
| `tool()` | Returns active tool ID (`string` or `null`). |
| `setTool(toolId, opts)` | Sets active designation tool (`"chop"`, `"wall"`, etc.) with optional parameters. |
| `box()` | Returns active dragging box `{ x0, y0, x1, y1, tool, area, z }` or `null`. |
| `cancelBox(reason)` | Aborts current drag box. |
| `zones()` | Returns array of stockpile zones for the current area and Z-level. |
| `lastSummary()` | Returns stats of last committed drag (`{ made, skipped }`). |
| `commits()` | Returns array of pending commit batches. |
| `registeredKeys()` | Returns dictionary of hotkey registrations and collision checks. |
| `viewZ()` | Returns current active Z-level from `UF.Levels` or `UF.World`. |

---

## 7. Verification & Automated Tests

Suite `select` runs 15 checks via `tools/test_snapshot.js --name select_test --plugins UF_Select --suite select`:
1. `select.box_units`: Drags box around units and asserts player colonists and pets are selected while allied guards, wild animals, and outside units are excluded.
2. `select.shift_adds`: Verifies Box A, Shift+Box B, plain Box B, and Shift-click toggle.
3. `select.plain_click`: Verifies single-click unit selection and subsequent ground click dispatching a move job.
4. `select.group_move`: Verifies 5 selected units clicking near an obstacle dispatch to 5 distinct destination cells in Chebyshev formation rings.
5. `select.tool_chop_area`: Verifies hotkey 'C' and drag felling 4 designated oaks.
6. `select.tool_skips_ineligible`: Verifies skipping already designated cells and options gated by action predicates.
7. `select.tool_obeys_unlocks`: Verifies `UF.Tech.canBuild` locks reject designations and record reasons in commit summary.
8. `select.zone_saved`: Verifies stockpile zone creation and lossless `JsonEx` serialization round-trip.
9. `select.cancel_area`: Verifies hotkey 'N' cancels unowned area designations without terminating owned in-progress jobs.
10. `select.no_clickthrough`: Verifies drags beginning over UI windows never select map tiles or units.
11. `select.leave_tool`: Verifies right-click clears the active tool without opening context menus.
12. `select.level_scope`: Verifies switching Z-levels mid-drag cleanly cancels the box.
13. `select.keys_free`: Verifies no conflicting hotkey bindings.
14. `select.big_rect_frame_time`: Verifies $30\times 30$ box commit executes within frame timing budget ($3.13\text{ ms} \le 25\text{ ms}$).
15. `select.no_errors`: Verifies zero console errors thrown across the entire suite.

All 15 checks have been verified with clean passes (15/15 PASS) and provoked failures (`UF_TEST_PROVOKE = "select.all"`, 0/15 PASS, exit 1).
