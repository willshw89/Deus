### C001 ADR:14 docs/OWNER_DECISIONS.md:161-168 OK
section: ADR-003: Sim/Render Split and Level-of-Detail (LOD) Simulation
claim: **Decision authority:** DEC-012 (Owner, 2026-09-26 00:00 CT, directive 0018-R), recorded in `docs/OWNER_DECISIONS.md:161-168`. This ADR is the detailed design that DEC-012 asks for. It does not reopen DEC-012, and it does not restate or change any other Owner decision; it cites them by id and heading.
   161  ### Decision `DEC-012`: Sim/render split and level-of-detail simulation are adopted architecture
   162  - **Date Logged:** 2026-09-26
   163  - **Status:** `DECIDED` (Owner order 2026-09-26 00:00 CT, directive 0018-R)
   164  - **Decider:** Owner
   165  - **Summary:**
   166  1. **Sim/render split:** The simulation becomes plain JavaScript modules with ZERO dependency on RPG Maker, PIXI, or the DOM. Headless node runs the entire simulation on its own fixed tick (10 Hz). RPG Maker is purely an
   167  2. **Level-of-Detail (LOD):** The active player/camera region simulates at full tick fidelity. Distant regions simulate as coarse aggregate summaries at reduced frequency (water volume, populations, biomass, temperature)
   168  3. **Roadmap:** Implemented in milestone M3 (SIM.00 and SIM.30 packages). Lane M writes the architectural decision record (ADR-003).

