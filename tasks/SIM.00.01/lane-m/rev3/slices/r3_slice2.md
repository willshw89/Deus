### C300 ADR:1017 docs/worldgen/DEUS_WORLDGEN_WBS.md:520 OK
section: 8. Migration Increments
claim: - SIM.00.02 waits on the PM's sign-off of this ADR, the OPS.10.01 merge gate and OPS.50.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:520`).
   520  | SIM.00.02 | **Headless sim core with a fixed tick.** Engine-free modules (layout per ADR), with `sim.step()` on a fixed tick decoupled from frames. The RMMZ side feeds an accumulator | PLANNED | ADR-003 | SIM.00.01 PM 

### C301 ADR:1018 docs/worldgen/DEUS_WORLDGEN_WBS.md:521 (bare, file from 1 line(s) back) OK
section: 8. Migration Increments
claim: - SIM.00.03 also waits for Lanes N and K (`:521`).
   521  | SIM.00.03 | **Snapshot/read interface for the renderer.** A versioned read-only view of sim state (per area and Z: terrain, objects, units, fluids, fire, time) plus a change feed. Render plugins read only through it. C

### C302 ADR:1019 docs/worldgen/DEUS_WORLDGEN_WBS.md:650 OK
section: 8. Migration Increments
claim: - WG.61.01/.02 are written against the core after SIM.00.03 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:650`).
   650  - **Step 8 (WG.61.01/.02) now depends on SIM.00.03,** so the veins and conservation ledger are written against the core, not against `Game_Map.update`.

### C303 ADR:1058 docs/OWNER_DECISIONS.md:247 OK
section: 9.2 Time budgets (PENDING-K3)
claim: - **Benchmark hygiene (DEC-017, `docs/OWNER_DECISIONS.md:247`).** Each perf record notes the concurrent worker count and CPU %, and go/no-go evidence needs one quiet-machine rerun.
   247  - Benchmark hygiene note: benchmarks share CPU with other workers, so each perf record must note concurrent worker count and CPU %, and go/no-go evidence needs one quiet-machine rerun.

### C325 ADR:1123 game/js/plugins/DEUS_Levels.js:1764 OK
section: 10.4 Floats
claim: - Example: sphere damage today uses float falloff functions and `Math.sqrt` (`DEUS_Levels.js:1764`, `:1846`). In the core, distance is an integer squared distance in half-feet and falloff is an integer table (§18.3).
  1764  const FALLOFF = { constant: t => 1, linear: t => 1 - t, quadratic: t => (1 - t) * (1 - t) };

### C326 ADR:1123 game/js/plugins/DEUS_Levels.js:1846 (bare, file from 0 line(s) back) OK
section: 10.4 Floats
claim: - Example: sphere damage today uses float falloff functions and `Math.sqrt` (`DEUS_Levels.js:1764`, `:1846`). In the core, distance is an integer squared distance in half-feet and falloff is an integer table (§18.3).
  1846  if (d2 <= r2) hits.push([s, damage * falloff(Math.sqrt(d2) / radius)]);

### C344 ADR:1244 docs/worldgen/DEUS_WORLDGEN_WBS.md:523 OK
section: 12.3 Open questions
claim: | Q1 | PM | Move the calendar into the core at SIM.00.02, rather than SIM.00.05 as WBS Rev 24 lists (`docs/worldgen/DEUS_WORLDGEN_WBS.md:523`)? | Yes (Increment 1) |
   523  | SIM.00.05 | **Remaining live systems into the core, one per increment.** Fluid, Ecology, Fire, Environment, NaturalConnections (fluids and creatures now run on `Graphics.frameCount` in `Scene_Map.update`, L507-515), Co

### C355 ADR:1257 docs/OWNER_DECISIONS.md:199-208 OK
section: 12.3 Open questions
claim: | Q14 | Owner | Crowd LOD for people (DEC-014, `docs/OWNER_DECISIONS.md:199-208`, OPEN with PM defaults): no population cap; a budget of fully simulated individuals; the rest as counts keyed by species, age band, sex, craft, civic office, class, obligation, faction and settlement. §7.5 keeps every person tracked by default. If the Owner adopts crowd LOD, persons with no history record, household role or reference could be bucketed under those keys, and promotion would rebuild them. History persons always stay individual | Keep persons tracked until the post-split benchmark sizes the budget |
   199  ### Decision `DEC-014`: Population Simulation Budget, Crowd Counts LOD, and Anti-Snowball Pressures
   200  - **Date Logged:** 2026-09-26
   201  - **Status:** `OPEN` (Owner discussion 00:46-00:50 CT, directive 0021-V Addendum §9; PM defaults recorded)
      ...
   207  4. **Anti-Snowball Pressures:** Large, dominant factions experience emergent counter-pressures: regional rebellions, epidemic disease in dense settlements, supply/logistical strain, and dynastic succession crises, ensuri
   208  5. **Monster Origins:** Default rule is that most monsters reproduce biologically like animals; per-species origin settings (`breeds`, `spawned`, `created`, `unique`) are preserved for lore exceptions (Owner assigns).

### C356 ADR:1258 docs/worldgen/DEUS_WORLDGEN_WBS.md:533 OK
section: 12.3 Open questions
claim: | Q15 | PM | SIM.40 (§16, §17, §18) runs in the core, so it needs the terrain sub-lane of SIM.00.05 first. Should that dependency be added to SIM.40.01 and .05 (WBS Rev 24 lists WG.00.17 and SIM.00.01, and SIM.40.01 and SIM.00.01: `docs/worldgen/DEUS_WORLDGEN_WBS.md:533`, `:537`)? | Yes |
   533  | SIM.40.01 | **Support model design & blast propagation** (materials, vertical propagation, span limits, cross-layer blast attenuation, V128 natural rock, V133 change-driven). Load-bearing rules, span capacities, and ve

### C357 ADR:1258 docs/worldgen/DEUS_WORLDGEN_WBS.md:537 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q15 | PM | SIM.40 (§16, §17, §18) runs in the core, so it needs the terrain sub-lane of SIM.00.05 first. Should that dependency be added to SIM.40.01 and .05 (WBS Rev 24 lists WG.00.17 and SIM.00.01, and SIM.40.01 and SIM.00.01: `docs/worldgen/DEUS_WORLDGEN_WBS.md:533`, `:537`)? | Yes |
   537  | SIM.40.05 | **Decay model** (unmaintained structure HP loss by material/exposure, roofs fail first, walls fail, feeds collapse) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | SIM.40.01, dep: SIM.00.01 | Claude → Gro

### C358 ADR:1260 docs/VISION.md:129 OK
section: 12.3 Open questions
claim: | Q17 | Owner | V135 labels the five fluid depth states 1 to 5 ft, for 1 ft strata (`docs/VISION.md:129`). With DEC-013's 2 ft strata the same five states are 2 to 10 ft deep. Keep the five states and relabel them in feet, or change the states? | Keep the states; the feet become 2, 4, 6, 8, 10 |
   129  | V135 | **Canonical 5-Step Fluid Depth Standard for Water and Lava** (user directive 2026-09-25): Exactly 5 visible, semantic depth states for water and 5 for lava, matching the 5 physical 1 ft strata per 5 ft cell (1 f

### C359 ADR:1262 docs/OWNER_DECISIONS.md:262 OK
section: 12.3 Open questions
claim: | Q19 | Owner | DEC-018's open sub-question: conjured matter versus LIFE-001 (`docs/OWNER_DECISIONS.md:262`) | None from this ADR. The ledger supports the PM default and the alternatives (§7.8) |
   262  - **Open Sub-Question (PM default):** Conjured matter (*create water*, *wall of stone*) versus LIFE-001 mass conservation. The default is that conjured matter is an explicitly modelled magical source/sink, logged in the 

### C360 ADR:1263 docs/worldgen/DEUS_WORLDGEN_WBS.md:108 OK
section: 12.3 Open questions
claim: | Q20 | Coordinator | WBS rows WG.00.20, WG.00.21 and GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`, `:109`, `:577`) cite DEC-017, DEC-018 and "DEC-019; V148" for the decisions `docs/OWNER_DECISIONS.md` records as DEC-020 (`:282`), DEC-021 (`:293`) and DEC-022 (`:304`), and VISION as V151 (`docs/VISION.md:412`). This ADR cites `docs/OWNER_DECISIONS.md` | Correct the WBS references (`tasks/SIM.00.01/lane-m/escalation.md`) |
   108  | **WG.00.20** | Seamless Inter-Layer Ramps & Camera-Follow Connector | Claude / Grok | Run of cells rising one stratum per cell (5 cells = one 10 ft layer); unit's Z becomes Z+1 at top stratum with zero transfer/fade/pa

