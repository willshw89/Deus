//=============================================================================
// UF_Resources.js - Central Physical Resource Resolver & Reservation Registry
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Resources] Central physical resource resolver, 8-tier priority search, reservation registry, and faction knowledge index.
 * @author UF project
 * @base UF_World
 * @base UF_Objects
 * @base UF_Items
 * @base UF_Containers
 * @orderAfter UF_World
 * @orderAfter UF_Objects
 * @orderAfter UF_Items
 * @orderAfter UF_Containers
 *
 * @help
 * Authoritative single resource-sourcing mechanism:
 * - Strictly prioritizes existing physical goods before felling, quarrying or mining.
 * - Resolves items by functional roles (e.g. STRUCTURAL_TIMBER, BUILDING_STONE)
 *   or specific item IDs.
 * - Protects scarce and strategic materials (e.g. yew for bows, marble for art).
 * - Physical reservation registry prevents multiple projects claiming same items.
 * - Faction resource index provides fast cached lookup without global pools.
 *
 * API:
 *   UF.Resources.resolve(request)
 *   UF.Resources.reserve(allocation, projectId, jobId, unitId, expiryTicks)
 *   UF.Resources.release(reservationIdOrJobId)
 *   UF.Resources.isReserved(itemId, excludingJobId)
 *   UF.Resources.availableCount(item, excludingJobId)
 *   UF.FactionResources.index(factionId)
 */

