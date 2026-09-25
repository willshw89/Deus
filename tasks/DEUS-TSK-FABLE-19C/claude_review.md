# Independent Review: `docs/systems/UF_Depth_Attack_Plan.md` (WG.00.09 / DEUS-TSK-FABLE-19C)

- **Reviewer:** Claude CLI session (Lane E, `REVIEW_BRIEF.md`)
- **Date:** 2026-09-25
- **Document under review:** `docs/systems/UF_Depth_Attack_Plan.md` at commit `c846fc7c` (Grok)
- **Branch / worktree:** `task/lane-e` (`C:\Users\snewt\.deus_worktrees\lane-e`)
- **Verdict:** **CHANGES REQUESTED** (1 BLOCKER, 8 MAJOR, 9 MINOR)

The plan's depth math, its tables, and its rejection of the shape grid, the blur, and the colour matrix hold up against the code. It is not accepted because of one gap. The plan assumes the live tilemap is see-through exactly where the ray passes, and the live tilemap does not work that way. The live tilemap picks each cell's tile from the derived shape. On generated terrain the two disagree in both directions, and on the Ground and `-1` views they disagree on every exposed column. None of the plan's checks can see this. Most of the other findings are checks that can't fail on the mutant they are mapped to, or palette and performance rules that don't work on the real registry.

---

## 1. Brief criteria

| # | Criterion (REVIEW_BRIEF §2) | Result | Findings |
|---|---|---|---|
| 1 | Five-plane compositor handles `d = V − z` without absolute-Z scale locking | **Math correct. On-screen result not achievable as specified.** The `d` table, the ray, `zHit`/`dHit`, and scale keyed on `d` (48 px at depth 0 for every `V`) are right. All 12 `tilePx` entries and all 12 edge-shift entries recomputed and match. What shows on screen fails for `V ∈ {0, −1}`, and in part for `+1`/`+2`. | B1, m1, M5 (`absolute_z_scale`, `max_depth_clamped_2`) |
| 2 | No code-driven blur, no runtime colour-matrix shader, strict palette | **Partly.** Production `BlurFilter`/`ColorMatrixFilter` are forbidden, with 0 constructions, and the F7 cycle is cleaned. The replacement shade table does nothing at depths 1–2 on the real registry. Quantising every texel conflicts with ADR-002's transition period. The view mask the plan specifies is itself a PIXI filter pass. | M1, M2, M4, m7 |
| 3 | Strata authority replaces the whole-map `hasOpenCells` scan with chunk exposure caching | **Yes in design.** Filling a block without allocating needs a `DEUS_Levels` export that doesn't exist (the file is read-only for 19C). One invalidation mutant can never be killed. World replacement is missing from the invalidation list. | M8, M5 (`cache_ignores_destroy`), m4, m5 |
| 4 | Zero heap allocation per frame in live viewport render ticks | **Required but never tested live.** The allocation checks run only with `exposed = 0`, where the update returns after two compares, and they rely on a counter the plugin reports itself. The shading pass allocates on every repaint and has no budget. | M6, M3 |
| 5 | No engine code added or modified | **Confirmed.** `git diff --stat c846fc7c^ c846fc7c -- game tools run_tests.bat` is empty. `git diff --stat main...HEAD` lists only `docs/systems/UF_Depth_Attack_Plan.md` (+518) and `tasks/DEUS-TSK-FABLE-19C/state.md` (+38). The plan contains formulas, no code. | — |

---

## 2. Findings

Grades follow AGENTS.md → Reviews and audits. Each finding cites a file and line, or the output of a command run in this session (section 3).

### BLOCKER

**CR-19C-B1: The plan assumes the live layer is see-through exactly where `dHit ≥ 1`. The live layer is painted from the derived shape, and the two disagree on generated terrain.**

The plan puts the depth planes under the live tilemap (§2: "The live tilemap remains the occluder wherever the column's hit depth is 0"). That only works if each live cell is transparent exactly when `dHit ≥ 1` for the viewed `V`. The code does something else:
- `DEUS_Levels.js:1456` → a cell is transparent (`open_air`) only when `z > 0` and the derived shape is `open`.
- `DEUS_Levels.js:1459` → on `-1`/`-2`, an `open` cell is `cave_floor` + `hole_edge`, which is opaque.
- `DEUS_WorldGen.js:996` → on the ground, an `open` cell is "painted as the impassable rock face … until the depth renderer shows what is below" (`peak_rock`, region 250).
- `DEUS_Levels.js:1199-1225` (`derivePacked`) → a cell with no solid strata of its own sitting on a solid `S4` below derives `floor`, which is opaque.

