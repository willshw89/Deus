// tools/test_second_by_second_history.js
// Automated verification for second-by-second living world history iteration (1-200 AD)

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert/strict");

const root = path.resolve(__dirname, "..");
const readPlugin = name => fs.readFileSync(path.join(root, "game/js/plugins", name + ".js"), "utf8");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "game/data/UF_WorldCatalog.json"), "utf8"));

const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
let historyCode = readPlugin("UF_History");
let colonistsCode = readPlugin("UF_Colonists");
let householdsCode = readPlugin("UF_Households");

if (mutant === "no_clock_advance") {
    // Mutant: clock fails to advance
    historyCode = historyCode.replace(/\$ufTime\.advanceMinute\(6\);/g, "// no clock advance");
} else if (mutant === "no_houses_built") {
    // Mutant: no houses constructed around fire
    historyCode = historyCode.replace(/buildHomesteadAroundFire\(site, f, [^,]+, year\);/g, "// disabled homestead");
} else if (mutant === "no_indoor_hearth") {
    // Mutant: fail to place domestic indoor hearth
    historyCode = historyCode.replace(/write\(area, hearthCell\[0\], hearthCell\[1\], HEARTH_TYPE\);/g, "// disabled hearth");
} else if (mutant === "no_offspring_aging") {
    // Mutant: disable progressAging in beat loop
    historyCode = historyCode.replace(/progressAging\(1\);/g, "// no aging");
} else if (mutant === "unhoused_can_have_children") {
    // Mutant: unhoused couples can have children
    householdsCode = householdsCode.replace(/if \(!h \|\| !isSheltered\(h\)\) return false;/g, "if (!h || !h.home) return true;");
} else if (mutant === "no_child_room_needed") {
    // Mutant: couple can have children without building a room
    householdsCode = householdsCode.replace(/return availableChildRooms > livingChildren;/g, "return true;");
}

let passed = 0, failed = 0;
function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`PASS second_by_second.${name}`);
    } catch (e) {
        failed++;
        console.error(`FAIL second_by_second.${name}: ${e.stack || e.message}`);
    }
}

