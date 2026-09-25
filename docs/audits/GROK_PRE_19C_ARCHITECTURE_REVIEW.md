# GROK-PRE-19C-ARCHITECTURE-REVIEW

Read-only review of `game/js/plugins/DEUS_Depth.js` against the five-strata column (five macro-levels `z ∈ [-2,+2]`, five 1 ft strata `S0..S4` per cell, elevation `e = (z+2)·5+s`) and the binding visual directive: production depth uses no blur; depth is cliff and wall geometry, scale recession, subtle parallax, and restrained brightness, saturation, and contrast. Preferred camera 120 ft, drop 5 ft per level, compared at 160 / 120 / 90 ft on genuine generated geometry.

`DEUS_Visuals.js` and `DEUS_Perspective25D.js` are not part of the compositor. Visuals has no depth pass. Perspective25D is pure top-down foot-Y sorting plus viewport culling of active-map `Sprite_Character` only. Depth-plane sprites are ordinary `Sprite`s and sit outside that cull.

---

## 1. Architectural Evaluation of `game/js/plugins/DEUS_Depth.js`

### 1.1 What is there

One `Sprite_DepthRoot` is a child of the live tilemap at `z = -1` (`DEUS_Depth.js` around the root constructor). It draws a full-viewport void (`#08080C`), then two `Sprite_DepthPlane`s, depth 2 under depth 1. The active map stays at `z = 0` and is the only occluder of those planes. Each plane is a stock `Tilemap` whose layers paint into a window-sized canvas (`PAD = 48`, measured canvas 1008×816, nearest, `imageSmoothingEnabled = false`) from `UF.World.peekArea`, plus pooled object, item, unit, cliff, and ground-connector sprites between the two tile layers. The plane container is scaled about the viewport centre:

```
screen = centre + (unprojected − centre) · scale
scale  = eye / (eye + levelHeightFt · depth)
```

Shipped `deus` resolves that at eye 140 ft and `levelHeightFt` 6: scale 0.959 / 0.921, brightness 0.92 / 0.82, saturation −0.10 / −0.22, contrast −0.045 / −0.10, blur 0.6 / 1.2 px, alpha 1. `maxDepth` is clamped to 2 (`Math.min(2, …)`). `config.exposes` is `z > 0`, so a view on `z ≤ 0` binds nothing.

Occlusion is tile alpha, not a strata ray. `hasOpenCells` (`DEUS_Depth.js` ~797) scans the whole derived shape grid (`256×256`) for `SHAPES.open` and caches one boolean per area and level. Any open cell in the area binds full window planes. `levels:cellChanged` and `levels:shapeChanged` clear that entire cache and repaint every bound plane. The plugin never reads `solidMaskOf`, `hasOpaqueOverburden`, or a column elevation.

### 1.2 What is worth keeping

- Window canvases, not map-sized bitmaps. A 256×256 tile bitmap is the allocation V131 already removed.
- Nearest sampling on plane canvases and on sheets forced through `BaseTexture.setStyle(NEAREST)`.
- One look per plane (scale, colour matrix, alpha) shared by tiles and entities. No per-sprite filter.
- Alpha held at 1 so a fade cannot reveal the void through solid ground.
- Void under the last drawn plane, over the parallax, so a shaft does not show the sky.
- Repaint only when the start tile, a refresh, or in-window A1 water (every 30 frames) asks for it. A still camera does not re-upload the canvas.
- Entities in the plane’s unprojected frame, so the container transform scales them with the ground they stand on. Standing frames only.
- The projection origin at the camera focus, which keeps a hole’s centre aligned with the ground under it and makes pan parallax equal to `(1 − scale)` times the camera move.

### 1.3 Where it breaks the five-strata model

| Requirement | Current behaviour |
|---|---|
| Active level + up to four lower levels | Two planes. From `+2` the second plane is `z = 0`. `z = −1` and `z = −2` are never bound. |
| Ray stops at the first solid stratum | The mask is whatever tileset 92 painted. `derivePacked` only counts solid strata stacked from `S0`. A roof that is solid at `S4` with air beneath derives as `open` when nothing below supplies a stand surface, and the tile stays transparent. The renderer then draws through the roof. |
| Ground and underground cuts | `exposes(z) = z > 0`. A shaft from `z = 0` into `−1`/`−2` draws nothing. |
| Exposure follows the viewport | One open cell anywhere in the 256×256 area turns on full-window planes for the whole time that level is on screen. |
| Mutation dirties a neighbourhood | `shapesChanged` drops every cached flag. `refreshLevel` repaints the whole window canvas. |
| Strata are the authority | The only geometry read is `shapeGrid` compared to `SHAPES.open`. That is the compatibility view the owner review forbids for sight, roofs, shafts, and exposure. |
| 5 ft, H = 120, depths 1..4 | 6 ft, H = 140, depths 1..2. `docs/systems/DEUS_Depth.md` still documents that older model. |
| Production blur off | Default preset `deus` attaches a `BlurFilter` on both planes. Plugin help text (lines 57–59) still describes the earlier “one level, blurred, black beyond” direction. |

