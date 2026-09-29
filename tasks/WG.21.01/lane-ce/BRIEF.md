# BRIEF: WG.21.01 — Ground tile variants with gradient placement (lane-ce)

## 1. Objective and authority
- **WBS ID:** `WG.21.01` Ground Autotile & Macro-Variety Rules (`docs/worldgen/DEUS_WORLDGEN_WBS.md:151`), fulfilled by this lane.
- **Lane / branch:** `lane-ce` / `task/lane-ce`, worktree `C:\Users\snewt\.deus_worktrees\lane-ce`, based on main `809d119a`.
- **Writer:** `claude` (runtime, tooling, catalogue rows, checks). **Generation:** Gemini / Antigravity under the SOP, in a separate art batch, never in this lane's code. **Reviewer:** `grok`.
- **Authority:** DEC-045 (design and the four rulings), DEC-007 amendment of 2026-09-29 (PixelLab OBJECTS/MAPS only, catalogue first, SOP prompt, QA, Owner sign-off, high top-down), DEC-030/038 for what counts as a ground kind, AGENTS.md Rules 9 (engine core read-only) and 12 (no runtime motion or tint).
- **Owner's words (2026-09-29):** "I want more variants of each type of tile so there's a gradient on the ground." And on variety: "Diverse but READABLE. It should not be confusing to the player."

## 2. Ground truth the writer builds on (measured 2026-09-29; cite, do not re-derive)
- Ground kind per cell: `DEUS_WorldGen.resolve` (rainfall/drainage/temperature thresholds) → `Uint8` kind index → layer 0 tile id `2816 + k*48 + shape[mask]` (`DEUS_WorldGen.js` ~1101-1172, 1283-1289). Neighbours join when same kind or `UF.Tiles.joins()` (same `groundShades` family).
- `UF.Tiles.kindOfTile` reads layer 0 (`DEUS_Tiles.js:433-436`); Floors, Fire, Look, Colonists, Objects depend on it. **Variants must not be new A2 kinds.**
- Tileset 91 is registered in memory by `DEUS_Tiles.registerTileset` (`:489-530`); `tilesetNames[7]` (D) is hard-coded `''`; B–E flags are copied from editor tileset 2, which flags ~100 B–E ids `0x10` (upper layer), so every D id used must have its flags forced to 0.
- The drawn A2 sheet is `game/img/tilesets/Outside_A2.png` (catalog `tilesets.surface.A2 = "Outside_A2"`), with only A2 blocks 0–3 painted; blocks 4–25 are transparent (AUDIT_LOG A9-1). Docs that say the code-drawn `UF_GenGround_A2` is drawn are stale; say so in `docs/systems/UF_Tiles.md`.
- The existing dryness field: `computeShadePlan` (`DEUS_Tiles.js:552-645`, salts `0x5ade`/`0x5adf`, rainfall/drainage/elevation terms, 4-cell water halo, 8-corner subsampling, bilinear, toroidal) feeds `applyGroundShades` (`:1218`), called from the `buildArea` wrapper in `ensureBuildHook` (`:1246-1254`). It writes code-dithered E-sheet tiles (ids 768–1023) on layer 1, derived, never saved. The `world:tileChanged` listener at `:1255-1256` is dead: `UF.World.on` is undefined; the live event bus is `UF.Events.on`, and `World.setDerivedTile` emits `world:levelTileChanged` with positional args `(area, x, y, layer, tileId)` (`DEUS_World.js:834, 842-847`).
- Layer-0 rewrites that must keep working: `DEUS_Interact.js:248-259, 1045` (dig), `DEUS_Fire.js:473-482`, `DEUS_Floors.js:323-334`, `DEUS_Levels.redrawGroundAround` (3×3). Each persists through `state.diffs`. `DEUS_Depth.js:1657-1658` and `DEUS_Floors.js:593-594` subscribe to both tile events; an overlay write costs a Depth `refreshLevel(0)`.
- RMMZ facts: A2 = 32 kinds, one 96×144 block per kind at column `k%8`, row `floor(k/8)`; `FLOOR_AUTOTILE_TABLE` quarter parity means a 2×3-tiled plain stamp renders grid-aligned for every shape (held for batch-1 grass, must be re-checked at zoom 1); B–E sheets are 16×16 tiles of 48 px, D ids 512–767, source `x = ((floor(id/128)%2)*8 + id%8)*48`, `y = (floor((id%256)/8)%16)*48`; layers draw z0, z1, shadow, z2, z3 in one lower layer, later rects overdraw; repaint is whole visible window on `refresh()`; hard cap 32,000 rects per lower layer.
- Objects already choose a variant per instance by FNV-1a hash mod 8 (`DEUS_Objects.js:1166-1174`, saved in `state.objectVariants`).

