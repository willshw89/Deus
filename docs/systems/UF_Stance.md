# UF_Stance
A colored square under every unit's feet says what it thinks of your colony: green friendly, yellow indifferent, red hostile (user decision 2026-09-18, VISION V21). The stance is derived from `unit.data` and the factions' relations; nothing is stored. Markers are code-drawn 48×48 squares inside the map's tilemap, one per unit event in view, following the character every frame.
Status: built 2026-09-18, checks: `stance` (17 checks). Not yet registered in the real `game/js/plugins.js` (Claude Code registers it after `UF_Wildlife`, before `UF_Fog`; see WORLD_ARCHITECTURE §5). Tested on a snapshot with `--plugins UF_Stance`.

**File:** `game/js/plugins/UF_Stance.js` · **Load order:** after `UF_World`, `UF_Factions`, `UF_ColonyOverseer` (and `UF_Perspective25D`), before `UF_Fog` and `UF_Test`. Contract: `docs/design/WORLD_ARCHITECTURE.md` §4 and §5.9.

## API (`UF.Stance`)
| Member | Description |
|---|---|
| `of(unitOrIdOrEvent)` | `"friendly" \| "indifferent" \| "hostile"` for a unit record, a unit id, or a `Game_Event`; `null` for anything that isn't a unit (the player, object events). Rules: `data.kind === "colonist"` or `data.faction === "player"` → friendly; `data.faction` set → by `UF.Factions.tierBetween("player", faction).id` (`allied`/`friendly` → friendly, `neutral` → indifferent, `hostile`/`war` → hostile); no faction (wildlife, test units) → `data.tags` contains `"monster"` → hostile, else indifferent. A generator event whose note contains `<colonist` (the pre-Colonists start pair) → friendly. |
| `label(stance)` | `"Friendly"`, `"Indifferent"`, `"Hostile"`, else `""` |
| `describe(unitOrIdOrEvent)` | `label(of(x))`: the word for the look window (`name · stance`) |
| `color(stance)` / `colors()` / `alpha()` | Marker colors and fill alpha from `catalog.stance` (`colors.friendly/indifferent/hostile`, `alpha`); built-in defaults `#22c55e`, `#eab308`, `#ef4444`, 0.45 if the catalog section is missing |
| `bitmap(stance)` | The generated 48×48 `Bitmap` (`_ufName` = `UF_GenStance_<stance>`), cached; rebuilt if the catalog color or alpha changes |
| `markers()` | The visible marker sprites on the current map (`sprite.stance`, `sprite.character`) |
| `markerOf(unitOrIdOrEvent)` | The visible marker of that unit, else `null` |
| `footY(character)` | Bottom of the character's cell in tilemap pixels (`round(adjustY(realY) × 48 + 48)`), the same foot row UF_Perspective25D sorts characters by |
| `stats()` | `{ frames, ms, shown }` for the per-frame sync on the current map (for the `perf` check) |
| `enabled` / `setEnabled(on)` | Development toggle: `false` hides every marker. Not saved. |
| `STANCES`, `Z` (5), `SIZE` (48), `bitmapNames`, `MarkerSprite` | Constants and the sprite class |

How it draws: `Spriteset_Map.createCharacters` (alias) adds a marker pool to the tilemap; `Spriteset_Map.update` (alias, after the core update) walks `_characterSprites`, and for every `Game_Event` that is a world unit (`UF.World.unitOfEvent`) or a `<colonist` event, whose sprite is visible, whose character isn't transparent, and whose cell is on screen (1-cell margin, zoom-aware through `screenTileX/Y`), takes a pooled `Sprite` (anchor bottom-center, `z` 5), sets its bitmap by stance and puts it at (`screenX()`, `footY`). Markers not used this frame are hidden and returned to the pool. The tilemap sorts children by `z`, so markers draw above both ground layers (z 0 and 4) and under every character in view (z = foot row ≥ 48). Sprite positions are computed before `$gameMap.update` moves characters (RMMZ order), so a marker always matches the character's *drawn* sprite of the same frame.

## State it saves
None. Stances are read from `unit.data` (`kind`, `faction`, `tags`) and `UF.World.state.factions` (through `UF.Factions`) whenever asked. Caches: the three bitmaps (rebuilt from the catalog) and a `WeakMap` of `<colonist` note lookups per `Game_Event` (rebuilt per map).

