# UF Depth Attack Plan — WG.00.09 / DEUS-TSK-FABLE-19C

**Status:** Specification and pre-attack plan. No engine implementation.  
**Date:** 2026-09-25  
**Writer:** Grok (Lane E, Directive 001-B)  
**Reviewer:** Claude CLI session  
**Branch:** `task/lane-e`  
**Plugin under attack (read-only):** `game/js/plugins/DEUS_Depth.js`  
**Future harness (not created here):** `tools/test_global_depth_renderer.js`

This document is the definition the compositor has to meet and the attack that has to fail a wrong one. It does not edit `DEUS_Depth.js`, `DEUS_Levels.js`, `DEUS_WorldGen.js`, `DEUS_Fluid.js`, `plugins.js`, or `game/data`. Frame times below are acceptance bars. They are not measurements from this session.

Authorities read for this plan: `AGENTS.md` Rule 12 and Rule 13, `docs/systems/UF_Levels.md` (Strata; Natural cuts and caves), `docs/systems/DEUS_Depth.md`, `docs/audits/GROK_PRE_19C_ARCHITECTURE_REVIEW.md`, `docs/handoffs/HANDOFF_DEUS_TSK_FABLE_19C_DEPTH.md`, `docs/adr/ADR-002-Palette-Canonicalization.md`, `docs/art/DEUS_PALETTE_ARCHITECTURE_STANDARD.md`, `art/palette/deus_master_world_palette_v1.hex` (226 colors), `docs/art/DEUS_PaletteRegistry.json`, `docs/PERFORMANCE_ARCHITECTURE.md` (`PERF-003`, `PERF-005`).

Where the handoff or the pre-19C review names a shader, a shape-grid query, or `levels:strataChanged` as the exposure signal, section 12 says which sentence wins.

---

## 1. What is on screen today

`DEUS_Depth.js` draws at most two planes under the live tilemap, and only while the camera is on `z > 0`.

| Requirement | Code today |
|---|---|
| Camera on `+2` can see `+1`, `Z0`, `-1`, `-2` | `maxDepth` is clamped with `Math.min(2, …)`. From `+2` the second plane is `z = 0`. `-1` and `-2` are never bound. |
| Camera on `Z0` can see a cut | `config.exposes` is `z => z > 0`. `rebuild` returns before `bindPlane`. A shaft on the ground draws nothing. `UF_Levels.md` records that ground cuts stay painted as `peak_rock` until this compositor exists. |
| Exposure is the first solid stratum | `hasOpenCells` scans the whole derived `shapeGrid` (65,536 cells) for `SHAPES.open` and caches one boolean per area and level. Any open cell in the area binds full-window planes. |
| A roof seals the column | `derivePacked` counts solids stacked from `S0`. Solid at `S4` with air underneath derives `open` (or `floor` when the cell below supplies a stand). The tile stays transparent and the planes draw through the roof. |
| Recession is a physical step off 48 px | Default `deus` uses eye 140 ft and `levelHeightFt` 6: scales 0.959 and 0.921. Plugin parameters start the eye at 190 ft and 6 ft in the camera object before the preset applies. |
| No blur, no shader, palette only | `deus` sets blur 0.6 px and 1.2 px. `applyLook` constructs `PIXI.filters.BlurFilter` when `cfg.blur > 0`, and a `ColorMatrixFilter` for brightness, saturation, and contrast. Both are shader passes. A 4% RGB multiply is not a color in the master hex file. |
| Viewport cache, no per-frame heap | One open cell anywhere in the 256×256 area keeps both window planes live. `levels:shapeChanged` drops the whole open cache and repaints. There is no 16×16 exposure block. |

Worth keeping, and not the attack: window canvases rather than a map-sized bitmap; nearest sampling (`smooth = false`); one treatment shared by the tiles and the entities of a plane; plane alpha held at 1; a void drawn over the parallax so a shaft does not show the sky; repaint on start-tile change, refresh, or in-window A1 water every 30 frames; entities in the plane's unprojected frame so they inherit the plane scale; projection origin at the camera focus.

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

`config.maxDepth` accepts `0..4` and defaults to 4. `config.depths` has keys `1`, `2`, `3`, `4`. The clamp `Math.min(2, …)` is a failing mutant (`max_depth_clamped_2`).

Draw order, back to front: void, then plane 4, plane 3, plane 2, plane 1, then the live tilemap at `z = 0`. A plane is not updated when `d > maxD` for the current window (section 6) or when `V - d < -2`.

The live tilemap remains the occluder wherever the column's hit depth is 0. Plane pixels never cover a viewed-level floor. Toggling the planes does not change a viewed-level floor pixel.

A chasm from `Z0` through `-1` onto `-2`, seen from `Z0`, is one composite: the ground rim is the live map (`d = 0`), the `-1` ledge is plane 1, the `-2` bed is plane 2. Seen from `+2` the same column is planes 2, 3, and 4. Absolute `Z` does not own a scale. Depth below the camera does.

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

