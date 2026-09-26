"use strict";
// SIM.60.06 roster. Every fighter names an SRD 5.1 stat block. A unit that only
// carries combatLevels is the Commoner fallback from SIM.60.05 and is refused here.

const SHEETS = [
    "$UF_Human_Male_AR600",
    "$UF_Human_Female_AR600",
    "$UF_Orc_Male_AR600",
    "$UF_Elf_Male_AR600",
    "$UF_Dwarf_Male_AR600",
    "$UF_Goblin_Male_AR600"
];

// every: [base frames, jitter]. host is the catalog item resolveAttack can name,
// or "natural" when the species combat block is a natural weapon whose key matches
// weaponKey. null means the printed action is resolved through UF.Rules directly
// (no catalog item produces that key).
const SPECS = [
    { id: "wolf-bite", srdId: "srd:creature:wolf", species: "wolf", role: "melee", weaponKey: "bite", host: "natural", every: [40, 20] },
    { id: "spider-bite", srdId: "srd:creature:giant-spider", species: "giant_spider", role: "melee", weaponKey: "bite", host: "natural", every: [40, 20] },
    { id: "guard-spear", srdId: "srd:creature:guard", role: "melee", weaponKey: "spear", host: "spear", every: [40, 20] },
    { id: "hobgoblin-longsword", srdId: "srd:creature:hobgoblin", role: "melee", weaponKey: "longsword", host: "sword_long", every: [40, 20] },
    { id: "goblin-scimitar", srdId: "srd:creature:goblin", role: "melee", weaponKey: "scimitar", host: null, every: [40, 20] },
    { id: "orc-greataxe", srdId: "srd:creature:orc", role: "melee", weaponKey: "greataxe", host: null, every: [40, 20] },
    { id: "boar-tusk", srdId: "srd:creature:boar", role: "melee", weaponKey: "tusk", host: null, every: [40, 20] },
    { id: "goblin-shortbow", srdId: "srd:creature:goblin", role: "archer", weaponKey: "shortbow", host: "bow_short", ammo: "arrows", every: [60, 20] },
    { id: "skeleton-shortbow", srdId: "srd:creature:skeleton", role: "archer", weaponKey: "shortbow", host: "bow_short", ammo: "arrows", every: [60, 20] },
    { id: "scout-longbow", srdId: "srd:creature:scout", role: "archer", weaponKey: "longbow", host: null, every: [60, 20] },
    { id: "bandit-crossbow", srdId: "srd:creature:bandit", role: "archer", weaponKey: "light crossbow", host: null, every: [60, 20] },
    { id: "devil-flame", srdId: "srd:creature:barbed-devil", role: "caster", weaponKey: "hurl flame", attackKind: "spell", host: null, every: [90, 30] },
    { id: "wisp-shock", srdId: "srd:creature:will-o-wisp", role: "caster", weaponKey: "shock", attackKind: "spell", host: null, every: [90, 30] },
    { id: "specter-drain", srdId: "srd:creature:specter", role: "caster", weaponKey: "life drain", attackKind: "spell", host: null, every: [90, 30] }
];

const SCREEN_COLS = 17;
const SCREEN_ROWS = 13;

function unitData(spec) {
    const data = {
        kind: spec.species ? "creature" : "person",
        srdId: spec.srdId,
        through: true,
        inventory: [],
        thoughts: []
    };
    if (spec.species) data.species = spec.species;
    if (spec.host && spec.host !== "natural") data.equipment = { weapon: spec.host };
    return data;
}

function refusesCombatLevelsOnly(data) {
    if (!data || typeof data !== "object") return false;
    const scores = data.stats || data.abilities || data.scores;
    const named = data.srdId || data.creatureId || data.creature || data.srdCreature || data.species;
    return !!(data.combatLevels && typeof data.combatLevels === "object" && !named && !scores);
}

function timing(spec, index) {
    const base = spec.every[0];
    const jitter = spec.every[1];
    return {
        interval: base + (index % (jitter + 1)),
        attackPhase: 1 + (index % base),
        movePhase: 1 + (index % 16)
    };
}

function buildRoster(count) {
    const n = count | 0;
    const out = [];
    for (let i = 0; i < n; i++) {
        const spec = SPECS[i % SPECS.length];
        const t = timing(spec, i);
        out.push({
            index: i,
            z: i % 3,
            specId: spec.id,
            srdId: spec.srdId,
            species: spec.species || null,
            role: spec.role,
            weaponKey: spec.weaponKey,
            attackKind: spec.attackKind || "weapon",
            host: spec.host,
            ammo: spec.ammo || null,
            every: spec.every,
            interval: t.interval,
            attackPhase: t.attackPhase,
            movePhase: t.movePhase
        });
    }
    return out;
}

function stampUnit(rules, spec, index, z) {
    if (refusesCombatLevelsOnly(spec)) {
        const err = new Error("COMBAT_LEVELS_ONLY");
        err.code = "COMBAT_LEVELS_ONLY";
        throw err;
    }
    const data = unitData(spec);
    if (data.combatLevels) {
        const err = new Error("COMBAT_LEVELS_ONLY");
        err.code = "COMBAT_LEVELS_ONLY";
        throw err;
    }
    const unit = {
        id: index,
        name: "SRD_" + spec.id + "_" + index,
        z: z,
        data: data
    };
    const creature = rules.creatureOf(unit);
    if (!creature || creature.id !== spec.srdId) {
        const err = new Error("SRD_MISMATCH: " + spec.id + " -> " + (creature && creature.id));
        err.code = "SRD_MISMATCH";
        throw err;
    }
    const hp = rules.hitPoints(creature);
    data.hp = hp.hp;
    data.maxHp = hp.hp;
    data.srdHp = hp.hp;
    return { unit: unit, creature: creature, hp: hp.hp };
}

function strike(rules, attacker, target, spec, rng) {
    const call = { rng: rng, spell: spec.attackKind === "spell" };
    const att = rules.attack(attacker, target, spec.weaponKey, call);
    const dmg = rules.damage(attacker, target, att, call);
    return { attack: att, damage: dmg };
}

module.exports = {
    SHEETS: SHEETS,
    SPECS: SPECS,
    SCREEN_COLS: SCREEN_COLS,
    SCREEN_ROWS: SCREEN_ROWS,
    unitData: unitData,
    refusesCombatLevelsOnly: refusesCombatLevelsOnly,
    timing: timing,
    buildRoster: buildRoster,
    stampUnit: stampUnit,
    strike: strike
};