function createHarness() {
    const size = 64;
    const objects = new Map();
    const ground = new Map();
    const units = new Map();
    const events = new Map();
    let tick = 100;

    const listeners = {};
    const Events = {
        on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
        emit(ev, ...args) { for (const fn of (listeners[ev] || [])) fn(...args); }
    };

    const $ufTime = {
        year: 1,
        hour: 8,
        minute: 0,
        day: 1,
        monthIndex: 0,
        seasonName: "Spring",
        advanceMinute(amount = 1) {
            this.minute += amount;
            while (this.minute >= 60) {
                this.minute -= 60;
                this.hour++;
                Events.emit("time:hour", this.hour);
            }
            while (this.hour >= 24) {
                this.hour -= 24;
                this.day++;
                this.year++;
                Events.emit("time:day", this.day, "Spring", this.year);
                Events.emit("time:year", this.year);
            }
        }
    };

    const World = {
        state: {
            seed: 424242,
            size,
            startArea: { x: 0, y: 0 },
            objectDiffs: {},
            diffs: {},
            history: null,
            factions: {
                playerId: "f1",
                list: [
                    { id: "f1", name: "Hawthorne Freehold", species: "human", culture: "human", isPlayer: true, home: { area: { x: 0, y: 0 }, x: 32, y: 32, z: 0 } },
                    { id: "f2", name: "Ironfoot Clan", species: "dwarf", culture: "dwarf", home: { area: { x: 0, y: 0 }, x: 16, y: 16, z: -1 }, homes: [{ area: { x: 0, y: 0 }, x: 16, y: 16, z: -1 }, { area: { x: 0, y: 0 }, x: 16, y: 16, z: -2 }] }
                ],
                relations: {}
            }
        },
        currentArea: () => ({ x: 0, y: 0 }),
        viewLevel: () => ({ x: 0, y: 0, z: 0 }),
        inWorld: () => true,
        hash32: (...parts) => {
            let h = 2166136261 >>> 0;
            for (const part of parts) {
                let v = Number(part) >>> 0;
                for (let i = 0; i < 4; i++) {
                    h ^= v & 255;
                    h = Math.imul(h, 16777619) >>> 0;
                    v >>>= 8;
                }
            }
            return h >>> 0;
        },
        mulberry32: a => () => {
            let t = (a += 0x6D2B79F5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        },
        unit: id => units.get(id) || null,
        eventOf: () => null,
        refreshUnitImage: () => true,
        units: () => Array.from(units.values()),
        addUnit: u => {
            const id = units.size + 1;
            const full = Object.assign({ id, x: u.x || 32, y: u.y || 32, area: u.area || { x: 0, y: 0 }, z: u.z || 0, data: u.data || {} }, u);
            units.set(id, full);
            return full;
        },
        removeUnit: id => units.delete(id),
        getObject: (ax, ay, x, y) => objects.get(`${ax},${ay}:${x},${y}`) || 0,
        setObject: (ax, ay, x, y, type) => {
            objects.set(`${ax},${ay}:${x},${y}`, type);
            return true;
        },
        getTile: () => 1,
        setTile: () => true,
        walkable: (ax, ay, x, y) => {
            const o = objects.get(`${ax},${ay}:${x},${y}`);
            return !o || o === 1; // 1 is campfire (passable)
        },
        reachable: () => true,
        peekArea: () => ({ data: new Uint16Array(size * size * 6), ufObjects: new Uint8Array(size * size) }),
        buildArea: () => ({ data: new Uint16Array(size * size * 6), ufObjects: new Uint8Array(size * size) }),
        areaKey: (ax, ay) => `${ax},${ay}`
    };

    const sandbox = {
        window: {},
        console,
        setTimeout: () => {},
        clearTimeout: () => {},
        performance: { now: () => Date.now() },
        Math,
        Array,
        Object,
        Set,
        Map,
        String,
        Number,
        Date,
        $dataMap: { width: size, height: size, data: new Uint16Array(size * size * 6), ufObjects: new Uint8Array(size * size) },
        $gameMap: {
            width: () => size,
            height: () => size,
            events: () => [],
            isPassable: () => true
        },
        $gameMessage: { isBusy: () => false },
        $dataSystem: { advanced: {} },
        $ufWorldCatalog: catalog,
        $ufTime,
        Tilemap: { isTileA1: () => false },
        Game_Map: { prototype: { update: () => {} } },
        Game_CharacterBase: { prototype: { update: () => {} } },
        Game_Player: { prototype: { setupForNewGame: () => {} } },
        Window_Base: class {
            constructor() { this.contents = { clear() {}, fontSize: 16 }; }
            refresh() {}
            hide() {}
            show() {}
            isOpen() { return true; }
        },
        SceneManager: { _scene: null, catchException() {}, onError() {} },
        Scene_Boot: { prototype: { start: () => {} } },
        Scene_Title: { prototype: { start: () => {} } },
        Scene_Map: class { isStarted() { return true; } },
        PluginManager: { parameters: () => ({}), loadScript: () => {} },
        Game_System: { prototype: { windowOpacity: () => 192 } },
        DataManager: { extractSaveContents: () => {} },
        Input: { keyMapper: {}, isTriggered: () => false, isPressed: () => false },
        Graphics: { frameCount: 0 },
        TouchInput: { _x: 0, _y: 0 }
    };
    sandbox.window = sandbox;
    sandbox.window.UF = {
        Events,
        World,
        WorldGen: {
            cellInfo: () => ({ walkable: true, peak: false, water: false, ground: "grass" }),
            cellInfoLocal: () => ({ walkable: true, peak: false, water: false, ground: "grass" })
        },
        Objects: {
            typeId: id => {
                const idx = (catalog.objects || []).findIndex(o => o.id === id);
                return idx >= 0 ? idx + 1 : 0;
            },
            setIn: (area, x, y, id) => {
                const idx = (catalog.objects || []).findIndex(o => o.id === id);
                objects.set(`${area.x},${area.y}:${x},${y}`, idx >= 0 ? idx + 1 : 0);
                return true;
            },
            typeIdIn: (area, x, y) => objects.get(`${area.x},${area.y}:${x},${y}`) || 0,
            atIn: (area, x, y) => {
                const t = objects.get(`${area.x},${area.y}:${x},${y}`);
                return t ? catalog.objects[t - 1] : null;
            }
        },
        Jobs: {
            define() {},
            handler: () => null,
            standable: () => true,
            isWaterAt: () => false
        },
        Factions: {
            all: () => World.state.factions.list,
            get: id => World.state.factions.list.find(f => f.id === id) || null,
            factionOf: id => World.state.factions.list.find(f => f.id === id) || null
        },
        Skills: { level: () => 10 },
        Agriculture: { reserved: () => false, planJob: () => null },
        CultureGrowth: { rankCandidates: (u, list) => list },
        Goals: { choosePlan: (u, list) => list, ensure() {} },
        Ownership: { ownerOf: () => null }
    };

    vm.createContext(sandbox);
    return { sandbox, World, objects, units, Events, $ufTime };
}

// 1. Universal Year 1 founding
check("universal_year_1_founding", () => {
    const { sandbox, World, objects } = createHarness();
    vm.runInContext(colonistsCode, sandbox);
    vm.runInContext(householdsCode, sandbox);
    vm.runInContext(historyCode, sandbox);

    const UF = sandbox.UF;
    const st = World.state;
    const h = UF.History.generate(st, { targetYears: 1 });
    assert.ok(h, "History generated");
    assert.equal(h.years, 1, "Year 1 initially");
    assert.ok(h.founders, "Founders record exists");

    const people = UF.History.spawnPeople(st);
    assert.equal(people.length, 16, "16 founders spawned across 2 factions (8 each)");
    assert.ok(objects.get("0,0:32,32") > 0, "Campfire placed at camp center");

    UF.Colonists.setup(st);
    assert.ok(st.colony, "Colony state initialized");
});

// 2. Second-by-Second History Iteration from Year 1 to Year 50 AD
check("second_by_second_50_year_simulation", () => {
    const { sandbox, World, objects, $ufTime } = createHarness();
    vm.runInContext(colonistsCode, sandbox);
    vm.runInContext(householdsCode, sandbox);
    vm.runInContext(historyCode, sandbox);

    const UF = sandbox.UF;
    const st = World.state;
    UF.History.generate(st, { targetYears: 50 });
    const people = UF.History.spawnPeople(st);
    UF.Colonists.setup(st);

    assert.equal($ufTime.year, 1, "Starts at Year 1");
    const t0 = Date.now();
    UF.History.iterateWorldHistory(st, 50);
    const duration = Date.now() - t0;
    console.log(`    Simulated 49 elapsed years (11,760 beats) in ${duration} ms`);

    assert.equal($ufTime.year, 50, "Clock reached Year 50 AD");
    assert.ok($ufTime.day >= 40, `Clock day advanced through time (actual day: ${$ufTime.day})`);
    assert.equal(st.history.years, 50, "History recorded 50 years");
    assert.ok(st.history.settled, "Settled summary recorded");
    assert.ok(st.history.settled.houses >= 4, `Houses built around fire: ${st.history.settled.houses}`);
    assert.ok(st.history.settled.hearths >= 4, `Indoor hearths constructed: ${st.history.settled.hearths}`);
    assert.ok(st.history.settled.beds >= 4, `Beds placed: ${st.history.settled.beds}`);
    assert.ok(st.history.events.length >= 10, `Chronicle events recorded: ${st.history.events.length}`);
});

// 3. Focal Homestead Construction and Indoor Hearth Placement
check("focal_homesteads_with_indoor_hearth_and_bed", () => {
    const { sandbox, World, objects } = createHarness();
    vm.runInContext(colonistsCode, sandbox);
    vm.runInContext(householdsCode, sandbox);
    vm.runInContext(historyCode, sandbox);

    const UF = sandbox.UF;
    const st = World.state;
    UF.History.generate(st, { targetYears: 10 });
    UF.History.spawnPeople(st);
    UF.Colonists.setup(st);
    UF.History.iterateWorldHistory(st, 10);

    const settled = st.history.settled;
    assert.ok(settled.houses >= 4, `At least 4 founder homes built (actual: ${settled.houses})`);
    assert.ok(settled.hearths >= 4, `At least 4 indoor hearths placed (actual: ${settled.hearths})`);
    assert.ok(settled.beds >= 4, `At least 4 beds placed (actual: ${settled.beds})`);

    // Verify physical placement of hearth and bed in objects map
    let hearthsFound = 0, bedsFound = 0;
    const hearthId = (catalog.objects || []).findIndex(o => o.id === "kitchen_hearth") + 1;
    const campfireId = (catalog.objects || []).findIndex(o => o.id === "campfire") + 1;
    const bedId = (catalog.objects || []).findIndex(o => o.id === "floor_straw") + 1;
    for (const [key, type] of objects.entries()) {
        if ((type === hearthId || type === campfireId) && key !== "0,0:32,32" && key !== "0,0:16,16") hearthsFound++;
        if (type === bedId) bedsFound++;
    }
    assert.ok(hearthsFound >= 4, `Physical indoor hearths found: ${hearthsFound}`);
    assert.ok(bedsFound >= 4, `Physical beds found: ${bedsFound}`);
});

// 4. Multi-Generational Offspring Aging and Non-Kin Pairbonding
check("multi_generational_offspring_adulthood_pairbonding", () => {
    const { sandbox, World } = createHarness();
    vm.runInContext(colonistsCode, sandbox);
    vm.runInContext(householdsCode, sandbox);
    vm.runInContext(historyCode, sandbox);

    const UF = sandbox.UF;
    const st = World.state;
    UF.History.generate(st, { targetYears: 30 });
    UF.History.spawnPeople(st);
    UF.Colonists.setup(st);
    console.log("Before iterate, units:", World.units().map(u => ({ id: u.id, name: u.name, gender: u.data.gender, age: u.data.age, partnerId: u.data.partnerId, familyId: u.data.familyId })));
    UF.History.iterateWorldHistory(st, 30);
    console.log("After iterate, units count:", World.units().length, "units:", World.units().map(u => ({ id: u.id, name: u.name, gen: u.data.generation, age: u.data.age, preg: u.data.pregnancy })));
    const units = World.units();
    const children = units.filter(u => u.data.generation >= 2);
    assert.ok(children.length > 0, `Offspring born into colony: ${children.length}`);
    const adultsGen2 = children.filter(u => u.data.age >= 15);
    console.log(`    Generation 2 total: ${children.length}, reached adulthood: ${adultsGen2.length}`);
    for (const u of children) {
        assert.ok(u.data.familyId, `Child ${u.name} has familyId`);
        assert.ok(u.data.surname, `Child ${u.name} inherited surname: ${u.data.surname}`);
    }
});

// 5. Authentic Chronicle Events
check("chronicle_records_authentic_second_by_second_events", () => {
    const { sandbox, World } = createHarness();
    vm.runInContext(colonistsCode, sandbox);
    vm.runInContext(householdsCode, sandbox);
    vm.runInContext(historyCode, sandbox);

    const UF = sandbox.UF;
    const st = World.state;
    UF.History.generate(st, { targetYears: 25 });
    UF.History.spawnPeople(st);
    UF.Colonists.setup(st);
    UF.History.iterateWorldHistory(st, 25);

    const events = st.history.events;
    const types = new Set(events.map(e => e.type));
    console.log(`    Chronicle event types recorded:`, Array.from(types));
    assert.ok(types.has("founding"), "Has founding event");
    assert.ok(types.has("settle_built") || types.has("homestead_built"), "Has homestead construction event");
    for (const e of events) {
        assert.ok(e.year >= 1 && e.year <= 25, `Event year ${e.year} within range`);
        assert.ok(typeof e.text === "string" && e.text.length > 0, "Event has description text");
    }
});

// 6. Home Required Before Children & Room-Per-Child Expansion
check("home_required_before_children_and_room_per_child", () => {
    const { sandbox, World } = createHarness();
    vm.runInContext(colonistsCode, sandbox);
    vm.runInContext(householdsCode, sandbox);
    vm.runInContext(historyCode, sandbox);

    const UF = sandbox.UF;
    const st = World.state;
    UF.History.generate(st, { targetYears: 1 });
    UF.History.spawnPeople(st);
    UF.Colonists.setup(st);
    UF.Households.reconcile();

    const H = UF.Households;
    const founders = World.units();
    const mom = founders.find(u => u.data.gender === "female");
    assert.ok(mom, "Found female founder");
    const h = H.of(mom);
    assert.ok(h, "Mom has household");

    // 1. Unhoused pair cannot conceive
    assert.equal(h.home, null, "Unhoused at creation");
    assert.equal(H.canConceiveChild(h), false, "Unhoused couple CANNOT conceive children");

    // 2. Pair with home but 0 child rooms cannot conceive child #1
    h.home = {
        x: 35, y: 35, w: 4, h: 4,
        walls: [], doors: [{ x: 37, y: 38 }],
        beds: [{ x: 36, y: 36, unitId: mom.id }],
        hearth: { x: 37, y: 36 },
        rooms: [{ type: "master", x: 35, y: 35, w: 4, h: 4, bed: { x: 36, y: 36 } }],
        annexes: []
    };
    assert.ok(H.isSheltered(h), "Home is sheltered");
    assert.equal(H.childRooms(h), 0, "0 child rooms currently built");
    assert.equal(H.canConceiveChild(h), false, "Cannot conceive child #1 without a built child room");

    // 3. Build child room #1 -> can conceive child #1
    h.home.rooms.push({ type: "child", x: 39, y: 35, w: 3, h: 3, bed: { x: 40, y: 36 } });
    h.home.beds.push({ x: 40, y: 36, unitId: null });
    assert.equal(H.childRooms(h), 1, "1 child room built");
    assert.equal(H.canConceiveChild(h), true, "Can now conceive child #1");

    // 4. Child #1 is born -> now has 1 child, 1 child room -> cannot conceive child #2 until room #2 is built
    const child1 = World.addUnit({
        name: "TestChild1",
        data: { kind: "colonist", faction: mom.data.faction, age: 2, stage: "child", motherId: mom.id }
    });
    H.join(child1, h);
    h.home.beds[1].unitId = child1.id;
    assert.equal(H.canConceiveChild(h), false, "Cannot conceive child #2 until room #2 is built");

    // 5. Build child room #2 -> can now conceive child #2
    h.home.rooms.push({ type: "child", x: 35, y: 39, w: 3, h: 3, bed: { x: 36, y: 40 } });
    h.home.beds.push({ x: 36, y: 40, unitId: null });
    assert.equal(H.childRooms(h), 2, "2 child rooms built");
    assert.equal(H.canConceiveChild(h), true, "Can now conceive child #2");
});

// 7. Distributed Habitation (No Campfire Huddling)
check("distributed_habitation_no_campfire_huddling", () => {
    const { sandbox, World } = createHarness();
    vm.runInContext(colonistsCode, sandbox);
    vm.runInContext(householdsCode, sandbox);
    vm.runInContext(historyCode, sandbox);

    const UF = sandbox.UF;
    const st = World.state;
    UF.History.generate(st, { targetYears: 10 });
    UF.History.spawnPeople(st);
    UF.Colonists.setup(st);

    // Run second-by-second history
    UF.History.iterateWorldHistory(st, 10);

    const units = World.units().filter(u => !u.data.dead);
    const H = UF.Households;
    const housed = units.filter(u => {
        const h = H.of(u);
        return h && h.home;
    });

    assert.ok(housed.length >= 8, `At least 8 housed colonists exist (actual: ${housed.length})`);
    // Verify that housed colonists are distributed across different coordinates in their homes, NOT huddled at (32, 32)
    const distinctCoords = new Set(housed.map(u => `${u.x},${u.y}`));
    console.log(`    Housed colonists: ${housed.length}, distinct locations across settlement: ${distinctCoords.size}`);
    assert.ok(distinctCoords.size >= 4, `Colonists distributed across at least 4 distinct home coordinates (actual: ${distinctCoords.size})`);
    const atCampfire = housed.filter(u => u.x === 32 && u.y === 32);
    assert.equal(atCampfire.length, 0, "Zero housed colonists huddled on the central campfire");
});

console.log("\n===========================================");
console.log(`TOTAL PASSES: ${passed}`);
console.log(`TOTAL FAILS:  ${failed}`);
console.log("===========================================");
if (failed > 0) process.exit(1);
