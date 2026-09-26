"use strict";
// Normalises the SRD 5.1 JSON the host passes in. No file I/O: callers read
// game/data/srd51/*.json and hand the parsed objects here.
//
// srd = { creatures, equipment, rules, characterOptions? }
// each value is the parsed catalogue file ({ entries: [...] } or a bare array).

const DICE = require("./dice");

// DEUS catalog ids that name an SRD record. The Armor Class and the dice still
// come from that record. An id that is not here and not an SRD name fails loudly.
const ITEM_ALIASES = {
    mail_iron: "chain_mail",
    iron_mail: "chain_mail",
    chainmail: "chain_mail",
    plate_iron: "plate",
    iron_plate: "plate",
    shield_iron: "shield",
    shield_wood: "shield",
    wooden_shield: "shield",
    leather_armor: "leather",
    studded: "studded_leather"
};

const DAMAGE_TYPE_WORDS = [
    "acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic",
    "piercing", "poison", "psychic", "radiant", "slashing", "thunder"
];

function fail(code, msg) {
    const err = new Error(code + ": " + msg);
    err.name = "SrdIndexError";
    err.code = code;
    throw err;
}

function entriesOf(file) {
    if (!file) return [];
    if (Array.isArray(file)) return file;
    if (Array.isArray(file.entries)) return file.entries;
    return [];
}

function findEntry(file, id) {
    const list = entriesOf(file);
    for (let i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i];
    return null;
}

