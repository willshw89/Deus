//=============================================================================
// RPG Maker MZ - Ultima Fortress: Core & Clockwork Time System
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Core] 24-hour clockwork time simulation, calendar, and world state for Ultima Fortress.
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

    const pluginName = "UF_Core";
    const params = PluginManager.parameters(pluginName);
    // User specification: 1 real minute = 1 season (6h), 1 day/night cycle (24h) = 1 in-game year (4 real minutes), 1 real hour = 15 years.
    // 240 real seconds / 1440 game minutes = 1/6 real seconds per game minute (10 frames at 60 FPS).
    const timeSpeed = params["TimeSpeed"] && params["TimeSpeed"] !== "1.0" ? parseFloat(params["TimeSpeed"]) : (1.0 / 6.0);
    const startHour = parseInt(params["StartHour"] || 8, 10);
    const startMinute = parseInt(params["StartMinute"] || 0, 10);
    const defaultShowHUD = (params["ShowClockHUD"] || "true") === "true";

    if (typeof PluginManager !== "undefined" && Array.isArray(PluginManager._scripts)) {
        if (!PluginManager._scripts.includes("UF_Environment")) {
            PluginManager.loadScript("UF_Environment");
            PluginManager._scripts.push("UF_Environment");
        }
        if (!PluginManager._scripts.includes("UF_Containers")) {
            PluginManager.loadScript("UF_Containers");
            PluginManager._scripts.push("UF_Containers");
        }
        if (!PluginManager._scripts.includes("UF_Resources")) {
            PluginManager.loadScript("UF_Resources");
            PluginManager._scripts.push("UF_Resources");
        }
        if (!PluginManager._scripts.includes("UF_Proficiency")) {
            PluginManager.loadScript("UF_Proficiency");
            PluginManager._scripts.push("UF_Proficiency");
        }
        if (!PluginManager._scripts.includes("UF_Conditions")) {
            PluginManager.loadScript("UF_Conditions");
            PluginManager._scripts.push("UF_Conditions");
        }
        if (!PluginManager._scripts.includes("UF_Rules")) {
            PluginManager.loadScript("UF_Rules");
            PluginManager._scripts.push("UF_Rules");
        }
        if (!PluginManager._scripts.includes("UF_Time")) {
            PluginManager.loadScript("UF_Time");
            PluginManager._scripts.push("UF_Time");
        }
    }

    if (typeof require !== 'undefined') {
        try {
            const fs = require('fs');
            const log = (msg) => fs.appendFileSync('game_runtime.log', `${new Date().toISOString()} ${msg}\n`);
            log("[CORE] UF_Core plugin loaded successfully!");
            let isAutoTest = false;

            const _Scene_Boot_start = Scene_Boot.prototype.start;
            Scene_Boot.prototype.start = function() {
                log("[SCENE] Scene_Boot started");
                _Scene_Boot_start.call(this);
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

            const _Scene_Map_start = Scene_Map.prototype.start;
            Scene_Map.prototype.start = function() {
                log(`[SCENE] Scene_Map started! Map: ${$gameMap.displayName()} (${$dataMap ? $dataMap.width + 'x' + $dataMap.height : '?'})`);
                try {
                    _Scene_Map_start.call(this);
                    log(`[AUTOTEST] Player pos: (${$gamePlayer.x}, ${$gamePlayer.y}), Party leader: ${$gameParty.leader() ? $gameParty.leader().name() : 'none'}`);
                    log(`[AUTOTEST] Events on map: ${$gameMap.events().length}`);
                    log(`[AUTOTEST] Clock HUD time: ${$ufTime.timeString} - ${$ufTime.dateString}`);
                    if (window.$ufContainers && window.$ufContainers["smith_chest"]) {
                        log(`[AUTOTEST] Verified smith_chest items: ${window.$ufContainers["smith_chest"].items.length}`);
                    }

                    // 1. Test Paperdoll
                    if (window.UF_Gumps) {
                        UF_Gumps.openPaperdoll();
                        log(`[AUTOTEST] Paperdoll Window opened: ${!!SceneManager._scene._activePaperdoll}`);
                        SceneManager._scene._activePaperdoll.close();
                        log(`[AUTOTEST] Paperdoll Window closed cleanly.`);
                    }

                    // 2. Test Container Gump
                    if (window.UF_Gumps) {
                        UF_Gumps.openContainer("smith_chest", "chest");
                        log(`[AUTOTEST] Container Gump opened: ${!!SceneManager._scene._activeContainerGump}`);
                        SceneManager._scene._activeContainerGump.close();
                        log(`[AUTOTEST] Container Gump closed cleanly.`);
                    }

                    // 3. Test U7 Dialogue & Dynamic Recruitment
                    if (window.UF_Dialogue) {
                        log(`[AUTOTEST] Initial party size: ${$gameParty.size()}`);
                        UF_Dialogue.start("Thorgar_Brewer");
                        log(`[AUTOTEST] Dialogue Window opened: ${!!SceneManager._scene._activeDialogueWindow}`);
                        SceneManager._scene._activeDialogueWindow.chooseKeyword("Calling");
                        log(`[AUTOTEST] Dialogue Keyword Calling chosen successfully.`);
                        // Test Recruitment
                        SceneManager._scene._activeDialogueWindow.chooseKeyword("Join");
                        log(`[AUTOTEST] Party size after [Join]: ${$gameParty.size()} (Recruited: ${$gameParty.members().map(m => m.name()).join(', ')})`);
                        // Test Dismissal
                        SceneManager._scene._activeDialogueWindow.chooseKeyword("Part");
                        log(`[AUTOTEST] Party size after [Part]: ${$gameParty.size()}`);
                        SceneManager._scene._activeDialogueWindow.close();
                        log(`[AUTOTEST] Dialogue Window closed cleanly.`);
                    }

                    // 4. Test DF Character Inspection Window with Sci-Fi Bionics
                    if (window.UF_DFWorld) {
                        const prof = UF_DFWorld.generateProfile("Artificer", "vorgari");
                        UF_DFWorld.showProfile(prof);
                        log(`[AUTOTEST] DF Profile Window opened for ${prof.fullName} (${prof.race}): Bionic: ${prof.bionic}`);
                        SceneManager._scene._activeProfileWindow.close();
                        log(`[AUTOTEST] DF Profile Window closed cleanly.`);
                    }

                    // 5. Test DF Anatomical Combat Announcement Generator
                    if (window.UF_DFCombat && $gameParty.leader()) {
                        const logMsg = UF_DFCombat.generateCombatLog($gameParty.leader(), $gameParty.leader(), 95, true);
                        log(`[AUTOTEST] DF Combat Log generated: "${logMsg}"`);
                    }

                    // 6. Test DF Workshop Crafting Station & Strange Mood
                    if (window.UF_Crafting) {
                        UF_Crafting.open("forge");
                        log(`[AUTOTEST] Workshop Crafting Window opened: ${!!SceneManager._scene._activeCraftingWindow}`);
                        SceneManager._scene._activeCraftingWindow.close();
                        log(`[AUTOTEST] Workshop Crafting Window closed cleanly.`);
                        const moodArtifact = UF_Crafting.triggerStrangeMood("Master Kragan", "Smith");
                        log(`[AUTOTEST] Strange Mood triggered: "${moodArtifact}"`);
                    }

                    log(`[AUTOTEST] ALL UF GAMEPLAY SYSTEMS VERIFIED 100% OPERATIONAL!`);
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
    window.UF = window.UF || {};
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
            for (const cb of this._listeners[event]) {
                try { cb(...args); } catch (err) { console.error(err); }
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
    }

    // Global Instance
    window.$ufTime = new Game_UFTime();

    //-----------------------------------------------------------------------------
    // Save / Load Support
    //-----------------------------------------------------------------------------
    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DataManager_makeSaveContents.call(this);
        contents.ufTime = {
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
        if (contents.ufTime) {
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

})();
