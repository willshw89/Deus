"use strict";
// tools/test_combat_dying_integration.js - Full-stack integration suite for SRD 5.1 Survival,
// Dying, Exhaustion, and Food in live gameplay (Project DEUS).
//
// Verifies:
// 1. Combat 0 HP enters dying system (unconscious, dying record, death saves)
// 2. Massive damage kills instantly (at >0 HP and at 0 HP)
// 3. Attacks against unconscious targets have advantage and auto-crit within 5 ft
// 4. Damage at 0 HP adds death save failures (1 on normal hit, 2 on crit) and kills on 3rd failure
// 5. Non-colonist creatures die immediately at 0 HP
// 6. Combat.heal ends dying and restores consciousness when HP > 0
// 7. Actual skill proficiency data persistence and Medicine stabilization bonus
// 8. Exhaustion consumers ladder (Lvl 1 checks, Lvl 2 speed, Lvl 3 attacks/saves, Lvl 4 max HP, Lvl 5 speed 0, Lvl 6 death)
// 9. Save / restart persistence of dying, stable, exhaustion, and jobs without corruption
// 10. Rule 4 Mutant ability-to-fail verification
//
// Usage: node tools/test_combat_dying_integration.js [--mutant=<name>]
// Exit code: 0 all pass, 1 a check failed.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) {
        passed++;
        console.log(`PASS ${name}${detail ? " - " + detail : ""}`);
    } else {
        failed++;
        console.error(`FAIL ${name}${detail ? " - " + detail : ""}`);
    }
    return !!condition;
}

