"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert/strict");

const root = path.resolve(__dirname, "..");
const readPlugin = name => fs.readFileSync(path.join(root, "game/js/plugins", name + ".js"), "utf8");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "game/data/UF_WorldCatalog.json"), "utf8"));

const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
let colonistsCode = readPlugin("UF_Colonists");
let householdsCode = readPlugin("UF_Households");

if (mutant === "no_obstacle_clearance") {
    // Mutant: revert obstacle clearance to permanently blocked
    colonistsCode = colonistsCode.replace(
        'state = (here.actions && Object.keys(here.actions).length > 0) ? "todo" : "blocked";',
        'state = "blocked";'
    );
} else if (mutant === "flat_domestic_priority") {
    // Mutant: flatten domestic score bonus to 0.1
    colonistsCode = colonistsCode.replace('s += 2.5;', 's += 0.1;');
}

let passed = 0, failed = 0;
function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`PASS faction_construction.${name}`);
    } catch (e) {
        failed++;
        console.error(`FAIL faction_construction.${name}: ${e.stack || e.message}`);
    }
}

function createHarness() {
    const size = 64;
    const objects = new Map();
    const ground = new Map();
    const units = new Map();
    const events = new Map();
    let tick = 0;

    const zOf = r => (r && r.z !== undefined ? r.z : (r && r.area && r.area.z !== undefined ? r.area.z : 0));
    const key = (a, x, y) => `${a.x || 0},${a.y || 0},${zOf(a)}:${x},${y}`;
    const copyArea = a => ({ x: a ? a.x : 0, y: a ? a.y : 0 });

    const cat = JSON.parse(JSON.stringify(catalog));
    const types = cat.objects.map((o, i) => ({ ...o, typeId: i + 1 }));

    const W = {
        state: {
            seed: 20260920,
            size,
            area: { x: 0, y: 0 },
            startArea: { x: 0, y: 0 },
            colony: null,
            factions: {
                playerId: "player",
                list: [
                    { id: "player", species: "human", name: "Kingdom" },
                    { id: "dwarves", species: "dwarf", name: "Dwarven Clan" },
                    { id: "elves", species: "elf", name: "Elven Haven" },
                    { id: "orcs", species: "orc", name: "Orc Tribe" }
                ]
            },
            history: {
                sites: [
                    { id: 1, faction: "player", kind: "camp", area: { x: 0, y: 0 }, x: 16, y: 16, radius: 6 },
                    { id: 2, faction: "dwarves", kind: "camp", area: { x: 0, y: 0 }, x: 48, y: 16, radius: 6 },
                    { id: 3, faction: "elves", kind: "camp", area: { x: 0, y: 0 }, x: 16, y: 48, radius: 6 },
                    { id: 4, faction: "orcs", kind: "camp", area: { x: 0, y: 0 }, x: 48, y: 48, radius: 6 }
                ]
            }
        },
        unit: id => units.get(id) || null,
        units: () => Array.from(units.values()),
        addUnit(opts) {
            const id = units.size + 1;
            const u = {
                id,
                name: opts.name || `Unit_${id}`,
                x: opts.x,
                y: opts.y,
                z: opts.z || 0,
                area: copyArea(opts.area),
                dir: opts.dir || 2,
                image: opts.image || { characterName: "$UF_Human_Male_1_Walk", characterIndex: 0 },
                data: Object.assign({}, opts.data || {})
            };
            units.set(id, u);
            return u;
        },
        currentArea: () => ({ x: 0, y: 0 }),
        viewLevel: () => ({ x: 0, y: 0, z: 0 }),
        levelOfMapId: () => ({ x: 0, y: 0, z: 0 }),
        hash32(...xs) {
            let h = 2166136261;
            for (const x of xs) {
                h ^= Number(x) || 0;
                h = Math.imul(h, 16777619);
            }
            return h >>> 0;
        },
        mulberry32(seed) {
            let s = seed >>> 0;
            return function() {
                s = (s + 0x6D2B79F5) >>> 0;
                let t = Math.imul(s ^ (s >>> 15), 1 | s);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        },
        walkable(ax, ay, x, y, opts = {}) {
            if (x < 0 || y < 0 || x >= size || y >= size) return false;
            const a = { x: ax, y: ay, z: opts.z !== undefined ? opts.z : 0 };
            const o = O.atIn(a, x, y);
            return !o || o.passable === true;
        },
        findPath(a, sx, sy, gx, gy) {
            if (Math.abs(sx - gx) + Math.abs(sy - gy) <= 1) return [{ x: gx, y: gy }];
            return [{ x: sx + Math.sign(gx - sx), y: sy + Math.sign(gy - sy) }];
        },
        reachable(a, sx, sy, gx, gy) { return true; },
        eventOf: () => null,
        refreshUnitImage: () => {},
        getTile: () => "grass"
    };

    const O = {
        types: () => types,
        type: id => types.find(t => (typeof id === "number" ? t.typeId === id : t.id === id)) || null,
        typeId: id => { const t = O.type(id); return t ? t.typeId : 0; },
        atIn: (a, x, y) => {
            const id = objects.get(key(a, x, y));
            return id ? O.type(id) : null;
        },
        setIn: (a, x, y, id) => {
            const k = key(a, x, y);
            if (id) {
                const t = O.type(id);
                if (!t) return false;
                objects.set(k, t.id);
            } else {
                objects.delete(k);
            }
            return true;
        },
        findIn: (a, opts) => {
            const out = [];
            for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                const t = O.atIn(a, x, y);
                if (!t) continue;
                const d = Math.hypot(x - opts.near.x, y - opts.near.y);
                if (d <= (opts.radius || 20) && (!opts.id || t.id === opts.id)) {
                    out.push({ x, y, type: t, dist: d });
                }
            }
            return out.sort((p, q) => p.dist - q.dist);
        }
    };

    const J = {
        open: () => [],
        list: () => [],
        of: () => null,
        isWaterAt: () => false,
        standable: (a, x, y) => W.walkable(a.x, a.y, x, y),
        create: spec => Object.assign({ id: 100, state: "active" }, spec),
        assign: () => true
    };

    const I = {
        items: [],
        count: () => 10,
        inventoryOf: () => []
    };

    const ctx = {
        console,
        performance,
        window: {},
        Graphics: { frameCount: 0 },
        Scene_Boot: { prototype: { start() {} } },
        Scene_Map: { prototype: { update() {} } },
        Game_Map: class { update() {} },
        ImageManager: { loadCharacter: () => ({ isReady: () => true, width: 144, height: 192 }) },
        Bitmap: class { constructor() {} isReady() { return true; } },
        Rectangle: class { constructor(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; } },
        Input: { keyMapper: {}, isTriggered: () => false, isPressed: () => false },
        TouchInput: { isTriggered: () => false },
        Window_Base: class { constructor() {} initialize() {} update() {} refresh() {} },
        Window_Selectable: class { constructor() {} initialize() {} update() {} refresh() {} setHandler() {} select() {} activate() {} deactivate() {} reselect() {} },
        Window_Command: class { constructor() {} initialize() {} update() {} refresh() {} addCommand() {} },
        PluginManager: { parameters: () => ({}) },
        $ufWorldCatalog: cat,
        UF: {
            World: W,
            Objects: O,
            Jobs: J,
            Items: I,
            Time: { ticks: () => tick },
            Events: {
                on(name, fn) {
                    if (!events.has(name)) events.set(name, []);
                    events.get(name).push(fn);
                },
                emit(name, ...args) {
                    for (const fn of events.get(name) || []) fn(...args);
                }
            },
            Factions: {
                playerId: () => "player",
                get: id => W.state.factions.list.find(f => f.id === id) || null,
                all: () => W.state.factions.list.slice()
            },
            History: {
                siteById: id => W.state.history.sites.find(s => s.id === id) || null
            }
        }
    };

    ctx.window = ctx;
    vm.createContext(ctx);

    // Load plugins in order
    const plugins = ["UF_Factions", "UF_History", "UF_Households", "UF_Colonists"];
    for (const p of plugins) {
        let code = readPlugin(p);
        if (p === "UF_Colonists") code = colonistsCode;
        if (p === "UF_Households") code = householdsCode;
        vm.runInContext(code, ctx);
    }

    // Set up colony state
    ctx.UF.Colonists.setup(W.state);

    return { ctx, W, O, J, I, units, objects };
}

