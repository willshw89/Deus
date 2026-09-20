"use strict";
// Standalone VM test suite for Faction Reproduction, Mating, Childbirth, Population Growth, and Generational Aging.
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert/strict");
const root = path.resolve(__dirname, "..");

let sourceColonists = fs.readFileSync(path.join(root, "game/js/plugins/UF_Colonists.js"), "utf8");
let sourceFactions = fs.readFileSync(path.join(root, "game/js/plugins/UF_Factions.js"), "utf8");
let sourceGoals = fs.readFileSync(path.join(root, "game/js/plugins/UF_Goals.js"), "utf8");

const mutant = process.argv.find(a => a.startsWith("--mutant="));
if (mutant && mutant.endsWith("=room_gate")) {
    sourceColonists = sourceColonists.replace(
        'if (!privatePairRoom(u1, u2, true) || chebyshev(u1.x, u1.y, u2.x, u2.y) > 1) return false;',
        'if (chebyshev(u1.x, u1.y, u2.x, u2.y) > 1) return false;'
    );
}
if (mutant && mutant.endsWith("=npc_sterile")) {
    sourceColonists = sourceColonists.replace(
        'if (!isSettler(u) && !(u.data.kind === "person" && u.data.faction)) return false;',
        'if (!isSettler(u)) return false;'
    );
}
if (mutant && mutant.endsWith("=pop_frozen")) {
    sourceColonists = sourceColonists.replace(
        'if (f) f.population = (f.population || 0) + 1;',
        '// population frozen mutant'
    );
}
if (mutant && mutant.endsWith("=aging_frozen")) {
    sourceColonists = sourceColonists.replace(
        'for (const u of allFactionPeople()) {',
        'for (const u of simulationUnits()) {'
    );
}

const catalog = JSON.parse(fs.readFileSync(path.join(root, "game/data/UF_WorldCatalog.json"), "utf8"));

let passed = 0, failed = 0;
function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`PASS faction_reproduction.${name}`);
    } catch (e) {
        failed++;
        console.error(`FAIL faction_reproduction.${name}: ${e.message}`);
    }
}

