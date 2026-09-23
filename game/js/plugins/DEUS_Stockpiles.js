//=============================================================================
// DEUS_Stockpiles.js - DF-Style Physical Command Stockpiles
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Stockpiles] Physical command stockpiles: designated floor areas, item filters, priorities, physical occupancy, container integration, and hauling reservations.
 * @author UF project
 * @base DEUS_World
 * @base DEUS_Objects
 * @base DEUS_Items
 * @base DEUS_Containers
 * @base DEUS_Jobs
 * @orderAfter DEUS_World
 * @orderAfter DEUS_Objects
 * @orderAfter DEUS_Items
 * @orderAfter DEUS_Containers
 * @orderAfter DEUS_Jobs
 *
 * @help
 * Implements authoritative Dwarf Fortress style physical stockpiles:
 * - STOCKPILE = designated floor area + item filters + priority + ownership + physical occupancy.
 * - CONTAINER = physical object + real capacity + real contents + real world location.
 * - CELL OCCUPANCY:
 *     * Empty cell: accepts 1 loose item stack OR 1 physical container.
 *     * Cell with container: cell is occupied by that container; capacity is determined
 *       strictly by container slots. No double-counting of loose cell + container capacity.
 *     * Cell with loose item: occupied by that stack (1 stack per cell).
 * - ZERO PHANTOM MULTIPLIERS: All virtual +72 multipliers are retired. Storage capacity
 *   equals available loose cells + real available container slots.
 * - PHYSICAL HAULING: matching loose item outside stockpile -> worker claims job ->
 *   walks to item -> carries item physically -> walks to stockpile destination -> deposits.
 *   No teleportation, no phantom increments.
 * - RESERVATIONS: Haulers lock target destination cells or container slots.
 *   Cancellations release reservations immediately and drop carried items at worker's feet.
 *
 * API:
 *   UF.Stockpiles.create(opts)
 *   UF.Stockpiles.get(id)
 *   UF.Stockpiles.remove(id)
 *   UF.Stockpiles.at(area, x, y, z)
 *   UF.Stockpiles.all(area, z, factionId)
 *   UF.Stockpiles.addCells(id, cells)
 *   UF.Stockpiles.removeCells(id, cells)
 *   UF.Stockpiles.setFilter(id, filters)
 *   UF.Stockpiles.setPriority(id, priority)
 *   UF.Stockpiles.setEnabled(id, enabled)
 *   UF.Stockpiles.accepts(stockpileOrId, itemOrTypeId)
 *   UF.Stockpiles.cellOccupancy(area, x, y, z)
 *   UF.Stockpiles.usableCellCapacity(area, x, y, z)
 *   UF.Stockpiles.settlementCapacity(area, z, factionId, radius, center)
 *   UF.Stockpiles.findDestination(itemOrId, unit, factionId)
 *   UF.Stockpiles.reserve(unitId, dest)
 *   UF.Stockpiles.release(unitId)
 *   UF.Stockpiles.isReserved(dest, forUnitId)
 *   UF.Stockpiles.migrateLegacy(colony)
 */

