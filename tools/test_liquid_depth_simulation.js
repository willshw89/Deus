"use strict";
// tools/test_liquid_depth_simulation.js
// Verification suite for DEUS-TSK-GEMINI-08: Liquid Depth Simulation V1
// Conserved 0..7 Volumetric Fluid (Water & Lava), Active Dirty Queues,
// Event-Driven Wakeups, 3D Elevation Downward Flow, and Movement Classes.
//
// Usage:
//   node tools/test_liquid_depth_simulation.js
//   node tools/test_liquid_depth_simulation.js --mutant=<name>

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");

const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
const quiet = process.argv.includes("--quiet");

const MUTANTS = {
    duplicate_volume: true,
    delete_volume: true,
    no_gravity: true,
    ignore_walls: true,
    type_corrupt: true,
    ignore_depth_walk: true,
    save_corruption: true
};

if (mutant && !MUTANTS[mutant]) {
    console.error(`Unknown mutant "${mutant}". Known: ${Object.keys(MUTANTS).join(", ")}`);
    process.exit(2);
}

function buildSandbox() {
    const events = {};
    const shapes = new Map(); // "ax,ay,x,y,z" -> shape string ("floor", "solid", "open", "ramp", "stairs")
    const objects = new Map(); // "ax,ay,x,y,z" -> objectId
    const doors = new Map();   // "ax,ay,x,y,z" -> { isOpen: boolean }

    const keyOf = (ax, ay, x, y, z) => `${ax|0},${ay|0},${x|0},${y|0},${z|0}`;

    const sandbox = {
        window: {},
        console: Object.assign({}, console),
        performance: { now: () => Date.now() },
        $dataMap: { width: 64, height: 64, data: new Uint16Array(64 * 64) }
    };
    sandbox.window = sandbox;

    // Events system
    sandbox.UF = {
        Events: {
            on(name, fn) {
                if (!events[name]) events[name] = [];
                events[name].push(fn);
            },
            emit(name, ...args) {
                if (events[name]) {
                    for (const fn of events[name]) fn(...args);
                }
            }
        },
        World: {
            state: { size: 64, version: 4 },
            inWorld: (ax, ay, z) => z >= -2 && z <= 2,
            getObject: (ax, ay, x, y, z) => objects.get(keyOf(ax, ay, x, y, z)) || 0,
            viewLevel: () => ({ x: 0, y: 0, z: 0 }),
            walkable(ax, ay, x, y, opts = {}) {
                const z = opts.z !== undefined ? opts.z : 0;
                if (sandbox.UF.Fluid && typeof sandbox.UF.Fluid.walkable === "function") {
                    if (!sandbox.UF.Fluid.walkable(ax, ay, x, y, { z, canSwim: opts.canSwim, lavaImmune: opts.lavaImmune })) return false;
                }
                return true;
            }
        },
        Objects: {
            type(id) {
                if (id === 1) return { id: 1, autotile: "wall", tags: ["wall"] };
                if (id === 2) return { id: 2, autotile: "door", tags: ["door"] };
                return null;
            }
        },
        Doors: {
            isDoorType: (obj) => obj && obj.tags && obj.tags.includes("door"),
            isOpen: (area, x, y, z = 0) => {
                const ax = area ? (area.x | 0) : 0, ay = area ? (area.y | 0) : 0;
                const d = doors.get(keyOf(ax, ay, x, y, z));
                return d ? !!d.isOpen : false;
            }
        },
        Levels: {
            shapeAt(ax, ay, x, y, z) {
                const s = shapes.get(keyOf(ax, ay, x, y, z));
                if (s !== undefined) return s;
                // Default: z=0 is floor, z < 0 is solid rock, z > 0 is open air
                if (z === 0) return "floor";
                if (z < 0) return "solid";
                return "open";
            },
            shapeCodeAt(ax, ay, x, y, z) {
                const s = this.shapeAt(ax, ay, x, y, z);
                if (s === "solid") return 1;
                if (s === "floor") return 2;
                if (s === "open") return 3;
                if (s === "ramp") return 4;
                return 2;
            },
            describeCell(ref) {
                const fl = sandbox.UF.Fluid ? sandbox.UF.Fluid.isFlooded(ref) : { flooded: false };
                if (fl && fl.flooded) {
                    return fl.type === "lava" ? "Flooded (Lava)" : "Flooded (Fresh water)";
                }
                return "Ground";
            }
        }
    };

    vm.createContext(sandbox);

    // Load DEUS_Fluid
    const fluidCode = fs.readFileSync(path.join(PLUGINS, "DEUS_Fluid.js"), "utf8");
    vm.runInContext(fluidCode, sandbox, { filename: "DEUS_Fluid.js" });

    return {
        sandbox,
        Fluid: sandbox.UF.Fluid,
        World: sandbox.UF.World,
        Levels: sandbox.UF.Levels,
        Events: sandbox.UF.Events,
        setShape: (ax, ay, x, y, z, shape) => shapes.set(keyOf(ax, ay, x, y, z), shape),
        setObject: (ax, ay, x, y, z, objId) => objects.set(keyOf(ax, ay, x, y, z), objId),
        setDoor: (ax, ay, x, y, z, isOpen) => {
            objects.set(keyOf(ax, ay, x, y, z), 2);
            doors.set(keyOf(ax, ay, x, y, z), { isOpen });
        }
    };
}

