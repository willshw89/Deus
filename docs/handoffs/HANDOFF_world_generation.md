# HANDOFF: art for the world (catalog v3)

**From:** Claude Code (engine) · **To:** Gemini (art) · **Date:** 2026-09-18 (rewritten for catalog v3; the first version of 2026-09-18 covered catalog v1) · **Feature:** the world build (`docs/design/WORLD_ARCHITECTURE.md`)

## What the world is now
One 256×256 area, generated from the seed like a DF world with DF's standard settings: climate fields → every DF biome, region character (tame/wild/primeval, cursed/neutral/blessed), rivers, lakes, a coast. Plants, stones and ore are placed by biome, thousands per map, as **objects on cells** (not events). Items lie on cells. Creatures and people are world units. Everything comes from **`game/data/UF_WorldCatalog.json`**. **You add art by adding an image (plus its sidecar) and a catalog entry. No code.**

**Assets are designed with their interaction states in mind (user rule 2026-09-18).** A tree exists standing and as a stump; a bush full and picked; a campfire unlit and lit; a wall intact and ruined; prey alive and (soon) dead; the pair in clothing tiers. `docs/ASSET_INVENTORY.md` lists, for every asset in use, the states the engine needs. Draw each state as its own frame/column or its own file (see §2).

## How to find what needs art
1. Run `"C:\Program Files\nodejs\node.exe" tools\generate_asset_inventory.js` (Claude Code owns the tool; you run it). It writes `docs/ASSET_INVENTORY.md`: every asset the engine uses, what uses it, the interaction states it needs, and its status: **missing**, **stock RMMZ** (must be replaced), **U7 stand-in** (must be replaced before release), **generated** (code-drawn placeholder; replace when a request says so), **original**. The "Needs a request" section lists assets with no `AR-` row yet; tell Claude Code, don't invent request IDs.
2. In Playtest, the look label (top-left) names whatever is under the mouse and, on its last line, the art file and its status, e.g. `$U7_Wolf.png — U7 stand-in (AR-401)`.
3. The test screenshots in `game/test_output/` (or a snapshot's `test_output/`) show the start at three zoom levels and a far corner; anything that looks wrong there is worth a note.

## 1. Making an asset
Follow `docs/ART_STANDARD.md` (HD pixel art in FF6 style, flat 3/4 top-down view, 48 px native grid, 8 facings per VISION V3, `art/palette/uf.hex`). For world things:
- **Mandatory Generation Model:** **ALL GENERATION TASKS ARE TO UTILIZE GOOGLE NANO BANANA PRO** (`generate_image`, model id `gemini-3-pro-image`, Gemini 3 Pro Image model; AGENTS.md Rule 11, VISION V69, V70, V79, V109). Nano Banana Pro utilizes advanced reasoning ("Thinking") to follow complex instructions, maintain brand consistency, and render high-fidelity text and pixel details. No other model allowed, and no typing sprites in code.
- **Mandatory Animation Standard:** **ALL ANIMATION MUST HAPPEN THROUGH THE SPRITE; NO AFTER-EFFECT ANIMATIONS** (AGENTS.md Rule 12, VISION V60, V108). All motion (swaying foliage, idle breathing, walk cycles, combat strikes, water ripples, fire flickers) must be delivered as discrete sprite animation frames on the sheets. No programmatic distortion, squashing/stretching, sine sway, or shader warps.
- **Files:** objects and items `game/img/characters/!$<Name>.png` (originals), creatures and people `$<Name>.png`. Always a sidecar `<same name>.json` (format: `docs/ASSET_REQUESTS.md` → Sprite sheet + sidecar format).
- **Layout:** a standard RMMZ 3-column × 4-row sheet, or full 8-facing AR-600 master. Objects and items use one frame or their animated loop: the sidecar's `animations.stand[0]`, else the middle frame of the top row.
- **States as separate catalog entries:** a picked bush is `berry_bush_bare`, a felled tree is `stump`. Each state is its own object entry with its own `image`.
- **Readability at 1×** (the farthest zoom): thousands of these are on screen; keep them quiet and recognizable.


## 2. Catalog entries (what the engine reads)
Only these four lists are yours to edit: `objects`, `items.types`, `wildlife.species`, `people`. Everything else in the file is engine data (Claude Code). The catalog is JSON; check it before saving:
`"C:\Program Files\nodejs\node.exe" -e "JSON.parse(require('fs').readFileSync('game/data/UF_WorldCatalog.json','utf8'))"`

### 2.1 An object (plant, stone, ore, building piece)
```json
{ "id": "birch", "name": "Birch", "image": "!$U7_Birch", "tint": "#e6f0e0",
  "tags": ["tree", "wood"],
  "actions": { "chop": { "work": 200, "yields": { "log": 2 }, "becomes": "stump" } },
  "clump": 0.7, "clumpScale": 14, "avoidWater": 1 }
```
| Field | Meaning |
|---|---|
| `id`, `name` | Unique id; the name the look label shows (generic, descriptive; no invented lore) |
| `image` | File in `img/characters/` without `.png` (a `$`-style 3×4 sheet). Or `tile: { "sheet": "Outside_B", "id": 157 }` for a 48×48 tile from a tileset image, or `gen: "stockpile"` for a code-drawn placeholder |
| `tint` | Optional `#rrggbb` multiplied over the image: one image, many kinds (birch = tinted oak) |
| `passable`, `under` | `passable: true` = units walk through it; `under: true` = drawn under units (grass, stones, beds) |
| `tags` | What other systems look for: `tree`, `bush`, `plant`, `stone`, `ore`, `gem`, `food`, `fiber`, `straw`, `remains`, `ruin`, `building`, `wall`, `bed`, `stockpile`, `fire`, `workplace`, `cursed`. Ask before inventing a tag. |
| `actions` | The interactions: `chop`, `gather`, `pick`, `quarry`, `mine`, each with `work` (frames), `yields` (item id → count) and `becomes` (object id after, or `null` = gone). **These define the states the art needs.** |
| `regrow` | `{ "to": "berry_bush", "hours": 48 }`: the picked state grows back |
| `build` | For buildings: `{ "items": { "log": 1 }, "work": 90 }` (unbuilt/built states); `ruin`: what it becomes when a site is sacked |
| `clump`, `clumpScale`, `avoidWater` | Placement pattern (patches) and distance from water; **where** an object appears is decided by the biome tables (`biomes.*.plants`), which are Claude Code's |

Existing entries and their images are the list in the catalog itself (about 55 objects). Every `!$U7_*` image is a stand-in to replace; `tile:` entries use stock RMMZ tiles to replace (AR-102/AR-103/AR-300).

### 2.2 An item (lies on the ground, gets carried and stored)
```json
{ "id": "stone_axe", "name": "Stone axe", "image": "!$U7_Item_StoneAxe", "tags": ["tool", "axe"], "stack": 1, "tool": { "chop": 2 } }
```
`food: { "hunger": 25 }` for food, `tool: { jobType: multiplier }` for tools, `wear: { "tier": 1 }` for clothing (which walk sheet tier the pair switches to). Items are drawn at the cell with the middle frame of the top row; 48×48 or 96×96 frames both work.

### 2.3 A creature
```json
{ "id": "deer", "name": "Deer", "image": "$U7_Deer", "kind": "grazer", "herd": [2, 5], "wander": 14,
  "hunt": { "work": 120, "flees": true }, "yields": { "meat_raw": 3, "hide": 1, "bone": 2 },
  "biomes": { "forest_temperate_broadleaf": 3, "grassland_temperate": 2 } }
```
`kind` grazer/vermin/flier (prey), predator, monster. `tint` for variants (jackal = tinted dog). `minSavagery: "wild"` / `alignment: "cursed"` restrict where monsters appear. **Art states:** 4 facings × stand/walk now; a dead/carcass frame is the next request (the engine drops the yields as items for now).

### 2.4 People (faction members at sites)
`people.<species> = { "images": ["$U7_Townsman", "$U7_Ranger"], "tint": "#c8ffc8" }`: walk sheets round-robin per species, tinted to tell species apart until AR-400 originals exist.

### 2.5 The pair's clothing tiers
`start.pair[].tiers` = walk sheets by tier: 0 naked (`$Adam`/`$Eve`), 1 woven wraps (`$U7_Adam_T1`/`$U7_Eve_T1`), 2 hides (`_T2`), 3 tailored (`_T3`). The pair switches sheet when they equip clothing they made.

## 3. Ground and water
Ground kinds are drawn in code (`UF_Tiles`, `UF_GenGround_A2`, 22 kinds) until AR-100 delivers an A2 sheet in RMMZ's autotile layout with the kinds in the catalog's `groundKinds` order. Water uses the stock `Outside_A1` kinds until AR-101 delivers an A1 sheet with the nine kinds in `water.surface` (fresh, pond, marsh, swamp, icy, brackish, salt, deep, blighted) — every kind, every autotile piece filled. **Don't copy over the stock sheets**; deliver `U7_Outside_A1.png`/`U7_Outside_A2.png` and a kind map in Notes, and Claude Code switches `tilesets.surface` in the catalog.

## 4. Checking your work
1. Run `run_tests.bat worldgen` and `run_tests.bat objects` (or `node tools/test_snapshot.js --suite objects`): `objects.images_exist` fails if an `image` or `tile.sheet` doesn't match a file; `objects.catalog_types` fails if a `becomes`/`regrow.to`/`ruin` id or a yielded item id doesn't exist.
2. Playtest: zoom out (mouse wheel), hover things (look label), right-click things (the interaction menu shows the actions your entry declares).
3. Update the request in `docs/ASSET_REQUESTS.md` (`DELIVERED`, with what you checked) and, for a U7 stand-in, the Stand-ins list in `docs/STATUS.md`.
