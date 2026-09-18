# HANDOFF: art for the underground layer

**From:** Claude Code (engine) · **To:** Gemini (art) · **Date:** 2026-09-18 · **Feature:** underground layer (commit 8e10921)

## What the feature does
Under every 256×256 surface area there's a 256×256 **cave layer** with the same cell coordinates. It's solid rock with caverns and winding tunnels, generated from the world seed. **Cave mouths** at random dry-land spots (4 per area, plus one about 16 cells from the start) connect the layers: the mouth at cell (x, y) on the surface leads to a small chamber at (x, y) below. Characters walk through them. The player switches the view between layers with **`,`** (up) and **`.`** (down), and each layer has its own fog of war.

Everything it draws comes from the `underground` section of **`game/data/UF_WorldCatalog.json`**. Right now that's all stock RMMZ Dungeon and Outside tiles, which you're asked to replace (ASSET_REQUESTS AR-040 to AR-044).

## 1. What to make
| Request | What | Current stock stand-in |
|---|---|---|
| AR-040 | Cave floor, A2 autotile | Dungeon A2 "Ground C (Rock Cave)", tile 3200 |
| AR-041 | Cave rock, autotile (top of solid stone) | Dungeon A4 "Wall B (Rock Cave)" top, tile 5936 |
| AR-042 | Cave mouth on the surface, one B tile | Outside B "Hole B (Wood Ladder)", tile 42 |
| AR-043 | Way up underground, one tile | Dungeon A5 "Stairs A (Rock)", tile 1549 |
| AR-044 | Cave objects: ore vein and boulder, 2 variants each | Surface `!$IronstoneDeposit` / `!$GraniteBoulder` reused |

Specs are in `docs/ASSET_REQUESTS.md` (AR-040 to AR-044). The key points:
- **Autotiles must work in all 47 edge shapes.** The engine computes which shape each cell needs from its neighbors, exactly like the editor does. A sheet that only looks right as a solid fill will show broken edges along every tunnel.
- **Floor and rock must be clearly different at 1×** (farthest zoom) **and under fog dimming** (explored-but-unseen cells get a dark overlay at alpha 150). Right now the stock floor and rock are both grey stone; they're distinguishable, but not by much.
- Cave objects follow the object rules in `HANDOFF_world_generation.md` §1: they stand on one cell and lean up-left.
- U7 stand-ins are fine (`U7_` prefix, exactly 3×). U7's dungeon shapes are good references.

## 2. Plugging them in
Tiles live in tileset images, which need a tileset entry. **Put the images in `game/img/tilesets/`, then write a note in `docs/ASSET_REQUESTS.md` → "Notes for Claude Code"** with the file names and which kind or slot holds what. Claude Code adds the tileset and switches these catalog fields:

```json
"underground": {
  "tilesetId": 4,
  "floor": { "tileId": 3200, "autotile": true },
  "rock": { "tileId": 5936, "autotile": true },
  "connectionTileId": 1549,
  "surfaceConnectionTileId": 42,
  ...
}
```

**Cave objects** you add yourself, exactly like surface objects: a new entry in `underground.objects`, with the same fields as `HANDOFF_world_generation.md` §2. Objects only appear on open cave floor, never in rock or on connections. The cap is `underground.maxObjectsPerArea` (400).

Tuning numbers (not art, but you may want to see the effect): `caveThreshold` (lower = more open cave), `caveScale` (bigger = larger caverns), `tunnelWidth` (wider tunnels), `chamberRadius`, `connectionsPerArea`.

## 3. Checking your work
1. `run_tests.bat underground`: `caves_generated`, `connections`, and `rock_blocks` must pass. After a catalog change, `worldgen.catalog_images_exist` checks the object images.
2. In game: find a cave mouth (there's one about 16 cells from the fruit tree), put the view on it, and press `.` to look below. Zoom out with the mouse wheel to see the caves. They're dark until someone from the colony goes down there (fog of war).
3. Update the AR status in `docs/ASSET_REQUESTS.md` and say what you checked.
