"use strict";
// SIM.60.05 SRD 5.1 rules checks. One PASS/FAIL line per check.
// Exit 0 only when every check passes. Mutants are in-memory copies; nothing on disk is edited.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..", "..");
const RULES_DIR = path.join(ROOT, "game", "js", "sim", "rules");
const SRD_DIR = path.join(ROOT, "game", "data", "srd51");
const COMBAT = path.join(ROOT, "game", "js", "plugins", "DEUS_Combat.js");

let passed = 0;
let failed = 0;
function check(name, cond) {
    if (cond) {
        passed++;
        console.log("PASS " + name);
    } else {
        failed++;
        console.log("FAIL " + name);
    }
    return !!cond;
}

function readJson(name) {
    return JSON.parse(fs.readFileSync(path.join(SRD_DIR, name), "utf8"));
}

const srd = {
    creatures: readJson("creatures.json"),
    equipment: readJson("equipment.json"),
    rules: readJson("rules.json"),
    characterOptions: readJson("character_options.json")
};

const sources = {
    dice: fs.readFileSync(path.join(RULES_DIR, "dice.js"), "utf8"),
    index: fs.readFileSync(path.join(RULES_DIR, "srd_index.js"), "utf8"),
    species: fs.readFileSync(path.join(RULES_DIR, "species_map.js"), "utf8"),
    rules: fs.readFileSync(path.join(RULES_DIR, "rules.js"), "utf8")
};

function loadEngine(src) {
    const modules = {};
    function localRequire(name) {
        if (name === "./dice" || name === "./dice.js") return modules.dice;
        if (name === "./srd_index" || name === "./srd_index.js") return modules.index;
        if (name === "./species_map" || name === "./species_map.js") return modules.species;
        throw new Error("unexpected require " + name);
    }
    function run(key, code) {
        const module = { exports: {} };
        const fn = new Function("require", "module", "exports", code);
        fn(localRequire, module, module.exports);
        modules[key] = module.exports;
    }
    run("dice", src.dice);
    run("species", src.species);
    run("index", src.index);
    run("rules", src.rules);
    return modules.rules;
}

const real = loadEngine(sources);
const { createRules, attach } = real;
const { createSeededRng } = real ? require(path.join(RULES_DIR, "dice.js")) : {};
const rules = createRules(srd);

function seq(values) {
    let i = 0;
    return function () {
        const u = values[Math.min(i, values.length - 1)];
        i++;
        return u;
    };
}

const goblin = rules.index.creature("goblin");
const hero = { id: "hero", data: { stats: { str: 16, dex: 14, con: 12, int: 10, wis: 15, cha: 8 }, saveProficiencies: ["str", "con"], level: 1 } };
const dummy = { id: "dummy", x: 1, y: 0, z: 0, data: { stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, level: 1 } };

check("index_built_srd_rule_using_ability_scores", !!goblin && goblin.id === "srd:creature:goblin" && goblin.ac === 15);
check("ability_modifier_table_1_is_-5", rules.abilityModifier(1) === -5);
check("ability_modifier_table_10_and_11_are_0", rules.abilityModifier(10) === 0 && rules.abilityModifier(11) === 0);
check("ability_modifier_table_30_is_10", rules.abilityModifier(30) === 10);
check("dc_ladder_srd_rule_ability_checks",
    rules.dc("very_easy") === 5 && rules.dc("easy") === 10 && rules.dc("medium") === 15 &&
    rules.dc("hard") === 20 && rules.dc("very_hard") === 25 && rules.dc("nearly_impossible") === 30);
check("proficiency_level_1_and_cr_1_4", rules.proficiencyBonus(1) === 2 && rules.proficiencyBonus(0.25) === 2 && rules.proficiencyBonus(5) === 3 && rules.proficiencyBonus(17) === 6);

// Goblin scimitar, srd:creature:goblin, to-hit +4, damage 1d6+2, AC 15.
const goblinUnit = { id: "goblin", x: 0, y: 0, z: 0, data: { srdId: "srd:creature:goblin" } };
const ac15 = { id: "ac15", x: 1, y: 0, z: 0, data: { srdId: "srd:creature:goblin" } };
rules._setTestRoll(11);
const gobHit = rules.attack(goblinUnit, ac15, "Scimitar");
rules._setTestRoll(10);
const gobMiss = rules.attack(goblinUnit, ac15, "scimitar");
rules._clearTestRoll();
const gobDmg = rules.damage(goblinUnit, ac15, gobHit, { rng: seq([0]) });
check("goblin_scimitar_hits_own_ac_srd_creature_goblin", gobHit.hit === true && gobHit.total === 15 && gobHit.attackMod === 4 && gobHit.effectiveAC === 15);
check("goblin_scimitar_misses_one_short_srd_creature_goblin", gobMiss.hit === false && gobMiss.total === 14);
check("goblin_scimitar_damage_1d6_plus_2_srd_creature_goblin", gobDmg.damage === 3 && gobDmg.type === "slashing" && gobDmg.diceRolled === "1d6");

