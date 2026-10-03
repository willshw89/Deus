//=============================================================================
// RPG Maker MZ - Ultima Fortress: Core & Clockwork Time System
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Core] Foundation systems: shared state, time domains, deterministic RNG, coordinate math, spatial queries, and engine hooks.
 * @author Deepdelve Architect
 *
 * @param TimeSpeed
 * @text Real Seconds per Game Minute
 * @type number
 * @min 0.1
 * @decimals 2
 * @default 1.0
 * @desc How many real seconds pass for one game minute.
 *
 * @param StartHour
 * @text Starting Hour (0-23)
 * @type number
 * @min 0
 * @max 23
 * @default 8
 *
 * @param StartMinute
 * @text Starting Minute (0-59)
 * @type number
 * @min 0
 * @max 59
 * @default 0
 *
 * @param ShowClockHUD
 * @text Show Clock HUD
 * @type boolean
 * @default true
 * @desc Display the classic Ultima/DF clock and season HUD on screen.
 *
 * @help
 * ============================================================================
 * Ultima Fortress Core Plugin
 * ============================================================================
 * Provides:
 * - 24-hour continuous clockwork time system
 * - Dwarf Fortress calendar (Granite, Slate, Felsite, Malachite, Galena, etc.)
 * - Clockwork tick events broadcasted to all NPCs and environment
 * - Minimal engine modification via standard aliasing
 *
 * Plugin Commands:
 * - SetTime [hour] [minute]
 * - AddTime [minutes]
 * - ToggleClockHUD
 */

