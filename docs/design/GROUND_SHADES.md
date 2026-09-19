# Ground shades: rolling earth colours across the terrain (design)

**Status:** design only, written 2026-09-19 by Claude Code. Nothing described here is built.
**Implements:** VISION V93 (user, 2026-09-19 14:09: "I want a larger gradient of earth colors/shades across the terrain. I want rolling terrain types/colors").
**Constrained by:** V2 and ART_STANDARD F1–F5 (pixel art, discrete tones, palette `art/palette/uf.hex`, alpha 0 or 255, no blur, no gradients inside a sprite), V27/V30 (biomes from DF-style fields), V50 (the map builds in ≤ 1.5 s, no per-frame cost, small saves), V80/V91 and `docs/design/TERRAIN_LEVELS.md` (five levels; `z=0`, `+1`, `+2` share tileset 91), `docs/RMMZ_ASSET_SPEC.md` (A2 autotiles).
**Owner of the build:** Claude Code (claim in `docs/STATUS.md`, "Rolling ground colours"). Files: `UF_Tiles.js` (new section), catalog key `groundShades`, two lines in `UF_WorldGen.js`, `docs/systems/UF_Tiles.md`.

---

## 0. The decisions in one table

| # | Decision | Why (from the code) |
|---|---|---|
| S1 | **Shades are opaque tiles on map layer 1**, drawn from a code-generated **E sheet** (`UF_GenShade_E`, tile ids 768–1023). Layer 0 keeps the ground kind's A2 autotile, unchanged, for every system that reads it. | The A2 sheet has 32 slots and 26 are used (`catalog.groundKinds`), so shades can't be A2 kinds. A2 indices are saved in `state.diffs` (UF_Floors `setGround`, UF_Fire), so the A2 order can't change. Layer 0 is read as "the ground kind" by UF_Floors (`kindAt`, line 57), UF_Fire (line 295), UF_Look (line 259) and UF_WorldGen's checks. Layers 1–3 are empty on the ground map today (probe: 0/0/0 non-zero cells). TERRAIN_LEVELS §7.6 uses layer 1 only on open-air cells, and D for its markers. |
| S2 | **A shade tile is keyed by its four corners**, not by its cell. Every cell corner of the map has one step value, and neighbouring cells share their corners. A tile shows the one or two steps its corners hold, split along a lightly dithered contour. | Shared corners make the contour continuous across cell edges, so two shades of one kind never meet at a hard, cell-aligned border. No autotile shape is involved, so RMMZ draws no outline between shades. |
| S3 | **Kinds come in families that share one ramp of steps** (grass: lush → straw; soil: loam → pale sand; stone: gravel → dark rock; and so on). Each kind is a window on its family's ramp. Inside a family, layer 0 joins kinds (no outline) and the shade tiles blend them. | "Neighbouring kinds blend into each other" (V93). Meadow next to dry grass becomes a colour step on one ramp instead of an outlined border. |
| S4 | **The step comes from a "dryness" field**: seeded low-frequency noise (scale 24 cells, with a detail octave at 10) plus the raw rainfall, drainage and elevation fields, plus lush banks near water. The field isn't blended toward the start climate. Steps are chosen by per-kind quantiles, so each kind shows its whole window on every seed. | Within 28 cells of the start every field equals `climate.startClimate` (`UF_WorldGen.js` `fieldsFor`, lines 280–292), which is why the start is one flat meadow (screenshots in §1). A prototype on 3 seeds gave patches averaging 100–220 cells, 0.3–0.7 % of cells in patches under 4 cells, and 4 meadow shades in the start view at zoom 1 and ⅓ (§5.4). |
| S5 | **Borders between families** get blend tiles (a "pair" tile set per bordering pair of steps) while the atlas has room. Otherwise the cell keeps its layer-0 A2 edge (a "rim"). Water, built ground (roads, floors), rock faces and drops keep their own edges. | E has 256 tiles. The prototype used 170–222 step tiles per map, so pairs must be rationed. |
| S6 | **Every colour is a `uf.hex` entry**: 89 entries, listed in §9. The generated A2 sheet is snapped to the palette at paint time. | Today the code-drawn ground is off-palette: 0 of its 130 catalog colours are palette entries (nearest ΔE 2.5–20). |
| S7 | **Gemini's ground art is the texture of the steps it belongs to.** Other steps are recoloured from it by a lightness-rank transplant into the step's palette ramp. There are no shade-set asset requests. | One delivered block per kind (AR-100) is enough. Every output pixel is a palette entry by construction. |
| S8 | **Derived, never saved.** Layer 1 is written straight into the built map, never through `UF.World.setTile`, so `state.diffs` never holds it. Live ground changes update one cell. | V50 (saves ≤ 3 MB). Old saves get shades on load. |

---

## 1. What the map does today (evidence, 2026-09-19)

A scratch probe suite (`UF_ZZ_GroundProbe`, scratchpad only, never in `game/`) ran on a snapshot copy of `game/` (`tools/test_snapshot.js --name gshade_probe --no-run`, then `tools/run_tests.js groundprobe`). Its `info_*` lines only carry measurements and can't fail, so they aren't checks. The screenshots below were opened and looked at. Copies are in the session scratchpad `gshade/shots/`, which is not committed.

| Screenshot (run of seed 1364211868) | What it shows |
|---|---|
| `groundprobe.start_zoom1.png` | The camp at zoom 1: the campfire, eight settlers, oaks, ferns, wheat. The ground is one flat mid-green with a fine speckle and a visible 48 px repeat. |
| `groundprobe.start_zoom13.png` | The same spot at zoom ⅓ (51 × 39 cells). Every land cell is the same meadow green. The pond has the stock lime-green A1 bank. |
| `groundprobe.border_zoom1.png` | The nearest kind border (meadow meets needle floor, at (162,162)). A diagonal staircase of whole cells, with a dark outline on both sides. |
| `groundprobe.border_zoom13.png` | The same border at ⅓: two flat colours, a hard staircase edge, and pines on the dark side. |

The first run (seed 125759190) looked the same. Its border screenshot showed meadow, then a one-cell staircase strip of needle floor, then leaf litter, all outlined.