## 3. Scope (exactly this)
### 3.1 Data (`game/data/UF_WorldCatalog.json`)
- `tilesets.surface.D = "DEUS_GroundVar_D"`.
- New `groundVariants` block: `{ about, sheet: "DEUS_GroundVar_D", firstId: 512, perKind: 4, shares: [0.30, 0.40, 0.30], fallbackThresholds: [0.35, 0.65], minCellsForQuantiles: 64, waterHaloPerCell: 0.04, interiorOnly: true, kinds: { <kind>: { variants: 3|4|5|1, enabled: false } } }`. Kinds: the 21 gradient kinds at 3 (meadow, dirt, forest_floor, dry_grass at up to 5); peak_rock, road, floor_wood, floor_stone, floor_rushes at 1. Underground looks (tileset 92) out of scope.
- `groundShades.render: "dither" | "painted"`, default `"dither"`; the painted path replaces the dither output on layer 1 when set. The dither painter is not deleted.

### 3.2 Runtime (`game/js/plugins/DEUS_Tiles.js` only)
- `registerTileset`: `tilesetNames[7] = names.D || ''`; force flags 0 for every D id 512–767.
- Extract `drynessField(map, ax, ay)` from `computeShadePlan` unchanged (same salts and terms; replace the −0.15 water step with the per-cell ramp `waterDist * waterHaloPerCell`) so shades and variants agree.
- `applyGroundVariants(map, ax, ay)`: under the same guard as `applyGroundShades` (tileset 91, z 0/undefined), when `render === "painted"`: per cell, `k = kindOfTile(layer0)`; skip built kinds, peak_rock, water, solid columns (layer 2 ≠ 0), template cells (`World.templatePaints(x,y)`), cells with a saved layer-1 diff, and (while `interiorOnly`) cells whose layer-0 shape ≠ 0; `Dcell` = mean of the 4 corner values; per-kind thresholds from quantiles of `Dcell` over that kind's eligible cells at cumulative `shares` (fallback thresholds under `minCellsForQuantiles`), cached per area key in a module `Map`; band → variant j; Lipschitz ±1 across neighbours then despeckle (no isolated cell); write `512 + perKind*k + (j-1)` on layer 1 for V1/V3/V4/V5, and 0 for V2 (the A2 block already shows V2). V2 cells write nothing.
- Live edits: subscribe once through `UF.Events.on("world:levelTileChanged", (area, x, y, layer, tileId) => ...)` and `"world:tileChanged"`, `z === 0`, `layer === 0` only (guard re-entrancy: never react to layer 1), recompute the 3×3 around the cell with the cached thresholds, via `World.setDerivedTile(x, y, 1, id)`. Replace the dead `UF.World.on` listener.
- Loader guard: drop any z=0 layer-1 entry from `state.diffs` at load (a stale saved overlay must never pin a stamp).
- Public API: `UF.Tiles.groundVariantAt(x, y)` → `{ kind, variant, dryness }` for `UF_Look` / `UF_Sheet` observability; `UF.Tiles.applyGroundVariants(map, ax, ay)`.
- No per-frame work; no full-map scans outside area build; no engine-core edits; no tint, no animation.

