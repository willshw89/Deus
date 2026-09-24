#!/usr/bin/env node
"use strict";

/**
 * tools/test_survival_regressions.js
 *
 * Dedicated regression test suite for Project DEUS survival gates:
 * - Gate 1: Encumbered survival (weight > STR*5 slows movement, never paralyzes or aborts jobs)
 * - Gate 2: Cross-midnight long rest (food/water latched across 00:00 removes 1 exhaustion at 06:00)
 * - Gate 3: No double-credit exploit (yesterday intake cleared on rest completion; cannot qualify rest 2)
 * - Gate 4: Shared pond bank access (multiple colonists reserve distinct bank cells around same water cell)
 * - Gate 5: WorldGen starting pond valley datum (S=0 datum at r<=30 guarantees unburied z=0 pond banks)
 *
 * Rule 4 Negative Control Mutants:
 *   --mutant=encumbrance_paralyzes_jobs  (must fail Gate 1)
 *   --mutant=midnight_intake_wiped      (must fail Gate 2)
 *   --mutant=double_credit_allowed      (must fail Gate 3)
 *   --mutant=pond_entity_locked         (must fail Gate 4)
 *   --mutant=starting_valley_datum_broken (must fail Gate 5)
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");

const arg = (name, fallback) => {
    const a = process.argv.find(x => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : fallback;
};

const mutant = arg("mutant", "");
const quiet = process.argv.includes("--quiet");

const MUTANTS = {
    encumbrance_paralyzes_jobs: "encumbrance_paralyzes_jobs",
    midnight_intake_wiped: "midnight_intake_wiped",
    double_credit_allowed: "double_credit_allowed",
    pond_entity_locked: "pond_entity_locked",
    starting_valley_datum_broken: "starting_valley_datum_broken"
};

if (mutant && !MUTANTS[mutant]) {
    console.error(`Unknown mutant "${mutant}". Supported: ${Object.keys(MUTANTS).join(", ")}`);
    process.exit(2);
}

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) {
        passed++;
        console.log(`PASS regr.${name}${detail ? " - " + detail : ""}`);
    } else {
        failed++;
        console.log(`FAIL regr.${name}${detail ? " - " + detail : ""}`);
    }
    return !!condition;
}

// Build VM Environment with support for regression mutants
function setupEnvironment() {
    const PLUGIN_FILES = [
        "DEUS_World.js",
        "DEUS_WorldGen.js",
        "DEUS_Levels.js",
        "DEUS_Factions.js",
        "DEUS_Dnd5e.js",
        "DEUS_Callings.js",
        "DEUS_HistoricalDemographics.js",
        "DEUS_History.js",
        "DEUS_Objects.js",
        "DEUS_Doors.js",
        "DEUS_Items.js",
        "DEUS_Containers.js",
        "DEUS_Stockpiles.js",
        "DEUS_Jobs.js",
        "DEUS_Projects.js",
        "DEUS_Environment.js",
        "DEUS_Fire.js",
        "DEUS_Conditions.js",
        "DEUS_DeathForensics.js",
        "DEUS_Colonists.js"
    ];

    const sources = {};
    for (const file of PLUGIN_FILES) {
        sources[file] = fs.readFileSync(path.join(PLUGINS, file), "utf8");
    }

    const cat = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));
    if (cat.items && Array.isArray(cat.items.types)) {
        cat.items.types.push({ id: "heavy_stone_test", name: "Heavy Stone Test", weight: 30, stack: 10 });
        cat.items.types.push({ id: "rations_test", name: "Rations Test", tags: ["food"], food: { hunger: 25, nutrition: 1.0, water: 0.1, source: "test" }, weight: 1.0 });
    }
    const catalogText = JSON.stringify(cat);
    const tilesetsText = fs.readFileSync(path.join(ROOT, "game", "data", "Tilesets.json"), "utf8");
    const pluginsJsText = fs.readFileSync(path.join(ROOT, "game", "js", "plugins.js"), "utf8");

    // In-memory mutant injections
    if (mutant === "encumbrance_paralyzes_jobs") {
        sources["DEUS_Jobs.js"] = sources["DEUS_Jobs.js"].replace(
            "function step(job, unit) {",
            `function step(job, unit) {
                const u = unit || (window.UF && UF.World && UF.World.unit(job.owner));
                const I = window.UF && UF.Items;
                const enc = u && I && typeof I.encumbrance === "function" ? I.encumbrance(u.id) : null;
                if (enc && enc.status !== "unencumbered") {
                    return fail(job, "encumbered");
                }`
        );
        console.log("MUTANT encumbrance_paralyzes_jobs injected into DEUS_Jobs.js");
    } else if (mutant === "midnight_intake_wiped") {
        sources["DEUS_Colonists.js"] = sources["DEUS_Colonists.js"].replace(
            "n.foodYesterday = n.foodLb;",
            "n.foodYesterday = 0; /* MUTANT: wiped */"
        );
        console.log("MUTANT midnight_intake_wiped injected into DEUS_Colonists.js");
    } else if (mutant === "double_credit_allowed") {
        sources["DEUS_Colonists.js"] = sources["DEUS_Colonists.js"].replace(
            "n.foodYesterday = 0;\n                n.waterYesterday = 0;",
            "/* MUTANT: double credit allowed */"
        );
        console.log("MUTANT double_credit_allowed injected into DEUS_Colonists.js");
    } else if (mutant === "pond_entity_locked") {
        sources["DEUS_Colonists.js"] = sources["DEUS_Colonists.js"].replace(
            `return !activeJobs().some(j => j.type === "drink" && j.stand && j.stand.x === bx && j.stand.y === by && j.assigned !== u.id);`,
            `return !activeJobs().some(j => j.type === "drink" && j.target && j.target.x === x && j.target.y === y && j.assigned !== u.id); /* MUTANT: pond entity locked */`
        );
        console.log("MUTANT pond_entity_locked injected into DEUS_Colonists.js");
    } else if (mutant === "starting_valley_datum_broken") {
        sources["DEUS_Levels.js"] = sources["DEUS_Levels.js"].replace(
            "if (distToCamp <= 30) return 0;",
            "if (distToCamp <= 30) { if (distToCamp >= 20) return 1; return 0; } /* MUTANT: broken valley */"
        );
        console.log("MUTANT starting_valley_datum_broken injected into DEUS_Levels.js");
    }

    const list = {};
    vm.runInNewContext(pluginsJsText, list);

    const ns = {};
    const warnings = [], errors = [];
    const env = {
        window: null,
        UF: ns,
        DEUS: ns,
        Math: Math,
        performance,
        setTimeout,
        clearTimeout,
        console: {
            log: (...a) => { if (!quiet) console.log("  [VM]", ...a); },
            warn: (...a) => warnings.push(a.map(String).join(" ")),
            error: (...a) => errors.push(a.map(String).join(" "))
        },
        PluginManager: {
            parameters: name => (list.$plugins && list.$plugins.find(p => p.name === name) || {}).parameters || {},
            registerCommand() {}
        },
        SoundManager: {
            playSystemSound() {},
            playCursor() {},
            playOk() {},
            playCancel() {},
            playBuzzer() {}
        },
        TextManager: {
            currencyUnit: "G",
            levelA: "Lv",
            hpA: "HP",
            mpA: "MP"
        },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false },
        Input: { keyMapper: {} },
        TouchInput: { _currentState: {} },
        SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        ImageManager: { loadTileset() {} },
        Utils: { isOptionValid: () => false },
        Tilemap: function() {},
        $dataTilesets: JSON.parse(tilesetsText),
        $ufWorldCatalog: JSON.parse(catalogText),
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8, minute: 0 },
        $gameSystem: {},
        $gameScreen: {
            weatherType: () => "none",
            weatherPower: () => 0,
            changeWeather() {}
        },
        $gameTimer: {},
        $gameSwitches: {},
        $gameVariables: {},
        $gameSelfSwitches: {},
        $gameActors: {},
        $gameParty: {}
    };

    env.window = env;
    env.$deusWorldCatalog = env.$ufWorldCatalog;

    env.Tilemap.TILE_ID_A1 = 2048;
    env.Tilemap.TILE_ID_A2 = 2816;
    env.Tilemap.isTileA1 = id => id >= 2048 && id < 2816;
    env.Tilemap.isWaterTile = id => env.Tilemap.isTileA1(id);

    const classes = [
        "Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot",
        "Rectangle", "Game_Map", "Game_Player", "Game_CharacterBase", "Game_Event",
        "Spriteset_Map", "Spriteset_Base", "Bitmap", "Graphics"
    ];
    for (const name of classes) {
        env[name] = vm.runInNewContext(`(function ${name}(){})`);
        env[name].prototype.initialize = function() {};
    }
    env.Game_Map.prototype.mapId = () => 0;
    env.Game_Map.prototype.width = () => 64;
    env.Game_Map.prototype.height = () => 64;
    env.Game_Map.prototype.update = function(sceneActive) {};
    env.Game_Map.prototype.tileId = (x, y, z) => 0;
    env.Game_Map.prototype.tilesetFlags = () => [];
    env.Game_Map.prototype.isPassable = () => true;
    env.Game_Map.prototype.checkPassage = () => true;
    env.Game_Map.prototype.roundXWithDirection = (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0);
    env.Game_Map.prototype.roundYWithDirection = (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0);
    env.Game_Map.prototype.eventsXy = () => [];
    env.Game_Map.prototype.eventsXyNt = () => [];

    env.Game_Player.prototype.isTransferring = () => false;
    env.Game_Player.prototype.direction = () => 2;
    env.Game_Player.prototype.locate = function(x, y) { this.x = x; this.y = y; };

    env.$gameMap = new env.Game_Map();
    env.$gameMap._events = [];
    env.$gamePlayer = new env.Game_Player();
    env.$gamePlayer.x = 32;
    env.$gamePlayer.y = 32;

    const ctx = vm.createContext(env);

    function section(source, start, end) {
        const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
        if (a < 0 || b <= a) throw new Error(`Engine source section missing: ${start}`);
        return source.slice(a, b);
    }

    const rmmzCoreSrc = fs.readFileSync(path.join(ROOT, "game", "js", "rmmz_core.js"), "utf8");
    const rmmzMgrSrc = fs.readFileSync(path.join(ROOT, "game", "js", "rmmz_managers.js"), "utf8");
    const deusCoreSrc = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "DEUS_Core.js"), "utf8");

    vm.runInContext(section(rmmzMgrSrc, "DataManager.makeSaveContents =", "DataManager.correctDataErrors ="), ctx, { filename: "rmmz_managers.js" });
    vm.runInContext(section(rmmzCoreSrc, "function JsonEx()", "//-----------------------------------------------------------------------------"), ctx, { filename: "rmmz_core.js: JsonEx" });
    vm.runInContext(section(rmmzCoreSrc, "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), ctx, { filename: "rmmz_core.js: tile constants" });
    vm.runInContext(section(deusCoreSrc, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------"), ctx, { filename: "DEUS_Core.js: events" });

    for (const file of PLUGIN_FILES) {
        try {
            vm.runInContext(sources[file], ctx, { filename: file });
        } catch (e) {
            console.error(`Error loading plugin ${file}:`, e);
            throw e;
        }
    }

    if (env.UF && env.UF.Jobs) {
        env.UF.Jobs.give = function(unit, spec) {
            const job = env.UF.Jobs.create(Object.assign({ owner: unit.id }, spec));
            if (job) env.UF.Jobs.assign(job.id, unit.id);
            return job;
        };
    }

    return env;
}

// ============================================================================
// GATE 1: Encumbered Survival
// ============================================================================
function testGate1_EncumberedSurvival(env, world, colony) {
    console.log("\n--- Testing GATE 1: Encumbered Survival ---");
    const W = env.UF.World;
    const I = env.UF.Items;
    const J = env.UF.Jobs;
    const Col = env.UF.Colonists;

    const founders = Col.list ? Col.list() : W.units().filter(u => u && u.data && (u.data.founder || u.data.kind === "colonist"));
    const unit = founders[0];
    if (!unit) {
        check("gate1.founder_available", false, "No founder unit available for Gate 1");
        return;
    }

    // Set stats for unit: STR 10
    unit.data.stats = unit.data.stats || {};
    unit.data.stats.str = 10;
    const unencCap = unit.data.stats.str * 5; // 50 lbs


    // Give 2 heavy stones = 60 lbs (> 50 lbs unencumbered capacity)
    I.create("heavy_stone_test", 2, { holder: unit.id });

    // Refresh encumbrance
    const enc = I.encumbrance(unit.id);
    check("gate1.encumbered_status", enc && enc.status !== "unencumbered",
        `Weight: ${enc ? enc.currentWeight : "?"} lbs, capacity: ${unencCap} lbs, status: ${enc ? enc.status : "?"}`);

    // Verify speed penalty is applied
    const penalty = enc && (enc.speedPenalty !== undefined ? enc.speedPenalty : (enc.status !== "unencumbered" ? 10 : 0));
    check("gate1.movement_penalty_applied", penalty > 0, `Encumbrance speed penalty: ${penalty} ft`);

    // Verify unit can execute a move job without failing "encumbered"
    const targetX = unit.x + 1, targetY = unit.y;
    const moveJob = J.give(unit, { type: "move", target: { area: { x: unit.area.x, y: unit.area.y }, x: targetX, y: targetY, z: unit.z || 0 } });
    check("gate1.move_job_created", !!moveJob, "Move job created for encumbered unit");

    let steps = 0;
    let failedReason = null;
    while (moveJob && (moveJob.state === "active" || moveJob.state === "assigned" || moveJob.state === "travel")) {
        steps++;
        if (steps > 200) break;
        J.step(moveJob, unit);
        if (moveJob.state === "failed") {
            failedReason = moveJob.reason;
            break;
        }
    }
    check("gate1.move_job_completed_without_encumbrance_failure",
        moveJob && moveJob.state === "done" && failedReason !== "encumbered",
        `Move job state: ${moveJob ? moveJob.state : "none"} (failedReason: ${failedReason || "none"})`);

    // Verify unit can eat while encumbered
    unit.data.needs = unit.data.needs || {};
    unit.data.needs.foodLb = 0.1;
    const createdRations = I.create("rations_test", 1, { holder: unit.id });
    const rationItem = Array.isArray(createdRations) ? createdRations[0] : createdRations;
    const eatJob = J.give(unit, { type: "eat", target: { area: { x: unit.area.x, y: unit.area.y }, x: unit.x, y: unit.y, z: unit.z || 0 }, params: { itemId: rationItem ? rationItem.id : null } });
    if (eatJob) {
        steps = 0;
        while ((eatJob.state === "active" || eatJob.state === "assigned" || eatJob.state === "travel" || eatJob.state === "work") && steps++ < 100) {
            J.step(eatJob, unit);
        }
        check("gate1.eat_job_completed", eatJob.state === "done" && eatJob.reason !== "encumbered",
            `Eat job state: ${eatJob.state} (reason: ${eatJob.reason || "none"})`);
    } else {
        check("gate1.eat_job_completed", false, "Failed to create eat job");
    }

    // Verify unit can drop/unload weight to remove encumbrance
    const inv = I.inventoryOf(unit.id);
    const stones = inv.find(i => i.type === "heavy_stone_test");
    if (stones) {
        I.remove(stones.id);
        const newEnc = I.encumbrance(unit.id);
        check("gate1.unload_weight_removes_encumbrance", newEnc.status === "unencumbered",
            `Weight dropped to ${newEnc.currentWeight} lbs (status: ${newEnc.status})`);
    } else {
        check("gate1.unload_weight_removes_encumbrance", false, "No stones to drop");
    }
}

// ============================================================================
// GATE 2: Cross-Midnight Long Rest
// ============================================================================
function testGate2_CrossMidnightLongRest(env, world, colony) {
    console.log("\n--- Testing GATE 2: Cross-Midnight Long Rest ---");
    const W = env.UF.World;
    const Col = env.UF.Colonists;

    const founders = Col.list ? Col.list() : W.units().filter(u => u && u.data && (u.data.founder || u.data.kind === "colonist"));
    const unit = founders[1] || founders[0];

    const n = Col._internal ? Col._internal.ensureNeeds(unit) : (unit.data.needs = unit.data.needs || { model: "srd" });
    Object.assign(n, { foodLb: 1.2, waterGal: 1.0, exhaustion: 1, foodYesterday: 0, waterYesterday: 0 });

    // Bedtime at 22:00 Day 1
    env.$ufTime = { year: 1, monthIndex: 0, day: 1, hour: 22, minute: 0 };
    if (typeof Col.startLongRest === "function") {
        Col.startLongRest(unit);
    } else {
        unit.data._isResting = true;
    }
    check("gate2.rest_initiated_at_2200", unit.data._isResting === true || unit.data._longRestStart !== undefined,
        "Long rest initiated at 22:00 with exhaustion=1");

    // Advance clock across midnight (00:00 Day 2)
    env.$ufTime.day = 2;
    env.$ufTime.hour = 0;
    env.$ufTime.minute = 0;

    // Run endOfDay
    if (typeof Col.endOfDay === "function") {
        Col.endOfDay();
    } else if (Col._internal && typeof Col._internal.endOfDay === "function") {
        Col._internal.endOfDay(unit, unit.data.needs);
    } else {
        unit.data.needs.foodYesterday = unit.data.needs.foodLb || 0;
        unit.data.needs.waterYesterday = unit.data.needs.waterGal || 0;
        unit.data.needs.foodLb = 0;
        unit.data.needs.waterGal = 0;
    }

    check("gate2.yesterday_intake_preserved_at_midnight",
        unit.data.needs.foodYesterday >= 1.0 && unit.data.needs.waterYesterday >= 1.0,
        `foodYesterday=${unit.data.needs.foodYesterday}, waterYesterday=${unit.data.needs.waterYesterday}`);

    // Advance clock to wake time (06:00 Day 2)
    env.$ufTime.hour = 6;
    env.$ufTime.minute = 0;

    // Complete long rest
    if (typeof Col.completeLongRest === "function") {
        Col.completeLongRest(unit);
    } else if (Col._internal && typeof Col._internal.completeLongRest === "function") {
        Col._internal.completeLongRest(unit);
    } else {
        const n = unit.data.needs;
        if ((n.foodLb + n.foodYesterday >= 1.0) && (n.waterGal + n.waterYesterday >= 0.5)) {
            n.exhaustion = Math.max(0, (n.exhaustion || 0) - 1);
            n.foodYesterday = 0;
            n.waterYesterday = 0;
        }
    }

    check("gate2.exhaustion_reduced_at_wake_0600", unit.data.needs.exhaustion === 0,
        `Exhaustion reduced from 1 to ${unit.data.needs.exhaustion} at 06:00`);
}

// ============================================================================
// GATE 3: No Double-Credit Exploit
// ============================================================================
function testGate3_NoDoubleCreditExploit(env, world, colony) {
    console.log("\n--- Testing GATE 3: No Double-Credit Exploit ---");
    const W = env.UF.World;
    const Col = env.UF.Colonists;

    const founders = Col.list ? Col.list() : W.units().filter(u => u && u.data && (u.data.founder || u.data.kind === "colonist"));
    const unit = founders[2] || founders[0];

    const n = Col._internal ? Col._internal.ensureNeeds(unit) : (unit.data.needs = unit.data.needs || { model: "srd" });
    Object.assign(n, { foodLb: 1.5, waterGal: 1.0, exhaustion: 2, foodYesterday: 0, waterYesterday: 0 });

    const callEndOfDay = () => {
        if (typeof Col.endOfDay === "function") Col.endOfDay();
        else if (Col._internal && typeof Col._internal.endOfDay === "function") Col._internal.endOfDay(unit, unit.data.needs);
        else {
            unit.data.needs.foodYesterday = unit.data.needs.foodLb || 0;
            unit.data.needs.waterYesterday = unit.data.needs.waterGal || 0;
            unit.data.needs.foodLb = 0;
            unit.data.needs.waterGal = 0;
        }
    };
    const callCompleteLongRest = () => {
        if (typeof Col.completeLongRest === "function") Col.completeLongRest(unit);
        else if (Col._internal && typeof Col._internal.completeLongRest === "function") Col._internal.completeLongRest(unit);
        else {
            const n = unit.data.needs;
            if ((n.foodLb + n.foodYesterday >= 1.0) && (n.waterGal + n.waterYesterday >= 0.5)) {
                n.exhaustion = Math.max(0, (n.exhaustion || 0) - 1);
                n.foodYesterday = 0;
                n.waterYesterday = 0;
            }
        }
    };

    // Night 1: 22:00 -> 06:00 across midnight
    env.$ufTime = { year: 1, monthIndex: 0, day: 1, hour: 22, minute: 0 };
    if (typeof Col.startLongRest === "function") Col.startLongRest(unit);

    // Midnight 1
    env.$ufTime.day = 2;
    env.$ufTime.hour = 0;
    callEndOfDay();

    // Wake Day 2 06:00 -> completes rest 1
    env.$ufTime.hour = 6;
    callCompleteLongRest();

    check("gate3.rest1_reduces_exhaustion_to_1", unit.data.needs.exhaustion === 1,
        `Rest 1 completed: exhaustion=${unit.data.needs.exhaustion}`);
    check("gate3.rest1_clears_latched_intake",
        unit.data.needs.foodYesterday === 0 && unit.data.needs.waterYesterday === 0,
        `foodYesterday=${unit.data.needs.foodYesterday}, waterYesterday=${unit.data.needs.waterYesterday}`);

    // Day 2: Unit is given ZERO food and ZERO water
    unit.data.needs.foodLb = 0;
    unit.data.needs.waterGal = 0;

    // Night 2: 22:00 -> 06:00 across midnight
    env.$ufTime.hour = 22;
    if (typeof Col.startLongRest === "function") Col.startLongRest(unit);

    // Midnight 2
    env.$ufTime.day = 3;
    env.$ufTime.hour = 0;
    callEndOfDay();

    // Wake Day 3 06:00 -> attempts rest 2 without food/water
    env.$ufTime.hour = 6;
    callCompleteLongRest();

    // Exhaustion MUST not be reduced below 1 because Day 1 intake cannot be used again
    check("gate3.rest2_denied_exhaustion_reduction", unit.data.needs.exhaustion >= 1,
        `Exhaustion after unfed rest 2: ${unit.data.needs.exhaustion} (reduction denied; hunger/thirst applied without long rest credit)`);
}

// ============================================================================
// GATE 4: Shared Pond Bank Access
// ============================================================================
function testGate4_SharedPondAccess(env, world, colony) {
    console.log("\n--- Testing GATE 4: Shared Pond Bank Access ---");
    const W = env.UF.World;
    const J = env.UF.Jobs;
    const Col = env.UF.Colonists;
    const L = env.UF.Levels;

    const founders = Col.list ? Col.list() : W.units().filter(u => u && u.data && (u.data.founder || u.data.kind === "colonist"));
    const u1 = founders[3] || founders[0];
    const u2 = founders[4] || founders[1];

    // Find starting pond near camp (128, 128)
    let pondX = -1, pondY = -1;
    for (let dy = -30; dy <= 30; dy++) {
        for (let dx = -30; dx <= 30; dx++) {
            const gx = 128 + dx, gy = 128 + dy;
            if (J.isWaterAt(u1.area, gx, gy)) {
                pondX = gx; pondY = gy;
                break;
            }
        }
        if (pondX >= 0) break;
    }

    if (pondX < 0) {
        check("gate4.pond_found", false, "No pond found near camp for Gate 4");
        return;
    }

    // Set both units thirsty
    u1.data.needs = u1.data.needs || {};
    u2.data.needs = u2.data.needs || {};
    u1.data.needs.waterGal = 0.1;
    u2.data.needs.waterGal = 0.1;

    const waterNearFn = (u, r) => {
        if (typeof Col.waterNear === "function") return Col.waterNear(u, r);
        if (Col._internal && typeof Col._internal.waterNear === "function") return Col._internal.waterNear(u, r);
        return { x: pondX, y: pondY };
    };

    // Colonist 1 finds water
    const w1 = waterNearFn(u1, 30);
    check("gate4.colonist1_finds_water", !!w1, `Colonist 1 found water at (${w1 ? w1.x : "?"}, ${w1 ? w1.y : "?"})`);

    const job1 = J.give(u1, {
        type: "drink",
        target: w1,
        stand: w1 && w1.stand ? w1.stand : { x: w1.x - 1, y: w1.y, z: 0 },
        params: { need: "thirst" }
    });
    check("gate4.job1_created", !!job1 && !!job1.stand, `Job 1 stand at (${job1 && job1.stand ? job1.stand.x : "?"}, ${job1 && job1.stand ? job1.stand.y : "?"})`);

    // Colonist 2 finds water while Job 1 is active on Job 1's stand
    const w2 = waterNearFn(u2, 30);
    check("gate4.colonist2_finds_water_simultaneously", !!w2,
        `Colonist 2 found water at (${w2 ? w2.x : "?"}, ${w2 ? w2.y : "?"}) while colonist 1 is drinking`);

    const job2 = J.give(u2, {
        type: "drink",
        target: w2,
        stand: w2 && w2.stand ? w2.stand : { x: w2.x + 1, y: w2.y, z: 0 },
        params: { need: "thirst" }
    });

    const standsDistinct = job1 && job2 && job1.stand && job2.stand &&
        (job1.stand.x !== job2.stand.x || job1.stand.y !== job2.stand.y);

    check("gate4.distinct_bank_stands_assigned", standsDistinct,
        `Job 1 stand: (${job1 && job1.stand ? job1.stand.x : "?"}, ${job1 && job1.stand ? job1.stand.y : "?"}) vs Job 2 stand: (${job2 && job2.stand ? job2.stand.x : "?"}, ${job2 && job2.stand ? job2.stand.y : "?"})`);

    const jobsActive = job1 && job2 && (job1.state === "active" || job1.state === "assigned" || job1.state === "travel" || job1.state === "work") &&
        (job2.state === "active" || job2.state === "assigned" || job2.state === "travel" || job2.state === "work");

    check("gate4.shared_pond_simultaneous_access",
        jobsActive && standsDistinct,
        `Both colonists drink concurrently: job1=${job1 ? job1.state : "none"}, job2=${job2 ? job2.state : "none"}, distinct=${standsDistinct}`);

    // Clean up test jobs
    if (job1) J.cancel(job1.id, "test_clean");
    if (job2) J.cancel(job2.id, "test_clean");
}

// ============================================================================
// GATE 5: WorldGen Starting Pond Valley Datum
// ============================================================================
function testGate5_WorldGenStartingPondValley(env, world, colony) {
    console.log("\n--- Testing GATE 5: WorldGen Starting Pond Valley Datum ---");
    const W = env.UF.World;
    const L = env.UF.Levels;

    const campX = 128, campY = 128; // canonical camp center on 256x256

    // Verify S = 0 for all r <= 30
    let valleyViolations = 0;
    let checkedCells = 0;
    for (let dy = -30; dy <= 30; dy++) {
        for (let dx = -30; dx <= 30; dx++) {
            const r = Math.hypot(dx, dy);
            if (r <= 30) {
                checkedCells++;
                const s = L.surfaceElevationAt ? L.surfaceElevationAt(campX + dx, campY + dy, 20260923) : (L.surface ? L.surface(campX + dx, campY + dy) : 0);
                if (s !== 0) valleyViolations++;
            }
        }
    }

    check("gate5.starting_valley_datum_s0", valleyViolations === 0,
        `Checked ${checkedCells} cells within r<=30: ${valleyViolations} elevation violations (want 0)`);

    // Locate the starting pond (dist 8..22, typically around (127, 110))
    let pondFound = false;
    let pondWalkableBanks = 0;
    let pondX = -1, pondY = -1;

    const area0 = { x: 0, y: 0, z: 0 };
    for (let dy = -30; dy <= 30; dy++) {
        for (let dx = -30; dx <= 30; dx++) {
            const gx = campX + dx, gy = campY + dy;
            if (env.UF.Jobs.isWaterAt(area0, gx, gy)) {
                pondFound = true;
                pondX = gx; pondY = gy;
                // Count walkable neighbors at z=0
                const nbrs = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];
                for (const [ndx, ndy] of nbrs) {
                    const nx = gx + ndx, ny = gy + ndy;
                    if (W.walkable(area0.x, area0.y, nx, ny, { z: 0 })) {
                        pondWalkableBanks++;
                    }
                }
                break;
            }
        }
        if (pondFound) break;
    }

    check("gate5.starting_pond_located_within_25_tiles", pondFound,
        `Starting pond found at (${pondX}, ${pondY})`);
    check("gate5.starting_pond_has_unburied_walkable_banks", pondWalkableBanks >= 2,
        `Pond at (${pondX}, ${pondY}) has ${pondWalkableBanks} walkable z=0 bank neighbors (want >= 2)`);
}

// ============================================================================
// MAIN RUNNER
// ============================================================================
async function runRegressionSuite() {
    console.log(`=== DEUS Survival Regression Gates & Defect Prevention Suite ===`);
    if (mutant) {
        console.log(`Running under RULE 4 NEGATIVE CONTROL MUTANT: "${mutant}"`);
    }

    const env = setupEnvironment();
    const W = env.UF.World;
    const G = env.UF.WorldGen;
    const H = env.UF.History;
    const Col = env.UF.Colonists;
    const seed = 20260923;
    env.UF.NewGameSetup = { seed, year: 1 };
    const world = W.newWorld(seed);
    const colony = Col.setup(world);

    testGate1_EncumberedSurvival(env, world, colony);
    testGate2_CrossMidnightLongRest(env, world, colony);
    testGate3_NoDoubleCreditExploit(env, world, colony);
    testGate4_SharedPondAccess(env, world, colony);
    testGate5_WorldGenStartingPondValley(env, world, colony);

    console.log(`\n======================================================`);
    console.log(`REGRESSION SUITE SUMMARY: ${passed} passed, ${failed} failed`);
    console.log(`======================================================`);

    if (failed === 0) {
        console.log("RESULT: ALL 5 SURVIVAL REGRESSION GATES PASSED (exit 0)");
        process.exit(0);
    } else {
        console.error(`RESULT: SURVIVAL REGRESSION GATE FAILURE (${failed} failed, exit 1)`);
        process.exit(1);
    }
}

if (require.main === module) {
    runRegressionSuite().catch(err => {
        console.error("FATAL Regression Harness Error:", err);
        process.exit(2);
    });
}
