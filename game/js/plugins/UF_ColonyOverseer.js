//=============================================================================
// RPG Maker MZ - Ultima Fortress: Dwarf Fortress Colony Overseer & Need AI
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF ColonyOverseer] DF-style free overseer camera, tactile unit selection, colonist status card, and autonomous biological needs.
 * @author Deepdelve Architect
 *
 * @param EdgePanSpeed
 * @text Edge Pan Camera Speed
 * @type number
 * @default 6
 * @desc Camera pan speed in pixels per frame when mouse is near screen edge.
 *
 * @help
 * ============================================================================
 * Ultima Fortress Colony Overseer (UF_ColonyOverseer)
 * ============================================================================
 * Implements:
 * - Free Overseer camera panning (WASD, edge-pan, middle-mouse drag)
 * - Click-to-select colonist with 2.5D selection ring
 * - Tactile Colonist Card (Health, Hunger, Thirst, Fatigue, Current Activity)
 * - Autonomous biological needs (Hunger, Thirst, Fatigue, Social)
 * - Direct tactical Draft mode (Right-click 8-directional movement & targeting)
 */

(() => {
    "use strict";

    const pluginName = "UF_ColonyOverseer";
    const params = PluginManager.parameters(pluginName);
    const edgePanSpeed = parseInt(params["EdgePanSpeed"] || 6, 10);
    let activeColonyWindow = null;

    //-----------------------------------------------------------------------------
    // Colonist Data Model & Verbatim Dwarf Fortress Agent AI
    //-----------------------------------------------------------------------------
    class Colonist {
        constructor(id, name, gender, eventId) {
            this.id = id;
            this.name = name;
            this.gender = gender;
            this.eventId = eventId;
            this.hp = 100;
            this.maxHp = 100;
            this.visionRadius = 8; // Faction Fog of War sight radius

            // DF Biological & Psychological Needs (0-100, 100 = critical)
            this.hunger = 12;
            this.thirst = 18;
            this.fatigue = 8;
            this.social = 20;
            this.communeNature = 15;

            // DF Personality Facets (The Soul)
            if (gender === "Male") {
                this.facets = {
                    curiosity: 85,
                    industriousness: 75,
                    patience: 80,
                    bravery: 70,
                    loveAffection: 90,
                    natureAffinity: 85
                };
            } else {
                this.facets = {
                    curiosity: 75,
                    industriousness: 90,
                    patience: 85,
                    bravery: 70,
                    loveAffection: 95,
                    natureAffinity: 80
                };
            }

            // DF Thought Journal & Mood System
            this.thoughts = [
                { text: "Awoke peacefully in the virgin glade.", strength: 12, time: Date.now() }
            ];
            this.moodScore = 30; // Aggregate emotional balance
            this.mood = "Content";

            this.drafted = false;
            this.currentJob = "Idle";
            this.targetX = null;
            this.targetY = null;
            this.inventory = [];
        }

        get event() {
            return $gameMap ? $gameMap.event(this.eventId) : null;
        }

        addThought(text, strength) {
            this.thoughts.unshift({ text, strength, time: Date.now() });
            if (this.thoughts.length > 8) this.thoughts.pop();
            this.moodScore = Math.max(-100, Math.min(100, this.moodScore + strength));
            this.updateMood();
        }

        updateMood() {
            if (this.moodScore >= 50) this.mood = "Ecstatic";
            else if (this.moodScore >= 25) this.mood = "Happy";
            else if (this.moodScore >= 10) this.mood = "Content";
            else if (this.moodScore >= -10) this.mood = "Fine";
            else if (this.moodScore >= -25) this.mood = "Unhappy";
            else if (this.moodScore >= -50) this.mood = "Stressed";
            else this.mood = "Miserable";
        }

        tickNeeds() {
            if (this.drafted) return;

            // Metabolic & Psychological Need accumulation per tick
            this.hunger = Math.min(100, this.hunger + 0.18);
            this.thirst = Math.min(100, this.thirst + 0.24);
            this.fatigue = Math.min(100, this.fatigue + 0.10);
            this.social = Math.min(100, this.social + 0.15);
            this.communeNature = Math.min(100, this.communeNature + 0.12);

            // Negative DF thoughts when needs are neglected
            if (this.hunger > 75 && Math.random() < 0.05) {
                this.addThought("Was annoyed by persistent hunger.", -5);
            }
            if (this.thirst > 75 && Math.random() < 0.05) {
                this.addThought("Felt uncomfortably parched.", -6);
            }
            if (this.fatigue > 85 && Math.random() < 0.05) {
                this.addThought("Felt exhausted from lack of sleep.", -7);
            }
            if (this.social > 80 && Math.random() < 0.04) {
                this.addThought("Felt lonely and desired companionship.", -5);
            }

            const ev = this.event;
            if (!ev || ev.isMoving() || this.currentJob !== "Idle") return;

            // DF Verbatim Priority Utility Decision Tree:
            // 1. Critical Thirst -> Drink at freshwater stream
            if (this.thirst >= 55) {
                const streamTile = this.findNearestWater();
                if (streamTile) {
                    this.currentJob = "Seeking Water";
                    this.assignMoveTo(streamTile.x, streamTile.y, () => {
                        ev.setDirection(6); // Face stream
                        this.thirst = Math.max(0, this.thirst - 65);
                        this.addThought("Felt relieved drinking cool, clear stream water.", 12);
                        this.currentJob = "Idle";
                        if (window.$ufVisuals && window.$ufVisuals.addBark) {
                            window.$ufVisuals.addBark(ev, "Drinks sweet stream water.");
                        }
                    });
                    return;
                }
            }

            // 2. Critical Hunger -> Forage from ancient fruit tree
            if (this.hunger >= 55) {
                const tree = this.findFruitTree();
                if (tree) {
                    this.currentJob = "Foraging Fruit";
                    const targetX = this.id === 1 ? tree.x - 1 : tree.x + 1;
                    this.assignMoveTo(targetX, tree.y + 1, () => {
                        ev.setDirection(8); // Face North toward tree canopy
                        this.hunger = Math.max(0, this.hunger - 70);
                        this.addThought("Felt content after eating sweet, ripe fruit.", 14);
                        this.currentJob = "Idle";
                        if (window.$ufVisuals && window.$ufVisuals.addBark) {
                            window.$ufVisuals.addBark(ev, "Plucks and savors ripe fruit.");
                        }
                    });
                    return;
                }
            }

            // 3. Severe Fatigue -> Rest under tree shade
            if (this.fatigue >= 75) {
                const tree = this.findFruitTree();
                this.currentJob = "Sleeping";
                const targetX = this.id === 1 ? tree.x - 1 : tree.x + 1;
                this.assignMoveTo(targetX, tree.y + 1, () => {
                    this.addThought("Felt peaceful resting under the ancient tree boughs.", 10);
                    if (window.$ufVisuals && window.$ufVisuals.addBark) {
                        window.$ufVisuals.addBark(ev, "Zzz... (Sleeping in shade)");
                    }
                    setTimeout(() => {
                        this.fatigue = 5;
                        this.currentJob = "Idle";
                    }, 4000);
                });
                return;
            }

            // 4. Social Bonding & Conversation with Partner
            if (this.social >= 40 && $colonyManager.colonists.length > 1) {
                const partner = $colonyManager.colonists.find(c => c.id !== this.id);
                if (partner && partner.event && partner.currentJob === "Idle") {
                    this.currentJob = `Talking to ${partner.name}`;
                    partner.currentJob = `Talking to ${this.name}`;

                    const targetX = partner.event.x + (this.id === 1 ? -1 : 1);
                    const targetY = partner.event.y;
                    this.assignMoveTo(targetX, targetY, () => {
                        ev.setDirection(this.id === 1 ? 6 : 4);
                        if (partner.event) partner.event.setDirection(this.id === 1 ? 4 : 6);

                        this.social = Math.max(0, this.social - 55);
                        partner.social = Math.max(0, partner.social - 55);

                        this.addThought(`Felt profound warmth conversing with ${partner.name}.`, 15);
                        partner.addThought(`Felt profound warmth conversing with ${this.name}.`, 15);

                        const dialogues = [
                            [`The morning air is sweet, ${partner.name}.`, `It is good to be here with you, ${this.name}.`],
                            [`Listen to the water, ${partner.name}. The river runs clear.`, `A peaceful place for our people to begin.`],
                            [`Look at the blossoms above us, ${partner.name}.`, `The world is vast and full of wonder.`]
                        ];
                        const pair = dialogues[Math.floor(Math.random() * dialogues.length)];

                        if (window.$ufVisuals && window.$ufVisuals.addBark) {
                            window.$ufVisuals.addBark(ev, pair[0]);
                            setTimeout(() => {
                                if (partner.event && window.$ufVisuals) {
                                    window.$ufVisuals.addBark(partner.event, pair[1]);
                                }
                            }, 1200);
                        }

                        setTimeout(() => {
                            this.currentJob = "Idle";
                            partner.currentJob = "Idle";
                        }, 3000);
                    });
                    return;
                }
            }

            // 5. Nature Contemplation
            if (this.communeNature >= 35 && Math.random() < 0.35) {
                this.currentJob = "Contemplating";
                const spotX = 14 + Math.floor(Math.random() * 5);
                const spotY = 13 + Math.floor(Math.random() * 4);
                this.assignMoveTo(spotX, spotY, () => {
                    this.communeNature = Math.max(0, this.communeNature - 40);
                    this.addThought("Felt tranquil contemplating the pristine wilderness.", 8);
                    this.currentJob = "Idle";
                    if (window.$ufVisuals && window.$ufVisuals.addBark) {
                        window.$ufVisuals.addBark(ev, "Watches the gentle river ripples.");
                    }
                });
                return;
            }

            // 6. Idle Wilderness Stroll (Expands Fog of War!)
            if (Math.random() < 0.25) {
                const wanderX = Math.max(5, Math.min(25, ev.x + Math.floor(Math.random() * 7) - 3));
                const wanderY = Math.max(5, Math.min(25, ev.y + Math.floor(Math.random() * 7) - 3));
                if (!(wanderX === 15 && wanderY === 14) && !(wanderX >= 20 && wanderX <= 22)) {
                    this.currentJob = "Strolling";
                    this.assignMoveTo(wanderX, wanderY, () => {
                        this.currentJob = "Idle";
                    });
                }
            }
        }

        assignMoveTo(gx, gy, onArrival) {
            const ev = this.event;
            if (!ev) return;
            this.targetX = gx;
            this.targetY = gy;

            const checkStep = () => {
                if (!this.event) return;
                if (ev.x === gx && ev.y === gy) {
                    this.targetX = null;
                    this.targetY = null;
                    if (onArrival) onArrival();
                    return;
                }
                const dir = ev.findDirection8DTo ? ev.findDirection8DTo(gx, gy) : ev.findDirectionTo(gx, gy);
                if (dir > 0) {
                    if (ev.moveInDirection8D) ev.moveInDirection8D(dir);
                    else ev.moveStraight(dir);
                    setTimeout(checkStep, 250);
                } else {
                    if (Math.abs(ev.x - gx) <= 1 && Math.abs(ev.y - gy) <= 1) {
                        this.targetX = null;
                        this.targetY = null;
                        if (onArrival) onArrival();
                    } else {
                        this.currentJob = "Idle";
                    }
                }
            };
            checkStep();
        }

        findNearestWater() {
            const ev = this.event;
            const bankY = Math.max(8, Math.min(22, ev ? ev.y : 15));
            return { x: 19, y: bankY };
        }

        findFruitTree() {
            if ($gameMap) {
                for (const ev of $gameMap.events()) {
                    if (ev && ev.event() && ev.event().note.includes("<tree>")) {
                        return { x: ev.x, y: ev.y };
                    }
                }
            }
            return { x: 15, y: 14 };
        }
    }

    //-----------------------------------------------------------------------------
    // Colony Manager Singleton
    //-----------------------------------------------------------------------------
    class ColonyManager {
        constructor() {
            this.colonists = [];
            this.selectedColonist = null;
            this.cameraFollowUnit = null;
            this.isOverseerMode = true;
        }

        initGladeColonists() {
            this.colonists = [
                new Colonist(1, "Adam", "Male", 1),
                new Colonist(2, "Eve", "Female", 2)
            ];
            console.log("[UF Colony] Colonists initialized: Adam & Eve in the Glade.");
        }

        select(colonist) {
            this.selectedColonist = colonist;
            if (activeColonyWindow) {
                activeColonyWindow.refresh();
                activeColonyWindow.show();
            }
        }

        deselect() {
            this.selectedColonist = null;
            if (activeColonyWindow) {
                activeColonyWindow.hide();
            }
        }

        tickAll() {
            for (const c of this.colonists) {
                c.tickNeeds();
            }
        }
    }

    window.$colonyManager = new ColonyManager();

    //-----------------------------------------------------------------------------
    // Keyboard & Mouse Setup for Free Overseer Camera
    //-----------------------------------------------------------------------------
    // Map WASD and Arrow keys to free camera panning
    Input.keyMapper[87] = "cameraUp";    // W
    Input.keyMapper[65] = "cameraLeft";  // A
    Input.keyMapper[83] = "cameraDown";  // S
    Input.keyMapper[68] = "cameraRight"; // D
    Input.keyMapper[37] = "cameraLeft";  // Left Arrow
    Input.keyMapper[38] = "cameraUp";    // Up Arrow
    Input.keyMapper[39] = "cameraRight"; // Right Arrow
    Input.keyMapper[40] = "cameraDown";  // Down Arrow

    // Suppress player character walking on directional input (camera pans freely)
    Game_Player.prototype.moveByInput = function() {};

    // Suppress default RMMZ touch UI menu button
    Scene_Map.prototype.createMenuButton = function() {};
    Scene_Map.prototype.isMenuEnabled = function() { return false; };
    Scene_Map.prototype.callMenu = function() {};

    // Suppress the map name banner. The window must still be created: Scene_Map.stop/start/launchBattle call it.
    Window_MapName.prototype.open = function() {};

    // Suppress click destination pulse animation on the ground
    Sprite_Destination.prototype.update = function() {
        this.visible = false;
    };
    Scene_Map.prototype.processMapTouch = function() {};

    // Hook into Scene_Map.start to initialize Overseer camera & colonists
    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        if ($gamePlayer) {
            $gamePlayer.setTransparent(true);
            $gamePlayer.setThrough(true);
        }
        if ($colonyManager && $colonyManager.colonists.length === 0) {
            $colonyManager.initGladeColonists();
        }
    };

    // Free camera update loop
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        this.updateOverseerControls();
    };

    Scene_Map.prototype.updateOverseerControls = function() {
        if (!$colonyManager || !$colonyManager.isOverseerMode) return;

        // 1. WASD & Arrow Key Camera Panning
        const camSpeed = 0.35;
        if (Input.isPressed("cameraLeft"))  $gameMap.scrollLeft(camSpeed);
        if (Input.isPressed("cameraRight")) $gameMap.scrollRight(camSpeed);
        if (Input.isPressed("cameraUp"))    $gameMap.scrollUp(camSpeed);
        if (Input.isPressed("cameraDown"))  $gameMap.scrollDown(camSpeed);

        // 2. Mouse Unit Selection & Orders
        if (TouchInput.isTriggered()) {
            const mx = $gameMap.canvasToMapX(TouchInput.x);
            const my = $gameMap.canvasToMapY(TouchInput.y);

            let clickedColonist = null;
            for (const c of $colonyManager.colonists) {
                if (c.event && Math.abs(c.event.x - mx) <= 0.8 && Math.abs(c.event.y - my) <= 0.8) {
                    clickedColonist = c;
                    break;
                }
            }

            if (clickedColonist) {
                $colonyManager.select(clickedColonist);
                SoundManager.playCursor();
            } else if ($colonyManager.selectedColonist) {
                // Move order to clicked destination
                const c = $colonyManager.selectedColonist;
                c.currentJob = "Moving";
                c.assignMoveTo(mx, my, () => {
                    c.currentJob = "Idle";
                    SoundManager.playOk();
                });
            }
        }

        // Right-click deselects active colonist
        if (TouchInput.isCancelled()) {
            if ($colonyManager.selectedColonist) {
                $colonyManager.deselect();
                SoundManager.playCancel();
            }
        }
    };

    // Free Camera: player does not force camera snap
    Game_Player.prototype.updateScroll = function(lastScrolledX, lastScrolledY) {
        if ($colonyManager && $colonyManager.cameraFollowUnit && $colonyManager.cameraFollowUnit.event) {
            const uev = $colonyManager.cameraFollowUnit.event;
            $gameMap.setDisplayPos(uev.x - 8, uev.y - 6);
        }
    };

    //-----------------------------------------------------------------------------
    // Tactile U7 Colonist Status Card Window (Window_UFColonistCard)
    //-----------------------------------------------------------------------------
    function Window_UFColonistCard() {
        this.initialize(...arguments);
    }

    Window_UFColonistCard.prototype = Object.create(Window_Base.prototype);
    Window_UFColonistCard.prototype.constructor = Window_UFColonistCard;

    Window_UFColonistCard.prototype.initialize = function() {
        const w = 380;
        const h = 230;
        const x = 16;
        const y = Graphics.boxHeight - h - 16;
        Window_Base.prototype.initialize.call(this, new Rectangle(x, y, w, h));
        this.opacity = 240;
        this.hide();
    };

    Window_UFColonistCard.prototype.refresh = function() {
        this.contents.clear();
        const c = $colonyManager.selectedColonist;
        if (!c) return;

        // Line 0: Name, Gender, and DF Mood
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(`${c.name} (${c.gender})`, 0, 0, 180, "left");

        let moodColor = "#ffff55";
        if (c.mood === "Ecstatic" || c.mood === "Happy") moodColor = "#55ff55";
        else if (c.mood === "Unhappy" || c.mood === "Stressed" || c.mood === "Miserable") moodColor = "#ff5555";
        this.changeTextColor(moodColor);
        this.drawText(`[${c.mood}]`, 180, 0, 160, "right");

        // Line 1: Activity
        this.resetTextColor();
        this.drawText(`Job: ${c.currentJob}`, 0, 24, 340, "left");

        // Need Gauges
        this.drawNeedGauge("Health", c.hp, c.maxHp, "#44cc44", 50);
        this.drawNeedGauge("Hunger", Math.round(c.hunger), 100, "#ffaa44", 72, true);
        this.drawNeedGauge("Thirst", Math.round(c.thirst), 100, "#44aaff", 94, true);
        this.drawNeedGauge("Fatigue", Math.round(c.fatigue), 100, "#cc66ff", 116, true);
        this.drawNeedGauge("Social", Math.round(100 - c.social), 100, "#ff66aa", 138);

        // Recent DF Thought
        if (c.thoughts && c.thoughts.length > 0) {
            this.changeTextColor(ColorManager.systemColor());
            this.drawText("Thought:", 0, 162, 70, "left");
            this.changeTextColor("#dddddd");
            const tText = `"${c.thoughts[0].text}"`;
            this.drawText(tText, 72, 162, 270, "left");
        }
    };

    Window_UFColonistCard.prototype.drawNeedGauge = function(label, current, max, color, y, reverse = false) {
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(label, 0, y, 65, "left");

        const gx = 70;
        const gw = 180;
        const gh = 12;

        // Background
        this.contents.fillRect(gx, y + 6, gw, gh, "rgba(20, 20, 25, 0.8)");

        // Rate
        const rate = Math.min(1.0, Math.max(0.0, current / max));
        const fillW = Math.round(gw * rate);
        this.contents.fillRect(gx, y + 6, fillW, gh, color);

        // Value
        this.resetTextColor();
        this.drawText(`${current}/${max}`, gx + gw + 10, y, 60, "left");
    };

    // Create window on Scene_Map
    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        this._colonyCard = new Window_UFColonistCard();
        activeColonyWindow = this._colonyCard;
        this.addWindow(this._colonyCard);
    };

    // Auto-tick needs with game time
    setInterval(() => {
        if ($gameMap && $colonyManager) {
            $colonyManager.tickAll();
            if (activeColonyWindow && activeColonyWindow.visible) {
                activeColonyWindow.refresh();
            }
        }
    }, 1000);

    // Ensure Fog of War is active
    if (typeof Sprite_FogOfWar === "undefined" && typeof require === "function") {
        try {
            const fs = require("fs");
            const path = require("path");
            const fowPath = path.join(path.dirname(process.mainModule.filename), "js", "plugins", "UF_FogOfWar.js");
            if (fs.existsSync(fowPath)) {
                require(fowPath);
            }
        } catch (e) {
            console.warn("[UF] UF_FogOfWar auto-load note:", e.message);
        }
    }

    console.log("[UF] UF_ColonyOverseer initialized: Free camera, unit selection, tactile colonist card, and autonomous need loop active.");
})();

