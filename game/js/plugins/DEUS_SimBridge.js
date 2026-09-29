//=============================================================================
// DEUS_SimBridge.js - Project DEUS Simulation Engine Bridge (NAT.04.01)
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Connects pure simulation modules to the Project DEUS RPG Maker MZ runtime.
 * @author DEUS Engineering Team
 *
 * @help
 * DEUS_SimBridge bridges headless continuous physical simulation kernels (such as
 * Geomorphology & Soil Mechanics) into the DEUS RPG Maker MZ engine runtime.
 *
 * Authority: DEC-037, DEC-040, DEC-041, Lean Natural World v1.
 */

var Imported = Imported || {};
Imported.DEUS_SimBridge = true;

(function() {
    'use strict';

    const root = (typeof window !== "undefined") ? window : (typeof global !== "undefined" ? global : this);
    root.DEUS = root.DEUS || {};
    root.UF = root.UF || root.DEUS;

    const MUTANTS = {
        no_mirror: (typeof process !== "undefined" && process.env && process.env.MUTANT === "no_mirror") || false,
        tick_when_quiet: (typeof process !== "undefined" && process.env && process.env.MUTANT === "tick_when_quiet") || false,
        skip_provider: (typeof process !== "undefined" && process.env && process.env.MUTANT === "skip_provider") || false,
        save_without_engine: (typeof process !== "undefined" && process.env && process.env.MUTANT === "save_without_engine") || false,
        double_load: (typeof process !== "undefined" && process.env && process.env.MUTANT === "double_load") || false
    };

    /**
     * Attempts to dynamically load the soil simulation kernel.
     * Searches CommonJS require paths and global window bindings.
     */
    function loadSoilKernel() {
        if (typeof window !== "undefined" && window.DEUS && window.DEUS.Sim && window.DEUS.Sim.Soil) {
            return window.DEUS.Sim.Soil;
        }
        if (typeof window !== "undefined" && window.DEUS && window.DEUS.Soil) {
            return window.DEUS.Soil;
        }
        if (typeof require === "function") {
            const attempts = [
                "../sim/geomorphology/soil",
                "../../sim/geomorphology/soil",
                "./game/js/sim/geomorphology/soil",
                "../game/js/sim/geomorphology/soil"
            ];
            try {
                if (typeof __dirname !== "undefined") {
                    const path = require("path");
                    attempts.push(path.join(__dirname, "..", "sim", "geomorphology", "soil.js"));
                    attempts.push(path.join(__dirname, "..", "..", "sim", "geomorphology", "soil.js"));
                }
                if (typeof process !== "undefined" && process.cwd) {
                    const path = require("path");
                    attempts.push(path.join(process.cwd(), "game", "js", "sim", "geomorphology", "soil.js"));
                }
            } catch (_) {}

            for (let i = 0; i < attempts.length; i++) {
                try {
                    const mod = require(attempts[i]);
                    if (mod && mod.GeomorphologyEngine) return mod;
                } catch (_) {}
            }
        }
        return null;
    }

    const sim = loadSoilKernel();

    // Map of areaKey ("ax,ay") -> GeomorphologyEngine
    const engines = new Map();
    const fedAreas = new Set();
    let tickCount = 0;
    let lastCascadeEvent = null;
    let frameCounter = 0;

    function getAreaKey(area) {
        if (!area) return "0,0";
        return `${area.x | 0},${area.y | 0}`;
    }

    function createEngineForArea(areaKey) {
        if (!sim) return null;
        const eng = new sim.GeomorphologyEngine();

        // Connect groundElevationProvider to DEUS_Levels
        // Returns kernel datum elevation in feet, or null when ground is unknown/no solid floor.
        if (!MUTANTS.skip_provider) {
            eng.groundElevationProvider = (x, y) => {
                const Levels = root.UF && root.UF.Levels;
                if (!Levels) return null;
                const parts = areaKey.split(",").map(Number);
                const area = { x: parts[0], y: parts[1] };

                // Primary elevation query: worldStrataElevationAt returns top of solid base index (0..159)
                if (typeof Levels.worldStrataElevationAt === "function") {
                    const e = Levels.worldStrataElevationAt(area, x, y, 0);
                    if (Number.isFinite(e) && e >= 0) {
                        let zMin = -16;
                        if (Levels.zMin !== undefined) {
                            zMin = Levels.zMin;
                        } else if (Levels.ZR && Levels.ZR.zMin !== undefined) {
                            zMin = Levels.ZR.zMin;
                        } else if (root.UF && root.UF.World && root.UF.World.state && root.UF.World.state.zMin !== undefined) {
                            zMin = root.UF.World.state.zMin;
                        }

                        // e = (z - zMin) * 5 + stratum
                        const stratum = ((e % 5) + 5) % 5;
                        const z = Math.floor(e / 5) + zMin;
                        // Kernel datum elevation (in feet above bottom of Z = -16):
                        return ((z + 16) * 5 + stratum + 1) * 2;
                    }
                    return null;
                }

                // Fallback: surfaceHeightAt returns stratum 0..4 on Z=0
                if (typeof Levels.surfaceHeightAt === "function") {
                    const h = Levels.surfaceHeightAt(area, x, y, 0);
                    if (Number.isFinite(h) && h >= 0) {
                        // Z=0 bottom is 160 ft; top of stratum h is 160 + (h + 1) * 2 ft
                        return 160 + (h + 1) * 2;
                    }
                    return null;
                }

                return null;
            };
        }

        return eng;
    }

    function getTickFrames() {
        const cat = (typeof $ufWorldCatalog !== "undefined" && $ufWorldCatalog)
            ? $ufWorldCatalog
            : (root.UF && root.UF.Catalog);
        if (cat && cat.soil && typeof cat.soil.tickFrames === "number") {
            return cat.soil.tickFrames;
        }
        return 10; // Default 10 frames per spec
    }

    const SimBridge = {
        sim,
        MUTANTS,

        getEngine(area = null) {
            const key = getAreaKey(area);
            if (!engines.has(key)) {
                engines.set(key, createEngineForArea(key));
            }
            return engines.get(key);
        },

        resetEngines() {
            engines.clear();
            fedAreas.clear();
            tickCount = 0;
            lastCascadeEvent = null;
        },

        getTickCount() {
            return tickCount;
        },

        getLastCascadeEvent() {
            return lastCascadeEvent;
        },

        /**
         * Feeds DEUS_Levels strata into the area's GeomorphologyEngine.
         * Ingests soil and loose strata only; stone, air, wood, water, lava stay out.
         * A solid rock lid above soil prevents that soil from being treated as the surface or shedding.
         */
        feedColumnFromLevels(area, x, y, z = 0, options = {}) {
            if (!sim) return [];
            const Levels = root.UF && root.UF.Levels;
            if (!Levels || typeof Levels.strataAt !== "function") return [];

            const cellStrata = Levels.strataAt({ area, x, y, z });
            if (!cellStrata || !cellStrata.materials) return [];

            const eng = this.getEngine(area);
            const added = [];

            // Find world's highest solid stratum
            let worldTopSolidS = -1;
            for (let s = 4; s >= 0; s--) {
                const mat = cellStrata.materials[s];
                if (mat && mat !== "air" && mat !== "water" && mat !== "lava") {
                    worldTopSolidS = s;
                    break;
                }
            }

            for (let s = 0; s < 5; s++) {
                const mat = cellStrata.materials[s];
                // Ingest soil and loose strata ONLY. Exclude stone, air, wood, water, lava.
                if (mat === "soil" || mat === "sand" || mat === "gravel" || mat === "rubble" || mat === "regolith") {
                    const hasRockLidAbove = (worldTopSolidS > s && (
                        cellStrata.materials[worldTopSolidS] === "stone" ||
                        cellStrata.materials[worldTopSolidS] === "granite" ||
                        cellStrata.materials[worldTopSolidS] === "basalt" ||
                        cellStrata.materials[worldTopSolidS] === "diorite" ||
                        cellStrata.materials[worldTopSolidS] === "andesite" ||
                        cellStrata.materials[worldTopSolidS] === "obsidian" ||
                        cellStrata.materials[worldTopSolidS] === "wood"
                    ));

                    const isSurface = (s === worldTopSolidS);
                    let horizon = "C", bulkDensity = 6000, porosity = 3000, fieldCapacity = 2500;
                    let sand = 6000, silt = 2500, clay = 1500, organic = 0;
                    let loose = false, angle = 34;

                    if (mat === "soil") {
                        if (isSurface && !hasRockLidAbove) {
                            // Surface soil: Horizon O/A per HORIZON_SPECS['O/A']
                            horizon = "O/A"; sand = 4000; silt = 3000; clay = 1000; organic = 2000;
                            bulkDensity = 3750; porosity = 4500; fieldCapacity = 3500;
                            loose = Boolean(options.loose || cellStrata.constructed[s] === false && options.surfaceLoose);
                        } else {
                            // Buried soil (or soil under rock lid): Horizon B per HORIZON_SPECS.B
                            horizon = "B"; sand = 3000; silt = 4000; clay = 2500; organic = 500;
                            bulkDensity = 4750; porosity = 3800; fieldCapacity = 4000;
                            loose = Boolean(options.loose && !hasRockLidAbove);
                        }
                    } else {
                        // Loose material: sand, gravel, rubble, regolith -> Horizon C
                        horizon = "C"; sand = 6000; silt = 2500; clay = 1500; organic = 0;
                        bulkDensity = 6000; porosity = 3000; fieldCapacity = 2500;
                        loose = !hasRockLidAbove;
                    }

                    if (options.forceLoose && !hasRockLidAbove) loose = true;

                    const stratum = new sim.SoilStratum(
                        x, y, z, s,
                        horizon, sand, silt, clay, organic,
                        bulkDensity, porosity, fieldCapacity,
                        0, loose, angle
                    );

                    stratum.material = mat;

                    if (loose) {
                        stratum.looseMassCp = stratum.solidMassCp;
                        stratum.solidMassCp = 0;
                    }

                    eng.addStratum(stratum);
                    added.push(stratum);
                }
            }

            return added;
        },

        feedAreaFromLevels(area) {
            if (!sim) return 0;
            const W = root.UF && root.UF.World;
            const Levels = root.UF && root.UF.Levels;
            if (!Levels || typeof Levels.strataAt !== "function") return 0;

            const areaKey = getAreaKey(area);
            if (fedAreas.has(areaKey)) return 0;

            let width = 64, height = 64;
            if (typeof $dataMap !== "undefined" && $dataMap && $dataMap.width) {
                width = $dataMap.width;
                height = $dataMap.height;
            } else if (W && W.activeRegion) {
                width = W.activeRegion.width || 64;
                height = W.activeRegion.height || 64;
            }

            let fedCount = 0;
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    const added = this.feedColumnFromLevels(area, x, y, 0);
                    if (added && added.length > 0) fedCount++;
                }
            }
            fedAreas.add(areaKey);
            return fedCount;
        },

        /**
         * Advances slope stability and hydrology for the area's GeomorphologyEngine.
         * Executes only while dirty queues are non-empty, conserving CPU when quiescent.
         */
        tickArea(area = null, ledger = null) {
            const eng = this.getEngine(area);
            if (!eng) return false;

            // Quiescent check: do not tick if dirty queues are empty (unless mutant forces it)
            const isDirty = (eng.dirtySlope && eng.dirtySlope.size > 0) || (eng.dirtyMoisture && eng.dirtyMoisture.size > 0);
            if (!isDirty && !MUTANTS.tick_when_quiet) {
                return false;
            }

            tickCount++;

            // Snapshot loose mass of all strata before tick
            const preLooseMap = new Map();
            for (const [id, st] of eng.strata.entries()) {
                preLooseMap.set(id, st.looseMassCp);
            }
            const preTotalMass = eng.getTotalMass().total;
            const preSedimentTransfers = eng.stats.sedimentTransfers || 0;

            // 1. Moisture percolation tick
            if (eng.dirtyMoisture && eng.dirtyMoisture.size > 0) {
                if (typeof eng.processMoistureTick === "function") {
                    eng.processMoistureTick(1, ledger);
                }
            }

            // 2. Slope stability & cascade tick
            eng.processSlopeStability(1, ledger);
            const postTotalMass = eng.getTotalMass().total;

            console.debug(`[DEUS_SimBridge] Mass tick ${tickCount}: before=${preTotalMass} cp, after=${postTotalMass} cp, delta=${postTotalMass - preTotalMass}`);
            if (preTotalMass !== postTotalMass) {
                console.error(`[DEUS_SimBridge] Mass conservation violated: ${preTotalMass} -> ${postTotalMass}`);
            }

            // 3. Mirror results into DEUS_Levels if loose mass relocated
            if (eng.stats.sedimentTransfers > preSedimentTransfers && !MUTANTS.no_mirror) {
                const Levels = root.UF && root.UF.Levels;
                if (Levels && typeof Levels.setStratumMaterial === "function") {
                    let sourceStratum = null;
                    let targetStratum = null;
                    let deltaCp = 0;

                    for (const [id, st] of eng.strata.entries()) {
                        const prev = preLooseMap.get(id) || 0;
                        if (st.looseMassCp < prev) {
                            sourceStratum = st;
                            deltaCp = prev - st.looseMassCp;
                        } else if (st.looseMassCp > prev) {
                            targetStratum = st;
                        }
                    }

                    if (sourceStratum && targetStratum) {
                        const movingMat = sourceStratum.material || "soil";
                        targetStratum.material = movingMat;

                        // Target stratum receives loose sediment with the actual material that moved
                        Levels.setStratumMaterial({ area, x: targetStratum.x, y: targetStratum.y, z: targetStratum.z }, targetStratum.s, movingMat);

                        // Source stratum loose stratum lowered in the same tick
                        Levels.setStratumMaterial({ area, x: sourceStratum.x, y: sourceStratum.y, z: sourceStratum.z }, sourceStratum.s, "air");

                        lastCascadeEvent = {
                            x: sourceStratum.x,
                            y: sourceStratum.y,
                            z: sourceStratum.z,
                            s: sourceStratum.s,
                            massCp: deltaCp,
                            toX: targetStratum.x,
                            toY: targetStratum.y
                        };

                        if (root.UF && root.UF.Events && typeof root.UF.Events.emit === "function") {
                            root.UF.Events.emit("soil:cascade", lastCascadeEvent);
                        }
                    } else {
                        // Fallback per-stratum mirror
                        for (const [id, st] of eng.strata.entries()) {
                            const prev = preLooseMap.get(id) || 0;
                            if (st.looseMassCp > prev) {
                                Levels.setStratumMaterial({ area, x: st.x, y: st.y, z: st.z }, st.s, st.material || "soil");
                            } else if (st.looseMassCp < prev) {
                                Levels.setStratumMaterial({ area, x: st.x, y: st.y, z: st.z }, st.s, "air");
                            }
                        }
                    }
                }
            }

            return true;
        },

        markDirty(x, y, z = 0, s = 0, area = null) {
            const eng = this.getEngine(area);
            if (eng) {
                eng.markDirty(x, y, z, s);
            }
        },

        serialize() {
            if (MUTANTS.save_without_engine) return {};
            const out = {
                lastCascadeEvent: lastCascadeEvent ? Object.assign({}, lastCascadeEvent) : null,
                areas: {}
            };
            for (const [key, eng] of engines.entries()) {
                if (eng && typeof eng.serialize === "function") {
                    out.areas[key] = eng.serialize();
                }
            }
            return out;
        },

        deserialize(data) {
            engines.clear();
            fedAreas.clear();
            if (!data || typeof data !== "object") return;
            if (data.lastCascadeEvent !== undefined) {
                lastCascadeEvent = data.lastCascadeEvent;
            }
            const areaMap = data.areas || data;
            for (const key in areaMap) {
                if (areaMap.hasOwnProperty(key) && key !== "lastCascadeEvent") {
                    const eng = createEngineForArea(key);
                    if (eng && typeof eng.deserialize === "function") {
                        eng.deserialize(areaMap[key]);
                        engines.set(key, eng);
                        fedAreas.add(key);
                    }
                }
            }
        },

        saveToWorldState() {
            const W = root.UF && root.UF.World;
            if (W && W.state) {
                W.state.soil = this.serialize();
                W.state.soilSchemaVersion = 1;
            }
        },

        loadFromWorldState() {
            const W = root.UF && root.UF.World;
            if (W && W.state && W.state.soil) {
                this.deserialize(W.state.soil);
            }
        },

        getSoilInfo(x, y, z = 0, area = null) {
            const eng = this.getEngine(area);
            if (!eng) return null;
            const top = eng.getHighestStratumAt(x, y);
            if (!top) return null;

            return {
                horizon: top.horizon,
                moistureBp: top.waterMassCp,
                looseMassCp: top.looseMassCp,
                solidMassCp: top.solidMassCp,
                slopeStatus: (lastCascadeEvent && (lastCascadeEvent.toX === x && lastCascadeEvent.toY === y || lastCascadeEvent.x === x && lastCascadeEvent.y === y))
                    ? "Active"
                    : "Stable"
            };
        }
    };

    function decorateSoilLines(lines, x, y) {
        if (!Array.isArray(lines)) return lines;
        const W = root.UF && root.UF.World;
        const area = W && (typeof W.viewLevel === "function" ? W.viewLevel() : (typeof W.currentArea === "function" ? W.currentArea() : null));
        const soil = SimBridge.getSoilInfo(x, y, 0, area);
        if (!soil) return lines;

        const out = lines.slice();
        let cascadeStr = "";
        if (lastCascadeEvent && lastCascadeEvent.toX === x && lastCascadeEvent.toY === y) {
            cascadeStr = ` · Last Cascade: +${lastCascadeEvent.massCp}cp from (${lastCascadeEvent.x},${lastCascadeEvent.y})`;
        } else if (lastCascadeEvent && lastCascadeEvent.x === x && lastCascadeEvent.y === y) {
            cascadeStr = ` · Last Cascade: -${lastCascadeEvent.massCp}cp to (${lastCascadeEvent.toX},${lastCascadeEvent.toY})`;
        }
        const soilLine = `Soil: ${soil.horizon} · Moist: ${soil.moistureBp}bp · Loose: ${soil.looseMassCp}cp · Solid: ${soil.solidMassCp}cp · Slope: ${soil.slopeStatus}${cascadeStr}`;
        out.push(soilLine);
        return out;
    }

    // Hook game events
    if (root.UF && root.UF.Events && typeof root.UF.Events.on === "function") {
        // Hook interact:dug
        root.UF.Events.on("interact:dug", (area, x, y, kindId) => {
            const eng = SimBridge.getEngine(area);
            if (eng) {
                let top = eng.getHighestStratumAt(x, y);
                if (!top) {
                    SimBridge.feedColumnFromLevels(area, x, y, 0);
                    top = eng.getHighestStratumAt(x, y);
                }
                if (top) {
                    if (!top.loose && top.solidMassCp > 0) {
                        top.loose = true;
                        top.looseMassCp = top.solidMassCp;
                        top.solidMassCp = 0;
                    }
                    eng.markDirty(x, y, top.z, top.s);
                } else {
                    eng.markDirty(x, y, 0, 0);
                }
            }
        });

        // Hook levels:strataDestroyed - supports both single object {area, x, y, z, stratum} and array
        root.UF.Events.on("levels:strataDestroyed", (eventOrArray, areaArg) => {
            if (Array.isArray(eventOrArray)) {
                for (const d of eventOrArray) {
                    SimBridge.feedColumnFromLevels(d.area || areaArg, d.x, d.y, d.z);
                    SimBridge.markDirty(d.x, d.y, d.z, d.stratum, d.area || areaArg);
                }
            } else if (eventOrArray && typeof eventOrArray === "object") {
                const e = eventOrArray;
                SimBridge.feedColumnFromLevels(e.area || areaArg, e.x, e.y, e.z);
                SimBridge.markDirty(e.x, e.y, e.z, e.stratum, e.area || areaArg);
            }
        });

        // Hook world:levelTileChanged
        root.UF.Events.on("world:levelTileChanged", (area, x, y, layer, tileId) => {
            SimBridge.feedColumnFromLevels(area, x, y, 0);
            SimBridge.markDirty(x, y, 0, 0, area);
        });

        // Hook world:created and world:areaLoaded
        root.UF.Events.on("world:created", (area) => {
            SimBridge.feedAreaFromLevels(area);
        });
        root.UF.Events.on("world:areaLoaded", (area) => {
            SimBridge.feedAreaFromLevels(area);
        });
    }

    // UF.Look Integration: hook describeCell, inspect, and cellAt
    if (root.UF && root.UF.Look) {
        const L = root.UF.Look;
        if (typeof L.describeCell === "function") {
            const _origDescribe = L.describeCell;
            L.describeCell = function(x, y) {
                return decorateSoilLines(_origDescribe.call(this, x, y), x, y);
            };
        }
        if (typeof L.inspect === "function") {
            const _origInspect = L.inspect;
            L.inspect = function(x, y) {
                const info = _origInspect.call(this, x, y);
                if (!info) return info;
                const lines = decorateSoilLines(info.lines || [], x, y);
                return Object.assign({}, info, { lines });
            };
        }
        if (typeof L.cellAt === "function") {
            const _origCellAt = L.cellAt;
            L.cellAt = function(x, y) {
                const cell = _origCellAt.call(this, x, y);
                if (cell) {
                    const W = root.UF && root.UF.World;
                    const area = W && (typeof W.viewLevel === "function" ? W.viewLevel() : (typeof W.currentArea === "function" ? W.currentArea() : null));
                    const soil = SimBridge.getSoilInfo(x, y, 0, area);
                    if (soil) {
                        const soilPart = `Soil: ${soil.horizon} · Moist: ${soil.moistureBp}bp · Loose: ${soil.looseMassCp}cp · Solid: ${soil.solidMassCp}cp · Slope: ${soil.slopeStatus}`;
                        cell.text = cell.text ? `${cell.text} · ${soilPart}` : soilPart;
                        cell.soil = soil;
                    }
                }
                return cell;
            };
        }
    }

    // DataManager Save/Load Persistence Hooks
    if (typeof DataManager !== "undefined") {
        if (typeof DataManager.makeSaveContents === "function") {
            const _orig_makeSaveContents = DataManager.makeSaveContents;
            DataManager.makeSaveContents = function() {
                const contents = _orig_makeSaveContents.call(this);
                SimBridge.saveToWorldState();
                return contents;
            };
        }
        if (typeof DataManager.extractSaveContents === "function") {
            const _orig_extractSaveContents = DataManager.extractSaveContents;
            DataManager.extractSaveContents = function(contents) {
                _orig_extractSaveContents.call(this, contents);
                SimBridge.loadFromWorldState();
            };
        }
    }

    // Scene_Map Frame Ticking Hook
    if (typeof Scene_Map !== "undefined" && Scene_Map.prototype) {
        const _Scene_Map_update = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            _Scene_Map_update.call(this);
            frameCounter++;
            const interval = getTickFrames();
            if (frameCounter % interval === 0) {
                const W = root.UF && root.UF.World;
                const area = W && typeof W.currentArea === "function" ? W.currentArea() : null;
                if (area) {
                    // Feed area if not yet fed
                    SimBridge.feedAreaFromLevels(area);
                    SimBridge.tickArea(area);
                }
            }
        };
    }

    root.DEUS.SimBridge = SimBridge;
    root.UF.SimBridge = SimBridge;
    root.DEUS.SoilBridge = SimBridge;
    root.UF.SoilBridge = SimBridge;

    if (typeof global !== "undefined" && global !== root) {
        global.DEUS = global.DEUS || root.DEUS;
        global.UF = global.UF || root.UF;
        global.DEUS.SimBridge = SimBridge;
        global.UF.SimBridge = SimBridge;
        global.DEUS.SoilBridge = SimBridge;
        global.UF.SoilBridge = SimBridge;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = SimBridge;
    }
})();
