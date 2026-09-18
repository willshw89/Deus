//=============================================================================
// RPG Maker MZ - Ultima Fortress: Container Gumps & Paperdoll Inventory
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Gumps] Draggable container gumps (chests, barrels, sacks) and classic U7 paperdoll equipment interface.
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
 *      via Plugin Command will open an authentic draggable Ultima container.
 *    - Store and take items with interactive tactile clicking.
 *
 * 2. Paperdoll Inventory (Press 'I'):
 *    - Displays character equipment slots: Head, Torso, Weapon, Shield, Boots.
 *    - Displays Dwarf Fortress attributes and carried weight.
 *
 * Plugin Commands:
 * - OpenContainer [containerId] [type]
 * - OpenPaperdoll
 */

(() => {
    "use strict";

    const pluginName = "UF_Gumps";
    const params = PluginManager.parameters(pluginName);
    const enableGumps = (params["EnableGumps"] || "true") === "true";
    const enablePaperdoll = (params["EnablePaperdoll"] || "true") === "true";

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
            this._dragging = false;
            this._dragOffsetX = 0;
            this._dragOffsetY = 0;

            this.loadGumpBackground();
            this.refresh();
            this.activate();
            this.select(0);
        }

        loadGumpBackground() {
            // Load authentic U7 container image
            let imgName = "u7_gump_chest";
            if (this.containerType === "barrel") imgName = "u7_gump_barrel";
            if (this.containerType === "backpack") imgName = "u7_gump_backpack";
            if (this.containerType === "sack") imgName = "u7_gump_sack";
            this._bgBitmap = ImageManager.loadSystem(imgName);
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
            this.refresh();
        }

        refresh() {
            this.contents.clear();
            const actor = $gameParty.leader();
            if (!actor) return;

            // Title
            this.contents.fontSize = 18;
            this.changeTextColor(ColorManager.textColor(14));
            this.drawText(`DWARF FORTRESS PAPERDOLL: ${actor.name()}`, 0, 4, this.innerWidth, "center");

            // Character Figure / Face
            this.drawFace("U7_Faces", 0, 16, 40, 100, 100);

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

})();
