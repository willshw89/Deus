"use strict";
// Standalone VM test suite for UF_Ecology: renewable flora, sapling growth, plant spreading, herd breeding, and finite minerals.
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert/strict");
const root = path.resolve(__dirname, "..");

let source = fs.readFileSync(path.join(root, "game/js/plugins/UF_Ecology.js"), "utf8");
const mutant = process.argv.find(a => a.startsWith("--mutant="));
if (mutant && mutant.endsWith("=finite")) {
    source = source.replace('if (tags.some(t => ["building", "mineral", "ore", "gem", "stone", "ruin"].includes(t))) return false;', '// bypass')
                   .replace('if (!tags.some(t => t === "tree" || t === "bush" || t === "plant" || t === "sapling" || t === "flower")) return false;', 'return true;');
}
if (mutant && mutant.endsWith("=sapling")) {
    source = source.replace('O.setIn(e.area, e.x, e.y, e.to)', 'false');
}
if (mutant && mutant.endsWith("=breeding")) {
    source = source.replace('const canBreed = count >= 2;', 'const canBreed = false;');
}
if (mutant && mutant.endsWith("=spread")) {
    source = source.replace('if (!o.force && rng() >= spreadRate) continue;', 'continue;');
}

const catalog = JSON.parse(fs.readFileSync(path.join(root, "game/data/UF_WorldCatalog.json"), "utf8"));

let passed = 0, failed = 0;
function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`PASS ecology.${name}`);
    } catch (e) {
        failed++;
        console.error(`FAIL ecology.${name}: ${e.message}`);
    }
}

