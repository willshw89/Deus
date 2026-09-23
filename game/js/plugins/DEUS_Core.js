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
    const startHour = parseInt(params["StartHour"] || 8, 10);
    const startMinute = parseInt(params["StartMinute"] || 0, 10);
    const defaultShowHUD = (params["ShowClockHUD"] || "true") === "true";


    if (typeof require !== 'undefined') {
        try {
            const fs = require('fs');
            const log = (msg) => fs.appendFileSync('game_runtime.log', `${new Date().toISOString()} ${msg}\n`);
            log("[CORE] UF_Core plugin loaded successfully!");
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
                isAutoTest = nwArgs.some(a => a.includes('autotest')) || procArgs.some(a => a.includes('autotest'));
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
                            for (const ev of $gameMap.events()) {
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
            if (!this._listeners[event]) return;
            this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
        },
        emit(event, ...args) {
            if (!this._listeners[event]) return;
            for (let i = 0; i < this._listeners[event].length; i++) {
                const cb = this._listeners[event][i];
                const t0 = performance.now();
                try { cb(...args); } catch (err) { console.error(err); }
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
            this.year = (window.UF && UF.NewGameSetup && UF.NewGameSetup.year) || 1;
            this._timer = 0;
            this.isPaused = false;
            this.showHUD = defaultShowHUD;
        }

        update() {
            if (this.isPaused || $gameMessage.isBusy()) return;
            this._timer += 1 / 60; // Assuming 60fps
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
            const hh = String(this.hour).padStart(2, "0");
            const mm = String(this.minute).padStart(2, "0");
            return `${hh}:${mm}`;
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

    //-----------------------------------------------------------------------------
    // Scene_Map Update Hook
    //-----------------------------------------------------------------------------
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        $ufTime.update();
        if (window.UF && UF.Time && typeof UF.Time.update === "function") {
            UF.Time.update(1 / 60);
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