Seed 18, generator 5, area (0,0), using the real plugins in the strata harness's vm (section 3.1):

| Camera `V` | Columns with `dHit ≥ 1` | … under an opaque live `open` tile | … under an opaque live floor (lip) | `dHit = 0` under a transparent live tile |
|---|---:|---:|---:|---:|
| `+2` | 50,106 | 0 | 419 | 0 |
| `+1` | 25,334 | 0 | 517 | **127** (e.g. (175,46) "+1 · Open air") |
| `0` | 1,368 | **793** | **575** | 0 |
| `−1` | 344 | **38** | **306** | 0 |

What that means:
1. **From the Ground and from `−1`, nothing below is ever visible.** Every column the plan would bind (1,368/1,368 on `V = 0`, 344/344 on `V = −1`) sits under an opaque live tile. The planes would be bound and paid for, and hidden. `O-Z0` still passes, because it is a pure column check ("`dHit = 2`, planes allowed").
2. **On `+1`, cave roofs render as void.** A generated ground chamber that reaches into `+1`'s lower strata leaves `+1 = [air, air, air, stone, stone]` over an air `S4`. That derives `open` and paints transparent. The probe's surgical copy of this column: shape `open`, "+1 · Open air". The ray gives `dHit = 0`, so every plane is masked there and the `#0C0D12` void shows through where the rock roof should be. The §3.4 row "Roof in the viewed cell … Live map draws the roof" is false for the current painter. Today's compositor leaks the cave through the roof. The plan swaps that leak for a black hole.
3. **The plan's own lip cases are drawn by the live map.** "Roof one level down" (§3.4) and `O-LIP` (§8.2) are both an all-air cell on a solid `S4` below. `derivePacked` makes that `floor` (probe: `O-LIP` → shape `floor`, `worldStrataElevationAt` 9). The live map paints it opaque at 48 px, so the plane-1 roof the table promises is never on screen.

No check catches any of this. §8.2 is all pure column checks, and the §8.5 picture gate uses one camera from above. The code that has to change is `DEUS_Levels.js` (looks) and `DEUS_WorldGen.js` (the ground painter). Handoff §9 lists both as read-only for 19C, and the plan never says who owns the change.

**Required changes to the plan:**
- (a) **Decide how a lip hit is assigned.** Either assign a hit on `S4` of band `z−1` to band `z`, i.e. `zHit = floor((e + 1) / 5) − 2`, `dHit = max(0, V − zHit)`, or keep band quantisation and require the live map to go transparent on lip cells. The first option matches `derivePacked` and `worldStrataElevationAt`: lip floors stay on the live map and on their own level's entity feed (see m1). A lip is physically 1 ft below the viewed floor, not 5 ft.
- (b) **Write a live-layer transparency contract** for all five levels: the live cell is transparent iff `dHit ≥ 1` for the viewed `V`. Name the owner (DEUS_Levels looks, WorldGen ground painter) and flag it as an owner decision, because those files are read-only in the handoff. Alternatively, move it into `DEUS_Depth` as an explicit duty and say how.
- (c) **Add a `dHit = 0` fallback.** Where the shape paints the live cell transparent but the ray hits inside the viewed cell, something opaque in the hit material must draw at scale 1.
- (d) **Add screen-pixel checks per camera level** `+2`, `+1`, `0`, `−1`. On one generated column of each class (roof `dHit = 0`, `dHit = 1..4`, void), sample the composited screen: the texel must come from the plane the ray names, never from the void or a deeper plane.

### MAJOR

**CR-19C-M1: The §5.2 shade table changes nothing at depths 1 and 2 on the real registry, and `S-PAL` passes a table that never shades.**