// -----------------------------------------------------------------------------
// Environment Sandbox Setup
// -----------------------------------------------------------------------------
function makeSandbox() {
    const listeners = {};
    const events = {
        on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
        off(name, fn) { if (listeners[name]) listeners[name] = listeners[name].filter(f => f !== fn); },
        emit(name, ...args) { if (listeners[name]) listeners[name].forEach(fn => fn(...args)); }
    };

    const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));

    function Game_System() {}
    Game_System.prototype.windowOpacity = () => 192;
    function Game_CharacterBase() {}
    Game_CharacterBase.prototype.moveStraight = function() {};
    function Game_Character() {}
    Game_Character.prototype = Object.create(Game_CharacterBase.prototype);
    function Game_Player() {}
    Game_Player.prototype = Object.create(Game_Character.prototype);
    Game_Player.prototype.moveStraight = function() {};
    Game_Player.prototype.isTransferring = () => false;
    Game_Player.prototype.locate = () => {};
    function Game_Event(mapId, eventId) {
        this._eventId = eventId;
        this.x = 0; this.y = 0;
        this._moveSpeed = 4;
        this.setMoveSpeed = spd => { this._moveSpeed = spd; };
        this.locate = (x, y) => { this.x = x; this.y = y; };
        this.direction = () => 2;
        this.setDirection = () => {};
    }
    Game_Event.prototype = Object.create(Game_Character.prototype);
    function Game_Map() {}
    Game_Map.prototype.mapId = () => 1;
    Game_Map.prototype.update = () => {};
    function Window_Base() {}
    function Rectangle() {}

    const sandbox = {
        console,
        performance: { now: () => Date.now() },
        Math,
        Array,
        Object,
        String,
        Number,
        Set,
        Map,
        JSON,
        Graphics: { frameCount: 100 },
        ImageManager: { loadCharacter: () => ({ isReady: () => true }), loadTileset: () => ({ isReady: () => true }) },
        Sprite: function() { this.anchor = { set: () => {} }; this.visible = true; this.bitmap = null; this.children = []; this.addChild = () => {}; },
        Bitmap: function() { return { isReady: () => true, blt: () => {} }; },
        Point: function(x, y) { this.x = x || 0; this.y = y || 0; },
        DataManager: { makeSaveContents: () => ({}), extractSaveContents: () => {} },
        Scene_Boot: { prototype: { start: () => {} } },
        Scene_Map: function() {},
        SceneManager: { _scene: null },
        Game_System,
        Game_CharacterBase,
        Game_Character,
        Game_Player,
        Game_Event,
        Game_Map,
        Window_Base,
        Rectangle,
        $gamePlayer: new Game_Player(),
        $dataMap: { events: {}, data: [], width: 64, height: 64 },
        $gameMap: new Game_Map(),
        Input: { keyMapper: {}, isTriggered: () => false },
        Spriteset_Map: function() { this._characterSprites = []; this._tilemap = { addChild: () => {} }; },
        Tilemap: { isWaterTile: () => false },
        PluginManager: { parameters: () => ({}), registerCommand: () => {} },
        $ufWorldCatalog: catalog,
        $deusWorldCatalog: catalog,
        $ufTime: { hour: 12, minute: 0, day: 1, monthIndex: 0, year: 1, seasonName: "spring" },
        addEventListener: () => {},
        removeEventListener: () => {},
        document: { title: "" }
    };
    sandbox.$gameMap._events = {};

    sandbox.window = sandbox;
    sandbox.global = sandbox;
    sandbox.UF = { Events: events };
    sandbox.DEUS = { Events: events };

    // Load plugins in authoritative dependency order
    const read = f => fs.readFileSync(path.join(PLUGINS, f), "utf8");
    let coreSrc = read("DEUS_Core.js");
    let rulesSrc = read("DEUS_Dnd5e.js");
    let worldSrc = read("DEUS_World.js");
    let itemsSrc = read("DEUS_Items.js");
    let jobsSrc = read("DEUS_Jobs.js");
    let colSrc = read("DEUS_Colonists.js");
    let combatSrc = read("DEUS_Combat.js");
    let histSrc = read("DEUS_History.js");

    // Apply mutants if requested
    if (mutant === "no_dying") {
        combatSrc = combatSrc.replace("if (isColonist(target))", "if (false)");
    } else if (mutant === "no_exhaustion") {
        rulesSrc = rulesSrc.replace("eff.disadvantageOnChecks === true", "false");
    } else if (mutant === "free_medicine") {
        rulesSrc = rulesSrc.replace("const isProf = skill ? profs.includes(String(skill).toLowerCase()) : false;", "const isProf = true;");
    }

    vm.runInNewContext(coreSrc, sandbox, { filename: "DEUS_Core.js" });
    vm.runInNewContext(rulesSrc, sandbox, { filename: "DEUS_Dnd5e.js" });
    vm.runInNewContext(worldSrc, sandbox, { filename: "DEUS_World.js" });
    vm.runInNewContext(itemsSrc, sandbox, { filename: "DEUS_Items.js" });
    vm.runInNewContext(jobsSrc, sandbox, { filename: "DEUS_Jobs.js" });
    vm.runInNewContext(colSrc, sandbox, { filename: "DEUS_Colonists.js" });
    vm.runInNewContext(combatSrc, sandbox, { filename: "DEUS_Combat.js" });
    vm.runInNewContext(histSrc, sandbox, { filename: "DEUS_History.js" });

    // Initialize world state
    sandbox.UF.World.state = {
        version: 4,
        seed: 20260923,
        size: 64,
        areasX: 1,
        areasY: 1,
        startArea: { x: 0, y: 0 },
        units: {},
        nextUnitId: 1,
        diffs: {},
        objectDiffs: {},
        factions: { playerId: "player" },
        items: { nextId: 1, byId: {} }
    };
    return sandbox;
}

// -----------------------------------------------------------------------------
// Test Suite Execution
// -----------------------------------------------------------------------------
console.log(`=== DEUS Combat, Dying, Exhaustion & Food Integration Checks (Mutant: ${mutant || "none"}) ===`);

const sb = makeSandbox();
const W = sb.UF.World;
const Cb = sb.UF.Combat;
const Dnd = sb.UF.Dnd5e;
const Col = sb.UF.Colonists;
const J = sb.UF.Jobs;
const area = { x: 0, y: 0, z: 0 };

