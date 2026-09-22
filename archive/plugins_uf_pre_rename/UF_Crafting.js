//=============================================================================
// RPG Maker MZ - Ultima Fortress: Dwarf Fortress Workshop Crafting & Reactions
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Crafting] Dwarf Fortress workshop reactions (Brewing, Smelting, Forging, Precursor Fabrication) and Strange Artisan Moods.
 * @author Deepdelve Architect
 *
 * @help
 * ============================================================================
 * Ultima Fortress Crafting & Workshop Reactions
 * ============================================================================
 * Implements interactive workshop reactions based on Dwarf Fortress mechanics:
 * - Brewery: Brews Black Iron-Stout from roasted glow-spores.
 * - Smelter: Smelts raw ironstone ore into refined bars using coal.
 * - Volcanic Forge: Forges Star-Iron cleavers and broadswords.
 * - Precursor Fabricator: Assembles bionic pneumatic limbs and arc-blades using
 *   aetheric power cells and void-silver conduits.
 *
 * Event Note Tags:
 * <workshop: forge>
 * <workshop: brewery>
 * <workshop: smelter>
 * <workshop: fabricator>
 *
 * Interacting with a workshop station opens the tactile reaction gump.
 */

(() => {
    "use strict";

    const pluginName = "UF_Crafting";
    window.UF_Crafting = {};

    let dfReactions = null;

    function loadReactions() {
        if (typeof require === "function") {
            try {
                const fs = require("fs");
                const path = require("path");
                const base = path.dirname(process.mainModule.filename);
                const rFile = path.join(base, "data", "df_reactions.json");
                if (fs.existsSync(rFile)) {
                    dfReactions = JSON.parse(fs.readFileSync(rFile, "utf8"));
                }
            } catch (e) {}
        }
        if (!dfReactions) {
            fetch("data/df_reactions.json").then(r => r.json()).then(d => { dfReactions = d; }).catch(() => {});
        }
    }
    loadReactions();

    const BUILTIN_RECIPES = {
        brewery: [
            {
                id: "BREW_BLACK_IRON_STOUT",
                name: "Brew Black Iron-Stout",
                description: "Ferment glow-spores into 5 flagons of hearty Black Iron-Stout.",
                reagents: [{ itemId: 2, name: "Roasted Glow-Spores", count: 1 }],
                product: { itemId: 1, name: "Black Iron-Stout", count: 5 }
            }
        ],
        smelter: [
            {
                id: "SMELT_IRONSTONE",
                name: "Smelt Refined Iron Ingot",
                description: "Smelt raw ironstone into refined iron bars over high heat.",
                reagents: [{ itemId: 3, name: "Raw Ironstone", count: 2 }],
                product: { itemId: 4, name: "Star-Iron Ingot", count: 1 }
            }
        ],
        forge: [
            {
                id: "FORGE_STAR_IRON_CLEAVER",
                name: "Forge Star-Iron Battleaxe",
                description: "Fold Star-Iron sixteen times to craft a masterwork battleaxe.",
                reagents: [{ itemId: 4, name: "Star-Iron Ingot", count: 2 }],
                product: { weaponId: 1, name: "Karadrim Battleaxe", count: 1 }
            }
        ],
        fabricator: [
            {
                id: "FABRICATE_BIONIC_LIMB",
                name: "Fabricate Bionic Pneumatic Limb",
                description: "Assemble a functional bionic prosthetic arm using star-iron and power cells.",
                reagents: [
                    { itemId: 4, name: "Star-Iron Ingot", count: 2 },
                    { itemId: 5, name: "Aetheric Power Cell", count: 1 },
                    { itemId: 6, name: "Runed Void-Silver Wire", count: 1 }
                ],
                product: { itemId: 7, name: "Bionic Pneumatic Arm", count: 1 }
            },
            {
                id: "ASSEMBLE_ARC_BLADE",
                name: "Assemble Galvanic Arc-Blade",
                description: "Channel aetheric power into a high-frequency arc blade.",
                reagents: [
                    { itemId: 4, name: "Star-Iron Ingot", count: 1 },
                    { itemId: 5, name: "Aetheric Power Cell", count: 1 }
                ],
                product: { weaponId: 2, name: "Steel Broadsword", count: 1 }
            }
        ]
    };

    //-----------------------------------------------------------------------------
    // Window_UFCrafting
    //-----------------------------------------------------------------------------
    class Window_UFCrafting extends Window_Base {
        constructor(workshopType) {
            const width = 640;
            const height = 420;
            const x = Math.floor((Graphics.width - width) / 2);
            const y = Math.floor((Graphics.height - height) / 2);
            super(new Rectangle(x, y, width, height));

            this.opacity = 250;
            this.workshopType = (workshopType || "forge").toLowerCase();
            this.recipes = BUILTIN_RECIPES[this.workshopType] || BUILTIN_RECIPES.forge;
            this.selectedIndex = 0;
            this.statusMessage = "";
            this.refresh();
        }

        refresh() {
            this.contents.clear();

            // Header
            this.contents.fontSize = 18;
            this.changeTextColor(ColorManager.textColor(14)); // Gold
            const titleMap = {
                brewery: "HEARTH FERMENTATION BREWERY",
                smelter: "GEOTHERMAL SMELTING FURNACE",
                forge: "VOLCANIC METALSMCRAFT FORGE",
                fabricator: "PRECURSOR TECH-FABRICATOR CONSOLE"
            };
            this.drawText(titleMap[this.workshopType] || "WORKSHOP CRAFTING", 0, 8, this.innerWidth, "center");

            // Divider
            this.contents.fillRect(16, 38, this.innerWidth - 32, 2, "rgba(200, 157, 92, 0.6)");

            // Recipe List (Left Column)
            let listY = 50;
            this.contents.fontSize = 14;
            for (let i = 0; i < this.recipes.length; i++) {
                const rec = this.recipes[i];
                const isSel = (i === this.selectedIndex);

                if (isSel) {
                    this.contents.fillRect(20, listY - 2, 260, 28, "rgba(200, 157, 92, 0.25)");
                    this.changeTextColor(ColorManager.textColor(14));
                    this.drawText(`>[ ${rec.name} ]`, 24, listY, 250, "left");
                } else {
                    this.changeTextColor(ColorManager.normalColor());
                    this.drawText(`  ${rec.name}`, 24, listY, 250, "left");
                }
                listY += 32;
            }

            // Vertical Column Divider
            this.contents.fillRect(290, 48, 2, this.innerHeight - 110, "rgba(200, 157, 92, 0.4)");

            // Recipe Details (Right Column)
            const curRec = this.recipes[this.selectedIndex];
            if (curRec) {
                let detailY = 50;
                this.changeTextColor(ColorManager.textColor(6)); // Cyan
                this.contents.fontSize = 15;
                this.drawText(curRec.name, 305, detailY, 300, "left");

                detailY += 24;
                this.changeTextColor(ColorManager.textColor(7));
                this.contents.fontSize = 12;
                this.drawText(curRec.description, 305, detailY, 300, "left");

                detailY += 32;
                this.changeTextColor(ColorManager.textColor(14));
                this.contents.fontSize = 13;
                this.drawText("REQUIRED REAGENTS:", 305, detailY, 300, "left");

                detailY += 22;
                let canCraft = true;
                for (const req of curRec.reagents) {
                    const itemObj = $dataItems[req.itemId];
                    const countInBag = itemObj ? $gameParty.numItems(itemObj) : 0;
                    const hasEnough = countInBag >= req.count;
                    if (!hasEnough) canCraft = false;

                    this.changeTextColor(hasEnough ? ColorManager.textColor(3) : ColorManager.textColor(2));
                    this.contents.fontSize = 12;
                    this.drawText(`* ${req.name}: ${countInBag} / ${req.count}`, 315, detailY, 290, "left");
                    detailY += 20;
                }

                detailY += 10;
                this.changeTextColor(ColorManager.textColor(14));
                this.contents.fontSize = 13;
                this.drawText("PRODUCT YIELD:", 305, detailY, 300, "left");

                detailY += 22;
                this.changeTextColor(ColorManager.textColor(14));
                this.contents.fontSize = 13;
                this.drawText(`* ${curRec.product.count}x ${curRec.product.name}`, 315, detailY, 290, "left");

                // Craft Button Prompt
                detailY += 36;
                if (canCraft) {
                    this.contents.fillRect(305, detailY - 4, 180, 28, "rgba(80, 180, 80, 0.4)");
                    this.changeTextColor(ColorManager.textColor(3)); // Green
                    this.contents.fontSize = 14;
                    this.drawText("[ Enter: Execute Reaction ]", 310, detailY, 170, "center");
                } else {
                    this.contents.fillRect(305, detailY - 4, 180, 28, "rgba(180, 80, 80, 0.3)");
                    this.changeTextColor(ColorManager.textColor(7)); // Grey
                    this.contents.fontSize = 13;
                    this.drawText("[ Missing Reagents ]", 310, detailY, 170, "center");
                }
            }

            // Bottom Status Message & Instructions
            this.contents.fillRect(16, this.innerHeight - 56, this.innerWidth - 32, 2, "rgba(200, 157, 92, 0.6)");
            if (this.statusMessage) {
                this.changeTextColor(ColorManager.textColor(14));
                this.contents.fontSize = 13;
                this.drawText(this.statusMessage, 20, this.innerHeight - 44, this.innerWidth - 40, "center");
            } else {
                this.changeTextColor(ColorManager.textColor(7));
                this.contents.fontSize = 12;
                this.drawText("Up/Down: Select Reaction  |  [OK]: Craft  |  [ESC]: Close Station", 0, this.innerHeight - 44, this.innerWidth, "center");
            }
        }

        update() {
            super.update();
            if (Input.isTriggered("down")) {
                SoundManager.playCursor();
                this.selectedIndex = (this.selectedIndex + 1) % this.recipes.length;
                this.statusMessage = "";
                this.refresh();
            } else if (Input.isTriggered("up")) {
                SoundManager.playCursor();
                this.selectedIndex = (this.selectedIndex - 1 + this.recipes.length) % this.recipes.length;
                this.statusMessage = "";
                this.refresh();
            } else if (Input.isTriggered("ok")) {
                this.executeCrafting();
            } else if (Input.isTriggered("cancel")) {
                this.close();
            }
        }

        executeCrafting() {
            const rec = this.recipes[this.selectedIndex];
            if (!rec) return;

            // Check reagents
            for (const req of rec.reagents) {
                const itemObj = $dataItems[req.itemId];
                if (!itemObj || $gameParty.numItems(itemObj) < req.count) {
                    SoundManager.playBuzzer();
                    this.statusMessage = `Insufficient ${req.name}!`;
                    this.refresh();
                    return;
                }
            }

            // Deduct reagents
            for (const req of rec.reagents) {
                const itemObj = $dataItems[req.itemId];
                $gameParty.loseItem(itemObj, req.count);
            }

            // Award product
            if (rec.product.itemId) {
                const prodItem = $dataItems[rec.product.itemId];
                if (prodItem) $gameParty.gainItem(prodItem, rec.product.count);
            } else if (rec.product.weaponId) {
                const prodWep = $dataWeapons[rec.product.weaponId];
                if (prodWep) $gameParty.gainItem(prodWep, rec.product.count);
            }

            SoundManager.playShop();
            this.statusMessage = `Successfully crafted ${rec.product.count}x ${rec.product.name}!`;
            this.refresh();

            if (window.UF && window.UF.Events) {
                window.UF.Events.emit("craftItem", rec);
            }
        }

        close() {
            super.close();
            if (this.parent) this.parent.removeChild(this);
            if (SceneManager._scene) SceneManager._scene._activeCraftingWindow = null;
        }
    }

    UF_Crafting.open = function(workshopType) {
        if (!SceneManager._scene) return;
        if (SceneManager._scene._activeCraftingWindow) {
            SceneManager._scene._activeCraftingWindow.close();
        }
        const win = new Window_UFCrafting(workshopType);
        SceneManager._scene._activeCraftingWindow = win;
        SceneManager._scene.addChild(win);
        SoundManager.playOk();
    };

    // Precursor Strange Mood Generator
    UF_Crafting.triggerStrangeMood = function(artisanName = "Kragan", profession = "Smith") {
        const artifacts = [
            "Krag-Grond ('The Obsidian Cleaver'), a Star-Iron broadaxe etched with glowing azure runes.",
            "Vorg-Tek-Zul ('The Flame-Form Pylon'), an aetheric capacitor encased in folded volcanic basalt.",
            "Tik-Spark ('The Slinker's Key'), a pre-collapse galvanic multi-tool bound with braided void-silver wire."
        ];
        const chosen = artifacts[Math.floor(Math.random() * artifacts.length)];
        const bark = `${artisanName} has been seized by a Strange Mood! Working feverishly at the station!`;
        if (window.UF_Visuals && typeof UF_Visuals.spawnBarkAtPlayer === "function") {
            UF_Visuals.spawnBarkAtPlayer(bark);
        }
        return chosen;
    };

    // Event Trigger Hook
    const _Game_Event_start = Game_Event.prototype.start;
    Game_Event.prototype.start = function() {
        if (this.event() && this.event().note) {
            const match = this.event().note.match(/<workshop:\s*(\w+)>/i);
            if (match) {
                UF_Crafting.open(match[1]);
                return;
            }
        }
        _Game_Event_start.call(this);
    };

})();

