//=============================================================================
// DEUS_Fluid.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Fluid] Conserved volumetric 0..7 fluid simulation (water & lava), active dirty queues, and 3D flow.
 * @author Project DEUS
 *
 * @help
 * DEUS_Fluid.js - 0..7 Volumetric Fluid Simulation
 *
 * Principles:
 * 1. Physical 0..7 liquid depth:
 *    - 0: Dry
 *    - 1-2: Shallow (walkable, movement cost x1.1)
 *    - 3-4: Wading (walkable, movement cost x2.0)
 *    - 5-6: Deep (impassable without swimming)
 *    - 7: Submerged / Full (impassable without swimming)
 *    - Lava (type 2): Lethal / impassable at any depth >= 1.
 *
 * 2. Active Dirty Set Architecture:
 *    - "Stable state costs almost nothing. Change creates work."
 *    - Active queue tracks only cells whose liquid may move.
 *    - Quiescent dirty queues process no cells; tick bookkeeping remains.
 *    - Event-driven wakeup: digging, mining, wall building/demolition,
 *      or door opening wakes affected cells and their 3D orthogonal neighbors.
 *    - One bounded budget (default 512 work items/tick) across queued areas
 *      and registered lake visits. This is not a frame-rate guarantee.
 *
 * 3. 3D Elevation Flow:
 *    - Operates across the levels of the world's Z range (UF.World, WG.00.17;
 *      -16..+15 for new worlds, -2..+2 for a save made before it).
 *    - Priority 1: Vertical gravity downward transfer into Z - 1.
 *    - Priority 2: Lateral equalization across orthogonal horizontal neighbors.
 *    - Strict conservation: Zero liquid volume duplication or deletion.
 *
 * 4. Sparse Persistence:
 *    - Only non-zero depth cells are saved.
 *    - Dynamic state seamlessly resumes upon loading.
 *    - Sparse memory (WG.00.17): a level's grid and flood cache are made on
 *      the first write of fluid to it; the dirty flags are the set of queued
 *      cells. A level without fluid costs nothing.
 *
 * 5. Cross-layer water (SIM.50.02), when game/js/sim/hydro loaded:
 *    seepage by material permeability, springs fed from a stored aquifer,
 *    lake inflow / evaporation / infiltration, and flood spill. The other
 *    stores are counted. A require() that throws leaves this path off, so
 *    the 0..7 solver is unchanged. Docs: docs/systems/DEUS_WaterDynamics.md.
 */

var Imported = Imported || {};
Imported.DEUS_Fluid = true;

// Assigned inside the loader below. A `var UF = UF || {}` here is local to Node's
// require() wrapper (DEUS_Core loads this file with require), so UF.Fluid would
// never land on the object consumers read (F-05 / D-4 option b).
var UF;