function createHarness() {
    const units = [];
    const objectsGrid = new Map(); // "ax,ay,z,x,y" -> id
    const events = new Map();
    let unitIdCounter = 1;
    let currentHour = 100;

    class Base {
        start() {}
    }
    const context = {
        console,
        Scene_Boot: class extends Base {},
        Scene_Map: class extends Base {},
        DataManager: {
            extractSaveContents() {},
            makeSaveContents() {
                return { ufWorld: context.UF.World.state };
            }
        },
        $ufWorldCatalog: catalog,
        $ufTime: { year: 1, monthIndex: 0, day: 5, hour: 10, minute: 0 },
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
                emit: (name, ...args) => {
                    for (const fn of events.get(name) || []) fn(...args);
                }
            },
            World: {
                state: {
                    seed: 123456,
                    size: 64,
                    areasX: 2,
                    areasY: 2,
                    startArea: { x: 0, y: 0 },
                    ecology: null
                },
                inWorld: (ax, ay) => ax >= 0 && ax < 2 && ay >= 0 && ay < 2,
                currentArea: () => ({ x: 0, y: 0 }),
                units: () => units,
                unit: id => units.find(u => u.id === id),
                unitsInArea: (ax, ay) => units.filter(u => u.area && u.area.x === ax && u.area.y === ay),
                standerAt: (ax, ay, x, y) => units.find(u => u.area && u.area.x === ax && u.area.y === ay && u.x === x && u.y === y && !(u.data && u.data.through)) || null,
                cellFree: (ax, ay, x, y) => {
                    const key = `${ax},${ay},0,${x},${y}`;
                    const objId = objectsGrid.get(key);
                    if (objId) {
                        const type = catalog.objects.find(o => o.id === objId);
                        if (type && !type.passable) return false;
                    }
                    const stander = units.find(u => u.area && u.area.x === ax && u.area.y === ay && u.x === x && u.y === y && !(u.data && u.data.through));
                    return !stander;
                },
                getObject: (ax, ay, x, y, z) => {
                    const key = `${ax},${ay},${z || 0},${x},${y}`;
                    const id = objectsGrid.get(key);
                    if (!id) return 0;
                    const idx = catalog.objects.findIndex(o => o.id === id);
                    return idx >= 0 ? idx + 1 : 0;
                },
                setObject: (ax, ay, x, y, typeNum, z) => {
                    const key = `${ax},${ay},${z || 0},${x},${y}`;
                    if (typeNum === 0 || !typeNum) {
                        objectsGrid.delete(key);
                    } else {
                        const obj = catalog.objects[typeNum - 1];
                        if (obj) objectsGrid.set(key, obj.id);
                    }
                    return true;
                },
                addUnit: spec => {
                    const u = Object.assign({ id: unitIdCounter++ }, spec);
                    units.push(u);
                    context.UF.Events.emit("world:unitAdded", u);
                    return u;
                },
                removeUnit: id => {
                    const idx = units.findIndex(u => u.id === id);
                    if (idx >= 0) {
                        const u = units.splice(idx, 1)[0];
                        context.UF.Events.emit("world:unitRemoved", u);
                        return true;
                    }
                    return false;
                }
            },
            WorldGen: {
                cellInfo: (gx, gy) => ({
                    biomeId: "conifer_forest",
                    walkable: true,
                    water: false
                })
            },
            Objects: {
                type: idOrNum => {
                    if (!idOrNum) return null;
                    if (typeof idOrNum === "number") return catalog.objects[idOrNum - 1] || null;
                    return catalog.objects.find(o => o.id === idOrNum) || null;
                },
                atIn: (area, x, y, z) => {
                    const key = `${area.x},${area.y},${z || 0},${x},${y}`;
                    const id = objectsGrid.get(key);
                    return id ? catalog.objects.find(o => o.id === id) || null : null;
                },
                setIn: (area, x, y, idOrNum, z) => {
                    const key = `${area.x},${area.y},${z || 0},${x},${y}`;
                    const fromId = objectsGrid.get(key) || null;
                    let toId = null;
                    if (typeof idOrNum === "number") {
                        const obj = catalog.objects[idOrNum - 1];
                        toId = obj ? obj.id : null;
                    } else {
                        toId = idOrNum;
                    }
                    if (toId) objectsGrid.set(key, toId);
                    else objectsGrid.delete(key);
                    context.UF.Events.emit("objects:changed", { x: area.x, y: area.y }, x, y, fromId, toId);
                    return true;
                },
                applyIn: (area, x, y, action, actor) => {
                    const key = `${area.x},${area.y},0,${x},${y}`;
                    const id = objectsGrid.get(key);
                    const obj = id ? catalog.objects.find(o => o.id === id) : null;
                    if (!obj || !obj.actions || !obj.actions[action]) return null;
                    const a = obj.actions[action];
                    const toId = a.becomes === undefined ? null : a.becomes;
                    context.UF.Objects.setIn(area, x, y, toId);
                    return { ok: true, action, area, x, y, from: id, to: toId, yields: a.yields || {} };
                },
                findIn: (area, opts) => {
                    const list = [];
                    for (const [key, id] of objectsGrid.entries()) {
                        const [ax, ay, z, x, y] = key.split(",").map(Number);
                        if (ax === area.x && ay === area.y) {
                            const type = catalog.objects.find(o => o.id === id);
                            if (type) list.push({ x, y, type });
                        }
                    }
                    return list;
                },
                hourNow: () => currentHour,
                regrowList: () => []
            },
            Wildlife: {
                species: () => catalog.wildlife.species,
                speciesById: id => catalog.wildlife.species.find(s => s.id === id),
                allowedAt: (spId, gx, gy) => true,
                camps: () => [],
                kitConfig: () => ({ predatorFree: 20 }),
                unitSpec: (sp, area, x, y, herd, dir, home, extra) => ({
                    name: sp.name,
                    image: { characterName: sp.image || "$UF_Stock_Nature_3", characterIndex: 0 },
                    area: { x: area.x, y: area.y },
                    x, y, dir: dir || 2,
                    data: Object.assign({
                        kind: "creature",
                        species: sp.id,
                        ai: "wander",
                        herd: herd || 1,
                        home: home || { x, y }
                    }, extra)
                })
            }
        }
    };

    context.window = context;
    vm.createContext(context);
    vm.runInContext(source, context);
    new context.Scene_Boot().start();

    return {
        context,
        E: context.UF.Ecology,
        O: context.UF.Objects,
        W: context.UF.World,
        wild: context.UF.Wildlife,
        events,
        setHour: h => { currentHour = h; },
        getHour: () => currentHour,
        objectsGrid,
        units
    };
}

