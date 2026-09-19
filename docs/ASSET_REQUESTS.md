# ASSET REQUESTS: art the engine needs, with specs

**Claude Code** (engine) adds a request here whenever a feature needs art. **Gemini** (art) makes the assets to these specs. Claude Code checks each delivery against its spec and integrates it, and **the user approves** every asset before it counts as final (VISION V11).

Every rule in `docs/ART_STANDARD.md` applies. **The look is 2D in the style of Final Fantasy VI (user decision 2026-09-18, evening)**: flat 3/4 top-down, 16×16 tiles at 3×, upright 4-facing sprites; the earlier Ultima VII 2.5D specs in the rows below (lean, transposed facings, U7 shapes as stand-ins) are superseded, and RPG Maker's stock art is the placeholder set until each original arrives. If a spec here seems wrong or impossible, write it under the request's **Notes** and tell the user. Don't silently change the asset or the spec.

## Status flow
`REQUESTED` → `IN PROGRESS` (Gemini) → `DELIVERED` (files in place, sidecar written) → `CHECKED` (Claude Code: ART_STANDARD §8 checks pass and it works in the engine) → `APPROVED` (user) → `INTEGRATED`
A delivery that fails its check goes back to `IN PROGRESS`, with the reason in Notes.

## Shared spec (applies to every request unless it says otherwise)
Values marked *provisional* depend on the user's open decisions Q5 (facings) and Q6 (scale) in `docs/VISION.md`. Use them until those are locked.