// 1. Verify multi-faction founders receive ai="settlement" and are settlers
check("all_faction_founders_are_settlers", () => {
    const h = createHarness();
    const { ctx, W } = h;

    // Create founder units for player and NPC factions
    const uPlayer = W.addUnit({
        area: { x: 0, y: 0 }, x: 16, y: 16,
        data: { kind: "person", faction: "player", ai: "settlement", site: 1, founder: true, gender: "male", age: 25 }
    });
    const uDwarf = W.addUnit({
        area: { x: 0, y: 0 }, x: 48, y: 16,
        data: { kind: "person", faction: "dwarves", ai: "settlement", site: 2, founder: true, gender: "male", age: 30 }
    });
    const uElf = W.addUnit({
        area: { x: 0, y: 0 }, x: 16, y: 48,
        data: { kind: "person", faction: "elves", ai: "settlement", site: 3, founder: true, gender: "female", age: 40 }
    });
    const uOrc = W.addUnit({
        area: { x: 0, y: 0 }, x: 48, y: 48,
        data: { kind: "person", faction: "orcs", ai: "settlement", site: 4, founder: true, gender: "male", age: 22 }
    });

    const simUnits = ctx.UF.Colonists._internal.simulationUnits();

    assert.ok(simUnits.some(u => u.id === uPlayer.id), "Player unit in simulation");
    assert.ok(simUnits.some(u => u.id === uDwarf.id), "Dwarf unit in simulation");
    assert.ok(simUnits.some(u => u.id === uElf.id), "Elf unit in simulation");
    assert.ok(simUnits.some(u => u.id === uOrc.id), "Orc unit in simulation");
});

