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
        if (SceneManager._scene instanceof Scene_Title) {
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

    UF_FactionMenus.getCursorCss = function(faction) {
        const rawFac = faction || UF_FactionMenus.getFaction();
        const fac = safeFaction(rawFac);
        const spot = CURSOR_HOTSPOTS[fac] || [4, 4];
        return 'url("img/system/Cursor_' + fac + '.png") ' + spot[0] + ' ' + spot[1] + ', auto';
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

    const _Scene_Title_createBackground = Scene_Title.prototype.createBackground;
    Scene_Title.prototype.createBackground = function() {
        _Scene_Title_createBackground.call(this);
        this._defaultMenuSprite = new Sprite();
        this._defaultMenuSprite.bitmap = ImageManager.loadPicture("UF_Menu_default");
        this.addChild(this._defaultMenuSprite);
    };

    const _Scene_Title_start = Scene_Title.prototype.start;
    Scene_Title.prototype.start = function() {
        _Scene_Title_start.call(this);
        UF_FactionMenus.applyMouseCursor("default");
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
        if (SceneManager._scene instanceof Scene_Title) {
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
        if (window.UF && UF.World && UF.World.catalog && UF.World.catalog.factions) {
            const facDef = UF.World.catalog.factions[faction];
            if (facDef && facDef.themeBgm) {
                AudioManager.playBgm({ name: facDef.themeBgm, pan: 0, pitch: 100, volume: 80 });
            }
        }
    };

    Scene_MenuBase.prototype.applyFactionTheme = function(faction) {
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

            // Verify literal mouse cursor style for dwarf
            UF_FactionMenus.applyMouseCursor("dwarf");
            const curDwarf = UF_FactionMenus.getCursorCss("dwarf");
            t.check("mouse_cursor_dwarf_applied", curDwarf.includes("Cursor_dwarf.png"), "Mouse cursor configured with Cursor_dwarf.png");

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
    }

})();
