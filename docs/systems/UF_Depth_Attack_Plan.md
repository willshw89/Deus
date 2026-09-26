# UF Depth Attack Plan — WG.00.09 / DEUS-TSK-FABLE-19C

**Status:** Revised specification. Owner ruling R1 = D recorded. No engine implementation.  
**Date:** 2026-09-25  
**Writer:** Grok (Lane E, Directive 001-F; owner ruling R1 = D and R2–R11)  
**Reviewer:** Claude CLI session (re-review of `37fc1473`: CHANGES REQUESTED, `tasks/DEUS-TSK-FABLE-19C/claude_review.md` Section 4)  
**Branch:** `task/lane-e`  
**Plugin under attack (read-only until the freeze lifts):** `game/js/plugins/DEUS_Depth.js`  
**Future harness (not created here):** `tools/test_global_depth_renderer.js`

This document is the definition the compositor has to meet and the attack that has to fail a wrong one. It does not edit `DEUS_Depth.js`, `DEUS_Levels.js`, `DEUS_WorldGen.js`, `DEUS_Fluid.js`, `plugins.js`, or `game/data`. Frame times below are acceptance bars. They are not measurements from this session. The shade-table counts and the seed-18 column counts cited below are the review's measurements, not a new run.

This revision records the owner's ruling on CR-19C-R1 (option D: scale-only depth separation until tile art is on the master palette) and folds R2–R11 from the re-review. CR-19C-B1 and M2–M8 stay as the previous revision resolved them. The decisions are in the sections named there and are logged in section 9. `DEUS_Levels.js` and `DEUS_WorldGen.js` stay read-only. The compositor in `DEUS_Depth` owns the live-layer cutout and reads strata through public bytes.

Authorities read for this plan: `AGENTS.md` Rule 12 and Rule 13, `docs/systems/UF_Levels.md` (Strata; Natural cuts and caves), `docs/systems/DEUS_Depth.md`, `docs/audits/GROK_PRE_19C_ARCHITECTURE_REVIEW.md`, `docs/handoffs/HANDOFF_DEUS_TSK_FABLE_19C_DEPTH.md`, `docs/adr/ADR-002-Palette-Canonicalization.md`, `docs/art/DEUS_PALETTE_ARCHITECTURE_STANDARD.md`, `art/palette/deus_master_world_palette_v1.hex` (226 colors), `docs/art/DEUS_PaletteRegistry.json`, `docs/PERFORMANCE_ARCHITECTURE.md` (`PERF-003`, `PERF-005`).

Where an older doc disagrees, section 9 says which sentence wins.

---

## 1. What is on screen today

`DEUS_Depth.js` draws at most two planes under the live tilemap, and only while the camera is on `z > 0`.

| Requirement | Code today |
|---|---|
| Camera on `+2` can see `+1`, `Z0`, `-1`, `-2` | `maxDepth` is clamped with `Math.min(2, …)`. From `+2` the second plane is `z = 0`. `-1` and `-2` are never bound. |
| Camera on `Z0` can see a cut | `config.exposes` is `z => z > 0`. `rebuild` returns before `bindPlane`. A shaft on the ground draws nothing. `UF_Levels.md` records that ground cuts stay painted as `peak_rock` until this compositor exists. |
| Exposure is the first solid stratum | `hasOpenCells` scans the whole derived `shapeGrid` (65,536 cells) for `SHAPES.open` and caches one boolean per area and level. Any open cell in the area binds full-window planes. |
| A roof seals the column | `derivePacked` counts solids stacked from `S0`. A roof that is not a solid prefix derives `open`. On `z > 0`, `looksOfPacked` paints that `open` as `open_air` (`DEUS_Levels.js:1456`), which is transparent, and the cave shows through the roof. On `z <= 0` the same `open` is opaque (`cave_floor` + `hole_edge` at `:1459`, and on the ground `peak_rock` at `DEUS_WorldGen.js:996`). |
| Recession is a physical step off 48 px | Default `deus` uses eye 140 ft and `levelHeightFt` 6: scales 0.959 and 0.921. The `config.camera` literal is 190 ft and 6 ft (`DEUS_Depth.js:166`). The `EyeHeightFt` parameter defaults to 140 (`:51`) and overwrites that literal when the parameter is present. |
| No blur, no shader, palette only | `deus` sets blur 0.6 px and 1.2 px. `applyLook` constructs `PIXI.filters.BlurFilter` when `cfg.blur > 0`, and a `ColorMatrixFilter` for brightness, saturation, and contrast. Both are shader passes. A 4% RGB multiply is not a color in the master hex file. |
| Viewport cache, no per-frame heap | One open cell anywhere in the 256×256 area keeps both window planes live. `levels:shapeChanged` drops the whole open cache and repaints. There is no 16×16 exposure block. The live update allocates: a new window object (`entityWindow`, `:515-518`), a template-string key (`updateEntities`, `:523`), a foot object per entity (`placeEntities`, `:609`), a sort closure (`:536`), and new points from `unprojected` (`:661`) and `Depth.center()` (`:670`). |

Worth keeping, and not the attack: window canvases rather than a map-sized bitmap; nearest sampling (`smooth = false`); one treatment shared by the tiles and the entities of a plane; plane alpha held at 1; a void drawn over the parallax so a shaft does not show the sky; repaint on start-tile change, refresh, or in-window A1 water every 30 frames; entities in the plane's unprojected frame so they inherit the plane scale; projection origin at the camera focus.

Worth retiring, and named so it is not copied forward: treating the live tilemap's derived shape as the hole. The live map is a WebGL `Tilemap` (`rmmz_core.js` `Tilemap.Layer` / `Tilemap.Renderer`). It is not a canvas whose pixels already match the ray. Planes parented under it (`DEUS_Depth.js:719`, `z = -1`) stay hidden wherever that tilemap drew an opaque tile.

The historical `depth14` note in `DEUS_Depth.md` (editor open, simulation paused) put the idle tick near 45.7 ms, two-plane recession near +16.9 ms, and blur quality 1 near +14.7 ms. That run is contaminated by the editor. It is still enough to reject "clone the plane twice more and leave `hasOpenCells` in place."

---

## 2. Five planes

Macro-levels are `Z-2`, `Z-1`, `Z0`, `Z+1`, `Z+2`. The camera sits on one of them, `V`. A depth plane is a macro-level strictly below `V`. There is no upward compositor and no sixth plane for the `+2` ceiling cap.

| Camera `V` | Lower planes that may bind | Depth index `d = V − z` |
|---|---|---|
| `+2` | `+1`, `Z0`, `-1`, `-2` | 1, 2, 3, 4 |
| `+1` | `Z0`, `-1`, `-2` | 1, 2, 3 |
| `Z0` | `-1`, `-2` | 1, 2 |
| `-1` | `-2` | 1 |
| `-2` | none | — |

`config.maxDepth` accepts `0..4` and defaults to 4. `config.depths` has keys `1`, `2`, `3`, `4`. The clamp `Math.min(2, …)` is a failing mutant (`max_depth_clamped_2`). Binding does not consult `config.exposes`. A column with `dHit >= 1` binds on every camera, including `V = 0` and `V = -1`.

Draw order, back to front: void, then plane 4, plane 3, plane 2, plane 1, then the live tilemap's lower layer (z 0), then characters, then the live tilemap's upper layer (z 4). "The live tilemap at `z = 0`" in older notes means that lower layer, not macro-level Z0.

A plane slot exists for each `d` in `1..4`. It is updated and drawn only when the window's presence bit for that `d` is set (section 6.2). `d > maxD` or `V - d < -2` never sets the bit.

The live tilemap is the occluder where `dHit = 0`, and only there. Where `dHit >= 1` it draws no tile, on either of its layers, so the plane the ray names shows through. Where `dHit = 0` but the level's own tile is transparent, the live map draws an opaque tile of the hit material at scale 1 (section 3.5). Plane pixels never cover a viewed-level floor. Toggling the planes does not change a `dHit = 0` pixel. A `dHit >= 1` cell is a hole in the live map: toggling the planes changes what shows through it, and what shows is the plane the ray names, or the void when `dHit = 5`.

Preset `off` unbinds every depth plane. The live cutout and the roof fallback stay on (section 3.5). Cells with `dHit ≥ 1`, including void, show the void texel `#0C0D12`. The sky parallax does not show through a hole. A `+1` roof stays the opaque fallback. Section 5.1 forbids parallax through a hole; dropping the cutout under `off` would reopen the roof leak.

A chasm from `Z0` through `-1` onto a floor inside `-2`, seen from `Z0`, is one composite: the ground rim is the live map (`dHit = 0`), an `-1` floor is plane 1, the `-2` bed is plane 2. Seen from `+2` the same bed is plane 4. Absolute `Z` does not own a scale. Depth below the camera does.

The `+2` ceiling cap is not a lower plane and is not a sight stop (section 3.1). Cap events do not repaint a depth plane.

---

## 3. Strata authority

### 3.1 The column

Five macro-levels, five 1 ft strata each (`S0` bottom through `S4` top). Elevation `e = (z + 2) * 5 + s`, range `0..24`.

| Band | Elevations |
|---|---|
| `Z-2` | `e0..e4` |
| `Z-1` | `e5..e9` |
| `Z0` | `e10..e14` |
| `Z+1` | `e15..e19` |
| `Z+2` | `e20..e24` |

`Z0 S0` is `e10`. `Z-1 S4` is `e9`. Those two slices are adjacent. A test that treats them as the same stratum, or that leaves a gap, is wrong.

Solidity is the same predicate as `SOLID_B` (`DEUS_Levels.js:1014-1020`), evaluated from the public material table because `SOLID_B` itself is private. Stone, soil, and wood stop a ray. Air (`0`), water (`4`), and lava (`5`) do not. The constructed bit `0x80` does not change solidity. A byte with bit `0x40` set is not solid. HP is not solidity: a damaged solid still stops the ray until the writer turns it into air at 0 HP.

The `+2` cap (`baseline(2).caps`, thickness in feet above the model) is not elevation 25 and is not a bit in the mask. Looking down never hits it. It does not become a fifth lower plane. `writeCap` redraws the live `+2` cell when the derived shape changes (`DEUS_Levels.js:2817-2820`). The compositor ignores `levels:capChanged` and `levels:capBreached` either way. `+2` is never a lower plane, so those events have nothing to repaint.

### 3.2 The ray

For camera `V` and column `(x, y)`, start at the top of the viewed cell and walk down:

```
eStart = (V + 2) * 5 + 4
```

The first `e` in `eStart, eStart−1, …, 0` whose solid bit is set is the hit. No solid bit: `dHit = 5` (void). The cap is not consulted.

A hit on `S4` is the floor lip of the band above. That foot is 1 ft below the next floor, not a 5 ft drop. `derivePacked` already treats it that way: an all-air cell whose neighbour below has a solid `S4` derives `floor`, and `worldStrataElevationAt` returns that `S4` (`DEUS_Levels.js:1208-1210`, `:1874-1876`). The ray uses the same assignment:

```
zHit = floor((e + 1) / 5) - 2
dHit = max(0, V - zHit)       // 0..4; void stays 5 and does not use this line
```

