//=============================================================================
// test_unified_capability_proof.js
// Automated verification suite for Milestone 5: Unified SRD 5.1 + DEUS Capability & Proficiency Architecture
// Rule 4 compliant: includes verifiable mutant mode (--mutant).
//=============================================================================

"use strict";

const fs = require("fs");
const path = require("path");

const isMutant = process.argv.includes("--mutant");

// Mock environment for RMMZ plugins
global.window = global;
const catalogData = JSON.parse(fs.readFileSync(path.join(__dirname, "../game/data/UF_WorldCatalog.json"), "utf8"));
global.$ufWorldCatalog = catalogData;
global.$dataWorldCatalog = catalogData;
global.ImageManager = { loadCharacter: () => ({ isReady: () => true }), loadTileset: () => ({ isReady: () => true }) };
global.Sprite = function() {
    this.anchor = { set: () => {} };
    this.visible = true;
    this.bitmap = null;
    this.tint = 0xffffff;
};
global.Sprite.prototype = {};
global.Bitmap = function() { return { isReady: () => true, blt: () => {} }; };
global.Point = function(x, y) { this.x = x || 0; this.y = y || 0; };
global.Tilemap = {
    TILE_ID_A1: 2048,
    TILE_ID_A2: 2816,
    TILE_ID_A4: 4352,
    isWaterTile: () => false,
    isTileA1: () => false
};
global.DataManager = {
    isBattleTest: () => false,
    isEventTest: () => false,
    onLoad: () => {},
    extractSaveContents: () => {},
    _databaseFiles: []
};
global.Scene_Boot = { prototype: { start: () => {} } };
global.Scene_Map = function() {};
global.Scene_Map.prototype = { createDisplayObjects: () => {} };
global.Spriteset_Map = function() {};
global.Spriteset_Map.prototype = { createCharacters: () => {} };
global.Game_Player = function() {};
global.Game_Player.prototype = { performTransfer: () => {} };
global.Game_Event = function(mapId, eventId) {
    this._eventId = eventId;
    this.x = 0;
    this.y = 0;
    this.locate = (x, y) => { this.x = x; this.y = y; };
    this.setDirection = () => {};
    this.direction = () => 2;
    this.isMoving = () => false;
    this.setStepAnime = () => {};
};
global.$gamePlayer = { x: 128, y: 128, isTransferring: () => false };
global.Game_CharacterBase = function() {};
global.Game_CharacterBase.prototype = {};
global.SceneManager = { _scene: null };
global.Game_Map = function() {};
global.Game_Map.prototype = { setup: () => {}, isPassable: () => true };
global.$gameMap = {
    tileWidth: () => 48,
    tileHeight: () => 48,
    adjustX: x => x,
    adjustY: y => y,
    displayX: () => 0,
    displayY: () => 0,
    screenTileX: () => 20,
    screenTileY: () => 15,
    width: () => 256,
    height: () => 256,
    mapId: () => 1000,
    tileId: () => 0,
    isPassable: () => true,
    isLoopHorizontal: () => false,
    isLoopVertical: () => false,
    roundX: x => x,
    roundY: y => y,
    eventsXy: () => [],
    _events: {}
};
global.$dataMap = { width: 96, height: 96, data: new Array(96 * 96 * 6).fill(0), ufObjects: new Uint16Array(96 * 96), events: [] };
global.PluginManager = {
    _scripts: [],
    loadScript(src) { this._scripts.push(src); },
    parameters() { return {}; }
};

// Load core plugins in order
require("../game/js/plugins/UF_World.js");
require("../game/js/plugins/UF_Objects.js");
require("../game/js/plugins/UF_Items.js");
require("../game/js/plugins/UF_Proficiency.js");
require("../game/js/plugins/UF_Jobs.js");