### C361 ADR:1263 docs/worldgen/DEUS_WORLDGEN_WBS.md:109 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q20 | Coordinator | WBS rows WG.00.20, WG.00.21 and GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`, `:109`, `:577`) cite DEC-017, DEC-018 and "DEC-019; V148" for the decisions `docs/OWNER_DECISIONS.md` records as DEC-020 (`:282`), DEC-021 (`:293`) and DEC-022 (`:304`), and VISION as V151 (`docs/VISION.md:412`). This ADR cites `docs/OWNER_DECISIONS.md` | Correct the WBS references (`tasks/SIM.00.01/lane-m/escalation.md`) |
   109  | **WG.00.21** | Layer Occlusion Culling Rule & Exposed-Area Bound | Claude / Grok | Anything covered by opaque upper layer is not drawn (tiles, units, effects). Draw cost bounded by exposed visible screen area (V133). T

### C362 ADR:1263 docs/worldgen/DEUS_WORLDGEN_WBS.md:577 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q20 | Coordinator | WBS rows WG.00.20, WG.00.21 and GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`, `:109`, `:577`) cite DEC-017, DEC-018 and "DEC-019; V148" for the decisions `docs/OWNER_DECISIONS.md` records as DEC-020 (`:282`), DEC-021 (`:293`) and DEC-022 (`:304`), and VISION as V151 (`docs/VISION.md:412`). This ADR cites `docs/OWNER_DECISIONS.md` | Correct the WBS references (`tasks/SIM.00.01/lane-m/escalation.md`) |
   577  | GP.07.02 | **Cross-layer 3D targeting, ballistics & volume damage** (spells, arrows, thrown items through multi-Z openings, true 3D Euclidean range, vertical impact bonus / upward range penalty, cross-layer volume blas

### C363 ADR:1263 docs/OWNER_DECISIONS.md:282 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q20 | Coordinator | WBS rows WG.00.20, WG.00.21 and GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`, `:109`, `:577`) cite DEC-017, DEC-018 and "DEC-019; V148" for the decisions `docs/OWNER_DECISIONS.md` records as DEC-020 (`:282`), DEC-021 (`:293`) and DEC-022 (`:304`), and VISION as V151 (`docs/VISION.md:412`). This ADR cites `docs/OWNER_DECISIONS.md` | Correct the WBS references (`tasks/SIM.00.01/lane-m/escalation.md`) |
   282  ### Decision `DEC-020`: Seamless Inter-Layer Ramps and Camera-Follow Behavior

### C364 ADR:1263 docs/OWNER_DECISIONS.md:293 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q20 | Coordinator | WBS rows WG.00.20, WG.00.21 and GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`, `:109`, `:577`) cite DEC-017, DEC-018 and "DEC-019; V148" for the decisions `docs/OWNER_DECISIONS.md` records as DEC-020 (`:282`), DEC-021 (`:293`) and DEC-022 (`:304`), and VISION as V151 (`docs/VISION.md:412`). This ADR cites `docs/OWNER_DECISIONS.md` | Correct the WBS references (`tasks/SIM.00.01/lane-m/escalation.md`) |
   293  ### Decision `DEC-021`: Occlusion Rule for Layer Rendering (Zero-Cost Solid Cover)

### C365 ADR:1263 docs/OWNER_DECISIONS.md:304 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q20 | Coordinator | WBS rows WG.00.20, WG.00.21 and GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`, `:109`, `:577`) cite DEC-017, DEC-018 and "DEC-019; V148" for the decisions `docs/OWNER_DECISIONS.md` records as DEC-020 (`:282`), DEC-021 (`:293`) and DEC-022 (`:304`), and VISION as V151 (`docs/VISION.md:412`). This ADR cites `docs/OWNER_DECISIONS.md` | Correct the WBS references (`tasks/SIM.00.01/lane-m/escalation.md`) |
   304  ### Decision `DEC-022`: Cross-Layer 3D Targeting, Ballistics, and Volume Damage

### C366 ADR:1263 docs/VISION.md:412 OK
section: 12.3 Open questions
claim: | Q20 | Coordinator | WBS rows WG.00.20, WG.00.21 and GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`, `:109`, `:577`) cite DEC-017, DEC-018 and "DEC-019; V148" for the decisions `docs/OWNER_DECISIONS.md` records as DEC-020 (`:282`), DEC-021 (`:293`) and DEC-022 (`:304`), and VISION as V151 (`docs/VISION.md:412`). This ADR cites `docs/OWNER_DECISIONS.md` | Correct the WBS references (`tasks/SIM.00.01/lane-m/escalation.md`) |
   412  - 2026-09-26: V151 added by the user: **Cross-Layer 3D Targeting, Ballistics & Volume Damage** (DEC-022, Directive 0021-V Addendum §20): Spells, arrows, and thrown items can target cells and units on lower and upper laye

### C367 ADR:1270 docs/OWNER_DECISIONS.md:239-247 OK
section: 13. Engine Exit Path (DEC-017)
claim: **The decision.** DEC-017, "Keep RMMZ for menus, dialogue, saving, database and battle; fallback map renderer is a custom multi-layer PixiJS renderer inside RMMZ, decided after demo benchmarks" (`docs/OWNER_DECISIONS.md:239-247`).
   239  ### Decision `DEC-017`: Keep RMMZ for menus, dialogue, saving, database and battle; fallback map renderer is a custom multi-layer PixiJS renderer inside RMMZ, decided after demo benchmarks
   240  - **Date Logged:** 2026-09-26
   241  - **Decider:** Owner (01:38 CT, relayed by PM 0028-AC)
      ...
   246  - Added WBS placeholder row "Custom multi-layer PixiJS map renderer (fallback)" (`WG.00.24`), gated on Lane K benchmarks and Owner go/no-go.
   247  - Benchmark hygiene note: benchmarks share CPU with other workers, so each perf record must note concurrent worker count and CPU %, and go/no-go evidence needs one quiet-machine rerun.

### C368 ADR:1272 docs/OWNER_DECISIONS.md:245 (bare, file from 2 line(s) back) OK
section: 13. Engine Exit Path (DEC-017)
claim: - This ADR adopts it as its exit path, as DEC-017's consequences ask (`:245`).
   245  - ADR-003 Rev 3 adopts this as its exit/fallback path (§13 "Engine Exit Path").

### C369 ADR:1304 docs/OWNER_DECISIONS.md:243 OK
section: 13.3 The go/no-go
claim: The Owner decides with the benchmarks DEC-017 names (`docs/OWNER_DECISIONS.md:243`):
   243  - **Ruling:** RMMZ remains the engine for menus, dialogue, saving, the database and battle screens. If the stock RMMZ map (`Spriteset_Map`/`Tilemap`) cannot meet the goals, the fallback is a **custom multi-layer PixiJS m

### C370 ADR:1306 docs/OWNER_DECISIONS.md:300 (bare, file from 2 line(s) back) OK
section: 13.3 The go/no-go
claim: - the 32-vs-5-layer occlusion benchmark (DEC-021, `:300`; WBS WG.00.21, `docs/worldgen/DEUS_WORLDGEN_WBS.md:109`).
   300  3. **Benchmark Requirement:** Applied in Lane K follow-up, the 32-layer refactor, and future overlook view. Benchmark target: the stress scene with 32 layers must cost approximately the same frame time as with 5 layers w

### C371 ADR:1306 docs/worldgen/DEUS_WORLDGEN_WBS.md:109 OK
section: 13.3 The go/no-go
claim: - the 32-vs-5-layer occlusion benchmark (DEC-021, `:300`; WBS WG.00.21, `docs/worldgen/DEUS_WORLDGEN_WBS.md:109`).
   109  | **WG.00.21** | Layer Occlusion Culling Rule & Exposed-Area Bound | Claude / Grok | Anything covered by opaque upper layer is not drawn (tiles, units, effects). Draw cost bounded by exposed visible screen area (V133). T

### C372 ADR:1314 docs/worldgen/DEUS_WORLDGEN_WBS.md:247 (bare, file from 8 line(s) back) OK
section: 13.3 The go/no-go
claim: DEC-017's hygiene rule applies: each perf record notes the concurrent worker count and CPU %, and the go/no-go evidence includes one quiet-machine rerun (`:247`).
   247  | **WG.65.08** | Soil Formation & Pedogenesis | Fable | Weathering of compacted rubble and sediment into fertile topsoil layers supporting micro-vegetation. | `PLANNED` |

### C379 ADR:1347 game/package.json:4-11 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **NW.js runtime** (window, fs, argv) | `game/package.json:4-11` (`chromium-args`, `window`); `DEUS_Core.js:69`, `:98`, `:134`; `DEUS_FactionMenus.js:455` (`nw.gui`) | kept; NW.js is not RMMZ | unchanged |
     4  "chromium-args": "--force-color-profile=srgb",
     5  "window": {
     6  "title": "Ultima Fortress - The Living Mountainhall",
     7  "width": 816,
     8  "height": 624,
     9  "position": "center",
    10  "icon": "icon/icon.png"
    11  }

### C380 ADR:1347 game/js/plugins/DEUS_Core.js:69 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **NW.js runtime** (window, fs, argv) | `game/package.json:4-11` (`chromium-args`, `window`); `DEUS_Core.js:69`, `:98`, `:134`; `DEUS_FactionMenus.js:455` (`nw.gui`) | kept; NW.js is not RMMZ | unchanged |
    69  const fs = require('fs');

### C381 ADR:1347 game/js/plugins/DEUS_Core.js:98 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **NW.js runtime** (window, fs, argv) | `game/package.json:4-11` (`chromium-args`, `window`); `DEUS_Core.js:69`, `:98`, `:134`; `DEUS_FactionMenus.js:455` (`nw.gui`) | kept; NW.js is not RMMZ | unchanged |
    98  require(p);

### C382 ADR:1347 game/js/plugins/DEUS_Core.js:134 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **NW.js runtime** (window, fs, argv) | `game/package.json:4-11` (`chromium-args`, `window`); `DEUS_Core.js:69`, `:98`, `:134`; `DEUS_FactionMenus.js:455` (`nw.gui`) | kept; NW.js is not RMMZ | unchanged |
   134  const nwArgs = (typeof nw !== 'undefined' && nw.App && nw.App.argv) ? nw.App.argv : [];

### C383 ADR:1347 game/js/plugins/DEUS_FactionMenus.js:455 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **NW.js runtime** (window, fs, argv) | `game/package.json:4-11` (`chromium-args`, `window`); `DEUS_Core.js:69`, `:98`, `:134`; `DEUS_FactionMenus.js:455` (`nw.gui`) | kept; NW.js is not RMMZ | unchanged |
   455  const nwGui = require("nw.gui");

### C384 ADR:1348 game/js/rmmz_core.js:471 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | kept | the renderer uses the same PIXI v5 and `Graphics` loop |
   471  function Graphics() {

### C385 ADR:1348 game/js/rmmz_core.js:808 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | kept | the renderer uses the same PIXI v5 and `Graphics` loop |
   808  Graphics._onTick = function(deltaTime) {

### C386 ADR:1348 game/js/rmmz_core.js:1177 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | kept | the renderer uses the same PIXI v5 and `Graphics` loop |
  1177  function Bitmap() {

### C387 ADR:1348 game/js/rmmz_core.js:1851 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | kept | the renderer uses the same PIXI v5 and `Graphics` loop |
  1851  function Sprite() {

### C388 ADR:1348 game/js/plugins/DEUS_Depth.js:219 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | kept | the renderer uses the same PIXI v5 and `Graphics` loop |
   219  DepthCanvasLayer.prototype = Object.create(PIXI.Container.prototype);

### C389 ADR:1348 game/js/plugins/DEUS_Depth.js:685 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | kept | the renderer uses the same PIXI v5 and `Graphics` loop |
   685  const f = this._colorFilter || (this._colorFilter = new PIXI.filters.ColorMatrixFilter());

### C390 ADR:1349 game/js/rmmz_core.js:2185 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3 either way | the renderer needs its own multi-layer tilemap for A1-A4 autotiles: size L, risk high (autotile correctness) |
  2185  function Tilemap() {

### C391 ADR:1349 game/js/rmmz_core.js:2672 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3 either way | the renderer needs its own multi-layer tilemap for A1-A4 autotiles: size L, risk high (autotile correctness) |
  2672  Tilemap.TILE_ID_A1 = 2048;

### C392 ADR:1349 game/js/rmmz_core.js:2682 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3 either way | the renderer needs its own multi-layer tilemap for A1-A4 autotiles: size L, risk high (autotile correctness) |
  2682  Tilemap.isAutotile = function(tileId) {

### C393 ADR:1349 game/js/rmmz_core.js:2694 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3 either way | the renderer needs its own multi-layer tilemap for A1-A4 autotiles: size L, risk high (autotile correctness) |
  2694  Tilemap.makeAutotileId = function(kind, shape) {

### C394 ADR:1349 game/js/rmmz_core.js:2726 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3 either way | the renderer needs its own multi-layer tilemap for A1-A4 autotiles: size L, risk high (autotile correctness) |
  2726  Tilemap.isWaterTile = function(tileId) {

### C395 ADR:1349 game/js/rmmz_core.js:2793 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3 either way | the renderer needs its own multi-layer tilemap for A1-A4 autotiles: size L, risk high (autotile correctness) |
  2793  Tilemap.FLOOR_AUTOTILE_TABLE = [

### C396 ADR:1350 game/js/rmmz_scenes.js:747 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Scene / Spriteset / Sprite_Character** | `rmmz_scenes.js` `Scene_Map` `:747`; `rmmz_sprites.js` `Spriteset_Map` `:3345`; `Scene_Map.prototype.*` overridden in 20 plugins, `Spriteset_Map.prototype.*` in 18, `Scene_Boot.start` in 39 | `Scene_Map` and `Scene_Boot` kept | `Spriteset_Map` and the unit `Sprite_Character`s are replaced for map drawing; the 18 `Spriteset_Map` overrides move into the renderer or are retired: size L, risk medium |
   747  function Scene_Map() {

### C397 ADR:1350 game/js/rmmz_sprites.js:3345 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Scene / Spriteset / Sprite_Character** | `rmmz_scenes.js` `Scene_Map` `:747`; `rmmz_sprites.js` `Spriteset_Map` `:3345`; `Scene_Map.prototype.*` overridden in 20 plugins, `Spriteset_Map.prototype.*` in 18, `Scene_Boot.start` in 39 | `Scene_Map` and `Scene_Boot` kept | `Spriteset_Map` and the unit `Sprite_Character`s are replaced for map drawing; the 18 `Spriteset_Map` overrides move into the renderer or are retired: size L, risk medium |
  3345  function Spriteset_Map() {

### C398 ADR:1351 game/js/rmmz_core.js:5652 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Input** (`Input`, `TouchInput`, `keyMapper`) | `rmmz_core.js` `:5652`, `:6021`; 18 plugins; private `_currentState` read ×73 | kept | unchanged |
  5652  function Input() {

### C399 ADR:1351 game/js/rmmz_core.js:6021 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Input** (`Input`, `TouchInput`, `keyMapper`) | `rmmz_core.js` `:5652`, `:6021`; 18 plugins; private `_currentState` read ×73 | kept | unchanged |
  6021  function TouchInput() {

### C400 ADR:1352 game/js/rmmz_managers.js:1103 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Audio** (`AudioManager`, `SoundManager`) | `rmmz_managers.js:1103`, `:1491`; 8 plugins | kept | unchanged |
  1103  function AudioManager() {

### C401 ADR:1352 game/js/rmmz_managers.js:1491 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Audio** (`AudioManager`, `SoundManager`) | `rmmz_managers.js:1103`, `:1491`; 8 plugins | kept | unchanged |
  1491  function SoundManager() {

### C402 ADR:1353 game/js/rmmz_managers.js:345 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | kept; they store `deusSim` + `deusView` (§11) | unchanged |
   345  DataManager.saveGame = function(savefileId) {

### C403 ADR:1353 game/js/rmmz_managers.js:389 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | kept; they store `deusSim` + `deusView` (§11) | unchanged |
   389  DataManager.makeSaveContents = function() {

### C404 ADR:1353 game/js/rmmz_managers.js:405 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | kept; they store `deusSim` + `deusView` (§11) | unchanged |
   405  DataManager.extractSaveContents = function(contents) {

### C405 ADR:1353 game/js/rmmz_managers.js:538 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | kept; they store `deusSim` + `deusView` (§11) | unchanged |
   538  function StorageManager() {

### C406 ADR:1353 game/js/rmmz_core.js:6416 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | kept; they store `deusSim` + `deusView` (§11) | unchanged |
  6416  function JsonEx() {

### C407 ADR:1354 game/js/plugins/DEUS_WorldGen.js:45-46 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Database JSON** (`$dataMap`, `$dataTilesets`, `$dataSystem`; custom databases through `_databaseFiles`) | `$dataMap` in 21 plugins; `$dataTilesets` in 5; `$dataSystem` in 3; loaders `DEUS_WorldGen.js:45-46`, `DEUS_Look.js:93`, `DEUS_World.js:2813` | kept; `$dataMap` becomes a render projection (§4.6) | the renderer reads the view, not `$dataMap` |
    45  if (!DataManager.isBattleTest() && !DataManager.isEventTest()) {
    46  DataManager._databaseFiles.push({ name: CATALOG_VAR, src: "DEUS_WorldCatalog.json" });

### C408 ADR:1354 game/js/plugins/DEUS_Look.js:93 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Database JSON** (`$dataMap`, `$dataTilesets`, `$dataSystem`; custom databases through `_databaseFiles`) | `$dataMap` in 21 plugins; `$dataTilesets` in 5; `$dataSystem` in 3; loaders `DEUS_WorldGen.js:45-46`, `DEUS_Look.js:93`, `DEUS_World.js:2813` | kept; `$dataMap` becomes a render projection (§4.6) | the renderer reads the view, not `$dataMap` |
    93  if (!DataManager._databaseFiles.some(f => f.name === INDEX_VAR)) DataManager._databaseFiles.push({ name: INDEX_VAR, src: INDEX_FILE });

### C409 ADR:1354 game/js/plugins/DEUS_World.js:2813 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Database JSON** (`$dataMap`, `$dataTilesets`, `$dataSystem`; custom databases through `_databaseFiles`) | `$dataMap` in 21 plugins; `$dataTilesets` in 5; `$dataSystem` in 3; loaders `DEUS_WorldGen.js:45-46`, `DEUS_Look.js:93`, `DEUS_World.js:2813` | kept; `$dataMap` becomes a render projection (§4.6) | the renderer reads the view, not `$dataMap` |
  2813  DataManager._databaseFiles.push({ name: TEMPLATE_VAR, src: "Map%1.json".format(CONFIG.templateMapId.padZero(3)) });

### C410 ADR:1355 game/js/plugins/DEUS_Sheet.js:1158 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Menus / windows** (`Window_*`, `Scene_MenuBase`) | 13 plugins use `Window_*`, 9 subclass them (e.g. `DEUS_Sheet.js:1158`, `DEUS_Interact.js:525`); the stock menu is disabled (`DEUS_ColonyOverseer.js:173`) | kept | unchanged |
  1158  class Window_UFSheet extends Window_Base {

### C411 ADR:1355 game/js/plugins/DEUS_Interact.js:525 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Menus / windows** (`Window_*`, `Scene_MenuBase`) | 13 plugins use `Window_*`, 9 subclass them (e.g. `DEUS_Sheet.js:1158`, `DEUS_Interact.js:525`); the stock menu is disabled (`DEUS_ColonyOverseer.js:173`) | kept | unchanged |
   525  class Window_UFContextMenu extends Window_Command {

### C412 ADR:1355 game/js/plugins/DEUS_ColonyOverseer.js:173 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Menus / windows** (`Window_*`, `Scene_MenuBase`) | 13 plugins use `Window_*`, 9 subclass them (e.g. `DEUS_Sheet.js:1158`, `DEUS_Interact.js:525`); the stock menu is disabled (`DEUS_ColonyOverseer.js:173`) | kept | unchanged |
   173  Scene_Map.prototype.isMenuEnabled = function() { return false; };

### C413 ADR:1356 game/js/plugins/DEUS_World.js:899 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Events / characters** (`Game_Event`, `Game_CharacterBase`, `Game_Player`) | every unit on view is a `Game_Event` (`DEUS_World.js:899`); `Game_CharacterBase` overrides in 11 plugins | after Inc 3 they are puppets fed by the view | the renderer draws units from the view; puppets stay only where RMMZ's event interpreter needs them (dialogue, common events) |
   899  const ev = new Game_Event($gameMap.mapId(), eid);

### C414 ADR:1357 game/js/rmmz_managers.js:1982-2112 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Main loop** (`SceneManager`) | `rmmz_managers.js:1982-2112`; TimeSpeed overrides (§1.1) | kept; `DEUS_SimHost` wraps it (§3.4) | unchanged |
  1982  SceneManager.update = function(deltaTime) {
  1983  try {
  1984  const n = this.determineRepeatNumber(deltaTime);
      ...
  2111  Graphics.frameCount++;
  2112  };

### C434 ADR:1385 docs/systems/UF_History.md:192-201 OK
section: 14.1 What exists today
claim: - 500-year demographic trajectories took 8.9–10.6 s of simulation, with the worst year at 66–91 ms (`docs/systems/UF_History.md:192-201`). Both repeats of each seed matched byte for byte (`docs/systems/UF_History.md:207`).
   192  Only public `api.step` execution contributes to simulation time. Worker wall also includes setup, observations, checkpoint validation/serialization and emission; parent process wall includes startup, source loading and f
   193  
   194  | Seed | Repeat | Simulation, s | Worker wall, s | Parent process wall, s | Worst annual step, ms |
      ...
   200  | 20260919 | 1 | 10.0856625 | 11.6161753 | 12.0479071 | 70.0923 |
   201  | 20260919 | 2 | 9.9830550 | 11.5073334 | 11.9582089 | 73.4312 |

### C435 ADR:1385 docs/systems/UF_History.md:207 OK
section: 14.1 What exists today
claim: - 500-year demographic trajectories took 8.9–10.6 s of simulation, with the worst year at 66–91 ms (`docs/systems/UF_History.md:192-201`). Both repeats of each seed matched byte for byte (`docs/systems/UF_History.md:207`).
   207  Both repeats have exact matching state/event bytes, hashes and annual curves. Each unique checkpoint appears once below. Horizons are elapsed years; cumulative births exclude 72 founders, deaths include founder deaths. R

### C436 ADR:1386 docs/systems/UF_History.md:27 OK
section: 14.1 What exists today
claim: - In the integration matrix, whose worker times include generation and materialization, a worker took 2.7–3.1 s at age 0 and 10.3–13.5 s at age 500, with about 5 MB world states (`docs/systems/UF_History.md:27`, `:31-44`).
    27  Final integration artifact: `C:/Users/snewt/AppData/Local/Temp/deus-astra16-integration-ee162c08-c4da-4d5b-950b-e2db45b28329.json`. Total integration wall time: **104.5186285 s**. Worker timings below include generation,

### C437 ADR:1386 docs/systems/UF_History.md:31-44 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: - In the integration matrix, whose worker times include generation and materialization, a worker took 2.7–3.1 s at age 0 and 10.3–13.5 s at age 500, with about 5 MB world states (`docs/systems/UF_History.md:27`, `:31-44`).
    31  | Seed | Age | Living | Ancestors | Serialized world bytes | Worker ms |
    32  |---:|---:|---:|---:|---:|---:|
    33  | 0 | 0 | 72 | 0 | 278364 | 2758.241 |
      ...
    43  | 20260919 | 250 | 977 | 1584 | 3519606 | 4474.997 |
    44  | 20260919 | 500 | 1093 | 4224 | 5037835 | 13465.403 |

### C439 ADR:1404 docs/systems/UF_History.md:194-201 OK
section: 14.2 Design: history on the headless core
claim: 5. **Deterministic.** The run is a pure function of `(seed, setup parameters)`. Its output checksum is tested twice per seed, as the history harnesses already do with repeat runs (`docs/systems/UF_History.md:194-201`, byte-identical repeats `:207`).
   194  | Seed | Repeat | Simulation, s | Worker wall, s | Parent process wall, s | Worst annual step, ms |
   195  |---|---|---|---|---|---|
   196  | 0 | 1 | 8.9013169 | 10.3797087 | 10.8229190 | 65.8954 |
   197  | 0 | 2 | 10.2230709 | 11.7833740 | 12.2414065 | 69.8933 |
   198  | 424242 | 1 | 10.6002966 | 12.1596999 | 12.5811280 | 75.7094 |
   199  | 424242 | 2 | 10.6036280 | 12.1866124 | 12.6483508 | 91.4553 |
   200  | 20260919 | 1 | 10.0856625 | 11.6161753 | 12.0479071 | 70.0923 |
   201  | 20260919 | 2 | 9.9830550 | 11.5073334 | 11.9582089 | 73.4312 |

### C440 ADR:1404 docs/systems/UF_History.md:207 (bare, file from 0 line(s) back) OK
section: 14.2 Design: history on the headless core
claim: 5. **Deterministic.** The run is a pure function of `(seed, setup parameters)`. Its output checksum is tested twice per seed, as the history harnesses already do with repeat runs (`docs/systems/UF_History.md:194-201`, byte-identical repeats `:207`).
   207  Both repeats have exact matching state/event bytes, hashes and annual curves. Each unique checkpoint appears once below. Horizons are elapsed years; cumulative births exclude 72 founders, deaths include founder deaths. R

### C441 ADR:1407 docs/systems/UF_History.md:27 OK
section: 14.2 Design: history on the headless core
claim: - today's age-500 world takes 10.3–13.5 s per worker, generation and materialization included (`docs/systems/UF_History.md:27`, `:31-44`), and the traces must fit in the rest.
    27  Final integration artifact: `C:/Users/snewt/AppData/Local/Temp/deus-astra16-integration-ee162c08-c4da-4d5b-950b-e2db45b28329.json`. Total integration wall time: **104.5186285 s**. Worker timings below include generation,

### C442 ADR:1407 docs/systems/UF_History.md:31-44 (bare, file from 0 line(s) back) OK
section: 14.2 Design: history on the headless core
claim: - today's age-500 world takes 10.3–13.5 s per worker, generation and materialization included (`docs/systems/UF_History.md:27`, `:31-44`), and the traces must fit in the rest.
    31  | Seed | Age | Living | Ancestors | Serialized world bytes | Worker ms |
    32  |---:|---:|---:|---:|---:|---:|
    33  | 0 | 0 | 72 | 0 | 278364 | 2758.241 |
      ...
    43  | 20260919 | 250 | 977 | 1584 | 3519606 | 4474.997 |
    44  | 20260919 | 500 | 1093 | 4224 | 5037835 | 13465.403 |

### C446 ADR:1423 docs/OWNER_DECISIONS.md:172-195 OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: DEC-013 as amended is recorded at `docs/OWNER_DECISIONS.md:172-195`, under the heading "Thirty-Two Z Layers, Nine Races, Home Layer Ranges, Five Biome Bands, and Governing Scale". The amendment is commit `a1629a69`. This section uses these parts of it:
   172  ### Decision `DEC-013`: Thirty-Two Z Layers, Nine Races, Home Layer Ranges, Five Biome Bands, and Governing Scale
   173  - **Date Logged:** 2026-09-26 (Amended 01:10 CT per Owner Directive 0021-V Addendum §12–§13; supersedes 9-layer baseline)
   174  - **Status:** `DECIDED` (Owner ruling 00:34, 00:37, 01:06–01:10 CT)
      ...
   194  - **Race-to-Band/Layer-Range Mapping:** Which specific race occupies which home layer range. Status: `OPEN` (Owner assigns).
   195  - **Biome Assignment per Band:** Mapping of the 25 specific biomes into the 5 bands. Status: `OPEN` (Owner assigns).

### C447 ADR:1424 docs/OWNER_DECISIONS.md:177 (bare, file from 1 line(s) back) OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: - **32 continuous layers,** −16..+15, surface 0, 320 ft. The refactor must still run at 9 layers in automated tests (`:177`). The range is OPEN with that PM default (`:193`).
   177  1. **Thirty-Two Z Layers:** The world simulation and presentation expand to 32 vertical Z layers (superseding 9 layers; formerly -2..+2). Total vertical headroom: 320 ft. The Z-range refactor targets 32 as the default ga

### C448 ADR:1424 docs/OWNER_DECISIONS.md:193 (bare, file from 1 line(s) back) OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: - **32 continuous layers,** −16..+15, surface 0, 320 ft. The refactor must still run at 9 layers in automated tests (`:177`). The range is OPEN with that PM default (`:193`).
   193  - **Z-Range Coordinate Mapping:** Default `-16..+15` (surface = 0). Status: `OPEN` (PM default).