// Longsword versatile, srd:weapon:longsword. Strength 16 is +3, proficiency at level 1 is +2.
const fighter = { id: "fighter", x: 0, y: 0, z: 0, data: { stats: { str: 16, dex: 10, con: 14, int: 10, wis: 10, cha: 10 }, level: 1 } };
rules._setTestRoll(15);
const sword = rules.attack(fighter, dummy, "longsword", { targetAC: 12 });
rules._clearTestRoll();
const oneHand = rules.damage(fighter, dummy, Object.assign({}, sword, { hit: true, critical: false }), { rng: seq([0.99]) });
const twoHand = rules.damage(fighter, dummy, Object.assign({}, rules.attack(fighter, dummy, "longsword", { targetAC: 12, versatile: true, roll: 15 }), { critical: false }), { rng: seq([0.99]) });
check("longsword_attack_mod_str_plus_prof_srd_weapon_longsword", sword.hit === true && sword.attackMod === 5 && sword.total === 20);
check("longsword_versatile_1d10_srd_weapon_longsword", oneHand.damage === 11 && twoHand.damage === 13 && rules.WEAPON_DEFS.longsword.dice === "1d8" && rules.WEAPON_DEFS.longsword.versatileDice === "1d10");

// Finesse uses Dex when Dex is higher. Dagger srd:weapon:dagger. Ranged shortbow uses Dex only.
const rogue = { id: "rogue", x: 0, y: 0, z: 0, data: { stats: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 }, level: 1 } };
const fin = rules.attack(rogue, dummy, "dagger", { roll: 10, profBonus: 2 });
const bow = rules.attack(rogue, dummy, "shortbow", { roll: 10, profBonus: 2 });
check("finesse_dagger_uses_dex_srd_weapon_dagger", fin.abilityMod === 4 && fin.attackMod === 6);
check("shortbow_uses_dex_srd_weapon_shortbow", bow.abilityMod === 4 && rules.WEAPON_DEFS.shortbow.ranged === true && rules.WEAPON_DEFS.shortbow.range === 80 && rules.WEAPON_DEFS.shortbow.longRange === 320);
check("halberd_reach_10_feet_srd_weapon_halberd", rules.WEAPON_DEFS.halberd.properties.indexOf("reach") >= 0 && rules.WEAPON_DEFS.halberd.range === 10);
check("dagger_thrown_range_srd_weapon_dagger", rules.WEAPON_DEFS.dagger.properties.indexOf("finesse") >= 0 && rules.WEAPON_DEFS.dagger.properties.indexOf("thrown") >= 0 && rules.WEAPON_DEFS.dagger.range === 20 && rules.WEAPON_DEFS.dagger.longRange === 60);

// Critical hit doubles the d8, not the +3. Natural 20 hits a high AC. Natural 1 misses a low AC.
const critAttack = rules.attack(fighter, dummy, "longsword", { roll: 20, targetAC: 40 });
const critDamage = rules.damage(fighter, dummy, critAttack, { rng: seq([0, 0]) });
const fumble = rules.attack(fighter, dummy, "longsword", { roll: 1, targetAC: 5 });
check("natural_20_hits_and_crits", critAttack.hit === true && critAttack.critical === true && critAttack.fumble === false);
check("crit_doubles_longsword_dice_not_modifier", critDamage.critical === true && critDamage.diceRolled === "2d8" && critDamage.damage === 5);
check("natural_1_misses", fumble.hit === false && fumble.fumble === true && fumble.critical === false);

// Advantage keeps 20 from [1, 20]. Disadvantage keeps 1 from [20, 1].
const adv = rules.attack(fighter, dummy, "longsword", { rng: seq([0, 0.99]), advantage: true, targetAC: 25 });
const dis = rules.attack(fighter, dummy, "longsword", { rng: seq([0.99, 0]), disadvantage: true, targetAC: 5 });
const cancel = rules.attack(fighter, dummy, "longsword", { rng: seq([0.4]), advantage: true, disadvantage: true, targetAC: 10 });
check("advantage_keeps_higher_d20", adv.natural === 20 && adv.advantage === true && adv.hit === true && adv.critical === true);
check("disadvantage_keeps_lower_d20", dis.natural === 1 && dis.disadvantage === true && dis.hit === false);
check("advantage_and_disadvantage_cancel", cancel.advantage === false && cancel.disadvantage === false && cancel.natural === 9);

// Resistance floors, vulnerability doubles, immunity zeroes. Flat 5 is the whole damage.
function typed(type, listName) {
    const target = { id: "t", x: 1, y: 0, z: 0, data: { stats: { dex: 10, str: 10, con: 10, int: 10, wis: 10, cha: 10 } } };
    target.data[listName] = [type];
    return rules.damage(fighter, target, { hit: true, critical: false, damageFlat: 5, damageType: type, damageExpr: null, abilityMod: 0, fromStatBlock: true }, {});
}
check("resistance_halves_rounding_down", typed("fire", "damageResistances").damage === 2 && typed("fire", "damageResistances").relation === "resistance");
check("vulnerability_doubles", typed("cold", "damageVulnerabilities").damage === 10);
check("immunity_is_zero", typed("poison", "damageImmunities").damage === 0);

// A real stat block: the flesh golem is immune to poison (srd:creature:flesh-golem is not required; pick from data).
const poisonImmune = rules.index.creatures.filter(function (c) {
    return c.immunities.some(function (t) { return t.types.length === 1 && t.types[0] === "poison" && !t.nonmagical; });
})[0];
const immuneUnit = { id: "imm", x: 1, y: 0, z: 0, data: { srdId: poisonImmune.id } };
const immuneDmg = rules.damage(fighter, immuneUnit, { hit: true, critical: false, damageFlat: 8, damageType: "poison", damageExpr: null, abilityMod: 0, fromStatBlock: true }, {});
check("stat_block_poison_immunity_" + poisonImmune.id.replace(/[^a-z0-9]+/gi, "_"), immuneDmg.damage === 0);