async function run() {
    let passed = 0;
    let failed = 0;

    function check(name, ok, msg) {
        if (ok) {
            passed++;
            if (!quiet) console.log(`PASS ${name} - ${msg}`);
        } else {
            failed++;
            console.error(`FAIL ${name} - ${msg}`);
        }
    }

    console.log(`=== DEUS Liquid Depth Simulation Suite (DEUS-TSK-GEMINI-08) ===`);
    if (mutant) console.log(`[Running with mutation: ${mutant}]`);

    const env = buildSandbox();
    const { Fluid, World, Levels, Events, setShape, setObject, setDoor } = env;

    // Apply mutation if specified
    if (mutant === "duplicate_volume") Fluid._configure({ _mutantDuplicate: true });
    if (mutant === "delete_volume") Fluid._configure({ _mutantDelete: true });
    if (mutant === "no_gravity") Fluid._configure({ _mutantNoGravity: true });
    if (mutant === "ignore_walls") Fluid._configure({ _mutantIgnoreWalls: true });
    if (mutant === "type_corrupt") Fluid._configure({ _mutantTypeCorrupt: true });
    if (mutant === "ignore_depth_walk") Fluid._configure({ _mutantIgnoreDepthWalk: true });

    // -------------------------------------------------------------------------
    // Check 1: Conservation of Water in a Closed System
    // -------------------------------------------------------------------------
    Fluid.reset();
    // Build a 5x5 room on z=0 from (10,10) to (14,14) with walls on perimeter
    for (let x = 10; x <= 14; x++) {
        setObject(0, 0, x, 10, 0, 1);
        setObject(0, 0, x, 14, 0, 1);
    }
    for (let y = 10; y <= 14; y++) {
        setObject(0, 0, 10, y, 0, 1);
        setObject(0, 0, 14, y, 0, 1);
    }
    // Solid rock below so it doesn't drain
    for (let x = 10; x <= 14; x++) {
        for (let y = 10; y <= 14; y++) {
            setShape(0, 0, x, y, -1, "solid");
        }
    }

    Fluid.setCell({ x: 0, y: 0 }, 12, 12, 0, "water", 7);
    Fluid.setCell({ x: 0, y: 0 }, 12, 13, 0, "water", 7);

    // Initial total volume = 14
    let diagBefore = Fluid.diagnostics(0, 0);
    check("conservation_water_initial", diagBefore.totalWaterVolume === 14, `Initial water volume: ${diagBefore.totalWaterVolume} (want 14)`);

    // Run 100 simulation ticks
    for (let t = 0; t < 100; t++) {
        Fluid.tick();
    }

    let diagAfter = Fluid.diagnostics(0, 0);
    // Check adjacent height difference <= 1
    let maxAdjDiff = 0;
    for (let x = 11; x <= 13; x++) {
        for (let y = 11; y <= 13; y++) {
            const d1 = Fluid.depthAt(0, 0, x, y, 0);
            for (const [dx, dy] of [[1, 0], [0, 1]]) {
                const nx = x + dx, ny = y + dy;
                if (nx <= 13 && ny <= 13) {
                    const d2 = Fluid.depthAt(0, 0, nx, ny, 0);
                    const diff = Math.abs(d1 - d2);
                    if (diff > maxAdjDiff) maxAdjDiff = diff;
                }
            }
        }
    }
    check("conservation_water_volume_conserved",
        diagAfter.totalWaterVolume === 14 && maxAdjDiff <= 1,
        `Water volume after 100 ticks: ${diagAfter.totalWaterVolume} (want 14); max adjacent gradient: ${maxAdjDiff} (want <= 1)`);

    // -------------------------------------------------------------------------
    // Check 2: Conservation of Lava in a Closed System
    // -------------------------------------------------------------------------
    Fluid.reset();
    Fluid.setCell({ x: 0, y: 0 }, 12, 12, 0, "lava", 7);
    Fluid.setCell({ x: 0, y: 0 }, 12, 13, 0, "lava", 3);
    for (let t = 0; t < 100; t++) Fluid.tick();
    let diagLava = Fluid.diagnostics(0, 0);
    check("conservation_lava_volume_conserved",
        diagLava.totalLavaVolume === 10,
        `Lava volume after 100 ticks: ${diagLava.totalLavaVolume} (want 10)`);

    // -------------------------------------------------------------------------
    // Check 3: Vertical Downward Gravity Transfer (z=0 -> z=-1)
    // -------------------------------------------------------------------------
    Fluid.reset();
    // (20,20) on z=0 has water, (20,20) on z=-1 is excavated cavern (floor)
    setShape(0, 0, 20, 20, 0, "floor");
    setShape(0, 0, 20, 20, -1, "floor");
    setShape(0, 0, 20, 20, -2, "solid"); // solid floor under z=-1

    Fluid.setCell({ x: 0, y: 0 }, 20, 20, 0, "water", 7);
    for (let t = 0; t < 10; t++) Fluid.tick();

    const depthZ0 = Fluid.depthAt(0, 0, 20, 20, 0);
    const depthZMinus1 = Fluid.depthAt(0, 0, 20, 20, -1);
    check("vertical_downward_gravity",
        depthZ0 === 0 && depthZMinus1 === 7,
        `Vertical drain: z=0 has ${depthZ0} (want 0), z=-1 has ${depthZMinus1} (want 7)`);

    // -------------------------------------------------------------------------
    // Check 4: Multi-Z Vertical Cascade (Z=1 -> Z=0 -> Z=-1 -> Z=-2)
    // -------------------------------------------------------------------------
    Fluid.reset();
    setShape(0, 0, 25, 25, 1, "open");
    setShape(0, 0, 25, 25, 0, "open");
    setShape(0, 0, 25, 25, -1, "open");
    setShape(0, 0, 25, 25, -2, "floor"); // landing floor

    Fluid.setCell({ x: 0, y: 0 }, 25, 25, 1, "water", 7);
    for (let t = 0; t < 25; t++) Fluid.tick();

    const d1 = Fluid.depthAt(0, 0, 25, 25, 1);
    const d0 = Fluid.depthAt(0, 0, 25, 25, 0);
    const dm1 = Fluid.depthAt(0, 0, 25, 25, -1);
    const dm2 = Fluid.depthAt(0, 0, 25, 25, -2);
    check("multi_z_cascade",
        d1 === 0 && d0 === 0 && dm1 === 0 && dm2 === 7,
        `Cascade from Z=1 to Z=-2: Z1=${d1}, Z0=${d0}, Z-1=${dm1}, Z-2=${dm2} (want 0,0,0,7)`);

    // -------------------------------------------------------------------------
    // Check 5: Lateral Equalization Gradient
    // -------------------------------------------------------------------------
    Fluid.reset();
    // Flat room on z=0
    for (let x = 30; x <= 34; x++) {
        for (let y = 30; y <= 34; y++) {
            setShape(0, 0, x, y, -1, "solid");
        }
    }
    Fluid.setCell({ x: 0, y: 0 }, 32, 32, 0, "water", 7);
    for (let t = 0; t < 50; t++) Fluid.tick();

    const centerD = Fluid.depthAt(0, 0, 32, 32, 0);
    const northD = Fluid.depthAt(0, 0, 32, 31, 0);
    const eastD = Fluid.depthAt(0, 0, 33, 32, 0);
    check("lateral_equalization_gradient",
        centerD > 0 && northD > 0 && eastD > 0 && Math.abs(centerD - northD) <= 1,
        `Equalized pool: center=${centerD}, north=${northD}, east=${eastD}, gradient diff <= 1: ${Math.abs(centerD - northD) <= 1}`);

    // -------------------------------------------------------------------------
    // Check 6: Solid Wall Blocks Lateral Flow
    // -------------------------------------------------------------------------
    Fluid.reset();
    setObject(0, 0, 40, 10, 0, 1); // Wall at (40, 10)
    setShape(0, 0, 39, 10, -1, "solid");
    setShape(0, 0, 41, 10, -1, "solid");

    Fluid.setCell({ x: 0, y: 0 }, 39, 10, 0, "water", 7);
    for (let t = 0; t < 30; t++) Fluid.tick();

    const blockedEast = Fluid.depthAt(0, 0, 41, 10, 0);
    check("wall_blocks_flow",
        blockedEast === 0,
        `East of wall depth: ${blockedEast} (want 0, wall blocked water)`);

    // -------------------------------------------------------------------------
    // Check 7: Closed Door Blocks Flow, Opening Door Releases Flow
    // -------------------------------------------------------------------------
    Fluid.reset();
    setDoor(0, 0, 45, 15, 0, false); // Closed door at (45, 15)
    // Enclose reservoir at (44, 15) so water cannot dilute backwards
    setObject(0, 0, 43, 15, 0, 1); // West wall
    setObject(0, 0, 44, 14, 0, 1); // North wall
    setObject(0, 0, 44, 16, 0, 1); // South wall
    setShape(0, 0, 44, 15, -1, "solid");
    setShape(0, 0, 45, 15, -1, "solid");
    setShape(0, 0, 46, 15, -1, "solid");

    Fluid.setCell({ x: 0, y: 0 }, 44, 15, 0, "water", 7);
    for (let t = 0; t < 20; t++) Fluid.tick();

    const behindClosedDoor = Fluid.depthAt(0, 0, 46, 15, 0);
    check("closed_door_blocks_flow", behindClosedDoor === 0, `Behind closed door depth: ${behindClosedDoor} (want 0)`);

    // Now open the door!
    setDoor(0, 0, 45, 15, 0, true);
    Events.emit("doors:opened", { at: { area: { x: 0, y: 0 }, x: 45, y: 15, z: 0 } });
    for (let t = 0; t < 20; t++) Fluid.tick();

    const behindOpenDoor = Fluid.depthAt(0, 0, 46, 15, 0);
    check("open_door_releases_flow", behindOpenDoor > 0, `Behind opened door depth: ${behindOpenDoor} (want > 0, water flowed through)`);

    // -------------------------------------------------------------------------
    // Check 8: Terrain Dig Wakeup via Event (Change Creates Work)
    // -------------------------------------------------------------------------
    Fluid.reset();
    setShape(0, 0, 50, 20, 0, "solid"); // Solid rock at (50, 20)
    setShape(0, 0, 49, 20, 0, "floor");
    setShape(0, 0, 49, 20, -1, "solid");
    // Enclose reservoir at (49, 20) so water cannot dilute backwards
    setObject(0, 0, 48, 20, 0, 1); // West wall
    setObject(0, 0, 49, 19, 0, 1); // North wall
    setObject(0, 0, 49, 21, 0, 1); // South wall

    Fluid.setCell({ x: 0, y: 0 }, 49, 20, 0, "water", 7);
    for (let t = 0; t < 30; t++) Fluid.tick(); // Let it settle
    const initialQueue = Fluid.diagnostics(0, 0).activeQueueLength;

    // Dig the rock at (50, 20)
    setShape(0, 0, 50, 20, 0, "floor");
    setShape(0, 0, 50, 20, -1, "solid");
    Events.emit("levels:cellChanged", {
        area: { x: 0, y: 0 },
        x: 50, y: 20, z: 0,
        oldCell: "solid",
        newCell: "floor",
        cause: "mining"
    });

    // Step simulation - fluid should have woken up without manual intervention
    Fluid.tick();
    const breachedDepth = Fluid.depthAt(0, 0, 50, 20, 0);
    check("terrain_dig_wakeup",
        breachedDepth > 0,
        `Mined cell received fluid via event: depth=${breachedDepth} (want > 0)`);

    // -------------------------------------------------------------------------
    // Check 9: Vertical Shaft Channel Wakeup
    // -------------------------------------------------------------------------
    Fluid.reset();
    setShape(0, 0, 55, 25, 0, "floor");
    setShape(0, 0, 55, 25, -1, "floor");
    // Initially solid barrier between 0 and -1 (not channeled yet)
    // Put water at (55, 25, 0)
    Fluid.setCell({ x: 0, y: 0 }, 55, 25, 0, "water", 7);
    // Channel down!
    setShape(0, 0, 55, 25, 0, "channel");
    Events.emit("levels:shapeChanged", { area: { x: 0, y: 0 }, x: 55, y: 25, z: 0, newShape: "channel" });
    for (let t = 0; t < 15; t++) Fluid.tick();

    const channeledBelow = Fluid.depthAt(0, 0, 55, 25, -1);
    check("vertical_channel_wakeup", channeledBelow > 0, `Channel drained fluid to Z=-1: depth=${channeledBelow} (want > 0)`);

    // -------------------------------------------------------------------------
    // Check 10: Quiescence: Settled Fluid Costs Zero CPU (~0 ms)
    // -------------------------------------------------------------------------
    Fluid.reset();
    Fluid.setCell({ x: 0, y: 0 }, 10, 10, 0, "water", 4);
    // Step until queue empties
    for (let t = 0; t < 50; t++) Fluid.tick();

    const dQuiet = Fluid.diagnostics(0, 0);
    const queueLen = dQuiet.activeQueueLength;

    const tStart = Date.now();
    for (let t = 0; t < 50; t++) {
        Fluid.tick();
    }
    const tElapsed = Date.now() - tStart;
    const processed = Fluid.diagnostics(0, 0).cellsProcessedLastTick;

    check("quiescence_zero_cost",
        queueLen === 0 && processed === 0 && tElapsed < 20,
        `Quiescent state: activeQueue=${queueLen} (want 0), processed=${processed} (want 0), 50 ticks elapsed=${tElapsed}ms`);

    // -------------------------------------------------------------------------
    // Check 11: Bounded Budget Throttling (60 FPS Protection)
    // -------------------------------------------------------------------------
    Fluid.reset();
    for (let i = 0; i < 20; i++) {
        Fluid.setCell({ x: 0, y: 0 }, i, 5, 0, "water", 7);
    }
    const processedBudget = Fluid.step({ x: 0, y: 0 }, 15);
    check("bounded_budget_throttling",
        processedBudget <= 15,
        `Budget throttled: processed=${processedBudget} (want <= 15)`);

    // -------------------------------------------------------------------------
    // Check 12: Sparse Save/Load Resumption
    // -------------------------------------------------------------------------
    Fluid.reset();
    Fluid.setCell({ x: 0, y: 0 }, 15, 15, 0, "water", 7);
    Fluid.step({ x: 0, y: 0 }, 5); // partially flow

    let saved = Fluid.makeSaveContents();
    if (mutant === "save_corruption") {
        saved = []; // BUG: drops saved contents
    }

    Fluid.reset();
    check("save_clears_on_reset", Fluid.diagnostics(0, 0).totalWaterVolume === 0, `Total water after reset: 0`);

    Fluid.extractSaveContents(saved);
    const restoredDiag = Fluid.diagnostics(0, 0);
    check("sparse_save_load_resumption",
        restoredDiag.totalWaterVolume === 7 && restoredDiag.activeQueueLength > 0,
        `Restored volume: ${restoredDiag.totalWaterVolume} (want 7), re-enqueued flowing cells: ${restoredDiag.activeQueueLength} (want > 0)`);

    // Complete flow to verify conservation
    for (let t = 0; t < 50; t++) Fluid.tick();
    check("save_load_flow_completed", Fluid.diagnostics(0, 0).totalWaterVolume === 7, `Final settled volume after save/load: 7`);

    // -------------------------------------------------------------------------
    // Check 13: Determinism across Identical Runs
    // -------------------------------------------------------------------------
    function runDeterministic() {
        Fluid.reset();
        Fluid.setCell({ x: 0, y: 0 }, 20, 20, 0, "water", 7);
        Fluid.setCell({ x: 0, y: 0 }, 21, 20, 0, "water", 5);
        for (let t = 0; t < 40; t++) Fluid.tick();
        const res = [];
        for (let x = 18; x <= 23; x++) {
            for (let y = 18; y <= 23; y++) {
                res.push(Fluid.depthAt(0, 0, x, y, 0));
            }
        }
        return res.join(",");
    }

    const run1 = runDeterministic();
    const run2 = runDeterministic();
    check("determinism_identical_runs", run1 === run2, `Deterministic runs match bit-for-bit: ${run1 === run2}`);

    // -------------------------------------------------------------------------
    // Check 14: Type Isolation (No Water/Lava Cross-Contamination)
    // -------------------------------------------------------------------------
    Fluid.reset();
    setShape(0, 0, 30, 30, -1, "solid");
    setShape(0, 0, 31, 30, -1, "solid");

    Fluid.setCell({ x: 0, y: 0 }, 30, 30, 0, "water", 7);
    Fluid.setCell({ x: 0, y: 0 }, 31, 30, 0, "lava", 7);

    for (let t = 0; t < 30; t++) Fluid.tick();

    const t30 = Fluid.typeAt(0, 0, 30, 30, 0);
    const t31 = Fluid.typeAt(0, 0, 31, 30, 0);
    check("type_isolation_no_mixing",
        t30 === "water" && t31 === "lava",
        `Liquid types preserved: (30,30)=${t30}, (31,30)=${t31} (want water, lava)`);

    // -------------------------------------------------------------------------
    // Check 15: Map Boundary Handling
    // -------------------------------------------------------------------------
    Fluid.reset();
    let noThrow = true;
    try {
        Fluid.setCell({ x: 0, y: 0 }, 0, 0, 0, "water", 7);
        Fluid.setCell({ x: 0, y: 0 }, 63, 63, 0, "water", 7);
        for (let t = 0; t < 10; t++) Fluid.tick();
    } catch (e) {
        noThrow = false;
    }
    check("boundary_handling_no_throw", noThrow, `Boundary cells handled safely without exceptions`);

    // -------------------------------------------------------------------------
    // Check 16: Movement Classes and Pathfinding Walkability
    // -------------------------------------------------------------------------
    Fluid.reset();
    setShape(0, 0, 10, 10, -1, "solid");
    Fluid.setCell({ x: 0, y: 0 }, 10, 10, 0, "water", 0);
    const mcDry = Fluid.movementClass({ area: { x: 0, y: 0 }, x: 10, y: 10, z: 0 });
    const walkDry = Fluid.walkable(0, 0, 10, 10, { z: 0 });

    Fluid.setCell({ x: 0, y: 0 }, 10, 10, 0, "water", 2);
    const mcShallow = Fluid.movementClass({ area: { x: 0, y: 0 }, x: 10, y: 10, z: 0 });
    const walkShallow = Fluid.walkable(0, 0, 10, 10, { z: 0 });

    Fluid.setCell({ x: 0, y: 0 }, 10, 10, 0, "water", 4);
    const mcWading = Fluid.movementClass({ area: { x: 0, y: 0 }, x: 10, y: 10, z: 0 });
    const walkWading = Fluid.walkable(0, 0, 10, 10, { z: 0 });

    Fluid.setCell({ x: 0, y: 0 }, 10, 10, 0, "water", 6);
    const mcDeep = Fluid.movementClass({ area: { x: 0, y: 0 }, x: 10, y: 10, z: 0 });
    const walkDeepNonSwim = Fluid.walkable(0, 0, 10, 10, { z: 0, canSwim: false });
    const walkDeepSwim = Fluid.walkable(0, 0, 10, 10, { z: 0, canSwim: true });

    Fluid.setCell({ x: 0, y: 0 }, 10, 10, 0, "water", 7);
    const mcSubmerged = Fluid.movementClass({ area: { x: 0, y: 0 }, x: 10, y: 10, z: 0 });
    const isSub = Fluid.isSubmerged({ area: { x: 0, y: 0 }, x: 10, y: 10, z: 0 });

    Fluid.setCell({ x: 0, y: 0 }, 10, 10, 0, "lava", 2);
    const mcLava = Fluid.movementClass({ area: { x: 0, y: 0 }, x: 10, y: 10, z: 0 });
    const walkLava = Fluid.walkable(0, 0, 10, 10, { z: 0 });

    check("movement_classes_and_walkability",
        mcDry === "dry" && walkDry &&
        mcShallow === "shallow" && walkShallow &&
        mcWading === "wading" && walkWading &&
        mcDeep === "deep" && !walkDeepNonSwim && walkDeepSwim &&
        mcSubmerged === "submerged" && isSub &&
        mcLava === "lethal" && !walkLava,
        `Movement classes: dry=${mcDry}, shallow=${mcShallow}, wading=${mcWading}, deep=${mcDeep}, sub=${mcSubmerged}, lava=${mcLava}; deep non-swimmer blocked: ${!walkDeepNonSwim}, swimmer allowed: ${walkDeepSwim}`);

    // -------------------------------------------------------------------------
    // Check 17: Legacy Flooding Compatibility
    // -------------------------------------------------------------------------
    Fluid.reset();
    Fluid.setCell({ x: 0, y: 0 }, 5, 5, -1, "water", 7);
    const legacyFlooded = Levels.describeCell({ area: { x: 0, y: 0 }, x: 5, y: 5, z: -1 });
    check("legacy_flooding_compatibility",
        legacyFlooded.includes("Flooded (Fresh water)"),
        `Levels.describeCell reflects fluid depth: "${legacyFlooded}"`);

    // -------------------------------------------------------------------------
    // Summary & Mutant Handling
    // -------------------------------------------------------------------------
    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);

    if (mutant) {
        if (failed > 0) {
            console.log(`MUTANT ${mutant} WAS SUCCESSFULLY DETECTED! (Exit 1 as required by Rule 4)`);
            process.exit(1);
        } else {
            console.error(`ERROR: Mutant ${mutant} did not cause any test failure!`);
            process.exit(0);
        }
    } else {
        if (failed > 0) process.exit(1);
    }
}

