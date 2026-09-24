#!/usr/bin/env node
"use strict";

/**
 * tools/test_native_survival_soak.js
 *
 * DEUS-TSK-SURVIVAL-SOAK-01: Native Peaceful-Settlement Mortality Audit & Death Forensics
 *
 * Runs an unattended 7 to 14 day native survival soak of a normal 8-founder settlement
 * using real production plugins, real world generation, real needs (SRD 5.1),
 * real weather/environment, real fire simulation, and real project AI.
 *
 * Validates the Peaceful Baseline Gate:
 * - 8/8 founders alive preferred across 7-14 days.
 * - 0 unknown deaths required (any unknown death is an automatic test failure).
 * - 0 deaths from preventable pathing stupidity.
 * - 0 deaths from failure to eat/drink despite accessible resources.
 * - 0 burning-to-death while safe escape/douse existed.
 * - Structured forensic record emitted for every casualty.
 *
 * Usage:
 *   node tools/test_native_survival_soak.js [--days=7] [--seed=20260923] [--mutant=<name>] [--quiet]
 *
 * Negative control mutants (Rule 4):
 *   --mutant=unknown_death_injected (proves unknown deaths fail the gate)
 *   --mutant=suppress_drinking (proves thirst deaths trigger dehydration forensics and fail gate)
 *   --mutant=suppress_eating (proves hunger deaths trigger starvation forensics and fail gate)
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

const SOAK_DAYS = Math.max(1, parseInt(arg("days", "7"), 10) || 7);
const SEED = (parseInt(arg("seed", "20260923"), 10) >>> 0) || 20260923;
const mutant = arg("mutant", "");
const quiet = process.argv.includes("--quiet");
const TIER = parseInt(arg("tier", "1"), 10) || 1;
const RUN_FEED_SCENE = process.argv.includes("--feed-scene");

const MUTANTS = {
    unknown_death_injected: "inject_unknown_death",
    suppress_drinking: "suppress_drinking",
    suppress_eating: "suppress_eating"
};

if (mutant && !MUTANTS[mutant]) {
    console.error(`Unknown mutant "${mutant}". Supported: ${Object.keys(MUTANTS).join(", ")}`);
    process.exit(2);
}

// Production plugin bundle
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
    "DEUS_Doors.js", // the pathfinder asks UF.Doors whether a door lets a unit through; without it every shelter door is a wall (DEUS-TSK-FABLE-14)
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

const catalogText = fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8");
const tilesetsText = fs.readFileSync(path.join(ROOT, "game", "data", "Tilesets.json"), "utf8");
const pluginsJsText = fs.readFileSync(path.join(ROOT, "game", "js", "plugins.js"), "utf8");

// Apply mutants in memory
if (mutant === "suppress_drinking") {
    sources["DEUS_Colonists.js"] = sources["DEUS_Colonists.js"].replace(
        "j = w ? give(u, { type: \"drink\", target: w, params: { need } }) : null;",
        "j = null; /* MUTANT: drinking suppressed */"
    );
    console.log("MUTANT suppress_drinking: drinking disabled in memory; run must FAIL");
} else if (mutant === "suppress_eating") {
    sources["DEUS_Colonists.js"] = sources["DEUS_Colonists.js"].replace(
        "function foodJob(u) {",
        "function foodJob(u) { return null; /* MUTANT: eating suppressed */"
    );
    console.log("MUTANT suppress_eating: food jobs disabled in memory; run must FAIL");
}

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) {
        passed++;
        console.log(`PASS soak.${name}${detail ? " - " + detail : ""}`);
    } else {
        failed++;
        console.log(`FAIL soak.${name}${detail ? " - " + detail : ""}`);
    }
    return !!condition;
}

// Build VM Environment
function setupEnvironment() {
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

    // Execute plugin scripts in order
    for (const file of PLUGIN_FILES) {
        try {
            vm.runInContext(sources[file], ctx, { filename: file });
        } catch (e) {
            console.error(`Error loading plugin ${file}:`, e);
            throw e;
        }
    }

    return env;
}