`S4` of band `z−1` lands on band `z`. `S0..S3` of a band stay on that band. A hit on `S4` of the viewed cell itself produces `zHit = V + 1` and `dHit = 0` after the clamp: the live map draws it, and no plane does. `zHit` is the band that owns the floor. Drawing keys off `dHit`, not off a raw `floor(e / 5) - 2`.

A change at `(x, y)` does not change a neighbour's `dHit`.

Plane `d` draws that column only when `dHit = d`. `dHit > d` is a hole in this plane (no pixels, a deeper plane may draw). `dHit < d` is already sealed (this plane draws nothing there). `dHit = 0` is the live map. `dHit = 5` is the void and no plane.

### 3.3 What must not answer the ray

`UF_Levels.md` already forbids shape codes for vertical sight, cave-roof occlusion, shaft openness, and exposure depth. The derived shape is a compatibility view for walkability. It is also what the live tilemap paints. Those are different questions. Section 3.5 is what keeps the paint from pretending to be the ray.

| API | What it actually answers | Why it fails as the exposure mask |
|---|---|---|
| `shapeAt` / `shapeCodeAt` / `shapeGrid` / `SHAPES.open` | `derivePacked`: solids stacked from `S0`, then headroom | A roof that does not start at `S0` is `open`. `hasOpenCells` then treats the roof as a hole. The painter then goes opaque or transparent for reasons of its own (section 3.5). |
| `hasOpaqueOverburden` | Solid above the standing surface, or any solid in a cell above, or a cap | Roof test for a creature inside the cell. It is the wrong direction. A meadow with a solid floor and open sky is "no overburden" and would be read as a hole. |
| `continuousAirHeight` / `airRunAt` | Feet of material-id `0` above the stand | Stops on water and lava. The exposure ray does not. A pool would hide its own floor. |
| `worldStrataElevationAt` | Stratum a unit stands on, including the lip at `S4` of the cell below | Standing surface. The lip shift in section 3.2 agrees with it about which band owns that lip. It is not a scan from `S4` of `V`. |
| `heightStateAt` (`HEIGHT_k_OF_5`) | Length of the solid prefix from `S0` | A mid-cell roof (`[stone, air, stone, stone, stone]`) reports a short prefix and still seals the ray at `S4`. |

`hasOpaqueOverburden` stays the gameplay roof query. The compositor and the entity test both call the same `dHit`. A roof cannot be a floor to one and a hole to the other.

### 3.4 Worked columns

Material bytes are `S0..S4`. `stone` is solid. `air` and `water` are not. `zHit` / `dHit` use section 3.2.

| Case | Viewed cell and below | `dHit` | What draws |
|---|---|---|---|
| Meadow | Five stone in `V`. Hit is `S4`, so `zHit = V + 1` and the clamp makes `dHit = 0`. | 0 | Live map only. No plane, no void. |
| Roof in the viewed cell | `V = [air, air, air, air, stone]`, or `[air, air, air, stone, stone]`. On `V > 0` this derives `open` and the stock painter would leave it transparent. | 0 | Live map draws an opaque tile of the hit material at scale 1 (section 3.5). Deeper planes stay clear. The void does not show. |
| Lip, one foot down | `V` five air; `V−1 = [air×4, stone]` (solid `S4` only). `derivePacked` makes `V` a `floor`. | 0 | Live map draws that floor at 48 px. Plane 1 draws nothing on this column. The unit standing here belongs to level `V` (section 7). |
| Deck over a pit | `V` five air; `V−1` has stone at `S0` and air at `S4`. | 1 | Plane 1 draws that floor, at `tilePx(1)`. The live map draws nothing on this column. |
| Shaft onto a floor inside `-2`, from `+2` | Air from `+2` through `-1`. `-2 = [stone, air, air, air, air]` (`S4` air, `S0` stone). | 4 | `zHit = -2`. Planes 1..3 draw nothing in the shaft cell. Plane 4 draws the bed. |
| Solid `-2` under air, from `+2` | Air from `+2` through `-1`. `-2 S4` is stone. That `S4` is the lip of `-1`. | 3 | `zHit = -1`. Plane 3 draws it. Plane 4 does not. A clamp of `maxDepth` to 2 still fails, because a real `dHit = 4` column (the row above) must bind plane 4. |
| Open water | Stone `S0`, water `S1..S2`, air above, inside the hit cell | the stone's depth | Water does not advance `dHit`. The owning plane draws the floor. Deeper planes stay clear. |
| In-cell shelf | `[stone, air, stone, stone, stone]` as `V` | 0 | The ray hits `S4`. `HEIGHT_1_OF_5` is irrelevant. |
| True void | Air at every `e` from `eStart` through 0, cap or not | 5 | Void texel `#0C0D12`. Not the sky parallax. The live map draws nothing. The cap does not plug the hole. |
| Ground cut | `V = 0`, air through `Z0` and `-1`, `-2 S4` air, stone at `-2 S0` | 2 | Planes bind on the ground. The live ground cell is not drawn, so `peak_rock` does not cover the cut. `exposes(z) = z > 0` is the mutant `exposes_surface_only`. |
| Camera on `-2` | Any solid in the viewed cell | 0 | No lower plane. A true void (`dHit = 5`) shows the void texel. Ceilings are overburden on the live map, not a depth plane. |

Fluid volume, flow, and `DEUS_Fluid.js` stay out of this task. The ray only reads solidity.

### 3.5 Live-layer contract

The review's probe (seed 18, generator 5, area `(0,0)`, real `looksOfPacked`) is why this section exists. It is not re-run here.

| Camera `V` | Columns with `dHit ≥ 1` under the old ray | Under an opaque live tile | `dHit = 0` under a transparent live tile |
|---|---:|---:|---:|
| `+2` | 50,106 | 419 lips / floors | 0 |
| `+1` | 25,334 | 517 | **127** (example `(175,46)`, shape `open`, "+1 · Open air") |
| `0` | 1,368 | **1,368** (`peak_rock` or a live floor) | 0 |
| `−1` | 344 | **344** (`cave_floor` or a live floor) | 0 |

Under the old ray every exposed column on the Ground and on `−1` sits under an opaque tile, so planes parented beneath the live map never show. On `+1`, a generated roof such as `[air, air, air, stone, stone]` derives `open`, paints `open_air`, and would show `#0C0D12` where the rock should be. The lip formula in section 3.2 moves the lip rows onto `dHit = 0` (the live floor already draws them). It does not move a ground shaft or a `−1` shaft onto `dHit = 0`, and it does not make a `+1` roof opaque. Those two failures are the cutout's job.

**Contract, for every camera `V` in `−2..+2`.** On the composited screen, the centre texel of a column comes from exactly one place:

| `dHit` | What the texel is | What it is not |
|---|---|---|
| `0` | The live map's own opaque tile, or, when that tile is transparent, an opaque tile of the hit material at scale 1 | The void, a lower plane, the sky |
| `1..4` | Plane `dHit`, at `tilePx(dHit)` | The live tile (including `peak_rock` and `cave_floor`), the void, a deeper plane |
| `5` | Void texel `#0C0D12` (`NEUT_VOID_CAP`) | The sky parallax, a plane |

The live cell is see-through if and only if `dHit ≥ 1`. See-through means both live layers draw no rect for that cell. An opaque `peak_rock` on layer 0 and layer 2 (`DEUS_WorldGen.js:1031-1037`) and an opaque `cave_floor` plus `hole_edge` (`DEUS_Levels.js:1459`) are not see-through unless the cutout skips them.

**Plan decision (within handoff §9 authority).** `DEUS_Levels.js` and `DEUS_WorldGen.js` are read-only for 19C (handoff §9). They keep today's looks. `DEUS_Depth` owns the contract. A later art or levels change may paint the live cell correctly; the pixel tests in section 8 stay either way. The compositor adapts. The painters do not change in this task. This is the plan decision for CR-19C-B1.

**Mechanism.** No PIXI mask, no `SpriteMaskFilter`, no new shader, no edit to the WebGL tilemap shader. The live map is not a canvas (`Tilemap.CombinedLayer` holds `Tilemap.Layer` children; `clearRect` on a bitmap would not punch it). `DEUS_Depth` wraps `_addSpot` on the spriteset's live `Tilemap` instance only. `DepthTilemap` is not wrapped. `_addAllSpots` already clears both layers before adding spots (`rmmz_core.js:2422-2424`), so a skipped cell stays clear on the lower layer and the upper layer.

The live start tile is `floor((ceil(ox) − 20) / 48)` (`rmmz_core.js:2368-2370`). Write `ox = 48k + r`. That start is `k − 1` when `r < 20` and `k` otherwise, so it is not a fixed offset from `floor(displayX)` for the whole pan. A player-centred camera at rest has `r = 0`. The depth canvas starts two tiles before the live start (`PAD = 96`). The window summary (section 6.2) is keyed on that depth-canvas start tile (`live start − 2`). Rebuild it in `Spriteset_Map.updateTilemap`, after the stock origin is set and before the live `updateTransform` (`DEUS_Depth.js:824-826`, `rmmz_sprites.js:3485`). The wrapper indexes `(x + 2, y + 2)` of its 19×15 spot loop into the 23×19 summary.

`_addSpot` is handed unwrapped `mx`, `my`; only `_readMapData` wraps (`rmmz_core.js:2618-2627`). `shapeCodeAt` returns 0 for `x < 0` or `x ≥ size` (`DEUS_Levels.js:1299-1308`). Wrap before every Levels query:

```
wx = ((mx % size) + size) % size
wy = ((my % size) + size) % size
```

A `+1` roof on the seam otherwise falls through to case 3, paints `open_air`, and the void shows. `P-CUTOUT` includes a surgical seam roof and a sample at `r < 20`.

For each spot, read `dHit` from the pooled window table at `(x + 2, y + 2)`:

1. `dHit ≥ 1` (including void): return without adding a rect. Both layers omit the cell. `peak_rock` on layer 0 and layer 2 is omitted together because `_addSpot` is what adds both (`rmmz_core.js:2448-2461`).
2. `dHit = 0` and `V > 0` and `UF.Levels.shapeCodeAt` (on the wrapped `wx, wy`) is `SHAPES.open` (`3`): do not draw `open_air`. Draw one opaque tile of the hit material on the lower layer, via the tilemap's own `_addTile`, at this cell's `dx, dy`. Scale is the live map's scale, which is 1. Look keys, resolved once at load through `UF.Levels.tileOf`: stone → `rock`, soil → `soil`, wood → `rock`. Those are the SOLID looks (`looksOfPacked` at `:1457`: a non-soil solid is `rock`). `mined_stone`, `mined_soil`, and `deck_wood` are walkable dug or constructed floors; a natural roof next to solid rock would read as a floor while `UF.Look` still reports "Open air". The id stored is that base (autotile shape 0). The hit material byte comes from the same reader as the block fill (section 6.1), one byte, no allocation.
3. Otherwise: the original `_addSpot`. Meadows, lip floors, and `z ≤ 0` cells whose ray hits inside the viewed cell keep the tile the painter already chose. On `z ≤ 0` an `open` shape is already opaque, so case 2 does not run there.

The wrapper allocates nothing: `dHit` is a pooled `Uint8Array`, the three tile ids are numbers from load, the wrap is integer arithmetic, and the material byte is an index into an existing typed array or a `charCodeAt` on the existing hex string. A column-word change inside the window sets the live tilemap's `_needsRepaint` so the next paint rebuilds spots.

