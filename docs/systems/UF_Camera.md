# UF_Camera: zooming the map view

**Owner:** Claude Code · **File:** `game/js/plugins/UF_Camera.js` · **Load order:** after `UF_ColonyOverseer` (and `UF_World`), before `UF_Test`

## 1. Purpose
Lets the player zoom the map out to see more of the world (VISION V15). The zoom steps are chosen so pixel art stays exact: with art exported at 3×, zoom 1 shows it at 3×, ⅔ at 2×, and ⅓ at 1× native pixels. The UI (windows, HUD) isn't zoomed.

## 2. Public API (`UF.Camera`)
| Member | Description |
|---|---|
| `levels` | Zoom scales from closest to farthest (default `[1, 2/3, 1/3]`, from the `Levels` parameter) |
| `zoom()` | Current scale (1 = normal) |
| `level()` | Current level index (0 = closest) |
| `setLevel(i)` | Change level. Keeps the view centered on the same map point. Returns `true` if it changed. |
| `zoomIn()` / `zoomOut()` | One step in or out |

Controls: mouse wheel (down = out, up = in; a 12-frame cooldown so one touchpad swipe is one step), `-` / numpad `-` out, `=` / numpad `+` in. Parameter `StartLevel` (default 1 = ⅔).

How it works: the tilemap (which holds the ground and every character sprite) is scaled by the zoom and drawn larger, so it covers the whole screen. `Game_Map.screenTileX/Y` and `canvasToMapX/Y` are divided by the zoom, so scrolling limits, centering, and mouse-to-cell all stay correct. `Game_CharacterBase.isNearTheScreen` is replaced with a zoom-aware copy, so events anywhere in view keep moving.

**For other systems:** screen math must go through `$gameMap.canvasToMapX/Y` and `$gameMap.screenTileX/Y`, never `Graphics.width / 48`. A sprite's real screen position is `sprite.getGlobalPosition()`, because `sprite.x/y` are in zoomed map space.

## 3. Events
`camera:zoomChanged` (new scale), through `UF.Events` when UF_Core has loaded.

## 4. Save data
None. The zoom resets to `StartLevel` when the game starts.

## 5. Checks (UF_Test suite `camera`, a default suite)
| Check | Proves |
|---|---|
| `levels` | The levels parsed correctly, and the closest is 1 |
| `starts_zoomed_out` | The game starts at `StartLevel` (⅔) |
| `level_N_view` | At each level: visible cells = normal ÷ zoom, and the tilemap is scaled and sized to cover the screen |
| `level_N_mouse` | At each level, the canvas center maps to the cell actually drawn there |
| `zoom_out_shows_more` | Each step out shows more cells (221 < 497 < 1989 on the 816×624 screen) |

## 6. Status (2026-09-18)
- **Works:** all 10 checks PASS on a snapshot copy of the game. Screenshots checked at zoom 1 (the glade close-up: Adam, Eve, tree, river) and ⅓ (the whole glade as a small patch among the generated tree clusters). Tiles draw with no seams at any level.
- **Not registered in the real `game/js/plugins.js` yet** (the RMMZ editor is open). Add it in Plugin Manager after `UF_World`, before `UF_Test`.
- **Known limits:** `UF_ColonyOverseer`'s "follow unit" camera centers with a fixed offset (`x − 8, y − 6`) that assumes zoom 1, so at other levels the followed unit is off-center. Fix when the cursor replaces that camera (Slice 0, deliverable 7). While scrolling at ⅔, pixel columns can briefly be uneven, because 3× art is resampled mid-scroll. At rest it's exact.
