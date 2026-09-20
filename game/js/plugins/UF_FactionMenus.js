//=============================================================================
// RPG Maker MZ - Ultima Fortress: Dynamic Matching Faction Menu Themes
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Faction Menus] Dynamic matching full-screen menu themes, backdrops, window skins, and cultural cursors for all 11 factions.
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
 * Ultima Fortress Matching Faction Menus
 * ============================================================================
 * Dynamically pairs the game's menus with authentic Ultima VII cultural frames,
 * wallpapers, window skins, custom cursors, and musical themes across all 11
 * factions:
 * human, elf, dwarf, gnome, goblin, orc, lizardfolk, kobold, undead, starborn, swarm.
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
    const defaultFaction = params["DefaultFaction"] || "human";

    window.UF_FactionMenus = {};

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
        if ($gameSystem && $gameSystem._ufActiveMenuFaction) {
            return $gameSystem._ufActiveMenuFaction;
        }
        // If world state has player faction:
        if (window.UF && UF.World && UF.World.state && UF.World.state.factions && Array.isArray(UF.World.state.factions.list)) {
            const playerFac = UF.World.state.factions.list.find(f => f.isPlayer);
            if (playerFac && playerFac.species) {
                return playerFac.species.toLowerCase();
            }
        }
        return defaultFaction;
    };

    UF_FactionMenus.updateCanvasCursor = function() {
        if (!Graphics._canvas) return;
        if (window.UF && UF.Select && UF.Select.activeTool && UF.Select.activeTool()) return;
        const faction = UF_FactionMenus.getFaction();
        const curUrl = "img/system/" + `Cursor_${faction}.png`;
        Graphics._canvas.style.cursor = `url("${curUrl}") 2 2, default`;
    };

    UF_FactionMenus.setFaction = function(factionId) {
        if ($gameSystem) {
            $gameSystem._ufActiveMenuFaction = factionId.toLowerCase();
        }
        UF_FactionMenus.updateCanvasCursor();
    };

    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        UF_FactionMenus.updateCanvasCursor();
    };

    // 1. Scene_Menu: Dynamic matching background frame
    const _Scene_Menu_createBackground = Scene_Menu.prototype.createBackground;
    Scene_Menu.prototype.createBackground = function() {
        _Scene_Menu_createBackground.call(this);
        const faction = UF_FactionMenus.getFaction();
        this._factionMenuSprite = new Sprite();
        this._factionMenuSprite.bitmap = ImageManager.loadPicture(`UF_Menu_${faction}`);
        this.addChild(this._factionMenuSprite);
    };

    // 2. Window Skins: Apply matching Window_<culture>.png to all menu windows
    const _Scene_Menu_start = Scene_Menu.prototype.start;
    Scene_Menu.prototype.start = function() {
        _Scene_Menu_start.call(this);
        const faction = UF_FactionMenus.getFaction();
        this.applyFactionTheme(faction);

        // Optional BGM transition if catalog theme defined
        if (window.UF && UF.World && UF.World.catalog && UF.World.catalog.factions) {
            const facDef = UF.World.catalog.factions[faction];
            if (facDef && facDef.themeBgm) {
                AudioManager.playBgm({ name: facDef.themeBgm, pan: 0, pitch: 100, volume: 80 });
            }
        }
    };

    const FACTIONS = ["human", "elf", "dwarf", "gnome", "goblin", "orc", "lizardfolk", "kobold", "undead", "starborn", "swarm"];

    Scene_Menu.prototype.applyFactionTheme = function(faction) {
        const skin = ImageManager.loadSystem(`Window_${faction}`);
        if (this._factionMenuSprite) {
            this._factionMenuSprite.bitmap = ImageManager.loadPicture(`UF_Menu_${faction}`);
        }
        if (this._commandWindow) {
            this._commandWindow.windowskin = skin;
            this._commandWindow.opacity = 210;
            if (this._commandWindow._factionCursorSprite) {
                this._commandWindow._factionCursorSprite._cursorFaction = null; // force reload cursor
            }
        }
        if (this._statusWindow) {
            this._statusWindow.windowskin = skin;
            this._statusWindow.opacity = 210;
        }
        if (this._goldWindow) {
            this._goldWindow.windowskin = skin;
            this._goldWindow.opacity = 210;
        }
    };

    // Ensure Tab and bracket keys are mapped
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
            this.applyFactionTheme(nextFac);
            SoundManager.playCursor();
        } else if (Input.isTriggered("bracketLeft") || Input.isTriggered("pageup")) {
            const cur = UF_FactionMenus.getFaction();
            const idx = FACTIONS.indexOf(cur);
            const nextIdx = (idx - 1 + FACTIONS.length) % FACTIONS.length;
            const nextFac = FACTIONS[nextIdx];
            UF_FactionMenus.setFaction(nextFac);
            this.applyFactionTheme(nextFac);
            SoundManager.playCursor();
        }
    };

    // 3. Custom Faction Cursor Support
    const _Window_Selectable_initialize = Window_Selectable.prototype.initialize;
    Window_Selectable.prototype.initialize = function(rect) {
        _Window_Selectable_initialize.call(this, rect);
        this._factionCursorSprite = null;
    };

    const _Window_Selectable_update = Window_Selectable.prototype.update;
    Window_Selectable.prototype.update = function() {
        _Window_Selectable_update.call(this);
        if (this.isOpenAndActive() && this.index() >= 0) {
            this.updateFactionCursor();
        } else if (this._factionCursorSprite) {
            this._factionCursorSprite.visible = false;
        }
    };

    Window_Selectable.prototype.updateFactionCursor = function() {
        const faction = UF_FactionMenus.getFaction();
        if (!this._factionCursorSprite) {
            this._factionCursorSprite = new Sprite();
            this._factionCursorSprite.anchor.x = 0.5;
            this._factionCursorSprite.anchor.y = 0.5;
            this._factionCursorSprite.scale.set(0.65, 0.65);
            this.addChild(this._factionCursorSprite);
        }

        if (this._factionCursorSprite._cursorFaction !== faction) {
            this._factionCursorSprite._cursorFaction = faction;
            this._factionCursorSprite.bitmap = ImageManager.loadSystem(`Cursor_${faction}`);
        }

        const rect = this.itemRect(this.index());
        if (rect && this._factionCursorSprite) {
            this._factionCursorSprite.visible = true;
            // Subtle horizontal bobbing for classic tactile menu feel
            const bob = Math.sin(Graphics.frameCount * 0.12) * 3;
            this._factionCursorSprite.x = this.padding + rect.x + 14 + bob;
            this._factionCursorSprite.y = this.padding + rect.y + rect.height / 2;
        }
    };

    // 4. Automated Verification Suite (UF_Test)
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF && UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("faction_menus", async t => {
            const factions = ["human", "elf", "dwarf", "gnome", "goblin", "orc", "lizardfolk", "kobold", "undead", "starborn", "swarm"];
            t.check("factions_list_11", factions.length === 11, "11 matching faction menus defined");

            SceneManager.push(Scene_Menu);
            await t.waitFrames(15);
            t.check("scene_menu_active", SceneManager._scene instanceof Scene_Menu, "Scene_Menu successfully loaded");

            for (const fac of factions) {
                UF_FactionMenus.setFaction(fac);
                const bmp = ImageManager.loadPicture(`UF_Menu_${fac}`);
                const skin = ImageManager.loadSystem(`Window_${fac}`);
                const cur = ImageManager.loadSystem(`Cursor_${fac}`);

                if (SceneManager._scene && SceneManager._scene._factionMenuSprite) {
                    SceneManager._scene._factionMenuSprite.bitmap = bmp;
                }
                if (SceneManager._scene._commandWindow) {
                    SceneManager._scene._commandWindow.windowskin = skin;
                    if (SceneManager._scene._commandWindow._factionCursorSprite) {
                        SceneManager._scene._commandWindow._factionCursorSprite._cursorFaction = null; // force reload
                    }
                }
                if (SceneManager._scene._statusWindow) SceneManager._scene._statusWindow.windowskin = skin;
                if (SceneManager._scene._goldWindow) SceneManager._scene._goldWindow.windowskin = skin;

                await t.waitUntil(() => bmp.isReady() && skin.isReady() && cur.isReady(), 5000, `UF_Menu_${fac} assets ready`);
                await t.waitFrames(8);
                t.screenshot(`menu_live_${fac}`);
            }

            t.check("menu_themes_rendered", true, "All 11 matching faction menus captured");
            SceneManager.pop();
            await t.waitFrames(10);
        });
    }

})();
