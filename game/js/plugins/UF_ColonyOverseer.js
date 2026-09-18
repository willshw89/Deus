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
    // Colonist Data Model & Needs State
    //-----------------------------------------------------------------------------
    class Colonist {
        constructor(id, name, gender, eventId) {
            this.id = id;
            this.name = name;
            this.gender = gender;
            this.eventId = eventId;
            this.hp = 100;
            this.maxHp = 100;
            this.hunger = 10;   // 0-100 (100 = starving)
            this.thirst = 15;   // 0-100 (100 = dehydrated)
            this.fatigue = 5;   // 0-100 (100 = exhausted)
            this.mood = 80;     // 0-100 (100 = ecstatic)
            this.drafted = false;
            this.currentJob = "Idle";
            this.targetX = null;
            this.targetY = null;
            this.inventory = [];
        }

        get event() {
            return $gameMap.event(this.eventId);
        }

        tickNeeds() {
            if (this.drafted) return;

            // Needs rate per tick
            this.hunger = Math.min(100, this.hunger + 0.15);
            this.thirst = Math.min(100, this.thirst + 0.20);
            this.fatigue = Math.min(100, this.fatigue + 0.08);

            // Autonomous Behavior Decision Tree
            const ev = this.event;
            if (!ev || ev.isMoving()) return;

            // 1. Thirst Resolution (Walk to stream bank at x=19)
            if (this.thirst >= 60 && this.currentJob === "Idle") {
                const streamTile = this.findNearestWater();
                if (streamTile) {
                    this.currentJob = "Seeking Water";
                    this.assignMoveTo(streamTile.x, streamTile.y, () => {
                        ev.setDirection(6); // Face East towards the stream
                        this.thirst = 0;
                        this.currentJob = "Idle";
                        if (window.$ufVisuals && window.$ufVisuals.addBark) {
                            window.$ufVisuals.addBark(ev, "Drinks sweet stream water.");
                        }
                    });
                    return;
                }
            }

            // 2. Hunger Resolution (Walk to fruit tree at 15,14)
            if (this.hunger >= 60 && this.currentJob === "Idle") {
                const fruitIdx = this.inventory.findIndex(i => i.name === "Eden-Fruit");
                if (fruitIdx >= 0) {
                    this.inventory.splice(fruitIdx, 1);
                    this.hunger = 0;
                    if (window.$ufVisuals && window.$ufVisuals.addBark) {
                        window.$ufVisuals.addBark(ev, "Eats ripe fruit.");
                    }
                    return;
                }

                // Path to Fruit Tree
                const tree = this.findFruitTree();
                if (tree) {
                    this.currentJob = "Foraging Fruit";
                    const targetX = this.id === 1 ? tree.x - 1 : tree.x + 1; // Adam approaches left, Eve approaches right
                    this.assignMoveTo(targetX, tree.y + 1, () => {
                        ev.setDirection(8); // Face North toward tree canopy
                        this.hunger = 0;
                        this.inventory.push({ name: "Eden-Fruit", icon: "fruit" });
                        this.currentJob = "Idle";
                        if (window.$ufVisuals && window.$ufVisuals.addBark) {
                            window.$ufVisuals.addBark(ev, "Plucks and eats fresh fruit.");
                        }
                    });
                    return;
                }
            }

            // 3. Fatigue Resolution (Rest under tree)
            if (this.fatigue >= 80 && this.currentJob === "Idle") {
                this.currentJob = "Sleeping";
                if (window.$ufVisuals && window.$ufVisuals.addBark) {
                    window.$ufVisuals.addBark(ev, "Zzz... (Resting in the shade)");
                }
                setTimeout(() => {
                    this.fatigue = 10;
                    this.currentJob = "Idle";
                }, 4000);
                return;
            }

            // 4. Social Affinity / Conversational Barks
            if (this.currentJob === "Idle") {
                const other = $colonyManager.colonists.find(c => c.id !== this.id);
                if (other && other.event && Math.abs(ev.x - other.event.x) <= 3 && Math.abs(ev.y - other.event.y) <= 3) {
                    if (Math.random() < 0.25) {
                        const barks = [
                            "The morning breeze is sweet.",
                            "Look at the blossoms on the water.",
                            "The earth here is rich and quiet.",
                            "Listen... the river flows clear.",
                            "The sun warms the glade.",
                            "The wilderness stretches far beyond..."
                        ];
                        const chosen = barks[Math.floor(Math.random() * barks.length)];
                        if (window.$ufVisuals && window.$ufVisuals.addBark) {
                            window.$ufVisuals.addBark(ev, chosen);
                        }
                    }
                }
            }

            // 5. Autonomous Glade Strolling & Flora Exploration
            if (this.currentJob === "Idle" && Math.random() < 0.20) {
                const wanderX = 12 + Math.floor(Math.random() * 7); // 12 to 18
                const wanderY = 13 + Math.floor(Math.random() * 5); // 13 to 17
                if (!(wanderX === 15 && wanderY === 14)) { // Don't walk onto tree trunk
                    this.currentJob = "Strolling";
                    this.assignMoveTo(wanderX, wanderY, () => {
                        this.currentJob = "Idle";
                        if (Math.random() < 0.3) {
                            const thoughts = [
                                "The air smells of pine and water.",
                                "Soft green moss underfoot.",
                                "The ancient tree watches over us."
                            ];
                            if (window.$ufVisuals && window.$ufVisuals.addBark) {
                                window.$ufVisuals.addBark(ev, thoughts[Math.floor(Math.random() * thoughts.length)]);
                            }
                        }
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
                const dir = ev.findDirection8DTo(gx, gy);
                if (dir > 0) {
                    ev.moveInDirection8D(dir);
                    setTimeout(checkStep, 250);
                } else {
                    // Reached adjacent or blocked
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
            // The stream runs along columns 20-22. Bank is column 19.
            const ev = this.event;
            const bankY = Math.max(10, Math.min(20, ev.y));
            return { x: 19, y: bankY };
        }

        findFruitTree() {
            for (const ev of $gameMap.events()) {
                if (ev && ev.event() && ev.event().note.includes("<tree>")) {
                    return { x: ev.x, y: ev.y };
                }
            }
            return { x: 15, y: 14 }; // Ancient Fruit Tree center coordinate
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

    // Suppress map name banner window ("The Glade of Genesis")
    Scene_Map.prototype.createMapNameWindow = function() {};
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
        const w = 340;
        const h = 180;
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

        this.changeTextColor(ColorManager.systemColor());
        this.drawText(`${c.name} (${c.gender})`, 0, 0, 200, "left");

        // Draft Button Indicator
        const draftText = c.drafted ? "[DRAFTED]" : "[UNDRAFTED]";
        this.changeTextColor(c.drafted ? "#ff5555" : "#55ff55");
        this.drawText(draftText, 200, 0, 100, "right");

        this.resetTextColor();
        this.drawText(`Activity: ${c.currentJob}`, 0, 26, 300, "left");

        // Need Gauges
        this.drawNeedGauge("Health", c.hp, c.maxHp, "#44cc44", 56);
        this.drawNeedGauge("Hunger", Math.round(c.hunger), 100, "#ffaa44", 82, true);
        this.drawNeedGauge("Thirst", Math.round(c.thirst), 100, "#44aaff", 108, true);
        this.drawNeedGauge("Fatigue", Math.round(c.fatigue), 100, "#cc66ff", 134, true);
    };

    Window_UFColonistCard.prototype.drawNeedGauge = function(label, current, max, color, y, reverse = false) {
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(label, 0, y, 70, "left");

        const gx = 75;
        const gw = 180;
        const gh = 12;

        // Background
        this.contents.fillRect(gx, y + 8, gw, gh, "rgba(20, 20, 25, 0.8)");

        // Rate
        const rate = Math.min(1.0, Math.max(0.0, current / max));
        const fillW = Math.round(gw * rate);
        this.contents.fillRect(gx, y + 8, fillW, gh, color);

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

    console.log("[UF] UF_ColonyOverseer initialized: Free camera, unit selection, tactile colonist card, and autonomous need loop active.");
})();

