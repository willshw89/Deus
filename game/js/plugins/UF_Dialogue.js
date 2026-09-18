//=============================================================================
// RPG Maker MZ - Ultima Fortress: Ultima VII Keyword Dialogue System
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Dialogue] Classic Ultima VII keyword conversation trees with character portraits, tactile mouse selection, and dynamic party recruitment.
 * @author Deepdelve Architect
 *
 * @help
 * ============================================================================
 * Ultima Fortress Dialogue Plugin
 * ============================================================================
 * Implements the legendary keyword-driven conversation style of Ultima VII:
 * - Portrait display in stone arch frame
 * - Dynamic topic keywords: [Name], [Calling], [Bastion], [Bye], plus story topics
 * - Tactile mouse click selection and arrow key navigation
 * - Dynamic Companion Recruitment ([Join] and [Part] keywords based on party state)
 *
 * Event Note Tags:
 * <dialogue: Kragan_Smith>
 * <dialogue: Thorgar_Brewer>
 * <dialogue: Kogan_Guard>
 * <dialogue: Cedric_Merchant>
 * <dialogue: Caerith_Elf>
 * <dialogue: VorTek_Vorgari>
 * <dialogue: TikChit_Kitter>
 * <dialogue: Borin_Artisan>
 * <dialogue: Meng_Miner>
 */

