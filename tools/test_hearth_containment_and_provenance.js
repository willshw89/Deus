"use strict";

/**
 * test_hearth_containment_and_provenance.js
 * 
 * Verifies:
 * 1. 14-day (201,600 ticks / 3,360 beats) survival of standard communal shelter with
 *    standard hearth without spontaneous ignition.
 * 2. Structured fire provenance tracking across multi-step spread chains.
 * 3. Structured fire casualty forensic logging in DEUS_DeathForensics.
 * 4. An eight-cell spread chain keeps its root fire id, origin and parent list; a fresh plugin instance given the
 *    saved fire state keeps every id and hands the next fire the next id (DEUS-TSK-FABLE-17).
 * 5. Through the beat itself: a damaged hearth escapes with provenance "hearth", an open campfire with "open_fire";
 *    a colonist burned alive who walks out and dies of its burns later still names the fire (and is listed in its
 *    casualties); the ground a burning unit lights joins that fire; a burning unit killed by a blow died of the blow
 *    (DEUS-TSK-FABLE-17).
 * 6. Rule 4 negative control mutants, each must FAIL (exit 1): hearth_escapes_freely (a normal hearth escapes at 0.5
 *    a beat), spread_forgets_origin (a spread cell gets a fresh fire id), fire_ids_restart_on_load (fire ids from a
 *    counter in the plugin instance, not the save), damaged_hearth_never_escapes, escape_forgets_source,
 *    status_death_loses_fire.
 *
 * The standard blueprint itself (a contained hearth, clearance round it, no straw against the fire) and a 14-day run
 * of a shelter the founders built with the real catalog's fire rules are checked in
 * tools/test_settlement_domestic_housing.js, which runs the real DEUS_Projects.js.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert/strict");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const arg = (name, fallback) => {
    const a = process.argv.find(x => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : fallback;
};
const mutant = arg("mutant", "");

let fireSource = fs.readFileSync(path.join(PLUGINS, "DEUS_Fire.js"), "utf8");
let forensicsSource = fs.readFileSync(path.join(PLUGINS, "DEUS_DeathForensics.js"), "utf8");

// Negative control mutations
if (mutant === "hearth_escapes_freely") {
    // Break hearth containment: hearths escape at high probability
    const needle = 'state === "normal" ? 0 :';
    assert.ok(fireSource.includes(needle), "mutation needle found");
    fireSource = fireSource.replace(needle, 'state === "normal" ? 0.5 :');
    console.log("MUTANT hearth_escapes_freely active: hearth containment broken; this run must FAIL (exit 1)");
} else if (mutant === "spread_forgets_origin") {
    // Break provenance: a cell a fire spreads to starts a fire of its own (a fresh id, no root), so a casualty's
    // record no longer names where the fire came from. (A wiped record would crash the plugin, exit 2, which
    // proves nothing; this keeps the plugin running and the checks reading a wrong answer.)
    const needle = "return { fireId: pp.fireId, startedAt: pp.startedAt,";
    assert.ok(fireSource.includes(needle), "mutation needle found");
    fireSource = fireSource.replace(needle, "return { fireId: `fire-${f.nextFireId++}`, startedAt: pp.startedAt,");
    console.log("MUTANT spread_forgets_origin active: spread cells lose the root fire id; this run must FAIL (exit 1)");
} else if (mutant === "fire_ids_restart_on_load") {
    // Break persistence: fire ids come from a counter in the plugin instance, not the saved state, so a reloaded
    // game hands out fire-1 again beside a burning fire-1.
    // (Anchored on provenanceFor's own line: the version-1 migration has the same statement earlier in the file.)
    const needle = "const src = o.source || null;\n        const fireId = `fire-${f.nextFireId++}`;";
    assert.ok(fireSource.includes(needle), "mutation needle found");
    fireSource = fireSource.replace(needle, "const src = o.source || null;\n        const fireId = `fire-${(provenanceFor.counter = (provenanceFor.counter || 0) + 1)}`;");
    console.log("MUTANT fire_ids_restart_on_load active: fire ids live in the plugin, not the save; this run must FAIL (exit 1)");
} else if (mutant === "damaged_hearth_never_escapes") {
    // Break the directive's second half: a damaged, overturned or uncontrolled hearth stays contained.
    const needle = "? (state === \"normal\" ? 0 : num(type.escapeChance, num(rule.uncontrolledEscapeChance, UNCONTROLLED_ESCAPE)))";
    assert.ok(fireSource.includes(needle), "mutation needle found");
    fireSource = fireSource.replace(needle, "? 0");
    console.log("MUTANT damaged_hearth_never_escapes active; this run must FAIL (exit 1)");
} else if (mutant === "escape_forgets_source") {
    // Break the beat's escape provenance: what a source lets out is recorded as lit by nobody.
    const needle = ", source: { type: info.sourceType, objectId: info.objectId, cell: { x, y, z: zOf(s.area) } } });";
    assert.ok(fireSource.includes(needle), "mutation needle found");
    fireSource = fireSource.replace(needle, " });");
    console.log("MUTANT escape_forgets_source active; this run must FAIL (exit 1)");
} else if (mutant === "status_death_loses_fire") {
    // Break the burn stamp: a unit that walks out burning and dies of its burns later names no fire.
    const needle = "if (rec && rec.provenance) d.lastFire = { key, beat: b, provenance: provenanceCopy(rec.provenance) };";
    assert.ok(fireSource.includes(needle), "mutation needle found");
    fireSource = fireSource.replace(needle, "/* MUTANT status_death_loses_fire */");
    console.log("MUTANT status_death_loses_fire active; this run must FAIL (exit 1)");
} else if (mutant) {
    console.error(`Unknown mutant: ${mutant}`);
    process.exit(2);
}

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) {
        passed++;
        console.log(`PASS hearth_provenance.${name}${detail ? " - " + detail : ""}`);
    } else {
        failed++;
        console.log(`FAIL hearth_provenance.${name}${detail ? " - " + detail : ""}`);
    }
    return !!condition;
}