`hasOpaqueOverburden` is the wrong query to bolt on by itself. It answers “is there solid above this cell’s standing surface?”, which is a roof test for a creature inside a cell. The compositor needs the first solid at or below the top of the viewed cell, for every column on screen.

### 1.4 Every blur pass in `DEUS_Depth.js`

There is one blur implementation, and no canvas blur.

`Sprite_DepthPlane.applyLook` (`DEUS_Depth.js` ~693–699), when `cfg.blur > 0`:

```text
new PIXI.filters.BlurFilter(strength = cfg.blur, quality = blurQuality, resolution = 1, kernelSize = 5)
```

PIXI’s `BlurFilter.apply` runs a horizontal `BlurFilterPass` into a temporary render texture, then a vertical pass into the output. `quality` is the pass count per axis (`passes = quality`). Shipped `blurQuality` is 1, so each blurred plane is two Gaussian framebuffer passes (5-tap kernel). Quality 2 is four passes. The filter sits on the plane container, so tiles and entities are blurred together after compositing. Sources stay nearest; the blur is the soften.

Presets that set `blur > 0`:

| Preset | Depth 1 | Depth 2 | Role today |
|---|---|---|---|
| `deus` (start default) | 0.6 px | 1.2 px | Shipped. Also a `ColorMatrixFilter`. |
| `C` | 0.5 | 0.8 | Comparison. |
| `D` | 1.5, scale 1 | 2.5, scale 1 | Old “one level, blurred”. |
| `E` | 1.5 plus darken | 2.5 plus darken | `D` plus value. |

`deus_scale`, `deus_color`, `A`, `B`, and `off` store `blur: 0`. The branch then leaves `BlurFilter` off the filter list. The object is created only on the first `blur > 0` apply and kept on the plane after that.

No other blur exists in this file. The canvas path is `drawImage` with smoothing off, plus the stock shadow quad `fillRect` at `rgba(0,0,0,0.5)`. That quad is a flat multiply, not a blur. The `crisp_nearest` provocation sets `bitmap.smooth = true` (bilinear). It is not a production pass.

Measured on the `depth14` harness (editor open, simulation paused, ANGLE / RTX 4060 Laptop): median engine tick, planes off 45.7 ms; two-plane recession about +16.9 ms; colour matrix inside the noise (bound was 4 ms); blur quality 1 about +14.7 ms; quality 2 about +34.4 ms. The absolute baseline is contaminated (the same idle map ranged 18–50 ms). The order is the evidence: one quality-1 blur on two planes already spends on the order of a frame, on top of the compositing itself. Five copies of that path will not hold 16.7 ms.

### 1.5 Quiescent cost today

On `z ≤ 0`, `rebuild` returns before `bindPlane`. Later frames still enter `Sprite_DepthRoot.update`, see `p.level == null`, and continue. That path is a handful of property reads. It is also the path that hides a real shaft on the ground.

On `+1` or `+2`, a single open cell anywhere in the area binds both window planes for good. `updatePlane` then runs every frame: tilemap `update` / `updateTransform`, entity placement, and a full child sort, even when the camera is sitting on solid rock with no hole in the padded view. `peekArea` and the 65 536-cell scan are not per frame; they are per bind and per world-wide shape event. The per-frame waste is the live planes.

### 1.6 Verdict

The plane object, the centre-locked scale, the nearest window canvas, the shared colour matrix, and the void are the right skeleton. WG.00.09 has to change the skeleton’s limits: four lower slots, a strata ray instead of `SHAPES.open`, a viewport chunk mask, blur removed from every production preset, `levelHeightFt = 5`, and an early-out when the padded view contains no open column. Cloning `Sprite_DepthPlane` twice more, still gated by `hasOpenCells`, would miss the directive and the frame budget.

