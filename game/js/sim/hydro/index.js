"use strict";

// Cross-layer water ledger. Cell depth stays in DEUS_Fluid. This module counts
// the other stores (aquifers, atmosphere, displaced) and decides transfers.
// Every transfer debits one counted store and credits another. A refused
// transfer stays where it was. No host globals.

const permeability = require("./permeability.js");

const DIRS = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0]
];

function cellKey(ax, ay, x, y, z) {
    return (ax | 0) + "," + (ay | 0) + "," + (x | 0) + "," + (y | 0) + "," + (z | 0);
}

function columnId(ax, ay, x, y) {
    return "col:" + (ax | 0) + ":" + (ay | 0) + ":" + (x | 0) + ":" + (y | 0);
}

function asInt(n) {
    if (typeof n !== "number" || !Number.isInteger(n)) return 0;
    return n;
}

function defaultSeason() {
    return { precipitation: 0 };
}

// Catalogue loader. Null when the data file or the materials reader cannot be
// required (a sandboxed plugin load that refuses require). Callers then seep nothing.
let catalogueApi;
function loadCatalogueMaterials() {
    if (catalogueApi !== undefined) return catalogueApi;
    catalogueApi = null;
    try {
        const { createMaterials } = require("../materials.js");
        const catalogue = require("../../../data/sim/materials.json");
        catalogueApi = createMaterials({ catalogue: catalogue, masses: {}, interactions: {} });
    } catch (e) {
        catalogueApi = null;
    }
    return catalogueApi;
}

