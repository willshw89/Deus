# Independent Review: `docs/systems/UF_Depth_Attack_Plan.md` (WG.00.09 / DEUS-TSK-FABLE-19C)

- **Reviewer:** Claude CLI session (Lane E, `REVIEW_BRIEF.md`)
- **Date:** 2026-09-25
- **Document under review:** `docs/systems/UF_Depth_Attack_Plan.md` at commit `c846fc7c` (Grok)
- **Branch / worktree:** `task/lane-e` (`C:\Users\snewt\.deus_worktrees\lane-e`)
- **Verdict:** **CHANGES REQUESTED** (1 BLOCKER, 8 MAJOR, 9 MINOR)
- **Re-review of `37fc1473` (2026-09-25, Section 4):** **CHANGES REQUESTED** (0 BLOCKER, 1 MAJOR, 10 MINOR). B1 is resolved.
- **Re-review of `87c1e5b8` (2026-09-25, Section 5):** **CHANGES REQUESTED** (0 BLOCKER, 0 MAJOR, 4 MINOR). R1 is closed by owner ruling DEC-006.
- **Diff review of `5964f772` (2026-09-25, Section 6 at the end of this file):** **CHANGES REQUESTED** (0 BLOCKER, 0 MAJOR, 2 MINOR). N2 and N4 are resolved, N3 is resolved as asked, and N1 is partly resolved.

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

---

# Section 4: Re-Review of `37fc1473`

- **Reviewer:** Claude CLI session (Lane E)
- **Date:** 2026-09-25
- **Document under review:** `docs/systems/UF_Depth_Attack_Plan.md` at `37fc1473` (Grok, "Directive 001-F")
- **Checked against:** sections 1–5 above, `docs/handoffs/HANDOFF_DEUS_TSK_FABLE_19C_DEPTH.md`, the `docs/VISION.md` decision log, and the code the plan cites
- **Verdict:** **CHANGES REQUESTED** (0 BLOCKER, 1 MAJOR, 10 MINOR)

The blocker is fixed. The lip rule, the `_addSpot` cutout and the roof fallback close every leak the seed-18 probe found; I re-ran the probe on the plan's new ray to confirm it (4.4.1). M2–M8 are resolved in the design. One item is still open. M1 asked for an owner decision on value recession. The revision took that decision itself and labelled it "Owner decision". The rule it picked darkens depth 1 by about a third, where the user's recorded brief asks for 4 %, and on today's art it shades nothing at all. That goes to the owner before the shade path is built. The ten minors are edits to the text; none needs new investigation.

## 4.1 Item-by-item

| Item | Verdict | Basis |
|---|---|---|
| **B1** (a) lip assignment | Resolved | `zHit = floor((e + 1) / 5) − 2` matches `derivePacked` (`DEUS_Levels.js:1208-1210`) and `worldStrataElevationAt` (`:1874-1876`). Probe: the columns that move from `dHit ≥ 1` to `0` are exactly the review's lip counts (419 / 517 / 575 / 306 on `+2` / `+1` / `0` / `−1`), and every one of them is a live `floor`. |
| B1 (b) live-layer contract | Resolved | `DEUS_Depth` owns it and the painters stay read-only. `_addAllSpots` clears both layers (`rmmz_core.js:2422-2424`), and `_addSpot` adds every rect of a cell on both layers (`:2436-2461`), so skipping the spot is a clean cut. No DEUS plugin overrides `Tilemap.prototype._addSpot`, `_addAllSpots` or `_readMapData` for the live map (grep: only `DepthTilemap`). Zoom is locked at 1.0 (`DEUS_Camera.js:104-117`), so the live 19×15 spot grid lies inside the 23×19 summary. After the lip rule the cutout must skip 793 ground columns and 38 on `−1` (seed 18), as §3.5 says. Residuals: R4, R5. |
| B1 (c) `dHit = 0` fallback | Resolved (look open) | An opaque tile at scale 1 where the live tile is transparent. 127 cells on `+1`, none on any other camera (seed 18); 188 / 621 / 122 on seeds 3 / 21 / 4. `shapeCodeAt` with numeric arguments is allocation-free on a warm grid (`cellQuery` and `packedGridOf`, `DEUS_Levels.js:1299-1311`). The tile it draws: R6. |
| B1 (d) screen checks | Resolved | `P-CUTOUT` samples roof, hole, void and live per camera, and fails when a present class is not sampled. `live_cutout_off` maps to it. Seed 18 has every class except void; none of the four seeds has a void column (4.4.1). |
| **M1** shade table | **Partly resolved** | The checks now work. `S-STEP` fails an identity table (192 of 226 slots change at `d = 1`), `S-MONO` holds (0 non-monotone steps), and `S-SHADE-ORACLE` pins the ramp choice. But the owner did not take the decision the finding asked for: **R1**. |
| M2 transition | Resolved | Master texels are stepped, other texels copied unchanged, alpha split at 128, the shadow quad skipped. What that means on current art is part of R1. |
| M3 repaint cost | Resolved | Shaded copies are built once. A repaint is `clearRect` + `drawImage` + `baseTexture.update`. `getImageData` runs only in the sheet build. The pan benchmark reports GC counts. Memory: R9. |
| M4 masks | Resolved | No sprite mask anywhere. Tile ownership is painted into the canvas and entities are cropped with `setFrame`. `no_sprite_mask` reads `.mask` on planes and their children plus the stub's own construct count, and `sprite_mask_production` maps to it. Sprites wider than 48 px: R11. |
| **M5** mutants and checks | Resolved except R2 and R8 | `cache_ignores_destroy` is redefined so `C-DIG` can kill it: `writeCell` emits `cellChanged` before `damageCell` emits `strataDestroyed` (`DEUS_Levels.js:1558-1566`, `:1713-1722`). `max_depth_clamped_2` → `O-SHAFT-DRAW` (stub). `float_scale` → `S-SCALE-INT`: at `H = 120`, `48·H/(H+5d)` is 46.08, 44.31, 42.67, 41.14, never an integer. `palette_lerp` → `S-PAL-CANVAS`. All 32 check names used in §8.3 and §8.4 are defined in §8.2 (27 mutants). The exit-code rule is fixed (line 492) and the harnesses are split. `absolute_z_scale` still can't be seen: R2. |
| M6 live allocation | Resolved | `C-LIVE-ALLOC` runs with `exposed > 0`, plane 4 bound and a walking lower unit, under `--expose-gc`. It measures heap and GC and doesn't trust the counter, so `alloc_unwired` fails it. The live `_addSpot` wrapper is outside it: R4. |
| M7 picture gate | Resolved | A five-level frame plus one shot per camera, as handoff §10.3 asks. From `+2`, the number of 17×13 views showing `dHit` 0 through 4 together is 72 on seed 18, 41 on seed 4, and 0 on seeds 3 and 21, so the five-level frame has to come from seed 18 or 4. Camera `−2` sees only `dHit = 0` on all four seeds. |
| M8 block fill | Resolved | No new export. The public reader (`baseline().strata.m`, the 22-hex record in `state.levels[z].strata`, `STRATA_MATERIALS[..].solid`, bit `0x40`) gives the same 25-bit word as `strataAt` on all 65,536 columns of area (0,0) for seeds 18, 3, 21 and 4, and after five `setStrata` writes (air, roof, water, constructed soil). `putDelta` writes the hex string in the same call as the decoded map (`DEUS_Levels.js:1347-1352`), so the string is never stale. Edge cases: R11. |
| m1 lip entities | Resolved | §7 uses the same lip rule, so a unit on a lip is in its own level's list. |
| m2 pad | Resolved | `H ≥ 90`. `PAD·tilePx/48 ≥ shift + 1` holds in all 12 cells (tightest 78.0 ≥ 77.5), and `PAD = 48` fails at all three eyes. |
| m3 canvas | Resolved | 1104×912 (23×19), recomputed. |
| m4 presence | Resolved | 5-bit presence mask. |
| m5 world / wrap | Resolved | `world:created`, load, schema version and state identity are all covered. A load assigns a new object (`DEUS_World.js:2910`), so the identity test works. The block index wraps. |
| m6 cap events | Resolved | Ignored. |
| m7 Rule 13 | Recorded | Logged in §9 as an open art decision, which is acceptable. |
| m8 departures | Resolved | `frame3` and the cap departure are in §9, and the wall-cap crop rule is in §7. One new departure is not in §9: R10. |
| m9 wording | Resolved | All four fixed. |