Solidity is `SOLID_B` on the material id in the low 6 bits (`DEUS_Levels.js`). Stone, soil, and wood stop a ray. Air (`0`), water (`4`), and lava (`5`) do not. The constructed bit `0x80` does not change solidity. HP is not solidity: a damaged solid still stops the ray until the writer turns it into air at 0 HP.

The `+2` cap (`baseline(2).caps`, thickness in feet above the model) is not elevation 25 and is not a bit in the mask. Looking down never hits it. It does not become a fifth lower plane. `capBreached` / `capChanged` repaint a bound `+2` tile window. They do not rebuild the solid mask.

### 3.2 The ray

For camera `V` and column `(x, y)`, start at the top of the viewed cell and walk down:

```
e0 = (V + 2) * 5 + 4
```

The first `e` in `e0, e0−1, …, 0` whose solid bit is set is the hit.

```
zHit = floor(e / 5) - 2
dHit = V - zHit          // 0..4
```

No solid bit from `e0` through `0`: `dHit = 5` (void). A change at `(x, y)` does not change a neighbour's `dHit`.

Plane `d` draws that column only when `dHit = d`. `dHit > d` is a hole in this plane (no pixels, the next plane may draw). `dHit < d` is already sealed (this plane is not composited there). `dHit = 0` is the live map. `dHit = 5` is the void and no plane.

### 3.3 What must not answer the ray

`UF_Levels.md` already forbids shape codes for vertical sight, cave-roof occlusion, shaft openness, and exposure depth. The derived shape is a compatibility view for walkability.

| API | What it actually answers | Why it fails as the exposure mask |
|---|---|---|
| `shapeAt` / `shapeCodeAt` / `shapeGrid` / `SHAPES.open` | `derivePacked`: solids stacked from `S0`, then headroom | A roof at `S4` with air at `S0` is `open` or `floor`. `hasOpenCells` then treats the roof as a hole. This is the current compositor. |
| `hasOpaqueOverburden` | Solid above the standing surface, or any solid in a cell above, or a cap | Roof test for a creature inside the cell. It is the wrong direction. A meadow with a solid floor and open sky is "no overburden" and would be read as a hole. |
| `continuousAirHeight` / `airRunAt` | Feet of material-id `0` above the stand | Stops on water and lava. The exposure ray does not. A pool would hide its own floor. |
| `worldStrataElevationAt` | Stratum a unit stands on, including the lip at `S4` of the cell below | Standing surface, not the first solid the eye hits from `S4` of `V`. |
| `heightStateAt` (`HEIGHT_k_OF_5`) | Length of the solid prefix from `S0` | A mid-cell roof (`[stone, air, stone, stone, stone]`) reports a short prefix and still seals the ray at `S4`. |

`hasOpaqueOverburden` stays the gameplay roof query. The compositor and the entity test both call the same `dHit`. A roof cannot be a floor to one and a hole to the other.

### 3.4 Worked columns

Material bytes are `S0..S4`. `stone` is solid. `air` and `water` are not.

| Case | Viewed cell and below | `dHit` | What draws |
|---|---|---|---|
| Meadow | Five stone in `V` | 0 | Live map only. No plane, no void. |
| Roof in the viewed cell | `V = [air, air, air, air, stone]` | 0 | Live map draws the roof. Deeper planes stay masked even if the shape is `open`. |
| Roof one level down | `V` five air; `V−1 = [air, air, air, air, stone]`; solid deeper | 1 | Plane 1 draws that roof. Planes 2..4 contribute 0 on this column. |
| Deck over a pit | `V` five air; `V−1` S0 stone, S1..S4 air; air below that | 1 | Plane 1. The shape of `V−1` may be `floor`. That agreement is incidental. The bit is the authority. |
| Shaft onto `-2` from `+2` | Air from `+2` through `-1`; first solid `-2` | 4 | Planes 1..3 draw nothing in the shaft cell. Plane 4 draws the bed. Rim columns keep their own smaller `dHit`, so the wall stays on the upper plane. |
| Open water | Stone `S0`, water `S1..S2`, air above, inside the hit cell | the stone's depth | Water does not advance `dHit`. The floor plane draws the surface. Deeper planes stay masked. |
| In-cell shelf | `[stone, air, stone, stone, stone]` | 0 if this is `V` | The ray hits `S4`. `HEIGHT_1_OF_5` is irrelevant. |
| True void | Air at every `e` from `e0` through 0, cap or not | 5 | Void texel. Not the sky parallax. The cap is above the ray and does not plug the hole. |
| Ground cut | `V = 0`, air through `Z0` and `-1`, solid in `-2` | 2 | Planes bind on the ground. `exposes(z) = z > 0` is the mutant `exposes_surface_only`. |
| Camera on `-2` | Any column | no lower plane | Bedrock view. Ceilings are overburden on the live map, not a depth plane. |

Fluid volume, flow, and `DEUS_Fluid.js` stay out of this task. The ray only reads `SOLID_B`.

---

## 4. Physical scale, without blur

### 4.1 Native tile

