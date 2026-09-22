//=============================================================================
// UF_Containers.js - Physical Container Infrastructure & Storage Policies
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Containers] Physical storage container infrastructure, finite capacity (slots & weight), contextual policies, and item spill on destruction.
 * @author UF project
 * @base UF_World
 * @base UF_Objects
 * @base UF_Items
 * @orderAfter UF_World
 * @orderAfter UF_Objects
 * @orderAfter UF_Items
 *
 * @help
 * Implements physical container storage replacing abstract stockpile zones:
 * - Containers are physical objects in the world (chests, crates, barrels, racks).
 * - Finite capacity: enforced maximum slots and maximum weight in kg.
 * - Contextual storage policies: filter by category, tag, type, material, quality.
 * - Physical containment: items inside have item.container set and area/holder null.
 * - Spill on destruction: when a container is removed or destroyed, its contents
 *   spill onto the ground at that cell.
 *
 * API:
 *   UF.Containers.create(typeId, cellRef, opts)
 *   UF.Containers.get(id)
 *   UF.Containers.at(area, x, y, z)
 *   UF.Containers.all(area, z)
 *   UF.Containers.itemsIn(containerId)
 *   UF.Containers.currentWeight(containerId)
 *   UF.Containers.slotsUsed(containerId)
 *   UF.Containers.canStore(containerId, itemOrTypeId, count, actorOrOwner)
 *   UF.Containers.putItem(containerId, itemOrId)
 *   UF.Containers.takeItem(containerId, itemId, unitId, count)
 *   UF.Containers.setPolicy(containerId, policy)
 *   UF.Containers.spill(containerId)
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
    const Ownership = () => (root.UF && root.UF.Ownership) || null;

    const zOf = ref => ref && ref.z !== undefined ? ref.z
        : ref && ref.area && ref.area.z !== undefined ? ref.area.z : 0;
    const copyArea = ref => {
        const a = ref.area || ref, z = zOf(ref);
        return Object.assign({ x: a.x | 0, y: a.y | 0 }, z === 0 ? {} : { z });
    };
    const areaKey = ref => {
        const a = copyArea(ref), z = zOf(a);
        return `${a.x},${a.y}${z === 0 ? "" : `,${z}`}`;
    };
    const cellKey = (x, y) => `${x | 0},${y | 0}`;
    const fullCellKey = (ref, x, y) => `${areaKey(ref)}:${cellKey(x, y)}`;

    const CONTAINER_SPECS = {
        chest_wood: {
            name: "Wooden Chest",
            maxSlots: 12,
            maxWeight: 200.0,
            defaultPolicy: { name: "General Storage" }
        },
        crate_wood: {
            name: "Storage Crate",
            maxSlots: 16,
            maxWeight: 300.0,
            defaultPolicy: { name: "Bulk Storage", allowedTags: ["wood", "stone", "material", "ore"] }
        },
        barrel_food: {
            name: "Food Barrel",
            maxSlots: 8,
            maxWeight: 150.0,
            defaultPolicy: { name: "Food & Grain", allowedCategories: ["food"] }
        },
        kitchen_pantry: {
            name: "Kitchen Pantry",
            maxSlots: 10,
            maxWeight: 120.0,
            defaultPolicy: { name: "Kitchen Pantry", allowedCategories: ["food"] }
        },
        weapon_rack: {
            name: "Weapon Rack",
            maxSlots: 6,
            maxWeight: 100.0,
            defaultPolicy: { name: "Weapons & Armor", allowedCategories: ["weapon", "wear", "shield"] }
        },
        tool_rack: {
            name: "Tool Rack",
            maxSlots: 6,
            maxWeight: 80.0,
            defaultPolicy: { name: "Tool Rack", allowedCategories: ["tool"] }
        },
        stockpile: {
            name: "Transit Staging",
            maxSlots: 3,
            maxWeight: 100.0,
            defaultPolicy: { name: "Transit Staging" }
        }
    };

    const Containers = {};
    root.UF.Containers = Containers;

    let byCell = new Map();

    function containerState() {
        const W = World();
        if (!W || !W.state) return null;
        if (!W.state.containers) {
            W.state.containers = { nextId: 1, byId: {} };
        }
        return W.state.containers;
    }

    function reindex() {
        byCell.clear();
        const st = containerState();
        if (!st || !st.byId) return;
        for (const c of Object.values(st.byId)) {
            if (c && c.area) {
                const k = fullCellKey(c.area, c.x, c.y);
                byCell.set(k, c.id);
            }
        }
    }

    Containers.specs = () => Object.assign({}, CONTAINER_SPECS);
    Containers.spec = id => CONTAINER_SPECS[id] || null;
    Containers.isContainerType = typeId => {
        if (!typeId) return false;
        if (CONTAINER_SPECS[typeId]) return true;
        const O = Objects(), t = O ? O.type(typeId) : null;
        if (t && Array.isArray(t.tags) && (t.tags.includes("container") || t.tags.includes("stockpile"))) return true;
        return false;
    };

    Containers.state = () => containerState();

    Containers.get = function(id) {
        const st = containerState();
        return (st && st.byId && st.byId[id]) || null;
    };

    Containers.at = function(area, x, y, z) {
        const ref = { area: copyArea(area), z: z !== undefined ? z : zOf(area) };
        const k = fullCellKey(ref, x, y);
        const id = byCell.get(k);
        if (id) return Containers.get(id);
        const st = containerState();
        if (!st || !st.byId) return null;
        for (const c of Object.values(st.byId)) {
            if (c && c.x === (x | 0) && c.y === (y | 0) && zOf(c) === zOf(ref) &&
                c.area.x === area.x && c.area.y === area.y) {
                byCell.set(k, c.id);
                return c;
            }
        }
        return null;
    };

    Containers.all = function(area, z) {
        const st = containerState();
        if (!st || !st.byId) return [];
        const all = Object.values(st.byId);
        if (!area) return all;
        const targetZ = z !== undefined ? z : zOf(area);
        return all.filter(c => c && c.area && c.area.x === area.x && c.area.y === area.y && zOf(c) === targetZ);
    };

    Containers.create = function(typeId, cellRef, opts = {}) {
        const st = containerState();
        if (!st || !cellRef) return null;
        const x = cellRef.x | 0, y = cellRef.y | 0, z = zOf(cellRef);
        const existing = Containers.at(cellRef, x, y, z);
        if (existing) return existing;

        const spec = CONTAINER_SPECS[typeId] || { maxSlots: 12, maxWeight: 200.0, defaultPolicy: { name: "Storage" } };
        const c = {
            id: st.nextId++,
            typeId: typeId,
            area: copyArea(cellRef),
            x, y, z,
            maxSlots: (opts && opts.maxSlots) || spec.maxSlots || 12,
            maxWeight: (opts && opts.maxWeight) || spec.maxWeight || 200.0,
            items: [],
            policy: Object.assign({}, spec.defaultPolicy, (opts && opts.policy) || {}),
            owner: (opts && opts.owner) || { kind: "faction", id: "settler" },
            priority: (opts && opts.priority) || 3
        };
        st.byId[c.id] = c;
        byCell.set(fullCellKey(c.area, x, y), c.id);
        emit("containers:created", c);
        return c;
    };

    Containers.itemsIn = function(containerId) {
        const c = Containers.get(containerId);
        const I = Items();
        if (!c || !I) return [];
        return c.items.map(id => I.get(id)).filter(Boolean);
    };

    Containers.currentWeight = function(containerId) {
        const items = Containers.itemsIn(containerId);
        const I = Items();
        if (!I) return 0;
        let sum = 0;
        for (const it of items) sum += I.weightOf(it);
        return Math.round(sum * 10) / 10;
    };

    Containers.slotsUsed = function(containerId) {
        const c = Containers.get(containerId);
        return c ? c.items.length : 0;
    };

    Containers.canStore = function(containerId, itemOrTypeId, count = 1, actorOrOwner = null) {
        const c = Containers.get(containerId);
        if (!c) return { ok: false, reason: "no_container" };
        const I = Items();
        if (!I) return { ok: false, reason: "items_unavailable" };

        let typeId = null, mat = null, q = null, cnt = count;
        if (typeof itemOrTypeId === "number") {
            const it = I.get(itemOrTypeId);
            if (!it) return { ok: false, reason: "no_item" };
            typeId = it.type;
            mat = it.mat;
            q = it.q;
            cnt = it.count || 1;
        } else if (typeof itemOrTypeId === "object" && itemOrTypeId !== null) {
            typeId = itemOrTypeId.type || itemOrTypeId.id;
            mat = itemOrTypeId.mat || null;
            q = itemOrTypeId.q !== undefined ? itemOrTypeId.q : null;
            cnt = itemOrTypeId.count !== undefined ? itemOrTypeId.count : count;
        } else {
            typeId = itemOrTypeId;
        }

        const t = I.type(typeId);
        if (!t) return { ok: false, reason: "unknown_type" };

        // 1. Weight capacity check
        const addWeight = I.weightOf({ type: typeId, mat, count: cnt });
        const curWeight = Containers.currentWeight(containerId);
        if (curWeight + addWeight > c.maxWeight + 0.001) {
            return { ok: false, reason: "weight_full", curWeight, addWeight, maxWeight: c.maxWeight };
        }

        // 2. Slot capacity check (allows merging into existing stack)
        const items = Containers.itemsIn(containerId);
        const maxStack = Math.max(1, Number(t.stack) || 1);
        const mergeable = items.find(it => it.type === typeId && (it.mat || null) === (mat || null) && (it.q ?? null) === (q ?? null) && it.count < maxStack);
        if (!mergeable && items.length >= c.maxSlots) {
            return { ok: false, reason: "slots_full", slotsUsed: items.length, maxSlots: c.maxSlots };
        }

        // 3. Storage Policy Filter Check
        const policy = c.policy || {};
        if (policy.allowedTypes && policy.allowedTypes.length && !policy.allowedTypes.includes(typeId)) {
            return { ok: false, reason: "type_not_allowed" };
        }
        if (policy.allowedCategories && policy.allowedCategories.length) {
            const isFood = t.food || (Array.isArray(t.tags) && t.tags.includes("food"));
            const isMaterial = Array.isArray(t.tags) && (t.tags.includes("wood") || t.tags.includes("stone") || t.tags.includes("metal") || t.tags.includes("material"));
            const isTool = t.tool || (Array.isArray(t.tags) && t.tags.includes("tool"));
            const isWeapon = Array.isArray(t.tags) && (t.tags.includes("weapon") || t.tags.includes("shield"));
            const isClothes = t.wear || (Array.isArray(t.tags) && t.tags.includes("wear"));
            let catMatches = false;
            for (const cat of policy.allowedCategories) {
                if (cat === "food" && isFood) catMatches = true;
                if (cat === "material" && isMaterial) catMatches = true;
                if (cat === "tool" && isTool) catMatches = true;
                if (cat === "weapon" && isWeapon) catMatches = true;
                if (cat === "clothes" && isClothes) catMatches = true;
            }
            if (!catMatches) return { ok: false, reason: "category_not_allowed" };
        }
        if (policy.allowedTags && policy.allowedTags.length) {
            const itemTags = Array.isArray(t.tags) ? t.tags : [];
            const tagMatches = policy.allowedTags.some(tag => itemTags.includes(tag));
            if (!tagMatches) return { ok: false, reason: "tag_not_allowed" };
        }
        if (policy.forbiddenMaterials && policy.forbiddenMaterials.length && mat) {
            if (policy.forbiddenMaterials.includes(mat)) {
                return { ok: false, reason: "forbidden_material" };
            }
        }
        if (policy.minQuality !== undefined && q !== null && q < policy.minQuality) {
            return { ok: false, reason: "quality_too_low" };
        }
        if (policy.maxQuality !== undefined && q !== null && q > policy.maxQuality) {
            return { ok: false, reason: "quality_too_high" };
        }

        // 4. Ownership Access Check
        if (actorOrOwner && c.owner) {
            const ownKind = c.owner.kind;
            if (ownKind === "unit") {
                const actorId = typeof actorOrOwner === "object" ? actorOrOwner.id : actorOrOwner;
                if (c.owner.id !== actorId) return { ok: false, reason: "personal_ownership" };
            } else if (ownKind === "household") {
                const H = window.UF && UF.Households;
                if (H && typeof H.of === "function") {
                    const hh = H.of(actorOrOwner);
                    if (!hh || hh.id !== c.owner.id) return { ok: false, reason: "household_ownership" };
                }
            }
        }

        return { ok: true };
    };

    Containers.putItem = function(containerId, itemOrId) {
        const c = Containers.get(containerId);
        if (!c) return false;
        const I = Items();
        if (!I) return false;
        const it = typeof itemOrId === "object" ? itemOrId : I.get(itemOrId);
        if (!it) return false;

        const check = Containers.canStore(containerId, it, it.count || 1);
        if (!check.ok) return false;

        // Detach item from wherever it previously was (ground cell or creature)
        if (typeof I.detach === "function") {
            I.detach(it);
        } else {
            it.area = null;
            it.holder = null;
        }

        it.container = c.id;
        it.holder = null;
        it.area = null;
        it.x = c.x;
        it.y = c.y;
        it.z = c.z;

        // Attempt stack merge into existing item inside container
        const t = I.type(it.type);
        const maxStack = Math.max(1, Number(t && t.stack) || 1);
        for (const existingId of c.items) {
            if (it.count <= 0) break;
            const existing = I.get(existingId);
            if (!existing || existing.id === it.id) continue;
            if (existing.type === it.type && (existing.mat || null) === (it.mat || null) && (existing.q ?? null) === (it.q ?? null) && existing.count < maxStack) {
                const add = Math.min(maxStack - existing.count, it.count);
                existing.count += add;
                it.count -= add;
            }
        }

        if (it.count <= 0) {
            I.remove(it.id);
            emit("containers:itemAdded", c, it);
            return true;
        }

        if (!c.items.includes(it.id)) {
            c.items.push(it.id);
        }
        emit("containers:itemAdded", c, it);
        return true;
    };

    Containers.takeItem = function(containerId, itemId, unitId, count = null) {
        const c = Containers.get(containerId);
        if (!c) return false;
        const I = Items();
        if (!I) return false;
        const it = I.get(itemId);
        if (!it || it.container !== c.id) return false;

        const idx = c.items.indexOf(it.id);
        if (idx < 0) return false;

        const takeCount = count === null ? it.count : Math.min(it.count, count | 0);
        if (takeCount < it.count) {
            // Split stack: decrement container stack, create carried item for unit
            it.count -= takeCount;
            const made = I.give(it.type, takeCount, unitId, { mat: it.mat, q: it.q });
            emit("containers:itemRemoved", c, it);
            return (made && made.length > 0) ? made[0] : null;
        }

        // Full stack transfer
        c.items.splice(idx, 1);
        it.container = null;
        const picked = I.pickUp(it.id, unitId, { bypassLocation: true });
        if (picked) {
            emit("containers:itemRemoved", c, it);
            return it;
        } else {
            // Restore to container if unit cannot carry it
            c.items.push(it.id);
            it.container = c.id;
            return null;
        }
    };

    Containers.removeItem = function(containerId, itemId) {
        const c = Containers.get(containerId);
        if (!c) return false;
        const idx = c.items.indexOf(itemId);
        if (idx >= 0) {
            c.items.splice(idx, 1);
            emit("containers:itemRemoved", c, { id: itemId });
            return true;
        }
        return false;
    };

    Containers.setPolicy = function(containerId, policy) {
        const c = Containers.get(containerId);
        if (!c) return false;
        c.policy = Object.assign({}, c.policy, policy);
        emit("containers:policyChanged", c);
        return true;
    };

    Containers.spill = function(containerId) {
        const c = Containers.get(containerId);
        if (!c) return [];
        const I = Items();
        if (!I) return [];
        const st = containerState();
        const spilled = [];
        for (const itemId of c.items.slice()) {
            const it = I.get(itemId);
            if (!it) continue;
            it.container = null;
            const placed = I.putDown(it.id, c.area, c.x, c.y);
            if (placed) spilled.push(placed);
        }
        c.items = [];
        delete st.byId[c.id];
        byCell.delete(fullCellKey(c.area, c.x, c.y));
        emit("containers:spilled", c, spilled);
        emit("containers:destroyed", c);
        return spilled;
    };

    Containers.reindex = reindex;

    // Automatic container binding on object placement and removal
    listen("objects:changed", (area, x, y, fromTypeId, toTypeId) => {
        if (toTypeId && Containers.isContainerType(toTypeId)) {
            Containers.create(toTypeId, { area, x, y, z: zOf(area) });
        } else if (fromTypeId && Containers.isContainerType(fromTypeId)) {
            const c = Containers.at(area, x, y, zOf(area));
            if (c) Containers.spill(c.id);
        }
    });

    listen("objects:levelChanged", (area, x, y, fromTypeId, toTypeId) => {
        if (toTypeId && Containers.isContainerType(toTypeId)) {
            Containers.create(toTypeId, { area, x, y, z: zOf(area) });
        } else if (fromTypeId && Containers.isContainerType(fromTypeId)) {
            const c = Containers.at(area, x, y, zOf(area));
            if (c) Containers.spill(c.id);
        }
    });

    listen("world:created", () => { reindex(); });
    listen("world:loaded", () => { reindex(); });

    if (typeof module !== "undefined") {
        module.exports = Containers;
    }
})();