## 4.2 New and residual findings

### MAJOR

**CR-19C-R1: M1's decision is labelled an owner decision, the owner didn't make it, and it overrides a recorded user brief by a wide margin.**

- §5.2 (line 290) is headed "Decision for CR-19C-M1", and the §9 row (line 746) says "**Owner decision, M1.**" There is no record of it anywhere I looked: the `docs/VISION.md` decision log, `docs/STATUS.md`, and the Lane E message bus (`tasks/DEUS-TSK-FABLE-19C/messages.jsonl` in the canonical checkout). "Directive 001-F" appears only as the coordinator's lane assignment in STATUS.
- The user's brief is on record (`docs/VISION.md:383`, 2026-09-24): "colour recession about 4 % brightness and saturation per level (96 / 92 / 88 / 84 %) … nothing frozen before the screenshots are reviewed". Line 288 retires those figures.
- I ran the §5.2 rule on the registry (4.4.2). It changes 192 of the 226 colours at every depth. The median luminance ratio is **0.67 at depths 1–2** (range 0.43–0.81) and **0.47 at depths 3–4** (range 0.23–0.70). So planes come out about 33 % darker where the brief asks for 4 %, and about 53 % darker where it asks for 12–16 %. Depths 1 and 2 are identical for every colour, and so are depths 3 and 4, so value never separates plane 1 from plane 2.
- Under M2's pass-through rule, the step applies only to texels that are exact master hexes. Of 11,741,932 opaque texels in `game/img/tilesets/*.png`, **0.01 %** are master hexes (only `Inside_A5`, at 0.5 %; see 4.4.3). On today's tiles `deus` therefore renders the same as `deus_scale`. Once master-palette art lands, the same planes drop by a third.
- The plan states neither number. The brief's acceptance line ("a human, a tree, a bridge, a cave entrance … stay recognisable at depth 4") is exactly what a 0.23–0.70 ratio puts at risk.

**Required:**
- Relabel §5.2 and the §9 row as a proposal awaiting the owner.
- Put both measurements in front of the owner, through the coordinator, with the options: this rule; one step at depths 3–4 only; a static ordered dither between ramp neighbours (review M1); or scale-only recession until the art is on the palette.
- Keep `S-STEP`, `S-MONO` and `S-SHADE-ORACLE` whichever rule is chosen.
- Only the shade path waits for this decision; the rest of the plan does not.

### MINOR

- **R2: `absolute_z_scale` still can't fail `S-RELATIVE`.** §8.2 lists `S-RELATIVE` under "Scale (node, except `S-SCALE-INT`)" (line 549). The node harness has no planes, and its only scale export is `tilePx(H, d)`, which takes no `z`. The check therefore reduces to `tilePx(120, 1) = 46` and `tilePx(120, 2) = 44`, which `S-120` already asserts, and a binder that keys scale on `z` passes it. Checking from camera `+2` alone doesn't help either: a table keyed as `d' = 2 − z` equals `d` there, so `S-SCALE-INT` misses it too. The driver would still catch this (the mutant exits 0 and fails the gate), so it is not a false pass. But the gate can't go green as specified.
  - **Fix:** move `S-RELATIVE` to the stub. Bind with `V = +1` and then `V = +2`, and read `plane.scale.x × 48` on the plane showing `z = 0`: expect 46, then 44. Do the same for `z = +1` from `+2` and `z = −1` from `0`: both 46.
- **R3: "Owner decision" labels on B1, M2 and M8** (lines 169, 742, 743, 747, 754). These three choices stay inside the handoff's owned paths and are the alternatives the review offered, so they don't need the owner. As written, the log records owner decisions that were never made.
  - **Fix:** relabel them "Plan decision (within handoff §9 authority)".
- **R4: The live tilemap repaints with the camera still, and nothing measures the wrapper.**
  - Line 179 says "A still camera does not repaint." But stock `Tilemap.update` advances `animationFrame` every 30 frames (`rmmz_core.js:2327-2329`), and `updateTransform` rebuilds every spot when it changes (`:2378`). The `_addSpot` wrapper therefore runs 285 times (19×15) every 30 frames with the camera still, and again on every live start-tile change.
  - §8.6 item 3 forbids allocation in the wrapper, but no check runs it. The stub harness doesn't include the stock `Tilemap`. The pan benchmark (line 717) exempts "a GC inside the live WebGL tilemap's own rebuild", which is exactly where the wrapper runs.
  - **Fix:** correct the sentence. Either run the real `Tilemap.prototype._addAllSpots` with the wrapper inside `C-LIVE-ALLOC` (240 frames include 8 repaints) or add a separate heap/GC check. Drop the exemption for GC inside the wrapper.
- **R5: The spot-to-summary mapping isn't pinned, and the loop seam leaks.**
  - (a) The wrapper reads `dHit` for the live spot's cell. The live start tile is `floor((ceil(ox) − 20) / 48)` (`rmmz_core.js:2369-2370`), and the depth canvas starts two tiles before it. "Rebuild the summary when the camera crosses a cell" (line 384) reads naturally as `floor(displayX)`. Write `ox = 48k + r`. The live start tile is `k − 1` for `r < 20` and `k` otherwise, so no fixed offset from `floor(displayX)` is right for the whole pan. A player-centred camera at rest has `r = 0`. Keyed that way, every cut lands one cell off for 20 px of every 48.
    - **Fix:** key the summary on the depth canvas start tile, which is the live start tile − 2. Rebuild it in `updateTilemap`, where the root already updates after the stock origin is set (`DEUS_Depth.js:824-826`, `rmmz_sprites.js:3485`), so it runs before the live `updateTransform`. The wrapper indexes `(x + 2, y + 2)` of its spot loop. Add a `P-CUTOUT` sample at `r < 20`.
  - (b) `_addSpot` passes unwrapped `mx`, `my`; only `_readMapData` wraps (`rmmz_core.js:2618`). Level maps loop (`scrollType: 3`, `DEUS_World.js:622`), and `shapeCodeAt` returns 0 for `x < 0` or `x ≥ size` (`DEUS_Levels.js:1299-1308`). So a `+1` roof at the seam falls through to case 3 and paints `open_air`, and the void shows.
    - **Fix:** wrap `mx`, `my` before calling `shapeCodeAt`, and add a surgical seam roof to `P-CUTOUT`.
- **R6: The roof fallback paints a dug floor.**
  - Case 2 (line 176) draws `mined_stone` ("Dug stone floor"), `mined_soil`, or `deck_wood` ("Wooden floor", a constructed look) on an undug natural roof (`DEUS_Levels.js:130-131`).
  - The painter's own look for the top of solid material is `rock` or `soil` (`looksOfPacked`, `:1457`). A roof next to solid rock would read as a walkable dug floor, while `UF_Look` still reports "Open air".
  - The same happens on plane-owned `open` cells at `z ≤ 0`: `cave_floor` + `hole_edge` marks a hole over rock.
  - This is not a leak. **Fix:** name the look and say why; the solid look is the consistent choice.
- **R7: The shading checks need a fixture, and the step can produce the void colour.**
  - Only 0.01 % of texels in the real sheets are master hexes (R1), so `S-SHADE-VIS` ("one master texel that `S-STEP` says changes") has nothing to test on real art. A `palette_lerp` build, or an unwired table, that touches only master texels changes no real pixel.
    - **Fix:** name a master-palette fixture sheet for `S-SHADE-VIS`, `S-PAL-CANVAS` and `S-PASS`. A missing fixture exits 2.
  - `HIGH_SOIL_01` (at `d = 1..4`) and `VOLC_CHAR_03` (at `d = 3..4`) step onto `NEUT_VOID_CAP` `#0C0D12`, which is the void texel. In all, 9 non-void colours step onto one of the three void ids (4.4.2). A shaded plane pixel can then equal the void, while `P-CUTOUT` and `void_palette` tell hole from void by colour alone.
    - **Fix:** exclude the void ids as step targets for non-void colours, or have `P-CUTOUT` identify the source layer another way.
