# DRAG_DROP: items between slots, containers, people and the ground (VISION V90)

**Date:** 2026-09-19 · **Author:** Claude Code (engine) · **Status:** design only. No code, catalog, data or art was changed for this file, and nothing in it has run.
**User request (2026-09-19 13:55):** "I want to be able to drag items from inventory to ground or inventory to a chest, etc. dragging items between slots" (VISION V90).
**Bound by:** V90; V49 (grid inventory, equipment slots, character sheet); V59 (select anything and see its grid); V61 (the sprite shows what is equipped); V71 (ownership); V80 (five levels) and V91 (real terrain on `+1`/`+2`); V86 (map drags, `docs/design/SELECTION.md`); V89 (loads are written in the profile, not drawn); V85 (work in beats, `docs/design/WORK_TIMING.md`); V95 (containers have HP and armour); V99 (each faction's menu skin); V101/V102 (one global tick, movement on the tick); V50 (budgets); V9 (stock RPG Maker placeholders); V3 (no corner cutting). It is the "Pick up, drop, and drag. Container and inventory windows (gumps). Double-click to use." part of slice 3's draft in `docs/SLICES.md`.
**Names.** Every player-visible name, label or message in this file is a **proposal**. Each is marked (P) where it first appears and all of them are collected in §15 for the user. Code identifiers are not player-visible.
**Line numbers** refer to working-tree files read on 2026-09-19 between 13:58 and 14:40, re-read by the critic review (§18) around 15:00. Other runs have uncommitted edits in `UF_Items.js`, `UF_Jobs.js`, `UF_World.js`, `UF_Objects.js`, `UF_Sheet.js` and the catalog (`git status`). UF_Sheet grew from 1757 to 2013 lines between the two reads. Before editing, find each hook again by its function name.
**Review:** a critic pass on 2026-09-19 checked every hook point against the code and fixed this file. §18 lists what changed and why.

---

## 0. The decisions this design makes (review these first)

| # | Decision | Why |
|---|---|---|
| D1 | **Equipped items leave the grid.** An equipped item stays a carried record (`holder` = the unit, id still in `data.inventory`), but it has no grid slot and shows only in its equipment slot. Dragging it to the grid unequips it. An equipment value that is an item *type* id rather than a record (UF_Combat's virtual gear, e.g. `equipment.weapon = "bow_short"`) is shown but can never be dragged. | This is the U7 model (§2). It also stops one item showing in two places. UF_Combat (`slotItem`/`resolveItem`, `UF_Combat.js:237-265`), UF_Anim (`equippedType`, `UF_Anim.js:409-419`, and `jobTool`, L437-455) and UF_Jobs (`toolMultiplier`, `UF_Jobs.js:763-776`) all require `holder === unit.id`, so the record must stay carried. |
| D2 | **Grid positions are saved on the item record** as `item.slot`, not as gaps in `data.inventory`. | At least six plugins read `data.inventory` as a dense id list (UF_Items, UF_Sheet, UF_Anim, UF_Colonists, UF_Combat, UF_Jobs). A sparse array would break them. |
| D3 | **A container is an object with a `container` block.** Its contents are item records whose `box` is the container's cell (`{ area, x, y, z }`). Containers can't be carried or nested in this design. | The object grid already gives containers a cell, sprites, building, dismantling, saving and levels. Nesting needs a holder kind "item" and recursion (§17). |
| D4 | **The stockpile stays ground cells, not a container.** Dropping on a stockpile puts the item on one of its cells. | §3.3. |
| D5 | **The weapon rack becomes a container, but only in stage 4** (§14.4), when colonists' item searches can see containers. | §3.3. Converting it earlier breaks the `rack` plan step's hauling. |
| D6 | **One new job type, `carry`, for every player-ordered move that is out of reach.** It is defined by UF_Containers through `UF.Jobs.define`, so `UF_Jobs.js` isn't edited. Its skill is mapped at boot with `UF.Skills.mapJob("carry", "hauling")` (`UF_Skills.js:172`), so UF_Skills isn't edited either. `haul`, `fetch` and `equip` stay as they are for the AI. | `UF_Jobs.js` is claimed by three runs (STATUS "In progress"). `define` is public (`UF_Jobs.js:209`), and so is `mapJob`. |
| D7 | **Someone always carries it** (§5.2): the person whose pack the item leaves, else the person whose pack it enters, else the selected colonist, else the nearest of your colonists. | V90: "Moving items takes the person there if it is out of reach (a haul job) rather than teleporting them." |
| D8 | **Reach is one cell** (Chebyshev 1, the same level, no diagonal past a blocked corner, V3). A move between holders within reach happens at once. Anything else becomes a `carry` job. Moves *inside* one grid (reorder, swap, merge, split) and equipping or unequipping within one person's own pack are interface actions and are always instant. | V90 makes only out-of-reach moves into a walk ("takes the person there if it is out of reach … rather than teleporting them"). This design reads that as in reach = at once, the U7 feel. **This is in tension with V85** ("every action … hauling and the rest … has a base duration in world beats"). An in-reach job would also cancel the carrier's current work through `UF.Colonists.order`. The alternative is §16 Q2, and the choice is one catalog value, `containers.inReach` (`"instant"` or `"job"`). Today `haul` and `fetch` have work 0, so both answers behave the same until WORK_TIMING lands. |
| D9 | **Moving never changes an owner record.** Anything owned by another faction, or held by a stranger or an animal, can't be moved. Your own people's items and containers can. | V71: "Theft, gifting, trade, inheritance and ownership transfer need their own approved rules; do not infer them from this row." |
| D10 | **Splitting uses modifiers held at the press:** Shift takes half (rounded up), Ctrl takes one. There is no quantity dialog in the first build. | Nothing new to draw or test beyond the drag itself. A slider is backlog (§17). |
| D11 | **Several windows at once:** the right-hand panel (the selection, as today) plus up to **4 floating grid windows** (containers, piles, stockpiles, your people). They open by double-click or from the right-click menu, move by their title bar and aren't saved. The panel on a container shows the container's grid too (V59). | On the 816 × 624 screen the panel takes x 500–812. Two 240 px wide container windows fit side by side to its left, and the rest cascade (§3.5). |
| D12 | **UF_Gumps retires** when UF_Containers is registered: set to `status: false` in `plugins.js` with the editor closed. | It is a second, U7-image container system that is live today (§1.6). |
| D13 | **Items in containers are invisible to AI searches until stage 4.** `Items.find` stays ground-only. | Fail-closed. No colonist takes food from another faction's barrel, because nothing reads barrels yet. Stage 4 adds ownership-aware searches. |

---

## 1. What exists today (read on 2026-09-19)

### 1.1 Items (`UF_Items.js`, 799 lines)
- An item is `{ id, type, count, area: {x,y} | null, x, y, holder: unitId | null }` (L18). On the ground `area` is set and `holder` is null. When carried, `holder` is set and `area` is null. The five-level run adds `item.z` and `Items.moveTo` (`VERTICAL_BUILD_PLAN.md` §5.2).
- Ground items sit in a per-area cell index rebuilt from the state (L94-132). Only indexed items get sprites (L491-517).
- `pickUp` (L283) and `putDown` (L299) check neither distance nor capacity. `putDown` merges into the cell's stacks. Inventories keep stacks unmerged "as they came" (UF_Items.md → Rules).
- There are no grid positions and no container holder.

### 1.2 The panel (`UF_Sheet.js`, 2013 lines when re-read)
- There is one panel window, `Window_UFSheet`, at the right edge: x 500, y 82, 312 px wide on this 816 × 624 screen (`createAllWindows` alias, L1381-1389). It is the bottom child of the window layer (`addChildAt(…, 0)`).
- The grid fills in `data.inventory` order (`gridSlots`, L470-475). Equipped stacks show an `E` in it (L473, `drawItemIn` L1015).
- Clicks on the panel are consumed (`processPanelTouch` L904-935, `consumeClick` L1203-1205). A right-click anywhere on the panel closes it (L911-914). A slot is selected on the **press** (`selectSlot`, L945). The Drop and Pick up buttons use `putDown`/`pickUp` (`Sheet.drop` L1299, `Sheet.pickUp` L1315). Drop is disabled for equipped stacks (`canDrop`, L974-977).
- `consumeClick` clears only `triggered` and `cancelled`. It leaves `released` alone.
- The panel on an object cell shows a grid only for stockpiles and workshops. UF_Sheet's private `isContainer` (L365) means "stockpile or workshop", and a chest would be a `building` with state lines and no grid (`cellModel`, L660-721). That name clashes with this design's containers, so the build renames it `isZone`.
- The V89 load line exists: `loadOf` (L556-586) writes "Carrying 3 logs to the woodpile" for `haul`/`fetch` jobs only, and `placeName` names the destination.
- The `sheet` suite's synthetic clicks set `TouchInput._newState.triggered` with no held button and no release (`clickScreen`, L1589-1600). They must keep working.
- UF_Sheet.md → Known limits: "there is no drag and drop between slots, no dropping onto a chosen cell".

### 1.3 Jobs (`UF_Jobs.js`)
- `fetch` (L281) picks an item up. `haul` (L290) picks it up, then puts it down at `params.to`; if cancelled, it puts the item down at the carrier's feet (L313-318).
- `equip` (L413) writes only the old keys `equipment.tool` / `equipment.clothes`. `toolMultiplier` (L763) reads only `tool`.
- No reservations exist beyond `assigned`. UF_Colonists' `claimed()` (`UF_Colonists.js:555-567`) stops two haul/fetch jobs taking the same item id.
- An owned job whose worker leaves the world fails with "the worker is gone" (`release`, L656-667). An open job goes back to the pool. `fail()` calls the handler's `cancel` only when the worker still exists (L635-651).
- WORK_TIMING.md (design) gives `fetch` 1 beat, `haul` 1 + 1 beats and `equip` 1 (tool) or 2 (clothes) beats (its L182-184, L374-376).
- UF_Skills (landed) maps job types to skills from the catalog (`skills.list[].jobs`; `hauling` lists haul, fetch, douse), plus `mapJob(type, skillId)` for types other plugins define (L172).

### 1.4 Menu and ownership
- UF_Interact offers "Haul to stockpile" on items (L452-461). `personalJob` (L327) orders the selected colonist, else the nearest one.
- UF_Ownership (Codex): claims are keyed `object:ax,ay:x,y` with **no z** (`keyOf`, L131-137), and `item:<id>` / `unit:<id>`. Owners are a unit, a faction or `public`. When an object's type changes, its claim is released (`onObjectsChanged`, L461-472). Its Look text is "Owned by <name>" or "Shared" (L406-411). **It is not registered in `plugins.js`** (checked: no `UF_Ownership` line; STATUS: "`UF_Ownership` is not registered in the live project").

### 1.5 Catalog
- `stockpile`: `gen` drawing, passable, tags `building, stockpile`, build 0 items.
- `weapon_rack`: stock tile `Inside_C` 400, tags `building, stockpile, weapon_rack`, build 2 log. The `rack` plan step `stores: [weapon, armor, shield, ammo]`, but UF_Colonists only registers `stockpile` objects as stockpiles (L1352; COMBAT_CHAINS §5 notes it).
- There are no container objects. `sheet.grid` is 8 × 4 slots of 36 px, and `sheet.slots` is `head, weapon, shield, torso, legs`.
- Item types carry `weight` (combat gear only), `weapon.hands` (2 for both bows and the iron axe), `armor.slot`, `shield`, `tool` and `wear`.

### 1.6 A legacy container system is live
`UF_Gumps.js` (380 lines, "Deepdelve Architect") is registered with `status: true` (`plugins.js` line 8). What it does:
- It draws U7 gump backgrounds (`u7_gump_*`, STATUS → "Not swapped yet").
- It saves `contents.ufContainers` (L63-75).
- It opens a paperdoll on the I key (`keyMapper[73]`, L347-351).
- It opens containers from map events with `<container:…>` notes (L360).
- Its windows are scene children rather than window-layer children (L312, L326; SELECTION §1.2).

Generated areas have no such events, so its containers are unreachable in play. The paperdoll still opens on I.

### 1.7 Animation
UF_Anim's `objectState` (L777-799) plays an object's `open` frames only for doors (`info.door && UF.Doors.isOpen(area, x, y)`). It only animates objects whose sidecar has `animations`, so stock placeholders without a sidecar are never framed by it. UF_Doors frames the stock `!Door1` itself by wrapping `UF.Objects.Sprite_Layer.prototype.update` and re-framing every door on every update (`syncSprites`, L332-350), because UF_Objects' sprite pool re-assigns sprites as the view scrolls.

### 1.8 Input facts (RMMZ 1.10)
- The pointer position updates only after the pointer has moved 10 px from the press (`moveThreshold`, `rmmz_core.js:6052`, `_onMove` L6385-6396). Moves while the button is held update `x/y` even outside the canvas. Only the press checks `isInsideCanvas`.
- A left release sets `released`. The right button has no release, only `cancelled`.
- The listeners read `event.pageX/pageY` (`_onLeftButtonDown`, L6277-6284), not `clientX/Y`.
- A window `blur` calls `TouchInput.clear()` (L6365), so a held button can vanish without a release.
- TouchInput's DOM listeners are bound on `document` (L6254-6263).
- SELECTION.md §1-3 describes who reads which button when, and §3.8 gives the frame order this design plugs into (§7).
- **Menus and cards.** The Overseer's card is added with `addWindow` (window layer). UF_Interact's menu is added with `addWindow` each time it opens (`UF_Interact.js:617`), so it lands on top of the window layer. The faction ledger, the chronicle, the clock, the speed widget and UF_Look's tip are **scene children** after the window layer (`UF_Factions.js:609`, `UF_History.js:1866`, `UF_DayNight.js:172`, `UF_TimeSpeed.js:302`, `UF_Look.js:401`), so they draw over every window-layer window.
- **Level switches are map transfers.** VERTICAL_BUILD_PLAN §5.3 switches the level with `World.transferView`, so a new `Scene_Map`, window layer and panel are made on every level switch.

---

## 2. The U7 model (reference only; nothing copied)

From knowledge of the reference game. This was not re-checked in the GOG copy for this file.

| In the reference game | Here |
|---|---|
| A container opens as its own window on double-click; several are open at once and can be moved around | Kept (D11): floating grid windows, double-click or the menu, movable by the title bar |
| Items lie anywhere inside a container's picture | Replaced by grids (V49, V59) |
| A party member's figure takes worn and held items dropped onto it | Kept as the five equipment slots (V49). The figure look is art direction for later |
| Items dragged onto the ground, into containers, onto people (a gift to a party member) | Kept. People are your own colonists only, and a far target makes a job (V90) |
| A quantity choice when part of a stack is moved | Modifiers (D10). A slider is backlog |
| A drop refused with a short message (won't fit, too heavy, too far) | Refusals with a reason in the footer (§6). There is no weight limit yet (§16 Q4) |

---

## 3. Containers

### 3.1 What a container is
A container is a catalog object with a `container` block:
```json
"container": { "columns": 6, "rows": 4, "accepts": null, "open": { "row": 3 } }
```
- `accepts`: `null` (anything) or a list of item tags, where one match is enough. Every tag named must be carried by at least one item type (check `containers.catalog`).
- `open`: the placeholder's open frame. `{ "row": n }` is a row of a stock character block, `{ "tile": id }` is another tile of the same sheet, and `null` means none. Delivered art names its open frame in the sidecar instead (`animations.open`, ART_STANDARD F7).
- Contents are ordinary item records with `box` = the container's cell (§8). One stack per slot, up to the type's `stack`.
- Containers occupy one cell (footprint 1 × 1; SCALE.md lists chest and barrel at 1 × 1).
- **HP and armour (V95):** containers are objects, so they get HP and armour from their material in the durability run's catalog data (`docs/design/DURABILITY.md`, not written yet). A container broken at 0 HP becomes its `ruin`, which is a type change, so its contents spill (§3.7). This design adds no HP numbers of its own.

### 3.2 The container objects (new catalog entries; costs and grids are proposals)
| id | Name (P) | Grid | Accepts (item tags; all exist in the catalog today) | Build (today's items) | Blocks | Placeholder (stock, V9) | Art |
|---|---|---|---|---|---|---|---|
| `chest` | Chest | 6 × 4 (24) | anything | 3 log + 1 fiber, work 80 | yes | `!Chest` character 6, the brown iron-banded chest: row 0 closed, row 3 open (opened and checked 2026-09-19) | AR-1500 |
| `barrel` | Barrel | 4 × 3 (12) | food, seed (drink once drink items exist) | 3 log + 2 fiber, work 80 | yes | `Inside_B` tile 212 (the hooped barrel); open: 211 (the open tub beside it) | AR-1501 |
| `crate` | Crate | 5 × 4 (20) | material, ore, stone, metal, gem, precious, fuel, ammo | 2 log, work 60 | yes | `Inside_B` tile 224 (a closed crate); no open frame | AR-1502 |
| `basket` | Basket | 4 × 2 (8) | plant, seed, fiber, straw, feathers, wool | 3 fiber, work 40 | no (passable, not `under`) | `Inside_B` tile 218 (a wide wooden tub, the nearest stock shape; the sheet has no basket) | AR-1503 |
| `weapon_rack` (existing, stage 4) | Weapon rack (existing name) | 4 × 2 (8) | weapon, shield, ammo, armor (the `rack` step's `stores`) | unchanged | unchanged | unchanged (`Inside_C` 400) | AR-510 (existing) |

- Tags are `building, container, furniture` (the weapon rack gains `container` in stage 4).
- `ruin` is `rubble`, the existing object, for chest, barrel and crate.
- The tile ids follow UF_Objects' tile rule (`frameFor`, L333-343: ids 0-255 are the B sheet, 16 columns of 48 px, right half from 128). The positions were read off a grid-overlaid crop of `Inside_B.png` opened on 2026-09-19: 212 is column 12 row 10, 211 column 11 row 10, 224 column 8 row 12, 218 column 10 row 11. The review recomputed them with `frameFor`'s formula (column = (id ≥ 128 ? 8 : 0) + id % 8, row = ⌊(id % 128) / 8⌋) and they match. It also re-opened the crop: hooped barrel, tall open tub, closed crate, wide empty tub.
- The chest's frames: UF_Objects draws a non-`$` sheet at column `blockX + 1`, row `blockY` of the character block (L354-364), which is the closed chest. The open frame is row `blockY + 3` of the same block. The review opened `!Chest.png` (576 × 384, 48 × 48 frames): character 6 is the brown chest with iron bands, and its row 3 shows the open lid.
- Work is in today's units. WORK_TIMING converts every `build.work` to beats.
- **CRAFTING.md alignment:** CRAFTING §2.8 makes `chest` (4 plank + 1 fittings, carpentry 16) and `barrel` (22) furniture items that are placed by building (§2.10). When that lands, these objects' `build.items` become `{ "chest": 1 }` / `{ "barrel": 1 }` and the interim log costs go. Build levels and unlocks (V77, V84) apply through `build.level` once UF_Skills/UF_Tech read it. The objects are built like any other.

### 3.3 The stockpile and the weapon rack
- **The stockpile is not a container:**
  1. It is a DF-style zone of tiles, and its items are visible on the map. A container hides its contents.
  2. It has no single cell or grid. The panel already gathers its 4-connected cells (`stockpileCells`, `UF_Sheet.js:641`).
  3. Hauling, the larder, colonist food search (`foodStored`, `UF_Colonists.js:689`), UF_Interact's `stockpileFor` and UF_History's site stores all read items on stockpile cells. Moving them into boxes would break each one.
  4. What a stockpile needs from this feature is a drop target. Its window ("Stored here", P) accepts drops and puts each item on one of its cells (§4.4).
- **The weapon rack becomes a container in stage 4:**
  - For: it is one piece of furniture on one cell, owned by the faction, and it holds a fixed number of pieces. A grid shows that better than a pile on a cell.
  - Why not now: today crafted weapons are meant to be hauled to it as a stockpile (`rack` step, COMBAT_CHAINS §5). Once it's a container, nothing can deliver into it until colonists' hauling knows containers (stage 4). Until then it keeps its `stockpile` tag and behaviour.

### 3.4 Building and ownership
- Containers appear in the right-click "Build here" submenu automatically, because it lists every object with `build` (`UF_Interact.js:389-400`). Box designations (SELECTION §7) can build them too.
- **Owner at completion.** When a `build` job finishes on an object with a `container` block (`jobs:done`), UF_Containers claims it for the builder's faction: `UF.Ownership.claim({ kind: "object", area, x, y, z }, { kind: "faction", id }, { reason: "built" })`. Look and the window header then read "Owned by <faction>" (UF_Ownership's text).
- Assigning a container to one person ("this is her chest") is a transfer rule and waits for the user (V71).
- Unclaimed containers (ruins, and generated sites until UF_History stamps owners) can be used by anyone.
- **Without UF_Ownership** (it is not registered today), no container has an owner. The access table below then allows everything, and V71 is not met. So stage 2 is **not done** while UF_Ownership is unregistered: `built_and_owned` and `access` FAIL and say why. Shipping stage 2 anyway is a user decision (§16 Q10).
- **Access for the player** (the overseer of the player's faction):

| Container owner | View contents | Take out | Put in |
|---|---|---|---|
| the player's faction, one of its people, public ("Shared"), nobody | yes | yes | yes |
| another faction or a person of another faction | yes (V59: select anything and see its grid) | no | no |

### 3.5 Opening: windows
- **Double-click** a container on the map, or choose **"Open chest"** (P; the pattern is `Open <name in lower case>`) from its right-click menu. UF_Containers adds that option by wrapping `UF.Interact.optionsFor` at boot, the way UF_Doors and UF_Floors do. That opens a floating grid window.
- Double-clicking a pile, a stockpile or one of your people opens their floating window too. The Inventory menu option and a single click keep opening the right-hand panel as today.
- **The panel on a container shows its grid (V59).** Today a click on a chest would show a `building` with state lines and no contents (§1.2). `cellModel` gains a container branch: the header as for any object, the owner line, and the box grid (title "Inside", P) at the items' `slot`s. The panel is then a drag source and target for that box, like a floating window, under the same access rules (§3.4).
- **Up to 4 floating windows** (catalog `containers.maxWindows`). Opening a fifth closes the oldest. Opening one that is already open brings it to the front.
- **Placement:** the first window opens at (8, 110). That keeps it below UF_Select's toolbar and status line (x 264–608, y 42–104, SELECTION §2.3) and the clock. The next opens beside it at (first x + width + 4, 110) while it still ends left of the panel's x 500. Later ones cascade by (24, 24). The panel keeps its place at x 500.
- **The colonist card is still covered.** The Overseer's card is 380 × 320 at (16, 288) (`UF_ColonyOverseer.js:50, 245`), so a 240 px tall window at y 110 covers its top 62 px, and a cascaded window covers more. That is why windows are movable.
- **Movable** by dragging the title bar (§4.1 "window move"), clamped to the screen. Positions aren't saved.
- **Stacking, by insertion index:** the floating windows are one contiguous block in the window layer, inserted directly above the Overseer's card (or directly above the panel when there is no card): `layer.addChildAt(win, index of the card + 1 + position in the block)`. They are never appended with `addWindow`. That keeps them above the panel and the card, and below UF_Interact's menu, which `addWindow` appends on every open (§1.8). The ledger, the chronicle, a talk and UF_Look's tip are scene children and draw over the whole window layer anyway. A press on a floating window moves it to the top of the block only. Each floating window uses the panel's `isCoveredAtPointer` test, so a press lands on the topmost window under the pointer, and a floating window dragged over the panel takes the press there.
- **Closing:** the close box, a right-click on the window (as the panel does, `UF_Sheet.js:911-914`), or Esc (topmost floating window first, then the panel). A window also closes itself when its container is gone, when its person leaves the world, or on an area change.
- **Level switches keep windows open, by reopening them.** A level switch is a map transfer that builds a new `Scene_Map` (§1.8), so every window is destroyed. UF_SheetWindows (§9.2) keeps the open windows' subjects and positions in module state (not in the save), and its `createAllWindows` alias reopens them in the new scene. UF_Sheet does the same for the panel's subject, which is also a VERTICAL_BUILD_PLAN §8 owner change for UF_Sheet (the z pass, §14.2). The header shows the level label ("+1", from UF_Levels). The map drop target is always the level on screen (§5.5). A drag in progress is cancelled by the switch (§4.7).
- **The lid is open** (placeholder open frame, or the art's `open` column) while a window shows the container or a `carry` job is working at it. UF_Containers frames the stock placeholders itself by wrapping `UF.Objects.Sprite_Layer.prototype.update`, the UF_Doors technique (`UF_Doors.js:332-350`). It re-applies the open frame on **every** update for each open container: at most 4 windows plus the active carries. Checking only changes of the open state would not do, because UF_Objects' pool re-assigns sprites as the view scrolls, and a re-assigned sprite comes back closed. When a container closes, its closed frame is restored once. With nothing open, the wrap returns at once. Art frames go through UF_Anim's `open` state, which needs one owner change (§14.3).

### 3.6 What a container window shows
| Part | Content |
|---|---|
| Header (title bar, also the move handle) | The object's own closed frame as a 36 × 36 picture, the name, a close box. Second line: owner ("Owned by <faction>" / "Shared" / "Unowned", P), capacity "7 of 24 slots" (P), level label when it isn't the ground |
| Filter line | "Holds food and seeds" (P; the `accepts` tags joined), only when `accepts` is set |
| Grid | `columns × rows` slots of 36 px, drawn with the panel's code-drawn slot frame (AR-701's parts sheet is delivered as `art/masters/ui_character_sheet.png` but nothing reads it yet, UF_Sheet.md L120). Each item sits at its `slot`. Reserved slots (§5.4) show the incoming icon faded |
| Footer | The hovered or selected stack ("Log × 5 · wood, fuel, material"), or the last refusal (§6) |

Window width: `columns × 36 + 2 × 12` (a 6-column chest is 240 px).

A person's floating window ("pack", P) shows a compact header (face 36 × 36, name), a row of the five equipment slots and the 8 × 4 grid. A pile or stockpile window shows its cells' stacks the way the panel does now, with no fixed capacity.

**Window skin (V99):** a floating window uses the same skin as the rest of the player's menus, which V99 makes the player's faction skin. A window on another faction's container or person uses that faction's skin, the way a talk shows the stranger's side. Until the V99 build gives UF_Factions a skin lookup, every window uses `img/system/Window.png`. There is no separate container skin (the draft's AR-1504 is withdrawn, §13).

### 3.7 When a container goes away
When the object on a container's cell stops being that container type (dismantled, burnt, collapsed, replaced), its items **spill** onto the same cell: `Items.spill(boxRef)`, merged like `putDown`. The window closes and `containers:spilled` is emitted.
- UF_Containers listens to `objects:changed` and, after the five-level V1 lands, to `objects:levelChanged`. Both are a single map lookup per change.
- If that cell is `open` air (a V3 collapse), the items fall through `Items.moveTo` as VERTICAL_BUILD_PLAN §7.4 describes.
- Dismantling returns the container's own `build.items` as usual. UF_Interact's `dismantle` drops them on the cell and then clears the object (`UF_Interact.js:139-147`), so the spilled stacks merge with them.
- UF_Ownership releases the container's own claim on the same event (§1.4). The spilled stacks are then ordinary ground items that any hauler may take, including another faction's. Whether they should keep the container owner's claim (`item:<id>`) is §16 Q11.
- A `carry` job that was delivering into the vanished container fails with "the chest is gone" (P), and its item stays in the carrier's pack (§5.3).

### 3.8 Containers on the five levels
Box refs carry `z`, so a chest on `+1` is a different holder from a chest at the same x, y on the ground. UF_Ownership's object key needs z for that (§14.3). Containers can stand wherever objects can stand on a level. With V91, hilltop cells on `+1`/`+2` are ground like any other.

---

## 4. The drag

### 4.1 States
```text
idle ──left press (button held) on a draggable slot: select it, as today──▶ armed ──pointer moves past 10 px──▶ dragging ──release──▶ drop → order → idle
  │                                        └──release first──▶ nothing more (the slot is already selected) → idle
  ├──left trigger with no held button (a fast click, or a synthetic one)──▶ select the slot, as today → idle
  └──left press on a floating window's title bar──▶ moving ──release──▶ idle
armed or dragging ──right-click / Esc / menu, talk or message opens / scene change (level switch, transfer) / area change /
                    release outside the canvas / button lost without a release (window blur) / source gone──▶ cancel → idle
```
- **The slot is selected on the press, as today** (`selectSlot` on the trigger, `UF_Sheet.js:945`). The press arms a drag only while `TouchInput.isPressed()` is true. A trigger with no held button is a complete click and never arms. That is SELECTION §3.2's rule, and it keeps the `sheet` suite's synthetic clicks (`clickScreen`, which never sets a held button or a release) working unchanged.
- A **draggable slot** is a grid or equipment slot holding a stack, in a window whose source the player may take from:
  - your colonist (UF_Sheet's `isPlayersColonist`, `UF_Sheet.js:396`);
  - a container with take access (§3.4);
  - a pile or stockpile whose items aren't owned by another faction.
- An equipment slot whose value is an item type id with no record (D1) never arms.
- Read-only windows (strangers, animals, other factions' containers) never arm. The press still selects the slot for its footer text, as today.
- The "Drops when killed" row of an animal isn't made of items, so it never arms.
- `armed` records `{ itemId, from: HolderRef, fromSlot | equipSlot, count, pressX, pressY, frame }`. The count comes from the modifiers at the press (§7.5).
- **While armed or dragging, the gesture owns the mouse.** The panel's `processPanelTouch` and every floating window's touch handler return at once. Without that, a right-click over the panel would close the panel (`UF_Sheet.js:911-914`) and swallow the `cancelled` flag before the drag controller, which runs after the window layer (§7.2), could see it.
- **Lost button.** If `TouchInput.isPressed()` turns false on a frame with no `released` (`TouchInput.clear()` on a window blur, §1.8), the drag is cancelled.
- The world keeps running during a drag. The player can pause with the speed controls.

### 4.2 Counts
| Press | Count taken |
|---|---|
| plain | the whole stack |
| Shift | half, rounded up (9 → 5) |
| Ctrl | one |

A stack of 1 moves whole. The ghost shows the count taken, and the source slot shows what would remain while dragging.

### 4.3 The ghost and hover feedback
- **Ghost:** one Sprite per map scene, a child of the scene. At each drag start it is re-added with `scene.addChild(ghost)`, which moves it to the last child, so it draws over the window layer and over the scene-child HUD (ledger, chronicle, clock, speed widget, UF_Look's tip, §1.8). It shows the item's cached icon (`UF.Sheet.itemIcon`, the same bitmap as the grid) at 80 % opacity, centred on the pointer, plus a count plate drawn into one reused 36 × 36 bitmap at drag start. No Bitmap is made per frame. It is a Sprite, not a Window, so no over-UI test counts it.
- **Target highlight:** the hovered slot gets a frame drawn on the window's contents:
  - valid: gold;
  - refused: red;
  - reserved: dim.

  The footer shows what will happen ("Into the chest, slot 4", "Anna will carry it there", "No room", all P). The window redraws only when the hovered target changes.
- **Map target:** one outline sprite in the tilemap on the hovered cell:
  - in reach: solid;
  - needs a walk: dashed;
  - refused: red cross.

  These are code-drawn (AR-1505 later), each state made once.
- UF_Look's tooltip is hidden during a drag (`UF.Look.enabled = false`, the way UF_Sheet's screenshots do it, L1615-1620). The value seen at the start is restored on every exit path: drop, cancel and `Scene_Map.terminate`. UF_Select toggles the same flag for its boxes (SELECTION §13), and the two never overlap, because they never own the same press.

### 4.4 Drop targets
Hit-testing at the release, first match wins:
1. **A floating window, topmost first, then the panel:**
   - a grid slot;
   - an equipment slot;
   - anywhere else on a grid window: its subject as a whole (the first free slot, or a merge);
   - the close box: cancel;
   - a read-only window: refused.
2. **Any other window or HUD** (menus, clock, speed widget, card, UF_Select's toolbar): cancel.
3. **Outside the canvas** (`TouchInput.x/y` outside 0 … `Graphics.width/height`; RMMZ keeps updating them while the button is held, §1.8): cancel. Without this test, `canvasToMapX` of a negative x can be a real off-screen cell.
4. **The map:** the cell on the level on screen, via `UF.Look.cellUnderMouse` (zoom-aware):
   1. a unit on the cell;
   2. a container object;
   3. a stockpile cell or the plain ground.

| Target | Result | Instant when | Otherwise |
|---|---|---|---|
| Another slot of the same grid | Reorder, swap or merge (§4.5) | always (it is the same pack or box) | — |
| A slot or the body of another grid (a container, another pack, a pile or stockpile window) | Into that holder: the slot when free, a merge when it holds the same type, else the first free slot | the carrier is in reach of both ends (§5.1) | `carry` job |
| An equipment slot of the same person | Equip (§4.6) | always | — |
| An equipment slot of another of your people | Hand over, then equip | the carrier is adjacent to them | `carry` job with `then: equip` |
| One of your people on the map, or their pack window | Hand over into their first free slot | the carrier is adjacent (Chebyshev 1, same level) | `carry` job that follows them (§5.3) |
| A stranger or an animal on the map | refused (`stranger`) | — | — |
| A container on the map | Into it (first free slot or merge) | in reach | `carry` job |
| A stockpile window, or a stockpile cell on the map | Onto the stockpile: the clicked cell on the map; from the window, the cell nearest the carrier that holds a mergeable stack of that type, else the one with the fewest stacks | in reach of that cell | `carry` job |
| A plain cell | Put down on the cell, merging like `putDown` | in reach | `carry` job |
| The source slot, a non-target, the close box | cancel (nothing changes) | — | — |

**Cells that can't hold items** are refused:
- water: `water`;
- a cell whose object blocks and isn't a workshop or container (walls, trees, boulders, doors): `blocked`;
- open air or solid rock on a level: `no_floor`.

Workshop cells are allowed, because builds and crafts already keep materials on them.

### 4.5 Slot rules (inside one grid, and between grids)
- **Reorder:** onto an empty slot of the same grid, the item's `slot` changes.
- **Swap:** onto a slot of the same grid holding another type, the two slots exchange.
- **Merge:** onto a stack of the same type (same grid or another), the target fills up to the type's `stack`. The remainder stays at the source, under the same record id.
- **Split:** a partial count (§4.2) moved to an empty slot or another holder creates a new record for the moved part. The source keeps its id and the rest.
- **A partial count onto another type's slot in the same grid** can't swap, because the source slot still holds the rest. It goes to the first free slot, or is refused `full` when there is none, and the highlight shows that slot.
- **No cross-holder swaps.** A drop on another holder's occupied slot of a different type lands in that holder's first free slot. The highlight shows that slot, so the feedback is honest. A swap across holders would be two carries, and a half-finished swap could strand an item.

### 4.6 Equipment slots
| Slot | Takes |
|---|---|
| head / torso / legs | `armor.slot` of that name (clothing with `wear` has `armor.slot: torso`) |
| weapon | a `weapon` or a `tool` (tools are held in the weapon hand) |
| shield | a `shield`. Refused while the weapon needs both hands (`weapon.hands` 2): `two_hands` |

- Anything else is refused as `wrong_slot` ("Goes on the head", "Can't be worn or held", P).
- **Equipping a two-handed weapon** while a shield is on moves the shield into the pack's first free slot. It is refused (`full`) when there is none.
- **Dropping on an occupied slot** puts the displaced item into the slot the new one came from, if it came from the same pack. Otherwise it goes to the first free slot, and the drop is refused when there is none.
- **Dragging from an equipment slot** unequips. The item gets the target slot, or is put down or handed over like any grid item.
- **Clothing tier:** equipping a `wear` item sets `data.tier` and calls `UF.Colonists.setTier`, as the `equip` job does. Unequipping it sets the tier back to 0, or to the tier of a `wear` item still worn.
- The sprite changes at once (V61). UF_Anim reads `data.equipment` each frame (`wantedLayers`, `UF_Anim.js:502-522`). It draws a sixth slot, `back`, that V49 and `sheet.slots` don't have (`SLOTS`, L84). No catalog item uses `armor.slot: "back"` today (checked in the catalog), so nothing here needs it.

### 4.7 Cancel
A cancel leaves every record as it was: no job, no move. It happens on:
- a release on the source slot, on a non-target, or outside the canvas;
- a right-click during the drag;
- Esc;
- UF_Interact's menu, a talk or a message opening;
- a map transfer (a level switch is one), an area change, or `Scene_Map.terminate`;
- the button lost without a release (§4.1);
- the item changing under the drag. At the release the order re-checks that the item still exists, is still in the source holder, and has at least the dragged count; otherwise it is refused as `moved`.

---

## 5. Who carries it: reach, carriers and the `carry` job

### 5.1 Reach
`inReach(unit, end)` is true when:
- the unit and the end are on the same level;
- the Chebyshev distance is ≤ 1 (`containers.reach`, default 1);
- for a diagonal, neither orthogonal neighbour blocks (V3, no corner cutting).

The end's cell is the item's cell, the container's cell, or the other person's cell. The carrier's own pack and equipment are always in reach.

### 5.2 The carrier
| Source → destination | Carrier |
|---|---|
| a person's pack or equipment → anything | that person |
| a container, pile or stockpile → a person's pack or equipment | the receiving person |
| a container, pile or stockpile → a container, pile, stockpile or cell | the selected colonist (Overseer, or UF_Select's primary). Else the nearest idle colonist of the player's faction on that level within `containers.carrierSearch` (120 cells, UF_Interact's `COLONIST_SEARCH`). Else the nearest busy one. Else refused: `no_carrier` |

- **Instant:** the carrier is in reach of both ends. `Items.move` runs in the same frame. With `containers.inReach: "job"` (§16 Q2), this case also becomes a `carry` job, one with no walk.
- **Otherwise** UF_Containers gives the carrier a `carry` job through `UF.Colonists.order` (`UF_Colonists.js:1432-1441`): a player order, which cancels the carrier's current job with "ordered elsewhere". `order` only accepts colonists (`colonist(unitId)`), and every carrier in the table is one of your colonists. The source item gets a pending badge (§5.4).

### 5.3 The `carry` job (defined by UF_Containers)
`params: { itemId, count, from: HolderRef, to: HolderRef, slot | null, then: null | { equip: slotName }, ordered: true }`

| Phase | Plan | Apply |
|---|---|---|
| 0: take (skipped when the carrier already holds the item) | Stand on the item's cell (ground), or on a 4-neighbour of the container's cell (`standFor(…, adjacentOnly)` when the container blocks) | `Items.move(itemId, unit(carrier), { count })`. Refused if the carrier's pack is full and nothing merges: the job fails `full` and nothing moves |
| 1: deliver | To a cell: stand on it or next to it. To a container: a 4-neighbour. To a person: a neighbour of where they stand now, re-planned every 30 updates while they move (as `hunt` does, `REPLAN_TICKS`, `UF_Jobs.js:48`). The handler sets `replanEvery: 30`; UF_Jobs applies it to every phase (L845), which for a fixed cell only repeats the same plan. It fails "can't reach them" (P) when the recipient leaves the area or level, or after UF_Jobs' two blocks | `Items.move(itemId, to, { slot })`. The requested slot if still free, else the first free one. If the destination filled up or is gone, the job fails with that reason and **the item stays in the carrier's pack** |
| `then.equip` | — | `Items.equip(recipient, itemId, slot)` |

- **Cancel:** the item stays in the carrier's pack. This differs from `haul`, which puts it down at the carrier's feet, but a player order shouldn't litter. If the carrier's pack is over capacity (AI pickups ignore capacity, §8.4), nothing new is refused; it just stays.
- **The carrier leaves the world:** the job is owned, so UF_Jobs fails it with "the worker is gone" (`release`, §1.3) instead of reopening it for anyone. The item falls to the ground with the rest of the pack (`world:unitRemoved`).
- **Profile text (V89), split the way `haul` splits it:**
  - the doing line (`describe`) says "Moving a log" (P), the counterpart of "Hauling a log";
  - the load line comes from `UF.Sheet.loadOf`, which gains `carry` beside `haul`/`fetch` once the item is in hand: "Carrying a log to the chest", "Carrying a log to Anna", "Carrying a log to (140, 118)" (P). `placeName` gets a HolderRef branch: a `unit` ref gives the person's name, a `box` ref "the <container name>", and a `cell` ref the existing rule.
  - The draft's describe texts were the same words as the load line, so the profile would have said them twice.
- **Work:** 0 today. When WORK_TIMING lands, the catalog entry is `work.jobs.carry.beats: [1, 1]`, the same as its `haul`. Movement is one cell per world beat under V102, so a carry six cells away takes about 8 beats (8 s at ×1).
- **Skill:** hauling, through `UF.Skills.mapJob("carry", "hauling")` at boot when UF_Skills is loaded (D6). UF_Colonists' private `SKILL_OF` (L67), used for job choice and the older skill counts, still gets `carry: "hauling"` as an owner change (§14.3).
- **Levels:** stands and targets carry z. A destination on another level needs V2's routes (VERTICAL_BUILD_PLAN §6.5). Until V2 lands, such orders are refused as `other_level`.

### 5.4 Pending moves and reservations
- **Pending badge:** while a `carry` job is active, its item shows a small badge in its grid. Dragging it again cancels that job and starts a new order (the player's latest order wins).
- **Reserved slot:** a `carry` job with a requested `slot` in a box or pack reserves that slot. Other drops treat it as occupied (`reserved`). The reservations are rebuilt from active jobs after a load, not saved separately.
- **Item already in use:** an item that is the `params.itemId` of another active job (a colonist's haul, fetch or carry) is refused as `busy`. The exception is when that job belongs to the source person, in which case the player's drag cancels it.
- **Other haulers:** UF_Colonists' `claimed()` (L555-567) needs `carry` added to its haul/fetch rule (owner change). Until then a colonist may pick the same item for a haul. The `carry` job then fails with "the item is gone" (fail-closed; nothing is duplicated).

### 5.5 Levels
- Map drops go to the level on screen (`UF.Levels.viewZ()` / `W.viewLevel()` when the five-level V1 exists, else z 0).
- Windows of other levels stay usable as drag sources and targets. The orders then cross levels (§5.3).
- **UF_Sheet needs its own z pass for this.** `subjectAt`, `handleMapClick` and `Sheet.open` use `W.currentArea()`, which VERTICAL_BUILD_PLAN D2 makes `null` whenever a level other than the ground is on screen. That plan lists the fix as an owner change for UF_Sheet (its §8: "`W.viewLevel()` as the area, passing z"). Stage 3 edits UF_Sheet anyway, so it makes that change, merged with whoever holds UF_Sheet then (§14.2). Until then, cell panels and map drops on `+1`/`+2`/`-1`/`-2` don't work, and the `levels` check FAILs.

---

## 6. Refusals

Code → the text in the footer (all P) and a buzzer. Hovering shows the same text before release.

| Code | When | Text (P) |
|---|---|---|
| `full` | The destination grid has no free slot and nothing to merge into | "No room" / "<Name> has no room" |
| `not_accepted` | The container's `accepts` doesn't match | "A barrel holds food and seeds" |
| `wrong_slot` | The item doesn't fit that equipment slot | "Goes on the <slot>" / "Can't be worn or held" |
| `two_hands` | A shield while the weapon needs both hands | "Needs both hands" |
| `stranger` | A stranger's or animal's pack as target, or a drop onto them on the map | "Not one of your people" |
| `owned` | The container or item is owned by another faction or its people | "Belongs to <owner>" |
| `other_level` | A cross-level order before routes exist | "On another level" |
| `no_carrier` | Nobody of yours can carry it (§5.2) | "Nobody near enough to carry it" |
| `water` / `blocked` / `no_floor` | Cells that can't hold items (§4.4) | "It would sink" / "No room there" / "Nothing to put it on" |
| `busy` | Another job is carrying it (§5.4) | "Someone is already carrying it" |
| `reserved` | The slot is promised to a carry job | "Saved for a delivery" |
| `moved` | The item changed during the drag | "It moved" |
| `unreachable` | The carrier's plan finds no stand cell (from the job's reason) | "Can't reach it" / "Can't reach them" |
| `gone` | A `carry` job's destination container or recipient no longer exists (a job failure, §3.7, §5.3) | "The chest is gone" / "<Name> is gone" |

---

## 7. Input: sharing the mouse with UF_Select, the Overseer and the menu

### 7.1 Who owns a press
1. **Item drags only start on item slots of UF grid windows. Map drags never start on windows.** A press is decided once, on its trigger frame, and the whole gesture belongs to its owner:
   - UF_Interact's menu, when it is open (it is modal; nothing arms);
   - else a UF window under the pointer: the panel or a floating window. It consumes the trigger, as the panel does today (`consumeClick`). On an occupied draggable slot it selects the slot and, when the button is held, arms an item drag (§4.1). On a floating title bar it starts a window move. Anywhere else it is a click;
   - else the map (UF_Select's claim, SELECTION §3.2; then the Overseer and UF_Sheet's map click as today).
2. **A press that began in a window never becomes a box**, even when the pointer is released over the map. SELECTION §2.1 already says this ("Press on any UI … Nothing happens on the map for the whole gesture"), and floating windows are window-layer children, so `UF.Look.isOverUI()` and UF_Select's `pointerOverUI()` see them. UF_Sheet also extends its `isAnyWindowUnderMouse` wrap (`installWraps`, `UF_Sheet.js:1446-1450`) to the floating windows. The window consumes the trigger in the children update, before UF_Select's claim runs (SELECTION §3.8), so the claim never sees it.
3. **A press that began on the map never becomes an item drag**, even when the pointer passes over a window. UF_Sheet ignores hover while `UF.Select.box()` is set.
4. **Click or drag:** RMMZ's 10 px threshold (§1.8). The slot is selected on the press, and a release before the pointer moves ends the gesture with nothing more. UF_Select uses a cell change for map boxes (SELECTION §3.3), and the two never share a press.

### 7.2 Frame order (additions to SELECTION §3.8)
```text
SceneManager.updateMain
  Input.update, TouchInput.update
  Scene_Map.update, outermost alias first:
    UF_Select (pre)       replay, Esc (leaves it alone during an item drag or with UF_Sheet windows open: §7.6), tool keys
    ... UF_Sheet (pre): reads click and over-UI
      core Scene_Map.update (updateDestination, updateMainMultiply, ...), then Scene_Base.update → updateChildren:
          window layer: panel and floating windows take presses (select, arm, title bar) and consume the trigger;
                        while a gesture is armed or dragging they return at once (§4.1)
          UF_SheetWindows drag controller (a scene child added after the window layer by its createAllWindows alias):
              armed → dragging; hover target; release → drop → UF.Containers.order; consume `released`
              right-click or Esc while armed or dragging → cancel, consume `cancelled` / the key
              lost button, release outside the canvas → cancel
      UF_ColonyOverseer.updateOverseerControls → UF_Select claim → UF_Interact menu → Overseer
    UF_Sheet (post)       Esc → topmost floating window, else the panel; map click → panel; double-click → floating window (§7.4)
```
Because the drag controller runs in the children update, it reaches the release and the right-click before UF_Select's claim, UF_Interact's `handleMouse` and the Overseer read them. That order was checked in the code: the Overseer's `Scene_Map.update` alias calls the original update first and `updateOverseerControls` after it (`UF_ColonyOverseer.js:168-172`), and UF_Interact's `handleMouse` runs inside that function (`UF_Interact.js:850-855`). Consuming them there keeps the menu shut, the selection intact and no move order made.

**Consuming `released`:** today's `consumeClick` clears only `triggered` and `cancelled` (§1.2). The build adds `consumeRelease()`, the same `_currentState` swap with `released: false`. RMMZ's `isClicked()` is already false after a drag, because `_moved` is set.

### 7.3 Right-click and Esc
- **Right-click during an item drag:** cancel it and consume `cancelled` (above).
- **Esc during an item drag:** cancel it and consume the key with `Input._latestButton = null`, SELECTION's one-frame key consume (its §3.7). `Input.isTriggered("escape"/"cancel"/"menu")` is then false for the rest of the frame, so UF_Sheet's post handler doesn't also close a window. UF_Select reads Esc in its outermost pre-alias, before the drag controller runs, so it must leave Esc alone while `UF.Sheet.isDragging()`. That is a change to SELECTION §2.2 (§7.6).
- **Esc with no drag:** UF_Select's own steps (box, tool, wall picker) run first, as SELECTION §2.2 orders. After them, the topmost floating window closes, else the panel. Only when neither is open does UF_Select clear the selection. That is the second change to SELECTION §2.2.

### 7.4 Double-click
- Two left clicks on the same map cell within `containers.doubleClickFrames` (30 frames, half a second at 60 fps, which is the Windows default double-click time; P), as seen by UF_Sheet's post handler. The draft's 20 frames (333 ms) is shorter than many people's double-click. UF_Select's replayed slow clicks (SELECTION §3.4) are shifted by the same frame, so the gap is unchanged. A fast click is handled in its own frame without a replay, so a mixed pair is off by one frame, which doesn't matter.
- The first click still does what a click does: the panel opens on the cell and, with a colonist selected, the Overseer orders a move (today's behaviour, UF_Sheet.md → Known limits). The menu option (§3.5) opens a window without that side effect.
- Double-click inside a window does nothing in this design ("use" is backlog, §17).

### 7.5 Modifiers
A capture-phase `mousedown` listener on `document`, added by UF_Sheet, records `shiftKey` / `ctrlKey` for the press. `Input.isPressed("shift"/"control")` is the fallback (RMMZ's `keyMapper` maps 16 to "shift" and 17 to "control"). Shift in a window never clashes with UF_Select's Shift-to-add, because the two never own the same press.

### 7.6 Changes asked of SELECTION.md / UF_Select (Claude Code, the same agent; recorded here so the two designs agree)
- §2.2 Esc row: "acts only when no menu, talk, message or list window is open **and no item drag is in progress (`UF.Sheet.isDragging()`)**".
- §2.2 Esc steps: "cancel the box → leave the tool → close the wall picker → **(UF_Sheet closes the topmost floating grid window, else the panel; UF_Select leaves Esc alone while `UF.Sheet.windows().length > 0` or `UF.Sheet.isOpen()`)** → clear the selection". SELECTION's "(the Sheet panel closes itself)" already implies this for the panel. This makes it explicit and adds the floating windows.
- §3.6 `pointerOverUI()`: floating grid windows are window-layer children, so no change is needed. The legacy-gump scan becomes unnecessary once UF_Gumps retires (D12).
- §14 `select.no_clickthrough`: add "a press on a floating grid window's slot, dragged over units and released on the map, makes no box". The `dragdrop.map_drag_untouched` check (§12.4) covers the other direction.

---

## 8. The item API (`UF_Items.js`)

### 8.1 Holder refs
```text
HolderRef = { kind: "unit", id }                       // a unit's pack: the grid (equipment is separate, §8.3)
          | { kind: "box",  area: {x,y}, x, y, z }     // a container object's grid
          | { kind: "cell", area: {x,y}, x, y, z }     // the ground: no grid, no capacity, stacks merge
refKey(ref): "u:<id>" | "b:<levelKey>:<x>,<y>" | "c:<levelKey>:<x>,<y>"   // levelKey as VERTICAL_BUILD_PLAN §2.1 (ground = the old areaKey)
```
An omitted `z` means the ground, as VERTICAL_BUILD_PLAN D1 rules.

### 8.2 Record fields (additions)
| Field | Where | Meaning |
|---|---|---|
| `slot` | carried (unequipped) and boxed items | Grid index `0 … columns × rows − 1`. `null` when equipped, on the ground, or overflowing a pack past its capacity |
| `box` | boxed items | `{ area: {x,y}, x, y, z }`. `area` and `holder` are both null, so the ground index, the sprite layer and every ground search skip it |
| `z` | ground items | From the five-level V1 (not this design) |

### 8.3 Functions
| Function | Returns / does |
|---|---|
| `Items.holderOf(itemId)` | The item's `HolderRef`, or null |
| `Items.equippedSlot(itemId)` | `"weapon"` etc., or null |
| `Items.inHolder(ref)` | The records in slot order (unit: unequipped only; cell: `atIn` order) |
| `Items.grid(ref)` | `{ columns, rows, slots: [item or null], overflow: [item] }`, or null for a cell |
| `Items.freeSlot(ref)` | The first free index, or −1 |
| `Items.registerHolder(kind, { grid(ref), accepts(ref, type) → null or reason, exists(ref) })` | UF_Items registers `unit` (grid = catalog `sheet.grid`, accepts all) and `cell`. UF_Containers registers `box` |
| `Items.canMove(itemId, to, { count, slot })` | `{ ok, reason, slot, mergeInto }`. Pure: capacity, filter, stack size, slot. **No reach, ownership or faction rules** (those are UF_Containers') |
| `Items.move(itemId, to, { count, slot, force })` | Does it: split, merge, swap within one holder, first free slot. `force` (jobs' old path) skips capacity only. Returns `{ ok, reason, item, left, mergedInto: [ids], swapped }` |
| `Items.equip(unitId, itemId, slot?)` | Validates the slot (§4.6) and that the item is carried by the unit. Sets `equipment[slot]`, clears the item's `slot`, and returns `{ ok, reason, slot, displaced }`. **Mirrors the old keys** until every reader moves: `tool` = the weapon when it has a `tool` block, else null; `clothes` = the torso item when it has `wear`, else null. Sets `data.tier` and calls `UF.Colonists.setTier` for `wear` (as the `equip` job does, `UF_Jobs.js:427-433`) |
| `Items.unequip(unitId, slot, { toSlot })` | Clears the slot (and its mirrored old key), gives the item `toSlot` or the first free slot, and resets the tier for `wear` (§4.6). Refused `full` |
| `Items.equipped(unitId)` | `{ head, weapon, shield, torso, legs }` records or null (the old keys are read through `sheet.slotAliases`). A value that is a type id with no record (UF_Combat's virtual gear, D1) reads as null here. UF_Sheet still shows it through its own `resolveEquip`, and UF_Combat still fights with it |
| `Items.slotFor(typeId)` | The equipment slot a type goes in, or null |
| `Items.spill(boxRef)` | Every item in the box is put on its cell (merged). Returns the ground stacks |
| `Items.stats()` | `{ slotRepairs, boxIndexRebuildMs }` for checks (§8.4, §11) |
| `Items.moveTo(itemId, levelArea, x, y)` | VERTICAL_BUILD_PLAN's function, the same as `move(id, cell ref, { force: true })` |
| unchanged | `pickUp` (= `move` to the unit with `force`, slot = first free or null), `putDown` (= `move` to a cell; still deletes a record that merges away completely, L315-318), `drop`, `give`, `consume`, `remove`, `inventoryOf` (all carried, equipped too), `count`, `has`, `find` (ground only, D13), `describe` |
| changed inside | `create` with `{ holder }` (which `give` uses) and `pickUp` assign the first free slot, else null. `detach` (every path out of a holder) also clears `slot`, removes the record from the box index, and clears any equipment key of the former holder naming the item, canonical or mirrored, emitting `items:unequipped`. Without that, a `consumeFrom`, `remove` or `putDown` of an equipped record would leave `equipment.weapon` naming an item that is gone or on the ground. `consumeFrom` (L354-364) takes unequipped stacks first and equipped ones last, so a recipe never eats the tool in someone's hand while a spare is in the pack |

### 8.4 Rules
- Capacity counts stacks per grid. A pack's capacity is `sheet.grid` (8 × 4 = 32). A box's capacity is its `container` grid.
- **AI jobs keep their old behaviour** (`force`: no capacity check, UF_Items.md → Known limits). Past capacity, `slot` is null and the grid title says "(34 stacks, 32 shown)" as today. When a slot frees up, the oldest overflow stack takes it, so nothing stays hidden for long.
- One stack per slot, at most the type's `stack`. Merges never exceed it.
- **Slot integrity:** `Items.grid(ref)` treats two records claiming one slot (which only a bug can cause) by keeping the lower id there and moving the other to the first free slot. It counts each repair in `Items.stats().slotRepairs`, and the `items.holder_refs` check requires 0.
- A unit that leaves the world drops everything, equipped items too (`world:unitRemoved`, L409-412). Slots and equipment keys are cleared.
- Nothing here is random.

### 8.5 Events
`items:changed(item, "moved")` as today, plus `items:moved(item, fromRef, toRef, count)` for windows and checks. `items:equipped(unit, slot, item)` and `items:unequipped(unit, slot, item)`.

### 8.6 Compatibility
- Old readers of `data.inventory`, `holder`, `area` and the old equipment keys keep working (D1, D2, the mirror). UF_Colonists' `physicalChange` for `equip` (L1308) reads `tool`/`clothes` and keeps working through the mirror.
- **Boxed records are neither on the ground nor carried** (`area` and `holder` null). Every reader outside UF_Items was checked for that: only test fixtures walk `I.state().byId` or `I.all()` (UF_Fire, UF_Jobs, UF_Look, UF_Sheet and UF_Colonists suites, for cleanup), and they don't care where a record is.
- UF_Sheet's grid switches from inventory order to `slot`. Three `sheet` checks change with it, because each finds a slot by its index in `inventoryOf`:
  - `colonist`: "the grid is the unequipped stacks at their slots", and equipped items appear only in their slots;
  - `drop_pickup`: it locates the stone by `item.slot`, and its "the equipped axe can't be dropped" step becomes "the equipped axe has no grid slot, and Drop with the weapon slot selected does nothing";
  - `close`: it uses slot rectangles only to click on the panel, so it just needs a slot that exists.

---

## 9. UF_Containers and UF_Sheet additions

### 9.1 `UF.Containers` (new file `game/js/plugins/UF_Containers.js`)
| Member | Description |
|---|---|
| `types()`, `spec(typeOrId)` | Object types with a `container` block, and that block |
| `at(levelArea, x, y)`, `atScreen(x, y)` | `{ ref, type, grid, owner }` or null |
| `access(ref)` | `{ view, take, put, reason }` for the player's faction (§3.4) |
| `check(order)` | `{ ok, reason, text, carrier, instant, landing: { ref, slot } }` without doing anything. Used for hover feedback. `order = { itemId, count?, to: HolderRef or { kind: "equip", unitId, slot }, slot?, carrier? }` |
| `order(order)` | `{ done: moveResult }`, `{ job }` or `{ refused: code, text }` |
| `carrierFor(order)`, `inReach(unit, end)` | §5.1, §5.2 |
| `pending(itemId)`, `reservedSlot(ref, slot)` | §5.4 |
| `isOpen(levelArea, x, y)`, `isOpenRef(ref)` | A window shows it, or a `carry` job is working at it (the lid, §3.5). The positional form matches `UF.Doors.isOpen(area, x, y)`, which is what UF_Anim's `objectState` already calls for doors (§14.3). The draft had only `isOpen(ref)` here and the positional call in §14.3 |
| Job type `carry` | §5.3 |
| Runtime wraps at boot | `UF.Interact.optionsFor` ("Open chest"), `UF.Look.describeCell` ("Chest · 3 stacks inside", P), `UF.Objects.Sprite_Layer.prototype.update` (placeholder lid frames). Calls `UF.Skills.mapJob("carry", "hauling")` when UF_Skills is loaded |
| Events | `containers:opened(ref)`, `containers:closed(ref)`, `containers:spilled(ref, stacks)`, `containers:ordered(order, outcome)` |
| Suite | `containers` (§12.3) |

Load order: after UF_Items, UF_Objects, UF_Jobs, UF_Colonists, UF_Skills, UF_Interact, UF_Look, UF_Sheet (and UF_Ownership when registered); before UF_Select and UF_Test. In `tools/register_world_plugins.js`'s `ORDER` that is `… "UF_Sheet", "UF_Containers", "UF_Talk", "UF_Select", "UF_Fire", "UF_Test"` (UF_Select's place from SELECTION §13). Header: `@base UF_Items`, `@base UF_Objects`, `@base UF_Jobs`, `@orderAfter UF_Sheet`.

### 9.2 `UF.Sheet` additions
| Member | Description |
|---|---|
| `isDragging()`, `drag()`, `cancelDrag(reason)` | The gesture state `{ itemId, count, from, fromSlot, equipSlot, target, reasonText }`. `isDragging()` is true while armed as well |
| `loadOf` (existing) | Gains `carry` beside `haul`/`fetch`, and `placeName` gains HolderRefs (§5.3) |
| Panel model | `cellModel`'s container branch (§3.5); the private `isContainer` becomes `isZone` (§1.2) |
| `GridWindow` | The floating window class (Window_Base). It shares the grid, slot and icon drawing with the panel |
| `openWindow(subject)`, `closeWindow(subjectOrWindow)`, `windows()`, `windowFor(subject)` | `subject` = `{ kind: "unit", unitId }`, `{ kind: "box", ref }` or `{ kind: "cell", area, x, y, z }` |
| `screenRect(kind, which, win?)` | As today. With `win`, a rectangle of a floating window (`"slot"`, `"equip"`, `"title"`, `"close"`) |
| `perf()` | Adds `dragFrames`, `dragAvgMs`, `windowFrames`, `windowAvgMs`, `ghostBitmaps` |
| Suite | `dragdrop` (§12.4) |

**Split from the start.** UF_Sheet was 2013 lines when re-read, and the V89, V94 and V99 runs all edit or alias it (STATUS "In progress"). The draft moved code out only past about 2500 lines, but the new code (grid windows, drag controller, ghost, double-click, the `dragdrop` suite; roughly 900–1200 lines) would pass that at once. So `GridWindow`, the drag controller and the `dragdrop` suite go into a new `UF_SheetWindows.js`, registered right after UF_Sheet (the rule VERTICAL_BUILD_PLAN uses for UF_Levels). UF_Sheet itself gets only small edits:
- the slot-based grid;
- the container branch in `cellModel` and the `isZone` rename;
- `carry` in `loadOf`;
- the touch skip while a gesture is active;
- `consumeRelease`;
- the Esc order;
- the z pass (§5.5);
- the drawing helpers the windows share (`layoutFor`, the slot and icon drawing), exported on `UF.Sheet`.

`UF.Sheet`'s public members in the table above stay where they are. UF_SheetWindows adds them to the same object.

---

## 10. Save data and migration
- **`UF.World.state.items`** gains `version: 2`. Records gain `slot` and `box` (§8.2).
- **Migration from version 1** runs once, when UF_Items' `ready()` first sees a new state object (it already rebuilds its cell index there, L123-132). That covers a load and a New Game.
  - Equipped items (any equipment key naming them) get `slot: null`.
  - Each unit's other carried items get slots `0…` in `data.inventory` order up to capacity, and `null` past it.
  - `equipment.weapon` takes `tool` and `equipment.torso` takes `clothes` when empty, and the old keys stay mirrored.
  - **Conflicts:** if `tool` names a record other than `weapon`'s, or `clothes` a record other than `torso`'s, the canonical key wins. The other record is unequipped and gets a grid slot, and the old key is re-mirrored from the canonical one. Otherwise it would be "equipped" through a key no slot shows, so it would appear nowhere. No colonist has both today (checked 2026-09-19: only test fixtures write `equipment.weapon`; the `equip` job writes `tool`/`clothes`), but saves are not checked for it.
  - Equipment values that are type ids stay as they are (D1).

  A record `{ from: 1, to: 2, units, items, conflicts }` goes into `state.items.migrations`. No item changes holder, cell or count.
- **Two separate versions:** `state.items.version` is independent of the world state's version, which VERTICAL_BUILD_PLAN §2.2/§5.5 raises to 4 (its migration sets `item.z = 0`). Neither migration reads the other's fields, so their order doesn't matter.
- **No downgrade:** a build from before this design that loads a version-2 save sees boxed records with `area` and `holder` both null. It neither draws nor finds them, so they look lost until the save is opened with this build again.
- **`unit.data.equipment`** uses the canonical V49 keys, with the mirrors of §8.3.
- **`state.jobs`:** `carry` jobs with `params.from` / `to` as HolderRefs, including z.
- **`state.ownership.claims`:** container claims under UF_Ownership's key, which needs z (§14.3).
- **Not saved:** open windows, their positions (kept in module state across level switches only, §3.5), the drag, reservations (rebuilt from jobs), the box index (rebuilt from records).
- **UF_Gumps' `contents.ufContainers`:** not converted, because its containers belonged to editor-map events the generated world doesn't use. If a loaded save has entries there, the migration record notes how many. With UF_Gumps off, nothing reads or writes the key any more, so **it is gone after the next save**. The draft said it "is left as it is", which is true only until then.
- **Size:** a boxed item adds about 40–60 bytes (box ref and slot), a carried one about 9 (slot). 1000 boxed items add about 60 KB, against V50's 3 MB save budget. The `saved` checks print the measured number.

---

## 11. Performance (V50)
These are targets within V50's "≤ 1 ms per plugin per frame". The checks measure them and print the method.
- **Idle** (no drag, no floating window): the drag controller reads one state flag. Target ≤ 0.01 ms per frame over 120 frames.
- **Dragging:** per frame:
  - the pointer is read;
  - the rectangles of ≤ 5 windows are tested;
  - one cell lookup is made through `cellUnderMouse`;
  - the ghost's x, y are set.

  `check(order)` and the highlight redraw run only when the hovered target key (window + slot, or cell) changes. The ghost reuses the cached icon and one count bitmap, so **no new Bitmap after the first drag of an item type**. Target ≤ 0.2 ms per frame average over 120 frames of motion across the map at zoom ⅓ with 4 windows open and the world running at ×1.
- **Floating windows:** the panel's model. The model is rebuilt every 15 frames and redrawn only on a signature change, a click or a hover change. The panel measured 0.111 ms per frame in its worst case (UF_Sheet.md → Efficiency). Target ≤ 0.1 ms per open window and ≤ 0.4 ms for four.
- **Box index:** a Map from box key to ids, rebuilt from records on load (O(items)), with O(1) lookups. Boxed items never enter the ground index or the item sprite layer, so they cost nothing to draw. Target: rebuild of 2000 boxed items ≤ 5 ms.
- **Spill listener:** one Map lookup per `objects:changed`.
- **`carry` jobs:** the cost of a normal job. They re-plan only for moving recipients, every 30 updates.
- **Container lid framing:** each update, the placeholder wrap sets the open frame on the sprites of the open containers: at most 4 windows plus the active carries, each found with one `O.spriteAt` lookup (§3.5). It returns at once when nothing is open.
- **Timer resolution:** Chromium may coarsen `performance.now()`. Each perf check prints the smallest non-zero difference it observed next to its averages, so a 0.01 ms target isn't judged with a 0.1 ms clock without saying so.

---

## 12. Checks (each seen failing once before it counts; AGENTS rule 4)
**Provoking failures:** `UF_TEST_PROVOKE=<suite>.<check>` switches off or breaks one behaviour in the code path. It is inert unless UF_Test is active, like the switch UF_Ownership, UF_Walls, UF_World and UF_Ecology already use (checked in the code: `process.env.UF_TEST_PROVOKE`, e.g. `UF_World.js:671`). SELECTION uses the other existing pattern, UF_Talk's `TestProvoke` plugin parameter. Both work, and each suite states which it reads. Each check below names its provocation. The run with the provocation must print FAIL, and the run without must print PASS.

**Checks that need another run's code FAIL, and never pass silently, when that code is missing:** `map_drag_untouched` without UF_Select, `levels` without UF_Levels, and `built_and_owned`/`access` without a registered UF_Ownership. Each says which plugin is missing. UF_Test has no "skipped" result, and AGENTS rule 4 forbids a check that can't FAIL.

**Time budget.** UF_Test ends the whole run after 180 s (`UF_Test.js:196`), counted from boot, and runs one suite per `--uf-test=<name>`. Walking is one cell per world beat under V102 (1 s at ×1). So:
- every check that waits for walking or work runs with the world at ×4 (`UF.Time.setLevel(2)`; speeds 1, 2, 4, 8, `UF_TimeSpeed.js:45-66`), with a timeout of `(cells + beats) × 60 / 4 frames + 5 s`, not a flat 40 s;
- `containers` and `dragdrop` each print their total time, and each must stay under 150 s including boot;
- if one of them doesn't, its walking checks move to a second suite (`containers_walk`, `dragdrop_walk`), not a longer watchdog.

### 12.1 The driver: real TouchInput drags
- Every gesture is driven by DOM `MouseEvent`s (`mousedown`, `mousemove`, `mouseup`, with `button`, `clientX/clientY`, `shiftKey`, `ctrlKey`) dispatched on `document`. They reach TouchInput's own listeners, as in SELECTION §14.1. No check calls UF_Sheet's or UF_Containers' functions in place of a gesture. Functions may only be read to judge the result.
  - Coordinates are the inverse of `Graphics.pageToCanvasX/Y` (`rmmz_core.js:674-697`): `client = canvas × Graphics._realScale + canvas.offsetLeft/Top`.
  - RMMZ reads `event.pageX/pageY` (§1.8). A synthetic `MouseEvent` has `pageX = clientX` when the page isn't scrolled, which is the case in NW.js. `driver_reaches_rmmz` proves it on the machine rather than assuming it.
  - A drag is at least 3 moves of 12 px or more (past the 10 px threshold), one per frame, then the release. A "slow" press waits 5 frames before the first move, so the press frame and the arm are separate frames, as with a real hand.
- **Guard:** during the suite, a capture-phase listener on `window` stops trusted mouse **and key** events (`event.isTrusted`, the real hand) and lets the synthetic ones through, so the user can't disturb a run. It is removed in `finally`. It also counts `blur` events. A blur during a gesture (which calls `TouchInput.clear()`, §1.8) makes that check FAIL with "window lost focus, rerun", not PASS.
- **Keys** (Esc, Shift, Ctrl) are `KeyboardEvent`s with `keyCode` dispatched on `document`, as SELECTION §14.1 does, so they go through RMMZ's own `Input._onKeyDown` (`rmmz_core.js:5886`). The draft set `Input._currentState.escape` directly, as the `sheet` suite does (`UF_Sheet.js:1843`), which skips RMMZ's listener. Shift and Ctrl drags send the key down before the press and up after the release, and also set `shiftKey`/`ctrlKey` on the mouse events, so both modifier paths of §7.5 are exercised.
- **Fixture:** the `sheet` suite's approach. An open 9 × 7 arena, the world paused and colonist decisions off except where a check needs walking, and cleanup in `finally`. If UF_Select's build adds a shared pointer helper to UF_Test, both suites use it.

### 12.2 `items` (additions to the existing suite)
| Check | FAIL when | Provocation |
|---|---|---|
| `holder_refs` | `holderOf` is wrong for a ground, a carried, an equipped or a boxed record, or `inHolder` isn't in slot order | `items.holder_refs`: boxed items report `cell` |
| `move_rules` | A split doesn't make a new record with the moved count, a merge passes `stack`, a move into a full grid succeeds, a filtered box accepts a wrong tag, or a same-holder swap fails | `items.move_rules`: capacity ignored |
| `equip_api` | After `equip(spear)`: `equipment.weapon` isn't the spear, `tool` isn't null (the spear has no `tool` block), the spear keeps a `slot`, or `equipped().weapon` differs. After equipping an axe: `tool` isn't the axe. A helmet in `weapon` is accepted. A shield next to a two-handed bow is accepted. `unequip` doesn't give a slot. Unequipping a fiber wrap leaves `data.tier` above 0 | `items.equip_api`: mirror not updated |
| `detach_clears_equipment` | After `consumeFrom` of the equipped axe's type (with a spare axe in the pack), `remove` of an equipped helmet and `putDown` of an equipped spear: any equipment key, canonical or old, still names one of them; the spare wasn't the one consumed; or no `items:unequipped` was emitted | `items.detach_clears_equipment`: detach leaves the keys |
| `slots_migrated` | A version-1 copy of the state (slots stripped, `tool`/`clothes` only) doesn't come back with slots in inventory order, `slot: null` on the equipped items and the canonical keys set, or any item's holder/area/count changed. A second copy with `tool` = axe and `weapon` = spear doesn't end with the spear in `weapon`, the axe in a grid slot, `tool` null and one entry in `conflicts` | `items.slots_migrated`: equipped items keep a slot |
| `boxed_not_on_map` | A boxed item is in `atIn`, `find` or `inArea`, or has a sprite in the item layer | `items.boxed_not_on_map`: boxed items indexed as ground |
| `spill` | `spill` doesn't put all 3 stacks of a box on its cell (merged to `stack`), or leaves any `box` set | `items.spill`: the first item skipped |
| `saved_holders` | A JsonEx round trip of `makeSaveContents()` loses `slot`, `box` or z, or the box index after a reload differs | `items.saved_holders`: `box` dropped in the copy |

### 12.3 `containers` (new suite, not in the default set)
| Check | FAIL when | Provocation |
|---|---|---|
| `catalog` | A container block has a grid outside 1–12 × 1–8, an `accepts` tag no item carries, a build cost naming an unknown item, no image or tile, or a placeholder open row/tile outside its sheet | a snapshot catalog whose barrel accepts `drinkz` |
| `built_and_owned` | A designated chest built by a test colonist isn't the object on the cell, or UF_Ownership has no `faction` claim for the player's faction on it (with z). FAILs, naming the cause, while UF_Ownership isn't registered | `containers.built_and_owned`: claim skipped |
| `menu_open` | Driven through §12.1: a DOM right-click on the chest cell, then a DOM click on the menu row. "Open chest" is missing on a chest cell or offered on a non-container cell (a DOM right-click on bare ground), or clicking it doesn't open a floating window for that chest | `containers.menu_open`: label changed |
| `lid_frame` | While its window is open, the chest sprite's frame isn't the open frame (`!Chest` row 3 rectangle). After the view is scrolled away and back, so the pool re-assigns the sprite (§3.5), it isn't open again. After closing, it isn't the closed frame. Screenshot | `containers.lid_frame`: the open frame is set only when the open state changes |
| `profile_text` | During a `carry` into the chest, with the item in hand: the panel's doing line isn't "Moving a log", or its load line (`UF.Sheet.drawnLoadText()`) isn't "Carrying a log to the chest" (V89, §5.3) | `containers.profile_text`: `loadOf` ignores `carry` |
| `access` | `access` lets the player take from or put into another faction's chest, or refuses its own faction's, a public one or an unowned one | `containers.access`: ownership ignored |
| `order_rules` | Through `order()`: a far move doesn't make a `carry` job owned by the right carrier (each §5.2 row), an in-reach move makes a job, a cross-level move before routes isn't refused `other_level`, or a `busy` item is accepted | `containers.order_rules`: reach radius 99 |
| `carry_walks` | With the world running, a `carry` from a colonist 6 cells away into a chest doesn't finish within its timeout (§12): the colonist ends beside the chest, the item is in the chest at the requested slot, and it was never in the chest before the colonist arrived (sampled every frame) | `containers.carry_walks`: phase 1 applies at once |
| `carry_to_moving_person` | A carry to a person who is walking away doesn't end with the item in their pack (it went to their old cell or the job failed) | `containers.carry_to_moving_person`: no re-plan |
| `spill_on_removal` | Dismantling a chest with 3 stacks doesn't leave them on the cell (and the dismantle yield), its window stays open, or a `carry` that was heading into it doesn't fail `gone` with the item still in the carrier's pack | `containers.spill_on_removal`: listener off |
| `stockpile_not_box` | A drop order onto a stockpile makes a boxed record, or doesn't put the item on one of its cells by the §4.4 rule | `containers.stockpile_not_box`: stockpile registered as a box |
| `ai_blind` | `Items.find({ tags: ["food"] })` returns berries that are in a barrel (D13, stages 1–3) | `containers.ai_blind`: boxed items indexed |
| `perf` | Box index rebuild of 2000 boxed items > 5 ms. Or, with 200 filled containers in the area and no window open, the plugin's per-frame work over 120 frames > 0.01 ms (performance.now around its update and wraps; method printed) | a 1 ms busy wait in the Sprite_Layer wrap |
| `saved`, `no_errors` | As in the other suites | as they do |

### 12.4 `dragdrop` (new suite in UF_SheetWindows, not in the default set; every gesture through §12.1)
| Check | Gesture | FAIL when | Provocation |
|---|---|---|---|
| `driver_reaches_rmmz` | Press at a probe point | `TouchInput.isPressed()` isn't true, or `TouchInput.x/y` isn't within 1 px of the probe after the moves | `dragdrop.driver_reaches_rmmz`: the guard swallows synthetic events too |
| `click_is_not_drag` | Press and release on a slot without moving (slow: 5 frames held). Then a trigger with no held button (the `sheet` suite's `_newState.triggered` click) on another slot | Either click left no slot selection in the footer, a ghost appeared, the second one armed, or anything moved | threshold 0 (every press drags) |
| `panel_on_chest` | A DOM click on a chest holding 2 stacks | The panel doesn't show the chest's grid with both stacks at their slots and the owner line (V59, §3.5), or dragging one of them to the pack doesn't move it | `dragdrop.panel_on_chest`: the container branch is off, so the chest shows as a plain building |
| `reorder` | Log × 3 from slot 0 to empty slot 5 | The record isn't at slot 5, slot 0 isn't empty, or the drawn slots (opaque pixels, as the `sheet` suite reads them) disagree | `dragdrop.reorder`: slot ignored |
| `swap` | A on B (other type, same pack) | They didn't exchange slots | swap refused |
| `merge` | Log × 3 onto log × 4 (stack 5) | The target isn't 5, the source isn't 2 under its own id, or a new record appeared | merge ignores `stack` |
| `split` | Shift-drag berries × 9 to an empty slot; Ctrl-drag to another | Not 5 and 1 moved as new records with 3 left, or the ghost's count plate doesn't read the count | modifier ignored |
| `equip_and_back` | Spear onto the weapon slot, then back to the grid. Helmet onto the weapon slot | The spear isn't in `equipment.weapon` and out of the grid, the weapon slot isn't drawn, or the UF_Anim layer list lacks the spear when UF_Anim is loaded. Back in the grid: the slot is still set. The helmet is accepted (no `wrong_slot`) | slot validation off |
| `drop_in_reach` | Pack → the adjacent map cell | Not on that cell (x, y, z) in the same frame, a job was made, or the cell's item sprite isn't visible there | reach radius 0 |
| `drop_far_walks` | Pack → a cell 6 away, world running | The item is on the cell before the colonist is within reach of it (sampled per frame), no `carry` job owned by that colonist exists, no pending badge is drawn, or it isn't on the cell within its timeout (§12) | far drops apply at once |
| `refused_cells` | Onto water, a wall and an oak | Any of them moved the item, the footer lacks the reason, or the buzzer wasn't played (a `SoundManager.playBuzzer` spy) | cell test off |
| `into_chest` | Double-click the chest (two DOM clicks), then pack → chest slot 3 with the colonist adjacent | No window opened, the record isn't `box` = that chest with z at slot 3, or the chest window's slot 3 isn't drawn. Screenshot mid-drag over the chest window | `dragdrop.into_chest`: the double-click window never opens |
| `out_of_chest_far` | Chest slot → the pack of a colonist 5 away | Instant (in the pack at once), or not in the pack within its timeout (§12), or the carrier isn't the receiving colonist | instant moves |
| `filter_and_full` | Log → barrel. Berries → barrel. A 9th stack → a full basket. Same-type onto a non-full basket stack | Log accepted, berries refused, the 9th accepted, the merge refused | filter and capacity off |
| `hand_over` | Pack A → colonist B on the map (adjacent), then → B's pack window | Not in B's first free slot, or a job was made | recipient ignored (put on the cell) |
| `strangers_and_owned` | Press on a stranger's pack slot. Pack → a stranger on the map. Chest owned by another faction → pack | A ghost appeared on the stranger's slot, or either move changed anything | ownership and faction checks off |
| `cancel_paths` | Release on the source slot. Right-click mid-drag over the map, and again over the panel. Esc mid-drag with a floating window open. Release on the clock. Release outside the canvas. A synthetic `blur` on `window` mid-drag (the lost button) | Anything changed, or the drag didn't end. For the right-clicks: UF_Interact's menu opened, the Overseer's selection changed, or the panel closed (§4.1). For Esc: the panel or the floating window closed as well. For the release outside the canvas: the item landed on an off-screen cell | right-click not consumed |
| `map_drag_untouched` | Slot → dragged across units and oaks → released on bare map | UF_Select drew a box (`UF.Select.box()` non-null on any frame), the selection changed, the Overseer made a move job, or the panel changed subject. Also a map press-drag doesn't start an item drag. **FAILs when UF_Select isn't loaded** (the stage-3 build waits for it) | `dragdrop.map_drag_untouched`: slot presses not consumed |
| `windows` | Double-click (two DOM clicks, 12 frames apart) a chest, a barrel, a basket, a pile and one of your colonists. Then a DOM right-click on the map to open UF_Interact's menu | Fewer than 4 windows, the oldest not closed at the fifth, a window outside the screen or over the panel, the close box, right-click or Esc (topmost first) not closing, a press not bringing a window to the front among the floating ones only, or the menu not above every floating window in `_windowLayer.children` (§3.5's insertion index). Screenshot | cap off |
| `window_move` | Title bar dragged by (100, 40), then dragged over the panel and a press on the part that covers the panel | The window didn't move by that much, an item drag or a box started, or the panel took the press under the floating window | title bar not a handle |
| `levels` | View `+1` through UF_Levels' own key (a DOM `keydown` for `,`/`.`) with a chest window open. Drop onto a floor cell and onto open air; a far order to a person on the ground. FAILs, naming the cause, when UF_Levels isn't loaded | The chest window didn't come back after the switch (§3.5), wrong z, open air accepted, or the cross-level order not refused before V2 | z taken from the carrier |
| `perf` | 120 frames of drag motion over the map at zoom ⅓ with 4 windows open, world at ×1; then 120 idle frames | Drag average > 0.2 ms, idle > 0.01 ms, or a new Bitmap during the drag after the first (method printed) | a 1 ms busy wait in the ghost update |
| `saved` | After the moves | A save round trip loses a slot, a box, an equipment key or a pending `carry` job, or the reopened chest window shows different slots | slots stripped on save |
| `no_errors` | — | Any error during the suite | a pushed error entry |

### 12.5 Screenshots and regressions
- **Screenshots** (each opened and described before it counts, AGENTS rule 5):
  - `dragdrop.into_chest.png`: the ghost over the chest window's slot, highlighted;
  - `dragdrop.windows.png`: the pack, chest, barrel and basket windows with the panel;
  - `containers.lid_frame.png`: the open chest on the map with its window.
- **Regression suites** on the same snapshot, one `--uf-test=<name>` run each (UF_Test runs one suite per run):
  - `smoke`, `items`, `sheet` (with the D1 changes to `colonist` and `drop_pickup`, §8.6), `jobs`, `colonists`;
  - `look` (UF_Interact's checks run in it; there is no `interact` suite, which the draft listed), `talk` (it wraps UF_Interact too), `objects`, `doors` (the Sprite_Layer wrap order), `anim`;
  - `select`, `timespeed` and `overseer` (the input order they share);
  - `skills` (the `mapJob` call);
  - `ownership` (when registered), and `vertical` once V1 has landed.
- A suite that already fails on a snapshot without this build is reported as "fails the same way without it", with both runs quoted (SELECTION §14.3's rule).

---

## 13. Art (rows the build adds to `docs/ASSET_REQUESTS.md`; numbers re-checked when added, since other runs are adding rows)
Shared spec as in ASSET_REQUESTS.md: HD pixel art in the manner of Final Fantasy VI, flat 3/4 view, `art/palette/uf.hex`, alpha 0/255, 4× magenta canvas in `art/raw/`, `tools/art_check.js` and `tools/originality_check.js` pass, user approval. Object frames are 48 × 48 with anchor [24, 47] and footprint [1, 1].

| AR | Asset | Spec | Stock in use until delivered (V9; CLAUDE.md: named in the Status column) |
|---|---|---|---|
| AR-1500 | Chest: closed, open | The chest 36–40 × 26–30 px, wood with iron bands. Open: lid raised, dark empty inside (contents are never drawn). `!$UF_Chest.png` 144 × 192: row 0 col 0 closed, col 1 open, col 2 open (copy); rows 1–3 copies of row 0; sidecar `animations: { stand: [0], open: [1] }`, `passable: false` | `!Chest` (RMMZ) character 6, rows 0 / 3 |
| AR-1501 | Barrel: lid on, lid off | 26–30 wide × 34–38 tall, hoops. Open: lid off, dark inside. `!$UF_Barrel.png`, same layout and sidecar | `Inside_B` 212 (closed), 211 (open) |
| AR-1502 | Crate: closed, open | 36–40 × 32–36, planks. Open: lid slid aside, dark inside. `!$UF_Crate.png`, same layout | `Inside_B` 224 (no open frame) |
| AR-1503 | Basket | 24–28 × 18–22, woven, open top, dark empty inside, one frame. `!$UF_Basket.png`, sidecar `passable: true` | `Inside_B` 218 |
| ~~AR-1504~~ | ~~Container window skin~~ | **Withdrawn by the review.** V99 (2026-09-19 14:42, after the draft) gives every faction its own menu skin, and container windows are the player's menus (§3.6). A separate container skin would contradict it. The V99 build's skin requests cover these windows. The number is not used | — |
| AR-1505 | Drag-and-drop parts | `img/system/UF_DragUI.png`, 144 × 96: slot highlights 36 × 36 at (0, 0) valid, (36, 0) refused, (72, 0) reserved; pending badge 9 × 9 at (108, 0); map target outlines 48 × 48 at (0, 48) in reach, (48, 48) needs a walk, (96, 48) refused; no text | code-drawn |

- **AR-701** (the character-sheet parts: slot frame and equipment frames) is delivered as `art/masters/ui_character_sheet.png` (ASSET_REQUESTS L98), but it isn't in `game/img/system/` and nothing reads it yet (UF_Sheet.md L120). When the sheet integrates it, container grids use the same parts. No new request.
- **AR-510** (existing) covers the weapon rack. With stage 4 it would welcome a "with weapons" frame, which the build adds as a note there.
- **CRAFTING's Prompt 5** lists "chest (closed, open), barrel". If that prompt runs first, its deliveries satisfy AR-1500/1501. The handoff says so, to avoid double work.
- **The handoff** (`docs/handoffs/HANDOFF_containers.md`, written with the build) tells Gemini:
  - where the files go;
  - that the catalog `objects` entries switch from the stock `image`/`tile` to `!$UF_Chest` etc. (Gemini may edit the `objects` list, per HANDOFF_world_generation);
  - that the `container.open` placeholder field is then removed, because the sidecar's `animations.open` replaces it.

---

## 14. Dependencies, files and owner changes

### 14.1 Dependencies on runs in progress (STATUS "In progress", 2026-09-19)
| Run | What this design needs from it | If it hasn't landed |
|---|---|---|
| Five-level engine (UF_Levels, z passes in UF_World, UF_Objects, UF_Items, UF_Jobs, UF_Camera, UF_Look, UF_Interact, UF_Tiles; VERTICAL_BUILD_PLAN) | `item.z`, LevelArea handles, `W.viewLevel()`, `Items.moveTo`, z in job targets and stands, `W.walkable(…, { z })`, cell shapes (floor / open / solid) for §4.4; V2 routes for cross-level carries | Stage 1 waits for the V1 z pass in `UF_Items.js` (same file). Without UF_Levels everything is z 0, and cross-level orders don't arise |
| Drag selection (UF_Select, SELECTION.md) | The press claim (§3.2 there), `UF.Select.box()`, `pointerOverUI()`, Esc precedence with the two §7.6 changes | Stage 3 waits. `map_drag_untouched` FAILs without it |
| Carry/profile and combat-sprite changes (UF_Anim, UF_Sheet, UF_Combat; V89) | The load line (`loadOf`, which the review found already in UF_Sheet, §1.2) that gains `carry`; a settled UF_Sheet to edit | Stage 3 waits for UF_Sheet to land |
| Faction menu skins and face styles (V99, V100; UF_Factions, UF_Talk, UF_Sheet portrait choice) | The skin lookup the floating windows use (§3.6); a settled UF_Sheet | Windows use `Window.png`. Stage 3 merges with its UF_Sheet edits |
| Personality (V94; aliases into UF_Sheet) | Nothing, except that its UF_Sheet aliases must survive the stage 3 edits | Stage 3 re-runs its suite if it has one by then |
| DF mechanics (UF_Remains, UF_Ecology, UF_Tech, UF_Skills, UF_Jobs work timing; WORK_TIMING.md) | `work.jobs.carry` beats, and `build.level`/unlocks for container objects (V77, V84). `UF.Skills.mapJob`, which has already landed (§1.3) | `carry` has work 0. Containers are buildable at once |
| Durability (V95, V96; `docs/design/DURABILITY.md`, not written yet) | HP and armour for the four container objects from their material | Containers can't be broken, only dismantled |
| One global tick (V101, V102) | Walking one cell per beat changes the timeouts (§12) | The timeout formula uses whatever speed units have |
| Eleven peoples (PEOPLES.md) | Nothing now. Later a culture may name its own container variants | — |
| Classes (design) | Nothing | — |
| Codex: UF_Ownership | Registration in `plugins.js`, and z in object keys | No container has an owner, so V71 isn't met. Stage 2 is **not done** while this is missing: `built_and_owned` / `access` FAIL, saying so (§3.4, §16 Q10) |
| Stacked terrain (V91, TERRAIN_LEVELS.md) | Nothing specific. Hill cells on `+1`/`+2` are ground for §4.4 | — |

### 14.2 Files the build touches (not this design task, which wrote only this file)
- `game/js/plugins/UF_Items.js`: holders, slots, `move`, `equip`/`unequip`, box index, `spill`, `stats`, the `detach`/`create`/`consumeFrom` changes (§8.3), migration; checks added to `items`.
- `game/js/plugins/UF_Sheet.js` (small edits only, §9.2):
  - slot-based grid;
  - the container branch in `cellModel` and the `isZone` rename;
  - `carry` in `loadOf` and HolderRefs in `placeName`;
  - the touch skip while a gesture is active, and `consumeRelease`;
  - Esc order and the floating windows in the `isAnyWindowUnderMouse` wrap;
  - the VERTICAL_BUILD_PLAN §8 z pass (`subjectAt`, `handleMapClick`, `open` on `W.viewLevel()`);
  - exported drawing helpers;
  - the `sheet` suite's `colonist` and `drop_pickup` checks updated for D1.
- New `game/js/plugins/UF_SheetWindows.js`: `GridWindow`, the drag controller and ghost, double-click, the modifiers listener, the window registry that survives level switches; suite `dragdrop`.
- New `game/js/plugins/UF_Containers.js`: container registry and rules, `carry`, orders, reservations, spill listener, ownership claim, lid framing, menu and Look wraps, `mapJob`; suite `containers`.
- `game/data/UF_WorldCatalog.json`:
  - objects `chest`, `barrel`, `crate`, `basket` with `container` blocks;
  - a new top-level `containers` key: `{ about, maxWindows: 4, doubleClickFrames: 30, reach: 1, carrierSearch: 120, inReach: "instant" }`;
  - stage 4: `container` on `weapon_rack`.

  Written by a new `tools/add_containers_catalog.js`, which inserts the text without reformatting, as `tools/add_sheet_catalog.js` does, so Gemini's concurrent `objects` edits survive. The catalog isn't editor-managed.
- `game/js/plugins.js`: register UF_Containers and UF_SheetWindows after UF_Sheet (before UF_Talk, UF_Select, UF_Fire, UF_Test) and set UF_Gumps `status: false` (D12). The RMMZ editor must be closed first (AGENTS → editor safety). `tools/register_world_plugins.js` gets the same order in `ORDER` (§9.1). UF_Gumps isn't in `ORDER`, and the tool keeps an existing entry's `status` (`existing || …`, L55), so the `false` survives a re-run.
- Docs:
  - `docs/systems/UF_Containers.md` (new), `docs/systems/UF_Items.md`, `docs/systems/UF_Sheet.md`;
  - `docs/ASSET_REQUESTS.md` (§13 rows) and `docs/handoffs/HANDOFF_containers.md`;
  - `docs/STATUS.md`: the claim, results, and the UF_Gumps line under "Not swapped yet";
  - `docs/design/SELECTION.md` §2.2 (§7.6).

### 14.3 Changes asked of other owners (none made by this build)
| File (owner) | Change | Until then |
|---|---|---|
| `UF_Ownership.js` (Codex) | Object key with z: `object:ax,ay,z:x,y` when z ≠ 0 (ground keys unchanged); register the plugin | Containers on the same x, y of two levels share a claim. Ownership is off (§14.1) |
| `UF_Anim.js` (whoever holds it; the carry/combat, 8-way and sliding runs all have it) | In `objectState` (L777-799): play `open` for `info.container && UF.Containers.isOpen(area, x, y)` as it does for doors, and set `info.container` from the type's `container` block where `objectInfo` builds `info` | Delivered container art shows no open lid. `lid_frame` passes for stock placeholders only and says so |
| `UF_Colonists.js` (the paths-and-DF-life run) | `claimed()` L563 counts `carry` with haul/fetch. `SKILL_OF` (L67) gets `carry: "hauling"`. Stage 4: food from own-faction barrels, and hauling into containers | A colonist may take an item a `carry` job wants, and the job fails "the item is gone" |
| `UF_Jobs.js` (the three runs holding it) | The `equip` job calls `UF.Items.equip` (canonical slots). Today its plan refuses anything without `tool` or `wear` (L418-419), so a spear or a helmet can't be equipped by a job at all. `toolMultiplier` may keep reading `tool` because of the mirror | Equip jobs keep writing old keys. `Items.equipped` reads them through `slotAliases`. Only the drag equips weapons and armour |
| `SELECTION.md` / `UF_Select.js` (Claude Code) | Both §7.6 changes (Esc during a drag, and Esc with UF_Sheet windows open) and the extra `no_clickthrough` case | `cancel_paths` (Esc) and `map_drag_untouched` FAIL |

### 14.4 Build stages
1. **Stage 1, UF_Items holders:** after the five-level V1 z pass lands in `UF_Items.js`. Suite `items` additions.
2. **Stage 2, UF_Containers core:** objects, rules, `carry`, spill, claim, menu, lid frames. It is testable through `order()` without any UI, except `menu_open` and `lid_frame`, which use real clicks. UF_Gumps retires with its registration. Suite `containers`. Not done while UF_Ownership is unregistered (§3.4).
3. **Stage 3, UF_Sheet edits, UF_SheetWindows drag and windows:** after UF_Select, and after the V89 and V99 edits land in UF_Sheet. The five-level V1 is needed for the z pass and the `levels` check. Suite `dragdrop`, the screenshots, then F5 in the editor by the user.
4. **Stage 4, AI and the weapon rack:** ownership-aware stored searches (food from barrels, materials from crates), hauling into containers, the weapon rack as a container, item reservations. This touches UF_Colonists (owner change) and needs the user's go-ahead after stage 3's review.

Each stage is its own commit, report and user gate (AGENTS rules 1 and 6).

---

## 15. Player-visible text (all proposals)
- **Objects:** Chest, Barrel, Crate, Basket.
- **Menu:** "Open chest" (the pattern `Open <name>`).
- **Window headers:** "Owned by <faction>", "Shared" (both UF_Ownership's existing texts), "Unowned", "7 of 24 slots", "Holds food and seeds", "Stored here" (stockpile window, the panel's existing title), "Pack" (a person's floating window), "Inside" (the panel's grid title on a container, §3.5).
- **Footers and hover:**
  - "Into the chest, slot 4";
  - "Anna will carry it there";
  - "Moved Log × 3";
  - "Dropped Log at (140, 118)" (the panel's existing pattern);
  - the refusal texts of §6, including "The chest is gone", "<Name> is gone" and "Can't reach them".
- **Profile (V89):** the doing line "Moving a log"; the load line "Carrying a log to the chest", "Carrying a log to Anna", "Carrying a log to (140, 118)" (§5.3).
- **Look:** "Chest · 3 stacks inside".

---

## 16. Decisions needed from the user
- **Q1 (D1)** Equipped items leave the grid and show only in their slots (the U7 way). Or do they stay in the grid marked `E`, as today?
- **Q2 (D8, V85)** Are moves between holders within reach instant, or does each become a 1-beat job (WORK_TIMING's haul and equip beats), so even a hand-over takes a moment? V85 as written ("every action … hauling and the rest … takes world beats") points to the job. The draft chose instant for the U7 feel, and because a job would interrupt what the carrier is doing. Moves inside one grid and equipping from one's own pack stay instant either way. The answer is the catalog value `containers.inReach`, and both behave the same until WORK_TIMING lands.
- **Q3 (D9, V71)** May the player move one of their own people's personally owned items to someone else? The proposal is yes, with the owner record unchanged. Or should personal items move only in and out of their owner's pack?
- **Q4** Does a person's pack stay 8 × 4 = 32 stacks (today's panel grid)? That is more than a chest holds. Or should it shrink (for example 4 × 2) until carry limits and weight are designed (DF_GAP_MAP: "carry limits" missing)?
- **Q5 (D11)** At most 4 floating windows on the 816 × 624 screen?
- **Q6 (D12)** Retire UF_Gumps (its U7 gump images and the I-key paperdoll) when UF_Containers is registered? If the I key should stay, it could open the selected colonist's pack window.
- **Q7** The names in §15, the grid sizes and filters in §3.2, and the double-click time (30 frames = 0.5 s, the Windows default; the draft had 20).
- **Q8 (D5)** The weapon rack becomes a container in stage 4.
- **Q9** A double-click on a container with a colonist selected also orders that colonist to walk there (today's single-click rule). With a group selected (SELECTION §6.1), the whole group moves there. Is that acceptable, with the menu's "Open" as the side-effect-free way?
- **Q10 (V71, §3.4)** UF_Ownership is not registered. Should containers wait for Codex to register it (and add z to its keys), which is the recommendation? Or may stage 2 ship with every container unowned and open to everyone, and V71 unmet until then?
- **Q11 (V71, §3.7)** When a faction's chest is dismantled or broken, do the spilled stacks keep that faction's ownership (an `item:<id>` claim each), or become ordinary ground items anyone may haul? Keeping it is the fail-closed choice. Dropping it is today's behaviour for everything on the ground.

---

## 17. Not in this design (backlog candidates, each needs the user's go-ahead)
- Carried containers: bags, sacks, baskets on the back. This needs a holder kind "item" and nesting.
- A quantity slider for stacks.
- A "Haul" box tool for UF_Select (drag over items to send them to stockpiles or containers).
- Double-click to use (eat, drink, put on) from a grid (slice 3 draft).
- Weight and carry limits, and load slowing the hauler (WORK_TIMING mentions load).
- Barrels keeping food fresh, once food decay exists.
- Locks and keys; theft, gifts and trade (V71 needs approved rules).
- Containers with goods stamped into generated sites by UF_History.
- DF-style bins and barrels inside stockpiles filled by haulers; shelves and cabinets (CRAFTING furniture).
- Per-container window backgrounds.
- The `back` equipment slot that UF_Anim already draws (`SLOTS`, `UF_Anim.js:84`) but V49 doesn't list: cloaks and packs worn on the back.

---

## 18. Review log (critic pass, 2026-09-19)
The review re-read the code this design hooks into and changed this file only. Nothing was built or run. Evidence for each item is the file and line given in the section it points to.

**Input and the drag-selection design**
1. **Right-click over the panel during a drag closed the panel** and swallowed `cancelled`. The window layer updates before the drag controller, and the panel closes on any right-click inside it (`UF_Sheet.js:911-914`). Now windows ignore input while a gesture is armed or dragging (§4.1, §7.2).
2. **Esc conflicts with SELECTION.** UF_Select reads Esc first. The draft only asked it to skip during a drag, but SELECTION §2.2 would also clear the selection when a floating window was open. §7.6 now asks for both changes and gives the full Esc order.
3. **Arm only with a held button, and select on the press as today.** The draft selected the slot at release, which would have broken the `sheet` suite's synthetic clicks (a trigger with no button and no release, `UF_Sheet.js:1589-1600`) (§4.1).
4. **New cancel paths:** a release outside the canvas (RMMZ keeps updating x/y while the button is held, so `canvasToMapX` could pick a real off-screen cell), a lost button on a window blur (`TouchInput.clear()`), and a talk or message opening (§4.1, §4.4, §4.7).
5. **`consumeClick` doesn't clear `released`.** Consuming the release needs a new `consumeRelease` (§7.2).
6. **The ghost's draw order:** the ledger, chronicle, clock, speed widget and Look tip are scene children after the window layer, so the ghost is re-added as the last child at every drag start (§1.8, §4.3).
7. **The double-click time** went from 20 to 30 frames (§7.4, Q7).

**Windows**
8. **Stacking.** `addWindow` would put a floating window above menus created earlier. They are now inserted by index above the card (§3.5). A floating window moved over the panel takes the press there.
9. **Level switches are map transfers** that rebuild the scene (VERTICAL_BUILD_PLAN §5.3). The draft said both "level switches keep windows open" and "windows close on a map transfer". Now windows are reopened from module state, and a drag is cancelled by a switch (§3.5).
10. **V59:** a chest's panel showed no contents (`cellModel` shows grids only for stockpiles and workshops). The panel now has a container branch, with the `panel_on_chest` check (§3.5, §12.4).
11. **Lid frames:** UF_Objects' sprite pool re-assigns sprites while the view scrolls, so the open frame is re-applied every update, as UF_Doors does (§3.5). `lid_frame` now scrolls the view to prove it.
12. **UF_Sheet's z pass** (VERTICAL_BUILD_PLAN §8's owner row) is needed before any cell panel or map drop works on another level. Stage 3 takes it on (§5.5).

**Items, jobs and saves**
13. **`detach` clears equipment keys.** Otherwise `consumeFrom`, `remove` or `putDown` of an equipped record leaves the key dangling. `consumeFrom` takes unequipped stacks first. `create`/`pickUp` assign slots. Slot integrity and overflow promotion are defined (§8.3, §8.4). New check: `items.detach_clears_equipment`.
14. **The migration's `tool` vs `weapon` conflict** would have hidden an item. Its rule and a check case were added (§10, §12.2). The note that `contents.ufContainers` is lost at the next save once UF_Gumps is off was corrected, and the no-downgrade effect is stated.
15. **Type-id equipment values** (UF_Combat's virtual gear) are shown but never dragged (D1, §8.3).
16. **The clothing tier** is reset on unequip (§4.6).
17. **The `carry` skill** goes through UF_Skills' existing `mapJob` rather than an owner change only (D6, §5.3).
18. **The profile text** was split the way `haul` splits it, because the draft's describe duplicated the load line. `loadOf` and `placeName` gain `carry` and HolderRefs (§5.3). New check: `containers.profile_text`.
19. **A carrier leaving the world** fails the owned job, and a destination vanishing fails it with `gone` (§3.7, §5.3, §6).
20. **The `equip` job can't equip weapons or armour today** (its plan requires `tool` or `wear`). Recorded in §14.3.

**Rules that arrived after the draft**
21. **V85** vs instant in-reach moves: the tension is stated, with the catalog switch `containers.inReach` and a sharper Q2 (D8).
22. **V95:** containers take HP and armour from the durability run (§3.1).
23. **V99:** the separate container skin AR-1504 is withdrawn, and windows use the faction skin (§3.6, §13).
24. **V101/V102:** the timeouts are derived from distance and speed (§12).

**Checks**
25. **The harness watchdog is 180 s** for the whole run (`UF_Test.js:196`). The flat 40 s waits could have hit it, so there is now a per-suite time budget with ×4 speed and derived timeouts (§12).
26. **Keys go through `KeyboardEvent`s**, as SELECTION does. The guard now blocks trusted keys too, and it reports a blur instead of passing (§12.1). `pageX` vs `clientX` is stated, and `driver_reaches_rmmz` proves it.
27. **Checks that depend on another run FAIL, naming the cause**, rather than skipping (§12).
28. **`menu_open` now uses real clicks.** `cancel_paths`, `windows`, `window_move` and `levels` gained the cases found above.
29. **The regression list named a non-existent `interact` suite.** UF_Interact's checks run in `look` (§12.5).
30. **Timer resolution** is printed by the perf checks (§11).

**Files**
31. **The new window code goes into `UF_SheetWindows.js` from the start.** UF_Sheet is 2013 lines and edited by three other runs (§9.2, §14.2). UF_Containers' place in `ORDER` and its `@orderAfter` are spelled out (§9.1).
32. **AR-701 is delivered as a master** but not integrated, so container grids are code-drawn like the panel's (§3.6, §13).
33. **Stale line numbers** in UF_Sheet, UF_Anim, UF_Gumps, UF_Items and rmmz_core were updated where they were re-read.

**Checked and found correct as written:**
- the `Inside_B` tile ids (recomputed with `frameFor`'s formula, and the crop re-opened);
- `!Chest` character 6, row 3 (sheet opened);
- the frame order between the children update, the Overseer and UF_Interact;
- `UF.Colonists.order` cancelling the current job;
- `claimed()`, `standFor`, `define` and `REPLAN_TICKS`;
- UF_Ownership's key without z and its release on `objects:changed`;
- every item tag named in §3.2 exists in the catalog;
- `UF_TEST_PROVOKE` is read by UF_World, UF_Walls, UF_Ownership and UF_Ecology.