A still camera still repaints. Stock `Tilemap.update` advances `animationFrame` every 30 frames (`rmmz_core.js:2327-2329`), and `updateTransform` rebuilds every spot when that frame changes (`:2378`). The wrapper therefore runs 285 times (19×15) every 30 frames with the camera still, and again on every live start-tile change. Those rebuilds are inside `C-LIVE-ALLOC` (section 8.2). Heap sampled around the wrapper body stays flat. There is no GC exemption for the wrapper.

Lower planes use the same ownership rule on their canvas, not a mask (section 6.2). A plane cell with `dHit = d` and shape `open` draws the same solid look of the hit material (`rock` / `soil`), taken from the source sheet (section 5.3), at that plane's `tilePx`. That includes plane-owned `open` cells at `z ≤ 0`: `cave_floor` plus `hole_edge` would mark a hole over rock as a dug floor. A ground cell the plane owns whose stock tile is already an opaque floor keeps that tile. A cell the plane does not own is not drawn.

`shapeCodeAt` is legal here as a description of the painter. It is not the ray. `columnHit` must not call it (check `oracle_uses_shapes`).

---

## 4. Physical scale, without blur

### 4.1 Native tile

One world cell is 48×48 screen pixels at the camera plane (`docs/art/DEUS_NATIVE_RESOLUTION_STANDARD.md`). That is the viewed level, whichever `V` the camera is on. The active plane is scale 1, unshaded, no filter, alpha 1.

"Upper" and "lower" do not get scales from their absolute `Z`. `Z+1` seen from `+2` is depth 1. The same `Z+1` with the camera standing on it is 48 px. A scale table keyed by absolute `Z` (`Z+2` always smaller than `Z0`) is the mutant `absolute_z_scale`.

### 4.2 Step off the pinhole

Macro drop `Δ = 5` ft. Eye height `H` ft above the viewed level. Physical target, used only to choose an integer:

```
s(d) = H / (H + 5 * d)     d ∈ {1, 2, 3, 4}
```

Production eyes: `H ∈ {160, 120, 90}`, default `H = 120`. `setEyeHeight` clamps `H` up to 90. The shipped 140 ft / 6 ft pair, the `config.camera` literal 190 / 6, and any shoot at 60 ft or 30 ft are outside this plan. The pad below does not cover those shorter eyes.

The screen step is a whole number of pixels. Nearest sampling does not invent a color at a fractional scale either. The integer step is what keeps every tile on the same texel-drop pattern:

```
tilePx(d) = round(48 * H / (H + 5 * d))
scale(d)  = tilePx(d) / 48
```

`scale.x = scale.y`. `Math.round` half-up, the same rule the harness must use. Depth 0 is `tilePx = 48`. The value written onto the plane is this ratio. A free float on `plane.scale` fails even when `tilePx()` is rounded (check `S-SCALE-INT`: `plane.scale.x * 48` is an integer and equals `tilePx`).

| `d` | Drop | `H = 160` | `H = 120` | `H = 90` |
|---|-----:|---:|---:|---:|
| 1 | 5 ft | 47 px (`47/48`) | 46 px (`46/48`) | 45 px (`45/48`) |
| 2 | 10 ft | 45 px | 44 px | 43 px |
| 3 | 15 ft | 44 px | 43 px | 41 px |
| 4 | 20 ft | 43 px | 41 px | 39 px |

Each row is strictly decreasing. The four steps under one eye are distinct from each other and from 48. `levelHeightFt` other than 5 fails `step_scale`.

The same `z` seen from two cameras is two depths and two `tilePx` values. The same `d` seen from two cameras is one `tilePx`. That is check `S-RELATIVE`, which runs on the stub and reads `plane.scale.x * 48` (section 8.2). `S-ACTIVE` only locks depth 0 and the live map at scale 1; it does not see `absolute_z_scale`. The node `tilePx(H, d)` export takes no `z`, so a binder that keys scale on `z` would pass a node-only relative check.

### 4.3 Projection

Viewport used for the edge numbers: 816×624 (17×13 tiles of 48). Focus `C` is the viewport centre.

Unprojected point `P` (the tilemap origin the plane already uses):

```
P'(d) = C + (P − C) * (tilePx(d) / 48)
```

Plane `x` and `y` are integer pixels. A pan of `T` pixels moves the live map by `−T` and the depth-`d` plane by `−T * tilePx(d) / 48`. Parallax relative to the live map is `T * (1 − scale(d))`, toward the focus.

Edge shift on the 408 px half-width, `shift(d) = 408 * (1 − tilePx(d) / 48)`:

| `d` | `H = 160` | `H = 120` | `H = 90` |
|---|---:|---:|---:|
| 1 | 8.5 px | 17 px | 25.5 px |
| 2 | 25.5 px | 34 px | 42.5 px |
| 3 | 34 px | 42.5 px | 59.5 px |
| 4 | 42.5 px | 59.5 px | 76.5 px |

The pad is **96 px** (two tiles) on every side. Coverage is `PAD * tilePx(d) / 48 ≥ shift(d) + 1`, not `shift < PAD`. At `H = 90`, `d = 4`: `tilePx` 39, shift 76.5, projected pad `96 * 39 / 48 = 78.0`, and `78.0 ≥ 77.5`. That is the tight cell. It passes. `PAD = 48` projects to 39 px there and fails.

There is no separate `maxParallaxPx = 80`. A shift of 78..80 px leaves this pad's edge bare and must fail the inequality. The old ceiling of 36 px was sized for two planes at 140 ft and is not kept.

Canvas size is not "viewport plus 192". `DepthTilemap` is constructed with `Graphics + 2 * PAD` (`DEUS_Depth.js:454`). The layer then adds `Tilemap._margin` (20, `rmmz_core.js:2197`) on each side and one extra tile (`DEUS_Depth.js:293-296`):

```
cols = ceil((viewportW + 2 * PAD + 40) / 48) + 1
```

For an 816×624 view, `PAD = 96` gives a **1104×912** canvas (23×19 tiles). `PAD = 48` gives 1008×816 (21×17). A check that expects 1008×816 passes the mutant `pad_48`. `S-PAD` expects 1104×912 and the coverage inequality at all three eyes.

The summary window (section 6) covers that 23×19 cell rectangle, not a 21×17 hand count.

The canvas is painted in unprojected 48 px tiles. The sprite scale is the integer ratio above. `bitmap.smooth` stays false and `imageSmoothingEnabled` stays false. Linear filtering is the mutant `smooth_on`.

### 4.4 Blur is absent

The blur ban is handoff §6, which names VISION V108 / V133 and `PERFORMANCE_ARCHITECTURE.md` §6 rule 5 (Production Blur Disabled). Rule 12 is the animation rule: the engine draws no motion of its own. It is not the citation for the blur ban. Both still hold. Production does not fake depth with a shader distortion.

Production presets store `blur: 0`. `applyLook` must not construct `PIXI.filters.BlurFilter` while the debug flag is off. Boot and the F7 production cycle construct that filter **zero** times. The filter list of every plane is empty in production. Section 5 forbids the color-matrix shader. Section 6.2 forbids a sprite mask, which in PIXI 5.3.12 is also a filter pass (`SpriteMaskFilter`, `game/js/libs/pixi.js:3874` and `:19702`).

A debug blur, if it exists at all, is built only after an explicit debug flag turns on, and that flag is off in the shipping preset, in the F7 cycle, and in the benchmark. "Constructed once and then disabled" still fails: the object must not be created. Quality, kernel size, and passes are therefore unreachable in production and cost 0.00 ms.

Presets `C`, `D`, and `E` in the current file (blur 0.5 through 2.5 px) leave the production cycle. `deus` with blur 0.6 / 1.2 is the mutant `blur_on_deus`.

Sprite-sheet frames stay legal. In-window A1 water on a plane that is actually bound may repaint on the map's 30-frame cadence, because that is a tileset frame, not a filter. No other plane repaints with it. `$deusAnimationMaster.frame3` is named in the handoff and in `PERFORMANCE_ARCHITECTURE.md`. It is not in the game code (section 9). Units, trees, and objects off the viewed level stay on their standing frame. No sine, rotation, squash, or procedural sway.

---

## 5. Palette shading

### 5.1 Why a color matrix fails

The handoff's "4% brightness and saturation" and the pre-19C review's `ColorMatrixFilter` describe a luminance target. They do not describe a legal pixel. PIXI `brightness` / `saturate` / `contrast` write RGB triples that are not in `art/palette/deus_master_world_palette_v1.hex`. That file is the master palette (ADR-002): **226** active colors, 30 reserved slots, 58 ramps. `art/palette/uf.hex` is the legacy 384-color list and is not the shade authority.

`#08080C`, the current `voidColor`, sits in the Rule 13 prose range and is **not** one of the 226. The compositor's void texel is master color `NEUT_VOID_CAP`, `#0C0D12`. The sky parallax never shows through `dHit = 5`.

Production forbids `PIXI.filters.ColorMatrixFilter` the same way it forbids blur. The mutant `colormatrix_production` is a plane whose filter list contains one. `no_production_filter` reads the filter list and `filterConstructs`. It does not look at `.mask` (that is `no_sprite_mask`).

### 5.2 Owner ruling R1 = D: scale only until the art is on the palette

The registry's ramps are 3 to 5 tones, and adjacent tones sit about 25–45% apart in luminance (review §3.2, on `docs/art/DEUS_PaletteRegistry.json`). A nearest-luminance pick at `k(d) = 1 − 0.04d` changes **0 of 226** colors at depth 1 and **0 of 226** at depth 2. Depth 3 changes 11. Depth 4 changes 92. The handoff's 96 / 92 / 88 / 84% figures are not achievable by that pick. They are retired as a pixel formula.

The previous revision's ramp-step proposal (one step at depths 1–2, a second at 3–4) changes 192 of 226 colors at every depth. Median luminance ratio is 0.67 at depths 1–2 and 0.47 at depths 3–4 (review §4.4.2). Depth 1 equals depth 2 for every color, and depth 3 equals depth 4. Of 11,741,932 opaque texels in `game/img/tilesets/*.png`, 0.01% are master hexes (review §4.4.3), so on today's art a stepped `deus` would still match `deus_scale`. Once master-palette art lands, the same planes would drop by a third.

**Owner ruling, CR-19C-R1 = D.** Scale-only depth separation. No color darkening, until tile art is migrated to the master palette. Shading is revisited after that migration. This implementation does not apply a ramp step, an ordered dither, or a continuous darken.

Until that revisit:

- Build the shade table once, at plugin load, as a `Uint8Array` of 226×5 slots. Every depth column is identity: `shadeIndex(slot, d) = slot` for `d` in `0..4`.
- `deus` and `deus_scale` paint the same texels. They differ in name and in the F7 cycle. They do not differ in color.
- `eye160` and `eye90` change `H` and the pixel steps only.
- Master texels are copied unchanged. Non-master texels are copied unchanged (section 5.3).
- Identity at every depth for `NEUT_VOID_DEEP` (`#060709`), `NEUT_VOID_CAP` (`#0C0D12`), and `NEUT_VOID_OCCLUSION` (`#14161C`).

Do not rebuild the table per frame, per paint, or per camera move. `S-SHADE-ORACLE` pins the identity table. `S-MONO` holds. `S-STEP` requires the count of slots with `shadeIndex(slot, 1) ≠ slot`, excluding the three void ids, to be 0. A stepped table fails.