(() => {
    "use strict";

    const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : {});
    root.DEUS = root.DEUS || {};
    root.UF = root.DEUS;

    const emit = (name, ...args) => {
        if (root.UF && root.UF.Events && typeof root.UF.Events.emit === "function") {
            root.UF.Events.emit(name, ...args);
        }
    };
    const listen = (name, fn) => {
        if (root.UF && root.UF.Events && typeof root.UF.Events.on === "function") {
            root.UF.Events.on(name, fn);
        }
    };

    const World = () => (root.UF && root.UF.World) || null;
    const Objects = () => (root.UF && root.UF.Objects) || null;
    const Items = () => (root.UF && root.UF.Items) || null;
    const Containers = () => (root.UF && root.UF.Containers) || null;
    const Jobs = () => (root.UF && root.UF.Jobs) || null;

    const zOf = ref => ref && ref.z !== undefined ? ref.z
        : ref && ref.area && ref.area.z !== undefined ? ref.area.z : 0;
    const copyArea = ref => {
        const a = ref.area || ref, z = zOf(ref);
        return Object.assign({ x: a.x | 0, y: a.y | 0 }, z === 0 ? {} : { z });
    };
    const areaKey = (area, z = 0) => {
        const ax = area && area.x !== undefined ? area.x | 0 : 0;
        const ay = area && area.y !== undefined ? area.y | 0 : 0;
        const az = z !== undefined ? z | 0 : zOf(area);
        return `${ax},${ay}${az === 0 ? "" : `,${az}`}`;
    };
    const cellKey = (x, y) => `${x | 0},${y | 0}`;
    const fullKey = (area, x, y, z = 0) => `${areaKey(area, z)}:${cellKey(x, y)}`;

    const GROUPS = Object.freeze([
        "all",
        "food",
        "wood",
        "stone",
        "material",
        "equipment",
        "containers",
        "corpses"
    ]);

    const PRIORITY_VALUES = Object.freeze({
        low: 1,
        normal: 2,
        high: 3
    });

    const Stockpiles = {
        version: 1,
        groups: () => GROUPS.slice()
    };
    root.UF.Stockpiles = Stockpiles;
    root.DEUS.Stockpiles = Stockpiles;

    // In-memory lookup tables:
    let byCell = new Map(); // fullKey -> stockpileId
    const reservedCells = new Map(); // fullKey -> unitId
    const reservedContainers = new Map(); // containerId -> Set<unitId>
    const unitReservations = new Map(); // unitId -> dest

    function stockpileState(create = true) {
        const W = World();
        if (!W || !W.state) return null;
        if (!W.state.stockpiles && create) {
            W.state.stockpiles = { version: 1, nextId: 1, byId: {} };
        }
        return W.state.stockpiles || null;
    }

    function reindex() {
        byCell.clear();
        const st = stockpileState(false);
        if (!st || !st.byId) return;
        for (const sp of Object.values(st.byId)) {
            if (!sp || !Array.isArray(sp.cells)) continue;
            for (const c of sp.cells) {
                const k = fullKey(sp.area, c.x, c.y, sp.z);
                byCell.set(k, sp.id);
            }
        }
    }

    //-------------------------------------------------------------------------
    // Item Group Classification
    //-------------------------------------------------------------------------

    Stockpiles.itemGroups = function(itemOrTypeId) {
        const I = Items();
        if (!I) return ["material"];
        let typeId = null;
        if (typeof itemOrTypeId === "number") {
            const it = I.get(itemOrTypeId);
            typeId = it ? it.type : null;
        } else if (typeof itemOrTypeId === "object" && itemOrTypeId !== null) {
            typeId = itemOrTypeId.type || itemOrTypeId.id;
        } else {
            typeId = itemOrTypeId;
        }
        if (!typeId) return ["material"];
        const t = I.type(typeId);
        if (!t) return ["material"];

        const groups = new Set();
        const tags = Array.isArray(t.tags) ? t.tags : [];

        // Food
        if (t.food || tags.includes("food") || tags.includes("ration") || tags.includes("rations") ||
            tags.includes("meat") || tags.includes("berry") || tags.includes("fruit") || tags.includes("crop")) {
            groups.add("food");
            groups.add("material");
        }

        // Wood
        if (tags.includes("wood") || tags.includes("log") || tags.includes("timber") || tags.includes("branch")) {
            groups.add("wood");
            groups.add("material");
        }

        // Stone & Ore
        if (tags.includes("stone") || tags.includes("rocks_small") || tags.includes("ore") || tags.includes("mineral") || tags.includes("rock")) {
            groups.add("stone");
            groups.add("material");
        }

        // Material general
        if (tags.includes("material") || tags.includes("metal") || tags.includes("straw") || tags.includes("fiber") ||
            tags.includes("cloth") || tags.includes("leather") || tags.includes("ingot") || tags.includes("bone")) {
            groups.add("material");
        }

        // Equipment
        if (t.tool || t.wear || tags.includes("tool") || tags.includes("wear") || tags.includes("weapon") ||
            tags.includes("shield") || tags.includes("armor") || tags.includes("helmet") || tags.includes("boots")) {
            groups.add("equipment");
        }

        // Containers
        const C = Containers();
        if (tags.includes("container") || (C && typeof C.isContainerType === "function" && C.isContainerType(typeId))) {
            groups.add("containers");
        }

        // Corpses
        if (tags.includes("corpse") || tags.includes("carcass") || typeId.startsWith("corpse_")) {
            groups.add("corpses");
        }

        if (groups.size === 0) groups.add("material");
        return Array.from(groups);
    };

    Stockpiles.accepts = function(stockpileOrId, itemOrTypeId) {
        const sp = typeof stockpileOrId === "number" ? Stockpiles.get(stockpileOrId) : stockpileOrId;
        if (!sp || sp.enabled === false) return false;

        const filters = sp.filters || {};
        const allowedGroups = Array.isArray(filters.groups) && filters.groups.length ? filters.groups : ["all"];
        if (allowedGroups.includes("all")) return true;

        const itemGroups = Stockpiles.itemGroups(itemOrTypeId);
        return allowedGroups.some(g => itemGroups.includes(g));
    };

    //-------------------------------------------------------------------------
    // Core Stockpile Management API
    //-------------------------------------------------------------------------

    Stockpiles.create = function(opts = {}) {
        const st = stockpileState(true);
        if (!st) return null;

        const area = copyArea(opts.area || { x: 0, y: 0 });
        const z = zOf(opts);
        const factionId = opts.factionId || "player";
        const priority = opts.priority && PRIORITY_VALUES[opts.priority] ? opts.priority : "normal";

        const sp = {
            id: st.nextId++,
            factionId,
            name: opts.name || `Stockpile #${st.nextId - 1}`,
            enabled: opts.enabled !== false,
            priority,
            area,
            z,
            cells: [],
            filters: {
                groups: Array.isArray(opts.filters && opts.filters.groups) ? opts.filters.groups.slice() : ["all"]
            },
            links: {
                giveTo: Array.isArray(opts.links && opts.links.giveTo) ? opts.links.giveTo.slice() : [],
                takeFrom: Array.isArray(opts.links && opts.links.takeFrom) ? opts.links.takeFrom.slice() : []
            }
        };

        if (Array.isArray(opts.cells)) {
            for (const c of opts.cells) {
                const cx = c.x | 0, cy = c.y | 0;
                sp.cells.push({ x: cx, y: cy });
                byCell.set(fullKey(area, cx, cy, z), sp.id);
            }
        }

        st.byId[sp.id] = sp;
        emit("stockpiles:created", sp);
        return sp;
    };

    Stockpiles.get = function(id) {
        const st = stockpileState(false);
        return (st && st.byId && st.byId[id]) || null;
    };

    Stockpiles.remove = function(id) {
        const st = stockpileState(false);
        const sp = st && st.byId && st.byId[id];
        if (!sp) return false;

        // Clean spatial index
        for (const c of sp.cells) {
            const k = fullKey(sp.area, c.x, c.y, sp.z);
            if (byCell.get(k) === sp.id) byCell.delete(k);
            // Free any cell reservation
            reservedCells.delete(k);
        }

        delete st.byId[id];
        emit("stockpiles:removed", sp);
        return true;
    };

    Stockpiles.at = function(area, x, y, z = 0) {
        const targetZ = z !== undefined ? z : zOf(area);
        const k = fullKey(area, x, y, targetZ);
        const id = byCell.get(k);
        if (id) {
            const sp = Stockpiles.get(id);
            if (sp) return sp;
            byCell.delete(k);
        }
        return null;
    };

    Stockpiles.all = function(area, z = 0, factionId = null) {
        const st = stockpileState(false);
        if (!st || !st.byId) return [];
        const targetZ = z !== undefined ? z : (area ? zOf(area) : 0);
        return Object.values(st.byId).filter(sp => {
            if (!sp) return false;
            if (area && (sp.area.x !== area.x || sp.area.y !== area.y)) return false;
            if (z !== null && z !== undefined && sp.z !== targetZ) return false;
            if (factionId && sp.factionId !== factionId) return false;
            return true;
        });
    };

    Stockpiles.addCells = function(id, cells) {
        const sp = Stockpiles.get(id);
        if (!sp || !Array.isArray(cells)) return 0;
        let added = 0;
        const set = new Set(sp.cells.map(c => cellKey(c.x, c.y)));
        for (const c of cells) {
            const k = cellKey(c.x, c.y);
            if (!set.has(k)) {
                set.add(k);
                sp.cells.push({ x: c.x | 0, y: c.y | 0 });
                byCell.set(fullKey(sp.area, c.x, c.y, sp.z), sp.id);
                added++;
            }
        }
        if (added > 0) emit("stockpiles:cellsChanged", sp);
        return added;
    };

    Stockpiles.removeCells = function(id, cells) {
        const sp = Stockpiles.get(id);
        if (!sp || !Array.isArray(cells)) return 0;
        const toRemove = new Set(cells.map(c => cellKey(c.x, c.y)));
        const prevLen = sp.cells.length;
        sp.cells = sp.cells.filter(c => {
            const remove = toRemove.has(cellKey(c.x, c.y));
            if (remove) {
                const k = fullKey(sp.area, c.x, c.y, sp.z);
                if (byCell.get(k) === sp.id) byCell.delete(k);
                reservedCells.delete(k);
            }
            return !remove;
        });
        const removed = prevLen - sp.cells.length;
        if (removed > 0) emit("stockpiles:cellsChanged", sp);
        return removed;
    };

    Stockpiles.setFilter = function(id, filters) {
        const sp = Stockpiles.get(id);
        if (!sp || !filters) return false;
        sp.filters = Object.assign({}, sp.filters, filters);
        if (Array.isArray(filters.groups)) sp.filters.groups = filters.groups.slice();
        emit("stockpiles:filterChanged", sp);
        return true;
    };

    Stockpiles.setPriority = function(id, priority) {
        const sp = Stockpiles.get(id);
        if (!sp || !PRIORITY_VALUES[priority]) return false;
        sp.priority = priority;
        emit("stockpiles:priorityChanged", sp);
        return true;
    };

    Stockpiles.setEnabled = function(id, enabled) {
        const sp = Stockpiles.get(id);
        if (!sp) return false;
        sp.enabled = !!enabled;
        emit("stockpiles:enabledChanged", sp);
        return true;
    };

    //-------------------------------------------------------------------------
    // Physical Occupancy & Real Capacity
    //-------------------------------------------------------------------------

    Stockpiles.cellOccupancy = function(area, x, y, z = 0) {
        const C = Containers();
        const I = Items();
        const targetZ = z !== undefined ? z : zOf(area);

        // 1. Container occupies cell
        if (C && typeof C.at === "function") {
            const cont = C.at(area, x, y, targetZ);
            if (cont) {
                const items = typeof C.itemsIn === "function" ? C.itemsIn(cont.id) : [];
                return {
                    kind: "container",
                    container: cont,
                    maxSlots: cont.maxSlots | 0,
                    usedSlots: items.length,
                    availableSlots: Math.max(0, (cont.maxSlots | 0) - items.length),
                    items
                };
            }
        }

        // 2. Loose items on floor
        if (I && typeof I.atIn === "function") {
            const items = I.atIn(area, x, y, targetZ);
            if (items && items.length > 0) {
                const primary = items[0];
                const t = I.type(primary.type);
                const maxStack = Math.max(1, (t && Number(t.stack)) || 1);
                return {
                    kind: "loose",
                    item: primary,
                    count: primary.count | 0,
                    maxStack,
                    availableSlots: 0, // cell occupied by loose stack
                    items
                };
            }
        }

        // 3. Empty physical cell
        return {
            kind: "empty",
            availableSlots: 1
        };
    };

    Stockpiles.usableCellCapacity = function(area, x, y, z = 0) {
        const occ = Stockpiles.cellOccupancy(area, x, y, z);
        if (occ.kind === "container") {
            return occ.availableSlots;
        }
        if (occ.kind === "loose") {
            return 0;
        }
        return 1; // 1 loose slot
    };

    Stockpiles.settlementCapacity = function(area, z = 0, factionId = "player", radius = 24, center = null) {
        const targetZ = z !== undefined ? z : zOf(area);
        const near = center || { x: 32, y: 32 };
        const piles = Stockpiles.all(area, targetZ, factionId).filter(sp => sp.enabled !== false);

        let totalSlots = 0;
        let usedSlots = 0;
        let looseCells = 0;
        let containerSlots = 0;
        let totalCells = 0;
        let containersCount = 0;
        const seenContainers = new Set();

        for (const sp of piles) {
            for (const c of sp.cells) {
                if (Math.hypot(c.x - near.x, c.y - near.y) > radius) continue;
                totalCells++;
                const occ = Stockpiles.cellOccupancy(sp.area, c.x, c.y, sp.z);
                if (occ.kind === "container") {
                    if (!seenContainers.has(occ.container.id)) {
                        seenContainers.add(occ.container.id);
                        containersCount++;
                        containerSlots += occ.maxSlots;
                        totalSlots += occ.maxSlots;
                        usedSlots += occ.usedSlots;
                    }
                } else if (occ.kind === "loose") {
                    looseCells++;
                    totalSlots += 1;
                    usedSlots += 1;
                } else {
                    looseCells++;
                    totalSlots += 1;
                }
            }
        }

        // In-flight reservations count against available capacity
        let reservedSlots = 0;
        for (const [k, uId] of reservedCells) {
            reservedSlots++;
        }
        for (const [cId, uIds] of reservedContainers) {
            reservedSlots += uIds.size;
        }

        const availableSlots = Math.max(0, totalSlots - usedSlots - reservedSlots);
        return {
            totalSlots,
            usedSlots,
            availableSlots,
            looseCells,
            containerSlots,
            totalCells,
            containersCount,
            reservedSlots
        };
    };

    //-------------------------------------------------------------------------
    // Destination Selection & Reservations
    //-------------------------------------------------------------------------

    Stockpiles.isReserved = function(dest, forUnitId = null) {
        if (!dest) return false;
        if (dest.containerId) {
            const set = reservedContainers.get(dest.containerId);
            if (!set || set.size === 0) return false;
            if (forUnitId && set.has(forUnitId) && set.size === 1) return false;
            const C = Containers();
            const cont = C ? C.get(dest.containerId) : null;
            if (cont) {
                const used = cont.items ? cont.items.length : 0;
                return (used + set.size) >= cont.maxSlots;
            }
            return true;
        }
        const k = fullKey(dest.area, dest.x, dest.y, dest.z);
        const res = reservedCells.get(k);
        return res !== undefined && res !== forUnitId;
    };

    Stockpiles.reserve = function(unitId, dest) {
        if (!unitId || !dest) return false;
        Stockpiles.release(unitId);

        if (dest.containerId) {
            let set = reservedContainers.get(dest.containerId);
            if (!set) {
                set = new Set();
                reservedContainers.set(dest.containerId, set);
            }
            set.add(unitId);
            unitReservations.set(unitId, { type: "container", containerId: dest.containerId });
            return true;
        }

        const k = fullKey(dest.area, dest.x, dest.y, dest.z);
        reservedCells.set(k, unitId);
        unitReservations.set(unitId, { type: "cell", area: copyArea(dest.area), x: dest.x | 0, y: dest.y | 0, z: dest.z | 0 });
        return true;
    };

    Stockpiles.release = function(unitId) {
        if (!unitId) return;
        const res = unitReservations.get(unitId);
        if (!res) return;
        unitReservations.delete(unitId);

        if (res.type === "container") {
            const set = reservedContainers.get(res.containerId);
            if (set) {
                set.delete(unitId);
                if (set.size === 0) reservedContainers.delete(res.containerId);
            }
        } else if (res.type === "cell") {
            const k = fullKey(res.area, res.x, res.y, res.z);
            if (reservedCells.get(k) === unitId) reservedCells.delete(k);
        }
    };

    Stockpiles.clearReservations = function() {
        reservedCells.clear();
        reservedContainers.clear();
        unitReservations.clear();
    };

    Stockpiles.findDestination = function(itemOrId, unit, factionId = "player") {
        const I = Items();
        const C = Containers();
        const W = World();
        if (!I) return null;

        const it = typeof itemOrId === "number" ? I.get(itemOrId) : itemOrId;
        if (!it) return null;

        const uArea = unit ? copyArea(unit.area || unit) : copyArea(it.area || { x: 0, y: 0 });
        const uZ = unit ? zOf(unit) : zOf(it);
        const piles = Stockpiles.all(uArea, uZ, factionId).filter(sp => sp.enabled !== false && Stockpiles.accepts(sp, it));
        if (piles.length === 0) return null;

        // Sort by priority (high > normal > low), then distance
        const uX = unit ? unit.x : it.x, uY = unit ? unit.y : it.y;
        piles.sort((a, b) => {
            const pa = PRIORITY_VALUES[a.priority] || 2;
            const pb = PRIORITY_VALUES[b.priority] || 2;
            if (pa !== pb) return pb - pa;
            const cA = a.cells[0] || { x: 0, y: 0 };
            const cB = b.cells[0] || { x: 0, y: 0 };
            return Math.hypot(cA.x - uX, cA.y - uY) - Math.hypot(cB.x - uX, cB.y - uY);
        });

        const unitId = unit ? unit.id : null;

        for (const sp of piles) {
            // Priority 1: Check containers in stockpile cells that can accept this item
            if (C && typeof C.at === "function") {
                for (const c of sp.cells) {
                    const cont = C.at(sp.area, c.x, c.y, sp.z);
                    if (cont) {
                        const can = C.canStore(cont.id, it, it.count || 1);
                        if (can && can.ok) {
                            const dest = { area: copyArea(sp.area), x: c.x, y: c.y, z: sp.z, containerId: cont.id, stockpileId: sp.id };
                            if (!Stockpiles.isReserved(dest, unitId)) {
                                return dest;
                            }
                        }
                    }
                }
            }

            // Priority 2: Empty loose cell
            for (const c of sp.cells) {
                const dest = { area: copyArea(sp.area), x: c.x, y: c.y, z: sp.z, containerId: null, stockpileId: sp.id };
                if (Stockpiles.isReserved(dest, unitId)) continue;

                // Ground must be walkable/standable
                if (W && typeof W.walkable === "function" && !W.walkable(sp.area.x, sp.area.y, c.x, c.y, { z: sp.z, ground: true })) {
                    continue;
                }

                const occ = Stockpiles.cellOccupancy(sp.area, c.x, c.y, sp.z);
                if (occ.kind === "empty") {
                    return dest;
                }
            }

            // Priority 3: Merge into matching loose item stack on floor with capacity
            for (const c of sp.cells) {
                const dest = { area: copyArea(sp.area), x: c.x, y: c.y, z: sp.z, containerId: null, stockpileId: sp.id };
                if (Stockpiles.isReserved(dest, unitId)) continue;

                const occ = Stockpiles.cellOccupancy(sp.area, c.x, c.y, sp.z);
                if (occ.kind === "loose" && occ.item.type === it.type &&
                    (occ.item.mat || null) === (it.mat || null) &&
                    (occ.item.q ?? null) === (it.q ?? null) &&
                    occ.count < occ.maxStack) {
                    return dest;
                }
            }
        }

        return null;
    };

    //-------------------------------------------------------------------------
    // Legacy Migration
    //-------------------------------------------------------------------------

    Stockpiles.migrateLegacy = function(colonyRef) {
        const c = colonyRef || (World() && World().state && World().state.colony);
        if (!c) return 0;

        const area = copyArea(c.area || { x: 0, y: 0 });
        const z = zOf(c);
        let created = 0;

        // 1. Migrate colony.stockpiles entries
        if (Array.isArray(c.stockpiles) && c.stockpiles.length > 0) {
            // Group by step or contiguous cells
            const unmigrated = [];
            for (const sp of c.stockpiles) {
                if (!Stockpiles.at(area, sp.x, sp.y, z)) {
                    unmigrated.push(sp);
                }
            }

            if (unmigrated.length > 0) {
                // Group by stores filter
                const byStores = new Map();
                for (const sp of unmigrated) {
                    const key = (sp.stores || []).sort().join(",") || "all";
                    if (!byStores.has(key)) byStores.set(key, []);
                    byStores.get(key).push(sp);
                }

                for (const [key, cells] of byStores) {
                    const groups = key === "all" ? ["all"] : (cells[0].stores || ["all"]);
                    Stockpiles.create({
                        factionId: c.factionId || "player",
                        name: `Legacy Stockpile (${key})`,
                        area,
                        z,
                        cells: cells.map(sp => ({ x: sp.x, y: sp.y })),
                        filters: { groups }
                    });
                    created++;
                }
            }
        }

        // 2. Migrate completed communal_stockpile projects
        const P = root.UF && root.UF.Projects;
        if (P && typeof P.list === "function") {
            const projects = P.list(p => p.state === "done" && p.kind === "communal_stockpile");
            for (const p of projects) {
                const pCells = typeof P.footprint === "function" ? P.footprint(p) : [];
                const anyMigrated = pCells.some(cell => Stockpiles.at(area, cell.x, cell.y, z));
                if (!anyMigrated && pCells.length > 0) {
                    Stockpiles.create({
                        factionId: p.factionId || c.factionId || "player",
                        name: `Communal Stockpile #${p.id}`,
                        area: copyArea(p.origin || area),
                        z: zOf(p.origin || area),
                        cells: pCells,
                        filters: { groups: ["all"] }
                    });
                    created++;
                }
            }
        }

        return created;
    };

    //-------------------------------------------------------------------------
    // Engine & Lifecycle Hooks
    //-------------------------------------------------------------------------

    listen("world:loaded", () => {
        reindex();
        Stockpiles.clearReservations();
    });

    listen("jobs:done", job => {
        if (job && job.assigned) Stockpiles.release(job.assigned);
    });
    listen("jobs:failed", job => {
        if (job && job.assigned) Stockpiles.release(job.assigned);
    });
    listen("jobs:cancelled", job => {
        if (job && job.assigned) Stockpiles.release(job.assigned);
    });

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        reindex();
        Stockpiles.clearReservations();
        Stockpiles.migrateLegacy();
    };

    reindex();
})();
