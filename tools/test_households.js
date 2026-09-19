"use strict";
// Real plugin, small engine-double fixture. This is not an RMMZ visual test.
const fs = require("fs"), vm = require("vm"), path = require("path");
let source = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_Households.js"), "utf8");
if (process.argv.includes("--mutate-z")) source = source.replace("&& zOf(a) === zOf(b)", "");
if (process.argv.includes("--mutate-enclosure")) source = source.replace("return !!p && p.walls.every", "return !!p || p.walls.every");
let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) { passed++; console.log(`PASS households.${name}${detail ? " - " + detail : ""}`); }
    else { failed++; console.log(`FAIL households.${name}${detail ? " - " + detail : ""}`); }
}
function fixture() {
    const objects = new Map(), claims = new Map(), doors = new Map(), blocked = new Set(), events = {};
    const types = Object.fromEntries([
        ["wall_wood", ["building", "wall"], false], ["door_wood", ["building", "door"], false],
        ["floor_straw", ["building", "bed"], true], ["campfire", ["building", "fire"], false],
        ["stockpile", ["building", "stockpile"], true], ["oak", ["wood"], false]
    ].map(([id, tags, passable]) => [id, { id, tags, passable, build: { items: { log: 1 } } }]));
    const k = (a, x, y) => `${a.x},${a.y},${a.z || 0}:${x},${y}`;
    const refKey = r => k({ x: r.area.x, y: r.area.y, z: r.z === undefined ? r.area.z : r.z }, r.x, r.y);
    const st = { size: 128, units: {}, colony: {} };
    const contexts = {};
    const World = { state: st, unit: id => st.units[id] || null, units: () => Object.values(st.units),
        walkable: (ax, ay, x, y, opts) => !blocked.has(k({ x: ax, y: ay, z: opts.z }, x, y)),
        reachable: () => true };
    const Events = { on: (name, fn) => (events[name] || (events[name] = [])).push(fn),
        emit: (name, ...args) => (events[name] || []).forEach(fn => fn(...args)) };
    let assignments = 0;
    const Ownership = { ownerOf: r => claims.get(refKey(r)) || null, bedOf: u => u.data.bed || null,
        assignBed: (u, r) => {
            const old = claims.get(refKey(r));
            if (old && (old.kind !== "unit" || old.id !== u.id)) return null;
            assignments++; claims.set(refKey(r), { kind: "unit", id: u.id }); u.data.bed = { ...r }; return r;
        } };
    const Doors = { stateAt: (a, x, y) => {
        const kk = k(a, x, y);
        if (!doors.has(kk)) doors.set(kk, { faction: 999, heldOpen: false });
        return doors.get(kk);
    }, at: (a, x, y) => ({ state: Doors.stateAt(a, x, y) }), isOpen: (a, x, y) => !!Doors.stateAt(a, x, y).open,
        canUnitPass: (u, d) => d.state.faction === u.data.faction && !d.state.locked };
    const sandbox = { console, Scene_Boot: function() {}, DataManager: { extractSaveContents: () => {} },
        $ufTime: { year: 1, monthIndex: 0, day: 1 }, UF: { World, Events, Ownership, Doors, Time: { ticks: () => 100 },
            Objects: { type: id => types[id], atIn: (a, x, y) => objects.get(k(a, x, y)) || null },
            Jobs: { isWaterAt: () => false },
            Colonists: { state: u => contexts[u && u.data.site], culture: () => ({ wall: "wall_wood", door: "door_wood" }) } } };
    sandbox.Scene_Boot.prototype.start = () => {};
    sandbox.window = sandbox;
    vm.createContext(sandbox); vm.runInContext(source, sandbox); new sandbox.Scene_Boot().start();
    function add(id, opts = {}) {
        const z = opts.z || 0, site = opts.site || `site${z}`, faction = opts.faction || 1;
        contexts[site] = contexts[site] || { siteId: site, factionId: faction, area: { x: 0, y: 0 }, z, site: { x: 64, y: 64 },
            plan: [{ build: "campfire", cells: [[0, 0]] }, { build: "wall_wood", cells: [[-2, 2], [2, 2]] }] };
        const u = { id, name: `TEST_${id}`, area: { x: 0, y: 0 }, z, x: 63 + id % 3, y: 63,
            data: { kind: "person", ai: "settlement", site, faction, species: "human", age: 25,
                home: { area: { x: 0, y: 0 }, z, x: 64, y: 64 }, ...opts.data } };
        st.units[id] = u; return u;
    }
    const H = sandbox.UF.Households;
    function complete(h, steps) {
        const c = contexts[h.siteId];
        for (const s of steps) for (const [dx, dy] of s.cells) objects.set(k({ ...h.area, z: h.z }, c.site.x + dx, c.site.y + dy), types[s.build]);
        H.reconcile();
    }
    return { H, add, st, contexts, objects, claims, doors, blocked, Events, sandbox, k, refKey, types, complete, World, assignments: () => assignments };
}
{
    const f = fixture(), a = f.add(1), b = f.add(2), h = f.H;
    h.reconcile();
    check("unrelated_founders_stay_single", h.of(a).id !== h.of(b).id && h.all().length === 2);
    const before = h.of(a).id; h.reconcile();
    check("ids_stable", h.of(a).id === before && h.all().length === 2);
    check("timestamp_uses_time_api", h.of(a).foundedTick === 100);
    const pair = h.formPair(a, b);
    check("explicit_adult_pair", !!pair && h.of(a) === h.of(b) && a.data.partner === b.id && b.data.partner === a.id);
    const child = f.add(3, { data: { age: 0, motherId: a.id, fatherId: b.id } });
    f.Events.emit("colonists:born", child, a, b);
    check("birth_joins_mother", h.of(child) === h.of(a) && h.members(pair).length === 3);
    check("genealogy_true_generation", h.state().people[3].generation === 1 && h.state().people[3].fatherId === 2 && pair.generation === 1);
    const text = JSON.stringify(f.st.households); f.st.households = JSON.parse(text); h.reconcile();
    check("save_roundtrip", h.of(a).id === pair.id && h.state().people[3].motherId === 1 && h.members(h.of(a)).length === 3);
    delete f.st.units[3]; f.Events.emit("world:unitRemoved", child);
    check("missing_is_not_deceased", h.state().people[3].deceased !== true);
    b.data.dead = true; f.Events.emit("combat:kill", { target: b }); delete f.st.units[2]; f.Events.emit("world:unitRemoved", b);
    check("actual_death_retained", h.state().people[2].deceased === true && h.state().people[2].name === "TEST_2");
}
{
    const f = fixture(), a = f.add(1), b = f.add(2, { data: { age: 17 } });
    check("minor_pair_refused", f.H.formPair(a, b) === null);
    b.data.age = 25; b.data.familyDesire = false;
    check("unwilling_pair_refused", f.H.formPair(a, b) === null);
    b.data.familyDesire = true; b.data.species = "dwarf";
    check("different_species_refused", f.H.formPair(a, b) === null);
    a.data.species = b.data.species = "undead";
    check("nonbreeding_refused", f.H.formPair(a, b) === null);
    a.data.species = b.data.species = "human"; b.data.motherId = a.id;
    check("parent_pair_refused", f.H.formPair(a, b) === null);
    delete b.data.motherId; a.data.motherId = 90; b.data.motherId = 91;
    f.H.state().people[90] = { id: 90, motherId: 99 }; f.H.state().people[91] = { id: 91, motherId: 99 };
    check("cousin_pair_refused", f.H.formPair(a, b) === null);
}
{
    const f = fixture(), a = f.add(1, { z: -1, site: "shared" }), b = f.add(2, { z: -2, site: "shared" });
    // Explicit home contexts retain each record's physical level; temporarily
    // remove the shared site lookup to exercise actual same-coordinate layers.
    delete f.contexts.shared;
    f.H.reconcile();
    check("different_levels_not_joined", f.H.formPair(a, b) === null && f.H.of(a).id !== f.H.of(b).id);
}
{
    const f = fixture(), a = f.add(1), b = f.add(2), h = f.H.formPair(a, b);
    const steps = f.H.planSteps(a), home = h.home;
    steps[0].done = [1]; steps[0].celebrated = true;
    const stable = f.H.planSteps(a);
    check("plan_progress_persists", stable[0] === steps[0] && stable[0].celebrated && stable[0].done[0] === 1);
    check("two_rooms_exact_build_steps", steps.length === 5 && steps.every(s => s.exact && s.household === h.id) && home.doors.length === 2 && home.sleeping.length === 10);
    check("planning_never_stamps", f.objects.size === 0 && f.H.demands(h).beds === 2 && !f.H.describe(h).complete);
    check("unfinished_privacy_refused", f.H.roomForPair(a, b) === null);
    f.complete(h, steps);
    check("real_objects_meet_supported_demand", f.H.describe(h).complete && f.H.demands(h).bedrooms === 0 && f.H.demands(h).beds === 0);
    check("beds_assigned_to_residents", home.beds.filter(c => c.unitId).every(c => f.claims.get(f.refKey({ area: h.area, z: h.z, x: c.x, y: c.y })).id === c.unitId));
    const assignments = f.assignments(); f.H.planSteps(a); f.H.reconcile();
    check("stable_beds_do_not_emit_assignments", f.assignments() === assignments);
    check("npc_door_faction", home.doors.every(p => f.doors.get(f.k({ ...h.area, z: h.z }, p.x, p.y)).faction === h.faction));
    const room = f.H.roomForPair(a, b);
    check("actual_private_room", !!room && room.householdId === h.id && room.spots.length === 2 && Math.abs(room.spots[0].x - room.spots[1].x) === 1);
    const ds = f.doors.get(f.k({ ...h.area, z: h.z }, home.doors[1].x, home.doors[1].y)); ds.open = true;
    check("temporarily_open_door_delays_privacy", f.H.roomForPair(a, b) === null); ds.open = false;
    const kid = f.add(3, { data: { age: 1, motherId: 1, fatherId: 2 } }); kid.x = home.x + 2; kid.y = home.y + 1;
    check("child_bystander_blocks_privacy", f.H.roomForPair(a, b) === null);
    kid.x = 65; kid.y = 65; f.H.reconcile();
    check("new_child_adds_bed_demand", f.H.demands(h).beds === 1 && !f.H.describe(h).complete);
    f.complete(h, f.H.planSteps(a));
    const wall = home.walls[0]; f.objects.delete(f.k({ ...h.area, z: h.z }, wall.x, wall.y));
    check("missing_wall_reopens_demand", f.H.demands(h).bedrooms === 1 && f.H.roomForPair(a, b) === null);
    const one = f.add(4), singletonSteps = f.H.planSteps(one), other = f.H.of(one).home;
    check("homes_do_not_overlap", singletonSteps.length > 0 && (other.x > home.x + 7 || other.x + 7 < home.x || other.y > home.y + 7 || other.y + 7 < home.y));
    for (const id of [5, 6]) f.add(id, { data: { age: 1, motherId: 1, fatherId: 2 } }); f.H.reconcile();
    check("overflow_explicit", f.H.demands(h).overflow === 1 && f.H.demands(h).beds >= 2 && !f.H.describe(h).complete);
}
{
    const f = fixture(), a = f.add(1, { z: -1 }), h = (f.H.reconcile(), f.H.of(a));
    f.World.walkable = () => false;
    check("solid_underground_not_stamped", f.H.planSteps(a).length === 0 && !h.home && /No dry accessible/.test(h.reason) && f.objects.size === 0);
    f.World.walkable = () => true;
    check("bounded_retry_once_per_day", f.H.planSteps(a).length === 0);
    f.sandbox.$ufTime.monthIndex++;
    check("retry_same_day_next_month", f.H.planSteps(a).length === 5 && h.home && h.z === -1);
    const b = h.home.beds[0], br = { area: h.area, z: h.z, x: b.x, y: b.y };
    f.claims.set(f.refKey(br), { kind: "unit", id: 999 }); f.complete(h, f.H.planSteps(a));
    check("bed_claim_never_stolen", f.claims.get(f.refKey(br)).id === 999 && !a.data.bed && f.H.demands(h).beds === 1);
}
{
    const f = fixture(), a = f.add(1, { data: { species: "goblin" } });
    f.types.rubble_pillar = { id: "rubble_pillar", tags: ["ruin", "stone"], passable: false };
    f.sandbox.UF.Colonists.culture = () => ({ wall: "rubble_pillar", laterWall: "wall_wood", door: "door_wood" });
    const steps = f.H.planSteps(a);
    check("goblin_uses_existing_cultural_fallback", steps.length === 5 && steps[0].build === "wall_wood" && f.H.of(a).home.wall === "wall_wood");
    const g = fixture(), b = g.add(1, { data: { species: "goblin" } });
    g.sandbox.UF.Colonists.culture = () => ({ wall: "rubble_pillar", laterWall: "missing_wall", door: "door_wood" });
    check("missing_cultural_recipe_stays_blocked", g.H.planSteps(b).length === 0 && !g.H.of(b).home && /definitions unavailable/.test(g.H.of(b).reason));
}
console.log(`RESULT: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
