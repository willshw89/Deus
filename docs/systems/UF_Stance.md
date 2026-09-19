# UF_Stance
A colored ring under every unit's feet says what it thinks of your colony: green friendly, yellow indifferent, red hostile (VISION V32). Rings since the user's request of 2026-09-19 14:40 ("Lets make the selector and squares under creatures a circle instead"); squares before. The stance is derived from `unit.data` and the factions' relations; nothing is stored. Markers are code-drawn pixel-art ellipses inside the map's tilemap, one per unit event in view, sized to the creature's footprint and following the character every frame. The selected unit gets a bright iron ring around its stance ring.
Status: built 2026-09-18 (squares), rings 2026-09-19; checks: `stance` (22 checks). Registered in `game/js/plugins.js` after `UF_Wildlife`.

**File:** `game/js/plugins/UF_Stance.js` · **Load order:** after `UF_World`, `UF_Factions`, `UF_ColonyOverseer` (and `UF_Perspective25D`), before `UF_Fog` and `UF_Test`. Contract: `docs/design/WORLD_ARCHITECTURE.md` §4 and §5.9.

## API (`UF.Stance`)
| Member | Description |
|---|---|
| `of(unitOrIdOrEvent)` | `"friendly" \| "indifferent" \| "hostile"` for a unit record, a unit id, or a `Game_Event`; `null` for anything that isn't a unit (the player, object events). Rules: `data.kind === "colonist"` or `data.faction === "player"` → friendly; `data.faction` set → by `UF.Factions.tierBetween("player", faction).id` (`allied`/`friendly` → friendly, `neutral` → indifferent, `hostile`/`war` → hostile); no faction (wildlife, test units) → `data.tags` contains `"monster"` → hostile, else indifferent. A generator event whose note contains `<colonist` (the pre-Colonists start pair) → friendly. |
| `label(stance)` | `"Friendly"`, `"Indifferent"`, `"Hostile"`, else `""` |
| `describe(unitOrIdOrEvent)` | `label(of(x))`: the word for the look window (`name · stance`) |
| `color(stance)` / `colors()` / `alpha()` | Marker colors and fill alpha from `catalog.stance` (`colors.friendly/indifferent/hostile`, `alpha`); built-in defaults `#22c55e`, `#eab308`, `#ef4444`, 0.45 if the catalog section is missing |
| `bitmap(stance, cells = 1)` | The generated stance ring for a footprint of `cells` squares (1–4): 40×20 per square, `_ufName` = `UF_GenStance_<stance>`, `_ufCells`, cached; rebuilt if the catalog color or alpha changes |
| `ringSize(cells)` / `selectRingSize(cells)` | `{ w, h }` of the stance ring (40×20 per square) and the selection ring (44×22 per square) |
| `cellsOf(characterSprite)` | Footprint in squares: the width of the frame the sprite draws ÷ 48, rounded, 1–4 (1 while the sheet loads). A 48 px sheet gives 1, a 96 px sheet 2 (V44). |
| `selectBitmap(frame?, cells = 1)` | The selection ring for pulse frame 0 (dim), 1 (bright) or 2 (brightest); no `frame` = the current one. `_ufName` = `UF_GenSelect`, `_ufFrame`, `_ufCells` |
| `selectFrame(frameCount)` | The pulse frame shown at a frame count: 0, 1, 2, 1, 10 frames each (a 40-frame cycle, `PULSE_FRAMES`) |
| `placeSelection(sprite, character, characterSprite)` | Dresses and places a selection sprite for this frame: the ring for the character's footprint and the current pulse frame, anchor, `x = screenX()`, `y = footY`, `z` = its stance ring's z + 1, opacity 255. **A plugin that marks selected units (UF_Select) calls this every frame**, so every selected unit looks the same. |
| `pulse(frame)` | Kept for callers of the old square's opacity pulse: returns 255 (the pulse is drawn in the frames now) |
| `setSelected(unitOrIdOrEvent \| null)` / `selectedCharacter()` / `selectionMarker()` | The unit the selection ring follows (an explicit selection, else the Overseer's selected colonist); the visible selection sprite or `null` |
| `markers()` | The visible marker sprites on the current map (`sprite.stance`, `sprite.cells`, `sprite.character`) |
| `markerOf(unitOrIdOrEvent)` | The visible marker of that unit, else `null` |
| `footY(character)` | Bottom of the character's cell in tilemap pixels (`round(adjustY(realY) × 48 + 48)`), the same foot row UF_Perspective25D sorts characters by |
| `stats()` | `{ frames, ms, shown }` for the per-frame sync on the current map (for the `perf` check) |
| `enabled` / `setEnabled(on)` | Development toggle: `false` hides every marker. Not saved. |
| `STANCES`, `Z` (5), `SIZE` (48), `RING`, `SELECT_RING`, `SELECT_FRAMES` (3), `SELECT_NAME`, `PULSE_FRAMES` (40), `bitmapNames`, `MarkerSprite` | Constants and the sprite class |

How it draws: `Spriteset_Map.createCharacters` (alias) adds a marker pool to the tilemap; `Spriteset_Map.update` (alias, after the core update) walks `_characterSprites`, and for every `Game_Event` that is a world unit (`UF.World.unitOfEvent`) or a `<colonist` event, whose sprite is visible, whose character isn't transparent, and whose cell is on screen (1-cell margin, zoom-aware through `screenTileX/Y`), takes a pooled `Sprite`, sets its bitmap by stance and footprint and puts it at (`screenX()`, `footY`) with `z` = foot row − 50 (above the grass on the cell at foot row − 100, under every character at z = foot row). Markers not used this frame are hidden and returned to the pool. Sprite positions are computed before `$gameMap.update` moves characters (RMMZ order), so a marker always matches the character's *drawn* sprite of the same frame.

**The rings.** Flattened ellipses, twice as wide as tall, as a circle on the ground looks in the flat 3/4 view. Built pixel by pixel into the bitmap (a pixel is in when its centre is inside the ellipse; bands step inward by 4-neighbours), so the edges are stepped with no anti-aliasing, and drawn with nearest-neighbour scaling (`bitmap.smooth = false`) so they stay stepped at zoom 2/3 and 1/3.
- **Stance ring:** 40×20 per square of footprint (80×40 under a 96 px creature). A filled disc in the catalog color at the catalog alpha (0.45 → 115), inside a rim of the same color × 0.55 at alpha + 0.4 (217), 2 px wide at one square and 3 px at two: the square's color rules. The anchor puts the ring's centre 10 px per square above the foot row, so its bottom row is the cell's last row and the feet (drawn 6 px up by RPG Maker's `shiftY`) stand in its middle.
- **Why filled and not a bare ring:** measured in the `stance` suite's `rendered_all_zooms` numbers on the same scene (2026-09-19): at zoom 1/3 a filled ring changed 52 of 98 screen pixels in the wolf's box and 89 of 378 in the 96 px monster's; a bare 2 px rim only 16 and 24. At zoom 1 the bare green rim nearly vanished on grass. The tinted middle carries the color when the ring is 13×7 screen pixels; the rim gives it a crisp edge at zoom 1.
- **Selection ring:** 44×22 per square, on the same centre, open in the middle. Bands from the outside: 1 px dark edge `#353535`, a bright band (3 px at one square, 4 at two), 1 px dark edge; every pixel opaque. Three frames differ only in the band: `#9E9E9E`, `#DFDFDF`, `#FFFFFF` (all from `art/palette/uf.hex`), played 0 1 2 1 at 10 frames each. Opacity stays 255: the pulse is frames, not code-made motion (ART_STANDARD F7). Drawn at its unit's stance ring z + 1, under the sprite; the stance color shows through the middle.