// Save, initiative, hit points, armor.
rules._setTestRoll(10);
const strSave = rules.savingThrow(hero, "str", 15);
const init = rules.initiative(hero);
rules._clearTestRoll();
check("str_save_10_plus_3_plus_2_meets_dc_15", strSave.ok === true && strSave.total === 15 && strSave.profBonus === 2);
check("initiative_d20_plus_dex_srd_combat_order", init.roll === 10 && init.dexMod === 2 && init.total === 12);
const hp = rules.hitPoints(goblin);
const hpRolled = rules.hitPoints(goblin, { rolled: true, rng: seq([0, 0]) });
check("goblin_hit_points_average_7_srd_creature_goblin", hp.hp === 7 && hpRolled.hp === 2 && hp.formula === "2d6");

const leather = { data: { stats: { dex: 16 }, level: 1, equipment: { torso: "leather" } } };
const chain = { data: { stats: { dex: 16 }, level: 1, equipment: { torso: "chain_shirt" } } };
const plate = { data: { stats: { dex: 16 }, level: 1, equipment: { armor: "plate", shield: "shield" } } };
const mail = { data: { stats: { dex: 10 }, level: 1, equipment: { torso: "mail_iron" } } };
const bare = { data: { stats: { dex: 16 }, level: 1, equipment: {} } };
check("unarmored_10_plus_dex", rules.armorClass(bare).ac === 13 && rules.armorClass(bare).category === "unarmored");
check("leather_11_plus_dex_srd_armor_leather", rules.armorClass(leather).ac === 14 && rules.armorClass(leather).category === "light");
check("chain_shirt_caps_dex_at_2_srd_armor_chain_shirt", rules.armorClass(chain).ac === 15 && rules.armorClass(chain).effectiveDex === 2);
check("plate_and_shield_20_srd_armor_plate", rules.armorClass(plate).ac === 20 && rules.armorClass(plate).effectiveDex === 0 && rules.armorClass(plate).shieldAC === 2);
check("deus_mail_iron_reads_chain_mail_16", rules.armorClass(mail).ac === 16 && rules.armorClass(mail).baseAC === 16);

// Same-Z. Cover bonus from the caller (half cover is +2 in srd:rule:combat-cover).
const high = { id: "high", x: 1, y: 0, z: 1, data: { stats: { dex: 10 } } };
const cross = rules.attack(fighter, high, "longsword", { roll: 20 });
check("different_z_is_rejected", cross.hit === false && cross.sameZViolation === true);
const covered = rules.attack(fighter, dummy, "longsword", { roll: 11, targetAC: 11, coverBonus: rules.index.cover.half });
check("cover_bonus_added_to_ac_srd_rule_combat_cover", rules.index.cover.half === 2 && rules.index.cover.threeQuarters === 5 && covered.effectiveAC === 13 && covered.hit === true);
const totalCover = rules.attack(fighter, dummy, "longsword", { roll: 20, coverBonus: Infinity });
check("total_cover_is_not_a_target", totalCover.hit === false && totalCover.totalCover === true);

// Checks, passive checks, contest, death save, jumping, falling. Numbers are the SRD sentences.
rules._setTestRoll(12);
const strCheck = rules.check(hero, "str", "medium", { profBonus: 2 });
const passive = rules.passiveCheck(hero, "wis", null, { profBonus: 2 });
const passiveAdv = rules.passiveCheck(hero, "wis", null, { profBonus: 2, advantage: true });
const passiveDis = rules.passiveCheck(hero, "wis", null, { profBonus: 2, disadvantage: true });
rules._clearTestRoll();
const cancelled = rules.check(hero, "str", 10, { advantage: true, disadvantage: true, rng: seq([0.2]) });
check("ability_check_12_plus_3_plus_2_vs_medium", strCheck.ok === true && strCheck.total === 17 && strCheck.margin === 2 && strCheck.roll === 12);
check("passive_check_10_plus_mods_and_5", passive === 14 && passiveAdv === 19 && passiveDis === 9);
check("check_advantage_disadvantage_cancel", cancelled.advantage === false && cancelled.disadvantage === false);
const orc = { id: "orc", data: { stats: { str: 18, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } } };
rules._setTestRoll(10);
const contest = rules.contest(hero, "str", orc, "str");
rules._clearTestRoll();
check("contest_higher_total_wins", contest.winner === "B" && contest.checkA.total === 13 && contest.checkB.total === 14);
const dying = { id: "down", data: { combat: { hp: 0 } } };
rules._setTestRoll(12);
const ds1 = rules.deathSave(dying);
rules._setTestRoll(5);
const ds2 = rules.deathSave(dying);
rules._setTestRoll(1);
const ds3 = rules.deathSave(dying);
const lucky = { id: "lucky", data: { combat: { hp: 0 } } };
rules._setTestRoll(20);
const dsUp = rules.deathSave(lucky);
rules._clearTestRoll();
check("death_save_success_failure_and_nat_1", ds1.result === "success" && ds1.successes === 1 && ds2.failures === 1 && ds3.result === "critical_failure" && ds3.failures === 3 && ds3.dead === true);
check("death_save_nat_20_revives_at_1", dsUp.result === "revive" && lucky.data.combat.hp === 1);
const athlete = { data: { stats: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } } };
check("jumping_long_and_high_srd_rule_adventuring_movement", rules.jumping(athlete, "long", true) === 16 && rules.jumping(athlete, "long", false) === 8 && rules.jumping(athlete, "high", true) === 6);
const fall = rules.fallingDamage(30);
check("falling_3d6_at_30_feet_srd_rule_adventuring_the_environment", fall.dice === "3d6" && fall.landsProne === true && fall.type === "bludgeoning");