**Facts from the code and the probe:**
- One area, 256 × 256 (`UF_World.md` §1), tileset 91. Slots: `["Outside_A1","UF_GenGround_A2","","","","Outside_B","Outside_C","",""]` (probe `info_seed`). TERRAIN_LEVELS §7.1 will fill A4 (`UF_GenTerrain_A4`), A5 (`Outside_A5`) and D (`UF_GenTerrain_D`, tiles 1–8). **E stays free.**
- Ground kinds on the two probed maps: needle floor 26–30 %, meadow 18–26 %, forest floor 11–15 %, tundra 6–9 %, and 6–9 further kinds. Land is 83 % of the map (`info_kinds`).
- The start is flat by construction: `fieldsFor` blends every field toward `startClimate` with weight 1 within 28 cells and to 0 at 110 cells. The nearest other kind was 34–37 cells from the camp on both runs (`info_border`).
- Kind borders: UF_WorldGen joins a cell only to neighbours of the same kind (`generate`, line 735). `paintBlock` draws a 1-native-pixel `edge` outline where the kind changes (`UF_Tiles.js` lines 116–126).
- Build time: `buildArea(0,0)` 253 ms and 319 ms on the two runs (`WorldGen.lastBuild.ms` 250 and 315), against the 1500 ms budget.
- Tilemap repaint (RMMZ `Tilemap._addAllSpots`, timed over 40 forced repaints): at zoom ⅓, median 0.380 ms and 0.350 ms with 8,692 lower-layer rects. **With one layer-1 tile on every land cell** it was 0.420 ms and 0.450 ms with 10,833–10,836 rects. At zoom 1, 0.045–0.065 ms both ways, 1,140 → 1,425 rects. RMMZ drops tiles silently past 2 × 16,000 rects per lower layer (`Tilemap.CombinedLayer` has 2 `Tilemap.Layer` children, `MAX_SIZE` 16,000).

---

## 2. Requirements

1. Each ground kind has several discrete shades. Grass gets 4–6 earth-tone steps from lush to dry. Soil (loam, dirt, sand), clay, moss, gravel and rock also get steps (V93, task brief).
2. Shades form broad rolling patches tens of cells across and follow moisture, soil, elevation and biome, never salt-and-pepper (V93).
3. No hard border between two shades of one kind, and neighbouring kinds blend (V93).
4. Pixel art: flat palette tones, contours clean or lightly dithered, no blur, no gradient inside a tile, alpha 0 or 255, palette only (F2, F5, V93).
5. No per-frame cost. The map builds in ≤ 1.5 s. Nothing new in the save (V50).
6. Seeded and deterministic: the same seed gives the same ground.
7. Works per level on the three surface levels (V80/V91, TERRAIN_LEVELS) and uses Gemini's ground art where it has been delivered (AR-100).
8. Never changes passability, and never hides stairs, holes, markers or units.

---

## 3. Options considered

| Option | Verdict | Reason |
|---|---|---|
| A. Each shade as its own A2 kind, joined for shapes | Rejected | 26 kinds × 4–6 shades against 6 free A2 slots. The A2 order is saved in diffs. |
| B. Overlay **autotiles** (A2/A3/A4 kinds with transparent dithered edges on layer 1, the RMMZ "field" trick) | Rejected | 47-shape slots: 6 free in A2. A4 is taken by TERRAIN_LEVELS. A3 has 32 wall-type kinds that ignore diagonals, so there are no inner corners. Nested shades would need one layer per step. |
| C. Swap layer 0 to the lower shade and put the upper shade on layer 1 | Rejected | Layer 0 would no longer be the cell's kind for UF_Floors, UF_Fire, UF_Look and the WorldGen checks. |
| D. Own ground renderer (native-resolution chunk bitmaps under the tilemap) | Rejected | 4096 × 4096 native pixels per level (64 MB RGBA) or chunk painting while scrolling (per-frame work). It replaces RMMZ's tile pipeline, which UF_Floors, UF_Roads, UF_Fire and TERRAIN_LEVELS all write to. |
| E. Cell-aligned shade tiles (one tile per cell and shade, plus 50 % mix tiles) | Rejected | Contours would be staircases of 48 px steps. Mix bands would be dithered gradients a whole cell wide, which is more dithering than F2 allows. |
| **F. Corner-keyed shade tiles on layer 1 (dual-grid style), families sharing ramps, blend tiles for family pairs** | **Chosen** | Fits in one free sheet slot (E), keeps layer 0 and every reader of it unchanged, draws curved contours with a 1–2 native-pixel dither, and costs nothing per frame (§12). |

---

## 4. Families, steps and windows: how many shades per kind

A **family** is an ordered ramp of **steps**. Each step has four palette tones (base, dark, light, accent, used by the texture exactly as the catalog `colors` are today) and a texture source. A **kind** in a family owns a **window** of steps and a **base step**. Its layer-0 A2 block is drawn in its base step, so a cell without a shade tile looks exactly like the base step (§6.4).

Step names are internal, used in docs and the catalog only. They are never shown to players (AGENTS rule 7 is not touched).

| Family (texture) | Steps, wettest or darkest → driest or palest | Kinds: window, base |
|---|---|---|
| grass (`grass`) | 0 lush · 1 deep lush · 2 meadow · 3 dry meadow · 4 khaki · 5 straw | tropical_grass 0–2, base 0 · **meadow 1–4, base 2** · dry_grass 3–5, base 5 |
| litter (`litter`) | 0 moss · 1 jungle litter · 2 damp litter · 3 leaf litter · 4 dry litter | jungle_floor 0–2, base 1 · forest_floor 2–4, base 3 |
| needles (`needles`) | 0 mossy needles · 1 needles · 2 brown needles | needle_floor 0–2, base 1 |
| soil (`dots`) | 0 loam · 1 dirt · 2 dry dirt · 3 scrub soil · 4 sandy soil · 5 sand · 6 pale sand | dirt 0–2, base 1 · shrub_soil 2–4, base 3 · sand 4–6, base 5 |
| clay (`stria`) | 0 dark clay · 1 red clay · 2 orange clay · 3 pale clay | red_clay 0–3, base 1 |
| stone (`cracks`) | 0 gravel · 1 stony · 2 scree · 3 rock · 4 dark rock | stony 0–2, base 1 · scree 1–3, base 2 · rock 2–4, base 3 |
| mud (`mud`) | 0 peat · 1 swamp mud · 2 mud · 3 dry mud | swamp_mud 0–2, base 1 · mud 1–3, base 2 |
| tundra (`dots`) | 0 tundra · 1 frosted tundra | tundra 0–1, base 0 |
| ash (`dots`) | 0 ash · 1 pale ash | ash 0–1, base 0 |
| snow (`snow`) | 0 shadowed snow · 1 snow | snow 0–1, base 1 |
| ice (`ice`) | 0 blue ice · 1 pale ice | ice 0–1, base 0 |
| blessed (`grass`) | 0 flowering · 1 pale flowering | blessed_grass 0–1, base 0 |
| cursed (`grass`) | 0 blighted · 1 grey blight | cursed_grass 0–1, base 0 |

