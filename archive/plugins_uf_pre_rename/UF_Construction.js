//=============================================================================
// RPG Maker MZ - Project DEUS: Ludeon 4-Stage Construction & Blueprint Pipeline
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Construction] Ludeon-style 4-stage physical construction pipeline: Blueprint -> Material Delivery -> Frame -> Construction Labor.
 * @author Project DEUS Team
 * @base UF_World
 * @orderAfter UF_World
 * @orderAfter UF_Objects
 * @orderAfter UF_Items
 * @orderAfter UF_Jobs
 *
 * @help
 * ============================================================================
 * Project DEUS - Ludeon 4-Stage Construction Engine (UF_Construction)
 * ============================================================================
 * Implements the physical construction lifecycle inspired by RimWorld / Ludeon Studios:
 * 1. Blueprint: Ghost outline on tile; holds required material bills.
 * 2. Delivery: Haulers physically transport items from stockpiles to blueprint.
 * 3. Frame: Once 100% of materials are delivered, transforms into a construction frame.
 * 4. Construction: Builders apply physical labor progress (0% -> 100%) to assemble
 *    the final structure via UF.Objects.
 *
 * Zero instantaneous teleportation of materials (VISION V125).
 */

(() => {
    "use strict";

    const STAGE_BLUEPRINT = "blueprint";
    const STAGE_FRAME = "frame";
    const STAGE_COMPLETE = "complete";

    const World = () => (window.UF && UF.World) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;

    const emit = (name, ...args) => {
        if (window.UF && UF.Events && typeof UF.Events.emit === "function") {
            UF.Events.emit(name, ...args);
        }
    };

    function copyArea(a) {
        return a ? { x: a.x | 0, y: a.y | 0 } : { x: 0, y: 0 };
    }

    //-----------------------------------------------------------------------------
    // Construction Job Data Model
    //-----------------------------------------------------------------------------

    class ConstructionJob {
        constructor(id, type, x, y, requiredMaterials, buildTime, area = null, z = 0) {
            this.id = id;
            this.type = type; // objectId e.g. "wall_wood", "door_wood", "floor_straw"
            this.x = x | 0;
            this.y = y | 0;
            this.z = z | 0;
            this.area = copyArea(area);
            this.required = Object.assign({}, requiredMaterials || {});
            this.delivered = {};
            this.progress = 0;
            this.maxProgress = buildTime || 80;
            this.stage = STAGE_BLUEPRINT;
            this.completed = false;
            this.assignedColonistId = null;
        }

        isMaterialsSatisfied() {
            for (const mat of Object.keys(this.required)) {
                if ((this.delivered[mat] || 0) < (this.required[mat] || 0)) return false;
            }
            return true;
        }

        deliver(itemId, count = 1) {
            if (this.completed) return false;
            this.delivered[itemId] = (this.delivered[itemId] || 0) + count;
            if (this.stage === STAGE_BLUEPRINT && this.isMaterialsSatisfied()) {
                this.stage = STAGE_FRAME;
                emit("construction:frameReady", this);
            }
            return true;
        }

        work(amount = 1, worker = null) {
            if (this.completed || this.stage !== STAGE_FRAME) return false;
            this.progress += amount;
            if (this.progress >= this.maxProgress) {
                this.complete(worker);
                return true;
            }
            return false;
        }

        complete(worker = null) {
            if (this.completed) return;
            this.completed = true;
            this.stage = STAGE_COMPLETE;

            const O = Objects();
            if (O) {
                if (typeof O.setIn === "function") {
                    O.setIn({ x: (this.area && this.area.x) || 0, y: (this.area && this.area.y) || 0, z: this.z }, this.x, this.y, this.type);
                } else if (typeof O.set === "function") {
                    O.set(this.x, this.y, this.type);
                }
            }

            if (window.$ufVisuals && window.$ufVisuals.addBark && worker && worker.event) {
                window.$ufVisuals.addBark(worker.event, `Completed ${this.type}!`);
            }
            emit("construction:completed", this, worker);
        }
    }

    class GatheringDesignation {
        constructor(id, type, x, y, area = null, z = 0) {
            this.id = id;
            this.type = type; // "harvest", "chop", "stone", "mine"
            this.x = x | 0;
            this.y = y | 0;
            this.z = z | 0;
            this.area = copyArea(area);
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
            this.activeMode = null;
            this.nextId = 1;
        }

        addBlueprint(type, x, y, required = null, time = 80, area = null, z = 0) {
            const curArea = area || (World() && World().currentArea ? World().currentArea() : { x: 0, y: 0 });
            // Resolve materials from catalog if not provided
            let req = required;
            if (!req && Objects()) {
                const t = Objects().type(type);
                if (t && t.build && t.build.items) req = t.build.items;
                if (!time && t && t.build && t.build.work) time = t.build.work;
            }
            if (!req) req = { wood: 1 };

            // Check if existing uncompleted blueprint at position
            const existing = this.blueprints.find(b => !b.completed && b.x === x && b.y === y && (b.z || 0) === (z || 0) &&
                ((b.area && b.area.x) || 0) === curArea.x && ((b.area && b.area.y) || 0) === curArea.y);
            if (existing) return existing;

            const bp = new ConstructionJob(this.nextId++, type, x, y, req, time || 80, curArea, z);
            this.blueprints.push(bp);
            emit("construction:blueprintAdded", bp);
            return bp;
        }

        addGatherDesignation(type, x, y, area = null, z = 0) {
            const curArea = area || (World() && World().currentArea ? World().currentArea() : { x: 0, y: 0 });
            const existing = this.gatherDesignations.find(g => !g.completed && g.x === x && g.y === y && (g.z || 0) === (z || 0) &&
                ((g.area && g.area.x) || 0) === curArea.x && ((g.area && g.area.y) || 0) === curArea.y);
            if (existing) return existing;

            const gd = new GatheringDesignation(this.nextId++, type, x, y, curArea, z);
            this.gatherDesignations.push(gd);
            emit("construction:gatherDesignated", gd);
            return gd;
        }

        getBlueprint(id) {
            return this.blueprints.find(b => b.id === id) || null;
        }

        blueprintsAt(x, y, area = null, z = 0) {
            const curArea = area || (World() && World().currentArea ? World().currentArea() : null);
            return this.blueprints.filter(b => !b.completed && b.x === x && b.y === y && (b.z || 0) === (z || 0) &&
                (!curArea || (((b.area && b.area.x) || 0) === curArea.x && ((b.area && b.area.y) || 0) === curArea.y)));
        }

        deliverMaterial(blueprintId, itemId, count = 1) {
            const bp = this.getBlueprint(blueprintId);
            if (!bp) return false;
            return bp.deliver(itemId, count);
        }

        workFrame(blueprintId, amount = 1, worker = null) {
            const bp = this.getBlueprint(blueprintId);
            if (!bp) return false;
            return bp.work(amount, worker);
        }

        cancelBlueprint(blueprintId) {
            const bp = this.getBlueprint(blueprintId);
            if (!bp || bp.completed) return false;
            bp.completed = true;
            // Drop delivered materials back into world
            const I = Items();
            if (I && typeof I.drop === "function") {
                for (const [mat, cnt] of Object.entries(bp.delivered)) {
                    if (cnt > 0) {
                        I.drop({ area: bp.area, z: bp.z }, bp.x, bp.y, mat, cnt);
                    }
                }
            }
            emit("construction:blueprintCancelled", bp);
            return true;
        }

        allActiveBlueprints(area = null, z = 0) {
            const curArea = area || (World() && World().currentArea ? World().currentArea() : null);
            return this.blueprints.filter(b => !b.completed &&
                (!curArea || (((b.area && b.area.x) || 0) === curArea.x && ((b.area && b.area.y) || 0) === curArea.y)) &&
                ((b.z || 0) === (z || 0)));
        }

        clear() {
            this.blueprints = [];
            this.gatherDesignations = [];
        }
    }

    const instance = new ConstructionManager();
    window.$constructionManager = instance;

    window.UF = window.UF || {};
    window.UF.Construction = {
        STAGE_BLUEPRINT,
        STAGE_FRAME,
        STAGE_COMPLETE,
        manager: instance,
        addBlueprint: (type, x, y, req, time, area, z) => instance.addBlueprint(type, x, y, req, time, area, z),
        getBlueprint: id => instance.getBlueprint(id),
        blueprintsAt: (x, y, area, z) => instance.blueprintsAt(x, y, area, z),
        deliverMaterial: (id, item, count) => instance.deliverMaterial(id, item, count),
        workFrame: (id, amount, worker) => instance.workFrame(id, amount, worker),
        cancelBlueprint: id => instance.cancelBlueprint(id),
        allActive: (area, z) => instance.allActiveBlueprints(area, z)
    };

    console.log("[UF] UF_Construction initialized: Ludeon 4-stage construction pipeline active.");
})();