Rule 13's cap range is `#08080C`–`#121218`. `#08080C` is absent from the master file. `naturalWallSpec.capEdgeColor` is `#121218` (`DEUS_Levels.js:3783`). The nearest master neighbour on the void ramp is `NEUT_VOID_OCCLUSION` `#14161C`, which is outside that range, and `NEUT_VOID_DEEP` `#060709` is below it. The compositor keeps the three void ids unshaded and does not invent `#08080C`. That conflict is recorded in section 9 for the owner.

F7 production cycle: `deus` → `deus_scale` → `eye160` → `eye90` → `off` → `deus`. No preset in that cycle has `blur > 0` or attaches a filter. Under `off`, the live cutout and the roof fallback stay; holes show the void texel (section 2).

**After palette migration (not this implementation).** Shading is revisited then. The recorded candidate is one ramp step at depths 1 and 2, and a second at depths 3 and 4, clamped at the dark end of the chosen ramp, with no ordered dither. Ramp choice when a color sits on more than one ramp: the ramp with the most entries darker than the source; tie-break lexicographic `rampId`. Within that ramp, sort by luminance ascending (index 0 is darkest), tie-break lexicographic `colorId`, and take `max(0, i − 1)` at depths 1–2 and `max(0, i − 2)` at depths 3–4. The three void ids stay identity. A non-void color must not step onto a void id (`NEUT_VOID_DEEP`, `NEUT_VOID_CAP`, `NEUT_VOID_OCCLUSION`): skip that member and take the next darker non-void on the ramp, or stay if none remains. Without that exclusion, `HIGH_SOIL_01` at every depth and `VOLC_CHAR_03` at depths 3–4 land on `NEUT_VOID_CAP` `#0C0D12` (review §4.4.2, nine non-void colors in all), and `P-CUTOUT` could not tell a shaded plane pixel from the void by color. That revisit is a palette-table change after the picture gate. It still has to land on a master slot for master texels. The rest of this plan does not wait on it.

### 5.3 Who is shaded, and when

**Plan decision (within handoff §9 authority), CR-19C-M2.** ADR-002 §2.2 keeps existing `uf.hex` prototype assets valid during the transition. Stock `Dungeon_A2` and `Outside_A2` (tileset 92) and the ground tileset 91 are not master-palette art. Quantising them at paint would change a material's hue between the camera level and the level below.

Until R1 = D is lifted, the identity table means every texel is copied unchanged. The pass-through rule still stands, so a later shade revisit does not start quantising stock art:

- A texel whose RGB is an exact master hex is replaced by the table's hex at that depth. Under identity that hex is the source hex.
- A texel whose RGB is not a master hex is copied unchanged. It is art debt, counted once at sheet inspect in `stats.offPaletteTexels`. It is not quantised.
- Depth 0, the live map, and `deus_scale` do not run a non-identity table. Under R1 = D, `deus` does not either.

The lookup is exact. At load, pack each of the 226 hexes into a `Uint32` (`R << 16 | G << 8 | B`) and sort that array. A parallel `Uint8Array` holds the master slot. Sheet inspect binary-searches it. No `Map` allocation per texel, no Euclidean nearest-neighbour, no per-frame lookup. The repaint path does not search.

**Alpha.** Output alpha is `0` or `255`.

- The stock shadow quad (`DEUS_Depth.js:252-254`, `rgba(0,0,0,0.5)`) is not drawn on a depth plane. `addRect` skips `setNumber < 0`. It is not promoted to opaque black and not left as a half-alpha blend.
- Any other texel with alpha `< 128` is written as alpha `0`. Alpha `≥ 128` is written as alpha `255`, then the RGB rule above runs. That is the anti-aliased sheet edge. The threshold is 128 because canvas stores `0.5 * 255` as 128, and the shadow quad is already skipped so it never sits on that boundary inside the shader.

**When copies exist.** Under R1 = D the table columns are identical to the source, so no shaded sheet copy is built. Plane paint is `drawImage` from the source sheet. Entity sprites point at the source sheet and `setFrame` the same rectangle they use at depth 0 (section 7). The 256-bitmap entity pool is not part of this design. A sheet whose inspect finds zero master texels never gets a copy, even after shading is revisited.

After palette migration, when a non-identity column exists:

- Share one copy among depths whose table columns are equal. Under the recorded candidate, `d1 ≡ d2` and `d3 ≡ d4`, so two copies per source sheet, not four.
- Skip the copy for a sheet with no master texel; paint from the source.
- Build the copies at scene start, not on first bind. A first-bind `getImageData` plus a per-texel search on about 2 Mpx hitches in play.
- Character and object sheets: built at scene start for sheets already in use, then lazily on first use, keyed `(sheet, shared-column)`, LRU cap 32. A dropped entry is rebuilt the next time it is used, not during a still frame.

A plane repaint is `clearRect` of the existing canvas, then `drawImage` from the source sheet (or the shared copy, after the revisit) for cells the plane owns, then `baseTexture.update` of the existing texture. No `getImageData`, no `putImageData`, no `new ImageData`, no `new Bitmap`, no per-pixel remap. `getImageData` is legal only inside a sheet-copy build, which returns a fresh `ImageData` the platform will not let us reuse. That build is outside the frame budget and outside the repaint budget. The panning benchmark (section 8.5) warms the canvases first, then samples heap around each plane flush.

**Fixture.** `S-SHADE-VIS`, `S-PAL-CANVAS`, and `S-PASS` paint from `tools/test_fixtures/depth_shade_master.png`. That sheet has opaque master-hex texels and at least one opaque non-master RGB. A missing fixture exits 2. Today's tilesets have too few master texels for those checks (review §4.4.3).

Nothing in the identity table, and nothing in the deferred candidate, is a claim that the picture has been accepted. The per-level shots in section 8.5 are the comparison set.

---

## 6. Chunk exposure cache

`PERF-003`: do not draw five full maps. `PERF-005`: no heap traffic on the hot path. Rule 14: no full-world scan per frame.

### 6.1 Block mask, without a new Levels export

The world has no chunk grid. Use 16×16 cell blocks. Cell coordinates wrap to the area the same way the plugin already wraps units (`DEUS_Depth.js:539-548`):

```
wx = ((x % size) + size) % size
wy = ((y % size) + size) % size
bx = wx >> 4
by = wy >> 4
```

One-area maps loop. A window that crosses the seam reads the wrapped blocks. An unwrapped negative index is the mutant `cache_no_wrap`.

Per block, one `Uint32Array(256)`: one word per column, bit `e` set when stratum `e` is solid. 25 bits are enough (`e0..e24`). Four bytes × 256 = 1024 bytes. The word does not depend on `V`. A camera-level change does not rebuild it. `dHit` is a bit scan of the word at summary time (section 3.2).

Pool 16 of those arrays at load. An LRU of 16 blocks is the cap. A new block reuses the array of the dropped block. After load, the cache must not call `new Uint32Array`. The strata stay the authority. The cache is a derived view and is never saved.

**Fill, CR-19C-M8. Plan decision (within handoff §9 authority).** `solidMaskOf` and `locate` are private (`DEUS_Levels.js:1169`, `:1188`). `strataAt` allocates an object and four arrays (`:1624-1641`). `isSolid` is the whole cell. `airRunAt` treats fluid as a stop. No new Levels export is added. `DEUS_Levels.js` stays read-only. The bytes are already public. `UF.Depth.blockWord` is the cache reader the checks use:

- `UF.Levels.baseline(z, ax, ay).strata.m` is the `Uint8Array` of five material bytes per cell (`DEUS_Levels.js:986-989`, exported at `:4539`). Index `(wy * size + wx) * 5 + s`.
- Solidity of a byte: if bit `0x40` is set, not solid; otherwise `UF.Levels.STRATA_MATERIALS[byte & 0x3f].solid` (exported at `:4486`). Bit `0x80` does not clear the flag. This matches `SOLID_B` for every legal material byte.
- A changed cell is not in that array. It is the 22-hex-digit string at `UF.World.state.levels[String(z)].strata["ax,ay"][cellIndex]`, layout `[connector, m0..m4, hp0..hp4]` (`DEUS_Levels.js:989`). Material `s` is the byte at character offset `2 + 2*s`. A load-time `Uint8Array(128)` nibble table turns two `charCodeAt` results into the byte. No `strataAt`, no per-cell `Uint8Array`, no object.
- The fill follows `deltaLevels` / `locate` on bad records. If `state.strataSchemaVersion` is present and is not the current schema, ignore every saved hex record and fill from `baseline().strata.m` only (`DEUS_Levels.js:1133-1137`). If a record is missing, is not 22 hex digits, or fails `validRecord` (`:1115-1128`), skip it and use the baseline cell. Do not decode an unknown-schema bag, and do not consume an unreadable string as raw bytes.

The inner loop of a block fill writes the pooled word and allocates nothing. On binding a pooled slot to an area the slot stores, once, the area-key string and the five bag references (or null). Rebinding a slot may allocate that one string. The 256-column loop does not. `baseline()` on a cold area may build the area; New Game has already done that for a generated world. Generator `< 4` ground sets `legacyGround`, and `strata.m` is not the column `locate` uses. 19C worlds are generator 5 (`UF.Levels.groundVolumetric()` is true). If `legacyGround` is set, the cache does not fill and no plane binds.

`dHit` for the current `V` is the section 3.2 scan, done when the window summary is built, not per sprite and not per frame.

### 6.2 Window summary, with no GPU mask

Fold the warm blocks into a pooled `Uint8Array`, one `dHit` per cell of the canvas rectangle (23×19 at `PAD = 96`), plus:

- `exposed` = number of those cells with `dHit` in `1..4`
- `voids` = number with `dHit = 5`
- `presence` = a 5-bit mask, bit `d` set when some cell has `dHit = d`, for `d` in `1..4`

A plane is updated and drawn only when its presence bit is set. `maxD` alone is not enough: a shaft whose only hits are `0` and `4` must not bind, paint, or draw planes 1..3 (they have no pixels). The four plane objects and their canvases are still created with the scene. A hidden plane is not updated.

`exposed = 0` and `voids = 0` is the early-out: the two integer compares, no plane write, no void. `voids > 0` shows the void graphic and still skips planes whose bits are clear.

Rebuild the summary when the depth-canvas start tile changes, when `V` changes, when `H` changes, or when a block overlapping the canvas rectangle is dirty. The depth-canvas start tile is the live start tile minus 2 (section 3.5). Keying on `floor(displayX)` is wrong for 20 px of every 48. Rebuild in `updateTilemap` after the stock origin is set, so the wrapper's `(x + 2, y + 2)` index is already valid when the live `updateTransform` runs. Any of those bumps one generation integer before the depth update runs. A still camera on a clean window compares that generation and one packed flags word (`exposed` and `voids`). Both counts zero: return. A visible plane: write `x`, `y`, and `scale` only (section 6.4). The 30-frame animation rebuild still runs the wrapper (section 3.5); it does not rebuild this summary.