function createHarness() {
    const units = [];
    const events = new Map();
    let unitIdCounter = 100;
    let _ticks = 1000;

    class Base {
        start() {}
        update() {}
    }

    const context = {
        console,
        PluginManager: {
            parameters: () => ({})
        },
        Rectangle: class {
            constructor(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; }
        },
        Game_Map: class extends Base {},
        Scene_Boot: class extends Base {},
        Scene_Map: class extends Base {
            createAllWindows() {}
        },
        Window_Base: class extends Base {
            contentsWidth() { return 600; }
            contentsHeight() { return 400; }
            drawText() {}
            changeTextColor() {}
            resetTextColor() {}
        },
        Input: {
            keyMapper: {}
        },
        Graphics: {
            boxWidth: 800,
            boxHeight: 600
        },
        ColorManager: {
            systemColor: () => "#ffffff",
            crisisColor: () => "#ff0000"
        },
        SceneManager: {
            _scene: null
        },
        DataManager: {
            extractSaveContents() {},
            makeSaveContents() { return {}; }
        },
        $ufWorldCatalog: catalog,
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 12, minute: 0, dateString: "1-0-1" },
        JsonEx: {
            stringify: JSON.stringify,
            parse: JSON.parse
        },
        UF: {
            Events: {
                on: (name, fn) => {
                    if (!events.has(name)) events.set(name, []);
                    events.get(name).push(fn);
                },
                off: (name, fn) => {
                    if (events.has(name)) {
                        events.set(name, events.get(name).filter(f => f !== fn));
                    }
                },
                emit: (name, ...args) => {
                    for (const fn of (events.get(name) || []).slice()) {
                        try { fn(...args); } catch (e) { console.error(`Event ${name} error:`, e); }
                    }
                }
            },
            Time: {
                ticks: () => _ticks
            },
            Visuals: {
                bark: () => {}
            },
            World: {
                EVENT_BASE: 1000,
                _frame: 100,
                state: {
                    seed: 777123,
                    size: 64,
                    areasX: 2,
                    areasY: 2,
                    startArea: { x: 0, y: 0 },
                    factions: {
                        version: 4,
                        playerId: "f1",
                        list: [
                            { id: "f1", name: "The Player Colony", species: "human", isPlayer: true, met: true, population: 4 },
                            { id: "f2", name: "The Mountain Clan", species: "dwarf", isPlayer: false, met: true, population: 4 },
                            { id: "f3", name: "The Sylvan Grove", species: "elf", isPlayer: false, met: false, population: 4 }
                        ],
                        relations: {},
                        log: []
                    },
                    colony: {
                        siteId: 1,
                        factionId: "f1",
                        area: { x: 0, y: 0 },
                        site: { x: 30, y: 30 },
                        radius: 10,
                        plan: []
                    }
                },
                hash32: (...parts) => {
                    let h = 2166136261 >>> 0;
                    for (const p of parts) {
                        let v = (p || 0) >>> 0;
                        for (let i = 0; i < 4; i++) {
                            h ^= v & 255;
                            h = Math.imul(h, 16777619) >>> 0;
                            v >>>= 8;
                        }
                    }
                    return h >>> 0;
                },
                mulberry32: a => () => {
                    a = (a + 0x6D2B79F5) | 0;
                    let t = Math.imul(a ^ (a >>> 15), 1 | a);
                    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                },
                inWorld: () => true,
                currentArea: () => ({ x: 0, y: 0 }),
                units: () => units,
                unit: id => units.find(u => u.id === id),
                unitsInArea: (ax, ay) => units.filter(u => u.area && u.area.x === ax && u.area.y === ay),
                addUnit: spec => {
                    const u = {
                        id: ++unitIdCounter,
                        name: spec.name || `Unit_${unitIdCounter}`,
                        image: Object.assign({}, spec.image),
                        area: Object.assign({ x: 0, y: 0 }, spec.area),
                        z: spec.z || 0,
                        x: spec.x,
                        y: spec.y,
                        dir: spec.dir || 2,
                        data: Object.assign({}, spec.data)
                    };
                    units.push(u);
                    return u;
                },
                removeUnit: id => {
                    const idx = units.findIndex(u => u.id === id);
                    if (idx >= 0) {
                        const [u] = units.splice(idx, 1);
                        context.UF.Events.emit("world:unitRemoved", u);
                        return u;
                    }
                    return null;
                },
                eventOf: () => null
            },
            Jobs: {
                _handlers: {},
                define: function(type, handler) { this._handlers[type] = handler; },
                handler: function(type) { return this._handlers[type]; },
                standable: (area, x, y) => x >= 0 && x < 64 && y >= 0 && y < 64,
                of: () => null
            },
            Items: {
                type: () => null,
                get: () => null
            },
            Objects: {
                atIn: () => null,
                findIn: () => []
            },
            Households: {
                roomForPair: (a, b) => a && b && a.data && a.data.kind === "colonist" ? { cells: [{ x: 30, y: 30 }, { x: 31, y: 30 }] } : null,
                formPair: (u1, u2) => {
                    u1.data.partnerId = u2.id;
                    u2.data.partnerId = u1.id;
                },
                reconcile: () => {}
            }
        }
    };
    context.window = context;

    vm.createContext(context);
    // Execute UF_Factions
    vm.runInContext(sourceFactions, context);
    // Execute UF_Goals
    vm.runInContext(sourceGoals, context);
    // Execute UF_Colonists
    vm.runInContext(sourceColonists, context);

    return {
        context,
        advanceDay: () => {
            context.$ufTime.day++;
            _ticks += 2400;
            context.UF.Events.emit("time:day", context.$ufTime.day, "Spring", context.$ufTime.year);
        },
        setTicks: t => { _ticks = t; }
    };
}

