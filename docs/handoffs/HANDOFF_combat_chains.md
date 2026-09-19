# HANDOFF: art for the combat chains (VISION V55)

**From:** Claude Code (engine) · **To:** Gemini (art) · **Date:** 2026-09-18 (night) · **Feature:** combat production chains, phase 1 (`docs/design/COMBAT_CHAINS.md`; catalog data landed, code follows)

## What the feature is
Colonies now have a chain from the ground to the weapon: ore and charcoal become bars at a **furnace**, bars become blades, axes, spears, maces, helmets and mail at a **smithy**, logs become bows at a **bowyer's bench** and arrows at a **fletcher's bench**, hides become leather at a **tanning rack** and leather becomes armor at the work stone; wooden clubs, spears and shields come from the work stone; a **weapon rack** stores arms. Every made item has a material and a quality. All of it is catalog data: `objects` (the six workshops), `items.types` (23 new items), `recipes.list`, `colony.plan`. Nothing here needs code from you, and you don't touch code or `game/data/` (AGENTS.md). You add art files plus sidecars and change `image` names in the two lists you own (`objects`, `items.types`), as in `HANDOFF_world_generation.md` §2.

## What needs art (requests in `docs/ASSET_REQUESTS.md`)
### AR-510 Workshops (6 objects, one cell each, VISION V44)
Stock RPG Maker tiles stand in today; every one must be replaced. Two states each: **built** and **ruined** (the ruined state is the shared `rubble` object today, so only the built frame is needed now; a "cold / lit" pair for the furnace and smithy is welcome as `animations.stand` / `animations.lit`).
| Object id | Name | Stand-in now (catalog `tile`) | What it is |
|---|---|---|---|
| furnace | Furnace | `Outside_B` 148 (stone ring) tinted | a waist-high stone smelting furnace with a mouth and a glow; charcoal and ore go in, bars come out |
| smithy | Smithy | `Inside_C` 404 (anvil) | an anvil on a stump beside a small forge hearth, hammer resting on it |
| bowyer_bench | Bowyer's bench | `Inside_C` 403 (tongs, bows, quiver) | a low bench with a stave clamped in it and a finished bow leaning |
| fletcher_bench | Fletcher's bench | `Inside_C` 403 tinted `#c8d8f0` | a bench with shafts, a bundle of feathers and a quiver |
| tanning_rack | Tanning rack | `Outside_B` 149 (frame with a stretched hide) | an upright wooden frame with a hide laced into it |
| weapon_rack | Weapon rack | `Inside_C` 400 (rack with swords) | a wooden stand holding two or three spears and a sword |
Files: `game/img/characters/!$UF_<Name>.png` + `.json` (or `!$U7_<Name>` if decoded from a U7 shape; then `U7_`-prefixed, 3×, listed in STATUS → Stand-ins). One-cell footprint, anchor at the bottom-right of the footprint, U7 2.5D lean, palette `art/palette/uf.hex`. Then set the object's `image` and remove its `tile` in the catalog.

### AR-511 Weapons, armor, ammunition and chain goods as ground items (23)
Today each reuses an existing `!$U7_Item_*` sheet with a `tint` (the inventory tool lists them as stand-ins). One frame each (middle frame of the top row, or `animations.stand`), lying on the ground, readable at 1×; the same frame is the inventory icon on the character sheet later.
charcoal, bar_copper, feathers, leather, arrows (a small bundle), bow_short, bow_long, sling, club, spear, dagger_iron, sword_short, sword_long, axe_iron, mace (copper), helmet_leather, helmet_iron, armor_leather, mail_iron, leggings_leather, greaves_iron, shield_wood, shield_iron. Files `!$UF_Item_<Name>.png` + sidecar; then set `image` and remove `tint` on the item.

### AR-512 Held-weapon and shield layers for the character sheet standard (AR-600)
Per the AR-600 grid (16 columns, 4 facings, 48×48): `$UF_held_<item>.png` for spear, bow_short, bow_long, sling, club, dagger, sword_short, sword_long, axe_iron, mace (the `attack` columns 10–12 matter most; `stand`/`walk` show the weapon carried), and `$UF_shield_wood.png`, `$UF_shield_iron.png` (back-hand side). These plug into the engine's layer compositor when it exists (AR-600 → Engine side); until then nothing reads them, so they can wait behind AR-510/511.

## How it plugs into the game (no code)
- A workshop is an ordinary object: `{ "id": "smithy", "name": "Smithy", "image": "!$UF_Smithy", "tags": ["building", "workplace", "smithy"], "build": { "items": { "stone": 4, "log": 1, "bar_iron": 1 }, "work": 8 }, "ruin": "rubble" }`. The `tags` entry after `workplace` is what recipes look for (`"at": "smithy"`); keep it.
- An item: `{ "id": "sword_short", "name": "Short sword", "image": "!$UF_Item_ShortSword", "tags": [...], "stack": 1, "material": "iron", "weight": 0.9, "labor": "weaponsmith", "quality": true, "weapon": { ... } }`. Change only `image` (and drop `tint`); the `weapon`/`armor`/`shield`/`ammo` blocks are engine data.
- Validate after every catalog save: `"C:\Program Files\nodejs\node.exe" tools\check_catalog.js` must print `RESULT PASS`, and `tools\generate_asset_inventory.js` shows your file replacing the stock or stand-in row.

## Notes
- Names are generic and stay generic (no invented lore, nothing from Ultima or Dwarf Fortress; the checker fails the catalog on the banned list).
- The furnace and the campfire must read differently at 1× (the campfire is the hearth people cook at; the furnace is a closed stone body with a mouth).