- **R8: Harness labels, a missing export, and one underspecified build.**
  - `C-STILL`, `C-HP`, `C-ALLOC` and `C-ONE` read upload and rebuild counters and "no plane bound", and `S-PAD` reads "the constructed layer size". All of these need the depth update or the layer, which only the stub harness provides, but they are labelled node.
  - `C-DIG`, `C-WORLD` and `C-WRAP` compare "the word", but the export table (lines 512-518) has no block-word reader, and `columnHit` is not required to read through the cache.
    - **Fix:** add `UF.Depth.blockWord(area, x, y)`, or require `columnHit` to go through the cache.
  - `O-ROOF-V` says "It may be `open`" (line 529) and doesn't pin `V−1`'s `S4`. With a solid `S4` below, the cell derives `floor` (a lip), and `shape_open_is_hole` never fires.
    - **Fix:** build `V−1 S4` as air, and assert shape `open` as a precondition (exit 2 otherwise).
  - For `cache_no_wrap`, pick a row where `(size−1, y)` and `(size−1, y−1)` differ, so the unwrapped read is visibly wrong.
- **R9: The memory for the shaded copies isn't stated.**
  - Line 331 builds "one shaded copy per depth in `1..4`". The chosen table makes `d1 ≡ d2` and `d3 ≡ d4` for every colour, so two copies are enough.
  - On today's art every copy is byte-identical to its source.
  - Tileset 92's four runtime sheets alone are 2,027,520 px, which is 8,110,080 bytes per copy. The eight plane canvases add 32,219,136 bytes, created with the scene. §6.5 gives no total.
  - A first bind in play runs `getImageData` and a per-texel search on about 2 M px, which will hitch.
  - **Fix:** share one copy between depths that have the same table column, skip the copy for a sheet with no master texel, build at scene start, and state the total.
- **R10: `off`, and one unrecorded departure.**
  - The F7 cycle keeps `off` (line 312), but the plan doesn't say whether the cutout and the roof fallback stay on under it. If they stay, a hole with the planes off shows the parallax, which §5.1 forbids. If they go, the `+1` roof leak returns.
    - **Fix:** say which.
  - Handoff §10.1 asks for "Pure Node.js VM execution", and the plan adds an nw.js render harness. I asked for that split and it is right, but the departure belongs in §9.
- **R11: Edge cases.**
  - The fill should behave like `locate`. With an unknown `strataSchemaVersion`, `deltaLevels` ignores the saved records (`DEUS_Levels.js:1133-1137`), but the hex reader would read them. An unreadable record is skipped by `deltaLevels` (`:1146-1150`), but the hex reader would read it raw.
  - §7's crop rule only handles the north cell of a 48×96 frame. A sprite wider than 48 px whose east or west column has a different `dHit` needs its own rule. A rectangle crop can't express L-shaped ownership, so the plan should say what gets dropped.

## 4.3 Containment

- `git show --name-status 37fc1473` → `docs/systems/UF_Depth_Attack_Plan.md` and `tasks/DEUS-TSK-FABLE-19C/state.md`.
- `git diff --stat 37fc1473^ 37fc1473 -- game tools run_tests.bat` → empty.
- `git diff --stat main...HEAD` → the plan, this review, and `state.md` only.

Neither the revision nor this re-review added or changed engine code, a harness, or data.

## 4.4 Evidence (commands run in this session)

### 4.4.1 Live layer vs the plan's ray

This is the section 3.1 method, run again: the real plugins in the `setup()` vm of `tools/test_strata_foundation.js`, a New Game with `levelsGen 5`, area (0,0), and the census taken before any edit. The probe script lived in the system temp folder, not in the repo.
- "Ray" is §3.2 with the lip rule; "old ray" is `floor(e / 5) − 2`.
- "Transparent" means `V > 0` and shape `open` (`DEUS_Levels.js:1455-1456`).

Seed 18, trimmed:

```text
seed 18 size 256 newWorld 12057 ms gens 5,5,5,5,5 legacyGround false groundVolumetric true
public-bytes word vs strataAt: 0 mismatches of 65536 columns (baseline only)
V=+2: dHit hist 0..5 [15849, 24870, 24035, 751, 31, 0]; old-ray dHit>=1: 50106; moved to dHit=0 by lip rule: 419 (live shape floor: 419); new dHit>=1 under an opaque live tile (cutout must skip): 0 ; dHit=0 under transparent live tile (roof substitute): 0
V=+1: dHit hist 0..5 [40719, 24035, 751, 31, 0, 0]; old-ray dHit>=1: 25334; moved to dHit=0 by lip rule: 517 (live shape floor: 517); new dHit>=1 under an opaque live tile (cutout must skip): 0 ; dHit=0 under transparent live tile (roof substitute): 127 (175,46)
V=0: dHit hist 0..5 [64743, 760, 33, 0, 0, 0]; old-ray dHit>=1: 1368; moved to dHit=0 by lip rule: 575 (live shape floor: 575); new dHit>=1 under an opaque live tile (cutout must skip): 793 (71,24) shape 3 d1; dHit=0 under transparent live tile (roof substitute): 0
V=-1: dHit hist 0..5 [65498, 38, 0, 0, 0, 0]; old-ray dHit>=1: 344; moved to dHit=0 by lip rule: 306 (live shape floor: 306); new dHit>=1 under an opaque live tile (cutout must skip): 38 (191,85) shape 3 d1; dHit=0 under transparent live tile (roof substitute): 0
V=-2: dHit hist 0..5 [65536, 0, 0, 0, 0, 0]; ...
V=+2: 17x13 viewports showing dHit 0,1,2,3,4 together: 72 (first top-left (175,75))
after 5 setStrata edits (5 hex records in state): 0 word mismatches
vm errors 0
```

Seeds 3 / 21 / 4, same run:

| Measure | Seed 3 | Seed 21 | Seed 4 |
|---|---:|---:|---:|
| Word mismatches vs `strataAt` | 0 | 0 | 0 |
| Roof fallback cells on `+1` | 188 | 621 | 122 |
| Cutout columns on `0` | 94 | 68 | 441 |
| Cutout columns on `−1` | 78 | 14 | 70 |
| Five-`dHit` views from `+2` | 0 | 0 | 41 |
| `dHit = 5` columns, any camera | 0 | 0 | 0 |
| vm errors | 0 | 0 | 0 |

The probe reads strata and derived shapes; it does not render anything. **Not checked:** no screenshot was taken, because no compositor implementing the plan exists yet.

### 4.4.2 The §5.2 step table on the registry

Input: `docs/art/DEUS_PaletteRegistry.json` (226 colours; all 226 hexes are in `deus_master_world_palette_v1.hex`), with ramp choice and tie-breaks as in §5.2 and the void ids held as identity.

```text
d 1 changed 192 / 226 lum ratio min/median/max 0.43/0.67/0.81
d 2 changed 192 / 226 lum ratio min/median/max 0.43/0.67/0.81
d 3 changed 192 / 226 lum ratio min/median/max 0.23/0.47/0.70
d 4 changed 192 / 226 lum ratio min/median/max 0.23/0.47/0.70
non-monotone steps 0 | distinct shades per colour d0..d4 {"1":34,"2":42,"3":150} | at dark end of chosen ramp (no step at d1) 31 | multi-ramp colours 32 of which ramps span >1 materialFamily 24 | non-void colours stepped onto a void id 9
d1==d2 for every colour true | d3==d4 for every colour true
HIGH_SOIL_01 #1D1B18 ramp VOLC_WOOD_CHARRED d1 NEUT_VOID_CAP d3 NEUT_VOID_CAP
VOLC_CHAR_03 #362D2A ramp VOLC_WOOD_CHARRED d1 HIGH_SOIL_01 d3 NEUT_VOID_CAP
```

### 4.4.3 Master texels in today's tile art

`tools/png_read.js` over every `game/img/tilesets/*.png`, counting texels with alpha ≥ 128 whose RGB exactly matches one of the 226 master hexes. Trimmed:

```text
Dungeon_A2.png                      442368 opaque    0.0% master
Inside_A2.png                       392916 opaque    0.0% master
Inside_A5.png                       292608 opaque    0.5% master
Temperate_Z0_CORE_A2.png            425016 opaque    0.0% master
ALL 11741932 opaque 0.01% master
```

### 4.4.4 Other

- Owner-decision search:
  - `grep -rn "001-F"` in this worktree finds only the plan's and `state.md`'s headers.
  - In the canonical checkout it appears in `docs/STATUS.md` as the lane assignment, never alongside a depth decision.
  - `grep "2026-09-2[45]" docs/VISION.md` finds V134, V135 and the 2026-09-24 depth brief, and no later depth entry.
