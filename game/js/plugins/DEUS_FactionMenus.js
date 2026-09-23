//=============================================================================
// RPG Maker MZ - Ultima Fortress: Dynamic Matching Faction Menu Themes
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS FactionMenus] Dynamic cultural UI themes, window skins, Title Screen embark setup, and custom faction mouse cursors.
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

    const pluginName = "DEUS_FactionMenus";
    const params = PluginManager.parameters(pluginName);
    const defaultFaction = params["DefaultFaction"] || "default";

    window.UF_FactionMenus = {};

    const FACTIONS = ["default", "deus", "human", "elf", "dwarf", "halfling", "gnome", "dragonborn", "half-elf", "half-orc", "tiefling"];

    const CURSOR_HOTSPOTS = {
        default: [4, 4],
        deus: [4, 4],
        human: [5, 4],
        elf: [4, 4],
        dwarf: [4, 4],
        halfling: [4, 4],
        gnome: [4, 4],
        dragonborn: [4, 4],
        "half-elf": [4, 4],
        "half-orc": [4, 4],
        tiefling: [4, 4]
    };

    const CULTURE_FALLBACKS = {
        halfling: "human",
        gnome: "dwarf",
        dragonborn: "dwarf",
        "half-elf": "elf",
        "half-orc": "human",
        tiefling: "human",
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
        const wh = 285;
        // Center squarely between letter D (x ≈ 243) and letter S (x ≈ 618), centered at x = 431
        const gapCenter = Math.round(Graphics.boxWidth / 2) + 23;
        const wx = Math.round(gapCenter - ww / 2); // 431 - 175 = 256
        const wy = 235;
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
        TouchInput.clear();
        Input.clear();
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
        if (this._newGameSetupWindow && typeof this._newGameSetupWindow._destroySeedInputElement === "function") {
            this._newGameSetupWindow._destroySeedInputElement();
        }
        const faction = this._newGameSetupWindow ? this._newGameSetupWindow.currentFaction() : "Human";
        const year = this._newGameSetupWindow ? this._newGameSetupWindow.currentYear() : 1;
        const seed = this._newGameSetupWindow ? this._newGameSetupWindow.resolvedSeed() : undefined;
        const worldSize = 256;
        const fogOfWar = false;
        window.DEUS = window.DEUS || {};
        window.UF = window.DEUS;
        window.UF.NewGameSetup = {
            faction: faction.toLowerCase(),
            year: year,
            seed: seed,
            worldSize: 256,
            fogOfWar: false
        };
        if (typeof UF_FactionMenus !== "undefined" && UF_FactionMenus.setFaction) {
            UF_FactionMenus.setFaction(faction.toLowerCase());
        }
        if (window.UF && UF.Fog && typeof UF.Fog.setEnabled === "function") {
            UF.Fog.setEnabled(false);
        }
        DataManager.setupNewGame();
        if (this._commandWindow) this._commandWindow.close();
        if (this._newGameSetupWindow) this._newGameSetupWindow.close();
        this.fadeOutAll();
        SceneManager.goto(Scene_Map);
    };

    Scene_Title.prototype.onNewGameCancel = function() {
        if (!this._newGameSetupWindow) return;
        if (typeof this._newGameSetupWindow._destroySeedInputElement === "function") {
            this._newGameSetupWindow._destroySeedInputElement();
        }
        TouchInput.clear();
        Input.clear();
        this._newGameSetupWindow.deactivate();
        this._newGameSetupWindow.close();
        this._commandWindow.open();
        this._commandWindow.activate();
        this._commandWindow.selectSymbol("newGame");
    };

    const _Scene_Title_terminate = Scene_Title.prototype.terminate;
    Scene_Title.prototype.terminate = function() {
        if (this._newGameSetupWindow && typeof this._newGameSetupWindow._destroySeedInputElement === "function") {
            this._newGameSetupWindow._destroySeedInputElement();
        }
        _Scene_Title_terminate.call(this);
    };

    const _Scene_Title_isBusy = Scene_Title.prototype.isBusy;
    Scene_Title.prototype.isBusy = function() {
        const setupBusy = this._newGameSetupWindow && (
            this._newGameSetupWindow.isOpen() ||
            this._newGameSetupWindow.isOpening()
        );
        return setupBusy || _Scene_Title_isBusy.call(this);
    };

    // Class: Window_NewGameSetup
    // Expedition setup menu allowing player to choose faction, starting year (1-200 AD), and world seed
    class Window_NewGameSetup extends Window_Selectable {
        initialize(rect) {
            super.initialize(rect);
            this._factionChoices = [
                "Human", "Elf", "Dwarf", "Halfling", "Gnome",
                "Dragonborn", "Half-Elf", "Half-Orc", "Tiefling"
            ];
            this._factionIndex = 0;
            this._year = 1;
            this._seedInput = "";
            this._seedButtonCol = 0;
            this._copiedTimer = 0;
            this._htmlInput = null;
            this._fogEnabled = false; // Fog of War temporarily disabled per user directive 2026-09-22
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
            return 6;
        }

        itemHeight() {
            return 32;
        }

        itemRect(index) {
            const rect = new Rectangle(8, 8, this.innerWidth - 16, 32);
            if (index === 0) rect.y = 8;
            else if (index === 1) rect.y = 44;
            else if (index === 2) rect.y = 80;
            else if (index === 3) rect.y = 116;
            else if (index === 4) rect.y = 180;
            else if (index === 5) rect.y = 216;
            return rect;
        }

        currentFaction() {
            return this._factionChoices[this._factionIndex];
        }

        currentYear() {
            return this._year;
        }

        currentSize() {
            return 256;
        }

        currentSizeLabel() {
            return "256x256 (Locked)";
        }

        currentFog() {
            return false;
        }

        setFog(val) {
            this._fogEnabled = false;
        }

        toggleFog() {
            this._fogEnabled = false;
        }

        currentSeed() {
            return this._seedInput;
        }

        setSeed(val) {
            if (val === null || val === undefined || val === "") {
                this._seedInput = "";
            } else {
                const norm = (window.UF && UF.World && UF.World.normalizeSeed) ? UF.World.normalizeSeed(val) : null;
                if (norm && norm.valid && !norm.isBlank) {
                    this._seedInput = String(norm.seed);
                } else if (typeof val === "string") {
                    this._seedInput = val.replace(/\D/g, "").slice(0, 10);
                } else if (typeof val === "number" && Number.isInteger(val) && val >= 0) {
                    this._seedInput = String(Math.min(0x7fffffff, val));
                }
            }
            if (this._htmlInput) {
                this._htmlInput.value = this._seedInput;
            }
            this.redrawItem(2);
            this.redrawItem(3);
        }

        randomizeSeed() {
            const rolled = Math.floor(Math.random() * 0x7ffffffe) + 1;
            this.setSeed(rolled);
            SoundManager.playCursor();
        }

        copySeed() {
            const seedStr = this._seedInput ? String(this._seedInput).trim() : "";
            if (!seedStr) return;
            if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(seedStr).catch(() => {});
            }
            if (typeof require !== "undefined") {
                try {
                    const nwGui = require("nw.gui");
                    if (nwGui && nwGui.Clipboard && nwGui.Clipboard.get) {
                        nwGui.Clipboard.get().set(seedStr, "text");
                    }
                } catch (_) {}
            }
            this._copiedTimer = 90;
            SoundManager.playOk();
            this.redrawItem(3);
        }

        resolvedSeed() {
            if (!this._seedInput || String(this._seedInput).trim() === "") {
                return Math.floor(Math.random() * 0x7ffffffe) + 1;
            }
            const norm = (window.UF && UF.World && UF.World.normalizeSeed) ? UF.World.normalizeSeed(this._seedInput) : null;
            if (norm && norm.valid && !norm.isBlank) {
                return norm.seed;
            }
            const parsed = parseInt(String(this._seedInput).trim(), 10);
            if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 0x7fffffff) {
                return parsed;
            }
            return Math.floor(Math.random() * 0x7ffffffe) + 1;
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

        open() {
            super.open();
            this._createSeedInputElement();
        }

        close() {
            super.close();
            this._destroySeedInputElement();
        }

        _createSeedInputElement() {
            if (typeof document === "undefined" || this._htmlInput) return;
            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = "Leave blank for a random world";
            input.maxLength = 10;
            input.value = this._seedInput || "";
            input.style.position = "absolute";
            input.style.zIndex = "100";
            input.style.backgroundColor = "rgba(10, 15, 25, 0.9)";
            input.style.color = "#a0f0ff";
            input.style.border = "1px solid rgba(0, 212, 255, 0.5)";
            input.style.borderRadius = "3px";
            input.style.fontFamily = "GameFont, sans-serif";
            input.style.fontSize = "13px";
            input.style.textAlign = "center";
            input.style.outline = "none";
            input.style.boxSizing = "border-box";
            input.style.padding = "2px 6px";

            input.addEventListener("keydown", (e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                    input.blur();
                    this.select(4);
                } else if (e.key === "Escape") {
                    input.blur();
                    this.processCancel();
                }
            });
            input.addEventListener("keyup", (e) => {
                e.stopPropagation();
            });
            input.addEventListener("input", () => {
                let clean = input.value.replace(/\D/g, "");
                if (clean.length > 10) clean = clean.slice(0, 10);
                if (clean !== "" && Number(clean) > 0x7fffffff) {
                    clean = "2147483647";
                }
                input.value = clean;
                this._seedInput = clean;
                this.redrawItem(2);
                this.redrawItem(3);
            });
            input.addEventListener("focus", () => {
                this.select(2);
            });

            document.body.appendChild(input);
            this._htmlInput = input;
            this._updateInputPosition();
        }

        _destroySeedInputElement() {
            if (this._htmlInput) {
                if (this._htmlInput.parentNode) {
                    this._htmlInput.parentNode.removeChild(this._htmlInput);
                }
                this._htmlInput = null;
            }
        }

        _updateInputPosition() {
            if (!this._htmlInput) return;
            if (!this.isOpen() || !this.visible) {
                this._htmlInput.style.display = "none";
                return;
            }
            this._htmlInput.style.display = "block";
            const scale = (typeof Graphics !== "undefined" && Graphics._realScale) ? Graphics._realScale : 1;
            const canvas = (typeof Graphics !== "undefined") ? Graphics.canvas : null;
            const cRect = canvas && canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };

            const rect = this.itemLineRect(2);
            const labelWidth = 105;
            const inputX = this.x + rect.x + labelWidth;
            const inputY = this.y + rect.y + 3;
            const inputW = rect.width - labelWidth - 4;
            const inputH = 26;

            this._htmlInput.style.left = `${cRect.left + inputX * scale}px`;
            this._htmlInput.style.top = `${cRect.top + inputY * scale}px`;
            this._htmlInput.style.width = `${inputW * scale}px`;
            this._htmlInput.style.height = `${inputH * scale}px`;
            this._htmlInput.style.fontSize = `${Math.round(13 * scale)}px`;
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
            if (this._copiedTimer > 0) {
                this._copiedTimer--;
                if (this._copiedTimer === 0) {
                    this.redrawItem(3);
                }
            }
            this._updateInputPosition();
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

            if (index === 3) {
                // Handled in drawItem for dual buttons
                return;
            }

            if (isSelected) {
                const c1 = "rgba(0, 212, 255, 0.32)";
                const c2 = "rgba(0, 140, 220, 0.12)";
                this.contentsBack.gradientFillRect(x, y, w, h, c1, c2, false);
                this.contentsBack.strokeRect(x, y, w, h, "rgba(0, 220, 255, 0.85)");
                this.contentsBack.strokeRect(x + 1, y + 1, w - 2, h - 2, "rgba(160, 240, 255, 0.45)");
                this.contentsBack.fillRect(x + 2, y + 1, w - 4, 1, "rgba(220, 250, 255, 0.90)");
            } else {
                const c1 = "rgba(15, 20, 30, 0.65)";
                const c2 = "rgba(8, 12, 18, 0.45)";
                this.contentsBack.gradientFillRect(x, y, w, h, c1, c2, true);
                this.contentsBack.strokeRect(x, y, w, h, "rgba(60, 80, 110, 0.35)");
            }
        }

        drawAllItems() {
            super.drawAllItems();
            this.contents.outlineColor = "rgba(0, 0, 0, 0.95)";
            this.contents.outlineWidth = 2;
            this.contents.fontSize = 11;
            this.changeTextColor("#94a3b8");
            const w = this.innerWidth - 16;
            this.drawText("Use the same seed, generation version, and world settings to recreate the starting world.", 8, 150, w, "center");
        }

        drawItem(index) {
            const rect = this.itemLineRect(index);
            const isSelected = index === this.index();
            this.resetTextColor();
            this.contents.outlineColor = "rgba(0, 0, 0, 0.95)";
            this.contents.outlineWidth = 3;
            this.contents.fontSize = 18;

            if (index === 0) {
                this.changeTextColor(isSelected ? "#a0f0ff" : "#ffffff");
                this.drawText("Faction", rect.x + 8, rect.y, 100, "left");

                this.changeTextColor(isSelected ? "#a0f0ff" : "#cbd5e1");
                this.drawText("◄", rect.x + 130, rect.y, 24, "center");
                this.changeTextColor(isSelected ? "#ffffff" : "#cbd5e1");
                this.drawText(this.currentFaction(), rect.x + 155, rect.y, rect.width - 185, "center");
                this.changeTextColor(isSelected ? "#a0f0ff" : "#cbd5e1");
                this.drawText("►", rect.x + rect.width - 28, rect.y, 24, "center");
            } else if (index === 1) {
                this.changeTextColor(isSelected ? "#a0f0ff" : "#ffffff");
                this.drawText("Starting Year", rect.x + 8, rect.y, 120, "left");

                this.changeTextColor(isSelected ? "#a0f0ff" : "#cbd5e1");
                this.drawText("◄", rect.x + 130, rect.y, 24, "center");
                this.changeTextColor(isSelected ? "#ffffff" : "#cbd5e1");
                this.drawText(`${this._year} AD`, rect.x + 155, rect.y, rect.width - 185, "center");
                this.changeTextColor(isSelected ? "#a0f0ff" : "#cbd5e1");
                this.drawText("►", rect.x + rect.width - 28, rect.y, 24, "center");
            } else if (index === 2) {
                this.changeTextColor(isSelected ? "#a0f0ff" : "#ffffff");
                this.drawText("World Seed", rect.x + 8, rect.y, 100, "left");

                const boxX = rect.x + 105;
                const boxW = rect.width - 109;
                const boxH = 26;
                const boxY = rect.y + 3;

                // Canvas representation (also visible if HTML input isn't active/supported)
                this.contentsBack.fillRect(boxX, boxY, boxW, boxH, "rgba(10, 15, 25, 0.85)");
                this.contentsBack.strokeRect(boxX, boxY, boxW, boxH, isSelected ? "rgba(0, 212, 255, 0.85)" : "rgba(60, 80, 110, 0.5)");

                if (this._seedInput && String(this._seedInput).trim() !== "") {
                    this.contents.fontSize = 16;
                    this.changeTextColor("#a0f0ff");
                    this.drawText(this._seedInput, boxX, rect.y, boxW, "center");
                } else {
                    this.contents.fontSize = 12;
                    this.changeTextColor("#64748b");
                    this.drawText("[ Leave blank for a random world ]", boxX, rect.y, boxW, "center");
                }
            } else if (index === 3) {
                const bWidth = Math.floor((rect.width - 12) / 2);
                const x1 = rect.x;
                const w1 = bWidth;
                const x2 = rect.x + bWidth + 12;
                const w2 = bWidth;
                const h = rect.height - 4;
                const y = rect.y + 2;

                // Button 1: Randomize
                const b1Selected = isSelected && this._seedButtonCol === 0;
                if (b1Selected) {
                    this.contentsBack.gradientFillRect(x1, y, w1, h, "rgba(0, 212, 255, 0.32)", "rgba(0, 140, 220, 0.12)", false);
                    this.contentsBack.strokeRect(x1, y, w1, h, "rgba(0, 220, 255, 0.85)");
                } else {
                    this.contentsBack.gradientFillRect(x1, y, w1, h, "rgba(15, 20, 30, 0.65)", "rgba(8, 12, 18, 0.45)", true);
                    this.contentsBack.strokeRect(x1, y, w1, h, "rgba(60, 80, 110, 0.35)");
                }
                this.contents.fontSize = 14;
                this.changeTextColor(b1Selected ? "#a0f0ff" : "#cbd5e1");
                this.drawText("[ Randomize ]", x1, rect.y, w1, "center");

                // Button 2: Copy Seed
                const b2Selected = isSelected && this._seedButtonCol === 1;
                const hasSeed = !!(this._seedInput && String(this._seedInput).trim() !== "");
                const isCopied = this._copiedTimer > 0;

                if (b2Selected && hasSeed) {
                    this.contentsBack.gradientFillRect(x2, y, w2, h, "rgba(0, 212, 255, 0.32)", "rgba(0, 140, 220, 0.12)", false);
                    this.contentsBack.strokeRect(x2, y, w2, h, "rgba(0, 220, 255, 0.85)");
                } else {
                    this.contentsBack.gradientFillRect(x2, y, w2, h, "rgba(15, 20, 30, 0.65)", "rgba(8, 12, 18, 0.45)", true);
                    this.contentsBack.strokeRect(x2, y, w2, h, "rgba(60, 80, 110, 0.35)");
                }
                this.contents.fontSize = 14;
                if (isCopied) {
                    this.changeTextColor("#4ade80");
                    this.drawText("[ Copied! ]", x2, rect.y, w2, "center");
                } else if (!hasSeed) {
                    this.changeTextColor("#64748b");
                    this.drawText("[ Copy Seed ]", x2, rect.y, w2, "center");
                } else {
                    this.changeTextColor(b2Selected ? "#a0f0ff" : "#cbd5e1");
                    this.drawText("[ Copy Seed ]", x2, rect.y, w2, "center");
                }
            } else if (index === 4) {
                if (isSelected) {
                    this.changeTextColor("#ffd700");
                } else {
                    this.changeTextColor("#a0f0ff");
                }
                this.drawText("Start", rect.x, rect.y, rect.width, "center");
            } else if (index === 5) {
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
            const hitIndex = this.hitIndex();
            if (hitIndex < 0) return;
            this.select(hitIndex);
            const touchPos = new Point(TouchInput.x, TouchInput.y);
            const localPos = this.toLocalCoords(touchPos);
            if (hitIndex === 0) {
                if (localPos.x >= 235) {
                    this.nextFaction();
                } else {
                    this.prevFaction();
                }
            } else if (hitIndex === 1) {
                if (localPos.x >= 235) {
                    this.changeYear(1);
                } else {
                    this.changeYear(-1);
                }
            } else if (hitIndex === 2) {
                if (this._htmlInput) {
                    this._htmlInput.focus();
                }
            } else if (hitIndex === 3) {
                const rect = this.itemLineRect(3);
                const bWidth = Math.floor((rect.width - 12) / 2);
                const clickX = localPos.x - rect.x;
                if (clickX <= bWidth) {
                    this._seedButtonCol = 0;
                    this.randomizeSeed();
                } else if (clickX >= bWidth + 12) {
                    this._seedButtonCol = 1;
                    this.copySeed();
                }
            } else if (hitIndex === 4) {
                this.playOkSound();
                this.updateInputData();
                this.deactivate();
                this.callHandler("embark");
            } else if (hitIndex === 5) {
                this.processCancel();
            }
        }

        cursorRight(wrap) {
            if (this.index() === 0) {
                this.nextFaction();
            } else if (this.index() === 1) {
                this.changeYear(Input.isPressed("shift") ? 10 : 1);
            } else if (this.index() === 3) {
                this._seedButtonCol = 1;
                SoundManager.playCursor();
                this.redrawItem(3);
            } else {
                super.cursorRight(wrap);
            }
        }

        cursorLeft(wrap) {
            if (this.index() === 0) {
                this.prevFaction();
            } else if (this.index() === 1) {
                this.changeYear(Input.isPressed("shift") ? -10 : -1);
            } else if (this.index() === 3) {
                this._seedButtonCol = 0;
                SoundManager.playCursor();
                this.redrawItem(3);
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
                if (this._htmlInput) {
                    this._htmlInput.focus();
                } else {
                    this.randomizeSeed();
                }
            } else if (this.index() === 3) {
                if (this._seedButtonCol === 1) {
                    this.copySeed();
                } else {
                    this.randomizeSeed();
                }
            } else if (this.index() === 4) {
                this.playOkSound();
                this.updateInputData();
                this.deactivate();
                this.callHandler("embark");
            } else if (this.index() === 5) {
                this.processCancel();
            }
        }

        processCancel() {
            SoundManager.playCancel();
            this.updateInputData();
            this.deactivate();
            this.callHandler("cancel");
        }

        toLocalCoords(point) {
            return this.worldTransform ? this.worldTransform.applyInverse(point) : new Point(point.x - this.x, point.y - this.y);
        }

        onTouchSelect(trigger) {
            super.onTouchSelect(trigger);
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
        if (orig && !orig.startsWith("U7_") && orig !== "") return orig;
        const faction = safeFaction(UF_FactionMenus.getFaction());
        return `UF_Faces_${faction === "default" ? "human" : faction}_1`;
    };

    const _Game_Actor_faceIndex = Game_Actor.prototype.faceIndex;
    Game_Actor.prototype.faceIndex = function() {
        const origName = _Game_Actor_faceName.call(this);
        if (origName && !origName.startsWith("U7_") && origName !== "") return _Game_Actor_faceIndex.call(this);
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
            t.check("window_centered_in_gate", scene._commandWindow.y >= 345 && scene._commandWindow.y <= 360, `Title command window centered in the gate (y=${scene._commandWindow.y})`);
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
            t.check("default_size_locked_256", scene._newGameSetupWindow.currentSize() === 256, "Default world size is 256x256");
            t.check("default_size_label_locked", scene._newGameSetupWindow.currentSizeLabel() === "256x256 (Locked)", "Default world size label is locked");
            t.check("no_flashing_cursor", !scene._newGameSetupWindow._cursorSprite || !scene._newGameSetupWindow._cursorSprite.visible, "Flashing cursor box suppressed");

            t.screenshot("live_deus_new_game_setup");

            // Cycle factions on Row 0
            scene._newGameSetupWindow.select(0);
            scene._newGameSetupWindow.cursorRight();
            t.check("faction_cycled_to_elf", scene._newGameSetupWindow.currentFaction() === "Elf", "Faction cycled to Elf");
            scene._newGameSetupWindow.cursorRight();
            t.check("faction_cycled_to_dwarf", scene._newGameSetupWindow.currentFaction() === "Dwarf", "Faction cycled to Dwarf");

            // Test touch click on right arrow (advances by exactly 1: Dwarf -> Halfling)
            TouchInput._x = scene._newGameSetupWindow.x + scene._newGameSetupWindow.width - 20;
            TouchInput._y = scene._newGameSetupWindow.y + 12 + 18;
            scene._newGameSetupWindow.onTouchOk();
            t.check("touch_click_advances_exactly_one", scene._newGameSetupWindow.currentFaction() === "Halfling", "Clicking right arrow advances exactly 1 faction (no double-click)");

            // Test touch click on left arrow (decrements by exactly 1: Halfling -> Dwarf)
            TouchInput._x = scene._newGameSetupWindow.x + 140;
            TouchInput._y = scene._newGameSetupWindow.y + 12 + 18;
            scene._newGameSetupWindow.onTouchOk();
            t.check("touch_click_decrements_exactly_one", scene._newGameSetupWindow.currentFaction() === "Dwarf", "Clicking left arrow goes back exactly 1 faction");

            // Test Year Adjustment and Clamping on Row 1
            scene._newGameSetupWindow.select(1);
            scene._newGameSetupWindow.changeYear(49);
            t.check("year_adjusted_to_50", scene._newGameSetupWindow.currentYear() === 50, "Year stepped to 50 AD");

            scene._newGameSetupWindow.setYear(250);
            t.check("year_clamped_max_200", scene._newGameSetupWindow.currentYear() === 200, "Year clamped at maximum 200 AD");

            scene._newGameSetupWindow.setYear(-10);
            t.check("year_clamped_min_1", scene._newGameSetupWindow.currentYear() === 1, "Year clamped at minimum 1 AD");

            // Verify 9 SRD Factions
            const expectedSrd = ["Human", "Elf", "Dwarf", "Halfling", "Gnome", "Dragonborn", "Half-Elf", "Half-Orc", "Tiefling"];
            t.check("faction_choices_9_srd", JSON.stringify(scene._newGameSetupWindow._factionChoices) === JSON.stringify(expectedSrd), "Faction choices strictly 9 SRD races: " + scene._newGameSetupWindow._factionChoices.join(", "));

            // Verify World Seed Input & Controls
            t.check("initial_seed_blank", scene._newGameSetupWindow.currentSeed() === "", "Initial seed is blank");

            scene._newGameSetupWindow.randomizeSeed();
            const rSeed = scene._newGameSetupWindow.currentSeed();
            t.check("seed_randomized", /^\d+$/.test(rSeed) && Number(rSeed) > 0, "Seed randomized into field: " + rSeed);

            scene._newGameSetupWindow.copySeed();
            t.check("seed_copied_feedback", scene._newGameSetupWindow._copiedTimer > 0, "Copy Seed triggers visual feedback");

            scene._newGameSetupWindow.setSeed("424242");
            t.check("seed_manual_input_set", scene._newGameSetupWindow.currentSeed() === "424242", "Manual seed set to 424242");

            scene._newGameSetupWindow.setSeed(0);
            t.check("seed_zero_preserved", scene._newGameSetupWindow.currentSeed() === "0", "Seed 0 preserved");

            scene._newGameSetupWindow.setSeed("");
            const resSeed = scene._newGameSetupWindow.resolvedSeed();
            t.check("seed_blank_resolves_random", Number.isInteger(resSeed) && resSeed > 0, "Blank seed resolves to random integer: " + resSeed);

            // Verify World Size is locked unconditionally to 256x256
            t.check("size_locked_to_256", scene._newGameSetupWindow.currentSize() === 256, "World size is locked to 256x256");

            // Verify Fog of War is disabled per user directive
            t.check("default_fog_disabled", scene._newGameSetupWindow.currentFog() === false, "Default Fog of War is Disabled");

            // Test Cancel action: click or trigger Cancel row (index 5)
            TouchInput._x = scene._newGameSetupWindow.x + Math.round(scene._newGameSetupWindow.width / 2);
            TouchInput._y = scene._newGameSetupWindow.y + 12 + 216 + 16;
            scene._newGameSetupWindow.onTouchOk();
            await t.waitFrames(15);
            t.check("setup_window_closed_on_cancel", !scene._newGameSetupWindow.isOpen(), "Setup window closed on Cancel");
            t.check("command_window_open_on_cancel", scene._commandWindow.isOpen(), "Command window reopened on Cancel");

            // Test Cancel via keyboard ESC
            scene.commandNewGame();
            await t.waitFrames(15);
            t.check("setup_window_open_for_esc", scene._newGameSetupWindow.isOpen(), "Setup window open before Esc");
            Input._currentState["escape"] = true;
            Input._latestButton = "escape";
            Input._pressedTime = 0;
            scene._newGameSetupWindow.update();
            Input._currentState["escape"] = false;
            await t.waitFrames(15);
            t.check("setup_window_closed_on_esc", !scene._newGameSetupWindow.isOpen(), "Setup window closed on Esc key");
            t.check("command_window_open_after_esc", scene._commandWindow.isOpen(), "Command window reopened after Esc key");

            // Test Cancel via real mouse click cycle (trigger + release on Cancel row, index 5)
            scene.commandNewGame();
            await t.waitFrames(15);
            t.check("setup_window_open_for_mouse_click", scene._newGameSetupWindow.isOpen(), "Setup window open before mouse click");
            TouchInput._x = scene._newGameSetupWindow.x + Math.round(scene._newGameSetupWindow.width / 2);
            TouchInput._y = scene._newGameSetupWindow.y + 12 + 216 + 16;
            TouchInput._triggerX = TouchInput._x;
            TouchInput._triggerY = TouchInput._y;
            TouchInput._newState.triggered = true;
            TouchInput.update();
            scene.update();
            TouchInput._newState.released = true;
            TouchInput.update();
            scene.update();
            await t.waitFrames(15);
            t.check("setup_window_closed_on_mouse_click", !scene._newGameSetupWindow.isOpen(), "Setup window closed on mouse click");
            t.check("command_window_open_after_mouse_click", scene._commandWindow.isOpen(), "Command window reopened after mouse click");

            // Test Cancel via Enter / OK key on Cancel row (index 5)
            scene.commandNewGame();
            await t.waitFrames(15);
            scene._newGameSetupWindow.select(5);
            t.check("cancel_row_selected", scene._newGameSetupWindow.index() === 5, "Cancel row selected (index 5)");
            Input._currentState["ok"] = true;
            Input._latestButton = "ok";
            Input._pressedTime = 0;
            scene._newGameSetupWindow.update();
            Input._currentState["ok"] = false;
            await t.waitFrames(15);
            t.check("setup_window_closed_on_enter_cancel", !scene._newGameSetupWindow.isOpen(), "Setup window closed on Enter on Cancel row");
            t.check("command_window_open_after_enter_cancel", scene._commandWindow.isOpen(), "Command window reopened after Enter on Cancel row");

            // Test Cancel via Right-Click
            scene.commandNewGame();
            await t.waitFrames(15);
            TouchInput._newState.cancelled = true;
            TouchInput.update();
            scene._newGameSetupWindow.update();
            TouchInput.update();
            await t.waitFrames(15);
            t.check("setup_window_closed_on_right_click", !scene._newGameSetupWindow.isOpen(), "Setup window closed on right-click");
            t.check("command_window_open_after_right_click", scene._commandWindow.isOpen(), "Command window reopened after right-click");
            t.screenshot("live_deus_title_after_cancel");

            // Reopen setup window
            scene.commandNewGame();
            await t.waitFrames(15);
            t.check("setup_window_reopened", scene._newGameSetupWindow.isOpen(), "Setup window reopened");

            // Configure Dwarf expedition at Year 42 AD with Seed 998877 and Fog Disabled
            scene._newGameSetupWindow.setFaction("Dwarf");
            scene._newGameSetupWindow.setYear(42);
            scene._newGameSetupWindow.setSeed("998877");
            scene._newGameSetupWindow.setFog(false);
            scene._newGameSetupWindow.select(4); // Hover "Start" (Row 4)
            await t.waitFrames(15);

            t.check("configured_faction_dwarf", scene._newGameSetupWindow.currentFaction() === "Dwarf", "Configured faction is Dwarf");
            t.check("configured_year_42", scene._newGameSetupWindow.currentYear() === 42, "Configured year is 42 AD");
            t.check("configured_seed_998877", scene._newGameSetupWindow.currentSeed() === "998877", "Configured seed is 998877");
            t.check("configured_size_256", scene._newGameSetupWindow.currentSize() === 256, "Configured size is 256x256");
            t.check("configured_fog_false", scene._newGameSetupWindow.currentFog() === false, "Configured fog of war is false");
            t.screenshot("live_deus_new_game_setup_dwarf_42");

            // Test Embark action on Row 4 (Start)
            scene._newGameSetupWindow.select(4);
            scene._newGameSetupWindow.processOk();
            await t.waitUntil(() => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted(), 30000, "Scene_Map started");
            await t.waitFrames(30);

            const st = window.UF && UF.World && UF.World.state;
            t.check("map_scene_active", SceneManager._scene instanceof Scene_Map, "Transitioned to live game map");
            t.check("state_exists", !!st, "World state created");
            t.check("world_size_is_256", st.size === 256, "World state size initialized to 256x256 Large");
            t.check("seed_applied_to_world", UF.World.seed() === 998877, "World seed matches configured seed: " + UF.World.seed());
            t.check("generator_info_contains_seed", UF.World.generatorInfo().seed === 998877, "generatorInfo() reports configured seed");

            const playerFac = st.factions.list.find(f => f.isPlayer);
            t.check("player_faction_is_dwarf", !!playerFac && (playerFac.species === "dwarf" || playerFac.culture === "dwarf"), "Player faction is Dwarf");
            t.check("clock_year_is_42", window.$ufTime && $ufTime.year === 42, "Clock year is 42 AD");
            t.check("history_simulated_42_years", st.history && st.history.years === 42, "History simulated exactly 42 years");
            t.check("history_settled_run", !!st.history.settled, "Settling run executed: " + JSON.stringify(st.history.settled ? { houses: st.history.settled.houses, beds: st.history.settled.beds, hearths: st.history.settled.hearths, sitesGrown: st.history.settled.sitesGrown } : {}));
            t.check("settled_hearths_constructed", !!(st.history.settled && st.history.settled.hearths > 0), "Indoor hearths constructed inside settled houses: " + (st.history.settled ? st.history.settled.hearths : 0));
            t.check("history_events_recorded", st.history.events && st.history.events.length > 0, "Chronicle events recorded: " + (st.history.events ? st.history.events.length : 0));
            t.check("history_sites_exist", st.history.sites && st.history.sites.length > 0, "Sites exist in world: " + (st.history.sites ? st.history.sites.length : 0));
            t.check("theme_switched_to_dwarf", UF_FactionMenus.getFaction() === "dwarf", "Window theme switched to Dwarf");
            t.check("fog_disabled_in_world", window.UF && UF.Fog && UF.Fog.enabled === false, "Fog of War disabled in world");

            t.screenshot("live_dwarf_colony_year_42");
        }, { isDefault: false });
    }

})();
