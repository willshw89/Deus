# UF_Speech
Over-head speech (VISION V62): remarks, barks, shouts in a fight, leaders' orders and thoughts float as plain text above the speaker's head, in the old game's manner. There is no bubble and no box, just the game font with a dark outline. The text follows the speaker as they walk and fades out. Every existing bark (`UF_Visuals.bark`, `UF.Visuals.bark`: UF_Colonists' reproduction lines, UF_Jobs' work verbs, UF_NPCSchedules, note-tag barks, the `Bark` plugin command) is drawn by UF_Speech, and UF_Visuals' own bubble is no longer made. Conversations the player opens (portrait, keywords) are UF_Talk's, not this.

Status: built 2026-09-19. Checks: `speech`, 14 checks, run on request (`--suite speech`). The final code passed 14/14 on snapshot copies of `game/` on 2026-09-19, including a fresh snapshot made after the copy-back. Each check was seen failing on a deliberately broken copy (mutants M1–M5, see Checks). With UF_Speech loaded, `smoke` passed 13/13. `colonists` ran 20/21: `plan_reads_the_site` failed, and it failed the same way in a control run without UF_Speech. **Not checked:** the editor's Playtest (F5) and its console (F8). **Not yet registered in the real `game/js/plugins.js`** (that is the Land task). It goes after `UF_Visuals` and `UF_Camera`; the snapshot runs placed it after `UF_Fire`, before `UF_Test`.

**File:** `game/js/plugins/UF_Speech.js` · **Load order:** after `UF_Visuals` and `UF_Camera`, before `UF_Test`. Also uses `UF_World`, `UF_TimeSpeed` and `UF_Colonists` when they are present; each one is optional. **Catalog:** `speech`, a top-level key of `data/UF_WorldCatalog.json`, added by `tools/add_speech_catalog.js`. Built-in defaults apply when the key is missing.

## API (`UF.Speech`)
| Member | Description |
|---|---|
| `say(speaker, text, opts?)` | Shows `text` above the speaker. `speaker` is a unit id, a unit record, a `Game_Event` (a unit's event counts as the unit), `$gamePlayer` or any other `Game_Character`. `opts`: `kind` = `"remark"` (default), `"bark"`, `"shout"`, `"order"` or `"thought"`; `color` (CSS colour, overrides the kind's); `frames` (duration; default `framesBase + framesPerChar × characters`, at most `framesMax`, i.e. 90 + 4 per character up to 480; an explicit value is used as given, 1–3600); `queue` (default `true`: waits behind what the speaker is already saying; `false` replaces it at once). Returns the ids of the lines the text became, or `null` when nothing is shown: empty text, an unknown speaker, a speaker not on the map on screen, or `speech.enabled` false. The same text and kind already on show or waiting for that speaker is not added again; the ids of the existing lines are returned. Emits `speech:said(speakerKey, text, kind)`. |
| `clear(speaker?)` | Removes the speaker's line and its queue at once (no fade). With no argument, clears everyone. Returns how many lines went. |
| `lines(speaker)` | The speaker's line on show, then the queued ones: copies `{ id, speaker, group, text, rows, kind, color, frames, age, state: "showing" \| "queued", w, h }`. |
| `isSpeaking(speaker)` | Whether the speaker has a line on show or waiting. |
| `active()` | Copies of every line on show, oldest first. |
| `wrap(text)` | The lines the text would become: `[[row, ...], ...]`. Each row holds at most `maxChars` characters, each line at most `maxLines` rows. Words longer than a row are cut. |
| `framesFor(text)` | The default duration for a text of that length. |
| `config()` / `configure(overrides \| null)` | The merged settings (defaults, then the catalog, then overrides) / test hook: settings laid over the catalog's. |
| `stats()` / `resetStats()` | `{ said, shown, dropped, bitmaps, renders, frames, ms, maxMs, maxAt, over05, active, speakers, cached }`: lines said, shown, dropped for the cap; text bitmaps made and text drawings since boot; layer updates and their total and worst time (ms) since the last reset. |
| `spriteOf(id)` / `layer()` | The sprite showing a line (or `null`) / the current layer sprite. |
| `routeBarks()` | Wraps `UF_Visuals.bark` and `UF.Visuals.bark` again. Runs at load and at `Scene_Boot.start`, and is safe to repeat. |
| `LAYER_Z` (900000), `KINDS`, `Sprite_UFSpeechLayer` | Constants and the layer class. |

