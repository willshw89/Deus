"use strict";
// Automated verification suite for world asset regrowth & flora construction guard:
// Verifies that plants, trees, bushes, sprouts, and resources NEVER regrow, spread,
// or sprout onto any tile with a floor, road, wall, or constructed object.

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

const catalog = JSON.parse(fs.readFileSync(path.join(root, "game/data/UF_WorldCatalog.json"), "utf8"));

// Ensure sanitation catalog objects are present if UF_Sanitation adds them
if (!catalog.objects.some(o => o.id === "latrine_pit")) {
    catalog.objects.push({
        id: "latrine_pit",
        name: "Pit Latrine",
        tags: ["building", "sanitation", "latrine"],
        passable: false,
        build: { items: { wood: 2 }, work: 30 }
    });
}

let passed = 0, failed = 0;
const results = [];

function check(name, condition, message) {
    if (condition) {
        passed++;
        results.push({ name, pass: true, message });
        console.log(`PASS ${name}: ${message}`);
    } else {
        failed++;
        results.push({ name, pass: false, message });
        console.error(`FAIL ${name}: ${message}`);
    }
}

function createHarness() {
    const events = new Map();
    const groundGrid = new Map();  // "ax,ay,x,y" -> tileId
    const objectsGrid = new Map(); // "ax,ay,z,x,y" -> typeId (number)
    const levelsGrid = new Map();  // "ax,ay,z,x,y" -> { shape, constructed, material }

    let currentHour = 100;

    const baseTileA2 = 2816; // Tilemap.TILE_ID_A2
    // Map ground kinds from catalog to base tile IDs
    const groundKinds = catalog.groundKinds || [];
    function tileIdForKind(kindId) {
        const idx = groundKinds.findIndex(g => g.id === kindId);
        return idx >= 0 ? baseTileA2 + idx * 48 : baseTileA2;
    }

    const state = {
        seed: 424242,
        size: 32,
        areasX: 2,
        areasY: 2,
        startArea: { x: 0, y: 0 },
        regrow: [],
        regrowHours: 100,
        ecology: null,
        colony: {
            site: { x: 5, y: 5 },
            plan: []
        }
    };

    class Sprite {
        constructor() {
            this.anchor = { set() {} };
        }
        setFrame() {}
        addChild() {}
    }
    class Spriteset_Map {
        createCharacters() {}
    }
    function Game_Map() {}
    Game_Map.prototype.isPassable = function() { return true; };
    Game_Map.prototype.update = function() {};
    class Bitmap {
        constructor() {}
    }
    const ImageManager = {
        loadBitmap() { return new Bitmap(); }
    };
    const SceneManager = {
        _scene: null
    };

    const harness = {
        console,
        window: {},
        Sprite,
        Spriteset_Map,
        Game_Map,
        Bitmap,
        ImageManager,
        SceneManager,
        $ufWorldCatalog: catalog,
        $ufTime: { year: 1, monthIndex: 0, day: 5, hour: 10, minute: 0 },
        Tilemap: {
            TILE_ID_A1: 2048,
            TILE_ID_A2: 2816,
            isTileA1: id => id >= 2048 && id < 2816,
            isTileA2: id => id >= 2816 && id < 4352
        },
        Scene_Boot: class { start() {} },
        Scene_Map: class { start() {} },
        DataManager: {
            extractSaveContents() {},
            makeSaveContents() { return {}; }
        },
        PluginManager: {
            parameters: () => ({})
        },
        UF: {
            Events: {
                on: (name, fn) => {
                    if (!events.has(name)) events.set(name, []);
                    events.get(name).push(fn);
                },
                emit: (name, ...args) => {
                    for (const fn of (events.get(name) || [])) fn(...args);
                }
            },
            Tiles: {
                kinds: () => groundKinds.slice(),
                groundBase: id => {
                    const k = groundKinds.findIndex(g => g.id === id);
                    return k < 0 ? null : baseTileA2 + k * 48;
                },
                kindOfTile: tileId => {
                    if (tileId < baseTileA2 || tileId >= 4352) return null;
                    return groundKinds[Math.floor((tileId - baseTileA2) / 48)] || null;
                }
            },
            Roads: {
                isRoadTile: tileId => {
                    const base = tileIdForKind("road");
                    return tileId >= base && tileId < base + 48;
                },
                isRoadAt: (area, x, y) => {
                    const key = `${area.x},${area.y},${x},${y}`;
                    const tid = groundGrid.get(key);
                    return tid !== undefined && harness.UF.Roads.isRoadTile(tid);
                },
                isRoad: (area, x, y) => harness.UF.Roads.isRoadAt(area, x, y)
            },
            Levels: {
                cellAt: ref => {
                    const a = ref.area || ref;
                    const z = ref.z !== undefined ? ref.z : (a.z || 0);
                    const key = `${a.x},${a.y},${z},${ref.x},${ref.y}`;
                    return levelsGrid.get(key) || { shape: "floor", constructed: false, material: "soil" };
                },
                shapeAt: ref => {
                    const c = harness.UF.Levels.cellAt(ref);
                    return c ? c.shape : "open";
                },
                setShape: (ref, shape, opts) => {
                    const a = ref.area || ref;
                    const z = ref.z !== undefined ? ref.z : (a.z || 0);
                    const key = `${a.x},${a.y},${z},${ref.x},${ref.y}`;
                    const o = opts || {};
                    levelsGrid.set(key, { shape, constructed: !!o.constructed, material: o.material || "stone" });
                }
            },
            World: {
                state,
                inWorld: (ax, ay) => ax >= 0 && ax < 2 && ay >= 0 && ay < 2,
                currentArea: () => ({ x: 0, y: 0 }),
                walkable: () => true,
                unitsInArea: () => [],
                standerAt: () => null,
                getTile: (ax, ay, x, y, layer, z = 0) => {
                    const key = `${ax},${ay},${x},${y}`;
                    return groundGrid.has(key) ? groundGrid.get(key) : tileIdForKind("meadow");
                },
                setTile: (ax, ay, x, y, layer, tileId) => {
                    const key = `${ax},${ay},${x},${y}`;
                    groundGrid.set(key, tileId);
                    return true;
                },
                peekArea: (ax, ay, z = 0) => {
                    const size = state.size;
                    const ufObjects = new Uint8Array(size * size);
                    for (let y = 0; y < size; y++) {
                        for (let x = 0; x < size; x++) {
                            ufObjects[y * size + x] = harness.UF.World.getObject(ax, ay, x, y, z);
                        }
                    }
                    return { ufObjects, width: size, height: size };
                },
                getObject: (ax, ay, x, y, z = 0) => {
                    const key = `${ax},${ay},${z},${x},${y}`;
                    return objectsGrid.get(key) || 0;
                },
                setObject: (ax, ay, x, y, type, z = 0) => {
                    const key = `${ax},${ay},${z},${x},${y}`;
                    if (type) objectsGrid.set(key, type);
                    else objectsGrid.delete(key);
                    return true;
                }
            }
        }
    };
    harness.window = harness;
    harness.window.UF = harness.UF;
    harness.window.$ufWorldCatalog = catalog;
    harness.window.$ufTime = harness.$ufTime;
    harness.window.Tilemap = harness.Tilemap;

    // Helper functions for test manipulation
    harness.helpers = {
        setGroundKind: (area, x, y, kindId) => {
            const tileId = tileIdForKind(kindId);
            harness.UF.World.setTile(area.x, area.y, x, y, 0, tileId);
            harness.UF.Events.emit("floors:groundChanged", area, x, y, kindId);
        },
        advanceHours: h => {
            currentHour += h;
            harness.UF.World.state.regrowHours = currentHour;
            harness.$ufTime.hour = (harness.$ufTime.hour + h) % 24;
            harness.$ufTime.day += Math.floor(h / 24);
            harness.UF.Objects.processRegrow();
            if (harness.UF.Ecology && harness.UF.Ecology.tickHour) {
                harness.UF.Ecology.tickHour(currentHour);
            }
        },
        tileIdForKind
    };

    return harness;
}