// 1. Renewable vs Finite integrity
check("renewable_vs_finite", () => {
    const h = createHarness();
    assert.ok(h.E.isRenewableObject("oak"), "oak tree should be renewable");
    assert.ok(h.E.isRenewableObject("bush"), "bush should be renewable");
    assert.ok(h.E.isRenewableObject("berry_bush"), "berry bush should be renewable");
    assert.ok(h.E.isRenewableObject("grass_tuft"), "grass tuft should be renewable");
    assert.ok(h.E.isRenewableObject("glow_caps"), "glow caps should be renewable");
    assert.ok(h.E.isRenewableObject("sapling"), "sapling should be renewable");

    assert.ok(!h.E.isRenewableObject("ironstone"), "ironstone must be finite");
    assert.ok(!h.E.isRenewableObject("copper_ore"), "copper ore must be finite");
    assert.ok(!h.E.isRenewableObject("gold_ore"), "gold ore must be finite");
    assert.ok(!h.E.isRenewableObject("rocks_small"), "rock piles must be finite");
    assert.ok(!h.E.isRenewableObject("crystal"), "crystals must be finite");
    assert.ok(!h.E.isRenewableObject("dead_tree"), "dead trees are not renewable");
});

// 2. Felled tree and sapling lifecycle
check("tree_and_sapling_lifecycle", () => {
    const h = createHarness();
    const area = { x: 0, y: 0 };
    h.O.setIn(area, 10, 10, "oak");
    const chopRes = h.O.applyIn(area, 10, 10, "chop", "TEST");
    assert.equal(chopRes.to, "stump", "chopping tree should produce stump");

    const res = h.E.resources().find(r => r.x === 10 && r.y === 10);
    assert.ok(res, "stump must be scheduled for ecological regrowth");

    // Hold when occupied by standing unit
    h.W.addUnit({ name: "TEST_Colonist", area, x: 10, y: 10, data: { kind: "person" } });
    const heldPass = h.E.processResources(res.due + 10);
    assert.equal(heldPass.held, 1, "occupied cell must hold regrowth");

    // Regrows once stander leaves
    h.W.removeUnit(h.W.units()[0].id);
    const grownPass = h.E.processResources(res.due + 10);
    assert.equal(grownPass.grown, 1, "unoccupied cell regrows");
    assert.equal(h.O.atIn(area, 10, 10).id, "oak", "tree returned");

    // Sapling maturation
    assert.ok(typeof h.E.startSapling === "function", "startSapling API available");
    h.E.startSapling(area, 12, 12, "pine", { due: 150 });
    assert.equal(h.O.atIn(area, 12, 12).id, "sapling", "sapling placed on cell");
    h.E.processResources(150);
    assert.equal(h.O.atIn(area, 12, 12).id, "pine", "sapling matured into pine tree");
});

// 3. Harvested flora regrows
check("harvested_flora_regrow", () => {
    const h = createHarness();
    const area = { x: 0, y: 0 };
    h.O.setIn(area, 15, 15, "grass_tuft");
    h.O.applyIn(area, 15, 15, "gather", "TEST");
    assert.equal(h.O.atIn(area, 15, 15), null, "gathered plant cleared");

    const res = h.E.resources().find(r => r.x === 15 && r.y === 15);
    assert.ok(res, "gathered plant scheduled for regrowth");
    h.E.processResources(res.due);
    assert.equal(h.O.atIn(area, 15, 15).id, "grass_tuft", "gathered plant regrew");
});