- Arithmetic (`node`):
  - `tilePx` for `H` = 160 / 120 / 90 matches §4.2.
  - `PAD·s ≥ shift + 1` is true in all 12 cells with `PAD = 96`, and false at all three eyes with `PAD = 48`.
  - Canvas 23×19 = 1104×912, which is 4,027,392 bytes per canvas and 32,219,136 for eight. The live spot grid is 19×15.
- Plan cross-check: 49 check ids in §8.2; 32 names used in §8.3/§8.4, none undefined; 27 mutants.
- `grep "Tilemap.prototype" game/js/plugins/*.js` finds only `DepthTilemap` in `DEUS_Depth.js`. The active plugin list in `plugins.js` includes `DEUS_Camera` (zoom fixed at 1.0) and `DEUS_Culling`.

## 4.5 Decisions needed (owner / coordinator)

1. **R1:** the value recession rule, decided with the numbers in 4.4.2 and 4.4.3 in hand.
2. **R6:** which tile a natural roof shows on the live map: a dug floor, or the solid rock look.
3. **m7** (still open from the first review): Rule 13's cap range against the master void ramp.

## 4.6 Overall verdict

**CHANGES REQUESTED.** B1 and M2–M8 are resolved in the design, and the fixes hold up against both the code and the probe. M1 is resolved as a testing matter but not as a decision, and that decision belongs to the owner (R1). R2–R11 are text edits. Once the owner's answer on R1 is recorded and R2–R11 are edited, I expect to pass the plan on a diff review without new probes. This re-review claims no check result, mutant kill, screenshot or frame time; none of them exists yet.

---

# Section 5: Re-Review of `87c1e5b8`

- **Reviewer:** Claude CLI session (Lane E, `REVIEW_BRIEF.md`, Directive 001-H)
- **Date:** 2026-09-25
- **Document under review:** `docs/systems/UF_Depth_Attack_Plan.md` at `87c1e5b8` (Grok, "owner ruling R1 = D and items R2–R11")
- **Checked against:** Section 4 above, `docs/OWNER_DECISIONS.md` (the lane-e copy and `main`), and the code the new text cites
- **Verdict:** **CHANGES REQUESTED** (0 BLOCKER, 0 MAJOR, 4 MINOR)

R1 is closed. The owner's ruling is on record as DEC-006, and the plan implements it as written. R2, R3 and R5–R10 are resolved. R4 and R11 are folded in, but the new text contains two checks that a correct build can't pass or can't agree with (N1, N3). There is also an ordering gap in the live cutout that I missed in Section 4; it comes from the R5 placement I proposed (N2). N4 is citations. All four are text edits and none needs the owner. I expect to pass the next revision on a diff review.

## 5.1 Item-by-item

| Item | Verdict | Basis |
|---|---|---|
| **R1** shade rule | Resolved | **Record:** `docs/OWNER_DECISIONS.md` on `main` has DEC-006 / R1: Status DECIDED, "Decider: Owner", Option D, 2026-09-25. It landed in `eefd1f2c` at 22:43, five minutes before `87c1e5b8`. The lane-e copy stops at DEC-004 because lane-e is not rebased on `main`. **Plan:** it implements D as written. The table is identity at every depth (§5.2). `S-STEP` requires 0 changed slots, and `shade_stepped` must fail it. No shaded copies exist (§5.3; §6.5 lists 0 bytes). `deus` and `deus_scale` paint the same colours. §10 puts shading out of scope. The retired figures are quoted correctly from sections 3.2 and 4.4.2. Citation: N4. |
| R2 `S-RELATIVE` | Resolved | It is now in the stub table and in the stub row of §8.1. The expected values are right: `z = 0` is `d = 1` and then `d = 2` (46, then 44); `z = +1` from `+2` and `z = −1` from `0` are both `d = 1` (46). A scale keyed on `z` returns the same value for both `z = 0` reads, so `absolute_z_scale` fails the check. See note 1. |
| R3 labels | Resolved | B1 (lines 171, 785, 786), M2 (327, 790) and M8 (380, 798) now read "Plan decision (within handoff §9 authority)". `grep -i owner` finds only the R1 lines. |
| R4 live repaint | Partly resolved | Line 194 now says a still camera repaints every 30 frames with 285 wrapper calls, which matches `rmmz_core.js:2327-2329` and `:2367-2389`. The wrapper runs inside `C-LIVE-ALLOC`, and the pan benchmark no longer exempts it. But the check now contains stock allocation that it can't separate from the wrapper, and its budget is below the measurement floor: N1. |
| R5 mapping and seam | Resolved, see N2 | The summary is keyed on the depth-canvas start (live start − 2). It is rebuilt in `updateTilemap` after the origin is set (`rmmz_sprites.js:3484-3487`; the hook is `DEUS_Depth.js:825-828`). The wrapper indexes `(x + 2, y + 2)`, so the 19×15 spot grid sits inside the 23×19 summary. `wx` and `wy` are wrapped before `shapeCodeAt`. `P-CUTOUT` has the `r < 20` sample and the seam roof. What happens after a dig is N2. |
| R6 roof look | Resolved | stone → `rock`, soil → `soil`, wood → `rock` is `looksOfPacked`'s own rule for solids (`DEUS_Levels.js:1457`), and `UF.Levels.tileOf` is exported (`:4620`). Plane-owned `open` cells use the same keys (line 196). `P-CUTOUT` and the picture gate (line 748) check "not `mined_stone`". |
| R7 fixture, void target | Resolved | `tools/test_fixtures/depth_shade_master.png` is named for `S-PAL-CANVAS`, `S-PASS` and `S-SHADE-VIS`, and a missing file exits 2. The void-id exclusion is part of the deferred candidate (line 323). Under D the table is identity, so today no shaded pixel can equal the void. |
| R8 harness labels, export | Resolved | The stub row of §8.1 lists `C-STILL`, `C-HP`, `C-ALLOC`, `C-ONE`, `S-PAD`, `S-RELATIVE`, `S-SCALE-INT` and `C-LIVE-ALLOC` (5.5.4). `UF.Depth.blockWord` is exported (line 547), and `C-DIG`, `C-WORLD` and `C-WRAP` read it. `O-ROOF-V` pins `V−1 S4` = air behind an exit-2 precondition. `C-WRAP` picks a row where `(size−1, y)` and `(size−1, y−1)` differ. |
| R9 memory | Resolved | Recomputed: 1104 × 912 × 4 = 4,027,392 bytes per canvas, 32,219,136 for eight. Tileset 92 is 2,027,520 px × 4 = 8,110,080 bytes per copy: 32,440,320 for four copies, 16,220,160 for two. Under D there are no shaded copies. After migration, depths with equal columns share a copy, a sheet with no master texel gets none, and copies build at scene start. The §6.5 rows sum to 32,237,215 bytes. There is no total row, and I'm not asking for one again. |
| R10 `off`, departure | Resolved | Under `off` the cutout and the roof fallback stay, and holes show `#0C0D12` (lines 63, 321, 800). `P-CUTOUT` asserts both under `off`. The handoff §10.1 departure is in §9 (line 794). |
| R11 edge cases | (a) Resolved; (b) partly resolved | (a) The fill matches `deltaLevels`. An unknown `strataSchemaVersion` drops every saved record (`schemaKnown`, `DEUS_Levels.js:1133-1139`), and both treat a missing version as known. A record that fails `decodeRecord` or `validRecord` (`:1115-1128`) is skipped (`:1146-1150`). (b) The largest-rectangle crop rule is written down, but `entity_clip` expects a different answer and the rule has no tie-break: N3. |
| m7 Rule 13 | Still open | Logged in §9 (line 801). ADR-002 Rev 2 on `main` adds to it: coordinator item 1. |

## 5.2 New findings

### MINOR

**CR-19C-N1: `C-LIVE-ALLOC` can't pass on a correct build.**

The R4 fold runs stock `Tilemap.prototype._addAllSpots` inside the check, and the stock layer allocates.

- **Stock allocation.** `Tilemap.Layer.prototype.addRect` pushes a new 7-element array for every rect (`rmmz_core.js:2926-2928`). Both of the wrapper's drawing cases end there: case 2 calls `_addTile`, and case 3 calls the original `_addSpot`.
  - Measured (5.5.1): eight rebuilds of the 19×15 grid, at one rect per spot, grow the heap by 311,544 bytes. That is about 1,298 bytes per frame over the check's 240 frames. The budget is under 1 byte per frame.
