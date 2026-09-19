# HANDOFF: art for the selection panel (VISION V59, V49)

**From:** Claude Code (engine) · **To:** Gemini (art) · **Date:** 2026-09-19 · **Feature:** `UF_Sheet` (select anything and see its inventory grid; system doc `docs/systems/UF_Sheet.md`)

## What the feature is
Left-click anything on the map and a panel on the right of the screen shows it: for a creature its face, name, faction, what it's doing, five equipment slots (head, weapon, shield, torso, legs), six stats, needs and mood (your colonists), what an animal drops, and its inventory as a grid of item icons with stack counts; for a stockpile, a pile of items or a workshop the items on it in the same grid; for any other object its state and actions. Screenshots of the engine as built: `sheet.colonist.png`, `sheet.animal.png`, `sheet.stockpile.png` from the `sheet` suite (run it on a snapshot: `node tools/test_snapshot.js --name sheet --plugins UF_Sheet --suite sheet`).

Everything the panel draws is either existing art (the window skin, item and object images) or a placeholder: stock RPG Maker faces, a code-drawn silhouette face, code-drawn slot frames, close box and buttons. The look follows `docs/VISION.md` V2 as it stands on 2026-09-19 (late morning): high-resolution 2.5D in the manner of Ultima VII, **one pixel density for all art** (one art pixel = one screen pixel at zoom 1). V2 is marked as a trial; if it changes, these specs change with it.

## What needs art (requests in `docs/ASSET_REQUESTS.md`; Claude Code adds the rows)
### AR-700 Faces (existing request; this is how they plug in)
- **Where they show:** the panel's portrait box is 72 × 72 screen px at the top-left of the panel. The engine takes one cell of a face sheet (RPG Maker layout: 4 columns × 2 rows of 144 × 144, index 0–7 left to right, top row first) and draws the whole cell into that box (half size). Open question for the user (see "Decisions" below): AR-700 asks for a 96 × 96 bust centred in the cell; under V2's one-density rule the panel should show the bust 1:1, which means either a 72 × 72 bust or a 96 × 96 box. Don't start AR-700 until that is settled.
- **Files:** `game/img/faces/UF_Faces_<Species>.png` (e.g. `UF_Faces_Human.png`, `UF_Faces_Human_Elder.png`), 576 × 288, eight faces per sheet, plain dark background, no text. Tell Claude Code (Notes column of AR-700) which index is which gender and stage; Claude Code maps them in the catalog key `sheet.faces` (you don't edit that key; AGENTS.md → who touches what).
- **Species and genders needed:** human, elf, dwarf, gnome, goblin, orc, automaton (the `people` catalog species) × male, female; stages child, teen, elder when AR-601 lands. Goblins and orcs have no face today at all (the silhouette shows).
- **Stock faces in use until then** (each must be replaced): `People1` 0–7 (human adults and elders), `People2` 4 and 7, `People3` 4 (dwarves), `People4` 4 and 7 (gnomes), `Nature` 5 and 6 (elves), `Evil` 6 (automata).

### AR-702 Creature portraits (new request)
- One portrait per wildlife species id in `catalog.wildlife.species` (23 today: deer, boar, aurochs, wild_horse, wild_sheep, hare, fowl, rat, wolf, jackal, fox, arctic_fox, wildcat, serpent, hawk, songbird, bat, giant_spider, troll, bog_horror, sand_stalker, restless_dead, ice_wraith), the animal's head and shoulders on the same plain dark background as AR-700, in face sheets `game/img/faces/UF_Faces_Creatures1.png` … `3.png` (eight per sheet, catalog order). Same size rule and the same open question as AR-700.
- **In use until then:** stock `Monster` 2 (wolf), 4 (arctic fox), 6 (restless dead) and `Nature` 0 (jackal), 1 (wildcat), 2 (boar), 3 (fox); every other species gets the code-drawn `UF_GenFace` animal silhouette.

### AR-701 Character-sheet UI (existing request; exact pieces)
One sheet `game/img/system/UF_SheetUI.png`, in the window skin's style (today AR-033: carved dark oak, gold trim), one art pixel = one screen pixel, alpha 0 or 255, no text:
| Piece | Size (px) | Position in the sheet | States |
|---|---|---|---|
| Inventory slot frame (a recessed well, 2 px bevel) | 36 × 36 | (0, 0) and (36, 0) | empty, selected |
| Equipment slot frames with a faint outline glyph of what goes there | 36 × 36 each | (0, 36) … (144, 36): head, weapon, shield, torso, legs | one |
| Close box (an X) | 18 × 18 | (0, 72) and (18, 72) | normal, pressed |
| Button, 3 slices (left cap, stretchable middle, right cap) | 6 × 24 each | (0, 96), (6, 96), (12, 96); disabled row at y 120 | normal, disabled |
| "Equipped" corner mark | 9 × 9 | (36, 72) | one |
Sheet size 180 × 144. **Engine side:** nothing reads this file yet; when the request is approved Claude Code adds the loader (UF_Sheet draws the pieces from it when the file exists, else the code-drawn ones). The page tabs and the faction-menu icons in AR-701's text wait for the faction menu (V49); they are not part of this panel.

### The window skin (AR-033, delivered)
`img/system/Window.png` (carved oak, aged parchment, gold trim) is what the panel uses. It matches the current V2 (the U7 manner). It is listed under Stand-ins in STATUS; nothing to do unless the look changes again.

### Item icons: no new files
The grid draws each item type's ground image (its catalog `image`, the frame UF_Items draws on the ground), trimmed to its opaque pixels and drawn at its own size (shrunk only when larger than 32 × 32). So item art is also inventory art. With one pixel density, very small items stay very small in a slot: today the stone axe stand-in is a few pixels wide. When you make item art (AR-200, AR-511, AR-904), keep each item readable inside a 32 × 32 box at 1×.

## How it plugs into the game (no code)
- Faces and creature portraits: deliver the sheets under the names above and list index meanings in the Notes column; Claude Code updates `sheet.faces` in `game/data/UF_WorldCatalog.json` (format: `"human": { "male": [["UF_Faces_Human", 0], ...], "female": [...], "elder_male": [...], "any": [...] }`). A unit may also carry `data.face = { sheet, index }`.
- Window skin: replacing `img/system/Window.png` changes every window at once, the panel included.
- Items: change an item's `image` in `items.types` (you own that list) and its icon changes in every grid.
- Check a delivery in the game: run the `sheet` suite on a snapshot (above) and open the three screenshots, or left-click a colonist in Playtest once `UF_Sheet` is registered.

## Decisions for the user (not for Gemini)
- The portrait size under one pixel density: 72 × 72 busts drawn 1:1 (AR-700's text changes from 96 to 72), or a 96 × 96 portrait box (the panel's header grows by 24 px).
- Whether tiny item art should be enlarged in slots (breaks one pixel density) or stay at its own size (as built).