I implemented §5.2 exactly on `docs/art/DEUS_PaletteRegistry.json`: 226 colours, 58 ramps, every colour on at least one ramp, 34 on several; ramp choice and tie-breaks as written (section 3.2). Result: at `d = 1` 0 of 226 colours change, at `d = 2` 0, at `d = 3` 11 (luminance ratio 0.76–0.81), at `d = 4` 92 (0.68–0.81, median 0.72). 134 colours never change at any depth. Adjacent ramp tones sit about 25–45 % apart in luminance, so a nearest-luminance pick cannot show a 4 % step. Under `deus`, planes 1 and 2 would be pixel-identical to `deus_scale`, and planes 3–4 get one coarse jump. Handoff §5 asks for about 96 / 92 / 88 / 84 %.

`S-PAL` checks only that each output is in the palette and that void colours stay the same. Its third clause is already implied by the first. No check compares `shadeIndex` with the oracle's pick (§8.1 computes that pick but never uses it). None requires darkening to be monotone, and none requires `deus` to differ from `deus_scale`. An all-identity table passes.

**Required:** an owner decision on how value recession works on 3–5-tone ramps. Two options: one ramp step at chosen depths, or a static ordered dither between two master neighbours (on-palette, crisp, no motion). Then add three checks: `S-SHADE-ORACLE` (the plugin table equals the oracle table), `S-MONO` (luminance never increases with `d`), and a `shade_identity` mutant that must fail.

**CR-19C-M2: Quantising every texel at paint conflicts with ADR-002's transition period and will posterise the lower planes against the live level.**

ADR-002 §2.2 says existing prototype assets referencing `uf.hex` stay valid during the transition. At depth 0 the live map draws source texels unchanged. §5.2 quantises every off-palette texel on planes `d ≥ 1` to the nearest master hex. Today's tilesets are not master-palette art: stock `Dungeon_A2` and `Outside_A2` are composed into tileset 92, and tileset 91 is the ground. So one material would change hue between the camera level and the level below for reasons that have nothing to do with depth.

§5.2 also calls any partial alpha a fail, but gives no rule for binarising it. The stock shadow quad (`DEUS_Depth.js:252-254`, `rgba(0,0,0,0.5)`) and anti-aliased sheet edges both produce partial alpha.

**Required:** either shade master texels through the table and pass non-master texels through unchanged, counted as art debt, until the art is compliant; or get the owner to approve quantising. Also specify the alpha threshold and what happens to the shadow quad.

**CR-19C-M3: The shading pass costs time and allocates memory on every repaint, and neither is budgeted. Pre-shaded sheets would avoid both.**

§5.2 and §7 apply the table when a plane canvas or entity bitmap is painted. The plan keeps the repaint on start-tile change (§1, "Worth keeping"). So up to four planes repaint on every 48 px of pan, plus every 30 frames when A1 water is in the window.

Remapping a 1104×912 canvas (m3) takes a `getImageData` call, which returns a new ImageData of about 4 MB and cannot write into an existing buffer, then a per-pixel remap, `putImageData`, and an upload — per plane, per repaint. That is garbage-collector pressure during every pan (PERF-005). §8.5 budgets only "one dirty plane under 16 ms". The RGB → master-slot lookup is not specified at all.

**Recommended:** build shaded copies of each source sheet once per depth (tileset sheets, and character/object sheets lazily per `(sheet, depth)` with an LRU). Plane paint stays `drawImage`, entity sprites point at frames on the shaded sheets, and the 256-bitmap entity pool goes away. Add a panning benchmark: camera stepping one cell every N frames with four planes bound, reporting GC count and repaint ms.

**CR-19C-M4: The GPU view mask in §6.2 is a PIXI sprite mask, and a sprite mask is a filter pass.**

§6.2 says "one texture per plane slot … the stencil between planes and the clip for entities". In the bundled PIXI 5.3.12, a sprite mask is `MASK_TYPES.SPRITE` and is drawn by `SpriteMaskFilter` through a temporary RenderTexture (`game/js/libs/pixi.js:3874`, `:19702`). That is the same kind of shader pass the plan removes the `ColorMatrixFilter` to save, and the saving is how the plan justifies its 2.00 ms bar. The `no_production_filter` check reads `plane.filters`, so it would not see a mask.

**Required:**
- For tiles, bake ownership into the canvas paint: draw only cells whose `dHit = d` and `clearRect` the rest. The current plugin already leaves open cells transparent in its canvases, so no tile mask is needed.
- For entities, assign each one to a plane by its foot cell and crop tall frames with `setFrame` against the columns they overlap. Or accept one masked entity container per plane and put its cost in the budget.
- Add a `sprite_mask_production` mutant, and a check that no plane or plane child has `.mask` set.