// No silent mapping.
let mappingThrew = false;
try { rules.attack({ id: "blank", data: {} }, dummy, "longsword", { roll: 10 }); } catch (e) { mappingThrew = e.code === "NO_SRD_MAPPING"; }
check("unmapped_unit_fails_loudly", mappingThrew);
let unknownThrew = false;
try { rules.attack(fighter, dummy, "not_a_weapon", { roll: 10 }); } catch (e) { unknownThrew = e.code === "UNKNOWN_WEAPON"; }
check("unknown_weapon_fails_loudly", unknownThrew);

// Determinism.
function transcript(seed) {
    const rng = createSeededRng(seed);
    const a = rules.attack(fighter, dummy, "longsword", { rng: rng });
    const d = rules.damage(fighter, dummy, a, { rng: rng });
    return JSON.stringify({ hit: a.hit, natural: a.natural, total: a.total, damage: d.damage, rolls: d.rolls, type: d.type });
}
check("same_seed_same_transcript", transcript(20260926) === transcript(20260926));
check("different_seeds_differ", transcript(1) !== transcript(2));

// Every creature attack action resolves.
let coverage = 0;
let coverageError = "";
for (let i = 0; i < rules.index.creatures.length; i++) {
    const creature = rules.index.creatures[i];
    if (!creature.actions.length) continue;
    const attacker = { id: creature.id, x: 0, y: 0, z: 0, data: { srdId: creature.id } };
    for (let k = 0; k < creature.actions.length; k++) {
        const action = creature.actions[k];
        try {
            const att = rules.attack(attacker, dummy, action.name, { rng: seq([0.25]), roll: 10 });
            rules.damage(attacker, dummy, att, { rng: seq([0.25, 0.5, 0.75, 0.1]) });
            coverage++;
        } catch (e) {
            coverageError = creature.id + " " + action.name + " " + (e.code || e.message);
            break;
        }
    }
    if (coverageError) break;
}
const attackActions = rules.index.creatures.reduce(function (n, c) { return n + c.actions.length; }, 0);
check("creature_attack_coverage_" + coverage + "_of_" + attackActions, coverage === attackActions && !coverageError);