(() => {
    "use strict";

    const pluginName = "DEUS_Core";
    const params = PluginManager.parameters(pluginName);
    // User specification: 1 real minute = 1 season (6h), 1 day/night cycle (24h) = 1 in-game year (4 real minutes), 1 real hour = 15 years.
    // 240 real seconds / 1440 game minutes = 1/6 real seconds per game minute (10 frames at 60 FPS).
    const timeSpeed = params["TimeSpeed"] && params["TimeSpeed"] !== "1.0" ? parseFloat(params["TimeSpeed"]) : (1.0 / 6.0);
    const FRAME_DT = 1 / 60;
    const startHour = parseInt(params["StartHour"] || 8, 10);
    const startMinute = parseInt(params["StartMinute"] || 0, 10);
    const defaultShowHUD = (params["ShowClockHUD"] || "true") === "true";


    if (typeof require !== 'undefined') {
        try {
            const fs = require('fs');
            const log = (msg) => fs.appendFileSync('game_runtime.log', `${new Date().toISOString()} ${msg}\n`);
            log("[CORE] UF_Core plugin loaded successfully!");

            // Bridge browser window globals to Node module global in NW.js desktop runtime
            if (typeof window !== "undefined" && typeof global !== "undefined") {
                const rmmzGlobals = [
                    "Window_Base", "Window_Selectable", "Window_Command", "Sprite", "Rectangle", "Bitmap",
                    "TouchInput", "Input", "SceneManager", "Scene_Base", "Scene_Map", "Scene_Boot",
                    "ImageManager", "SoundManager", "Graphics", "PluginManager", "DataManager",
                    "StorageManager", "TextManager", "ColorManager", "Window", "Point"
                ];
                for (let gi = 0; gi < rmmzGlobals.length; gi++) {
                    const k = rmmzGlobals[gi];
                    if (window[k] && !global[k]) {
                        global[k] = window[k];
                    }
                }
            }

            // Synchronously ensure all modular plugins are loaded in NW.js desktop runtime
            const companionPlugins = [
                "DEUS_Containers",
                "DEUS_Bag",
                "DEUS_Stockpiles",
                "DEUS_Fluid",
                "DEUS_Conditions",
                "DEUS_Select",
                "DEUS_Dnd5e",
                "DEUS_Callings",
                "DEUS_HistoricalDemographics",
                "DEUS_DeathForensics",
                // Households (partner pairs, families, their homes) for DEUS_Projects' domestic housing
                // (DEUS-TSK-FABLE-17): not in plugins.js while the editor holds it; register it there when the editor
                // is closed and drop this line.
                "UF_Households"
            ];
            for (let pi = 0; pi < companionPlugins.length; pi++) {
                const name = companionPlugins[pi];
                const paths = [
                    `./js/plugins/${name}.js`,
                    `./game/js/plugins/${name}.js`,
                    `./${name}.js`
                ];
                let loaded = false, lastError = null;
                for (let pj = 0; pj < paths.length; pj++) {
                    const p = paths[pj];
                    try {
                        require(p);
                        log(`[CORE] Synchronously loaded companion plugin ${name}`);
                        loaded = true;
                        break;
                    } catch (e) { lastError = e; }
                }
                // A companion that fails to load says so (DEUS-TSK-FABLE-17: the loop used to swallow every error).
                if (!loaded) log(`[CORE] Companion plugin ${name} NOT loaded: ${lastError && lastError.message ? lastError.message : lastError}`);
                // Also ensure DOM script injection if PluginManager is active and not already injected
                if (typeof window !== "undefined" && typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
                    if (!window[`__deus_loaded_${name}`]) {
                        window[`__deus_loaded_${name}`] = true;
                        PluginManager.loadScript(name);
                    }
                }
            }

            let isAutoTest = false;

            const _Scene_Boot_start = Scene_Boot.prototype.start;
            Scene_Boot.prototype.start = function() {
                const t0 = performance.now();
                log(`[SCENE] Scene_Boot started at t=0`);
                if (window.UF && UF.Events && UF.Events.on) {
                    UF.Events.on("world:initializing", () => log(`[TIMING] world:initializing fired (+${(performance.now() - t0).toFixed(1)}ms)`));
                    UF.Events.on("world:created", () => log(`[TIMING] world:created fired (+${(performance.now() - t0).toFixed(1)}ms)`));
                    UF.Events.on("world:areaBuilt", (a) => log(`[TIMING] world:areaBuilt (${a.x},${a.y}) (+${(performance.now() - t0).toFixed(1)}ms)`));
                }
                const origSetup = DataManager.setupNewGame;
                DataManager.setupNewGame = function() {
                    log(`[TIMING] DataManager.setupNewGame enter (+${(performance.now() - t0).toFixed(1)}ms)`);
                    const res = origSetup.apply(this, arguments);
                    log(`[TIMING] DataManager.setupNewGame exit (+${(performance.now() - t0).toFixed(1)}ms)`);
                    return res;
                };
                _Scene_Boot_start.call(this);
                log(`[TIMING] Scene_Boot.start exit (+${(performance.now() - t0).toFixed(1)}ms)`);
            };

            const _Scene_Title_start = Scene_Title.prototype.start;
            Scene_Title.prototype.start = function() {
                log("[SCENE] Scene_Title started");
                _Scene_Title_start.call(this);
                const nwArgs = (typeof nw !== 'undefined' && nw.App && nw.App.argv) ? nw.App.argv : [];
                const procArgs = (typeof process !== 'undefined' && process.argv) ? process.argv : [];
                log(`[ARGV] nwArgs: ${JSON.stringify(nwArgs)}, procArgs: ${JSON.stringify(procArgs)}`);
                isAutoTest = false;
                for (let ai = 0; ai < nwArgs.length; ai++) {
                    if (nwArgs[ai].indexOf("autotest") >= 0) { isAutoTest = true; break; }
                }
                if (!isAutoTest) {
                    for (let ai = 0; ai < procArgs.length; ai++) {
                        if (procArgs[ai].indexOf("autotest") >= 0) { isAutoTest = true; break; }
                    }
                }
                if (isAutoTest) {
                    log("[AUTOTEST] Automatically triggering New Game in 500ms...");
                    setTimeout(() => {
                        this.commandNewGame();
                    }, 500);
                }
            };

            const _Scene_Map_isReady = Scene_Map.prototype.isReady;
            let mapIsReadyLogCount = 0;
            Scene_Map.prototype.isReady = function() {
                const ready = _Scene_Map_isReady.call(this);
                if (mapIsReadyLogCount++ < 5 || (mapIsReadyLogCount % 60 === 0)) {
                    const tmReady = this._spriteset && this._spriteset._tilemap ? this._spriteset._tilemap.isReady() : false;
                    log(`[SCENE_MAP isReady] ready=${ready}, mapLoaded=${this._mapLoaded}, tilemapReady=${tmReady}, loadingCount=${Graphics._loadingCount}`);
                }
                return ready;
            };

            const _Scene_Map_start = Scene_Map.prototype.start;
            Scene_Map.prototype.start = function() {
                log(`[SCENE] Scene_Map started! Map: ${$gameMap.displayName()} (${$dataMap ? $dataMap.width + 'x' + $dataMap.height : '?'})`);
                try {
                    _Scene_Map_start.call(this);
                    log(`[AUTOTEST] Player pos: (${$gamePlayer.x}, ${$gamePlayer.y}), Party leader: ${$gameParty.leader() ? $gameParty.leader().name() : 'none'}`);
                    log(`[AUTOTEST] Events on map: ${$gameMap.events().length}`);
                    log(`[AUTOTEST] Clock HUD time: ${$ufTime.timeString} - ${$ufTime.dateString}`);
                    if (isAutoTest) {
                        log(`[AUTOTEST] Scene_Map active and verified.`);
                    }
                } catch (e) {
                    log(`[SCENE_MAP START ERROR] ${e ? (e.stack || e.message) : e}`);
                }
            };

            let frameCount = 0;
            const _Scene_Map_update_log = Scene_Map.prototype.update;
            Scene_Map.prototype.update = function() {
                try {
                    _Scene_Map_update_log.call(this);
                    frameCount++;
                    if (frameCount === 1 || frameCount === 60 || frameCount === 180) {
                        log(`[SCENE_MAP UPDATE] Frame: ${frameCount}, Clock: ${$ufTime.timeString}`);
                    }
                    if (isAutoTest && frameCount === 60) {
                        try {
                            const evs = $gameMap._events;
                            for (let ei = 0; ei < evs.length; ei++) {
                                const ev = evs[ei];
                                if (!ev) continue;
                                log(`[SNAPSHOT_POS] Event ${ev.eventId()} (${ev.event().name}): pos=(${ev.x},${ev.y}), screen=(${ev.screenX()},${ev.screenY()}), charName="${ev.characterName()}"`);
                            }
                            const snap = SceneManager.snap();
                            const dataUrl = snap.canvas.toDataURL('image/png');
                            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
                            const fs = require('fs');
                            fs.writeFileSync('test_screenshot.png', Buffer.from(base64Data, 'base64'));
                            log("[SNAPSHOT] Successfully saved test_screenshot.png at frame 60");
                        } catch (snapErr) {
                            log(`[SNAPSHOT ERROR] ${snapErr.message}`);
                        }
                    }
                    if (isAutoTest && frameCount >= 180) {
                        log("[AUTOTEST] Integration test completed successfully. Exiting clean.");
                        if (typeof nw !== 'undefined' && nw.App) {
                            nw.App.quit();
                        } else {
                            window.close();
                        }
                    }
                } catch (e) {
                    log(`[SCENE_MAP UPDATE ERROR] ${e ? (e.stack || e.message) : e}`);
                    throw e;
                }
            };

            const _SceneManager_catchException = SceneManager.catchException;
            SceneManager.catchException = function(e) {
                const errDetail = (e && e.stack) ? e.stack : ((e && e.message) ? e.message : (typeof e === 'object' ? JSON.stringify(e) : String(e)));
                log(`[SCENE EXCEPTION] ${errDetail}`);
                _SceneManager_catchException.call(this, e);
            };

            const _SceneManager_onError = SceneManager.onError;
            SceneManager.onError = function(event) {
                log(`[WINDOW ONERROR] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
                _SceneManager_onError.call(this, event);
            };
        } catch (err) {
            // Ignore in browser environment
        }
    }

    // Safeguard for window opacity in RMMZ v1.8+
    const _Game_System_windowOpacity = Game_System.prototype.windowOpacity;
    Game_System.prototype.windowOpacity = function() {
        if ($dataSystem && $dataSystem.advanced && typeof $dataSystem.advanced.windowOpacity === "number") {
            return $dataSystem.advanced.windowOpacity;
        }
        return 192;
    };

    // The 12 Months of Kaldurath (The Sundered Wheel)
    const KALDURATH_MONTHS = [
        "Deep-Frost", "Iron-Thaw", "Stone-Bloom",       // Spring
        "Forge-Sun", "High-Embers", "Ash-Wind",         // Summer
        "Harvest-Vein", "Rust-Moon", "Gold-Fall",       // Autumn
        "Star-Watch", "Obsidian-Chill", "Void-Deep"     // Winter
    ];

    // Global UF Namespace & Event Bus
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Events = {
        _listeners: {},
        on(event, callback) {
            (this._listeners[event] = this._listeners[event] || []).push(callback);
        },
        off(event, callback) {
            const list = this._listeners[event];
            if (!list) return;
            let w = 0;
            for (let i = 0; i < list.length; i++) {
                if (list[i] !== callback) list[w++] = list[i];
            }
            list.length = w;
        },
        // Fixed arity: a rest parameter would allocate an array on every time:minute tick.
        emit(event, a1, a2, a3, a4, a5, a6) {
            const list = this._listeners[event];
            if (!list) return;
            for (let i = 0; i < list.length; i++) {
                const cb = list[i];
                const t0 = performance.now();
                try { cb(a1, a2, a3, a4, a5, a6); } catch (err) { console.error(err); }
                const dur = performance.now() - t0;
                if (dur > 20 || (typeof event === "string" && event.startsWith("world:"))) {
                    const name = cb.name || `anon_${i}`;
                    if (typeof require !== 'undefined') {
                        try {
                            require('fs').appendFileSync('game_runtime.log', `${new Date().toISOString()} [EVENT ${event}] #${i} (${name}) took ${dur.toFixed(1)}ms\n`);
                        } catch (_) {}
                    }
                }
            }
        }
    };

    //-----------------------------------------------------------------------------
    // Game_UFTime
    //-----------------------------------------------------------------------------
    class Game_UFTime {
        constructor() {
            this.hour = startHour;
            this.minute = startMinute;
            this.day = 1;
            this.monthIndex = 0; // Granite
            // INV-SIM-01: the New Game setup year, kept when it is 0; World Year 0 when no setup year is set.
            const setupYear = window.UF && UF.NewGameSetup ? UF.NewGameSetup.year : undefined;
            this.year = Number.isInteger(setupYear) && setupYear >= 0 ? setupYear : 0;
            this._timer = 0;
            this.isPaused = false;
            this.showHUD = defaultShowHUD;
            this._timeStr = "";
            this._timeStrHour = -1;
            this._timeStrMinute = -1;
        }

        /** New Game: the calendar back to its start at the setup year. Pause and HUD are left to their owners. */
        resetCalendar() {
            this.hour = startHour;
            this.minute = startMinute;
            this.day = 1;
            this.monthIndex = 0;
            const setupYear = window.UF && UF.NewGameSetup ? UF.NewGameSetup.year : undefined;
            this.year = Number.isInteger(setupYear) && setupYear >= 0 ? setupYear : 0;
            this._timer = 0;
            this._timeStrHour = -1;
            this._timeStrMinute = -1;
        }

        update() {
            if (this.isPaused || $gameMessage.isBusy()) return;
            this._timer += FRAME_DT;
            if (this._timer >= timeSpeed) {
                this._timer -= timeSpeed;
                this.advanceMinute(1);
            }
        }

        advanceMinute(amount = 1) {
            const oldSeason = this.seasonName;
            this.minute += amount;
            while (this.minute >= 60) {
                this.minute -= 60;
                this.hour++;
                this.onHourPass();
            }
            while (this.hour >= 24) {
                this.hour -= 24;
                this.day++;
                this.year++; // 1 day/night cycle per year
                this.onDayPass();
            }
            if (this.seasonName !== oldSeason) {
                UF.Events.emit("time:season", this.seasonName, this.year);
            }
            // Broadcast minute event
            UF.Events.emit("time:minute", this.hour, this.minute);

            // Trigger time listeners
            if (window.$ufSchedules) {
                window.$ufSchedules.checkRoutines(this.hour, this.minute);
            }
        }

        onHourPass() {
            UF.Events.emit("time:hour", this.hour);
        }

        onDayPass() {
            UF.Events.emit("time:day", this.day, this.monthName, this.year);
            UF.Events.emit("time:year", this.year);
        }

        setTime(h, m) {
            this.hour = Math.max(0, Math.min(23, h));
            this.minute = Math.max(0, Math.min(59, m));
        }

        get monthName() {
            return KALDURATH_MONTHS[this.monthIndex] || "Deep-Frost";
        }

        get seasonName() {
            const h = this.hour;
            if (h >= 6 && h < 12) return "Spring";
            if (h >= 12 && h < 18) return "Summer";
            if (h >= 18 && h < 24) return "Autumn";
            return "Winter";
        }

        get timeString() {
            if (this._timeStrHour !== this.hour || this._timeStrMinute !== this.minute) {
                this._timeStrHour = this.hour;
                this._timeStrMinute = this.minute;
                const hh = this.hour < 10 ? "0" + this.hour : String(this.hour);
                const mm = this.minute < 10 ? "0" + this.minute : String(this.minute);
                this._timeStr = hh + ":" + mm;
            }
            return this._timeStr;
        }

        get dateString() {
            return `Year ${this.year}, ${this.seasonName} (${this.timeString})`;
        }

        // Authoritative timebase conversions (Audit Log A8)
        ticksPerMinute() {
            return Math.max(1, Math.round(timeSpeed * 60));
        }

        ticksPerHour() {
            return this.ticksPerMinute() * 60;
        }

        ticksPerDay() {
            return this.ticksPerHour() * 24;
        }

        ticksForMinutes(m) {
            return Math.round(m * this.ticksPerMinute());
        }

        ticksForHours(h) {
            return Math.round(h * this.ticksPerHour());
        }

        ticksForDays(d) {
            return Math.round(d * this.ticksPerDay());
        }

        minutesFromTicks(t) {
            return Math.floor(t / this.ticksPerMinute());
        }

        hoursFromTicks(t) {
            return t / this.ticksPerHour();
        }

        daysFromTicks(t) {
            return t / this.ticksPerDay();
        }

        ticksForGameMinutes(m) { return this.ticksForMinutes(m); }
        ticksForGameHours(h) { return this.ticksForHours(h); }
        ticksForGameDays(d) { return this.ticksForDays(d); }
        gameMinutesFromTicks(t) { return this.minutesFromTicks(t); }
        gameHoursFromTicks(t) { return this.hoursFromTicks(t); }
        gameDaysFromTicks(t) { return this.daysFromTicks(t); }
    }

    // Global Instance
    window.Game_DEUSTime = Game_UFTime;
    window.$deusTime = new Game_UFTime();
    window.$ufTime = window.$deusTime;

    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Time = window.UF.Time || {};
    window.UF.Time.ticksPerMinute = () => window.$ufTime.ticksPerMinute();
    window.UF.Time.ticksPerHour = () => window.$ufTime.ticksPerHour();
    window.UF.Time.ticksPerDay = () => window.$ufTime.ticksPerDay();
    window.UF.Time.ticksForMinutes = m => window.$ufTime.ticksForMinutes(m);
    window.UF.Time.ticksForHours = h => window.$ufTime.ticksForHours(h);
    window.UF.Time.ticksForDays = d => window.$ufTime.ticksForDays(d);
    window.UF.Time.minutesFromTicks = t => window.$ufTime.minutesFromTicks(t);
    window.UF.Time.hoursFromTicks = t => window.$ufTime.hoursFromTicks(t);
    window.UF.Time.daysFromTicks = t => window.$ufTime.daysFromTicks(t);
    window.UF.Time.ticksForGameMinutes = m => window.$ufTime.ticksForGameMinutes(m);
    window.UF.Time.ticksForGameHours = h => window.$ufTime.ticksForGameHours(h);
    window.UF.Time.ticksForGameDays = d => window.$ufTime.ticksForGameDays(d);
    window.UF.Time.gameMinutesFromTicks = t => window.$ufTime.gameMinutesFromTicks(t);
    window.UF.Time.gameHoursFromTicks = t => window.$ufTime.gameHoursFromTicks(t);
    window.UF.Time.gameDaysFromTicks = t => window.$ufTime.gameDaysFromTicks(t);

    //-----------------------------------------------------------------------------
    // Save / Load Support
    //-----------------------------------------------------------------------------
    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DataManager_makeSaveContents.call(this);
        contents.deusTime = {
            hour: $ufTime.hour,
            minute: $ufTime.minute,
            day: $ufTime.day,
            monthIndex: $ufTime.monthIndex,
            year: $ufTime.year,
            showHUD: $ufTime.showHUD
        };
        contents.ufTime = contents.deusTime;
        if (false) contents.ufTime = {
            hour: $ufTime.hour,
            minute: $ufTime.minute,
            day: $ufTime.day,
            monthIndex: $ufTime.monthIndex,
            year: $ufTime.year,
            showHUD: $ufTime.showHUD
        };
        return contents;
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        const _tData = contents.deusTime || contents.ufTime;
        if (_tData) {
            $ufTime.hour = _tData.hour;
            $ufTime.minute = _tData.minute;
            $ufTime.day = _tData.day;
            $ufTime.monthIndex = _tData.monthIndex;
            $ufTime.year = _tData.year;
            $ufTime.showHUD = _tData.showHUD;
        }
        if (false && contents.ufTime) {
            $ufTime.hour = contents.ufTime.hour;
            $ufTime.minute = contents.ufTime.minute;
            $ufTime.day = contents.ufTime.day;
            $ufTime.monthIndex = contents.ufTime.monthIndex;
            $ufTime.year = contents.ufTime.year;
            $ufTime.showHUD = contents.ufTime.showHUD;
        }
    };

    // The clock above is built once at boot, before any New Game setup exists. A New Game resets it to the setup year
    // before Game_Player.setupForNewGame creates the world (UF_History then sets the year its history reached), so a
    // New Game started after a Load doesn't keep that save's date.
    const _DataManager_setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        $ufTime.resetCalendar();
        _DataManager_setupNewGame.call(this);
    };

    //-----------------------------------------------------------------------------
    // UF.Perf: the central performance counter source, off by default (ORG-0.2, Owner 2026-10-02 23:08 CT, PM PERF_NOW
    // dispatch 2026-10-03). setEnabled(true) installs passive observers once: a Pixi ticker observer (frame interval =
    // the time between consecutive ticker callbacks, scheduler delay included; not CPU time, not GPU completion;
    // Graphics._onTick stays the registered callback), a wrapper around Graphics._app.render that times the CPU
    // submission of one frame (not GPU completion), the New Game boundaries (DataManager.setupNewGame entry to exit =
    // synchronous setup; entry to the first render of a started Scene_Map other than the scene at entry = to the first
    // map draw), the load boundaries (DataManager.loadGame entry to its promise = data load; to the first map render
    // after it), and the JS heap when performance.memory exists (null when it does not; never zero for "unavailable").
    // DEUS_World reports every actual simulation tick (one runSimTicks iteration) through Perf.tick(ms). snapshot() is a
    // plain copy. Nothing here changes game behaviour, and nothing is written per frame: the overlay (a sprite on the
    // map scene, top left) refreshes every 0.5 s and one "[PERF]" line goes to game_runtime.log every 10 s while enabled.
    // Enable with UF.Perf.setEnabled(true) (DevTools console), DEUS_PERF=1 in the environment, or --deus-perf.
    const Perf = (() => {
        const WINDOW = 120;
        const st = {
            enabled: false, installed: false, since: 0,
            frames: 0, lastTickAt: 0, intervalMs: null, intervalMaxMs: 0, intervals: [],
            renders: 0, drawMs: null, drawMaxMs: 0, draws: [],
            simTicks: 0, simTickMs: null, simTickMaxMs: 0, simTicksMs: [],
            newGame: null, load: null, heapBytes: null, heapAvailable: false,
            logEverySec: 10, lastLogAt: 0, overlayEverySec: 0.5, lastOverlayAt: 0, logLines: 0, logFailures: 0, lifecycleWrapped: false
        };
        const now = () => performance.now();
        const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
        const push = (a, v) => { a.push(v); if (a.length > WINDOW) a.shift(); };
        const f1 = v => v === null || v === undefined ? "n/a" : v.toFixed(1);
        let pendingNewGame = null, pendingLoad = null, overlay = null;
        const mapStarted = s => s instanceof Scene_Map && typeof s.isStarted === "function" && s.isStarted();
        function heap() {
            const m = typeof performance !== "undefined" && performance.memory;
            if (m && Number.isFinite(m.usedJSHeapSize)) { st.heapAvailable = true; st.heapBytes = m.usedJSHeapSize; }
            else { st.heapAvailable = false; st.heapBytes = null; }
        }
        function snapshot() {
            return {
                enabled: st.enabled, installed: st.installed, sinceMs: st.since ? now() - st.since : null,
                frames: st.frames, intervalMs: st.intervalMs, intervalAvgMs: avg(st.intervals), intervalMaxMs: st.intervalMaxMs,
                renders: st.renders, drawMs: st.drawMs, drawAvgMs: avg(st.draws), drawMaxMs: st.drawMaxMs,
                simTicks: st.simTicks, simTickMs: st.simTickMs, simTickAvgMs: avg(st.simTicksMs), simTickMaxMs: st.simTickMaxMs,
                newGame: st.newGame ? Object.assign({}, st.newGame) : null, load: st.load ? Object.assign({}, st.load) : null,
                heapBytes: st.heapBytes, heapAvailable: st.heapAvailable, logEverySec: st.logEverySec, logLines: st.logLines, logFailures: st.logFailures,
                lifecycleWrapped: st.lifecycleWrapped
            };
        }
        function line() {
            const s = snapshot();
            return `[PERF] frames ${s.frames} interval ${f1(s.intervalMs)}/${f1(s.intervalAvgMs)}/${f1(s.intervalMaxMs)} ms (last/avg/max); renders ${s.renders} draw cpu ${f1(s.drawMs)}/${f1(s.drawAvgMs)}/${f1(s.drawMaxMs)} ms; sim ticks ${s.simTicks} ${f1(s.simTickMs)}/${f1(s.simTickAvgMs)}/${f1(s.simTickMaxMs)} ms; heap ${s.heapBytes === null ? "n/a" : s.heapBytes + " bytes"}; new game ${s.newGame ? `sync ${f1(s.newGame.syncMs)} ms, first map draw ${f1(s.newGame.toFirstMapRenderMs)} ms` : "n/a"}; load ${s.load ? `data ${f1(s.load.dataMs)} ms, first map draw ${f1(s.load.toFirstMapRenderMs)} ms` : "n/a"}`;
        }
        function logNow(tag) {
            if (typeof require !== "function") return null;
            const text = line() + (tag ? ` tag ${tag}` : "");
            try { require("fs").appendFileSync("game_runtime.log", `${new Date().toISOString()} ${text}\n`); st.logLines++; return text; }
            catch (_) { st.logFailures++; return null; }
        }
        function refreshOverlay() {
            if (!overlay || !overlay.bitmap) return;
            const s = snapshot(), b = overlay.bitmap;
            b.clear();
            b.fontSize = 12; b.textColor = "#ffffff"; b.outlineColor = "rgba(0,0,0,0.9)"; b.outlineWidth = 3;
            const lines = [
                `PERF frame ${f1(s.intervalMs)} ms avg ${f1(s.intervalAvgMs)} max ${f1(s.intervalMaxMs)} (${s.frames} ticker callbacks)`,
                `draw cpu ${f1(s.drawMs)} ms avg ${f1(s.drawAvgMs)} max ${f1(s.drawMaxMs)} (${s.renders} renders) heap ${s.heapBytes === null ? "n/a" : (s.heapBytes / 1048576).toFixed(1) + " MB"}`,
                `sim ticks ${s.simTicks} last ${f1(s.simTickMs)} avg ${f1(s.simTickAvgMs)} max ${f1(s.simTickMaxMs)} ms`,
                `new game ${s.newGame ? `${f1(s.newGame.syncMs)} ms sync, ${f1(s.newGame.toFirstMapRenderMs)} ms to first map draw` : "n/a"} | load ${s.load ? `${f1(s.load.dataMs)} ms data, ${f1(s.load.toFirstMapRenderMs)} ms to map` : "n/a"}`
            ];
            for (let i = 0; i < lines.length; i++) b.drawText(lines[i], 4, 2 + i * 16, b.width - 8, 16, "left");
        }
        function attachOverlay(scene) {
            if (!st.enabled || !scene || typeof Sprite === "undefined" || typeof Bitmap === "undefined") return;
            if (overlay && overlay.parent === scene) return;
            overlay = new Sprite(new Bitmap(Math.min(Graphics.width - 16, 470), 68));
            overlay.x = 8; overlay.y = 8;
            scene.addChild(overlay);
            refreshOverlay();
        }
        function onTicker() {
            if (!st.enabled) return;
            const t = now();
            if (st.lastTickAt) { const d = t - st.lastTickAt; st.intervalMs = d; push(st.intervals, d); if (d > st.intervalMaxMs) st.intervalMaxMs = d; }
            st.lastTickAt = t;
            st.frames++;
            if (t - st.lastOverlayAt >= st.overlayEverySec * 1000) { st.lastOverlayAt = t; heap(); refreshOverlay(); }
            if (t - st.lastLogAt >= st.logEverySec * 1000) { st.lastLogAt = t; logNow(); }
        }
        function install() {
            if (st.installed) return true;
            if (typeof Graphics === "undefined" || !Graphics._app || !Graphics._app.ticker) return false;
            const app = Graphics._app;
            app.ticker.add(onTicker);   // a second listener; Graphics._onTick stays registered as it was
            const origRender = app.render;
            app.render = function() {
                if (!st.enabled) return origRender.apply(this, arguments);
                const t0 = now();
                const r = origRender.apply(this, arguments);
                const d = now() - t0;
                st.renders++; st.drawMs = d; push(st.draws, d); if (d > st.drawMaxMs) st.drawMaxMs = d;
                const scene = SceneManager._scene;
                if (pendingNewGame && pendingNewGame.awaitRender && scene !== pendingNewGame.sceneAtEntry && mapStarted(scene)) {
                    pendingNewGame.toFirstMapRenderMs = now() - pendingNewGame.t0;
                    st.newGame = { syncMs: pendingNewGame.syncMs, toFirstMapRenderMs: pendingNewGame.toFirstMapRenderMs };
                    pendingNewGame = null;
                }
                if (pendingLoad && pendingLoad.awaitRender && scene !== pendingLoad.sceneAtEntry && scene !== pendingLoad.sceneAtResolve && mapStarted(scene)) {
                    pendingLoad.toFirstMapRenderMs = now() - pendingLoad.t0;
                    st.load = { dataMs: pendingLoad.dataMs, toFirstMapRenderMs: pendingLoad.toFirstMapRenderMs };
                    pendingLoad = null;
                }
                return r;
            };
            st.installed = true;
            return true;
        }
        // The New Game and load boundaries wrap the then-final DataManager methods once, at Scene_Boot.start, after every
        // plugin loaded later than Core has added its own wrapper (DEUS_Speech wraps setupNewGame at load), so the
        // measured span is the complete method; the harness's Scene_Boot.startNormalGame replacement is not touched.
        function wrapLifecycle() {
            if (st.lifecycleWrapped) return;
            st.lifecycleWrapped = true;
            const _Perf_setupNewGame = DataManager.setupNewGame;
            DataManager.setupNewGame = function() {
                if (!st.enabled) return _Perf_setupNewGame.apply(this, arguments);
                pendingLoad = null;   // a New Game ends any pending load boundary
                const t0 = now();
                const p = { t0, sceneAtEntry: SceneManager._scene, syncMs: null, toFirstMapRenderMs: null, awaitRender: false };
                pendingNewGame = p;
                const r = _Perf_setupNewGame.apply(this, arguments);
                p.syncMs = now() - t0;
                p.awaitRender = true;
                st.newGame = { syncMs: p.syncMs, toFirstMapRenderMs: null };
                return r;
            };
            const _Perf_loadGame = DataManager.loadGame;
            DataManager.loadGame = function(savefileId) {
                if (!st.enabled) return _Perf_loadGame.apply(this, arguments);
                pendingNewGame = null;   // a load ends any pending New Game boundary
                const t0 = now();
                const p = { t0, sceneAtEntry: SceneManager._scene, sceneAtResolve: null, dataMs: null, toFirstMapRenderMs: null, awaitRender: false };
                pendingLoad = p;
                return _Perf_loadGame.apply(this, arguments).then(res => {
                    p.dataMs = now() - t0;
                    p.sceneAtResolve = SceneManager._scene;   // the first map draw counts only for a map started after this
                    p.awaitRender = true;
                    st.load = { dataMs: p.dataMs, toFirstMapRenderMs: null };
                    return res;
                }, err => { if (pendingLoad === p) pendingLoad = null; throw err; });
            };
        }
        const _Perf_Scene_Boot_start = Scene_Boot.prototype.start;
        Scene_Boot.prototype.start = function() {
            wrapLifecycle();
            _Perf_Scene_Boot_start.apply(this, arguments);
        };
        const _Perf_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
        Scene_Map.prototype.createDisplayObjects = function() {
            _Perf_createDisplayObjects.call(this);
            if (st.enabled) { install(); attachOverlay(this); }
        };
        function setEnabled(on) {
            const was = st.enabled;
            st.enabled = !!on;
            st.lastTickAt = 0;   // the first callback after an enable (or a disable) is a boundary, not an interval sample
            if (st.enabled) {
                if (!st.since) st.since = now();
                if (typeof Scene_Boot !== "undefined" && SceneManager._scene && !(SceneManager._scene instanceof Scene_Boot)) wrapLifecycle();
                install();
                const s = SceneManager._scene;
                if (s instanceof Scene_Map) attachOverlay(s);
            } else {
                if (was) { pendingNewGame = null; pendingLoad = null; }   // a boundary cannot span disabled time
                if (overlay && overlay.parent) { overlay.parent.removeChild(overlay); overlay = null; }
            }
            return st.enabled;
        }
        function tick(ms) {
            if (!st.enabled) return;
            st.simTicks++;
            st.simTickMs = ms;
            push(st.simTicksMs, ms);
            if (ms > st.simTickMaxMs) st.simTickMaxMs = ms;
        }
        return { setEnabled, isEnabled: () => st.enabled, isInstalled: () => st.installed, snapshot, tick, logNow, line, refreshOverlay };
    })();
    window.UF.Perf = Perf;
    {
        const argv = (typeof nw !== "undefined" && nw.App && nw.App.argv) ? nw.App.argv : [];
        const env = typeof process !== "undefined" && process.env ? process.env.DEUS_PERF : undefined;
        if (argv.includes("--deus-perf") || env === "1") Perf.setEnabled(true);
    }

    //-----------------------------------------------------------------------------
    // Scene_Map Update Hook
    //-----------------------------------------------------------------------------
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        $ufTime.update();
        const timeApi = window.UF && UF.Time;
        if (timeApi && typeof timeApi.update === "function") {
            timeApi.update(FRAME_DT);
        }
    };

    //-----------------------------------------------------------------------------
    // Clock HUD Window
    //-----------------------------------------------------------------------------
    class Window_UFClockHUD extends Window_Base {
        constructor(rect) {
            super(rect);
            this.opacity = 210;
            this._lastTimeStr = "";
            this.refresh();
        }

        update() {
            super.update();
            this.visible = $ufTime.showHUD;
            if (this.visible && this._lastTimeStr !== $ufTime.timeString) {
                this.refresh();
            }
        }

        refresh() {
            this._lastTimeStr = $ufTime.timeString;
            this.contents.clear();
            this.contents.fontSize = 14;
            
            // Gold header
            this.changeTextColor(ColorManager.textColor(14)); // Yellow/gold
            this.drawText("DEUS", 0, 0, this.innerWidth, "center");
            
            // Time & Date
            this.changeTextColor(ColorManager.normalColor());
            this.drawText($ufTime.timeString, 8, 20, 60, "left");
            this.changeTextColor(ColorManager.textColor(6)); // Soft cyan
            this.drawText(`${$ufTime.day} ${$ufTime.monthName}`, 70, 20, this.innerWidth - 74, "right");
        }
    }

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        // Clock HUD window removed per user request
    };

    //-----------------------------------------------------------------------------
    // Plugin Commands
    //-----------------------------------------------------------------------------
    PluginManager.registerCommand(pluginName, "SetTime", args => {
        $ufTime.setTime(parseInt(args.hour, 10), parseInt(args.minute, 10));
    });

    PluginManager.registerCommand(pluginName, "AddTime", args => {
        $ufTime.advanceMinute(parseInt(args.minutes, 10));
    });

    // Enforce formal game title 'Deus'
    const _Scene_Boot_updateDocumentTitle = Scene_Boot.prototype.updateDocumentTitle;
    Scene_Boot.prototype.updateDocumentTitle = function() {
        document.title = "Deus";
    };

    // Global crash diagnostics: write unhandled exceptions and error screens to test_output/last_crash.txt
    if (typeof window !== "undefined") {
        window.addEventListener("error", event => {
            try {
                if (typeof require === "function") {
                    const fs = require("fs");
                    const path = require("path");
                    const logPath = path.join(process.cwd(), "test_output", "last_crash.txt");
                    const err = event.error || {};
                    const text = `Uncaught Exception: ${event.message}\nFile: ${event.filename}:${event.lineno}:${event.colno}\n\nStack:\n${err.stack || "none"}\n`;
                    fs.writeFileSync(logPath, text, "utf8");
                }
            } catch (_) {}
        });
    }
    if (typeof Graphics !== "undefined" && typeof Graphics.printError === "function") {
        const _Graphics_printError = Graphics.printError;
        Graphics.printError = function(name, message, error = null) {
            try {
                if (typeof require === "function") {
                    const fs = require("fs");
                    const path = require("path");
                    const logPath = path.join(process.cwd(), "test_output", "last_crash.txt");
                    const stack = (error && error.stack) ? error.stack : (new Error().stack);
                    const text = `Graphics.printError: ${name} - ${message}\n\nStack:\n${stack}\n`;
                    fs.writeFileSync(logPath, text, "utf8");
                }
            } catch (_) {}
            _Graphics_printError.call(this, name, message, error);
        };
    }

})();
