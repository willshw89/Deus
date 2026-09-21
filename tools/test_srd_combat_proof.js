//=============================================================================
// test_srd_combat_proof.js - Authoritative SRD 5.1 Combat Proof Suite
//=============================================================================
"use strict";

const fs = require("fs");
const path = require("path");

const isMutant = process.argv.includes("--mutant");
console.log(`--- Running SRD 5.1 Combat Proof Suite (Mutant: ${isMutant}) ---`);

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`PASS: ${message}`);
        totalPassed++;
    } else {
        console.error(`FAIL: ${message}`);
        totalFailed++;
    }
}

// -----------------------------------------------------------------------------
// Environment Mock Setup
// -----------------------------------------------------------------------------
global.window = global;
global.Graphics = { frameCount: 100 };
global.ImageManager = { loadCharacter: () => ({ isReady: () => true }), loadTileset: () => ({ isReady: () => true }) };
global.Sprite = function() { this.anchor = { set: () => {} }; this.visible = true; this.bitmap = null; };
global.Bitmap = function() { return { isReady: () => true, blt: () => {} }; };
global.Point = function(x, y) { this.x = x || 0; this.y = y || 0; };
global.DataManager = { isBattleTest: () => false, isEventTest: () => false, onLoad: () => {}, extractSaveContents: () => {} };
global.Scene_Boot = { prototype: { start: () => {} } };
global.Scene_Map = function() {};
global.Scene_Map.prototype = { createDisplayObjects: () => {}, update: () => {} };
global.Game_Player = function() {};
global.Game_Player.prototype = { performTransfer: () => {}, moveStraight: () => {} };
global.Game_Map = function() {};
global.Game_Map.prototype = { update: () => {} };
global.Game_Event = function(mapId, eventId) { this._eventId = eventId; this.x = 0; this.y = 0; };
global.$gamePlayer = { x: 128, y: 128, isTransferring: () => false };
global.Input = { keyMapper: {} };
global.Spriteset_Map = function() {};
global.Spriteset_Map.prototype = { createCharacters: () => {} };
global.PluginManager = { parameters: () => ({}) };
global.$ufWorldCatalog = {
    combat: {
        tickFrames: 36,
        levelOffset: 8,
        styles: {
            accurate: { accuracy: 3 },
            aggressive: { strength: 3 },
            defensive: { defence: 3 },
            controlled: { accuracy: 1, strength: 1, defence: 1 },
            rapid: { speed: -1 },
            longrange: { defence: 3, range: 2 }
        },
        magicDefence: { magic: 0.7, defence: 0.3 },
        creatureStyle: "controlled",
        unarmed: { speed: 4, types: ["crush"], styles: ["accurate", "aggressive", "defensive"], reach: 1 },
        people: { attack: 1, strength: 1, defence: 1, ranged: 1, magic: 1, hitpoints: 10 },
        defaultModes: { hostile: "nearest", fleeing: "flee", other: "defend" },
        aggroRadius: 8,
        leash: 16,
        fleeRadius: 5,
        aidRadius: 10,
        regen: { hp: 1, everyTicks: 100 },
        display: { splatMs: 1000, maxSplats: 4, barHideMs: 6000, barWidth: 30 },
        aliases: { tool: "weapon", clothes: "torso" },
        quality: { bonus: [0.8, 0.9, 1, 1.1, 1.2, 1.3] }
    },
    items: {
        types: {
            sword_long: { id: "sword_long", name: "Long sword", weapon: { speed: 5, types: ["slash"], styles: ["accurate", "aggressive"], bonuses: { attack: { slash: 10 }, strength: 10 } } },
            bow_short: { id: "bow_short", name: "Short bow", weapon: { speed: 4, types: ["ranged"], styles: ["accurate", "rapid"], bonuses: { attack: { ranged: 10 } }, ranged: { range: 6, ammo: "arrows" } } },
            dagger_iron: { id: "dagger_iron", name: "Iron dagger", weapon: { speed: 4, types: ["stab", "slash"], styles: ["accurate", "aggressive"], bonuses: { attack: { stab: 8 }, strength: 4 } } },
            mail_iron: { id: "mail_iron", name: "Chain mail", armor: { bonuses: { defence: { stab: 15, slash: 15, crush: 10, ranged: 12, magic: 0 } } } },
            plate_iron: { id: "plate_iron", name: "Plate armor", armor: { bonuses: { defence: { stab: 20, slash: 20, crush: 15, ranged: 18, magic: 0 } } } },
            shield_iron: { id: "shield_iron", name: "Iron shield", shield: { bonuses: { defence: { stab: 5, slash: 5, crush: 5, ranged: 5, magic: 0 } } } }
        }
    },
    wildlife: { species: [] }
};

