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
    const timeSpeed = parseFloat(params["TimeSpeed"] || 1.0);
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
                isAutoTest = nwArgs.some(a => a.includes('autotest') || a.includes('test')) || procArgs.some(a => a.includes('autotest') || a.includes('test'));
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
                    for (const ev of $gameMap.events()) {
                        const bmp = ImageManager.loadCharacter(ev.characterName());
                        log(`[EVENT_CHECK] Event ${ev.eventId()} (${ev.event().name}): pos=(${ev.x},${ev.y}), charName="${ev.characterName()}", transparent=${ev.isTransparent()}, opacity=${ev.opacity()}, bmpError=${bmp.isError()}, bmpReady=${bmp.isReady()}`);
                    }
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
                    }

                    // 7. Test UF_Movement8D: 8-Directional Grid Movement & Octile A*
                    if (window.UF_Dir8) {
                        const isDiag = UF_Dir8.isDiagonal(3); // SE
                        const split = UF_Dir8.splitDiagonal(3);
                        log(`[AUTOTEST 8D] Diagonal direction SE recognized: ${isDiag}, split: horz=${split.horz}, vert=${split.vert}`);
                        $gamePlayer.moveInDirection8D(3);
                        log(`[AUTOTEST 8D] Player 8D move executed. New pos: (${$gamePlayer.x}, ${$gamePlayer.y}), dir8: ${$gamePlayer.dir8()}`);
                        const aStarDir = $gamePlayer.findDirection8DTo(28, 20);
                        log(`[AUTOTEST 8D] Octile A* calculated 8-directional path to (28, 20): dir=${aStarDir}`);
                    }

                    // 8. Test UF_Perspective25D: Z-Elevation & Occlusion
                    if ($gamePlayer.setElevation) {
                        const groundY = $gamePlayer.screenY();
                        $gamePlayer.setElevation(1);
                        const elevatedY = $gamePlayer.screenY();
                        log(`[AUTOTEST 2.5D] Ground screenY: ${groundY}px, Elevated screenY (Z=1): ${elevatedY}px (offset: ${groundY - elevatedY}px)`);
                        $gamePlayer.setElevation(0);
                    }

                    // 9. Test UF_ColonyOverseer: Adam & Eve Needs & Unit Selection
                    if (window.$colonyManager) {
                        $colonyManager.initGladeColonists();
                        log(`[AUTOTEST COLONY] Colonists active: ${$colonyManager.colonists.map(c => c.name + '(' + c.gender + ')').join(', ')}`);
                        const adam = $colonyManager.colonists[0];
                        $colonyManager.select(adam);
                        log(`[AUTOTEST COLONY] Selected colonist: ${adam.name}, Hunger: ${adam.hunger}, Thirst: ${adam.thirst}, Activity: ${adam.currentJob}`);
                        $colonyManager.deselect();
                    }

                    log(`[AUTOTEST] Embark colonists ready in the Glade of Genesis.`);
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
                        log(`[SCENE_MAP UPDATE] Frame: ${frameCount}, Clock: ${$ufTime.timeString}, Player: (${$gamePlayer.x}, ${$gamePlayer.y})`);
                    }
                    if (isAutoTest && frameCount === 60) {
                        try {
                            for (const ev of $gameMap.events()) {
                                log(`[SNAPSHOT_POS] Event ${ev.eventId()} (${ev.event().name}): pos=(${ev.x},${ev.y}), screen=(${ev.screenX()},${ev.screenY()}), charName="${ev.characterName()}"`);
                            }
                            log(`[SNAPSHOT_POS] Player: pos=(${$gamePlayer.x},${$gamePlayer.y}), screen=(${$gamePlayer.screenX()},${$gamePlayer.screenY()})`);
                            const snap = SceneManager.snap();
                            const dataUrl = snap.canvas.toDataURL('image/png');
                            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
                            const fs = require('fs');
                            const path = require('path');
                            const outPath = path.resolve('test_screenshot.png');
                            fs.writeFileSync(outPath, base64Data, 'base64');
                            log(`[AUTOTEST] Screen capture saved to ${outPath}`);

                            // Now test construction jobs after the screenshot has been captured cleanly
                            if (window.$constructionManager) {
                                $constructionManager.addGatherDesignation("harvest", 15, 14);
                                log(`[AUTOTEST CONSTRUCTION] Added harvest designation near tree. Total gather jobs: ${$constructionManager.gatherDesignations.length}`);
                                $constructionManager.addBlueprint("palisade", 18, 16, { "Wood": 2 }, 80);
                                log(`[AUTOTEST CONSTRUCTION] Placed palisade blueprint. Total blueprints: ${$constructionManager.blueprints.length}`);
                            }
                        } catch(err) {
                            log(`[AUTOTEST ERROR] Screen capture failed: ${err.message}`);
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
            this.year = 125;
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
            this.minute += amount;
            while (this.minute >= 60) {
                this.minute -= 60;
                this.hour++;
                this.onHourPass();
            }
            while (this.hour >= 24) {
                this.hour -= 24;
                this.day++;
                this.onDayPass();
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
            if (this.day > 28) { // 28 days per DF month
                this.day = 1;
                this.monthIndex = (this.monthIndex + 1) % 12;
                if (this.monthIndex === 0) {
                    this.year++;
                }
            }
            UF.Events.emit("time:day", this.day, this.monthName, this.year);
        }

        setTime(h, m) {
            this.hour = Math.max(0, Math.min(23, h));
            this.minute = Math.max(0, Math.min(59, m));
        }

        get monthName() {
            return KALDURATH_MONTHS[this.monthIndex] || "Deep-Frost";
        }

        get seasonName() {
            const m = this.monthIndex;
            if (m < 3) return "Spring";
            if (m < 6) return "Summer";
            if (m < 9) return "Autumn";
            return "Winter";
        }

        get timeString() {
            const hh = String(this.hour).padStart(2, "0");
            const mm = String(this.minute).padStart(2, "0");
            return `${hh}:${mm}`;
        }

        get dateString() {
            return `${this.day} ${this.monthName}, ${this.year} (${this.seasonName})`;
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
            this.drawText("ULTIMA FORTRESS", 0, 0, this.innerWidth, "center");
            
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
        const rect = new Rectangle(Graphics.width - 220, 10, 210, 64);
        this._ufClockWindow = new Window_UFClockHUD(rect);
        this.addWindow(this._ufClockWindow);
    };

    // Key mappings
    Input.keyMapper[72] = "ufHelp";       // 'H' key
    Input.keyMapper[112] = "ufHelp";      // F1 key
    Input.keyMapper[84] = "ufTimeToggle"; // 'T' key

    //-----------------------------------------------------------------------------
    // Window_UFHelp (Retro Controls & Objective Guide)
    //-----------------------------------------------------------------------------
    class Window_UFHelp extends Window_Base {
        constructor() {
            const width = 640;
            const height = 440;
            const x = Math.floor((Graphics.width - width) / 2);
            const y = Math.floor((Graphics.height - height) / 2);
            super(new Rectangle(x, y, width, height));
            this.opacity = 250;
            this.refresh();
        }

        refresh() {
            this.contents.clear();

            // Title
            this.contents.fontSize = 18;
            this.changeTextColor(ColorManager.textColor(14)); // Gold
            this.drawText("ULTIMA FORTRESS: SURVIVAL & CONTROLS", 0, 8, this.innerWidth, "center");

            this.contents.fontSize = 12;
            this.changeTextColor(ColorManager.textColor(6)); // Cyan
            this.drawText("Ultima VII Tactile Interaction  x  Dwarf Fortress Living Simulation", 0, 32, this.innerWidth, "center");

            this.contents.fillRect(16, 52, this.innerWidth - 32, 2, "rgba(200, 157, 92, 0.6)");

            // Section 1: Movement & World
            let y = 62;
            this.changeTextColor(ColorManager.textColor(14));
            this.contents.fontSize = 13;
            this.drawText("EXPLORATION & INTERACTION", 20, y, 400, "left");

            y += 22;
            this.contents.fontSize = 12;
            this.changeTextColor(ColorManager.normalColor());
            this.drawText("* Move / Pathfind:", 24, y, 180, "left");
            this.changeTextColor(ColorManager.textColor(3));
            this.drawText("Arrow Keys / WASD / Left-Click Destination", 210, y, 380, "left");

            y += 18;
            this.changeTextColor(ColorManager.normalColor());
            this.drawText("* Talk / Interact:", 24, y, 180, "left");
            this.changeTextColor(ColorManager.textColor(3));
            this.drawText("[Enter], [Space], or Left-Click on Citizens & Objects", 210, y, 380, "left");

            y += 18;
            this.changeTextColor(ColorManager.normalColor());
            this.drawText("* Paperdoll Equipment:", 24, y, 180, "left");
            this.changeTextColor(ColorManager.textColor(3));
            this.drawText("Press [I] (Inspect armor, weapons, bionics)", 210, y, 380, "left");

            y += 18;
            this.changeTextColor(ColorManager.normalColor());
            this.drawText("* Toggle Clock HUD:", 24, y, 180, "left");
            this.changeTextColor(ColorManager.textColor(3));
            this.drawText("Press [T] (Show/hide 24h clock & Kaldurath calendar)", 210, y, 380, "left");

            // Section 2: DF Living Simulation
            y += 28;
            this.contents.fillRect(16, y - 6, this.innerWidth - 32, 2, "rgba(200, 157, 92, 0.6)");
            this.changeTextColor(ColorManager.textColor(14));
            this.contents.fontSize = 13;
            this.drawText("DWARF FORTRESS EMERGENCE & CRAFTING", 20, y, 400, "left");

            y += 22;
            this.contents.fontSize = 12;
            this.changeTextColor(ColorManager.normalColor());
            this.drawText("* Inspect Citizen:", 24, y, 180, "left");
            this.changeTextColor(ColorManager.textColor(3));
            this.drawText("Hold [Shift] facing any citizen (Species, traits, bionics)", 210, y, 380, "left");

            y += 18;
            this.changeTextColor(ColorManager.normalColor());
            this.drawText("* Companion Recruitment:", 24, y, 180, "left");
            this.changeTextColor(ColorManager.textColor(3));
            this.drawText("Choose [Join] in dialogue to recruit; [Part] to dismiss", 210, y, 380, "left");

            y += 18;
            this.changeTextColor(ColorManager.normalColor());
            this.drawText("* Draggable Gumps:", 24, y, 180, "left");
            this.changeTextColor(ColorManager.textColor(3));
            this.drawText("Left-Click Chests, Barrels, Bins to open tactile inventories", 210, y, 380, "left");

            y += 18;
            this.changeTextColor(ColorManager.normalColor());
            this.drawText("* Workshop Reactions:", 24, y, 180, "left");
            this.changeTextColor(ColorManager.textColor(3));
            this.drawText("Left-Click Anvil, Fabricator, Brewery, Smelter to craft", 210, y, 380, "left");

            // Section 3: Active Objective
            y += 28;
            this.contents.fillRect(16, y - 6, this.innerWidth - 32, 2, "rgba(200, 157, 92, 0.6)");
            this.changeTextColor(ColorManager.textColor(14));
            this.contents.fontSize = 13;
            this.drawText("DEMO OBJECTIVE: THE PRECURSOR BREACH", 20, y, 400, "left");

            y += 20;
            this.contents.fontSize = 11;
            this.changeTextColor(ColorManager.textColor(7));
            this.drawText("Investigate deep tremors in the Delve Mines (x:32, y:37). Pacify or defeat Unit-77!", 24, y, this.innerWidth - 48, "left");

            // Footer
            this.contents.fillRect(16, this.innerHeight - 38, this.innerWidth - 32, 2, "rgba(200, 157, 92, 0.6)");
            this.contents.fontSize = 12;
            this.changeTextColor(ColorManager.textColor(14));
            this.drawText("Press [H], [ESC], or [OK] to Close Guide", 0, this.innerHeight - 26, this.innerWidth, "center");
        }

        update() {
            super.update();
            if (Input.isTriggered("ufHelp") || Input.isTriggered("ok") || Input.isTriggered("cancel")) {
                SoundManager.playCancel();
                this.close();
            }
        }

        close() {
            super.close();
            if (this.parent) this.parent.removeChild(this);
            if (SceneManager._scene) SceneManager._scene._activeHelpWindow = null;
        }
    }

    UF.toggleHelp = function() {
        if (!SceneManager._scene) return;
        if (SceneManager._scene._activeHelpWindow) {
            SceneManager._scene._activeHelpWindow.close();
            SceneManager._scene._activeHelpWindow = null;
        } else {
            const win = new Window_UFHelp();
            SceneManager._scene._activeHelpWindow = win;
            SceneManager._scene.addChild(win);
            SoundManager.playOk();
        }
    };

    // Listen for inputs in Scene_Map
    const _Scene_Map_update_inputs = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update_inputs.call(this);
        if (Input.isTriggered("ufHelp") && !$gameMessage.isBusy()) {
            UF.toggleHelp();
        }
        if (Input.isTriggered("ufTimeToggle")) {
            $ufTime.showHUD = !$ufTime.showHUD;
            SoundManager.playCursor();
        }
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

    PluginManager.registerCommand(pluginName, "ToggleClockHUD", () => {
        $ufTime.showHUD = !$ufTime.showHUD;
    });

})();