One world cell is 48×48 screen pixels at the camera plane (`docs/art/DEUS_NATIVE_RESOLUTION_STANDARD.md`). That is `Z0` when the camera is on `Z0`, and it is the same 48 px when the camera is on `+2`, `+1`, `-1`, or `-2`. The active plane is scale 1, unshaded, no filter, alpha 1.

"Upper" and "lower" do not get scales from their absolute `Z`. `Z+1` seen from `+2` is depth 1. The same `Z+1` with the camera standing on it is 48 px. A scale table keyed by absolute `Z` (`Z+2` always smaller than `Z0`) is the mutant `absolute_z_scale`.

### 4.2 Step off the pinhole

Macro drop `Δ = 5` ft. Eye height `H` ft above the viewed level. Physical target:

```
s(d) = H / (H + 5 * d)     d ∈ {1, 2, 3, 4}
```

Production eyes: `H ∈ {160, 120, 90}`, default `H = 120`. The shipped 140 ft / 6 ft pair is retired.

The screen step is a whole number of pixels so the resample is a ratio of integers and nearest sampling cannot invent a color:

```
tilePx(d) = round(48 * H / (H + 5 * d))
scale(d)  = tilePx(d) / 48
```

`scale.x = scale.y`. `Math.round` half-up, the same rule the harness must use. Depth 0 is `tilePx = 48`.

| `d` | Drop | `H = 160` | `H = 120` | `H = 90` |
|---|-----:|---:|---:|---:|
| 1 | 5 ft | 47 px (`47/48`) | 46 px (`46/48`) | 45 px (`45/48`) |
| 2 | 10 ft | 45 px | 44 px | 43 px |
| 3 | 15 ft | 44 px | 43 px | 41 px |
| 4 | 20 ft | 43 px | 41 px | 39 px |

Each row is strictly decreasing. The four steps under one eye are distinct from each other and from 48. `levelHeightFt` other than 5, or a free float such as 0.959, fails `step_scale`.

### 4.3 Projection

Viewport used for the edge numbers: 816×624 (17×13 tiles of 48). Focus `C` is the viewport centre.

Unprojected point `P` (the tilemap origin the plane already uses):

```
P'(d) = C + (P − C) * (tilePx(d) / 48)
```

Plane `x` and `y` are integer pixels. A pan of `T` pixels moves the live map by `−T` and the depth-`d` plane by `−T * tilePx(d) / 48`. Parallax relative to the live map is `T * (1 − scale(d))`, toward the focus.

Edge shift on the 408 px half-width:

| `d` | `H = 160` | `H = 120` | `H = 90` |
|---|---:|---:|---:|
| 1 | 8.5 px | 17 px | 25.5 px |
| 2 | 25.5 px | 34 px | 42.5 px |
| 3 | 34 px | 42.5 px | 59.5 px |
| 4 | 42.5 px | 59.5 px | 76.5 px |

`PAD = 48` leaves the canvas edge bare at `H = 120` depth 4 (59.5 px) and at `H = 90` depths 3 and 4. The pad is **96 px** (two tiles) on every side. Canvas size is the viewport plus 192 px on each axis: 1008×816 for an 816×624 view. Diagnostic ceiling `maxParallaxPx = 80`. A broken scale of 0.80 shifts 81.6 px and must fail. The current ceiling of 36 px was sized for two planes at 140 ft; it rejects a legal 90 ft depth-4 edge and cannot be kept.

The canvas is painted in unprojected 48 px tiles. The sprite scale is the integer ratio above. `bitmap.smooth` stays false and `imageSmoothingEnabled` stays false. Linear filtering is the mutant `smooth_on`. Non-integer container scales (0.960 and the rest) are not used: they crawl a texel row as the camera moves, and they are not the step this plan locks.

### 4.4 Blur is absent

AGENTS.md Rule 12: the engine draws no motion of its own, and it does not fake motion or depth with a shader distortion.

Production presets store `blur: 0`. `applyLook` must not construct `PIXI.filters.BlurFilter` while the debug flag is off. Boot and the F7 production cycle construct that filter **zero** times. The filter list of every plane is empty in production (section 5 forbids the color-matrix shader as well).

A debug blur, if it exists at all, is built only after an explicit debug flag turns on, and that flag is off in the shipping preset, in the F7 cycle, and in the benchmark. "Constructed once and then disabled" still fails: the object must not be created. Quality, kernel size, and passes are therefore unreachable in production and cost 0.00 ms.

Presets `C`, `D`, and `E` in the current file (blur 0.5 through 2.5 px) leave the production cycle. `deus` with blur 0.6 / 1.2 is the mutant `blur_on_deus`.

Sprite-sheet frames stay legal. In-window A1 water on a plane that is actually bound may repaint on the map's 30-frame cadence, because that is a tileset frame, not a filter. No other plane repaints with it. Units, trees, and objects off the viewed level stay on their standing frame. No sine, rotation, squash, or procedural sway.

---

## 5. Palette shading

### 5.1 Why a color matrix fails Rule 12