// Purity scan. A mutant that names a forbidden global is caught.
const FORBIDDEN = [
    { name: "window", re: /\bwindow\b/ },
    { name: "document", re: /\bdocument\b/ },
    { name: "PIXI", re: /\bPIXI\b/ },
    { name: "$game", re: /\$game/ },
    { name: "$data", re: /\$data/ },
    { name: "Game_", re: /\bGame_/ },
    { name: "Scene_", re: /\bScene_/ },
    { name: "Sprite", re: /\bSprite/ },
    { name: "Date", re: /\bDate\b/ },
    { name: "Math.random", re: /Math\.random/ },
    { name: "readFile", re: /\breadFile/ },
    { name: "require-fs", re: /require\s*\(\s*["']fs["']\s*\)/ }
];
function purityHits(text) {
    const hits = [];
    for (let i = 0; i < FORBIDDEN.length; i++) if (FORBIDDEN[i].re.test(text)) hits.push(FORBIDDEN[i].name);
    return hits;
}
const purityClean = purityHits(sources.dice + "\n" + sources.index + "\n" + sources.species + "\n" + sources.rules);
const purityDirty = purityHits(sources.dice + "\nwindow.Math.random();");
check("purity_scan_clean", purityClean.length === 0);
check("purity_scan_catches_mutant", purityDirty.indexOf("window") >= 0 && purityDirty.indexOf("Math.random") >= 0);

// In-memory mutants. Each one must disagree with the real engine.
function mutantEngine(file, from, to) {
    if (sources[file].indexOf(from) < 0 || sources[file].split(from).length - 1 !== 1) return null;
    const copy = { dice: sources.dice, index: sources.index, species: sources.species, rules: sources.rules };
    copy[file] = sources[file].replace(from, to);
    return loadEngine(copy).createRules(srd);
}

const mCrit = mutantEngine("dice", "const modifier = parsed.modifier;", "const modifier = parsed.modifier * (critical ? 2 : 1);");
let critKilled = false;
if (mCrit) {
    // Goblin scimitar is "1d6+2" on the stat block. A crit is 2 + 2, not 2 + 4.
    const a = mCrit.attack(goblinUnit, ac15, "Scimitar", { roll: 20 });
    const d = mCrit.damage(goblinUnit, ac15, a, { rng: seq([0, 0]) });
    critKilled = d.damage !== 4;
}
check("mutant_crit_doubles_modifier_killed", !!mCrit && critKilled);

const mFumble = mutantEngine("rules", "const fumble = natural === 1;", "const fumble = false;");
let fumbleKilled = false;
if (mFumble) {
    const a = mFumble.attack(fighter, dummy, "longsword", { roll: 1, targetAC: 5 });
    fumbleKilled = a.hit === true;
}
check("mutant_natural_1_hits_killed", !!mFumble && fumbleKilled);

const mResist = mutantEngine("rules", "amount = Math.floor(amount / 2);", "amount = Math.ceil(amount / 2);");
let resistKilled = false;
if (mResist) {
    const target = { data: { stats: { dex: 10, str: 10, con: 10, int: 10, wis: 10, cha: 10 }, damageResistances: ["fire"] } };
    const d = mResist.damage(fighter, target, { hit: true, critical: false, damageFlat: 5, damageType: "fire", damageExpr: null, abilityMod: 0, fromStatBlock: true }, {});
    resistKilled = d.damage === 3;
}
check("mutant_resistance_rounds_up_killed", !!mResist && resistKilled);

const mDex = mutantEngine("rules", "if (dexMod >= strMod) return { name: \"dex\", mod: dexMod };", "if (false) return { name: \"dex\", mod: dexMod };");
let dexKilled = false;
if (mDex) {
    const a = mDex.attack(rogue, dummy, "dagger", { roll: 10, profBonus: 2 });
    dexKilled = a.abilityMod === 0;
}
check("mutant_finesse_ignores_dex_killed", !!mDex && dexKilled);

const mAdv = mutantEngine("dice", "const natural = advantage ? Math.max(first, second) : Math.min(first, second);", "const natural = first;");
let advKilled = false;
if (mAdv) {
    const a = mAdv.attack(fighter, dummy, "longsword", { rng: seq([0, 0.99]), advantage: true, targetAC: 25 });
    advKilled = a.natural !== 20;
}
check("mutant_advantage_ignored_killed", !!mAdv && advKilled);

const mRng = mutantEngine("dice",
    "if (typeof rng !== \"function\") {\n        fail(\"NO_RNG\", \"dice require an injected rng\");\n    }\n    return rng;",
    "if (typeof rng !== \"function\") {\n        return function () { return Math.random(); };\n    }\n    return rng;");
let rngKilled = false;
if (mRng) {
    let saw = 0;
    const orig = Math.random;
    Math.random = function () { saw++; return 0.1; };
    try {
        const a = mRng.attack(fighter, dummy, "longsword", { targetAC: 10 });
        rngKilled = saw > 0 && a.natural === 3;
    } catch (e) {
        rngKilled = false;
    }
    Math.random = orig;
}
check("mutant_unseeded_rng_killed", !!mRng && rngKilled);

// The real engine still refuses a missing rng (the mutant above does not).
let refused = false;
try { rules.attack(fighter, dummy, "longsword", { targetAC: 10 }); } catch (e) { refused = e.code === "NO_RNG"; }
check("missing_rng_is_refused", refused);

// Loader: a vm whose global is named window, and a plain require that does not publish itself.
const rulesPath = path.join(RULES_DIR, "rules.js");
const context = { console: console, require: require, srd: srd, rulesPath: rulesPath };
context.window = context;
vm.createContext(context);
vm.runInContext("const api = require(rulesPath); api.attach(window, api.createRules(srd));", context);
check("loader_vm_window_uf_rules", context.UF && context.UF.Rules && typeof context.UF.Rules.attack === "function" && context.window.UF.Rules === context.UF.Rules);
const plain = require(rulesPath);
check("loader_require_does_not_publish", typeof plain.createRules === "function" && typeof plain.attach === "function" && !(global.UF && global.UF.Rules));

// Retired formula path: the plugin source must not carry it.
const combatText = fs.readFileSync(COMBAT, "utf8");
const retiredNames = ["hitChance", "maxHitFor", "maxHitOf", "OSRS", "combatLevel", "levelOffset", "magicDefence", "bonusesOf", "fighting level"];
const osrs = retiredNames.filter(function (name) {
    if (name === "combatLevel") return /\bcombatLevel\b/.test(combatText);
    return combatText.indexOf(name) >= 0;
});
if (/\blegacy\b/.test(combatText) || /useRules/.test(combatText) || /o\.legacy/.test(combatText)) osrs.push("legacy-branch");
check("zero_retired_formula_in_deus_combat", osrs.length === 0);

// FIX1. Runtime HP, species map, armor, printed saves, riders, resistance order.
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));
const speciesList = catalog.wildlife.species;
const namedHp = { wolf: 11, deer: 4, jackal: 3, boar: 11, giant_spider: 26, troll: 84 };

function loadCombat(source) {
    const context = {
        console: console,
        require: require,
        process: process,
        performance: { now: function () { return 0; } }
    };
    context.window = context;
    function Sprite() {}
    Sprite.prototype.addChild = function () { return this; };
    Sprite.prototype.removeChild = function () { return this; };
    context.Sprite = Sprite;
    function Bitmap() {}
    context.Bitmap = Bitmap;
    function Spriteset_Map() {}
    Spriteset_Map.prototype.createCharacters = function () {};
    context.Spriteset_Map = Spriteset_Map;
    function Scene_Boot() {}
    Scene_Boot.prototype.start = function () {};
    context.Scene_Boot = Scene_Boot;
    context.SceneManager = { _scene: null };
    vm.createContext(context);
    vm.runInContext(source, context, { filename: COMBAT });
    return context;
}

const combatVm = loadCombat(combatText);
combatVm.$ufWorldCatalog = catalog;
const liveRules = combatVm.UF && combatVm.UF.Rules;
const liveCombat = combatVm.UF && combatVm.UF.Combat;
let hpMatch = speciesList.length === 23 && !!liveCombat;
const hpBad = [];
for (let i = 0; hpMatch && i < speciesList.length; i++) {
    const species = speciesList[i];
    const unit = { id: species.id, data: { species: species.id } };
    const got = liveCombat.maxHp(unit);
    const block = liveRules.creatureOf(unit);
    const want = block ? liveRules.hitPoints(block).hp : null;
    if (got !== want || (namedHp[species.id] !== undefined && got !== namedHp[species.id])) {
        hpMatch = false;
        hpBad.push(species.id + "=" + got + " want " + want);
    }
}
check("catalog_species_maxhp_is_srd_average", hpMatch && hpBad.length === 0);

const hpMutantSrc = combatText.replace(
    "base = Rules.hitPoints(creature).hp;",
    "base = (speciesOf(unit) && speciesOf(unit).combat && speciesOf(unit).combat.hitpoints) || Rules.hitPoints(creature).hp;"
);
let catalogHpKilled = false;
if (hpMutantSrc !== combatText) {
    const hpMutant = loadCombat(hpMutantSrc);
    hpMutant.$ufWorldCatalog = catalog;
    const wolfUnit = { id: "wolf", data: { species: "wolf" } };
    catalogHpKilled = hpMutant.UF.Combat.maxHp(wolfUnit) === 24;
}
check("mutant_catalog_hitpoints_killed", catalogHpKilled);

const mapRows = rules.speciesMap;
const mapIds = {};
let mapOk = mapRows.length === 23;
for (let i = 0; i < mapRows.length; i++) {
    const row = mapRows[i];
    mapIds[row.species] = row;
    if (!row.srdId || (row.kind !== "direct" && row.kind !== "proxy") || !row.reason) mapOk = false;
    if (!rules.index.creature(row.srdId)) mapOk = false;
}
for (let i = 0; i < speciesList.length; i++) if (!mapIds[speciesList[i].id]) mapOk = false;
const human = { id: "human", data: { species: "human" } };
const bench = { id: "bench", data: { kind: "test", combatLevels: { attack: 60, hitpoints: 99 } } };
const humanCreature = rules.creatureOf(human);
const benchCreature = rules.creatureOf(bench);
check("species_map_covers_23_and_commoner_default",
    mapOk && humanCreature && humanCreature.id === "srd:creature:commoner" && rules.hitPoints(humanCreature).hp === 4 &&
    benchCreature && benchCreature.id === "srd:creature:commoner");

let pairOk = true;
let pairErr = "";
const itemTypes = catalog.items.types;
const weaponItems = itemTypes.filter(function (t) { return t && t.weapon; });
const armorItems = itemTypes.filter(function (t) {
    if (!t) return false;
    if (t.shield) return true;
    const slot = t.armor && t.armor.slot;
    return slot === "armor" || slot === "shield" || slot === "torso" || slot === "clothes";
});
function naturalKey(species) {
    const type = species.combat && species.combat.attackType;
    return liveCombat.resolveWeaponKey({ natural: true, types: [type || "crush"] });
}
for (let a = 0; pairOk && a < speciesList.length; a++) {
    const attacker = { id: "a" + a, x: 0, y: 0, z: 0, data: { species: speciesList[a].id } };
    const key = naturalKey(speciesList[a]);
    for (let b = 0; pairOk && b < speciesList.length; b++) {
        const target = { id: "b" + b, x: 1, y: 0, z: 0, data: { species: speciesList[b].id } };
        try {
            const att = rules.attack(attacker, target, key, { roll: 12, rng: seq([0.2]) });
            rules.damage(attacker, target, att, { rng: seq([0.2, 0.4]), saveRoll: 10 });
        } catch (e) {
            pairOk = false;
            pairErr = speciesList[a].id + "->" + speciesList[b].id + " " + key + " " + (e.code || e.message);
        }
    }
}
for (let w = 0; pairOk && w < weaponItems.length; w++) {
    const item = weaponItems[w];
    const key = liveCombat.resolveWeaponKey({ name: item.name, itemType: item.id });
    const attacker = { id: "w" + w, x: 0, y: 0, z: 0, data: { species: "wolf", equipment: { weapon: item.id } } };
    const target = { id: "wt", x: 1, y: 0, z: 0, data: { species: "deer" } };
    try {
        const att = rules.attack(attacker, target, key, { roll: 12, rng: seq([0.2]) });
        rules.damage(attacker, target, att, { rng: seq([0.2]), saveRoll: 10 });
    } catch (e) {
        pairOk = false;
        pairErr = "weapon " + item.id + " key " + key + " " + (e.code || e.message);
    }
}
for (let n = 0; pairOk && n < armorItems.length; n++) {
    const item = armorItems[n];
    const slot = item.shield ? "shield" : "torso";
    const equipment = {};
    equipment[slot] = item.id;
    const target = { id: "ar" + n, x: 1, y: 0, z: 0, data: { species: "wolf", equipment: equipment } };
    const attacker = { id: "ara", x: 0, y: 0, z: 0, data: { species: "boar" } };
    try {
        const att = rules.attack(attacker, target, "bite", { roll: 12, rng: seq([0.2]) });
        rules.damage(attacker, target, att, { rng: seq([0.2]), saveRoll: 10 });
    } catch (e) {
        pairOk = false;
        pairErr = "armor " + item.id + " " + (e.code || e.message);
    }
}
if (!pairOk) console.log("PAIR " + pairErr);
if (hpBad.length) console.log("HP " + hpBad.join(", "));
check("catalog_species_weapons_and_armor_resolve", pairOk && weaponItems.length > 0 && armorItems.length > 0);

const armorBad = [];
for (let i = 0; i < armorItems.length; i++) {
    const item = armorItems[i];
    const resolved = rules.index.armor(item.id);
    const listed = rules.index.isNonArmor(item.id);
    if (!resolved && !listed) armorBad.push(item.id);
    if (resolved && listed) armorBad.push(item.id + ":both");
}
const leatherWearer = { data: { stats: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 }, equipment: { torso: "armor_leather" } } };
const leatherAc = rules.armorClass(leatherWearer);
if (armorBad.length) console.log("ARMOR " + armorBad.join(", "));
check("catalog_armor_slots_resolve_or_are_listed_non_armor",
    armorBad.length === 0 && leatherAc.ac === 13 && rules.index.armor("armor_leather") && rules.index.armor("armor_leather").key === "leather");