**CR-19C-M5: Several mutants cannot fail the check they are mapped to, one can never be killed, and ten check names are never defined. "All twenty mutants exit 1" (§10) cannot be met as written.**
- **`cache_ignores_destroy` → `C-DIG` can never be killed.** `damageCell` (`DEUS_Levels.js:1709-1722`) calls `writeCell` first. `writeCell` emits `levels:cellChanged` for any material change (`:1550-1566`), and only after that does `damageCell` emit `levels:strataDestroyed`. A cache that ignores `strataDestroyed` still rewrites the word from `cellChanged`, so `C-DIG` stays green. Either drop `strataDestroyed` from §6.3 (it is redundant) or redefine the mutant as "neither event rewrites the word".
- **`max_depth_clamped_2` → `O-SHAFT-4`.** The expected result is only `columnHit`'s `dHit = 4, zHit = −2`. The clamp sits in the binding path and does not change `columnHit`. The check must assert that plane 4 is bound and drawn.
- **`absolute_z_scale` → `S-ACTIVE`.** `S-ACTIVE` looks only at depth 0 and the live map. A lower-plane scale keyed on `z` goes unseen. The check needs: the same `z` seen from two cameras gets two scales, and the same `d` seen from two cameras gets one.
- **`palette_lerp` → `S-PAL`.** `shadeIndex` returns a slot index and cannot express an off-palette RGB. The mutant lives in the paint path, so it needs a check on the rendered canvas.
- **`float_scale` → `S-120`.** This only fails if the patch is inside `tilePx()`. A patch on the applied plane scale (the §8.3 row "free float 0.857") passes. Add a check that `plane.scale.x × 48` is an integer equal to `tilePx`.
- **`alloc_per_frame` → `C-ALLOC`.** `C-ALLOC` only runs with `exposed = 0`, so an allocation placed after the early-out is never reached (M6).
- **Check names used in §8.3/§8.4 with no build and no expected result:** `overburden_as_ray`, `palette_exact`, `no_production_filter`, `void_palette`, `alpha_locked`, `entity_under_roof`, `entity_clip`, `standing_frame`, `no_physics_write`, `oracle_uses_shapes`. `alloc_unwired` is required in §6.4 but missing from the §8.4 table.
- **Where the checks run is unspecified.** §8.1 says Node vm, no PIXI. `palette_exact`, `alpha_locked`, `void_palette`, `no_production_filter` and `entity_clip` need a renderer; the old `depth` suite ran in nw.exe through `tools/test_snapshot.js`. Split the contract into Node oracle checks and nw.js render checks, and say which harness runs which.
- **The exit-code rule is ambiguous.** "A mutant run that stays green exits 1" mixes up the mutant run and the driver. It could be read as "a mutant run always exits 1", which is a hardcoded fail (Rule 4). Specify: a mutant run's exit code comes only from its checks, and the driver fails if any mutant run exits 0 or if the named check is not among its FAIL lines.

**CR-19C-M6: Zero allocation is required for the live viewport but only tested on an empty one, using a counter the plugin reports itself.**

§6.4 allows a visible plane only `x`/`y`/`scale` writes per frame, but `C-STILL` and `C-ALLOC` run only at `exposed = 0`. The per-frame code the plan keeps allocates on every frame a plane is visible:
- a template-string key and a new window object (`DEUS_Depth.js:515-523`);
- a closure plus an object per entity in `placeEntities` (`:608-609`);
- a sort with a closure (`:536`);
- new objects from `Depth.center()` and `unprojected()` (`:663-672`).

`frameAllocs` counts only the code paths the implementer chose to instrument. It cannot see an unguarded `{}`. The 19A precedent measures instead: `tools/test_strata_foundation.js` `no_allocation_queries` runs with `--expose-gc` and requires no GC and under 1 B of heap growth per query.

**Required:** add `C-LIVE-ALLOC`. With a five-level opening in view, camera still, units still, and one unit walking on a lower plane, run N frames and measure: heap growth about zero and zero GCs. Use a Node vm with a PIXI stub, or nw.exe with `--js-flags=--expose-gc`. Keep the counter as well.

**CR-19C-M7: The picture gate is narrower than the handoff's, and §9 doesn't record the change.**