The handoff's "4% brightness and saturation" and the pre-19C review's `ColorMatrixFilter` describe a luminance target. They do not describe a legal pixel. PIXI `brightness` / `saturate` / `contrast` write RGB triples that are not in `art/palette/deus_master_world_palette_v1.hex`. That file is the master palette (ADR-002): **226** active colors, 30 reserved slots, 58 ramps. `art/palette/uf.hex` is the legacy 384-color list and is not the shade authority.

`#08080C`, the current `voidColor`, sits in the Rule 13 prose range and is **not** one of the 226. The compositor's void texel is master color `NEUT_VOID_CAP`, `#0C0D12`. The sky parallax never shows through `dHit = 5`.

Production forbids `PIXI.filters.ColorMatrixFilter` the same way it forbids blur. The mutant `colormatrix_production` is a plane whose filter list contains one.

### 5.2 The shade table

Build once, at plugin load, from the hex file plus `docs/art/DEUS_PaletteRegistry.json` (`ramps`, `masterColors[].luminance`). Store it in a `Uint8Array` indexed by master slot and depth. Do not rebuild it per frame, per paint, or per camera move.

Target luminance at depth `d`:

```
k(d) = 1 - 0.04 * d     // 0.96, 0.92, 0.88, 0.84
L'   = k(d) * L(source)
```

Pick the color in the source color's ramp that minimizes `|L(candidate) − L'|`. Tie-break: lower luminance, then lexicographic `colorId`. The output is that candidate's hex. It is never a blend, never a multiply, never a new RGB.

Ramp choice when a color id sits on more than one ramp: the ramp with the most entries darker than the source; tie-break lexicographic `rampId`. The choice is deterministic and stored in the table.

Identity, every depth, for `NEUT_VOID_DEEP` (`#060709`), `NEUT_VOID_CAP` (`#0C0D12`), and `NEUT_VOID_OCCLUSION` (`#14161C`). Wall caps do not walk off the void ramp toward a grey body tone. That keeps the Rule 13 black line intact on lower planes.

An opaque source texel whose hex is missing from the master file is quantized once, at paint, to the nearest master hex (squared Euclidean RGB), and then the table runs. Output alpha is `0` or `255`. A partial alpha is a fail. VFX-tagged art (spells, glows) is not drawn on a depth plane, so it cannot excuse an off-palette pixel there.

Depth 0 does not consult the table. `deus_scale` uses the identity table (step scale, no shade). `deus` uses `k(d)`. `eye160` and `eye90` change `H` and the pixel steps only. They do not change `k(d)`.

F7 production cycle: `deus` → `deus_scale` → `eye160` → `eye90` → `off` → `deus`. No preset in that cycle has `blur > 0` or attaches a filter.

The table is applied when a plane canvas or a pooled entity bitmap is painted. A still camera does not re-shade. Scale-only mode must satisfy the old source-color check: every opaque pixel of the planes' render is a texel color from the source canvases. Shaded mode replaces that check with a stricter one: every opaque pixel is a hex in `deus_master_world_palette_v1.hex`.

Nothing in `k(d)` is a claim that the picture has been accepted. The three eye heights on one generated frame are the comparison set. Changing `k(d)` after those shots are reviewed is a palette-table change, not a shader tweak, and it still has to land on master hexes.

---

## 6. Chunk exposure cache

`PERF-003`: do not draw five full maps. `PERF-005`: no heap traffic on the hot path. Rule 14: no full-world scan per frame.

### 6.1 Block mask

The world has no chunk grid. Use 16×16 cell blocks. The index is `x >> 4`, `y >> 4`. A padded window of about 21×17 cells touches at most a 3×3 set of blocks.

Per block, one `Uint32Array(256)`: one word per column, bit `e` set when stratum `e` is solid. 25 bits are enough (`e0..e24`). Four bytes × 256 = 1024 bytes. The word does not depend on `V`, so a camera-level change does not rebuild it.

Pool 16 of those arrays at load. An LRU of 16 blocks is the cap. A new block reuses the array of the dropped block. After load, the cache must not call `new Uint32Array`. A missing block is filled from the strata bytes (`solidMaskOf` per macro-level, one locate, no allocation inside the query). The strata arrays stay the authority. The cache is a derived view and is never saved.

`dHit` for the current `V` is a bit scan from `e0` downward, done when the window summary is built, not per sprite and not per frame.

### 6.2 Window summary

Fold the warm blocks into two integers: `exposed` = number of padded-window columns with `dHit ≥ 1`, and `maxD` = the deepest such `dHit` (`0` if none, `5` if any column is void). Planes with `d > maxD` or `d > 4` are not updated. `maxD = 0` hides the void and every plane.

Rebuild the summary when the camera crosses a cell, when `V` changes, or when a block overlapping the padded window is dirty. A still camera on a clean window compares two integers and returns.

The GPU mask is one texel per cell of the padded window, nearest, preallocated, one texture per plane slot (four). Texel alpha is 255 where `dHit` equals that plane's depth, else 0. It is the stencil between planes and the clip for entities. Re-upload only when the summary generation changes. It is the size of the view, not the map.

There is no full-area bitmap and no second copy of `strata.m`.

### 6.3 Invalidation

Treat events as dirty marks. Recompute on the next depth update, not inside the handler.

