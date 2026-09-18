# HANDOFF: art for world generation

**From:** Claude Code (engine) · **To:** Gemini (art) · **Date:** 2026-09-18 · **Feature:** `UF_WorldGen` (commit b9151c8)

## What the feature does
Each 256×256 area of the world is generated when it's visited, from the world seed. It lays down ground, runs one river north-to-south through the whole world (passing just east of the glade), and scatters objects such as trees, bushes, and rocks in natural-looking patches. Everything it places comes from one data file, **`game/data/UF_WorldCatalog.json`**. **You add art to the world by adding an image and a catalog entry. No code.**

## 1. Making an object asset
Follow `docs/ART_STANDARD.md` and `docs/GUIDE_25D.md`. For world objects specifically:
- **Projection:** the object stands on one cell and leans up-left at 45°. Its base sits at the **bottom-right** of its footprint.
- **File:** `game/img/characters/!$<Name>.png`. The `!$` prefix means one object per file, with no RMMZ 6-pixel lift. U7 stand-ins use `!$U7_<Name>.png`.
- **Layout for now:** a standard RMMZ 3-column × 4-row sheet. The engine uses the **middle frame of the top row** (`pattern 1`, facing down). Put the object there. For now the other 11 frames can be copies of it.
- **Size:** any frame size that fits the object's projected box (ART_STANDARD §3), at exactly 3×. Current examples: `!$TimberOak` 192×192 frames, `!$BerryBush` 48×48.
- **Readability:** the player can zoom out to 1× (`UF_Camera`). Check the object is still recognizable at ⅓ size, and don't make common objects the brightest thing on screen; there can be hundreds per area.
- **Known engine limit:** until the sidecar anchor loader exists (Claude Code, next), RMMZ anchors sprites at the **bottom-center** of the frame, so an object whose base is at the bottom-right will look shifted right. Draw to the standard anyway. The engine will catch up; don't compensate in the art.

## 2. Putting it into the world: a catalog entry
Add an object to the `"objects"` list in `game/data/UF_WorldCatalog.json`:

```json
{
  "id": "birch",
  "name": "Birch",
  "image": "!$Birch",
  "characterIndex": 0,
  "note": "<tree> <harvestable>",
  "density": 0.03,
  "clump": 0.8,
  "clumpScale": 20,
  "avoidWater": 2,
  "maxPerArea": 200
}
```

| Field | Meaning |
|---|---|
| `id` | Unique, lowercase, no spaces. It also seeds the object's own patch pattern, so **changing it moves every placement**. |
| `name` | What the look panel shows. Generic, descriptive names only (AGENTS rule 7: no invented lore). |
| `image` | File name in `img/characters/`, without `.png` |
| `characterIndex` | 0 for `!$`/`$` single-object files |
| `note` | Tags other systems read: `<tree>` (can be felled), `<harvestable>`, `<food>`, `<resource: stone>`, `<resource: mineral>`. Ask Claude Code before inventing a new tag. |
| `density` | Chance per cell at the **center of a patch** (0–1). 0.01 = sparse, 0.05 = thick forest. |
| `clump` | 0 = evenly scattered everywhere; 1 = only in patches |
| `clumpScale` | Patch size in cells (about 10 = small groves, 30 = large forests) |
| `avoidWater` | Keep this many cells clear of the river |
| `maxPerArea` | Hard cap per area. All objects together are capped by `maxObjectsPerArea` (800) to keep the game fast. |

Rules:
- **Order matters:** earlier entries claim cells first. Put rare or important objects before common ones.
- Everything is deterministic: the same seed gives the same world. Don't try to make it random; the seed does that.
- The catalog is JSON. One missing comma stops the whole game from booting. Check it (`node -e "JSON.parse(require('fs').readFileSync('game/data/UF_WorldCatalog.json','utf8'))"`) before saving.
- **Don't** place objects by editing `Map002.json` or by writing scripts that bake maps. That bypasses the seeded world (VISION V4/V16).

## 3. Ground and water tiles
`"terrain"` in the catalog chooses the ground (`grass`) and river (`water`) tiles by RMMZ tile ID. Water is an **autotile**: the engine computes its edges and banks, so a new water tileset must follow RMMZ's A1 autotile layout (ASSET_REQUESTS AR-001). When AR-001 lands, Claude Code switches the tileset and tile IDs.

## 4. Checking your work
1. Run `run_tests.bat worldgen` (it needs `UF_Test`, `UF_World`, and `UF_WorldGen` registered). `worldgen.catalog_images_exist` fails if an `image` doesn't match a file, and `worldgen.objects_placed` fails if an object with `density > 0` never gets placed.
2. In game, zoom out with the mouse wheel (`UF_Camera`) and walk the view out of the glade to see the patches.
3. Update the request in `docs/ASSET_REQUESTS.md` to `DELIVERED` and note what you checked.

## Current catalog entries and their art status
| id | image | Review notes (Claude Code, 2026-09-18) |
|---|---|---|
| oak | `!$TimberOak` | Leans up-left correctly; crude but usable as a placeholder |
| pine | `!$PineTree` | Broken into disconnected triangle fragments. Needs a redraw (AR-021) |
| berry_bush | `!$BerryBush` | Very small at 3×; hard to read at 1× |
| granite_boulder | `!$GraniteBoulder` | Reads as a thin diagonal slab, not a boulder. Only the leaning face is drawn, with no top or body (AR-022) |
| ironstone | `!$IronstoneDeposit` | Same slab problem as the boulder |