// 2. Verify all factions can plan household homes with 5 base steps
check("multi_faction_household_home_planning", () => {
    const h = createHarness();
    const { ctx, W } = h;

    const dwarf1 = W.addUnit({
        area: { x: 0, y: 0 }, x: 48, y: 16,
        data: { kind: "person", faction: "dwarves", ai: "settlement", site: 2, founder: true, gender: "male", age: 25, familyId: "dwarf_fam_1" }
    });
    const dwarf2 = W.addUnit({
        area: { x: 0, y: 0 }, x: 49, y: 16,
        data: { kind: "person", faction: "dwarves", ai: "settlement", site: 2, founder: true, gender: "female", age: 24, familyId: "dwarf_fam_1" }
    });

    const cState = ctx.UF.Colonists.state(dwarf1);
    assert.ok(cState, "Dwarf colonist state exists");
    assert.equal(cState.siteId, 2, "Dwarf colony state matches site 2");

    const steps = ctx.UF.Households.planSteps(dwarf1);
    assert.ok(steps.length >= 5, `Expected >= 5 household steps, got ${steps.length}`);
    const suffixes = steps.map(s => s.id.split("_").slice(1).join("_"));
    assert.ok(suffixes.includes("walls"), "Has walls step");
    assert.ok(suffixes.includes("doors"), "Has doors step");
    assert.ok(suffixes.includes("beds"), "Has beds step");
    assert.ok(suffixes.includes("hearth"), "Has hearth step");
    assert.ok(suffixes.includes("storage"), "Has storage step");
});