- **The exemption has no boundary.** The sentence "Stock Tilemap allocations outside the wrapper are reported and are not this check's fail" doesn't help. The stock allocation happens while the wrapper is on the stack. "Heap sampled around the wrapper body" therefore includes it, and the harness has no boundary it can measure.
- **The budget is below the measurement floor.** I measured an empty window the way `no_allocation_queries` measures (`global.gc()`, heap statistics before and after, a GC observer). With no work in it, the window grows by 616 bytes. Under 1 byte per frame over 240 frames is 240 bytes, so a build that allocates nothing still fails.
  - `no_allocation_queries` avoids this by running 2,000,000 queries against a 2,000,000-byte limit and judging the least of three windows (`tools/test_strata_foundation.js:768-787`).
- **The pan benchmark (line 760) has the same attribution problem in nw.js.** There the live layers are stock. A 120-frame pan rebuilds them about 19 times (15 start-tile changes and 4 animation ticks), so a GC can land while the wrapper is on the stack in a correct build.
  - The per-flush clause ("a heap growth of 1 byte or more inside a depth-canvas flush fails") hits the same floor. That clause predates this revision, and I passed it in Section 4 (M3). That was a miss on my part.
  - Part of this finding comes from my own R4 fix. It asked for stock `_addAllSpots` inside `C-LIVE-ALLOC` and didn't say how to handle the stock allocation.

**Fix:**
- **Stub layers.** In the stub, give the live tilemap two recording layers. Their `addRect` writes into a pooled typed array, and their `clear` resets a count. Everything above them stays stock: `_addAllSpots`, `_addSpot`, `_addSpotTile`, `_addTile`, `_addAutotile`, `_addShadow`, `_readMapData`. With such a layer, the same eight rebuilds grow the heap by 616 bytes, the empty-window figure.
- **Measurement.** Measure the way `no_allocation_queries` does: three windows, each after `global.gc()`, zero GCs inside the windows, and the least window judged. Either run enough frames that the budget is at least 100 times the empty-window growth, or judge growth net of an empty window measured in the same run.
- **Scope.** State that stock `addRect` allocation is outside the depth budget.
- **nw pan benchmark.** Report GCs during live rebuilds; don't fail on them. The stub check is the wrapper's proof. Judge the per-flush heap figure net of an empty sample pair, or over many flushes.

**CR-19C-N2: after a dig, the live cutout can stay stale for up to 30 frames.**

Stock RMMZ updates the spriteset before it runs the simulation. `Scene_Map.update` calls `Scene_Message.prototype.update` first (`rmmz_scenes.js:819-820`), and that reaches `Spriteset_Map.updateTilemap` and the depth update. Only then does it call `updateMainMultiply`, which reaches `$gameMap.update` and the colonist job tick (`DEUS_Colonists.js:5748-5756`), where digging happens. Render comes after both.

What happens on a dig:
- **Frame N.** The dig lands after this frame's summary rebuild. Two things set `_needsRepaint` synchronously: the §6.3 `cellChanged` handler (line 421), and the painter's own tile write (`patchTile` → `_tilemap.refresh()`, `DEUS_World.js:700`, `rmmz_core.js:2360-2362`). The render then rebuilds the live spots from the pre-dig `dHit` and clears `_needsRepaint`.
- **Frame N+1.** The depth update rebuilds the summary, but nothing sets `_needsRepaint` again.
- **After that.** The live map keeps the stale decision until the next animation tick or start-tile change.

What the player sees:
- **Digging out a `+1` floor.** The cell derives `open` with a stale `dHit = 0`, so case 2 draws the solid `rock` fallback over the new hole for up to half a second.
- **Building a floor over a hole.** The stale `dHit ≥ 1` skips the cell while the repainted plane no longer owns it, so the void shows.

No check covers this. `C-DIG` stops at `blockWord` and "the next update has the new `dHit`", and `P-CUTOUT` samples a world that isn't changing. This follows from the R5 placement I proposed; in Section 4 I didn't consider that the simulation runs after the spriteset.

**Fix:**
- The handler only marks the block dirty. The depth update sets the live tilemap's `_needsRepaint` whenever it rebuilds the summary because of a dirty in-window block, or because `V` or `H` changed.
- Add a stub check: apply a dig after the depth update and before `updateTransform`, in the order `Scene_Map.update` produces. By the next frame, the wrapper's decision for that cell must match the new `dHit`.
- Add a mutant that leaves the repaint to the handler.

**CR-19C-N3: `entity_clip` expects a different crop than §7's rule, and the rule has no tie-break.**

- §7 (line 504) says the crop is "the largest axis-aligned rectangle that includes the foot cell and only cells whose `dHit` equals `d`".
- `entity_clip` (line 646) expects "East/west mismatch: `setFrame` width is 48, the foot cell". That agrees with §7 only when both sides mismatch.
  - Example: a 144×48 sprite centred on its foot cell, with only the east column different. The largest rectangle keeps the west column and the foot, which is 96 px wide. The check expects 48.
- Ties happen. Example: a 96×96 sprite whose north-east and north-west cells differ. `{foot, north}` (48×96) and the full foot row (96×48) are both 4,608 px².

**Fix:**
- Pin a tie-break in §7.
- Derive `entity_clip`'s expected frame from the rule. Cover a one-sided mismatch (the wider frame), a two-sided mismatch (48), and one tie case (the tie-break's answer).

**CR-19C-N4: citations.**

- **The ruling has no citation.** The header, §5.2 and §9 say "Owner ruling R1 = D recorded" but never say where. R1 was raised in the first place because an owner decision had no record.
  - Fix: cite `docs/OWNER_DECISIONS.md` DEC-006 in the header, §5.2 and the §9 row. Until lane-e is rebased, that record lives on `main` at `eefd1f2c`.
- **The `uf.hex` count is wrong.** Line 295 calls `art/palette/uf.hex` "the legacy 384-color list". The file has 256 lines and 250 distinct colours (`wc -l`, `sort -u`). The 384 was copied from ADR-002 Rev 1, line 11; Rev 2 on `main` corrects it.
  - Fix: state the real count, or drop the number.

### Notes (no change required)

1. `S-RELATIVE` reads the scale of planes that must be bound, but a plane is updated only when its presence bit is set (§2, §6.2). The build should put columns with `dHit = 1` and `dHit = 2` in the window. If a plane it reads is unbound, the check should exit 2, as `O-ROOF-V` does with its precondition.
2. The "recorded candidate" for the post-migration revisit (line 323) is DEC-006 Option A plus the void exclusion. DEC-006 says "revisit" and doesn't choose an option. The plan's word "candidate" leaves that choice with the owner.

## 5.3 Coordinator items

1. **ADR-002 Rev 2 and the void texel.**
   - ADR-002 Rev 2 is PROPOSED and is on `main` (lane-c3 merge `8db39b0b`, authored in `70dad277`).
   - It makes `uf.hex` canonical for runtime and requires new runtime colour sources to use `uf.hex` entries (§1.4). It also measures 0 colours shared between the two palettes (§2.1).
   - The plan's void texel `#0C0D12` (`NEUT_VOID_CAP`) is a master colour and a new runtime colour source.
   - If Rev 2 is accepted, the void hex and the expected hex in `void_palette` and `P-CUTOUT` must follow that decision. This widens m7. Grok can't settle it in the plan while Rev 2 is only proposed.
2. **DEC-006 Option A figure.** Option A reads "~67 % darker at depth 3". The measurement in 4.4.2 is a median luminance ratio of 0.47 at depths 3–4, which is about 53 % darker. The ruling doesn't change.
3. **Rebase.** Lane-e doesn't contain `eefd1f2c`, `d087b097` or the ADR-002 revision. Rebase or merge before the next revision so the plan's citations resolve inside the branch.
4. **m7** is still open.

## 5.4 Containment

- `git show --name-status 87c1e5b8` → `docs/systems/UF_Depth_Attack_Plan.md` and `tasks/DEUS-TSK-FABLE-19C/state.md`.
- `git diff --stat 87c1e5b8^ 87c1e5b8 -- game tools run_tests.bat` → empty.
- `git diff --stat main...HEAD` → the plan, this review and `state.md` only.
- This re-review edits `claude_review.md` and `state.md` only.

## 5.5 Evidence (commands run in this session)

### 5.5.1 Heap probe of the stock `addRect` (N1)

