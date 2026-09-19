# UF_Doors

Faction-aware doors for VISION V57. Living sites receive a door in every gap in their outer wall ring and at every recorded house entrance. A closed door admits its owning faction and factions with relation 15 or higher, but refuses wildlife, unfactioned units, and strangers. The player can build, hold open, close, and damage doors; the lock menu entry is intentionally disabled until keys exist.

Status on 2026-09-19: implemented in `game/js/plugins/UF_Doors.js`; the live catalog and plugin list contain the door entries and plugin registration. The exact live-tree `doors` run passed 12/12 in a disposable snapshot of the project. RMMZ editor F5 playtest and the F8 console are not checked.

**Owner:** Claude Code / engine · **Load order:** after `UF_Factions`, `UF_History`, and `UF_Objects`; before `UF_Floors` and `UF_Test`.

## Catalog contract

`tools/add_doors_catalog.js` appends two ordinary UF_Objects entries and adds `cultures.<species>.door` without changing other catalog keys:

| Object | Build | HP | Current image |
|---|---:|---:|---|
| `door_wood` | 1 log, work 4 | 20 | stock `!Door1`, character 0 |
| `door_stone` | 2 stone, work 4 | 40 | stock `!Door1`, character 0, cool tint |

Both have `tags: ["building", "door", <material>]`, `passable: false`, a `door` data block, and `ruin: "rubble"`. `!Door2` is not used: it is the stock magic-circle sheet, not a door sheet. The current images are stand-ins covered by AR-300 and the floor/door art handoff.

## Placement and movement

- `placeAll()` visits `UF.History.sites()` once per world. Ruined and factionless sites are skipped.
- `placeSite(site)` gets the rich site record from `sitesIn`, finds every missing wall cell on its square perimeter, and reads `settled.houses[].door` for house entrances.
- Under V31's no-history start there are no generated sites, walls, or houses, so normal automatic placement has nothing to modify. Doors enter play when the building/society systems create them; the focused suite builds and removes a synthetic walled-room fixture so it can still exercise the full contract.
- A generated person occupying a planned entrance is moved to the nearest free cell inside the site before play. If it still cannot be cleared, the placement is saved in `state.doors.pending` and retried every 30 time ticks.
- Movement is decided per mover by an alias of `Game_CharacterBase.isMapPassable`. A permitted crossing bypasses only UF_Objects' door-cell block and still checks both terrain directions.
- UF_World's invisible `Game_Player` view/cursor is treated as a member of the player faction, so a friendly door cannot trap the camera.
- `UF.World.cellFree` is aliased so pathfinding and off-screen checks use the same faction rule. A permitted attempt opens the door for 90 ticks/frames; `heldOpen` admits everyone.
- The object layer update is aliased to select pattern 0 for closed and pattern 2 for open. No core engine file is edited.

## Public API (`UF.Doors`)

| Member | Meaning |
|---|---|
| `OPEN_FRAMES`, `FRIENDLY_RELATION` | 90 and 15 |
| `cellKey(area,x,y)` / `parseKey(key)` | Convert between a cell and `"ax,ay:x,y"` |
| `store()` | Returns `UF.World.state.doors` |
| `at(area,x,y)` / `stateAt(area,x,y)` | Door record or saved state at a cell |
| `isDoorType(type)` / `isOpen(area,x,y)` | Type/state predicates |
| `canUnitPass(unit,doorOrState)` | Faction/alliance decision; `heldOpen` admits any unit |
| `open(doorOrState,frames?)` | Extends the temporary open timer |
| `toggleHeld(area,x,y)` | Player hold-open/close action |
| `placeAll(force?)` / `placeSite(site)` / `retryPending()` | Generation and deferred placement |
| `damage(key,amount)` / `damageAt(area,x,y,amount)` | Subtract HP and replace a destroyed door with its ruin |
| `syncSprites()` / `frameFor(type,open,bitmap)` | Object-layer frame selection |
| `augmentOptions(list,x,y)` / `hookInteract()` | UF_Interact integration |