console.log(`\n=== Running Faction Reproduction Test Suite ${mutant ? `[MUTANT: ${mutant}]` : ""} ===`);

const harness = createHarness();
const { context, advanceDay } = harness;
const W = context.UF.World;
const C = context.UF.Colonists;
const F = context.UF.Factions;
const G = context.UF.Goals;

// 1. Colonist mating in private bedroom (V78)
check("colonist_bedroom_mating", () => {
    // Spawn 1 male and 1 female colonist in their private bedroom
    const male = W.addUnit({
        name: "Adam",
        x: 30, y: 30,
        data: { kind: "colonist", faction: "f1", species: "human", gender: "male", age: 25, stage: "adult", needs: { hunger: 10, thirst: 10, sleep: 10 } }
    });
    const female = W.addUnit({
        name: "Eve",
        x: 31, y: 30,
        data: { kind: "colonist", faction: "f1", species: "human", gender: "female", age: 24, stage: "adult", needs: { hunger: 10, thirst: 10, sleep: 10 }, _forceConceive: true }
    });

    assert.ok(context.UF.Households.roomForPair(male, female), "Pair should have private bedroom");
    assert.equal(C._internal.eligibleForIntimacy(male), true, "Male should be eligible for intimacy");
    assert.equal(C._internal.eligibleForIntimacy(female), true, "Female should be eligible for intimacy");

    const mated = C.onMated(male, female);
    assert.equal(mated, true, "Colonists should mate in private bedroom");
    assert.ok(female.data.pregnancy, "Female should conceive pregnancy");
    assert.equal(female.data.pregnancy.fatherId, male.id, "Pregnancy fatherId must match male");
    assert.equal(female.data.pregnancy.daysLeft, 3, "Pregnancy daysLeft starts at 3");
});

// 2. NPC Faction Autonomous Reproduction
check("npc_faction_autonomous_reproduction", () => {
    // Spawn NPC faction dwarves at site
    const dwarfM = W.addUnit({
        name: "Thorin",
        x: 10, y: 10,
        data: { kind: "person", ai: "wander", faction: "f2", site: 2, species: "dwarf", gender: "male", age: 30, stage: "adult" }
    });
    const dwarfF = W.addUnit({
        name: "Dis",
        x: 11, y: 10,
        data: { kind: "person", ai: "wander", faction: "f2", site: 2, species: "dwarf", gender: "female", age: 28, stage: "adult", _forceConceive: true }
    });

    assert.equal(C._internal.eligibleForIntimacy(dwarfM), true, "NPC dwarf male should be eligible for intimacy");
    assert.equal(C._internal.eligibleForIntimacy(dwarfF), true, "NPC dwarf female should be eligible for intimacy");

    const result = C.stepFactionReproduction();
    assert.ok(result.mated >= 1, `NPC faction should have mated (mated: ${result.mated})`);
    assert.ok(dwarfF.data.pregnancy, "NPC dwarf female should now be pregnant");
    assert.equal(dwarfF.data.pregnancy.fatherId, dwarfM.id, "Pregnancy fatherId must match NPC partner");
});

// 3. Worldwide Pregnancy Progression
check("worldwide_pregnancy_progression", () => {
    const pregnantFemales = W.units().filter(u => u.data && u.data.pregnancy);
    assert.ok(pregnantFemales.length >= 2, "Should have at least 2 pregnant females across factions");

    const beforeDays = pregnantFemales.map(u => u.data.pregnancy.daysLeft);
    C.progressPregnancies();
    pregnantFemales.forEach((u, i) => {
        assert.equal(u.data.pregnancy.daysLeft, beforeDays[i] - 1, `Pregnancy for ${u.name} should decrement daysLeft`);
    });
});