(function() {
    "use strict";

    // One object shared with window.DEUS. Core's later
    // `window.DEUS = window.DEUS || {}; window.UF = window.DEUS` then keeps Fluid.
    // When both already exist and differ, window.UF (what consumers read) is kept.
    function bindSharedNamespace() {
        if (typeof window === "undefined") return UF || {};
        if (!window.DEUS && !window.UF) {
            window.DEUS = window.UF = {};
        } else if (!window.UF) {
            window.UF = window.DEUS;
        } else if (!window.DEUS) {
            window.DEUS = window.UF;
        }
        return window.UF;
    }
    UF = bindSharedNamespace();

    // --- Constants ---
    const DEPTH_MAX = 7;
    const TYPE_NONE = 0;
    const TYPE_WATER = 1;
    const TYPE_LAVA = 2;

    const DEFAULT_BUDGET = 512;
    // The Z range comes from UF.World, the one authority (WG.00.17, docs/systems/DEUS_ZRange.md). Loaded without it (a
    // node test of this file alone), the legacy range: the one a World without a range has.
    const LEGACY_Z_RANGE = Object.freeze({ zMin: -2, zMax: 2 });
    function zRange() {
        const U = typeof window !== "undefined" ? window.UF : undefined, W = U && U.World;
        return W && typeof W.zRange === "function" ? W.zRange() : LEGACY_Z_RANGE;
    }
    const inRange = z => { const r = zRange(); return z >= r.zMin && z <= r.zMax; };

    // Strata reconciliation constants (matching DEUS_Levels.js)
    const FLUID_TO_STRATA = Object.freeze([0, 1, 1, 2, 3, 4, 4, 5]);
    const STRATA_TO_FLUID = Object.freeze([0, 1, 3, 4, 6, 7]);

    // Hot query coordinate parser (zero heap allocation)
    let qAx = 0, qAy = 0, qX = 0, qY = 0, qZ = 0;
    function parseCoords(a, b, c, d, e) {
        if (typeof a === "object" && a !== null) {
            // (area, x, y, z), nested ref, or flat {ax, ay, x, y, z}.
            const areaArgs = b !== undefined;
            const ar = areaArgs ? a : (a.area || {});
            qAx = (ar.ax !== undefined ? ar.ax : (ar.x !== undefined ? ar.x : a.ax)) | 0;
            qAy = (ar.ay !== undefined ? ar.ay : (ar.y !== undefined ? ar.y : a.ay)) | 0;
            qX = (areaArgs ? b : a.x) | 0;
            qY = (areaArgs ? c : a.y) | 0;
            qZ = (areaArgs ? d : a.z) | 0;
        } else {
            qAx = a | 0;
            qAy = b | 0;
            qX = c | 0;
            qY = d | 0;
            qZ = (e !== undefined ? e : 0) | 0;
        }
    }

    // Direction offsets for orthogonal horizontal neighbors: North, East, South, West
    const HORZ_DIRS = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 }
    ];

    // 3D neighbor offsets for event wakeups: 6 orthogonal neighbors
    const NEIGHBORS_3D = [
        [0, 0, 1],   // Above
        [0, 0, -1],  // Below
        [0, -1, 0],  // North
        [1, 0, 0],   // East
        [0, 1, 0],   // South
        [-1, 0, 0]   // West
    ];

    // --- State Storage ---
    // Key: "ax,ay" -> AreaFluidData
    const areas = new Map();
    const activeAreas = new Set();
    let knownRange = { ...zRange() };
    let pendingHydro = null;
    const pendingDisplaced = { water: 0, lava: 0 };
    let scheduleTick = 0;

    function workBudget(value) {
        const n = value === undefined ? config.budget : value;
        return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    }

    // Range changes are rare. Rebase only then, preserving queued coordinates
    // and waking saved cells that were outside the previously available range.
    function syncRange() {
        const next = zRange();
        if (next.zMin === knownRange.zMin && next.zMax === knownRange.zMax) return;
        knownRange = { zMin: next.zMin, zMax: next.zMax };
        for (const data of areas.values()) {
            const shift = (data.zMin - next.zMin) * data.n;
            data.queue = data.queue.slice(data.head).map(id => id + shift);
            data.head = 0;
            data.inQueue = new Set(data.queue);
            data.zMin = next.zMin;
            for (const [z, indices] of data.dormant) {
                if (!inRange(z)) continue;
                data.dormant.delete(z);
                for (const idx of indices) wakeCellAndNeighbors(data.ax, data.ay, idx % data.size, Math.floor(idx / data.size), z);
            }
        }
    }

    // Configuration / Hooks
    const config = {
        budget: DEFAULT_BUDGET,
        simulationActive: true,
        // Rule 4 mutation controls (testing only)
        _mutantDuplicate: false,
        _mutantDelete: false,
        _mutantNoGravity: false,
        _mutantIgnoreWalls: false,
        _mutantTypeCorrupt: false,
        _mutantIgnoreDepthWalk: false
    };

    // Diagnostics counters
    const diag = {
        ticks: 0,
        cellsProcessedTotal: 0,
        cellsProcessedLastTick: 0,
        lastTickMs: 0
    };

    // Helper: Bit packing
    function getDepth(byteVal) {
        return byteVal & 0x07;
    }

    function getType(byteVal) {
        return (byteVal >> 4) & 0x0F;
    }

    function packVal(type, depth) {
        return ((type & 0x0F) << 4) | (depth & 0x07);
    }

    function typeName(typeCode) {
        if (typeCode === TYPE_WATER) return "water";
        if (typeCode === TYPE_LAVA) return "lava";
        return null;
    }

    function typeCode(name) {
        if (name === "water") return TYPE_WATER;
        if (name === "lava") return TYPE_LAVA;
        return TYPE_NONE;
    }

    function areaKey(ax, ay) {
        return `${ax | 0},${ay | 0}`;
    }

    function getMapSize() {
        const W = window.UF && UF.World;
        if (W && W.state && Number.isInteger(W.state.size)) {
            return W.state.size;
        }
        if (window.$dataMap && Number.isInteger(window.$dataMap.width)) {
            return window.$dataMap.width;
        }
        return 256;
    }

    // Allocate or retrieve area fluid data. Sparse (WG.00.17): no level's grid exists until fluid is written to it
    // (gridFor); the queued cells' flags are a Set. zMin: the origin of this area's queued cell ids.
    function getAreaData(ax, ay) {
        syncRange();
        const key = areaKey(ax, ay);
        let data = areas.get(key);
        if (!data) {
            const size = getMapSize();
            const n = size * size;
            data = {
                ax: ax | 0,
                ay: ay | 0,
                size: size,
                n: n,
                zMin: zRange().zMin,
                grids: new Map(),       // z -> Uint8Array(n), made on the first write of fluid to level z
                floodGrids: new Map(),  // z -> Uint8Array(n) (legacy visual cache: 1=water, 2=lava), made with its grid
                queue: [],              // cell ids: ((z - zMin) * n + idx)
                head: 0,
                inQueue: new Set(),     // the cell ids in the queue
                dormant: new Map(),    // saved/queued cells outside the live range
                revision: 1
            };
            areas.set(key, data);
        }
        return data;
    }
    // The grid of level z of an area, made (with its flood cache) when absent.
    function gridFor(data, z) {
        let g = data.grids.get(z);
        if (!g) {
            g = new Uint8Array(data.n);
            data.grids.set(z, g);
            data.floodGrids.set(z, new Uint8Array(data.n));
        }
        return g;
    }
    // A read-only grid of zeros per size, for a level of the range that has no fluid (getFloodGrid's answer: shared, never written).
    const zeroGrids = new Map();
    function zeroGrid(n) {
        let g = zeroGrids.get(n);
        if (!g) { g = new Uint8Array(n); zeroGrids.set(n, g); }
        return g;
    }

    function cellIdOf(data, x, y, z) {
        const size = data.size, zIdx = (z - data.zMin) | 0;
        return zIdx * (size * size) + ((y | 0) * size + (x | 0));
    }

    let coordX = 0, coordY = 0, coordZ = 0;
    function decodeCellId(data, cellId) {
        const size = data.size, n = size * size;
        const zIdx = Math.floor(cellId / n);
        coordZ = zIdx + data.zMin;
        const rem = cellId - zIdx * n;
        coordX = rem % size;
        coordY = Math.floor(rem / size);
    }

    function coordsOf(data, cellId) {
        decodeCellId(data, cellId);
        return { x: coordX, y: coordY, z: coordZ };
    }

    // --- Enqueueing & Wakeup ---
    function enqueueCell(ax, ay, x, y, z) {
        const data = getAreaData(ax, ay);
        const size = data.size;
        if (x < 0 || y < 0 || x >= size || y >= size) return;
        if (!inRange(z)) {
            // Only occupied out-of-range cells need a future wakeup.
            const grid = data.grids.get(z);
            if (grid && getDepth(grid[y * size + x]) > 0) {
                let indices = data.dormant.get(z);
                if (!indices) data.dormant.set(z, indices = new Set());
                indices.add(y * size + x);
            }
            return;
        }

        const cellId = cellIdOf(data, x, y, z);
        if (data.inQueue.has(cellId)) return; // Already dirty and queued

        data.inQueue.add(cellId);
        data.queue.push(cellId);
        activeAreas.add(data);
    }

    function wakeCellAndNeighbors(ax, ay, x, y, z) {
        enqueueCell(ax, ay, x, y, z);
        for (let i = 0; i < NEIGHBORS_3D.length; i++) {
            const [dx, dy, dz] = NEIGHBORS_3D[i];
            enqueueCell(ax, ay, x + dx, y + dy, z + dz);
        }
    }

    // --- Barrier & Geometry Checks ---
    function checkObjBarrier(objId, ax, ay, x, y, z) {
        if (!objId) return false;
        const O = window.UF && UF.Objects;
        const obj = O && typeof O.type === "function" ? O.type(objId) : null;
        if (!obj) return false;
        if (obj.autotile === "wall" || (Array.isArray(obj.tags) && obj.tags.includes("wall"))) return true;
        const D = window.UF && UF.Doors;
        if ((Array.isArray(obj.tags) && obj.tags.includes("door")) || (D && typeof D.isDoorType === "function" && D.isDoorType(obj))) {
            const isOpen = D && typeof D.isOpen === "function" && D.isOpen({ x: ax, y: ay, z }, x, y);
            if (!isOpen) return true;
        }
        return false;
    }

    function isObjectBarrier(ax, ay, x, y, z) {
        if (config._mutantIgnoreWalls) return false;
        const W = window.UF && UF.World;
        if (!W) return false;

        let objId = 0;
        if (typeof W.getObject === "function") {
            try {
                objId = W.getObject(ax, ay, x, y, z);
            } catch (e) {
                objId = 0;
            }
        }
        return checkObjBarrier(objId, ax, ay, x, y, z);
    }

    function isBarrier(ax, ay, x, y, z) {
        if (config._mutantIgnoreWalls) return false;

        const L = window.UF && UF.Levels;
        if (L) {
            if (typeof L.getStrataFluidPassage === "function") {
                const pass = L.getStrataFluidPassage(ax, ay, x, y, z);
                if ((pass & 7) === 0) return true; // zero fluid capacity = solid barrier
            } else if (typeof L.shapeAt === "function") {
                const s = L.shapeAt(ax, ay, x, y, z);
                if (s === "solid") return true;
            } else if (typeof L.shapeCodeAt === "function") {
                const sc = L.shapeCodeAt(ax, ay, x, y, z);
                if (sc === 1) return true; // 1 = SOLID
            }
        }

        return isObjectBarrier(ax, ay, x, y, z);
    }

    function canDrainDown(ax, ay, x, y, z) {
        if (config._mutantNoGravity) return false;
        if (z <= zRange().zMin) return false; // The bottom of the world (its lowest level)

        // Object barrier at destination
        if (isObjectBarrier(ax, ay, x, y, z) || isObjectBarrier(ax, ay, x, y, z - 1)) return false;

        const L = window.UF && UF.Levels;
        if (L && typeof L.getStrataFluidPassage === "function") {
            const pass = L.getStrataFluidPassage(ax, ay, x, y, z);
            // DOWN bit (8) indicates S0 of this cell is open AND S4 of (z-1) is open
            if ((pass & 8) === 0) return false;
        } else if (L && typeof L.shapeAt === "function") {
            if (isBarrier(ax, ay, x, y, z - 1)) return false;
            const s = L.shapeAt(ax, ay, x, y, z);
            if (s === "solid") return false;
        }

        // Destination capacity: cell below must not be already at or over capacity
        const destCap = Fluid.fluidCapacityAt(ax, ay, x, y, z - 1);
        if (destCap <= 0) return false;
        const destDepth = Fluid.depthAt(ax, ay, x, y, z - 1);
        if (destDepth >= destCap) return false;

        return true;
    }

    function fluidCanPassLaterally(ax, ay, x, y, z, dx, dy, nz) {
        if (config._mutantIgnoreWalls) return true;
        const data = getAreaData(ax, ay);
        const size = data.size;
        let nx, ny;
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0) && nz === undefined) {
            nx = x + dx;
            ny = y + dy;
        } else {
            nx = dx;
            ny = dy;
        }
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) return false;

        if (isObjectBarrier(ax, ay, x, y, z) || isObjectBarrier(ax, ay, nx, ny, z)) return false;

        const nCap = Fluid.fluidCapacityAt(ax, ay, nx, ny, z);
        if (nCap <= 0) return false;
        const nDepth = Fluid.depthAt(ax, ay, nx, ny, z);
        if (nDepth >= nCap) return false;

        const L = window.UF && UF.Levels;
        if (L && typeof L.solidFraction === "function") {
            const srcSolid = Math.round(L.solidFraction(ax, ay, x, y, z) * 5);
            const nSolid = Math.round(L.solidFraction(ax, ay, nx, ny, z) * 5);

            if (nSolid > srcSolid) {
                const curDepth = Fluid.depthAt(ax, ay, x, y, z);
                const fluidStrata = FLUID_TO_STRATA[curDepth];
                const topElevation = srcSolid + fluidStrata;
                if (topElevation <= nSolid) return false; // Blocked by rock lip
            }
        } else if (isBarrier(ax, ay, nx, ny, z)) {
            return false;
        }

        return true;
    }

    // --- Simulation Core Step ---
    function stepArea(ax, ay, budget) {
        const data = getAreaData(ax, ay);
        const queue = data.queue;
        const size = data.size;
        const n = data.n;
        const maxBudget = workBudget(budget);

        if (data.head >= queue.length) {
            // Queue is quiescent! Stable state costs nothing.
            if (queue.length > 0) {
                queue.length = 0;
                data.head = 0;
            }
            activeAreas.delete(data);
            return 0;
        }

        let processed = 0;
        const initialHead = data.head;
        const limit = Math.min(queue.length, initialHead + maxBudget);

        while (data.head < limit) {
            const cellId = queue[data.head++];
            data.inQueue.delete(cellId);
            processed++;

            decodeCellId(data, cellId);
            const x = coordX, y = coordY, z = coordZ;
            if (!inRange(z)) {
                enqueueCell(ax, ay, x, y, z);
                continue;
            }
            const sessionNow = hydroSession();
            let gridZ = data.grids.get(z);
            const depthStart = gridZ ? getDepth(gridZ[y * size + x]) : 0;
            // A dry spring has no grid yet. Feed before the empty-grid skip.
            if (sessionNow) sessionNow.feedOutlet(ax, ay, x, y, z);
            gridZ = data.grids.get(z);
            if (!gridZ) continue;

            const idx = y * size + x;
            const currentVal = gridZ[idx];
            let depth = getDepth(currentVal);
            const type = getType(currentVal);

            if (depth === 0 || type === TYPE_NONE) continue;

            let cellChanged = false;

            // -----------------------------------------------------------------
            // Priority 1: Vertical Gravity Downward Transfer into Z - 1
            // -----------------------------------------------------------------
            if (canDrainDown(ax, ay, x, y, z)) {
                const belowZ = z - 1;
                const gridBelow = gridFor(data, belowZ);
                if (gridBelow) {
                    const belowVal = gridBelow[idx];
                    let belowDepth = getDepth(belowVal);
                    const belowType = getType(belowVal);

                    const belowCap = Fluid.fluidCapacityAt(ax, ay, x, y, belowZ);
                    // Transfer if destination is dry OR matches liquid type, and has capacity
                    if (belowDepth < belowCap && (belowDepth === 0 || belowType === type)) {
                        let transferAmt = Math.min(depth, belowCap - belowDepth);
                        if (config._mutantDuplicate) transferAmt += 1;

                        if (transferAmt > 0) {
                            depth -= transferAmt;
                            belowDepth += transferAmt;
                            if (config._mutantDelete) belowDepth -= 1;

                            // Update destination cell
                            gridBelow[idx] = packVal(type, belowDepth);
                            // Update legacy visual cache
                            data.floodGrids.get(belowZ)[idx] = belowDepth > 0 ? type : 0;

                            // Update source cell
                            gridZ[idx] = depth > 0 ? packVal(type, depth) : 0;
                            data.floodGrids.get(z)[idx] = depth > 0 ? type : 0;

                            cellChanged = true;

                            // Wake below cell and its 6 3D neighbors
                            wakeCellAndNeighbors(ax, ay, x, y, belowZ);
                        }
                    }
                }
            }

            // -----------------------------------------------------------------
            // Priority 2: Lateral Equalization across Orthogonal Neighbors
            // -----------------------------------------------------------------
            if (depth > 0) {
                for (let d = 0; d < HORZ_DIRS.length; d++) {
                    if (depth <= 1) break; // Cannot equalize if depth <= 1

                    const dx = HORZ_DIRS[d].dx;
                    const dy = HORZ_DIRS[d].dy;
                    const nx = x + dx;
                    const ny = y + dy;

                    if (!fluidCanPassLaterally(ax, ay, x, y, z, dx, dy)) continue;

                    const nCap = Fluid.fluidCapacityAt(ax, ay, nx, ny, z);
                    if (nCap <= 0) continue;

                    const nIdx = ny * size + nx;
                    const nVal = gridZ[nIdx];
                    let nDepth = getDepth(nVal);
                    const nType = getType(nVal);

                    // Liquid types must match or neighbor must be dry (no mixing in V1)
                    if (nDepth > 0 && nType !== type) continue;

                    if (depth > nDepth + 1 && nDepth < nCap) {
                        let diff = depth - nDepth;
                        let maxTransfer = Math.floor(diff / 2);
                        let transferAmt = Math.min(maxTransfer, nCap - nDepth);
                        if (config._mutantDuplicate) transferAmt += 1;

                        if (transferAmt > 0) {
                            depth -= transferAmt;
                            nDepth += transferAmt;
                            if (config._mutantDelete) nDepth -= 1;

                            const targetType = config._mutantTypeCorrupt ? (type === TYPE_WATER ? TYPE_LAVA : TYPE_WATER) : type;

                            gridZ[nIdx] = packVal(targetType, nDepth);
                            data.floodGrids.get(z)[nIdx] = nDepth > 0 ? targetType : 0;

                            gridZ[idx] = depth > 0 ? packVal(type, depth) : 0;
                            data.floodGrids.get(z)[idx] = depth > 0 ? type : 0;

                            cellChanged = true;

                            // Wake neighbor and its neighbors
                            wakeCellAndNeighbors(ax, ay, nx, ny, z);
                        }
                    }
                }
            }

            if (cellChanged) {
                data.revision++;
                wakeCellAndNeighbors(ax, ay, x, y, z);
            }

            // Porous plugs and column aquifers. Open shafts already fell above.
            if (sessionNow) sessionNow.seepFrom(ax, ay, x, y, z);
            const gridEnd = data.grids.get(z);
            const depthEnd = gridEnd ? getDepth(gridEnd[idx]) : 0;
            if (sessionNow && depthEnd < depthStart) sessionNow.notifyOpened(ax, ay, x, y, z);
        }

        // Compact queue if head progressed significantly
        if (data.head >= 2048) {
            data.queue = data.queue.slice(data.head);
            data.head = 0;
        }
        if (data.head >= data.queue.length) activeAreas.delete(data);

        return processed;
    }

    // --- Public API ---
    const Fluid = {
        DEPTH_MAX,
        TYPE_NONE,
        TYPE_WATER,
        TYPE_LAVA,
        FLUID_TO_STRATA,
        STRATA_TO_FLUID,

        // Strata Reconciliation Formal Queries
        fluidVolumeAt(a, b, c, d, e) {
            return Fluid.depthAt(a, b, c, d, e);
        },

        fluidCapacityAt(a, b, c, d, e) {
            parseCoords(a, b, c, d, e);
            if (!inRange(qZ)) return 0;

            const L = window.UF && UF.Levels;
            if (L && typeof L.getStrataFluidPassage === "function") {
                const pass = L.getStrataFluidPassage(qAx, qAy, qX, qY, qZ);
                return pass & 7;
            }
            if (L && typeof L.shapeAt === "function") {
                const s = L.shapeAt(qAx, qAy, qX, qY, qZ);
                if (s === "solid") return 0;
                return DEPTH_MAX;
            }
            return DEPTH_MAX;
        },

        fluidFillFractionAt(a, b, c, d, e) {
            parseCoords(a, b, c, d, e);
            const cap = Fluid.fluidCapacityAt(qAx, qAy, qX, qY, qZ);
            if (cap <= 0) return 0.0;
            const dVal = Fluid.depthAt(qAx, qAy, qX, qY, qZ);
            return Math.min(1.0, Math.max(0.0, dVal / cap));
        },

        fluidPhysicalHeightStateAt(a, b, c, d, e) {
            parseCoords(a, b, c, d, e);
            const dVal = Fluid.depthAt(qAx, qAy, qX, qY, qZ);
            if (dVal <= 0) return 0;
            const cap = Fluid.fluidCapacityAt(qAx, qAy, qX, qY, qZ);
            const openStrata = FLUID_TO_STRATA[cap];
            const fluidStrata = FLUID_TO_STRATA[dVal];
            return Math.min(openStrata, fluidStrata);
        },

        fluidPhysicalHeightStringAt(a, b, c, d, e) {
            const k = Fluid.fluidPhysicalHeightStateAt(a, b, c, d, e);
            return `FLUID_${k}_OF_5`;
        },

        fluidCanPassDown(a, b, c, d, e) {
            parseCoords(a, b, c, d, e);
            return canDrainDown(qAx, qAy, qX, qY, qZ);
        },

        fluidCanPassLaterally(a, b, c, d, e, dx, dy) {
            let stepX, stepY;
            if (typeof a === "object" && a !== null) {
                parseCoords(a);
                stepX = b | 0;
                stepY = c | 0;
            } else {
                parseCoords(a, b, c, d, e);
                stepX = dx | 0;
                stepY = dy | 0;
            }
            return fluidCanPassLaterally(qAx, qAy, qX, qY, qZ, stepX, stepY);
        },

        fluidTypeAt(a, b, c, d, e) {
            return Fluid.typeAt(a, b, c, d, e);
        },

        // Direct Coordinate Queries
        depthAt(a, b, c, d, e) {
            parseCoords(a, b, c, d, e);
            const data = getAreaData(qAx, qAy);
            if (qX < 0 || qY < 0 || qX >= data.size || qY >= data.size) return 0;
            const grid = data.grids.get(qZ);
            return grid ? getDepth(grid[qY * data.size + qX]) : 0;
        },

        typeAt(a, b, c, d, e) {
            parseCoords(a, b, c, d, e);
            const data = getAreaData(qAx, qAy);
            if (qX < 0 || qY < 0 || qX >= data.size || qY >= data.size) return null;
            const grid = data.grids.get(qZ);
            const val = grid ? grid[qY * data.size + qX] : 0;
            return getDepth(val) > 0 ? typeName(getType(val)) : null;
        },

        rawAt(ax, ay, x, y, z) {
            const data = getAreaData(ax, ay);
            const gridZ = data.grids.get(z | 0);
            if (!gridZ) return 0;
            return gridZ[(y | 0) * data.size + (x | 0)];
        },

        setCell(area, x, y, z, typeStr, depthVal) {
            const ax = area ? ((area.ax !== undefined ? area.ax : area.x) | 0) : 0;
            const ay = area ? ((area.ay !== undefined ? area.ay : area.y) | 0) : 0;
            const tCode = typeof typeStr === "number" ? typeStr : typeCode(typeStr);
            const cap = Fluid.fluidCapacityAt(ax, ay, x, y, z);
            const dClamped = tCode === TYPE_NONE ? 0 : Math.max(0, Math.min(cap, Math.trunc(depthVal) || 0));

            const data = getAreaData(ax, ay);
            const size = data.size;
            if (x < 0 || y < 0 || x >= size || y >= size || !inRange(z)) return;

            // Clearing a cell of a level that has no fluid writes nothing (its grid isn't made for zeros, WG.00.17).
            const gridZ = dClamped > 0 ? gridFor(data, z | 0) : data.grids.get(z | 0);
            const idx = (y | 0) * size + (x | 0);
            if (gridZ) {
                const packed = dClamped > 0 ? packVal(tCode, dClamped) : 0;
                gridZ[idx] = packed;
                data.floodGrids.get(z | 0)[idx] = dClamped > 0 ? tCode : 0;
            }
            data.revision++;

            wakeCellAndNeighbors(ax, ay, x, y, z);
        },

        isSubmerged(ref) {
            return this.depthAt(ref) >= DEPTH_MAX;
        },

        movementClass(ref) {
            const type = this.typeAt(ref);
            const depth = this.depthAt(ref);

            if (depth === 0 || !type) return "dry";
            if (type === "lava") return "lethal";
            if (depth <= 2) return "shallow";
            if (depth <= 4) return "wading";
            if (depth <= 6) return "deep";
            return "submerged";
        },

        walkable(ax, ay, x, y, zOrOpts = {}, opts = {}) {
            if (config._mutantIgnoreDepthWalk) return true;
            let z;
            if (typeof ax === "object") {
                if (typeof ay === "number") {
                    // (area, x, y, z, opts)
                    parseCoords(ax, ay, x, y);
                    opts = typeof zOrOpts === "object" ? zOrOpts : {};
                } else {
                    // (ref, opts)
                    parseCoords(ax);
                    opts = ay || {};
                }
                ax = qAx; ay = qAy; x = qX; y = qY; z = qZ;
            } else {
                opts = typeof zOrOpts === "object" ? zOrOpts : opts;
                z = typeof zOrOpts === "number" ? zOrOpts : (opts.z || 0);
            }
            const type = this.typeAt(ax, ay, x, y, z);
            if (!type) return true;

            const depth = this.depthAt(ax, ay, x, y, z);
            if (depth === 0) return true;

            if (type === "lava") return !!opts.lavaImmune;
            if (type === "water") {
                if (depth >= 5 && !opts.canSwim) return false;
                return true;
            }
            return true;
        },

        isFlooded(ref) {
            const d = this.depthAt(ref);
            const t = this.typeAt(ref);
            return {
                flooded: d > 0,
                type: t,
                depth: d
            };
        },

        getFloodGrid(area, z) {
            const ax = area ? ((area.ax !== undefined ? area.ax : area.x) | 0) : 0;
            const ay = area ? ((area.ay !== undefined ? area.ay : area.y) | 0) : 0;
            const data = getAreaData(ax, ay);
            if (!inRange(z | 0)) return null;
            return data.floodGrids.get(z | 0) || zeroGrid(data.n);   // a level without fluid: zeros (shared, read only)
        },

        step(area, budget) {
            const ax = area ? ((area.ax !== undefined ? area.ax : area.x) | 0) : 0;
            const ay = area ? ((area.ay !== undefined ? area.ay : area.y) | 0) : 0;
            const maxBudget = workBudget(budget);
            if (maxBudget === 0) {
                if (session) session.clearCost();
                return 0;
            }
            const sessionNow = hydroSession();
            const data = getAreaData(ax, ay);
            const lakeBudget = lakeShare(maxBudget, data.inQueue.size > 0);
            const lakeWork = sessionNow ? sessionNow.beginTick({ ax, ay, budget: maxBudget, lakeBudget }) : 0;
            const n = stepArea(ax, ay, maxBudget - lakeWork);
            if (sessionNow) sessionNow.noteProcessed(n);
            return n + lakeWork;
        },

        tick(budget) {
            if (!config.simulationActive) return 0;
            const t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();

            let totalProcessed = 0;
            const maxBudget = workBudget(budget);
            if (maxBudget === 0) {
                diag.cellsProcessedLastTick = 0;
                diag.lastTickMs = 0;
                if (session) session.clearCost();
                return 0;
            }
            syncRange();
            const sessionNow = hydroSession();
            const lakeBudget = lakeShare(maxBudget, activeAreas.size > 0);
            const lakeWork = sessionNow ? sessionNow.beginTick({ budget: maxBudget, lakeBudget }) : 0;
            let remaining = maxBudget - lakeWork;
            let areasLeft = activeAreas.size;
            // Round-robin only dirty areas. Never enumerate all allocated areas.
            // Visit each initially queued area at most once: work woken during
            // this pass must not acquire extra seep visits in the same tick.
            while (remaining > 0 && activeAreas.size > 0 && areasLeft-- > 0) {
                const data = activeAreas.values().next().value;
                activeAreas.delete(data);
                const n = stepArea(data.ax, data.ay, remaining);
                totalProcessed += n;
                remaining -= n;
                if (data.head < data.queue.length) activeAreas.add(data);
            }
            if (sessionNow) sessionNow.noteProcessed(totalProcessed);

            const elapsed = ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - t0;
            diag.ticks++;
            diag.cellsProcessedTotal += totalProcessed;
            diag.cellsProcessedLastTick = totalProcessed;
            diag.lastTickMs = elapsed;

            return totalProcessed + lakeWork;
        },

        enqueueCell(ax, ay, x, y, z) {
            enqueueCell(ax, ay, x, y, z);
        },

        wakeCellAndNeighbors(ax, ay, x, y, z) {
            wakeCellAndNeighbors(ax, ay, x, y, z);
        },

        diagnostics(ax, ay) {
            let activeQueueLen = 0;
            let totalWater = 0;
            let totalLava = 0;

            if (ax !== undefined && ay !== undefined) {
                const data = getAreaData(ax, ay);
                activeQueueLen = Math.max(0, data.queue.length - data.head);
                for (const g of data.grids.values()) {
                    {
                        for (let i = 0; i < g.length; i++) {
                            const val = g[i];
                            const d = getDepth(val);
                            const t = getType(val);
                            if (t === TYPE_WATER) totalWater += d;
                            else if (t === TYPE_LAVA) totalLava += d;
                        }
                    }
                }
            } else {
                for (const data of areas.values()) {
                    activeQueueLen += Math.max(0, data.queue.length - data.head);
                    for (const g of data.grids.values()) {
                        {
                            for (let i = 0; i < g.length; i++) {
                                const val = g[i];
                                const d = getDepth(val);
                                const t = getType(val);
                                if (t === TYPE_WATER) totalWater += d;
                                else if (t === TYPE_LAVA) totalLava += d;
                            }
                        }
                    }
                }
            }

            let gridsAllocated = 0, bytes = 0;
            for (const data of areas.values()) { gridsAllocated += data.grids.size; bytes += data.grids.size * 2 * data.n + data.inQueue.size * 8; }
            return {
                gridsAllocated,         // level grids made (each with its flood cache): only levels that had fluid (WG.00.17)
                bytes,                  // their bytes, and 8 B per queued flag (an estimate of the Set's data)
                areasCount: areas.size,
                activeQueueLength: activeQueueLen,
                cellsProcessedTotal: diag.cellsProcessedTotal,
                cellsProcessedLastTick: diag.cellsProcessedLastTick,
                lastTickMs: diag.lastTickMs,
                totalWaterVolume: totalWater,
                totalLavaVolume: totalLava,
                totalWaterMass: totalWater + pendingDisplaced.water + (session ? session.stored() : 0),
                totalLavaMass: totalLava + pendingDisplaced.lava + (session ? session.stored("lava") : 0),
                queueZMin: ax !== undefined && ay !== undefined ? getAreaData(ax, ay).zMin : null
            };
        },

        // Cross-layer water API (null when sim/hydro did not load).
        hydro() {
            const sessionNow = hydroSession();
            return sessionNow ? sessionNow.api : null;
        },

        reset() {
            areas.clear();
            activeAreas.clear();
            knownRange = { ...zRange() };
            pendingHydro = null;
            pendingDisplaced.water = pendingDisplaced.lava = 0;
            scheduleTick = 0;
            diag.ticks = 0;
            diag.cellsProcessedTotal = 0;
            diag.cellsProcessedLastTick = 0;
            diag.lastTickMs = 0;
            if (session) session.reset();
        },

        makeSaveContents() {
            const records = [];
            for (const [key, data] of areas.entries()) {
                const ax = data.ax, ay = data.ay, size = data.size;
                for (const z of Array.from(data.grids.keys()).sort((p, q) => p - q)) {   // lowest level first, as before WG.00.17
                    const g = data.grids.get(z);
                    if (!g) continue;
                    for (let i = 0; i < g.length; i++) {
                        const val = g[i];
                        const d = getDepth(val);
                        if (d > 0) {
                            const t = getType(val);
                            const x = i % size;
                            const y = Math.floor(i / size);
                            records.push([ax, ay, z, x, y, t, d]);
                        }
                    }
                }
            }
            const saved = {
                fluidSchemaVersion: 1,
                records
            };
            // Optional. Absent on a save written before SIM.50.02. Old readers keep using records.
            if (session) {
                const hydroState = session.exportState();
                if (hydroState) saved.hydro = hydroState;
            } else if (pendingHydro !== null) {
                saved.hydro = JSON.parse(JSON.stringify(pendingHydro));
            }
            if (pendingDisplaced.water > 0 || pendingDisplaced.lava > 0) {
                saved.pendingDisplaced = { v: 1, ...pendingDisplaced };
            }
            return saved;
        },

        extractSaveContents(saved) {
            this.reset();
            if (!saved) return;
            const records = Array.isArray(saved) ? saved : (saved.records && Array.isArray(saved.records) ? saved.records : []);

            for (let i = 0; i < records.length; i++) {
                const [ax, ay, z, x, y, t, d] = records[i];
                const data = getAreaData(ax, ay);
                const size = data.size;
                if (Number.isInteger(z) && x >= 0 && y >= 0 && x < size && y < size) {
                    const gridZ = gridFor(data, z);
                    if (gridZ) {
                        const idx = y * size + x;
                        gridZ[idx] = packVal(t, d);
                        data.floodGrids.get(z)[idx] = d > 0 ? t : 0;
                        // Re-enqueue active liquid cell and neighbors so flow seamlessly resumes
                        wakeCellAndNeighbors(ax, ay, x, y, z);
                    }
                }
            }
            if (saved && typeof saved === "object" && saved.hydro) {
                const sessionNow = hydroSession();
                if (sessionNow) sessionNow.importState(saved.hydro);
                else pendingHydro = JSON.parse(JSON.stringify(saved.hydro));
            }
            if (saved.pendingDisplaced) {
                for (const type of ["water", "lava"]) {
                    const n = saved.pendingDisplaced[type];
                    if (Number.isSafeInteger(n) && n > 0) pendingDisplaced[type] = n;
                }
            }
        },

        _configure(opts = {}) {
            Object.assign(config, opts);
        },

        // Re-bind onto the live window.UF. Map setup and layer-built events call this.
        attach() {
            return attachFluid();
        }
    };

    // sim/hydro is optional. A require() that throws (the attach regression's sandbox)
    // must leave the 0..7 solver running with no extra stores.
    let hydroMod;
    let session = null;

    function lakeShare(budget, hasFluid) {
        // Keep both solvers progressing, including a caller budget of one.
        scheduleTick++;
        return hasFluid ? (budget === 1 ? scheduleTick % 2 : Math.floor(budget / 2)) : budget;
    }

    function loadHydroModule() {
        if (hydroMod !== undefined) return hydroMod;
        hydroMod = null;
        if (typeof require !== "function") return null;
        try {
            const mod = require("../sim/hydro/index.js");
            if (mod && typeof mod.createSession === "function") hydroMod = mod;
        } catch (e) {
            hydroMod = null;
        }
        return hydroMod;
    }

    function sumWaterGrid() {
        let total = 0;
        for (const data of areas.values()) {
            for (const g of data.grids.values()) {
                for (let i = 0; i < g.length; i++) {
                    const val = g[i];
                    if (getType(val) === TYPE_WATER) total += getDepth(val);
                }
            }
        }
        return total;
    }

    function writeWaterCell(ax, ay, x, y, z, depth, allowSolid) {
        if (!inRange(z)) return 0;
        const data = getAreaData(ax, ay);
        const size = data.size;
        const xi = x | 0, yi = y | 0, zi = z | 0;
        if (xi < 0 || yi < 0 || xi >= size || yi >= size) return 0;
        const cap = Fluid.fluidCapacityAt(ax, ay, xi, yi, zi) | 0;
        if (cap <= 0 && !allowSolid) return 0;
        let d = depth | 0;
        if (d < 0) d = 0;
        const limit = (cap > 0 && !allowSolid) ? cap : DEPTH_MAX;
        if (d > limit) d = limit;
        const idx = yi * size + xi;
        if (d <= 0) {
            const gridZ = data.grids.get(zi);
            if (!gridZ) return 0;
            gridZ[idx] = 0;
            const flood = data.floodGrids.get(zi);
            if (flood) flood[idx] = 0;
            data.revision++;
            return 0;
        }
        const gridZ = gridFor(data, zi);
        const prev = gridZ[idx];
        if (getDepth(prev) > 0 && getType(prev) !== TYPE_WATER) return getDepth(prev);
        gridZ[idx] = packVal(TYPE_WATER, d);
        data.floodGrids.get(zi)[idx] = TYPE_WATER;
        data.revision++;
        return d;
    }

    function levelsApi() {
        const U = (typeof window !== "undefined" && window.UF) ? window.UF : UF;
        return U && U.Levels ? U.Levels : null;
    }

    function makeHydroIO() {
        return {
            depthAt: function (ax, ay, x, y, z) { return Fluid.depthAt(ax, ay, x, y, z); },
            typeAt: function (ax, ay, x, y, z) { return Fluid.typeAt(ax, ay, x, y, z); },
            capacityAt: function (ax, ay, x, y, z) { return Fluid.fluidCapacityAt(ax, ay, x, y, z); },
            blockedAt: isBarrier,
            objectBarrierAt: isObjectBarrier,
            canPassLaterally: function (ax, ay, x, y, z, nx, ny) {
                return fluidCanPassLaterally(ax, ay, x, y, z, nx, ny, z);
            },
            writeWater: writeWaterCell,
            wake: function (ax, ay, x, y, z) { wakeCellAndNeighbors(ax, ay, x, y, z); },
            zRange: zRange,
            inRange: inRange,
            size: function () { return getMapSize(); },
            inBounds: function (ax, ay, x, y) {
                const data = getAreaData(ax, ay);
                return (x | 0) >= 0 && (y | 0) >= 0 && (x | 0) < data.size && (y | 0) < data.size;
            },
            upOpen: function (ax, ay, x, y, z) {
                if (isObjectBarrier(ax, ay, x, y, z) || isBarrier(ax, ay, x, y, z + 1)) return false;
                const L = levelsApi();
                if (!L || typeof L.getStrataFluidPassage !== "function") return false;
                const bits = L.getStrataFluidPassage(ax, ay, x, y, z);
                return typeof bits === "number" && (bits & 16) !== 0;
            },
            materialAt: function (ax, ay, x, y, z) {
                const L = levelsApi();
                if (!L || typeof L.dominantMaterial !== "function") return null;
                try {
                    const key = L.dominantMaterial(ax, ay, x, y, z);
                    return key ? key : null;
                } catch (e) {
                    return null;
                }
            },
            gridWater: sumWaterGrid
        };
    }

    function hydroSession() {
        if (session) return session;
        const mod = loadHydroModule();
        if (!mod) return null;
        session = mod.createSession(makeHydroIO());
        return session;
    }

    function reconcileCellWithStrata(ax, ay, x, y, z) {
        if (!inRange(z)) return;
        const data = getAreaData(ax, ay);
        const size = data.size;
        if (x < 0 || y < 0 || x >= size || y >= size) return;

        const idx = y * size + x;
        const gridZ = data.grids.get(z);
        if (!gridZ) return;

        const val = gridZ[idx];
        let curDepth = getDepth(val);
        if (curDepth === 0) return;

        const type = getType(val);
        const cap = Fluid.fluidCapacityAt(ax, ay, x, y, z);

        if (curDepth > cap) {
            let excess = curDepth - cap;
            gridZ[idx] = cap > 0 ? packVal(type, cap) : 0;
            data.floodGrids.get(z)[idx] = cap > 0 ? type : 0;
            data.revision++;

            // Displace excess fluid into open neighbor or cell above to preserve mass conservation
            if (excess > 0) {
                if (z < zRange().zMax) {
                    const aboveCap = Fluid.fluidCapacityAt(ax, ay, x, y, z + 1);
                    const aboveDepth = Fluid.depthAt(ax, ay, x, y, z + 1);
                    const aboveType = Fluid.typeAt(ax, ay, x, y, z + 1);
                    const spaceAbove = aboveCap - aboveDepth;
                    if (spaceAbove > 0 && (aboveDepth === 0 || typeCode(aboveType) === type)) {
                        const move = Math.min(excess, spaceAbove);
                        Fluid.setCell({ x: ax, y: ay }, x, y, z + 1, typeName(type), aboveDepth + move);
                        excess -= move;
                    }
                }
                if (excess > 0) {
                    for (let d = 0; d < HORZ_DIRS.length && excess > 0; d++) {
                        const nx = x + HORZ_DIRS[d].dx, ny = y + HORZ_DIRS[d].dy;
                        if (nx >= 0 && ny >= 0 && nx < size && ny < size) {
                            const nCap = Fluid.fluidCapacityAt(ax, ay, nx, ny, z);
                            const nDepth = Fluid.depthAt(ax, ay, nx, ny, z);
                            const nType = Fluid.typeAt(ax, ay, nx, ny, z);
                            if (nCap > nDepth && (nDepth === 0 || typeCode(nType) === type)) {
                                const move = Math.min(excess, nCap - nDepth);
                                Fluid.setCell({ x: ax, y: ay }, nx, ny, z, typeName(type), nDepth + move);
                                excess -= move;
                            }
                        }
                    }
                }
                if (excess > 0) {
                    const sessionNow = hydroSession();
                    // D2-PENDING: retain the original type. No return path is
                    // chosen here, including when optional hydro is unavailable.
                    if (sessionNow) sessionNow.receiveDisplaced(excess, typeName(type));
                    else pendingDisplaced[typeName(type)] += excess;
                }
            }
        }
    }

    // --- Event Listeners: Change Creates Work ---
    // The Events bus we last hooked. A replaced bus (a new window.UF) hooks once;
    // a second map load on the same bus does not stack listeners.
    let hookedEvents = null;
    let attachTimer = null;
    let attachDeadline = null;

    function cancelAttachWait() {
        if (attachTimer !== null && typeof clearInterval === "function") clearInterval(attachTimer);
        if (attachDeadline !== null && typeof clearTimeout === "function") clearTimeout(attachDeadline);
        attachTimer = null;
        attachDeadline = null;
    }

    function liveNamespace() {
        return (typeof window !== "undefined" && window.UF) ? window.UF : UF;
    }

    function setupEventHooks() {
        const ns = liveNamespace();
        if (!ns || !ns.Events || typeof ns.Events.on !== "function") return false;
        if (hookedEvents === ns.Events) return true;
        hookedEvents = ns.Events;

        function handleGeometryChange(payload) {
            if (!payload) return;
            const a = payload.area || {};
            const ax = a.x !== undefined ? a.x : 0;
            const ay = a.y !== undefined ? a.y : 0;
            const x = payload.x | 0, y = payload.y | 0, z = payload.z | 0;
            reconcileCellWithStrata(ax, ay, x, y, z);
            wakeCellAndNeighbors(ax, ay, x, y, z);
        }

        ns.Events.on("levels:cellChanged", handleGeometryChange);
        ns.Events.on("levels:shapeChanged", handleGeometryChange);
        ns.Events.on("levels:strataChanged", handleGeometryChange);
        ns.Events.on("levels:strataDestroyed", handleGeometryChange);

        // Every area and underground layer load re-binds. Attaching does not write fluid.
        ns.Events.on("world:areaBuilt", function() { attachFluid(); });
        ns.Events.on("world:levelBuilt", function() { attachFluid(); });

        // Door State Changes
        ns.Events.on("doors:opened", function(door) {
            if (!door) return;
            const at = door.at || door;
            const a = at.area || {};
            const ax = a.x !== undefined ? a.x : 0;
            const ay = a.y !== undefined ? a.y : 0;
            const z = at.z !== undefined ? at.z : 0;
            wakeCellAndNeighbors(ax, ay, at.x | 0, at.y | 0, z | 0);
        });

        ns.Events.on("doors:closed", function(door) {
            if (!door) return;
            const at = door.at || door;
            const a = at.area || {};
            const ax = a.x !== undefined ? a.x : 0;
            const ay = a.y !== undefined ? a.y : 0;
            const z = at.z !== undefined ? at.z : 0;
            wakeCellAndNeighbors(ax, ay, at.x | 0, at.y | 0, z | 0);
        });

        ns.Events.on("doors:broken", function(door) {
            if (!door) return;
            const at = door.at || door;
            const a = at.area || {};
            const ax = a.x !== undefined ? a.x : 0;
            const ay = a.y !== undefined ? a.y : 0;
            const z = at.z !== undefined ? at.z : 0;
            wakeCellAndNeighbors(ax, ay, at.x | 0, at.y | 0, z | 0);
        });
        return true;
    }

    // Publish the solver on the live namespace and hook its bus.
    // Returns true once listeners are on the current bus. Binding itself
    // writes no cells, so a map or layer load cannot create water.
    function attachFluid() {
        UF = bindSharedNamespace();
        if (UF) UF.Fluid = Fluid;
        const hooked = setupEventHooks();
        if (hooked) cancelAttachWait();
        return hooked;
    }

    function ensureAttached() {
        if (attachFluid()) return true;
        if (attachTimer !== null || typeof setInterval !== "function") return false;
        attachTimer = setInterval(function() { attachFluid(); }, 100);
        if (typeof setTimeout === "function") {
            attachDeadline = setTimeout(function() { cancelAttachWait(); }, 5000);
        }
        return false;
    }

    // --- Save/Load Engine Hooks ---
    if (typeof DataManager !== "undefined") {
        const _DataManager_makeSaveContents = DataManager.makeSaveContents;
        DataManager.makeSaveContents = function() {
            const contents = _DataManager_makeSaveContents.call(this);
            const saved = Fluid.makeSaveContents();
            contents.deusFluid = saved;
            contents.ufFluid = saved;
            return contents;
        };

        const _DataManager_extractSaveContents = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function(contents) {
            _DataManager_extractSaveContents.call(this, contents);
            Fluid.extractSaveContents(contents && (contents.deusFluid || contents.ufFluid));
        };
    }

    // --- RMMZ Map Update Hook ---
    if (typeof Game_Map !== "undefined" && Game_Map.prototype) {
        const _Game_Map_update = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            _Game_Map_update.call(this, sceneActive);
            Fluid.tick();
        };
        // Each map load is a layer load (one map id per level). Re-bind there.
        if (typeof Game_Map.prototype.setup === "function") {
            const _Game_Map_setup = Game_Map.prototype.setup;
            Game_Map.prototype.setup = function(mapId) {
                _Game_Map_setup.call(this, mapId);
                attachFluid();
            };
        }
    }

    // Register on window.UF. Events may not exist yet (Core assigns them after
    // require returns); ensureAttached retries until the bus is there.
    ensureAttached();

    if (typeof module !== "undefined" && module.exports) {
        module.exports = Fluid;
    }
})();
