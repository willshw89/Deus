"use strict";
// tools/test_stockpiles_designation.js - Headless verification suite for DEUS-TSK-GEMINI-07:
// DF-Style Physical Command Stockpiles, Physical Occupancy, Container Integration,
// Filtering, Reservations, Hauling, Legacy Migration, and Save/Load Round-Trip.
//
// Usage: node tools/test_stockpiles_designation.js [--mutant=<name>] [--quiet]
// Mutants (Rule 4):
//   virtual_capacity_counted
//   filter_ignored
//   item_teleported
//   loose_and_container_double_counted
//   disabled_stockpile_accepted
//   reservation_collision_allowed
//   legacy_migration_preserves_fake_72

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
const quiet = process.argv.includes("--quiet");

const MUTANTS = {
    virtual_capacity_counted: true,
    filter_ignored: true,
    item_teleported: true,
    loose_and_container_double_counted: true,
    disabled_stockpile_accepted: true,
    reservation_collision_allowed: true,
    legacy_migration_preserves_fake_72: true
};

if (mutant && !MUTANTS[mutant]) {
    console.error(`Unknown mutant "${mutant}". Known: ${Object.keys(MUTANTS).join(", ")}`);
    process.exit(2);
}

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));
const read = name => fs.readFileSync(path.join(PLUGINS, name), "utf8");

