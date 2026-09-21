# UF_TimeSpeed

Runs the world faster (×1, ×2, ×4, ×8, ×16, ×32: more game updates per displayed frame while the map runs; never below ×1, no rewind), pauses it on Space (the world stands still, the view keeps working), and gives code game-time timers (`after`/`every` in map updates) so AI follows game time instead of wall-clock time. Status: built 2026-09-18 (16x and 32x added 2026-09-21 per user directive), checks: `timespeed` (24 checks).

**Owner:** Claude Code · **File:** `game/js/plugins/UF_TimeSpeed.js` (badge: `game/js/plugins/UF_DayNight.js`) · **Load order:** after `UF_DayNight`, before `UF_Camera`

## API (`UF.Time`)
| Member | Type | What it does |
|---|---|---|
| `speeds` | `number[]` | The multiplier steps from the `Speeds` parameter, lowest first (always starts with 1) |
| `multiplier()` | `→ number` | The current multiplier |
| `level()` | `→ number` | Index into `speeds` (0 = normal) |
| `setLevel(i)` | `(number) → number` | Sets the step by index, clamped to the list; emits `time:speedChanged`; returns the multiplier |
| `faster()` / `slower()` | `→ number` | One step up / down (never below ×1) |
| `after(frames, fn)` | `(number, () => void) → id` | Runs `fn` once after that many map updates (60 = 1 game minute at UF_Core's default TimeSpeed) |
| `every(frames, fn)` | `(number, () => void) → id` | Runs `fn` every that many map updates |
| `cancel(id)` | `(id) → boolean` | Removes a timer |
| `ticks()` | `→ number` | Map updates since boot. Doesn't advance in menus, during messages or while paused |
| `paused` | `boolean` (getter) | True while the world stands still |
| `pause()` | `→ boolean` | Stops the world; sets `$ufTime.isPaused = true`; emits `time:paused`. Returns false (and emits nothing) if already paused |
| `resume()` | `→ boolean` | Lets the world run; sets `$ufTime.isPaused = false`; emits `time:resumed`. Returns false if it wasn't paused |
| `togglePause()` | `→ boolean` | Pause or resume; returns the new state (true = paused) |

What pause does, exactly (alias of `Scene_Map.prototype.updateMain`): while `paused`, `$gameMap.update` and `$gameTimer.update` are skipped, `$gamePlayer.update(isPlayerActive())` and `$gameScreen.update()` still run. So events, world units (UF_World), fog refresh, the timers above and anything else hung on `Game_Map.update` stand still; the view (the player/cursor), the overseer's WASD pan (it writes the display position from `Scene_Map.update`), zoom (UF_Camera) and the screen tone (UF_DayNight) keep working. `SceneManager.determineRepeatNumber` returns the base count while paused, so the multiplier doesn't apply either. UF_Core's clock stops because `$ufTime.update()` checks `isPaused`.

Pause is a view state: it isn't saved, and `DataManager.createGameObjects` (new game, load) resumes.

## State it saves
None. Speed level, timers and the pause flag are plugin-local and reset at boot (timers are meant for code that re-registers them on the map, e.g. `UF_ColonyOverseer`'s needs ticker).

## Events (`UF.Events`)
| Event | Payload | When |
|---|---|---|
| `time:speedChanged` | multiplier | emits on every `setLevel` |
| `time:paused` | none | emits when the world stops |
| `time:resumed` | none | emits when it runs again |
Listens to nothing.

## Keys and mouse
| Key | Action |
|---|---|
| `]` | faster (`Input.keyMapper[221] = "ufFaster"`) |
| `[` | slower (`Input.keyMapper[219] = "ufSlower"`) |
| Space | pause / resume. Read with a `keydown` listener on `document` for `code === "Space"` (key repeats ignored), only while `SceneManager._scene` is a `Scene_Map` that is active, not busy and not changing, no message is busy, no event is running, and no visible, open `Window_Selectable` in the scene is `active`. `Input.keyMapper[32]` stays `"ok"`, so messages and choices still take Space. |

The badge (UF_DayNight's `Sprite_UFClock`, top right, 300×30): `>> xN` while sped up, `PAUSED` (light red) while paused, hidden at ×1 running when `ShowClock` is off.

## Assets used
None. The badge is text drawn in code on a `Bitmap` (no image files). Also listed in `docs/ASSET_INVENTORY.md` as nothing to replace.

## Checks (suite `timespeed`, a default suite)
| Check | FAILs when |
|---|---|
| `starts_normal` | the multiplier at boot isn't 1 |
| `has_16x_and_32x` | the speed list doesn't include 16 and 32 |
| `no_slower_than_normal` | `slower()` at ×1 gives anything but ×1 |
| `speeds_up` | updates per real second at ×4 aren't more than 1.5 times the ×1 rate (both measured over 1.5 s) |
| `clock_speeds_up` | `$ufTime` gains fewer than 2 game minutes in 1.5 real seconds at ×4 |
| `timers_follow_game_time` | a 30-frame `after` timer fires outside 30–32 frames |
| `clock_shows_speed` | the badge text doesn't contain `x4` while at ×4 |
| `pause_stops_world` | over 70 frames after `pause()`: `ticks()` or the clock minute changes, a walker with a goal changes its `_realX/_realY`, or `$ufTime.isPaused` isn't true |
| `badge_shows_paused` | the badge isn't visible or doesn't read `PAUSED` (or still shows `>> x`) |
| `no_speedup_while_paused` | at ×4 while paused, updates per second reach 2× the measured ×1 rate |
| `view_moves_while_paused` | while paused, 20 frames of simulated D (`Input._currentState.cameraRight`) don't move `displayX`, or `$gamePlayer.moveStraight(6)` doesn't advance the view cell by one, or `ticks()` moved |
| `resume_continues` | after `resume()`: fewer than 60 ticks, the clock minute unchanged, the walker moved less than 3 cells, `$ufTime.isPaused` not false, or `time:paused`/`time:resumed` never fired |
| `badge_clears_on_resume` | the badge still reads `PAUSED` after resume |
| `space_toggles` | a synthetic `keydown` (code `Space`) on `document` doesn't pause, a repeat keydown toggles, a second press doesn't resume, `Input.keyMapper[32]` isn't `"ok"`, or the event was `preventDefault`ed |
| `space_ignored_while_busy` | with `$gameMessage` busy, a Space keydown pauses |
| `controls_widget_exists` | time controls widget sprite is missing or hidden |
| `faster_button_clicks` | clicking faster button doesn't advance multiplier |
| `controls_block_map_click` | clicks over widget are not blocked from reaching map |
| `slower_button_clicks` | clicking slower button doesn't reduce multiplier |
| `reaches_max_speed_32x` | clicking faster button repeatedly does not reach 32x |
| `faster_capped_at_max` | clicking faster button at 32x exceeds 32x |
| `slower_reaches_16x` | clicking slower button from 32x does not step down to 16x |
| `pause_button_clicks` | clicking pause button does not toggle pause state |
| `no_errors` | any uncaught error during the suite |
Screenshots: `timespeed.paused.png`, `timespeed.time_controls_16x.png`, `timespeed.time_controls_32x.png`, `timespeed.time_controls.png`.

## Replaced core methods
None, aliases only: `SceneManager.determineRepeatNumber`, `Game_Map.prototype.update`, `Scene_Map.prototype.updateMain`, `Scene_Map.prototype.update`, `DataManager.createGameObjects`.

## Known limits
- Pause doesn't stop `Scene_Map.update` aliases that do their own work per frame outside `Game_Map.update` (the overseer's panning and clicks, the ledger and chronicle keys, zoom). That's intended for the view; a future plugin that simulates from `Scene_Map.update` instead of `Game_Map.update` or `UF.Time.every` will not pause.
- Map event pages don't refresh while paused (`Game_Map.refreshIfNeeded` runs inside `Game_Map.update`); they refresh on resume.
- The `space_toggles` check can't prove RMMZ's own listener read the synthetic key as `ok` (Chromium may give synthetic events `keyCode` 0); it checks the mapping is intact and the event isn't cancelled, and reports what RMMZ saw in the detail.
- The pause key is fixed to Space (no parameter).