// 4. Plant spreading (vegetative and seed propagation)
check("plant_spreading_organic", () => {
    const h = createHarness();
    const area = { x: 0, y: 0 };
    h.O.setIn(area, 20, 20, "flowers");

    assert.ok(typeof h.E.spreadPlants === "function", "spreadPlants API available");
    let spreadCount = 0;
    for (let t = 0; t < 20; t++) {
        const report = h.E.spreadPlants(area, 100 + t);
        if (report && report.spread > 0) spreadCount += report.spread;
    }
    assert.ok(spreadCount > 0, `wild plants spread organically (germinated ${spreadCount})`);

    // Verify sprouted plant is on an adjacent valid cell
    let foundSprouted = false;
    for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
            if (dx === 0 && dy === 0) continue;
            const obj = h.O.atIn(area, 20 + dx, 20 + dy);
            if (obj && obj.id === "flowers") foundSprouted = true;
        }
    }
    assert.ok(foundSprouted, "sprouted plant found in neighboring cells");
});

// 5. Autonomous fauna herd breeding
check("wildlife_herd_breeding", () => {
    const h = createHarness();
    const area = { x: 0, y: 0 };
    const sp = h.wild.speciesById("deer");

    // Herd with 1 member cannot breed
    const d1 = h.W.addUnit(h.wild.unitSpec(sp, area, 30, 30, 99, 2, { x: 30, y: 30 }));
    assert.ok(typeof h.E.stepBreeding === "function", "stepBreeding API available");
    const r1 = h.E.stepBreeding(area, 100, { force: true });
    assert.equal(r1.births, 0, "single animal cannot breed");

    // Add second member to form viable breeding pair
    const d2 = h.W.addUnit(h.wild.unitSpec(sp, area, 31, 30, 99, 2, { x: 30, y: 30 }));
    const r2 = h.E.stepBreeding(area, 120, { force: true });
    assert.ok(r2.births >= 1, "breeding pair produced offspring");

    // Verify newborn joined the herd
    const members = h.W.unitsInArea(area.x, area.y).filter(u => u.data.herd === 99);
    assert.equal(members.length, 3, "herd grew from 2 to 3 members");
    assert.ok(members[2].data.born, "newborn has born flag");
});

// 6. Depleted wildlife recovery
check("depleted_wildlife_recovery", () => {
    const h = createHarness();
    const area = { x: 0, y: 0 };
    h.E.initializeBaselines();
    const pop0 = h.E.population(area).prey;

    const rep = h.E.attemptSpawn(area, "prey", { force: true, hour: 200, tries: 64 });
    assert.equal(rep.status, "spawned", "depleted area recovers wildlife");
    assert.ok(rep.spawned.length > 0, "new herd spawned");
    assert.ok(h.E.population(area).prey > pop0, "prey population replenished");
});

// 7. Cavern ecology support
check("cavern_ecology_support", () => {
    const h = createHarness();
    const area = { x: 0, y: 0 };
    assert.ok(h.E.isRenewableObject("glow_caps"), "glow caps renewable");
    assert.ok(h.E.isRenewableObject("cave_mushrooms"), "cave mushrooms renewable");
    assert.ok(h.E.isRenewableObject("tower_cap"), "tower cap renewable");
    assert.ok(h.E.isRenewableObject("cave_moss"), "cave moss renewable");

    // Cavern flora spreading
    h.O.setIn(area, 40, 40, "glow_caps");
    let cavernSpread = 0;
    for (let t = 0; t < 20; t++) {
        const report = h.E.spreadPlants(area, 200 + t);
        if (report && report.spread > 0) cavernSpread += report.spread;
    }
    assert.ok(cavernSpread > 0, `cavern flora spread across subterranean cells (${cavernSpread} sprouted)`);
});

console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
