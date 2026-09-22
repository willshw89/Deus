//=============================================================================
// RPG Maker MZ - Ultima Fortress: Container Gumps & Paperdoll Inventory
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Gumps] Container windows (chests, barrels, sacks) and paperdoll equipment interface.
 * @author Deepdelve Architect
 *
 * @param EnableGumps
 * @text Enable Container Gumps
 * @type boolean
 * @default true
 *
 * @param EnablePaperdoll
 * @text Enable Paperdoll Inventory (Key 'I')
 * @type boolean
 * @default true
 *
 * @help
 * ============================================================================
 * Ultima Fortress Gumps Plugin
 * ============================================================================
 * Features:
 * 1. Container Gumps:
 *    - Events tagged with <container: chest|barrel|sack|crate> or activated
 *      via Plugin Command will open a plain code-drawn container window.
 *    - Store and take items with interactive tactile clicking.
 *
 * 2. Paperdoll Inventory (Press 'I'):
 *    - Displays character equipment slots: Head, Torso, Weapon, Shield, Boots.
 *    - Displays Dwarf Fortress attributes and carried weight.
 *
 * Plugin Commands:
 * - OpenContainer [containerId] [type]
 * - OpenPaperdoll
 *
 * Portrait placeholder: stock People1, face 0 (AR-700).
 * Container placeholder: code-drawn panel (AR-800). No container image loads.
 * Replaced core methods: none. Container background rendering is overridden
 * only on this plugin's Window_Selectable subclass.
 */

