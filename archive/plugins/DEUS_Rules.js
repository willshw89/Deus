//=============================================================================
// DEUS_Rules.js - Authoritative SRD 5.1 Rules Resolver for Project DEUS
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Rules] Authoritative SRD 5.1 rules engine: centralized ability checks, saving throws, contests, AC formulas, attack & damage resolution, and conditions.
 * @author UF project
 * @base DEUS_World
 * @base DEUS_Conditions
 * @orderAfter DEUS_World
 * @orderAfter DEUS_Conditions
 *
 * @help
 * Centralizes the official Creative Commons SRD 5.1 rules framework across DEUS:
 * - Six ability scores (STR, DEX, CON, INT, WIS, CHA) & modifier formula floor((score-10)/2)
 * - Standard DC ladder (Very Easy 5, Easy 10, Medium 15, Hard 20, Very Hard 25, Nearly Impossible 30)
 * - Advantage / Disadvantage resolution and cancellation
 * - Passive checks (10 + mod + prof +/- 5 for adv/disadv)
 * - Saving throws with condition auto-fails
 * - Contested ability checks (grappling, shoving)
 * - Armor Class (unarmored 10+Dex, light, medium max +2 Dex, heavy, shield +2)
 * - Attack resolution (d20 + attack mod vs AC, nat 20 crit, nat 1 miss, same-Z invariant)
 * - Weapon damage rolls with doubled dice on critical hits
 * - Heroic death saves at 0 HP (3 successes / 3 failures, nat 20 revive)
 *
 * API:
 *   UF.Rules.modifier(score) -> Number
 *   UF.Rules.dc(ladderKey) -> Number
 *   UF.Rules.check(unit, abilityKey, dc, opts) -> Object
 *   UF.Rules.passiveCheck(unit, abilityKey, profId, opts) -> Number
 *   UF.Rules.save(unit, abilityKey, dc, opts) -> Object
 *   UF.Rules.contest(unitA, abilityA, unitB, abilityB, opts) -> Object
 *   UF.Rules.armorClass(unit) -> Object
 *   UF.Rules.attack(attacker, defender, weaponRef, opts) -> Object
 *   UF.Rules.damage(attacker, defender, attackResult, opts) -> Object
 *   UF.Rules.deathSave(unit, opts) -> Object
 */