### C002 ADR:16 docs/worldgen/DEUS_WORLDGEN_WBS.md:519 OK
section: ADR-003: Sim/Render Split and Level-of-Detail (LOD) Simulation
claim: **WBS:** SIM.00.01, WBS Rev 24 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:519`). **This package contains no code.**
   519  | SIM.00.01 | **ADR-003 sim/render boundary and LOD simulation** (Lane M, docs only). Covers boundary, module layout, tick model, snapshot format, LOD region size and levels, summary state per system, promotion and demot

### C003 ADR:35 game/js/plugins/DEUS_Levels.js:985-986 OK
section: Rev 3 change log
claim: | 5 | Checklist 2 (scale): no foot measure; `CELL_FT = 5` and the 1 ft stratum comments not reconciled | Governing scale stated: 5 ft × 5 ft cell, 10 ft layer, 2 ft stratum. The engine's 1 ft assumptions (`DEUS_Levels.js:985-986`, `:1790-1791` and the sphere math) are listed with who changes them. The core measures in integer half-feet | @@CL5@@ |
   985  // Strata (DEUS-TSK-FABLE-19A): the one geometry authority. Every 5 ft cell of every level is five 1 ft strata,
   986  // S0 (bottom) .. S4 (top). A stratum is two bytes: its material (id in the low 6 bits, 0 = air; 0x80 = constructed)

### C004 ADR:35 game/js/plugins/DEUS_Levels.js:1790-1791 (bare, file from 0 line(s) back) OK
section: Rev 3 change log
claim: | 5 | Checklist 2 (scale): no foot measure; `CELL_FT = 5` and the 1 ft stratum comments not reconciled | Governing scale stated: 5 ft × 5 ft cell, 10 ft layer, 2 ft stratum. The engine's 1 ft assumptions (`DEUS_Levels.js:985-986`, `:1790-1791` and the sphere math) are listed with who changes them. The core measures in integer half-feet | @@CL5@@ |
  1790  *     a sphere around the middle of that stratum; a stratum takes damage x falloff(distance / radius) when its middle
  1791  *     is within the radius (a cell is 5 ft across, a stratum 1 ft high). It crosses levels the same way.

### C005 ADR:40 game/js/plugins/DEUS_Levels.js:1783-1794 OK
section: Rev 3 change log
claim: | 10 | Checklist 7.1: Rev 2 cited the doc-comment span of `applyVolumeDamage` for its call to `damageCell` | Cited at the JSDoc `DEUS_Levels.js:1783-1794`, the signature `DEUS_Levels.js:1795`, the box call `DEUS_Levels.js:1815` and the sphere call `DEUS_Levels.js:1849`; `damageCell` at `DEUS_Levels.js:1709-1725` | @@CL10@@ |
  1783  /**
  1784  * Damage a volume. Two forms:
  1785  *   applyVolumeDamage(area, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact"[, { source }]):
      ...
  1793  * skipped, destroyed: [{ x, y, z, stratum, material }], levels } or { ok: false, reason }.
  1794  */

### C006 ADR:40 game/js/plugins/DEUS_Levels.js:1795 OK
section: Rev 3 change log
claim: | 10 | Checklist 7.1: Rev 2 cited the doc-comment span of `applyVolumeDamage` for its call to `damageCell` | Cited at the JSDoc `DEUS_Levels.js:1783-1794`, the signature `DEUS_Levels.js:1795`, the box call `DEUS_Levels.js:1815` and the sphere call `DEUS_Levels.js:1849`; `damageCell` at `DEUS_Levels.js:1709-1725` | @@CL10@@ |
  1795  function applyVolumeDamage(a, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact", opts = {}) {

### C007 ADR:40 game/js/plugins/DEUS_Levels.js:1815 OK
section: Rev 3 change log
claim: | 10 | Checklist 7.1: Rev 2 cited the doc-comment span of `applyVolumeDamage` for its call to `damageCell` | Cited at the JSDoc `DEUS_Levels.js:1783-1794`, the signature `DEUS_Levels.js:1795`, the box call `DEUS_Levels.js:1815` and the sphere call `DEUS_Levels.js:1849`; `damageCell` at `DEUS_Levels.js:1709-1725` | @@CL10@@ |
  1815  addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);

### C008 ADR:40 game/js/plugins/DEUS_Levels.js:1849 OK
section: Rev 3 change log
claim: | 10 | Checklist 7.1: Rev 2 cited the doc-comment span of `applyVolumeDamage` for its call to `damageCell` | Cited at the JSDoc `DEUS_Levels.js:1783-1794`, the signature `DEUS_Levels.js:1795`, the box call `DEUS_Levels.js:1815` and the sphere call `DEUS_Levels.js:1849`; `damageCell` at `DEUS_Levels.js:1709-1725` | @@CL10@@ |
  1849  addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);

### C009 ADR:40 game/js/plugins/DEUS_Levels.js:1709-1725 OK
section: Rev 3 change log
claim: | 10 | Checklist 7.1: Rev 2 cited the doc-comment span of `applyVolumeDamage` for its call to `damageCell` | Cited at the JSDoc `DEUS_Levels.js:1783-1794`, the signature `DEUS_Levels.js:1795`, the box call `DEUS_Levels.js:1815` and the sphere call `DEUS_Levels.js:1849`; `damageCell` at `DEUS_Levels.js:1709-1725` | @@CL10@@ |
  1709  function damageCell(st, ax, ay, x, y, z, hits, damageType, source) {
  1710  const i = y * st.size + x, ref = { area: { x: ax, y: ay }, x, y, z };
  1711  const rec = currentRecord(st, z, ax, ay, i);
      ...
  1724  }
  1725  return results;

### C010 ADR:41 game/js/plugins/DEUS_Ecology.js:876 OK
section: Rev 3 change log
claim: | 11 | Checklist 7.2: Rev 2 cited the six-hour header for ecology stepping "each game hour" | Hourly plants and breeding (`DEUS_Ecology.js:876`, `DEUS_Ecology.js:888-905`) and the six-hourly population roll (`DEUS_Ecology.js:907-914`, header `DEUS_Ecology.js:22-27`) cited separately | @@CL11@@ |
   876  // Hourly driver: resources every hour, populations every six hours.

### C011 ADR:41 game/js/plugins/DEUS_Ecology.js:888-905 OK
section: Rev 3 change log
claim: | 11 | Checklist 7.2: Rev 2 cited the six-hour header for ecology stepping "each game hour" | Hourly plants and breeding (`DEUS_Ecology.js:876`, `DEUS_Ecology.js:888-905`) and the six-hourly population roll (`DEUS_Ecology.js:907-914`, header `DEUS_Ecology.js:22-27`) cited separately | @@CL11@@ |
   888  function tickHour(hour) {
   889  const O = Objects(), W = World(), st = state();
   890  const at = Number.isFinite(hour) ? hour : (O && O.hourNow ? O.hourNow() : 0);
      ...
   904  stepBreeding(a, at);
   905  }

### C012 ADR:41 game/js/plugins/DEUS_Ecology.js:907-914 OK
section: Rev 3 change log
claim: | 11 | Checklist 7.2: Rev 2 cited the six-hour header for ecology stepping "each game hour" | Hourly plants and breeding (`DEUS_Ecology.js:876`, `DEUS_Ecology.js:888-905`) and the six-hourly population roll (`DEUS_Ecology.js:907-914`, header `DEUS_Ecology.js:22-27`) cited separately | @@CL11@@ |
   907  if (at % POPULATION_INTERVAL === 0) {
   908  seen.clear();
   909  for (const a of [here, rotate]) {
   910  if (!a || seen.has(areaKey(a))) continue;
   911  seen.add(areaKey(a));
   912  result.areas.push(processArea(a, { hour: at }));
   913  }
   914  }

### C013 ADR:41 game/js/plugins/DEUS_Ecology.js:22-27 OK
section: Rev 3 change log
claim: | 11 | Checklist 7.2: Rev 2 cited the six-hour header for ecology stepping "each game hour" | Hourly plants and breeding (`DEUS_Ecology.js:876`, `DEUS_Ecology.js:888-905`) and the six-hourly population roll (`DEUS_Ecology.js:907-914`, header `DEUS_Ecology.js:22-27`) cited separately | @@CL11@@ |
    22  * Every six game hours, the current area and one rotating world area get a
    23  * deterministic population roll. Prey can recover toward the area's original
    24  * population. Monsters can replenish or first appear only in catalog-approved
    25  * biomes/regions. Both populations have hard area caps. Monster cells must be
    26  * free and remain outside the protected start, camps, active faction sites,
    27  * nearby people, and the player's view radius.

### C014 ADR:42 docs/worldgen/DEUS_WORLDGEN_WBS.md:519 @b612bc72 OK
section: Rev 3 change log
claim: | 12 | Minor: Rev 2 pointed at the WBS table header, not the SIM.00.01 row | Now `docs/worldgen/DEUS_WORLDGEN_WBS.md:519` at `b612bc72` | @@CL12@@ |
   519  | SIM.00.01 | **ADR-003 sim/render boundary and LOD simulation** (Lane M, docs only). Covers boundary, module layout, tick model, snapshot format, LOD region size and levels, summary state per system, promotion and demot

### C015 ADR:43 game/js/plugins/DEUS_Factions.js:632 OK
section: Rev 3 change log
claim: | 13 | Minor: Rev 2 cited the Factions contact interval with a span that included `CONTACT_CELLS` | Cited as `DEUS_Factions.js:632` (§1.2, §3.3) | @@CL13@@ |
   632  const CONTACT_EVERY = 120; // frames (2 s at x1)

### C016 ADR:46 game/js/plugins/DEUS_Factions.js:619-625 OK
section: Rev 3 change log
claim: | 16 | Not in the review: the Rev 3 re-check of all 476 Rev 2 citations found 6 FALSE and 22 IMPRECISE ones | Each is corrected, including a wrong claim about Factions counters (`DEUS_Factions.js:619-625`) | @@CL16@@ |
   619  UF.Events.on("world:unitRemoved", u => {
   620  if (u && u.data && u.data.faction && (u.data.dead || u.data._isDying) && !u.data._popDeducted) {
   621  u.data._popDeducted = true;
   622  const f = Factions.get(u.data.faction);
   623  if (f && f.population > 0) f.population--;
   624  }
   625  });

### C022 ADR:137 game/js/rmmz_scenes.js:819-831 OK
section: 1.1 How the simulation runs today
claim: - `Scene_Map.update` calls `updateMainMultiply` (`rmmz_scenes.js:819-831`, the call at `:824`). That runs `updateMain` once, or twice under RMMZ's fast-forward (`rmmz_scenes.js:833-839`). `updateMain` calls `$gameMap.update(this.isActive())` (`rmmz_scenes.js:841-846`).
   819  Scene_Map.prototype.update = function() {
   820  Scene_Message.prototype.update.call(this);
   821  this.updateDestination();
      ...
   830  this.updateWaitCount();
   831  };

### C023 ADR:137 game/js/rmmz_scenes.js:824 (bare, file from 0 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - `Scene_Map.update` calls `updateMainMultiply` (`rmmz_scenes.js:819-831`, the call at `:824`). That runs `updateMain` once, or twice under RMMZ's fast-forward (`rmmz_scenes.js:833-839`). `updateMain` calls `$gameMap.update(this.isActive())` (`rmmz_scenes.js:841-846`).
   824  this.updateMainMultiply();

### C024 ADR:137 game/js/rmmz_scenes.js:833-839 OK
section: 1.1 How the simulation runs today
claim: - `Scene_Map.update` calls `updateMainMultiply` (`rmmz_scenes.js:819-831`, the call at `:824`). That runs `updateMain` once, or twice under RMMZ's fast-forward (`rmmz_scenes.js:833-839`). `updateMain` calls `$gameMap.update(this.isActive())` (`rmmz_scenes.js:841-846`).
   833  Scene_Map.prototype.updateMainMultiply = function() {
   834  if (this.isFastForward()) {
   835  this.cancelMessageWait();
   836  this.updateMain();
   837  }
   838  this.updateMain();
   839  };

### C025 ADR:137 game/js/rmmz_scenes.js:841-846 OK
section: 1.1 How the simulation runs today
claim: - `Scene_Map.update` calls `updateMainMultiply` (`rmmz_scenes.js:819-831`, the call at `:824`). That runs `updateMain` once, or twice under RMMZ's fast-forward (`rmmz_scenes.js:833-839`). `updateMain` calls `$gameMap.update(this.isActive())` (`rmmz_scenes.js:841-846`).
   841  Scene_Map.prototype.updateMain = function() {
   842  $gameMap.update(this.isActive());
   843  $gamePlayer.update(this.isPlayerActive());
   844  $gameTimer.update(this.isActive());
   845  $gameScreen.update();
   846  };

### C072 ADR:183 game/js/plugins/DEUS_Factions.js:657 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Factions.js:657 | Game_Map.update | **sim**: `checkContact` | every 120 (`DEUS_Factions.js:632`) |
   657  Game_Map.prototype.update = function(sceneActive) {

### C073 ADR:183 game/js/plugins/DEUS_Factions.js:632 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Factions.js:657 | Game_Map.update | **sim**: `checkContact` | every 120 (`DEUS_Factions.js:632`) |
   632  const CONTACT_EVERY = 120; // frames (2 s at x1)

### C111 ADR:211 game/js/plugins/DEUS_World.js:888-911 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Every unit on view is a `Game_Event` with a `Sprite_Character` (`spawnUnitEvent`, `DEUS_World.js:888-911`).
   888  function spawnUnitEvent(u) {
   889  if (!window.$dataMap || !window.$gameMap) return null;
   890  const eid = EVENT_BASE + u.id;
      ...
   910  }
   911  return ev;

### C113 ADR:215 game/js/plugins/DEUS_World.js:127-128 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - *Correction to the PM survey:* by default `AreasX = AreasY = 1` (`DEUS_World.js:127-128`), and the `DEUS_World` parameters are `{}` (`plugins.js:58`). So there is exactly one area. `stepArea` works through that area's one queue, up to its budget per call (`DEUS_Fluid.js:356-376`), and the queue holds cells of all 5 levels (the level is decoded per cell, `DEUS_Fluid.js:380-383`). The view restriction only matters in multi-area worlds.
   127  areasX: num("AreasX", 1),
   128  areasY: num("AreasY", 1),

### C114 ADR:215 game/js/plugins.js:58 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - *Correction to the PM survey:* by default `AreasX = AreasY = 1` (`DEUS_World.js:127-128`), and the `DEUS_World` parameters are `{}` (`plugins.js:58`). So there is exactly one area. `stepArea` works through that area's one queue, up to its budget per call (`DEUS_Fluid.js:356-376`), and the queue holds cells of all 5 levels (the level is decoded per cell, `DEUS_Fluid.js:380-383`). The view restriction only matters in multi-area worlds.
    58  "parameters": {}

### C115 ADR:215 game/js/plugins/DEUS_Fluid.js:356-376 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - *Correction to the PM survey:* by default `AreasX = AreasY = 1` (`DEUS_World.js:127-128`), and the `DEUS_World` parameters are `{}` (`plugins.js:58`). So there is exactly one area. `stepArea` works through that area's one queue, up to its budget per call (`DEUS_Fluid.js:356-376`), and the queue holds cells of all 5 levels (the level is decoded per cell, `DEUS_Fluid.js:380-383`). The view restriction only matters in multi-area worlds.
   356  function stepArea(ax, ay, budget) {
   357  const data = getAreaData(ax, ay);
   358  const queue = data.queue;
      ...
   375  
   376  while (data.head < limit) {

### C116 ADR:215 game/js/plugins/DEUS_Fluid.js:380-383 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - *Correction to the PM survey:* by default `AreasX = AreasY = 1` (`DEUS_World.js:127-128`), and the `DEUS_World` parameters are `{}` (`plugins.js:58`). So there is exactly one area. `stepArea` works through that area's one queue, up to its budget per call (`DEUS_Fluid.js:356-376`), and the queue holds cells of all 5 levels (the level is decoded per cell, `DEUS_Fluid.js:380-383`). The view restriction only matters in multi-area worlds.
   380  
   381  decodeCellId(size, cellId);
   382  const x = coordX, y = coordY, z = coordZ;
   383  const gridZ = data.grids.get(z);

### C117 ADR:218 game/js/plugins/DEUS_Ecology.js:876 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Each game hour it spreads plants and steps breeding in the current area plus one rotating area (driver comment `DEUS_Ecology.js:876`; `tickHour`, `:888-905`; `cursorArea`, `:878-886`). Every sixth hour (`POPULATION_INTERVAL = 6`, `DEUS_Ecology.js:45`) the same two areas also get the population roll (`DEUS_Ecology.js:907-914`; header `:22-27`). The same 1×1 qualification applies.
   876  // Hourly driver: resources every hour, populations every six hours.

### C118 ADR:218 game/js/plugins/DEUS_Ecology.js:888-905 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Each game hour it spreads plants and steps breeding in the current area plus one rotating area (driver comment `DEUS_Ecology.js:876`; `tickHour`, `:888-905`; `cursorArea`, `:878-886`). Every sixth hour (`POPULATION_INTERVAL = 6`, `DEUS_Ecology.js:45`) the same two areas also get the population roll (`DEUS_Ecology.js:907-914`; header `:22-27`). The same 1×1 qualification applies.
   888  function tickHour(hour) {
   889  const O = Objects(), W = World(), st = state();
   890  const at = Number.isFinite(hour) ? hour : (O && O.hourNow ? O.hourNow() : 0);
      ...
   904  stepBreeding(a, at);
   905  }

### C119 ADR:218 game/js/plugins/DEUS_Ecology.js:878-886 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Each game hour it spreads plants and steps breeding in the current area plus one rotating area (driver comment `DEUS_Ecology.js:876`; `tickHour`, `:888-905`; `cursorArea`, `:878-886`). Every sixth hour (`POPULATION_INTERVAL = 6`, `DEUS_Ecology.js:45`) the same two areas also get the population roll (`DEUS_Ecology.js:907-914`; header `:22-27`). The same 1×1 qualification applies.
   878  function cursorArea() {
   879  const W = World(), st = state();
   880  if (!W || !W.state || !st) return null;
      ...
   885  return { x: i % W.state.areasX, y: Math.floor(i / W.state.areasX) };
   886  }

### C120 ADR:218 game/js/plugins/DEUS_Ecology.js:45 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Each game hour it spreads plants and steps breeding in the current area plus one rotating area (driver comment `DEUS_Ecology.js:876`; `tickHour`, `:888-905`; `cursorArea`, `:878-886`). Every sixth hour (`POPULATION_INTERVAL = 6`, `DEUS_Ecology.js:45`) the same two areas also get the population roll (`DEUS_Ecology.js:907-914`; header `:22-27`). The same 1×1 qualification applies.
    45  const POPULATION_INTERVAL = 6;

### C121 ADR:218 game/js/plugins/DEUS_Ecology.js:907-914 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Each game hour it spreads plants and steps breeding in the current area plus one rotating area (driver comment `DEUS_Ecology.js:876`; `tickHour`, `:888-905`; `cursorArea`, `:878-886`). Every sixth hour (`POPULATION_INTERVAL = 6`, `DEUS_Ecology.js:45`) the same two areas also get the population roll (`DEUS_Ecology.js:907-914`; header `:22-27`). The same 1×1 qualification applies.
   907  if (at % POPULATION_INTERVAL === 0) {
   908  seen.clear();
   909  for (const a of [here, rotate]) {
   910  if (!a || seen.has(areaKey(a))) continue;
   911  seen.add(areaKey(a));
   912  result.areas.push(processArea(a, { hour: at }));
   913  }
   914  }

### C122 ADR:218 game/js/plugins/DEUS_Ecology.js:22-27 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Each game hour it spreads plants and steps breeding in the current area plus one rotating area (driver comment `DEUS_Ecology.js:876`; `tickHour`, `:888-905`; `cursorArea`, `:878-886`). Every sixth hour (`POPULATION_INTERVAL = 6`, `DEUS_Ecology.js:45`) the same two areas also get the population roll (`DEUS_Ecology.js:907-914`; header `:22-27`). The same 1×1 qualification applies.
    22  * Every six game hours, the current area and one rotating world area get a
    23  * deterministic population roll. Prey can recover toward the area's original
    24  * population. Monsters can replenish or first appear only in catalog-approved
    25  * biomes/regions. Both populations have hard area caps. Monster cells must be
    26  * free and remain outside the protected start, camps, active faction sites,
    27  * nearby people, and the player's view radius.

### C158 ADR:249 game/js/plugins/DEUS_Factions.js:594-625 OK
section: 1.4 Conservation holes found
claim: - **Faction counters depend on unit events.** Faction population goes up on `factions:born` and `factions:immigrated`, and down on `combat:kill` and on `world:unitRemoved` for a unit that is dead or dying (`DEUS_Factions.js:594-625`; the dead-or-dying test is at `:620`). It is a running counter, not a count of units, so LOD absorption must keep it equal to the members it stands for (§7.4, §7.8).
   594  UF.Events.on("factions:born", child => {
   595  if (child && child.data && child.data.faction && !child.data._popCounted) {
   596  child.data._popCounted = true;
      ...
   624  }
   625  });

### C159 ADR:249 game/js/plugins/DEUS_Factions.js:620 (bare, file from 0 line(s) back) OK
section: 1.4 Conservation holes found
claim: - **Faction counters depend on unit events.** Faction population goes up on `factions:born` and `factions:immigrated`, and down on `combat:kill` and on `world:unitRemoved` for a unit that is dead or dying (`DEUS_Factions.js:594-625`; the dead-or-dying test is at `:620`). It is a running counter, not a count of units, so LOD absorption must keep it equal to the members it stands for (§7.4, §7.8).
   620  if (u && u.data && u.data.faction && (u.data.dead || u.data._isDying) && !u.data._popDeducted) {

### C173 ADR:267 game/js/plugins/DEUS_Fluid.js:50 OK
section: 1.5 What exists to build on
claim: - **Integer fluid.** Depth is 0..7 (`DEPTH_MAX`, `DEUS_Fluid.js:50`), packed with the type into one byte (`:127-137`) in one `Uint8Array` grid per level (`:179`, `:187-189`). A dirty-queue stepper runs against a work budget (`:55`, `:356-376`).
    50  const DEPTH_MAX = 7;

### C174 ADR:267 game/js/plugins/DEUS_Fluid.js:127-137 (bare, file from 0 line(s) back) OK
section: 1.5 What exists to build on
claim: - **Integer fluid.** Depth is 0..7 (`DEPTH_MAX`, `DEUS_Fluid.js:50`), packed with the type into one byte (`:127-137`) in one `Uint8Array` grid per level (`:179`, `:187-189`). A dirty-queue stepper runs against a work budget (`:55`, `:356-376`).
   127  function getDepth(byteVal) {
   128  return byteVal & 0x07;
   129  }
      ...
   136  return ((type & 0x0F) << 4) | (depth & 0x07);
   137  }

### C175 ADR:267 game/js/plugins/DEUS_Fluid.js:179 (bare, file from 0 line(s) back) OK
section: 1.5 What exists to build on
claim: - **Integer fluid.** Depth is 0..7 (`DEPTH_MAX`, `DEUS_Fluid.js:50`), packed with the type into one byte (`:127-137`) in one `Uint8Array` grid per level (`:179`, `:187-189`). A dirty-queue stepper runs against a work budget (`:55`, `:356-376`).
   179  grids: new Map(),       // z -> Uint8Array(n)

### C176 ADR:267 game/js/plugins/DEUS_Fluid.js:187-189 (bare, file from 0 line(s) back) OK
section: 1.5 What exists to build on
claim: - **Integer fluid.** Depth is 0..7 (`DEPTH_MAX`, `DEUS_Fluid.js:50`), packed with the type into one byte (`:127-137`) in one `Uint8Array` grid per level (`:179`, `:187-189`). A dirty-queue stepper runs against a work budget (`:55`, `:356-376`).
   187  for (let z = Z_MIN; z <= Z_MAX; z++) {
   188  data.grids.set(z, new Uint8Array(n));
   189  data.floodGrids.set(z, new Uint8Array(n));

### C177 ADR:267 game/js/plugins/DEUS_Fluid.js:55 (bare, file from 0 line(s) back) OK
section: 1.5 What exists to build on
claim: - **Integer fluid.** Depth is 0..7 (`DEPTH_MAX`, `DEUS_Fluid.js:50`), packed with the type into one byte (`:127-137`) in one `Uint8Array` grid per level (`:179`, `:187-189`). A dirty-queue stepper runs against a work budget (`:55`, `:356-376`).
    55  const DEFAULT_BUDGET = 512;

### C178 ADR:267 game/js/plugins/DEUS_Fluid.js:356-376 (bare, file from 0 line(s) back) OK
section: 1.5 What exists to build on
claim: - **Integer fluid.** Depth is 0..7 (`DEPTH_MAX`, `DEUS_Fluid.js:50`), packed with the type into one byte (`:127-137`) in one `Uint8Array` grid per level (`:179`, `:187-189`). A dirty-queue stepper runs against a work budget (`:55`, `:356-376`).
   356  function stepArea(ax, ay, budget) {
   357  const data = getAreaData(ax, ay);
   358  const queue = data.queue;
      ...
   375  
   376  while (data.head < limit) {

### C210 ADR:436 game/js/plugins/DEUS_Factions.js:632 OK
section: 3.3 Converting today's cadences
claim: | Faction contact | 120 | `DEUS_Factions.js:632` | 20 |
   632  const CONTACT_EVERY = 120; // frames (2 s at x1)

### C223 ADR:525 docs/OWNER_DECISIONS.md:267-278 OK
section: 3.9 Render interpolation and the movement model
claim: - **Height (DEC-019, `docs/OWNER_DECISIONS.md:267-278`).** A step also depends on the change of ground height, in strata:
   267  ### Decision `DEC-019`: In-Layer Height (Strata) Presentation & Movement Rules
   268  - **Date Logged:** 2026-09-26
   269  - **Status:** `DECIDED` (Owner ruling 01:17–01:19 CT, directive 0021-V Addendum §15)
      ...
   277  3. **3D Height Mechanics:** Falling damage, melee reach, and line-of-sight elevation advantage use real 3D vertical height differences.
   278  4. **Art Preparation:** Catalogue requires one top-surface tile per terrain plus auto-placed edge/cliff-face strips per height difference (1 to 5 strata) and height shading; NOT a full tile set per height. Catalogue plac

### C224 ADR:531 docs/OWNER_DECISIONS.md:282-289 OK
section: 3.9 Render interpolation and the movement model
claim: - **Ramps (DEC-020, `docs/OWNER_DECISIONS.md:282-289`).** A ramp is a run of cells rising one stratum per cell, so five ramp cells climb one layer.
   282  ### Decision `DEC-020`: Seamless Inter-Layer Ramps and Camera-Follow Behavior
   283  - **Date Logged:** 2026-09-26
   284  - **Status:** `DECIDED` (Owner ruling 01:21 CT, directive 0021-V Addendum §16)
   285  - **Decider:** Owner
   286  - **Summary:**
   287  1. **Seamless Transitions:** Ramps and slopes carry units continuously from one layer to the next. A ramp is a run of cells rising one stratum per cell (5 cells = one 10 ft layer). At the top stratum, the unit's Z become
   288  2. **Camera-Follow Default:** When the player unit crosses a ramp boundary between layers, the camera view automatically follows the player's current layer. Non-player units crossing simply transfer layer membership list
   289  3. **Pathfinding & Construction:** Multi-Z pathfinding treats ramps, stairs, and ladders as traversable layer connectors. Colonists can build ramps. Art catalogue adds ramp/slope pieces per terrain (placeholders only; DE

### C234 ADR:678 game/js/plugins/DEUS_World.js:155 OK
section: 5.1 The region grid
claim: | legacy: today's saves (`DEUS_World.js:155`) | −2..+2 | 5 | 3 | 192 |
   155  const LEVELS = Object.freeze([-2, -1, 0, 1, 2]);

### C235 ADR:683 docs/OWNER_DECISIONS.md:172-195 OK
section: 5.1 The region grid
claim: - **Bands.** DEC-013 as amended (`docs/OWNER_DECISIONS.md:172-195`) splits the 32 layers into five vertical biome bands. The ranges are PM defaults and stay OPEN for the Owner, as does the assignment of biomes and races to bands:
   172  ### Decision `DEC-013`: Thirty-Two Z Layers, Nine Races, Home Layer Ranges, Five Biome Bands, and Governing Scale
   173  - **Date Logged:** 2026-09-26 (Amended 01:10 CT per Owner Directive 0021-V Addendum §12–§13; supersedes 9-layer baseline)
   174  - **Status:** `DECIDED` (Owner ruling 00:34, 00:37, 01:06–01:10 CT)
      ...
   194  - **Race-to-Band/Layer-Range Mapping:** Which specific race occupies which home layer range. Status: `OPEN` (Owner assigns).
   195  - **Biome Assignment per Band:** Mapping of the 25 specific biomes into the 5 bands. Status: `OPEN` (Owner assigns).

### C238 ADR:805 game/js/plugins/DEUS_Ecology.js:214 OK
section: 6. Summary Simulation
claim: | **Wildlife and monsters** (anonymous) | unit records; herd membership lives on the unit (`u.data.herd`, `DEUS_Ecology.js:214`, `:672-678`) | **buckets** `count[species][ageBand][sex]` (`Uint16`) per region; herd records `{herdId, species, lastBirth, members per bucket}` keep today's fields (`:722`) | Ecology's rules applied to counts: its hourly breeding (`stepBreeding`, called from `tickHour`, `DEUS_Ecology.js:897-905`) and its six-hourly population roll with caps (`:907-914`); migration between adjacent L2 regions by a deterministic rule; every change goes through the ledger |
   214  for (const u of W.units()) if (u.data && u.data.kind === "creature") maxHerd = Math.max(maxHerd, u.data.herd | 0);

### C239 ADR:805 game/js/plugins/DEUS_Ecology.js:672-678 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Wildlife and monsters** (anonymous) | unit records; herd membership lives on the unit (`u.data.herd`, `DEUS_Ecology.js:214`, `:672-678`) | **buckets** `count[species][ageBand][sex]` (`Uint16`) per region; herd records `{herdId, species, lastBirth, members per bucket}` keep today's fields (`:722`) | Ecology's rules applied to counts: its hourly breeding (`stepBreeding`, called from `tickHour`, `DEUS_Ecology.js:897-905`) and its six-hourly population roll with caps (`:907-914`); migration between adjacent L2 regions by a deterministic rule; every change goes through the ledger |
   672  const units = W.unitsInArea(area.x, area.y).filter(u => u.data && u.data.kind === "creature");
   673  const herds = new Map();
   674  for (const u of units) {
   675  const hId = u.data.herd | 0;
   676  if (!herds.has(hId)) herds.set(hId, []);
   677  herds.get(hId).push(u);
   678  }

### C240 ADR:805 game/js/plugins/DEUS_Ecology.js:722 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Wildlife and monsters** (anonymous) | unit records; herd membership lives on the unit (`u.data.herd`, `DEUS_Ecology.js:214`, `:672-678`) | **buckets** `count[species][ageBand][sex]` (`Uint16`) per region; herd records `{herdId, species, lastBirth, members per bucket}` keep today's fields (`:722`) | Ecology's rules applied to counts: its hourly breeding (`stepBreeding`, called from `tickHour`, `DEUS_Ecology.js:897-905`) and its six-hourly population roll with caps (`:907-914`); migration between adjacent L2 regions by a deterministic rule; every change goes through the ledger |
   722  st.herds[hId] = Object.assign(st.herds[hId] || {}, { lastBirth: at, species: sp.id });

### C241 ADR:805 game/js/plugins/DEUS_Ecology.js:897-905 OK
section: 6. Summary Simulation
claim: | **Wildlife and monsters** (anonymous) | unit records; herd membership lives on the unit (`u.data.herd`, `DEUS_Ecology.js:214`, `:672-678`) | **buckets** `count[species][ageBand][sex]` (`Uint16`) per region; herd records `{herdId, species, lastBirth, members per bucket}` keep today's fields (`:722`) | Ecology's rules applied to counts: its hourly breeding (`stepBreeding`, called from `tickHour`, `DEUS_Ecology.js:897-905`) and its six-hourly population roll with caps (`:907-914`); migration between adjacent L2 regions by a deterministic rule; every change goes through the ledger |
   897  const here = W.currentArea();
   898  const rotate = cursorArea();
   899  const seen = new Set();
      ...
   904  stepBreeding(a, at);
   905  }

### C242 ADR:805 game/js/plugins/DEUS_Ecology.js:907-914 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Wildlife and monsters** (anonymous) | unit records; herd membership lives on the unit (`u.data.herd`, `DEUS_Ecology.js:214`, `:672-678`) | **buckets** `count[species][ageBand][sex]` (`Uint16`) per region; herd records `{herdId, species, lastBirth, members per bucket}` keep today's fields (`:722`) | Ecology's rules applied to counts: its hourly breeding (`stepBreeding`, called from `tickHour`, `DEUS_Ecology.js:897-905`) and its six-hourly population roll with caps (`:907-914`); migration between adjacent L2 regions by a deterministic rule; every change goes through the ledger |
   907  if (at % POPULATION_INTERVAL === 0) {
   908  seen.clear();
   909  for (const a of [here, rotate]) {
   910  if (!a || seen.has(areaKey(a))) continue;
   911  seen.add(areaKey(a));
   912  result.areas.push(processArea(a, { hour: at }));
   913  }
   914  }

### C246 ADR:807 game/js/plugins/DEUS_Fluid.js:127-137 OK
section: 6. Summary Simulation
claim: | **Fluids** | packed depth grid: one byte per cell (`DEUS_Fluid.js:127-137`), one `Uint8Array` per level (`DEUS_Fluid.js:179`, `:187-189`); a dirty queue *per region* | **the fine cells are kept but frozen.** A region's grid is at most 2 layers × 32 × 32 = 2,048 bytes at any layer count, and none at all for a chunk with no fluid (§15.3), so dropping it would save nothing. What L2 drops is per-tick stepping. A derived **basin index** sits on top: 4-connected *wet* cells of one fluid type per z (types never mix, `:457`), each basin with its volume, free capacity, drain faces to z−1, and faces t
   127  function getDepth(byteVal) {
   128  return byteVal & 0x07;
   129  }
      ...
   136  return ((type & 0x0F) << 4) | (depth & 0x07);
   137  }

### C247 ADR:807 game/js/plugins/DEUS_Fluid.js:179 OK
section: 6. Summary Simulation
claim: | **Fluids** | packed depth grid: one byte per cell (`DEUS_Fluid.js:127-137`), one `Uint8Array` per level (`DEUS_Fluid.js:179`, `:187-189`); a dirty queue *per region* | **the fine cells are kept but frozen.** A region's grid is at most 2 layers × 32 × 32 = 2,048 bytes at any layer count, and none at all for a chunk with no fluid (§15.3), so dropping it would save nothing. What L2 drops is per-tick stepping. A derived **basin index** sits on top: 4-connected *wet* cells of one fluid type per z (types never mix, `:457`), each basin with its volume, free capacity, drain faces to z−1, and faces t
   179  grids: new Map(),       // z -> Uint8Array(n)

### C248 ADR:807 game/js/plugins/DEUS_Fluid.js:187-189 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Fluids** | packed depth grid: one byte per cell (`DEUS_Fluid.js:127-137`), one `Uint8Array` per level (`DEUS_Fluid.js:179`, `:187-189`); a dirty queue *per region* | **the fine cells are kept but frozen.** A region's grid is at most 2 layers × 32 × 32 = 2,048 bytes at any layer count, and none at all for a chunk with no fluid (§15.3), so dropping it would save nothing. What L2 drops is per-tick stepping. A derived **basin index** sits on top: 4-connected *wet* cells of one fluid type per z (types never mix, `:457`), each basin with its volume, free capacity, drain faces to z−1, and faces t
   187  for (let z = Z_MIN; z <= Z_MAX; z++) {
   188  data.grids.set(z, new Uint8Array(n));
   189  data.floodGrids.set(z, new Uint8Array(n));

### C249 ADR:807 game/js/plugins/DEUS_Fluid.js:457 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Fluids** | packed depth grid: one byte per cell (`DEUS_Fluid.js:127-137`), one `Uint8Array` per level (`DEUS_Fluid.js:179`, `:187-189`); a dirty queue *per region* | **the fine cells are kept but frozen.** A region's grid is at most 2 layers × 32 × 32 = 2,048 bytes at any layer count, and none at all for a chunk with no fluid (§15.3), so dropping it would save nothing. What L2 drops is per-tick stepping. A derived **basin index** sits on top: 4-connected *wet* cells of one fluid type per z (types never mix, `:457`), each basin with its volume, free capacity, drain faces to z−1, and faces t
   457  // Liquid types must match or neighbor must be dry (no mixing in V1)

### C252 ADR:809 game/js/plugins/DEUS_World.js:599-689 OK
section: 6. Summary Simulation
claim: | **Geology and terrain** | strata and shapes (Levels) from seed + diffs | **none**: resident in chunk storage at every level (§15.3). A new game or a load builds it from seed + diffs, as today's builds do (`World.buildArea`, `DEUS_World.js:599-689`: generators at `:650`, diffs replayed at `:682-685`; cache `:811-822`) | changes only through mutation: mining, building, collapse (§16), decay (§17) |
   599  World.buildArea = function(ax, ay, z = 0) {
   600  const st = this.state;
   601  if (!st || !this.inWorld(ax, ay, z)) return null;
      ...
   688  return map;
   689  };

### C253 ADR:809 game/js/plugins/DEUS_World.js:650 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Geology and terrain** | strata and shapes (Levels) from seed + diffs | **none**: resident in chunk storage at every level (§15.3). A new game or a load builds it from seed + diffs, as today's builds do (`World.buildArea`, `DEUS_World.js:599-689`: generators at `:650`, diffs replayed at `:682-685`; cache `:811-822`) | changes only through mutation: mining, building, collapse (§16), decay (§17) |
   650  for (const g of generators) if (g.levels.includes(z)) g.fn(ctx);

### C254 ADR:809 game/js/plugins/DEUS_World.js:682-685 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Geology and terrain** | strata and shapes (Levels) from seed + diffs | **none**: resident in chunk storage at every level (§15.3). A new game or a load builds it from seed + diffs, as today's builds do (`World.buildArea`, `DEUS_World.js:599-689`: generators at `:650`, diffs replayed at `:682-685`; cache `:811-822`) | changes only through mutation: mining, building, collapse (§16), decay (§17) |
   682  const diff = st.diffs[levelKey(ax, ay, z)];
   683  if (diff) for (const i in diff) data[Number(i)] = diff[i];
   684  const odiff = st.objectDiffs && st.objectDiffs[levelKey(ax, ay, z)];
   685  if (odiff) for (const i in odiff) objects[Number(i)] = odiff[i];

### C255 ADR:809 game/js/plugins/DEUS_World.js:811-822 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Geology and terrain** | strata and shapes (Levels) from seed + diffs | **none**: resident in chunk storage at every level (§15.3). A new game or a load builds it from seed + diffs, as today's builds do (`World.buildArea`, `DEUS_World.js:599-689`: generators at `:650`, diffs replayed at `:682-685`; cache `:811-822`) | changes only through mutation: mining, building, collapse (§16), decay (§17) |
   811  World.peekArea = function(ax, ay, z = 0) {
   812  if (!this.state || !this.inWorld(ax, ay, z)) return null;
   813  const key = cacheKey(ax, ay, z);
      ...
   821  return map;
   822  };

### C273 ADR:877 game/js/plugins/DEUS_Factions.js:619-625 OK
section: 7.4 Demotion (L1 → L2)
claim: - Absorption **does not emit `world:unitRemoved`**. To legacy listeners that event means the unit has left the world, and Factions lowers its population for a removed unit that is dead or dying (`DEUS_Factions.js:619-625`). An absorbed unit is still in the world, as a bucket member counted in Q-FACTPOP (§7.8). The feed carries `UNIT_REMOVED` with cause `LOD_ABSORB` instead, and the legacy translation (§4.3) maps it to no legacy event.
   619  UF.Events.on("world:unitRemoved", u => {
   620  if (u && u.data && u.data.faction && (u.data.dead || u.data._isDying) && !u.data._popDeducted) {
   621  u.data._popDeducted = true;
   622  const f = Factions.get(u.data.faction);
   623  if (f && f.population > 0) f.population--;
   624  }
   625  });

### C278 ADR:925 game/js/plugins/DEUS_Fluid.js:9-18 OK
section: 7.8 Conserved quantities
claim: | Q-WATER | water volume | depth unit (1/7 of a full cell, `DEUS_Fluid.js:9-18`; `DEPTH_MAX = 7`, `:50`). Under DEC-013 a full cell is 5 × 5 × 10 ft, so one unit is 250/7 ft³; the integer unit does not change (§15.0) | low 3 bits of a `Uint8` per cell at every level (L2 keeps the cells, frozen), plus the `Uint32` reservoir and inflow buffers per region |
     9  * @help
    10  * DEUS_Fluid.js - 0..7 Volumetric Fluid Simulation
    11  *
      ...
    17  *    - 5-6: Deep (impassable without swimming)
    18  *    - 7: Submerged / Full (impassable without swimming)

### C279 ADR:925 game/js/plugins/DEUS_Fluid.js:50 (bare, file from 0 line(s) back) OK
section: 7.8 Conserved quantities
claim: | Q-WATER | water volume | depth unit (1/7 of a full cell, `DEUS_Fluid.js:9-18`; `DEPTH_MAX = 7`, `:50`). Under DEC-013 a full cell is 5 × 5 × 10 ft, so one unit is 250/7 ft³; the integer unit does not change (§15.0) | low 3 bits of a `Uint8` per cell at every level (L2 keeps the cells, frozen), plus the `Uint32` reservoir and inflow buffers per region |
    50  const DEPTH_MAX = 7;

### C282 ADR:935 game/js/plugins/DEUS_Colonists.js:5389 OK
section: 7.8 Conserved quantities
claim: | Q-FOOD, Q-DRINK | nourishment held by units | milli-units | today `foodLb` / `waterGal` are floats rounded to 0.001 (`DEUS_Colonists.js:5389`, `:5410-5411`); the needs sub-lane converts them to integer milli-units |
  5389  u.data.needs.waterGal = Math.round(((u.data.needs.waterGal || 0) + WATER_GAL_PER_DAY) * 1000) / 1000; // one drink is a gallon

### C283 ADR:935 game/js/plugins/DEUS_Colonists.js:5410-5411 (bare, file from 0 line(s) back) OK
section: 7.8 Conserved quantities
claim: | Q-FOOD, Q-DRINK | nourishment held by units | milli-units | today `foodLb` / `waterGal` are floats rounded to 0.001 (`DEUS_Colonists.js:5389`, `:5410-5411`); the needs sub-lane converts them to integer milli-units |
  5410  u.data.needs.foodLb = Math.round(((u.data.needs.foodLb || 0) + (lb > 0 ? lb : 0.2)) * 1000) / 1000;
  5411  if (gal > 0) u.data.needs.waterGal = Math.round(((u.data.needs.waterGal || 0) + gal) * 1000) / 1000;

### C284 ADR:948 docs/OWNER_DECISIONS.md:262 OK
section: 7.8 Conserved quantities
claim: - **Conjured matter** (*create water*, *wall of stone*) is DEC-018's open sub-question (`docs/OWNER_DECISIONS.md:262`). The ledger supports the PM default as it stands: a magical source or sink with its own cause, like rain. If the Owner rules otherwise, only the cause table changes (§18.6).
   262  - **Open Sub-Question (PM default):** Conjured matter (*create water*, *wall of stone*) versus LIFE-001 mass conservation. The default is that conjured matter is an explicitly modelled magical source/sink, logged in the 

### C293 ADR:1008 docs/worldgen/DEUS_WORLDGEN_WBS.md:105 OK
section: 8. Migration Increments
claim: | **Z** | WG.00.17 (WBS Rev 24, `docs/worldgen/DEUS_WORLDGEN_WBS.md:105`) | Z range as one setting, then 32 layers (−16..+15) with sparse storage and a 9-layer test mode, as the row says. It lands on the legacy plugins after Lanes K and N. The core reads the range and the band table from world state from Increment 1 on (§15.2), so it needs no change of its own | WG.00.17's DoD; every core fixture runs at −4..+4 and at −16..+15, and the save-migration fixtures at −2..+2 (§15.2); the §9 storage rows at 9 and at 32 layers | WG.00.17's own |
   105  | **WG.00.17** | Z-Range Configurable Setting & Expansion to 32 Layers | Claude | Make Z-range a single configurable setting in engine core, then expand to 32 layers (-16..+15: surface 0, 16 underground -1..-16, 15 upper

### C294 ADR:1009 docs/worldgen/DEUS_WORLDGEN_WBS.md:533-536 OK
section: 8. Migration Increments
claim: | **S1** | SIM.40.01–.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:533-536`) | Support model and blast propagation (SIM.40.01 names both), collapse, colonist behaviour, collapse QA (§16, §18), in the core. Depends on SIM.00.05/terrain and WG.00.17 | §16.6, §18.8 | revert; support stays passive (no collapse) and volume damage stays today's (no attenuation), as today |
   533  | SIM.40.01 | **Support model design & blast propagation** (materials, vertical propagation, span limits, cross-layer blast attenuation, V128 natural rock, V133 change-driven). Load-bearing rules, span capacities, and ve
   534  | SIM.40.02 | **Collapse event simulation** (downward cascading, rubble/talus mass conservation LIFE-001, V95 impact damage, deep-history DEC-012) | PLANNED | Directive 0021-V §6; V137; LIFE-001; V95 | dep: SIM.40.01 | C
   535  | SIM.40.03 | **Colonist structural behaviour** (props, pillars, avoid dangerous excavation) | PLANNED | Directive 0021-V §6; V137 | dep: SIM.40.02 | Claude → Grok | Colonist builders and miners respect structural suppor
   536  | SIM.40.04 | **Collapse QA & fixtures** (deterministic cave-in, tall tower +1..+4, mass conservation, perf bound) | PLANNED | Directive 0021-V §6; V137 | dep: SIM.40.02 | Claude → Grok (mutation) | Automated test suite:

### C295 ADR:1010 docs/worldgen/DEUS_WORLDGEN_WBS.md:537-541 OK
section: 8. Migration Increments
claim: | **S2** | SIM.40.05–.09 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:537-541`) | Decay, reclamation, item weathering, deep-history decay, decay QA (§17), in the core. SIM.40.08 depends on SIM.30.02 | §17.6 | revert; nothing decays, as today |
   537  | SIM.40.05 | **Decay model** (unmaintained structure HP loss by material/exposure, roofs fail first, walls fail, feeds collapse) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | SIM.40.01, dep: SIM.00.01 | Claude → Gro
   538  | SIM.40.06 | **Nature reclaiming** (vegetation invasion, soil/sediment burial, visible stages: intact -> weathered -> overgrown -> collapsed -> buried mound) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | dep: SIM.40
   539  | SIM.40.07 | **Item weathering & burial** (rot, rust, sediment burial, durable relics, LIFE-001 mass conservation, LIFE-002 no ore creation) | PLANNED | Directive 0021-V §7; V138; LIFE-001; LIFE-002 | dep: SIM.40.05 | C
   540  | SIM.40.08 | **Deep-history decay integration** (summary-level decay for fast-forward, LIFE-003 trace retention) | PLANNED | Directive 0021-V §7; V138; DEC-012; LIFE-003 | SIM.40.05, dep: SIM.30.02 | Claude → Grok | Dee
   541  | SIM.40.09 | **Decay QA & fixtures** (deterministic aging fixture, mass conservation, no ore creation, perf bound) | PLANNED | Directive 0021-V §7; V138 | SIM.40.06, SIM.40.07, dep: SIM.40.08 | Claude → Grok (mutation) 

### C296 ADR:1011 docs/worldgen/DEUS_WORLDGEN_WBS.md:559-561 OK
section: 8. Migration Increments
claim: | **E** | SIM.60.02–.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:559-561`) | The spell-effect schema (data), the runtime in the core that turns an effect into the §18.6 primitives, and the QA fixtures. SIM.60.03's dependencies are in its row (SIM.00.03, SIM.40.01–.02, fire, water, seasons, GP.07.02) | §18.8 and SIM.60.04's fixtures | revert; spells keep their SRD numbers and have no physical effect, as today |
   559  | SIM.60.02 | **Spell-effect schema** (data-driven JSON Schema of reusable primitives: ignite, heat flux, impulse/blast via SIM.40.01, fluid source/sink, temperature/freeze, mass-conserving terrain edit, light, growth/de
   560  | SIM.60.03 | **Spell-effect runtime in headless sim core** (physical propagation of heat, impulse, fluids, freezing, terrain alteration decoupled from presentation frames) | PLANNED | Directive 0028-AC §5; DEC-018 | SIM
   561  | SIM.60.04 | **Spell-effect QA fixtures** (fireball floor breach, flood down stairwell, lake freeze, stone wall vs mass ledger, SRD stat invariance) | PLANNED | Directive 0028-AC §5; DEC-018 | dep: SIM.60.03 | Claude → 

### C297 ADR:1012 docs/worldgen/DEUS_WORLDGEN_WBS.md:577 OK
section: 8. Migration Increments
claim: | **T** | GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:577`) | Cross-layer targeting in the core: line of sight, 3D range and height modifiers (§18.5). The target picker is on the host side (§19) | §18.8 | revert |
   577  | GP.07.02 | **Cross-layer 3D targeting, ballistics & volume damage** (spells, arrows, thrown items through multi-Z openings, true 3D Euclidean range, vertical impact bonus / upward range penalty, cross-layer volume blas

### C298 ADR:1013 docs/worldgen/DEUS_WORLDGEN_WBS.md:107-109 OK
section: 8. Migration Increments
claim: | **P** | WG.00.19–.21 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:107-109`) | Stratum height, ramps and occlusion. The movement rules are core (§3.9); the draw offset, camera follow and occlusion are host (§19) | their own; the §19 boundary tests | their own |
   107  | **WG.00.19** | In-Layer Height Presentation & Multi-Strata Movement | Claude / Grok | Characters/objects drawn raised by fixed pixel offset per stratum of ground height (straight shift, no scale; DEC-011/DEC-016 compli
   108  | **WG.00.20** | Seamless Inter-Layer Ramps & Camera-Follow Connector | Claude / Grok | Run of cells rising one stratum per cell (5 cells = one 10 ft layer); unit's Z becomes Z+1 at top stratum with zero transfer/fade/pa
   109  | **WG.00.21** | Layer Occlusion Culling Rule & Exposed-Area Bound | Claude / Grok | Anything covered by opaque upper layer is not drawn (tiles, units, effects). Draw cost bounded by exposed visible screen area (V133). T

### C299 ADR:1014 docs/worldgen/DEUS_WORLDGEN_WBS.md:112 OK
section: 8. Migration Increments
claim: | **R** | WG.00.24 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:112`) | The DEC-017 fallback map renderer, opened only after the Owner's go/no-go (§13) | §13.4 | the host goes back to the stock `Spriteset_Map` |
   112  | **WG.00.24** | Custom Multi-Layer PixiJS Map Renderer (Fallback) | Owner / Claude | Benchmark-gated fallback map renderer inside RMMZ Scene_Map. Replaces stock Spriteset_Map/Tilemap if stock renderer cannot meet 32 lay