// Spatial Mock
global.UF = global.UF || {};
global.UF.Space = {
    sameArea: (a, b) => !!a && !!b && !!a.area && !!b.area && a.area.x === b.area.x && a.area.y === b.area.y,
    sameZ: (a, b) => {
        const za = (a && a.z !== undefined) ? a.z : (a && a.area && a.area.z !== undefined ? a.area.z : 0);
        const zb = (b && b.z !== undefined) ? b.z : (b && b.area && b.area.z !== undefined ? b.area.z : 0);
        return za === zb;
    },
    zOf: o => (o && o.z !== undefined ? o.z : (o && o.area && o.area.z !== undefined ? o.area.z : 0)),
    chebyshev: (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)),
    manhattan: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
};

// Events Mock
const eventListeners = new Map();
global.UF.Events = {
    on: (evt, fn) => {
        if (!eventListeners.has(evt)) eventListeners.set(evt, []);
        eventListeners.get(evt).push(fn);
    },
    emit: (evt, ...args) => {
        if (eventListeners.has(evt)) {
            for (const fn of eventListeners.get(evt)) fn(...args);
        }
    }
};

// Items Mock
global.UF.Items = {
    inventoryOf: () => [],
    count: () => 0,
    consume: () => true
};

// World Mock
const unitsMap = new Map();
global.UF.World = {
    state: { seed: 12345 },
    unit: id => unitsMap.get(id) || null,
    units: () => Array.from(unitsMap.values()),
    addUnit: u => { unitsMap.set(u.id, u); return u; },
    removeUnit: id => unitsMap.delete(id),
    isDisplayed: () => true,
    eventOf: () => null,
    hash32: () => 42,
    mulberry32: () => () => 0.5
};

// Load Plugins in dependency sequence
const pluginsDir = path.join(__dirname, "..", "game", "js", "plugins");
eval(fs.readFileSync(path.join(pluginsDir, "UF_Conditions.js"), "utf8"));
eval(fs.readFileSync(path.join(pluginsDir, "UF_Rules.js"), "utf8"));
eval(fs.readFileSync(path.join(pluginsDir, "UF_Combat.js"), "utf8"));

// -----------------------------------------------------------------------------
// Proof 1: Weapon Key Mapping & Armor Class Integration
// -----------------------------------------------------------------------------
console.log("\n[Proof 1] Weapon Key Mapping & Armor Class Integration");

assert(UF.Combat.resolveWeaponKey({ name: "Long sword", itemType: "sword_long" }) === "longsword", "Long sword maps to SRD longsword");
assert(UF.Combat.resolveWeaponKey({ name: "Short bow", itemType: "bow_short" }) === "shortbow", "Short bow maps to SRD shortbow");
assert(UF.Combat.resolveWeaponKey({ name: "Iron dagger", itemType: "dagger_iron" }) === "dagger", "Iron dagger maps to SRD dagger");
assert(UF.Combat.resolveWeaponKey({ natural: true, types: ["stab"] }) === "bite", "Natural stab attack maps to bite");
assert(UF.Combat.resolveWeaponKey({ natural: true, types: ["slash"] }) === "claws", "Natural slash attack maps to claws");
assert(UF.Combat.resolveWeaponKey(null) === "unarmed", "Null weapon profile maps to unarmed");

const unarmoredUnit = { id: 1, area: { x: 0, y: 0, z: 0 }, data: { stats: { dex: 16 } } };
const chainMailUnit = { id: 2, area: { x: 0, y: 0, z: 0 }, data: { stats: { dex: 10 }, equipment: { torso: "mail_iron" } } };
const plateShieldUnit = { id: 3, area: { x: 0, y: 0, z: 0 }, data: { stats: { dex: 10 }, equipment: { torso: "plate_iron", shield: "shield_iron" } } };

assert(UF.Combat.calcAC(unarmoredUnit) === 13, "Unarmored unit AC is 10 + 3(Dex) = 13");
assert(UF.Combat.calcAC(chainMailUnit) === 16, "Chain mail unit AC is 16");
assert(UF.Combat.calcAC(plateShieldUnit) === 20, "Plate armor + Shield AC is 18 + 2 = 20");

// -----------------------------------------------------------------------------
// Proof 2: SRD 5.1 D20 Attack Roll Resolution vs AC
// -----------------------------------------------------------------------------
console.log("\n[Proof 2] SRD 5.1 D20 Attack Roll Resolution vs AC");

