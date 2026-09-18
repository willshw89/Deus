//=============================================================================
// UF_Objects.js - Map objects: one catalog type per cell, drawn, blocking, harvestable, regrowing
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Objects] Map objects from the world catalog (trees, plants, stones, buildings): one type per cell, drawn inside the tilemap, blocking movement, yielding items, regrowing.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_World
 * @orderAfter UF_Tiles
 *
 * @help
 * Every area cell holds at most one object: a type number into
 * data/UF_WorldCatalog.json "objects" (index + 1; 0 = nothing), kept in
 * $dataMap.ufObjects by UF_World and saved as per-area diffs. This plugin:
 *
 * - draws the objects in view as pooled sprites inside the map's tilemap,
 *   sorted with the characters by foot row (z = foot pixel row; "under"
 *   objects such as grass and loose stones 100 lower, so units stand on
 *   them), rebuilt only when the view moves a cell, the zoom changes, the
 *   map changes or an object changes;
 * - takes the image from a "$" character sheet (one frame: the sidecar's
 *   animations.stand[0], else column 1 row 0), a 48x48 tile of a B/C
 *   tileset sheet, or a bitmap drawn in code (UF.Objects.generated), with
 *   an optional tint so kinds can share an image;
 * - blocks movement on cells whose object isn't passable (alias of
 *   Game_Map.isPassable);
 * - applies actions (chop, gather, pick, quarry, mine): drops the yielded
 *   items through UF.Items when it exists, replaces the object with
 *   "becomes", and schedules regrowth (UF.World.state.regrow, checked on
 *   every game hour);
 * - loads sprite sidecars (img/characters/<name>.json) once: UF.Sidecars.
 *
 * API, events, save data and checks: docs/systems/UF_Objects.md
 * Architecture: docs/design/WORLD_ARCHITECTURE.md sections 2.2, 4, 5.3
 *
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const TILE = 48;
    const MARGIN = 3;         // cells beyond the view that still get sprites (wide canopies, smooth scrolling)
    const TALLEST_CELLS = 6;  // extra rows above the view: a tall tree's canopy hangs this far above its cell
    const UNDER_BONUS = -100; // z offset of "under" objects (WORLD_ARCHITECTURE section 4)
    const MIN_Z = 7;          // never below the ground layers (0, 4) or the stance (5) / designation (6) markers

    const catalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
    const tintOf = hex => parseInt(String(hex).replace("#", ""), 16);

    //-------------------------------------------------------------------------
    // Types: the catalog list with typeId = index + 1 (copies; the catalog itself stays untouched)

    let typeCache = null;
    function table() {
        const src = (catalog() && catalog().objects) || [];
        if (typeCache && typeCache.source === src) return typeCache;
        const list = src.map((o, i) => Object.assign({}, o, { typeId: i + 1, tintValue: o.tint ? tintOf(o.tint) : 0xffffff }));
        const byId = new Map();
        const blocks = new Uint8Array(list.length + 1); // 1 = units can't enter a cell holding this type
        for (const o of list) {
            if (o.id !== undefined && !byId.has(o.id)) byId.set(o.id, o);
            blocks[o.typeId] = o.passable === true ? 0 : 1;
        }
        typeCache = { source: src, list, byId, blocks };
        return typeCache;
    }
    const typeOf = idOrTypeId => {
        const tb = table();
        if (typeof idOrTypeId === "number") return tb.list[idOrTypeId - 1] || null;
        if (typeof idOrTypeId === "string") return tb.byId.get(idOrTypeId) || null;
        return null;
    };
    const typeIdOf = id => {
        const t = typeOf(id);
        return t ? t.typeId : 0;
    };
    // 0 for "nothing", a type number for a known type, null for an unknown id.
    const resolve = v => {
        if (v === null || v === undefined || v === 0 || v === "") return 0;
        const t = typeOf(v);
        return t ? t.typeId : null;
    };

    //-------------------------------------------------------------------------
    // Reading the grid of an area (the map on screen, or a cached off-screen build)

    function gridOf(area) {
        const W = World();
        if (!W || !W.state || !area || !W.inWorld(area.x, area.y)) return null;
        if (sameArea(area, W.currentArea()) && window.$dataMap && $dataMap.ufObjects) return $dataMap.ufObjects;
        return W.peekArea(area.x, area.y).ufObjects || null;
    }
    const inArea = (x, y) => {
        const W = World();
        const size = W && W.state ? W.state.size : 0;
        return x >= 0 && y >= 0 && x < size && y < size;
    };
    function typeIdIn(area, x, y) {
        const W = World();
        if (!W || !W.state || !area || !inArea(x, y)) return 0;
        return W.getObject(area.x, area.y, x, y) | 0;
    }
    // Passability of the map on screen, read straight from $dataMap (hot path: pathfinding calls it a lot).
    function blocksAt(x, y) {
        const map = window.$dataMap;
        if (!map || !map.ufObjects || x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
        const t = map.ufObjects[y * map.width + x];
        return t !== 0 && table().blocks[t] === 1;
    }

    //-------------------------------------------------------------------------
    // Regrowth: UF.World.state.regrow = [{ area: {x, y}, x, y, from: typeId, to: typeId, due: hour }]

    // A monotonic game-hour count from the clock (28-day months, 12 months), so "in 48 hours" survives saves.
    function absHour() {
        const t = window.$ufTime;
        if (!t) return (World() && World().state && World().state.regrowHours) || 0;
        return (((t.year * 12 + t.monthIndex) * 28) + (t.day - 1)) * 24 + t.hour;
    }
    function regrowList() {
        const W = World();
        if (!W || !W.state) return null;
        return (W.state.regrow = W.state.regrow || []);
    }
    // One pending entry per cell: drop the old one, add one if the new type regrows into something known.
    function scheduleRegrow(area, x, y, toType) {
        const list = regrowList();
        if (!list) return;
        for (let i = list.length - 1; i >= 0; i--) {
            const e = list[i];
            if (e.x === x && e.y === y && sameArea(e.area, area)) list.splice(i, 1);
        }
        const r = toType && toType.regrow;
        if (!r || !(r.hours > 0) || !typeIdOf(r.to)) return;
        list.push({ area: { x: area.x, y: area.y }, x, y, from: toType.typeId, to: typeIdOf(r.to), due: absHour() + (r.hours | 0) });
    }
    function processRegrow() {
        const W = World();
        if (W && W.state && !window.$ufTime) W.state.regrowHours = (W.state.regrowHours || 0) + 1;
        const list = regrowList();
        if (!list || !list.length) return 0;
        const now = absHour();
        const due = [];
        for (let i = list.length - 1; i >= 0; i--) if (list[i].due <= now) due.push(list.splice(i, 1)[0]);
        let grown = 0;
        for (const e of due) {
            // Only if the picked plant is still there: a built wall or a felled tree on that cell cancels the regrowth.
            if (typeIdIn(e.area, e.x, e.y) !== e.from) continue;
            if (setIn(e.area, e.x, e.y, e.to)) grown++;
        }
        return grown;
    }

    //-------------------------------------------------------------------------
    // Changing objects

    function setIn(area, x, y, idOrTypeId) {
        const W = World();
        if (!W || !W.state || !area || !W.inWorld(area.x, area.y) || !inArea(x, y)) return false;
        const to = resolve(idOrTypeId);
        if (to === null) return false;
        const from = W.getObject(area.x, area.y, x, y) | 0;
        if (from === to) return true;
        if (!W.setObject(area.x, area.y, x, y, to)) return false; // records the diff, patches the map on screen, emits world:objectChanged
        const fromType = from ? typeOf(from) : null;
        const toType = to ? typeOf(to) : null;
        scheduleRegrow(area, x, y, toType);
        emit("objects:changed", { x: area.x, y: area.y }, x, y, fromType ? fromType.id : null, toType ? toType.id : null);
        return true;
    }

    /**
     * Run an action (chop, gather, pick, quarry, mine) on the object of a cell. Returns null when the cell has
     * no object or the object has no such action; otherwise { ok, action, area, x, y, from, to, yields, items, actor }.
     * Items are dropped through UF.Items.drop when UF_Items is installed; `yields` always says what was produced.
     */
    function applyIn(area, x, y, action, actor) {
        const from = typeOf(typeIdIn(area, x, y));
        if (!from || !from.actions || !from.actions[action]) return null;
        const a = from.actions[action];
        const yields = Object.assign({}, a.yields || {});
        const items = [];
        if (window.UF && UF.Items && typeof UF.Items.drop === "function") {
            for (const itemId of Object.keys(yields)) {
                const dropped = UF.Items.drop({ x: area.x, y: area.y }, x, y, itemId, yields[itemId]);
                if (dropped) items.push(dropped);
            }
        }
        const toId = a.becomes === undefined ? null : a.becomes; // no "becomes" = the object is used up
        setIn(area, x, y, toId);
        return {
            ok: true, action, area: { x: area.x, y: area.y }, x, y,
            from: from.id, to: toId, yields, items,
            actor: actor && actor.id !== undefined ? actor.id : (actor === undefined ? null : actor)
        };
    }

    function findIn(area, opts) {
        const W = World();
        const grid = gridOf(area);
        if (!W || !grid) return [];
        const o = opts || {};
        const near = o.near || { x: 0, y: 0 };
        const r = o.radius !== undefined ? o.radius : 20;
        const size = W.state.size;
        const want = o.id ? typeIdOf(o.id) : 0;
        if (o.id && !want) return [];
        const tags = o.tags && o.tags.length ? o.tags : null;
        const list = table().list;
        const out = [];
        const x0 = Math.max(0, Math.floor(near.x - r)), x1 = Math.min(size - 1, Math.ceil(near.x + r));
        const y0 = Math.max(0, Math.floor(near.y - r)), y1 = Math.min(size - 1, Math.ceil(near.y + r));
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const t = grid[y * size + x];
                if (!t || (want && t !== want)) continue;
                const type = list[t - 1];
                if (!type) continue;
                if (tags && !(type.tags && tags.every(tag => type.tags.includes(tag)))) continue;
                if (o.action && !(type.actions && type.actions[o.action])) continue;
                const dist = Math.hypot(x - near.x, y - near.y);
                if (dist > r) continue;
                out.push({ x, y, type, dist });
            }
        }
        out.sort((a, b) => (a.dist - b.dist) || (a.y - b.y) || (a.x - b.x));
        if (o.limit > 0 && out.length > o.limit) out.length = o.limit;
        return out;
    }

    function describeIn(area, x, y) {
        const t = typeOf(typeIdIn(area, x, y));
        if (!t) return null;
        return {
            id: t.id, name: t.name, tags: (t.tags || []).slice(), actions: Object.keys(t.actions || {}),
            passable: t.passable === true, under: t.under === true
        };
    }

    //-------------------------------------------------------------------------
    // Sidecars: img/characters/<name>.json, loaded once by XHR (the same way RMMZ loads data files)

    const sidecars = new Map(); // name -> { loaded, data }
    function loadSidecar(name) {
        let e = sidecars.get(name);
        if (e) return e;
        e = { loaded: false, data: null };
        sidecars.set(name, e);
        const done = data => {
            e.loaded = true;
            e.data = data && typeof data === "object" ? data : null;
            Objects.refresh(); // sprites of this image re-frame with the sidecar's anchor
        };
        try {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", `img/characters/${Utils.encodeURI(name)}.json`);
            xhr.overrideMimeType("application/json");
            xhr.onload = () => {
                let data = null;
                if (xhr.status < 400) {
                    try { data = JSON.parse(xhr.responseText); } catch (_) { data = null; }
                }
                done(data);
            };
            xhr.onerror = () => done(null);
            xhr.send();
        } catch (_) {
            done(null);
        }
        return e;
    }
    const Sidecars = {
        /** The sidecar object of an image, or null until it has loaded (and null for images that have none). */
        get(name) {
            if (!name) return null;
            const e = loadSidecar(name);
            return e.loaded ? e.data : null;
        },
        /** Start loading (no-op when already requested); resolves with the sidecar or null. */
        load(name) {
            const e = loadSidecar(name);
            if (e.loaded) return Promise.resolve(e.data);
            return new Promise(resolve => {
                const poll = () => (e.loaded ? resolve(e.data) : setTimeout(poll, 20));
                poll();
            });
        },
        isLoaded: name => !!sidecars.get(name) && sidecars.get(name).loaded,
        has: name => !!sidecars.get(name) && sidecars.get(name).loaded && !!sidecars.get(name).data
    };

    //-------------------------------------------------------------------------
    // Code-drawn bitmaps (UF_Gen* placeholders). generated[name]() returns a cached Bitmap.

    const generatedCache = {};
    const generated = {
        // UF_GenStockpile: a flat dashed square marking a stockpile cell.
        stockpile() {
            if (generatedCache.stockpile) return generatedCache.stockpile;
            const bmp = new Bitmap(TILE, TILE);
            const ctx = bmp.context;
            ctx.fillStyle = "rgba(20, 16, 8, 0.18)";
            ctx.fillRect(3, 3, TILE - 6, TILE - 6);
            ctx.strokeStyle = "rgba(245, 232, 180, 0.95)";
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(4.5, 4.5, TILE - 9, TILE - 9);
            bmp._baseTexture.update();
            generatedCache.stockpile = bmp;
            return bmp;
        }
    };

    //-------------------------------------------------------------------------
    // Which part of which bitmap a type is drawn with

    function bitmapFor(type) {
        if (type.image) return ImageManager.loadCharacter(type.image);
        if (type.tile && type.tile.sheet) return ImageManager.loadTileset(type.tile.sheet);
        if (type.gen && typeof generated[type.gen] === "function") return generated[type.gen]();
        return null;
    }

    // { sx, sy, w, h, ax, ay } (ax/ay = anchor fractions), or null while the bitmap is still loading.
    function frameFor(type, bmp) {
        if (!bmp || !bmp.isReady() || bmp.width === 0) return null;
        if (type.tile) {
            // Same rectangle as Tilemap._addNormalTile: id 0-255 = B sheet, 256-511 = C sheet, 16 columns of 48 px.
            // tile.w / tile.h (cells, default 1) take a block of adjacent tiles (id = top-left; the stock 2x2 trees):
            // the block must stay inside one 8-column half of the sheet, which is how the editor lays them out.
            const local = (type.tile.id | 0) % 256;
            const w = Math.max(1, type.tile.w | 0 || 1), h = Math.max(1, type.tile.h | 0 || 1);
            const sx = ((Math.floor(local / 128) % 2) * 8 + (local % 8)) * TILE;
            const sy = (Math.floor((local % 128) / 8) % 16) * TILE;
            return { sx, sy, w: w * TILE, h: h * TILE, ax: 0.5, ay: 1 };
        }
        if (type.gen) return { sx: 0, sy: 0, w: bmp.width, h: bmp.height, ax: 0.5, ay: 1 };
        const sc = Sidecars.get(type.image);
        const big = ImageManager.isBigCharacter(type.image); // "$": one character per sheet, 3 columns x 4 rows
        let fw = big ? Math.floor(bmp.width / 3) : Math.floor(bmp.width / 12);
        let fh = big ? Math.floor(bmp.height / 4) : Math.floor(bmp.height / 8);
        if (sc && sc.frameWidth > 0 && sc.frameHeight > 0) {
            fw = sc.frameWidth;
            fh = sc.frameHeight;
        }
        let col = 1; // the standing pattern of an RMMZ sheet
        if (sc && sc.animations && Array.isArray(sc.animations.stand) && sc.animations.stand.length) col = sc.animations.stand[0] | 0;
        let blockX = 0, blockY = 0;
        if (!big) {
            const index = type.characterIndex | 0;
            blockX = (index % 4) * 3;
            blockY = Math.floor(index / 4) * 4;
        }
        if ((blockX + col + 1) * fw > bmp.width) col = 0; // a single-column sheet
        const anchor = sc && Array.isArray(sc.anchor) && sc.anchor.length === 2 ? [sc.anchor[0] / fw, sc.anchor[1] / fh] : [0.5, 1];
        return { sx: (blockX + col) * fw, sy: blockY * fh, w: fw, h: fh, ax: anchor[0], ay: anchor[1] };
    }

    //-------------------------------------------------------------------------
    // The sprite layer: a child of the tilemap that owns one pooled Sprite per object in view.
    // The sprites themselves are direct children of the tilemap, so the tilemap sorts them with the
    // characters by z (foot row) the way UF_Perspective25D sorts Sprite_Character.

    class Sprite_UFObjectLayer extends Sprite {
        constructor() {
            super();
            this.z = 0;             // draws nothing itself; only its update() matters
            this._active = [];      // sprites in use, one per drawn object
            this._byCell = new Map(); // cell index -> its sprite, so a scroll step keeps every sprite that stays in view
            this._pool = [];
            this._bitmaps = [];     // typeId -> Bitmap
            this._frames = [];      // typeId -> frame rectangle and anchor, once the bitmap (and sidecar) is loaded
            this._stamp = 0;
            this._dirty = true;
            this._force = true;
            this._seen = { mapId: -1, dx: NaN, dy: NaN, zoom: NaN, grid: null };
            this.perf = { frames: 0, ms: 0, max: 0, rebuilds: 0 };
        }

        /** Rebuild on the next frame. reframe = true also recomputes every frame (a sidecar loaded). */
        markDirty(reframe) {
            this._dirty = true;
            if (reframe) {
                this._force = true;
                this._frames = [];
            }
        }

        update() {
            super.update();
            const t0 = performance.now();
            this._updateObjects();
            const dt = performance.now() - t0;
            this.perf.frames++;
            this.perf.ms += dt;
            if (dt > this.perf.max) this.perf.max = dt;
        }

        _updateObjects() {
            const map = window.$dataMap;
            if (!this.parent || !map || !map.ufObjects || !window.$gameMap) {
                this._hideAll();
                return;
            }
            const dx = Math.floor($gameMap.displayX()), dy = Math.floor($gameMap.displayY());
            const zoom = window.UF && UF.Camera ? UF.Camera.zoom() : 1;
            const seen = this._seen;
            if (seen.grid !== map.ufObjects || seen.mapId !== $gameMap.mapId()) {
                this._hideAll(); // another map or a rebuilt grid: nothing drawn so far can be trusted
                this._force = true;
            }
            if (this._dirty || this._force || seen.dx !== dx || seen.dy !== dy || seen.zoom !== zoom) {
                this._rebuild(map, dx, dy, this._force);
                seen.grid = map.ufObjects;
                seen.dx = dx;
                seen.dy = dy;
                seen.zoom = zoom;
                seen.mapId = $gameMap.mapId();
                this._dirty = false;
                this._force = false;
            }
            this._place();
        }

        // Match the objects now in view (plus margins) against the sprites by cell: a sprite keeps its object while
        // the cell stays in view with the same type; changed cells are re-assigned; the rest go back to the pool.
        _rebuild(map, dx, dy, force) {
            const grid = map.ufObjects, w = map.width, h = map.height;
            const cols = Math.ceil($gameMap.screenTileX()) + 1, rows = Math.ceil($gameMap.screenTileY()) + 1;
            const x0 = Math.max(0, dx - MARGIN), x1 = Math.min(w - 1, dx + cols + MARGIN);
            const y0 = Math.max(0, dy - MARGIN - TALLEST_CELLS), y1 = Math.min(h - 1, dy + rows + MARGIN);
            const list = table().list;
            const active = this._active, byCell = this._byCell;
            const stamp = ++this._stamp;
            for (let y = y0; y <= y1; y++) {
                const row = y * w;
                for (let x = x0; x <= x1; x++) {
                    const i = row + x;
                    const t = grid[i];
                    if (!t || t > list.length) continue;
                    let s = byCell.get(i);
                    if (!s) {
                        s = this._acquire();
                        byCell.set(i, s);
                        active.push(s);
                    }
                    s._ufStamp = stamp;
                    if (!force && s._ufType === t) continue;
                    this._assign(s, list[t - 1], x, y);
                }
            }
            let n = 0;
            for (let k = 0; k < active.length; k++) {
                const s = active[k];
                if (s._ufStamp === stamp) active[n++] = s;
                else {
                    byCell.delete(s._ufY * w + s._ufX);
                    this._release(s);
                }
            }
            active.length = n;
            this.perf.rebuilds++;
        }

        _acquire() {
            let s = this._pool.pop();
            if (!s) {
                s = new Sprite();
                s.z = MIN_Z;
                s._ufType = 0;
                this.parent.addChild(s);
            }
            return s;
        }

        _release(s) {
            s.visible = false;
            s._ufType = 0;
            this._pool.push(s);
        }

        _assign(s, type, x, y) {
            s._ufType = type.typeId;
            s._ufX = x;
            s._ufY = y;
            s._ufBonus = type.under ? UNDER_BONUS : 0;
            s._ufReady = false;
            s.visible = false;
            if (s.tint !== type.tintValue) s.tint = type.tintValue;
            let bmp = this._bitmaps[type.typeId];
            if (!bmp) bmp = this._bitmaps[type.typeId] = bitmapFor(type);
            if (s.bitmap !== bmp) s.bitmap = bmp;
            this._tryFrame(s, type);
        }

        _tryFrame(s, type) {
            let f = this._frames[type.typeId];
            if (!f) {
                f = frameFor(type, s.bitmap);
                if (!f) return false;
                this._frames[type.typeId] = f;
            }
            s.setFrame(f.sx, f.sy, f.w, f.h);
            s.anchor.set(f.ax, f.ay);
            s._ufReady = true;
            s.visible = true;
            return true;
        }

        // Every frame: follow the (fractional) display position, like Sprite_Character does. Areas never loop,
        // so adjustX/Y are plain offsets, computed once.
        _place() {
            const active = this._active, list = table().list;
            const offX = $gameMap.adjustX(0), offY = $gameMap.adjustY(0);
            for (let i = 0; i < active.length; i++) {
                const s = active[i];
                if (!s._ufReady && !this._tryFrame(s, list[s._ufType - 1])) continue;
                const ay = s._ufY + offY;
                s.x = Math.round((s._ufX + offX + 0.5) * TILE);
                s.y = Math.round((ay + 1) * TILE);
                s.z = Math.max(MIN_Z, Math.round(ay * TILE + TILE) + s._ufBonus);
            }
        }

        _hideAll() {
            for (const s of this._active) this._release(s);
            this._active.length = 0;
            this._byCell.clear();
            this._seen.grid = null;
        }

        /** The sprite drawn for the object on a cell, or null (tests, UF_Look). */
        spriteAt(x, y) {
            const map = window.$dataMap;
            if (!map) return null;
            const s = this._byCell.get(y * map.width + x);
            return s && s._ufType ? s : null;
        }

        count() {
            return this._active.length;
        }
    }

    const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _Spriteset_Map_createCharacters.call(this);
        this._ufObjectLayer = new Sprite_UFObjectLayer();
        this._tilemap.addChild(this._ufObjectLayer);
    };

    const currentLayer = () => {
        const scene = SceneManager._scene;
        return (scene && scene._spriteset && scene._spriteset._ufObjectLayer) || null;
    };

    //-------------------------------------------------------------------------
    // Passability: a cell whose object isn't passable can't be entered or left (like an impassable tile)

    const _Game_Map_isPassable = Game_Map.prototype.isPassable;
    Game_Map.prototype.isPassable = function(x, y, d) {
        if (blocksAt(x, y)) return false;
        return _Game_Map_isPassable.call(this, x, y, d);
    };

    //-------------------------------------------------------------------------
    // The public object

    const currentArea = () => (World() ? World().currentArea() : null);
    const Objects = {
        MIN_Z,
        UNDER_BONUS,
        Sprite_Layer: Sprite_UFObjectLayer,
        generated,
        /** The catalog objects list with typeId (index + 1) added. */
        types: () => table().list,
        /** A type by catalog id or type number, or null. */
        type: typeOf,
        /** Type number of a catalog id (0 = unknown). */
        typeId: typeIdOf,
        /** The type of the object on a cell of the map on screen, or null. */
        at: (x, y) => typeOf(typeIdIn(currentArea(), x, y)),
        typeIdAt: (x, y) => typeIdIn(currentArea(), x, y),
        atIn: (area, x, y) => typeOf(typeIdIn(area, x, y)),
        typeIdIn,
        /** Put an object (catalog id or type number; null/0 = nothing) on a cell of the map on screen. */
        set: (x, y, idOrTypeId) => setIn(currentArea(), x, y, idOrTypeId),
        setIn,
        /** True when the object on a cell of the map on screen stops units. */
        blocks: blocksAt,
        blocksIn: (area, x, y) => {
            const t = typeIdIn(area, x, y);
            return t !== 0 && table().blocks[t] === 1;
        },
        /** Objects near a cell on the map on screen: { near: {x, y}, radius, tags (all required), id, action, limit }. */
        find: opts => findIn(currentArea(), opts),
        findIn,
        /** Run an action on a cell of the map on screen (see applyIn). */
        apply: (x, y, action, actor) => (currentArea() ? applyIn(currentArea(), x, y, action, actor) : null),
        applyIn,
        describe: (x, y) => describeIn(currentArea(), x, y),
        describeIn,
        /** Redraw the objects in view on the next frame, recomputing every frame rectangle (after a sidecar or an image loaded). */
        refresh() {
            const l = currentLayer();
            if (l) l.markDirty(true);
        },
        layer: currentLayer,
        spriteAt(x, y) {
            const l = currentLayer();
            return l ? l.spriteAt(x, y) : null;
        },
        hourNow: absHour,
        regrowList: () => regrowList() || [],
        processRegrow,
        perf() {
            const l = currentLayer();
            if (!l) return null;
            const p = l.perf;
            return { frames: p.frames, avgMs: p.frames ? p.ms / p.frames : 0, maxMs: p.max, rebuilds: p.rebuilds, sprites: l.count(), pooled: l._pool.length };
        },
        resetPerf() {
            const l = currentLayer();
            if (l) l.perf = { frames: 0, ms: 0, max: 0, rebuilds: 0 };
        }
    };
    window.UF = window.UF || {};
    window.UF.Objects = Objects;
    window.UF.Sidecars = Sidecars;

    //-------------------------------------------------------------------------
    // Events

    let hooked = false;
    function hookEvents() {
        if (hooked || !window.UF || !UF.Events) return;
        hooked = true;
        UF.Events.on("world:objectChanged", area => {
            const l = currentLayer();
            if (l && sameArea(area, currentArea())) l.markDirty();
        });
        UF.Events.on("time:hour", () => processRegrow());
    }
    hookEvents();

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        hookEvents();
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "objects")

    function registerChecks() {
        UF.Test.suite("objects", async t => {
            const cat = catalog();
            const list = Objects.types();
            const itemIds = new Set(((cat && cat.items && cat.items.types) || []).map(i => i.id));

            // Every catalog entry is drawable and points only at things that exist.
            const problems = [];
            for (const o of list) {
                if (!o.id || !o.name) problems.push(`#${o.typeId}: missing id or name`);
                if (!o.image && !o.tile && !o.gen) problems.push(`${o.id}: no image/tile/gen`);
                if (o.gen && typeof generated[o.gen] !== "function") problems.push(`${o.id}: gen "${o.gen}" has no generator`);
                if (o.tile && (!o.tile.sheet || !(o.tile.id >= 0 && o.tile.id < 512))) problems.push(`${o.id}: tile needs sheet and id 0-511`);
                for (const [action, a] of Object.entries(o.actions || {})) {
                    if (a.becomes && !Objects.typeId(a.becomes)) problems.push(`${o.id}.${action}.becomes "${a.becomes}" unknown`);
                    for (const item of Object.keys(a.yields || {})) if (!itemIds.has(item)) problems.push(`${o.id}.${action} yields unknown item "${item}"`);
                }
                if (o.regrow && (!Objects.typeId(o.regrow.to) || !(o.regrow.hours > 0))) problems.push(`${o.id}.regrow "${o.regrow && o.regrow.to}" unknown or no hours`);
                if (o.ruin && !Objects.typeId(o.ruin)) problems.push(`${o.id}.ruin "${o.ruin}" unknown`);
                for (const item of Object.keys((o.build && o.build.items) || {})) if (!itemIds.has(item)) problems.push(`${o.id}.build needs unknown item "${item}"`);
            }
            const dup = list.map(o => o.id).filter((id, i, a) => a.indexOf(id) !== i);
            if (dup.length) problems.push(`duplicate ids: ${dup.join(", ")}`);
            t.check("catalog_types", list.length > 0 && problems.length === 0,
                problems.length ? `${problems.length} problem(s): ${problems.slice(0, 5).join("; ")}` : `${list.length} types, ${list.filter(o => o.image).length} image, ${list.filter(o => o.tile).length} tile, ${list.filter(o => o.gen).length} generated; all becomes/regrow/ruin/yields resolve`);

            const fs = require("fs"), path = require("path");
            const gameDir = nw.__dirname || process.cwd();
            const missing = [];
            for (const o of list) {
                if (o.image && !fs.existsSync(path.join(gameDir, "img", "characters", `${o.image}.png`))) missing.push(`${o.id} -> img/characters/${o.image}.png`);
                if (o.tile && !fs.existsSync(path.join(gameDir, "img", "tilesets", `${o.tile.sheet}.png`))) missing.push(`${o.id} -> img/tilesets/${o.tile.sheet}.png`);
            }
            const sheets = new Set(list.filter(o => o.image).map(o => o.image));
            const withSidecar = [...sheets].filter(n => fs.existsSync(path.join(gameDir, "img", "characters", `${n}.json`)));
            t.check("images_exist", missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : `${sheets.size} character sheets (${withSidecar.length} with a sidecar) and ${new Set(list.filter(o => o.tile).map(o => o.tile.sheet)).size} tile sheets found`);

            const banned = /avatar|britannia|guardian|lord british|iolo|dupre|shamino|fellowship|moongate|urist|armok|strange mood|fey mood|dwarf fortress|ultima|beholder|mind flayer|illithid|displacer|githyanki/i;
            const dirty = list.filter(o => banned.test(o.name || "") || banned.test(o.id || ""));
            t.check("names_clean", dirty.length === 0, dirty.length ? `names with banned words: ${dirty.map(o => o.name).join(", ")}` : `${list.length} names checked against the banned-word list`);

            const W = UF.World;
            const area = W && W.currentArea();
            if (!area) {
                t.check("on_area_map", false, `map ${$gameMap.mapId()} is not a world area`);
                return;
            }
            const size = W.state.size;
            const scene = () => SceneManager._scene;
            const tilemap = () => scene()._spriteset._tilemap;
            t.check("layer_in_tilemap", !!Objects.layer() && Objects.layer().parent === tilemap(), Objects.layer() ? "Sprite_UFObjectLayer is a child of the map's tilemap" : "no object layer on this scene");

            // Look at the middle of the area at the closest zoom.
            if (UF.Camera) UF.Camera.setLevel(0);
            const mid = Math.floor(size / 2);
            $gamePlayer.locate(mid, mid);
            await t.waitFrames(3);
            const cx = Math.floor($gameMap.displayX() + $gameMap.screenTileX() / 2);
            const cy = Math.floor($gameMap.displayY() + $gameMap.screenTileY() / 2);
            const placed = [];
            const put = (x, y, id) => {
                placed.push({ x, y, was: Objects.typeIdAt(x, y) });
                return Objects.set(x, y, id);
            };
            const opaqueSamples = s => {
                const b = s.bitmap, f = s._frame;
                if (!b || !b.isReady() || !f || f.width === 0) return 0;
                let n = 0;
                for (let y = f.y; y < f.y + f.height; y += 6) for (let x = f.x; x < f.x + f.width; x += 6) if (b.getAlphaPixel(x, y) > 0) n++;
                return n;
            };
            const ready = (x, y) => {
                const s = Objects.spriteAt(x, y);
                return !!s && s._ufReady && s.bitmap && s.bitmap.isReady();
            };
            const screenPos = (x, y) => {
                const z = UF.Camera ? UF.Camera.zoom() : 1;
                return { x: ((x - $gameMap.displayX()) + 0.5) * TILE * z, y: ((y - $gameMap.displayY()) + 1) * TILE * z };
            };

            // A tree set on a cell in view is drawn there next frame, with pixels; set to 0 it's gone.
            const ox = cx, oy = cy + 3;
            put(ox, oy, "oak");
            await t.waitFrames(1);
            const oakSprite = Objects.spriteAt(ox, oy);
            const oakNextFrame = !!oakSprite;
            await t.waitUntil(() => ready(ox, oy), 8000, "the oak sprite to load").catch(() => {});
            const s1 = Objects.spriteAt(ox, oy);
            const g1 = s1 ? s1.getGlobalPosition() : { x: NaN, y: NaN };
            const e1 = screenPos(ox, oy);
            const px1 = s1 ? opaqueSamples(s1) : 0;
            const frame1 = s1 ? `${s1._frame.width}x${s1._frame.height}` : "none";
            const shown1 = !!s1 && s1.visible && s1.parent === tilemap();
            const okPos = Math.abs(g1.x - e1.x) <= 1.5 && Math.abs(g1.y - e1.y) <= 1.5;
            Objects.set(ox, oy, null);
            await t.waitFrames(2);
            const gone = !Objects.spriteAt(ox, oy);
            t.check("drawn_in_view", oakNextFrame && shown1 && px1 > 0 && okPos && gone,
                `oak at (${ox},${oy}): sprite ${oakNextFrame ? "present next frame" : "MISSING next frame"}, ${px1} opaque samples in a ${frame1} frame, anchor at screen (${g1.x.toFixed(1)},${g1.y.toFixed(1)}) expected (${e1.x.toFixed(1)},${e1.y.toFixed(1)}); after set 0: sprite ${gone ? "gone" : "STILL THERE"}`);

            // A B-sheet tile object uses the right 48x48 rectangle of the tileset image.
            put(cx + 2, oy, "palm");
            await t.waitUntil(() => ready(cx + 2, oy), 8000, "the palm tile to load").catch(() => {});
            const s2 = Objects.spriteAt(cx + 2, oy);
            const local = Objects.type("palm").tile.id % 256;
            const esx = ((Math.floor(local / 128) % 2) * 8 + (local % 8)) * TILE, esy = (Math.floor((local % 128) / 8) % 16) * TILE;
            t.check("tile_object_drawn", !!s2 && s2._frame.x === esx && s2._frame.y === esy && s2._frame.width === TILE && s2._frame.height === TILE && opaqueSamples(s2) > 0 && /Outside_B/.test(s2.bitmap.url || ""),
                s2 ? `palm (Outside_B #${Objects.type("palm").tile.id}) frame (${s2._frame.x},${s2._frame.y}) ${s2._frame.width}x${s2._frame.height} of ${s2.bitmap.url}, ${opaqueSamples(s2)} opaque samples` : "no sprite");

            // Tint and generated bitmaps.
            put(cx - 2, oy, "birch");
            put(cx - 4, oy, "stockpile");
            await t.waitUntil(() => ready(cx - 2, oy) && ready(cx - 4, oy), 8000, "birch and stockpile sprites").catch(() => {});
            const s3 = Objects.spriteAt(cx - 2, oy), s4 = Objects.spriteAt(cx - 4, oy);
            t.check("tint_applied", !!s3 && s3.tint === tintOf(Objects.type("birch").tint) && (Objects.spriteAt(cx + 2, oy) || {}).tint === 0xffffff,
                s3 ? `birch tint 0x${s3.tint.toString(16)} (catalog ${Objects.type("birch").tint}); untinted palm 0x${(Objects.spriteAt(cx + 2, oy) || { tint: 0 }).tint.toString(16)}` : "no birch sprite");
            t.check("generated_drawn", !!s4 && s4.bitmap === generated.stockpile() && s4._frame.width === TILE && opaqueSamples(s4) > 0 && s4._ufBonus === UNDER_BONUS,
                s4 ? `stockpile: ${s4.bitmap.width}x${s4.bitmap.height} generated bitmap, ${opaqueSamples(s4)} opaque samples, z bonus ${s4._ufBonus}` : "no stockpile sprite");

            // Passability: a tree blocks, tall grass doesn't; the ground under both was passable before.
            const bx1 = cx + 3, bx2 = cx - 3, by = cy + 4;
            const groundOk = $gameMap.isPassable(bx1, by, 2) && $gameMap.isPassable(bx2, by, 2);
            put(bx1, by, "oak");
            put(bx2, by, "grass_tuft");
            const treeBlocked = [2, 4, 6, 8].every(d => !$gameMap.isPassable(bx1, by, d)) && Objects.blocks(bx1, by);
            const grassOpen = [2, 4, 6, 8].every(d => $gameMap.isPassable(bx2, by, d)) && !Objects.blocks(bx2, by);
            t.check("blocks_passage", groundOk && treeBlocked && grassOpen,
                `ground passable before: ${groundOk}; oak at (${bx1},${by}) passable: ${!treeBlocked}; tall grass at (${bx2},${by}) passable: ${grassOpen}`);

            // Sorting: a unit stands on grass (drawn under it), behind a tree to the north and in front of one to the south.
            const ux = cx + 5, uy = cy + 5;
            const unit = W.addUnit({ name: "TEST_objects_unit", image: { characterName: "$U7_Townsman", characterIndex: 0 }, area, x: ux, y: uy, dir: 2, data: { kind: "test" } });
            put(ux, uy, "grass_tuft");
            put(ux, uy - 1, "oak");
            put(ux, uy + 1, "pine");
            await t.waitUntil(() => ready(ux, uy) && ready(ux, uy - 1) && ready(ux, uy + 1) && !!W.eventOf(unit.id), 8000, "the sorting sprites").catch(() => {});
            await t.waitFrames(2);
            const ev = W.eventOf(unit.id);
            const us = ev && scene()._spriteset._characterSprites.find(s => s._character === ev);
            const under = Objects.spriteAt(ux, uy), north = Objects.spriteAt(ux, uy - 1), south = Objects.spriteAt(ux, uy + 1);
            t.check("sorted_with_units", !!us && !!under && !!north && !!south && under.z < us.z && north.z < us.z && south.z > us.z && under.z >= MIN_Z,
                us ? `unit z ${us.z}; grass on its cell z ${under && under.z}, oak north z ${north && north.z}, pine south z ${south && south.z} (want grass < north < unit < south)` : "no unit sprite");

            // A showcase row north of the pair, then the screenshot.
            const show = ["granite_boulder", "berry_bush", "fruit_tree", "campfire", "rocks_small", "bush", "reeds", "flowers"];
            show.forEach((id, i) => put(cx - 4 + i, cy - 3, id));
            await t.waitUntil(() => show.every((id, i) => ready(cx - 4 + i, cy - 3)), 8000, "the showcase sprites").catch(() => {});
            await t.waitFrames(5);
            t.screenshot("objects_in_view");

            // Chop: the oak becomes a stump, the yields are returned (and dropped when UF_Items exists).
            const ax = cx - 5, ay = cy + 4;
            put(ax, ay, "oak");
            let changedEvt = null;
            const onChanged = (a, x, y, from, to) => { if (x === ax && y === ay) changedEvt = { from, to }; };
            UF.Events.on("objects:changed", onChanged);
            const r = Objects.apply(ax, ay, "chop", null);
            UF.Events.off("objects:changed", onChanged);
            const none = Objects.apply(ax, ay, "gather");
            const onCell = window.UF.Items && typeof UF.Items.at === "function" ? UF.Items.at(ax, ay) : null;
            const logs = onCell ? onCell.filter(i => i.type === "log").reduce((n, i) => n + (i.count || 0), 0) : null;
            t.check("apply_chop", !!r && r.ok && Objects.typeIdAt(ax, ay) === Objects.typeId("stump") && r.from === "oak" && r.to === "stump" && r.yields.log === 3 && !!changedEvt && changedEvt.from === "oak" && changedEvt.to === "stump" && none === null && (onCell === null || logs === 3),
                `oak at (${ax},${ay}) chopped: now "${(Objects.at(ax, ay) || {}).id}", returned yields ${JSON.stringify(r && r.yields)}, objects:changed ${JSON.stringify(changedEvt)}, gather on the stump -> ${none === null ? "null (no such action)" : "ran"}; ${onCell ? `${logs} logs on the cell through UF.Items` : "UF.Items absent: yields only"}`);

            // Regrow: a picked berry bush comes back after its hours, driven by time:hour.
            const rx = cx - 5, ry = cy + 5;
            put(rx, ry, "berry_bush");
            const h0 = Objects.hourNow();
            const r2 = Objects.apply(rx, ry, "gather");
            const hours = Objects.type("berry_bush_bare").regrow.hours;
            const entry = Objects.regrowList().find(e => e.x === rx && e.y === ry && sameArea(e.area, area));
            const clock = { hour: $ufTime.hour, day: $ufTime.day, monthIndex: $ufTime.monthIndex, year: $ufTime.year };
            const advance = n => {
                for (let i = 0; i < n; i++) {
                    $ufTime.hour++;
                    if ($ufTime.hour >= 24) { $ufTime.hour = 0; $ufTime.day++; }
                    UF.Events.emit("time:hour", $ufTime.hour);
                }
            };
            advance(hours - 1);
            const stillBare = Objects.typeIdAt(rx, ry) === Objects.typeId("berry_bush_bare");
            advance(1);
            const regrown = Objects.typeIdAt(rx, ry) === Objects.typeId("berry_bush");
            const cleared = !Objects.regrowList().some(e => e.x === rx && e.y === ry && sameArea(e.area, area));
            Object.assign($ufTime, clock);
            t.check("regrow", !!r2 && !!entry && entry.due === h0 + hours && entry.to === Objects.typeId("berry_bush") && stillBare && regrown && cleared,
                `gathered berry bush at (${rx},${ry}): entry ${entry ? `due hour ${entry.due} (now ${h0} + ${hours})` : "MISSING"}; after ${hours - 1} h still bare: ${stillBare}; after ${hours} h a berry bush: ${regrown}; entry cleared: ${cleared}`);

            // Persistence: an object survives leaving and re-entering the area, and a save round-trip.
            const px = cx + 6, py = cy - 4;
            put(px, py, "granite_boulder");
            const gridBefore = $dataMap.ufObjects;
            const settle = target => t.waitUntil(() => scene() instanceof Scene_Map && scene().isStarted() && !$gamePlayer.isTransferring() && sameArea(W.currentArea(), target), 10000, "the map to settle").catch(() => {});
            const east = W.inWorld(area.x + 1, area.y) ? { x: area.x + 1, y: area.y } : null;
            if (east) {
                W.transferView(east.x, east.y, 5, py);
                await settle(east);
                W.transferView(area.x, area.y, mid, mid);
                await settle(area);
            } else {
                // One-area world: force a full map reload of the same area (the same path a loaded save takes).
                $gamePlayer.requestMapReload();
                W.transferView(area.x, area.y, mid, mid);
                await settle(area);
            }
            const rebuilt = $dataMap.ufObjects !== gridBefore;
            const still = Objects.typeIdAt(px, py) === Objects.typeId("granite_boulder");
            const key = `${area.x},${area.y}`, idx = py * size + px;
            const saved = JsonEx.parse(JsonEx.stringify(W.state));
            const inSave = !!saved.objectDiffs && !!saved.objectDiffs[key] && saved.objectDiffs[key][idx] === Objects.typeId("granite_boulder") && Array.isArray(saved.regrow);
            t.check("persists", rebuilt && still && inSave && sameArea(W.currentArea(), area),
                `boulder at (${px},${py}) after ${east ? "a trip east and back" : "a reload of the same area"}: grid ${rebuilt ? "rebuilt" : "NOT rebuilt"}, object ${still ? "still there" : "GONE"}; save round-trip: objectDiffs["${key}"][${idx}] = ${saved.objectDiffs && saved.objectDiffs[key] ? saved.objectDiffs[key][idx] : "missing"}, regrow list ${Array.isArray(saved.regrow) ? "saved" : "missing"}`);
            await t.waitFrames(3);
            t.check("drawn_after_reload", ready(px, py) && !!Objects.layer() && Objects.layer().parent === tilemap(), `boulder sprite ${ready(px, py) ? "drawn" : "missing"} on the new scene's layer`);

            // Performance: ~4096 objects spread over the area (every 16th cell), the view scrolling at the farthest zoom.
            const measure = async (label, fill) => {
                const grid = $dataMap.ufObjects;
                const backup = grid.slice();
                const n = fill(grid);
                Objects.refresh();
                if (UF.Camera) UF.Camera.setLevel(UF.Camera.levels.length - 1);
                $gamePlayer.locate(mid, mid);
                await t.waitFrames(10);
                await t.waitUntil(() => Objects.layer()._active.every(s => s._ufReady), 10000, "all sprites in view to load").catch(() => {});
                const x0 = $gameMap.displayX(), y0 = $gameMap.displayY();
                Objects.resetPerf();
                for (let f = 0; f < 120; f++) {
                    $gameMap.setDisplayPos(x0 + f * 0.5, y0 + (f % 8) * 0.25); // half a cell per frame: a rebuild every other frame
                    await t.waitFrames(1);
                }
                const p = Objects.perf();
                const zoom = UF.Camera ? UF.Camera.zoom().toFixed(3) : "1";
                if (label === "perf_dense") t.screenshot("objects_zoomed_out");
                grid.set(backup);
                Objects.refresh();
                t.check(label, !!p && p.avgMs <= 1.0,
                    p ? `layer update avg ${p.avgMs.toFixed(3)} ms, max ${p.maxMs.toFixed(2)} ms over ${p.frames} frames (${p.rebuilds} rebuilds), ${p.sprites} sprites in view, ${n} objects written into the grid (no diffs), zoom ${zoom}, view scrolling` : "no layer");
            };
            const kinds = ["oak", "grass_tuft", "pine", "rocks_small", "berry_bush", "bush", "fern", "birch"].map(id => Objects.typeId(id));
            await measure("perf", grid => {
                let n = 0;
                for (let i = 0; i < grid.length; i += 16) if (!grid[i]) { grid[i] = kinds[(i / 16) % kinds.length]; n++; }
                return n;
            });
            // The dense case: every other cell of the 96x96 block around the middle (a forest), same budget.
            await measure("perf_dense", grid => {
                let n = 0;
                for (let y = mid - 48; y < mid + 48; y++) for (let x = mid - 48; x < mid + 48; x += 2) {
                    const i = y * size + x;
                    if (!grid[i]) { grid[i] = kinds[(x + y) % kinds.length]; n++; }
                }
                return n;
            });

            // Clean up: the test unit, the placed objects (which also clears their regrow entries), the view.
            W.removeUnit(unit.id);
            for (const p of placed.reverse()) Objects.set(p.x, p.y, p.was);
            if (UF.Camera) UF.Camera.setLevel(1);
            $gamePlayer.locate(mid, mid);
            await t.waitFrames(5);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during objects checks");
        });
    }
})();