- **Where it ran:** a script in the system temp folder, deleted after the run. Run with `node --expose-gc` on Node v24.19.0.
- **What it contains:**
  - `Tilemap.Layer.prototype.clear` and `addRect`, copied verbatim from `rmmz_core.js:2917-2928`;
  - a recording layer that writes into a pooled `Int32Array`.
- **What it does:** 400 rebuilds of warm-up, then 8 rebuilds of a 19×15 grid. It measures three windows the way `no_allocation_queries` does.

Output, trimmed (per-frame suffixes kept only on the stock lines; one 800-rebuild line dropped):

```text
stock addRect          rects/spot 1 rebuilds 8: growth 319000 / 311544 / 311544 B, least 311544 B = 1298.1 B per frame over 240 frames; GCs in windows 0
stock addRect          rects/spot 2 rebuilds 8: growth 638728 / 639248 / 638912 B, least 638728 B = 2661.4 B per frame over 240 frames; GCs in windows 0
empty window           rects/spot 0 rebuilds 0: growth 616 / 616 / 616 B, least 616 B
recording addRect      rects/spot 1 rebuilds 8: growth 616 / 616 / 616 B, least 616 B
recording addRect      rects/spot 2 rebuilds 8: growth 616 / 616 / 616 B, least 616 B
```

The probe does not load the plugin and does not run a wrapper or a harness. It measures only the stock layer pair and the measurement floor.

### 5.5.2 Owner-decision search (R1, N4)

- Lane-e `docs/OWNER_DECISIONS.md` contains DEC-001 to DEC-004 only.
- `git show main:docs/OWNER_DECISIONS.md` has DEC-006 / R1, Status DECIDED, and "Owner Ruling & Date: 2026-09-25 (Decider: Owner): Option D …".
- Timing: `eefd1f2c` is 22:43:29 −0500 and `87c1e5b8` is 22:48:16. `git merge-base --is-ancestor eefd1f2c HEAD` shows it is not in lane-e.
- `d087b097` (on `main`) adds to `docs/STATUS.md`: "Owner ruling DEC-006 / R1 = Option D recorded in `OWNER_DECISIONS.md`."

### 5.5.3 Code read (N2, R5, R6, R11)

- **Update order (N2, R5):**
  - `rmmz_scenes.js:819-831` (`Scene_Map.update`: `Scene_Message.update` first, `updateMainMultiply` after) and `:841-846` (`updateMain` → `$gameMap.update`);
  - `rmmz_sprites.js:3378-3387` (`Spriteset_Map.update` → `updateTilemap`) and `:3484-3487`;
  - `DEUS_Colonists.js:5748-5756` (job tick in `Game_Map.update`).
- **Live tilemap repaint path (N1, N2):**
  - `DEUS_World.js:691-700` (`patchTile` → `_tilemap.refresh()`);
  - `rmmz_core.js:2360-2362`, `:2367-2389`, `:2422-2461`, `:2917-2928` and `:3096-3105`.
- **Levels (R6, R11):** `DEUS_Levels.js:1452-1462` (`looksOfPacked`), `:4620` (`tileOf`), and `:1115-1150` (`decodeRecord`, `validRecord`, `schemaKnown`, `deltaLevels`).

### 5.5.4 Cross-check of the plan text (`node`)

- §8.2 defines 49 check ids. §8.3 has 33 failure scenarios and §8.4 has 27 mutants.
- §8.3 and §8.4 use 32 check names, and none is undefined. `shade_identity` has been replaced by `shade_stepped`.
- All eight R8 checks appear in the stub row of §8.1.
- `uf.hex`: `wc -l art/palette/uf.hex` gives 256, and `sort -u | wc -l` gives 250.

**Not checked:** no harness, compositor, screenshot or frame time exists yet. Nothing in the plan was run.

## 5.6 Overall verdict

**CHANGES REQUESTED** (0 BLOCKER, 0 MAJOR, 4 MINOR).

- **Resolved:** R1 is closed by the owner's DEC-006 ruling, and the plan implements it without drift. R2, R3 and R5–R10 are resolved.
- **Open:** N1 and N3 are checks that a correct build can't pass as written. N2 is a gap in the live cutout that no check covers. N4 is citations.
- **Nature of the fixes:** all four are text edits inside the plan, and none needs the owner. N1 and N2 partly come from fixes I proposed in Section 4.
- **Next review:** I expect to pass the next revision on a diff review. I won't re-probe unless the cutout ordering or the allocation check changes shape.

This re-review claims no check result, mutant kill, screenshot or frame time.

---

# Section 6: Diff Review of `5964f772`

- **Reviewer:** Claude CLI session (Lane E, `REVIEW_BRIEF.md`, Directive 001-J)
- **Date:** 2026-09-25
- **Document under review:** `docs/systems/UF_Depth_Attack_Plan.md` at `5964f772` (Grok, "Address Claude review findings N1-N4"), diffed against `710fa095`
- **Merge in between:** `6633993d` merged `main` into lane-e. `git diff --stat 710fa095 6633993d` over the plan and `tasks/DEUS-TSK-FABLE-19C/` is empty, so every line of the plan diff is Grok's.
- **Verdict:** **CHANGES REQUESTED** (0 BLOCKER, 0 MAJOR, 2 MINOR)

N2 and N4 are resolved. N3 is resolved as asked: the tie-break is pinned, and `entity_clip` now expects the frames the rule gives. Grok's tie example is also correct, and it fixes my own Section 5 example, which could not tie (6.1). N1 is partly resolved. The recording layers, the scope sentence and the nw changes are what I asked for. The allocation check changed shape, so I probed it, as Section 5.6 said I would. A correct build can still fail it: through stock `updateTransform`, and through the window length I proposed myself (N5). I also read the rewritten §7 against the real sprite sidecars and found a crop gap that predates this revision (N6). Both are text edits, and neither needs the owner.

## 6.1 Item-by-item

| Item | Verdict | Basis |
|---|---|---|
| **N1** `C-LIVE-ALLOC` | Partly resolved; continues as N5 | **Done as asked:** the stub's live tilemap has two recording layers. `addRect` writes into a typed array allocated at construction, overflow exits 2, and `clear` resets a count (§8.1, §8.2). Stock `addRect` is declared outside the depth budget (§3.5, §6.4, §8.6 q3). The measurement follows `no_allocation_queries`: three windows after `global.gc()`, a `gc` observer, zero collections, and the least window judged (`tools/test_strata_foundation.js:768-787`, citation checked). The nw pan benchmark reports GCs during live rebuilds and does not fail on them, and it judges a flush net of an empty pair (§8.5). A stub that installs stock layers fails, which is right: 1,298 B per frame at 240 frames. **Still open (N5):** the frame driver isn't named, and stock `updateTransform` allocates 31 B per frame. The window-length floor comes from a no-loop empty window, and at 61,620 frames a loop that allocates nothing can exceed it. The single-pair flush rule in §8.5 is below the jitter I measured. |
| **N2** dig repaint | Resolved | The `cellChanged` handler only marks the block dirty (§6.3 table, §3.5). The depth update sets `_needsRepaint` after a dirty in-window rebuild or a `V` or `H` change (§6.2). The ordering paragraph matches the code: `rmmz_scenes.js:819-824`; `rmmz_core.js:808-815` (`_onTick`: tick handler, then render); `:2376-2386` (`updateTransform` consumes and clears the flag); `:2360-2362` (`refresh`); `DEUS_World.js:700` (`patchTile` → `refresh`); `DEUS_Colonists.js:5748-5756`. I walked both builds through that order. **Correct build:** frame N rebuilds from the old `dHit`, because the painter calls `refresh`. Frame N+1's depth update rebuilds the summary and sets the flag, so that frame's render uses the new `dHit`. **`repaint_left_to_handler`:** the flag is consumed on frame N. On N+1 nothing sets it, so the wrapper doesn't run and its last decision is stale. `C-DIG-REPAINT` covers both directions (Run A skips the spot, Run B draws the live tile). It is in the stub row of §8.1 and has a §8.3 row and a mutant. See note 1. |
| **N3** crop rule | Resolved; see N6 | The tie-break is pinned (§7: height, then width, then the foot row as bottom edge, then the left edge). `entity_clip` now has four frames derived from the rule, and I recomputed each. (1) A wall with the north cell mismatched: `(0, 48, 48, 48)`. (2) 144×48 with the east column mismatched: `{W, foot}`, `(0, 0, 96, 48)`. (3) Both sides mismatched: `(48, 0, 48, 48)`. (4) 96×96 with the foot at SW, NW and SE matching and NE not: `{SW, NW}` and `{SW, SE}` are both 4,608 px², the full frame is excluded, and the taller one wins, `(0, 0, 48, 96)`. A foot-only crop fails (2) and (4). A width-first tie-break fails (4). A separable crop ("keep north if it matches, keep the sides if they match") keeps NE in (4) and fails. **Correction to my Section 5 text:** my tie example (NE and NW both mismatched) could not tie, because `{foot, north}` would contain a mismatched cell. Grok's example (4) is the one that ties. |
| **N4** citations | Resolved | DEC-006 in `docs/OWNER_DECISIONS.md` is cited in the header, in the intro (with `eefd1f2c`), in the §5.2 heading and body, and in the §9 row (line 812). Since `6633993d` the record is inside this branch: `git merge-base --is-ancestor eefd1f2c HEAD` succeeds, and `docs/OWNER_DECISIONS.md:88` is DEC-006. `uf.hex` now reads "256 lines and 250 distinct colors (ADR-002 Rev 2 §5)". `wc -l` gives 256, the distinct count is 250, and ADR-002 lines 36 and 146 agree. The only "384" left in the plan is the 16,384-byte block-word row. |

