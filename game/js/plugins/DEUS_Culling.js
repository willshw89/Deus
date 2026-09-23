/*:
 * @target MZ
 * @plugindesc [DEUS Culling] Spatial viewport scheduling for character sprites.
 * @author Astra
 * @orderAfter DEUS_Camera
 * @orderAfter DEUS_Perspective25D
 * @orderAfter DEUS_Anim
 * @orderAfter DEUS_Stance
 * @orderAfter DEUS_Test
 * @help
 * DEUS-TSK-ASTRA-01, 2026-09-22. Load LAST among presentation plugins.
 * Only this file and tools/bench_viewport_culling.js belong to this task.
 * The work-block's two-file restriction supersedes STATUS/VISION/system-doc
 * edits. Integration and Plugin Manager registration belong to Coordinator.
 *
 * UF.Culling API:
 *   enabled (read only), setEnabled(boolean): transient diagnostic toggle.
 *   bounds(): camera bounds in map tiles, including a two-tile margin.
 *   refresh(spriteset): register once, reconcile after camera/movement changes.
 *   release(spriteset): unregister and restore its original display ownership.
 *   stats(spriteset): registered/active/parked counts and query/update counters.
 *   contains(character): whether its interpolated position is in the viewport.
 *
 * Near sprites update every presentation frame. Distant sprites have no display
 * updates: their next update is triggered by entry into the padded viewport.
 * An eight-tile spatial index is maintained by existing character movement and
 * teleport calls. No periodic full registry scan or simulation throttling.
 * Map pan/zoom queries only intersecting buckets and the previous active set.
 * Parked sprites live in a hidden PIXI.Container (no update traversal, render,
 * or per-character depth sort). Existing foot-Y sorting is unchanged.
 * All registry state is in WeakMaps/PIXI owners, never on saved characters.
 *
 * Replaced core methods: none. Aliases character movement, Sprite_Character
 * update/destruction/rebinding, Sprite_Balloon.update, Spriteset_Map update,
 * target lookup/destruction, and Scene_Boot.start. The map tilemap's instance
 * addChild/removeChild track dynamic sprites; other tilemaps are unchanged.
 * During Spriteset_Map.update its _characterSprites is the active view, so
 * DEUS_Anim/DEUS_Stance consume local sprites. Outside that call the original
 * full array is retained for world lifecycle and targeting.
 * World addUnit/removeUnit/moveUnitToLevel/reconcileEvents/update aliases expose
 * that full array during lifecycle operations, including nested display passes.
 *
 * Existing DEUS_Perspective25D's inner two-tile cull remains compatible.
 * Preserve normal transparency/empty-image/fog decisions from the update chain.
 * Already pooled Objects/Items layers retain their own viewport ownership.
 * Legacy DEUS_Anim combat-guard transitions are serviced from the character's
 * existing update before parking skips the display chain. No combat truth is
 * reimplemented here; the existing guard remains its owner.
 *
 * Checks: node tools/run_tests.js culling (after registration).
 * Isolated preparation/benchmark: node tools/bench_viewport_culling.js --help.
 */
