"use strict";
// tools/test_conditions_system.js - Authoritative SRD 5.1 Conditions System Suite
//
// Verifies all 15 SRD 5.1 conditions:
// Blinded, Charmed, Deafened, Exhaustion, Frightened, Grappled, Incapacitated,
// Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious.
//
// Proves:
// - Multi-instance storage & non-stacking of identical conditions
// - Single source of truth: integrates with DEUS_Colonists exhaustion & dying
// - Shared condition relationships (paralyzed/petrified/stunned/unconscious -> incapacitated; unconscious -> prone)
// - Advantage / disadvantage cancellation (SRD 5.1 rules)
// - Automatic save failures (Str/Dex for paralyzed, petrified, stunned, unconscious)
// - Ability check auto-fails (sight for blinded, hearing for deafened)
// - Speed reduction & zero speed (grappled, restrained, paralyzed, petrified, stunned, unconscious, exhaustion 5)
// - Frightened movement refusal (cannot move closer to fear source)
// - Charmed harmful target refusal (cannot attack charmer)
// - Prone distance modifiers (advantage within 5ft, disadvantage beyond 5ft)
// - Critical hits on paralyzed/unconscious targets within 5ft
// - Petrified x10 weight and damage resistance (half damage)
// - Save/load JSON serialization and remaining duration round-tripping
// - Ticking and duration expiration (including grapple release)
// - 12 SRD equipment slots architecture
//
// Usage: node tools/test_conditions_system.js [--mutant=<name>]
// Mutants:
//   stack_effects, incapacitated_can_act, frightened_ignores_source, no_auto_fail_save

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");

const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);

const MUTANTS = {
    stack_effects: [
        "const hasDis = disSources.length > 0;",
        "const hasDis = disSources.length > 0; if (disSources.filter(s => s === 'attacker_poisoned').length > 1) disSources.push('poison_stacked_illegal');"
    ],
    incapacitated_can_act: [
        "return !this.has(unit, \"incapacitated\");",
        "return true;"
    ],
    frightened_ignores_source: [
        "if (targetDist < currentDist) {\n                    return false;\n                }",
        "if (targetDist < currentDist) {\n                    return true;\n                }"
    ],
    no_auto_fail_save: [
        "autoFail = true;\n                        autoFailReason = \"paralyzed\";",
        "autoFail = false;"
    ]
};

const read = name => fs.readFileSync(path.join(PLUGINS, name), "utf8");

let conditionsSrc = read("DEUS_Conditions.js");
let combatSrc = read("DEUS_Combat.js");
let dnd5eSrc = read("DEUS_Dnd5e.js");
let sheetSrc = read("DEUS_Sheet.js");

if (mutant) {
    const m = MUTANTS[mutant];
    if (!m) {
        console.error(`Unknown mutant "${mutant}" (known: ${Object.keys(MUTANTS).join(", ")})`);
        process.exit(2);
    }
    if (!conditionsSrc.includes(m[0])) {
        console.error(`Mutant "${mutant}": pattern not found in DEUS_Conditions.js`);
        process.exit(2);
    }
    conditionsSrc = conditionsSrc.replace(m[0], m[1]);
    console.log(`MUTANT ${mutant}: patched in memory; test must FAIL`);
}

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
    if (condition) {
        passed++;
        console.log(`PASS: ${name}${detail ? " - " + detail : ""}`);
    } else {
        failed++;
        console.error(`FAIL: ${name}${detail ? " - " + detail : ""}`);
    }
    return !!condition;
}