const attacker = {
    id: 10,
    name: "Arthur",
    x: 10, y: 10, z: 0,
    area: { x: 0, y: 0, z: 0 },
    data: {
        hp: 30,
        maxHp: 30,
        stats: { str: 16, dex: 12 }, // STR mod +3
        equipment: { weapon: "sword_long" },
        combat: { mode: "manual", style: "accurate" }
    }
};

const defender = {
    id: 11,
    name: "Mordred",
    x: 10, y: 11, z: 0,
    area: { x: 0, y: 0, z: 0 },
    data: {
        hp: 30,
        maxHp: 30,
        stats: { dex: 10 },
        equipment: { torso: "mail_iron" }, // AC 16
        combat: { mode: "manual" }
    }
};
UF.World.addUnit(attacker);
UF.World.addUnit(defender);

// Attack mod: +3 (STR mod) + 2 (Prof bonus) = +5.
// Defender AC: 16.
// Roll 10: 10 + 5 = 15 < 16 -> MISS
const missRes = UF.Combat.resolveAttack(attacker, defender, { rng: () => 0.4999 }); // floor(0.4999*20)+1 = 10
assert(missRes.hit === false, "Attack roll 10 + 5 = 15 vs AC 16 misses");
assert(missRes.damage === 0, "Damage on miss is 0");
assert(defender.data.hp === 30, "Defender HP unchanged after miss");

// Roll 11: 11 + 5 = 16 >= 16 -> HIT
const hitRes = UF.Combat.resolveAttack(attacker, defender, { rng: () => 0.54 }); // floor(0.54*20)+1 = 11
assert(hitRes.hit === true, "Attack roll 11 + 5 = 16 vs AC 16 hits");
assert(hitRes.damage > 0, `Damage dealt on hit: ${hitRes.damage}`);
assert(defender.data.hp < 30, `Defender HP reduced to ${defender.data.hp}`);

// -----------------------------------------------------------------------------
// Proof 3: Critical Hits & Fumbles (Rule 4 Mutant Test)
// -----------------------------------------------------------------------------
console.log("\n[Proof 3] Critical Hits & Fumbles");

// Natural 20 Crit: rng returns 0.999999 -> roll 20
defender.data.hp = 30;
const critRes = UF.Combat.resolveAttack(attacker, defender, { rng: () => 0.999999 });
assert(critRes.hit === true, "Natural 20 automatically hits");

if (!isMutant) {
    assert(critRes.critical === true, "Natural 20 flagged as critical hit");
    // Longsword normally 1d8+3 (range 4..11); on crit 2d8+3 (range 5..19)
    assert(critRes.rolled >= 5, `Critical hit rolled damage >= 5 (got ${critRes.rolled})`);
} else {
    // Mutant: fails to recognize crit
    assert(critRes.critical === false, "Mutant erroneously denied critical hit");
}

// Natural 1 Fumble: rng returns 0 -> roll 1
defender.data.hp = 30;
const fumbleRes = UF.Combat.resolveAttack(attacker, defender, { rng: () => 0 });
assert(fumbleRes.hit === false, "Natural 1 is an automatic miss (fumble)");
assert(fumbleRes.fumble === true, "Natural 1 flagged as fumble");
assert(fumbleRes.damage === 0, "Fumble deals 0 damage");

// -----------------------------------------------------------------------------
// Proof 4: Same-Z Invariant Enforcement
// -----------------------------------------------------------------------------
console.log("\n[Proof 4] Same-Z Invariant Enforcement");

const highDefender = {
    id: 12,
    name: "Climber",
    x: 10, y: 11, z: 1, // Z = 1 (different level!)
    area: { x: 0, y: 0, z: 1 },
    data: { hp: 20, maxHp: 20, stats: { dex: 10 }, combat: { mode: "manual" } }
};
UF.World.addUnit(highDefender);

const crossZRes = UF.Combat.resolveAttack(attacker, highDefender, { rng: () => 0.999999 });
assert(crossZRes.hit === false, "Cross-Z attack is strictly rejected");
assert(crossZRes.sameZViolation === true, "Cross-Z attack flagged with sameZViolation");
assert(highDefender.data.hp === 20, "Defender on different Z suffers 0 damage");

// -----------------------------------------------------------------------------
// Proof 5: Conditions Integration (Prone & Paralyzed)
// -----------------------------------------------------------------------------
console.log("\n[Proof 5] Conditions Integration (Prone & Paralyzed)");

// 1. Prone defender within 5 ft gives Advantage
defender.data.hp = 30;
UF.Conditions.apply(defender, "prone", 10, "action");
assert(UF.Conditions.has(defender, "prone"), "Defender has prone condition");