function slug(name) {
    return String(name == null ? "" : name)
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function compact(name) {
    return slug(name).replace(/_/g, "");
}

function parseSigned(text) {
    const m = String(text).replace(/,/g, "").trim().match(/^([+-]?)(\d+)$/);
    if (!m) return null;
    const n = parseInt(m[2], 10);
    return m[1] === "-" ? -n : n;
}

function parseCr(text) {
    const s = String(text).trim();
    const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
    const n = Number(s.replace(/[,+]/g, ""));
    return Number.isFinite(n) ? n : null;
}

function must(entry, id) {
    if (!entry) fail("MISSING_RULE", "SRD catalogue has no entry " + id);
    return entry;
}

function ruleText(entry) {
    return entry && typeof entry.text === "string" ? entry.text : "";
}

function buildIndex(srd) {
    const src = srd || {};
    const disagreements = [];
    const openQuestions = [];

    const abilityEntry = must(findEntry(src.rules, "srd:rule:using-ability-scores-ability-scores-and-modifiers"),
        "srd:rule:using-ability-scores-ability-scores-and-modifiers");
    const abilityTable = (abilityEntry.data && abilityEntry.data.tables && abilityEntry.data.tables[0]) || null;
    if (!abilityTable || !Array.isArray(abilityTable.rows)) fail("MISSING_RULE", "ability modifier table");
    const modByScore = new Map();
    for (let i = 0; i < abilityTable.rows.length; i++) {
        const row = abilityTable.rows[i];
        const mod = parseSigned(row[1]);
        if (mod === null) fail("BAD_TABLE", "ability modifier row " + JSON.stringify(row));
        const parts = String(row[0]).split(/[–\-]/);
        if (parts.length === 1) {
            modByScore.set(parseInt(parts[0], 10), mod);
        } else {
            const lo = parseInt(parts[0], 10);
            const hi = parseInt(parts[1], 10);
            for (let s = lo; s <= hi; s++) modByScore.set(s, mod);
        }
    }
    const formula = ruleText(abilityEntry).match(/subtract (\d+) from the ability score and then divide the total by (\d+) \(round down\)/);
    if (!formula) fail("MISSING_RULE", "ability modifier formula sentence");
    const formulaSub = parseInt(formula[1], 10);
    const formulaDiv = parseInt(formula[2], 10);
    modByScore.forEach(function (mod, score) {
        const derived = Math.floor((score - formulaSub) / formulaDiv);
        if (derived !== mod) {
            disagreements.push("ability score " + score + ": table modifier " + mod + " but the formula sentence gives " + derived + " (" + abilityEntry.id + ")");
        }
    });

    const dcEntry = must(findEntry(src.rules, "srd:rule:using-ability-scores-ability-checks"),
        "srd:rule:using-ability-scores-ability-checks");
    const dcTables = (dcEntry.data && dcEntry.data.tables) || [];
    let dcTable = null;
    for (let i = 0; i < dcTables.length; i++) {
        if (dcTables[i] && /difficulty/i.test(dcTables[i].caption || "")) dcTable = dcTables[i];
    }
    if (!dcTable) fail("MISSING_RULE", "Typical Difficulty Classes table");
    const dcByKey = {};
    for (let i = 0; i < dcTable.rows.length; i++) {
        const key = slug(dcTable.rows[i][0]);
        const n = parseInt(dcTable.rows[i][1], 10);
        if (!key || !Number.isFinite(n)) fail("BAD_TABLE", "DC row " + JSON.stringify(dcTable.rows[i]));
        dcByKey[key] = n;
    }

    const levelEntry = must(findEntry(src.rules, "srd:rule:beyond-1st-level"), "srd:rule:beyond-1st-level");
    const levelTable = (levelEntry.data && levelEntry.data.tables && levelEntry.data.tables[0]) || null;
    if (!levelTable) fail("MISSING_RULE", "Character Advancement table");
    const profByLevel = new Map();
    for (let i = 0; i < levelTable.rows.length; i++) {
        const row = levelTable.rows[i];
        const level = parseInt(row[1], 10);
        const bonus = parseSigned(row[2]);
        if (!Number.isFinite(level) || bonus === null) fail("BAD_TABLE", "advancement row " + JSON.stringify(row));
        profByLevel.set(level, bonus);
    }

    const crEntry = must(findEntry(src.rules, "srd:table:proficiency-bonus-by-challenge-rating"),
        "srd:table:proficiency-bonus-by-challenge-rating");
    const crRows = (crEntry.data && crEntry.data.rows) || [];
    if (!crRows.length) fail("MISSING_RULE", "Proficiency Bonus by Challenge Rating rows");
    const profByCr = new Map();
    for (let i = 0; i < crRows.length; i++) {
        const cr = parseCr(crRows[i][0]);
        const bonus = parseSigned(crRows[i][1]);
        if (cr === null || bonus === null) fail("BAD_TABLE", "CR row " + JSON.stringify(crRows[i]));
        profByCr.set(cr, bonus);
    }
    profByLevel.forEach(function (bonus, level) {
        if (profByCr.has(level) && profByCr.get(level) !== bonus) {
            disagreements.push("proficiency at " + level + ": character advancement +" + bonus + " but challenge rating +" + profByCr.get(level));
        }
    });

    const passiveText = ruleText(dcEntry);
    const passiveBaseMatch = passiveText.match(/\b(\d+) \+ all modifiers that normally apply/);
    const passiveAdvMatch = passiveText.match(/advantage on the check, add (\d+)/i);
    const passiveDisMatch = passiveText.match(/disadvantage, subtract (\d+)/i);
    if (!passiveBaseMatch || !passiveAdvMatch || !passiveDisMatch) fail("MISSING_RULE", "passive check formula");
    const passiveBase = parseInt(passiveBaseMatch[1], 10);
    const passiveAdvantage = parseInt(passiveAdvMatch[1], 10);
    const passiveDisadvantage = parseInt(passiveDisMatch[1], 10);

    const attackEntry = must(findEntry(src.rules, "srd:rule:combat-making-an-attack"), "srd:rule:combat-making-an-attack");
    const attackText = ruleText(attackEntry);
    const reachBaseMatch = attackText.match(/(\d+)-foot reach/);
    const unarmedMatch = attackText.match(/unarmed strike deals (\w+) damage equal to (\d+) \+ your (\w+) modifier/i);
    if (!reachBaseMatch || !unarmedMatch) fail("MISSING_RULE", "melee reach or unarmed strike sentence");
    const meleeReachFeet = parseInt(reachBaseMatch[1], 10);
    const unarmed = {
        flat: parseInt(unarmedMatch[2], 10),
        type: unarmedMatch[1].toLowerCase(),
        ability: unarmedMatch[3].toLowerCase().slice(0, 3),
        source: attackEntry.id
    };

    const propEntry = must(findEntry(src.rules, "srd:rule:equipment-weapon-properties"), "srd:rule:equipment-weapon-properties");
    const reachAddMatch = ruleText(propEntry).match(/Reach\.\s+This weapon adds (\d+) feet to your reach/i);
    if (!reachAddMatch) fail("MISSING_RULE", "reach weapon property");
    const reachBonusFeet = parseInt(reachAddMatch[1], 10);

    const coverEntry = must(findEntry(src.rules, "srd:rule:combat-cover"), "srd:rule:combat-cover");
    const coverText = ruleText(coverEntry);
    const halfCover = coverText.match(/half cover has a \+(\d+) bonus/i);
    const threeCover = coverText.match(/three-quarters cover has a \+(\d+) bonus/i);
    if (!halfCover || !threeCover) fail("MISSING_RULE", "cover bonuses");
    const cover = {
        half: parseInt(halfCover[1], 10),
        threeQuarters: parseInt(threeCover[1], 10),
        source: coverEntry.id
    };

    const fallEntry = must(findEntry(src.rules, "srd:rule:adventuring-the-environment"), "srd:rule:adventuring-the-environment");
    const fallMatch = ruleText(fallEntry).match(/takes (\d+)d(\d+) (\w+) damage for every (\d+) feet it fell, to a maximum of (\d+)d\d+/i);
    if (!fallMatch) fail("MISSING_RULE", "falling damage sentence");
    const falling = {
        countPer: parseInt(fallMatch[1], 10),
        sides: parseInt(fallMatch[2], 10),
        type: fallMatch[3].toLowerCase(),
        feet: parseInt(fallMatch[4], 10),
        maxDice: parseInt(fallMatch[5], 10),
        source: fallEntry.id
    };

    const moveEntry = must(findEntry(src.rules, "srd:rule:adventuring-movement"), "srd:rule:adventuring-movement");
    const moveText = ruleText(moveEntry);
    const highJumpMatch = moveText.match(/high jump, you leap into the air a number of feet equal to (\d+) \+ your Strength modifier/i);
    if (!/Long Jump\./.test(moveText) || !/up to your Strength score/.test(moveText) || !highJumpMatch) {
        fail("MISSING_RULE", "jumping sentences");
    }
    const highJumpBase = parseInt(highJumpMatch[1], 10);

    const healEntry = must(findEntry(src.rules, "srd:rule:combat-damage-and-healing"), "srd:rule:combat-damage-and-healing");
    const healText = ruleText(healEntry);
    const damageTypes = [];
    for (let i = 0; i < DAMAGE_TYPE_WORDS.length; i++) {
        const word = DAMAGE_TYPE_WORDS[i];
        if (new RegExp("\\b" + word + "\\b", "i").test(healText)) damageTypes.push(word);
    }
    if (damageTypes.length !== DAMAGE_TYPE_WORDS.length) {
        fail("MISSING_RULE", "damage type names missing from " + healEntry.id + ": " + DAMAGE_TYPE_WORDS.filter(function (w) { return damageTypes.indexOf(w) < 0; }).join(", "));
    }

    // Unarmored baseline "10 + Dexterity". The SRD states it inside class features
    // (barbarian and monk Unarmored Defense both start from 10). Those features add
    // a second ability; the plain baseline used here is the 10 they share.
    let unarmoredBase = null;
    let unarmoredSource = null;
    const optionEntries = entriesOf(src.characterOptions);
    for (let i = 0; i < optionEntries.length && unarmoredBase === null; i++) {
        const text = ruleText(optionEntries[i]);
        const m = text.match(/Armor Class equals (\d+) \+ your Dexterity modifier/i) || text.match(/\bAC equals (\d+) \+ your Dexterity modifier/i);
        if (m) {
            unarmoredBase = parseInt(m[1], 10);
            unarmoredSource = optionEntries[i].id;
        }
    }
    if (unarmoredBase === null) fail("MISSING_RULE", "unarmored AC baseline (10 + Dexterity) in character options");
    openQuestions.push("Class Unarmored Defense (barbarian adds Constitution, monk adds Wisdom, and only while unarmored) is not applied unless the caller passes opts.unarmoredDefense. The baseline is " + unarmoredBase + " + Dexterity from " + unarmoredSource + ".");
    openQuestions.push("A finesse weapon uses the higher of Strength and Dexterity. The SRD leaves the choice to the creature; this engine takes the higher score.");
    openQuestions.push("DEUS item materials are not marked silvered, adamantine or magical unless the caller passes opts.silvered, opts.adamantine or opts.magical. A weapon attack is therefore nonmagical, and a stat-block line that names nonmagical attacks applies.");
    openQuestions.push("When a creature has several weapon actions and the weapon key matches none of their names, the attack fails loudly (AMBIGUOUS_ATTACK or UNKNOWN_WEAPON) instead of picking one.");
    openQuestions.push("Jumping: the GM may call for an Athletics check to clear a low obstacle or to jump higher. This engine returns only the distance in the jumping sentences.");

    const weapons = new Map();
    const armor = new Map();
    const equipmentEntries = entriesOf(src.equipment);
    for (let i = 0; i < equipmentEntries.length; i++) {
        const entry = equipmentEntries[i];
        if (!entry || !entry.data) continue;
        const key = slug(entry.name);
        if (entry.kind === "weapon") weapons.set(key, normalWeapon(entry, meleeReachFeet, reachBonusFeet));
        else if (entry.kind === "armor") armor.set(key, normalArmor(entry));
    }
    compareArmorTable(findEntry(src.rules, "srd:rule:equipment-armor"), armor, disagreements);

    const creatures = new Map();
    const creatureList = [];
    const creatureEntries = entriesOf(src.creatures);
    for (let i = 0; i < creatureEntries.length; i++) {
        const entry = creatureEntries[i];
        if (!entry || entry.kind !== "creature" || !entry.data) continue;
        const creature = normalCreature(entry, damageTypes);
        creatures.set(creature.key, creature);
        creatures.set(compact(creature.name), creature);
        creatures.set(entry.id, creature);
        creatureList.push(creature);
    }

    function abilityModifier(score) {
        const n = Math.trunc(Number(score));
        if (!Number.isFinite(n)) fail("BAD_SCORE", "ability score " + String(score));
        if (modByScore.has(n)) return modByScore.get(n);
        return Math.floor((n - formulaSub) / formulaDiv);
    }

    function proficiencyBonus(levelOrCr) {
        const n = typeof levelOrCr === "string" ? parseCr(levelOrCr) : Number(levelOrCr);
        if (!Number.isFinite(n)) fail("BAD_LEVEL", "level or challenge rating " + String(levelOrCr));
        if (profByCr.has(n)) return profByCr.get(n);
        if (profByLevel.has(n)) return profByLevel.get(n);
        fail("NO_PROFICIENCY", "no proficiency bonus for " + String(levelOrCr) + " in the SRD tables");
    }

    function dc(key) {
        if (typeof key === "number" && Number.isFinite(key)) return key;
        const k = slug(key);
        if (!Object.prototype.hasOwnProperty.call(dcByKey, k)) fail("BAD_DC", "unknown difficulty " + String(key));
        return dcByKey[k];
    }

    function weapon(key) {
        const k = resolveItemKey(key);
        return weapons.get(k) || weapons.get(compact(k)) || null;
    }

    function armorByKey(key) {
        const k = resolveItemKey(key);
        return armor.get(k) || armor.get(compact(k)) || null;
    }

    function creature(key) {
        if (key == null || key === "") return null;
        const text = String(key);
        return creatures.get(text) || creatures.get(slug(text)) || creatures.get(compact(text)) || null;
    }

    function weaponDefs() {
        const out = {};
        weapons.forEach(function (w, key) {
            if (key !== slug(w.name)) return;
            out[key] = {
                dice: w.damageDice,
                type: w.damageType,
                properties: w.properties.slice(),
                range: w.rangeFeet,
                longRange: w.longRangeFeet,
                versatileDice: w.versatileDice,
                ranged: w.ranged,
                reach: w.reachFeet,
                id: w.id
            };
        });
        return out;
    }

    return {
        disagreements: disagreements,
        openQuestions: openQuestions,
        sources: {
            ability: abilityEntry.id,
            dc: dcEntry.id,
            proficiencyLevel: levelEntry.id,
            proficiencyCr: crEntry.id,
            passive: dcEntry.id,
            unarmed: attackEntry.id,
            unarmored: unarmoredSource,
            reach: propEntry.id,
            cover: coverEntry.id,
            falling: fallEntry.id,
            jumping: moveEntry.id,
            damage: healEntry.id
        },
        abilityModifier: abilityModifier,
        proficiencyBonus: proficiencyBonus,
        dc: dc,
        dcTable: dcByKey,
        passiveBase: passiveBase,
        passiveAdvantage: passiveAdvantage,
        passiveDisadvantage: passiveDisadvantage,
        unarmoredBase: unarmoredBase,
        unarmed: unarmed,
        meleeReachFeet: meleeReachFeet,
        reachBonusFeet: reachBonusFeet,
        cover: cover,
        falling: falling,
        highJumpBase: highJumpBase,
        damageTypes: damageTypes,
        weapon: weapon,
        armor: armorByKey,
        creature: creature,
        creatures: creatureList,
        weaponDefs: weaponDefs,
        parseTrait: function (text) { return parseTrait(text, damageTypes); },
        expressionMax: DICE.expressionMax
    };
}

function resolveItemKey(key) {
    if (key == null) return "";
    if (typeof key === "object") {
        if (typeof key.type === "string") return resolveItemKey(key.type);
        if (typeof key.id === "string") return resolveItemKey(key.id);
        if (typeof key.name === "string") return resolveItemKey(key.name);
    }
    const text = String(key).trim();
    const direct = slug(text);
    if (ITEM_ALIASES[direct]) return ITEM_ALIASES[direct];
    if (ITEM_ALIASES[compact(text)]) return ITEM_ALIASES[compact(text)];
    return direct;
}

function normalWeapon(entry, meleeReachFeet, reachBonusFeet) {
    const data = entry.data;
    const properties = [];
    let versatileDice = null;
    let rangeFeet = null;
    let longRangeFeet = null;
    const list = Array.isArray(data.properties) ? data.properties : [];
    for (let i = 0; i < list.length; i++) {
        const prop = list[i] || {};
        const name = slug(prop.name);
        if (name) properties.push(name);
        if (name === "versatile" && prop.detail) {
            const dice = String(prop.detail).match(/(\d+d\d+)/);
            if (dice) versatileDice = dice[1];
        }
        if (prop.detail) {
            const range = String(prop.detail).match(/range\s+(\d+)\s*\/\s*(\d+)/i);
            if (range) {
                rangeFeet = parseInt(range[1], 10);
                longRangeFeet = parseInt(range[2], 10);
            }
        }
    }
    const ranged = data.rangeType === "ranged" || properties.indexOf("ammunition") >= 0;
    const reach = properties.indexOf("reach") >= 0;
    return {
        id: entry.id,
        name: entry.name,
        key: slug(entry.name),
        damageDice: data.damage && data.damage.dice ? String(data.damage.dice).replace(/\s+/g, "") : null,
        damageType: data.damage && data.damage.type ? String(data.damage.type).toLowerCase() : null,
        properties: properties,
        versatileDice: versatileDice,
        ranged: ranged && data.rangeType !== "melee",
        rangeFeet: rangeFeet != null ? rangeFeet : (reach ? meleeReachFeet + reachBonusFeet : meleeReachFeet),
        longRangeFeet: longRangeFeet,
        reachFeet: reach ? meleeReachFeet + reachBonusFeet : meleeReachFeet,
        source: entry.id
    };
}

function normalArmor(entry) {
    const ac = entry.data.ac || {};
    let dex = "full";
    const mode = String(ac.dexModifier || "");
    const max = mode.match(/max\s*(\d+)/i);
    if (mode === "none") dex = "none";
    else if (max) dex = parseInt(max[1], 10);
    else if (mode === "full" || mode === "") dex = "full";
    return {
        id: entry.id,
        name: entry.name,
        key: slug(entry.name),
        category: String(entry.data.armorCategory || "").toLowerCase(),
        base: Number(ac.base) || 0,
        bonus: Number(ac.bonus) || 0,
        dex: dex,
        stealthDisadvantage: !!entry.data.stealthDisadvantage,
        strength: entry.data.strength == null ? null : entry.data.strength,
        source: entry.id
    };
}

function compareArmorTable(entry, armorMap, disagreements) {
    if (!entry || !entry.data || !entry.data.tables) return;
    const table = entry.data.tables[0];
    if (!table || !Array.isArray(table.rows)) return;
    for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        const key = slug(row[0]);
        const item = armorMap.get(key);
        if (!item) continue;
        const cell = String(row[2] || "");
        const base = cell.match(/^(\d+)/);
        const plus = cell.match(/^\+(\d+)/);
        const cap = cell.match(/max\s*(\d+)/i);
        if (base && item.category !== "shield" && parseInt(base[1], 10) !== item.base) {
            disagreements.push(item.id + " base AC " + item.base + " but the Armor table says " + cell);
        }
        if (plus && item.category === "shield" && parseInt(plus[1], 10) !== item.bonus) {
            disagreements.push(item.id + " shield bonus " + item.bonus + " but the Armor table says " + cell);
        }
        if (cap && item.dex !== parseInt(cap[1], 10)) {
            disagreements.push(item.id + " Dex cap " + String(item.dex) + " but the Armor table says " + cell);
        }
    }
}