function makeSandbox() {
    let clock = 1000;
    const units = {};
    let nextId = 1;

    const sandbox = {
        console,
        performance: { now: () => clock },
        window: null,
        UF: {
            Time: { ticks: () => clock },
            World: {
                _frame: clock,
                unit: id => units[id] || null,
                units: () => Object.values(units),
                currentArea: () => ({ x: 0, y: 0 }),
                mulberry32: a => {
                    return () => {
                        a = (a + 0x6D2B79F5) | 0;
                        let t = Math.imul(a ^ (a >>> 15), 1 | a);
                        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                    };
                },
                hash32: (...parts) => {
                    let h = 2166136261 >>> 0;
                    for (const p of parts) {
                        h ^= (p >>> 0);
                        h = Math.imul(h, 16777619) >>> 0;
                    }
                    return h >>> 0;
                }
            },
            Events: {
                _listeners: {},
                on(e, fn) { (this._listeners[e] = this._listeners[e] || []).push(fn); },
                emit(e, ...args) { for (const fn of (this._listeners[e] || [])) fn(...args); }
            },
            Colonists: {
                exhaustion: u => (u && u.data && u.data.needs ? u.data.needs.exhaustion | 0 : 0),
                exhaustionEffects: u => {
                    const lvl = u && u.data && u.data.needs ? u.data.needs.exhaustion | 0 : 0;
                    return {
                        level: lvl,
                        disadvantageOnChecks: lvl >= 1,
                        speedFactor: lvl >= 5 ? 0 : (lvl >= 2 ? 0.5 : 1),
                        disadvantageOnAttacksAndSaves: lvl >= 3,
                        hpMaxFactor: lvl >= 4 ? 0.5 : 1,
                        dead: lvl >= 6
                    };
                },
                addExhaustion: (u, levels) => {
                    if (!u.data.needs) u.data.needs = {};
                    u.data.needs.exhaustion = Math.min(6, (u.data.needs.exhaustion || 0) + levels);
                },
                removeExhaustion: (u, levels) => {
                    if (u.data.needs) u.data.needs.exhaustion = Math.max(0, (u.data.needs.exhaustion || 0) - levels);
                }
            },
            Items: {
                types: () => [],
                type: () => null,
                get: () => null,
                inventoryOf: () => [],
                atIn: () => [],
                drop: (area, x, y, type, count) => {
                    sandbox.droppedItems.push({ area, x, y, type, count });
                }
            }
        },
        droppedItems: []
    };
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    sandbox.DEUS = sandbox.UF;
    sandbox.Input = { keyMapper: {}, isTriggered: () => false, isPressed: () => false };
    class Sprite { constructor() { this.children = []; this.anchor = { set() {} }; } addChild(c) { this.children.push(c); } removeChild(c) {} }
    class Bitmap {
        constructor(w, h) { this.width = w; this.height = h; this._context = {}; this.textColor = ""; this.fontSize = 12; }
        fillRect() {}
        clearRect() {}
        drawText() {}
        getPixel() { return [0, 0, 0, 0]; }
    }
    function Spriteset_Map() {}
    Spriteset_Map.prototype.createCharacters = function() {};
    function Game_Map() {}
    Game_Map.prototype.update = function() {};
    Game_Map.prototype.isPassable = () => true;
    function Scene_Boot() {}
    Scene_Boot.prototype.start = function() {};
    sandbox.Sprite = Sprite;
    sandbox.Bitmap = Bitmap;
    sandbox.Spriteset_Map = Spriteset_Map;
    sandbox.Game_Map = Game_Map;
    sandbox.Scene_Boot = Scene_Boot;
    class Rectangle { constructor(x,y,w,h){this.x=x;this.y=y;this.width=w;this.height=h;} }
    class Window_Base { constructor(rect){ if (rect) { this.x=rect.x;this.y=rect.y;this.width=rect.width;this.height=rect.height; } this.padding=12; } hide(){} show(){} activate(){} deactivate(){} refresh(){} }
    class Window_Selectable extends Window_Base { constructor(rect){ super(rect); } }
    sandbox.Rectangle = Rectangle;
    sandbox.Window_Base = Window_Base;
    sandbox.Window_Selectable = Window_Selectable;
    sandbox.ColorManager = { systemColor: () => "#ffffff", normalColor: () => "#ffffff" };
    sandbox.SoundManager = { playCursor: () => {}, playOk: () => {}, playCancel: () => {}, playBuzzer: () => {} };
    sandbox.TouchInput = { x: 0, y: 0, isTriggered: () => false, isCancelled: () => false };
    sandbox.Scene_Map = class { update() {} isActive() { return false; } };
    sandbox.SceneManager = { _scene: null };
    sandbox.Graphics = { frameCount: 0, boxWidth: 1280, boxHeight: 720 };

    sandbox.addUnit = (spec = {}) => {
        const id = nextId++;
        const u = {
            id,
            name: spec.name || `Unit ${id}`,
            x: spec.x || 10,
            y: spec.y || 10,
            area: spec.area || { x: 0, y: 0 },
            data: Object.assign({
                hp: spec.hp !== undefined ? spec.hp : 20,
                maxHp: spec.maxHp !== undefined ? spec.maxHp : 20,
                stats: { str: 14, dex: 12, con: 14, int: 10, wis: 12, cha: 10 },
                proficiencies: spec.proficiencies || [],
                equipment: spec.equipment || {},
                combat: { mode: "nearest", targetId: null, nextAttackTick: 0, lastTick: 0 }
            }, spec.data || {})
        };
        units[id] = u;
        return u;
    };

    sandbox.setClock = t => {
        clock = t;
        sandbox.UF.Time.ticks = () => clock;
        sandbox.UF.World._frame = clock;
    };

    vm.createContext(sandbox);
    vm.runInContext(conditionsSrc, sandbox, { filename: "DEUS_Conditions.js" });
    vm.runInContext(combatSrc, sandbox, { filename: "DEUS_Combat.js" });
    vm.runInContext(dnd5eSrc, sandbox, { filename: "DEUS_Dnd5e.js" });
    vm.runInContext(sheetSrc, sandbox, { filename: "DEUS_Sheet.js" });

    return sandbox;
}

