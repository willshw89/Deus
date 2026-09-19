# Stacked terrain on z=0, +1 and +2 (VISION V91)

**Date:** 2026-09-19 · **Author:** Claude Code (engine) · **Status:** design proposal. Nothing in `game/` was changed for it, and no part of it runs in RMMZ yet.
**User request (2026-09-19 13:57):** "Look on the chipset and make sure to generate the world layers z=0,z+1, z+2 with earthen features and resources like mountains and shit. Those should build on each other like terrain".
**Implements:** V91. **Refines:** V80 and `VERTICAL_WORLD.md` §1, §1.1 and §4 (Codex's document assumed `+1/+2` mostly open air). **Also bound by:** V3 (no corner cutting), V9 (stock placeholders), V27/V30 (DF-style fields and biomes), V50 (budgets), V67 (starting resources), V68 (spawn safety), V74/V83 (finite geology, mapwide distribution), V82 (all five levels generated before play), `RESOURCE_ATLAS.md`, and `VERTICAL_BUILD_PLAN.md` (slices V1 to V3, whose data model this design uses unchanged).

**Every new player-visible word here is a PROPOSAL** that needs the user's approval: "Hill", "Mountain", "Slope", "Cliff", "Rock face", "Crag", "Snowcap", "Cave mouth", "Drop", and the Look texts in §7.8. The level labels `+2`, `+1`, `Ground` come from `VERTICAL_WORLD.md` §1.

**Evidence produced for this design (2026-09-19; every image was opened with Read before being described):**
- 17 crops of the stock tilesets, in the session scratchpad `terrain_tiles/01_…` to `17_…` (§1).
- 4 mock renders assembled from the chosen stock tiles with the engine's own autotile quarter rules (`Tilemap._addAutotile`, `rmmz_core.js:2500-2560`), one per view level (§7.9).
- A Node model of the terrain function (§2), with `fieldsFor`, `isLake` and `riverModels` copied from `UF_WorldGen.js` and the live catalog. It was run over 100 seeds with the proposed defaults, and over 50 seeds for each of 4 parameter sets. **These are model measurements in Node, not RMMZ playtest results.**
- **Critic review, 2026-09-19 (Claude Code):** the design was checked against V4, V50, V67, V80, V82, V83, V91, `VERTICAL_WORLD.md`, `RESOURCE_ATLAS.md`, `VERTICAL_BUILD_PLAN.md`, the real `UF_WorldGen.js`, `UF_Tiles.js` and `UF_Factions.js`, and the stock sheets. Two crops (02, 05) and the `+2` mock were opened, and a hill was re-rendered from the stock A4 blocks (`critic_terrain/hill_rim_check.png`, opened). The model (`terrain_sweep.js`) was read line by line and re-run with extra measurements over 40 seeds (`critic_terrain/critic_model*.js`). §16 lists the 30 findings, and the sections below already carry the fixes.

---

## 0. Decisions this design makes (review these first)

| # | Decision | Why |
|---|---|---|
| T1 | **One surface-level grid `S(x,y)` in {0, 1, 2}, plus a crag flag, decides the whole column:** cells below `S` are solid, `S` is the ground floor, and cells above `S` are open air. It comes from a terrain height `T` = climate elevation + a local relief noise, thresholded, smoothed and repaired (§2). | V91's "a cell has ground on a level only where the terrain beneath it is solid". One grid keeps the three levels stacked by construction. The existing climate elevation still drives biomes (V30). |
| T2 | **Mountains follow the climate elevation; hills come from relief.** A cell of the mountain biome (`e ≥ climate.mountainLevel`) is never lowered by relief or by the river valley carve, so the mountain biome sits on `+2` except in its forced-low river gorges (§5). Hills rise anywhere outside the flat start. The old `peak_rock` ground kind is no longer produced on generated terrain: interior peaks become crag and the rest of the summit is walkable `scree` (§2.4). | "mountains and shit": the mountain biome and its resource table (granite, iron, copper, gold, crystal) already exist (`UF_WorldCatalog.json` biomes.mountain). V91 puts them on `+2`. |
| T3 | **Every world has raised land and at least one `+2` massif.** Per-world thresholds are floored by quantiles, and when that isn't enough a seeded massif is added at least 70 cells from the player's camp (§2.3). | In the model, without this rule, some seeds had 0 % of land at `+2`. The massif was needed for 9 of 100 seeds at relief amplitude 0.30 and 5 of 100 at the proposed defaults (§2.6). A world with no mountain would miss V91 and the mountain resources of V82. |
| T4 | **Slopes are natural ramps from the build plan's connector rule** (`VERTICAL_BUILD_PLAN.md` §6.1): the ramp is the low cell, it leans on the raised neighbour and exits onto its floor. There are no new connector types (§4). | The route planner, V3's no-corner-cutting rule and `vertical.stairs_ramps` then cover slopes with no new code paths. |
| T5 | **Everything else between levels is a cliff:** impassable to walkers, climbable only by climbers (VW §7.1). Hills get slopes along about a quarter of their edges and mountains only at passes. Every raised region is reachable unless it is deliberately cliff-locked (§4.3). | DF ramps every one-level step of its natural surface. In a 3/4 top-down view that reads as noise, and cliffs are what make terraces look like terrain. The checks keep the result walkable (§11). |
| T6 | **All surface water stays on `z=0`.** Rivers carve valleys, lakes and the coast keep a low shore, and any cell within 2 of forced-low ground is capped at `+1` so a terrace always steps down to the water (§5). | V91: "valleys keep the rivers and lakes". The terrace cap removed every unreachable region in the model (§2.6). |
| T7 | **The three surface levels share tileset 91** (UF_Tiles), extended with an **A4** sheet of cliff tops and faces, an **A5** sheet for stairs cut into faces, and a code-drawn **D** sheet for shade, markers and cave mouths (§7.1). `-1/-2` keep the build plan's tileset 92. **The build plan's `+1/+2` tile ids must be re-mapped for tileset 91** (§7.1): its built floor, A5 1552, is "Ground A (Wood)" in Dungeon_A5 but "Meadow A" in Outside_A5. | `+1/+2` now show the same grass, snow and rock as the ground, so they need the ground's A2 kinds and plant tiles. The build plan gave every non-ground level tileset 92 (Dungeon), which fits `-1/-2` only. |
| T8 | **The A4 slot is a composed runtime sheet `UF_GenTerrain_A4`**, built at boot from blocks of `Outside_A4` and `Dungeon_A4` (§1.4). | A tileset holds exactly one A4 image. Outside_A4 has the grassy, dirt, desert and snow ledges but no natural grey rock cliff. Dungeon_A4 has rock and earth cliffs but no grassy ledge. The mock uses both (§7.9). |
| T9 | **Draw rule:** on the viewed level, a raised solid cell shows its **face** where the ground south of it is lower, and its **top** elsewhere. The face is drawn *on the solid cells*, never on walkable ones, and the top gets a rim where it meets the face. Open air shows the level below, shaded one step per level of depth (§7). | The face you see from `z=0` is the rock that is solid at `z=0`, the rock a miner digs from the cell in front of it. The rimless variant looked pasted-on in the mock (`mock_view_z0_norim.png`). |
| T10 | **The camp and the V67 kit stay on `z=0`.** The grid is built before any faction is placed, so its flat start is anchored on the map's start cell (`dims().startX/startY`, the habitable centre), not on the camp: a forced-low disc of 16 cells and flat relief out to 36 cells. The player's camp lands within `factions.areas.playerReach` (6) of that cell. Other factions are only placed where their camp disc is at `z=0` **and** their kit ring holds enough reachable `z=0` land, and kit candidates must be reachable `z=0` cells (§8). | This keeps every existing kit and faction check meaningful without making them z-aware. Hills and mountains are "out there", as in DF embarks. The ring rule closes a rare V67 gap the critic run found (§8, §16 F4). |
| T11 | **Exposed ore on cliff faces is an ordinary UF_Objects outcrop** (the existing `ironstone`, `copper_outcrop`, `gold_outcrop`, `crystal`), stored on the level whose ground stands in front of the face. Ore inside the rock is a material revealed by digging (§6). | The existing `mine` action, its yields, finite depletion (V74) and the kit's ore counting work unchanged. |
| T12 | **Natural terrain is regenerated from the seed plus `terrain.gen`.** Saves store only changes. Saves made before V91 get `terrain.gen = 0`, which means flat (§9.5). A new world uses the catalog's `terrain.gen` from the first `cellInfo` call on, because UF_Factions reads the grid inside `world:created` before any other listener could write `state.terrain`. | This follows RESOURCE_ATLAS §9: never reshuffle an existing save. Raising hills under an existing colony would bury it. |

---

## 1. Chipset survey (task 1)

### 1.1 Method
`tools/png_read.js` and `tools/png_util.js` cut 17 crops from `game/img/tilesets/*.png` at 1× (whole sheets) or 2× and 3× nearest-neighbour (magenta lines every 48 source px). I opened each crop and chose tiles by looking. Tile names come from the matching `.txt` files. Tile ids follow `Tilemap.TILE_ID_*` (`rmmz_core.js:2667-2675`: B 0, C 256, D 512, A5 1536, A1 2048, A2 2816, A4 5888). A4 kind `k` of a sheet is the block at x = (k % 8)·96, with tops for (k % 16) < 8 and faces for (k % 16) ≥ 8. Its tile id is 5888 + 48k + shape.

**Measured sheet sizes:** `Outside_A4.png` and `Dungeon_A4.png` are **768×720**. `docs/RMMZ_ASSET_SPEC.md` §3 says 768×576 for A4, which is wrong. The AR-1200 section of `ASSET_REQUESTS.md` already notes this, but the spec file itself still carries the error. That file isn't mine to edit in this task, so the error is reported here and in §14.

### 1.2 Picks (the placeholder set)

| Role | Sheet, kind or tile | Tile id(s) | Kind | What the crop shows |
|---|---|---|---|---|
| **Grassy hill top** with its edge rim | `Outside_A4` kind 36 "Ledge A (Meadow)", top | 7616 + shape | A4 top (floor-type autotile, 47 shapes) | Bright meadow grass inside a chunky golden rock rim (crop 02, first block). |
| **Hill face** (earth and rock cliff with a grassy foot) | `Outside_A4` kind 44 (face of Ledge A) | 8000 + shape | A4 face (wall-type autotile, 16 shapes) | Golden-brown rocky face, grass tufts along its foot (crop 02). |
| Dry or brown hill top and face | `Outside_A4` kinds 38 / 46 "Ledge C (Desert)" | 7712 / 8096 | A4 top / face | Brown earth top in the same rim, same golden face (crop 02, third block). The `.txt` says Desert but it looks like dirt. |
| Sandy hill top and face | `Outside_A4` kinds 37 / 45 "Ledge B (Dirt)" | 7664 / 8048 | A4 top / face | Pale tan, sand-like top, golden face (crop 02, second block). The `.txt` says Dirt but it looks like sand. |
| **Snowcap** top and frosted face | `Outside_A4` kinds 39 / 47 "Ledge D (Snow)" | 7760 / 8144 | A4 top / face | Plain white top in a snowy rock rim, whitish frosted face (crop 02, fourth block). |
| **Mountain rock** top and **cliff face** | `Dungeon_A4` kinds 37 / 45 "Ledge B (Rock Cave)" | 7664 / 8048 (Dungeon sheet) | A4 top / face | Pale grey stones on top, grey-brown rock face (crop 05, fourth block). **No rim:** the critic's hill render (`critic_terrain/hill_rim_check.png`) shows only a thin dark outline where the top meets the face, unlike the chunky rim of the Outside ledges. The same holds for kinds 0–3. |
| Dark rock (crag) | `Dungeon_A4` kinds 1 / 9 "Wall B (Rock Cave)" | 5936 / 6320 | A4 top / face | Grey cobble top, dark grey rock face (crop 05, second block). Already the build plan's `-1/-2` rock (AR-1200). |
| Bare earth mass (soil) | `Dungeon_A4` kinds 0 / 8 "Wall A (Dirt Cave)" | 5888 / 6272 | A4 top / face | Tan clods on top, brown striated earth face (crop 05, first block). Already AR-1201's placeholder. |
| Volcanic or ash high ground | `Dungeon_A4` kinds 2 / 10 "Wall C (Lava Cave)" | 5984 / 6368 | A4 top / face | Dark brown top and face (sheet crop 04). |
| Ice cliff (glacier, frozen high ground) | `Dungeon_A4` kinds 3 / 11 "Wall D (Ice Cave)" | 6032 / 6416 | A4 top / face | Cyan ice top, darker patterned ice face (crop 05, third block). |
| **Ore-bearing face** (optional texture) | `Dungeon_A4` kind 43 (face of "Wall T (Dirt Cave, Gold)") | 7952 | A4 face | Brown earth face with gold nuggets (crop 06, second block). |
| **Gem-bearing face** (optional texture) | `Dungeon_A4` kind 13 (face of "Wall F (Crystal)") | 6512 | A4 face | Pale rock studded with purple and blue crystals (crop 06, first block). |
| **Stairs cut into a hillside** | `Outside_A5` 48–51 "Stairs (Meadow, Left/Center/Right/single)" | 1584–1587 | A5 static | Grassy steps with golden risers, matching the Ledge A face (crop 07, row 6). |
| Stairs into sand, brown and snow faces | `Outside_A5` 52–55 (pale, "Dirt"), 56–59 (brown, "Desert"), 60–63 (Snow) | 1588–1599 | A5 static | Same step shape in the palettes of kinds 37, 38 and 39 (crop 07, rows 6–7). |
| Stairs into rock faces | `Outside_A5` 68–71 "Stairs (Ruins, …)" | 1604–1607 | A5 static | Rough grey cracked steps (crop 07, row 8). The better match, `Dungeon_A5` 44–47 "Stairs B (Rock Cave)" (crop 15), can't share the A5 slot with Outside_A5. |
| **Cave mouth** into a mountain | `Outside_C` 118 (upper) and 126 (lower) "Cave Entrance" | 374 / 382 | C static, 1×2 | A dark cave-shaped opening, transparent round it, made to sit over a cliff face (crop 12). On a one-row face, 126 alone. The mock shows it in a hill face. |
| Mine mouth (built later, not generated) | `Outside_C` 119 / 127 "Mine Entrance" | 375 / 383 | C static, 1×2 | A timber-framed dark opening (crop 12). |
| **Ore and gem outcrops on faces** | the existing catalog objects `ironstone`, `copper_outcrop`, `gold_outcrop`, `crystal` (their sprites, for example `!$IronstoneDeposit.png`, 144×192) | objects, not tiles | UF_Objects sprite | The ironstone sprite on a face reads as an outcrop, though it carries a ground shadow (mock, §7.9). The face-specific request is AR-1405. |
| Boulders on `+2` floors (already sprites) | existing `granite_boulder`, `rocks_small`, `gravel` | objects | UF_Objects | No tile needed. `Outside_B` 223 and 231 "Boulder A/B (Snow)" are candidates for snowy variants (crop 13). |

### 1.3 Looked at and rejected

| Candidate | Why not |
|---|---|
| `Outside_A4` kinds 0–2, 17, 32 (Wall A/B/C/D (Stone), Wall H (Moss)) | Dressed stone and brick masonry (crop 03). These are built walls, not natural cliffs. |
| `Outside_A4` kinds 34–35 "Forest A/B" | Canopy walls with trunk faces: an impassable forest wall, not a landform (crop 01). |
| `World_A2` kinds 6, 7, 14, 15, 22, 23, 25, 30, 31 (Mountain/Hill (Grass, Dirt, Sandstone, Rock, Lava, Snow)) | World-map scale: a whole mountain drawn inside one tile, on transparent ground (crop 10). A UF cell is about 1.8 m (`SCALE.md`). |
| `World_B` 202–222 "Rock Mountain", `World_C` mountain blocks | Multi-tile world-map mountains, same scale problem (crops 11, 17). |
| `World_B` 16–21 (Cave A/B, Mine, Tunnel) | World-map icons of cave mouths, each a whole rock arch in one tile (crop 11). `Outside_C` 118/126 fits a face at local scale. |
| `Outside_A5` 88–127 (static "Ledge (Meadow/Dirt)", "Cliff", "Cliff (Meadow/Dirt)") | The same art as A4 kinds 36/37, cut into static pieces (crop 08). A4 autotiles handle every shape and these don't. Kept as a fallback only. |
| `Outside_A2` kind 31 "Ledge", kinds 21 and 29 "Hole" | An A2 pad has no face (crop 09). The holes are pits, which the build plan's AR-1207 covers. |
| `Inside_A1/A2/A4/A5` (stone walls, stone ledges, "Dirt Ledge") | Interior masonry and floors (crop 16). Nothing natural. |
| `Dungeon_A5` 33–35 (Rock Cave floors with red, blue, green crystals), 44–47 (Rock Cave stairs) | Good art, but tileset 91's A5 slot has to be Outside_A5 for the grass, dirt, desert and snow stairs. Candidates for AR art direction, and for tileset 92 on `-1/-2`. |
| `Dungeon_B` 37, 45, 53/61 (crystal props), 40–47 (boulders), 48–63 (tall rocks) | Props that duplicate existing object sprites (crop 14). The tall rocks are stalagmites for `-1/-2`. |
| `Outside_B` 1–4 / 9–12 "Stairs A–D (Up/Down)" | Built stairs in dressed stone and wood (crop 13). They are the build plan's constructed stairs (AR-1208/1209). |

### 1.4 What the survey means for the engine
- **One A4 per tileset.** RMMZ gives a tileset one A4 image (`tilesetNames[3]`). The grassy ledges are in Outside_A4 and the natural rock cliffs in Dungeon_A4. **UF_Tiles composes `UF_GenTerrain_A4` at boot:** it copies the chosen 96×240 top-and-face blocks into one 768×720 canvas, in the slots of §7.2, the way it paints `UF_GenGround_A2` today (`UF_Tiles.js:130-155`). The slots and their source blocks live in the catalog, so a delivered `UF_Terrain_A4.png` replaces the composition with no code change (§14). **Unlike the A2 sheet, this one copies from PNGs that load asynchronously.** A `new Bitmap(w, h)` counts as ready at once, so the first map could draw empty cliffs. UF_Tiles therefore preloads both source sheets in `Scene_Boot.loadSystemImages`, so the boot waits for them, and composes synchronously on the first request. The `tiles` suite checks the composed sheet's size and a sampled face pixel.
- **Stock covers only north-facing slopes.** The A5 stairs are cut into a south-facing face, so a slope climbed northwards has a picture. Slopes climbed east, west or south have no stock art. Until art arrives they use code-drawn markers on the D sheet (§7.5).
- **No stock shade tile.** Open air on `+1/+2` needs a darkened view of the ground below. ART_STANDARD F5 requires alpha 0 or 255, so the shade is a dither pattern on the D sheet (§7.4).

---

## 2. From the elevation field to the surface level

### 2.1 Terrain height
For every world cell (gx, gy), with the climate fields `f = fieldsFor(seed, gx, gy)` that UF_WorldGen already computes (`UF_WorldGen.js:265-295`):

```text
relief  = (1 − w) · valueNoise(seed, salt("uf.terrain.relief"), gx, gy, 40)
        +      w  · valueNoise(seed, salt("uf.terrain.relief.detail"), gx, gy, 14)        w = 0.35
land    = smoothstep(seaLevel, seaLevel + 0.08, f.e)                  no hills in the sea or on the beach
flat    = smoothstep(14, 36, distance to the start cell)             (T10: dims().startX/startY, not the camp)
T       = f.e + 0.38 · (relief − 0.5) · land · flat
T      -= 0.22 · smoothstep(12, 2, rd)                               rivers carve valleys (§5)
if f.e ≥ mountainLevel: T = max(T, f.e)                              (T2: undoes relief AND the carve)
```

- `rd` is the **Chebyshev distance to the nearest river water cell**, from one two-pass distance transform over the river cells, capped at 13. The model measured it horizontally (`|gx − centre(gy)| − halfWidth`). On steep meanders that left raised cells within 2 of the water (critic re-run, 40 seeds: median 0, p90 81, max 199 cells, none 4-adjacent). With the Chebyshev transform the same 40 seeds had 0 such cells, a median raised share of 22.2 % (was 24.0 % in the same run), a median `+2` share of 2.7 % (was 3.0 %) and 0 unreachable regions.
- The order matters. Because `max(T, f.e)` comes last, mountain-biome cells ignore the valley carve, and rivers cross ranges in gorges (§5). The alternative, carving after the mountain rule, is the knob `valley.inMountains` (default `false`, the modelled behaviour).
- `salt(s)` is `UF.WorldGen.hashString(s)`. These derived names can't collide with WorldGen's `SALT` constants, which is the build plan §5.6 convention. Every constant is a catalog value in `terrain` (§10). The numbers are the proposed defaults.
- The grid needs `f` for all 65,536 cells, and it is built before any area build (UF_Factions calls `cellInfo` inside `world:created`), so it pays for its own fields pass (§9.4).

### 2.2 Forced-low ground
`S = 0`, whatever `T` says, for: every water cell (ocean, lake, river, the start pond); river banks with `rd ≤ 2`; lake **and pond** shores within 2 cells (Chebyshev dilation of the water cells); the coast (`f.e < seaLevel + 0.04`); and the start disc (radius 16 round the start cell, T10).
- The start pond lies 8–22 cells from the start with a radius of 2–5 (`start.pond`), so it can reach 27 cells out, beyond the 16-cell disc. The model had no pond. In the critic re-run with the pond forced low, at most 5 raised cells lay within 2 of it and none touched it, so the pond-shore rule costs almost nothing. It keeps the founders' first drinking water on open banks.
- The model's second lake-shore pass spread only westward from any low cell (a bug in `terrain_sweep.js`, line 94), so its lake shores were about one cell wide. The engine rule is the 2-cell dilation above, and `terrain.rivers_low` measures it.

### 2.3 Thresholds, with a per-world floor
```text
t1 = max(hillMin, min(hillLevel, the T exceeded by 12 % of all land cells))   hillLevel 0.58, hillMin = startClimate.elevation + 0.06 = 0.56
     (only cells that aren't forced low are ranked; the index is 12 % of the land count, as in the model)
t2 = max(t1 + 0.03, min(mountainLevel, the T exceeded by 2.5 % of all land cells))         mountainLevel = climate.mountainLevel = 0.74
S  = 2 if T ≥ t2, 1 if T ≥ t1, else 0
```
- With the defaults, most worlds keep `t1 = 0.58` and `t2 = 0.74` (model medians, §2.6). Flat worlds get lower thresholds, down to the floors.
- `hillMin` stops the floor from ever lifting the start. The start climate pins elevation to 0.5 within 28 cells of the centre (`climate.startHabitableRadius`). In the model, a floor below 0.5 raised the whole start disc (1187 cells). The clamp brought that to 0 in every seed. Worked through: with `e = 0.5` and `t1 ≥ 0.56`, a cell is raised only when `0.19 · flat ≥ 0.06`, i.e. more than about 22 cells from the start cell. The critic re-run agrees: the nearest raised cell was 24.0 to 51.0 cells from the start cell (40 seeds).
- **Massif guarantee:** if `+2` would still cover under 2 % of land, the cell with the highest `T` at least 70 cells from the start cell gets a seeded bump, `T += 0.30 · exp(−d² / (2 · 16²))`. `S` is then recomputed with the same `t1` and `t2` (the model does not re-rank). 5 of 100 seeds needed it with the defaults.
- **Terrace cap (T6):** a cell within 2 cells (Chebyshev) of forced-low ground can be at most `+1`.

### 2.4 Smoothing: no spikes, no slivers
In this order, which is the model's (`terrain_sweep.js` lines 117-128):
1. **Opening with a 2×2 block, top level first:** a cell keeps level k only if it lies in some 2×2 block of cells all at level k or higher. Otherwise it drops to k − 1. Every top then has at least a rim row and a face row to draw.
2. **Crags:** a `+2` cell with `f.e ≥ climate.peakLevel` (0.86), whose every cell within 2 is `+2` and which lies in a 2×2 block of such cells, becomes **crag**: solid on `+2` as well, a rock pinnacle with no floor anywhere. This takes over the role of today's impassable `peak_rock` (`UF_WorldGen.js:434-441`). The interior-only rule keeps a walkable `+2` rim round every crag.
3. **Small regions:** a 4-connected region at level k or higher (crag cells not counted) with fewer than 16 cells (`+2`) or 24 cells (`+1`) drops to k − 1.
4. **Pits:** a dry, non-forced-low region below k with fewer than 6 cells, enclosed by level k or higher, is raised to k.

**`peak_rock` retires on generated terrain (`terrain.gen ≥ 1`).** `resolve()` sets the ground kind `peak_rock` and `FLAG_PEAK` for every mountain cell with `e ≥ peakLevel` (`UF_WorldGen.js:434-437`), and `peak_rock` is `passable: false` in `groundKinds`. Kept as it is, the walkable rim round every crag would be drawn with an impassable ground tile, so the rim the reachability BFS counts as walkable would block every walker. For gen ≥ 1, `resolve()` gives such cells `scree` (or `snow` by §6.4) and no `FLAG_PEAK`. `cellInfo(...).peak` then means "crag", and crag blocks through its A4 flags (§7.6). Saves with gen 0 keep `peak_rock` exactly as today. `terrain.stacked` (d) checks that every natural floor has a passable tile (§11).

### 2.5 Slopes and repair
§4 places the slopes, then the repair pass runs. Terrain generation owns the grid `{ S, crag, ramp (lean direction or −1), locked components }`, built once per `(seed, terrain.gen)` and cached (§9.2).

### 2.6 How much is raised (Node model, proposed defaults, 100 seeds, 2026-09-19)

| Measure | min | median | p90 | max |
|---|---|---|---|---|
| Land at `+1` | 2.1 % | 17.1 % | 32.1 % | 45.7 % |
| Land at `+2` (including crag) | 1.9 % | 2.6 % | 11.8 % | 22.2 % |
| Land raised (`+1` or `+2`) | 4.3 % | 19.9 % | 42.9 % | 56.9 % |
| Raised regions (`+1` or higher) | 2 | 8 | 12 | 15 |
| `+2` regions | 1 | 4 | 7 | 10 |
| Ramp cells | 55 | 410 | 682 | 1007 |
| Share of level-boundary cells that are slopes | 12.9 % | 27.0 % | 36.7 % | 41.0 % |
| Two-level contacts (a `+2` cell beside `z=0`) | 0 | 0 | 10 | 44 |
| Single-cell spikes before smoothing / after | 0 / 0 | 0 / 0 | 2 / 0 | 5 / 0 |
| Water cells not at `z=0` | 0 | 0 | 0 | 0 |
| Raised cells within 20 of the start cell (the model's stand-in for the camp) | 0 | 0 | 0 | 0 |
| Surface regions unreachable from the start cell (terrain only, §4.3) | 0 | 0 | 0 | 0 |
| Cliff-locked `+2` regions | 0 | 0 | 1 | 2 |
| Crag cells | 0 | 0 | 346 | 1271 |
| Snowy `+2` cells (§6.4) | 0 | 794 | 3311 | 9076 |

**What the model did not cover** (critic, 2026-09-19): the start pond, other factions' camps and kit rings, and a true-distance river bank. The critic re-run (`critic_terrain/critic_model.js` and `critic_model_cheb.js`, 40 seeds, the proposed defaults, the pond forced low) measured those. The results are quoted in §2.1, §2.2, §4.1 and §8. Its headline numbers with the Chebyshev bank: raised land median 22.2 % (3.3 %–55.2 %), `+2` median 2.7 % (min 1.5 %), massif needed on 2 of 40 seeds, 0 unreachable regions, 0 spikes after smoothing, 0 raised water cells. The `+2` minimum of 1.5 % is under the 2 % `massif.minShare`, because smoothing runs after the massif. `terrain.coverage` therefore asks for one `+2` region of 60 or more cells, not for a share.

The same seed built twice gave identical `S` and ramp grids, and seed + 1 differed. Two maps opened: seed 5 (`final_seed5_928303757.png`) shows scattered `+1` hills and an eastern `+1` massif with a `+2` core. Seed 11 (`model5_seed11_450786538.png`, amplitude 0.30) shows a northern range with `+1` foothills, `+2` cores, a crag, and a lake basin inside the range. Both keep the river on low ground and the camp on flat ground.

**Tuning (50 seeds each):**

| amplitude / hillLevel | median raised | median `+2` | seeds needing the massif |
|---|---|---|---|
| 0.30 / 0.60 | 15.7 % | 2.7 % | 5 of 50 |
| 0.38 / 0.60 | 17.0 % | 3.0 % | 3 |
| **0.38 / 0.58 (proposed)** | **21.4 %** | **3.0 %** | **3** |
| 0.45 / 0.58 | 23.3 % | 3.4 % | 0 |

Mountains are rarer than hills because the start climate blends elevation toward 0.5 out to 110 cells. Most of the natural elevation, and so most `+2`, sits in the outer ring of the map. The user may want more mountain. The knobs are `terrain.floor.high` (the guaranteed `+2` share) and `climate.startHabitableRadius`. The second changes biomes too.

---

## 3. Solid fill under every raised surface

### 3.1 The three surface baselines
The build plan's shape codes (`VERTICAL_BUILD_PLAN.md` §2.3) are derived from the terrain grid:

| Level | `S(c) < z` | `S(c) = z` | `S(c) > z` or crag |
|---|---|---|---|
| `z=0` | (never) | `floor`, or `ramp` where §4 put one | `solid` |
| `+1` | `open` | `floor` or `ramp` | `solid` |
| `+2` | `open` | `floor` | `solid` (crag only) |

This replaces two baselines in the build plan: `+1/+2` "every cell `open`" (§5.6) and "the ground's baseline shape is `floor` everywhere, except `peak_rock`" (§2.3). `-1/-2` are unchanged. The column is stacked by construction: a floor at `z ≥ 1` always has natural `solid` under it, and that is the `terrain.stacked` check (§11).

### 3.2 Material of the solid, by depth and family
The build plan packs a material index into every changed cell (`packed = shape | constructed·8 | material·16`, §2.3). For natural baselines, the material comes from the cell:

| Depth below the surface (`S − z`) | Rock family (surface biome mountain, rock desert, badland, glacier, or crag) | Every other biome |
|---|---|---|
| 1 under a `+1` surface (the `z=0` cell) | stone (the host rock of the column) | soil: loam in grass and forest, sand in sand desert and savanna, clay in wetland margins, frozen soil in tundra (RESOURCE_ATLAS §3.2 earth families) |
| 1 under a `+2` surface (the `+1` cell) | stone | **stone**: every summit is rock-cored (critic fix, see below) |
| 2 | stone | stone |

Why summits are rock-cored in every biome: the first version had soil at depth 1 everywhere outside the rock family. Then the faces of a forest or grassland `+2` mass seen from `+1` were soil faces, which can't hold outcrops (§6.2). Its floor table (a forest's) has no ore either. So a non-mountain `+2` region, which is what the guaranteed massif usually is in a flat world, had no ore source at all, and `terrain.mountains_have_resources` would have failed on it. V91 asks that mountains carry stone, ore and gems.

- **Host rock** is the same geological column the atlas gives `-1` (RESOURCE_ATLAS §3.2, §4 "Layer stone"). One rock type per column, so the rock inside a hill matches the upper stone below it.
- **Veins** (finite, V74): seeded clusters inside stone masses. Iron and copper are common, gold is rare, and **gems occur only at depth 2**, the `z=0` cells under `+2` summits. That is the surface part of the atlas's "gems deeper". Most gems stay on `-1/-2`. Veins are materials: they show only once digging exposes them, using the build plan's overlays AR-1214 to AR-1217.
- **Until geology lands** (build plan slice 4; V1 writes material 0 everywhere, §5.6 there), the terrain uses two generic materials, stone and soil, and no veins. Host rock, soil kinds and veins arrive with slice 4 and bump `terrain.gen`. The first build meets the resource guarantee with outcrop objects and the top-up (§6.2), not with veins.
- Soil masses dig faster and yield earth resources. Stone yields `stone` and its veins. The yields are catalog data (`levels.excavate.yield` by material, build plan §7.2).

### 3.3 Support
Natural cells are always supported (build plan §7.3), so hills never collapse. Digging a tunnel into a hill at `z=0` leaves the `+1` floor above it standing: its neighbours are natural solid, which counts as support.

---

## 4. Slopes and cliffs

### 4.1 What a slope is
A slope is a natural `ramp` on the **low** cell L of a 4-adjacent pair where `S(H) = S(L) + 1`. It leans on H, which is `solid` on L's level, and exits onto H's floor one level up. Headroom above L is open because `S(L) < S(L) + 1`. That is exactly the build plan §6.1 edge, so routing, `canEnter` (V3) and the checks need nothing new. **A ramp never leans on a crag**, which has no floor on `+2`. The crag inset (§2.4) means no `+1` cell touches a crag anyway. A ramp cell has **one** lean direction. At a concave corner the first qualifying direction in the order north (it has stock art), east, south, west wins (the model's order), and the other raised neighbours of that cell are cliffs.

**Connector graph size.** The build plan's §6.3 graph expects "tens to low hundreds of ends" and builds O(n²) edges per region. That assumes the `+1/+2` baselines have no connectors. Natural slopes break it. Critic re-run, 40 seeds: 106–1007 ramp cells per world (median 435), in 53–490 runs (median 225) of 4-connected ramps with the same lean and level, and those runs join only 9–27 distinct (low region, high region) pairs (median 16). So UF_Levels registers **one connector end pair per ramp run** (the run's middle cell), and the route search first picks a region pair and then the run nearest the unit. The graph stays at a few hundred ends with edges grouped by region pair. The unit walks to its run with the ordinary local planner.

### 4.2 Which boundaries become slopes
- **Ruggedness field:** `r = valueNoise(seed, salt("uf.terrain.rugged"), gx, gy, 18)`. A low boundary cell becomes a slope when `r < below[upper level]`: `below[1] = 0.36` for hills and `below[2] = 0.12` for mountains (passes), plus 0.12 when the slope would lean north. Because `r` is smooth, slopes come in runs of a few cells, which read as a path up a hillside rather than scattered ramps.
- **Per region:** every raised region needs at least one slope per 60 boundary cells, and at least one. Missing slopes go on the boundary cells with the lowest `r`, with the cell index as tie-break.
- **Cliff-locked regions:** a `+2` region of at most 120 cells is cliff-locked with probability 0.15 (seeded per region). It gets no slopes and is reachable only by climbers, digging, or built stairs. Locked regions are listed in the grid and excluded from reachability. In the model, 0 to 2 per world.
- **Two-level contacts** (a `+2` cell beside `z=0`) happen only where relief is steep, 0 to 44 cells per world in the model. They are always cliffs, drawn two face rows tall (§7.3).

### 4.3 Repair for reachability
A BFS runs from the start cell (T10; the camp is on the same flat disc) over surface cells. Edges: 4-neighbours at the same level, and slope edges. **Water counts as passable for this check only**, because crossing rivers is a separate system's problem (bridges, fords, swimming). Every surface region that isn't locked or crag must be reached. An unreached region gets one slope at its best boundary cell toward a reached neighbour. Rounds repeat until nothing changes, bounded at 64. In the model: at most 1 round and 3 added slopes, 0 unreachable regions in 100 seeds. A step repair for regions touching only two-level contacts was built too, and was never needed once the terrace cap (§2.3) was in. **The engine keeps the step repair as the fallback.** If a region is still unreached after both, New Game reports the invariant and the seed, as RESOURCE_ATLAS §2.1 requires, and `terrain.slopes_connect` fails. The world is never quietly left with a region no walker can reach.

### 4.4 Cliffs
Cliffs are solid on the low level and impassable to walkers. Climbers (VW §7.1: "climbers use eligible vertical faces at higher cost and risk") treat a one-level cliff as a costly edge. That arrives with the movement-profile work (build plan §13, "Fliers, climbers and swimmers"). A fall from a cliff edge uses the build plan's fall rule (§7.4).

---

## 5. Water on low ground and in valleys
- **Rivers** (the north–south meanders of `UF.WorldGen.riverModels`) keep their cells and a 2-cell bank at `z=0`, measured as true (Chebyshev) distance (§2.1). Outside the mountain biome, `T` drops by up to 0.22 within 12 cells, so a river cutting through hills runs in a valley with terraces stepping down to it.
- **Rivers in the mountain biome run in gorges.** `T = max(T, f.e)` undoes the carve there (§2.1), so the profile is the 2-cell `z=0` bank, then at most `+1` for 2 cells (the terrace cap), then `+2` cliffs. In the critic re-run, the worlds where a river crosses a range (p90) had 996 mountain cells within 12 cells of a river, and 474 of them stayed at `+2`. In the median world, no river comes near a mountain. Whether ranges should open into wide valleys instead is the knob `valley.inMountains` (D-T1).
- **Lakes** (`isLake`, only below `mountainLevel`) keep a 2-cell shore at `z=0`. A lake inside a range sits in a basin, with slopes placed by the repair pass.
- **Ocean and coast:** `f.e < seaLevel + 0.04` stays low. The existing continent rim keeps the map edge at sea.
- **The start pond** stays low as water, and its 2-cell shore is forced low like a lake's (§2.2). It can reach 27 cells from the start cell, which is outside the 16-cell disc.
- **No water on `+1/+2` in this design.** Mountain tarns and waterfalls wait for the fluids slice (VW §6.1, build plan slice V5).
- **Drinking and fishing** keep working at `z=0` banks. On `+1/+2`, open cells above water never carry an A1 tile id (§7.4). `Tilemap.isWaterTile` is therefore false there, and no job treats a cliff edge as a bank.

---

## 6. Resources by level

### 6.1 Where things are

| Place | Resources | Source |
|---|---|---|
| `z=0` floors | The whole surface biome mosaic, unchanged. The `z=0` plant pass **skips every cell with `S > 0`**, which is solid on the ground, as it skips `peak_rock` today (`UF_WorldGen.js:800`). Face outcrops (§6.2) are the only objects on solid ground cells. | biome plant tables (`UF_WorldGen.js:791-815`) |
| `+1` floors (hilltops, terraces) | The biome plant table of the cell's own biome, filtered by habitat by altitude (§6.3) and scaled by `levelDensity[1]` = 0.85 | the same tables |
| `+2` floors (summits) | Mountain-biome cells use the mountain table (granite boulders, ironstone, copper, gold, crystal, pine, lichen, gravel). **`+2` floors of any other biome** (relief-raised hills, and the guaranteed massif in a flat world, which usually isn't mountain biome) use their own table through the habitat filter **plus the mountain table's `stone`, `boulder`, `ore`, `mineral` and `gem` entries at `terrain.summitBlend` (0.5)**. Snow where cold (§6.4). Plants take `levelDensity[2]` = 0.5. | `biomes.mountain.plants`, `terrain.summitBlend` |
| Crag (`+2` solid) | Quarriable stone only (dig) | §3.2 materials |
| **Cliff faces** (solid cells drawn as faces) | Exposed outcrops as objects (§6.2). Every stone face can also be dug for stone. | `terrain.faceOutcrops` |
| Inside hills and mountains | soil or stone by depth, veins, gems at depth 2 | §3.2 |
| Open air over low ground | Tree trunks and crowns of multi-level trees from lower levels (VW §4.3), nests and fliers later (atlas §3.4) | unchanged |

### 6.2 Outcrops on cliff faces
- **Eligible cell:** a face cell of a stone mass whose south neighbour is standable on some level `zf`, the level of the ground in front of the face. The outcrop goes on **level `zf`'s object grid**, so it is drawn and mined only from the level where the miner stands. A `+1` hill face faces the ground (`zf = 0`). A `+2` face above a terrace faces `+1`.
- **Densities per eligible face cell** (proposal, catalog `terrain.faceOutcrops`): `ironstone` 0.03, `copper_outcrop` 0.015, `gold_outcrop` 0.004 (`+2` masses only), `crystal` 0.005 (`+2` masses only).
- They use the existing `mine` action and yields, so they are finite and deplete (V74). An outcrop sits on a solid cell, so V68 is untouched: no unit can stand there.
- **Deterministic top-up (VW §4.1 step 8).** Random densities can leave a region short. Take a `+2` region of 150 cells with about 30 eligible face cells: at 0.045 ore per face cell, that region expects 1.35 outcrops, and has none with a probability of about e^−1.35 ≈ 0.26 (a Poisson estimate, not a measurement). The generator therefore tops up after the object passes. Every `+2` region of at least 150 cells gets ore sources up to max(1, area / 400) and stone sources up to max(3, area / 100). The world gets one gold and one gem source on `+2` if it has none. They go on eligible face cells first, then on free floor cells. Choices are seeded by `hash32(seed, salt("uf.terrain.topup"), regionIndex, n)`, with ties broken by cell index. Every placement is logged in `WorldGen.terrainLog.topup`, like `kitLog`. This is what `terrain.mountains_have_resources` then verifies.

### 6.3 Habitat by altitude
The catalog's `objects` list belongs to Gemini (AGENTS.md, Who touches what), so habitat lives in the new Claude-owned `terrain.habitat` section, keyed by object id with defaults by tag:

| Tag or id | Allowed surface levels |
|---|---|
| default for `tree` | 0, 1 |
| `pine` and other conifers | 0, 1, 2 |
| default for `plant` (bushes, herbs, grass) | 0, 1 |
| `lichen` | 0, 1, 2 |
| `reeds` and every `onWater` plant | 0 |
| `stone`, `boulder`, `ore`, `mineral`, `gem` tags | 0, 1, 2 |

(The first draft also listed `grass_tuft` "in tundra biomes" as 0–2, but the §10 JSON has no per-biome rule. It now follows the `plant` default, 0–1.)

A tree can't raise a crown above the top level. When VW §4.3's multi-level trees land, trees rooted on `+1` may use `+1..+2` only (the small or medium form), and trees rooted on `+2` are the one-level kind only (VW §4.3 "small trees may use only `z=0..+1`", shifted up). Timberline is the result. Today's trees are single-cell objects, so this only constrains the later tree build. **Codex:** VW §4.3 assumes every tree is rooted at `z=0` and needs this line.

### 6.4 Snow and cold on `+2`
`t_level = f.t − 0.06 · S`. A `+2` floor with `t_level < 0.30` gets the `snow` ground kind and the snow top family. `+1` keeps the existing cold classification (tundra, glacier). `cellInfo(...).temperature` returns `t_level` for ecology habitat and any later cold mechanic. In the model, median 794 snowy `+2` cells per world, and 0 in warm worlds.
- Two existing rules already stack with this one. `fieldsFor` lowers `t` on high ground (`− 0.6 · max(0, e − 0.5)`, `UF_WorldGen.js:275`), and `resolve()` already snows every mountain cell with `t < 0.35` (`UF_WorldGen.js:438-440`), at any level. So the lapse adds snow mainly on non-mountain `+2` summits and at the edge of the mountain snow. The model's snow count uses only the new rule. The RMMZ build reports both.

### 6.5 Distribution (V83) and the atlas
Surface resources on `+1/+2` join the ecology director's `(z, biomeRegion)` buckets like everything else (RESOURCE_ATLAS §8.1). Face outcrops and veins are finite geology. They take part in initial distribution only and never respawn (V74, V83).

---

## 7. How it draws

### 7.1 One tileset for the three surface levels
Tileset **91** (UF_Tiles) serves `z=0`, `+1` and `+2`. New slots, with names from the catalog `tilesets.surface`:

| Slot | Placeholder | Holds |
|---|---|---|
| A4 (`tilesetNames[3]`) | `UF_GenTerrain_A4`, composed at boot (§1.4, §7.2) | cliff tops and faces |
| A5 (`[4]`) | `Outside_A5` (stock) | stairs cut into faces (§7.5) |
| D (`[7]`) | `UF_GenTerrain_D`, drawn in code | shade, water-below, covered-floor and slope markers (§7.4, §7.5) |

**Flags** (runtime only, UF_Tiles `registerTileset`):
- Every A4 tile: `0x0f`, blocking.
- The A5 face stairs: `0x0f`. They are drawn on the solid face cell. The ramp cell in front of them is the walkable connector.
- D shade and water-below tiles: `0x0f`, so open air blocks walkers. The planner's `tileBits` reads layers top-down (`UF_World.js:1078-1090`), like RMMZ's `checkPassage` (`rmmz_objects.js:6592-6611`).
- **Walkable-cell overlays** (covered-floor marker, slope markers, cave mouths on real tunnel mouths): `0x00`, not `0x10`. On layers 2–3, RMMZ draws a star-flagged tile above characters (`Tilemap._addSpotTile` and `_isHigherTile`, `rmmz_core.js:2460-2470`, `2638-2640`), which would hide units under the overlay. An overlay with flag 0 makes its cell passable, so overlays go **only** on cells whose shape is walkable.

`-1/-2` keep tileset 92 from the build plan.

**Re-mapping the build plan's `+1/+2` tiles (required).** The build plan's graybox table (§3.3 there) gives `+1/+2` tile ids from tileset 92's sheets, and those ids mean other tiles on tileset 91:

| Build plan use on `+1/+2` | Id there | On tileset 92 (Dungeon_A5) | On tileset 91 (Outside_A5) | On tileset 91 use |
|---|---|---|---|---|
| built floor | A5 1552 | Ground A (Wood) | Meadow A | UF_Floors' A2 ground kinds `floor_wood` / `floor_stone` / `floor_rushes` (already in `groundKinds`), as on the ground |
| open (air) | A5 1536 | Darkness | Darkness | the §7.3 open-air rule (lower view plus shade) |
| stairs, ladder hole | B 1, 9, 42 | Outside_B | Outside_B | unchanged (the B slot is Outside_B in both) |

`levels.tiles` in the catalog therefore needs a table per tileset, not one table per level. The five-level run owns that file and section. It is an ask in §12.1, not an edit this design makes.

### 7.2 Composed A4 slots (proposal; catalog `terrain.look.a4`)

| Slot (top / face) | Top family (surface ground kinds) | Top source | Face (mass material) | Face source |
|---|---|---|---|---|
| 0 / 8 | grass: `meadow`, `tropical_grass`, `blessed_grass`, `cursed_grass`, `forest_floor`, `needle_floor`, `jungle_floor` | Outside_A4 36 | earth with a grassy foot | Outside_A4 44 |
| 1 / 9 | dry: `dry_grass`, `shrub_soil`, `tundra`, `dirt`, `red_clay`, `mud`, `swamp_mud` | Outside_A4 38 | dry earth | Outside_A4 46 |
| 2 / 10 | sand: `sand` | Outside_A4 37 | sandstone | Outside_A4 45 |
| 3 / 11 | snow: `snow`, `ice` | Outside_A4 39 | frost rock | Outside_A4 47 |
| 4 / 12 | rock: `stony`, `rock`, `peak_rock`, `scree` | Dungeon_A4 37 | grey rock | Dungeon_A4 45 |
| 5 / 13 | ash: `ash` | Dungeon_A4 2 | volcanic rock | Dungeon_A4 10 |
| 6 / 14 | bare earth (a dug soil surface) | Dungeon_A4 0 | striated earth | Dungeon_A4 8 |
| 7 / 15 | crag | Dungeon_A4 1 | dark rock | Dungeon_A4 9 |
| 16 / 24 | ice (glacier high ground) | Dungeon_A4 3 | ice | Dungeon_A4 11 |
| — / 25 | — | — | gold-flecked rock (optional) | Dungeon_A4 43 |
| — / 26 | — | — | crystal-studded rock (optional) | Dungeon_A4 13 |

The top slot follows the ground kind of the cell's surface. The face slot follows the mass material at the level being drawn: soil uses the top family's own face (0 → 8, 1 → 9, 2 → 10, 3 → 11), stone uses 12, and the volcanic, crag and ice families use 13, 15 and 24. The composed tile id is 5888 + 48 × slot + shape.

### 7.3 The cell rule for a view level z
With `top(c)` = the first level at or above z where column c isn't solid (`S(c)` for natural terrain, 3 for a crag):

1. **Floor** (the shape at z is `floor`, `ramp` or stairs): the ground kind's A2 autotile on layer 0, as today. For the edge shapes, a neighbour counts as "the same" only when it is a floor of the same kind **at z**. Open air and raised cells are different, so the ground outline marks the drop and the foot of a cliff. If the cell above at z + 1 isn't open (a tunnel dug into a hill), the covered marker D4 goes on layer 2.
2. **Raised** (the shape at z is `solid`): an **edge** is a raised cell whose south neighbour is walkable or open at z, or is raised with a lower `top`. At an edge e with drop d = `top(e) − max(z, top(south))`, e and the d − 1 cells north of it with the same `top` are **faces**. Every other raised cell is a **top**.
   - Face: A4 face slot, wall-type shape. Neighbours joining a face are face cells with the same `top`, so a two-level drop draws as one two-row face.
   - Top: A4 top slot, floor-type shape. Neighbours joining a top are raised non-face cells with the same `top`. **A face below is "different", so the top shows its rim along the face** (T9).
3. **Open** (the shape at z is `open`):
   - Layer 0: the tile that view z − 1 would put on layer 0 at this cell, computed recursively. Water below is never copied as A1; D3 "water below" is drawn instead (§5). A cell the player hasn't explored on the lower level stays dark here, because fog is per level (VW §8).
   - Layer 1: shade, D1 for one level of depth and D2 for two.
   - Layer 2: a **hanging face**, when the cell lies within `z − S(c)` rows south of a raised or floor cell at z. The drop's face then shows below eye level. Stairs replace it above a ramp.
   - Layer 3: the hanging face that view z − 1 draws on this cell, if any. Without it, the terrace's own faces vanish from the `+2` view, and `mock2_view_z2.png`, which does show them, could not be reproduced (critic check of the mock, 2026-09-19). On open cells, layer 3 is therefore not free for the build plan's overlays. Those only sit on walkable cells.
   - Faces on layers 2–3 draw above the layer-1 shade, so they show at full brightness over darkened ground. The mock reads acceptably that way. If RMMZ shows otherwise, pre-shaded face variants go on the D sheet.
   - **The same cliff moves one row between views.** From `z=0` the face is drawn on the raised cells' own south row, which is solid there. From `+1` that row is walkable floor, so the face hangs on the open row south of it. This is the usual RPG Maker ledge convention, and the mocks show it. Players will see it as the level switches.

A dug cell's `top` changes with its shape, so digging, channelling and building all redraw through the same rule (`levels:shapeChanged` re-derives the cell and its 8 neighbours, build plan §3.5).

### 7.4 Open air (D sheet, drawn in code until AR-1403)
`UF_GenTerrain_D`, 768×768, tile id 512 + i, drawn at the native 48 px grid:

| i | Tile | Flag |
|---|---|---|
| 1 | shade, one level down: a 25 % dither of the palette's darkest blue | `0x0f` |
| 2 | shade, two levels down: a 50 % dither | `0x0f` |
| 3 | water below: a blue ripple dither over dark | `0x0f` |
| 4 | covered floor: a sparse dither | `0x00` |
| 5–8 | slope markers north, east, south, west (§7.5) | `0x00` |
| 16–31 | reserved for AR-1404 cave mouths (one-row mouth `0x00`, upper piece of a two-row mouth `0x0f`), so no new B sheet is needed (§14) | as listed |

### 7.5 Slopes and cave mouths
- **North-leaning slope:** the face cell it leans on draws the A5 stairs of that face family instead of the face. Grass uses 48–51, dry 56–59, sand 52–55, snow 60–63, rock 68–71. A run of slopes uses Left, Center… Center, Right, and a single slope uses the "single" tile. The ramp cell itself stays a plain floor. In the view above, the hanging face over the ramp cell becomes the same stairs.
- **East-, west- and south-leaning slopes:** the ramp cell gets D marker 6, 8 or 7 (a wedge with an up-slope arrow) on layer 2, until AR-1402 delivers proper slope tiles.
- **Cave mouths** (optional, catalog `terrain.caveMouths`): a descent network from the build plan §6.2 may start from a mountain face instead of open ground. It becomes a natural tunnel of 3 to 8 cells at `z=0` into a `+1/+2` mass (natural `floor`, covered marker), ending in the build plan's stair pair to `-1`. Its mouth cell draws `Outside_C` 126 on layer 2 with flag `0x00`, because the mouth cell is walkable. When the face is two rows, 118 goes on layer 2 of the solid cell above and keeps flag `0x0f` (its stock flag is `0x60f`). A `0x00` there would open the rock face to walkers. At most one per world by default. The build plan's reachability and V68 rules for descents apply.

### 7.6 Layers used

| Layer | Use |
|---|---|
| 0 | ground A2, raised A4 (top or face), the face stairs A5, or the lower view's tile under open air |
| 1 | shade (open air) |
| 2 | hanging face and stairs (open air), cave mouth, slope markers, covered marker (floors), and the build plan's connector overlays (stairs up and down, holes; §3.3 there) |
| 3 | on open cells, the lower view's hanging face (§7.3); on walkable cells, free for the build plan's overlays when layer 2 is taken |
| 5 | region ids, unchanged (`PEAK_REGION` 250 retires on gen ≥ 1: crag is impassable through its A4 flags) |

**Anything that writes layer 0 at `z=0` must refuse solid cells.** A layer-0 A2 tile written over an A4 cliff turns the cliff walkable, because RMMZ and `tileBits` let the top non-star tile decide. That covers UF_Roads (road tiles), UF_Floors (built floors, `UF_Floors.js:171-177`), and any construction placement that paints ground. Each needs a one-line test on `UF.Levels.shapeAt(...)` or `WorldGen.cellInfo(...).level` (§12.1).

### 7.7 What one-level rendering means here
Only the viewed level's units, objects and items are drawn (VW §8, build plan D2). From `z=0` a forested hill therefore shows as a bare grassy block: its trees are on the `+1` object grid. People working on a hilltop vanish from the ground view, and follow mode switches levels with them (build plan §6.6). **The reverse holds too:** from `+1` or `+2`, the lowland under open air shows shaded ground with no trees, units or items (`mock_view_z1.png`). With about four fifths of the land below, the upper views read as a bare plain round the hills. This design keeps the strict rule for the first build. Decision D-T2 (§15) asks whether objects one level away should show as non-interactive scenery. VW §8 allows a translucent cutaway "only for planning". The always-on lower-level tiles of §7.3 go further, so Codex's §8 needs a line for them (§12.1).

### 7.8 Look text (proposals)
- Raised top: "Hill (+1): grass over earth". Face: "Rock face: the +2 ground is above". Crag: "Crag".
- Slope: "Slope up to +1". Cliff edge on a floor: "Drop to Ground".
- Open air: "Open air: Ground below".

### 7.9 Mock renders (scratchpad `terrain_tiles/`; composites in Node from the chosen stock tiles; all opened)
- `mock2_view_z0_rim.png`, view from `z=0` (1152×768, a 24×16 cell test map). A meadow with a river down the left. A grassy `+1` terrace with golden rock faces on its south edges and a rocky rim on the top along each face. A pale-stone `+2` mesa with grey faces standing on the terrace, and a white snow cap at its north-east. Grassy stairs cut into the terrace face above a slope. Grey stairs in the mesa face. A dark cave mouth and an ironstone outcrop in the terrace's south face. Trees on the low meadow. It reads as stacked terrain.
- `mock_view_z0_norim.png`: the same view with the face counted as "the same" for the top. The grass runs straight into the faces and they look pasted on, hence T9.
- `mock_view_z1.png`, view from `+1`: the terrace is bright walkable meadow with trees. The low meadow and river are shaded dark as open air. Golden faces hang below the terrace's south edges. The mesa still stands with its grey faces and an ore outcrop on its face.
- `mock2_view_z2.png`, view from `+2`, after adding shade by depth: the summit (stone floor, a snow patch, two boulders) is at full brightness, the terrace one step darker with its hanging faces, and the lowland and river darkest. The first version, `mock_view_z2.png`, shaded every level below the same flat dark green and lost the terrace. That is why the shade steps by depth (§7.4).

---

## 8. Starts on usable ground (V67)
- **Player:** the start disc (radius 16 round the start cell) is forced low and relief is flat out to 36 cells (§2.1). The camp is placed within `playerReach` (6) of the start cell, so its 9-cell `PPP/PFP/PPP` block (V4) and its `clearDisc` (5) are always on that disc. Raised land can come closer to the camp than to the start cell. The critic re-run found the nearest raised cell 24.0 to 51.0 cells from the start cell (40 seeds), so an off-centre camp may see raised land about 18 cells away, inside its kit ring (5–20). The kit filter below handles that.
- **Other factions:** `UF.WorldGen.cellInfo(...).walkable` becomes `!water && !crag && level === 0`, the walkability of the *ground*. `UF_Factions.placeAreas`' `discOk` already requires a walkable disc (`UF_Factions.js:312-327`), so every camp lands on a flat `z=0` disc. `cellInfo` also gains `level`, `crag`, `ramp` and `temperature`.
- **Kit ring guard (one UF_Factions line, owner change).** A 5-cell disc at `z=0` doesn't mean the ring round it is. Critic re-run, 40 seeds, over every coarse candidate UF_Factions could pick (step 3, edge margin 12, at least 40 from the centre, disc of 5 at `z=0`): most candidates have 600 or more reachable `z=0` land cells in the 5–20 ring. The worst candidate in each world had 82–475 (median 290), and 0.0–1.2 % of candidates had fewer than 300. The kit's minimums are about 97 objects plus 1–2 outcrops, many with `avoidWater`. Placement is random among candidates, so a V67 short would be rare but real. `WorldGen.kitRingOk(gx, gy)` is true when at least `terrain.kitRingMin` (300) land cells at `z=0` in the ring are reachable from the centre over `z=0` land (4-connected, no water, objects ignored). UF_Factions' `discOk` calls it beside the disc test. UF_Factions is claimed by the "Faction menu skins" run, so this is a listed owner change (§12.1).
- **Kit (start.kit):** kit candidates in the ring 5–20 cells must also have `level === 0` (`UF_WorldGen.js:849`, next to the water and peak tests), and must be reachable from the campfire over `z=0` land (the same BFS as `kitRingOk`). The **ore** entry may use an eligible face outcrop cell (§6.2) whose stand is such a cell. It counts on the `z=0` object grid, where `kit_present`, `kit_fair` and `kit_covers_plan` already look.
- **Mountain peoples lose mountain homes (decision D-T4).** `sites.preferredBiomes` lists `mountain` for dwarf, gnome and automaton. The mountain biome now sits on `+2` except for 2-cell river banks, so no 5-cell `z=0` disc is ever mountain biome. Critic re-run, 40 seeds: before V91 a world had 0 (p10), 80 (median) or 474 (p90) such spots; after V91, 0 in every seed. Even `z=0` spots within 12 cells of raised mountain land were 0 at the median (p90 15), because foothills are wide. Those peoples fall back to their other preferred biomes (`desert_rock`, `taiga`, conifer forest, shrubland, badland) under UF_Factions' existing rule order. Nothing breaks, but the flavour is lost until plateau camps (D-T4 B) exist.
- **Wildlife needs no change for the ground.** UF_Wildlife already asks `cellInfo(...).walkable` for spawn cells and off-screen steps (`UF_Wildlife.js:221, 618, 657`), so ground animals keep off raised cells once `walkable` means level 0. Creatures on `+1/+2` need a z-aware `WorldGen.walkableAt(gx, gy, z)` when ecology puts them there (§12.1).
- **Why `z=0` only:** the kit and faction checks stay valid with no z logic. A later decision could allow plateau camps (D-T4).

---

## 9. Generation

### 9.1 Order, fitted into VERTICAL_WORLD §4.1

| VW §4.1 step | Terrain work |
|---|---|
| 1. climate fields, geology columns, water table | unchanged. **1a (new):** the terrain grid: `T`, forced-low, thresholds, massif, smoothing, crags, slopes, repair (§2, §4) |
| 2. allocate and materialize the five baselines | `z=0/+1/+2` shapes from the grid (§3.1); materials by depth and family (§3.2) |
| 3. aligned water, aquifers, openings, connector opportunities | surface water is low by construction (§5); cave-mouth descents are candidates here (§7.5) |
| 4. natural resource sources | veins in masses, face outcrops (§6.2) |
| 5. renewable flora and fauna | plant tables on the floors of all three surface levels, with habitat by altitude (§6.3) |
| 6. settlement starts, roads, V67 | camps on `z=0` discs, kit on reachable `z=0` cells (§8); roads skip raised cells |
| 7. descent networks | on `z=0` floors (build plan §6.2), or from a cave mouth |
| 8. audits and repair | reachability repair has already happened in 1a; the resource top-up of §6.2 runs here; the `terrain` checks run as invariants |
| 9. checksums | the terrain grid's checksum joins the level checksums |

UF_Factions calls `cellInfo` during `world:created`, before any build. That call builds the terrain grid on first use, from the seed alone. The grid's flat start is anchored on the start cell, not on any camp, so faction placement reads the grid and never feeds it: there is no cycle.

**Which `gen` a world uses.** `UF.World.newWorld` creates the state and emits `world:created` in one call (`UF_World.js:235-262`), and UF_Factions' listener runs before UF_WorldGen could write anything. So `WorldGen.terrain()` treats a missing `state.terrain` as the catalog's `terrain.gen` and writes `state.terrain` on first use. The load path, a `DataManager.extractSaveContents` wrapper beside UF_Levels' (build plan §5.5), writes `{ gen: 0 }` into any loaded save that has no `state.terrain`, before anything calls `cellInfo`. The build plan's per-level `levels[z].gen` for `z = 0, +1, +2` is derived from it: 2 when `terrain.gen ≥ 1`, else the plan's own value. The two numbers can't disagree.

### 9.2 Who does what
- **UF_WorldGen:** `WorldGen.terrain()` returns the grid, cached per `(seed, terrain.gen)`. It also provides `cellInfo` fields; the ground generator painting raised cells, slopes, face outcrops and the kit filter; a surface generator for `+1/+2` (`uf_worldgen_upper`, registered with `{ levels: [1, 2] }`, build plan S5) that paints floors, raised cells, open air and objects by the §7.3 rule; and the `terrain` test suite.
- **UF_Levels (build plan):** baselines for `z=0/+1/+2` from `WorldGen.terrain()`, natural ramps as connector ends, tileset 91 for `+1/+2`, checksums, and the redraw on `levels:shapeChanged`.
- **UF_Tiles:** tileset 91's A4, A5 and D slots, the composed A4, the generated D sheet, the flags, and updated `tiles` checks.

### 9.3 Determinism
Everything is a function of `(seed, catalog, terrain.gen)`. Noise uses named salts. Seeded choices use `hash32`/`mulberry32` from UF_WorldGen. Every sort breaks ties by cell index. No `Math.random`, and no dependence on build or visit order. The model confirmed the same seed gives the same grid and seed + 1 a different one (§2.6). `terrain.deterministic` checks it in RMMZ (§11).

### 9.4 Time budget (V50)
- **Measured in the Node model on 2026-09-19** (this machine, with other runs building at the same time): the new terrain work took 32–159 ms per world across five runs of 50–100 seeds (per-run medians 41–61 ms). The climate fields took 27–94 ms more.
- **The fields are not free.** The ground build computes them too, but the grid is built first (at `world:created`, §9.1), so it pays for its own pass over 65,536 cells. The two costs add.
- **Timing depends heavily on machine load.** The critic re-ran the unchanged `terrain_sweep.js` (20 seeds, proposed defaults) with the CPU at 99 % (`Win32_Processor.LoadPercentage`, 2026-09-19). Terrain took 85–276 ms (median 186) and fields 54–163 ms (median 82). The 40-seed critic runs gave terrain 122–1307 ms and fields 44–271 ms. Idle-machine numbers are not known.
- **Budgets proposed for RMMZ, measured by `terrain.gen_time` (D-T6):** terrain grid **including its fields pass** ≤ 300 ms (median of 3 cold builds). One `+1` or `+2` map build ≤ 600 ms. The ground build stays within V50's 1500 ms map budget. The New Game additions (the grid, the top-up, and the object passes of `+1/+2` for their checksums) ≤ 500 ms in total. The check prints its method: median of 3, `performance.now()`, the machine, and the CPU load read before the run. A FAIL taken on a loaded machine is still a FAIL. It is reported with the load, never re-labelled.
- Memory: the grid is 4 arrays of 65,536 bytes (S, crag/flags, ramp, material), about 256 KB. It is not saved. The fields pass keeps no arrays after the build.

### 9.5 Save
- **Nothing natural is saved.** The grid and the three surface baselines are rebuilt from `seed` and `terrain.gen`. `state.terrain = { gen, checksum }` is stored and compared on load. A mismatch is logged and never "fixed" silently (build plan §5.5). The first draft also stored the locked regions, but they are regenerated with the grid, and the checksum covers them.
- Changes (dug cells, built floors, removed outcrops) are the build plan's sparse `levels[z].cells` and `objectDiffs[levelKey]`.
- **Save size (V50, ≤ 3 MB):** the terrain's own entry is about 40 bytes of JSON (`"terrain":{"gen":1,"checksum":"9f31c2aa"}`, counted, not measured in a save). What grows is play on raised land: harvested objects on `+1/+2` add `objectDiffs` entries the same size as on the ground, and dug cells add the build plan's packed entries. `terrain.save_small` (§11) checks that the terrain's own share stays under 1 KB.
- **Saves from before V91** get `terrain.gen = 0`: `S = 0` everywhere, which is today's flat ground. Their `+1/+2` baselines stay all-open. No entity moves. A later explicit migration could offer terrain for untouched areas; this design doesn't include one.
- `terrain.gen` goes up whenever the terrain function or its defaults change, so an existing save never reshuffles (RESOURCE_ATLAS §9).

---

## 10. Catalog section `terrain` (proposal; Claude-owned; inserted by a Node script without reformatting, build plan §7.2)

```json
"terrain": {
  "about": "V91 stacked terrain on z=0, +1, +2 (docs/design/TERRAIN_LEVELS.md). gen 0 = flat (saves from before V91).",
  "gen": 1,
  "relief": { "scale": 40, "detailScale": 14, "detailWeight": 0.35, "amplitude": 0.38 },
  "hillLevel": 0.58,
  "coastMargin": 0.04, "campLow": 16, "startFlat": [14, 36],
  "valley": { "bank": 2, "outer": 12, "depth": 0.22, "inMountains": false }, "lakeShore": 2, "pondShore": 2, "terraceNearLow": 2,
  "kitRingMin": 300, "summitBlend": 0.5,
  "topup": { "minArea": 150, "orePerCells": 400, "stonePerCells": 100, "minStone": 3, "worldGold": 1, "worldGem": 1 },
  "floor": { "raised": 0.12, "high": 0.025, "hillAboveStart": 0.06 },
  "massif": { "minShare": 0.02, "minDist": 70, "sigma": 16, "height": 0.30 },
  "shape": { "minThickness": 2, "minArea": { "1": 24, "2": 16 }, "pitFill": 6, "cragInset": 2 },
  "slopes": { "ruggedScale": 18, "below": { "1": 0.36, "2": 0.12 }, "northBonus": 0.12, "perimeterPerSlope": 60, "lockChance": 0.15, "lockMaxArea": 120, "repairRounds": 64 },
  "climate": { "lapsePerLevel": 0.06, "snowBelow": 0.30 },
  "levelDensity": { "0": 1, "1": 0.85, "2": 0.5 },
  "habitat": { "tags": { "tree": [0, 1], "plant": [0, 1], "stone": [0, 1, 2], "boulder": [0, 1, 2], "ore": [0, 1, 2], "mineral": [0, 1, 2], "gem": [0, 1, 2] }, "ids": { "pine": [0, 1, 2], "lichen": [0, 1, 2], "reeds": [0] } },
  "faceOutcrops": { "ironstone": 0.03, "copper_outcrop": 0.015, "gold_outcrop": { "chance": 0.004, "levels": [2] }, "crystal": { "chance": 0.005, "levels": [2] } },
  "caveMouths": { "max": 1, "tunnel": [3, 8] },
  "look": {
    "a4": { "sheet": "UF_GenTerrain_A4", "compose": { "0": ["Outside_A4", 36], "8": ["Outside_A4", 44], "1": ["Outside_A4", 38], "9": ["Outside_A4", 46], "2": ["Outside_A4", 37], "10": ["Outside_A4", 45], "3": ["Outside_A4", 39], "11": ["Outside_A4", 47], "4": ["Dungeon_A4", 37], "12": ["Dungeon_A4", 45], "5": ["Dungeon_A4", 2], "13": ["Dungeon_A4", 10], "6": ["Dungeon_A4", 0], "14": ["Dungeon_A4", 8], "7": ["Dungeon_A4", 1], "15": ["Dungeon_A4", 9], "16": ["Dungeon_A4", 3], "24": ["Dungeon_A4", 11], "25": ["Dungeon_A4", 43], "26": ["Dungeon_A4", 13] } },
    "topOfGround": { "meadow": 0, "tropical_grass": 0, "blessed_grass": 0, "cursed_grass": 0, "forest_floor": 0, "needle_floor": 0, "jungle_floor": 0, "dry_grass": 1, "shrub_soil": 1, "tundra": 1, "dirt": 1, "red_clay": 1, "mud": 1, "swamp_mud": 1, "sand": 2, "snow": 3, "ice": 3, "stony": 4, "rock": 4, "peak_rock": 4, "scree": 4, "ash": 5 },
    "faceOfTop": { "0": 8, "1": 9, "2": 10, "3": 11, "4": 12, "5": 13, "6": 14, "7": 15, "16": 24 }, "stoneFace": 12,
    "stairs": { "8": [1584, 1585, 1586, 1587], "9": [1592, 1593, 1594, 1595], "10": [1588, 1589, 1590, 1591], "11": [1596, 1597, 1598, 1599], "stone": [1604, 1605, 1606, 1607] },
    "caveMouth": { "upper": 374, "lower": 382 },
    "d": { "sheet": "UF_GenTerrain_D", "shade": [513, 514], "waterBelow": 515, "covered": 516, "slope": { "N": 517, "E": 518, "S": 519, "W": 520 }, "caveMouthRange": [528, 543] }
  }
}
```

`campLow` and `startFlat` are measured from the start cell (T10), not from a camp. The key keeps its first-draft name.

`tilesets.surface` gains `"A4": "UF_GenTerrain_A4", "A5": "Outside_A5", "D": "UF_GenTerrain_D"`. When Gemini's `UF_Terrain_A4.png` is checked, `terrain.look.a4.sheet` points at it and `compose` is removed. The D sheet works the same way.

---

## 11. Checks (suite `terrain`, plus the regression suites)
Each check follows ENGINE_RULES §6 and has a provocation `UF_TEST_PROVOKE=terrain.<check>`, read only in `--uf-test` runs (the `UF_World.js:666-676` pattern). The implementing run quotes each provoked FAIL line in its report. Tests use the fixed test seed (ENGINE_RULES §6). **Where each provocation acts matters.** Several of the first-draft provocations would have been undone by a later generation step (the repair re-adds slopes, the start disc's force-low flattens a bump, the small-region pass deletes lone spikes), or would not bite on a seed where no river crosses high ground (the median seed, §5). Each provocation below names the point where it is injected, so it bites on every seed.

| Check | Required observation | Provoked to FAIL by (injection point) |
|---|---|---|
| `terrain.stacked` | For every cell of `z=0/+1/+2`: (a) a natural `floor` or `ramp` at z ≥ 1 has natural `solid` at z − 1; (b) a `solid` at z has `solid` at every lower surface level (natural cells); (c) every cell with `S > 0` is `solid` at `z=0`; (d) every natural `floor` or `ramp` cell's drawn tiles are passable (`tileBits` ≠ 0), so no `peak_rock` or other blocking floor sits on a walkable cell (§2.4). Detail: counts per level and the first offending cell. | (a) marking one `S=0` cell `floor` on the `+1` baseline after the baselines are built (a floating floor); (d) painting one `+2` rim cell with the `peak_rock` A2 id after the `+2` map build |
| `terrain.slopes_connect` | (a) Every natural ramp is a valid build-plan §6.1 edge: it leans on `solid` (never on crag), exits onto a walkable cell one level up, and has open headroom. (b) A BFS from the start cell (§4.3; water passable for this check) reaches every surface region except the listed locked ones and crags. (c) Every locked region is at most `lockMaxArea` cells and at `+2`. (d) The connector graph has one end pair per ramp run (§4.1). Detail: regions per level, slopes, runs, locked, unreached. | removing every slope of the largest raised region **after the repair pass**, on the grid copy the check reads, which must FAIL naming it; for (a), turning one ramp's lean toward a floor cell after the repair |
| `terrain.mountains_have_resources` | Every `+2` region of at least `topup.minArea` (150) cells has at least max(1, area / 400) ore sources (face outcrops or floor ore objects) whose stand the BFS reaches, and at least max(3, area / 100) stone sources (boulders, loose rocks, crag). The world has at least one gold source and one gem source on `+2` or on `+2` faces (veins count once slice 4 adds them). Detail: per region, and the top-up log. | skipping the top-up **and** setting `faceOutcrops`, `summitBlend` and the mountain ore densities to 0 in a snapshot catalog |
| `terrain.rivers_low` | Every water cell (ocean, lake, river, pond) has `S = 0`. Every river cell has a walkable `z=0` bank within 1 cell. No cell within Chebyshev distance `valley.bank` of river water is raised, and no cell within `lakeShore` / `pondShore` of a lake or the pond. No A1 tile id appears on the `+1/+2` maps. | skipping the river force-low **and** adding 0.4 to `T` along the first river's cells before thresholding, so the river climbs onto raised land on every seed |
| `terrain.deterministic` | Two cold builds of the grid for the current seed give the same checksum. Seed + 1 gives a different one. Two pristine builds of the `+1` map give the same tile-and-object hash. | adding `Math.random()` to the relief |
| `terrain.gen_time` | Terrain grid including its fields pass ≤ 300 ms (median of 3 cold builds), each `+1/+2` map build ≤ 600 ms, ground build ≤ 1500 ms, New Game additions ≤ 500 ms (D-T6). The detail prints the method: median of 3, `performance.now()`, the machine, and the CPU load read before the run. | a 400 ms busy wait in the grid build |
| `terrain.no_spikes` | Every raised cell lies in a 2×2 block at its level or higher. No raised region is smaller than `minArea`. No crag touches a non-`+2` cell within `cragInset`. | skipping the opening pass **and** raising a 1×3 strip of cells on the ground 80 cells from the start cell after smoothing (the small-region pass alone removes lone spikes, so skipping the opening may leave nothing to find) |
| `terrain.coverage` | Raised land ≥ `floor.raised` of land, or the floor was applied and recorded. At least one `+2` region of at least 60 cells. The massif was added when needed. Detail: shares, thresholds, massif. | a flat fixture: `relief.amplitude` 0, elevation clamped to 0.6 before `T`, `floor.high` 0 and `massif.minShare` 0 |
| `terrain.start_usable` (V67, V4) | The player's camp and its 8 founder cells are at level 0. Every faction camp has level 0 on its `clearDisc` and `kitRingOk` true. Every kit object counted by `kit_present` has a stand reachable from its campfire over `z=0` land. No raised cell lies within `campLow` of the start cell. | a bump of +0.4 on `T` at the start cell **with the start disc's force-low skipped** |
| `terrain.save_small` (V50) | A New Game save's `state.terrain` serializes to at most 1 KB and holds no per-cell array. The save loads back with a matching checksum. | storing the `S` grid in `state.terrain` |
| `terrain.draw` (screenshot `terrain.draw.png`) | On a fixture hill at `z=0` (a 12×10 `+1` hill with a north slope and a 4×4 `+2` cap, swapped in for one pristine build the way `pristineBuild` swaps state, `UF_WorldGen.js:909-913`): the face cells hold A4 face ids of the expected slot and are impassable. The top above them holds top ids with the rim shape along the face. A north slope's face cell holds the A5 stairs id and the ramp cell in front is walkable. On `+1`, a cell over low ground holds D1 on layer 1 and is impassable, with a hanging face on layer 2 below the edge. On `+2`, the terrace's hanging face shows on layer 3. Water below shows D3, never A1. The screenshot is opened and described. | drawing faces as tops (the tile-kind assertion fails) |

**Regression:** `tiles` (updated for the new slot names: `tileset_names` compares A4, A5 and D too; `flags` keeps testing `peak_rock` for gen-0 saves), `worldgen` (the kit checks unchanged; `glade_clear` still passes), `biomes`, `factions`, `vertical` and `vertical_routes` (natural ramps become connector fixtures), `world`, `spawn`, and `wildlife` (spawns stay on level-0 cells through `walkable`).

---

## 12. Dependencies and files

### 12.1 What it depends on (other runs, 2026-09-19 STATUS "In progress")
- **Five-level world engine, slices V1–V2** (`UF_Levels.js`, the z seam in `UF_World.js`, z passes in `UF_Objects`, `UF_Items`, `UF_Jobs`, `UF_Look`, `UF_Interact`; `VERTICAL_BUILD_PLAN.md`): baselines, shape API, one map per level, view switching, connector graph and routes, save v4. **This design is built after V1 and V2 land (VISION decision log, 2026-09-19 13:57).** Changes it asks of that plan: `+1/+2` use tileset 91, not 92 (plan §3.2, D4); **`levels.tiles` gets a table per tileset**, because the plan's `+1/+2` ids 1552 and 1536 are Dungeon_A5 tiles that mean "Meadow A" and "Darkness" on tileset 91's Outside_A5 (§7.1); the ground baseline comes from `S`, not "floor everywhere" (§2.3); `+1/+2` baselines come from `S`, not "every cell open" (§5.6); natural ramps join the connector graph (§6.3) **as one end pair per ramp run**, because the graph's "tens to low hundreds of ends" assumption no longer holds (median 435 ramp cells per world, §4.1); `levels[0..2].gen` follows `terrain.gen` (§9.1); and AR-1206 (open air, "every open cell on `+1/+2`") is re-scoped to `-1/-2` (§14).
- **Slice V3** (dig and build): digging into hills and mountains needs `excavate` on natural `solid` at z ≥ 0, not only on `-1/-2` (plan §7.1). Yields by material (§3.2). Until V3 lands, faces yield only through outcrop objects.
- **UF_Select** (drag designations): designations on the viewed level cover hill faces and hilltops unchanged (V86).
- **UF_Wildlife / UF_Ecology** (DF creature AI run; ecology run): creatures on `+1/+2` floors need spawning there and movement profiles that use natural ramps. The build plan keeps wildlife on the ground until slice 4. **Known gap:** hills have no animals until then.
- **UF_Roads** ("Paths and DF life" run): roads must skip raised cells and cross levels only on slopes. Owner change: one test on `WorldGen.cellInfo(...).level` where road cells are chosen.
- **UF_Floors** (Codex's file per STATUS) **and ground-painting construction**: a built floor or any layer-0 write at `z=0` must refuse solid cells, or it makes a cliff walkable (§7.6). Owner change: one test on `UF.Levels.shapeAt(...)`.
- **UF_Factions** ("Faction menu skins" run, merged with the peoples run): one owner change, `discOk` also calls `WorldGen.kitRingOk` (§8). `factions.areas` then asserts level-0 discs through `walkable`. Mountain peoples lose their `mountain` preference in practice (§8, D-T4).
- **Rolling ground colours** (V93 run, `UF_Tiles.js` and tileset 91 at the same time): the two runs edit the same `registerTileset` and flag table and must merge. The A4 tops don't take V93's shades until Gemini's art does, so a shaded meadow meets a flat stock ledge top. V93's kind-to-kind blending must also treat a raised cell as "different" (§7.3 rule 1).
- **UF_Ecology** (DF mechanics run): renewable regrowth at `z=0` must skip `S > 0` cells, as the plant pass does (§6.1). Its `(z, biomeRegion)` buckets gain `+1/+2` floors.
- **UF_Tech / UF_Skills** (V84): the mining level required to work a face outcrop is the object's existing rule.
- **Codex:** `VERTICAL_WORLD.md` §1 (the `+1/+2` rows), §1.1 (first bullet), §4.1 (step 2), §4.2 (last bullet), §4.3 (trees rooted on `+1/+2`, §6.3 here) and §8 (the always-on shaded lower level, §7.7 here), and `RESOURCE_ATLAS.md` §2 (the `+1/+2` rows and "most cells begin as open air"), §2.1 step 3 and §3.4 need V91's text: real terrain on `+1/+2` where hills stand, open air over low ground only.

### 12.2 Files the build will touch (later, not in this task)
`game/js/plugins/UF_WorldGen.js` (grid, `cellInfo`, `kitRingOk`, `peak_rock` retirement for gen ≥ 1, top-up, the upper generator, suite `terrain`), `UF_Levels.js`, `UF_Tiles.js` (including the boot preload of the two A4 source sheets), and small `UF_Look.js` texts through the build plan's hooks. By owner request only: one line each in `UF_Factions.js`, `UF_Roads.js` and `UF_Floors.js` (§12.1). `game/data/UF_WorldCatalog.json`: the new `terrain` section and `tilesets.surface` names, never the `objects` list. `docs/systems/UF_WorldGen.md`, `UF_Tiles.md`, `UF_Levels.md`. `docs/ASSET_REQUESTS.md` (the rows in §14). New `docs/handoffs/HANDOFF_terrain.md`. `docs/STATUS.md`. No engine-core file (AGENTS rule 9). `game/data` and `game/js/plugins.js` change only with the RMMZ editor closed (AGENTS, RMMZ editor safety).

This task wrote only `docs/design/TERRAIN_LEVELS.md`. The critic review edited only this file too. Its scripts and renders are in the session scratchpad under `critic_terrain/`.

---

## 13. Tuning knobs, in words
- More or fewer hills: `relief.amplitude` (0.30 → 15.7 % raised, 0.45 → 23.3 %), `hillLevel`.
- More mountain: `floor.high` (the guaranteed `+2` share), `massif`.
- More walkable or more cliff-bound hills: `slopes.below`, `slopes.perimeterPerSlope`, `slopes.lockChance`.
- Snowier peaks: `climate.snowBelow`, `climate.lapsePerLevel`.
- Wide valleys through ranges instead of gorges: `valley.inMountains` (§5).
- Ore and stone on non-mountain summits: `summitBlend`; the guaranteed minimum: `topup` (§6.2).
- Room round other factions' camps: `kitRingMin` (§8).
- Every change bumps `terrain.gen`.

---

## 14. Asset requests for Gemini (proposed rows; numbers are proposals, and the build run takes the next free block when it writes `docs/ASSET_REQUESTS.md`)
Common rules: ART_STANDARD §1 and §5 (HD FF6 style, flat 3/4 view, 48 px grid, palette `art/palette/uf.hex`, alpha 0 or 255, no pure black, Nano Banana 4× raws on `#FF00FF`, `tools/art_check.js --native`, `tools/originality_check.js`, the user's approval). Formats are those of `RMMZ_ASSET_SPEC.md` §3, **except A4, which is 768×720** (measured). **Finding for the spec's owner:** `RMMZ_ASSET_SPEC.md` §3 lists A4 as 768×576. The stock sheets measure 768×720 (§1.1), and any A4 drawn to the spec as written will be the wrong size. Every stock tile used in §1.2 is named below as the placeholder to replace (CLAUDE.md).

| ID (proposal) | Asset | Format and slots | Replaces the stock placeholder |
|---|---|---|---|
| AR-1400 | **Cliff tops by ground family:** grass, dry earth, sand, snow, bare rock, ash, bare earth, crag, ice. Each is the ground seen from above-front with a lip where it ends at an edge, matching AR-100's ground tile of the same kind. **The rock, ash, bare-earth, crag and ice tops need a lip as clear as the grass ledge's.** Their stock placeholders (Dungeon_A4) have only a thin outline (§1.2), which reads close to the rejected rimless mock. | `UF_Terrain_A4.png`, A4 768×720, top kinds 0–7 and 16 (96×144 each, floor-type layout). All 47 shapes must look right. 4× raw per kind 384×576. | Outside_A4 36, 37, 38, 39; Dungeon_A4 37, 2, 0, 1, 3 (tops) |
| AR-1401 | **Cliff faces by material:** earth with a grassy foot, dry earth, sandstone, frost rock, grey rock, volcanic rock, striated earth, dark rock, ice; optional gold-flecked and crystal-studded rock. The face must tile vertically for two-row drops. | same sheet, face kinds 8–15, 24–26 (96×96 each, wall-type layout, 16 shapes). 4× raw 384×384. | Outside_A4 44, 45, 46, 47; Dungeon_A4 45, 10, 8, 9, 11, 43, 13 (faces) |
| AR-1402 | **Slopes:** stairs cut into a face for each face family (Left, Center, Right, single), and slope tiles climbing east, west and south for the grass, dry, sand, snow and rock families. Walkable-looking and treadless, so they differ from built stairs (AR-1208 to AR-1210). | `UF_Terrain_A5.png`, A5 384×768, 48×48 static tiles; slot map in the handoff | Outside_A5 48–63, 68–71; D markers 517–520 (code-drawn) |
| AR-1403 | **Open-air shade, one and two levels down, water below, covered floor:** dither patterns (alpha 0/255) that darken what lies below without hiding it, readable at zoom ⅓. | `UF_Terrain_D.png`, 768×768 B-type layout, tiles 1–4 | `UF_GenTerrain_D` 513–516 (code-drawn) |
| AR-1404 | **Cave mouth in a cliff face**, one-row and two-row versions, per rock and earth face family. The opening is dark palette blue, not black. | tiles 16–31 of `UF_Terrain_D.png` (the AR-1403 sheet), 48×48, transparent round the opening. The first draft asked for a new B sheet, but tileset 91's B slot is Outside_B, which the build plan uses for stairs and holes (B 1, 9, 42, 44). | Outside_C 118 / 126 |
| AR-1405 | **Ore and gem outcrops set into a cliff face** (iron, copper, gold, gem cluster): drawn onto a vertical face with no ground shadow, for the face-outcrop objects. | 48×48 object sprites, AR-600 sidecar, `!$UF_FaceOre_<kind>.png` | the existing `ironstone`, `copper_outcrop`, `gold_outcrop`, `crystal` sprites |
| AR-1406 | **Snowy boulder and loose rocks** for `+2` summits (optional). | 48×48 object sprites | Outside_B 223, 227, 231 |

**Overlap with the five-level run's requests:** AR-1206 "Open air" (`UF_Levels_A2.png` kind 5) is scoped to "every `open` cell on `+1`/`+2`". Under V91, `+1/+2` use tileset 91 and the §7.3 open-air rule, so AR-1403 replaces AR-1206 there, and AR-1206 keeps only the open cells and holes of `-1/-2` on tileset 92. AR-1206 also asks for "about 50 % opacity", while ART_STANDARD F5 allows alpha 0 or 255 only, so AR-1403 uses a dither. The build run updates AR-1206's row when it adds these.

**How they plug in without code (the handoff):** `terrain.look` in `UF_WorldCatalog.json` (Claude-owned) maps every slot to `{ sheet, kind | tile }`. The placeholders are the stock blocks above, composed at boot. After a delivery is checked, Claude Code points `terrain.look.a4.sheet` (or `stairs`, `d`, `caveMouth`) at the new sheet. Face outcrop sprites are the `image` of new catalog object variants, added through the `objects` list (Gemini's, per `HANDOFF_world_generation.md`) and referenced in `terrain.faceOutcrops`. `docs/handoffs/HANDOFF_terrain.md` gets written when the rows are added, with the slot maps, the review renders to produce (a hill, a mesa and a snowcap on the three views, like the §7.9 mocks), prompts, and the readability test: a top, a face, a slope, a cliff and open air are distinct at 1× and at zoom ⅓.

---

## 15. Risks and decisions needed
- **D-T1 (user):** the proposed amounts: median ~20 % of land raised and ~3 % at `+2`, with a `+2` massif guaranteed (§2.6). More mountains need `floor.high` raised, or a smaller start-climate radius, which moves biomes too. Also: rivers cross ranges in narrow gorges (proposed, as modelled), or in wide valleys (`valley.inMountains`, §5).
- **D-T2 (user):** one-level rendering hides the objects and people on hilltops from the ground view, and the trees, units and items of the lowland from `+1/+2` (§7.7). (A) keep the strict rule (proposed for the first build), or (B) draw the objects one level away as non-interactive scenery.
- **D-T3 (user):** slope frequency. About 27 % of level edges are slopes, and mountains are mostly cliffs with passes. DF would ramp almost every step.
- **D-T4 (user):** camps on `z=0` only (proposed), or plateau camps allowed later. **Consequence found by the critic run:** dwarves, gnomes and automatons list `mountain` among their preferred biomes, and no `z=0` camp spot is ever mountain biome after V91 (0 in 40 of 40 seeds, against a median of 80 before, §8). With (A) they settle in their other preferred biomes and lose the mountain flavour. (B) plateau camps would give it back, but they need z-aware kit, faction and founder placement (V4, V67).
- **D-T5 (user):** the proposed words (Hill, Mountain, Slope, Cliff, Rock face, Crag, Snowcap, Cave mouth, Drop) and the Look texts in §7.8.
- **D-T6 (user):** the budget proposals in §9.4: 300 ms for the grid including its fields pass (raised from the first draft's 150 ms, which left the fields out), 600 ms per upper-level build, 500 ms of New Game additions (was 400 ms).
- **D-T7 (user):** building up on raised land. V80 keeps `+1/+2` for "towers and multi-storey construction". On a `+1` hilltop only one storey fits above the ground, and on a `+2` summit none, because there is no `+3`. A fifth of the land (median) then can't take a two-storey building. (A) accept it (proposed: hills and mountains are for their resources and views), or (B) record it as a known limit of the five-level stack.
- **Risk:** composing a runtime A4 mixes two stock art sets. The mock shows the golden Outside faces beside the grey Dungeon rock. It reads, but it is visibly two styles until AR-1400/1401 arrive.
- **Risk:** the view switch becomes routine, because a fifth of the land is on `+1/+2`. The build plan's switch latency (cold ≤ 1500 ms, warm ≤ 250 ms proposed) matters more, and so does the autosave-on-transfer decision (plan D-3).
- **Risk:** Wildlife and Combat pause while a non-ground level is shown (plan §5.4). With V91, players will look at `+1` often.
- **Risk:** the model's numbers come from Node with copies of the field functions. The RMMZ build must re-measure (§11) before anything here is called working. The critic compared the model's `fieldsFor`, `isLake` and `riverModels` with `UF_WorldGen.js:265-300` and `334-369` line by line. The formulas match, and the model leaves out only volcanism, savagery, alignment and salinity, which `S` doesn't use. That is still a reading, not a run of both. The model also has three known gaps: a horizontal river distance, a one-cell lake shore and no pond (§2.1, §2.2).
- **Risk:** Node timings moved by about 3× with machine load during this review (§9.4). `terrain.gen_time` in RMMZ is the only number that counts.
- **Risk:** the mountain-family tops (Dungeon_A4) have no rim, so `+2` rock reads flatter than the grassy terraces until AR-1400 arrives (§1.2).
- **Risk:** `RMMZ_ASSET_SPEC.md` gives the wrong A4 size (§14). Gemini works from that file.
