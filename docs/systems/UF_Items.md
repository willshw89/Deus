# UF_Items
Items from the world catalog (`items.types`): they lie on cells, where they're drawn and stack up to the type's stack size; they travel in unit inventories; other systems eat, wear and use them (`food`, `wear`, `tool`). All item records live in `UF.World.state.items`. Status: built 2026-09-18, checks: `items` (15 checks).

File: `game/js/plugins/UF_Items.js`. Load order: after `UF_World` (and `UF_Objects` when it exists), before `UF_Test`. Contract: `docs/design/WORLD_ARCHITECTURE.md` §2.3, §4, §5.4.

## API (`UF.Items`)

Level seam added 2026-09-19: every area argument accepts `{x,y,z?}`, with omitted z meaning Ground. Integer -2 through +2 is accepted; invalid/unsupported non-ground requests fail before mutation. `create`, `find`, and cell-form `count` also accept a separate `z` that takes precedence over `area.z`. On-screen APIs and item sprites use `World.viewLevel` when present. Ground index keys retain `"ax,ay"`; other levels use `"ax,ay,z"`.

- `types()` → the catalog's item types (`{ id, name, image, tint?, tags, stack, food?: {hunger, thirst}, tool?: {jobType: multiplier}, wear?: {tier} }`), catalog order.
- `type(id: string)` → the type entry or `null`.
- `get(itemId: number)` → the item record `{ id, type, count, area: {x,y}|null, x, y, z, holder: unitId|null }` or `null`. Old missing-z records mean Ground.
- `all()` → every item (ground and carried). `inArea(area)` → every ground item in that area.
- `create(typeId, count, at: { area, x, y } | { holder: unitId })` → one new record, no merging, or `null` (unknown type/unit, nowhere to put it).
- `drop(area, x, y, typeId, count)` → puts `count` on the cell: fills stacks of that type already there, then makes new stacks of at most `stack`. Returns the stacks touched (`[item]`).
- `at(x, y)` → items on that cell of the area on screen. `atIn(area, x, y)` → the same for any area.
- `find({ near: {x, y}, radius?, tags?: [..], id?: typeId, limit?, area? })` → `[{ item, x, y, dist }]`, nearest first (Euclidean; `radius` inclusive; `tags` = any of them; `area` defaults to the one on screen).
- `pickUp(itemId, unitId)` → `true` when the ground item is now in `unit.data.inventory` (the array is created when missing). Cross-level pickup is refused. No distance check: jobs stand on the cell first.
- `putDown(itemId, area, x, y)` → puts a carried item on a cell, merging into stacks of its type there; returns the ground stack that holds it (the item itself unless it merged away), or `null`.
- `give(typeId, count, unitId)` → creates the items straight in the inventory, in stacks of the type's size; returns `[item]`.
- `consume(itemId, count = 1)` → uses up `count` (the item is removed at 0); returns how many were consumed. `consumeFrom(unitId, typeId, count)` → the same across the unit's stacks of that type.
- `remove(itemId)` → deletes the item wherever it is; `true` if it existed.
- `inventoryOf(unitId)` → the item records the unit carries, pick-up order.
- `count(unitId | { x, y, area? }, typeId?)` → total count of that type (all types when omitted) in the inventory or on the cell.
- `has(unitId, { typeId: count, ... })` → whether the unit carries at least that.
- `describe(x, y)` → `{ text: "5 × Log, Stone", items: [{ id, type, name, count }] }` for the cell on screen, or `null` when nothing lies there (for UF_Look).
- `isFactionCreature(u)` → whether a unit is a sentient faction creature/colonist/person eligible for starting kit.
- `giveFactionStartingKit(u)` → equips unit with D&D 5.1 SRD starting kit: `common_clothes` (equipped to torso/clothes slot), `pouch` (held in inventory), and 15 `gold_coin` (held in inventory, contained within pouch via `pouch.contents = [gp.id]`, `gp.container = pouch.id`, `gp.pouchId = pouch.id`). Total weight: 4.3 lbs.
- `layer()` → the `Sprite_UFItemLayer` of the map on screen (`spriteFor(itemId)`, `activeCount()`), for tests. `sidecar(imageName)` → the image's sidecar json once loaded (`undefined` while loading, `null` when there is none).