- **Shades per kind:** meadow and red clay 4; tropical grass, dry grass, jungle floor, forest floor, needle floor, dirt, scrub soil, sand, stony, scree, rock, mud and swamp mud 3; tundra, ash, snow, ice, flowering grass and blighted grass 2.
- **Not shaded:** `peak_rock` (impassable: a shade tile has flag 0 and would open it, §8.2), `road`, `floor_wood`, `floor_stone`, `floor_rushes`. Built surfaces keep crisp edges. They are still snapped to the palette (§9.3).
- **"Loam", "moss" and "gravel" are steps, not new kinds.** New logical kinds would need A2 slots (6 free), biome rules, Look names and plant tables. As steps they only change how the ground looks.
- **Windows are hard inside a kind and soft at its edges.** A corner shared by two kinds of one family takes the overlap of their windows. When the windows don't overlap (tropical grass 0–2 next to dry grass 3–5), the corner takes the value next to both windows and the step change is spread over the next cells (§5.3).

---

## 5. The dryness field and how steps are chosen

### 5.1 The field, per cell corner
Corner `(gx, gy)` is the top-left corner of cell `(gx, gy)`. A 256 × 256 level has 257 × 257 corners. With `vn = UF.WorldGen.valueNoise` and new salts `0x5ade` / `0x5adf`, which no other field uses (WorldGen `SALT`, lines 52–56):

```
D(gx,gy) = 0.45 · vn(seed, 0x5ade, gx, gy, 24)            // rolling patches, ~24 cells
         + 0.20 · vn(seed, 0x5adf, gx, gy, 10)            // wobble on the patch edges
         + 0.20 · (1 − rain_raw)                          // wetter climate, lusher ground
         + 0.10 · drain_raw                               // well-drained, drier
         + 0.20 · max(0, elev_raw − 0.55)                 // high ground drier and stonier
         − 0.15 · smoothstep(6, 0, water_distance)        // lush banks within 6 cells of water
         + 0.08 · z                                        // +1 and +2 hilltops a little drier (§11.3)
```

`rain_raw`, `drain_raw` and `elev_raw` are the WorldGen noises for rainfall (salt 0x2a1f, scale 130, with the 0x9d37 detail octave at 25 %), drainage (0x4d4a, 90) and elevation (0x1e11, 150), taken **before** the start blend and the continent mask. The start therefore rolls like everywhere else, while its biome stays the habitable one `startClimate` guarantees. The weights live in the catalog (§14.2).

**Temperature is left out on purpose.** It already picks the kind (tundra, needles, savanna). As a shade term, its north–south gradient would draw east–west stripes instead of rolling patches.

**Biome** acts through the kind: the kind's family, window and share table. Two kinds of one biome swap (cursed, blessed) the same way.

### 5.2 Quantising: per-kind shares
Each kind has a share table over its window in the catalog, for example meadow `[0.20, 0.35, 0.30, 0.15]` for steps 1–4, which keeps the base step the most common. On the first surface build of a world, UF_Tiles takes the corners owned by each kind (§6.1) on all three surface levels, sorts their `D`, and sets the thresholds at those quantiles. A corner's step = window low + the quantile band its `D` falls in.

This guarantees every kind shows its whole window on every seed, so a wet world is not all one lush step. The climate terms still decide *where* each step lies: lush by water, dry on high ground.

### 5.3 Making corners consistent
1. **Ownership.** Each corner is owned by the family with most of its (up to 4) shaded cells. Ties go to the family listed first in the catalog. Its kind is that family's most common kind there, with ties to the lower kind index.
2. **Pins.** A corner touching a rim cell or a pair cell (§7) of its owner family is pinned to that kind's base step. The shade tiles beside a rim then meet the rim's layer-0 look exactly.
3. **Lipschitz closure.** Two raster passes (forward with the NW, N, NE, W neighbours, backward with the SE, S, SW, E ones) apply `v(p) = min(v(p), v(q) + 1)` between corners of one family, with pins held as sources. Afterwards neighbouring corners differ by at most one step, so every tile needs only one pair of steps. In the prototype no tile was left with a corner range above 1 on 3 seeds, after 150–600 fixes.
4. **Islands.** A corner whose 8 neighbours all hold another step of the same family takes their majority step. This removes single-corner specks.

Pins that conflict (two pins further apart in step than in distance) are counted as `pinConflicts`. Check `ground.no_hard_seams` allows fewer than 0.1 % of shade cells with one.

### 5.4 Evidence from the prototype
A second scratch suite (`UF_ZZ_ShadeProto`, scratchpad only) ran this field, windows, closure and cell statistics on the real built map. The "cell shade" is the majority step of the cell's corners, and a patch is 4-connected cells of one kind and shade.