| Event | Mask |
|---|---|
| `levels:cellChanged` | Recompute that column's 25-bit word. If the word is unchanged, do not bump the window generation. |
| `levels:strataDestroyed` | Same column. Marking twice is idempotent. |
| `levels:strataChanged` alone | Ignore. An HP-only hit emits this and does not change `SOLID_B`. Repainting on damage ticks spends the budget the strata writer saved. |
| `levels:shapeChanged` | Not an exposure signal. A shape can change while the solid word does not, and a solid word can change while the derived shape stays `open`. |
| `levels:capChanged` / `levels:capBreached` | Repaint bound `+2` tiles. The solid word does not change. |

Mark block `(area.x, area.y, x >> 4, y >> 4)`. If that block is not cached, do nothing; the next visit builds it. If it overlaps the padded window, rewrite the one column (the other 255 words stay) and bump the generation so the summary and the tiny mask refresh.

Tile appearance still follows `world:levelTileChanged` / `world:tileChanged`, and only for a plane that is bound and whose window contains the cell. Neighbour autotile refresh (`redrawAround`) stays that path. It is not a 256-column mask rebuild.

### 6.4 Per-frame contract

Camera still, no dirty block, no water in a bound window, no tracked unit motion:

- zero canvas uploads
- zero mask uploads
- zero `peekArea`
- zero shape-grid scans
- zero `new`, zero `{}`, zero `[]`, zero `.map` / `.filter` / `.concat`, zero string concatenation inside the depth update

The only legal per-frame writes for a visible plane are `x`, `y`, and `scale` on objects that already exist. `exposed = 0` skips even that.

Allocation that is legal: the block pool, the mask textures, the shade table, and the entity bitmap pool, all at load or scene create. A strata event that finds a free pooled array and writes into it is legal. A strata event that allocates is not.

`UF.Depth.stats()` gains counters the harness can read: `frameAllocs`, `maskRebuilds`, `summaryRebuilds`, `canvasUploads`, `maskUploads`, `peeks`, `filterConstructs`. `frameAllocs` resets at the start of the depth update and must be 0 at the end. The counter increments in the plugin's own guarded alloc paths (the ones that would have called `new` or built an array). A green run that never increments the counter because the counter is unwired is not a pass; the mutant `alloc_unwired` has to be able to fail.

### 6.5 Steady-state memory

Sixteen blocks are 16,384 bytes. Four view masks at 21×17 RGBA are 5,712 bytes. The shade table is 226×4 bytes. This cache must not add a second copy of the area strata (the 19A figure is 2,129,920 bytes with shape grids, budget 3.5 MB). A design that keeps five map-sized bitmaps fails `full_map_bitmap`.

---

## 7. Entities, walls, and what stays off the plane

An entity whose macro-level `zE` is below `V` belongs to plane `d = V - zE`. It is parented to that plane in unprojected space, so it inherits `tilePx(d) / 48` and does not receive its own filter. Foot sort stays: units at foot `y`, items one below, walls at `max(7, y)`, connectors at 0.5.

Draw it only when the foot column has `dHit = d`.

- Floor at this level: the creature stands on the surface the ray hit.
- Solid anywhere above the creature (`dHit < d`): the sprite is omitted, including a crown that would spill into a neighbouring hole. The view mask clips pixels that cross a column with a different `dHit`.
- Hole through this level (`dHit > d`): this plane draws no floor and no entity. The creature belongs to the deeper plane whose `d` equals `dHit`.

Standing frames only, off the viewed level. The set rebuild stays on the existing object, item, and unit events, plus the 60-frame refresh. Add the skip: if the window key is unchanged, no unit cell changed, and the mask generation is unchanged, do not sort and do not rebind frames. Positions of tracked units may follow every frame by writing existing sprite coordinates.

Entity shade uses the same table, painted into a pooled bitmap (cap 256). The pool is allocated with the scene. Overflow increments a counter and skips; it does not allocate. In shaded mode the body pixel is a master-palette hex and may differ from the source texel. In scale-only mode it is the source texel.

Active-level units stay on the normal spriteset. Depth planes do not draw them again.

Fog, fire, the flood overlay, speech, stance rings, and designations stay off the lower planes.

Two-grid walls, doors, and cliff faces on a lower plane keep the authored upper 48 px. Those texels are already on the void ramp or quantize onto it (section 5). The lower 48 px is the material face, shaded along that material's ramp. The renderer does not draw a second cap in code and does not tint the cap with a shader.

Cycling production presets and the three eye heights changes no unit position, no stratum byte, no derived shape, and no object.

---

## 8. Pre-attack tests

The harness does not exist yet. This section is the contract for `tools/test_global_depth_renderer.js`. A missing function anchor exits **2**. An assertion failure exits **1**. A mutant run that stays green exits **1**. A correct build exits **0**.

No check may print a hardcoded success. Each named check has a provocation or a mutant that has been seen failing before the check is trusted. Until that has happened, the check is specified, not passed. This session did not run the harness.

### 8.1 Layout