Rules: a stack's `count` is ≤ its type's `stack` when it lies on a cell; inventories keep stacks as they came (no merging in a pocket). A unit that is removed (`world:unitRemoved`) drops what it carried on the cell it stood on. Nothing here is random. Type aliases (`gp` / `gold_piece` → `gold_coin`, `clothes` / `clothes_common` → `common_clothes`) are resolved dynamically in `Items.type` and `Items.count`.

## State it saves
- `UF.World.state.items = { nextId, byId: { [id]: item } }` (in `contents.ufWorld`). Older saves without it get an empty one on first use.
- `unit.data.inventory: [itemId]` on any unit that has carried something.
- Caches (rebuilt from the state, never saved): the per-area cell index, the type table, loaded sidecars.

## Events
- Emits `items:changed(item, what)` on every change (`what` = `"created" | "count" | "moved" | "removed"`).
- Listens: `world:unitRemoved` (drops the unit's inventory on its own area/cell/level), `world:unitLevelChanged` (carried item records follow the holder's new z and emit `items:changed(item,"moved")`).

## Keys and mouse
None.

## Assets used
- **Since 2026-09-19 (VISION V9, user: "stock is fine"): no item names U7 art.** The 42 item types that named a `!$U7_Item_*` sheet or a byte-identical U7 copy (`!$UF_Item_Firewood`, `!$UF_Item_Fish`) use stock `IconSet` icons: `tools/extract_stock_icons.js` cuts icon n from the RMMZ install's `IconSet.png` into `img/characters/!$UF_Icon_<n>.png` (144×192, the 32×32 icon unscaled at (8, 8) of every 48×48 frame) with a sidecar (`frameWidth/Height` 48, `anchor` [24, 47]), so the icon is centred on its cell; `--check` re-verifies every icon the catalog names. `tools/switch_things_to_stock.js` holds the item → icon table (e.g. sword_short 96, sword_long 97, mace 98, axes 99, bows 102, spear 107, club 110, sling 114, knives 120, shields 128/129, helmets 132/150, mail 135, wrap 136, cloak 138, boots 140/141, jerkin 153, charcoal 167, gold 169, pick 216, arrows 225, root 256, fish 260, mushroom 261, fruit 265, seeds 274, wool 289, fiber 290, hide/leather 291, firewood 295, feathers 297, bone 298, gems 300/301, bars 313); items that share an icon differ by `tint` (stone axe/knife, copper bar, leather, long bow). Gemini's own `!$UF_Item_*` sheets (log, stone, ores, berries, straw, meat) are unchanged. The U7 files stay on disk, unused.
- Before 2026-09-19: `img/characters/!$U7_Item_*.png` + `.json` sidecars, one per `items.types[].image` in the catalog (27 types on 23 sheets; the tools and clothes reuse `RoughStone` / `PlantFiber` / `LeatherHide` with a `tint`). All are U7 stand-ins (AR-200 originals pending). The sprite draws column 1, row 0 of the 3×4 sheet with the sidecar's `frameWidth/frameHeight/anchor` (all current sidecars: bottom-center). Also listed in `docs/ASSET_INVENTORY.md`.
- The `items` suite's test unit uses `img/characters/$U7_Townsman.png` (stand-in).

## Drawing
`Sprite_UFItemLayer` is added to the map's tilemap by an alias of `Spriteset_Map.createCharacters`. It owns a pool of plain `Sprite`s that are the tilemap's direct children (siblings of the character sprites, because the tilemap sorts only its direct children by `z`). Each frame it sets, for every item in view, `x = (adjustX(cell) + 0.5) × 48`, `y = footY = round(adjustY(cell) × 48 + 48)`, `z = footY − 1`, so a unit or object on the same cell (z = footY) draws over the item and flat `under` objects (z = footY − 100) draw under it. The visible set is rebuilt only when the display position moves by a cell, the zoom changes (`UF.Camera`), the map changes, or an item changes; it covers the screen plus a 3-cell margin (tall sprites reach up into view). `tint` = `parseInt(hex, 16)`. Fog isn't consulted (it's off; when it's on, the fog sprite covers items anyway).

