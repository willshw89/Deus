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
 *    - Quiescent fluid (calm lake, settled basin) costs 0 CPU per tick.
 *    - Event-driven wakeup: digging, mining, wall building/demolition,
 *      or door opening wakes affected cells and their 3D orthogonal neighbors.
 *    - Bounded per-tick processing budget (default 512 cells/tick) guarantees
 *      60 FPS at 4x simulation speed.
 *
 * 3. 3D Elevation Flow:
 *    - Operates across 5 Z-levels: [-2, -1, 0, 1, 2].
 *    - Priority 1: Vertical gravity downward transfer into Z - 1.
 *    - Priority 2: Lateral equalization across orthogonal horizontal neighbors.
 *    - Strict conservation: Zero liquid volume duplication or deletion.
 *
 * 4. Sparse Persistence:
 *    - Only non-zero depth cells are saved.
 *    - Dynamic state seamlessly resumes upon loading.
 */

var Imported = Imported || {};
Imported.DEUS_Fluid = true;

var UF = UF || {};

(function() {
    "use strict";

    // --- Constants ---
    const DEPTH_MAX = 7;
    const TYPE_NONE = 0;
    const TYPE_WATER = 1;
    const TYPE_LAVA = 2;

    const DEFAULT_BUDGET = 512;
    const Z_MIN = -2;
    const Z_MAX = 2;
    const Z_LEVELS = 5; // -2, -1, 0, 1, 2

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

    // Allocate or retrieve area fluid data
    function getAreaData(ax, ay) {
        const key = areaKey(ax, ay);
        let data = areas.get(key);
        if (!data) {
            const size = getMapSize();
            const n = size * size;
            const totalCells = Z_LEVELS * n;
            data = {
                ax: ax | 0,
                ay: ay | 0,
                size: size,
                n: n,
                grids: new Map(),       // z -> Uint8Array(n)
                floodGrids: new Map(),  // z -> Uint8Array(n) (legacy visual cache: 1=water, 2=lava)
                queue: [],              // cell indices: (zIdx * n + idx)
                head: 0,
                inQueue: new Uint8Array(totalCells),
                revision: 1
            };
            // Pre-allocate 5 Z-levels
            for (let z = Z_MIN; z <= Z_MAX; z++) {
                data.grids.set(z, new Uint8Array(n));
                data.floodGrids.set(z, new Uint8Array(n));
            }
            areas.set(key, data);
        }
        return data;
    }

    function cellIdOf(size, x, y, z) {
        const zIdx = (z - Z_MIN) | 0;
        return zIdx * (size * size) + ((y | 0) * size + (x | 0));
    }

    function coordsOf(size, cellId) {
        const n = size * size;
        const zIdx = Math.floor(cellId / n);
        const z = zIdx + Z_MIN;
        const rem = cellId - zIdx * n;
        const x = rem % size;
        const y = Math.floor(rem / size);
        return { x, y, z };
    }

    // --- Enqueueing & Wakeup ---
    function enqueueCell(ax, ay, x, y, z) {
        if (z < Z_MIN || z > Z_MAX) return;
        const data = getAreaData(ax, ay);
        const size = data.size;
        if (x < 0 || y < 0 || x >= size || y >= size) return;

        const cellId = cellIdOf(size, x, y, z);
        if (data.inQueue[cellId] === 1) return; // Already dirty and queued

        data.inQueue[cellId] = 1;
        data.queue.push(cellId);
    }

    function wakeCellAndNeighbors(ax, ay, x, y, z) {
        enqueueCell(ax, ay, x, y, z);
        for (let i = 0; i < NEIGHBORS_3D.length; i++) {
            const [dx, dy, dz] = NEIGHBORS_3D[i];
            enqueueCell(ax, ay, x + dx, y + dy, z + dz);
        }
    }

    // --- Barrier & Geometry Checks ---
    function isBarrier(ax, ay, x, y, z) {
        if (config._mutantIgnoreWalls) return false;

        const L = window.UF && UF.Levels;
        if (L) {
            if (typeof L.shapeAt === "function") {
                const s = L.shapeAt(ax, ay, x, y, z);
                if (s === "solid") return true;
            } else if (typeof L.shapeCodeAt === "function") {
                const sc = L.shapeCodeAt(ax, ay, x, y, z);
                if (sc === 1) return true; // 1 = SOLID
            }
        }

        const W = window.UF && UF.World;
        if (W) {
            const objId = typeof W.getObject === "function" ? W.getObject(ax, ay, x, y, z) : 0;
            if (objId) {
                const O = window.UF && UF.Objects;
                const obj = O && typeof O.type === "function" ? O.type(objId) : null;
                if (obj) {
                    if (obj.autotile === "wall" || (Array.isArray(obj.tags) && obj.tags.includes("wall"))) {
                        return true;
                    }
                    const D = window.UF && UF.Doors;
                    if ((Array.isArray(obj.tags) && obj.tags.includes("door")) || (D && typeof D.isDoorType === "function" && D.isDoorType(obj))) {
                        const isOpen = D && typeof D.isOpen === "function" && D.isOpen({ x: ax, y: ay, z }, x, y);
                        if (!isOpen) return true;
                    }
                }
            }
        }
        return false;
    }

    function canDrainDown(ax, ay, x, y, z) {
        if (config._mutantNoGravity) return false;
        if (z <= Z_MIN) return false; // Bottom of the world (-2)

        // Cell directly below must NOT be a barrier (solid rock or wall)
        if (isBarrier(ax, ay, x, y, z - 1)) return false;

        const L = window.UF && UF.Levels;
        if (L && typeof L.shapeAt === "function") {
            const s = L.shapeAt(ax, ay, x, y, z);
            if (s === "open" || s === "channel") return true;
            if (s === "solid") return false;
        }

        // On ground (z=0) or underground (z=-1):
        // If the space below is excavated / open / floor, downward breach occurs.
        if (z <= 0) return true;

        // On upper levels (z > 0), air is open by default unless shape is solid/floor
        return true;
    }

    // --- Simulation Core Step ---
    function stepArea(ax, ay, budget) {
        const data = getAreaData(ax, ay);
        const queue = data.queue;
        const size = data.size;
        const n = data.n;
        const maxBudget = budget !== undefined ? budget : config.budget;

        if (data.head >= queue.length) {
            // Queue is quiescent! Stable state costs nothing.
            if (queue.length > 0) {
                queue.length = 0;
                data.head = 0;
            }
            return 0;
        }

        let processed = 0;
        const initialHead = data.head;
        const limit = Math.min(queue.length, initialHead + maxBudget);

        while (data.head < limit) {
            const cellId = queue[data.head++];
            data.inQueue[cellId] = 0;
            processed++;

            const { x, y, z } = coordsOf(size, cellId);
            const gridZ = data.grids.get(z);
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
                const gridBelow = data.grids.get(belowZ);
                if (gridBelow) {
                    const belowVal = gridBelow[idx];
                    let belowDepth = getDepth(belowVal);
                    const belowType = getType(belowVal);

                    // Transfer if destination is dry OR matches liquid type
                    if (belowDepth < DEPTH_MAX && (belowDepth === 0 || belowType === type)) {
                        let transferAmt = Math.min(depth, DEPTH_MAX - belowDepth);
                        if (config._mutantDuplicate) transferAmt += 1;
                        if (config._mutantDelete) transferAmt = Math.max(0, transferAmt - 1);

                        if (transferAmt > 0) {
                            depth -= transferAmt;
                            belowDepth += transferAmt;

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

                    const nx = x + HORZ_DIRS[d].dx;
                    const ny = y + HORZ_DIRS[d].dy;

                    if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
                    if (isBarrier(ax, ay, nx, ny, z)) continue;

                    const nIdx = ny * size + nx;
                    const nVal = gridZ[nIdx];
                    let nDepth = getDepth(nVal);
                    const nType = getType(nVal);

                    // Liquid types must match or neighbor must be dry (no mixing in V1)
                    if (nDepth > 0 && nType !== type) continue;

                    if (depth > nDepth + 1) {
                        let diff = depth - nDepth;
                        let transferAmt = Math.floor(diff / 2);
                        if (config._mutantDuplicate) transferAmt += 1;
                        if (config._mutantDelete) transferAmt = Math.max(0, transferAmt - 1);

                        if (transferAmt > 0) {
                            depth -= transferAmt;
                            nDepth += transferAmt;

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
        }

        // Compact queue if head progressed significantly
        if (data.head >= 2048) {
            data.queue = data.queue.slice(data.head);
            data.head = 0;
        }

        return processed;
    }

    // --- Public API ---
    const Fluid = {
        DEPTH_MAX,
        TYPE_NONE,
        TYPE_WATER,
        TYPE_LAVA,

        // Direct Coordinate Queries
        depthAt(ax, ay, x, y, z) {
            let coords;
            if (typeof ax === "object" && ax !== null) {
                const r = ax;
                const a = r.area || {};
                coords = {
                    ax: (a.x !== undefined ? a.x : (r.ax !== undefined ? r.ax : 0)) | 0,
                    ay: (a.y !== undefined ? a.y : (r.ay !== undefined ? r.ay : 0)) | 0,
                    x: (r.x !== undefined ? r.x : 0) | 0,
                    y: (r.y !== undefined ? r.y : 0) | 0,
                    z: (r.z !== undefined ? r.z : 0) | 0
                };
            } else {
                coords = {
                    ax: ax | 0,
                    ay: ay | 0,
                    x: x | 0,
                    y: y | 0,
                    z: (z !== undefined ? z : 0) | 0
                };
            }

            if (coords.z < Z_MIN || coords.z > Z_MAX) return 0;
            const data = getAreaData(coords.ax, coords.ay);
            const size = data.size;
            if (coords.x < 0 || coords.y < 0 || coords.x >= size || coords.y >= size) return 0;

            const gridZ = data.grids.get(coords.z);
            if (!gridZ) return 0;
            return getDepth(gridZ[coords.y * size + coords.x]);
        },

        typeAt(ax, ay, x, y, z) {
            let coords;
            if (typeof ax === "object" && ax !== null) {
                const r = ax;
                const a = r.area || {};
                coords = {
                    ax: (a.x !== undefined ? a.x : (r.ax !== undefined ? r.ax : 0)) | 0,
                    ay: (a.y !== undefined ? a.y : (r.ay !== undefined ? r.ay : 0)) | 0,
                    x: (r.x !== undefined ? r.x : 0) | 0,
                    y: (r.y !== undefined ? r.y : 0) | 0,
                    z: (r.z !== undefined ? r.z : 0) | 0
                };
            } else {
                coords = {
                    ax: ax | 0,
                    ay: ay | 0,
                    x: x | 0,
                    y: y | 0,
                    z: (z !== undefined ? z : 0) | 0
                };
            }

            if (coords.z < Z_MIN || coords.z > Z_MAX) return null;
            const data = getAreaData(coords.ax, coords.ay);
            const size = data.size;
            if (coords.x < 0 || coords.y < 0 || coords.x >= size || coords.y >= size) return null;

            const gridZ = data.grids.get(coords.z);
            if (!gridZ) return null;
            const val = gridZ[coords.y * size + coords.x];
            const d = getDepth(val);
            if (d === 0) return null;
            return typeName(getType(val));
        },

        rawAt(ax, ay, x, y, z) {
            const data = getAreaData(ax, ay);
            const gridZ = data.grids.get(z | 0);
            if (!gridZ) return 0;
            return gridZ[(y | 0) * data.size + (x | 0)];
        },

        setCell(area, x, y, z, typeStr, depthVal) {
            const ax = area ? (area.x | 0) : 0, ay = area ? (area.y | 0) : 0;
            const tCode = typeof typeStr === "number" ? typeStr : typeCode(typeStr);
            const dClamped = Math.max(0, Math.min(DEPTH_MAX, depthVal | 0));

            const data = getAreaData(ax, ay);
            const size = data.size;
            if (x < 0 || y < 0 || x >= size || y >= size || z < Z_MIN || z > Z_MAX) return;

            const gridZ = data.grids.get(z | 0);
            if (!gridZ) return;

            const idx = (y | 0) * size + (x | 0);
            const packed = dClamped > 0 ? packVal(tCode, dClamped) : 0;
            gridZ[idx] = packed;
            data.floodGrids.get(z | 0)[idx] = dClamped > 0 ? tCode : 0;
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

        walkable(ax, ay, x, y, opts = {}) {
            if (config._mutantIgnoreDepthWalk) return true;

            const z = opts.z !== undefined ? (opts.z | 0) : 0;
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
            const ax = area ? (area.x | 0) : 0, ay = area ? (area.y | 0) : 0;
            const data = getAreaData(ax, ay);
            return data.floodGrids.get(z | 0) || null;
        },

        step(area, budget) {
            const ax = area ? (area.x | 0) : 0, ay = area ? (area.y | 0) : 0;
            return stepArea(ax, ay, budget);
        },

        tick(budget) {
            if (!config.simulationActive) return 0;
            const t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();

            let totalProcessed = 0;
            const W = window.UF && UF.World;
            const view = W && typeof W.viewLevel === "function" ? W.viewLevel() : null;

            if (view) {
                totalProcessed += stepArea(view.x, view.y, budget);
            } else {
                for (const [key, data] of areas.entries()) {
                    totalProcessed += stepArea(data.ax, data.ay, budget);
                }
            }

            const elapsed = ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - t0;
            diag.ticks++;
            diag.cellsProcessedTotal += totalProcessed;
            diag.cellsProcessedLastTick = totalProcessed;
            diag.lastTickMs = elapsed;

            return totalProcessed;
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
                for (let z = Z_MIN; z <= Z_MAX; z++) {
                    const g = data.grids.get(z);
                    if (g) {
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
                    for (let z = Z_MIN; z <= Z_MAX; z++) {
                        const g = data.grids.get(z);
                        if (g) {
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

            return {
                areasCount: areas.size,
                activeQueueLength: activeQueueLen,
                cellsProcessedTotal: diag.cellsProcessedTotal,
                cellsProcessedLastTick: diag.cellsProcessedLastTick,
                lastTickMs: diag.lastTickMs,
                totalWaterVolume: totalWater,
                totalLavaVolume: totalLava
            };
        },

        reset() {
            areas.clear();
            diag.ticks = 0;
            diag.cellsProcessedTotal = 0;
            diag.cellsProcessedLastTick = 0;
            diag.lastTickMs = 0;
        },

        makeSaveContents() {
            const records = [];
            for (const [key, data] of areas.entries()) {
                const ax = data.ax, ay = data.ay, size = data.size;
                for (let z = Z_MIN; z <= Z_MAX; z++) {
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
            return records;
        },

        extractSaveContents(records) {
            this.reset();
            if (!Array.isArray(records)) return;

            for (let i = 0; i < records.length; i++) {
                const [ax, ay, z, x, y, t, d] = records[i];
                const data = getAreaData(ax, ay);
                const size = data.size;
                if (z >= Z_MIN && z <= Z_MAX && x >= 0 && y >= 0 && x < size && y < size) {
                    const gridZ = data.grids.get(z);
                    if (gridZ) {
                        const idx = y * size + x;
                        gridZ[idx] = packVal(t, d);
                        data.floodGrids.get(z)[idx] = d > 0 ? t : 0;
                        // Re-enqueue active liquid cell and neighbors so flow seamlessly resumes
                        wakeCellAndNeighbors(ax, ay, x, y, z);
                    }
                }
            }
        },

        _configure(opts = {}) {
            Object.assign(config, opts);
        }
    };

    // --- Event Listeners: Change Creates Work ---
    function setupEventHooks() {
        if (!window.UF || !UF.Events || typeof UF.Events.on !== "function") return;

        // Terrain & Shape Mutations
        UF.Events.on("levels:cellChanged", function(payload) {
            if (!payload) return;
            const a = payload.area || {};
            const ax = a.x !== undefined ? a.x : 0;
            const ay = a.y !== undefined ? a.y : 0;
            wakeCellAndNeighbors(ax, ay, payload.x | 0, payload.y | 0, payload.z | 0);
        });

        UF.Events.on("levels:shapeChanged", function(payload) {
            if (!payload) return;
            const a = payload.area || {};
            const ax = a.x !== undefined ? a.x : 0;
            const ay = a.y !== undefined ? a.y : 0;
            wakeCellAndNeighbors(ax, ay, payload.x | 0, payload.y | 0, payload.z | 0);
        });

        // Door State Changes
        UF.Events.on("doors:opened", function(door) {
            if (!door) return;
            const at = door.at || door;
            const a = at.area || {};
            const ax = a.x !== undefined ? a.x : 0;
            const ay = a.y !== undefined ? a.y : 0;
            const z = at.z !== undefined ? at.z : 0;
            wakeCellAndNeighbors(ax, ay, at.x | 0, at.y | 0, z | 0);
        });

        UF.Events.on("doors:closed", function(door) {
            if (!door) return;
            const at = door.at || door;
            const a = at.area || {};
            const ax = a.x !== undefined ? a.x : 0;
            const ay = a.y !== undefined ? a.y : 0;
            const z = at.z !== undefined ? at.z : 0;
            wakeCellAndNeighbors(ax, ay, at.x | 0, at.y | 0, z | 0);
        });

        UF.Events.on("doors:broken", function(door) {
            if (!door) return;
            const at = door.at || door;
            const a = at.area || {};
            const ax = a.x !== undefined ? a.x : 0;
            const ay = a.y !== undefined ? a.y : 0;
            const z = at.z !== undefined ? at.z : 0;
            wakeCellAndNeighbors(ax, ay, at.x | 0, at.y | 0, z | 0);
        });
    }

    if (window.UF && UF.Events) {
        setupEventHooks();
    } else {
        // Deferred hook check
        const _initCheck = setInterval(function() {
            if (window.UF && UF.Events) {
                setupEventHooks();
                clearInterval(_initCheck);
            }
        }, 100);
        if (typeof setTimeout !== "undefined") {
            setTimeout(() => clearInterval(_initCheck), 5000);
        }
    }

    // --- Save/Load Engine Hooks ---
    if (typeof DataManager !== "undefined") {
        const _DataManager_makeSaveContents = DataManager.makeSaveContents;
        DataManager.makeSaveContents = function() {
            const contents = _DataManager_makeSaveContents.call(this);
            contents.deusFluid = Fluid.makeSaveContents();
            return contents;
        };

        const _DataManager_extractSaveContents = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function(contents) {
            _DataManager_extractSaveContents.call(this, contents);
            if (contents && contents.deusFluid) {
                Fluid.extractSaveContents(contents.deusFluid);
            }
        };
    }

    // --- RMMZ Map Update Hook ---
    if (typeof Game_Map !== "undefined" && Game_Map.prototype) {
        const _Game_Map_update = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            _Game_Map_update.call(this, sceneActive);
            Fluid.tick();
        };
    }

    // Register on window.UF
    UF.Fluid = Fluid;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = Fluid;
    }
})();