// 4. Childbirth and Live Population Increment
check("birth_and_population_increment", () => {
    const dwarfF = W.units().find(u => u.name === "Dis");
    assert.ok(dwarfF && dwarfF.data.pregnancy, "Dis should be pregnant");

    const fRecord = F.get("f2");
    const initialPop = fRecord.population;

    // Advance pregnancy to completion
    dwarfF.data.pregnancy.daysLeft = 1;
    C.progressPregnancies(); // decrements to 0 -> giveBirth

    assert.equal(dwarfF.data.pregnancy, undefined, "Pregnancy should be cleared on birth");
    const baby = W.units().find(u => u.data && u.data.motherId === dwarfF.id);
    assert.ok(baby, "Baby unit should be spawned in world");
    assert.equal(baby.data.faction, "f2", "Baby faction must match mother");
    assert.equal(baby.data.species, "dwarf", "Baby species must match mother");
    assert.equal(baby.data.stage, "baby", "Baby stage must be 'baby'");
    assert.equal(baby.data.age, 0, "Baby age must be 0");
    assert.equal(baby.image.characterName, "$Baby", "Baby image must be $Baby");

    assert.equal(fRecord.population, initialPop + 1, `Faction f2 population must increment from ${initialPop} to ${initialPop + 1}`);
});

// 5. Destiny Assigned to Offspring
check("destiny_assigned_to_offspring", () => {
    const baby = W.units().find(u => u.data && u.data.stage === "baby");
    assert.ok(baby, "Should find newborn baby");
    assert.ok(baby.data.destiny, "Baby must have a life Destiny assigned");
    assert.ok(baby.data.destiny.title, "Destiny must have a title");
    assert.ok(baby.data.destiny.motto, "Destiny must have a motto");
});

// 6. Generational Aging to Adulthood
check("generational_aging_to_adulthood", () => {
    const baby = W.units().find(u => u.data && u.data.stage === "baby");
    assert.ok(baby, "Should find newborn baby");

    // Advance baby to age 1
    baby.data.ageDays = 6;
    C.progressAging();
    assert.equal(baby.data.age, 1, "Baby should reach age 1");
    assert.equal(baby.data.stage, "baby", "Age 1 should remain baby");
    assert.equal(baby.image.characterName, "$Baby", "Age 1 sprite should be $Baby");

    // Advance to age 5 (child)
    baby.data.age = 4;
    baby.data.ageDays = 6;
    C.progressAging();
    assert.equal(baby.data.age, 5, "Should advance to age 5");
    assert.equal(baby.data.stage, "child", "Age 5 should be child");
    const expectedChildSprite = baby.data.gender === "male" ? "$Child_Boy" : "$Child_Girl";
    assert.equal(baby.image.characterName, expectedChildSprite, `Child sprite should be ${expectedChildSprite}`);

    // Advance to age 15 (teen)
    baby.data.age = 14;
    baby.data.ageDays = 6;
    C.progressAging();
    assert.equal(baby.data.age, 15, "Should advance to age 15");
    assert.equal(baby.data.stage, "teen", "Age 15 should be teen");
    const expectedTeenSprite = baby.data.gender === "male" ? "$Teen_Boy" : "$Teen_Girl";
    assert.equal(baby.image.characterName, expectedTeenSprite, `Teen sprite should be ${expectedTeenSprite}`);

    // Advance to age 18 (adult!)
    baby.data.age = 17;
    baby.data.ageDays = 6;
    C.progressAging();
    assert.equal(baby.data.age, 18, "Should advance to age 18");
    assert.equal(baby.data.stage, "adult", "Age 18 should be adult");
    assert.equal(C._internal.eligibleForIntimacy(baby), true, "Age 18 adult should now be eligible for reproduction!");
});

// 7. Casualty Population Decrement
check("casualty_population_decrement", () => {
    const fRecord = F.get("f2");
    const popBefore = fRecord.population;
    const dwarfM = W.units().find(u => u.name === "Thorin");
    assert.ok(dwarfM, "Thorin should exist");

    // Simulate combat kill
    context.UF.Events.emit("combat:kill", { target: dwarfM });
    assert.equal(fRecord.population, popBefore - 1, `Faction population should decrement on casualty (from ${popBefore} to ${popBefore - 1})`);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