| Item | Spec (revised 2026-09-18 evening: FF6-style 2D) |
|---|---|
| Native pixel size | Draw at **1× native**; export at exactly **3×**, nearest-neighbor |
| Grid cell | 16×16 native = 48×48 exported |
| View | **Flat 3/4 top-down JRPG view** (RPG Maker's own): no lean, no isometric. Ground tiles seen from above; objects and people show their front, feet on the bottom row of their cell |
| Frame box | **Everything fits one tile: 48×48 exported (16×16 native), one-cell footprint, whatever the real size** (V44, like DF): people, animals, monsters, trees, wall pieces, items; anchor at the bottom-centre of the cell |
| Facings | **4** (S, W, E, N), RPG Maker row order (down, left, right, up). E and W may mirror each other |
| Palette | 16-bit look: 16–32 colors per sheet; the project palette once locked. Stock RPG Maker placeholders are what they are |
| Alpha | 0 or 255 only; no baked shadows (the engine draws shadows) |
| Background for generation | Flat magenta `#FF00FF` |
| Placeholders | Stock RPG Maker MZ art (licensed for RPG Maker games). U7 art is no longer used; existing `U7_` files are replaced one by one and never committed |
| Original art | Goes through the ART_STANDARD §5 pipeline (`art/briefs` → `art/raw` → `art/masters` → review → `art/APPROVALS.md`) |

### Sprite sheet + sidecar format (what the engine reads)
Every object or character image comes with a JSON sidecar of the same name (`UF_Human_Male.png` + `UF_Human_Male.json`). Sheets are a grid: **one row per facing, one column per frame**, all frames the same size, in exported (3×) pixels.

```json
{
  "id": "human_male",
  "frameWidth": 84,
  "frameHeight": 84,
  "anchor": [83, 83],
  "footprint": [1, 1],
  "heightLifts": 5,
  "facings": ["S", "W", "E", "N"],
  "animations": { "stand": [0], "walk": [1, 0, 2, 0] },
  "frameMs": 150,
  "standInSource": "SHAPES.VGA shape 458 frames 0-2, 16-18 (only for U7_ stand-ins)"
}
```
- `anchor` is the pixel inside a frame that sits on the **bottom-right corner of the footprint** (for U7 shapes, the decoded hotspot × 3).
- Objects without facings (trees, rocks) use `"facings": ["S"]`. States such as `"stump"` or `"harvested"` go in `animations` as single-frame entries.
- Until the engine's sidecar loader exists (Claude Code, next), a stand-in may also be delivered as a standard RMMZ `$`/`!` 3×4 sheet. Say so in Notes.

## Requests

| ID | Asset | Needed for | Priority | Status |
|---|---|---|---|---|
| AR-001 | Ground tiles: grass (2 variants), dirt, riverbed water with banks | Every area (Slice 0 world) | High | DELIVERED (stand-in `U7_Ground_A2.png`, `U7_Outside_A2.png`, 8×4 autotile layout, shapes 4, 23, 5, 3× integer) |
| AR-010 | Human, male (naked) | Adam; later all humans | High | DELIVERED (stand-in `$U7_Adam_T0.png`, unclad, transposed E/W, 3× integer, deployed to `$Adam.png`; T1-T3 attire tiers created) |
| AR-011 | Human, female (naked) | Eve | High | DELIVERED (stand-in `$U7_Eve_T0.png`, unclad, transposed E/W, 3× integer, deployed to `$Eve.png`; T1-T3 attire tiers created) |
| AR-020 | Fruit tree (the glade's tree) | Glade, food source | High | DELIVERED (stand-in `!$FruitTree.png`, shape 328, collision-aligned anchor, 3× integer) |
| AR-021 | Wild tree, 3 variants, standing + stump | World generator, felling | High | DELIVERED (stand-in `!$TimberOak.png` shape 181, `!$PineTree.png` shape 306, `!$TreeStump.png` shape 313, collision-aligned anchors, 3× integer) |
| AR-022 | Boulder, 2 variants | World generator, stone gathering | Medium | DELIVERED (stand-in `!$GraniteBoulder.png` shape 342, `!$IronstoneDeposit.png` shape 341, collision-aligned anchors, 3× integer) |
| AR-023 | Bush, 2 variants | World generator | Medium | DELIVERED (stand-in `!$BerryBush.png` shape 672, collision-aligned anchor, 3× integer) |
| AR-030 | Look cursor | Cursor (Slice 0, deliverable 7) | High | DELIVERED (`game/img/system/U7_Cursor.png`, 48×48 2-frame pulse gold bracket) |
| AR-031 | Unit selection marker: **a bright square outline with iron corners under the selected unit's feet, pulsing, Shining Force style** (48×48, open middle; user spec 2026-09-18) | Unit selection (`UF_Stance` draws it between the stance square and the sprite; 2–3 frames if animated) | Medium | BACK TO IN PROGRESS: the cyan `U7_Select.png` isn't this; the engine draws a code-generated `UF_GenSelect` (pulsed by opacity) until art arrives |
| AR-032 | Look panel frame | Look panel (deliverable 7) | Medium | REQUESTED |
| AR-033 | UI window skin (replaces RMMZ `img/system/Window.png`) | Colonist card, look panel, all windows | Medium | DELIVERED (`game/img/system/Window.png`, `U7_Window.png`, carved oak, aged parchment, gold trim) |
| AR-034 | Stance squares: a flat 48×48 marker under a unit's feet in three colors (green friendly, yellow indifferent, red hostile), readable at 1× | V32, `UF_Stance` | Medium | REQUESTED (code-drawn `UF_GenStance_*` in use) |
| AR-035 | Designation marker: a flat 48×48 outline with small glyphs for chop / gather / pick / quarry / mine / hunt / build / haul | V34, `UF_Interact` right-click menu | Medium | REQUESTED (code-drawn `UF_GenDesignation` in use) |
| ~~AR-040~~ | ~~Cave floor tiles~~ | Withdrawn 2026-09-18: no underground layer (V20 retired) | — | WITHDRAWN (Gemini's `U7_Ground_A2.png` row 1 stays as reference) |
| ~~AR-041~~ | ~~Cave rock tiles~~ | Withdrawn 2026-09-18 | — | WITHDRAWN |
| ~~AR-042~~ | ~~Cave mouth~~ | Withdrawn 2026-09-18 | — | WITHDRAWN (`!$U7_CaveMouth.png` delivered; unused) |
| ~~AR-043~~ | ~~Way up~~ | Withdrawn 2026-09-18 | — | WITHDRAWN (`!$U7_CaveLadder.png` delivered; unused) |
| AR-044 | Ore and stone outcrops: iron, copper, gold, crystal cluster + small crystals, cave boulder (now surface: mountains, badlands, rock desert) | Biomes, mining | Medium | DELIVERED (`!$U7_IronOreVein.png`, `!$U7_MalachiteOutcrop.png`, `!$U7_GoldVeinOutcrop.png`, `!$U7_CrystalSpire.png`, `!$U7_SmallCrystals.png`, `!$U7_CaveBoulder.png`; in the catalog as ironstone/copper_outcrop/gold_outcrop/crystal/crystal_small) |
| AR-050 | Generic person, 4 facings, walk frames | Arrivals (V19), test units | Medium | DELIVERED (`$U7_Guard.png` shape 720, `$U7_Townsman.png` shape 265, `$U7_Ranger.png` shape 460, `$People1.png`, transposed E/W, 3× integer) |

| AR-100 | Biome ground tiles: an A2 sheet with the 22 ground kinds in the catalog's `groundKinds` order (meadow, lush grass, dry grass, scrub soil, leaf litter, needle floor, jungle floor, tundra, snow, ice, sand, stony, red clay, bare rock, rock face, mud, swamp mud, dirt, blighted grass, flowering grass, ash, scree) | Biomes (V27/V30), `UF_Tiles` | High | REQUESTED (code-drawn `UF_GenGround_A2` in use; Gemini's `U7_Ground_A2.png` has 3 kinds and was copied over stock files, see AUDIT A4-2) |
| AR-101 | Water A1 autotiles: the nine kinds in `water.surface` (fresh, pond, marsh, swamp, icy, brackish, salt, deep, blighted), every autotile piece filled, 3 animation frames | Biomes, rivers, lakes, coast | High | REQUESTED (stock RMMZ `Outside_A1` kinds 0,1,2,3,4,8,10,12,14 in use) |
| AR-102 | Trees per biome family, standing + stump: oak, birch, pine, snow fir, fruit tree (with fruit / picked), flat-top, swamp, mangrove, broadleaf giant, palm, dead, blighted | Biomes, felling (states: standing, stump) | High | PARTLY DELIVERED (stand-ins `!$U7_Flat-toptree`, `!$U7_Deadtree`, `!$U7_Swamptree`, `!$U7_Broadleafgiant`, `!$U7_TreeStump`; birch/snow fir/mangrove/blighted are tints of shared images; palm is stock RMMZ `Outside_B` tile 237) |
| AR-103 | Small plants: shrub, desert shrub, snow bush, cactus ×2, tall grass, reeds, wildflowers (4 colors), fern, lichen, wild grain, wild wheat, lily pads, berry bush (full / picked) | Biomes, gathering (states: full, gathered) | Medium | PARTLY DELIVERED (stand-ins `!$U7_Shrub`, `!$U7_TallGrass`, `!$U7_Reeds`, `!$U7_Wildflowers`, `!$BerryBush`; stock RMMZ `Outside_B` tiles in use for snow bush 232, cactus 238, tall cactus 174, fern 246, lichen 251, wild grain 172, wild wheat 173, lily pads 253) |
| AR-104 | Site pieces: wooden wall (palisade), stone wall, rubble, fallen pillar, old bones, straw bed, work stone; each intact + ruined | History sites and ruins, colony building | High | REQUESTED (stock RMMZ tiles in use: `Outside_B` 80 wall_wood, 248 straw bed; `Outside_C` 277 stone wall, 282 rubble, 285 work stone, 286 fallen pillar; `!$U7_OldBones`, `!$U7_LooseStones`, `!$U7_Gravel` stand-ins) |
| AR-105 | Campfire: unlit (stone ring with wood) and lit (3-frame flame), plus a burnt-out state | Hearth, cooking | High | REQUESTED (`!$Campfire.png` stand-in, one state) |
| AR-120 | Region looks: cursed and blessed variants of grass and forest floor | Region modifiers | Low | REQUESTED (code-drawn `cursed_grass`, `blessed_grass`, `ash` kinds in `UF_GenGround_A2`) |
| AR-200 | Ground items (15 kinds), also used as gump icons | Items on the ground, Wave 2 | High | DELIVERED (23 loose resource items `!$U7_Item_*.png`, 3× integer nearest-neighbor, grounded bottom-anchor, sidecars) |
| AR-201 | Tools and clothing as ground items: stone knife, stone axe, stone pick, woven wrap, hide cloak | Crafting (V35) | High | REQUESTED (tinted `!$U7_Item_RoughStone` / `!$U7_Item_PlantFiber` / `!$U7_Item_LeatherHide` in use) |
| AR-300 | Construction: walls (3 materials, all segment pieces), floors, door, stairs, ramp, campfire, beds, lean-to | Building one segment at a time, Wave 3 | High | REQUESTED (see AR-104/AR-105 for the pieces in use now) |
| AR-400 | People: 7 species × male/female, 4-facing walk sheets | Factions, colonists, arrivals, Wave 4 | High | REQUESTED (`$U7_Townsman`/`$U7_Ranger`/`$U7_Guard`/`$U7_Goblin`/`$U7_Skeleton` with per-species tints in use) |
| AR-401 | Wildlife: the 24 species in `wildlife.species` (deer, boar, aurochs, wild horse, wild sheep, hare, fowl, rat, wolf, jackal, fox, arctic fox, wildcat, serpent, hawk, songbird, bat, giant spider, troll, bog horror, sand stalker, restless dead, ice wraith): 4 facings × stand/walk, plus a dead/carcass frame | Starting population, hunting | High | PARTLY DELIVERED (16 `$U7_*.png` sheets; variants are tints; no carcass frames yet) |
| AR-402 | Monsters: troll, bog horror, sand stalker, restless dead, ice wraith | Starting population | Medium | PARTLY DELIVERED (`$U7_Troll`, `$U7_CaveSpider`, `$U7_Skeleton` with tints in use) |
| AR-403 | Domestic animals: 4 | Taming | Low | DELIVERED (Dog, Cat, Horse, Ox, Sheep, Chicken included in `$U7_*.png` wildlife suite) |
| AR-500 | Workshops (10), furniture (6), tool and weapon icons (8) | Crafting, Wave 5 | Medium | REQUESTED |
| AR-501 | Clothing tiers for humans: 1 woven wraps, 2 hides, 3 tailored, male and female, 4 facings × walk | V35 (colonists make clothes) | High | DELIVERED as stand-ins (`$U7_Adam_T1..T3`, `$U7_Eve_T1..T3`) |
| AR-600 | **Character sheet standard v2** (layered, animated): one frame grid for every person and creature; layers = body (species × gender × age stage), clothing tier, held tool or weapon, shield, effect; animations = stand, walk, work (mine, chop, gather), carry, attack, cast, sleep; 4 facings (E/W transposed) | V41; the engine's layered character renderer (next build) | High | REQUESTED (spec below; today's sheets are single-layer 3×4 walk sheets) |
| AR-601 | Age stages: baby, child, teen sprites for each playable species (body layer only, on the AR-600 grid) | V40 life cycle (next build) | High | REQUESTED (adults only today) |
| AR-700 | **Face sets in the U7 portrait style** (a bust with a plain dark background, 96×96 exported), per species × gender × age stage, 4–8 variants each, in RPG Maker's face-sheet layout (4 columns × 2 rows of 144×144, faces centred) | V49 character sheet (portrait) | High | REQUESTED (stock RPG Maker `Actor1..3`/`People1..4` faces in use until then) |
| AR-701 | Character-sheet UI: inventory grid cell frame, equipment slot frames (helmet, weapon, shield, torso, legs), page tabs, and the faction behaviors menu's icons (labors, combat modes), in the window skin's style | V49, V43 | Medium | REQUESTED (drawn from the window skin until then) |

**Interaction states (user rule 2026-09-18):** every asset is designed with the states the engine uses: `docs/ASSET_INVENTORY.md` (generated by `tools/generate_asset_inventory.js`) lists them per asset. In short: trees standing/stump; bushes and fruit trees full/picked; ore outcrops full/worked-out (loose stones); buildings unbuilt/built/ruined; the campfire unlit/lit; creatures alive/carcass; the pair by clothing tier.

Details and order for AR-100 to AR-500: `docs/handoffs/HANDOFF_df_art.md` (waves 1–5).

**RMMZ stand-in rule (user, 2026-09-18):** whenever the engine uses a stock RMMZ asset (tiles, characters, UI), it gets a request here for Gemini to make an original replacement. The "Status" column names the stock asset in use.

### AR-001 Ground tiles
- **Type:** RMMZ tileset images for the A1 (water, animated) and A2 (ground) slots, in RMMZ's standard autotile layout (A1: 768×576 exported; A2: 768×576 exported). Flat top-down, no lean.
- **Needs:** grass ×2 (plain, flowered), dirt path, and riverbed water (animated, 3 frames) whose autotile edges form a bank.
- **Stand-in:** U7 ground tiles (SHAPES.VGA shapes 0–149 are 8×8 [MEASURE]): 2×2 per 16×16 cell, ×3. Name them `U7_Ground_A1.png` / `U7_Ground_A2.png`.
- **Notes:** the engine currently uses tileset 2 (RMMZ "Outside"): grass tile 2863 (A2) and water autotile 2048 (A1). Claude Code switches tile IDs when these arrive.

### AR-040 / AR-041 Cave floor and rock
- **Type:** tileset images in RMMZ autotile layout: floor as an **A2** autotile (768×576 sheet, one kind is enough); rock as an **A2 or A4-top** autotile. The engine computes the edges itself, so every one of the 47 shapes must look right (FLOOR_AUTOTILE_TABLE).
- **Look:** U7-style dungeon. Floor is flat top-down. Rock is the top of solid stone; the engine blocks it with region 250, so it doesn't need wall faces yet.
- **Readability:** floor and rock must be clearly different at every zoom level (3×, 2×, 1×) and under the fog's dimming (alpha 150 over explored cells).
- **Integration:** name the sheet, then tell Claude Code (Notes below). It becomes a new tileset entry, and the catalog's `underground.floor` / `underground.rock` tile IDs are switched.

### AR-042 / AR-043 Cave mouth and way up
- **Surface mouth:** one 48×48 tile for a **B** sheet (upper layer, drawn over grass), clearly a hole or opening you can climb down, readable at 1×.
- **Way up (underground):** one 48×48 floor tile (A5 layout) or B tile showing stairs or a ladder going up.
- **Integration:** tile IDs go in `underground.surfaceConnectionTileId` and `underground.connectionTileId` in `game/data/UF_WorldCatalog.json`.

### AR-044 Cave objects
- Ore vein and cave boulder: footprint 1×1, same rules as AR-021 to AR-023. Add them to `underground.objects` in the catalog (`docs/handoffs/HANDOFF_underground.md`).

### AR-050 Generic person
- Same format as AR-010, generic clothing. Used for migrants and visitors (V19) and for test units. Several palette variants later.

### AR-010 / AR-011 Humans
- **Footprint** 1×1. **Height:** match the U7 stand-in until measured (ART_STANDARD §2 "Adult human height").
- **Facings** S, W, E, N (E/W transposed). **Frames:** stand + 2 walk steps per facing (`walk: [1, 0, 2, 0]`).
- **Naked** (VISION V4), no clothing, non-sexualized, readable at 1× (zoomed-out view).
- **Must read at every zoom level:** 3×, 2×, and 1× (UF_Camera). Check the silhouette at 1×.
- **Stand-in fixes needed:** rename to `$U7_Adam.png` / `$U7_Eve.png` (the engine switches names on delivery). The source shapes are clothed townsfolk; fine as stand-ins.

### AR-020 Fruit tree
- **Footprint** 1×1 trunk. **Height** about 3–4 cells of canopy (match the stand-in). **Facings:** S only.
- **States:** `with_fruit`, `harvested` (the fruit visibly gone). The engine switches state when fruit is picked.
- The canopy must allow the engine's cut-away (fading when a unit is behind it), so no semi-transparent pixels.

### AR-021 / AR-022 / AR-023 World objects
- Trees: footprint 1×1 trunk; states `standing`, `stump`. Boulders and bushes: footprint 1×1, single state.
- 2–3 variants each, as separate columns (the engine picks a variant per object from the seed).
- These are placed by the thousand (a 256×256 area), so keep them readable at 1× and don't make them the brightest thing on screen.

### AR-030 Look cursor
- A **flat** outline of one cell (16×16 native), drawn on the ground, 2 frames (pulse). Bright, and readable on grass, water, and dirt.
- Optional third frame: a vertical "post" rising up-left from the cell's corner, for showing height when the cursor sits on something tall.

### AR-031 Unit selection marker
- A flat ellipse or bracket around a 1×1 footprint on the ground, 1 frame. Drawn under the unit.

### AR-032 Look panel frame
- A window frame in RMMZ window-skin format (`img/system/Window.png` layout, 192×192) in a U7-like style (wood or parchment), or a 9-slice PNG with its border size in Notes.

### AR-600 Character sheet standard v2 (layers and animations)
The goal (user, 2026-09-18): every person and creature can be shown mining, chopping, carrying, fighting with a weapon and shield, casting, sleeping, in any clothing tier and at any age, without a new sheet for each combination. The engine composes the layers at runtime, so **every layer of one species must share one frame grid and one anchor**.

- **Grid (FF6-style, revised 2026-09-18 evening):** one PNG per layer, rows = facings in RPG Maker order (S, W, E, N), columns = the animation frames in this fixed order: `stand` (1), `walk` (3: step, stand, step), `work` (3: a swing cycle used for mine/chop/gather/build), `carry` (3: walk with the arms forward/up), `attack` (3: wind-up, strike, recover), `cast` (2), `sleep` (1). 16 columns. Frame size: **48×48 exported (16×16 native) for everyone, people and creatures alike** (VISION V44: everything fits one tile). The anchor (feet at the bottom-centre of the 1×1 footprint) is the same pixel in every frame of every layer. The `attack` and `cast` frames are the combat animation on the map (VISION V45: no battle screen).
- **Layers, by file name:** `$UF_<species>_<gender>_<stage>_body.png` (stage: baby, child, teen, adult, elder), `$UF_<species>_<gender>_clothes_T<n>.png`, `$UF_held_<item>.png` (stone_axe, stone_knife, stone_pick, spear, bow, torch…: the item as held, positioned per frame; the same file works for every species of the same frame size), `$UF_shield_<kind>.png`, `$UF_fx_<effect>.png` (cast glow, hit flash). Layer order when composing: body, clothes, shield (back-hand side), held, fx. Transparent where a layer has nothing.
- **Sidecar v2:** `frameWidth`, `frameHeight`, `anchor`, `facings`, `animations: { stand: [0], walk: [1, 2, 3, 2], work: [4, 5, 6], carry: [7, 8, 9], attack: [10, 11, 12], cast: [13, 14], sleep: [15] }`, `layer: "body" | "clothes" | "held" | "shield" | "fx"`, `species`, `stage`, `standInSource`.
- **Stand-ins:** U7 shapes only cover stand/walk for most figures; deliver those frames and leave the other columns empty (transparent) rather than inventing them; the engine falls back to `stand` for missing animations.
- **Creatures:** body layer only, plus a `dead` column at the end (17) for prey.
- **Engine side (Claude Code, next build):** `UF_Sprites` composes the layers into one cached bitmap per (species, gender, stage, clothes, held, shield) and picks the animation from the unit's job (mine/chop/gather/build → work; haul/fetch → carry; hunt/attack → attack; sleep → sleep).

## Notes for Claude Code (from Gemini)
Write here when an asset needs an engine change.
- **World Catalog Object Densities**: `game/data/UF_WorldCatalog.json` had omitted `density` from `cat.objects` when `biomes` was drafted. In `UF_WorldGen.js` line 310, `!(o.density > 0)` skips placing all objects, causing 0 trees/boulders to spawn in the seeded world (`FAIL worldgen.objects_placed`). Gemini has created 2.5D replacement sheets for all stock tile objects (`!$U7_Flat-toptree.png`, `!$U7_Deadtree.png`, `!$U7_Swamptree.png`, `!$U7_Broadleafgiant.png`, `!$U7_Shrub.png`, `!$U7_CaveBoulder.png`, `!$U7_CrystalSpire.png`, `!$U7_MalachiteOutcrop.png`, `!$U7_GoldVeinOutcrop.png`).
- **Wildlife Integration**: 16 animated Dwarf Fortress wildlife walk sheets (`$U7_*.png`) have been delivered with clean 4-directional matrix transposition on East/West rows and sidecar JSONs. `UF_WorldCatalog.json` line 159 currently still points to stock RMMZ `Nature` and `Monster` sheets. When `UF_Wildlife.js` is wired up, switch catalog references to the `$U7_*.png` sheets.
- **Underground Delver Test Sprite**: In test suite `underground.below_zoom_1.png`, the test delver uses a stock front-facing RTP anime sprite (`$People1`). Stand-in `$U7_Ranger.png` or `$U7_Guard.png` should be used instead.