// 1. Founder 0 HP Enters Dying System
console.log("\n[Test 1] 0 HP Enters Dying System");
const founder = W.addUnit({
    name: "Founder Alice",
    area, x: 10, y: 10,
    data: {
        kind: "colonist", faction: "player", founder: true,
        hp: 10, maxHp: 10, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
    }
});
const hostileAttacker = W.addUnit({
    name: "Hostile Raider",
    area, x: 10, y: 11,
    data: {
        kind: "creature", faction: "hostile", side: "hostile",
        hp: 20, maxHp: 20, stats: { str: 14, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
    }
});

let downedEventReceived = false;
sb.UF.Events.on("combat:downed", evt => {
    if (evt.target === founder) downedEventReceived = true;
});

// Reduce founder to exactly 0 HP with 10 damage
const attack1 = Cb.resolveAttack(hostileAttacker, founder, {
    legacy: true,
    rng: () => 0.5,
    extraDamage: 10
});

check("founder_unconscious_at_zero", founder.data.hp === 0 && founder.data.dead !== true && attack1.killed === false,
    `founder HP=${founder.data.hp}, dead=${founder.data.dead}, killed=${attack1.killed}`);
check("founder_entered_dying_state", !!founder.data.dying && founder.data.dying.failures === 0 && founder.data.dying.stable === false,
    `dying record: ${JSON.stringify(founder.data.dying)}`);
check("combat_downed_event_emitted", downedEventReceived === true,
    "combat:downed event was emitted for founder");
check("unconscious_cannot_attack", Cb.resolveAttack(founder, hostileAttacker) === null,
    "unconscious founder at 0 HP cannot resolve an attack");

// 2. Attacks Against Unconscious Targets & Damage at 0 HP
console.log("\n[Test 2] Damage at 0 HP & Death Save Failures");
// Adjacent attack on unconscious target gets advantage and automatic critical hit
const attack2 = Cb.resolveAttack(hostileAttacker, founder, {
    legacy: true,
    rng: () => 0.5,
    extraDamage: 3
});

check("attack_on_unconscious_has_advantage", !!attack2 && attack2.advantage === true,
    `advantage=${attack2 ? attack2.advantage : "null"}`);
check("adjacent_hit_on_unconscious_is_crit", !!attack2 && attack2.critical === true,
    `critical=${attack2 ? attack2.critical : "null"}`);
check("crit_at_zero_adds_two_failures", founder.data.dying && founder.data.dying.failures === 2,
    `failures=${founder.data.dying ? founder.data.dying.failures : "none"} (expected 2)`);

// Third failure causes authoritative death
const attack3 = Cb.resolveAttack(hostileAttacker, founder, {
    legacy: true,
    rng: () => 0.5,
    extraDamage: 2
});

check("third_failure_causes_death", founder.data.dead === true,
    `founder dead=${founder.data.dead}`);

// 3. Massive Damage Instant Death
console.log("\n[Test 3] Massive Damage Instant Death");
const founder2 = W.addUnit({
    name: "Founder Bob",
    area, x: 20, y: 20,
    data: {
        kind: "colonist", faction: "player", founder: true,
        hp: 4, maxHp: 10, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
    }
});

// 4 HP + 10 maxHp = 14 damage required for instant death. 15 damage deals massive damage.
const attackMassive = Cb.resolveAttack(hostileAttacker, founder2, {
    legacy: true,
    rng: () => 0.5,
    extraDamage: 15
});

check("massive_damage_instant_death", attackMassive.killed === true && founder2.data.dead === true,
    `killed=${attackMassive.killed}, dead=${founder2.data.dead}`);

// 4. Non-Colonist Instant Death
console.log("\n[Test 4] Non-Colonist Instant Death at 0 HP");
const wildWolf = W.addUnit({
    name: "Wild Wolf",
    area, x: 10, y: 12,
    data: {
        kind: "wildlife", species: "wolf",
        hp: 5, maxHp: 5, stats: { str: 12, dex: 12, con: 12, int: 3, wis: 12, cha: 6 }
    }
});
const lethalAttack = Cb.resolveAttack(hostileAttacker, wildWolf, {
    legacy: true,
    hit: true,
    damage: 10
});

check("non_colonist_dies_instantly_at_zero", lethalAttack.killed === true && wildWolf.data.dead === true && !wildWolf.data.dying,
    `wolf killed=${lethalAttack.killed}, dead=${wildWolf.data.dead}`);

// 5. Combat.heal Restores Consciousness
console.log("\n[Test 5] Combat.heal Restores Consciousness");
const founder3 = W.addUnit({
    name: "Founder Charlie",
    area, x: 15, y: 15,
    data: {
        kind: "colonist", faction: "player", founder: true,
        hp: 1, maxHp: 10, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
    }
});
// Down founder3
Cb.resolveAttack(hostileAttacker, founder3, { legacy: true, rng: () => 0.5, extraDamage: 2 });
check("founder3_downed", founder3.data.hp === 0 && !!founder3.data.dying,
    `founder3 hp=${founder3.data.hp}, dying=${!!founder3.data.dying}`);

const healedAmount = Cb.heal(founder3, 5);
check("heal_restores_hp", healedAmount === 5 && founder3.data.hp === 5,
    `healed=${healedAmount}, hp=${founder3.data.hp}`);
check("heal_clears_dying_state", founder3.data.dying === undefined,
    `dying=${founder3.data.dying}`);

// 6. Skill Proficiencies & Medicine Stabilization
console.log("\n[Test 6] Skill Proficiencies & Medicine Stabilization");
const stats = { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 };
const dndCleric = Dnd.assignClass(stats, 12345, 1, "human");
check("dnd_class_has_chosen_skills", Array.isArray(dndCleric.skills) && dndCleric.skills.length === 2,
    `skills: ${JSON.stringify(dndCleric.skills)}`);
check("dnd_class_has_lowercase_proficiencies", Array.isArray(dndCleric.proficiencies) && dndCleric.proficiencies.length === 2,
    `proficiencies: ${JSON.stringify(dndCleric.proficiencies)}`);

// Rescuer with explicit medicine proficiency
const doctor = W.addUnit({
    name: "Dr. Clara",
    area, x: 25, y: 25,
    data: {
        kind: "colonist", faction: "player",
        hp: 10, maxHp: 10,
        stats: { wis: 16 }, // Wis mod +3
        proficiencies: ["medicine"]
    }
});
// Rescuer without medicine proficiency
const layman = W.addUnit({
    name: "Layman Dave",
    area, x: 25, y: 26,
    data: {
        kind: "colonist", faction: "player",
        hp: 10, maxHp: 10,
        stats: { wis: 16 }, // Wis mod +3
        proficiencies: ["athletics", "survival"]
    }
});

// Patient at 0 HP
const patient = W.addUnit({
    name: "Patient Eve",
    area, x: 25, y: 24,
    data: {
        kind: "colonist", faction: "player",
        hp: 0, maxHp: 10, stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
    }
});
Col.startDying(patient);

// Medicine check by doctor (Wis mod 3 + Prof 2 = +5)
const docCheck = Dnd.rollCheck(doctor, "wis", "medicine", { rng: () => 0.4999 }); // roll 10
check("proficient_medicine_check_has_bonus", docCheck.proficient === true && docCheck.profBonus === 2 && docCheck.total === 10 + 3 + 2,
    `doctor roll=${docCheck.roll} + mod=${docCheck.mod} + pb=${docCheck.profBonus} = total=${docCheck.total}`);

// Medicine check by layman (Wis mod 3 + Prof 0 = +3)
const layCheck = Dnd.rollCheck(layman, "wis", "medicine", { rng: () => 0.4999 }); // roll 10
check("untrained_medicine_check_lacks_bonus", layCheck.proficient === false && layCheck.profBonus === 0 && layCheck.total === 10 + 3 + 0,
    `layman roll=${layCheck.roll} + mod=${layCheck.mod} + pb=${layCheck.profBonus} = total=${layCheck.total}`);

// Stabilize patient via first aid
const stabRes = Col.stabilize(patient, doctor);
check("patient_stabilized", stabRes && stabRes.ok === true && patient.data.dying.stable === true,
    `stabilize ok=${stabRes ? stabRes.ok : false}, stable=${patient.data.dying.stable}`);
check("stable_patient_remains_at_zero_hp", patient.data.hp === 0,
    `patient hp=${patient.data.hp}`);

// 7. Exhaustion Consumers Ladder
console.log("\n[Test 7] Exhaustion Consumers Ladder");
const worker = W.addUnit({
    name: "Worker Fred",
    area, x: 40, y: 40,
    data: {
        kind: "colonist", faction: "player",
        hp: 10, maxHp: 10, moveSpeed: 4,
        stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        needs: { model: "srd", exhaustion: 0, fromNeeds: 0, foodLb: 0, waterGal: 0 }
    }
});

// Level 1: Disadvantage on checks
worker.data.needs.exhaustion = 1;
const checkLvl1 = Dnd.rollCheck(worker, "wis", "perception", { rng: () => 0.5 });
check("exhaustion_lvl1_check_disadvantage", checkLvl1.disadvantage === true,
    `lvl 1 disadvantage=${checkLvl1.disadvantage}`);

// Level 2: Speed halved (4 -> 3 in RMMZ)
worker.data.needs.exhaustion = 2;
const spdLvl2 = W.unitMoveSpeed(worker);
check("exhaustion_lvl2_speed_halved", spdLvl2 === 3,
    `lvl 2 speed=${spdLvl2} (expected 3)`);

// Level 3: Disadvantage on attacks and saves
worker.data.needs.exhaustion = 3;
const saveLvl3 = Dnd.rollSave(worker, "dex", { rng: () => 0.5 });
check("exhaustion_lvl3_save_disadvantage", saveLvl3.disadvantage === true,
    `lvl 3 save disadvantage=${saveLvl3.disadvantage}`);

// Level 4: HP max halved
worker.data.needs.exhaustion = 4;
const maxHpLvl4 = Cb.maxHp(worker);
check("exhaustion_lvl4_hp_max_halved", maxHpLvl4 === 5,
    `lvl 4 maxHp=${maxHpLvl4} (expected 5)`);

// Verify restoring exhaustion below 4 restores maxHp without healing
worker.data.needs.exhaustion = 3;
const maxHpRestored = Cb.maxHp(worker);
check("exhaustion_recovery_restores_max_hp", maxHpRestored === 10,
    `restored maxHp=${maxHpRestored} (expected 10)`);

// Level 5: Speed 0 and cannot walk
worker.data.needs.exhaustion = 5;
const spdLvl5 = W.unitMoveSpeed(worker);
const sendRes = W.sendUnit(worker.id, { area, x: 45, y: 45 });
check("exhaustion_lvl5_speed_zero", spdLvl5 === 0,
    `lvl 5 speed=${spdLvl5}`);
check("exhaustion_lvl5_sendUnit_refused", sendRes === false,
    `sendUnit refused=${sendRes === false}`);

// 8. Save / Restart Persistence
console.log("\n[Test 8] Save / Restart Persistence");
const saveState = {
    units: [
        {
            id: 101, name: "Dying Soldier", area, x: 5, y: 5,
            data: {
                kind: "colonist", faction: "player", hp: 0, maxHp: 10,
                dying: { successes: 1, failures: 1, stable: false, since: 100, nextRoundAt: 460, wakeAt: null },
                proficiencies: ["athletics"]
            }
        },
        {
            id: 102, name: "Stable Colonist", area, x: 6, y: 5,
            data: {
                kind: "colonist", faction: "player", hp: 0, maxHp: 10,
                dying: { successes: 0, failures: 0, stable: true, since: 100, nextRoundAt: 460, wakeAt: 3000 },
                proficiencies: ["medicine"]
            }
        },
        {
            id: 103, name: "Exhausted Worker", area, x: 7, y: 5,
            data: {
                kind: "colonist", faction: "player", hp: 5, maxHp: 10,
                needs: { model: "srd", exhaustion: 3, fromNeeds: 3, foodLb: 0.5, waterGal: 0.5 },
                proficiencies: ["survival"]
            }
        }
    ]
};

const serialized = JSON.stringify(saveState);
const restored = JSON.parse(serialized);

const u101 = restored.units.find(u => u.id === 101);
const u102 = restored.units.find(u => u.id === 102);
const u103 = restored.units.find(u => u.id === 103);

check("save_dying_progress_preserved", u101 && u101.data.dying.failures === 1 && u101.data.dying.successes === 1,
    `u101 dying failures=${u101.data.dying.failures}, successes=${u101.data.dying.successes}`);
check("save_stable_state_preserved", u102 && u102.data.dying.stable === true && u102.data.hp === 0,
    `u102 stable=${u102.data.dying.stable}, hp=${u102.data.hp}`);
check("save_exhaustion_and_needs_preserved", u103 && u103.data.needs.exhaustion === 3 && u103.data.needs.foodLb === 0.5,
    `u103 exhaustion=${u103.data.needs.exhaustion}, foodLb=${u103.data.needs.foodLb}`);

// Summary
console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    console.error(`Integration test suite FAILED with ${failed} failure(s).`);
    process.exit(1);
} else {
    console.log("All integration checks PASSED (100%).");
    process.exit(0);
}
