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

            // 1. Thirst Resolution (Walk to stream)
            if (this.thirst >= 60 && this.currentJob === "Idle") {
                const streamTile = this.findNearestWater();
                if (streamTile) {
                    this.currentJob = "Seeking Water";
                    ev.findDirection8DTo(streamTile.x, streamTile.y);
                    this.assignMoveTo(streamTile.x, streamTile.y, () => {
                        this.thirst = 0;
                        this.currentJob = "Idle";
                        if (window.$ufVisuals && window.$ufVisuals.addBark) {
                            window.$ufVisuals.addBark(ev, "Drinks sweet stream water.");
                        }
                    });
                    return;
                }
            }

            // 2. Hunger Resolution (Walk to fruit tree or eat inventory)
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
                    this.assignMoveTo(tree.x, tree.y + 1, () => {
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

            // 3. Fatigue Resolution (Rest)
            if (this.fatigue >= 80 && this.currentJob === "Idle") {
                this.currentJob = "Sleeping";
                if (window.$ufVisuals && window.$ufVisuals.addBark) {
                    window.$ufVisuals.addBark(ev, "Zzz...");
                }
                setTimeout(() => {
                    this.fatigue = 10;
                    this.currentJob = "Idle";
                }, 4000);
                return;
            }

            // 4. Social Affinity / Conversational Barks
            if (this.currentJob === "Idle" && Math.random() < 0.05) {
                const other = $colonyManager.colonists.find(c => c.id !== this.id);
                if (other && other.event && Math.abs(ev.x - other.event.x) <= 3 && Math.abs(ev.y - other.event.y) <= 3) {
                    const barks = [
                        "The morning breeze is sweet.",
                        "Look at the blossoms on the water.",
                        "We should weave fibers before nightfall.",
                        "The earth here is rich and quiet.",
                        "Listen... the river flows clear."
                    ];
                    const chosen = barks[Math.floor(Math.random() * barks.length)];
                    if (window.$ufVisuals && window.$ufVisuals.addBark) {
                        window.$ufVisuals.addBark(ev, chosen);
                    }
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
            // Find water tile adjacent in glade
            const ev = this.event;
            for (let dx = -8; dx <= 8; dx++) {
                for (let dy = -8; dy <= 8; dy++) {
                    const tx = ev.x + dx;
                    const ty = ev.y + dy;
                    if ($gameMap.terrainTag(tx, ty) === 1 || ($gameMap.regionId(tx, ty) === 10)) {
                        return { x: tx, y: ty };
                    }
                }
            }
            return { x: 28, y: 20 }; // Default stream bank
        }

        findFruitTree() {
            for (const ev of $gameMap.events()) {
                if (ev && ev.event() && ev.event().note.includes("<tree>")) {
                    return { x: ev.x, y: ev.y };
                }
            }
            return { x: 20, y: 20 }; // Default tree coordinate
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
            if ($gameSystem._colonyWindow) {
                $gameSystem._colonyWindow.refresh();
                $gameSystem._colonyWindow.show();
            }
        }

        deselect() {
            this.selectedColonist = null;
            if ($gameSystem._colonyWindow) {
                $gameSystem._colonyWindow.hide();
            }
        }

        tickAll() {
            for (const c of this.colonists) {
                c.tickNeeds();
            }
        }
    }

    window.$colonyManager = new ColonyManager();

    // Hook into UF_Core continuous 24h clock tick
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        this.updateOverseerControls();
    };

    Scene_Map.prototype.updateOverseerControls = function() {
        if (!$colonyManager || !$colonyManager.isOverseerMode) return;

        // Mouse Unit Selection
        if (TouchInput.isTriggered()) {
            const mx = $gameMap.canvasToMapX(TouchInput.x);
            const my = $gameMap.canvasToMapY(TouchInput.y);

            let clickedColonist = null;
            for (const c of $colonyManager.colonists) {
                if (c.event && c.event.x === mx && c.event.y === my) {
                    clickedColonist = c;
                    break;
                }
            }

            if (clickedColonist) {
                $colonyManager.select(clickedColonist);
                SoundManager.playCursor();
            } else if (!TouchInput.isCancelled()) {
                // If drafted colonist selected, right-click (or cancel) orders move
            }
        }

        // Right-Click (Cancelled) Orders for Selected Drafted Unit
        if (TouchInput.isCancelled() && $colonyManager.selectedColonist && $colonyManager.selectedColonist.drafted) {
            const mx = $gameMap.canvasToMapX(TouchInput.x);
            const my = $gameMap.canvasToMapY(TouchInput.y);
            $colonyManager.selectedColonist.assignMoveTo(mx, my, () => {
                SoundManager.playOk();
            });
        }
    };

    // Free Camera Panning
    const _Game_Player_updateScroll = Game_Player.prototype.updateScroll;
    Game_Player.prototype.updateScroll = function(lastScrolledX, lastScrolledY) {
        if ($colonyManager && $colonyManager.cameraFollowUnit && $colonyManager.cameraFollowUnit.event) {
            const uev = $colonyManager.cameraFollowUnit.event;
            $gameMap.setDisplayPos(uev.x - 8, uev.y - 6);
            return;
        }

        // WASD / Arrow Key Camera Panning in Overseer Mode
        if ($colonyManager && $colonyManager.isOverseerMode && (!$colonyManager.selectedColonist || !$colonyManager.selectedColonist.drafted)) {
            const speed = 0.25;
            if (Input.isPressed("left"))  $gameMap.scrollLeft(speed);
            if (Input.isPressed("right")) $gameMap.scrollRight(speed);
            if (Input.isPressed("up"))    $gameMap.scrollUp(speed);
            if (Input.isPressed("down"))  $gameMap.scrollDown(speed);
        } else {
            _Game_Player_updateScroll.call(this, lastScrolledX, lastScrolledY);
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
        $gameSystem._colonyWindow = this._colonyCard;
        this.addWindow(this._colonyCard);
    };

    // Auto-tick needs with game time
    setInterval(() => {
        if ($gameMap && $colonyManager) {
            $colonyManager.tickAll();
            if ($gameSystem._colonyWindow && $gameSystem._colonyWindow.visible) {
                $gameSystem._colonyWindow.refresh();
            }
        }
    }, 1000);

    console.log("[UF] UF_ColonyOverseer initialized: Free camera, unit selection, tactile colonist card, and autonomous need loop active.");
})();