function makeSandbox() {
    const size = 32;
    const objects = new Map();
    const units = {};
    let clock = 0;
    const key = (area, x, y) => `${area.x || 0},${area.y || 0}:${x},${y}`;

    const catalog = {
        fire: {
            beatFrames: 60,
            startChance: 0,
            damage: [2, 4],
            douse: { campRadius: 20, waterRadius: 24, fillBeats: 1, beats: 3, priority: 5, maxOpen: 6, wetBeats: 30 },
            rules: [
                { tags: ["fire"], source: true, escapeChance: 0.0005 },
                { tags: ["stone"], never: true },
                { tags: ["wall"], burn: 10, spread: 0.1, becomes: null },
                { tags: ["bed"], burn: 5, spread: 0.3, becomes: null },
                { tags: ["brush"], burn: 4, spread: 0.4, becomes: null }
            ]
        },
        objects: [
            { id: "wall_wood", name: "Wooden wall", tags: ["wall", "wood", "building"], passable: false },
            { id: "door_wood", name: "Wooden door", tags: ["door", "wood", "building"], passable: true },
            { id: "floor_straw", name: "Straw bed", tags: ["bed", "straw", "building"], passable: true },
            { id: "kitchen_hearth", name: "Cooking hearth", tags: ["building", "fire", "heat", "kitchen", "workplace", "lit"], passable: false },
            { id: "campfire", name: "Campfire", tags: ["building", "fire", "light", "heat", "workplace", "lit"], passable: false },
            { id: "brush", name: "Dry brush", tags: ["brush", "plant"], passable: true }
        ]
    };

    const W = {
        state: { seed: 20260924, size, units, ticks: 0 },
        EVENT_BASE: 1000,
        inWorld: (x, y) => x === 0 && y === 0,
        isLevel: z => z === 0,
        viewLevel: () => ({ x: 0, y: 0, z: 0 }),
        currentArea: () => ({ x: 0, y: 0, z: 0 }),
        unit: id => units[id] || null,
        units: () => Object.values(units),
        unitsInArea: () => Object.values(units),
        hash32: () => 12345,
        isDisplayed: () => true,
        removeUnit: id => { delete units[id]; },
        sendUnit: () => true,
        addUnit: u => { units[u.id] = u; return u; }
    };

    const ufObjects = new Array(size * size).fill(null);
    const O = {
        types: () => catalog.objects,
        type: id => catalog.objects.find(o => o.id === id) || null,
        atIn: (area, x, y) => {
            const id = objects.get(key(area, x, y));
            return id ? O.type(id) : null;
        },
        setIn: (area, x, y, id) => {
            if (id) {
                objects.set(key(area, x, y), id);
                ufObjects[y * size + x] = id;
            } else {
                objects.delete(key(area, x, y));
                ufObjects[y * size + x] = null;
            }
        },
        findIn: () => []
    };

    const events = new Map();
    const sandbox = {
        console,
        performance: { now: () => Date.now() },
        $dataMap: { ufObjects },
        $ufWorldCatalog: catalog,
        $deusWorldCatalog: catalog,
        $ufTime: { day: 1, hour: 12, minute: 0 },
        SceneManager: {},
        DataManager: { createGameObjects() {}, onLoad() {} },
        UF: {
            World: W,
            Objects: O,
            Items: { atIn: () => [], find: () => [], inventoryOf: () => [] },
            Jobs: { douseJobs: () => [], list: () => [], handler: () => null, of: () => null, cancel: () => true },
            Time: { ticks: () => clock },
            Events: {
                on(name, fn) {
                    if (!events.has(name)) events.set(name, []);
                    events.get(name).push(fn);
                },
                emit(name, ...args) {
                    for (const fn of events.get(name) || []) fn(...args);
                }
            },
            Rooms: { isRoofed: () => true }, // Shelter interior is roofed
            Projects: { structures: () => [{ cells: [{ x: 10, y: 10 }, { x: 11, y: 10 }, { x: 12, y: 10 }, { x: 10, y: 11 }, { x: 11, y: 11 }, { x: 12, y: 11 }] }] }
        }
    };
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    sandbox.DEUS = sandbox.UF;

    const classes = [
        "Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot",
        "Rectangle", "Game_Map", "Game_Player", "Game_CharacterBase", "Game_Event",
        "Spriteset_Map", "Spriteset_Base", "Bitmap", "Graphics"
    ];
    for (const name of classes) {
        sandbox[name] = vm.runInNewContext(`(function ${name}(){})`);
        sandbox[name].prototype.initialize = function() {};
    }
    sandbox.Game_CharacterBase.prototype.isMapPassable = function() { return true; };
    sandbox.Scene_Boot.prototype.isReady = function() { return true; };
    sandbox.$gameMap = new sandbox.Game_Map();
    sandbox.$gameMap.roundXWithDirection = (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0);
    sandbox.$gameMap.roundYWithDirection = (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0);

    vm.createContext(sandbox);

    vm.runInContext(fireSource, sandbox, { filename: "DEUS_Fire.js" });
    vm.runInContext(forensicsSource, sandbox, { filename: "DEUS_DeathForensics.js" });

    return { sandbox, W, O, F: sandbox.UF.Fire, D: sandbox.UF.DeathForensics };
}

