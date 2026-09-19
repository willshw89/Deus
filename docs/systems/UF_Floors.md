# UF_Floors and UF_Rooms

Room detection, cultural floors, and the VISION V56 floor job. Floors are A2 ground kinds rather than objects, so beds, dropped items, stance markers, and units can occupy the same cell. Player-colony rooms are designated in small batches; non-player towns and holds begin with their recorded house interiors floored.

Status on 2026-09-19: implemented in `game/js/plugins/UF_Floors.js`; the live catalog and plugin list contain the floor entries and plugin registration. The exact live-tree no-history run passed 10/11: all behavior checks passed, but the uncached room scan took 2.520 ms against a 2 ms budget after two optimization attempts. Per AGENTS rule 10, further patches stopped pending a user decision. RMMZ editor F5 playtest and the F8 console are not checked.

Z compatibility update (2026-09-19): rooms now isolate their caches and identities by level; floor jobs preserve record z and reject a worker on a different level. Non-ground floor **construction is deliberately refused** before pickup or material consumption, including direct job application. UF_Tiles' surface tile IDs are not valid substitutes for Levels shape/material/support changes. The vertical core is not installed in the live project; these changes do not enable vertical gameplay.

**Owner:** Claude Code / engine · **Load order:** after `UF_Tiles`, `UF_Doors`, `UF_Items`, and `UF_Jobs`; before `UF_Test`.

## Catalog contract

`tools/add_floors_catalog.js` appends three ground kinds and adds `cultures.<species>.floor = { kind, item, count }` without changing other catalog keys.

| Ground kind | Cultures | Material per cell | Generated pattern |
|---|---|---:|---|
| `floor_wood` / Plank floor | human, elf | 1 log | `planks` |
| `floor_stone` / Flagstone floor | dwarf, gnome, automaton | 1 stone | `cracks` |
| `floor_rushes` / Rush floor | goblin, orc | 2 straw | `needles` |

UF_Tiles draws the current color/pattern definitions into its generated A2 sheet. They are placeholders for AR-300.

## Rooms (`UF.Rooms`)

`roomAt(area,x,y)` performs a cached four-way flood fill. Walls and doors are boundaries. A cell between opposing boundary objects is a doorway gap, not room space. A valid room has at most 64 interior cells and at most two gaps; water, solid ground, blocking objects, the area edge, or a third gap make it invalid. Object changes invalidate that area's room cache.

Recorded `settled.houses` use a rectangle fast path during the automatic flooring plan. This keeps the daily scan under its budget while still validating every interior cell and boundary gap.

Under V31's no-history start, generation records no houses. The fallback scanner caches each site's room list, first collecting only walkable cells adjacent to wall/door boundaries and then probing those candidates. It is functional, but the live synthetic scan is still 0.520 ms over the focused suite's 2 ms budget.

| Member | Meaning |
|---|---|
| `MAX_ROOM_CELLS` | 64 |
| `MAX_ROOM_GAPS` | 2 |
| `roomAt(area,x,y)` | Cached room record or `null` |
| `value(room)` | Floored interior cells divided by total interior cells, 0–1 |
| `invalidate(area?)` | Clear one area's cache or all caches |

A room is `{ id, area, cells:[{x,y}], gaps:[{x,y}], siteId }`. The rooms-and-beds/sleeper-thought feature should use `UF.Rooms.value(UF.Rooms.roomAt(area, bedX, bedY))`; this plugin does not add the thought itself.

Area handles may include `z` (-2 through +2, missing means Ground). Ground room IDs keep their existing spelling; non-ground IDs include z. Nonzero reads require the documented World seam (`viewLevel` and `levelOfMapId`) and `Levels.standableShape`; unsupported or invalid levels return no room instead of inspecting Ground. Non-ground room value counts constructed `floor` shapes through `Levels.cellAt`, never decodes the underground tileset with the surface kind table. `kindAt` returns `null` off Ground. Historical site names remain Ground-only.

## Floors (`UF.Floors`)

| Member | Meaning |
|---|---|
| `FLOOR_IDS`, `MAX_OPEN`, `FLOOR_WORK` | Three ids, 12 simultaneous designations, work 4 |
| `kindAt(area,x,y)` | UF_Tiles ground kind at a cell |
| `canLay(area,x,y,force?)` | `{ok,reason}`; normal jobs require a room, player-forced designations do not |
| `setFloor(area,x,y,kind)` | Change layer 0, reshape neighboring autotiles, increment `laid` |
| `removeFloor(area,x,y)` | Revert a floor to dirt with no refund, increment `removed` |
| `setGround(area,x,y,kind)` | Low-level ground-kind setter plus autotile reshape |
| `createDesignations()` | Add deterministic player-room floor jobs up to the 12-job cap |
| `floorOtherSites()` | Directly floor recorded house interiors in non-player towns/holds |
| `playerCultureFloor()` | Copy of the player's cultural `{kind,item,count}` |
| `defineJobType()` | Idempotently register the `floor` UF_Jobs type |
| `augmentOptions(...)`, `hookInteract()` | Right-click integration |

## Floor job

1. Reject water, solid ground, blocking objects, existing floors, and—unless `force`—cells outside a detected room.
2. Use material already on the target or carried by the worker; otherwise find one matching ground stack within 80 cells.
3. Walk to and pick up that material, then walk to a UF_Jobs stand cell beside the target.
4. Work for `params.work` or 4 ticks, consume the target/carried material, and call `setFloor`.