(() => {
    "use strict";

    const pluginName = "UF_Dialogue";
    window.UF_Dialogue = {};

    // 100% Unique Kaldurath Citizen Dialogue Database
    const DIALOGUE_DATABASE = {
        "Thorgar_Brewer": {
            name: "Thorgar Aleheart",
            title: "Tavern Master & Brewer (Karadrim)",
            faceIndex: 0,
            recruitActorId: 2,
            greeting: "Welcome to the Hearth Hall, traveler! Wash the mountain dust from your throat with a cold pint of Black Iron-Stout.",
            recruitQuote: "Aye! I will join your company. I'll haul a keg of Black Iron-Stout on my back—keeps the blood flowing hot!",
            partQuote: "Back to the fermentation vats I go. Stop by the Hearth Hall whenever you need a stiff drink, friend!",
            topics: {
                "Name": "I am Thorgar, of the Deep-Brew clan. Master of the great fermentation vats beneath Mount Ironspire.",
                "Calling": "I brew the finest stout and mushroom wines in Kaldurath. A miner without stout is like a forge without coal!",
                "Job": "I brew the finest stout and mushroom wines in Kaldurath. A miner without stout is like a forge without coal!",
                "Bastion": "Kraghold has stood for three centuries, guarding the Great Rift and defying the beasts of the lightless trenches.",
                "Fortress": "Kraghold has stood for three centuries, guarding the Great Rift and defying the beasts of the lightless trenches.",
                "Stout": "Black Iron-Stout is fermented from roasted glow-spores and highland barley. Thick enough to float a dagger!",
                "Rumors": "Travelers from Valenford speak of strange tremors along the Rift. The canopy elves say the subterranean roots are weeping."
            }
        },
        "Cedric_Merchant": {
            name: "Cedric Brightward",
            title: "Merchant-Diplomat of Valenford (Valen)",
            faceIndex: 1,
            recruitActorId: 3,
            greeting: "Well met, traveler! Cedric Brightward at your service. I've led my trade caravan down from the sovereign realm of Valenford.",
            recruitQuote: "An escort through the deep roads? Splendid. My coin purse, rapier, and guild connections are at your service.",
            partQuote: "Profitable traveling with you! I shall return to my wares and balance sheets at the depot. Safe journeys!",
            topics: {
                "Name": "Cedric Brightward, licensed merchant of the Valen Guild of Commerce.",
                "Calling": "I coordinate commerce between the surface cities of Valenford and the subterranean halls of Kraghold. Grain, textiles, and parchment for refined steel.",
                "Job": "I coordinate commerce between the surface cities of Valenford and the subterranean halls of Kraghold. Grain, textiles, and parchment for refined steel.",
                "Bastion": "Kraghold is a marvelous trading nexus! The Karadrim drive a hard bargain, but their forged blades fetch a fortune on the surface.",
                "Fortress": "Kraghold is a marvelous trading nexus! The Karadrim drive a hard bargain, but their forged blades fetch a fortune on the surface.",
                "Valenford": "The Sovereign Plains are verdant and peaceful, though the rift tremors have stirred up rogue bandits along the trade routes.",
                "Trade": "I barter fine silk, surface spices, and ink for Star-Iron ingots, native aurum, and cut gems."
            }
        },
        "Caerith_Elf": {
            name: "Caerith Sylvanna",
            title: "Warden-Emissary of the Verdant Deep (Sylvathi)",
            faceIndex: 2,
            recruitActorId: 4,
            greeting: "Peace walk with you, solitary one. The stone of this hall is silent, unlike the whispering canopies of the Verdant Deep.",
            recruitQuote: "The living canopy shall watch over our trail. My bow and senses are yours. Let us walk together.",
            partQuote: "May the ancient roots guard your footsteps. I return to my vigil over the deep fissures.",
            topics: {
                "Name": "I am Caerith Sylvanna, warden-emissary of the Sylvathi elders.",
                "Calling": "I ensure that deep delve excavations do not sever the primordial living roots that bind the upper world together.",
                "Job": "I ensure that deep delve excavations do not sever the primordial living roots that bind the upper world together.",
                "Bastion": "An imposing mountain fastness, yet the smoke of the smelters chokes the air. Still, the Karadrim are honorable allies.",
                "Fortress": "An imposing mountain fastness, yet the smoke of the smelters chokes the air. Still, the Karadrim are honorable allies.",
                "Living Wood": "The Sylvathi never fell a living tree. We coax living timber into bowstaves and armor using ancient song-rites.",
                "Trench-Kin": "The Morvath awaken in the lightless chasms below. Their hatred seeks to poison both living roots and carved stone."
            }
        },
        "Kogan_Guard": {
            name: "Captain Kogan Ironshield",
            title: "Vanguard Captain (Karadrim)",
            faceIndex: 3,
            recruitActorId: 5,
            greeting: "Halt! Keep your weapons sheathed within the Hearth Hall. The garrison is on high alert after recent tremors in the deep delve.",
            recruitQuote: "By my shield and beard! If you are marching down to the precursor breach, you'll need an Ironshield by your side. Forward!",
            partQuote: "Stand firm! I return to the ramparts. Give any Trench-Kin or rogue machine an axe-blade to the jaw for me.",
            topics: {
                "Name": "Captain Kogan Ironshield, commander of the Kraghold Vanguard.",
                "Calling": "Keeping watch from the gatehouse battlements and securing the deep tunnel gates against trench raiders and rogue machines.",
                "Job": "Keeping watch from the gatehouse battlements and securing the deep tunnel gates against trench raiders and rogue machines.",
                "Bastion": "Black granite walls, three paces thick, bound with runic mortar. But eternal vigilance is the true price of survival.",
                "Fortress": "Black granite walls, three paces thick, bound with runic mortar. But eternal vigilance is the true price of survival.",
                "Tremors": "Violent tremors rocked the deep delve drift this morning. Energy spikes suggest an ancient precursor bulkhead ruptured!",
                "Unit-77": "An ancient precursor sentinel—Unit-77—was awakened by the breach. It blocked the deep drift! If you are delving down there, I'll join your line.",
                "Trench-Kin": "Morvath raiders from the chasms. They favor ambushes under cover of sulfur mists. Always keep a sturdy shield raised!",
                "Orders": "The Castellan oversees fortress administration from the west wing. Report any subterranean incursions directly to him."
            }
        },
        "VorTek_Vorgari": {
            name: "Vor-Tek Zenith",
            title: "Philosopher of the Dual Axioms (Vorgari)",
            faceIndex: 4,
            recruitActorId: 6,
            greeting: "Greetings, solitary traveler. May Will and Form guide your steps under the harsh lights of Kaldurath.",
            recruitQuote: "Contemplation without action is lifeless Form. I shall lend my wings and sorcerous glyphs to your expedition.",
            partQuote: "May your Will remain tempered by Form. I return to my scrolls and basalt tablets.",
            topics: {
                "Name": "I am Vor-Tek, of the Winged Zenith caste. Scholar of the basalt codex.",
                "Calling": "I serve as envoy from the Basalt Citadels. I observe the mineral arts of the Karadrim and record their runic mastery.",
                "Job": "I serve as envoy from the Basalt Citadels. I observe the mineral arts of the Karadrim and record their runic mastery.",
                "Bastion": "Kraghold possesses disciplined Form in its architecture, and fierce Will in its forges. Endurance binds them together.",
                "Fortress": "Kraghold possesses disciplined Form in its architecture, and fierce Will in its forges. Endurance binds them together.",
                "Precursor Tech": "The ancient ones traversed the void between stars. Their fallen vessels now form the deep bedrock beneath this fastness.",
                "Dual Axioms": "The Dual Axioms are Will (Passion and Intent) and Form (Structure and Control). Endurance bridges both to achieve mastery.",
                "Runes": "The Karadrim runes share ancient roots with our volcanic glyphs. Both speak the deep language of the molten core."
            }
        },
        "TikChit_Kitter": {
            name: "Tik-Chit Quickfinger",
            title: "Warren Slinker (Kitterkin)",
            faceIndex: 5,
            recruitActorId: 7,
            greeting: "*sniffs rapidly, tail twitching* Who there? You not swing heavy hammer at Tik-Chit? Tik-Chit just looking! Just looking for shiny!",
            recruitQuote: "*chitters excitedly, tail wagging* Shiny adventure! Tik-Chit check every lock, find every secret latch, sniff out every trap! Let's go!",
            partQuote: "*slips into the shadows* Tik-Chit go find more pretty brass cogs and shiny rocks! See you around, long-legs!",
            topics: {
                "Name": "Tik-Chit! Fastest slinker in the Warrens of Kaldurath!",
                "Calling": "Scrap-finder! Lock-turner! Finding shiny brass, wire, pretty rocks dropped by clumsy big-folk.",
                "Job": "Scrap-finder! Lock-turner! Finding shiny brass, wire, pretty rocks dropped by clumsy big-folk.",
                "Bastion": "Too many big stompy boots! Ground shakes! But lots of rich scrap bins in the smithy...",
                "Fortress": "Too many big stompy boots! Ground shakes! But lots of rich scrap bins in the smithy...",
                "Power Cell": "Tik-Chit saw it! Big shiny blue Aetheric Power Cell locked in the Castellan's strongbox in the west wing! Feed that to the big metal machine and it won't crush you!",
                "Shiny": "Found a star-iron cog and glowing azure crystal! Tik-Chit trade for roasted fungus or smoked bacon!",
                "Trench-Kin": "Nasty, mean Morvath! They catch little slinker, make work in sulfur pits! Tik-Chit hate them! Tik-Chit slip through tiny cracks!"
            }
        },
        "Kragan_Smith": {
            name: "Master Kragan Anvilhammer",
            title: "Master Metalsmith (Karadrim)",
            faceIndex: 6,
            recruitActorId: 8,
            greeting: "Mind the flying sparks! The volcanic crucible is white-hot today. What brings you to my anvil?",
            recruitQuote: "Aye! My hammer is yours. When plate mail fractures or blades dull on the road, I'll mend them over the camp coals.",
            partQuote: "The anvil calls me back! When you need honest Star-Iron gear forged, you know where to find me.",
            topics: {
                "Name": "Kragan Anvilhammer is my name. Cold steel, molten brass, and glowing coals are my calling.",
                "Calling": "I forge broadswords, runic plate mail, and mining picks for Kraghold. Without true steel, the trench-kin would overrun the gates.",
                "Job": "I forge broadswords, runic plate mail, and mining picks for Kraghold. Without true steel, the trench-kin would overrun the gates.",
                "Bastion": "A bastion carved of black granite and meteoric steel! As long as our smelters roar, Kraghold will never fall.",
                "Fortress": "A bastion carved of black granite and meteoric steel! As long as our smelters roar, Kraghold will never fall.",
                "Precursor Tech": "Meteoric Star-Iron from ancient starship bulkheads. If you bring me raw ironstone or power cells, my volcanic forge will craft armor that shrugs off plasma!",
                "Steel": "Star-Iron folded sixteen times in volcanic rock-oil. A single blow will cleave iron armor in twain!",
                "Strange Mood": "Last winter, young Kogan locked himself in the workshop for three days without food. Emerged with a legendary gold chalice!",
                "Trench-Kin": "Morvath scavengers from the lower rifts. Their barbed chains tear flesh, but their brittle copper shatters against our armor."
            }
        },
        "Borin_Artisan": {
            name: "Borin Forgehand",
            title: "Volcanic Forgehand (Wingless Vorgari)",
            faceIndex: 7,
            recruitActorId: 9,
            greeting: "Hail, wanderer! The fire is hungry, and the iron yields to steady blows. What brings you to the forge?",
            recruitQuote: "Form and Will call for direct action! I shall lend my basalt strength to your company. Point to the foe!",
            partQuote: "The crucibles require constant tending. I return to the bellows. Walk with Endurance, traveler.",
            topics: {
                "Name": "I am Borin Forgehand, of the Wingless Vorgari caste. Artisan of fire, stone, and basalt.",
                "Calling": "I pump the great volcanic bellows and temper the high-heat crucibles alongside Master Kragan. Karadrim steel and Vorgari basalt produce unbreakable weapons.",
                "Job": "I pump the great volcanic bellows and temper the high-heat crucibles alongside Master Kragan. Karadrim steel and Vorgari basalt produce unbreakable weapons.",
                "Bastion": "Kraghold has true coal and enduring stone. Here, honest work with the hands is honored above empty courtly talk.",
                "Fortress": "Kraghold has true coal and enduring stone. Here, honest work with the hands is honored above empty courtly talk.",
                "Bellows": "Pumping the subterranean bellows with rhythm requires Endurance. Let the air flow like steady breath."
            }
        },
        "Meng_Miner": {
            name: "Meng Oreseeker",
            title: "Deep Delver (Karadrim)",
            faceIndex: 0,
            recruitActorId: null,
            greeting: "Mind your footing, friend! We've struck a rich vein of ironstone down on the lower drift.",
            topics: {
                "Name": "Meng Oreseeker, at your service. My pick has sounded the deep rock for forty years.",
                "Calling": "Delving the living stone! Striking the rock with pick and chisel, hauling raw ironstone to the great furnaces.",
                "Job": "Delving the living stone! Striking the rock with pick and chisel, hauling raw ironstone to the great furnaces.",
                "Bastion": "Kraghold is carved into the spine of the world. As long as the stone holds, we shall never fall.",
                "Fortress": "Kraghold is carved into the spine of the world. As long as the stone holds, we shall never fall.",
                "Ironstone": "Rich rust-red ore! But beware the deep fissures—the Morvath sneak through when the lanterns flicker."
            }
        }
    };

    // Alias mapping for backward compatibility and test scripts
    DIALOGUE_DATABASE["Urist_Miner"] = DIALOGUE_DATABASE["Meng_Miner"];
    DIALOGUE_DATABASE["Bomrek_Smith"] = DIALOGUE_DATABASE["Kragan_Smith"];
    DIALOGUE_DATABASE["VasLor_Gargoyle"] = DIALOGUE_DATABASE["VorTek_Vorgari"];
    DIALOGUE_DATABASE["SkitKik_Kobold"] = DIALOGUE_DATABASE["TikChit_Kitter"];
    DIALOGUE_DATABASE["Caerith_Ranger"] = DIALOGUE_DATABASE["Caerith_Elf"];

    //-----------------------------------------------------------------------------
    // Window_UFDialogue
    //-----------------------------------------------------------------------------
    class Window_UFDialogue extends Window_Base {
        constructor(dialogueKey) {
            const width = 680;
            const height = 430;
            const x = Math.floor((Graphics.width - width) / 2);
            const y = Math.floor((Graphics.height - height) / 2);
            super(new Rectangle(x, y, width, height));

            this.opacity = 250;
            this.dialogueKey = dialogueKey;
            this.data = DIALOGUE_DATABASE[dialogueKey] || DIALOGUE_DATABASE["Thorgar_Brewer"];

            this.selectedKeywordIndex = 0;
            this.keywordRects = [];
            this.conversationLog = [
                { speaker: this.data.name, text: this.data.greeting }
            ];

            this.rebuildKeywords();
            this.refresh();
        }

        rebuildKeywords() {
            this.unlockedKeywords = ["Name", "Calling", "Bastion"];

            // Add topic keywords from data
            for (const k of Object.keys(this.data.topics)) {
                if (!this.unlockedKeywords.includes(k) && k !== "Job" && k !== "Fortress" && k !== "Bye" && k !== "Join" && k !== "Part") {
                    this.unlockedKeywords.push(k);
                }
            }

            // Recruitment Keyword
            if (this.data.recruitActorId) {
                const isRecruited = $gameParty.allMembers().some(m => m.actorId() === this.data.recruitActorId);
                if (isRecruited) {
                    this.unlockedKeywords.push("Part");
                } else {
                    this.unlockedKeywords.push("Join");
                }
            }

            // Always end with Bye
            this.unlockedKeywords.push("Bye");

            if (this.selectedKeywordIndex >= this.unlockedKeywords.length) {
                this.selectedKeywordIndex = this.unlockedKeywords.length - 1;
            }
        }

        refresh() {
            this.contents.clear();
            this.keywordRects = [];

            // Draw Portrait with stone frame
            this.drawFace("U7_Faces", this.data.faceIndex, 16, 16, 120, 120);

            // Framed border for portrait
            this.contents.strokeRect(14, 14, 124, 124, "rgba(200, 157, 92, 0.8)");

            // Name & Title
            this.contents.fontSize = 18;
            this.changeTextColor(ColorManager.textColor(14)); // Gold
            this.drawText(this.data.name, 154, 16, 480, "left");

            this.contents.fontSize = 13;
            this.changeTextColor(ColorManager.textColor(6)); // Cyan
            this.drawText(this.data.title, 154, 40, 480, "left");

            // Recruited Companion Badge
            if (this.data.recruitActorId && $gameParty.allMembers().some(m => m.actorId() === this.data.recruitActorId)) {
                this.changeTextColor(ColorManager.textColor(3)); // Green
                this.drawText("[Active Companion in Party]", 154, 62, 480, "left");
            }

            // Decorative Divider
            this.contents.fillRect(16, 144, this.innerWidth - 32, 2, "rgba(200, 157, 92, 0.6)");

            // Conversation History
            function wrapText(txt, maxLen = 72) {
                const words = txt.split(" ");
                const lines = [];
                let cur = "";
                for (const w of words) {
                    if ((cur + " " + w).trim().length > maxLen) {
                        lines.push(cur);
                        cur = w;
                    } else {
                        cur = (cur + " " + w).trim();
                    }
                }
                if (cur) lines.push(cur);
                return lines;
            }

            let textY = 154;
            this.contents.fontSize = 13;
            for (const entry of this.conversationLog.slice(-3)) {
                this.changeTextColor(ColorManager.textColor(14));
                this.drawText(`${entry.speaker}:`, 20, textY, 220, "left");
                this.changeTextColor(ColorManager.normalColor());
                const lines = wrapText(entry.text, 72);
                textY += 18;
                for (const l of lines) {
                    this.drawText(l, 32, textY, this.innerWidth - 54, "left");
                    textY += 18;
                }
                textY += 4;
            }

            // Keyword Bar Divider
            this.contents.fillRect(16, this.innerHeight - 56, this.innerWidth - 32, 2, "rgba(200, 157, 92, 0.6)");

            // Clickable Keyword Bar
            let kwX = 20;
            const kwY = this.innerHeight - 44;
            this.contents.fontSize = 14;

            for (let i = 0; i < this.unlockedKeywords.length; i++) {
                const kw = this.unlockedKeywords[i];
                const isSelected = (i === this.selectedKeywordIndex);
                const label = isSelected ? `>[${kw}]<` : `[${kw}]`;
                const labelWidth = this.textWidth(label) + 12;

                // Record rectangle for mouse click hit-testing
                this.keywordRects.push({
                    index: i,
                    keyword: kw,
                    x: kwX,
                    y: kwY,
                    width: labelWidth,
                    height: 28
                });

                if (isSelected) {
                    this.changeTextColor(ColorManager.textColor(14)); // Gold highlight
                    this.drawText(label, kwX, kwY, labelWidth, "left");
                } else if (kw === "Join") {
                    this.changeTextColor(ColorManager.textColor(3)); // Green for Join
                    this.drawText(label, kwX, kwY, labelWidth, "left");
                } else if (kw === "Part") {
                    this.changeTextColor(ColorManager.textColor(2)); // Orange/Red for Part
                    this.drawText(label, kwX, kwY, labelWidth, "left");
                } else {
                    this.changeTextColor(ColorManager.textColor(7));
                    this.drawText(label, kwX, kwY, labelWidth, "left");
                }

                kwX += labelWidth + 8;
                if (kwX > this.innerWidth - 60) break;
            }
        }

        update() {
            super.update();

            // Keyboard navigation
            if (Input.isTriggered("right")) {
                SoundManager.playCursor();
                this.selectedKeywordIndex = (this.selectedKeywordIndex + 1) % this.unlockedKeywords.length;
                this.refresh();
            } else if (Input.isTriggered("left")) {
                SoundManager.playCursor();
                this.selectedKeywordIndex = (this.selectedKeywordIndex - 1 + this.unlockedKeywords.length) % this.unlockedKeywords.length;
                this.refresh();
            } else if (Input.isTriggered("ok")) {
                this.chooseKeyword(this.unlockedKeywords[this.selectedKeywordIndex]);
            } else if (Input.isTriggered("cancel")) {
                this.close();
            }

            // Mouse / Touch click hit-testing
            if (TouchInput.isTriggered()) {
                const tx = TouchInput.x - this.x - this.padding;
                const ty = TouchInput.y - this.y - this.padding;
                for (const rect of this.keywordRects) {
                    if (tx >= rect.x && tx <= rect.x + rect.width &&
                        ty >= rect.y && ty <= rect.y + rect.height) {
                        this.selectedKeywordIndex = rect.index;
                        this.chooseKeyword(rect.keyword);
                        break;
                    }
                }
            }
        }

        chooseKeyword(keyword) {
            if (keyword === "Bye") {
                SoundManager.playCancel();
                this.close();
                return;
            }

            if (keyword === "Join") {
                this.handleRecruitment();
                return;
            }

            if (keyword === "Part") {
                this.handleDismissal();
                return;
            }

            const response = this.data.topics[keyword] || "I know little of that matter, friend.";
            SoundManager.playOk();
            this.conversationLog.push({ speaker: "You", text: `"${keyword}"` });
            this.conversationLog.push({ speaker: this.data.name, text: response });
            this.refresh();
        }

        handleRecruitment() {
            if (!this.data.recruitActorId) return;

            // Maximum party size check (6 members)
            if ($gameParty.size() >= 6) {
                SoundManager.playBuzzer();
                this.conversationLog.push({ speaker: "You", text: `"Would you travel with me?"` });
                this.conversationLog.push({ speaker: this.data.name, text: "Your company is already large enough, friend. Travel safe!" });
                this.refresh();
                return;
            }

            SoundManager.playRecovery();
            $gameParty.addActor(this.data.recruitActorId);
            $gamePlayer.followers().refresh();

            this.conversationLog.push({ speaker: "You", text: `"Would you join my company?"` });
            this.conversationLog.push({ speaker: this.data.name, text: this.data.recruitQuote || "I shall stand with you on the road!" });
            this.conversationLog.push({ speaker: "[System]", text: `${this.data.name} has joined your company!` });

            this.rebuildKeywords();
            this.refresh();
        }

        handleDismissal() {
            if (!this.data.recruitActorId) return;

            SoundManager.playCancel();
            $gameParty.removeActor(this.data.recruitActorId);
            $gamePlayer.followers().refresh();

            this.conversationLog.push({ speaker: "You", text: `"We must part ways for now."` });
            this.conversationLog.push({ speaker: this.data.name, text: this.data.partQuote || "Farewell, traveler." });
            this.conversationLog.push({ speaker: "[System]", text: `${this.data.name} has departed from your company.` });

            this.rebuildKeywords();
            this.refresh();
        }

        close() {
            super.close();
            if (this.parent) {
                this.parent.removeChild(this);
            }
            if (SceneManager._scene) {
                SceneManager._scene._activeDialogueWindow = null;
            }
        }
    }

    UF_Dialogue.start = function(key) {
        if (!SceneManager._scene) return;
        if (SceneManager._scene._activeDialogueWindow) {
            SceneManager._scene._activeDialogueWindow.close();
        }
        const win = new Window_UFDialogue(key);
        SceneManager._scene._activeDialogueWindow = win;
        SceneManager._scene.addChild(win);
        SoundManager.playOk();
    };

    // Event Trigger Check
    const _Game_Event_start = Game_Event.prototype.start;
    Game_Event.prototype.start = function() {
        if (this.event() && this.event().note) {
            const match = this.event().note.match(/<dialogue:\s*(\w+)>/i);
            if (match) {
                UF_Dialogue.start(match[1]);
                return;
            }
        }
        _Game_Event_start.call(this);
    };

})();