**No view mask.** A PIXI sprite mask is `MASK_TYPES.SPRITE` and is drawn by `SpriteMaskFilter` through a temporary render texture. That is the shader pass section 4.4 removes the color matrix to avoid, and `plane.filters` does not list a mask, so `no_production_filter` would not see it. The mutant `sprite_mask_production` must fail `no_sprite_mask`: no plane, and no child of a plane, has `.mask` set, and `SpriteMaskFilter` is constructed zero times.

Tiles bake ownership into the canvas paint. For plane `d`, `clearRect` the existing canvas, then `drawImage` only cells with `dHit = d`. The current plugin's "open cells are transparent" is not that rule: on `z ≤ 0` an `open` cell is an opaque tile and would hide a deeper plane. Cells the plane does not own are left clear. The roof substitute of section 3.5 covers an owned cell whose map tile is transparent.

Entities are not masked. Section 7 assigns each one to a plane and crops with `setFrame`.

There is no full-area bitmap and no second copy of `strata.m`.

### 6.3 Invalidation

Treat events as dirty marks. Recompute on the next depth update, not inside the handler.

`damageCell` calls `writeCell` first (`DEUS_Levels.js:1709-1713`). `writeCell` emits `levels:cellChanged` on any material change (`:1550-1566`). Only then does `damageCell` emit `levels:strataDestroyed`. A cache that ignores `strataDestroyed` and still applies `cellChanged` stays correct, so a mutant aimed only at `strataDestroyed` cannot fail `C-DIG`. `strataDestroyed` is not an invalidation source. The word rewrites from `cellChanged` alone.

| Event | Mask |
|---|---|
| `levels:cellChanged` | Re-read that column's bag pointer and rewrite its 25-bit word from section 6.1. If the word is unchanged, do not bump the window generation. If the block overlaps the canvas rectangle, bump the generation and set the live tilemap `_needsRepaint`. |
| `levels:strataDestroyed` | Ignore. Redundant with `cellChanged`. |
| `levels:strataChanged` alone | Ignore. An HP-only hit emits this and does not change solidity. |
| `levels:shapeChanged` | Not an exposure signal. A shape can change while the solid word does not, and a solid word can change while the derived shape stays `open`. |
| `levels:capChanged` / `levels:capBreached` | Ignore. `writeCap` redraws the live `+2` cell when the derived shape changes. |
| `world:created` | Drop every block. The current plugin already clears its open cache here (`DEUS_Depth.js:852`). |
| Save load | Drop every block. Load replaces `UF.World.state`. |
| Strata schema | Drop every block when `state.strataSchemaVersion` differs from the version stored on the cache. Migration runs before the new world is current; the version compare covers a state that arrives without a second event. |

The LRU slot stores the `state` object it was filled from and that schema version. A lookup whose `World().state` is a different object is a miss, and the whole LRU is reset before the miss fills. Block keys are `(area.x, area.y, bx, by)` plus that identity. After a New Game the same coordinates name another world's columns.

Mark block `(area.x, area.y, bx, by)` using the wrapped coordinates. If that block is not cached, do nothing; the next visit builds it. If it overlaps the canvas rectangle, rewrite the one column (the other 255 words stay) and bump the generation.

The mutant `cache_ignores_destroy` ignores `cellChanged` and `strataDestroyed`. Neither rewrites the word. `C-DIG` then sees the old word. Ignoring only `strataDestroyed` is not that mutant, and it must not be treated as caught.

Tile appearance still follows `world:levelTileChanged` / `world:tileChanged`, and only for a plane that is bound and whose window contains the cell. Neighbour autotile refresh (`redrawAround`) stays that path. It is not a 256-column mask rebuild.

### 6.4 Per-frame contract

Camera still, no dirty block, no water in a bound window, no tracked unit motion. This includes a window with `exposed > 0` and planes actually visible.

The update starts with two integer compares: the summary generation and the packed `exposed`/`voids` word. If the generation matches and both counts are 0, it returns. If the generation matches and a plane is visible, the only further writes are `x`, `y`, and `scale` on objects that already exist. Either way the still frame does all of the following:

- zero canvas uploads
- zero `peekArea`
- zero area-wide shape-grid scans (`hasOpenCells` and anything like it). A single `shapeCodeAt` during a tilemap repaint is an index into the grid the painter already built. It is not on this still-frame path.
- zero `new`, zero `{}`, zero `[]`, zero `.map` / `.filter` / `.concat`, zero string concatenation inside the depth update, inside a plane repaint, and inside the `_addSpot` wrapper (including the 30-frame live rebuild)
- zero `getImageData` / `putImageData` / `new ImageData` / `new Bitmap`

The only legal per-frame writes for a visible plane are `x`, `y`, and `scale` on objects that already exist, plus `x` and `y` on entity sprites that already exist. `exposed = 0` and `voids = 0` skips even that.

These today's allocations do not survive:

| Today's site | Replacement |
|---|---|
| `entityWindow` builds a string key and a new object | One scratch window object from load. Compare `dx` and `dy` as integers against two fields. |
| `placeEntities` allocates a foot point per sprite | Write `s.x` and `s.y` from locals. |
| `children.sort` with a new closure every frame | No sort on the still path or the single-walker path. Membership changes reorder by splicing the existing child, using one comparator function created at load. |
| `Depth.center()` and `unprojected()` return new objects | Two scratch points from load. Callers read the fields before the next call. |
| `rebuildUnits` / `rebuildItems` / `rebuildWalls` do `new Set` | Membership rebuild runs on add and remove events, not per frame. It reuses one `Set` from load via `.clear()`. |
| Shade-at-paint `getImageData` | Forbidden on the repaint path (section 5.3). |

A unit walking on a lower plane, staying inside the window, updates the existing sprite's coordinates and nothing else. It does not rebuild the set and does not allocate.

Allocation that is legal: the block pool, the shade table, the nibble table, the scratch objects, and the sprite-object pool, all at load or scene create. Shaded sheet copies are legal only after the R1 = D revisit, built at scene start. A strata event that writes into a pooled array is legal. A strata event that allocates is not. Sheet-copy `ImageData` is legal only in that build.

`UF.Depth.stats()` keeps `frameAllocs`, `summaryRebuilds`, `canvasUploads`, `peeks`, `filterConstructs`, `maskConstructs`, `offPaletteTexels`. There is no mask upload counter: there is no mask. `frameAllocs` resets at the start of the depth update. The counter is not the proof of zero allocation. It only sees paths the implementer instrumented. The proof is `C-LIVE-ALLOC` (section 8.2), the same idea as `tools/test_strata_foundation.js` `no_allocation_queries`: `--expose-gc`, no GC, heap growth under 1 byte per frame. That check runs the live `Tilemap.prototype._addAllSpots` with the wrapper installed, so the 30-frame rebuild is in the sample. Heap around the wrapper body is the wrapper's budget. The mutant `alloc_unwired` leaves `frameAllocs` at 0 while the update allocates, and `C-LIVE-ALLOC` still fails.

`C-STILL` / `C-ALLOC` at `exposed = 0` stay. They return after the early-out. They do not satisfy this section.

### 6.5 Steady-state memory

| Item | Bytes |
|---|---:|
| Sixteen block words | 16,384 |
| Shade table, 226×5 | 1,130 |
| Nibble table | 128 |
| Window `dHit`, 23×19 | 437 |
| Eight plane canvases (4 planes × 2 layers × 1104×912×4) | 32,219,136 |
| Shaded sheet copies, until R1 = D is lifted | 0 |

Each canvas is `1104 * 912 * 4 = 4,027,392` bytes. The eight canvases are created with the scene whether or not the presence bit is set. Under R1 = D every table column equals the source, so no shaded copy is kept. A sheet with no master texel is skipped even after the revisit.

Tileset 92's four runtime sheets are 2,027,520 px, which is 8,110,080 bytes per copy. Four unshared depths would add 32,440,320 bytes for that tileset alone. After palette migration, share one copy among depths whose columns are equal (two copies under the recorded candidate, 16,220,160 bytes for tileset 92) and build them at scene start. The character LRU adds at most 32 such copies.

None of this is per frame, and none of it is a second copy of the area strata (the 19A figure is 2,129,920 bytes with shape grids, budget 3.5 MB). A design that keeps five map-sized bitmaps fails `full_map_bitmap`.

---

## 7. Entities, walls, and what stays off the plane

An entity whose macro-level `zE` is below `V` is a candidate for plane `d = V - zE`. `zE` is the level the entity is stored on (`unitsInArea(…, z)`), which is the level `derivePacked` gave a floor, including a lip. It is not `floor(e / 5) - 2` of the solid bit under that lip.

A unit standing on a lip (all air in its cell, solid `S4` below) has `worldStrataElevationAt = 9` when that cell is `Z0`. Section 3.2 assigns that hit to band `Z0`, so `dHit = 0` at its feet. The unit's `zE` is `0`, not `−1`. From camera `V = 0` it is not a depth-plane candidate. The normal spriteset draws it. From a higher camera, `d = V - 0` and the foot column's `dHit` equals that `d`, so it is drawn on that plane and not on the plane of the solid bit's raw band.

Draw a candidate only when the foot column has `dHit = d`.

- That match is the creature standing on the surface the ray hit, including a lip owned by this band.
- Solid anywhere above the creature (`dHit < d`): the sprite is omitted. Do not draw a crown into a neighbouring hole.
- Hole through this level (`dHit > d`): this plane draws no floor and no entity. The creature is a candidate of the deeper level whose `d` equals `dHit`, and that level's entity list is the one that contains it.

No sprite mask and no masked container. Tall frames are cropped with `setFrame` against the columns they overlap. A 48×96 wall covers the foot cell and the cell to the north, where the cap sits. The foot rule above decides whether the sprite exists. The north cell decides the cap: if the north cell's `dHit` is not `d`, `setFrame` keeps the lower 48 px (the face) and drops the upper 48 px (the cap). If both cells match, the frame is the full 96 px.

A sprite wider than 48 px whose east or west column has a different `dHit` is cropped the same way on X: `setFrame` keeps the 48 px strip of the foot cell and drops the overhang whose column's `dHit` is not `d`. A rectangle cannot express L-shaped ownership. The crop is the largest axis-aligned rectangle that includes the foot cell and only cells whose `dHit` equals `d`. Any cell of the authored frame outside that rectangle is dropped, including an L-shaped remainder. The crop is the rule that wins. A GPU mask is not a second opinion.

Standing frames only, off the viewed level. The set rebuild stays on the existing object, item, and unit events. If the window cell is unchanged, no unit was added or removed, and the summary generation is unchanged, do not sort and do not rebind frames. Positions of tracked units follow every frame by writing existing sprite coordinates (section 6.4).

Entity pixels come from the source sheet (section 5.3). There is no per-entity bitmap and no 256-bitmap pool. The sprite-object pool is allocated with the scene. Overflow increments a counter and skips; it does not allocate. Under R1 = D every body pixel is the source texel. After palette migration, a master-palette body pixel on a non-identity column is the table's hex, and a non-master body pixel stays the source texel.

Active-level units stay on the normal spriteset. Depth planes do not draw them again.

Fog, fire, the flood overlay, speech, stance rings, and designations stay off the lower planes.

Two-grid walls, doors, and cliff faces on a lower plane keep the authored upper 48 px when the north cell's `dHit` matches. Those texels are already on the void ramp or are non-master and pass through (section 5). The lower 48 px is the material face. Under R1 = D it is the source texel. After palette migration it is shaded along that material's ramp when the texel is a master hex. The renderer does not draw a second cap in code and does not tint the cap with a shader.

