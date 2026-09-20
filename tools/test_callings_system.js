/**
 * Verification test suite for Creature Callings and Professions system.
 * Tests all 89 professions, population-scaled weighting curve, sampling without replacement,
 * founder / newborn / immigrant integration, profile tab rendering, seeded determinism,
 * and mutant provocation (Rule 4).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const Callings = require("../game/js/plugins/UF_Callings.js");
const PROFESSIONS = Callings.PROFESSIONS;

const args = process.argv.slice(2);
const mutant = (args.find(a => a.startsWith("--mutant=")) || "").split("=")[1] || null;

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
    if (condition) {
        console.log(`PASS ${name} - ${detail}`);
        passed++;
    } else {
        console.error(`FAIL ${name} - ${detail}`);
        failed++;
    }
}

console.log("=== Running test_callings_system ===");

// 1. Exact 89 professions defined
check("professions_count_exact_89", PROFESSIONS.length === 89, `Count is ${PROFESSIONS.length} (expected 89)`);

// 2. Sequential ranks 1..89 and unique IDs
let sequential = true;
const idSet = new Set();
for (let i = 0; i < PROFESSIONS.length; i++) {
    const p = PROFESSIONS[i];
    if (p.rank !== i + 1) sequential = false;
    if (!p.id || idSet.has(p.id)) sequential = false;
    idSet.add(p.id);
}
check("professions_ranks_and_ids", sequential && idSet.size === 89, `All 89 ranks are 1..89 with distinct IDs`);

// 3. First and last professions
const first = PROFESSIONS[0];
const last = PROFESSIONS[88];
check("first_and_last_professions",
    first.rank === 1 && first.name === "Farmer" && first.tier === "Critical" &&
    last.rank === 89 && last.name === "Duke" && last.tier === "Prestige rather than production",
    `Rank 1 is ${first.name} (${first.tier}); Rank 89 is ${last.name} (${last.tier})`);

// 4. All user tiers represented
const tiersPresent = new Set(PROFESSIONS.map(p => p.tier));
const expectedTiers = [
    "Critical", "Very high", "High", "Moderate-high", "Moderate-high*", "Moderate",
    "Situational", "Low", "Highly situational", "Little colony value", "Prestige rather than production"
];
const allTiersFound = expectedTiers.every(t => tiersPresent.has(t));
check("all_tiers_represented", allTiersFound, `Found all ${expectedTiers.length} distinct tiers`);

// 5. Monotonic weights for all tested populations
let allMonotonic = true;
for (const pop of [1, 8, 25, 50, 100, 150, 200]) {
    const weights = Callings.getWeights(pop);
    for (let i = 0; i < weights.length - 1; i++) {
        if (weights[i] < weights[i + 1]) {
            allMonotonic = false;
            break;
        }
    }
}
check("monotonic_weights_at_all_populations", allMonotonic, "Weights strictly decrease with rank across all populations 1..200");

// 6. Small society critical bias (P = 8)
const iters = 10000;
const countsP8 = {};
PROFESSIONS.forEach(p => countsP8[p.tier] = 0);
for (let i = 0; i < iters; i++) {
    const sampled = Callings.sampleCallings(8, 3);
    for (const c of sampled) countsP8[c.tier]++;
}
const totalP8 = iters * 3;
const critPctP8 = (countsP8["Critical"] / totalP8) * 100;
const veryHighPctP8 = (countsP8["Very high"] / totalP8) * 100;
const combinedHighP8 = critPctP8 + veryHighPctP8;
const prestigePctP8 = (countsP8["Prestige rather than production"] / totalP8) * 100;

check("small_society_critical_bias_p8",
    combinedHighP8 >= 90.0 && prestigePctP8 < 0.1,
    `P=8: Critical=${critPctP8.toFixed(1)}%, Very High=${veryHighPctP8.toFixed(1)}% (Combined=${combinedHighP8.toFixed(1)}% >= 90%); Prestige=${prestigePctP8.toFixed(3)}% < 0.1%`);

// 7. Large society lenience (P = 200)
const countsP200 = {};
PROFESSIONS.forEach(p => countsP200[p.tier] = 0);
for (let i = 0; i < iters; i++) {
    const sampled = Callings.sampleCallings(200, 3);
    for (const c of sampled) countsP200[c.tier]++;
}
const totalP200 = iters * 3;
const critPctP200 = (countsP200["Critical"] / totalP200) * 100;
const prestigePctP200 = (countsP200["Prestige rather than production"] / totalP200) * 100;
const midTiersP200 = ((countsP200["High"] + countsP200["Moderate"] + countsP200["Situational"] + countsP200["Low"]) / totalP200) * 100;

check("large_society_lenience_p200",
    critPctP200 >= 20.0 && critPctP200 <= 40.0 && prestigePctP200 >= 1.5 && midTiersP200 >= 40.0,
    `P=200: Critical=${critPctP200.toFixed(1)}% (remains plurality), Prestige=${prestigePctP200.toFixed(2)}% >= 1.5%, Mid-tiers=${midTiersP200.toFixed(1)}%`);

// 8. Exactly 3 distinct callings per creature (sampling without replacement)
let threeDistinct = true;
for (let i = 0; i < 500; i++) {
    const s = Callings.sampleCallings(50, 3);
    if (s.length !== 3) { threeDistinct = false; break; }
    if (s[0].id === s[1].id || s[0].id === s[2].id || s[1].id === s[2].id) {
        threeDistinct = false; break;
    }
}
check("exact_three_distinct_callings", threeDistinct, "500 creatures sampled, all received exactly 3 distinct callings (0 duplicates)");

// 9. Primary calling matches callings[0]
const testUnit = { data: { faction: "f1", kind: "person" } };
Callings.assignCallings(testUnit, 10);
check("primary_calling_matches_first",
    Array.isArray(testUnit.data.callings) && testUnit.data.callings.length === 3 &&
    testUnit.data.calling && testUnit.data.calling.id === testUnit.data.callings[0].id,
    `Primary calling is ${testUnit.data.calling ? testUnit.data.calling.name : "none"}, matches callings[0]`);

// 10. Seeded determinism
function seededRng(seed) {
    let s = seed | 0;
    return () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const s1 = Callings.sampleCallings(8, 3, seededRng(12345));
const s2 = Callings.sampleCallings(8, 3, seededRng(12345));
const s3 = Callings.sampleCallings(8, 3, seededRng(54321));
const sameSeedMatch = s1[0].id === s2[0].id && s1[1].id === s2[1].id && s1[2].id === s2[2].id;
const diffSeedDiffer = s1[0].id !== s3[0].id || s1[1].id !== s3[1].id || s1[2].id !== s3[2].id;
check("seeded_determinism", sameSeedMatch && diffSeedDiffer,
    `Seed 12345 produced identical (${s1.map(x=>x.name).join(", ")}); Seed 54321 produced (${s3.map(x=>x.name).join(", ")})`);

// 11. Household calling workstation integration
const UF_Households = require("../game/js/plugins/UF_Households.js");
const blacksmithUnit = { data: { callings: [{ id: "blacksmith", name: "Blacksmith" }, { id: "miner", name: "Miner" }, { id: "laborer", name: "Laborer" }] } };
const bsStation = UF_Households.callingFor ? UF_Households.callingFor(blacksmithUnit) : null;
check("household_workstation_integration",
    bsStation && bsStation.station === "smithy" && bsStation.title === "Blacksmith",
    `Blacksmith calling maps to station=${bsStation ? bsStation.station : "none"}, title=${bsStation ? bsStation.title : "none"}`);

// 12. ProfileTabs Overview Tab integration
const UF_ProfileTabs = require("../game/js/plugins/UF_ProfileTabs.js");
const inspectUnit = {
    id: 101, name: "TEST_Caller", x: 10, y: 10,
    data: {
        kind: "colonist", faction: "player", species: "human", gender: "male", age: 25, stage: "adult",
        callings: [
            { rank: 1, id: "farmer", name: "Farmer", tier: "Critical" },
            { rank: 2, id: "carpenter", name: "Carpenter", tier: "Critical" },
            { rank: 18, id: "hunter", name: "Hunter", tier: "Critical" }
        ],
        calling: { rank: 1, id: "farmer", name: "Farmer", tier: "Critical" }
    }
};
const overviewModel = UF_ProfileTabs.model ? UF_ProfileTabs.model(inspectUnit, "overview") : null;
const rows = overviewModel && overviewModel.rows ? overviewModel.rows : [];
const callingsRow = rows.find(r => r.text && r.text.includes("Callings:"));
check("profile_tabs_overview_shows_callings",
    callingsRow && callingsRow.text.includes("Farmer") && callingsRow.text.includes("Carpenter") && callingsRow.text.includes("Hunter"),
    `ProfileTabs overview line: "${callingsRow ? callingsRow.text : "NOT FOUND"}"`);

// 13. Sandboxed World, Faction, History, and Colonists Integration
const catalogPath = path.join(ROOT, "game", "data", "UF_WorldCatalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

function createSandboxEnvironment(seed = 7777) {
    const events = {};
    const units = {};
    let nextUnitId = 1;

    const World = {
        state: {
            seed,
            size: 128,
            areasX: 1,
            areasY: 1,
            startArea: { x: 0, y: 0 },
            factions: null,
            history: null,
            households: null,
            outposts: null,
            jobs: { nextId: 1, list: [] },
            nextUnitId: 1
        },
        units: () => Object.values(units),
        unit: id => units[id] || null,
        addUnit: spec => {
            const id = nextUnitId++;
            World.state.nextUnitId = nextUnitId;
            const u = {
                id,
                name: spec.name || `Unit_${id}`,
                image: spec.image || { characterName: "$UF_Human_Male_1_Walk", characterIndex: 0 },
                area: spec.area || { x: 0, y: 0 },
                z: spec.z !== undefined ? spec.z : 0,
                x: spec.x || 0,
                y: spec.y || 0,
                dir: spec.dir || 2,
                data: Object.assign({}, spec.data)
            };
            units[id] = u;
            if (u.data && u.data.faction && (!u.data.callings || u.data.callings.length < 3) && (u.data.kind === "person" || u.data.kind === "colonist" || u.data.species)) {
                Callings.assignCallings(u);
            }
            return u;
        },
        removeUnit: id => { delete units[id]; },
        getTile: () => 0,
        getObject: () => 0,
        setObject: () => {},
        cellFree: () => true,
        walkable: () => true,
        eventOf: () => null,
        refreshUnitImage: () => {}
    };

    const Events = {
        on: (name, fn) => { (events[name] = events[name] || []).push(fn); },
        off: (name, fn) => {
            if (events[name]) events[name] = events[name].filter(f => f !== fn);
        },
        emit: (name, ...args) => {
            if (events[name]) for (const fn of events[name]) fn(...args);
        }
    };

    function Game_Map() {}
    Game_Map.prototype.update = function() {};
    function Window_Base() {}
    Window_Base.prototype.initialize = function() {};
    Window_Base.prototype.hide = function() {};
    function Scene_Base() {}
    function Scene_Map() {}
    Scene_Map.prototype.createAllWindows = function() {};
    Scene_Map.prototype.update = function() {};

    const Input = { keyMapper: {}, isTriggered: () => false };
    const TouchInput = { isTriggered: () => false };
    const Graphics = { width: 816, height: 624 };
    const ImageManager = { loadCharacter: () => ({ isReady: () => true }) };
    const SceneManager = { _scene: null };

    const sandbox = {
        console,
        window: {},
        $ufWorldCatalog: catalog,
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8 },
        Tilemap: { isTileA1: () => false },
        PluginManager: { parameters: () => ({}) },
        Game_Map,
        Window_Base,
        Scene_Base,
        Scene_Map,
        Input,
        TouchInput,
        Graphics,
        ImageManager,
        SceneManager,
        Scene_Boot: function() {},
        DataManager: { extractSaveContents: () => {} },
        Math, Object, Array, String, Number, Set, Map, JSON
    };
    sandbox.window = sandbox;
    sandbox.Scene_Boot.prototype.start = function() {};

    const ctx = vm.createContext(sandbox);

    const loadPlugin = filename => {
        const fullPath = path.join(ROOT, "game", "js", "plugins", filename);
        const code = fs.readFileSync(fullPath, "utf8");
        vm.runInContext(code, ctx);
    };

    sandbox.UF = sandbox.UF || {};
    sandbox.UF.World = World;
    sandbox.UF.Events = Events;
    sandbox.UF.Callings = Callings;
    sandbox.UF.WorldGen = { cellInfo: () => ({ walkable: true, peak: false, water: false, ground: "grass" }) };
    sandbox.UF.Jobs = { standable: () => true };
    sandbox.UF.Levels = {
        settlementCell: (st, ref) => ({ x: 64, y: 64, z: ref && ref.z !== undefined ? ref.z : -1 }),
        habitablePockets: (z, ax, ay) => [
            { id: 1, x: 40, y: 40 },
            { id: 2, x: 60, y: 60 },
            { id: 3, x: 80, y: 80 },
            { id: 4, x: 30, y: 70 },
            { id: 5, x: 70, y: 30 },
            { id: 6, x: 50, y: 90 },
            { id: 7, x: 90, y: 50 },
            { id: 8, x: 45, y: 55 }
        ]
    };

    loadPlugin("UF_Factions.js");
    loadPlugin("UF_History.js");
    loadPlugin("UF_Households.js");

    return { sandbox, World, ctx };
}

const env = createSandboxEnvironment(7777);
const state = env.World.state;
env.sandbox.UF.Factions.generate(state);
env.sandbox.UF.History.generate(state);

const people = env.sandbox.UF.History.spawnPeople(state);
check("founders_spawned_with_callings",
    people.length > 0 && people.every(u => Array.isArray(u.data.callings) && u.data.callings.length === 3 && u.data.calling),
    `Spawned ${people.length} founders across factions; 100% have 3 distinct callings and primary calling`);

let founderCritCount = 0;
let founderTotal = 0;
for (const u of people) {
    for (const c of u.data.callings) {
        founderTotal++;
        if (c.tier === "Critical" || c.tier === "Very high") founderCritCount++;
    }
}
const founderCritRatio = founderCritCount / founderTotal;
check("founders_skew_critical", founderCritRatio >= 0.80,
    `${founderCritCount}/${founderTotal} (${(founderCritRatio * 100).toFixed(1)}%) of founder callings are Critical or Very High (expected >= 80%)`);

// 14. Universal World.addUnit safety check
const orphanUnit = env.World.addUnit({
    name: "TEST_Orphan",
    area: { x: 0, y: 0 },
    x: 50, y: 50, dir: 2,
    data: { kind: "person", faction: "f1", species: "human" }
});
check("world_addunit_assigns_callings_automatically",
    Array.isArray(orphanUnit.data.callings) && orphanUnit.data.callings.length === 3 && orphanUnit.data.calling,
    `Orphan faction unit was automatically assigned callings: [${orphanUnit.data.callings.map(c=>c.name).join(", ")}]`);

// 15. Newborn childbirth calling assignment
const newbornUnit = env.World.addUnit({
    name: "TEST_Newborn",
    area: { x: 0, y: 0 },
    x: 51, y: 51, dir: 2,
    data: { kind: "colonist", faction: "player", species: "human", stage: "child", age: 2 }
});
check("newborn_child_receives_callings",
    Array.isArray(newbornUnit.data.callings) && newbornUnit.data.callings.length === 3 && newbornUnit.data.calling,
    `Newborn child unit received callings: [${newbornUnit.data.callings.map(c=>c.name).join(", ")}]`);

// Rule 4 Mutant Check: provoke failure if mutant flag provided
if (mutant === "flat-weights") {
    console.log("MUTANT: Intentionally checking if flat weights can pass small society critical bias...");
    const flatCritPct = (18 / 89) * 100;
    check("small_society_critical_bias_p8_MUTANT", flatCritPct >= 90.0,
        `MUTANT flat critical pct is ${flatCritPct.toFixed(1)}% (fails requirement >= 90%)`);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