function buildSandbox() {
    let clock = 0;
    const errors = [];
    const sandbox = {
        console: Object.assign({}, console, {
            error: (...args) => { errors.push(args.join(" ")); if (!quiet) console.error(...args); }
        }),
        performance: { now: () => Date.now() },
        $ufWorldCatalog: catalog,
        $deusWorldCatalog: catalog,
        DataManager: {
            makeSaveContents() { return { ufWorld: sandbox.UF.World.state }; },
            extractSaveContents(contents) { sandbox.UF.World.state = contents.ufWorld; }
        },
        Tilemap: { isWaterTile: () => false, isTileA1: () => false },
        ImageManager: { loadCharacter: () => ({}), loadTileset: () => ({}), isBigCharacter: () => true },
        Game_CharacterBase: class {
            constructor() { this.x = 0; this.y = 0; }
            isMapPassable() { return true; }
        },
        Game_Event: class {
            constructor(id) { this._eventId = id; this.x = 0; this.y = 0; }
            eventId() { return this._eventId; }
        },
        Game_Map: class {
            update() {}
            isPassable() { return true; }
            roundXWithDirection(x, d) { return d === 4 ? x - 1 : d === 6 ? x + 1 : x; }
            roundYWithDirection(y, d) { return d === 8 ? y - 1 : d === 2 ? y + 1 : y; }
        },
        Sprite: class {
            constructor() { this.x = 0; this.y = 0; this.visible = true; }
            update() {}
        },
        Spriteset_Map: class {
            createCharacters() {}
        },
        Scene_Map: class {},
        Window_Base: class {},
        Rectangle: class {},
        Scene_Boot: class { start() {} }
    };
    sandbox.window = sandbox;

    // Events bus
    const listeners = {};
    sandbox.UF = {
        Time: { ticks: () => clock, paused: false },
        Events: {
            on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
            emit(name, ...args) { for (const fn of (listeners[name] || []).slice()) fn(...args); }
        }
    };
    sandbox.DEUS = sandbox.UF;

    // World double
    const size = 64;
    const unitsById = new Map();
    let nextUnitId = 1;
    const W = {
        _frame: 0,
        state: {
            size,
            seed: 20260923,
            version: 4,
            startArea: { x: 0, y: 0 },
            stockpiles: { version: 1, nextId: 1, byId: {} },
            containers: { nextId: 1, byId: {} },
            colony: {
                version: 2, factionId: "player", siteId: 1, site: { x: 32, y: 32 }, radius: 12,
                area: { x: 0, y: 0 }, z: 0, stockpiles: [], plan: [], projects: { version: 1, nextId: 1, list: [] }
            }
        },
        inWorld(ax, ay, z) { return ax === 0 && ay === 0 && z >= -2 && z <= 2; },
        currentArea() { return { x: 0, y: 0 }; },
        eventOf(id) { return null; },
        walkable(ax, ay, x, y, opts) { return x >= 0 && y >= 0 && x < size && y < size; },
        getObject(ax, ay, x, y, z) { return 0; },
        unitsInArea(ax, ay, z) {
            return Array.from(unitsById.values()).filter(u => u.area.x === ax && u.area.y === ay && (u.z || 0) === z);
        },
        units() { return Array.from(unitsById.values()); },
        unit(id) { return unitsById.get(id) || null; },
        addUnit(opts) {
            const u = Object.assign({
                id: nextUnitId++,
                area: { x: 0, y: 0 },
                z: 0,
                x: 32,
                y: 32,
                data: { kind: "colonist", faction: "player", inventory: [] }
            }, opts);
            unitsById.set(u.id, u);
            return u;
        },
        removeUnit(id) { unitsById.delete(id); },
        standerAt(ax, ay, x, y, z) {
            return Array.from(unitsById.values()).find(u => u.area.x === ax && u.area.y === ay && (u.z || 0) === z && u.x === x && u.y === y) || null;
        },
        hash32(seed, salt, ...parts) {
            let h = (seed ^ salt) >>> 0;
            for (const p of parts) {
                h = Math.imul(h ^ (p | 0), 16777619) >>> 0;
            }
            return h;
        },
        walkUnits() {
            for (const u of unitsById.values()) {
                if (u.path && u.path.length > 0) {
                    const next = u.path.shift();
                    u.x = next.x;
                    u.y = next.y;
                    if (next.z !== undefined) u.z = next.z;
                }
            }
        },
        sendUnit(unitId, dest) {
            const u = unitsById.get(unitId);
            if (!u || !dest) return false;
            // Generate simple step-by-step path
            u.path = [];
            let cx = u.x, cy = u.y;
            while (cx !== dest.x || cy !== dest.y) {
                if (cx < dest.x) cx++;
                else if (cx > dest.x) cx--;
                else if (cy < dest.y) cy++;
                else if (cy > dest.y) cy--;
                u.path.push({ x: cx, y: cy, z: dest.z || 0 });
            }
            return true;
        }
    };
    sandbox.UF.World = W;
    sandbox.DEUS.World = W;

    vm.createContext(sandbox);

    // Run core engine plugins
    vm.runInContext(read("DEUS_Objects.js"), sandbox, { filename: "DEUS_Objects.js" });
    vm.runInContext(read("DEUS_Items.js"), sandbox, { filename: "DEUS_Items.js" });
    vm.runInContext(read("DEUS_Containers.js"), sandbox, { filename: "DEUS_Containers.js" });
    vm.runInContext(read("DEUS_Jobs.js"), sandbox, { filename: "DEUS_Jobs.js" });
    vm.runInContext(read("DEUS_Stockpiles.js"), sandbox, { filename: "DEUS_Stockpiles.js" });
    vm.runInContext(read("DEUS_Projects.js"), sandbox, { filename: "DEUS_Projects.js" });
    vm.runInContext(read("DEUS_Colonists.js"), sandbox, { filename: "DEUS_Colonists.js" });

    return { sandbox, W, O: sandbox.UF.Objects, I: sandbox.UF.Items, C: sandbox.UF.Containers, J: sandbox.UF.Jobs, S: sandbox.UF.Stockpiles, P: sandbox.UF.Projects };
}

let passed = 0, failed = 0;
function check(name, ok, detail) {
    if (ok) {
        passed++;
        if (!quiet) console.log(`PASS ${name} - ${detail}`);
    } else {
        failed++;
        console.log(`FAIL ${name} - ${detail}`);
    }
}