(() => {
    "use strict";

    const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : {});
    root.UF = root.UF || {};

    const emit = (name, ...args) => {
        if (root.UF && root.UF.Events && root.UF.Events.emit) root.UF.Events.emit(name, ...args);
    };
    const listen = (name, fn) => {
        if (root.UF && root.UF.Events && root.UF.Events.on) root.UF.Events.on(name, fn);
    };
    const World = () => (root.UF && root.UF.World) || null;
    const Objects = () => (root.UF && root.UF.Objects) || null;
    const Items = () => (root.UF && root.UF.Items) || null;
    const Containers = () => (root.UF && root.UF.Containers) || null;
    const Households = () => (root.UF && root.UF.Households) || null;

    const zOf = ref => ref && ref.z !== undefined ? ref.z
        : ref && ref.area && ref.area.z !== undefined ? ref.area.z : 0;
    const copyArea = ref => {
        const a = ref.area || ref, z = zOf(ref);
        return Object.assign({ x: a.x | 0, y: a.y | 0 }, z === 0 ? {} : { z });
    };

    const Resources = {};
    const FactionResources = {};
    root.UF.Resources = Resources;
    root.UF.FactionResources = FactionResources;

    function reservationState() {
        const W = World();
        if (!W || !W.state) return null;
        if (!W.state.reservations) {
            W.state.reservations = { nextId: 1, byId: {}, byItem: {} };
        }
        return W.state.reservations;
    }

    // -------------------------------------------------------------------------
    // Reservations
    // -------------------------------------------------------------------------

    Resources.reserve = function(allocationOrOpts, projectId, jobId, unitId, expiryTicks = 3600) {
        const st = reservationState();
        if (!st || !allocationOrOpts) return null;
        let itemId = null, qty = 1, projId = projectId, jId = jobId, uId = unitId, exp = expiryTicks;
        if (typeof allocationOrOpts === "object" && allocationOrOpts !== null) {
            itemId = allocationOrOpts.itemId;
            qty = allocationOrOpts.quantity || allocationOrOpts.count || 1;
            if (allocationOrOpts.projectRef || allocationOrOpts.projectId) projId = allocationOrOpts.projectRef || allocationOrOpts.projectId;
            if (allocationOrOpts.reservedFor || allocationOrOpts.unitId) uId = allocationOrOpts.reservedFor || allocationOrOpts.unitId;
            if (allocationOrOpts.jobId) jId = allocationOrOpts.jobId;
            if (allocationOrOpts.expiryTicks) exp = allocationOrOpts.expiryTicks;
        } else if (typeof allocationOrOpts === "number") {
            itemId = allocationOrOpts;
        }
        if (!itemId) return null;
        const I = Items();
        const it = I ? I.get(itemId) : null;
        if (!it) return null;

        const resId = `res_${st.nextId++}`;
        const ticks = (root.UF && root.UF.Time && root.UF.Time.ticks) ? root.UF.Time.ticks() : 0;
        const res = {
            id: resId,
            ok: true,
            itemId: it.id,
            quantity: qty,
            projectId: projId || null,
            jobId: jId || null,
            unitId: uId || null,
            createdTick: ticks,
            expiresTick: ticks + exp
        };
        st.byId[resId] = res;
        st.byItem[it.id] = (st.byItem[it.id] || []).concat(resId);
        it.reserved = res;
        emit("resources:reserved", res, it);
        return res;
    };

    Resources.release = function(resIdOrJobId) {
        const st = reservationState();
        if (!st || !st.byId) return false;
        let released = 0;
        for (const [id, r] of Object.entries(st.byId)) {
            if (id === resIdOrJobId || r.jobId === resIdOrJobId || r.projectId === resIdOrJobId) {
                const it = Items() ? Items().get(r.itemId) : null;
                if (it && it.reserved && it.reserved.id === id) {
                    delete it.reserved;
                }
                if (st.byItem[r.itemId]) {
                    st.byItem[r.itemId] = st.byItem[r.itemId].filter(rid => rid !== id);
                    if (!st.byItem[r.itemId].length) delete st.byItem[r.itemId];
                }
                delete st.byId[id];
                released++;
                emit("resources:released", r);
            }
        }
        return released > 0;
    };

    Resources.isReserved = function(itemId, excludingJobId = null) {
        const st = reservationState();
        if (!st || !st.byItem || !st.byItem[itemId]) return false;
        const list = st.byItem[itemId];
        if (!list.length) return false;
        if (!excludingJobId) return true;
        return list.some(rid => {
            const r = st.byId[rid];
            return r && r.jobId !== excludingJobId;
        });
    };

    Resources.availableCount = function(item, excludingJobId = null) {
        if (!item) return 0;
        const st = reservationState();
        const total = item.count || 1;
        if (!st || !st.byItem || !st.byItem[item.id]) return total;
        let reserved = 0;
        for (const rid of st.byItem[item.id]) {
            const r = st.byId[rid];
            if (r && (!excludingJobId || r.jobId !== excludingJobId)) {
                reserved += r.quantity || 1;
            }
        }
        return Math.max(0, total - reserved);
    };

    // -------------------------------------------------------------------------
    // Material Role Matching & Strategic Scoring
    // -------------------------------------------------------------------------

    function itemMatchesRole(item, roleOrId) {
        if (!item || !roleOrId) return false;
        if (item.type === roleOrId) return true;

        const I = Items();
        const t = I ? I.type(item.type) : null;
        if (!t) return false;
        if (Array.isArray(t.tags) && t.tags.includes(roleOrId)) return true;

        const mat = item.mat || null;
        const matDef = I && typeof I.materialOf === "function" ? I.materialOf(mat || item.type) : null;

        switch (roleOrId) {
            case "STRUCTURAL_TIMBER":
                return (item.type === "log" || (t.tags && t.tags.includes("wood"))) &&
                       (!matDef || matDef.hardness >= 2) &&
                       (!mat || !mat.includes("willow")); // Willow is too soft/brittle for structural framing

            case "BUILDING_STONE":
                return (item.type === "stone" || (t.tags && t.tags.includes("stone"))) &&
                       (!matDef || (matDef.hardness >= 3 && matDef.fractureResistance >= 2));

            case "HARD_STONE":
                return (item.type === "stone" || (t.tags && t.tags.includes("stone"))) &&
                       (!matDef || matDef.hardness >= 5);

            case "FLEXIBLE_BOW_WOOD":
                return (item.type === "log" || (t.tags && t.tags.includes("wood"))) &&
                       (mat === "woods:yew" || mat === "woods:ash" || mat === "woods:elm");

            case "CUTTING_METAL":
                return (item.type.startsWith("bar_") || (t.tags && t.tags.includes("metal"))) &&
                       (mat === "metals:iron" || mat === "metals:bronze" || mat === "metals:steel");

            case "CORDAGE":
                return item.type === "fiber" || item.type === "straw" || (t.tags && t.tags.includes("fiber"));

            case "FUEL":
                return item.type === "charcoal" || item.type === "coal" || item.type === "log" || (t.tags && t.tags.includes("fuel"));

            default:
                return false;
        }
    }

    function evaluateStrategicCost(item, roleOrId, dist = 0, deltaZ = 0) {
        let score = dist + Math.abs(deltaZ) * 8;
        const mat = item.mat || "";
        // Penalize using rare strategic bow wood for ordinary construction
        if (roleOrId === "STRUCTURAL_TIMBER" && mat.includes("yew")) {
            score += 1000; // Preserve rare yew
        }
        // Penalize using decorative marble for ordinary construction stone
        if (roleOrId === "BUILDING_STONE" && mat.includes("marble")) {
            score += 500;
        }
        // Prefer common pine for structural timber
        if (roleOrId === "STRUCTURAL_TIMBER" && mat.includes("pine")) {
            score -= 5;
        }
        return score;
    }

    // -------------------------------------------------------------------------
    // Authoritative Resource Resolver
    // -------------------------------------------------------------------------

    Resources.resolve = function(request) {
        const I = Items(), W = World(), C = Containers();
        if (!I || !W) return { status: "blocked", allocations: [], shortfall: request.quantity || 1 };

        const reqRole = request.role || request.typeId;
        const want = Math.max(1, request.quantity | 0);
        const loc = request.targetLocation || { x: 0, y: 0, z: 0 };
        const area = copyArea(loc.area || (request.actor && request.actor.area) || W.currentArea());
        const actor = request.actor ? (typeof request.actor === "object" ? request.actor : W.unit(request.actor)) : null;
        const jobId = request.jobId || null;
        const allowHarvest = request.allowHarvest !== false;

        let needed = want;
        const allocations = [];

        // ---------------------------------------------------------------------
        // Tier 1: Item Already Carried by Worker
        // ---------------------------------------------------------------------
        if (actor) {
            const carried = I.inventoryOf(actor.id);
            for (const it of carried) {
                if (needed <= 0) break;
                if (!itemMatchesRole(it, reqRole)) continue;
                const avail = Resources.availableCount(it, jobId);
                if (avail <= 0) continue;
                const take = Math.min(avail, needed);
                allocations.push({
                    sourceKind: "carried",
                    sourceRef: { unitId: actor.id },
                    itemId: it.id,
                    count: take,
                    item: it,
                    cost: 0
                });
                needed -= take;
            }
        }

        // ---------------------------------------------------------------------
        // Tier 2: Project Staging (Items already lying or placed on target cell)
        // ---------------------------------------------------------------------
        if (needed > 0 && loc) {
            const onTarget = I.atIn(area, loc.x, loc.y);
            for (const it of onTarget) {
                if (needed <= 0) break;
                if (!itemMatchesRole(it, reqRole)) continue;
                const avail = Resources.availableCount(it, jobId);
                if (avail <= 0) continue;
                const take = Math.min(avail, needed);
                allocations.push({
                    sourceKind: "staged",
                    sourceRef: { area, x: loc.x, y: loc.y, z: zOf(loc) },
                    itemId: it.id,
                    count: take,
                    item: it,
                    cost: 1
                });
                needed -= take;
            }
        }

        // ---------------------------------------------------------------------
        // Tier 3: Accessible Appropriate Containers (Chests, Crates, Pantries)
        // ---------------------------------------------------------------------
        if (needed > 0 && C) {
            const containers = C.all(area, zOf(loc));
            const candidateContainers = [];
            for (const cont of containers) {
                const dist = Math.hypot(cont.x - loc.x, cont.y - loc.y);
                const deltaZ = (cont.z || 0) - (loc.z || 0);
                for (const it of C.itemsIn(cont.id)) {
                    if (!itemMatchesRole(it, reqRole)) continue;
                    const avail = Resources.availableCount(it, jobId);
                    if (avail <= 0) continue;
                    const cost = evaluateStrategicCost(it, reqRole, dist, deltaZ);
                    candidateContainers.push({ cont, it, avail, cost });
                }
            }
            candidateContainers.sort((a, b) => a.cost - b.cost);
            for (const cEntry of candidateContainers) {
                if (needed <= 0) break;
                const take = Math.min(cEntry.avail, needed);
                allocations.push({
                    sourceKind: "container",
                    sourceRef: { containerId: cEntry.cont.id, area: cEntry.cont.area, x: cEntry.cont.x, y: cEntry.cont.y, z: cEntry.cont.z },
                    itemId: cEntry.it.id,
                    count: take,
                    item: cEntry.it,
                    cost: cEntry.cost
                });
                needed -= take;
            }
        }

        // ---------------------------------------------------------------------
        // Tier 4: Accessible Loose World Items on Ground
        // ---------------------------------------------------------------------
        if (needed > 0) {
            const loose = I.find({ area, near: { x: loc.x, y: loc.y }, radius: 60 });
            const candidateLoose = [];
            for (const f of loose) {
                const it = f.item;
                if (!itemMatchesRole(it, reqRole)) continue;
                if (it.firstOwner && actor && it.firstOwner !== actor.id) continue; // Respect first-owner protection
                const avail = Resources.availableCount(it, jobId);
                if (avail <= 0) continue;
                const deltaZ = (it.z || 0) - (loc.z || 0);
                const cost = evaluateStrategicCost(it, reqRole, f.dist, deltaZ);
                candidateLoose.push({ it, avail, x: f.x, y: f.y, z: it.z || 0, cost });
            }
            candidateLoose.sort((a, b) => a.cost - b.cost);
            for (const lEntry of candidateLoose) {
                if (needed <= 0) break;
                const take = Math.min(lEntry.avail, needed);
                allocations.push({
                    sourceKind: "loose",
                    sourceRef: { area, x: lEntry.x, y: lEntry.y, z: lEntry.z },
                    itemId: lEntry.it.id,
                    count: take,
                    item: lEntry.it,
                    cost: lEntry.cost
                });
                needed -= take;
            }
        }

        // ---------------------------------------------------------------------
        // Tier 5: Fallback to Harvest / Mine only if stored & loose supply insufficient
        // ---------------------------------------------------------------------
        let harvestDemand = null;
        if (needed > 0 && allowHarvest) {
            const O = Objects();
            if (O) {
                // Determine harvest action based on requirement
                let targetTag = null, harvestAction = "gather";
                if (reqRole === "STRUCTURAL_TIMBER" || reqRole === "log" || reqRole === "wood") {
                    targetTag = "tree";
                    harvestAction = "chop";
                } else if (reqRole === "BUILDING_STONE" || reqRole === "HARD_STONE" || reqRole === "stone") {
                    targetTag = "stone";
                    harvestAction = "quarry";
                } else if (reqRole === "CORDAGE" || reqRole === "fiber") {
                    targetTag = "plant";
                    harvestAction = "gather";
                }

                if (targetTag) {
                    const nodes = (typeof O.findIn === "function")
                        ? O.findIn(area, { near: { x: loc.x, y: loc.y }, radius: 50, tags: [targetTag], limit: 8 })
                        : (typeof O.find === "function" ? O.find({ near: { x: loc.x, y: loc.y }, radius: 50, tags: [targetTag], limit: 8 }) : []);
                    if (nodes && nodes.length > 0) {
                        const targetNode = nodes[0];
                        harvestDemand = {
                            action: harvestAction,
                            target: { area, x: targetNode.x, y: targetNode.y, z: zOf(loc) },
                            x: targetNode.x,
                            y: targetNode.y,
                            objectId: targetNode.type ? targetNode.type.id : targetNode.id,
                            neededCount: needed
                        };
                    }
                }
            }
        }

        const allocated = want - needed;
        let status = "fulfilled";
        if (needed > 0 && harvestDemand) status = "gather_needed";
        else if (needed > 0 && allocated > 0) status = "partial";
        else if (needed > 0) status = "blocked";

        return {
            status,
            role: reqRole,
            requested: want,
            allocated,
            shortfall: needed,
            allocations,
            harvestDemand
        };
    };

    // -------------------------------------------------------------------------
    // Faction Resource Knowledge Index
    // -------------------------------------------------------------------------

    FactionResources.index = function(factionId) {
        const C = Containers(), I = Items();
        const index = { totalKnown: {}, reserved: {}, available: {}, containers: [] };
        if (!C || !I) return index;

        const containers = C.all();
        for (const cont of containers) {
            if (cont.owner && cont.owner.kind === "faction" && cont.owner.id !== factionId) continue;
            index.containers.push(cont.id);
            for (const it of C.itemsIn(cont.id)) {
                const t = it.type;
                const cnt = it.count || 1;
                const avail = Resources.availableCount(it);
                const res = cnt - avail;
                index.totalKnown[t] = (index.totalKnown[t] || 0) + cnt;
                index.reserved[t] = (index.reserved[t] || 0) + res;
                index.available[t] = (index.available[t] || 0) + avail;
            }
        }
        return index;
    };

    // Release reservations when jobs finish or fail
    listen("jobs:done", (job) => {
        if (job && job.id) Resources.release(job.id);
    });
    listen("jobs:failed", (job) => {
        if (job && job.id) Resources.release(job.id);
    });

    if (typeof module !== "undefined") {
        module.exports = { Resources, FactionResources };
    }
})();