function loadPlugins(harness) {
    const vm = require("vm");
    const ctx = vm.createContext(harness);

    const mutant = process.argv.find(a => a.startsWith("--mutant="));
    const floorsSrc = fs.readFileSync(path.join(root, "game/js/plugins/UF_Floors.js"), "utf8");
    vm.runInContext(floorsSrc, ctx);

    let objectsSrc = fs.readFileSync(path.join(root, "game/js/plugins/UF_Objects.js"), "utf8");
    if (mutant && mutant.endsWith("=bypass-guard")) {
        objectsSrc = objectsSrc.replace(/function isConstructedOrPaved\([^{]+\{/g, "function isConstructedOrPaved() { return false;");
    }
    vm.runInContext(objectsSrc, ctx);

    let ecologySrc = fs.readFileSync(path.join(root, "game/js/plugins/UF_Ecology.js"), "utf8");
    if (mutant && mutant.endsWith("=bypass-guard")) {
        ecologySrc = ecologySrc.replace(/function isConstructedOrPaved\([^{]+\{/g, "function isConstructedOrPaved() { return false;");
    }
    vm.runInContext(ecologySrc, ctx);
}

function runAllChecks() {
    console.log("=== Running World Asset Regrowth & Construction Guard Verification Suite ===");

    // Test 1: Plant regrowth blocked on wood floor
    {
        const H = createHarness();
        loadPlugins(H);
        const area = { x: 0, y: 0 };
        const x = 10, y = 10;

        // Place a picked berry bush that would regrow into "berry_bush" in 48 hours
        H.UF.Objects.setIn(area, x, y, "berry_bush_bare");
        const regEntry = H.UF.Objects.regrowList().find(e => e.x === x && e.y === y);
        const scheduledInitially = !!regEntry && regEntry.to === H.UF.Objects.typeId("berry_bush");

        // Now lay a wooden floor on that cell
        H.UF.Floors.setFloor(area, x, y, "floor_wood");

        // Advance 72 hours (well past 48h due time)
        H.helpers.advanceHours(72);

        const currentObj = H.UF.Objects.atIn(area, x, y);
        const isFloored = H.UF.Floors.isFloor(area, x, y);
        const regAfter = H.UF.Objects.regrowList().find(e => e.x === x && e.y === y);

        check("regrow_blocked_on_wood_floor",
            scheduledInitially && isFloored && (!currentObj || currentObj.id !== "berry_bush") && !regAfter,
            `initially scheduled: ${scheduledInitially}, cell is floor_wood: ${isFloored}, obj on floor: ${currentObj ? currentObj.id : "null"}`
        );
    }

    // Test 2: Tree regrowth blocked on stone floor
    {
        const H = createHarness();
        loadPlugins(H);
        const area = { x: 0, y: 0 };
        const x = 12, y = 12;

        // Cell has a stone floor
        H.UF.Floors.setFloor(area, x, y, "floor_stone");

        // Try to place a stump that would regrow
        H.UF.Objects.setIn(area, x, y, "stump");

        // Verify scheduleRegrow refused to schedule on floor
        const regEntry = H.UF.Objects.regrowList().find(e => e.x === x && e.y === y);

        // Advance 100 hours
        H.helpers.advanceHours(100);

        const currentObj = H.UF.Objects.atIn(area, x, y);
        check("regrow_blocked_on_stone_floor",
            !regEntry && (!currentObj || (currentObj.tags && !currentObj.tags.includes("tree"))),
            `pending regrow: ${!!regEntry}, current object: ${currentObj ? currentObj.id : "none"}`
        );
    }

    // Test 3: Regrowth blocked on road
    {
        const H = createHarness();
        loadPlugins(H);
        const area = { x: 0, y: 0 };
        const x = 14, y = 14;

        // Set ground to road
        H.helpers.setGroundKind(area, x, y, "road");
        const onRoad = H.UF.Roads.isRoadAt(area, x, y);

        // Place berry_bush_bare
        H.UF.Objects.setIn(area, x, y, "berry_bush_bare");
        const regEntry = H.UF.Objects.regrowList().find(e => e.x === x && e.y === y);

        H.helpers.advanceHours(60);

        const currentObj = H.UF.Objects.atIn(area, x, y);
        check("regrow_blocked_on_road",
            onRoad && !regEntry && (!currentObj || currentObj.id !== "berry_bush"),
            `is road: ${onRoad}, regrow scheduled: ${!!regEntry}, obj on road: ${currentObj ? currentObj.id : "none"}`
        );
    }

    // Test 4: Regrowth blocked on wall
    {
        const H = createHarness();
        loadPlugins(H);
        const area = { x: 0, y: 0 };
        const x = 16, y = 16;

        // Place picked bush on meadow
        H.UF.Objects.setIn(area, x, y, "berry_bush_bare");

        // Player / colonist builds a wooden wall over the cell
        H.UF.Objects.setIn(area, x, y, "wall_wood");
        const wallObj = H.UF.Objects.atIn(area, x, y);

        H.helpers.advanceHours(60);

        const currentObj = H.UF.Objects.atIn(area, x, y);
        const regEntry = H.UF.Objects.regrowList().find(e => e.x === x && e.y === y);

        check("regrow_blocked_on_wall",
            wallObj && wallObj.id === "wall_wood" && currentObj && currentObj.id === "wall_wood" && !regEntry,
            `wall remains intact: ${currentObj ? currentObj.id : "none"}, pending regrow: ${!!regEntry}`
        );
    }

    // Test 5: Regrowth blocked on constructed furniture & latrine
    {
        const H = createHarness();
        loadPlugins(H);
        const area = { x: 0, y: 0 };
        const x1 = 18, y1 = 18;
        const x2 = 19, y2 = 18;

        // Place bed on cell 1, latrine on cell 2
        H.UF.Objects.setIn(area, x1, y1, "bed_wood");
        H.UF.Objects.setIn(area, x2, y2, "latrine_pit");

        const bedPaved = H.UF.Objects.isConstructedOrPaved(area, x1, y1);
        const latrinePaved = H.UF.Objects.isConstructedOrPaved(area, x2, y2);

        // Manually attempt to queue a regrowth entry on these cells
        const list = H.UF.Objects.regrowList();
        list.push({ area: { x: 0, y: 0 }, x: x1, y: y1, z: 0, from: 0, to: H.UF.Objects.typeId("berry_bush"), due: 105 });
        list.push({ area: { x: 0, y: 0 }, x: x2, y: y2, z: 0, from: 0, to: H.UF.Objects.typeId("oak"), due: 105 });

        H.helpers.advanceHours(10);

        const obj1 = H.UF.Objects.atIn(area, x1, y1);
        const obj2 = H.UF.Objects.atIn(area, x2, y2);
        const listRemaining = H.UF.Objects.regrowList().filter(e => (e.x === x1 && e.y === y1) || (e.x === x2 && e.y === y2));

        check("regrow_blocked_on_constructed_building",
            bedPaved && latrinePaved && obj1.id === "bed_wood" && obj2.id === "latrine_pit" && listRemaining.length === 0,
            `bed paved: ${bedPaved}, latrine paved: ${latrinePaved}, obj1: ${obj1.id}, obj2: ${obj2.id}, regrows remaining: ${listRemaining.length}`
        );
    }

    // Test 6: Ecology resources cancelled on construction/floors
    {
        const H = createHarness();
        loadPlugins(H);
        const area = { x: 0, y: 0 };
        const x = 20, y = 20;

        // Schedule an ecology resource for an oak tree
        const res = H.UF.Ecology.scheduleResource(area, x, y, "oak", null, { due: 110 });
        const scheduled = !!res && H.UF.Ecology.resources().some(e => e.x === x && e.y === y);

        // Build a wooden floor at this cell
        H.UF.Floors.setFloor(area, x, y, "floor_wood");

        // Advance hours past due time
        H.helpers.advanceHours(20);

        const currentObj = H.UF.Objects.atIn(area, x, y);
        const resourcesLeft = H.UF.Ecology.resources().filter(e => e.x === x && e.y === y);

        check("ecology_resources_cancelled_on_construction",
            scheduled && resourcesLeft.length === 0 && (!currentObj || currentObj.id !== "oak"),
            `initially scheduled: ${scheduled}, resources left: ${resourcesLeft.length}, obj on cell: ${currentObj ? currentObj.id : "null"}`
        );
    }

    // Test 7: Ecology plant spreading never seeds on floors, roads, or walls
    {
        const H = createHarness();
        loadPlugins(H);
        const area = { x: 0, y: 0 };
        const cx = 5, cy = 5;

        // Place a parent berry bush at (5, 5)
        H.UF.Objects.setIn(area, cx, cy, "berry_bush");

        // Surround neighboring cells with floors, roads, and walls
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
                if (dx === 0 && dy === 0) continue;
                const tx = cx + dx, ty = cy + dy;
                if ((dx + dy) % 3 === 0) H.UF.Floors.setFloor(area, tx, ty, "floor_wood");
                else if ((dx + dy) % 3 === 1) H.helpers.setGroundKind(area, tx, ty, "road");
                else H.UF.Objects.setIn(area, tx, ty, "wall_wood");
            }
        }

        // Run multiple forced spread passes
        for (let i = 0; i < 20; i++) {
            H.UF.Ecology.spreadPlants(area, 100 + i, { force: true, tries: 64 });
        }

        // Verify that NO berry bush, sapling, or plant grew on any of the neighboring floored/walled/road cells
        let plantedOnGuarded = false;
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
                if (dx === 0 && dy === 0) continue;
                const tx = cx + dx, ty = cy + dy;
                const obj = H.UF.Objects.atIn(area, tx, ty);
                if (obj && (obj.id === "berry_bush" || obj.id === "sapling" || obj.id === "bush")) {
                    plantedOnGuarded = true;
                }
            }
        }

        check("ecology_spread_skips_floors_and_walls",
            !plantedOnGuarded,
            `spread over 20 passes onto guarded tiles: ${plantedOnGuarded ? "FAIL (planted on guarded cell)" : "ZERO plants on guarded cells"}`
        );
    }

    // Test 8: Underground sprouts skip constructed floors and walls
    {
        const H = createHarness();
        loadPlugins(H);
        const area = { x: 0, y: 0 };

        // Mark cavern cells at z = -1 as constructed floor
        for (let y = 10; y <= 20; y++) {
            for (let x = 10; x <= 20; x++) {
                H.UF.Levels.setShape({ area, x, y, z: -1 }, "floor", { constructed: true, material: "stone" });
            }
        }

        // Run multiple sprout generation beats
        for (let b = 0; b < 30; b++) {
            H.UF.Ecology.stepBeat({ force: true });
        }

        // Check sprouts at z = -1
        const sprouts = H.UF.Ecology.sprouts().filter(s => s.z === -1);
        const insideConstructed = sprouts.filter(s => s.x >= 10 && s.x <= 20 && s.y >= 10 && s.y <= 20);

        check("underground_sprouts_skip_constructed_cells",
            insideConstructed.length === 0,
            `total z=-1 sprouts: ${sprouts.length}, inside constructed area: ${insideConstructed.length}`
        );
    }

    // Test 9: Floor laying cleans pending timers and residual picked plants
    {
        const H = createHarness();
        loadPlugins(H);
        const area = { x: 0, y: 0 };
        const x = 8, y = 8;

        // Place a picked bush
        H.UF.Objects.setIn(area, x, y, "berry_bush_bare");
        const listBefore = H.UF.Objects.regrowList().filter(e => e.x === x && e.y === y);

        // Lay a floor
        H.UF.Floors.setFloor(area, x, y, "floor_wood");

        const listAfter = H.UF.Objects.regrowList().filter(e => e.x === x && e.y === y);
        const objAfter = H.UF.Objects.atIn(area, x, y);

        check("floor_laying_cleans_pending_and_residual",
            listBefore.length === 1 && listAfter.length === 0 && objAfter === null,
            `list before: ${listBefore.length}, list after: ${listAfter.length}, residual object cleared: ${objAfter === null}`
        );
    }

    // Test 10: Natural regrowth on raw meadow/dirt still works normally
    {
        const H = createHarness();
        loadPlugins(H);
        const area = { x: 0, y: 0 };
        const x = 25, y = 25;

        // Raw meadow
        H.helpers.setGroundKind(area, x, y, "meadow");
        H.UF.Objects.setIn(area, x, y, "berry_bush_bare");

        const regEntry = H.UF.Objects.regrowList().find(e => e.x === x && e.y === y);

        // Advance 50 hours (past 48h)
        H.helpers.advanceHours(50);

        const regrownObj = H.UF.Objects.atIn(area, x, y);

        check("natural_regrowth_unaffected",
            !!regEntry && regrownObj && regrownObj.id === "berry_bush",
            `regrow was queued: ${!!regEntry}, successfully regrew into: ${regrownObj ? regrownObj.id : "none"}`
        );
    }

    console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

runAllChecks();