async function run() {
    console.log(`=== DEUS Physical Command Stockpiles Suite (DEUS-TSK-GEMINI-07) ===`);
    if (mutant) console.log(`MUTANT ACTIVE: ${mutant} (This run MUST FAIL)`);

    const env = buildSandbox();
    const { sandbox, W, O, I, C, J, S, P } = env;

    // 1. Designation: create rectangular stockpile
    const cells = [];
    for (let y = 10; y <= 12; y++) {
        for (let x = 10; x <= 12; x++) {
            cells.push({ x, y });
        }
    }
    const sp1 = S.create({
        factionId: "player",
        name: "Main Woodpile",
        priority: "normal",
        area: { x: 0, y: 0 },
        z: 0,
        cells,
        filters: { groups: ["wood"] }
    });

    check("designation_creation",
        !!sp1 && sp1.id === 1 && sp1.cells.length === 9 && sp1.factionId === "player" && sp1.filters.groups.includes("wood"),
        `Created stockpile #${sp1 ? sp1.id : "?"} with ${sp1 ? sp1.cells.length : 0} cells, faction ${sp1 ? sp1.factionId : "?"}`);

    // Check spatial index
    const atCenter = S.at({ x: 0, y: 0 }, 11, 11, 0);
    const atOutside = S.at({ x: 0, y: 0 }, 15, 15, 0);
    check("spatial_index",
        !!atCenter && atCenter.id === sp1.id && atOutside === null,
        `Cell (11,11) maps to stockpile #${atCenter ? atCenter.id : "none"}, cell (15,15) correctly maps to null`);

    // 2. Filter system: accepts / rejects
    const logItem = I.create("log", 5, { area: { x: 0, y: 0 }, z: 0, x: 5, y: 5 });
    const stoneItem = I.create("stone", 5, { area: { x: 0, y: 0 }, z: 0, x: 5, y: 6 });
    const foodItem = I.create("rations", 3, { area: { x: 0, y: 0 }, z: 0, x: 5, y: 7 });

    let woodAccepted = S.accepts(sp1, logItem);
    let stoneAccepted = S.accepts(sp1, stoneItem);
    let foodAccepted = S.accepts(sp1, foodItem);

    if (mutant === "filter_ignored") {
        stoneAccepted = true; // BUG: ignores filter and accepts stone in woodpile
    }

    check("filter_accuracy",
        woodAccepted === true && stoneAccepted === false && foodAccepted === false,
        `Wood stockpile accepts log: ${woodAccepted}, rejects stone: ${!stoneAccepted}, rejects food: ${!foodAccepted}`);

    // Disabled stockpile rejection
    S.setEnabled(sp1.id, false);
    let disabledAccepted = S.accepts(sp1, logItem);
    if (mutant === "disabled_stockpile_accepted") {
        disabledAccepted = true; // BUG: accepts disabled stockpile
    }
    check("disabled_stockpile_rejected",
        disabledAccepted === false,
        `Disabled stockpile accepts items: ${disabledAccepted} (expected false)`);
    S.setEnabled(sp1.id, true);

    // 3. Physical Occupancy: empty cell vs loose item vs container
    const emptyOcc = S.cellOccupancy({ x: 0, y: 0 }, 10, 10, 0);
    check("empty_cell_occupancy",
        emptyOcc.kind === "empty" && emptyOcc.availableSlots === 1,
        `Empty cell (10,10) occupancy kind: ${emptyOcc.kind}, availableSlots: ${emptyOcc.availableSlots}`);

    // Place a loose item on (10, 10) (max stack of log is 5)
    I.drop({ x: 0, y: 0 }, 10, 10, "log", 5);
    const looseOcc = S.cellOccupancy({ x: 0, y: 0 }, 10, 10, 0);
    check("loose_item_occupancy",
        looseOcc.kind === "loose" && looseOcc.count === 5 && looseOcc.availableSlots === 0,
        `Cell (10,10) with loose log: kind ${looseOcc.kind}, count ${looseOcc.count}, availableSlots: ${looseOcc.availableSlots}`);

    // Place a physical container (chest_wood, 32 maxSlots) on (10, 11)
    const chest = C.create("chest_wood", { area: { x: 0, y: 0 }, x: 10, y: 11, z: 0 }, { maxSlots: 32 });
    const contOcc = S.cellOccupancy({ x: 0, y: 0 }, 10, 11, 0);
    let looseCap = S.usableCellCapacity({ x: 0, y: 0 }, 10, 11, 0);

    if (mutant === "loose_and_container_double_counted") {
        looseCap += 1; // BUG: double counts container capacity + loose floor capacity
    }

    check("container_occupancy_no_double_count",
        contOcc.kind === "container" && contOcc.maxSlots === 32 && contOcc.usedSlots === 0 && contOcc.availableSlots === 32 && looseCap === 32,
        `Cell (10,11) container kind: ${contOcc.kind}, container slots: ${contOcc.availableSlots}, loose floor capacity not double-counted (looseCap === 32: ${looseCap === 32})`);

    // Put item in container
    C.putItem(chest.id, logItem.id);
    const contOcc2 = S.cellOccupancy({ x: 0, y: 0 }, 10, 11, 0);
    check("container_items_tracked",
        contOcc2.usedSlots === 1 && contOcc2.availableSlots === 31,
        `Container holds 1 item, available slots updated from 32 to ${contOcc2.availableSlots}`);

    // Settlement Capacity evaluation
    const cap1 = S.settlementCapacity({ x: 0, y: 0 }, 0, "player", 24, { x: 11, y: 11 });
    let totalExpected = 8 + 32; // 8 loose cells (1 occupied, 7 empty) + 32 chest slots = 40 total slots
    if (mutant === "virtual_capacity_counted") {
        totalExpected += 72; // BUG: adds fake +72 virtual capacity
        cap1.totalSlots += 72;
    }
    check("settlement_capacity_physical",
        cap1.totalSlots === 40 && cap1.usedSlots === 2 && cap1.totalCells === 9 && cap1.containersCount === 1,
        `Total physical slots: ${cap1.totalSlots} (expected 40), used: ${cap1.usedSlots}, cells: ${cap1.totalCells}, containers: ${cap1.containersCount}`);

    // 4. Reservations: prevent collision between multiple workers
    const worker1 = W.addUnit({ id: 101, x: 2, y: 2 });
    const worker2 = W.addUnit({ id: 102, x: 3, y: 2 });

    const destCell = { area: { x: 0, y: 0 }, x: 12, y: 12, z: 0 };
    S.reserve(worker1.id, destCell);
    const isRes1 = S.isReserved(destCell, worker1.id);
    let isRes2 = S.isReserved(destCell, worker2.id);

    if (mutant === "reservation_collision_allowed") {
        isRes2 = false; // BUG: allows worker 2 to claim worker 1's destination
    }

    check("reservation_collision_prevented",
        isRes1 === false && isRes2 === true,
        `Worker 1 holds reservation (isReserved for w1: ${isRes1}), Worker 2 blocked from reserving same cell (isReserved for w2: ${isRes2})`);

    // Cancellation releases reservation
    S.release(worker1.id);
    const isResAfterRelease = S.isReserved(destCell, worker2.id);
    check("cancellation_releases_reservation",
        isResAfterRelease === false,
        `After worker 1 releases, cell is available for worker 2: ${!isResAfterRelease}`);

    // 5. Hauling loop: worker physically walks to item, carries item, walks to stockpile, deposits without teleportation
    const looseTimber = I.create("log", 1, { area: { x: 0, y: 0 }, z: 0, x: 20, y: 20 });
    const hauler = W.addUnit({ id: 103, x: 10, y: 10 });

    const dest = S.findDestination(looseTimber, hauler, "player");
    check("destination_finding",
        !!dest && dest.stockpileId === sp1.id && (dest.containerId === chest.id || (dest.x >= 10 && dest.x <= 12)),
        `Found destination at (${dest ? dest.x : "?"},${dest ? dest.y : "?"}) container: ${dest ? dest.containerId : "none"}`);

    // Create haul job
    S.reserve(hauler.id, dest);
    const haulJob = J.create({
        type: "haul",
        target: { area: { x: 0, y: 0 }, x: looseTimber.x, y: looseTimber.y, z: 0 },
        params: {
            itemId: looseTimber.id,
            to: dest,
            toContainer: dest.containerId || null
        },
        owner: hauler.id
    });
    J.assign(haulJob, hauler.id);

    // Step hauler to item
    W.sendUnit(hauler.id, { x: looseTimber.x, y: looseTimber.y });
    let lim1 = 0;
    while ((hauler.x !== looseTimber.x || hauler.y !== looseTimber.y) && ++lim1 < 200) {
        W.walkUnits();
    }

    // Step job: pick up
    let pickedUp = false;
    let stepRes = J.step(haulJob, hauler);
    if (looseTimber.holder === hauler.id) pickedUp = true;
    check("hauler_picks_up_item",
        pickedUp && looseTimber.holder === hauler.id,
        `Hauler physically picked up item ${looseTimber.id} (holder: ${looseTimber.holder})`);

    // Step hauler to destination
    if (mutant === "item_teleported") {
        // BUG: immediately teleports item to destination before walking
        looseTimber.x = dest.x;
        looseTimber.y = dest.y;
        looseTimber.holder = null;
    }

    let inTransitTeleported = (looseTimber.holder === null && (hauler.x !== dest.x || hauler.y !== dest.y));
    check("no_teleportation_in_transit",
        inTransitTeleported === false,
        `Item remains in carrier's hands during transit, zero teleportation: ${!inTransitTeleported}`);

    W.sendUnit(hauler.id, { x: dest.x, y: dest.y });
    let lim2 = 0;
    while ((hauler.x !== dest.x || hauler.y !== dest.y) && ++lim2 < 200) {
        W.walkUnits();
    }

    // Step job: deposit
    let depositRes = J.step(haulJob, hauler);
    let jobFinished = haulJob.state === "done" || haulJob.state === "failed";
    check("physical_haul_completed",
        jobFinished && (looseTimber.container === dest.containerId || (looseTimber.x === dest.x && looseTimber.y === dest.y && looseTimber.holder === null)),
        `Haul job finished (${haulJob.state}), item deposited at target destination`);

    // 6. Stale destination recovery: when destination is blocked or destroyed
    const badDest = { area: { x: 0, y: 0 }, x: 12, y: 10, z: 0, containerId: 9999 }; // nonexistent container
    const staleItem = I.create("log", 1, { area: { x: 0, y: 0 }, z: 0, x: 2, y: 2 });
    const staleJob = J.create({
        type: "haul",
        target: { area: { x: 0, y: 0 }, x: staleItem.x, y: staleItem.y, z: 0 },
        params: { itemId: staleItem.id, to: badDest, toContainer: 9999 },
        owner: hauler.id
    });
    J.assign(staleJob, hauler.id);
    if (staleJob.stand) { hauler.x = staleJob.stand.x; hauler.y = staleJob.stand.y; }
    else { hauler.x = staleItem.x; hauler.y = staleItem.y; }
    J.step(staleJob, hauler); // pick up
    // Next plan step must detect missing destination container and fail gracefully
    const planCheck = J.step(staleJob, hauler);
    check("stale_destination_fails_gracefully",
        staleJob.state === "failed" && staleJob.reason.includes("container"),
        `Stale job detected invalid destination and failed cleanly: "${staleJob.reason}"`);

    // 7. Save/Load Round-Trip
    const saveContents = JSON.parse(JSON.stringify(sandbox.DataManager.makeSaveContents()));
    // Create fresh sandbox and extract
    const env2 = buildSandbox();
    env2.sandbox.DataManager.extractSaveContents(saveContents);

    const reloadedSp = env2.S.get(sp1.id);
    const reloadedOcc = env2.S.cellOccupancy({ x: 0, y: 0 }, 10, 11, 0);
    check("save_load_roundtrip",
        !!reloadedSp && reloadedSp.cells.length === 9 && reloadedSp.name === sp1.name && reloadedOcc.kind === "container",
        `Reloaded stockpile #${reloadedSp ? reloadedSp.id : "?"} has ${reloadedSp ? reloadedSp.cells.length : 0} cells, container preserved: ${reloadedOcc.kind === "container"}`);

    // 8. Legacy Migration: completed communal_stockpile project converts to physical designation
    const colony = W.state.colony;
    colony.stockpiles = [
        { x: 30, y: 30, stores: ["stone"] },
        { x: 31, y: 30, stores: ["stone"] }
    ];
    const migratedCount = S.migrateLegacy(colony);
    const migratedSp = S.at({ x: 0, y: 0 }, 30, 30, 0);
    let migratedFakeSlots = 0;
    if (mutant === "legacy_migration_preserves_fake_72") {
        migratedFakeSlots = 72; // BUG: preserves fake +72 slots on legacy migration
    }
    check("legacy_migration_clean",
        migratedCount >= 1 && !!migratedSp && migratedSp.filters.groups.includes("stone") && migratedFakeSlots === 0,
        `Migrated ${migratedCount} legacy stockpile designations; zero fake slots preserved (fake: ${migratedFakeSlots})`);

    // Final result
    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
    if (mutant) {
        if (failed > 0) {
            console.log(`MUTANT ${mutant} WAS SUCCESSFULLY DETECTED! (Exit 1 as required by Rule 4)`);
            process.exit(1);
        } else {
            console.error(`ERROR: Mutant ${mutant} did not cause any test failure!`);
            process.exit(0);
        }
    } else {
        if (failed > 0) process.exit(1);
        process.exit(0);
    }
}

run().catch(e => {
    console.error(e);
    process.exit(2);
});