---

## 2. Mathematical Specification for No-Blur Scale and Value Recession

Binding camera. Colour steps below are the starting point for the 160 / 120 / 90 screenshot comparison. The directive says they are not frozen until those shots are reviewed. The scale formula is the model.

### 2.1 Scale

Macro-level drop `Δ = 5` ft. Eye height `H` ft above the viewed level. Depth `d ∈ {1,2,3,4}` is how many macro-levels below the view the plane is.

```
s(d) = H / (H + Δ · d) = H / (H + 5d)
```

Production set `H ∈ {160, 120, 90}`, preferred `H = 120`. Isotropic: `scale.x = scale.y = s(d)`. The active level stays at scale 1 with no filter and alpha 1.

| d | Drop | H = 160 | H = 120 | H = 90 |
|---|-----:|--------:|--------:|-------:|
| 1 | 5 ft | 160/165 = 0.969697 | 120/125 = 0.960000 | 90/95 = 0.947368 |
| 2 | 10 ft | 160/170 = 0.941176 | 120/130 = 0.923077 | 90/100 = 0.900000 |
| 3 | 15 ft | 160/175 = 0.914286 | 120/135 = 0.888889 | 90/105 = 0.857143 |
| 4 | 20 ft | 160/180 = 0.888889 | 120/140 = 0.857143 | 90/110 = 0.818182 |

The 120 ft row matches the tuning brief’s 0.960 / 0.923 / 0.889 / 0.857 at three decimals.

### 2.2 Projection and parallax

Viewport `W × Hpx` (harness: 816 × 624). Focus `C = (W · ox, Hpx · oy)` with `(ox, oy) = (0.5, 0.5)`.

Unprojected window point `P` (the same tilemap origin the plane already uses). Projected point:

```
P'(d) = C + (P − C) · s(d)
```

A camera pan of `T` pixels moves the active map by `−T` and the depth-`d` plane by `−T · s(d)`. Parallax of the lower plane relative to the active map is `T · (1 − s(d))`, toward the focus. Edge shift on the long half-axis (`408` px at 816 wide):

```
edge(d) = (1 − s(d)) · 408
```

| d | H = 160 | H = 120 | H = 90 |
|---|--------:|--------:|-------:|
| 1 | 12.4 px | 16.3 px | 21.5 px |
| 2 | 24.0 px | 31.4 px | 40.8 px |
| 3 | 35.0 px | 45.3 px | 58.3 px |
| 4 | 45.3 px | 58.3 px | 74.2 px |

`PAD = 48` covers depth 4 only at 160 ft. At 120 ft the edge is 58 px; at 90 ft it is 74 px. The window pad has to be two tiles (`96` px) so the inward scale cannot uncover the canvas edge. Diagnostic ceiling `maxParallaxPx = 75` (just above the 90 ft depth-4 edge, still below a broken scale of 0.80, which shifts 81.6 px).

Non-integer `s` drops one texel row or column about every `1/(1−s)` pixels (25 px at 0.960, 7 px at 0.857). That crawl is nearest sampling under a moving camera. It is not repaired with linear filtering.

### 2.3 Value, saturation, contrast

One `ColorMatrixFilter` per visible plane, resolution 1, multiply composed in this order: brightness, saturate, contrast. Alpha of the matrix stays 1. Plane `alpha` stays 1.

Let `k(d) = 1 − 0.04 · d`, so `k = 0.96, 0.92, 0.88, 0.84`.

PIXI, from `game/js/libs/pixi.js`:

- `brightness(b)` multiplies RGB by `b`.
- `saturate(amount)` is `RGB ← RGB + amount · (RGB − mean)` with `mean = (R+G+B)/3`. Retention `ρ = 1 + amount`. Full grey is `amount = −1`.
- `contrast(amount)` is `v = 1 + amount`, `RGB ← v · RGB − 0.5 · (v − 1)`, pivot 0.5.

So the starting step is:

```
brightness(k(d), multiply)
saturate(k(d) − 1, multiply)    // ρ = k(d)
contrast(k(d) − 1, multiply)     // v = k(d)
```

On a texel `c ∈ [0,1]³`, with `mean` taken after the brightness multiply:

```
c1 = k · c
c2 = mean(c1) + k · (c1 − mean(c1))
c3 = k · c2 + 0.5 · (1 − k)
```