## State it saves
None. Stances are read from `unit.data` (`kind`, `faction`, `tags`) and `UF.World.state.factions` (through `UF.Factions`) whenever asked. Caches: the ring bitmaps per stance and footprint (rebuilt from the catalog), the selection frames per footprint, the ellipse masks per size, and a `WeakMap` of `<colonist` note lookups per `Game_Event` (rebuilt per map).

## Events
Emits: none. Listens: none (it reads the current relations every frame, so `factions:relationChanged` needs no handling).

## Keys and mouse
None.

## Assets used
| Asset | What for | Status |
|---|---|---|
| `UF_GenStance_friendly`, `UF_GenStance_indifferent`, `UF_GenStance_hostile` | Stance rings, 40×20 per square of footprint: filled at `catalog.stance.alpha` (0.45) in the catalog color, rim in the same color × 0.55 at alpha 0.85 | generated (code-drawn, `UF.Stance.bitmap`) until AR-034 ring art is delivered and approved |
| `UF_GenSelect` | Selection ring, 44×22 per square, 3 pulse frames | generated (`UF.Stance.selectBitmap`) until AR-031 ring art is delivered and approved |
| `$U7_Ranger`, `$U7_Troll`, `$U7_Hare`, `$U7_Townsman`, `$U7_Guard`, `$U7_Goblin` | Test units in the `stance` suite only | U7 stand-ins (already listed for their own uses) |
| `$UF_Stock_Nature_0`, `$UF_Stock_BigMonster1_r1` | The suite's wolf (48 px) and troll-sized unit (96 px) | stock RMMZ cuts, already requested (AR-401, AR-402) |

