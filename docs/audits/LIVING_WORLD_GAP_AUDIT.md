# Living World Gap Audit (SIM.50.01)

| | |
|---|---|
| Task | SIM.50.01, Living World Gap Audit (WBS Rev 22; Directive 0021-V Addendum §14; VISION V142) |
| Writer / reviewer | Claude (writer), Grok (reviewer) |
| Date | 2026-09-26 |
| Code audited | `main` at commit `75cf2ff3` (worktree `task/gap-audit`, which is `main` plus this document) |
| Kind of work | Read-only architecture and source audit. No file in `game/` or `tools/` was changed. No art was requested or made (DEC-007). |
| Governing rows | V133 (change-driven), V136 / DEC-013 (32 layers, sparse storage, scale), V137 (support and collapse), V138 (decay), V139 / DEC-014 (population budget, crowd LOD), V140 (reproduction), V141 / DEC-015 (faction plans), V142 (nine systems), DEC-012 (sim/render split, LOD), LIFE-001..003, NAT-003, INV-SIM-02, INV-SIM-03 |

## 0. How to read this audit

- **Citations.** Every claim about engine code cites `file:line` at `75cf2ff3`. A bare plugin name (`DEUS_Fluid.js:56`) means `game/js/plugins/DEUS_Fluid.js`. Other paths are written from the repo root.
- **Evidence tables.** In a table whose first two columns are a citation and a code excerpt, the excerpt is copied verbatim from that line (`\|` in the table is a literal `|`). `node tasks/SIM.50.01/gap-audit/verify_citations.js` checks every citation and excerpt in this file against the commit and exits 1 on any mismatch (section 10 has its output).
- **Status words.**
  - **PRESENT**: implemented and running in the live game.
  - **PARTIAL**: some of the required behaviour runs live; the rest is missing.
  - **DORMANT**: code exists but live play never reaches it.
  - **ABSENT**: no code.
- **Severity** follows AGENTS.md: **BLOCKER** stops the WBS leaf from meeting its acceptance criteria; **MAJOR** breaks a binding rule (a LIFE or V row) or makes the leaf much larger than its row suggests; **MINOR** is a local defect.
- **What "static reading" means here.** Nothing was run in NW.js or the RMMZ editor. Runtime behaviour is inferred from code, except for one Node probe (section 2.1) and the gate test. Where a claim is an inference rather than a direct reading, it says so.

## 1. Summary

### 1.1 Status of each system

| # | System | WBS | Status | What exists today | Largest gap |
|---|---|---|---|---|---|
| 1 | Cross-layer water | SIM.50.02 | PARTIAL | A 0..7 fluid solver whose flow step conserves volume, with a dirty queue and gravity-first flow over 5 levels (`DEUS_Fluid.js`) | Probably not reachable from the game as loaded (probe, section 2.1); no sources, sinks, seepage, springs or lake cycling; surface water is tiles, not volume |
| 2 | Erosion and sediment | SIM.50.03 | ABSENT | Static carved features at world generation only | No sediment material, no flow velocity, no slow clock |
| 3 | Vegetation spread and succession | SIM.50.04 | PARTIAL | Hourly seed spread 1 to 3 cells, one sapling-to-tree step, in-place regrowth | No succession, canopy, death, soil or season input; ground level only; the same code creates ore (LIFE-002) |
| 4 | Fire spread | SIM.50.05 | PARTIAL | Active burning list, 4-neighbour spread by catalog chance, fuel countdown, burnout rules | No wind, dryness, weather or cross-layer spread; burned items are deleted; no carbon or ash mass |
| 5 | Seasons and weather | SIM.50.06 | PARTIAL | A calendar whose "seasons" are the four 6-hour quarters of one day (V123 time scale); weather rolled once per area; diurnal temperature | No annual cycle, freezing, snow cover, thaw or runoff; no crop system loaded; calendar scale needs an Owner ruling |
| 6 | Animal migration | SIM.50.07 | ABSENT (movement DORMANT) | Herds placed once at New Game with a home cell | Wildlife AI switched off; no migration, no cross-layer animal movement, no herd summary |
| 7 | Anthropic land reshaping | SIM.50.08 | PARTIAL | Mining a solid cell to floor, chopping, colony path plans | No road wear, field clearing, dams, canals or terraces; every earth-moving path breaks mass conservation |
| 8 | Settlement lifecycle | SIM.50.09 | PARTIAL | Live phases camp, village, town from population; history ledger records abandonment | No hamlet, city or capital; no live contraction or abandonment; no ruins; foundations never reused |
| 9 | Geological events | SIM.50.10 | ABSENT | Sinkholes, fissures and lava tubes as static generator shapes | No runtime event, scheduler, earthquake, collapse or eruption |
| C1 | Structural support and collapse | SIM.40.01-04 | ABSENT | A per-cell `support` value used only by a diagnostic | No support propagation, no collapse, constructions are not strata |
| C2 | Decay and reclamation | SIM.40.05-09 | ABSENT | Doors have HP; remains vanish after 12 game hours | No structure or item decay, no stages, no burial |
| C3 | Reproduction and lifecycle | SIM.40.10 | PARTIAL / DORMANT | Asexual herd births each game hour; colonist conception; a yearly history ledger with species profiles | Live pregnancies and aging never advance; births cost no food; no animal age, sex or litters |
| C4 | Faction Development Plans | DEC-015, SOC.10.02-03 | ABSENT | Three fixed build-step lists per culture; hardcoded brain weights | No plan schema, no plan files, no stages past town, no tech tree |

### 1.2 Findings that decide the order of work

| ID | Severity | Finding | Section |
|---|---|---|---|
| F-01 | BLOCKER | The vertical model is 5 levels (-2..+2) of five **1 ft** strata, hardcoded independently in 22 plugin files (Appendix A). DEC-013 asks for 32 layers of five **2 ft** strata. Every one of the nine systems inherits this. | 2.2, App. A |
| F-02 | BLOCKER | Saves are already sparse (seed plus changed cells), but resident memory is dense per level: each generated level of a 256×256 area costs about 416 KiB of strata and grids, and 3D pathfinding reserves 72 bytes per cell of every level. At 32 layers the same scheme needs about 13 MiB of strata and 144 MiB of pathfinding scratch per area. | 2.3 |
| F-03 | BLOCKER (LIFE-002) | `DEUS_Ecology` spawns loose stones every 60 frames that turn into iron, copper and gold outcrops, which mine into ore. This contradicts V74, V83, INV-SIM-03 and the plugin's own header. | 3.3 |
| F-04 | MAJOR (LIFE-001) | No path that removes or transforms matter conserves it. Examples: destroyed strata become air; mining 4 strata yields 2 stone; digging makes stone from nothing; quarrying a 2-stone wall returns 4 stone; fire deletes items; births create adults from nothing. There is no mass ledger to catch any of it. | 2.4, 2.6, 3.4, 3.7, 4.3 |
| F-05 | MAJOR | `DEUS_Fluid` is loaded with `require()` (not `plugins.js`), and the module assigns itself to a function-local `UF`. A Node probe shows that under `require()` `window.UF.Fluid` stays unset and no change listener attaches. If NW.js behaves the same (not run), the game falls back to a legacy flood fill that makes water without volume. | 2.1, 3.1 |
| F-06 | MAJOR | The calendar is V123's compressed year (1 day/night cycle = 1 year = 240 s). "Seasons" are the 6-hour quarters of a day, the month never advances, and one game-hour counter jumps about 8,065 hours at every midnight. A seasons system cannot start until the Owner rules on the calendar scale. | 2.5, 3.5 |
| F-07 | MAJOR | Several simulations exist but are unreachable: the wildlife AI loop was removed, live pregnancies and aging are only called from a disabled history loop, and every farm hook calls an undefined `UF.Agriculture`. | 3.6, 4.3, 3.5 |
| F-08 | MAJOR | No structural support, collapse, decay or geological event code exists. The damage API that would drive them (`applyVolumeDamage`) has no caller outside its own self-test, and walls, doors and furniture are objects, not strata, so a strata support model could not see them. | 4.1, 4.2, 3.9 |
| F-09 | MAJOR | There is no LOD. The world is one 256×256 area. Systems either simulate only the viewed area (Fluid), a current-plus-rotating area (Ecology), or every unit in the world at full fidelity every frame or short period (World, Environment, Combat, Colonists and others). There are no crowd counts. | 2.7, App. B |
| F-10 | MAJOR | Scheduling is frame-count based (every frame, every 30/36/60/120 frames), not tagged with time domains (INV-SIM-02). `UF_Time.js`, which has domain-tagged schedulers, is not loaded. Three per-frame hooks walk every unit in the world. | 2.5, App. B |

## 2. Shared foundation

Every living-world system will read and write the same world model, clock and save. This section records what that foundation is today.

### 2.1 Load path and plugin inventory

`game/js/plugins.js` registers 42 plugins, from `DEUS_Core` to `DEUS_Test`. Others are loaded outside it.

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Core.js:73` | `// Synchronously ensure all modular plugins are loaded in NW.js desktop runtime` | Core loads a list of companion plugins itself. |
| `DEUS_Core.js:77` | `"DEUS_Fluid",` | DEUS_Fluid is one of them; it is not in `plugins.js`. |
| `DEUS_Core.js:87` | `"UF_Households"` | UF_Households is loaded the same way. |
| `DEUS_Core.js:98` | `require(p);` | Loading is Node `require()`; the module's return value is discarded. |
| `DEUS_Fluid.js:44` | `var UF = UF \|\| {};` | Inside a CommonJS module wrapper this `var` is local to the module. |
| `DEUS_Fluid.js:1023` | `UF.Fluid = Fluid;` | The simulation registers itself on that local object. |
| `DEUS_Levels.js:3549` | `if (window.UF && UF.Fluid && typeof UF.Fluid.getFloodGrid === "function") {` | Consumers look for `window.UF.Fluid`; without it Levels uses its legacy flood fill (section 3.1). |
| `DEUS_History.js:205` | `PluginManager.loadScript(` | History loads HistoricalDemographics and Callings as classic scripts, so those bind to `window`. |
| `DEUS_Camera.js:176` | `PluginManager.loadScript("DEUS_Minimap");` | Minimap is also loaded as a classic script. |

**Probe.** `tasks/SIM.50.01/gap-audit/probe_fluid_require_binding.js` loads `DEUS_Fluid.js` from the commit twice, giving it every engine global it looks for: once through Node `require()`, and once as a classic script in a shared global. Output (run 2026-09-26, exit 0):

```text
A require():      window.UF.Fluid set: false; module.exports is the Fluid API: true; UF.Events listeners attached: 0; Game_Map.update patched: true
B classic script: window.UF.Fluid set: true; UF.Events listeners attached: 7; Game_Map.update patched: true
RESULT: require() leaves window.UF.Fluid unset; a classic script sets it
```

With `--control` (line 44 rewritten to `var UF = window.UF || {};`), both loads bind and the probe exits 1, so it can fail. The probe tests the JavaScript scoping rule, not NW.js itself. The runtime log in the canonical working copy (`game/game_runtime.log`, not in the repo) contains `[CORE] Synchronously loaded companion plugin DEUS_Fluid` (for example at 2026-09-26T04:50:45.857Z) and no other line mentioning fluid. Confirming in F5 needs one console read of `window.UF.Fluid` (section 9, D-4).

**Files the brief names that do not exist at `75cf2ff3`:** `DEUS_Weather.js`, `DEUS_Time.js`, `DEUS_Flora.js`, `DEUS_Spawns.js`, `DEUS_Constructions.js`, `DEUS_Sites.js`. The work they suggest lives in `DEUS_Environment.js` (weather), `DEUS_Core.js` (clock), `DEUS_Ecology.js` and `DEUS_Objects.js` (flora), `DEUS_Wildlife.js` and `DEUS_Ecology.js` (spawns), `DEUS_Jobs.js`, `DEUS_Floors.js` and `DEUS_Projects.js` (construction), and `DEUS_History.js` and `DEUS_HistoricalDemographics.js` (sites).