const armorMutant = mutantEngine("index", "    armor_leather: \"leather\",\n", "");
let armorAliasKilled = false;
if (armorMutant) {
    const worn = { data: { stats: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 }, equipment: { torso: "armor_leather" } } };
    try { armorMutant.armorClass(worn); } catch (e) { armorAliasKilled = e.code === "UNKNOWN_ARMOR"; }
}
check("mutant_armor_leather_alias_dropped_killed", !!armorMutant && armorAliasKilled);

let saveChecked = 0;
let saveMatched = 0;
let saveBad = "";
for (let i = 0; i < rules.index.creatures.length; i++) {
    const creature = rules.index.creatures[i];
    const saves = creature.savingThrows || {};
    const keys = Object.keys(saves);
    for (let k = 0; k < keys.length; k++) {
        saveChecked++;
        const unit = { id: creature.id, data: { srdId: creature.id } };
        const result = rules.savingThrow(unit, keys[k], 10, { roll: 10 });
        if (result.total === 10 + saves[keys[k]]) saveMatched++;
        else saveBad = creature.id + " " + keys[k] + " total " + result.total + " printed " + saves[keys[k]];
    }
}
const dragon = { data: { srdId: "srd:creature:adult-red-dragon" } };
const dragonCon = rules.savingThrow(dragon, "con", 20, { roll: 10 });
if (saveBad) console.log("SAVE " + saveBad);
check("printed_saves_315_equal_10_plus_bonus", saveChecked === 315 && saveMatched === 315 && !saveBad && dragonCon.total === 23);
const saveMutant = mutantEngine("rules",
    "if (typeof printed === \"number\" && Number.isFinite(printed)) printedSave = printed;",
    "if (false) printedSave = printed;");
