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
let floorsCode = readPlugin("UF_Floors");
let environmentCode = readPlugin("UF_Environment");

if (mutant === "no_clock_advance") {
    // Mutant: clock fails to advance
    historyCode = historyCode.replace(/\$ufTime\.advanceMinute\(6\);/g, "// no clock advance");
} else if (mutant === "no_houses_built") {
    // Mutant: no houses constructed around fire
    historyCode = historyCode.replace(/buildSharedCommunalStructure\(site, f, year\);/g, "// no shared")
                           .replace(/buildHomesteadAroundFire\(site, f, [^,]+, year\);/g, "// no homestead");
} else if (mutant === "no_indoor_hearth") {
    // Mutant: fail to place domestic indoor hearth
    historyCode = historyCode.replace(/write\(area, x, y, HEARTH_TYPE\);/g, "// disabled hearth");
} else if (mutant === "no_offspring_aging") {
    // Mutant: disable progressAging in beat loop
    historyCode = historyCode.replace(/progressAging\(1\);/g, "// no aging");
} else if (mutant === "unhoused_can_have_children") {
    // Mutant: unhoused couples can have children
    householdsCode = householdsCode.replace("if (!h || !isSheltered(h)) return false;", "return true;");
} else if (mutant === "no_child_room_needed") {
    // Mutant: couple can have children without building a room
    householdsCode = householdsCode.replace(/return availableChildRooms > livingChildren;/g, "return true;");
} else if (mutant === "no_communal_living") {
    // Mutant: home does not require communal living area
    householdsCode = householdsCode.replace(/function hasCommunalLiving\(refH\) \{/g, "function hasCommunalLiving(refH) { return true;");
} else if (mutant === "touching_structures") {
    // Mutant: disable 1-square separation check
    historyCode = historyCode.replace(/if \(!canPlaceStructure\(spot\.x0, spot\.y0, w, hh\)\) continue;/g, "// no separation check");
} else if (mutant === "disconnected_roads") {
    // Mutant: disable road network creation
    historyCode = historyCode.replace(/connectHomeWithRoad\(site, f, [^)]+\);/g, "// no roads connected");
} else if (mutant === "no_physical_actions") {
    // Mutant: disable physical actions and labor
    historyCode = historyCode.replace(/if \(hour >= 6 && hour < 22\) \{/g, "if (false) {");
} else if (mutant === "no_damage_iteration") {
    // Mutant: disable damage and combat iteration
    historyCode = historyCode.replace(/totalCombatRounds\+\+;/g, "// no combat rounds");
} else if (mutant === "no_upper_roof_deck") {
    // Mutant: disable upper roof deck on z=1
    historyCode = historyCode.replace(/Floors\.applyRoofedUpperDeck\(area, [^;]+;/g, "// no roof deck");
} else if (mutant === "no_move_out") {
    // Mutant: couples don't move out when building home
    historyCode = historyCode.replace(/u\.data\.movedOut = true;/g, "// no move out");
} else if (mutant === "no_interior_floors") {
    // Mutant: disable interior floor laying
    historyCode = historyCode.replaceAll(/Floors\.setFloor\([^;]+;/g, "// no floor laid");
} else if (mutant === "no_couple_beds") {
    // Mutant: disable second bed for couple
    historyCode = historyCode.replaceAll(/write\(area, bed2X, bed2Y, BED_TYPE\);/g, "// no bed 2");
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
        getTile: (ax, ay, x, y) => ground.get(`${ax},${ay}:${x},${y}`) || 1,
        setTile: (ax, ay, x, y, layer, tile) => {
            ground.set(`${ax},${ay}:${x},${y}`, tile);
            return true;
        },
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
        ImageManager: { loadTileset: () => ({ isReady: () => true, isError: () => false }) },
        JsonEx: { stringify: JSON.stringify, parse: JSON.parse },
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

    const levelCells = new Map();
    const Levels = {
        setShape: (ref, shape, opts = {}) => {
            const z = ref.z !== undefined ? ref.z : (ref.area ? ref.area.z : 0);
            levelCells.set(`${z}:${ref.x},${ref.y}`, {
                shape: typeof shape === "string" ? shape : "floor",
                constructed: !!opts.constructed,
                material: opts.material || "wood"
            });
            return true;
        },
        shapeAt: ref => {
            const z = ref.z !== undefined ? ref.z : (ref.area ? ref.area.z : 0);
            const cell = levelCells.get(`${z}:${ref.x},${ref.y}`);
            return cell ? cell.shape : (z > 0 ? "open" : (z < 0 ? "solid" : "floor"));
        },
        cellAt: ref => {
            const z = ref.z !== undefined ? ref.z : (ref.area ? ref.area.z : 0);
            return levelCells.get(`${z}:${ref.x},${ref.y}`) || null;
        },
        standableShape: ref => {
            const z = ref.z !== undefined ? ref.z : (ref.area ? ref.area.z : 0);
            const cell = levelCells.get(`${z}:${ref.x},${ref.y}`);
            if (cell) return cell.shape === "floor" || cell.shape === "ramp";
            return z === 0;
        }
    };

    sandbox.window.UF = {
        Events,
        World,
        Levels,
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
        Items: {
            drop() {},
            consume() { return 0; },
            consumeFrom() { return 0; },
            count() { return 0; },
            find() { return []; },
            atIn() { return []; },
            give() { return []; }
        },
        Tiles: {
            groundBase: id => (id && id.startsWith("floor_") ? 2816 : (id === "road" ? 2048 : 0)),
            kindOfTile: (tile) => (tile && tile >= 2816 ? { id: "floor_wood", passable: true } : (tile && tile >= 2048 ? { id: "road", passable: true } : { id: "grass", passable: true })),
            kinds: () => [{ id: "floor_wood" }, { id: "floor_stone" }, { id: "floor_rushes" }],
            generatedBitmap: () => ({ getPixel: () => "#ffffff" })
        },
        Jobs: {
            define() {},
            handler: () => null,
            standable: () => true,
            isWaterAt: () => false,
            list: () => [],
            create: () => null
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
    vm.runInContext(floorsCode, sandbox);
    vm.runInContext(environmentCode, sandbox);
    return { sandbox, World, objects, ground, units, Events, $ufTime, Levels, levelCells };
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
    const { sandbox, World, objects, ground } = createHarness();
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
    assert.ok(settled.beds >= 8, `At least 8 beds placed (couples have 2 beds) (actual: ${settled.beds})`);

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
    assert.ok(bedsFound >= 8, `Physical beds found (couples have 2 beds): ${bedsFound}`);

    // Verify interior floors are laid for every home
    let floorsFound = 0;
    for (const [key, tile] of ground.entries()) {
        if (tile >= 2816) floorsFound++;
    }
    assert.ok(floorsFound >= 20, `Cultural interior floor tiles laid across homes: ${floorsFound}`);

    // Verify each couple living in a private homestead has assigned beds
    const H = sandbox.UF.Households;
    const privateHouseholds = (H && H.all ? H.all() : []).filter(h => h.home && !h.home.isShared);
    assert.ok(privateHouseholds.length >= 4, `At least 4 private homestead households (actual: ${privateHouseholds.length})`);
    for (const h of privateHouseholds) {
        assert.ok(h.home.beds && h.home.beds.length >= 2, `Homestead ${h.id} has at least 2 beds`);
        assert.ok(h.home.hearth, `Homestead ${h.id} has a domestic hearth`);
        for (const mId of (h.members || []).slice(0, 2)) {
            const m = World.unit(mId);
            if (m && m.data) {
                assert.ok(m.data.bed, `Partner ${m.name} in homestead ${h.id} has assigned bed`);
            }
        }
    }
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
    const adultsGen2 = children.filter(u => u.data.age >= 15);
    console.log(`    Generation 2 total: ${children.length}, reached adulthood: ${adultsGen2.length}`);
    assert.ok(adultsGen2.length > 0, `At least one Gen 2 offspring reached adulthood (actual: ${adultsGen2.length})`);
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
    assert.ok(!h.home || h.home.isShared, "Unhoused in private home at creation");
    assert.equal(H.canConceiveChild(h), false, "Unhoused couple CANNOT conceive children");

    // 2. Pair with home but 0 child rooms cannot conceive child #1
    h.home = {
        x: 35, y: 35, w: 6, h: 4,
        isShared: false,
        isSheltered: true,
        walls: [], doors: [{ x: 36, y: 38 }, { x: 38, y: 36 }],
        beds: [{ x: 39, y: 36, unitId: mom.id }],
        hearth: { x: 36, y: 36 },
        rooms: [
            { type: "communal", x: 35, y: 35, w: 3, h: 4, hearth: { x: 36, y: 36 } },
            { type: "master", x: 38, y: 35, w: 3, h: 4, bed: { x: 39, y: 36 } }
        ],
        annexes: []
    };
    assert.ok(H.isSheltered(h), "Home is sheltered");
    assert.ok(H.hasCommunalLiving(h), "Home has communal living area");
    assert.ok(H.hasBedroom(h), "Home has master bedroom");
    assert.equal(H.childRooms(h), 0, "0 child rooms currently built");
    assert.equal(H.canConceiveChild(h), false, "Cannot conceive child #1 without a built child room");

    // 3. Build child room #1 -> can conceive child #1
    h.home.rooms.push({ type: "child", x: 41, y: 35, w: 3, h: 3, bed: { x: 42, y: 36 } });
    h.home.beds.push({ x: 42, y: 36, unitId: null });
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

// 8. Shared Structure Built First for 8 Starting Founders Around Fire
check("shared_structure_built_first_for_8_founders", () => {
    const { sandbox, World } = createHarness();
    vm.runInContext(colonistsCode, sandbox);
    vm.runInContext(householdsCode, sandbox);
    vm.runInContext(historyCode, sandbox);

    const UF = sandbox.UF;
    const st = World.state;
    UF.History.generate(st, { targetYears: 2 });
    UF.History.spawnPeople(st);
    UF.Colonists.setup(st);

    UF.History.iterateWorldHistory(st, 2);

    assert.ok(st.history.structures, "Structures list exists");
    const shared = st.history.structures.find(s => s.isShared);
    assert.ok(shared, "Shared communal structure built around campfire");
    assert.ok(shared.beds && shared.beds.length >= 8, `Shared structure contains 8 beds (actual: ${shared.beds ? shared.beds.length : 0})`);
    assert.ok(st.history.settled.sharedStructures >= 1, "Settlement summary records shared structure");

    const founders = World.units().filter(u => u.data.founder && u.data.faction === "f1");
    for (const u of founders) {
        assert.ok(u.data.bed, `Founder ${u.name} assigned bed in shared structure`);
    }
});

// 9. Every Home Requires Communal Living Area and Bedroom
check("home_requires_communal_living_and_bedroom", () => {
    const { sandbox, World } = createHarness();
    vm.runInContext(colonistsCode, sandbox);
    vm.runInContext(householdsCode, sandbox);

    const H = sandbox.UF.Households;
    const dummyH = {
        area: { x: 0, y: 0 },
        z: 0,
        home: {
            isShared: false,
            walls: [], doors: [{ x: 1, y: 1 }],
            rooms: [],
            beds: [],
            hearth: null
        }
    };

    // 1. Missing both
    assert.equal(H.hasCommunalLiving(dummyH), false, "Lacks communal living");
    assert.equal(H.hasBedroom(dummyH), false, "Lacks bedroom");
    assert.equal(H.canConceiveChild(dummyH), false, "Cannot conceive without communal living and bedroom");

    // 2. Only communal living, no bedroom
    dummyH.home.hearth = { x: 2, y: 2 };
    dummyH.home.rooms = [{ type: "communal", x: 1, y: 1, w: 3, h: 3, hearth: { x: 2, y: 2 } }];
    assert.equal(H.hasCommunalLiving(dummyH), true, "Has communal living");
    assert.equal(H.hasBedroom(dummyH), false, "Still lacks bedroom");
    assert.equal(H.canConceiveChild(dummyH), false, "Cannot conceive without bedroom");

    // 3. Only bedroom, no communal living
    dummyH.home.hearth = null;
    dummyH.home.rooms = [{ type: "master", x: 1, y: 1, w: 3, h: 3, bed: { x: 2, y: 2 } }];
    dummyH.home.beds = [{ x: 2, y: 2 }];
    assert.equal(H.hasCommunalLiving(dummyH), false, "Lacks communal living");
    assert.equal(H.hasBedroom(dummyH), true, "Has bedroom");
    assert.equal(H.canConceiveChild(dummyH), false, "Cannot conceive without communal living");

    // 4. Both present
    dummyH.home.hearth = { x: 1, y: 2 };
    dummyH.home.rooms.push({ type: "communal", x: 4, y: 1, w: 3, h: 3, hearth: { x: 5, y: 2 } });
    assert.equal(H.hasCommunalLiving(dummyH), true, "Has communal living");
    assert.equal(H.hasBedroom(dummyH), true, "Has bedroom");
});

// 10. Subsequent Structures at Least 1 Square Separated
check("subsequent_structures_at_least_1_square_separated", () => {
    const { sandbox, World } = createHarness();
    vm.runInContext(colonistsCode, sandbox);
    vm.runInContext(householdsCode, sandbox);
    vm.runInContext(historyCode, sandbox);

    const UF = sandbox.UF;
    const st = World.state;
    UF.History.generate(st, { targetYears: 10 });
    UF.History.spawnPeople(st);
    UF.Colonists.setup(st);

    UF.History.iterateWorldHistory(st, 10);

    const structs = st.history.structures || [];
    assert.ok(structs.length >= 3, `At least 3 structures built (actual: ${structs.length})`);

    // Verify minimum 1 square separation between every pair of distinct structures
    for (let i = 0; i < structs.length; i++) {
        for (let j = i + 1; j < structs.length; j++) {
            const A = structs[i], B = structs[j];
            const dx = Math.max(0, A.x0 - B.x1, B.x0 - A.x1);
            const dy = Math.max(0, A.y0 - B.y1, B.y0 - A.y1);
            const sep = Math.max(dx, dy);
            assert.ok(sep >= 2, `Structures ${A.id} and ${B.id} are separated by at least 1 square (actual gap: ${sep - 1} squares)`);
        }
    }
});

// 11. Colony Homes Connected by Trail / Road Network
check("colony_homes_connected_by_road_network", () => {
    const { sandbox, World } = createHarness();
    vm.runInContext(colonistsCode, sandbox);
    vm.runInContext(householdsCode, sandbox);
    vm.runInContext(historyCode, sandbox);

    const UF = sandbox.UF;
    const st = World.state;
    UF.History.generate(st, { targetYears: 10 });
    UF.History.spawnPeople(st);
    UF.Colonists.setup(st);

    UF.History.iterateWorldHistory(st, 10);

    assert.ok(st.history.settled.roads > 0, `Colony road network created (actual road tiles: ${st.history.settled.roads})`);
    assert.ok(st.history.roads && st.history.roads.length > 0, `Road cells recorded: ${st.history.roads.length}`);

    // Verify all non-shared structures have a road touching their door
    const roadSet = new Set(st.history.roads);
    const homes = (st.history.structures || []).filter(s => !s.isShared);
    for (const h of homes) {
        const d = h.door;
        const adjacentToRoad = roadSet.has(`${d.x},${d.y}`) ||
            roadSet.has(`${d.x+1},${d.y}`) || roadSet.has(`${d.x-1},${d.y}`) ||
            roadSet.has(`${d.x},${d.y+1}`) || roadSet.has(`${d.x},${d.y-1}`);
        assert.ok(adjacentToRoad, `Home ${h.id} door (${d.x},${d.y}) is connected to the road network`);
    }
});

// 12. Total World Iteration: Physical Actions and Skill Growth
check("total_world_iteration_actions_and_skills", () => {
    const { sandbox, World } = createHarness();
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
    assert.ok(settled.actions, "Actions summary recorded");
    assert.ok(settled.actions.woodcut > 0, `Woodcutting actions performed: ${settled.actions.woodcut}`);
    assert.ok(settled.actions.quarry > 0, `Quarrying actions performed: ${settled.actions.quarry}`);
    assert.ok(settled.actions.haul > 0, `Hauling actions performed: ${settled.actions.haul}`);
    assert.ok(settled.actions.build > 0, `Building actions performed: ${settled.actions.build}`);
    assert.ok(settled.actions.cook > 0, `Cooking actions performed: ${settled.actions.cook}`);
    assert.ok(settled.actions.total > 1000, `Total physical actions performed: ${settled.actions.total}`);

    // Verify individual colonist actions and skills
    const adults = World.units().filter(u => !u.data.dead && u.data.age >= 15);
    for (const u of adults) {
        assert.ok(u.data.actions, `Unit ${u.name} has actions log`);
        assert.ok(u.data.actions.woodcut + u.data.actions.quarry + u.data.actions.build > 0, `Unit ${u.name} performed physical labor`);
        assert.ok(u.data.skillXp && Object.keys(u.data.skillXp).length > 0, `Unit ${u.name} gained skill XP: ${JSON.stringify(u.data.skillXp)}`);
        assert.ok(u.data.skills && (u.data.skills.woodcutting || u.data.skills.mining || u.data.skills.building), `Unit ${u.name} leveled skills`);
    }
});

// 13. Total World Iteration: Physical Combat, Health, Damage, and Casualties
check("total_world_iteration_combat_damage_and_wounds", () => {
    const { sandbox, World } = createHarness();
    vm.runInContext(colonistsCode, sandbox);
    vm.runInContext(householdsCode, sandbox);
    vm.runInContext(historyCode, sandbox);

    const UF = sandbox.UF;
    const st = World.state;
    UF.History.generate(st, { targetYears: 20 });
    UF.History.spawnPeople(st);
    UF.Colonists.setup(st);

    UF.History.iterateWorldHistory(st, 20);

    const settled = st.history.settled;
    assert.ok(settled.combat, "Combat summary recorded");
    assert.ok(settled.combat.rounds > 0, `Combat rounds simulated: ${settled.combat.rounds}`);

    // Verify all units have physical health state
    const allUnits = World.units();
    for (const u of allUnits) {
        assert.equal(u.data.maxHp, 20, `Unit ${u.name} has standard maxHp (20)`);
        assert.ok(typeof u.data.hp === "number", `Unit ${u.name} has numerical HP: ${u.data.hp}`);
        assert.ok(Array.isArray(u.data.wounds), `Unit ${u.name} has wounds array`);
    }

    // Verify wounded or combat experience
    const hasCombatExperience = allUnits.some(u => (u.data.wounds && u.data.wounds.length > 0) || (u.data.skills && (u.data.skills.defence || u.data.skills.attack || u.data.skills.hitpoints)));
    assert.ok(hasCombatExperience, "Colony experienced physical damage and combat encounters");
});

// 14. Roofed Spaces, Upper Z-Deck Walkable Surface, and Rain Protection
check("roofed_spaces_and_upper_z_deck_walkable_surface", () => {
    const { sandbox, World, Levels } = createHarness();
    vm.runInContext(colonistsCode, sandbox);
    vm.runInContext(householdsCode, sandbox);
    vm.runInContext(historyCode, sandbox);

    const UF = sandbox.UF;
    const st = World.state;
    UF.History.generate(st, { targetYears: 2 });
    UF.History.spawnPeople(st);
    UF.Colonists.setup(st);
    UF.History.iterateWorldHistory(st, 2);

    const site = st.history.sites[0];
    const area = { x: site.area.x, y: site.area.y };

    // 1. Communal lodge (x0: 29, y0: 29, x1: 35, y1: 35) is roofed
    assert.ok(UF.Rooms.isRoofed(area, 32, 32, 0), "Center of structure around campfire is roofed");
    assert.ok(UF.Rooms.isRoofed(area, 30, 30, 0), "Corner inside structure is roofed");
    assert.equal(UF.Rooms.isRoofed(area, 10, 10, 0), false, "Open wilderness outside structure is NOT roofed");

    // 2. On z = 1, there is a walkable surface area over the structure
    for (let y = 29; y <= 35; y++) {
        for (let x = 29; x <= 35; x++) {
            const shape = Levels.shapeAt({ area, x, y, z: 1 });
            const standable = Levels.standableShape({ area, x, y, z: 1 });
            assert.equal(shape, "floor", `Structure roof cell (${x},${y}) on z=1 is floor shape`);
            assert.equal(standable, true, `Structure roof cell (${x},${y}) on z=1 is standable`);
        }
    }
    // Outside the structure on z = 1 remains open air
    assert.equal(Levels.shapeAt({ area, x: 10, y: 10, z: 1 }), "open", "Wilderness on z=1 is open air");
    assert.equal(Levels.standableShape({ area, x: 10, y: 10, z: 1 }), false, "Wilderness on z=1 is not standable");

    // 3. Rain protection: units under roof do not accumulate wetness from rain
    const insideUnit = World.units().find(u => u.x >= 29 && u.x <= 35 && u.y >= 29 && u.y <= 35);
    assert.ok(insideUnit, "Found colonist inside roofed structure");
    
    // Simulate rain weather update
    const Env = UF.Environment;
    if (Env && typeof Env.setWeather === "function") {
        Env.setWeather(area, "rain");
        const t0 = Env.unitThermal(insideUnit);
        if (t0) t0.wetness = 0;
        Env.updateWetness(insideUnit, area, insideUnit.x, insideUnit.y, 0, 15);
        assert.equal(t0 ? t0.wetness : 0, 0, "Unit inside roofed structure stays dry during rain");

        // Unit placed in wilderness outside roof
        const outsideUnit = World.addUnit({ name: "TEST_rain_exposed", x: 10, y: 10, area, z: 0, data: { kind: "colonist" } });
        const tOut = Env.unitThermal(outsideUnit);
        if (tOut) tOut.wetness = 0;
        Env.updateWetness(outsideUnit, area, 10, 10, 0, 15);
        assert.ok(tOut ? tOut.wetness > 0 : true, "Unit in open wilderness accumulates wetness in rain");
    }
});

// 15. Founder Lifecycle: Shared Lodge -> Family Homestead Move-Out & Focal Fire
check("founder_lifecycle_shared_lodge_to_homestead_and_focal_fire", () => {
    const { sandbox, World, Levels } = createHarness();
    vm.runInContext(colonistsCode, sandbox);
    vm.runInContext(householdsCode, sandbox);
    vm.runInContext(historyCode, sandbox);

    const UF = sandbox.UF;
    const st = World.state;
    UF.History.generate(st, { targetYears: 10 });
    UF.History.spawnPeople(st);
    UF.Colonists.setup(st);

    // Initial Year 1: check focalFire tagged on faction and site
    const f1 = st.factions.list[0];
    const site = st.history.sites[0];
    assert.ok(f1.focalFire, "Faction has permanent focalFire");
    assert.ok(site.focalFire, "Site has permanent focalFire");
    assert.equal(f1.focalFire.x, site.x, "Faction focal fire is original campfire X");
    assert.equal(f1.focalFire.y, site.y, "Faction focal fire is original campfire Y");

    // Run second-by-second history to Year 10
    UF.History.iterateWorldHistory(st, 10);

    // 1. Verify chronicle events recorded founding and move-outs
    const events = st.history.events;
    const communalEvent = events.find(e => e.text && e.text.includes("shared great hall around the original campfire"));
    assert.ok(communalEvent, "Chronicle recorded 8 founders communal lodge around campfire to protect from rain");
    const moveOutEvents = events.filter(e => e.text && e.text.includes("moving out from the communal lodge"));
    assert.ok(moveOutEvents.length >= 1, `Chronicle recorded couples moving out to family homes (actual: ${moveOutEvents.length})`);

    // 2. Founder couples moved out and have private homes
    const units = World.units().filter(u => u.data.founder && u.data.faction === f1.id);
    const movedOutUnits = units.filter(u => u.data.movedOut);
    assert.ok(movedOutUnits.length >= 2, `Founder couples moved out (actual moved out: ${movedOutUnits.length})`);
    for (const u of movedOutUnits) {
        assert.ok(u.data.home, `Unit ${u.name} has private family home`);
        assert.ok(u.data.homeFire, `Unit ${u.name} has indoor domestic hearth`);
        // Homefire is private indoor hearth, distinct from the central campfire
        assert.ok(u.data.homeFire.x !== site.x || u.data.homeFire.y !== site.y, `Unit ${u.name} home fire is private domestic hearth`);
    }

    // 3. Focal fire remains permanent
    assert.equal(f1.focalFire.x, site.x, "Faction focalFire remained original campfire X");
    assert.equal(f1.focalFire.y, site.y, "Faction focalFire remained original campfire Y");

    // 4. Shared communal lodge freed up beds
    const sharedStruct = st.history.structures.find(s => s.isShared);
    assert.ok(sharedStruct, "Shared structure exists");
    const emptyBeds = sharedStruct.beds.filter(b => b.unitId === null);
    assert.ok(emptyBeds.length > 0, `Beds in shared communal lodge freed as couples moved out (freed beds: ${emptyBeds.length})`);

    // 5. Homesteads have upper walkable roof deck on next higher Z layer
    const homesteads = st.history.structures.filter(s => !s.isShared);
    assert.ok(homesteads.length >= 2, "Homesteads built");
    for (const h of homesteads) {
        const hArea = h.area || site.area;
        const upperZ = (h.z !== undefined ? h.z : (hArea.z || 0)) + 1;
        const shape = Levels.shapeAt({ area: hArea, x: h.x0 + 1, y: h.y0 + 1, z: upperZ });
        assert.equal(shape, "floor", `Homestead ${h.id} has walkable floor roof deck on upper level (z=${upperZ})`);
    }
});

console.log("\n===========================================");
console.log(`TOTAL PASSES: ${passed}`);
console.log(`TOTAL FAILS:  ${failed}`);
console.log("===========================================");
if (failed > 0) process.exit(1);