Cycling production presets and the three eye heights changes no unit position, no stratum byte, no derived shape, and no object.

---

## 8. Pre-attack tests

The harness does not exist yet. This section is the contract for `tools/test_global_depth_renderer.js`. A missing function anchor or a missing patch anchor exits **2**. An assertion failure exits **1**. A correct build exits **0**.

A mutant run's exit code comes only from its checks. It must not hardcode exit 1. The driver fails the gate if any mutant run exits 0, if any mutant run exits 2, or if the check named for that mutant is not among that run's `FAIL` lines. Extra `FAIL` lines are allowed. A green mutant is a failed gate, not a passed one.

No check may print a hardcoded success. Until a check has been seen failing on its mutant, the check is specified, not passed. This session did not run the harness. Nothing here is a claimed frame time or a claimed screenshot.

### 8.1 Three harnesses

| Harness | Runs | Does not run |
|---|---|---|
| Node vm, no PIXI. Same plugin load as `tools/test_strata_foundation.js`. | Column oracle, `tilePx`, shade table, `blockWord`, wrap, world-identity. | Pixels, filters, sprites, applied `plane.scale`, layer size, upload counters. |
| Node vm, PIXI stub, `node --expose-gc`. The stub records `scale`, `mask`, `filters`, `setFrame`, `visible`, construct counts, and canvas draw calls. Its `x` / `y` / `scale` setters allocate nothing. It includes stock `Tilemap.prototype._addAllSpots` so the live wrapper can run. | Binding, `O-SHAFT-DRAW`, `O-Z0`, filter and mask constructs, entity visibility and crop, `C-LIVE-ALLOC`, `S-RELATIVE`, `S-SCALE-INT`, `S-PAD`, `C-STILL`, `C-HP`, `C-ALLOC`, `C-ONE`. | The composited framebuffer. |
| nw.js, the way the old depth suite ran through `tools/test_snapshot.js`, with `--js-flags=--expose-gc` when an allocation check is repeated there. Handoff §10.1 asked for pure Node.js VM execution; this render harness is the departure recorded in section 9. | `P-CUTOUT`, `S-PAL-CANVAS`, `S-PASS`, `S-SHADE-VIS`, `palette_exact`, `void_palette`, `alpha_locked`, the picture gate, the panning benchmark. | — |

Oracle functions live in the test file. They recompute `dHit`, `tilePx`, and the identity shade table from strata bytes, the hex file, and the registry. They do not call `shapeAt`.

Worlds: seeds `18`, `3`, `21`, `4` (the 19B regression set), area `(0, 0)`, generator 5. Surgical columns use `Levels.setStrata` on a fresh vm and never satisfy "this seed's generated cut" assertions. `strataAt().changed === false` is required on scanner hits that claim to be generated. `strataAt` is legal in the test. It is not legal in the fill or the frame.

Invocation: `node tools/test_global_depth_renderer.js [--seed=18] [--mutant=<name>]`. The nw.js checks are a second entry the same file selects with `--render`, or the driver shells to nw.js. A node-only run that skips a render check named by the mutant exits 2, not 0.

Exported oracle the plugin must grow (a missing export is exit 2):

| Export | Returns |
|---|---|
| `UF.Depth.columnHit(area, x, y, V)` | `{ e, zHit, dHit }` with `dHit` in `0..5`, using section 3.2. Reads the cached block word (fill-on-miss). |
| `UF.Depth.blockWord(area, x, y)` | The 25-bit column word from the cache (fill-on-miss), coordinates wrapped as in section 6.1. |
| `UF.Depth.tilePx(H, d)` | integer pixel step |
| `UF.Depth.shadeIndex(colorIndex, d)` | master slot, or the same index at `d = 0` |
| `UF.Depth.windowSummary()` | `{ exposed, voids, presence, generation }` |
| `UF.Depth.stats()` | the counters in section 6.4 |

### 8.2 Checks

Each row is the build and the expected result. "Node" and "stub" and "nw" name the harness.

**Column (node).**

| Id | Build | Expect |
|---|---|---|
| `O-MEADOW` | Five stone at `V` | `dHit = 0`. `zHit = V + 1` (the viewed `S4` shifts up, then the clamp holds `dHit`). No plane draws the column. |
| `O-ROOF-V` | `V = [air×4, stone]`, and `V−1` `S4` is air | `dHit = 0`. Derived shape is `open` as a precondition (exit 2 if it is not). The hit does not follow the shape. A solid `S4` below would derive `floor` (a lip) and `shape_open_is_hole` would never fire. |
| `O-LIP` | Solid through `e9`, air from `e10` up, `V = 0` | `e = 9`, `zHit = 0`, `dHit = 0`. Plane 1 does not draw the column. `e9` and `e10` are not the same bit. The old `floor(e / 5) - 2` answer (`dHit = 1`) fails this check. |
| `O-DECK` | `V` air, `V−1 = [stone, air×4]` | `dHit = 1`, `zHit = V − 1`. A query of plane 2's ownership for this column is clear. |
| `O-SHAFT-4` | Air `+2` through `−1`, `−2 = [stone, air×4]`, `V = +2` | `e = 0`, `zHit = -2`, `dHit = 4`. This is the column oracle only. |
| `O-SHAFT-LIP` | Air `+2` through `−1`, `−2 S4` stone, `V = +2` | `zHit = -1`, `dHit = 3`. Plane 4 does not own the column. |
| `O-VOID` | Air from `eStart` through `0` | `dHit = 5` |
| `O-WATER` | Stone `S0`, water `S1..S2` | Hit is the stone, not the water |
| `O-LAVA` | Lava over stone at `−2` | Hit is the stone |
| `O-SHELF` | `[stone, air, stone, stone, stone]` as `V` | Hit is `S4` of that cell, `dHit = 0` |
| `O-CAP` | `+2` five air, cap present, nothing solid below | From `V = +2`, `dHit = 5`. Cap does not add a plane. |
| `oracle_uses_shapes` | Count `shapeAt` / `shapeCodeAt` / `shapeGrid` calls around `columnHit` on `O-ROOF-V` | Zero calls. |

**Binding (stub).**

| Id | Build | Expect |
|---|---|---|
| `O-SHAFT-DRAW` | The `O-SHAFT-4` column in view, `V = +2`, `maxDepth` 4 | Plane 4 is visible and its painter was asked to draw that cell. Planes 1..3 were not, unless some other column sets their presence bit. A `maxDepth` clamp of 2 leaves plane 4 unbound. `columnHit` still returns 4 either way, so this check, not `O-SHAFT-4`, is what kills `max_depth_clamped_2`. |
| `O-Z0` | The ground-cut column, `V = 0` | `columnHit` returns `dHit = 2`, and the binder binds plane 2. `config.exposes` is not consulted. `exposes_surface_only` returns before that bind. |
| `O-Z-2` | Any column, `V = -2` | No plane bound. Presence is 0. |

**Scale (node).**

| Id | Build | Expect |
|---|---|---|
| `S-120` | `tilePx(120, d)` | `46, 44, 43, 41` |
| `S-160` | `tilePx(160, d)` | `47, 45, 44, 43` |
| `S-90` | `tilePx(90, d)` | `45, 43, 41, 39` |
| `S-ACTIVE` | Depth 0, every production `H`, every `V` | `tilePx` is 48 and the live map scale is 1. This check does not read a lower plane. |

**Scale (stub).**

| Id | Build | Expect |
|---|---|---|
| `S-RELATIVE` | Bind with `V = +1`, then `V = +2`, `H = 120`. Read `plane.scale.x * 48` on the plane showing `z = 0`. Then the plane showing `z = +1` from `V = +2`, and the plane showing `z = −1` from `V = 0`. | `z = 0` from `+1` is 46, then from `+2` is 44. `z = +1` from `+2` and `z = −1` from `0` are both 46. A scale table keyed on `z` fails. Node `tilePx(H, d)` cannot see this mutant. |
| `S-SCALE-INT` | Read `plane.scale.x` for each bound depth | `plane.scale.x * 48` is an integer equal to `tilePx(H, d)`. A raw `H / (H + 5d)` written onto the plane fails. A wrong `tilePx()` fails `S-120` as well. |
| `S-PAD` | `PAD`, the constructed layer size, and the inequality at every production `H` and `d` in `1..4` | Pad is 96. The layer bitmap is 1104×912 for an 816×624 view. `PAD * tilePx / 48 ≥ shift + 1` holds, including `H = 90`, `d = 4` (`78.0 ≥ 77.5`). `PAD = 48` yields 1008×816 and fails the inequality. |

**Shade (node, except the three nw rows).**

| Id | Build | Expect |
|---|---|---|
| `S-SHADE-ORACLE` | Every master slot, `d` in `0..4` | `shadeIndex` equals the identity table (section 5.2). The three void ids are identity. |
| `S-MONO` | Every master slot | Registry luminance of `shadeIndex(slot, d)` never increases with `d`. |
| `S-STEP` | Count slots with `shadeIndex(slot, 1) ≠ slot`, excluding the three void ids | The count is 0. A ramp-step table, or any non-identity map, fails. After palette migration this expect flips to the revisited rule. |
| `S-PAL` | Every master slot, `d` in `1..4` | The slot is one of the 226. The three void ids are identity. This check does not prove a step happened. |
| `S-PAL-CANVAS` | nw, `deus`, fixture `tools/test_fixtures/depth_shade_master.png`. Missing fixture exits 2. | Every opaque texel equals the source RGB (master or not). A `round(k * channel)` pixel that is off-list fails. `shadeIndex` cannot see this mutant. |
| `S-PASS` | nw, the fixture's known non-master texel. Missing fixture exits 2. | The painted texel equals the source RGB. A nearest-master quantise fails. |
| `S-SHADE-VIS` | nw, `deus` versus `deus_scale`, one master texel on the fixture. Missing fixture exits 2. | The two presets match the source hex. A plane that darkens the master texel fails. After palette migration this expect becomes the revisited step. |

**Cache (node).** `C-DIG`, `C-WORLD`, and `C-WRAP` compare `UF.Depth.blockWord`. `columnHit` reads through the same cache.

| Id | Build | Expect |
|---|---|---|
| `C-FAR` | `cellChanged` outside the canvas rectangle | That block marked dirty if cached. Summary generation unchanged. |
| `C-DIG` | Destroy one in-window stratum (the writer emits `cellChanged` and then `strataDestroyed`) | `blockWord` for that column changes. The other 255 words stay. The next update has the new `dHit`. A listener that ignores only `strataDestroyed` still passes, and is not a kill of `cache_ignores_destroy`. |
| `C-WORLD` | Fill a block, replace `World().state` (`world:created` or a load), same area coordinates, different strata | The next `blockWord` does not return the previous world's word. |
| `C-WRAP` | One-area map, column `x = -1` and column `x = size - 1`, on a row `y` where `blockWord(size-1, y) ≠ blockWord(size-1, y-1)` | The same word. An unwrapped read of `x = -1` that picks the neighbour row is visibly wrong. |

**Cache (stub).** These read upload and rebuild counters, constructed layer size, or "no plane bound".

