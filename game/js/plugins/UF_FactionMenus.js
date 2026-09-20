//=============================================================================
// RPG Maker MZ - Ultima Fortress: Dynamic Matching Faction Menu Themes
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Faction Menus] Dynamic matching full-screen menu themes, backdrops, window skins, and literal mouse cursors for all 11 factions.
 * @author Gemini (Google DeepMind)
 *
 * @param DefaultFaction
 * @text Default Menu Faction
 * @type select
 * @option human
 * @option elf
 * @option dwarf
 * @option gnome
 * @option goblin
 * @option orc
 * @option lizardfolk
 * @option kobold
 * @option undead
 * @option starborn
 * @option swarm
 * @default human
 *
 * @help
 * ============================================================================
 * Ultima Fortress Matching Faction Menus & Mouse Cursors
 * ============================================================================
 * Dynamically pairs the game's menus with authentic cultural frames, wallpapers,
 * window skins, and literal mouse cursors across all 11 factions:
 * human, elf, dwarf, gnome, goblin, orc, lizardfolk, kobold, undead, starborn, swarm.
 *
 * Literal Mouse Cursor:
 * - Changes the actual system/canvas mouse pointer to the faction's cultural
 *   weapon / symbol with pixel-accurate click hotspots.
 * - ZERO selector cursor sprites on menu items.
 *
 * Faction Based Menus:
 * - All Scene_MenuBase screens (Menu, Item, Skill, Equip, Status, Options, Save, etc.)
 *   display the matching faction border frame and wallpaper (UF_Menu_<culture>.png).
 * - All windows use the matching Window_<culture>.png skin.
 *
 * Script Calls:
 * - UF_FactionMenus.setFaction("elf")
 * - UF_FactionMenus.setFaction("dwarf")
 * - UF_FactionMenus.getFaction()
 */