### How it looks and moves
- **Text:** the game font (`$gameSystem.mainFontFace()`) at `fontSize` 18, rows `lineHeight` 21 px apart, colour per kind, `outlineColor` `rgba(0,0,0,0.9)` with `outlineWidth` 3. That is RMMZ's canvas stroke width, centred on the letter edge, so about 1.5 px shows outside each letter. Each line is drawn once into a bitmap when it starts, trimmed to the widest row (even width, so it centres to the pixel). Bitmaps are cached by text and style (24 kept) and reused; none is made per frame.
- **Place:** one layer sprite is a child of the tilemap at z 900000 (WORLD_ARCHITECTURE §4: above characters and objects, below the fog at 1e6). It is scaled by 1 / the tilemap's zoom, so text keeps the same screen size at every zoom. Each line is centred on the speaker's `screenX`, with its bottom `gap` (4) px above the top of the speaker's sprite frame. The frame height comes from the speaker's `Sprite_Character`, or `headDefault` 48 until that sprite is found. Lines are placed every frame from the speaker's current position, so they follow walking units. A line whose speaker is off screen, transparent, erased or not on the area on screen is hidden and keeps timing.
- **Overlap:** lines are placed oldest first. A later line that would overlap an earlier one (keeping `spacing` 2 px) moves straight up past it, until it overlaps nothing. Lines are also kept 2 px inside the screen's left and right edges.
- **Time:** a line lasts `frames`: it fades in over `fadeIn` (6) frames and out over the last `fadeOut` (20). Frames are 1/60 s at every game speed. At ×N (UF_TimeSpeed runs N map updates per displayed frame), each update counts 1/N, under the same condition UF_TimeSpeed uses to multiply. While `UF.Time.paused` (Space, or a UF_Talk conversation) no time passes and the lines stay up. Timers only run while the map scene runs (not in menus).
- **Order and cap:** one speaker shows one line at a time; a long text's lines and later `say`s follow in order, and at most `maxQueue` (6) wait. At most `maxOnScreen` (12) lines are on show. When a new speaker's line needs a place, the oldest bark on show goes, or the oldest line if there is no bark. A waiting continuation waits for a free place instead of pushing another out.
- **Zoom:** below `minZoom` (0.3) the layer is hidden. The text never shrinks, so this is only a switch for crowded far views; all three current levels (1, 2/3, 1/3) show text.

### Barks
At load and again at `Scene_Boot.start`, `window.UF_Visuals.bark(character, text, duration = 180)` is replaced at runtime by a function that calls `UF.Speech.say(character, text, { kind: "bark", frames: duration })`. `UF_Visuals.js` is not edited. The note-tag barks inside UF_Visuals, the `Bark` plugin command, UF_Jobs and UF_NPCSchedules call it through the global, so they all route. `UF.Visuals` did not exist before: UF_Colonists' calls to `UF.Visuals.bark` never showed anything. UF_Speech now sets `UF.Visuals = window.UF_Visuals`, or, when UF_Visuals is absent, a small object whose `bark` does the same, so those calls show too. UF_Visuals' own `EnableBarks` parameter is still honoured: false means no barks. With `speech.routeBarks` false (or `speech.enabled` false) the original UF_Visuals bark runs instead. It fails in this NW.js build because its `drawBark` calls `CanvasRenderingContext2D.roundRect`, which the build lacks (found 2026-09-19). UF_Speech catches that error and logs one console warning, so no bark shows and the game keeps running.

## State it saves
None. Speech is view state: a loaded game starts silent. Lines are cleared on `Game_Map.setup`, `DataManager.setupNewGame` and `DataManager.extractSaveContents`. Caches: up to 24 text bitmaps.