| Id | Build | Expect |
|---|---|---|
| `C-STILL` | 120 frames, camera still, `exposed = 0`, `voids = 0` | `frameAllocs = 0`, `canvasUploads = 0`, `peeks = 0`, `summaryRebuilds = 0` after the first build. Necessary, not sufficient. |
| `C-HP` | HP-only `strataChanged` | Word unchanged, no summary rebuild, no upload. |
| `C-ONE` | One shape-`open` cell in the area, outside the canvas rectangle, and no in-window `dHit ≥ 1` | `exposed = 0`, no plane bound. |
| `C-ALLOC` | During `C-STILL` | The instrumented counter stays 0. This does not run the exposed path. |

**Allocation (stub, `--expose-gc`).**

| Id | Build | Expect |
|---|---|---|
| `C-LIVE-ALLOC` | Warm the canvases. Five-level opening, `exposed > 0`, plane 4's presence bit set. Camera still. Stock `Tilemap.prototype._addAllSpots` runs with the wrapper installed, so 240 frames include 8 live-spot rebuilds (`animationFrame` every 30). 120 frames with units still, then 120 frames with one unit walking on a lower plane inside the window. | `gc` count does not rise during the 240 frames. `heapUsed` grows by less than 1 byte per frame. Heap sampled around the wrapper body is the wrapper's budget: zero GCs, growth under 1 byte per frame. `frameAllocs` is 0. A counter that stays 0 while a `{}` runs still fails the heap side. Stock Tilemap allocations outside the wrapper are reported and are not this check's fail. `C-ALLOC` is not this check. |

**Render (nw, unless noted).**

| Id | Build | Expect |
|---|---|---|
| `P-CUTOUT` | Seed 18, generator 5, area `(0,0)`, cameras `+2`, `+1`, `0`, `−1`. For each camera, one generated column of each class that exists: roof (`dHit = 0`, shape `open`), hole (`dHit` in `1..4`), void (`dHit = 5`), live (`dHit = 0` and the stock tile is opaque). Move the focus onto that column. Sample the composited centre texel. Also: one sample with origin remainder `r < 20` (`ox = 48k + r`), and one surgical seam roof (`mx` unwrapped would be `< 0` or `≥ size`, wrapped cell is a `+1` roof, `V = +1`). | Roof: the hit material's `rock` / `soil` tile, not `#0C0D12`, not a lower plane, not `mined_stone`. Hole: plane `dHit`'s texel, not the live tile and not a deeper plane. Void: `#0C0D12`, not the sky. Live: the same texel with the planes toggled off. Under preset `off`, a roof is still the fallback tile and a hole is `#0C0D12`. The `r < 20` sample lands on the named column, not the neighbour. The seam roof is the fallback tile, not `open_air` and not the void. A class the seed does not contain is reported absent after a full scan. A present class that is not sampled fails the check. The review's `(175,46)` on `V = +1` is a roof of this class. |
| `palette_exact` | `deus_scale`, nw | Every opaque plane pixel is a source-canvas texel. `smooth = true` fails. |
| `no_production_filter` | Stub or nw, production `deus`, F7 cycle | `filterConstructs = 0`. No plane filter list contains `BlurFilter` or `ColorMatrixFilter`. |
| `no_sprite_mask` | Stub | `maskConstructs = 0`. No plane and no plane child has `.mask` set. |
| `void_palette` | nw, a `dHit = 5` column | Centre texel is `#0C0D12`. Not `#08080C`. Not the parallax clear color. |
| `alpha_locked` | nw, a solid floor pixel on a bound plane | The composited texel equals that plane's own texel. `plane.alpha` is 1. A blend with the void fails. |
| `entity_under_roof` | Stub, a unit in a window cell with `dHit < d` | The sprite is not visible. No body pixel in a shaft from that sprite. |
| `entity_clip` | Stub, a 48×96 wall whose north cell has a different `dHit`; and a sprite wider than 48 px whose east or west column has a different `dHit` | North mismatch: `setFrame` height is 48, the lower half. East/west mismatch: `setFrame` width is 48, the foot cell. No `.mask`. An L-shaped remainder is dropped. |
| `standing_frame` | Stub, 60 frames, a lower-plane unit | The frame rectangle does not change. |
| `no_physics_write` | Node, snapshot strata bytes, one shape code, and one unit position; run the F7 cycle and the three eye heights | The snapshot matches. |
| `overburden_as_ray` | Node, a meadow (`hasOpaqueOverburden` false) and `O-ROOF-V` | Meadow `dHit = 0`. Roof `dHit = 0`. An exposure path that calls `hasOpaqueOverburden` to decide the hole fails the meadow. |

### 8.3 Failure scenarios

Each row is a build that looks plausible and is wrong. The check name is what must go red.

| Scenario | Wrong behaviour | Check that goes red |
|---|---|---|
| Roof at `S4`, shape `open`, `columnHit` follows the shape | Shape grid used as the hole | `O-ROOF-V` |
| `hasOpaqueOverburden` false on a meadow, so the meadow binds planes | Roof query used as the ray | `overburden_as_ray` |
| `columnHit` calls `shapeGrid` and happens to match on meadows | Oracle reads shapes | `oracle_uses_shapes` |
| Pool hides the rock under the water | Ray stops on fluid | `O-WATER` |
| Camera on `Z0` binds nothing | `exposes` still `z > 0` | `O-Z0` |
| From `+2`, plane 4 never binds | `maxDepth` clamped to 2 | `O-SHAFT-DRAW` |
| `Z+1` drawn at depth-2 size while the camera is on `+2`, and at depth-2 size again while the camera is on `+1` | Scale keyed by absolute `Z` | `S-RELATIVE` |
| `plane.scale` is `H / (H + 5d)` | Rounded step not applied | `S-SCALE-INT` |
| `tilePx` returns the free float, or depth 4 at `H = 120` is not 41 | Step function wrong | `S-120` |
| `bitmap.smooth = true` | Linear filter | `palette_exact` |
| `deus` constructs `BlurFilter` or `ColorMatrixFilter` | Current preset left in place | `no_production_filter` |
| A plane or a child has `.mask` set | Sprite mask filter | `no_sprite_mask` |
| Shade writes `round(k * channel)` into the canvas | Off-palette paint | `S-PAL-CANVAS` |
| The shade table applies a ramp step, or any non-identity map | Value recession before the art is on the palette | `S-STEP` |
| `deus` and `deus_scale` differ on a master fixture texel | Color darkening while R1 = D is in force | `S-SHADE-VIS` |
| A stock texel is quantised to the nearest master | ADR-002 transition ignored | `S-PASS` |
| Void pixel is the sky or `#08080C` | Old void, or parallax left visible | `void_palette` |
| Plane alpha `k(d)` | Alpha fade | `alpha_locked` |
| One open cell at the far corner binds four planes | `hasOpenCells` | `C-ONE` |
| Every `strataChanged` rebuilds the window | HP event treated as exposure | `C-HP` |
| Digging one cell leaves the old word | `cellChanged` ignored | `C-DIG` |
| Still camera, `exposed = 0`, allocates | Early-out path allocates | `C-ALLOC` |
| Opening in view, or a walking lower unit, allocates | Live path allocates | `C-LIVE-ALLOC` |
| `frameAllocs` stays 0 because it is never incremented | Counter unwired | `C-LIVE-ALLOC` |
| After New Game the old word is served | Cache ignores world replacement | `C-WORLD` |
| `x = -1` misses the wrapped column | Block index not wrapped | `C-WRAP` |
| Ground cut still shows `peak_rock`, or a `+1` roof shows the void | Live `_addSpot` not wrapped | `P-CUTOUT` |
| Unit under a solid roof still draws | Entity test ignores `dHit` | `entity_under_roof` |
| Tall wall draws its cap into a column with a different `dHit` | No `setFrame` crop | `entity_clip` |
| Lower-plane unit advances its walk cycle | Animation off the live level | `standing_frame` |
| Cap stored as `e = 25` or a sixth plane | Model extended past `+2` | `O-CAP` |
| Preset cycle moves a unit or a stratum byte | Visual path writes simulation | `no_physics_write` |
| `PAD = 48` | Canvas 1008×816, edge bare at `H = 90` depth 4 | `S-PAD` |

### 8.4 Mutants

In-memory source patches, same mechanism as `tools/test_strata_foundation.js`. A missing patch anchor exits 2. Each mutant must exit 1, and the named check must appear in its `FAIL` lines. The driver fails a mutant that exits 0.

| Mutant | Patch | Must fail |
|---|---|---|
| `shape_open_is_hole` | `columnHit` returns `dHit = 1` when the shape is `open` | `O-ROOF-V` |
| `overburden_as_ray` | Exposure uses `hasOpaqueOverburden` | `overburden_as_ray` |
| `fluid_stops_ray` | Water or lava sets the solid bit | `O-WATER` |
| `max_depth_clamped_2` | Clamp `maxDepth` to 2 in the binder | `O-SHAFT-DRAW` |
| `exposes_surface_only` | Binder returns early unless `z > 0` | `O-Z0` |
| `absolute_z_scale` | `tilePx` and `plane.scale` depend on `z`, not on `d` | `S-RELATIVE` |
| `float_scale` | `plane.scale` is set to `H / (H + 5d)` | `S-SCALE-INT` |
| `smooth_on` | `bitmap.smooth = true` | `palette_exact` |
| `blur_on_deus` | Production `deus` constructs `BlurFilter` | `no_production_filter` |
| `colormatrix_production` | Attach `ColorMatrixFilter` on `deus` | `no_production_filter` |
| `sprite_mask_production` | Set `.mask` on a plane | `no_sprite_mask` |
| `palette_lerp` | The canvas write uses `round(k * channel)` | `S-PAL-CANVAS` |
| `shade_stepped` | The table applies one ramp step at depths 1–2 (the deferred candidate, or any non-identity map) | `S-STEP` |
| `quantise_stock` | Non-master texels snap to the nearest master hex | `S-PASS` |
| `void_off_palette` | Void fill `#08080C`, or the parallax left visible | `void_palette` |
| `alpha_fade` | Plane alpha follows the depth | `alpha_locked` |
| `full_grid_open_scan` | Bind planes if any `SHAPES.open` exists in the 256×256 | `C-ONE` |
| `strata_changed_dirties` | HP-only event bumps the summary | `C-HP` |
| `cache_ignores_destroy` | Neither `cellChanged` nor `strataDestroyed` rewrites the word | `C-DIG` |
| `cache_ignores_world` | The LRU is not dropped on `world:created` or on a state-identity change | `C-WORLD` |
| `cache_no_wrap` | Block index uses the raw `x` with no modulo | `C-WRAP` |
| `alloc_per_frame` | The update allocates an object after the early-out, on a path `exposed > 0` actually reaches | `C-LIVE-ALLOC` |
| `alloc_unwired` | The same allocation, and `frameAllocs` is never incremented | `C-LIVE-ALLOC` |
| `entity_ignores_roof` | Draw the lower unit whenever it is in the window | `entity_under_roof` |
| `pad_48` | Pad stays 48 | `S-PAD` |
| `cap_is_plane` | Cap creates a `dHit` outside `0..5` or a fifth plane | `O-CAP` |
| `live_cutout_off` | The live `_addSpot` is not wrapped | `P-CUTOUT` |

