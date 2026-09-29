//=============================================================================
// DEUS_SimBridge.js - Soil Engine Bridge & Geomorphology Coupling
// Project DEUS - NAT.04.01 (lane-cf)
// Authority: DEC-037, DEC-038, DEC-039, DEC-040, DEC-041
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Sim Bridge] Bridges Lean Geomorphology & Soil simulation kernel with DEUS_Levels strata, slope cascades, and closed-mass persistence.
 * @author DEUS Project
 * @base DEUS_Levels
 * @orderAfter DEUS_Levels
 * @orderAfter DEUS_Tiles
 * @orderAfter DEUS_Fluid
 *
 * @help
 * DEUS_SimBridge binds the headless Geomorphology & Soil simulation kernel
 * (game/js/sim/geomorphology/soil.js) with the RPG Maker MZ engine and DEUS_Levels.
 *
 * Capabilities:
 * 1. Area Engine Management: Owns one GeomorphologyEngine per loaded world area.
 * 2. Stratum Feeding: Feeds soil and loose strata from DEUS_Levels into GeomorphologyEngine.
 * 3. Quiescent Action Ticking: Ticks only when dirty under domain: "action" (no full map scan).
 * 4. Mirroring: Mirrors slope-cascade loose sediment transfers back into DEUS_Levels.
 * 5. Closed-Mass Conservation: Zero loss across all transitions (DEC-040).
 * 6. Save/Load Persistence: Serializes area engines into World.state.soil (soilSchemaVersion: 1).
 * 7. UF.Look Integration: Displays soil horizon, moisture, mass and slope stability.
 */

var Imported = Imported || {};
Imported.DEUS_SimBridge = true;

