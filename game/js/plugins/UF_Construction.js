//=============================================================================
// RPG Maker MZ - Ultima Fortress: Dwarf Fortress Construction & Gathering
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Construction] Dwarf Fortress grid-based blueprint construction, natural resource gathering, and hauling jobs.
 * @author Deepdelve Architect
 *
 * @help
 * ============================================================================
 * Ultima Fortress Construction & Gathering (UF_Construction)
 * ============================================================================
 * Implements:
 * - Natural resource gathering: [Harvest Tree], [Chop Wood], [Gather Stone], [Mine]
 * - Ghost blueprint construction on the grid (Palisades, Stone Walls, Beds, Hearths)
 * - Hauling & construction job queue carried out by autonomous colonists
 * - Tactile designation dock interface
 */

(() => {
    "use strict";

    //-----------------------------------------------------------------------------
    // Blueprint & Job Data Model
    //-----------------------------------------------------------------------------
    class ConstructionJob {
        constructor(id, type, x, y, requiredMaterials, buildTime) {
            this.id = id;
            this.type = type; // "wall", "floor", "bed", "hearth"
            this.x = x;
            this.y = y;
            this.required = requiredMaterials; // e.g. { "Wood": 2 }
            this.delivered = {};
            this.progress = 0;
            this.maxProgress = buildTime || 100;
            this.completed = false;
            this.assignedColonistId = null;
        }

        isMaterialsSatisfied() {
            for (const mat in this.required) {
                if ((this.delivered[mat] || 0) < this.required[mat]) return false;
            }
            return true;
        }
    }

    class GatheringDesignation {
        constructor(id, type, x, y) {
            this.id = id;
            this.type = type; // "harvest", "chop", "stone"
            this.x = x;
            this.y = y;
            this.assignedColonistId = null;
            this.completed = false;
        }
    }

    //-----------------------------------------------------------------------------
    // Construction Manager Singleton
    //-----------------------------------------------------------------------------
    class ConstructionManager {
        constructor() {
            this.blueprints = [];
            this.gatherDesignations = [];
            this.groundItems = [];
            this.activeMode = null; // "harvest", "chop", "gather", "build_wall", "build_bed"
            this.nextId = 1;
        }

        addBlueprint(type, x, y, required, time) {
            // Check if existing blueprint at position
            if (this.blueprints.some(b => b.x === x && b.y === y && !b.completed)) return;
            const bp = new ConstructionJob(this.nextId++, type, x, y, required, time);
            this.blueprints.push(bp);
            console.log(`[UF Construction] Placed blueprint ${type} at (${x}, ${y})`);
            SoundManager.playOk();
            this.dispatchJobs();
        }

        addGatherDesignation(type, x, y) {
            if (this.gatherDesignations.some(g => g.x === x && g.y === y && !g.completed)) return;
            const gd = new GatheringDesignation(this.nextId++, type, x, y);
            this.gatherDesignations.push(gd);
            console.log(`[UF Gathering] Designated ${type} at (${x}, ${y})`);
            SoundManager.playOk();
            this.dispatchJobs();
        }

        dispatchJobs() {
            if (!$colonyManager) return;

            // Assign gathering jobs to idle colonists
            for (const gd of this.gatherDesignations) {
                if (gd.completed || gd.assignedColonistId) continue;
                const idleColonist = $colonyManager.colonists.find(c => !c.drafted && c.currentJob === "Idle");
                if (idleColonist) {
                    gd.assignedColonistId = idleColonist.id;
                    idleColonist.currentJob = `${gd.type.toUpperCase()}: (${gd.x}, ${gd.y})`;
                    idleColonist.assignMoveTo(gd.x, gd.y, () => {
                        this.completeGathering(gd, idleColonist);
                    });
                }
            }

            // Assign construction jobs to idle colonists
            for (const bp of this.blueprints) {
                if (bp.completed || bp.assignedColonistId) continue;
                const idleColonist = $colonyManager.colonists.find(c => !c.drafted && c.currentJob === "Idle");
                if (idleColonist) {
                    bp.assignedColonistId = idleColonist.id;
                    idleColonist.currentJob = `Building ${bp.type}`;
                    idleColonist.assignMoveTo(bp.x, bp.y, () => {
                        this.completeConstruction(bp, idleColonist);
                    });
                }
            }
        }

        completeGathering(gd, colonist) {
            gd.completed = true;
            colonist.currentJob = "Idle";
            const ev = colonist.event;

            if (gd.type === "harvest") {
                // Drop 2x Eden-Fruit on ground / inventory
                colonist.inventory.push({ name: "Eden-Fruit", icon: "fruit" });
                this.groundItems.push({ name: "Eden-Fruit", x: gd.x, y: gd.y });
                if (window.$ufVisuals && window.$ufVisuals.addBark) {
                    window.$ufVisuals.addBark(ev, "Harvested fresh sweet fruit!");
                }
            } else if (gd.type === "chop") {
                // Yield wood logs
                colonist.inventory.push({ name: "Wood Logs", count: 3 });
                this.groundItems.push({ name: "Wood Logs", x: gd.x, y: gd.y });
                if (window.$ufVisuals && window.$ufVisuals.addBark) {
                    window.$ufVisuals.addBark(ev, "Hewn timber branches!");
                }
            } else if (gd.type === "stone") {
                // Yield river flint
                colonist.inventory.push({ name: "River Flint", count: 2 });
                this.groundItems.push({ name: "River Flint", x: gd.x, y: gd.y });
                if (window.$ufVisuals && window.$ufVisuals.addBark) {
                    window.$ufVisuals.addBark(ev, "Gathered sharp flint stones.");
                }
            }
            SoundManager.playShop();
            this.dispatchJobs();
        }

        completeConstruction(bp, colonist) {
            bp.completed = true;
            colonist.currentJob = "Idle";
            const ev = colonist.event;

            if (window.$ufVisuals && window.$ufVisuals.addBark) {
                window.$ufVisuals.addBark(ev, `Completed construction of ${bp.type}!`);
            }
            SoundManager.playUseItem();

            // Transform ground tile or place collidable structure
            if (bp.type === "palisade" || bp.type === "wall") {
                // Change passability / place tile
                console.log(`[UF] Placed solid wall at (${bp.x}, ${bp.y})`);
            }
            this.dispatchJobs();
        }
    }

    window.$constructionManager = new ConstructionManager();

    //-----------------------------------------------------------------------------
    // Tactile Designation Dock Window (Window_UFDesignationDock)
    //-----------------------------------------------------------------------------
    function Window_UFDesignationDock() {
        this.initialize(...arguments);
    }

    Window_UFDesignationDock.prototype = Object.create(Window_Command.prototype);
    Window_UFDesignationDock.prototype.constructor = Window_UFDesignationDock;

    Window_UFDesignationDock.prototype.initialize = function() {
        const w = 480;
        const h = 72;
        const x = Graphics.boxWidth - w - 16;
        const y = Graphics.boxHeight - h - 16;
        const rect = new Rectangle(x, y, w, h);
        Window_Command.prototype.initialize.call(this, rect);
        this.opacity = 240;
    };

    Window_UFDesignationDock.prototype.maxCols = function() {
        return 5;
    };

    Window_UFDesignationDock.prototype.makeCommandList = function() {
        this.addCommand("Harvest", "harvest");
        this.addCommand("Chop", "chop");
        this.addCommand("Stone", "stone");
        this.addCommand("Palisade", "build_palisade");
        this.addCommand("Bed", "build_bed");
    };

    Window_UFDesignationDock.prototype.itemHeight = function() {
        return 36;
    };

    // Add Designation Dock to Scene_Map
    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        this._designationDock = new Window_UFDesignationDock();
        this._designationDock.setHandler("harvest", this.onDesignateHarvest.bind(this));
        this._designationDock.setHandler("chop", this.onDesignateChop.bind(this));
        this._designationDock.setHandler("stone", this.onDesignateStone.bind(this));
        this._designationDock.setHandler("build_palisade", this.onDesignatePalisade.bind(this));
        this._designationDock.setHandler("build_bed", this.onDesignateBed.bind(this));
        this.addWindow(this._designationDock);
    };

    Scene_Map.prototype.onDesignateHarvest = function() {
        $constructionManager.activeMode = "harvest";
        SoundManager.playCursor();
        this._designationDock.activate();
    };

    Scene_Map.prototype.onDesignateChop = function() {
        $constructionManager.activeMode = "chop";
        SoundManager.playCursor();
        this._designationDock.activate();
    };

    Scene_Map.prototype.onDesignateStone = function() {
        $constructionManager.activeMode = "stone";
        SoundManager.playCursor();
        this._designationDock.activate();
    };

    Scene_Map.prototype.onDesignatePalisade = function() {
        $constructionManager.activeMode = "build_palisade";
        SoundManager.playCursor();
        this._designationDock.activate();
    };

    Scene_Map.prototype.onDesignateBed = function() {
        $constructionManager.activeMode = "build_bed";
        SoundManager.playCursor();
        this._designationDock.activate();
    };

    // Handle map clicks when in designation/construction mode
    const _Scene_Map_processMapTouch = Scene_Map.prototype.processMapTouch;
    Scene_Map.prototype.processMapTouch = function() {
        if ($constructionManager && $constructionManager.activeMode && TouchInput.isTriggered()) {
            const mx = $gameMap.canvasToMapX(TouchInput.x);
            const my = $gameMap.canvasToMapY(TouchInput.y);

            switch ($constructionManager.activeMode) {
                case "harvest":
                    $constructionManager.addGatherDesignation("harvest", mx, my);
                    break;
                case "chop":
                    $constructionManager.addGatherDesignation("chop", mx, my);
                    break;
                case "stone":
                    $constructionManager.addGatherDesignation("stone", mx, my);
                    break;
                case "build_palisade":
                    $constructionManager.addBlueprint("palisade", mx, my, { "Wood": 2 }, 80);
                    break;
                case "build_bed":
                    $constructionManager.addBlueprint("bed", mx, my, { "Wood": 2, "Leaves": 2 }, 60);
                    break;
            }
            return;
        }
        _Scene_Map_processMapTouch.call(this);
    };

    console.log("[UF] UF_Construction initialized: DF grid blueprint construction, gathering designations, and job dispatch active.");
})();