| Seed | Main scale | Patches: mean cells | Cells in patches < 4 | Steps shown (≥ 1 % of a kind's cells) | Meadow within 30 cells of the start | Start view zoom 1 / ⅓ (steps ≥ 5 %) | Tile keys used |
|---|---|---|---|---|---|---|---|
| 570757480 | 40 (first try) | 219.7 | 0.28 % | meadow 1234, forest 234, needles 012, dry 234, tropical 12 | steps 1–4, but 60 % on step 4 | (not measured) | 170 |
| 1154599349 | 24 | 147.0 | 0.34 % | meadow 1234, dry 2345, tropical 0123, forest 234, needles 012 | 4 steps | 4 / 4 | 183 |
| 1648186346 | 24 | 100.1 | 0.69 % | meadow 1234, dry 12345, tropical 012, rock 234, needles 012 | 4 steps | 4 / 4 | 222 |

The earlier probe gave, for 5 equal-area steps over the whole map: white noise per cell, mean patch 1.6 cells with 77.9 % of cells in patches < 4. Value noise at scale 16 / 24 / 32 / 48 gave mean patches of 114 / 160 / 205 / 263 cells, with 0.09–0.22 % tiny. **The prototype used whole-map equal-area thresholds, not the per-kind shares of §5.2.** That is why a kind leaked outside its window where windows met, for example dry grass at steps 1–2. With scale 40 the start sat in one broad patch, and the zoom-1 mock was a single colour. That is why the design uses 24.

Mock renders from the prototype (not the game; opened and looked at): `shadeproto_seedA_start_mock_zoom13.png` shows the camp's 51 × 39 view with a khaki region, a dark lush region, meadow bands between them and a sage ring around the pond, with rounded, dithered contours. `shadeproto_seedB_start_mock_zoom13.png` shows a lush region around the pond and a khaki region to the east, with meadow steps only as narrow bands between them. The per-kind shares of §5.2 are meant to make the middle steps into patches. `shadeproto_seedA_start_mock_zoom1.png` shows diagonal bands of 4 steps with a thin dither line at each contour and an obvious 48 px texture repeat (§15, risk 3). `shadeproto_seedA_map_steps.png` shows the whole map at 2 px per cell: broad rolling patches in every family and no speckle.

---

## 6. Drawing the shade tiles (why there are no hard seams)

### 6.1 Which cells get a shade tile
On a surface level, a land cell gets a **shade tile** on layer 1 when:
- its layer-0 kind is a shaded kind (§4) and is still the kind of the pristine plan (§11.1),
- its 3 × 3 neighbourhood holds shaded cells of its own family only, ignoring water, roads, floors and `peak_rock`, which draw their own edges (§7), and
- no neighbour is open air or raised at this level (TERRAIN_LEVELS §7.3 needs the layer-0 outline to mark drops).

Otherwise it is a **pair cell** (§7.1) or a **rim cell** (§7.2).

### 6.2 The tile
Key = (family, low step s, 4-bit mask of which corners hold s + 1). Masks 0000 and 1111 are the pure tiles.
- **Texture.** Each native pixel takes its tone class (base, dark, light, accent) from the step's texture: UF_Tiles' `texel` pattern for code-drawn kinds, or the delivered art (§10). The colour comes from that step's tones. The texture is world-aligned, so the same pixel position gives the same tone class in every tile and only the colours change across a contour.
- **Which step each pixel shows.** Take the bilinear value of the four corner bits at the pixel's centre, on a **16 × 16 mask grid** (one mask cell = 3 × 3 screen pixels, the placeholder's pixel size). The pixel shows s + 1 where `v + (bayer4 − 0.5) · ditherBand > 0.5`. `bayer4` is the 4 × 4 ordered matrix indexed by the pixel's position in the tile; 48 is a multiple of 4, so the pattern is world-aligned. `ditherBand` = 0.15 by default, which gives a dither 1–2 mask cells wide. **0 gives clean contours** (catalog switch, decision in §15).
- **Organic contours (option, on by default).** Add `± 0.08` by tone class (dark −, light +) before the comparison, so the contour follows blades, pebbles and leaves instead of a straight line through the cell.
- **Pixel rules.** Every pixel is one of the step's palette tones and fully opaque. Scaling is nearest-neighbour: `imageSmoothingEnabled = false`, and the tilemap's internal textures are `NEAREST` (`rmmz_core.js` line 3197).

### 6.3 Why two shades of one kind never meet at a hard border
- Two cells that share an edge share its two corners, and the pixels along that edge depend only on those two corners. Both sides of the edge therefore draw the same contour position and the same dither phase.
- The closure keeps every tile to two adjacent steps, so no contour jumps two steps.
- Shades are not autotiles, so RMMZ never computes a "different neighbour" shape between two shades.
- **Layer 0 joins by family.** UF_Tiles exposes `joins(kindA, kindB)`: same family, or the same kind for unshaded kinds. UF_WorldGen's shape predicate (line 735) and its `autotile_shapes` check (line ~1215) call it, which is a two-line change. The post-build pass (§11.1) also reshapes shaded cells with it. Where a rim cell's layer 0 shows, it has no outline toward kinds of its own family.

### 6.4 Rims and pure base tiles
A rim cell shows its layer-0 A2 interior, drawn in its kind's base step with the same texture. The shade tiles around it are pinned to that base step (§5.3), so they match it pixel for pixel. A pure tile equal to the cell's own base step is left out (layer 1 = 0), which saves rects.

---

## 7. Borders between families, water, built ground and drops

### 7.1 Pair tiles (blends between families)
A cell whose 3 × 3 holds exactly two shaded families F and G (and no drop) is a **pair cell**, provided the atlas has room for its key. Each of its corners belongs to F or G (§5.3 ownership) and is pinned: F corners to the base step of F's kind there, G corners likewise. The catalog `groundShades.pairs` can override the steps per family pair, for example grass meets soil at "dry meadow" and "dry dirt".

Key = (F, step a, G, step b, 4-bit mask of G corners), drawn like §6.2 with F's texture on one side and G's on the other. The contour runs through the cells, not along their edges, so grass fades into litter along a curved, lightly dithered line.

The prototype counted the border cells per family pair. Seed 1648186346 had 22 pairs, and its largest were grass|needles 1255, grass|litter 618, grass|stone 500 and needles|tundra 415. The allocation takes pairs in order of border length (§8.1).

### 7.2 Rims (fallback)
A cell with three families in its 3 × 3, or whose pair got no atlas room, keeps its layer-0 A2 edge toward the other family. The edge stays 1 native pixel, but in the kind's own snapped `edge` tone instead of today's near-black lines, following F2's "dark selective outline … never plain black everywhere". A rim is also the rule next to open air and raised cells (TERRAIN §7.3: the outline marks the drop).

### 7.3 Water, built ground, rock faces
- **Water:** unchanged. WorldGen joins ground to the ground under water, and the A1 autotile draws the bank inside the water cell. Cells next to water get shade tiles, and the lush-bank term (§5.1) keeps them green beside the stock lime bank (AR-101 replaces it).
- **Roads, floors, peak_rock:** their own A2 edges, which are crisp built or rock edges drawn inside their own cells. Their neighbours keep shade tiles.
- **Raised cells (A4 tops and faces) and TERRAIN D markers:** never shaded. Raised cells aren't floors, and the markers sit on layer 2, above layer 1.

---

## 8. The atlas, flags and passability

### 8.1 The shade atlas (E sheet)
- `UF_GenShade_E`, 768 × 768, tile id 768 + i, painted at 1× (48 px). Code-drawn textures are sampled on the 16 px native grid and scaled 3×, so `tiles.pixel_grid_3x` still holds for them.
- **Contents: only the keys the world's surface plan uses.** It is built once per world at the first surface build, from all three surface levels together (§11.3), sorted in this order:
  1. step keys by family, catalog order, then low step, then mask
  2. pair keys by pair border length (descending), then key