Depth 4 keeps 84% of the brightness, 84% of the distance from grey, and 84% of the distance from mid-grey. A human, a tree, a bridge, and a cave mouth stay in their own hues. The shipped `deus` steps (0.92 / 0.82 brightness, saturate −0.10 / −0.22 which is retention 0.90 / 0.78, blur on) are a stronger and softer grade than this, and they stop at depth 2.

### 2.4 What takes the place of the blur

The blur branch does not run for any preset in the production cycle (`deus` at 120 ft, the 160 and 90 eye presets, scale-only, colour-only, off). `cfg.blur` is 0 on those presets, and `applyLook` must not construct a `BlurFilter` while a debug flag is off. A debug blur that is only built when that flag is on, and that is absent from the F7 production cycle, satisfies “costs nothing while off”. If the flag stays off, the filter list of every plane is either empty or a single `ColorMatrixFilter`.

Depth cues, in order of strength:

1. Physical edges already in the level build: cliff faces, shaft walls, cave lips, ledges, the dark cap on the near side of a drop.
2. `s(d)` about the camera focus.
3. The parallax `T·(1−s(d))` that falls out of that scale.
4. The `k(d)` grade above.

---

## 3. Chunked Visibility Mask and Invalidation Protocol

### 3.1 The ray

For viewed macro-level `V` and column `(x, y)`, walk elevation downward from the top of the viewed cell:

```
e0 = (V + 2) · 5 + 4
```

through `e = 0` (`z = −2`, `S0`). The first `e` whose stratum has `SOLID_B[material] = 1` is the hit. Stone, soil, and wood stop the ray. Air, water, and lava do not (`SOLID_B` is 0 for fluids).

```
zHit = ⌊e / 5⌋ − 2
dHit = V − zHit          // 0 .. 4
```

No solid from `e0` down through 0: `dHit = 5` (void).

Plane `d` draws a column only when `dHit = d` (that plane is the first solid surface). Columns with `dHit > d` are holes in that plane: the plane contributes no pixels there, and the next plane may. Columns with `dHit < d` are already sealed by a shallower solid: the plane is not drawn and is not composited. The void is drawn where `dHit = 5`, and nowhere else.

This is a vertical ray. A change at `(x, y)` does not change a neighbour’s `dHit`. Neighbour repaints stay the existing autotile refresh (`redrawAround`), separate from the mask.

Worked cases:

- Meadow, five solid strata in the viewed cell: `dHit = 0`. No plane, no void.
- Roof only at `S4` of `V−1`, air under it, solid deeper: `dHit = 1`. Plane 1 shows the roof. Planes 2..4 stay masked out on that column even if `derivePacked` called the cell `open`.
- Shaft, air from `V` through `V−3`, first solid on `V−4`: planes 1..3 draw nothing in the shaft cell; plane 4 draws the floor. Rim cliffs are the solid neighbours (`dHit` equal to their own depth), which is why the walls stay on the upper plane.
- Open water over a solid floor in the same cell: water does not stop the ray; the floor stratum does. `dHit` is that cell. The floor plane is the surface. Deeper planes stay masked. The water tile is drawn by that same plane, with whatever alpha the art has.

### 3.2 What is cached

Do not store a full-area bitmap, and do not store a second copy of `strata.m`.

The world has no chunk grid. Use 16×16 cell blocks because the index is a shift (`x >> 4`, `y >> 4`) and the padded view is about 21×17 cells, so it touches at most a 3×2 or 3×3 set of blocks.

Per block, a `Uint32Array(256)`: one 25-bit solid mask per column, bit `e` set when stratum `e` is solid. Four bytes × 256 = 1024 bytes per block. Nine live blocks are under 10 KB. The mask does not depend on `V`, so a view-level change does not rebuild it.

`dHit` for the current `V` is a bit scan from `e0` downward, done when the window summary is built, not per sprite and not per frame.

Cap the cache at the blocks that intersect the padded window, plus the ring the camera can enter on the next cell-step. An LRU of 16 blocks is enough. A block outside that set is dropped. The strata arrays remain the authority; a missing block is rebuilt from `solidMaskOf` (one locate per macro-level, no allocation inside the query).

The GPU mask is a second, tiny texture: one texel per cell of the padded window (on the order of 21×17), nearest-scaled by 48. Texel alpha is 255 where `dHit` equals that plane’s depth, else 0. That is the stencil between planes and the clip for entities. It is the size of the view, not the map, and it is re-uploaded only when the summary changes.

