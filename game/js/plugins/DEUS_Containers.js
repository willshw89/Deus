//=============================================================================
// DEUS_Containers.js - Physical Container Infrastructure & Storage Policies
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Containers] Physical storage container infrastructure, finite capacity (slots & weight), contextual policies, and item spill on destruction.
 * @author UF project
 * @base DEUS_World
 * @base DEUS_Objects
 * @base DEUS_Items
 * @orderAfter DEUS_World
 * @orderAfter DEUS_Objects
 * @orderAfter DEUS_Items
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
            maxSlots: 32,
            maxWeight: 500.0,
            defaultPolicy: { name: "General Stockpile" }
        },
        crate_wood: {
            name: "Storage Crate",
            maxSlots: 32,
            maxWeight: 350.0,
            defaultPolicy: { name: "Bulk Storage", allowedTags: ["wood", "stone", "material", "ore"] }
        },
        barrel_food: {
            name: "Food Barrel",
            maxSlots: 32,
            maxWeight: 200.0,
            defaultPolicy: { name: "Food & Grain", allowedCategories: ["food"] }
        },
        kitchen_pantry: {
            name: "Kitchen Pantry",
            maxSlots: 32,
            maxWeight: 250.0,
            defaultPolicy: { name: "Kitchen Pantry", allowedCategories: ["food"] }
        },
        weapon_rack: {
            name: "Weapon Rack",
            maxSlots: 32,
            maxWeight: 150.0,
            defaultPolicy: { name: "Weapons & Armor", allowedCategories: ["weapon", "wear", "shield"] }
        },
        tool_rack: {
            name: "Tool Rack",
            maxSlots: 32,
            maxWeight: 120.0,
            defaultPolicy: { name: "Tool Rack", allowedCategories: ["tool"] }
        },
        stockpile: {
            name: "Transit Staging",
            maxSlots: 32,
            maxWeight: 500.0,
            defaultPolicy: { name: "Transit Staging" }
        }
    };

    const Containers = {};
    root.DEUS = root.DEUS || {};
    root.UF = root.DEUS;
    root.UF.Containers = Containers;
    root.DEUS.Containers = Containers;

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

        const spec = CONTAINER_SPECS[typeId] || { maxSlots: 32, maxWeight: 300.0, defaultPolicy: { name: "Storage" } };
        const c = {
            id: st.nextId++,
            typeId: typeId,
            area: copyArea(cellRef),
            x, y, z,
            maxSlots: (opts && opts.maxSlots) || spec.maxSlots || 32,
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

    //-------------------------------------------------------------------------
    // Universal Item Drag & Drop System (Sprite_UFDragIcon & UF.ItemDrag)
    //-------------------------------------------------------------------------

    class Sprite_UFDragIcon extends Sprite {
        initialize() {
            super.initialize();
            this.bitmap = new Bitmap(44, 44);
            this.anchor.set(0.5, 0.5);
            this.z = 99999;
            this.visible = false;
        }

        update() {
            super.update();
            if (this.visible) {
                this.x = TouchInput.x;
                this.y = TouchInput.y;
            }
        }

        setItem(it) {
            const b = this.bitmap;
            b.clear();
            if (!it) return;
            const I = Items();
            const t = I ? I.type(it.type) : null;
            const w = 44, h = 44;

            // Translucent glowing dark tile backing
            b.fillRect(2, 2, w - 4, h - 4, "rgba(10, 18, 30, 0.92)");
            b.strokeRect(2, 2, w - 4, h - 4, "rgba(56, 189, 248, 0.95)", 2);
            b.fillRect(3, 3, w - 6, 1, "rgba(186, 230, 253, 0.70)");

            // Draw item icon/character graphic
            if (window.UF && UF.Sheet && typeof UF.Sheet.drawItemIn === "function") {
                UF.Sheet.drawItemIn(b, { x: 6, y: 6, w: 32, h: 32 }, it.type, it.count);
            } else if (t && t.image) {
                const img = ImageManager.loadCharacter(t.image);
                if (img && img.isReady()) {
                    const fw = Math.floor(img.width / 3), fh = Math.floor(img.height / 4);
                    b.blt(img, fw, 0, fw, fh, 6, 6, 32, 32);
                }
                if (it.count > 1) {
                    b.fontSize = 12;
                    b.textColor = "#ffffff";
                    b.outlineColor = "rgba(0,0,0,0.95)";
                    b.outlineWidth = 3;
                    b.drawText(String(it.count), 4, h - 15, w - 8, 12, "right");
                }
            }
        }
    }

    const ItemDrag = {
        _active: false,
        _attached: false,
        _source: null, // { kind: "container"|"inventory"|"equipment", containerId, unitId, slotIdx, item }
        _downX: 0,
        _downY: 0,
        _downTime: 0,
        _dragStarted: false,
        _dragSprite: null,

        isDragging() {
            return this._attached || this._active;
        },

        hasAttached() {
            return this._attached && !!this._source;
        },

        source() {
            return this._source;
        },

        ensureSprite(scene) {
            if (!this._dragSprite || !this._dragSprite.parent) {
                this._dragSprite = new Sprite_UFDragIcon();
                if (scene && scene._windowLayer) {
                    scene._windowLayer.addChild(this._dragSprite);
                } else if (scene) {
                    scene.addChild(this._dragSprite);
                }
            }
            return this._dragSprite;
        },

        attach(source, scene) {
            this._attached = true;
            this._active = true;
            this._source = source;
            this._downX = TouchInput.x;
            this._downY = TouchInput.y;
            this._downTime = Date.now();
            this._downFrame = (typeof Graphics !== "undefined" && Graphics.frameCount) || 0;
            this._justAttached = true;
            this._dragStarted = false;

            const spr = this.ensureSprite(scene);
            spr.setItem(source.item);
            spr.visible = true;
            spr.x = TouchInput.x;
            spr.y = TouchInput.y;
            SoundManager.playCursor();
        },

        cancel() {
            this._attached = false;
            this._active = false;
            this._source = null;
            this._justAttached = false;
            this._dragStarted = false;
            if (this._dragSprite) this._dragSprite.visible = false;
        },

        clear() {
            this.cancel();
        },

        update(scene) {
            if (!this._attached || !this._source) return;

            // Follow mouse cursor
            if (this._dragSprite) {
                this._dragSprite.x = TouchInput.x;
                this._dragSprite.y = TouchInput.y;
                this._dragSprite.visible = true;
            }

            // Right click cancels mouse pickup!
            if (TouchInput.isCancelled()) {
                TouchInput._currentState.cancelled = false;
                this.cancel();
                SoundManager.playCancel();
                const card = scene ? scene._ufContainerCard : null;
                if (card) card.refresh();
                const sheet = window.UF && UF.Sheet && UF.Sheet.window ? UF.Sheet.window() : null;
                if (sheet) sheet.redraw();
                return;
            }

            if (this._justAttached) {
                const curFrame = (typeof Graphics !== "undefined" && Graphics.frameCount) || 0;
                if (!TouchInput.isPressed() && !TouchInput.isTriggered()) {
                    this._justAttached = false;
                } else if (curFrame > this._downFrame || Date.now() - this._downTime >= 20) {
                    this._justAttached = false;
                } else {
                    return;
                }
            }

            // Drag movement detection
            if (TouchInput.isPressed()) {
                const dist = Math.hypot(TouchInput.x - this._downX, TouchInput.y - this._downY);
                if (dist >= 10) {
                    this._dragStarted = true;
                }
            } else {
                // If user held and dragged (dist >= 10), release drops!
                if (this._dragStarted) {
                    this.executeDrop(TouchInput.x, TouchInput.y);
                    this.cancel();
                    return;
                }
            }

            // Click-to-drop: If mouse is triggered after having attached on a different frame
            if (TouchInput.isTriggered()) {
                TouchInput._currentState.triggered = false;
                this.executeDrop(TouchInput.x, TouchInput.y);
                this.cancel();
                return;
            }
        },

        executeDrop(dropX, dropY) {
            if (!this._source) return;
            const src = this._source;
            const scene = SceneManager._scene;
            const card = scene ? scene._ufContainerCard : null;
            const sheet = window.UF && UF.Sheet && UF.Sheet.window ? UF.Sheet.window() : null;
            const I = Items();
            const W = World();
            if (!I) return;

            const u = (src && src.unitId && W) ? W.unit(src.unitId) : resolveActiveUnit();
            const cId = card ? card._containerId : null;

            // 1. Check if dropped over Container Card
            if (card && card.visible && typeof card.isPointerInsideCoords === "function" && card.isPointerInsideCoords(dropX, dropY)) {
                const targetSlot = card.slotAtCoords(dropX, dropY);
                if (src.kind === "inventory") {
                    // Transfer from Colonist Inventory -> Container
                    const deposited = Containers.putItem(cId, src.item.id);
                    if (deposited) {
                        SoundManager.playOk();
                        card.refresh();
                        if (sheet) sheet.redraw();
                    } else {
                        SoundManager.playBuzzer();
                    }
                    return;
                } else if (src.kind === "container") {
                    // Reorder within container if dropped on different slot
                    if (targetSlot >= 0 && targetSlot !== src.slotIdx) {
                        card.reorderSlot(src.slotIdx, targetSlot);
                    }
                    return;
                }
            }

            // 2. Check if dropped over Character Profile Sheet (Inventory / Equipment)
            if (sheet && sheet.visible && typeof sheet.isPointerInsideCoords === "function" && sheet.isPointerInsideCoords(dropX, dropY)) {
                const targetSlot = typeof sheet.inventorySlotAtCoords === "function" ? sheet.inventorySlotAtCoords(dropX, dropY) : -1;
                const targetEquip = typeof sheet.equipmentSlotAtCoords === "function" ? sheet.equipmentSlotAtCoords(dropX, dropY) : null;

                if (targetEquip && u) {
                    // Equip item!
                    if (src.kind === "inventory" || src.kind === "container") {
                        if (src.kind === "container") {
                            Containers.takeItem(src.containerId, src.item.id, u.id);
                        }
                        if (typeof I.equip === "function") {
                            I.equip(u.id, src.item.id, targetEquip.slot);
                        }
                        SoundManager.playEquip();
                        if (card) card.refresh();
                        sheet.redraw();
                        return;
                    }
                }

                if (src.kind === "container" && u) {
                    // Transfer from Container -> Colonist Inventory
                    const transferred = Containers.takeItem(src.containerId, src.item.id, u.id);
                    if (transferred) {
                        SoundManager.playOk();
                        if (card) card.refresh();
                        sheet.redraw();
                    } else {
                        SoundManager.playBuzzer();
                    }
                    return;
                } else if (src.kind === "inventory") {
                    // Reorder within colonist inventory
                    if (targetSlot >= 0 && targetSlot !== src.slotIdx && typeof sheet.reorderSlot === "function") {
                        sheet.reorderSlot(src.slotIdx, targetSlot);
                    }
                    return;
                }
            }

            // 3. Dropped OUTSIDE both cards onto the map ground!
            const mx = $gameMap ? $gameMap.canvasToMapX(dropX) : (u ? u.x : 0);
            const my = $gameMap ? $gameMap.canvasToMapY(dropY) : (u ? u.y : 0);
            const curArea = (u && u.area) || (W ? W.currentArea() : null);

            if (src.kind === "inventory" && u) {
                // Drop from colonist to ground
                if (typeof I.putDown === "function") {
                    this._lastDropResult = I.putDown(src.item.id, curArea, mx, my);
                    SoundManager.playCursor();
                    if (sheet) sheet.redraw();
                }
            } else if (src.kind === "container") {
                // Drop from chest to ground
                Containers.removeItem(src.containerId, src.item.id);
                if (typeof I.putDown === "function") {
                    this._lastDropResult = I.putDown(src.item.id, curArea, mx, my);
                    SoundManager.playCursor();
                    if (card) card.refresh();
                }
            }
        }
    };
    UF.ItemDrag = ItemDrag;

    //-------------------------------------------------------------------------
    // Side-by-Side Container Card (Window_UFContainerCard)
    //-------------------------------------------------------------------------

    function resolveActiveUnit() {
        const W = World();
        if (!W) return null;
        const sheetWin = window.UF && UF.Sheet && UF.Sheet.window ? UF.Sheet.window() : null;
        if (sheetWin && sheetWin._subject && sheetWin._subject.kind === "unit") {
            const u = W.unit(sheetWin._subject.unitId);
            if (u) return u;
        }
        const cm = window.$colonyManager;
        if (cm && cm.selectedColonist) {
            if (cm.selectedColonist.unit) return cm.selectedColonist.unit;
            if (typeof cm.selectedColonist.id === "number" || typeof cm.selectedColonist.id === "string") {
                const u = W.unit(cm.selectedColonist.id);
                if (u) return u;
            }
            if (typeof cm.selectedColonist.x === "number") return cm.selectedColonist;
        }
        const S = window.UF && UF.Select;
        if (S && typeof S.selected === "function") {
            const sel = S.selected();
            if (sel && sel.length > 0) {
                const u = W.unit(sel[0]);
                if (u) return u;
            }
        }
        const cols = W.state && W.state.colony && Array.isArray(W.state.colony.colonists) ? W.state.colony.colonists : [];
        if (cols.length > 0) {
            const u = W.unit(cols[0]);
            if (u) return u;
        }
        return null;
    }

    class Window_UFContainerCard extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this.backOpacity = 235;
            this._containerId = null;
            this._chestX = null;
            this._chestY = null;
            this._chestArea = null;
            this._selSlot = -1;
            this._footer = "";
            this._slotRects = [];
            this._standalone = false;
            this.hide();
        }

        isOpen() {
            return this.visible;
        }

        isPointerInsideCoords(gx, gy) {
            return gx >= this.x && gx < this.x + this.width && gy >= this.y && gy < this.y + this.height;
        }

        slotAtCoords(gx, gy) {
            const mx = gx - this.x - this.padding;
            const my = gy - this.y - this.padding;
            for (let i = 0; i < this._slotRects.length; i++) {
                const r = this._slotRects[i];
                if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return i;
            }
            return -1;
        }

        reorderSlot(srcIdx, destIdx) {
            const c = Containers.get(this._containerId);
            if (!c || !c.items) return;
            const items = c.items;
            if (srcIdx < 0 || srcIdx >= items.length) return;
            const moved = items.splice(srcIdx, 1)[0];
            const insertAt = Math.min(items.length, Math.max(0, destIdx));
            items.splice(insertAt, 0, moved);
            this.refresh();
        }

        openFor(containerId, cx, cy, area) {
            this._containerId = containerId;
            this._chestX = cx;
            this._chestY = cy;
            this._chestArea = area || (World() ? World().currentArea() : null);
            this._selSlot = -1;
            this._footer = "";

            const sheetWin = window.UF && UF.Sheet && UF.Sheet.window ? UF.Sheet.window() : null;
            if (sheetWin && sheetWin.visible) {
                const targetW = Math.min(380, Math.max(280, sheetWin.x - 16));
                const targetX = Math.max(8, sheetWin.x - targetW - 8);
                const targetY = sheetWin.y;
                const targetH = sheetWin.height;
                this.move(targetX, targetY, targetW, targetH);
            } else {
                const w = 360;
                const h = 340;
                const y = 82;
                const x = Math.max(8, Graphics.boxWidth - w - 8);
                this.move(x, y, w, h);
            }
            this.createContents();
            this.show();
            this.refresh();
        }

        close() {
            if (ItemDrag && ItemDrag.hasAttached()) {
                ItemDrag.cancel();
            }
            if (this._chestX !== null && this._chestY !== null) {
                if (window.UF && UF.Objects && typeof UF.Objects.closeChest === "function") {
                    UF.Objects.closeChest(this._chestX, this._chestY);
                }
            }
            this._containerId = null;
            this._chestX = null;
            this._chestY = null;
            this._chestArea = null;
            this._selSlot = -1;
            this._standalone = false;
            this.hide();
            if (window.UF && UF.Sheet && UF.Sheet.window()) {
                UF.Sheet.window().redraw();
            }
        }

        update() {
            super.update();
            if (!this.visible) return;
            this.processTouch();
            if (Input.isTriggered("escape")) {
                this.close();
                return;
            }
            const sheetWin = window.UF && UF.Sheet && UF.Sheet.window ? UF.Sheet.window() : null;
            if (!this._standalone && sheetWin && !sheetWin.visible) {
                this.close();
                return;
            }
            const u = resolveActiveUnit();
            if (u && this._chestX !== null) {
                const dist = Math.hypot(u.x - this._chestX, u.y - this._chestY);
                if (dist > 3) {
                    this.close();
                    return;
                }
            }
            if (sheetWin && sheetWin.visible) {
                this._standalone = false;
                const targetW = Math.min(380, Math.max(280, sheetWin.x - 16));
                const targetX = Math.max(8, sheetWin.x - targetW - 8);
                const targetY = sheetWin.y;
                const targetH = sheetWin.height;
                if (this.x !== targetX || this.y !== targetY || this.height !== targetH || this.width !== targetW) {
                    this.move(targetX, targetY, targetW, targetH);
                    this.createContents();
                    this.refresh();
                }
            }
        }

        processTouch() {
            if (!TouchInput.isTriggered() && !TouchInput.isCancelled()) return;
            if (TouchInput.x < this.x || TouchInput.x >= this.x + this.width || TouchInput.y < this.y || TouchInput.y >= this.y + this.height) return;
            const mx = TouchInput.x - this.x - this.padding;
            const my = TouchInput.y - this.y - this.padding;

            // Handle Right Click (TouchInput.isCancelled())
            if (TouchInput.isCancelled()) {
                TouchInput._currentState.cancelled = false;
                // If an item is attached to mouse cursor, cancel pickup!
                if (ItemDrag && ItemDrag.hasAttached()) {
                    ItemDrag.cancel();
                    SoundManager.playCancel();
                    this.refresh();
                    const sheet = window.UF && UF.Sheet && UF.Sheet.window ? UF.Sheet.window() : null;
                    if (sheet) sheet.redraw();
                    return;
                }

                // Check if right click hit an item slot
                for (let i = 0; i < this._slotRects.length; i++) {
                    const r = this._slotRects[i];
                    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
                        const items = Containers.itemsIn(this._containerId);
                        const it = items[i];
                        if (it) {
                            this.useItemAtSlot(i, it);
                            return;
                        }
                    }
                }

                // If not over an item slot, close window
                this.close();
                SoundManager.playCancel();
                return;
            }

            // Close box [X]
            if (mx >= this.innerWidth - 22 && mx <= this.innerWidth && my >= 0 && my <= 22) {
                TouchInput._currentState.triggered = false;
                this.close();
                SoundManager.playCancel();
                return;
            }

            // If mouse already has an item attached, left clicking anywhere inside container card drops/deposits it
            if (ItemDrag && ItemDrag.hasAttached()) {
                TouchInput._currentState.triggered = false;
                ItemDrag.executeDrop(TouchInput.x, TouchInput.y);
                ItemDrag.cancel();
                return;
            }

            // Slot clicks / mouse pickup
            for (let i = 0; i < this._slotRects.length; i++) {
                const r = this._slotRects[i];
                if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
                    TouchInput._currentState.triggered = false;
                    const items = Containers.itemsIn(this._containerId);
                    const it = items[i];
                    if (it) {
                        this._selSlot = i;
                        const I = Items();
                        const t = I ? I.type(it.type) : null;
                        this._footer = `${t ? t.name : it.type} × ${it.count} · Click to attach or drag`;
                        this.refresh();
                        if (ItemDrag) {
                            ItemDrag.attach({
                                kind: "container",
                                containerId: this._containerId,
                                slotIdx: i,
                                item: it
                            }, SceneManager._scene);
                        }
                    } else {
                        this._selSlot = -1;
                        this._footer = "Empty container slot";
                        this.refresh();
                    }
                    return;
                }
            }
        }

        useItemAtSlot(slotIdx, it) {
            const u = resolveActiveUnit();
            if (!u) {
                this._footer = "No colonist selected to use item";
                SoundManager.playBuzzer();
                this.refresh();
                return;
            }
            const I = Items();
            const t = I ? I.type(it.type) : null;
            const tags = (t && Array.isArray(t.tags)) ? t.tags : [];
            const isFood = (t && t.food) || tags.includes("food") || tags.includes("drink") || tags.includes("consumable") || ["meat_cooked", "meat_raw", "berries", "bread", "ration", "apple", "fish"].includes(it.type);

            if (isFood) {
                const hungerRestore = (t && t.food && typeof t.food.hunger === "number") ? t.food.hunger : 40;
                const thirstRestore = (t && t.food && typeof t.food.thirst === "number") ? t.food.thirst : 10;
                if (!u.data) u.data = {};
                if (!u.data.needs) u.data.needs = {};
                const prevHunger = u.data.needs.hunger || 0;
                u.data.needs.hunger = Math.max(0, prevHunger - hungerRestore);
                if (u.data.needs.thirst !== undefined) {
                    u.data.needs.thirst = Math.max(0, u.data.needs.thirst - thirstRestore);
                }
                const maxHp = u.data.maxHp || (u.data.dnd ? u.data.dnd.hpMax : 10);
                if (u.data.hp !== undefined && u.data.hp < maxHp) {
                    u.data.hp = Math.min(maxHp, u.data.hp + 2);
                }
                // Decrement count in container
                if (it.count > 1) {
                    it.count--;
                    if (I && typeof I.changed === "function") I.changed(it, "count");
                } else {
                    Containers.removeItem(this._containerId, it.id);
                }
                SoundManager.playRecovery();
                this._footer = `${u.name || "Colonist"} ate ${t ? t.name : it.type} (-${hungerRestore} Hunger)`;
                this.refresh();
                const sheet = window.UF && UF.Sheet && UF.Sheet.window ? UF.Sheet.window() : null;
                if (sheet) sheet.redraw();
                return;
            }

            const isEquip = t && (t.slot || tags.includes("weapon") || tags.includes("armor") || tags.includes("shield") || tags.includes("clothes") || tags.includes("wear"));
            if (isEquip) {
                const slot = t.slot || (tags.includes("weapon") ? "mainHand" : tags.includes("shield") ? "offHand" : tags.includes("armor") ? "body" : tags.includes("head") ? "head" : "mainHand");
                const transferred = Containers.takeItem(this._containerId, it.id, u.id);
                if (transferred && I && typeof I.equip === "function") {
                    I.equip(u.id, it.id, slot);
                    SoundManager.playEquip();
                    this._footer = `${u.name || "Colonist"} equipped ${t ? t.name : it.type}`;
                    this.refresh();
                    const sheet = window.UF && UF.Sheet && UF.Sheet.window ? UF.Sheet.window() : null;
                    if (sheet) sheet.redraw();
                    return;
                }
            }

            // Default: transfer from container to colonist
            const transferred = Containers.takeItem(this._containerId, it.id, u.id);
            if (transferred) {
                SoundManager.playOk();
                this._footer = `Transferred ${t ? t.name : it.type} to ${u.name || "Colonist"}`;
                this.refresh();
                const sheet = window.UF && UF.Sheet && UF.Sheet.window ? UF.Sheet.window() : null;
                if (sheet) sheet.redraw();
            } else {
                SoundManager.playBuzzer();
            }
        }

        onSlotClick(slotIdx) {
            const c = Containers.get(this._containerId);
            if (!c) return;
            const I = Items();
            if (!I) return;
            const items = Containers.itemsIn(this._containerId);
            const it = items[slotIdx];
            if (!it) {
                this._selSlot = -1;
                this._footer = "Empty container slot";
                this.refresh();
                return;
            }

            this._selSlot = slotIdx;
            const t = I.type(it.type);
            this._footer = `${t ? t.name : it.type} × ${it.count} · Click transfers to unit`;

            const u = resolveActiveUnit();
            if (u) {
                const transferred = Containers.takeItem(this._containerId, it.id, u.id);
                if (transferred) {
                    SoundManager.playOk();
                    this.refresh();
                    if (window.UF && UF.Sheet && UF.Sheet.window()) {
                        UF.Sheet.window().redraw();
                    }
                } else {
                    SoundManager.playBuzzer();
                }
            } else {
                SoundManager.playCursor();
                this.refresh();
            }
        }

        refresh() {
            const contents = this.contents;
            contents.clear();
            this._slotRects = [];
            const c = Containers.get(this._containerId);
            const I = Items();
            const iw = this.innerWidth;

            const name = (c && c.spec && c.spec.name) || "Wooden Chest";
            const polName = (c && c.policy && c.policy.name) || "General Stockpile";
            const items = c ? Containers.itemsIn(this._containerId) : [];
            const curW = c ? Containers.currentWeight(this._containerId) : 0;
            const maxW = c && c.spec ? c.spec.maxWeight : 500;
            const maxSlots = c && c.spec ? c.spec.maxSlots : 32;

            contents.fillRect(iw - 20, 2, 18, 18, "rgba(0, 0, 0, 0.6)");
            contents.fillRect(iw - 20, 2, 18, 1, "rgba(255, 255, 255, 0.4)");
            contents.fillRect(iw - 20, 19, 18, 1, "rgba(0, 0, 0, 0.8)");
            contents.fontSize = 12;
            contents.textColor = "#e2e8f0";
            contents.drawText("×", iw - 20, 2, 18, 18, "center");

            contents.fontSize = 16;
            contents.textColor = "#f8fafc";
            contents.drawText(name, 4, 2, iw - 26, 20, "left");

            contents.fontSize = 12;
            contents.textColor = "#94a3b8";
            contents.drawText(`${polName} · Container Storage`, 4, 22, iw - 8, 16, "left");

            contents.fontSize = 11;
            contents.textColor = "#38bdf8";
            contents.drawText(`Capacity: ${items.length}/${maxSlots} slots · ${curW.toFixed(1)}/${maxW.toFixed(0)} lbs`, 4, 42, iw - 8, 14, "left");

            const barY = 58;
            contents.fillRect(4, barY, iw - 8, 6, "rgba(15, 23, 42, 0.8)");
            const pct = Math.max(0, Math.min(1, curW / maxW));
            if (pct > 0) {
                contents.fillRect(4, barY, Math.floor((iw - 8) * pct), 6, "#38bdf8");
            }
            contents.strokeRect(4, barY, iw - 8, 6, "rgba(56, 189, 248, 0.5)", 1);

            const cols = 8;
            const rows = 4;
            const slotW = 32;
            const slotH = 32;
            const gap = 3;
            const gridW = cols * slotW + (cols - 1) * gap;
            const startX = Math.max(0, Math.floor((iw - gridW) / 2));
            const startY = 74;

            for (let i = 0; i < maxSlots; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const rx = startX + col * (slotW + gap);
                const ry = startY + row * (slotH + gap);
                this._slotRects.push({ x: rx, y: ry, w: slotW, h: slotH });

                contents.fillRect(rx, ry, slotW, slotH, "rgba(15, 20, 30, 0.7)");
                contents.fillRect(rx, ry, slotW, 1, "rgba(0, 0, 0, 0.8)");
                contents.fillRect(rx, ry, 1, slotH, "rgba(0, 0, 0, 0.8)");
                contents.fillRect(rx, ry + slotH - 1, slotW, 1, "rgba(255, 255, 255, 0.15)");
                contents.fillRect(rx + slotW - 1, ry, 1, slotH, "rgba(255, 255, 255, 0.15)");

                if (this._selSlot === i) {
                    contents.strokeRect(rx, ry, slotW, slotH, "#facc15", 2);
                }

                const it = items[i];
                if (it && I) {
                    const t = I.type(it.type);
                    if (window.UF && UF.Sheet && typeof UF.Sheet.drawItemIn === "function") {
                        UF.Sheet.drawItemIn(contents, { x: rx, y: ry, w: slotW, h: slotH }, it.type, it.count);
                    } else if (t && t.image) {
                        const bmp = ImageManager.loadCharacter(t.image);
                        if (bmp && bmp.isReady()) {
                            const fw = Math.floor(bmp.width / 3), fh = Math.floor(bmp.height / 4);
                            contents.blt(bmp, fw, 0, fw, fh, rx + 2, ry + 2, slotW - 4, slotH - 4);
                        }
                        if (it.count > 1) {
                            contents.fontSize = 10;
                            contents.textColor = "#ffffff";
                            contents.drawText(String(it.count), rx, ry + slotH - 12, slotW - 2, 12, "right");
                        }
                    }
                }
            }

            const footY = startY + rows * (slotH + gap) + 8;
            contents.fontSize = 11;
            contents.textColor = "#94a3b8";
            contents.drawText("Exchange: Click item to transfer to selected unit.", 4, footY, iw - 8, 14, "center");
            contents.drawText("Drag items between cards or out to ground.", 4, footY + 16, iw - 8, 14, "center");

            if (this._footer) {
                contents.fillRect(4, footY + 36, iw - 8, 22, "rgba(10, 15, 25, 0.8)");
                contents.fontSize = 11;
                contents.textColor = "#facc15";
                contents.drawText(this._footer, 8, footY + 38, iw - 16, 18, "left");
            }
        }
    }

    Containers.Window_UFContainerCard = Window_UFContainerCard;

    Containers.openChestInfo = function(x, y, area, z) {
        const W = World();
        const curArea = area || (W ? W.currentArea() : { x: 0, y: 0 });
        const curZ = typeof z === "number" ? z : 0;
        let cont = Containers.at(curArea, x, y, curZ);
        if (!cont) {
            cont = Containers.create("chest_wood", { area: curArea, x, y, z: curZ });
        }
        if (window.UF && UF.Objects && typeof UF.Objects.openChest === "function") {
            UF.Objects.openChest(x, y);
        }
        const scene = SceneManager._scene;
        if (scene && scene._ufContainerCard) {
            scene._ufContainerCard._standalone = true;
            scene._ufContainerCard.openFor(cont.id, x, y, curArea);
            return true;
        }
        return false;
    };

    Containers.useChest = function(unit, containerOrObj, x, y) {
        if (!unit) return false;
        const W = World();
        if (!W) return false;
        const u = typeof unit === "number" ? W.unit(unit) : unit;
        if (!u) return false;

        const I = Items();
        if (I && typeof I.encumbrance === "function") {
            const enc = I.encumbrance(u.id);
            if (enc && enc.status === "over_capacity") {
                SoundManager.playBuzzer();
                return false;
            }
        }

        const dist = Math.hypot(u.x - x, u.y - y);
        let cont = null;
        if (containerOrObj && containerOrObj.items) {
            cont = containerOrObj;
        } else {
            cont = Containers.at(u.area, x, y, zOf(u));
            if (!cont) {
                cont = Containers.create("chest_wood", { area: u.area, x, y, z: zOf(u) });
            }
        }

        if (dist <= 1.5) {
            const dx = x - u.x, dy = y - u.y;
            const ev = u.event || (W.eventOf && W.eventOf(u.id));
            if (ev && typeof ev.setDirection === "function") {
                if (Math.abs(dx) > Math.abs(dy)) ev.setDirection(dx > 0 ? 6 : 4);
                else ev.setDirection(dy > 0 ? 2 : 8);
            }
            if (window.UF && UF.Combat && typeof UF.Combat.triggerAction === "function") {
                UF.Combat.triggerAction(u, "use_chest", 6000);
            }
            if (window.UF && UF.Objects && typeof UF.Objects.openChest === "function") {
                UF.Objects.openChest(x, y);
            }
            if (window.UF && UF.Sheet) {
                UF.Sheet.open(u.id);
                if (UF.Sheet.window()) UF.Sheet.window().switchTab(1);
            }
            const scene = SceneManager._scene;
            if (scene && scene._ufContainerCard) {
                scene._ufContainerCard.openFor(cont.id, x, y, u.area);
            }
            SoundManager.playOk();
            return true;
        } else {
            const J = window.UF && UF.Jobs;
            const C = window.UF && UF.Colonists;
            if (J) {
                const standTarget = (typeof J.standFor === "function" ? J.standFor({ area: u.area, x, y, z: zOf(u) }, u, true) : null) || { area: u.area, x, y, z: zOf(u) };
                const onArrival = () => {
                    Containers.useChest(u, cont, x, y);
                };
                if (C && typeof C.order === "function") {
                    C.order(u.id, { type: "move", target: standTarget }, onArrival);
                } else {
                    const job = J.create({ type: "move", target: standTarget, owner: u.id });
                    if (job) J.assign(job.id, u.id);
                }
            }
            return true;
        }
    };

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        const w = 380;
        const h = Graphics.boxHeight - 82 - 4;
        this._ufContainerCard = new Window_UFContainerCard(new Rectangle(44, 82, w, h));
        this._windowLayer.addChild(this._ufContainerCard);
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        if (ItemDrag && ItemDrag.hasAttached() && (TouchInput.isTriggered() || TouchInput.isCancelled())) {
            ItemDrag.update(this);
        }
        _Scene_Map_update.call(this);
        if (ItemDrag) {
            ItemDrag.update(this);
        }
    };

    const _Scene_Map_isAnyWindowUnderMouse = Scene_Map.prototype.isAnyWindowUnderMouse;
    Scene_Map.prototype.isAnyWindowUnderMouse = function() {
        if (_Scene_Map_isAnyWindowUnderMouse && _Scene_Map_isAnyWindowUnderMouse.call(this)) return true;
        const cc = this._ufContainerCard;
        if (cc && cc.visible) {
            if (TouchInput.x >= cc.x && TouchInput.x < cc.x + cc.width &&
                TouchInput.y >= cc.y && TouchInput.y < cc.y + cc.height) return true;
        }
        return false;
    };

    if (typeof module !== "undefined") {
        module.exports = Containers;
    }
})();