try {
    console.log("=== DEUS Hearth Containment, Fire Provenance & Forensics Test Suite ===");
    const S = makeSandbox();
    const area = { x: 0, y: 0, z: 0 };

    // 1. Plugins load & API check
    check("plugins_load",
        typeof S.F.provenanceAt === "function" &&
        typeof S.F.sourceInfoAt === "function" &&
        typeof S.F.describeProvenance === "function" &&
        typeof S.D.recordDeath === "function",
        "UF.Fire and UF.DeathForensics loaded with full provenance & containment APIs"
    );

    // 2. 14-day Hearth Containment: 5x5 communal shelter with kitchen_hearth in center, surrounded by straw beds
    // Center: (10, 10). Beds at (9, 10), (11, 10), (10, 9), (10, 11). Walls on perimeter.
    for (let x = 8; x <= 12; x++) {
        for (let y = 8; y <= 12; y++) {
            if (x === 8 || x === 12 || y === 8 || y === 12) {
                S.O.setIn(area, x, y, (x === 10 && y === 12) ? "door_wood" : "wall_wood");
            } else if (x === 10 && y === 10) {
                S.O.setIn(area, x, y, "kitchen_hearth");
            } else {
                S.O.setIn(area, x, y, "floor_straw");
            }
        }
    }

    // Mark the hearth contained
    const hearthInfo = S.F.sourceInfoAt(area, 10, 10);
    check("hearth_recognized_contained",
        hearthInfo && hearthInfo.contained === true && hearthInfo.escapeChance === 0,
        `Hearth recognized as contained (escapeChance=${hearthInfo ? hearthInfo.escapeChance : "none"})`
    );

    // Run 14 simulation days: 14 * 24 hours * 60 min * 60 sec = 1,209,600 sec -> in beats (1 beat = 60 ticks): 3,360 beats
    let shelterIgnitions = 0;
    S.sandbox.UF.Events.on("fire:ignited", (a, x, y) => {
        if (x >= 8 && x <= 12 && y >= 8 && y <= 12) shelterIgnitions++;
    });
    const TOTAL_BEATS = 3360;
    S.F.step(TOTAL_BEATS);

    const shelterBurned = shelterIgnitions > 0 ||
                          S.F.isBurning(area, 9, 10) || S.F.isBurning(area, 11, 10) ||
                          S.F.isBurning(area, 10, 9) || S.F.isBurning(area, 10, 11) ||
                          S.F.count() > 0;

    check("hearth_containment_14_days",
        !shelterBurned,
        `Standard communal shelter with kitchen hearth survived ${TOTAL_BEATS} beats (14 days) with 0 spontaneous ignitions (ignitions=${shelterIgnitions})`
    );

    // 3. Fire Provenance Tracking: Open campfire in wild grass escapes and spreads
    // Origin at (20, 20): open campfire. Neighbor at (20, 21): flammable brush.
    S.O.setIn(area, 20, 20, "campfire");
    S.O.setIn(area, 20, 21, "brush");
    S.O.setIn(area, 20, 22, "brush");

    const campInfo = S.F.sourceInfoAt(area, 20, 20);
    check("open_fire_has_escape_chance",
        campInfo && campInfo.escapeChance > 0,
        `Open campfire in wild has natural escapeChance=${campInfo ? campInfo.escapeChance : 0}`
    );

    // Ignite neighbor brush to simulate an escape from campfire (20, 20)
    const ignited = S.F.ignite(area, 20, 21, {
        cause: "campfire",
        source: { type: "open_fire", objectId: "campfire", cell: { x: 20, y: 20, z: 0 } }
    });
    check("first_spread_ignited", ignited && S.F.isBurning(area, 20, 21), "Brush adjacent to campfire caught fire");

    const provHop1 = S.F.provenanceAt(area, 20, 21);
    check("provenance_hop1_records_origin",
        provHop1 &&
        provHop1.fireId &&
        provHop1.sourceType === "open_fire" &&
        provHop1.sourceObjectId === "campfire" &&
        provHop1.sourceCell.x === 20 &&
        provHop1.sourceCell.y === 20 &&
        provHop1.spreadSteps === 0 &&
        provHop1.firstFuelIgnited === "brush",
        `Hop 1 Provenance: ID=${provHop1 ? provHop1.fireId : "?"}, source=${provHop1 ? provHop1.sourceObjectId : "?"} at (${provHop1 ? `${provHop1.sourceCell.x},${provHop1.sourceCell.y}` : "?"}), fuel=${provHop1 ? provHop1.firstFuelIgnited : "?"}`
    );

    // Step 2: spread to (20, 22)
    // S.F.step runs neighbor spread
    let hop2Spread = false;
    for (let b = 0; b < 20; b++) {
        S.F.step(1);
        if (S.F.isBurning(area, 20, 22)) {
            hop2Spread = true;
            break;
        }
    }
    // If PRNG didn't catch in 20 beats, force spread with parent link to test provenance contract
    if (!hop2Spread) {
        S.F.ignite(area, 20, 22, {
            cause: "spread",
            parent: { key: "0,0:20,21", rec: { provenance: provHop1 } }
        });
    }

    const provHop2 = S.F.provenanceAt(area, 20, 22);
    check("provenance_chain_preserves_root_fire_id",
        provHop2 &&
        provHop2.fireId === provHop1.fireId &&
        provHop2.sourceObjectId === "campfire" &&
        provHop2.sourceCell.x === 20 &&
        provHop2.sourceCell.y === 20 &&
        provHop2.spreadSteps >= 1 &&
        provHop2.spreadParents.includes("0,0:20,21"),
        `Hop 2 Provenance preserves root fire ID (${provHop2 ? provHop2.fireId : "?"}), spreadSteps=${provHop2 ? provHop2.spreadSteps : "?"}, parents=[${provHop2 ? provHop2.spreadParents.join(",") : ""}]`
    );

    // 4. Burn Casualty Forensic Logging
    const victim = S.W.addUnit({
        id: 101,
        name: "Test Colonist",
        x: 20,
        y: 22,
        area: { x: 0, y: 0 },
        z: 0,
        data: { kind: "colonist", hp: 1, maxHp: 10, dead: false }
    });

    // Step beat to apply burn damage and kill victim in cell (20, 22)
    S.F.step(1);

    const ledger = S.D.deathLedger();
    const casualty = ledger.find(c => c.unitId === 101);

    check("burn_casualty_recorded_in_forensics",
        !!casualty && casualty.primaryCause === "fire",
        `Casualty recorded: ${casualty ? casualty.name : "none"}, primaryCause=${casualty ? casualty.primaryCause : "none"}`
    );

    check("casualty_attaches_structured_fire_provenance",
        casualty &&
        casualty.fireProvenance &&
        casualty.fireProvenance.fireId === provHop1.fireId &&
        typeof casualty.fireDeathText === "string" &&
        casualty.fireDeathText.includes(provHop1.fireId) &&
        casualty.fireDeathText.includes("campfire"),
        `Structured death text: "${casualty ? casualty.fireDeathText : "none"}"`
    );

    // 5. A long spread chain (DEUS-TSK-FABLE-17): one fire lit on the first of eight brush cells in a row, spread
    //    cell by cell (each spread is the plugin's own ignite with the parent cell, as the beat does), keeps its root
    //    fire id, its origin and a parent list that grows by one key per hop, oldest first.
    const ROW_Y = 26, ROW_X0 = 4, ROW_N = 8;
    for (let i = 0; i < ROW_N; i++) S.O.setIn(area, ROW_X0 + i, ROW_Y, "brush");
    S.F.ignite(area, ROW_X0, ROW_Y, { cause: "player" });
    const rowKey = x => `0,0:${x},${ROW_Y}`;
    const rootRec = () => S.W.state.fire.burning[rowKey(ROW_X0)];
    for (let i = 1; i < ROW_N; i++) {
        const parentKey = rowKey(ROW_X0 + i - 1);
        S.F.ignite(area, ROW_X0 + i, ROW_Y, { cause: "spread", parent: { key: parentKey, rec: S.W.state.fire.burning[parentKey] } });
    }
    const chain = Array.from({ length: ROW_N }, (_, i) => S.F.provenanceAt(area, ROW_X0 + i, ROW_Y));
    const rootId = chain[0] ? chain[0].fireId : null;
    const tail = chain[ROW_N - 1];
    const wantParents = Array.from({ length: ROW_N - 1 }, (_, i) => rowKey(ROW_X0 + i));
    check("long_chain_keeps_root_fire_id",
        !!rootRec() && chain.every(p => p && p.fireId === rootId && p.sourceType === "direct" && p.sourceCell.x === ROW_X0 && p.firstFuelIgnited === "brush") &&
        chain.every((p, i) => p.spreadSteps === i && p.spreadParents.length === i) && !!tail && tail.spreadParents.join("|") === wantParents.join("|") &&
        S.F.fire(rootId) && S.F.fire(rootId).cells === ROW_N,
        `${ROW_N} cells: ids [${chain.map(p => (p ? p.fireId : "none")).join(" ")}], steps [${chain.map(p => (p ? p.spreadSteps : "?")).join(" ")}]; last cell's parents [${tail ? tail.spreadParents.join(" ") : ""}]; fire summary cells ${S.F.fire(rootId) ? S.F.fire(rootId).cells : "?"}`
    );

    // 6. Save and reload (DEUS-TSK-FABLE-17): the fire state rides in the world state. A fresh plugin instance given
    //    the saved state keeps every burning cell's id and provenance, and the next fire it starts takes the next id
    //    (fire ids never restart: two fires never share one).
    const idsBefore = Object.values(S.W.state.fire.burning).map(r => r.fireId);
    const highest = Math.max(...Object.keys(S.W.state.fire.fires).map(id => Number(id.slice(5))));
    const saved = JSON.parse(JSON.stringify(S.W.state.fire));
    const R = makeSandbox();
    R.W.state.fire = saved;
    for (let i = 0; i < ROW_N; i++) R.O.setIn(area, ROW_X0 + i, ROW_Y, "brush");
    R.O.setIn(area, 28, 28, "brush");
    const kept = R.F.provenanceAt(area, ROW_X0 + ROW_N - 1, ROW_Y);
    R.F.ignite(area, 28, 28, { cause: "player" });
    const fresh = R.F.provenanceAt(area, 28, 28);
    check("fire_ids_continue_after_reload",
        !!kept && kept.fireId === rootId && kept.spreadSteps === ROW_N - 1 && !!fresh && Number(fresh.fireId.slice(5)) === highest + 1 && !idsBefore.includes(fresh.fireId) && Number.isInteger(R.W.state.fire.nextFireId) && R.W.state.fire.nextFireId === highest + 2,
        `saved state had fires up to fire-${highest} (${idsBefore.length} burning cells); after the reload the chain's last cell reads ${kept ? `${kept.fireId}, ${kept.spreadSteps} steps` : "nothing"}; the next fire is ${fresh ? fresh.fireId : "none"} (nextFireId now ${R.W.state.fire.nextFireId})`
    );

    // 7. Sources through the beat itself (DEUS-TSK-FABLE-17). The double's hash32 is a constant (12345), so every
    //    roll below 12345 / 2^32 succeeds: any escape chance above zero lets a flammable neighbour catch on the next
    //    beat, and zero never does. Objects placed after the first beat are announced (world:objectChanged) as the
    //    real World does, so the plugin's source index sees them.
    const put = (x, y, id) => { S.O.setIn(area, x, y, id); S.sandbox.UF.Events.emit("world:objectChanged", { x: 0, y: 0 }, x, y, id); };
    //    (a) A damaged hearth may escape; its escape is a fire whose provenance names the hearth.
    put(25, 5, "kitchen_hearth"); put(25, 6, "brush");
    S.F.step(1);
    const normalHeld = !S.F.isBurning(area, 25, 6);
    S.F.setSourceState(area, 25, 5, "damaged", "test");
    const dmgInfo = S.F.sourceInfoAt(area, 25, 5);
    S.F.step(1);
    const dmgProv = S.F.provenanceAt(area, 25, 6);
    check("damaged_hearth_escapes_with_provenance",
        normalHeld && !!dmgInfo && dmgInfo.contained && dmgInfo.state === "damaged" && dmgInfo.escapeChance > 0 && !!dmgProv && dmgProv.sourceType === "hearth" &&
        dmgProv.sourceObjectId === "kitchen_hearth" && dmgProv.sourceCell.x === 25 && dmgProv.sourceCell.y === 5 && dmgProv.firstFuelIgnited === "brush" && dmgProv.spreadSteps === 0,
        `normal hearth held its neighbour: ${normalHeld}; damaged: ${dmgInfo ? `contained ${dmgInfo.contained}, state ${dmgInfo.state}, escape ${dmgInfo.escapeChance}` : "no info"}; the brush beside it ${dmgProv ? `burns as ${dmgProv.fireId} from ${dmgProv.sourceType} (${dmgProv.sourceObjectId}) at (${dmgProv.sourceCell.x},${dmgProv.sourceCell.y}), first fuel ${dmgProv.firstFuelIgnited}` : "did not catch"}`
    );
    //    (b) An open campfire escapes through the beat, not by hand; the fire names the campfire.
    put(29, 10, "campfire"); put(29, 11, "brush");
    S.F.step(1);
    const openProv = S.F.provenanceAt(area, 29, 11);
    check("open_fire_escape_through_beat",
        !!openProv && openProv.sourceType === "open_fire" && openProv.sourceObjectId === "campfire" && openProv.sourceCell.x === 29 && openProv.sourceCell.y === 10 && openProv.cause === "campfire",
        openProv ? `the brush beside the campfire burns as ${openProv.fireId}: ${openProv.sourceType} (${openProv.sourceObjectId}) at (${openProv.sourceCell.x},${openProv.sourceCell.y}), cause ${openProv.cause}` : "the brush beside the campfire did not catch"
    );
    //    (c) A colonist burned in that brush survives the burn, walks out, and dies of its burns later (UF_Environment's
    //        burning status sets deathCause "fire" and UF_Combat records the death): the record names the fire.
    const survivor = S.W.addUnit({ id: 202, name: "TEST_Walker", x: 29, y: 11, area: { x: 0, y: 0 }, z: 0, data: { kind: "colonist", hp: 20, maxHp: 20, dead: false } });
    S.F.step(1);
    const stamped = survivor.data.lastFire ? survivor.data.lastFire.provenance : null;
    survivor.x = 30; survivor.y = 14; // off the fire
    survivor.data.burning = { ticksLeft: 1, damagePerBeat: 3 };
    survivor.data.hp = 0;
    survivor.data.deathCause = "fire";
    S.D.recordDeath(survivor, survivor.data.deathCause, null);
    const late = S.D.deathLedger().find(c => c.unitId === 202);
    const openFire = openProv ? S.F.fire(openProv.fireId) : null;
    check("burns_death_after_fleeing_names_fire",
        survivor.data.hp === 0 && !!stamped && !!late && late.primaryCause === "fire" && !!late.fireProvenance && !!openProv && late.fireProvenance.fireId === openProv.fireId &&
        typeof late.fireDeathText === "string" && late.fireDeathText.includes(openProv.fireId) && !!openFire && openFire.casualties.some(c => c.unitId === 202),
        `burned alive: stamp ${stamped ? stamped.fireId : "none"}; died of burns at (30,14) off the fire: ${late ? `${late.primaryCause}, provenance ${late.fireProvenance ? late.fireProvenance.fireId : "none"}, "${late.fireDeathText || ""}"` : "no record"}; ${openFire ? `${openFire.fireId} casualties [${openFire.casualties.map(c => c.unitId).join(" ")}]` : "no fire summary"}`
    );
    //    (d) The ground a burning unit sets alight joins the fire that caught it (UF_Environment's running flame).
    put(31, 14, "brush");
    S.F.ignite(area, 31, 14, { cause: "running_flame", carried: survivor.data.lastFire || null });
    const carriedProv = S.F.provenanceAt(area, 31, 14);
    check("running_flame_joins_its_fire",
        !!carriedProv && !!stamped && carriedProv.fireId === stamped.fireId && carriedProv.sourceType === "open_fire" && carriedProv.spreadParents[carriedProv.spreadParents.length - 1] === survivor.data.lastFire.key && carriedProv.spreadSteps === stamped.spreadSteps + 1,
        carriedProv ? `the running flame's cell burns as ${carriedProv.fireId} (${carriedProv.sourceType}), ${carriedProv.spreadSteps} step(s), last parent ${carriedProv.spreadParents[carriedProv.spreadParents.length - 1]}` : "the cell did not catch"
    );
    //    (e) A burning unit killed by a blow died of the blow: no fire text on its record.
    const struck = S.W.addUnit({ id: 203, name: "TEST_Struck", x: 30, y: 15, area: { x: 0, y: 0 }, z: 0, data: { kind: "colonist", hp: 0, maxHp: 10, dead: false, burning: { ticksLeft: 3 }, lastFire: survivor.data.lastFire } });
    S.D.recordDeath(struck, "combat", { name: "TEST_Wolf" });
    const struckRec = S.D.deathLedger().find(c => c.unitId === 203);
    check("combat_death_while_burning_is_combat",
        !!struckRec && struckRec.primaryCause === "combat" && !struckRec.fireProvenance && !struckRec.fireDeathText,
        struckRec ? `primary ${struckRec.primaryCause}, fire provenance ${struckRec.fireProvenance ? struckRec.fireProvenance.fireId : "none"}, fire text ${struckRec.fireDeathText ? "present" : "none"}` : "no record"
    );

    console.log(`\n======================================================`);
    console.log(`RESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
    console.log(`======================================================`);
    process.exit(failed === 0 ? 0 : 1);
} catch (e) {
    console.error("Harness error:", e);
    process.exit(2);
}