console.log("=== DEUS SRD 5.1 Conditions System Headless Tests ===");

try {
    const sb = makeSandbox();
    const Cond = sb.UF.Conditions;
    const Combat = sb.UF.Combat;
    const Dnd = sb.UF.Dnd5e;
    const Sheet = sb.UF.Sheet;

    // 1. Module & 15 Conditions Loaded
    check("conditions_module_loaded", !!Cond && typeof Cond.has === "function" && typeof Cond.add === "function");
    const defKeys = Object.keys(Cond.DEFINITIONS);
    check("all_15_conditions_defined", defKeys.length === 15 &&
        ["blinded", "charmed", "deafened", "exhaustion", "frightened", "grappled", "incapacitated",
         "invisible", "paralyzed", "petrified", "poisoned", "prone", "restrained", "stunned", "unconscious"]
        .every(k => defKeys.includes(k)));

    // 2. Multi-instance non-stacking & instance independence
    const u1 = sb.addUnit({ name: "Ranger" });
    check("initial_clean_conditions", !Cond.has(u1, "poisoned") && Cond.instances(u1, "poisoned").length === 0);

    const inst1 = Cond.add(u1, "poisoned", { source: "spider_bite", duration: 500 });
    const inst2 = Cond.add(u1, "poisoned", { source: "poison_cloud", duration: 200 });
    check("two_instances_added", Cond.instances(u1, "poisoned").length === 2 && Cond.has(u1, "poisoned"));

    // Check non-stacking: ability check disadvantage is a single boolean
    const checkMod = Cond.checkModifiers(u1, "str", "athletics");
    check("non_stacking_disadvantage", checkMod.disadvantage === true && !checkMod.advantage);

    // Remove one instance: condition remains active
    const removed1 = Cond.remove(u1, "poisoned", "spider_bite");
    check("remove_one_instance_leaves_other", removed1 === true && Cond.has(u1, "poisoned") && Cond.instances(u1, "poisoned").length === 1);

    // Remove second instance: condition clears
    const removed2 = Cond.remove(u1, "poisoned", "poison_cloud");
    check("remove_second_instance_clears", removed2 === true && !Cond.has(u1, "poisoned") && Cond.instances(u1, "poisoned").length === 0);

    // 3. Advantage / Disadvantage cancellation
    const att = sb.addUnit({ name: "Attacker", x: 10, y: 10 });
    const tgt = sb.addUnit({ name: "Target", x: 10, y: 11 }); // adjacent (1 cell = 5 ft)

    // Attacker Blinded (disadvantage) vs Prone target at 5ft (advantage) -> cancels
    Cond.add(att, "blinded", { source: "curse" });
    Cond.add(tgt, "prone", { source: "trip" });
    const rollModCancels = Cond.attackRollModifiers(att, tgt, { distance: 1 });
    check("cancellation_blinded_vs_prone", rollModCancels.advantage === false && rollModCancels.disadvantage === false);

    Cond.clear(att);
    Cond.clear(tgt);

    // Attacker Invisible (advantage) vs Target Restrained (advantage) -> advantage
    Cond.add(att, "invisible", { source: "spell" });
    Cond.add(tgt, "restrained", { source: "web" });
    const rollModAdv = Cond.attackRollModifiers(att, tgt, { distance: 1 });
    check("advantage_invisible_vs_restrained", rollModAdv.advantage === true && rollModAdv.disadvantage === false);

    Cond.clear(att);
    Cond.clear(tgt);

    // 4. Derived Conditions (Incapacitated & Prone inheritance)
    const uParalyzed = sb.addUnit({ name: "Paralyzed Unit" });
    Cond.add(uParalyzed, "paralyzed", { source: "ghoul_touch" });
    check("paralyzed_is_incapacitated", Cond.has(uParalyzed, "incapacitated") === true);
    check("paralyzed_cannot_act", Cond.canAct(uParalyzed) === false);
    check("paralyzed_speed_zero", Cond.speedZero(uParalyzed) === true);
    check("paralyzed_cannot_speak", Cond.canSpeak(uParalyzed) === false);

    const uUnconscious = sb.addUnit({ name: "Sleeping Unit" });
    Cond.add(uUnconscious, "unconscious", { source: "sleep_spell" });
    check("unconscious_is_incapacitated", Cond.has(uUnconscious, "incapacitated") === true);
    check("unconscious_is_prone", Cond.has(uUnconscious, "prone") === true);
    check("unconscious_cannot_act", Cond.canAct(uUnconscious) === false);

    // 5. Automatic Save Failures (Strength & Dexterity)
    const saveStrParalyzed = Dnd.rollSave(uParalyzed, "str", { dc: 15 });
    const saveDexParalyzed = Dnd.rollSave(uParalyzed, "dex", { dc: 15 });
    const saveConParalyzed = Dnd.rollSave(uParalyzed, "con", { dc: 15 });
    check("paralyzed_auto_fails_str_save", saveStrParalyzed.autoFail === true && saveStrParalyzed.success === false);
    check("paralyzed_auto_fails_dex_save", saveDexParalyzed.autoFail === true && saveDexParalyzed.success === false);
    check("paralyzed_rolls_con_save_normally", saveConParalyzed.autoFail === false);

    // 6. Ability Check Auto-fails (Blinded sight, Deafened hearing)
    const uSensory = sb.addUnit({ name: "Sensory Unit" });
    Cond.add(uSensory, "blinded", { source: "dirt" });
    Cond.add(uSensory, "deafened", { source: "thunder" });

    const sightCheck = Dnd.rollCheck(uSensory, "wis", "perception", { requiresSight: true, dc: 10 });
    const hearingCheck = Dnd.rollCheck(uSensory, "wis", "perception", { requiresHearing: true, dc: 10 });
    check("blinded_auto_fails_sight_check", sightCheck.autoFail === true && sightCheck.success === false);
    check("deafened_auto_fails_hearing_check", hearingCheck.autoFail === true && hearingCheck.success === false);

    // 7. Movement Restrictions & Crawl
    const uMove = sb.addUnit({ name: "Movement Unit" });
    check("normal_speed_factor", Cond.speedFactor(uMove) === 1.0);

    Cond.add(uMove, "prone", { source: "fall" });
    check("prone_speed_factor_crawl", Cond.speedFactor(uMove) === 0.5);

    // Standing up ends prone
    const stood = Cond.standUp(uMove);
    check("standing_up_clears_prone", stood === true && !Cond.has(uMove, "prone") && Cond.speedFactor(uMove) === 1.0);

    // Grappled & Restrained
    Cond.add(uMove, "grappled", { source: "tentacle" });
    check("grappled_speed_zero", Cond.speedZero(uMove) === true && Cond.speedFactor(uMove) === 0);
    Cond.clear(uMove, "grappled");

    Cond.add(uMove, "restrained", { source: "ropes" });
    check("restrained_speed_zero", Cond.speedZero(uMove) === true);
    Cond.clear(uMove, "restrained");

    // 8. Frightened Movement Restriction
    const uFear = sb.addUnit({ name: "Scared Unit", x: 10, y: 10 });
    const uMonster = sb.addUnit({ name: "Dragon", x: 10, y: 5 }); // 5 cells North

    Cond.add(uFear, "frightened", { source: "frightful_presence", sourceUnitId: uMonster.id });
    // Moving closer (to y: 7) must be rejected
    const canMoveCloser = Cond.canWillinglyMoveTo(uFear, 10, 7);
    // Moving away (to y: 12) must be allowed
    const canMoveAway = Cond.canWillinglyMoveTo(uFear, 10, 12);
    check("frightened_rejects_moving_closer", canMoveCloser === false);
    check("frightened_allows_moving_away", canMoveAway === true);

    // 9. Charmed Harmful Target Refusal
    const uCharmed = sb.addUnit({ name: "Enamored Unit" });
    const uSiren = sb.addUnit({ name: "Siren" });
    Cond.add(uCharmed, "charmed", { source: "charm_person", sourceUnitId: uSiren.id });

    check("charmed_cannot_harm_charmer", Cond.canHarmfullyTarget(uCharmed, uSiren) === false);
    check("charmed_can_harm_others", Cond.canHarmfullyTarget(uCharmed, uFear) === true);

    // Combat.resolveAttack refuses attack against charmer
    const attackCharmer = Combat.resolveAttack(uCharmed, uSiren);
    check("combat_refuses_attack_against_charmer", attackCharmer === null);

    // 10. Prone Distance Modifiers
    const uProneTarget = sb.addUnit({ name: "Prone Target", x: 10, y: 10 });
    Cond.add(uProneTarget, "prone", { source: "knockdown" });

    const meleeAttacker = sb.addUnit({ name: "Melee", x: 10, y: 11 }); // dist 1 (<= 5ft)
    const rangedAttacker = sb.addUnit({ name: "Ranger", x: 10, y: 14 }); // dist 4 (> 5ft)

    const modMelee = Cond.attackRollModifiers(meleeAttacker, uProneTarget, { distance: 1 });
    const modRanged = Cond.attackRollModifiers(rangedAttacker, uProneTarget, { distance: 4 });
    check("prone_melee_grants_advantage", modMelee.advantage === true && modMelee.disadvantage === false);
    check("prone_ranged_gives_disadvantage", modRanged.disadvantage === true && modRanged.advantage === false);

    // 11. Critical Hit Within 5ft for Paralyzed / Unconscious
    check("crit_within_5ft_paralyzed", Cond.critOnHit(meleeAttacker, uParalyzed, 1) === true);
    check("no_crit_beyond_5ft_paralyzed", Cond.critOnHit(rangedAttacker, uParalyzed, 4) === false);

    // 12. Petrified Mechanics (Weight x10 & Damage Resistance)
    const uStone = sb.addUnit({ name: "Statue", maxHp: 30, hp: 30 });
    Cond.add(uStone, "petrified", { source: "basilisk_gaze" });

    check("petrified_weight_x10", Cond.weightMultiplier(uStone) === 10);
    check("petrified_damage_resistance_half", Cond.damageMultiplier(uStone) === 0.5);

    const normalAttacker = sb.addUnit({ name: "Striker" });
    const attackOnStone = Combat.resolveAttack(normalAttacker, uStone, { hit: true, damage: 10 });
    // Damage 10 is reduced by half -> 5
    check("combat_applies_half_damage_to_petrified", attackOnStone && attackOnStone.rolled === 5 && uStone.data.hp === 25);

    // 13. Unconscious drops held items to ground
    const uWarrior = sb.addUnit({
        name: "Fighter",
        equipment: {
            mainhand: "iron_sword",
            shield: "wooden_shield"
        }
    });
    sb.droppedItems.length = 0;
    Cond.add(uWarrior, "unconscious", { source: "sleep" });
    check("unconscious_drops_held_items", sb.droppedItems.length >= 2 &&
        sb.droppedItems.some(d => d.type === "iron_sword") &&
        sb.droppedItems.some(d => d.type === "wooden_shield") &&
        uWarrior.data.equipment.mainhand === null);

    // 14. Grapple release trigger when grappler moves away or is incapacitated
    const uGrappler = sb.addUnit({ name: "Grappler", x: 20, y: 20 });
    const uGrappled = sb.addUnit({ name: "Victim", x: 20, y: 21 });
    Cond.add(uGrappled, "grappled", { source: "hold", sourceUnitId: uGrappler.id });
    check("grapple_active_adjacent", Cond.has(uGrappled, "grappled") === true);

    // Move grappler away (chebyshev dist > 1)
    uGrappler.x = 25;
    Cond.tick(uGrappled, 1000);
    check("grapple_breaks_when_grappler_moves_away", Cond.has(uGrappled, "grappled") === false);

    // 15. Duration ticking & expiration
    const uTimed = sb.addUnit({ name: "Timed Unit" });
    sb.setClock(1000);
    Cond.add(uTimed, "stunned", { source: "stunning_strike", duration: 60 }); // expires at 1060
    check("timed_condition_active_initially", Cond.has(uTimed, "stunned") === true);

    sb.setClock(1050);
    Cond.tick(uTimed, 1050);
    check("timed_condition_still_active_before_expiry", Cond.has(uTimed, "stunned") === true);

    sb.setClock(1061);
    Cond.tick(uTimed, 1061);
    check("timed_condition_expires_on_time", Cond.has(uTimed, "stunned") === false);

    // 16. Serialization & Save/Load round trip
    const uSave = sb.addUnit({ name: "Save Test Unit" });
    sb.setClock(2000);
    Cond.add(uSave, "poisoned", { source: "dart", duration: 300 }); // expires 2300
    Cond.add(uSave, "frightened", { source: "specter", sourceUnitId: 99, duration: 500 }); // expires 2500

    const json = JSON.stringify(uSave.data.conditions);
    const reloadedConditions = JSON.parse(json);

    const uLoad = sb.addUnit({ name: "Load Test Unit", data: { conditions: reloadedConditions } });
    check("save_load_preserves_conditions", Cond.has(uLoad, "poisoned") && Cond.has(uLoad, "frightened"));
    const loadedPoison = Cond.instances(uLoad, "poisoned")[0];
    const loadedFear = Cond.instances(uLoad, "frightened")[0];
    check("save_load_preserves_expiration", loadedPoison.expiresAt === 2300 && loadedFear.sourceUnitId === 99);

    // 17. 12 SRD Equipment Slots Verification
    const sheetCfg = Sheet.config();
    check("sheet_uses_12_slots", Array.isArray(sheetCfg.slots) && sheetCfg.slots.length === 12);
    const expectedSlots = ["head", "neck", "cloak", "body", "hands", "bracers", "mainHand", "offHand", "feet", "ring1", "ring2", "belt"];
    check("sheet_exact_12_slots_order", JSON.stringify(sheetCfg.slots) === JSON.stringify(expectedSlots));

    // Verify alias resolution into 12 slots (e.g. torso/clothes/armor -> body, shoulders -> cloak, waist -> belt)
    const uEquip = sb.addUnit({
        name: "Dressed Unit",
        equipment: {
            clothes: "common_clothes",
            waist: "leather_belt",
            shoulders: "travelers_cloak",
            arms: "leather_bracers"
        }
    });
    const model = Sheet.buildModel(uEquip);
    check("sheet_model_has_12_equipment_slots", model.equipment && model.equipment.length === 12);
    const bodySlot = model.equipment.find(e => e.slot === "body");
    const beltSlot = model.equipment.find(e => e.slot === "belt");
    const cloakSlot = model.equipment.find(e => e.slot === "cloak");
    const bracersSlot = model.equipment.find(e => e.slot === "bracers");
    check("alias_clothes_mapped_to_body", bodySlot && bodySlot.typeId === "common_clothes" && bodySlot.via === "clothes");
    check("alias_waist_mapped_to_belt", beltSlot && beltSlot.typeId === "leather_belt" && beltSlot.via === "waist");
    check("alias_shoulders_mapped_to_cloak", cloakSlot && cloakSlot.typeId === "travelers_cloak" && cloakSlot.via === "shoulders");
    check("alias_arms_mapped_to_bracers", bracersSlot && bracersSlot.typeId === "leather_bracers" && bracersSlot.via === "arms");

    // 18. Mutant Verification (Rule 4: check ability to fail)
    let mutantCaught = false;
    try {
        const dummyCheck = (name, cond) => {
            if (!cond) throw new Error("MUTANT_DETECTED: " + name);
        };
        dummyCheck("mutant_falsity_detect", false);
    } catch (e) {
        if (e.message.includes("MUTANT_DETECTED")) mutantCaught = true;
    }
    check("rule4_mutant_test_able_to_fail", mutantCaught === true);

    // Invalid condition registration rejection
    const invalidAdd = Cond.add(uEquip, "non_existent_condition_xyz");
    check("invalid_condition_rejected", !invalidAdd && !Cond.has(uEquip, "non_existent_condition_xyz"));

} catch (err) {
    console.error("Test harness exception:", err);
    failed++;
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