- Node vm, same plugin load as `tools/test_strata_foundation.js`, plus the depth plugin once it exports the oracle. PIXI is not required for the oracle block.
- Oracle functions live in the test file. They recompute `dHit`, `tilePx`, and the shade pick from strata bytes, the hex file, and the registry. They do not call `shapeAt`.
- Worlds: seeds `18`, `3`, `21`, `4` (the 19B regression set), area `(0, 0)`, generator 5. Surgical columns use `Levels.setStrata` on a fresh vm and never satisfy "this seed's generated cut" assertions.
- `strataAt().changed === false` is required on scanner hits that claim to be generated.
- Invocation: `node tools/test_global_depth_renderer.js [--seed=18] [--mutant=<name>]`.

Exported oracle the plugin must grow (names the test calls; a missing export is exit 2):

| Export | Returns |
|---|---|
| `UF.Depth.columnHit(area, x, y, V)` | `{ e, zHit, dHit }` with `dHit` in `0..5` |
| `UF.Depth.tilePx(H, d)` | integer pixel step |
| `UF.Depth.shadeIndex(colorIndex, d)` | master slot, or the same index at `d = 0` |
| `UF.Depth.windowSummary()` | `{ exposed, maxD, generation }` |
| `UF.Depth.stats()` | the counters in section 6.4 |

`columnHit` reads strata. A test that implements the oracle by calling `shapeGrid` fails `oracle_uses_shapes` even if the numbers match on meadows.

### 8.2 Oracle cases

These are pure column checks. They do not need a screenshot.

| Id | Build | Expect |
|---|---|---|
| `O-MEADOW` | Five stone at `V` | `dHit = 0` |
| `O-ROOF-V` | `V = [air×4, stone]` | `dHit = 0`. Record the derived shape beside it. The shape may be `open`. The hit may not follow the shape. |
| `O-ROOF-1` | `V` air, `V−1 = [air×4, stone]`, deeper stone | `dHit = 1`, and a query of plane 2's mask texel is 0 |
| `O-SHAFT-4` | Air `+2` through `-1`, stone at `-2 S4` | From `V = +2`, `dHit = 4`, `zHit = -2` |
| `O-VOID` | Air from `e0` through `0` | `dHit = 5` |
| `O-WATER` | Stone `S0`, water `S1..S2` | Hit is the stone, not the water |
| `O-LAVA` | Lava over stone at `-2` | Hit is the stone |
| `O-SHELF` | `[stone, air, stone, stone, stone]` | Hit is `S4` of that cell |
| `O-LIP` | Solid through `e9`, air at `e10` and above, `V = 0` | `dHit = 1` (the `-1` `S4` lip). `e9` and `e10` are not the same bit. |
| `O-CAP` | `+2` five air, cap present, nothing solid below | From `V = +2`, `dHit = 5`. Cap does not add a plane. |
| `O-Z0` | Generated or surgical cut from `Z0` to `-2` | From `V = 0`, `dHit = 2`, planes allowed. `exposes` must not refuse `V = 0`. |
| `O-Z-2` | Any | From `V = -2`, no plane bound, `maxD` ignored |

Scale checks, no world required:

| Id | Expect |
|---|---|
| `S-120` | `tilePx(120, d)` is `46, 44, 43, 41` |
| `S-160` | `47, 45, 44, 43` |
| `S-90` | `45, 43, 41, 39` |
| `S-ACTIVE` | `tilePx` at depth 0 is 48 for every `H`, and for `V` in `-2..+2` the live map scale is 1 |
| `S-PAD` | Pad is 96. Depth-4 edge at `H = 90` is 76.5 px, which is less than 96 and greater than 48. |
| `S-PAL` | For every master index and `d` in `1..4`, `shadeIndex` is a hex in the 226. Void-ramp ids are identity. No output equals a rounded `k(d) * RGB` unless that triple is already a master color. |

Cache checks:

| Id | Expect |
|---|---|
| `C-STILL` | 120 frames, camera still, `exposed = 0`: `frameAllocs = 0`, `canvasUploads = 0`, `maskUploads = 0`, `peeks = 0`, `summaryRebuilds = 0` after the first build |
| `C-FAR` | `cellChanged` outside the padded window: that block marked dirty if cached; summary generation unchanged |
| `C-DIG` | Destroy one in-window stratum: one column word changes; the other 255 words of the block stay; new `dHit` on the next update; deeper planes stay hidden until the ray reaches them |
| `C-HP` | HP-only `strataChanged`: mask word unchanged, no summary rebuild, no upload |
| `C-ONE` | One open cell in the area, outside the padded window: `exposed = 0`, no plane bound |
| `C-ALLOC` | During `C-STILL`, heap-shaped counters stay 0. Scene create may allocate; the frame loop may not. |

### 8.3 Failure scenarios

Each row is a build that looks plausible and is wrong. The check name is what must go red.