function normalCreature(entry, damageTypes) {
    const data = entry.data;
    const actions = [];
    const list = Array.isArray(data.actions) ? data.actions : [];
    for (let i = 0; i < list.length; i++) {
        const action = list[i];
        if (!action || !action.attack) continue;
        const hit = action.attack.hit || {};
        actions.push({
            name: action.name,
            key: compact(action.name),
            type: action.attack.type || null,
            attackKind: action.attack.attackKind || null,
            toHit: action.attack.toHit,
            reach: action.attack.reach,
            range: action.attack.range || null,
            dice: hit.dice ? String(hit.dice).replace(/\s+/g, "") : null,
            average: typeof hit.average === "number" ? hit.average : null,
            damageType: hit.damageType ? String(hit.damageType).toLowerCase() : null,
            text: hit.text || action.text || ""
        });
    }
    return {
        id: entry.id,
        name: entry.name,
        key: slug(entry.name),
        abilities: data.abilities || null,
        ac: data.armorClass && typeof data.armorClass.value === "number" ? data.armorClass.value : null,
        acNote: data.armorClass ? data.armorClass.note : null,
        hitPoints: data.hitPoints || null,
        challenge: data.challenge || null,
        actions: actions,
        resistances: (data.damageResistances || []).map(function (t) { return parseTrait(t, damageTypes); }),
        immunities: (data.damageImmunities || []).map(function (t) { return parseTrait(t, damageTypes); }),
        vulnerabilities: (data.damageVulnerabilities || []).map(function (t) { return parseTrait(t, damageTypes); }),
        savingThrows: data.savingThrows || {},
        source: entry.id
    };
}

function parseTrait(text, damageTypes) {
    const raw = String(text == null ? "" : text);
    const lower = raw.toLowerCase().replace(/[’]/g, "'");
    const types = [];
    for (let i = 0; i < damageTypes.length; i++) {
        if (lower.indexOf(damageTypes[i]) >= 0) types.push(damageTypes[i]);
    }
    return {
        raw: raw,
        types: types,
        spellsOnly: /from spells/.test(lower) || (/spells/.test(lower) && types.length === 0),
        nonmagical: /nonmagical/.test(lower),
        unlessSilvered: /silvered/.test(lower),
        unlessAdamantine: /adamantine/.test(lower),
        magicGoodOnly: /magic weapons wielded by good/.test(lower)
    };
}

module.exports = {
    buildIndex: buildIndex,
    slug: slug,
    compact: compact,
    ITEM_ALIASES: ITEM_ALIASES
};