Gemini's square marker art (`art/masters/ui_stance_*.png`, `ui_target_square.png`, delivered 2026-09-19, not approved and never exported to `game/img/`) is superseded by the ring spec in AR-031 and AR-034. The engine never loaded it, so nothing had to be switched off.

## Checks (suite `stance`)
| Check | What would make it FAIL |
|---|---|
| `world_ready` | Not on an area map, `UF.Factions` missing, or the spriteset has no marker layer |
| `catalog_colors` | `catalog.stance` missing, a color isn't `#rrggbb`, or alpha isn't in (0, 1) |
| `bitmaps_generated` | For 1 and 2 squares: a stance ring isn't 40×20 / 80×40 or a selection frame 44×22 / 88×44, a name is wrong, `smooth` isn't `false`, or a repeat call doesn't return the cached bitmap |
| `ring_shape` | Read pixel by pixel, for every stance ring and selection frame at 1 and 2 squares: any opaque pixel in a 3×3 corner of the bitmap (a square's corners are full), one of the four ellipse extremes missing, a row empty or not symmetric, rows not widening toward the middle, top or bottom row wider than half the width, an alpha value other than 0 / fill / rim (stance) or 0 / 255 (selection), a stance edge pixel that isn't rim, a pixel off the catalog colors by more than 8, the stance middle not fill; the selection middle not empty, its outer edge not dark or its band not bright, or the three frames' bands not rising in brightness |
| `three_factions` | Fewer than 3 non-player factions (the catalog rolls 4–7) |
| `of_kinds` | With test units added by `UF.World.addUnit` and relations set by `UF.Factions.setRelation` (allied +80, neutral 0, at war −80): a colonist, a monster, a grazer, an allied person, a neutral person, a war-faction person, the wolf or the big monster gets the wrong stance, or a start event with `<colonist` in its note isn't friendly |
| `of_tiers` | Relation +20 (tier `friendly`) doesn't give friendly, or −30 (tier `hostile`) doesn't give hostile |
| `of_accepts_id_and_event` | `of(id)` or `of(Game_Event)` disagree with `of(unit)`, `of($gamePlayer)` isn't `null`, or `describe` isn't the label |
| `marker_drawn` | The monster in view has no marker, or it isn't in the tilemap, visible, at z = foot row − 50 and sorted before the character sprite, at the drawn sprite's feet, with the ring's middle pixel within 8/channel of the catalog red at alpha 115 ± 4 and a rim more opaque than the fill |
| `ring_sizes` | The 48 px monster's ring isn't 40×20 or the 96 px monster's 80×40, a ring's bottom row isn't the foot row − 1, its centre isn't on `screenX` 10 px per square above the foot row, `cellsOf` isn't 1 / 2, or the big monster's selection ring isn't 88×44 on the same centre as its stance ring |
| `selection_ring` | The colonist's selection ring isn't in the tilemap at the drawn sprite's feet, at its stance ring z + 1 and under the sprite, isn't 44×22 with an empty middle and corners and an opaque band, isn't concentric with the stance ring; or over 42 frames it doesn't show all three pulse frames, its opacity isn't always 255, or it is off the drawn feet in any frame. (It replaces `selection_square`, which failed on 2026-09-19 before this change because it compared the marker with the colonist's cell feet after the game had moved it: `square at (408,420) vs feet (408,417)`.) |
| `selection_clears` | The selection ring stays after `setSelected(null)` |
| `markers_per_unit` | Any test unit lacks a marker, or the counts by stance are below 2 friendly + the pair / 3 indifferent / 3 hostile |
| `marker_rendered` | Screen pixels (via `SceneManager.snap`) inside the neutral person's ring (its two ends and its front) don't change when `setEnabled(false)` hides the markers, fewer than 2 move toward the catalog yellow, more than 1 of the old 48×48 square's inset corners changes (they're outside a ring), or markers stay visible while disabled |
| `rendered_all_zooms` | At zoom 1, 2/3 or 1/3, with the colonist selected, no screen pixel changes in the colonist's, the wolf's or the big monster's ring box when markers are switched off (or one has no marker) |
| `marker_follows` | While the allied person walks 4 cells, any mid-step frame has the marker away from the drawn sprite's feet, or after arrival (2 frames) it isn't at both the drawn feet and the cell feet |
| `hidden_transparent` | `setTransparent(true)` leaves the marker, or `false` doesn't bring it back |
| `hidden_out_of_view` | Moving the event to (5,5) leaves its marker, or moving it back doesn't restore it |
| `hidden_off_map` | After `UF.World.removeUnit`, the event is still there, the marker count didn't drop by one, or a visible marker still points at the removed event |
| `perf` | The sync averages more than 1 ms per frame over 120 frames (detail gives the ms, markers shown and character sprites on the map) |
| `cleanup` | A test marker survives `removeUnit`, or a relation wasn't restored |
| `no_errors` | Any uncaught error during the suite |