## Checks (suite `items`, default)
- `catalog_types`: FAILS when a type lacks id/name, repeats an id, has no `!$` image, `stack` < 1, no `tags` array, a bad `tint`, `food` without hunger/thirst, a `tool` multiplier ≤ 0, or `wear.tier` < 1.
- `referenced_types_exist`: FAILS when an object action yield, a `build.items` cost, a recipe input/output or a species `yields` names a type that isn't in `items.types`.
- `images_exist`: FAILS when any `image` has no `img/characters/<image>.png`.
- `drop_merges`: FAILS unless dropping 3 then 3 logs (stack 5) gives one stack of 5 and one of 1, the first drop made exactly one stack of 3, and the second drop touched the existing stack first.
- `drawn_in_view`: FAILS unless a dropped stone gets a visible sprite that is a tilemap child, sits within 1 px of the cell's bottom-center on screen (`getGlobalPosition` vs `adjustX/Y` × 48 × zoom), has opaque pixels in its frame, and disappears (hidden, released) after `remove`.
- `z_below_units`: FAILS unless the item's sprite has `z = footY − 1` and the unit event's sprite on the same cell has `z = footY`.
- `pick_up_put_down`: FAILS unless after `pickUp` the item has `holder` = the unit, `area` null, is in `inventoryOf`, has no sprite and isn't `at` the cell; and after `putDown` on the next cell it's back on the ground with a sprite and out of the inventory.
- `give_and_has`: FAILS unless `give("fiber", 12)` makes 2 stacks (10 + 2), `count` is 12, `has` 12 is true and `has` 13 or a stone is false.
- `consume_removes`: FAILS unless consuming 4 then 10 of a 10-stack returns 4 and 6, removes the item (record and inventory id) and leaves 2 fiber.
- `find_sorted`: FAILS unless a `tags: ["food"]` search returns the two berry stacks nearest first with rising `dist` and ignores logs, and `id: "log"` returns the 2 log stacks.
- `describe_text`: FAILS unless the log cell describes as `"5 × Log, Log"` with 2 items and an empty cell gives `null`.
- `unit_removal_drops_items`: FAILS unless 3 bones given to the test unit lie on its cell (holder null) after `removeUnit`.
- `saved`: FAILS unless `JsonEx` round-trip of `UF.World.state` keeps `items` identical and `makeSaveContents().ufWorld.items` is the live state.
- `perf`: FAILS when the layer's `update` averages > 1 ms over 120 frames with ~400 stacks in view at zoom ⅓ (measured 0.136 ms on 2026-09-18; the tilemap's own child sort isn't included).
- `no_errors`: FAILS on any uncaught error during the suite.
- `tools/test_faction_starting_gear.js`: 17 checks verifying `common_clothes` (equipped to clothes/torso slot), `pouch` (held in inventory), and 15 `gold_coin` (contained in pouch) across all 9 factions (72 founders) and starting unit generation, with weight invariant at 4.3 lbs and 3 mutant failure checks.
- Screenshots: `items.items_in_view` (zoom 1: a row of six item kinds, a log, the test unit and a hide) and `items.items_zoomed_out` (zoom ⅓: the 20×20 field of stacks).

## Replaced core methods
None, aliases only (`Spriteset_Map.createCharacters`, `Scene_Boot.start` for the checks).

## Known limits

2026-09-19 merge verification: Objects/Items real source in a Node VM with documented World stubs passed 9 checks, including all-five-level indices/stack merging, separate-record z precedence, yields on the source level, strict invalid-z refusal, cross-level pickup refusal, inventory level changes and removal, viewed API reads, and JSON save-state replacement/index rebuilding. A loaded-source mutation dropping z from index keys produced 5 failures. Both plugins passed Node syntax checks. Coherent live five-level snapshots and RMMZ F5/F8 remain untested for this merge; the existing `find_sorted` fixture correction was preserved.

- `pickUp`/`putDown`/`give` don't check distance, capacity or weight: jobs (UF_Jobs) enforce standing on the cell; there is no carry limit yet.
- No stack-count label is drawn on a stack (a 5-log stack looks like one log); `describe` gives the number.
- The stand-in sheets have frames of 48×48 up to 144×144 (`StrawBundle`, `Firewood`), so some items overhang their cell by up to a cell each side.
- Hidden pooled sprites stay tilemap children (with z 0), so the tilemap's per-frame child sort grows with the largest number of items ever in view in that scene.
- Items on water cells aren't stopped (nothing sinks or floats yet).