function createSession(io) {
    const aquifers = new Map();
    const springs = new Map();
    const lakes = [];
    // Rebuilt on lake definition/rate changes, never by the tick. Each area
    // and the all-area schedule has independent cursors and an evap-only list.
    const lakeAreas = new Map();
    let lakeIndex = { all: [], evap: [], allCursor: 0, evapCursor: 0 };
    const visits = new Map();
    const waiters = new Map();
    const mutants = {
        createWater: false,
        deleteEvap: false,
        floodSolid: false,
        fullScan: false,
        ignorePerm: false
    };
    let atmosphere = 0;
    let displaced = 0;
    let displacedLava = 0;
    let seasonInput = defaultSeason;
    let tick = 0;
    let examined = 0;
    let processed = 0;
    let lakeVisits = 0;

    function examine(n) {
        examined += (n === undefined ? 1 : n);
    }

    function aquiferRow(id, create) {
        const key = String(id);
        let row = aquifers.get(key);
        if (!row && create) {
            row = { stored: 0, defined: false };
            aquifers.set(key, row);
        }
        return row || null;
    }

    function storedAquifers() {
        let n = 0;
        for (const row of aquifers.values()) n += row.stored;
        return n;
    }

    function stored(type) {
        if (type === "lava") return displacedLava;
        return storedAquifers() + atmosphere + displaced;
    }

    function debitAquifer(id, n) {
        const row = aquiferRow(id, false);
        const want = asInt(n);
        if (!row || want <= 0) return 0;
        if (mutants.createWater) return want;
        const take = Math.min(row.stored, want);
        row.stored -= take;
        return take;
    }

    function creditAquifer(id, n) {
        const add = asInt(n);
        if (add <= 0) return;
        const row = aquiferRow(id, true);
        row.stored += add;
    }

    function permAt(ax, ay, x, y, z) {
        if (typeof io.materialAt !== "function") return 0;
        const token = io.materialAt(ax, ay, x, y, z);
        let record = null;
        if (typeof token === "string" || typeof token === "number") {
            const api = loadCatalogueMaterials();
            record = api && typeof api.material === "function" ? api.material(token) : null;
        } else {
            record = token;
        }
        let perm = permeability.permOf(record);
        if (perm === 0 && mutants.ignorePerm) perm = 3;
        return perm;
    }

    function placeInto(ax, ay, x, y, z, amt) {
        const want = asInt(amt);
        if (want <= 0) return 0;
        examine(1);
        if (typeof io.inRange === "function" && !io.inRange(z)) return 0;
        if (typeof io.inBounds === "function" && !io.inBounds(ax, ay, x, y)) return 0;
        if (!mutants.floodSolid && typeof io.blockedAt === "function" && io.blockedAt(ax, ay, x, y, z)) return 0;
        const type = io.typeAt(ax, ay, x, y, z);
        if (type && type !== "water") return 0;
        const cap = io.capacityAt(ax, ay, x, y, z) | 0;
        const depth = io.depthAt(ax, ay, x, y, z) | 0;
        if (cap <= 0) {
            if (!mutants.floodSolid) return 0;
            const room = 7 - depth;
            if (room <= 0) return 0;
            const take = Math.min(want, room);
            io.writeWater(ax, ay, x, y, z, depth + take, true);
            io.wake(ax, ay, x, y, z);
            return take;
        }
        const room = cap - depth;
        if (room <= 0) return 0;
        const take = Math.min(want, room);
        io.writeWater(ax, ay, x, y, z, depth + take, false);
        io.wake(ax, ay, x, y, z);
        return take;
    }

    // Fill this cell, then lateral neighbors, then the cell above when UP is open.
    // Returns du actually placed. The caller keeps the rest.
    function deliver(ax, ay, x, y, z, amt) {
        let left = asInt(amt);
        if (left <= 0) return 0;
        // Rain cannot teleport from a blocked origin to the other side of it.
        if (!mutants.floodSolid && typeof io.blockedAt === "function" && io.blockedAt(ax, ay, x, y, z)) return 0;
        left -= placeInto(ax, ay, x, y, z, left);
        for (let i = 0; i < DIRS.length && left > 0; i++) {
            const nx = x + DIRS[i][0], ny = y + DIRS[i][1];
            examine(1);
            if (typeof io.canPassLaterally === "function" && !io.canPassLaterally(ax, ay, x, y, z, nx, ny)) continue;
            left -= placeInto(ax, ay, nx, ny, z, left);
        }
        if (left > 0 && typeof io.upOpen === "function" && io.upOpen(ax, ay, x, y, z)) {
            left -= placeInto(ax, ay, x, y, z + 1, left);
        }
        return asInt(amt) - left;
    }

    function watch(rx, ry, rz, src, ax, ay) {
        const rk = cellKey(ax, ay, rx, ry, rz);
        let bag = waiters.get(rk);
        if (!bag) {
            bag = new Map();
            waiters.set(rk, bag);
        }
        bag.set(cellKey(ax, ay, src.x, src.y, src.z), {
            ax: ax, ay: ay, x: src.x, y: src.y, z: src.z
        });
    }

    function feedOutlet(ax, ay, x, y, z) {
        const spring = springs.get(cellKey(ax, ay, x, y, z));
        if (!spring) return;
        if (spring.fedTick === tick) return;
        spring.fedTick = tick;
        const cap = io.capacityAt(ax, ay, x, y, z) | 0;
        const depth = io.depthAt(ax, ay, x, y, z) | 0;
        const type = io.typeAt(ax, ay, x, y, z);
        if (type && type !== "water") return;
        if (cap <= 0 && !mutants.floodSolid) return;
        const room = cap > 0 ? (cap - depth) : (7 - depth);
        if (room <= 0) return;
        const rate = spring.rate > 0 ? spring.rate : 1;
        const want = Math.min(rate, room);
        const taken = debitAquifer(spring.aquifer, want);
        if (taken <= 0) return;
        const placed = deliver(ax, ay, x, y, z, taken);
        const refused = taken - placed;
        if (refused > 0 && !mutants.createWater) creditAquifer(spring.aquifer, refused);
        const row = aquiferRow(spring.aquifer, false);
        const left = row ? row.stored : 0;
        const now = io.depthAt(ax, ay, x, y, z) | 0;
        const nowCap = io.capacityAt(ax, ay, x, y, z) | 0;
        if (left > 0 && nowCap > now) io.wake(ax, ay, x, y, z);
    }

    // Walk down through porous plugs (capacity 0, perm 1..5). Stop at an open
    // cell, an impermeable plug, or the bottom of the range (column aquifer).
    function seepFrom(ax, ay, x, y, z) {
        const depth = io.depthAt(ax, ay, x, y, z) | 0;
        if (depth <= 0 || io.typeAt(ax, ay, x, y, z) !== "water") return;
        if (typeof io.objectBarrierAt === "function" && io.objectBarrierAt(ax, ay, x, y, z)) return;
        const range = io.zRange();
        const span = (range.zMax - range.zMin + 1) | 0;
        let zz = (z | 0) - 1;
        let tight = 6;
        let steps = 0;
        let receiver = null;
        while (steps < span && zz >= range.zMin) {
            steps++;
            examine(1);
            // Porous terrain is still a seep plug; constructed walls and
            // closed doors are barriers at every point along that column.
            if (typeof io.objectBarrierAt === "function" && io.objectBarrierAt(ax, ay, x, y, zz)) return;
            const cap = io.capacityAt(ax, ay, x, y, zz) | 0;
            if (cap > 0) {
                receiver = zz;
                break;
            }
            const perm = permAt(ax, ay, x, y, zz);
            if (perm <= 0 || perm >= 6) return;
            if (perm < tight) tight = perm;
            zz -= 1;
        }
        if (tight <= 0 || tight >= 6) return;
        const key = cellKey(ax, ay, x, y, z);
        const visit = (visits.get(key) || 0) + 1;
        visits.set(key, visit);
        const quantum = permeability.seepQuantum(tight, visit);
        if (receiver === null) {
            if (quantum <= 0) {
                io.wake(ax, ay, x, y, z);
                return;
            }
            const amt = Math.min(depth, quantum);
            const left = io.writeWater(ax, ay, x, y, z, depth - amt, false);
            if (left !== depth - amt) return;
            creditAquifer(columnId(ax, ay, x, y), amt);
            if (depth - amt > 0) io.wake(ax, ay, x, y, z);
            return;
        }
        const room = (io.capacityAt(ax, ay, x, y, receiver) | 0) - (io.depthAt(ax, ay, x, y, receiver) | 0);
        const belowType = io.typeAt(ax, ay, x, y, receiver);
        if (belowType && belowType !== "water") return;
        if (room <= 0) {
            watch(x, y, receiver, { x: x, y: y, z: z }, ax, ay);
            return;
        }
        if (quantum <= 0) {
            io.wake(ax, ay, x, y, z);
            return;
        }
        const amt = Math.min(depth, quantum, room);
        if (amt <= 0) return;
        const destBefore = io.depthAt(ax, ay, x, y, receiver) | 0;
        const left = io.writeWater(ax, ay, x, y, z, depth - amt, false);
        if (left !== depth - amt) return;
        const destAfter = io.writeWater(ax, ay, x, y, receiver, destBefore + amt, false);
        if (destAfter !== destBefore + amt) {
            io.writeWater(ax, ay, x, y, z, depth, false);
            return;
        }
        io.wake(ax, ay, x, y, receiver);
        if (depth - amt > 0) io.wake(ax, ay, x, y, z);
    }

    function rebuildLakeIndex() {
        lakeAreas.clear();
        lakeIndex = { all: [], evap: [], allCursor: 0, evapCursor: 0 };
        for (let i = 0; i < lakes.length; i++) {
            const lake = lakes[i];
            for (let c = 0; c < lake.cells.length; c++) {
                const cell = lake.cells[c];
                const key = cell.ax + "," + cell.ay;
                let area = lakeAreas.get(key);
                if (!area) lakeAreas.set(key, area = { all: [], evap: [], allCursor: 0, evapCursor: 0 });
                const item = { lake, cell };
                area.all.push(item);
                lakeIndex.all.push(item);
                if (lake.evap > 0) {
                    area.evap.push(item);
                    lakeIndex.evap.push(item);
                }
            }
        }
    }

    function precipitation() {
        let spec;
        try {
            spec = seasonInput({ tick: tick });
        } catch (e) {
            return 0;
        }
        const n = spec && typeof spec === "object" ? spec.precipitation : spec;
        if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) return 0;
        return n;
    }

    function evaporate(cell, rate) {
        const amt = asInt(rate);
        if (amt <= 0) return;
        examine(1);
        const depth = io.depthAt(cell.ax, cell.ay, cell.x, cell.y, cell.z) | 0;
        if (depth <= 0 || io.typeAt(cell.ax, cell.ay, cell.x, cell.y, cell.z) !== "water") return;
        const take = Math.min(depth, amt);
        io.writeWater(cell.ax, cell.ay, cell.x, cell.y, cell.z, depth - take, false);
        io.wake(cell.ax, cell.ay, cell.x, cell.y, cell.z);
        if (!mutants.deleteEvap) atmosphere += take;
    }

    function clearCost() {
        examined = 0;
        processed = 0;
        lakeVisits = 0;
    }

    function beginTick(spec) {
        spec = spec || {};
        clearCost();
        const rawBudget = spec.budget === undefined ? 512 : spec.budget;
        const budget = Number.isFinite(rawBudget) ? Math.max(0, Math.floor(rawBudget)) : 0;
        if (budget === 0) return 0;
        tick += 1;
        // A positive Fluid tick still advances outlet time when this frame's
        // lake share is zero. Only the caller's total budget zero is a no-op.
        const lakeBudget = spec.lakeBudget === undefined ? budget : Math.min(budget, Math.max(0, Math.floor(spec.lakeBudget)));
        if (mutants.fullScan) {
            const range = io.zRange();
            const size = io.size() | 0;
            for (let z = range.zMin; z <= range.zMax; z++) {
                for (let y = 0; y < size; y++) {
                    for (let x = 0; x < size; x++) examine(1);
                }
            }
        }
        if (lakeBudget === 0) return 0;
        const index = spec.ax === null || spec.ax === undefined ? lakeIndex : lakeAreas.get((spec.ax | 0) + "," + (spec.ay | 0));
        if (!index || index.all.length === 0) return 0;
        const offer = precipitation();
        const listKey = offer > 0 ? "all" : "evap";
        const cursorKey = listKey + "Cursor";
        const targets = index[listKey];
        const n = Math.min(targets.length, lakeBudget);
        const start = index[cursorKey];
        for (let k = 0; k < n; k++) {
            const item = targets[(start + k) % targets.length];
            lakeVisits++;
            examine(1);
            const cell = item.cell;
            if (offer > 0) {
                const taken = Math.min(offer, atmosphere);
                atmosphere -= taken;
                const placed = deliver(cell.ax, cell.ay, cell.x, cell.y, cell.z, taken);
                const refused = taken - placed;
                if (refused > 0) atmosphere += refused;
            }
            if (item.lake.evap > 0) evaporate(cell, item.lake.evap);
        }
        if (targets.length > 0) index[cursorKey] = (start + n) % targets.length;
        return lakeVisits;
    }

    function exportState() {
        const aquiferRows = [];
        for (const [id, row] of aquifers.entries()) {
            if (row.stored > 0 || row.defined) aquiferRows.push([id, row.stored]);
        }
        aquiferRows.sort(function (a, b) { return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0); });
        const springRows = [];
        for (const spring of springs.values()) {
            springRows.push({
                ax: spring.ax, ay: spring.ay, x: spring.x, y: spring.y, z: spring.z,
                aquifer: spring.aquifer, rate: spring.rate
            });
        }
        const lakeRows = [];
        for (let i = 0; i < lakes.length; i++) {
            const lake = lakes[i];
            lakeRows.push({
                id: lake.id,
                evap: lake.evap,
                cells: lake.cells.map(function (c) { return [c.ax, c.ay, c.x, c.y, c.z]; })
            });
        }
        const visitRows = [];
        for (const [key, n] of visits.entries()) {
            if (n > 0) visitRows.push([key, n]);
        }
        visitRows.sort(function (a, b) { return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0); });
        if (aquiferRows.length === 0 && springRows.length === 0 && lakeRows.length === 0
            && visitRows.length === 0 && atmosphere === 0 && displaced === 0 && displacedLava === 0) return null;
        return {
            v: 2,
            atmosphere: atmosphere,
            displaced: displaced,
            displacedLava: displacedLava,
            aquifers: aquiferRows,
            springs: springRows,
            lakes: lakeRows,
            visits: visitRows
        };
    }

    function importState(blob) {
        reset();
        if (!blob || typeof blob !== "object") return;
        atmosphere = asInt(blob.atmosphere);
        displaced = asInt(blob.displaced);
        // v1's displaced field was water. v2 retains that field and adds lava.
        displacedLava = asInt(blob.displacedLava);
        const rows = Array.isArray(blob.aquifers) ? blob.aquifers : [];
        for (let i = 0; i < rows.length; i++) {
            const pair = rows[i];
            if (!pair || pair.length < 2) continue;
            const row = aquiferRow(pair[0], true);
            row.stored = asInt(pair[1]);
            row.defined = true;
        }
        const springRows = Array.isArray(blob.springs) ? blob.springs : [];
        for (let i = 0; i < springRows.length; i++) {
            const s = springRows[i];
            if (!s) continue;
            defineSpring(s);
        }
        const lakeRows = Array.isArray(blob.lakes) ? blob.lakes : [];
        for (let i = 0; i < lakeRows.length; i++) {
            const lake = lakeRows[i];
            if (!lake) continue;
            const cells = [];
            const raw = Array.isArray(lake.cells) ? lake.cells : [];
            for (let c = 0; c < raw.length; c++) {
                const item = raw[c];
                if (Array.isArray(item)) {
                    cells.push({ ax: item[0] | 0, ay: item[1] | 0, x: item[2] | 0, y: item[3] | 0, z: item[4] | 0 });
                }
            }
            defineLake({ id: lake.id, evap: lake.evap, cells: cells });
        }
        const visitRows = Array.isArray(blob.visits) ? blob.visits : [];
        for (let i = 0; i < visitRows.length; i++) {
            const pair = visitRows[i];
            if (!pair || pair.length < 2) continue;
            const n = asInt(pair[1]);
            if (n > 0) visits.set(String(pair[0]), n);
        }
    }

    function defineAquifer(id, storedDu) {
        const row = aquiferRow(id, true);
        row.stored = asInt(storedDu);
        row.defined = true;
        return row.stored;
    }

    function defineSpring(spec) {
        spec = spec || {};
        const ax = spec.ax | 0, ay = spec.ay | 0, x = spec.x | 0, y = spec.y | 0, z = spec.z | 0;
        const rate = asInt(spec.rate) > 0 ? asInt(spec.rate) : 1;
        const aquifer = spec.aquifer !== undefined && spec.aquifer !== null ? String(spec.aquifer) : "";
        if (!aquifers.has(aquifer)) aquiferRow(aquifer, true);
        const spring = { ax: ax, ay: ay, x: x, y: y, z: z, aquifer: aquifer, rate: rate, fedTick: -1 };
        springs.set(cellKey(ax, ay, x, y, z), spring);
        io.wake(ax, ay, x, y, z);
        return spring;
    }

    function defineLake(spec) {
        spec = spec || {};
        const id = spec.id !== undefined && spec.id !== null ? String(spec.id) : "lake";
        const evap = asInt(spec.evap);
        const cells = [];
        const raw = Array.isArray(spec.cells) ? spec.cells : [];
        for (let i = 0; i < raw.length; i++) {
            const c = raw[i];
            if (!c) continue;
            cells.push({
                ax: c.ax | 0, ay: c.ay | 0, x: c.x | 0, y: c.y | 0, z: c.z | 0
            });
        }
        for (let i = lakes.length - 1; i >= 0; i--) if (lakes[i].id === id) lakes.splice(i, 1);
        const lake = { id: id, evap: evap > 0 ? evap : 0, cells: cells };
        lakes.push(lake);
        rebuildLakeIndex();
        return lake;
    }

    function setEvap(id, n) {
        const key = String(id);
        for (let i = 0; i < lakes.length; i++) {
            if (lakes[i].id === key) lakes[i].evap = asInt(n) > 0 ? asInt(n) : 0;
        }
        rebuildLakeIndex();
    }

    function setSeasonInput(fn) {
        seasonInput = typeof fn === "function" ? fn : defaultSeason;
    }

    function configure(flags) {
        flags = flags || {};
        mutants.createWater = !!flags.createWater;
        mutants.deleteEvap = !!flags.deleteEvap;
        mutants.floodSolid = !!flags.floodSolid;
        mutants.fullScan = !!flags.fullScan;
        mutants.ignorePerm = !!flags.ignorePerm;
    }

    function reset() {
        aquifers.clear();
        springs.clear();
        lakes.length = 0;
        rebuildLakeIndex();
        visits.clear();
        waiters.clear();
        atmosphere = 0;
        displaced = 0;
        displacedLava = 0;
        tick = 0;
        examined = 0;
        processed = 0;
        lakeVisits = 0;
        seasonInput = defaultSeason;
        configure({});
    }

    function mass() {
        const grid = typeof io.gridWater === "function" ? io.gridWater() : 0;
        const aquiferDu = storedAquifers();
        return {
            grid: grid,
            aquifers: aquiferDu,
            atmosphere: atmosphere,
            displaced: displaced,
            displacedByType: { water: displaced, lava: displacedLava },
            total: grid + aquiferDu + atmosphere + displaced
        };
    }

    function cost() {
        return {
            examined: examined,
            processed: processed,
            lakeVisits: lakeVisits,
            work: processed + lakeVisits,
            // examined counts actual lake visits, delivery/passage probes,
            // evaporation reads and seep probes, including refused attempts.
            // work is the shared scheduler budget (bounded cell operations).
            tick: tick,
            aquifers: aquifers.size,
            springs: springs.size,
            lakes: lakes.length
        };
    }

    function noteProcessed(n) {
        processed = n;
    }

    function seedAtmosphere(n) {
        atmosphere = asInt(n);
        return atmosphere;
    }

    function receiveDisplaced(n, type) {
        const add = asInt(n);
        // D2-PENDING: typed holding only; no return/reaction policy here.
        if (type === "lava") {
            if (add > 0) displacedLava += add;
            return displacedLava;
        }
        if (type !== undefined && type !== "water") throw new Error("Unknown displaced liquid type: " + type);
        if (add > 0) displaced += add;
        return displaced;
    }

    function notifyOpened(ax, ay, x, y, z) {
        const key = cellKey(ax, ay, x, y, z);
        const bag = waiters.get(key);
        if (!bag) return;
        waiters.delete(key);
        for (const src of bag.values()) io.wake(src.ax, src.ay, src.x, src.y, src.z);
    }

    const api = {
        defineAquifer: defineAquifer,
        defineSpring: defineSpring,
        defineLake: defineLake,
        setEvap: setEvap,
        setSeasonInput: setSeasonInput,
        seedAtmosphere: seedAtmosphere,
        configure: configure,
        mass: mass,
        cost: cost,
        columnId: columnId,
        storedAt: function (id) {
            const row = aquifers.get(String(id));
            return row ? row.stored : 0;
        }
    };

    return {
        api: api,
        feedOutlet: feedOutlet,
        seepFrom: seepFrom,
        beginTick: beginTick,
        clearCost: clearCost,
        reset: reset,
        receiveDisplaced: receiveDisplaced,
        notifyOpened: notifyOpened,
        stored: stored,
        exportState: exportState,
        importState: importState,
        noteProcessed: noteProcessed,
        mass: mass,
        cost: cost
    };
}

module.exports = {
    createSession: createSession,
    loadCatalogueMaterials: loadCatalogueMaterials,
    permOf: permeability.permOf,
    seepPeriod: permeability.seepPeriod,
    seepQuantum: permeability.seepQuantum,
    columnId: columnId,
    defaultSeason: defaultSeason
};