### 3.3 Window summary and the skip

After the blocks for this window are warm, fold them into one integer: `exposed =` number of padded-window columns with `dHit ≥ 1`, and `maxD =` the deepest such `dHit` (0 if none, 5 if any column is void). Planes with `d > maxD` or `d > 4` are not updated. `maxD = 0` hides the void and every plane.

Rebuild the summary when the camera crosses a cell, when `V` changes, or when a block overlapping the window is dirty. A still camera on a clean window compares two integers and returns.

### 3.4 Invalidation

Hook both events. Treat them as dirty marks, and recompute once on the next depth update, not inside the handler.

`levels:cellChanged` payload: `{ area:{x,y}, x, y, z, oldCell, newCell, cause }`. `writeCell` emits this when a material or a derived shape changes, including the write that turns a stratum into air.

`levels:strataDestroyed` payload: `{ area, x, y, z, stratum, material, constructed, debris, damageType, source }`. It fires after that same write. Marking the block again is idempotent.

Mark block `(area.x, area.y, x >> 4, y >> 4)` dirty. If the block is not in the cache, do nothing; the next visit builds it. If it overlaps the padded window, recompute those 256 masks (in practice one column is enough to write; the other 255 are unchanged) and bump the window generation so the summary and the tiny mask texture refresh.

Do not listen to `levels:strataChanged` for the mask. An HP-only hit emits that event alone and does not change `SOLID_B`. Repainting on every damage tick would spend the budget the strata writer just saved. Tile appearance still follows the existing `world:levelTileChanged` / `world:tileChanged` path, and only for a plane that is actually bound and whose window contains the cell.

`levels:shapeChanged` is no longer the exposure signal. A shape can change while the solid mask does not, and a solid mask can change while the derived shape stays `open` (the roof case).

### 3.5 Steady state

Camera still, no dirty block, no water in the window, no unit motion: zero canvas uploads, zero mask uploads, zero `peekArea`, zero shape-grid scans. The only legal per-frame work for a visible plane is writing `x`, `y`, and `scale` from the display origin. With `exposed = 0`, even that is skipped.

---

## 4. Entity Projection and Occlusion Pipeline

Active-level units stay on the normal spriteset. Perspective25D already culls those `Sprite_Character`s to the viewport. Depth planes do not draw them a second time.

An entity whose macro-level is `zE < V` belongs to plane `d = V − zE` (1..4). It is parented to that plane, in unprojected screen space, so it inherits `s(d)` and the plane’s colour matrix and never receives its own filter. Foot sort stays as it is now: units at foot `y`, items one below, walls at `max(7, y)`, connectors at 0.5.

Draw the entity only when the foot column has `dHit = d`. That single test covers:

- A floor at this level (`dHit = d`): the creature stands on the surface the player sees.
- A roof or deck anywhere above the creature (`dHit < d`): the ray stopped on that solid. The sprite is omitted, including a tall crown that would otherwise spill into a neighbouring hole. The window mask (one texel per cell, nearest) clips any sprite whose pixels cross a column with a different `dHit`, so a tree rooted on a sealed cell cannot appear inside a shaft.
- A hole through this level (`dHit > d`): this plane draws no floor and no entity there. The creature, if it exists, belongs to the deeper plane whose `d` equals `dHit`.

The entity window stays the live one: view plus 3 cells, plus 6 cells of height for tall sprites. Positions of tracked units may follow every frame. The set rebuild stays on `objects:levelChanged`, `objects:changed`, `items:changed`, `world:unitAdded`, `world:unitRemoved`, `world:unitLevelChanged`, and the 60-frame refresh. Add one more skip: if the window key is unchanged, no unit’s cell changed, and the mask generation is unchanged, do not sort and do not rebind frames.

Off the viewed level, nothing animates. Fog, fire, flood overlay, speech, and designations stay out of the lower planes, as they are today.

`hasOpaqueOverburden` remains the gameplay roof query. The compositor and the entity test both call the same `dHit` from the chunk mask, so a roof cannot be a floor to one and a hole to the other.

---

## 5. Concrete Acceptance Criteria and Benchmarks for WG.00.09 / FABLE-19C

19B is still `ACTIVE`. These are the gates for the compositor once generated cuts exist. Handmade holes and renderer overlays do not count as the screenshot scene. The compositor does not generate geometry and does not edit `DEUS_Fluid.js`.

### 5.1 Structure