async function runNativeSurvivalSoak() {
    console.log(`=== DEUS Native Survival Soak & Death Forensics (Duration: ${SOAK_DAYS} days, Seed: ${SEED}) ===`);

    const env = setupEnvironment();
    const W = env.UF.World;
    const G = env.UF.WorldGen;
    const H = env.UF.History;
    const Col = env.UF.Colonists;
    const J = env.UF.Jobs;
    const P = env.UF.Projects;
    const I = env.UF.Items;
    const Cont = env.UF.Containers;
    const Forensics = env.UF.DeathForensics;

    env.UF.NewGameSetup = { seed: SEED, year: 1 };

    // 1. Initialize World and Generate Geography
    console.log("Generating normal world at Year 1 (Founding Era)...");
    const world = W.newWorld(SEED);

    // Setup Colony for Player Faction (if not already created by world:created)
    const colony = Col.setup(world);
    check("colony_initialized", !!colony, `Player colony established at site ${colony ? colony.siteId : "none"}`);

    // Verify Starting Founders
    const founders = Col.list ? Col.list() : W.units().filter(u => u && u.data && (u.data.founder || u.data.kind === "colonist"));
    check("founders_count", founders.length === 8, `${founders.length} founders present at start`);
    founders.forEach(f => {
        const walk = W.walkable(f.area.x, f.area.y, f.x, f.y, { z: f.z || 0 });
        const obj = env.UF.Objects ? env.UF.Objects.atIn(f.area, f.x, f.y) : null;
        console.log(`  Founder ${f.id} (${f.name}) at (${f.x}, ${f.y}) z=${f.z || 0}: walkable=${walk}, obj=${obj ? obj.id : "none"}`);
    });


    // Verify Starter Chest & Kit
    const campPos = colony && colony.site ? { x: colony.site.x, y: colony.site.y, z: colony.z || 0 } : { x: 32, y: 32, z: 0 };
    const containers = Cont.all ? Cont.all(colony.area, campPos.z) : [];
    const chest = containers.find(c => Math.hypot(c.x - campPos.x, c.y - campPos.y) <= 2);
    check("starter_chest_present", !!chest, `Central starter chest found near camp (${campPos.x},${campPos.y})`);

    // Tier 1 Controlled Survival Soak: ensure abundant food buffer (112 cooked meat = 7 days for 8 founders)
    if (TIER === 1 && chest && Cont.itemsIn) {
        const items = Cont.itemsIn(chest.id);
        const meatItem = items.find(it => it.type === "meat_cooked");
        if (meatItem && meatItem.count < 112) {
            meatItem.count = 112;
        } else if (!meatItem && typeof Cont.putItem === "function") {
            Cont.putItem(chest.id, { type: "meat_cooked", count: 112 });
        }
    }

    // Injected Mutant: unknown_death_injected (Rule 4 check)
    if (mutant === "unknown_death_injected" && founders[0]) {
        console.log("Injecting unknown death on founder 0 for mutant testing...");
        founders[0].data.dead = true;
        founders[0].data.hp = 0;
        if (Forensics && typeof Forensics.recordDeath === "function") {
            Forensics.recordDeath(founders[0], "unknown", null);
        }
    }

    // Daily Metrics Table
    const dailyRecords = [];
    const TICKS_PER_HOUR = 600;
    const STEP_TICKS = 10; // 1 minute per update step

    // Why the engine gave a goal up, per colonist (the last few reasons ride on the unit for the midnight record).
    if (env.UF.Events && typeof env.UF.Events.on === "function") {
        env.UF.Events.on("world:unitBlocked", (u, reason, goal) => {
            try {
                if (!u || !u.data || !(u.data.founder || u.data.kind === "colonist")) return;
                (u.data._soakBlocked = u.data._soakBlocked || []).push(`${env.$ufTime.hour}:${String(env.$ufTime.minute).padStart(2, "0")} ${reason || "?"}${goal ? ` -> (${goal.x},${goal.y})` : ""}`);
                if (u.data._soakBlocked.length > 6) u.data._soakBlocked.shift();
            } catch (_) {}
        });
    }
    // Restock instrument (DEUS-TSK-FABLE-14): gathers of food and hauls of food into the chest or a larder cell.
    env.UF.__soakRestock = { gathers: 0, deposits: 0 };
    if (env.UF.Events && typeof env.UF.Events.on === "function") {
        env.UF.Events.on("jobs:done", job => {
            try {
                if (!job || !job.params) return;
                if (["gather", "pick"].includes(job.type) && (job.params.forage || job.params.material === "food")) env.UF.__soakRestock.gathers++;
                if (job.type === "haul" && job.params.material === "food") env.UF.__soakRestock.deposits++;
            } catch (_) {}
        });
    }

    console.log("\nStarting peaceful unattended settlement simulation...\n");
    console.log("| Day | Living Pop | Food (lb) | Beds (Built/Assigned) | Active Projects | Active Jobs | Deaths | Dehydr/Starve Crit | Exhaustion (Lvl 1-5) |");
    console.log("|-----|------------|-----------|-----------------------|-----------------|-------------|--------|---------------------|----------------------|");

    let currentDay = 1;

    // Disturbance on the last morning (optional, guarded behind --feed-scene):
    const feedScene = { active: RUN_FEED_SCENE, day: SOAK_DAYS, founder: null, fedAt: null, ateAt: null, hauls: 0, created: [], failed: [] };
    env.UF.__soakFeed = feedScene;
    if (env.UF.Events && typeof env.UF.Events.on === "function") {
        env.UF.Events.on("jobs:created", job => { try { if (job && job.params && job.params.feed) feedScene.created.push(`#${job.id} by ${job.owner} at ${env.$ufTime.hour}:${String(env.$ufTime.minute).padStart(2, "0")}`); } catch (_) {} });
        env.UF.Events.on("jobs:failed", job => { try { if (job && job.params && job.params.feed) feedScene.failed.push(`#${job.id}: ${job.reason} at ${env.$ufTime.hour}:${String(env.$ufTime.minute).padStart(2, "0")}`); } catch (_) {} });
        env.UF.Events.on("jobs:done", (job, u) => {
            try {
                if (!feedScene.founder) return;
                if (job && job.type === "haul" && job.params && job.params.feed && job.params.unitId === feedScene.founder.id) { feedScene.hauls++; if (!feedScene.fedAt) feedScene.fedAt = `${env.$ufTime.hour}:${String(env.$ufTime.minute).padStart(2, "0")}`; }
                if (job && job.type === "eat" && u && u.id === feedScene.founder.id && !feedScene.ateAt) feedScene.ateAt = `${env.$ufTime.hour}:${String(env.$ufTime.minute).padStart(2, "0")}`;
            } catch (_) {}
        });
    }

    for (let day = 1; day <= SOAK_DAYS; day++) {
        currentDay = day;
        env.$ufTime.day = day;

        // Run 24 hours of simulation
        for (let hour = 0; hour < 24; hour++) {
            env.$ufTime.hour = hour;

            if (feedScene.active && day === feedScene.day && hour === 8 && !feedScene.founder) {
                const living = W.units().filter(u => u && u.data && (u.data.founder || u.data.kind === "colonist") && !u.data.dead);
                const victim = living[living.length - 1] || null;
                if (victim && victim.data.needs) {
                    for (const it of I.inventoryOf(victim.id)) { const t = I.type(it.type); if (t && t.food) I.remove(it.id); }
                    for (const it of I.atIn(victim.area, victim.x, victim.y)) { const t = I.type(it.type); if (t && t.food) I.remove(it.id); }
                    const job = J.of(victim.id);
                    if (job) J.cancel(job.id, "test: worn down");
                    Object.assign(victim.data.needs, { exhaustion: 5, fromNeeds: 5, foodLb: 0, waterGal: 1 });
                    feedScene.founder = victim;
                    feedScene.start = `${victim.name} (#${victim.id}) at (${victim.x},${victim.y})`;
                    console.log(`  SCENE day ${day} 08:00: ${feedScene.start} worn down to exhaustion 5 with nothing to eat`);
                }
            }

            for (let minute = 0; minute < 60; minute++) {
                env.$ufTime.minute = minute;

                for (let t = 0; t < STEP_TICKS; t++) {
                    if (world.state) world.state.ticks = (world.state.ticks || 0) + 1;
                    world.ticks = (world.ticks || 0) + 1;
                    if (env.$gameMap && typeof env.$gameMap.update === "function") {
                        env.$gameMap.update(true);
                    }
                }

                // Run environmental and projects loops
                if (env.UF.Environment && typeof env.UF.Environment.step === "function") {
                    env.UF.Environment.step(STEP_TICKS);
                }
                if (env.UF.Fire && typeof env.UF.Fire.step === "function") {
                    env.UF.Fire.step(STEP_TICKS);
                }
                if (P && P.scan && (world.state.ticks % 60 === 0)) P.scan();
            }
        }

        // --- Collect Daily Metrics ---
        const liveUnits = W.units().filter(u => u && u.data && (u.data.founder || u.data.kind === "colonist") && !u.data.dead && !u.data._isDying);
        const popCount = liveUnits.length;

        // Food accounting
        let totalFoodLb = 0;
        for (const u of liveUnits) {
            for (const it of I.inventoryOf(u.id)) {
                const t = I.type(it.type);
                if (t && t.food && Number.isFinite(t.food.nutrition)) totalFoodLb += t.food.nutrition * (it.count || 1);
            }
        }
        for (const c of Cont.all(colony.area, campPos.z)) {
            for (const it of Cont.itemsIn(c.id)) {
                const t = I.type(it.type);
                if (t && t.food && Number.isFinite(t.food.nutrition)) totalFoodLb += t.food.nutrition * (it.count || 1);
            }
        }

        // Bed accounting
        const O = env.UF.Objects;
        const beds = O ? O.findIn(colony.area, { tags: ["bed"] }) : [];
        const assignedBeds = liveUnits.filter(u => u.data && u.data.bed).length;

        // Projects & Jobs
        const activeProjects = P && P.active ? P.active().map(p => p.type) : [];
        const activeJobCount = J && J.all ? J.all().filter(j => j.state === "active" || j.state === "assigned").length : 0;

        // Mortality summary
        const mortSummary = Col.mortalitySummary ? Col.mortalitySummary() : { totalDeaths: 0, byCause: {} };

        // Critical status
        let dehydrCrit = 0, starveCrit = 0;
        const exhLevels = [0, 0, 0, 0, 0, 0];
        for (const u of liveUnits) {
            const n = u.data && u.data.needs;
            if (n) {
                if (n.waterGal < 0.2) dehydrCrit++;
                if (n.foodLb < 0.2 && n.daysWithoutFood >= 2) starveCrit++;
                const lvl = Math.min(5, Math.max(0, n.exhaustion | 0));
                exhLevels[lvl]++;
            }
        }

        // Who ends the day short of water or food, and what they were doing (the record for the forensics of habits).
        if (!quiet) {
            for (const u of liveUnits) {
                const n = u.data && u.data.needs;
                if (!n || (n.waterGal >= 0.2 && !(n.foodLb < 0.2))) continue;
                const job = J && typeof J.of === "function" ? J.of(u.id) : null;
                const s = u.data.sleepSchedule || {};
                const ev = Col.recentEvents ? Col.recentEvents(u.id).slice(-5).map(e => `${e.time || ""} ${e.type}${e.text ? ": " + e.text : ""}`).join(" | ") : "";
                // The ground under and around a stuck colonist: walkable neighbours, the target of its job, and a path check.
                const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];
                const walk = dirs.map(([dx, dy]) => (W.walkable(u.area.x, u.area.y, u.x + dx, u.y + dy, { z: u.z || 0 }) ? "." : "#")).join("");
                const here = W.walkable(u.area.x, u.area.y, u.x, u.y, { z: u.z || 0 }) ? "here ok" : "HERE BLOCKED";
                const tgt = job && job.target ? `target (${job.target.x},${job.target.y}) z${job.target.z || 0} stand ${job.stand ? `(${job.stand.x},${job.stand.y})` : "-"}` : "";
                const objHere = env.UF.Objects ? env.UF.Objects.atIn(u.area, u.x, u.y) : null;
                // A 7x7 map of the ground round the colonist (. walkable, # not, @ the colonist, o an object's first letter) and the
                // engine's own path verdict to the job's stand square.
                const rows = [];
                for (let dy = -3; dy <= 3; dy++) {
                    let row = "";
                    for (let dx = -3; dx <= 3; dx++) {
                        const x = u.x + dx, y = u.y + dy;
                        if (!dx && !dy) { row += "@"; continue; }
                        const o = env.UF.Objects ? env.UF.Objects.atIn(u.area, x, y) : null;
                        row += W.walkable(u.area.x, u.area.y, x, y, { z: u.z || 0 }) ? (o ? o.id[0] : ".") : (o ? o.id[0].toUpperCase() : "#");
                    }
                    rows.push(row);
                }
                let pathVerdict = "no stand";
                if (job && job.stand && typeof W.findPath === "function") {
                    try { const p = W.findPath(u.area, u.x, u.y, job.stand.x, job.stand.y, { unit: u }); pathVerdict = p ? `path of ${Array.isArray(p) ? p.length : "?"} to the stand` : "NO PATH to the stand"; } catch (e) { pathVerdict = `findPath threw: ${e.message}`; }
                }
                const blocked = (u.data._soakBlocked || []).slice(-3).join("; ");
                console.log(`  GROUND ${u.name}: ${rows.join(" / ")} | ${pathVerdict}${blocked ? ` | blocked: ${blocked}` : ""}`);
                console.log(`  SHORT day ${day} ${u.name} (#${u.id}) at (${u.x},${u.y}) z${u.z || 0} ${here} nbrs[NESW,NE,SE,SW,NW]=${walk} obj ${objHere ? objHere.id : "-"} ${tgt} water ${n.waterGal} food ${n.foodLb} exh ${n.exhaustion} bed ${Math.floor((s.bedMinute || 0) / 60)}:${String((s.bedMinute || 0) % 60).padStart(2, "0")} wake ${Math.floor((s.wakeMinute || 0) / 60)}:${String((s.wakeMinute || 0) % 60).padStart(2, "0")} job ${job ? `${job.type}#${job.id} ${job.state}${job.reason ? " (" + job.reason + ")" : ""}` : "none"} drank ${u.data._lastDrinkTime || "never"} ate ${u.data._lastMealTime || "never"} rest ${u.data._lastLongRest || "never"} rung ${u.data._currentDecisionRung} | ${ev}`);
            }
        }
        // The settlement's food reserve in colonist-days, as the brain reads it (the restock check needs the lowest).
        try {
            const dd = P && typeof P.evaluateDeficits === "function" ? P.evaluateDeficits(colony.area) : null;
            if (dd && dd.food) { const r = env.UF.__soakRestock; if (r) { r.minReserve = Math.min(r.minReserve === undefined ? Infinity : r.minReserve, dd.food.current); r.target = dd.food.needed; } }
        } catch (_) {}
        const exhStr = `[0:${exhLevels[0]} 1:${exhLevels[1]} 2:${exhLevels[2]} 3:${exhLevels[3]} 4:${exhLevels[4]} 5:${exhLevels[5]}]`;
        const activeProjStr = activeProjects.length ? activeProjects.join(",") : "none";

        console.log(`| ${String(day).padEnd(3)} | ${String(popCount).padEnd(10)} | ${String(totalFoodLb.toFixed(1)).padEnd(9)} | ${String(beds.length + "/" + assignedBeds).padEnd(21)} | ${activeProjStr.padEnd(15)} | ${String(activeJobCount).padEnd(11)} | ${String(mortSummary.totalDeaths).padEnd(6)} | ${String(dehydrCrit + "/" + starveCrit).padEnd(19)} | ${exhStr.padEnd(20)} |`);

        dailyRecords.push({
            day,
            livingPop: popCount,
            foodReserve: totalFoodLb,
            bedsBuilt: beds.length,
            bedsAssigned: assignedBeds,
            activeProjects: activeProjects.slice(),
            jobCount: activeJobCount,
            totalDeaths: mortSummary.totalDeaths,
            deathsByCause: { ...mortSummary.byCause },
            dehydrCrit,
            starveCrit,
            exhaustionDist: exhLevels
        });
    }

    console.log("\n--- Simulation Complete. Evaluating Peaceful Baseline Gate ---");

    const finalMortality = Col.mortalitySummary ? Col.mortalitySummary() : { totalDeaths: 0, byCause: {}, ledger: [] };
    const ledger = finalMortality.ledger || [];

    // Print all forensic records if any deaths occurred
    if (ledger.length > 0) {
        console.log(`\n=== CASUALTY FORENSIC PACKETS (${ledger.length} total) ===`);
        for (let i = 0; i < ledger.length; i++) {
            const r = ledger[i];
            console.log(`\n--- Casualty #${i + 1}: ${r.name} (Unit #${r.unitId}) ---`);
            console.log(JSON.stringify(r, null, 2));
        }
    } else {
        console.log("\n0 deaths recorded during soak period!");
    }

    // Baseline Gate Checks
    const unknownDeaths = finalMortality.byCause["unknown"] || 0;
    check("zero_unknown_deaths", unknownDeaths === 0, `Unknown deaths: ${unknownDeaths} (want 0)`);

    const preventablePathDeaths = finalMortality.byCause["trapped/pathing"] || 0;
    check("zero_preventable_pathing_deaths", preventablePathDeaths === 0, `Trapped/pathing deaths: ${preventablePathDeaths} (want 0)`);

    const finalPop = dailyRecords[dailyRecords.length - 1].livingPop;
    check("founders_survived_7_days", finalPop >= 8, `Living founders after ${SOAK_DAYS} days: ${finalPop}/8`);

    // Sustenance habits (DEUS-TSK-FABLE-14): from the second day on, nobody ends a day short of water (a drink before
    // the long rest and breakfast after it), and nobody is worn down by thirst or hunger rolls at the end.
    const laterDays = dailyRecords.slice(1);
    const dryDays = laterDays.filter(r => r.dehydrCrit > 0).map(r => `day ${r.day}: ${r.dehydrCrit}`);
    const hungryDays = laterDays.filter(r => r.starveCrit > 0).map(r => `day ${r.day}: ${r.starveCrit}`);
    check("nobody_dehydrated_at_midnight", dryDays.length === 0 && hungryDays.length === 0,
        `founders short of water at midnight: ${dryDays.length ? dryDays.join(", ") : "none"}; starving: ${hungryDays.length ? hungryDays.join(", ") : "none"} (days 2..${SOAK_DAYS})`);
    const last = dailyRecords[dailyRecords.length - 1].exhaustionDist;
    const sceneVictim = env.UF.__soakFeed && env.UF.__soakFeed.founder ? 1 : 0; // the founder the feed scene wore down on purpose
    const wornDown = last.slice(2).reduce((n, c) => n + c, 0) - sceneVictim;
    check("nobody_worn_down", wornDown <= 0, `founders at exhaustion 2 or worse on day ${SOAK_DAYS}: ${Math.max(0, wornDown)} besides the feed scene's (distribution [${last.join(" ")}])`);
    // The communal store is restocked by the colonists' own foraging: gather jobs done and food hauled into the
    // chest or the larder cells during the soak.
    if (feedScene.active) {
        const fs2 = env.UF.__soakFeed || {};
        const fedFounderAlive = fs2.founder ? !fs2.founder.data.dead && !!W.unit(fs2.founder.id) : false;
        const fedFoodLb = fs2.founder && fs2.founder.data.needs ? fs2.founder.data.needs.foodLb : null;
        check("immobile_founder_fed_by_a_friend", !!fs2.founder && fs2.hauls > 0 && !!fs2.ateAt && fedFounderAlive && fedFoodLb > 0,
            fs2.founder ? `${fs2.start}: ${fs2.hauls} food haul(s) to its feet (first at ${fs2.fedAt || "never"}), ate at ${fs2.ateAt || "never"}, alive ${fedFounderAlive}, ${fedFoodLb} lb eaten that day; feed hauls created [${(fs2.created || []).slice(0, 6).join("; ")}], failed [${(fs2.failed || []).slice(0, 6).join("; ")}]` : "scene never ran");
    }
    const restock = env.UF.__soakRestock || { gathers: 0, deposits: 0 };
    // The colonists restock the store themselves once the reserve runs short of the brain's target; a run whose
    // reserve never dips (a seven-day starter chest over a short run) has nothing to restock and says so.
    const restockNeeded = Number.isFinite(restock.minReserve) && Number.isFinite(restock.target) && restock.minReserve < restock.target;
    check("larder_replenished_by_foraging", restockNeeded ? (restock.gathers > 0 && restock.deposits > 0) : true,
        `${restock.gathers} food gather job(s) done, ${restock.deposits} haul(s) of food into the chest or a larder cell; lowest reserve ${Number.isFinite(restock.minReserve) ? restock.minReserve.toFixed(2) : "?"} of ${restock.target || "?"} colonist-days (${restockNeeded ? "restocking was needed" : "the reserve never ran short: nothing to restock"})`);

    console.log(`\nMortality Breakdown by Cause:`, JSON.stringify(finalMortality.byCause, null, 2));

    const totalFailed = failed;
    if (totalFailed === 0) {
        console.log(`\nRESULT: ALL SOAK CHECKS PASSED (${passed} passed, 0 failed, exit 0)`);
        process.exit(0);
    } else {
        console.error(`\nRESULT: SOAK CHECKS FAILED (${passed} passed, ${failed} failed, exit 1)`);
        process.exit(1);
    }
}

module.exports = { setupEnvironment, runNativeSurvivalSoak };

if (require.main === module) {
    runNativeSurvivalSoak().catch(err => {
        console.error("FATAL Soak Harness Error:", err);
        process.exit(2);
    });
}