Screenshots: `stance.selection_ring.png` (the selected colonist at zoom 1), `stance.stance_markers.png` (the start clearing at zoom 1), `stance.rings_zoom_1.png`, `stance.rings_zoom_23.png`, `stance.rings_zoom_13.png` (colonists, the wolf and the 96 px monster on their rings, the colonist selected, at the three zooms).

Seen failing (2026-09-19, each on a snapshot with one deliberate break): `ring_shape` and `marker_drawn` with the fill removed (bare rings); `ring_shape` and `marker_rendered` with 48×48 filled squares in place of the ellipse; `bitmaps_generated` with `smooth = true`; `ring_sizes` with `cellsOf` fixed at 1; `selection_ring` with the pulse fixed at frame 1; `rendered_all_zooms` with markers hidden below zoom 1/2.

## Replaced core methods
None, aliases only (`Spriteset_Map.prototype.createCharacters`, `Spriteset_Map.prototype.update`, `Scene_Boot.prototype.start` for the checks).

## Known limits
- A unit whose event has no image draws no character sprite, so it gets no marker either (the marker follows the sprite's visibility). Give every unit an image.
- Markers follow the cell (feet), not jumps or elevation: a jumping character's ring stays on the ground, which is the intent.
- The footprint is read from the drawn frame's width, so a small creature on a 48 px sheet (a hare) gets the full one-square ring.
- A 96 px creature's ring (80 px wide) reaches 16 px into the cells beside it, and its tall sprite covers the rings of units in the cells above it. Accepted: V44 lets larger beings overhang.
- One area on screen only: markers exist for the current map; off-screen units have none (their stance is still available through `of`).
- Stance is toward the player's colony only; there is no unit-to-unit stance yet (UF_Factions has the relations for it).
- Red at 45% over green grass reads as brown at every zoom (the catalog colors are unchanged; the squares looked the same).