(() => {
    "use strict";

    const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this);
    root.DEUS = root.DEUS || {};
    root.UF = root.UF || root.DEUS;

    // Mutants for lane-cf gate test sweep
    const MUTANTS = {
        no_mirror: false,
        tick_when_quiet: false,
        skip_provider: false,
        save_without_engine: false,
        double_load: false
    };

    if (typeof process !== "undefined" && process.env && process.env.MUTANT) {
        if (MUTANTS[process.env.MUTANT] !== undefined) {
            MUTANTS[process.env.MUTANT] = true;
        }
    }
    if (typeof process !== "undefined" && process.argv) {
        for (const arg of process.argv) {
            if (arg.startsWith("--mutant=")) {
                const m = arg.split("=")[1];
                if (MUTANTS[m] !== undefined) MUTANTS[m] = true;
            }
        }
    }

    function loadSoilKernel() {
        if (root.DEUS && root.DEUS.Sim && root.DEUS.Sim.Soil) {
            return root.DEUS.Sim.Soil;
        }
        if (typeof require === "function") {
            const attempts = [
                "../sim/geomorphology/index.js",
                "../sim/geomorphology/soil.js"
            ];
            try {
                const path = require("path");
                if (typeof __dirname !== "undefined") {
                    attempts.unshift(path.join(__dirname, "..", "sim", "geomorphology", "index.js"));
                    attempts.unshift(path.join(__dirname, "..", "sim", "geomorphology", "soil.js"));
                }
                if (typeof process !== "undefined" && process.cwd) {
                    attempts.push(path.join(process.cwd(), "game", "js", "sim", "geomorphology", "index.js"));
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

        // Connect groundElevationProvider to DEUS_Levels (Grok Resubmission Item 3)
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
                        // Top of stratum e in feet above bottom of Z = -16: (e + 1) * 2 ft
                        return (e + 1) * 2;
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
        const cat = root.$ufWorldCatalog || (root.UF && root.UF.WorldCatalog);
        if (cat && cat.soil && Number.isInteger(cat.soil.tickFrames) && cat.soil.tickFrames > 0) {
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
         * Ingests soil and loose strata only; stone, air, wood, water, lava stay out. (Grok Resubmission Item 2)
         */
        feedColumnFromLevels(area, x, y, z = 0, options = {}) {
            if (!sim) return [];
            const Levels = root.UF && root.UF.Levels;
            if (!Levels || typeof Levels.strataAt !== "function") return [];

            const cellStrata = Levels.strataAt({ area, x, y, z });
            if (!cellStrata || !cellStrata.materials) return [];

            const eng = this.getEngine(area);
            const added = [];

            // Find top solid stratum
            let topS = -1;
            for (let s = 4; s >= 0; s--) {
                const mat = cellStrata.materials[s];
                if (mat === "soil" || mat === "sand" || mat === "gravel" || mat === "rubble" || mat === "regolith") {
                    topS = s;
                    break;
                }
            }

            for (let s = 0; s < 5; s++) {
                const mat = cellStrata.materials[s];
                // Ingest soil and loose strata ONLY. Exclude stone, air, wood, water, lava.
                if (mat === "soil" || mat === "sand" || mat === "gravel" || mat === "rubble" || mat === "regolith") {
                    const isSurface = (s === topS);
                    let horizon = "C", bulkDensity = 6000, porosity = 3000, fieldCapacity = 2500;
                    let sand = 6000, silt = 2500, clay = 1500, organic = 0;
                    let loose = false, angle = 34;

                    if (mat === "soil") {
                        if (isSurface) {
                            // Surface soil: Horizon O/A per HORIZON_SPECS['O/A']
                            horizon = "O/A"; sand = 4000; silt = 3000; clay = 1000; organic = 2000;
                            bulkDensity = 3750; porosity = 4500; fieldCapacity = 3500;
                            loose = Boolean(options.loose || cellStrata.constructed[s] === false && options.surfaceLoose);
                        } else {
                            // Buried soil: Horizon B per HORIZON_SPECS.B
                            horizon = "B"; sand = 3000; silt = 4000; clay = 2500; organic = 500;
                            bulkDensity = 4750; porosity = 3800; fieldCapacity = 4000;
                            loose = Boolean(options.loose);
                        }
                    } else {
                        // Loose material: sand, gravel, rubble, regolith -> Horizon C with loose: true
                        horizon = "C"; sand = 6000; silt = 2500; clay = 1500; organic = 0;
                        bulkDensity = 6000; porosity = 3000; fieldCapacity = 2500;
                        loose = true;
                    }

                    if (options.forceLoose) loose = true;

                    const stratum = new sim.SoilStratum(
                        x, y, z, s,
                        horizon, sand, silt, clay, organic,
                        bulkDensity, porosity, fieldCapacity,
                        0, loose, angle
                    );

                    // For loose strata, physical mass is loose mass that can slide (Grok D1)
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

        /**
         * Advances simulation tick for an area under domain: "action".
         * Returns true if work was done, false if area was quiet.
         */
        tickArea(area = null, ledger = null) {
            const eng = this.getEngine(area);
            if (!eng) return false;

            const isDirty = eng.dirtyMoisture.size > 0 || eng.dirtySlope.size > 0;
            if (!isDirty && !MUTANTS.tick_when_quiet) {
                return false;
            }

            tickCount++;

            // Snapshot mass and transfer counts before tick (Grok Resubmission Item 6 & 7)
            const preTotalMass = eng.getTotalMass().total;
            const preSedimentTransfers = eng.stats.sedimentTransfers;
            const preWaterTransfers = eng.stats.waterTransfers;

            const preLooseMap = new Map();
            for (const [id, st] of eng.strata.entries()) {
                if (st.looseMassCp > 0) preLooseMap.set(id, st.looseMassCp);
            }

            // 1. Moisture tick
            eng.processMoistureTick(1);

            if (eng.stats.waterTransfers > preWaterTransfers) {
                if (root.UF && root.UF.Events && typeof root.UF.Events.emit === "function") {
                    root.UF.Events.emit("soil:moisture", {
                        area,
                        transfers: eng.stats.waterTransfers - preWaterTransfers
                    });
                }
            }

            // 2. Slope stability & cascade tick (returns void, so we detect transfers via stats)
            eng.processSlopeStability(1, ledger);
            const postTotalMass = eng.getTotalMass().total;

            // Log total mass before and after tick at debug level (Grok Resubmission Item 7)
            console.debug(`[DEUS_SimBridge] Mass tick ${tickCount}: before=${preTotalMass} cp, after=${postTotalMass} cp, delta=${postTotalMass - preTotalMass}`);
            if (preTotalMass !== postTotalMass) {
                console.error(`[DEUS_SimBridge] Mass conservation violated: ${preTotalMass} -> ${postTotalMass}`);
            }

            // 3. Mirror results into DEUS_Levels if loose mass relocated (Grok Resubmission Item 6)
            if (eng.stats.sedimentTransfers > preSedimentTransfers && !MUTANTS.no_mirror) {
                const Levels = root.UF && root.UF.Levels;
                if (Levels && typeof Levels.setStratumMaterial === "function") {
                    for (const [id, st] of eng.strata.entries()) {
                        const prev = preLooseMap.get(id) || 0;
                        if (st.looseMassCp > prev) {
                            // Target stratum received loose sediment -> update to soil in DEUS_Levels
                            Levels.setStratumMaterial({ area, x: st.x, y: st.y, z: st.z }, st.s, "soil");
                            lastCascadeEvent = {
                                x: st.x,
                                y: st.y,
                                z: st.z,
                                s: st.s,
                                massCp: st.looseMassCp - prev,
                                toX: st.x,
                                toY: st.y
                            };
                            if (root.UF && root.UF.Events && typeof root.UF.Events.emit === "function") {
                                root.UF.Events.emit("soil:cascade", lastCascadeEvent);
                            }
                        } else if (prev > 0 && st.looseMassCp === 0 && st.solidMassCp === 0) {
                            // Source stratum was completely emptied -> clear to air in DEUS_Levels
                            Levels.setStratumMaterial({ area, x: st.x, y: st.y, z: st.z }, st.s, "air");
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

        /**
         * Serializes all area simulation engines for save persistence.
         */
        serialize() {
            if (MUTANTS.save_without_engine) return {};
            const out = {};
            for (const [key, eng] of engines.entries()) {
                if (eng && typeof eng.serialize === "function") {
                    out[key] = eng.serialize();
                }
            }
            return out;
        },

        /**
         * Deserializes saved simulation engines from save data.
         */
        deserialize(data) {
            engines.clear();
            if (!data || !sim) return;
            for (const [key, engData] of Object.entries(data)) {
                if (engData) {
                    const eng = new sim.GeomorphologyEngine();
                    eng.deserialize(typeof engData === "string" ? engData : JSON.stringify(engData));
                    if (!MUTANTS.skip_provider) {
                        eng.groundElevationProvider = (x, y) => {
                            const Levels = root.UF && root.UF.Levels;
                            if (!Levels) return null;
                            const parts = key.split(",").map(Number);
                            const area = { x: parts[0], y: parts[1] };
                            if (typeof Levels.worldStrataElevationAt === "function") {
                                const e = Levels.worldStrataElevationAt(area, x, y, 0);
                                if (Number.isFinite(e) && e >= 0) return (e + 1) * 2;
                                return null;
                            }
                            if (typeof Levels.surfaceHeightAt === "function") {
                                const h = Levels.surfaceHeightAt(area, x, y, 0);
                                if (Number.isFinite(h) && h >= 0) return 160 + (h + 1) * 2;
                                return null;
                            }
                            return null;
                        };
                    }
                    engines.set(key, eng);
                }
            }
        },

        /**
         * Save bridge state to World.state.soil (Grok Resubmission Item 8)
         */
        saveToWorldState() {
            const W = root.UF && root.UF.World;
            if (W && W.state) {
                W.state.soil = this.serialize();
                W.state.soilSchemaVersion = 1;
            }
        },

        /**
         * Load bridge state from World.state.soil
         */
        loadFromWorldState() {
            const W = root.UF && root.UF.World;
            if (W && W.state && W.state.soil) {
                this.deserialize(W.state.soil);
            }
        },

        /**
         * Observability for UF.Look. (Grok Resubmission Item 9)
         */
        getSoilInfo(x, y, z = 0, area = null) {
            const eng = this.getEngine(area);
            if (!eng) return null;
            const top = eng.getHighestStratumAt(x, y);
            if (!top) return null;
            const cascade = this.getLastCascadeEvent();
            const isActive = (cascade && cascade.toX === x && cascade.toY === y);
            return {
                kind: top.horizon === "C" ? "gravel/sand" : "soil",
                horizon: top.horizon,
                moistureBp: top.moisture,
                bulkDensity: top.bulkDensity,
                looseMassCp: top.looseMassCp,
                solidMassCp: top.solidMassCp,
                totalWaterCp: top.waterMassCp,
                slopeStatus: isActive ? "Active" : "Stable"
            };
        }
    };

    // Event hooks (Grok Resubmission Item 5)
    if (root.UF && root.UF.Events && typeof root.UF.Events.on === "function") {
        // Hook interact:dug (area, x, y, kindId) emitted by DEUS_Interact.js line 262
        root.UF.Events.on("interact:dug", (area, x, y, kindId) => {
            if (typeof x === "number" && typeof y === "number") {
                const eng = SimBridge.getEngine(area);
                if (eng) {
                    const top = eng.getHighestStratumAt(x, y);
                    if (top) {
                        // Digging loosens topsoil into loose sediment that can slide
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
            }
        });

        // Hook levels:strataDestroyed (destroyed, area) emitted by DEUS_Levels.js line 2049
        root.UF.Events.on("levels:strataDestroyed", (destroyed, area) => {
            if (Array.isArray(destroyed)) {
                for (const d of destroyed) {
                    SimBridge.markDirty(d.x, d.y, d.z, d.stratum, area);
                }
            }
        });

        // Hook world:levelTileChanged (area, x, y, layer, tileId)
        root.UF.Events.on("world:levelTileChanged", (area, x, y, layer, tileId) => {
            SimBridge.markDirty(x, y, 0, 0, area);
        });
    }

    // UF.Look Integration: hook cellAt to display soil telemetry (Grok Resubmission Item 9)
    if (root.UF && root.UF.Look && typeof root.UF.Look.cellAt === "function") {
        const _origCellAt = root.UF.Look.cellAt;
        root.UF.Look.cellAt = function(x, y) {
            const cell = _origCellAt.call(this, x, y);
            if (cell) {
                const W = root.UF.World;
                const area = W && typeof W.currentArea === "function" ? W.currentArea() : null;
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

    // DataManager Save/Load Persistence Hooks (Grok Resubmission Item 8)
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

    // Scene_Map Frame Ticking Hook (Grok Resubmission Item 4)
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