(() => {
    "use strict";

    const pluginName = "DEUS_Gumps";
    const params = PluginManager.parameters(pluginName);
    const enableGumps = (params["EnableGumps"] || "true") === "true";
    const enablePaperdoll = (params["EnablePaperdoll"] || "true") === "true";
    const PAPERDOLL_FACE = "People1";

    window.UF_Gumps = {};

    // Container storage dictionary
    window.$ufContainers = window.$ufContainers || {};

    function getContainer(id, defaultType = "chest") {
        if (!$ufContainers[id]) {
            $ufContainers[id] = {
                type: defaultType,
                items: []
            };
        }
        return $ufContainers[id];
    }

    // Save / Load Container State
    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DataManager_makeSaveContents.call(this);
        contents.ufContainers = $ufContainers;
        return contents;
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        if (contents.ufContainers) {
            $ufContainers = contents.ufContainers;
        }
    };

    //-----------------------------------------------------------------------------
    // Window_UFContainerGump
    //-----------------------------------------------------------------------------
    class Window_UFContainerGump extends Window_Selectable {
        constructor(containerId, type = "chest") {
            const width = 360;
            const height = 240;
            const x = Math.floor((Graphics.width - width) / 2);
            const y = Math.floor((Graphics.height - height) / 2);
            super(new Rectangle(x, y, width, height));

            this.containerId = containerId;
            this.containerType = type;
            this.opacity = 250;
            this.backOpacity = 255;
            this.frameVisible = false;
            this._dragging = false;
            this._dragOffsetX = 0;
            this._dragOffsetY = 0;

            this.refresh();
            this.activate();
            this.select(0);
        }

        loadGumpBackground() {
            // The back sprite owns the visible plain panel; no asset is loaded.
            const width = Math.max(1, this.width);
            const height = Math.max(1, this.height);
            if (!this._bgBitmap) this._bgBitmap = new Bitmap(width, height);
            if (this._bgBitmap.width !== width || this._bgBitmap.height !== height) {
                this._bgBitmap.resize(width, height);
            }
            this._bgBitmap.fillAll("#89775c");
            this._bgBitmap.fillRect(2, 2, width - 4, height - 4, "#292b30");
            this._backSprite.bitmap = this._bgBitmap;
            this._backSprite.setFrame(0, 0, width, height);
            this._backSprite.move(0, 0);
            this._backSprite.scale.set(1, 1);
            for (const child of this._backSprite.children) child.visible = false;
        }

        _refreshBack() {
            this.loadGumpBackground();
        }

        maxItems() {
            const data = getContainer(this.containerId, this.containerType);
            return data.items.length + 1; // +1 for "Close Container" or empty slot
        }

        item(index) {
            const data = getContainer(this.containerId, this.containerType);
            return data.items[index] || null;
        }

        drawItem(index) {
            const rect = this.itemLineRect(index);
            const itemObj = this.item(index);
            this.contents.fontSize = 14;

            if (itemObj) {
                const dbItem = $dataItems[itemObj.id] || $dataWeapons[itemObj.id] || $dataArmors[itemObj.id];
                if (dbItem) {
                    this.drawIcon(dbItem.iconIndex || 16, rect.x, rect.y);
                    this.drawText(dbItem.name, rect.x + 36, rect.y, rect.width - 90, "left");
                    this.drawText(`x${itemObj.amount}`, rect.x + rect.width - 50, rect.y, 45, "right");
                }
            } else {
                this.changeTextColor(ColorManager.textColor(7));
                this.drawText("[ Close Container ]", rect.x, rect.y, rect.width, "center");
                this.changeTextColor(ColorManager.normalColor());
            }
        }

        drawAllItems() {
            // Container Header
            this.contents.fontSize = 15;
            this.changeTextColor(ColorManager.textColor(14));
            const title = `${this.containerType.toUpperCase()} - ${this.containerId}`;
            this.drawText(title, 0, 0, this.innerWidth, "center");
            this.changeTextColor(ColorManager.normalColor());
            super.drawAllItems();
        }

        itemLineRect(index) {
            const rect = super.itemLineRect(index);
            rect.y += 28; // Space for header
            return rect;
        }

        processOk() {
            const index = this.index();
            const itemObj = this.item(index);
            const data = getContainer(this.containerId, this.containerType);

            if (itemObj) {
                // Transfer item to player party
                const dbItem = $dataItems[itemObj.id] || $dataWeapons[itemObj.id] || $dataArmors[itemObj.id];
                $gameParty.gainItem(dbItem, 1);
                SoundManager.playShop();
                itemObj.amount--;
                if (itemObj.amount <= 0) {
                    data.items.splice(index, 1);
                }
                this.refresh();
                this.activate();
            } else {
                // Close container
                SoundManager.playCancel();
                this.close();
            }
        }

        close() {
            super.close();
            if (this.parent) {
                this.parent.removeChild(this);
            }
            if (SceneManager._scene) {
                SceneManager._scene._activeContainerGump = null;
            }
        }
    }

    //-----------------------------------------------------------------------------
    // Window_UFPaperdoll (Character Equipment & Stats)
    //-----------------------------------------------------------------------------
    class Window_UFPaperdoll extends Window_Base {
        constructor() {
            const width = 480;
            const height = 480;
            const x = Math.floor((Graphics.width - width) / 2);
            const y = Math.floor((Graphics.height - height) / 2);
            super(new Rectangle(x, y, width, height));
            this.opacity = 245;
            this._faceBitmap = ImageManager.loadFace(PAPERDOLL_FACE);
            this._faceBitmap.addLoadListener(() => {
                if (!this._destroyed) this.refresh();
            });
            this.refresh();
        }

        refresh() {
            this.contents.clear();
            const actor = $gameParty.leader();
            if (!actor) return;

            // Title
            this.contents.fontSize = 18;
            this.changeTextColor(ColorManager.textColor(14));
            this.drawText(`EQUIPMENT: ${actor.name()}`, 0, 4, this.innerWidth, "center");

            // Character Figure / Face
            this.drawFace(PAPERDOLL_FACE, 0, 16, 40, 100, 100);

            // DF Attributes
            this.contents.fontSize = 14;
            this.changeTextColor(ColorManager.textColor(6));
            this.drawText(`Profession: ${actor.currentClass().name}`, 130, 40, 300, "left");
            this.changeTextColor(ColorManager.normalColor());
            this.drawText(`Level: ${actor.level}`, 130, 62, 140, "left");
            this.drawText(`Exp: ${actor.currentExp()}`, 270, 62, 140, "left");

            this.drawText(`Strength: ${actor.atk}`, 130, 84, 140, "left");
            this.drawText(`Agility: ${actor.agi}`, 270, 84, 140, "left");
            this.drawText(`Toughness: ${actor.def}`, 130, 106, 140, "left");
            this.drawText(`Focus: ${actor.mat}`, 270, 106, 140, "left");

            // Divider
            this.contents.fillRect(16, 140, this.innerWidth - 32, 2, "rgba(200, 157, 92, 0.5)");

            // Equipment Slots (Ultima Style)
            this.changeTextColor(ColorManager.textColor(14));
            this.drawText("EQUIPPED GEAR", 16, 148, 200, "left");
            this.changeTextColor(ColorManager.normalColor());

            const slots = [
                { name: "Head", item: actor.equips()[2] },
                { name: "Torso", item: actor.equips()[3] },
                { name: "Main Hand", item: actor.equips()[0] },
                { name: "Off Hand", item: actor.equips()[1] },
                { name: "Feet", item: actor.equips()[4] }
            ];

            let ey = 176;
            for (const slot of slots) {
                this.changeTextColor(ColorManager.textColor(7));
                this.drawText(`[${slot.name}]`, 24, ey, 90, "left");
                this.changeTextColor(ColorManager.normalColor());

                if (slot.item) {
                    this.drawIcon(slot.item.iconIndex || 16, 120, ey);
                    this.drawText(slot.item.name, 156, ey, 280, "left");
                } else {
                    this.changeTextColor(ColorManager.textColor(8));
                    this.drawText("<Empty>", 156, ey, 200, "left");
                }
                ey += 28;
            }

            // Health & Wounds
            this.contents.fillRect(16, 326, this.innerWidth - 32, 2, "rgba(200, 157, 92, 0.5)");
            this.changeTextColor(ColorManager.textColor(14));
            this.drawText("PHYSICAL CONDITION", 16, 334, 200, "left");

            // DF status
            const hpRatio = actor.hp / actor.mhp;
            let conditionText = "Healthy / Uninjured";
            let condColor = 3; // Green
            if (hpRatio < 0.3) {
                conditionText = "Critical Wounds / Blood Loss!";
                condColor = 10; // Red
            } else if (hpRatio < 0.7) {
                conditionText = "Bruised & Lacerated";
                condColor = 14; // Yellow
            }

            this.changeTextColor(ColorManager.textColor(condColor));
            this.drawText(`Status: ${conditionText}`, 24, 360, 400, "left");
            this.changeTextColor(ColorManager.normalColor());
            this.drawText(`Vitality: ${actor.hp} / ${actor.mhp}`, 24, 384, 200, "left");
            this.drawText(`Stamina: ${actor.mp} / ${actor.mmp}`, 240, 384, 200, "left");

            // Footer instructions
            this.contents.fontSize = 12;
            this.changeTextColor(ColorManager.textColor(7));
            this.drawText("Press [I] or [ESC] to Close", 0, this.innerHeight - 24, this.innerWidth, "center");
        }

        close() {
            super.close();
            if (this.parent) {
                this.parent.removeChild(this);
            }
            if (SceneManager._scene) {
                SceneManager._scene._activePaperdoll = null;
            }
        }
    }

    //-----------------------------------------------------------------------------
    // Hook Container & Paperdoll into Scene_Map
    //-----------------------------------------------------------------------------
    UF_Gumps.openContainer = function(containerId, type = "chest") {
        if (!enableGumps || !SceneManager._scene) return;
        if (SceneManager._scene._activeContainerGump) {
            SceneManager._scene._activeContainerGump.close();
        }
        const gump = new Window_UFContainerGump(containerId, type);
        SceneManager._scene._activeContainerGump = gump;
        SceneManager._scene.addChild(gump);
        SoundManager.playEquip();
    };

    UF_Gumps.openPaperdoll = function() {
        if (!enablePaperdoll || !SceneManager._scene) return;
        if (SceneManager._scene._activePaperdoll) {
            SceneManager._scene._activePaperdoll.close();
            SceneManager._scene._activePaperdoll = null;
            SoundManager.playCancel();
            return;
        }
        const pd = new Window_UFPaperdoll();
        SceneManager._scene._activePaperdoll = pd;
        SceneManager._scene.addChild(pd);
        SoundManager.playOk();
    };

    // Keyboard listener for 'I'
    const _Scene_Map_updateScene = Scene_Map.prototype.updateScene;
    Scene_Map.prototype.updateScene = function() {
        _Scene_Map_updateScene.call(this);
        if (enablePaperdoll) {
            if (Input.isTriggered("menu") || Input.isTriggered("cancel")) {
                if (this._activePaperdoll) {
                    this._activePaperdoll.close();
                    this._activePaperdoll = null;
                    SoundManager.playCancel();
                    return;
                }
            }
        }
    };

    // Listen for 'I' key
    Input.keyMapper[73] = "paperdoll"; // 73 = 'I'
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (enablePaperdoll && Input.isTriggered("paperdoll") && !$gameMessage.isBusy()) {
            UF_Gumps.openPaperdoll();
        }
    };

    // Check event interaction for containers
    const _Game_Event_start = Game_Event.prototype.start;
    Game_Event.prototype.start = function() {
        if (enableGumps && this.event() && this.event().note) {
            const match = this.event().note.match(/<container:\s*(\w+)(?:,\s*(\w+))?>/i);
            if (match) {
                const type = match[1].toLowerCase();
                const id = match[2] || `chest_${this.eventId()}`;
                UF_Gumps.openContainer(id, type);
                return;
            }
        }
        _Game_Event_start.call(this);
    };

    // Plugin Commands
    PluginManager.registerCommand(pluginName, "OpenContainer", args => {
        UF_Gumps.openContainer(args.containerId, args.type || "chest");
    });

    PluginManager.registerCommand(pluginName, "OpenPaperdoll", () => {
        UF_Gumps.openPaperdoll();
    });

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF && UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("gumps", async t => {
            const scene = SceneManager._scene;
            const id = "TEST_gumps_stock";
            const previous = $ufContainers[id];
            const loadSystem = ImageManager.loadSystem;
            const loadFace = ImageManager.loadFace;
            const requests = [];
            ImageManager.loadSystem = function(name) {
                requests.push(`system:${name}`);
                return loadSystem.call(this, name);
            };
            ImageManager.loadFace = function(name) {
                requests.push(`face:${name}`);
                return loadFace.call(this, name);
            };
            const dbItem = $dataItems.find(item => item && item.name);
            const originalCount = dbItem ? $gameParty.numItems(dbItem) : 0;
            const errorsBefore = t.errorsSoFar().length;
            try {
                t.check("enabled", enableGumps && enablePaperdoll, "both plugin parameters must be true for this suite");
                for (const type of ["chest", "barrel", "backpack", "sack", "crate"]) {
                    $ufContainers[id] = { type, items: dbItem ? [{ id: dbItem.id, amount: 2 }] : [] };
                    UF_Gumps.openContainer(id, type);
                    const win = scene._activeContainerGump;
                    await t.waitFrames(2);
                    const bg = win && win._backSprite.bitmap;
                    t.check(`plain_${type}`, !!win && win.parent === scene && win.visible && win.isOpen() &&
                        win.opacity > 0 && win.backOpacity > 0 && !win.frameVisible &&
                        win.x >= 0 && win.y >= 0 && win.x + win.width <= Graphics.width && win.y + win.height <= Graphics.height &&
                        bg === win._bgBitmap && !bg.url && bg.width === 360 && bg.height === 240 &&
                        bg.getPixel(0, 0) === "#89775c" && bg.getPixel(20, 20) === "#292b30" &&
                        bg.getAlphaPixel(20, 20) === 255,
                        `visible ${type} panel with code-drawn border and opaque interior`);
                    if (type === "chest" && win) {
                        t.screenshot("plain_container");
                        if (dbItem) {
                            win.select(0);
                            win.processOk();
                        }
                        t.check("take_item", !!dbItem && $gameParty.numItems(dbItem) === originalCount + 1 &&
                            $ufContainers[id].items[0].amount === 1, "one item transferred, one left in container");
                        const saved = JsonEx.parse(JsonEx.stringify(DataManager.makeSaveContents()));
                        t.check("save_roundtrip", saved.ufContainers && saved.ufContainers[id].type === "chest" &&
                            saved.ufContainers[id].items[0].amount === 1, "container type and remaining amount survive save serialization");
                    }
                    if (win) {
                        win.select(win.maxItems() - 1);
                        win.processOk();
                        t.check(`close_${type}`, !scene._activeContainerGump && !win.parent, "close entry detaches the window");
                    }
                }
                if (scene._activePaperdoll) scene._activePaperdoll.close();
                UF_Gumps.openPaperdoll();
                const pd = scene._activePaperdoll;
                await t.waitUntil(() => pd && pd._faceBitmap.isReady(), 5000, "stock paperdoll face");
                await t.waitFrames(2);
                const facePixels = pd.contents.context.getImageData(16, 40, 100, 100).data;
                let opaque = 0;
                for (let i = 3; i < facePixels.length; i += 4) if (facePixels[i]) opaque++;
                t.check("stock_face_drawn", pd.parent === scene && pd.visible && pd.isOpen() && pd.opacity > 0 &&
                    pd._faceBitmap.url.endsWith("/People1.png") && opaque > 1000,
                    `People1 portrait has ${opaque} painted pixels in its destination rectangle`);
                t.screenshot("stock_paperdoll");
                t.check("runtime_no_standins", requests.some(name => name === "face:People1") &&
                    !requests.some(name => /u7_/i.test(name)), `image requests: ${requests.join(", ")}`);
                t.check("no_container_images", !requests.some(name => /^system:.*gump/i.test(name)),
                    "container backgrounds use Bitmap drawing, with no gump image request");
                UF_Gumps.openPaperdoll();
                t.check("paperdoll_toggle", !scene._activePaperdoll && !pd.parent, "second open toggles the paperdoll closed");
                t.check("no_new_errors", t.errorsSoFar().length === errorsBefore, t.errorsSoFar().slice(errorsBefore).join("; ") || "none");
            } finally {
                ImageManager.loadSystem = loadSystem;
                ImageManager.loadFace = loadFace;
                if (scene._activeContainerGump) scene._activeContainerGump.close();
                if (scene._activePaperdoll) scene._activePaperdoll.close();
                if (previous === undefined) delete $ufContainers[id];
                else $ufContainers[id] = previous;
                if (dbItem) $gameParty.gainItem(dbItem, originalCount - $gameParty.numItems(dbItem));
            }
        }, { isDefault: false });
    }

})();
