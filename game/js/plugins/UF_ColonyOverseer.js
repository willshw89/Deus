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

    // Delays run on game time (UF_TimeSpeed), so the colony keeps pace when time is sped up and pauses with the
    // map. 1000 ms = 60 map updates. Falls back to real time if UF_TimeSpeed isn't installed.
    const later = (fn, ms) => (window.UF && UF.Time ? UF.Time.after(Math.max(1, Math.round(ms * 0.06)), fn) : setTimeout(fn, ms));

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

        // Only the colonist's own event: in other areas and layers, the same event ID is some other object.
        get event() {
            const ev = $gameMap ? $gameMap.event(this.eventId) : null;
            return ev && ev.event() && ev.event().note.includes("<colonist") ? ev : null;
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
                    later(() => {
                        this.fatigue = 5;
                        this.currentJob = "Idle";
                    }, 4000);
                });
                return;
            }

            // 4. Autonomous Society-Building Projects (Building Civilization)
            const prog = $colonyManager ? $colonyManager.societyProgress : null;
            if (prog) {
                // Phase A: Establish Campfire & Hearth at (127, 128)
                if (!prog.hearthBuilt) {
                    if (prog.wood < 3 && this.id === 1) { // Adam gathers firewood
                        this.currentJob = "Gathering Firewood";
                        this.assignMoveTo(122, 125, () => {
                            if (window.$ufVisuals && window.$ufVisuals.addBark) {
                                window.$ufVisuals.addBark(ev, "Gathers dry fallen oak branches.");
                            }
                            later(() => {
                                this.currentJob = "Hauling Timber";
                                this.assignMoveTo(127, 127, () => {
                                    prog.wood++;
                                    this.addThought("Felt purposeful gathering firewood for our hearth.", 10);
                                    if (window.$ufVisuals && window.$ufVisuals.addBark) {
                                        window.$ufVisuals.addBark(ev, `Placed firewood at hearth (${prog.wood}/3).`);
                                    }
                                    this.currentJob = "Idle";
                                });
                            }, 1200);
                        });
                        return;
                    } else if (prog.stone < 3 && this.id === 2) { // Eve gathers hearthstones
                        this.currentJob = "Gathering Hearthstones";
                        this.assignMoveTo(134, 128, () => {
                            if (window.$ufVisuals && window.$ufVisuals.addBark) {
                                window.$ufVisuals.addBark(ev, "Collects smooth riverbed stones.");
                            }
                            later(() => {
                                this.currentJob = "Hauling Stones";
                                this.assignMoveTo(127, 127, () => {
                                    prog.stone++;
                                    this.addThought("Felt content arranging stones for the hearth.", 10);
                                    if (window.$ufVisuals && window.$ufVisuals.addBark) {
                                        window.$ufVisuals.addBark(ev, `Placed hearthstone ring (${prog.stone}/3).`);
                                    }
                                    this.currentJob = "Idle";
                                });
                            }, 1200);
                        });
                        return;
                    } else if (prog.wood >= 3 && prog.stone >= 3) {
                        this.currentJob = "Kindling the Hearth";
                        this.assignMoveTo(127, 127, () => {
                            prog.hearthBuilt = true;
                            this.addThought("Felt triumphant kindling our first communal campfire!", 25);
                            if (window.$ufVisuals && window.$ufVisuals.addBark) {
                                window.$ufVisuals.addBark(ev, "Strikes flint... The hearth fire roars to life!");
                            }
                            this.currentJob = "Idle";
                        });
                        return;
                    }
                }
                // Phase B: Construct Lean-To Shelter at (125, 126)
                else if (!prog.shelterBuilt) {
                    if (prog.wood < 6 && this.id === 1) {
                        this.currentJob = "Felling Shelter Poles";
                        this.assignMoveTo(122, 124, () => {
                            later(() => {
                                this.currentJob = "Hauling Shelter Timber";
                                this.assignMoveTo(125, 126, () => {
                                    prog.wood++;
                                    this.addThought("Crafted sturdy timber poles for our shelter frame.", 12);
                                    if (window.$ufVisuals && window.$ufVisuals.addBark) {
                                        window.$ufVisuals.addBark(ev, `Framed shelter poles (${prog.wood - 3}/3).`);
                                    }
                                    this.currentJob = "Idle";
                                });
                            }, 1200);
                        });
                        return;
                    } else if (prog.thatch < 3 && this.id === 2) {
                        this.currentJob = "Gathering Reed Thatch";
                        this.assignMoveTo(134, 126, () => {
                            later(() => {
                                this.currentJob = "Hauling Thatch";
                                this.assignMoveTo(125, 126, () => {
                                    prog.thatch++;
                                    this.addThought("Gathered soft river reeds for thatch roofing.", 10);
                                    if (window.$ufVisuals && window.$ufVisuals.addBark) {
                                        window.$ufVisuals.addBark(ev, `Wove thatch roof layer (${prog.thatch}/3).`);
                                    }
                                    this.currentJob = "Idle";
                                });
                            }, 1200);
                        });
                        return;
                    } else if (prog.wood >= 6 && prog.thatch >= 3) {
                        this.currentJob = "Assembling Shelter";
                        this.assignMoveTo(125, 126, () => {
                            prog.shelterBuilt = true;
                            this.addThought("Felt secure completing our first sturdy shelter.", 30);
                            if (window.$ufVisuals && window.$ufVisuals.addBark) {
                                window.$ufVisuals.addBark(ev, "The shelter is complete! We have a home.");
                            }
                            this.currentJob = "Idle";
                        });
                        return;
                    }
                }
            }

            // 5. Social Bonding & Conversation with Partner
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
                            [`Look at the blossoms above us, ${partner.name}.`, `The world is vast and full of wonder.`],
                            [`We shall build a strong home here, ${partner.name}.`, `Together we will thrive and create a great tribe.`]
                        ];
                        const pair = dialogues[Math.floor(Math.random() * dialogues.length)];

                        if (window.$ufVisuals && window.$ufVisuals.addBark) {
                            window.$ufVisuals.addBark(ev, pair[0]);
                            later(() => {
                                if (partner.event && window.$ufVisuals) {
                                    window.$ufVisuals.addBark(partner.event, pair[1]);
                                }
                            }, 1200);
                        }

                        later(() => {
                            this.currentJob = "Idle";
                            partner.currentJob = "Idle";
                        }, 3000);
                    });
                    return;
                }
            }

            // 6. Nature Contemplation by the River
            if (this.communeNature >= 35 && Math.random() < 0.35) {
                this.currentJob = "Contemplating";
                const spot = this.findNearestWater() || { x: ev.x, y: ev.y };
                const spotX = spot.x;
                const spotY = spot.y;
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

            // 7. Idle Wilderness Stroll (Expands Fog of War!)
            if (Math.random() < 0.25) {
                const wanderX = Math.max(10, Math.min(245, ev.x + Math.floor(Math.random() * 9) - 4));
                const wanderY = Math.max(10, Math.min(245, ev.y + Math.floor(Math.random() * 9) - 4));
                if (!Tilemap.isWaterTile($gameMap.tileId(wanderX, wanderY, 0))) { // Don't wander into water
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
                    later(checkStep, 250);
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

        // Nearest walkable cell next to real water on this map (the world is seeded, so nothing is hard-coded).
        findNearestWater() {
            const ev = this.event;
            if (!ev || !$gameMap) return null;
            const isWater = (x, y) => $gameMap.isValid(x, y) && Tilemap.isWaterTile($gameMap.tileId(x, y, 0));
            for (let r = 1; r <= 60; r++) {
                for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                        const x = ev.x + dx, y = ev.y + dy;
                        if (!isWater(x, y)) continue;
                        for (const [bx, by] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
                            if ($gameMap.isValid(bx, by) && !isWater(bx, by) && $gameMap.isPassable(bx, by, 2)) return { x: bx, y: by };
                        }
                    }
                }
            }
            return null;
        }

        findFruitTree() {
            if ($gameMap) {
                for (const ev of $gameMap.events()) {
                    if (ev && ev.event() && ev.event().note.includes("<tree>") && ev.event().note.includes("<fruit>")) {
                        return { x: ev.x, y: ev.y };
                    }
                }
            }
            return { x: 127, y: 126 };
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
            this.societyProgress = {
                wood: 0,
                stone: 0,
                thatch: 0,
                hearthBuilt: false,
                shelterBuilt: false
            };
        }

        initGladeColonists() {
            this.colonists = [
                new Colonist(1, "Adam", "Male", 1),
                new Colonist(2, "Eve", "Female", 2)
            ];
            this.societyProgress = {
                wood: 0,
                stone: 0,
                thatch: 0,
                hearthBuilt: false,
                shelterBuilt: false
            };
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

    // Ensure new game transfers start at map 2, (128, 128)
    // New Game start position is set by UF_World (a fresh seeded area, colonists in the middle).

    // Hook into Scene_Map.start to initialize Overseer camera & colonists
    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        if ($gamePlayer) {
            $gamePlayer.setTransparent(true);
            $gamePlayer.setThrough(true);
            // The camera stays where the view (player) was placed: UF_World starts New Game in the middle, and layer or
            // area changes keep the same cell. (A fixed snap to (128,128) here broke both.)
        }
        if ($colonyManager && $colonyManager.colonists.length === 0) {
            $colonyManager.initGladeColonists();
        }
        startColonyTicker();
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
        const h = 265;
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

        // Line 5: Colony Society Progress & Factions Shortcut
        const prog = $colonyManager ? $colonyManager.societyProgress : null;
        if (prog) {
            this.contents.fontSize = 13;
            this.changeTextColor("#f59e0b");
            const hearthStatus = prog.hearthBuilt ? "Built (Warm)" : `${prog.wood}/3 Wood, ${prog.stone}/3 Stone`;
            const shelterStatus = prog.shelterBuilt ? "Built" : (prog.hearthBuilt ? `${prog.wood - 3}/3 Poles, ${prog.thatch}/3 Thatch` : "Pending");
            this.drawText(`Hearth: ${hearthStatus} | Shelter: ${shelterStatus}`, 0, 190, 350, "left");

            this.changeTextColor("#38bdf8");
            this.drawText("[F] View World Factions & Diplomacy", 0, 212, 350, "left");
            this.contents.fontSize = $gameSystem.mainFontSize ? $gameSystem.mainFontSize() : 26;
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

    // Needs tick every 60 map updates (1 game minute at normal speed; faster when time is sped up, paused in menus).
    // Started with the first map, once UF_TimeSpeed has loaded; falls back to a real-time interval without it.
    const tickColony = () => {
        if ($gameMap && $colonyManager) {
            $colonyManager.tickAll();
            if (activeColonyWindow && activeColonyWindow.visible) {
                activeColonyWindow.refresh();
            }
        }
    };
    let colonyTicker = null;
    const startColonyTicker = () => {
        if (colonyTicker !== null) return;
        colonyTicker = window.UF && UF.Time ? UF.Time.every(60, tickColony) : setInterval(tickColony, 1000);
    };

    //-----------------------------------------------------------------------------
    // Faction Dynamic Line-of-Sight Fog of War Layer
    //-----------------------------------------------------------------------------
    Game_System.prototype.getExploredGrid = function(mapId) {
        this._ufExploredMaps = this._ufExploredMaps || {};
        if (!this._ufExploredMaps[mapId]) {
            this._ufExploredMaps[mapId] = {};
        }
        return this._ufExploredMaps[mapId];
    };

    // Exploration now lives in UF_Fog (compact, saved per area). These wrappers keep old callers working.
    Game_System.prototype.isTileExplored = function(mapId, x, y) {
        if (window.UF && UF.Fog && mapId === $gameMap.mapId()) return UF.Fog.isExplored(x, y);
        const grid = this.getExploredGrid(mapId);
        return !!grid[`${x},${y}`];
    };

    Game_System.prototype.exploreTile = function(mapId, x, y) {
        if (window.UF && UF.Fog && mapId === $gameMap.mapId()) return UF.Fog.reveal(x, y, 0);
        const grid = this.getExploredGrid(mapId);
        grid[`${x},${y}`] = true;
    };

    function Sprite_FogOfWar() {
        this.initialize(...arguments);
    }
    Sprite_FogOfWar.prototype = Object.create(Sprite.prototype);
    Sprite_FogOfWar.prototype.constructor = Sprite_FogOfWar;

    Sprite_FogOfWar.prototype.initialize = function() {
        Sprite.prototype.initialize.call(this);
        const w = Graphics.width || 816;
        const h = Graphics.height || 624;
        this.bitmap = new Bitmap(w, h);
        this.z = 8;
        this._updateThrottle = 0;
    };

    Sprite_FogOfWar.prototype.update = function() {
        Sprite.prototype.update.call(this);
        if (!$gameMap || !this.bitmap) return;
        this._updateThrottle++;
        if (this._updateThrottle === 1 || this._updateThrottle % 2 === 0) {
            this.renderFog();
        }
    };

    Sprite_FogOfWar.prototype.renderFog = function() {
        const bmp = this.bitmap;
        if (!bmp || !bmp.context) return;
        const ctx = bmp.context;
        const mapId = $gameMap.mapId();
        const tw = $gameMap.tileWidth();
        const th = $gameMap.tileHeight();
        const defaultSightRadius = 6.5; // ~6.5 tiles vision radius
        const exploredAlpha = 0.65;     // 65% ambient darkness for explored terrain outside active LOS

        // Collect active faction observers (Adam & Eve)
        const observers = [];
        if (window.$colonyManager && window.$colonyManager.colonists) {
            for (const c of $colonyManager.colonists) {
                if (c.event && !c.event.isTransparent()) {
                    observers.push({
                        x: Math.round(c.event._realX),
                        y: Math.round(c.event._realY),
                        screenX: Math.round($gameMap.adjustX(c.event._realX) * tw + tw / 2),
                        screenY: Math.round($gameMap.adjustY(c.event._realY) * th + th / 2),
                        radius: (c.visionRadius || defaultSightRadius) * tw
                    });
                }
            }
        }

        // Fallback: If no colonists registered, use player position
        if (observers.length === 0 && $gamePlayer) {
            observers.push({
                x: Math.round($gamePlayer._realX),
                y: Math.round($gamePlayer._realY),
                screenX: Math.round($gameMap.adjustX($gamePlayer._realX) * tw + tw / 2),
                screenY: Math.round($gameMap.adjustY($gamePlayer._realY) * th + th / 2),
                radius: defaultSightRadius * tw
            });
        }

        // 1. Mark tiles explored around observers
        for (const obs of observers) {
            const tileRadius = Math.ceil(obs.radius / tw);
            for (let dx = -tileRadius; dx <= tileRadius; dx++) {
                for (let dy = -tileRadius; dy <= tileRadius; dy++) {
                    if (dx * dx + dy * dy <= tileRadius * tileRadius) {
                        $gameSystem.exploreTile(mapId, obs.x + dx, obs.y + dy);
                    }
                }
            }
        }

        // 2. Clear fog canvas
        ctx.clearRect(0, 0, bmp.width, bmp.height);

        // 3. Draw ambient fog over entire visible canvas
        ctx.fillStyle = `rgba(6, 12, 18, ${exploredAlpha})`;
        ctx.fillRect(0, 0, bmp.width, bmp.height);

        // 4. Fill pitch black for unexplored tiles
        const startX = Math.floor($gameMap.displayX()) - 1;
        const startY = Math.floor($gameMap.displayY()) - 1;
        const tilesX = Math.ceil(bmp.width / tw) + 3;
        const tilesY = Math.ceil(bmp.height / th) + 3;

        ctx.fillStyle = "rgba(4, 8, 12, 1.0)";
        for (let ty = 0; ty < tilesY; ty++) {
            for (let tx = 0; tx < tilesX; tx++) {
                const gx = startX + tx;
                const gy = startY + ty;
                const explored = $gameSystem.isTileExplored(mapId, gx, gy);
                if (!explored) {
                    const screenTileX = Math.round($gameMap.adjustX(gx) * tw);
                    const screenTileY = Math.round($gameMap.adjustY(gy) * th);
                    const nextTileX = Math.round($gameMap.adjustX(gx + 1) * tw);
                    const nextTileY = Math.round($gameMap.adjustY(gy + 1) * th);
                    ctx.fillRect(screenTileX, screenTileY, nextTileX - screenTileX, nextTileY - screenTileY);
                }
            }
        }

        // 4. Cut out active line-of-sight around faction observers with soft radial feathering
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";

        for (const obs of observers) {
            const innerRadius = obs.radius * 0.45;
            const grad = ctx.createRadialGradient(
                obs.screenX, obs.screenY, innerRadius,
                obs.screenX, obs.screenY, obs.radius
            );
            grad.addColorStop(0, "rgba(0, 0, 0, 1.0)");
            grad.addColorStop(0.70, "rgba(0, 0, 0, 0.75)");
            grad.addColorStop(1, "rgba(0, 0, 0, 0.0)");

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(obs.screenX, obs.screenY, obs.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
        if (bmp.baseTexture) {
            bmp.baseTexture.update();
        }
    };

    // The screen-space fog layer is replaced by UF_Fog (follows camera zoom, saved compactly).
    // Only created when UF_Fog isn't installed.
    const _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _Spriteset_Map_createLowerLayer.call(this);
        if (window.UF && UF.Fog) return;
        this._fogOfWar = new Sprite_FogOfWar();
        this.addChild(this._fogOfWar);
    };

    // Dim or hide non-faction events outside line-of-sight
    const _Sprite_Character_update = Sprite_Character.prototype.update;
    Sprite_Character.prototype.update = function() {
        _Sprite_Character_update.call(this);
        if (!this._character || this._character === $gamePlayer) return;
        
        // Always show colonists (Adam & Eve) and prominent terrain features (fruit tree)
        if ($colonyManager && $colonyManager.colonists) {
            if ($colonyManager.colonists.some(c => c.event === this._character)) return;
        }
        const ev = this._character.event ? this._character.event() : null;
        if (ev && (ev.note.includes("<tree>") || ev.note.includes("<canopy>") || ev.note.includes("<terrain>"))) {
            return;
        }

        // Check if tile is explored
        if ($gameSystem && $gameMap) {
            const explored = $gameSystem.isTileExplored($gameMap.mapId(), this._character.x, this._character.y);
            if (!explored) {
                this.visible = false;
            }
        }
    };

    console.log("[UF] UF_ColonyOverseer initialized: Free camera, unit selection, tactile colonist card, and autonomous need loop active.");
})();