## 6.2 New findings

### MINOR

**CR-19C-N5: `C-LIVE-ALLOC` can still fail a build that allocates nothing, and the §8.5 flush rule is below the measurement jitter.**

The recording layers take stock `addRect` off the path. Three other things can still fail a correct build. I probed each with `node --expose-gc` (6.5.1).

- **Stock `updateTransform` allocates every frame.**
  - It calls `_sortChildren` (`rmmz_core.js:2388`, `:2650-2652`), which runs `this.children.sort(this._compareChildOrder.bind(this))`: a new bound function and a sort every frame.
  - The plan never says what drives the frames. §3.5 says stock `update` and `updateTransform` produce the 30-frame rebuild, and `C-DIG-REPAINT` calls `updateTransform` in the same stub.
  - Measured, with recording layers as the only children: stock `update` plus `updateTransform` grow the heap by 31.0 B per frame over 61,620 frames. With `_sortChildren` made a no-op, the same stock code grows 616 B in total.
  - "The harness loop that drives the frames allocates nothing" forbids this in effect. It doesn't say that stock `updateTransform` is what allocates.
- **The window-length floor rests on a no-loop empty window.**
  - `framesPerWindow` is `max(61,600, 100 × emptyLeast)`. A window with no loop is not a floor for a window that runs one.
  - The same no-loop pair read 18,120 B at the start of one run and 616 B at its end.
  - A frame loop that allocates nothing, with the frame body written inline, grew 61,424 to 176,624 B per window. The growth did not scale with length: it was the same at 61,620, 616,200 and 1,812,000 frames.
  - At 61,620 frames it was over the 61,620 B budget in 10 of 11 runs. The same work called through a per-frame function grew only 616 to 6,656 B, so this fixed cost depends on how the harness is written.
  - When the empty windows read 616 B, the formula picks 61,620 frames, and a correct build can fail.
  - §8.2 says "eight rebuilds grow the heap by the empty-window figure … so a correct build stays under the long-window budget". That stretches my 240-frame probe to a window 257 times longer, and the probe doesn't support it.
  - The 100× rule is the one I proposed in Section 5. Like part of N1, this comes from my own fix.
- **The §8.5 flush rows compare one sample pair to one empty pair at a 1-byte threshold.**
  - Identical no-loop pairs in one run differed by 192 B (18,312 against 18,120, and 808 against 616). A flush that allocates nothing can read more than 1 B over the empty pair.
  - No stub check forces a plane repaint. `C-LIVE-ALLOC` holds the camera still, and a still frame uploads nothing (§6.4). §6.4's "zero allocation inside a plane repaint" is therefore proven only by these nw rows, and no mutant targets it.
- **Fix:**
  - Name the stub's frame driver. The stock spot chain stays stock: `_addAllSpots` through `_readMapData` (`rmmz_core.js:2422-2648`). The §8.1 and §8.2 list leaves out `_addNormalTile` (`:2483`) and `_addTableEdge` (`:2579`), and gives no line for `_addSpotTile` (`:2465`).
  - Inside a judged window, stock `update` and `updateTransform` don't run. Either make the stub's `_sortChildren` a no-op, or have the driver repeat `updateTransform`'s repaint test (`_needsRepaint`, `animationFrame`, start tile) and call stock `_addAllSpots`. State that the stock sort is outside the depth budget, the same way `addRect` is.
  - Raise the floor well above the loop's own fixed cost. At least 1,000,000 frames per window gives a 1 MB budget, 5.6 times the largest growth I measured with no allocation. Keep the 100× empty-window rule on top of that floor, and drop the sentence that stretches the 240-frame figure.
  - Prove the plane repaint in the stub. Add a stub phase that forces one plane to repaint on many frames, using the same forcing as the §8.5 "one dirty plane" row. Judge it the same way, and add a mutant that allocates inside the repaint.
  - In nw, fail only on a GC inside a flush. Report net growth as the least of three flush windows against the least of three empty windows, and don't fail it at 1 B.

**CR-19C-N6: the §7 crop does not register frame cells to map columns, and `entity_clip` can't see a crop that moves the kept texels.**

§7 defines the crop on "48 px cells" of the authored frame, with `setFrame` coordinates in that frame. Two things are missing.

- **Registration.**
  - The depth plugin puts a sprite's anchor on the bottom centre of the foot cell (`DEUS_Depth.js:609`). The anchor comes from the sidecar and defaults to (0.5, 1) (`:374`, `:386`).
  - In `game/img/characters`, 36 sheets have 96 px frames with anchor x 48, and 4 have 192 px frames with anchor x 96 (6.5.2). Each of those frames reaches 24 px into the column on either side of the foot. None of its 48 px cells lines up with a map cell, so none of them is the foot cell.
  - Vertically, 33 of the 96 px sheets anchor at y 95, so the frame reaches 1 px into the row below the foot. `$U7_Adam` anchors at 140 of 144.
  - `entity_clip` (4) and the §7 tie example use a 96×96 frame whose south-west cell is the foot cell. No sheet in the folder is anchored that way. The check tests a geometry the game doesn't use, and the rule gives no answer for the 40 sheets it does use.
  - The 144 px sheets (anchor x 72) do line up horizontally, which is why cases (2) and (3) work.
- **The anchor after a crop.**
  - PIXI offsets a sprite by `-anchor._x * orig.width` (`pixi.js:30853`), and RMMZ's `_refresh` sets the texture frame to the crop (`rmmz_core.js:2132-2158`). The anchor is therefore a fraction of the *cropped* frame.
  - In case (2), `setFrame(0, 0, 96, 48)` with the anchor left at 0.5 puts authored x 48, the foot cell's west edge, on the foot centre. The kept texels move 24 px east, into the east column the crop was meant to drop. The correct anchor is 72 / 96 = 0.75.
  - If case (4) is anchored at its south-west cell (0.25), a kept fraction moves its column 12 px east. The correct anchor there is 0.5.
  - `entity_clip` reads only the `setFrame` rectangle, so a build that leaves the anchor alone passes all four cases. No mutant targets it.
- **Fix:**
  - Define the crop in map cells. Place the uncropped frame by its sidecar anchor on the foot point. The candidates are the map cells the frame overlaps, and the §7 rule picks the rectangle over those cells. `setFrame` is that rectangle intersected with the frame, in frame pixels. Area and the tie-break use the intersected rectangle.
  - After the crop, re-express the anchor so the authored anchor pixel stays on the foot point: `anchor.x = (ax·w − cropX) / cropW`, and the same for y.
  - `entity_clip` also asserts the drawn rectangle in plane pixels. Add a centred 96 px case built from a real sidecar (for example `!$UF_Birch.json`, anchor `[48, 95]`), and state the anchor used in case (4).
  - Add a mutant that keeps the anchor fraction through the crop. It must fail case (2).
- **History:** this gap predates `5964f772`. The R11 text already assumed aligned cells. I missed it in Sections 4 and 5, and my own N3 example used the same 96×96 shape.

### Notes (no change required)

