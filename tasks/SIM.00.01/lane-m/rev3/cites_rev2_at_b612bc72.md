# ADR-003 citation dump

ADR: c456cb73:docs/adr/ADR-003_sim_render_split_and_lod.md
Code/doc rev: b612bc7217349bce695e15395bd041f63673b89b
Citations: 476; NO_FILE: 0; OUT_OF_RANGE: 0

### C001 ADR:14 docs/worldgen/DEUS_WORLDGEN_WBS.md:509 OK
section: ADR-003: Sim/Render Split and Level-of-Detail (LOD) Simulation
claim: **WBS:** SIM.00.01, WBS Rev 18 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:509`). **This package contains no code.**
   509  - **On-screen units are RMMZ events.** Their position is copied from the `Game_Event` (DEUS_World L1686-1698).

### C002 ADR:18 docs/VISION.md:131 @0c1baf8d OK
section: ADR-003: Sim/Render Split and Level-of-Detail (LOD) Simulation
claim: - Documents that changed on `main` after the lane base are cited with the commit they were read at, e.g. "`docs/VISION.md:131` at `0c1baf8d`". This applies to DEC-013, V137/V138 and the WBS Rev 19 SIM.40 rows.
   131  | V137 | **Structural Integrity, Load-Bearing Architecture & Mass-Conserving Collapse** (user directive 2026-09-26, Directive 0021-V §6): Solid terrain, constructed walls, floors, and roofs possess material-dependent str

### C003 ADR:87 game/js/rmmz_managers.js:1982-1991 OK
section: 1.1 How the simulation runs today
claim: - On every PIXI tick, RMMZ's `SceneManager.update` calls `updateMain` n times (`rmmz_managers.js:1982-1991`).
  1982  SceneManager.update = function(deltaTime) {
  1983  try {
  1984  const n = this.determineRepeatNumber(deltaTime);
      ...
  1990  }
  1991  };

### C004 ADR:88 game/js/rmmz_managers.js:1993-2010 OK
section: 1.1 How the simulation runs today
claim: - `determineRepeatNumber` smooths the PIXI `deltaTime` and clamps each sample to 2 (`rmmz_managers.js:1993-2010`). In practice it returns about one update per 60 Hz frame:
  1993  SceneManager.determineRepeatNumber = function(deltaTime) {
  1994  // [Note] We consider environments where the refresh rate is higher than
  1995  //   60Hz, but ignore sudden irregular deltaTime.
      ...
  2009  };
  2010  

### C005 ADR:91 game/js/rmmz_managers.js:2102-2112 OK
section: 1.1 How the simulation runs today
claim: - `updateMain` increments `Graphics.frameCount` and updates the scene (`rmmz_managers.js:2102-2112`). The scene is updated only while the window has focus (`rmmz_managers.js:2146`, `:2157-2165`).
  2102  SceneManager.updateMain = function() {
  2103  this.updateFrameCount();
  2104  this.updateInputData();
      ...
  2111  Graphics.frameCount++;
  2112  };

### C006 ADR:91 game/js/rmmz_managers.js:2146 OK
section: 1.1 How the simulation runs today
claim: - `updateMain` increments `Graphics.frameCount` and updates the scene (`rmmz_managers.js:2102-2112`). The scene is updated only while the window has focus (`rmmz_managers.js:2146`, `:2157-2165`).
  2146  if (this.isGameActive()) {

### C007 ADR:91 game/js/rmmz_managers.js:2157-2165 (bare, file from 0 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - `updateMain` increments `Graphics.frameCount` and updates the scene (`rmmz_managers.js:2102-2112`). The scene is updated only while the window has focus (`rmmz_managers.js:2146`, `:2157-2165`).
  2157  SceneManager.isGameActive = function() {
  2158  // [Note] We use "window.top" to support an iframe.
  2159  try {
      ...
  2164  }
  2165  };

### C008 ADR:92 game/js/rmmz_scenes.js:819-831 OK
section: 1.1 How the simulation runs today
claim: - `Scene_Map.update` calls `updateMain`, which calls `$gameMap.update(this.isActive())` (`rmmz_scenes.js:819-831`, `:841-846`). RMMZ's fast-forward runs `updateMain` twice (`rmmz_scenes.js:833-839`).
   819  Scene_Map.prototype.update = function() {
   820  Scene_Message.prototype.update.call(this);
   821  this.updateDestination();
      ...
   830  this.updateWaitCount();
   831  };

### C009 ADR:92 game/js/rmmz_scenes.js:841-846 (bare, file from 0 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - `Scene_Map.update` calls `updateMain`, which calls `$gameMap.update(this.isActive())` (`rmmz_scenes.js:819-831`, `:841-846`). RMMZ's fast-forward runs `updateMain` twice (`rmmz_scenes.js:833-839`).
   841  Scene_Map.prototype.updateMain = function() {
   842  $gameMap.update(this.isActive());
   843  $gamePlayer.update(this.isPlayerActive());
   844  $gameTimer.update(this.isActive());
   845  $gameScreen.update();
   846  };

### C010 ADR:92 game/js/rmmz_scenes.js:833-839 OK
section: 1.1 How the simulation runs today
claim: - `Scene_Map.update` calls `updateMain`, which calls `$gameMap.update(this.isActive())` (`rmmz_scenes.js:819-831`, `:841-846`). RMMZ's fast-forward runs `updateMain` twice (`rmmz_scenes.js:833-839`).
   833  Scene_Map.prototype.updateMainMultiply = function() {
   834  if (this.isFastForward()) {
   835  this.cancelMessageWait();
   836  this.updateMain();
   837  }
   838  this.updateMain();
   839  };

### C011 ADR:96 game/js/plugins/DEUS_Core.js:74-98 OK
section: 1.1 How the simulation runs today
claim: - Their run order is the `game/js/plugins.js` order (42 entries, all `"status": true`), plus companions that `DEUS_Core.js:74-98` loads with `require`.
    74  const companionPlugins = [
    75  "DEUS_Containers",
    76  "DEUS_Stockpiles",
      ...
    97  try {
    98  require(p);

### C012 ADR:97 game/js/plugins/DEUS_Jobs.js:1778 OK
section: 1.1 How the simulation runs today
claim: - Code already depends on that order. `DEUS_Jobs.js:1778`: "UF_World moved the units first (its alias is below ours)".
  1778  _Game_Map_update.call(this, sceneActive); // UF_World moved the units first (its alias is below ours)

### C013 ADR:100 game/js/plugins/DEUS_TimeSpeed.js:147-153 OK
section: 1.1 How the simulation runs today
claim: - `DEUS_TimeSpeed` multiplies n by the speed inside `determineRepeatNumber` (`DEUS_TimeSpeed.js:147-153`) and replaces `SceneManager.update` (`:158-173`).
   147  const _determineRepeatNumber = SceneManager.determineRepeatNumber;
   148  SceneManager.determineRepeatNumber = function(deltaTime) {
   149  const n = _determineRepeatNumber.call(this, deltaTime);
   150  const scene = this._scene;
   151  const running = scene instanceof Scene_Map && scene.isActive() && !paused && !$gameMessage.isBusy() && !$gamePlayer.isTransferring();
   152  return running ? n * SPEEDS[index] : n;
   153  };

### C014 ADR:100 game/js/plugins/DEUS_TimeSpeed.js:158-173 (bare, file from 0 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - `DEUS_TimeSpeed` multiplies n by the speed inside `determineRepeatNumber` (`DEUS_TimeSpeed.js:147-153`) and replaces `SceneManager.update` (`:158-173`).
   158  const _SceneManager_update = SceneManager.update;
   159  SceneManager.update = function(deltaTime) {
   160  try {
      ...
   172  }
   173  };

### C015 ADR:101 game/js/plugins/DEUS_TimeSpeed.js:45-50 (bare, file from 1 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - The speeds are 1, 2, 4, 8, 16 and 32. 16 and 32 are always added to the list, whatever the parameter says (`:45-50`).
    45  let speedList = String(P.Speeds || "1, 2, 4, 8, 16, 32").split(",").map(Number).filter(n => n >= 1);
    46  if (!speedList.includes(16)) speedList.push(16);
    47  if (!speedList.includes(32)) speedList.push(32);
    48  speedList.sort((a, b) => a - b);
    49  const SPEEDS = speedList;
    50  if (SPEEDS[0] !== 1) SPEEDS.unshift(1);

### C016 ADR:103 game/js/plugins/DEUS_TimeSpeed.js:231-241 (bare, file from 3 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - On intermediate sub-ticks, TimeSpeed's `Scene_Map.update` runs only `updateMain` and the clock (`:231-241`). But every `Scene_Map.update` wrapper from a plugin loaded *after* TimeSpeed (`plugins.js:184`) still runs its own body on every sub-tick. Examples: Levels `:4287`, NaturalConnections `:508`, Depth `:834`.
   231  const _Scene_Map_update = Scene_Map.prototype.update;
   232  Scene_Map.prototype.update = function() {
   233  if (SPEEDS[index] > 1 && totalSubTicks > 1 && currentSubTick < totalSubTicks - 1) {
      ...
   240  return;
   241  }

### C017 ADR:103 game/js/plugins.js:184 OK
section: 1.1 How the simulation runs today
claim: - On intermediate sub-ticks, TimeSpeed's `Scene_Map.update` runs only `updateMain` and the clock (`:231-241`). But every `Scene_Map.update` wrapper from a plugin loaded *after* TimeSpeed (`plugins.js:184`) still runs its own body on every sub-tick. Examples: Levels `:4287`, NaturalConnections `:508`, Depth `:834`.
   184  "name": "DEUS_TimeSpeed",

### C018 ADR:103 game/js/plugins/DEUS_Levels.js:4287 (bare, file from 0 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - On intermediate sub-ticks, TimeSpeed's `Scene_Map.update` runs only `updateMain` and the clock (`:231-241`). But every `Scene_Map.update` wrapper from a plugin loaded *after* TimeSpeed (`plugins.js:184`) still runs its own body on every sub-tick. Examples: Levels `:4287`, NaturalConnections `:508`, Depth `:834`.
  4287  Scene_Map.prototype.update = function() {

### C019 ADR:103 game/js/plugins/DEUS_NaturalConnections.js:508 (bare, file from 0 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - On intermediate sub-ticks, TimeSpeed's `Scene_Map.update` runs only `updateMain` and the clock (`:231-241`). But every `Scene_Map.update` wrapper from a plugin loaded *after* TimeSpeed (`plugins.js:184`) still runs its own body on every sub-tick. Examples: Levels `:4287`, NaturalConnections `:508`, Depth `:834`.
   508  Scene_Map.prototype.update = function() {

### C020 ADR:103 game/js/plugins/DEUS_Depth.js:834 (bare, file from 0 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - On intermediate sub-ticks, TimeSpeed's `Scene_Map.update` runs only `updateMain` and the clock (`:231-241`). But every `Scene_Map.update` wrapper from a plugin loaded *after* TimeSpeed (`plugins.js:184`) still runs its own body on every sub-tick. Examples: Levels `:4287`, NaturalConnections `:508`, Depth `:834`.
   834  Scene_Map.prototype.update = function() {

### C021 ADR:105 game/js/plugins/DEUS_TimeSpeed.js:209-217 OK
section: 1.1 How the simulation runs today
claim: **Pause.** Pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`). `SceneManager.updateMain` and every `Scene_Map.update` wrapper keep running.
   209  const _Scene_Map_updateMain = Scene_Map.prototype.updateMain;
   210  Scene_Map.prototype.updateMain = function() {
   211  if (!paused) {
      ...
   216  $gameScreen.update();
   217  };

### C022 ADR:108 game/js/plugins/DEUS_Core.js:60-62 OK
section: 1.1 How the simulation runs today
claim: - `$ufTime.update` adds `1/60` per call and advances one game minute per `timeSpeed = 1/6` (`DEUS_Core.js:60-62`, `:304-311`). That is 10 calls per game minute (`ticksPerMinute`, `:376-378`).
    60  // 240 real seconds / 1440 game minutes = 1/6 real seconds per game minute (10 frames at 60 FPS).
    61  const timeSpeed = params["TimeSpeed"] && params["TimeSpeed"] !== "1.0" ? parseFloat(params["TimeSpeed"]) : (1.0 / 6.0);
    62  const startHour = parseInt(params["StartHour"] || 8, 10);

### C023 ADR:108 game/js/plugins/DEUS_Core.js:304-311 (bare, file from 0 line(s) back) OK
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

### C024 ADR:108 game/js/plugins/DEUS_Core.js:376-378 (bare, file from 0 line(s) back) OK
section: 1.1 How the simulation runs today
claim: - `$ufTime.update` adds `1/60` per call and advances one game minute per `timeSpeed = 1/6` (`DEUS_Core.js:60-62`, `:304-311`). That is 10 calls per game minute (`ticksPerMinute`, `:376-378`).
   376  ticksPerMinute() {
   377  return Math.max(1, Math.round(timeSpeed * 60));
   378  }

### C025 ADR:110 game/js/plugins/DEUS_Core.js:505-510 OK
section: 1.1 How the simulation runs today
claim: - The clock runs from `Scene_Map.update` (`DEUS_Core.js:505-510`) and, explicitly, on TimeSpeed sub-ticks (`DEUS_TimeSpeed.js:236`).
   505  Scene_Map.prototype.update = function() {
   506  _Scene_Map_update.call(this);
   507  $ufTime.update();
   508  if (window.UF && UF.Time && typeof UF.Time.update === "function") {
   509  UF.Time.update(1 / 60);
   510  }

### C026 ADR:110 game/js/plugins/DEUS_TimeSpeed.js:236 OK
section: 1.1 How the simulation runs today
claim: - The clock runs from `Scene_Map.update` (`DEUS_Core.js:505-510`) and, explicitly, on TimeSpeed sub-ticks (`DEUS_TimeSpeed.js:236`).
   236  if (window.$ufTime) $ufTime.update();

### C027 ADR:111 game/js/plugins/DEUS_Core.js:305 OK
section: 1.1 How the simulation runs today
claim: - It stops while a message is busy (`DEUS_Core.js:305`).
   305  if (this.isPaused || $gameMessage.isBusy()) return;

### C028 ADR:112 game/js/plugins/DEUS_Core.js:321-325 OK
section: 1.1 How the simulation runs today
claim: - The year advances once per game day (`DEUS_Core.js:321-325`). But `docs/systems/UF_History.md:1161` says a year "takes over 100 real hours at ×1". See Q12.
   321  while (this.hour >= 24) {
   322  this.hour -= 24;
   323  this.day++;
   324  this.year++; // 1 day/night cycle per year
   325  this.onDayPass();

### C029 ADR:112 docs/systems/UF_History.md:1161 OK
section: 1.1 How the simulation runs today
claim: - The year advances once per game day (`DEUS_Core.js:321-325`). But `docs/systems/UF_History.md:1161` says a year "takes over 100 real hours at ×1". See Q12.
  1161  - `currentYear()` counts game-clock years; with Q11 open a year takes over 100 real hours at ×1.

### C030 ADR:115 game/js/plugins/DEUS_Colonists.js:48 OK
section: 1.1 How the simulation runs today
claim: - `DEUS_Colonists.js:48`: `NEEDS_EVERY = 60; // ticks per needs tick (one game minute)`.
    48  const NEEDS_EVERY = 60;         // ticks per needs tick (one game minute)

### C031 ADR:116 game/js/plugins/DEUS_Environment.js:52 OK
section: 1.1 How the simulation runs today
claim: - `DEUS_Environment.js:52`: `TICKS_PER_STEP = 60; // 1 beat / 1 game second`.
    52  const TICKS_PER_STEP = 60; // 1 beat / 1 game second

### C032 ADR:117 game/js/plugins/DEUS_TimeSpeed.js:33 OK
section: 1.1 How the simulation runs today
claim: - `DEUS_TimeSpeed.js:33`: "60 frames = 1 game minute".
    33  * speed-up and the pause). 60 frames = 1 game minute at the default UF_Core

### C033 ADR:119 docs/ARCHITECTURE.md:18 OK
section: 1.1 How the simulation runs today
claim: - `docs/ARCHITECTURE.md:18`: "Engine (20 Hz computation)".
    18  | **TIME** | `UF_Time.js`, `UF_TimeSpeed.js` | Multi-domain clocks: Engine (20 Hz computation), Tactical Action (6s d20 round), Historical (1s = 2h aging), Presentation (60m solar cycle). Pause enforcement. |

### C034 ADR:122 game/js/plugins/DEUS_Ecology.js:994 OK
section: 1.1 How the simulation runs today
claim: - Ecology and Colonists skip their step while the scene is inactive (`DEUS_Ecology.js:994`, `DEUS_Colonists.js:5750`). World, Fluid, Fire and Jobs do not.
   994  if (sceneActive && window.UF && UF.World && UF.World.isWorldMap && UF.World.isWorldMap(this.mapId())) {

### C035 ADR:122 game/js/plugins/DEUS_Colonists.js:5750 OK
section: 1.1 How the simulation runs today
claim: - Ecology and Colonists skip their step while the scene is inactive (`DEUS_Ecology.js:994`, `DEUS_Colonists.js:5750`). World, Fluid, Fire and Jobs do not.
  5750  if (!sceneActive || (window.UF && UF.Time && UF.Time.paused)) return;

### C036 ADR:129 game/js/plugins/DEUS_World.js:2932 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_World.js:2932 | Game_Map.update | **sim**: `World.update` moves every unit (`:1677-1702`) | every call |
  2932  Game_Map.prototype.update = function(sceneActive) {

### C037 ADR:129 game/js/plugins/DEUS_World.js:1677-1702 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_World.js:2932 | Game_Map.update | **sim**: `World.update` moves every unit (`:1677-1702`) | every call |
  1677  World.update = function() {
  1678  if (!this.state) return;
  1679  this._frame++;
      ...
  1701  stepOffscreen(u);
  1702  }

### C038 ADR:130 game/js/plugins/DEUS_Fluid.js:1016 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fluid.js:1016 | Game_Map.update | **sim**: `Fluid.tick()` (`:731-752`) | every call; 512-cell budget (`:55`) |
  1016  Game_Map.prototype.update = function(sceneActive) {

### C039 ADR:130 game/js/plugins/DEUS_Fluid.js:731-752 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fluid.js:1016 | Game_Map.update | **sim**: `Fluid.tick()` (`:731-752`) | every call; 512-cell budget (`:55`) |
   731  tick(budget) {
   732  if (!config.simulationActive) return 0;
   733  const t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
      ...
   751  diag.lastTickMs = elapsed;
   752  

### C040 ADR:130 game/js/plugins/DEUS_Fluid.js:55 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fluid.js:1016 | Game_Map.update | **sim**: `Fluid.tick()` (`:731-752`) | every call; 512-cell budget (`:55`) |
    55  const DEFAULT_BUDGET = 512;

### C041 ADR:131 game/js/plugins/DEUS_Ecology.js:992 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Ecology.js:992 | Game_Map.update | **sim**: `stepBeat` sprouts (`:764-872`) | 60 calls, only while `sceneActive` (`:994-999`) |
   992  Game_Map.prototype.update = function(sceneActive) {

### C042 ADR:131 game/js/plugins/DEUS_Ecology.js:764-872 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Ecology.js:992 | Game_Map.update | **sim**: `stepBeat` sprouts (`:764-872`) | 60 calls, only while `sceneActive` (`:994-999`) |
   764  function stepBeat(opts) {
   765  const W = World(), O = Objects(), st = state(), o = opts || {};
   766  if (!enabled && !o.force || !W || !W.state || !O) return { spawned: 0, matured: 0 };
      ...
   871  }
   872  return result;

### C043 ADR:131 game/js/plugins/DEUS_Ecology.js:994-999 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Ecology.js:992 | Game_Map.update | **sim**: `stepBeat` sprouts (`:764-872`) | 60 calls, only while `sceneActive` (`:994-999`) |
   994  if (sceneActive && window.UF && UF.World && UF.World.isWorldMap && UF.World.isWorldMap(this.mapId())) {
   995  _beatFrame++;
   996  if (_beatFrame >= 60) {
   997  _beatFrame = 0;
   998  stepBeat();
   999  }

### C044 ADR:132 game/js/plugins/DEUS_Fire.js:617 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fire.js:617 | Game_Map.update | **sim**: `safeBeat` | `beatFrames()`, default 60 (`:138-140`) |
   617  Game_Map.prototype.update = function(sceneActive) {

### C045 ADR:132 game/js/plugins/DEUS_Fire.js:138-140 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fire.js:617 | Game_Map.update | **sim**: `safeBeat` | `beatFrames()`, default 60 (`:138-140`) |
   138  const beatFrames = () => {
   139  return (conf() && conf().beatFrames) || 60;
   140  };

### C046 ADR:133 game/js/plugins/DEUS_Environment.js:796 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Environment.js:796 | Game_Map.update | **sim**: unit thermal. Also writes screen weather (`:690-710`) | unit id spread over 60 (`:730-744`) |
   796  Game_Map.prototype.update = function(sceneActive) {

### C047 ADR:133 game/js/plugins/DEUS_Environment.js:690-710 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Environment.js:796 | Game_Map.update | **sim**: unit thermal. Also writes screen weather (`:690-710`) | unit id spread over 60 (`:730-744`) |
   690  if (!W) return;
   691  const lvl = typeof W.viewLevel === "function" ? W.viewLevel() : null;
   692  const z = lvl ? lvl.z : 0;
      ...
   709  $gameScreen.changeWeather(targetType, power, 60);
   710  }

### C048 ADR:133 game/js/plugins/DEUS_Environment.js:730-744 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Environment.js:796 | Game_Map.update | **sim**: unit thermal. Also writes screen weather (`:690-710`) | unit id spread over 60 (`:730-744`) |
   730  // Interleave living units over 60 frames so simulation is smooth and spike-free
   731  const stUnits = W.state && W.state.units;
   732  if (stUnits) {
      ...
   743  }
   744  }

### C049 ADR:134 game/js/plugins/DEUS_Colonists.js:5748 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Colonists.js:5748 | Game_Map.update | **sim**: needs and job sweep | needs every 60 (`:48`), sweep every 30 (`:63`); skipped while inactive or paused (`:5750`) |
  5748  Game_Map.prototype.update = function(sceneActive) {

### C050 ADR:134 game/js/plugins/DEUS_Colonists.js:48 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Colonists.js:5748 | Game_Map.update | **sim**: needs and job sweep | needs every 60 (`:48`), sweep every 30 (`:63`); skipped while inactive or paused (`:5750`) |
    48  const NEEDS_EVERY = 60;         // ticks per needs tick (one game minute)

### C051 ADR:134 game/js/plugins/DEUS_Colonists.js:63 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Colonists.js:5748 | Game_Map.update | **sim**: needs and job sweep | needs every 60 (`:48`), sweep every 30 (`:63`); skipped while inactive or paused (`:5750`) |
    63  const SWEEP_EVERY = 30;         // ticks between sweeps of the colonist list for idle workers

### C052 ADR:134 game/js/plugins/DEUS_Colonists.js:5750 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Colonists.js:5748 | Game_Map.update | **sim**: needs and job sweep | needs every 60 (`:48`), sweep every 30 (`:63`); skipped while inactive or paused (`:5750`) |
  5750  if (!sceneActive || (window.UF && UF.Time && UF.Time.paused)) return;

### C053 ADR:135 game/js/plugins/DEUS_Jobs.js:1777 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Jobs.js:1777 | Game_Map.update | **sim**: job step | every call |
  1777  Game_Map.prototype.update = function(sceneActive) {

### C054 ADR:136 game/js/plugins/DEUS_Projects.js:1596 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Projects.js:1596 | Game_Map.update | **sim**: projects | cycle every `cadenceTicks: 3000` (`:38`) |
  1596  Game_Map.prototype.update = function(sceneActive) {

### C055 ADR:136 game/js/plugins/DEUS_Projects.js:38 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Projects.js:1596 | Game_Map.update | **sim**: projects | cycle every `cadenceTicks: 3000` (`:38`) |
    38  cadenceTicks: 3000,      // map updates between full cycles (~50 s at 60 updates/s); domain "action"

### C056 ADR:137 game/js/plugins/DEUS_Combat.js:1414 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Combat.js:1414 | Game_Map.update | **sim**: `step()` | every call |
  1414  Game_Map.prototype.update = function(sceneActive) {

### C057 ADR:138 game/js/plugins/DEUS_Factions.js:657 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Factions.js:657 | Game_Map.update | **sim**: `checkContact` | every 120 (`:631-632`) |
   657  Game_Map.prototype.update = function(sceneActive) {

### C058 ADR:138 game/js/plugins/DEUS_Factions.js:631-632 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Factions.js:657 | Game_Map.update | **sim**: `checkContact` | every 120 (`:631-632`) |
   631  const CONTACT_CELLS = 12;
   632  const CONTACT_EVERY = 120; // frames (2 s at x1)

### C059 ADR:139 game/js/plugins/DEUS_Ownership.js:613 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Ownership.js:613 | Game_Map.update | **sim**: `scanSleep` / `reconcile` | own counters |
   613  Game_Map.prototype.update = function(sceneActive) {

### C060 ADR:140 game/js/plugins/DEUS_TimeSpeed.js:189 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_TimeSpeed.js:189 | Game_Map.update | **sim**: `UF.Time.after/every` timers (closures) | every call |
   189  Game_Map.prototype.update = function(sceneActive) {

### C061 ADR:141 game/js/plugins/DEUS_Anim.js:1506 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Anim.js:1506 | Game_Map.update | **render writing sim**: death queue calls `W.removeUnit` (`:1509-1522`) | every call |
  1506  Game_Map.prototype.update = function(sceneActive) {

### C062 ADR:141 game/js/plugins/DEUS_Anim.js:1509-1522 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Anim.js:1506 | Game_Map.update | **render writing sim**: death queue calls `W.removeUnit` (`:1509-1522`) | every call |
  1509  if (deathQueue.size) {
  1510  const W = World();
  1511  for (const id of Array.from(deathQueue)) {
      ...
  1521  }
  1522  }

### C063 ADR:142 game/js/plugins/DEUS_Fog.js:638 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fog.js:638 | Game_Map.update | presentation: `Fog.refresh` (Fog is force-disabled, `:510-518`) | every 20 (`:53`) |
   638  Game_Map.prototype.update = function(sceneActive) {

### C064 ADR:142 game/js/plugins/DEUS_Fog.js:510-518 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fog.js:638 | Game_Map.update | presentation: `Fog.refresh` (Fog is force-disabled, `:510-518`) | every 20 (`:53`) |
   510  function resolveEnabled() {
   511  // Fog of war temporarily disabled per user directive 2026-09-22
   512  return false;
      ...
   517  window.UF.Fog = Fog;
   518  Fog.enabled = false;

### C065 ADR:142 game/js/plugins/DEUS_Fog.js:53 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Fog.js:638 | Game_Map.update | presentation: `Fog.refresh` (Fog is force-disabled, `:510-518`) | every 20 (`:53`) |
    53  const UPDATE_FRAMES = 20;

### C066 ADR:143 game/js/plugins/DEUS_Wildlife.js:1195 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Wildlife.js:1195 | Game_Map.update | empty ("AI update loop wiped", `:1197`) | — |
  1195  Game_Map.prototype.update = function(sceneActive) {

### C067 ADR:143 game/js/plugins/DEUS_Wildlife.js:1197 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Wildlife.js:1195 | Game_Map.update | empty ("AI update loop wiped", `:1197`) | — |
  1197  // AI update loop wiped per Objective 2

### C068 ADR:144 game/js/plugins/DEUS_Core.js:505 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Core.js:505 | Scene_Map.update | **sim**: calendar `$ufTime.update()` | every call, except while a message is busy |
   505  Scene_Map.prototype.update = function() {

### C069 ADR:145 game/js/plugins/DEUS_Core.js:175 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Core.js:175 | Scene_Map.update | NW.js logging and autotest | every call |
   175  Scene_Map.prototype.update = function() {

### C070 ADR:146 game/js/plugins/DEUS_NaturalConnections.js:508 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_NaturalConnections.js:508 | Scene_Map.update | **sim**: `updateFluids(); stepCreatures();` (`:512-515`) | `Graphics.frameCount % 30`; runs while paused (§A.4) |
   508  Scene_Map.prototype.update = function() {

### C071 ADR:146 game/js/plugins/DEUS_NaturalConnections.js:512-515 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_NaturalConnections.js:508 | Scene_Map.update | **sim**: `updateFluids(); stepCreatures();` (`:512-515`) | `Graphics.frameCount % 30`; runs while paused (§A.4) |
   512  if (Graphics.frameCount % 30 === 0) {
   513  updateFluids();
   514  stepCreatures();
   515  }

### C072 ADR:147 game/js/plugins/DEUS_TimeSpeed.js:232 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_TimeSpeed.js:232 | Scene_Map.update | host: sub-tick split and speed keys | every call |
   232  Scene_Map.prototype.update = function() {

### C073 ADR:148 game/js/plugins/DEUS_Combat.js:1479 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Combat.js:1479 | Scene_Map.update | input: debug raid key | every call |
  1479  Scene_Map.prototype.update = function() {

### C074 ADR:149 game/js/plugins/DEUS_Factions.js:751 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Factions.js:751, :1156 | Scene_Map.update | UI: ledger key, window skins | every call |
   751  Scene_Map.prototype.update = function() {

### C075 ADR:149 game/js/plugins/DEUS_Factions.js:1156 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Factions.js:751, :1156 | Scene_Map.update | UI: ledger key, window skins | every call |
  1156  Scene_Map.prototype.update = function() {

### C076 ADR:150 game/js/plugins/DEUS_History.js:3662 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_History.js:3662, :3780 | Scene_Map.update | UI: chronicle keys; test capture | every call |
  3662  Scene_Map.prototype.update = function() {

### C077 ADR:150 game/js/plugins/DEUS_History.js:3780 (bare, file from 0 line(s) back) OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_History.js:3662, :3780 | Scene_Map.update | UI: chronicle keys; test capture | every call |
  3780  Scene_Map.prototype.update = function() {

### C078 ADR:151 game/js/plugins/DEUS_Levels.js:4287 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Levels.js:4287 | Scene_Map.update | UI and input: level keys, `mapFrames++` | every call |
  4287  Scene_Map.prototype.update = function() {

### C079 ADR:152 game/js/plugins/DEUS_Depth.js:834 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_Depth.js:834 | Scene_Map.update | UI: preset key | every call |
   834  Scene_Map.prototype.update = function() {

### C080 ADR:153 game/js/plugins/DEUS_ColonyOverseer.js:196 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_ColonyOverseer.js:196, DEUS_Containers.js:1323, DEUS_Interact.js:885, DEUS_Select.js:2289, DEUS_Sheet.js:2252, DEUS_Talk.js:1938 | Scene_Map.update | input, UI and commands | every call |
   196  Scene_Map.prototype.update = function() {

### C081 ADR:153 game/js/plugins/DEUS_Containers.js:1323 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_ColonyOverseer.js:196, DEUS_Containers.js:1323, DEUS_Interact.js:885, DEUS_Select.js:2289, DEUS_Sheet.js:2252, DEUS_Talk.js:1938 | Scene_Map.update | input, UI and commands | every call |
  1323  Scene_Map.prototype.update = function() {

### C082 ADR:153 game/js/plugins/DEUS_Interact.js:885 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_ColonyOverseer.js:196, DEUS_Containers.js:1323, DEUS_Interact.js:885, DEUS_Select.js:2289, DEUS_Sheet.js:2252, DEUS_Talk.js:1938 | Scene_Map.update | input, UI and commands | every call |
   885  Scene_Map.prototype.update = function() {

### C083 ADR:153 game/js/plugins/DEUS_Select.js:2289 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_ColonyOverseer.js:196, DEUS_Containers.js:1323, DEUS_Interact.js:885, DEUS_Select.js:2289, DEUS_Sheet.js:2252, DEUS_Talk.js:1938 | Scene_Map.update | input, UI and commands | every call |
  2289  Scene_Map.prototype.update = function() {

### C084 ADR:153 game/js/plugins/DEUS_Sheet.js:2252 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_ColonyOverseer.js:196, DEUS_Containers.js:1323, DEUS_Interact.js:885, DEUS_Select.js:2289, DEUS_Sheet.js:2252, DEUS_Talk.js:1938 | Scene_Map.update | input, UI and commands | every call |
  2252  Scene_Map.prototype.update = function() {

### C085 ADR:153 game/js/plugins/DEUS_Talk.js:1938 OK
section: 1.2 Tick-hook inventory (32 hooks in 26 plugins)
claim: | DEUS_ColonyOverseer.js:196, DEUS_Containers.js:1323, DEUS_Interact.js:885, DEUS_Select.js:2289, DEUS_Sheet.js:2252, DEUS_Talk.js:1938 | Scene_Map.update | input, UI and commands | every call |
  1938  Scene_Map.prototype.update = function() {

### C086 ADR:159 game/js/plugins/DEUS_World.js:1677-1702 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: **Units** (`World.update`, `DEUS_World.js:1677-1702`).
  1677  World.update = function() {
  1678  if (!this.state) return;
  1679  this._frame++;
      ...
  1701  stepOffscreen(u);
  1702  }

### C087 ADR:160 game/js/plugins/DEUS_World.js:1686-1698 (bare, file from 1 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - A unit on the viewed level that has an event copies its position *from* the `Game_Event` (`:1686-1698`). It moves with RMMZ movement: `stepOnscreen` / `stepDirect` (`:1633-1675`), dropping its goal after `STUCK_LIMIT = 300` frames (`:140`).
  1686  if (view && u.area.x === view.x && u.area.y === view.y && zOf(u) === view.z) {
  1687  const ev = $gameMap._events[EVENT_BASE + u.id];
  1688  if (!ev) {
      ...
  1697  u.dir8 = ev.dir8 ? ev.dir8() : u.dir;
  1698  if (u.goal) stepOnscreen(u, ev);

### C088 ADR:160 game/js/plugins/DEUS_World.js:1633-1675 (bare, file from 1 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - A unit on the viewed level that has an event copies its position *from* the `Game_Event` (`:1686-1698`). It moves with RMMZ movement: `stepOnscreen` / `stepDirect` (`:1633-1675`), dropping its goal after `STUCK_LIMIT = 300` frames (`:140`).
  1633  function stepOnscreen(u, ev) {
  1634  if (ev.isMoving()) return;
  1635  if (goalReached(u)) return arrive(u);
      ...
  1674  }
  1675  }

### C089 ADR:160 game/js/plugins/DEUS_World.js:140 (bare, file from 1 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - A unit on the viewed level that has an event copies its position *from* the `Game_Event` (`:1686-1698`). It moves with RMMZ movement: `stepOnscreen` / `stepDirect` (`:1633-1675`), dropping its goal after `STUCK_LIMIT = 300` frames (`:140`).
   140  const STUCK_LIMIT = 300; // frames a unit on screen may fail to move before its goal is dropped

### C090 ADR:161 game/js/plugins/DEUS_World.js:136 (bare, file from 2 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Every other unit jumps one whole cell every `unitStepFrames = 16` frames (`:136`, `:1689`, `:1699-1701`), along a planned path or straight toward its goal (`:1613-1628`).
   136  unitStepFrames: Math.max(1, num("UnitStepFrames", 16))

### C091 ADR:161 game/js/plugins/DEUS_World.js:1689 (bare, file from 2 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Every other unit jumps one whole cell every `unitStepFrames = 16` frames (`:136`, `:1689`, `:1699-1701`), along a planned path or straight toward its goal (`:1613-1628`).
  1689  if (u.goal && (frame + u.id) % steps === 0) stepOffscreen(u);

### C092 ADR:161 game/js/plugins/DEUS_World.js:1699-1701 (bare, file from 2 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Every other unit jumps one whole cell every `unitStepFrames = 16` frames (`:136`, `:1689`, `:1699-1701`), along a planned path or straight toward its goal (`:1613-1628`).
  1699  } else if (u.goal && (frame + u.id) % steps === 0) {
  1700  // Off-screen steps are spread over the frames by unit id, so hundreds of units don't all step at once.
  1701  stepOffscreen(u);

### C093 ADR:161 game/js/plugins/DEUS_World.js:1613-1628 (bare, file from 2 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Every other unit jumps one whole cell every `unitStepFrames = 16` frames (`:136`, `:1689`, `:1699-1701`), along a planned path or straight toward its goal (`:1613-1628`).
  1613  function stepOffscreen(u) {
  1614  if (goalReached(u)) return arrive(u);
  1615  if (PATHS.enabled && PATHS.offscreenPaths && !(u.data && u.data.through) && sameArea(u.goal.area, u.area)) return stepOffscreenAlongPath(u);
      ...
  1627  if (u.goal && goalReached(u)) arrive(u);
  1628  }

### C094 ADR:163 game/js/plugins/DEUS_World.js:847-855 (bare, file from 4 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - On screen, speed follows `u.data.moveSpeed` and conditions (`unitMoveSpeed`, `:847-855`), through RMMZ's `2^speed / 256` cells per frame (`rmmz_objects.js:7062-7064`). The default speed 4 gives 1/16 cell per frame.
   847  function unitMoveSpeed(u) {
   848  let base = (u && u.data && Number.isFinite(u.data.moveSpeed)) ? (u.data.moveSpeed | 0) : 4;
   849  const Cond = window.UF && UF.Conditions;
      ...
   854  const factor = Cond.speedFactor(u);
   855  if (factor === 0) return 0;

### C095 ADR:163 game/js/rmmz_objects.js:7062-7064 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - On screen, speed follows `u.data.moveSpeed` and conditions (`unitMoveSpeed`, `:847-855`), through RMMZ's `2^speed / 256` cells per frame (`rmmz_objects.js:7062-7064`). The default speed 4 gives 1/16 cell per frame.
  7062  Game_CharacterBase.prototype.distancePerFrame = function() {
  7063  return Math.pow(2, this.realMoveSpeed()) / 256;
  7064  };

### C096 ADR:166 game/js/rmmz_objects.js:888-911 (bare, file from 3 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Every unit on view is a `Game_Event` with a `Sprite_Character` (`:888-911`).
   888  Game_Screen.prototype.clearWeather = function() {
   889  this._weatherType = "none";
   890  this._weatherPower = 0;
      ...
   910  
   911  Game_Screen.prototype.startFadeOut = function(duration) {

### C097 ADR:169 game/js/plugins/DEUS_Fluid.js:737-745 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - `Fluid.tick` steps only the viewed area when there is a view (`DEUS_Fluid.js:737-745`).
   737  const view = W && typeof W.viewLevel === "function" ? W.viewLevel() : null;
   738  
   739  if (view) {
      ...
   744  }
   745  }

### C098 ADR:170 game/js/plugins/DEUS_World.js:127-128 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - *Correction to the PM survey:* by default `AreasX = AreasY = 1` (`DEUS_World.js:127-128`), and the `DEUS_World` parameters are `{}` (`plugins.js:58`). So there is exactly one area, and `stepArea` works through that area's whole queue on all 5 levels (`DEUS_Fluid.js:356-376`). The view restriction only matters in multi-area worlds.
   127  areasX: num("AreasX", 1),
   128  areasY: num("AreasY", 1),

### C099 ADR:170 game/js/plugins.js:58 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - *Correction to the PM survey:* by default `AreasX = AreasY = 1` (`DEUS_World.js:127-128`), and the `DEUS_World` parameters are `{}` (`plugins.js:58`). So there is exactly one area, and `stepArea` works through that area's whole queue on all 5 levels (`DEUS_Fluid.js:356-376`). The view restriction only matters in multi-area worlds.
    58  "parameters": {}

### C100 ADR:170 game/js/plugins/DEUS_Fluid.js:356-376 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - *Correction to the PM survey:* by default `AreasX = AreasY = 1` (`DEUS_World.js:127-128`), and the `DEUS_World` parameters are `{}` (`plugins.js:58`). So there is exactly one area, and `stepArea` works through that area's whole queue on all 5 levels (`DEUS_Fluid.js:356-376`). The view restriction only matters in multi-area worlds.
   356  function stepArea(ax, ay, budget) {
   357  const data = getAreaData(ax, ay);
   358  const queue = data.queue;
      ...
   375  
   376  while (data.head < limit) {

### C101 ADR:173 game/js/plugins/DEUS_Ecology.js:22-27 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Each game hour it steps the current area plus one rotating area (header `DEUS_Ecology.js:22-27`; `tickHour`, `:888-920`; `cursorArea`, `:878-886`). The same 1×1 qualification applies.
    22  * Every six game hours, the current area and one rotating world area get a
    23  * deterministic population roll. Prey can recover toward the area's original
    24  * population. Monsters can replenish or first appear only in catalog-approved
    25  * biomes/regions. Both populations have hard area caps. Monster cells must be
    26  * free and remain outside the protected start, camps, active faction sites,
    27  * nearby people, and the player's view radius.

### C102 ADR:173 game/js/plugins/DEUS_Ecology.js:888-920 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Each game hour it steps the current area plus one rotating area (header `DEUS_Ecology.js:22-27`; `tickHour`, `:888-920`; `cursorArea`, `:878-886`). The same 1×1 qualification applies.
   888  function tickHour(hour) {
   889  const O = Objects(), W = World(), st = state();
   890  const at = Number.isFinite(hour) ? hour : (O && O.hourNow ? O.hourNow() : 0);
      ...
   919  return result;
   920  }

### C103 ADR:173 game/js/plugins/DEUS_Ecology.js:878-886 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Each game hour it steps the current area plus one rotating area (header `DEUS_Ecology.js:22-27`; `tickHour`, `:888-920`; `cursorArea`, `:878-886`). The same 1×1 qualification applies.
   878  function cursorArea() {
   879  const W = World(), st = state();
   880  if (!W || !W.state || !st) return null;
      ...
   885  return { x: i % W.state.areasX, y: Math.floor(i / W.state.areasX) };
   886  }

### C104 ADR:175 game/js/plugins/DEUS_World.js:532 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - `currentArea()` is ground-only and returns null while another level is viewed (`DEUS_World.js:532`; header `:106-108`);
   532  World.currentArea = () => (window.$gameMap && World.state ? World.areaOfMapId($gameMap.mapId()) : null);

### C105 ADR:175 game/js/plugins/DEUS_World.js:106-108 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - `currentArea()` is ground-only and returns null while another level is viewed (`DEUS_World.js:532`; header `:106-108`);
   106  * calls stay ground-only on purpose: currentArea() / areaOfMapId() /
   107  * isAreaMap() answer only for the ground (null while another level is on
   108  * screen), and world:tileChanged / world:objectChanged / world:areaBuilt fire

### C106 ADR:176 game/js/plugins/DEUS_Ecology.js:803 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - sprouts spawn only in the current area (`DEUS_Ecology.js:803`);
   803  const baseArea = (W.currentArea && W.currentArea()) || { x: 0, y: 0 };

### C107 ADR:177 game/js/plugins/DEUS_Ecology.js:452-453 (bare, file from 1 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - spawn protection uses the player cursor's position (`:452-453`).
   452  const here = W.currentArea();
   453  if (sameArea(here, area) && window.$gamePlayer && Math.hypot(x - $gamePlayer.x, y - $gamePlayer.y) < PLAYER_CLEARANCE) return "player";

### C108 ADR:179 game/js/plugins/DEUS_Fire.js:488-494 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: **Fire.** Campfire escapes and accidental starts happen only in the viewed area and level, and they read `window.$dataMap.ufObjects` (`DEUS_Fire.js:488-494`, `:562-588`).
   488  //-------------------------------------------------------------------------
   489  // Contained sources (campfires) of the area on screen: indexed once per built grid, kept by world:objectChanged
   490  
   491  const src = { grid: null, area: null, conf: null, cells: new Set() };
   492  function sourceCells() {
   493  const W = World(), map = window.$dataMap;
   494  const area = viewArea();

### C109 ADR:179 game/js/plugins/DEUS_Fire.js:562-588 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: **Fire.** Campfire escapes and accidental starts happen only in the viewed area and level, and they read `window.$dataMap.ufObjects` (`DEUS_Fire.js:488-494`, `:562-588`).
   562  const s = sourceCells();
   563  if (s && s.cells.size) {
   564  const size = W.state.size;
      ...
   587  if (!f.burning[nkey] && !catches.has(nkey)) catches.set(nkey, { area, x, y, cause: "accident" });
   588  }

### C110 ADR:182 game/js/plugins/DEUS_Sheet.js:833-846 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Opening a unit's Sheet assigns its D&D class, HP and AC if the unit has none yet (`DEUS_Sheet.js:833-846`).
   833  const Dnd = window.UF && UF.Dnd5e;
   834  let dnd = d.dnd || null;
   835  if (!dnd && Dnd && typeof Dnd.assignClass === "function") {
      ...
   845  d.savingThrows = dnd.savingThrows;
   846  }

### C111 ADR:183 game/js/plugins/DEUS_Anim.js:702 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - After a combat death, the unit is removed by DEUS_Anim: either by its `Game_Map.update` death queue (`DEUS_Anim.js:702`, `:714`, `:1504-1522`) or by its `onUnitDeath` wrapper (`:1605-1631`, removal at `:1624`).
   702  const deathQueue = new Set(); // units found in UF_Combat's own collapse: removed (as deaths) at the next map update

### C112 ADR:183 game/js/plugins/DEUS_Anim.js:714 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - After a combat death, the unit is removed by DEUS_Anim: either by its `Game_Map.update` death queue (`DEUS_Anim.js:702`, `:714`, `:1504-1522`) or by its `onUnitDeath` wrapper (`:1605-1631`, removal at `:1624`).
   714  deathQueue.add(u.id);

### C113 ADR:183 game/js/plugins/DEUS_Anim.js:1504-1522 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - After a combat death, the unit is removed by DEUS_Anim: either by its `Game_Map.update` death queue (`DEUS_Anim.js:702`, `:714`, `:1504-1522`) or by its `onUnitDeath` wrapper (`:1605-1631`, removal at `:1624`).
  1504  let lastBeat = -1;
  1505  const _Game_Map_update = Game_Map.prototype.update;
  1506  Game_Map.prototype.update = function(sceneActive) {
      ...
  1521  }
  1522  }

### C114 ADR:183 game/js/plugins/DEUS_Anim.js:1605-1631 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - After a combat death, the unit is removed by DEUS_Anim: either by its `Game_Map.update` death queue (`DEUS_Anim.js:702`, `:714`, `:1504-1522`) or by its `onUnitDeath` wrapper (`:1605-1631`, removal at `:1624`).
  1605  if (C && typeof C.onUnitDeath === "function" && !isWrap(C.onUnitDeath)) {
  1606  const orig = C.onUnitDeath;
  1607  C.onUnitDeath = markWrap(function(victim) {
      ...
  1630  }
  1631  }, orig);

### C115 ADR:183 game/js/plugins/DEUS_Anim.js:1624 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - After a combat death, the unit is removed by DEUS_Anim: either by its `Game_Map.update` death queue (`DEUS_Anim.js:702`, `:714`, `:1504-1522`) or by its `onUnitDeath` wrapper (`:1605-1631`, removal at `:1624`).
  1624  w.removeUnit(id);

### C116 ADR:184 game/js/plugins/DEUS_Culling.js:292-307 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - DEUS_Culling wraps `World.update`, `addUnit`, `removeUnit`, `moveUnitToLevel` and `reconcileEvents` so they run inside the spriteset (`DEUS_Culling.js:292-307`).
   292  function installLifecycle() {
   293  const world = UF.World;
   294  if (!world) return;
      ...
   306  world[name] = wrapped;
   307  }

### C117 ADR:185 game/js/plugins/DEUS_Tiles.js:505-512 OK
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

### C118 ADR:185 game/js/plugins/DEUS_Tiles.js:1247-1256 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - DEUS_Tiles replaces `Tilemap.isWaterTile`, writes tileset passability into `$dataTilesets` (`DEUS_Tiles.js:505-512`), and wraps `World.buildArea` (`:1247-1256`).
  1247  if (buildHookRegistered) return;
  1248  if (window.UF && UF.World && UF.World.buildArea) {
  1249  const origBuild = UF.World.buildArea;
      ...
  1255  if (UF.World.on) {
  1256  UF.World.on("world:tileChanged", (area, x, y, layer, tileId) => {

### C119 ADR:186 game/js/plugins/DEUS_Camera.js:85-93 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - DEUS_Camera replaces `isNearTheScreen` (`DEUS_Camera.js:85-93`). That function gates RMMZ event self-movement (`rmmz_objects.js:9220-9224`).
    85  Game_CharacterBase.prototype.isNearTheScreen = function() {
    86  const gw = Graphics.width;
    87  const gh = Graphics.height;
      ...
    92  return px >= -gw && px <= gw && py >= -gh && py <= gh;
    93  };

### C120 ADR:186 game/js/rmmz_objects.js:9220-9224 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - DEUS_Camera replaces `isNearTheScreen` (`DEUS_Camera.js:85-93`). That function gates RMMZ event self-movement (`rmmz_objects.js:9220-9224`).
  9220  Game_Event.prototype.updateSelfMovement = function() {
  9221  if (
  9222  !this._locked &&
  9223  this.isNearTheScreen() &&
  9224  this.checkStop(this.stopCountThreshold())

### C121 ADR:189 game/js/plugins/DEUS_World.js:595-640 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Terrain reads go through RMMZ-format `$dataMap` builds (`World.buildArea`, `DEUS_World.js:595-640`), cached 6 deep (`:801`, `:811-822`).
   595  /**
   596  * Build the $dataMap object of an area's level (z left out = the ground) in memory. Pure: doesn't touch the
   597  * current map. Only the generators registered for that level run; the start template is ground-only.
      ...
   639  setObject(x, y, type) {
   640  if (x >= 0 && y >= 0 && x < size && y < size) objects[y * size + x] = type;

### C122 ADR:189 game/js/plugins/DEUS_World.js:801 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Terrain reads go through RMMZ-format `$dataMap` builds (`World.buildArea`, `DEUS_World.js:595-640`), cached 6 deep (`:801`, `:811-822`).
   801  const PEEK_CACHE = 6;

### C123 ADR:189 game/js/plugins/DEUS_World.js:811-822 (bare, file from 0 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Terrain reads go through RMMZ-format `$dataMap` builds (`World.buildArea`, `DEUS_World.js:595-640`), cached 6 deep (`:801`, `:811-822`).
   811  World.peekArea = function(ax, ay, z = 0) {
   812  if (!this.state || !this.inWorld(ax, ay, z)) return null;
   813  const key = cacheKey(ax, ay, z);
      ...
   821  return map;
   822  };

### C124 ADR:190 game/js/plugins/DEUS_World.js:2819-2820 (bare, file from 1 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - Builds kept for off-screen reads "may be older than the generators' inputs" (`:2819-2820`).
  2819  // return from another scene) still rebuilds it, as before. Builds made only for off-screen reads are never shown
  2820  // (they may be older than the generators' inputs, e.g. one made during world:created).

### C125 ADR:191 game/js/plugins/DEUS_World.js:535-539 (bare, file from 2 line(s) back) OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - The viewed level *is* the RMMZ map id (`viewLevel`, `:535-539`), so a level switch is a map transfer (`DEUS_Levels.js:4179-4193` → `DEUS_World.js:2724-2730`). Lane N is removing that.
   535  World.viewLevel = () => {
   536  if (!window.$gameMap || !World.state) return null;
   537  const id = $gameMap.mapId();
   538  if (viewMemo.id !== id || viewMemo.state !== World.state) viewMemo = { id, state: World.state, level: Object.freeze(World.levelOfMapId(id)) };
   539  return viewMemo.level;

### C126 ADR:191 game/js/plugins/DEUS_Levels.js:4179-4193 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - The viewed level *is* the RMMZ map id (`viewLevel`, `:535-539`), so a level switch is a map transfer (`DEUS_Levels.js:4179-4193` → `DEUS_World.js:2724-2730`). Lane N is removing that.
  4179  function setView(z, opts = {}) {
  4180  const W = World();
  4181  const v = W && W.viewLevel();
      ...
  4192  return true;
  4193  }

### C127 ADR:191 game/js/plugins/DEUS_World.js:2724-2730 OK
section: 1.3 Detail and outcomes depend on what is on screen
claim: - The viewed level *is* the RMMZ map id (`viewLevel`, `:535-539`), so a level switch is a map transfer (`DEUS_Levels.js:4179-4193` → `DEUS_World.js:2724-2730`). Lane N is removing that.
  2724  World.transferView = function(ax, ay, x, y, dir, z) {
  2725  const v = this.viewLevel();
  2726  const lz = z === undefined ? (v ? v.z : 0) : z;
  2727  if (!this.state || !this.inWorld(ax, ay, lz)) return false;
  2728  $gamePlayer.reserveTransfer(this.areaMapId(ax, ay, lz), x, y, dir || $gamePlayer.direction(), 2);
  2729  return true;
  2730  };

### C128 ADR:195 game/js/plugins/DEUS_NaturalConnections.js:312-329 OK
section: 1.4 Conservation holes found
claim: - **NaturalConnections creates water.** `addFluid` writes water into the lower cell without removing any from the upper cell (`DEUS_NaturalConnections.js:312-329`, called at `:352-353`). This happens every 30 frames for each wet link.
   312  function addFluid(r, type = "water") {
   313  if (!validCell(r)) return false;
   314  const fs = fluidsState();
      ...
   328  }
   329  return true;

### C129 ADR:195 game/js/plugins/DEUS_NaturalConnections.js:352-353 (bare, file from 0 line(s) back) OK
section: 1.4 Conservation holes found
claim: - **NaturalConnections creates water.** `addFluid` writes water into the lower cell without removing any from the upper cell (`DEUS_NaturalConnections.js:312-329`, called at `:352-353`). This happens every 30 frames for each wet link.
   352  if (isWater(upper)) {
   353  addFluid(lower, "water");

### C130 ADR:196 game/js/plugins/DEUS_Fluid.js:896-923 OK
section: 1.4 Conservation holes found
claim: - **Fluid reconciliation loses water.** It moves excess fluid up and sideways, and any excess still left afterwards is dropped (`DEUS_Fluid.js:896-923`).
   896  // Displace excess fluid into open neighbor or cell above to preserve mass conservation
   897  if (excess > 0) {
   898  if (z < Z_MAX) {
      ...
   922  }
   923  }

### C131 ADR:197 game/js/plugins/DEUS_Ecology.js:736-752 OK
section: 1.4 Conservation holes found
claim: - **Ecology creates ore.** Sprouts turn `rocks_small` into ironstone, copper or gold outcrops (`DEUS_Ecology.js:736-752`). The file's own header says ore is finite (`:20`), and so does INV-SIM-03 (`docs/INVARIANT_REGISTRY.md:53`).
   736  const SPROUT_DEFS = {
   737  0: [
   738  { sprout: "sapling", matures: ["oak", "pine", "birch", "fruit_tree"], weights: [5, 2, 2, 1], delay: 120 },
      ...
   751  ]
   752  };

### C132 ADR:197 game/js/plugins/DEUS_Ecology.js:20 (bare, file from 0 line(s) back) OK
section: 1.4 Conservation holes found
claim: - **Ecology creates ore.** Sprouts turn `rocks_small` into ironstone, copper or gold outcrops (`DEUS_Ecology.js:736-752`). The file's own header says ore is finite (`:20`), and so does INV-SIM-03 (`docs/INVARIANT_REGISTRY.md:53`).
    20  * bushes/plants. Ore, stone, gems, ruins, and constructed objects are finite.

### C133 ADR:197 docs/INVARIANT_REGISTRY.md:53 OK
section: 1.4 Conservation holes found
claim: - **Ecology creates ore.** Sprouts turn `rocks_small` into ironstone, copper or gold outcrops (`DEUS_Ecology.js:736-752`). The file's own header says ore is finite (`:20`), and so does INV-SIM-03 (`docs/INVARIANT_REGISTRY.md:53`).
    53  | **INV-SIM-03** | **Finite Material Conservation** | Finite resources (wood, stone, metal ore, soil) originate from discrete physical entities or strata; they cannot be fabricated without material cost. | `DEUS_Items.js

### C134 ADR:198 game/js/plugins/DEUS_Levels.js:1700-1702 OK
section: 1.4 Conservation holes found
claim: - **Destroying a stratum deletes its matter.** A destroyed stratum becomes air (`DEUS_Levels.js:1700-1702`). Its debris is only named in the `levels:strataDestroyed` event (`:1720-1722`); "no item drops in 19A" (`:1001-1002`). This is a LIFE-001 hole (`docs/RISK_REGISTER.md:60`) that §16 closes.
  1700  out.destroyed = true;
  1701  out.debris = mat.debris;
  1702  rec[REC_M + s] = M_AIR;

### C135 ADR:198 game/js/plugins/DEUS_Levels.js:1720-1722 (bare, file from 0 line(s) back) OK
section: 1.4 Conservation holes found
claim: - **Destroying a stratum deletes its matter.** A destroyed stratum becomes air (`DEUS_Levels.js:1700-1702`). Its debris is only named in the `levels:strataDestroyed` event (`:1720-1722`); "no item drops in 19A" (`:1001-1002`). This is a LIFE-001 hole (`docs/RISK_REGISTER.md:60`) that §16 closes.
  1720  stats.strataDestroyed++;
  1721  emit("levels:strataDestroyed", { area: { x: ax, y: ay }, x, y, z, stratum: r.stratum, material: r.material, constructed: r.constructed,
  1722  debris: r.debris, damageType, source });

### C136 ADR:198 game/js/plugins/DEUS_Levels.js:1001-1002 (bare, file from 0 line(s) back) OK
section: 1.4 Conservation holes found
claim: - **Destroying a stratum deletes its matter.** A destroyed stratum becomes air (`DEUS_Levels.js:1700-1702`). Its debris is only named in the `levels:strataDestroyed` event (`:1720-1722`); "no item drops in 19A" (`:1001-1002`). This is a LIFE-001 hole (`docs/RISK_REGISTER.md:60`) that §16 closes.
  1001  // type (a type not listed: 1); support is what a full-HP stratum carries (0..1); debris is what a destroyed stratum
  1002  // leaves, reported in levels:strataDestroyed (no item drops in 19A).

### C137 ADR:198 docs/RISK_REGISTER.md:60 OK
section: 1.4 Conservation holes found
claim: - **Destroying a stratum deletes its matter.** A destroyed stratum becomes air (`DEUS_Levels.js:1700-1702`). Its debris is only named in the `levels:strataDestroyed` event (`:1720-1722`); "no item drops in 19A" (`:1001-1002`). This is a LIFE-001 hole (`docs/RISK_REGISTER.md:60`) that §16 closes.
    60  | `LIFE-001` | Physical Matter Leakage in Lifecycle | Simulation | Matter silently deleted or leaked when constructions collapse, erode, or naturalize. | `CRITICAL` | Breaks mass-conservation; world hollows out over cent

### C138 ADR:201 game/js/plugins/DEUS_Colonists.js:648-670 OK
section: 1.4 Conservation holes found
claim: - a barter-credit ledger (`DEUS_Colonists.js:648-670`);
   648  // Internal Barter & Credit Ledger
   649  // Producers (woodcutters, miners, farmers) earn credit delivering raw materials,
   650  // specialists craft finished tools/gear, and colonists trade within the settlement.
      ...
   669  ledger.credits -= amount;
   670  ledger.spent = (ledger.spent || 0) + amount;

### C139 ADR:204 game/js/plugins/DEUS_Factions.js:594-625 OK
section: 1.4 Conservation holes found
claim: - **Faction counters depend on removal events.** Faction population goes up and down on unit events, including `world:unitRemoved` (`DEUS_Factions.js:594-625`). This constrains LOD absorption (§7.7).
   594  UF.Events.on("factions:born", child => {
   595  if (child && child.data && child.data.faction && !child.data._popCounted) {
   596  child.data._popCounted = true;
      ...
   624  }
   625  });

### C140 ADR:206 game/js/plugins/DEUS_Core.js:448-468 OK
section: 1.4 Conservation holes found
claim: - the clock's sub-minute `_timer` (the save holds hour..year only, `DEUS_Core.js:448-468`);
   448  DataManager.makeSaveContents = function() {
   449  const contents = _DataManager_makeSaveContents.call(this);
   450  contents.deusTime = {
      ...
   467  return contents;
   468  };

### C141 ADR:207 game/js/plugins/DEUS_Fluid.js:846-866 OK
section: 1.4 Conservation holes found
claim: - the Fluid queue order (cells are woken again in record order, `DEUS_Fluid.js:846-866`);
   846  extractSaveContents(saved) {
   847  this.reset();
   848  if (!saved) return;
      ...
   865  }
   866  },

### C142 ADR:208 game/js/plugins/DEUS_World.js:2915 OK
section: 1.4 Conservation holes found
claim: - unit path plans (dropped on load, `DEUS_World.js:2915`);
  2915  clearPaths(true); // plans are runtime only: a loaded game plans again

### C143 ADR:209 game/js/plugins/DEUS_TimeSpeed.js:54 OK
section: 1.4 Conservation holes found
claim: - TimeSpeed timers, which are closures held in a Map (`DEUS_TimeSpeed.js:54`, `:84-95`).
    54  const timers = new Map(); // id -> { due, fn, every }

### C144 ADR:209 game/js/plugins/DEUS_TimeSpeed.js:84-95 (bare, file from 0 line(s) back) OK
section: 1.4 Conservation holes found
claim: - TimeSpeed timers, which are closures held in a Map (`DEUS_TimeSpeed.js:54`, `:84-95`).
    84  after(frames, fn) {
    85  const id = nextId++;
    86  timers.set(id, { due: ticks + Math.max(1, frames | 0), fn, every: 0 });
      ...
    94  return id;
    95  },

### C145 ADR:214 game/js/plugins/DEUS_World.js:187-211 OK
section: 1.5 What exists to build on
claim: - `hash32` (FNV-1a) and `mulberry32` (`DEUS_World.js:187-211`);
   187  function hash32(...parts) {
   188  let h = 2166136261 >>> 0;
   189  for (const part of parts) {
      ...
   210  };
   211  }

### C146 ADR:215 game/js/plugins/DEUS_World.js:545-548 (bare, file from 1 line(s) back) OK
section: 1.5 What exists to build on
claim: - `World.rngFor(ax, ay, salt)` (`:545-548`);
   545  World.rngFor = function(ax, ay, salt = 0) {
   546  const s = typeof salt === "string" ? hashString(salt) : salt;
   547  return mulberry32(hash32(this.state.seed, ax, ay, s));
   548  };

### C147 ADR:216 game/js/plugins/DEUS_World.js:556 (bare, file from 2 line(s) back) OK
section: 1.5 What exists to build on
claim: - the generator rule "never Math.random" (`:556`).
   556  * Generators must be deterministic: use ctx.rng / UF.World.rngFor / hashes of coordinates only, never Math.random.

### C148 ADR:218 game/js/plugins/DEUS_World.js:429 OK
section: 1.5 What exists to build on
claim: - units (`nextUnitId`, `DEUS_World.js:429`, `:1133`);
   429  nextUnitId: 1,

### C149 ADR:218 game/js/plugins/DEUS_World.js:1133 (bare, file from 0 line(s) back) OK
section: 1.5 What exists to build on
claim: - units (`nextUnitId`, `DEUS_World.js:429`, `:1133`);
  1133  const id = st.nextUnitId++;

### C150 ADR:219 game/js/plugins/DEUS_Items.js:304 OK
section: 1.5 What exists to build on
claim: - items (`DEUS_Items.js:304`);
   304  const item = { id: st.nextId++, type: t.id, count: Math.max(1, count | 0), area: null, x: 0, y: 0, z: 0, holder: null, container: null };

### C151 ADR:220 game/js/plugins/DEUS_Jobs.js:101-107 OK
section: 1.5 What exists to build on
claim: - jobs (`DEUS_Jobs.js:101-107`);
   101  // State: UF.World.state.jobs = { nextId, list: [job] }
   102  
   103  function jobState() {
   104  const W = World();
   105  if (!W || !W.state) return null;
   106  if (!W.state.jobs) W.state.jobs = { nextId: 1, list: [] };
   107  return W.state.jobs;

### C152 ADR:221 game/js/plugins/DEUS_Fire.js:214 OK
section: 1.5 What exists to build on
claim: - fires (`DEUS_Fire.js:214`).
   214  f = W.state.fire = { version: PROVENANCE_VERSION, beat: 0, nextFireId: 1, burning: {}, fires: {}, sources: {}, wet: {} };

### C153 ADR:222 game/js/plugins/DEUS_Fluid.js:50-58 OK
section: 1.5 What exists to build on
claim: - **Integer fluid.** Depth is 0..7, packed in `Uint8Array` grids (`DEUS_Fluid.js:50-58`, `:127-137`). A dirty-queue stepper runs against a work budget (`:55`, `:356-376`).
    50  const DEPTH_MAX = 7;
    51  const TYPE_NONE = 0;
    52  const TYPE_WATER = 1;
      ...
    57  const Z_MAX = 2;
    58  const Z_LEVELS = 5; // -2, -1, 0, 1, 2

### C154 ADR:222 game/js/plugins/DEUS_Fluid.js:127-137 (bare, file from 0 line(s) back) OK
section: 1.5 What exists to build on
claim: - **Integer fluid.** Depth is 0..7, packed in `Uint8Array` grids (`DEUS_Fluid.js:50-58`, `:127-137`). A dirty-queue stepper runs against a work budget (`:55`, `:356-376`).
   127  function getDepth(byteVal) {
   128  return byteVal & 0x07;
   129  }
      ...
   136  return ((type & 0x0F) << 4) | (depth & 0x07);
   137  }

### C155 ADR:222 game/js/plugins/DEUS_Fluid.js:55 (bare, file from 0 line(s) back) OK
section: 1.5 What exists to build on
claim: - **Integer fluid.** Depth is 0..7, packed in `Uint8Array` grids (`DEUS_Fluid.js:50-58`, `:127-137`). A dirty-queue stepper runs against a work budget (`:55`, `:356-376`).
    55  const DEFAULT_BUDGET = 512;

### C156 ADR:222 game/js/plugins/DEUS_Fluid.js:356-376 (bare, file from 0 line(s) back) OK
section: 1.5 What exists to build on
claim: - **Integer fluid.** Depth is 0..7, packed in `Uint8Array` grids (`DEUS_Fluid.js:50-58`, `:127-137`). A dirty-queue stepper runs against a work budget (`:55`, `:356-376`).
   356  function stepArea(ax, ay, budget) {
   357  const data = getAreaData(ax, ay);
   358  const queue = data.queue;
      ...
   375  
   376  while (data.head < limit) {

### C157 ADR:225 tools/test_liquid_depth_simulation.js:121-125 OK
section: 1.5 What exists to build on
claim: - DEUS_Fluid runs alone in a vm (`tools/test_liquid_depth_simulation.js:121-125`) and exports `module.exports` (`DEUS_Fluid.js:1025-1026`).
   121  vm.createContext(sandbox);
   122  
   123  // Load DEUS_Fluid
   124  const fluidCode = fs.readFileSync(path.join(PLUGINS, "DEUS_Fluid.js"), "utf8");
   125  vm.runInContext(fluidCode, sandbox, { filename: "DEUS_Fluid.js" });

### C158 ADR:225 game/js/plugins/DEUS_Fluid.js:1025-1026 OK
section: 1.5 What exists to build on
claim: - DEUS_Fluid runs alone in a vm (`tools/test_liquid_depth_simulation.js:121-125`) and exports `module.exports` (`DEUS_Fluid.js:1025-1026`).
  1025  if (typeof module !== "undefined" && module.exports) {
  1026  module.exports = Fluid;

### C159 ADR:226 tools/bench_history_sim.js:13 OK
section: 1.5 What exists to build on
claim: - World, WorldGen, Factions, History and Levels run in a vm with throwing engine stubs and a throwing `Math.random` (`tools/bench_history_sim.js:13`, `:37-122`, `:66-67`). But that tool exits 1 at `ebeec892` (§14.1).
    13  const MODULES = ["World", "WorldGen", "Factions", "History", "Levels"];

### C160 ADR:226 tools/bench_history_sim.js:37-122 @ebeec892 (bare, file from 0 line(s) back) OK
section: 1.5 What exists to build on
claim: - World, WorldGen, Factions, History and Levels run in a vm with throwing engine stubs and a throwing `Math.random` (`tools/bench_history_sim.js:13`, `:37-122`, `:66-67`). But that tool exits 1 at `ebeec892` (§14.1).
    37  function sourceBundle() {
    38  const files = {};
    39  const read = file => (files[file] = fs.readFileSync(path.join(ROOT, file), "utf8"));
      ...
   121  env.UF.Factions.generate(state);
   122  assert(state.factions && state.factions.list.length && env.UF.WorldGen.cellInfo(128, 128), "Missing real factions/terrain");

### C161 ADR:226 tools/bench_history_sim.js:66-67 @ebeec892 (bare, file from 0 line(s) back) OK
section: 1.5 What exists to build on
claim: - World, WorldGen, Factions, History and Levels run in a vm with throwing engine stubs and a throwing `Math.random` (`tools/bench_history_sim.js:13`, `:37-122`, `:66-67`). But that tool exits 1 at `ebeec892` (§14.1).
    66  const math = Object.create(Math);
    67  math.random = () => { throw new Error("Unseeded Math.random in benchmark execution"); };

### C162 ADR:259 game/js/plugins/DEUS_Fog.js:119 OK
section: 2.1 What is sim and what is render
claim: | Fog-of-war display, minimap discovery bitsets, selection, the UI state of plans and zones | render (saved in `deusView`, §11) | They move out of `World.state` (`DEUS_Fog.js:119`, `DEUS_Minimap.js:840-843`, `DEUS_Select.js:321`, `:3411` (a test path), `DEUS_Levels.js:4203-4204`) |
   119  if (window.UF && UF.World && UF.World.state) return (UF.World.state.fog = UF.World.state.fog || {});

### C163 ADR:259 game/js/plugins/DEUS_Minimap.js:840-843 OK
section: 2.1 What is sim and what is render
claim: | Fog-of-war display, minimap discovery bitsets, selection, the UI state of plans and zones | render (saved in `deusView`, §11) | They move out of `World.state` (`DEUS_Fog.js:119`, `DEUS_Minimap.js:840-843`, `DEUS_Select.js:321`, `:3411` (a test path), `DEUS_Levels.js:4203-4204`) |
   840  contents.ufWorld = contents.ufWorld || {};
   841  contents.ufWorld.minimapDiscovery = {};
   842  for (const k in _state.discovery) {
   843  contents.ufWorld.minimapDiscovery[k] = encodeBitset(_state.discovery[k]);

### C164 ADR:259 game/js/plugins/DEUS_Select.js:321 OK
section: 2.1 What is sim and what is render
claim: | Fog-of-war display, minimap discovery bitsets, selection, the UI state of plans and zones | render (saved in `deusView`, §11) | They move out of `World.state` (`DEUS_Fog.js:119`, `DEUS_Minimap.js:840-843`, `DEUS_Select.js:321`, `:3411` (a test path), `DEUS_Levels.js:4203-4204`) |
   321  W.state.select = {

### C165 ADR:259 game/js/plugins/DEUS_Select.js:3411 (bare, file from 0 line(s) back) OK
section: 2.1 What is sim and what is render
claim: | Fog-of-war display, minimap discovery bitsets, selection, the UI state of plans and zones | render (saved in `deusView`, §11) | They move out of `World.state` (`DEUS_Fog.js:119`, `DEUS_Minimap.js:840-843`, `DEUS_Select.js:321`, `:3411` (a test path), `DEUS_Levels.js:4203-4204`) |
  3411  W.state.view = W.state.view || {};

### C166 ADR:259 game/js/plugins/DEUS_Levels.js:4203-4204 OK
section: 2.1 What is sim and what is render
claim: | Fog-of-war display, minimap discovery bitsets, selection, the UI state of plans and zones | render (saved in `deusView`, §11) | They move out of `World.state` (`DEUS_Fog.js:119`, `DEUS_Minimap.js:840-843`, `DEUS_Select.js:321`, `:3411` (a test path), `DEUS_Levels.js:4203-4204`) |
  4203  const st = World().state;
  4204  st.view = { x: this.x, y: this.y, z: p.to };

### C167 ADR:260 game/js/plugins/DEUS_DayNight.js:121-127 OK
section: 2.1 What is sim and what is render
claim: | Screen tone and weather particles | render | Driven from the view, never written by the sim (`DEUS_DayNight.js:121-127`, `DEUS_Environment.js:690-710` today) |
   121  Game_Screen.prototype.update = function() {
   122  _Game_Screen_update.call(this);
   123  if (!DayNight.onWorldMap() || !(SceneManager._scene instanceof Scene_Map)) return;
   124  this._tone = DayNight.toneFor(DayNight.hours(), DayNight.viewZ());
   125  this._toneTarget = this._tone.slice();
   126  this._toneDuration = 0;
   127  };

### C168 ADR:260 game/js/plugins/DEUS_Environment.js:690-710 OK
section: 2.1 What is sim and what is render
claim: | Screen tone and weather particles | render | Driven from the view, never written by the sim (`DEUS_DayNight.js:121-127`, `DEUS_Environment.js:690-710` today) |
   690  if (!W) return;
   691  const lvl = typeof W.viewLevel === "function" ? W.viewLevel() : null;
   692  const z = lvl ? lvl.z : 0;
      ...
   709  $gameScreen.changeWeather(targetType, power, 60);
   710  }

### C169 ADR:290 game/js/plugins/DEUS_World.js:187-211 OK
section: 2.4 Module layout
claim: rng.js (hash32 and mulberry32, ported from DEUS_World.js:187-211; stream derivation)
   187  function hash32(...parts) {
   188  let h = 2166136261 >>> 0;
   189  for (const part of parts) {
      ...
   210  };
   211  }

### C170 ADR:293 game/js/rmmz_core.js:2672 OK
section: 2.4 Module layout
claim: tilecodes.js (a pure port of the RMMZ tile-ID helpers, rmmz_core.js:2672, :2682, :2694, :2726, :2793)
  2672  Tilemap.TILE_ID_A1 = 2048;

### C171 ADR:293 game/js/rmmz_core.js:2682 (bare, file from 0 line(s) back) OK
section: 2.4 Module layout
claim: tilecodes.js (a pure port of the RMMZ tile-ID helpers, rmmz_core.js:2672, :2682, :2694, :2726, :2793)
  2682  Tilemap.isAutotile = function(tileId) {

### C172 ADR:293 game/js/rmmz_core.js:2694 (bare, file from 0 line(s) back) OK
section: 2.4 Module layout
claim: tilecodes.js (a pure port of the RMMZ tile-ID helpers, rmmz_core.js:2672, :2682, :2694, :2726, :2793)
  2694  Tilemap.makeAutotileId = function(kind, shape) {

### C173 ADR:293 game/js/rmmz_core.js:2726 (bare, file from 0 line(s) back) OK
section: 2.4 Module layout
claim: tilecodes.js (a pure port of the RMMZ tile-ID helpers, rmmz_core.js:2672, :2682, :2694, :2726, :2793)
  2726  Tilemap.isWaterTile = function(tileId) {

### C174 ADR:293 game/js/rmmz_core.js:2793 (bare, file from 0 line(s) back) OK
section: 2.4 Module layout
claim: tilecodes.js (a pure port of the RMMZ tile-ID helpers, rmmz_core.js:2672, :2682, :2694, :2726, :2793)
  2793  Tilemap.FLOOR_AUTOTILE_TABLE = [

### C175 ADR:318 tools/bench_history_sim.js:66-67 OK
section: 2.5 How NW.js and node both load the core
claim: - **Node (tools, tests):** `readSource = fs.readFileSync`. `compile` = `vm.runInContext` inside a context that contains only the allowed built-ins, with `Math.random` replaced by a throwing function. This is how `tools/bench_history_sim.js:66-67` already blocks `Math.random`.
    66  const math = Object.create(Math);
    67  math.random = () => { throw new Error("Unseeded Math.random in benchmark execution"); };

### C176 ADR:319 game/js/plugins/DEUS_Core.js:98 OK
section: 2.5 How NW.js and node both load the core
claim: - **NW.js (game):** `DEUS_SimHost.js` gets `loader.js` through NW.js's `require` (the same mechanism `DEUS_Core.js:98` already uses). It passes `readSource` from `fs` and a `compile` built on `Function("module", "exports", "require", src)`, so the core objects live in the page's JS realm. PIXI never has to handle typed arrays from another realm.
    98  require(p);

### C177 ADR:336 docs/INVARIANT_REGISTRY.md:52 OK
section: 2.6 Keeping the `UF.*` facades stable during migration
claim: 2. **Two clocks.** During the hybrid period, legacy systems still run on `Game_Map.update` in the *engine-frame* time domain (60 × speed per second). Core systems run in the *sim-tick* domain (10 × speed per second). INV-SIM-02 (`docs/INVARIANT_REGISTRY.md:52`) requires every timer to name its domain. The determinism guarantees in §3.10 and §10 cover the core alone, not the hybrid.
    52  | **INV-SIM-02** | **Explicit Multi-Domain Time** | Every timer and scheduled event must declare its explicit domain: `action`, `historical`, `presentation`, or `engine`. No ambiguous naked tick counters. | `DEUS_Core.js

### C178 ADR:361 docs/ARCHITECTURE.md:18 OK
section: 3.1 Tick rate: 10 Hz, one tick = 100 ms of 1x game-time
claim: - **20 Hz** (`docs/ARCHITECTURE.md:18`) doubles the cost and still doesn't make 16- or 10-frame cadences integral.
    18  | **TIME** | `UF_Time.js`, `UF_TimeSpeed.js` | Multi-domain clocks: Engine (20 Hz computation), Tactical Action (6s d20 round), Historical (1s = 2h aging), Presentation (60m solar cycle). Pause enforcement. |

### C179 ADR:366 game/js/plugins/DEUS_Core.js:60-61 OK
section: 3.2 Calendar
claim: - One tick is **36 game-seconds**. The Owner's scale is 1 real minute = 6 game hours (`DEUS_Core.js:60-61`), so:
    60  // 240 real seconds / 1440 game minutes = 1/6 real seconds per game minute (10 frames at 60 FPS).
    61  const timeSpeed = params["TimeSpeed"] && params["TimeSpeed"] !== "1.0" ? parseFloat(params["TimeSpeed"]) : (1.0 / 6.0);

### C180 ADR:376 game/js/plugins/DEUS_Core.js:321-325 OK
section: 3.2 Calendar
claim: - The calendar rules themselves (months, seasons, the current year-per-day rule at `DEUS_Core.js:321-325`) are not changed by this ADR. They are ported as they are. Q12 is about the conflicting year definition.
   321  while (this.hour >= 24) {
   322  this.hour -= 24;
   323  this.day++;
   324  this.year++; // 1 day/night cycle per year
   325  this.onDayPass();

### C181 ADR:382 game/js/plugins/DEUS_World.js:136 OK
section: 3.3 Converting today's cadences
claim: | Unit step | 16 | `DEUS_World.js:136` | speed 375 milli-cells per tick (3.75 cells/s, the same as today) |
   136  unitStepFrames: Math.max(1, num("UnitStepFrames", 16))

### C182 ADR:383 game/js/plugins/DEUS_World.js:140 OK
section: 3.3 Converting today's cadences
claim: | Stuck limit | 300 | `DEUS_World.js:140` | 50 |
   140  const STUCK_LIMIT = 300; // frames a unit on screen may fail to move before its goal is dropped

### C183 ADR:384 game/js/plugins/DEUS_Ecology.js:996 OK
section: 3.3 Converting today's cadences
claim: | Ecology beat | 60 | `DEUS_Ecology.js:996` | 10 |
   996  if (_beatFrame >= 60) {

### C184 ADR:385 game/js/plugins/DEUS_Fire.js:138-140 OK
section: 3.3 Converting today's cadences
claim: | Fire beat (default) | 60 | `DEUS_Fire.js:138-140` | 10 |
   138  const beatFrames = () => {
   139  return (conf() && conf().beatFrames) || 60;
   140  };

### C185 ADR:386 game/js/plugins/DEUS_Environment.js:52 OK
section: 3.3 Converting today's cadences
claim: | Environment step | 60 | `DEUS_Environment.js:52` | 10 |
    52  const TICKS_PER_STEP = 60; // 1 beat / 1 game second

### C186 ADR:387 game/js/plugins/DEUS_Colonists.js:48 OK
section: 3.3 Converting today's cadences
claim: | Needs / sweep | 60 / 30 | `DEUS_Colonists.js:48`, `:63` | 10 / 5 |
    48  const NEEDS_EVERY = 60;         // ticks per needs tick (one game minute)

### C187 ADR:387 game/js/plugins/DEUS_Colonists.js:63 (bare, file from 0 line(s) back) OK
section: 3.3 Converting today's cadences
claim: | Needs / sweep | 60 / 30 | `DEUS_Colonists.js:48`, `:63` | 10 / 5 |
    63  const SWEEP_EVERY = 30;         // ticks between sweeps of the colonist list for idle workers

### C188 ADR:388 game/js/plugins/DEUS_Factions.js:631-632 OK
section: 3.3 Converting today's cadences
claim: | Faction contact | 120 | `DEUS_Factions.js:631-632` | 20 |
   631  const CONTACT_CELLS = 12;
   632  const CONTACT_EVERY = 120; // frames (2 s at x1)

### C189 ADR:389 game/js/plugins/DEUS_NaturalConnections.js:512 OK
section: 3.3 Converting today's cadences
claim: | NaturalConnections | 30 | `DEUS_NaturalConnections.js:512` | 5 |
   512  if (Graphics.frameCount % 30 === 0) {

### C190 ADR:390 game/js/plugins/DEUS_Projects.js:38 OK
section: 3.3 Converting today's cadences
claim: | Projects cycle | 3000 | `DEUS_Projects.js:38` | 500 |
    38  cadenceTicks: 3000,      // map updates between full cycles (~50 s at 60 updates/s); domain "action"

### C191 ADR:391 game/js/plugins/DEUS_Fluid.js:55 OK
section: 3.3 Converting today's cadences
claim: | Fluid budget | 512 cells per call | `DEUS_Fluid.js:55`, `:1016-1019` | 3072 cells per tick (same throughput) |
    55  const DEFAULT_BUDGET = 512;

### C192 ADR:391 game/js/plugins/DEUS_Fluid.js:1016-1019 (bare, file from 0 line(s) back) OK
section: 3.3 Converting today's cadences
claim: | Fluid budget | 512 cells per call | `DEUS_Fluid.js:55`, `:1016-1019` | 3072 cells per tick (same throughput) |
  1016  Game_Map.prototype.update = function(sceneActive) {
  1017  _Game_Map_update.call(this, sceneActive);
  1018  Fluid.tick();
  1019  };

### C193 ADR:392 game/js/plugins/DEUS_Core.js:60-62 OK
section: 3.3 Converting today's cadences
claim: | Calendar minute | 10 | `DEUS_Core.js:60-62`, `:304-311` | derived: `tick × 36 s` |
    60  // 240 real seconds / 1440 game minutes = 1/6 real seconds per game minute (10 frames at 60 FPS).
    61  const timeSpeed = params["TimeSpeed"] && params["TimeSpeed"] !== "1.0" ? parseFloat(params["TimeSpeed"]) : (1.0 / 6.0);
    62  const startHour = parseInt(params["StartHour"] || 8, 10);

### C194 ADR:392 game/js/plugins/DEUS_Core.js:304-311 (bare, file from 0 line(s) back) OK
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

### C195 ADR:400 game/js/plugins/DEUS_TimeSpeed.js:158-173 OK
section: 3.4 The accumulator (host, once per displayed frame)
claim: - TimeSpeed replaces `SceneManager.update` without calling the function it captured (`DEUS_TimeSpeed.js:158-173`). So SimHost must load **after** TimeSpeed in `plugins.js` and wrap whichever function is current.
   158  const _SceneManager_update = SceneManager.update;
   159  SceneManager.update = function(deltaTime) {
   160  try {
      ...
   172  }
   173  };

### C196 ADR:423 game/js/plugins/DEUS_TimeSpeed.js:46-47 OK
section: 3.5 Speeds
claim: - **16x and 32x.** Today they are forced into the list (`DEUS_TimeSpeed.js:46-47`). They stay "best effort": if the guard in §3.7 caps them, the HUD shows the effective rate. Whether to keep them is Q3.
    46  if (!speedList.includes(16)) speedList.push(16);
    47  if (!speedList.includes(32)) speedList.push(32);

### C197 ADR:424 game/js/plugins/DEUS_TimeSpeed.js:147-153 OK
section: 3.5 Speeds
claim: - **Removing the repeat hack.** The `determineRepeatNumber` × speed hack (`DEUS_TimeSpeed.js:147-153`) and the sub-tick split (`:155-185`, `:231-241`) are removed *when the last legacy sim system has migrated* (§8, Increment 4.last). From then on, RMMZ updates presentation once per frame and the speed exists only in the accumulator.
   147  const _determineRepeatNumber = SceneManager.determineRepeatNumber;
   148  SceneManager.determineRepeatNumber = function(deltaTime) {
   149  const n = _determineRepeatNumber.call(this, deltaTime);
   150  const scene = this._scene;
   151  const running = scene instanceof Scene_Map && scene.isActive() && !paused && !$gameMessage.isBusy() && !$gamePlayer.isTransferring();
   152  return running ? n * SPEEDS[index] : n;
   153  };

### C198 ADR:424 game/js/plugins/DEUS_TimeSpeed.js:155-185 (bare, file from 0 line(s) back) OK
section: 3.5 Speeds
claim: - **Removing the repeat hack.** The `determineRepeatNumber` × speed hack (`DEUS_TimeSpeed.js:147-153`) and the sub-tick split (`:155-185`, `:231-241`) are removed *when the last legacy sim system has migrated* (§8, Increment 4.last). From then on, RMMZ updates presentation once per frame and the speed exists only in the accumulator.
   155  let currentSubTick = 0;
   156  let totalSubTicks = 1;
   157  
      ...
   184  _SceneManager_updateEffekseer.call(this);
   185  };

### C199 ADR:424 game/js/plugins/DEUS_TimeSpeed.js:231-241 (bare, file from 0 line(s) back) OK
section: 3.5 Speeds
claim: - **Removing the repeat hack.** The `determineRepeatNumber` × speed hack (`DEUS_TimeSpeed.js:147-153`) and the sub-tick split (`:155-185`, `:231-241`) are removed *when the last legacy sim system has migrated* (§8, Increment 4.last). From then on, RMMZ updates presentation once per frame and the speed exists only in the accumulator.
   231  const _Scene_Map_update = Scene_Map.prototype.update;
   232  Scene_Map.prototype.update = function() {
   233  if (SPEEDS[index] > 1 && totalSubTicks > 1 && currentSubTick < totalSubTicks - 1) {
      ...
   240  return;
   241  }

### C200 ADR:473 game/js/plugins/DEUS_World.js:1709-1710 OK
section: 3.9 Render interpolation and the movement model
claim: - A step costs 1000 when straight and 1400 when diagonal. That is exactly the 5:7 octile ratio the current A* planner uses (`DEUS_World.js:1709-1710`, "octile costs (5 straight, 7 diagonal)").
  1709  // A* over an area's whole grid, 8-way (VISION V3; 4-way with UF_Movement8D's FourWay), octile costs (5 straight,
  1710  // 7 diagonal), binary heap, typed arrays allocated once and stamped per search. A diagonal step is planned only when

### C201 ADR:499 game/js/plugins/DEUS_Fluid.js:184 OK
section: 4.1 `SimView`: versioned, read-only, no copying
claim: - **Revision counters.** `view.rev(layer, ax, ay, z)` returns an integer that goes up on every change to that layer on that level. Fluid already keeps one (`data.revision`, `DEUS_Fluid.js:184`, `:671`). Renderers skip work while it is unchanged.
   184  revision: 1

### C202 ADR:499 game/js/plugins/DEUS_Fluid.js:671 (bare, file from 0 line(s) back) OK
section: 4.1 `SimView`: versioned, read-only, no copying
claim: - **Revision counters.** `view.rev(layer, ax, ay, z)` returns an integer that goes up on every change to that layer on that level. Fluid already keeps one (`data.revision`, `DEUS_Fluid.js:184`, `:671`). Renderers skip work while it is unchanged.
   671  data.revision++;

### C203 ADR:517 game/js/plugins/DEUS_World.js:613 OK
section: 4.2 Layers per (area, z)
claim: | `object` | object type per cell (the `Uint16Array` grid, today `ufObjects`, `DEUS_World.js:613`) | seed + `objectDiffs` |
   613  const objects = new Uint16Array(cells);

### C204 ADR:545 game/js/plugins/DEUS_Core.js:256-272 OK
section: 4.3 Change feed: preallocated and allocation-free
claim: - Today every listener call on a `world:*` event is timed and written to a log with `appendFileSync` (`DEUS_Core.js:256-272`, `:268`), and `world:unitMoved` fires on every unit step (`DEUS_World.js:1418-1420`). The translated path must not keep that per-event file write (§9).
   256  },
   257  emit(event, ...args) {
   258  if (!this._listeners[event]) return;
      ...
   271  }
   272  }

### C205 ADR:545 game/js/plugins/DEUS_Core.js:268 (bare, file from 0 line(s) back) OK
section: 4.3 Change feed: preallocated and allocation-free
claim: - Today every listener call on a `world:*` event is timed and written to a log with `appendFileSync` (`DEUS_Core.js:256-272`, `:268`), and `world:unitMoved` fires on every unit step (`DEUS_World.js:1418-1420`). The translated path must not keep that per-event file write (§9).
   268  require('fs').appendFileSync('game_runtime.log', `${new Date().toISOString()} [EVENT ${event}] #${i} (${name}) took ${dur.toFixed(1)}ms\n`);

### C206 ADR:545 game/js/plugins/DEUS_World.js:1418-1420 OK
section: 4.3 Change feed: preallocated and allocation-free
claim: - Today every listener call on a `world:*` event is timed and written to a log with `appendFileSync` (`DEUS_Core.js:256-272`, `:268`), and `world:unitMoved` fires on every unit step (`DEUS_World.js:1418-1420`). The translated path must not keep that per-event file write (§9).
  1418  function notifyMoved(u, fx, fy) {
  1419  if (u.x !== fx || u.y !== fy) emit("world:unitMoved", u, { x: fx, y: fy }, { x: u.x, y: u.y });
  1420  }

### C207 ADR:596 game/js/plugins/DEUS_Environment.js:88 OK
section: 4.5 What each render plugin reads today, and the writes to remove
claim: | DEUS_Look | `eventsXy`, `J.of`, `O.at`, `Env.*` (`:166-367`) | all, read only | `Environment.weather` creates state lazily on a read (`DEUS_Environment.js:88`, `:120`) → the sim creates it on the tick |
    88  W.state.environment = {

### C208 ADR:596 game/js/plugins/DEUS_Environment.js:120 (bare, file from 0 line(s) back) OK
section: 4.5 What each render plugin reads today, and the writes to remove
claim: | DEUS_Look | `eventsXy`, `J.of`, `O.at`, `Env.*` (`:166-367`) | all, read only | `Environment.weather` creates state lazily on a read (`DEUS_Environment.js:88`, `:120`) → the sim creates it on the tick |
   120  if (st && st.weatherByArea) st.weatherByArea[areaKey(area)] = w;

### C209 ADR:602 game/js/plugins/DEUS_World.js:535-539 OK
section: 4.6 RMMZ map builds are projections (links to Lane N)
claim: - It adds one requirement for SIM.00.03: the viewed level becomes a host variable that the core never reads. Today the view level *is* `$gameMap.mapId()` (`DEUS_World.js:535-539`).
   535  World.viewLevel = () => {
   536  if (!window.$gameMap || !World.state) return null;
   537  const id = $gameMap.mapId();
   538  if (viewMemo.id !== id || viewMemo.state !== World.state) viewMemo = { id, state: World.state, level: Object.freeze(World.levelOfMapId(id)) };
   539  return viewMemo.level;

### C210 ADR:611 docs/OWNER_DECISIONS.md:171-187 @0c1baf8d OK
section: 5.1 The region grid
claim: - Bands are those of DEC-013, recorded on `main` at `0c1baf8d` (`docs/OWNER_DECISIONS.md:171-187`): Lower-2 (−4, −3), Lower-1 (−2, −1), Surface (0), Upper-1 (+1, +2), Upper-2 (+3, +4).
   171  ### Decision `DEC-013`: Nine Z Layers, Nine Races, One Home Layer per Race, and Five Biome Bands
   172  - **Date Logged:** 2026-09-26
   173  - **Status:** `DECIDED` (Owner ruling 00:34 & 00:37 CT, directive 0021-V)
      ...
   186  - **Open Sub-Questions (with PM defaults):**
   187  - **Z-Range Coordinate Mapping:** Default `-4..+4` (surface = 0, four underground layers `-1..-4`, four upper layers `+1..+4`). Status: `OPEN` (PM default).

### C211 ADR:612 game/js/plugins/DEUS_World.js:155 OK
section: 5.1 The region grid
claim: - With today's 5 levels (−2..+2, `DEUS_World.js:155`) three bands exist: Lower-1, Surface and Upper-1. After WG.00.17 raises the range to 9 levels, all five exist.
   155  const LEVELS = Object.freeze([-2, -1, 0, 1, 2]);

### C212 ADR:618 game/js/plugins/DEUS_Minimap.js:56-58 OK
section: 5.1 The region grid
claim: 1. **They align with the minimap.** The minimap chunk is 16×16 (`DEUS_Minimap.js:56-58`), so one region is exactly 2×2 chunks.
    56  const CHUNK_SIZE = 16;
    57  const CHUNKS_PER_ROW = 16; // 256 / 16
    58  const TOTAL_CHUNKS = 256;

### C213 ADR:621 game/js/plugins/DEUS_Camera.js:35-51 OK
section: 5.1 The region grid
claim: - Zoom is locked at 1.0 (`DEUS_Camera.js:35-51`).
    35  levels: [1],
    36  officialScale: 1.0,
    37  calibratorVisible: false,
      ...
    50  
    51  zoomOut: () => false,

### C214 ADR:707 game/js/plugins/DEUS_Ecology.js:214 OK
section: 6. Summary Simulation
claim: | **Wildlife and monsters** (anonymous) | unit records; herd membership lives on the unit (`u.data.herd`, `DEUS_Ecology.js:214`, `:672-678`) | **buckets** `count[species][ageBand][sex]` (`Uint16`) per region; herd records `{herdId, species, lastBirth, members per bucket}` keep today's fields (`:722`) | Ecology's hourly births and caps (`tickHour`, `:888-920`) applied to counts; migration between adjacent L2 regions by a deterministic rule; every change goes through the ledger |
   214  for (const u of W.units()) if (u.data && u.data.kind === "creature") maxHerd = Math.max(maxHerd, u.data.herd | 0);

### C215 ADR:707 game/js/plugins/DEUS_Ecology.js:672-678 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Wildlife and monsters** (anonymous) | unit records; herd membership lives on the unit (`u.data.herd`, `DEUS_Ecology.js:214`, `:672-678`) | **buckets** `count[species][ageBand][sex]` (`Uint16`) per region; herd records `{herdId, species, lastBirth, members per bucket}` keep today's fields (`:722`) | Ecology's hourly births and caps (`tickHour`, `:888-920`) applied to counts; migration between adjacent L2 regions by a deterministic rule; every change goes through the ledger |
   672  const units = W.unitsInArea(area.x, area.y).filter(u => u.data && u.data.kind === "creature");
   673  const herds = new Map();
   674  for (const u of units) {
   675  const hId = u.data.herd | 0;
   676  if (!herds.has(hId)) herds.set(hId, []);
   677  herds.get(hId).push(u);
   678  }

### C216 ADR:707 game/js/plugins/DEUS_Ecology.js:722 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Wildlife and monsters** (anonymous) | unit records; herd membership lives on the unit (`u.data.herd`, `DEUS_Ecology.js:214`, `:672-678`) | **buckets** `count[species][ageBand][sex]` (`Uint16`) per region; herd records `{herdId, species, lastBirth, members per bucket}` keep today's fields (`:722`) | Ecology's hourly births and caps (`tickHour`, `:888-920`) applied to counts; migration between adjacent L2 regions by a deterministic rule; every change goes through the ledger |
   722  st.herds[hId] = Object.assign(st.herds[hId] || {}, { lastBirth: at, species: sp.id });

### C217 ADR:707 game/js/plugins/DEUS_Ecology.js:888-920 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Wildlife and monsters** (anonymous) | unit records; herd membership lives on the unit (`u.data.herd`, `DEUS_Ecology.js:214`, `:672-678`) | **buckets** `count[species][ageBand][sex]` (`Uint16`) per region; herd records `{herdId, species, lastBirth, members per bucket}` keep today's fields (`:722`) | Ecology's hourly births and caps (`tickHour`, `:888-920`) applied to counts; migration between adjacent L2 regions by a deterministic rule; every change goes through the ledger |
   888  function tickHour(hour) {
   889  const O = Objects(), W = World(), st = state();
   890  const at = Number.isFinite(hour) ? hour : (O && O.hourNow ? O.hourNow() : 0);
      ...
   919  return result;
   920  }

### C218 ADR:708 game/js/plugins/DEUS_Ecology.js:127 OK
section: 6. Summary Simulation
claim: | **Flora and resources** | object grid (seed + `objectDiffs`); sprouts and regrowth records (`blankState`, `DEUS_Ecology.js:127`) | **no summary needed**: objects stay seed + diffs; sprout and regrowth records stay records; a derived per-region count per object type is kept for statistics | sprouts mature by beat count (today's rule, `:772-796`); the ore sprouts (`:736-752`) are Q7 |
   127  function blankState() {

### C219 ADR:708 game/js/plugins/DEUS_Ecology.js:772-796 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Flora and resources** | object grid (seed + `objectDiffs`); sprouts and regrowth records (`blankState`, `DEUS_Ecology.js:127`) | **no summary needed**: objects stay seed + diffs; sprout and regrowth records stay records; a derived per-region count per object type is kept for statistics | sprouts mature by beat count (today's rule, `:772-796`); the ore sprouts (`:736-752`) are Q7 |
   772  for (let i = st.sprouts.length - 1; i >= 0; i--) {
   773  const s = st.sprouts[i];
   774  if (currentBeat >= s.matureBeat) {
      ...
   795  }
   796  }

### C220 ADR:708 game/js/plugins/DEUS_Ecology.js:736-752 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Flora and resources** | object grid (seed + `objectDiffs`); sprouts and regrowth records (`blankState`, `DEUS_Ecology.js:127`) | **no summary needed**: objects stay seed + diffs; sprout and regrowth records stay records; a derived per-region count per object type is kept for statistics | sprouts mature by beat count (today's rule, `:772-796`); the ore sprouts (`:736-752`) are Q7 |
   736  const SPROUT_DEFS = {
   737  0: [
   738  { sprout: "sapling", matures: ["oak", "pine", "birch", "fruit_tree"], weights: [5, 2, 2, 1], delay: 120 },
      ...
   751  ]
   752  };

### C221 ADR:709 game/js/plugins/DEUS_Fluid.js:127-137 OK
section: 6. Summary Simulation
claim: | **Fluids** | packed depth grid (`DEUS_Fluid.js:127-137`); a dirty queue *per region* | **the fine cells are kept but frozen.** A region's grid is at most 2 levels × 32 × 32 = 2,048 bytes, and none at all for a uniform chunk (§15.3), so dropping it would save nothing. What L2 drops is per-tick stepping. A derived **basin index** sits on top: 4-connected *wet* cells of one fluid type per z (types never mix, `:457`), each basin with its volume, free capacity, drain faces to z−1, and faces to neighbouring regions. It is rebuilt from the cells, so it isn't saved (§10.7) | drain through drain face
   127  function getDepth(byteVal) {
   128  return byteVal & 0x07;
   129  }
      ...
   136  return ((type & 0x0F) << 4) | (depth & 0x07);
   137  }

### C222 ADR:709 game/js/plugins/DEUS_Fluid.js:457 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Fluids** | packed depth grid (`DEUS_Fluid.js:127-137`); a dirty queue *per region* | **the fine cells are kept but frozen.** A region's grid is at most 2 levels × 32 × 32 = 2,048 bytes, and none at all for a uniform chunk (§15.3), so dropping it would save nothing. What L2 drops is per-tick stepping. A derived **basin index** sits on top: 4-connected *wet* cells of one fluid type per z (types never mix, `:457`), each basin with its volume, free capacity, drain faces to z−1, and faces to neighbouring regions. It is rebuilt from the cells, so it isn't saved (§10.7) | drain through drain face
   457  // Liquid types must match or neighbor must be dry (no mixing in V1)

### C223 ADR:710 game/js/plugins/DEUS_Fire.js:214 OK
section: 6. Summary Simulation
claim: | **Fire** | `W.state.fire.burning` records, integer fuel (`DEUS_Fire.js:214`, `:389`) | **none**: a burning cell is a focus source, so its region is at least L0/L1; demotion waits until no cell burns | — |
   214  f = W.state.fire = { version: PROVENANCE_VERSION, beat: 0, nextFireId: 1, burning: {}, fires: {}, sources: {}, wet: {} };

### C224 ADR:710 game/js/plugins/DEUS_Fire.js:389 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Fire** | `W.state.fire.burning` records, integer fuel (`DEUS_Fire.js:214`, `:389`) | **none**: a burning cell is a focus source, so its region is at least L0/L1; demotion waits until no cell burns | — |
   389  f.burning[key] = { since: f.beat, fuel: Math.max(1, Math.round(num(rule.burn, 1))), obj: type.id, fireId: provenance.fireId, parent: o.parent ? o.parent.key : null, provenance };

### C225 ADR:711 game/js/plugins/DEUS_World.js:595-640 OK
section: 6. Summary Simulation
claim: | **Geology and terrain** | strata and shapes (Levels) from seed + diffs | **none**: resident in chunk storage at every level (§15.3). A new game or a load builds it from seed + diffs, as today's builds do (`DEUS_World.js:595-640`, `:811-822`) | changes only through mutation: mining, building, collapse (§16), decay (§17) |
   595  /**
   596  * Build the $dataMap object of an area's level (z left out = the ground) in memory. Pure: doesn't touch the
   597  * current map. Only the generators registered for that level run; the start template is ground-only.
      ...
   639  setObject(x, y, type) {
   640  if (x >= 0 && y >= 0 && x < size && y < size) objects[y * size + x] = type;

### C226 ADR:711 game/js/plugins/DEUS_World.js:811-822 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Geology and terrain** | strata and shapes (Levels) from seed + diffs | **none**: resident in chunk storage at every level (§15.3). A new game or a load builds it from seed + diffs, as today's builds do (`DEUS_World.js:595-640`, `:811-822`) | changes only through mutation: mining, building, collapse (§16), decay (§17) |
   811  World.peekArea = function(ax, ay, z = 0) {
   812  if (!this.state || !this.inWorld(ax, ay, z)) return null;
   813  const key = cacheKey(ax, ay, z);
      ...
   821  return map;
   822  };

### C227 ADR:712 game/js/plugins/DEUS_History.js:363-410 OK
section: 6. Summary Simulation
claim: | **History** | aggregate already: sites, people, dynasties (`History.generate`, `DEUS_History.js:363-410`, which calls `D.step` once per year, `:390-395`; `step` is at `DEUS_HistoricalDemographics.js:468`) | L2-native. It runs at world creation, and nothing steps it during play (the demographics header says "No listeners, automatic generation, live units, terrain edits, or save hooks", `DEUS_HistoricalDemographics.js:8-9`) | §14 |
   363  History.generate = function(world, opts = {}) {
   364  const state = world && world.state ? world.state : world;
   365  const cfg = this.config();
      ...
   409  });
   410  };

### C228 ADR:712 game/js/plugins/DEUS_History.js:390-395 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **History** | aggregate already: sites, people, dynasties (`History.generate`, `DEUS_History.js:363-410`, which calls `D.step` once per year, `:390-395`; `step` is at `DEUS_HistoricalDemographics.js:468`) | L2-native. It runs at world creation, and nothing steps it during play (the demographics header says "No listeners, automatic generation, live units, terrain edits, or save hooks", `DEUS_HistoricalDemographics.js:8-9`) | §14 |
   390  for (let year = 0; year < steps; year++) {
   391  D.step(demographics);
   392  if (typeof opts.onCheckpoint === "function") opts.onCheckpoint({ ...demographics,
   393  living: demographics.people.filter(p => p.died === null).map(p => p.id),
   394  graveyard: demographics.people.filter(p => p.died !== null).map(p => p.id) });
   395  }

### C229 ADR:712 game/js/plugins/DEUS_HistoricalDemographics.js:468 OK
section: 6. Summary Simulation
claim: | **History** | aggregate already: sites, people, dynasties (`History.generate`, `DEUS_History.js:363-410`, which calls `D.step` once per year, `:390-395`; `step` is at `DEUS_HistoricalDemographics.js:468`) | L2-native. It runs at world creation, and nothing steps it during play (the demographics header says "No listeners, automatic generation, live units, terrain edits, or save hooks", `DEUS_HistoricalDemographics.js:8-9`) | §14 |
   468  function step(state, conditions = {}) {

### C230 ADR:712 game/js/plugins/DEUS_HistoricalDemographics.js:8-9 OK
section: 6. Summary Simulation
claim: | **History** | aggregate already: sites, people, dynasties (`History.generate`, `DEUS_History.js:363-410`, which calls `D.step` once per year, `:390-395`; `step` is at `DEUS_HistoricalDemographics.js:468`) | L2-native. It runs at world creation, and nothing steps it during play (the demographics header says "No listeners, automatic generation, live units, terrain edits, or save hooks", `DEUS_HistoricalDemographics.js:8-9`) | §14 |
     8  * HIST-01/minimum HIST-02/HIST-09. No listeners, automatic generation, live units,
     9  * terrain edits, or save hooks. create(world, options) imports canonical

### C231 ADR:713 game/js/plugins/DEUS_Jobs.js:101-107 OK
section: 6. Summary Simulation
claim: | **Jobs and projects** | records (`W.state.jobs`, `DEUS_Jobs.js:101-107`; projects, `DEUS_Projects.js:179-189`) | records unchanged. Jobs with an assigned worker are focus sources (L0). Unassigned jobs need no stepping | non-player factions' jobs (future) accrue abstract work per coarse tick |
   101  // State: UF.World.state.jobs = { nextId, list: [job] }
   102  
   103  function jobState() {
   104  const W = World();
   105  if (!W || !W.state) return null;
   106  if (!W.state.jobs) W.state.jobs = { nextId: 1, list: [] };
   107  return W.state.jobs;

### C232 ADR:713 game/js/plugins/DEUS_Projects.js:179-189 OK
section: 6. Summary Simulation
claim: | **Jobs and projects** | records (`W.state.jobs`, `DEUS_Jobs.js:101-107`; projects, `DEUS_Projects.js:179-189`) | records unchanged. Jobs with an assigned worker are focus sources (L0). Unassigned jobs need no stepping | non-player factions' jobs (future) accrue abstract work per coarse tick |
   179  // State: UF.World.state.colony.projects = { version, nextId, list: [project] }
   180  
   181  function colony() {
      ...
   188  if (!c.projects && create) c.projects = { version: 1, nextId: 1, list: [] };
   189  return c.projects || null;

### C233 ADR:714 game/js/plugins/DEUS_Items.js:304 OK
section: 6. Summary Simulation
claim: | **Items and containers** | records with integer `count` (`DEUS_Items.js:304`) | **records unchanged**: never aggregated, and they need no stepping at rest | — |
   304  const item = { id: st.nextId++, type: t.id, count: Math.max(1, count | 0), area: null, x: 0, y: 0, z: 0, holder: null, container: null };

### C234 ADR:715 game/js/plugins/DEUS_Environment.js:88 OK
section: 6. Summary Simulation
claim: | **Environment** | weather per area (`DEUS_Environment.js:88`, `:120`); thermal state per unit | ambient temperature is a boundary condition, derived from season and biome, not a stock; unit thermal stays with the (tracked) unit | re-derived |
    88  W.state.environment = {

### C235 ADR:715 game/js/plugins/DEUS_Environment.js:120 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Environment** | weather per area (`DEUS_Environment.js:88`, `:120`); thermal state per unit | ambient temperature is a boundary condition, derived from season and biome, not a stock; unit thermal stays with the (tracked) unit | re-derived |
   120  if (st && st.weatherByArea) st.weatherByArea[areaKey(area)] = w;

### C236 ADR:716 game/js/plugins/DEUS_Factions.js:656-660 OK
section: 6. Summary Simulation
claim: | **Factions** | contact checks (`DEUS_Factions.js:656-660`); integer population counters (`:194`, `:594-625`) | contact between tracked units in the same L2 region is resolved at the coarse tick; counters must equal tracked + bucket members (§7.8) | co-location test |
   656  const _Game_Map_update = Game_Map.prototype.update;
   657  Game_Map.prototype.update = function(sceneActive) {
   658  _Game_Map_update.call(this, sceneActive);
   659  if (++contactFrame % CONTACT_EVERY === 0) Factions.checkContact();
   660  };

### C237 ADR:716 game/js/plugins/DEUS_Factions.js:194 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Factions** | contact checks (`DEUS_Factions.js:656-660`); integer population counters (`:194`, `:594-625`) | contact between tracked units in the same L2 region is resolved at the coarse tick; counters must equal tracked + bucket members (§7.8) | co-location test |
   194  population: founders // every faction starts as its founders (VISION V4, 2026-09-19)

### C238 ADR:716 game/js/plugins/DEUS_Factions.js:594-625 (bare, file from 0 line(s) back) OK
section: 6. Summary Simulation
claim: | **Factions** | contact checks (`DEUS_Factions.js:656-660`); integer population counters (`:194`, `:594-625`) | contact between tracked units in the same L2 region is resolved at the coarse tick; counters must equal tracked + bucket members (§7.8) | co-location test |
   594  UF.Events.on("factions:born", child => {
   595  if (child && child.data && child.data.faction && !child.data._popCounted) {
   596  child.data._popCounted = true;
      ...
   624  }
   625  });

### C239 ADR:739 game/js/plugins/DEUS_World.js:187-211 OK
section: 7.2 Deterministic seeding
claim: - **Stream.** Every expansion uses `rng = mulberry32(hash32(seed, STREAM_LOD, ax, ay, ri, epoch))`, the existing primitives (`DEUS_World.js:187-211`).
   187  function hash32(...parts) {
   188  let h = 2166136261 >>> 0;
   189  for (const part of parts) {
      ...
   210  };
   211  }

### C240 ADR:753 game/js/plugins/DEUS_Fluid.js:517-532 OK
section: 7.3 Promotion (L2 → L1)
claim: - The region's inflow buffer (§7.7) is released into its border cells in canonical order, up to each cell's capacity (0..7, `fluidCapacityAt`, `DEUS_Fluid.js:517-532`).
   517  fluidCapacityAt(a, b, c, d, e) {
   518  parseCoords(a, b, c, d, e);
   519  if (qZ < Z_MIN || qZ > Z_MAX) return 0;
      ...
   531  return DEPTH_MAX;
   532  },

### C241 ADR:754 game/js/plugins/DEUS_Fluid.js:896-923 OK
section: 7.3 Promotion (L2 → L1)
claim: - If a cell holds more than its capacity, for example because a wall was built while the region was L2, the excess is displaced the way Fluid's reconciliation does it (`DEUS_Fluid.js:896-923`). But an excess that finds no room is kept in the region's **reservoir counter** instead of being dropped. It is never deleted, and it is placed again at the next coarse tick.
   896  // Displace excess fluid into open neighbor or cell above to preserve mass conservation
   897  if (excess > 0) {
   898  if (z < Z_MAX) {
      ...
   922  }
   923  }

### C242 ADR:759 game/js/plugins/DEUS_Ecology.js:463-470 OK
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

### C243 ADR:778 game/js/plugins/DEUS_World.js:1133 OK
section: 7.4 Demotion (L1 → L2)
claim: - the record is deleted and its ID *retired*, with reason `ABSORBED`. `nextUnitId` never reuses an ID (`DEUS_World.js:1133`).
  1133  const id = st.nextUnitId++;

### C244 ADR:779 game/js/plugins/DEUS_Factions.js:594-625 OK
section: 7.4 Demotion (L1 → L2)
claim: - Absorption **does not emit `world:unitRemoved`**. That event would lower faction population counters (`DEUS_Factions.js:594-625`). The feed carries `UNIT_REMOVED` with cause `LOD_ABSORB` instead, and the legacy translation (§4.3) maps it to no legacy event.
   594  UF.Events.on("factions:born", child => {
   595  if (child && child.data && child.data.faction && !child.data._popCounted) {
   596  child.data._popCounted = true;
      ...
   624  }
   625  });

### C245 ADR:786 docs/systems/UF_History.md:102 OK
section: 7.5 Tracked units and named persons
claim: - it has `data.historicalPersonId` (`docs/systems/UF_History.md:102`);
   102  1. **Historical subject identity.** Resolve a selected citizen through `data.historicalPersonId`, then use History's canonical records. Add a historical-person subject to the existing Sheet Record view so ancestors can b

### C246 ADR:790 game/js/plugins/DEUS_World.js:1136-1137 OK
section: 7.5 Tracked units and named persons
claim: - it carries items or equipment (`data.inventory`, `data.equipment`, `DEUS_World.js:1136-1137`);
  1136  if (!data.equipment) data.equipment = {};
  1137  if (!data.inventory) data.inventory = [];

### C247 ADR:801 game/js/plugins/DEUS_World.js:1739 OK
section: 7.6 In-flight jobs and paths
claim: - **Path plans become saved data** (§10.7): `{goal, cells: Int32Array, i, legs}`. Today they live only in the runtime `pathCache` (`DEUS_World.js:1739`), and loading drops them (`:2915`).
  1739  const pathCache = new Map();   // unit id -> { key, cells: Int32Array, i, end, partial, legs, wait, fails, avoid, stale }

### C248 ADR:801 game/js/plugins/DEUS_World.js:2915 (bare, file from 0 line(s) back) OK
section: 7.6 In-flight jobs and paths
claim: - **Path plans become saved data** (§10.7): `{goal, cells: Int32Array, i, legs}`. Today they live only in the runtime `pathCache` (`DEUS_World.js:1739`), and loading drops them (`:2915`).
  2915  clearPaths(true); // plans are runtime only: a loaded game plans again

### C249 ADR:826 game/js/plugins/DEUS_Fluid.js:9-18 OK
section: 7.8 Conserved quantities
claim: | Q-WATER | water volume | depth unit (1/7 of a full cell, `DEUS_Fluid.js:9-18`, `:52`) | low 3 bits of a `Uint8` per cell at every level (L2 keeps the cells, frozen), plus the `Uint32` reservoir and inflow buffers per region |
     9  * @help
    10  * DEUS_Fluid.js - 0..7 Volumetric Fluid Simulation
    11  *
      ...
    17  *    - 5-6: Deep (impassable without swimming)
    18  *    - 7: Submerged / Full (impassable without swimming)

### C250 ADR:826 game/js/plugins/DEUS_Fluid.js:52 (bare, file from 0 line(s) back) OK
section: 7.8 Conserved quantities
claim: | Q-WATER | water volume | depth unit (1/7 of a full cell, `DEUS_Fluid.js:9-18`, `:52`) | low 3 bits of a `Uint8` per cell at every level (L2 keeps the cells, frozen), plus the `Uint32` reservoir and inflow buffers per region |
    52  const TYPE_WATER = 1;

### C251 ADR:832 game/js/plugins/DEUS_Items.js:304 OK
section: 7.8 Conserved quantities
claim: | Q-ITEM[type, material] | items | count | integer `count` (`DEUS_Items.js:304`) |
   304  const item = { id: st.nextId++, type: t.id, count: Math.max(1, count | 0), area: null, x: 0, y: 0, z: 0, holder: null, container: null };

### C252 ADR:835 game/js/plugins/DEUS_Fire.js:389 OK
section: 7.8 Conserved quantities
claim: | Q-FUEL | burning fuel | fuel units | integer per burning cell (`DEUS_Fire.js:389`) |
   389  f.burning[key] = { since: f.beat, fuel: Math.max(1, Math.round(num(rule.burn, 1))), obj: type.id, fireId: provenance.fireId, parent: o.parent ? o.parent.key : null, provenance };

### C253 ADR:836 game/js/plugins/DEUS_Colonists.js:1548 OK
section: 7.8 Conserved quantities
claim: | Q-FOOD, Q-DRINK | nourishment held by units | milli-units | today `foodLb` / `waterGal` are floats rounded to 0.001 (`DEUS_Colonists.js:1548`); the needs sub-lane converts them to integer milli-units |
  1548  n = u.data.needs = { model: NEEDS_MODEL, day: dayKey(), foodLb: 0, waterGal: 0, daysWithoutFood: 0, exhaustion: 0, fromNeeds: 0, lastRestDay: null };

### C254 ADR:849 docs/RISK_REGISTER.md:61 OK
section: 7.8 Conserved quantities
claim: - **LIFE-002.** No transform may output an *ore* form (`docs/RISK_REGISTER.md:61`). Oxidised metal becomes a trace-mineral sediment form. A test fails any transform table entry whose output is an ore material.
    61  | `LIFE-002` | Accidental Finite Resource Respawning | Simulation / Economy | Naturalization or pedogenesis accidentally fabricating fresh metal ore veins (Fe, Cu, Ag, Au, Pt). | `CRITICAL` | Destroys economic scarcity; 

### C255 ADR:886 game/js/plugins/DEUS_Core.js:321-325 OK
section: 7.9 Ledger checks and tolerances
claim: | Run length | "100 game years" as the calendar defines them when SIM.30.05 starts (Q12). Today's code has 1 year = 1 game day = 2,400 ticks (`DEUS_Core.js:321-325`), which gives 240,000 ticks |
   321  while (this.hour >= 24) {
   322  this.hour -= 24;
   323  this.day++;
   324  this.year++; // 1 day/night cycle per year
   325  this.onDayPass();

### C256 ADR:899 game/js/plugins/DEUS_Sheet.js:833-846 OK
section: 8. Migration Increments
claim: | **3** | SIM.00.04 | Units, paths and movement in the core (§3.9); `Game_Event` becomes a puppet; one movement model; path plans saved; D&D stats assigned at unit creation (removes the `DEUS_Sheet.js:833-846` write) | the DoD 1-4 list, with DoD 1 run headless and goals given as commands (Jobs is still legacy then); a default-speed unit covers 3.75 ±0.1 cells per real second at 1x on a straight corridor (today's rate both on and off screen at speed 4, §1.3); a speed-modified unit moves at the same rate watched or not | revert; flag `sim.systems.units = "legacy"` for one increment |
   833  const Dnd = window.UF && UF.Dnd5e;
   834  let dnd = d.dnd || null;
   835  if (!dnd && Dnd && typeof Dnd.assignClass === "function") {
      ...
   845  d.savingThrows = dnd.savingThrows;
   846  }

### C257 ADR:900 game/js/plugins/DEUS_Anim.js:1504-1522 OK
section: 8. Migration Increments
claim: | **4.1…4.n** | SIM.00.05/`<system>` | One system per sub-lane, in dependency order: **terrain (the Levels strata writer, World diffs and objects; chunked storage §15.3) → fluid → natural connections → fire → environment → ecology → needs → jobs → projects → combat (with the Anim death lifecycle, `DEUS_Anim.js:1504-1522`, `:1605-1631`) → factions contact → ownership (`DEUS_Ownership.js:613`) → timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`)**. The last sub-lane removes the TimeSpeed repeat hack (§3.5). Terrain, ownership, timers and the Anim lifecycle are not in the WBS SIM.00.05 list (Q2). Ter
  1504  let lastBeat = -1;
  1505  const _Game_Map_update = Game_Map.prototype.update;
  1506  Game_Map.prototype.update = function(sceneActive) {
      ...
  1521  }
  1522  }

### C258 ADR:900 game/js/plugins/DEUS_Anim.js:1605-1631 (bare, file from 0 line(s) back) OK
section: 8. Migration Increments
claim: | **4.1…4.n** | SIM.00.05/`<system>` | One system per sub-lane, in dependency order: **terrain (the Levels strata writer, World diffs and objects; chunked storage §15.3) → fluid → natural connections → fire → environment → ecology → needs → jobs → projects → combat (with the Anim death lifecycle, `DEUS_Anim.js:1504-1522`, `:1605-1631`) → factions contact → ownership (`DEUS_Ownership.js:613`) → timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`)**. The last sub-lane removes the TimeSpeed repeat hack (§3.5). Terrain, ownership, timers and the Anim lifecycle are not in the WBS SIM.00.05 list (Q2). Ter
  1605  if (C && typeof C.onUnitDeath === "function" && !isWrap(C.onUnitDeath)) {
  1606  const orig = C.onUnitDeath;
  1607  C.onUnitDeath = markWrap(function(victim) {
      ...
  1630  }
  1631  }, orig);

### C259 ADR:900 game/js/plugins/DEUS_Ownership.js:613 OK
section: 8. Migration Increments
claim: | **4.1…4.n** | SIM.00.05/`<system>` | One system per sub-lane, in dependency order: **terrain (the Levels strata writer, World diffs and objects; chunked storage §15.3) → fluid → natural connections → fire → environment → ecology → needs → jobs → projects → combat (with the Anim death lifecycle, `DEUS_Anim.js:1504-1522`, `:1605-1631`) → factions contact → ownership (`DEUS_Ownership.js:613`) → timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`)**. The last sub-lane removes the TimeSpeed repeat hack (§3.5). Terrain, ownership, timers and the Anim lifecycle are not in the WBS SIM.00.05 list (Q2). Ter
   613  Game_Map.prototype.update = function(sceneActive) {

### C260 ADR:900 game/js/plugins/DEUS_TimeSpeed.js:84-95 OK
section: 8. Migration Increments
claim: | **4.1…4.n** | SIM.00.05/`<system>` | One system per sub-lane, in dependency order: **terrain (the Levels strata writer, World diffs and objects; chunked storage §15.3) → fluid → natural connections → fire → environment → ecology → needs → jobs → projects → combat (with the Anim death lifecycle, `DEUS_Anim.js:1504-1522`, `:1605-1631`) → factions contact → ownership (`DEUS_Ownership.js:613`) → timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`)**. The last sub-lane removes the TimeSpeed repeat hack (§3.5). Terrain, ownership, timers and the Anim lifecycle are not in the WBS SIM.00.05 list (Q2). Ter
    84  after(frames, fn) {
    85  const id = nextId++;
    86  timers.set(id, { due: ticks + Math.max(1, frames | 0), fn, every: 0 });
      ...
    94  return id;
    95  },

### C261 ADR:900 game/js/plugins/DEUS_TimeSpeed.js:188-203 (bare, file from 0 line(s) back) OK
section: 8. Migration Increments
claim: | **4.1…4.n** | SIM.00.05/`<system>` | One system per sub-lane, in dependency order: **terrain (the Levels strata writer, World diffs and objects; chunked storage §15.3) → fluid → natural connections → fire → environment → ecology → needs → jobs → projects → combat (with the Anim death lifecycle, `DEUS_Anim.js:1504-1522`, `:1605-1631`) → factions contact → ownership (`DEUS_Ownership.js:613`) → timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`)**. The last sub-lane removes the TimeSpeed repeat hack (§3.5). Terrain, ownership, timers and the Anim lifecycle are not in the WBS SIM.00.05 list (Q2). Ter
   188  const _Game_Map_update = Game_Map.prototype.update;
   189  Game_Map.prototype.update = function(sceneActive) {
   190  _Game_Map_update.call(this, sceneActive);
      ...
   202  }
   203  };

### C262 ADR:907 docs/worldgen/DEUS_WORLDGEN_WBS.md:105 @0c1baf8d OK
section: 8. Migration Increments
claim: | **Z** | WG.00.17 (WBS Rev 19, `docs/worldgen/DEUS_WORLDGEN_WBS.md:105` at `0c1baf8d`) | Z range as one setting, then 9 levels. It lands on the legacy plugins after Lanes K and N, as Rev 19 says. The core reads the range from world state from Increment 1 on (§15.2), so it needs no change of its own | WG.00.17's DoD; the core fixtures run at −2..+2 and at −4..+4 | WG.00.17's own |
   105  | **WG.00.17** | Z-Range Configurable Setting & Expansion to 9 Layers | Claude | Make Z-range a single configurable setting in engine core, then expand from 5 to 9 layers (-4..+4: surface 0, four underground -1..-4, four

### C263 ADR:908 docs/worldgen/DEUS_WORLDGEN_WBS.md:525-528 @0c1baf8d (bare, file from 1 line(s) back) OK
section: 8. Migration Increments
claim: | **S1** | SIM.40.01–.04 (`:525-528` at `0c1baf8d`) | Support model, collapse, colonist behaviour, collapse QA (§16), in the core. Depends on SIM.00.05/terrain and WG.00.17 | §16.6 | revert; support stays passive (no collapse), as today |
   525  | SIM.40.01 | **Support model design** (materials, vertical propagation, span limits, V128 natural rock, V133 change-driven). Specification of load-bearing rules and span capacities | PLANNED | Directive 0021-V §6; V137;
   526  | SIM.40.02 | **Collapse event simulation** (downward cascading, rubble/talus mass conservation LIFE-001, V95 impact damage, deep-history DEC-012) | PLANNED | Directive 0021-V §6; V137; LIFE-001; V95 | dep: SIM.40.01 | C
   527  | SIM.40.03 | **Colonist structural behaviour** (props, pillars, avoid dangerous excavation) | PLANNED | Directive 0021-V §6; V137 | dep: SIM.40.02 | Claude → Grok | Colonist builders and miners respect structural suppor
   528  | SIM.40.04 | **Collapse QA & fixtures** (deterministic cave-in, tall tower +1..+4, mass conservation, perf bound) | PLANNED | Directive 0021-V §6; V137 | dep: SIM.40.02 | Claude → Grok (mutation) | Automated test suite:

### C264 ADR:909 docs/worldgen/DEUS_WORLDGEN_WBS.md:529-533 @0c1baf8d (bare, file from 2 line(s) back) OK
section: 8. Migration Increments
claim: | **S2** | SIM.40.05–.09 (`:529-533` at `0c1baf8d`) | Decay, reclamation, item weathering, deep-history decay, decay QA (§17), in the core. SIM.40.08 depends on SIM.30.02 | §17.6 | revert; nothing decays, as today |
   529  | SIM.40.05 | **Decay model** (unmaintained structure HP loss by material/exposure, roofs fail first, walls fail, feeds collapse) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | SIM.40.01, dep: SIM.00.01 | Claude → Gro
   530  | SIM.40.06 | **Nature reclaiming** (vegetation invasion, soil/sediment burial, visible stages: intact -> weathered -> overgrown -> collapsed -> buried mound) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | dep: SIM.40
   531  | SIM.40.07 | **Item weathering & burial** (rot, rust, sediment burial, durable relics, LIFE-001 mass conservation, LIFE-002 no ore creation) | PLANNED | Directive 0021-V §7; V138; LIFE-001; LIFE-002 | dep: SIM.40.05 | C
   532  | SIM.40.08 | **Deep-history decay integration** (summary-level decay for fast-forward, LIFE-003 trace retention) | PLANNED | Directive 0021-V §7; V138; DEC-012; LIFE-003 | SIM.40.05, dep: SIM.30.02 | Claude → Grok | Dee
   533  | SIM.40.09 | **Decay QA & fixtures** (deterministic aging fixture, mass conservation, no ore creation, perf bound) | PLANNED | Directive 0021-V §7; V138 | SIM.40.06, SIM.40.07, dep: SIM.40.08 | Claude → Grok (mutation) 

### C265 ADR:914 docs/worldgen/DEUS_WORLDGEN_WBS.md:609 (bare, file from 7 line(s) back) OK
section: 8. Migration Increments
claim: - WG.61.01/.02 are written against the core after SIM.00.03 (WBS `:609`).
   609  

### C266 ADR:946 game/js/plugins/DEUS_Core.js:264-270 OK
section: 9. Performance Budgets
claim: - **The logging path.** The legacy `UF.Events` bridge must not keep the per-listener synchronous log write on `world:*` events (`DEUS_Core.js:264-270`). Its cost must show up in `view.read_ms` if it stays.
   264  if (dur > 20 || (typeof event === "string" && event.startsWith("world:"))) {
   265  const name = cb.name || `anon_${i}`;
   266  if (typeof require !== 'undefined') {
   267  try {
   268  require('fs').appendFileSync('game_runtime.log', `${new Date().toISOString()} [EVENT ${event}] #${i} (${name}) took ${dur.toFixed(1)}ms\n`);
   269  } catch (_) {}
   270  }

### C267 ADR:958 game/js/plugins/DEUS_World.js:411 OK
section: 10.1 Random numbers
claim: | `World.newWorld` seed pick (`DEUS_World.js:411`, `:418`) | sim | moves to the host. The host picks the seed, passes it to `createSim`, and records it in the save and the command log |
   411  s = Math.floor(Math.random() * 0x7ffffffe) + 1;

### C268 ADR:958 game/js/plugins/DEUS_World.js:418 (bare, file from 0 line(s) back) OK
section: 10.1 Random numbers
claim: | `World.newWorld` seed pick (`DEUS_World.js:411`, `:418`) | sim | moves to the host. The host picks the seed, passes it to `createSim`, and records it in the save and the command log |
   418  s = Math.floor(Math.random() * 0x7ffffffe) + 1;

### C269 ADR:959 game/js/plugins/DEUS_Dnd5e.js:415 OK
section: 10.1 Random numbers
claim: | `DEUS_Dnd5e.js:415`, `:720`, `:800` fall back to `Math.random` when no `rng` is passed | sim | the core wrapper always passes a stream, and the lint fails any call from the core without one |
   415  let r = (typeof rng === "function" ? rng() : Math.random()) * total;

### C270 ADR:959 game/js/plugins/DEUS_Dnd5e.js:720 (bare, file from 0 line(s) back) OK
section: 10.1 Random numbers
claim: | `DEUS_Dnd5e.js:415`, `:720`, `:800` fall back to `Math.random` when no `rng` is passed | sim | the core wrapper always passes a stream, and the lint fails any call from the core without one |
   720  const rng = typeof opts.rng === "function" ? opts.rng : Math.random;

### C271 ADR:959 game/js/plugins/DEUS_Dnd5e.js:800 (bare, file from 0 line(s) back) OK
section: 10.1 Random numbers
claim: | `DEUS_Dnd5e.js:415`, `:720`, `:800` fall back to `Math.random` when no `rng` is passed | sim | the core wrapper always passes a stream, and the lint fails any call from the core without one |
   800  const rng = typeof opts.rng === "function" ? opts.rng : Math.random;

### C272 ADR:960 game/js/plugins/DEUS_FactionMenus.js:442 OK
section: 10.1 Random numbers
claim: | `DEUS_FactionMenus.js:442`, `:468`, `:478` (New Game seed roll) | presentation | stays, and its seed is passed in |
   442  const rolled = Math.floor(Math.random() * 0x7ffffffe) + 1;

### C273 ADR:960 game/js/plugins/DEUS_FactionMenus.js:468 (bare, file from 0 line(s) back) OK
section: 10.1 Random numbers
claim: | `DEUS_FactionMenus.js:442`, `:468`, `:478` (New Game seed roll) | presentation | stays, and its seed is passed in |
   468  return Math.floor(Math.random() * 0x7ffffffe) + 1;

### C274 ADR:960 game/js/plugins/DEUS_FactionMenus.js:478 (bare, file from 0 line(s) back) OK
section: 10.1 Random numbers
claim: | `DEUS_FactionMenus.js:442`, `:468`, `:478` (New Game seed roll) | presentation | stays, and its seed is passed in |
   478  return Math.floor(Math.random() * 0x7ffffffe) + 1;

### C275 ADR:961 game/js/plugins/DEUS_Visuals.js:151-171 OK
section: 10.1 Random numbers
claim: | `DEUS_Visuals.js:151-171` (barks) | presentation | stays |
   151  this._ufBarkTimer = Math.floor(Math.random() * 300) + 300; // 5-10 seconds
   152  if (this.event() && this.event().note) {
   153  const match = this.event().note.match(/<bark:\s*(.+?)>/i);
      ...
   170  if (dist <= 8) {
   171  const text = this._ufBarkList[Math.floor(Math.random() * this._ufBarkList.length)];

### C276 ADR:965 game/js/plugins/DEUS_Fire.js:575 OK
section: 10.1 Random numbers
claim: - Fire already works this way (`hash01(seed, SALT.escape, b, x, y, d)`, `DEUS_Fire.js:575`).
   575  if (hash01(seed, SALT.escape, b, x, y, d) < info.escapeChance) {

### C277 ADR:966 game/js/plugins/DEUS_World.js:545-548 OK
section: 10.1 Random numbers
claim: - **Batch operations** such as promotion and generation use `mulberry32` seeded by a hash (§7.2), as generators already do (`DEUS_World.js:545-548`, `:556`).
   545  World.rngFor = function(ax, ay, salt = 0) {
   546  const s = typeof salt === "string" ? hashString(salt) : salt;
   547  return mulberry32(hash32(this.state.seed, ax, ay, s));
   548  };

### C278 ADR:966 game/js/plugins/DEUS_World.js:556 (bare, file from 0 line(s) back) OK
section: 10.1 Random numbers
claim: - **Batch operations** such as promotion and generation use `mulberry32` seeded by a hash (§7.2), as generators already do (`DEUS_World.js:545-548`, `:556`).
   556  * Generators must be deterministic: use ctx.rng / UF.World.rngFor / hashes of coordinates only, never Math.random.

### C279 ADR:972 game/js/plugins/DEUS_World.js:800-808 OK
section: 10.2 Order of iteration
claim: - **No reads that depend on a cache.** Today `peekArea`'s LRU (`DEUS_World.js:800-808`) holds builds whose freshness depends on viewing history (`:2819-2820`). In the core, caches are keyed by input revision, and a stale build is never readable.
   800  const buildCache = new Map();
   801  const PEEK_CACHE = 6;
   802  const cacheKey = (ax, ay, z = 0) => (World.state ? `${World.state.seed}:${levelKey(ax, ay, z)}` : "");
      ...
   807  lastUsedKey = key;
   808  while (buildCache.size > PEEK_CACHE) buildCache.delete(buildCache.keys().next().value);

### C280 ADR:972 game/js/plugins/DEUS_World.js:2819-2820 (bare, file from 0 line(s) back) OK
section: 10.2 Order of iteration
claim: - **No reads that depend on a cache.** Today `peekArea`'s LRU (`DEUS_World.js:800-808`) holds builds whose freshness depends on viewing history (`:2819-2820`). In the core, caches are keyed by input revision, and a stale build is never readable.
  2819  // return from another scene) still rebuilds it, as before. Builds made only for off-screen reads are never shown
  2820  // (they may be older than the generators' inputs, e.g. one made during world:created).

### C281 ADR:978 game/js/plugins/DEUS_Fluid.js:733 OK
section: 10.3 Wall clock
claim: - Fluid (`DEUS_Fluid.js:733`, `:747`);
   733  const t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();

### C282 ADR:978 game/js/plugins/DEUS_Fluid.js:747 (bare, file from 0 line(s) back) OK
section: 10.3 Wall clock
claim: - Fluid (`DEUS_Fluid.js:733`, `:747`);
   747  const elapsed = ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - t0;

### C283 ADR:979 game/js/plugins/DEUS_Combat.js:1416-1422 OK
section: 10.3 Wall clock
claim: - Combat perf (`DEUS_Combat.js:1416-1422`);
  1416  const t0 = performance.now();
  1417  try {
  1418  step();
  1419  } catch (e) {
  1420  report("step", e);
  1421  }
  1422  const ms = performance.now() - t0;

### C284 ADR:980 game/js/plugins/DEUS_Ecology.js:68 OK
section: 10.3 Wall clock
claim: - Ecology stats (`DEUS_Ecology.js:68`).
    68  const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

### C285 ADR:982 game/js/plugins/DEUS_Fluid.js:55 OK
section: 10.3 Wall clock
claim: - Every work budget is a count, as with Fluid's 512 cells (`DEUS_Fluid.js:55`), never a time.
    55  const DEFAULT_BUDGET = 512;

### C286 ADR:992 game/js/plugins/DEUS_Ecology.js:442-453 OK
section: 10.4 Floats
claim: - Example: Ecology's `Math.hypot` distance checks (`DEUS_Ecology.js:442-453`) become integer squared distances.
   442  for (const c of camps) if (sameArea(c.area, area) && Math.hypot(x - c.x, y - c.y) < campGap) return `camp ${c.id}`;
   443  for (const s of activeSites()) {
   444  if (!sameArea(s.area, area)) continue;
      ...
   452  const here = W.currentArea();
   453  if (sameArea(here, area) && window.$gamePlayer && Math.hypot(x - $gamePlayer.x, y - $gamePlayer.y) < PLAYER_CLEARANCE) return "player";

### C287 ADR:1025 game/js/plugins/DEUS_World.js:2901-2905 OK
section: 11.1 Today
claim: - `contents.ufWorld = World.state` (`DEUS_World.js:2901-2905`; load `:2907-2916`), a shared bag that many plugins write into. It includes presentation state:
  2901  DataManager.makeSaveContents = function() {
  2902  const contents = _DataManager_makeSaveContents.call(this);
  2903  contents.ufWorld = World.state;
  2904  return contents;
  2905  };

### C288 ADR:1025 game/js/plugins/DEUS_World.js:2907-2916 (bare, file from 0 line(s) back) OK
section: 11.1 Today
claim: - `contents.ufWorld = World.state` (`DEUS_World.js:2901-2905`; load `:2907-2916`), a shared bag that many plugins write into. It includes presentation state:
  2907  const _DataManager_extractSaveContents = DataManager.extractSaveContents;
  2908  DataManager.extractSaveContents = function(contents) {
  2909  _DataManager_extractSaveContents.call(this, contents);
      ...
  2915  clearPaths(true); // plans are runtime only: a loaded game plans again
  2916  };

### C289 ADR:1026 game/js/plugins/DEUS_Anim.js:1075 OK
section: 11.1 Today
claim: - `anim` (`DEUS_Anim.js:1075`)
  1075  if (!a || typeof a !== "object") a = W.state.anim = { remains: [] };

### C290 ADR:1027 game/js/plugins/DEUS_Select.js:321 OK
section: 11.1 Today
claim: - `select` (`DEUS_Select.js:321`)
   321  W.state.select = {

### C291 ADR:1028 game/js/plugins/DEUS_Levels.js:4203-4204 OK
section: 11.1 Today
claim: - `view` (`DEUS_Levels.js:4203-4204`; also a Select test path, `DEUS_Select.js:3411`)
  4203  const st = World().state;
  4204  st.view = { x: this.x, y: this.y, z: p.to };

### C292 ADR:1028 game/js/plugins/DEUS_Select.js:3411 OK
section: 11.1 Today
claim: - `view` (`DEUS_Levels.js:4203-4204`; also a Select test path, `DEUS_Select.js:3411`)
  3411  W.state.view = W.state.view || {};

### C293 ADR:1029 game/js/plugins/DEUS_Fog.js:119 OK
section: 11.1 Today
claim: - `fog` (`DEUS_Fog.js:119`)
   119  if (window.UF && UF.World && UF.World.state) return (UF.World.state.fog = UF.World.state.fog || {});

### C294 ADR:1030 game/js/plugins/DEUS_Minimap.js:840-843 OK
section: 11.1 Today
claim: - `minimapDiscovery` (`DEUS_Minimap.js:840-843`)
   840  contents.ufWorld = contents.ufWorld || {};
   841  contents.ufWorld.minimapDiscovery = {};
   842  for (const k in _state.discovery) {
   843  contents.ufWorld.minimapDiscovery[k] = encodeBitset(_state.discovery[k]);

### C295 ADR:1031 game/js/plugins/DEUS_Fluid.js:821-844 OK
section: 11.1 Today
claim: - `contents.deusFluid` / `ufFluid`, as sparse records `[ax, ay, z, x, y, t, d]` (`DEUS_Fluid.js:821-844`, `:994-1011`).
   821  makeSaveContents() {
   822  const records = [];
   823  for (const [key, data] of areas.entries()) {
      ...
   843  };
   844  },

### C296 ADR:1031 game/js/plugins/DEUS_Fluid.js:994-1011 (bare, file from 0 line(s) back) OK
section: 11.1 Today
claim: - `contents.deusFluid` / `ufFluid`, as sparse records `[ax, ay, z, x, y, t, d]` (`DEUS_Fluid.js:821-844`, `:994-1011`).
   994  if (typeof DataManager !== "undefined") {
   995  const _DataManager_makeSaveContents = DataManager.makeSaveContents;
   996  DataManager.makeSaveContents = function() {
      ...
  1010  };
  1011  }

### C297 ADR:1032 game/js/plugins/DEUS_Core.js:448-468 OK
section: 11.1 Today
claim: - `contents.deusTime` / `ufTime`, holding hour through year without `_timer` (`DEUS_Core.js:448-468`, `:471-490`).
   448  DataManager.makeSaveContents = function() {
   449  const contents = _DataManager_makeSaveContents.call(this);
   450  contents.deusTime = {
      ...
   467  return contents;
   468  };

### C298 ADR:1032 game/js/plugins/DEUS_Core.js:471-490 (bare, file from 0 line(s) back) OK
section: 11.1 Today
claim: - `contents.deusTime` / `ufTime`, holding hour through year without `_timer` (`DEUS_Core.js:448-468`, `:471-490`).
   471  DataManager.extractSaveContents = function(contents) {
   472  _DataManager_extractSaveContents.call(this, contents);
   473  const _tData = contents.deusTime || contents.ufTime;
      ...
   489  }
   490  };

### C299 ADR:1034 game/js/rmmz_managers.js:389 OK
section: 11.1 Today
claim: RMMZ's own contents are saved beside these (`rmmz_managers.js:389`, `:405`). They include `$gameScreen` tone, which DayNight writes.
   389  DataManager.makeSaveContents = function() {

### C300 ADR:1034 game/js/rmmz_managers.js:405 (bare, file from 0 line(s) back) OK
section: 11.1 Today
claim: RMMZ's own contents are saved beside these (`rmmz_managers.js:389`, `:405`). They include `$gameScreen` tone, which DayNight writes.
   405  DataManager.extractSaveContents = function(contents) {

### C301 ADR:1093 game/js/plugins/DEUS_Environment.js:88 OK
section: 12.2 Risks
claim: - **R6. Hidden writes into the sim** through facade reads that create state lazily (`DEUS_Environment.js:88`, `:120`; `DEUS_Items.js:163`). The SIM.00.03 lint must also treat lazily created state as a write.
    88  W.state.environment = {

### C302 ADR:1093 game/js/plugins/DEUS_Environment.js:120 (bare, file from 0 line(s) back) OK
section: 12.2 Risks
claim: - **R6. Hidden writes into the sim** through facade reads that create state lazily (`DEUS_Environment.js:88`, `:120`; `DEUS_Items.js:163`). The SIM.00.03 lint must also treat lazily created state as a write.
   120  if (st && st.weatherByArea) st.weatherByArea[areaKey(area)] = w;

### C303 ADR:1093 game/js/plugins/DEUS_Items.js:163 OK
section: 12.2 Risks
claim: - **R6. Hidden writes into the sim** through facade reads that create state lazily (`DEUS_Environment.js:88`, `:120`; `DEUS_Items.js:163`). The SIM.00.03 lint must also treat lazily created state as a write.
   163  if (!W.state.items) W.state.items = { nextId: 1, byId: {} };

### C304 ADR:1106 game/js/plugins/DEUS_Ownership.js:613 OK
section: 12.3 Open questions
claim: | Q2 | PM | Add to SIM.00.05: terrain (the Levels strata writer, World diffs and objects; first, §8), Ownership (`DEUS_Ownership.js:613`), TimeSpeed timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`), the Anim death lifecycle (`DEUS_Anim.js:1504-1522`, `:1605-1631`)? Households runs on events only | Yes |
   613  Game_Map.prototype.update = function(sceneActive) {

### C305 ADR:1106 game/js/plugins/DEUS_TimeSpeed.js:84-95 OK
section: 12.3 Open questions
claim: | Q2 | PM | Add to SIM.00.05: terrain (the Levels strata writer, World diffs and objects; first, §8), Ownership (`DEUS_Ownership.js:613`), TimeSpeed timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`), the Anim death lifecycle (`DEUS_Anim.js:1504-1522`, `:1605-1631`)? Households runs on events only | Yes |
    84  after(frames, fn) {
    85  const id = nextId++;
    86  timers.set(id, { due: ticks + Math.max(1, frames | 0), fn, every: 0 });
      ...
    94  return id;
    95  },

### C306 ADR:1106 game/js/plugins/DEUS_TimeSpeed.js:188-203 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q2 | PM | Add to SIM.00.05: terrain (the Levels strata writer, World diffs and objects; first, §8), Ownership (`DEUS_Ownership.js:613`), TimeSpeed timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`), the Anim death lifecycle (`DEUS_Anim.js:1504-1522`, `:1605-1631`)? Households runs on events only | Yes |
   188  const _Game_Map_update = Game_Map.prototype.update;
   189  Game_Map.prototype.update = function(sceneActive) {
   190  _Game_Map_update.call(this, sceneActive);
      ...
   202  }
   203  };

### C307 ADR:1106 game/js/plugins/DEUS_Anim.js:1504-1522 OK
section: 12.3 Open questions
claim: | Q2 | PM | Add to SIM.00.05: terrain (the Levels strata writer, World diffs and objects; first, §8), Ownership (`DEUS_Ownership.js:613`), TimeSpeed timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`), the Anim death lifecycle (`DEUS_Anim.js:1504-1522`, `:1605-1631`)? Households runs on events only | Yes |
  1504  let lastBeat = -1;
  1505  const _Game_Map_update = Game_Map.prototype.update;
  1506  Game_Map.prototype.update = function(sceneActive) {
      ...
  1521  }
  1522  }

### C308 ADR:1106 game/js/plugins/DEUS_Anim.js:1605-1631 (bare, file from 0 line(s) back) OK
section: 12.3 Open questions
claim: | Q2 | PM | Add to SIM.00.05: terrain (the Levels strata writer, World diffs and objects; first, §8), Ownership (`DEUS_Ownership.js:613`), TimeSpeed timers (`DEUS_TimeSpeed.js:84-95`, `:188-203`), the Anim death lifecycle (`DEUS_Anim.js:1504-1522`, `:1605-1631`)? Households runs on events only | Yes |
  1605  if (C && typeof C.onUnitDeath === "function" && !isWrap(C.onUnitDeath)) {
  1606  const orig = C.onUnitDeath;
  1607  C.onUnitDeath = markWrap(function(victim) {
      ...
  1630  }
  1631  }, orig);

### C309 ADR:1110 docs/systems/UF_History.md:106 OK
section: 12.3 Open questions
claim: | Q6 | Owner | Deep-history physical traces vs INV-SIM-01 / V134 and `UF_History.md:106` (§14.3) | An "aged world" option; the standard New Game stays at Year 0 |
   106  5. **Physical grave ownership gate.** No burial/inscription instance registry was found in the inspected baseline. Before physical graves are wired into Look, the coordinator must approve an anchor schema and its object/

### C310 ADR:1111 game/js/plugins/DEUS_Ecology.js:736-752 OK
section: 12.3 Open questions
claim: | Q7 | Owner | Ecology ore sprouts (`DEUS_Ecology.js:736-752`) break INV-SIM-03: remove them, or ledger them as an approved source? | Remove the ore outcomes |
   736  const SPROUT_DEFS = {
   737  0: [
   738  { sprout: "sapling", matures: ["oak", "pine", "birch", "fruit_tree"], weights: [5, 2, 2, 1], delay: 120 },
      ...
   751  ]
   752  };

### C311 ADR:1113 docs/ARCHITECTURE.md:18 OK
section: 12.3 Open questions
claim: | Q9 | Coordinator | `docs/ARCHITECTURE.md:18` ("Engine (20 Hz)") contradicts DEC-012. The file is outside Lane M's write set | Update to 10 Hz, citing ADR-003 |
    18  | **TIME** | `UF_Time.js`, `UF_TimeSpeed.js` | Multi-domain clocks: Engine (20 Hz computation), Tactical Action (6s d20 round), Historical (1s = 2h aging), Presentation (60m solar cycle). Pause enforcement. |

### C312 ADR:1116 game/js/plugins/DEUS_Core.js:321-325 OK
section: 12.3 Open questions
claim: | Q12 | Owner/PM | What is a game year? The code has 1 per game day (`DEUS_Core.js:321-325`); `UF_History.md:1161` says over 100 real hours at 1x | The calendar owner settles it before SIM.30.05 |
   321  while (this.hour >= 24) {
   322  this.hour -= 24;
   323  this.day++;
   324  this.year++; // 1 day/night cycle per year
   325  this.onDayPass();

### C313 ADR:1116 docs/systems/UF_History.md:1161 OK
section: 12.3 Open questions
claim: | Q12 | Owner/PM | What is a game year? The code has 1 per game day (`DEUS_Core.js:321-325`); `UF_History.md:1161` says over 100 real hours at 1x | The calendar owner settles it before SIM.30.05 |
  1161  - `currentYear()` counts game-clock years; with Q11 open a year takes over 100 real hours at ×1.

### C314 ADR:1129 game/js/plugins/UF_Core.js:13 OK
section: 13. Engine Exit Path
claim: - `game/js/plugins/` holds 95 files. 41 of the `UF_*.js` files are 16-line shims such as `UF_Core.js:13` `PluginManager.loadScript("DEUS_Core")`.
    13  PluginManager.loadScript("DEUS_Core");

### C315 ADR:1132 game/js/plugins/DEUS_Callings.js:404 OK
section: 13. Engine Exit Path
claim: - `DEUS_Callings.js:404`
   404  module.exports = UF_Callings;

### C316 ADR:1133 game/js/plugins/DEUS_DeathForensics.js:542 OK
section: 13. Engine Exit Path
claim: - `DEUS_DeathForensics.js:542`
   542  module.exports = DeathForensics;

### C317 ADR:1134 game/js/plugins/DEUS_Fluid.js:1026 OK
section: 13. Engine Exit Path
claim: - `DEUS_Fluid.js:1026`
  1026  module.exports = Fluid;

### C318 ADR:1135 game/js/plugins/DEUS_Containers.js:1345 OK
section: 13. Engine Exit Path
claim: - `DEUS_Containers.js:1345`
  1345  module.exports = Containers;

### C319 ADR:1136 game/js/plugins/UF_Households.js:1067 OK
section: 13. Engine Exit Path
claim: - `UF_Households.js:1067`
  1067  module.exports = UF.Households;

### C320 ADR:1142 game/package.json:3 OK
section: 13. Engine Exit Path
claim: | **NW.js runtime** (window, fs, argv) | `game/package.json:3`; `DEUS_Core.js:69`, `:98`, `:134`; `DEUS_FactionMenus.js:455` (`nw.gui`) | keep NW.js; it is not RMMZ | S | low |
     3  "main": "index.html",

### C321 ADR:1142 game/js/plugins/DEUS_Core.js:69 OK
section: 13. Engine Exit Path
claim: | **NW.js runtime** (window, fs, argv) | `game/package.json:3`; `DEUS_Core.js:69`, `:98`, `:134`; `DEUS_FactionMenus.js:455` (`nw.gui`) | keep NW.js; it is not RMMZ | S | low |
    69  const fs = require('fs');

### C322 ADR:1142 game/js/plugins/DEUS_Core.js:98 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **NW.js runtime** (window, fs, argv) | `game/package.json:3`; `DEUS_Core.js:69`, `:98`, `:134`; `DEUS_FactionMenus.js:455` (`nw.gui`) | keep NW.js; it is not RMMZ | S | low |
    98  require(p);

### C323 ADR:1142 game/js/plugins/DEUS_Core.js:134 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **NW.js runtime** (window, fs, argv) | `game/package.json:3`; `DEUS_Core.js:69`, `:98`, `:134`; `DEUS_FactionMenus.js:455` (`nw.gui`) | keep NW.js; it is not RMMZ | S | low |
   134  const nwArgs = (typeof nw !== 'undefined' && nw.App && nw.App.argv) ? nw.App.argv : [];

### C324 ADR:1142 game/js/plugins/DEUS_FactionMenus.js:455 OK
section: 13. Engine Exit Path
claim: | **NW.js runtime** (window, fs, argv) | `game/package.json:3`; `DEUS_Core.js:69`, `:98`, `:134`; `DEUS_FactionMenus.js:455` (`nw.gui`) | keep NW.js; it is not RMMZ | S | low |
   455  const nwGui = require("nw.gui");

### C325 ADR:1143 game/js/rmmz_core.js:471 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | a thin app on PIXI v5, and a `Bitmap` replacement: a canvas plus a texture | M | medium |
   471  function Graphics() {

### C326 ADR:1143 game/js/rmmz_core.js:808 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | a thin app on PIXI v5, and a `Bitmap` replacement: a canvas plus a texture | M | medium |
   808  Graphics._onTick = function(deltaTime) {

### C327 ADR:1143 game/js/rmmz_core.js:1177 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | a thin app on PIXI v5, and a `Bitmap` replacement: a canvas plus a texture | M | medium |
  1177  function Bitmap() {

### C328 ADR:1143 game/js/rmmz_core.js:1851 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | a thin app on PIXI v5, and a `Bitmap` replacement: a canvas plus a texture | M | medium |
  1851  function Sprite() {

### C329 ADR:1143 game/js/plugins/DEUS_Depth.js:219 OK
section: 13. Engine Exit Path
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | a thin app on PIXI v5, and a `Bitmap` replacement: a canvas plus a texture | M | medium |
   219  DepthCanvasLayer.prototype = Object.create(PIXI.Container.prototype);

### C330 ADR:1143 game/js/plugins/DEUS_Depth.js:685 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **PIXI through `rmmz_core`** (`Graphics`, `Bitmap`, `Sprite`; PIXI v5.3.12 in `game/js/libs/`) | `rmmz_core.js` `Graphics` `:471`, `_onTick` `:808`, `Bitmap` `:1177`, `Sprite` `:1851`; `DEUS_Depth.js:219`, `:685`; `new Bitmap(` in 23 plugins | a thin app on PIXI v5, and a `Bitmap` replacement: a canvas plus a texture | M | medium |
   685  const f = this._colorFilter || (this._colorFilter = new PIXI.filters.ColorMatrixFilter());

### C331 ADR:1144 game/js/rmmz_core.js:2185 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3; the *renderer* needs its own tilemap for A1-A4 autotiles | L | high: autotile correctness |
  2185  function Tilemap() {

### C332 ADR:1144 game/js/rmmz_core.js:2672 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3; the *renderer* needs its own tilemap for A1-A4 autotiles | L | high: autotile correctness |
  2672  Tilemap.TILE_ID_A1 = 2048;

### C333 ADR:1144 game/js/rmmz_core.js:2682 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3; the *renderer* needs its own tilemap for A1-A4 autotiles | L | high: autotile correctness |
  2682  Tilemap.isAutotile = function(tileId) {

### C334 ADR:1144 game/js/rmmz_core.js:2694 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3; the *renderer* needs its own tilemap for A1-A4 autotiles | L | high: autotile correctness |
  2694  Tilemap.makeAutotileId = function(kind, shape) {

### C335 ADR:1144 game/js/rmmz_core.js:2726 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3; the *renderer* needs its own tilemap for A1-A4 autotiles | L | high: autotile correctness |
  2726  Tilemap.isWaterTile = function(tileId) {

### C336 ADR:1144 game/js/rmmz_core.js:2793 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **Tilemap** (autotile rendering, tile-ID encoding) | `rmmz_core.js` `Tilemap` `:2185`; statics `TILE_ID_A1` `:2672`, `isAutotile` `:2682`, `makeAutotileId` `:2694`, `isWaterTile` `:2726`, `FLOOR_AUTOTILE_TABLE` `:2793`; `Tilemap.*` helpers in 16 plugins | the tile-ID *encoding* moves to `sim/world/tilecodes.js` at Inc 1-3; the *renderer* needs its own tilemap for A1-A4 autotiles | L | high: autotile correctness |
  2793  Tilemap.FLOOR_AUTOTILE_TABLE = [

### C337 ADR:1145 game/js/rmmz_scenes.js:747 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **Scene / Spriteset / Sprite_Character** | `rmmz_scenes.js` `Scene_Map` `:747`; `rmmz_sprites.js` `Spriteset_Map` `:3345`; `Scene_Map.prototype.*` overridden in 20 plugins, `Spriteset_Map.prototype.*` in 18, `Scene_Boot.start` in 39 | own scene graph and boot sequence | L | medium |
   747  function Scene_Map() {

### C338 ADR:1145 game/js/rmmz_sprites.js:3345 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **Scene / Spriteset / Sprite_Character** | `rmmz_scenes.js` `Scene_Map` `:747`; `rmmz_sprites.js` `Spriteset_Map` `:3345`; `Scene_Map.prototype.*` overridden in 20 plugins, `Spriteset_Map.prototype.*` in 18, `Scene_Boot.start` in 39 | own scene graph and boot sequence | L | medium |
  3345  function Spriteset_Map() {

### C339 ADR:1146 game/js/rmmz_core.js:5652 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **Input** (`Input`, `TouchInput`, `keyMapper`) | `rmmz_core.js` `:5652`, `:6021`; 18 plugins; private `_currentState` read ×73 | small input module (keys, mouse, wheel) | M | low |
  5652  function Input() {

### C340 ADR:1146 game/js/rmmz_core.js:6021 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **Input** (`Input`, `TouchInput`, `keyMapper`) | `rmmz_core.js` `:5652`, `:6021`; 18 plugins; private `_currentState` read ×73 | small input module (keys, mouse, wheel) | M | low |
  6021  function TouchInput() {

### C341 ADR:1147 game/js/rmmz_managers.js:1103 OK
section: 13. Engine Exit Path
claim: | **Audio** (`AudioManager`, `SoundManager`) | `rmmz_managers.js:1103`, `:1491`; 8 plugins | WebAudio wrapper | S | low |
  1103  function AudioManager() {

### C342 ADR:1147 game/js/rmmz_managers.js:1491 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **Audio** (`AudioManager`, `SoundManager`) | `rmmz_managers.js:1103`, `:1491`; 8 plugins | WebAudio wrapper | S | low |
  1491  function SoundManager() {

### C343 ADR:1148 game/js/rmmz_managers.js:345 OK
section: 13. Engine Exit Path
claim: | **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | `deusSim` + `deusView` written with `fs` (§11) | S (after Inc 5) | low |
   345  DataManager.saveGame = function(savefileId) {

### C344 ADR:1148 game/js/rmmz_managers.js:389 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | `deusSim` + `deusView` written with `fs` (§11) | S (after Inc 5) | low |
   389  DataManager.makeSaveContents = function() {

### C345 ADR:1148 game/js/rmmz_managers.js:405 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | `deusSim` + `deusView` written with `fs` (§11) | S (after Inc 5) | low |
   405  DataManager.extractSaveContents = function(contents) {

### C346 ADR:1148 game/js/rmmz_managers.js:538 (bare, file from 0 line(s) back) OK
section: 13. Engine Exit Path
claim: | **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | `deusSim` + `deusView` written with `fs` (§11) | S (after Inc 5) | low |
   538  function StorageManager() {

### C347 ADR:1148 game/js/rmmz_core.js:6416 OK
section: 13. Engine Exit Path
claim: | **Save / storage** (`DataManager`, `StorageManager`, `JsonEx`) | `rmmz_managers.js:345`, `:389`, `:405`, `:538`; `rmmz_core.js:6416`; 15 plugins alias save hooks | `deusSim` + `deusView` written with `fs` (§11) | S (after Inc 5) | low |
  6416  function JsonEx() {

### C348 ADR:1149 game/js/plugins/DEUS_WorldGen.js:45-46 OK
section: 13. Engine Exit Path
claim: | **Database JSON** (`$dataMap`, `$dataTilesets`, `$dataSystem`; custom databases through `_databaseFiles`) | `$dataMap` in 21 plugins; `$dataTilesets` in 5; `$dataSystem` in 3; loaders `DEUS_WorldGen.js:45-46`, `DEUS_Look.js:93`, `DEUS_World.js:2813` | catalogs load directly; `$dataMap` becomes a render projection (§4.6) | M | low |
    45  if (!DataManager.isBattleTest() && !DataManager.isEventTest()) {
    46  DataManager._databaseFiles.push({ name: CATALOG_VAR, src: "DEUS_WorldCatalog.json" });

### C349 ADR:1149 game/js/plugins/DEUS_Look.js:93 OK
section: 13. Engine Exit Path
claim: | **Database JSON** (`$dataMap`, `$dataTilesets`, `$dataSystem`; custom databases through `_databaseFiles`) | `$dataMap` in 21 plugins; `$dataTilesets` in 5; `$dataSystem` in 3; loaders `DEUS_WorldGen.js:45-46`, `DEUS_Look.js:93`, `DEUS_World.js:2813` | catalogs load directly; `$dataMap` becomes a render projection (§4.6) | M | low |
    93  if (!DataManager._databaseFiles.some(f => f.name === INDEX_VAR)) DataManager._databaseFiles.push({ name: INDEX_VAR, src: INDEX_FILE });

### C350 ADR:1149 game/js/plugins/DEUS_World.js:2813 OK
section: 13. Engine Exit Path
claim: | **Database JSON** (`$dataMap`, `$dataTilesets`, `$dataSystem`; custom databases through `_databaseFiles`) | `$dataMap` in 21 plugins; `$dataTilesets` in 5; `$dataSystem` in 3; loaders `DEUS_WorldGen.js:45-46`, `DEUS_Look.js:93`, `DEUS_World.js:2813` | catalogs load directly; `$dataMap` becomes a render projection (§4.6) | M | low |
  2813  DataManager._databaseFiles.push({ name: TEMPLATE_VAR, src: "Map%1.json".format(CONFIG.templateMapId.padZero(3)) });

### C351 ADR:1150 game/js/plugins/DEUS_Sheet.js:1158 OK
section: 13. Engine Exit Path
claim: | **Menus / windows** (`Window_*`, `Scene_MenuBase`) | 13 plugins use `Window_*`, 9 subclass them (e.g. `DEUS_Sheet.js:1158`, `DEUS_Interact.js:525`); the stock menu is disabled (`DEUS_ColonyOverseer.js:173`) | own UI toolkit: panels, lists, text, 9-slice skins | L | high: largest UX surface |
  1158  class Window_UFSheet extends Window_Base {

### C352 ADR:1150 game/js/plugins/DEUS_Interact.js:525 OK
section: 13. Engine Exit Path
claim: | **Menus / windows** (`Window_*`, `Scene_MenuBase`) | 13 plugins use `Window_*`, 9 subclass them (e.g. `DEUS_Sheet.js:1158`, `DEUS_Interact.js:525`); the stock menu is disabled (`DEUS_ColonyOverseer.js:173`) | own UI toolkit: panels, lists, text, 9-slice skins | L | high: largest UX surface |
   525  class Window_UFContextMenu extends Window_Command {

### C353 ADR:1150 game/js/plugins/DEUS_ColonyOverseer.js:173 OK
section: 13. Engine Exit Path
claim: | **Menus / windows** (`Window_*`, `Scene_MenuBase`) | 13 plugins use `Window_*`, 9 subclass them (e.g. `DEUS_Sheet.js:1158`, `DEUS_Interact.js:525`); the stock menu is disabled (`DEUS_ColonyOverseer.js:173`) | own UI toolkit: panels, lists, text, 9-slice skins | L | high: largest UX surface |
   173  Scene_Map.prototype.isMenuEnabled = function() { return false; };

### C354 ADR:1151 game/js/plugins/DEUS_World.js:899 OK
section: 13. Engine Exit Path
claim: | **Events / characters** (`Game_Event`, `Game_CharacterBase`, `Game_Player`) | every unit on view is a `Game_Event` (`DEUS_World.js:899`); `Game_CharacterBase` overrides in 11 plugins | after Inc 3 they are puppets; replaced by plain sprites fed by the view | S (after Inc 3) | low |
   899  const ev = new Game_Event($gameMap.mapId(), eid);

### C355 ADR:1152 game/js/rmmz_managers.js:1982-2112 OK
section: 13. Engine Exit Path
claim: | **Main loop** (`SceneManager`) | `rmmz_managers.js:1982-2112`; TimeSpeed overrides (§1.1) | the host loop is already the accumulator (§3.4); becomes `requestAnimationFrame` | S | low |
  1982  SceneManager.update = function(deltaTime) {
  1983  try {
  1984  const n = this.determineRepeatNumber(deltaTime);
      ...
  2111  Graphics.frameCount++;
  2112  };

### C356 ADR:1167 game/js/plugins/DEUS_History.js:3396-3408 OK
section: 14.1 What exists today
claim: **`History.generate` runs once, at world creation** (`DEUS_History.js:3396-3408` → `:363-410`).
  3396  if (window.UF.Events && UF.Events.on) {
  3397  UF.Events.on("world:created", state => {
  3398  const targetYear = UF.NewGameSetup && UF.NewGameSetup.year;
      ...
  3407  return;
  3408  }

### C357 ADR:1167 game/js/plugins/DEUS_History.js:363-410 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: **`History.generate` runs once, at world creation** (`DEUS_History.js:3396-3408` → `:363-410`).
   363  History.generate = function(world, opts = {}) {
   364  const state = world && world.state ? world.state : world;
   365  const cfg = this.config();
      ...
   409  });
   410  };

### C358 ADR:1168 game/js/plugins/DEUS_History.js:390-395 OK
section: 14.1 What exists today
claim: - It steps one year at a time (`D.step`, called at `DEUS_History.js:390-395`, defined at `DEUS_HistoricalDemographics.js:468`).
   390  for (let year = 0; year < steps; year++) {
   391  D.step(demographics);
   392  if (typeof opts.onCheckpoint === "function") opts.onCheckpoint({ ...demographics,
   393  living: demographics.people.filter(p => p.died === null).map(p => p.id),
   394  graveyard: demographics.people.filter(p => p.died !== null).map(p => p.id) });
   395  }

### C359 ADR:1168 game/js/plugins/DEUS_HistoricalDemographics.js:468 OK
section: 14.1 What exists today
claim: - It steps one year at a time (`D.step`, called at `DEUS_History.js:390-395`, defined at `DEUS_HistoricalDemographics.js:468`).
   468  function step(state, conditions = {}) {

### C360 ADR:1169 game/js/plugins/DEUS_HistoricalDemographics.js:8-9 OK
section: 14.1 What exists today
claim: - Nothing steps it during play (`DEUS_HistoricalDemographics.js:8-9`).
     8  * HIST-01/minimum HIST-02/HIST-09. No listeners, automatic generation, live units,
     9  * terrain edits, or save hooks. create(world, options) imports canonical

### C361 ADR:1172 game/js/plugins/DEUS_History.js:428-557 OK
section: 14.1 What exists today
claim: - `materialize` places only camps and living units (`DEUS_History.js:428-557`).
   428  History.materialize = function(world) {
   429  const state = world && world.state ? world.state : world;
   430  const h = state && state.history, d = h && h.demographics, W = UF.World;
      ...
   556  });
   557  };

### C362 ADR:1173 game/js/plugins/DEUS_HistoricalDemographics.js:319 OK
section: 14.1 What exists today
claim: - A site's `isRuined` is created false (`DEUS_HistoricalDemographics.js:319`) and validated as false (`:397`). So `site.ruined` (`DEUS_History.js:547`) never gets set.
   319  abandonedYear: null, isRuined: false, population: 0, peakPopulation: 0, historicalCapacity };

### C363 ADR:1173 game/js/plugins/DEUS_HistoricalDemographics.js:397 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: - A site's `isRuined` is created false (`DEUS_HistoricalDemographics.js:319`) and validated as false (`:397`). So `site.ruined` (`DEUS_History.js:547`) never gets set.
   397  check(integer(s.sourceSiteId) && !sourceSites.has(s.sourceSiteId) && s.foundedYear === state.startYear && typeof s.name === "string" && s.name.length && typeof s.kind === "string" && s.isRuined === false, "invalid import

### C364 ADR:1173 game/js/plugins/DEUS_History.js:547 OK
section: 14.1 What exists today
claim: - A site's `isRuined` is created false (`DEUS_HistoricalDemographics.js:319`) and validated as false (`:397`). So `site.ruined` (`DEUS_History.js:547`) never gets set.
   547  site.ruined = ds.isRuined ? ds.abandonedYear : null;

### C365 ADR:1174 docs/systems/UF_History.md:93 OK
section: 14.1 What exists today
claim: - The docs confirm it: the graveyard is "not evidence of a physical grave" (`docs/systems/UF_History.md:93`), and no automatic grave, crypt or ruin placement is authorized (`:106`).
    93  - All ancestor person records are retained, but the inherited historical event limit is 400. A deceased record in `graveyard` is a logical index entry, not evidence of a physical grave or burial location.

### C366 ADR:1174 docs/systems/UF_History.md:106 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: - The docs confirm it: the graveyard is "not evidence of a physical grave" (`docs/systems/UF_History.md:93`), and no automatic grave, crypt or ruin placement is authorized (`:106`).
   106  5. **Physical grave ownership gate.** No burial/inscription instance registry was found in the inspected baseline. Before physical graves are wired into Look, the coordinator must approve an anchor schema and its object/

### C367 ADR:1177 game/js/plugins/DEUS_History.js:1665-2732 OK
section: 14.1 What exists today
claim: - `History.iterateWorldHistory` (`DEUS_History.js:1665-2732`; doc comment `:1658-1664`) writes objects and diffs (`:1704-1712`) and road tiles (`:1845-1862`), and saves `history.roads` and `history.structures` (`:2725-2726`).
  1665  History.iterateWorldHistory = function(state, targetYears, opts = {}) {
  1666  const st = state || (window.UF && UF.World && UF.World.state);
  1667  if (!st || !st.history || !targetYears || targetYears <= 1) return null;
      ...
  2731  
  2732  return summary;

### C368 ADR:1177 game/js/plugins/DEUS_History.js:1658-1664 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: - `History.iterateWorldHistory` (`DEUS_History.js:1665-2732`; doc comment `:1658-1664`) writes objects and diffs (`:1704-1712`) and road tiles (`:1845-1862`), and saves `history.roads` and `history.structures` (`:2725-2726`).
  1658  /**
  1659  * Second-by-second living world history simulation (1-200 AD, user directives 2026-09-20).
  1660  * Pushes through elapsed simulation time second-by-second from Year 1 founders
  1661  * around the central campfire to targetYear.
  1662  * Cadence: 1 in-game day = 1 year = 240 real simulation seconds.
  1663  * 1 second = 6 game minutes ($ufTime.advanceMinute(6)).
  1664  */

### C369 ADR:1177 game/js/plugins/DEUS_History.js:1704-1712 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: - `History.iterateWorldHistory` (`DEUS_History.js:1665-2732`; doc comment `:1658-1664`) writes objects and diffs (`:1704-1712`) and road tiles (`:1845-1862`), and saves `history.roads` and `history.structures` (`:2725-2726`).
  1704  const write = (area, x, y, t) => {
  1705  const i = y * size + x;
  1706  if (live && O) O.setIn(area, x, y, typeof t === "string" ? t : (objects[t - 1] ? objects[t - 1].id : null));
      ...
  1711  }
  1712  };

### C370 ADR:1177 game/js/plugins/DEUS_History.js:1845-1862 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: - `History.iterateWorldHistory` (`DEUS_History.js:1665-2732`; doc comment `:1658-1664`) writes objects and diffs (`:1704-1712`) and road tiles (`:1845-1862`), and saves `history.roads` and `history.structures` (`:2725-2726`).
  1845  const roadKind = (f && f.species === "dwarf") ? "floor_stone" : "road";
  1846  const T = window.UF && UF.Tiles;
  1847  const roadBase = (T && T.groundBase) ? (T.groundBase(roadKind) || T.groundBase("road") || 2048) : 2048;
      ...
  1861  }
  1862  roadsPlaced++;

### C371 ADR:1177 game/js/plugins/DEUS_History.js:2725-2726 (bare, file from 0 line(s) back) OK
section: 14.1 What exists today
claim: - `History.iterateWorldHistory` (`DEUS_History.js:1665-2732`; doc comment `:1658-1664`) writes objects and diffs (`:1704-1712`) and road tiles (`:1845-1862`), and saves `history.roads` and `history.structures` (`:2725-2726`).
  2725  st.history.roads = Array.from(roadPositions);
  2726  st.history.structures = structuresList;

### C372 ADR:1178 game/js/plugins/DEUS_History.js:3409-3426 (bare, file from 1 line(s) back) OK
section: 14.1 What exists today
claim: - It runs only on the founders branch (`:3409-3426`).
  3409  if (state.history.founders) {
  3410  const off = people.filter(u => {
  3411  const s = state.history.sites.find(x => x.id === u.data.site);
      ...
  3425  }
  3426  }

### C373 ADR:1179 game/data/UF_WorldCatalog.json:7670-7675 OK
section: 14.1 What exists today
claim: - The catalog turns the legacy generator off with `history.simulate: false`, `settleYears: 0` (`game/data/UF_WorldCatalog.json:7670-7675`).
  7670  "simulate": false,
  7671  "years": [
  7672  500,
  7673  600
  7674  ],
  7675  "settleYears": 0,

### C374 ADR:1180 game/data/UF_WorldCatalog.json:6128-6146 OK
section: 14.1 What exists today
claim: - Catalog kinds for traces already exist: `ruin` and `lair` (`UF_WorldCatalog.json:6128-6146`).
  6128  "ruin": {
  6129  "radius": 5,
  6130  "ring": "rubble",
      ...
  6145  }
  6146  }

### C375 ADR:1183 docs/systems/UF_History.md:192-201 OK
section: 14.1 What exists today
claim: - 500-year demographic trajectories took 8.9–10.6 s of simulation, with the worst year at 66–91 ms (`docs/systems/UF_History.md:192-201`).
   192  Only public `api.step` execution contributes to simulation time. Worker wall also includes setup, observations, checkpoint validation/serialization and emission; parent process wall includes startup, source loading and f
   193  
   194  | Seed | Repeat | Simulation, s | Worker wall, s | Parent process wall, s | Worst annual step, ms |
      ...
   200  | 20260919 | 1 | 10.0856625 | 11.6161753 | 12.0479071 | 70.0923 |
   201  | 20260919 | 2 | 9.9830550 | 11.5073334 | 11.9582089 | 73.4312 |

### C376 ADR:1184 docs/systems/UF_History.md:31-44 (bare, file from 1 line(s) back) OK
section: 14.1 What exists today
claim: - With materialization, a worker took 2.7–3.1 s at age 0 and 10.3–13.5 s at age 500, with about 5 MB world states (`:31-44`).
    31  | Seed | Age | Living | Ancestors | Serialized world bytes | Worker ms |
    32  |---:|---:|---:|---:|---:|---:|
    33  | 0 | 0 | 72 | 0 | 278364 | 2758.241 |
      ...
    43  | 20260919 | 250 | 977 | 1584 | 3519606 | 4474.997 |
    44  | 20260919 | 500 | 1093 | 4224 | 5037835 | 13465.403 |

### C377 ADR:1197 docs/systems/UF_History.md:106 OK
section: 14.2 Design: history on the headless core
claim: 3. **Traces are ordinary sim data, not flavour text.** A ruin is its `objectDiffs` (rubble, ruin variants, `bones_pile`); a road is its tile diffs; a mine is its strata diffs, plus the items it produced; a grave is an object with an anchor record (`personId`, site, xyz). HIST-11 already requires that anchor schema (`UF_History.md:106`).
   106  5. **Physical grave ownership gate.** No burial/inscription instance registry was found in the inspected baseline. Before physical graves are wired into Look, the coordinator must approve an anchor schema and its object/

### C378 ADR:1202 docs/systems/UF_History.md:192-201 OK
section: 14.2 Design: history on the headless core
claim: 5. **Deterministic.** The run is a pure function of `(seed, setup parameters)`. Its output checksum is tested twice per seed, as the history harnesses already do with repeat runs (`UF_History.md:192-201`).
   192  Only public `api.step` execution contributes to simulation time. Worker wall also includes setup, observations, checkpoint validation/serialization and emission; parent process wall includes startup, source loading and f
   193  
   194  | Seed | Repeat | Simulation, s | Worker wall, s | Parent process wall, s | Worst annual step, ms |
      ...
   200  | 20260919 | 1 | 10.0856625 | 11.6161753 | 12.0479071 | 70.0923 |
   201  | 20260919 | 2 | 9.9830550 | 11.5073334 | 11.9582089 | 73.4312 |

### C379 ADR:1205 docs/systems/UF_History.md:31-44 OK
section: 14.2 Design: history on the headless core
claim: - today's demographics-only run takes 10.3–13.5 s at age 500 (`UF_History.md:31-44`), and the traces must fit in the rest.
    31  | Seed | Age | Living | Ancestors | Serialized world bytes | Worker ms |
    32  |---:|---:|---:|---:|---:|---:|
    33  | 0 | 0 | 72 | 0 | 278364 | 2758.241 |
      ...
    43  | 20260919 | 250 | 977 | 1584 | 3519606 | 4474.997 |
    44  | 20260919 | 500 | 1093 | 4224 | 5037835 | 13465.403 |

### C380 ADR:1211 docs/INVARIANT_REGISTRY.md:51 OK
section: 14.3 A conflict the Owner must resolve
claim: - INV-SIM-01 (`docs/INVARIANT_REGISTRY.md:51`) says: "Standard New Game begins strictly at World Year 0 (V134). No pre-generated centuries of roads, ruined cities, or exhausted mines."
    51  | **INV-SIM-01** | **Standard New Game Starts at Year 0** | Standard New Game begins strictly at World Year 0 (V134). No pre-generated centuries of roads, ruined cities, or exhausted mines. History unfolds through live s

### C381 ADR:1212 docs/systems/UF_History.md:106 OK
section: 14.3 A conflict the Owner must resolve
claim: - `UF_History.md:106` does not authorize automatic ruin or grave placement.
   106  5. **Physical grave ownership gate.** No burial/inscription instance registry was found in the inspected baseline. Before physical graves are wired into Look, the coordinator must approve an anchor schema and its object/

### C382 ADR:1213 game/js/plugins/DEUS_FactionMenus.js:280-292 OK
section: 14.3 A conflict the Owner must resolve
claim: - The New Game setup already has a year selector, `UF.NewGameSetup.year` (`DEUS_FactionMenus.js:280-292`).
   280  const year = this._newGameSetupWindow ? this._newGameSetupWindow.currentYear() : 0;
   281  const seed = this._newGameSetupWindow ? this._newGameSetupWindow.resolvedSeed() : undefined;
   282  const worldSize = 256;
      ...
   291  fogOfWar: false
   292  };

### C383 ADR:1220 docs/OWNER_DECISIONS.md:171-187 @0c1baf8d OK
section: 15. Nine Z Layers (DEC-013)
claim: DEC-013 was recorded on `main` at `0c1baf8d` (`docs/OWNER_DECISIONS.md:171-187`):
   171  ### Decision `DEC-013`: Nine Z Layers, Nine Races, One Home Layer per Race, and Five Biome Bands
   172  - **Date Logged:** 2026-09-26
   173  - **Status:** `DECIDED` (Owner ruling 00:34 & 00:37 CT, directive 0021-V)
      ...
   186  - **Open Sub-Questions (with PM defaults):**
   187  - **Z-Range Coordinate Mapping:** Default `-4..+4` (surface = 0, four underground layers `-1..-4`, four upper layers `+1..+4`). Status: `OPEN` (PM default).

### C384 ADR:1225 docs/worldgen/DEUS_WORLDGEN_WBS.md:105 @0c1baf8d OK
section: 15. Nine Z Layers (DEC-013)
claim: WG.00.17 does the legacy refactor (`docs/worldgen/DEUS_WORLDGEN_WBS.md:105` at `0c1baf8d`). It lists "ADR-003 9-layer memory/save/LOD design" as an input. This section is that input.
   105  | **WG.00.17** | Z-Range Configurable Setting & Expansion to 9 Layers | Claude | Make Z-range a single configurable setting in engine core, then expand from 5 to 9 layers (-4..+4: surface 0, four underground -1..-4, four

### C385 ADR:1231 game/js/plugins/DEUS_World.js:155 OK
section: 15.1 Where the range is fixed today
claim: | DEUS_World | `LEVELS = [-2, -1, 0, 1, 2]` (`DEUS_World.js:155`), map-id slots for 5 levels (`:156`), `isLevel` bounds (`:158`) |
   155  const LEVELS = Object.freeze([-2, -1, 0, 1, 2]);

### C386 ADR:1231 game/js/plugins/DEUS_World.js:156 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_World | `LEVELS = [-2, -1, 0, 1, 2]` (`DEUS_World.js:155`), map-id slots for 5 levels (`:156`), `isLevel` bounds (`:158`) |
   156  const SLOT = { 0: 0, 1: 1, 2: 2, "-1": 3, "-2": 4 }; // map id slot of each level; the ground keeps slot 0 (changed only by a test provocation)

### C387 ADR:1231 game/js/plugins/DEUS_World.js:158 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_World | `LEVELS = [-2, -1, 0, 1, 2]` (`DEUS_World.js:155`), map-id slots for 5 levels (`:156`), `isLevel` bounds (`:158`) |
   158  const isLevel = z => Number.isInteger(z) && z >= -2 && z <= 2;

### C388 ADR:1232 game/js/plugins/DEUS_Levels.js:61 OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`), `isLevel` (`:150`), `LEVEL_KEY` of 5 keys (`:998`), 5 fixed change maps (`:1137`, loop `:1141`), elevation index `(minZ + 2) * STRATA + minS` capped at 24 (`:1805`) |
    61  const LEVELS = Object.freeze([-2, -1, 0, 1, 2]);

### C389 ADR:1232 game/js/plugins/DEUS_Levels.js:150 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`), `isLevel` (`:150`), `LEVEL_KEY` of 5 keys (`:998`), 5 fixed change maps (`:1137`, loop `:1141`), elevation index `(minZ + 2) * STRATA + minS` capped at 24 (`:1805`) |
   150  const isLevel = z => (Number.isInteger(z) && z >= -2 && z <= 2) || (provoked("five_levels") && z === 3);

### C390 ADR:1232 game/js/plugins/DEUS_Levels.js:998 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`), `isLevel` (`:150`), `LEVEL_KEY` of 5 keys (`:998`), 5 fixed change maps (`:1137`, loop `:1141`), elevation index `(minZ + 2) * STRATA + minS` capped at 24 (`:1805`) |
   998  const LEVEL_KEY = ["-2", "-1", "0", "1", "2"];

### C391 ADR:1232 game/js/plugins/DEUS_Levels.js:1137 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`), `isLevel` (`:150`), `LEVEL_KEY` of 5 keys (`:998`), 5 fixed change maps (`:1137`, loop `:1141`), elevation index `(minZ + 2) * STRATA + minS` capped at 24 (`:1805`) |
  1137  deltas.levels = [new Map(), new Map(), new Map(), new Map(), new Map()];

### C392 ADR:1232 game/js/plugins/DEUS_Levels.js:1141 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`), `isLevel` (`:150`), `LEVEL_KEY` of 5 keys (`:998`), 5 fixed change maps (`:1137`, loop `:1141`), elevation index `(minZ + 2) * STRATA + minS` capped at 24 (`:1805`) |
  1141  for (let li = 0; li < 5; li++) {

### C393 ADR:1232 game/js/plugins/DEUS_Levels.js:1805 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Levels | `LEVELS` (`DEUS_Levels.js:61`), `isLevel` (`:150`), `LEVEL_KEY` of 5 keys (`:998`), 5 fixed change maps (`:1137`, loop `:1141`), elevation index `(minZ + 2) * STRATA + minS` capped at 24 (`:1805`) |
  1805  const e0 = Math.max(0, (minZ + 2) * STRATA + minS), e1 = Math.min(24, (maxZ + 2) * STRATA + maxS);

### C394 ADR:1233 game/js/plugins/DEUS_Fluid.js:56-58 OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Fluid | `Z_MIN = -2`, `Z_MAX = 2`, `Z_LEVELS = 5` (`DEUS_Fluid.js:56-58`), "Bottom of the world (-2)" (`:291`) |
    56  const Z_MIN = -2;
    57  const Z_MAX = 2;
    58  const Z_LEVELS = 5; // -2, -1, 0, 1, 2

### C395 ADR:1233 game/js/plugins/DEUS_Fluid.js:291 (bare, file from 0 line(s) back) OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Fluid | `Z_MIN = -2`, `Z_MAX = 2`, `Z_LEVELS = 5` (`DEUS_Fluid.js:56-58`), "Bottom of the world (-2)" (`:291`) |
   291  if (z <= Z_MIN) return false; // Bottom of the world (-2)

### C396 ADR:1234 game/js/plugins/DEUS_Minimap.js:59-60 OK
section: 15.1 Where the range is fixed today
claim: | DEUS_Minimap | `Z_LEVELS = [2, 1, 0, -1, -2]`, `Z_COUNT = 5` (`DEUS_Minimap.js:59-60`) |
    59  const Z_LEVELS = [2, 1, 0, -1, -2];
    60  const Z_COUNT = 5;

### C397 ADR:1243 game/js/plugins/DEUS_Levels.js:993 OK
section: 15.2 In the core the range is data
claim: - **Strata per level stay at 5**, the DEC-013 default (`STRATA = 5`, `DEUS_Levels.js:993`). `STRATA` is a core constant too.
   993  const STRATA = 5, CELL_FT = 5;

### C398 ADR:1266 game/js/plugins/DEUS_Levels.js:1037 OK
section: 15.4 Memory
claim: | Strata | `Uint8Array(n × 5)` + connectors `Uint8Array(n/2)` = 352 KiB (`DEUS_Levels.js:1037`) | 5,120 B + 512 B |
  1037  const n = size * size, m = new Uint8Array(n * STRATA), conn = new Uint8Array((n + 1) >> 1);

### C399 ADR:1267 game/js/plugins/DEUS_World.js:613 OK
section: 15.4 Memory
claim: | Objects | inside each map build: `Uint16Array(cells)` (`DEUS_World.js:613`) | 2,048 B |
   613  const objects = new Uint16Array(cells);

### C400 ADR:1268 game/js/plugins/DEUS_Fluid.js:179-183 OK
section: 15.4 Memory
claim: | Fluid | grid + flood cache + a share of `inQueue`: 3 × 64 KiB (`DEUS_Fluid.js:179-183`) | 1,024 B, only when fluid is present |
   179  grids: new Map(),       // z -> Uint8Array(n)
   180  floodGrids: new Map(),  // z -> Uint8Array(n) (legacy visual cache: 1=water, 2=lava)
   181  queue: [],              // cell indices: (zIdx * n + idx)
   182  head: 0,
   183  inQueue: new Uint8Array(totalCells),

### C401 ADR:1269 game/js/plugins/DEUS_World.js:605 OK
section: 15.4 Memory
claim: | Tiles | inside each map build: a 393,216-element array (`DEUS_World.js:605`); up to 6 builds cached (`:801`) | none: a render projection (§4.2) |
   605  const data = new Array(cells * 6).fill(0);

### C402 ADR:1269 game/js/plugins/DEUS_World.js:801 (bare, file from 0 line(s) back) OK
section: 15.4 Memory
claim: | Tiles | inside each map build: a 393,216-element array (`DEUS_World.js:605`); up to 6 builds cached (`:801`) | none: a render projection (§4.2) |
   801  const PEEK_CACHE = 6;

### C403 ADR:1281 game/js/plugins/DEUS_Levels.js:997 OK
section: 15.5 Save size
claim: - Strata changes are saved as one 22-hex-character record per changed cell (`REC = 11` bytes, `DEUS_Levels.js:997`; encoder `:1110-1114`) under `levels[z].strata["ax,ay"]` (`:990-991`).
   997  const REC = 11, REC_M = 1, REC_HP = 6;       // a changed cell: [connector, m0..m4, hp0..hp4]

### C404 ADR:1281 game/js/plugins/DEUS_Levels.js:1110-1114 (bare, file from 0 line(s) back) OK
section: 15.5 Save size
claim: - Strata changes are saved as one 22-hex-character record per changed cell (`REC = 11` bytes, `DEUS_Levels.js:997`; encoder `:1110-1114`) under `levels[z].strata["ax,ay"]` (`:990-991`).
  1110  function encodeRecord(r) {
  1111  let s = "";
  1112  for (let k = 0; k < REC; k++) s += HEX[r[k] >> 4] + HEX[r[k] & 15];
  1113  return s;
  1114  }

### C405 ADR:1281 game/js/plugins/DEUS_Levels.js:990-991 (bare, file from 0 line(s) back) OK
section: 15.5 Save size
claim: - Strata changes are saved as one 22-hex-character record per changed cell (`REC = 11` bytes, `DEUS_Levels.js:997`; encoder `:1110-1114`) under `levels[z].strata["ax,ay"]` (`:990-991`).
   990  // UF.World.state.levels[z].strata["ax,ay"][i]. The shape codes the rest of the game reads (solid, floor, open,
   991  // ramp, stairs) are derived from the strata here and nowhere else. docs/systems/UF_Levels.md, section Strata.

### C406 ADR:1282 game/js/plugins/DEUS_Fluid.js:821-844 OK
section: 15.5 Save size
claim: - Fluid is saved as a 7-number array per wet cell, including water that is still where generation put it (`DEUS_Fluid.js:821-844`).
   821  makeSaveContents() {
   822  const records = [];
   823  for (const [key, data] of areas.entries()) {
      ...
   843  };
   844  },

### C407 ADR:1302 docs/VISION.md:131 @0c1baf8d OK
section: 16. Structural Integrity & Collapse (V137)
claim: V137 was recorded on `main` at `0c1baf8d` (`docs/VISION.md:131`, from directive 0021-V §6). The WBS packages are SIM.40.01–.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:525-528` at `0c1baf8d`). SIM.40.01 sets the numbers (spans, capacities). This ADR fixes where the system lives, how it runs, and what it must conserve.
   131  | V137 | **Structural Integrity, Load-Bearing Architecture & Mass-Conserving Collapse** (user directive 2026-09-26, Directive 0021-V §6): Solid terrain, constructed walls, floors, and roofs possess material-dependent str

### C408 ADR:1302 docs/worldgen/DEUS_WORLDGEN_WBS.md:525-528 @0c1baf8d OK
section: 16. Structural Integrity & Collapse (V137)
claim: V137 was recorded on `main` at `0c1baf8d` (`docs/VISION.md:131`, from directive 0021-V §6). The WBS packages are SIM.40.01–.04 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:525-528` at `0c1baf8d`). SIM.40.01 sets the numbers (spans, capacities). This ADR fixes where the system lives, how it runs, and what it must conserve.
   525  | SIM.40.01 | **Support model design** (materials, vertical propagation, span limits, V128 natural rock, V133 change-driven). Specification of load-bearing rules and span capacities | PLANNED | Directive 0021-V §6; V137;
   526  | SIM.40.02 | **Collapse event simulation** (downward cascading, rubble/talus mass conservation LIFE-001, V95 impact damage, deep-history DEC-012) | PLANNED | Directive 0021-V §6; V137; LIFE-001; V95 | dep: SIM.40.01 | C
   527  | SIM.40.03 | **Colonist structural behaviour** (props, pillars, avoid dangerous excavation) | PLANNED | Directive 0021-V §6; V137 | dep: SIM.40.02 | Claude → Grok | Colonist builders and miners respect structural suppor
   528  | SIM.40.04 | **Collapse QA & fixtures** (deterministic cave-in, tall tower +1..+4, mass conservation, perf bound) | PLANNED | Directive 0021-V §6; V137 | dep: SIM.40.02 | Claude → Grok (mutation) | Automated test suite:

### C409 ADR:1306 game/js/plugins/DEUS_Levels.js:1000-1010 OK
section: 16.1 What exists
claim: - **A strata material table** with `support` (0..1 at full HP), `maxHP` and `debris` for stone, soil and wood (`DEUS_Levels.js:1000-1010`).
  1000  // Material table. Diagnostic values, not balanced: maxHP in HP points; resist multiplies incoming damage by damage
  1001  // type (a type not listed: 1); support is what a full-HP stratum carries (0..1); debris is what a destroyed stratum
  1002  // leaves, reported in levels:strataDestroyed (no item drops in 19A).
      ...
  1009  { id: M_LAVA, key: "lava", solid: false, fluid: true, maxHP: 0, support: 0, debris: null, resist: {} }
  1010  ].map(m => Object.freeze(Object.assign(m, { resist: Object.freeze(m.resist) }))));

### C410 ADR:1307 game/js/plugins/DEUS_Levels.js:1785-1795 (bare, file from 1 line(s) back) OK
section: 16.1 What exists
claim: - **Damage.** `applyVolumeDamage` (`:1785-1795`) calls `damageCell`, which writes the cell and emits `levels:strataDamaged` / `levels:strataDestroyed` (`:1708-1725`).
  1785  *   applyVolumeDamage(area, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact"[, { source }]):
  1786  *     every stratum of the box, from level minZ stratum minS up to level maxZ stratum maxS (it crosses levels: the
  1787  *     25 strata of a column are one elevation scale, e = (z + 2) * 5 + s, 0..24), takes the damage.
      ...
  1794  */
  1795  function applyVolumeDamage(a, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact", opts = {}) {

### C411 ADR:1307 game/js/plugins/DEUS_Levels.js:1708-1725 (bare, file from 1 line(s) back) OK
section: 16.1 What exists
claim: - **Damage.** `applyVolumeDamage` (`:1785-1795`) calls `damageCell`, which writes the cell and emits `levels:strataDamaged` / `levels:strataDestroyed` (`:1708-1725`).
  1708  // Damage some strata of one cell: hits = [[stratum, damage], ...]. One write for the cell, then the events.
  1709  function damageCell(st, ax, ay, x, y, z, hits, damageType, source) {
  1710  const i = y * st.size + x, ref = { area: { x: ax, y: ay }, x, y, z };
      ...
  1724  }
  1725  return results;

### C412 ADR:1308 game/js/plugins/DEUS_Levels.js:1001-1002 (bare, file from 2 line(s) back) OK
section: 16.1 What exists
claim: - **A destroyed stratum becomes air with no debris placed** (`:1001-1002`, `:1700-1702`; §1.4).
  1001  // type (a type not listed: 1); support is what a full-HP stratum carries (0..1); debris is what a destroyed stratum
  1002  // leaves, reported in levels:strataDestroyed (no item drops in 19A).

### C413 ADR:1308 game/js/plugins/DEUS_Levels.js:1700-1702 (bare, file from 2 line(s) back) OK
section: 16.1 What exists
claim: - **A destroyed stratum becomes air with no debris placed** (`:1001-1002`, `:1700-1702`; §1.4).
  1700  out.destroyed = true;
  1701  out.debris = mat.debris;
  1702  rec[REC_M + s] = M_AIR;

### C414 ADR:1309 game/js/plugins/DEUS_Colonists.js:3736 OK
section: 16.1 What exists
claim: - **Construction refuses unsupported airborne builds** (`DEUS_Colonists.js:3736`).
  3736  else if (zOf(c) !== 0 && (!World().walkable || !World().walkable(c.area.x, c.area.y, x, y, { z: zOf(c), ground: true }))) state = step.exact ? "blocked" : "skipped"; // no excavation or unsupported airborne construction

### C415 ADR:1310 docs/OWNER_DECISIONS.md:137 OK
section: 16.1 What exists
claim: - **Ledge rule.** DEC-010 (`docs/OWNER_DECISIONS.md:137`) is OPEN, with the default "lateral connectivity is sufficient".
   137  ### Decision `DEC-010`: Rock Ledge Support vs. Lateral Edge Connectivity in Cuts/Caves

### C416 ADR:1311 game/js/plugins/DEUS_Fluid.js:941-944 OK
section: 16.1 What exists
claim: - **Fluid already wakes** on `levels:*` geometry events (`DEUS_Fluid.js:941-944`).
   941  UF.Events.on("levels:cellChanged", handleGeometryChange);
   942  UF.Events.on("levels:shapeChanged", handleGeometryChange);
   943  UF.Events.on("levels:strataChanged", handleGeometryChange);
   944  UF.Events.on("levels:strataDestroyed", handleGeometryChange);

### C417 ADR:1340 game/js/plugins/DEUS_Doors.js:444-445 OK
section: 16.4 The collapse event
claim: - Objects break into their catalog remains, which is a transform. The Doors path already does this: `DEUS_Doors.js:444-445`.
   444  const O = Objects(), type = O && O.type(s.objectId), ruin = type && type.ruin ? type.ruin : "rubble";
   445  if (O) O.setIn(at.area, at.x, at.y, ruin);

### C418 ADR:1371 docs/VISION.md:132 @0c1baf8d OK
section: 17. Decay & Reclamation (V138)
claim: V138 was recorded on `main` at `0c1baf8d` (`docs/VISION.md:132`, from directive 0021-V §7-§8). The WBS packages are SIM.40.05–.09 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:529-533` at `0c1baf8d`). The risks are LIFE-001..003 (`docs/RISK_REGISTER.md:60-62`).
   132  | V138 | **Urban Decay, Nature Reclamation & Weathering** (user directive 2026-09-26, Directive 0021-V §7, LIFE-001..003): Abandoned and unmaintained structures decay physically over time rather than remaining static. Ro

### C419 ADR:1371 docs/worldgen/DEUS_WORLDGEN_WBS.md:529-533 @0c1baf8d OK
section: 17. Decay & Reclamation (V138)
claim: V138 was recorded on `main` at `0c1baf8d` (`docs/VISION.md:132`, from directive 0021-V §7-§8). The WBS packages are SIM.40.05–.09 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:529-533` at `0c1baf8d`). The risks are LIFE-001..003 (`docs/RISK_REGISTER.md:60-62`).
   529  | SIM.40.05 | **Decay model** (unmaintained structure HP loss by material/exposure, roofs fail first, walls fail, feeds collapse) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | SIM.40.01, dep: SIM.00.01 | Claude → Gro
   530  | SIM.40.06 | **Nature reclaiming** (vegetation invasion, soil/sediment burial, visible stages: intact -> weathered -> overgrown -> collapsed -> buried mound) | PLANNED | Directive 0021-V §7; V138; LIFE-001 | dep: SIM.40
   531  | SIM.40.07 | **Item weathering & burial** (rot, rust, sediment burial, durable relics, LIFE-001 mass conservation, LIFE-002 no ore creation) | PLANNED | Directive 0021-V §7; V138; LIFE-001; LIFE-002 | dep: SIM.40.05 | C
   532  | SIM.40.08 | **Deep-history decay integration** (summary-level decay for fast-forward, LIFE-003 trace retention) | PLANNED | Directive 0021-V §7; V138; DEC-012; LIFE-003 | SIM.40.05, dep: SIM.30.02 | Claude → Grok | Dee
   533  | SIM.40.09 | **Decay QA & fixtures** (deterministic aging fixture, mass conservation, no ore creation, perf bound) | PLANNED | Directive 0021-V §7; V138 | SIM.40.06, SIM.40.07, dep: SIM.40.08 | Claude → Grok (mutation) 

### C420 ADR:1371 docs/RISK_REGISTER.md:60-62 OK
section: 17. Decay & Reclamation (V138)
claim: V138 was recorded on `main` at `0c1baf8d` (`docs/VISION.md:132`, from directive 0021-V §7-§8). The WBS packages are SIM.40.05–.09 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:529-533` at `0c1baf8d`). The risks are LIFE-001..003 (`docs/RISK_REGISTER.md:60-62`).
    60  | `LIFE-001` | Physical Matter Leakage in Lifecycle | Simulation | Matter silently deleted or leaked when constructions collapse, erode, or naturalize. | `CRITICAL` | Breaks mass-conservation; world hollows out over cent
    61  | `LIFE-002` | Accidental Finite Resource Respawning | Simulation / Economy | Naturalization or pedogenesis accidentally fabricating fresh metal ore veins (Fe, Cu, Ag, Au, Pt). | `CRITICAL` | Destroys economic scarcity; 
    62  | `LIFE-003` | Historical Over-Erasure | Narrative / World | Naturalization erasing meaningful player/faction historical geography too rapidly or completely. | `MAJOR` | World history feels impermanent; ruins feel generi

### C421 ADR:1375 game/js/plugins/DEUS_HistoricalDemographics.js:521 OK
section: 17.1 What exists
claim: - **History marks abandonment only as a year.** It sets `abandonedYear` (`DEUS_HistoricalDemographics.js:521`), and `isRuined` stays false (§14.1). Nothing physical changes.
   521  if (!s.population && s.abandonedYear === null) { s.abandonedYear = state.currentYear; emit(state, "abandonment", s.factionId, s.id, [], `${s.name} became uninhabited.`); }

### C422 ADR:1376 game/js/plugins/DEUS_Doors.js:18 OK
section: 17.1 What exists
claim: - **Broken objects become their catalog ruin.** `ruin` defaults to `rubble` (`DEUS_Doors.js:18`, `:444-451`). Catalog objects carry a `ruin` variant (for example `UF_WorldCatalog.json:2147`, `:2188`).
    18  * and become their catalog ruin when destroyed.

### C423 ADR:1376 game/js/plugins/DEUS_Doors.js:444-451 (bare, file from 0 line(s) back) OK
section: 17.1 What exists
claim: - **Broken objects become their catalog ruin.** `ruin` defaults to `rubble` (`DEUS_Doors.js:18`, `:444-451`). Catalog objects carry a `ruin` variant (for example `UF_WorldCatalog.json:2147`, `:2188`).
   444  const O = Objects(), type = O && O.type(s.objectId), ruin = type && type.ruin ? type.ruin : "rubble";
   445  if (O) O.setIn(at.area, at.x, at.y, ruin);
   446  delete ds.byCell[key];
   447  if (window.UF && UF.History && typeof UF.History.addEvent === "function") {
   448  UF.History.addEvent({ type: "door_broken", text: "A door was broken.", area: at.area, x: at.x, y: at.y });
   449  }
   450  emit("doors:broken", key, ruin);
   451  return { broken: true, hp: 0, ruin };

### C424 ADR:1376 game/data/UF_WorldCatalog.json:2147 OK
section: 17.1 What exists
claim: - **Broken objects become their catalog ruin.** `ruin` defaults to `rubble` (`DEUS_Doors.js:18`, `:444-451`). Catalog objects carry a `ruin` variant (for example `UF_WorldCatalog.json:2147`, `:2188`).
  2147  "ruin": "bones_pile"

### C425 ADR:1376 game/data/UF_WorldCatalog.json:2188 (bare, file from 0 line(s) back) OK
section: 17.1 What exists
claim: - **Broken objects become their catalog ruin.** `ruin` defaults to `rubble` (`DEUS_Doors.js:18`, `:444-451`). Catalog objects carry a `ruin` variant (for example `UF_WorldCatalog.json:2147`, `:2188`).
  2188  "ruin": "rubble"

### C426 ADR:1377 game/js/plugins/DEUS_Ecology.js:764-872 OK
section: 17.1 What exists
claim: - **Regrowth exists.** Ecology keeps regrowth and sprout records, matured by beat count (`DEUS_Ecology.js:764-872`).
   764  function stepBeat(opts) {
   765  const W = World(), O = Objects(), st = state(), o = opts || {};
   766  if (!enabled && !o.force || !W || !W.state || !O) return { spawned: 0, matured: 0 };
      ...
   871  }
   872  return result;

### C427 ADR:1387 game/js/plugins/DEUS_Levels.js:995 OK
section: 17.3 Decay in closed form: change-driven and LOD-invariant
claim: - Every built element has integer HP (V95) and a `lastMaintainedDay`. A built element is a built stratum (`M_BUILT`, `DEUS_Levels.js:995`) or a built object.
   995  const M_BUILT = 0x80, M_ID = 0x3f;

### C428 ADR:1415 docs/RISK_REGISTER.md:61 OK
section: 17.4 Reclamation, items and the geology cycle
claim: - iron and copper → oxidised trace-mineral sediment, never ore (LIFE-002, `docs/RISK_REGISTER.md:61`);
    61  | `LIFE-002` | Accidental Finite Resource Respawning | Simulation / Economy | Naturalization or pedogenesis accidentally fabricating fresh metal ore veins (Fe, Cu, Ag, Au, Pt). | `CRITICAL` | Destroys economic scarcity; 

### C429 ADR:1421 docs/RISK_REGISTER.md:62 OK
section: 17.4 Reclamation, items and the geology cycle
claim: - **LIFE-003** (`docs/RISK_REGISTER.md:62`). Meaningful sites have a floor. History sites, monuments, and graves with anchor records never go past "buried mound". Their anchor records are never removed. They end as buried finds, not nothing.
    62  | `LIFE-003` | Historical Over-Erasure | Narrative / World | Naturalization erasing meaningful player/faction historical geography too rapidly or completely. | `MAJOR` | World history feels impermanent; ruins feel generi

### C430 ADR:1429 docs/RISK_REGISTER.md:74 OK
section: 17.5 LOD, time domain and cadence
claim: - Nothing runs per frame, and nothing scans the whole world (NAT-003, `docs/RISK_REGISTER.md:74`).
    74  | `NAT-003` | Full-World Recurring Ecological Scanning | Performance / Simulation | Background natural systems (aquifers, soil moisture, wildfire, wildlife) iterating 65,536 cells per frame. | `CRITICAL` | Severe frame r

### C431 ADR:1431 docs/RISK_REGISTER.md:63 OK
section: 17.5 LOD, time domain and cadence
claim: - The formulas are closed-form in days, so an element's HP on day D is the same at L0, L1, L2, or after a deep-history jump of many years. This is the LIFE-004 requirement (`docs/RISK_REGISTER.md:63`).
    63  | `LIFE-004` | Catch-Up Nondeterminism | WorldGen / Simulation | Century-scale long-time catch-up simulation producing divergent terrain states across repeated runs. | `CRITICAL` | Divergent multiplayer/simulation histor

### C432 ADR:1454 game/js/plugins/DEUS_Anim.js:1506 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.2 | Sim on `Game_Map.update`: World L2932, Fluid L1016, Ecology L992 (every 60), Fire L617, Environment L796, Colonists L5748, Jobs L1777, Projects L1596, Combat L1414, Factions L657 | **Confirmed.** Also sim-relevant and not listed: Anim `:1506` (unit removal), Ownership `:613`, TimeSpeed `:189` (timers). Fog `:638` is presentation. Wildlife `:1195` is empty | §1.2 |
  1506  Game_Map.prototype.update = function(sceneActive) {

### C433 ADR:1454 game/js/plugins/DEUS_Ownership.js:613 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.2 | Sim on `Game_Map.update`: World L2932, Fluid L1016, Ecology L992 (every 60), Fire L617, Environment L796, Colonists L5748, Jobs L1777, Projects L1596, Combat L1414, Factions L657 | **Confirmed.** Also sim-relevant and not listed: Anim `:1506` (unit removal), Ownership `:613`, TimeSpeed `:189` (timers). Fog `:638` is presentation. Wildlife `:1195` is empty | §1.2 |
   613  Game_Map.prototype.update = function(sceneActive) {

### C434 ADR:1454 game/js/plugins/DEUS_TimeSpeed.js:189 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.2 | Sim on `Game_Map.update`: World L2932, Fluid L1016, Ecology L992 (every 60), Fire L617, Environment L796, Colonists L5748, Jobs L1777, Projects L1596, Combat L1414, Factions L657 | **Confirmed.** Also sim-relevant and not listed: Anim `:1506` (unit removal), Ownership `:613`, TimeSpeed `:189` (timers). Fog `:638` is presentation. Wildlife `:1195` is empty | §1.2 |
   189  Game_Map.prototype.update = function(sceneActive) {

### C435 ADR:1454 game/js/plugins/DEUS_Fog.js:638 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.2 | Sim on `Game_Map.update`: World L2932, Fluid L1016, Ecology L992 (every 60), Fire L617, Environment L796, Colonists L5748, Jobs L1777, Projects L1596, Combat L1414, Factions L657 | **Confirmed.** Also sim-relevant and not listed: Anim `:1506` (unit removal), Ownership `:613`, TimeSpeed `:189` (timers). Fog `:638` is presentation. Wildlife `:1195` is empty | §1.2 |
   638  Game_Map.prototype.update = function(sceneActive) {

### C436 ADR:1454 game/js/plugins/DEUS_Wildlife.js:1195 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.2 | Sim on `Game_Map.update`: World L2932, Fluid L1016, Ecology L992 (every 60), Fire L617, Environment L796, Colonists L5748, Jobs L1777, Projects L1596, Combat L1414, Factions L657 | **Confirmed.** Also sim-relevant and not listed: Anim `:1506` (unit removal), Ownership `:613`, TimeSpeed `:189` (timers). Fog `:638` is presentation. Wildlife `:1195` is empty | §1.2 |
  1195  Game_Map.prototype.update = function(sceneActive) {

### C437 ADR:1455 game/js/plugins/DEUS_Wildlife.js:505-510 (bare, file from 1 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.3 | Calendar on `Scene_Map.update`: Core L505 | **Confirmed** (`:505-510`). Also called on sub-ticks (`DEUS_TimeSpeed.js:236`) | §1.1 |
   505  area: { x: ax, y: ay },
   506  z,
   507  home: center,
   508  cells,
   509  dirs,
   510  origin: "cave"

### C438 ADR:1455 game/js/plugins/DEUS_TimeSpeed.js:236 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.3 | Calendar on `Scene_Map.update`: Core L505 | **Confirmed** (`:505-510`). Also called on sub-ticks (`DEUS_TimeSpeed.js:236`) | §1.1 |
   236  if (window.$ufTime) $ufTime.update();

### C439 ADR:1456 game/js/plugins/DEUS_TimeSpeed.js:209-217 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.4 | NaturalConnections runs fluids and creatures on `Graphics.frameCount % 30` in `Scene_Map.update` (L507-515), "so it ignores pause and speed" | **Partly corrected.** It ignores **pause**: pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`), while `SceneManager.updateMain` keeps incrementing `frameCount` (`rmmz_managers.js:2102-2112`) and the `Scene_Map.update` wrappers keep running. It does **not** ignore **speed**: NaturalConnections loads after TimeSpeed (`plugins.js:258` vs `:184`), so its wrapper runs on every sub-tick, and `frameCount` goes up once per `updateM
   209  const _Scene_Map_updateMain = Scene_Map.prototype.updateMain;
   210  Scene_Map.prototype.updateMain = function() {
   211  if (!paused) {
      ...
   216  $gameScreen.update();
   217  };

### C440 ADR:1456 game/js/rmmz_managers.js:2102-2112 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.4 | NaturalConnections runs fluids and creatures on `Graphics.frameCount % 30` in `Scene_Map.update` (L507-515), "so it ignores pause and speed" | **Partly corrected.** It ignores **pause**: pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`), while `SceneManager.updateMain` keeps incrementing `frameCount` (`rmmz_managers.js:2102-2112`) and the `Scene_Map.update` wrappers keep running. It does **not** ignore **speed**: NaturalConnections loads after TimeSpeed (`plugins.js:258` vs `:184`), so its wrapper runs on every sub-tick, and `frameCount` goes up once per `updateM
  2102  SceneManager.updateMain = function() {
  2103  this.updateFrameCount();
  2104  this.updateInputData();
      ...
  2111  Graphics.frameCount++;
  2112  };

### C441 ADR:1456 game/js/plugins.js:258 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.4 | NaturalConnections runs fluids and creatures on `Graphics.frameCount % 30` in `Scene_Map.update` (L507-515), "so it ignores pause and speed" | **Partly corrected.** It ignores **pause**: pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`), while `SceneManager.updateMain` keeps incrementing `frameCount` (`rmmz_managers.js:2102-2112`) and the `Scene_Map.update` wrappers keep running. It does **not** ignore **speed**: NaturalConnections loads after TimeSpeed (`plugins.js:258` vs `:184`), so its wrapper runs on every sub-tick, and `frameCount` goes up once per `updateM
   258  "name": "DEUS_NaturalConnections",

### C442 ADR:1456 game/js/plugins.js:184 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.4 | NaturalConnections runs fluids and creatures on `Graphics.frameCount % 30` in `Scene_Map.update` (L507-515), "so it ignores pause and speed" | **Partly corrected.** It ignores **pause**: pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`), while `SceneManager.updateMain` keeps incrementing `frameCount` (`rmmz_managers.js:2102-2112`) and the `Scene_Map.update` wrappers keep running. It does **not** ignore **speed**: NaturalConnections loads after TimeSpeed (`plugins.js:258` vs `:184`), so its wrapper runs on every sub-tick, and `frameCount` goes up once per `updateM
   184  "name": "DEUS_TimeSpeed",

### C443 ADR:1456 game/js/plugins/DEUS_NaturalConnections.js:312-329 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.4 | NaturalConnections runs fluids and creatures on `Graphics.frameCount % 30` in `Scene_Map.update` (L507-515), "so it ignores pause and speed" | **Partly corrected.** It ignores **pause**: pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`), while `SceneManager.updateMain` keeps incrementing `frameCount` (`rmmz_managers.js:2102-2112`) and the `Scene_Map.update` wrappers keep running. It does **not** ignore **speed**: NaturalConnections loads after TimeSpeed (`plugins.js:258` vs `:184`), so its wrapper runs on every sub-tick, and `frameCount` goes up once per `updateM
   312  function addFluid(r, type = "water") {
   313  if (!validCell(r)) return false;
   314  const fs = fluidsState();
      ...
   328  }
   329  return true;

### C444 ADR:1456 game/js/plugins/DEUS_NaturalConnections.js:352-353 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.4 | NaturalConnections runs fluids and creatures on `Graphics.frameCount % 30` in `Scene_Map.update` (L507-515), "so it ignores pause and speed" | **Partly corrected.** It ignores **pause**: pause replaces only `Scene_Map.updateMain` (`DEUS_TimeSpeed.js:209-217`), while `SceneManager.updateMain` keeps incrementing `frameCount` (`rmmz_managers.js:2102-2112`) and the `Scene_Map.update` wrappers keep running. It does **not** ignore **speed**: NaturalConnections loads after TimeSpeed (`plugins.js:258` vs `:184`), so its wrapper runs on every sub-tick, and `frameCount` goes up once per `updateM
   352  if (isWater(upper)) {
   353  addFluid(lower, "water");

### C445 ADR:1457 game/js/plugins/DEUS_World.js:1686-1698 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.5 | On-screen units are Game_Events whose position is copied into the sim (World L1686-1698; stepOnscreen/stepDirect L1633-1675) | **Confirmed** | `DEUS_World.js:1686-1698`, `:1633-1675` |
  1686  if (view && u.area.x === view.x && u.area.y === view.y && zOf(u) === view.z) {
  1687  const ev = $gameMap._events[EVENT_BASE + u.id];
  1688  if (!ev) {
      ...
  1697  u.dir8 = ev.dir8 ? ev.dir8() : u.dir;
  1698  if (u.goal) stepOnscreen(u, ev);

### C446 ADR:1457 game/js/plugins/DEUS_World.js:1633-1675 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.5 | On-screen units are Game_Events whose position is copied into the sim (World L1686-1698; stepOnscreen/stepDirect L1633-1675) | **Confirmed** | `DEUS_World.js:1686-1698`, `:1633-1675` |
  1633  function stepOnscreen(u, ev) {
  1634  if (ev.isMoving()) return;
  1635  if (goalReached(u)) return arrive(u);
      ...
  1674  }
  1675  }

### C447 ADR:1458 game/js/plugins/DEUS_World.js:136 (bare, file from 1 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.6 | Off-screen units jump one cell every 16 frames (L1699-1701) | **Confirmed.** `unitStepFrames` default `:136`. Units on the viewed level that have no event also use it (`:1688-1689`) | §1.3 |
   136  unitStepFrames: Math.max(1, num("UnitStepFrames", 16))

### C448 ADR:1458 game/js/plugins/DEUS_World.js:1688-1689 (bare, file from 1 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.6 | Off-screen units jump one cell every 16 frames (L1699-1701) | **Confirmed.** `unitStepFrames` default `:136`. Units on the viewed level that have no event also use it (`:1688-1689`) | §1.3 |
  1688  if (!ev) {
  1689  if (u.goal && (frame + u.id) % steps === 0) stepOffscreen(u);

### C449 ADR:1459 game/js/plugins/DEUS_World.js:127-128 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.7 | Fluid steps only the viewed area (L736-745) | **Confirmed, with a qualification.** The default world has one area (`DEUS_World.js:127-128`; `plugins.js:58`), so the viewed area is the whole world, all 5 levels (`DEUS_Fluid.js:356-376`). There is also no `sceneActive` gate (`:1016-1019`) | §1.3 |
   127  areasX: num("AreasX", 1),
   128  areasY: num("AreasY", 1),

### C450 ADR:1459 game/js/plugins.js:58 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.7 | Fluid steps only the viewed area (L736-745) | **Confirmed, with a qualification.** The default world has one area (`DEUS_World.js:127-128`; `plugins.js:58`), so the viewed area is the whole world, all 5 levels (`DEUS_Fluid.js:356-376`). There is also no `sceneActive` gate (`:1016-1019`) | §1.3 |
    58  "parameters": {}

### C451 ADR:1459 game/js/plugins/DEUS_Fluid.js:356-376 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.7 | Fluid steps only the viewed area (L736-745) | **Confirmed, with a qualification.** The default world has one area (`DEUS_World.js:127-128`; `plugins.js:58`), so the viewed area is the whole world, all 5 levels (`DEUS_Fluid.js:356-376`). There is also no `sceneActive` gate (`:1016-1019`) | §1.3 |
   356  function stepArea(ax, ay, budget) {
   357  const data = getAreaData(ax, ay);
   358  const queue = data.queue;
      ...
   375  
   376  while (data.head < limit) {

### C452 ADR:1459 game/js/plugins/DEUS_Fluid.js:1016-1019 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.7 | Fluid steps only the viewed area (L736-745) | **Confirmed, with a qualification.** The default world has one area (`DEUS_World.js:127-128`; `plugins.js:58`), so the viewed area is the whole world, all 5 levels (`DEUS_Fluid.js:356-376`). There is also no `sceneActive` gate (`:1016-1019`) | §1.3 |
  1016  Game_Map.prototype.update = function(sceneActive) {
  1017  _Game_Map_update.call(this, sceneActive);
  1018  Fluid.tick();
  1019  };

### C453 ADR:1460 game/js/plugins/DEUS_World.js:532 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification.** Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
   532  World.currentArea = () => (window.$gameMap && World.state ? World.areaOfMapId($gameMap.mapId()) : null);

### C454 ADR:1460 game/js/plugins/DEUS_Ecology.js:803 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification.** Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
   803  const baseArea = (W.currentArea && W.currentArea()) || { x: 0, y: 0 };

### C455 ADR:1460 game/js/plugins/DEUS_Ecology.js:452-453 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification.** Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
   452  const here = W.currentArea();
   453  if (sameArea(here, area) && window.$gamePlayer && Math.hypot(x - $gamePlayer.x, y - $gamePlayer.y) < PLAYER_CLEARANCE) return "player";

### C456 ADR:1461 game/js/plugins/DEUS_Ecology.js:801 (bare, file from 1 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.9 | Terrain is read through RMMZ-format `$dataMap` builds (World.buildArea L595-640), cached 6 deep (peekArea L797-822) | **Confirmed** (`PEEK_CACHE = 6`, `:801`; `buildArea` `:599`) | §1.3 |
   801  const H = History();

### C457 ADR:1461 game/js/plugins/DEUS_Ecology.js:599 (bare, file from 1 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.9 | Terrain is read through RMMZ-format `$dataMap` builds (World.buildArea L595-640), cached 6 deep (peekArea L797-822) | **Confirmed** (`PEEK_CACHE = 6`, `:801`; `buildArea` `:599`) | §1.3 |
   599  for (const parent of parents) {

### C458 ADR:1462 game/js/plugins/DEUS_Levels.js:4179-4193 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.10 | A layer switch is a map transfer (World.transferView L2724-2730) | **Confirmed** (`DEUS_Levels.js:4179-4193` → `DEUS_World.js:2728`) | §1.3 |
  4179  function setView(z, opts = {}) {
  4180  const W = World();
  4181  const v = W && W.viewLevel();
      ...
  4192  return true;
  4193  }

### C459 ADR:1462 game/js/plugins/DEUS_World.js:2728 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.10 | A layer switch is a map transfer (World.transferView L2724-2730) | **Confirmed** (`DEUS_Levels.js:4179-4193` → `DEUS_World.js:2728`) | §1.3 |
  2728  $gamePlayer.reserveTransfer(this.areaMapId(ax, ay, lz), x, y, dir || $gamePlayer.direction(), 2);

### C460 ADR:1463 tools/bench_history_sim.js:13 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.11 | `bench_history_sim.js` runs World, WorldGen, Factions, History and Levels in a vm with throwing engine stubs and a throwing `Math.random` (L37-122) | **Confirmed as code** (`:13`, `:37-122`, `:66-67`). **But the tool exits 1 at `ebeec892`** (observed, Appendix B) | §14.1 |
    13  const MODULES = ["World", "WorldGen", "Factions", "History", "Levels"];

### C461 ADR:1463 tools/bench_history_sim.js:37-122 @ebeec892 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.11 | `bench_history_sim.js` runs World, WorldGen, Factions, History and Levels in a vm with throwing engine stubs and a throwing `Math.random` (L37-122) | **Confirmed as code** (`:13`, `:37-122`, `:66-67`). **But the tool exits 1 at `ebeec892`** (observed, Appendix B) | §14.1 |
    37  function sourceBundle() {
    38  const files = {};
    39  const read = file => (files[file] = fs.readFileSync(path.join(ROOT, file), "utf8"));
      ...
   121  env.UF.Factions.generate(state);
   122  assert(state.factions && state.factions.list.length && env.UF.WorldGen.cellInfo(128, 128), "Missing real factions/terrain");

### C462 ADR:1463 tools/bench_history_sim.js:66-67 @ebeec892 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.11 | `bench_history_sim.js` runs World, WorldGen, Factions, History and Levels in a vm with throwing engine stubs and a throwing `Math.random` (L37-122) | **Confirmed as code** (`:13`, `:37-122`, `:66-67`). **But the tool exits 1 at `ebeec892`** (observed, Appendix B) | §14.1 |
    66  const math = Object.create(Math);
    67  math.random = () => { throw new Error("Unseeded Math.random in benchmark execution"); };

### C463 ADR:1464 tools/test_new_game_year0.js:284 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.12 | `test_new_game_year0.js` uses the same pattern (L269-311) | **Confirmed** as a range. Unlike the bench, it passes the real `Math`, so `Math.random` isn't blocked (`tools/test_new_game_year0.js:284`) | — |
   284  window: null, UF: ns, DEUS: ns, Math, performance,

### C464 ADR:1465 tools/test_strata_foundation.js:156-243 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.13 | `test_strata_foundation.js` L154-237 | **Corrected:** the loader function spans `:156-243`, and its engine stubs are no-ops, not throwing (`:191-218`) | — |
   156  function setup(sources, tag) {
   157  const list = {};
   158  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game/js/plugins.js"), "utf8"), list);
      ...
   242  return env;
   243  }

### C465 ADR:1465 tools/test_strata_foundation.js:191-218 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.13 | `test_strata_foundation.js` L154-237 | **Corrected:** the loader function spans `:156-243`, and its engine stubs are no-ops, not throwing (`:191-218`) | — |
   191  for (const name of ["Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player", "Game_CharacterBase", "Game_Event", "Spriteset_Map", "Spriteset_Base"]) {
   192  env[name] = vm.runInNewContext(`(function ${name}(){})`);
   193  env[name].prototype.initialize = function() {};
      ...
   217  });
   218  Object.assign(env.Game_Player.prototype, { isTransferring: () => false, direction: () => 2, locate(x, y) { this.x = x; this.y = y; } });

### C466 ADR:1466 game/js/plugins/DEUS_Fluid.js:1025-1026 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.14 | `test_liquid_depth_simulation.js` runs DEUS_Fluid alone (L121-125); Fluid has `module.exports` at L1025 | **Confirmed** (`DEUS_Fluid.js:1025-1026`) | §1.5 |
  1025  if (typeof module !== "undefined" && module.exports) {
  1026  module.exports = Fluid;

### C467 ADR:1468 game/js/plugins/DEUS_Fluid.js:62 (bare, file from 2 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** L60-61 is the comment; the code is `:62`, `:304-311`, `:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
    62  const STRATA_TO_FLUID = Object.freeze([0, 1, 3, 4, 6, 7]);

### C468 ADR:1468 game/js/plugins/DEUS_Fluid.js:304-311 (bare, file from 2 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** L60-61 is the comment; the code is `:62`, `:304-311`, `:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
   304  if (s === "solid") return false;
   305  }
   306  
   307  // Destination capacity: cell below must not be already at or over capacity
   308  const destCap = Fluid.fluidCapacityAt(ax, ay, x, y, z - 1);
   309  if (destCap <= 0) return false;
   310  const destDepth = Fluid.depthAt(ax, ay, x, y, z - 1);
   311  if (destDepth >= destCap) return false;

### C469 ADR:1468 game/js/plugins/DEUS_Fluid.js:376-378 (bare, file from 2 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** L60-61 is the comment; the code is `:62`, `:304-311`, `:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
   376  while (data.head < limit) {
   377  const cellId = queue[data.head++];
   378  data.inQueue[cellId] = 0;

### C470 ADR:1468 game/js/plugins/DEUS_Colonists.js:48 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** L60-61 is the comment; the code is `:62`, `:304-311`, `:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
    48  const NEEDS_EVERY = 60;         // ticks per needs tick (one game minute)

### C471 ADR:1468 game/js/plugins/DEUS_Environment.js:52 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** L60-61 is the comment; the code is `:62`, `:304-311`, `:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
    52  const TICKS_PER_STEP = 60; // 1 beat / 1 game second

### C472 ADR:1468 game/js/plugins/DEUS_TimeSpeed.js:33 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** L60-61 is the comment; the code is `:62`, `:304-311`, `:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
    33  * speed-up and the pause). 60 frames = 1 game minute at the default UF_Core

### C473 ADR:1469 game/js/plugins/DEUS_TimeSpeed.js:45-50 (bare, file from 1 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.17 | The TimeSpeed repeat hack is L147-173 | **Confirmed.** Also, 16x and 32x are forced into the list (`:45-50`) | §1.1 |
    45  let speedList = String(P.Speeds || "1, 2, 4, 8, 16, 32").split(",").map(Number).filter(n => n >= 1);
    46  if (!speedList.includes(16)) speedList.push(16);
    47  if (!speedList.includes(32)) speedList.push(32);
    48  speedList.sort((a, b) => a - b);
    49  const SPEEDS = speedList;
    50  if (SPEEDS[0] !== 1) SPEEDS.unshift(1);

### C474 ADR:1470 game/js/plugins/DEUS_Dnd5e.js:415 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.18 | The only `Math.random` in sim paths is the `World.newWorld` seed pick (L411/L418) | **Confirmed for DEUS_World.** Also `DEUS_Dnd5e.js:415`, `:720`, `:800` fall back to `Math.random` without an `rng`. The FactionMenus and Visuals uses are presentation | §10.1 |
   415  let r = (typeof rng === "function" ? rng() : Math.random()) * total;

### C475 ADR:1470 game/js/plugins/DEUS_Dnd5e.js:720 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.18 | The only `Math.random` in sim paths is the `World.newWorld` seed pick (L411/L418) | **Confirmed for DEUS_World.** Also `DEUS_Dnd5e.js:415`, `:720`, `:800` fall back to `Math.random` without an `rng`. The FactionMenus and Visuals uses are presentation | §10.1 |
   720  const rng = typeof opts.rng === "function" ? opts.rng : Math.random;

### C476 ADR:1470 game/js/plugins/DEUS_Dnd5e.js:800 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.18 | The only `Math.random` in sim paths is the `World.newWorld` seed pick (L411/L418) | **Confirmed for DEUS_World.** Also `DEUS_Dnd5e.js:415`, `:720`, `:800` fall back to `Math.random` without an `rng`. The FactionMenus and Visuals uses are presentation | §10.1 |
   800  const rng = typeof opts.rng === "function" ? opts.rng : Math.random;