(() => {
    "use strict";
    const UF = window.UF = window.UF || window.DEUS || {};
    const MARGIN = 2;
    const BUCKET = 8;
    const owners = new WeakMap();             // spriteset -> presentation manager
    const entries = new WeakMap();            // sprite -> registry entry
    const characters = new WeakMap();         // character -> Set<entry>
    let enabled = true;
    let epoch = 0;

    function view() {
        const m = window.$gameMap;
        if (!m) return null;
        const zoom = UF.Camera ? UF.Camera.zoom() : 1;
        const z = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
        // The actual canvas can exceed the UI box by eight pixels in MZ.
        const w = Math.max(Graphics.boxWidth || 0, Graphics.width || 0) / z / m.tileWidth();
        const h = Math.max(Graphics.boxHeight || 0, Graphics.height || 0) / z / m.tileHeight();
        const x = m.displayX(), y = m.displayY();
        return { map: m, x, y, w, h, zoom: z, margin: MARGIN,
            minX: x - MARGIN, maxX: x + w + MARGIN,
            minY: y - MARGIN, maxY: y + h + MARGIN,
            width: m.width(), height: m.height(),
            loopX: m.isLoopHorizontal(), loopY: m.isLoopVertical() };
    }
    const realX = ch => Number.isFinite(ch._realX) ? ch._realX : ch.x;
    const realY = ch => Number.isFinite(ch._realY) ? ch._realY : ch.y;
    const mod = (n, size) => ((n % size) + size) % size;
    function inside(ch, v) {
        if (!ch || !v) return false;
        const x = v.map.adjustX(realX(ch)), y = v.map.adjustY(realY(ch));
        return Number.isFinite(x) && Number.isFinite(y) &&
            x >= -MARGIN && x <= v.w + MARGIN && y >= -MARGIN && y <= v.h + MARGIN;
    }
    function bucketKey(ch, v) {
        let x = realX(ch), y = realY(ch);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        if (v.loopX) x = mod(x, v.width);
        if (v.loopY) y = mod(y, v.height);
        return `${Math.floor(x / BUCKET)},${Math.floor(y / BUCKET)}`;
    }
    function axisBuckets(lo, hi, size, loop) {
        const result = new Set();
        if (!(size > 0)) return result;
        if (loop && hi - lo >= size) {
            for (let n = 0; n < Math.ceil(size / BUCKET); n++) result.add(n);
        } else {
            // Iterate cells at query time only; handles non-multiple-of-8 maps
            // and wrapping without changing adjustX/adjustY's frozen contract.
            for (let n = Math.floor(lo); n <= Math.ceil(hi); n++) {
                if (loop || (n >= 0 && n < size)) result.add(Math.floor((loop ? mod(n, size) : n) / BUCKET));
            }
        }
        return result;
    }
    function unlink(e) {
        const bucket = e.owner.buckets.get(e.key);
        if (bucket) {
            bucket.delete(e);
            if (!bucket.size) e.owner.buckets.delete(e.key);
        }
    }
    function index(e) {
        const key = bucketKey(e.character, e.owner.view);
        if (key === e.key) return;
        unlink(e);
        e.key = key;
        if (key !== null) {
            let bucket = e.owner.buckets.get(key);
            if (!bucket) e.owner.buckets.set(key, bucket = new Set());
            bucket.add(e);
        }
    }
    function moved(ch) {
        const list = characters.get(ch);
        if (!list) return;
        for (const e of list) {
            // DEUS_Anim still owns a legacy combat/death transition inside its
            // sprite alias. Service only a pending transition, not an offscreen
            // animation cadence. Its inner Perspective cull skips display work.
            if (enabled && UF.Anim && !e.owner.active.has(e) &&
                ((ch._combatAnim && !ch._combatAnim._ufInert) || ch._combatOffset)) {
                characterUpdate.call(e.sprite);
                e.sprite.visible = false;
            }
            const x = realX(ch), y = realY(ch);
            if (x === e.x && y === e.y) continue;
            e.x = x; e.y = y;
            index(e);
            // Only near/active movement can change the active view. Far movement
            // updates its bucket but incurs no viewport/texture evaluation.
            if (e.owner.active.has(e) || e.owner.queried.has(e.key)) e.owner.dirty.add(e);
        }
    }
    function detach(e) {
        const o = e.owner;
        unlink(e);
        o.all.delete(e); o.active.delete(e); o.dirty.delete(e);
        o.listDirty = true;
        const list = characters.get(e.character);
        if (list) list.delete(e);
        entries.delete(e.sprite);
    }
    function register(o, sprite) {
        if (!(sprite instanceof Sprite_Character) || !sprite._character) return;
        const old = entries.get(sprite);
        if (old && old.owner === o && old.character === sprite._character) return;
        if (old) detach(old);
        const ch = sprite._character;
        const e = { owner: o, sprite, character: ch, key: null, x: realX(ch), y: realY(ch) };
        entries.set(sprite, e);
        let list = characters.get(ch);
        if (!list) characters.set(ch, list = new Set());
        list.add(e); o.all.add(e); index(e); o.dirty.add(e);
    }
    function place(e, active) {
        const o = e.owner, sp = e.sprite;
        const parent = active ? o.tilemap : o.park;
        if (sp.parent !== parent) {
            o.internal++;
            try { parent.addChild(sp); } finally { o.internal--; }
        }
        if (active) {
            if (!o.active.has(e)) {
                o.active.add(e); o.listDirty = true;
                // Refresh BEFORE the first render/sort, even if the pan happens
                // immediately before rendering or while logical time is paused.
                sp.visible = true;
                sp.update();
                o.woken++;
            }
        } else {
            sp.visible = false;
            if (o.active.delete(e)) o.listDirty = true;
        }
    }
    function makeOwner(ss, v) {
        const tilemap = ss._tilemap;
        const park = new PIXI.Container();
        park.visible = false; park.z = -Infinity; park.spriteId = -1;
        const o = { spriteset: ss, tilemap, park, view: v, all: new Set(),
            active: new Set(), buckets: new Map(), dirty: new Set(), queried: new Set(),
            list: [], listDirty: true, allList: ss._characterSprites,
            internal: 0, scopeDepth: 0, epoch: -1, queries: 0, visited: 0, woken: 0, updates: 0 };
        owners.set(ss, o);
        o.addChild = tilemap.addChild;
        o.removeChild = tilemap.removeChild;
        o.parkRemove = park.removeChild;
        tilemap.addChild(park);
        tilemap.addChild = function(...sprites) {
            const result = o.addChild.apply(this, sprites);
            if (!o.internal) for (const sp of sprites) register(o, sp);
            return result;
        };
        const removed = function(original, sprites) {
            if (!o.internal) for (const sp of sprites) {
                const e = entries.get(sp);
                if (e && e.owner === o) detach(e);
            }
            return original.apply(this, sprites);
        };
        tilemap.removeChild = function(...sprites) { return removed.call(this, o.removeChild, sprites); };
        park.removeChild = function(...sprites) { return removed.call(this, o.parkRemove, sprites); };
        for (const sp of ss._characterSprites || []) register(o, sp);
        return o;
    }
    function refresh(ss) {
        const v = view();
        if (!ss || !ss._tilemap || !v) return null;
        let o = owners.get(ss);
        if (!o) o = makeOwner(ss, v);
        const old = o.view;
        const changed = o.epoch !== epoch || old.map !== v.map || old.x !== v.x || old.y !== v.y ||
            old.w !== v.w || old.h !== v.h || old.width !== v.width || old.height !== v.height ||
            old.loopX !== v.loopX || old.loopY !== v.loopY;
        o.view = v;
        if (o.epoch !== epoch || old.map !== v.map || old.width !== v.width || old.height !== v.height ||
            old.loopX !== v.loopX || old.loopY !== v.loopY) {
            // Toggle/map replacement is an explicit invalidation, not a frame scan.
            for (const e of o.all) { index(e); o.dirty.add(e); }
        }
        o.epoch = epoch;
        if (changed && enabled) {
            o.queries++;
            const xs = axisBuckets(v.minX, v.maxX, v.width, v.loopX);
            const ys = axisBuckets(v.minY, v.maxY, v.height, v.loopY);
            o.queried.clear();
            for (const e of o.active) o.dirty.add(e);
            for (const x of xs) for (const y of ys) {
                const key = `${x},${y}`;
                o.queried.add(key);
                const bucket = o.buckets.get(key);
                if (bucket) for (const e of bucket) { o.dirty.add(e); o.visited++; }
            }
        }
        for (const e of o.dirty) place(e, !enabled || inside(e.character, v));
        o.dirty.clear();
        if (o.listDirty) {
            o.list = Array.from(o.active, e => e.sprite);
            o.listDirty = false;
        }
        return o;
    }
    function release(ss) {
        const o = owners.get(ss);
        if (!o) return;
        o.internal++;
        try {
            for (const e of o.all) {
                o.tilemap.addChild(e.sprite);
                detach(e);
            }
        } finally { o.internal--; }
        o.tilemap.addChild = o.addChild;
        o.tilemap.removeChild = o.removeChild;
        o.park.removeChild = o.parkRemove;
        o.tilemap.removeChild(o.park);
        o.park.destroy();
        owners.delete(ss);
    }
    function withActiveSprites(ss, fn) {
        const o = refresh(ss);
        if (!o) return fn();
        const all = ss._characterSprites;
        if (o.scopeDepth === 0) o.allList = all;
        o.scopeDepth++;
        ss._characterSprites = o.list;
        try { return fn(); }
        finally { o.scopeDepth--; ss._characterSprites = all; }
    }
    function withAllSprites(ss, fn) {
        const o = ss && owners.get(ss);
        if (!o || ss._characterSprites === o.allList) return fn();
        ss._characterSprites = o.allList;
        try { return fn(); }
        finally { refresh(ss); ss._characterSprites = o.list; }
    }
    const lifecycleWrappers = new WeakSet();
    function installLifecycle() {
        const world = UF.World;
        if (!world) return;
        for (const name of ["addUnit", "removeUnit", "moveUnitToLevel", "reconcileEvents", "update"]) {
            const original = world[name];
            if (typeof original !== "function" || lifecycleWrappers.has(original)) continue;
            const wrapped = function(...args) {
                const scene = SceneManager._scene;
                return withAllSprites(scene && scene._spriteset, () => original.apply(this, args));
            };
            // Retain DEUS_Anim's wrapper markers so its idempotent installer
            // doesn't double-install death/remains hooks at every map start.
            Object.assign(wrapped, original);
            lifecycleWrappers.add(wrapped);
            world[name] = wrapped;
        }
    }

    const Culling = UF.Culling = {
        get enabled() { return enabled; },
        setEnabled(value) { if (enabled !== !!value) { enabled = !!value; epoch++; } },
        bounds: view,
        contains(ch) { return inside(ch, view()); },
        refresh,
        release,
        stats(ss) {
            const o = owners.get(ss);
            return o ? { registered: o.all.size, active: o.active.size,
                parked: o.all.size - o.active.size, queries: o.queries,
                candidates: o.visited, woken: o.woken, updates: o.updates } : null;
        }
    };
    for (const name of ["update", "setPosition", "copyPosition"]) {
        const original = Game_CharacterBase.prototype[name];
        Game_CharacterBase.prototype[name] = function() {
            const result = original.apply(this, arguments);
            moved(this);
            return result;
        };
    }
    const characterUpdate = Sprite_Character.prototype.update;
    Sprite_Character.prototype.update = function() {
        const e = entries.get(this);
        const v = e ? e.owner.view : view();
        if (enabled && !inside(this._character, v)) {
            this.visible = false;
            return;
        }
        this.visible = true;
        if (e) e.owner.updates++;
        characterUpdate.call(this);
    };
    const setCharacter = Sprite_Character.prototype.setCharacter;
    Sprite_Character.prototype.setCharacter = function(ch) {
        const e = entries.get(this), o = e && e.owner;
        if (e) detach(e);
        setCharacter.call(this, ch);
        if (o) register(o, this);
    };
    const destroyCharacter = Sprite_Character.prototype.destroy;
    Sprite_Character.prototype.destroy = function() {
        const e = entries.get(this);
        if (e) detach(e);
        return destroyCharacter.apply(this, arguments);
    };
    const spritesetUpdate = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        return withActiveSprites(this, () => spritesetUpdate.call(this));
    };
    const findTargetSprite = Spriteset_Map.prototype.findTargetSprite;
    Spriteset_Map.prototype.findTargetSprite = function(target) {
        const list = characters.get(target);
        const o = owners.get(this);
        if (list && o) for (const e of list) if (e.owner === o) return e.sprite;
        return findTargetSprite.call(this, target);
    };
    const spritesetDestroy = Spriteset_Map.prototype.destroy;
    Spriteset_Map.prototype.destroy = function() {
        release(this);
        return spritesetDestroy.apply(this, arguments);
    };
    const balloonUpdate = Sprite_Balloon.prototype.update;
    Sprite_Balloon.prototype.update = function() {
        const target = this._target;
        if (enabled && target instanceof Sprite_Character && !Culling.contains(target._character)) {
            this.visible = false;
            // Presentation-domain duration continues; no stale balloons on return
            // and no permanently playing balloon that blocks an event's wait.
            if (this._duration > 0) this._duration--;
            return;
        }
        this.visible = true;
        balloonUpdate.call(this);
    };

    const bootStart = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        bootStart.call(this);
        installLifecycle();
        if (UF.Test && UF.Test.active) registerChecks();
    };
    const mapStart = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        mapStart.call(this);
        installLifecycle();
    };

    function registerChecks() {
        UF.Test.suite("culling", async t => {
            await t.waitUntil(() => ImageManager.loadCharacter("Actor1").isReady(), 10000, "Actor1 fixture image");
            const saved = { map: $gameMap, data: $dataMap, camera: UF.Camera, enabled };
            const map = new Game_Map();
            const data = { width: 256, height: 256, scrollType: 3, events: [], data: [], tilesetId: 1 };
            let zoom = 1;
            let ss;
            try {
                window.$dataMap = data; window.$gameMap = map;
                map._mapId = 1; map._displayX = 40; map._displayY = 40;
                map.screenTileX = () => Graphics.width / zoom / map.tileWidth();
                map.screenTileY = () => Graphics.height / zoom / map.tileHeight();
                UF.Camera = { zoom: () => zoom };
                Culling.setEnabled(true);
                const tilemap = new Tilemap();
                ss = { _tilemap: tilemap, _characterSprites: [] };
                const make = (x, y) => {
                    const ch = new Game_Character();
                    ch.setPosition(x, y); ch.setImage("Actor1", 0);
                    const sp = new Sprite_Character(ch);
                    ss._characterSprites.push(sp); tilemap.addChild(sp);
                    return sp;
                };
                const near = make(44, 44), far = make(90, 90);
                refresh(ss); near.update(); far.update();
                t.check("offscreen_hidden", far.visible === false && far.parent !== tilemap, "(90,90), camera (40,40); parked off tilemap");
                t.check("onscreen_visible", near.visible && near.bitmap.isReady() && near._frame.width > 0 && near.parent === tilemap, "real Actor1 frame ready and attached");
                map._displayX = 86; map._displayY = 86; refresh(ss);
                t.check("pan_restores", far.visible && far.parent === tilemap && far.x === far._character.screenX(), "position refreshed before first post-pan sort/render");
                map._displayX = 40; map._displayY = 40; refresh(ss);
                const ch = far._character, x = ch.x, y = ch.y;
                ch.setThrough(true); ch.moveDiagonally(6, 2);
                const moving = ch.isMoving();
                const rx = ch._realX;
                for (let i = 0; i < 32; i++) ch.update();
                refresh(ss);
                t.check("offscreen_logic_moves", moving && ch.x === x + 1 && ch.y === y + 1 && ch._realX > rx && !ch.isMoving() && !far.visible,
                    `logical (${x},${y})->(${ch.x},${ch.y}), interpolation completes while hidden`);
                const before = Culling.stats(ss);
                for (let i = 0; i < 30; i++) { refresh(ss); tilemap.update(); }
                const after = Culling.stats(ss);
                t.check("stationary_view_no_registry_scan", after.queries === before.queries && after.candidates === before.candidates,
                    "30 presentation frames: no new bucket queries/candidate visits");
                ch.setPosition(Math.ceil(view().maxX) + 1, 44); refresh(ss);
                const wasParked = far.parent !== tilemap;
                ch.moveStraight(4);
                for (let i = 0; i < 32; i++) { ch.update(); refresh(ss); }
                t.check("walking_entry_wakes", wasParked && far.visible && far.parent === tilemap &&
                    map.displayX() === 40 && far.x > view().w * 48,
                    "ordinary movement enters margin before canvas overlap, camera stationary");
                ch.setPosition(90, 90); refresh(ss);
                let edgeSamples = 0, edgeMisses = 0;
                // Independent 96px sprite AABB overlap oracle. Pan all four edges
                // at quarter-tile increments, through the torus seam, at each zoom.
                for (const z of [0.5, 1, 2]) {
                    zoom = z;
                    for (const origin of [0, 40, 250]) {
                        map._displayX = origin; map._displayY = origin;
                        const v = view();
                        for (let axis = 0; axis < 2; axis++) {
                            const extent = axis ? v.h : v.w;
                            for (let d = -4; d <= extent + 4; d += 0.25) {
                                near._character.setPosition(mod(origin + (axis ? 4 : d), 256), mod(origin + (axis ? d : 4), 256));
                                refresh(ss); near.update();
                                const px = near._character.screenX(), py = near._character.screenY();
                                const overlaps = px + 48 > 0 && px - 48 < v.w * 48 && py > 0 && py - 96 < v.h * 48;
                                if (overlaps) { edgeSamples++; if (!near.visible || near.parent !== tilemap) edgeMisses++; }
                            }
                        }
                    }
                }
                t.check("edge_overlap_visible", edgeSamples > 500 && edgeMisses === 0, `${edgeSamples} overlapping 96x96 AABBs, ${edgeMisses} hidden; zoom 0.5/1/2, all edges, wrap`);
                zoom = 1; map._displayX = 250; map._displayY = 250;
                near._character.setPosition(0, 0); refresh(ss);
                t.check("wrap_visible", near.visible && near.parent === tilemap, "(0,0) visible across (250,250) toroidal seam");
                near._character.setTransparent(true); near.update();
                t.check("transparency_preserved", near.visible === false, "normal updateVisibility owns transparency");
                near._character.setTransparent(false); near.update();
                let depthOK = true;
                for (const priority of [0, 1, 2]) {
                    near._character.setPriorityType(priority);
                    near.update();
                    depthOK = depthOK && near.z === near._character.screenZ() && near._character._priorityType === priority;
                }
                far._character.setPosition(0, 1); far._character.setPriorityType(1);
                near._character.setPriorityType(1); refresh(ss); near.update(); far.update();
                depthOK = depthOK && tilemap._compareChildOrder(near, far) < 0;
                t.check("depth_preserved", depthOK, "priorities 0/1/2 preserved; nearer foot sorts after farther foot");
                far._character.setPosition(90, 90); refresh(ss);
                const balloon = new Sprite_Balloon(); balloon.setup(far, 1);
                const duration = balloon._duration; balloon.update();
                t.check("hidden_balloon_expires", !balloon.visible && balloon._duration === duration - 1, "presentation lifetime continues without frame/position work");
                balloon.destroy();
                const dynamic = make(100, 100); refresh(ss);
                const count = Culling.stats(ss).registered;
                dynamic.parent.removeChild(dynamic);
                ss._characterSprites.splice(ss._characterSprites.indexOf(dynamic), 1);
                refresh(ss);
                t.check("dynamic_despawn_unregistered", Culling.stats(ss).registered === count - 1, "parked parent.removeChild follows World despawn contract");
                dynamic.destroy();
                const fullList = ss._characterSprites;
                let added;
                withActiveSprites(ss, () => withAllSprites(ss, () => { added = make(101, 101); }));
                refresh(ss);
                const scopedCount = Culling.stats(ss).registered;
                withActiveSprites(ss, () => withActiveSprites(ss, () => withAllSprites(ss, () => {
                    const i = ss._characterSprites.findIndex(sp => sp === added);
                    const sp = ss._characterSprites[i];
                    if (sp && sp.parent) sp.parent.removeChild(sp);
                    ss._characterSprites.splice(i, 1);
                })));
                t.check("scoped_lifecycle_preserved", ss._characterSprites === fullList && !fullList.includes(added) &&
                    Culling.stats(ss).registered === scopedCount - 1, "World-style add/remove inside nested active scopes updates full list");
                added.destroy();
                const json = JsonEx.stringify(near._character);
                t.check("no_saved_culling_state", !/culling|buckets|parked|queried/i.test(json), "registry lives in WeakMaps and PIXI owners only");
                Culling.setEnabled(false); refresh(ss);
                t.check("disable_reattaches_all", Culling.stats(ss).parked === 0 && far.parent === tilemap, "diagnostic toggle rebuilds once");
                t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().join(" | "));
            } finally {
                if (ss) {
                    release(ss);
                    ss._tilemap.destroy({ children: true });
                }
                window.$gameMap = saved.map; window.$dataMap = saved.data;
                UF.Camera = saved.camera; Culling.setEnabled(saved.enabled);
            }
        }, { isDefault: false });
    }
})();
