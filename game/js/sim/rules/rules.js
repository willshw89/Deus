"use strict";
// SRD 5.1 combat rules (DEC-027). Pure: the host passes parsed SRD JSON and an rng.
// Call shapes DEUS_Combat already uses: armorClass, attack, damage.
// attach(root, rules) sets root.UF.Rules. This file never names a host global.

const DICE = require("./dice");
const INDEX = require("./srd_index");

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

function fail(code, msg) {
    const err = new Error(code + ": " + msg);
    err.name = "RulesError";
    err.code = code;
    throw err;
}

function isObj(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function zOf(unit) {
    if (!unit) return 0;
    if (unit.z !== undefined && unit.z !== null && Number.isFinite(Number(unit.z))) return Number(unit.z);
    if (unit.area && unit.area.z !== undefined && unit.area.z !== null && Number.isFinite(Number(unit.area.z))) return Number(unit.area.z);
    return 0;
}

function dataOf(unit) {
    return unit && isObj(unit.data) ? unit.data : {};
}

function explicitScores(unit) {
    const d = dataOf(unit);
    const stats = d.stats || d.abilities || d.scores;
    if (!isObj(stats)) return null;
    for (let i = 0; i < ABILITIES.length; i++) {
        if (typeof stats[ABILITIES[i]] === "number" && Number.isFinite(stats[ABILITIES[i]])) return stats;
    }
    return null;
}

function createRules(srd, opts) {
    const index = INDEX.buildIndex(srd);
    const options = opts || {};
    let testRoll = null;

    function hostConditions() {
        if (typeof options.conditions !== "function") return null;
        try { return options.conditions() || null; } catch (e) { return null; }
    }

    function lookupItem(id) {
        if (typeof options.lookupItem !== "function") return null;
        return options.lookupItem(id);
    }

    function creatureOf(unit) {
        const d = dataOf(unit);
        const keys = [d.srdId, d.creatureId, d.creature, d.srdCreature];
        if (isObj(d.srd)) keys.push(d.srd.creature, d.srd.id);
        keys.push(d.species, d.speciesId, d.speciesName);
        for (let i = 0; i < keys.length; i++) {
            const found = index.creature(keys[i]);
            if (found) return found;
        }
        return null;
    }

    function scoresOf(unit) {
        const direct = explicitScores(unit);
        if (direct) return direct;
        const creature = creatureOf(unit);
        if (creature && creature.abilities) return creature.abilities;
        const label = unit && (unit.name || unit.id);
        fail("NO_SRD_MAPPING", "unit " + String(label) + " has no ability scores and no SRD creature");
    }

    function scoreOf(unit, ability) {
        const key = String(ability || "").toLowerCase().slice(0, 3);
        if (ABILITIES.indexOf(key) < 0) fail("BAD_ABILITY", String(ability));
        const scores = scoresOf(unit);
        const n = scores[key];
        if (typeof n !== "number" || !Number.isFinite(n)) {
            fail("NO_SRD_MAPPING", "unit has no " + key + " score");
        }
        return n;
    }

    function levelOf(unit) {
        const d = dataOf(unit);
        if (typeof d.level === "number" && Number.isFinite(d.level)) return d.level;
        if (isObj(d.dnd) && typeof d.dnd.level === "number" && Number.isFinite(d.dnd.level)) return d.dnd.level;
        const creature = creatureOf(unit);
        if (creature && creature.challenge && creature.challenge.rating !== undefined) return creature.challenge.rating;
        return 1;
    }

    function profOf(unit, call) {
        if (call && call.profBonus !== undefined && call.profBonus !== null) return call.profBonus;
        return index.proficiencyBonus(levelOf(unit));
    }

    function dexCap(dexMod, mode) {
        if (mode === "none") return 0;
        if (mode === "full") return dexMod;
        if (typeof mode === "number") return Math.min(dexMod, mode);
        return dexMod;
    }

    function resolveGearKey(raw) {
        if (raw == null || raw === "") return null;
        if (typeof raw === "number" || (typeof raw === "string" && /^\d+$/.test(raw))) {
            const rec = lookupItem(Number(raw));
            if (!rec) fail("UNKNOWN_ITEM", "item id " + String(raw) + " did not resolve");
            if (typeof rec === "string") return rec;
            if (rec.type) return typeof rec.type === "string" ? rec.type : (rec.type.id || rec.type.name);
            if (rec.name) return rec.name;
            fail("UNKNOWN_ITEM", "item id " + String(raw) + " has no type");
        }
        if (typeof raw === "object") return raw.type || raw.id || raw.name || null;
        return raw;
    }

    function armorFromRaw(raw) {
        if (raw == null || raw === "") return null;
        let key = null;
        try {
            key = resolveGearKey(raw);
        } catch (e) {
            if (e && e.code === "UNKNOWN_ITEM") return null;
            throw e;
        }
        if (!key) return null;
        const item = index.armor(key);
        if (item) return item;
        const name = INDEX.slug(String(key));
        if (name.indexOf("shield") >= 0 || name.indexOf("mail") >= 0 || name.indexOf("plate") >= 0 || name.indexOf("leather") >= 0) {
            fail("UNKNOWN_ARMOR", "no SRD armor for " + String(raw));
        }
        return null;
    }

    function equippedArmor(unit) {
        const eq = dataOf(unit).equipment;
        if (!isObj(eq)) return { body: null, shield: null };
        const bodyRaw = eq.armor || eq.torso || eq.body || eq.clothes;
        const shieldRaw = eq.shield || eq.offHand;
        let body = null;
        let shield = null;
        const bodyItem = armorFromRaw(bodyRaw);
        if (bodyItem && bodyItem.category === "shield") shield = bodyItem;
        else body = bodyItem;
        const offItem = armorFromRaw(shieldRaw);
        if (offItem && offItem.category === "shield") shield = offItem;
        else if (offItem && !body) body = offItem;
        return { body: body, shield: shield };
    }

    function armorClass(unit) {
        const creature = creatureOf(unit);
        if (!explicitScores(unit) && !(creature && creature.abilities)) {
            const label = unit && (unit.name || unit.id);
            fail("NO_SRD_MAPPING", "armor class for " + String(label) + " needs ability scores or an SRD creature");
        }
        const gear = unit ? equippedArmor(unit) : { body: null, shield: null };
        const dexMod = index.abilityModifier(scoreOf(unit, "dex"));

        if (!gear.body && creature && creature.ac != null && !gear.shield) {
            return {
                ac: creature.ac,
                breakdown: { statBlock: creature.ac, note: creature.acNote, source: creature.id },
                baseAC: creature.ac,
                dexMod: dexMod,
                effectiveDex: 0,
                shieldAC: 0,
                category: "statblock",
                stealthDisadv: false,
                source: creature.id
            };
        }

        let base = index.unarmoredBase;
        let category = "unarmored";
        let effective = dexMod;
        let stealth = false;
        let source = index.sources.unarmored;
        if (gear.body) {
            base = gear.body.base + (gear.body.bonus || 0);
            category = gear.body.category;
            effective = dexCap(dexMod, gear.body.dex);
            stealth = gear.body.stealthDisadvantage;
            source = gear.body.id;
        } else if (dataOf(unit).unarmoredDefense === "barbarian") {
            effective = dexMod + index.abilityModifier(scoreOf(unit, "con"));
            category = "unarmored_defense";
        } else if (dataOf(unit).unarmoredDefense === "monk") {
            effective = dexMod + index.abilityModifier(scoreOf(unit, "wis"));
            category = "unarmored_defense";
        }
        const natural = typeof dataOf(unit).naturalArmor === "number" ? dataOf(unit).naturalArmor : 0;
        const shieldAC = gear.shield ? (gear.shield.bonus || gear.shield.base) : 0;
        if (gear.shield && gear.shield.stealthDisadvantage) stealth = true;
        const ac = base + effective + shieldAC + natural;
        return {
            ac: ac,
            breakdown: { base: base, dex: effective, shield: shieldAC, natural: natural, source: source },
            baseAC: base,
            dexMod: dexMod,
            effectiveDex: effective,
            shieldAC: shieldAC,
            category: category,
            stealthDisadv: stealth,
            source: source
        };
    }

    function actionByKey(creature, weaponKey) {
        if (!creature) return null;
        const want = INDEX.compact(weaponKey);
        const singular = want.replace(/s$/, "");
        let match = null;
        const hits = [];
        for (let i = 0; i < creature.actions.length; i++) {
            const action = creature.actions[i];
            const name = action.key.replace(/s$/, "");
            if (action.key === want || name === want || name === singular) {
                match = action;
                hits.push(action);
            }
        }
        if (hits.length === 1) return hits[0];
        if (hits.length > 1) {
            fail("AMBIGUOUS_ATTACK", creature.id + " has more than one action matching " + String(weaponKey));
        }
        return match;
    }

    function abilityForWeapon(unit, weapon) {
        const strMod = index.abilityModifier(scoreOf(unit, "str"));
        const dexMod = index.abilityModifier(scoreOf(unit, "dex"));
        if (weapon && weapon.ranged) return { name: "dex", mod: dexMod };
        if (weapon && weapon.properties.indexOf("finesse") >= 0) {
            if (dexMod >= strMod) return { name: "dex", mod: dexMod };
            return { name: "str", mod: strMod };
        }
        return { name: "str", mod: strMod };
    }

    function nextD20(rng, call) {
        if (testRoll !== null) {
            return { natural: testRoll, rolls: [testRoll], advantage: false, disadvantage: false };
        }
        if (call && call.roll !== undefined && call.roll !== null) {
            const n = call.roll | 0;
            return { natural: n, rolls: [n], advantage: false, disadvantage: false };
        }
        const advantage = !!(call && call.advantage);
        const disadvantage = !!(call && call.disadvantage);
        return DICE.rollD20(rng, { advantage: advantage, disadvantage: disadvantage });
    }

    function attack(attacker, target, weaponKey, call) {
        const o = call || {};
        if (zOf(attacker) !== zOf(target)) {
            return {
                hit: false,
                roll: 0,
                natural: 0,
                total: 0,
                attackTotal: 0,
                attackMod: 0,
                abilityMod: 0,
                effectiveAC: 0,
                critical: false,
                fumble: false,
                advantage: false,
                disadvantage: false,
                sameZViolation: true,
                error: "Different Z level (same-Z combat invariant)"
            };
        }
        if (o.coverBonus !== undefined && o.coverBonus !== null && !Number.isFinite(o.coverBonus)) {
            return {
                hit: false,
                roll: 0,
                natural: 0,
                total: 0,
                attackTotal: 0,
                attackMod: 0,
                abilityMod: 0,
                effectiveAC: null,
                critical: false,
                fumble: false,
                advantage: false,
                disadvantage: false,
                sameZViolation: false,
                totalCover: true,
                error: "Total cover"
            };
        }

        const creature = creatureOf(attacker);
        const action = actionByKey(creature, weaponKey || "unarmed");
        const weapon = index.weapon(weaponKey);
        const key = String(weaponKey || "unarmed").toLowerCase();
        let abilityMod = 0;
        let profBonus = 0;
        let attackMod = 0;
        let damageExpr = null;
        let damageType = null;
        let damageFlat = null;
        let fromStatBlock = false;

        if (action && action.toHit != null && !o.ignoreStatBlock) {
            fromStatBlock = true;
            attackMod = action.toHit + (o.weaponBonus || 0);
            abilityMod = action.toHit;
            profBonus = 0;
            if (action.dice) {
                damageExpr = action.dice;
                damageType = action.damageType;
            } else if (typeof action.average === "number") {
                damageFlat = action.average;
                damageType = action.damageType;
            }
        } else if (weapon) {
            const ability = abilityForWeapon(attacker, weapon);
            abilityMod = ability.mod;
            profBonus = profOf(attacker, o);
            attackMod = abilityMod + profBonus + (o.weaponBonus || 0);
            const versatile = !!(o.versatile || o.twoHanded);
            damageExpr = (versatile && weapon.versatileDice) ? weapon.versatileDice : weapon.damageDice;
            damageType = weapon.damageType;
            if (!damageExpr) damageFlat = 0;
        } else if (key === "unarmed" || key === "fist" || key === "fists") {
            const strMod = index.abilityModifier(scoreOf(attacker, index.unarmed.ability));
            abilityMod = strMod;
            profBonus = profOf(attacker, o);
            attackMod = abilityMod + profBonus + (o.weaponBonus || 0);
            damageFlat = index.unarmed.flat + strMod;
            damageType = index.unarmed.type;
            damageExpr = null;
        } else if (creature && creature.actions.length) {
            const names = creature.actions.map(function (a) { return a.name; }).join(", ");
            fail("UNKNOWN_WEAPON", "no action on " + creature.id + " matches " + String(weaponKey) + " (actions: " + names + ")");
        } else {
            fail("UNKNOWN_WEAPON", "no SRD weapon " + String(weaponKey));
        }

        const rolled = nextD20(o.rng, o);
        const natural = rolled.natural;
        const total = natural + attackMod;
        const targetAC = o.targetAC !== undefined && o.targetAC !== null ? o.targetAC : armorClass(target).ac;
        const coverBonus = o.coverBonus || 0;
        const effectiveAC = targetAC + coverBonus;
        const critical = natural === 20;
        const fumble = natural === 1;
        const hit = critical ? true : (fumble ? false : total >= effectiveAC);

        return {
            hit: hit,
            roll: natural,
            natural: natural,
            total: total,
            attackTotal: total,
            attackMod: attackMod,
            abilityMod: abilityMod,
            profBonus: profBonus,
            effectiveAC: effectiveAC,
            targetAC: targetAC,
            coverBonus: coverBonus,
            critical: critical,
            fumble: fumble,
            advantage: rolled.advantage,
            disadvantage: rolled.disadvantage,
            sameZViolation: false,
            weaponKey: weaponKey || "unarmed",
            weapon: weapon,
            damageExpr: damageExpr,
            damageType: damageType,
            damageFlat: damageFlat,
            fromStatBlock: fromStatBlock,
            maxHit: damageExpr ? DICE.expressionMax(damageExpr) + (fromStatBlock ? 0 : abilityMod) : damageFlat
        };
    }

    function traitApplies(trait, damageType, call) {
        const o = call || {};
        const magical = !!o.magical;
        const silvered = !!o.silvered;
        const adamantine = !!o.adamantine;
        const spell = !!(o.spell || o.attackKind === "spell");
        if (trait.magicGoodOnly) return !!(o.goodCreature && magical && trait.types.indexOf(damageType) >= 0);
        if (trait.spellsOnly && !spell) return false;
        if (trait.nonmagical && magical) return false;
        if (trait.unlessSilvered && silvered) return false;
        if (trait.unlessAdamantine && adamantine) return false;
        if (!trait.types.length) return false;
        return trait.types.indexOf(damageType) >= 0;
    }

    function traitsOf(target, which) {
        const d = dataOf(target);
        const own = Array.isArray(d[which]) ? d[which] : null;
        if (own) return own.map(function (t) { return index.parseTrait(t); });
        const creature = creatureOf(target);
        if (!creature) return [];
        if (which === "damageResistances") return creature.resistances;
        if (which === "damageImmunities") return creature.immunities;
        if (which === "damageVulnerabilities") return creature.vulnerabilities;
        return [];
    }

    function damage(attacker, target, attackResult, call) {
        const o = call || {};
        if (!attackResult || !attackResult.hit) {
            return { damage: 0, hit: false, rolls: [], type: null, critical: false, modifiers: [] };
        }
        const critical = !!attackResult.critical;
        const type = attackResult.damageType || null;
        let rolled;
        if (attackResult.damageExpr) {
            rolled = DICE.rollExpression(attackResult.damageExpr, o.rng, { critical: critical });
        } else {
            const flat = attackResult.damageFlat || 0;
            rolled = { total: flat, rolls: [], diceTotal: 0, modifier: flat, critical: critical, diceRolled: "0" };
        }
        // A stat-block expression already includes its modifier. A weapon expression
        // is the dice only, so the ability modifier is added once (not doubled on a crit).
        let abilityExtra = 0;
        if (attackResult.damageExpr && !attackResult.fromStatBlock) abilityExtra = attackResult.abilityMod || 0;
        const extra = o.extraDamage || 0;
        let amount = rolled.total + abilityExtra + extra;
        if (amount < 0) amount = 0;
        const modifiers = [
            { source: "dice", value: rolled.diceTotal },
            { source: "expression", value: rolled.modifier },
            { source: "ability", value: abilityExtra },
            { source: "extra", value: extra }
        ];

        const immune = traitsOf(target, "damageImmunities").some(function (t) { return traitApplies(t, type, o); });
        const resist = traitsOf(target, "damageResistances").some(function (t) { return traitApplies(t, type, o); });
        const vulnerable = traitsOf(target, "damageVulnerabilities").some(function (t) { return traitApplies(t, type, o); });
        let relation = null;
        if (immune) {
            amount = 0;
            relation = "immunity";
        } else if (resist && vulnerable) {
            relation = "opposed";
        } else if (resist) {
            amount = Math.floor(amount / 2);
            relation = "resistance";
        } else if (vulnerable) {
            amount = amount * 2;
            relation = "vulnerability";
        }

        return {
            damage: amount,
            hit: true,
            rolls: rolled.rolls,
            type: type,
            damageType: type,
            critical: critical,
            modifiers: modifiers,
            diceRolled: rolled.diceRolled,
            relation: relation,
            abilityMod: attackResult.abilityMod || 0
        };
    }

    function rollTotal(unit, ability, dc, call, kind) {
        const o = call || {};
        const cond = hostConditions();
        let autoFail = !!o.autoFail;
        let advantage = !!o.advantage;
        let disadvantage = !!o.disadvantage;
        if (cond && kind === "save" && typeof cond.saveModifiers === "function") {
            const mods = cond.saveModifiers(unit, ability, o) || {};
            if (mods.autoFail) autoFail = true;
            if (mods.advantage) advantage = true;
            if (mods.disadvantage) disadvantage = true;
        }
        if (cond && kind === "check" && typeof cond.checkModifiers === "function") {
            const mods = cond.checkModifiers(unit, ability, o.skill, o) || {};
            if (mods.autoFail) autoFail = true;
            if (mods.advantage) advantage = true;
            if (mods.disadvantage) disadvantage = true;
        }
        if (advantage && disadvantage) {
            advantage = false;
            disadvantage = false;
        }
        const targetDC = index.dc(dc === undefined ? 10 : dc);
        if (autoFail) {
            return {
                ok: false,
                autoFailed: true,
                total: 0,
                roll: 0,
                abilityKey: ability,
                abilityMod: 0,
                profBonus: 0,
                dc: targetDC,
                margin: -targetDC,
                advantage: false,
                disadvantage: false,
                critical: false,
                fumble: false
            };
        }
        const abilityMod = index.abilityModifier(scoreOf(unit, ability));
        let profBonus = 0;
        if (o.profBonus !== undefined && o.profBonus !== null) profBonus = o.profBonus;
        else if (o.proficient) profBonus = profOf(unit, o);
        else if (kind === "save") {
            const saves = dataOf(unit).saveProficiencies || [];
            const key = String(ability).toLowerCase().slice(0, 3);
            if (Array.isArray(saves) && saves.map(function (s) { return String(s).toLowerCase().slice(0, 3); }).indexOf(key) >= 0) {
                profBonus = profOf(unit, {});
            }
        }
        const rolled = nextD20(o.rng, { roll: o.roll, advantage: advantage, disadvantage: disadvantage });
        const extra = o.extraMod || 0;
        const total = rolled.natural + abilityMod + profBonus + extra;
        return {
            ok: total >= targetDC,
            autoFailed: false,
            total: total,
            roll: rolled.natural,
            abilityKey: String(ability).toLowerCase().slice(0, 3),
            abilityMod: abilityMod,
            profBonus: profBonus,
            extraMod: extra,
            dc: targetDC,
            margin: total - targetDC,
            advantage: rolled.advantage,
            disadvantage: rolled.disadvantage,
            critical: rolled.natural === 20,
            fumble: rolled.natural === 1
        };
    }

    function savingThrow(unit, ability, dc, call) {
        return rollTotal(unit, ability, dc, call, "save");
    }

    function check(unit, ability, dc, call) {
        return rollTotal(unit, ability, dc, call, "check");
    }

    function passiveCheck(unit, ability, profId, call) {
        let o = call || {};
        if (profId && typeof profId === "object") o = profId;
        const abilityMod = index.abilityModifier(scoreOf(unit, ability));
        let profBonus = 0;
        if (o.profBonus !== undefined && o.profBonus !== null) profBonus = o.profBonus;
        let adv = 0;
        if (o.advantage && !o.disadvantage) adv = index.passiveAdvantage;
        else if (o.disadvantage && !o.advantage) adv = -index.passiveDisadvantage;
        return index.passiveBase + abilityMod + profBonus + adv + (o.extraMod || 0);
    }

    function contest(unitA, abilityA, unitB, abilityB, call) {
        const o = call || {};
        const checkA = check(unitA, abilityA, 0, o.optsA || {});
        const checkB = check(unitB, abilityB, 0, o.optsB || {});
        let winner = "tie";
        if (checkA.total > checkB.total) winner = "A";
        else if (checkB.total > checkA.total) winner = "B";
        return { winner: winner, checkA: checkA, checkB: checkB, tie: winner === "tie" };
    }

    function initiative(unit, call) {
        const o = call || {};
        const rolled = nextD20(o.rng, o);
        const dexMod = index.abilityModifier(scoreOf(unit, "dex"));
        const total = rolled.natural + dexMod + (o.extraMod || 0);
        return {
            total: total,
            roll: rolled.natural,
            natural: rolled.natural,
            dexMod: dexMod,
            advantage: rolled.advantage,
            disadvantage: rolled.disadvantage
        };
    }

    function hitPoints(statBlock, call) {
        const block = statBlock && statBlock.hitPoints ? statBlock.hitPoints : statBlock;
        if (!block) fail("NO_HIT_POINTS", "stat block has no hit points");
        const o = call || {};
        if (o.rolled) {
            if (!block.formula) fail("NO_HIT_POINTS", "stat block has no hit point formula");
            const rolled = DICE.rollExpression(block.formula, o.rng, { critical: false });
            return { hp: Math.max(1, rolled.total), formula: block.formula, average: block.average, rolled: true, rolls: rolled.rolls };
        }
        if (typeof block.average !== "number") fail("NO_HIT_POINTS", "stat block has no average hit points");
        return { hp: block.average, formula: block.formula || null, average: block.average, rolled: false, source: statBlock && statBlock.id };
    }

    function jumping(unit, type, running) {
        const score = scoreOf(unit, "str");
        const mod = index.abilityModifier(score);
        const run = running !== false;
        if (type === "high" || type === "high_jump") {
            const full = index.highJumpBase + mod;
            return run ? full : Math.floor(full / 2);
        }
        return run ? score : Math.floor(score / 2);
    }

    function fallingDamage(distanceFeet, call) {
        const feet = Number(distanceFeet) || 0;
        const intervals = Math.min(index.falling.maxDice, Math.floor(feet / index.falling.feet));
        const count = intervals * index.falling.countPer;
        const out = {
            dice: count + "d" + index.falling.sides,
            count: count,
            sides: index.falling.sides,
            type: index.falling.type,
            landsProne: intervals > 0,
            source: index.falling.source
        };
        if (call && typeof call.rng === "function" && count > 0) {
            const rolled = DICE.rollExpression(out.dice, call.rng, {});
            out.damage = Math.max(0, rolled.total);
            out.rolls = rolled.rolls;
        }
        return out;
    }

    function deathSave(unit, call) {
        if (!unit || !unit.data) return null;
        const o = call || {};
        unit.data.deathSaves = unit.data.deathSaves || { successes: 0, failures: 0 };
        const ds = unit.data.deathSaves;
        const rolled = nextD20(o.rng, o);
        const roll = rolled.natural;
        let result = "failure";
        if (roll === 20) {
            result = "revive";
            ds.successes = 0;
            ds.failures = 0;
            unit.data.hp = 1;
            if (unit.data.combat && typeof unit.data.combat === "object") unit.data.combat.hp = 1;
        } else if (roll === 1) {
            result = "critical_failure";
            ds.failures += 2;
        } else if (roll >= 10) {
            result = "success";
            ds.successes += 1;
        } else {
            ds.failures += 1;
        }
        const dead = ds.failures >= 3;
        const stabilized = !dead && ds.successes >= 3;
        if (stabilized) {
            ds.successes = 0;
            ds.failures = 0;
        }
        return { roll: roll, result: result, successes: ds.successes, failures: ds.failures, dead: dead, stabilized: stabilized };
    }

    const api = {
        index: index,
        abilityModifier: index.abilityModifier,
        modifier: index.abilityModifier,
        proficiencyBonus: index.proficiencyBonus,
        dc: index.dc,
        DC_LADDER: index.dcTable,
        armorClass: armorClass,
        attack: attack,
        damage: damage,
        savingThrow: savingThrow,
        save: savingThrow,
        check: check,
        passiveCheck: passiveCheck,
        contest: contest,
        initiative: initiative,
        hitPoints: hitPoints,
        jumping: jumping,
        fallingDamage: fallingDamage,
        deathSave: deathSave,
        sources: index.sources,
        disagreements: index.disagreements,
        openQuestions: index.openQuestions,
        WEAPON_DEFS: index.weaponDefs(),
        // DEUS paper-doll. Not an SRD table; the catalog's combat.slots is checked against this list by the slot proof.
        D20_EQUIPMENT_SLOTS: [
            "head", "eyes", "neck", "shoulders",
            "armor", "torso", "waist", "arms",
            "hands", "ring1", "ring2", "feet",
            "mainHand", "offHand"
        ],
        _setTestRoll: function (roll) { testRoll = roll; },
        _clearTestRoll: function () { testRoll = null; }
    };
    return api;
}

function attach(root, rules) {
    if (!root || typeof root !== "object") fail("BAD_ROOT", "attach needs the host root object");
    if (!rules || typeof rules.attack !== "function") fail("BAD_RULES", "attach needs a rules object");
    root.UF = root.UF || {};
    root.UF.Rules = rules;
    return rules;
}

module.exports = {
    createRules: createRules,
    attach: attach
};