Combat should call `UF.Doors.damageAt(area, x, y, amount)`. The return is `null`, `{ broken:false, hp }`, or `{ broken:true, hp:0, ruin }`.

## Saved state

`UF.World.state.doors = { version: 1, generated, byCell, pending }`.

Each `byCell[key]` is `{ objectId, faction, hp, maxHp, heldOpen, openUntil }`. `pending` holds deferred entrance placements. UF_World's object diff stores the actual door/rubble object separately.

## Events

Emits `doors:placed(count)`, `doors:opened(stateOrDoor)`, `doors:closed(door)`, `doors:damaged(key,hp)`, and `doors:broken(key,ruin)`.

Listens to `world:created`, `world:areaBuilt`, and `objects:changed`. It also registers `retryPending` with `UF.Time.every(30, ...)` when that API exists. On destruction it calls `UF.History.addEvent(...)` only when that optional API exists.

When `UF_Test` selects a focused suite other than `doors`, automatic historical-door placement is suppressed so the new barriers cannot change another system's fixture geometry. Normal play is unaffected, and the `doors` suite explicitly runs full placement.

## Player interaction

- A door cell gets `Open door` or `Close door` in the right-click menu.
- `Lock door (keys come later)` is visible but disabled, matching V57's later-key decision.
- Door objects with a `build` block appear in UF_Interact's existing Build submenu.

## Checks (`doors`, non-default)

| Check | Fails when |
|---|---|
| `catalog` | Either door type is malformed or any culture lacks a valid door choice |
| `placed_in_gaps` | A living site's ring gap or house entrance lacks a door, is water, or remains occupied |
| `faction_passes` | The owner is refused logically or a real test unit cannot walk through |
| `ally_passes` | A relation-30 faction is refused logically or cannot walk through |
| `animal_blocked` | An unfactioned hare reaches the closed door cell |
| `stranger_blocked` | A relation -30 stranger reaches the closed door cell |
| `open_frame` | A friendly crossing does not open the state and select the open sprite frame |
| `player_can_build` | Wooden door is absent from Build or does not cost 1 log |
| `damage_breaks` | Damage to zero HP does not replace the door with rubble |
| `saved_and_seeded` | Door state does not round-trip or its key order changes |
| `perf` | 10,000 faction checks average over 0.005 ms each |
| `no_errors` | The harness recorded an uncaught error |

Observed in `live_doors_fix1` on 2026-09-19 against the no-history live tree: 12 passed, 0 failed; one synthetic opening checked, and 10,000 faction checks in 1.025 ms. The owning-faction unit crossed and the invisible player view's passage check also succeeded. The earlier deliberate no-catalog run failed `doors.catalog`, proving that check can fail. `doors.closed_animal_outside.png` shows the closed brown stock door in the synthetic room's north wall with the blocked yellow-marked test animal outside; its stock placeholder reads more like a small pink humanoid than a hare. `doors.open_colonist_passing.png` shows the door's gray open frame and the friendly passage fixture. Both images were opened and inspected.

## Assets and known limits

- Stock `!Door1` is visibly a temporary shutter/metal-door look. Consecutive perimeter gaps become consecutive one-cell doors, so a two-cell gate reads as a paired door.
- The same stock art serves wood and tinted stone. Original one-cell wood and stone sheets are specified in `docs/handoffs/HANDOFF_floors_doors.md`.
- There is no key item, lock state, or lock ownership yet.
- There is no door orientation; every door uses row 0 of its character sheet.
- Destruction works through the public API, but no current combat plugin calls it yet.
- V31 generation creates no sites or entrances, so this plugin does not place automatic doors at New Game. A live building system must call the door build path as settlements grow.
- Real RMMZ editor F5 behavior and the F8 console remain unchecked.

## Replaced core methods

None. Aliases only: `Game_CharacterBase.prototype.isMapPassable`, `UF.World.cellFree`, `UF.Objects.Sprite_Layer.prototype.update`, `Scene_Boot.prototype.start`, and the public UF_Interact functions after they exist.