// Attack against prone within 5 ft should have advantage
const proneAttRes = UF.Combat.resolveAttack(attacker, defender, { rng: () => 0.54 });
assert(proneAttRes.advantage === true, "Melee attack against prone defender has Advantage");

// 2. Paralyzed defender within 5 ft triggers automatic critical hit on hit
UF.Conditions.remove(defender, "prone");
UF.Conditions.apply(defender, "paralyzed", 10, "action");
assert(UF.Conditions.has(defender, "paralyzed"), "Defender has paralyzed condition");

// Attack with regular roll 12 (12+5=17 vs AC 16 -> hit): should be promoted to critical!
const paralyzedAttRes = UF.Combat.resolveAttack(attacker, defender, { rng: () => 0.58 });
assert(paralyzedAttRes.hit === true, "Attack hits paralyzed defender");
assert(paralyzedAttRes.critical === true, "Attack within 5 ft against paralyzed defender automatically crits");

// -----------------------------------------------------------------------------
// Proof 6: Event Emission & Hitsplat Values
// -----------------------------------------------------------------------------
console.log("\n[Proof 6] Event Emission & Hitsplat Values");

let lastHitEvent = null;
UF.Events.on("combat:hit", evt => { lastHitEvent = evt; });

UF.Conditions.remove(defender, "paralyzed");
defender.data.hp = 30;
const hitEventRes = UF.Combat.resolveAttack(attacker, defender, { rng: () => 0.54 });

assert(lastHitEvent !== null, "combat:hit event was emitted");
assert(lastHitEvent.attacker === attacker, "Event specifies correct attacker");
assert(lastHitEvent.target === defender, "Event specifies correct target");
assert(lastHitEvent.damage === hitEventRes.damage, "Event damage matches resolution damage");
assert(lastHitEvent.hit === true, "Event hit flag is true");
assert(typeof lastHitEvent.roll === "number", "Event contains d20 roll");

// -----------------------------------------------------------------------------
// Proof 7: Unit Death & Drops
// -----------------------------------------------------------------------------
console.log("\n[Proof 7] Unit Death at 0 HP");

let killEmitted = false;
UF.Events.on("combat:kill", evt => {
    if (evt.target === defender) killEmitted = true;
});

// Set defender HP to 1 so any hit kills
defender.data.hp = 1;
const lethalRes = UF.Combat.resolveAttack(attacker, defender, { rng: () => 0.54 });

assert(lethalRes.hit === true, "Lethal attack hits");
assert(lethalRes.killed === true, "Lethal attack reports target killed");
assert(defender.data.hp === 0, "Target HP reduced to exactly 0");
assert(defender.data.dead === true, "Target marked dead");
assert(killEmitted === true, "combat:kill event was emitted");

// -----------------------------------------------------------------------------
// Proof 8: Legacy Fallback Compatibility
// -----------------------------------------------------------------------------
console.log("\n[Proof 8] Legacy Fallback Compatibility");

// When legacy: true is explicitly requested, it uses the OSRS legacy formula
const legacyAttacker = {
    id: 20,
    area: { x: 0, y: 0, z: 0 },
    x: 0, y: 0, z: 0,
    data: {
        hp: 20, maxHp: 20,
        combatLevels: { attack: 60, strength: 60, defence: 60, hitpoints: 20 },
        equipment: { weapon: "sword_long" },
        combat: { mode: "manual", style: "aggressive" }
    }
};
const legacyDefender = {
    id: 21,
    area: { x: 0, y: 0, z: 0 },
    x: 0, y: 1, z: 0,
    data: {
        hp: 20, maxHp: 20,
        combatLevels: { attack: 1, strength: 1, defence: 1, hitpoints: 20 },
        equipment: {},
        combat: { mode: "manual" }
    }
};
UF.World.addUnit(legacyAttacker);
UF.World.addUnit(legacyDefender);

const legacyRes = UF.Combat.resolveAttack(legacyAttacker, legacyDefender, { legacy: true, rng: () => 0.999999 });
assert(legacyRes !== null, "Legacy attack resolved successfully");
assert(legacyRes.hit === true, "Legacy attack hit with high rng");
assert(typeof legacyRes.maxHit === "number" && legacyRes.maxHit > 0, `Legacy maxHit calculated (${legacyRes.maxHit})`);

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log(`\nResults: ${totalPassed} passed, ${totalFailed} failed`);
if (totalFailed > 0) {
    console.error(`SRD Combat Proof Suite FAILED with ${totalFailed} failure(s).`);
    process.exit(1);
} else {
    console.log("SRD Combat Proof Suite PASSED (100%).");
    process.exit(0);
}