let saveKilled = false;
if (saveMutant) saveKilled = saveMutant.savingThrow(dragon, "con", 20, { roll: 10 }).total !== 23;
check("mutant_printed_saves_ignored_killed", !!saveMutant && saveKilled);

const bothTraits = { data: { stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, damageResistances: ["fire"], damageVulnerabilities: ["fire"] } };
const bothDmg = rules.damage(fighter, bothTraits, { hit: true, critical: false, damageFlat: 25, damageType: "fire", damageExpr: null, fromStatBlock: true, abilityMod: 0 }, {});
check("resistance_then_vulnerability_srd_rule_combat_damage_and_healing", bothDmg.damage === 24 && bothDmg.relation === "resistance_then_vulnerability");
const resistOrderMutant = mutantEngine("rules",
    "if (vulnerable) {\n            amount = amount * 2;\n            relation = relation ? \"resistance_then_vulnerability\" : \"vulnerability\";\n        }",
    "if (vulnerable && !resist) {\n            amount = amount * 2;\n            relation = \"vulnerability\";\n        }");
let resistOrderKilled = false;
if (resistOrderMutant) {
    const d = resistOrderMutant.damage(fighter, bothTraits, { hit: true, critical: false, damageFlat: 25, damageType: "fire", damageExpr: null, fromStatBlock: true, abilityMod: 0 }, {});
    resistOrderKilled = d.damage !== 24;
}
check("mutant_resistance_and_vulnerability_cancel_killed", !!resistOrderMutant && resistOrderKilled);

const spider = { id: "spider", data: { species: "giant_spider" } };
const saveVictim = { id: "victim", data: { stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } } };
const spiderAtt = rules.attack(spider, saveVictim, "bite", { roll: 18 });
const spiderFail = rules.damage(spider, saveVictim, spiderAtt, { rng: seq([0, 0, 0]), saveRoll: 1 });
const spiderSave = rules.damage(spider, saveVictim, spiderAtt, { rng: seq([0, 0, 0]), saveRoll: 15 });
const dragonAtt = rules.attack(dragon, saveVictim, "bite", { roll: 18 });
const dragonDmg = rules.damage(dragon, saveVictim, dragonAtt, { rng: seq([0.999, 0.999, 0.999, 0.999]) });
const riderReport = rules.index.riderReport;
check("unconditional_and_save_riders_apply",
    spiderFail.riders.length === 1 && spiderFail.riders[0].type === "poison" && spiderFail.riders[0].damage === 2 && spiderFail.damage === 6 &&
    spiderSave.riders[0].damage === 1 &&
    dragonDmg.damage === 40 && dragonDmg.riders.length === 1 && dragonDmg.riders[0].type === "fire" && dragonDmg.riders[0].damage === 12 &&
    riderReport.unconditional === 63 && riderReport.save === 19 && riderReport.gaps.length > 0);
const riderMutant = mutantEngine("rules", "for (let i = 0; i < riders.length; i++) {", "for (let i = 0; i < 0; i++) {");
let riderKilled = false;
if (riderMutant) {
    const att = riderMutant.attack(dragon, saveVictim, "bite", { roll: 18 });
    const d = riderMutant.damage(dragon, saveVictim, att, { rng: seq([0.999, 0.999, 0.999, 0.999]) });
    riderKilled = d.damage === 28 && (!d.riders || d.riders.length === 0);
}
check("mutant_riders_dropped_killed", !!riderMutant && riderKilled);
console.log("RIDER_APPLIED unconditional " + riderReport.unconditional);
console.log("RIDER_APPLIED save " + riderReport.save);
console.log("RIDER_GAPS " + riderReport.gaps.length);
for (let i = 0; i < riderReport.gaps.length; i++) {
    const gap = riderReport.gaps[i];
    console.log("RIDER_GAP " + gap.id + " " + gap.action + " | " + gap.reason);
}

