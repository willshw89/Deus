//=============================================================================
// UF_Items.js - Items that lie on cells, stack, get carried, eaten, worn and used
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Items] Items from the world catalog: they lie on cells (drawn there, stacked), travel in unit inventories, and are eaten, worn or used as tools.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_World
 * @orderAfter UF_Objects
 *
 * @help
 * Item types come from data/UF_WorldCatalog.json (items.types): id, name,
 * image (a "!$" character sheet in img/characters), tint, tags, stack,
 * food, tool, wear. Code never names an item type.
 *
 * An item is { id, type, count, area: {x, y} | null, x, y, holder: unitId | null }.
 * On the ground: area set, holder null. Carried: holder set, area null.
 * Stacks of one type merge on a cell up to the type's stack size.
 * Inventories are lists of item ids on unit.data.inventory (created when
 * missing). Everything is saved in UF.World.state.items.
 *
 * Drawing: items on cells in view are drawn by pooled sprites inside the
 * map's tilemap (frame = column 1, row 0 of the sheet; anchor from the
 * image's sidecar json, else bottom-center; z = foot pixel row - 1, so a
 * unit standing on the cell is drawn over the item). Only cells in view
 * plus a 3-cell margin get sprites; the set is rebuilt when the view moves
 * a cell, the zoom changes, or an item changes.
 *
 * API, state, events and checks: docs/systems/UF_Items.md
 * Architecture: docs/design/WORLD_ARCHITECTURE.md (sections 2.3, 4, 5.4)
 *
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const VIEW_MARGIN = 3;     // cells past the screen edge whose items still get a sprite (tall sprites reach up into view)
    const CELL_STRIDE = 4096;  // cell key = y * CELL_STRIDE + x (areas are at most 256 wide)

    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const listen = (name, fn) => {
        if (window.UF && UF.Events && UF.Events.on) UF.Events.on(name, fn);
    };
    const catalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const areaKey = a => `${a.x},${a.y}`;
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
    const currentArea = () => (World() ? World().currentArea() : null);
    const cellKey = (x, y) => y * CELL_STRIDE + x;

    const Items = {};
    window.UF = window.UF || {};
    window.UF.Items = Items;

    //-------------------------------------------------------------------------
    // Types (catalog items.types)

    let typeCache = null;
    function typeTable() {
        const cat = catalog();
        const list = cat && cat.items && Array.isArray(cat.items.types) ? cat.items.types : [];
        if (!typeCache || typeCache.source !== list) {
            const byId = {};
            for (const t of list) if (t && t.id) byId[t.id] = t;
            typeCache = { source: list, list, byId };
        }
        return typeCache;
    }
    /** The catalog's item types, in catalog order. */
    Items.types = () => typeTable().list;
    /** One item type by id, or null. */
    Items.type = id => (id ? typeTable().byId[id] || null : null);
    const stackOf = t => Math.max(1, Number(t && t.stack) || 1);
    const nameOf = typeId => {
        const t = Items.type(typeId);
        return t ? t.name : String(typeId);
    };

    //-------------------------------------------------------------------------
    // State: UF.World.state.items = { nextId, byId }, plus a cell index rebuilt from it

    function itemState() {
        const W = World();
        if (!W || !W.state) return null;
        if (!W.state.items) W.state.items = { nextId: 1, byId: {} };
        return W.state.items;
    }

    // Ground items by area and cell. A cache: it's rebuilt whenever the state object changes (new game, load).
    const index = { source: null, areas: new Map() };
    function areaCells(area, create) {
        const k = areaKey(area);
        let cells = index.areas.get(k);
        if (!cells && create) {
            cells = new Map();
            index.areas.set(k, cells);
        }
        return cells || null;
    }
    function indexAdd(item) {
        if (!item.area) return;
        const cells = areaCells(item.area, true);
        const k = cellKey(item.x, item.y);
        const list = cells.get(k);
        if (list) list.push(item.id);
        else cells.set(k, [item.id]);
    }
    function indexRemove(item) {
        if (!item.area) return;
        const cells = areaCells(item.area, false);
        const list = cells && cells.get(cellKey(item.x, item.y));
        if (!list) return;
        const i = list.indexOf(item.id);
        if (i >= 0) list.splice(i, 1);
        if (list.length === 0) cells.delete(cellKey(item.x, item.y));
    }
    /** The item state with the cell index up to date, or null when there is no world. */
    function ready() {
        const st = itemState();
        if (!st) return null;
        if (index.source !== st) {
            index.source = st;
            index.areas = new Map();
            for (const id in st.byId) indexAdd(st.byId[id]);
        }
        return st;
    }

    let changeCounter = 0; // bumped on every change; the sprite layer rebuilds when it sees a new value
    function changed(item, what) {
        changeCounter++;
        emit("items:changed", item, what);
    }

    function itemsOnCell(area, x, y) {
        const st = ready();
        if (!st || !area) return [];
        const cells = areaCells(area, false);
        const list = cells && cells.get(cellKey(x, y));
        return list ? list.map(id => st.byId[id]).filter(Boolean) : [];
    }
    function inventoryArray(unit) {
        if (!unit.data) unit.data = {};
        if (!Array.isArray(unit.data.inventory)) unit.data.inventory = [];
        return unit.data.inventory;
    }
    function placeOnCell(item, area, x, y) {
        item.area = { x: area.x, y: area.y };
        item.x = x | 0;
        item.y = y | 0;
        item.holder = null;
        indexAdd(item);
    }
    // Take an item out of wherever it is (a cell or an inventory) without deleting it.
    function detach(item) {
        if (item.area) {
            indexRemove(item);
            item.area = null;
        }
        if (item.holder !== null && item.holder !== undefined) {
            const u = World().unit(item.holder);
            if (u && u.data && Array.isArray(u.data.inventory)) {
                const i = u.data.inventory.indexOf(item.id);
                if (i >= 0) u.data.inventory.splice(i, 1);
            }
            item.holder = null;
        }
    }

    //-------------------------------------------------------------------------
    // API

    Items.state = () => ready();
    /** An item record by id, or null. */
    Items.get = id => {
        const st = ready();
        return (st && st.byId[id]) || null;
    };
    /** Every item in the world (ground and carried). */
    Items.all = () => {
        const st = ready();
        return st ? Object.values(st.byId) : [];
    };
    /** Every item lying on the ground in an area. */
    Items.inArea = area => {
        const st = ready();
        const cells = st && area ? areaCells(area, false) : null;
        if (!cells) return [];
        const out = [];
        for (const ids of cells.values()) for (const id of ids) if (st.byId[id]) out.push(st.byId[id]);
        return out;
    };

    /**
     * Create one item record, without merging. at = { area, x, y } for the ground or { holder: unitId } for an inventory.
     * Returns the item, or null (unknown type, unknown unit, nowhere to put it).
     */
    Items.create = function(typeId, count, at) {
        const st = ready(), t = Items.type(typeId);
        if (!st || !t || !at) return null;
        const item = { id: st.nextId++, type: t.id, count: Math.max(1, count | 0), area: null, x: 0, y: 0, holder: null };
        if (at.holder !== undefined && at.holder !== null) {
            const u = World().unit(at.holder);
            if (!u) return null;
            item.holder = u.id;
            inventoryArray(u).push(item.id);
        } else if (at.area) {
            placeOnCell(item, at.area, at.x, at.y);
        } else {
            return null;
        }
        st.byId[item.id] = item;
        changed(item, "created");
        return item;
    };

    /** Put `count` of a type on a cell: fills stacks of that type already there, then makes new stacks. Returns the stacks touched. */
    Items.drop = function(area, x, y, typeId, count) {
        const st = ready(), t = Items.type(typeId);
        if (!st || !t || !area) return [];
        let left = Math.max(0, count | 0);
        const max = stackOf(t), touched = [];
        for (const it of itemsOnCell(area, x, y)) {
            if (left <= 0) break;
            if (it.type !== t.id || it.count >= max) continue;
            const add = Math.min(max - it.count, left);
            it.count += add;
            left -= add;
            touched.push(it);
            changed(it, "count");
        }
        while (left > 0) {
            const n = Math.min(max, left);
            const it = Items.create(t.id, n, { area, x, y });
            if (!it) break;
            touched.push(it);
            left -= n;
        }
        return touched;
    };

    /** Items on a cell of an area. */
    Items.atIn = (area, x, y) => itemsOnCell(area, x, y).slice();
    /** Items on a cell of the area on screen. */
    Items.at = (x, y) => Items.atIn(currentArea(), x, y);

    /**
     * Ground items near a cell, nearest first: { near: {x, y}, radius, tags?: [any of], id?: typeId, limit?, area? (default: on screen) }.
     * Returns [{ item, x, y, dist }].
     */
    Items.find = function(opts) {
        const o = opts || {};
        const st = ready(), area = o.area || currentArea();
        const cells = st && area ? areaCells(area, false) : null;
        if (!cells) return [];
        const near = o.near || { x: 0, y: 0 };
        const radius = o.radius === undefined || o.radius === null ? Infinity : o.radius;
        const tags = o.tags ? [].concat(o.tags) : null;
        const out = [];
        for (const ids of cells.values()) {
            for (const id of ids) {
                const it = st.byId[id];
                if (!it || (o.id && it.type !== o.id)) continue;
                if (tags) {
                    const t = Items.type(it.type);
                    if (!t || !Array.isArray(t.tags) || !tags.some(tag => t.tags.includes(tag))) continue;
                }
                const dist = Math.hypot(it.x - near.x, it.y - near.y);
                if (dist > radius) continue;
                out.push({ item: it, x: it.x, y: it.y, dist });
            }
        }
        out.sort((a, b) => a.dist - b.dist || a.item.id - b.item.id);
        return o.limit > 0 ? out.slice(0, o.limit) : out;
    };

    /** Move a ground item into a unit's inventory (no distance check: jobs stand on the cell first). */
    Items.pickUp = function(itemId, unitId) {
        const st = ready();
        const it = st && st.byId[itemId];
        const u = it && World().unit(unitId);
        if (!it || !u || !it.area) return false;
        detach(it);
        it.holder = u.id;
        inventoryArray(u).push(it.id);
        changed(it, "moved");
        return true;
    };

    /**
     * Put a carried item on a cell. It merges into stacks of its type already there; what doesn't fit lies as its own stack.
     * Returns the stack on the ground that holds it (the item itself unless it merged away), or null.
     */
    Items.putDown = function(itemId, area, x, y) {
        const st = ready();
        const it = st && st.byId[itemId];
        if (!it || it.holder === null || it.holder === undefined || !area) return null;
        detach(it);
        const max = stackOf(Items.type(it.type));
        let merged = null;
        for (const other of itemsOnCell(area, x, y)) {
            if (it.count <= 0) break;
            if (other.type !== it.type || other.count >= max) continue;
            const add = Math.min(max - other.count, it.count);
            other.count += add;
            it.count -= add;
            merged = other;
            changed(other, "count");
        }
        if (it.count <= 0) {
            delete st.byId[it.id];
            changed(it, "removed");
            return merged;
        }
        placeOnCell(it, area, x, y);
        changed(it, "moved");
        return it;
    };

    /** Create `count` of a type straight in a unit's inventory (in stacks of the type's size). Returns the items made. */
    Items.give = function(typeId, count, unitId) {
        const st = ready(), t = Items.type(typeId), u = st && World().unit(unitId);
        if (!st || !t || !u) return [];
        let left = Math.max(0, count | 0);
        const max = stackOf(t), made = [];
        while (left > 0) {
            const n = Math.min(max, left);
            const it = Items.create(t.id, n, { holder: u.id });
            if (!it) break;
            made.push(it);
            left -= n;
        }
        return made;
    };

    /** Use up `count` of an item (default 1). The item is removed at 0. Returns how many were consumed. */
    Items.consume = function(itemId, count = 1) {
        const st = ready();
        const it = st && st.byId[itemId];
        if (!it) return 0;
        const n = Math.min(it.count, Math.max(0, count | 0));
        it.count -= n;
        if (it.count <= 0) Items.remove(it.id);
        else changed(it, "count");
        return n;
    };

    /** Use up `count` of a type from a unit's inventory, across its stacks. Returns how many were consumed. */
    Items.consumeFrom = function(unitId, typeId, count) {
        let left = Math.max(0, count | 0), used = 0;
        for (const it of Items.inventoryOf(unitId)) {
            if (left <= 0) break;
            if (it.type !== typeId) continue;
            const n = Items.consume(it.id, left);
            left -= n;
            used += n;
        }
        return used;
    };

    /** Delete an item wherever it is. */
    Items.remove = function(itemId) {
        const st = ready();
        const it = st && st.byId[itemId];
        if (!it) return false;
        detach(it);
        delete st.byId[it.id];
        changed(it, "removed");
        return true;
    };

    /** The item records a unit carries, in pick-up order. */
    Items.inventoryOf = function(unitId) {
        const st = ready();
        const u = st && World().unit(unitId);
        if (!u) return [];
        return inventoryArray(u).map(id => st.byId[id]).filter(Boolean);
    };

    /** Total count of a type (all types when typeId is omitted) in a unit's inventory (unit id) or on a cell ({ x, y, area? }). */
    Items.count = function(where, typeId) {
        let list;
        if (typeof where === "number") list = Items.inventoryOf(where);
        else if (where && typeof where === "object") list = Items.atIn(where.area || currentArea(), where.x, where.y);
        else return 0;
        return list.reduce((n, it) => n + (!typeId || it.type === typeId ? it.count : 0), 0);
    };

    /** Whether a unit carries at least { typeId: count, ... }. */
    Items.has = function(unitId, needs) {
        if (!needs) return true;
        return Object.keys(needs).every(typeId => Items.count(unitId, typeId) >= (needs[typeId] | 0));
    };

    /** What lies on a cell of the area on screen, for labels: { text: "5 × Log, Stone", items: [{ id, type, name, count }] } or null. */
    Items.describe = function(x, y) {
        const list = Items.at(x, y);
        if (!list.length) return null;
        const items = list.map(it => ({ id: it.id, type: it.type, name: nameOf(it.type), count: it.count }));
        return { text: items.map(i => (i.count > 1 ? `${i.count} × ${i.name}` : i.name)).join(", "), items };
    };

    // A unit that leaves the world drops what it carried where it stood.
    listen("world:unitRemoved", u => {
        if (!u || !u.data || !Array.isArray(u.data.inventory) || !u.data.inventory.length || !u.area) return;
        for (const id of u.data.inventory.slice()) Items.putDown(id, u.area, u.x, u.y);
    });

    //-------------------------------------------------------------------------
    // Sidecars (img/characters/<name>.json: frameWidth/Height, anchor). Loaded here, not through UF_Objects,
    // so items draw the same whether or not UF_Objects is installed.

    const sidecars = new Map(); // name -> undefined (loading) | null (none) | object
    let assetVersion = 0;       // bumped when a sidecar finishes loading, so sprites re-read their frame
    function sidecarOf(name) {
        if (sidecars.has(name)) return sidecars.get(name);
        sidecars.set(name, undefined);
        try {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", "img/characters/" + Utils.encodeURI(name) + ".json");
            xhr.overrideMimeType("application/json");
            xhr.onload = () => {
                let data = null;
                if (xhr.status < 400) {
                    try { data = JSON.parse(xhr.responseText); } catch (e) { data = null; }
                }
                sidecars.set(name, data);
                assetVersion++;
            };
            xhr.onerror = () => {
                sidecars.set(name, null);
                assetVersion++;
            };
            xhr.send();
        } catch (e) {
            sidecars.set(name, null);
        }
        return undefined;
    }
    Items.sidecar = sidecarOf;

    //-------------------------------------------------------------------------
    // Drawing: a layer in the tilemap that owns pooled sprites. The pooled sprites are the tilemap's own
    // children (siblings of the character sprites), because the tilemap sorts only its direct children by z.

    class Sprite_UFItemLayer extends Sprite {
        constructor() {
            super();
            this.z = 0; // draws nothing itself
            this._pool = [];
            this._active = new Map(); // item id -> sprite
            this._seenChange = -1;
            this._cell = { x: NaN, y: NaN };
            this._zoom = 0;
            this._mapId = 0;
        }

        /** The sprite drawing an item in view, or null. */
        spriteFor(itemId) {
            return this._active.get(itemId) || null;
        }
        activeCount() {
            return this._active.size;
        }

        update() {
            super.update();
            if (!this.parent || !window.$gameMap || !window.$dataMap) return;
            const area = currentArea();
            if (!area) {
                this.hideAll();
                return;
            }
            const cx = Math.floor($gameMap.displayX()), cy = Math.floor($gameMap.displayY());
            const zoom = window.UF.Camera ? UF.Camera.zoom() : 1;
            if (this._seenChange !== changeCounter || cx !== this._cell.x || cy !== this._cell.y || zoom !== this._zoom || this._mapId !== $gameMap.mapId()) {
                this._seenChange = changeCounter;
                this._cell = { x: cx, y: cy };
                this._zoom = zoom;
                this._mapId = $gameMap.mapId();
                this.rebuild(area);
            }
            this.place();
        }

        // Which items get a sprite: those on cells in view plus the margin.
        rebuild(area) {
            const st = ready();
            const cells = st ? areaCells(area, false) : null;
            const x0 = Math.floor($gameMap.displayX()) - VIEW_MARGIN, y0 = Math.floor($gameMap.displayY()) - VIEW_MARGIN;
            const x1 = x0 + Math.ceil($gameMap.screenTileX()) + 2 * VIEW_MARGIN, y1 = y0 + Math.ceil($gameMap.screenTileY()) + 2 * VIEW_MARGIN;
            const wanted = new Set();
            if (cells) {
                for (const [k, ids] of cells) {
                    const x = k % CELL_STRIDE, y = (k - x) / CELL_STRIDE;
                    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
                    for (const id of ids) wanted.add(id);
                }
            }
            for (const [id, sp] of this._active) {
                if (!wanted.has(id)) {
                    this.release(sp);
                    this._active.delete(id);
                }
            }
            for (const id of wanted) {
                if (this._active.has(id)) continue;
                const sp = this.acquire();
                this.assign(sp, st.byId[id]);
                this._active.set(id, sp);
            }
        }

        acquire() {
            let sp = this._pool.pop();
            if (!sp) {
                sp = new Sprite();
                sp.z = 0;
                this.parent.addChild(sp);
            }
            return sp;
        }
        release(sp) {
            sp.visible = false;
            sp.bitmap = null;
            sp._ufItem = null;
            sp._ufType = null;
            sp.z = 0;
            this._pool.push(sp);
        }
        assign(sp, item) {
            const t = Items.type(item.type);
            sp._ufItem = item;
            sp._ufType = t;
            sp._ufFrameVersion = -1;
            sp.visible = false; // shown once the frame is set, so the whole sheet never flashes
            sp.bitmap = t && t.image ? ImageManager.loadCharacter(t.image) : null;
            sp.tint = t && t.tint ? parseInt(String(t.tint).replace("#", ""), 16) : 0xffffff;
            sp.anchor.set(0.5, 1);
        }
        // Frame: column 1, row 0 of the 3x4 sheet (contract section 4); size and anchor from the sidecar when it has them.
        applyFrame(sp) {
            const b = sp.bitmap;
            if (!b || !b.isReady()) return;
            const t = sp._ufType;
            const sc = t && t.image ? sidecarOf(t.image) : null;
            const fw = (sc && sc.frameWidth > 0 ? sc.frameWidth : 0) || Math.floor(b.width / 3);
            const fh = (sc && sc.frameHeight > 0 ? sc.frameHeight : 0) || Math.floor(b.height / 4);
            sp.setFrame(fw, 0, fw, fh);
            if (sc && Array.isArray(sc.anchor) && fw > 0 && fh > 0) sp.anchor.set(sc.anchor[0] / fw, sc.anchor[1] / fh);
            else sp.anchor.set(0.5, 1);
            sp.visible = true;
            sp._ufFrameVersion = sc === undefined ? -1 : assetVersion; // undefined = sidecar still loading: look again next frame
        }
        place() {
            const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
            for (const sp of this._active.values()) {
                if (sp._ufFrameVersion !== assetVersion) this.applyFrame(sp);
                const it = sp._ufItem;
                const footY = Math.round($gameMap.adjustY(it.y) * th + th);
                sp.x = Math.round($gameMap.adjustX(it.x) * tw + tw / 2);
                sp.y = footY;
                sp.z = footY - 1;
            }
        }
        hideAll() {
            for (const sp of this._active.values()) this.release(sp);
            this._active.clear();
        }
    }
    Items.Sprite_UFItemLayer = Sprite_UFItemLayer;
    /** The item layer of the map on screen, or null. */
    Items.layer = () => {
        const s = SceneManager._scene;
        return (s && s._spriteset && s._spriteset._ufItems) || null;
    };

    const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _Spriteset_Map_createCharacters.call(this);
        this._ufItems = new Sprite_UFItemLayer();
        this._tilemap.addChild(this._ufItems);
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "items"), registered at boot after all plugins load

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        const opaquePixels = sp => {
            const b = sp.bitmap, f = sp._frame;
            if (!b || !b.isReady() || !f || f.width === 0) return 0;
            let n = 0;
            for (let y = f.y; y < f.y + f.height; y += 2) {
                for (let x = f.x; x < f.x + f.width; x += 2) if (b.getAlphaPixel(x, y) > 0) n++;
            }
            return n;
        };
        const spriteOfEvent = ev => SceneManager._scene._spriteset._characterSprites.find(s => s._character === ev) || null;

        UF.Test.suite("items", async t => {
            const W = UF.World, st = W.state, area = W.currentArea();
            const list = Items.types();

            // Every type is well-formed.
            const problems = [], seen = new Set();
            for (const ty of list) {
                const where = ty && ty.id ? ty.id : JSON.stringify(ty);
                if (!ty || !ty.id || !ty.name) problems.push(`${where}: missing id or name`);
                else if (seen.has(ty.id)) problems.push(`${ty.id}: duplicate id`);
                if (ty && ty.id) seen.add(ty.id);
                if (!ty || typeof ty.image !== "string" || !/^!\$/.test(ty.image)) problems.push(`${where}: image must be a "!$" sheet`);
                if (!ty || !(Number(ty.stack) >= 1)) problems.push(`${where}: stack must be >= 1`);
                if (ty && !Array.isArray(ty.tags)) problems.push(`${where}: tags must be an array`);
                if (ty && ty.tint && !/^#[0-9a-f]{6}$/i.test(ty.tint)) problems.push(`${where}: tint must be #rrggbb`);
                if (ty && ty.food && !(Number(ty.food.hunger) > 0 || Number(ty.food.thirst) > 0)) problems.push(`${where}: food needs hunger or thirst > 0`);
                if (ty && ty.tool && (typeof ty.tool !== "object" || !Object.values(ty.tool).every(v => Number(v) > 0))) problems.push(`${where}: tool multipliers must be > 0`);
                if (ty && ty.wear && !(Number(ty.wear.tier) >= 1)) problems.push(`${where}: wear.tier must be >= 1`);
            }
            t.check("catalog_types", list.length >= 10 && problems.length === 0,
                problems.length ? `${problems.length} problem(s): ${problems.slice(0, 3).join("; ")}` : `${list.length} item types: ids unique, every one has a "!$" image, stack >= 1, tags; food/tool/wear well-formed`);

            // Everything else in the catalog that names an item type names one that exists.
            const cat = catalog() || {};
            const unknown = [];
            for (const o of cat.objects || []) {
                for (const a in o.actions || {}) for (const id in (o.actions[a] || {}).yields || {}) if (!Items.type(id)) unknown.push(`object ${o.id} ${a} -> ${id}`);
                for (const id in (o.build && o.build.items) || {}) if (!Items.type(id)) unknown.push(`object ${o.id} build -> ${id}`);
            }
            for (const r of (cat.recipes && cat.recipes.list) || []) {
                for (const id in r.inputs || {}) if (!Items.type(id)) unknown.push(`recipe ${r.id} input ${id}`);
                for (const id in r.outputs || {}) if (!Items.type(id)) unknown.push(`recipe ${r.id} output ${id}`);
            }
            for (const s of (cat.wildlife && cat.wildlife.species) || []) for (const id in s.yields || {}) if (!Items.type(id)) unknown.push(`species ${s.id} -> ${id}`);
            t.check("referenced_types_exist", unknown.length === 0, unknown.length ? `unknown item ids: ${unknown.slice(0, 5).join(", ")}` : "every yield, build cost, recipe input/output and hunt yield names an existing item type");

            // Every image file exists.
            const fs = require("fs"), path = require("path");
            const gameDir = nw.__dirname || process.cwd();
            const missing = list.filter(ty => ty.image && !fs.existsSync(path.join(gameDir, "img", "characters", `${ty.image}.png`))).map(ty => `${ty.id} -> ${ty.image}.png`);
            t.check("images_exist", missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : `${list.length} images found in img/characters`);
            if (!st || !area) {
                t.check("world_present", false, "no world area on screen; the remaining checks need one");
                return;
            }

            // Look at the start, close up.
            const mid = Math.floor(st.size / 2);
            const before = new Set(Object.keys(Items.state().byId));
            $gamePlayer.locate(mid, mid);
            if (UF.Camera) UF.Camera.setLevel(0);
            await t.waitFrames(3);
            const layer = Items.layer();

            // Stacks merge up to the type's stack size.
            const cx = mid + 3, cy = mid + 3;
            const first = Items.drop(area, cx, cy, "log", 3);
            const firstCount = first.length === 1 ? first[0].count : NaN; // read now: the second drop merges into this stack
            const second = Items.drop(area, cx, cy, "log", 3);
            const onCell = Items.at(cx, cy);
            const counts = onCell.map(it => it.count).sort((a, b) => b - a);
            t.check("drop_merges", first.length === 1 && firstCount === 3 && counts.join("+") === "5+1" && onCell.every(it => it.type === "log") && second.length === 2 && second[0] === first[0],
                `first drop: ${first.length} stack of ${firstCount}; after 3 + 3 logs on (${cx},${cy}): stacks ${counts.join(" + ")} (stack size ${stackOf(Items.type("log"))}); the second drop touched ${second.length} stack(s), the first of them the existing stack: ${second[0] === first[0]}`);

            // A dropped item is drawn at its cell with pixels, as a tilemap child; removing it removes the sprite.
            const stone = Items.drop(area, mid + 5, cy, "stone", 2)[0];
            await t.waitFrames(2);
            let sp = layer && stone ? layer.spriteFor(stone.id) : null;
            await t.waitUntil(() => sp && sp.bitmap && sp.bitmap.isReady() && sp.visible, 8000, "the stone's sprite to have its image").catch(() => {});
            await t.waitFrames(1);
            const zoom = UF.Camera ? UF.Camera.zoom() : 1;
            const g = sp ? sp.getGlobalPosition() : { x: NaN, y: NaN };
            const ex = ($gameMap.adjustX(mid + 5) + 0.5) * 48 * zoom, ey = ($gameMap.adjustY(cy) + 1) * 48 * zoom;
            const px = sp ? opaquePixels(sp) : 0;
            const tilemap = SceneManager._scene._spriteset._tilemap;
            const drawn = !!sp && sp.visible && sp.parent === tilemap && Math.abs(g.x - ex) <= 1 && Math.abs(g.y - ey) <= 1 && px > 0;
            const frameText = sp && sp._frame ? `frame ${sp._frame.x},${sp._frame.y} ${sp._frame.width}x${sp._frame.height}` : "no frame";
            Items.remove(stone.id);
            await t.waitFrames(2);
            const gone = !!sp && !layer.spriteFor(stone.id) && !sp.visible;
            t.check("drawn_in_view", drawn && gone,
                sp ? `stone at (${mid + 5},${cy}): sprite at screen (${Math.round(g.x)},${Math.round(g.y)}), expected (${Math.round(ex)},${Math.round(ey)}); ${px} opaque samples; ${frameText}; in the tilemap ${sp.parent === tilemap}; after remove: sprite ${gone ? "hidden and released" : "still shown"}`
                    : "no sprite for the dropped stone");

            // Items draw under a unit standing on the same cell (z = foot row - 1).
            const u = W.addUnit({ name: "TEST_carrier", image: { characterName: "$U7_Townsman" }, area, x: mid + 4, y: mid + 5, dir: 2,
                data: { kind: "test", faction: "player", inventory: [], equipment: {} } });
            const hide = Items.drop(area, u.x, u.y, "hide", 1)[0];
            await t.waitFrames(3);
            const ev = W.eventOf(u.id), usp = ev ? spriteOfEvent(ev) : null;
            const isp = layer.spriteFor(hide.id);
            const footY = Math.round($gameMap.adjustY(u.y) * 48 + 48);
            t.check("z_below_units", !!usp && !!isp && isp.z === footY - 1 && usp.z === footY && isp.z < usp.z,
                `on cell (${u.x},${u.y}): item z ${isp ? isp.z : "no sprite"}, unit z ${usp ? usp.z : "no sprite"}, foot row ${footY}`);

            // Inventory round-trip: the item leaves the map and comes back.
            const picked = Items.pickUp(hide.id, u.id);
            await t.waitFrames(2);
            const held = Items.get(hide.id);
            const inInventory = Items.inventoryOf(u.id).some(it => it.id === hide.id);
            const offMap = !!held && held.area === null && held.holder === u.id && Items.at(u.x, u.y).length === 0 && !layer.spriteFor(hide.id);
            const heldText = held ? `holder ${held.holder}, area ${JSON.stringify(held.area)}, sprite ${layer.spriteFor(hide.id) ? "present" : "none"}` : "item missing"; // read now, before putDown changes it
            const back = Items.putDown(hide.id, area, u.x + 1, u.y);
            await t.waitFrames(2);
            const onMap = !!back && back.id === hide.id && sameArea(back.area, area) && back.x === u.x + 1 && back.y === u.y && back.holder === null
                && !u.data.inventory.includes(hide.id) && !!layer.spriteFor(hide.id);
            t.check("pick_up_put_down", picked && inInventory && offMap && onMap,
                `pickUp ${picked}; in inventory ${inInventory}; off the map while held ${offMap} (${heldText}); back on (${u.x + 1},${u.y}) with a sprite ${onMap}`);

            // give / count / has.
            const given = Items.give("fiber", 12, u.id);
            const has12 = Items.has(u.id, { fiber: 12 }), has13 = Items.has(u.id, { fiber: 13 }), hasStone = Items.has(u.id, { stone: 1 });
            t.check("give_and_has", given.length === 2 && Items.count(u.id, "fiber") === 12 && has12 && !has13 && !hasStone,
                `gave 12 fiber (stack ${stackOf(Items.type("fiber"))}): ${given.length} stack(s) of ${given.map(i => i.count).join("/")}; count ${Items.count(u.id, "fiber")}; has 12: ${has12}, has 13: ${has13}, has a stone: ${hasStone}`);

            // consume removes at zero and updates the inventory.
            const f = given[0];
            const n1 = Items.consume(f.id, 4), n2 = Items.consume(f.id, 10);
            t.check("consume_removes", n1 === 4 && n2 === 6 && !Items.get(f.id) && Items.count(u.id, "fiber") === 2 && !u.data.inventory.includes(f.id),
                `consumed ${n1} then ${n2} of a stack of 10; the stack ${Items.get(f.id) ? "still exists" : "is gone"}; ${Items.count(u.id, "fiber")} fiber left in the inventory; inventory ids ${JSON.stringify(u.data.inventory)}`);

            // find: nearest first, filtered by tag.
            const far = Items.drop(area, mid + 8, mid + 6, "berries", 1)[0];
            const near = Items.drop(area, mid + 2, mid + 6, "berries", 2)[0];
            const found = Items.find({ near: { x: mid, y: mid + 6 }, radius: 12, tags: ["food"] });
            const byId = Items.find({ near: { x: mid, y: mid + 6 }, radius: 12, id: "log" });
            t.check("find_sorted", found.length === 2 && found[0].item.id === near.id && found[1].item.id === far.id && found[0].dist < found[1].dist && byId.length === 2 && byId.every(r => r.item.type === "log"),
                `food within 12 of (${mid},${mid + 6}): ${found.map(r => `${r.item.type} x${r.item.count} at ${r.dist.toFixed(1)}`).join(", ")}; id log: ${byId.length} stack(s)`);

            const d = Items.describe(cx, cy);
            t.check("describe_text", !!d && d.text === "5 × Log, Log" && d.items.length === 2 && Items.describe(mid - 9, mid - 9) === null,
                d ? `"${d.text}" for (${cx},${cy}); empty cell -> ${JSON.stringify(Items.describe(mid - 9, mid - 9))}` : "describe returned null for a cell with logs");

            // A row of different items for the screenshot.
            const row = ["straw", "berries", "meat_raw", "stone_knife", "fiber_wrap", "gold"];
            row.forEach((id, i) => Items.drop(area, mid - 4 + i, mid + 3, id, 1));
            await t.waitUntil(() => [...layer._active.values()].every(s => s.bitmap && s.bitmap.isReady() && s.visible), 8000, "every item sprite to have its image").catch(() => {});
            await t.waitFrames(5);
            t.screenshot("items_in_view");

            // What a removed unit carried lies where it stood.
            const bone = Items.give("bone", 3, u.id)[0];
            const ux = u.x, uy = u.y;
            W.removeUnit(u.id);
            await t.waitFrames(2);
            const dropped = Items.get(bone.id);
            t.check("unit_removal_drops_items", !!dropped && dropped.holder === null && sameArea(dropped.area, area) && dropped.x === ux && dropped.y === uy && Items.count({ x: ux, y: uy }, "bone") === 3,
                dropped ? `bones now at (${dropped.x},${dropped.y}) holder ${dropped.holder}; unit stood at (${ux},${uy}); ${Items.count({ x: ux, y: uy })} items on that cell` : "the carried bones vanished");

            // Save round-trip.
            const json = JsonEx.stringify(W.state);
            const copy = JsonEx.parse(json);
            const a = copy.items && copy.items.byId[near.id];
            const contents = DataManager.makeSaveContents();
            t.check("saved", !!a && a.type === "berries" && a.count === 2 && a.x === mid + 2 && a.holder === null && JSON.stringify(copy.items) === JSON.stringify(W.state.items) && !!contents.ufWorld && contents.ufWorld.items === W.state.items,
                `${Object.keys(W.state.items.byId).length} items in state (${json.length} bytes of world state); berries stack after JsonEx round-trip: ${a ? `${a.count} at (${a.x},${a.y})` : "missing"}; save contents ufWorld.items ${contents.ufWorld && contents.ufWorld.items ? "present" : "missing"}`);

            // Per-frame cost with a field of items in view at the farthest zoom.
            if (UF.Camera) UF.Camera.setLevel(UF.Camera.levels.length - 1);
            await t.waitFrames(2);
            const kinds = ["log", "stone", "berries", "fiber", "straw", "bone"];
            let made = 0;
            for (let dy = 0; dy < 20; dy++) for (let dx = 0; dx < 20; dx++) made += Items.drop(area, mid + 2 + dx, mid - 22 + dy, kinds[(dx + dy) % kinds.length], 1).length;
            await t.waitFrames(5);
            let total = 0, frames = 0;
            const origUpdate = layer.update;
            layer.update = function() {
                const t0 = performance.now();
                origUpdate.call(this);
                total += performance.now() - t0;
                frames++;
            };
            await t.waitFrames(120);
            layer.update = origUpdate;
            const avg = frames ? total / frames : NaN;
            t.check("perf", frames >= 100 && avg <= 1.0,
                `layer update avg ${avg.toFixed(3)} ms over ${frames} frames, ${layer.activeCount()} item sprites in view (${made} stacks dropped) at zoom ${(UF.Camera ? UF.Camera.zoom() : 1).toFixed(3)}; the tilemap's own child sort isn't included`);
            t.screenshot("items_zoomed_out");

            // Clean up: the test items go, the zoom comes back.
            for (const id of Object.keys(Items.state().byId)) if (!before.has(id)) Items.remove(Number(id));
            if (UF.Camera) UF.Camera.setLevel(1);
            await t.waitFrames(5);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during items checks");
        });
    }
})();