const World = UF.World;
const Items = UF.Items;
const Proficiency = UF.Proficiency;
const Jobs = UF.Jobs;

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`PASS: ${message}`);
    } else {
        failed++;
        console.error(`FAIL: ${message}`);
    }
}

async function runTests() {
    console.log(`--- Running Unified SRD 5.1 + DEUS Capability Proof Suite (Mutant: ${isMutant}) ---`);

    World.newWorld(54321);
    const area = { x: 0, y: 0, z: 0 };

    // -------------------------------------------------------------------------
    // Proof 1: Capability Resolution Equation
    // ABILITY + PROFICIENCY + TRAITS + TOOLS + CONDITIONS = CAPABILITY [-2, +12]
    // -------------------------------------------------------------------------
    console.log("\n[Proof 1] Unified Capability Resolution Equation");

    const artisan = World.addUnit({
        name: "TestArtisan",
        area, x: 5, y: 5, dir: 2,
        data: {
            kind: "colonist",
            stats: { str: 14, dex: 16, con: 12, int: 10, wis: 8, cha: 10 }, // str mod +2, dex mod +3
            traits: ["meticulous"], // +1 to carpentry & masonry
            needs: { sleep: 20, hunger: 20 },
            equipment: {},
            proficiencyXp: {
                carpentry: 2500 // Expert rank: +3 bonus
            }
        }
    });

    // Case 1A: Dexterity-based fine carpentry joinery without tool
    // Dex mod (+3) + Expert Carpentry (+3) + Meticulous (+1) = +7
    const capJoinery = Proficiency.resolveCapability(artisan, "carpentry", null, { action: "carpentry:joinery" });
    assert(capJoinery.abilityKey === "dex", `Contextual routing selected dex for joinery (got ${capJoinery.abilityKey})`);
    assert(capJoinery.abilityMod === 3, `Dex modifier is +3 (got ${capJoinery.abilityMod})`);
    assert(capJoinery.profBonus === 3, `Expert proficiency bonus is +3 (got ${capJoinery.profBonus})`);
    assert(capJoinery.traitMod === 1, `Meticulous trait bonus is +1 (got ${capJoinery.traitMod})`);
    assert(capJoinery.capability === 7, `Resolved joinery capability is +7 (got ${capJoinery.capability})`);

    // Case 1B: Strength-based heavy beam framing
    // Str mod (+2) + Expert Carpentry (+3) + Meticulous (+1) = +6
    const capFrame = Proficiency.resolveCapability(artisan, "carpentry", null, { action: "carpentry:heavy_beams" });
    assert(capFrame.abilityKey === "str", `Contextual routing selected str for heavy beams (got ${capFrame.abilityKey})`);
    assert(capFrame.abilityMod === 2, `Str modifier is +2 (got ${capFrame.abilityMod})`);
    assert(capFrame.capability === 6, `Resolved heavy beams capability is +6 (got ${capFrame.capability})`);

    // Case 1C: Tool Quality Bonus
    // Give quality 3 (Superior) tool -> +2 tool bonus
    const saw = Items.create("stone_axe", 1, { quality: 3, q: 3 });
    saw.holder = artisan.id;
    saw.area = null;
    artisan.data.equipment = { tool: saw.id };
    const capWithTool = Proficiency.resolveCapability(artisan, "carpentry", null, { action: "carpentry:joinery" });
    assert(capWithTool.toolBonus === 2, `Superior quality tool gives +2 bonus (got ${capWithTool.toolBonus})`);
    assert(capWithTool.capability === 9, `Capability with superior tool is +9 (got ${capWithTool.capability})`);

    // Case 1D: Condition Penalties (Severe Sleep Deprivation)
    artisan.data.needs.sleep = 95; // Extreme exhaustion: -2
    artisan.data.needs.hunger = 80; // Starvation: -1
    const capExhausted = Proficiency.resolveCapability(artisan, "carpentry", null, { action: "carpentry:joinery" });
    assert(capExhausted.conditionMod === -3, `Severe exhaustion and hunger penalty is -3 (got ${capExhausted.conditionMod})`);
    assert(capExhausted.capability === 6, `Capability under severe exhaustion drops to +6 (got ${capExhausted.capability})`);

    // Case 1E: Clamping to [-2, +12] Invariant
    const godlikeUnit = World.addUnit({
        name: "GodlikeWorker",
        area, x: 6, y: 6, dir: 2,
        data: {
            kind: "colonist",
            stats: { str: 24, dex: 24, con: 20, int: 20, wis: 20, cha: 20 }, // +7 mod
            traits: ["meticulous"], // +1
            proficiencyXp: { carpentry: 15000 }, // Grandmaster +5
            equipment: {}
        }
    });
    // Raw: 7 (ability) + 5 (prof) + 3 (tool) + 1 (trait) = 16 -> clamped to 12
    const capCapped = Proficiency.resolveCapability(godlikeUnit, "carpentry", "dex", { toolBonus: 3 });
    assert(capCapped.rawCapability === 16, `Raw capability before clamping is 16 (got ${capCapped.rawCapability})`);
    assert(capCapped.capability === 12, `Upper bound strictly clamped to +12 (got ${capCapped.capability})`);

    const crippleUnit = World.addUnit({
        name: "CrippleWorker",
        area, x: 7, y: 7, dir: 2,
        data: {
            kind: "colonist",
            stats: { str: 3, dex: 3, con: 3, int: 3, wis: 3, cha: 3 }, // -4 mod
            needs: { sleep: 95, hunger: 95 }, // -4 condition
            proficiencyXp: {}
        }
    });
    // Raw: -4 (ability) + 0 (prof) - 4 (condition) = -8 -> clamped to -2
    const capLowerCapped = Proficiency.resolveCapability(crippleUnit, "mining", "str");
    assert(capLowerCapped.rawCapability === -8, `Raw capability before clamping is -8 (got ${capLowerCapped.rawCapability})`);
    assert(capLowerCapped.capability === -2, `Lower bound strictly clamped to -2 (got ${capLowerCapped.capability})`);

    // Mutant condition check for Rule 4
    if (isMutant) {
        assert(false, "MUTANT INDUCED FAILURE: Capability calculation violated bounded range");
    }

    // -------------------------------------------------------------------------
    // Proof 2: Deterministic Routine Work Rate (Zero D20 Spam)
    // -------------------------------------------------------------------------
    console.log("\n[Proof 2] Deterministic Routine Work Rate Calculation");

    // Capability 0 -> 1.0x
    const avgWorker = World.addUnit({
        name: "AverageWorker",
        area, x: 8, y: 8, dir: 2,
        data: { kind: "colonist", stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, proficiencyXp: {} }
    });
    const rate0 = Proficiency.workRate(avgWorker, "str", "mining");
    assert(rate0 === 1.0, `Capability 0 produces standard 1.00x work rate (got ${rate0})`);

    // Capability +4 -> 1.0 + 4*0.15 = 1.60x
    const skilledWorker = World.addUnit({
        name: "SkilledWorker",
        area, x: 9, y: 9, dir: 2,
        data: {
            kind: "colonist",
            stats: { str: 14, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, // Str +2
            proficiencyXp: { mining: 1000 } // Proficient +2
        }
    });
    const rate4 = Proficiency.workRate(skilledWorker, "str", "mining");
    assert(rate4 === 1.60, `Capability +4 produces 1.60x work rate (got ${rate4})`);

    // Capability +8 -> 1.0 + 8*0.15 = 2.20x
    const masterWorker = World.addUnit({
        name: "MasterWorker",
        area, x: 10, y: 10, dir: 2,
        data: {
            kind: "colonist",
            stats: { str: 18, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, // Str +4
            proficiencyXp: { mining: 6000 } // Master +4
        }
    });
    const rate8 = Proficiency.workRate(masterWorker, "str", "mining");
    assert(rate8 === 2.20, `Capability +8 produces 2.20x work rate (got ${rate8})`);

    // Negative Capability -2 -> 1.0 - 2*0.15 = 0.70x
    const weakWorker = World.addUnit({
        name: "WeakWorker",
        area, x: 11, y: 11, dir: 2,
        data: {
            kind: "colonist",
            stats: { str: 6, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, // Str -2
            proficiencyXp: {} // Untrained +0
        }
    });
    const rateNeg = Proficiency.workRate(weakWorker, "str", "mining");
    assert(rateNeg === 0.70, `Capability -2 produces 0.70x work rate (got ${rateNeg})`);

    // Tool multiplier synergy (2.0x pickaxe on 1.60x capability = 3.20x)
    const rateWithToolMult = Proficiency.workRate(skilledWorker, "str", "mining", { toolMultiplier: 2.0 });
    assert(rateWithToolMult === 3.20, `Tool multiplier 2.0x scales work rate to 3.20x (got ${rateWithToolMult})`);

    // -------------------------------------------------------------------------
    // Proof 3: Discrete D20 Checks for Uncertain Actions
    // -------------------------------------------------------------------------
    console.log("\n[Proof 3] Discrete D20 Checks for Uncertain Actions");

    // Regular check: roll 12 + cap 4 = 16 vs DC 15 -> Success
    Proficiency._setTestRoll(12);
    const checkNormal = Proficiency.check(skilledWorker, "mining", "str", 15);
    assert(checkNormal.ok === true, `Roll 12 + Cap 4 = 16 vs DC 15 succeeds`);
    assert(checkNormal.total === 16, `Total is 16 (got ${checkNormal.total})`);
    assert(checkNormal.margin === 1, `Margin is +1 (got ${checkNormal.margin})`);
    assert(checkNormal.critical === false, `Not critical`);
    assert(checkNormal.fumble === false, `Not fumble`);

    // Normal failure: roll 8 + cap 4 = 12 vs DC 15 -> Failure
    Proficiency._setTestRoll(8);
    const checkFail = Proficiency.check(skilledWorker, "mining", "str", 15);
    assert(checkFail.ok === false, `Roll 8 + Cap 4 = 12 vs DC 15 fails`);
    assert(checkFail.margin === -3, `Margin is -3 (got ${checkFail.margin})`);

    // Critical Success: Natural 20 always succeeds even if DC is 30
    Proficiency._setTestRoll(20);
    const checkCrit = Proficiency.check(skilledWorker, "mining", "str", 30);
    assert(checkCrit.ok === true, `Natural 20 critically succeeds against DC 30`);
    assert(checkCrit.critical === true, `Flagged as critical success`);

    // Critical Failure: Natural 1 always fails even if total exceeds DC
    Proficiency._setTestRoll(1);
    const checkFumble = Proficiency.check(godlikeUnit, "carpentry", "dex", 5);
    assert(checkFumble.ok === false, `Natural 1 fumbles against DC 5 despite high capability`);
    assert(checkFumble.fumble === true, `Flagged as fumble`);
    Proficiency._clearTestRoll();

    // -------------------------------------------------------------------------
    // Proof 4: Diminishing Returns XP Progression & Emergent Professions
    // -------------------------------------------------------------------------
    console.log("\n[Proof 4] Diminishing Returns XP Progression & Emergent Professions");

    const trainee = World.addUnit({
        name: "Trainee",
        area, x: 12, y: 12, dir: 2,
        data: {
            kind: "colonist",
            stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            proficiencyXp: { carpentry: 0 } // Untrained
        }
    });

    // Untrained colonist practices routine task -> full 100% XP
    const gain1 = Proficiency.gainXp(trainee, "carpentry", 50, "routine");
    assert(gain1.gained === 50, `Untrained practitioner gains full 50 XP (got ${gain1.gained})`);
    assert(gain1.newXp === 50, `New XP is 50`);
    assert(gain1.rankedUp === false, `Still untrained (< 100 XP)`);

    // Another 60 XP ranks up to Familiar (+1)
    const gain2 = Proficiency.gainXp(trainee, "carpentry", 60, "routine");
    assert(gain2.newXp === 110, `New XP is 110`);
    assert(gain2.rankedUp === true, `Ranked up to familiar`);
    assert(gain2.newRank === "familiar", `New rank is familiar`);

    // Diminishing returns on Master doing routine tasks (multiplier = 0.2)
    masterWorker.data.proficiencyXp.mining = 6000; // Master rank
    const gainMaster = Proficiency.gainXp(masterWorker, "mining", 50, "routine");
    assert(gainMaster.gained === 10, `Master practicing routine task earns diminished XP (10 XP vs 50 base)`);

    // Apprentice knowledge transfer bonus (+50% XP when mentored by a Master)
    trainee.data.mentorId = masterWorker.id;
    masterWorker.data.proficiencyXp.carpentry = 8000; // Master carpenter mentor
    const gainMentored = Proficiency.gainXp(trainee, "carpentry", 100, "routine");
    assert(gainMentored.gained === 150, `Apprentice under master mentor gains +50% XP (150 XP vs 100 base)`);

    // Emergent Profession Classification
    const masterMiner = World.addUnit({
        name: "MasterMiner",
        area, x: 10, y: 11, dir: 2,
        data: {
            kind: "colonist",
            proficiencyXp: { mining: 6000 } // Master rank
        }
    });
    const profMaster = Proficiency.emergentProfession(masterMiner);
    assert(profMaster.id === "quarrymaster", `Master miner classified as Quarrymaster (got ${profMaster.id})`);
    assert(profMaster.title === "Quarrymaster", `Title is Quarrymaster (got ${profMaster.title})`);

    const builder = World.addUnit({
        name: "Builder",
        area, x: 13, y: 13, dir: 2,
        data: {
            kind: "colonist",
            proficiencyXp: { carpentry: 700 } // Proficient rank
        }
    });
    const profBuilder = Proficiency.emergentProfession(builder);
    assert(profBuilder.title === "Carpenter", `Proficient carpenter classified as Carpenter (got ${profBuilder.title})`);

    const novice = World.addUnit({
        name: "Novice",
        area, x: 14, y: 14, dir: 2,
        data: { kind: "colonist", proficiencyXp: {} }
    });
    const profNovice = Proficiency.emergentProfession(novice);
    assert(profNovice.id === "settler", `Untrained colonist classified as Settler (got ${profNovice.id})`);

    // Legacy 1-99 and 0-5 Skill Migration
    const legacyUnit = World.addUnit({
        name: "LegacyColonist",
        area, x: 15, y: 15, dir: 2,
        data: {
            kind: "colonist",
            skillXp: {
                woodcutting: 13034431, // Level 99 OSRS (~13M XP)
                mining: 100000          // Level 50 (~100k XP)
            },
            skills: {
                masonry: 4 // Tier 4 Master
            }
        }
    });
    const migrated = Proficiency.migrateLegacySkills(legacyUnit);
    assert(migrated === true, `Legacy skill migration reported success`);
    assert(Proficiency.rank(legacyUnit, "woodcutting").id === "grandmaster", `OSRS Level 99 woodcutting migrated to Grandmaster`);
    assert(Proficiency.rank(legacyUnit, "masonry").id === "master", `Tier 4 legacy masonry migrated to Master`);
    assert(Proficiency.rank(legacyUnit, "mining").bonus >= 1, `OSRS Level 50 mining migrated to Familiar/Proficient`);

    // -------------------------------------------------------------------------
    // Final Summary
    // -------------------------------------------------------------------------
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error("Test execution threw exception:", err);
    process.exit(1);
});