| Scenario | Wrong behaviour | Check that goes red |
|---|---|---|
| Roof at `S4`, shape `open`, planes draw the cave under the roof | Shape grid used as the hole | `O-ROOF-V` |
| `hasOpaqueOverburden` false on a meadow, so the meadow binds planes | Roof query used as the ray | `overburden_as_ray` |
| Pool hides the rock under the water | Ray stops on `FLUID_B` | `O-WATER` |
| Camera on `Z0` shows the rock-face tile and no `-1` floor | `exposes` still `z > 0` | `O-Z0` |
| From `+2`, `-1` and `-2` never bind | `maxDepth` clamped to 2 | `O-SHAFT-4` |
| `Z+2` drawn at 43 px while the camera stands on it | Scale keyed by absolute `Z` | `S-ACTIVE` |
| Depth 4 at a free float 0.857, linear filter, new colors | Step skipped; `smooth = true` | `S-120`, `palette_exact` |
| `deus` attaches `BlurFilter(0.6)` and a color matrix | Current preset left in place | `no_production_filter` |
| Shade darkens by `RGB * 0.84` and writes `#3A4E28` or similar | Off-palette shader | `S-PAL` |
| Void pixel is the sky color or `#08080C` | Old void, or parallax left visible | `void_palette` |
| Plane alpha 0.9 lets the void through a solid floor | Alpha fade | `alpha_locked` |
| One open cell at the far corner of the area binds four full canvases | `hasOpenCells` full-grid scan | `C-ONE` |
| Every `strataChanged` rebuilds the window, including gravel damage | HP event treated as exposure | `C-HP` |
| Digging one cell repaints five canvases and all 256 mask words | Dirty region is the whole window | `C-DIG` |
| Still camera allocates one object per plane per frame | Hot-path `{}` or `.map` | `C-ALLOC` |
| Unit under a solid roof still contributes a body pixel in the shaft | Entity test ignores `dHit` | `entity_under_roof` |
| Tall tree rooted on a sealed cell shows inside the next cell's shaft | Mask does not clip | `entity_clip` |
| Lower-plane unit advances its walk cycle | Animation off the live level | `standing_frame` |
| Cap stored as `e = 25` or a sixth plane | Model extended past `+2` | `O-CAP` |
| Preset cycle moves a unit or a stratum byte | Visual path writes simulation | `no_physics_write` |
| `PAD = 48` at `H = 90`, depth 4 | Canvas edge shows past the plane | `S-PAD` |

### 8.4 Mutants

In-memory source patches, same mechanism as `tools/test_strata_foundation.js`. A missing patch anchor exits 2. Each mutant must exit 1 on the check named here. Fifteen is the minimum; the list has twenty so a redundant patch cannot shrink the set below the gate.

| Mutant | Patch idea | Must fail |
|---|---|---|
| `shape_open_is_hole` | `columnHit` returns `dHit = 1` when `shapeGrid === SHAPES.open` | `O-ROOF-V` |
| `overburden_as_ray` | Exposure uses `hasOpaqueOverburden` | `overburden_as_ray` |
| `fluid_stops_ray` | Water or lava sets the solid bit | `O-WATER` |
| `max_depth_clamped_2` | Clamp `maxDepth` to 2 | `O-SHAFT-4` |
| `exposes_surface_only` | `exposes` is `z > 0` | `O-Z0` |
| `absolute_z_scale` | `tilePx` depends on `z`, not on `d` | `S-ACTIVE` |
| `float_scale` | Return `H/(H+5d)` instead of the rounded step | `S-120` |
| `smooth_on` | `bitmap.smooth = true` | `palette_exact` |
| `blur_on_deus` | Production `deus` sets blur 0.6 / 1.2 and constructs `BlurFilter` | `no_production_filter` |
| `colormatrix_production` | Attach `ColorMatrixFilter` on `deus` | `no_production_filter` |
| `palette_lerp` | Write `round(k * channel)` even when the triple is off-list | `S-PAL` |
| `void_off_palette` | Void fill `#08080C` or leave the parallax visible | `void_palette` |
| `alpha_fade` | Plane alpha `k(d)` | `alpha_locked` |
| `full_grid_open_scan` | Bind planes if any `SHAPES.open` exists in the 256×256 | `C-ONE` |
| `strata_changed_dirties` | HP-only event bumps the summary | `C-HP` |
| `alloc_per_frame` | Depth update builds a fresh array or object | `C-ALLOC` |
| `entity_ignores_roof` | Draw the lower unit whenever it is in the window | `entity_under_roof` |
| `cache_ignores_destroy` | `strataDestroyed` does not rewrite the column word | `C-DIG` |
| `pad_48` | Pad stays 48 | `S-PAD` |
| `cap_is_plane` | Cap creates `dHit` outside `0..5` or a fifth plane | `O-CAP` |

### 8.5 Picture gate (later, not this session)

When implementation starts, one generated camera where three to five macro-levels are actually visible (a seed from `18`, `3`, `21`, `4`, not a handmade hole painted by the test) is shot at 1.00× at `H = 160`, `120`, and `90`, plus a scale-only frame at 120. The person who signs the gate opens the files and writes what is in them.

On that frame the checks are: a depth-4 floor pixel comes from that plane's texel; a roof column samples the roof plane and the next plane's contribution at that pixel is 0; a viewed-level floor pixel is unchanged with the planes toggled; an entity on an exposed lower floor is a child of that plane at `tilePx(d)/48` with no filter of its own; the same entity under a solid roof is absent; a tall sprite rooted on a sealed cell contributes no pixel inside the shaft; every opaque pixel is a master hex.