On `world:created`, other factions' recorded houses are floored immediately and player designations are scheduled after 1,800 time ticks. `time:day` requests another batch. Cells are scanned in stable room/cell order, and at most 12 active floor jobs exist.

## Saved state and world diffs

`UF.World.state.floors = { version:1, laid, removed, designationOrder }`. The actual tiles persist through `UF.World.setTile` and UF_World's tile diffs. Jobs and carried material persist through their owning systems.

## Events

Emits `floors:groundChanged(area,x,y,kindId)`, `floors:laid(area,x,y,kindId)`, `floors:removed(area,x,y,oldKindId)`, and `floors:designated(jobs)`.

Listens to `objects:changed`, `objects:levelChanged`, `world:tileChanged`, `world:levelTileChanged`, and `levels:shapeChanged` to invalidate only the changed area's level cache. `world:created` and the aliased `DataManager.extractSaveContents` clear all cached rooms. Daily Ground planning still listens to `time:day`. Work on Ground does not require Ground to be the viewed map; all five levels must eventually share the continuously advancing simulation (V80/V102).

When `UF_Test` selects a focused suite other than `floors`, automatic house flooring and floor-job creation are suppressed so unrelated job/ground fixtures remain isolated. Normal play is unaffected, and the `floors` suite exercises both planning paths.

## Player interaction

Right-clicking walkable, non-water ground offers `Floor here (planks|flagstones|rushes)` using the player's culture. This creates a forced floor job so the player can pave outside a room. Right-clicking a floor offers `Remove floor`; removal returns dirt and no material.

## Checks (`floors`, non-default)

| Check | Fails when |
|---|---|
| `catalog` | Any ground kind/cultural recipe/material is missing |
| `tiles_draw` | UF_Tiles gives no bases or the three sampled colors are not distinct |
| `room_detection` | A 5×5 fixture does not accept one/two gaps and reject three |
| `refuses_water_and_walls` | Forced laying accepts water or a wall cell |
| `designations_created` | No room job is created or more than 12 are active |
| `job_lays_floor` | The fixture job fails, lays the wrong kind, or leaves its material |
| `colonist_takes_one` | A real colonist does not own and finish the fixture job |
| `menu_option` | The lay/remove interaction entries are missing |
| `seeded_and_saved` | Floor counters/order do not round-trip |
| `perf` | Recorded-room scan exceeds 2 ms or a designation pass exceeds 1 ms |
| `no_errors` | The harness recorded an uncaught error |

Observed in `live_floors_fix2` on 2026-09-19 against the no-history live tree: 10 passed, 1 failed. Nine deterministic designations were made; Merys (#1) took and finished the flagstone job; the designation pass took 0.080 ms; the room scan took 2.520 ms against a 2 ms budget. The earlier deliberate no-catalog run failed `floors.catalog`, proving that check can fail. `floors.colonist_laying_floor.png` shows the nine white floor-designation outlines in the synthetic room with the highlighted worker inside. `floors.room_half_floored.png` shows four light-gray flagstone-placeholder cells and the `Laying floor` work bark. Both fix-one and fix-two image pairs were opened and inspected; they also show the surrounding eight-founder start and ordinary generated resources.

## Assets and known limits

- Compatibility contract checks: `node tools/test_z_floors.js` passed 18/18 on 2026-09-19 using the actual plugin in Node VM stubs for the legacy and documented level APIs. They cover Ground behavior, invalid/unsupported level refusal, independent room identity/cache/shape events, save-load cache reset, no materials consumed by unsupported floor jobs, non-ground sites never flooring/designating Ground, stale-job replanning instead of false completion, and Ground work while viewing another level. `--mutate-room-key` removes z from the real cache-key code and produced 14 PASS / 4 FAIL, including `same_xy_rooms_are_distinct`. This is **not** evidence of a five-map RMMZ integration; World/Objects/Items/Jobs are test doubles.
- Snapshot regression `codex_zcompat_20260919_floors_a` passed 11/11, including laying the correct wood floor, worker completion and material consumption. The measured fixture scan in this run was 1.145 ms and designation pass 0.115 ms. No room-scan optimization was attempted; the historical two-fix limit remains documented above. Both captures were opened: a worker inside the wooden-walled room with white designation boxes, then a partly brown-planked interior. The unrelated 24-line fixture-arena edit was present for this run and is not owned or staged by this task. F5/F8 remains unchecked.

- All three floor kinds are code-drawn placeholders. Original A2 autotiles are specified in `docs/handoffs/HANDOFF_floors_doors.md`.
- Automatic material supply is not created here. A floor job stays open with `needs <item>` until a matching stack exists.
- Non-player houses are floored without simulating workers or consuming their stock; this is generation state, not a live job.
- Removing a floor always reveals dirt, not the exact pre-floor kind.
- Room quality is only the floor fraction. Furniture/material/size value is future work.
- The automatic player plan covers recorded dwelling rectangles. Hand-built rooms are recognized by `roomAt` and can be designated manually, but are not globally scanned every day.
- The no-history fallback room scan currently misses its focused-suite budget: 2.520 ms measured versus 2 ms allowed after two optimization attempts. Behavior checks pass; further patches are stopped under AGENTS rule 10 until the user chooses whether to accept the measured cost or authorize a room-index redesign.
- Real RMMZ editor F5 behavior and the F8 console remain unchecked.

## Replaced core methods

None. Aliases only: `Scene_Boot.prototype.start`, `DataManager.extractSaveContents`, and the public UF_Interact functions after they exist.
