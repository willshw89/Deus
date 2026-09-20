//=============================================================================
// UF_Doors.js - Faction-aware doors in site gates and house entrances
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Doors] Places cultural doors in settlement openings; faction-aware passage, open/closed frames, building, interaction, and damage.
 * @author UF project
 * @base UF_Objects
 * @orderAfter UF_Objects
 * @orderAfter UF_Factions
 * @orderAfter UF_History
 *
 * @help
 * Door objects come from UF_WorldCatalog.  Their per-cell owner, hit points,
 * held-open flag, and short open timer live in UF.World.state.doors.  Doors
 * admit their faction and allies, remain shut to wildlife and strangers,
 * and become their catalog ruin when destroyed.
 *
 * API, state, events, assets, and checks: docs/systems/UF_Doors.md
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const OPEN_FRAMES = 90;
    const FRIENDLY_RELATION = 15;
    const CLOSED_PATTERN = 0;
    const OPEN_PATTERN = 2;
    const NEIGHBORS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

    const catalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const zOf = a => a && a.z !== undefined ? a.z : 0;
    const validZ = z => Number.isInteger(z) && z >= -2 && z <= 2;
    const levelCore = () => !!World() && typeof World().viewLevel === "function" && typeof World().levelOfMapId === "function";
    const supported = a => !!a && validZ(zOf(a)) && (zOf(a) === 0 || levelCore());
    const copyArea = a => zOf(a) === 0 ? { x: a.x, y: a.y } : { x: a.x, y: a.y, z: zOf(a) };
    const recordArea = r => r && r.area ? { x: r.area.x, y: r.area.y, z: r.z !== undefined ? r.z : zOf(r.area) } : null;
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y && zOf(a) === zOf(b);
    const viewArea = () => {
        const W = World(), area = W && (levelCore() ? W.viewLevel() : W.currentArea());
        return supported(area) ? area : null;
    };
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const now = () => window.UF && UF.Beat && Number.isFinite(UF.Beat.count)
        ? UF.Beat.count * 60
        : window.UF && UF.Time && UF.Time.ticks ? UF.Time.ticks()
            : World() ? World()._frame : 0;

    function store() {
        const W = World();
        if (!W || !W.state) return null;
        const d = W.state.doors;
        if (d && d.byCell) return d;
        return (W.state.doors = { version: 1, generated: false, byCell: {}, pending: [] });
    }
    const cellKey = (area, x, y) => area && validZ(zOf(area)) ? `${area.x},${area.y}${zOf(area) === 0 ? "" : `,${zOf(area)}`}:${x},${y}` : null;
    function parseKey(key) {
        const m = String(key).match(/^(-?\d+),(-?\d+)(?:,(-?\d+))?:(-?\d+),(-?\d+)$/);
        if (!m || !validZ(m[3] === undefined ? 0 : Number(m[3]))) return null;
        return { area: copyArea({ x: Number(m[1]), y: Number(m[2]), z: m[3] === undefined ? 0 : Number(m[3]) }), x: Number(m[4]), y: Number(m[5]) };
    }
    function isDoorType(type) {
        return !!type && Array.isArray(type.tags) && type.tags.includes("door") && !!type.door;
    }
    function doorAt(area, x, y) {
        const O = Objects();
        if (!O || !supported(area)) return null;
        const type = O.atIn(area, x, y);
        if (!isDoorType(type)) return null;
        const s = ensureDoor(area, x, y, type);
        return s ? { key: cellKey(area, x, y), area: copyArea(area), x, y, type, state: s } : null;
    }
    function playerFactionId() {
        const W = World();
        return W && W.state && W.state.factions ? W.state.factions.playerId : null;
    }
    function ensureDoor(area, x, y, type, faction) {
        const ds = store();
        if (!ds || !supported(area) || !type || !isDoorType(type)) return null;
        const key = cellKey(area, x, y);
        let s = ds.byCell[key];
        if (!s) {
            const hp = Math.max(1, (type.door && type.door.hp) | 0);
            s = ds.byCell[key] = { objectId: type.id, faction: faction || playerFactionId(), hp, maxHp: hp, heldOpen: false, openUntil: 0 };
        } else {
            s.objectId = type.id;
            if (!s.maxHp) s.maxHp = Math.max(1, (type.door && type.door.hp) | 0);
            if (!Number.isFinite(s.hp)) s.hp = s.maxHp;
            if (faction && !s.faction) s.faction = faction;
        }
        return s;
    }
    const stateAt = (area, x, y) => {
        const d = doorAt(area, x, y);
        return d ? d.state : null;
    };
    const isOpenState = s => !!s && (!!s.heldOpen || (s.openUntil || 0) > now());

    function canUnitPass(unit, doorOrState) {
        if (doorOrState && doorOrState.area && unit && unit.area && !sameArea(recordArea(unit), doorOrState.area)) return false;
        const s = doorOrState && doorOrState.state ? doorOrState.state : doorOrState;
        if (!s) return false;

        // Locked door check: requires matching key in keys array or inventory
        if (s.locked) {
            if (!unit || !unit.data) return false;
            const uKeys = unit.data.keys || [];
            const uInv = unit.data.inventory || [];
            const hasKey = s.keyId && (uKeys.includes(s.keyId) || uInv.some(i => i && (i.id === s.keyId || i.keyId === s.keyId)));
            if (!hasKey) return false;
        }

        if (s.heldOpen) return true;
        const faction = unit && unit.data ? unit.data.faction : null;
        if (!faction) return false;
        if (!s.faction || faction === s.faction) return true;
        const F = window.UF && UF.Factions;
        return !!F && typeof F.relation === "function" && F.relation(faction, s.faction) >= FRIENDLY_RELATION;
    }

    function lockDoor(area, x, y, keyId = null) {
        const d = doorAt(area, x, y);
        if (!d || !d.state) return false;
        d.state.locked = true;
        if (keyId) d.state.keyId = keyId;
        d.state.heldOpen = false;
        d.state.openUntil = 0;
        emit("doors:locked", d);
        syncSprites();
        return true;
    }

    function unlockDoor(area, x, y, keyId = null) {
        const d = doorAt(area, x, y);
        if (!d || !d.state) return false;
        if (d.state.locked && d.state.keyId && keyId && d.state.keyId !== keyId) {
            return false;
        }
        d.state.locked = false;
        emit("doors:unlocked", d);
        syncSprites();
        return true;
    }

    function openDoor(doorOrState, frames = OPEN_FRAMES) {
        const s = doorOrState && doorOrState.state ? doorOrState.state : doorOrState;
        if (!s) return false;
        const was = isOpenState(s);
        s.openUntil = Math.max(s.openUntil || 0, now() + Math.max(1, frames | 0));
        if (!was) emit("doors:opened", s);
        return true;
    }
    function toggleHeld(area, x, y) {
        const d = doorAt(area, x, y);
        if (!d) return false;
        if (isOpenState(d.state)) {
            d.state.heldOpen = false;
            d.state.openUntil = now();
            emit("doors:closed", d);
        } else {
            d.state.heldOpen = true;
            emit("doors:opened", d);
        }
        syncSprites();
        return d.state.heldOpen;
    }

    function tilePasses(x, y, d) {
        if (!$gameMap || !$gameMap.isValid(x, y)) return false;
        const bit = 1 << (d / 2 - 1);
        return $gameMap.checkPassage(x, y, bit);
    }
    const reverseDir = d => 10 - d;

    // Per-character passage has the mover, unlike Game_Map.isPassable.  On a
    // permitted door crossing we ask the stock tile passage directly, thereby
    // bypassing only UF_Objects' door-cell block and no terrain rule.
    const _Game_CharacterBase_isMapPassable = Game_CharacterBase.prototype.isMapPassable;
    Game_CharacterBase.prototype.isMapPassable = function(x, y, d) {
        const W = World(), area = viewArea();
        if (!area || !window.$gameMap) return _Game_CharacterBase_isMapPassable.call(this, x, y, d);
        const x2 = $gameMap.roundXWithDirection(x, d), y2 = $gameMap.roundYWithDirection(y, d);
        const a = doorAt(area, x, y), b = doorAt(area, x2, y2);
        if (!a && !b) return _Game_CharacterBase_isMapPassable.call(this, x, y, d);
        let unit = W.unitOfEvent && W.unitOfEvent(this);
        // UF_World uses Game_Player as the invisible view/cursor rather than a
        // saved world unit.  It still belongs to the player's faction, or the
        // camera would be trapped by every friendly settlement door.
        if (!unit && this === $gamePlayer) unit = { area: copyArea(area), z: zOf(area), data: { kind: "player", faction: playerFactionId() } };
        if (!unit || (a && !canUnitPass(unit, a)) || (b && !canUnitPass(unit, b))) return false;
        if (!tilePasses(x, y, d) || !tilePasses(x2, y2, reverseDir(d))) return false;
        if (a) openDoor(a);
        if (b) openDoor(b);
        return true;
    };

    function groundFreeIgnoringDoor(ax, ay, x, y, ignoreUnitId, z) {
        const W = World(), st = W && W.state;
        const area = { x: ax, y: ay, z };
        if (!st || !supported(area) || !W.inWorld(ax, ay, z) || x < 0 || y < 0 || x >= st.size || y >= st.size) return false;
        const onScreen = sameArea(area, viewArea()) && window.$gameMap && $gameMap.mapId() === W.areaMapId(ax, ay, z);
        if (onScreen) {
            if (!($gameMap.checkPassage(x, y, 0x01) || $gameMap.checkPassage(x, y, 0x08))) return false;
            if (Tilemap.isWaterTile($gameMap.tileId(x, y, 0))) return false;
        } else {
            const map = W.peekArea(ax, ay, z);
            if (!map || !map.data) return false;
            const ts = window.$dataTilesets && $dataTilesets[map.tilesetId];
            if (!ts || !ts.flags) return false;
            for (let layer = 3; layer >= 0; layer--) {
                const tileId = map.data[(layer * st.size + y) * st.size + x];
                if (!tileId) continue;
                if (Tilemap.isWaterTile(tileId)) return false;
                const flag = ts ? ts.flags[tileId] : 0;
                if ((flag & 0x10) !== 0) continue;
                if ((flag & 0x0f) === 0x0f) return false;
                break;
            }
        }
        for (const u of W.units()) if (u.id !== ignoreUnitId && sameArea(recordArea(u), area) && u.x === x && u.y === y) return false;
        return true;
    }

    const W0 = World();
    if (W0 && typeof W0.cellFree === "function" && !W0._ufDoorsCellFreeAliased) {
        const original = W0.cellFree;
        W0.cellFree = function(ax, ay, x, y, ignoreUnitId = 0, z = 0) {
            if (!supported({ x: ax, y: ay, z })) return false;
            const d = doorAt({ x: ax, y: ay, z }, x, y);
            if (!d) return original.call(this, ax, ay, x, y, ignoreUnitId, z);
            const unit = ignoreUnitId ? this.unit(ignoreUnitId) : null;
            if (!unit || !canUnitPass(unit, d)) return false;
            const ok = groundFreeIgnoringDoor(ax, ay, x, y, ignoreUnitId, z);
            if (ok) openDoor(d);
            return ok;
        };
        W0._ufDoorsCellFreeAliased = true;
    }

    function isWater(area, x, y) {
        if (!supported(area)) return true;
        if (zOf(area) === 0 && window.UF && UF.Jobs && typeof UF.Jobs.isWaterAt === "function") return UF.Jobs.isWaterAt(area, x, y);
        const W = World(), tile = W ? W.getTile(area.x, area.y, x, y, 0, zOf(area)) : 0;
        return !!tile && Tilemap.isTileA1(tile);
    }
    function unitAt(area, x, y) {
        const W = World();
        return W ? W.units().find(u => sameArea(recordArea(u), area) && u.x === x && u.y === y) || null : null;
    }
    function cultureForFaction(id) {
        const F = window.UF && UF.Factions, cat = catalog();
        const f = F && typeof F.get === "function" ? F.get(id) : null;
        return cat && cat.cultures && f ? cat.cultures[f.species] : null;
    }
    function siteDoorId(site) {
        const c = cultureForFaction(site.faction);
        return c && c.door ? c.door : c && /stone/.test(c.wall || "") ? "door_stone" : "door_wood";
    }
    function perimeter(r) {
        const out = [];
        for (let dx = -r; dx < r; dx++) out.push([dx, -r]);
        for (let dy = -r; dy < r; dy++) out.push([r, dy]);
        for (let dx = r; dx > -r; dx--) out.push([dx, r]);
        for (let dy = r; dy > -r; dy--) out.push([-r, dy]);
        return out;
    }
    function placeAt(site, x, y, id) {
        const O = Objects(), area = recordArea(site);
        if (!supported(area) || !O || !O.type(id) || isWater(area, x, y)) return false;
        const occupant = unitAt(area, x, y);
        if (occupant) {
            const W = World();
            const free = W && W.nearestFreeCell(area.x, area.y, site.x, site.y, Math.max(2, site.radius || 3), occupant.id, zOf(area));
            if (free && (free.x !== x || free.y !== y)) {
                // Generation may spawn a person on a planned entrance. Move
                // that unit to a free cell inside the same site before play
                // begins, then put the door in the vacated cell.
                if (W.stopUnit) W.stopUnit(occupant.id);
                occupant.x = free.x;
                occupant.y = free.y;
                const ev = W.eventOf && W.eventOf(occupant.id);
                if (ev && ev.locate) ev.locate(free.x, free.y);
            }
            if (!unitAt(area, x, y)) {
                const current = O.atIn(area, x, y);
                if (current && Array.isArray(current.tags) && current.tags.includes("wall")) return false;
                if (!O.setIn(area, x, y, id)) return false;
                ensureDoor(area, x, y, O.type(id), site.faction);
                return true;
            }
            const ds = store(), pending = ds.pending = ds.pending || [];
            if (!pending.some(p => sameArea(p.area, area) && p.x === x && p.y === y)) {
                pending.push({ siteId: site.id, area: copyArea(area), x, y, objectId: id, faction: site.faction });
            }
            // Ask the occupant to step into the settlement; the door is placed
            // by retryPending only after the cell is physically clear.
            if (free && (free.x !== x || free.y !== y)) W.sendUnit(occupant.id, { area: copyArea(area), x: free.x, y: free.y, z: zOf(area) });
            return false;
        }
        const current = O.atIn(area, x, y);
        if (current && Array.isArray(current.tags) && current.tags.includes("wall")) return false;
        if (!O.setIn(area, x, y, id)) return false;
        ensureDoor(area, x, y, O.type(id), site.faction);
        return true;
    }
    function retryPending() {
        const ds = store();
        if (!ds || !Array.isArray(ds.pending) || !ds.pending.length) return 0;
        let n = 0;
        for (let i = ds.pending.length - 1; i >= 0; i--) {
            const p = ds.pending[i];
            if (!supported(p.area)) continue;
            if (unitAt(p.area, p.x, p.y) || isWater(p.area, p.x, p.y)) continue;
            if (placeAt({ id: p.siteId, area: p.area, x: p.x, y: p.y, radius: 1, faction: p.faction }, p.x, p.y, p.objectId)) {
                ds.pending.splice(i, 1);
                n++;
            }
        }
        return n;
    }
    function placeSite(site) {
        if (!site || site.ruined || !site.faction || !supported(recordArea(site))) return 0;
        const H = window.UF && UF.History;
        const rich = H && H.sitesIn ? H.sitesIn(site.area.x, site.area.y, zOf(recordArea(site))).find(s => s.id === site.id && sameArea(recordArea(s), recordArea(site))) : null;
        if (!rich) return 0;
        const id = siteDoorId(rich), wallCells = new Set();
        for (const p of rich.pieces || []) {
            const t = Objects().type(p.object);
            if (t && Array.isArray(t.tags) && t.tags.includes("wall")) wallCells.add(`${p.dx},${p.dy}`);
        }
        let n = 0;
        if (rich.radius > 0 && wallCells.size) {
            for (const [dx, dy] of perimeter(rich.radius)) {
                if (!wallCells.has(`${dx},${dy}`) && placeAt(rich, rich.x + dx, rich.y + dy, id)) n++;
            }
        }
        for (const h of (rich.settled && rich.settled.houses) || []) {
            if (h.door && placeAt(rich, h.door[0], h.door[1], id)) n++;
        }
        return n;
    }
    function placeAll(force = false) {
        const ds = store(), H = window.UF && UF.History;
        if (!ds || !H || typeof H.sites !== "function") return 0;
        if (ds.generated && !force) return 0;
        let n = 0;
        for (const site of H.sites()) n += placeSite(site);
        ds.generated = true;
        ds.version = 1;
        retryPending();
        emit("doors:placed", n);
        return n;
    }

    function damage(key, amount) {
        const ds = store(), at = parseKey(key);
        if (!ds || !at || !supported(at.area) || !ds.byCell[key]) return null;
        const s = ds.byCell[key];
        s.hp = Math.max(0, s.hp - Math.max(0, Number(amount) || 0));
        if (s.hp > 0) { emit("doors:damaged", key, s.hp); return { broken: false, hp: s.hp }; }
        const O = Objects(), type = O && O.type(s.objectId), ruin = type && type.ruin ? type.ruin : "rubble";
        if (O) O.setIn(at.area, at.x, at.y, ruin);
        delete ds.byCell[key];
        if (window.UF && UF.History && typeof UF.History.addEvent === "function") {
            UF.History.addEvent({ type: "door_broken", text: "A door was broken.", area: at.area, x: at.x, y: at.y });
        }
        emit("doors:broken", key, ruin);
        return { broken: true, hp: 0, ruin };
    }
    const damageAt = (area, x, y, amount) => damage(cellKey(area, x, y), amount);

    function frameFor(type, open, bitmap) {
        if (!type || !bitmap || !bitmap.width || !bitmap.height) return null;
        const big = String(type.image || "").includes("$");
        const pw = bitmap.width / (big ? 3 : 12), ph = bitmap.height / (big ? 4 : 8);
        const ci = type.characterIndex | 0, bx = big ? 0 : (ci % 4) * 3 * pw, by = big ? 0 : Math.floor(ci / 4) * 4 * ph;
        return { x: bx + (open ? OPEN_PATTERN : CLOSED_PATTERN) * pw, y: by, w: pw, h: ph };
    }
    function syncSprites() {
        const O = Objects(), ds = store(), area = viewArea();
        if (!O || !area || !ds) return 0;
        let n = 0;
        for (const [key, s] of Object.entries(ds.byCell)) {
            const at = parseKey(key);
            if (!at || !sameArea(at.area, area)) continue;
            const type = O.atIn(area, at.x, at.y), sprite = O.spriteAt(at.x, at.y);
            if (!isDoorType(type) || !sprite || !sprite.bitmap) continue;
            const f = frameFor(type, isOpenState(s), sprite.bitmap);
            if (f) { sprite.setFrame(f.x, f.y, f.w, f.h); n++; }
        }
        return n;
    }
    const O0 = Objects();
    if (O0 && O0.Sprite_Layer && !O0.Sprite_Layer.prototype._ufDoorsAliased) {
        const p = O0.Sprite_Layer.prototype, original = p.update;
        p.update = function() { original.call(this); syncSprites(); };
        p._ufDoorsAliased = true;
    }

    function augmentOptions(base, x, y) {
        const area = viewArea(), list = Array.isArray(base) ? base.slice() : [];
        const d = area && doorAt(area, x, y);
        if (!d || list.some(o => o.id === "door:toggle")) return list;
        const opts = [
            { id: "door:toggle", label: isOpenState(d.state) ? "Close door" : "Open door", enabled: true, run: () => toggleHeld(area, x, y) },
            { id: "door:lock", label: "Lock door (keys come later)", enabled: false, run: () => null }
        ];
        const look = list.findIndex(o => o.id === "look");
        list.splice(look >= 0 ? look : list.length, 0, ...opts);
        return list;
    }
    let interactHooked = false;
    function hookInteract() {
        const I = window.UF && UF.Interact;
        if (!I || interactHooked) return;
        interactHooked = true;
        const baseOptions = I.optionsFor.bind(I), baseOpen = I.open.bind(I), baseRun = I.run.bind(I);
        I.optionsFor = (x, y) => augmentOptions(baseOptions(x, y), x, y);
        I.open = function(x, y, at) {
            const win = baseOpen(x, y, at);
            if (win) win.setOptions(augmentOptions(win.options(), x, y), win.header());
            return win;
        };
        I.run = function(opt) {
            const result = baseRun(opt);
            const win = I.menu && I.menu();
            const cell = win && win.cell && win.cell();
            if (result && result.submenu && win && cell) {
                result.submenu = augmentOptions(result.submenu, cell.x, cell.y);
                win.setOptions(result.submenu, result.header || "");
            }
            return result;
        };
    }

    let eventsHooked = false;
    const testingAnotherSuite = () => !!(window.UF && UF.Test && UF.Test.active && UF.Test.only !== "doors");
    function hookEvents() {
        if (eventsHooked || !window.UF || !UF.Events) return;
        eventsHooked = true;
        UF.Events.on("world:created", () => { if (!testingAnotherSuite()) placeAll(false); });
        UF.Events.on("world:areaBuilt", () => {
            if (!testingAnotherSuite() && store() && !store().generated) placeAll(false);
            syncSprites();
        });
        UF.Events.on("world:levelBuilt", syncSprites);
        const factionForCell = (area, x, y) => {
            const HH = window.UF && UF.Households;
            if (HH && typeof HH.all === "function") {
                for (const h of HH.all()) {
                    if (h.home && sameArea(h.area, area)) {
                        const blds = HH.structures ? HH.structures(h) : [h.home];
                        for (const b of blds) if (b.doors && b.doors.some(p => p.x === x && p.y === y)) return h.faction;
                    }
                }
            }
            const H = window.UF && UF.History;
            if (H && typeof H.sites === "function") {
                const sites = H.sites().filter(s => !s.ruined && s.faction && sameArea(recordArea(s), area));
                const near = sites.find(s => Math.hypot(s.x - x, s.y - y) <= Math.max(6, (s.radius || 4) + 4));
                if (near) return near.faction;
            }
            const Own = window.UF && UF.Ownership;
            if (Own && typeof Own.ownerOf === "function") {
                const claim = Own.ownerOf({ kind: "object", area, x, y, z: zOf(area) });
                if (claim && claim.kind === "faction" && claim.id) return claim.id;
            }
            return playerFactionId();
        };
        const objectChanged = (area, x, y, from, to) => {
            if (!supported(area)) return;
            const O = Objects(), type = O && O.type(to), ds = store(), key = cellKey(area, x, y);
            if (!ds) return;
            if (isDoorType(type)) ensureDoor(area, x, y, type, factionForCell(area, x, y));
            else if (ds.byCell[key] && from && O && isDoorType(O.type(from))) delete ds.byCell[key];
        };
        UF.Events.on("objects:changed", objectChanged);
        UF.Events.on("objects:levelChanged", objectChanged);
        if (window.UF.Time && UF.Time.every) UF.Time.every(30, retryPending);
    }

    const Doors = {
        OPEN_FRAMES, FRIENDLY_RELATION, CLOSED_PATTERN, OPEN_PATTERN,
        cellKey, parseKey, store, at: doorAt, stateAt, isDoorType, isOpen: (area, x, y) => isOpenState(stateAt(area, x, y)),
        canUnitPass, open: openDoor, toggleHeld, lock: lockDoor, unlock: unlockDoor,
        isLocked: (area, x, y) => { const s = stateAt(area, x, y); return !!(s && s.locked); },
        keyOf: (area, x, y) => { const s = stateAt(area, x, y); return s ? s.keyId : null; },
        placeAll, placeSite, retryPending, damage, damageAt, syncSprites, frameFor, augmentOptions, hookInteract
    };
    window.UF = window.UF || {};
    window.UF.Doors = Doors;
    hookEvents();

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        hookEvents();
        hookInteract();
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("doors", async t => {
            const W = World(), O = Objects(), cat = catalog(), area = W && W.currentArea();
            const doorTypes = [O && O.type("door_wood"), O && O.type("door_stone")];
            const cultures = Object.entries((cat && cat.cultures) || {}).filter(([id]) => id !== "about");
            t.check("catalog", doorTypes.every(isDoorType) && cultures.length >= 1 && cultures.every(([, c]) => c.door && O.type(c.door)),
                `${doorTypes.filter(Boolean).map(d => `${d.id}:${d.image}#${d.characterIndex}`).join(", ") || "no doors"}; ${cultures.filter(([, c]) => c.door).length}/${cultures.length} cultures choose a door`);
            if (!area || !doorTypes.every(Boolean)) {
                t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().join(" | ") || "none");
                return;
            }

            placeAll(true);
            if ((store().pending || []).length) {
                if (window.UF.Time) UF.Time.setLevel(3);
                try { await t.waitUntil(() => { retryPending(); return !(store().pending || []).length; }, 15000, "occupied gate cells to clear"); } catch (e) { /* the check below reports every remaining cell */ }
                if (window.UF.Time) UF.Time.setLevel(0);
            }
            const H = window.UF.History, living = H ? H.sites().filter(s => !s.ruined && s.faction) : [];
            const expected = [], bad = [];
            let restoreSynthetic = null;
            for (const site of living) {
                const rich = H.sitesIn(site.area.x, site.area.y).find(s => s.id === site.id);
                if (!rich) continue;
                const walls = new Set((rich.pieces || []).filter(p => { const q = O.type(p.object); return q && q.tags && q.tags.includes("wall"); }).map(p => `${p.dx},${p.dy}`));
                if (walls.size) for (const [dx, dy] of perimeter(rich.radius)) if (!walls.has(`${dx},${dy}`)) expected.push({ area: rich.area, x: rich.x + dx, y: rich.y + dy, site: rich, kind: "ring" });
                for (const h of (rich.settled && rich.settled.houses) || []) if (h.door) expected.push({ area: rich.area, x: h.door[0], y: h.door[1], site: rich, kind: "house" });
            }

            // V31 starts with camps and no historical sites.  Exercise the
            // same placement and passage code in a temporary walled room so
            // this suite stays meaningful before societies build real homes.
            if (!expected.length) {
                const wallId = O.type("wall_wood") ? "wall_wood" : (O.types().find(q => q.tags && q.tags.includes("wall")) || {}).id;
                const doorId = O.type("door_wood") ? "door_wood" : (doorTypes.find(Boolean) || {}).id;
                const size = W.state.size, units = W.units().filter(u => sameArea(u.area, area));
                let center = null;
                for (let r = 0; r <= 70 && !center; r++) for (let dy = -r; dy <= r && !center; dy++) for (let dx = -r; dx <= r; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                    const cx = Math.max(4, Math.min(size - 5, $gamePlayer.x + dx)), cy = Math.max(4, Math.min(size - 5, $gamePlayer.y + dy));
                    let ok = true;
                    for (let py = cy - 3; py <= cy + 3 && ok; py++) for (let px = cx - 3; px <= cx + 3; px++) {
                        if (isWater(area, px, py) || units.some(u => u.x === px && u.y === py)) { ok = false; break; }
                    }
                    if (ok) center = { x: cx, y: cy };
                }
                if (center && wallId && doorId) {
                    const saved = [];
                    for (let y = center.y - 3; y <= center.y + 3; y++) for (let x = center.x - 3; x <= center.x + 3; x++) {
                        saved.push({ x, y, id: O.typeIdIn(area, x, y) });
                        O.setIn(area, x, y, null);
                    }
                    for (const [dx, dy] of perimeter(2)) O.setIn(area, center.x + dx, center.y + dy, wallId);
                    const faction = playerFactionId(), site = { id: "TEST_door_site", area: copyArea(area), x: center.x, y: center.y, radius: 2, faction };
                    const x = center.x, y = center.y - 2;
                    O.setIn(area, x, y, null);
                    if (placeAt(site, x, y, doorId)) expected.push({ area: copyArea(area), x, y, site, kind: "ring", synthetic: true });
                    restoreSynthetic = () => { for (const c of saved) O.setIn(area, c.x, c.y, c.id || null); };
                }
            }
            for (const e of expected) {
                const d = doorAt(e.area, e.x, e.y);
                if (!d || isWater(e.area, e.x, e.y) || unitAt(e.area, e.x, e.y)) bad.push(`${e.site.id}@${e.x},${e.y}`);
            }
            t.check("placed_in_gaps", expected.length > 0 && bad.length === 0,
                `${expected.length} ring/house opening cells checked; ${bad.length} missing, wet, or occupied${bad.length ? ` (${bad[0]})` : ""}`);

            const home = H && H.homeSite ? H.homeSite() : living[0], doorCell = expected.find(e => home && e.site.id === home.id) || expected[0];
            const player = playerFactionId(), factions = window.UF.Factions, others = factions ? factions.all().filter(f => f.id !== player) : [];
            const mk = (name, faction, kind) => ({ id: -1, name, data: { faction, kind: kind || "person" } });
            const friendly = mk("TEST_friend", doorCell && doorCell.site.faction), ally = mk("TEST_ally", others[0] && others[0].id), animal = mk("TEST_animal", null, "creature"), stranger = mk("TEST_stranger", others[1] && others[1].id || (others[0] && others[0].id));
            let oldAlly = null, oldStranger = null;
            if (factions && doorCell && ally.data.faction) { oldAlly = factions.relation(ally.data.faction, doorCell.site.faction); factions.setRelation(ally.data.faction, doorCell.site.faction, 30, "TEST"); }
            if (factions && doorCell && stranger.data.faction) { oldStranger = factions.relation(stranger.data.faction, doorCell.site.faction); factions.setRelation(stranger.data.faction, doorCell.site.faction, -30, "TEST"); }
            const d0 = doorCell && doorAt(doorCell.area, doorCell.x, doorCell.y);
            const directFriendly = !!d0 && canUnitPass(friendly, d0);
            const directAlly = !!d0 && !!ally.data.faction && canUnitPass(ally, d0);
            const directAnimalBlock = !!d0 && !canUnitPass(animal, d0);
            const directStrangerBlock = !!d0 && !canUnitPass(stranger, d0);
            let friendlyWalk = false, playerPasses = false, allyWalk = false, animalStayed = false, strangerStayed = false, openOk = false;

            // Use a real ring doorway with one clear cell on each side.  These
            // actors exercise Game_CharacterBase passage and world pathing;
            // the screenshots therefore show the behavior the checks report.
            const fixture = expected.filter(e => e.kind === "ring" && sameArea(e.area, area)).map(e => {
                const dx = e.x - e.site.x, dy = e.y - e.site.y;
                const step = Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
                return { door: e, outer: { x: e.x + step.x, y: e.y + step.y }, inner: { x: e.x - step.x, y: e.y - step.y } };
            }).find(f => W.cellFree(area.x, area.y, f.outer.x, f.outer.y) && W.cellFree(area.x, area.y, f.inner.x, f.inner.y));
            const closeFixture = s => { if (s) { s.state.heldOpen = false; s.state.openUntil = now(); syncSprites(); } };
            const walkTo = async (u, pos, timeout, label) => {
                W.sendUnit(u.id, { area, x: pos.x, y: pos.y });
                await t.waitUntil(() => !u.goal, timeout, label).catch(() => {});
                return !u.goal && u.x === pos.x && u.y === pos.y;
            };

            if (fixture) {
                const dc = fixture.door, s = doorAt(area, dc.x, dc.y);
                $gamePlayer.locate(dc.x + 3, dc.y + 3);
                closeFixture(s);

                const pd = dc.x > fixture.outer.x ? 6 : dc.x < fixture.outer.x ? 4 : dc.y > fixture.outer.y ? 2 : 8;
                $gamePlayer.locate(fixture.outer.x, fixture.outer.y);
                playerPasses = $gamePlayer.isMapPassable(fixture.outer.x, fixture.outer.y, pd);
                $gamePlayer.locate(dc.x + 3, dc.y + 3);
                closeFixture(s);

                const hare = cat && cat.wildlife && (cat.wildlife.species || []).find(q => q.id === "hare");
                const testAnimal = W.addUnit({ name: "TEST_door_hare", image: { characterName: hare && hare.image || "$UF_Stock_Nature_0", characterIndex: hare && hare.characterIndex || 0 }, area, x: fixture.outer.x, y: fixture.outer.y, data: { kind: "creature" } });
                W.sendUnit(testAnimal.id, { area, x: dc.x, y: dc.y });
                await t.waitUntil(() => !testAnimal.goal, 8000, "animal to be refused by the closed door").catch(() => {});
                animalStayed = !(testAnimal.x === dc.x && testAnimal.y === dc.y) && !(testAnimal.x === fixture.inner.x && testAnimal.y === fixture.inner.y);
                await t.waitFrames(2);
                t.screenshot("closed_animal_outside");
                W.removeUnit(testAnimal.id);

                closeFixture(s);
                const testStranger = W.addUnit({ name: "TEST_door_stranger", image: { characterName: "People1", characterIndex: 3 }, area, x: fixture.outer.x, y: fixture.outer.y, data: { kind: "person", faction: stranger.data.faction } });
                W.sendUnit(testStranger.id, { area, x: dc.x, y: dc.y });
                await t.waitUntil(() => !testStranger.goal, 8000, "stranger to be refused by the closed door").catch(() => {});
                strangerStayed = !(testStranger.x === dc.x && testStranger.y === dc.y) && !(testStranger.x === fixture.inner.x && testStranger.y === fixture.inner.y);
                W.removeUnit(testStranger.id);

                closeFixture(s);
                const testFriend = W.addUnit({ name: "TEST_door_friend", image: { characterName: "People1", characterIndex: 0 }, area, x: fixture.outer.x, y: fixture.outer.y, data: { kind: "person", faction: dc.site.faction } });
                const reachedDoor = await walkTo(testFriend, { x: dc.x, y: dc.y }, 8000, "friendly unit to enter the doorway");
                await t.waitFrames(1);
                const sprite = O.spriteAt(dc.x, dc.y), f = s && sprite ? frameFor(s.type, true, sprite.bitmap) : null;
                openOk = reachedDoor && !!s && isOpenState(s.state) && !!sprite && !!f && Math.abs(sprite._frame.x - f.x) < 0.1;
                t.screenshot("open_colonist_passing");
                friendlyWalk = reachedDoor && await walkTo(testFriend, fixture.inner, 8000, "friendly unit to pass through the door");
                W.removeUnit(testFriend.id);

                closeFixture(s);
                const testAlly = W.addUnit({ name: "TEST_door_ally", image: { characterName: "People1", characterIndex: 1 }, area, x: fixture.outer.x, y: fixture.outer.y, data: { kind: "person", faction: ally.data.faction } });
                allyWalk = await walkTo(testAlly, fixture.inner, 8000, "allied unit to pass through the door");
                W.removeUnit(testAlly.id);
                closeFixture(s);
            }

            t.check("faction_passes", directFriendly && friendlyWalk && playerPasses, d0 ? `${friendly.data.faction} was admitted by owner ${d0.state.faction}; unit ${friendlyWalk ? "reached the inner cell" : "did not cross"}; player view ${playerPasses ? "can cross" : "blocked"}` : "no placed door");
            t.check("ally_passes", directAlly && allyWalk, d0 ? `relation ${ally.data.faction ? factions.relation(ally.data.faction, d0.state.faction) : "n/a"}; movement ${allyWalk ? "reached the inner cell" : "did not cross"}` : "no placed door");
            t.check("animal_blocked", directAnimalBlock && animalStayed, animalStayed ? "the unfactioned hare remained outside" : "the animal moved or no fixture was available");
            t.check("stranger_blocked", directStrangerBlock && strangerStayed, strangerStayed ? "the hostile stranger remained outside" : "the stranger moved or no fixture was available");
            t.check("open_frame", openOk, openOk ? "the friendly unit opened the door and the sprite used its open frame" : "door sprite/frame or real movement did not match");
            if (factions && ally.data.faction && oldAlly !== null) factions.setRelation(ally.data.faction, d0.state.faction, oldAlly, "TEST restore");
            if (factions && stranger.data.faction && oldStranger !== null) factions.setRelation(stranger.data.faction, d0.state.faction, oldStranger, "TEST restore");

            hookInteract();
            const build = window.UF.Interact ? UF.Interact.buildOptions({ area, x: $gamePlayer.x, y: $gamePlayer.y }) : [];
            const wood = build.find(o => o.objectId === "door_wood");
            t.check("player_can_build", !!wood && /Wooden door/.test(wood.label) && /1 log/.test(wood.label), wood ? wood.label : "wooden door missing from Build submenu");

            let damageOk = false;
            if (doorCell) {
                const test = doorAt(doorCell.area, doorCell.x, doorCell.y);
                if (test) {
                    const result = damage(test.key, test.state.hp);
                    damageOk = !!result && result.broken && O.atIn(doorCell.area, doorCell.x, doorCell.y).id === (test.type.ruin || "rubble");
                }
            }
            t.check("damage_breaks", damageOk, damageOk ? "hp reached 0 and the door became rubble" : "door did not become its ruin");

            if (restoreSynthetic) restoreSynthetic();

            const before = JSON.stringify(store()), round = JsonEx.parse(JsonEx.stringify(W.state));
            const seededA = Object.keys(store().byCell).sort().join("|"), seededB = Object.keys(store().byCell).sort().join("|");
            t.check("saved_and_seeded", JSON.stringify(round.doors) === before && seededA === seededB,
                `${Object.keys(store().byCell).length} door states round-tripped; deterministic sorted key list ${seededA === seededB ? "matches" : "differs"}`);

            const probe = d0 || Object.values(store().byCell)[0], loops = 10000, p0 = performance.now();
            for (let i = 0; i < loops; i++) canUnitPass(friendly, probe && probe.state ? probe : { state: probe });
            const ms = performance.now() - p0, avg = ms / loops;
            t.check("perf", avg <= 0.005, `${loops} faction checks in ${ms.toFixed(3)} ms = ${avg.toFixed(6)} ms/call (budget 0.005)`);
            t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().join(" | ") || "none");
        }, { isDefault: false });
    }
})();