Handoff §10.3 requires inspected screenshots for each camera level (`−2`, `−1`, `0`, `+1`, `+2`) plus one frame with all five levels visible. §8.5 has one generated camera at three eye heights plus one scale-only frame. The B1 failures on `V = 0` and `V = −1` would show in per-level shots and do not show in the one-camera gate.

**Required:** restore the per-level shots, each naming the column class it samples. List any remaining reduction in §9.

**CR-19C-M8: Filling a block without allocating needs a `DEUS_Levels` export that doesn't exist.**

§6.1 says a missing block is filled with "`solidMaskOf` per macro-level, one locate, no allocation inside the query". `solidMaskOf` and `locate` are private to `DEUS_Levels` (`DEUS_Levels.js:1169`, `:1188`). The public API has no per-stratum solidity read that avoids allocation:
- `strataAt` allocates an object and four arrays per call (`:1624-1641`);
- `airRunAt` treats fluid the same as solid;
- `isSolid` answers for the whole cell only.

One block fill is 256 columns × 5 levels, and `DEUS_Levels.js` is read-only per handoff §9.

**Required:** name the export needed, e.g. `solidWordAt(ax, ay, x, y)` returning the 25-bit column word with no allocation, as a prerequisite change with an owner and an owner decision. Or accept `strataAt` allocation during block fill, which happens outside the still-frame loop, and say so.

### MINOR

- **m1: The §7 entity rule for a unit standing on a lip contradicts itself.** A unit on a lip (an all-air cell on a solid `S4` below) has `dHit = d + 1` at its foot; the probe's lip gives `worldStrataElevationAt = 9`. Bullet 1 says draw it only when `dHit = d`. Bullet 3 says it belongs to plane `dHit`, but that plane's entity feed is level `zE − 1`'s units (`unitsInArea(…, z)`), which don't include it. The unit disappears from both planes. The B1(a) choice resolves this.
- **m2: `S-PAD` compares the projected shift with the unprojected pad.** Coverage needs `PAD × tilePx/48 ≥ shift`. At `H = 90`, `d = 4`: `96 × 39/48 = 78.0` against a shift of 76.5, a 1.5 px margin (1.0 px after the plane position is rounded) — not "76.5 < 96". `maxParallaxPx = 80` accepts shifts of 78–80 px that leave the canvas edge bare. `setEyeHeight` still accepts any `H` (the current suite shoots 60 and 30 ft). Clamp `H ≥ 90` or derive `PAD` from the lowest `H`, and state the check as `PAD·s(d) ≥ shift(d) + 1`.
- **m3: The canvas and mask sizes are wrong.** With `PAD = 96`, the stock Tilemap (`_margin = 20` at `rmmz_core.js:2197`, plus one tile at `DEUS_Depth.js:293-296`) produces a 1104×912 canvas (23×19 tiles), not 1008×816. 1008×816 is today's `PAD = 48` canvas, so a check that asserts 1008×816 would pass `pad_48`. A 21×17 mask doesn't cover the 23×19 cells that get painted, and the §6.5 memory figures inherit the error.
- **m4: `maxD` keeps empty planes bound.** Every plane with `d ≤ maxD` is updated (§6.2). A straight shaft from `+2` to `−2` (`dHit` only 0 or 4) keeps planes 1–3 bound, painted and drawn with no pixels to show. Use a 5-bit presence mask instead.
- **m5: Invalidation leaves out world replacement and map wrap.** Blocks are keyed `(area.x, area.y, bx, by)`, so after a load or a New Game the same keys name another world's columns. The current plugin clears its cache on `world:created` (`DEUS_Depth.js:852`). Add `world:created`, save load, and the strata schema migration to §6.3, and key the LRU by world-state identity. One-area maps loop, so block indices also need to wrap modulo size (the plugin already wraps units at `DEUS_Depth.js:539-548`).
- **m6: The cap events have nothing to repaint.** "`capChanged` / `capBreached` repaint a bound `+2` tile window" (§3.1, §6.3), but `+2` is never a lower plane (§2). `writeCap` already redraws the live `+2` cell (`DEUS_Levels.js:2807-2820`), so the compositor can ignore cap events.
- **m7: Rule 13 conflicts with the master void ramp.** `naturalWallSpec.capEdgeColor` `#121218` (`DEUS_Levels.js:3783`) quantises to `NEUT_VOID_OCCLUSION` `#14161C`, which is outside Rule 13's `#08080C`–`#121218`. `NEUT_VOID_DEEP` `#060709` is below that range. "That keeps the Rule 13 black line intact" (§5.2) overstates it. Record the ADR-002 vs Rule 13 conflict for the owner.
- **m8: Departures from the handoff aren't recorded in §9.**
  - Handoff §7.4 says lower-level animation runs on `$deusAnimationMaster.frame3`. That symbol exists only in docs (grep: the 19C handoff and `PERFORMANCE_ARCHITECTURE.md`), and the plan keeps the map's 30-frame water cadence.
  - Handoff §2 counts the ceiling cap as a sight stop; the plan's ray ignores it.
  - Both departures are defensible, and both belong in §9.
  - Also: the 48×96 wall frame's cap sits on the north cell, so `entity_clip` would cut the cap wherever the north cell's `dHit` differs. Say which rule wins.