// 3. Verify path and floor obstacle clearance
check("road_floor_obstacle_clearance", () => {
    const h = createHarness();
    const { ctx, W, O } = h;

    const u = W.addUnit({
        area: { x: 0, y: 0 }, x: 16, y: 16,
        data: { kind: "colonist", faction: "player", ai: "colonist", site: 1, age: 25 }
    });

    // Place an oak tree (which is impassable and has chop action) on a road path cell
    O.setIn({ x: 0, y: 0 }, 18, 16, "oak");
    const cellObj = O.atIn({ x: 0, y: 0 }, 18, 16);
    assert.ok(cellObj, "Tree placed");
    assert.ok(cellObj.passable !== true, "Tree is impassable");
    assert.ok(cellObj.actions && cellObj.actions.chop, "Tree has chop action");

    const roadStep = {
        id: "path_test",
        build: "road",
        cells: [[2, 0]] // offset from site (16,16) -> (18,16)
    };

    const cells = ctx.UF.Colonists._internal.buildCells(roadStep, u);
    assert.equal(cells.length, 1);
    assert.equal(cells[0].state, "todo", "Obstacle with chop action is marked 'todo' for clearance");
});

// 4. Verify domestic completion drive (+2.5 bonus for family home)
check("domestic_completion_priority_drive", () => {
    const h = createHarness();
    const { ctx, W } = h;

    const u = W.addUnit({
        area: { x: 0, y: 0 }, x: 16, y: 16,
        data: { kind: "colonist", faction: "player", ai: "colonist", site: 1, age: 25 }
    });

    const mySteps = ctx.UF.Households.planSteps(u);
    const myH = ctx.UF.Households.of(u);
    assert.ok(myH, "Household formed");

    const neighborStep = { id: "household:99_walls", build: "wall_wood", household: "household:99", cells: [[5, 5]] };
    const civicStep = { id: "path_plaza", build: "road", cells: [[0, 1]] };

    const c = ctx.UF.Colonists.state(u);
    assert.ok(c, "Colony state exists");
    c.plan = [neighborStep, civicStep];

    const planJob = ctx.UF.Colonists._internal.planJob;
    const j = planJob(u);
    assert.ok(j, "Colonist receives a planned job");
    assert.ok(j.params && j.params.plan, "Job has plan attached");
    assert.equal(j.params.plan, `${myH.id}_walls`, "Colonist prioritized enclosing their own household walls first!");
});

// 5. Verify home progression to Stage 2 (floors) and Stage 4 (workstations) upon enclosure
check("home_progression_stage2_and_stage4", () => {
    const h = createHarness();
    const { ctx, W, O } = h;

    const u = W.addUnit({
        area: { x: 0, y: 0 }, x: 16, y: 16,
        data: {
            kind: "colonist", faction: "player", ai: "colonist", site: 1, age: 30,
            calling: { id: "blacksmith" },
            skills: { crafting: 80 }
        }
    });

    const stepsBefore = ctx.UF.Households.planSteps(u);
    const house = ctx.UF.Households.of(u);
    assert.ok(house && house.home, "Home planned");

    const home = house.home;
    // Complete walls, doors, beds, hearth, storage
    for (const w of home.walls) O.setIn({ x: 0, y: 0 }, w.x, w.y, home.wall || "wall_wood");
    for (const d of home.doors) O.setIn({ x: 0, y: 0 }, d.x, d.y, home.door || "door_wood");
    for (const b of home.beds) O.setIn({ x: 0, y: 0 }, b.x, b.y, "floor_straw");
    if (home.hearth) O.setIn({ x: 0, y: 0 }, home.hearth.x, home.hearth.y, "campfire");
    if (home.storage) O.setIn({ x: 0, y: 0 }, home.storage.x, home.storage.y, "stockpile");

    // Re-evaluate plan steps after enclosure
    const stepsAfter = ctx.UF.Households.planSteps(u);
    const idsAfter = stepsAfter.map(s => s.id);

    assert.ok(idsAfter.some(id => id.includes("floors")), "Stage 2 interior floors added to plan");
    assert.ok(idsAfter.some(id => id.includes("kitchen") || id.includes("dining") || id.includes("station") || id.includes("workshop") || id.includes("blacksmith")),
        "Progressive improvements (kitchen, dining, calling station) unlocked");
});

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
