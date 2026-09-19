"use strict";
// Executable contract checks, not an RMMZ rendering/integration test.
// --mutate-room-key drops z from cache identity and must exit nonzero.
const fs = require("fs"), path = require("path"), vm = require("vm");
let source = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_Floors.js"), "utf8");
if (process.argv.includes("--mutate-room-key")) {
    const from = 'const areaKey = a => zOf(a) === 0 ? `${a.x},${a.y}` : `${a.x},${a.y},${zOf(a)}`;';
    if (!source.includes(from)) throw new Error("mutation target not found");
    source = source.replace(from, 'const areaKey = a => `${a.x},${a.y}`;');
}
let passed = 0, failed = 0;
function check(name, fn) {
    try { if (!fn()) throw new Error("condition false"); passed++; console.log(`PASS z_floors.${name}`); }
    catch (err) { failed++; console.log(`FAIL z_floors.${name}: ${err.message}`); }
}
function setup(levels) {
    const events = new Map(), objects = new Map(), tiles = new Map(), cells = new Map();
    const jobs = {}, writes = [], calls = { consumed: 0, picked: 0 }, ground = { x: 0, y: 0 }, lower = { x: 0, y: 0, z: -1 };
    let view = ground;
    const key = (a, x, y) => `${a.z || 0}:${x},${y}`;
    const dirt = { id: "dirt", passable: true }, plank = { id: "floor_wood", passable: true };
    const W = {
        state: { size: 16 }, inWorld: (x, y, z = 0) => x === 0 && y === 0 && z >= -2 && z <= 2,
        currentArea: () => view.z ? null : ground,
        getTile: (ax, ay, x, y, layer, z = 0) => tiles.get(`${z}:${x},${y}`) || 100,
        setTile(ax, ay, x, y, layer, tile, z = 0) { writes.push({ x, y, tile, z }); tiles.set(`${z}:${x},${y}`, tile); }
    };
    if (levels) { W.viewLevel = () => view; W.levelOfMapId = () => view; }
    const ctx = {
        console, Scene_Boot: function() {}, Tilemap: { isTileA1: () => false },
        DataManager: { extractSaveContents(c) { W.state = c.world; return "loaded"; } },
        UF: {
            World: W,
            Events: {
                on(name, fn) { if (!events.has(name)) events.set(name, []); events.get(name).push(fn); },
                emit(name, ...args) { for (const fn of events.get(name) || []) fn(...args); }
            },
            Objects: { atIn: (a, x, y) => objects.get(key(a, x, y)) || null, at: () => null },
            Tiles: { kindOfTile: tile => tile >= 200 ? plank : dirt, groundBase: id => id === "floor_wood" ? 200 : id === "dirt" ? 100 : null },
            Jobs: { define(id, spec) { jobs[id] = spec; }, isWaterAt: () => false, standFor: target => target, list: () => [] },
            Items: {
                type: () => ({}), count: () => 1, find: () => [],
                atIn: () => [{ id: 1, type: "log" }],
                consume(id, n) { calls.consumed += n; return n; },
                consumeFrom(id, type, n) { calls.consumed += n; return n; },
                pickUp() { calls.picked++; return true; }
            },
            Levels: { standableShape: ref => (cells.get(key(ref.area, ref.x, ref.y)) || {}).shape !== "solid",
                cellAt: ref => cells.get(key(ref.area, ref.x, ref.y)) || { shape: "floor", constructed: false } }
        }
    };
    ctx.Scene_Boot.prototype.start = function() {};
    ctx.window = ctx;
    vm.runInNewContext(source, ctx, { filename: "UF_Floors.js" });
    function room(a) {
        for (let y = 3; y <= 7; y++) for (let x = 3; x <= 7; x++) {
            if (x === 3 || y === 3 || x === 7 || y === 7) objects.set(key(a, x, y), { tags: ["wall"], passable: false });
        }
    }
    function job(z) { return { target: { area: ground, x: 5, y: 5, z }, params: { kind: "floor_wood", item: "log", count: 1, ready: true, force: true } }; }
    return { ctx, W, writes, calls, objects, tiles, cells, ground, lower, key, jobs, room, job,
        F: ctx.UF.Floors, R: ctx.UF.Rooms, E: ctx.UF.Events, setView(a) { view = a; } };
}
const old = setup(false);
check("legacy_ground_read_write", () => old.F.canLay(old.ground, 5, 5, true).ok && old.F.setFloor(old.ground, 5, 5, "floor_wood") && old.F.kindAt(old.ground, 5, 5).id === "floor_wood");
check("legacy_refuses_other_levels_without_writes", () => {
    const before = old.writes.length;
    return [-2, -1, 1, 2, 3, -3, 0.5, "0", NaN].every(z => {
        const a = { x: 0, y: 0, z };
        return !old.F.canLay(a, 5, 5, true).ok && !old.F.setGround(a, 5, 5, "dirt") && !old.F.removeFloor(a, 5, 5) && old.R.roomAt(a, 5, 5) === null;
    }) && old.writes.length === before;
});
const s = setup(true);
s.room(s.ground); s.room(s.lower);
let surfaceRoom, lowerRoom;
check("ground_key_unchanged", () => { surfaceRoom = s.R.roomAt(s.ground, 5, 5); return surfaceRoom && surfaceRoom.id === "room:0,0:4,4:9"; });
check("same_xy_rooms_are_distinct", () => {
    lowerRoom = s.R.roomAt(s.lower, 5, 5);
    return lowerRoom && lowerRoom !== surfaceRoom && lowerRoom.area.z === -1 && lowerRoom.id === "room:0,0,-1:4,4:9";
});
check("non_ground_kind_does_not_decode_surface_tiles", () => s.F.kindAt(s.lower, 5, 5) === null);
check("structural_floor_reads_shape", () => {
    s.cells.set(s.key(s.lower, 5, 5), { shape: "floor", constructed: true });
    return s.R.value(lowerRoom) === 1 / 9 && s.R.value(surfaceRoom) === 0;
});
check("level_object_change_invalidates_only_that_room", () => {
    s.objects.delete(s.key(s.lower, 3, 3)); s.objects.delete(s.key(s.lower, 3, 4));
    s.E.emit("objects:levelChanged", s.lower, 3, 4, "wall", "");
    return s.R.roomAt(s.lower, 5, 5) === null && s.R.roomAt(s.ground, 5, 5) === surfaceRoom;
});
check("level_shape_change_invalidates_room", () => {
    s.room(s.lower); s.E.emit("objects:levelChanged", s.lower);
    const before = s.R.roomAt(s.lower, 5, 5);
    s.cells.set(s.key(s.lower, 5, 5), { shape: "solid" });
    s.E.emit("levels:shapeChanged", { area: s.ground, z: -1, x: 5, y: 5 });
    return before && s.R.roomAt(s.lower, 5, 5) === null;
});
check("surface_tile_change_invalidates_room", () => {
    const before = s.R.roomAt(s.ground, 5, 5); s.E.emit("world:tileChanged", s.ground, 5, 5, 0, 100);
    return before && s.R.roomAt(s.ground, 5, 5) !== before;
});
check("upper_floor_refused_before_consumption_or_pickup", () => {
    const before = s.writes.length;
    for (const z of [-2, -1, 1, 2]) for (const ready of [false, true]) {
        const job = s.job(z); job.params.ready = ready; job.params.fetchItemId = 1;
        const u = { id: 1, area: s.ground, x: 5, y: 5, z };
        if (s.jobs.floor.plan(job, u).ok) return false;
        const outcome = s.jobs.floor.apply(job, u);
        if (outcome !== "continue") return false;
        if (!job.reason || job.result) return false;
    }
    return s.writes.length === before && s.calls.consumed === 0 && s.calls.picked === 0;
});
check("cross_level_worker_refused", () => {
    const job = s.job(0), u = { id: 1, area: s.ground, x: 5, y: 5, z: -1 };
    const plan = s.jobs.floor.plan(job, u); s.jobs.floor.apply(job, u);
    return !plan.ok && !job.result && s.calls.consumed === 0;
});
check("invalid_kind_replans_then_refuses", () => {
    const job = s.job(0), u = { id: 1, area: s.ground, x: 5, y: 5, z: 0 };
    job.params.kind = "not_a_floor";
    return s.jobs.floor.apply(job, u) === "continue" && !s.jobs.floor.plan(job, u).ok && s.calls.consumed === 0;
});
check("non_ground_site_does_not_autofloor_ground", () => {
    const before = s.writes.length;
    s.ctx.$ufWorldCatalog = { cultures: { human: { floor: { kind: "floor_wood", item: "log", count: 1 } } } };
    s.ctx.UF.History = { sites: () => [{ id: 1, faction: 2, kind: "town", area: s.ground, z: -1, settled: { houses: [{ x: 3, y: 3, w: 5, h: 5 }] } }] };
    s.ctx.UF.Factions = { player: () => ({ id: 1 }), get: () => ({ species: "human" }) };
    return s.F.floorOtherSites() === 0 && s.writes.length === before;
});
check("non_ground_site_does_not_designate_ground_rooms", () => {
    s.ctx.UF.Colonists = { culture: () => ({ floor: { kind: "floor_wood", item: "log", count: 1 } }),
        site: () => ({ id: 1, area: s.ground, z: -1, x: 5, y: 5, radius: 3, settled: { houses: [{ x: 3, y: 3, w: 5, h: 5 }] } }) };
    return s.F.createDesignations().length === 0;
});
check("ground_job_continues_when_view_is_elsewhere", () => {
    s.setView(s.lower);
    const job = s.job(0), u = { id: 1, area: s.ground, x: 5, y: 5, z: 0 };
    const plan = s.jobs.floor.plan(job, u); s.jobs.floor.apply(job, u);
    return plan.ok && job.result && s.calls.consumed === 1 && s.F.kindAt(s.ground, 5, 5).id === "floor_wood";
});
check("other_level_menu_no_ground_actions", () => s.F.augmentOptions([], 5, 5).length === 0);
check("save_restore_invalidates_cache_preserves_floor_state", () => {
    const before = s.R.roomAt(s.ground, 5, 5), json = JSON.stringify({ world: s.W.state });
    const result = s.ctx.DataManager.extractSaveContents(JSON.parse(json));
    return result === "loaded" && s.W.state.floors.laid === 1 && s.R.roomAt(s.ground, 5, 5) !== before;
});
check("new_world_invalidates_cached_rooms", () => {
    s.ctx.UF.Test = { active: true, only: "z_floors" };
    const before = s.R.roomAt(s.ground, 5, 5); s.E.emit("world:created");
    return before && s.R.roomAt(s.ground, 5, 5) !== before;
});
console.log(`RESULT: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