- **Capacity 256.** The prototype used 170–222 step keys per map on `z=0` alone. If the keys don't fit, pair keys are dropped first (their cells become rims), then the rarest mixed keys (their cells show the nearest pure key). Both counts are logged (`UF.Tiles.shadeStats`) and checked (§13).
- **More room (needs the terrain run's agreement):** TERRAIN §7.4 uses D tiles 1–8. Reserving D 0–63 for terrain and giving D 64–255 (ids 576–767) to shades would raise capacity to 448. UF_Tiles would paint both parts into one `UF_GenTerrain_D` canvas. Until that is agreed, the design uses E only.
- **Why one atlas per world:** tileset 91 serves all three surface levels (TERRAIN T7). One atlas built from the whole surface keeps tile ids stable whichever level is built first, and a load rebuilds it the same way.

### 8.2 Flags
- In tileset 91, every shade id (and any D share) gets flag **0x0000**: walkable, no bush, no ladder, no counter, terrain tag 0. The editor's tileset 2 gives D/E ids 0x600 (measured: 511 of 512 ids), which UF_Tiles must override. **Never 0x10**: RMMZ draws a star tile above characters (`Tilemap._isHigherTile`, `rmmz_core.js` line 2638).
- RMMZ's `checkPassage` and UF_World's `tileBits` read layers top-down and stop at the first tile that isn't a star tile. A shade tile therefore decides passage for its cell. It is placed only on passable shaded kinds, whose A2 flags are already 0 (`registerTileset`, line 203), so passability doesn't change. `ground.passability_unchanged` proves it.
- Terrain tags and the bush/ladder/counter/damage flags still come from layer 0, because the shade tile's are 0 and `terrainTag` skips 0.
- Draw order: `_addSpot` draws layer 0, layer 1, the shadow, then layers 2 and 3 (`rmmz_core.js` lines 2448–2462). Stairs, holes, slope markers and hanging faces (layer 2) stay on top of the shades.

---

## 9. Palette entries (all from `art/palette/uf.hex`)

Checked by script on 2026-09-19: **89 distinct entries, none missing from the palette**. Tones are listed as base / dark / light / accent, with the palette line index in brackets on first use. These are the **first proposal**: the user approves the ramps from a swatch sheet at the review gate (§14, stage 1).

### 9.1 Shaded families
| Family | Steps (base / dark / light / accent) |
|---|---|
| grass | lush 189218(242) / 006D00(243) / 45B645(241) / 86D200(200) · deep lush 4D5D28(170) / 39451C(172) / 189218 / 45B645 · meadow 5D7139(169) / 4D5D28 / 71864D(168) / 8A9A61(167) · dry meadow 71864D / 5D7139 / 8A9A61 / B28210(8) · khaki 8A9A61 / 71864D / AA8659(138) / C69618(7) · straw C69618 / B28210 / DBAE20(6) / F3DF79(3) |
| litter | moss 415120(171) / 313D18(173) / 5D7139 / 7D4D18(141) · jungle litter 4D5D28 / 39451C / 71864D / 8A5D2D(140) · damp litter 553D31(114) / 3D2D24(115) / 6D4D3D(113) / 5D7139 · leaf litter 6D4D3D / 553D31 / 825D4D(112) / 9E5124(183) · dry litter 7D4D18 / 6D3D0C(142) / 8A5D2D / AE653D(182) |
| needles | mossy 415120 / 313D18 / 5D7139 / 5D350C(143) · needles 39451C / 283114(174) / 4D5D28 / 6D3D0C · brown 4D2D0C(144) / 3D240C(145) / 5D350C / 7D4D18 |
| soil | loam 4D2D0C / 3D240C / 5D350C / 415120 · dirt 8A5D2D / 6D3D0C / 9A7141(139) / 5D350C · dry dirt 9A7141 / 8A5D2D / AA8659 / 6D4D3D · scrub soil AA8659 / 9A7141 / BA9A71(137) / 5D7139 · sandy soil BA9A71 / AA8659 / CAB292(136) / 9E928A(153) · sand CAB292 / BA9A71 / DBCAB2(135) / F7E7A6(2) · pale sand DBCAB2 / CAB292 / EBE3D7(134) / F7E7A6 |
| clay | dark 8E3D0C(184) / 7D2D00(185) / 9E5124 / 612000(187) · red AE653D / 9E5124 / BE825D(181) / 7D2D00 · orange BE825D / AE653D / CE9A7D(180) / 9E5124 · pale CE9A7D / BE825D / DFBAA2(179) / AE653D |
| stone | gravel AEA29A(152) / 9E928A / BEB2AE(151) / 7D7169(155) · stony 9E928A / 7D7169 / AEA29A / 615551(157) · scree 6D615D(156) / 615551 / 7D7169 / 514945(158) · rock 7D7D7D(125) / 616161(127) / 8E8E8E(124) / 514945 · dark rock 616161 / 515151(128) / 6D6D6D(126) / 453D39(159) |
| mud | peat 352D24(221) / 241818(222) / 45352D(220) / 313D18 · swamp mud 45352D / 352D24 / 514139(219) / 39451C · mud 6D4D3D / 553D31 / 7D6559(216) / 415120 · dry mud 7D6559 / 6D554D(217) / 8E7565(215) / 6D4D3D |
| tundra | tundra 9EAE7D(166) / 8A9A61 / B6C29A(165) / CEC6BE(150) · frosted B6C29A / 9EAE7D / CAD7B6(164) / DFD7D2(149) |
| ash | ash 515151 / 454545(129) / 616161 / 6D2400(186) · pale 616161 / 515151 / 6D6D6D / 514945 |
| snow | shadowed DFDFDF(119) / CECEFF(195) / EFEFEF(118) / BEBEBE(121) · snow EFEFEF / DBDBFF(73) / FFFFFF(15) / CECECE(120) |
| ice | blue B2D7F3(225) / 71AEE7(226) / F3F3FF(192) / 6DB2E7(230) · pale F3F3FF / B2D7F3 / FFFFFF / CECEFF |
| blessed | flowering 45B645 / 189218 / 7DDF7D(240) / F7E7A6 · pale 71864D / 5D7139 / 9EAE7D / F3DF79 |
| cursed | blighted 7D7169 / 615551 / 8E8279(154) / 6D006D(95) · grey 6D615D / 514945 / 7D7169 / 610061(96) |

Base-tone lightness (CIELAB L*): grass 53 → 37 → 45 → 53 → 61 → 65; soil 22 → 82 in 7 steps; stone 67 → 41. Grass moves mostly in hue (green → sage → gold), so the patches read as colour, not light and shadow. Where delivered art exists, its own colours are the base step's tones: meadow 5D7139 / 4D5D28 / 71864D / 8A9A61, tropical 189218 / 006D00 / 45B645 / 86D200, dry C69618 / B28210 / DBAE20 / F3DF79, scrub AA8659 / 9A7141 / BA9A71 / 5D7139 (interior pixel counts in §10). The table already matches those.

### 9.2 Rim tones
Each kind's `edge`, snapped to the nearest palette entry.

### 9.3 Unshaded kinds, snapped at paint time
Nearest palette entry (CIELAB), computed 2026-09-19:
- road BA9A71 / 8E7565 / CAB292 / 6D4D3D, edge 6D4D3D
- peak_rock 515151 / 453D39 / 6D6D6D / 35312D(160), edge 181818(132)
- floor_wood 9A7141 / 653D10(253) / BE825D / 3D240C, edge 2D1C08(146)
- floor_stone 8E8E8E / 6D6D6D / AEAEAE(122) / 454545, edge 353535(130)
- floor_rushes AA8659 / 9A7141 / F7E7A6 / 6D4D3D, edge 553D31

The catalog keeps its original hex values, and the snap happens in `paintBlock`. This is the only change to how floors look. Their owner (floors run) sees a colour shift of ΔE ≤ 17.5 (floor_rushes' light tone).

---

## 10. Gemini's ground art: how it gets shades

- **Where it stands:** AR-100 batch 1 is delivered in `art/masters/` (meadow, tropical_grass, dry_grass, shrub_soil; 96 × 144 A2 blocks at 1×, palette-snapped) but not integrated. The game still uses `UF_GenGround_A2`, and `HANDOFF_sprites_batch1.md` allows compositing approved blocks over it. Batch 2 (forest, needle, jungle floor, tundra) is in progress. When a kind's block is integrated, UF_Tiles composites it into the A2 sheet, and it becomes the texture source of that kind's steps.
- **Step sources:** each step names a source kind (catalog `source`). By default a step uses the kind whose base it is; otherwise the nearest kind in its family that has delivered art; otherwise the code pattern. Examples: grass 0–1 from tropical_grass, 2–3 from meadow, 4–5 from dry_grass; soil 3–4 from shrub_soil.
- **Recolouring (lightness-rank transplant):** the source block's interior colours are sorted by L*. The most common one maps to the step's base; lighter ones to light and accent, in rank order; darker ones to dark. Extra colours go to the nearest-lightness tone of the step's own palette ramp. The map is injective where the step has enough tones and is **the identity for a step that is the source's own base step**, so rims and pure base tiles match the delivered art pixel for pixel. The output is palette-only by construction. Measured interiors: meadow 5D7139 1586 px, 71864D 653, 8A9A61 56, 4D5D28 9; dry grass C69618 1262, DBAE20 1025, B28210 10, F3DF79 7; tropical 189218 1751, 45B645 411, 86D200 99, 006D00 43; scrub AA8659 1866, BA9A71 233, 9A7141 93, plus green and grey specks.
- **No new asset requests for shades.** The build adds to AR-100's notes in `docs/ASSET_REQUESTS.md` and writes `docs/handoffs/HANDOFF_ground_shades.md`:
  1. Keep each kind's interior to 4–6 palette colours with one clear base.
  2. Take tones from palette ramps with at least 2 entries of headroom lighter and darker (the rows in `uf.hex` are lightness ramps).
  3. The interior tile must repeat at 48 px with no visible join.
  4. A2 edge quarters show only at rims and drops, so a plain 1-px edge in the kind's dark tone is enough.
  5. Batch 2 plugs in through `tilesets.surface` / the per-kind block list, with no code.
- **Review:** a Node tool (`tools/ground_shades_preview.js`, new) renders every family's steps, a transition strip and a pair strip at 1× and 4× on the person reference, for the user's approval. Derived art is still art (AGENTS rule 6).
- **Stock assets involved:** none new. The A1 water banks stay stock (AR-101, already listed).

---

## 11. Live changes, save, five levels

### 11.1 When the plan is made
The plan (corner steps, cell categories, keys) is computed from the **pristine** ground, meaning the generators' output before the start template and `state.diffs`:
- a generator registered last (order 990) snapshots the pristine layer-0 kind per cell into `map.ufShade`
- UF_Tiles wraps `UF.World.buildArea(...args)`, passing every argument through so the five-level signature `buildArea(ax, ay, z)` still works. After the original returns (diffs applied), the wrapper writes layer 1 from the plan and the *current* layer 0.

The rule for a cell: its shade tile appears only if its current layer-0 kind equals its pristine kind.

### 11.2 Live ground changes
- A `world:tileChanged` listener, on layer 0 only, recomputes the one cell's layer 1: the plan's key if the kind is the pristine one, else 0. A floor laid on meadow loses its shade tile, and ash from a fire shows as a burnt patch with its own edge. Removing the floor brings the tile back. Neighbours are untouched, because corners come from the pristine plan.
- The write goes to `$dataMap.data` and the peek-cache copy, followed by `tilemap.refresh()`. `UF.World.setDerivedTile` is used when UF_Levels provides it (VERTICAL_BUILD_PLAN seam S8). **It never goes through `setTile`**, so nothing reaches `state.diffs`.
- Cost: O(1) per change.

### 11.3 Save and the five levels
- **Save:** nothing new. The atlas, thresholds and plan are recomputed from the seed at load, and old saves gain shades.
- **Levels:** a column's ground is on exactly one surface level, its top (TERRAIN_LEVELS), so the three surface levels share **one surface plan**: one field (`+ 0.08 · z` for hilltops), one threshold table and one atlas. Each level's map writes layer 1 on its own floor cells.
  - Needed from the terrain run: per column, the top level and its ground kind (e.g. `UF.Levels.surfaceAt(gx, gy)` or the arrays behind it), including the snow rule on `+2`.
  - Until it lands, the surface is `z=0` only.
- **Open air on +1/+2 (proposal to the terrain run):** when an open cell copies "the tile view z − 1 would put on layer 0", copy the lower cell's top-most ground tile (its layer-1 shade tile if it has one, else its layer 0). The valley seen from a hill then keeps its shades under the D1/D2 dither. Both are opaque full tiles with flag 0, and the D1/D2 tile above still blocks.
- **Underground (−1, −2):** tileset 92 cave floors aren't in any family, so no shades until a cave family is designed.
- **Merge:** the five-level run edits `UF_Tiles.js` and `UF_World.js` now. This design adds its own section to `UF_Tiles.js` (the E sheet, `joins`, the plan, the `buildArea` wrapper, the listener, the `ground` suite) and touches `UF_World.js` not at all. The build follows the task's merge rule: snapshot, compare, re-apply, re-run.

---

## 12. Cost

| Item | Target | Evidence |
|---|---|---|
| Build time added (plan + layer 1 + atlas paint) | ≤ 80 ms median of 3 builds; total ground build still ≤ 1500 ms (today 253–319 ms) | The unoptimised prototype took **185–278 ms** (field 70–96 ms). It used `valueNoise` with its Map-based corner cache 6× per corner and made allocations per cell. The build will read lattice corners from typed arrays, reuse buffers and paint only used keys. If it still misses, it computes `D` on every second corner and interpolates bilinearly (every term's scale is ≥ 6 cells). **Not measured yet.** |
| Memory | about 3 MB | E canvas 768 × 768 × 4 = 2.25 MiB. Plan per surface level: corners 66 KB, pristine kinds 64 KB, keys 128 KB. **GPU: nothing extra**, because RMMZ allocates its 3 internal 2048² textures whatever sheets are loaded (`Tilemap.Renderer._createInternalTextures`). |
| Per frame (JavaScript) | 0 | UF_Tiles has no update hook; it writes only at build and on `world:tileChanged`. |
| Tilemap repaint (RMMZ, on scroll and every 30 frames) | +≤ 0.1 ms at zoom ⅓ | Measured with a layer-1 tile on every land cell: median 0.350–0.380 → 0.420–0.450 ms; rects 8,692 → 10,833–10,836, against RMMZ's limit of 32,000. |
| GPU per frame | +~2,100 quads at zoom ⅓ | Not measured. The `perf` suite measures FPS at build time (V50). |
| Save | +0 bytes | Derived (§11.3). |

---

## 13. Checks (new UF_Test suite `ground`, in UF_Tiles)

Run with `node tools/test_snapshot.js --name ground --suite ground`. Not a default suite: it builds the area several times. Each check can be provoked with the environment variable `UF_TEST_PROVOKE`, the convention of the `spawn` suite, read only in a `--uf-test` run. Screenshots: `ground.start_zoom1.png`, `ground.start_zoom13.png`, `ground.border_zoom1.png` (the nearest family pair cell to the start).

| Check | FAILs when | Provoked by | Expected FAIL shape |
|---|---|---|---|
| `ground.shades_vary` | On the world's seed and 2 synthetic seeds (built the way `worldgen.kit_seeded` builds one), some common kind (≥ 2 % of land) shows fewer than min(3, window) steps, counting a step when ≥ 1 % of that kind's cells show it. **Or** in the camp's zoom-⅓ view (51 × 39 cells), the start kind shows fewer than 3 steps with ≥ 5 % each. | `ground.flat`: `D` = 0.5 everywhere | `FAIL ground.shades_vary - seed …: meadow 1 step (want ≥ 3); start view: 1 step …` |
| `ground.patches_broad` | The mean size of 4-connected same-kind, same-shade patches is under **40 cells**, or more than **2 %** of shaded cells lie in patches under 4 cells (prototype: 100–220 and 0.3–0.7 %) | `ground.noise`: `D` = a per-corner hash | `FAIL ground.patches_broad - mean 1.9 cells (want ≥ 40), 70 % in patches < 4 …` |
| `ground.no_hard_seams` | (a) Two 4-adjacent shade cells of one family disagree on a shared corner, decoded from their tile keys. (b) A tile spans more than 1 step. (c) A shade corner beside a rim of its family isn't that kind's base step. (d) A layer-0 shape of a shaded cell differs from the `joins` predicate: an outline inside a family. (e) In 300 sampled same-family edges, the step read from the atlas pixels differs across the edge in more than 10 % of rows. (f) `pinConflicts` ≥ 0.1 % of shade cells. | `ground.seam`: corners rounded per cell instead of shared. `ground.outline`: `joins` = same kind. | `FAIL ground.no_hard_seams - 1,210 shared corners disagree, first (130,97)|(131,97) …` / `… 312 outlines inside a family, first meadow|dry_grass at (140,88)` |
| `ground.palette_only` | Any pixel of `UF_GenGround_A2` or `UF_GenShade_E` (and the D share, if any) isn't a `uf.hex` colour, or has alpha other than 0 or 255. The test reads the palette file with `fs`. | `ground.offpalette`: one step tone replaced by #5A9A3C (today's meadow base) | `FAIL ground.palette_only - UF_GenShade_E: 2,304 px off-palette, first #5A9A3C …` **Today's sheet already fails this: 0 of 130 catalog colours are palette entries.** |
| `ground.build_time` | The median of 3 ground builds exceeds 1500 ms, or the shade part's median exceeds 80 ms | `ground.slow`: a 120 ms busy-wait in the shade pass | `FAIL ground.build_time - shade pass 121 ms (want ≤ 80); build 402 ms` |
| `ground.deterministic` | Two builds of the same seed give different layer 1 or a different atlas pixel hash, or a synthetic next-seed build differs in under 20 % of shade cells | `ground.random`: `Math.random()` in the detail octave | `FAIL ground.deterministic - seed …: 18,433 layer-1 cells differ between two builds` |
| `ground.passability_unchanged` | The walk grid (`tileBits` per cell and direction) differs with layer 1 cleared, or a shade tile sits on water, `peak_rock`, an unshaded kind or a raised cell, or a shade id's flag isn't 0 | `ground.flags`: shade ids get 0x0f | `FAIL ground.passability_unchanged - 47,062 cells changed; flags of 768: 0xf` |
| `ground.edits_follow` | After a floor on 5 shaded cells, ash on 5 and a road on 5: a shade tile is left over any of them, a neighbour's layer 1 changed, removing them doesn't restore the exact earlier tiles, or `state.diffs` holds a layer-1 index | `ground.noedit`: the listener is off | `FAIL ground.edits_follow - shade tile left on a floor at (131,126) …` |
| `ground.atlas_fits` | Keys used exceed the capacity, pair keys were dropped while fewer than 8 pairs got room, or any mixed key was degraded | `ground.tinyatlas`: capacity 64 | `FAIL ground.atlas_fits - 222 step keys, capacity 64: 158 degraded …` |
| `ground.rects` | Lower-layer rects at zoom ⅓ over the camp are 24,000 or more (75 % of RMMZ's 32,000) | `ground.rects`: every shade tile drawn 3× on layers 1, 2 and 3 of a test copy | `FAIL ground.rects - 32,511 rects (want < 24,000)` |
| `ground.no_errors` | Any uncaught error | — | — |

**Existing checks to update:**
- `worldgen.autotile_shapes`: use `UF.Tiles.joins`
- `tiles.tileset_names`: E = `UF_GenShade_E`
- `tiles.flags`: shade ids are 0
- `tiles.kinds_look_different` and `tiles.pixel_grid_3x`: unchanged (both still pass on the snapped sheet)

**Definition of Done for the build:**
- Playtest (F5) of a New Game in the editor.
- The four screenshots opened: the camp at zoom 1 and ⅓ shows at least 3 meadow shades in broad patches, and a family border shows a dithered blend.
- Every `ground.*` check seen failing with its provocation.
- `ground`, `tiles`, `worldgen`, `world` and `smoke` passing on a snapshot.
- No new console errors.

---

## 14. Build plan

### 14.1 Stages
1. **Core** (UF_Tiles, catalog, 2 lines in UF_WorldGen):
   - snap the A2 sheet to the palette
   - `groundShades` in the catalog
   - `joins`
   - the field, plan, closure and categories
   - the E atlas (step keys)
   - layer 1 at build and on change
   - rims with dark-tone edges
   - the `ground` suite
   - a swatch sheet for the user's colour approval
   
   **Gate:** the user approves the ramps and the look.
2. **Blends:** pair keys by border length. Gemini's delivered blocks become step sources (the transplant), with `tools/ground_shades_preview.js`, `HANDOFF_ground_shades.md` and the AR-100 notes. Ask the terrain run about the D 64–255 overflow.
3. **Five levels:** read the surface top per column from UF_Levels, add the `+0.08 · z` bias, and hand over the open-air copy rule.
4. **Optional, needs the user's decision:** rolling *kinds* (§15, D2), and 1 texture variant per pure key to break the 48 px repeat (risk 3).

### 14.2 Catalog shape (proposal)
Colours are written as `"#RRGGBB"`. The catalog isn't editor-managed: add the key with a layout-preserving key-level insert.

```json
"groundShades": {
  "about": "VISION V93, docs/design/GROUND_SHADES.md",
  "field": { "scale": 24, "detailScale": 10, "weights": { "noise": 0.45, "detail": 0.20, "rain": 0.20, "drainage": 0.10, "height": 0.20, "water": 0.15, "level": 0.08 }, "heightFrom": 0.55, "waterReach": 6 },
  "ditherBand": 0.15, "toneJitter": 0.08, "maskGrid": 16,
  "families": {
    "grass": { "pattern": "grass",
      "steps": [ { "name": "lush", "tones": ["#189218", "#006D00", "#45B645", "#86D200"], "source": "tropical_grass" }, "…" ],
      "kinds": { "meadow": { "window": [1, 4], "base": 2, "shares": [0.20, 0.35, 0.30, 0.15] }, "…": {} } }
  },
  "pairs": { "grass|soil": { "steps": [3, 2] } }
}
```

---

## 15. Risks, open questions, decisions needed

**Risks**
1. **Atlas room:** E alone holds 256 keys. `z=0` step keys were 170–222 on three seeds, and hills and pairs add more. When it's full, pairs become rims first. The D share (§8.1) is the remedy.
2. **Build time:** the prototype missed the target by 2–3×. The optimisations of §12 aren't measured yet.
3. **Texture repeat:** the code-drawn texture repeats every cell (`texel(kind, k, x & 15, y & 15)`). It is visible in `shadeproto_seedA_start_mock_zoom1.png` and in today's zoom-1 screenshot. Shades break it up between patches but not inside one. Stage 4 variants or Gemini's art fix it.
4. **UF_Floors' `reshapeAround`** uses a same-kind predicate (line 159). Near a floor, a rim cell can regain an outline toward a same-family kind until UF_Floors calls `UF.Tiles.joins`. It is cosmetic: most neighbours have shade tiles.
5. **The stock A1 bank** (lime green) clashes with khaki and straw. The lush-bank term keeps banks green; AR-101 is the real fix.

**Decisions needed (user)**
- **D1.** Approve the colour ramps of §9 from the swatch sheet. They are a proposal and can be tuned.
- **D2. Should kinds roll too?** V93 says "rolling terrain types/colors". This design rolls colours inside kinds and blends kinds of a family. It could also let a biome pick its kind by the same field, for example grassland = 15 % lush grass / 65 % meadow / 20 % dry grass (catalog `biomes.*.groundMix`). That changes gameplay-visible kinds: Look text, and grazing (UF_Wildlife's `EDIBLE_GROUND` includes all three grass kinds, so no change there). Proposed as stage 4 only if you want it.
- **D3.** Contours dithered (default, `ditherBand` 0.15) or clean (0)?

**Coordination (agents, not the user)**
- The terrain run: D 0–63 for terrain, 64–255 for shades; the open-air copy rule (§11.3); `surfaceAt` per column.
- UF_Floors' owner: switch `shapeAt` to `UF.Tiles.joins`.

---

## Appendix A: probe outputs (copied from the runs, trimmed)

```text
PASS groundprobe.info_seed - seed 125759190, map 256x256, tileset 91, names ["Outside_A1","UF_GenGround_A2","","","","Outside_B","Outside_C","",""]
PASS groundprobe.info_kinds - land 54134/65536; kinds needle_floor 19920 (30.4%, border 2564), meadow 11777 (18.0%, border 553), forest_floor 9990 (15.2%, …) …; layers 1/2/3 non-zero 0/0/0
PASS groundprobe.info_fields - … samples within 28 of the start (fields fixed to startClimate) 607
PASS groundprobe.info_cand_n24 - … 339 patches, mean 159.7 cells, … cells in patches < 4: 0.17%; … 2-step jumps between neighbours 0
PASS groundprobe.info_cand_white - … 33841 patches, mean 1.6 cells, … cells in patches < 4: 77.93%; … 2-step jumps between neighbours 49943
PASS groundprobe.info_repaint - zoom 1/3 now: 40 repaints, median 0.380 ms, max 5.670 ms, lower rects 8692 …; zoom 1/3 with 54134 layer-1 D tiles: … median 0.420 ms, max 5.530 ms, lower rects 10836 …
PASS groundprobe.info_build - buildArea(0,0) 253 ms; WorldGen.lastBuild.ms 250
PASS groundprobe.info_seed - seed 1364211868 …   (second run)
PASS groundprobe.info_repaint - zoom 1/3 now: … median 0.350 ms … lower rects 8692 …; zoom 1/3 with 54356 layer-1 D tiles: … median 0.450 ms … lower rects 10833 …
PASS groundprobe.info_build - buildArea(0,0) 319 ms; WorldGen.lastBuild.ms 315
PASS shadeproto.info_view - start kind steps (>= 5 % of its cells) in the zoom-1 view 17x13: 1:25% 2:19% 3:26% 4:30%; in the zoom-1/3 view 51x39: 1:26% 2:11% 3:13% 4:51%
PASS shadeproto.info_proto - seed 1154599349; field 91 ms, whole pass 194 ms (Lipschitz fixes 262); … cells with a corner range > 1: 0; distinct overlay tiles used 183; patches 333, mean 147.0 cells, cells in patches < 4: 0.34% …
PASS shadeproto.info_proto - seed 1648186346; field 70 ms, whole pass 185 ms (Lipschitz fixes 600); … distinct overlay tiles used 222; patches 544, mean 100.1 cells, cells in patches < 4: 0.69% …; family pairs (border cells): grass|needles 1255, grass|litter 618, grass|stone 500, needles|tundra 415, …
```