**Archived prior art (on main, not loaded):**

| Citation | Code | Finding |
|---|---|---|
| `archive/plugins/DEUS_Time.js:314` | `// 4 seasons per year: Spring (days 1-5), Summer (6-10), Autumn (11-15), Winter (16-20)` | An older clock with day-of-year seasons. |
| `archive/plugins/DEUS_Agriculture.js:260` | `function processGrowth() {` | Crop plots with temperature-gated growth. |
| `archive/plugins/DEUS_Roads.js:165` | `return sites.filter(s => s.faction && !s.ruined` | Roads generated between sites at world generation. |

`UF_Time.js` (589 lines, in `game/js/plugins/`) has a domain-tagged scheduler but is loaded by nothing in the game. Only `tools/test_time_domains_proof.js` and `tools/benchmark_performance.js` load it.

### 2.2 Vertical model and scale

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Levels.js:61` | `const LEVELS = Object.freeze([-2, -1, 0, 1, 2]);` | The strata owner's level list. |
| `DEUS_Levels.js:150` | `z >= -2 && z <= 2` | Its range test is a literal, not derived from `LEVELS`. |
| `DEUS_World.js:155` | `const LEVELS = Object.freeze([-2, -1, 0, 1, 2]);` | A second, independent copy. |
| `DEUS_World.js:156` | `const SLOT = { 0: 0, 1: 1, 2: 2, "-1": 3, "-2": 4 };` | RMMZ map-id slots per level: a hand-written 5-entry table. |
| `DEUS_Fluid.js:56` | `const Z_MIN = -2;` | A third copy (with `Z_MAX` and `Z_LEVELS = 5` on lines 57-58). |
| `DEUS_Levels.js:985` | `Every 5 ft cell of every level is five 1 ft strata,` | A stratum is 1 ft and a level 5 ft. DEC-013 says 2 ft strata and 10 ft layers. |
| `DEUS_Levels.js:993` | `const STRATA = 5, CELL_FT = 5;` | Five strata per level. |
| `DEUS_Levels.js:2010` | `const E_TOP = 25;` | A column is a fixed 25-stratum elevation scale (0..24). |
| `DEUS_Levels.js:1137` | `deltas.levels = [new Map(), new Map(), new Map(), new Map(), new Map()];` | Confirms the WBS WG.00.17 note "L1137 fixed maps". |
| `DEUS_Levels.js:1805` | `const e0 = Math.max(0, (minZ + 2) * STRATA + minS), e1 = Math.min(24, (maxZ + 2) * STRATA + maxS);` | Confirms "L1805 +2 offset / cap 24". |
| `DEUS_Levels.js:1835` | `e1 = Math.min(24, Math.floor(pe + radius));` | The WBS note missed this second copy of the cap, in `sphereDamage`. |
| `DEUS_Levels.js:1791` | `is within the radius (a cell is 5 ft across, a stratum 1 ft high)` | Blast geometry mixes feet (horizontal) with stratum indices (vertical). It is right only while a stratum is 1 ft. |
| `DEUS_World.js:255` | `Z_STEP_FEET: 5,` | The spatial standard says one Z step is 5 ft. |
| `DEUS_Depth.js:166` | `camera: { eyeHeightFt: 190, levelHeightFt: 6 },` | The depth renderer assumes a 6 ft level, matching neither 5 nor 10. |
| `DEUS_World.js:1957` | `const totalNodes = 5 * n;` | 3D pathfinding is sized for exactly five levels. |
| `DEUS_Levels.js:5019` | `["Levels.setShape(3)", setShape({ area, x: 10, y: 10, z: 3 }, "floor") === false],` | A self-test asserts that z = 3 is refused, so the current tests lock in the 5-level range. |

Appendix A lists every range literal found: 22 plugin files, including range validators in 11 plugins that own no level data and fixed per-level lists in WorldGen, Minimap, DayNight, Environment and History.

**Consequences for the nine systems.** Every system that stores per-level state (Fluid, Fire, Ecology sprouts, wildlife placement, temperature) validates `z` against -2..+2 and will refuse layers ±3..±16 until WG.00.17 lands. Seasons, migration and water all name layer ranges that do not exist yet: DEC-013's bands start at -16, and the surface band is 0..+3.

### 2.3 Storage and persistence

How a level is held today:
- **Baseline strata** are a pure function of the seed. They are regenerated on demand and kept in small caches, never saved.
- **Changed cells** are 11-byte records, saved as 22 hex characters per cell.
- **Derived grids** (the packed shape grid, which walkability reads) are rebuilt per level on first read and patched per changed cell.

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Levels.js:1037` | `m = new Uint8Array(n * STRATA)` | Dense: one material byte per stratum of every cell, air included. |
| `DEUS_Levels.js:1046` | `b.strata = { m, hp: null };` | Baseline HP is implicit (full). |
| `DEUS_Levels.js:2104` | `v = LEVELS.map(z => finishBaseline(levelArrays(seed, gen, z, ax, ay, size), z, gen, size));` | All levels of an area are generated together. |
| `DEUS_Levels.js:2096` | `const VOLUME_KEEP = 3;` | Up to 3 areas' volumes are kept. |
| `DEUS_Levels.js:1231` | `const GRID_KEEP = 15;` | Up to 15 derived shape grids are kept. |
| `DEUS_Levels.js:1242` | `grid = new Uint8Array(n);` | A dense shape grid per level. |
| `DEUS_Levels.js:2699` | `const N = n * E_TOP, sol = new Uint8Array(N), q = new Int32Array(N);` | Generation-time floating-rock pass over the whole 25-stratum column. |
| `DEUS_Levels.js:4055` | `for (let ay = 0; ay < st.areasY; ay++) for (let ax = 0; ax < st.areasX; ax++) baseline(z, ax, ay);` | New Game generates every area × level. |
| `DEUS_Levels.js:997` | `const REC = 11, REC_M = 1, REC_HP = 6;` | A changed cell is 11 bytes; the layout assumes exactly 5 strata. |
| `DEUS_Levels.js:1351` | `(L.strata[key] = L.strata[key] \|\| {})[i] = encodeRecord(r);` | Save: `levels[z].strata["ax,ay"][cell] = hex`. |
| `DEUS_Levels.js:1543` | `putDelta(st, z, ax, ay, i, sameAsBaseline(b, i, rec) ? null : rec);` | A cell restored to its baseline leaves the save. |
| `DEUS_World.js:2903` | `contents.ufWorld = World.state;` | The whole world state object is the save. |
| `DEUS_Fluid.js:188` | `data.grids.set(z, new Uint8Array(n));` | Fluid allocates dense grids for all 5 levels of any area it touches... |
| `DEUS_Fluid.js:604` | `const data = getAreaData(coords.ax, coords.ay);` | ...including on a read (`depthAt`). |
| `DEUS_Fluid.js:835` | `records.push([ax, ay, z, x, y, t, d]);` | Fluid saves only wet cells, found by scanning every dense grid. |
| `DEUS_Fluid.js:1000` | `contents.ufFluid = saved;` | The same fluid records are attached to the save twice (also `deusFluid`, line 999). |
| `DEUS_World.js:1898` | `AS.heapCell = new Int32Array(4 * n + 8);` | Pathfinding scratch: `g`, `parent`, `seen`, `closed`, `goal`, `trace` at 4 B, plus `heapCell` 16 B and `heapKey` 32 B, which is 72 B per node (lines 1893-1900)... |
| `DEUS_World.js:2032` | `const gen = searchArrays(totalNodes);` | ...allocated for `totalNodes` = 5 levels × 65,536 cells. |
| `DEUS_Minimap.js:184` | `_state.discovery[k] = new Uint8Array(256 * 256);` | Minimap discovery: dense per visited area-level. |
| `DEUS_Levels.js:5467` | `t.check("save_size", sizeNow <= 3 * 1024 * 1024 && saveBytes > 0,` | The only size budget is a 3 MB save check. |

**Arithmetic** (from the allocation lines above; not measured). One 256×256 area, per generated level: 327,680 B strata + 32,768 B connectors + 65,536 B shape grid = 425,984 B.

| Structure | 5 levels (today) | 32 layers, same scheme |
|---|---|---|
| Strata + connectors + shape grids | 2,129,920 B (2.0 MiB) | 13,631,488 B (13.0 MiB) |
| Fluid grids + queue flags (per touched area) | 983,040 B | 6,291,456 B |
| 3D pathfinding scratch (72 B × nodes) | 23,592,960 B (22.5 MiB) | 150,994,944 B (144 MiB) |
| Generation floating pass (`sol` + `q`, transient) | 8,192,000 B | 52,428,800 B (at 160 strata per column) |
| Save, changed cells | 22 hex chars per changed cell (sparse) | unchanged |

**Verdict against DEC-013 §3 ("memory, state arrays and save size scale with occupied cells, not 32 × area").**
- **Save: meets it** for strata. Only changed cells are written.
- **Memory: fails it.** Every generated level allocates every cell, air and solid alike. Fluid, pathfinding and minimap discovery do the same. Nothing in the model distinguishes "all air" or "all rock" levels, so empty sky costs as much as a cave level.

**What WG.00.17 needs:**
- A per-column or per-chunk representation that stores uniform runs (air above, rock below) as one record.
- Allocation on demand for the few levels that differ.
- Path search bounded to the levels a route can reach.