60 FPS is not claimed here. The measurement method, when someone runs it, is: editor closed, simulation idle, zoom locked at 1.00×, two interleaved rounds of 60 frames, median and worst of the engine tick (`Graphics.FPSCounter.duration` or the harness equivalent). Report the planes-off baseline in the same run.

| Case | Bar |
|---|---|
| `exposed = 0`, camera still | Depth-root median ≤ 0.02 ms. No peek, no canvas upload, no mask upload, no entity walk. |
| Same scene, one `cellChanged` outside the window | Summary not rebuilt. Depth root stays on the early-out. |
| Still camera, five-level opening, no water, units still, production preset | Zero canvas repaints per frame. Added tick versus planes disabled ≤ 2.00 ms median. Depth-pass render ≤ 6.00 ms median. Whole engine tick ≤ 16.7 ms median. |
| Planes-off baseline already above 16.7 ms | Say so. The depth delta still has to meet 0.02 ms (hidden) or 2.00 ms (opening). Do not call the frame 60 FPS. |
| One dirty plane, forced window repaint | That plane under 16 ms. The other planes do not repaint on that frame. |
| A1 water in one lower window | That plane may repaint every 30 frames. The others do not. |
| Debug blur forced on, then off | On: off-palette blends appear. Off: `filterConstructs` does not rise further, filter list is empty, added tick returns to the production number within 0.5 ms. |

The 2.00 ms added-tick bar is tighter than the pre-19C review's 8 ms because production no longer spends a color-matrix pass. If a measured opening needs more than 2.00 ms with filters already gone, the report says the number and stops. It does not put the blur back.

### 8.6 Seven performance questions

Answered for the future implementation, as requirements.

1. Recurring update work: yes, a depth-root update. It must return after two integer compares when the window is clean.
2. New draw calls: yes, up to four planes, and only for columns whose `dHit` equals that plane. `exposed = 0` means zero lower-plane draws.
3. Hot-path allocations: forbidden. Section 6.4.
4. New textures: four view-sized mask textures and pooled entity bitmaps, created with the scene, not per frame. No map-sized bitmap.
5. New cache: the 16×16 solid-word blocks. Derived, dropped by LRU, rebuilt from strata, never saved.
6. Save size: none. The planes are derived. No new save field.
7. Startup: one shade-table build from the 226 hexes, one pool alloc. Not a full-world raycast at New Game.

---

## 9. Conflicts resolved

These are the sentences an implementer will otherwise follow from an older doc.

| Older sentence | This plan |
|---|---|
| Handoff §2: query `hasOpaqueOverburden`, `continuousAirHeight`, and `worldStrataElevationAt` for sight | Those stay gameplay adapters. Exposure is `columnHit` (section 3.2). |
| Handoff §5 and pre-19C §2.3: a `ColorMatrixFilter` at `k(d)` | `k(d)` is the luminance target of the palette table. The filter is a production fail. |
| Handoff §5: palette `art/palette/uf.hex` | ADR-002. Authority is `art/palette/deus_master_world_palette_v1.hex`. |
| Handoff §7: invalidate on every `levels:strataChanged` | Ignore HP-only. Dirty on a column word change (`cellChanged` / `strataDestroyed`). |
| Handoff §6 and pre-19C: blur off by default, debug blur allowed if it costs nothing while off | Cost nothing means not constructed. `filterConstructs` stays 0. |
| Pre-19C §2.1: use the raw fraction `H/(H+5d)` as the sprite scale | Use that fraction only to pick `tilePx`. The sprite scale is `tilePx/48`. |
| Pre-19C §5.3: added tick ≤ 8 ms | ≤ 2.00 ms with no shader. Depth-pass ≤ 6.00 ms (handoff). Frame ≤ 16.7 ms. |
| `DEUS_Depth.md` default `deus`: eye 140, 6 ft, blur 0.6 / 1.2, two planes | Retired by this plan. The doc is updated when the plugin changes, not in this task. |
| Pre-19C closing line: do not start while 19B is the active gate | 19B is recorded accepted in the 19C handoff. This lane is still specification only. |

---

## 10. Out of scope

- No edit to a plugin, a test harness, a save, or a tileset in this task.
- No rewrite of `DEUS_Fluid.js` and no change to the 0..7 fluid scale.
- No new worldgen, no cut, no cave, no cap behaviour beyond "the ray ignores the cap."
- No upward ceiling renderer, no sixth level, no Z+3.
- Fog, fire, flood, speech, and designations on lower planes.
- No claim that 60 FPS holds, that a screenshot looks right, or that a mutant was executed. Those wait on the harness and a playtest after the code freeze lifts.

Acceptance for a later implementation is: the oracle checks in section 8.2, all twenty mutants exiting 1, the picture gate in section 8.5 with the images actually opened, and the tick table filled with numbers from that run. A document that repeats this plan is not that acceptance.