- **m9: Wording errors.**
  - §1 says "Plugin parameters start the eye at 190 ft", but 190/6 is the `config.camera` literal (`DEUS_Depth.js:166`); the `EyeHeightFt` parameter defaults to 140 (`:51`).
  - §4.2's "nearest sampling cannot invent a color" is true at any scale. What the integer step actually buys is the same texel-drop pattern in every tile.
  - §4.4 cites Rule 12 for "fake … depth with a shader distortion". Rule 12 is about animation; the blur ban comes from handoff §6, VISION V108/V133 and PERF §6.5.
  - "the live tilemap at `z = 0`" (§2) reads as macro-level Z0. Say the tilemap's lower layer.

### What was checked and holds

- `hasOpenCells` (`DEUS_Depth.js:797-806`), `exposes: z => z > 0` (`:175`), the `Math.min(2, …)` clamp (`:205`), the `deus` 140 ft / 6 ft scales 0.959 / 0.921, the blur of 0.6 / 1.2 and the `ColorMatrixFilter` in `applyLook` (`:681-706`) are all as §1 describes.
- `SOLID_B` (`DEUS_Levels.js:1014-1020`): stone, soil and wood are solid; air, water and lava are not; bit `0x80` doesn't change solidity. The derived-shape rows in §3.3 match `derivePacked`.
- Events (`DEUS_Levels.js:1550-1566`): every material change emits `levels:cellChanged`, and an HP-only write emits `levels:strataChanged` alone. So ignoring `strataChanged` (§6.3) and dropping `shapeChanged` as the exposure signal are both right.
- Palette: 226 unique hexes. `#08080C` is absent; `#060709`, `#0C0D12` and `#14161C` are present. 58 ramps. The registry and the hex file agree.
- `tilePx` for `H ∈ {160, 120, 90}`: all 12 values match, each column strictly decreasing and never 48. Edge shifts: all 12 match. A scale of 0.80 shifts 81.6 px.
- The seven performance answers (§8.6), the save impact (none), and the out-of-scope list are consistent with the 19C handoff.

---

## 3. Evidence (commands run in this session)

### 3.1 Live-layer vs ray probe (B1, m1)

Real `DEUS_World`/`WorldGen`/`Tiles`/`Objects`/`Levels`/`Floors`, loaded with the `setup()` vm of `tools/test_strata_foundation.js` and run from stdin (no file written). New Game seed 18, `levelsGen 5`, area (0,0). The ray is the plan's §3.2, computed on the baseline strata bytes. Output, trimmed:

```text
seed 18 gen 5 size 256 newWorld 15424 ms, level gens 5,5,5,5,5
V=2: columns dHit>=1 50106; dHit=0 but live tile transparent (void shows) 0 e.g. -; dHit>=1 under an opaque live 'open' tile 0; dHit>=1 under an opaque live floor/solid 419 e.g. (140,42) +2 · Cave floor
V=1: columns dHit>=1 25334; dHit=0 but live tile transparent (void shows) 127 e.g. (175,46) +1 · Open air; dHit>=1 under an opaque live 'open' tile 0; dHit>=1 under an opaque live floor/solid 517 e.g. (124,42) +1 · Cave floor
V=0: columns dHit>=1 1368; dHit=0 but live tile transparent (void shows) 0 e.g. -; dHit>=1 under an opaque live 'open' tile 793; dHit>=1 under an opaque live floor/solid 575 e.g. (69,23) Ground · Ground
V=-1: columns dHit>=1 344; dHit=0 but live tile transparent (void shows) 0 e.g. -; dHit>=1 under an opaque live 'open' tile 38; dHit>=1 under an opaque live floor/solid 306 e.g. (221,46) -1 · Dug stone floor · Chalk and karst
O-LIP (Z0 air over solid -1), V=0: shape floor, "Ground · Ground", worldStrataElevationAt 9
Roof in the viewed cell, V=+1 [air,air,air,stone,stone] over Z0 [stone,air x4]: shape +1 open, "+1 · Open air", art
Ground cut to -2 (Z0,-1 air, -2 floor), V=0: shape open, "Ground · Ground"; V=-1: shape open, "-1 · Flooded (Fresh water) · Chalk and karst", art Dungeon_A2
ground tiles at the cut: {"layer0":3496,"layer2":3496,"region":250,"solid":true,"open":true,...}; peak_rock base 3488
vm errors: 0
```

"Transparent" follows `looksOfPacked` (`DEUS_Levels.js:1455-1459`): transparent only when `z > 0` and the shape is `open`. The probe reads derived shapes and tile ids; it did not render the screen. That the planes would be hidden on screen follows from the planes sitting under the live tilemap's lower layer (`DEUS_Depth.js:719`, `z = −1`). **Not checked:** no screenshot was taken, because no compositor implementing the plan exists.

### 3.2 Shade-table simulation (M1)

The §5.2 algorithm on `docs/art/DEUS_PaletteRegistry.json`: `k(d) = 1 − 0.04d`, nearest luminance within the ramp that has the most entries darker than the source, ties broken by lexicographic `rampId`, then lower luminance, then `colorId`, and the three void colours held unchanged:

```text
d 1 changed 0 / 226
d 2 changed 0 / 226
d 3 changed 11 / 226 lum ratio of changed min/median/max 0.76/0.77/0.81
d 4 changed 92 / 226 lum ratio of changed min/median/max 0.68/0.72/0.81
non-monotone steps 0
distinct shades across d0..d4 per color: {"1":134,"2":92}
```

### 3.3 Other commands

- `git diff --stat c846fc7c^ c846fc7c -- game tools run_tests.bat` → empty (exit 0). `git diff --stat main...HEAD` → the two documentation files only.
- Palette: `wc -l` and `sort -u` on `art/palette/deus_master_world_palette_v1.hex` → 226 / 226. `grep -ic 08080c` → 0. The void-ramp colours were found.
- Registry: 226 master colours, 58 ramps, 0 colours on no ramp, 34 on more than one.
- `node` arithmetic: PAD 48 → canvas 1008×816; PAD 96 → 1104×912. At `H = 90`, `d = 4`: `tilePx` 39, shift 76.5, projected pad 78.0, margin 1.5.
- PIXI: `game/js/libs/pixi.js` header `v5.3.12`; `SpriteMaskFilter` at line 19702; `MASK_TYPES.SPRITE` "uses SpriteMaskFilter, uses temporary RenderTexture" at line 3874.
- `grep -rln deusAnimationMaster game/js/plugins docs` → only the two docs.

---

## 4. Decisions needed (owner / coordinator)

1. **B1:** who makes the live layer transparent where the ray passes. That means changing `DEUS_Levels` looks and the `DEUS_WorldGen` ground painter (read-only for 19C) or giving the job to `DEUS_Depth`. Also, which band a lip hit belongs to.
2. **M1:** how value recession is shown on 3–5-tone ramps: coarse ramp steps at chosen depths, a static ordered dither, or no shading below some depth.
3. **M2:** quantise stand-in and stock art on lower planes, or shade master texels only until the art is on the palette.
4. **M8:** a new allocation-free column-word export from `DEUS_Levels`.
5. **m7:** Rule 13's cap range against the master void ramp (`#060709`, `#14161C`).

## 5. What acceptance of a revised plan needs

- Every BLOCKER and MAJOR above either changed in the plan or recorded in §9 with an owner decision.
- For each of the twenty or more mutants, the check it must fail can observe the code path the mutant patches, and every check name has a build and an expected result.
- This review does not claim any check, mutant or frame time. The harness does not exist, and nothing in the plan was run except the arithmetic and probes in section 3.