### 2.4 Mutation API and events

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Levels.js:1537` | `function writeCell(st, ax, ay, x, y, z, rec, opts) {` | The single internal strata writer. |
| `DEUS_Levels.js:1558` | `emit("levels:strataChanged", ref, { before: Array.from(before), after: Array.from(rec), cause });` | Every write emits before/after records: a usable hook for a mass ledger. |
| `DEUS_Levels.js:1579` | `function setStrata(ref, spec, opts = {}) {` | Writes any five materials with no input cost (an API, not a physical action). |
| `DEUS_Levels.js:3014` | `function setShape(ref, shape, opts = {}) {` | Legacy shape write, converted to strata. |
| `DEUS_Levels.js:1795` | `function applyVolumeDamage(a, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact", opts = {}) {` | Box and sphere damage across levels. |
| `DEUS_Levels.js:5682` | `const sum = applyVolumeDamage(a1, fx.x, fx.y + 1, -1, 1, fx.x, fx.y + 4, -1, 4,` | Its only caller is a self-test. No gameplay code calls `applyVolumeDamage`, `applyStrataDamage` or `applyCapDamage`. |
| `DEUS_Levels.js:1764` | `const FALLOFF = { constant: t => 1, linear: t => 1 - t, quadratic: t => (1 - t) * (1 - t) };` | Sphere damage falls off with distance only. Intervening material does not attenuate it (DEC-013 §4 asks for that). |
| `DEUS_Levels.js:1702` | `rec[REC_M + s] = M_AIR;` | A stratum at 0 HP becomes air. |
| `DEUS_Levels.js:1002` | `// leaves, reported in levels:strataDestroyed (no item drops in 19A).` | The debris is only a label on an event. |
| `DEUS_Fluid.js:944` | `UF.Events.on("levels:strataDestroyed", handleGeometryChange);` | The only listener, a fluid wake-up (which the probe in 2.1 shows never attaches under `require()`). Nothing turns debris into matter. |
| `DEUS_Levels.js:2875` | `if (res.breached) emit("levels:capBreached",` | No listener. |
| `DEUS_Jobs.js:458` | `L.setShape(job.target, "floor", { material: mat });` | Live mining uses the legacy shape write, not the damage API. |
| `DEUS_Levels.js:1361` | `const fill = s === SOLID ? STRATA : s === RAMP ? 3 : (s === FLOOR \|\| s >= STAIR_UP) ? 1 : 0;` | A "floor" keeps S0 only, so mining removes 4 strata. |
| `DEUS_Jobs.js:459` | `const yields = mat === "soil" ? { stone: 1 } : { stone: 2 };` | Those 4 strata yield 2 stone, or 1 stone for soil. |
| `DEUS_Jobs.js:482` | `emit("levels:mined", job.target, mat);` | No listener anywhere. |

**Material table.**

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Levels.js:994` | `const M_AIR = 0, M_STONE = 1, M_SOIL = 2, M_WOOD = 3, M_WATER = 4, M_LAVA = 5;` | Six strata materials. |
| `DEUS_Levels.js:995` | `const M_BUILT = 0x80, M_ID = 0x3f;` | The id field has room for 64 materials. |
| `DEUS_Levels.js:1000` | `// Material table. Diagnostic values, not balanced:` | Explicitly placeholder. |
| `DEUS_Levels.js:1005` | `{ id: M_STONE, key: "stone", solid: true, fluid: false, maxHP: 120, support: 1, debris: "rubble",` | Properties: solid, fluid, maxHP, support, debris, resist. |
| `game/data/DEUS_WorldCatalog.json:4563` | `"materials": {` | The catalog has richer material data (density, compressive strength, and so on)... |
| `game/data/DEUS_WorldCatalog.json:4721` | `"weatherResistance": 50,` | ...including weathering and corrosion fields, which no plugin reads. |

**Missing material properties.** Nothing in the plugins or catalog defines porosity, permeability, load capacity or span, or per-stratum flammability. The following greps have no hits in `game/js/plugins`: `porosit|permeab`, `loadCapacity|maxLoad`, `sediment` (as code), `rubble` (as a strata material).

### 2.5 Time, clocks and scheduling

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Core.js:59` | `// User specification: 1 real minute = 1 season (6h), 1 day/night cycle (24h) = 1 in-game year (4 real minutes), 1 real hour = 15 years.` | The clock encodes V123's compressed year. |
| `docs/VISION.md:340` | `1 real hour at 1x speed = 15 game years (1 year = 240 seconds; 60 years = 4 real hours).` | V123, the source of that scale. |
| `DEUS_Core.js:306` | `this._timer += 1 / 60; // Assuming 60fps` | Clock advance is counted in frames. |
| `DEUS_Core.js:324` | `this.year++; // 1 day/night cycle per year` | Every game day is a new year. |
| `DEUS_Core.js:284` | `this.monthIndex = 0; // Granite` | The month starts at 0. Only the calendar reset (line 299) and save-load (line 478) assign it; nothing in live code advances it (the one other write is a test helper, `DEUS_Anim.js:1884`). |
| `DEUS_Core.js:359` | `if (h >= 6 && h < 12) return "Spring";` | The season is a function of the hour of day. |
| `DEUS_Core.js:328` | `UF.Events.emit("time:season", this.seasonName, this.year);` | Emitted, with no listener anywhere. |
| `DEUS_Core.js:340` | `UF.Events.emit("time:hour", this.hour);` | Listeners: `DEUS_World.js:1094`, `DEUS_Objects.js:1041`, `DEUS_Ecology.js:926`. |
| `DEUS_Core.js:344` | `UF.Events.emit("time:day", this.day, this.monthName, this.year);` | Listeners: `DEUS_Floors.js:570`, `UF_Households.js:1047`. `time:minute`, `time:season` and `time:year` have none. |
| `DEUS_Core.js:334` | `if (window.$ufSchedules) {` | `$ufSchedules` is never defined. |
| `DEUS_Core.js:508` | `if (window.UF && UF.Time && typeof UF.Time.update === "function") {` | Never true: `DEUS_TimeSpeed.js:144` replaces `UF.Time` with an object that has no `update`. |
| `DEUS_Objects.js:162` | `return (((t.year * 12 + t.monthIndex) * 28) + (t.day - 1)) * 24 + t.hour;` | The regrowth hour counter. With `year` rising daily it jumps by about 8,065 at each midnight, so every hour-based timer comes due at the next midnight. |
| `docs/VISION.md:113` | `the world beat of V48 (1 second at x1, 60 map updates, one game minute;` | V102 defines a beat as one game minute = 60 updates. The live clock makes a game minute 10 updates (`DEUS_Core.js:61`), so "beat" and "game minute" mean different things in code and VISION. |

Frame cadences in use are catalogued in Appendix B: every frame, 30, 36, 60, 120, 600 and 3000 updates. No scheduler in the loaded plugins takes or enforces a domain (`action`, `historical`, `presentation`, `engine`) as INV-SIM-02 requires. A few settings name one in a comment (`DEUS_Projects.js:38`), and the only tagged scheduler is in the unloaded `UF_Time.js`.

**What this means for NAT-003 ("multi-timescale execution").**
- The only slow clocks that exist are `time:hour` and `time:day`. Both are tied to the compressed calendar: a game day is 240 real seconds at ×1.
- A seasonal or annual slow clock would currently fire every 60 or 240 real seconds.
- A decade-scale erosion or decay tick would need a clock that does not exist yet.

### 2.6 Conservation accounting

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Fluid.js:34` | `Strict conservation: Zero liquid volume duplication or deletion.` | A claim in the help text. |
| `DEUS_Fluid.js:808` | `totalWaterVolume: totalWater,` | The only volume total, computed on demand by `diagnostics()`, which no runtime code calls. |
| `game/data/DEUS_ResourceRegistry.json:509` | `"rule": "For all conserved classes, WORLD_TOTAL remains constant after world generation.` | The conservation rule exists as data. No file in `game/js` mentions `ResourceRegistry`, so it is never loaded. |
| `DEUS_Levels.js:435` | `strataWrites: 0, strataDamaged: 0, strataDestroyed: 0,` | Event counters, not mass totals. |

These greps in `game/js/plugins` found no mass ledger: `geomass`, `massBalance|totalMass|volumeLedger|materialLedger`, and `WORLD_TOTAL`. `docs/RISK_REGISTER.md:60-62` lists LIFE-001, LIFE-002 and LIFE-003 as `ARCHITECTURALLY_MITIGATED`, but the mitigations it names (WG.65.15, INV-SIM-03, WG.65.10) are PLANNED WBS rows and the code violates LIFE-001 and LIFE-002 today (section 7).

### 2.7 Focus, LOD and population budget

| Citation | Code | Finding |
|---|---|---|
| `DEUS_World.js:73` | `The world is one 256x256 area` | One area by default (`areasX`/`areasY` default to 1 at lines 127-128; `plugins.js` passes no parameters). |
| `DEUS_World.js:1684` | `for (const u of this.units()) {` | Unit stepping walks every unit in the world every map update. |
| `DEUS_World.js:1699` | `} else if (u.goal && (frame + u.id) % steps === 0) {` | Off-screen units move one cell per 16 updates only when they have a goal. Same fidelity, staggered. |
| `DEUS_Fluid.js:740` | `totalProcessed += stepArea(view.x, view.y, budget);` | Fluid simulates only the viewed area. Other areas freeze. |
| `DEUS_Ecology.js:22` | `Every six game hours, the current area and one rotating world area get a` | Ecology serves the current area plus a round-robin area. |
| `DEUS_History.js:481` | `for (const p of living) {` | At New Game every living historical person becomes a full unit (line 518). There is no individual budget. |

- **LOD:** there are no region summaries, no promotion or demotion, and no crowd counts in live code. The only count-based population model is the legacy settle run (`DEUS_History.js:1219`), which is switched off (`game/data/DEUS_WorldCatalog.json:7670`).
- **DEC-012 is not started:** every system hooks `Game_Map.update` or `Scene_Map.update` and reads `window` globals, so none can run headless.
- **ADR-003 is not on main.** At `75cf2ff3`, `docs/adr/` has only ADR-001 and ADR-002; ADR-003 is on `task/lane-m`. The recommendations in section 6 should be reconciled with it once it merges.

## 3. The nine living-world systems

Each subsection gives:
1. What V142 and the WBS row require.
2. What exists, with citations.
3. Numbered gaps.
4. An invariant check.
5. Prerequisites.

### 3.1 SIM.50.02 Cross-layer water dynamics

**Required:** seepage through porous strata, vertical drops and waterfalls, seasonal flooding, aquifers and springs, lake filling and drying; mass conserved (LIFE-001); change-driven (V133).

**Exists**

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Fluid.js:50` | `const DEPTH_MAX = 7;` | Depth 0..7 per cell; one byte per cell with type in the high bits (lines 127-137). |
| `DEUS_Fluid.js:53` | `const TYPE_LAVA = 2;` | Two fluids, water and lava. They never mix (line 458). |
| `DEUS_Fluid.js:224` | `if (data.inQueue[cellId] === 1) return; // Already dirty and queued` | A de-duplicated dirty queue. |
| `DEUS_Fluid.js:364` | `// Queue is quiescent! Stable state costs nothing.` | Settled water costs a queue-length check per tick. |
| `DEUS_Fluid.js:374` | `const limit = Math.min(queue.length, initialHead + maxBudget);` | At most 512 cells per tick (line 55). |
| `DEUS_Fluid.js:398` | `if (canDrainDown(ax, ay, x, y, z)) {` | Gravity first: water falls into the level below through an open floor... |
| `DEUS_Fluid.js:409` | `let transferAmt = Math.min(depth, belowCap - belowDepth);` | ...as much as fits, one level per processed cell. A multi-level drop cascades cell by cell (line 429). |
| `DEUS_Fluid.js:462` | `let maxTransfer = Math.floor(diff / 2);` | Then lateral equalisation to 4 neighbours. |
| `DEUS_Levels.js:1029` | `const FLUID_PASS = Object.freeze({ CAPACITY_MASK: 7, DOWN: 8, UP: 16, SIDE: 32 });` | Strata tell Fluid each cell's capacity and open faces. |
| `DEUS_Fluid.js:941` | `UF.Events.on("levels:cellChanged", handleGeometryChange);` | Digging and building wake the affected cells. |

**Other water that is not in the solver**

| Citation | Code | Finding |
|---|---|---|
| `DEUS_WorldGen.js:748` | `WorldGen.isWaterAt = (gx, gy, z = 0) => z === 0 ? waterModels(UF.World.state).isWater(gx, gy)` | Surface rivers and lakes are a seeded classification drawn as tiles, not fluid volume. |
| `DEUS_WorldGen.js:356` | `return !!L && f.e >= cl.seaLevel && f.e < cl.mountainLevel && f.d < L.maxDrainage && f.r > L.minRainfall` | A lake is a noise threshold... |
| `DEUS_WorldGen.js:400` | `return anchorX + amp * (0.7 * Math.sin(freq1 * dd + phase) + 0.3 * Math.sin(freq2 * dd + 2 * phase));` | ...and a river is a sine meander, not a routed flow. |
| `DEUS_Levels.js:481` | `if (shape[cy * size + cx] === FLOOR) water[cy * size + cx] = 1;` | Cave pools are static strata water set at generation. |
| `DEUS_Levels.js:3389` | `gridMinus1[i] = liq0 === "lava" ? FLOOD_LAVA : FLOOD_WATER;` | The legacy flood fill used when `UF.Fluid` is absent. Any surface water above an opening floods the level below with no volume (and -1 floods -2, line 3472). |
| `DEUS_NaturalConnections.js:353` | `addFluid(lower, "water");` | A third model: a flag copied down natural passages while the upper cell keeps its water. |

**Gaps**

| ID | Severity | Gap |
|---|---|---|
| WAT-1 | MAJOR | By the probe (section 2.1), the solver does not bind to `window.UF` when loaded by `require()`. If that holds in NW.js (not run), the legacy flood fill (`DEUS_Levels.js:3389`) decides flooding until the solver is registered or rebound, and that fill creates water. |
| WAT-2 | BLOCKER | No sources or sinks: no spring, rain input, evaporation, drainage off the map edge or infiltration. Lake filling and drying and seasonal floods cannot happen with a closed, source-free volume. |
| WAT-3 | BLOCKER | No porosity or permeability exists (section 2.4), so seepage has no input. Any all-solid cell is a wall (`DEUS_Fluid.js:276`). |
| WAT-4 | MAJOR | No pressure or upward flow. The UP bit is computed (`DEUS_Levels.js:1985`) but Fluid tests only capacity and DOWN (`DEUS_Fluid.js:300`), so artesian springs and U-bends are impossible. |
| WAT-5 | MAJOR | Four unreconciled water stores (Fluid grid, strata pools, legacy flood cache, NaturalConnections flags). Surface water is tiles; strata pools are `fluid: true, solid: false` material that the capacity sum counts as empty space. |
| WAT-6 | MAJOR (LIFE-001) | `reconcileCellWithStrata` pushes excess up, then to 4 neighbours, then drops what is left (`DEUS_Fluid.js:890-923`, no else branch). Water does not cross area edges (`DEUS_Fluid.js:328`). Drinking (`DEUS_Jobs.js:923`) and filling buckets (`DEUS_Fire.js:847`) remove no water. |
| WAT-7 | MAJOR | Levels are hardcoded -2..+2 (lines 56-58). The solver allocates 5 dense grids per touched area, even on a read (section 2.3). |
| WAT-8 | MAJOR | Off-focus water freezes rather than being summarised (DEC-012 wants water volume per basin at coarse LOD). |
| WAT-9 | MINOR | The tick is per map update (`DEUS_Fluid.js:1018`), not per beat, so flow speed depends on frame rate and on the ×N multiplier. |
| WAT-10 | MINOR | `doors:broken` sends a string key (`DEUS_Doors.js:450`); Fluid's handler reads `door.at \|\| door` (`DEUS_Fluid.js:949`) and wakes cell (0,0,0) instead of the door. |

**Invariant check:** 32 layers: no. Sparse: save yes, memory no. LOD: no. Change-driven: yes inside the viewed area. LIFE-001: the step conserves, reconciliation and the fallback do not. There is no ledger or per-tick assertion.

**Prerequisites:**
1. Fix the load or binding (D-4).
2. WG.00.17 layers and sparse storage.
3. One water authority: move surface water into the solver or the strata.
4. A conserved-volume ledger with a per-tick test.
5. A material porosity field.
6. Sources and sinks defined as explicit ledger transfers, such as rain in and evaporation out.

### 3.2 SIM.50.03 Erosion and sediment deposition

**Required:** slope wash, alluvial deposits, channel shifting, strata elevation changing over slow ticks, mass conserved into soil and sediment.

**Exists:** nothing that runs after world generation.

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Levels.js:2053` | `water_channel: { form: "line", len: [24, 60], half: [1.0, 2.0], profile: "u", bend: 1.3, deep: false },` | Channels and terraces (line 2059) are carved once by the generator. |
| `DEUS_WorldGen.js:683` | `// Arid, dry or well-drained basins form sedimentary sandstone` | "Sedimentary" appears only in the static rock-type choice. |
| `DEUS_Levels.js:894` | `const surfaceGrids = new Map();` | The surface height grid is a pure function of the seed and is never invalidated, so dug or eroded terrain is not reflected in it. |

These greps over `game/` (excluding shims) have no simulation hits: `erosion|erode|sediment|silt|alluvial|slope.?wash|weathering|pedogenesis|runoff`.

**Gaps**

| ID | Severity | Gap |
|---|---|---|
| ERO-1 | BLOCKER | There is no sediment, rubble, loose-fill or silt strata material; only air, stone, soil, wood, water and lava exist (`DEUS_Levels.js:994`). WG.65.02 and WG.65.03 are PLANNED. |
| ERO-2 | BLOCKER | Fluid stores depth only, with no velocity or flux, so it cannot compute transport capacity. |
| ERO-3 | MAJOR | There is no slow clock (section 2.5) and no disturbed-region scheduler (WG.65.14). |
| ERO-4 | MAJOR | There is no mass ledger to prove LIFE-001 (section 2.6). |
| ERO-5 | MINOR | Widespread erosion would turn many baseline cells into saved changed cells. The save stays sparse only while changes stay local, so an erosion design needs a coarse representation (per-chunk deltas) or a bound. |

**Invariant check:** not applicable. Nothing exists.

**Prerequisites:**
- SIM.50.02 with flux.
- New strata materials (the 6-bit id space has 58 free ids).
- The ledger.
- A decade-scale clock.

### 3.3 SIM.50.04 Vegetation spread and succession

**Required:** seed dispersal, canopy competition, pioneer to climax succession, reset by fire and clearing, slow-clock scheduling (NAT-003).

**Exists**

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Objects.js:14` | `Every area cell holds at most one object: a type number into` | Plants are cell objects: one per cell, saved as per-level diffs. |
| `DEUS_WorldGen.js:1265` | `if (unit4(seed, p.rollSalt, gx, gy) < p.chance * patch) {` | World generation places plants by a seeded roll per biome table. |
| `DEUS_Ecology.js:581` | `const tries = o.tries > 0 ? o.tries : 64;` | Each game hour, 64 random cells are sampled for parent plants... |
| `DEUS_Ecology.js:606` | `const spreadRate = isTree ? 0.20 : (isBush ? 0.35 : 0.50);` | ...each spreads with a hardcoded chance... |
| `DEUS_Ecology.js:639` | `if (!o.force && densityCount / 25 > 0.35) continue;` | ...unless its 5×5 window is 35% full. This is the only competition. |
| `DEUS_Ecology.js:642` | `startSapling(area, tx, ty, pType.id, { hour: at, hours: 48 });` | A tree spreads as a sapling that becomes the parent species after 48 game hours. |
| `DEUS_Ecology.js:56` | `const TREE_HOURS = 28 * 24;` | Felled or burned plants regrow in place, as the same species (line 320). |
| `DEUS_Ecology.js:998` | `stepBeat();` | A separate "beat" every 60 frames places sprouts on levels 0, -1 and -2... |
| `DEUS_Ecology.js:739` | `{ sprout: "rocks_small", matures: ["ironstone", "copper_outcrop", "granite_boulder", "gold_outcrop"], weights: [4, 3, 2, 1], delay: 150 },` | ...including loose stones that mature into ore outcrops (also lines 744 and 749). |
| `game/data/DEUS_WorldCatalog.json:1965` | `"ore_iron": 2,` | Mining an ironstone outcrop yields 2 iron ore and leaves `rocks_small` (line 1968). |
| `DEUS_Ecology.js:20` | `bushes/plants. Ore, stone, gems, ruins, and constructed objects are finite.` | The plugin's own header forbids what line 739 does. |
| `docs/VISION.md:84` | `Finite mineral deposits do not silently respawn unless a later approved rule explicitly makes them renewable.` | V74. V83 (line 94) repeats it. No later VISION row makes ore renewable. The code comment at `DEUS_Ecology.js:732` says "User specification 2026-09-19", but no VISION row records it. |

**Gaps**

| ID | Severity | Gap |
|---|---|---|
| VEG-1 | BLOCKER (LIFE-002) | Ore, stone and gem sprouts (`DEUS_Ecology.js:739`, `:744`, `:749`) create finite minerals from nothing every beat. They also create stone (granite boulder) and gems (crystal). |
| VEG-2 | MAJOR | There is no succession. Regrowth restores the same species (`DEUS_Ecology.js:320`); beat sprouts pick a species ignoring biome (line 812); there are no pioneer, climax, canopy, shade or age fields. The catalog's v2 keys `seedRainRate`, `stumpToSaplingBeats` (`game/data/DEUS_WorldCatalog.json:14661`, `:14674`) and the seasonal multipliers are read by no code. |
| VEG-3 | MAJOR | There is no plant death, aging or grazing consumption (`DEUS_Wildlife.js:826` only sets a state). |
| VEG-4 | MAJOR | There is no soil, moisture, temperature or season input. The only site test is water and walkable (`DEUS_Ecology.js:624`), and no soil-fertility or moisture field exists anywhere. |
| VEG-5 | MAJOR | Spread and regrowth are ground level only. `objects:changed` fires only for z = 0 (`DEUS_Objects.js:313`), and spread writes through area-only calls (`DEUS_Ecology.js:617`). |
| VEG-6 | MAJOR | Timer defect: hour-based regrowth comes due at the next midnight (section 2.5, `DEUS_Objects.js:162`). |
| VEG-7 | MINOR | Reading the code, a regrown sapling seems to lose its maturation timer: saplings count as renewable (`DEUS_Ecology.js:241`), and the entry is spliced before the regrown object is placed (lines 377-378). This is an inference; it was not run. |
| VEG-8 | MINOR | The beat is frame-driven (every 60 frames on the world map) and filters the sprout list per level each beat (`DEUS_Ecology.js:806`). |

**Invariant check:**
- 32 layers: no (hardcoded `[0, -1, -2]` at `DEUS_Ecology.js:805`).
- Sparse: yes (object diffs).
- LOD: current plus one rotating area.
- Change-driven: bounded periodic sampling, not full scans (acceptable under V133).
- LIFE-002: fails (VEG-1).
- LIFE-001: biomass appears without a soil or water source. Not modelled.

**Prerequisites:**
- Removing VEG-1 is independent of everything else.
- Succession needs soil and moisture fields (WG.67), seasons (SIM.50.06) and a plant state per cell (stage, age) that the one-object-per-cell model can carry.

### 3.4 SIM.50.05 Combustible fire spread

**Required:** ignition from lightning, sparks and lava; spread along fuel, driven by wind and dryness; smoke; permanent ash beds (WG.63.04); carbon mass conserved.

**Exists**

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Fire.js:531` | `const keys = Object.keys(f.burning);` | An active list of burning cells (change-driven). |
| `DEUS_Fire.js:621` | `if (++subFrames >= beatFrames()) {` | One fire beat per 60 map updates (`game/data/DEUS_WorldCatalog.json:10148`). |
| `DEUS_Fire.js:554` | `if (hash01(seed, SALT.spread, b, p.area.x, p.area.y, p.x, p.y, d) < num(nr.spread, 0))` | Each neighbour catches with its catalog `spread` chance... |
| `DEUS_Fire.js:61` | `const NEIGHBORS = [[0, -1], [1, 0], [0, 1], [-1, 0]];` | ...4 neighbours, on the same area and level (line 549). |
| `DEUS_Fire.js:556` | `rec.fuel -= 1;` | Fuel is a beat count from the catalog's `burn` (line 389). |
| `DEUS_Fire.js:439` | `const to = rule.becomes === undefined ? null : rule.becomes;` | Burnout converts the object by rule (tree to stump, `game/data/DEUS_WorldCatalog.json:10217`). |
| `DEUS_Fire.js:442` | `for (const it of I.atIn(p.area, p.x, p.y)) if (I.remove(it.id)) destroyed++;` | Items on a burned cell are deleted. |
| `DEUS_Fire.js:453` | `zOf(area) !== 0 \|\| !inBounds(x, y)) return null;` | Ash ground is written on level 0 only, as a ground tile (line 482). |
| `DEUS_Fire.js:550` | `if (f.burning[nkey] \|\| catches.has(nkey) \|\| wetUntil(f, nkey) > b) continue;` | The only moisture is temporary wetness from dousing (line 423). |
| `game/data/DEUS_WorldCatalog.json:10149` | `"startChance": 0,` | Accidental starts are switched off. Ignition is by the player, escaping campfires, or burning units. |

**Gaps**

| ID | Severity | Gap |
|---|---|---|
| FIR-1 | MAJOR | There is no wind anywhere. A search for `wind` finds a month name and a feat. There is no dryness, weather or season input to spread: Fire never reads `DEUS_Environment`. |
| FIR-2 | MAJOR | Fire does not cross levels or area edges (lines 548-549), and does not burn strata. Wood strata carry a fire resistance (`DEUS_Levels.js:1007`) that nothing uses. |
| FIR-3 | MAJOR (LIFE-001) | Burned items vanish with no residue. A burned tree becomes a stump with no ash or charcoal mass, and a burned wooden wall becomes stone rubble (`game/data/DEUS_WorldCatalog.json:10246`), which picks for 2 stone. There is no carbon accounting. |
| FIR-4 | MAJOR | An ash bed is a ground tile on level 0, not a strata layer, and nothing reverts or buries it. WG.63.04 wants it in the strata. |
| FIR-5 | MAJOR | There are no lightning, lava or spark ignition sources and no smoke. |
| FIR-6 | MINOR | While any fire burns, every beat loops over every unit in the world (`DEUS_Fire.js:723`). Campfire escape and accidental starts are evaluated only for the viewed area (lines 494, 582). |

**Invariant check:**
- 32 layers: no (z validated -2..+2, `DEUS_Fire.js:92`).
- Sparse: yes (burning map).
- LOD: burning cells run everywhere at full fidelity.
- Change-driven: yes.
- LIFE-001: fails.
- LIFE-003: ash ground persists on level 0 only.

**Prerequisites:** a weather and wind field (SIM.50.06). The WBS row lists only SIM.50.04 as its dependency. Also needed: fuel moisture per cell, strata burning through `applyStrataDamage`, and ash and charcoal as ledger outputs.

### 3.5 SIM.50.06 Seasons and dynamic weather

**Required:** an annual temperature and precipitation cycle across 32 layers; winter freezing to ice and snow; spring thaw and runoff; crops that follow the seasons.

**Exists**

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Core.js:359` | `if (h >= 6 && h < 12) return "Spring";` | The season is the quarter of the day (V123 scale, section 2.5). |
| `DEUS_Environment.js:146` | `function fieldToCelsius(t) {` | Base temperature comes from the static worldgen field... |
| `DEUS_Environment.js:235` | `const diurnalShift = Math.sin(rad) * 7.5; // -7.5°C to +7.5°C swing` | ...plus a day/night swing... |
| `DEUS_Environment.js:226` | `if (zLevel === 1) baseTemp -= 4.0;` | ...and fixed offsets for +1, +2 (line 227), -1 (`return 13.0;`, line 191) and -2 (line 195). |
| `DEUS_Environment.js:114` | `const roll = (hash >>> 0) % 100;` | Weather is one hashed roll per area... |
| `DEUS_Environment.js:120` | `if (st && st.weatherByArea) st.weatherByArea[areaKey(area)] = w;` | ...stored, and never changed again except by a manual override. |
| `DEUS_Environment.js:31` | `Snow/blizzard occurs when precipitation happens and temperature <= 0°C.` | The header promises snow; no code produces it. |
| `DEUS_Environment.js:709` | `$gameScreen.changeWeather(targetType, power, 60);` | RMMZ weather particles for display. |
| `DEUS_Environment.js:453` | `if (!isRoofed && (weather === "rain" \|\| weather === "downpour")) {` | Rain only wets units. |
| `DEUS_WorldGen.js:564` | `else if (f.t < 0.16) ground = "snow";` | Snow and ice (line 567) are ground types fixed at generation. |
| `DEUS_Colonists.js:5230` | `if (UF.Agriculture && UF.Agriculture.planJob && UF.Agriculture.planJob(u)) return true;` | Farming hooks call `UF.Agriculture`, which no loaded plugin defines (it lives in `archive/plugins/DEUS_Agriculture.js`). |

**Gaps**

| ID | Severity | Gap |
|---|---|---|
| SEA-1 | BLOCKER (decision) | The calendar scale. Under V123 a year is one day/night cycle, so a literal winter is midnight to 6 a.m. every 4 real minutes. A seasons system must either follow that or wait for a new Owner ruling (D-1). The month never advances and `time:season` has no listener. |
| SEA-2 | MAJOR | There is no annual temperature term. Environment never reads the season. |
| SEA-3 | MAJOR | There are no weather dynamics: no precipitation events over time, no storm fronts, no wind. |
| SEA-4 | MAJOR | There is no freeze, thaw, snow cover or runoff. Fluid has only water and lava types (`DEUS_Fluid.js:52-53`) and no temperature link. |
| SEA-5 | MAJOR | No crop system is loaded (`UF.Agriculture` undefined). The archived one has no season input. |
| SEA-6 | MINOR | The temperature cache key ignores the area: `DEUS_Environment.js:182` keys on `(zLevel + 2)`, x and y only. It also breaks below z = -2. |

**Invariant check:**
- 32 layers: no (temperature has fixed values for -2..+2).
- Sparse: not applicable (no per-cell state).
- LOD: not applicable.
- Change-driven: the clock is O(1). Environment walks all units per frame (Appendix B).
- Conservation: not applicable.

**Prerequisites:** the Owner ruling on the calendar (D-1), a slow-clock service with domain tags, a temperature-by-layer model for 32 layers (DEC-013 bands), and a freeze state for fluid (a third fluid type or a frozen flag).

### 3.6 SIM.50.07 Animal migration and herd movement

**Required:** seasonal herd travel between upland and lowland across Z layers; summary-LOD movement off camera; individuals materialise near focus.

**Exists**

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Wildlife.js:1311` | `UF.Events.on("world:created", state => spawnWorld(state));` | Wildlife is placed once, at New Game. |
| `DEUS_Wildlife.js:314` | `home: { x: center.x, y: center.y }, cells, dirs }` | A herd is a home cell plus members, each with a herd id (line 546) and a wander radius (line 545). |
| `DEUS_Wildlife.js:526` | `herds.push(...planUnderground(st, ax, ay, -2, report));` | Herds are planned for the surface, -1 and -2. None for +1 or +2. |
| `DEUS_Wildlife.js:465` | `const herdCount = Math.min(wildPockets.length, z === -1 ? 6 : 4);` | Underground herds are capped per area. |
| `DEUS_Wildlife.js:543` | `ai: null,` | Spawned animals get no AI mode... |
| `DEUS_Wildlife.js:1197` | `// AI update loop wiped per Objective 2` | ...and the update hook no longer calls the wildlife tick (defined at line 1158, never called). |
| `DEUS_World.js:1440` | `World.moveUnitToLevel = function(unit, z, x, y, opts = {}) {` | The engine can move a unit between levels. Wildlife never calls it. |
| `DEUS_Ecology.js:174` | `for (const u of W.unitsInArea(area.x, area.y)) {` | Population counts use the default z = 0, so Ecology caps and breeds surface animals only. |

**Gaps**

| ID | Severity | Gap |
|---|---|---|
| MIG-1 | BLOCKER | Wildlife has no wander, graze or flee movement in live play: the AI is removed, and off-screen units move only with a goal (`DEUS_World.js:1699`). The only animal movement left is Combat moving hostile units toward targets (units tagged hostile, or any species containing "wolf", `DEUS_Combat.js:1323`). Migration needs a movement model first. |
| MIG-2 | MAJOR | There is no herd entity with its own state (range, season, route). A herd is only an integer on each unit. |
| MIG-3 | MAJOR | There is no season to trigger migration (section 3.5), and no layer or biome-band targets (DEC-013 bands do not exist yet). |
| MIG-4 | MAJOR | There is no summary LOD. Every animal is a full unit in `World.state.units`, and full-fidelity systems walk all of them (Appendix B). |
| MIG-5 | MINOR | The underground species list is hardcoded (`DEUS_Wildlife.js:454`). |

**Invariant check:**
- 32 layers: no (planned for 0, -1 and -2 only).
- Sparse: individuals only.
- LOD / DEC-014: no.
- Change-driven: not applicable (no wildlife tick runs).

**Prerequisites:**
- SIM.40.10 (the WBS lists it).
- SIM.50.06 seasons (not listed as a dependency).
- The LOD region model (SIM.30.01).
- Restoring a movement AI.

### 3.7 SIM.50.08 Anthropic land reshaping

**Required:** worn footpaths becoming roads, forest clearing for fields, quarrying, dams and channels, terraces and canals, all as strata changes that conserve mass.

**Exists**

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Jobs.js:458` | `L.setShape(job.target, "floor", { material: mat });` | Mining a solid cell removes S1..S4. |
| `DEUS_Jobs.js:459` | `const yields = mat === "soil" ? { stone: 1 } : { stone: 2 };` | Fixed yields, unrelated to volume; soil yields stone. |
| `DEUS_Interact.js:259` | `W.setTile(area.x, area.y, x, y, 0, base); // the kind first, so the shapes below see dirt here` | The "Dig" designation repaints a tile and touches no strata... |
| `DEUS_Interact.js:53` | `const DIG_STONE_ONE_IN = 4;` | ...and drops a stone 1 time in 4 (line 167): stone from nothing. |
| `DEUS_Objects.js:413` | `setIn(area, x, y, toId);` | Chopping replaces a tree with its `becomes` object and drops logs (line 408). |
| `DEUS_Ecology.js:407` | `scheduleResource(area, x, y, fromId, toId);` | A felled tree is scheduled to regrow in 28 game days, so clearings refill (and with the timer defect, at the next midnight). |
| `DEUS_Colonists.js:573` | `build: "road", cells: pathCells, exact: true });` | Colony plans post paths to homes... |
| `DEUS_Colonists.js:3889` | `return { type: "floor", target, params: { kind: "road", item: null, count: 0, force: true, plan: step.id } };` | ...as floor jobs of kind "road" with no material... |
| `DEUS_Floors.js:33` | `const FLOOR_IDS = ["floor_wood", "floor_stone", "floor_rushes"];` | ...which Floors appears to refuse ("invalid floor kind", line 359). This is an inference; it was not run. |
| `docs/systems/UF_Roads.md:3` | `Not yet registered in the real` | The roads plugin was never registered and now lives only in `archive/plugins/`... |
| `DEUS_Objects.js:193` | `if (R && typeof R.isRoadAt === "function" && R.isRoadAt(lvlArea, x, y)) return true;` | ...but live code still asks for `UF.Roads` (also `DEUS_Ecology.js:259`, `DEUS_World.js:3155`). |
| `game/data/DEUS_WorldCatalog.json:2225` | `"stone": 2` | A stone wall costs 2 stone... |
| `game/data/DEUS_WorldCatalog.json:2204` | `"stone": 2` | ...quarrying it yields 2 stone and leaves rubble (line 2206)... |
| `game/data/DEUS_WorldCatalog.json:2104` | `"stone": 2` | ...and picking the rubble yields 2 more. |
| `DEUS_Floors.js:276` | `L.setShape({ area: copyArea(area), x: cx, y: cy, z: targetZ }, "floor", { constructed: true, material: mat });` | Roof decks at +1 are written with no material consumed, as a side effect of the `isRoofed` query (line 215). |

**Gaps**

| ID | Severity | Gap |
|---|---|---|
| LAND-1 | MAJOR (LIFE-001, INV-SIM-03) | Every earth-moving path breaks conservation: mining (4 strata to 2 stone, soil to stone), digging (stone from nothing), wall quarrying (2 in, 4 out), roof decks (free strata). |
| LAND-2 | MAJOR | There is no foot-traffic wear, desire path or road upgrade. There is no live roads plugin, and the colony's path jobs appear to be refused. |
| LAND-3 | MAJOR | There is no field clearing: cleared forest regrows on a timer. There are no farm plots (section 3.5). |
| LAND-4 | MAJOR | There are no dams, channels, canals, terraces or irrigation. Water on the surface is tiles (section 3.1), so a dam has nothing to hold. |
| LAND-5 | BLOCKER (for SIM.40) | Walls, doors and furniture are objects placed on a cell (`DEUS_Jobs.js:721`), not constructed strata. The strata format can mark constructed strata (`DEUS_Levels.js:1602`), but no build job writes it. A support or decay model over strata would not see buildings. |
| LAND-6 | MINOR | `levels:mined` has no listener, so nothing (history, provenance, WG.65.16) learns what was dug. |

**Invariant check:**
- 32 layers: no.
- Sparse: strata changes are sparse.
- LOD: jobs run everywhere at full fidelity.
- Change-driven: event-driven jobs, but the job list is walked every update (Appendix B).
- LIFE-001: fails.
- LIFE-002: mining only yields ore from outcrops placed at generation, but VEG-1 refills them.

**Prerequisites:**
- A mass ledger.
- Debris and loose-fill materials.
- Constructions written as constructed strata.
- A live roads/paths owner.
- SOC.10.03 plan data (the WBS dependency).

### 3.8 SIM.50.09 Settlement lifecycle and ruins resettlement

**Required:** camps grow into towns, contract or are abandoned under war, famine or disease, and later settlers re-found on stone ruins reusing foundations and materials (LIFE-003).

**Exists**

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Projects.js:135` | `const PHASES = ["camp", "village", "town"];` | Live phases are derived each cycle, not stored... |
| `DEUS_Projects.js:579` | `return d.population >= (cfg.townPopulation \| 0) ? "town" : "village";` | ...a town is 16 or more people (line 65). Nothing ever steps a phase back down. |
| `game/data/DEUS_WorldCatalog.json:6150` | `"camp",` | Site tiers per people are camp, village and town (lines 6149-6152). There is no hamlet, city or capital. |
| `DEUS_HistoricalDemographics.js:521` | `if (!s.population && s.abandonedYear === null) { s.abandonedYear = state.currentYear;` | The history ledger records the year a site empties... |
| `DEUS_HistoricalDemographics.js:319` | `abandonedYear: null, isRuined: false,` | ...but never sets `isRuined`, so `DEUS_History.js:547` always leaves `site.ruined` null. |
| `DEUS_HistoricalDemographics.js:311` | `s.founded === startYear && s.ruined === null` | Every site must exist from the start year, so the model never founds or re-founds a site. |
| `DEUS_History.js:3279` | `if (site.bare) return []; // a year-1 camp: nothing is built (VISION V31, 2026-09-19)` | New-game camps have no pieces, so no ruins are stamped at generation (consistent with INV-SIM-01). |
| `DEUS_History.js:1040` | `target.kind = "ruin";` | The older simulation ruined sites by war and abandoned small ones (line 1567)... |
| `game/data/DEUS_WorldCatalog.json:7670` | `"simulate": false,` | ...and is switched off, as is the settle run (`"settleYears": 0,`, line 7675). |
| `DEUS_Colonists.js:3733` | `else if (here && (hasTag(here, "building") \|\| hasTag(here, "ruin"))) state = step.exact ? "blocked" : "skipped";` | Ruin cells block building, so foundations are never reused (also `UF_Households.js:462`). |

**Gaps**

| ID | Severity | Gap |
|---|---|---|
| SET-1 | MAJOR | There is no live contraction, abandonment or re-founding. The live planner only grows. |
| SET-2 | MAJOR (LIFE-003) | There are no lasting traces. Nothing turns an abandoned site into a physical ruin in live play, and there is no decay to stage it (section 4.2). |
| SET-3 | MAJOR | There are three tiers, not DEC-015's six (camp to capital), and no stored stage. |
| SET-4 | MAJOR | Reuse of foundations is prevented by the build and household placement rules. Buildings are objects (LAND-5), so there is no foundation stratum to reuse. |
| SET-5 | MINOR | The history ledger's abandonment never reaches the map (`isRuined` is never set). |

**Invariant check:**
- 32 layers: no (sites validated -2..+2).
- LOD: the History conversion makes every living person a unit.
- LIFE-003: fails.

**Prerequisites:** SIM.40.05-08 decay (the WBS dependency), LAND-5, and the DEC-015 plan schema for stages.

### 3.9 SIM.50.10 Catastrophic geological events

**Required:** earthquakes triggering cave-ins, karst cavities collapsing into sinkholes, volcanic fissures erupting lava, and geomorphic scars (WG.63.04).

**Exists** (generation-time shapes only)

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Levels.js:2051` | `karst_sinkhole: { form: "round", r: [2.5, 5.5], profile: "funnel", deep: true },` | Sinkholes are carved once by the generator. |
| `DEUS_Levels.js:2042` | `VOLC: { fissure: 4, tube_collapse: 3, caldera_fracture: 2, basalt_steps: 3, slot_chasm: 0.5 }` | So are volcanic features. |
| `DEUS_Levels.js:1038` | `const fluid = z === -2 ? M_LAVA : M_WATER;` | Lava exists only as static pools on -2 and as a fluid type with no source. |

These greps found no runtime hits: `earthquake|quake|tremor|seism|sinkhole|volcan|erupt|magma|disaster|catastroph|landslide`. The sinkhole and volcano matches are generator feature names; other hits are a colour name and spell text.

**Gaps**

| ID | Severity | Gap |
|---|---|---|
| GEO-1 | BLOCKER | There is no collapse model to trigger (section 4.1). An earthquake is, in practice, a damage pulse plus collapse. |
| GEO-2 | MAJOR | There is no rare-event scheduler on a slow clock, and no seeded event log for determinism (LIFE-004). |
| GEO-3 | MAJOR | There is no fluid source, so an eruption cannot add lava. Lava has no thermal effect: no fire ignition and no solidification in the solver. The only solidification is in the legacy flood (`DEUS_Levels.js:3418`). |
| GEO-4 | MAJOR | There is no scar record (WG.63.04, WG.65.16 provenance). |

**Prerequisites:** SIM.40.01-02 (the WBS dependency), fluid sources, the ledger, and a slow-clock event service.

## 4. Coupled systems

### 4.1 Structural support and collapse (SIM.40.01-04, V137)

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Levels.js:1941` | `*  collapse rules in 19A). */` | `effectiveSupport` is explicitly a diagnostic with no collapse rules (lines 1940-1946). It is per cell only. |
| `DEUS_Levels.js:1006` | `{ id: M_SOIL, key: "soil", solid: true, fluid: false, maxHP: 40, support: 0.5, debris: "loose_earth",` | A support value exists per material (stone 1, soil 0.5, wood 0.7). There is no span or load limit. |
| `DEUS_Levels.js:2696` | `// Every solid stratum must reach bedrock (elevation 0) or the area's edge (the next area) through solid strata` | The only connectivity rule runs once, inside world generation, and deletes floating rock (lines 2716-2719). It never runs after a dig. |
| `DEUS_Levels.js:2793` | `opaque: mat.solid, support: mat.support, anchored: true };` | Ceiling caps above +2 are anchored by definition. |

**Gaps**
- **SUP-1 (BLOCKER):** there is no support propagation, span check or collapse. A dig can leave any overhang standing.
- **SUP-2 (BLOCKER):** constructions are objects, not strata (LAND-5). Walls and roofs would carry no load in a strata model.
- **SUP-3 (MAJOR):** there is no debris material or rubble output (section 2.4), so collapse could not conserve mass.
- **SUP-4 (MAJOR):** there is no falling-damage path to units and objects (V95). The grep `fallDamage|unitFell|fallThrough` has no hits.
- **SUP-5 (MAJOR):** blast damage has no material attenuation between layers (DEC-013 §4) and no gameplay caller.

**What already fits V133:** `writeCell` emits one event per change with before and after records (`DEUS_Levels.js:1558`), and derived grids are patched per cell (`DEUS_Levels.js:1256-1262`). A support recompute can hang off that event and stay local.

### 4.2 Decay and nature reclamation (SIM.40.05-09, V138)

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Doors.js:91` | `const hp = Math.max(1, (type.door && type.door.hp) \| 0);` | Doors are the only structures with HP. Nothing but their own plugin damages them. |
| `DEUS_Walls.js:7` | `material durability, and construction.` | The Walls header claims durability; the file has no HP. |
| `DEUS_Items.js:7` | `material properties, decay rates, and container storage.` | The Items header claims decay rates; there is no decay code and no item age. |
| `DEUS_Anim.js:1162` | `until: nowMinutes() + Math.round(remainsHours() * 60)` | Remains are a sprite frame that is removed after 12 game hours (`game/data/DEUS_WorldCatalog.json:9922`), leaving nothing. |
| `DEUS_Objects.js:266` | `// Never schedule regrowth on floors, walls, or constructed objects` | Vegetation is kept off built cells: the opposite of overgrowth. |
| `DEUS_History.js:1508` | `e && e.ruin ? typeId(e.ruin) : 0); }` | The only ruin transition is instant and sits in the disabled settle run. |

**Gaps**
- **DEC-1 (BLOCKER):** there is no structure decay, maintenance state or abandonment flag. There are no stages (intact, weathered, overgrown, collapsed, buried mound).
- **DEC-2 (MAJOR):** there is no item weathering (rot, rust, burial). The catalog's `weatherResistance` and `corrosionResistance` have no consumer.
- **DEC-3 (MAJOR, LIFE-001):** remains vanish, and organic mass does not return to soil. No soil-nutrient field exists.
- **DEC-4 (MAJOR):** there is no deep-history summary decay (SIM.40.08). The history ledger does not create physical sites.

### 4.3 Reproduction and lifecycle (SIM.40.10, V140) and the population budget (DEC-014, V139)

| Citation | Code | Finding |
|---|---|---|
| `DEUS_Ecology.js:684` | `const canBreed = count >= 2;` | Animal breeding: any herd of two or more, with no sex. |
| `DEUS_Ecology.js:689` | `if (!sp \|\| sp.kind === "monster") continue;` | Monsters never breed. |
| `DEUS_Ecology.js:695` | `at - herdRecord.lastBirth < 12) continue;` | A 12-game-hour spacing, no gestation, one young (line 714) spawned as a full unit. There is no food cost. |
| `DEUS_Colonists.js:2482` | `female.data.pregnancy = {` | Colonist conception creates a pregnancy record... |
| `DEUS_History.js:2386` | `progressPregnancies(1);` | ...but pregnancies only advance inside the legacy history loop (lines 2370-2426), which New Game does not reach. The live hook calls only `tickNeeds` and `scan` (`DEUS_Colonists.js:5754`). |
| `DEUS_Colonists.js:2806` | `u.data.age++;` | The only live-code age increment sits in `progressAging`, which is also called only from that loop (`DEUS_History.js:2383`). Nobody ages in live play. |
| `DEUS_HistoricalDemographics.js:128` | `human: Object.freeze({ lifespan: [60, 90], reproductiveAge: [18, 55], birthChance: 0.36, birthSpacingYears: 3,` | A per-species biology profile, for people species only... |
| `DEUS_History.js:391` | `D.step(demographics);` | ...run only at New Game over the history years. |
| `DEUS_Colonists.js:801` | `const skinTone = mGen && fGen ? (roll < 0.5 ? mGen.skinTone : fGen.skinTone)` | Appearance inheritance for people. There are no heritable traits for animals. |
| `DEUS_Colonists.js:1521` | `const FOOD_LB_PER_DAY = 1;` | Food is tracked in pounds per day, for the player's faction only (line 1637). Eating does not feed growth. |
| `DEUS_Colonists.js:2473` | `const canConceive = H && typeof H.canConceiveChild === "function" ? H.canConceiveChild(femaleH) : true;` | The household gate defaults to "yes" when `UF.Households` is absent. Households loads by `require()` like Fluid (section 2.1); its binding was not probed. |
| `DEUS_Colonists.js:2886` | `if (pop >= 200) continue;` | Population caps: 200 per faction; wildlife capped at each area's starting count (`DEUS_Ecology.js:226-227`). |

**Gaps**
- **REP-1 (MAJOR):** live pregnancy and aging are DORMANT (above). V123's aging and V140's growth do not run.
- **REP-2 (MAJOR, LIFE-001):** births create full units with no food mass. There is no mass-to-growth conversion and no remains-to-soil return.
- **REP-3 (MAJOR):** there is no animal age, sex, litter, gestation or lifespan. There is no species origin setting (`breeds`, `spawned`, `created`, `unique`, DEC-014 §5), and no search found such a field.
- **REP-4 (MAJOR):** there is no individual budget or crowd counts (DEC-014 §2-3). History converts every living person to a unit (`DEUS_History.js:481`). The fixed caps are the opposite of DEC-014 §1's "no arbitrary ceiling".
- **REP-5 (MINOR):** the elder age is 50 in `DEUS_Colonists.js:2807` but 55 in `DEUS_Colonists.js:3243`.

### 4.4 Faction Development Plans (DEC-015, V141, SOC.10.02-03)

| Citation | Code | Finding |
|---|---|---|
| `game/data/DEUS_WorldCatalog.json:8158` | `"plans": {` | The only plan data: fixed, ordered build-step lists (`forest`, `stone`, `workshop`) chosen per culture (lines 9369, 9417). |
| `DEUS_Projects.js:134` | `const DEFICITS = ["shelter", "food", "bed", "storage", "housing"];` | The live settlement brain scores five fixed needs... |
| `DEUS_Projects.js:66` | `severity: { shelter: 3, food: 2, foodCritical: 4, bed: 1.5, storage: 1, housing: 2.5 },` | ...with hardcoded weights... |
| `DEUS_Projects.js:169` | `const over = cat && cat.colony && cat.colony.projects ? cat.colony.projects : null;` | ...which data could override, but the catalog has no `colony.projects` key. |
| `DEUS_Colonists.js:427` | `const POP_MILESTONES = [` | Population milestones and standing orders are JS arrays. |
| `DEUS_Factions.js:18` | `Each pair of factions has a relation from -100 (at war) to +100 (allied).` | Factions handles relations and contact. It has no expansion, war or strategy logic. |
| `game/data/DEUS_WorldCatalog.json:7305` | `"people": {` | Nine people species exist in data; `cultures` (line 9306) lists seven. DEC-013 says the race-to-layer mapping is OPEN. |

**Gaps**
- **PLAN-1 (BLOCKER for SIM.50.08-09):** there is no plan schema and no `game/data/plans/` directory.
- **PLAN-2 (MAJOR):** there is no peace, threat or famine mode, no occupation targets (the only one is `DEUS_Callings.js`'s population-scaled spread), and no tech tree (grep `techTree|research|developmentPlan` has no hits).
- **PLAN-3 (MAJOR):** stages stop at town, and there are no expansion or collapse rules.
- **PLAN-4 (note):** SOC.10.03 needs nine race slots; the catalog has nine people species but seven cultures, so the slot list is itself an Owner question (DEC-013 open sub-question).

## 5. Invariant compliance matrix

Each cell gives the verdict and the gap ID that explains it. "n/a" means the invariant does not apply because the system does not exist.

| System | 32 layers (DEC-013) | Sparse storage | Budget and LOD (DEC-014, DEC-012) | Change-driven (V133) | LIFE-001 mass | LIFE-002 no ore | LIFE-003 traces |
|---|---|---|---|---|---|---|---|
| Water | fails (WAT-7) | save yes, memory no (WAT-7) | fails, freezes off view (WAT-8) | meets in the viewed area | partial (WAT-6, WAT-1) | n/a | n/a |
| Erosion | n/a (ABSENT) | n/a | n/a | n/a | n/a | n/a | n/a |
| Vegetation | fails (0, -1, -2 only) | meets (object diffs) | partial (current plus rotating area) | meets (bounded sampling) | not modelled | **fails (VEG-1)** | n/a |
| Fire | fails | meets | fails (all fires full fidelity) | meets, with a unit scan per beat (FIR-6) | fails (FIR-3) | n/a | partial (ash ground, level 0) |
| Seasons and weather | fails | n/a | n/a | meets (O(1) clock) | n/a | n/a | n/a |
| Migration | fails | individuals only | fails (MIG-4) | n/a (no wildlife tick) | n/a | n/a | n/a |
| Land reshaping | fails | meets (changed cells) | fails | partial (job list per update) | fails (LAND-1) | depends on VEG-1 | n/a |
| Settlements | fails | n/a | fails (REP-4) | partial (dirty set plus cycle) | n/a | n/a | fails (SET-2) |
| Geological events | n/a (ABSENT) | n/a | n/a | n/a | n/a | n/a | n/a |
| Support and collapse | n/a (ABSENT) | n/a | n/a | hook exists (4.1) | n/a | n/a | n/a |
| Decay | n/a (ABSENT) | n/a | n/a | n/a | fails (DEC-3) | n/a | fails (DEC-1) |
| Reproduction | fails | individuals only | fails (REP-4) | bounded hourly | fails (REP-2) | n/a | n/a |
| Faction plans | n/a (ABSENT) | n/a | n/a | n/a | n/a | n/a | n/a |

## 6. Cross-cutting gaps and a recommended order

These are recommendations to the Coordinator. Claude does not change WBS statuses (CANONICAL_ROLES). Each step names the WBS rows it touches.

1. **Stop the active invariant breaches.** These are small, local changes that need no new system:
   - Remove the ore, stone and gem sprouts (VEG-1: LIFE-002, V74, V83).
   - Fix the regrowth hour counter (VEG-6).
   - Register or bind `DEUS_Fluid` (WAT-1, D-4).
   - Stop "Dig" and wall quarrying from creating stone (LAND-1).

   The WBS has no leaf for these. They fit an OPS or SIM defect leaf, or a Lane with its own brief.
2. **Mass ledger first (WG.65.15).** Build a per-class conserved total (strata by material, loose items by material, fluid volume, biomass) with a test that fails on any leak. Hook it on `levels:strataChanged` (`DEUS_Levels.js:1558`) and the item and fluid writers. Every later system proves LIFE-001 against it. Today WG.65.15 sits in M3 after SIM.30.03; the audit suggests moving it before SIM.40 and SIM.50.
3. **WG.00.17 layers and sparse memory.** Make one Z-range authority (Appendix A lists every literal) and change the stratum to 2 ft (D-2). Store uniform columns compactly, allocate levels on demand, and bound 3D path search. Every system in sections 3-4 depends on it, not only the four rows that list it.
4. **ADR-003 / SIM.00.02-05 core tick with time domains and slow clocks.** One scheduler replaces the frame counters in Appendix B, with domain tags (INV-SIM-02) and hour, day, season and decade services (NAT-003). The seasons row cannot start before the Owner ruling D-1.
5. **Material and structure model.**
   - Add strata materials for rubble, loose fill, sediment, ash and ice (58 free ids).
   - Add porosity, load and span, and flammability properties.
   - Write constructions as constructed strata (LAND-5).

   This is the missing prerequisite of SIM.40.01; the WBS row does not list it.
6. **SIM.40.01-02 support and collapse,** then SIM.40.05-09 decay, then SIM.50.10 events.
7. **SIM.30.01-03 LOD regions,** before migration (SIM.50.07), crowd counts (DEC-014) and off-focus water (WAT-8).
8. **The nine systems** in the WBS order, with these dependencies added:

   | Row | Dependencies to add |
   |---|---|
   | SIM.50.05 fire | SIM.50.06 (wind, dryness) |
   | SIM.50.07 migration | SIM.50.06 (seasons), SIM.30.01 (regions) |
   | SIM.50.04 vegetation | WG.67 (soil, moisture), SIM.50.06 |
   | SIM.50.08 land reshaping | the ledger and step 5 |

## 7. Documentation and data that do not match the code

| Where | Says | Code at `75cf2ff3` |
|---|---|---|
| `docs/AUDIT_LOG.md:87` | `DEUS_Fluid.js` is **MISSING** | The file exists (1,028 lines) and is loaded by `require()`, possibly unbound (section 2.1). |
| `docs/RISK_REGISTER.md:60` | LIFE-001 `ARCHITECTURALLY_MITIGATED` | Mitigations are PLANNED; several code paths leak mass (F-04). The same holds for LIFE-002 (line 61, VEG-1), LIFE-003 (line 62) and NAT-003 (line 74). |
| `docs/INVARIANT_REGISTRY.md:53` | INV-SIM-03: finite resources "cannot be fabricated without material cost" | Violated by `DEUS_Interact.js:167`, `DEUS_Ecology.js:739` and the stone-wall quarry. |
| `docs/systems/UF_Roads.md:3` | Built, "not yet registered" | The plugin is archived; live code still calls `UF.Roads`. |
| `docs/systems/UF_Ecology.md:8` | A bucket and census director | The code is version 1 (`DEUS_Ecology.js:44`); the catalog's `ecology` v2 keys are unread. |
| `game/data/DEUS_ResourceRegistry.json:509` | A conservation rule | Never loaded by any file in `game/js`. |
| `DEUS_Items.js:7`, `DEUS_Walls.js:7` | "decay rates", "material durability" | No such code. |
| `DEUS_Wildlife.js:37` | "a throttled wander AI" | Removed (`DEUS_Wildlife.js:1197`). |
| `DEUS_Environment.js:31` | Snow when temperature is at or below 0 °C | No code produces snow. |
| `docs/VISION.md:113` | A beat is 60 updates and one game minute | A game minute is 10 updates (`DEUS_Core.js:61`). |
| `DEUS_Colonists.js:48` | Needs tick is "one game minute" | 60 updates is 6 game minutes. |
| `tasks/SIM.50.01/gap-audit/BRIEF.md` | Inspect `DEUS_Weather.js`, `DEUS_Time.js`, `DEUS_Flora.js`, `DEUS_Spawns.js`, `DEUS_Constructions.js`, `DEUS_Sites.js` | These files do not exist (section 2.1). |

## 8. Defects found in passing

These are not living-world features, but each one would corrupt a living-world system built on top of it.

| ID | Where | Defect |
|---|---|---|
| X-1 | `DEUS_Objects.js:162` with `DEUS_Core.js:324` | The game-hour counter jumps about 8,065 hours at each midnight; hour timers expire at the next midnight (VEG-6). |
| X-2 | `DEUS_Doors.js:450` with `DEUS_Fluid.js:949` | `doors:broken` payload mismatch; fluid wakes the wrong cell (WAT-10). |
| X-3 | `DEUS_Environment.js:182` | The temperature cache key has no area component (SEA-6). |
| X-4 | `DEUS_Minimap.js:301`, `DEUS_Test.js:560` | Calls `getFluid` and `addFluid`, which Fluid does not define; the performance benchmark injects no water. |
| X-5 | `DEUS_NaturalConnections.js:512` | Hooks `Scene_Map.update`, so it moves water flags and creatures while the game is paused. |
| X-6 | `DEUS_Core.js:508` | Dead branch: `UF.Time.update` never exists once TimeSpeed loads. |
| X-7 | `DEUS_HistoricalDemographics.js:319` | `isRuined` is never set true, so history abandonment never reaches the map. |
| X-8 | `DEUS_Colonists.js:2807`, `DEUS_Colonists.js:3243` | Elder age 50 against 55. |
| X-9 | `DEUS_Ecology.js:241`, `DEUS_Ecology.js:377-378` | A regrown sapling seems to lose its maturation timer (inferred, VEG-7). |
| X-10 | `DEUS_Floors.js:359` with `DEUS_Colonists.js:3889` | Road path jobs appear to be refused as an invalid floor kind (inferred). |

## 9. Decisions needed

| ID | Question | Why it blocks | Options (recommended first) |
|---|---|---|---|
| D-1 | Calendar scale for seasons. V123 makes 1 year = 1 day/night cycle = 240 s at ×1; V142 asks for winters, thaws and a crop calendar. | SIM.50.06 cannot define "winter" without it; migration and crops follow from it. | (a) Separate the solar day from the year: seasons run over many days. (b) Keep V123: each day is a year and the night is winter. (c) Slow the life clock and the calendar together. |
| D-2 | Stratum thickness. Code has 1 ft strata and 5 ft levels; DEC-013 has 2 ft strata and 10 ft layers. | WG.00.17 changes both the blast geometry (`DEUS_Levels.js:1791`) and `Z_STEP_FEET` (`DEUS_World.js:255`); every clearance count in feet doubles. | (a) Adopt DEC-013 in WG.00.17 and fix the feet conversions in the same change. (b) Keep 5 ft levels. |
| D-3 | Does "sparse" (DEC-013 §3) cover memory for regenerable baselines, or only saves? | It decides whether WG.00.17 must change the in-memory strata layout. | (a) Memory too: store uniform columns as runs. (b) Saves only: keep dense caches but cap resident levels. |
| D-4 | How `DEUS_Fluid` should load. | By the probe (section 2.1), the solver is not in the game until it binds to `window.UF`. | (a) Register it in `plugins.js`. This needs the RMMZ editor closed (AGENTS.md editor safety). (b) Change line 44 to bind `window.UF`. Either way, confirm in F5 with `window.UF.Fluid`. |
| D-5 | The "User specification 2026-09-19" comment over the ore sprouts (`DEUS_Ecology.js:732`). | If the Owner did order renewable ore, V74 needs a new row; if not, the code is removed. | (a) Remove it, keeping V74 and V83. (b) An Owner row that makes some outcrops renewable, with a source and a ledger entry. |
| D-6 | The race-to-plan-slot list for SOC.10.03: nine people species, seven cultures. | DEC-015 plan files are per race. | Owner assigns (the DEC-013 open sub-question). |

## 10. Method, evidence and limits

**How this was done.**
- **Read in full by the writer:** `DEUS_Fluid.js`, `DEUS_Ecology.js` (the simulation half), the strata storage, damage and derivation parts of `DEUS_Levels.js` (lines 985-1960 and 2085-2135), and the clock in `DEUS_Core.js`.
- **Delegated:** six read-only search passes covering storage and Z; water, seasons and weather; vegetation, fire and erosion; wildlife and reproduction; land use, settlements and decay; and per-frame hooks. Their citations were then checked line by line against the commit.
- **Mechanical checks:** every citation in this file is checked by the verifier. The one runtime claim (F-05) comes from a Node probe with a control run. VISION, OWNER_DECISIONS, the WBS rows, RISK_REGISTER and INVARIANT_REGISTRY were read for the requirements.

**Commands and results** (run 2026-09-26 in this worktree):

```text
node tasks/SIM.50.01/gap-audit/verify_citations.js                       -> see tasks/SIM.50.01/gap-audit/EVIDENCE.md
node tasks/SIM.50.01/gap-audit/verify_citations.js --selftest            -> see EVIDENCE.md (doctored rows must be caught)
node tasks/SIM.50.01/gap-audit/probe_fluid_require_binding.js            -> exit 0 (output in section 2.1)
node tasks/SIM.50.01/gap-audit/probe_fluid_require_binding.js --control  -> exit 1 (the probe can fail)
node tools/governance/check_wbs_integrity.js                              -> lane gate, see EVIDENCE.md
```

**Not checked:**
- Nothing was run in NW.js, the RMMZ editor or F5. There are no screenshots, because this is a document-only task and nothing visual was claimed.
- No performance was measured. The memory figures are arithmetic from allocation sizes.
- The branches `task/lane-k`, `task/lane-n` and `task/lane-m` were not audited. Lane N (in-place layer switch), Lane K (flat render) and Lane M (ADR-003) may change sections 2.2, 2.3, 2.5 and 6 when they merge.
- Whether `UF_Households`, `DEUS_DeathForensics`, `DEUS_Conditions` and the other `require()`-loaded companions bind to `window` was not probed.
- The inferred defects (VEG-7, X-9, X-10) were read, not run.

## Appendix A. Z-range literals (at `75cf2ff3`)

WG.00.17 must replace each of these with one configurable range.

| File | Lines | Kind |
|---|---|---|
| `DEUS_Levels.js` | 61, 62, 150, 998, 1096, 1137, 1141, 1232-1238, 1233, 1259, 1269, 1285, 1307, 1541, 1588, 1627, 1732, 1765, 1805, 1813, 1828, 1833, 1835, 1845, 1873, 2010, 2023, 2104, 2108, 2128, 2138, 2171, 2178, 2273, 2402, 3024, 3097, 3117, 3135, 3553, 4262, 4345, 4346, 4513, 5019, 5584 | level list, labels, `z + 2` slots, 5-slot caches, 0..24 elevations, range checks, fixed level indices, view stepping, tests |
| `DEUS_World.js` | 155, 156, 158, 255, 316, 509, 1132, 1489, 1957, 1958, 1984, 2151, 2159 | level list, map-id slots, feet per Z, occupancy key, 3D pathfinding size and range |
| `DEUS_Fluid.js` | 56, 57, 58, 187, 291 | range and pre-allocation |
| `DEUS_Minimap.js` | 59, 60, 413 | level list and clamp |
| `DEUS_Depth.js` | 164, 166, 175, 205 | depth limit 2, 6 ft level |
| `DEUS_WorldGen.js` | 638, 715, 770, 797, 1444, 1445 | depth band, range checks, generator level lists |
| `DEUS_Environment.js` | 182, 191, 195, 226, 227 | cache key `z + 2`, per-level temperatures |
| `DEUS_DayNight.js` | 64 | underground = -1 or -2 |
| `DEUS_Ecology.js` | 805 | sprout levels `[0, -1, -2]` |
| `DEUS_Wildlife.js` | 525, 526 | cave herds on -1 and -2 |
| `DEUS_History.js` | 4060 | `[-2, -1, 0, 1, 2]` |
| Validators with `z >= -2 && z <= 2` or `z < -2 \|\| z > 2` | `DEUS_Colonists.js:132`, `DEUS_Doors.js:39`, `DEUS_Fire.js:92`, `DEUS_Fire.js:255`, `DEUS_Floors.js:49`, `DEUS_Floors.js:227`, `DEUS_Items.js:69`, `DEUS_Jobs.js:85`, `DEUS_Objects.js:68`, `DEUS_Ownership.js:79`, `DEUS_Walls.js:172`, `UF_Households.js:58`, `DEUS_HistoricalDemographics.js:396` | per-plugin range checks |

## Appendix B. Per-frame and periodic hooks

One game minute is 10 map updates (`DEUS_Core.js:61`), so a game hour is 600 updates. At ×N, `updateMain` runs N times per frame (`DEUS_TimeSpeed.js:152`). Pause stops `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:211`) and so every `Game_Map.update` hook, but not `Scene_Map.update` hooks.

| Citation | Code | System | Cadence | Scope | Verdict |
|---|---|---|---|---|---|
| `DEUS_World.js:1684` | `for (const u of this.units()) {` | unit stepping | every update | every unit in the world | per-update scan |
| `DEUS_Environment.js:733` | `for (const id in stUnits) {` | unit thermal/wetness | every update, each unit acted on 1 in 60 | every unit in the world | per-update scan |
| `DEUS_Minimap.js:674` | `const units = (W && typeof W.units === "function") ? W.units()` | minimap overlay | every frame | every unit, filtered by z | per-frame scan |
| `DEUS_Jobs.js:1720` | `for (const job of st.list.slice()) {` | job stepping | every update | world job list | per-update list walk |
| `DEUS_Interact.js:804` | `for (const job of designations()) {` | designation markers | every frame | world job list | per-frame list walk |
| `DEUS_Colonists.js:319` | `colonistsCache = World() ? World().units().filter(isColonist) : [];` | colonist decisions | sweep every 30 updates; needs every 60 | every unit (cache key falls back to local ticks) | bounded periodic, world scan |
| `DEUS_Combat.js:1312` | `const allUnits = w.units();` | combat | every 36 updates (`DEUS_Combat.js:67`) | every unit | bounded periodic, world scan |
| `DEUS_Factions.js:641` | `const units = W.units();` | first contact | every 120 updates (`DEUS_Factions.js:632`) | every unit, until all are met | bounded periodic, world scan |
| `DEUS_Anim.js:1494` | `for (const id in units) {` | work strokes | every 30 updates | every unit | bounded periodic, world scan |
| `DEUS_Ownership.js:342` | `radius: W.state.size * 0.75, tags: [BED_TAG] })` | bed reconcile | every 600 updates | the whole area grid per area with people | bounded periodic, area scan |
| `DEUS_NaturalConnections.js:373` | `for (const u of world.units()) {` | passage creatures and fluid flags | every 30 frames, also while paused | all links, every unit | bounded periodic, world scan |
| `DEUS_Projects.js:1506` | `if (t >= nextRunAt) {` | settlement brain | dirty set every update; full cycle every 3000 (`DEUS_Projects.js:38`) | projects | change-driven plus periodic |
| `DEUS_Fire.js:531` | `const keys = Object.keys(f.burning);` | fire | every 60 updates | burning cells | change-driven |
| `DEUS_Fire.js:723` | `for (const u of W.units()) {` | fire damage | every 60 updates while any fire burns | every unit | bounded periodic, world scan |
| `DEUS_Fluid.js:1018` | `Fluid.tick();` | fluid | every update | dirty queue of the viewed area | change-driven |
| `DEUS_Ecology.js:994` | `if (sceneActive && window.UF && UF.World && UF.World.isWorldMap && UF.World.isWorldMap(this.mapId())) {` | sprout beat | every 60 updates | the sprout list, 40 per level | bounded periodic |
| `DEUS_Ecology.js:926` | `UF.Events.on("time:hour", () => {` | spread, breeding, respawn | every game hour; respawn every 6 | current plus one rotating area | bounded periodic |
| `DEUS_Objects.js:1041` | `UF.Events.on("time:hour", () => processRegrow());` | object regrowth | every game hour | the regrowth list | bounded periodic |
| `UF_Households.js:210` | `const people = w.units().filter(u => person(u) && !dead(u) && context(u))` | household reconcile | every game day | every unit | bounded periodic, world scan |
| `DEUS_Fog.js:640` | `if (++frame % UPDATE_FRAMES === 0) Fog.refresh();` | fog | every 20 updates | disabled (`DEUS_Fog.js:500`) | inert |
| `DEUS_Wildlife.js:1197` | `// AI update loop wiped per Objective 2` | wildlife AI | none | none | inert |
| `DEUS_Core.js:505` | `Scene_Map.prototype.update = function() {` | calendar | every `Scene_Map.update` | O(1) | bounded |

`World.unitsInArea` (`DEUS_World.js:1194`) is itself a linear scan of every unit. Any per-area query called per frame is therefore also a world scan.