const nonmagical = { data: { stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, damageResistances: ["bludgeoning from nonmagical attacks"] } };
const flatHit = { hit: true, critical: false, damageFlat: 10, damageType: "bludgeoning", damageExpr: null, fromStatBlock: true, abilityMod: 0 };
const plainResist = rules.damage(fighter, nonmagical, flatHit, {});
const magicBypass = rules.damage(fighter, nonmagical, flatHit, { magical: true });
check("magical_bypasses_nonmagical_resistance", plainResist.damage === 5 && magicBypass.damage === 10);
const magicMutant = mutantEngine("rules", "if (trait.nonmagical && magical) return false;", "if (trait.nonmagical && false) return false;");
let magicKilled = false;
if (magicMutant) magicKilled = magicMutant.damage(fighter, nonmagical, flatHit, { magical: true }).damage === 5;
check("mutant_magical_bypass_ignored_killed", !!magicMutant && magicKilled);

const monkShield = { data: { stats: { str: 10, dex: 16, con: 14, int: 10, wis: 16, cha: 10 }, unarmoredDefense: "monk", equipment: { shield: "shield" } } };
const monkBare = { data: { stats: { str: 10, dex: 16, con: 14, int: 10, wis: 16, cha: 10 }, unarmoredDefense: "monk" } };
const barbShield = { data: { stats: { str: 10, dex: 14, con: 16, int: 10, wis: 10, cha: 10 }, unarmoredDefense: "barbarian", equipment: { shield: "shield" } } };
check("monk_unarmored_defense_forbids_shield",
    rules.armorClass(monkBare).ac === 16 && rules.armorClass(monkShield).ac === 15 && rules.armorClass(barbShield).ac === 17 &&
    rules.index.unarmoredDefense.monk.forbidsShield === true && rules.index.deathSaves.successOn === 10 && rules.index.longJump.usesStrengthScore === true);

check("plugin_publishes_window_uf_rules", !!(liveRules && typeof liveRules.attack === "function" && combatVm.window.UF.Rules === liveRules));
const attachMutantSrc = combatText.replace("mod.attach(window, rules);", "/* attach removed */;");
let attachKilled = false;
if (attachMutantSrc !== combatText) {
    const dropped = loadCombat(attachMutantSrc);
    attachKilled = !(dropped.UF && dropped.UF.Rules);
}
check("mutant_plugin_attach_removed_killed", attachKilled);

const rngStart = combatText.indexOf("function attackRng");
const rngEnd = combatText.indexOf("function modeOf");
const rngBody = combatText.slice(rngStart, rngEnd);
check("plugin_default_rng_is_seeded", rngBody.indexOf("mulberry32") >= 0 && rngBody.indexOf("Math.random") < 0);
const rngMutantSrc = combatText.replace(
    "return w.mulberry32(w.hash32(seed, SALT.attack, attacker.id >>> 0, target.id >>> 0, st.tick >>> 0, st.seq));",
    "return function () { return Math.random(); };"
);
const rngMutantBody = rngMutantSrc.slice(rngMutantSrc.indexOf("function attackRng"), rngMutantSrc.indexOf("function modeOf"));
check("mutant_plugin_unseeded_rng_killed", rngMutantSrc !== combatText && rngMutantBody.indexOf("Math.random") >= 0);

let seededSame = false;
let randomCalls = 0;
const realRandom = Math.random;
Math.random = function () { randomCalls++; return 0.5; };
try {
    combatVm.UF.World = {
        state: { seed: 5, combat: { updates: 0, tick: 0, seq: 0, spawns: 0 } },
        hash32: function () { return 4242; },
        mulberry32: function (seed) {
            let a = seed >>> 0;
            return function () {
                a = (a + 0x6D2B79F5) >>> 0;
                return (a % 997) / 997;
            };
        },
        unit: function () { return null; },
        isDisplayed: function () { return false; }
    };
    const striker = { id: 7, area: { x: 0, y: 0 }, x: 0, y: 0, z: 0, data: { species: "wolf", hp: 11, combat: { mode: "manual" } } };
    const post = { id: 8, area: { x: 0, y: 0 }, x: 1, y: 0, z: 0, data: { stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, level: 1, hp: 30, maxHp: 30, combat: { mode: "manual" } } };
    combatVm.UF.World.state.combat.seq = 0;
    const first = liveCombat.resolveAttack(striker, post, { bypassGcd: true });
    combatVm.UF.World.state.combat.seq = 0;
    post.data.hp = 30;
    const second = liveCombat.resolveAttack(striker, post, { bypassGcd: true });
    seededSame = !!first && !!second && first.attackRoll === second.attackRoll && first.damage === second.damage && randomCalls === 0;
    if (!seededSame) console.log("RNGDBG rolls " + (first && first.attackRoll) + "/" + (second && second.attackRoll) + " dmg " + (first && first.damage) + "/" + (second && second.damage) + " random " + randomCalls + " null " + !first + "/" + !second);
} catch (e) {
    seededSame = false;
    console.log("RNGDBG throw " + (e && (e.stack || e.message)));
}
Math.random = realRandom;
check("plugin_default_rng_repeats_for_the_same_seed", seededSame);

if (rules.disagreements.length) {
    console.log("DISAGREEMENTS " + rules.disagreements.length);
    for (let i = 0; i < rules.disagreements.length && i < 20; i++) console.log("DISAGREE " + rules.disagreements[i]);
}
console.log("OPEN_QUESTIONS " + rules.openQuestions.length);
console.log("CREATURES " + rules.index.creatures.length);
console.log("ATTACK_ACTIONS " + attackActions);
console.log("COVERAGE " + coverage);

console.log("RESULT: " + passed + " passed, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