1. From `V = +2`, four planes can bind: `+1`, `0`, `−1`, `−2`. From `V = 0`, planes bind for `−1` and `−2` where the ray says so. `maxDepth` accepts 4. `config.depths` has keys 1..4.
2. A column’s visible plane is the macro-level of the first `SOLID_B` stratum at or below `S4` of `V`. A roof-only `S4` with air underneath seals every deeper plane on that column. A derived shape of `open` does not open it.
3. Fluid does not advance `dHit`. The void colour `#08080C` appears only where `dHit = 5`, and the parallax sky does not show through a shaft.
4. No full-map bitmap. Live mask storage is the 16×16 `Uint32Array` blocks (cap 16) plus one view-sized nearest mask texture per visible plane.

### 5.2 Picture

5. Default eye 120 ft, `levelHeightFt` 5, `k(d) = 1 − 0.04d`, blur 0, alpha 1, nearest. Presets for 160 and 90 change only `H` and re-derive `s(d)`. F7’s production cycle does not select a preset with `blur > 0`.
6. With the debug blur flag off, no plane’s filter list contains `BlurFilter`, and no `BlurFilter` is constructed. A render of the planes alone, entities off, contains only colours from the source canvases (the existing `crisp_nearest` standard).
7. At 1.00×, on one generated camera with 3–5 levels actually visible: a person, a tree, a bridge, a cave mouth, and the surrounding ground are still identifiable at depth 4. Three shots of that same frame at 160, 120, and 90 ft. Scale-only and full `k(d)` as a pair. Nothing in the colour table is locked before those shots are reviewed.
8. Pixel checks on that frame: the centre of a depth-4 floor cell samples that plane’s texel; a roof column samples the roof plane and the next plane’s contribution at that pixel is 0; a viewed-level floor cell is unchanged with the planes toggled (the active tilemap still wins where `dHit = 0`).
9. An entity on a lower exposed floor is a child of that plane, world scale `s(d)`, no filter of its own, and its body pixel moves when `k(d)` is applied. The same entity under a solid roof stratum is absent from the planes’ render. A tall sprite rooted on a sealed cell contributes no pixel inside the shaft.
10. Cycling the production presets and the three eye heights changes no unit position, no stratum, no shape, and no object.

### 5.3 Benchmarks

Report median and worst over two interleaved rounds of 60 frames, editor closed, simulation in its normal idle state, locked 1.00×. The 19A deltas (0.012 ms/frame added strata work, 2,129,920 B per area) stay the baseline; 19C adds its own line and does not regress those.

| Case | Pass |
|---|---|
| Padded view has `exposed = 0` (solid ground, summit interior, underground room with an intact roof). Camera still. | Planes and void hidden. No `peekArea`, no canvas upload, no mask upload, no entity walk. Median time inside the depth root ≤ 0.02 ms (prints 0.00 ms at 0.01 ms). Frame holds 60 FPS. |
| Same scene, one `levels:cellChanged` outside the window. | That block is marked dirty if it was cached. The window summary is not rebuilt. The depth root stays on the early-out. |
| Same scene, destroy one stratum inside the window so a shaft opens. | Only that 16×16 block recomputes. The new `dHit` shows on the next frame. Deeper planes stay hidden until the ray actually reaches them. |
| Camera still on a five-level opening, no water, units still, blur off. | Zero canvas repaints per frame. Added tick versus planes disabled ≤ 8 ms median (colour matrix included). Total engine tick ≤ 16.7 ms median. |
| One plane, forced repaint of its window. | Under 16 ms, matching today’s single-plane bound (measured 2.2–4.9 ms on the old harness). Five planes must not repaint on the same frame unless five planes are actually dirty. |
| A1 water in one lower window. | That plane may repaint on the map’s 30-frame cadence. Other planes do not. |
| Debug blur forced on at quality 1, then switched off. | On: blends appear, as today’s `blur_by_default` check. Off: filter list loses `BlurFilter` and the added tick returns to the colour-only number within 0.5 ms. |

The historical `treatment_cost` figure (+16.9 ms for two always-bound planes, editor open) is why “four more planes” is not the design. The 16.7 ms bar is reachable only with the `exposed = 0` early-out and with repaints limited to dirty, visible planes.

### 5.4 Out of scope for this review

No implementation of the above, no commit, no edit to `DEUS_Depth.js`, and no start of WG.00.09 while 19B is still the active gate.