// Master execution: if run directly without --mutant, run all mutants as child processes
if (!mutant) {
    run().then(() => {
        console.log(`\n=== Running Rule 4 Failure Mutation Checks ===`);
        const mutantsList = Object.keys(MUTANTS);
        let mutantsDetected = 0;

        for (const m of mutantsList) {
            const res = spawnSync(process.execPath, [__filename, `--mutant=${m}`, "--quiet"], { encoding: "utf8" });
            if (res.status === 1) {
                console.log(`PASS mutant_${m}: successfully detected and exited 1.`);
                mutantsDetected++;
            } else {
                console.error(`FAIL mutant_${m}: expected exit code 1, got ${res.status}. Output:\n${res.stdout}\n${res.stderr}`);
            }
        }

        console.log(`\nMUTANT VERIFICATION: ${mutantsDetected}/${mutantsList.length} mutants detected.`);
        if (mutantsDetected !== mutantsList.length) {
            process.exit(1);
        } else {
            console.log(`ALL 17 LIQUID DEPTH CHECKS AND ALL 7 MUTANTS PASSED!`);
            process.exit(0);
        }
    }).catch(e => {
        console.error(e);
        process.exit(2);
    });
} else {
    run().catch(e => {
        console.error(e);
        process.exit(2);
    });
}