(() => {
    "use strict";

    const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : {});
    root.UF = root.UF || {};

    const emit = (name, ...args) => {
        if (root.UF && root.UF.Events && root.UF.Events.emit) root.UF.Events.emit(name, ...args);
    };

    const Space = () => (root.UF && root.UF.Space) || null;
    const Conditions = () => (root.UF && root.UF.Conditions) || null;
    const Items = () => (root.UF && root.UF.Items) || null;

    const Rules = {};
    root.UF.Rules = Rules;

    // -------------------------------------------------------------------------
    // D20 Equipment Slots (d20 SRD Standard: 12 body slots + 2 hand slots)
    // -------------------------------------------------------------------------

    const D20_EQUIPMENT_SLOTS = [
        "head", "eyes", "neck", "shoulders",
        "armor", "torso", "waist", "arms",
        "hands", "ring1", "ring2", "feet",
        "mainHand", "offHand"
    ];

    const EQUIPMENT_ALIASES = {
        weapon: "mainHand",
        tool: "mainHand",
        shield: "offHand",
        legs: "feet",
        clothes: "torso",
        body: "armor"
    };

    Rules.D20_EQUIPMENT_SLOTS = D20_EQUIPMENT_SLOTS;
    Rules.EQUIPMENT_ALIASES = EQUIPMENT_ALIASES;

    // -------------------------------------------------------------------------
    // Standard DC Ladder & Core Formulas
    // -------------------------------------------------------------------------

    const DC_LADDER = {
        very_easy: 5,
        easy: 10,
        medium: 15,
        hard: 20,
        very_hard: 25,
        nearly_impossible: 30
    };

    Rules.DC_LADDER = DC_LADDER;

    Rules.dc = function(key, fallback = 10) {
        if (typeof key === "number") return key;
        const normalized = String(key || "").toLowerCase().replace(/[-\s]+/g, "_");
        return DC_LADDER[normalized] !== undefined ? DC_LADDER[normalized] : fallback;
    };

    Rules.modifier = function(score) {
        const num = typeof score === "number" && Number.isFinite(score) ? score : 10;
        return Math.floor((num - 10) / 2);
    };

    function unitStat(unit, abilityKey) {
        if (!unit || !unit.data) return 10;
        const stats = unit.data.stats || {};
        const val = stats[abilityKey];
        if (typeof val === "number" && Number.isFinite(val)) return val;
        // Fallback: derive from legacy combatLevels / combat if stats not set
        const cl = unit.data.combatLevels || (unit.data.combat ? unit.data.combat : null);
        if (cl) {
            if (abilityKey === "str") {
                const s = cl.strength !== undefined ? cl.strength : 10;
                return Math.max(8, Math.min(24, 10 + Math.floor(s / 10)));
            }
            if (abilityKey === "dex") {
                const a = (cl.attack !== undefined ? cl.attack : (cl.ranged !== undefined ? cl.ranged : 10));
                return Math.max(8, Math.min(24, 10 + Math.floor(a / 10)));
            }
            if (abilityKey === "con") {
                const hp = cl.hitpoints !== undefined ? cl.hitpoints : 10;
                return Math.max(8, Math.min(24, 10 + Math.floor(hp / 10)));
            }
        }
        return 10;
    }

    Rules.abilityMod = function(unit, abilityKey) {
        return Rules.modifier(unitStat(unit, abilityKey));
    };

    // -------------------------------------------------------------------------
    // Deterministic Roll Test Overrides
    // -------------------------------------------------------------------------

    let testRollOverride = null;
    Rules._setTestRoll = function(roll) { testRollOverride = roll; };
    Rules._clearTestRoll = function() { testRollOverride = null; };

    function rollD20(adv, disadv, rng) {
        if (testRollOverride !== null) return testRollOverride;
        const rand = typeof rng === "function" ? rng : Math.random;
        const r1 = Math.floor(rand() * 20) + 1;
        if (adv && !disadv) {
            const r2 = Math.floor(rand() * 20) + 1;
            return Math.max(r1, r2);
        }
        if (disadv && !adv) {
            const r2 = Math.floor(rand() * 20) + 1;
            return Math.min(r1, r2);
        }
        return r1;
    }

    // -------------------------------------------------------------------------
    // Ability Checks & Passive Checks
    // -------------------------------------------------------------------------

    Rules.check = function(unit, abilityKey, dc = 10, opts = {}) {
        const targetDC = Rules.dc(dc);
        const abilityMod = Rules.abilityMod(unit, abilityKey);

        let profBonus = 0;
        if (opts.profId && root.UF && root.UF.Proficiency) {
            profBonus = root.UF.Proficiency.rank(unit, opts.profId).bonus;
        } else if (opts.profBonus !== undefined) {
            profBonus = opts.profBonus;
        }

        // Check condition modifiers
        const C = Conditions();
        const condMods = C ? C.queryModifiers(unit) : {};

        let hasAdv = !!opts.advantage || !!condMods.abilityCheckAdvantage;
        let hasDisadv = !!opts.disadvantage || !!condMods.abilityCheckDisadvantage;

        // Mutual cancellation
        if (hasAdv && hasDisadv) {
            hasAdv = false;
            hasDisadv = false;
        }

        const roll = rollD20(hasAdv, hasDisadv);
        const total = roll + abilityMod + profBonus + (opts.extraMod || 0);

        const critical = roll === 20;
        const fumble = roll === 1;
        const ok = critical ? true : (fumble ? false : total >= targetDC);

        const result = {
            ok,
            total,
            roll,
            abilityKey,
            abilityMod,
            profBonus,
            extraMod: opts.extraMod || 0,
            dc: targetDC,
            margin: total - targetDC,
            advantage: hasAdv,
            disadvantage: hasDisadv,
            critical,
            fumble
        };

        emit("rules:check", unit, result);
        return result;
    };

    Rules.passiveCheck = function(unit, abilityKey, profId = null, opts = {}) {
        const abilityMod = Rules.abilityMod(unit, abilityKey);
        let profBonus = 0;
        if (profId && root.UF && root.UF.Proficiency) {
            profBonus = root.UF.Proficiency.rank(unit, profId).bonus;
        } else if (opts.profBonus !== undefined) {
            profBonus = opts.profBonus;
        }

        let advBonus = 0;
        if (opts.advantage && !opts.disadvantage) advBonus = 5;
        else if (opts.disadvantage && !opts.advantage) advBonus = -5;

        return 10 + abilityMod + profBonus + advBonus + (opts.extraMod || 0);
    };

    // -------------------------------------------------------------------------
    // Saving Throws & Contests
    // -------------------------------------------------------------------------

    Rules.save = function(unit, abilityKey, dc = 10, opts = {}) {
        const targetDC = Rules.dc(dc);
        const abilityMod = Rules.abilityMod(unit, abilityKey);

        const C = Conditions();
        const condMods = C ? C.queryModifiers(unit) : {};

        // Automatic failure check for paralyzed, petrified, stunned, unconscious on STR/DEX saves
        if (condMods.autoFailStrDexSaves && (abilityKey === "str" || abilityKey === "dex")) {
            return {
                ok: false,
                autoFailed: true,
                total: 0,
                roll: 0,
                abilityKey,
                dc: targetDC,
                reason: "Condition prevents STR/DEX saves"
            };
        }

        let profBonus = 0;
        if (unit && unit.data && unit.data.saveProficiencies && unit.data.saveProficiencies.includes(abilityKey)) {
            profBonus = opts.profBonus !== undefined ? opts.profBonus : 2; // baseline +2
        }

        let hasAdv = !!opts.advantage;
        let hasDisadv = !!opts.disadvantage || (abilityKey === "dex" && condMods.dexSaveDisadvantage) || !!condMods.saveDisadvantage;

        if (hasAdv && hasDisadv) {
            hasAdv = false;
            hasDisadv = false;
        }

        const roll = rollD20(hasAdv, hasDisadv);
        const total = roll + abilityMod + profBonus + (opts.extraMod || 0);

        const critical = roll === 20;
        const fumble = roll === 1;
        const ok = critical ? true : (fumble ? false : total >= targetDC);

        return {
            ok,
            total,
            roll,
            abilityKey,
            abilityMod,
            profBonus,
            dc: targetDC,
            margin: total - targetDC,
            critical,
            fumble
        };
    };

    Rules.contest = function(unitA, abilityA, unitB, abilityB, opts = {}) {
        const checkA = Rules.check(unitA, abilityA, 0, opts.optsA || {});
        const checkB = Rules.check(unitB, abilityB, 0, opts.optsB || {});

        let winner = null;
        if (checkA.total > checkB.total) winner = "A";
        else if (checkB.total > checkA.total) winner = "B";
        else winner = "tie"; // SRD rule: situation remains the same as before the contest

        return {
            winner,
            checkA,
            checkB,
            tie: winner === "tie"
        };
    };

    // -------------------------------------------------------------------------
    // Armor Class Calculation (SRD 5.1 Architecture)
    // -------------------------------------------------------------------------

    const ARMOR_DEFS = {
        // Light (base + Dex)
        padded:         { baseAC: 11, type: "light", stealthDisadv: true },
        leather:        { baseAC: 11, type: "light" },
        studded_leather:{ baseAC: 12, type: "light" },
        // Medium (base + min(Dex, 2))
        hide:           { baseAC: 12, type: "medium", maxDex: 2 },
        chain_shirt:    { baseAC: 13, type: "medium", maxDex: 2 },
        scale_mail:     { baseAC: 14, type: "medium", maxDex: 2, stealthDisadv: true },
        breastplate:    { baseAC: 14, type: "medium", maxDex: 2 },
        half_plate:     { baseAC: 15, type: "medium", maxDex: 2, stealthDisadv: true },
        // Heavy (base, no Dex)
        ring_mail:      { baseAC: 14, type: "heavy", stealthDisadv: true },
        chain_mail:     { baseAC: 16, type: "heavy", reqStr: 13, stealthDisadv: true },
        splint:         { baseAC: 17, type: "heavy", reqStr: 15, stealthDisadv: true },
        plate:          { baseAC: 18, type: "heavy", reqStr: 15, stealthDisadv: true },
        // Shield (+2)
        shield:         { baseAC: 2,  type: "shield", isShield: true }
    };

    const ARMOR_ALIASES = {
        mail_iron: "chain_mail",
        iron_mail: "chain_mail",
        leather_armor: "leather",
        plate_iron: "plate",
        iron_plate: "plate",
        shield_iron: "shield",
        shield_wood: "shield",
        wooden_shield: "shield"
    };

    function resolveArmorDef(key) {
        if (!key) return null;
        if (typeof key === "number" && typeof window !== "undefined" && window.UF && UF.Items && typeof UF.Items.get === "function") {
            const it = UF.Items.get(key);
            if (it && it.type) key = it.type;
        } else if (typeof key === "object" && key.type) {
            key = key.type;
        }
        if (ARMOR_DEFS[key]) return ARMOR_DEFS[key];
        const normalized = String(key).toLowerCase().replace(/[-\s]+/g, "_");
        if (ARMOR_DEFS[normalized]) return ARMOR_DEFS[normalized];
        if (ARMOR_ALIASES[normalized] && ARMOR_DEFS[ARMOR_ALIASES[normalized]]) {
            return ARMOR_DEFS[ARMOR_ALIASES[normalized]];
        }
        if (normalized.includes("plate")) return ARMOR_DEFS.plate;
        if (normalized.includes("mail")) return ARMOR_DEFS.chain_mail;
        if (normalized.includes("leather")) return ARMOR_DEFS.leather;
        if (normalized.includes("shield")) return ARMOR_DEFS.shield;
        return null;
    }

    Rules.ARMOR_DEFS = ARMOR_DEFS;

    Rules.armorClass = function(unit) {
        if (!unit || !unit.data) return { ac: 10, baseAC: 10, dexMod: 0, shieldAC: 0, category: "unarmored" };

        const dexMod = Rules.abilityMod(unit, "dex");
        const eq = unit.data.equipment || {};

        let bodyArmor = null;
        let shield = null;

        // Check armor / torso / body slot (d20 SRD standard)
        const armorKey = eq.armor || eq.torso || eq.body || eq.clothes;
        if (armorKey) bodyArmor = resolveArmorDef(armorKey);

        // Check shield / offHand slot
        const shieldKey = eq.shield || eq.offHand;
        if (shieldKey) shield = resolveArmorDef(shieldKey);

        let baseAC = 10;
        let effectiveDex = dexMod;
        let category = "unarmored";
        let stealthDisadv = false;

        if (bodyArmor) {
            baseAC = bodyArmor.baseAC;
            category = bodyArmor.type;
            if (bodyArmor.stealthDisadv) stealthDisadv = true;

            if (category === "light") {
                effectiveDex = dexMod;
            } else if (category === "medium") {
                effectiveDex = Math.min(2, dexMod);
            } else if (category === "heavy") {
                effectiveDex = 0; // Heavy armor does not add Dex (nor penalize if negative)
            }
        }

        const shieldBonus = shield ? 2 : 0;
        let itemBonusAC = 0;
        if (typeof window !== "undefined" && window.UF && UF.Items && typeof UF.Items.type === "function") {
            for (const slot of D20_EQUIPMENT_SLOTS) {
                const itemKey = eq[slot];
                if (!itemKey) continue;
                const typeId = typeof itemKey === "number" ? (UF.Items.get(itemKey) && UF.Items.get(itemKey).type) : (typeof itemKey === "object" ? itemKey.type : itemKey);
                const t = typeId ? UF.Items.type(typeId) : null;
                if (t && t.armor && typeof t.armor.acBonus === "number") itemBonusAC += t.armor.acBonus;
                else if (t && t.gear && typeof t.gear.acBonus === "number") itemBonusAC += t.gear.acBonus;
            }
        }
        const totalAC = baseAC + effectiveDex + shieldBonus + itemBonusAC + (unit.data.naturalArmor || 0);

        return {
            ac: totalAC,
            baseAC,
            dexMod,
            effectiveDex,
            shieldAC: shieldBonus,
            itemBonusAC,
            category,
            stealthDisadv
        };
    };

    // -------------------------------------------------------------------------
    // Weapon Attack & Damage Resolution (Same-Z Invariant & D20 vs AC)
    // -------------------------------------------------------------------------

    const WEAPON_DEFS = {
        club:            { dice: "1d4", type: "bludgeoning", range: 5,  properties: ["light"] },
        dagger:          { dice: "1d4", type: "piercing",    range: 20, longRange: 60, properties: ["finesse", "light", "thrown"] },
        greatclub:       { dice: "1d8", type: "bludgeoning", range: 5,  properties: ["two_handed"] },
        handaxe:         { dice: "1d6", type: "slashing",    range: 20, longRange: 60, properties: ["light", "thrown"] },
        javelin:         { dice: "1d6", type: "piercing",    range: 30, longRange: 120, properties: ["thrown"] },
        spear:           { dice: "1d6", type: "piercing",    range: 20, longRange: 60, properties: ["thrown", "versatile"], versatileDice: "1d8" },
        mace:            { dice: "1d6", type: "bludgeoning", range: 5,  properties: [] },
        quarterstaff:    { dice: "1d6", type: "bludgeoning", range: 5,  properties: ["versatile"], versatileDice: "1d8" },
        shortbow:        { dice: "1d6", type: "piercing",    range: 80, longRange: 320, properties: ["ammunition", "two_handed"], ranged: true },
        sling:           { dice: "1d4", type: "bludgeoning", range: 30, longRange: 120, properties: ["ammunition"], ranged: true },
        battleaxe:       { dice: "1d8", type: "slashing",    range: 5,  properties: ["versatile"], versatileDice: "1d10" },
        greatsword:      { dice: "2d6", type: "slashing",    range: 5,  properties: ["heavy", "two_handed"] },
        halberd:         { dice: "1d10",type: "slashing",    range: 10, properties: ["heavy", "reach", "two_handed"] },
        longsword:       { dice: "1d8", type: "slashing",    range: 5,  properties: ["versatile"], versatileDice: "1d10" },
        maul:            { dice: "2d6", type: "bludgeoning", range: 5,  properties: ["heavy", "two_handed"] },
        rapier:          { dice: "1d8", type: "piercing",    range: 5,  properties: ["finesse"] },
        scimitar:        { dice: "1d6", type: "slashing",    range: 5,  properties: ["finesse", "light"] },
        shortsword:      { dice: "1d6", type: "piercing",    range: 5,  properties: ["finesse", "light"] },
        warhammer:       { dice: "1d8", type: "bludgeoning", range: 5,  properties: ["versatile"], versatileDice: "1d10" },
        longbow:         { dice: "1d8", type: "piercing",    range: 150,longRange: 600, properties: ["ammunition", "heavy", "two_handed"], ranged: true },
        bite:            { dice: "1d6", type: "piercing",    range: 5,  properties: [] },
        claws:           { dice: "1d6", type: "slashing",    range: 5,  properties: [] },
        unarmed:         { dice: "1",   type: "bludgeoning", range: 5,  properties: [] }
    };

    Rules.WEAPON_DEFS = WEAPON_DEFS;

    Rules.attack = function(attacker, defender, weaponKey = "unarmed", opts = {}) {
        const S = Space();
        // Mandatory DEUS Invariant: Normal attacks require same Z
        if (S && !S.sameZ(attacker, defender)) {
            return { hit: false, error: "Different Z level (same-Z combat invariant)", sameZViolation: true };
        }

        const wDef = WEAPON_DEFS[weaponKey] || WEAPON_DEFS.unarmed;
        const strMod = Rules.abilityMod(attacker, "str");
        const dexMod = Rules.abilityMod(attacker, "dex");

        // Finesse / Ranged ability selection
        let abilityMod = strMod;
        const isFinesse = wDef.properties && wDef.properties.includes("finesse");
        if (wDef.ranged) {
            abilityMod = dexMod;
        } else if (isFinesse) {
            abilityMod = Math.max(strMod, dexMod);
        }

        let profBonus = opts.profBonus !== undefined ? opts.profBonus : 2;

        // Advantage / Disadvantage from conditions
        const C = Conditions();
        const attCond = C ? C.queryModifiers(attacker) : {};
        const defCond = C ? C.queryModifiers(defender) : {};

        let hasAdv = !!opts.advantage || !!attCond.attackAdvantage || !!defCond.incomingAttackAdvantage;
        let hasDisadv = !!opts.disadvantage || !!attCond.attackDisadvantage || !!defCond.incomingAttackDisadvantage;

        // Prone interactions
        if (C && C.has(defender, "prone")) {
            const dist = S ? S.chebyshev(attacker, defender) : 1;
            if (dist <= 1) hasAdv = true; // within 5 ft
            else hasDisadv = true;        // beyond 5 ft
        }

        if (hasAdv && hasDisadv) {
            hasAdv = false;
            hasDisadv = false;
        }

        const roll = opts.roll !== undefined ? opts.roll : rollD20(hasAdv, hasDisadv, opts.rng);
        const attackMod = abilityMod + profBonus + (opts.weaponBonus || 0);
        const attackTotal = roll + attackMod;

        const targetAC = opts.targetAC !== undefined ? opts.targetAC : Rules.armorClass(defender).ac;
        const coverBonus = opts.coverBonus || 0;
        const effectiveAC = targetAC + coverBonus;

        const critical = roll === 20;
        const fumble = roll === 1;
        const hit = critical ? true : (fumble ? false : attackTotal >= effectiveAC);

        // Crit on hit against paralyzed or unconscious within 5 ft
        const autoCrit = hit && defCond.critIfHitWithin5ft && (!S || S.chebyshev(attacker, defender) <= 1);
        const isCrit = critical || autoCrit;

        return {
            hit,
            roll,
            attackMod,
            attackTotal,
            effectiveAC,
            targetAC,
            coverBonus,
            critical: isCrit,
            fumble,
            advantage: hasAdv,
            disadvantage: hasDisadv,
            weapon: wDef,
            abilityMod
        };
    };

    function parseDice(diceStr) {
        if (!diceStr || typeof diceStr !== "string") return { count: 1, sides: 4, constant: 0 };
        const m = diceStr.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
        if (m) {
            return {
                count: parseInt(m[1], 10),
                sides: parseInt(m[2], 10),
                constant: m[3] ? parseInt(m[3], 10) : 0
            };
        }
        const flat = parseInt(diceStr, 10);
        return { count: 0, sides: 0, constant: Number.isFinite(flat) ? flat : 1 };
    }

    Rules.damage = function(attacker, defender, attackResult, opts = {}) {
        if (!attackResult || !attackResult.hit) return { damage: 0, hit: false };

        const wDef = attackResult.weapon || WEAPON_DEFS.unarmed;
        const parsed = parseDice(wDef.dice);

        // SRD 5.1 Critical Hit Rule: Roll all damage dice twice and add modifiers!
        const diceCount = attackResult.critical ? parsed.count * 2 : parsed.count;
        let rollSum = 0;
        const rand = typeof opts.rng === "function" ? opts.rng : Math.random;

        for (let i = 0; i < diceCount; i++) {
            rollSum += Math.floor(rand() * parsed.sides) + 1;
        }
        rollSum += parsed.constant;

        // Add ability modifier (minimum 1 damage total on a hit)
        const abilityMod = attackResult.abilityMod || 0;
        let damage = Math.max(1, rollSum + abilityMod + (opts.extraDamage || 0));

        // Resistances & Vulnerabilities
        const dmgType = wDef.type;
        if (defender && defender.data) {
            const d = defender.data;
            if (d.damageImmunities && d.damageImmunities.includes(dmgType)) {
                damage = 0;
            } else if (d.damageResistances && d.damageResistances.includes(dmgType)) {
                damage = Math.floor(damage / 2);
            } else if (d.damageVulnerabilities && d.damageVulnerabilities.includes(dmgType)) {
                damage = damage * 2;
            }
        }

        return {
            damage,
            hit: true,
            critical: attackResult.critical,
            damageType: dmgType,
            diceRolled: `${diceCount}d${parsed.sides}`,
            rollSum,
            abilityMod
        };
    };

    // -------------------------------------------------------------------------
    // Death Saving Throws (0 HP Mechanics)
    // -------------------------------------------------------------------------

    Rules.deathSave = function(unit, opts = {}) {
        if (!unit || !unit.data) return null;
        unit.data.deathSaves = unit.data.deathSaves || { successes: 0, failures: 0 };
        const ds = unit.data.deathSaves;

        const roll = rollD20(false, false);
        let result = "failure";

        if (roll === 20) {
            // Nat 20: regains 1 HP immediately
            result = "revive";
            ds.successes = 0;
            ds.failures = 0;
            if (unit.data.combat) unit.data.combat.hp = 1;
        } else if (roll === 1) {
            // Nat 1: counts as two failures
            result = "critical_failure";
            ds.failures += 2;
        } else if (roll >= 10) {
            result = "success";
            ds.successes += 1;
        } else {
            result = "failure";
            ds.failures += 1;
        }

        const dead = ds.failures >= 3;
        const stabilized = ds.successes >= 3;

        if (stabilized) {
            ds.successes = 0;
            ds.failures = 0;
            const C = Conditions();
            if (C) C.apply(unit, "unconscious");
        }

        return {
            roll,
            result,
            successes: ds.successes,
            failures: ds.failures,
            dead,
            stabilized
        };
    };

    // -------------------------------------------------------------------------
    // Environmental & Adventuring Rules
    // -------------------------------------------------------------------------

    Rules.jumping = function(unit, type = "long", running = true) {
        const strScore = unitStat(unit, "str");
        const strMod = Rules.modifier(strScore);
        if (type === "long") {
            return running ? strScore : Math.floor(strScore / 2);
        } else {
            const base = 3 + strMod;
            return running ? Math.max(1, base) : Math.max(1, Math.floor(base / 2));
        }
    };

    Rules.fallingDamage = function(distanceFeet) {
        const intervals = Math.min(20, Math.floor(distanceFeet / 10));
        let sum = 0;
        for (let i = 0; i < intervals; i++) {
            sum += Math.floor(Math.random() * 6) + 1;
        }
        return {
            damage: sum,
            dice: `${intervals}d6`,
            landsProne: intervals > 0
        };
    };

})();
