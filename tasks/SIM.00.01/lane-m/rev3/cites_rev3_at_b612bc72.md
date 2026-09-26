# ADR-003 citation dump

ADR: docs/adr/ADR-003_sim_render_split_and_lod.md
Code/doc rev: b612bc7217349bce695e15395bd041f63673b89b
Citations: 646; NO_FILE: 0; OUT_OF_RANGE: 0

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
claim: | 5 | Checklist 2 (scale): no foot measure; `CELL_FT = 5` and the 1 ft stratum comments not reconciled | Governing scale stated: 5 ft × 5 ft cell, 10 ft layer, 2 ft stratum. The engine's 1 ft assumptions (`DEUS_Levels.js:985-986`, `:1790-1791` and the sphere math) are listed with who changes them. The core measures in integer half-feet | §15.0 (L1432-L1453); §0 item 8 (L79) |
   985  // Strata (DEUS-TSK-FABLE-19A): the one geometry authority. Every 5 ft cell of every level is five 1 ft strata,
   986  // S0 (bottom) .. S4 (top). A stratum is two bytes: its material (id in the low 6 bits, 0 = air; 0x80 = constructed)

### C004 ADR:35 game/js/plugins/DEUS_Levels.js:1790-1791 (bare, file from 0 line(s) back) OK
section: Rev 3 change log
claim: | 5 | Checklist 2 (scale): no foot measure; `CELL_FT = 5` and the 1 ft stratum comments not reconciled | Governing scale stated: 5 ft × 5 ft cell, 10 ft layer, 2 ft stratum. The engine's 1 ft assumptions (`DEUS_Levels.js:985-986`, `:1790-1791` and the sphere math) are listed with who changes them. The core measures in integer half-feet | §15.0 (L1432-L1453); §0 item 8 (L79) |
  1790  *     a sphere around the middle of that stratum; a stratum takes damage x falloff(distance / radius) when its middle
  1791  *     is within the radius (a cell is 5 ft across, a stratum 1 ft high). It crosses levels the same way.

### C005 ADR:40 game/js/plugins/DEUS_Levels.js:1783-1794 OK
section: Rev 3 change log
claim: | 10 | Checklist 7.1: Rev 2 cited the doc-comment span of `applyVolumeDamage` for its call to `damageCell` | Cited at the JSDoc `DEUS_Levels.js:1783-1794`, the signature `DEUS_Levels.js:1795`, the box call `DEUS_Levels.js:1815` and the sphere call `DEUS_Levels.js:1849`; `damageCell` at `DEUS_Levels.js:1709-1725` | §16.1 (L1557-L1569); §18.1 (L1721-L1747) |
  1783  /**
  1784  * Damage a volume. Two forms:
  1785  *   applyVolumeDamage(area, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact"[, { source }]):
      ...
  1793  * skipped, destroyed: [{ x, y, z, stratum, material }], levels } or { ok: false, reason }.
  1794  */

### C006 ADR:40 game/js/plugins/DEUS_Levels.js:1795 OK
section: Rev 3 change log
claim: | 10 | Checklist 7.1: Rev 2 cited the doc-comment span of `applyVolumeDamage` for its call to `damageCell` | Cited at the JSDoc `DEUS_Levels.js:1783-1794`, the signature `DEUS_Levels.js:1795`, the box call `DEUS_Levels.js:1815` and the sphere call `DEUS_Levels.js:1849`; `damageCell` at `DEUS_Levels.js:1709-1725` | §16.1 (L1557-L1569); §18.1 (L1721-L1747) |
  1795  function applyVolumeDamage(a, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact", opts = {}) {

### C007 ADR:40 game/js/plugins/DEUS_Levels.js:1815 OK
section: Rev 3 change log
claim: | 10 | Checklist 7.1: Rev 2 cited the doc-comment span of `applyVolumeDamage` for its call to `damageCell` | Cited at the JSDoc `DEUS_Levels.js:1783-1794`, the signature `DEUS_Levels.js:1795`, the box call `DEUS_Levels.js:1815` and the sphere call `DEUS_Levels.js:1849`; `damageCell` at `DEUS_Levels.js:1709-1725` | §16.1 (L1557-L1569); §18.1 (L1721-L1747) |
  1815  addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);

### C008 ADR:40 game/js/plugins/DEUS_Levels.js:1849 OK
section: Rev 3 change log
claim: | 10 | Checklist 7.1: Rev 2 cited the doc-comment span of `applyVolumeDamage` for its call to `damageCell` | Cited at the JSDoc `DEUS_Levels.js:1783-1794`, the signature `DEUS_Levels.js:1795`, the box call `DEUS_Levels.js:1815` and the sphere call `DEUS_Levels.js:1849`; `damageCell` at `DEUS_Levels.js:1709-1725` | §16.1 (L1557-L1569); §18.1 (L1721-L1747) |
  1849  addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);

### C009 ADR:40 game/js/plugins/DEUS_Levels.js:1709-1725 OK
section: Rev 3 change log
claim: | 10 | Checklist 7.1: Rev 2 cited the doc-comment span of `applyVolumeDamage` for its call to `damageCell` | Cited at the JSDoc `DEUS_Levels.js:1783-1794`, the signature `DEUS_Levels.js:1795`, the box call `DEUS_Levels.js:1815` and the sphere call `DEUS_Levels.js:1849`; `damageCell` at `DEUS_Levels.js:1709-1725` | §16.1 (L1557-L1569); §18.1 (L1721-L1747) |
  1709  function damageCell(st, ax, ay, x, y, z, hits, damageType, source) {
  1710  const i = y * st.size + x, ref = { area: { x: ax, y: ay }, x, y, z };
  1711  const rec = currentRecord(st, z, ax, ay, i);
      ...
  1724  }
  1725  return results;

### C010 ADR:41 game/js/plugins/DEUS_Ecology.js:876 OK
section: Rev 3 change log
claim: | 11 | Checklist 7.2: Rev 2 cited the six-hour header for ecology stepping "each game hour" | Hourly plants and breeding (`DEUS_Ecology.js:876`, `DEUS_Ecology.js:888-905`) and the six-hourly population roll (`DEUS_Ecology.js:907-914`, header `DEUS_Ecology.js:22-27`) cited separately | §1.3 (L218); §6 (L805); Appendix A.8 (L1889) |
   876  // Hourly driver: resources every hour, populations every six hours.

### C011 ADR:41 game/js/plugins/DEUS_Ecology.js:888-905 OK
section: Rev 3 change log
claim: | 11 | Checklist 7.2: Rev 2 cited the six-hour header for ecology stepping "each game hour" | Hourly plants and breeding (`DEUS_Ecology.js:876`, `DEUS_Ecology.js:888-905`) and the six-hourly population roll (`DEUS_Ecology.js:907-914`, header `DEUS_Ecology.js:22-27`) cited separately | §1.3 (L218); §6 (L805); Appendix A.8 (L1889) |
   888  function tickHour(hour) {
   889  const O = Objects(), W = World(), st = state();
   890  const at = Number.isFinite(hour) ? hour : (O && O.hourNow ? O.hourNow() : 0);
      ...
   904  stepBreeding(a, at);
   905  }

### C012 ADR:41 game/js/plugins/DEUS_Ecology.js:907-914 OK
section: Rev 3 change log
claim: | 11 | Checklist 7.2: Rev 2 cited the six-hour header for ecology stepping "each game hour" | Hourly plants and breeding (`DEUS_Ecology.js:876`, `DEUS_Ecology.js:888-905`) and the six-hourly population roll (`DEUS_Ecology.js:907-914`, header `DEUS_Ecology.js:22-27`) cited separately | §1.3 (L218); §6 (L805); Appendix A.8 (L1889) |
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
claim: | 11 | Checklist 7.2: Rev 2 cited the six-hour header for ecology stepping "each game hour" | Hourly plants and breeding (`DEUS_Ecology.js:876`, `DEUS_Ecology.js:888-905`) and the six-hourly population roll (`DEUS_Ecology.js:907-914`, header `DEUS_Ecology.js:22-27`) cited separately | §1.3 (L218); §6 (L805); Appendix A.8 (L1889) |
    22  * Every six game hours, the current area and one rotating world area get a
    23  * deterministic population roll. Prey can recover toward the area's original
    24  * population. Monsters can replenish or first appear only in catalog-approved
    25  * biomes/regions. Both populations have hard area caps. Monster cells must be
    26  * free and remain outside the protected start, camps, active faction sites,
    27  * nearby people, and the player's view radius.

### C014 ADR:42 docs/worldgen/DEUS_WORLDGEN_WBS.md:519 @b612bc72 OK
section: Rev 3 change log
claim: | 12 | Minor: Rev 2 pointed at the WBS table header, not the SIM.00.01 row | Now `docs/worldgen/DEUS_WORLDGEN_WBS.md:519` at `b612bc72` | header (L16) |
   519  | SIM.00.01 | **ADR-003 sim/render boundary and LOD simulation** (Lane M, docs only). Covers boundary, module layout, tick model, snapshot format, LOD region size and levels, summary state per system, promotion and demot

### C015 ADR:43 game/js/plugins/DEUS_Factions.js:632 OK
section: Rev 3 change log
claim: | 13 | Minor: Rev 2 cited the Factions contact interval with a span that included `CONTACT_CELLS` | Cited as `DEUS_Factions.js:632` (§1.2, §3.3) | §1.2 (L183); §3.3 (L436) |
   632  const CONTACT_EVERY = 120; // frames (2 s at x1)

### C016 ADR:46 game/js/plugins/DEUS_Factions.js:619-625 OK
section: Rev 3 change log
claim: | 16 | Not in the review: the Rev 3 re-check of all 476 Rev 2 citations found 6 FALSE and 22 IMPRECISE ones | Each is corrected, including a wrong claim about Factions counters (`DEUS_Factions.js:619-625`) | Appendix C (L1944); §1.4 (L249); §7.4 (L877); `tasks/SIM.00.01/lane-m/rev3/verdicts_rev2.md` |
   619  UF.Events.on("world:unitRemoved", u => {
   620  if (u && u.data && u.data.faction && (u.data.dead || u.data._isDying) && !u.data._popDeducted) {
   621  u.data._popDeducted = true;
   622  const f = Factions.get(u.data.faction);
   623  if (f && f.population > 0) f.population--;
   624  }
   625  });

### C017 ADR:132 game/js/rmmz_managers.js:1982-1991 OK
section: 1.1 How the simulation runs today
claim: - On every PIXI tick, RMMZ's `SceneManager.update` calls `updateMain` n times (`rmmz_managers.js:1982-1991`).
  1982  SceneManager.update = function(deltaTime) {
  1983  try {
  1984  const n = this.determineRepeatNumber(deltaTime);
      ...
  1990  }
  1991  };

### C018 ADR:133 game/js/rmmz_managers.js:1993-2010 OK
section: 1.1 How the simulation runs today
claim: - `determineRepeatNumber` smooths the PIXI `deltaTime` and clamps each sample to 2 (`rmmz_managers.js:1993-2010`). In practice it returns about one update per 60 Hz frame:
  1993  SceneManager.determineRepeatNumber = function(deltaTime) {
  1994  // [Note] We consider environments where the refresh rate is higher than
  1995  //   60Hz, but ignore sudden irregular deltaTime.
      ...
  2009  };
  2010  

### C019 ADR:136 game/js/rmmz_managers.js:2102-2112 OK
section: 1.1 How the simulation runs today
claim: - `updateMain` increments `Graphics.frameCount` and updates the scene (`rmmz_managers.js:2102-2112`). The scene is updated only while the window has focus (`rmmz_managers.js:2146`, `:2157-2165`).
  2102  SceneManager.updateMain = function() {
  2103  this.updateFrameCount();
  2104  this.updateInputData();
      ...
  2111  Graphics.frameCount++;
  2112  };

### C020 ADR:136 game/js/rmmz_managers.js:2146 OK
section: 1.1 How the simulation runs today
claim: - `updateMain` increments `Graphics.frameCount` and updates the scene (`rmmz_managers.js:2102-2112`). The scene is updated only while the window has focus (`rmmz_managers.js:2146`, `:2157-2165`).
  2146  if (this.isGameActive()) {

### C021 ADR:136 game/js/rmmz_managers.js:2157-2165 (bare, file from 0 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - `updateMain` increments `Graphics.frameCount` and updates the scene (`rmmz_managers.js:2102-2112`). The scene is updated only while the window has focus (`rmmz_managers.js:2146`, `:2157-2165`).
  2157  SceneManager.isGameActive = function() {
  2158  // [Note] We use "window.top" to support an iframe.
  2159  try {
      ...
  2164  }
  2165  };

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

### C026 ADR:141 game/js/plugins/DEUS_Core.js:74-98 OK
section: 1.1 How the simulation runs today
claim: - Their run order is the `game/js/plugins.js` order (42 entries, all `"status": true`), plus companions that `DEUS_Core.js:74-98` loads with `require`.
    74  const companionPlugins = [
    75  "DEUS_Containers",
    76  "DEUS_Stockpiles",
      ...
    97  try {
    98  require(p);

### C027 ADR:142 game/js/plugins/DEUS_Jobs.js:1778 OK
section: 1.1 How the simulation runs today
claim: - Code already depends on that order. `DEUS_Jobs.js:1778`: "UF_World moved the units first (its alias is below ours)".
  1778  _Game_Map_update.call(this, sceneActive); // UF_World moved the units first (its alias is below ours)

### C028 ADR:145 game/js/plugins/DEUS_TimeSpeed.js:147-153 OK
section: 1.1 How the simulation runs today
claim: - `DEUS_TimeSpeed` multiplies n by the speed inside `determineRepeatNumber` (`DEUS_TimeSpeed.js:147-153`) and replaces `SceneManager.update` (`:158-173`).
   147  const _determineRepeatNumber = SceneManager.determineRepeatNumber;
   148  SceneManager.determineRepeatNumber = function(deltaTime) {
   149  const n = _determineRepeatNumber.call(this, deltaTime);
   150  const scene = this._scene;
   151  const running = scene instanceof Scene_Map && scene.isActive() && !paused && !$gameMessage.isBusy() && !$gamePlayer.isTransferring();
   152  return running ? n * SPEEDS[index] : n;
   153  };

### C029 ADR:145 game/js/plugins/DEUS_TimeSpeed.js:158-173 (bare, file from 0 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - `DEUS_TimeSpeed` multiplies n by the speed inside `determineRepeatNumber` (`DEUS_TimeSpeed.js:147-153`) and replaces `SceneManager.update` (`:158-173`).
   158  const _SceneManager_update = SceneManager.update;
   159  SceneManager.update = function(deltaTime) {
   160  try {
      ...
   172  }
   173  };

### C030 ADR:146 game/js/plugins/DEUS_TimeSpeed.js:45-50 (bare, file from 1 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - The speeds are 1, 2, 4, 8, 16 and 32. 16 and 32 are always added to the list, whatever the parameter says (`:45-50`).
    45  let speedList = String(P.Speeds || "1, 2, 4, 8, 16, 32").split(",").map(Number).filter(n => n >= 1);
    46  if (!speedList.includes(16)) speedList.push(16);
    47  if (!speedList.includes(32)) speedList.push(32);
    48  speedList.sort((a, b) => a - b);
    49  const SPEEDS = speedList;
    50  if (SPEEDS[0] !== 1) SPEEDS.unshift(1);

### C031 ADR:148 game/js/plugins/DEUS_TimeSpeed.js:231-241 (bare, file from 3 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - On intermediate sub-ticks, TimeSpeed's `Scene_Map.update` runs only `updateMain` and the clock (`:231-241`). But every `Scene_Map.update` wrapper from a plugin loaded *after* TimeSpeed (`plugins.js:184`) still runs its own body on every sub-tick. Examples: Levels `:4287`, NaturalConnections `:508`, Depth `:834`.
   231  const _Scene_Map_update = Scene_Map.prototype.update;
   232  Scene_Map.prototype.update = function() {
   233  if (SPEEDS[index] > 1 && totalSubTicks > 1 && currentSubTick < totalSubTicks - 1) {
      ...
   240  return;
   241  }

### C032 ADR:148 game/js/plugins.js:184 OK
section: 1.1 How the simulation runs today
claim: - On intermediate sub-ticks, TimeSpeed's `Scene_Map.update` runs only `updateMain` and the clock (`:231-241`). But every `Scene_Map.update` wrapper from a plugin loaded *after* TimeSpeed (`plugins.js:184`) still runs its own body on every sub-tick. Examples: Levels `:4287`, NaturalConnections `:508`, Depth `:834`.
   184  "name": "DEUS_TimeSpeed",

### C033 ADR:148 game/js/plugins/DEUS_Levels.js:4287 (bare, file from 0 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - On intermediate sub-ticks, TimeSpeed's `Scene_Map.update` runs only `updateMain` and the clock (`:231-241`). But every `Scene_Map.update` wrapper from a plugin loaded *after* TimeSpeed (`plugins.js:184`) still runs its own body on every sub-tick. Examples: Levels `:4287`, NaturalConnections `:508`, Depth `:834`.
  4287  Scene_Map.prototype.update = function() {

### C034 ADR:148 game/js/plugins/DEUS_NaturalConnections.js:508 (bare, file from 0 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - On intermediate sub-ticks, TimeSpeed's `Scene_Map.update` runs only `updateMain` and the clock (`:231-241`). But every `Scene_Map.update` wrapper from a plugin loaded *after* TimeSpeed (`plugins.js:184`) still runs its own body on every sub-tick. Examples: Levels `:4287`, NaturalConnections `:508`, Depth `:834`.
   508  Scene_Map.prototype.update = function() {

### C035 ADR:148 game/js/plugins/DEUS_Depth.js:834 (bare, file from 0 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - On intermediate sub-ticks, TimeSpeed's `Scene_Map.update` runs only `updateMain` and the clock (`:231-241`). But every `Scene_Map.update` wrapper from a plugin loaded *after* TimeSpeed (`plugins.js:184`) still runs its own body on every sub-tick. Examples: Levels `:4287`, NaturalConnections `:508`, Depth `:834`.
   834  Scene_Map.prototype.update = function() {

### C036 ADR:150 game/js/plugins/DEUS_TimeSpeed.js:209-217 OK
section: 1.1 How the simulation runs today
claim: **Pause.** Pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`). `SceneManager.updateMain` and every `Scene_Map.update` wrapper keep running.
   209  const _Scene_Map_updateMain = Scene_Map.prototype.updateMain;
   210  Scene_Map.prototype.updateMain = function() {
   211  if (!paused) {
      ...
   216  $gameScreen.update();
   217  };

### C037 ADR:153 game/js/plugins/DEUS_Core.js:60-62 OK
section: 1.1 How the simulation runs today
claim: - `$ufTime.update` adds `1/60` per call and advances one game minute per `timeSpeed = 1/6` (`DEUS_Core.js:60-62`, `:304-311`). That is 10 calls per game minute (`ticksPerMinute`, `:376-378`).
    60  // 240 real seconds / 1440 game minutes = 1/6 real seconds per game minute (10 frames at 60 FPS).
    61  const timeSpeed = params["TimeSpeed"] && params["TimeSpeed"] !== "1.0" ? parseFloat(params["TimeSpeed"]) : (1.0 / 6.0);
    62  const startHour = parseInt(params["StartHour"] || 8, 10);

### C038 ADR:153 game/js/plugins/DEUS_Core.js:304-311 (bare, file from 0 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - `$ufTime.update` adds `1/60` per call and advances one game minute per `timeSpeed = 1/6` (`DEUS_Core.js:60-62`, `:304-311`). That is 10 calls per game minute (`ticksPerMinute`, `:376-378`).
   304  update() {
   305  if (this.isPaused || $gameMessage.isBusy()) return;
   306  this._timer += 1 / 60; // Assuming 60fps
   307  if (this._timer >= timeSpeed) {
   308  this._timer -= timeSpeed;
   309  this.advanceMinute(1);
   310  }
   311  }

### C039 ADR:153 game/js/plugins/DEUS_Core.js:376-378 (bare, file from 0 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - `$ufTime.update` adds `1/60` per call and advances one game minute per `timeSpeed = 1/6` (`DEUS_Core.js:60-62`, `:304-311`). That is 10 calls per game minute (`ticksPerMinute`, `:376-378`).
   376  ticksPerMinute() {
   377  return Math.max(1, Math.round(timeSpeed * 60));
   378  }

### C040 ADR:155 game/js/plugins/DEUS_Core.js:505-510 OK
section: 1.1 How the simulation runs today
claim: - The clock runs from `Scene_Map.update` (`DEUS_Core.js:505-510`) and, explicitly, on TimeSpeed sub-ticks (`DEUS_TimeSpeed.js:236`).
   505  Scene_Map.prototype.update = function() {
   506  _Scene_Map_update.call(this);
   507  $ufTime.update();
   508  if (window.UF && UF.Time && typeof UF.Time.update === "function") {
   509  UF.Time.update(1 / 60);
   510  }

### C041 ADR:155 game/js/plugins/DEUS_TimeSpeed.js:236 OK
section: 1.1 How the simulation runs today
claim: - The clock runs from `Scene_Map.update` (`DEUS_Core.js:505-510`) and, explicitly, on TimeSpeed sub-ticks (`DEUS_TimeSpeed.js:236`).
   236  if (window.$ufTime) $ufTime.update();

### C042 ADR:156 game/js/plugins/DEUS_Core.js:305 OK
section: 1.1 How the simulation runs today
claim: - It stops while a message is busy (`DEUS_Core.js:305`).
   305  if (this.isPaused || $gameMessage.isBusy()) return;

### C043 ADR:157 game/js/plugins/DEUS_Core.js:321-325 OK
section: 1.1 How the simulation runs today
claim: - The year advances once per game day (`DEUS_Core.js:321-325`). But `docs/systems/UF_History.md:1161` says a year "takes over 100 real hours at ×1". See Q12.
   321  while (this.hour >= 24) {
   322  this.hour -= 24;
   323  this.day++;
   324  this.year++; // 1 day/night cycle per year
   325  this.onDayPass();

### C044 ADR:157 docs/systems/UF_History.md:1161 OK
section: 1.1 How the simulation runs today
claim: - The year advances once per game day (`DEUS_Core.js:321-325`). But `docs/systems/UF_History.md:1161` says a year "takes over 100 real hours at ×1". See Q12.
  1161  - `currentYear()` counts game-clock years; with Q11 open a year takes over 100 real hours at ×1.

### C045 ADR:160 game/js/plugins/DEUS_Colonists.js:48 OK
section: 1.1 How the simulation runs today
claim: - `DEUS_Colonists.js:48`: `NEEDS_EVERY = 60; // ticks per needs tick (one game minute)`.
    48  const NEEDS_EVERY = 60;         // ticks per needs tick (one game minute)

### C046 ADR:161 game/js/plugins/DEUS_Environment.js:52 OK
section: 1.1 How the simulation runs today
claim: - `DEUS_Environment.js:52`: `TICKS_PER_STEP = 60; // 1 beat / 1 game second`.
    52  const TICKS_PER_STEP = 60; // 1 beat / 1 game second

### C047 ADR:162 game/js/plugins/DEUS_TimeSpeed.js:33 OK
section: 1.1 How the simulation runs today
claim: - `DEUS_TimeSpeed.js:33`: "60 frames = 1 game minute".
    33  * speed-up and the pause). 60 frames = 1 game minute at the default UF_Core

### C048 ADR:164 docs/ARCHITECTURE.md:18 OK
section: 1.1 How the simulation runs today
claim: - `docs/ARCHITECTURE.md:18`: "Engine (20 Hz computation)".
    18  | **TIME** | `UF_Time.js`, `UF_TimeSpeed.js` | Multi-domain clocks: Engine (20 Hz computation), Tactical Action (6s d20 round), Historical (1s = 2h aging), Presentation (60m solar cycle). Pause enforcement. |

### C049 ADR:167 game/js/plugins/DEUS_Ecology.js:994 OK
section: 1.1 How the simulation runs today
claim: - Ecology and Colonists skip their step while the scene is inactive (`DEUS_Ecology.js:994`, `DEUS_Colonists.js:5750`). World, Fluid, Fire and Jobs do not.
   994  if (sceneActive && window.UF && UF.World && UF.World.isWorldMap && UF.World.isWorldMap(this.mapId())) {

### C050 ADR:167 game/js/plugins/DEUS_Colonists.js:5750 OK
section: 1.1 How the simulation runs today
claim: - Ecology and Colonists skip their step while the scene is inactive (`DEUS_Ecology.js:994`, `DEUS_Colonists.js:5750`). World, Fluid, Fire and Jobs do not.
  5750  if (!sceneActive || (window.UF && UF.Time && UF.Time.paused)) return;

### C051 ADR:174 game/js/plugins/DEUS_World.js:2932 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_World.js:2932 | Game_Map.update | **sim**: `World.update` moves every unit (`:1677-1702`) | every call |
  2932  Game_Map.prototype.update = function(sceneActive) {

### C052 ADR:174 game/js/plugins/DEUS_World.js:1677-1702 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_World.js:2932 | Game_Map.update | **sim**: `World.update` moves every unit (`:1677-1702`) | every call |
  1677  World.update = function() {
  1678  if (!this.state) return;
  1679  this._frame++;
      ...
  1701  stepOffscreen(u);
  1702  }

### C053 ADR:175 game/js/plugins/DEUS_Fluid.js:1016 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fluid.js:1016 | Game_Map.update | **sim**: `Fluid.tick()` (`:731-752`) | every call; 512-cell budget (`:55`) |
  1016  Game_Map.prototype.update = function(sceneActive) {

### C054 ADR:175 game/js/plugins/DEUS_Fluid.js:731-752 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fluid.js:1016 | Game_Map.update | **sim**: `Fluid.tick()` (`:731-752`) | every call; 512-cell budget (`:55`) |
   731  tick(budget) {
   732  if (!config.simulationActive) return 0;
   733  const t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
      ...
   751  diag.lastTickMs = elapsed;
   752  

### C055 ADR:175 game/js/plugins/DEUS_Fluid.js:55 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fluid.js:1016 | Game_Map.update | **sim**: `Fluid.tick()` (`:731-752`) | every call; 512-cell budget (`:55`) |
    55  const DEFAULT_BUDGET = 512;

### C056 ADR:176 game/js/plugins/DEUS_Ecology.js:992 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Ecology.js:992 | Game_Map.update | **sim**: `stepBeat` sprouts (`:764-872`) | 60 calls, only while `sceneActive` (`:994-999`) |
   992  Game_Map.prototype.update = function(sceneActive) {

### C057 ADR:176 game/js/plugins/DEUS_Ecology.js:764-872 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Ecology.js:992 | Game_Map.update | **sim**: `stepBeat` sprouts (`:764-872`) | 60 calls, only while `sceneActive` (`:994-999`) |
   764  function stepBeat(opts) {
   765  const W = World(), O = Objects(), st = state(), o = opts || {};
   766  if (!enabled && !o.force || !W || !W.state || !O) return { spawned: 0, matured: 0 };
      ...
   871  }
   872  return result;

### C058 ADR:176 game/js/plugins/DEUS_Ecology.js:994-999 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Ecology.js:992 | Game_Map.update | **sim**: `stepBeat` sprouts (`:764-872`) | 60 calls, only while `sceneActive` (`:994-999`) |
   994  if (sceneActive && window.UF && UF.World && UF.World.isWorldMap && UF.World.isWorldMap(this.mapId())) {
   995  _beatFrame++;
   996  if (_beatFrame >= 60) {
   997  _beatFrame = 0;
   998  stepBeat();
   999  }

### C059 ADR:177 game/js/plugins/DEUS_Fire.js:617 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fire.js:617 | Game_Map.update | **sim**: `safeBeat` | `beatFrames()`, default 60 (`:138-140`) |
   617  Game_Map.prototype.update = function(sceneActive) {

### C060 ADR:177 game/js/plugins/DEUS_Fire.js:138-140 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fire.js:617 | Game_Map.update | **sim**: `safeBeat` | `beatFrames()`, default 60 (`:138-140`) |
   138  const beatFrames = () => {
   139  return (conf() && conf().beatFrames) || 60;
   140  };

### C061 ADR:178 game/js/plugins/DEUS_Environment.js:796 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Environment.js:796 | Game_Map.update | **sim**: unit thermal. Also writes screen weather (`:690-710`) | unit id spread over 60 (`:730-744`) |
   796  Game_Map.prototype.update = function(sceneActive) {

### C062 ADR:178 game/js/plugins/DEUS_Environment.js:690-710 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Environment.js:796 | Game_Map.update | **sim**: unit thermal. Also writes screen weather (`:690-710`) | unit id spread over 60 (`:730-744`) |
   690  if (!W) return;
   691  const lvl = typeof W.viewLevel === "function" ? W.viewLevel() : null;
   692  const z = lvl ? lvl.z : 0;
      ...
   709  $gameScreen.changeWeather(targetType, power, 60);
   710  }

### C063 ADR:178 game/js/plugins/DEUS_Environment.js:730-744 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Environment.js:796 | Game_Map.update | **sim**: unit thermal. Also writes screen weather (`:690-710`) | unit id spread over 60 (`:730-744`) |
   730  // Interleave living units over 60 frames so simulation is smooth and spike-free
   731  const stUnits = W.state && W.state.units;
   732  if (stUnits) {
      ...
   743  }
   744  }

### C064 ADR:179 game/js/plugins/DEUS_Colonists.js:5748 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Colonists.js:5748 | Game_Map.update | **sim**: needs and job sweep | needs every 60 (`:48`), sweep every 30 (`:63`); skipped while inactive or paused (`:5750`) |
  5748  Game_Map.prototype.update = function(sceneActive) {

### C065 ADR:179 game/js/plugins/DEUS_Colonists.js:48 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Colonists.js:5748 | Game_Map.update | **sim**: needs and job sweep | needs every 60 (`:48`), sweep every 30 (`:63`); skipped while inactive or paused (`:5750`) |
    48  const NEEDS_EVERY = 60;         // ticks per needs tick (one game minute)

### C066 ADR:179 game/js/plugins/DEUS_Colonists.js:63 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Colonists.js:5748 | Game_Map.update | **sim**: needs and job sweep | needs every 60 (`:48`), sweep every 30 (`:63`); skipped while inactive or paused (`:5750`) |
    63  const SWEEP_EVERY = 30;         // ticks between sweeps of the colonist list for idle workers

### C067 ADR:179 game/js/plugins/DEUS_Colonists.js:5750 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Colonists.js:5748 | Game_Map.update | **sim**: needs and job sweep | needs every 60 (`:48`), sweep every 30 (`:63`); skipped while inactive or paused (`:5750`) |
  5750  if (!sceneActive || (window.UF && UF.Time && UF.Time.paused)) return;

### C068 ADR:180 game/js/plugins/DEUS_Jobs.js:1777 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Jobs.js:1777 | Game_Map.update | **sim**: job step | every call |
  1777  Game_Map.prototype.update = function(sceneActive) {

### C069 ADR:181 game/js/plugins/DEUS_Projects.js:1596 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Projects.js:1596 | Game_Map.update | **sim**: projects | cycle every `cadenceTicks: 3000` (`:38`) |
  1596  Game_Map.prototype.update = function(sceneActive) {

### C070 ADR:181 game/js/plugins/DEUS_Projects.js:38 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Projects.js:1596 | Game_Map.update | **sim**: projects | cycle every `cadenceTicks: 3000` (`:38`) |
    38  cadenceTicks: 3000,      // map updates between full cycles (~50 s at 60 updates/s); domain "action"

### C071 ADR:182 game/js/plugins/DEUS_Combat.js:1414 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Combat.js:1414 | Game_Map.update | **sim**: `step()` | every call |
  1414  Game_Map.prototype.update = function(sceneActive) {

### C072 ADR:183 game/js/plugins/DEUS_Factions.js:657 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Factions.js:657 | Game_Map.update | **sim**: `checkContact` | every 120 (`DEUS_Factions.js:632`) |
   657  Game_Map.prototype.update = function(sceneActive) {

### C073 ADR:183 game/js/plugins/DEUS_Factions.js:632 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Factions.js:657 | Game_Map.update | **sim**: `checkContact` | every 120 (`DEUS_Factions.js:632`) |
   632  const CONTACT_EVERY = 120; // frames (2 s at x1)

### C074 ADR:184 game/js/plugins/DEUS_Ownership.js:613 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Ownership.js:613 | Game_Map.update | **sim**: `scanSleep` / `reconcile` | own counters |
   613  Game_Map.prototype.update = function(sceneActive) {

### C075 ADR:185 game/js/plugins/DEUS_TimeSpeed.js:189 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_TimeSpeed.js:189 | Game_Map.update | **sim**: `UF.Time.after/every` timers (closures) | every call |
   189  Game_Map.prototype.update = function(sceneActive) {

### C076 ADR:186 game/js/plugins/DEUS_Anim.js:1506 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Anim.js:1506 | Game_Map.update | **render writing sim**: death queue calls `W.removeUnit` (`:1509-1522`) | every call |
  1506  Game_Map.prototype.update = function(sceneActive) {

### C077 ADR:186 game/js/plugins/DEUS_Anim.js:1509-1522 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Anim.js:1506 | Game_Map.update | **render writing sim**: death queue calls `W.removeUnit` (`:1509-1522`) | every call |
  1509  if (deathQueue.size) {
  1510  const W = World();
  1511  for (const id of Array.from(deathQueue)) {
      ...
  1521  }
  1522  }

### C078 ADR:187 game/js/plugins/DEUS_Fog.js:638 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fog.js:638 | Game_Map.update | presentation: `Fog.refresh` (Fog is force-disabled, `:510-518`) | every 20 (`:53`) |
   638  Game_Map.prototype.update = function(sceneActive) {

### C079 ADR:187 game/js/plugins/DEUS_Fog.js:510-518 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fog.js:638 | Game_Map.update | presentation: `Fog.refresh` (Fog is force-disabled, `:510-518`) | every 20 (`:53`) |
   510  function resolveEnabled() {
   511  // Fog of war temporarily disabled per user directive 2026-09-22
   512  return false;
      ...
   517  window.UF.Fog = Fog;
   518  Fog.enabled = false;

### C080 ADR:187 game/js/plugins/DEUS_Fog.js:53 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fog.js:638 | Game_Map.update | presentation: `Fog.refresh` (Fog is force-disabled, `:510-518`) | every 20 (`:53`) |
    53  const UPDATE_FRAMES = 20;

### C081 ADR:188 game/js/plugins/DEUS_Wildlife.js:1195 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Wildlife.js:1195 | Game_Map.update | empty ("AI update loop wiped", `:1197`) | — |
  1195  Game_Map.prototype.update = function(sceneActive) {

### C082 ADR:188 game/js/plugins/DEUS_Wildlife.js:1197 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Wildlife.js:1195 | Game_Map.update | empty ("AI update loop wiped", `:1197`) | — |
  1197  // AI update loop wiped per Objective 2

### C083 ADR:189 game/js/plugins/DEUS_Core.js:505 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Core.js:505 | Scene_Map.update | **sim**: calendar `$ufTime.update()` | every call, except while a message is busy |
   505  Scene_Map.prototype.update = function() {

### C084 ADR:190 game/js/plugins/DEUS_Core.js:175 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Core.js:175 | Scene_Map.update | NW.js logging and autotest | every call |
   175  Scene_Map.prototype.update = function() {

### C085 ADR:191 game/js/plugins/DEUS_NaturalConnections.js:508 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_NaturalConnections.js:508 | Scene_Map.update | **sim**: `updateFluids(); stepCreatures();` (`:512-515`) | `Graphics.frameCount % 30`; runs while paused (§A.4) |
   508  Scene_Map.prototype.update = function() {

### C086 ADR:191 game/js/plugins/DEUS_NaturalConnections.js:512-515 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_NaturalConnections.js:508 | Scene_Map.update | **sim**: `updateFluids(); stepCreatures();` (`:512-515`) | `Graphics.frameCount % 30`; runs while paused (§A.4) |
   512  if (Graphics.frameCount % 30 === 0) {
   513  updateFluids();
   514  stepCreatures();
   515  }

### C087 ADR:192 game/js/plugins/DEUS_TimeSpeed.js:232 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_TimeSpeed.js:232 | Scene_Map.update | host: sub-tick split and speed keys | every call |
   232  Scene_Map.prototype.update = function() {

### C088 ADR:193 game/js/plugins/DEUS_Combat.js:1479 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Combat.js:1479 | Scene_Map.update | input: debug raid key | every call |
  1479  Scene_Map.prototype.update = function() {

### C089 ADR:194 game/js/plugins/DEUS_Factions.js:751 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Factions.js:751, :1156 | Scene_Map.update | UI: ledger key, window skins | every call |
   751  Scene_Map.prototype.update = function() {

### C090 ADR:194 game/js/plugins/DEUS_Factions.js:1156 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Factions.js:751, :1156 | Scene_Map.update | UI: ledger key, window skins | every call |
  1156  Scene_Map.prototype.update = function() {

### C091 ADR:195 game/js/plugins/DEUS_History.js:3662 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_History.js:3662, :3780 | Scene_Map.update | UI: chronicle keys; test capture | every call |
  3662  Scene_Map.prototype.update = function() {

### C092 ADR:195 game/js/plugins/DEUS_History.js:3780 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_History.js:3662, :3780 | Scene_Map.update | UI: chronicle keys; test capture | every call |
  3780  Scene_Map.prototype.update = function() {

### C093 ADR:196 game/js/plugins/DEUS_Levels.js:4287 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Levels.js:4287 | Scene_Map.update | UI and input: level keys, `mapFrames++` | every call |
  4287  Scene_Map.prototype.update = function() {

### C094 ADR:197 game/js/plugins/DEUS_Depth.js:834 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Depth.js:834 | Scene_Map.update | UI: preset key | every call |
   834  Scene_Map.prototype.update = function() {

### C095 ADR:198 game/js/plugins/DEUS_ColonyOverseer.js:196 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_ColonyOverseer.js:196, DEUS_Containers.js:1323, DEUS_Interact.js:885, DEUS_Select.js:2289, DEUS_Sheet.js:2252, DEUS_Talk.js:1938 | Scene_Map.update | input, UI and commands | every call |
   196  Scene_Map.prototype.update = function() {

### C096 ADR:198 game/js/plugins/DEUS_Containers.js:1323 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_ColonyOverseer.js:196, DEUS_Containers.js:1323, DEUS_Interact.js:885, DEUS_Select.js:2289, DEUS_Sheet.js:2252, DEUS_Talk.js:1938 | Scene_Map.update | input, UI and commands | every call |
  1323  Scene_Map.prototype.update = function() {

### C097 ADR:198 game/js/plugins/DEUS_Interact.js:885 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_ColonyOverseer.js:196, DEUS_Containers.js:1323, DEUS_Interact.js:885, DEUS_Select.js:2289, DEUS_Sheet.js:2252, DEUS_Talk.js:1938 | Scene_Map.update | input, UI and commands | every call |
   885  Scene_Map.prototype.update = function() {

### C098 ADR:198 game/js/plugins/DEUS_Select.js:2289 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_ColonyOverseer.js:196, DEUS_Containers.js:1323, DEUS_Interact.js:885, DEUS_Select.js:2289, DEUS_Sheet.js:2252, DEUS_Talk.js:1938 | Scene_Map.update | input, UI and commands | every call |
  2289  Scene_Map.prototype.update = function() {

### C099 ADR:198 game/js/plugins/DEUS_Sheet.js:2252 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_ColonyOverseer.js:196, DEUS_Containers.js:1323, DEUS_Interact.js:885, DEUS_Select.js:2289, DEUS_Sheet.js:2252, DEUS_Talk.js:1938 | Scene_Map.update | input, UI and commands | every call |
  2252  Scene_Map.prototype.update = function() {

### C100 ADR:198 game/js/plugins/DEUS_Talk.js:1938 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_ColonyOverseer.js:196, DEUS_Containers.js:1323, DEUS_Interact.js:885, DEUS_Select.js:2289, DEUS_Sheet.js:2252, DEUS_Talk.js:1938 | Scene_Map.update | input, UI and commands | every call |
  1938  Scene_Map.prototype.update = function() {

### C101 ADR:204 game/js/plugins/DEUS_World.js:1677-1702 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: **Units** (`World.update`, `DEUS_World.js:1677-1702`).
  1677  World.update = function() {
  1678  if (!this.state) return;
  1679  this._frame++;
      ...
  1701  stepOffscreen(u);
  1702  }

### C102 ADR:205 game/js/plugins/DEUS_World.js:1686-1698 (bare, file from 1 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - A unit on the viewed level that has an event copies its position *from* the `Game_Event` (`:1686-1698`). It moves with RMMZ movement: `stepOnscreen` / `stepDirect` (`:1633-1675`), dropping its goal after `STUCK_LIMIT = 300` frames (`:140`).
  1686  if (view && u.area.x === view.x && u.area.y === view.y && zOf(u) === view.z) {
  1687  const ev = $gameMap._events[EVENT_BASE + u.id];
  1688  if (!ev) {
      ...
  1697  u.dir8 = ev.dir8 ? ev.dir8() : u.dir;
  1698  if (u.goal) stepOnscreen(u, ev);

### C103 ADR:205 game/js/plugins/DEUS_World.js:1633-1675 (bare, file from 1 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - A unit on the viewed level that has an event copies its position *from* the `Game_Event` (`:1686-1698`). It moves with RMMZ movement: `stepOnscreen` / `stepDirect` (`:1633-1675`), dropping its goal after `STUCK_LIMIT = 300` frames (`:140`).
  1633  function stepOnscreen(u, ev) {
  1634  if (ev.isMoving()) return;
  1635  if (goalReached(u)) return arrive(u);
      ...
  1674  }
  1675  }

### C104 ADR:205 game/js/plugins/DEUS_World.js:140 (bare, file from 1 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - A unit on the viewed level that has an event copies its position *from* the `Game_Event` (`:1686-1698`). It moves with RMMZ movement: `stepOnscreen` / `stepDirect` (`:1633-1675`), dropping its goal after `STUCK_LIMIT = 300` frames (`:140`).
   140  const STUCK_LIMIT = 300; // frames a unit on screen may fail to move before its goal is dropped

### C105 ADR:206 game/js/plugins/DEUS_World.js:136 (bare, file from 2 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Every other unit jumps one whole cell every `unitStepFrames = 16` frames (`:136`, `:1689`, `:1699-1701`), along a planned path or straight toward its goal (`:1613-1628`).
   136  unitStepFrames: Math.max(1, num("UnitStepFrames", 16))

### C106 ADR:206 game/js/plugins/DEUS_World.js:1689 (bare, file from 2 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Every other unit jumps one whole cell every `unitStepFrames = 16` frames (`:136`, `:1689`, `:1699-1701`), along a planned path or straight toward its goal (`:1613-1628`).
  1689  if (u.goal && (frame + u.id) % steps === 0) stepOffscreen(u);

### C107 ADR:206 game/js/plugins/DEUS_World.js:1699-1701 (bare, file from 2 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Every other unit jumps one whole cell every `unitStepFrames = 16` frames (`:136`, `:1689`, `:1699-1701`), along a planned path or straight toward its goal (`:1613-1628`).
  1699  } else if (u.goal && (frame + u.id) % steps === 0) {
  1700  // Off-screen steps are spread over the frames by unit id, so hundreds of units don't all step at once.
  1701  stepOffscreen(u);

### C108 ADR:206 game/js/plugins/DEUS_World.js:1613-1628 (bare, file from 2 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Every other unit jumps one whole cell every `unitStepFrames = 16` frames (`:136`, `:1689`, `:1699-1701`), along a planned path or straight toward its goal (`:1613-1628`).
  1613  function stepOffscreen(u) {
  1614  if (goalReached(u)) return arrive(u);
  1615  if (PATHS.enabled && PATHS.offscreenPaths && !(u.data && u.data.through) && sameArea(u.goal.area, u.area)) return stepOffscreenAlongPath(u);
      ...
  1627  if (u.goal && goalReached(u)) arrive(u);
  1628  }

### C109 ADR:208 game/js/plugins/DEUS_World.js:847-855 (bare, file from 4 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - On screen, speed follows `u.data.moveSpeed` and conditions (`unitMoveSpeed`, `:847-855`), through RMMZ's `2^speed / 256` cells per frame (`rmmz_objects.js:7062-7064`). The default speed 4 gives 1/16 cell per frame.
   847  function unitMoveSpeed(u) {
   848  let base = (u && u.data && Number.isFinite(u.data.moveSpeed)) ? (u.data.moveSpeed | 0) : 4;
   849  const Cond = window.UF && UF.Conditions;
      ...
   854  const factor = Cond.speedFactor(u);
   855  if (factor === 0) return 0;

### C110 ADR:208 game/js/rmmz_objects.js:7062-7064 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - On screen, speed follows `u.data.moveSpeed` and conditions (`unitMoveSpeed`, `:847-855`), through RMMZ's `2^speed / 256` cells per frame (`rmmz_objects.js:7062-7064`). The default speed 4 gives 1/16 cell per frame.
  7062  Game_CharacterBase.prototype.distancePerFrame = function() {
  7063  return Math.pow(2, this.realMoveSpeed()) / 256;
  7064  };

### C111 ADR:211 game/js/plugins/DEUS_World.js:888-911 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Every unit on view is a `Game_Event` with a `Sprite_Character` (`spawnUnitEvent`, `DEUS_World.js:888-911`).
   888  function spawnUnitEvent(u) {
   889  if (!window.$dataMap || !window.$gameMap) return null;
   890  const eid = EVENT_BASE + u.id;
      ...
   910  }
   911  return ev;

### C112 ADR:214 game/js/plugins/DEUS_Fluid.js:737-745 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - `Fluid.tick` steps only the viewed area when there is a view (`DEUS_Fluid.js:737-745`).
   737  const view = W && typeof W.viewLevel === "function" ? W.viewLevel() : null;
   738  
   739  if (view) {
      ...
   744  }
   745  }

### C113 ADR:215 game/js/plugins/DEUS_World.js:127-128 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - *Correction to the PM survey:* by default `AreasX = AreasY = 1` (`DEUS_World.js:127-128`), and the `DEUS_World` parameters are `{}` (`plugins.js:58`). So there is exactly one area. `stepArea` works through that area's one queue, up to its budget per call (`DEUS_Fluid.js:356-376`), and the queue holds cells of all 5 levels (the level is decoded per cell, `DEUS_Fluid.js:381-383`). The view restriction only matters in multi-area worlds.
   127  areasX: num("AreasX", 1),
   128  areasY: num("AreasY", 1),

### C114 ADR:215 game/js/plugins.js:58 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - *Correction to the PM survey:* by default `AreasX = AreasY = 1` (`DEUS_World.js:127-128`), and the `DEUS_World` parameters are `{}` (`plugins.js:58`). So there is exactly one area. `stepArea` works through that area's one queue, up to its budget per call (`DEUS_Fluid.js:356-376`), and the queue holds cells of all 5 levels (the level is decoded per cell, `DEUS_Fluid.js:381-383`). The view restriction only matters in multi-area worlds.
    58  "parameters": {}

### C115 ADR:215 game/js/plugins/DEUS_Fluid.js:356-376 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - *Correction to the PM survey:* by default `AreasX = AreasY = 1` (`DEUS_World.js:127-128`), and the `DEUS_World` parameters are `{}` (`plugins.js:58`). So there is exactly one area. `stepArea` works through that area's one queue, up to its budget per call (`DEUS_Fluid.js:356-376`), and the queue holds cells of all 5 levels (the level is decoded per cell, `DEUS_Fluid.js:381-383`). The view restriction only matters in multi-area worlds.
   356  function stepArea(ax, ay, budget) {
   357  const data = getAreaData(ax, ay);
   358  const queue = data.queue;
      ...
   375  
   376  while (data.head < limit) {

### C116 ADR:215 game/js/plugins/DEUS_Fluid.js:381-383 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - *Correction to the PM survey:* by default `AreasX = AreasY = 1` (`DEUS_World.js:127-128`), and the `DEUS_World` parameters are `{}` (`plugins.js:58`). So there is exactly one area. `stepArea` works through that area's one queue, up to its budget per call (`DEUS_Fluid.js:356-376`), and the queue holds cells of all 5 levels (the level is decoded per cell, `DEUS_Fluid.js:381-383`). The view restriction only matters in multi-area worlds.
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

### C123 ADR:220 game/js/plugins/DEUS_World.js:531-532 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - `currentArea()` is ground-only and returns null while another level is viewed (`DEUS_World.js:531-532`; header `:106-108`);
   531  /** The ground area on screen, or null (not a world map, or another level is on screen: see viewLevel). */
   532  World.currentArea = () => (window.$gameMap && World.state ? World.areaOfMapId($gameMap.mapId()) : null);

### C124 ADR:220 game/js/plugins/DEUS_World.js:106-108 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - `currentArea()` is ground-only and returns null while another level is viewed (`DEUS_World.js:531-532`; header `:106-108`);
   106  * calls stay ground-only on purpose: currentArea() / areaOfMapId() /
   107  * isAreaMap() answer only for the ground (null while another level is on
   108  * screen), and world:tileChanged / world:objectChanged / world:areaBuilt fire

### C125 ADR:221 game/js/plugins/DEUS_Ecology.js:803 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - sprouts spawn only in the current area (`DEUS_Ecology.js:803`);
   803  const baseArea = (W.currentArea && W.currentArea()) || { x: 0, y: 0 };

### C126 ADR:222 game/js/plugins/DEUS_Ecology.js:452-453 (bare, file from 1 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - spawn protection uses the player cursor's position (`:452-453`).
   452  const here = W.currentArea();
   453  if (sameArea(here, area) && window.$gamePlayer && Math.hypot(x - $gamePlayer.x, y - $gamePlayer.y) < PLAYER_CLEARANCE) return "player";

### C127 ADR:224 game/js/plugins/DEUS_Fire.js:488-494 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: **Fire.** Campfire escapes and accidental starts happen only in the viewed area and level, and they read `window.$dataMap.ufObjects` (`DEUS_Fire.js:488-494`, `:562-588`).
   488  //-------------------------------------------------------------------------
   489  // Contained sources (campfires) of the area on screen: indexed once per built grid, kept by world:objectChanged
   490  
   491  const src = { grid: null, area: null, conf: null, cells: new Set() };
   492  function sourceCells() {
   493  const W = World(), map = window.$dataMap;
   494  const area = viewArea();

### C128 ADR:224 game/js/plugins/DEUS_Fire.js:562-588 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: **Fire.** Campfire escapes and accidental starts happen only in the viewed area and level, and they read `window.$dataMap.ufObjects` (`DEUS_Fire.js:488-494`, `:562-588`).
   562  const s = sourceCells();
   563  if (s && s.cells.size) {
   564  const size = W.state.size;
      ...
   587  if (!f.burning[nkey] && !catches.has(nkey)) catches.set(nkey, { area, x, y, cause: "accident" });
   588  }

### C129 ADR:227 game/js/plugins/DEUS_Sheet.js:833-846 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Opening a unit's Sheet assigns its D&D class, HP and AC if the unit has none yet (`DEUS_Sheet.js:833-846`).
   833  const Dnd = window.UF && UF.Dnd5e;
   834  let dnd = d.dnd || null;
   835  if (!dnd && Dnd && typeof Dnd.assignClass === "function") {
      ...
   845  d.savingThrows = dnd.savingThrows;
   846  }

### C130 ADR:228 game/js/plugins/DEUS_Anim.js:702 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - After a combat death, the unit is removed by DEUS_Anim: either by its `Game_Map.update` death queue (`DEUS_Anim.js:702`, `:714`, `:1504-1522`) or by its `onUnitDeath` wrapper (`:1605-1631`, removal at `:1624`).
   702  const deathQueue = new Set(); // units found in UF_Combat's own collapse: removed (as deaths) at the next map update

### C131 ADR:228 game/js/plugins/DEUS_Anim.js:714 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - After a combat death, the unit is removed by DEUS_Anim: either by its `Game_Map.update` death queue (`DEUS_Anim.js:702`, `:714`, `:1504-1522`) or by its `onUnitDeath` wrapper (`:1605-1631`, removal at `:1624`).
   714  deathQueue.add(u.id);

### C132 ADR:228 game/js/plugins/DEUS_Anim.js:1504-1522 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - After a combat death, the unit is removed by DEUS_Anim: either by its `Game_Map.update` death queue (`DEUS_Anim.js:702`, `:714`, `:1504-1522`) or by its `onUnitDeath` wrapper (`:1605-1631`, removal at `:1624`).
  1504  let lastBeat = -1;
  1505  const _Game_Map_update = Game_Map.prototype.update;
  1506  Game_Map.prototype.update = function(sceneActive) {
      ...
  1521  }
  1522  }

### C133 ADR:228 game/js/plugins/DEUS_Anim.js:1605-1631 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - After a combat death, the unit is removed by DEUS_Anim: either by its `Game_Map.update` death queue (`DEUS_Anim.js:702`, `:714`, `:1504-1522`) or by its `onUnitDeath` wrapper (`:1605-1631`, removal at `:1624`).
  1605  if (C && typeof C.onUnitDeath === "function" && !isWrap(C.onUnitDeath)) {
  1606  const orig = C.onUnitDeath;
  1607  C.onUnitDeath = markWrap(function(victim) {
      ...
  1630  }
  1631  }, orig);

### C134 ADR:228 game/js/plugins/DEUS_Anim.js:1624 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - After a combat death, the unit is removed by DEUS_Anim: either by its `Game_Map.update` death queue (`DEUS_Anim.js:702`, `:714`, `:1504-1522`) or by its `onUnitDeath` wrapper (`:1605-1631`, removal at `:1624`).
  1624  w.removeUnit(id);

### C135 ADR:229 game/js/plugins/DEUS_Culling.js:292-307 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - DEUS_Culling wraps `World.update`, `addUnit`, `removeUnit`, `moveUnitToLevel` and `reconcileEvents` so they run inside the spriteset (`DEUS_Culling.js:292-307`).
   292  function installLifecycle() {
   293  const world = UF.World;
   294  if (!world) return;
      ...
   306  world[name] = wrapped;
   307  }

### C136 ADR:230 game/js/plugins/DEUS_Tiles.js:505-512 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - DEUS_Tiles replaces `Tilemap.isWaterTile`, writes tileset passability into `$dataTilesets` (`DEUS_Tiles.js:505-512`), and wraps `World.buildArea` (`:1247-1256`).
   505  for (let s = 768; s < 1024; s++) flags[s] = 0;
   506  
   507  // Recognize all A1 water autotiles as water throughout engine systems
   508  Tilemap.isWaterTile = function(tileId) {
   509  return Tilemap.isTileA1(tileId);
   510  };
   511  
   512  $dataTilesets[TILESET_ID] = {

### C137 ADR:230 game/js/plugins/DEUS_Tiles.js:1247-1256 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - DEUS_Tiles replaces `Tilemap.isWaterTile`, writes tileset passability into `$dataTilesets` (`DEUS_Tiles.js:505-512`), and wraps `World.buildArea` (`:1247-1256`).
  1247  if (buildHookRegistered) return;
  1248  if (window.UF && UF.World && UF.World.buildArea) {
  1249  const origBuild = UF.World.buildArea;
      ...
  1255  if (UF.World.on) {
  1256  UF.World.on("world:tileChanged", (area, x, y, layer, tileId) => {

### C138 ADR:231 game/js/plugins/DEUS_Camera.js:85-93 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - DEUS_Camera replaces `isNearTheScreen` (`DEUS_Camera.js:85-93`). That function gates RMMZ event self-movement (`rmmz_objects.js:9220-9224`).
    85  Game_CharacterBase.prototype.isNearTheScreen = function() {
    86  const gw = Graphics.width;
    87  const gh = Graphics.height;
      ...
    92  return px >= -gw && px <= gw && py >= -gh && py <= gh;
    93  };

### C139 ADR:231 game/js/rmmz_objects.js:9220-9224 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - DEUS_Camera replaces `isNearTheScreen` (`DEUS_Camera.js:85-93`). That function gates RMMZ event self-movement (`rmmz_objects.js:9220-9224`).
  9220  Game_Event.prototype.updateSelfMovement = function() {
  9221  if (
  9222  !this._locked &&
  9223  this.isNearTheScreen() &&
  9224  this.checkStop(this.stopCountThreshold())

### C140 ADR:234 game/js/plugins/DEUS_World.js:599-689 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Terrain reads go through RMMZ-format `$dataMap` builds (`World.buildArea`, `DEUS_World.js:599-689`), cached 6 deep (`:800-809`; `peekArea`, `:811-822`).
   599  World.buildArea = function(ax, ay, z = 0) {
   600  const st = this.state;
   601  if (!st || !this.inWorld(ax, ay, z)) return null;
      ...
   688  return map;
   689  };

### C141 ADR:234 game/js/plugins/DEUS_World.js:800-809 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Terrain reads go through RMMZ-format `$dataMap` builds (`World.buildArea`, `DEUS_World.js:599-689`), cached 6 deep (`:800-809`; `peekArea`, `:811-822`).
   800  const buildCache = new Map();
   801  const PEEK_CACHE = 6;
   802  const cacheKey = (ax, ay, z = 0) => (World.state ? `${World.state.seed}:${levelKey(ax, ay, z)}` : "");
      ...
   808  while (buildCache.size > PEEK_CACHE) buildCache.delete(buildCache.keys().next().value);
   809  };

### C142 ADR:234 game/js/plugins/DEUS_World.js:811-822 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Terrain reads go through RMMZ-format `$dataMap` builds (`World.buildArea`, `DEUS_World.js:599-689`), cached 6 deep (`:800-809`; `peekArea`, `:811-822`).
   811  World.peekArea = function(ax, ay, z = 0) {
   812  if (!this.state || !this.inWorld(ax, ay, z)) return null;
   813  const key = cacheKey(ax, ay, z);
      ...
   821  return map;
   822  };

### C143 ADR:235 game/js/plugins/DEUS_World.js:2819-2820 (bare, file from 1 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Builds kept for off-screen reads "may be older than the generators' inputs" (`:2819-2820`).
  2819  // return from another scene) still rebuilds it, as before. Builds made only for off-screen reads are never shown
  2820  // (they may be older than the generators' inputs, e.g. one made during world:created).

### C144 ADR:236 game/js/plugins/DEUS_World.js:535-539 (bare, file from 2 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - The viewed level *is* the RMMZ map id (`viewLevel`, `:535-539`), so a level switch is a map transfer (`DEUS_Levels.js:4179-4193` → `DEUS_World.js:2724-2730`). Lane N is removing that.
   535  World.viewLevel = () => {
   536  if (!window.$gameMap || !World.state) return null;
   537  const id = $gameMap.mapId();
   538  if (viewMemo.id !== id || viewMemo.state !== World.state) viewMemo = { id, state: World.state, level: Object.freeze(World.levelOfMapId(id)) };
   539  return viewMemo.level;

### C145 ADR:236 game/js/plugins/DEUS_Levels.js:4179-4193 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - The viewed level *is* the RMMZ map id (`viewLevel`, `:535-539`), so a level switch is a map transfer (`DEUS_Levels.js:4179-4193` → `DEUS_World.js:2724-2730`). Lane N is removing that.
  4179  function setView(z, opts = {}) {
  4180  const W = World();
  4181  const v = W && W.viewLevel();
      ...
  4192  return true;
  4193  }

### C146 ADR:236 game/js/plugins/DEUS_World.js:2724-2730 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - The viewed level *is* the RMMZ map id (`viewLevel`, `:535-539`), so a level switch is a map transfer (`DEUS_Levels.js:4179-4193` → `DEUS_World.js:2724-2730`). Lane N is removing that.
  2724  World.transferView = function(ax, ay, x, y, dir, z) {
  2725  const v = this.viewLevel();
  2726  const lz = z === undefined ? (v ? v.z : 0) : z;
  2727  if (!this.state || !this.inWorld(ax, ay, lz)) return false;
  2728  $gamePlayer.reserveTransfer(this.areaMapId(ax, ay, lz), x, y, dir || $gamePlayer.direction(), 2);
  2729  return true;
  2730  };

### C147 ADR:240 game/js/plugins/DEUS_NaturalConnections.js:312-329 OK
section: 1.4 Conservation holes found
claim: - **NaturalConnections creates water.** `addFluid` writes water into the lower cell without removing any from the upper cell (`DEUS_NaturalConnections.js:312-329`, called at `:352-353`). This happens every 30 frames for each wet link.
   312  function addFluid(r, type = "water") {
   313  if (!validCell(r)) return false;
   314  const fs = fluidsState();
      ...
   328  }
   329  return true;

### C148 ADR:240 game/js/plugins/DEUS_NaturalConnections.js:352-353 (bare, file from 0 line(s) back) OK
section: 1.4 Conservation holes found
claim: - **NaturalConnections creates water.** `addFluid` writes water into the lower cell without removing any from the upper cell (`DEUS_NaturalConnections.js:312-329`, called at `:352-353`). This happens every 30 frames for each wet link.
   352  if (isWater(upper)) {
   353  addFluid(lower, "water");

### C149 ADR:241 game/js/plugins/DEUS_Fluid.js:896-923 OK
section: 1.4 Conservation holes found
claim: - **Fluid reconciliation loses water.** It moves excess fluid up and sideways, and any excess still left afterwards is dropped (`DEUS_Fluid.js:896-923`).
   896  // Displace excess fluid into open neighbor or cell above to preserve mass conservation
   897  if (excess > 0) {
   898  if (z < Z_MAX) {
      ...
   922  }
   923  }

### C150 ADR:242 game/js/plugins/DEUS_Ecology.js:736-752 OK
section: 1.4 Conservation holes found
claim: - **Ecology creates ore.** Sprouts turn `rocks_small` into ironstone, copper or gold outcrops (`DEUS_Ecology.js:736-752`). The file's own header says ore is finite (`:20`), and so does INV-SIM-03 (`docs/INVARIANT_REGISTRY.md:53`).
   736  const SPROUT_DEFS = {
   737  0: [
   738  { sprout: "sapling", matures: ["oak", "pine", "birch", "fruit_tree"], weights: [5, 2, 2, 1], delay: 120 },
      ...
   751  ]
   752  };

### C151 ADR:242 game/js/plugins/DEUS_Ecology.js:20 (bare, file from 0 line(s) back) OK
section: 1.4 Conservation holes found
claim: - **Ecology creates ore.** Sprouts turn `rocks_small` into ironstone, copper or gold outcrops (`DEUS_Ecology.js:736-752`). The file's own header says ore is finite (`:20`), and so does INV-SIM-03 (`docs/INVARIANT_REGISTRY.md:53`).
    20  * bushes/plants. Ore, stone, gems, ruins, and constructed objects are finite.

### C152 ADR:242 docs/INVARIANT_REGISTRY.md:53 OK
section: 1.4 Conservation holes found
claim: - **Ecology creates ore.** Sprouts turn `rocks_small` into ironstone, copper or gold outcrops (`DEUS_Ecology.js:736-752`). The file's own header says ore is finite (`:20`), and so does INV-SIM-03 (`docs/INVARIANT_REGISTRY.md:53`).
    53  | **INV-SIM-03** | **Finite Material Conservation** | Finite resources (wood, stone, metal ore, soil) originate from discrete physical entities or strata; they cannot be fabricated without material cost. | `DEUS_Items.js

### C153 ADR:243 game/js/plugins/DEUS_Levels.js:1700-1702 OK
section: 1.4 Conservation holes found
claim: - **Destroying a stratum deletes its matter.** A destroyed stratum becomes air (`DEUS_Levels.js:1700-1702`). Its debris is only named in the `levels:strataDestroyed` event (`:1720-1722`); "no item drops in 19A" (`:1001-1002`). This is a LIFE-001 hole (`docs/RISK_REGISTER.md:60`) that §16 closes.
  1700  out.destroyed = true;
  1701  out.debris = mat.debris;
  1702  rec[REC_M + s] = M_AIR;

### C154 ADR:243 game/js/plugins/DEUS_Levels.js:1720-1722 (bare, file from 0 line(s) back) OK
section: 1.4 Conservation holes found
claim: - **Destroying a stratum deletes its matter.** A destroyed stratum becomes air (`DEUS_Levels.js:1700-1702`). Its debris is only named in the `levels:strataDestroyed` event (`:1720-1722`); "no item drops in 19A" (`:1001-1002`). This is a LIFE-001 hole (`docs/RISK_REGISTER.md:60`) that §16 closes.
  1720  stats.strataDestroyed++;
  1721  emit("levels:strataDestroyed", { area: { x: ax, y: ay }, x, y, z, stratum: r.stratum, material: r.material, constructed: r.constructed,
  1722  debris: r.debris, damageType, source });

### C155 ADR:243 game/js/plugins/DEUS_Levels.js:1001-1002 (bare, file from 0 line(s) back) OK
section: 1.4 Conservation holes found
claim: - **Destroying a stratum deletes its matter.** A destroyed stratum becomes air (`DEUS_Levels.js:1700-1702`). Its debris is only named in the `levels:strataDestroyed` event (`:1720-1722`); "no item drops in 19A" (`:1001-1002`). This is a LIFE-001 hole (`docs/RISK_REGISTER.md:60`) that §16 closes.
  1001  // type (a type not listed: 1); support is what a full-HP stratum carries (0..1); debris is what a destroyed stratum
  1002  // leaves, reported in levels:strataDestroyed (no item drops in 19A).

### C156 ADR:243 docs/RISK_REGISTER.md:60 OK
section: 1.4 Conservation holes found
claim: - **Destroying a stratum deletes its matter.** A destroyed stratum becomes air (`DEUS_Levels.js:1700-1702`). Its debris is only named in the `levels:strataDestroyed` event (`:1720-1722`); "no item drops in 19A" (`:1001-1002`). This is a LIFE-001 hole (`docs/RISK_REGISTER.md:60`) that §16 closes.
    60  | `LIFE-001` | Physical Matter Leakage in Lifecycle | Simulation | Matter silently deleted or leaked when constructions collapse, erode, or naturalize. | `CRITICAL` | Breaks mass-conservation; world hollows out over cent

### C157 ADR:246 game/js/plugins/DEUS_Colonists.js:648-670 OK
section: 1.4 Conservation holes found
claim: - a barter-credit ledger (`DEUS_Colonists.js:648-670`);
   648  // Internal Barter & Credit Ledger
   649  // Producers (woodcutters, miners, farmers) earn credit delivering raw materials,
   650  // specialists craft finished tools/gear, and colonists trade within the settlement.
      ...
   669  ledger.credits -= amount;
   670  ledger.spent = (ledger.spent || 0) + amount;

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

### C160 ADR:251 game/js/plugins/DEUS_Core.js:448-468 OK
section: 1.4 Conservation holes found
claim: - the clock's sub-minute `_timer` (the save holds hour..year only, `DEUS_Core.js:448-468`);
   448  DataManager.makeSaveContents = function() {
   449  const contents = _DataManager_makeSaveContents.call(this);
   450  contents.deusTime = {
      ...
   467  return contents;
   468  };

### C161 ADR:252 game/js/plugins/DEUS_Fluid.js:846-866 OK
section: 1.4 Conservation holes found
claim: - the Fluid queue order (cells are woken again in record order, `DEUS_Fluid.js:846-866`);
   846  extractSaveContents(saved) {
   847  this.reset();
   848  if (!saved) return;
      ...
   865  }
   866  },

### C162 ADR:253 game/js/plugins/DEUS_World.js:2915 OK
section: 1.4 Conservation holes found
claim: - unit path plans (dropped on load, `DEUS_World.js:2915`);
  2915  clearPaths(true); // plans are runtime only: a loaded game plans again

### C163 ADR:254 game/js/plugins/DEUS_TimeSpeed.js:54 OK
section: 1.4 Conservation holes found
claim: - TimeSpeed timers, which are closures held in a Map (`DEUS_TimeSpeed.js:54`, `:84-95`).
    54  const timers = new Map(); // id -> { due, fn, every }

### C164 ADR:254 game/js/plugins/DEUS_TimeSpeed.js:84-95 (bare, file from 0 line(s) back) OK
section: 1.4 Conservation holes found
claim: - TimeSpeed timers, which are closures held in a Map (`DEUS_TimeSpeed.js:54`, `:84-95`).
    84  after(frames, fn) {
    85  const id = nextId++;
    86  timers.set(id, { due: ticks + Math.max(1, frames | 0), fn, every: 0 });
      ...
    94  return id;
    95  },

### C165 ADR:259 game/js/plugins/DEUS_World.js:187-211 OK
section: 1.5 What exists to build on
claim: - `hash32` (FNV-1a) and `mulberry32` (`DEUS_World.js:187-211`);
   187  function hash32(...parts) {
   188  let h = 2166136261 >>> 0;
   189  for (const part of parts) {
      ...
   210  };
   211  }

### C166 ADR:260 game/js/plugins/DEUS_World.js:545-548 (bare, file from 1 line(s) back) OK
section: 1.5 What exists to build on
claim: - `World.rngFor(ax, ay, salt)` (`:545-548`);
   545  World.rngFor = function(ax, ay, salt = 0) {
   546  const s = typeof salt === "string" ? hashString(salt) : salt;
   547  return mulberry32(hash32(this.state.seed, ax, ay, s));
   548  };

### C167 ADR:261 game/js/plugins/DEUS_World.js:556 (bare, file from 2 line(s) back) OK
section: 1.5 What exists to build on
claim: - the generator rule "never Math.random" (`:556`).
   556  * Generators must be deterministic: use ctx.rng / UF.World.rngFor / hashes of coordinates only, never Math.random.

### C168 ADR:263 game/js/plugins/DEUS_World.js:429 OK
section: 1.5 What exists to build on
claim: - units (`nextUnitId`, `DEUS_World.js:429`, `:1133`);
   429  nextUnitId: 1,

### C169 ADR:263 game/js/plugins/DEUS_World.js:1133 (bare, file from 0 line(s) back) OK
section: 1.5 What exists to build on
claim: - units (`nextUnitId`, `DEUS_World.js:429`, `:1133`);
  1133  const id = st.nextUnitId++;

### C170 ADR:264 game/js/plugins/DEUS_Items.js:304 OK
section: 1.5 What exists to build on
claim: - items (`DEUS_Items.js:304`);
   304  const item = { id: st.nextId++, type: t.id, count: Math.max(1, count | 0), area: null, x: 0, y: 0, z: 0, holder: null, container: null };

### C171 ADR:265 game/js/plugins/DEUS_Jobs.js:101-107 OK
section: 1.5 What exists to build on
claim: - jobs (`DEUS_Jobs.js:101-107`);
   101  // State: UF.World.state.jobs = { nextId, list: [job] }
   102  
   103  function jobState() {
   104  const W = World();
   105  if (!W || !W.state) return null;
   106  if (!W.state.jobs) W.state.jobs = { nextId: 1, list: [] };
   107  return W.state.jobs;

### C172 ADR:266 game/js/plugins/DEUS_Fire.js:214 OK
section: 1.5 What exists to build on
claim: - fires (`DEUS_Fire.js:214`).
   214  f = W.state.fire = { version: PROVENANCE_VERSION, beat: 0, nextFireId: 1, burning: {}, fires: {}, sources: {}, wet: {} };

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

### C179 ADR:270 tools/test_liquid_depth_simulation.js:121-125 OK
section: 1.5 What exists to build on
claim: - DEUS_Fluid runs alone in a vm (`tools/test_liquid_depth_simulation.js:121-125`) and exports `module.exports` (`DEUS_Fluid.js:1025-1026`).
   121  vm.createContext(sandbox);
   122  
   123  // Load DEUS_Fluid
   124  const fluidCode = fs.readFileSync(path.join(PLUGINS, "DEUS_Fluid.js"), "utf8");
   125  vm.runInContext(fluidCode, sandbox, { filename: "DEUS_Fluid.js" });

### C180 ADR:270 game/js/plugins/DEUS_Fluid.js:1025-1026 OK
section: 1.5 What exists to build on
claim: - DEUS_Fluid runs alone in a vm (`tools/test_liquid_depth_simulation.js:121-125`) and exports `module.exports` (`DEUS_Fluid.js:1025-1026`).
  1025  if (typeof module !== "undefined" && module.exports) {
  1026  module.exports = Fluid;

### C181 ADR:271 tools/bench_history_sim.js:13 OK
section: 1.5 What exists to build on
claim: - World, WorldGen, Factions, History and Levels run in a vm with throwing engine stubs and a throwing `Math.random` (`tools/bench_history_sim.js:13`, `:37-122`, `:66-67`). But that tool exits 1 at `ebeec892` (§14.1).
    13  const MODULES = ["World", "WorldGen", "Factions", "History", "Levels"];

### C182 ADR:271 tools/bench_history_sim.js:37-122 @ebeec892 (bare, file from 0 line(s) back) OK
section: 1.5 What exists to build on
claim: - World, WorldGen, Factions, History and Levels run in a vm with throwing engine stubs and a throwing `Math.random` (`tools/bench_history_sim.js:13`, `:37-122`, `:66-67`). But that tool exits 1 at `ebeec892` (§14.1).
    37  function sourceBundle() {
    38  const files = {};
    39  const read = file => (files[file] = fs.readFileSync(path.join(ROOT, file), "utf8"));
      ...
   121  env.UF.Factions.generate(state);
   122  assert(state.factions && state.factions.list.length && env.UF.WorldGen.cellInfo(128, 128), "Missing real factions/terrain");

### C183 ADR:271 tools/bench_history_sim.js:66-67 @ebeec892 (bare, file from 0 line(s) back) OK
section: 1.5 What exists to build on
claim: - World, WorldGen, Factions, History and Levels run in a vm with throwing engine stubs and a throwing `Math.random` (`tools/bench_history_sim.js:13`, `:37-122`, `:66-67`). But that tool exits 1 at `ebeec892` (§14.1).
    66  const math = Object.create(Math);
    67  math.random = () => { throw new Error("Unseeded Math.random in benchmark execution"); };

### C184 ADR:304 game/js/plugins/DEUS_Fog.js:119 OK
section: 2.1 What is sim and what is render
claim: | Fog-of-war display, minimap discovery bitsets, selection, the UI state of plans and zones | render (saved in `deusView`, §11) | They move out of `World.state` (`DEUS_Fog.js:119`, `DEUS_Minimap.js:840-843`, `DEUS_Select.js:321`, `:3411` (a test path), `DEUS_Levels.js:4203-4204`) |
   119  if (window.UF && UF.World && UF.World.state) return (UF.World.state.fog = UF.World.state.fog || {});

### C185 ADR:304 game/js/plugins/DEUS_Minimap.js:840-843 OK
section: 2.1 What is sim and what is render
claim: | Fog-of-war display, minimap discovery bitsets, selection, the UI state of plans and zones | render (saved in `deusView`, §11) | They move out of `World.state` (`DEUS_Fog.js:119`, `DEUS_Minimap.js:840-843`, `DEUS_Select.js:321`, `:3411` (a test path), `DEUS_Levels.js:4203-4204`) |
   840  contents.ufWorld = contents.ufWorld || {};
   841  contents.ufWorld.minimapDiscovery = {};
   842  for (const k in _state.discovery) {
   843  contents.ufWorld.minimapDiscovery[k] = encodeBitset(_state.discovery[k]);

### C186 ADR:304 game/js/plugins/DEUS_Select.js:321 OK
section: 2.1 What is sim and what is render
claim: | Fog-of-war display, minimap discovery bitsets, selection, the UI state of plans and zones | render (saved in `deusView`, §11) | They move out of `World.state` (`DEUS_Fog.js:119`, `DEUS_Minimap.js:840-843`, `DEUS_Select.js:321`, `:3411` (a test path), `DEUS_Levels.js:4203-4204`) |
   321  W.state.select = {

### C187 ADR:304 game/js/plugins/DEUS_Select.js:3411 (bare, file from 0 line(s) back) OK
section: 2.1 What is sim and what is render
claim: | Fog-of-war display, minimap discovery bitsets, selection, the UI state of plans and zones | render (saved in `deusView`, §11) | They move out of `World.state` (`DEUS_Fog.js:119`, `DEUS_Minimap.js:840-843`, `DEUS_Select.js:321`, `:3411` (a test path), `DEUS_Levels.js:4203-4204`) |
  3411  W.state.view = W.state.view || {};

### C188 ADR:304 game/js/plugins/DEUS_Levels.js:4203-4204 OK
section: 2.1 What is sim and what is render
claim: | Fog-of-war display, minimap discovery bitsets, selection, the UI state of plans and zones | render (saved in `deusView`, §11) | They move out of `World.state` (`DEUS_Fog.js:119`, `DEUS_Minimap.js:840-843`, `DEUS_Select.js:321`, `:3411` (a test path), `DEUS_Levels.js:4203-4204`) |
  4203  const st = World().state;
  4204  st.view = { x: this.x, y: this.y, z: p.to };

### C189 ADR:305 game/js/plugins/DEUS_DayNight.js:121-127 OK
section: 2.1 What is sim and what is render
claim: | Screen tone and weather particles | render | Driven from the view, never written by the sim (`DEUS_DayNight.js:121-127`, `DEUS_Environment.js:690-710` today) |
   121  Game_Screen.prototype.update = function() {
   122  _Game_Screen_update.call(this);
   123  if (!DayNight.onWorldMap() || !(SceneManager._scene instanceof Scene_Map)) return;
   124  this._tone = DayNight.toneFor(DayNight.hours(), DayNight.viewZ());
   125  this._toneTarget = this._tone.slice();
   126  this._toneDuration = 0;
   127  };

### C190 ADR:305 game/js/plugins/DEUS_Environment.js:690-710 OK
section: 2.1 What is sim and what is render
claim: | Screen tone and weather particles | render | Driven from the view, never written by the sim (`DEUS_DayNight.js:121-127`, `DEUS_Environment.js:690-710` today) |
   690  if (!W) return;
   691  const lvl = typeof W.viewLevel === "function" ? W.viewLevel() : null;
   692  const z = lvl ? lvl.z : 0;
      ...
   709  $gameScreen.changeWeather(targetType, power, 60);
   710  }

### C191 ADR:338 game/js/plugins/DEUS_World.js:187-211 OK
section: 2.4 Module layout
claim: rng.js (hash32 and mulberry32, ported from DEUS_World.js:187-211; stream derivation)
   187  function hash32(...parts) {
   188  let h = 2166136261 >>> 0;
   189  for (const part of parts) {
      ...
   210  };
   211  }

### C192 ADR:341 game/js/rmmz_core.js:2672 OK
section: 2.4 Module layout
claim: tilecodes.js (a pure port of the RMMZ tile-ID helpers, rmmz_core.js:2672, :2682, :2694, :2726, :2793)
  2672  Tilemap.TILE_ID_A1 = 2048;

### C193 ADR:341 game/js/rmmz_core.js:2682 (bare, file from 0 line(s) back) OK
section: 2.4 Module layout
claim: tilecodes.js (a pure port of the RMMZ tile-ID helpers, rmmz_core.js:2672, :2682, :2694, :2726, :2793)
  2682  Tilemap.isAutotile = function(tileId) {

### C194 ADR:341 game/js/rmmz_core.js:2694 (bare, file from 0 line(s) back) OK
section: 2.4 Module layout
claim: tilecodes.js (a pure port of the RMMZ tile-ID helpers, rmmz_core.js:2672, :2682, :2694, :2726, :2793)
  2694  Tilemap.makeAutotileId = function(kind, shape) {

### C195 ADR:341 game/js/rmmz_core.js:2726 (bare, file from 0 line(s) back) OK
section: 2.4 Module layout
claim: tilecodes.js (a pure port of the RMMZ tile-ID helpers, rmmz_core.js:2672, :2682, :2694, :2726, :2793)
  2726  Tilemap.isWaterTile = function(tileId) {

### C196 ADR:341 game/js/rmmz_core.js:2793 (bare, file from 0 line(s) back) OK
section: 2.4 Module layout
claim: tilecodes.js (a pure port of the RMMZ tile-ID helpers, rmmz_core.js:2672, :2682, :2694, :2726, :2793)
  2793  Tilemap.FLOOR_AUTOTILE_TABLE = [

### C197 ADR:366 tools/bench_history_sim.js:66-67 OK
section: 2.5 How NW.js and node both load the core
claim: - **Node (tools, tests):** `readSource = fs.readFileSync`. `compile` = `vm.runInContext` inside a context that contains only the allowed built-ins, with `Math.random` replaced by a throwing function. This is how `tools/bench_history_sim.js:66-67` already blocks `Math.random`.
    66  const math = Object.create(Math);
    67  math.random = () => { throw new Error("Unseeded Math.random in benchmark execution"); };

### C198 ADR:367 game/js/plugins/DEUS_Core.js:98 OK
section: 2.5 How NW.js and node both load the core
claim: - **NW.js (game):** `DEUS_SimHost.js` gets `loader.js` through NW.js's `require` (the same mechanism `DEUS_Core.js:98` already uses). It passes `readSource` from `fs` and a `compile` built on `Function("module", "exports", "require", src)`, so the core objects live in the page's JS realm. PIXI never has to handle typed arrays from another realm.
    98  require(p);

### C199 ADR:384 docs/INVARIANT_REGISTRY.md:52 OK
section: 2.6 Keeping the `UF.*` facades stable during migration
claim: 2. **Two clocks.** During the hybrid period, legacy systems still run on `Game_Map.update` in the *engine-frame* time domain (60 × speed per second). Core systems run in the *sim-tick* domain (10 × speed per second). INV-SIM-02 (`docs/INVARIANT_REGISTRY.md:52`) requires every timer to name its domain. The determinism guarantees in §3.10 and §10 cover the core alone, not the hybrid.
    52  | **INV-SIM-02** | **Explicit Multi-Domain Time** | Every timer and scheduled event must declare its explicit domain: `action`, `historical`, `presentation`, or `engine`. No ambiguous naked tick counters. | `DEUS_Core.js

### C200 ADR:409 docs/ARCHITECTURE.md:18 OK
section: 3.1 Tick rate: 10 Hz, one tick = 100 ms of 1x game-time
claim: - **20 Hz** (`docs/ARCHITECTURE.md:18`) doubles the cost and still doesn't make 16- or 10-frame cadences integral.
    18  | **TIME** | `UF_Time.js`, `UF_TimeSpeed.js` | Multi-domain clocks: Engine (20 Hz computation), Tactical Action (6s d20 round), Historical (1s = 2h aging), Presentation (60m solar cycle). Pause enforcement. |

### C201 ADR:414 game/js/plugins/DEUS_Core.js:60-61 OK
section: 3.2 Calendar
claim: - One tick is **36 game-seconds**. The Owner's scale is 1 real minute = 6 game hours (`DEUS_Core.js:60-61`), so:
    60  // 240 real seconds / 1440 game minutes = 1/6 real seconds per game minute (10 frames at 60 FPS).
    61  const timeSpeed = params["TimeSpeed"] && params["TimeSpeed"] !== "1.0" ? parseFloat(params["TimeSpeed"]) : (1.0 / 6.0);

### C202 ADR:424 game/js/plugins/DEUS_Core.js:321-325 OK
section: 3.2 Calendar
claim: - The calendar rules themselves (months, seasons, the current year-per-day rule at `DEUS_Core.js:321-325`) are not changed by this ADR. They are ported as they are. Q12 is about the conflicting year definition.
   321  while (this.hour >= 24) {
   322  this.hour -= 24;
   323  this.day++;
   324  this.year++; // 1 day/night cycle per year
   325  this.onDayPass();

### C203 ADR:430 game/js/plugins/DEUS_World.js:136 OK
section: 3.3 Converting today's cadences
claim: | Unit step | 16 | `DEUS_World.js:136` | speed 375 milli-cells per tick (3.75 cells/s, the same as today) |
   136  unitStepFrames: Math.max(1, num("UnitStepFrames", 16))

### C204 ADR:431 game/js/plugins/DEUS_World.js:140 OK
section: 3.3 Converting today's cadences
claim: | Stuck limit | 300 | `DEUS_World.js:140` | 50 |
   140  const STUCK_LIMIT = 300; // frames a unit on screen may fail to move before its goal is dropped

### C205 ADR:432 game/js/plugins/DEUS_Ecology.js:996 OK
section: 3.3 Converting today's cadences
claim: | Ecology beat | 60 | `DEUS_Ecology.js:996` | 10 |
   996  if (_beatFrame >= 60) {

### C206 ADR:433 game/js/plugins/DEUS_Fire.js:138-140 OK
section: 3.3 Converting today's cadences
claim: | Fire beat (default) | 60 | `DEUS_Fire.js:138-140` | 10 |
   138  const beatFrames = () => {
   139  return (conf() && conf().beatFrames) || 60;
   140  };

### C207 ADR:434 game/js/plugins/DEUS_Environment.js:52 OK
section: 3.3 Converting today's cadences
claim: | Environment step | 60 | `DEUS_Environment.js:52` | 10 |
    52  const TICKS_PER_STEP = 60; // 1 beat / 1 game second

### C208 ADR:435 game/js/plugins/DEUS_Colonists.js:48 OK
section: 3.3 Converting today's cadences
claim: | Needs / sweep | 60 / 30 | `DEUS_Colonists.js:48`, `:63` | 10 / 5 |
    48  const NEEDS_EVERY = 60;         // ticks per needs tick (one game minute)

### C209 ADR:435 game/js/plugins/DEUS_Colonists.js:63 (bare, file from 0 line(s) back) OK
section: 3.3 Converting today's cadences
claim: | Needs / sweep | 60 / 30 | `DEUS_Colonists.js:48`, `:63` | 10 / 5 |
    63  const SWEEP_EVERY = 30;         // ticks between sweeps of the colonist list for idle workers

### C210 ADR:436 game/js/plugins/DEUS_Factions.js:632 OK
section: 3.3 Converting today's cadences
claim: | Faction contact | 120 | `DEUS_Factions.js:632` | 20 |
   632  const CONTACT_EVERY = 120; // frames (2 s at x1)

### C211 ADR:437 game/js/plugins/DEUS_NaturalConnections.js:512 OK
section: 3.3 Converting today's cadences
claim: | NaturalConnections | 30 | `DEUS_NaturalConnections.js:512` | 5 |
   512  if (Graphics.frameCount % 30 === 0) {

### C212 ADR:438 game/js/plugins/DEUS_Projects.js:38 OK
section: 3.3 Converting today's cadences
claim: | Projects cycle | 3000 | `DEUS_Projects.js:38` | 500 |
    38  cadenceTicks: 3000,      // map updates between full cycles (~50 s at 60 updates/s); domain "action"

### C213 ADR:439 game/js/plugins/DEUS_Fluid.js:55 OK
section: 3.3 Converting today's cadences
claim: | Fluid budget | 512 cells per call | `DEUS_Fluid.js:55`, `:1016-1019` | 3072 cells per tick (same throughput) |
    55  const DEFAULT_BUDGET = 512;

### C214 ADR:439 game/js/plugins/DEUS_Fluid.js:1016-1019 (bare, file from 0 line(s) back) OK
section: 3.3 Converting today's cadences
claim: | Fluid budget | 512 cells per call | `DEUS_Fluid.js:55`, `:1016-1019` | 3072 cells per tick (same throughput) |
  1016  Game_Map.prototype.update = function(sceneActive) {
  1017  _Game_Map_update.call(this, sceneActive);
  1018  Fluid.tick();
  1019  };

### C215 ADR:440 game/js/plugins/DEUS_Core.js:60-62 OK
section: 3.3 Converting today's cadences
claim: | Calendar minute | 10 | `DEUS_Core.js:60-62`, `:304-311` | derived: `tick × 36 s` |
    60  // 240 real seconds / 1440 game minutes = 1/6 real seconds per game minute (10 frames at 60 FPS).
    61  const timeSpeed = params["TimeSpeed"] && params["TimeSpeed"] !== "1.0" ? parseFloat(params["TimeSpeed"]) : (1.0 / 6.0);
    62  const startHour = parseInt(params["StartHour"] || 8, 10);

### C216 ADR:440 game/js/plugins/DEUS_Core.js:304-311 (bare, file from 0 line(s) back) OK
section: 3.3 Converting today's cadences
claim: | Calendar minute | 10 | `DEUS_Core.js:60-62`, `:304-311` | derived: `tick × 36 s` |
   304  update() {
   305  if (this.isPaused || $gameMessage.isBusy()) return;
   306  this._timer += 1 / 60; // Assuming 60fps
   307  if (this._timer >= timeSpeed) {
   308  this._timer -= timeSpeed;
   309  this.advanceMinute(1);
   310  }
   311  }

### C217 ADR:448 game/js/plugins/DEUS_TimeSpeed.js:158-173 OK
section: 3.4 The accumulator (host, once per displayed frame)
claim: - TimeSpeed replaces `SceneManager.update` without calling the function it captured (`DEUS_TimeSpeed.js:158-173`). So SimHost must load **after** TimeSpeed in `plugins.js` and wrap whichever function is current.
   158  const _SceneManager_update = SceneManager.update;
   159  SceneManager.update = function(deltaTime) {
   160  try {
      ...
   172  }
   173  };

### C218 ADR:471 game/js/plugins/DEUS_TimeSpeed.js:46-47 OK
section: 3.5 Speeds
claim: - **16x and 32x.** Today they are forced into the list (`DEUS_TimeSpeed.js:46-47`). They stay "best effort": if the guard in §3.7 caps them, the HUD shows the effective rate. Whether to keep them is Q3.
    46  if (!speedList.includes(16)) speedList.push(16);
    47  if (!speedList.includes(32)) speedList.push(32);

### C219 ADR:472 game/js/plugins/DEUS_TimeSpeed.js:147-153 OK
section: 3.5 Speeds
claim: - **Removing the repeat hack.** The `determineRepeatNumber` × speed hack (`DEUS_TimeSpeed.js:147-153`) and the sub-tick split (`:155-185`, `:231-241`) are removed *when the last legacy sim system has migrated* (§8, Increment 4.last). From then on, RMMZ updates presentation once per frame and the speed exists only in the accumulator.
   147  const _determineRepeatNumber = SceneManager.determineRepeatNumber;
   148  SceneManager.determineRepeatNumber = function(deltaTime) {
   149  const n = _determineRepeatNumber.call(this, deltaTime);
   150  const scene = this._scene;
   151  const running = scene instanceof Scene_Map && scene.isActive() && !paused && !$gameMessage.isBusy() && !$gamePlayer.isTransferring();
   152  return running ? n * SPEEDS[index] : n;
   153  };

### C220 ADR:472 game/js/plugins/DEUS_TimeSpeed.js:155-185 (bare, file from 0 line(s) back) OK
section: 3.5 Speeds
claim: - **Removing the repeat hack.** The `determineRepeatNumber` × speed hack (`DEUS_TimeSpeed.js:147-153`) and the sub-tick split (`:155-185`, `:231-241`) are removed *when the last legacy sim system has migrated* (§8, Increment 4.last). From then on, RMMZ updates presentation once per frame and the speed exists only in the accumulator.
   155  let currentSubTick = 0;
   156  let totalSubTicks = 1;
   157  
      ...
   184  _SceneManager_updateEffekseer.call(this);
   185  };

### C221 ADR:472 game/js/plugins/DEUS_TimeSpeed.js:231-241 (bare, file from 0 line(s) back) OK
section: 3.5 Speeds
claim: - **Removing the repeat hack.** The `determineRepeatNumber` × speed hack (`DEUS_TimeSpeed.js:147-153`) and the sub-tick split (`:155-185`, `:231-241`) are removed *when the last legacy sim system has migrated* (§8, Increment 4.last). From then on, RMMZ updates presentation once per frame and the speed exists only in the accumulator.
   231  const _Scene_Map_update = Scene_Map.prototype.update;
   232  Scene_Map.prototype.update = function() {
   233  if (SPEEDS[index] > 1 && totalSubTicks > 1 && currentSubTick < totalSubTicks - 1) {
      ...
   240  return;
   241  }

### C222 ADR:521 game/js/plugins/DEUS_World.js:1709-1710 OK
section: 3.9 Render interpolation and the movement model
claim: - A step costs 1000 when straight and 1400 when diagonal. That is exactly the 5:7 octile ratio the current A* planner uses (`DEUS_World.js:1709-1710`, "octile costs (5 straight, 7 diagonal)").
  1709  // A* over an area's whole grid, 8-way (VISION V3; 4-way with UF_Movement8D's FourWay), octile costs (5 straight,
  1710  // 7 diagonal), binary heap, typed arrays allocated once and stamped per search. A diagonal step is planned only when

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

### C225 ADR:557 game/js/plugins/DEUS_Fluid.js:184 OK
section: 4.1 `SimView`: versioned, read-only, no copying
claim: - **Revision counters.** `view.rev(layer, ax, ay, z)` returns an integer that goes up on every change to that layer on that level. Fluid already keeps one (`data.revision`, `DEUS_Fluid.js:184`, `:671`). Renderers skip work while it is unchanged.
   184  revision: 1

### C226 ADR:557 game/js/plugins/DEUS_Fluid.js:671 (bare, file from 0 line(s) back) OK
section: 4.1 `SimView`: versioned, read-only, no copying
claim: - **Revision counters.** `view.rev(layer, ax, ay, z)` returns an integer that goes up on every change to that layer on that level. Fluid already keeps one (`data.revision`, `DEUS_Fluid.js:184`, `:671`). Renderers skip work while it is unchanged.
   671  data.revision++;

### C227 ADR:575 game/js/plugins/DEUS_World.js:613 OK
section: 4.2 Layers per (area, z)
claim: | `object` | object type per cell (the `Uint16Array` grid, today `ufObjects`, `DEUS_World.js:613`) | seed + `objectDiffs` |
   613  const objects = new Uint16Array(cells);

### C228 ADR:603 game/js/plugins/DEUS_Core.js:256-272 OK
section: 4.3 Change feed: preallocated and allocation-free
claim: - Today every listener call on a `world:*` event is timed and written to a log with `appendFileSync` (`DEUS_Core.js:256-272`, `:268`), and `world:unitMoved` fires on every unit step (`DEUS_World.js:1418-1420`). The translated path must not keep that per-event file write (§9).
   256  },
   257  emit(event, ...args) {
   258  if (!this._listeners[event]) return;
      ...
   271  }
   272  }

### C229 ADR:603 game/js/plugins/DEUS_Core.js:268 (bare, file from 0 line(s) back) OK
section: 4.3 Change feed: preallocated and allocation-free
claim: - Today every listener call on a `world:*` event is timed and written to a log with `appendFileSync` (`DEUS_Core.js:256-272`, `:268`), and `world:unitMoved` fires on every unit step (`DEUS_World.js:1418-1420`). The translated path must not keep that per-event file write (§9).
   268  require('fs').appendFileSync('game_runtime.log', `${new Date().toISOString()} [EVENT ${event}] #${i} (${name}) took ${dur.toFixed(1)}ms\n`);

### C230 ADR:603 game/js/plugins/DEUS_World.js:1418-1420 OK
section: 4.3 Change feed: preallocated and allocation-free
claim: - Today every listener call on a `world:*` event is timed and written to a log with `appendFileSync` (`DEUS_Core.js:256-272`, `:268`), and `world:unitMoved` fires on every unit step (`DEUS_World.js:1418-1420`). The translated path must not keep that per-event file write (§9).
  1418  function notifyMoved(u, fx, fy) {
  1419  if (u.x !== fx || u.y !== fy) emit("world:unitMoved", u, { x: fx, y: fy }, { x: u.x, y: u.y });
  1420  }

### C231 ADR:655 game/js/plugins/DEUS_Environment.js:88 OK
section: 4.5 What each render plugin reads today, and the writes to remove
claim: | DEUS_Look | `eventsXy`, `J.of`, `O.at`, `Env.*` (`:166-367`) | all, read only | `Environment.weather` creates state lazily on a read (`DEUS_Environment.js:88`, `:120`) → the sim creates it on the tick |
    88  W.state.environment = {

### C232 ADR:655 game/js/plugins/DEUS_Environment.js:120 (bare, file from 0 line(s) back) OK
section: 4.5 What each render plugin reads today, and the writes to remove
claim: | DEUS_Look | `eventsXy`, `J.of`, `O.at`, `Env.*` (`:166-367`) | all, read only | `Environment.weather` creates state lazily on a read (`DEUS_Environment.js:88`, `:120`) → the sim creates it on the tick |
   120  if (st && st.weatherByArea) st.weatherByArea[areaKey(area)] = w;

### C233 ADR:661 game/js/plugins/DEUS_World.js:535-539 OK
section: 4.6 RMMZ map builds are projections (links to Lane N)
claim: - It adds one requirement for SIM.00.03: the viewed level becomes a host variable that the core never reads. Today the view level *is* `$gameMap.mapId()` (`DEUS_World.js:535-539`).
   535  World.viewLevel = () => {
   536  if (!window.$gameMap || !World.state) return null;
   537  const id = $gameMap.mapId();
   538  if (viewMemo.id !== id || viewMemo.state !== World.state) viewMemo = { id, state: World.state, level: Object.freeze(World.levelOfMapId(id)) };
   539  return viewMemo.level;

### C234 ADR:678 game/js/plugins/DEUS_World.js:155 OK
section: 5.1 The region grid
claim: | legacy: today's saves (`DEUS_World.js:155`) | −2..+2 | 5 | 3 | 192 |
   155  const LEVELS = Object.freeze([-2, -1, 0, 1, 2]);

### C235 ADR:683 docs/OWNER_DECISIONS.md:172-195 OK
section: 5.1 The region grid
claim: - **Bands.** DEC-013 as amended (`docs/OWNER_DECISIONS.md:172-195`) splits the 32 layers into five vertical biome bands with the ranges below (`docs/OWNER_DECISIONS.md:186-191`). DEC-013 records the Z range (`:193`) and the assignment of biomes and races to bands (`:194-195`) as OPEN. The Rev 3 brief and directive 0028-AC also call the band ranges PM defaults, OPEN for the Owner, so this ADR treats them as data that may change:
   172  ### Decision `DEC-013`: Thirty-Two Z Layers, Nine Races, Home Layer Ranges, Five Biome Bands, and Governing Scale
   173  - **Date Logged:** 2026-09-26 (Amended 01:10 CT per Owner Directive 0021-V Addendum §12–§13; supersedes 9-layer baseline)
   174  - **Status:** `DECIDED` (Owner ruling 00:34, 00:37, 01:06–01:10 CT)
      ...
   194  - **Race-to-Band/Layer-Range Mapping:** Which specific race occupies which home layer range. Status: `OPEN` (Owner assigns).
   195  - **Biome Assignment per Band:** Mapping of the 25 specific biomes into the 5 bands. Status: `OPEN` (Owner assigns).

### C236 ADR:683 docs/OWNER_DECISIONS.md:186-191 OK
section: 5.1 The region grid
claim: - **Bands.** DEC-013 as amended (`docs/OWNER_DECISIONS.md:172-195`) splits the 32 layers into five vertical biome bands with the ranges below (`docs/OWNER_DECISIONS.md:186-191`). DEC-013 records the Z range (`:193`) and the assignment of biomes and races to bands (`:194-195`) as OPEN. The Rev 3 brief and directive 0028-AC also call the band ranges PM defaults, OPEN for the Owner, so this ADR treats them as data that may change:
   186  7. **Five Vertical Biome Bands Spanning 32 Layers:** The 25 pipeline biomes are partitioned into 5 vertical bands of 5 biomes each across the 32 layers (-16..+15, surface at 0):
   187  - **Lower-2 (Deep Caverns):** Layers -16..-9 (8 layers, 5 biomes)
   188  - **Lower-1 (Shallow Underground):** Layers -8..-1 (8 layers, 5 biomes)
   189  - **Surface:** Layers 0..+3 (4 layers: ground, hills, low buildings; 5 biomes)
   190  - **Upper-1 (Low Sky / Towers / Canopy):** Layers +4..+9 (6 layers, 5 biomes)
   191  - **Upper-2 (High Sky / Peaks / Cloud Realm):** Layers +10..+15 (6 layers, 5 biomes)

### C237 ADR:683 docs/OWNER_DECISIONS.md:193 (bare, file from 0 line(s) back) OK
section: 5.1 The region grid
claim: - **Bands.** DEC-013 as amended (`docs/OWNER_DECISIONS.md:172-195`) splits the 32 layers into five vertical biome bands with the ranges below (`docs/OWNER_DECISIONS.md:186-191`). DEC-013 records the Z range (`:193`) and the assignment of biomes and races to bands (`:194-195`) as OPEN. The Rev 3 brief and directive 0028-AC also call the band ranges PM defaults, OPEN for the Owner, so this ADR treats them as data that may change:
   193  - **Z-Range Coordinate Mapping:** Default `-16..+15` (surface = 0). Status: `OPEN` (PM default).

### C238 ADR:683 docs/OWNER_DECISIONS.md:194-195 (bare, file from 0 line(s) back) OK
section: 5.1 The region grid
claim: - **Bands.** DEC-013 as amended (`docs/OWNER_DECISIONS.md:172-195`) splits the 32 layers into five vertical biome bands with the ranges below (`docs/OWNER_DECISIONS.md:186-191`). DEC-013 records the Z range (`:193`) and the assignment of biomes and races to bands (`:194-195`) as OPEN. The Rev 3 brief and directive 0028-AC also call the band ranges PM defaults, OPEN for the Owner, so this ADR treats them as data that may change:
   194  - **Race-to-Band/Layer-Range Mapping:** Which specific race occupies which home layer range. Status: `OPEN` (Owner assigns).
   195  - **Biome Assignment per Band:** Mapping of the 25 specific biomes into the 5 bands. Status: `OPEN` (Owner assigns).

### C239 ADR:697 game/js/plugins/DEUS_Minimap.js:56-58 OK
section: 5.1 The region grid
claim: 1. **They align with the minimap.** The minimap chunk is 16×16 (`DEUS_Minimap.js:56-58`), so one region is exactly 2×2 chunks.
    56  const CHUNK_SIZE = 16;
    57  const CHUNKS_PER_ROW = 16; // 256 / 16
    58  const TOTAL_CHUNKS = 256;

### C240 ADR:700 game/js/plugins/DEUS_Camera.js:35-51 OK
section: 5.1 The region grid
claim: - Zoom is locked at 1.0 (`DEUS_Camera.js:35-51`).
    35  levels: [1],
    36  officialScale: 1.0,
    37  calibratorVisible: false,
      ...
    50  
    51  zoomOut: () => false,

### C241 ADR:805 game/js/plugins/DEUS_Ecology.js:214 OK
section: 6. Summary Simulation
claim: | **Wildlife and monsters** (anonymous) | unit records; herd membership lives on the unit (`u.data.herd`, `DEUS_Ecology.js:214`, `:672-678`) | **buckets** `count[species][ageBand][sex]` (`Uint16`) per region; herd records `{herdId, species, lastBirth, members per bucket}` keep today's fields (`:722`) | Ecology's rules applied to counts: its hourly breeding (`stepBreeding`, called from `tickHour`, `DEUS_Ecology.js:897-905`) and its six-hourly population roll with caps (`:907-914`); migration between adjacent L2 regions by a deterministic rule; every change goes through the ledger |
   214  for (const u of W.units()) if (u.data && u.data.kind === "creature") maxHerd = Math.max(maxHerd, u.data.herd | 0);

### C242 ADR:805 game/js/plugins/DEUS_Ecology.js:672-678 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Wildlife and monsters** (anonymous) | unit records; herd membership lives on the unit (`u.data.herd`, `DEUS_Ecology.js:214`, `:672-678`) | **buckets** `count[species][ageBand][sex]` (`Uint16`) per region; herd records `{herdId, species, lastBirth, members per bucket}` keep today's fields (`:722`) | Ecology's rules applied to counts: its hourly breeding (`stepBreeding`, called from `tickHour`, `DEUS_Ecology.js:897-905`) and its six-hourly population roll with caps (`:907-914`); migration between adjacent L2 regions by a deterministic rule; every change goes through the ledger |
   672  const units = W.unitsInArea(area.x, area.y).filter(u => u.data && u.data.kind === "creature");
   673  const herds = new Map();
   674  for (const u of units) {
   675  const hId = u.data.herd | 0;
   676  if (!herds.has(hId)) herds.set(hId, []);
   677  herds.get(hId).push(u);
   678  }

### C243 ADR:805 game/js/plugins/DEUS_Ecology.js:722 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Wildlife and monsters** (anonymous) | unit records; herd membership lives on the unit (`u.data.herd`, `DEUS_Ecology.js:214`, `:672-678`) | **buckets** `count[species][ageBand][sex]` (`Uint16`) per region; herd records `{herdId, species, lastBirth, members per bucket}` keep today's fields (`:722`) | Ecology's rules applied to counts: its hourly breeding (`stepBreeding`, called from `tickHour`, `DEUS_Ecology.js:897-905`) and its six-hourly population roll with caps (`:907-914`); migration between adjacent L2 regions by a deterministic rule; every change goes through the ledger |
   722  st.herds[hId] = Object.assign(st.herds[hId] || {}, { lastBirth: at, species: sp.id });

### C244 ADR:805 game/js/plugins/DEUS_Ecology.js:897-905 OK
section: 6. Summary Simulation
claim: | **Wildlife and monsters** (anonymous) | unit records; herd membership lives on the unit (`u.data.herd`, `DEUS_Ecology.js:214`, `:672-678`) | **buckets** `count[species][ageBand][sex]` (`Uint16`) per region; herd records `{herdId, species, lastBirth, members per bucket}` keep today's fields (`:722`) | Ecology's rules applied to counts: its hourly breeding (`stepBreeding`, called from `tickHour`, `DEUS_Ecology.js:897-905`) and its six-hourly population roll with caps (`:907-914`); migration between adjacent L2 regions by a deterministic rule; every change goes through the ledger |
   897  const here = W.currentArea();
   898  const rotate = cursorArea();
   899  const seen = new Set();
      ...
   904  stepBreeding(a, at);
   905  }

### C245 ADR:805 game/js/plugins/DEUS_Ecology.js:907-914 (bare, file from 0 line(s) back) OK
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

### C246 ADR:806 game/js/plugins/DEUS_Ecology.js:127 OK
section: 6. Summary Simulation
claim: | **Flora and resources** | object grid (seed + `objectDiffs`); sprouts and regrowth records (`blankState`, `DEUS_Ecology.js:127`) | **no summary needed**: objects stay seed + diffs; sprout and regrowth records stay records; a derived per-region count per object type is kept for statistics | sprouts mature by beat count (today's rule, `:772-796`); the ore sprouts (`:736-752`) are Q7 |
   127  function blankState() {

### C247 ADR:806 game/js/plugins/DEUS_Ecology.js:772-796 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Flora and resources** | object grid (seed + `objectDiffs`); sprouts and regrowth records (`blankState`, `DEUS_Ecology.js:127`) | **no summary needed**: objects stay seed + diffs; sprout and regrowth records stay records; a derived per-region count per object type is kept for statistics | sprouts mature by beat count (today's rule, `:772-796`); the ore sprouts (`:736-752`) are Q7 |
   772  for (let i = st.sprouts.length - 1; i >= 0; i--) {
   773  const s = st.sprouts[i];
   774  if (currentBeat >= s.matureBeat) {
      ...
   795  }
   796  }

### C248 ADR:806 game/js/plugins/DEUS_Ecology.js:736-752 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Flora and resources** | object grid (seed + `objectDiffs`); sprouts and regrowth records (`blankState`, `DEUS_Ecology.js:127`) | **no summary needed**: objects stay seed + diffs; sprout and regrowth records stay records; a derived per-region count per object type is kept for statistics | sprouts mature by beat count (today's rule, `:772-796`); the ore sprouts (`:736-752`) are Q7 |
   736  const SPROUT_DEFS = {
   737  0: [
   738  { sprout: "sapling", matures: ["oak", "pine", "birch", "fruit_tree"], weights: [5, 2, 2, 1], delay: 120 },
      ...
   751  ]
   752  };

### C249 ADR:807 game/js/plugins/DEUS_Fluid.js:127-137 OK
section: 6. Summary Simulation
claim: | **Fluids** | packed depth grid: one byte per cell (`DEUS_Fluid.js:127-137`), one `Uint8Array` per level (`DEUS_Fluid.js:179`, `:187-189`); a dirty queue *per region* | **the fine cells are kept but frozen.** A region's grid is at most 2 layers × 32 × 32 = 2,048 bytes at any layer count, and none at all for a chunk with no fluid (§15.3), so dropping it would save nothing. What L2 drops is per-tick stepping. A derived **basin index** sits on top: 4-connected *wet* cells of one fluid type per z (types never mix, `:457-458`), each basin with its volume, free capacity, drain faces to z−1, and fac
   127  function getDepth(byteVal) {
   128  return byteVal & 0x07;
   129  }
      ...
   136  return ((type & 0x0F) << 4) | (depth & 0x07);
   137  }

### C250 ADR:807 game/js/plugins/DEUS_Fluid.js:179 OK
section: 6. Summary Simulation
claim: | **Fluids** | packed depth grid: one byte per cell (`DEUS_Fluid.js:127-137`), one `Uint8Array` per level (`DEUS_Fluid.js:179`, `:187-189`); a dirty queue *per region* | **the fine cells are kept but frozen.** A region's grid is at most 2 layers × 32 × 32 = 2,048 bytes at any layer count, and none at all for a chunk with no fluid (§15.3), so dropping it would save nothing. What L2 drops is per-tick stepping. A derived **basin index** sits on top: 4-connected *wet* cells of one fluid type per z (types never mix, `:457-458`), each basin with its volume, free capacity, drain faces to z−1, and fac
   179  grids: new Map(),       // z -> Uint8Array(n)

### C251 ADR:807 game/js/plugins/DEUS_Fluid.js:187-189 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Fluids** | packed depth grid: one byte per cell (`DEUS_Fluid.js:127-137`), one `Uint8Array` per level (`DEUS_Fluid.js:179`, `:187-189`); a dirty queue *per region* | **the fine cells are kept but frozen.** A region's grid is at most 2 layers × 32 × 32 = 2,048 bytes at any layer count, and none at all for a chunk with no fluid (§15.3), so dropping it would save nothing. What L2 drops is per-tick stepping. A derived **basin index** sits on top: 4-connected *wet* cells of one fluid type per z (types never mix, `:457-458`), each basin with its volume, free capacity, drain faces to z−1, and fac
   187  for (let z = Z_MIN; z <= Z_MAX; z++) {
   188  data.grids.set(z, new Uint8Array(n));
   189  data.floodGrids.set(z, new Uint8Array(n));

### C252 ADR:807 game/js/plugins/DEUS_Fluid.js:457-458 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Fluids** | packed depth grid: one byte per cell (`DEUS_Fluid.js:127-137`), one `Uint8Array` per level (`DEUS_Fluid.js:179`, `:187-189`); a dirty queue *per region* | **the fine cells are kept but frozen.** A region's grid is at most 2 layers × 32 × 32 = 2,048 bytes at any layer count, and none at all for a chunk with no fluid (§15.3), so dropping it would save nothing. What L2 drops is per-tick stepping. A derived **basin index** sits on top: 4-connected *wet* cells of one fluid type per z (types never mix, `:457-458`), each basin with its volume, free capacity, drain faces to z−1, and fac
   457  // Liquid types must match or neighbor must be dry (no mixing in V1)
   458  if (nDepth > 0 && nType !== type) continue;

### C253 ADR:808 game/js/plugins/DEUS_Fire.js:214 OK
section: 6. Summary Simulation
claim: | **Fire** | `W.state.fire.burning` records, integer fuel (`DEUS_Fire.js:214`, `:389`) | **none**: a burning cell is a focus source, so its region is at least L0/L1; demotion waits until no cell burns | — |
   214  f = W.state.fire = { version: PROVENANCE_VERSION, beat: 0, nextFireId: 1, burning: {}, fires: {}, sources: {}, wet: {} };

### C254 ADR:808 game/js/plugins/DEUS_Fire.js:389 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Fire** | `W.state.fire.burning` records, integer fuel (`DEUS_Fire.js:214`, `:389`) | **none**: a burning cell is a focus source, so its region is at least L0/L1; demotion waits until no cell burns | — |
   389  f.burning[key] = { since: f.beat, fuel: Math.max(1, Math.round(num(rule.burn, 1))), obj: type.id, fireId: provenance.fireId, parent: o.parent ? o.parent.key : null, provenance };

### C255 ADR:809 game/js/plugins/DEUS_World.js:599-689 OK
section: 6. Summary Simulation
claim: | **Geology and terrain** | strata and shapes (Levels) from seed + diffs | **none**: resident in chunk storage at every level (§15.3). A new game or a load builds it from seed + diffs, as today's builds do (`World.buildArea`, `DEUS_World.js:599-689`: generators at `:650`, diffs replayed at `:682-685`; the build cache and `peekArea`, `:800-822`) | changes only through mutation: mining, building, collapse (§16), decay (§17) |
   599  World.buildArea = function(ax, ay, z = 0) {
   600  const st = this.state;
   601  if (!st || !this.inWorld(ax, ay, z)) return null;
      ...
   688  return map;
   689  };

### C256 ADR:809 game/js/plugins/DEUS_World.js:650 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Geology and terrain** | strata and shapes (Levels) from seed + diffs | **none**: resident in chunk storage at every level (§15.3). A new game or a load builds it from seed + diffs, as today's builds do (`World.buildArea`, `DEUS_World.js:599-689`: generators at `:650`, diffs replayed at `:682-685`; the build cache and `peekArea`, `:800-822`) | changes only through mutation: mining, building, collapse (§16), decay (§17) |
   650  for (const g of generators) if (g.levels.includes(z)) g.fn(ctx);

### C257 ADR:809 game/js/plugins/DEUS_World.js:682-685 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Geology and terrain** | strata and shapes (Levels) from seed + diffs | **none**: resident in chunk storage at every level (§15.3). A new game or a load builds it from seed + diffs, as today's builds do (`World.buildArea`, `DEUS_World.js:599-689`: generators at `:650`, diffs replayed at `:682-685`; the build cache and `peekArea`, `:800-822`) | changes only through mutation: mining, building, collapse (§16), decay (§17) |
   682  const diff = st.diffs[levelKey(ax, ay, z)];
   683  if (diff) for (const i in diff) data[Number(i)] = diff[i];
   684  const odiff = st.objectDiffs && st.objectDiffs[levelKey(ax, ay, z)];
   685  if (odiff) for (const i in odiff) objects[Number(i)] = odiff[i];

### C258 ADR:809 game/js/plugins/DEUS_World.js:800-822 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Geology and terrain** | strata and shapes (Levels) from seed + diffs | **none**: resident in chunk storage at every level (§15.3). A new game or a load builds it from seed + diffs, as today's builds do (`World.buildArea`, `DEUS_World.js:599-689`: generators at `:650`, diffs replayed at `:682-685`; the build cache and `peekArea`, `:800-822`) | changes only through mutation: mining, building, collapse (§16), decay (§17) |
   800  const buildCache = new Map();
   801  const PEEK_CACHE = 6;
   802  const cacheKey = (ax, ay, z = 0) => (World.state ? `${World.state.seed}:${levelKey(ax, ay, z)}` : "");
      ...
   821  return map;
   822  };

### C259 ADR:810 game/js/plugins/DEUS_History.js:363-410 OK
section: 6. Summary Simulation
claim: | **History** | aggregate already: sites, people, dynasties (`History.generate`, `DEUS_History.js:363-410`, which calls `D.step` once per year, `:390-395`; `step` is at `DEUS_HistoricalDemographics.js:468`) | L2-native. It runs at world creation, and nothing steps it during play (the demographics header says "No listeners, automatic generation, live units, terrain edits, or save hooks", `DEUS_HistoricalDemographics.js:8-9`) | §14 |
   363  History.generate = function(world, opts = {}) {
   364  const state = world && world.state ? world.state : world;
   365  const cfg = this.config();
      ...
   409  });
   410  };

### C260 ADR:810 game/js/plugins/DEUS_History.js:390-395 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **History** | aggregate already: sites, people, dynasties (`History.generate`, `DEUS_History.js:363-410`, which calls `D.step` once per year, `:390-395`; `step` is at `DEUS_HistoricalDemographics.js:468`) | L2-native. It runs at world creation, and nothing steps it during play (the demographics header says "No listeners, automatic generation, live units, terrain edits, or save hooks", `DEUS_HistoricalDemographics.js:8-9`) | §14 |
   390  for (let year = 0; year < steps; year++) {
   391  D.step(demographics);
   392  if (typeof opts.onCheckpoint === "function") opts.onCheckpoint({ ...demographics,
   393  living: demographics.people.filter(p => p.died === null).map(p => p.id),
   394  graveyard: demographics.people.filter(p => p.died !== null).map(p => p.id) });
   395  }

### C261 ADR:810 game/js/plugins/DEUS_HistoricalDemographics.js:468 OK
section: 6. Summary Simulation
claim: | **History** | aggregate already: sites, people, dynasties (`History.generate`, `DEUS_History.js:363-410`, which calls `D.step` once per year, `:390-395`; `step` is at `DEUS_HistoricalDemographics.js:468`) | L2-native. It runs at world creation, and nothing steps it during play (the demographics header says "No listeners, automatic generation, live units, terrain edits, or save hooks", `DEUS_HistoricalDemographics.js:8-9`) | §14 |
   468  function step(state, conditions = {}) {

### C262 ADR:810 game/js/plugins/DEUS_HistoricalDemographics.js:8-9 OK
section: 6. Summary Simulation
claim: | **History** | aggregate already: sites, people, dynasties (`History.generate`, `DEUS_History.js:363-410`, which calls `D.step` once per year, `:390-395`; `step` is at `DEUS_HistoricalDemographics.js:468`) | L2-native. It runs at world creation, and nothing steps it during play (the demographics header says "No listeners, automatic generation, live units, terrain edits, or save hooks", `DEUS_HistoricalDemographics.js:8-9`) | §14 |
     8  * HIST-01/minimum HIST-02/HIST-09. No listeners, automatic generation, live units,
     9  * terrain edits, or save hooks. create(world, options) imports canonical

### C263 ADR:811 game/js/plugins/DEUS_Jobs.js:101-107 OK
section: 6. Summary Simulation
claim: | **Jobs and projects** | records (`W.state.jobs`, `DEUS_Jobs.js:101-107`; projects, `DEUS_Projects.js:179-189`) | records unchanged. Jobs with an assigned worker are focus sources (L0). Unassigned jobs need no stepping | non-player factions' jobs (future) accrue abstract work per coarse tick |
   101  // State: UF.World.state.jobs = { nextId, list: [job] }
   102  
   103  function jobState() {
   104  const W = World();
   105  if (!W || !W.state) return null;
   106  if (!W.state.jobs) W.state.jobs = { nextId: 1, list: [] };
   107  return W.state.jobs;

### C264 ADR:811 game/js/plugins/DEUS_Projects.js:179-189 OK
section: 6. Summary Simulation
claim: | **Jobs and projects** | records (`W.state.jobs`, `DEUS_Jobs.js:101-107`; projects, `DEUS_Projects.js:179-189`) | records unchanged. Jobs with an assigned worker are focus sources (L0). Unassigned jobs need no stepping | non-player factions' jobs (future) accrue abstract work per coarse tick |
   179  // State: UF.World.state.colony.projects = { version, nextId, list: [project] }
   180  
   181  function colony() {
      ...
   188  if (!c.projects && create) c.projects = { version: 1, nextId: 1, list: [] };
   189  return c.projects || null;

### C265 ADR:812 game/js/plugins/DEUS_Items.js:304 OK
section: 6. Summary Simulation
claim: | **Items and containers** | records with integer `count` (`DEUS_Items.js:304`) | **records unchanged**: never aggregated, and they need no stepping at rest | — |
   304  const item = { id: st.nextId++, type: t.id, count: Math.max(1, count | 0), area: null, x: 0, y: 0, z: 0, holder: null, container: null };

### C266 ADR:813 game/js/plugins/DEUS_Environment.js:88 OK
section: 6. Summary Simulation
claim: | **Environment** | weather per area (`DEUS_Environment.js:88`, `:120`); thermal state per unit | ambient temperature is a boundary condition, derived from season and biome, not a stock; unit thermal stays with the (tracked) unit | re-derived |
    88  W.state.environment = {

### C267 ADR:813 game/js/plugins/DEUS_Environment.js:120 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Environment** | weather per area (`DEUS_Environment.js:88`, `:120`); thermal state per unit | ambient temperature is a boundary condition, derived from season and biome, not a stock; unit thermal stays with the (tracked) unit | re-derived |
   120  if (st && st.weatherByArea) st.weatherByArea[areaKey(area)] = w;

### C268 ADR:814 game/js/plugins/DEUS_Factions.js:656-660 OK
section: 6. Summary Simulation
claim: | **Factions** | contact checks (`DEUS_Factions.js:656-660`); integer population counters (`:194`, `:594-625`) | contact between tracked units in the same L2 region is resolved at the coarse tick; counters must equal tracked + bucket members (§7.8) | co-location test |
   656  const _Game_Map_update = Game_Map.prototype.update;
   657  Game_Map.prototype.update = function(sceneActive) {
   658  _Game_Map_update.call(this, sceneActive);
   659  if (++contactFrame % CONTACT_EVERY === 0) Factions.checkContact();
   660  };

### C269 ADR:814 game/js/plugins/DEUS_Factions.js:194 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Factions** | contact checks (`DEUS_Factions.js:656-660`); integer population counters (`:194`, `:594-625`) | contact between tracked units in the same L2 region is resolved at the coarse tick; counters must equal tracked + bucket members (§7.8) | co-location test |
   194  population: founders // every faction starts as its founders (VISION V4, 2026-09-19)

### C270 ADR:814 game/js/plugins/DEUS_Factions.js:594-625 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Factions** | contact checks (`DEUS_Factions.js:656-660`); integer population counters (`:194`, `:594-625`) | contact between tracked units in the same L2 region is resolved at the coarse tick; counters must equal tracked + bucket members (§7.8) | co-location test |
   594  UF.Events.on("factions:born", child => {
   595  if (child && child.data && child.data.faction && !child.data._popCounted) {
   596  child.data._popCounted = true;
      ...
   624  }
   625  });

### C271 ADR:837 game/js/plugins/DEUS_World.js:187-211 OK
section: 7.2 Deterministic seeding
claim: - **Stream.** Every expansion uses `rng = mulberry32(hash32(seed, STREAM_LOD, ax, ay, ri, epoch))`, the existing primitives (`DEUS_World.js:187-211`).
   187  function hash32(...parts) {
   188  let h = 2166136261 >>> 0;
   189  for (const part of parts) {
      ...
   210  };
   211  }

### C272 ADR:851 game/js/plugins/DEUS_Fluid.js:517-532 OK
section: 7.3 Promotion (L2 → L1)
claim: - The region's inflow buffer (§7.7) is released into its border cells in canonical order, up to each cell's capacity (0..7, `fluidCapacityAt`, `DEUS_Fluid.js:517-532`).
   517  fluidCapacityAt(a, b, c, d, e) {
   518  parseCoords(a, b, c, d, e);
   519  if (qZ < Z_MIN || qZ > Z_MAX) return 0;
      ...
   531  return DEPTH_MAX;
   532  },

### C273 ADR:852 game/js/plugins/DEUS_Fluid.js:896-923 OK
section: 7.3 Promotion (L2 → L1)
claim: - If a cell holds more than its capacity, for example because a wall was built while the region was L2, the excess is displaced the way Fluid's reconciliation does it (`DEUS_Fluid.js:896-923`). But an excess that finds no room is kept in the region's **reservoir counter** instead of being dropped. It is never deleted, and it is placed again at the next coarse tick.
   896  // Displace excess fluid into open neighbor or cell above to preserve mass conservation
   897  if (excess > 0) {
   898  if (z < Z_MAX) {
      ...
   922  }
   923  }

### C274 ADR:857 game/js/plugins/DEUS_Ecology.js:463-470 OK
section: 7.3 Promotion (L2 → L1)
claim: - are chosen outside protected zones, reusing Ecology's `candidateValid` rules (`DEUS_Ecology.js:463-470`);
   463  function candidateValid(area, x, y, species, kind) {
   464  const W = World(), wild = Wildlife();
   465  if (!W || !W.state || !wild || !species || !W.inWorld(area.x, area.y)) return false;
   466  if (x < 0 || y < 0 || x >= W.state.size || y >= W.state.size) return false;
   467  if (!W.cellFree(area.x, area.y, x, y)) return false;
   468  if (campCellBlocked(area, x, y)) return false;
   469  if (protectedReason(area, x, y, kind)) return false;
   470  const gx = area.x * W.state.size + x, gy = area.y * W.state.size + y;

### C275 ADR:876 game/js/plugins/DEUS_World.js:1133 OK
section: 7.4 Demotion (L1 → L2)
claim: - the record is deleted and its ID *retired*, with reason `ABSORBED`. `nextUnitId` never reuses an ID (`DEUS_World.js:1133`).
  1133  const id = st.nextUnitId++;

### C276 ADR:877 game/js/plugins/DEUS_Factions.js:619-625 OK
section: 7.4 Demotion (L1 → L2)
claim: - Absorption **does not emit `world:unitRemoved`**. To legacy listeners that event means the unit has left the world, and Factions lowers its population for a removed unit that is dead or dying (`DEUS_Factions.js:619-625`). An absorbed unit is still in the world, as a bucket member counted in Q-FACTPOP (§7.8). The feed carries `UNIT_REMOVED` with cause `LOD_ABSORB` instead, and the legacy translation (§4.3) maps it to no legacy event.
   619  UF.Events.on("world:unitRemoved", u => {
   620  if (u && u.data && u.data.faction && (u.data.dead || u.data._isDying) && !u.data._popDeducted) {
   621  u.data._popDeducted = true;
   622  const f = Factions.get(u.data.faction);
   623  if (f && f.population > 0) f.population--;
   624  }
   625  });

### C277 ADR:884 docs/systems/UF_History.md:102 OK
section: 7.5 Tracked units and named persons
claim: - it has `data.historicalPersonId` (`docs/systems/UF_History.md:102`);
   102  1. **Historical subject identity.** Resolve a selected citizen through `data.historicalPersonId`, then use History's canonical records. Add a historical-person subject to the existing Sheet Record view so ancestors can b

### C278 ADR:888 game/js/plugins/DEUS_World.js:1136-1137 OK
section: 7.5 Tracked units and named persons
claim: - it carries items or equipment (`data.inventory`, `data.equipment`, `DEUS_World.js:1136-1137`);
  1136  if (!data.equipment) data.equipment = {};
  1137  if (!data.inventory) data.inventory = [];

### C279 ADR:899 game/js/plugins/DEUS_World.js:1739 OK
section: 7.6 In-flight jobs and paths
claim: - **Path plans become saved data** (§10.7): `{goal, cells: Int32Array, i, legs}`. Today they live only in the runtime `pathCache` (`DEUS_World.js:1739`), and loading drops them (`:2915`).
  1739  const pathCache = new Map();   // unit id -> { key, cells: Int32Array, i, end, partial, legs, wait, fails, avoid, stale }

### C280 ADR:899 game/js/plugins/DEUS_World.js:2915 (bare, file from 0 line(s) back) OK
section: 7.6 In-flight jobs and paths
claim: - **Path plans become saved data** (§10.7): `{goal, cells: Int32Array, i, legs}`. Today they live only in the runtime `pathCache` (`DEUS_World.js:1739`), and loading drops them (`:2915`).
  2915  clearPaths(true); // plans are runtime only: a loaded game plans again

### C281 ADR:925 game/js/plugins/DEUS_Fluid.js:9-18 OK
section: 7.8 Conserved quantities
claim: | Q-WATER | water volume | depth unit (1/7 of a full cell, `DEUS_Fluid.js:9-18`; `DEPTH_MAX = 7`, `:50`). Under DEC-013 a full cell is 5 × 5 × 10 ft, so one unit is 250/7 ft³; the integer unit does not change (§15.0) | low 3 bits of a `Uint8` per cell at every level (L2 keeps the cells, frozen), plus the `Uint32` reservoir and inflow buffers per region |
     9  * @help
    10  * DEUS_Fluid.js - 0..7 Volumetric Fluid Simulation
    11  *
      ...
    17  *    - 5-6: Deep (impassable without swimming)
    18  *    - 7: Submerged / Full (impassable without swimming)

### C282 ADR:925 game/js/plugins/DEUS_Fluid.js:50 (bare, file from 0 line(s) back) OK
section: 7.8 Conserved quantities
claim: | Q-WATER | water volume | depth unit (1/7 of a full cell, `DEUS_Fluid.js:9-18`; `DEPTH_MAX = 7`, `:50`). Under DEC-013 a full cell is 5 × 5 × 10 ft, so one unit is 250/7 ft³; the integer unit does not change (§15.0) | low 3 bits of a `Uint8` per cell at every level (L2 keeps the cells, frozen), plus the `Uint32` reservoir and inflow buffers per region |
    50  const DEPTH_MAX = 7;

### C283 ADR:931 game/js/plugins/DEUS_Items.js:304 OK
section: 7.8 Conserved quantities
claim: | Q-ITEM[type, material] | items | count | integer `count` (`DEUS_Items.js:304`) |
   304  const item = { id: st.nextId++, type: t.id, count: Math.max(1, count | 0), area: null, x: 0, y: 0, z: 0, holder: null, container: null };

### C284 ADR:934 game/js/plugins/DEUS_Fire.js:389 OK
section: 7.8 Conserved quantities
claim: | Q-FUEL | burning fuel | fuel units | integer per burning cell (`DEUS_Fire.js:389`) |
   389  f.burning[key] = { since: f.beat, fuel: Math.max(1, Math.round(num(rule.burn, 1))), obj: type.id, fireId: provenance.fireId, parent: o.parent ? o.parent.key : null, provenance };

### C285 ADR:935 game/js/plugins/DEUS_Colonists.js:5389 OK
section: 7.8 Conserved quantities
claim: | Q-FOOD, Q-DRINK | nourishment held by units | milli-units | today `foodLb` / `waterGal` are floats rounded to 0.001 (`DEUS_Colonists.js:5389`, `:5410-5411`); the needs sub-lane converts them to integer milli-units |
  5389  u.data.needs.waterGal = Math.round(((u.data.needs.waterGal || 0) + WATER_GAL_PER_DAY) * 1000) / 1000; // one drink is a gallon

### C286 ADR:935 game/js/plugins/DEUS_Colonists.js:5410-5411 (bare, file from 0 line(s) back) OK
section: 7.8 Conserved quantities
claim: | Q-FOOD, Q-DRINK | nourishment held by units | milli-units | today `foodLb` / `waterGal` are floats rounded to 0.001 (`DEUS_Colonists.js:5389`, `:5410-5411`); the needs sub-lane converts them to integer milli-units |
  5410  u.data.needs.foodLb = Math.round(((u.data.needs.foodLb || 0) + (lb > 0 ? lb : 0.2)) * 1000) / 1000;
  5411  if (gal > 0) u.data.needs.waterGal = Math.round(((u.data.needs.waterGal || 0) + gal) * 1000) / 1000;

### C287 ADR:948 docs/OWNER_DECISIONS.md:262 OK
section: 7.8 Conserved quantities
claim: - **Conjured matter** (*create water*, *wall of stone*) is DEC-018's open sub-question (`docs/OWNER_DECISIONS.md:262`). The ledger supports the PM default as it stands: a magical source or sink with its own cause, like rain. If the Owner rules otherwise, only the cause table changes (§18.6).
   262  - **Open Sub-Question (PM default):** Conjured matter (*create water*, *wall of stone*) versus LIFE-001 mass conservation. The default is that conjured matter is an explicitly modelled magical source/sink, logged in the 

### C288 ADR:950 docs/RISK_REGISTER.md:61 OK
section: 7.8 Conserved quantities
claim: - **LIFE-002.** No transform may output an *ore* form (`docs/RISK_REGISTER.md:61`). Oxidised metal becomes a trace-mineral sediment form. A test fails any transform table entry whose output is an ore material.
    61  | `LIFE-002` | Accidental Finite Resource Respawning | Simulation / Economy | Naturalization or pedogenesis accidentally fabricating fresh metal ore veins (Fe, Cu, Ag, Au, Pt). | `CRITICAL` | Destroys economic scarcity; 

### C289 ADR:987 game/js/plugins/DEUS_Core.js:321-325 OK
section: 7.9 Ledger checks and tolerances
claim: | Run length | "100 game years" as the calendar defines them when SIM.30.05 starts (Q12). Today's code has 1 year = 1 game day = 2,400 ticks (`DEUS_Core.js:321-325`), which gives 240,000 ticks |
   321  while (this.hour >= 24) {
   322  this.hour -= 24;
   323  this.day++;
   324  this.year++; // 1 day/night cycle per year
   325  this.onDayPass();

### C290 ADR:1000 game/js/plugins/DEUS_Sheet.js:833-846 OK
section: 8. Migration Increments
claim: | **3** | SIM.00.04 | Units, paths and movement in the core (§3.9); `Game_Event` becomes a puppet; one movement model; path plans saved; D&D stats assigned at unit creation (removes the `DEUS_Sheet.js:833-846` write) | the DoD 1-4 list, with DoD 1 run headless and goals given as commands (Jobs is still legacy then); a default-speed unit covers 3.75 ±0.1 cells per real second at 1x on a straight corridor (today's rate both on and off screen at speed 4, §1.3); a speed-modified unit moves at the same rate watched or not | revert; flag `sim.systems.units = "legacy"` for one increment |
   833  const Dnd = window.UF && UF.Dnd5e;
   834  let dnd = d.dnd || null;
   835  if (!dnd && Dnd && typeof Dnd.assignClass === "function") {
      ...
   845  d.savingThrows = dnd.savingThrows;
   846  }

### C291 ADR:1001 game/js/plugins/DEUS_Anim.js:1504-1522 OK
section: 8. Migration Increments
claim: | **4.1…4.n** | SIM.00.05/`<system>` | One system per sub-lane, in dependency order: **terrain (the Levels strata writer, World diffs and objects; chunked storage §15.3) → fluid → natural connections → fire → environment → ecology → needs → jobs → projects → combat (with the Anim death lifecycle, `DEUS_Anim.js:1504-1522`, `:1605-1631`) → factions contact → ownership (`DEUS_Ownership.js:613`) → timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`)**. The last sub-lane removes the TimeSpeed repeat hack (§3.5). Terrain, ownership, timers and the Anim lifecycle are not in the WBS SIM.00.05 list (Q2). Ter
  1504  let lastBeat = -1;
  1505  const _Game_Map_update = Game_Map.prototype.update;
  1506  Game_Map.prototype.update = function(sceneActive) {
      ...
  1521  }
  1522  }

### C292 ADR:1001 game/js/plugins/DEUS_Anim.js:1605-1631 (bare, file from 0 line(s) back) OK
section: 8. Migration Increments
claim: | **4.1…4.n** | SIM.00.05/`<system>` | One system per sub-lane, in dependency order: **terrain (the Levels strata writer, World diffs and objects; chunked storage §15.3) → fluid → natural connections → fire → environment → ecology → needs → jobs → projects → combat (with the Anim death lifecycle, `DEUS_Anim.js:1504-1522`, `:1605-1631`) → factions contact → ownership (`DEUS_Ownership.js:613`) → timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`)**. The last sub-lane removes the TimeSpeed repeat hack (§3.5). Terrain, ownership, timers and the Anim lifecycle are not in the WBS SIM.00.05 list (Q2). Ter
  1605  if (C && typeof C.onUnitDeath === "function" && !isWrap(C.onUnitDeath)) {
  1606  const orig = C.onUnitDeath;
  1607  C.onUnitDeath = markWrap(function(victim) {
      ...
  1630  }
  1631  }, orig);

### C293 ADR:1001 game/js/plugins/DEUS_Ownership.js:613 OK
section: 8. Migration Increments
claim: | **4.1…4.n** | SIM.00.05/`<system>` | One system per sub-lane, in dependency order: **terrain (the Levels strata writer, World diffs and objects; chunked storage §15.3) → fluid → natural connections → fire → environment → ecology → needs → jobs → projects → combat (with the Anim death lifecycle, `DEUS_Anim.js:1504-1522`, `:1605-1631`) → factions contact → ownership (`DEUS_Ownership.js:613`) → timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`)**. The last sub-lane removes the TimeSpeed repeat hack (§3.5). Terrain, ownership, timers and the Anim lifecycle are not in the WBS SIM.00.05 list (Q2). Ter
   613  Game_Map.prototype.update = function(sceneActive) {

### C294 ADR:1001 game/js/plugins/DEUS_TimeSpeed.js:84-95 OK
section: 8. Migration Increments
claim: | **4.1…4.n** | SIM.00.05/`<system>` | One system per sub-lane, in dependency order: **terrain (the Levels strata writer, World diffs and objects; chunked storage §15.3) → fluid → natural connections → fire → environment → ecology → needs → jobs → projects → combat (with the Anim death lifecycle, `DEUS_Anim.js:1504-1522`, `:1605-1631`) → factions contact → ownership (`DEUS_Ownership.js:613`) → timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`)**. The last sub-lane removes the TimeSpeed repeat hack (§3.5). Terrain, ownership, timers and the Anim lifecycle are not in the WBS SIM.00.05 list (Q2). Ter
    84  after(frames, fn) {
    85  const id = nextId++;
    86  timers.set(id, { due: ticks + Math.max(1, frames | 0), fn, every: 0 });
      ...
    94  return id;
    95  },

### C295 ADR:1001 game/js/plugins/DEUS_TimeSpeed.js:188-203 (bare, file from 0 line(s) back) OK
section: 8. Migration Increments
claim: | **4.1…4.n** | SIM.00.05/`<system>` | One system per sub-lane, in dependency order: **terrain (the Levels strata writer, World diffs and objects; chunked storage §15.3) → fluid → natural connections → fire → environment → ecology → needs → jobs → projects → combat (with the Anim death lifecycle, `DEUS_Anim.js:1504-1522`, `:1605-1631`) → factions contact → ownership (`DEUS_Ownership.js:613`) → timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`)**. The last sub-lane removes the TimeSpeed repeat hack (§3.5). Terrain, ownership, timers and the Anim lifecycle are not in the WBS SIM.00.05 list (Q2). Ter
   188  const _Game_Map_update = Game_Map.prototype.update;
   189  Game_Map.prototype.update = function(sceneActive) {
   190  _Game_Map_update.call(this, sceneActive);
      ...
   202  }
   203  };

### C296 ADR:1008 docs/worldgen/DEUS_WORLDGEN_WBS.md:105 OK
section: 8. Migration Increments
claim: | **Z** | WG.00.17 (WBS Rev 24, `docs/worldgen/DEUS_WORLDGEN_WBS.md:105`) | Z range as one setting, then 32 layers (−16..+15) with sparse storage and a 9-layer test mode, as the row says. It lands on the legacy plugins after Lanes K and N. The core reads the range and the band table from world state from Increment 1 on (§15.2), so it needs no change of its own | WG.00.17's DoD; every core fixture runs at −4..+4 and at −16..+15, and the save-migration fixtures at −2..+2 (§15.2); the §9 storage rows at 9 and at 32 layers | WG.00.17's own |
   105  | **WG.00.17** | Z-Range Configurable Setting & Expansion to 32 Layers | Claude | Make Z-range a single configurable setting in engine core, then expand to 32 layers (-16..+15: surface 0, 16 underground -1..-16, 15 upper

### C297 ADR:1009 docs/worldgen/DEUS_WORLDGEN_WBS.md:533-536 OK
section: 8. Migration Increments
claim: | **S1** | SIM.40.01–.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:533-536`) | Support model and blast propagation (SIM.40.01 names both), collapse, colonist behaviour, collapse QA (§16, §18), in the core. SIM.40.01's row lists WG.00.17 and SIM.00.01 as dependencies; this ADR also puts SIM.00.05/terrain first (Q15) | §16.6, §18.8 | revert; support stays passive (no collapse) and volume damage stays today's (no attenuation), as today |
   533  | SIM.40.01 | **Support model design & blast propagation** (materials, vertical propagation, span limits, cross-layer blast attenuation, V128 natural rock, V133 change-driven). Load-bearing rules, span capacities, and ve
   534  | SIM.40.02 | **Collapse event simulation** (downward cascading, rubble/talus mass conservation LIFE-001, V95 impact damage, deep-history DEC-012) | PLANNED | Directive 0021-V §6; V137; LIFE-001; V95 | dep: SIM.40.01 | C
   535  | SIM.40.03 | **Colonist structural behaviour** (props, pillars, avoid dangerous excavation) | PLANNED | Directive 0021-V §6; V137 | dep: SIM.40.02 | Claude → Grok | Colonist builders and miners respect structural suppor
   536  | SIM.40.04 | **Collapse QA & fixtures** (deterministic cave-in, tall tower +1..+4, mass conservation, perf bound) | PLANNED | Directive 0021-V §6; V137 | dep: SIM.40.02 | Claude → Grok (mutation) | Automated test suite:

### C298 ADR:1010 docs/worldgen/DEUS_WORLDGEN_WBS.md:537-541 OK
section: 8. Migration Increments
claim: | **S2** | SIM.40.05–.09 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:537-541`) | Decay, reclamation, item weathering, deep-history decay, decay QA (§17), in the core. SIM.40.08 depends on SIM.30.02 | §17.6 | revert; nothing decays, as today |
   537  | SIM.40.05 | **Decay model** (unmaintained structure HP loss by material/exposure, roofs fail first, walls fail, feeds collapse) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | SIM.40.01, dep: SIM.00.01 | Claude → Gro
   538  | SIM.40.06 | **Nature reclaiming** (vegetation invasion, soil/sediment burial, visible stages: intact -> weathered -> overgrown -> collapsed -> buried mound) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | dep: SIM.40
   539  | SIM.40.07 | **Item weathering & burial** (rot, rust, sediment burial, durable relics, LIFE-001 mass conservation, LIFE-002 no ore creation) | PLANNED | Directive 0021-V §7; V138; LIFE-001; LIFE-002 | dep: SIM.40.05 | C
   540  | SIM.40.08 | **Deep-history decay integration** (summary-level decay for fast-forward, LIFE-003 trace retention) | PLANNED | Directive 0021-V §7; V138; DEC-012; LIFE-003 | SIM.40.05, dep: SIM.30.02 | Claude → Grok | Dee
   541  | SIM.40.09 | **Decay QA & fixtures** (deterministic aging fixture, mass conservation, no ore creation, perf bound) | PLANNED | Directive 0021-V §7; V138 | SIM.40.06, SIM.40.07, dep: SIM.40.08 | Claude → Grok (mutation) 

### C299 ADR:1011 docs/worldgen/DEUS_WORLDGEN_WBS.md:559-561 OK
section: 8. Migration Increments
claim: | **E** | SIM.60.02–.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:559-561`) | The spell-effect schema (data), the runtime in the core that turns an effect into the §18.6 primitives, and the QA fixtures. SIM.60.03's dependencies are in its row (SIM.00.03, SIM.40.01–.02, fire, water, seasons, GP.07.02) | §18.8 and SIM.60.04's fixtures | revert; spells keep their SRD numbers and have no physical effect, as today |
   559  | SIM.60.02 | **Spell-effect schema** (data-driven JSON Schema of reusable primitives: ignite, heat flux, impulse/blast via SIM.40.01, fluid source/sink, temperature/freeze, mass-conserving terrain edit, light, growth/de
   560  | SIM.60.03 | **Spell-effect runtime in headless sim core** (physical propagation of heat, impulse, fluids, freezing, terrain alteration decoupled from presentation frames) | PLANNED | Directive 0028-AC §5; DEC-018 | SIM
   561  | SIM.60.04 | **Spell-effect QA fixtures** (fireball floor breach, flood down stairwell, lake freeze, stone wall vs mass ledger, SRD stat invariance) | PLANNED | Directive 0028-AC §5; DEC-018 | dep: SIM.60.03 | Claude → 

### C300 ADR:1012 docs/worldgen/DEUS_WORLDGEN_WBS.md:577 OK
section: 8. Migration Increments
claim: | **T** | GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:577`) | Cross-layer targeting in the core: line of sight, 3D range and height modifiers (§18.5). The target picker is on the host side (§19) | §18.8 | revert |
   577  | GP.07.02 | **Cross-layer 3D targeting, ballistics & volume damage** (spells, arrows, thrown items through multi-Z openings, true 3D Euclidean range, vertical impact bonus / upward range penalty, cross-layer volume blas

### C301 ADR:1013 docs/worldgen/DEUS_WORLDGEN_WBS.md:107-109 OK
section: 8. Migration Increments
claim: | **P** | WG.00.19–.21 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:107-109`) | Stratum height, ramps and occlusion. The movement rules are core (§3.9); the draw offset, camera follow and occlusion are host (§19) | their own; the §19 boundary tests | their own |
   107  | **WG.00.19** | In-Layer Height Presentation & Multi-Strata Movement | Claude / Grok | Characters/objects drawn raised by fixed pixel offset per stratum of ground height (straight shift, no scale; DEC-011/DEC-016 compli
   108  | **WG.00.20** | Seamless Inter-Layer Ramps & Camera-Follow Connector | Claude / Grok | Run of cells rising one stratum per cell (5 cells = one 10 ft layer); unit's Z becomes Z+1 at top stratum with zero transfer/fade/pa
   109  | **WG.00.21** | Layer Occlusion Culling Rule & Exposed-Area Bound | Claude / Grok | Anything covered by opaque upper layer is not drawn (tiles, units, effects). Draw cost bounded by exposed visible screen area (V133). T

### C302 ADR:1014 docs/worldgen/DEUS_WORLDGEN_WBS.md:112 OK
section: 8. Migration Increments
claim: | **R** | WG.00.24 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:112`) | The DEC-017 fallback map renderer, opened only after the Owner's go/no-go (§13) | §13.4 | the host goes back to the stock `Spriteset_Map` |
   112  | **WG.00.24** | Custom Multi-Layer PixiJS Map Renderer (Fallback) | Owner / Claude | Benchmark-gated fallback map renderer inside RMMZ Scene_Map. Replaces stock Spriteset_Map/Tilemap if stock renderer cannot meet 32 lay

### C303 ADR:1017 docs/worldgen/DEUS_WORLDGEN_WBS.md:520 OK
section: 8. Migration Increments
claim: - SIM.00.02 waits on the PM's sign-off of this ADR, the OPS.10.01 merge gate and OPS.50.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:520`).
   520  | SIM.00.02 | **Headless sim core with a fixed tick.** Engine-free modules (layout per ADR), with `sim.step()` on a fixed tick decoupled from frames. The RMMZ side feeds an accumulator | PLANNED | ADR-003 | SIM.00.01 PM 

### C304 ADR:1018 docs/worldgen/DEUS_WORLDGEN_WBS.md:521 (bare, file from 1 line(s) back) OK
section: 8. Migration Increments
claim: - SIM.00.03 also waits for Lanes N and K (`:521`).
   521  | SIM.00.03 | **Snapshot/read interface for the renderer.** A versioned read-only view of sim state (per area and Z: terrain, objects, units, fluids, fire, time) plus a change feed. Render plugins read only through it. C

### C305 ADR:1019 docs/worldgen/DEUS_WORLDGEN_WBS.md:650 OK
section: 8. Migration Increments
claim: - WG.61.01/.02 are written against the core after SIM.00.03 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:650`).
   650  - **Step 8 (WG.61.01/.02) now depends on SIM.00.03,** so the veins and conservation ledger are written against the core, not against `Game_Map.update`.

### C306 ADR:1058 docs/OWNER_DECISIONS.md:247 OK
section: 9.2 Time budgets (PENDING-K3)
claim: - **Benchmark hygiene (DEC-017, `docs/OWNER_DECISIONS.md:247`).** Each perf record notes the concurrent worker count and CPU %, and go/no-go evidence needs one quiet-machine rerun.
   247  - Benchmark hygiene note: benchmarks share CPU with other workers, so each perf record must note concurrent worker count and CPU %, and go/no-go evidence needs one quiet-machine rerun.

### C307 ADR:1076 game/js/plugins/DEUS_Core.js:264-270 OK
section: 9.2 Time budgets (PENDING-K3)
claim: - **The logging path.** The legacy `UF.Events` bridge must not keep the per-listener synchronous log write on `world:*` events (`DEUS_Core.js:264-270`). Its cost must show up in `view.read_ms` if it stays.
   264  if (dur > 20 || (typeof event === "string" && event.startsWith("world:"))) {
   265  const name = cb.name || `anon_${i}`;
   266  if (typeof require !== 'undefined') {
   267  try {
   268  require('fs').appendFileSync('game_runtime.log', `${new Date().toISOString()} [EVENT ${event}] #${i} (${name}) took ${dur.toFixed(1)}ms\n`);
   269  } catch (_) {}
   270  }

### C308 ADR:1088 game/js/plugins/DEUS_World.js:411 OK
section: 10.1 Random numbers
claim: | `World.newWorld` seed pick (`DEUS_World.js:411`, `:418`) | sim | moves to the host. The host picks the seed, passes it to `createSim`, and records it in the save and the command log |
   411  s = Math.floor(Math.random() * 0x7ffffffe) + 1;

### C309 ADR:1088 game/js/plugins/DEUS_World.js:418 (bare, file from 0 line(s) back) OK
section: 10.1 Random numbers
claim: | `World.newWorld` seed pick (`DEUS_World.js:411`, `:418`) | sim | moves to the host. The host picks the seed, passes it to `createSim`, and records it in the save and the command log |
   418  s = Math.floor(Math.random() * 0x7ffffffe) + 1;

### C310 ADR:1089 game/js/plugins/DEUS_Dnd5e.js:415 OK
section: 10.1 Random numbers
claim: | `DEUS_Dnd5e.js:415`, `:720`, `:800` fall back to `Math.random` when no `rng` is passed | sim | the core wrapper always passes a stream, and the lint fails any call from the core without one |
   415  let r = (typeof rng === "function" ? rng() : Math.random()) * total;

### C311 ADR:1089 game/js/plugins/DEUS_Dnd5e.js:720 (bare, file from 0 line(s) back) OK
section: 10.1 Random numbers
claim: | `DEUS_Dnd5e.js:415`, `:720`, `:800` fall back to `Math.random` when no `rng` is passed | sim | the core wrapper always passes a stream, and the lint fails any call from the core without one |
   720  const rng = typeof opts.rng === "function" ? opts.rng : Math.random;

### C312 ADR:1089 game/js/plugins/DEUS_Dnd5e.js:800 (bare, file from 0 line(s) back) OK
section: 10.1 Random numbers
claim: | `DEUS_Dnd5e.js:415`, `:720`, `:800` fall back to `Math.random` when no `rng` is passed | sim | the core wrapper always passes a stream, and the lint fails any call from the core without one |
   800  const rng = typeof opts.rng === "function" ? opts.rng : Math.random;

### C313 ADR:1090 game/js/plugins/DEUS_FactionMenus.js:442 OK
section: 10.1 Random numbers
claim: | `DEUS_FactionMenus.js:442`, `:468`, `:478` (New Game seed roll) | presentation | stays, and its seed is passed in |
   442  const rolled = Math.floor(Math.random() * 0x7ffffffe) + 1;

### C314 ADR:1090 game/js/plugins/DEUS_FactionMenus.js:468 (bare, file from 0 line(s) back) OK
section: 10.1 Random numbers
claim: | `DEUS_FactionMenus.js:442`, `:468`, `:478` (New Game seed roll) | presentation | stays, and its seed is passed in |
   468  return Math.floor(Math.random() * 0x7ffffffe) + 1;

### C315 ADR:1090 game/js/plugins/DEUS_FactionMenus.js:478 (bare, file from 0 line(s) back) OK
section: 10.1 Random numbers
claim: | `DEUS_FactionMenus.js:442`, `:468`, `:478` (New Game seed roll) | presentation | stays, and its seed is passed in |
   478  return Math.floor(Math.random() * 0x7ffffffe) + 1;

### C316 ADR:1091 game/js/plugins/DEUS_Visuals.js:151-171 OK
section: 10.1 Random numbers
claim: | `DEUS_Visuals.js:151-171` (barks) | presentation | stays |
   151  this._ufBarkTimer = Math.floor(Math.random() * 300) + 300; // 5-10 seconds
   152  if (this.event() && this.event().note) {
   153  const match = this.event().note.match(/<bark:\s*(.+?)>/i);
      ...
   170  if (dist <= 8) {
   171  const text = this._ufBarkList[Math.floor(Math.random() * this._ufBarkList.length)];

### C317 ADR:1095 game/js/plugins/DEUS_Fire.js:575 OK
section: 10.1 Random numbers
claim: - Fire already works this way (`hash01(seed, SALT.escape, b, x, y, d)`, `DEUS_Fire.js:575`).
   575  if (hash01(seed, SALT.escape, b, x, y, d) < info.escapeChance) {

### C318 ADR:1096 game/js/plugins/DEUS_World.js:545-548 OK
section: 10.1 Random numbers
claim: - **Batch operations** such as promotion and generation use `mulberry32` seeded by a hash (§7.2), as generators already do (`DEUS_World.js:545-548`, `:556`).
   545  World.rngFor = function(ax, ay, salt = 0) {
   546  const s = typeof salt === "string" ? hashString(salt) : salt;
   547  return mulberry32(hash32(this.state.seed, ax, ay, s));
   548  };

### C319 ADR:1096 game/js/plugins/DEUS_World.js:556 (bare, file from 0 line(s) back) OK
section: 10.1 Random numbers
claim: - **Batch operations** such as promotion and generation use `mulberry32` seeded by a hash (§7.2), as generators already do (`DEUS_World.js:545-548`, `:556`).
   556  * Generators must be deterministic: use ctx.rng / UF.World.rngFor / hashes of coordinates only, never Math.random.

### C320 ADR:1102 game/js/plugins/DEUS_World.js:800-808 OK
section: 10.2 Order of iteration
claim: - **No reads that depend on a cache.** Today `peekArea`'s LRU (`DEUS_World.js:800-808`) holds builds whose freshness depends on viewing history (`:2819-2820`). In the core, caches are keyed by input revision, and a stale build is never readable.
   800  const buildCache = new Map();
   801  const PEEK_CACHE = 6;
   802  const cacheKey = (ax, ay, z = 0) => (World.state ? `${World.state.seed}:${levelKey(ax, ay, z)}` : "");
      ...
   807  lastUsedKey = key;
   808  while (buildCache.size > PEEK_CACHE) buildCache.delete(buildCache.keys().next().value);

### C321 ADR:1102 game/js/plugins/DEUS_World.js:2819-2820 (bare, file from 0 line(s) back) OK
section: 10.2 Order of iteration
claim: - **No reads that depend on a cache.** Today `peekArea`'s LRU (`DEUS_World.js:800-808`) holds builds whose freshness depends on viewing history (`:2819-2820`). In the core, caches are keyed by input revision, and a stale build is never readable.
  2819  // return from another scene) still rebuilds it, as before. Builds made only for off-screen reads are never shown
  2820  // (they may be older than the generators' inputs, e.g. one made during world:created).

### C322 ADR:1108 game/js/plugins/DEUS_Fluid.js:733 OK
section: 10.3 Wall clock
claim: - Fluid (`DEUS_Fluid.js:733`, `:747`);
   733  const t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();

### C323 ADR:1108 game/js/plugins/DEUS_Fluid.js:747 (bare, file from 0 line(s) back) OK
section: 10.3 Wall clock
claim: - Fluid (`DEUS_Fluid.js:733`, `:747`);
   747  const elapsed = ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - t0;

### C324 ADR:1109 game/js/plugins/DEUS_Combat.js:1416-1422 OK
section: 10.3 Wall clock
claim: - Combat perf (`DEUS_Combat.js:1416-1422`);
  1416  const t0 = performance.now();
  1417  try {
  1418  step();
  1419  } catch (e) {
  1420  report("step", e);
  1421  }
  1422  const ms = performance.now() - t0;

### C325 ADR:1110 game/js/plugins/DEUS_Ecology.js:68 OK
section: 10.3 Wall clock
claim: - Ecology stats (`DEUS_Ecology.js:68`).
    68  const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

### C326 ADR:1112 game/js/plugins/DEUS_Fluid.js:55 OK
section: 10.3 Wall clock
claim: - Every work budget is a count, as with Fluid's 512 cells (`DEUS_Fluid.js:55`), never a time.
    55  const DEFAULT_BUDGET = 512;

### C327 ADR:1122 game/js/plugins/DEUS_Ecology.js:442-453 OK
section: 10.4 Floats
claim: - Example: Ecology's `Math.hypot` distance checks (`DEUS_Ecology.js:442-453`) become integer squared distances.
   442  for (const c of camps) if (sameArea(c.area, area) && Math.hypot(x - c.x, y - c.y) < campGap) return `camp ${c.id}`;
   443  for (const s of activeSites()) {
   444  if (!sameArea(s.area, area)) continue;
      ...
   452  const here = W.currentArea();
   453  if (sameArea(here, area) && window.$gamePlayer && Math.hypot(x - $gamePlayer.x, y - $gamePlayer.y) < PLAYER_CLEARANCE) return "player";

### C328 ADR:1123 game/js/plugins/DEUS_Levels.js:1764 OK
section: 10.4 Floats
claim: - Example: sphere damage today uses float falloff functions and `Math.sqrt` (`DEUS_Levels.js:1764`, `:1846`). In the core, distance is an integer squared distance in half-feet and falloff is an integer table (§18.3).
  1764  const FALLOFF = { constant: t => 1, linear: t => 1 - t, quadratic: t => (1 - t) * (1 - t) };

### C329 ADR:1123 game/js/plugins/DEUS_Levels.js:1846 (bare, file from 0 line(s) back) OK
section: 10.4 Floats
claim: - Example: sphere damage today uses float falloff functions and `Math.sqrt` (`DEUS_Levels.js:1764`, `:1846`). In the core, distance is an integer squared distance in half-feet and falloff is an integer table (§18.3).
  1846  if (d2 <= r2) hits.push([s, damage * falloff(Math.sqrt(d2) / radius)]);

### C330 ADR:1156 game/js/plugins/DEUS_World.js:2901-2905 OK
section: 11.1 Today
claim: - `contents.ufWorld = World.state` (`DEUS_World.js:2901-2905`; load `:2907-2916`), a shared bag that many plugins write into. It includes presentation state:
  2901  DataManager.makeSaveContents = function() {
  2902  const contents = _DataManager_makeSaveContents.call(this);
  2903  contents.ufWorld = World.state;
  2904  return contents;
  2905  };

### C331 ADR:1156 game/js/plugins/DEUS_World.js:2907-2916 (bare, file from 0 line(s) back) OK
section: 11.1 Today
claim: - `contents.ufWorld = World.state` (`DEUS_World.js:2901-2905`; load `:2907-2916`), a shared bag that many plugins write into. It includes presentation state:
  2907  const _DataManager_extractSaveContents = DataManager.extractSaveContents;
  2908  DataManager.extractSaveContents = function(contents) {
  2909  _DataManager_extractSaveContents.call(this, contents);
      ...
  2915  clearPaths(true); // plans are runtime only: a loaded game plans again
  2916  };

### C332 ADR:1157 game/js/plugins/DEUS_Anim.js:1075 OK
section: 11.1 Today
claim: - `anim` (`DEUS_Anim.js:1075`)
  1075  if (!a || typeof a !== "object") a = W.state.anim = { remains: [] };

### C333 ADR:1158 game/js/plugins/DEUS_Select.js:321 OK
section: 11.1 Today
claim: - `select` (`DEUS_Select.js:321`)
   321  W.state.select = {

### C334 ADR:1159 game/js/plugins/DEUS_Levels.js:4203-4204 OK
section: 11.1 Today
claim: - `view` (`DEUS_Levels.js:4203-4204`; also a Select test path, `DEUS_Select.js:3411`)
  4203  const st = World().state;
  4204  st.view = { x: this.x, y: this.y, z: p.to };

### C335 ADR:1159 game/js/plugins/DEUS_Select.js:3411 OK
section: 11.1 Today
claim: - `view` (`DEUS_Levels.js:4203-4204`; also a Select test path, `DEUS_Select.js:3411`)
  3411  W.state.view = W.state.view || {};

### C336 ADR:1160 game/js/plugins/DEUS_Fog.js:119 OK
section: 11.1 Today
claim: - `fog` (`DEUS_Fog.js:119`)
   119  if (window.UF && UF.World && UF.World.state) return (UF.World.state.fog = UF.World.state.fog || {});

### C337 ADR:1161 game/js/plugins/DEUS_Minimap.js:840-843 OK
section: 11.1 Today
claim: - `minimapDiscovery` (`DEUS_Minimap.js:840-843`)
   840  contents.ufWorld = contents.ufWorld || {};
   841  contents.ufWorld.minimapDiscovery = {};
   842  for (const k in _state.discovery) {
   843  contents.ufWorld.minimapDiscovery[k] = encodeBitset(_state.discovery[k]);

### C338 ADR:1162 game/js/plugins/DEUS_Fluid.js:821-844 OK
section: 11.1 Today
claim: - `contents.deusFluid` / `ufFluid`, as sparse records `[ax, ay, z, x, y, t, d]` (`DEUS_Fluid.js:821-844`, `:994-1011`).
   821  makeSaveContents() {
   822  const records = [];
   823  for (const [key, data] of areas.entries()) {
      ...
   843  };
   844  },

### C339 ADR:1162 game/js/plugins/DEUS_Fluid.js:994-1011 (bare, file from 0 line(s) back) OK
section: 11.1 Today
claim: - `contents.deusFluid` / `ufFluid`, as sparse records `[ax, ay, z, x, y, t, d]` (`DEUS_Fluid.js:821-844`, `:994-1011`).
   994  if (typeof DataManager !== "undefined") {
   995  const _DataManager_makeSaveContents = DataManager.makeSaveContents;
   996  DataManager.makeSaveContents = function() {
      ...
  1010  };
  1011  }

### C340 ADR:1163 game/js/plugins/DEUS_Core.js:448-468 OK
section: 11.1 Today
claim: - `contents.deusTime` / `ufTime`, holding hour through year without `_timer` (`DEUS_Core.js:448-468`, `:471-490`).
   448  DataManager.makeSaveContents = function() {
   449  const contents = _DataManager_makeSaveContents.call(this);
   450  contents.deusTime = {
      ...
   467  return contents;
   468  };

### C341 ADR:1163 game/js/plugins/DEUS_Core.js:471-490 (bare, file from 0 line(s) back) OK
section: 11.1 Today
claim: - `contents.deusTime` / `ufTime`, holding hour through year without `_timer` (`DEUS_Core.js:448-468`, `:471-490`).
   471  DataManager.extractSaveContents = function(contents) {
   472  _DataManager_extractSaveContents.call(this, contents);
   473  const _tData = contents.deusTime || contents.ufTime;
      ...
   489  }
   490  };

### C342 ADR:1165 game/js/rmmz_managers.js:389 OK
section: 11.1 Today
claim: RMMZ's own contents are saved beside these (`rmmz_managers.js:389`, `:405`). They include `$gameScreen` tone, which DayNight writes.
   389  DataManager.makeSaveContents = function() {

### C343 ADR:1165 game/js/rmmz_managers.js:405 (bare, file from 0 line(s) back) OK
section: 11.1 Today
claim: RMMZ's own contents are saved beside these (`rmmz_managers.js:389`, `:405`). They include `$gameScreen` tone, which DayNight writes.
   405  DataManager.extractSaveContents = function(contents) {

### C344 ADR:1228 game/js/plugins/DEUS_Environment.js:88 OK
section: 12.2 Risks
claim: - **R6. Hidden writes into the sim** through facade reads that create state lazily (`DEUS_Environment.js:88`, `:120`; `DEUS_Items.js:163`). The SIM.00.03 lint must also treat lazily created state as a write.
    88  W.state.environment = {

### C345 ADR:1228 game/js/plugins/DEUS_Environment.js:120 (bare, file from 0 line(s) back) OK
section: 12.2 Risks
claim: - **R6. Hidden writes into the sim** through facade reads that create state lazily (`DEUS_Environment.js:88`, `:120`; `DEUS_Items.js:163`). The SIM.00.03 lint must also treat lazily created state as a write.
   120  if (st && st.weatherByArea) st.weatherByArea[areaKey(area)] = w;

### C346 ADR:1228 game/js/plugins/DEUS_Items.js:163 OK
section: 12.2 Risks
claim: - **R6. Hidden writes into the sim** through facade reads that create state lazily (`DEUS_Environment.js:88`, `:120`; `DEUS_Items.js:163`). The SIM.00.03 lint must also treat lazily created state as a write.
   163  if (!W.state.items) W.state.items = { nextId: 1, byId: {} };

### C347 ADR:1244 docs/worldgen/DEUS_WORLDGEN_WBS.md:523 OK
section: 12.3 Open questions
claim: | Q1 | PM | Move the calendar into the core at SIM.00.02, rather than SIM.00.05 as WBS Rev 24 lists (`docs/worldgen/DEUS_WORLDGEN_WBS.md:523`)? | Yes (Increment 1) |
   523  | SIM.00.05 | **Remaining live systems into the core, one per increment.** Fluid, Ecology, Fire, Environment, NaturalConnections (fluids and creatures now run on `Graphics.frameCount` in `Scene_Map.update`, L507-515), Co

### C348 ADR:1245 game/js/plugins/DEUS_Ownership.js:613 OK
section: 12.3 Open questions
claim: | Q2 | PM | Add to SIM.00.05: terrain (the Levels strata writer, World diffs and objects; first, §8), Ownership (`DEUS_Ownership.js:613`), TimeSpeed timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`), the Anim death lifecycle (`DEUS_Anim.js:1504-1522`, `:1605-1631`)? Households runs on events only | Yes |
   613  Game_Map.prototype.update = function(sceneActive) {

### C349 ADR:1245 game/js/plugins/DEUS_TimeSpeed.js:84-95 OK
section: 12.3 Open questions
claim: | Q2 | PM | Add to SIM.00.05: terrain (the Levels strata writer, World diffs and objects; first, §8), Ownership (`DEUS_Ownership.js:613`), TimeSpeed timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`), the Anim death lifecycle (`DEUS_Anim.js:1504-1522`, `:1605-1631`)? Households runs on events only | Yes |
    84  after(frames, fn) {
    85  const id = nextId++;
    86  timers.set(id, { due: ticks + Math.max(1, frames | 0), fn, every: 0 });
      ...
    94  return id;
    95  },

### C350 ADR:1245 game/js/plugins/DEUS_TimeSpeed.js:188-203 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q2 | PM | Add to SIM.00.05: terrain (the Levels strata writer, World diffs and objects; first, §8), Ownership (`DEUS_Ownership.js:613`), TimeSpeed timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`), the Anim death lifecycle (`DEUS_Anim.js:1504-1522`, `:1605-1631`)? Households runs on events only | Yes |
   188  const _Game_Map_update = Game_Map.prototype.update;
   189  Game_Map.prototype.update = function(sceneActive) {
   190  _Game_Map_update.call(this, sceneActive);
      ...
   202  }
   203  };

### C351 ADR:1245 game/js/plugins/DEUS_Anim.js:1504-1522 OK
section: 12.3 Open questions
claim: | Q2 | PM | Add to SIM.00.05: terrain (the Levels strata writer, World diffs and objects; first, §8), Ownership (`DEUS_Ownership.js:613`), TimeSpeed timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`), the Anim death lifecycle (`DEUS_Anim.js:1504-1522`, `:1605-1631`)? Households runs on events only | Yes |
  1504  let lastBeat = -1;
  1505  const _Game_Map_update = Game_Map.prototype.update;
  1506  Game_Map.prototype.update = function(sceneActive) {
      ...
  1521  }
  1522  }

### C352 ADR:1245 game/js/plugins/DEUS_Anim.js:1605-1631 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q2 | PM | Add to SIM.00.05: terrain (the Levels strata writer, World diffs and objects; first, §8), Ownership (`DEUS_Ownership.js:613`), TimeSpeed timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`), the Anim death lifecycle (`DEUS_Anim.js:1504-1522`, `:1605-1631`)? Households runs on events only | Yes |
  1605  if (C && typeof C.onUnitDeath === "function" && !isWrap(C.onUnitDeath)) {
  1606  const orig = C.onUnitDeath;
  1607  C.onUnitDeath = markWrap(function(victim) {
      ...
  1630  }
  1631  }, orig);

### C353 ADR:1249 docs/systems/UF_History.md:106 OK
section: 12.3 Open questions
claim: | Q6 | Owner | Deep-history physical traces vs INV-SIM-01 / V134 and `UF_History.md:106` (§14.3) | An "aged world" option; the standard New Game stays at Year 0 |
   106  5. **Physical grave ownership gate.** No burial/inscription instance registry was found in the inspected baseline. Before physical graves are wired into Look, the coordinator must approve an anchor schema and its object/

### C354 ADR:1250 game/js/plugins/DEUS_Ecology.js:736-752 OK
section: 12.3 Open questions
claim: | Q7 | Owner | Ecology ore sprouts (`DEUS_Ecology.js:736-752`) break INV-SIM-03: remove them, or ledger them as an approved source? | Remove the ore outcomes |
   736  const SPROUT_DEFS = {
   737  0: [
   738  { sprout: "sapling", matures: ["oak", "pine", "birch", "fruit_tree"], weights: [5, 2, 2, 1], delay: 120 },
      ...
   751  ]
   752  };

### C355 ADR:1252 docs/ARCHITECTURE.md:18 OK
section: 12.3 Open questions
claim: | Q9 | Coordinator | `docs/ARCHITECTURE.md:18` ("Engine (20 Hz)") contradicts DEC-012. The file is outside Lane M's write set | Update to 10 Hz, citing ADR-003 |
    18  | **TIME** | `UF_Time.js`, `UF_TimeSpeed.js` | Multi-domain clocks: Engine (20 Hz computation), Tactical Action (6s d20 round), Historical (1s = 2h aging), Presentation (60m solar cycle). Pause enforcement. |

### C356 ADR:1255 game/js/plugins/DEUS_Core.js:321-325 OK
section: 12.3 Open questions
claim: | Q12 | Owner/PM | What is a game year? The code has 1 per game day (`DEUS_Core.js:321-325`); `UF_History.md:1161` says over 100 real hours at 1x | The calendar owner settles it before SIM.30.05 |
   321  while (this.hour >= 24) {
   322  this.hour -= 24;
   323  this.day++;
   324  this.year++; // 1 day/night cycle per year
   325  this.onDayPass();

### C357 ADR:1255 docs/systems/UF_History.md:1161 OK
section: 12.3 Open questions
claim: | Q12 | Owner/PM | What is a game year? The code has 1 per game day (`DEUS_Core.js:321-325`); `UF_History.md:1161` says over 100 real hours at 1x | The calendar owner settles it before SIM.30.05 |
  1161  - `currentYear()` counts game-clock years; with Q11 open a year takes over 100 real hours at ×1.

### C358 ADR:1257 docs/OWNER_DECISIONS.md:199-208 OK
section: 12.3 Open questions
claim: | Q14 | Owner | Crowd LOD for people (DEC-014, `docs/OWNER_DECISIONS.md:199-208`, OPEN with PM defaults): no population cap; a budget of fully simulated individuals; the rest as counts that keep the three identity axes (craft, civic office, class) and an obligation level (`docs/OWNER_DECISIONS.md:206`). §7.5 keeps every person tracked by default. If the Owner adopts crowd LOD, persons with no history record, household role or reference could be bucketed under those axes, plus this ADR's own bucket keys (species, age band, sex) and faction and settlement, and promotion would rebuild them. Histo
   199  ### Decision `DEC-014`: Population Simulation Budget, Crowd Counts LOD, and Anti-Snowball Pressures
   200  - **Date Logged:** 2026-09-26
   201  - **Status:** `OPEN` (Owner discussion 00:46-00:50 CT, directive 0021-V Addendum §9; PM defaults recorded)
      ...
   207  4. **Anti-Snowball Pressures:** Large, dominant factions experience emergent counter-pressures: regional rebellions, epidemic disease in dense settlements, supply/logistical strain, and dynastic succession crises, ensuri
   208  5. **Monster Origins:** Default rule is that most monsters reproduce biologically like animals; per-species origin settings (`breeds`, `spawned`, `created`, `unique`) are preserved for lore exceptions (Owner assigns).

### C359 ADR:1257 docs/OWNER_DECISIONS.md:206 OK
section: 12.3 Open questions
claim: | Q14 | Owner | Crowd LOD for people (DEC-014, `docs/OWNER_DECISIONS.md:199-208`, OPEN with PM defaults): no population cap; a budget of fully simulated individuals; the rest as counts that keep the three identity axes (craft, civic office, class) and an obligation level (`docs/OWNER_DECISIONS.md:206`). §7.5 keeps every person tracked by default. If the Owner adopts crowd LOD, persons with no history record, household role or reference could be bucketed under those axes, plus this ADR's own bucket keys (species, age band, sex) and faction and settlement, and promotion would rebuild them. Histo
   206  3. **Three-Axis Identity & Obligation Retention:** Crowd counts maintain the SOC.10.01 three-axis identity (`craft`, `civicOffice`, `class`) plus an obligation level (duty to defend or serve), ensuring military levies an

### C360 ADR:1258 docs/worldgen/DEUS_WORLDGEN_WBS.md:533 OK
section: 12.3 Open questions
claim: | Q15 | PM | SIM.40 (§16, §17, §18) runs in the core, so it needs the terrain sub-lane of SIM.00.05 first. Should that dependency be added to SIM.40.01 and .05 (WBS Rev 24 lists WG.00.17 and SIM.00.01, and SIM.40.01 and SIM.00.01: `docs/worldgen/DEUS_WORLDGEN_WBS.md:533`, `:537`)? | Yes |
   533  | SIM.40.01 | **Support model design & blast propagation** (materials, vertical propagation, span limits, cross-layer blast attenuation, V128 natural rock, V133 change-driven). Load-bearing rules, span capacities, and ve

### C361 ADR:1258 docs/worldgen/DEUS_WORLDGEN_WBS.md:537 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q15 | PM | SIM.40 (§16, §17, §18) runs in the core, so it needs the terrain sub-lane of SIM.00.05 first. Should that dependency be added to SIM.40.01 and .05 (WBS Rev 24 lists WG.00.17 and SIM.00.01, and SIM.40.01 and SIM.00.01: `docs/worldgen/DEUS_WORLDGEN_WBS.md:533`, `:537`)? | Yes |
   537  | SIM.40.05 | **Decay model** (unmaintained structure HP loss by material/exposure, roofs fail first, walls fail, feeds collapse) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | SIM.40.01, dep: SIM.00.01 | Claude → Gro

### C362 ADR:1260 docs/VISION.md:129 OK
section: 12.3 Open questions
claim: | Q17 | Owner | V135 labels the five fluid depth states 1 to 5 ft, for 1 ft strata (`docs/VISION.md:129`). With DEC-013's 2 ft strata the same five states are 2 to 10 ft deep. Keep the five states and relabel them in feet, or change the states? | Keep the states; the feet become 2, 4, 6, 8, 10 |
   129  | V135 | **Canonical 5-Step Fluid Depth Standard for Water and Lava** (user directive 2026-09-25): Exactly 5 visible, semantic depth states for water and 5 for lava, matching the 5 physical 1 ft strata per 5 ft cell (1 f

### C363 ADR:1262 docs/OWNER_DECISIONS.md:262 OK
section: 12.3 Open questions
claim: | Q19 | Owner | DEC-018's open sub-question: conjured matter versus LIFE-001 (`docs/OWNER_DECISIONS.md:262`) | None from this ADR. The ledger supports the PM default and the alternatives (§7.8) |
   262  - **Open Sub-Question (PM default):** Conjured matter (*create water*, *wall of stone*) versus LIFE-001 mass conservation. The default is that conjured matter is an explicitly modelled magical source/sink, logged in the 

### C364 ADR:1263 docs/worldgen/DEUS_WORLDGEN_WBS.md:108 OK
section: 12.3 Open questions
claim: | Q20 | Coordinator | WBS rows WG.00.20, WG.00.21 and GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`, `:109`, `:577`) cite DEC-017, DEC-018 and "DEC-019; V148" for the decisions `docs/OWNER_DECISIONS.md` records as DEC-020 (`:282`), DEC-021 (`:293`) and DEC-022 (`:304`), and VISION as V151 (`docs/VISION.md:412`). This ADR cites `docs/OWNER_DECISIONS.md` | Correct the WBS references (`tasks/SIM.00.01/lane-m/escalation.md`) |
   108  | **WG.00.20** | Seamless Inter-Layer Ramps & Camera-Follow Connector | Claude / Grok | Run of cells rising one stratum per cell (5 cells = one 10 ft layer); unit's Z becomes Z+1 at top stratum with zero transfer/fade/pa

### C365 ADR:1263 docs/worldgen/DEUS_WORLDGEN_WBS.md:109 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q20 | Coordinator | WBS rows WG.00.20, WG.00.21 and GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`, `:109`, `:577`) cite DEC-017, DEC-018 and "DEC-019; V148" for the decisions `docs/OWNER_DECISIONS.md` records as DEC-020 (`:282`), DEC-021 (`:293`) and DEC-022 (`:304`), and VISION as V151 (`docs/VISION.md:412`). This ADR cites `docs/OWNER_DECISIONS.md` | Correct the WBS references (`tasks/SIM.00.01/lane-m/escalation.md`) |
   109  | **WG.00.21** | Layer Occlusion Culling Rule & Exposed-Area Bound | Claude / Grok | Anything covered by opaque upper layer is not drawn (tiles, units, effects). Draw cost bounded by exposed visible screen area (V133). T

### C366 ADR:1263 docs/worldgen/DEUS_WORLDGEN_WBS.md:577 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q20 | Coordinator | WBS rows WG.00.20, WG.00.21 and GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`, `:109`, `:577`) cite DEC-017, DEC-018 and "DEC-019; V148" for the decisions `docs/OWNER_DECISIONS.md` records as DEC-020 (`:282`), DEC-021 (`:293`) and DEC-022 (`:304`), and VISION as V151 (`docs/VISION.md:412`). This ADR cites `docs/OWNER_DECISIONS.md` | Correct the WBS references (`tasks/SIM.00.01/lane-m/escalation.md`) |
   577  | GP.07.02 | **Cross-layer 3D targeting, ballistics & volume damage** (spells, arrows, thrown items through multi-Z openings, true 3D Euclidean range, vertical impact bonus / upward range penalty, cross-layer volume blas

### C367 ADR:1263 docs/OWNER_DECISIONS.md:282 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q20 | Coordinator | WBS rows WG.00.20, WG.00.21 and GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`, `:109`, `:577`) cite DEC-017, DEC-018 and "DEC-019; V148" for the decisions `docs/OWNER_DECISIONS.md` records as DEC-020 (`:282`), DEC-021 (`:293`) and DEC-022 (`:304`), and VISION as V151 (`docs/VISION.md:412`). This ADR cites `docs/OWNER_DECISIONS.md` | Correct the WBS references (`tasks/SIM.00.01/lane-m/escalation.md`) |
   282  ### Decision `DEC-020`: Seamless Inter-Layer Ramps and Camera-Follow Behavior

### C368 ADR:1263 docs/OWNER_DECISIONS.md:293 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q20 | Coordinator | WBS rows WG.00.20, WG.00.21 and GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`, `:109`, `:577`) cite DEC-017, DEC-018 and "DEC-019; V148" for the decisions `docs/OWNER_DECISIONS.md` records as DEC-020 (`:282`), DEC-021 (`:293`) and DEC-022 (`:304`), and VISION as V151 (`docs/VISION.md:412`). This ADR cites `docs/OWNER_DECISIONS.md` | Correct the WBS references (`tasks/SIM.00.01/lane-m/escalation.md`) |
   293  ### Decision `DEC-021`: Occlusion Rule for Layer Rendering (Zero-Cost Solid Cover)

### C369 ADR:1263 docs/OWNER_DECISIONS.md:304 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q20 | Coordinator | WBS rows WG.00.20, WG.00.21 and GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`, `:109`, `:577`) cite DEC-017, DEC-018 and "DEC-019; V148" for the decisions `docs/OWNER_DECISIONS.md` records as DEC-020 (`:282`), DEC-021 (`:293`) and DEC-022 (`:304`), and VISION as V151 (`docs/VISION.md:412`). This ADR cites `docs/OWNER_DECISIONS.md` | Correct the WBS references (`tasks/SIM.00.01/lane-m/escalation.md`) |
   304  ### Decision `DEC-022`: Cross-Layer 3D Targeting, Ballistics, and Volume Damage

### C370 ADR:1263 docs/VISION.md:412 OK
section: 12.3 Open questions
claim: | Q20 | Coordinator | WBS rows WG.00.20, WG.00.21 and GP.07.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:108`, `:109`, `:577`) cite DEC-017, DEC-018 and "DEC-019; V148" for the decisions `docs/OWNER_DECISIONS.md` records as DEC-020 (`:282`), DEC-021 (`:293`) and DEC-022 (`:304`), and VISION as V151 (`docs/VISION.md:412`). This ADR cites `docs/OWNER_DECISIONS.md` | Correct the WBS references (`tasks/SIM.00.01/lane-m/escalation.md`) |
   412  - 2026-09-26: V151 added by the user: **Cross-Layer 3D Targeting, Ballistics & Volume Damage** (DEC-022, Directive 0021-V Addendum §20): Spells, arrows, and thrown items can target cells and units on lower and upper laye

### C371 ADR:1270 docs/OWNER_DECISIONS.md:239-247 OK
section: 13. Engine Exit Path (DEC-017)
claim: **The decision.** DEC-017, "Keep RMMZ for menus, dialogue, saving, database and battle; fallback map renderer is a custom multi-layer PixiJS renderer inside RMMZ, decided after demo benchmarks" (`docs/OWNER_DECISIONS.md:239-247`).
   239  ### Decision `DEC-017`: Keep RMMZ for menus, dialogue, saving, database and battle; fallback map renderer is a custom multi-layer PixiJS renderer inside RMMZ, decided after demo benchmarks
   240  - **Date Logged:** 2026-09-26
   241  - **Decider:** Owner (01:38 CT, relayed by PM 0028-AC)
      ...
   246  - Added WBS placeholder row "Custom multi-layer PixiJS map renderer (fallback)" (`WG.00.24`), gated on Lane K benchmarks and Owner go/no-go.
   247  - Benchmark hygiene note: benchmarks share CPU with other workers, so each perf record must note concurrent worker count and CPU %, and go/no-go evidence needs one quiet-machine rerun.

### C372 ADR:1272 docs/OWNER_DECISIONS.md:245 (bare, file from 2 line(s) back) OK
section: 13. Engine Exit Path (DEC-017)
claim: - This ADR adopts it as its exit path, as DEC-017's consequences ask (`:245`).
   245  - ADR-003 Rev 3 adopts this as its exit/fallback path (§13 "Engine Exit Path").

### C373 ADR:1304 docs/OWNER_DECISIONS.md:243 OK
section: 13.3 The go/no-go
claim: The Owner decides with the benchmarks DEC-017 names (`docs/OWNER_DECISIONS.md:243`):
   243  - **Ruling:** RMMZ remains the engine for menus, dialogue, saving, the database and battle screens. If the stock RMMZ map (`Spriteset_Map`/`Tilemap`) cannot meet the goals, the fallback is a **custom multi-layer PixiJS m

### C374 ADR:1306 docs/OWNER_DECISIONS.md:300 (bare, file from 2 line(s) back) OK
section: 13.3 The go/no-go
claim: - the 32-vs-5-layer occlusion benchmark (DEC-021, `:300`; WBS WG.00.21, `docs/worldgen/DEUS_WORLDGEN_WBS.md:109`).
   300  3. **Benchmark Requirement:** Applied in Lane K follow-up, the 32-layer refactor, and future overlook view. Benchmark target: the stress scene with 32 layers must cost approximately the same frame time as with 5 layers w

### C375 ADR:1306 docs/worldgen/DEUS_WORLDGEN_WBS.md:109 OK
section: 13.3 The go/no-go
claim: - the 32-vs-5-layer occlusion benchmark (DEC-021, `:300`; WBS WG.00.21, `docs/worldgen/DEUS_WORLDGEN_WBS.md:109`).
   109  | **WG.00.21** | Layer Occlusion Culling Rule & Exposed-Area Bound | Claude / Grok | Anything covered by opaque upper layer is not drawn (tiles, units, effects). Draw cost bounded by exposed visible screen area (V133). T

### C376 ADR:1314 docs/OWNER_DECISIONS.md:247 OK
section: 13.3 The go/no-go
claim: DEC-017's hygiene rule applies: each perf record notes the concurrent worker count and CPU %, and the go/no-go evidence includes one quiet-machine rerun (`docs/OWNER_DECISIONS.md:247`).
   247  - Benchmark hygiene note: benchmarks share CPU with other workers, so each perf record must note concurrent worker count and CPU %, and go/no-go evidence needs one quiet-machine rerun.

### C377 ADR:1334 game/js/plugins/UF_Core.js:13 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: - `game/js/plugins/` holds 95 files. 41 of the `UF_*.js` files are 16-line shims such as `UF_Core.js:13` `PluginManager.loadScript("DEUS_Core")`.
    13  PluginManager.loadScript("DEUS_Core");

### C378 ADR:1337 game/js/plugins/DEUS_Callings.js:404 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: - `DEUS_Callings.js:404`
   404  module.exports = UF_Callings;

### C379 ADR:1338 game/js/plugins/DEUS_DeathForensics.js:542 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: - `DEUS_DeathForensics.js:542`
   542  module.exports = DeathForensics;

### C380 ADR:1339 game/js/plugins/DEUS_Fluid.js:1026 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: - `DEUS_Fluid.js:1026`
  1026  module.exports = Fluid;

### C381 ADR:1340 game/js/plugins/DEUS_Containers.js:1345 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: - `DEUS_Containers.js:1345`
  1345  module.exports = Containers;

### C382 ADR:1341 game/js/plugins/UF_Households.js:1067 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: - `UF_Households.js:1067`
  1067  module.exports = UF.Households;

### C383 ADR:1347 game/package.json:4-11 OK
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

### C384 ADR:1347 game/js/plugins/DEUS_Core.js:69 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **NW.js runtime** (window, fs, argv) | `game/package.json:4-11` (`chromium-args`, `window`); `DEUS_Core.js:69`, `:98`, `:134`; `DEUS_FactionMenus.js:455` (`nw.gui`) | kept; NW.js is not RMMZ | unchanged |
    69  const fs = require('fs');

### C385 ADR:1347 game/js/plugins/DEUS_Core.js:98 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **NW.js runtime** (window, fs, argv) | `game/package.json:4-11` (`chromium-args`, `window`); `DEUS_Core.js:69`, `:98`, `:134`; `DEUS_FactionMenus.js:455` (`nw.gui`) | kept; NW.js is not RMMZ | unchanged |
    98  require(p);

### C386 ADR:1347 game/js/plugins/DEUS_Core.js:134 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **NW.js runtime** (window, fs, argv) | `game/package.json:4-11` (`chromium-args`, `window`); `DEUS_Core.js:69`, `:98`, `:134`; `DEUS_FactionMenus.js:455` (`nw.gui`) | kept; NW.js is not RMMZ | unchanged |
   134  const nwArgs = (typeof nw !== 'undefined' && nw.App && nw.App.argv) ? nw.App.argv : [];

### C387 ADR:1347 game/js/plugins/DEUS_FactionMenus.js:455 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **NW.js runtime** (window, fs, argv) | `game/package.json:4-11` (`chromium-args`, `window`); `DEUS_Core.js:69`, `:98`, `:134`; `DEUS_FactionMenus.js:455` (`nw.gui`) | kept; NW.js is not RMMZ | unchanged |
   455  const nwGui = require("nw.gui");

### C388 ADR:1348 game/js/rmmz_core.js:471 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | kept | the renderer uses the same PIXI v5 and `Graphics` loop |
   471  function Graphics() {

### C389 ADR:1348 game/js/rmmz_core.js:808 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | kept | the renderer uses the same PIXI v5 and `Graphics` loop |
   808  Graphics._onTick = function(deltaTime) {

### C390 ADR:1348 game/js/rmmz_core.js:1177 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | kept | the renderer uses the same PIXI v5 and `Graphics` loop |
  1177  function Bitmap() {

### C391 ADR:1348 game/js/rmmz_core.js:1851 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | kept | the renderer uses the same PIXI v5 and `Graphics` loop |
  1851  function Sprite() {

### C392 ADR:1348 game/js/plugins/DEUS_Depth.js:219 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | kept | the renderer uses the same PIXI v5 and `Graphics` loop |
   219  DepthCanvasLayer.prototype = Object.create(PIXI.Container.prototype);

### C393 ADR:1348 game/js/plugins/DEUS_Depth.js:685 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | kept | the renderer uses the same PIXI v5 and `Graphics` loop |
   685  const f = this._colorFilter || (this._colorFilter = new PIXI.filters.ColorMatrixFilter());

### C394 ADR:1349 game/js/rmmz_core.js:2185 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3 either way | the renderer needs its own multi-layer tilemap for A1-A4 autotiles: size L, risk high (autotile correctness) |
  2185  function Tilemap() {

### C395 ADR:1349 game/js/rmmz_core.js:2672 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3 either way | the renderer needs its own multi-layer tilemap for A1-A4 autotiles: size L, risk high (autotile correctness) |
  2672  Tilemap.TILE_ID_A1 = 2048;

### C396 ADR:1349 game/js/rmmz_core.js:2682 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3 either way | the renderer needs its own multi-layer tilemap for A1-A4 autotiles: size L, risk high (autotile correctness) |
  2682  Tilemap.isAutotile = function(tileId) {

### C397 ADR:1349 game/js/rmmz_core.js:2694 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3 either way | the renderer needs its own multi-layer tilemap for A1-A4 autotiles: size L, risk high (autotile correctness) |
  2694  Tilemap.makeAutotileId = function(kind, shape) {

### C398 ADR:1349 game/js/rmmz_core.js:2726 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3 either way | the renderer needs its own multi-layer tilemap for A1-A4 autotiles: size L, risk high (autotile correctness) |
  2726  Tilemap.isWaterTile = function(tileId) {

### C399 ADR:1349 game/js/rmmz_core.js:2793 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3 either way | the renderer needs its own multi-layer tilemap for A1-A4 autotiles: size L, risk high (autotile correctness) |
  2793  Tilemap.FLOOR_AUTOTILE_TABLE = [

### C400 ADR:1350 game/js/rmmz_scenes.js:747 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Scene / Spriteset / Sprite_Character** | `rmmz_scenes.js` `Scene_Map` `:747`; `rmmz_sprites.js` `Spriteset_Map` `:3345`; `Scene_Map.prototype.*` overridden in 20 plugins, `Spriteset_Map.prototype.*` in 18, `Scene_Boot.start` in 39 | `Scene_Map` and `Scene_Boot` kept | `Spriteset_Map` and the unit `Sprite_Character`s are replaced for map drawing; the 18 `Spriteset_Map` overrides move into the renderer or are retired: size L, risk medium |
   747  function Scene_Map() {

### C401 ADR:1350 game/js/rmmz_sprites.js:3345 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Scene / Spriteset / Sprite_Character** | `rmmz_scenes.js` `Scene_Map` `:747`; `rmmz_sprites.js` `Spriteset_Map` `:3345`; `Scene_Map.prototype.*` overridden in 20 plugins, `Spriteset_Map.prototype.*` in 18, `Scene_Boot.start` in 39 | `Scene_Map` and `Scene_Boot` kept | `Spriteset_Map` and the unit `Sprite_Character`s are replaced for map drawing; the 18 `Spriteset_Map` overrides move into the renderer or are retired: size L, risk medium |
  3345  function Spriteset_Map() {

### C402 ADR:1351 game/js/rmmz_core.js:5652 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Input** (`Input`, `TouchInput`, `keyMapper`) | `rmmz_core.js` `:5652`, `:6021`; 18 plugins; private `_currentState` read ×73 | kept | unchanged |
  5652  function Input() {

### C403 ADR:1351 game/js/rmmz_core.js:6021 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Input** (`Input`, `TouchInput`, `keyMapper`) | `rmmz_core.js` `:5652`, `:6021`; 18 plugins; private `_currentState` read ×73 | kept | unchanged |
  6021  function TouchInput() {

### C404 ADR:1352 game/js/rmmz_managers.js:1103 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Audio** (`AudioManager`, `SoundManager`) | `rmmz_managers.js:1103`, `:1491`; 8 plugins | kept | unchanged |
  1103  function AudioManager() {

### C405 ADR:1352 game/js/rmmz_managers.js:1491 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Audio** (`AudioManager`, `SoundManager`) | `rmmz_managers.js:1103`, `:1491`; 8 plugins | kept | unchanged |
  1491  function SoundManager() {

### C406 ADR:1353 game/js/rmmz_managers.js:345 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | kept; they store `deusSim` + `deusView` (§11) | unchanged |
   345  DataManager.saveGame = function(savefileId) {

### C407 ADR:1353 game/js/rmmz_managers.js:389 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | kept; they store `deusSim` + `deusView` (§11) | unchanged |
   389  DataManager.makeSaveContents = function() {

### C408 ADR:1353 game/js/rmmz_managers.js:405 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | kept; they store `deusSim` + `deusView` (§11) | unchanged |
   405  DataManager.extractSaveContents = function(contents) {

### C409 ADR:1353 game/js/rmmz_managers.js:538 (bare, file from 0 line(s) back) OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | kept; they store `deusSim` + `deusView` (§11) | unchanged |
   538  function StorageManager() {

### C410 ADR:1353 game/js/rmmz_core.js:6416 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | kept; they store `deusSim` + `deusView` (§11) | unchanged |
  6416  function JsonEx() {

### C411 ADR:1354 game/js/plugins/DEUS_WorldGen.js:45-46 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Database JSON** (`$dataMap`, `$dataTilesets`, `$dataSystem`; custom databases through `_databaseFiles`) | `$dataMap` in 21 plugins; `$dataTilesets` in 5; `$dataSystem` in 3; loaders `DEUS_WorldGen.js:45-46`, `DEUS_Look.js:93`, `DEUS_World.js:2813` | kept; `$dataMap` becomes a render projection (§4.6) | the renderer reads the view, not `$dataMap` |
    45  if (!DataManager.isBattleTest() && !DataManager.isEventTest()) {
    46  DataManager._databaseFiles.push({ name: CATALOG_VAR, src: "DEUS_WorldCatalog.json" });

### C412 ADR:1354 game/js/plugins/DEUS_Look.js:93 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Database JSON** (`$dataMap`, `$dataTilesets`, `$dataSystem`; custom databases through `_databaseFiles`) | `$dataMap` in 21 plugins; `$dataTilesets` in 5; `$dataSystem` in 3; loaders `DEUS_WorldGen.js:45-46`, `DEUS_Look.js:93`, `DEUS_World.js:2813` | kept; `$dataMap` becomes a render projection (§4.6) | the renderer reads the view, not `$dataMap` |
    93  if (!DataManager._databaseFiles.some(f => f.name === INDEX_VAR)) DataManager._databaseFiles.push({ name: INDEX_VAR, src: INDEX_FILE });

### C413 ADR:1354 game/js/plugins/DEUS_World.js:2813 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Database JSON** (`$dataMap`, `$dataTilesets`, `$dataSystem`; custom databases through `_databaseFiles`) | `$dataMap` in 21 plugins; `$dataTilesets` in 5; `$dataSystem` in 3; loaders `DEUS_WorldGen.js:45-46`, `DEUS_Look.js:93`, `DEUS_World.js:2813` | kept; `$dataMap` becomes a render projection (§4.6) | the renderer reads the view, not `$dataMap` |
  2813  DataManager._databaseFiles.push({ name: TEMPLATE_VAR, src: "Map%1.json".format(CONFIG.templateMapId.padZero(3)) });

### C414 ADR:1355 game/js/plugins/DEUS_Sheet.js:1158 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Menus / windows** (`Window_*`, `Scene_MenuBase`) | 13 plugins use `Window_*`, 9 subclass them (e.g. `DEUS_Sheet.js:1158`, `DEUS_Interact.js:525`); the stock menu is disabled (`DEUS_ColonyOverseer.js:173`) | kept | unchanged |
  1158  class Window_UFSheet extends Window_Base {

### C415 ADR:1355 game/js/plugins/DEUS_Interact.js:525 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Menus / windows** (`Window_*`, `Scene_MenuBase`) | 13 plugins use `Window_*`, 9 subclass them (e.g. `DEUS_Sheet.js:1158`, `DEUS_Interact.js:525`); the stock menu is disabled (`DEUS_ColonyOverseer.js:173`) | kept | unchanged |
   525  class Window_UFContextMenu extends Window_Command {

### C416 ADR:1355 game/js/plugins/DEUS_ColonyOverseer.js:173 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Menus / windows** (`Window_*`, `Scene_MenuBase`) | 13 plugins use `Window_*`, 9 subclass them (e.g. `DEUS_Sheet.js:1158`, `DEUS_Interact.js:525`); the stock menu is disabled (`DEUS_ColonyOverseer.js:173`) | kept | unchanged |
   173  Scene_Map.prototype.isMenuEnabled = function() { return false; };

### C417 ADR:1356 game/js/plugins/DEUS_World.js:899 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Events / characters** (`Game_Event`, `Game_CharacterBase`, `Game_Player`) | every unit on view is a `Game_Event` (`DEUS_World.js:899`); `Game_CharacterBase` overrides in 11 plugins | after Inc 3 they are puppets fed by the view | the renderer draws units from the view; puppets stay only where RMMZ's event interpreter needs them (dialogue, common events) |
   899  const ev = new Game_Event($gameMap.mapId(), eid);

### C418 ADR:1357 game/js/rmmz_managers.js:1982-2112 OK
section: 13.5 RMMZ dependencies after the split (survey)
claim: | **Main loop** (`SceneManager`) | `rmmz_managers.js:1982-2112`; TimeSpeed overrides (§1.1) | kept; `DEUS_SimHost` wraps it (§3.4) | unchanged |
  1982  SceneManager.update = function(deltaTime) {
  1983  try {
  1984  const n = this.determineRepeatNumber(deltaTime);
      ...
  2111  Graphics.frameCount++;
  2112  };

### C419 ADR:1369 game/js/plugins/DEUS_History.js:3396-3408 OK
section: 14.1 What exists today
claim: **`History.generate` runs once, at world creation** (`DEUS_History.js:3396-3408` → `:363-410`).
  3396  if (window.UF.Events && UF.Events.on) {
  3397  UF.Events.on("world:created", state => {
  3398  const targetYear = UF.NewGameSetup && UF.NewGameSetup.year;
      ...
  3407  return;
  3408  }

### C420 ADR:1369 game/js/plugins/DEUS_History.js:363-410 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: **`History.generate` runs once, at world creation** (`DEUS_History.js:3396-3408` → `:363-410`).
   363  History.generate = function(world, opts = {}) {
   364  const state = world && world.state ? world.state : world;
   365  const cfg = this.config();
      ...
   409  });
   410  };

### C421 ADR:1370 game/js/plugins/DEUS_History.js:390-395 OK
section: 14.1 What exists today
claim: - It steps one year at a time (`D.step`, called at `DEUS_History.js:390-395`, defined at `DEUS_HistoricalDemographics.js:468`).
   390  for (let year = 0; year < steps; year++) {
   391  D.step(demographics);
   392  if (typeof opts.onCheckpoint === "function") opts.onCheckpoint({ ...demographics,
   393  living: demographics.people.filter(p => p.died === null).map(p => p.id),
   394  graveyard: demographics.people.filter(p => p.died !== null).map(p => p.id) });
   395  }

### C422 ADR:1370 game/js/plugins/DEUS_HistoricalDemographics.js:468 OK
section: 14.1 What exists today
claim: - It steps one year at a time (`D.step`, called at `DEUS_History.js:390-395`, defined at `DEUS_HistoricalDemographics.js:468`).
   468  function step(state, conditions = {}) {

### C423 ADR:1371 game/js/plugins/DEUS_HistoricalDemographics.js:8-9 OK
section: 14.1 What exists today
claim: - Nothing steps it during play (`DEUS_HistoricalDemographics.js:8-9`).
     8  * HIST-01/minimum HIST-02/HIST-09. No listeners, automatic generation, live units,
     9  * terrain edits, or save hooks. create(world, options) imports canonical

### C424 ADR:1374 game/js/plugins/DEUS_History.js:428-557 OK
section: 14.1 What exists today
claim: - `materialize` places only camps and living units (`DEUS_History.js:428-557`).
   428  History.materialize = function(world) {
   429  const state = world && world.state ? world.state : world;
   430  const h = state && state.history, d = h && h.demographics, W = UF.World;
      ...
   556  });
   557  };

### C425 ADR:1375 game/js/plugins/DEUS_HistoricalDemographics.js:319 OK
section: 14.1 What exists today
claim: - A site's `isRuined` is created false (`DEUS_HistoricalDemographics.js:319`) and validated as false (`:397`). So `site.ruined` (`DEUS_History.js:547`) never gets set.
   319  abandonedYear: null, isRuined: false, population: 0, peakPopulation: 0, historicalCapacity };

### C426 ADR:1375 game/js/plugins/DEUS_HistoricalDemographics.js:397 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: - A site's `isRuined` is created false (`DEUS_HistoricalDemographics.js:319`) and validated as false (`:397`). So `site.ruined` (`DEUS_History.js:547`) never gets set.
   397  check(integer(s.sourceSiteId) && !sourceSites.has(s.sourceSiteId) && s.foundedYear === state.startYear && typeof s.name === "string" && s.name.length && typeof s.kind === "string" && s.isRuined === false, "invalid import

### C427 ADR:1375 game/js/plugins/DEUS_History.js:547 OK
section: 14.1 What exists today
claim: - A site's `isRuined` is created false (`DEUS_HistoricalDemographics.js:319`) and validated as false (`:397`). So `site.ruined` (`DEUS_History.js:547`) never gets set.
   547  site.ruined = ds.isRuined ? ds.abandonedYear : null;

### C428 ADR:1376 docs/systems/UF_History.md:93 OK
section: 14.1 What exists today
claim: - The docs confirm it: the graveyard is "not evidence of a physical grave" (`docs/systems/UF_History.md:93`), and no automatic grave, crypt or ruin placement is authorized (`:106`).
    93  - All ancestor person records are retained, but the inherited historical event limit is 400. A deceased record in `graveyard` is a logical index entry, not evidence of a physical grave or burial location.

### C429 ADR:1376 docs/systems/UF_History.md:106 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: - The docs confirm it: the graveyard is "not evidence of a physical grave" (`docs/systems/UF_History.md:93`), and no automatic grave, crypt or ruin placement is authorized (`:106`).
   106  5. **Physical grave ownership gate.** No burial/inscription instance registry was found in the inspected baseline. Before physical graves are wired into Look, the coordinator must approve an anchor schema and its object/

### C430 ADR:1379 game/js/plugins/DEUS_History.js:1665-2732 OK
section: 14.1 What exists today
claim: - `History.iterateWorldHistory` (`DEUS_History.js:1665-2732`; doc comment `:1658-1664`) writes objects and diffs (`:1704-1712`) and road tiles (`:1845-1862`), and saves `history.roads` and `history.structures` (`:2725-2726`).
  1665  History.iterateWorldHistory = function(state, targetYears, opts = {}) {
  1666  const st = state || (window.UF && UF.World && UF.World.state);
  1667  if (!st || !st.history || !targetYears || targetYears <= 1) return null;
      ...
  2731  
  2732  return summary;

### C431 ADR:1379 game/js/plugins/DEUS_History.js:1658-1664 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: - `History.iterateWorldHistory` (`DEUS_History.js:1665-2732`; doc comment `:1658-1664`) writes objects and diffs (`:1704-1712`) and road tiles (`:1845-1862`), and saves `history.roads` and `history.structures` (`:2725-2726`).
  1658  /**
  1659  * Second-by-second living world history simulation (1-200 AD, user directives 2026-09-20).
  1660  * Pushes through elapsed simulation time second-by-second from Year 1 founders
  1661  * around the central campfire to targetYear.
  1662  * Cadence: 1 in-game day = 1 year = 240 real simulation seconds.
  1663  * 1 second = 6 game minutes ($ufTime.advanceMinute(6)).
  1664  */

### C432 ADR:1379 game/js/plugins/DEUS_History.js:1704-1712 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: - `History.iterateWorldHistory` (`DEUS_History.js:1665-2732`; doc comment `:1658-1664`) writes objects and diffs (`:1704-1712`) and road tiles (`:1845-1862`), and saves `history.roads` and `history.structures` (`:2725-2726`).
  1704  const write = (area, x, y, t) => {
  1705  const i = y * size + x;
  1706  if (live && O) O.setIn(area, x, y, typeof t === "string" ? t : (objects[t - 1] ? objects[t - 1].id : null));
      ...
  1711  }
  1712  };

### C433 ADR:1379 game/js/plugins/DEUS_History.js:1845-1862 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: - `History.iterateWorldHistory` (`DEUS_History.js:1665-2732`; doc comment `:1658-1664`) writes objects and diffs (`:1704-1712`) and road tiles (`:1845-1862`), and saves `history.roads` and `history.structures` (`:2725-2726`).
  1845  const roadKind = (f && f.species === "dwarf") ? "floor_stone" : "road";
  1846  const T = window.UF && UF.Tiles;
  1847  const roadBase = (T && T.groundBase) ? (T.groundBase(roadKind) || T.groundBase("road") || 2048) : 2048;
      ...
  1861  }
  1862  roadsPlaced++;

### C434 ADR:1379 game/js/plugins/DEUS_History.js:2725-2726 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: - `History.iterateWorldHistory` (`DEUS_History.js:1665-2732`; doc comment `:1658-1664`) writes objects and diffs (`:1704-1712`) and road tiles (`:1845-1862`), and saves `history.roads` and `history.structures` (`:2725-2726`).
  2725  st.history.roads = Array.from(roadPositions);
  2726  st.history.structures = structuresList;

### C435 ADR:1380 game/js/plugins/DEUS_History.js:3409-3426 (bare, file from 1 line(s) back) OK
section: 14.1 What exists today
claim: - It runs only on the founders branch (`:3409-3426`).
  3409  if (state.history.founders) {
  3410  const off = people.filter(u => {
  3411  const s = state.history.sites.find(x => x.id === u.data.site);
      ...
  3425  }
  3426  }

### C436 ADR:1381 game/data/UF_WorldCatalog.json:7670-7675 OK
section: 14.1 What exists today
claim: - The catalog turns the legacy generator off with `history.simulate: false`, `settleYears: 0` (`game/data/UF_WorldCatalog.json:7670-7675`).
  7670  "simulate": false,
  7671  "years": [
  7672  500,
  7673  600
  7674  ],
  7675  "settleYears": 0,

### C437 ADR:1382 game/data/UF_WorldCatalog.json:6128-6146 OK
section: 14.1 What exists today
claim: - Catalog kinds for traces already exist: `ruin` and `lair` (`UF_WorldCatalog.json:6128-6146`).
  6128  "ruin": {
  6129  "radius": 5,
  6130  "ring": "rubble",
      ...
  6145  }
  6146  }

### C438 ADR:1385 docs/systems/UF_History.md:192-201 OK
section: 14.1 What exists today
claim: - 500-year demographic trajectories took 8.9–10.6 s of simulation, with the worst year at 66–91 ms (`docs/systems/UF_History.md:192-201`). Both repeats of each seed matched byte for byte (`docs/systems/UF_History.md:207`).
   192  Only public `api.step` execution contributes to simulation time. Worker wall also includes setup, observations, checkpoint validation/serialization and emission; parent process wall includes startup, source loading and f
   193  
   194  | Seed | Repeat | Simulation, s | Worker wall, s | Parent process wall, s | Worst annual step, ms |
      ...
   200  | 20260919 | 1 | 10.0856625 | 11.6161753 | 12.0479071 | 70.0923 |
   201  | 20260919 | 2 | 9.9830550 | 11.5073334 | 11.9582089 | 73.4312 |

### C439 ADR:1385 docs/systems/UF_History.md:207 OK
section: 14.1 What exists today
claim: - 500-year demographic trajectories took 8.9–10.6 s of simulation, with the worst year at 66–91 ms (`docs/systems/UF_History.md:192-201`). Both repeats of each seed matched byte for byte (`docs/systems/UF_History.md:207`).
   207  Both repeats have exact matching state/event bytes, hashes and annual curves. Each unique checkpoint appears once below. Horizons are elapsed years; cumulative births exclude 72 founders, deaths include founder deaths. R

### C440 ADR:1386 docs/systems/UF_History.md:27 OK
section: 14.1 What exists today
claim: - In the integration matrix, whose worker times include generation and materialization, a worker took 2.7–3.1 s at age 0 and 10.3–13.5 s at age 500, with about 5 MB world states (`docs/systems/UF_History.md:27`, `:31-44`).
    27  Final integration artifact: `C:/Users/snewt/AppData/Local/Temp/deus-astra16-integration-ee162c08-c4da-4d5b-950b-e2db45b28329.json`. Total integration wall time: **104.5186285 s**. Worker timings below include generation,

### C441 ADR:1386 docs/systems/UF_History.md:31-44 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: - In the integration matrix, whose worker times include generation and materialization, a worker took 2.7–3.1 s at age 0 and 10.3–13.5 s at age 500, with about 5 MB world states (`docs/systems/UF_History.md:27`, `:31-44`).
    31  | Seed | Age | Living | Ancestors | Serialized world bytes | Worker ms |
    32  |---:|---:|---:|---:|---:|---:|
    33  | 0 | 0 | 72 | 0 | 278364 | 2758.241 |
      ...
    43  | 20260919 | 250 | 977 | 1584 | 3519606 | 4474.997 |
    44  | 20260919 | 500 | 1093 | 4224 | 5037835 | 13465.403 |

### C442 ADR:1399 docs/systems/UF_History.md:106 OK
section: 14.2 Design: history on the headless core
claim: 3. **Traces are ordinary sim data, not flavour text.** A ruin is its `objectDiffs` (rubble, ruin variants, `bones_pile`); a road is its tile diffs; a mine is its strata diffs, plus the items it produced; a grave is an object with an anchor record (`personId`, site, xyz). HIST-11 already requires that anchor schema (`UF_History.md:106`).
   106  5. **Physical grave ownership gate.** No burial/inscription instance registry was found in the inspected baseline. Before physical graves are wired into Look, the coordinator must approve an anchor schema and its object/

### C443 ADR:1404 docs/systems/UF_History.md:194-201 OK
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

### C444 ADR:1404 docs/systems/UF_History.md:207 (bare, file from 0 line(s) back) OK
section: 14.2 Design: history on the headless core
claim: 5. **Deterministic.** The run is a pure function of `(seed, setup parameters)`. Its output checksum is tested twice per seed, as the history harnesses already do with repeat runs (`docs/systems/UF_History.md:194-201`, byte-identical repeats `:207`).
   207  Both repeats have exact matching state/event bytes, hashes and annual curves. Each unique checkpoint appears once below. Horizons are elapsed years; cumulative births exclude 72 founders, deaths include founder deaths. R

### C445 ADR:1407 docs/systems/UF_History.md:27 OK
section: 14.2 Design: history on the headless core
claim: - today's age-500 world takes 10.3–13.5 s per worker, generation and materialization included (`docs/systems/UF_History.md:27`, `:31-44`), and the traces must fit in the rest.
    27  Final integration artifact: `C:/Users/snewt/AppData/Local/Temp/deus-astra16-integration-ee162c08-c4da-4d5b-950b-e2db45b28329.json`. Total integration wall time: **104.5186285 s**. Worker timings below include generation,

### C446 ADR:1407 docs/systems/UF_History.md:31-44 (bare, file from 0 line(s) back) OK
section: 14.2 Design: history on the headless core
claim: - today's age-500 world takes 10.3–13.5 s per worker, generation and materialization included (`docs/systems/UF_History.md:27`, `:31-44`), and the traces must fit in the rest.
    31  | Seed | Age | Living | Ancestors | Serialized world bytes | Worker ms |
    32  |---:|---:|---:|---:|---:|---:|
    33  | 0 | 0 | 72 | 0 | 278364 | 2758.241 |
      ...
    43  | 20260919 | 250 | 977 | 1584 | 3519606 | 4474.997 |
    44  | 20260919 | 500 | 1093 | 4224 | 5037835 | 13465.403 |

### C447 ADR:1414 docs/INVARIANT_REGISTRY.md:51 OK
section: 14.3 A conflict the Owner must resolve
claim: - INV-SIM-01 (`docs/INVARIANT_REGISTRY.md:51`) says: "Standard New Game begins strictly at World Year 0 (V134). No pre-generated centuries of roads, ruined cities, or exhausted mines."
    51  | **INV-SIM-01** | **Standard New Game Starts at Year 0** | Standard New Game begins strictly at World Year 0 (V134). No pre-generated centuries of roads, ruined cities, or exhausted mines. History unfolds through live s

### C448 ADR:1415 docs/systems/UF_History.md:106 OK
section: 14.3 A conflict the Owner must resolve
claim: - `UF_History.md:106` does not authorize automatic ruin or grave placement.
   106  5. **Physical grave ownership gate.** No burial/inscription instance registry was found in the inspected baseline. Before physical graves are wired into Look, the coordinator must approve an anchor schema and its object/

### C449 ADR:1416 game/js/plugins/DEUS_FactionMenus.js:280-292 OK
section: 14.3 A conflict the Owner must resolve
claim: - The New Game setup already has a year selector, `UF.NewGameSetup.year` (`DEUS_FactionMenus.js:280-292`).
   280  const year = this._newGameSetupWindow ? this._newGameSetupWindow.currentYear() : 0;
   281  const seed = this._newGameSetupWindow ? this._newGameSetupWindow.resolvedSeed() : undefined;
   282  const worldSize = 256;
      ...
   291  fogOfWar: false
   292  };

### C450 ADR:1423 docs/OWNER_DECISIONS.md:172-195 OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: DEC-013 as amended is recorded at `docs/OWNER_DECISIONS.md:172-195`, under the heading "Thirty-Two Z Layers, Nine Races, Home Layer Ranges, Five Biome Bands, and Governing Scale". The amendment is commit `a1629a69`. This section uses these parts of it:
   172  ### Decision `DEC-013`: Thirty-Two Z Layers, Nine Races, Home Layer Ranges, Five Biome Bands, and Governing Scale
   173  - **Date Logged:** 2026-09-26 (Amended 01:10 CT per Owner Directive 0021-V Addendum §12–§13; supersedes 9-layer baseline)
   174  - **Status:** `DECIDED` (Owner ruling 00:34, 00:37, 01:06–01:10 CT)
      ...
   194  - **Race-to-Band/Layer-Range Mapping:** Which specific race occupies which home layer range. Status: `OPEN` (Owner assigns).
   195  - **Biome Assignment per Band:** Mapping of the 25 specific biomes into the 5 bands. Status: `OPEN` (Owner assigns).

### C451 ADR:1424 docs/OWNER_DECISIONS.md:177 (bare, file from 1 line(s) back) OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: - **32 continuous layers,** −16..+15, surface 0, 320 ft. The refactor must still run at 9 layers in automated tests (`:177`). The range is OPEN with that PM default (`:193`).
   177  1. **Thirty-Two Z Layers:** The world simulation and presentation expand to 32 vertical Z layers (superseding 9 layers; formerly -2..+2). Total vertical headroom: 320 ft. The Z-range refactor targets 32 as the default ga

### C452 ADR:1424 docs/OWNER_DECISIONS.md:193 (bare, file from 1 line(s) back) OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: - **32 continuous layers,** −16..+15, surface 0, 320 ft. The refactor must still run at 9 layers in automated tests (`:177`). The range is OPEN with that PM default (`:193`).
   193  - **Z-Range Coordinate Mapping:** Default `-16..+15` (surface = 0). Status: `OPEN` (PM default).

### C453 ADR:1425 docs/OWNER_DECISIONS.md:178-181 (bare, file from 2 line(s) back) OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: - **The governing scale** (`:178-181`): §15.0.
   178  2. **Governing Geometry & Scale:**
   179  - 1 square / cell = 5 ft × 5 ft (D&D movement standard).
   180  - 1 Z layer = 10 ft tall (equivalent to 2 cubes).
   181  - 5 strata per layer = 2 ft per stratum (5 strata × 2 ft = 10 ft).

### C454 ADR:1426 docs/OWNER_DECISIONS.md:182 (bare, file from 3 line(s) back) OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: - **Mandatory sparse storage** (`:182`): §15.3 to §15.5.
   182  3. **Mandatory Sparse Storage:** Memory, state arrays, and save size must scale with occupied cells/entities, NOT with 32 × area. Empty sky and untouched solid rock cost near zero.

### C455 ADR:1427 docs/OWNER_DECISIONS.md:183 (bare, file from 4 line(s) back) OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: - **Cross-layer blasts** (`:183`): §18.
   183  4. **Cross-Layer Blast & Structural Damage:** Explosions and blasts (e.g. fireball) damage floors and propagate damage to the layer below depending on floor material, thickness, and attenuation. `applyVolumeDamage` propa

### C456 ADR:1428 docs/OWNER_DECISIONS.md:186-191 (bare, file from 5 line(s) back) OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: - **Five bands across the 32 layers** (`:186-191`): §5.1. Which biomes and races go in which band is OPEN (`:194-195`).
   186  7. **Five Vertical Biome Bands Spanning 32 Layers:** The 25 pipeline biomes are partitioned into 5 vertical bands of 5 biomes each across the 32 layers (-16..+15, surface at 0):
   187  - **Lower-2 (Deep Caverns):** Layers -16..-9 (8 layers, 5 biomes)
   188  - **Lower-1 (Shallow Underground):** Layers -8..-1 (8 layers, 5 biomes)
   189  - **Surface:** Layers 0..+3 (4 layers: ground, hills, low buildings; 5 biomes)
   190  - **Upper-1 (Low Sky / Towers / Canopy):** Layers +4..+9 (6 layers, 5 biomes)
   191  - **Upper-2 (High Sky / Peaks / Cloud Realm):** Layers +10..+15 (6 layers, 5 biomes)

### C457 ADR:1428 docs/OWNER_DECISIONS.md:194-195 (bare, file from 5 line(s) back) OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: - **Five bands across the 32 layers** (`:186-191`): §5.1. Which biomes and races go in which band is OPEN (`:194-195`).
   194  - **Race-to-Band/Layer-Range Mapping:** Which specific race occupies which home layer range. Status: `OPEN` (Owner assigns).
   195  - **Biome Assignment per Band:** Mapping of the 25 specific biomes into the 5 bands. Status: `OPEN` (Owner assigns).

### C458 ADR:1430 docs/VISION.md:130 OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: V136 records the same ruling (`docs/VISION.md:130`). WG.00.17 does the legacy refactor and lists ADR-003 as an input (`docs/worldgen/DEUS_WORLDGEN_WBS.md:105`). This section is that input. The core itself is range-agnostic from Increment 1 (§15.2).
   130  | V136 | **Thirty-Two Z Layers, Governing Scale, Home Layer Ranges & Five Vertical Biome Bands** (user directives 2026-09-26: "32 layers supersede 9", DEC-013 amended, Directive 0021-V Addendum §12–§13; supersedes 9-laye

### C459 ADR:1430 docs/worldgen/DEUS_WORLDGEN_WBS.md:105 OK
section: 15. Thirty-Two Z Layers and the Governing Scale (DEC-013)
claim: V136 records the same ruling (`docs/VISION.md:130`). WG.00.17 does the legacy refactor and lists ADR-003 as an input (`docs/worldgen/DEUS_WORLDGEN_WBS.md:105`). This section is that input. The core itself is range-agnostic from Increment 1 (§15.2).
   105  | **WG.00.17** | Z-Range Configurable Setting & Expansion to 32 Layers | Claude | Make Z-range a single configurable setting in engine core, then expand to 32 layers (-16..+15: surface 0, 16 underground -1..-16, 15 upper

### C460 ADR:1436 game/js/plugins/DEUS_Levels.js:993 OK
section: 15.0 The governing scale
claim: | Cell | 5 ft × 5 ft | `CELL_FT = 5` (`DEUS_Levels.js:993`): agrees | `cellFt = 5` |
   993  const STRATA = 5, CELL_FT = 5;

### C461 ADR:1437 game/js/plugins/DEUS_Levels.js:993 OK
section: 15.0 The governing scale
claim: | Strata per layer | 5 | `STRATA = 5` (`DEUS_Levels.js:993`): agrees | `strataPerLayer = 5` |
   993  const STRATA = 5, CELL_FT = 5;

### C462 ADR:1438 game/js/plugins/DEUS_Levels.js:985-986 OK
section: 15.0 The governing scale
claim: | Stratum | 2 ft | **1 ft.** The strata header says every 5 ft cell of every level is "five 1 ft strata" (`DEUS_Levels.js:985-986`). The sphere-damage JSDoc says "a cell is 5 ft across, a stratum 1 ft high" (`:1790-1791`), and its code measures height in strata against a radius in feet (`:1833`, `:1835`, `:1845`) | `stratumFt = 2` |
   985  // Strata (DEUS-TSK-FABLE-19A): the one geometry authority. Every 5 ft cell of every level is five 1 ft strata,
   986  // S0 (bottom) .. S4 (top). A stratum is two bytes: its material (id in the low 6 bits, 0 = air; 0x80 = constructed)

### C463 ADR:1438 game/js/plugins/DEUS_Levels.js:1790-1791 (bare, file from 0 line(s) back) OK
section: 15.0 The governing scale
claim: | Stratum | 2 ft | **1 ft.** The strata header says every 5 ft cell of every level is "five 1 ft strata" (`DEUS_Levels.js:985-986`). The sphere-damage JSDoc says "a cell is 5 ft across, a stratum 1 ft high" (`:1790-1791`), and its code measures height in strata against a radius in feet (`:1833`, `:1835`, `:1845`) | `stratumFt = 2` |
  1790  *     a sphere around the middle of that stratum; a stratum takes damage x falloff(distance / radius) when its middle
  1791  *     is within the radius (a cell is 5 ft across, a stratum 1 ft high). It crosses levels the same way.

### C464 ADR:1438 game/js/plugins/DEUS_Levels.js:1833 (bare, file from 0 line(s) back) OK
section: 15.0 The governing scale
claim: | Stratum | 2 ft | **1 ft.** The strata header says every 5 ft cell of every level is "five 1 ft strata" (`DEUS_Levels.js:985-986`). The sphere-damage JSDoc says "a cell is 5 ft across, a stratum 1 ft high" (`:1790-1791`), and its code measures height in strata against a radius in feet (`:1833`, `:1835`, `:1845`) | `stratumFt = 2` |
  1833  const px = (c.x + 0.5) * CELL_FT, py = (c.y + 0.5) * CELL_FT, pe = (c.z + 2) * STRATA + cs + 0.5;

### C465 ADR:1438 game/js/plugins/DEUS_Levels.js:1835 (bare, file from 0 line(s) back) OK
section: 15.0 The governing scale
claim: | Stratum | 2 ft | **1 ft.** The strata header says every 5 ft cell of every level is "five 1 ft strata" (`DEUS_Levels.js:985-986`). The sphere-damage JSDoc says "a cell is 5 ft across, a stratum 1 ft high" (`:1790-1791`), and its code measures height in strata against a radius in feet (`:1833`, `:1835`, `:1845`) | `stratumFt = 2` |
  1835  const e0 = Math.max(0, Math.floor(pe - radius)), e1 = Math.min(24, Math.floor(pe + radius));

### C466 ADR:1438 game/js/plugins/DEUS_Levels.js:1845 (bare, file from 0 line(s) back) OK
section: 15.0 The governing scale
claim: | Stratum | 2 ft | **1 ft.** The strata header says every 5 ft cell of every level is "five 1 ft strata" (`DEUS_Levels.js:985-986`). The sphere-damage JSDoc says "a cell is 5 ft across, a stratum 1 ft high" (`:1790-1791`), and its code measures height in strata against a radius in feet (`:1833`, `:1835`, `:1845`) | `stratumFt = 2` |
  1845  const de = (z + 2) * STRATA + s + 0.5 - pe, d2 = h2 + de * de;

### C467 ADR:1440 game/js/plugins/DEUS_Levels.js:1787 OK
section: 15.0 The governing scale
claim: | World height | 320 ft at 32 layers | 25 ft: 5 levels on one elevation scale of 25 strata, 0..24 (`DEUS_Levels.js:1787`) | (zMax − zMin + 1) × 10 ft |
  1787  *     25 strata of a column are one elevation scale, e = (z + 2) * 5 + s, 0..24), takes the damage.

### C468 ADR:1445 docs/OWNER_DECISIONS.md:230-235 OK
section: 15.0 The governing scale
claim: - **The core has no pixels.** Pixel sizes are presentation. The scale chart governs them (DEC-016, "The scale chart is the governing size authority for the art catalogue, templates and placement", `docs/OWNER_DECISIONS.md:230-235`), and DEC-016 itself says sim distances follow DEC-013. How many pixels a stratum is (`stratumPx`) is an Owner question under DEC-016, and the core doesn't depend on the answer.
   230  ### Decision `DEC-016`: The scale chart is the governing size authority for the art catalogue, templates and placement
   231  - **Date Logged:** 2026-09-26
   232  - **Decider:** Owner (00:11 CT, "the most important is the scale chart"; relayed by PM 0019-S/0028-AC)
   233  - **Status:** `DECIDED`
   234  - **Ruling:** Every catalogue entry's pixel size, envelope, footprint and anchor derive from the scale chart (`art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png`, whose numeric source is `game/data/DEUS_ScaleRegistry.json`; th
   235  - **Open:** If "the scale chart" means a different file, the Owner names it and DEC-016 is amended.

### C469 ADR:1449 game/js/plugins/DEUS_Fluid.js:50 OK
section: 15.0 The governing scale
claim: - **Fluid depth.** The integer units stay (0..7 per full cell, `DEUS_Fluid.js:50`), but a full cell is now 10 ft deep, so one unit is 10/7 ft. V135 labels the five fluid depth states 1 to 5 ft, for 1 ft strata (`docs/VISION.md:129`). That is Q17.
    50  const DEPTH_MAX = 7;

### C470 ADR:1449 docs/VISION.md:129 OK
section: 15.0 The governing scale
claim: - **Fluid depth.** The integer units stay (0..7 per full cell, `DEUS_Fluid.js:50`), but a full cell is now 10 ft deep, so one unit is 10/7 ft. V135 labels the five fluid depth states 1 to 5 ft, for 1 ft strata (`docs/VISION.md:129`). That is Q17.
   129  | V135 | **Canonical 5-Step Fluid Depth Standard for Water and Lava** (user directive 2026-09-25): Exactly 5 visible, semantic depth states for water and 5 for lava, matching the 5 physical 1 ft strata per 5 ft cell (1 f

### C471 ADR:1452 game/js/plugins/DEUS_Levels.js:985-986 OK
section: 15.0 The governing scale
claim: **Who changes the legacy 1 ft assumptions.** This ADR doesn't edit code. The comments at `DEUS_Levels.js:985-986` and `:1790-1791`, and the sphere math, belong to whichever lands first: WG.00.17, which already refactors the range, or SIM.00.05/terrain, which ports them to the core. Either way the change is recorded with a before/after fixture (R13).
   985  // Strata (DEUS-TSK-FABLE-19A): the one geometry authority. Every 5 ft cell of every level is five 1 ft strata,
   986  // S0 (bottom) .. S4 (top). A stratum is two bytes: its material (id in the low 6 bits, 0 = air; 0x80 = constructed)

### C472 ADR:1452 game/js/plugins/DEUS_Levels.js:1790-1791 (bare, file from 0 line(s) back) OK
section: 15.0 The governing scale
claim: **Who changes the legacy 1 ft assumptions.** This ADR doesn't edit code. The comments at `DEUS_Levels.js:985-986` and `:1790-1791`, and the sphere math, belong to whichever lands first: WG.00.17, which already refactors the range, or SIM.00.05/terrain, which ports them to the core. Either way the change is recorded with a before/after fixture (R13).
  1790  *     a sphere around the middle of that stratum; a stratum takes damage x falloff(distance / radius) when its middle
  1791  *     is within the radius (a cell is 5 ft across, a stratum 1 ft high). It crosses levels the same way.

### C473 ADR:1458 game/js/plugins/DEUS_World.js:155 OK
section: 15.1 Where the range is fixed today
claim: | DEUS_World | `LEVELS = [-2, -1, 0, 1, 2]` (`DEUS_World.js:155`), map-id slots for 5 levels (`:156`), `isLevel` bounds (`:158`) |
   155  const LEVELS = Object.freeze([-2, -1, 0, 1, 2]);

### C474 ADR:1458 game/js/plugins/DEUS_World.js:156 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_World | `LEVELS = [-2, -1, 0, 1, 2]` (`DEUS_World.js:155`), map-id slots for 5 levels (`:156`), `isLevel` bounds (`:158`) |
   156  const SLOT = { 0: 0, 1: 1, 2: 2, "-1": 3, "-2": 4 }; // map id slot of each level; the ground keeps slot 0 (changed only by a test provocation)

### C475 ADR:1458 game/js/plugins/DEUS_World.js:158 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_World | `LEVELS = [-2, -1, 0, 1, 2]` (`DEUS_World.js:155`), map-id slots for 5 levels (`:156`), `isLevel` bounds (`:158`) |
   158  const isLevel = z => Number.isInteger(z) && z >= -2 && z <= 2;

### C476 ADR:1459 game/js/plugins/DEUS_Levels.js:61 OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
    61  const LEVELS = Object.freeze([-2, -1, 0, 1, 2]);

### C477 ADR:1459 game/js/plugins/DEUS_Levels.js:150 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
   150  const isLevel = z => (Number.isInteger(z) && z >= -2 && z <= 2) || (provoked("five_levels") && z === 3);

### C478 ADR:1459 game/js/plugins/DEUS_Levels.js:998 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
   998  const LEVEL_KEY = ["-2", "-1", "0", "1", "2"];

### C479 ADR:1459 game/js/plugins/DEUS_Levels.js:1137 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1137  deltas.levels = [new Map(), new Map(), new Map(), new Map(), new Map()];

### C480 ADR:1459 game/js/plugins/DEUS_Levels.js:1141 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1141  for (let li = 0; li < 5; li++) {

### C481 ADR:1459 game/js/plugins/DEUS_Levels.js:1038 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1038  const fluid = z === -2 ? M_LAVA : M_WATER;

### C482 ADR:1459 game/js/plugins/DEUS_Levels.js:1285 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1285  if (!st || !isLevel(z) || z < -2 || z > 2 || !W.inWorld(ax, ay, z) || x < 0 || y < 0 || x >= st.size || y >= st.size) return 0;

### C483 ADR:1459 game/js/plugins/DEUS_Levels.js:1588 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1588  if (!isLevel(r.z) || r.z < -2 || r.z > 2 || !W.inWorld(r.ax, r.ay, r.z) || r.x < 0 || r.y < 0 || r.x >= st.size || r.y >= st.size) return refuse(`level ${ref && ref.z} or cell (${r.x},${r.y}) doesn't exist`);

### C484 ADR:1459 game/js/plugins/DEUS_Levels.js:1627 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1627  if (!st || !isLevel(r.z) || r.z < -2 || r.z > 2 || !W.inWorld(r.ax, r.ay, r.z) || r.x < 0 || r.y < 0 || r.x >= st.size || r.y >= st.size) return null;

### C485 ADR:1459 game/js/plugins/DEUS_Levels.js:1732 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1732  if (!Number.isInteger(z) || z < -2 || z > 2 || !W.inWorld(ax, ay, z) || x < 0 || y < 0 || x >= st.size || y >= st.size) return `level ${z} or cell (${x},${y}) doesn't exist`;

### C486 ADR:1459 game/js/plugins/DEUS_Levels.js:1828 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1828  if (![c.x, c.y, c.z, cs].every(Number.isInteger) || cs < 0 || cs >= STRATA || c.z < -2 || c.z > 2) return { ok: false, reason: "center needs integer x, y, z (-2..2) and s (0..4)" };

### C487 ADR:1459 game/js/plugins/DEUS_Levels.js:3024 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  3024  if (!isLevel(r.z) || r.z < -2 || r.z > 2 || !W.inWorld(r.ax, r.ay, r.z) || r.x < 0 || r.y < 0 || r.x >= st.size || r.y >= st.size) return refuse(`level ${ref && ref.z} or cell (${r.x},${r.y}) doesn't exist`);

### C488 ADR:1459 game/js/plugins/DEUS_Levels.js:3097 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  3097  if (nz < -2 || nz > 2) continue;

### C489 ADR:1459 game/js/plugins/DEUS_Levels.js:3117 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  3117  if (nz < -2 || nz > 2) continue;

### C490 ADR:1459 game/js/plugins/DEUS_Levels.js:1805 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1805  const e0 = Math.max(0, (minZ + 2) * STRATA + minS), e1 = Math.min(24, (maxZ + 2) * STRATA + maxS);

### C491 ADR:1459 game/js/plugins/DEUS_Levels.js:1813 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1813  for (let s = 0; s < STRATA; s++) { const e = (z + 2) * STRATA + s; if (e >= e0 && e <= e1) hits.push([s, damage]); }

### C492 ADR:1459 game/js/plugins/DEUS_Levels.js:1833 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1833  const px = (c.x + 0.5) * CELL_FT, py = (c.y + 0.5) * CELL_FT, pe = (c.z + 2) * STRATA + cs + 0.5;

### C493 ADR:1459 game/js/plugins/DEUS_Levels.js:1835 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1835  const e0 = Math.max(0, Math.floor(pe - radius)), e1 = Math.min(24, Math.floor(pe + radius));

### C494 ADR:1459 game/js/plugins/DEUS_Levels.js:1845 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1845  const de = (z + 2) * STRATA + s + 0.5 - pe, d2 = h2 + de * de;

### C495 ADR:1459 game/js/plugins/DEUS_Levels.js:1873 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1873  if (f > 0) return (qZ + 2) * STRATA + f - 1;

### C496 ADR:1459 game/js/plugins/DEUS_Levels.js:1876 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1876  if (SOLID_B[rdM[rdO + 4]] === 1) return (qZ + 2) * STRATA - 1;

### C497 ADR:1459 game/js/plugins/DEUS_Levels.js:1765 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`); `isLevel` (`:150`); `LEVEL_KEY` of 5 keys (`:998`); 5 fixed change maps (`:1137`, loop `:1141`); lava on −2 in the generated baseline (`:1038`); range checks `z < -2 \|\| z > 2` (`:1285`, `:1588`, `:1627`, `:1732`, `:1828`, `:3024`) and neighbour bounds (`:3097`, `:3117`); the elevation scale `(z + 2) * STRATA`, capped at 24 (`:1805`, `:1813`, `:1833`, `:1835`, `:1845`, `:1873`, `:1876`), and its inverse (`:1765`) |
  1765  const levelOfElevation = e => Math.floor(e / STRATA) - 2;

### C498 ADR:1460 game/js/plugins/DEUS_Fluid.js:56-58 OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Fluid | `Z_MIN = -2`, `Z_MAX = 2`, `Z_LEVELS = 5` (`DEUS_Fluid.js:56-58`); every level's grids and queue flags allocated up front (`DEUS_Fluid.js:173-190`: `inQueue` sized for all levels at `:183`, the grids at `:186-190`); "Bottom of the world (-2)" (`:291`) |
    56  const Z_MIN = -2;
    57  const Z_MAX = 2;
    58  const Z_LEVELS = 5; // -2, -1, 0, 1, 2

### C499 ADR:1460 game/js/plugins/DEUS_Fluid.js:173-190 OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Fluid | `Z_MIN = -2`, `Z_MAX = 2`, `Z_LEVELS = 5` (`DEUS_Fluid.js:56-58`); every level's grids and queue flags allocated up front (`DEUS_Fluid.js:173-190`: `inQueue` sized for all levels at `:183`, the grids at `:186-190`); "Bottom of the world (-2)" (`:291`) |
   173  const totalCells = Z_LEVELS * n;
   174  data = {
   175  ax: ax | 0,
      ...
   189  data.floodGrids.set(z, new Uint8Array(n));
   190  }

### C500 ADR:1460 game/js/plugins/DEUS_Fluid.js:183 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Fluid | `Z_MIN = -2`, `Z_MAX = 2`, `Z_LEVELS = 5` (`DEUS_Fluid.js:56-58`); every level's grids and queue flags allocated up front (`DEUS_Fluid.js:173-190`: `inQueue` sized for all levels at `:183`, the grids at `:186-190`); "Bottom of the world (-2)" (`:291`) |
   183  inQueue: new Uint8Array(totalCells),

### C501 ADR:1460 game/js/plugins/DEUS_Fluid.js:186-190 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Fluid | `Z_MIN = -2`, `Z_MAX = 2`, `Z_LEVELS = 5` (`DEUS_Fluid.js:56-58`); every level's grids and queue flags allocated up front (`DEUS_Fluid.js:173-190`: `inQueue` sized for all levels at `:183`, the grids at `:186-190`); "Bottom of the world (-2)" (`:291`) |
   186  // Pre-allocate 5 Z-levels
   187  for (let z = Z_MIN; z <= Z_MAX; z++) {
   188  data.grids.set(z, new Uint8Array(n));
   189  data.floodGrids.set(z, new Uint8Array(n));
   190  }

### C502 ADR:1460 game/js/plugins/DEUS_Fluid.js:291 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Fluid | `Z_MIN = -2`, `Z_MAX = 2`, `Z_LEVELS = 5` (`DEUS_Fluid.js:56-58`); every level's grids and queue flags allocated up front (`DEUS_Fluid.js:173-190`: `inQueue` sized for all levels at `:183`, the grids at `:186-190`); "Bottom of the world (-2)" (`:291`) |
   291  if (z <= Z_MIN) return false; // Bottom of the world (-2)

### C503 ADR:1461 game/js/plugins/DEUS_Minimap.js:59-60 OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Minimap | `Z_LEVELS = [2, 1, 0, -1, -2]`, `Z_COUNT = 5` (`DEUS_Minimap.js:59-60`) |
    59  const Z_LEVELS = [2, 1, 0, -1, -2];
    60  const Z_COUNT = 5;

### C504 ADR:1464 game/js/plugins/DEUS_Levels.js:1037 OK
section: 15.1 Where the range is fixed today
claim: - the strata baseline, a `Uint8Array(n × 5)` per level (`DEUS_Levels.js:1037`);
  1037  const n = size * size, m = new Uint8Array(n * STRATA), conn = new Uint8Array((n + 1) >> 1);

### C505 ADR:1465 game/js/plugins/DEUS_Fluid.js:173 OK
section: 15.1 Where the range is fixed today
claim: - fluid grids, flood caches and `inQueue` for every level (`DEUS_Fluid.js:173`, `:179-189`);
   173  const totalCells = Z_LEVELS * n;

### C506 ADR:1465 game/js/plugins/DEUS_Fluid.js:179-189 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: - fluid grids, flood caches and `inQueue` for every level (`DEUS_Fluid.js:173`, `:179-189`);
   179  grids: new Map(),       // z -> Uint8Array(n)
   180  floodGrids: new Map(),  // z -> Uint8Array(n) (legacy visual cache: 1=water, 2=lava)
   181  queue: [],              // cell indices: (zIdx * n + idx)
      ...
   188  data.grids.set(z, new Uint8Array(n));
   189  data.floodGrids.set(z, new Uint8Array(n));

### C507 ADR:1466 game/js/plugins/DEUS_World.js:605 OK
section: 15.1 Where the range is fixed today
claim: - map builds per level (`DEUS_World.js:605`, `:613`).
   605  const data = new Array(cells * 6).fill(0);

### C508 ADR:1466 game/js/plugins/DEUS_World.js:613 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: - map builds per level (`DEUS_World.js:605`, `:613`).
   613  const objects = new Uint16Array(cells);

### C509 ADR:1468 docs/worldgen/DEUS_WORLDGEN_WBS.md:105 OK
section: 15.1 Where the range is fixed today
claim: At 32 layers these grow 32/5 times. WG.00.17's row already requires sparse storage (`docs/worldgen/DEUS_WORLDGEN_WBS.md:105`). The chunk format of §15.3 is the target, so WG.00.17 should use it, or a layout that ports to it one to one.
   105  | **WG.00.17** | Z-Range Configurable Setting & Expansion to 32 Layers | Claude | Make Z-range a single configurable setting in engine core, then expand to 32 layers (-16..+15: surface 0, 16 underground -1..-16, 15 upper

### C510 ADR:1481 docs/OWNER_DECISIONS.md:177 OK
section: 15.2 In the core the range is data
claim: | test | −4..+4 (9 layers) | the second range of every core test. DEC-013 requires 9-layer runs (`docs/OWNER_DECISIONS.md:177`), and so does WG.00.17 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:105`) |
   177  1. **Thirty-Two Z Layers:** The world simulation and presentation expand to 32 vertical Z layers (superseding 9 layers; formerly -2..+2). Total vertical headroom: 320 ft. The Z-range refactor targets 32 as the default ga

### C511 ADR:1481 docs/worldgen/DEUS_WORLDGEN_WBS.md:105 OK
section: 15.2 In the core the range is data
claim: | test | −4..+4 (9 layers) | the second range of every core test. DEC-013 requires 9-layer runs (`docs/OWNER_DECISIONS.md:177`), and so does WG.00.17 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:105`) |
   105  | **WG.00.17** | Z-Range Configurable Setting & Expansion to 32 Layers | Claude | Make Z-range a single configurable setting in engine core, then expand to 32 layers (-16..+15: surface 0, 16 underground -1..-16, 15 upper

### C512 ADR:1511 game/js/plugins/DEUS_Levels.js:1037 OK
section: 15.4 Memory
claim: | Strata | `Uint8Array(n × 5)` + connectors `Uint8Array(n/2)` = 352 KiB (`DEUS_Levels.js:1037`) | 5,120 B + 512 B |
  1037  const n = size * size, m = new Uint8Array(n * STRATA), conn = new Uint8Array((n + 1) >> 1);

### C513 ADR:1512 game/js/plugins/DEUS_World.js:613 OK
section: 15.4 Memory
claim: | Objects | inside each map build: `Uint16Array(cells)` (`DEUS_World.js:613`) | 2,048 B |
   613  const objects = new Uint16Array(cells);

### C514 ADR:1513 game/js/plugins/DEUS_Fluid.js:179-183 OK
section: 15.4 Memory
claim: | Fluid | grid + flood cache + a share of `inQueue`: 3 × 64 KiB (`DEUS_Fluid.js:179-183`) | 1,024 B, only when fluid is present |
   179  grids: new Map(),       // z -> Uint8Array(n)
   180  floodGrids: new Map(),  // z -> Uint8Array(n) (legacy visual cache: 1=water, 2=lava)
   181  queue: [],              // cell indices: (zIdx * n + idx)
   182  head: 0,
   183  inQueue: new Uint8Array(totalCells),

### C515 ADR:1514 game/js/plugins/DEUS_Levels.js:997 OK
section: 15.4 Memory
claim: | Stratum HP | inside the changed-cell records (`DEUS_Levels.js:997`) | 5,120 B, only once a stratum is damaged |
   997  const REC = 11, REC_M = 1, REC_HP = 6;       // a changed cell: [connector, m0..m4, hp0..hp4]

### C516 ADR:1515 game/js/plugins/DEUS_World.js:605 OK
section: 15.4 Memory
claim: | Tiles | inside each map build: a 393,216-element array (`DEUS_World.js:605`); up to 6 builds cached (`:801`) | none: a render projection (§4.2) |
   605  const data = new Array(cells * 6).fill(0);

### C517 ADR:1515 game/js/plugins/DEUS_World.js:801 (bare, file from 0 line(s) back) OK
section: 15.4 Memory
claim: | Tiles | inside each map build: a 393,216-element array (`DEUS_World.js:605`); up to 6 builds cached (`:801`) | none: a render projection (§4.2) |
   801  const PEEK_CACHE = 6;

### C518 ADR:1530 game/js/plugins/DEUS_Levels.js:997 OK
section: 15.5 Save size
claim: - Strata changes are saved as one 22-hex-character record per changed cell (`REC = 11` bytes, `DEUS_Levels.js:997`; encoder `:1110-1114`) under `levels[z].strata["ax,ay"]` (`:990-991`).
   997  const REC = 11, REC_M = 1, REC_HP = 6;       // a changed cell: [connector, m0..m4, hp0..hp4]

### C519 ADR:1530 game/js/plugins/DEUS_Levels.js:1110-1114 (bare, file from 0 line(s) back) OK
section: 15.5 Save size
claim: - Strata changes are saved as one 22-hex-character record per changed cell (`REC = 11` bytes, `DEUS_Levels.js:997`; encoder `:1110-1114`) under `levels[z].strata["ax,ay"]` (`:990-991`).
  1110  function encodeRecord(r) {
  1111  let s = "";
  1112  for (let k = 0; k < REC; k++) s += HEX[r[k] >> 4] + HEX[r[k] & 15];
  1113  return s;
  1114  }

### C520 ADR:1530 game/js/plugins/DEUS_Levels.js:990-991 (bare, file from 0 line(s) back) OK
section: 15.5 Save size
claim: - Strata changes are saved as one 22-hex-character record per changed cell (`REC = 11` bytes, `DEUS_Levels.js:997`; encoder `:1110-1114`) under `levels[z].strata["ax,ay"]` (`:990-991`).
   990  // UF.World.state.levels[z].strata["ax,ay"][i]. The shape codes the rest of the game reads (solid, floor, open,
   991  // ramp, stairs) are derived from the strata here and nowhere else. docs/systems/UF_Levels.md, section Strata.

### C521 ADR:1531 game/js/plugins/DEUS_Fluid.js:821-844 OK
section: 15.5 Save size
claim: - Fluid is saved as a 7-number array per wet cell, including water that is still where generation put it (`DEUS_Fluid.js:821-844`).
   821  makeSaveContents() {
   822  const records = [];
   823  for (const [key, data] of areas.entries()) {
      ...
   843  };
   844  },

### C522 ADR:1545 docs/worldgen/DEUS_WORLDGEN_WBS.md:196 OK
section: 15.6 LOD across 32 layers
claim: - **Home layer ranges** (DEC-013 item 5; WG.62.02, `docs/worldgen/DEUS_WORLDGEN_WBS.md:196`). A race's home band is simulated at L2 by coarse rules unless tracked units there are in focus.
   196  | **WG.62.02** | Race Home-Layer Assignment in WorldGen | Fable | Procedural spawn placement and native habitat generation for 9 races across 32 Z layers (-16..+15) and 5 vertical biome bands (Lower-2 -16..-9, Lower-1 -8

### C523 ADR:1553 docs/VISION.md:131 OK
section: 16. Structural Integrity & Collapse (V137)
claim: V137 is at `docs/VISION.md:131` (from directive 0021-V §6). The WBS packages are SIM.40.01–.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:533-536`). SIM.40.01 sets the numbers (spans, capacities). It now also names blast propagation, which §18 covers. This ADR fixes where the system lives, how it runs, and what it must conserve.
   131  | V137 | **Structural Integrity, Load-Bearing Architecture & Mass-Conserving Collapse** (user directive 2026-09-26, Directive 0021-V §6): Solid terrain, constructed walls, floors, and roofs possess material-dependent str

### C524 ADR:1553 docs/worldgen/DEUS_WORLDGEN_WBS.md:533-536 OK
section: 16. Structural Integrity & Collapse (V137)
claim: V137 is at `docs/VISION.md:131` (from directive 0021-V §6). The WBS packages are SIM.40.01–.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:533-536`). SIM.40.01 sets the numbers (spans, capacities). It now also names blast propagation, which §18 covers. This ADR fixes where the system lives, how it runs, and what it must conserve.
   533  | SIM.40.01 | **Support model design & blast propagation** (materials, vertical propagation, span limits, cross-layer blast attenuation, V128 natural rock, V133 change-driven). Load-bearing rules, span capacities, and ve
   534  | SIM.40.02 | **Collapse event simulation** (downward cascading, rubble/talus mass conservation LIFE-001, V95 impact damage, deep-history DEC-012) | PLANNED | Directive 0021-V §6; V137; LIFE-001; V95 | dep: SIM.40.01 | C
   535  | SIM.40.03 | **Colonist structural behaviour** (props, pillars, avoid dangerous excavation) | PLANNED | Directive 0021-V §6; V137 | dep: SIM.40.02 | Claude → Grok | Colonist builders and miners respect structural suppor
   536  | SIM.40.04 | **Collapse QA & fixtures** (deterministic cave-in, tall tower +1..+4, mass conservation, perf bound) | PLANNED | Directive 0021-V §6; V137 | dep: SIM.40.02 | Claude → Grok (mutation) | Automated test suite:

### C525 ADR:1559 game/js/plugins/DEUS_Levels.js:1000-1010 OK
section: 16.1 What exists
claim: - **A strata material table** with `support` (0..1 at full HP), `maxHP`, `debris` and a damage `resist` per type for stone, soil and wood (`DEUS_Levels.js:1000-1010`: the comment at `:1000-1002`, the table at `:1003-1010`).
  1000  // Material table. Diagnostic values, not balanced: maxHP in HP points; resist multiplies incoming damage by damage
  1001  // type (a type not listed: 1); support is what a full-HP stratum carries (0..1); debris is what a destroyed stratum
  1002  // leaves, reported in levels:strataDestroyed (no item drops in 19A).
      ...
  1009  { id: M_LAVA, key: "lava", solid: false, fluid: true, maxHP: 0, support: 0, debris: null, resist: {} }
  1010  ].map(m => Object.freeze(Object.assign(m, { resist: Object.freeze(m.resist) }))));

### C526 ADR:1559 game/js/plugins/DEUS_Levels.js:1000-1002 (bare, file from 0 line(s) back) OK
section: 16.1 What exists
claim: - **A strata material table** with `support` (0..1 at full HP), `maxHP`, `debris` and a damage `resist` per type for stone, soil and wood (`DEUS_Levels.js:1000-1010`: the comment at `:1000-1002`, the table at `:1003-1010`).
  1000  // Material table. Diagnostic values, not balanced: maxHP in HP points; resist multiplies incoming damage by damage
  1001  // type (a type not listed: 1); support is what a full-HP stratum carries (0..1); debris is what a destroyed stratum
  1002  // leaves, reported in levels:strataDestroyed (no item drops in 19A).

### C527 ADR:1559 game/js/plugins/DEUS_Levels.js:1003-1010 (bare, file from 0 line(s) back) OK
section: 16.1 What exists
claim: - **A strata material table** with `support` (0..1 at full HP), `maxHP`, `debris` and a damage `resist` per type for stone, soil and wood (`DEUS_Levels.js:1000-1010`: the comment at `:1000-1002`, the table at `:1003-1010`).
  1003  const STRATA_MATERIALS = Object.freeze([
  1004  { id: M_AIR, key: "air", solid: false, fluid: false, maxHP: 0, support: 0, debris: null, resist: {} },
  1005  { id: M_STONE, key: "stone", solid: true, fluid: false, maxHP: 120, support: 1, debris: "rubble", resist: { impact: 0.5, dig: 1, blast: 1, fire: 0.1 } },
  1006  { id: M_SOIL, key: "soil", solid: true, fluid: false, maxHP: 40, support: 0.5, debris: "loose_earth", resist: { impact: 1, dig: 2, blast: 1.5, fire: 0.2 } },
  1007  { id: M_WOOD, key: "wood", solid: true, fluid: false, maxHP: 60, support: 0.7, debris: "broken_timber", resist: { impact: 1, dig: 1, blast: 1.2, fire: 2 } },
  1008  { id: M_WATER, key: "water", solid: false, fluid: true, maxHP: 0, support: 0, debris: null, resist: {} },
  1009  { id: M_LAVA, key: "lava", solid: false, fluid: true, maxHP: 0, support: 0, debris: null, resist: {} }
  1010  ].map(m => Object.freeze(Object.assign(m, { resist: Object.freeze(m.resist) }))));

### C528 ADR:1561 game/js/plugins/DEUS_Levels.js:1709-1725 OK
section: 16.1 What exists
claim: - `damageCell` writes one cell and emits `levels:strataDamaged` / `levels:strataDestroyed` (`DEUS_Levels.js:1709-1725`).
  1709  function damageCell(st, ax, ay, x, y, z, hits, damageType, source) {
  1710  const i = y * st.size + x, ref = { area: { x: ax, y: ay }, x, y, z };
  1711  const rec = currentRecord(st, z, ax, ay, i);
      ...
  1724  }
  1725  return results;

### C529 ADR:1562 game/js/plugins/DEUS_Levels.js:1783-1794 (bare, file from 1 line(s) back) OK
section: 16.1 What exists
claim: - `applyVolumeDamage` is documented at `:1783-1794`, and its signature is at `:1795`. It calls `damageCell` from its box form (`:1815`) and from its sphere form, `sphereDamage` (`:1849`).
  1783  /**
  1784  * Damage a volume. Two forms:
  1785  *   applyVolumeDamage(area, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact"[, { source }]):
      ...
  1793  * skipped, destroyed: [{ x, y, z, stratum, material }], levels } or { ok: false, reason }.
  1794  */

### C530 ADR:1562 game/js/plugins/DEUS_Levels.js:1795 (bare, file from 1 line(s) back) OK
section: 16.1 What exists
claim: - `applyVolumeDamage` is documented at `:1783-1794`, and its signature is at `:1795`. It calls `damageCell` from its box form (`:1815`) and from its sphere form, `sphereDamage` (`:1849`).
  1795  function applyVolumeDamage(a, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact", opts = {}) {

### C531 ADR:1562 game/js/plugins/DEUS_Levels.js:1815 (bare, file from 1 line(s) back) OK
section: 16.1 What exists
claim: - `applyVolumeDamage` is documented at `:1783-1794`, and its signature is at `:1795`. It calls `damageCell` from its box form (`:1815`) and from its sphere form, `sphereDamage` (`:1849`).
  1815  addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);

### C532 ADR:1562 game/js/plugins/DEUS_Levels.js:1849 (bare, file from 1 line(s) back) OK
section: 16.1 What exists
claim: - `applyVolumeDamage` is documented at `:1783-1794`, and its signature is at `:1795`. It calls `damageCell` from its box form (`:1815`) and from its sphere form, `sphereDamage` (`:1849`).
  1849  addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);

### C533 ADR:1564 game/js/plugins/DEUS_Levels.js:1001-1002 OK
section: 16.1 What exists
claim: - **A destroyed stratum becomes air with no debris placed** (`DEUS_Levels.js:1001-1002`, `:1700-1702`; §1.4).
  1001  // type (a type not listed: 1); support is what a full-HP stratum carries (0..1); debris is what a destroyed stratum
  1002  // leaves, reported in levels:strataDestroyed (no item drops in 19A).

### C534 ADR:1564 game/js/plugins/DEUS_Levels.js:1700-1702 (bare, file from 0 line(s) back) OK
section: 16.1 What exists
claim: - **A destroyed stratum becomes air with no debris placed** (`DEUS_Levels.js:1001-1002`, `:1700-1702`; §1.4).
  1700  out.destroyed = true;
  1701  out.debris = mat.debris;
  1702  rec[REC_M + s] = M_AIR;

### C535 ADR:1565 game/js/plugins/DEUS_Colonists.js:3736 OK
section: 16.1 What exists
claim: - **Construction refuses unsupported airborne builds** (`DEUS_Colonists.js:3736`).
  3736  else if (zOf(c) !== 0 && (!World().walkable || !World().walkable(c.area.x, c.area.y, x, y, { z: zOf(c), ground: true }))) state = step.exact ? "blocked" : "skipped"; // no excavation or unsupported airborne construction

### C536 ADR:1566 docs/OWNER_DECISIONS.md:137 OK
section: 16.1 What exists
claim: - **Ledge rule.** DEC-010 (`docs/OWNER_DECISIONS.md:137`) is OPEN, with the default "lateral connectivity is sufficient".
   137  ### Decision `DEC-010`: Rock Ledge Support vs. Lateral Edge Connectivity in Cuts/Caves

### C537 ADR:1567 game/js/plugins/DEUS_Fluid.js:941-944 OK
section: 16.1 What exists
claim: - **Fluid already wakes** on `levels:*` geometry events (`DEUS_Fluid.js:941-944`).
   941  UF.Events.on("levels:cellChanged", handleGeometryChange);
   942  UF.Events.on("levels:shapeChanged", handleGeometryChange);
   943  UF.Events.on("levels:strataChanged", handleGeometryChange);
   944  UF.Events.on("levels:strataDestroyed", handleGeometryChange);

### C538 ADR:1596 game/js/plugins/DEUS_Doors.js:444-445 OK
section: 16.4 The collapse event
claim: - Objects break into their catalog remains, which is a transform. The Doors path already does this: `DEUS_Doors.js:444-445`.
   444  const O = Objects(), type = O && O.type(s.objectId), ruin = type && type.ruin ? type.ruin : "rubble";
   445  if (O) O.setIn(at.area, at.x, at.y, ruin);

### C539 ADR:1630 docs/VISION.md:132 OK
section: 17. Decay & Reclamation (V138)
claim: V138 is at `docs/VISION.md:132` (from directive 0021-V §7). The geology end state is directive 0021-V §8. The WBS packages are SIM.40.05–.09 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:537-541`). The risks are LIFE-001..003 (`docs/RISK_REGISTER.md:60-62`).
   132  | V138 | **Urban Decay, Nature Reclamation & Weathering** (user directive 2026-09-26, Directive 0021-V §7, LIFE-001..003): Abandoned and unmaintained structures decay physically over time rather than remaining static. Ro

### C540 ADR:1630 docs/worldgen/DEUS_WORLDGEN_WBS.md:537-541 OK
section: 17. Decay & Reclamation (V138)
claim: V138 is at `docs/VISION.md:132` (from directive 0021-V §7). The geology end state is directive 0021-V §8. The WBS packages are SIM.40.05–.09 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:537-541`). The risks are LIFE-001..003 (`docs/RISK_REGISTER.md:60-62`).
   537  | SIM.40.05 | **Decay model** (unmaintained structure HP loss by material/exposure, roofs fail first, walls fail, feeds collapse) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | SIM.40.01, dep: SIM.00.01 | Claude → Gro
   538  | SIM.40.06 | **Nature reclaiming** (vegetation invasion, soil/sediment burial, visible stages: intact -> weathered -> overgrown -> collapsed -> buried mound) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | dep: SIM.40
   539  | SIM.40.07 | **Item weathering & burial** (rot, rust, sediment burial, durable relics, LIFE-001 mass conservation, LIFE-002 no ore creation) | PLANNED | Directive 0021-V §7; V138; LIFE-001; LIFE-002 | dep: SIM.40.05 | C
   540  | SIM.40.08 | **Deep-history decay integration** (summary-level decay for fast-forward, LIFE-003 trace retention) | PLANNED | Directive 0021-V §7; V138; DEC-012; LIFE-003 | SIM.40.05, dep: SIM.30.02 | Claude → Grok | Dee
   541  | SIM.40.09 | **Decay QA & fixtures** (deterministic aging fixture, mass conservation, no ore creation, perf bound) | PLANNED | Directive 0021-V §7; V138 | SIM.40.06, SIM.40.07, dep: SIM.40.08 | Claude → Grok (mutation) 

### C541 ADR:1630 docs/RISK_REGISTER.md:60-62 OK
section: 17. Decay & Reclamation (V138)
claim: V138 is at `docs/VISION.md:132` (from directive 0021-V §7). The geology end state is directive 0021-V §8. The WBS packages are SIM.40.05–.09 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:537-541`). The risks are LIFE-001..003 (`docs/RISK_REGISTER.md:60-62`).
    60  | `LIFE-001` | Physical Matter Leakage in Lifecycle | Simulation | Matter silently deleted or leaked when constructions collapse, erode, or naturalize. | `CRITICAL` | Breaks mass-conservation; world hollows out over cent
    61  | `LIFE-002` | Accidental Finite Resource Respawning | Simulation / Economy | Naturalization or pedogenesis accidentally fabricating fresh metal ore veins (Fe, Cu, Ag, Au, Pt). | `CRITICAL` | Destroys economic scarcity; 
    62  | `LIFE-003` | Historical Over-Erasure | Narrative / World | Naturalization erasing meaningful player/faction historical geography too rapidly or completely. | `MAJOR` | World history feels impermanent; ruins feel generi

### C542 ADR:1636 game/js/plugins/DEUS_HistoricalDemographics.js:521 OK
section: 17.1 What exists
claim: - **History marks abandonment only as a year.** It sets `abandonedYear` (`DEUS_HistoricalDemographics.js:521`), and `isRuined` stays false (§14.1). Nothing physical changes.
   521  if (!s.population && s.abandonedYear === null) { s.abandonedYear = state.currentYear; emit(state, "abandonment", s.factionId, s.id, [], `${s.name} became uninhabited.`); }

### C543 ADR:1637 game/js/plugins/DEUS_Doors.js:444 OK
section: 17.1 What exists
claim: - **Broken doors become their catalog ruin.** `ruin` defaults to `rubble` (`DEUS_Doors.js:444`; the break at `:442-451`; header `:18`). Catalog objects carry a `ruin` variant (for example `UF_WorldCatalog.json:2147`, `:2188`).
   444  const O = Objects(), type = O && O.type(s.objectId), ruin = type && type.ruin ? type.ruin : "rubble";

### C544 ADR:1637 game/js/plugins/DEUS_Doors.js:442-451 (bare, file from 0 line(s) back) OK
section: 17.1 What exists
claim: - **Broken doors become their catalog ruin.** `ruin` defaults to `rubble` (`DEUS_Doors.js:444`; the break at `:442-451`; header `:18`). Catalog objects carry a `ruin` variant (for example `UF_WorldCatalog.json:2147`, `:2188`).
   442  s.hp = Math.max(0, s.hp - Math.max(0, Number(amount) || 0));
   443  if (s.hp > 0) { emit("doors:damaged", key, s.hp); return { broken: false, hp: s.hp }; }
   444  const O = Objects(), type = O && O.type(s.objectId), ruin = type && type.ruin ? type.ruin : "rubble";
      ...
   450  emit("doors:broken", key, ruin);
   451  return { broken: true, hp: 0, ruin };

### C545 ADR:1637 game/js/plugins/DEUS_Doors.js:18 (bare, file from 0 line(s) back) OK
section: 17.1 What exists
claim: - **Broken doors become their catalog ruin.** `ruin` defaults to `rubble` (`DEUS_Doors.js:444`; the break at `:442-451`; header `:18`). Catalog objects carry a `ruin` variant (for example `UF_WorldCatalog.json:2147`, `:2188`).
    18  * and become their catalog ruin when destroyed.

### C546 ADR:1637 game/data/UF_WorldCatalog.json:2147 OK
section: 17.1 What exists
claim: - **Broken doors become their catalog ruin.** `ruin` defaults to `rubble` (`DEUS_Doors.js:444`; the break at `:442-451`; header `:18`). Catalog objects carry a `ruin` variant (for example `UF_WorldCatalog.json:2147`, `:2188`).
  2147  "ruin": "bones_pile"

### C547 ADR:1637 game/data/UF_WorldCatalog.json:2188 (bare, file from 0 line(s) back) OK
section: 17.1 What exists
claim: - **Broken doors become their catalog ruin.** `ruin` defaults to `rubble` (`DEUS_Doors.js:444`; the break at `:442-451`; header `:18`). Catalog objects carry a `ruin` variant (for example `UF_WorldCatalog.json:2147`, `:2188`).
  2188  "ruin": "rubble"

### C548 ADR:1638 game/js/plugins/DEUS_Ecology.js:308-389 OK
section: 17.1 What exists
claim: - **Regrowth exists.** Ecology schedules regrowth records by game hour (`scheduleResource`, `processResources`, `DEUS_Ecology.js:308-389`) and matures sprouts by beat count (`stepBeat`, `DEUS_Ecology.js:764-873`).
   308  function scheduleResource(area, x, y, fromId, expectedId, opts) {
   309  const st = state(), O = Objects(), o = opts || {};
   310  const from = O && O.type ? O.type(fromId) : null;
      ...
   388  return result;
   389  }

### C549 ADR:1638 game/js/plugins/DEUS_Ecology.js:764-873 OK
section: 17.1 What exists
claim: - **Regrowth exists.** Ecology schedules regrowth records by game hour (`scheduleResource`, `processResources`, `DEUS_Ecology.js:308-389`) and matures sprouts by beat count (`stepBeat`, `DEUS_Ecology.js:764-873`).
   764  function stepBeat(opts) {
   765  const W = World(), O = Objects(), st = state(), o = opts || {};
   766  if (!enabled && !o.force || !W || !W.state || !O) return { spawned: 0, matured: 0 };
      ...
   872  return result;
   873  }

### C550 ADR:1648 game/js/plugins/DEUS_Levels.js:995 OK
section: 17.3 Decay in closed form: change-driven and LOD-invariant
claim: - Every built element has integer HP (V95) and a `lastMaintainedDay`. A built element is a built stratum (`M_BUILT`, `DEUS_Levels.js:995`) or a built object.
   995  const M_BUILT = 0x80, M_ID = 0x3f;

### C551 ADR:1677 docs/RISK_REGISTER.md:61 OK
section: 17.4 Reclamation, items and the geology cycle
claim: - iron and copper → oxidised trace-mineral sediment, never ore (LIFE-002, `docs/RISK_REGISTER.md:61`);
    61  | `LIFE-002` | Accidental Finite Resource Respawning | Simulation / Economy | Naturalization or pedogenesis accidentally fabricating fresh metal ore veins (Fe, Cu, Ag, Au, Pt). | `CRITICAL` | Destroys economic scarcity; 

### C552 ADR:1683 docs/RISK_REGISTER.md:62 OK
section: 17.4 Reclamation, items and the geology cycle
claim: - **LIFE-003** (`docs/RISK_REGISTER.md:62`). Meaningful sites have a floor. History sites, monuments, and graves with anchor records never go past "buried mound". Their anchor records are never removed. They end as buried finds, not nothing.
    62  | `LIFE-003` | Historical Over-Erasure | Narrative / World | Naturalization erasing meaningful player/faction historical geography too rapidly or completely. | `MAJOR` | World history feels impermanent; ruins feel generi

### C553 ADR:1691 docs/RISK_REGISTER.md:74 OK
section: 17.5 LOD, time domain and cadence
claim: - Nothing runs per frame, and nothing scans the whole world (NAT-003, `docs/RISK_REGISTER.md:74`).
    74  | `NAT-003` | Full-World Recurring Ecological Scanning | Performance / Simulation | Background natural systems (aquifers, soil moisture, wildfire, wildlife) iterating 65,536 cells per frame. | `CRITICAL` | Severe frame r

### C554 ADR:1693 docs/RISK_REGISTER.md:63 OK
section: 17.5 LOD, time domain and cadence
claim: - The formulas are closed-form in days, so an element's HP on day D is the same at L0, L1, L2, or after a deep-history jump of many years. This is the LIFE-004 requirement (`docs/RISK_REGISTER.md:63`).
    63  | `LIFE-004` | Catch-Up Nondeterminism | WorldGen / Simulation | Century-scale long-time catch-up simulation producing divergent terrain states across repeated runs. | `CRITICAL` | Divergent multiplayer/simulation histor

### C555 ADR:1713 docs/OWNER_DECISIONS.md:183 OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: - DEC-013 item 4, "Cross-Layer Blast & Structural Damage" (`docs/OWNER_DECISIONS.md:183`);
   183  4. **Cross-Layer Blast & Structural Damage:** Explosions and blasts (e.g. fireball) damage floors and propagate damage to the layer below depending on floor material, thickness, and attenuation. `applyVolumeDamage` propa

### C556 ADR:1714 docs/OWNER_DECISIONS.md:251-263 OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: - DEC-018, "SRD spells are hyper-realistic: effects play out physically in the simulation; SRD numbers stay the rules baseline" (`docs/OWNER_DECISIONS.md:251-263`);
   251  ### Decision `DEC-018`: SRD spells are hyper-realistic: effects play out physically in the simulation; SRD numbers stay the rules baseline
   252  - **Date Logged:** 2026-09-26
   253  - **Decider:** Owner (01:39 CT, relayed by PM 0028-AC)
      ...
   262  - **Open Sub-Question (PM default):** Conjured matter (*create water*, *wall of stone*) versus LIFE-001 mass conservation. The default is that conjured matter is an explicitly modelled magical source/sink, logged in the 
   263  - **WBS Integration:** `SIM.60.01` (audit), `SIM.60.02` (schema), `SIM.60.03` (runtime), `SIM.60.04` (QA fixtures).

### C557 ADR:1715 docs/OWNER_DECISIONS.md:304-312 OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: - DEC-022, "Cross-Layer 3D Targeting, Ballistics, and Volume Damage" (`docs/OWNER_DECISIONS.md:304-312`).
   304  ### Decision `DEC-022`: Cross-Layer 3D Targeting, Ballistics, and Volume Damage
   305  - **Date Logged:** 2026-09-26
   306  - **Status:** `DECIDED` (Owner ruling 01:35 CT, directive 0021-V Addendum §20)
      ...
   311  3. **Vertical Modifiers:** Falling projectiles and dropped objects gain velocity/impact damage based on height fallen; shooting upward incurs a range penalty.
   312  4. **Volume Area Damage:** Area-of-effect blasts (fireball, explosive shells) hitting a floor propagate cross-layer volume damage downward per DEC-013 §12. Targeting UI allows selecting visible cells on lower layers view

### C558 ADR:1717 docs/worldgen/DEUS_WORLDGEN_WBS.md:533 OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: **WBS:** SIM.40.01 (support model and blast propagation, `docs/worldgen/DEUS_WORLDGEN_WBS.md:533`), SIM.60.01–.04 (spell effects, `:558-561`) and GP.07.02 (cross-layer targeting, `:577`). VISION: V143 (`docs/VISION.md:404`) and V151 (`docs/VISION.md:412`).
   533  | SIM.40.01 | **Support model design & blast propagation** (materials, vertical propagation, span limits, cross-layer blast attenuation, V128 natural rock, V133 change-driven). Load-bearing rules, span capacities, and ve

### C559 ADR:1717 docs/worldgen/DEUS_WORLDGEN_WBS.md:558-561 (bare, file from 0 line(s) back) OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: **WBS:** SIM.40.01 (support model and blast propagation, `docs/worldgen/DEUS_WORLDGEN_WBS.md:533`), SIM.60.01–.04 (spell effects, `:558-561`) and GP.07.02 (cross-layer targeting, `:577`). VISION: V143 (`docs/VISION.md:404`) and V151 (`docs/VISION.md:412`).
   558  | SIM.60.01 | **SRD spell-effect audit** (`docs/audits/SRD_SPELL_EFFECT_AUDIT.md`, `docs/audits/srd_spell_effect_audit.json`). Classify all 327 spells in `game/data/srd51/spells.json` by world systems needed: heat, force
   559  | SIM.60.02 | **Spell-effect schema** (data-driven JSON Schema of reusable primitives: ignite, heat flux, impulse/blast via SIM.40.01, fluid source/sink, temperature/freeze, mass-conserving terrain edit, light, growth/de
   560  | SIM.60.03 | **Spell-effect runtime in headless sim core** (physical propagation of heat, impulse, fluids, freezing, terrain alteration decoupled from presentation frames) | PLANNED | Directive 0028-AC §5; DEC-018 | SIM
   561  | SIM.60.04 | **Spell-effect QA fixtures** (fireball floor breach, flood down stairwell, lake freeze, stone wall vs mass ledger, SRD stat invariance) | PLANNED | Directive 0028-AC §5; DEC-018 | dep: SIM.60.03 | Claude → 

### C560 ADR:1717 docs/worldgen/DEUS_WORLDGEN_WBS.md:577 (bare, file from 0 line(s) back) OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: **WBS:** SIM.40.01 (support model and blast propagation, `docs/worldgen/DEUS_WORLDGEN_WBS.md:533`), SIM.60.01–.04 (spell effects, `:558-561`) and GP.07.02 (cross-layer targeting, `:577`). VISION: V143 (`docs/VISION.md:404`) and V151 (`docs/VISION.md:412`).
   577  | GP.07.02 | **Cross-layer 3D targeting, ballistics & volume damage** (spells, arrows, thrown items through multi-Z openings, true 3D Euclidean range, vertical impact bonus / upward range penalty, cross-layer volume blas

### C561 ADR:1717 docs/VISION.md:404 OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: **WBS:** SIM.40.01 (support model and blast propagation, `docs/worldgen/DEUS_WORLDGEN_WBS.md:533`), SIM.60.01–.04 (spell effects, `:558-561`) and GP.07.02 (cross-layer targeting, `:577`). VISION: V143 (`docs/VISION.md:404`) and V151 (`docs/VISION.md:412`).
   404  - 2026-09-26: V143 added by the user: **Hyper-Realistic SRD Spell Effects** (DEC-018, Directive 0028-AC §5): Spell effects play out physically in the living-world simulation: fire ignites combustible materials and spread

### C562 ADR:1717 docs/VISION.md:412 OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: **WBS:** SIM.40.01 (support model and blast propagation, `docs/worldgen/DEUS_WORLDGEN_WBS.md:533`), SIM.60.01–.04 (spell effects, `:558-561`) and GP.07.02 (cross-layer targeting, `:577`). VISION: V143 (`docs/VISION.md:404`) and V151 (`docs/VISION.md:412`).
   412  - 2026-09-26: V151 added by the user: **Cross-Layer 3D Targeting, Ballistics & Volume Damage** (DEC-022, Directive 0021-V Addendum §20): Spells, arrows, and thrown items can target cells and units on lower and upper laye

### C563 ADR:1723 game/js/plugins/DEUS_Levels.js:1783-1855 OK
section: 18.1 What exists (design input)
claim: `applyVolumeDamage` has two forms (`DEUS_Levels.js:1783-1855`). Both cross levels.
  1783  /**
  1784  * Damage a volume. Two forms:
  1785  *   applyVolumeDamage(area, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact"[, { source }]):
      ...
  1854  return sum;
  1855  }

### C564 ADR:1725 game/js/plugins/DEUS_Levels.js:1795-1820 OK
section: 18.1 What exists (design input)
claim: **The box** (`DEUS_Levels.js:1795-1820`):
  1795  function applyVolumeDamage(a, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact", opts = {}) {
  1796  if (a && typeof a === "object" && a.radius !== undefined) return sphereDamage(a);
  1797  const W = World(), st = W && W.state;
      ...
  1819  return sum;
  1820  }

### C565 ADR:1726 game/js/plugins/DEUS_Levels.js:1805 (bare, file from 1 line(s) back) OK
section: 18.1 What exists (design input)
claim: - It turns level and stratum bounds into one elevation scale, `e = (z + 2) * STRATA + s`, clipped to 0..24 (`:1805`).
  1805  const e0 = Math.max(0, (minZ + 2) * STRATA + minS), e1 = Math.min(24, (maxZ + 2) * STRATA + maxS);

### C566 ADR:1727 game/js/plugins/DEUS_Levels.js:1809-1816 (bare, file from 2 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Every non-air stratum in the box takes the full damage (`:1809-1816`; the call to `damageCell` is at `:1815`).
  1809  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
  1810  for (let z = levelOfElevation(e0); z <= levelOfElevation(e1); z++) {
  1811  if (damageRefusal(st, ax, ay, x, y, z)) { sum.skipped++; continue; }
  1812  const hits = [];
  1813  for (let s = 0; s < STRATA; s++) { const e = (z + 2) * STRATA + s; if (e >= e0 && e <= e1) hits.push([s, damage]); }
  1814  if (!anyMatter(st, ax, ay, y * st.size + x, z, hits)) continue;
  1815  addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);
  1816  }

### C567 ADR:1727 game/js/plugins/DEUS_Levels.js:1815 (bare, file from 2 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Every non-air stratum in the box takes the full damage (`:1809-1816`; the call to `damageCell` is at `:1815`).
  1815  addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);

### C568 ADR:1729 game/js/plugins/DEUS_Levels.js:1821-1855 OK
section: 18.1 What exists (design input)
claim: **The sphere** (`sphereDamage`, `DEUS_Levels.js:1821-1855`):
  1821  function sphereDamage(spec) {
  1822  const W = World(), st = W && W.state;
  1823  if (!st || !st.levels) return { ok: false, reason: "no levels in this world" };
      ...
  1854  return sum;
  1855  }

### C569 ADR:1731 game/js/plugins/DEUS_Levels.js:1845-1846 (bare, file from 2 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Each stratum whose centre lies inside the radius takes `damage × falloff(distance / radius)` (`:1845-1846`). The falloff is constant, linear (the default, `:1826`) or quadratic (`FALLOFF`, `:1764`).
  1845  const de = (z + 2) * STRATA + s + 0.5 - pe, d2 = h2 + de * de;
  1846  if (d2 <= r2) hits.push([s, damage * falloff(Math.sqrt(d2) / radius)]);

### C570 ADR:1731 game/js/plugins/DEUS_Levels.js:1826 (bare, file from 2 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Each stratum whose centre lies inside the radius takes `damage × falloff(distance / radius)` (`:1845-1846`). The falloff is constant, linear (the default, `:1826`) or quadratic (`FALLOFF`, `:1764`).
  1826  const cs = c.s !== undefined ? c.s : 2, falloff = FALLOFF[spec.falloff || "linear"];

### C571 ADR:1731 game/js/plugins/DEUS_Levels.js:1764 (bare, file from 2 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Each stratum whose centre lies inside the radius takes `damage × falloff(distance / radius)` (`:1845-1846`). The falloff is constant, linear (the default, `:1826`) or quadratic (`FALLOFF`, `:1764`).
  1764  const FALLOFF = { constant: t => 1, linear: t => 1 - t, quadratic: t => (1 - t) * (1 - t) };

### C572 ADR:1732 game/js/plugins/DEUS_Levels.js:1833 (bare, file from 3 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Horizontal distance is in feet, with 5 ft cells (`:1833`, `:1839`). Vertical distance counts strata as feet (`:1833`, `:1845`).
  1833  const px = (c.x + 0.5) * CELL_FT, py = (c.y + 0.5) * CELL_FT, pe = (c.z + 2) * STRATA + cs + 0.5;

### C573 ADR:1732 game/js/plugins/DEUS_Levels.js:1839 (bare, file from 3 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Horizontal distance is in feet, with 5 ft cells (`:1833`, `:1839`). Vertical distance counts strata as feet (`:1833`, `:1845`).
  1839  const dx = (x + 0.5) * CELL_FT - px, dy = (y + 0.5) * CELL_FT - py, h2 = dx * dx + dy * dy;

### C574 ADR:1732 game/js/plugins/DEUS_Levels.js:1833 (bare, file from 3 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Horizontal distance is in feet, with 5 ft cells (`:1833`, `:1839`). Vertical distance counts strata as feet (`:1833`, `:1845`).
  1833  const px = (c.x + 0.5) * CELL_FT, py = (c.y + 0.5) * CELL_FT, pe = (c.z + 2) * STRATA + cs + 0.5;

### C575 ADR:1732 game/js/plugins/DEUS_Levels.js:1845 (bare, file from 3 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Horizontal distance is in feet, with 5 ft cells (`:1833`, `:1839`). Vertical distance counts strata as feet (`:1833`, `:1845`).
  1845  const de = (z + 2) * STRATA + s + 0.5 - pe, d2 = h2 + de * de;

### C576 ADR:1733 game/js/plugins/DEUS_Levels.js:1849 (bare, file from 4 line(s) back) OK
section: 18.1 What exists (design input)
claim: - The call to `damageCell` is at `:1849`.
  1849  addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);

### C577 ADR:1735 game/js/plugins/DEUS_Levels.js:1676-1707 OK
section: 18.1 What exists (design input)
claim: **The material response** (`damageStratum`, `DEUS_Levels.js:1676-1707`):
  1676  // One stratum of a record takes damage (the record changes in place). effective = damage x the material's resist
  1677  // for the damage type, then the hooks. HP bytes lost = ceil(effective x 255 / maxHP): any damage > 0 costs at least
  1678  // one step (maxHP / 255 HP). HP 0: the stratum becomes air.
      ...
  1706  return out;
  1707  }

### C578 ADR:1736 game/js/plugins/DEUS_Levels.js:1691 (bare, file from 1 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Effective damage is the damage × the material's `resist` for the damage type (`:1691`). Registered damage hooks may then change it (`:1692-1693`).
  1691  ctx.effective = damage * (mat.resist[damageType] !== undefined ? mat.resist[damageType] : 1);

### C579 ADR:1736 game/js/plugins/DEUS_Levels.js:1692-1693 (bare, file from 1 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Effective damage is the damage × the material's `resist` for the damage type (`:1691`). Registered damage hooks may then change it (`:1692-1693`).
  1692  runHooks(mat.key, ctx);
  1693  runHooks("*", ctx);

### C580 ADR:1737 game/js/plugins/DEUS_Levels.js:1697 (bare, file from 2 line(s) back) OK
section: 18.1 What exists (design input)
claim: - HP bytes lost are `ceil(effective × 255 / maxHP)` (`:1697`). At HP 0 the stratum becomes air and its debris is named (`:1699-1703`).
  1697  const hp = Math.max(0, out.hpBefore - Math.ceil(ctx.effective * 255 / mat.maxHP - 1e-9));

### C581 ADR:1737 game/js/plugins/DEUS_Levels.js:1699-1703 (bare, file from 2 line(s) back) OK
section: 18.1 What exists (design input)
claim: - HP bytes lost are `ceil(effective × 255 / maxHP)` (`:1697`). At HP 0 the stratum becomes air and its debris is named (`:1699-1703`).
  1699  if (hp === 0) {
  1700  out.destroyed = true;
  1701  out.debris = mat.debris;
  1702  rec[REC_M + s] = M_AIR;
  1703  rec[REC_HP + s] = 0;

### C582 ADR:1738 game/js/plugins/DEUS_Levels.js:1005-1007 (bare, file from 3 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Resist differs by type: stone takes fire × 0.1 and wood fire × 2, and `impact`, `dig` and `blast` differ as well (`:1005-1007`).
  1005  { id: M_STONE, key: "stone", solid: true, fluid: false, maxHP: 120, support: 1, debris: "rubble", resist: { impact: 0.5, dig: 1, blast: 1, fire: 0.1 } },
  1006  { id: M_SOIL, key: "soil", solid: true, fluid: false, maxHP: 40, support: 0.5, debris: "loose_earth", resist: { impact: 1, dig: 2, blast: 1.5, fire: 0.2 } },
  1007  { id: M_WOOD, key: "wood", solid: true, fluid: false, maxHP: 60, support: 0.7, debris: "broken_timber", resist: { impact: 1, dig: 1, blast: 1.2, fire: 2 } },

### C583 ADR:1739 game/js/plugins/DEUS_Levels.js:1685-1689 (bare, file from 4 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Fluid strata take no damage but still run the hooks (`:1685-1689`).
  1685  if (FLUID_B[byte] === 1) {
  1686  out.fluid = true;
  1687  runHooks(mat.key, ctx);
  1688  runHooks("fluid", ctx);
  1689  return out;

### C584 ADR:1742 game/js/plugins/DEUS_Levels.js:1844-1846 (bare, file from 7 line(s) back) OK
section: 18.1 What exists (design input)
claim: - **No attenuation.** Every stratum inside the box or radius takes its share, whatever lies between it and the centre: the sphere looks only at distance (`:1844-1846`). A fireball on a stone floor damages the room below as if the floor weren't there.
  1844  for (let s = 0; s < STRATA; s++) {
  1845  const de = (z + 2) * STRATA + s + 0.5 - pe, d2 = h2 + de * de;
  1846  if (d2 <= r2) hits.push([s, damage * falloff(Math.sqrt(d2) / radius)]);

### C585 ADR:1745 game/js/plugins/DEUS_Levels.js:1805 (bare, file from 10 line(s) back) OK
section: 18.1 What exists (design input)
claim: - **The 5-level scale:** the elevation cap is 24 (`:1805`, `:1835`), and a stratum counts as 1 ft (§15.0).
  1805  const e0 = Math.max(0, (minZ + 2) * STRATA + minS), e1 = Math.min(24, (maxZ + 2) * STRATA + maxS);

### C586 ADR:1745 game/js/plugins/DEUS_Levels.js:1835 (bare, file from 10 line(s) back) OK
section: 18.1 What exists (design input)
claim: - **The 5-level scale:** the elevation cap is 24 (`:1805`, `:1835`), and a stratum counts as 1 ft (§15.0).
  1835  const e0 = Math.max(0, Math.floor(pe - radius)), e1 = Math.min(24, Math.floor(pe + radius));

### C587 ADR:1746 game/js/plugins/DEUS_Levels.js:1764 (bare, file from 11 line(s) back) OK
section: 18.1 What exists (design input)
claim: - **Floats:** float falloff and `Math.sqrt` (`:1764`, `:1846`), which the core forbids in decisions (§10.4).
  1764  const FALLOFF = { constant: t => 1, linear: t => 1 - t, quadratic: t => (1 - t) * (1 - t) };

### C588 ADR:1746 game/js/plugins/DEUS_Levels.js:1846 (bare, file from 11 line(s) back) OK
section: 18.1 What exists (design input)
claim: - **Floats:** float falloff and `Math.sqrt` (`:1764`, `:1846`), which the core forbids in decisions (§10.4).
  1846  if (d2 <= r2) hits.push([s, damage * falloff(Math.sqrt(d2) / radius)]);

### C589 ADR:1774 game/js/plugins/DEUS_Levels.js:1005-1007 OK
section: 18.2 The rule
claim: - `fire` barely passes solids (a low `passPm`), hits combustibles hard (today's resist: wood 2, stone 0.1; `DEUS_Levels.js:1005-1007`), and **ignites**. Every combustible stratum or object it reaches above an ignition threshold becomes a Fire record (§18.6). So a fireball on a wooden floor burns through it, and the Fire system can then spread (SIM.50.05).
  1005  { id: M_STONE, key: "stone", solid: true, fluid: false, maxHP: 120, support: 1, debris: "rubble", resist: { impact: 0.5, dig: 1, blast: 1, fire: 0.1 } },
  1006  { id: M_SOIL, key: "soil", solid: true, fluid: false, maxHP: 40, support: 0.5, debris: "loose_earth", resist: { impact: 1, dig: 2, blast: 1.5, fire: 0.2 } },
  1007  { id: M_WOOD, key: "wood", solid: true, fluid: false, maxHP: 60, support: 0.7, debris: "broken_timber", resist: { impact: 1, dig: 1, blast: 1.2, fire: 2 } },

### C590 ADR:1782 game/js/plugins/DEUS_Levels.js:1792 OK
section: 18.2 The rule
claim: - **Bounds.** Targets are clipped to `zMin..zMax`, with no 0..24 cap. The radius is capped by the spell schema (SIM.60.02). Today's sphere leaves out cells past the area's edge (`DEUS_Levels.js:1792`). In the core those cells are processed in the neighbouring area, in area order, in the same event.
  1792  * One area per call (cells past the area's edge are left out). Returns { ok, cells, strataHit, strataDestroyed,

### C591 ADR:1786 game/js/plugins/DEUS_Levels.js:1720-1722 OK
section: 18.3 What a blast changes in the rest of the core
claim: - **Debris.** Every destroyed stratum becomes debris at its cell: `ledger.transform(stratum → debris)`, using the material table's `debris`, which today is only named in the event (`DEUS_Levels.js:1720-1722`). Q-MASS doesn't change (§7.8). Debris is placed as a rubble form, as in a collapse (§16.4).
  1720  stats.strataDestroyed++;
  1721  emit("levels:strataDestroyed", { area: { x: ax, y: ay }, x, y, z, stratum: r.stratum, material: r.material, constructed: r.constructed,
  1722  debris: r.debris, damageType, source });

### C592 ADR:1788 game/js/plugins/DEUS_Fluid.js:941-944 OK
section: 18.3 What a blast changes in the rest of the core
claim: - **Fluid.** Geometry changes wake fluid through the existing `levels:*` hook (`DEUS_Fluid.js:941-944`). A breached floor under a pool drains it down a layer. SIM.60.04's "flood down a stairwell" fixture takes the same path.
   941  UF.Events.on("levels:cellChanged", handleGeometryChange);
   942  UF.Events.on("levels:shapeChanged", handleGeometryChange);
   943  UF.Events.on("levels:strataChanged", handleGeometryChange);
   944  UF.Events.on("levels:strataDestroyed", handleGeometryChange);

### C593 ADR:1812 docs/OWNER_DECISIONS.md:255-261 OK
section: 18.6 Spell effects as core primitives (DEC-018)
claim: DEC-018 keeps SRD 5.1 damage, range, saves, area, duration and casting as the rules baseline. It adds physical consequences on top and allows no per-spell code (`docs/OWNER_DECISIONS.md:255-261`). In this architecture there are two layers:
   255  - **Ruling:** Spell effects play out physically in the living-world simulation:
   256  - Fire ignites combustible materials and spreads
   257  - Blasts damage structures and can breach floors into lower layers
   258  - Water floods and flows
   259  - Cold freezes liquid into ice
   260  - Earth spells reshape physical terrain strata
   261  SRD 5.1 damage, range, saves, area, duration and casting stay the rules baseline, and physical consequences are added on top, never replacing SRD numbers. It is data-driven: one spell-effect schema of reusable primitives

### C594 ADR:1863 docs/OWNER_DECISIONS.md:230-235 OK
section: 19. Owner Decisions at the Sim/Render Boundary
claim: | **DEC-016**, "The scale chart is the governing size authority for the art catalogue, templates and placement" (`docs/OWNER_DECISIONS.md:230-235`) | no pixels anywhere. Distances are in half-feet from DEC-013's scale (§15.0) | every pixel size, envelope, footprint and anchor, and `stratumPx` (an Owner question under DEC-016) | nothing new: the view gives heights in strata, and the host converts them |
   230  ### Decision `DEC-016`: The scale chart is the governing size authority for the art catalogue, templates and placement
   231  - **Date Logged:** 2026-09-26
   232  - **Decider:** Owner (00:11 CT, "the most important is the scale chart"; relayed by PM 0019-S/0028-AC)
   233  - **Status:** `DECIDED`
   234  - **Ruling:** Every catalogue entry's pixel size, envelope, footprint and anchor derive from the scale chart (`art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png`, whose numeric source is `game/data/DEUS_ScaleRegistry.json`; th
   235  - **Open:** If "the scale chart" means a different file, the Owner names it and DEC-016 is amended.

### C595 ADR:1864 docs/OWNER_DECISIONS.md:267-278 OK
section: 19. Owner Decisions at the Sim/Render Boundary
claim: | **DEC-019**, "In-Layer Height (Strata) Presentation & Movement Rules" (`docs/OWNER_DECISIONS.md:267-278`) | the step rules and falls: a 1-stratum step is normal, a 2-stratum step is a climb or jump, a full layer needs stairs, a ladder or a ramp. Falling, reach and line of sight use real heights (§3.9, §18.5) | the draw offset per stratum of ground height: a straight pixel shift, no scale (DEC-011) | `SimView.surfaceStratumAt(ax, ay, x, y, z)` and each unit's stratum; `UNIT_MOVED` carries the strata it moved between |
   267  ### Decision `DEC-019`: In-Layer Height (Strata) Presentation & Movement Rules
   268  - **Date Logged:** 2026-09-26
   269  - **Status:** `DECIDED` (Owner ruling 01:17–01:19 CT, directive 0021-V Addendum §15)
      ...
   277  3. **3D Height Mechanics:** Falling damage, melee reach, and line-of-sight elevation advantage use real 3D vertical height differences.
   278  4. **Art Preparation:** Catalogue requires one top-surface tile per terrain plus auto-placed edge/cliff-face strips per height difference (1 to 5 strata) and height shading; NOT a full tile set per height. Catalogue plac

### C596 ADR:1865 docs/OWNER_DECISIONS.md:282-289 OK
section: 19. Owner Decisions at the Sim/Render Boundary
claim: | **DEC-020**, "Seamless Inter-Layer Ramps and Camera-Follow Behavior" (`docs/OWNER_DECISIONS.md:282-289`) | a ramp is a run of cells rising one stratum per cell. At the top stratum the unit's `z` becomes `z + 1` inside an ordinary movement step: no transfer, fade or pause (§3.9). Ramps, stairs and ladders are planner edges, and building a ramp is a job | the camera following the player's layer (DEC-020's default), Lane N's in-place layer switch, and Lane K's per-frame layer membership | `UNIT_MOVED` with `fromZ ≠ z`; the host's next `FOCUS_SET` after the camera follows (§5.3) |
   282  ### Decision `DEC-020`: Seamless Inter-Layer Ramps and Camera-Follow Behavior
   283  - **Date Logged:** 2026-09-26
   284  - **Status:** `DECIDED` (Owner ruling 01:21 CT, directive 0021-V Addendum §16)
   285  - **Decider:** Owner
   286  - **Summary:**
   287  1. **Seamless Transitions:** Ramps and slopes carry units continuously from one layer to the next. A ramp is a run of cells rising one stratum per cell (5 cells = one 10 ft layer). At the top stratum, the unit's Z become
   288  2. **Camera-Follow Default:** When the player unit crosses a ramp boundary between layers, the camera view automatically follows the player's current layer. Non-player units crossing simply transfer layer membership list
   289  3. **Pathfinding & Construction:** Multi-Z pathfinding treats ramps, stairs, and ladders as traversable layer connectors. Colonists can build ramps. Art catalogue adds ramp/slope pieces per terrain (placeholders only; DE

### C597 ADR:1866 docs/OWNER_DECISIONS.md:293-300 OK
section: 19. Owner Decisions at the Sim/Render Boundary
claim: | **DEC-021**, "Occlusion Rule for Layer Rendering (Zero-Cost Solid Cover)" (`docs/OWNER_DECISIONS.md:293-300`) | nothing. Occlusion isn't sim state; the core only provides rows and revision counters | the visible-depth mask: per screen cell, from the viewed layer down to the first opaque surface, recomputed per chunk from `CELL_SHAPE` records and `rev()`. The host draws and reads only exposed cells, so `view.read_ms` follows the exposed area, not the layer count (§9.2) | `copyRow` and `rev()` out; the `FOCUS_SET` region set, computed by the shared exposure module, in (§13.2) |
   293  ### Decision `DEC-021`: Occlusion Rule for Layer Rendering (Zero-Cost Solid Cover)
   294  - **Date Logged:** 2026-09-26
   295  - **Status:** `DECIDED` (Owner ruling 01:24 CT, directive 0021-V Addendum §18)
   296  - **Decider:** Owner
   297  - **Summary:**
   298  1. **Occlusion Culling Rule:** Any cell, entity, prop, or effect covered by an opaque upper layer is not drawn at all.
   299  2. **Bounded Draw Cost:** Draw cost is strictly bounded by exposed visible screen area (VISION V133), NOT by total layer count. For each screen column/cell, rendering traverses only from the currently viewed layer downwa
   300  3. **Benchmark Requirement:** Applied in Lane K follow-up, the 32-layer refactor, and future overlook view. Benchmark target: the stress scene with 32 layers must cost approximately the same frame time as with 5 layers w

### C598 ADR:1883 game/js/plugins/DEUS_Anim.js:1506 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.2 | Sim on `Game_Map.update`: World L2932, Fluid L1016, Ecology L992 (every 60), Fire L617, Environment L796, Colonists L5748, Jobs L1777, Projects L1596, Combat L1414, Factions L657 | **Confirmed.** Also sim-relevant and not listed: Anim `:1506` (unit removal), Ownership `:613`, TimeSpeed `:189` (timers). Fog `:638` is presentation. Wildlife `:1195` is empty | §1.2 |
  1506  Game_Map.prototype.update = function(sceneActive) {

### C599 ADR:1883 game/js/plugins/DEUS_Ownership.js:613 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.2 | Sim on `Game_Map.update`: World L2932, Fluid L1016, Ecology L992 (every 60), Fire L617, Environment L796, Colonists L5748, Jobs L1777, Projects L1596, Combat L1414, Factions L657 | **Confirmed.** Also sim-relevant and not listed: Anim `:1506` (unit removal), Ownership `:613`, TimeSpeed `:189` (timers). Fog `:638` is presentation. Wildlife `:1195` is empty | §1.2 |
   613  Game_Map.prototype.update = function(sceneActive) {

### C600 ADR:1883 game/js/plugins/DEUS_TimeSpeed.js:189 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.2 | Sim on `Game_Map.update`: World L2932, Fluid L1016, Ecology L992 (every 60), Fire L617, Environment L796, Colonists L5748, Jobs L1777, Projects L1596, Combat L1414, Factions L657 | **Confirmed.** Also sim-relevant and not listed: Anim `:1506` (unit removal), Ownership `:613`, TimeSpeed `:189` (timers). Fog `:638` is presentation. Wildlife `:1195` is empty | §1.2 |
   189  Game_Map.prototype.update = function(sceneActive) {

### C601 ADR:1883 game/js/plugins/DEUS_Fog.js:638 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.2 | Sim on `Game_Map.update`: World L2932, Fluid L1016, Ecology L992 (every 60), Fire L617, Environment L796, Colonists L5748, Jobs L1777, Projects L1596, Combat L1414, Factions L657 | **Confirmed.** Also sim-relevant and not listed: Anim `:1506` (unit removal), Ownership `:613`, TimeSpeed `:189` (timers). Fog `:638` is presentation. Wildlife `:1195` is empty | §1.2 |
   638  Game_Map.prototype.update = function(sceneActive) {

### C602 ADR:1883 game/js/plugins/DEUS_Wildlife.js:1195 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.2 | Sim on `Game_Map.update`: World L2932, Fluid L1016, Ecology L992 (every 60), Fire L617, Environment L796, Colonists L5748, Jobs L1777, Projects L1596, Combat L1414, Factions L657 | **Confirmed.** Also sim-relevant and not listed: Anim `:1506` (unit removal), Ownership `:613`, TimeSpeed `:189` (timers). Fog `:638` is presentation. Wildlife `:1195` is empty | §1.2 |
  1195  Game_Map.prototype.update = function(sceneActive) {

### C603 ADR:1884 game/js/plugins/DEUS_Core.js:505-510 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.3 | Calendar on `Scene_Map.update`: Core L505 | **Confirmed** (`DEUS_Core.js:505-510`). Also called on sub-ticks (`DEUS_TimeSpeed.js:236`) | §1.1 |
   505  Scene_Map.prototype.update = function() {
   506  _Scene_Map_update.call(this);
   507  $ufTime.update();
   508  if (window.UF && UF.Time && typeof UF.Time.update === "function") {
   509  UF.Time.update(1 / 60);
   510  }

### C604 ADR:1884 game/js/plugins/DEUS_TimeSpeed.js:236 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.3 | Calendar on `Scene_Map.update`: Core L505 | **Confirmed** (`DEUS_Core.js:505-510`). Also called on sub-ticks (`DEUS_TimeSpeed.js:236`) | §1.1 |
   236  if (window.$ufTime) $ufTime.update();

### C605 ADR:1885 game/js/plugins/DEUS_TimeSpeed.js:209-217 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.4 | NaturalConnections runs fluids and creatures on `Graphics.frameCount % 30` in `Scene_Map.update` (L507-515), "so it ignores pause and speed" | **Partly corrected.** It ignores **pause**: pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`), while `SceneManager.updateMain` keeps incrementing `frameCount` (`rmmz_managers.js:2102-2112`) and the `Scene_Map.update` wrappers keep running. It does **not** ignore **speed**: NaturalConnections loads after TimeSpeed (`plugins.js:258` vs `:184`), so its wrapper runs on every sub-tick, and `frameCount` goes up once per `updateM
   209  const _Scene_Map_updateMain = Scene_Map.prototype.updateMain;
   210  Scene_Map.prototype.updateMain = function() {
   211  if (!paused) {
      ...
   216  $gameScreen.update();
   217  };

### C606 ADR:1885 game/js/rmmz_managers.js:2102-2112 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.4 | NaturalConnections runs fluids and creatures on `Graphics.frameCount % 30` in `Scene_Map.update` (L507-515), "so it ignores pause and speed" | **Partly corrected.** It ignores **pause**: pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`), while `SceneManager.updateMain` keeps incrementing `frameCount` (`rmmz_managers.js:2102-2112`) and the `Scene_Map.update` wrappers keep running. It does **not** ignore **speed**: NaturalConnections loads after TimeSpeed (`plugins.js:258` vs `:184`), so its wrapper runs on every sub-tick, and `frameCount` goes up once per `updateM
  2102  SceneManager.updateMain = function() {
  2103  this.updateFrameCount();
  2104  this.updateInputData();
      ...
  2111  Graphics.frameCount++;
  2112  };

### C607 ADR:1885 game/js/plugins.js:258 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.4 | NaturalConnections runs fluids and creatures on `Graphics.frameCount % 30` in `Scene_Map.update` (L507-515), "so it ignores pause and speed" | **Partly corrected.** It ignores **pause**: pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`), while `SceneManager.updateMain` keeps incrementing `frameCount` (`rmmz_managers.js:2102-2112`) and the `Scene_Map.update` wrappers keep running. It does **not** ignore **speed**: NaturalConnections loads after TimeSpeed (`plugins.js:258` vs `:184`), so its wrapper runs on every sub-tick, and `frameCount` goes up once per `updateM
   258  "name": "DEUS_NaturalConnections",

### C608 ADR:1885 game/js/plugins.js:184 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.4 | NaturalConnections runs fluids and creatures on `Graphics.frameCount % 30` in `Scene_Map.update` (L507-515), "so it ignores pause and speed" | **Partly corrected.** It ignores **pause**: pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`), while `SceneManager.updateMain` keeps incrementing `frameCount` (`rmmz_managers.js:2102-2112`) and the `Scene_Map.update` wrappers keep running. It does **not** ignore **speed**: NaturalConnections loads after TimeSpeed (`plugins.js:258` vs `:184`), so its wrapper runs on every sub-tick, and `frameCount` goes up once per `updateM
   184  "name": "DEUS_TimeSpeed",

### C609 ADR:1885 game/js/plugins/DEUS_NaturalConnections.js:312-329 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.4 | NaturalConnections runs fluids and creatures on `Graphics.frameCount % 30` in `Scene_Map.update` (L507-515), "so it ignores pause and speed" | **Partly corrected.** It ignores **pause**: pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`), while `SceneManager.updateMain` keeps incrementing `frameCount` (`rmmz_managers.js:2102-2112`) and the `Scene_Map.update` wrappers keep running. It does **not** ignore **speed**: NaturalConnections loads after TimeSpeed (`plugins.js:258` vs `:184`), so its wrapper runs on every sub-tick, and `frameCount` goes up once per `updateM
   312  function addFluid(r, type = "water") {
   313  if (!validCell(r)) return false;
   314  const fs = fluidsState();
      ...
   328  }
   329  return true;

### C610 ADR:1885 game/js/plugins/DEUS_NaturalConnections.js:352-353 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.4 | NaturalConnections runs fluids and creatures on `Graphics.frameCount % 30` in `Scene_Map.update` (L507-515), "so it ignores pause and speed" | **Partly corrected.** It ignores **pause**: pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`), while `SceneManager.updateMain` keeps incrementing `frameCount` (`rmmz_managers.js:2102-2112`) and the `Scene_Map.update` wrappers keep running. It does **not** ignore **speed**: NaturalConnections loads after TimeSpeed (`plugins.js:258` vs `:184`), so its wrapper runs on every sub-tick, and `frameCount` goes up once per `updateM
   352  if (isWater(upper)) {
   353  addFluid(lower, "water");

### C611 ADR:1886 game/js/plugins/DEUS_World.js:1686-1698 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.5 | On-screen units are Game_Events whose position is copied into the sim (World L1686-1698; stepOnscreen/stepDirect L1633-1675) | **Confirmed** | `DEUS_World.js:1686-1698`, `:1633-1675` |
  1686  if (view && u.area.x === view.x && u.area.y === view.y && zOf(u) === view.z) {
  1687  const ev = $gameMap._events[EVENT_BASE + u.id];
  1688  if (!ev) {
      ...
  1697  u.dir8 = ev.dir8 ? ev.dir8() : u.dir;
  1698  if (u.goal) stepOnscreen(u, ev);

### C612 ADR:1886 game/js/plugins/DEUS_World.js:1633-1675 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.5 | On-screen units are Game_Events whose position is copied into the sim (World L1686-1698; stepOnscreen/stepDirect L1633-1675) | **Confirmed** | `DEUS_World.js:1686-1698`, `:1633-1675` |
  1633  function stepOnscreen(u, ev) {
  1634  if (ev.isMoving()) return;
  1635  if (goalReached(u)) return arrive(u);
      ...
  1674  }
  1675  }

### C613 ADR:1887 game/js/plugins/DEUS_World.js:136 (bare, file from 1 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.6 | Off-screen units jump one cell every 16 frames (L1699-1701) | **Confirmed.** `unitStepFrames` default `:136`. Units on the viewed level that have no event also use it (`:1688-1689`) | §1.3 |
   136  unitStepFrames: Math.max(1, num("UnitStepFrames", 16))

### C614 ADR:1887 game/js/plugins/DEUS_World.js:1688-1689 (bare, file from 1 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.6 | Off-screen units jump one cell every 16 frames (L1699-1701) | **Confirmed.** `unitStepFrames` default `:136`. Units on the viewed level that have no event also use it (`:1688-1689`) | §1.3 |
  1688  if (!ev) {
  1689  if (u.goal && (frame + u.id) % steps === 0) stepOffscreen(u);

### C615 ADR:1888 game/js/plugins/DEUS_World.js:127-128 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.7 | Fluid steps only the viewed area (L736-745) | **Confirmed, with a qualification.** The default world has one area (`DEUS_World.js:127-128`; `plugins.js:58`), so the viewed area is the whole world. Its queue holds cells of all 5 levels (`DEUS_Fluid.js:356-376`; the level is decoded per cell, `DEUS_Fluid.js:381-383`). There is also no `sceneActive` gate (`DEUS_Fluid.js:1016-1019`) | §1.3 |
   127  areasX: num("AreasX", 1),
   128  areasY: num("AreasY", 1),

### C616 ADR:1888 game/js/plugins.js:58 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.7 | Fluid steps only the viewed area (L736-745) | **Confirmed, with a qualification.** The default world has one area (`DEUS_World.js:127-128`; `plugins.js:58`), so the viewed area is the whole world. Its queue holds cells of all 5 levels (`DEUS_Fluid.js:356-376`; the level is decoded per cell, `DEUS_Fluid.js:381-383`). There is also no `sceneActive` gate (`DEUS_Fluid.js:1016-1019`) | §1.3 |
    58  "parameters": {}

### C617 ADR:1888 game/js/plugins/DEUS_Fluid.js:356-376 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.7 | Fluid steps only the viewed area (L736-745) | **Confirmed, with a qualification.** The default world has one area (`DEUS_World.js:127-128`; `plugins.js:58`), so the viewed area is the whole world. Its queue holds cells of all 5 levels (`DEUS_Fluid.js:356-376`; the level is decoded per cell, `DEUS_Fluid.js:381-383`). There is also no `sceneActive` gate (`DEUS_Fluid.js:1016-1019`) | §1.3 |
   356  function stepArea(ax, ay, budget) {
   357  const data = getAreaData(ax, ay);
   358  const queue = data.queue;
      ...
   375  
   376  while (data.head < limit) {

### C618 ADR:1888 game/js/plugins/DEUS_Fluid.js:381-383 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.7 | Fluid steps only the viewed area (L736-745) | **Confirmed, with a qualification.** The default world has one area (`DEUS_World.js:127-128`; `plugins.js:58`), so the viewed area is the whole world. Its queue holds cells of all 5 levels (`DEUS_Fluid.js:356-376`; the level is decoded per cell, `DEUS_Fluid.js:381-383`). There is also no `sceneActive` gate (`DEUS_Fluid.js:1016-1019`) | §1.3 |
   381  decodeCellId(size, cellId);
   382  const x = coordX, y = coordY, z = coordZ;
   383  const gridZ = data.grids.get(z);

### C619 ADR:1888 game/js/plugins/DEUS_Fluid.js:1016-1019 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.7 | Fluid steps only the viewed area (L736-745) | **Confirmed, with a qualification.** The default world has one area (`DEUS_World.js:127-128`; `plugins.js:58`), so the viewed area is the whole world. Its queue holds cells of all 5 levels (`DEUS_Fluid.js:356-376`; the level is decoded per cell, `DEUS_Fluid.js:381-383`). There is also no `sceneActive` gate (`DEUS_Fluid.js:1016-1019`) | §1.3 |
  1016  Game_Map.prototype.update = function(sceneActive) {
  1017  _Game_Map_update.call(this, sceneActive);
  1018  Fluid.tick();
  1019  };

### C620 ADR:1889 game/js/plugins/DEUS_Ecology.js:22-27 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification, and made precise.** The header describes the population roll, which runs every six game hours (`DEUS_Ecology.js:22-27`, `:907-914`). Plant spreading and breeding run on the same two areas every game hour (`DEUS_Ecology.js:876`, `:888-905`). Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
    22  * Every six game hours, the current area and one rotating world area get a
    23  * deterministic population roll. Prey can recover toward the area's original
    24  * population. Monsters can replenish or first appear only in catalog-approved
    25  * biomes/regions. Both populations have hard area caps. Monster cells must be
    26  * free and remain outside the protected start, camps, active faction sites,
    27  * nearby people, and the player's view radius.

### C621 ADR:1889 game/js/plugins/DEUS_Ecology.js:907-914 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification, and made precise.** The header describes the population roll, which runs every six game hours (`DEUS_Ecology.js:22-27`, `:907-914`). Plant spreading and breeding run on the same two areas every game hour (`DEUS_Ecology.js:876`, `:888-905`). Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
   907  if (at % POPULATION_INTERVAL === 0) {
   908  seen.clear();
   909  for (const a of [here, rotate]) {
   910  if (!a || seen.has(areaKey(a))) continue;
   911  seen.add(areaKey(a));
   912  result.areas.push(processArea(a, { hour: at }));
   913  }
   914  }

### C622 ADR:1889 game/js/plugins/DEUS_Ecology.js:876 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification, and made precise.** The header describes the population roll, which runs every six game hours (`DEUS_Ecology.js:22-27`, `:907-914`). Plant spreading and breeding run on the same two areas every game hour (`DEUS_Ecology.js:876`, `:888-905`). Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
   876  // Hourly driver: resources every hour, populations every six hours.

### C623 ADR:1889 game/js/plugins/DEUS_Ecology.js:888-905 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification, and made precise.** The header describes the population roll, which runs every six game hours (`DEUS_Ecology.js:22-27`, `:907-914`). Plant spreading and breeding run on the same two areas every game hour (`DEUS_Ecology.js:876`, `:888-905`). Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
   888  function tickHour(hour) {
   889  const O = Objects(), W = World(), st = state();
   890  const at = Number.isFinite(hour) ? hour : (O && O.hourNow ? O.hourNow() : 0);
      ...
   904  stepBreeding(a, at);
   905  }

### C624 ADR:1889 game/js/plugins/DEUS_World.js:532 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification, and made precise.** The header describes the population roll, which runs every six game hours (`DEUS_Ecology.js:22-27`, `:907-914`). Plant spreading and breeding run on the same two areas every game hour (`DEUS_Ecology.js:876`, `:888-905`). Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
   532  World.currentArea = () => (window.$gameMap && World.state ? World.areaOfMapId($gameMap.mapId()) : null);

### C625 ADR:1889 game/js/plugins/DEUS_Ecology.js:803 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification, and made precise.** The header describes the population roll, which runs every six game hours (`DEUS_Ecology.js:22-27`, `:907-914`). Plant spreading and breeding run on the same two areas every game hour (`DEUS_Ecology.js:876`, `:888-905`). Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
   803  const baseArea = (W.currentArea && W.currentArea()) || { x: 0, y: 0 };

### C626 ADR:1889 game/js/plugins/DEUS_Ecology.js:452-453 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification, and made precise.** The header describes the population roll, which runs every six game hours (`DEUS_Ecology.js:22-27`, `:907-914`). Plant spreading and breeding run on the same two areas every game hour (`DEUS_Ecology.js:876`, `:888-905`). Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
   452  const here = W.currentArea();
   453  if (sameArea(here, area) && window.$gamePlayer && Math.hypot(x - $gamePlayer.x, y - $gamePlayer.y) < PLAYER_CLEARANCE) return "player";

### C627 ADR:1890 game/js/plugins/DEUS_World.js:801 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.9 | Terrain is read through RMMZ-format `$dataMap` builds (World.buildArea L595-640), cached 6 deep (peekArea L797-822) | **Confirmed** (`PEEK_CACHE = 6`, `DEUS_World.js:801`; `buildArea` `DEUS_World.js:599`) | §1.3 |
   801  const PEEK_CACHE = 6;

### C628 ADR:1890 game/js/plugins/DEUS_World.js:599 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.9 | Terrain is read through RMMZ-format `$dataMap` builds (World.buildArea L595-640), cached 6 deep (peekArea L797-822) | **Confirmed** (`PEEK_CACHE = 6`, `DEUS_World.js:801`; `buildArea` `DEUS_World.js:599`) | §1.3 |
   599  World.buildArea = function(ax, ay, z = 0) {

### C629 ADR:1891 game/js/plugins/DEUS_Levels.js:4179-4193 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.10 | A layer switch is a map transfer (World.transferView L2724-2730) | **Confirmed** (`DEUS_Levels.js:4179-4193` → `DEUS_World.js:2728`) | §1.3 |
  4179  function setView(z, opts = {}) {
  4180  const W = World();
  4181  const v = W && W.viewLevel();
      ...
  4192  return true;
  4193  }

### C630 ADR:1891 game/js/plugins/DEUS_World.js:2728 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.10 | A layer switch is a map transfer (World.transferView L2724-2730) | **Confirmed** (`DEUS_Levels.js:4179-4193` → `DEUS_World.js:2728`) | §1.3 |
  2728  $gamePlayer.reserveTransfer(this.areaMapId(ax, ay, lz), x, y, dir || $gamePlayer.direction(), 2);

### C631 ADR:1892 tools/bench_history_sim.js:13 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.11 | `bench_history_sim.js` runs World, WorldGen, Factions, History and Levels in a vm with throwing engine stubs and a throwing `Math.random` (L37-122) | **Confirmed as code** (`:13`, `:37-122`, `:66-67`). **But the tool exits 1 at `ebeec892`** (observed, Appendix B) | §14.1 |
    13  const MODULES = ["World", "WorldGen", "Factions", "History", "Levels"];

### C632 ADR:1892 tools/bench_history_sim.js:37-122 @ebeec892 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.11 | `bench_history_sim.js` runs World, WorldGen, Factions, History and Levels in a vm with throwing engine stubs and a throwing `Math.random` (L37-122) | **Confirmed as code** (`:13`, `:37-122`, `:66-67`). **But the tool exits 1 at `ebeec892`** (observed, Appendix B) | §14.1 |
    37  function sourceBundle() {
    38  const files = {};
    39  const read = file => (files[file] = fs.readFileSync(path.join(ROOT, file), "utf8"));
      ...
   121  env.UF.Factions.generate(state);
   122  assert(state.factions && state.factions.list.length && env.UF.WorldGen.cellInfo(128, 128), "Missing real factions/terrain");

### C633 ADR:1892 tools/bench_history_sim.js:66-67 @ebeec892 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.11 | `bench_history_sim.js` runs World, WorldGen, Factions, History and Levels in a vm with throwing engine stubs and a throwing `Math.random` (L37-122) | **Confirmed as code** (`:13`, `:37-122`, `:66-67`). **But the tool exits 1 at `ebeec892`** (observed, Appendix B) | §14.1 |
    66  const math = Object.create(Math);
    67  math.random = () => { throw new Error("Unseeded Math.random in benchmark execution"); };

### C634 ADR:1893 tools/test_new_game_year0.js:284 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.12 | `test_new_game_year0.js` uses the same pattern (L269-311) | **Confirmed** as a range. Unlike the bench, it passes the real `Math`, so `Math.random` isn't blocked (`tools/test_new_game_year0.js:284`) | — |
   284  window: null, UF: ns, DEUS: ns, Math, performance,

### C635 ADR:1894 tools/test_strata_foundation.js:156-243 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.13 | `test_strata_foundation.js` L154-237 | **Corrected:** the loader function spans `:156-243`, and its engine stubs are no-ops, not throwing (`:191-218`) | — |
   156  function setup(sources, tag) {
   157  const list = {};
   158  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game/js/plugins.js"), "utf8"), list);
      ...
   242  return env;
   243  }

### C636 ADR:1894 tools/test_strata_foundation.js:191-218 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.13 | `test_strata_foundation.js` L154-237 | **Corrected:** the loader function spans `:156-243`, and its engine stubs are no-ops, not throwing (`:191-218`) | — |
   191  for (const name of ["Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player", "Game_CharacterBase", "Game_Event", "Spriteset_Map", "Spriteset_Base"]) {
   192  env[name] = vm.runInNewContext(`(function ${name}(){})`);
   193  env[name].prototype.initialize = function() {};
      ...
   217  });
   218  Object.assign(env.Game_Player.prototype, { isTransferring: () => false, direction: () => 2, locate(x, y) { this.x = x; this.y = y; } });

### C637 ADR:1895 game/js/plugins/DEUS_Fluid.js:1025-1026 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.14 | `test_liquid_depth_simulation.js` runs DEUS_Fluid alone (L121-125); Fluid has `module.exports` at L1025 | **Confirmed** (`DEUS_Fluid.js:1025-1026`) | §1.5 |
  1025  if (typeof module !== "undefined" && module.exports) {
  1026  module.exports = Fluid;

### C638 ADR:1897 game/js/plugins/DEUS_Core.js:304-311 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** In `DEUS_Core.js`, L59-60 is the comment and L61 the code (`timeSpeed = 1/6`); the timer is at `DEUS_Core.js:304-311` and `ticksPerMinute` at `DEUS_Core.js:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
   304  update() {
   305  if (this.isPaused || $gameMessage.isBusy()) return;
   306  this._timer += 1 / 60; // Assuming 60fps
   307  if (this._timer >= timeSpeed) {
   308  this._timer -= timeSpeed;
   309  this.advanceMinute(1);
   310  }
   311  }

### C639 ADR:1897 game/js/plugins/DEUS_Core.js:376-378 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** In `DEUS_Core.js`, L59-60 is the comment and L61 the code (`timeSpeed = 1/6`); the timer is at `DEUS_Core.js:304-311` and `ticksPerMinute` at `DEUS_Core.js:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
   376  ticksPerMinute() {
   377  return Math.max(1, Math.round(timeSpeed * 60));
   378  }

### C640 ADR:1897 game/js/plugins/DEUS_Colonists.js:48 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** In `DEUS_Core.js`, L59-60 is the comment and L61 the code (`timeSpeed = 1/6`); the timer is at `DEUS_Core.js:304-311` and `ticksPerMinute` at `DEUS_Core.js:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
    48  const NEEDS_EVERY = 60;         // ticks per needs tick (one game minute)

### C641 ADR:1897 game/js/plugins/DEUS_Environment.js:52 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** In `DEUS_Core.js`, L59-60 is the comment and L61 the code (`timeSpeed = 1/6`); the timer is at `DEUS_Core.js:304-311` and `ticksPerMinute` at `DEUS_Core.js:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
    52  const TICKS_PER_STEP = 60; // 1 beat / 1 game second

### C642 ADR:1897 game/js/plugins/DEUS_TimeSpeed.js:33 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** In `DEUS_Core.js`, L59-60 is the comment and L61 the code (`timeSpeed = 1/6`); the timer is at `DEUS_Core.js:304-311` and `ticksPerMinute` at `DEUS_Core.js:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
    33  * speed-up and the pause). 60 frames = 1 game minute at the default UF_Core

### C643 ADR:1898 game/js/plugins/DEUS_TimeSpeed.js:45-50 (bare, file from 1 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.17 | The TimeSpeed repeat hack is L147-173 | **Confirmed.** Also, 16x and 32x are forced into the list (`:45-50`) | §1.1 |
    45  let speedList = String(P.Speeds || "1, 2, 4, 8, 16, 32").split(",").map(Number).filter(n => n >= 1);
    46  if (!speedList.includes(16)) speedList.push(16);
    47  if (!speedList.includes(32)) speedList.push(32);
    48  speedList.sort((a, b) => a - b);
    49  const SPEEDS = speedList;
    50  if (SPEEDS[0] !== 1) SPEEDS.unshift(1);

### C644 ADR:1899 game/js/plugins/DEUS_Dnd5e.js:415 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.18 | The only `Math.random` in sim paths is the `World.newWorld` seed pick (L411/L418) | **Confirmed for DEUS_World.** Also `DEUS_Dnd5e.js:415`, `:720`, `:800` fall back to `Math.random` without an `rng`. The FactionMenus and Visuals uses are presentation | §10.1 |
   415  let r = (typeof rng === "function" ? rng() : Math.random()) * total;

### C645 ADR:1899 game/js/plugins/DEUS_Dnd5e.js:720 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.18 | The only `Math.random` in sim paths is the `World.newWorld` seed pick (L411/L418) | **Confirmed for DEUS_World.** Also `DEUS_Dnd5e.js:415`, `:720`, `:800` fall back to `Math.random` without an `rng`. The FactionMenus and Visuals uses are presentation | §10.1 |
   720  const rng = typeof opts.rng === "function" ? opts.rng : Math.random;

### C646 ADR:1899 game/js/plugins/DEUS_Dnd5e.js:800 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.18 | The only `Math.random` in sim paths is the `World.newWorld` seed pick (L411/L418) | **Confirmed for DEUS_World.** Also `DEUS_Dnd5e.js:415`, `:720`, `:800` fall back to `Math.random` without an `rng`. The FactionMenus and Visuals uses are presentation | §10.1 |
   800  const rng = typeof opts.rng === "function" ? opts.rng : Math.random;
