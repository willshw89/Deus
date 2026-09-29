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
 * 2. Stratum Feeding: Constructs SoilStratum instances from DEUS_Levels 2-ft strata.
 * 3. Quiescent Action Ticking: Ticks only when dirty under domain: "action".
 * 4. Mirroring: Mirrors slope-cascade loose sediment transfers back into DEUS_Levels.
 * 5. Closed-Mass Conservation: Zero loss across all transitions (DEC-040).
 * 6. Save/Load Persistence: Serializes area engines into World.state.soil.
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

    function getAreaKey(area) {
        if (!area) return "0,0";
        return `${area.x | 0},${area.y | 0}`;
    }

    function createEngineForArea(areaKey) {
        if (!sim) return null;
        const eng = new sim.GeomorphologyEngine();

        // Connect groundElevationProvider to DEUS_Levels
        if (!MUTANTS.skip_provider) {
            eng.groundElevationProvider = (x, y) => {
                const Levels = root.UF && root.UF.Levels;
                if (!Levels) return 0;
                if (typeof Levels.surfaceHeightAt === "function") {
                    const parts = areaKey.split(",").map(Number);
                    const ax = parts[0], ay = parts[1];
                    const h = Levels.surfaceHeightAt({ area: { x: ax, y: ay }, x, y, z: 0 });
                    if (Number.isFinite(h)) {
                        // S (0, 1, 2) stratum elevation in feet above datum: 160 ft is Z=0 datum
                        return 160 + h * 2;
                    }
                }
                return 0;
            };
        }

        return eng;
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
         */
        feedColumnFromLevels(area, x, y, z = 0) {
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
                if (mat === "soil" || mat === "stone") {
                    topS = s;
                    break;
                }
            }

            for (let s = 0; s < 5; s++) {
                const mat = cellStrata.materials[s];
                if (mat === "soil" || mat === "stone") {
                    const isSurface = (s === topS);
                    let horizon = "Bedrock", bulkDensity = 8250, porosity = 500, fieldCapacity = 500, sand = 0, silt = 0, clay = 0, organic = 0;
                    let loose = false, angle = 34;

                    if (mat === "soil") {
                        if (isSurface) {
                            horizon = "O/A"; sand = 4000; silt = 3000; clay = 1000; organic = 2000;
                            bulkDensity = 3750; porosity = 4500; fieldCapacity = 3500;
                        } else {
                            horizon = "B"; sand = 3000; silt = 3000; clay = 3800; organic = 200;
                            bulkDensity = 4750; porosity = 3500; fieldCapacity = 3000;
                        }
                    } else if (mat === "stone") {
                        if (isSurface) {
                            horizon = "C"; sand = 6000; silt = 2500; clay = 1500; organic = 0;
                            bulkDensity = 6000; porosity = 3000; fieldCapacity = 2500;
                        }
                    }

                    const stratum = new sim.SoilStratum(
                        x, y, z, s,
                        horizon, sand, silt, clay, organic,
                        bulkDensity, porosity, fieldCapacity,
                        0, loose, angle
                    );

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

            // 1. Moisture tick
            eng.processMoistureTick(1);

            // 2. Slope stability & cascade tick
            const preCascadeMass = eng.getTotalMass().total;
            const movedCascades = eng.processSlopeStability(1, ledger);
            const postCascadeMass = eng.getTotalMass().total;

            if (preCascadeMass !== postCascadeMass) {
                console.error(`[DEUS_SimBridge] Mass conservation violated: ${preCascadeMass} -> ${postCascadeMass}`);
            }

            // 3. Mirror results into DEUS_Levels if loose mass relocated
            if (movedCascades && movedCascades.length > 0 && !MUTANTS.no_mirror) {
                const Levels = root.UF && root.UF.Levels;
                if (Levels && typeof Levels.setStratumMaterial === "function") {
                    for (const c of movedCascades) {
                        Levels.setStratumMaterial({ area, x: c.toX, y: c.toY, z: c.z || 0 }, c.toS || 0, "soil");
                        lastCascadeEvent = c;
                        if (root.UF && root.UF.Events && typeof root.UF.Events.emit === "function") {
                            root.UF.Events.emit("soil:cascade", c);
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
                            if (!Levels) return 0;
                            if (typeof Levels.surfaceHeightAt === "function") {
                                const parts = key.split(",").map(Number);
                                const ax = parts[0], ay = parts[1];
                                const h = Levels.surfaceHeightAt({ area: { x: ax, y: ay }, x, y, z: 0 });
                                if (Number.isFinite(h)) return 160 + h * 2;
                            }
                            return 0;
                        };
                    }
                    engines.set(key, eng);
                }
            }
        },

        /**
         * Observability for UF.Look.
         */
        getSoilInfo(x, y, z = 0, area = null) {
            const eng = this.getEngine(area);
            if (!eng) return null;
            const top = eng.getHighestStratumAt(x, y);
            if (!top) return null;
            return {
                horizon: top.horizon,
                moistureBp: top.moisture,
                bulkDensity: top.bulkDensity,
                looseMassCp: top.looseMassCp,
                solidMassCp: top.solidMassCp,
                totalWaterCp: top.waterMassCp
            };
        }
    };

    // Event hooks
    if (root.UF && root.UF.Events && typeof root.UF.Events.on === "function") {
        root.UF.Events.on("interact:dig", e => {
            if (e && e.x !== undefined && e.y !== undefined) {
                SimBridge.markDirty(e.x, e.y, e.z || 0, e.s || 0, e.area);
            }
        });
        root.UF.Events.on("world:levelTileChanged", (area, x, y, layer, tileId) => {
            SimBridge.markDirty(x, y, 0, 0, area);
        });
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