### 3.3 Catalogue and tooling
- `art/catalogue/catalogue.schema.json` 1.2.0 → 1.3.0: additive `variants.derivation` enum `["PALETTE_SWAP", "A2_REPEAT_2x3"]`, default `PALETTE_SWAP`.
- `tools/art/build_catalogue.js`: emit `SURFACE_SHARED_TERRAIN_<KIND>_V<n>_DEFAULT` rows (68 total: 3 per gradient kind, up to 5 for the four big kinds only if `groundVariants.kinds[k].variants` says so, 1 for the five uniform kinds) from `groundVariants`; each row: GEOM_TILE 48×48, anchor CENTER, frames 1×1, own paint slot in `ATLAS_SURFACE_SHARED_TILE_01`, `paletteRampIds = mapping.terrains[kind]`, `promptFile art/prompts/TERRAIN_<KIND>_V123.json`, `specFile docs/design/GROUND_VARIANTS.md`, status `REQUESTED`; runtime V1/V3 → `img/tilesets/DEUS_GroundVar_D.png` tileId `512+perKind*k+j`, V2 → `img/tilesets/Outside_A2.png` tileId `2816+48k` via `A2_REPEAT_2x3`. Existing `_A2_DEFAULT` rows become derived from V2 (`derivation A2_REPEAT_2x3`, slot null). Deterministic (`--check` passes twice).
- `tools/art/test_catalogue.js`: add `terrain_variant_rows` (68 V rows, every `_A2_DEFAULT` derived from its V2, ids and tileIds computed not typed).
- `tools/art/check_ground_variants.js` (new, read-only on pixels): per stamp: 48×48; alpha 255 everywhere; 100% master palette; ≤ 8 unique colours per stamp; self-seam ratio (mean |ΔRGB| across the wrap edge ÷ mean interior neighbour |ΔRGB|) ≤ 1.0 both axes; pair-seam V1|V2, V2|V3 ≤ 1.25 abutted both axes; mean grey value strictly ordered V1 < V2 < V3 with steps of one AS-READ-001 value step (±25%); hue drift within the kind's ramp; family readability: for every `joins()` pair (A, B), the driest look of A vs the dampest look of B clears the same ΔE floor as the base looks. One report per kind; any FAIL blocks the board. Self-test mode with provoke fixtures (`--self-test` must show each check able to fail).
- `tools/art/build_variant_board.js` (new): per kind, V1..Vn at 1:1 and 3× on a neutral ground plus a neighbour strip (dry end of the kind against the damp end of each `joins()` sibling), for the Owner's sign-off sitting.
- `tools/art/place_art.js` / `validate_art.js`: D-sheet addressing, `A2_REPEAT_2x3` block build from a signed V2, ledger column for the derived block hash.
- `tools/test_ground_variants.js` (new, headless, gate): build a synthetic 64×64 area with a mocked map for three seeds and assert: every eligible kind shows each variant at 20–40% coverage; no cell differs from a cardinal neighbour of the same kind by more than one step; no isolated single cell; V2 cells carry 0 on layer 1; solid, water, template, built and shape≠0 cells carry 0; thresholds cached per area replay identically; a dig at a border cell recomputes only its 3×3; save/load equivalence (derived layer identical after `state.diffs` round trip); D flags forced 0; no D id outside 512–767; `groundShades.render = "dither"` leaves the old output byte-identical. `--mutation-sweep`: every mutant (e.g. `no_lipschitz`, `speckle_ok`, `save_overlay`, `react_to_layer1`, `global_thresholds`, `flags_not_forced`) fails on an assertion.
- `DEUS_Tiles` UF_Test suite: `tileset_names` asserts names from the catalog (A2 `Outside_A2`, D `DEUS_GroundVar_D`); `kinds_look_different` samples the live `Outside_A2.png`; new in-engine checks for the painted path with provoke hooks.

### 3.4 Docs
- `docs/design/GROUND_VARIANTS.md` (new): the model, the field, the bands, the checks, the exact PixelLab MAPS tool name and schema recorded from a `tools/list` call (Step 0 of generation), the prompt template.
- `docs/systems/UF_Tiles.md`: the six sections updated; the stale "code-drawn A2 is drawn" statement corrected. `docs/design/GROUND_SHADES.md`: status line (dither kept behind the switch). `docs/ASSET_REQUESTS.md`: 26 rows, one per kind, naming the catalogue ids.