1. **`C-DIG-REPAINT` timing.** `repaint_left_to_handler` survives if frame N+1 is an animation tick or a start-tile change, because either one rebuilds spots anyway. A one-line precondition would stop a harness author from picking such a frame by accident: camera still, and `animationFrame` unchanged on N+1, else exit 2. The §8 rule that a check counts only after it has failed on its mutant would catch this anyway.
2. **Two tie-break steps never decide anything.**
   - Step 2 (greater width): equal area plus equal height means equal width.
   - Step 4's fallback: every candidate's left edge is at or west of the foot column, so equal distances mean the same left edge.
   - Both are harmless.

## 6.3 Coordinator items

1. **ADR-002 Rev 2 and the void texel.** ADR-002 Rev 2 is still PROPOSED, and it is now in this branch (`docs/adr/ADR-002-Palette-Canonicalization.md:3`). The void-texel conflict from Section 5.3 item 1 stands: `#0C0D12` is a master colour, and Rev 2 makes `uf.hex` the runtime palette.
2. **DEC-006 Option A figure.** It still reads "~67% darker at depth 3". The measured figure is about 53% (Section 4.4.2). The ruling doesn't change.
3. **Rebase:** done. `6633993d` merged `main`, and the plan's citations now resolve inside the branch.
4. **m7** is still open.

## 6.4 Containment

- `git show --name-status 5964f772` lists the plan and `tasks/DEUS-TSK-FABLE-19C/state.md` only.
- `git diff --stat 6633993d 5964f772 -- game tools run_tests.bat` is empty. `710fa095..5964f772` does show 476 files under `game/` and `tools/`, and all of them come from the `main` merge.
- `git diff --stat 710fa095 6633993d -- docs/systems/UF_Depth_Attack_Plan.md tasks/DEUS-TSK-FABLE-19C/` is empty.
- The `state.md` update matches the plan diff. It claims no harness run, mutant kill or screenshot.
- This review edits `claude_review.md` and `state.md` only. The probe scripts ran from the system temp folder and were deleted.

## 6.5 Evidence (commands run in this session)

### 6.5.1 Frame-driver heap probe (N5)

- **Where it ran:** four scripts in the system temp folder, deleted after the runs. All used `node --expose-gc` on Node v24.19.0.
- **What they contain:**
  - stock `Tilemap.prototype.update` (`rmmz_core.js:2327-2335`), `updateTransform` (`:2367-2391`), and `_sortChildren` with `_compareChildOrder` (`:2650-2662`), read from the file by line range and evaluated;
  - `PIXI.Container.prototype.updateTransform` as a no-op;
  - two recording layers (an `Int32Array` allocated at construction, with `clear` resetting a count) as the only children;
  - `_addAllSpots` replaced by 285 `addRect` calls into a recording layer.
- **What they do:** a warm-up of 200,000 to 800,000 frames, then three windows per variant, measured the way `no_allocation_queries` measures (`global.gc()`, `used_heap_size` before and after, a `gc` observer).

Output, trimmed. Two runs are shown, and the repeat runs are summarised below the blocks.

```text
empty window                                         growth 18312 / 18120 / 18120 B, least 18120 B ; GCs in windows 0
recording layers, stock update + updateTransform     growth 1941832 / 1922992 / 1909680 B, least 1909680 B 30.991 B per frame over 61620 frames; GCs in windows 0
stock update + updateTransform, _sortChildren no-op  growth 3688 / 2840 / 616 B, least 616 B 0.010 B per frame over 61620 frames; GCs in windows 0
recording layers, driver without _sortChildren       growth 108544 / 150224 / 115872 B, least 108544 B 1.762 B per frame over 61620 frames; GCs in windows 0
```

```text
empty window (no loop) N=0         growth 18312 / 18120 / 18120 B, least 18120; GCs 0
no-sort driver N=61620             growth 136936 / 115080 / 127160 B, least 115080 = 1.8676 B/frame; GCs 0
no-sort driver N=616200            growth 128240 / 150896 / 143200 B, least 128240 = 0.2081 B/frame; GCs 0
no-sort driver N=1812000           growth 107488 / 176624 / 135744 B, least 107488 = 0.0593 B/frame; GCs 0
per-frame function driver N=61620  growth 6656 / 2912 / 4504 B, least 2912 = 0.0473 B/frame; GCs 0
per-frame function driver N=1812000 growth 8000 / 616 / 616 B, least 616 = 0.0003 B/frame; GCs 0
empty window (no loop) N=0         growth 808 / 616 / 616 B, least 616; GCs 0
```

- **Stock path:** 30.99 to 31.07 B per frame across four runs.
- **Inline no-sort driver at 61,620 frames:** across eleven runs, the least of three was 61,424, 66,960, 66,992, 67,920, 79,448, 91,032, 108,544, 111,048, 113,304, 115,080 and 122,152 B. One of those is under 61,620. The largest single window at any length was 176,624 B.
- **Scope:** the probe doesn't load the plugin, a wrapper or a harness. It measures the stock per-frame path and the loop's own fixed cost. It doesn't measure nw.js, so the 192 B jitter is a Node figure.

### 6.5.2 Sheet anchors (N6)

- **Sidecar survey:** `node` over `game/img/characters/*.json`, reading `frameWidth`, `frameHeight` and `anchor`:
  - 96×96: 33 at `[48,95]` (for example `!$UF_Birch`, `!$UF_Fruit_Tree`), and 3 at `[48,96]` (`!$CaveLadder`, `!$IronOreVein`, `$U7_CaveCrawler`)
  - 144×96 at `[72,96]` (`!$CaveMouth`), and 144×144 at `[72,140]` (`$U7_Adam`)
  - 192×192 at `[96,192]` (`$U7_BogHorror`, `$U7_CaveLurker`, `$U7_Orc`), and 192×240 at `[96,240]` (`$U7_Automaton`)
  - 635 sidecars with 48 px frames
- **Current plugin:**
  - `DEUS_Depth.js:374` and `:386`: the sidecar anchor divided by the frame size
  - `:609`: the foot point is the cell centre in x and the cell bottom in y
  - `:617-618`: `setFrame`, then `anchor.set`
- **Anchor maths:** `rmmz_core.js:2132-2158` (`Sprite._refresh` sets `texture.frame` to the crop), and `game/js/libs/pixi.js:30853` (`-anchor._x * orig.width`).

### 6.5.3 Code read (N2, N4)

- **Update order and repaint:** `rmmz_scenes.js:819-846`; `rmmz_core.js:808-815`, `:2327-2335`, `:2360-2391`, `:2422-2662` and `:2917-2928`; `DEUS_World.js:691-700`; `DEUS_Colonists.js:5745-5756`.
- **Measurement method:** `tools/test_strata_foundation.js:755-787`.
- **Citations:** `docs/OWNER_DECISIONS.md:88-100` (DEC-006); `docs/adr/ADR-002-Palette-Canonicalization.md:3`, `:36` and `:146`.
- **`uf.hex`:** `wc -l art/palette/uf.hex` gives 256, and a case-folded `sort -u` gives 250.

### 6.5.4 Cross-check of the plan text (`node`, `grep`)

- **Counts:** §8.2 defines 50 check ids (49 before). §8.3 has 35 failure scenarios (33 before), and §8.4 has 28 mutants (27 before).
- **Names:** §8.3 and §8.4 use 33 check names, and none is undefined. The stub row of §8.1 lists `C-DIG-REPAINT` and `C-LIVE-ALLOC`.
- **`_needsRepaint`:** it appears at lines 192, 405, 423, 647, 698 and 738. None of them has the handler set it.

**Not checked:** no harness, compositor, screenshot or frame time exists yet. Nothing in the plan was run.

## 6.6 Overall verdict

**CHANGES REQUESTED** (0 BLOCKER, 0 MAJOR, 2 MINOR).

- **Resolved:** N2 and N4 are resolved. N3 is resolved as asked, and so are the parts of N1 I asked for.
- **Open:**
  - N5 finishes N1. The stub's frame driver, the window floor and the flush comparison can each fail a build that allocates nothing.
  - N6 makes the crop apply to the sheets the game actually has, and it makes `entity_clip` check where the kept texels land.
- **Nature of the fixes:** text edits inside the plan, and none needs the owner. N5's window rule and N6's example shape both trace back to text I proposed in Section 5.
- **Next review:** a diff review. I'll re-probe only if the frame driver or the window rule changes shape again.

This review claims no check result, mutant kill, screenshot or frame time.