`oracle_uses_shapes`, `no_physics_write`, `entity_clip`, `standing_frame`, `S-SHADE-VIS`, `S-SHADE-ORACLE`, `S-MONO`, and `S-PAL` are checks with the builds in section 8.2. A patch that trips one of them is a failed run under the same exit rule. The named mutants above are the minimum set: dropping one from the driver fails the gate.

### 8.5 Picture gate (later, not this session)

Handoff §10.3 is the gate. The earlier single-camera reduction is withdrawn. Nothing in section 9 reduces it further.

When implementation starts, on a seed from `18`, `3`, `21`, `4` (generated terrain, not a hole painted by the test):

1. One 1.00× frame with the camera on `+2` in which portions of all five macro-levels are actually visible (`dHit` values 0 through 4 all present in the shot). Repeat at `H = 160`, `120`, and `90`, plus a `deus_scale` frame at 120.
2. One inspected 1.00× screenshot at `H = 120` for each camera `−2`, `−1`, `0`, `+1`, `+2`.

Each shot names the column class under the sample:

| Camera | Column the shot must name |
|---|---|
| `+2` | A `dHit = 4` bed, and a `dHit = 0` cell |
| `+1` | A roof (`dHit = 0`, shape `open`) and a hole (`dHit ≥ 1`) |
| `0` | A ground cut (`dHit ≥ 1`) and a lip (`dHit = 0`, shape `floor`) |
| `−1` | A shaft (`dHit ≥ 1`) |
| `−2` | A sealed cell, and a void cell if the seed has one |

The person who signs the gate opens the files and writes what is in them. `P-CUTOUT` is the automated form of the same samples. The signed gate is still a person looking at the pictures.

On those frames: a roof column is the hit material's `rock` / `soil` look, not the void and not a dug floor; a hole column is the plane the ray names and the next plane's contribution at that pixel is 0; a viewed-level floor pixel is unchanged with the planes toggled; under `off` a hole is the void texel; an entity on an exposed lower floor is a child of that plane at `tilePx(d) / 48` with no filter and no mask; the same entity under a solid roof is absent; a tall sprite's cap does not appear in a column whose `dHit` differs, and a wide sprite's east/west overhang is dropped the same way; every opaque master pixel is a master hex; non-master pixels match the source. Depths separate by scale. They do not separate by color until the shade revisit.

60 FPS is not claimed here. The measurement method, when someone runs it, is: editor closed, simulation idle, zoom locked at 1.00×, two interleaved rounds of 60 frames, median and worst of the engine tick (`Graphics.FPSCounter.duration` or the harness equivalent). Report the planes-off baseline in the same run.

| Case | Bar |
|---|---|
| `exposed = 0`, `voids = 0`, camera still | Depth-root median ≤ 0.02 ms. No peek, no canvas upload, no entity walk. |
| Same scene, one `cellChanged` outside the window | Summary not rebuilt. Depth root stays on the early-out. |
| Still camera, five-level opening, no water, units still, production preset | Zero depth-canvas repaints per frame. Added tick versus planes disabled ≤ 2.00 ms median. Depth-pass render ≤ 6.00 ms median. Whole engine tick ≤ 16.7 ms median. |
| Planes-off baseline already above 16.7 ms | Say so. The depth delta still has to meet 0.02 ms (hidden) or 2.00 ms (opening). Do not call the frame 60 FPS. |
| One dirty plane, forced window repaint | That plane under 16 ms. The other planes do not repaint on that frame. Heap sampled immediately before and after that plane's paint and flush grows by less than 1 byte. |
| A1 water in one lower window | That plane may repaint every 30 frames. The others do not. |
| Pan benchmark | Canvases warmed first. Camera steps one cell every 8 frames, four presence bits set, 120 frames. Report GC count and repaint ms. A GC or a heap growth of 1 byte or more inside a depth-canvas flush fails. A GC or a heap growth of 1 byte or more inside the `_addSpot` wrapper fails. Stock Tilemap allocations outside the wrapper are reported separately and are not a depth-pass fail. |
| Debug blur forced on, then off | On: off-palette blends appear. Off: `filterConstructs` does not rise further, filter list is empty, added tick returns to the production number within 0.5 ms. |

The 2.00 ms added-tick bar is the budget with no `BlurFilter`, no `ColorMatrixFilter`, and no `SpriteMaskFilter`. The live cutout skips rects inside the tilemap's existing paint. It is not a new pass, and it is not a reason to put a filter back. If a measured opening needs more than 2.00 ms, the report says the number and stops.

### 8.6 Seven performance questions

Answered for the future implementation, as requirements.

1. Recurring update work: yes, a depth-root update. It must return after two integer compares when the window is clean and nothing is exposed.
2. New draw calls: yes, up to four planes, and only for planes whose presence bit is set, and only for columns whose `dHit` equals that plane. `exposed = 0` means zero lower-plane draws. The live map draws fewer rects where `dHit ≥ 1`, not more.
3. Hot-path allocations: forbidden on the depth update, the plane repaint, and the `_addSpot` wrapper. Section 6.4. Sheet build is outside that path.
4. New textures: the eight plane canvases (32,219,136 bytes), created with the scene, not per frame. No shaded sheet copies until R1 = D is lifted. No mask texture. No per-entity bitmap. No map-sized bitmap.
5. New cache: the 16×16 solid-word blocks, keyed by world-state identity. Derived, dropped by LRU, rebuilt from public strata bytes, never saved.
6. Save size: none. The planes are derived. No new save field.
7. Startup: one identity shade-table build from the 226 hexes, one pool alloc. No shaded tileset copies. After palette migration, copies build at scene start and are shared across equal table columns. Not a full-world raycast at New Game.

---

## 9. Conflicts resolved

These are the sentences an implementer will otherwise follow from an older doc, and the decisions CR-19C asked the plan to make.

| Older sentence or open decision | This plan |
|---|---|
| The live tilemap is see-through exactly where `dHit ≥ 1`, because of how it is painted | It is not. `DEUS_Depth` wraps the live `_addSpot` (section 3.5). `DEUS_Levels.js` and `DEUS_WorldGen.js` stay read-only. **Plan decision (within handoff §9 authority), B1.** |
| A lip (`S4` of the band below) is a full level down, `dHit = 1`, drawn by plane 1 | It is one foot down. `zHit = floor((e + 1) / 5) - 2`, `dHit = max(0, V - zHit)`. The live map and that level's entity list already own it. **Plan decision (within handoff §9 authority), B1.** |
| Handoff §2: query `hasOpaqueOverburden`, `continuousAirHeight`, and `worldStrataElevationAt` for sight | Those stay gameplay adapters. Exposure is `columnHit` (section 3.2). |
| Handoff §2: the ceiling cap is a sight stop | The ray ignores the cap. `O-CAP` locks that. The cap stays overburden for a creature inside `+2`. |
| Handoff §5 and pre-19C §2.3: a `ColorMatrixFilter` at `k(d) = 1 - 0.04d`; the 2026-09-24 brief's 96 / 92 / 88 / 84 % | The filter is a production fail. The 4% nearest-luminance pick changes 0 of 226 colors at depths 1 and 2 on this registry. The ramp-step proposal darkens depths 1–2 to median 0.67. **Owner ruling R1 = D:** scale-only recession, no color darkening, until tile art is on the master palette. Shading is revisited after that migration (section 5.2). |
| Handoff §5: palette `art/palette/uf.hex`, and quantise every off-palette texel | ADR-002. Master hexes go through the table (identity under R1 = D). Non-master texels pass through unchanged until the art is on the palette (ADR-002 §2.2). **Plan decision (within handoff §9 authority), M2.** |
| Handoff §7: invalidate on every `levels:strataChanged` | Ignore HP-only. Dirty on `cellChanged` only. `strataDestroyed` is redundant and is not a source. |
| Handoff §7 item 4: lower-level animation on `$deusAnimationMaster.frame3` | That symbol is not in the game code. Bound planes keep the map's 30-frame A1 cadence. No other motion. |
| Handoff §6 and pre-19C: blur off by default, debug blur allowed if it costs nothing while off | Cost nothing means not constructed. `filterConstructs` stays 0. A sprite mask is a filter pass and is also forbidden. |
| Handoff §10.1: pure Node.js VM execution | Node oracle plus a PIXI-stub harness plus an nw.js render harness (section 8.1). The split is required for pixel, filter, and allocation checks. **Departure, R10.** |
| Handoff §10.3 picture gate, against an earlier draft that shot one camera | The per-level shots and the five-level frame are restored (section 8.5). No remaining reduction. |
| Pre-19C §2.1: use the raw fraction `H / (H + 5d)` as the sprite scale | Use that fraction only to pick `tilePx`. The sprite scale is `tilePx / 48`, and `plane.scale.x * 48` must be that integer. |
| Pre-19C §5.3: added tick ≤ 8 ms | ≤ 2.00 ms with no shader and no sprite mask. Depth-pass ≤ 6.00 ms (handoff). Frame ≤ 16.7 ms. |
| A new `UF.Levels.solidWordAt` so the block fill can avoid `strataAt` | Not added. The fill reads `baseline().strata.m` and the 22-hex delta (section 6.1). **Plan decision (within handoff §9 authority), M8.** `DEUS_Levels.js` stays read-only. `UF.Depth.blockWord` is the cache reader the checks use. |
| Roof fallback look: `mined_stone` / `mined_soil` / `deck_wood` | Solid look of the hit material: stone → `rock`, soil → `soil`, wood → `rock` (section 3.5). Plane-owned `open` cells use the same keys. |
| F7 preset `off` drops the cutout and the roof fallback | They stay. Holes show the void texel. A `+1` roof stays opaque (section 2). |
| Rule 13 `#08080C`–`#121218` versus the master void ramp | Not reconciled by this plan. `#08080C` is absent. `#14161C` is outside the range. `#060709` is below it. The compositor keeps the three void ids unshaded and does not invent a hex. **Open art decision, m7.** The false claim that the step table "keeps the Rule 13 black line intact" is withdrawn. |
| `DEUS_Depth.md` default `deus`: eye 140, 6 ft, blur 0.6 / 1.2, two planes | Retired by this plan. The doc is updated when the plugin changes, not in this task. |
| Pre-19C closing line: do not start while 19B is the active gate | 19B is recorded accepted in the 19C handoff. This lane is still specification only. |

---

## 10. Out of scope

- No edit to a plugin, a test harness, a save, or a tileset in this task.
- No edit to `DEUS_Levels.js` or `DEUS_WorldGen.js` in the implementation that follows this plan, including no new column-word export and no change to `looksOfPacked` or the ground painter. The cutout lives in `DEUS_Depth`.
- No rewrite of `DEUS_Fluid.js` and no change to the 0..7 fluid scale.
- No new worldgen, no cut, no cave, no cap behaviour beyond "the ray ignores the cap."
- No upward ceiling renderer, no sixth level, no Z+3.
- Fog, fire, flood, speech, and designations on lower planes.
- No claim that 60 FPS holds, that a screenshot looks right, or that a mutant was executed. Those wait on the harness and a playtest after the code freeze lifts.
- No value-recession shading in this implementation. That waits on master-palette tile art and a later owner revisit of R1 = D.

Acceptance for a later implementation is: the checks in section 8.2, every mutant in section 8.4 exiting 1 with its named check in the `FAIL` lines, the picture gate in section 8.5 with the images actually opened, and the tick table filled with numbers from that run. A document that repeats this plan is not that acceptance.