## Events
Emits: none. Listens: none (it reads the current relations every frame, so `factions:relationChanged` needs no handling).

## Keys and mouse
None.

## Assets used
| Asset | What for | Status |
|---|---|---|
| `UF_GenStance_friendly`, `UF_GenStance_indifferent`, `UF_GenStance_hostile` | 48×48 marker squares: fill at `catalog.stance.alpha` (0.45) in the catalog color, 2 px outline in the same color × 0.55 at alpha 0.85 | generated (code-drawn, `UF.Stance.bitmap`); no art request needed, the squares are the design |
| `$U7_Ranger`, `$U7_Troll`, `$U7_Hare`, `$U7_Townsman`, `$U7_Guard`, `$U7_Goblin` | Test units in the `stance` suite only | U7 stand-ins (already listed for their own uses) |

## Checks (suite `stance`)
| Check | What would make it FAIL |
|---|---|
| `world_ready` | Not on an area map, `UF.Factions` missing, or the spriteset has no marker layer |
| `catalog_colors` | `catalog.stance` missing, a color isn't `#rrggbb`, or alpha isn't in (0, 1) |
| `bitmaps_generated` | A bitmap isn't 48×48, isn't named `UF_GenStance_<stance>`, or isn't cached on a repeat call |
| `three_factions` | Fewer than 3 non-player factions (the catalog rolls 4–7) |
| `of_kinds` | With test units added by `UF.World.addUnit` and relations set by `UF.Factions.setRelation` (allied +80, neutral 0, at war −80): a colonist, a monster, a grazer, an allied person, a neutral person or a war-faction person gets the wrong stance, or a start event with `<colonist` in its note isn't friendly |
| `of_tiers` | Relation +20 (tier `friendly`) doesn't give friendly, or −30 (tier `hostile`) doesn't give hostile |
| `of_accepts_id_and_event` | `of(id)` or `of(Game_Event)` disagree with `of(unit)`, `of($gamePlayer)` isn't `null`, or `describe` isn't the label |
| `marker_drawn` | The monster in view has no marker, or it isn't in the tilemap, visible, at `z` 5 and sorted before the character sprite, at the character's feet pixel, with the bitmap's center pixel within 8/channel of the catalog red at alpha 115 ± 4 and an outline more opaque than the fill |
| `markers_per_unit` | Any test unit lacks a marker, or the counts by stance are below 4 friendly (2 test + the pair) / 2 indifferent / 2 hostile |
| `marker_rendered` | Screen pixels (via `SceneManager.snap`) at the four inset corners of the neutral person's marker don't change when `setEnabled(false)` hides the markers, or none moves toward the catalog yellow, or markers stay visible while disabled |
| `marker_follows` | While the allied person walks 4 cells, any mid-step frame has the marker away from the drawn sprite's feet, or after arrival (2 frames) it isn't at both the drawn feet and the cell feet |
| `hidden_transparent` | `setTransparent(true)` leaves the marker, or `false` doesn't bring it back |
| `hidden_out_of_view` | Moving the event to (5,5) leaves its marker, or moving it back doesn't restore it |
| `hidden_off_map` | After `UF.World.removeUnit`, the event is still there, the marker count didn't drop by one, or a visible marker still points at the removed event |
| `perf` | The sync averages more than 1 ms per frame over 120 frames (detail gives the ms, markers shown and character sprites on the map) |
| `cleanup` | A test marker survives `removeUnit`, or a relation wasn't restored |
| `no_errors` | Any uncaught error during the suite |
Screenshot: `stance.stance_markers.png` (the start clearing at zoom 1 with the pair and the six test units on their squares).

## Replaced core methods
None, aliases only (`Spriteset_Map.prototype.createCharacters`, `Spriteset_Map.prototype.update`, `Scene_Boot.prototype.start` for the checks).

## Known limits
- A unit whose event has no image draws no character sprite, so it gets no marker either (the marker follows the sprite's visibility). Give every unit an image.
- Markers follow the cell (feet), not jumps or elevation: a jumping character's square stays on the ground, which is the intent.
- One area on screen only: markers exist for the current map; off-screen units have none (their stance is still available through `of`).
- Stance is toward the player's colony only; there is no unit-to-unit stance yet (UF_Factions has the relations for it).
- Not yet registered in `game/js/plugins.js`; the editor's Playtest doesn't load it until Claude Code adds it.