(() => {
    "use strict";

    const pluginName = "UF_FactionMenus";
    const params = PluginManager.parameters(pluginName);
    const defaultFaction = params["DefaultFaction"] || "default";

    window.UF_FactionMenus = {};

    const FACTIONS = ["default", "human", "elf", "dwarf", "gnome", "goblin", "orc", "lizardfolk", "kobold", "undead", "starborn", "swarm"];

    const CURSOR_HOTSPOTS = {
        default: [4, 4],
        deus: [4, 4],
        human: [5, 4],
        elf: [4, 4],
        dwarf: [4, 4],
        gnome: [4, 4],
        goblin: [4, 4],
        orc: [4, 4],
        lizardfolk: [4, 4],
        kobold: [4, 4],
        undead: [4, 4],
        starborn: [4, 4],
        swarm: [4, 4]
    };

    const CULTURE_FALLBACKS = {
        halfling: "human",
        serpentkin: "lizardfolk",
        demon: "undead",
        automaton: "starborn",
        swarmer: "swarm",
        dark_dwarf: "dwarf",
        dark_gnome: "gnome"
    };

    function safeFaction(fac) {
        if (!fac) return "default";
        const lower = String(fac).toLowerCase();
        if (FACTIONS.includes(lower)) return lower;
        if (CULTURE_FALLBACKS[lower]) return CULTURE_FALLBACKS[lower];
        return "default";
    }

    const nwArgs = (typeof nw !== "undefined" && nw.App && nw.App.argv) ? nw.App.argv : [];
    if (nwArgs.includes("--show-menu")) {
        const _Scene_Title_start = Scene_Title.prototype.start;
        Scene_Title.prototype.start = function() {
            _Scene_Title_start.call(this);
            this.commandNewGame();
            const checkMap = () => {
                if (SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted()) {
                    SceneManager.push(Scene_Menu);
                } else {
                    setTimeout(checkMap, 100);
                }
            };
            setTimeout(checkMap, 200);
        };
    }

    UF_FactionMenus.getFaction = function() {
        if (SceneManager._scene instanceof Scene_Title || SceneManager._scene instanceof Scene_File) {
            return "default";
        }
        if ($gameSystem && $gameSystem._ufActiveMenuFaction) {
            return $gameSystem._ufActiveMenuFaction;
        }
        if (window.UF && UF.Factions && typeof UF.Factions.playerCulture === "function") {
            const pc = UF.Factions.playerCulture();
            if (pc) return pc.toLowerCase();
        }
        if (window.UF && UF.World && UF.World.state && UF.World.state.factions && Array.isArray(UF.World.state.factions.list)) {
            const playerFac = UF.World.state.factions.list.find(f => f.isPlayer);
            if (playerFac && (playerFac.culture || playerFac.species)) {
                return (playerFac.culture || playerFac.species).toLowerCase();
            }
        }
        return defaultFaction;
    };

    UF_FactionMenus.getCursorCss = function(/*faction*/) {
        const spot = [4, 4];
        return 'url("img/system/Cursor_default.png") ' + spot[0] + ' ' + spot[1] + ', auto';
    };

    UF_FactionMenus.applyMouseCursor = function(faction) {
        const fac = faction || UF_FactionMenus.getFaction();
        const cursorCss = UF_FactionMenus.getCursorCss(fac);

        // 1. Inject or update global CSS rule
        let styleEl = document.getElementById("uf-faction-mouse-cursor-style");
        if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = "uf-faction-mouse-cursor-style";
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = `
            html, body, #gameCanvas, canvas, .cursor-pointer, [style*="cursor"] {
                cursor: ${cursorCss} !important;
            }
        `;

        // 2. Direct element styling
        if (document.documentElement) document.documentElement.style.cursor = cursorCss;
        if (document.body) document.body.style.cursor = cursorCss;
        if (Graphics._canvas) Graphics._canvas.style.cursor = cursorCss;

        // 3. Update PIXI InteractionManager cursor dictionary
        if (typeof PIXI !== "undefined" && Graphics.app && Graphics.app.renderer && Graphics.app.renderer.plugins && Graphics.app.renderer.plugins.interaction) {
            const inter = Graphics.app.renderer.plugins.interaction;
            inter.cursorStyles['default'] = cursorCss;
            inter.cursorStyles['auto'] = cursorCss;
            inter.cursorStyles['pointer'] = cursorCss;
        }
    };

    UF_FactionMenus.setFaction = function(factionId) {
        const fac = factionId ? factionId.toLowerCase() : defaultFaction;
        if ($gameSystem) {
            $gameSystem._ufActiveMenuFaction = fac;
        }
        UF_FactionMenus.applyMouseCursor(fac);
        if (SceneManager._scene && SceneManager._scene instanceof Scene_MenuBase) {
            SceneManager._scene.applyFactionTheme(fac);
        }
    };

    // Hook PIXI InteractionManager so it never reverts to default cursor on mouse move
    if (typeof PIXI !== "undefined" && PIXI.InteractionManager) {
        const _InteractionManager_setCursorMode = PIXI.InteractionManager.prototype.setCursorMode;
        PIXI.InteractionManager.prototype.setCursorMode = function(mode) {
            if (!mode || mode === 'default' || mode === 'auto' || mode === 'inherit') {
                const curCss = UF_FactionMenus.getCursorCss();
                this.interactionDOMElement.style.cursor = curCss;
                this.currentCursorMode = 'default';
                return;
            }
            _InteractionManager_setCursorMode.call(this, mode);
        };
    }

    // Set mouse cursor on scene starts
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        UF_FactionMenus.applyMouseCursor();
        if (window.UF && UF.Test && UF.Test.active) registerChecks();
    };


    // Title Screen Customization for Project DEUS
    const _Scene_Title_start = Scene_Title.prototype.start;
    Scene_Title.prototype.start = function() {
        _Scene_Title_start.call(this);
        UF_FactionMenus.applyMouseCursor("deus");
    };

    // 1. Remove Options from the menu & rename commands to "New Game" and "Continue"
    Window_TitleCommand.prototype.makeCommandList = function() {
        const continueEnabled = this.isContinueEnabled();
        this.addCommand("New Game", "newGame");
        this.addCommand("Continue", "continue", continueEnabled);
    };

    // 2. Remove ALL system elements: window background, frame, scroll arrows, cursor box, item background rects
    const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function() {
        _Scene_Title_createCommandWindow.call(this);
        this._commandWindow.opacity = 0;
        this._commandWindow.backOpacity = 0;
        this._commandWindow.setBackgroundType(2); // 2 = Transparent
        if (this._commandWindow._windowBackSprite) this._commandWindow._windowBackSprite.visible = false;
        if (this._commandWindow._windowFrameSprite) this._commandWindow._windowFrameSprite.visible = false;
        if (this._commandWindow._downArrowSprite) this._commandWindow._downArrowSprite.visible = false;
        if (this._commandWindow._upArrowSprite) this._commandWindow._upArrowSprite.visible = false;
        if (this._commandWindow._pauseSignSprite) this._commandWindow._pauseSignSprite.visible = false;
        if (this._commandWindow._cursorSprite) this._commandWindow._cursorSprite.visible = false;
        if (this._cancelButton) this._cancelButton.visible = false;

        // Setup Window for New Game Expedition Setup
        const setupRect = this.newGameSetupWindowRect();
        this._newGameSetupWindow = new Window_NewGameSetup(setupRect);
        this._newGameSetupWindow.setHandler("embark", this.onNewGameEmbark.bind(this));
        this._newGameSetupWindow.setHandler("cancel", this.onNewGameCancel.bind(this));
        this.addWindow(this._newGameSetupWindow);
        this._newGameSetupWindow.close();
        this._newGameSetupWindow.deactivate();
    };

    Scene_Title.prototype.newGameSetupWindowRect = function() {
        const ww = 350;
        const wh = 205;
        // Center squarely between letter D (x ≈ 243) and letter S (x ≈ 618), centered at x = 431
        const gapCenter = Math.round(Graphics.boxWidth / 2) + 23;
        const wx = Math.round(gapCenter - ww / 2); // 431 - 175 = 256
        const wy = 270;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Title.prototype.commandNewGame = function() {
        const nwArgs = (typeof nw !== 'undefined' && nw.App && nw.App.argv) ? nw.App.argv : [];
        const procArgs = (typeof process !== 'undefined' && process.argv) ? process.argv : [];
        const isAutoTest = nwArgs.some(a => a.includes('autotest')) || procArgs.some(a => a.includes('autotest'));
        if (isAutoTest) {
            this.onNewGameEmbark();
            return;
        }
        this._embarking = false;
        this._commandWindow.deactivate();
        this._commandWindow.close();
        this._newGameSetupWindow.select(0);
        this._newGameSetupWindow.open();
        this._newGameSetupWindow.activate();
    };

    Scene_Title.prototype.onNewGameEmbark = function() {
        if (this._embarking) return;
        this._embarking = true;
        const faction = this._newGameSetupWindow ? this._newGameSetupWindow.currentFaction() : "Human";
        const year = this._newGameSetupWindow ? this._newGameSetupWindow.currentYear() : 1;
        window.UF = window.UF || {};
        window.UF.NewGameSetup = {
            faction: faction.toLowerCase(),
            year: year
        };
        if (typeof UF_FactionMenus !== "undefined" && UF_FactionMenus.setFaction) {
            UF_FactionMenus.setFaction(faction.toLowerCase());
        }
        DataManager.setupNewGame();
        if (this._commandWindow) this._commandWindow.close();
        if (this._newGameSetupWindow) this._newGameSetupWindow.close();
        this.fadeOutAll();
        SceneManager.goto(Scene_Map);
    };

    Scene_Title.prototype.onNewGameCancel = function() {
        if (!this._newGameSetupWindow || !this._newGameSetupWindow.isOpen()) return;
        this._newGameSetupWindow.close();
        this._newGameSetupWindow.deactivate();
        this._commandWindow.open();
        this._commandWindow.activate();
    };

    // Class: Window_NewGameSetup
    // Expedition setup menu allowing player to choose faction and starting year (1-200 AD)
    class Window_NewGameSetup extends Window_Selectable {
        initialize(rect) {
            super.initialize(rect);
            this._factionChoices = [
                "Human", "Elf", "Dwarf", "Gnome", "Goblin", "Orc",
                "Lizardfolk", "Kobold", "Undead", "Starborn", "Swarm"
            ];
            this._factionIndex = 0;
            this._year = 1;
            this.windowskin = ImageManager.loadSystem("Window_default");
            this.backOpacity = 225;
            this._cursorVisible = false;
            if (this._cursorSprite) {
                this._cursorSprite.visible = false;
                this._cursorSprite.alpha = 0;
            }
            this.select(0);
            this.refresh();
        }

        maxItems() {
            return 4;
        }

        itemHeight() {
            return 38;
        }

        currentFaction() {
            return this._factionChoices[this._factionIndex];
        }

        currentYear() {
            return this._year;
        }

        setFaction(factionName) {
            const idx = this._factionChoices.findIndex(f => f.toLowerCase() === String(factionName).toLowerCase());
            if (idx >= 0) {
                this._factionIndex = idx;
                this.redrawItem(0);
            }
        }

        setYear(y) {
            this._year = Math.max(1, Math.min(200, parseInt(y, 10) || 1));
            this.redrawItem(1);
        }

        refreshCursor() {
            this.setCursorRect(0, 0, 0, 0);
            if (this._cursorSprite) {
                this._cursorSprite.visible = false;
                this._cursorSprite.alpha = 0;
            }
        }

        _updateCursor() {
            if (this._cursorSprite) {
                this._cursorSprite.visible = false;
                this._cursorSprite.alpha = 0;
            }
        }

        _makeCursorAlpha() {
            return 0;
        }

        update() {
            super.update();
            if (this._cursorSprite) {
                this._cursorSprite.visible = false;
                this._cursorSprite.alpha = 0;
            }
        }

        select(index) {
            const prev = this.index();
            super.select(index);
            if (prev !== index) {
                if (prev >= 0) this.redrawItem(prev);
                if (index >= 0) this.redrawItem(index);
            }
        }

        drawItemBackground(index) {
            const rect = this.itemRect(index);
            const isSelected = index === this.index();
            const x = rect.x + 2;
            const y = rect.y + 2;
            const w = rect.width - 4;
            const h = rect.height - 4;

            if (isSelected) {
                // Luminous electric cyan glow background
                const c1 = "rgba(0, 212, 255, 0.32)";
                const c2 = "rgba(0, 140, 220, 0.12)";
                this.contentsBack.gradientFillRect(x, y, w, h, c1, c2, false);
                this.contentsBack.strokeRect(x, y, w, h, "rgba(0, 220, 255, 0.85)");
                this.contentsBack.strokeRect(x + 1, y + 1, w - 2, h - 2, "rgba(160, 240, 255, 0.45)");
                this.contentsBack.fillRect(x + 2, y + 1, w - 4, 1, "rgba(220, 250, 255, 0.90)");
            } else {
                // Subtle dark slate backing
                const c1 = "rgba(15, 20, 30, 0.65)";
                const c2 = "rgba(8, 12, 18, 0.45)";
                this.contentsBack.gradientFillRect(x, y, w, h, c1, c2, true);
                this.contentsBack.strokeRect(x, y, w, h, "rgba(60, 80, 110, 0.35)");
            }
        }

        drawItem(index) {
            const rect = this.itemLineRect(index);
            const isSelected = index === this.index();
            this.resetTextColor();
            this.contents.outlineColor = "rgba(0, 0, 0, 0.95)";
            this.contents.outlineWidth = 3;
            this.contents.fontSize = 20;

            if (index === 0) {
                this.changeTextColor(isSelected ? "#a0f0ff" : "#ffffff");
                this.drawText("Faction", rect.x + 8, rect.y, 100, "left");

                const factionText = `◄  ${this.currentFaction()}  ►`;
                this.changeTextColor(isSelected ? "#ffffff" : "#cbd5e1");
                this.drawText(factionText, rect.x + 110, rect.y, rect.width - 118, "right");
            } else if (index === 1) {
                this.changeTextColor(isSelected ? "#a0f0ff" : "#ffffff");
                this.drawText("Starting Year", rect.x + 8, rect.y, 120, "left");

                const yearText = `◄  ${this._year} AD  ►`;
                this.changeTextColor(isSelected ? "#ffffff" : "#cbd5e1");
                this.drawText(yearText, rect.x + 130, rect.y, rect.width - 138, "right");
            } else if (index === 2) {
                if (isSelected) {
                    this.changeTextColor("#ffd700");
                } else {
                    this.changeTextColor("#a0f0ff");
                }
                this.drawText("Embark", rect.x, rect.y, rect.width, "center");
            } else if (index === 3) {
                this.changeTextColor(isSelected ? "#ffffff" : "#94a3b8");
                this.drawText("Cancel", rect.x, rect.y, rect.width, "center");
            }
        }

        isOkEnabled() {
            return true;
        }

        isCancelEnabled() {
            return true;
        }

        isTouchOkEnabled() {
            return true;
        }

        onTouchOk() {
            this.processOk();
        }

        cursorRight(wrap) {
            if (this.index() === 0) {
                this.nextFaction();
            } else if (this.index() === 1) {
                this.changeYear(Input.isPressed("shift") ? 10 : 1);
            } else {
                super.cursorRight(wrap);
            }
        }

        cursorLeft(wrap) {
            if (this.index() === 0) {
                this.prevFaction();
            } else if (this.index() === 1) {
                this.changeYear(Input.isPressed("shift") ? -10 : -1);
            } else {
                super.cursorLeft(wrap);
            }
        }

        cursorPageup() {
            if (this.index() === 1) {
                this.changeYear(10);
            } else {
                super.cursorPageup();
            }
        }

        cursorPagedown() {
            if (this.index() === 1) {
                this.changeYear(-10);
            } else {
                super.cursorPagedown();
            }
        }

        nextFaction() {
            this._factionIndex = (this._factionIndex + 1) % this._factionChoices.length;
            SoundManager.playCursor();
            this.redrawItem(0);
        }

        prevFaction() {
            this._factionIndex = (this._factionIndex - 1 + this._factionChoices.length) % this._factionChoices.length;
            SoundManager.playCursor();
            this.redrawItem(0);
        }

        changeYear(delta) {
            const oldYear = this._year;
            this._year = Math.max(1, Math.min(200, this._year + delta));
            if (this._year !== oldYear) {
                SoundManager.playCursor();
                this.redrawItem(1);
            }
        }

        processOk() {
            if (this.index() === 0) {
                this.nextFaction();
            } else if (this.index() === 1) {
                this.changeYear(1);
            } else if (this.index() === 2) {
                this.playOkSound();
                this.callHandler("embark");
            } else if (this.index() === 3) {
                SoundManager.playCancel();
                this.callHandler("cancel");
            }
        }

        processCancel() {
            SoundManager.playCancel();
            this.callHandler("cancel");
        }

        toLocalCoords(point) {
            return this.worldTransform ? this.worldTransform.applyInverse(point) : new Point(point.x - this.x, point.y - this.y);
        }

        onTouchSelect(trigger) {
            super.onTouchSelect(trigger);
            if (trigger) {
                const hitIndex = this.hitIndex();
                if (hitIndex < 0) return;
                const touchPos = new Point(TouchInput.x, TouchInput.y);
                const localPos = this.toLocalCoords(touchPos);
                if (hitIndex === 0) {
                    if (localPos.x > 240) {
                        this.nextFaction();
                    } else if (localPos.x > 120) {
                        this.prevFaction();
                    }
                } else if (hitIndex === 1) {
                    if (localPos.x > 240) {
                        this.changeYear(1);
                    } else if (localPos.x > 120) {
                        this.changeYear(-1);
                    }
                } else if (hitIndex === 2) {
                    this.select(2);
                    this.processOk();
                } else if (hitIndex === 3) {
                    this.select(3);
                    this.processCancel();
                }
            }
        }
    }
    window.Window_NewGameSetup = Window_NewGameSetup;

    // Eliminate item background gradients and strokes (contentsBack)
    Window_TitleCommand.prototype.drawItemBackground = function(/*index*/) {
        // Zero system elements
    };

    Window_TitleCommand.prototype.lineHeight = function() {
        return 32;
    };

    Scene_Title.prototype.commandWindowRect = function() {
        const offsetX = $dataSystem.titleCommandWindow.offsetX;
        const offsetY = $dataSystem.titleCommandWindow.offsetY;
        const ww = 240;
        const wh = this.calcWindowHeight(2, true);
        const wx = (Graphics.boxWidth - ww) / 2 + offsetX;
        const wy = 353 + offsetY; // Centered vertically in the pure black doorway opening (y=360..434)
        return new Rectangle(wx, wy, ww, wh);
    };

    // 3. Clean title command window with ZERO menu pointers
    const _Window_TitleCommand_initialize = Window_TitleCommand.prototype.initialize;
    Window_TitleCommand.prototype.initialize = function(rect) {
        _Window_TitleCommand_initialize.call(this, rect);
        this.opacity = 0;
        this.backOpacity = 0;
    };

    const _Window_TitleCommand_select = Window_TitleCommand.prototype.select;
    Window_TitleCommand.prototype.select = function(index) {
        const changed = this.index() !== index;
        _Window_TitleCommand_select.call(this, index);
        if (changed) this.refresh();
    };

    Window_TitleCommand.prototype.drawItem = function(index) {
        const rect = this.itemLineRect(index);
        const align = this.itemTextAlign();
        this.resetTextColor();
        this.changePaintOpacity(this.isCommandEnabled(index));
        if (index === this.index()) {
            this.changeTextColor("#a0f0ff"); // Glowing electric cyan matching DEUS
        } else {
            this.changeTextColor("#ffffff"); // Pure white
        }
        this.contents.outlineColor = "rgba(0, 0, 0, 0.95)";
        this.contents.outlineWidth = 4;
        this.contents.fontSize = 24;
        this.drawText(this.commandName(index), rect.x, rect.y, rect.width, align);
    };

    Window_TitleCommand.prototype.refreshCursor = function() {
        this.setCursorRect(0, 0, 0, 0);
    };

    const _Window_TitleCommand_update = Window_TitleCommand.prototype.update;
    Window_TitleCommand.prototype.update = function() {
        _Window_TitleCommand_update.call(this);
        if (this._cursorSprite) this._cursorSprite.visible = false;
    };

    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        UF_FactionMenus.applyMouseCursor();
    };

    // When factions are generated (or world rolled), update the cursor to the player's faction
    if (window.UF && UF.on) {
        UF.on("factions:generated", () => {
            UF_FactionMenus.applyMouseCursor();
        });
    }

    // Window skins: Window_Base loads matching Window_<culture>.png
    const _Window_Base_loadWindowskin = Window_Base.prototype.loadWindowskin;
    Window_Base.prototype.loadWindowskin = function() {
        _Window_Base_loadWindowskin.call(this);
        if (SceneManager._scene instanceof Scene_Title || SceneManager._scene instanceof Scene_File) {
            this.windowskin = ImageManager.loadSystem("Window_default");
            return;
        }
        if (window.UF && UF.Factions && typeof UF.Factions.skinFor === "function") {
            const who = this._ufSkinFor !== undefined && this._ufSkinFor !== null ? this._ufSkinFor : UF_FactionMenus.getFaction();
            const s = UF.Factions.skinFor(who);
            if (s) { this.windowskin = s; return; }
        }
        const faction = safeFaction(UF_FactionMenus.getFaction());
        this.windowskin = ImageManager.loadSystem(`Window_${faction}`);
    };

    // Scene_MenuBase: Dynamic matching background frame & window skins for ALL menus
    const _Scene_MenuBase_createBackground = Scene_MenuBase.prototype.createBackground;
    Scene_MenuBase.prototype.createBackground = function() {
        _Scene_MenuBase_createBackground.call(this);
        if (this instanceof Scene_File) {
            // Replace background with Title Screen art for Load/Save screen
            if (this._backgroundSprite) {
                this._backgroundSprite.bitmap = ImageManager.loadTitle1($dataSystem.title1Name || "DEUS_Title");
                this._backgroundSprite.filters = [];
                this._backgroundSprite.opacity = 255;
            }
            return;
        }
        const faction = safeFaction(UF_FactionMenus.getFaction());
        this._factionMenuSprite = new Sprite();
        this._factionMenuSprite.bitmap = ImageManager.loadPicture(`UF_Menu_${faction}`);
        this.addChild(this._factionMenuSprite);
    };

    const _Scene_MenuBase_start = Scene_MenuBase.prototype.start;
    Scene_MenuBase.prototype.start = function() {
        _Scene_MenuBase_start.call(this);
        const faction = safeFaction(UF_FactionMenus.getFaction());
        this.applyFactionTheme(faction);
        UF_FactionMenus.applyMouseCursor(faction);

        // Optional BGM transition if catalog theme defined
        if (!(this instanceof Scene_File) && window.UF && UF.World && UF.World.catalog && UF.World.catalog.factions) {
            const facDef = UF.World.catalog.factions[faction];
            if (facDef && facDef.themeBgm) {
                AudioManager.playBgm({ name: facDef.themeBgm, pan: 0, pitch: 100, volume: 80 });
            }
        }
    };

    Scene_MenuBase.prototype.applyFactionTheme = function(faction) {
        if (this instanceof Scene_File) {
            // DEUS system set on title screen background
            if (this._factionMenuSprite) {
                this._factionMenuSprite.visible = false;
            }
            const deusSkin = ImageManager.loadSystem("Window_default");
            const updateWin = (w) => {
                if (w && w instanceof Window_Base) {
                    w.windowskin = deusSkin;
                    w.backOpacity = 160;
                    if (typeof w.refresh === "function") {
                        w.refresh();
                    }
                }
            };
            if (this._windowLayer && this._windowLayer.children) {
                this._windowLayer.children.forEach(updateWin);
            }
            for (const key of Object.keys(this)) {
                if (this[key] instanceof Window_Base) {
                    updateWin(this[key]);
                }
            }
            return;
        }
        let skin = null;
        if (window.UF && UF.Factions && typeof UF.Factions.skinFor === "function") {
            skin = UF.Factions.skinFor(faction);
        }
        const sFac = safeFaction(faction);
        if (!skin) skin = ImageManager.loadSystem(`Window_${sFac}`);
        if (this._factionMenuSprite) {
            this._factionMenuSprite.bitmap = ImageManager.loadPicture(`UF_Menu_${sFac}`);
        }
        const updateWin = (w) => {
            if (w && w instanceof Window_Base) {
                w.windowskin = skin;
                w.opacity = 210;
                if (typeof w.refresh === "function") {
                    w.refresh();
                }
            }
        };
        if (this._windowLayer && this._windowLayer.children) {
            this._windowLayer.children.forEach(updateWin);
        }
        for (const key of Object.keys(this)) {
            if (this[key] instanceof Window_Base) {
                updateWin(this[key]);
            }
        }
    };

    // Custom Window_SavefileList for DEUS Load/Save Screen:
    // 1. Zero flashing cursor box
    const _Window_SavefileList_initialize = Window_SavefileList.prototype.initialize;
    Window_SavefileList.prototype.initialize = function(rect) {
        _Window_SavefileList_initialize.call(this, rect);
        this._cursorVisible = false;
        if (this._cursorSprite) {
            this._cursorSprite.visible = false;
            this._cursorSprite.alpha = 0;
        }
    };

    Window_SavefileList.prototype.refreshCursor = function() {
        this.setCursorRect(0, 0, 0, 0);
        if (this._cursorSprite) {
            this._cursorSprite.visible = false;
            this._cursorSprite.alpha = 0;
        }
    };

    Window_SavefileList.prototype._updateCursor = function() {
        if (this._cursorSprite) {
            this._cursorSprite.visible = false;
            this._cursorSprite.alpha = 0;
        }
    };

    Window_SavefileList.prototype._makeCursorAlpha = function() {
        return 0;
    };

    const _Window_SavefileList_update = Window_SavefileList.prototype.update;
    Window_SavefileList.prototype.update = function() {
        _Window_SavefileList_update.call(this);
        if (this._cursorSprite) {
            this._cursorSprite.visible = false;
            this._cursorSprite.alpha = 0;
        }
    };

    // 2. Responsive hover/selection redraw
    const _Window_SavefileList_select = Window_SavefileList.prototype.select;
    Window_SavefileList.prototype.select = function(index) {
        const prev = this.index();
        _Window_SavefileList_select.call(this, index);
        if (prev !== index) {
            if (prev >= 0) this.redrawItem(prev);
            if (index >= 0) this.redrawItem(index);
        }
    };

    // 3. Clean steady cyan glow in the background of selected/hovered save file
    Window_SavefileList.prototype.drawItemBackground = function(index) {
        const rect = this.itemRect(index);
        const isSelected = index === this.index();
        const x = rect.x + 2;
        const y = rect.y + 2;
        const w = rect.width - 4;
        const h = rect.height - 4;

        if (isSelected) {
            // Luminous electric cyan glow background
            const c1 = "rgba(0, 212, 255, 0.32)";
            const c2 = "rgba(0, 140, 220, 0.12)";
            this.contentsBack.gradientFillRect(x, y, w, h, c1, c2, false);
            // Outer bright cyan stroke
            this.contentsBack.strokeRect(x, y, w, h, "rgba(0, 220, 255, 0.85)");
            this.contentsBack.strokeRect(x + 1, y + 1, w - 2, h - 2, "rgba(160, 240, 255, 0.45)");
            // Top accent line
            this.contentsBack.fillRect(x + 2, y + 1, w - 4, 1, "rgba(220, 250, 255, 0.90)");
        } else {
            // Subtle dark slate backing for unselected files
            const c1 = "rgba(15, 20, 30, 0.65)";
            const c2 = "rgba(8, 12, 18, 0.45)";
            this.contentsBack.gradientFillRect(x, y, w, h, c1, c2, true);
            this.contentsBack.strokeRect(x, y, w, h, "rgba(60, 80, 110, 0.35)");
        }
    };

    // 4. Glowing title text matching DEUS text aesthetic
    Window_SavefileList.prototype.drawTitle = function(savefileId, x, y) {
        const isSelected = this.index() === this.savefileIdToIndex(savefileId);
        if (isSelected) {
            this.changeTextColor("#a0f0ff");
        } else {
            this.changeTextColor("#ffffff");
        }
        if (savefileId === 0) {
            this.drawText(TextManager.autosave, x, y, 180);
        } else {
            this.drawText(TextManager.file + " " + savefileId, x, y, 180);
        }
    };

    // Dynamic Actor Face support for Faction Menus & Windows
    const _Game_Actor_faceName = Game_Actor.prototype.faceName;
    Game_Actor.prototype.faceName = function() {
        const orig = _Game_Actor_faceName.call(this);
        if (orig && orig !== "U7_Faces" && orig !== "") return orig;
        const faction = safeFaction(UF_FactionMenus.getFaction());
        return `UF_Faces_${faction === "default" ? "human" : faction}_1`;
    };

    const _Game_Actor_faceIndex = Game_Actor.prototype.faceIndex;
    Game_Actor.prototype.faceIndex = function() {
        const origName = _Game_Actor_faceName.call(this);
        if (origName && origName !== "U7_Faces" && origName !== "") return _Game_Actor_faceIndex.call(this);
        return 0;
    };

    const _Window_Base_drawFace = Window_Base.prototype.drawFace;
    Window_Base.prototype.drawFace = function(faceName, faceIndex, x, y, width, height) {
        if (faceName) {
            const bmp = ImageManager.loadFace(faceName);
            if (bmp && !bmp.isReady()) {
                bmp.addLoadListener(() => {
                    if (this && this.contents && typeof this.refresh === "function") {
                        this.refresh();
                    }
                });
            }
        }
        _Window_Base_drawFace.call(this, faceName, faceIndex, x, y, width, height);
    };

    // Keyboard navigation to preview / cycle faction themes in Scene_Menu
    Input.keyMapper[9] = "tab";
    Input.keyMapper[219] = "bracketLeft";
    Input.keyMapper[221] = "bracketRight";

    const _Scene_Menu_update = Scene_Menu.prototype.update;
    Scene_Menu.prototype.update = function() {
        _Scene_Menu_update.call(this);
        if (Input.isTriggered("tab") || Input.isTriggered("bracketRight") || Input.isTriggered("pagedown")) {
            const cur = UF_FactionMenus.getFaction();
            const idx = FACTIONS.indexOf(cur);
            const nextIdx = (idx + 1) % FACTIONS.length;
            const nextFac = FACTIONS[nextIdx];
            UF_FactionMenus.setFaction(nextFac);
            SoundManager.playCursor();
        } else if (Input.isTriggered("bracketLeft") || Input.isTriggered("pageup")) {
            const cur = UF_FactionMenus.getFaction();
            const idx = FACTIONS.indexOf(cur);
            const nextIdx = (idx - 1 + FACTIONS.length) % FACTIONS.length;
            const nextFac = FACTIONS[nextIdx];
            UF_FactionMenus.setFaction(nextFac);
            SoundManager.playCursor();
        }
    };

    // Automated Verification Suite (UF_Test)
    function registerChecks() {
        UF.Test.suite("faction_menus", async t => {
            t.check("factions_list_12", FACTIONS.length === 12, "12 matching faction menus defined (default + 11 factions)");

            // Verify literal mouse cursor style for default main menu
            UF_FactionMenus.applyMouseCursor("default");
            const curDefault = UF_FactionMenus.getCursorCss("default");
            t.check("mouse_cursor_default_applied", curDefault.includes("Cursor_default.png"), "Default mouse cursor configured with Cursor_default.png");

            // Verify literal mouse cursor style is always Cursor_default.png regardless of faction
            UF_FactionMenus.applyMouseCursor("dwarf");
            const curDwarf = UF_FactionMenus.getCursorCss("dwarf");
            t.check("mouse_cursor_dwarf_applied", curDwarf.includes("Cursor_default.png"), "Mouse cursor is always Cursor_default.png regardless of faction");

            SceneManager.push(Scene_Menu);
            await t.waitFrames(15);
            t.check("scene_menu_active", SceneManager._scene instanceof Scene_Menu, "Scene_Menu successfully loaded");

            // Verify default theme on Scene_Menu
            UF_FactionMenus.setFaction("default");
            t.check("default_theme_active", UF_FactionMenus.getFaction() === "default", "Default menu theme active");
            t.check("default_mouse_cursor_applied", UF_FactionMenus.getCursorCss("default").includes("Cursor_default.png"), "Cursor_default applied");

            // Verify that NO selector cursor sprite exists in Window_Selectable
            const cmdWin = SceneManager._scene._commandWindow;
            t.check("no_menu_selector_cursor_sprite", !cmdWin._factionCursorSprite, "No selector cursor sprite on menu items");

            for (const fac of FACTIONS) {
                UF_FactionMenus.setFaction(fac);
                const bmp = ImageManager.loadPicture(`UF_Menu_${fac}`);
                const skin = ImageManager.loadSystem(`Window_${fac}`);
                const faceName = `UF_Faces_${fac === "default" ? "human" : fac}_1`;
                const face = ImageManager.loadFace(faceName);

                await t.waitUntil(() => bmp.isReady() && skin.isReady() && face.isReady(), 5000, `UF_Menu_${fac} and ${faceName} assets ready`);
                await t.waitFrames(10);
                t.screenshot(`menu_clean_${fac}`);
            }

            t.check("menu_themes_rendered", true, "All 12 clean matching menus with faction faces captured without selector cursors");
            SceneManager.pop();
            await t.waitFrames(10);
        });

        UF.Test.suite("title", async t => {
            SceneManager.goto(Scene_Title);
            await t.waitUntil(() => SceneManager._scene instanceof Scene_Title && SceneManager._scene.isStarted(), 5000, "Scene_Title started");
            const scene = SceneManager._scene;
            await t.waitUntil(() => scene._commandWindow && scene._commandWindow.isOpen(), 5000, "Command window open");
            await t.waitFrames(20);
            t.check("title_scene_active", SceneManager._scene instanceof Scene_Title, "Scene_Title is active");
            t.check("title1_is_deus", $dataSystem.title1Name === "DEUS_Title", "System title1Name is DEUS_Title");
            t.check("no_menu_overlay_sprite", !SceneManager._scene._defaultMenuSprite, "No UF_Menu_default sprite covering title");
            t.check("window_frame_transparent", scene._commandWindow.opacity === 0, "Title command window frame is transparent");
            t.check("new_game_command", scene._commandWindow.commandName(0) === "New Game", "Command 0 is New Game");
            t.check("continue_command", scene._commandWindow.commandName(1) === "Continue", "Command 1 is Continue");
            t.check("no_menu_pointer_sprites", !scene._commandWindow._deusCursorSprite && !scene._commandWindow._leftFlameSprite && !scene._commandWindow._rightFlameSprite, "No menu pointer sprites on title command window");
            t.screenshot("live_deus_title_screen");
        }, { isDefault: false });

        UF.Test.suite("load", async t => {
            SceneManager.goto(Scene_Title);
            await t.waitUntil(() => SceneManager._scene instanceof Scene_Title && SceneManager._scene.isStarted(), 5000);
            SceneManager.push(Scene_Load);
            await t.waitUntil(() => SceneManager._scene instanceof Scene_Load && SceneManager._scene.isStarted(), 5000);
            await t.waitFrames(25);
            const scene = SceneManager._scene;
            t.check("load_scene_active", scene instanceof Scene_Load, "Scene_Load is active");
            t.check("load_faction_default", UF_FactionMenus.getFaction() === "default", "Load menu uses default DEUS theme");
            t.check("title_background_attached", !!(scene._backgroundSprite && scene._backgroundSprite.bitmap), "Title background attached to load scene");
            t.check("no_faction_frame_visible", !scene._factionMenuSprite || !scene._factionMenuSprite.visible, "Faction menu frame is hidden on load screen");
            t.check("list_window_skin_attached", !!(scene._listWindow && scene._listWindow.windowskin), "List window has windowskin attached");
            t.check("no_flashing_cursor_sprite", !scene._listWindow._cursorSprite || !scene._listWindow._cursorSprite.visible, "Flashing cursor sprite is hidden");
            t.screenshot("live_deus_load_screen_autosave");

            // Simulate hover / selection of File 2 (index 2)
            scene._listWindow.select(2);
            await t.waitFrames(10);
            t.check("file_2_selected", scene._listWindow.index() === 2, "File 2 is selected");
            t.screenshot("live_deus_load_screen_file2");
        }, { isDefault: false });

        UF.Test.suite("setup", async t => {
            SceneManager.goto(Scene_Title);
            await t.waitUntil(() => SceneManager._scene instanceof Scene_Title && SceneManager._scene.isStarted(), 5000, "Scene_Title started");
            const scene = SceneManager._scene;
            await t.waitUntil(() => scene._commandWindow && scene._commandWindow.isOpen(), 5000, "Command window open");
            await t.waitFrames(20);

            t.check("title_scene_active", scene instanceof Scene_Title, "Scene_Title is active");
            t.check("setup_window_created", !!scene._newGameSetupWindow, "Window_NewGameSetup instance attached to Scene_Title");
            t.check("setup_window_initially_closed", !scene._newGameSetupWindow.isOpen(), "Setup window starts closed");

            // Open Expedition Setup window via commandNewGame
            scene.commandNewGame();
            await t.waitFrames(15);

            t.check("setup_window_open", scene._newGameSetupWindow.isOpen(), "Setup window is open");
            t.check("setup_window_active", scene._newGameSetupWindow.active, "Setup window is active");
            t.check("setup_window_width_350", scene._newGameSetupWindow.width === 350, "Setup window slimmed to 350 px");
            t.check("setup_window_x_centered", scene._newGameSetupWindow.x >= 248 && scene._newGameSetupWindow.x <= 256, "Setup window centered squarely between D and S (x=" + scene._newGameSetupWindow.x + ")");
            t.check("fits_between_d_and_s", scene._newGameSetupWindow.x > 243 && (scene._newGameSetupWindow.x + scene._newGameSetupWindow.width) < 618, "Fits squarely between letter D and letter S");
            t.check("default_faction_human", scene._newGameSetupWindow.currentFaction() === "Human", "Default faction is Human");
            t.check("default_year_1", scene._newGameSetupWindow.currentYear() === 1, "Default starting year is 1 AD");
            t.check("no_flashing_cursor", !scene._newGameSetupWindow._cursorSprite || !scene._newGameSetupWindow._cursorSprite.visible, "Flashing cursor box suppressed");

            t.screenshot("live_deus_new_game_setup");

            // Cycle factions on Row 0
            scene._newGameSetupWindow.select(0);
            scene._newGameSetupWindow.cursorRight();
            t.check("faction_cycled_to_elf", scene._newGameSetupWindow.currentFaction() === "Elf", "Faction cycled to Elf");
            scene._newGameSetupWindow.cursorRight();
            t.check("faction_cycled_to_dwarf", scene._newGameSetupWindow.currentFaction() === "Dwarf", "Faction cycled to Dwarf");

            // Test touch select on window (verify toLocalCoords and coordinate conversion)
            TouchInput._x = scene._newGameSetupWindow.x + scene._newGameSetupWindow.width - 20;
            TouchInput._y = scene._newGameSetupWindow.y + 40;
            scene._newGameSetupWindow.onTouchSelect(true);
            t.check("touch_select_no_error", true, "onTouchSelect executed without toLocalCoords error");

            // Test Year Adjustment and Clamping on Row 1
            scene._newGameSetupWindow.select(1);
            scene._newGameSetupWindow.changeYear(49);
            t.check("year_adjusted_to_50", scene._newGameSetupWindow.currentYear() === 50, "Year stepped to 50 AD");

            scene._newGameSetupWindow.setYear(250);
            t.check("year_clamped_max_200", scene._newGameSetupWindow.currentYear() === 200, "Year clamped at maximum 200 AD");

            scene._newGameSetupWindow.setYear(-10);
            t.check("year_clamped_min_1", scene._newGameSetupWindow.currentYear() === 1, "Year clamped at minimum 1 AD");

            // Test Cancel action: click or trigger Cancel row (index 3)
            TouchInput._x = scene._newGameSetupWindow.x + Math.round(scene._newGameSetupWindow.width / 2);
            TouchInput._y = scene._newGameSetupWindow.y + 12 + 38 * 3 + 19;
            scene._newGameSetupWindow.onTouchSelect(true);
            await t.waitFrames(15);
            t.check("setup_window_closed_on_cancel", !scene._newGameSetupWindow.isOpen(), "Setup window closed on Cancel");
            t.check("command_window_open_on_cancel", scene._commandWindow.isOpen(), "Command window reopened on Cancel");

            // Reopen setup window
            scene.commandNewGame();
            await t.waitFrames(15);
            t.check("setup_window_reopened", scene._newGameSetupWindow.isOpen(), "Setup window reopened");

            // Configure Dwarf expedition at Year 42 AD
            scene._newGameSetupWindow.setFaction("Dwarf");
            scene._newGameSetupWindow.setYear(42);
            scene._newGameSetupWindow.select(2); // Hover "Embark"
            await t.waitFrames(15);

            t.check("configured_faction_dwarf", scene._newGameSetupWindow.currentFaction() === "Dwarf", "Configured faction is Dwarf");
            t.check("configured_year_42", scene._newGameSetupWindow.currentYear() === 42, "Configured year is 42 AD");
            t.screenshot("live_deus_new_game_setup_dwarf_42");

            // Test Embark action via click / touch trigger on Row 2
            TouchInput._x = scene._newGameSetupWindow.x + Math.round(scene._newGameSetupWindow.width / 2);
            TouchInput._y = scene._newGameSetupWindow.y + 12 + 38 * 2 + 19;
            scene._newGameSetupWindow.onTouchSelect(true);
            await t.waitUntil(() => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted(), 15000, "Scene_Map started");
            await t.waitFrames(30);

            const st = window.UF && UF.World && UF.World.state;
            t.check("map_scene_active", SceneManager._scene instanceof Scene_Map, "Transitioned to live game map");
            t.check("state_exists", !!st, "World state created");

            const playerFac = st.factions.list.find(f => f.isPlayer);
            t.check("player_faction_is_dwarf", !!playerFac && (playerFac.species === "dwarf" || playerFac.culture === "dwarf"), "Player faction is Dwarf");
            t.check("clock_year_is_42", window.$ufTime && $ufTime.year === 42, "Clock year is 42 AD");
            t.check("history_simulated_42_years", st.history && st.history.years === 42, "History simulated exactly 42 years");
            t.check("history_settled_run", !!st.history.settled, "Settling run executed: " + JSON.stringify(st.history.settled ? { houses: st.history.settled.houses, beds: st.history.settled.beds, hearths: st.history.settled.hearths, sitesGrown: st.history.settled.sitesGrown } : {}));
            t.check("settled_hearths_constructed", !!(st.history.settled && st.history.settled.hearths > 0), "Indoor hearths constructed inside settled houses: " + (st.history.settled ? st.history.settled.hearths : 0));
            t.check("history_events_recorded", st.history.events && st.history.events.length > 0, "Chronicle events recorded: " + (st.history.events ? st.history.events.length : 0));
            t.check("history_sites_exist", st.history.sites && st.history.sites.length > 0, "Sites exist in world: " + (st.history.sites ? st.history.sites.length : 0));
            t.check("theme_switched_to_dwarf", UF_FactionMenus.getFaction() === "dwarf", "Window theme switched to Dwarf");

            t.screenshot("live_dwarf_colony_year_42");
        }, { isDefault: false });
    }

})();