### 3.5 Generation (not this lane's code; Gemini/Antigravity, after the catalogue rows are on `main`)
- PixelLab MAPS tiles-pro: `tile_type square_topdown`, `tile_size 48`, view high top-down, no outline, no tile_feature; numbered prompt for the triplet (one call per kind). No `create_image_pro_flash`.
- Order: pilot = meadow (one call) → 10-minute Owner strip to lock the prompt → batch A (tropical_grass, dry_grass, shrub_soil, forest_floor, dirt, stony, sand, rock) → batch B (needle_floor, jungle_floor, tundra, snow, ice, red_clay, mud, swamp_mud, cursed_grass, blessed_grass, ash, scree) → batch C (the five uniform kinds). Raw outputs to `art/masters/source_sets/SURFACE_SHARED_TERRAIN_<KIND>_V<n>_DEFAULT/` with a manifest (tool, job id, prompt hash, sha256). Post-process: quantise to the kind's ramp(s) + ≤ 2 master entries, whole-pixel operations only.
- QA: `check_ground_variants.js` on every stamp; then `build_variant_board.js`; the PM presents boards to the Owner; sign-off per stamp in the SHA-256 ledger; only then placement.

## 4. Acceptance
1. Gate tests in `lane.json` pass in a fresh clone; every mutant in `test_ground_variants.js --mutation-sweep` is caught by an assertion.
2. `node tools/art/build_catalogue.js --check` is clean twice; `test_catalogue.js` passes with the 68 rows.
3. `check_ground_variants.js --self-test` shows every check able to fail.
4. With `render: "dither"` (default) the game's ground output is byte-identical to `main` (regression fixture).
5. With `render: "painted"` and a fixture D sheet (test harness pattern tiles, not art), an F5 screenshot at zoom 1 of the start area shows per-cell variants with no half-tile misalignment and no upper-layer draw over characters; F8 clean. This is Level 2 proof; Level 3 (Owner-seen with real art) follows the art batch.
6. Grok review PASS, then `merge_gate`.

## 5. GAME TRANSLATION
```text
WBS / Lane:                 WG.21.01 / lane-ce
Approved scope:             DEC-045 (Owner delegation 2026-09-29)
Writer SHA / evidence date: (filled at report time)
Translation Class:          A DIRECT PLAYER-VISIBLE
Player / World Effect:      Ground reads as a moisture gradient (damp to dry) within each kind and across joined kinds instead of one repeated stamp; kinds stay distinguishable.
Trigger:                    Area build (New Game, area entry) and any layer-0 ground edit (dig, burn, floor, level reshape).
Runtime Authority:          game/js/plugins/DEUS_Tiles.js (applyGroundVariants, drynessField); data game/data/UF_WorldCatalog.json groundVariants.
Simulation Path:            WorldGen kind + dryness field -> per-kind quantile band -> smoothed variant index -> layer-1 D tile id.
Engine Bridge:              RMMZ Tilemap draws layer 1 from tileset 91 sheet D; layer 0 A2 untouched.
Visible Result:             Patches 10-40 cells wide drifting damp->dry; crisp kind borders; no runtime motion.
Persistence:                Derived; not saved; stale z=0 layer-1 diffs dropped at load.
Failure Without This Lane:  Ground stays one stamp per kind; 22 of 26 kinds draw transparent (A9-1).
Automated Proof:            tools/test_ground_variants.js (+ --mutation-sweep), tools/art/test_catalogue.js, check_ground_variants.js --self-test.
In-Game Proof:              F5 zoom-1 screenshot with fixture D sheet (Level 2); Owner-seen with signed art (Level 3).
Simulation implemented / Engine bridge / Presentation / Input / Save-load / Playable verification: reported YES/NO at report time.
CONSUMED BY GAME SYSTEMS: UF_Look (groundVariantAt), later Wang renderer (same stamps), Climate/Flora presentation of moisture.
```