## Events
Emits `speech:said(speakerKey, text, kind)` (keys: `u<unitId>`, `e<mapId>:<eventId>`, `p`, `c<n>`). Listens to nothing. It reads `UF.Time.paused`, `UF.Time.multiplier()` and the tilemap's scale.

## Keys and mouse
None.

## Catalog `speech`
`enabled`, `routeBarks`, `fontSize`, `lineHeight`, `outlineColor`, `outlineWidth`, `maxChars` (22), `maxLines` (3), `framesBase` (90), `framesPerChar` (4), `framesMax` (480), `fadeIn` (6), `fadeOut` (20), `gap`, `spacing`, `maxOnScreen` (12), `maxQueue` (6), `minZoom` (0.3), `headDefault` (48), `kinds` { `remark` `#f4f0e2`, `bark` `#ffe39f`, `shout` `#ff9d85` bold, `order` `#a9d7ff`, `thought` `#cdc6ea` italic } (each `{ color, bold?, italic? }`; extra kinds may be added). Numbers are clamped to sane ranges; a missing field takes the default above. Added 2026-09-19 by `tools/add_speech_catalog.js`, which appends the key and writes only when every other top-level key reads back unchanged (`--check` reports, `--replace` overwrites a different `speech` section).

## Assets used
| Asset | What for | Status |
|---|---|---|
| `fonts/mplus-1m-regular.woff` (`rmmz-mainfont`, the project's main font in System.json) | All over-head text | stock RMMZ font. No generation request exists yet; see the report of 2026-09-19. |
No images. The text is drawn in code into cached bitmaps.

## Checks (suite `speech`, on request: `node tools/run_tests.js speech --game <snapshot>`)
The suite works at zoom 1 on test units (`TEST_A`, `TEST_B` east of A, `TEST_C` north of A, a walker, a crowd of 17) placed on free cells near the colony. It switches colonist decisions off while it runs, and at the end removes every test unit and restores the zoom, the pause state and the colonists.
| Check | What would make it FAIL | Seen failing (2026-09-19) |
|---|---|---|
| `say_shows` | 2 frames after `say`, the line is not visible, is under 40 px wide, its centre is more than 2 px from the speaker sprite's centre, or its bottom is not 0..gap+2 px above the sprite's top | M1 (drawn 6 px right): "centre offset 6 px" |
| `timed` | The default duration isn't 90 + 4 × characters; the line doesn't end within 3 frames of it; it doesn't fade in (first opacity 255 or 0) or out (last visible opacity ≥ 80); `frames: 40` isn't honoured; a 149-character line isn't capped at 480 | M2 (+30 frames): "frames 212 (want … 182)" |
| `wraps` | A row over 22 characters or a line over 3 rows; words lost or reordered; a 36-letter word not cut at 22; the lines of a long text not shown one at a time in order; the bitmap height not 2 × pad + rows × lineHeight; a second `say` not queued behind the first | M3 (rows up to 30): "rows 27/27/29/…, max 22" |
| `no_box` | In the line's bitmap, fewer than 40% of pixels are fully transparent, a corner isn't transparent, or the fullest scanline of the first row has fewer transparent gaps between letters than the row has spaces | M3 (dark box behind the text): "0% of pixels fully transparent; corners alpha 224" |
| `follows` | Over 90 frames of a unit walking 7 cells, the line is ever missing, more than 2 px off its centre, or not just above its head; or the unit walked under 2 cells | M1: "line centre off by at most 6 px" |
| `zoom_constant` | At zoom 1, 2/3 and 1/3 the line's on-screen size differs by more than 0.5 px, is off-centre by more than 2 px, or not just above the head; with `minZoom` between the two farthest levels it isn't hidden at 1/3 and shown at 2/3; the layer's z isn't 900000 | M3 (no counter-scale): "zoom 0.667: 168x19.3 px, centre off -136" |
| `overlap` | Lines of A, B (beside A) and C (behind A) overlap on screen, one isn't centred on its speaker, or no pair would have overlapped unmoved (then the check proves nothing) | M4 (no nudge): "pairs overlapping on screen 3" |
| `barks_routed` | `UF.Visuals.bark(event, text, 150)` doesn't give exactly one UF_Speech line of kind bark, 150 frames, visible; `UF_Visuals.bark(event, text)` doesn't give one of 180 frames; any `Sprite_UFBark` is in the tilemap; the wrapped functions aren't marked; with `routeBarks` false a bark throws or adds a UF_Speech line | M5 (original bark also called, with a stand-in `roundRect`): "old bark sprites … 0/2" |
| `speed_constant` | A 60-frame line lasts under 0.6× or over 1.6× as long in real time at ×4 as at ×1, or the world did not run over 2× as many map updates at ×4 | M2 (every map update counts a frame): "253 ms at x4 … ratio 0.25" |
| `pause` | While `UF.Time.pause()` holds for 60 frames the line's age changes or the line isn't visible; 20 frames after `resume()` it hasn't aged ≥ 15 | M2 (timers ignore pause): "age 10 -> 70 over 60 paused frames" |
| `cap` | World held still. After 4 remarks, 4 barks and 6 remarks (14 lines): not exactly 12 on show, barks 1–2 not dropped, or any remark dropped. After 3 more remarks: barks 3–4 and then the oldest remark not dropped, or anything else missing; more than 12 (or under 10) visible | M4 (oldest line drops, not the oldest bark): "the 2 oldest remarks DROPPED" |
| `perf` | With 12 lines on show, the layer's update averages over 0.2 ms over 120 frames, or any bitmap is made or text drawn in those frames | M5 (text redrawn every frame): "0.6189 ms … text drawn 1440 times" |
| `screenshot_scene` | The two colonists nearest each other can't be brought side by side, or at zoom 1 or 2/3 their two remarks and the walking passer-by's bark aren't all visible and centred within 2 px, or the passer-by isn't walking. Screenshots `speech.remarks_zoom1`, `speech.remarks_zoom23` | M1: "centre offsets 6/6/6 px"; M3: "zoom 2/3: … centre offsets -146.7/-136/-168" |
| `no_errors` | Any uncaught error recorded during the suite. (A thrown error stops RMMZ's loop, which also fails the suite as `suite_completed`.) | M5 (an error recorded as UF_Test does): "window.error: TEST provoked error (mutant M5)" |
The mutants were made by `mutate_speech.js` in Claude Code's scratchpad of 2026-09-19 (text replacements on a copy; the real file was never changed).

Measured 2026-09-19 on a snapshot (Ryzen 7 8845HS). With 12 lines on show, the layer update averaged 0.053–0.067 ms per update over 120 updates, measured with `performance.now()` around the layer's update. The worst single update was 1.3–2.6 ms, on 1–2 of the 120; the cause is not established (a garbage-collection pause landing in the window is likely but unproven). The suite made 29–30 text bitmaps in total and none during the perf window.

## Replaced core methods
None; aliases only: `Spriteset_Map.createLowerLayer`, `Game_Map.setup`, `DataManager.setupNewGame`, `DataManager.extractSaveContents`, `Scene_Boot.start`. Runtime wrap (not core): `window.UF_Visuals.bark`, `UF.Visuals.bark`.

## Known limits
- Not registered in the real `plugins.js`, and not run in Playtest (F5).
- Text is drawn over everything below the fog, including other units standing just above the speaker (visible in `speech.remarks_zoom1`: the colonists behind the pair show through the letters). The outline keeps it readable.
- A line pushed up by the overlap rule can leave the top of the screen; only left and right are kept on screen.
- The layer runs on each map update, so at ×N speed the layout runs N times per displayed frame (N × ~0.06 ms).
- A speaker not on the area on screen says nothing (`say` returns `null`); lines are not remembered for later.
- The outline is RMMZ's `outlineWidth` 3 (about 1.5 px visible). If "3-px outline" was meant as 3 px outside the letters, set `speech.outlineWidth` to 6 in the catalog (no code change).
